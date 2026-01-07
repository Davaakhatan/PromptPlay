/**
 * State Synchronization
 * Handles entity state synchronization across clients
 */

import { NetworkManager } from './NetworkManager';
import { createMessage, StateSyncMessage, StateDeltaMessage, EntityUpdateMessage } from './messages';

export type SyncStrategy = 'authoritative' | 'client_prediction' | 'lockstep';

export interface SyncedEntity {
  id: string;
  ownerId: string;
  components: Record<string, unknown>;
  lastUpdate: number;
  version: number;
}

export interface StateSyncConfig {
  /** Sync strategy */
  strategy: SyncStrategy;
  /** Sync rate in Hz (default 20) */
  syncRate?: number;
  /** Whether to interpolate remote entities */
  interpolate?: boolean;
  /** Interpolation delay in ms */
  interpolationDelay?: number;
  /** Max prediction frames */
  maxPredictionFrames?: number;
  /** Components to sync */
  syncComponents?: string[];
}

export class StateSync {
  private network: NetworkManager;
  private config: Required<StateSyncConfig>;
  private entities: Map<string, SyncedEntity> = new Map();
  private localEntities: Set<string> = new Set();
  private currentFrame = 0;
  private lastSyncFrame = 0;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private pendingUpdates: Map<string, Partial<Record<string, unknown>>> = new Map();
  private stateHistory: Array<{ frame: number; entities: Map<string, SyncedEntity> }> = [];
  private maxHistoryFrames = 120;

  constructor(network: NetworkManager, config: StateSyncConfig) {
    this.network = network;
    this.config = {
      strategy: config.strategy,
      syncRate: config.syncRate ?? 20,
      interpolate: config.interpolate ?? true,
      interpolationDelay: config.interpolationDelay ?? 100,
      maxPredictionFrames: config.maxPredictionFrames ?? 10,
      syncComponents: config.syncComponents ?? ['transform', 'velocity'],
    };

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.network.on('state_sync', (msg) => {
      this.handleStateSync(msg as StateSyncMessage);
    });

    this.network.on('state_delta', (msg) => {
      this.handleStateDelta(msg as StateDeltaMessage);
    });

    this.network.on('entity_update', (msg) => {
      this.handleEntityUpdate(msg as EntityUpdateMessage);
    });
  }

  /**
   * Start state synchronization
   */
  start(): void {
    const interval = 1000 / this.config.syncRate;
    this.syncTimer = setInterval(() => {
      this.sendStateUpdate();
    }, interval);
  }

  /**
   * Stop state synchronization
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Register a local entity for synchronization
   */
  registerEntity(id: string, components: Record<string, unknown>): void {
    const playerId = this.network.getPlayerId();
    if (!playerId) return;

    const entity: SyncedEntity = {
      id,
      ownerId: playerId,
      components,
      lastUpdate: Date.now(),
      version: 0,
    };

    this.entities.set(id, entity);
    this.localEntities.add(id);
  }

  /**
   * Unregister an entity from synchronization
   */
  unregisterEntity(id: string): void {
    this.entities.delete(id);
    this.localEntities.delete(id);
    this.pendingUpdates.delete(id);
  }

  /**
   * Update a local entity's state
   */
  updateEntity(id: string, components: Record<string, unknown>): void {
    const entity = this.entities.get(id);
    if (!entity || !this.localEntities.has(id)) return;

    // Merge components
    entity.components = { ...entity.components, ...components };
    entity.lastUpdate = Date.now();
    entity.version++;

    // Queue for sync
    const pending = this.pendingUpdates.get(id) || {};
    this.pendingUpdates.set(id, { ...pending, ...components });
  }

  /**
   * Get entity state
   */
  getEntity(id: string): SyncedEntity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  getAllEntities(): SyncedEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities owned by a player
   */
  getPlayerEntities(playerId: string): SyncedEntity[] {
    return Array.from(this.entities.values()).filter(e => e.ownerId === playerId);
  }

  /**
   * Check if entity is locally owned
   */
  isLocalEntity(id: string): boolean {
    return this.localEntities.has(id);
  }

  /**
   * Advance simulation frame
   */
  tick(): void {
    this.currentFrame++;
    this.saveStateHistory();
  }

  /**
   * Get current frame
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  private sendStateUpdate(): void {
    if (this.pendingUpdates.size === 0) return;

    const playerId = this.network.getPlayerId();
    if (!playerId) return;

    // Send delta updates for owned entities
    const changes: StateDeltaMessage['changes'] = [];

    for (const [entityId, components] of this.pendingUpdates) {
      changes.push({
        entityId,
        operation: 'update',
        components: this.filterSyncComponents(components),
      });
    }

    if (changes.length > 0) {
      this.network.send(createMessage('state_delta', {
        frame: this.currentFrame,
        baseFrame: this.lastSyncFrame,
        changes,
      }));

      this.lastSyncFrame = this.currentFrame;
    }

    this.pendingUpdates.clear();
  }

  private handleStateSync(msg: StateSyncMessage): void {
    // Full state sync - typically on join or resync
    for (const entityData of msg.entities) {
      if (this.localEntities.has(entityData.id)) {
        // Don't overwrite local entities
        continue;
      }

      const entity: SyncedEntity = {
        id: entityData.id,
        ownerId: entityData.ownerId,
        components: entityData.components,
        lastUpdate: Date.now(),
        version: 0,
      };

      this.entities.set(entityData.id, entity);
    }

    this.currentFrame = msg.frame;
  }

  private handleStateDelta(msg: StateDeltaMessage): void {
    for (const change of msg.changes) {
      if (this.localEntities.has(change.entityId)) {
        // Don't overwrite local entities with server updates
        // (unless using authoritative mode)
        if (this.config.strategy === 'authoritative') {
          this.reconcileEntity(change.entityId, change.components || {});
        }
        continue;
      }

      const entity = this.entities.get(change.entityId);

      switch (change.operation) {
        case 'create':
          this.entities.set(change.entityId, {
            id: change.entityId,
            ownerId: '', // Will be set by entity_spawn
            components: change.components || {},
            lastUpdate: Date.now(),
            version: 0,
          });
          break;

        case 'update':
          if (entity) {
            entity.components = { ...entity.components, ...change.components };
            entity.lastUpdate = Date.now();
            entity.version++;
          }
          break;

        case 'delete':
          this.entities.delete(change.entityId);
          break;
      }
    }
  }

  private handleEntityUpdate(msg: EntityUpdateMessage): void {
    if (this.localEntities.has(msg.entityId)) {
      if (this.config.strategy === 'authoritative') {
        this.reconcileEntity(msg.entityId, msg.components);
      }
      return;
    }

    const entity = this.entities.get(msg.entityId);
    if (entity) {
      entity.components = { ...entity.components, ...msg.components };
      entity.lastUpdate = Date.now();
      entity.version++;
    }
  }

  private reconcileEntity(id: string, serverComponents: Record<string, unknown>): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    // Simple reconciliation - snap to server state
    // In a more advanced system, you'd replay inputs from the divergence point
    entity.components = { ...entity.components, ...serverComponents };
    entity.lastUpdate = Date.now();
  }

  private filterSyncComponents(components: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(components)) {
      if (this.config.syncComponents.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  private saveStateHistory(): void {
    // Clone current state
    const snapshot = new Map<string, SyncedEntity>();
    for (const [id, entity] of this.entities) {
      snapshot.set(id, {
        ...entity,
        components: { ...entity.components },
      });
    }

    this.stateHistory.push({
      frame: this.currentFrame,
      entities: snapshot,
    });

    // Trim old history
    while (this.stateHistory.length > this.maxHistoryFrames) {
      this.stateHistory.shift();
    }
  }

  /**
   * Rollback to a previous frame (for reconciliation)
   */
  rollbackToFrame(frame: number): boolean {
    const historyEntry = this.stateHistory.find(h => h.frame === frame);
    if (!historyEntry) return false;

    this.entities = new Map(historyEntry.entities);
    this.currentFrame = frame;
    return true;
  }
}
