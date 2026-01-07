/**
 * Network Manager
 * Handles WebSocket connections and message routing
 */

import { MessageType, NetworkMessages, createMessage, parseMessage } from './messages';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface NetworkConfig {
  /** WebSocket server URL */
  serverUrl: string;
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
  /** Connection timeout in ms */
  connectionTimeout?: number;
  /** Heartbeat interval in ms */
  heartbeatInterval?: number;
}

export type MessageHandler = (message: NetworkMessages) => void;

export class NetworkManager {
  private ws: WebSocket | null = null;
  private config: Required<NetworkConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private pendingMessages: NetworkMessages[] = [];
  private playerId: string | null = null;
  private sessionId: string | null = null;

  constructor(config: NetworkConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      connectionTimeout: config.connectionTimeout ?? 5000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get player ID (assigned by server)
   */
  getPlayerId(): string | null {
    return this.playerId;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Connect to the server
   */
  connect(sessionId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected' || this.state === 'connecting') {
        resolve();
        return;
      }

      this.state = 'connecting';
      this.sessionId = sessionId || null;

      const url = sessionId
        ? `${this.config.serverUrl}?session=${sessionId}`
        : this.config.serverUrl;

      try {
        this.ws = new WebSocket(url);
      } catch (error) {
        this.state = 'disconnected';
        reject(error);
        return;
      }

      const connectionTimeout = setTimeout(() => {
        if (this.state === 'connecting') {
          this.ws?.close();
          this.state = 'disconnected';
          reject(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.state = 'connected';
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushPendingMessages();
        resolve();
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.handleDisconnect(event);
      };

      this.ws.onerror = (error) => {
        console.error('[NetworkManager] WebSocket error:', error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = 'disconnected';
    this.playerId = null;
    this.sessionId = null;
  }

  /**
   * Send a message to the server
   */
  send(message: NetworkMessages): void {
    if (this.state !== 'connected' || !this.ws) {
      // Queue message for when connected
      this.pendingMessages.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[NetworkManager] Send error:', error);
      this.pendingMessages.push(message);
    }
  }

  /**
   * Register a message handler
   */
  on(type: MessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Remove a message handler
   */
  off(type: MessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  private handleMessage(data: string): void {
    try {
      const message = parseMessage(data);
      if (!message) return;

      // Handle system messages
      if (message.type === 'welcome') {
        this.playerId = (message as any).playerId;
        this.sessionId = (message as any).sessionId;
      }

      // Dispatch to handlers
      const handlers = this.handlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }

      // Dispatch to wildcard handlers
      const wildcardHandlers = this.handlers.get('*' as MessageType);
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => handler(message));
      }
    } catch (error) {
      console.error('[NetworkManager] Message parse error:', error);
    }
  }

  private handleDisconnect(event: CloseEvent): void {
    this.stopHeartbeat();
    this.ws = null;

    if (!this.config.autoReconnect || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.state = 'disconnected';
      return;
    }

    this.state = 'reconnecting';
    this.reconnectAttempts++;

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[NetworkManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.sessionId || undefined).catch(error => {
        console.error('[NetworkManager] Reconnect failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send(createMessage('ping', { timestamp: Date.now() }));
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushPendingMessages(): void {
    const messages = [...this.pendingMessages];
    this.pendingMessages = [];

    for (const message of messages) {
      this.send(message);
    }
  }
}
