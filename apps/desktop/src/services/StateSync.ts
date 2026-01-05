/**
 * State Synchronization Service
 * Entity and game state synchronization across network
 */

import { networkManager, type NetworkMessage } from './NetworkManager';

// Sync strategy
export type SyncStrategy = 'authoritative' | 'client-prediction' | 'interpolation' | 'lockstep';

// Entity ownership
export type EntityOwnership = 'server' | 'local' | 'remote' | 'shared';

// Sync priority
export type SyncPriority = 'critical' | 'high' | 'medium' | 'low';

// Synchronized entity state
export interface SyncedEntity {
  id: string;
  ownerId: string;
  ownership: EntityOwnership;
  priority: SyncPriority;
  state: Record<string, unknown>;
  version: number;
  lastUpdate: number;
  dirty: boolean;
  interpolating: boolean;
}

// State snapshot
export interface StateSnapshot {
  timestamp: number;
  sequence: number;
  entities: Map<string, Record<string, unknown>>;
  inputs?: InputFrame[];
}

// Input frame for client-side prediction
export interface InputFrame {
  sequence: number;
  timestamp: number;
  playerId: string;
  inputs: Record<string, unknown>;
  processed: boolean;
}

// Sync configuration
export interface SyncConfig {
  strategy: SyncStrategy;
  tickRate: number; // Updates per second
  sendRate: number; // Network sends per second
  interpolationDelay: number; // ms
  maxPredictionFrames: number;
  snapshotBufferSize: number;
  compressionEnabled: boolean;
  deltaCompression: boolean;
  priorityThrottling: boolean;
}

// Sync statistics
export interface SyncStats {
  entitiessynced: number;
  bytesPerSecond: number;
  snapshotsPerSecond: number;
  predictionErrors: number;
  interpolationLag: number;
  serverTickRate: number;
  clientTickRate: number;
}

// Delta update
export interface DeltaUpdate {
  entityId: string;
  changes: Record<string, unknown>;
  version: number;
  timestamp: number;
}

// Sync event types
export type SyncEvent =
  | 'entity-created'
  | 'entity-updated'
  | 'entity-deleted'
  | 'state-synced'
  | 'prediction-corrected'
  | 'ownership-changed'
  | 'desync-detected';

// Default configuration
const DEFAULT_CONFIG: SyncConfig = {
  strategy: 'client-prediction',
  tickRate: 60,
  sendRate: 20,
  interpolationDelay: 100,
  maxPredictionFrames: 10,
  snapshotBufferSize: 30,
  compressionEnabled: true,
  deltaCompression: true,
  priorityThrottling: true,
};

class StateSyncService {
  private config: SyncConfig = { ...DEFAULT_CONFIG };
  private entities: Map<string, SyncedEntity> = new Map();
  private snapshotBuffer: StateSnapshot[] = [];
  private inputBuffer: InputFrame[] = [];
  private pendingInputs: InputFrame[] = [];
  private serverSequence: number = 0;
  private localSequence: number = 0;
  private lastTickTime: number = 0;
  private interpolationTime: number = 0;
  private eventListeners: Map<SyncEvent, Set<(data: unknown) => void>> = new Map();
  private tickInterval: number | null = null;
  private sendInterval: number | null = null;

  private stats: SyncStats = {
    entitiessynced: 0,
    bytesPerSecond: 0,
    snapshotsPerSecond: 0,
    predictionErrors: 0,
    interpolationLag: 0,
    serverTickRate: 0,
    clientTickRate: 0,
  };

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    networkManager.on('message', (data) => {
      const message = data as NetworkMessage;
      if (message.type === 'sync') {
        this.handleSyncMessage(message);
      }
    });
  }

  /**
   * Initialize state sync
   */
  initialize(config?: Partial<SyncConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startTickLoop();
    this.startSendLoop();
  }

  /**
   * Start tick loop
   */
  private startTickLoop(): void {
    const tickInterval = 1000 / this.config.tickRate;

    this.tickInterval = window.setInterval(() => {
      const now = performance.now();
      const deltaTime = now - this.lastTickTime;
      this.lastTickTime = now;

      this.tick(deltaTime);
    }, tickInterval);
  }

  /**
   * Start send loop
   */
  private startSendLoop(): void {
    const sendInterval = 1000 / this.config.sendRate;

    this.sendInterval = window.setInterval(() => {
      this.sendStateUpdate();
    }, sendInterval);
  }

  /**
   * Stop loops
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
  }

  /**
   * Main tick function
   */
  private tick(deltaTime: number): void {
    // Update interpolation time
    this.interpolationTime += deltaTime;

    // Process based on strategy
    switch (this.config.strategy) {
      case 'client-prediction':
        this.processPrediction();
        break;
      case 'interpolation':
        this.processInterpolation();
        break;
      case 'lockstep':
        this.processLockstep();
        break;
      case 'authoritative':
        // Server-authoritative doesn't need client processing
        break;
    }

    // Update stats
    this.stats.clientTickRate = 1000 / deltaTime;
  }

  /**
   * Process client-side prediction
   */
  private processPrediction(): void {
    // Apply pending inputs locally
    for (const input of this.pendingInputs) {
      if (!input.processed) {
        this.applyInput(input);
        input.processed = true;
      }
    }

    // Remove old pending inputs
    const maxAge = this.config.maxPredictionFrames * (1000 / this.config.tickRate);
    const now = Date.now();
    this.pendingInputs = this.pendingInputs.filter(
      input => now - input.timestamp < maxAge
    );
  }

  /**
   * Process interpolation
   */
  private processInterpolation(): void {
    const renderTime = Date.now() - this.config.interpolationDelay;

    // Find snapshots to interpolate between
    let before: StateSnapshot | null = null;
    let after: StateSnapshot | null = null;

    for (let i = 0; i < this.snapshotBuffer.length - 1; i++) {
      if (
        this.snapshotBuffer[i].timestamp <= renderTime &&
        this.snapshotBuffer[i + 1].timestamp >= renderTime
      ) {
        before = this.snapshotBuffer[i];
        after = this.snapshotBuffer[i + 1];
        break;
      }
    }

    if (before && after) {
      const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);
      this.interpolateEntities(before, after, t);
      this.stats.interpolationLag = Date.now() - renderTime;
    }
  }

  /**
   * Process lockstep
   */
  private processLockstep(): void {
    // In lockstep, we wait for all inputs before advancing
    // This is typically used in deterministic games
    // Implementation depends on specific game requirements
  }

  /**
   * Interpolate entities between snapshots
   */
  private interpolateEntities(
    before: StateSnapshot,
    after: StateSnapshot,
    t: number
  ): void {
    for (const [entityId, afterState] of after.entities) {
      const beforeState = before.entities.get(entityId);
      if (!beforeState) continue;

      const entity = this.entities.get(entityId);
      if (!entity || !entity.interpolating) continue;

      // Interpolate numerical values
      const interpolated: Record<string, unknown> = {};
      for (const [key, afterValue] of Object.entries(afterState)) {
        const beforeValue = beforeState[key];

        if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
          interpolated[key] = beforeValue + (afterValue - beforeValue) * t;
        } else if (
          this.isVector(beforeValue) &&
          this.isVector(afterValue)
        ) {
          interpolated[key] = this.lerpVector(
            beforeValue as { x: number; y: number; z?: number },
            afterValue as { x: number; y: number; z?: number },
            t
          );
        } else {
          // Non-interpolatable values take the "before" value until we cross to "after"
          interpolated[key] = t < 0.5 ? beforeValue : afterValue;
        }
      }

      entity.state = interpolated;
      this.emit('entity-updated', { entityId, state: interpolated, interpolated: true });
    }
  }

  /**
   * Check if value is a vector
   */
  private isVector(value: unknown): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      'x' in value &&
      'y' in value
    );
  }

  /**
   * Lerp vector
   */
  private lerpVector(
    a: { x: number; y: number; z?: number },
    b: { x: number; y: number; z?: number },
    t: number
  ): { x: number; y: number; z?: number } {
    const result: { x: number; y: number; z?: number } = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };

    if (a.z !== undefined && b.z !== undefined) {
      result.z = a.z + (b.z - a.z) * t;
    }

    return result;
  }

  /**
   * Register an entity for synchronization
   */
  registerEntity(
    entityId: string,
    initialState: Record<string, unknown>,
    options: {
      ownership?: EntityOwnership;
      priority?: SyncPriority;
      interpolate?: boolean;
    } = {}
  ): SyncedEntity {
    const entity: SyncedEntity = {
      id: entityId,
      ownerId: options.ownership === 'local' ? networkManager.getLocalId() : '',
      ownership: options.ownership || 'shared',
      priority: options.priority || 'medium',
      state: initialState,
      version: 0,
      lastUpdate: Date.now(),
      dirty: true,
      interpolating: options.interpolate ?? true,
    };

    this.entities.set(entityId, entity);
    this.emit('entity-created', { entityId, entity });

    return entity;
  }

  /**
   * Unregister an entity
   */
  unregisterEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      this.entities.delete(entityId);
      this.emit('entity-deleted', { entityId });

      // Notify network
      this.sendEntityDelete(entityId);
    }
  }

  /**
   * Update entity state locally
   */
  updateEntity(entityId: string, changes: Record<string, unknown>): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    // Only update if we own it or it's shared
    if (entity.ownership !== 'local' && entity.ownership !== 'shared') {
      return;
    }

    entity.state = { ...entity.state, ...changes };
    entity.version++;
    entity.lastUpdate = Date.now();
    entity.dirty = true;

    this.emit('entity-updated', { entityId, state: entity.state, local: true });
  }

  /**
   * Record input for prediction
   */
  recordInput(inputs: Record<string, unknown>): void {
    const frame: InputFrame = {
      sequence: this.localSequence++,
      timestamp: Date.now(),
      playerId: networkManager.getLocalId(),
      inputs,
      processed: false,
    };

    this.inputBuffer.push(frame);
    this.pendingInputs.push(frame);

    // Keep buffer size limited
    if (this.inputBuffer.length > this.config.snapshotBufferSize) {
      this.inputBuffer.shift();
    }
  }

  /**
   * Apply input to entities
   */
  private applyInput(input: InputFrame): void {
    // This should be overridden or configured per-game
    // Default implementation just emits the input
    this.emit('entity-updated', {
      type: 'input-applied',
      input,
    });
  }

  /**
   * Send state update to network
   */
  private sendStateUpdate(): void {
    if (!networkManager.isConnected()) return;

    const now = Date.now();
    const dirtyEntities: DeltaUpdate[] = [];

    // Collect dirty entities based on priority
    for (const [entityId, entity] of this.entities) {
      if (!entity.dirty) continue;

      // Check ownership
      if (entity.ownership !== 'local' && entity.ownership !== 'shared') {
        continue;
      }

      // Priority throttling
      if (this.config.priorityThrottling) {
        const throttleMs = this.getPriorityThrottle(entity.priority);
        if (now - entity.lastUpdate < throttleMs) {
          continue;
        }
      }

      dirtyEntities.push({
        entityId,
        changes: entity.state,
        version: entity.version,
        timestamp: now,
      });

      entity.dirty = false;
    }

    if (dirtyEntities.length === 0 && this.pendingInputs.length === 0) {
      return;
    }

    // Send update
    const message: NetworkMessage = {
      type: 'sync',
      id: `sync-${this.localSequence}`,
      timestamp: now,
      senderId: networkManager.getLocalId(),
      payload: {
        type: 'state-update',
        sequence: this.localSequence,
        entities: this.config.deltaCompression
          ? this.compressDelta(dirtyEntities)
          : dirtyEntities,
        inputs: this.pendingInputs.slice(-this.config.maxPredictionFrames),
      },
      reliable: true,
    };

    networkManager.broadcast(message);
    this.stats.entitiessynced += dirtyEntities.length;
  }

  /**
   * Get throttle time based on priority
   */
  private getPriorityThrottle(priority: SyncPriority): number {
    const baseInterval = 1000 / this.config.sendRate;
    switch (priority) {
      case 'critical':
        return 0;
      case 'high':
        return baseInterval;
      case 'medium':
        return baseInterval * 2;
      case 'low':
        return baseInterval * 4;
    }
  }

  /**
   * Compress delta updates
   */
  private compressDelta(updates: DeltaUpdate[]): DeltaUpdate[] {
    // In a real implementation, this would use actual compression
    // For now, just return as-is
    return updates;
  }

  /**
   * Send entity delete notification
   */
  private sendEntityDelete(entityId: string): void {
    networkManager.broadcast({
      type: 'sync',
      id: `sync-delete-${entityId}`,
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload: {
        type: 'entity-delete',
        entityId,
      },
      reliable: true,
    });
  }

  /**
   * Handle sync message
   */
  private handleSyncMessage(message: NetworkMessage): void {
    const payload = message.payload as {
      type: string;
      sequence?: number;
      entities?: DeltaUpdate[];
      inputs?: InputFrame[];
      entityId?: string;
      snapshot?: StateSnapshot;
    };

    switch (payload.type) {
      case 'state-update':
        this.handleStateUpdate(payload, message.senderId);
        break;
      case 'entity-delete':
        this.handleEntityDelete(payload.entityId!);
        break;
      case 'full-sync':
        this.handleFullSync(payload.snapshot!);
        break;
      case 'server-reconciliation':
        this.handleServerReconciliation(payload);
        break;
    }
  }

  /**
   * Handle state update from network
   */
  private handleStateUpdate(
    payload: { entities?: DeltaUpdate[]; inputs?: InputFrame[]; sequence?: number },
    senderId: string
  ): void {
    if (!payload.entities) return;

    for (const update of payload.entities) {
      const entity = this.entities.get(update.entityId);

      if (entity) {
        // Only apply if version is newer
        if (update.version > entity.version || entity.ownership === 'remote') {
          entity.state = { ...entity.state, ...update.changes };
          entity.version = update.version;
          entity.lastUpdate = update.timestamp;
          entity.ownerId = senderId;

          this.emit('entity-updated', {
            entityId: update.entityId,
            state: entity.state,
            remote: true,
          });
        }
      } else {
        // Create new entity
        this.registerEntity(update.entityId, update.changes, {
          ownership: 'remote',
        });
      }
    }

    // Store snapshot for interpolation
    this.addSnapshot({
      timestamp: Date.now(),
      sequence: payload.sequence || 0,
      entities: new Map(
        payload.entities.map(e => [e.entityId, e.changes])
      ),
      inputs: payload.inputs,
    });

    this.serverSequence = payload.sequence || this.serverSequence;
    this.emit('state-synced', { sequence: payload.sequence });
  }

  /**
   * Handle entity delete from network
   */
  private handleEntityDelete(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity && entity.ownership !== 'local') {
      this.entities.delete(entityId);
      this.emit('entity-deleted', { entityId });
    }
  }

  /**
   * Handle full sync (initial state)
   */
  private handleFullSync(snapshot: StateSnapshot): void {
    // Clear existing entities
    this.entities.clear();
    this.snapshotBuffer = [];

    // Restore from snapshot
    for (const [entityId, state] of snapshot.entities) {
      this.registerEntity(entityId, state as Record<string, unknown>, {
        ownership: 'remote',
      });
    }

    this.addSnapshot(snapshot);
    this.serverSequence = snapshot.sequence;
    this.emit('state-synced', { fullSync: true });
  }

  /**
   * Handle server reconciliation
   */
  private handleServerReconciliation(payload: {
    sequence?: number;
    entities?: DeltaUpdate[];
  }): void {
    if (!payload.sequence || !payload.entities) return;

    // Find inputs that are older than server sequence
    const unprocessedInputs = this.pendingInputs.filter(
      input => input.sequence > payload.sequence!
    );

    // Apply server state
    for (const update of payload.entities) {
      const entity = this.entities.get(update.entityId);
      if (entity && entity.ownership === 'local') {
        // Check for desync
        const desync = this.detectDesync(entity.state, update.changes);
        if (desync) {
          this.stats.predictionErrors++;
          this.emit('prediction-corrected', {
            entityId: update.entityId,
            predicted: entity.state,
            actual: update.changes,
          });
        }

        // Apply server state
        entity.state = update.changes;
        entity.version = update.version;
      }
    }

    // Re-apply unprocessed inputs
    for (const input of unprocessedInputs) {
      input.processed = false;
    }
    this.pendingInputs = unprocessedInputs;
  }

  /**
   * Detect desync between predicted and actual state
   */
  private detectDesync(
    predicted: Record<string, unknown>,
    actual: Record<string, unknown>
  ): boolean {
    for (const [key, actualValue] of Object.entries(actual)) {
      const predictedValue = predicted[key];

      if (typeof actualValue === 'number' && typeof predictedValue === 'number') {
        // Allow small floating point differences
        if (Math.abs(actualValue - predictedValue) > 0.01) {
          return true;
        }
      } else if (JSON.stringify(actualValue) !== JSON.stringify(predictedValue)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add snapshot to buffer
   */
  private addSnapshot(snapshot: StateSnapshot): void {
    this.snapshotBuffer.push(snapshot);

    // Keep buffer size limited
    while (this.snapshotBuffer.length > this.config.snapshotBufferSize) {
      this.snapshotBuffer.shift();
    }

    this.stats.snapshotsPerSecond = this.snapshotBuffer.length;
  }

  /**
   * Request full sync from server
   */
  requestFullSync(): void {
    networkManager.sendMessage({
      type: 'sync',
      id: `sync-request-${Date.now()}`,
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload: { type: 'request-full-sync' },
      reliable: true,
    });
  }

  /**
   * Transfer entity ownership
   */
  transferOwnership(entityId: string, newOwnerId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    const oldOwnerId = entity.ownerId;
    entity.ownerId = newOwnerId;
    entity.ownership = newOwnerId === networkManager.getLocalId() ? 'local' : 'remote';

    networkManager.broadcast({
      type: 'sync',
      id: `sync-ownership-${entityId}`,
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload: {
        type: 'ownership-transfer',
        entityId,
        oldOwnerId,
        newOwnerId,
      },
      reliable: true,
    });

    this.emit('ownership-changed', { entityId, oldOwnerId, newOwnerId });
  }

  /**
   * Add event listener
   */
  on(event: SyncEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: SyncEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: SyncEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Get entity
   */
  getEntity(entityId: string): SyncedEntity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   */
  getEntities(): SyncedEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.stop();
    this.entities.clear();
    this.snapshotBuffer = [];
    this.inputBuffer = [];
    this.pendingInputs = [];
    this.eventListeners.clear();
  }
}

// Singleton instance
export const stateSync = new StateSyncService();
