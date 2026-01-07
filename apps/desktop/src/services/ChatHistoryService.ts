import { invoke } from '@tauri-apps/api/core';
import { logError } from '../utils/errorUtils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    appliedChanges?: boolean;
    errorContext?: string;
    codeGenerated?: boolean;
  };
}

export interface ChatSession {
  id: string;
  projectPath: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

class ChatHistoryService {
  private currentSession: ChatSession | null = null;
  private sessions: Map<string, ChatSession> = new Map();

  generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async loadSessionsForProject(projectPath: string): Promise<ChatSession[]> {
    try {
      const historyPath = `${projectPath}/.promptplay/chat-history.json`;
      const exists = await invoke<boolean>('path_exists', { path: historyPath });

      if (!exists) {
        return [];
      }

      const content = await invoke<string>('read_file', { path: historyPath });
      const data = JSON.parse(content);

      if (Array.isArray(data.sessions)) {
        for (const session of data.sessions) {
          this.sessions.set(session.id, session);
        }
        return data.sessions;
      }

      return [];
    } catch (err) {
      logError('Failed to load chat history', err);
      return [];
    }
  }

  async saveSessionsForProject(projectPath: string): Promise<void> {
    try {
      const historyDir = `${projectPath}/.promptplay`;
      const historyPath = `${historyDir}/chat-history.json`;

      // Ensure directory exists
      await invoke('create_directory', { path: historyDir }).catch(() => {});

      // Get all sessions for this project
      const projectSessions = Array.from(this.sessions.values())
        .filter(s => s.projectPath === projectPath)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 50); // Keep last 50 sessions

      const data = {
        version: 1,
        sessions: projectSessions,
      };

      await invoke('write_file', {
        path: historyPath,
        content: JSON.stringify(data, null, 2),
      });
    } catch (err) {
      logError('Failed to save chat history', err);
    }
  }

  createSession(projectPath: string, title?: string): ChatSession {
    const session: ChatSession = {
      id: this.generateId(),
      projectPath,
      title: title || `Chat ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.currentSession = session;

    return session;
  }

  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  setCurrentSession(sessionId: string): ChatSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.currentSession = session;
      return session;
    }
    return null;
  }

  addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ChatMessage['metadata']
  ): ChatMessage | null {
    if (!this.currentSession) {
      return null;
    }

    const message: ChatMessage = {
      id: this.generateId(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };

    this.currentSession.messages.push(message);
    this.currentSession.updatedAt = Date.now();

    // Auto-generate title from first user message
    if (role === 'user' && this.currentSession.messages.length === 1) {
      this.currentSession.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }

    return message;
  }

  getMessages(): ChatMessage[] {
    return this.currentSession?.messages || [];
  }

  clearCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.currentSession.updatedAt = Date.now();
    }
  }

  deleteSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
    return deleted;
  }

  getAllSessions(projectPath?: string): ChatSession[] {
    const sessions = Array.from(this.sessions.values());
    if (projectPath) {
      return sessions
        .filter(s => s.projectPath === projectPath)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  exportSession(sessionId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return JSON.stringify(session, null, 2);
  }

  importSession(json: string, projectPath: string): ChatSession | null {
    try {
      const session = JSON.parse(json) as ChatSession;
      session.id = this.generateId(); // Generate new ID
      session.projectPath = projectPath;
      session.createdAt = Date.now();
      session.updatedAt = Date.now();

      this.sessions.set(session.id, session);
      return session;
    } catch {
      return null;
    }
  }

  // Get recent messages for context (last N messages)
  getRecentContext(count: number = 10): ChatMessage[] {
    if (!this.currentSession) return [];
    return this.currentSession.messages.slice(-count);
  }

  // Format messages for AI context
  formatForAI(): Array<{ role: string; content: string }> {
    return this.getMessages().map(m => ({
      role: m.role,
      content: m.content,
    }));
  }
}

export const chatHistoryService = new ChatHistoryService();
