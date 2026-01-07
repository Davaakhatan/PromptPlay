/**
 * Asset Marketplace Service
 * Browse, download, and upload community assets (prefabs, sprites, templates)
 */

/**
 * Configuration for the marketplace service
 */
export interface MarketplaceConfig {
  /** API server URL (e.g., 'https://api.example.com') */
  apiUrl?: string;
  /** Enable demo mode (simulated data) */
  demoMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Asset categories
 */
export type AssetCategory =
  | 'prefab'
  | 'sprite'
  | 'template'
  | 'sound'
  | 'script'
  | 'shader';

/**
 * Asset metadata
 */
export interface MarketplaceAsset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  version: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  size: number; // bytes
  license: 'free' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'commercial';
  price?: number;
  dependencies?: string[];
}

/**
 * Asset search parameters
 */
export interface AssetSearchParams {
  query?: string;
  category?: AssetCategory;
  tags?: string[];
  author?: string;
  license?: MarketplaceAsset['license'];
  minRating?: number;
  sortBy?: 'downloads' | 'rating' | 'recent' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Search results
 */
export interface AssetSearchResults {
  assets: MarketplaceAsset[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Asset download result
 */
export interface AssetDownloadResult {
  success: boolean;
  asset?: MarketplaceAsset;
  data?: string; // base64 encoded
  error?: string;
}

/**
 * Asset upload data
 */
export interface AssetUploadData {
  name: string;
  description: string;
  category: AssetCategory;
  tags: string[];
  license: MarketplaceAsset['license'];
  data: string; // base64 encoded
  thumbnail?: string;
}

/**
 * Marketplace Service
 */
export class MarketplaceService {
  private config: MarketplaceConfig = {
    demoMode: true,
    timeout: 30000,
  };
  private authToken: string | null = null;

  /**
   * Configure the marketplace service
   */
  configure(config: Partial<MarketplaceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config.apiUrl) {
      throw new Error('API URL not configured');
    }

    const url = `${this.config.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  /**
   * Search for assets
   */
  async searchAssets(params: AssetSearchParams = {}): Promise<AssetSearchResults> {
    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.set('q', params.query);
        if (params.category) queryParams.set('category', params.category);
        if (params.tags?.length) queryParams.set('tags', params.tags.join(','));
        if (params.author) queryParams.set('author', params.author);
        if (params.license) queryParams.set('license', params.license);
        if (params.minRating) queryParams.set('minRating', String(params.minRating));
        if (params.sortBy) queryParams.set('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
        if (params.page) queryParams.set('page', String(params.page));
        if (params.limit) queryParams.set('limit', String(params.limit));

        const result = await this.apiRequest<AssetSearchResults>(
          `/assets?${queryParams.toString()}`
        );

        // Convert date strings to Date objects
        result.assets = result.assets.map((a) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        }));

        return result;
      } catch (error) {
        console.error('[Marketplace] Search failed, falling back to demo:', error);
      }
    }

    // Demo mode - return filtered demo data
    const demoAssets = this.getDemoAssets();

    let filtered = [...demoAssets];

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (params.category) {
      filtered = filtered.filter((a) => a.category === params.category);
    }

    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter((a) =>
        params.tags!.some((t) => a.tags.includes(t))
      );
    }

    if (params.license) {
      filtered = filtered.filter((a) => a.license === params.license);
    }

    if (params.minRating) {
      filtered = filtered.filter((a) => a.rating >= params.minRating!);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'downloads';
    const sortOrder = params.sortOrder || 'desc';
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'recent':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      assets: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  /**
   * Get asset details
   */
  async getAsset(id: string): Promise<MarketplaceAsset | null> {
    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        const asset = await this.apiRequest<MarketplaceAsset>(`/assets/${id}`);
        return {
          ...asset,
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt),
        };
      } catch (error) {
        console.error('[Marketplace] Get asset failed:', error);
        // Fall through to demo data
      }
    }

    // Demo mode
    const demoAssets = this.getDemoAssets();
    return demoAssets.find((a) => a.id === id) || null;
  }

  /**
   * Download an asset
   */
  async downloadAsset(id: string): Promise<AssetDownloadResult> {
    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        const result = await this.apiRequest<AssetDownloadResult>(
          `/assets/${id}/download`,
          { method: 'POST' }
        );
        if (result.asset) {
          result.asset.createdAt = new Date(result.asset.createdAt);
          result.asset.updatedAt = new Date(result.asset.updatedAt);
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed',
        };
      }
    }

    // Demo mode
    const asset = await this.getAsset(id);
    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    return {
      success: true,
      asset,
      data: btoa(JSON.stringify({ placeholder: true, assetId: id })),
    };
  }

  /**
   * Upload an asset
   */
  async uploadAsset(data: AssetUploadData): Promise<{ success: boolean; assetId?: string; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Validate data
    if (!data.name || data.name.length < 3) {
      return { success: false, error: 'Name must be at least 3 characters' };
    }

    if (!data.description || data.description.length < 10) {
      return { success: false, error: 'Description must be at least 10 characters' };
    }

    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        const result = await this.apiRequest<{ assetId: string }>(
          '/assets',
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        );
        return { success: true, assetId: result.assetId };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        };
      }
    }

    // Demo mode
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return { success: true, assetId };
  }

  /**
   * Update an asset
   */
  async updateAsset(
    id: string,
    data: Partial<AssetUploadData>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        await this.apiRequest(`/assets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Update failed',
        };
      }
    }

    // Demo mode - pretend success
    return { success: true };
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        await this.apiRequest(`/assets/${id}`, { method: 'DELETE' });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Delete failed',
        };
      }
    }

    // Demo mode - pretend success
    return { success: true };
  }

  /**
   * Rate an asset
   */
  async rateAsset(id: string, rating: number): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        await this.apiRequest(`/assets/${id}/rate`, {
          method: 'POST',
          body: JSON.stringify({ rating }),
        });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Rating failed',
        };
      }
    }

    // Demo mode - pretend success
    return { success: true };
  }

  /**
   * Get featured assets
   */
  async getFeaturedAssets(): Promise<MarketplaceAsset[]> {
    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        const assets = await this.apiRequest<MarketplaceAsset[]>('/assets/featured');
        return assets.map((a) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
        }));
      } catch (error) {
        console.error('[Marketplace] Get featured failed:', error);
      }
    }

    // Demo mode
    const demoAssets = this.getDemoAssets();
    return demoAssets.filter((a) => a.downloads > 500).slice(0, 6);
  }

  /**
   * Get popular tags
   */
  async getPopularTags(): Promise<{ tag: string; count: number }[]> {
    // Use real API if configured
    if (!this.config.demoMode && this.config.apiUrl) {
      try {
        return await this.apiRequest<{ tag: string; count: number }[]>('/assets/tags');
      } catch (error) {
        console.error('[Marketplace] Get tags failed:', error);
      }
    }

    // Demo mode
    const demoAssets = this.getDemoAssets();
    const tagCounts = new Map<string, number>();

    demoAssets.forEach((asset) => {
      asset.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  /**
   * Get demo assets for offline/demo mode
   */
  private getDemoAssets(): MarketplaceAsset[] {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'prefab-player-platformer',
        name: 'Platformer Player',
        description: 'A fully configured player prefab for platformer games with movement, jumping, and animations.',
        category: 'prefab',
        author: { id: 'promptplay', name: 'PromptPlay', avatar: 'PP' },
        version: '1.2.0',
        downloads: 1250,
        rating: 4.8,
        ratingCount: 89,
        tags: ['player', 'platformer', 'movement', '2d'],
        createdAt: monthAgo,
        updatedAt: weekAgo,
        size: 2048,
        license: 'cc0',
      },
      {
        id: 'prefab-enemy-patrol',
        name: 'Patrol Enemy',
        description: 'Enemy with patrol AI behavior. Walks back and forth and chases player when detected.',
        category: 'prefab',
        author: { id: 'promptplay', name: 'PromptPlay', avatar: 'PP' },
        version: '1.1.0',
        downloads: 890,
        rating: 4.6,
        ratingCount: 45,
        tags: ['enemy', 'ai', 'patrol', '2d'],
        createdAt: monthAgo,
        updatedAt: weekAgo,
        size: 1536,
        license: 'cc0',
      },
      {
        id: 'template-endless-runner',
        name: 'Endless Runner Template',
        description: 'Complete endless runner game template with procedural generation, scoring, and power-ups.',
        category: 'template',
        author: { id: 'gamedev123', name: 'GameDev123', avatar: '👾' },
        version: '2.0.0',
        downloads: 2100,
        rating: 4.9,
        ratingCount: 156,
        tags: ['endless', 'runner', 'template', 'complete'],
        createdAt: monthAgo,
        updatedAt: now,
        size: 15360,
        license: 'free',
      },
      {
        id: 'sprite-pixel-character',
        name: 'Pixel Character Pack',
        description: '16x16 pixel character sprites with walk, run, jump, and idle animations.',
        category: 'sprite',
        author: { id: 'pixelartist', name: 'PixelArtist', avatar: 'PA' },
        version: '1.0.0',
        downloads: 3500,
        rating: 4.7,
        ratingCount: 210,
        tags: ['pixel', 'character', 'animation', 'sprite'],
        createdAt: monthAgo,
        updatedAt: monthAgo,
        size: 8192,
        license: 'cc-by',
      },
      {
        id: 'prefab-collectible-coin',
        name: 'Spinning Coin',
        description: 'Animated collectible coin with sparkle effects and pickup sound.',
        category: 'prefab',
        author: { id: 'promptplay', name: 'PromptPlay', avatar: 'PP' },
        version: '1.0.0',
        downloads: 1800,
        rating: 4.5,
        ratingCount: 78,
        tags: ['collectible', 'coin', 'animation', '2d'],
        createdAt: monthAgo,
        updatedAt: monthAgo,
        size: 1024,
        license: 'cc0',
      },
      {
        id: 'template-puzzle-game',
        name: 'Puzzle Game Template',
        description: 'Sokoban-style puzzle game with multiple levels, undo system, and level editor.',
        category: 'template',
        author: { id: 'puzzlemaster', name: 'PuzzleMaster', avatar: '🧩' },
        version: '1.5.0',
        downloads: 980,
        rating: 4.4,
        ratingCount: 42,
        tags: ['puzzle', 'sokoban', 'template', 'levels'],
        createdAt: monthAgo,
        updatedAt: weekAgo,
        size: 12288,
        license: 'free',
      },
      {
        id: 'prefab-platform-moving',
        name: 'Moving Platform',
        description: 'Platform that moves between waypoints. Configurable speed and path.',
        category: 'prefab',
        author: { id: 'promptplay', name: 'PromptPlay', avatar: 'PP' },
        version: '1.0.0',
        downloads: 720,
        rating: 4.3,
        ratingCount: 31,
        tags: ['platform', 'moving', 'waypoint', '2d'],
        createdAt: monthAgo,
        updatedAt: monthAgo,
        size: 1280,
        license: 'cc0',
      },
      {
        id: 'sprite-tileset-nature',
        name: 'Nature Tileset',
        description: '32x32 nature tiles including grass, water, trees, rocks, and flowers.',
        category: 'sprite',
        author: { id: 'pixelartist', name: 'PixelArtist', avatar: 'PA' },
        version: '2.1.0',
        downloads: 4200,
        rating: 4.9,
        ratingCount: 298,
        tags: ['tileset', 'nature', 'grass', 'water', 'trees'],
        createdAt: monthAgo,
        updatedAt: weekAgo,
        size: 32768,
        license: 'cc-by',
      },
      {
        id: 'prefab-shooter-player',
        name: 'Top-Down Shooter Player',
        description: 'Player for top-down shooters with WASD movement, mouse aiming, and shooting.',
        category: 'prefab',
        author: { id: 'promptplay', name: 'PromptPlay', avatar: 'PP' },
        version: '1.3.0',
        downloads: 650,
        rating: 4.6,
        ratingCount: 28,
        tags: ['player', 'shooter', 'top-down', '2d'],
        createdAt: monthAgo,
        updatedAt: weekAgo,
        size: 2560,
        license: 'cc0',
      },
      {
        id: 'template-space-shooter',
        name: 'Space Shooter Template',
        description: 'Vertical scrolling space shooter with waves, bosses, and upgrades.',
        category: 'template',
        author: { id: 'spacegames', name: 'SpaceGames', avatar: 'SG' },
        version: '1.0.0',
        downloads: 1450,
        rating: 4.5,
        ratingCount: 67,
        tags: ['shooter', 'space', 'scrolling', 'template'],
        createdAt: monthAgo,
        updatedAt: now,
        size: 18432,
        license: 'free',
      },
    ];
  }
}

// Singleton instance
export const marketplace = new MarketplaceService();
