/**
 * Memory Optimizer Service
 * Memory management, object pooling, and garbage collection optimization
 */

import * as THREE from 'three';

// Object pool configuration
export interface PoolConfig {
  id: string;
  name: string;
  factory: () => unknown;
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkThreshold: number;
  resetFunction?: (obj: unknown) => void;
}

// Object pool
export interface ObjectPool<T = unknown> {
  id: string;
  name: string;
  available: T[];
  inUse: Set<T>;
  config: PoolConfig;
  stats: PoolStats;
}

// Pool statistics
export interface PoolStats {
  totalCreated: number;
  totalAcquired: number;
  totalReleased: number;
  currentSize: number;
  inUseCount: number;
  availableCount: number;
  peakUsage: number;
  hitRate: number;
}

// Memory snapshot
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  textureMemory: number;
  geometryMemory: number;
  poolMemory: number;
}

// Memory statistics
export interface MemoryStats {
  current: MemorySnapshot;
  peak: MemorySnapshot;
  history: MemorySnapshot[];
  pools: Map<string, PoolStats>;
  warnings: string[];
}

// Garbage collection hint
export interface GCHint {
  type: 'immediate' | 'deferred' | 'scheduled';
  reason: string;
  priority: number;
}

// Memory pressure levels
export type MemoryPressure = 'low' | 'moderate' | 'high' | 'critical';

// Memory budget configuration
export interface MemoryBudget {
  totalBudget: number;
  textureBudget: number;
  geometryBudget: number;
  poolBudget: number;
  warningThreshold: number;
  criticalThreshold: number;
}

// Cached geometry
interface CachedGeometry {
  geometry: THREE.BufferGeometry;
  refCount: number;
  lastUsed: number;
  size: number;
}

// Cached material
interface CachedMaterial {
  material: THREE.Material;
  refCount: number;
  lastUsed: number;
}

class MemoryOptimizerService {
  private pools: Map<string, ObjectPool> = new Map();
  private geometryCache: Map<string, CachedGeometry> = new Map();
  private materialCache: Map<string, CachedMaterial> = new Map();
  private disposables: Set<{ dispose: () => void }> = new Set();

  private stats: MemoryStats = {
    current: this.createEmptySnapshot(),
    peak: this.createEmptySnapshot(),
    history: [],
    pools: new Map(),
    warnings: [],
  };

  private budget: MemoryBudget = {
    totalBudget: 1024 * 1024 * 1024, // 1 GB
    textureBudget: 512 * 1024 * 1024, // 512 MB
    geometryBudget: 256 * 1024 * 1024, // 256 MB
    poolBudget: 128 * 1024 * 1024, // 128 MB
    warningThreshold: 0.75,
    criticalThreshold: 0.9,
  };

  private historyMaxSize = 100;
  private snapshotInterval = 1000;
  private lastSnapshotTime = 0;
  private gcScheduled = false;

  /**
   * Create an empty memory snapshot
   */
  private createEmptySnapshot(): MemorySnapshot {
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      textureMemory: 0,
      geometryMemory: 0,
      poolMemory: 0,
    };
  }

  /**
   * Create an object pool
   */
  createPool<T>(config: PoolConfig): ObjectPool<T> {
    const pool: ObjectPool<T> = {
      id: config.id,
      name: config.name,
      available: [],
      inUse: new Set(),
      config,
      stats: {
        totalCreated: 0,
        totalAcquired: 0,
        totalReleased: 0,
        currentSize: 0,
        inUseCount: 0,
        availableCount: 0,
        peakUsage: 0,
        hitRate: 0,
      },
    };

    // Pre-populate pool
    for (let i = 0; i < config.initialSize; i++) {
      const obj = config.factory() as T;
      pool.available.push(obj);
      pool.stats.totalCreated++;
    }

    pool.stats.currentSize = config.initialSize;
    pool.stats.availableCount = config.initialSize;

    this.pools.set(config.id, pool as ObjectPool);
    this.stats.pools.set(config.id, pool.stats);

    return pool;
  }

  /**
   * Acquire an object from a pool
   */
  acquire<T>(poolId: string): T | null {
    const pool = this.pools.get(poolId) as ObjectPool<T> | undefined;
    if (!pool) return null;

    let obj: T;

    if (pool.available.length > 0) {
      obj = pool.available.pop()!;
    } else if (pool.stats.currentSize < pool.config.maxSize) {
      // Grow pool
      const growCount = Math.min(
        Math.ceil(pool.stats.currentSize * pool.config.growthFactor),
        pool.config.maxSize - pool.stats.currentSize
      );

      for (let i = 0; i < growCount; i++) {
        pool.available.push(pool.config.factory() as T);
        pool.stats.totalCreated++;
        pool.stats.currentSize++;
      }

      obj = pool.available.pop()!;
    } else {
      // Pool exhausted
      this.stats.warnings.push(`Pool ${poolId} exhausted`);
      return null;
    }

    pool.inUse.add(obj);
    pool.stats.totalAcquired++;
    pool.stats.inUseCount = pool.inUse.size;
    pool.stats.availableCount = pool.available.length;
    pool.stats.peakUsage = Math.max(pool.stats.peakUsage, pool.inUse.size);
    pool.stats.hitRate = pool.stats.totalAcquired > 0
      ? (pool.stats.totalAcquired - pool.stats.totalCreated) / pool.stats.totalAcquired
      : 0;

    return obj;
  }

  /**
   * Release an object back to a pool
   */
  release<T>(poolId: string, obj: T): boolean {
    const pool = this.pools.get(poolId) as ObjectPool<T> | undefined;
    if (!pool || !pool.inUse.has(obj)) return false;

    // Reset object if reset function provided
    if (pool.config.resetFunction) {
      pool.config.resetFunction(obj);
    }

    pool.inUse.delete(obj);
    pool.available.push(obj);
    pool.stats.totalReleased++;
    pool.stats.inUseCount = pool.inUse.size;
    pool.stats.availableCount = pool.available.length;

    // Check if pool should shrink
    const unusedRatio = pool.available.length / pool.stats.currentSize;
    if (unusedRatio > pool.config.shrinkThreshold && pool.stats.currentSize > pool.config.initialSize) {
      this.shrinkPool(poolId);
    }

    return true;
  }

  /**
   * Shrink a pool
   */
  private shrinkPool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const targetSize = Math.max(
      pool.config.initialSize,
      Math.ceil(pool.inUse.size * 1.5)
    );

    const toRemove = pool.stats.currentSize - targetSize;
    for (let i = 0; i < toRemove && pool.available.length > 0; i++) {
      const obj = pool.available.pop();
      if (obj && typeof (obj as { dispose?: () => void }).dispose === 'function') {
        (obj as { dispose: () => void }).dispose();
      }
      pool.stats.currentSize--;
    }

    pool.stats.availableCount = pool.available.length;
  }

  /**
   * Clear a pool
   */
  clearPool(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    // Dispose all objects
    for (const obj of [...pool.available, ...pool.inUse]) {
      if (obj && typeof (obj as { dispose?: () => void }).dispose === 'function') {
        (obj as { dispose: () => void }).dispose();
      }
    }

    pool.available = [];
    pool.inUse.clear();
    pool.stats.currentSize = 0;
    pool.stats.inUseCount = 0;
    pool.stats.availableCount = 0;
  }

  /**
   * Get or create cached geometry
   */
  getCachedGeometry(
    key: string,
    factory: () => THREE.BufferGeometry
  ): THREE.BufferGeometry {
    let cached = this.geometryCache.get(key);

    if (!cached) {
      const geometry = factory();
      cached = {
        geometry,
        refCount: 0,
        lastUsed: Date.now(),
        size: this.estimateGeometrySize(geometry),
      };
      this.geometryCache.set(key, cached);
    }

    cached.refCount++;
    cached.lastUsed = Date.now();
    return cached.geometry;
  }

  /**
   * Release cached geometry
   */
  releaseCachedGeometry(key: string): void {
    const cached = this.geometryCache.get(key);
    if (cached) {
      cached.refCount = Math.max(0, cached.refCount - 1);
    }
  }

  /**
   * Get or create cached material
   */
  getCachedMaterial(
    key: string,
    factory: () => THREE.Material
  ): THREE.Material {
    let cached = this.materialCache.get(key);

    if (!cached) {
      cached = {
        material: factory(),
        refCount: 0,
        lastUsed: Date.now(),
      };
      this.materialCache.set(key, cached);
    }

    cached.refCount++;
    cached.lastUsed = Date.now();
    return cached.material;
  }

  /**
   * Release cached material
   */
  releaseCachedMaterial(key: string): void {
    const cached = this.materialCache.get(key);
    if (cached) {
      cached.refCount = Math.max(0, cached.refCount - 1);
    }
  }

  /**
   * Register a disposable object for cleanup
   */
  registerDisposable(obj: { dispose: () => void }): void {
    this.disposables.add(obj);
  }

  /**
   * Unregister a disposable object
   */
  unregisterDisposable(obj: { dispose: () => void }): void {
    this.disposables.delete(obj);
  }

  /**
   * Update memory statistics
   */
  update(): void {
    const now = Date.now();

    if (now - this.lastSnapshotTime >= this.snapshotInterval) {
      this.takeSnapshot();
      this.lastSnapshotTime = now;
    }

    // Check memory pressure
    const pressure = this.getMemoryPressure();
    if (pressure === 'critical') {
      this.performEmergencyCleanup();
    } else if (pressure === 'high') {
      this.scheduleGC('deferred', 'High memory pressure');
    }
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    const snapshot = this.createEmptySnapshot();
    snapshot.timestamp = Date.now();

    // Try to get heap info if available
    if (typeof performance !== 'undefined' && (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      snapshot.heapUsed = memory.usedJSHeapSize;
      snapshot.heapTotal = memory.totalJSHeapSize;
    }

    // Calculate texture memory
    snapshot.textureMemory = this.calculateTextureMemory();

    // Calculate geometry memory
    snapshot.geometryMemory = 0;
    for (const cached of this.geometryCache.values()) {
      snapshot.geometryMemory += cached.size;
    }

    // Calculate pool memory
    snapshot.poolMemory = this.calculatePoolMemory();

    this.stats.current = snapshot;

    // Update peak
    if (snapshot.heapUsed > this.stats.peak.heapUsed) {
      this.stats.peak = { ...snapshot };
    }

    // Add to history
    this.stats.history.push(snapshot);
    if (this.stats.history.length > this.historyMaxSize) {
      this.stats.history.shift();
    }
  }

  /**
   * Calculate texture memory usage
   */
  private calculateTextureMemory(): number {
    // This would need to be tracked separately as Three.js doesn't expose this directly
    return 0;
  }

  /**
   * Calculate pool memory usage
   */
  private calculatePoolMemory(): number {
    let total = 0;
    for (const pool of this.pools.values()) {
      // Rough estimate based on pool size
      total += pool.stats.currentSize * 1024; // Assume 1KB per object average
    }
    return total;
  }

  /**
   * Estimate geometry size
   */
  private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    for (const attr of Object.values(geometry.attributes)) {
      if (attr instanceof THREE.BufferAttribute) {
        size += attr.array.byteLength;
      }
    }
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    return size;
  }

  /**
   * Get current memory pressure level
   */
  getMemoryPressure(): MemoryPressure {
    const used = this.stats.current.heapUsed;
    const total = this.budget.totalBudget;

    const ratio = used / total;

    if (ratio >= this.budget.criticalThreshold) return 'critical';
    if (ratio >= this.budget.warningThreshold) return 'high';
    if (ratio >= 0.5) return 'moderate';
    return 'low';
  }

  /**
   * Schedule garbage collection
   */
  scheduleGC(type: GCHint['type'], _reason: string): void {
    if (this.gcScheduled) return;
    this.gcScheduled = true;

    const execute = () => {
      this.performCleanup();
      this.gcScheduled = false;
    };

    switch (type) {
      case 'immediate':
        execute();
        break;
      case 'deferred':
        setTimeout(execute, 1000);
        break;
      case 'scheduled':
        requestIdleCallback?.(execute) || setTimeout(execute, 5000);
        break;
    }
  }

  /**
   * Perform cleanup
   */
  performCleanup(): void {
    // Clean up unused cached geometries
    const now = Date.now();
    const geometryTimeout = 30000; // 30 seconds

    for (const [key, cached] of this.geometryCache) {
      if (cached.refCount === 0 && now - cached.lastUsed > geometryTimeout) {
        cached.geometry.dispose();
        this.geometryCache.delete(key);
      }
    }

    // Clean up unused cached materials
    for (const [key, cached] of this.materialCache) {
      if (cached.refCount === 0 && now - cached.lastUsed > geometryTimeout) {
        cached.material.dispose();
        this.materialCache.delete(key);
      }
    }

    // Shrink pools
    for (const poolId of this.pools.keys()) {
      this.shrinkPool(poolId);
    }

    // Clear old warnings
    this.stats.warnings = this.stats.warnings.slice(-10);
  }

  /**
   * Perform emergency cleanup
   */
  private performEmergencyCleanup(): void {
    this.stats.warnings.push('Emergency cleanup triggered');

    // Force clear all unused cached resources
    for (const [key, cached] of this.geometryCache) {
      if (cached.refCount === 0) {
        cached.geometry.dispose();
        this.geometryCache.delete(key);
      }
    }

    for (const [key, cached] of this.materialCache) {
      if (cached.refCount === 0) {
        cached.material.dispose();
        this.materialCache.delete(key);
      }
    }

    // Shrink all pools aggressively
    for (const poolId of this.pools.keys()) {
      const pool = this.pools.get(poolId);
      if (pool) {
        while (pool.available.length > Math.ceil(pool.config.initialSize / 2)) {
          const obj = pool.available.pop();
          if (obj && typeof (obj as { dispose?: () => void }).dispose === 'function') {
            (obj as { dispose: () => void }).dispose();
          }
          pool.stats.currentSize--;
        }
        pool.stats.availableCount = pool.available.length;
      }
    }
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return {
      ...this.stats,
      pools: new Map(this.stats.pools),
    };
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolId: string): PoolStats | undefined {
    return this.pools.get(poolId)?.stats;
  }

  /**
   * Configure memory budget
   */
  configureBudget(budget: Partial<MemoryBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * Get memory budget
   */
  getBudget(): MemoryBudget {
    return { ...this.budget };
  }

  /**
   * Create common pools for Three.js objects
   */
  createThreeJSPools(): void {
    // Vector3 pool
    this.createPool<THREE.Vector3>({
      id: 'vector3',
      name: 'Vector3 Pool',
      factory: () => new THREE.Vector3(),
      initialSize: 100,
      maxSize: 1000,
      growthFactor: 0.5,
      shrinkThreshold: 0.8,
      resetFunction: (v) => (v as THREE.Vector3).set(0, 0, 0),
    });

    // Matrix4 pool
    this.createPool<THREE.Matrix4>({
      id: 'matrix4',
      name: 'Matrix4 Pool',
      factory: () => new THREE.Matrix4(),
      initialSize: 50,
      maxSize: 500,
      growthFactor: 0.5,
      shrinkThreshold: 0.8,
      resetFunction: (m) => (m as THREE.Matrix4).identity(),
    });

    // Quaternion pool
    this.createPool<THREE.Quaternion>({
      id: 'quaternion',
      name: 'Quaternion Pool',
      factory: () => new THREE.Quaternion(),
      initialSize: 50,
      maxSize: 500,
      growthFactor: 0.5,
      shrinkThreshold: 0.8,
      resetFunction: (q) => (q as THREE.Quaternion).identity(),
    });

    // Color pool
    this.createPool<THREE.Color>({
      id: 'color',
      name: 'Color Pool',
      factory: () => new THREE.Color(),
      initialSize: 50,
      maxSize: 500,
      growthFactor: 0.5,
      shrinkThreshold: 0.8,
      resetFunction: (c) => (c as THREE.Color).setRGB(0, 0, 0),
    });

    // Box3 pool
    this.createPool<THREE.Box3>({
      id: 'box3',
      name: 'Box3 Pool',
      factory: () => new THREE.Box3(),
      initialSize: 50,
      maxSize: 500,
      growthFactor: 0.5,
      shrinkThreshold: 0.8,
      resetFunction: (b) => (b as THREE.Box3).makeEmpty(),
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Clear all pools
    for (const poolId of this.pools.keys()) {
      this.clearPool(poolId);
    }
    this.pools.clear();

    // Clear caches
    for (const cached of this.geometryCache.values()) {
      cached.geometry.dispose();
    }
    this.geometryCache.clear();

    for (const cached of this.materialCache.values()) {
      cached.material.dispose();
    }
    this.materialCache.clear();

    // Dispose registered disposables
    for (const obj of this.disposables) {
      obj.dispose();
    }
    this.disposables.clear();

    // Clear stats
    this.stats.history = [];
    this.stats.pools.clear();
    this.stats.warnings = [];
  }
}

// Singleton instance
export const memoryOptimizer = new MemoryOptimizerService();
