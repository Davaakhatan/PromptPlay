/**
 * Lobby Manager
 * Handles multiplayer lobby creation, joining, and matchmaking
 */

import { NetworkManager } from './NetworkManager';
import { createMessage, LobbyUpdateMessage, GameStartMessage } from './messages';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  data?: Record<string, unknown>;
}

export interface Lobby {
  id: string;
  name: string;
  hostId: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  state: 'waiting' | 'starting' | 'in_game';
  settings: Record<string, unknown>;
  createdAt: number;
}

export interface LobbyConfig {
  maxPlayers?: number;
  isPrivate?: boolean;
  settings?: Record<string, unknown>;
}

export type LobbyEventHandler = (lobby: Lobby) => void;

export class LobbyManager {
  private network: NetworkManager;
  private currentLobby: Lobby | null = null;
  private handlers: {
    onJoin: Set<LobbyEventHandler>;
    onLeave: Set<LobbyEventHandler>;
    onUpdate: Set<LobbyEventHandler>;
    onStart: Set<(lobby: Lobby, seed: number, state: Record<string, unknown>) => void>;
  } = {
    onJoin: new Set(),
    onLeave: new Set(),
    onUpdate: new Set(),
    onStart: new Set(),
  };

  constructor(network: NetworkManager) {
    this.network = network;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.network.on('lobby_update', (msg) => {
      this.handleLobbyUpdate(msg as LobbyUpdateMessage);
    });

    this.network.on('game_start', (msg) => {
      this.handleGameStart(msg as GameStartMessage);
    });
  }

  /**
   * Create a new lobby
   */
  createLobby(name: string, config: LobbyConfig = {}): void {
    const playerId = this.network.getPlayerId();
    if (!playerId) {
      throw new Error('Not connected to server');
    }

    this.network.send(createMessage('join_lobby', {
      lobbyId: `lobby_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      playerName: name,
      playerData: {
        isHost: true,
        maxPlayers: config.maxPlayers ?? 4,
        isPrivate: config.isPrivate ?? false,
        settings: config.settings ?? {},
      },
    }));
  }

  /**
   * Join an existing lobby
   */
  joinLobby(lobbyId: string, playerName: string, playerData?: Record<string, unknown>): void {
    this.network.send(createMessage('join_lobby', {
      lobbyId,
      playerName,
      playerData,
    }));
  }

  /**
   * Leave the current lobby
   */
  leaveLobby(): void {
    if (!this.currentLobby) return;

    this.network.send(createMessage('leave_lobby', {
      lobbyId: this.currentLobby.id,
    }));

    const lobby = this.currentLobby;
    this.currentLobby = null;
    this.handlers.onLeave.forEach(h => h(lobby));
  }

  /**
   * Set ready state
   */
  setReady(ready: boolean): void {
    if (!this.currentLobby) return;

    // This would typically send a ready message to server
    // For now, we just update local state
  }

  /**
   * Start the game (host only)
   */
  startGame(): void {
    if (!this.currentLobby) return;

    const playerId = this.network.getPlayerId();
    if (this.currentLobby.hostId !== playerId) {
      console.warn('[LobbyManager] Only host can start the game');
      return;
    }

    // Server will broadcast game_start when ready
    this.network.send(createMessage('game_start', {
      lobbyId: this.currentLobby.id,
      seed: Math.floor(Math.random() * 2147483647),
      initialState: {},
    }));
  }

  /**
   * Update lobby settings (host only)
   */
  updateSettings(settings: Record<string, unknown>): void {
    if (!this.currentLobby) return;

    const playerId = this.network.getPlayerId();
    if (this.currentLobby.hostId !== playerId) {
      console.warn('[LobbyManager] Only host can update settings');
      return;
    }

    // Send settings update
  }

  /**
   * Get current lobby
   */
  getCurrentLobby(): Lobby | null {
    return this.currentLobby;
  }

  /**
   * Check if current player is host
   */
  isHost(): boolean {
    if (!this.currentLobby) return false;
    return this.currentLobby.hostId === this.network.getPlayerId();
  }

  /**
   * Check if all players are ready
   */
  allPlayersReady(): boolean {
    if (!this.currentLobby) return false;
    return this.currentLobby.players.every(p => p.isReady || p.isHost);
  }

  /**
   * Subscribe to lobby events
   */
  onJoin(handler: LobbyEventHandler): () => void {
    this.handlers.onJoin.add(handler);
    return () => this.handlers.onJoin.delete(handler);
  }

  onLeave(handler: LobbyEventHandler): () => void {
    this.handlers.onLeave.add(handler);
    return () => this.handlers.onLeave.delete(handler);
  }

  onUpdate(handler: LobbyEventHandler): () => void {
    this.handlers.onUpdate.add(handler);
    return () => this.handlers.onUpdate.delete(handler);
  }

  onGameStart(handler: (lobby: Lobby, seed: number, state: Record<string, unknown>) => void): () => void {
    this.handlers.onStart.add(handler);
    return () => this.handlers.onStart.delete(handler);
  }

  private handleLobbyUpdate(msg: LobbyUpdateMessage): void {
    const isNewLobby = !this.currentLobby || this.currentLobby.id !== msg.lobbyId;

    this.currentLobby = {
      id: msg.lobbyId,
      name: msg.lobbyId, // Server should provide name
      hostId: msg.players.find(p => p.isHost)?.id || '',
      players: msg.players,
      maxPlayers: 4, // Server should provide this
      state: msg.state,
      settings: msg.settings || {},
      createdAt: Date.now(),
    };

    if (isNewLobby) {
      this.handlers.onJoin.forEach(h => h(this.currentLobby!));
    } else {
      this.handlers.onUpdate.forEach(h => h(this.currentLobby!));
    }
  }

  private handleGameStart(msg: GameStartMessage): void {
    if (!this.currentLobby || this.currentLobby.id !== msg.lobbyId) return;

    this.currentLobby.state = 'in_game';
    this.handlers.onStart.forEach(h => h(this.currentLobby!, msg.seed, msg.initialState));
  }
}
