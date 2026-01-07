/**
 * useMultiplayer Hook
 * Connects the multiplayer package to game runtime
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameSpec } from '@promptplay/shared-types';

// Multiplayer connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Player info
interface Player {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  latency: number;
}

// Lobby info
interface Lobby {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  players: Player[];
  isPublic: boolean;
  gameMode: string;
  status: 'waiting' | 'starting' | 'in_game' | 'finished';
}

// Network message types
interface NetworkMessage {
  type: string;
  data?: unknown;
  timestamp: number;
  senderId?: string;
}

// Entity sync data
interface EntitySyncData {
  entityId: string;
  components: Record<string, unknown>;
  timestamp: number;
}

interface UseMultiplayerOptions {
  serverUrl?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseMultiplayerResult {
  // Connection
  connectionState: ConnectionState;
  connect: (serverUrl?: string) => Promise<void>;
  disconnect: () => void;

  // Lobby
  currentLobby: Lobby | null;
  createLobby: (name: string, maxPlayers: number, isPublic: boolean) => Promise<Lobby>;
  joinLobby: (lobbyId: string) => Promise<void>;
  leaveLobby: () => void;
  setReady: (ready: boolean) => void;
  startGame: () => void;

  // Players
  localPlayer: Player | null;
  players: Player[];

  // State sync
  syncEntity: (entityId: string, components: Record<string, unknown>) => void;
  onEntitySync: (callback: (data: EntitySyncData) => void) => () => void;

  // RPC
  callRpc: (method: string, args: unknown[], target?: string) => Promise<unknown>;
  registerRpc: (method: string, handler: (...args: unknown[]) => unknown) => () => void;

  // Chat
  sendChat: (message: string) => void;
  onChat: (callback: (senderId: string, message: string) => void) => () => void;

  // Stats
  latency: number;
  packetLoss: number;
}

const DEFAULT_OPTIONS: Required<UseMultiplayerOptions> = {
  serverUrl: 'ws://localhost:3001/ws',
  autoReconnect: true,
  reconnectInterval: 2000,
  maxReconnectAttempts: 5,
};

export function useMultiplayer(options: UseMultiplayerOptions = {}): UseMultiplayerResult {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentLobby, setCurrentLobby] = useState<Lobby | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [latency, setLatency] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTimeRef = useRef(0);

  // Message handlers
  const entitySyncCallbacksRef = useRef<Set<(data: EntitySyncData) => void>>(new Set());
  const chatCallbacksRef = useRef<Set<(senderId: string, message: string) => void>>(new Set());
  const rpcHandlersRef = useRef<Map<string, (...args: unknown[]) => unknown>>(new Map());
  const pendingRpcsRef = useRef<Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>>(new Map());

  // Send message helper
  const sendMessage = useCallback((message: NetworkMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data) as NetworkMessage;

      switch (message.type) {
        case 'welcome':
          const welcomeData = message.data as { playerId: string; playerName: string };
          setLocalPlayer({
            id: welcomeData.playerId,
            name: welcomeData.playerName,
            color: '#3B82F6',
            isHost: false,
            isReady: false,
            latency: 0,
          });
          setConnectionState('connected');
          reconnectAttemptsRef.current = 0;
          break;

        case 'pong':
          const pongLatency = Date.now() - lastPingTimeRef.current;
          setLatency(pongLatency);
          break;

        case 'lobby_created':
        case 'lobby_joined':
          setCurrentLobby(message.data as Lobby);
          break;

        case 'lobby_updated':
          setCurrentLobby(message.data as Lobby);
          setPlayers((message.data as Lobby).players);
          break;

        case 'lobby_left':
          setCurrentLobby(null);
          setPlayers([]);
          break;

        case 'player_joined':
          const joinedPlayer = message.data as Player;
          setPlayers(prev => [...prev, joinedPlayer]);
          break;

        case 'player_left':
          const leftPlayerId = (message.data as { playerId: string }).playerId;
          setPlayers(prev => prev.filter(p => p.id !== leftPlayerId));
          break;

        case 'entity_sync':
          const syncData = message.data as EntitySyncData;
          entitySyncCallbacksRef.current.forEach(cb => cb(syncData));
          break;

        case 'chat':
          const chatData = message.data as { senderId: string; message: string };
          chatCallbacksRef.current.forEach(cb => cb(chatData.senderId, chatData.message));
          break;

        case 'rpc_call':
          const rpcData = message.data as { id: string; method: string; args: unknown[] };
          const handler = rpcHandlersRef.current.get(rpcData.method);
          if (handler) {
            try {
              const result = handler(...rpcData.args);
              sendMessage({
                type: 'rpc_response',
                data: { id: rpcData.id, result },
                timestamp: Date.now(),
              });
            } catch (error) {
              sendMessage({
                type: 'rpc_response',
                data: { id: rpcData.id, error: (error as Error).message },
                timestamp: Date.now(),
              });
            }
          }
          break;

        case 'rpc_response':
          const responseData = message.data as { id: string; result?: unknown; error?: string };
          const pending = pendingRpcsRef.current.get(responseData.id);
          if (pending) {
            pendingRpcsRef.current.delete(responseData.id);
            if (responseData.error) {
              pending.reject(new Error(responseData.error));
            } else {
              pending.resolve(responseData.result);
            }
          }
          break;

        case 'game_started':
          if (currentLobby) {
            setCurrentLobby({ ...currentLobby, status: 'in_game' });
          }
          break;

        case 'error':
          console.error('[Multiplayer] Server error:', message.data);
          break;
      }
    } catch (error) {
      console.error('[Multiplayer] Failed to parse message:', error);
    }
  }, [currentLobby, sendMessage]);

  // Connect to server
  const connect = useCallback(async (serverUrl?: string) => {
    const url = serverUrl || config.serverUrl;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionState('connecting');

    return new Promise<void>((resolve, reject) => {
      try {
        wsRef.current = new WebSocket(url);

        wsRef.current.onopen = () => {
          // Start ping interval
          pingIntervalRef.current = setInterval(() => {
            lastPingTimeRef.current = Date.now();
            sendMessage({ type: 'ping', timestamp: Date.now() });
          }, 5000);

          resolve();
        };

        wsRef.current.onmessage = handleMessage;

        wsRef.current.onclose = () => {
          setConnectionState('disconnected');
          clearInterval(pingIntervalRef.current!);

          // Auto reconnect
          if (config.autoReconnect && reconnectAttemptsRef.current < config.maxReconnectAttempts) {
            setConnectionState('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect(url);
            }, config.reconnectInterval);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('[Multiplayer] WebSocket error:', error);
          setConnectionState('error');
          reject(error);
        };
      } catch (error) {
        setConnectionState('error');
        reject(error);
      }
    });
  }, [config, handleMessage, sendMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionState('disconnected');
    setCurrentLobby(null);
    setLocalPlayer(null);
    setPlayers([]);
  }, []);

  // Create lobby
  const createLobby = useCallback(async (name: string, maxPlayers: number, isPublic: boolean): Promise<Lobby> => {
    return new Promise((resolve, reject) => {
      const handleLobbyCreated = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'lobby_created') {
          wsRef.current?.removeEventListener('message', handleLobbyCreated);
          resolve(message.data as Lobby);
        } else if (message.type === 'error') {
          wsRef.current?.removeEventListener('message', handleLobbyCreated);
          reject(new Error(message.data));
        }
      };

      wsRef.current?.addEventListener('message', handleLobbyCreated);
      sendMessage({
        type: 'create_lobby',
        data: { name, maxPlayers, isPublic },
        timestamp: Date.now(),
      });
    });
  }, [sendMessage]);

  // Join lobby
  const joinLobby = useCallback(async (lobbyId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const handleLobbyJoined = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'lobby_joined') {
          wsRef.current?.removeEventListener('message', handleLobbyJoined);
          resolve();
        } else if (message.type === 'error') {
          wsRef.current?.removeEventListener('message', handleLobbyJoined);
          reject(new Error(message.data));
        }
      };

      wsRef.current?.addEventListener('message', handleLobbyJoined);
      sendMessage({
        type: 'join_lobby',
        data: { lobbyId },
        timestamp: Date.now(),
      });
    });
  }, [sendMessage]);

  // Leave lobby
  const leaveLobby = useCallback(() => {
    sendMessage({ type: 'leave_lobby', timestamp: Date.now() });
    setCurrentLobby(null);
    setPlayers([]);
  }, [sendMessage]);

  // Set ready
  const setReady = useCallback((ready: boolean) => {
    sendMessage({
      type: 'set_ready',
      data: { ready },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  // Start game (host only)
  const startGame = useCallback(() => {
    sendMessage({ type: 'start_game', timestamp: Date.now() });
  }, [sendMessage]);

  // Sync entity state
  const syncEntity = useCallback((entityId: string, components: Record<string, unknown>) => {
    sendMessage({
      type: 'entity_sync',
      data: { entityId, components, timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  // Subscribe to entity sync
  const onEntitySync = useCallback((callback: (data: EntitySyncData) => void) => {
    entitySyncCallbacksRef.current.add(callback);
    return () => {
      entitySyncCallbacksRef.current.delete(callback);
    };
  }, []);

  // Call RPC
  const callRpc = useCallback(async (method: string, args: unknown[], target?: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const id = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      pendingRpcsRef.current.set(id, { resolve, reject });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingRpcsRef.current.has(id)) {
          pendingRpcsRef.current.delete(id);
          reject(new Error('RPC timeout'));
        }
      }, 10000);

      sendMessage({
        type: 'rpc_call',
        data: { id, method, args, target },
        timestamp: Date.now(),
      });
    });
  }, [sendMessage]);

  // Register RPC handler
  const registerRpc = useCallback((method: string, handler: (...args: unknown[]) => unknown) => {
    rpcHandlersRef.current.set(method, handler);
    return () => {
      rpcHandlersRef.current.delete(method);
    };
  }, []);

  // Send chat message
  const sendChat = useCallback((message: string) => {
    sendMessage({
      type: 'chat',
      data: { message },
      timestamp: Date.now(),
    });
  }, [sendMessage]);

  // Subscribe to chat
  const onChat = useCallback((callback: (senderId: string, message: string) => void) => {
    chatCallbacksRef.current.add(callback);
    return () => {
      chatCallbacksRef.current.delete(callback);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    currentLobby,
    createLobby,
    joinLobby,
    leaveLobby,
    setReady,
    startGame,
    localPlayer,
    players,
    syncEntity,
    onEntitySync,
    callRpc,
    registerRpc,
    sendChat,
    onChat,
    latency,
    packetLoss,
  };
}

export default useMultiplayer;
