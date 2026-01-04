import { useState, useCallback, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { GameSpec, SceneSpec, EntitySpec, Game3DSpec } from '@promptplay/shared-types';
import GameCanvas from './components/GameCanvas';
import GameCanvas3D from './components/GameCanvas3D';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import SceneTree from './components/SceneTree';
import SceneManager from './components/SceneManager';
import PrefabLibrary from './components/PrefabLibrary';
import Inspector from './components/Inspector';
import JSONEditorPanel from './components/JSONEditorPanel';
import AIPromptPanel from './components/AIPromptPanel';
import AssetBrowser from './components/AssetBrowser';
import WelcomeScreen from './components/WelcomeScreen';
import ErrorDisplay from './components/ErrorDisplay';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import PhysicsSettings from './components/PhysicsSettings';
import ScriptRunner from './components/ScriptRunner';
import { SaveAsTemplateModal } from './components/SaveAsTemplateModal';
import Toolbar from './components/Toolbar';
import { EntitySearch, useEntitySearchShortcut } from './components/EntitySearch';
import { useFileWatcher } from './hooks/useFileWatcher';
import { useHistoryState } from './hooks/useHistoryState';
import { useEntityOperations } from './hooks/useEntityOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { addRecentProject } from './services/RecentProjectsService';
import { screenCapture } from './services/ScreenCaptureService';
import { CodeIcon, CheckIcon, FolderIcon, SceneIcon, EntityIcon, LayersIcon, ImageIcon, PhysicsIcon, GridIcon } from './components/Icons';
import TilemapEditor, { Tilemap } from './components/TilemapEditor';

type ViewMode = 'game' | 'code';
type LeftPanelMode = 'files' | 'scenes' | 'entities' | 'prefabs' | 'assets' | 'tilemap';
type RightPanelMode = 'inspector' | 'json' | 'physics' | 'scripts';

function App() {
  const [gameSpec, setGameSpec] = useState<GameSpec | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('game');
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('files');
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('inspector');
  const [isExporting, setIsExporting] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [clipboardEntity, setClipboardEntity] = useState<any>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showSaveAsTemplateModal, setShowSaveAsTemplateModal] = useState(false);
  const [showEntitySearch, setShowEntitySearch] = useState(false);
  const [currentTilemap, setCurrentTilemap] = useState<Tilemap | null>(null);

  // Entity search shortcut (Cmd/Ctrl+K)
  useEntitySearchShortcut(() => {
    if (gameSpec) {
      setShowEntitySearch(true);
    }
  });

  // History management
  const {
    canUndo,
    canRedo,
    pushHistory,
    handleUndo,
    handleRedo,
    initializeHistory,
  } = useHistoryState({
    onGameSpecChange: setGameSpec,
    onUnsavedChange: setHasUnsavedChanges,
    onNotification: setNotification,
  });

  // Primary selected entity (first in set, for single-entity operations)
  const selectedEntity = selectedEntities.size > 0 ? Array.from(selectedEntities)[0] : null;

  // Helper to update single selected entity
  const setSelectedEntity = useCallback((name: string | null) => {
    if (name) {
      setSelectedEntities(new Set([name]));
    } else {
      setSelectedEntities(new Set());
    }
  }, []);

  // Entity operations
  const {
    handleUpdateEntity,
    handleCreateEntity,
    handleDeleteEntity,
    handleDuplicateEntity,
    handleRenameEntity,
    handleApplyAIChanges,
  } = useEntityOperations({
    gameSpec,
    selectedEntity,
    onGameSpecChange: setGameSpec,
    onSelectedEntityChange: setSelectedEntity,
    onUnsavedChange: setHasUnsavedChanges,
    onNotification: setNotification,
    onLeftPanelModeChange: setLeftPanelMode,
    pushHistory,
  });

  // Multi-entity selection handlers
  const handleEntitySelect = useCallback((entityName: string | null, options?: { ctrlKey?: boolean; shiftKey?: boolean }) => {
    if (!entityName) {
      setSelectedEntities(new Set());
      return;
    }

    if (options?.ctrlKey) {
      // Toggle selection
      setSelectedEntities(prev => {
        const next = new Set(prev);
        if (next.has(entityName)) {
          next.delete(entityName);
        } else {
          next.add(entityName);
        }
        return next;
      });
    } else if (options?.shiftKey && gameSpec?.entities) {
      // Range selection
      const entities = gameSpec.entities;
      const entityNames = entities.map(e => e.name);
      const lastSelected = selectedEntity;

      if (lastSelected && entityNames.includes(lastSelected)) {
        const startIdx = entityNames.indexOf(lastSelected);
        const endIdx = entityNames.indexOf(entityName);
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const rangeNames = entityNames.slice(from, to + 1);
        setSelectedEntities(prev => {
          const next = new Set(prev);
          rangeNames.forEach(name => next.add(name));
          return next;
        });
      } else {
        setSelectedEntities(new Set([entityName]));
      }
    } else {
      // Single selection
      setSelectedEntities(new Set([entityName]));
    }

    if (entityName) {
      setLeftPanelMode('entities');
    }
  }, [gameSpec, selectedEntity]);

  // Select all entities
  const handleSelectAll = useCallback(() => {
    if (gameSpec?.entities) {
      setSelectedEntities(new Set(gameSpec.entities.map(e => e.name)));
    }
  }, [gameSpec]);

  // Delete all selected entities
  const handleDeleteSelected = useCallback(() => {
    if (!gameSpec || selectedEntities.size === 0) return;

    const updatedEntities = gameSpec.entities?.filter(e => !selectedEntities.has(e.name)) || [];
    const updatedSpec = { ...gameSpec, entities: updatedEntities };

    pushHistory(updatedSpec, `Delete ${selectedEntities.size} entities`);
    setGameSpec(updatedSpec);
    setSelectedEntities(new Set());
    setHasUnsavedChanges(true);
    setNotification(`Deleted ${selectedEntities.size} entities`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, selectedEntities, pushHistory]);

  // Duplicate all selected entities
  const handleDuplicateSelected = useCallback(() => {
    if (!gameSpec || selectedEntities.size === 0) return;

    const existingNames = new Set(gameSpec.entities?.map(e => e.name) || []);
    const newEntities: any[] = [];
    const selectedArray = Array.from(selectedEntities);

    selectedArray.forEach(entityName => {
      const entity = gameSpec.entities?.find(e => e.name === entityName);
      if (!entity) return;

      let counter = 1;
      while (existingNames.has(`${entityName}_copy${counter}`)) {
        counter++;
      }
      const newName = `${entityName}_copy${counter}`;
      existingNames.add(newName);

      const newEntity = JSON.parse(JSON.stringify(entity));
      newEntity.name = newName;
      if (newEntity.components?.transform) {
        newEntity.components.transform.x += 50;
        newEntity.components.transform.y += 50;
      }
      newEntities.push(newEntity);
    });

    const updatedSpec = {
      ...gameSpec,
      entities: [...(gameSpec.entities || []), ...newEntities],
    };

    pushHistory(updatedSpec, `Duplicate ${selectedEntities.size} entities`);
    setGameSpec(updatedSpec);
    setSelectedEntities(new Set(newEntities.map(e => e.name)));
    setHasUnsavedChanges(true);
    setNotification(`Duplicated ${selectedEntities.size} entities`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, selectedEntities, pushHistory]);

  // Scene management handlers
  const handleSwitchScene = useCallback((sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedEntities(new Set());
    setNotification(`Switched to scene`);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  const handleCreateScene = useCallback((name: string) => {
    if (!gameSpec) return;

    const newSceneId = `scene_${Date.now()}`;
    const newScene: SceneSpec = {
      id: newSceneId,
      name,
      entities: [],
    };

    // If no scenes exist yet, convert entities to first scene
    let updatedScenes: SceneSpec[];
    if (!gameSpec.scenes || gameSpec.scenes.length === 0) {
      const mainScene: SceneSpec = {
        id: 'main',
        name: 'Main Scene',
        entities: gameSpec.entities || [],
      };
      updatedScenes = [mainScene, newScene];
    } else {
      updatedScenes = [...gameSpec.scenes, newScene];
    }

    const updatedSpec: GameSpec = {
      ...gameSpec,
      scenes: updatedScenes,
      activeScene: newSceneId,
      entities: [], // Clear root entities when using scenes
    };

    pushHistory(updatedSpec, `Create scene "${name}"`);
    setGameSpec(updatedSpec);
    setActiveSceneId(newSceneId);
    setHasUnsavedChanges(true);
    setNotification(`Created scene "${name}"`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, pushHistory]);

  const handleRenameScene = useCallback((sceneId: string, newName: string) => {
    if (!gameSpec?.scenes) return;

    const updatedScenes = gameSpec.scenes.map(scene =>
      scene.id === sceneId ? { ...scene, name: newName } : scene
    );

    const updatedSpec: GameSpec = {
      ...gameSpec,
      scenes: updatedScenes,
    };

    pushHistory(updatedSpec, `Rename scene to "${newName}"`);
    setGameSpec(updatedSpec);
    setHasUnsavedChanges(true);
  }, [gameSpec, pushHistory]);

  const handleDeleteScene = useCallback((sceneId: string) => {
    if (!gameSpec?.scenes || gameSpec.scenes.length <= 1) return;

    const updatedScenes = gameSpec.scenes.filter(scene => scene.id !== sceneId);
    const deletedScene = gameSpec.scenes.find(s => s.id === sceneId);

    // If deleting active scene, switch to first available
    let newActiveScene = activeSceneId;
    if (activeSceneId === sceneId) {
      newActiveScene = updatedScenes[0]?.id || null;
    }

    const updatedSpec: GameSpec = {
      ...gameSpec,
      scenes: updatedScenes,
      activeScene: newActiveScene || undefined,
    };

    pushHistory(updatedSpec, `Delete scene "${deletedScene?.name || sceneId}"`);
    setGameSpec(updatedSpec);
    setActiveSceneId(newActiveScene);
    setHasUnsavedChanges(true);
    setNotification(`Deleted scene`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, activeSceneId, pushHistory]);

  const handleDuplicateScene = useCallback((sceneId: string) => {
    if (!gameSpec?.scenes) return;

    const sourceScene = gameSpec.scenes.find(s => s.id === sceneId);
    if (!sourceScene) return;

    const newSceneId = `scene_${Date.now()}`;
    const newScene: SceneSpec = {
      id: newSceneId,
      name: `${sourceScene.name} Copy`,
      entities: JSON.parse(JSON.stringify(sourceScene.entities)),
      config: sourceScene.config ? { ...sourceScene.config } : undefined,
    };

    const updatedSpec: GameSpec = {
      ...gameSpec,
      scenes: [...gameSpec.scenes, newScene],
    };

    pushHistory(updatedSpec, `Duplicate scene "${sourceScene.name}"`);
    setGameSpec(updatedSpec);
    setHasUnsavedChanges(true);
    setNotification(`Duplicated scene`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, pushHistory]);

  // Prefab instantiation handler
  const handleInstantiatePrefab = useCallback((entity: EntitySpec) => {
    if (!gameSpec) return;

    // Generate unique name
    const baseName = entity.name;
    let counter = 1;
    const existingNames = new Set(gameSpec.entities?.map(e => e.name) || []);
    let newName = baseName;
    while (existingNames.has(newName)) {
      newName = `${baseName}${counter}`;
      counter++;
    }

    const newEntity: EntitySpec = {
      ...entity,
      name: newName,
    };

    const updatedSpec = {
      ...gameSpec,
      entities: [...(gameSpec.entities || []), newEntity],
    };

    pushHistory(updatedSpec, `Instantiate prefab "${newName}"`);
    setGameSpec(updatedSpec);
    setSelectedEntities(new Set([newName]));
    setHasUnsavedChanges(true);
    setLeftPanelMode('entities');
    setNotification(`Created "${newName}" from prefab`);
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, pushHistory]);

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

  const openProject = useCallback(async (path?: string) => {
    let gameJsonStr = '';
    try {
      setLoading(true);
      setError(null);

      let selected = path;

      // If no path provided, show dialog
      if (!selected) {
        const dialogResult = await open({
          directory: true,
          multiple: false,
          title: 'Open Game Project',
        });

        if (!dialogResult || typeof dialogResult !== 'string') {
          setLoading(false);
          return;
        }
        selected = dialogResult;
      }

      setProjectPath(selected);
      gameJsonStr = await invoke<string>('load_game_spec', { projectPath: selected });
      const spec = JSON.parse(gameJsonStr) as GameSpec;

      setGameSpec(spec);
      setIsPlaying(false);
      setLoading(false);
      setHasUnsavedChanges(false);
      setSelectedEntities(new Set());
      // Initialize active scene if project has scenes
      if (spec.scenes && spec.scenes.length > 0) {
        setActiveSceneId(spec.activeScene || spec.scenes[0].id);
      } else {
        setActiveSceneId(null);
      }
      initializeHistory(spec);

      // Track in recent projects
      const projectName = spec.metadata?.title || selected.split('/').pop() || 'Untitled';
      addRecentProject({
        path: selected,
        name: projectName,
        genre: spec.metadata?.genre,
        entityCount: spec.entities?.length || 0,
      });
    } catch (err) {
      console.error('Failed to open project:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      setIsPlaying(false);
    }
  }, [initializeHistory]);

  // Import a game.json file directly
  const importGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const selected = await open({
        multiple: false,
        title: 'Import Game',
        filters: [
          { name: 'Game Files', extensions: ['json', 'promptplay'] },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        setLoading(false);
        return;
      }

      // Read the file
      const fileContent = await invoke<string>('read_file', { path: selected });
      const spec = JSON.parse(fileContent) as GameSpec;

      // Validate it looks like a game spec
      if (!spec.version && !spec.entities && !spec.metadata) {
        throw new Error('Invalid game file format');
      }

      // Set the project path to the parent directory of the file
      const pathParts = selected.split('/');
      pathParts.pop(); // Remove filename
      const parentDir = pathParts.join('/');

      setProjectPath(parentDir);
      setGameSpec(spec);
      setIsPlaying(false);
      setLoading(false);
      setHasUnsavedChanges(false);
      setSelectedEntities(new Set());

      if (spec.scenes && spec.scenes.length > 0) {
        setActiveSceneId(spec.activeScene || spec.scenes[0].id);
      } else {
        setActiveSceneId(null);
      }

      initializeHistory(spec);
      setNotification('Game imported successfully');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to import game:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [initializeHistory]);

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

  // Save project to disk
  const saveProject = async () => {
    if (!gameSpec || !projectPath) return;

    try {
      const gameJsonPath = `${projectPath}/game.json`;
      const gameJsonContent = JSON.stringify(gameSpec, null, 2);

      await invoke('write_file', {
        path: gameJsonPath,
        content: gameJsonContent,
      });

      setHasUnsavedChanges(false);
      setNotification('Saved');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('Failed to save project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Save project to a new location
  const saveProjectAs = async () => {
    if (!gameSpec) return;

    try {
      // Ask user where to save
      const selectedPath = await save({
        title: 'Save Project As',
        defaultPath: gameSpec.metadata?.title || 'my-game',
      });

      if (!selectedPath) return;

      // Create project directory
      await invoke('create_directory', { path: selectedPath });

      // Save game.json
      const gameJsonPath = `${selectedPath}/game.json`;
      const gameJsonContent = JSON.stringify(gameSpec, null, 2);

      await invoke('write_file', {
        path: gameJsonPath,
        content: gameJsonContent,
      });

      // Update project path to new location
      setProjectPath(selectedPath);
      setHasUnsavedChanges(false);
      setNotification('Saved to ' + selectedPath.split('/').pop());
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('Failed to save project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Create new project
  const createNewProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      // Ask user where to save
      const selectedPath = await save({
        title: 'Create New Project',
        defaultPath: newProjectName,
      });

      if (!selectedPath) return;

      // Create project directory
      await invoke('create_directory', { path: selectedPath });

      // Create default game.json
      const defaultSpec: GameSpec = {
        version: '1.0.0',
        metadata: {
          title: newProjectName,
          genre: 'platformer',
          description: 'A new game created with PromptPlay',
        },
        config: {
          gravity: { x: 0, y: 1 },
          worldBounds: { width: 800, height: 600 },
        },
        entities: [
          {
            name: 'player',
            components: {
              transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
              sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
              velocity: { vx: 0, vy: 0 },
              collider: { type: 'box', width: 32, height: 32 },
              input: { moveSpeed: 200, jumpForce: 400 },
            },
            tags: ['player'],
          },
          {
            name: 'ground',
            components: {
              transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
              sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
              collider: { type: 'box', width: 800, height: 40 },
            },
            tags: ['ground', 'platform'],
          },
        ],
        systems: ['input', 'physics', 'collision', 'render'],
      };

      const gameJsonPath = `${selectedPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(defaultSpec, null, 2),
      });

      // Load the new project
      setProjectPath(selectedPath);
      setGameSpec(defaultSpec);
      setIsPlaying(false);
      setHasUnsavedChanges(false);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setActiveSceneId(null); // New projects start without scenes
      setSelectedEntities(new Set());
      initializeHistory(defaultSpec);

      setNotification('Project created');
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Failed to create project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Template specs for different game types
  const getTemplateSpec = (templateId: string, projectName: string): GameSpec => {
    const baseSpec = {
      version: '1.0.0',
      metadata: {
        title: projectName,
        genre: 'platformer' as const,
        description: `A ${templateId} game created with PromptPlay`,
      },
      config: {
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
      systems: ['input', 'physics', 'collision', 'render'],
    };

    switch (templateId) {
      case 'platformer':
        return {
          ...baseSpec,
          metadata: { ...baseSpec.metadata, genre: 'platformer' },
          entities: [
            {
              name: 'player',
              components: {
                transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 32, height: 48, tint: 0x4488ff },
                velocity: { vx: 0, vy: 0 },
                collider: { type: 'box', width: 32, height: 48 },
                input: { moveSpeed: 200, jumpForce: -400 },
              },
              tags: ['player'],
            },
            {
              name: 'ground',
              components: {
                transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
                collider: { type: 'box', width: 800, height: 40 },
              },
              tags: ['ground', 'platform'],
            },
            {
              name: 'platform1',
              components: {
                transform: { x: 200, y: 450, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 150, height: 20, tint: 0x886644 },
                collider: { type: 'box', width: 150, height: 20 },
              },
              tags: ['platform'],
            },
            {
              name: 'platform2',
              components: {
                transform: { x: 500, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 150, height: 20, tint: 0x886644 },
                collider: { type: 'box', width: 150, height: 20 },
              },
              tags: ['platform'],
            },
            {
              name: 'coin1',
              components: {
                transform: { x: 200, y: 410, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
                collider: { type: 'box', width: 20, height: 20 },
              },
              tags: ['collectible', 'coin'],
            },
            {
              name: 'coin2',
              components: {
                transform: { x: 500, y: 310, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
                collider: { type: 'box', width: 20, height: 20 },
              },
              tags: ['collectible', 'coin'],
            },
          ],
        };

      case 'shooter':
        return {
          ...baseSpec,
          metadata: { ...baseSpec.metadata, genre: 'shooter' },
          config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
          entities: [
            {
              name: 'player',
              components: {
                transform: { x: 400, y: 500, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 40, height: 40, tint: 0x44aaff },
                velocity: { vx: 0, vy: 0 },
                collider: { type: 'box', width: 40, height: 40 },
                input: { moveSpeed: 300, jumpForce: 0 },
              },
              tags: ['player'],
            },
            {
              name: 'enemy1',
              components: {
                transform: { x: 200, y: 100, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 36, height: 36, tint: 0xff4444 },
                velocity: { vx: 50, vy: 0 },
                collider: { type: 'box', width: 36, height: 36 },
              },
              tags: ['enemy'],
            },
            {
              name: 'enemy2',
              components: {
                transform: { x: 600, y: 150, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 36, height: 36, tint: 0xff4444 },
                velocity: { vx: -50, vy: 0 },
                collider: { type: 'box', width: 36, height: 36 },
              },
              tags: ['enemy'],
            },
            {
              name: 'wall_left',
              components: {
                transform: { x: 10, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 20, height: 600, tint: 0x666666 },
                collider: { type: 'box', width: 20, height: 600 },
              },
              tags: ['wall'],
            },
            {
              name: 'wall_right',
              components: {
                transform: { x: 790, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 20, height: 600, tint: 0x666666 },
                collider: { type: 'box', width: 20, height: 600 },
              },
              tags: ['wall'],
            },
          ],
        };

      case 'puzzle':
        return {
          ...baseSpec,
          metadata: { ...baseSpec.metadata, genre: 'puzzle' },
          config: { ...baseSpec.config, gravity: { x: 0, y: 0 } },
          entities: [
            {
              name: 'player',
              components: {
                transform: { x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 48, height: 48, tint: 0x44aa88 },
                velocity: { vx: 0, vy: 0 },
                collider: { type: 'box', width: 48, height: 48 },
                input: { moveSpeed: 150, jumpForce: 0 },
              },
              tags: ['player'],
            },
            {
              name: 'block1',
              components: {
                transform: { x: 300, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 48, height: 48, tint: 0x8866aa },
                collider: { type: 'box', width: 48, height: 48 },
              },
              tags: ['block', 'pushable'],
            },
            {
              name: 'block2',
              components: {
                transform: { x: 400, y: 200, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 48, height: 48, tint: 0x8866aa },
                collider: { type: 'box', width: 48, height: 48 },
              },
              tags: ['block', 'pushable'],
            },
            {
              name: 'goal',
              components: {
                transform: { x: 700, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 56, height: 56, tint: 0xffdd44 },
                collider: { type: 'box', width: 56, height: 56 },
              },
              tags: ['goal'],
            },
            {
              name: 'wall_top',
              components: {
                transform: { x: 400, y: 20, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 800, height: 40, tint: 0x444444 },
                collider: { type: 'box', width: 800, height: 40 },
              },
              tags: ['wall'],
            },
            {
              name: 'wall_bottom',
              components: {
                transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 800, height: 40, tint: 0x444444 },
                collider: { type: 'box', width: 800, height: 40 },
              },
              tags: ['wall'],
            },
          ],
        };

      case 'empty':
      default:
        return {
          ...baseSpec,
          entities: [
            {
              name: 'player',
              components: {
                transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
                sprite: { texture: 'default', width: 32, height: 32, tint: 0x4488ff },
                velocity: { vx: 0, vy: 0 },
                collider: { type: 'box', width: 32, height: 32 },
                input: { moveSpeed: 200, jumpForce: -400 },
              },
              tags: ['player'],
            },
          ],
        };
    }
  };

  // Create project from template
  const createFromTemplate = async (templateId: string) => {
    const projectName = `${templateId}-game`;

    try {
      // Ask user where to save
      const selectedPath = await save({
        title: `Create ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Project`,
        defaultPath: projectName,
      });

      if (!selectedPath) return;

      // Create project directory
      await invoke('create_directory', { path: selectedPath });

      // Get template spec
      const templateSpec = getTemplateSpec(templateId, projectName);

      // Write game.json
      const gameJsonPath = `${selectedPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(templateSpec, null, 2),
      });

      // Load the new project
      setProjectPath(selectedPath);
      setGameSpec(templateSpec);
      setIsPlaying(false);
      setHasUnsavedChanges(false);
      setActiveSceneId(null); // Templates start without scenes
      setSelectedEntities(new Set());
      initializeHistory(templateSpec);

      setNotification(`${templateId} project created`);
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error('Failed to create project from template:', err);
      setError('Failed to create project: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Convert 2D GameSpec to 3D Game3DSpec for 3D preview
  const convertTo3DSpec = useCallback((spec: GameSpec): Game3DSpec => {
    const worldHeight = spec.config?.worldBounds?.height || 600;
    const worldWidth = spec.config?.worldBounds?.width || 800;
    const scale = 50; // 50 pixels = 1 unit in 3D

    return {
      version: spec.version || '1.0',
      mode: '3d',
      metadata: {
        title: spec.metadata?.title || 'Untitled',
        genre: spec.metadata?.genre || 'other',
        description: spec.metadata?.description || '',
      },
      config: {
        gravity: { x: 0, y: -20, z: 0 },
        worldBounds: {
          width: worldWidth,
          height: worldHeight,
          depth: 800
        },
        backgroundColor: '#1a1a2e',
        ambientColor: '#404040',
        ambientIntensity: 0.5,
      },
      entities: [
        // Add ground plane first - positioned at y=-1 (top surface at y=-0.75)
        {
          name: 'Ground',
          components: {
            transform3d: {
              x: 0,
              y: -1,
              z: 0,
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
            },
            mesh: {
              geometry: 'box' as const,
              width: 40,
              height: 0.5,
              depth: 40,
              castShadow: false,
              receiveShadow: true,
            },
            material: {
              color: '#2a4a2a',
              metallic: 0.1,
              roughness: 0.9,
            },
            collider3d: {
              type: 'box' as const,
              width: 40,
              height: 0.5,
              depth: 40,
            },
            rigidbody3d: {
              type: 'static' as const,
              mass: 0,
            },
          },
          tags: ['ground'],
        },
        // Convert existing entities
        ...(spec.entities || []).map((entity) => {
          const t = entity.components?.transform;
          const s = entity.components?.sprite;
          const input = entity.components?.input;
          const collider = entity.components?.collider;
          const isPlayer = !!input || entity.tags?.includes('player');
          const isStatic = collider?.isStatic || entity.tags?.includes('platform') || entity.tags?.includes('ground');

          const width = (s?.width ?? 32) / scale;
          const height = (s?.height ?? 32) / scale;

          // Convert 2D coordinates to 3D:
          // 2D Y goes down (0 = top, worldHeight = bottom)
          // 3D Y goes up (higher values = higher position)
          // Formula: 3D_y = (worldHeight - 2D_y) / scale - offset
          // This maps 2D bottom (high Y) to just above ground, 2D top (low Y) to high up
          const x3d = (t?.x ?? worldWidth / 2) / scale - worldWidth / scale / 2;
          const y3d = (worldHeight - (t?.y ?? worldHeight / 2)) / scale - 0.5;

          // Base components
          const components: Record<string, unknown> = {
            transform3d: {
              x: x3d,
              y: y3d,
              z: 0,
              rotationX: 0,
              rotationY: 0,
              rotationZ: -(t?.rotation ?? 0),
              scaleX: t?.scaleX ?? 1,
              scaleY: t?.scaleY ?? 1,
              scaleZ: 1,
            },
            mesh: {
              geometry: 'box' as const,
              width,
              height,
              depth: 0.5,
              castShadow: true,
              receiveShadow: true,
            },
            material: {
              color: s?.tint ? `#${s.tint.toString(16).padStart(6, '0')}` : '#4488ff',
              metallic: 0.1,
              roughness: 0.8,
            },
            // Add physics components
            collider3d: {
              type: 'box' as const,
              width,
              height,
              depth: 0.5,
            },
            rigidbody3d: {
              type: isStatic ? 'static' as const : 'dynamic' as const,
              mass: isStatic ? 0 : 1,
              fixedRotation: isPlayer,
            },
            velocity3d: {
              vx: 0,
              vy: 0,
              vz: 0,
            },
          };

          // Add input for player entities
          if (isPlayer) {
            // Scale 2D values to 3D units:
            // 2D uses pixels, 3D uses meters (with scale factor)
            // In 2D, jumpForce is negative (Canvas Y down), in 3D it must be positive (Y up)
            const rawMoveSpeed = input?.moveSpeed ?? 200;
            const rawJumpForce = input?.jumpForce ?? -400;

            // Scale moveSpeed from pixels/s to 3D units/s (divide by scale factor)
            const moveSpeed3D = rawMoveSpeed / scale;
            // Scale jumpForce and ensure positive (2D negative = jump up, 3D positive = jump up)
            const jumpForce3D = Math.abs(rawJumpForce) / (scale / 4); // /20 for good feel with gravity -20

            components.input3d = {
              moveSpeed: Math.max(moveSpeed3D, 2), // Minimum 2 m/s
              jumpForce: Math.max(jumpForce3D, 8), // Minimum 8 m/s for noticeable jump
              canJump: input?.canJump !== false,
              isGrounded: true,
            };
          }

          return {
            name: entity.name,
            components,
            tags: entity.tags,
          };
        }),
      ],
      systems: ['render3d', 'physics3d'],
    };
  }, []);

  // Memoize the 3D spec to prevent unnecessary re-renders
  const game3DSpec = useMemo(() => {
    if (!gameSpec) return null;
    return convertTo3DSpec(gameSpec);
  }, [gameSpec, convertTo3DSpec]);

  // Export game as standalone HTML
  const exportGame = useCallback(async () => {
    if (!gameSpec) return;

    try {
      setIsExporting(true);

      const gameTitle = gameSpec.metadata?.title || 'PromptPlay Game';
      const defaultFileName = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.html`;

      // Ask user where to save
      const outputPath = await save({
        title: 'Export Game as HTML',
        defaultPath: defaultFileName,
        filters: [{ name: 'HTML Files', extensions: ['html'] }],
      });

      if (!outputPath) {
        setIsExporting(false);
        return;
      }

      // Call Rust to generate and save the HTML
      await invoke('export_game_html', {
        gameSpecJson: JSON.stringify(gameSpec),
        outputPath,
        gameTitle,
      });

      setNotification('Game exported successfully!');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to export game:', err);
      setError('Failed to export game: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  }, [gameSpec]);

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

  const handleCopyEntity = useCallback((entityName: string) => {
    if (!gameSpec) return;

    const entity = gameSpec.entities?.find((e) => e.name === entityName);
    if (entity) {
      setClipboardEntity(JSON.parse(JSON.stringify(entity)));
      setNotification('Entity copied');
      setTimeout(() => setNotification(null), 1500);
    }
  }, [gameSpec]);

  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    gameSpec,
    projectPath,
    viewMode,
    selectedEntity,
    selectedEntities,
    clipboardEntity,
    showKeyboardShortcuts,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSave: saveProject,
    onOpenProject: openProject,
    onExportGame: exportGame,
    onCreateEntity: handleCreateEntity,
    onDeleteEntity: handleDeleteEntity,
    onDeleteSelected: handleDeleteSelected,
    onDuplicateEntity: handleDuplicateEntity,
    onDuplicateSelected: handleDuplicateSelected,
    onSelectAll: handleSelectAll,
    onClearSelection: () => setSelectedEntities(new Set()),
    onCopyEntity: (entity) => setClipboardEntity(entity),
    onShowNewProjectModal: () => setShowNewProjectModal(true),
    onShowKeyboardShortcuts: () => setShowKeyboardShortcuts(true),
    onHideKeyboardShortcuts: () => setShowKeyboardShortcuts(false),
    onNotification: (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 1500);
    },
    pushHistory,
    setGameSpec,
    setSelectedEntity,
    setHasUnsavedChanges,
  });

  // Close project handler
  const closeProject = useCallback(() => {
    if (hasUnsavedChanges) {
      // In a full implementation, show a confirmation dialog
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    setProjectPath(null);
    setGameSpec(null);
    setSelectedEntities(new Set());
    setSelectedFile(null);
    setActiveSceneId(null);
    setHasUnsavedChanges(false);
    setShowAIPanel(false);
  }, [hasUnsavedChanges]);

  // Listen for native menu events from Rust
  useEffect(() => {
    const unlisten = listen<string>('menu-event', (event) => {
      const action = event.payload;
      switch (action) {
        // ==================== FILE MENU ====================
        case 'new_project':
          setShowNewProjectModal(true);
          break;
        case 'open_project':
          openProject();
          break;
        case 'close_project':
          closeProject();
          break;
        case 'save':
          if (gameSpec && projectPath) {
            saveProject();
          }
          break;
        case 'save_as':
          if (gameSpec) {
            saveProjectAs();
          }
          break;
        case 'save_as_template':
          if (gameSpec) {
            setShowSaveAsTemplateModal(true);
          }
          break;
        case 'import_game':
          importGame();
          break;
        case 'export_html':
          if (gameSpec) {
            exportGame();
          }
          break;
        case 'export_zip':
          // TODO: Implement ZIP export
          setNotification('Export ZIP - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'publish':
          // TODO: Implement publish to gallery
          setNotification('Publish to Gallery - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;

        // ==================== EDIT MENU ====================
        case 'undo':
          handleUndo();
          break;
        case 'redo':
          handleRedo();
          break;
        case 'duplicate':
          if (selectedEntities.size > 1) {
            handleDuplicateSelected();
          } else if (selectedEntity) {
            handleDuplicateEntity(selectedEntity);
          }
          break;
        case 'delete':
          if (selectedEntities.size > 1) {
            handleDeleteSelected();
          } else if (selectedEntity) {
            handleDeleteEntity(selectedEntity);
          }
          break;
        case 'select_all_entities':
          handleSelectAll();
          break;
        case 'deselect_all':
          setSelectedEntities(new Set());
          break;
        case 'preferences':
          // TODO: Implement preferences panel
          setNotification('Preferences - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;

        // ==================== VIEW MENU ====================
        case 'toggle_grid':
          setShowGrid(prev => !prev);
          break;
        case 'toggle_debug':
          setShowDebug(prev => !prev);
          break;
        case 'toggle_2d_3d':
          setIs3DMode(prev => {
            const newMode = !prev;
            setNotification(newMode ? 'Switched to 3D Mode' : 'Switched to 2D Mode');
            setTimeout(() => setNotification(null), 2000);
            return newMode;
          });
          break;
        case 'zoom_in':
        case 'zoom_out':
        case 'zoom_reset':
        case 'fit_view':
          setNotification(`${action.replace(/_/g, ' ')} - Coming soon`);
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'show_scene_tree':
          setLeftPanelMode('entities');
          break;
        case 'show_inspector':
          setRightPanelMode('inspector');
          break;
        case 'show_assets':
          setLeftPanelMode('assets');
          break;
        case 'show_animation':
          // TODO: Show animation editor
          setNotification('Animation Editor - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'show_code':
          setViewMode('code');
          break;
        case 'show_ai':
          setShowAIPanel(true);
          break;

        // ==================== GAME MENU ====================
        case 'play_game':
          if (gameSpec) {
            setIsPlaying(true);
          }
          break;
        case 'stop_game':
          setIsPlaying(false);
          break;
        case 'restart_game':
          resetGame();
          break;
        case 'ai_playtest':
          // TODO: Implement AI playtest
          setNotification('AI Playtest - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'game_settings':
          setRightPanelMode('physics');
          break;

        // ==================== WINDOW MENU ====================
        case 'community_gallery':
          // TODO: Show community gallery
          setNotification('Community Gallery - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'marketplace':
          // TODO: Show marketplace
          setNotification('Asset Marketplace - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;

        // ==================== HELP MENU ====================
        case 'getting_started':
          // TODO: Show getting started guide
          setNotification('Getting Started - Coming soon');
          setTimeout(() => setNotification(null), 2000);
          break;
        case 'keyboard_shortcuts':
          setShowKeyboardShortcuts(true);
          break;
        case 'documentation':
          // Open documentation in browser
          window.open('https://github.com/promptplay/docs', '_blank');
          break;
        case 'report_issue':
          window.open('https://github.com/promptplay/promptplay/issues', '_blank');
          break;
        case 'about':
          setNotification('PromptPlay v1.0 - AI-First 2D/3D Game Engine');
          setTimeout(() => setNotification(null), 3000);
          break;

        default:
          console.log('Unknown menu event:', action);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [openProject, closeProject, saveProject, exportGame, handleUndo, handleRedo, selectedEntity, selectedEntities, handleDuplicateEntity, handleDeleteEntity, handleDuplicateSelected, handleDeleteSelected, handleSelectAll, gameSpec, projectPath, resetGame]);

  return (
    <div className="flex h-screen bg-canvas text-text-primary overflow-hidden font-sans">
      {/* File Change Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          {notification.toLowerCase().includes('saved') || notification.toLowerCase().includes('success') || notification.toLowerCase().includes('exported') || notification.toLowerCase().includes('created') ? (
            <CheckIcon size={16} className="text-white" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Left Panel - File Tree / Scene Tree */}
      <aside className="w-64 bg-panel border-r border-subtle flex flex-col backdrop-blur-md">
        {/* Panel Mode Tabs */}
        {projectPath && gameSpec && (
          <div className="flex items-center justify-between bg-panel border-b border-subtle px-2 py-1.5">
            <div className="flex gap-1">
              <button
                onClick={() => setLeftPanelMode('files')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'files'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Files"
              >
                <FolderIcon size={16} />
              </button>
              <button
                onClick={() => setLeftPanelMode('scenes')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'scenes'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Scenes"
              >
                <SceneIcon size={16} />
              </button>
              <button
                onClick={() => setLeftPanelMode('entities')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'entities'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Entities"
              >
                <EntityIcon size={16} />
              </button>
              <button
                onClick={() => setLeftPanelMode('prefabs')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'prefabs'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Prefabs"
              >
                <LayersIcon size={16} />
              </button>
              <button
                onClick={() => setLeftPanelMode('assets')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'assets'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Assets"
              >
                <ImageIcon size={16} />
              </button>
              <button
                onClick={() => setLeftPanelMode('tilemap')}
                className={`p-1.5 rounded transition-colors ${leftPanelMode === 'tilemap'
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'
                  }`}
                title="Tilemap Editor"
              >
                <GridIcon size={16} />
              </button>
            </div>
            <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
              {leftPanelMode}
            </span>
          </div>
        )}

        {/* Panel Header */}
        {(!projectPath || !gameSpec) && (
          <div className="p-4 border-b border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">
              {leftPanelMode === 'files' ? 'Files' : 'Scene'}
            </h2>
            {projectPath && (
              <p className="text-xs text-text-secondary mt-1 truncate" title={projectPath}>
                {projectPath.split('/').pop()}
              </p>
            )}
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {leftPanelMode === 'files' && (
            <FileTree
              projectPath={projectPath}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
            />
          )}
          {leftPanelMode === 'scenes' && (
            <SceneManager
              gameSpec={gameSpec}
              activeSceneId={activeSceneId}
              onSwitchScene={handleSwitchScene}
              onCreateScene={handleCreateScene}
              onRenameScene={handleRenameScene}
              onDeleteScene={handleDeleteScene}
              onDuplicateScene={handleDuplicateScene}
            />
          )}
          {leftPanelMode === 'entities' && (
            <SceneTree
              gameSpec={gameSpec}
              selectedEntities={selectedEntities}
              onSelectEntity={handleEntitySelect}
              onCreateEntity={handleCreateEntity}
              onRenameEntity={handleRenameEntity}
              onDeleteEntity={selectedEntities.size > 1 ? handleDeleteSelected : handleDeleteEntity}
              onDuplicateEntity={selectedEntities.size > 1 ? handleDuplicateSelected : handleDuplicateEntity}
              onCopyEntity={handleCopyEntity}
            />
          )}
          {leftPanelMode === 'prefabs' && (
            <PrefabLibrary
              onInstantiate={handleInstantiatePrefab}
              selectedEntity={selectedEntity ? gameSpec?.entities?.find(e => e.name === selectedEntity) : null}
            />
          )}
          {leftPanelMode === 'assets' && (
            <AssetBrowser
              projectPath={projectPath}
              onAssetSelect={(path, type) => {
                if (type === 'script') {
                  setSelectedFile(path);
                  setViewMode('code');
                } else {
                  console.log('Selected asset:', path, type);
                }
              }}
            />
          )}
          {leftPanelMode === 'tilemap' && (
            <TilemapEditor
              tilemap={currentTilemap}
              onTilemapChange={(tilemap) => {
                setCurrentTilemap(tilemap);
                setHasUnsavedChanges(true);
              }}
            />
          )}
        </div>

        {/* Footer Info */}
        {gameSpec && leftPanelMode === 'files' && (
          <div className="p-4 border-t border-subtle space-y-1">
            <p className="text-sm font-medium text-text-primary">
              {gameSpec.metadata?.title || 'Untitled Game'}
            </p>
            <p className="text-xs text-text-secondary">
              {gameSpec.entities?.length || 0} entities • {gameSpec.systems?.length || 0} systems
            </p>
          </div>
        )}
      </aside>

      {/* Center Panel - Game Canvas / Code Editor */}
      <main className="flex-1 flex flex-col">
        <Toolbar
          projectPath={projectPath}
          viewMode={viewMode}
          isPlaying={isPlaying}
          loading={loading}
          isExporting={isExporting}
          hasUnsavedChanges={hasUnsavedChanges}
          canUndo={canUndo}
          canRedo={canRedo}
          showAIPanel={showAIPanel}
          hasGameSpec={!!gameSpec}
          is3DMode={is3DMode}
          onViewModeChange={setViewMode}
          onTogglePlayPause={togglePlayPause}
          onReset={resetGame}
          onNewProject={() => setShowNewProjectModal(true)}
          onOpenProject={openProject}
          onSave={saveProject}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onToggleAI={() => setShowAIPanel(prev => !prev)}
          onExport={exportGame}
          onToggle3DMode={() => setIs3DMode(prev => !prev)}
          onSearch={() => setShowEntitySearch(true)}
          onScreenshot={async () => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              const saved = await screenCapture.copyToClipboard(canvas);
              if (saved) {
                setNotification('Screenshot saved!');
                setTimeout(() => setNotification(null), 3000);
              }
            }
          }}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          )}

          {!projectPath && !loading && !error && (
            <WelcomeScreen
              onOpenProject={openProject}
              onNewProject={() => setShowNewProjectModal(true)}
              onCreateFromTemplate={createFromTemplate}
              loading={loading}
            />
          )}

          {projectPath && viewMode === 'game' && !is3DMode && (
            <GameCanvas
              gameSpec={gameSpec}
              isPlaying={isPlaying}
              selectedEntities={selectedEntities}
              onEntitySelect={handleEntitySelect}
              onReset={resetGame}
              onUpdateEntity={handleUpdateEntity}
              gridEnabled={showGrid}
              onGridToggle={() => setShowGrid(prev => !prev)}
              debugEnabled={showDebug}
              onDebugToggle={() => setShowDebug(prev => !prev)}
              gridSize={16}
            />
          )}

          {projectPath && viewMode === 'game' && is3DMode && game3DSpec && (
            <GameCanvas3D
              gameSpec={game3DSpec}
              isPlaying={isPlaying}
              selectedEntities={selectedEntities}
              onEntitySelect={handleEntitySelect}
              showGrid={showGrid}
              showAxes={true}
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

      {/* Right Panel - Inspector / JSON Editor */}
      <aside className="w-80 bg-panel border-l border-subtle flex flex-col backdrop-blur-md">
        {/* Panel Mode Tabs */}
        {projectPath && gameSpec && viewMode === 'game' && (
          <div className="flex gap-1 bg-panel border-b border-subtle p-1.5">
            <button
              onClick={() => setRightPanelMode('inspector')}
              title="Inspector"
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelMode === 'inspector'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <EntityIcon size={12} />
              <span className="hidden sm:inline">Props</span>
            </button>
            <button
              onClick={() => setRightPanelMode('json')}
              title="JSON Editor"
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelMode === 'json'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <CodeIcon size={12} />
              <span className="hidden sm:inline">JSON</span>
            </button>
            <button
              onClick={() => setRightPanelMode('physics')}
              title="Physics Settings"
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelMode === 'physics'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <PhysicsIcon size={12} />
              <span className="hidden sm:inline">Phys</span>
            </button>
            <button
              onClick={() => setRightPanelMode('scripts')}
              title="Script Runner"
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelMode === 'scripts'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <CodeIcon size={12} />
              <span className="hidden sm:inline">Code</span>
            </button>
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'game' && gameSpec && rightPanelMode === 'inspector' ? (
            <Inspector
              gameSpec={gameSpec}
              selectedEntities={selectedEntities}
              onUpdateEntity={handleUpdateEntity}
              onDeleteEntity={handleDeleteEntity}
              onDuplicateEntity={handleDuplicateEntity}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              projectPath={projectPath}
            />
          ) : viewMode === 'game' && gameSpec && rightPanelMode === 'json' ? (
            <JSONEditorPanel
              gameSpec={gameSpec}
              onApplyChanges={handleApplyAIChanges}
              selectedEntity={selectedEntity}
            />
          ) : viewMode === 'game' && gameSpec && rightPanelMode === 'physics' ? (
            <PhysicsSettings
              gameSpec={gameSpec}
              onConfigChange={(config) => {
                const updatedSpec = { ...gameSpec, config };
                pushHistory(updatedSpec, 'Update physics config');
                setGameSpec(updatedSpec);
                setHasUnsavedChanges(true);
              }}
            />
          ) : viewMode === 'game' && gameSpec && rightPanelMode === 'scripts' ? (
            <ScriptRunner
              projectPath={projectPath}
              onError={(errors) => {
                console.log('Script compilation errors:', errors);
              }}
            />
          ) : viewMode === 'code' && selectedFile ? (
            <div className="p-4">
              <h2 className="text-lg font-semibold text-text-primary mb-4">File Info</h2>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Path</h3>
              <p className="text-xs text-text-tertiary break-all font-mono bg-subtle p-2 rounded">{selectedFile}</p>
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center justify-center h-full text-center opacity-70">
              <h2 className="text-lg font-semibold text-text-primary mb-2">Inspector</h2>
              <p className="text-sm text-text-secondary">
                {projectPath ? 'Select an entity or open a file' : 'Open a project to view details'}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-panel-solid border border-subtle rounded-xl shadow-2xl p-6 w-96 animate-scale-in">
            <h2 className="text-xl font-bold text-text-primary mb-4">Create New Project</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="my-game"
                className="w-full px-3 py-2 bg-canvas border border-subtle rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-text-tertiary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createNewProject();
                  if (e.key === 'Escape') {
                    setShowNewProjectModal(false);
                    setNewProjectName('');
                  }
                }}
              />
            </div>
            <p className="text-sm text-text-secondary mb-6">
              This will create a new folder with a starter game template.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewProjectModal(false);
                  setNewProjectName('');
                }}
                className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Prompt Panel */}
      <AIPromptPanel
        gameSpec={gameSpec}
        onApplyChanges={handleApplyAIChanges}
        isVisible={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        projectPath={projectPath}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Save as Template Modal */}
      {gameSpec && (
        <SaveAsTemplateModal
          isOpen={showSaveAsTemplateModal}
          onClose={() => setShowSaveAsTemplateModal(false)}
          gameSpec={gameSpec}
          onSaved={(templateName) => {
            setNotification(`Template "${templateName}" saved successfully!`);
            setTimeout(() => setNotification(null), 3000);
          }}
        />
      )}

      {/* Entity Search (Cmd/Ctrl+K) */}
      {gameSpec && (
        <EntitySearch
          entities={gameSpec.entities || []}
          onSelect={(entityName) => {
            setSelectedEntity(entityName);
            setLeftPanelMode('entities');
          }}
          selectedEntity={selectedEntity}
          isOpen={showEntitySearch}
          onClose={() => setShowEntitySearch(false)}
        />
      )}
    </div>
  );
}

export default App;
