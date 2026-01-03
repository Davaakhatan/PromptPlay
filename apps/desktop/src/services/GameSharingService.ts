import type { GameSpec } from '@promptplay/shared-types';

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
  private baseUrl = 'https://play.promptplay.dev'; // Placeholder
  private authToken: string | null = null;

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
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

    // Generate slug from title
    const slug = this.generateSlug(options.title);
    const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // In production, this would upload to the server
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

    // In production, this would update the game on the server
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

    // In production, this would delete from the server
    return { success: true };
  }

  /**
   * Search for games
   */
  async searchGames(params: GameSearchParams = {}): Promise<GameSearchResults> {
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
    const demoGames = this.getDemoGames();
    return demoGames.filter((g) => g.isFeatured).slice(0, 6);
  }

  /**
   * Get game details
   */
  async getGame(idOrSlug: string): Promise<PublishedGame | null> {
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

    // In production, this would call the API
    return { success: true, likes: 1 };
  }

  /**
   * Unlike a game
   */
  async unlikeGame(gameId: string): Promise<{ success: boolean; likes: number; error?: string }> {
    if (!this.authToken) {
      return { success: false, likes: 0, error: 'Authentication required' };
    }

    return { success: true, likes: 0 };
  }

  /**
   * Get game comments
   */
  async getComments(gameId: string, page = 1, limit = 20): Promise<{ comments: GameComment[]; total: number }> {
    // Demo comments
    const demoComments: GameComment[] = [
      {
        id: 'comment-1',
        author: { id: 'user1', name: 'GamerPro', avatar: '🎮' },
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
    const description = encodeURIComponent(game.description.slice(0, 100));

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
        author: { id: 'user2', name: 'SpaceGamer', avatar: '🚀' },
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
        author: { id: 'user4', name: 'CoinHunter', avatar: '💰' },
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
