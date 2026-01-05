/**
 * Matchmaking Service
 * Player matching and queue management
 */

import { networkManager, type NetworkMessage } from './NetworkManager';
import { lobbySystem } from './LobbySystem';

// Match state
export type MatchState = 'idle' | 'searching' | 'found' | 'joining' | 'cancelled' | 'error';

// Queue type
export type QueueType = 'casual' | 'ranked' | 'custom';

// Match criteria
export interface MatchCriteria {
  gameMode: string;
  region?: string;
  minPlayers: number;
  maxPlayers: number;
  skillRange?: { min: number; max: number };
  latencyThreshold?: number;
  allowCrossplay?: boolean;
  customFilters?: Record<string, unknown>;
}

// Player rating
export interface PlayerRating {
  playerId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  rank?: string;
  tier?: number;
  division?: number;
}

// Match ticket
export interface MatchTicket {
  id: string;
  playerId: string;
  playerName: string;
  criteria: MatchCriteria;
  rating?: PlayerRating;
  createdAt: number;
  status: 'pending' | 'matched' | 'cancelled' | 'expired';
  estimatedWait?: number;
}

// Match result
export interface MatchResult {
  matchId: string;
  roomId: string;
  players: Array<{
    playerId: string;
    playerName: string;
    rating?: PlayerRating;
    team?: string;
  }>;
  gameMode: string;
  region: string;
  serverUrl?: string;
  createdAt: number;
}

// Queue stats
export interface QueueStats {
  queueType: QueueType;
  playersInQueue: number;
  averageWaitTime: number;
  estimatedWaitTime: number;
  activeMatches: number;
}

// Matchmaking event types
export type MatchmakingEvent =
  | 'queue-joined'
  | 'queue-left'
  | 'match-found'
  | 'match-accepted'
  | 'match-declined'
  | 'match-ready'
  | 'match-cancelled'
  | 'queue-update'
  | 'error';

// Rank tiers
export const RANK_TIERS = [
  { name: 'Bronze', minRating: 0, maxRating: 1000, divisions: 4 },
  { name: 'Silver', minRating: 1000, maxRating: 1500, divisions: 4 },
  { name: 'Gold', minRating: 1500, maxRating: 2000, divisions: 4 },
  { name: 'Platinum', minRating: 2000, maxRating: 2500, divisions: 4 },
  { name: 'Diamond', minRating: 2500, maxRating: 3000, divisions: 4 },
  { name: 'Master', minRating: 3000, maxRating: 3500, divisions: 1 },
  { name: 'Grandmaster', minRating: 3500, maxRating: Infinity, divisions: 1 },
] as const;

class MatchmakingService {
  private state: MatchState = 'idle';
  private currentTicket: MatchTicket | null = null;
  private currentMatch: MatchResult | null = null;
  private localRating: PlayerRating | null = null;
  private queueStats: Map<QueueType, QueueStats> = new Map();
  private eventListeners: Map<MatchmakingEvent, Set<(data: unknown) => void>> = new Map();
  private searchStartTime: number = 0;
  private matchAcceptTimer: number | null = null;
  private matchAcceptDeadline: number = 0;
  private playersAccepted: Set<string> = new Set();

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkListeners(): void {
    networkManager.on('message', (data) => {
      const message = data as NetworkMessage;
      this.handleNetworkMessage(message);
    });

    networkManager.on('disconnected', () => {
      this.handleDisconnect();
    });
  }

  /**
   * Join matchmaking queue
   */
  async joinQueue(
    criteria: MatchCriteria,
    queueType: QueueType = 'casual',
    playerName: string = 'Player'
  ): Promise<MatchTicket | null> {
    if (!networkManager.isConnected()) {
      this.emit('error', { message: 'Not connected to server' });
      return null;
    }

    if (this.state !== 'idle') {
      this.emit('error', { message: 'Already in queue or match' });
      return null;
    }

    this.setState('searching');
    this.searchStartTime = Date.now();

    try {
      const result = await networkManager.callRPC<{
        success: boolean;
        ticket?: MatchTicket;
        error?: string;
      }>('matchmaking:join', {
        criteria,
        queueType,
        playerName,
        rating: this.localRating,
      });

      if (!result.success || !result.ticket) {
        this.setState('idle');
        this.emit('error', { message: result.error || 'Failed to join queue' });
        return null;
      }

      this.currentTicket = result.ticket;
      this.emit('queue-joined', { ticket: this.currentTicket });
      return this.currentTicket;
    } catch (error) {
      this.setState('idle');
      this.emit('error', { message: 'Failed to join matchmaking queue' });
      return null;
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(): Promise<boolean> {
    if (!this.currentTicket) return false;

    try {
      await networkManager.callRPC('matchmaking:leave', {
        ticketId: this.currentTicket.id,
      });

      this.currentTicket = null;
      this.setState('idle');
      this.emit('queue-left', {});
      return true;
    } catch (error) {
      console.error('Failed to leave queue:', error);
      return false;
    }
  }

  /**
   * Accept found match
   */
  async acceptMatch(): Promise<boolean> {
    if (!this.currentMatch || this.state !== 'found') return false;

    try {
      this.playersAccepted.add(networkManager.getLocalId());

      await networkManager.callRPC('matchmaking:accept', {
        matchId: this.currentMatch.matchId,
      });

      this.emit('match-accepted', { matchId: this.currentMatch.matchId });

      // Check if all players accepted
      if (this.playersAccepted.size === this.currentMatch.players.length) {
        this.startMatch();
      }

      return true;
    } catch (error) {
      console.error('Failed to accept match:', error);
      return false;
    }
  }

  /**
   * Decline found match
   */
  async declineMatch(): Promise<void> {
    if (!this.currentMatch) return;

    try {
      await networkManager.callRPC('matchmaking:decline', {
        matchId: this.currentMatch.matchId,
      });

      this.clearMatchAcceptTimer();
      this.currentMatch = null;
      this.playersAccepted.clear();
      this.setState('idle');
      this.emit('match-declined', {});
    } catch (error) {
      console.error('Failed to decline match:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueType: QueueType): Promise<QueueStats | null> {
    try {
      const stats = await networkManager.callRPC<QueueStats>('matchmaking:queue-stats', {
        queueType,
      });

      this.queueStats.set(queueType, stats);
      return stats;
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Get player rating
   */
  async getPlayerRating(playerId?: string): Promise<PlayerRating | null> {
    try {
      const rating = await networkManager.callRPC<PlayerRating>('matchmaking:get-rating', {
        playerId: playerId || networkManager.getLocalId(),
      });

      if (!playerId || playerId === networkManager.getLocalId()) {
        this.localRating = rating;
      }

      return rating;
    } catch (error) {
      console.error('Failed to get player rating:', error);
      return null;
    }
  }

  /**
   * Report match result (for rating update)
   */
  async reportMatchResult(
    matchId: string,
    winnerId: string,
    stats?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      await networkManager.callRPC('matchmaking:report-result', {
        matchId,
        winnerId,
        stats,
      });

      return true;
    } catch (error) {
      console.error('Failed to report match result:', error);
      return false;
    }
  }

  /**
   * Handle network message
   */
  private handleNetworkMessage(message: NetworkMessage): void {
    if (message.type !== 'action') return;

    const payload = message.payload as { type: string; [key: string]: unknown };

    switch (payload.type) {
      case 'matchmaking:match-found':
        this.handleMatchFound(payload.match as MatchResult, payload.acceptDeadline as number);
        break;
      case 'matchmaking:player-accepted':
        this.handlePlayerAccepted(payload.playerId as string);
        break;
      case 'matchmaking:player-declined':
        this.handlePlayerDeclined(payload.playerId as string);
        break;
      case 'matchmaking:match-ready':
        this.handleMatchReady();
        break;
      case 'matchmaking:match-cancelled':
        this.handleMatchCancelled(payload.reason as string);
        break;
      case 'matchmaking:queue-update':
        this.handleQueueUpdate(payload);
        break;
      case 'matchmaking:rating-updated':
        this.handleRatingUpdated(payload.rating as PlayerRating);
        break;
    }
  }

  /**
   * Handle match found
   */
  private handleMatchFound(match: MatchResult, acceptDeadline: number): void {
    this.currentMatch = match;
    this.matchAcceptDeadline = acceptDeadline;
    this.playersAccepted.clear();
    this.setState('found');

    // Start accept timer
    this.matchAcceptTimer = window.setTimeout(() => {
      if (this.state === 'found') {
        this.declineMatch();
      }
    }, acceptDeadline - Date.now());

    this.emit('match-found', {
      match,
      acceptDeadline,
      timeToAccept: acceptDeadline - Date.now(),
    });
  }

  /**
   * Handle player accepted
   */
  private handlePlayerAccepted(playerId: string): void {
    this.playersAccepted.add(playerId);

    this.emit('queue-update', {
      playersAccepted: this.playersAccepted.size,
      totalPlayers: this.currentMatch?.players.length || 0,
    });

    // Check if all accepted
    if (this.currentMatch && this.playersAccepted.size === this.currentMatch.players.length) {
      this.handleMatchReady();
    }
  }

  /**
   * Handle player declined
   */
  private handlePlayerDeclined(playerId: string): void {
    this.emit('queue-update', {
      message: `A player declined the match`,
      playerId,
    });

    // Return to queue
    this.clearMatchAcceptTimer();
    this.currentMatch = null;
    this.playersAccepted.clear();
    this.setState('searching');
  }

  /**
   * Handle match ready
   */
  private handleMatchReady(): void {
    this.clearMatchAcceptTimer();
    this.setState('joining');

    this.emit('match-ready', {
      match: this.currentMatch,
    });

    // Join the match room
    this.startMatch();
  }

  /**
   * Start the match
   */
  private async startMatch(): Promise<void> {
    if (!this.currentMatch) return;

    try {
      // Join the lobby room
      await lobbySystem.joinRoom(
        this.currentMatch.roomId,
        this.currentMatch.players.find(p => p.playerId === networkManager.getLocalId())?.playerName || 'Player'
      );

      this.currentTicket = null;
      this.setState('idle');
    } catch (error) {
      console.error('Failed to join match room:', error);
      this.emit('error', { message: 'Failed to join match' });
      this.setState('idle');
    }
  }

  /**
   * Handle match cancelled
   */
  private handleMatchCancelled(reason: string): void {
    this.clearMatchAcceptTimer();
    this.currentMatch = null;
    this.playersAccepted.clear();
    this.setState('cancelled');

    this.emit('match-cancelled', { reason });

    // Return to idle after delay
    setTimeout(() => {
      if (this.state === 'cancelled') {
        this.setState('idle');
      }
    }, 3000);
  }

  /**
   * Handle queue update
   */
  private handleQueueUpdate(payload: { [key: string]: unknown }): void {
    if (this.currentTicket) {
      this.currentTicket.estimatedWait = payload.estimatedWait as number;
    }

    this.emit('queue-update', {
      position: payload.position,
      estimatedWait: payload.estimatedWait,
      playersInQueue: payload.playersInQueue,
    });
  }

  /**
   * Handle rating updated
   */
  private handleRatingUpdated(rating: PlayerRating): void {
    this.localRating = rating;

    this.emit('queue-update', {
      type: 'rating-updated',
      rating,
      rank: this.getRankFromRating(rating.rating),
    });
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.clearMatchAcceptTimer();
    this.currentTicket = null;
    this.currentMatch = null;
    this.playersAccepted.clear();
    this.setState('idle');
  }

  /**
   * Clear match accept timer
   */
  private clearMatchAcceptTimer(): void {
    if (this.matchAcceptTimer) {
      clearTimeout(this.matchAcceptTimer);
      this.matchAcceptTimer = null;
    }
  }

  /**
   * Set state
   */
  private setState(state: MatchState): void {
    this.state = state;
  }

  /**
   * Get rank from rating
   */
  getRankFromRating(rating: number): { tier: string; division: number } {
    for (const tier of RANK_TIERS) {
      if (rating >= tier.minRating && rating < tier.maxRating) {
        const divisionRange = (tier.maxRating - tier.minRating) / tier.divisions;
        const division = Math.floor((rating - tier.minRating) / divisionRange) + 1;
        return {
          tier: tier.name,
          division: Math.min(division, tier.divisions),
        };
      }
    }
    return { tier: 'Bronze', division: 4 };
  }

  /**
   * Calculate ELO change
   */
  calculateEloChange(
    playerRating: number,
    opponentRating: number,
    won: boolean,
    kFactor: number = 32
  ): number {
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const actualScore = won ? 1 : 0;
    return Math.round(kFactor * (actualScore - expectedScore));
  }

  /**
   * Add event listener
   */
  on(event: MatchmakingEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: MatchmakingEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: MatchmakingEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Get current state
   */
  getState(): MatchState {
    return this.state;
  }

  /**
   * Get current ticket
   */
  getCurrentTicket(): MatchTicket | null {
    return this.currentTicket;
  }

  /**
   * Get current match
   */
  getCurrentMatch(): MatchResult | null {
    return this.currentMatch;
  }

  /**
   * Get local rating
   */
  getLocalRating(): PlayerRating | null {
    return this.localRating;
  }

  /**
   * Get search time
   */
  getSearchTime(): number {
    if (this.state !== 'searching') return 0;
    return Date.now() - this.searchStartTime;
  }

  /**
   * Get match accept time remaining
   */
  getMatchAcceptTimeRemaining(): number {
    if (this.state !== 'found') return 0;
    return Math.max(0, this.matchAcceptDeadline - Date.now());
  }

  /**
   * Get players accepted count
   */
  getPlayersAcceptedCount(): number {
    return this.playersAccepted.size;
  }

  /**
   * Is searching
   */
  isSearching(): boolean {
    return this.state === 'searching';
  }
}

// Singleton instance
export const matchmaking = new MatchmakingService();
