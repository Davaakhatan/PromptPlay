import { useState, useEffect, useCallback } from 'react';
import {
  collaborativeService,
  type Collaborator,
  type CollaborativeSession,
  type CollabEvent,
} from '../services/CollaborativeService';
import { useAuth } from '../hooks/useAuth';

interface CollaboratorsPanelProps {
  projectId?: string;
  isOpen?: boolean;
  onClose?: () => void;
  onRemoteEdit?: (operation: CollabEvent & { type: 'remote_edit' }) => void;
}

export function CollaboratorsPanel({ projectId = 'default', isOpen = true, onClose, onRemoteEdit }: CollaboratorsPanelProps) {
  const { isAuthenticated, user, profile } = useAuth();
  const [session, setSession] = useState<CollaborativeSession | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const unsubscribe = collaborativeService.subscribe((event) => {
      switch (event.type) {
        case 'session_created':
        case 'session_joined':
          setSession(event.session);
          setCollaborators(event.session.collaborators);
          break;
        case 'session_left':
          setSession(null);
          setCollaborators([]);
          break;
        case 'collaborators_changed':
          setCollaborators(event.collaborators);
          break;
        case 'user_joined':
        case 'user_left':
          setCollaborators(collaborativeService.getCollaborators());
          break;
        case 'remote_edit':
          onRemoteEdit?.(event);
          break;
      }
    });

    return unsubscribe;
  }, [onRemoteEdit]);

  const handleCreateSession = useCallback(async () => {
    setIsCreating(true);
    setError(null);

    const result = await collaborativeService.createSession(
      projectId,
      `${profile?.display_name || 'User'}'s Session`
    );

    setIsCreating(false);

    if ('error' in result) {
      setError(result.error);
    } else {
      setShowInvite(true);
    }
  }, [projectId, profile]);

  const handleJoinSession = useCallback(async () => {
    if (!joinCode.trim()) return;

    setError(null);
    const result = await collaborativeService.joinSession(joinCode.trim());

    if (!result.success) {
      setError(result.error || 'Failed to join session');
    }
  }, [joinCode]);

  const handleLeaveSession = useCallback(async () => {
    await collaborativeService.leaveSession();
  }, []);

  const copyInviteLink = useCallback(() => {
    const link = collaborativeService.getInviteLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setShowInvite(false);
    }
  }, []);

  if (!isOpen) {
    return null;
  }

  const panelContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="p-3 text-center text-text-secondary text-sm">
          Sign in to collaborate with others
        </div>
      );
    }

    if (!collaborativeService.isAvailable()) {
      return (
        <div className="p-3 text-center text-text-secondary text-sm">
          Configure Supabase to enable collaboration
        </div>
      );
    }

    return (
      <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Collaborate
        </h3>
        {session && (
          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
            Live
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg p-2 mb-3 text-xs">
          {error}
        </div>
      )}

      {!session ? (
        <div className="space-y-3">
          {/* Create Session */}
          <button
            onClick={handleCreateSession}
            disabled={isCreating}
            className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Session
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-subtle" />
            <span className="text-xs text-text-tertiary">or</span>
            <div className="flex-1 h-px bg-subtle" />
          </div>

          {/* Join Session */}
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Session ID"
              className="flex-1 bg-surface border border-subtle rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
            <button
              onClick={handleJoinSession}
              disabled={!joinCode.trim()}
              className="px-3 py-1.5 bg-surface hover:bg-white/10 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Session Info */}
          <div className="bg-surface rounded-lg p-2">
            <div className="text-xs text-text-tertiary mb-1">Session</div>
            <div className="text-sm text-white truncate">{session.name}</div>
          </div>

          {/* Invite Modal */}
          {showInvite && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="text-xs text-green-400 mb-2">Share this link to invite others:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={collaborativeService.getInviteLink() || ''}
                  readOnly
                  className="flex-1 bg-surface border border-subtle rounded px-2 py-1 text-xs text-white"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div>
            <div className="text-xs text-text-tertiary mb-2">
              {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-1">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center gap-2 p-2 bg-surface rounded-lg"
                >
                  {collab.avatarUrl ? (
                    <img
                      src={collab.avatarUrl}
                      alt={collab.displayName}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: collab.color }}
                    >
                      {collab.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {collab.displayName}
                      {collab.id === user?.id && (
                        <span className="text-text-tertiary ml-1">(you)</span>
                      )}
                      {collab.id === session.hostId && (
                        <span className="ml-1 text-xs text-yellow-400">host</span>
                      )}
                    </div>
                    {collab.selectedEntity && (
                      <div className="text-xs text-text-tertiary truncate">
                        Editing: {collab.selectedEntity}
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      collab.isOnline ? 'bg-green-400' : 'bg-gray-500'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Leave Button */}
          <button
            onClick={handleLeaveSession}
            className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Session
          </button>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="fixed right-4 top-16 w-72 bg-panel border border-subtle rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-subtle">
        <h2 className="text-sm font-semibold text-white">Collaborate</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {/* Content */}
      {panelContent()}
    </div>
  );
}

export default CollaboratorsPanel;
