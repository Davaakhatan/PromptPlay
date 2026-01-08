import { SaveIcon, UndoIcon, RedoIcon, NewProjectIcon, AIIcon, ExportIcon, LoadingSpinner, CameraIcon, SearchIcon, SmartphoneIcon, RocketIcon, BrainIcon, NodeEditorIcon, ShaderIcon, BehaviorTreeIcon, StateMachineIcon } from './Icons';

type ViewMode = 'game' | 'code' | 'nodes' | 'shaders' | 'behavior' | 'states';

interface ToolbarProps {
  projectPath: string | null;
  viewMode: ViewMode;
  isPlaying: boolean;
  loading: boolean;
  isExporting: boolean;
  hasUnsavedChanges: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showAIPanel: boolean;
  hasGameSpec: boolean;
  is3DMode?: boolean;

  onViewModeChange: (mode: ViewMode) => void;
  onTogglePlayPause: () => void;
  onReset: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleAI: () => void;
  onExport: () => void;
  onToggle3DMode?: () => void;
  onScreenshot?: () => void;
  onSearch?: () => void;
  onMobileExport?: () => void;
  onPublish?: () => void;
  onAIPlaytest?: () => void;
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
  is3DMode = false,
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
  onToggle3DMode,
  onScreenshot,
  onSearch,
  onMobileExport,
  onPublish,
  onAIPlaytest,
}: ToolbarProps) {
  return (
    <div className="bg-panel border-b border-subtle h-10 flex items-center justify-between px-2 backdrop-blur-md sticky top-0 z-10">
      {/* Left: View Mode Tabs */}
      <div className="flex items-center gap-2">
        {projectPath && (
          <>
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
              <button
                onClick={() => onViewModeChange('nodes')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'nodes'
                    ? 'bg-white/10 text-white'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="Visual Script Editor (Cmd+6)"
              >
                <NodeEditorIcon size={12} />
                Nodes
              </button>
            </div>

            {/* Advanced Editors Dropdown/Buttons */}
            <div className="flex bg-subtle/50 rounded p-0.5 ml-1">
              <button
                onClick={() => onViewModeChange('shaders')}
                className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'shaders'
                    ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="Shader Graph Editor (Cmd+7)"
                aria-label="Shader Graph Editor"
              >
                <ShaderIcon size={12} />
              </button>
              <button
                onClick={() => onViewModeChange('behavior')}
                className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'behavior'
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="Behavior Tree Editor (Cmd+8)"
                aria-label="Behavior Tree Editor"
              >
                <BehaviorTreeIcon size={12} />
              </button>
              <button
                onClick={() => onViewModeChange('states')}
                className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                  viewMode === 'states'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="State Machine Editor (Cmd+9)"
                aria-label="State Machine Editor"
              >
                <StateMachineIcon size={12} />
              </button>
            </div>

            {/* 2D/3D Mode Toggle */}
            {viewMode === 'game' && hasGameSpec && onToggle3DMode && (
              <button
                onClick={onToggle3DMode}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                  is3DMode
                    ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                    : 'bg-subtle/50 text-text-secondary hover:bg-subtle hover:text-text-primary'
                }`}
                title="Toggle 2D/3D Mode (Cmd+Shift+M)"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {is3DMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  )}
                </svg>
                {is3DMode ? '3D' : '2D'}
              </button>
            )}
          </>
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
            aria-label={isPlaying ? 'Pause game' : 'Play game'}
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
            aria-label="Reset game"
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
          aria-label="Create new project"
        >
          <NewProjectIcon size={14} />
        </button>
        <button
          onClick={onOpenProject}
          disabled={loading}
          className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-50 transition-all"
          title="Open Project (Cmd+O)"
          aria-label="Open project"
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
              aria-label={hasUnsavedChanges ? 'Save project (unsaved changes)' : 'Save project'}
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
              aria-label="Undo"
              aria-disabled={!canUndo}
            >
              <UndoIcon size={14} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={canRedo ? 'Redo (Cmd+Shift+Z)' : 'Nothing to redo'}
              aria-label="Redo"
              aria-disabled={!canRedo}
            >
              <RedoIcon size={14} />
            </button>

            <div className="w-px h-4 bg-subtle mx-1" />

            {/* Search */}
            {hasGameSpec && onSearch && (
              <button
                onClick={onSearch}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-all"
                title="Search Entities (Cmd+K)"
                aria-label="Search entities"
              >
                <SearchIcon size={14} />
              </button>
            )}

            {/* Screenshot */}
            {hasGameSpec && onScreenshot && viewMode === 'game' && (
              <button
                onClick={onScreenshot}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-all"
                title="Take Screenshot"
                aria-label="Take screenshot"
              >
                <CameraIcon size={14} />
              </button>
            )}

            {/* AI */}
            <button
              onClick={onToggleAI}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                showAIPanel
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
              }`}
              title="AI Assistant"
              aria-label={showAIPanel ? 'Hide AI assistant' : 'Show AI assistant'}
              aria-pressed={showAIPanel}
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
                aria-label={isExporting ? 'Exporting...' : 'Export as HTML'}
              >
                {isExporting ? <LoadingSpinner size={14} /> : <ExportIcon size={14} />}
              </button>
            )}

            {/* Mobile Export */}
            {hasGameSpec && onMobileExport && (
              <button
                onClick={onMobileExport}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                title="Mobile Export (PWA)"
                aria-label="Export for mobile"
              >
                <SmartphoneIcon size={14} />
              </button>
            )}

            {/* Publish */}
            {hasGameSpec && onPublish && (
              <button
                onClick={onPublish}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-orange-400 hover:bg-orange-500/10 transition-all"
                title="Publish Game"
                aria-label="Publish game"
              >
                <RocketIcon size={14} />
              </button>
            )}

            {/* AI Playtest */}
            {hasGameSpec && onAIPlaytest && (
              <button
                onClick={onAIPlaytest}
                className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                title="AI Playtest"
                aria-label="AI playtest"
              >
                <BrainIcon size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
