/**
 * Asset Streaming Service
 * Progressive loading and unloading of assets based on camera position
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Asset types
export type AssetType = 'texture' | 'model' | 'audio' | 'data';

// Asset priority levels
export type AssetPriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

// Asset state
export type AssetState = 'unloaded' | 'queued' | 'loading' | 'loaded' | 'error';

// Asset definition
export interface AssetDefinition {
  id: string;
  type: AssetType;
  url: string;
  priority: AssetPriority;
  size?: number; // Estimated size in bytes
  position?: [number, number, number]; // World position for distance-based loading
  loadRadius?: number; // Distance at which to start loading
  unloadRadius?: number; // Distance at which to unload
  persistent?: boolean; // Never unload
  dependencies?: string[]; // Other assets that must load first
  mipLevels?: number; // For textures
  lod?: number; // LOD level this asset belongs to
}

// Loaded asset
export interface LoadedAsset {
  id: string;
  definition: AssetDefinition;
  state: AssetState;
  data: THREE.Texture | THREE.Group | AudioBuffer | unknown | null;
  loadTime: number;
  lastUsed: number;
  refCount: number;
  error?: string;
}

// Streaming statistics
export interface StreamingStats {
  totalAssets: number;
  loadedAssets: number;
  queuedAssets: number;
  loadingAssets: number;
  memoryUsed: number;
  memoryBudget: number;
  bandwidth: number;
  avgLoadTime: number;
}

// Streaming configuration
export interface StreamingConfig {
  memoryBudget: number; // Max memory in bytes
  maxConcurrentLoads: number;
  loadRadius: number;
  unloadRadius: number;
  unloadDelay: number; // Time before unloading unused assets
  priorityBoost: Record<AssetPriority, number>;
  enableDistanceLoading: boolean;
  enablePredictiveLoading: boolean;
}

// Priority values
const PRIORITY_VALUES: Record<AssetPriority, number> = {
  critical: 1000,
  high: 100,
  medium: 50,
  low: 10,
  background: 1,
};

class AssetStreamingService {
  private assets: Map<string, LoadedAsset> = new Map();
  private definitions: Map<string, AssetDefinition> = new Map();
  private loadQueue: string[] = [];
  private activeLoads: Set<string> = new Set();

  private camera: THREE.Camera | null = null;
  private cameraPosition = new THREE.Vector3();
  private cameraVelocity = new THREE.Vector3();
  private lastCameraPosition = new THREE.Vector3();

  // Loaders
  private textureLoader = new THREE.TextureLoader();
  private gltfLoader = new GLTFLoader();
  private audioContext: AudioContext | null = null;

  private config: StreamingConfig = {
    memoryBudget: 512 * 1024 * 1024, // 512 MB
    maxConcurrentLoads: 4,
    loadRadius: 100,
    unloadRadius: 150,
    unloadDelay: 5000,
    priorityBoost: {
      critical: 1000,
      high: 100,
      medium: 50,
      low: 10,
      background: 1,
    },
    enableDistanceLoading: true,
    enablePredictiveLoading: true,
  };

  private stats: StreamingStats = {
    totalAssets: 0,
    loadedAssets: 0,
    queuedAssets: 0,
    loadingAssets: 0,
    memoryUsed: 0,
    memoryBudget: this.config.memoryBudget,
    bandwidth: 0,
    avgLoadTime: 0,
  };

  private loadTimes: number[] = [];

  /**
   * Initialize the streaming service
   */
  initialize(camera: THREE.Camera): void {
    this.camera = camera;
    this.cameraPosition.copy(camera.position);
    this.lastCameraPosition.copy(camera.position);

    // Initialize audio context on user interaction
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.audioContext) {
          this.audioContext = new AudioContext();
        }
        window.removeEventListener('click', initAudio);
      };
      window.addEventListener('click', initAudio);
    }
  }

  /**
   * Register an asset for streaming
   */
  registerAsset(definition: AssetDefinition): void {
    this.definitions.set(definition.id, definition);

    const asset: LoadedAsset = {
      id: definition.id,
      definition,
      state: 'unloaded',
      data: null,
      loadTime: 0,
      lastUsed: 0,
      refCount: 0,
    };

    this.assets.set(definition.id, asset);
    this.updateStats();
  }

  /**
   * Register multiple assets
   */
  registerAssets(definitions: AssetDefinition[]): void {
    for (const def of definitions) {
      this.registerAsset(def);
    }
  }

  /**
   * Request an asset (increases ref count)
   */
  requestAsset(assetId: string): LoadedAsset | null {
    const asset = this.assets.get(assetId);
    if (!asset) return null;

    asset.refCount++;
    asset.lastUsed = Date.now();

    if (asset.state === 'unloaded') {
      this.queueAsset(assetId, true);
    }

    return asset;
  }

  /**
   * Release an asset (decreases ref count)
   */
  releaseAsset(assetId: string): void {
    const asset = this.assets.get(assetId);
    if (asset && asset.refCount > 0) {
      asset.refCount--;
    }
  }

  /**
   * Queue asset for loading
   */
  private queueAsset(assetId: string, immediate: boolean = false): void {
    const asset = this.assets.get(assetId);
    if (!asset || asset.state !== 'unloaded') return;

    // Check dependencies
    const def = asset.definition;
    if (def.dependencies) {
      for (const depId of def.dependencies) {
        const dep = this.assets.get(depId);
        if (dep && dep.state !== 'loaded') {
          this.queueAsset(depId, true);
        }
      }
    }

    asset.state = 'queued';

    if (immediate) {
      this.loadQueue.unshift(assetId);
    } else {
      this.loadQueue.push(assetId);
    }

    this.sortQueue();
    this.updateStats();
  }

  /**
   * Sort load queue by priority
   */
  private sortQueue(): void {
    this.loadQueue.sort((a, b) => {
      const assetA = this.assets.get(a);
      const assetB = this.assets.get(b);
      if (!assetA || !assetB) return 0;

      const priorityA = this.calculatePriority(assetA);
      const priorityB = this.calculatePriority(assetB);

      return priorityB - priorityA;
    });
  }

  /**
   * Calculate effective priority for an asset
   */
  private calculatePriority(asset: LoadedAsset): number {
    let priority = PRIORITY_VALUES[asset.definition.priority];

    // Distance-based priority boost
    if (this.config.enableDistanceLoading && asset.definition.position) {
      const pos = new THREE.Vector3(...asset.definition.position);
      const distance = this.cameraPosition.distanceTo(pos);
      const loadRadius = asset.definition.loadRadius || this.config.loadRadius;

      if (distance < loadRadius) {
        priority *= 1 + (loadRadius - distance) / loadRadius;
      }
    }

    // Ref count boost
    priority += asset.refCount * 10;

    return priority;
  }

  /**
   * Update streaming system
   */
  update(deltaTime: number): void {
    if (!this.camera) return;

    // Update camera tracking
    this.lastCameraPosition.copy(this.cameraPosition);
    this.cameraPosition.copy(this.camera.position);
    this.cameraVelocity
      .subVectors(this.cameraPosition, this.lastCameraPosition)
      .divideScalar(deltaTime || 1);

    // Distance-based loading/unloading
    if (this.config.enableDistanceLoading) {
      this.updateDistanceBasedStreaming();
    }

    // Predictive loading
    if (this.config.enablePredictiveLoading) {
      this.updatePredictiveLoading();
    }

    // Process load queue
    this.processLoadQueue();

    // Memory management
    this.manageMemory();
  }

  /**
   * Update distance-based streaming
   */
  private updateDistanceBasedStreaming(): void {
    for (const [id, asset] of this.assets) {
      if (!asset.definition.position) continue;

      const pos = new THREE.Vector3(...asset.definition.position);
      const distance = this.cameraPosition.distanceTo(pos);

      const loadRadius = asset.definition.loadRadius || this.config.loadRadius;
      const unloadRadius = asset.definition.unloadRadius || this.config.unloadRadius;

      // Queue for loading if in range
      if (distance < loadRadius && asset.state === 'unloaded') {
        this.queueAsset(id);
      }

      // Queue for unloading if out of range
      if (distance > unloadRadius && asset.state === 'loaded' && !asset.definition.persistent) {
        if (asset.refCount === 0) {
          this.scheduleUnload(id);
        }
      }
    }
  }

  /**
   * Update predictive loading based on camera movement
   */
  private updatePredictiveLoading(): void {
    if (this.cameraVelocity.length() < 0.1) return;

    // Predict position in near future
    const predictedPosition = this.cameraPosition.clone().add(
      this.cameraVelocity.clone().multiplyScalar(2)
    );

    for (const [id, asset] of this.assets) {
      if (!asset.definition.position || asset.state !== 'unloaded') continue;

      const pos = new THREE.Vector3(...asset.definition.position);
      const distance = predictedPosition.distanceTo(pos);

      const loadRadius = asset.definition.loadRadius || this.config.loadRadius;

      if (distance < loadRadius * 1.5) {
        this.queueAsset(id);
      }
    }
  }

  /**
   * Process the load queue
   */
  private async processLoadQueue(): Promise<void> {
    while (
      this.loadQueue.length > 0 &&
      this.activeLoads.size < this.config.maxConcurrentLoads
    ) {
      const assetId = this.loadQueue.shift();
      if (!assetId) break;

      const asset = this.assets.get(assetId);
      if (!asset || asset.state !== 'queued') continue;

      // Check memory budget
      const estimatedSize = asset.definition.size || 1024 * 1024;
      if (this.stats.memoryUsed + estimatedSize > this.config.memoryBudget) {
        // Try to free memory first
        if (!this.freeMemory(estimatedSize)) {
          this.loadQueue.unshift(assetId);
          break;
        }
      }

      this.loadAsset(assetId);
    }

    this.updateStats();
  }

  /**
   * Load an asset
   */
  private async loadAsset(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    asset.state = 'loading';
    this.activeLoads.add(assetId);

    const startTime = performance.now();

    try {
      switch (asset.definition.type) {
        case 'texture':
          asset.data = await this.loadTexture(asset.definition.url);
          break;
        case 'model':
          asset.data = await this.loadModel(asset.definition.url);
          break;
        case 'audio':
          asset.data = await this.loadAudio(asset.definition.url);
          break;
        case 'data':
          asset.data = await this.loadData(asset.definition.url);
          break;
      }

      asset.state = 'loaded';
      asset.loadTime = performance.now() - startTime;
      this.loadTimes.push(asset.loadTime);

      // Update memory estimate
      this.stats.memoryUsed += asset.definition.size || this.estimateSize(asset);
    } catch (error) {
      asset.state = 'error';
      asset.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to load asset ${assetId}:`, error);
    }

    this.activeLoads.delete(assetId);
    this.updateStats();
  }

  /**
   * Load a texture
   */
  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Load a GLTF model
   */
  private loadModel(url: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf: GLTF) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  /**
   * Load audio
   */
  private async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Load generic data
   */
  private async loadData(url: string): Promise<unknown> {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.arrayBuffer();
  }

  /**
   * Schedule asset for unloading
   */
  private scheduleUnload(assetId: string): void {
    setTimeout(() => {
      const asset = this.assets.get(assetId);
      if (asset && asset.state === 'loaded' && asset.refCount === 0) {
        this.unloadAsset(assetId);
      }
    }, this.config.unloadDelay);
  }

  /**
   * Unload an asset
   */
  unloadAsset(assetId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset || asset.state !== 'loaded' || asset.definition.persistent) return;

    // Dispose resources
    if (asset.data instanceof THREE.Texture) {
      asset.data.dispose();
    } else if (asset.data instanceof THREE.Group) {
      asset.data.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    }

    // Update memory
    this.stats.memoryUsed -= asset.definition.size || this.estimateSize(asset);
    this.stats.memoryUsed = Math.max(0, this.stats.memoryUsed);

    asset.data = null;
    asset.state = 'unloaded';
    this.updateStats();
  }

  /**
   * Try to free memory
   */
  private freeMemory(required: number): boolean {
    // Get unloadable assets sorted by last used
    const unloadable = Array.from(this.assets.values())
      .filter(a => a.state === 'loaded' && !a.definition.persistent && a.refCount === 0)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    let freed = 0;
    for (const asset of unloadable) {
      if (freed >= required) break;

      const size = asset.definition.size || this.estimateSize(asset);
      this.unloadAsset(asset.id);
      freed += size;
    }

    return freed >= required;
  }

  /**
   * Manage memory budget
   */
  private manageMemory(): void {
    if (this.stats.memoryUsed <= this.config.memoryBudget * 0.9) return;

    // Free 20% of memory
    const toFree = this.config.memoryBudget * 0.2;
    this.freeMemory(toFree);
  }

  /**
   * Estimate asset size in memory
   */
  private estimateSize(asset: LoadedAsset): number {
    if (asset.data instanceof THREE.Texture) {
      const image = asset.data.image;
      if (image) {
        return image.width * image.height * 4; // RGBA
      }
    }

    if (asset.data instanceof THREE.Group) {
      let size = 0;
      asset.data.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geo = child.geometry;
          if (geo) {
            for (const attr of Object.values(geo.attributes)) {
              if (attr instanceof THREE.BufferAttribute) {
                size += attr.array.byteLength;
              }
            }
          }
        }
      });
      return size;
    }

    if (asset.data instanceof AudioBuffer) {
      return asset.data.length * asset.data.numberOfChannels * 4;
    }

    return 1024 * 1024; // Default 1MB estimate
  }

  /**
   * Get an asset
   */
  getAsset(assetId: string): LoadedAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * Get asset data (typed)
   */
  getAssetData<T>(assetId: string): T | null {
    const asset = this.assets.get(assetId);
    if (!asset || asset.state !== 'loaded') return null;
    return asset.data as T;
  }

  /**
   * Check if asset is loaded
   */
  isLoaded(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    return asset?.state === 'loaded';
  }

  /**
   * Wait for asset to load
   */
  async waitForAsset(assetId: string, timeout: number = 30000): Promise<LoadedAsset | null> {
    const asset = this.assets.get(assetId);
    if (!asset) return null;

    if (asset.state === 'loaded') return asset;

    if (asset.state === 'unloaded') {
      this.queueAsset(assetId, true);
    }

    const startTime = Date.now();
    while (asset.state === 'queued' || asset.state === 'loading') {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Asset ${assetId} load timeout`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // After waiting, state could be 'loaded' or 'error'
    return (asset.state as AssetState) === 'loaded' ? asset : null;
  }

  /**
   * Preload assets
   */
  async preload(assetIds: string[]): Promise<void> {
    for (const id of assetIds) {
      this.queueAsset(id, true);
    }

    // Wait for all to load
    await Promise.all(assetIds.map(id => this.waitForAsset(id)));
  }

  /**
   * Get statistics
   */
  getStats(): StreamingStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalAssets = this.assets.size;
    this.stats.loadedAssets = Array.from(this.assets.values()).filter(
      a => a.state === 'loaded'
    ).length;
    this.stats.queuedAssets = this.loadQueue.length;
    this.stats.loadingAssets = this.activeLoads.size;
    this.stats.memoryBudget = this.config.memoryBudget;

    if (this.loadTimes.length > 0) {
      this.stats.avgLoadTime =
        this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
    }
  }

  /**
   * Configure streaming settings
   */
  configure(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };
    this.stats.memoryBudget = this.config.memoryBudget;
  }

  /**
   * Get configuration
   */
  getConfig(): StreamingConfig {
    return { ...this.config };
  }

  /**
   * Clear all assets
   */
  clearAll(): void {
    for (const assetId of this.assets.keys()) {
      this.unloadAsset(assetId);
    }
    this.loadQueue = [];
    this.activeLoads.clear();
    this.updateStats();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearAll();
    this.assets.clear();
    this.definitions.clear();
    this.camera = null;
    this.audioContext?.close();
    this.audioContext = null;
  }
}

// Singleton instance
export const assetStreaming = new AssetStreamingService();
