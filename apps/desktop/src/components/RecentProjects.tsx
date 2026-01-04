import { useState, useEffect } from 'react';
import {
  getRecentProjects,
  RecentProject,
  formatLastOpened,
  recentProjectsManager,
} from '../services/RecentProjectsService';
import { FolderOpenIcon, ClockIcon, TrashIcon } from './Icons';

interface RecentProjectsProps {
  onOpenProject: (path: string) => void;
  className?: string;
  compact?: boolean;
}

export function RecentProjects({ onOpenProject, className = '', compact = false }: RecentProjectsProps) {
  const [projects, setProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    // Load initial projects
    setProjects(getRecentProjects());

    // Subscribe to changes
    const unsubscribe = recentProjectsManager.subscribe(() => {
      setProjects(getRecentProjects());
    });

    return unsubscribe;
  }, []);

  const handleRemove = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    recentProjectsManager.removeProject(path);
  };

  if (projects.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <FolderOpenIcon size={32} className="mx-auto text-gray-500 mb-3" />
        <p className="text-gray-400 text-sm">No recent projects</p>
        <p className="text-gray-500 text-xs mt-1">
          Open a project to see it here
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`space-y-1 ${className}`}>
        {projects.slice(0, 5).map((project) => (
          <button
            key={project.path}
            onClick={() => onOpenProject(project.path)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-white/10 transition-colors group"
          >
            <FolderOpenIcon size={14} className="text-violet-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{project.name}</p>
              <p className="text-xs text-text-tertiary truncate">
                {formatLastOpened(project.lastOpened)}
              </p>
            </div>
            <button
              onClick={(e) => handleRemove(e, project.path)}
              className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              title="Remove from recent"
            >
              <TrashIcon size={12} />
            </button>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      {projects.map((project) => (
        <button
          key={project.path}
          onClick={() => onOpenProject(project.path)}
          className="flex items-start gap-4 p-4 bg-panel border border-subtle rounded-xl hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group text-left"
        >
          {/* Thumbnail or Icon */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-violet-500/20">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <FolderOpenIcon size={24} className="text-violet-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-text-primary truncate group-hover:text-violet-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-text-secondary truncate mt-0.5" title={project.path}>
              {project.path}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <ClockIcon size={12} />
                {formatLastOpened(project.lastOpened)}
              </span>
              {project.genre && (
                <span className="px-2 py-0.5 bg-white/10 rounded-full">
                  {project.genre}
                </span>
              )}
              {project.entityCount !== undefined && (
                <span>{project.entityCount} entities</span>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => handleRemove(e, project.path)}
            className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
            title="Remove from recent"
          >
            <TrashIcon size={16} />
          </button>
        </button>
      ))}
    </div>
  );
}

// Dropdown version for header/toolbar
interface RecentProjectsDropdownProps {
  onOpenProject: (path: string) => void;
  trigger: React.ReactNode;
}

export function RecentProjectsDropdown({ onOpenProject, trigger }: RecentProjectsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    setProjects(getRecentProjects());

    const unsubscribe = recentProjectsManager.subscribe(() => {
      setProjects(getRecentProjects());
    });

    return unsubscribe;
  }, []);

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-panel border border-subtle rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-subtle flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">Recent Projects</span>
              {projects.length > 0 && (
                <button
                  onClick={() => {
                    recentProjectsManager.clear();
                    setIsOpen(false);
                  }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {projects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">No recent projects</p>
                </div>
              ) : (
                <RecentProjects
                  onOpenProject={(path) => {
                    onOpenProject(path);
                    setIsOpen(false);
                  }}
                  compact
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
