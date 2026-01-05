import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from './AuthService';
import type { EntitySpec } from '@promptplay/shared-types';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

// Collaborative session types
export interface Collaborator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedEntity?: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface CollaborativeSession {
  id: string;
  projectId: string;
  hostId: string;
  name: string;
  collaborators: Collaborator[];
  isActive: boolean;
  createdAt: string;
}

export interface EditOperation {
  type: 'entity_add' | 'entity_update' | 'entity_delete' | 'config_update' | 'metadata_update';
  userId: string;
  timestamp: number;
  data: {
    entityName?: string;
    entitySpec?: EntitySpec;
    path?: string;
    value?: unknown;
    previousValue?: unknown;
  };
}

// Collaborative colors for cursors
const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

/**
 * Collaborative Editing Service
 * Enables real-time multiplayer game editing using Supabase Realtime
 */
export class CollaborativeService {
  private static instance: CollaborativeService;
  private channel: RealtimeChannel | null = null;
  private session: CollaborativeSession | null = null;
  private collaborators: Map<string, Collaborator> = new Map();
  private listeners: Set<(event: CollabEvent) => void> = new Set();
  private colorIndex = 0;

  private constructor() {}

  static getInstance(): CollaborativeService {
    if (!CollaborativeService.instance) {
      CollaborativeService.instance = new CollaborativeService();
    }
    return CollaborativeService.instance;
  }

  /**
   * Check if collaborative editing is available
   */
  isAvailable(): boolean {
    return isSupabaseConfigured() && !!authService.getState().user;
  }

  /**
   * Get current session
   */
  getSession(): CollaborativeSession | null {
    return this.session;
  }

  /**
   * Get all collaborators
   */
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values());
  }

  /**
   * Subscribe to collaborative events
   */
  subscribe(listener: (event: CollabEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create a new collaborative session
   */
  async createSession(projectId: string, name: string): Promise<{ sessionId: string } | { error: string }> {
    if (!this.isAvailable()) {
      return { error: 'Collaborative editing requires authentication' };
    }

    const user = authService.getState().user!;
    const profile = authService.getState().profile;

    try {
      // Create session record
      const { data, error } = await supabase
        .from('collaborative_sessions')
        .insert({
          project_id: projectId,
          host_id: user.id,
          name,
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const sessionId = data.id;

      // Initialize realtime channel
      await this.joinChannel(sessionId, {
        id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'user',
        displayName: profile?.display_name || profile?.username || 'User',
        avatarUrl: profile?.avatar_url || undefined,
        color: this.getNextColor(),
        isOnline: true,
        lastSeen: Date.now(),
      });

      this.session = {
        id: sessionId,
        projectId,
        hostId: user.id,
        name,
        collaborators: this.getCollaborators(),
        isActive: true,
        createdAt: data.created_at,
      };

      this.emit({ type: 'session_created', session: this.session });

      return { sessionId };
    } catch (err) {
      console.error('Error creating session:', err);
      return { error: err instanceof Error ? err.message : 'Failed to create session' };
    }
  }

  /**
   * Join an existing session
   */
  async joinSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Authentication required' };
    }

    const user = authService.getState().user!;
    const profile = authService.getState().profile;

    try {
      // Get session info
      const { data: sessionData, error: sessionError } = await supabase
        .from('collaborative_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      if (!sessionData.is_active) {
        return { success: false, error: 'This session is no longer active' };
      }

      // Join realtime channel
      await this.joinChannel(sessionId, {
        id: user.id,
        username: profile?.username || user.email?.split('@')[0] || 'user',
        displayName: profile?.display_name || profile?.username || 'User',
        avatarUrl: profile?.avatar_url || undefined,
        color: this.getNextColor(),
        isOnline: true,
        lastSeen: Date.now(),
      });

      this.session = {
        id: sessionId,
        projectId: sessionData.project_id,
        hostId: sessionData.host_id,
        name: sessionData.name,
        collaborators: this.getCollaborators(),
        isActive: true,
        createdAt: sessionData.created_at,
      };

      this.emit({ type: 'session_joined', session: this.session });

      return { success: true };
    } catch (err) {
      console.error('Error joining session:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to join session' };
    }
  }

  /**
   * Leave the current session
   */
  async leaveSession(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    const wasHost = this.session?.hostId === authService.getState().user?.id;

    if (wasHost && this.session) {
      // End session if host leaves
      await supabase
        .from('collaborative_sessions')
        .update({ is_active: false })
        .eq('id', this.session.id);
    }

    this.session = null;
    this.collaborators.clear();
    this.emit({ type: 'session_left' });
  }

  /**
   * Send an edit operation to all collaborators
   */
  sendEdit(operation: Omit<EditOperation, 'userId' | 'timestamp'>): void {
    if (!this.channel) return;

    const user = authService.getState().user;
    if (!user) return;

    const fullOperation: EditOperation = {
      ...operation,
      userId: user.id,
      timestamp: Date.now(),
    };

    this.channel.send({
      type: 'broadcast',
      event: 'edit',
      payload: fullOperation,
    });
  }

  /**
   * Update cursor position
   */
  updateCursor(x: number, y: number): void {
    if (!this.channel) return;

    this.channel.track({
      cursor: { x, y },
    });
  }

  /**
   * Update selected entity
   */
  updateSelection(entityName: string | null): void {
    if (!this.channel) return;

    this.channel.track({
      selectedEntity: entityName,
    });
  }

  /**
   * Generate a shareable invite link
   */
  getInviteLink(): string | null {
    if (!this.session) return null;
    return `${window.location.origin}/collab/${this.session.id}`;
  }

  // ========== Private Methods ==========

  private async joinChannel(sessionId: string, userInfo: Collaborator): Promise<void> {
    // Leave existing channel
    if (this.channel) {
      await this.channel.unsubscribe();
    }

    this.channel = supabase.channel(`collab:${sessionId}`, {
      config: {
        presence: { key: userInfo.id },
      },
    });

    // Handle presence sync
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState() as RealtimePresenceState<{
        user: Collaborator;
        cursor?: { x: number; y: number };
        selectedEntity?: string;
      }>;

      this.collaborators.clear();

      for (const [userId, presences] of Object.entries(state)) {
        if (presences.length > 0) {
          const presence = presences[0];
          this.collaborators.set(userId, {
            ...presence.user,
            cursor: presence.cursor,
            selectedEntity: presence.selectedEntity,
            isOnline: true,
            lastSeen: Date.now(),
          });
        }
      }

      this.emit({
        type: 'collaborators_changed',
        collaborators: this.getCollaborators(),
      });
    });

    // Handle presence join
    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (newPresences.length > 0) {
        const presence = newPresences[0] as unknown as { user: Collaborator };
        this.collaborators.set(key, {
          ...presence.user,
          isOnline: true,
          lastSeen: Date.now(),
        });

        this.emit({
          type: 'user_joined',
          user: presence.user,
        });
      }
    });

    // Handle presence leave
    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (leftPresences.length > 0) {
        const presence = leftPresences[0] as unknown as { user: Collaborator };
        this.collaborators.delete(key);

        this.emit({
          type: 'user_left',
          user: presence.user,
        });
      }
    });

    // Handle edit broadcasts
    this.channel.on('broadcast', { event: 'edit' }, ({ payload }) => {
      const operation = payload as EditOperation;

      // Don't process our own edits
      if (operation.userId === authService.getState().user?.id) return;

      this.emit({
        type: 'remote_edit',
        operation,
      });
    });

    // Subscribe and track presence
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel!.track({ user: userInfo });
      }
    });
  }

  private getNextColor(): string {
    const color = COLLABORATOR_COLORS[this.colorIndex % COLLABORATOR_COLORS.length];
    this.colorIndex++;
    return color;
  }

  private emit(event: CollabEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

// Event types
export type CollabEvent =
  | { type: 'session_created'; session: CollaborativeSession }
  | { type: 'session_joined'; session: CollaborativeSession }
  | { type: 'session_left' }
  | { type: 'user_joined'; user: Collaborator }
  | { type: 'user_left'; user: Collaborator }
  | { type: 'collaborators_changed'; collaborators: Collaborator[] }
  | { type: 'remote_edit'; operation: EditOperation };

// Singleton instance
export const collaborativeService = CollaborativeService.getInstance();
