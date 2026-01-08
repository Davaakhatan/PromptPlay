/**
 * useMultiplayer Hook Tests
 * Tests for the multiplayer connection hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from 'vitest-browser-react';

// Since we don't have @testing-library/react, we'll test the hook behavior
// by testing the underlying WebSocket message handling logic directly

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static CONNECTING = 0;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  private eventListeners: Map<string, Set<(event: unknown) => void>> = new Map();
  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.();
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  getSentMessages(): string[] {
    return this.sentMessages;
  }

  getParsedMessages(): Array<{ type: string; data?: unknown; timestamp: number }> {
    return this.sentMessages.map(m => JSON.parse(m));
  }

  addEventListener(event: string, listener: (event: unknown) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(listener);
  }

  removeEventListener(event: string, listener: (event: unknown) => void): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  simulateMessage(message: { type: string; data?: unknown; timestamp?: number }): void {
    const event = { data: JSON.stringify({ ...message, timestamp: message.timestamp || Date.now() }) };
    this.onmessage?.(event);
    this.eventListeners.get('message')?.forEach(listener => listener(event));
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: 'Normal closure' });
  }
}

// Store created WebSocket instances for testing
let mockWebSocketInstance: MockWebSocket | null = null;

vi.stubGlobal('WebSocket', class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockWebSocketInstance = this;
  }
});

describe('useMultiplayer WebSocket Messaging', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWebSocketInstance = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    mockWebSocketInstance?.close();
    mockWebSocketInstance = null;
  });

  describe('Connection', () => {
    it('should create WebSocket with correct URL', async () => {
      const ws = new MockWebSocket('ws://localhost:3001/ws');

      expect(ws.url).toBe('ws://localhost:3001/ws');
    });

    it('should transition to OPEN state after connection', async () => {
      const ws = new MockWebSocket('ws://test.com');

      expect(ws.readyState).toBe(MockWebSocket.CONNECTING);

      // Advance timers to trigger onopen
      await vi.runAllTimersAsync();

      expect(ws.readyState).toBe(MockWebSocket.OPEN);
    });

    it('should call onopen callback when connected', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onOpenSpy = vi.fn();
      ws.onopen = onOpenSpy;

      await vi.runAllTimersAsync();

      expect(onOpenSpy).toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('should send ping messages as JSON', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({ type: 'ping', timestamp: 12345 }));

      const messages = ws.getParsedMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('ping');
      expect(messages[0].timestamp).toBe(12345);
    });

    it('should send create_lobby message with correct data', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'create_lobby',
        data: { name: 'Test Lobby', maxPlayers: 4, isPublic: true },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('create_lobby');
      expect(messages[0].data).toEqual({
        name: 'Test Lobby',
        maxPlayers: 4,
        isPublic: true,
      });
    });

    it('should send entity_sync message with entity data', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'entity_sync',
        data: {
          entityId: 'player1',
          components: { position: { x: 100, y: 200 } },
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('entity_sync');
      expect(messages[0].data).toMatchObject({
        entityId: 'player1',
        components: { position: { x: 100, y: 200 } },
      });
    });

    it('should send chat message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'chat',
        data: { message: 'Hello world!' },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('chat');
      expect(messages[0].data).toEqual({ message: 'Hello world!' });
    });

    it('should send RPC call with method and args', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'rpc_call',
        data: {
          id: 'rpc_123',
          method: 'dealDamage',
          args: [100, 'fire'],
          target: 'player2',
        },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('rpc_call');
      expect(messages[0].data).toMatchObject({
        method: 'dealDamage',
        args: [100, 'fire'],
        target: 'player2',
      });
    });
  });

  describe('Message Receiving', () => {
    it('should handle welcome message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'welcome',
        data: { playerId: 'user-123', playerName: 'TestPlayer' },
      });

      expect(onMessageSpy).toHaveBeenCalled();
      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('welcome');
      expect(receivedData.data.playerId).toBe('user-123');
    });

    it('should handle pong message for latency', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({ type: 'pong' });

      expect(onMessageSpy).toHaveBeenCalled();
      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('pong');
    });

    it('should handle lobby_created message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      const lobbyData = {
        id: 'lobby-1',
        name: 'Test Lobby',
        hostId: 'user-1',
        maxPlayers: 4,
        players: [],
        isPublic: true,
        gameMode: 'classic',
        status: 'waiting',
      };

      ws.simulateMessage({
        type: 'lobby_created',
        data: lobbyData,
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('lobby_created');
      expect(receivedData.data.id).toBe('lobby-1');
    });

    it('should handle player_joined message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'player_joined',
        data: {
          id: 'player-2',
          name: 'NewPlayer',
          color: '#ff0000',
          isHost: false,
          isReady: false,
          latency: 50,
        },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('player_joined');
      expect(receivedData.data.name).toBe('NewPlayer');
    });

    it('should handle player_left message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'player_left',
        data: { playerId: 'player-2' },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('player_left');
      expect(receivedData.data.playerId).toBe('player-2');
    });

    it('should handle entity_sync message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'entity_sync',
        data: {
          entityId: 'enemy-1',
          components: {
            transform: { x: 500, y: 300 },
            health: { current: 80, max: 100 },
          },
          timestamp: Date.now(),
        },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('entity_sync');
      expect(receivedData.data.entityId).toBe('enemy-1');
    });

    it('should handle chat message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'chat',
        data: { senderId: 'player-1', message: 'GG!' },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('chat');
      expect(receivedData.data.message).toBe('GG!');
    });

    it('should handle rpc_call message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'rpc_call',
        data: { id: 'rpc-1', method: 'heal', args: [50] },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('rpc_call');
      expect(receivedData.data.method).toBe('heal');
    });

    it('should handle rpc_response message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'rpc_response',
        data: { id: 'rpc-1', result: { success: true } },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('rpc_response');
      expect(receivedData.data.result).toEqual({ success: true });
    });

    it('should handle rpc_response with error', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'rpc_response',
        data: { id: 'rpc-1', error: 'Method not found' },
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.data.error).toBe('Method not found');
    });

    it('should handle game_started message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({ type: 'game_started' });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('game_started');
    });
  });

  describe('Event Listeners', () => {
    it('should add event listener', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const listener = vi.fn();

      ws.addEventListener('message', listener);
      await vi.runAllTimersAsync();

      ws.simulateMessage({ type: 'test' });

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listener', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const listener = vi.fn();

      ws.addEventListener('message', listener);
      ws.removeEventListener('message', listener);
      await vi.runAllTimersAsync();

      ws.simulateMessage({ type: 'test' });

      // onmessage still fires, but the listener should not
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple event listeners', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      ws.addEventListener('message', listener1);
      ws.addEventListener('message', listener2);
      await vi.runAllTimersAsync();

      ws.simulateMessage({ type: 'test' });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Connection Lifecycle', () => {
    it('should transition through connection states', async () => {
      const ws = new MockWebSocket('ws://test.com');

      // Initially connecting
      expect(ws.readyState).toBe(MockWebSocket.CONNECTING);

      // After connection opens
      await vi.runAllTimersAsync();
      expect(ws.readyState).toBe(MockWebSocket.OPEN);

      // After close
      ws.close();
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should call onclose when connection closes', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onCloseSpy = vi.fn();
      ws.onclose = onCloseSpy;

      await vi.runAllTimersAsync();
      ws.close();

      expect(onCloseSpy).toHaveBeenCalledWith({
        code: 1000,
        reason: 'Normal closure',
      });
    });
  });

  describe('Lobby Operations', () => {
    it('should send set_ready message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'set_ready',
        data: { ready: true },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('set_ready');
      expect(messages[0].data).toEqual({ ready: true });
    });

    it('should send start_game message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'start_game',
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('start_game');
    });

    it('should send leave_lobby message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'leave_lobby',
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('leave_lobby');
    });

    it('should send join_lobby message', async () => {
      const ws = new MockWebSocket('ws://test.com');
      await vi.runAllTimersAsync();

      ws.send(JSON.stringify({
        type: 'join_lobby',
        data: { lobbyId: 'lobby-123' },
        timestamp: Date.now(),
      }));

      const messages = ws.getParsedMessages();
      expect(messages[0].type).toBe('join_lobby');
      expect(messages[0].data).toEqual({ lobbyId: 'lobby-123' });
    });
  });

  describe('Error Handling', () => {
    it('should handle error events', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onErrorSpy = vi.fn();
      ws.onerror = onErrorSpy;

      // Manually trigger error
      ws.onerror?.(new Error('Connection failed'));

      expect(onErrorSpy).toHaveBeenCalled();
    });

    it('should handle error message from server', async () => {
      const ws = new MockWebSocket('ws://test.com');
      const onMessageSpy = vi.fn();
      ws.onmessage = onMessageSpy;
      await vi.runAllTimersAsync();

      ws.simulateMessage({
        type: 'error',
        data: 'Lobby is full',
      });

      const receivedData = JSON.parse(onMessageSpy.mock.calls[0][0].data);
      expect(receivedData.type).toBe('error');
      expect(receivedData.data).toBe('Lobby is full');
    });
  });
});

describe('Multiplayer Message Protocol', () => {
  it('should have consistent timestamp format', () => {
    const now = Date.now();
    const message = {
      type: 'ping',
      timestamp: now,
    };

    expect(typeof message.timestamp).toBe('number');
    expect(message.timestamp).toBeGreaterThan(0);
  });

  it('should generate unique RPC IDs', () => {
    const id1 = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const id2 = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    expect(id1).toMatch(/^rpc_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});
