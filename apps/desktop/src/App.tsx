import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import type { GameSpec } from '@promptplay/shared-types';
import GameCanvas from './components/GameCanvas';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import SceneTree from './components/SceneTree';
import Inspector from './components/Inspector';
import { useFileWatcher } from './hooks/useFileWatcher';

type ViewMode = 'game' | 'code';
type LeftPanelMode = 'files' | 'scene';

function App() {
  const [gameSpec, setGameSpec] = useState<GameSpec | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('game');
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('files');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Handle entity selection - auto switch to Scene tab
  const handleEntitySelect = useCallback((entityName: string | null) => {
    setSelectedEntity(entityName);
    if (entityName) {
      setLeftPanelMode('scene');
    }
  }, []);

  // Handle file changes from file watcher
  const handleFileChanged = useCallback(async (filePath: string) => {
    const fileName = filePath.split('/').pop() || '';

    // Auto-reload game.json
    if (fileName === 'game.json' && projectPath) {
      try {
        const gameJsonStr = await invoke<string>('load_game_spec', {
          projectPath,
        });
        const spec = JSON.parse(gameJsonStr) as GameSpec;
        setGameSpec(spec);
        setNotification('Game reloaded');
        setTimeout(() => setNotification(null), 2000);
      } catch (err) {
        console.error('Failed to reload game:', err);
      }
    } else {
      // Show notification for other files
      setNotification(`${fileName} changed`);
      setTimeout(() => setNotification(null), 2000);
    }
  }, [projectPath]);

  // Set up file watcher
  useFileWatcher({
    projectPath,
    onFileChanged: handleFileChanged,
  });

  const openProject = async () => {
    let gameJsonStr = '';
    try {
      setLoading(true);
      setError(null);

      // Open directory picker
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Game Project',
      });

      if (!selected || typeof selected !== 'string') {
        setLoading(false);
        return;
      }

      setProjectPath(selected);

      // Load game.json from the selected directory
      gameJsonStr = await invoke<string>('load_game_spec', {
        projectPath: selected,
      });

      console.log('Raw game.json string:', gameJsonStr);
      console.log('String length:', gameJsonStr.length);
      const spec = JSON.parse(gameJsonStr) as GameSpec;
      console.log('Parsed game spec:', spec);
      setGameSpec(spec);
      setIsPlaying(true);
      setLoading(false);
    } catch (err) {
      console.error('Full error:', err);
      console.error('Game JSON string:', gameJsonStr);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    if (gameSpec) {
      // Force re-render by creating new object
      setGameSpec({ ...gameSpec });
      setIsPlaying(true);
    }
  };

  const handleFileSave = async (filePath: string, content: string) => {
    // If game.json was saved, reload the game spec
    if (filePath.endsWith('/game.json')) {
      try {
        const spec = JSON.parse(content) as GameSpec;
        setGameSpec(spec);
        setError(null);
      } catch (err) {
        setError('Invalid game.json: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleUpdateEntity = async (entityName: string, updates: any) => {
    if (!gameSpec || !projectPath) return;

    try {
      // Update the game spec with modified entity
      const updatedEntities = gameSpec.entities?.map((entity) =>
        entity.name === entityName ? { ...entity, ...updates } : entity
      );

      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      // Save to game.json file
      const gameJsonPath = `${projectPath}/game.json`;
      const gameJsonContent = JSON.stringify(updatedSpec, null, 2);

      await invoke('write_file', {
        path: gameJsonPath,
        content: gameJsonContent,
      });

      // Update state
      setGameSpec(updatedSpec);
      setNotification('Entity updated');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to update entity:', err);
      setError('Failed to save entity changes: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreateEntity = async () => {
    if (!gameSpec || !projectPath) return;

    try {
      // Generate unique name
      const baseName = 'entity';
      let counter = 1;
      const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
      while (existingNames.has(`${baseName}${counter}`)) {
        counter++;
      }
      const newName = `${baseName}${counter}`;

      // Create new entity with default components
      const newEntity = {
        name: newName,
        components: {
          transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 32, height: 32, tint: 8421504 },
        },
        tags: [],
      };

      const updatedSpec = {
        ...gameSpec,
        entities: [...(gameSpec.entities || []), newEntity],
      };

      // Save to file
      const gameJsonPath = `${projectPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(updatedSpec, null, 2),
      });

      setGameSpec(updatedSpec);
      setSelectedEntity(newName);
      setLeftPanelMode('scene');
      setNotification('Entity created');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to create entity:', err);
      setError('Failed to create entity: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteEntity = async (entityName: string) => {
    if (!gameSpec || !projectPath) return;

    try {
      const updatedEntities = gameSpec.entities?.filter((e) => e.name !== entityName) || [];

      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      // Save to file
      const gameJsonPath = `${projectPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(updatedSpec, null, 2),
      });

      setGameSpec(updatedSpec);
      if (selectedEntity === entityName) {
        setSelectedEntity(null);
      }
      setNotification('Entity deleted');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to delete entity:', err);
      setError('Failed to delete entity: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDuplicateEntity = async (entityName: string) => {
    if (!gameSpec || !projectPath) return;

    try {
      const entity = gameSpec.entities?.find((e) => e.name === entityName);
      if (!entity) return;

      // Generate unique name
      let counter = 1;
      const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
      while (existingNames.has(`${entityName}_copy${counter}`)) {
        counter++;
      }
      const newName = `${entityName}_copy${counter}`;

      // Deep clone and offset position
      const newEntity = JSON.parse(JSON.stringify(entity));
      newEntity.name = newName;
      if (newEntity.components?.transform) {
        newEntity.components.transform.x += 50;
        newEntity.components.transform.y += 50;
      }

      const updatedSpec = {
        ...gameSpec,
        entities: [...(gameSpec.entities || []), newEntity],
      };

      // Save to file
      const gameJsonPath = `${projectPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(updatedSpec, null, 2),
      });

      setGameSpec(updatedSpec);
      setSelectedEntity(newName);
      setNotification('Entity duplicated');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to duplicate entity:', err);
      setError('Failed to duplicate entity: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* File Change Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Left Panel - File Tree / Scene Tree */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Panel Mode Tabs */}
        {projectPath && gameSpec && (
          <div className="flex gap-1 bg-gray-100 p-2 border-b border-gray-200">
            <button
              onClick={() => setLeftPanelMode('files')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                leftPanelMode === 'files'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setLeftPanelMode('scene')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                leftPanelMode === 'scene'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scene
            </button>
          </div>
        )}

        {/* Panel Header */}
        {(!projectPath || !gameSpec) && (
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {leftPanelMode === 'files' ? 'Files' : 'Scene'}
            </h2>
            {projectPath && (
              <p className="text-xs text-gray-500 mt-1 truncate" title={projectPath}>
                {projectPath.split('/').pop()}
              </p>
            )}
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {leftPanelMode === 'files' ? (
            <FileTree
              projectPath={projectPath}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          ) : (
            <SceneTree
              gameSpec={gameSpec}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              onCreateEntity={handleCreateEntity}
            />
          )}
        </div>

        {/* Footer Info */}
        {gameSpec && leftPanelMode === 'files' && (
          <div className="p-4 border-t border-gray-200 space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {gameSpec.metadata?.title || 'Untitled Game'}
            </p>
            <p className="text-xs text-gray-500">
              {gameSpec.entities?.length || 0} entities • {gameSpec.systems?.length || 0} systems
            </p>
          </div>
        )}
      </aside>

      {/* Center Panel - Game Canvas / Code Editor */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">PromptPlay Desktop</h1>

            {/* View Mode Tabs */}
            {projectPath && (
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('game')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'game'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Game
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'code'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Code
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openProject}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Loading...' : projectPath ? 'Change Project' : 'Open Project'}
            </button>

            {gameSpec && viewMode === 'game' && (
              <>
                <button
                  onClick={togglePlayPause}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={resetGame}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {!projectPath && !loading && !error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to PromptPlay
                </h2>
                <p className="text-gray-600 mb-8">
                  AI-First 2D Game Engine for Desktop
                </p>
                <button
                  onClick={openProject}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Open Game Project
                </button>
                <p className="text-sm text-gray-500 mt-4">
                  Select a folder containing a game.json file
                </p>
              </div>
            </div>
          )}

          {projectPath && viewMode === 'game' && (
            <GameCanvas
              gameSpec={gameSpec}
              isPlaying={isPlaying}
              selectedEntity={selectedEntity}
              onEntitySelect={handleEntitySelect}
              onReset={resetGame}
            />
          )}

          {projectPath && viewMode === 'code' && (
            <CodeEditor
              filePath={selectedFile}
              onSave={handleFileSave}
            />
          )}
        </div>
      </main>

      {/* Right Panel - Inspector */}
      <aside className="w-80 bg-white border-l border-gray-200">
        {viewMode === 'game' && gameSpec ? (
          <Inspector
            gameSpec={gameSpec}
            selectedEntity={selectedEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
            onDuplicateEntity={handleDuplicateEntity}
          />
        ) : viewMode === 'code' && selectedFile ? (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">File Info</h2>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Path</h3>
            <p className="text-xs text-gray-500 break-all">{selectedFile}</p>
          </div>
        ) : (
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspector</h2>
            <p className="text-sm text-gray-500">
              {projectPath ? 'Select an entity or open a file' : 'Open a project to view details'}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default App;
