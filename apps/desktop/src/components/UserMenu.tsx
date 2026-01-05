import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface UserMenuProps {
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenCloudProjects: () => void;
}

export function UserMenu({ onOpenAuth, onOpenProfile, onOpenCloudProjects }: UserMenuProps) {
  const { user, profile, isLoading, isAuthenticated, isConfigured, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-surface animate-pulse" />
    );
  }

  if (!isConfigured) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-white/10 border border-subtle rounded-lg transition-colors text-sm text-text-secondary"
        title="Configure cloud features"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        <span className="hidden sm:inline">Cloud</span>
      </button>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-sm text-white font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/10 transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <svg className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-panel border border-subtle rounded-lg shadow-xl overflow-hidden z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-subtle">
            <div className="font-medium text-white">{displayName}</div>
            <div className="text-sm text-text-secondary truncate">{user?.email}</div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCloudProjects();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Cloud Projects
            </button>

            <div className="h-px bg-subtle my-1" />

            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
