/**
 * CollaborationService Tests
 * Tests for real-time collaboration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameSpec } from '@promptplay/shared-types';
import {
  CollaborationService,
  generateCollaboratorColor,
  type Collaborator,
  type CollaborationEvent,
} from '../../src/services/CollaborationService';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  private sentMessages: Array<{ type: string; payload: unknown }> = [];

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data));
  }

  getSentMessages(): Array<{ type: string; payload: unknown }> {
    return this.sentMessages;
  }

  simulateMessage(type: string, payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify({ type, payload }) });
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: 'Normal closure' });
  }
}

vi.stubGlobal('WebSocket', MockWebSocket);

// Mock GameSpec for testing
const createMockGameSpec = (title = 'Test Game'): GameSpec => ({
  version: '1.0',
  metadata: {
    title,
    genre: 'platformer',
    description: 'Test game',
  },
  config: {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 },
  },
  entities: [],
  systems: [],
});

describe('CollaborationService', () => {
  let service: CollaborationService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new CollaborationService();
  });

  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with user info', () => {
      service.initialize('user-123', 'Test User');

      // Service should be configured but not connected
      expect(service.isConnected()).toBe(false);
    });

    it('should configure with custom settings', () => {
      service.configure({
        serverUrl: 'wss://test.example.com',
        demoMode: false,
      });

      // Configuration should be stored
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Demo Mode Connection', () => {
    it('should connect in demo mode without a server URL', async () => {
      service.initialize('user-123', 'Test User');

      const result = await service.connect('project-1');

      expect(result.success).toBe(true);
      expect(service.isConnected()).toBe(true);
    });

    it('should return error if not initialized', async () => {
      const result = await service.connect('project-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not initialized');
    });

    it('should add current user as collaborator in demo mode', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const collaborators = service.getCollaborators();

      expect(collaborators).toHaveLength(1);
      expect(collaborators[0].id).toBe('user-123');
      expect(collaborators[0].name).toBe('You');
    });

    it('should simulate demo collaborator joining after delay', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      // Advance time for demo collaborator to join
      vi.advanceTimersByTime(2500);

      const collaborators = service.getCollaborators();

      expect(collaborators).toHaveLength(2);
      expect(collaborators.some(c => c.name === 'Alice')).toBe(true);
    });

    it('should provide demo versions', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const versions = service.getVersions();

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].name).toBeDefined();
    });
  });

  describe('Disconnect', () => {
    it('should clear state on disconnect', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      expect(service.isConnected()).toBe(true);

      service.disconnect();

      expect(service.isConnected()).toBe(false);
      expect(service.getCollaborators()).toHaveLength(0);
    });

    it('should stop demo simulation on disconnect', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      // Advance to add demo collaborator
      vi.advanceTimersByTime(2500);

      const listener = vi.fn();
      service.subscribe(listener);

      service.disconnect();
      listener.mockClear();

      // Advance time - should not receive cursor events
      vi.advanceTimersByTime(5000);

      // No events should fire after disconnect
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to events', async () => {
      const listener = vi.fn();
      service.initialize('user-123', 'Test User');
      service.subscribe(listener);
      await service.connect('project-1');

      // Advance to trigger demo collaborator join
      vi.advanceTimersByTime(2500);

      expect(listener).toHaveBeenCalled();
      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0] as CollaborationEvent;
      expect(lastCall.type).toBe('user-joined');
    });

    it('should unsubscribe from events', async () => {
      const listener = vi.fn();
      service.initialize('user-123', 'Test User');
      const unsubscribe = service.subscribe(listener);
      await service.connect('project-1');

      unsubscribe();
      listener.mockClear();

      vi.advanceTimersByTime(2500);

      // Should not be called after unsubscribe
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Cursor Updates', () => {
    it('should update cursor position', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      service.updateCursor(100, 200);

      const collaborators = service.getCollaborators();
      const user = collaborators.find(c => c.id === 'user-123');

      expect(user?.cursor).toEqual({ x: 100, y: 200 });
    });

    it('should not update cursor if not initialized', () => {
      // Should not throw
      expect(() => service.updateCursor(100, 200)).not.toThrow();
    });
  });

  describe('Selection Updates', () => {
    it('should update selection and emit event', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const listener = vi.fn();
      service.subscribe(listener);
      listener.mockClear();

      service.updateSelection(['entity1', 'entity2']);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'selection-changed',
          userId: 'user-123',
          selection: ['entity1', 'entity2'],
        })
      );
    });

    it('should store selection in collaborator', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      service.updateSelection(['entity1']);

      const collaborators = service.getCollaborators();
      const user = collaborators.find(c => c.id === 'user-123');

      expect(user?.selection).toEqual(['entity1']);
    });
  });

  describe('Operations', () => {
    it('should send operation and emit event', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const listener = vi.fn();
      service.subscribe(listener);
      listener.mockClear();

      service.sendOperation({
        type: 'update',
        path: '/entities/0/name',
        value: 'newName',
        previousValue: 'oldName',
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'operation',
          operation: expect.objectContaining({
            type: 'update',
            path: '/entities/0/name',
            userId: 'user-123',
          }),
        })
      );
    });

    it('should generate operation ID and timestamp', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const listener = vi.fn();
      service.subscribe(listener);
      listener.mockClear();

      service.sendOperation({
        type: 'add',
        path: '/entities',
        value: { name: 'new-entity' },
      });

      const event = listener.mock.calls[0][0] as CollaborationEvent;
      if (event.type === 'operation') {
        expect(event.operation.id).toMatch(/^op_/);
        expect(event.operation.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  describe('Version Management', () => {
    it('should create version', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const gameSpec = createMockGameSpec('Version Test');
      const version = await service.createVersion('v1.0', gameSpec, 'Initial release');

      expect(version.id).toMatch(/^ver_/);
      expect(version.name).toBe('v1.0');
      expect(version.description).toBe('Initial release');
      expect(version.gameSpec).toEqual(gameSpec);
      expect(version.author.id).toBe('user-123');
    });

    it('should throw error if not initialized', async () => {
      const gameSpec = createMockGameSpec();

      await expect(service.createVersion('v1.0', gameSpec)).rejects.toThrow('User not initialized');
    });

    it('should emit version-created event', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const listener = vi.fn();
      service.subscribe(listener);
      listener.mockClear();

      const gameSpec = createMockGameSpec();
      await service.createVersion('v2.0', gameSpec);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'version-created',
          version: expect.objectContaining({
            name: 'v2.0',
          }),
        })
      );
    });

    it('should add version to list', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const initialVersions = service.getVersions().length;

      const gameSpec = createMockGameSpec();
      await service.createVersion('New Version', gameSpec);

      expect(service.getVersions().length).toBe(initialVersions + 1);
    });

    it('should restore version', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const gameSpec = createMockGameSpec('Restorable');
      const version = await service.createVersion('v1', gameSpec);

      const restored = await service.restoreVersion(version.id);

      expect(restored).toEqual(gameSpec);
    });

    it('should return null for non-existent version', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const restored = await service.restoreVersion('non-existent');

      expect(restored).toBeNull();
    });
  });

  describe('Comments', () => {
    it('should add comment', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const comment = await service.addComment('This is a test comment');

      expect(comment.id).toMatch(/^comment_/);
      expect(comment.content).toBe('This is a test comment');
      expect(comment.author.id).toBe('user-123');
      expect(comment.resolved).toBe(false);
      expect(comment.replies).toEqual([]);
    });

    it('should add comment with entity reference', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const comment = await service.addComment('Fix this entity', 'player');

      expect(comment.entityName).toBe('player');
    });

    it('should add comment with position', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const comment = await service.addComment('Note here', undefined, { x: 100, y: 200 });

      expect(comment.position).toEqual({ x: 100, y: 200 });
    });

    it('should emit comment-added event', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const listener = vi.fn();
      service.subscribe(listener);
      listener.mockClear();

      await service.addComment('Test comment');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'comment-added',
          comment: expect.objectContaining({
            content: 'Test comment',
          }),
        })
      );
    });

    it('should throw error if not initialized', async () => {
      await expect(service.addComment('Test')).rejects.toThrow('User not initialized');
    });
  });

  describe('Collaborator Invitation', () => {
    it('should invite collaborator by email', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const result = await service.inviteCollaborator('test@example.com');

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const result = await service.inviteCollaborator('invalid-email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should fail if not connected', async () => {
      service.initialize('user-123', 'Test User');

      const result = await service.inviteCollaborator('test@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not connected to a project');
    });
  });

  describe('Share Link Generation', () => {
    it('should generate share link with edit permission', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const link = service.generateShareLink({ canEdit: true });

      expect(link).toContain('project-1');
      expect(link).toContain('edit=true');
      expect(link).toContain('token=');
    });

    it('should generate read-only share link', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      const link = service.generateShareLink({ canEdit: false });

      expect(link).toContain('edit=false');
    });

    it('should return empty string if not connected', () => {
      const link = service.generateShareLink({ canEdit: true });

      expect(link).toBe('');
    });
  });

  describe('Project Info', () => {
    it('should return project ID', async () => {
      service.initialize('user-123', 'Test User');
      await service.connect('project-1');

      expect(service.getProjectId()).toBe('project-1');
    });

    it('should return null if not connected', () => {
      expect(service.getProjectId()).toBeNull();
    });
  });
});

describe('generateCollaboratorColor', () => {
  it('should return different colors for different indices', () => {
    const color0 = generateCollaboratorColor(0);
    const color1 = generateCollaboratorColor(1);
    const color2 = generateCollaboratorColor(2);

    expect(color0).not.toBe(color1);
    expect(color1).not.toBe(color2);
  });

  it('should cycle colors for large indices', () => {
    const color0 = generateCollaboratorColor(0);
    const color8 = generateCollaboratorColor(8);

    expect(color0).toBe(color8);
  });

  it('should return valid hex color', () => {
    const color = generateCollaboratorColor(0);

    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
