import { useState, useEffect, useCallback } from 'react';
import { cloudSaveService } from '../services/CloudSaveService';
import { useAuth } from '../hooks/useAuth';
import type { CloudProject } from '../lib/supabase';
import type { GameSpec } from '@promptplay/shared-types';

interface CloudProjectsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentGameSpec: GameSpec | null;
  onLoadProject: (spec: GameSpec, name: string) => void;
}

type Tab = 'my-projects' | 'community' | 'save';

export function CloudProjectsDialog({
  isOpen,
  onClose,
  currentGameSpec,
  onLoadProject,
}: CloudProjectsDialogProps) {
  useAuth(); // Ensure user is authenticated
  const [activeTab, setActiveTab] = useState<Tab>('my-projects');
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags] = useState<string[]>([]);

  // Save form state
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveIsPublic, setSaveIsPublic] = useState(false);
  const [saveTags, setSaveTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (activeTab === 'my-projects') {
        result = await cloudSaveService.getMyProjects();
      } else {
        result = await cloudSaveService.getPublicProjects({
          search: searchQuery || undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          sortBy: 'recent',
          limit: 50,
        });
      }

      if (result.success && result.projects) {
        setProjects(result.projects);
      } else {
        setError(result.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, selectedTags]);

  useEffect(() => {
    if (isOpen && activeTab !== 'save') {
      loadProjects();
    }
  }, [isOpen, activeTab, loadProjects]);

  const handleLoadProject = async (project: CloudProject) => {
    try {
      const result = await cloudSaveService.loadProject(project.id);
      if (result.success && result.project) {
        onLoadProject(result.project.game_spec as unknown as GameSpec, result.project.name);
        onClose();
      } else {
        setError(result.error || 'Failed to load project');
      }
    } catch (err) {
      setError('Failed to load project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const result = await cloudSaveService.deleteProject(projectId);
      if (result.success) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        setError(result.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const handleForkProject = async (project: CloudProject) => {
    const newName = prompt('Enter a name for your fork:', `${project.name} (Fork)`);
    if (!newName) return;

    try {
      const result = await cloudSaveService.forkProject(project.id, newName);
      if (result.success) {
        setActiveTab('my-projects');
        loadProjects();
      } else {
        setError(result.error || 'Failed to fork project');
      }
    } catch (err) {
      setError('Failed to fork project');
    }
  };

  const handleSave = async () => {
    if (!currentGameSpec || !saveName.trim()) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const result = await cloudSaveService.saveProject(saveName.trim(), currentGameSpec, {
        description: saveDescription.trim() || undefined,
        isPublic: saveIsPublic,
        tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
      });

      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveName('');
          setSaveDescription('');
          setSaveIsPublic(false);
          setSaveTags('');
          setSaveSuccess(false);
          setActiveTab('my-projects');
        }, 1500);
      } else {
        setError(result.error || 'Failed to save project');
      }
    } catch (err) {
      setError('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-subtle rounded-xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cloud Projects</h2>
              <p className="text-sm text-text-secondary">Save, load, and share projects</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-subtle">
          <button
            onClick={() => setActiveTab('my-projects')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'my-projects'
                ? 'text-white border-b-2 border-cyan-500'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'community'
                ? 'text-white border-b-2 border-cyan-500'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            Community
          </button>
          {currentGameSpec && (
            <button
              onClick={() => setActiveTab('save')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'save'
                  ? 'text-white border-b-2 border-cyan-500'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              Save Current
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'save' ? (
            <div className="max-w-md mx-auto">
              {saveSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">Project Saved!</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="My Awesome Game"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Description</label>
                    <textarea
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 resize-none"
                      rows={3}
                      placeholder="A brief description of your game..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={saveTags}
                      onChange={(e) => setSaveTags(e.target.value)}
                      className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="platformer, 2d, action"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={saveIsPublic}
                      onChange={(e) => setSaveIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded border-subtle bg-surface text-cyan-500 focus:ring-cyan-500"
                    />
                    <label htmlFor="isPublic" className="text-sm text-text-secondary">
                      Make this project public (share with community)
                    </label>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!saveName.trim() || isSaving}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 text-white font-medium rounded-lg transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save to Cloud'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Search (for community) */}
              {activeTab === 'community' && (
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-subtle rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Search projects..."
                  />
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-secondary">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Projects Found</h3>
                  <p className="text-text-secondary">
                    {activeTab === 'my-projects'
                      ? 'Save your first project to the cloud!'
                      : 'No community projects match your search.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isOwner={activeTab === 'my-projects'}
                      onLoad={() => handleLoadProject(project)}
                      onDelete={() => handleDeleteProject(project.id)}
                      onFork={() => handleForkProject(project)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isOwner,
  onLoad,
  onDelete,
  onFork,
}: {
  project: CloudProject;
  isOwner: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onFork: () => void;
}) {
  return (
    <div className="bg-surface border border-subtle rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors group">
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onLoad}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition-colors"
          >
            Open
          </button>
          {!isOwner && (
            <button
              onClick={onFork}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
            >
              Fork
            </button>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-white truncate">{project.name}</h3>
            {project.description && (
              <p className="text-sm text-text-secondary line-clamp-2 mt-1">{project.description}</p>
            )}
          </div>
          {project.is_public && (
            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
              Public
            </span>
          )}
        </div>

        {/* Tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="text-xs text-text-tertiary">+{project.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {project.downloads}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {project.likes}
          </span>
          <span className="ml-auto">
            {new Date(project.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CloudProjectsDialog;
