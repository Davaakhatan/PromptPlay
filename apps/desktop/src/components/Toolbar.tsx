import { SaveIcon, UndoIcon, RedoIcon, NewProjectIcon, AIIcon, ExportIcon, LoadingSpinner } from './Icons';

interface ToolbarProps {
  projectPath: string | null;
  viewMode: 'game' | 'code';
  isPlaying: boolean;
  loading: boolean;
  isExporting: boolean;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showAIPanel: boolean;
  hasGameSpec: boolean;

  onViewModeChange: (mode: 'game' | 'code') => void;
  onTogglePlayPause: () => void;
  onReset: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleAI: () => void;
  onExport: () => void;
}

export default function Toolbar({
  projectPath,
  viewMode,
  isPlaying,
  loading,
  isExporting,
  hasUnsavedChanges,
  canUndo,
  canRedo,
  showAIPanel,
  hasGameSpec,
  onViewModeChange,
  onTogglePlayPause,
  onReset,
  onNewProject,
  onOpenProject,
  onSave,
  onUndo,
  onRedo,
  onToggleAI,
  onExport,
}: ToolbarProps) {
  return (
    <div className="bg-panel border-b border-subtle h-10 flex items-center justify-between px-2 backdrop-blur-md sticky top-0 z-10">
      {/* Left: View Mode Tabs */}
      <div className="flex items-center gap-1">
        {projectPath && (
          <div className="flex bg-subtle/50 rounded p-0.5">
            <button
              onClick={() => onViewModeChange('game')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'game'
                  ? 'bg-white/10 text-white'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Game
            </button>
            <button
              onClick={() => onViewModeChange('code')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'code'
                  ? 'bg-white/10 text-white'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Code
            </button>
          </div>
        )}
      </div>

      {/* Center: Play Controls */}
      {hasGameSpec && viewMode === 'game' && (
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePlayPause}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={onReset}
            className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-all"
            title="Reset"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-0.5">
        {/* File operations */}
        <button
          onClick={onNewProject}
          className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-all"
          title="New Project (Cmd+N)"
        >
          <NewProjectIcon size={14} />
        </button>
        <button
          onClick={onOpenProject}
          disabled={loading}
          className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-50 transition-all"
          title="Open Project (Cmd+O)"
        >
          {loading ? (
            <LoadingSpinner size={14} />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          )}
        </button>

        {projectPath && (
          <>
            <div className="w-px h-4 bg-subtle mx-1" />

            {/* Save */}
            <button
              onClick={onSave}
              className={`relative w-7 h-7 rounded flex items-center justify-center transition-all ${
                hasUnsavedChanges
                  ? 'text-amber-400 hover:bg-amber-500/10'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
              }`}
              title={hasUnsavedChanges ? 'Save (Cmd+S) - Unsaved' : 'Save (Cmd+S)'}
            >
              <SaveIcon size={14} />
              {hasUnsavedChanges && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full" />
              )}
            </button>

            {/* Undo/Redo */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={canUndo ? 'Undo (Cmd+Z)' : 'Nothing to undo'}
            >
              <UndoIcon size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={canRedo ? 'Redo (Cmd+Shift+Z)' : 'Nothing to redo'}
            >
              <RedoIcon size={14} />
            </button>

            <div className="w-px h-4 bg-subtle mx-1" />

            {/* AI */}
            <button
              onClick={onToggleAI}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                showAIPanel
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
              }`}
              title="AI Assistant"
            >
              <AIIcon size={14} />
            </button>

            {/* Export */}
            {hasGameSpec && (
              <button
                onClick={onExport}
                disabled={isExporting}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-50 transition-all"
                title="Export as HTML (Cmd+E)"
              >
                {isExporting ? <LoadingSpinner size={14} /> : <ExportIcon size={14} />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
