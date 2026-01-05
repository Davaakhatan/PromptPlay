/**
 * Leaderboards Service
 * Score tracking, rankings, and achievement management
 */

import { networkManager } from './NetworkManager';

// Leaderboard type
export type LeaderboardType = 'global' | 'friends' | 'regional' | 'weekly' | 'daily';

// Score entry
export interface ScoreEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
  region?: string;
  platform?: string;
}

// Leaderboard configuration
export interface LeaderboardConfig {
  id: string;
  name: string;
  description?: string;
  type: LeaderboardType;
  sortOrder: 'ascending' | 'descending';
  maxEntries: number;
  resetPeriod?: 'never' | 'daily' | 'weekly' | 'monthly' | 'seasonal';
  allowDuplicates: boolean;
  aggregation: 'best' | 'latest' | 'sum' | 'average';
  metadata?: Record<string, unknown>;
}

// Leaderboard data
export interface Leaderboard {
  config: LeaderboardConfig;
  entries: ScoreEntry[];
  totalEntries: number;
  lastUpdated: number;
  userEntry?: ScoreEntry;
}

// Achievement definition
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  points: number;
  secret: boolean;
  category?: string;
  requirements: {
    type: 'score' | 'count' | 'time' | 'custom';
    target: number;
    leaderboardId?: string;
    customCheck?: string;
  };
}

// Player achievement
export interface PlayerAchievement {
  achievementId: string;
  unlockedAt: number;
  progress: number;
  completed: boolean;
}

// Player stats
export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  playtime: number;
  achievements: PlayerAchievement[];
  customStats: Record<string, number>;
  lastActive: number;
}

// Leaderboard event types
export type LeaderboardEvent =
  | 'score-submitted'
  | 'rank-changed'
  | 'achievement-unlocked'
  | 'achievement-progress'
  | 'stats-updated'
  | 'error';

// Default leaderboards
const DEFAULT_LEADERBOARDS: LeaderboardConfig[] = [
  {
    id: 'global-highscore',
    name: 'Global High Scores',
    type: 'global',
    sortOrder: 'descending',
    maxEntries: 1000,
    allowDuplicates: false,
    aggregation: 'best',
  },
  {
    id: 'weekly-highscore',
    name: 'Weekly High Scores',
    type: 'weekly',
    sortOrder: 'descending',
    maxEntries: 100,
    resetPeriod: 'weekly',
    allowDuplicates: false,
    aggregation: 'best',
  },
  {
    id: 'daily-highscore',
    name: 'Daily High Scores',
    type: 'daily',
    sortOrder: 'descending',
    maxEntries: 50,
    resetPeriod: 'daily',
    allowDuplicates: false,
    aggregation: 'best',
  },
  {
    id: 'fastest-completion',
    name: 'Fastest Completion',
    type: 'global',
    sortOrder: 'ascending',
    maxEntries: 100,
    allowDuplicates: false,
    aggregation: 'best',
  },
];

class LeaderboardsService {
  private leaderboards: Map<string, Leaderboard> = new Map();
  private achievements: Map<string, AchievementDefinition> = new Map();
  private localStats: PlayerStats | null = null;
  private eventListeners: Map<LeaderboardEvent, Set<(data: unknown) => void>> = new Map();
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout: number = 60000; // 1 minute

  constructor() {
    // Initialize default leaderboards
    for (const config of DEFAULT_LEADERBOARDS) {
      this.leaderboards.set(config.id, {
        config,
        entries: [],
        totalEntries: 0,
        lastUpdated: 0,
      });
    }
  }

  /**
   * Submit a score to a leaderboard
   */
  async submitScore(
    leaderboardId: string,
    score: number,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; rank?: number; isNewBest?: boolean }> {
    if (!networkManager.isConnected()) {
      // Queue for later submission
      this.queueOfflineScore(leaderboardId, score, metadata);
      return { success: false };
    }

    try {
      const result = await networkManager.callRPC<{
        success: boolean;
        rank: number;
        isNewBest: boolean;
        previousBest?: number;
      }>('leaderboard:submit', {
        leaderboardId,
        score,
        metadata,
        timestamp: Date.now(),
      });

      if (result.success) {
        // Invalidate cache
        this.invalidateCache(leaderboardId);

        this.emit('score-submitted', {
          leaderboardId,
          score,
          rank: result.rank,
          isNewBest: result.isNewBest,
          previousBest: result.previousBest,
        });

        // Check achievements
        this.checkScoreAchievements(leaderboardId, score);
      }

      return result;
    } catch (error) {
      console.error('Failed to submit score:', error);
      this.emit('error', { message: 'Failed to submit score' });
      return { success: false };
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(
    leaderboardId: string,
    options: {
      offset?: number;
      limit?: number;
      includeUser?: boolean;
      region?: string;
    } = {}
  ): Promise<Leaderboard | null> {
    const { offset = 0, limit = 50, includeUser = true, region } = options;

    // Check cache
    const cacheKey = `${leaderboardId}-${offset}-${limit}-${region || 'all'}`;
    const cached = this.getFromCache<Leaderboard>(cacheKey);
    if (cached) return cached;

    if (!networkManager.isConnected()) {
      return this.leaderboards.get(leaderboardId) || null;
    }

    try {
      const result = await networkManager.callRPC<Leaderboard>('leaderboard:get', {
        leaderboardId,
        offset,
        limit,
        includeUser,
        region,
        playerId: networkManager.getLocalId(),
      });

      // Update local cache
      const leaderboard = this.leaderboards.get(leaderboardId);
      if (leaderboard) {
        leaderboard.entries = result.entries;
        leaderboard.totalEntries = result.totalEntries;
        leaderboard.lastUpdated = Date.now();
        leaderboard.userEntry = result.userEntry;
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return this.leaderboards.get(leaderboardId) || null;
    }
  }

  /**
   * Get entries around player's rank
   */
  async getAroundPlayer(
    leaderboardId: string,
    range: number = 5
  ): Promise<ScoreEntry[]> {
    if (!networkManager.isConnected()) {
      return [];
    }

    try {
      return await networkManager.callRPC<ScoreEntry[]>('leaderboard:around-player', {
        leaderboardId,
        playerId: networkManager.getLocalId(),
        range,
      });
    } catch (error) {
      console.error('Failed to get entries around player:', error);
      return [];
    }
  }

  /**
   * Get player's rank on a leaderboard
   */
  async getPlayerRank(leaderboardId: string, playerId?: string): Promise<number | null> {
    if (!networkManager.isConnected()) {
      return null;
    }

    try {
      const result = await networkManager.callRPC<{ rank: number }>('leaderboard:player-rank', {
        leaderboardId,
        playerId: playerId || networkManager.getLocalId(),
      });
      return result.rank;
    } catch (error) {
      console.error('Failed to get player rank:', error);
      return null;
    }
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(leaderboardId: string): Promise<ScoreEntry[]> {
    if (!networkManager.isConnected()) {
      return [];
    }

    try {
      return await networkManager.callRPC<ScoreEntry[]>('leaderboard:friends', {
        leaderboardId,
        playerId: networkManager.getLocalId(),
      });
    } catch (error) {
      console.error('Failed to get friends leaderboard:', error);
      return [];
    }
  }

  /**
   * Get player stats
   */
  async getPlayerStats(playerId?: string): Promise<PlayerStats | null> {
    const targetId = playerId || networkManager.getLocalId();

    if (!networkManager.isConnected()) {
      return targetId === networkManager.getLocalId() ? this.localStats : null;
    }

    try {
      const stats = await networkManager.callRPC<PlayerStats>('stats:get', {
        playerId: targetId,
      });

      if (!playerId || playerId === networkManager.getLocalId()) {
        this.localStats = stats;
      }

      return stats;
    } catch (error) {
      console.error('Failed to get player stats:', error);
      return this.localStats;
    }
  }

  /**
   * Update player stats
   */
  async updateStats(updates: {
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    playtime?: number;
    customStats?: Record<string, number>;
  }): Promise<boolean> {
    if (!networkManager.isConnected()) {
      // Update locally
      if (this.localStats) {
        if (updates.gamesPlayed !== undefined) {
          this.localStats.gamesPlayed += updates.gamesPlayed;
        }
        if (updates.wins !== undefined) {
          this.localStats.wins += updates.wins;
        }
        if (updates.losses !== undefined) {
          this.localStats.losses += updates.losses;
        }
        if (updates.playtime !== undefined) {
          this.localStats.playtime += updates.playtime;
        }
        if (updates.customStats) {
          for (const [key, value] of Object.entries(updates.customStats)) {
            this.localStats.customStats[key] =
              (this.localStats.customStats[key] || 0) + value;
          }
        }
      }
      return true;
    }

    try {
      await networkManager.callRPC('stats:update', {
        playerId: networkManager.getLocalId(),
        updates,
      });

      this.emit('stats-updated', { updates });

      // Check achievements based on stats
      this.checkStatAchievements(updates);

      return true;
    } catch (error) {
      console.error('Failed to update stats:', error);
      return false;
    }
  }

  /**
   * Register an achievement
   */
  registerAchievement(achievement: AchievementDefinition): void {
    this.achievements.set(achievement.id, achievement);
  }

  /**
   * Register multiple achievements
   */
  registerAchievements(achievements: AchievementDefinition[]): void {
    for (const achievement of achievements) {
      this.registerAchievement(achievement);
    }
  }

  /**
   * Get all achievements
   */
  getAchievements(): AchievementDefinition[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get player achievements
   */
  async getPlayerAchievements(playerId?: string): Promise<PlayerAchievement[]> {
    if (!networkManager.isConnected()) {
      return this.localStats?.achievements || [];
    }

    try {
      return await networkManager.callRPC<PlayerAchievement[]>('achievements:get', {
        playerId: playerId || networkManager.getLocalId(),
      });
    } catch (error) {
      console.error('Failed to get player achievements:', error);
      return this.localStats?.achievements || [];
    }
  }

  /**
   * Update achievement progress
   */
  async updateAchievementProgress(
    achievementId: string,
    progress: number
  ): Promise<boolean> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return false;

    const completed = progress >= achievement.requirements.target;

    if (!networkManager.isConnected()) {
      // Update locally
      if (this.localStats) {
        const existing = this.localStats.achievements.find(
          a => a.achievementId === achievementId
        );
        if (existing) {
          existing.progress = progress;
          if (completed && !existing.completed) {
            existing.completed = true;
            existing.unlockedAt = Date.now();
            this.emit('achievement-unlocked', { achievement, unlockedAt: existing.unlockedAt });
          }
        } else {
          this.localStats.achievements.push({
            achievementId,
            progress,
            completed,
            unlockedAt: completed ? Date.now() : 0,
          });
          if (completed) {
            this.emit('achievement-unlocked', { achievement, unlockedAt: Date.now() });
          }
        }
      }
      return true;
    }

    try {
      const result = await networkManager.callRPC<{
        unlocked: boolean;
        progress: number;
      }>('achievements:progress', {
        playerId: networkManager.getLocalId(),
        achievementId,
        progress,
      });

      this.emit('achievement-progress', {
        achievementId,
        progress: result.progress,
        target: achievement.requirements.target,
      });

      if (result.unlocked) {
        this.emit('achievement-unlocked', {
          achievement,
          unlockedAt: Date.now(),
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to update achievement progress:', error);
      return false;
    }
  }

  /**
   * Check score-based achievements
   */
  private checkScoreAchievements(leaderboardId: string, score: number): void {
    for (const achievement of this.achievements.values()) {
      if (
        achievement.requirements.type === 'score' &&
        achievement.requirements.leaderboardId === leaderboardId
      ) {
        if (score >= achievement.requirements.target) {
          this.updateAchievementProgress(achievement.id, score);
        }
      }
    }
  }

  /**
   * Check stat-based achievements
   */
  private checkStatAchievements(updates: Record<string, unknown>): void {
    for (const achievement of this.achievements.values()) {
      if (achievement.requirements.type === 'count') {
        // Check if any stat update matches the achievement
        for (const [_key, value] of Object.entries(updates)) {
          if (typeof value === 'number') {
            // This is simplified - in production, you'd track cumulative progress
            this.updateAchievementProgress(achievement.id, value);
          }
        }
      }
    }
  }

  /**
   * Queue offline score
   */
  private queueOfflineScore(
    leaderboardId: string,
    score: number,
    metadata?: Record<string, unknown>
  ): void {
    // Store in localStorage for later submission
    const offlineScores = this.getOfflineScores();
    offlineScores.push({
      leaderboardId,
      score,
      metadata,
      timestamp: Date.now(),
    });
    localStorage.setItem('offline_scores', JSON.stringify(offlineScores));
  }

  /**
   * Get offline scores
   */
  private getOfflineScores(): Array<{
    leaderboardId: string;
    score: number;
    metadata?: Record<string, unknown>;
    timestamp: number;
  }> {
    try {
      const stored = localStorage.getItem('offline_scores');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Sync offline scores
   */
  async syncOfflineScores(): Promise<void> {
    if (!networkManager.isConnected()) return;

    const offlineScores = this.getOfflineScores();
    if (offlineScores.length === 0) return;

    for (const entry of offlineScores) {
      await this.submitScore(entry.leaderboardId, entry.score, entry.metadata);
    }

    localStorage.removeItem('offline_scores');
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Add event listener
   */
  on(event: LeaderboardEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: LeaderboardEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: LeaderboardEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Get all leaderboard configs
   */
  getLeaderboardConfigs(): LeaderboardConfig[] {
    return Array.from(this.leaderboards.values()).map(lb => lb.config);
  }

  /**
   * Get local stats
   */
  getLocalStats(): PlayerStats | null {
    return this.localStats;
  }
}

// Singleton instance
export const leaderboards = new LeaderboardsService();
