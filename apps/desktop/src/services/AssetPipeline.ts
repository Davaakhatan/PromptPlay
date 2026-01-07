/**
 * Asset Pipeline
 * Optimized asset loading, caching, and processing
 */

export type AssetType = 'image' | 'audio' | 'json' | 'binary' | 'sprite_sheet' | 'tileset';

export interface AssetManifest {
  version: string;
  assets: AssetEntry[];
}

export interface AssetEntry {
  id: string;
  type: AssetType;
  path: string;
  size?: number;
  hash?: string;
  compressed?: boolean;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface LoadedAsset<T = unknown> {
  id: string;
  type: AssetType;
  data: T;
  size: number;
  loadTime: number;
}

export interface AssetPipelineConfig {
  /** Max concurrent loads */
  maxConcurrent?: number;
  /** Enable caching */
  enableCache?: boolean;
  /** Cache size limit in bytes */
  cacheSizeLimit?: number;
  /** Retry failed loads */
  retryCount?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Base URL for assets */
  baseUrl?: string;
}

type LoadProgressCallback = (loaded: number, total: number, asset?: string) => void;

export class AssetPipeline {
  private config: Required<AssetPipelineConfig>;
  private cache: Map<string, LoadedAsset> = new Map();
  private cacheSize = 0;
  private loading: Map<string, Promise<LoadedAsset>> = new Map();
  private queue: AssetEntry[] = [];
  private activeLoads = 0;
  private manifest: AssetManifest | null = null;

  constructor(config: AssetPipelineConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 6,
      enableCache: config.enableCache ?? true,
      cacheSizeLimit: config.cacheSizeLimit ?? 100 * 1024 * 1024, // 100MB
      retryCount: config.retryCount ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      baseUrl: config.baseUrl ?? '',
    };
  }

  /**
   * Load asset manifest
   */
  async loadManifest(url: string): Promise<AssetManifest> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.statusText}`);
    }
    const manifest: AssetManifest = await response.json();
    this.manifest = manifest;
    return manifest;
  }

  /**
   * Load a single asset
   */
  async load<T = unknown>(entry: AssetEntry | string): Promise<LoadedAsset<T>> {
    const assetEntry = typeof entry === 'string'
      ? this.manifest?.assets.find(a => a.id === entry) || { id: entry, type: 'binary' as AssetType, path: entry }
      : entry;

    // Check cache
    if (this.config.enableCache && this.cache.has(assetEntry.id)) {
      return this.cache.get(assetEntry.id) as LoadedAsset<T>;
    }

    // Check if already loading
    if (this.loading.has(assetEntry.id)) {
      return this.loading.get(assetEntry.id) as Promise<LoadedAsset<T>>;
    }

    // Load dependencies first
    if (assetEntry.dependencies?.length) {
      await Promise.all(assetEntry.dependencies.map(dep => this.load(dep)));
    }

    // Start loading
    const loadPromise = this.loadAsset<T>(assetEntry);
    this.loading.set(assetEntry.id, loadPromise as Promise<LoadedAsset>);

    try {
      const result = await loadPromise;
      this.loading.delete(assetEntry.id);

      // Add to cache
      if (this.config.enableCache) {
        this.addToCache(result);
      }

      return result;
    } catch (error) {
      this.loading.delete(assetEntry.id);
      throw error;
    }
  }

  /**
   * Load multiple assets with progress callback
   */
  async loadAll(
    entries: (AssetEntry | string)[],
    onProgress?: LoadProgressCallback
  ): Promise<LoadedAsset[]> {
    const results: LoadedAsset[] = [];
    let loaded = 0;

    // Resolve entries
    const resolvedEntries = entries.map(entry =>
      typeof entry === 'string'
        ? this.manifest?.assets.find(a => a.id === entry) || { id: entry, type: 'binary' as AssetType, path: entry }
        : entry
    );

    // Sort by priority (dependencies first)
    const sorted = this.sortByDependencies(resolvedEntries);

    // Load in batches
    for (const entry of sorted) {
      const result = await this.load(entry);
      results.push(result);
      loaded++;
      onProgress?.(loaded, sorted.length, entry.id);
    }

    return results;
  }

  /**
   * Preload assets in background
   */
  preload(entries: (AssetEntry | string)[]): void {
    const resolvedEntries = entries.map(entry =>
      typeof entry === 'string'
        ? this.manifest?.assets.find(a => a.id === entry) || { id: entry, type: 'binary' as AssetType, path: entry }
        : entry
    );

    // Add to queue
    this.queue.push(...resolvedEntries.filter(e => !this.cache.has(e.id) && !this.loading.has(e.id)));
    this.processQueue();
  }

  /**
   * Get cached asset
   */
  get<T = unknown>(id: string): LoadedAsset<T> | undefined {
    return this.cache.get(id) as LoadedAsset<T> | undefined;
  }

  /**
   * Check if asset is loaded
   */
  isLoaded(id: string): boolean {
    return this.cache.has(id);
  }

  /**
   * Check if asset is loading
   */
  isLoading(id: string): boolean {
    return this.loading.has(id);
  }

  /**
   * Unload an asset from cache
   */
  unload(id: string): void {
    const asset = this.cache.get(id);
    if (asset) {
      this.cacheSize -= asset.size;
      this.cache.delete(id);
    }
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; size: number; limit: number } {
    return {
      count: this.cache.size,
      size: this.cacheSize,
      limit: this.config.cacheSizeLimit,
    };
  }

  private async loadAsset<T>(entry: AssetEntry): Promise<LoadedAsset<T>> {
    const startTime = performance.now();
    const url = this.config.baseUrl + entry.path;

    let data: T;
    let size = 0;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        switch (entry.type) {
          case 'image':
            data = await this.loadImage(url) as T;
            size = entry.size || 0;
            break;

          case 'audio':
            data = await this.loadAudio(url) as T;
            size = entry.size || 0;
            break;

          case 'json':
            const jsonResponse = await fetch(url);
            data = await jsonResponse.json() as T;
            size = new Blob([JSON.stringify(data)]).size;
            break;

          case 'sprite_sheet':
            data = await this.loadSpriteSheet(url, entry.metadata) as T;
            size = entry.size || 0;
            break;

          case 'tileset':
            data = await this.loadTileset(url, entry.metadata) as T;
            size = entry.size || 0;
            break;

          case 'binary':
          default:
            const binaryResponse = await fetch(url);
            const blob = await binaryResponse.blob();
            data = blob as T;
            size = blob.size;
            break;
        }

        return {
          id: entry.id,
          type: entry.type,
          data,
          size,
          loadTime: performance.now() - startTime,
        };
      } catch (error) {
        if (attempt === this.config.retryCount) {
          throw error;
        }
        await this.delay(this.config.retryDelay * (attempt + 1));
      }
    }

    throw new Error(`Failed to load asset: ${entry.id}`);
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  private loadAudio(url: string): Promise<AudioBuffer> {
    return fetch(url)
      .then(response => response.arrayBuffer())
      .then(buffer => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioContext.decodeAudioData(buffer);
      });
  }

  private async loadSpriteSheet(url: string, metadata?: Record<string, unknown>): Promise<{
    image: HTMLImageElement;
    frames: Array<{ x: number; y: number; width: number; height: number }>;
  }> {
    const image = await this.loadImage(url);
    const frameWidth = (metadata?.frameWidth as number) || 32;
    const frameHeight = (metadata?.frameHeight as number) || 32;

    const frames: Array<{ x: number; y: number; width: number; height: number }> = [];
    const cols = Math.floor(image.width / frameWidth);
    const rows = Math.floor(image.height / frameHeight);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        frames.push({
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
        });
      }
    }

    return { image, frames };
  }

  private async loadTileset(url: string, metadata?: Record<string, unknown>): Promise<{
    image: HTMLImageElement;
    tileWidth: number;
    tileHeight: number;
    columns: number;
    rows: number;
  }> {
    const image = await this.loadImage(url);
    const tileWidth = (metadata?.tileWidth as number) || 16;
    const tileHeight = (metadata?.tileHeight as number) || 16;

    return {
      image,
      tileWidth,
      tileHeight,
      columns: Math.floor(image.width / tileWidth),
      rows: Math.floor(image.height / tileHeight),
    };
  }

  private addToCache(asset: LoadedAsset): void {
    // Evict if needed
    while (this.cacheSize + asset.size > this.config.cacheSizeLimit && this.cache.size > 0) {
      const [oldestId] = this.cache.keys();
      this.unload(oldestId);
    }

    this.cache.set(asset.id, asset);
    this.cacheSize += asset.size;
  }

  private processQueue(): void {
    while (this.activeLoads < this.config.maxConcurrent && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      this.activeLoads++;

      this.load(entry)
        .catch(error => console.error(`[AssetPipeline] Failed to preload ${entry.id}:`, error))
        .finally(() => {
          this.activeLoads--;
          this.processQueue();
        });
    }
  }

  private sortByDependencies(entries: AssetEntry[]): AssetEntry[] {
    const sorted: AssetEntry[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (entry: AssetEntry) => {
      if (visited.has(entry.id)) return;
      if (visiting.has(entry.id)) {
        console.warn(`[AssetPipeline] Circular dependency detected: ${entry.id}`);
        return;
      }

      visiting.add(entry.id);

      for (const depId of entry.dependencies || []) {
        const dep = entries.find(e => e.id === depId);
        if (dep) visit(dep);
      }

      visiting.delete(entry.id);
      visited.add(entry.id);
      sorted.push(entry);
    };

    entries.forEach(visit);
    return sorted;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const assetPipeline = new AssetPipeline();
