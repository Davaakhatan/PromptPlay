/**
 * Network Manager Service
 * Core networking infrastructure using WebSocket and WebRTC
 */

// Connection state
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Network message types
export type MessageType =
  | 'ping'
  | 'pong'
  | 'join'
  | 'leave'
  | 'state'
  | 'action'
  | 'chat'
  | 'rpc'
  | 'sync'
  | 'error';

// Network message
export interface NetworkMessage {
  type: MessageType;
  id: string;
  timestamp: number;
  senderId: string;
  payload: unknown;
  reliable?: boolean;
}

// Peer connection info
export interface PeerConnection {
  id: string;
  name: string;
  state: ConnectionState;
  latency: number;
  dataChannel: RTCDataChannel | null;
  peerConnection: RTCPeerConnection | null;
  lastSeen: number;
}

// Network configuration
export interface NetworkConfig {
  serverUrl: string;
  iceServers: RTCIceServer[];
  maxRetries: number;
  retryDelay: number;
  pingInterval: number;
  timeout: number;
  maxPeers: number;
  reliableChannel: boolean;
  unreliableChannel: boolean;
}

// Network statistics
export interface NetworkStats {
  connectionState: ConnectionState;
  latency: number;
  packetsSent: number;
  packetsReceived: number;
  bytesent: number;
  bytesReceived: number;
  packetsLost: number;
  peersConnected: number;
  uptime: number;
}

// RPC definition
export interface RPCDefinition {
  name: string;
  handler: (params: unknown, senderId: string) => Promise<unknown>;
  validate?: (params: unknown) => boolean;
}

// Event types
export type NetworkEvent =
  | 'connected'
  | 'disconnected'
  | 'peer-joined'
  | 'peer-left'
  | 'message'
  | 'state-changed'
  | 'error';

// Default configuration
const DEFAULT_CONFIG: NetworkConfig = {
  serverUrl: 'wss://localhost:8080',
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  maxRetries: 5,
  retryDelay: 2000,
  pingInterval: 5000,
  timeout: 30000,
  maxPeers: 16,
  reliableChannel: true,
  unreliableChannel: true,
};

class NetworkManagerService {
  private config: NetworkConfig = { ...DEFAULT_CONFIG };
  private socket: WebSocket | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private localId: string = '';
  private localName: string = 'Player';
  private roomId: string = '';

  private connectionState: ConnectionState = 'disconnected';
  private retryCount: number = 0;
  private pingTimer: number | null = null;
  private connectionStartTime: number = 0;

  private stats: NetworkStats = {
    connectionState: 'disconnected',
    latency: 0,
    packetsSent: 0,
    packetsReceived: 0,
    bytesent: 0,
    bytesReceived: 0,
    packetsLost: 0,
    peersConnected: 0,
    uptime: 0,
  };

  // Event listeners
  private eventListeners: Map<NetworkEvent, Set<(data: unknown) => void>> = new Map();

  // RPC handlers
  private rpcHandlers: Map<string, RPCDefinition> = new Map();

  // Message queue for offline messages
  private messageQueue: NetworkMessage[] = [];

  /**
   * Initialize network manager
   */
  initialize(config?: Partial<NetworkConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.localId = this.generateId();
  }

  /**
   * Connect to signaling server
   */
  async connect(serverUrl?: string): Promise<boolean> {
    if (serverUrl) {
      this.config.serverUrl = serverUrl;
    }

    if (this.connectionState === 'connected') {
      return true;
    }

    this.setConnectionState('connecting');

    try {
      return await this.createWebSocketConnection();
    } catch (error) {
      console.error('Connection failed:', error);
      this.setConnectionState('error');
      return false;
    }
  }

  /**
   * Create WebSocket connection
   */
  private createWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.serverUrl);

        this.socket.onopen = () => {
          this.setConnectionState('connected');
          this.connectionStartTime = Date.now();
          this.retryCount = 0;
          this.startPingInterval();
          this.flushMessageQueue();
          this.emit('connected', { id: this.localId });
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onclose = () => {
          this.handleDisconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        // Timeout
        setTimeout(() => {
          if (this.connectionState === 'connecting') {
            this.socket?.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopPingInterval();

    // Close all peer connections
    for (const peer of this.peers.values()) {
      peer.dataChannel?.close();
      peer.peerConnection?.close();
    }
    this.peers.clear();

    // Close WebSocket
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.roomId = '';
    this.setConnectionState('disconnected');
    this.emit('disconnected', {});
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.setConnectionState('disconnected');
    this.stopPingInterval();

    // Attempt reconnection
    if (this.retryCount < this.config.maxRetries) {
      this.setConnectionState('reconnecting');
      setTimeout(() => {
        this.retryCount++;
        this.connect();
      }, this.config.retryDelay * Math.pow(2, this.retryCount));
    } else {
      this.emit('disconnected', { reason: 'max_retries' });
    }
  }

  /**
   * Join a room
   */
  async joinRoom(roomId: string, playerName?: string): Promise<boolean> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to server');
    }

    this.roomId = roomId;
    if (playerName) {
      this.localName = playerName;
    }

    this.sendMessage({
      type: 'join',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      senderId: this.localId,
      payload: {
        roomId,
        playerName: this.localName,
      },
      reliable: true,
    });

    return true;
  }

  /**
   * Leave current room
   */
  leaveRoom(): void {
    if (!this.roomId) return;

    this.sendMessage({
      type: 'leave',
      id: this.generateMessageId(),
      timestamp: Date.now(),
      senderId: this.localId,
      payload: { roomId: this.roomId },
      reliable: true,
    });

    // Close peer connections
    for (const peer of this.peers.values()) {
      peer.dataChannel?.close();
      peer.peerConnection?.close();
    }
    this.peers.clear();

    this.roomId = '';
  }

  /**
   * Send message to server or peers
   */
  sendMessage(message: NetworkMessage): void {
    if (this.connectionState !== 'connected') {
      if (message.reliable) {
        this.messageQueue.push(message);
      }
      return;
    }

    const data = JSON.stringify(message);
    this.stats.packetsSent++;
    this.stats.bytesent += data.length;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
  }

  /**
   * Send to specific peer via WebRTC
   */
  sendToPeer(peerId: string, message: NetworkMessage): boolean {
    const peer = this.peers.get(peerId);
    if (!peer?.dataChannel || peer.dataChannel.readyState !== 'open') {
      return false;
    }

    const data = JSON.stringify(message);
    peer.dataChannel.send(data);
    this.stats.packetsSent++;
    this.stats.bytesent += data.length;
    return true;
  }

  /**
   * Broadcast to all peers
   */
  broadcast(message: NetworkMessage): void {
    for (const [peerId] of this.peers) {
      this.sendToPeer(peerId, message);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: NetworkMessage = JSON.parse(data);
      this.stats.packetsReceived++;
      this.stats.bytesReceived += data.length;

      switch (message.type) {
        case 'ping':
          this.handlePing(message);
          break;
        case 'pong':
          this.handlePong(message);
          break;
        case 'join':
          this.handlePeerJoin(message);
          break;
        case 'leave':
          this.handlePeerLeave(message);
          break;
        case 'rpc':
          this.handleRPC(message);
          break;
        case 'state':
        case 'action':
        case 'chat':
        case 'sync':
          this.emit('message', message);
          break;
        case 'error':
          console.error('Server error:', message.payload);
          this.emit('error', message.payload);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle ping
   */
  private handlePing(message: NetworkMessage): void {
    this.sendMessage({
      type: 'pong',
      id: message.id,
      timestamp: Date.now(),
      senderId: this.localId,
      payload: { originalTimestamp: message.timestamp },
    });
  }

  /**
   * Handle pong
   */
  private handlePong(message: NetworkMessage): void {
    const payload = message.payload as { originalTimestamp: number };
    this.stats.latency = Date.now() - payload.originalTimestamp;
  }

  /**
   * Handle peer join
   */
  private async handlePeerJoin(message: NetworkMessage): Promise<void> {
    const payload = message.payload as { peerId: string; playerName: string; offer?: RTCSessionDescriptionInit };

    if (payload.peerId === this.localId) return;

    // Create or get peer
    let peer = this.peers.get(payload.peerId);
    if (!peer) {
      peer = await this.createPeerConnection(payload.peerId, payload.playerName);
      this.peers.set(payload.peerId, peer);
      this.emit('peer-joined', { peerId: payload.peerId, playerName: payload.playerName });
    }

    // Handle WebRTC signaling
    if (payload.offer && peer.peerConnection) {
      await peer.peerConnection.setRemoteDescription(payload.offer);
      const answer = await peer.peerConnection.createAnswer();
      await peer.peerConnection.setLocalDescription(answer);

      this.sendMessage({
        type: 'join',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: {
          peerId: payload.peerId,
          answer: peer.peerConnection.localDescription,
        },
        reliable: true,
      });
    }

    this.updatePeerStats();
  }

  /**
   * Handle peer leave
   */
  private handlePeerLeave(message: NetworkMessage): void {
    const payload = message.payload as { peerId: string };
    const peer = this.peers.get(payload.peerId);

    if (peer) {
      peer.dataChannel?.close();
      peer.peerConnection?.close();
      this.peers.delete(payload.peerId);
      this.emit('peer-left', { peerId: payload.peerId });
    }

    this.updatePeerStats();
  }

  /**
   * Handle RPC call
   */
  private async handleRPC(message: NetworkMessage): Promise<void> {
    const payload = message.payload as { method: string; params: unknown; requestId: string };
    const handler = this.rpcHandlers.get(payload.method);

    if (!handler) {
      this.sendMessage({
        type: 'rpc',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: {
          requestId: payload.requestId,
          error: `Method '${payload.method}' not found`,
        },
        reliable: true,
      });
      return;
    }

    try {
      if (handler.validate && !handler.validate(payload.params)) {
        throw new Error('Invalid parameters');
      }

      const result = await handler.handler(payload.params, message.senderId);

      this.sendMessage({
        type: 'rpc',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: {
          requestId: payload.requestId,
          result,
        },
        reliable: true,
      });
    } catch (error) {
      this.sendMessage({
        type: 'rpc',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: {
          requestId: payload.requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        reliable: true,
      });
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private async createPeerConnection(peerId: string, playerName: string): Promise<PeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    const peer: PeerConnection = {
      id: peerId,
      name: playerName,
      state: 'connecting',
      latency: 0,
      dataChannel: null,
      peerConnection,
      lastSeen: Date.now(),
    };

    // Create data channels
    if (this.config.reliableChannel) {
      const reliableChannel = peerConnection.createDataChannel('reliable', {
        ordered: true,
      });
      this.setupDataChannel(peer, reliableChannel);
    }

    if (this.config.unreliableChannel) {
      const unreliableChannel = peerConnection.createDataChannel('unreliable', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.setupDataChannel(peer, unreliableChannel);
    }

    // Handle incoming data channels
    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(peer, event.channel);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendMessage({
          type: 'join',
          id: this.generateMessageId(),
          timestamp: Date.now(),
          senderId: this.localId,
          payload: {
            peerId,
            candidate: event.candidate,
          },
          reliable: true,
        });
      }
    };

    // Handle connection state
    peerConnection.onconnectionstatechange = () => {
      switch (peerConnection.connectionState) {
        case 'connected':
          peer.state = 'connected';
          break;
        case 'disconnected':
        case 'failed':
          peer.state = 'disconnected';
          break;
        case 'connecting':
          peer.state = 'connecting';
          break;
      }
    };

    return peer;
  }

  /**
   * Setup data channel
   */
  private setupDataChannel(peer: PeerConnection, channel: RTCDataChannel): void {
    peer.dataChannel = channel;

    channel.onopen = () => {
      peer.state = 'connected';
    };

    channel.onclose = () => {
      peer.state = 'disconnected';
    };

    channel.onmessage = (event) => {
      this.handleMessage(event.data);
      peer.lastSeen = Date.now();
    };

    channel.onerror = (error) => {
      console.error(`Data channel error for peer ${peer.id}:`, error);
      peer.state = 'error';
    };
  }

  /**
   * Register RPC handler
   */
  registerRPC(definition: RPCDefinition): void {
    this.rpcHandlers.set(definition.name, definition);
  }

  /**
   * Unregister RPC handler
   */
  unregisterRPC(name: string): void {
    this.rpcHandlers.delete(name);
  }

  /**
   * Call RPC on server or peer
   */
  async callRPC<T>(method: string, params: unknown, targetId?: string): Promise<T> {
    const requestId = this.generateMessageId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('RPC timeout'));
      }, this.config.timeout);

      // Listen for response
      const handler = (message: unknown) => {
        const msg = message as NetworkMessage;
        if (msg.type === 'rpc') {
          const payload = msg.payload as { requestId: string; result?: T; error?: string };
          if (payload.requestId === requestId) {
            clearTimeout(timeout);
            this.off('message', handler);

            if (payload.error) {
              reject(new Error(payload.error));
            } else {
              resolve(payload.result as T);
            }
          }
        }
      };

      this.on('message', handler);

      // Send request
      const message: NetworkMessage = {
        type: 'rpc',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: { method, params, requestId },
        reliable: true,
      };

      if (targetId) {
        this.sendToPeer(targetId, message);
      } else {
        this.sendMessage(message);
      }
    });
  }

  /**
   * Add event listener
   */
  on(event: NetworkEvent, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: NetworkEvent, callback: (data: unknown) => void): void {
    this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: NetworkEvent, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  /**
   * Set connection state
   */
  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.stats.connectionState = state;
    this.emit('state-changed', { state });
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingTimer = window.setInterval(() => {
      this.sendMessage({
        type: 'ping',
        id: this.generateMessageId(),
        timestamp: Date.now(),
        senderId: this.localId,
        payload: {},
      });
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Flush message queue
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  /**
   * Update peer stats
   */
  private updatePeerStats(): void {
    this.stats.peersConnected = this.peers.size;
    this.stats.uptime = Date.now() - this.connectionStartTime;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get local ID
   */
  getLocalId(): string {
    return this.localId;
  }

  /**
   * Get room ID
   */
  getRoomId(): string {
    return this.roomId;
  }

  /**
   * Get peers
   */
  getPeers(): PeerConnection[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get peer by ID
   */
  getPeer(peerId: string): PeerConnection | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get statistics
   */
  getStats(): NetworkStats {
    this.updatePeerStats();
    return { ...this.stats };
  }

  /**
   * Get configuration
   */
  getConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.rpcHandlers.clear();
    this.messageQueue = [];
  }
}

// Singleton instance
export const networkManager = new NetworkManagerService();
