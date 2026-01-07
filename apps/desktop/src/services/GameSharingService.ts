import type { GameSpec } from '@promptplay/shared-types';

/**
 * GameSharingService configuration
 */
export interface GameSharingConfig {
  /** API URL for the game sharing backend */
  apiUrl?: string;
  /** Whether to run in demo mode (no real API calls) */
  demoMode?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** File storage URL (for game assets) */
  storageUrl?: string;
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Published game metadata
 */
export interface PublishedGame {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  thumbnail?: string;
  screenshots: string[];
  genre: string;
  tags: string[];
  plays: number;
  likes: number;
  comments: number;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isFeatured: boolean;
  embedUrl: string;
  downloadUrl?: string;
}

/**
 * Game comment
 */
export interface GameComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: Date;
  likes: number;
  isAuthor: boolean;
}

/**
 * Publish options
 */
export interface PublishOptions {
  title: string;
  description: string;
  tags: string[];
  thumbnail?: string;
  screenshots?: string[];
  isPublic: boolean;
  allowDownload: boolean;
  allowEmbed: boolean;
}

/**
 * Publish result
 */
export interface PublishResult {
  success: boolean;
  game?: PublishedGame;
  url?: string;
  embedCode?: string;
  error?: string;
}

/**
 * Game search parameters
 */
export interface GameSearchParams {
  query?: string;
  genre?: string;
  tags?: string[];
  author?: string;
  featured?: boolean;
  sortBy?: 'plays' | 'likes' | 'rating' | 'recent';
  page?: number;
  limit?: number;
}

/**
 * Game search results
 */
export interface GameSearchResults {
  games: PublishedGame[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Game Sharing Service
 * Publish and share games to the PromptPlay gallery
 */
export class GameSharingService {
  private baseUrl = 'https://play.promptplay.dev';
  private authToken: string | null = null;
  private config: GameSharingConfig = {
    demoMode: true,
    timeout: 30000,
  };

  /**
   * Configure the service with API settings
   */
  configure(config: GameSharingConfig): void {
    this.config = { ...this.config, ...config };
    if (config.apiUrl) {
      this.baseUrl = config.apiUrl.replace(/\/api$/, '');
    }
    console.log('[GameSharingService] Configured:', {
      apiUrl: this.config.apiUrl,
      demoMode: this.config.demoMode,
    });
  }

  /**
   * Check if running in demo mode
   */
  isDemoMode(): boolean {
    return this.config.demoMode !== false && !this.config.apiUrl;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
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

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Publish a game to the gallery
   */
  async publishGame(
    gameSpec: GameSpec,
    options: PublishOptions
  ): Promise<PublishResult> {
    // Validate options
    if (!options.title || options.title.length < 3) {
      return { success: false, error: 'Title must be at least 3 characters' };
    }

    if (!options.description || options.description.length < 10) {
      return { success: false, error: 'Description must be at least 10 characters' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        if (!this.authToken) {
          return { success: false, error: 'Authentication required' };
        }

        const response = await this.apiRequest<ApiResponse<{
          game: PublishedGame;
          url: string;
          embedCode: string;
        }>>('/games', {
          method: 'POST',
          body: JSON.stringify({
            gameSpec,
            title: options.title,
            description: options.description,
            tags: options.tags,
            thumbnail: options.thumbnail,
            screenshots: options.screenshots,
            isPublic: options.isPublic,
            allowDownload: options.allowDownload,
            allowEmbed: options.allowEmbed,
          }),
        });

        if (response.success && response.data) {
          return {
            success: true,
            game: {
              ...response.data.game,
              createdAt: new Date(response.data.game.createdAt),
              updatedAt: new Date(response.data.game.updatedAt),
            },
            url: response.data.url,
            embedCode: response.data.embedCode,
          };
        }

        return { success: false, error: response.error || 'Failed to publish game' };
      } catch (error) {
        console.error('[GameSharingService] Publish error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to publish game',
        };
      }
    }

    // Demo mode fallback
    const slug = this.generateSlug(options.title);
    const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const embedUrl = `${this.baseUrl}/embed/${slug}`;
    const gameUrl = `${this.baseUrl}/games/${slug}`;

    const publishedGame: PublishedGame = {
      id: gameId,
      slug,
      title: options.title,
      description: options.description,
      author: {
        id: 'current-user',
        name: 'You',
      },
      thumbnail: options.thumbnail,
      screenshots: options.screenshots || [],
      genre: gameSpec.metadata?.genre || 'other',
      tags: options.tags,
      plays: 0,
      likes: 0,
      comments: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: options.isPublic,
      isFeatured: false,
      embedUrl,
      downloadUrl: options.allowDownload ? `${this.baseUrl}/download/${slug}` : undefined,
    };

    const embedCode = this.generateEmbedCode(embedUrl, options.title);

    return {
      success: true,
      game: publishedGame,
      url: gameUrl,
      embedCode,
    };
  }

  /**
   * Update a published game
   */
  async updateGame(
    gameId: string,
    gameSpec: GameSpec,
    options: Partial<PublishOptions>
  ): Promise<PublishResult> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{
          game: PublishedGame;
          url: string;
        }>>(`/games/${gameId}`, {
          method: 'PUT',
          body: JSON.stringify({
            gameSpec,
            ...options,
          }),
        });

        if (response.success && response.data) {
          return {
            success: true,
            game: {
              ...response.data.game,
              createdAt: new Date(response.data.game.createdAt),
              updatedAt: new Date(response.data.game.updatedAt),
            },
            url: response.data.url,
          };
        }

        return { success: false, error: response.error || 'Failed to update game' };
      } catch (error) {
        console.error('[GameSharingService] Update error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update game',
        };
      }
    }

    // Demo mode fallback
    return {
      success: true,
      url: `${this.baseUrl}/games/${gameId}`,
    };
  }

  /**
   * Delete a published game
   */
  async deleteGame(gameId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<void>>(`/games/${gameId}`, {
          method: 'DELETE',
        });

        if (response.success) {
          return { success: true };
        }

        return { success: false, error: response.error || 'Failed to delete game' };
      } catch (error) {
        console.error('[GameSharingService] Delete error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete game',
        };
      }
    }

    // Demo mode fallback
    return { success: true };
  }

  /**
   * Search for games
   */
  async searchGames(params: GameSearchParams = {}): Promise<GameSearchResults> {
    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const queryParams = new URLSearchParams();
        if (params.query) queryParams.set('q', params.query);
        if (params.genre) queryParams.set('genre', params.genre);
        if (params.tags?.length) queryParams.set('tags', params.tags.join(','));
        if (params.author) queryParams.set('author', params.author);
        if (params.featured) queryParams.set('featured', 'true');
        if (params.sortBy) queryParams.set('sort', params.sortBy);
        if (params.page) queryParams.set('page', String(params.page));
        if (params.limit) queryParams.set('limit', String(params.limit));

        const response = await this.apiRequest<ApiResponse<GameSearchResults>>(
          `/games?${queryParams.toString()}`
        );

        if (response.success && response.data) {
          return {
            ...response.data,
            games: response.data.games.map(game => ({
              ...game,
              createdAt: new Date(game.createdAt),
              updatedAt: new Date(game.updatedAt),
            })),
          };
        }
      } catch (error) {
        console.error('[GameSharingService] Search error:', error);
        // Fall through to demo data
      }
    }

    // Demo mode fallback
    const demoGames = this.getDemoGames();

    let filtered = [...demoGames];

    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          g.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    if (params.genre) {
      filtered = filtered.filter((g) => g.genre === params.genre);
    }

    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter((g) =>
        params.tags!.some((t) => g.tags.includes(t))
      );
    }

    if (params.featured) {
      filtered = filtered.filter((g) => g.isFeatured);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'plays';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'plays':
          return b.plays - a.plays;
        case 'likes':
          return b.likes - a.likes;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 12;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      games: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  /**
   * Get featured games
   */
  async getFeaturedGames(): Promise<PublishedGame[]> {
    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<PublishedGame[]>>(
          '/games/featured'
        );

        if (response.success && response.data) {
          return response.data.map(game => ({
            ...game,
            createdAt: new Date(game.createdAt),
            updatedAt: new Date(game.updatedAt),
          }));
        }
      } catch (error) {
        console.error('[GameSharingService] Featured games error:', error);
        // Fall through to demo data
      }
    }

    // Demo mode fallback
    const demoGames = this.getDemoGames();
    return demoGames.filter((g) => g.isFeatured).slice(0, 6);
  }

  /**
   * Get game details
   */
  async getGame(idOrSlug: string): Promise<PublishedGame | null> {
    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<PublishedGame>>(
          `/games/${encodeURIComponent(idOrSlug)}`
        );

        if (response.success && response.data) {
          return {
            ...response.data,
            createdAt: new Date(response.data.createdAt),
            updatedAt: new Date(response.data.updatedAt),
          };
        }
      } catch (error) {
        console.error('[GameSharingService] Get game error:', error);
        // Fall through to demo data
      }
    }

    // Demo mode fallback
    const demoGames = this.getDemoGames();
    return demoGames.find((g) => g.id === idOrSlug || g.slug === idOrSlug) || null;
  }

  /**
   * Like a game
   */
  async likeGame(gameId: string): Promise<{ success: boolean; likes: number; error?: string }> {
    if (!this.authToken) {
      return { success: false, likes: 0, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{ likes: number }>>(
          `/games/${gameId}/like`,
          { method: 'POST' }
        );

        if (response.success && response.data) {
          return { success: true, likes: response.data.likes };
        }

        return { success: false, likes: 0, error: response.error || 'Failed to like game' };
      } catch (error) {
        console.error('[GameSharingService] Like error:', error);
        return {
          success: false,
          likes: 0,
          error: error instanceof Error ? error.message : 'Failed to like game',
        };
      }
    }

    // Demo mode fallback
    return { success: true, likes: 1 };
  }

  /**
   * Unlike a game
   */
  async unlikeGame(gameId: string): Promise<{ success: boolean; likes: number; error?: string }> {
    if (!this.authToken) {
      return { success: false, likes: 0, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{ likes: number }>>(
          `/games/${gameId}/unlike`,
          { method: 'POST' }
        );

        if (response.success && response.data) {
          return { success: true, likes: response.data.likes };
        }

        return { success: false, likes: 0, error: response.error || 'Failed to unlike game' };
      } catch (error) {
        console.error('[GameSharingService] Unlike error:', error);
        return {
          success: false,
          likes: 0,
          error: error instanceof Error ? error.message : 'Failed to unlike game',
        };
      }
    }

    // Demo mode fallback
    return { success: true, likes: 0 };
  }

  /**
   * Get game comments
   */
  async getComments(gameId: string, page = 1, limit = 20): Promise<{ comments: GameComment[]; total: number }> {
    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{
          comments: GameComment[];
          total: number;
        }>>(`/games/${gameId}/comments?page=${page}&limit=${limit}`);

        if (response.success && response.data) {
          return {
            comments: response.data.comments.map(comment => ({
              ...comment,
              createdAt: new Date(comment.createdAt),
            })),
            total: response.data.total,
          };
        }
      } catch (error) {
        console.error('[GameSharingService] Get comments error:', error);
        // Fall through to demo data
      }
    }

    // Demo mode fallback
    const demoComments: GameComment[] = [
      {
        id: 'comment-1',
        author: { id: 'user1', name: 'GamerPro', avatar: 'GP' },
        content: 'Great game! Love the mechanics.',
        createdAt: new Date(Date.now() - 3600000),
        likes: 5,
        isAuthor: false,
      },
      {
        id: 'comment-2',
        author: { id: 'user2', name: 'PixelFan', avatar: '👾' },
        content: 'The pixel art is amazing!',
        createdAt: new Date(Date.now() - 7200000),
        likes: 3,
        isAuthor: false,
      },
    ];

    return { comments: demoComments, total: 2 };
  }

  /**
   * Add a comment
   */
  async addComment(gameId: string, content: string): Promise<{ success: boolean; comment?: GameComment; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    if (!content || content.length < 2) {
      return { success: false, error: 'Comment is too short' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<GameComment>>(
          `/games/${gameId}/comments`,
          {
            method: 'POST',
            body: JSON.stringify({ content }),
          }
        );

        if (response.success && response.data) {
          return {
            success: true,
            comment: {
              ...response.data,
              createdAt: new Date(response.data.createdAt),
            },
          };
        }

        return { success: false, error: response.error || 'Failed to add comment' };
      } catch (error) {
        console.error('[GameSharingService] Add comment error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to add comment',
        };
      }
    }

    // Demo mode fallback
    const comment: GameComment = {
      id: `comment_${Date.now()}`,
      author: { id: 'current-user', name: 'You' },
      content,
      createdAt: new Date(),
      likes: 0,
      isAuthor: true,
    };

    return { success: true, comment };
  }

  /**
   * Rate a game
   */
  async rateGame(gameId: string, rating: number): Promise<{
    success: boolean;
    rating?: number;
    ratingCount?: number;
    error?: string;
  }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{
          rating: number;
          ratingCount: number;
        }>>(`/games/${gameId}/rate`, {
          method: 'POST',
          body: JSON.stringify({ rating }),
        });

        if (response.success && response.data) {
          return {
            success: true,
            rating: response.data.rating,
            ratingCount: response.data.ratingCount,
          };
        }

        return { success: false, error: response.error || 'Failed to rate game' };
      } catch (error) {
        console.error('[GameSharingService] Rate error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to rate game',
        };
      }
    }

    // Demo mode fallback
    return { success: true, rating: 4.5, ratingCount: 100 };
  }

  /**
   * Record a game play (for analytics)
   */
  async recordPlay(gameId: string): Promise<{ success: boolean; plays?: number }> {
    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<{ plays: number }>>(
          `/games/${gameId}/play`,
          { method: 'POST' }
        );

        if (response.success && response.data) {
          return { success: true, plays: response.data.plays };
        }
      } catch (error) {
        console.error('[GameSharingService] Record play error:', error);
        // Silent failure for analytics
      }
    }

    // Demo mode fallback (just succeed silently)
    return { success: true };
  }

  /**
   * Delete a comment
   */
  async deleteComment(gameId: string, commentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<void>>(
          `/games/${gameId}/comments/${commentId}`,
          { method: 'DELETE' }
        );

        if (response.success) {
          return { success: true };
        }

        return { success: false, error: response.error || 'Failed to delete comment' };
      } catch (error) {
        console.error('[GameSharingService] Delete comment error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete comment',
        };
      }
    }

    // Demo mode fallback
    return { success: true };
  }

  /**
   * Report a game (for moderation)
   */
  async reportGame(gameId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    if (!this.authToken) {
      return { success: false, error: 'Authentication required' };
    }

    if (!reason || reason.length < 10) {
      return { success: false, error: 'Please provide a detailed reason (at least 10 characters)' };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<void>>(
          `/games/${gameId}/report`,
          {
            method: 'POST',
            body: JSON.stringify({ reason }),
          }
        );

        if (response.success) {
          return { success: true };
        }

        return { success: false, error: response.error || 'Failed to submit report' };
      } catch (error) {
        console.error('[GameSharingService] Report error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to submit report',
        };
      }
    }

    // Demo mode fallback
    return { success: true };
  }

  /**
   * Get user's published games
   */
  async getMyGames(page = 1, limit = 12): Promise<GameSearchResults> {
    if (!this.authToken) {
      return { games: [], total: 0, page: 1, totalPages: 0 };
    }

    // Use real API if configured
    if (!this.isDemoMode()) {
      try {
        const response = await this.apiRequest<ApiResponse<GameSearchResults>>(
          `/games/my?page=${page}&limit=${limit}`
        );

        if (response.success && response.data) {
          return {
            ...response.data,
            games: response.data.games.map(game => ({
              ...game,
              createdAt: new Date(game.createdAt),
              updatedAt: new Date(game.updatedAt),
            })),
          };
        }
      } catch (error) {
        console.error('[GameSharingService] Get my games error:', error);
      }
    }

    // Demo mode fallback - return empty for own games
    return { games: [], total: 0, page: 1, totalPages: 0 };
  }

  /**
   * Generate share links
   */
  getShareLinks(game: PublishedGame): {
    twitter: string;
    facebook: string;
    reddit: string;
    copy: string;
  } {
    const url = encodeURIComponent(`${this.baseUrl}/games/${game.slug}`);
    const title = encodeURIComponent(game.title);

    return {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=Check%20out%20${title}%20on%20PromptPlay!`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      reddit: `https://reddit.com/submit?url=${url}&title=${title}`,
      copy: `${this.baseUrl}/games/${game.slug}`,
    };
  }

  /**
   * Generate embed code
   */
  generateEmbedCode(embedUrl: string, title: string): string {
    return `<iframe
  src="${embedUrl}"
  title="${title}"
  width="800"
  height="600"
  frameborder="0"
  allowfullscreen
></iframe>`;
  }

  /**
   * Generate slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  }

  /**
   * Get demo games for offline/demo mode
   */
  private getDemoGames(): PublishedGame[] {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 'game-jump-quest',
        slug: 'jump-quest',
        title: 'Jump Quest',
        description: 'A challenging platformer where you must jump across floating islands to reach the treasure.',
        author: { id: 'user1', name: 'JumpMaster', avatar: '🦘' },
        screenshots: [],
        genre: 'platformer',
        tags: ['platformer', 'challenging', 'pixel'],
        plays: 15420,
        likes: 892,
        comments: 45,
        rating: 4.7,
        ratingCount: 234,
        createdAt: monthAgo,
        updatedAt: weekAgo,
        isPublic: true,
        isFeatured: true,
        embedUrl: 'https://play.promptplay.dev/embed/jump-quest',
      },
      {
        id: 'game-space-blaster',
        slug: 'space-blaster',
        title: 'Space Blaster',
        description: 'Defend Earth from alien invaders in this retro-style space shooter!',
        author: { id: 'user2', name: 'SpaceGamer', avatar: 'SG' },
        screenshots: [],
        genre: 'shooter',
        tags: ['shooter', 'space', 'retro', 'action'],
        plays: 28900,
        likes: 1523,
        comments: 89,
        rating: 4.9,
        ratingCount: 456,
        createdAt: monthAgo,
        updatedAt: now,
        isPublic: true,
        isFeatured: true,
        embedUrl: 'https://play.promptplay.dev/embed/space-blaster',
      },
      {
        id: 'game-puzzle-blocks',
        slug: 'puzzle-blocks',
        title: 'Puzzle Blocks',
        description: 'Push blocks onto targets in this brain-teasing puzzle game with 50 levels!',
        author: { id: 'user3', name: 'PuzzleKing', avatar: '🧩' },
        screenshots: [],
        genre: 'puzzle',
        tags: ['puzzle', 'sokoban', 'brain', 'levels'],
        plays: 8760,
        likes: 543,
        comments: 32,
        rating: 4.5,
        ratingCount: 123,
        createdAt: monthAgo,
        updatedAt: weekAgo,
        isPublic: true,
        isFeatured: true,
        embedUrl: 'https://play.promptplay.dev/embed/puzzle-blocks',
      },
      {
        id: 'game-coin-collector',
        slug: 'coin-collector',
        title: 'Coin Collector',
        description: 'Race against time to collect all the coins before they disappear!',
        author: { id: 'user4', name: 'CoinHunter', avatar: 'CH' },
        screenshots: [],
        genre: 'platformer',
        tags: ['platformer', 'coins', 'fast-paced'],
        plays: 12340,
        likes: 678,
        comments: 28,
        rating: 4.3,
        ratingCount: 189,
        createdAt: monthAgo,
        updatedAt: monthAgo,
        isPublic: true,
        isFeatured: false,
        embedUrl: 'https://play.promptplay.dev/embed/coin-collector',
      },
      {
        id: 'game-tower-defense',
        slug: 'tower-defense-mini',
        title: 'Tower Defense Mini',
        description: 'Build towers to defend your base from waves of enemies.',
        author: { id: 'user5', name: 'TowerBuilder', avatar: '🏰' },
        screenshots: [],
        genre: 'other',
        tags: ['tower-defense', 'strategy', 'waves'],
        plays: 6890,
        likes: 412,
        comments: 19,
        rating: 4.4,
        ratingCount: 87,
        createdAt: monthAgo,
        updatedAt: weekAgo,
        isPublic: true,
        isFeatured: false,
        embedUrl: 'https://play.promptplay.dev/embed/tower-defense-mini',
      },
      {
        id: 'game-endless-runner',
        slug: 'run-forever',
        title: 'Run Forever',
        description: 'How far can you run? Dodge obstacles and collect power-ups in this endless runner!',
        author: { id: 'user6', name: 'RunnerFan', avatar: '🏃' },
        screenshots: [],
        genre: 'platformer',
        tags: ['endless', 'runner', 'high-score', 'casual'],
        plays: 21500,
        likes: 1234,
        comments: 67,
        rating: 4.6,
        ratingCount: 345,
        createdAt: monthAgo,
        updatedAt: now,
        isPublic: true,
        isFeatured: true,
        embedUrl: 'https://play.promptplay.dev/embed/run-forever',
      },
    ];
  }
}

// Singleton instance
export const gameSharing = new GameSharingService();
