/**
 * Lobby System Service
 * Room creation, joining, and player management
 */

import { networkManager, type NetworkMessage } from './NetworkManager';

// Room visibility
export type RoomVisibility = 'public' | 'private' | 'friends-only';

// Room state
export type RoomState = 'waiting' | 'starting' | 'in-game' | 'finished';

// Player role
export type PlayerRole = 'host' | 'player' | 'spectator';

// Player status
export type PlayerStatus = 'connected' | 'ready' | 'loading' | 'playing' | 'disconnected';

// Player info
export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  status: PlayerStatus;
  team?: string;
  avatar?: string;
  customData?: Record<string, unknown>;
  joinedAt: number;
  latency: number;
}

// Room configuration
export interface RoomConfig {
  name: string;
  maxPlayers: number;
  minPlayers: number;
  visibility: RoomVisibility;
  password?: string;
  gameMode?: string;
  map?: string;
  customSettings?: Record<string, unknown>;
  autoStart?: boolean;
  autoStartDelay?: number;
  allowSpectators?: boolean;
  allowLateJoin?: boolean;
  teamMode?: boolean;
  teams?: string[];
}

// Room info
export interface Room {
  id: string;
  config: RoomConfig;
  state: RoomState;
  hostId: string;
  players: Map<string, Player>;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
}

// Lobby event types
export type LobbyEvent =
  | 'room-created'
  | 'room-joined'
  | 'room-left'
  | 'room-updated'
  | 'player-joined'
  | 'player-left'
  | 'player-updated'
  | 'player-ready'
  | 'game-starting'
  | 'game-started'
  | 'game-ended'
  | 'chat-message'
  | 'kicked'
  | 'error';

// Chat message
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'chat' | 'system' | 'whisper';
  targetId?: string;
}

// Room listing
export interface RoomListing {
  id: string;
  name: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  gameMode?: string;
  map?: string;
  state: RoomState;
  hasPassword: boolean;
}

// Default room config
const DEFAULT_ROOM_CONFIG: RoomConfig = {
  name: 'New Room',
  maxPlayers: 8,
  minPlayers: 2,
  visibility: 'public',
  autoStart: false,
  autoStartDelay: 5000,
  allowSpectators: true,
  allowLateJoin: false,
  teamMode: false,
};

class LobbySystemService {
  private currentRoom: Room | null = null;
  private localPlayer: Player | null = null;
  private chatHistory: ChatMessage[] = [];
  private eventListeners: Map<LobbyEvent, Set<(data: unknown) => void>> = new Map();
  private autoStartTimer: number | null = null;

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

    networkManager.on('peer-joined', (data) => {
      const { peerId, playerName } = data as { peerId: string; playerName: string };
      this.handlePlayerJoin(peerId, playerName);
    });

    networkManager.on('peer-left', (data) => {
      const { peerId } = data as { peerId: string };
      this.handlePlayerLeave(peerId);
    });

    networkManager.on('disconnected', () => {
      this.handleDisconnect();
    });
  }

  /**
   * Create a new room
   */
  async createRoom(config: Partial<RoomConfig> = {}): Promise<Room> {
    if (!networkManager.isConnected()) {
      throw new Error('Not connected to server');
    }

    const roomConfig: RoomConfig = { ...DEFAULT_ROOM_CONFIG, ...config };
    const roomId = this.generateRoomId();

    const room: Room = {
      id: roomId,
      config: roomConfig,
      state: 'waiting',
      hostId: networkManager.getLocalId(),
      players: new Map(),
      createdAt: Date.now(),
    };

    // Add local player as host
    this.localPlayer = {
      id: networkManager.getLocalId(),
      name: roomConfig.name.split("'")[0] || 'Host',
      role: 'host',
      status: 'connected',
      joinedAt: Date.now(),
      latency: 0,
    };
    room.players.set(this.localPlayer.id, this.localPlayer);

    this.currentRoom = room;

    // Join room on server
    await networkManager.joinRoom(roomId, this.localPlayer.name);

    // Register room RPC handlers
    this.registerRoomHandlers();

    this.emit('room-created', { room: this.getRoomInfo() });
    return room;
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId: string, playerName: string, password?: string): Promise<boolean> {
    if (!networkManager.isConnected()) {
      throw new Error('Not connected to server');
    }

    // Request to join room
    try {
      const result = await networkManager.callRPC<{ room: Room; accepted: boolean; reason?: string }>(
        'lobby:join',
        { roomId, playerName, password }
      );

      if (!result.accepted) {
        this.emit('error', { message: result.reason || 'Join request denied' });
        return false;
      }

      // Setup local room state
      this.currentRoom = {
        ...result.room,
        players: new Map(Object.entries(result.room.players as unknown as Record<string, Player>)),
      };

      this.localPlayer = {
        id: networkManager.getLocalId(),
        name: playerName,
        role: 'player',
        status: 'connected',
        joinedAt: Date.now(),
        latency: networkManager.getStats().latency,
      };

      this.currentRoom.players.set(this.localPlayer.id, this.localPlayer);

      await networkManager.joinRoom(roomId, playerName);

      this.emit('room-joined', { room: this.getRoomInfo() });
      return true;
    } catch (error) {
      console.error('Failed to join room:', error);
      this.emit('error', { message: 'Failed to join room' });
      return false;
    }
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    if (!this.currentRoom) return;

    // Notify others
    this.broadcast({
      type: 'lobby:leave',
      playerId: this.localPlayer?.id,
    });

    networkManager.leaveRoom();

    const roomId = this.currentRoom.id;
    this.currentRoom = null;
    this.localPlayer = null;
    this.chatHistory = [];
    this.stopAutoStart();

    this.emit('room-left', { roomId });
  }

  /**
   * Set player ready status
   */
  setReady(ready: boolean): void {
    if (!this.currentRoom || !this.localPlayer) return;

    this.localPlayer.status = ready ? 'ready' : 'connected';
    this.currentRoom.players.set(this.localPlayer.id, this.localPlayer);

    this.broadcast({
      type: 'lobby:ready',
      playerId: this.localPlayer.id,
      ready,
    });

    this.emit('player-updated', { player: this.localPlayer });
    this.checkAutoStart();
  }

  /**
   * Start the game (host only)
   */
  startGame(): boolean {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.localPlayer.role !== 'host') {
      this.emit('error', { message: 'Only the host can start the game' });
      return false;
    }

    // Check minimum players
    const readyPlayers = Array.from(this.currentRoom.players.values()).filter(
      p => p.status === 'ready' || p.role === 'host'
    );

    if (readyPlayers.length < this.currentRoom.config.minPlayers) {
      this.emit('error', { message: `Need at least ${this.currentRoom.config.minPlayers} players` });
      return false;
    }

    this.currentRoom.state = 'starting';
    this.emit('game-starting', { countdown: 3 });

    // Start countdown
    setTimeout(() => {
      if (this.currentRoom) {
        this.currentRoom.state = 'in-game';
        this.currentRoom.startedAt = Date.now();

        // Update all players
        for (const player of this.currentRoom.players.values()) {
          player.status = 'playing';
        }

        this.broadcast({
          type: 'lobby:game-started',
          startTime: this.currentRoom.startedAt,
        });

        this.emit('game-started', { room: this.getRoomInfo() });
      }
    }, 3000);

    return true;
  }

  /**
   * End the game (host only)
   */
  endGame(results?: unknown): void {
    if (!this.currentRoom || !this.localPlayer) return;
    if (this.localPlayer.role !== 'host') return;

    this.currentRoom.state = 'finished';
    this.currentRoom.endedAt = Date.now();

    for (const player of this.currentRoom.players.values()) {
      player.status = 'connected';
    }

    this.broadcast({
      type: 'lobby:game-ended',
      results,
    });

    this.emit('game-ended', { results });
  }

  /**
   * Kick a player (host only)
   */
  kickPlayer(playerId: string, reason?: string): boolean {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.localPlayer.role !== 'host') return false;
    if (playerId === this.localPlayer.id) return false;

    const player = this.currentRoom.players.get(playerId);
    if (!player) return false;

    this.currentRoom.players.delete(playerId);

    // Notify the kicked player
    networkManager.sendToPeer(playerId, {
      type: 'action',
      id: this.generateId(),
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload: {
        type: 'lobby:kicked',
        reason,
      },
      reliable: true,
    });

    // Notify others
    this.broadcast({
      type: 'lobby:player-kicked',
      playerId,
      reason,
    });

    this.emit('player-left', { player, reason: 'kicked' });
    return true;
  }

  /**
   * Set player team (host only)
   */
  setPlayerTeam(playerId: string, team: string): boolean {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.localPlayer.role !== 'host' && playerId !== this.localPlayer.id) return false;

    const player = this.currentRoom.players.get(playerId);
    if (!player) return false;

    player.team = team;
    this.currentRoom.players.set(playerId, player);

    this.broadcast({
      type: 'lobby:team-changed',
      playerId,
      team,
    });

    this.emit('player-updated', { player });
    return true;
  }

  /**
   * Send chat message
   */
  sendChat(content: string, targetId?: string): void {
    if (!this.currentRoom || !this.localPlayer) return;

    const message: ChatMessage = {
      id: this.generateId(),
      senderId: this.localPlayer.id,
      senderName: this.localPlayer.name,
      content,
      timestamp: Date.now(),
      type: targetId ? 'whisper' : 'chat',
      targetId,
    };

    this.chatHistory.push(message);

    if (targetId) {
      networkManager.sendToPeer(targetId, {
        type: 'chat',
        id: message.id,
        timestamp: message.timestamp,
        senderId: message.senderId,
        payload: message,
        reliable: true,
      });
    } else {
      this.broadcast({
        type: 'lobby:chat',
        message,
      });
    }

    this.emit('chat-message', { message });
  }

  /**
   * Update room settings (host only)
   */
  updateRoomSettings(settings: Partial<RoomConfig>): boolean {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.localPlayer.role !== 'host') return false;

    this.currentRoom.config = { ...this.currentRoom.config, ...settings };

    this.broadcast({
      type: 'lobby:settings-updated',
      settings: this.currentRoom.config,
    });

    this.emit('room-updated', { room: this.getRoomInfo() });
    return true;
  }

  /**
   * Get available rooms
   */
  async getRoomList(): Promise<RoomListing[]> {
    if (!networkManager.isConnected()) {
      return [];
    }

    try {
      return await networkManager.callRPC<RoomListing[]>('lobby:list-rooms', {});
    } catch (error) {
      console.error('Failed to get room list:', error);
      return [];
    }
  }

  /**
   * Handle network message
   */
  private handleNetworkMessage(message: NetworkMessage): void {
    if (message.type !== 'action' && message.type !== 'chat') return;

    const payload = message.payload as { type: string; [key: string]: unknown };

    switch (payload.type) {
      case 'lobby:join-request':
        this.handleJoinRequest(message.senderId, payload);
        break;
      case 'lobby:leave':
        this.handlePlayerLeave(payload.playerId as string);
        break;
      case 'lobby:ready':
        this.handlePlayerReady(payload.playerId as string, payload.ready as boolean);
        break;
      case 'lobby:game-started':
        this.handleGameStarted(payload.startTime as number);
        break;
      case 'lobby:game-ended':
        this.handleGameEnded(payload.results);
        break;
      case 'lobby:kicked':
        this.handleKicked(payload.reason as string | undefined);
        break;
      case 'lobby:chat':
        this.handleChatMessage(payload.message as ChatMessage);
        break;
      case 'lobby:settings-updated':
        this.handleSettingsUpdated(payload.settings as RoomConfig);
        break;
      case 'lobby:team-changed':
        this.handleTeamChanged(payload.playerId as string, payload.team as string);
        break;
    }
  }

  /**
   * Handle player join
   */
  private handlePlayerJoin(peerId: string, playerName: string): void {
    if (!this.currentRoom) return;

    const player: Player = {
      id: peerId,
      name: playerName,
      role: 'player',
      status: 'connected',
      joinedAt: Date.now(),
      latency: 0,
    };

    this.currentRoom.players.set(peerId, player);
    this.emit('player-joined', { player });

    // Send system message
    this.addSystemMessage(`${playerName} joined the room`);
  }

  /**
   * Handle player leave
   */
  private handlePlayerLeave(playerId: string): void {
    if (!this.currentRoom) return;

    const player = this.currentRoom.players.get(playerId);
    if (!player) return;

    this.currentRoom.players.delete(playerId);

    // Handle host migration
    if (player.role === 'host' && this.currentRoom.players.size > 0) {
      const newHost = Array.from(this.currentRoom.players.values())[0];
      newHost.role = 'host';
      this.currentRoom.hostId = newHost.id;

      if (newHost.id === this.localPlayer?.id) {
        this.registerRoomHandlers();
      }

      this.addSystemMessage(`${newHost.name} is now the host`);
    }

    this.emit('player-left', { player });
    this.addSystemMessage(`${player.name} left the room`);
  }

  /**
   * Handle player ready
   */
  private handlePlayerReady(playerId: string, ready: boolean): void {
    if (!this.currentRoom) return;

    const player = this.currentRoom.players.get(playerId);
    if (!player) return;

    player.status = ready ? 'ready' : 'connected';
    this.currentRoom.players.set(playerId, player);

    this.emit('player-ready', { player, ready });
    this.checkAutoStart();
  }

  /**
   * Handle join request (host only)
   */
  private handleJoinRequest(senderId: string, payload: { [key: string]: unknown }): void {
    if (!this.currentRoom || this.localPlayer?.role !== 'host') return;

    const { playerName, password } = payload;

    // Check room capacity
    if (this.currentRoom.players.size >= this.currentRoom.config.maxPlayers) {
      networkManager.sendToPeer(senderId, {
        type: 'action',
        id: this.generateId(),
        timestamp: Date.now(),
        senderId: networkManager.getLocalId(),
        payload: { type: 'lobby:join-response', accepted: false, reason: 'Room is full' },
        reliable: true,
      });
      return;
    }

    // Check password
    if (this.currentRoom.config.password && password !== this.currentRoom.config.password) {
      networkManager.sendToPeer(senderId, {
        type: 'action',
        id: this.generateId(),
        timestamp: Date.now(),
        senderId: networkManager.getLocalId(),
        payload: { type: 'lobby:join-response', accepted: false, reason: 'Invalid password' },
        reliable: true,
      });
      return;
    }

    // Check late join
    if (this.currentRoom.state === 'in-game' && !this.currentRoom.config.allowLateJoin) {
      networkManager.sendToPeer(senderId, {
        type: 'action',
        id: this.generateId(),
        timestamp: Date.now(),
        senderId: networkManager.getLocalId(),
        payload: { type: 'lobby:join-response', accepted: false, reason: 'Game already in progress' },
        reliable: true,
      });
      return;
    }

    // Accept
    const player: Player = {
      id: senderId,
      name: playerName as string,
      role: 'player',
      status: 'connected',
      joinedAt: Date.now(),
      latency: 0,
    };

    this.currentRoom.players.set(senderId, player);

    networkManager.sendToPeer(senderId, {
      type: 'action',
      id: this.generateId(),
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload: {
        type: 'lobby:join-response',
        accepted: true,
        room: this.getRoomInfo(),
      },
      reliable: true,
    });

    this.emit('player-joined', { player });
  }

  /**
   * Handle game started
   */
  private handleGameStarted(startTime: number): void {
    if (!this.currentRoom) return;

    this.currentRoom.state = 'in-game';
    this.currentRoom.startedAt = startTime;

    for (const player of this.currentRoom.players.values()) {
      player.status = 'playing';
    }

    this.emit('game-started', { room: this.getRoomInfo() });
  }

  /**
   * Handle game ended
   */
  private handleGameEnded(results: unknown): void {
    if (!this.currentRoom) return;

    this.currentRoom.state = 'finished';
    this.currentRoom.endedAt = Date.now();

    for (const player of this.currentRoom.players.values()) {
      player.status = 'connected';
    }

    this.emit('game-ended', { results });
  }

  /**
   * Handle kicked
   */
  private handleKicked(reason?: string): void {
    this.currentRoom = null;
    this.localPlayer = null;
    this.emit('kicked', { reason });
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
    this.emit('chat-message', { message });
  }

  /**
   * Handle settings updated
   */
  private handleSettingsUpdated(settings: RoomConfig): void {
    if (!this.currentRoom) return;

    this.currentRoom.config = settings;
    this.emit('room-updated', { room: this.getRoomInfo() });
  }

  /**
   * Handle team changed
   */
  private handleTeamChanged(playerId: string, team: string): void {
    if (!this.currentRoom) return;

    const player = this.currentRoom.players.get(playerId);
    if (player) {
      player.team = team;
      this.emit('player-updated', { player });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.currentRoom = null;
    this.localPlayer = null;
    this.chatHistory = [];
    this.stopAutoStart();
  }

  /**
   * Register room handlers (host only)
   */
  private registerRoomHandlers(): void {
    networkManager.registerRPC({
      name: 'lobby:join',
      handler: async (params) => {
        const { roomId, playerName: _playerName, password } = params as { roomId: string; playerName: string; password?: string };

        if (!this.currentRoom || this.currentRoom.id !== roomId) {
          return { accepted: false, reason: 'Room not found' };
        }

        // Validation logic here
        if (this.currentRoom.players.size >= this.currentRoom.config.maxPlayers) {
          return { accepted: false, reason: 'Room is full' };
        }

        if (this.currentRoom.config.password && password !== this.currentRoom.config.password) {
          return { accepted: false, reason: 'Invalid password' };
        }

        return { accepted: true, room: this.getRoomInfo() };
      },
    });
  }

  /**
   * Check auto start conditions
   */
  private checkAutoStart(): void {
    if (!this.currentRoom || !this.currentRoom.config.autoStart) return;
    if (this.localPlayer?.role !== 'host') return;

    const allReady = Array.from(this.currentRoom.players.values()).every(
      p => p.status === 'ready' || p.role === 'host'
    );

    if (allReady && this.currentRoom.players.size >= this.currentRoom.config.minPlayers) {
      this.startAutoStart();
    } else {
      this.stopAutoStart();
    }
  }

  /**
   * Start auto start timer
   */
  private startAutoStart(): void {
    if (this.autoStartTimer) return;

    const delay = this.currentRoom?.config.autoStartDelay || 5000;
    this.emit('game-starting', { countdown: delay / 1000 });

    this.autoStartTimer = window.setTimeout(() => {
      this.startGame();
      this.autoStartTimer = null;
    }, delay);
  }

  /**
   * Stop auto start timer
   */
  private stopAutoStart(): void {
    if (this.autoStartTimer) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  /**
   * Broadcast to all players
   */
  private broadcast(payload: unknown): void {
    networkManager.broadcast({
      type: 'action',
      id: this.generateId(),
      timestamp: Date.now(),
      senderId: networkManager.getLocalId(),
      payload,
      reliable: true,
    });
  }

  /**
   * Add system message
   */
  private addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: this.generateId(),
      senderId: 'system',
      senderName: 'System',
      content,
      timestamp: Date.now(),
      type: 'system',
    };

    this.chatHistory.push(message);
    this.emit('chat-message', { message });
  }

  /**
   * Get room info (safe for network)
   */
  private getRoomInfo(): unknown {
    if (!this.currentRoom) return null;

    return {
      id: this.currentRoom.id,
      config: this.currentRoom.config,
      state: this.currentRoom.state,
      hostId: this.currentRoom.hostId,
      players: Object.fromEntries(this.currentRoom.players),
      createdAt: this.currentRoom.createdAt,
      startedAt: this.currentRoom.startedAt,
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate room ID
   */
  private generateRoomId(): string {
    return `room-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }

  /**
   * Add event listener
   */
  on(event: LobbyEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: LobbyEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: LobbyEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Get current room
   */
  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  /**
   * Get local player
   */
  getLocalPlayer(): Player | null {
    return this.localPlayer;
  }

  /**
   * Get chat history
   */
  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Get players
   */
  getPlayers(): Player[] {
    return this.currentRoom ? Array.from(this.currentRoom.players.values()) : [];
  }

  /**
   * Is host
   */
  isHost(): boolean {
    return this.localPlayer?.role === 'host';
  }

  /**
   * Is in room
   */
  isInRoom(): boolean {
    return this.currentRoom !== null;
  }
}

// Singleton instance
export const lobbySystem = new LobbySystemService();
