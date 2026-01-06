import type { GameSpec } from '@promptplay/shared-types';

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
 * Collaboration Service
 * Real-time multiplayer editing and version control
 */
export class CollaborationService {
  // Placeholder URL for production WebSocket server
  // private baseUrl = 'wss://collab.promptplay.dev';
  private ws: WebSocket | null = null;
  private projectId: string | null = null;
  private userId: string | null = null;
  private eventHandlers: CollaborationEventHandler[] = [];
  private collaborators: Map<string, Collaborator> = new Map();
  private operationQueue: Operation[] = [];
  private versions: ProjectVersion[] = [];
  // Reconnection attempts reserved for production WebSocket implementation

  /**
   * Initialize the service with user info
   */
  initialize(userId: string): void {
    this.userId = userId;
  }

  /**
   * Connect to a project for collaboration
   */
  async connect(projectId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) {
      return { success: false, error: 'User not initialized' };
    }

    this.projectId = projectId;

    // In demo mode, simulate connection
    // In production, this would establish WebSocket connection
    this.simulateConnection();

    return { success: true };
  }

  /**
   * Disconnect from collaboration
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.projectId = null;
    this.collaborators.clear();
    this.operationQueue = [];
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

    // In production, send via WebSocket
    // For demo, update locally
    const collaborator = this.collaborators.get(this.userId);
    if (collaborator) {
      collaborator.cursor = { x, y };
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
        name: 'You',
      },
      createdAt: new Date(),
      isAutoSave: false,
    };

    this.versions.unshift(version);
    this.emit({ type: 'version-created', version });

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
        name: 'You',
      },
      content,
      entityName,
      position,
      resolved: false,
      createdAt: new Date(),
      replies: [],
    };

    this.emit({ type: 'comment-added', comment });

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

    // In production, this would send an invite email
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
    setInterval(() => {
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
