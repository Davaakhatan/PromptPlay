/**
 * Interpolation
 * Smooth interpolation for networked entity positions
 */

export interface InterpolationConfig {
  /** Interpolation delay in ms (buffer) */
  delay: number;
  /** Max extrapolation time in ms */
  maxExtrapolation?: number;
  /** Snap threshold - teleport if difference exceeds this */
  snapThreshold?: number;
}

interface StateSnapshot {
  timestamp: number;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  custom?: Record<string, number>;
}

interface EntityInterpolationState {
  snapshots: StateSnapshot[];
  lastRenderedState: StateSnapshot | null;
}

export class Interpolation {
  private config: Required<InterpolationConfig>;
  private entities: Map<string, EntityInterpolationState> = new Map();
  private maxSnapshots = 20;

  constructor(config: InterpolationConfig) {
    this.config = {
      delay: config.delay,
      maxExtrapolation: config.maxExtrapolation ?? 200,
      snapThreshold: config.snapThreshold ?? 100,
    };
  }

  /**
   * Add a state snapshot for an entity
   */
  addSnapshot(entityId: string, state: StateSnapshot): void {
    if (!this.entities.has(entityId)) {
      this.entities.set(entityId, {
        snapshots: [],
        lastRenderedState: null,
      });
    }

    const entityState = this.entities.get(entityId)!;
    entityState.snapshots.push(state);

    // Sort by timestamp
    entityState.snapshots.sort((a, b) => a.timestamp - b.timestamp);

    // Trim old snapshots
    while (entityState.snapshots.length > this.maxSnapshots) {
      entityState.snapshots.shift();
    }
  }

  /**
   * Get interpolated state for an entity at current render time
   */
  getInterpolatedState(entityId: string, renderTime?: number): StateSnapshot | null {
    const entityState = this.entities.get(entityId);
    if (!entityState || entityState.snapshots.length === 0) {
      return null;
    }

    // Render time is current time minus delay
    const targetTime = (renderTime ?? Date.now()) - this.config.delay;
    const snapshots = entityState.snapshots;

    // Find the two snapshots to interpolate between
    let before: StateSnapshot | null = null;
    let after: StateSnapshot | null = null;

    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].timestamp <= targetTime) {
        before = snapshots[i];
      } else {
        after = snapshots[i];
        break;
      }
    }

    // No data yet
    if (!before && !after) {
      return null;
    }

    // Only have future data - use earliest
    if (!before && after) {
      return after;
    }

    // Only have past data - extrapolate or use latest
    if (before && !after) {
      const timeSince = targetTime - before.timestamp;

      if (timeSince > this.config.maxExtrapolation) {
        // Too old, just return last known
        return before;
      }

      // Try to extrapolate if we have velocity data
      // For now, just return last known
      return before;
    }

    // Interpolate between before and after
    const t = (targetTime - before!.timestamp) / (after!.timestamp - before!.timestamp);
    const interpolated = this.lerp(before!, after!, Math.max(0, Math.min(1, t)));

    // Check for snap threshold
    if (entityState.lastRenderedState) {
      const dx = interpolated.x - entityState.lastRenderedState.x;
      const dy = interpolated.y - entityState.lastRenderedState.y;
      const dz = (interpolated.z ?? 0) - (entityState.lastRenderedState.z ?? 0);
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > this.config.snapThreshold) {
        // Teleport - position changed too much
        entityState.lastRenderedState = interpolated;
        return interpolated;
      }
    }

    entityState.lastRenderedState = interpolated;
    return interpolated;
  }

  /**
   * Linear interpolation between two states
   */
  private lerp(a: StateSnapshot, b: StateSnapshot, t: number): StateSnapshot {
    const result: StateSnapshot = {
      timestamp: a.timestamp + (b.timestamp - a.timestamp) * t,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };

    if (a.z !== undefined && b.z !== undefined) {
      result.z = a.z + (b.z - a.z) * t;
    }

    if (a.rotation !== undefined && b.rotation !== undefined) {
      result.rotation = this.lerpAngle(a.rotation, b.rotation, t);
    }

    if (a.rotationX !== undefined && b.rotationX !== undefined) {
      result.rotationX = this.lerpAngle(a.rotationX, b.rotationX, t);
    }

    if (a.rotationY !== undefined && b.rotationY !== undefined) {
      result.rotationY = this.lerpAngle(a.rotationY, b.rotationY, t);
    }

    if (a.rotationZ !== undefined && b.rotationZ !== undefined) {
      result.rotationZ = this.lerpAngle(a.rotationZ, b.rotationZ, t);
    }

    // Interpolate custom properties
    if (a.custom && b.custom) {
      result.custom = {};
      for (const key of Object.keys(a.custom)) {
        if (key in b.custom) {
          result.custom[key] = a.custom[key] + (b.custom[key] - a.custom[key]) * t;
        }
      }
    }

    return result;
  }

  /**
   * Interpolate angles (handling wrap-around)
   */
  private lerpAngle(a: number, b: number, t: number): number {
    const PI2 = Math.PI * 2;

    // Normalize to [0, 2π]
    a = ((a % PI2) + PI2) % PI2;
    b = ((b % PI2) + PI2) % PI2;

    // Find shortest path
    let diff = b - a;
    if (diff > Math.PI) diff -= PI2;
    if (diff < -Math.PI) diff += PI2;

    return a + diff * t;
  }

  /**
   * Remove entity from interpolation
   */
  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Get delay setting
   */
  getDelay(): number {
    return this.config.delay;
  }

  /**
   * Update delay setting
   */
  setDelay(delay: number): void {
    this.config.delay = delay;
  }
}
