import type { GameSpec } from '@promptplay/shared-types';

/**
 * Configuration for the collaboration service
 */
export interface CollaborationConfig {
  /** WebSocket server URL (e.g., 'wss://collab.example.com') */
  serverUrl?: string;
  /** Enable demo mode (simulated collaboration) */
  demoMode?: boolean;
  /** Reconnection settings */
  reconnect?: {
    enabled: boolean;
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * Collaborator info
 */
export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string[];
  isOnline: boolean;
  lastSeen: Date;
}

/**
 * Project collaboration settings
 */
export interface CollaborationSettings {
  projectId: string;
  isPublic: boolean;
  allowEdit: boolean;
  allowComment: boolean;
  maxCollaborators: number;
}

/**
 * Operation for collaborative editing
 */
export interface Operation {
  id: string;
  type: 'add' | 'update' | 'delete' | 'move';
  path: string;
  value?: unknown;
  previousValue?: unknown;
  userId: string;
  timestamp: Date;
}

/**
 * Project version
 */
export interface ProjectVersion {
  id: string;
  name: string;
  description?: string;
  gameSpec: GameSpec;
  author: {
    id: string;
    name: string;
  };
  createdAt: Date;
  isAutoSave: boolean;
}

/**
 * Comment on project
 */
export interface ProjectComment {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  entityName?: string;
  position?: { x: number; y: number };
  resolved: boolean;
  createdAt: Date;
  replies: ProjectComment[];
}

/**
 * Collaboration event types
 */
export type CollaborationEvent =
  | { type: 'user-joined'; collaborator: Collaborator }
  | { type: 'user-left'; userId: string }
  | { type: 'cursor-moved'; userId: string; cursor: { x: number; y: number } }
  | { type: 'selection-changed'; userId: string; selection: string[] }
  | { type: 'operation'; operation: Operation }
  | { type: 'comment-added'; comment: ProjectComment }
  | { type: 'version-created'; version: ProjectVersion };

/**
 * Event handler
 */
export type CollaborationEventHandler = (event: CollaborationEvent) => void;

/**
 * WebSocket message types
 */
interface WSMessage {
  type: string;
  payload: unknown;
}

/**
 * Collaboration Service
 * Real-time multiplayer editing and version control
 */
export class CollaborationService {
  private config: CollaborationConfig = {
    demoMode: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  };
  private ws: WebSocket | null = null;
  private projectId: string | null = null;
  private userId: string | null = null;
  private userName: string = 'Anonymous';
  private eventHandlers: CollaborationEventHandler[] = [];
  private collaborators: Map<string, Collaborator> = new Map();
  private operationQueue: Operation[] = [];
  private versions: ProjectVersion[] = [];
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private pendingCursor: { x: number; y: number } | null = null;
  private demoIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Configure the collaboration service
   */
  configure(config: Partial<CollaborationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Initialize the service with user info
   */
  initialize(userId: string, userName?: string): void {
    this.userId = userId;
    this.userName = userName || 'Anonymous';
  }

  /**
   * Connect to a project for collaboration
   */
  async connect(projectId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      return { success: false, error: 'User not initialized' };
    }

    this.projectId = projectId;
    this.reconnectAttempts = 0;

    // Use demo mode if no server URL is configured
    if (this.config.demoMode || !this.config.serverUrl) {
      this.simulateConnection();
      return { success: true };
    }

    // Connect to real WebSocket server
    try {
      await this.connectWebSocket();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Connect to WebSocket server
   */
  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.serverUrl || !this.projectId || !this.userId) {
        reject(new Error('Missing configuration'));
        return;
      }

      // Construct WebSocket URL with query params
      const url = new URL(this.config.serverUrl);
      url.searchParams.set('projectId', this.projectId);
      url.searchParams.set('userId', this.userId);
      url.searchParams.set('userName', this.userName);

      try {
        this.ws = new WebSocket(url.toString());
      } catch (error) {
        reject(new Error(`Failed to create WebSocket: ${error}`));
        return;
      }

      const timeoutId = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(timeoutId);
        console.log('[Collaboration] WebSocket connected');
        this.reconnectAttempts = 0;

        // Add current user as collaborator
        if (this.userId) {
          this.collaborators.set(this.userId, {
            id: this.userId,
            name: this.userName,
            color: generateCollaboratorColor(0),
            isOnline: true,
            lastSeen: new Date(),
          });
        }

        // Start cursor update batching
        this.startCursorBatching();

        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('[Collaboration] WebSocket closed:', event.code, event.reason);
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Collaboration] WebSocket error:', error);
        clearTimeout(timeoutId);
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'user-joined': {
          const collaborator = message.payload as Collaborator;
          collaborator.lastSeen = new Date(collaborator.lastSeen);
          this.collaborators.set(collaborator.id, collaborator);
          this.emit({ type: 'user-joined', collaborator });
          break;
        }

        case 'user-left': {
          const { userId } = message.payload as { userId: string };
          this.collaborators.delete(userId);
          this.emit({ type: 'user-left', userId });
          break;
        }

        case 'cursor-moved': {
          const { userId, cursor } = message.payload as {
            userId: string;
            cursor: { x: number; y: number };
          };
          const collaborator = this.collaborators.get(userId);
          if (collaborator) {
            collaborator.cursor = cursor;
            this.emit({ type: 'cursor-moved', userId, cursor });
          }
          break;
        }

        case 'selection-changed': {
          const { userId, selection } = message.payload as {
            userId: string;
            selection: string[];
          };
          const collaborator = this.collaborators.get(userId);
          if (collaborator) {
            collaborator.selection = selection;
            this.emit({ type: 'selection-changed', userId, selection });
          }
          break;
        }

        case 'operation': {
          const operation = message.payload as Operation;
          operation.timestamp = new Date(operation.timestamp);
          this.operationQueue.push(operation);
          this.emit({ type: 'operation', operation });
          break;
        }

        case 'state-sync': {
          // Sync full state from server
          const state = message.payload as {
            collaborators: Collaborator[];
            versions: ProjectVersion[];
          };
          this.collaborators.clear();
          for (const collab of state.collaborators) {
            collab.lastSeen = new Date(collab.lastSeen);
            this.collaborators.set(collab.id, collab);
          }
          this.versions = state.versions.map((v) => ({
            ...v,
            createdAt: new Date(v.createdAt),
          }));
          break;
        }

        case 'comment-added': {
          const comment = message.payload as ProjectComment;
          comment.createdAt = new Date(comment.createdAt);
          this.emit({ type: 'comment-added', comment });
          break;
        }

        case 'version-created': {
          const version = message.payload as ProjectVersion;
          version.createdAt = new Date(version.createdAt);
          this.versions.unshift(version);
          this.emit({ type: 'version-created', version });
          break;
        }

        case 'error': {
          console.error('[Collaboration] Server error:', message.payload);
          break;
        }

        default:
          console.warn('[Collaboration] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Collaboration] Failed to parse message:', error);
    }
  }

  /**
   * Handle disconnect and attempt reconnection
   */
  private handleDisconnect(): void {
    this.stopCursorBatching();

    if (
      this.config.reconnect?.enabled &&
      this.reconnectAttempts < (this.config.reconnect?.maxAttempts || 5)
    ) {
      this.reconnectAttempts++;
      const delay = this.config.reconnect?.delayMs || 2000;

      console.log(
        `[Collaboration] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      this.reconnectTimer = setTimeout(() => {
        if (this.projectId) {
          this.connectWebSocket().catch((error) => {
            console.error('[Collaboration] Reconnect failed:', error);
          });
        }
      }, delay * this.reconnectAttempts); // Exponential backoff
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(type: string, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Start batching cursor updates to reduce network traffic
   */
  private startCursorBatching(): void {
    this.cursorUpdateInterval = setInterval(() => {
      if (this.pendingCursor) {
        this.send('cursor-moved', {
          userId: this.userId,
          cursor: this.pendingCursor,
        });
        this.pendingCursor = null;
      }
    }, 50); // Send cursor updates at most 20 times per second
  }

  /**
   * Stop cursor batching
   */
  private stopCursorBatching(): void {
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
      this.cursorUpdateInterval = null;
    }
  }

  /**
   * Disconnect from collaboration
   */
  disconnect(): void {
    // Cancel reconnection attempts
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop cursor batching
    this.stopCursorBatching();

    // Stop demo mode interval
    if (this.demoIntervalId) {
      clearInterval(this.demoIntervalId);
      this.demoIntervalId = null;
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.projectId = null;
    this.collaborators.clear();
    this.operationQueue = [];
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to collaboration events
   */
  subscribe(handler: CollaborationEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: CollaborationEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  /**
   * Get current collaborators
   */
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  /**
   * Update cursor position
   */
  updateCursor(x: number, y: number): void {
    if (!this.userId) return;

    // Update local state
    const collaborator = this.collaborators.get(this.userId);
    if (collaborator) {
      collaborator.cursor = { x, y };
    }

    // Send via WebSocket (batched) or demo mode (local only)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.pendingCursor = { x, y };
    }
  }

  /**
   * Update selection
   */
  updateSelection(entityNames: string[]): void {
    if (!this.userId) return;

    const collaborator = this.collaborators.get(this.userId);
    if (collaborator) {
      collaborator.selection = entityNames;
    }

    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('selection-changed', {
        userId: this.userId,
        selection: entityNames,
      });
    }

    this.emit({
      type: 'selection-changed',
      userId: this.userId,
      selection: entityNames,
    });
  }

  /**
   * Send an operation
   */
  sendOperation(operation: Omit<Operation, 'id' | 'userId' | 'timestamp'>): void {
    if (!this.userId) return;

    const fullOperation: Operation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: this.userId,
      timestamp: new Date(),
    };

    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('operation', fullOperation);
    }

    this.operationQueue.push(fullOperation);
    this.emit({ type: 'operation', operation: fullOperation });
  }

  /**
   * Create a version snapshot
   */
  async createVersion(
    name: string,
    gameSpec: GameSpec,
    description?: string
  ): Promise<ProjectVersion> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    const version: ProjectVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      description,
      gameSpec,
      author: {
        id: this.userId,
        name: this.userName,
      },
      createdAt: new Date(),
      isAutoSave: false,
    };

    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('create-version', version);
    } else {
      // Demo mode - add locally
      this.versions.unshift(version);
      this.emit({ type: 'version-created', version });
    }

    return version;
  }

  /**
   * Get version history
   */
  getVersions(): ProjectVersion[] {
    return this.versions;
  }

  /**
   * Restore a version
   */
  async restoreVersion(versionId: string): Promise<GameSpec | null> {
    const version = this.versions.find((v) => v.id === versionId);
    return version?.gameSpec || null;
  }

  /**
   * Add a comment
   */
  async addComment(
    content: string,
    entityName?: string,
    position?: { x: number; y: number }
  ): Promise<ProjectComment> {
    if (!this.userId) {
      throw new Error('User not initialized');
    }

    const comment: ProjectComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      author: {
        id: this.userId,
        name: this.userName,
      },
      content,
      entityName,
      position,
      resolved: false,
      createdAt: new Date(),
      replies: [],
    };

    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('add-comment', comment);
    } else {
      // Demo mode - emit locally
      this.emit({ type: 'comment-added', comment });
    }

    return comment;
  }

  /**
   * Invite a collaborator
   */
  async inviteCollaborator(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.projectId) {
      return { success: false, error: 'Not connected to a project' };
    }

    // Validate email
    if (!email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    // Send via WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send('invite-collaborator', { email, projectId: this.projectId });
    }

    return { success: true };
  }

  /**
   * Generate a shareable link
   */
  generateShareLink(settings: { canEdit: boolean; expiresIn?: number }): string {
    if (!this.projectId) return '';

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    return `https://app.promptplay.dev/collab/${this.projectId}?token=${token}&edit=${settings.canEdit}`;
  }

  /**
   * Simulate connection for demo mode
   */
  private simulateConnection(): void {
    // Add current user as collaborator
    if (this.userId) {
      this.collaborators.set(this.userId, {
        id: this.userId,
        name: 'You',
        color: '#8b5cf6',
        isOnline: true,
        lastSeen: new Date(),
      });
    }

    // Simulate other collaborators joining
    setTimeout(() => {
      const demoCollaborator: Collaborator = {
        id: 'demo-user-1',
        name: 'Alice',
        avatar: 'JD',
        color: '#10b981',
        cursor: { x: 300, y: 200 },
        isOnline: true,
        lastSeen: new Date(),
      };
      this.collaborators.set(demoCollaborator.id, demoCollaborator);
      this.emit({ type: 'user-joined', collaborator: demoCollaborator });
    }, 2000);

    // Simulate cursor movements
    this.demoIntervalId = setInterval(() => {
      const alice = this.collaborators.get('demo-user-1');
      if (alice && alice.cursor) {
        alice.cursor = {
          x: alice.cursor.x + (Math.random() - 0.5) * 50,
          y: alice.cursor.y + (Math.random() - 0.5) * 50,
        };
        this.emit({
          type: 'cursor-moved',
          userId: alice.id,
          cursor: alice.cursor,
        });
      }
    }, 3000);

    // Add some demo versions
    this.versions = [
      {
        id: 'ver-1',
        name: 'Initial version',
        gameSpec: { version: '1.0', metadata: { title: 'Demo', genre: 'platformer', description: '' }, config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } }, entities: [], systems: [] },
        author: { id: 'system', name: 'System' },
        createdAt: new Date(Date.now() - 3600000),
        isAutoSave: false,
      },
      {
        id: 'ver-2',
        name: 'Auto-save',
        gameSpec: { version: '1.0', metadata: { title: 'Demo', genre: 'platformer', description: '' }, config: { gravity: { x: 0, y: 1 }, worldBounds: { width: 800, height: 600 } }, entities: [], systems: [] },
        author: { id: 'system', name: 'System' },
        createdAt: new Date(Date.now() - 1800000),
        isAutoSave: true,
      },
    ];
  }

  // Reconnection logic reserved for production WebSocket implementation
  // private handleReconnect(): void { ... }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.projectId !== null;
  }

  /**
   * Get current project ID
   */
  getProjectId(): string | null {
    return this.projectId;
  }
}

// Singleton instance
export const collaboration = new CollaborationService();

/**
 * Generate a unique color for a collaborator
 */
export function generateCollaboratorColor(index: number): string {
  const colors = [
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#3b82f6', // blue
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];
  return colors[index % colors.length];
}
