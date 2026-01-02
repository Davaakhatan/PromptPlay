import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { GameSpec, SceneSpec, EntitySpec } from '@promptplay/shared-types';
import GameCanvas from './components/GameCanvas';
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
import { useFileWatcher } from './hooks/useFileWatcher';
import { useHistoryState } from './hooks/useHistoryState';
import { useEntityOperations } from './hooks/useEntityOperations';
import { SaveIcon, UndoIcon, RedoIcon, NewProjectIcon, AIIcon, CodeIcon, ExportIcon, LoadingSpinner, CheckIcon, FolderIcon, SceneIcon, EntityIcon, LayersIcon, ImageIcon, PhysicsIcon } from './components/Icons';

type ViewMode = 'game' | 'code';
type LeftPanelMode = 'files' | 'scenes' | 'entities' | 'prefabs' | 'assets';
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

  const openProject = useCallback(async () => {
    let gameJsonStr = '';
    try {
      setLoading(true);
      setError(null);

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
    } catch (err) {
      console.error('Failed to open project:', err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      setIsPlaying(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Quick Create Entity: Cmd/Ctrl + Shift + N
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        if (gameSpec) {
          handleCreateEntity();
        }
        return;
      }
      // New Project: Cmd/Ctrl + N
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowNewProjectModal(true);
      }
      // Open Project: Cmd/Ctrl + O
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        openProject();
      }
      // Save: Cmd/Ctrl + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (gameSpec && projectPath) {
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
          }
        }
      }
      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      // Export: Cmd/Ctrl + E
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (gameSpec) {
          exportGame();
        }
      }
      // Keyboard shortcuts help: ?
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
      // Close modals: Escape
      if (e.key === 'Escape') {
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        }
      }
      // Select All: Cmd/Ctrl + A
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && viewMode === 'game' && gameSpec?.entities) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        handleSelectAll();
      }
      // Clear Selection: Escape
      if (e.key === 'Escape' && selectedEntities.size > 0 && !showKeyboardShortcuts) {
        setSelectedEntities(new Set());
      }
      // Delete selected entity(ies): Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntities.size > 0 && viewMode === 'game') {
        // Don't delete if we're in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        if (selectedEntities.size > 1) {
          handleDeleteSelected();
        } else if (selectedEntity) {
          handleDeleteEntity(selectedEntity);
        }
      }
      // Duplicate: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedEntities.size > 0 && viewMode === 'game') {
        e.preventDefault();
        if (selectedEntities.size > 1) {
          handleDuplicateSelected();
        } else if (selectedEntity) {
          handleDuplicateEntity(selectedEntity);
        }
      }
      // Copy: Cmd/Ctrl + C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedEntity && gameSpec && viewMode === 'game') {
        const entity = gameSpec.entities?.find((e) => e.name === selectedEntity);
        if (entity) {
          setClipboardEntity(JSON.parse(JSON.stringify(entity)));
          setNotification('Entity copied');
          setTimeout(() => setNotification(null), 1500);
        }
      }
      // Paste: Cmd/Ctrl + V
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboardEntity && gameSpec && viewMode === 'game') {
        e.preventDefault();
        // Generate unique name
        let counter = 1;
        const baseName = clipboardEntity.name.replace(/_copy\d+$/, '');
        const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
        let newName = `${baseName}_paste${counter}`;
        while (existingNames.has(newName)) {
          counter++;
          newName = `${baseName}_paste${counter}`;
        }

        // Deep clone and offset position
        const newEntity = JSON.parse(JSON.stringify(clipboardEntity));
        newEntity.name = newName;
        if (newEntity.components?.transform) {
          newEntity.components.transform.x += 30;
          newEntity.components.transform.y += 30;
        }

        const updatedSpec = {
          ...gameSpec,
          entities: [...(gameSpec.entities || []), newEntity],
        };

        pushHistory(updatedSpec, `Paste ${newName}`);
        setGameSpec(updatedSpec);
        setSelectedEntity(newName);
        setHasUnsavedChanges(true);
        setNotification('Entity pasted');
        setTimeout(() => setNotification(null), 1500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, gameSpec, projectPath, openProject, exportGame, showKeyboardShortcuts, selectedEntity, selectedEntities, viewMode, clipboardEntity, handleDeleteEntity, handleDuplicateEntity, handleDeleteSelected, handleDuplicateSelected, handleSelectAll, handleCreateEntity, pushHistory]);

  // Listen for native menu events from Rust
  useEffect(() => {
    const unlisten = listen<string>('menu-event', (event) => {
      const action = event.payload;
      switch (action) {
        case 'new_project':
          setShowNewProjectModal(true);
          break;
        case 'open_project':
          openProject();
          break;
        case 'save':
          if (gameSpec && projectPath) {
            saveProject();
          }
          break;
        case 'export':
          if (gameSpec) {
            exportGame();
          }
          break;
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
        case 'keyboard_shortcuts':
          setShowKeyboardShortcuts(true);
          break;
        case 'about':
          setNotification('PromptPlay - AI-First 2D Game Engine');
          setTimeout(() => setNotification(null), 3000);
          break;
        // Grid, debug, and zoom controls can be added when those features are implemented
        case 'toggle_grid':
        case 'toggle_debug':
        case 'zoom_in':
        case 'zoom_out':
        case 'zoom_reset':
        case 'fit_view':
          // TODO: Implement these view controls
          setNotification(`${action.replace('_', ' ')} - Coming soon`);
          setTimeout(() => setNotification(null), 2000);
          break;
        default:
          console.log('Unknown menu event:', action);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [openProject, saveProject, exportGame, handleUndo, handleRedo, selectedEntity, selectedEntities, handleDuplicateEntity, handleDeleteEntity, handleDuplicateSelected, handleDeleteSelected, gameSpec, projectPath]);

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
        {/* Toolbar - Minimalist Design */}
        <div className="bg-panel border-b border-subtle h-10 flex items-center justify-between px-2 backdrop-blur-md sticky top-0 z-10">
          {/* Left: View Mode Tabs */}
          <div className="flex items-center gap-1">
            {projectPath && (
              <div className="flex bg-subtle/50 rounded p-0.5">
                <button
                  onClick={() => setViewMode('game')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'game'
                    ? 'bg-white/10 text-white'
                    : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                >
                  Game
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${viewMode === 'code'
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
          {gameSpec && viewMode === 'game' && (
            <div className="flex items-center gap-1">
              <button
                onClick={togglePlayPause}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${isPlaying
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
                onClick={resetGame}
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
              onClick={() => setShowNewProjectModal(true)}
              className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 transition-all"
              title="New Project (Cmd+N)"
            >
              <NewProjectIcon size={14} />
            </button>
            <button
              onClick={openProject}
              disabled={loading}
              className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-50 transition-all"
              title="Open Project (Cmd+O)"
            >
              {loading ? <LoadingSpinner size={14} /> : (
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
                  onClick={saveProject}
                  className={`relative w-7 h-7 rounded flex items-center justify-center transition-all ${hasUnsavedChanges
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
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title={canUndo ? `Undo (Cmd+Z)` : 'Nothing to undo'}
                >
                  <UndoIcon size={14} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="w-7 h-7 rounded flex items-center justify-center text-text-tertiary hover:text-text-secondary hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title={canRedo ? `Redo (Cmd+Shift+Z)` : 'Nothing to redo'}
                >
                  <RedoIcon size={14} />
                </button>

                <div className="w-px h-4 bg-subtle mx-1" />

                {/* AI */}
                <button
                  onClick={() => setShowAIPanel(prev => !prev)}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-all ${showAIPanel
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-white/5'
                    }`}
                  title="AI Assistant"
                >
                  <AIIcon size={14} />
                </button>

                {/* Export */}
                {gameSpec && (
                  <button
                    onClick={exportGame}
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

          {projectPath && viewMode === 'game' && (
            <GameCanvas
              gameSpec={gameSpec}
              isPlaying={isPlaying}
              selectedEntities={selectedEntities}
              onEntitySelect={handleEntitySelect}
              onReset={resetGame}
              onUpdateEntity={handleUpdateEntity}
              gridEnabled={false}
              gridSize={16}
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
    </div>
  );
}

export default App;
