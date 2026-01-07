/**
 * Network Message Types
 * Protocol definitions for multiplayer communication
 */

export type MessageType =
  | 'welcome'
  | 'ping'
  | 'pong'
  | 'join_lobby'
  | 'leave_lobby'
  | 'lobby_update'
  | 'game_start'
  | 'game_end'
  | 'player_join'
  | 'player_leave'
  | 'player_input'
  | 'state_sync'
  | 'state_delta'
  | 'entity_spawn'
  | 'entity_destroy'
  | 'entity_update'
  | 'rpc_call'
  | 'rpc_response'
  | 'chat'
  | 'error';

export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sequence?: number;
}

// System messages
export interface WelcomeMessage extends BaseMessage {
  type: 'welcome';
  playerId: string;
  sessionId: string;
  serverTime: number;
}

export interface PingMessage extends BaseMessage {
  type: 'ping';
}

export interface PongMessage extends BaseMessage {
  type: 'pong';
  serverTime: number;
}

// Lobby messages
export interface JoinLobbyMessage extends BaseMessage {
  type: 'join_lobby';
  lobbyId: string;
  playerName: string;
  playerData?: Record<string, unknown>;
}

export interface LeaveLobbyMessage extends BaseMessage {
  type: 'leave_lobby';
  lobbyId: string;
}

export interface LobbyUpdateMessage extends BaseMessage {
  type: 'lobby_update';
  lobbyId: string;
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    isReady: boolean;
    data?: Record<string, unknown>;
  }>;
  state: 'waiting' | 'starting' | 'in_game';
  settings?: Record<string, unknown>;
}

// Game state messages
export interface GameStartMessage extends BaseMessage {
  type: 'game_start';
  lobbyId: string;
  seed: number;
  initialState: Record<string, unknown>;
}

export interface GameEndMessage extends BaseMessage {
  type: 'game_end';
  reason: 'completed' | 'aborted' | 'error';
  results?: Record<string, unknown>;
}

export interface PlayerJoinMessage extends BaseMessage {
  type: 'player_join';
  playerId: string;
  playerName: string;
  playerData?: Record<string, unknown>;
}

export interface PlayerLeaveMessage extends BaseMessage {
  type: 'player_leave';
  playerId: string;
  reason?: string;
}

// Input messages
export interface PlayerInputMessage extends BaseMessage {
  type: 'player_input';
  playerId: string;
  frame: number;
  inputs: {
    keys: number; // Bitmask of pressed keys
    mouseX?: number;
    mouseY?: number;
    mouseButtons?: number;
    custom?: Record<string, unknown>;
  };
}

// State synchronization
export interface StateSyncMessage extends BaseMessage {
  type: 'state_sync';
  frame: number;
  entities: Array<{
    id: string;
    ownerId: string;
    components: Record<string, unknown>;
  }>;
  checksum?: number;
}

export interface StateDeltaMessage extends BaseMessage {
  type: 'state_delta';
  frame: number;
  baseFrame: number;
  changes: Array<{
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    components?: Record<string, unknown>;
  }>;
}

// Entity messages
export interface EntitySpawnMessage extends BaseMessage {
  type: 'entity_spawn';
  entityId: string;
  ownerId: string;
  prefab?: string;
  components: Record<string, unknown>;
}

export interface EntityDestroyMessage extends BaseMessage {
  type: 'entity_destroy';
  entityId: string;
}

export interface EntityUpdateMessage extends BaseMessage {
  type: 'entity_update';
  entityId: string;
  components: Record<string, unknown>;
}

// RPC messages
export interface RPCCallMessage extends BaseMessage {
  type: 'rpc_call';
  callId: string;
  method: string;
  args: unknown[];
  target?: 'server' | 'all' | 'others' | string;
}

export interface RPCResponseMessage extends BaseMessage {
  type: 'rpc_response';
  callId: string;
  result?: unknown;
  error?: string;
}

// Chat message
export interface ChatMessage extends BaseMessage {
  type: 'chat';
  senderId: string;
  senderName: string;
  message: string;
  channel?: string;
}

// Error message
export interface ErrorMessage extends BaseMessage {
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}

export type NetworkMessages =
  | WelcomeMessage
  | PingMessage
  | PongMessage
  | JoinLobbyMessage
  | LeaveLobbyMessage
  | LobbyUpdateMessage
  | GameStartMessage
  | GameEndMessage
  | PlayerJoinMessage
  | PlayerLeaveMessage
  | PlayerInputMessage
  | StateSyncMessage
  | StateDeltaMessage
  | EntitySpawnMessage
  | EntityDestroyMessage
  | EntityUpdateMessage
  | RPCCallMessage
  | RPCResponseMessage
  | ChatMessage
  | ErrorMessage;

/**
 * Create a message with timestamp
 */
export function createMessage<T extends MessageType>(
  type: T,
  data: Omit<Extract<NetworkMessages, { type: T }>, 'type' | 'timestamp'>
): Extract<NetworkMessages, { type: T }> {
  return {
    type,
    timestamp: Date.now(),
    ...data,
  } as Extract<NetworkMessages, { type: T }>;
}

/**
 * Parse a message from JSON string
 */
export function parseMessage(data: string): NetworkMessages | null {
  try {
    const message = JSON.parse(data);
    if (!message.type) return null;
    return message as NetworkMessages;
  } catch {
    return null;
  }
}

/**
 * Encode input state to bitmask
 */
export function encodeInputs(keys: {
  up?: boolean;
  down?: boolean;
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  action1?: boolean;
  action2?: boolean;
  action3?: boolean;
}): number {
  let mask = 0;
  if (keys.up) mask |= 1 << 0;
  if (keys.down) mask |= 1 << 1;
  if (keys.left) mask |= 1 << 2;
  if (keys.right) mask |= 1 << 3;
  if (keys.jump) mask |= 1 << 4;
  if (keys.action1) mask |= 1 << 5;
  if (keys.action2) mask |= 1 << 6;
  if (keys.action3) mask |= 1 << 7;
  return mask;
}

/**
 * Decode input bitmask to object
 */
export function decodeInputs(mask: number): {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  action1: boolean;
  action2: boolean;
  action3: boolean;
} {
  return {
    up: (mask & (1 << 0)) !== 0,
    down: (mask & (1 << 1)) !== 0,
    left: (mask & (1 << 2)) !== 0,
    right: (mask & (1 << 3)) !== 0,
    jump: (mask & (1 << 4)) !== 0,
    action1: (mask & (1 << 5)) !== 0,
    action2: (mask & (1 << 6)) !== 0,
    action3: (mask & (1 << 7)) !== 0,
  };
}
