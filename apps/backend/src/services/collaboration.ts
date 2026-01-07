/**
 * Real-time Collaboration WebSocket Service
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuid } from 'uuid';
import { verifyToken, AuthUser } from '../middleware/auth.js';
import { getDb } from '../db/index.js';

interface CollabMessage {
  type: string;
  sessionId?: string;
  data?: unknown;
}

interface Participant {
  id: string;
  user: AuthUser;
  ws: WebSocket;
  cursor?: { x: number; y: number };
  selection?: string[];
  color: string;
}

interface Session {
  id: string;
  projectId: string;
  ownerId: string;
  participants: Map<string, Participant>;
  documentState: unknown;
  createdAt: Date;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
];

export class CollaborationService {
  private wss: WebSocketServer;
  private sessions: Map<string, Session> = new Map();
  private clientToSession: Map<WebSocket, string> = new Map();
  private colorIndex = 0;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('[Collab] New connection');

      // Parse auth token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      let user: AuthUser | null = null;
      if (token) {
        user = verifyToken(token);
      }

      if (!user) {
        ws.close(4001, 'Authentication required');
        return;
      }

      // Handle messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as CollabMessage;
          this.handleMessage(ws, user!, message);
        } catch (error) {
          console.error('[Collab] Message parse error:', error);
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Send welcome
      ws.send(JSON.stringify({
        type: 'connected',
        userId: user.id,
        userName: user.name,
      }));
    });
  }

  private handleMessage(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(ws, user, message);
        break;
      case 'leave':
        this.handleLeave(ws);
        break;
      case 'operation':
        this.handleOperation(ws, user, message);
        break;
      case 'cursor':
        this.handleCursor(ws, user, message);
        break;
      case 'selection':
        this.handleSelection(ws, user, message);
        break;
      case 'chat':
        this.handleChat(ws, user, message);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${message.type}` }));
    }
  }

  private handleJoin(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    const { sessionId, data } = message;
    const projectId = (data as { projectId?: string })?.projectId;

    if (!projectId) {
      ws.send(JSON.stringify({ type: 'error', error: 'Project ID required' }));
      return;
    }

    // Get or create session
    let session = sessionId ? this.sessions.get(sessionId) : null;

    if (!session) {
      // Create new session
      const newSessionId = sessionId || uuid();
      session = {
        id: newSessionId,
        projectId,
        ownerId: user.id,
        participants: new Map(),
        documentState: (data as { initialState?: unknown })?.initialState || {},
        createdAt: new Date(),
      };
      this.sessions.set(newSessionId, session);

      // Store in database
      const db = getDb();
      db.prepare(`
        INSERT INTO collab_sessions (id, project_id, owner_id, name)
        VALUES (?, ?, ?, ?)
      `).run(newSessionId, projectId, user.id, `Session ${newSessionId.slice(0, 8)}`);
    }

    // Add participant
    const participantId = uuid();
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;

    const participant: Participant = {
      id: participantId,
      user,
      ws,
      color,
    };

    session.participants.set(participantId, participant);
    this.clientToSession.set(ws, session.id);

    // Store participant in database
    const db = getDb();
    try {
      db.prepare(`
        INSERT INTO collab_participants (session_id, user_id, role)
        VALUES (?, ?, ?)
      `).run(session.id, user.id, session.ownerId === user.id ? 'owner' : 'editor');
    } catch {
      // Already a participant, update timestamp
      db.prepare(`
        UPDATE collab_participants SET joined_at = unixepoch()
        WHERE session_id = ? AND user_id = ?
      `).run(session.id, user.id);
    }

    // Send session info to joiner
    ws.send(JSON.stringify({
      type: 'joined',
      sessionId: session.id,
      participantId,
      color,
      participants: Array.from(session.participants.values()).map(p => ({
        id: p.id,
        userId: p.user.id,
        name: p.user.name,
        color: p.color,
        cursor: p.cursor,
      })),
      documentState: session.documentState,
    }));

    // Notify others
    this.broadcastToSession(session.id, {
      type: 'participant_joined',
      participant: {
        id: participantId,
        userId: user.id,
        name: user.name,
        color,
      },
    }, ws);
  }

  private handleLeave(ws: WebSocket): void {
    this.handleDisconnect(ws);
  }

  private handleDisconnect(ws: WebSocket): void {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Find and remove participant
    let removedParticipant: Participant | undefined;
    for (const [id, participant] of session.participants) {
      if (participant.ws === ws) {
        removedParticipant = participant;
        session.participants.delete(id);
        break;
      }
    }

    this.clientToSession.delete(ws);

    if (removedParticipant) {
      // Notify others
      this.broadcastToSession(sessionId, {
        type: 'participant_left',
        participantId: removedParticipant.id,
        userId: removedParticipant.user.id,
      });

      // Remove from database
      const db = getDb();
      db.prepare(`
        DELETE FROM collab_participants
        WHERE session_id = ? AND user_id = ?
      `).run(sessionId, removedParticipant.user.id);
    }

    // Clean up empty sessions
    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);

      // Mark session as inactive
      const db = getDb();
      db.prepare('UPDATE collab_sessions SET is_active = 0 WHERE id = ?').run(sessionId);
    }
  }

  private handleOperation(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { data } = message;
    const operation = data as {
      type: string;
      path: string[];
      value?: unknown;
      oldValue?: unknown;
    };

    // Apply operation to document state (simplified)
    // In production, use proper CRDT/OT library
    this.applyOperation(session, operation);

    // Broadcast to others
    this.broadcastToSession(sessionId, {
      type: 'operation',
      userId: user.id,
      operation,
      timestamp: Date.now(),
    }, ws);
  }

  private applyOperation(session: Session, operation: { type: string; path: string[]; value?: unknown }): void {
    // Simple path-based state update
    let current = session.documentState as Record<string, unknown>;

    for (let i = 0; i < operation.path.length - 1; i++) {
      const key = operation.path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    const lastKey = operation.path[operation.path.length - 1];

    switch (operation.type) {
      case 'set':
        current[lastKey] = operation.value;
        break;
      case 'delete':
        delete current[lastKey];
        break;
    }
  }

  private handleCursor(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { data } = message;
    const cursor = data as { x: number; y: number };

    // Update participant cursor
    for (const participant of session.participants.values()) {
      if (participant.ws === ws) {
        participant.cursor = cursor;
        break;
      }
    }

    // Broadcast to others
    this.broadcastToSession(sessionId, {
      type: 'cursor',
      userId: user.id,
      cursor,
    }, ws);
  }

  private handleSelection(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (!session) return;

    const { data } = message;
    const selection = data as string[];

    // Update participant selection
    for (const participant of session.participants.values()) {
      if (participant.ws === ws) {
        participant.selection = selection;
        break;
      }
    }

    // Broadcast to others
    this.broadcastToSession(sessionId, {
      type: 'selection',
      userId: user.id,
      selection,
    }, ws);
  }

  private handleChat(ws: WebSocket, user: AuthUser, message: CollabMessage): void {
    const sessionId = this.clientToSession.get(ws);
    if (!sessionId) return;

    const { data } = message;
    const chatMessage = data as { text: string };

    // Broadcast to all including sender
    this.broadcastToSession(sessionId, {
      type: 'chat',
      userId: user.id,
      userName: user.name,
      text: chatMessage.text,
      timestamp: Date.now(),
    });
  }

  private broadcastToSession(sessionId: string, message: object, exclude?: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const data = JSON.stringify(message);

    for (const participant of session.participants.values()) {
      if (participant.ws !== exclude && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(data);
      }
    }
  }

  /**
   * Get active sessions for a project
   */
  getProjectSessions(projectId: string): Session[] {
    return Array.from(this.sessions.values()).filter(s => s.projectId === projectId);
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get statistics
   */
  getStats(): { activeSessions: number; totalParticipants: number } {
    let totalParticipants = 0;
    for (const session of this.sessions.values()) {
      totalParticipants += session.participants.size;
    }
    return {
      activeSessions: this.sessions.size,
      totalParticipants,
    };
  }
}
