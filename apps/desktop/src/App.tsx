import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import TilemapEditor, { Tilemap, TilemapTool } from './components/TilemapEditor';
import MobileExportDialog from './components/MobileExportDialog';
import PublishDialog from './components/PublishDialog';
import AIPlaytestPanel from './components/AIPlaytestPanel';
import NodeEditor, { createDefaultGraph } from './components/NodeEditor';
import ShaderGraphEditor from './components/ShaderGraphEditor';
import BehaviorTreeEditor from './components/BehaviorTreeEditor';
import StateMachineEditor from './components/StateMachineEditor';
import type { NodeGraph } from './types/NodeEditor';
import type { ShaderGraph } from './types/ShaderGraph';
import type { BehaviorTree } from './types/BehaviorTree';
import type { StateMachine } from './types/StateMachine';
import { createDefaultShaderGraph } from './services/ShaderGraphCompiler';
import { createDefaultBehaviorTree } from './services/BehaviorTreeLibrary';
import { createDefaultStateMachine } from './services/StateMachineLibrary';
import { UserMenu } from './components/UserMenu';
import { AuthDialog } from './components/AuthDialog';
import { CloudProjectsDialog } from './components/CloudProjectsDialog';
import { MarketplaceDialog } from './components/MarketplaceDialog';
import { CollaboratorsPanel } from './components/CollaboratorsPanel';
import { AIToolsPanel } from './components/AIToolsPanel';
import { ProfessionalToolsPanel } from './components/ProfessionalToolsPanel';
import { PerformancePanel } from './components/PerformancePanel';
import { MultiplayerPanel } from './components/MultiplayerPanel';
import { MonetizationPanel } from './components/MonetizationPanel';
import { ExtendedPlatformsPanel } from './components/ExtendedPlatformsPanel';

type ViewMode = 'game' | 'code' | 'nodes' | 'shaders' | 'behavior' | 'states';
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
  const [tilemapMode, setTilemapMode] = useState(false);
  const [selectedTileId, setSelectedTileId] = useState(1);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [tilemapTool, setTilemapTool] = useState<TilemapTool>('brush');
  const [showMobileExport, setShowMobileExport] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAIPlaytest, setShowAIPlaytest] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [nodeGraph, setNodeGraph] = useState<NodeGraph | null>(null);
  const [shaderGraph, setShaderGraph] = useState<ShaderGraph | null>(null);
  const [behaviorTree, setBehaviorTree] = useState<BehaviorTree | null>(null);
  const [stateMachine, setStateMachine] = useState<StateMachine | null>(null);

  // v3.1 Cloud & Community features
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showCloudProjects, setShowCloudProjects] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  // v3.2 AI Tools
  const [showAITools, setShowAITools] = useState(false);

  // v4.0 Professional Tools
  const [showProfessionalTools, setShowProfessionalTools] = useState(false);

  // v4.1 Performance Tools
  const [showPerformance, setShowPerformance] = useState(false);

  // v5.0 Multiplayer
  const [showMultiplayer, setShowMultiplayer] = useState(false);

  // v5.1 Monetization & Analytics
  const [showMonetization, setShowMonetization] = useState(false);

  // v6.0 Extended Platforms
  const [showExtendedPlatforms, setShowExtendedPlatforms] = useState(false);

  // Notification timeout ref for auto-dismiss
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to show notification with auto-dismiss
  const showNotification = useCallback((message: string, duration: number = 2000) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(message);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, duration);
  }, []);

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
      // Load tilemap from gameSpec if present
      setCurrentTilemap(spec.tilemap as Tilemap | undefined || null);
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

      // Load visual scripting data if exists
      try {
        const nodesJsonStr = await invoke<string>('read_file', { path: `${selected}/scripts/nodes.json` });
        setNodeGraph(JSON.parse(nodesJsonStr) as NodeGraph);
      } catch {
        setNodeGraph(null);
      }

      try {
        const shadersJsonStr = await invoke<string>('read_file', { path: `${selected}/scripts/shaders.json` });
        setShaderGraph(JSON.parse(shadersJsonStr) as ShaderGraph);
      } catch {
        setShaderGraph(null);
      }

      try {
        const behaviorJsonStr = await invoke<string>('read_file', { path: `${selected}/scripts/behavior.json` });
        setBehaviorTree(JSON.parse(behaviorJsonStr) as BehaviorTree);
      } catch {
        setBehaviorTree(null);
      }

      try {
        const statesJsonStr = await invoke<string>('read_file', { path: `${selected}/scripts/states.json` });
        setStateMachine(JSON.parse(statesJsonStr) as StateMachine);
      } catch {
        setStateMachine(null);
      }

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

  // Restore demo game entities
  const restoreDemo = useCallback(() => {
    const demoEntities: EntitySpec[] = [
      {
        name: 'player',
        components: {
          transform: { x: 100, y: 400, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 32, height: 48, tint: 0x4488ff },
          velocity: { vx: 0, vy: 0 },
          collider: { type: 'box' as const, width: 32, height: 48 },
          input: { moveSpeed: 150, jumpForce: -300 },
        },
        tags: ['player'],
      },
      {
        name: 'ground',
        components: {
          transform: { x: 400, y: 580, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 800, height: 40, tint: 0x664422 },
          collider: { type: 'box' as const, width: 800, height: 40 },
        },
        tags: ['ground', 'platform', 'static'],
      },
      {
        name: 'platform1',
        components: {
          transform: { x: 200, y: 450, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 150, height: 20, tint: 0x886644 },
          collider: { type: 'box' as const, width: 150, height: 20 },
        },
        tags: ['platform', 'static'],
      },
      {
        name: 'platform2',
        components: {
          transform: { x: 500, y: 350, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 150, height: 20, tint: 0x886644 },
          collider: { type: 'box' as const, width: 150, height: 20 },
        },
        tags: ['platform', 'static'],
      },
      {
        name: 'coin1',
        components: {
          transform: { x: 200, y: 410, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
          collider: { type: 'box' as const, width: 20, height: 20 },
        },
        tags: ['collectible', 'coin'],
      },
      {
        name: 'coin2',
        components: {
          transform: { x: 500, y: 310, rotation: 0, scaleX: 1, scaleY: 1 },
          sprite: { texture: 'default', width: 20, height: 20, tint: 0xffdd00 },
          collider: { type: 'box' as const, width: 20, height: 20 },
        },
        tags: ['collectible', 'coin'],
      },
    ];

    const newSpec: GameSpec = {
      version: '1.0.0',
      metadata: {
        title: gameSpec?.metadata?.title || 'Demo Game',
        genre: 'platformer',
        description: 'A platformer demo game',
      },
      config: {
        gravity: { x: 0, y: 1 },
        worldBounds: { width: 800, height: 600 },
      },
      entities: demoEntities,
      systems: ['input', 'physics', 'collision', 'render'],
    };

    pushHistory(newSpec, 'Restore demo game');
    setGameSpec(newSpec);
    setHasUnsavedChanges(true);
    setSelectedEntities(new Set());

    // Initialize sample visual scripts for the demo
    // Node Graph - Simple player control script
    setNodeGraph({
      id: 'demo_graph',
      name: 'Player Controller',
      nodes: [
        {
          id: 'event_1',
          type: 'on_update',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'input_1',
          type: 'get_key',
          position: { x: 100, y: 250 },
          data: { key: 'Space' },
        },
        {
          id: 'branch_1',
          type: 'branch',
          position: { x: 300, y: 150 },
          data: {},
        },
        {
          id: 'velocity_1',
          type: 'set_velocity',
          position: { x: 500, y: 100 },
          data: { vx: 0, vy: -300 },
        },
        {
          id: 'get_entity_1',
          type: 'get_entity',
          position: { x: 300, y: 300 },
          data: { name: 'player' },
        },
      ],
      connections: [
        {
          id: 'conn_1',
          fromNodeId: 'event_1',
          fromPortId: 'flow',
          toNodeId: 'branch_1',
          toPortId: 'flow',
        },
        {
          id: 'conn_2',
          fromNodeId: 'input_1',
          fromPortId: 'pressed',
          toNodeId: 'branch_1',
          toPortId: 'condition',
        },
        {
          id: 'conn_3',
          fromNodeId: 'branch_1',
          fromPortId: 'true',
          toNodeId: 'velocity_1',
          toPortId: 'flow',
        },
        {
          id: 'conn_4',
          fromNodeId: 'get_entity_1',
          fromPortId: 'entity',
          toNodeId: 'velocity_1',
          toPortId: 'entity',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    // Shader Graph - Simple color shader
    setShaderGraph({
      id: 'demo_shader',
      name: 'Player Material',
      nodes: [
        {
          id: 'output_1',
          type: 'shader_output',
          position: { x: 500, y: 200 },
          data: {},
        },
        {
          id: 'color_1',
          type: 'shader_color',
          position: { x: 100, y: 150 },
          data: { r: 0.27, g: 0.53, b: 1.0, a: 1.0 },
        },
        {
          id: 'fresnel_1',
          type: 'shader_fresnel',
          position: { x: 100, y: 300 },
          data: { power: 2.0 },
        },
        {
          id: 'mix_1',
          type: 'shader_mix',
          position: { x: 300, y: 200 },
          data: {},
        },
      ],
      connections: [
        {
          id: 'conn_1',
          fromNodeId: 'color_1',
          fromPortId: 'rgb',
          toNodeId: 'mix_1',
          toPortId: 'a',
        },
        {
          id: 'conn_2',
          fromNodeId: 'fresnel_1',
          fromPortId: 'factor',
          toNodeId: 'mix_1',
          toPortId: 'factor',
        },
        {
          id: 'conn_3',
          fromNodeId: 'mix_1',
          fromPortId: 'result',
          toNodeId: 'output_1',
          toPortId: 'color',
        },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    // Behavior Tree - Simple AI patrol behavior
    setBehaviorTree({
      id: 'demo_bt',
      name: 'Enemy AI',
      rootId: 'root_1',
      nodes: [
        {
          id: 'root_1',
          type: 'bt_selector',
          position: { x: 300, y: 50 },
          data: {},
        },
        {
          id: 'seq_1',
          type: 'bt_sequence',
          position: { x: 150, y: 150 },
          data: {},
        },
        {
          id: 'seq_2',
          type: 'bt_sequence',
          position: { x: 450, y: 150 },
          data: {},
        },
        {
          id: 'cond_1',
          type: 'bt_condition',
          position: { x: 100, y: 280 },
          data: { condition: 'playerNearby', threshold: 100 },
        },
        {
          id: 'action_1',
          type: 'bt_action',
          position: { x: 200, y: 280 },
          data: { action: 'chase', target: 'player', speed: 50 },
        },
        {
          id: 'action_2',
          type: 'bt_action',
          position: { x: 450, y: 280 },
          data: { action: 'patrol', speed: 30 },
        },
      ],
      connections: [
        { id: 'conn_1', parentId: 'root_1', childId: 'seq_1', order: 0 },
        { id: 'conn_2', parentId: 'root_1', childId: 'seq_2', order: 1 },
        { id: 'conn_3', parentId: 'seq_1', childId: 'cond_1', order: 0 },
        { id: 'conn_4', parentId: 'seq_1', childId: 'action_1', order: 1 },
        { id: 'conn_5', parentId: 'seq_2', childId: 'action_2', order: 0 },
      ],
      blackboard: { playerDistance: 0, isChasing: false },
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    // State Machine - Player animation states
    setStateMachine({
      id: 'demo_sm',
      name: 'Player Animation',
      states: [
        { id: 'state_idle', name: 'Idle', position: { x: 150, y: 200 }, isInitial: true, color: '#6b7280' },
        { id: 'state_walk', name: 'Walk', position: { x: 400, y: 200 }, color: '#f59e0b' },
        { id: 'state_jump', name: 'Jump', position: { x: 275, y: 50 }, color: '#10b981' },
        { id: 'state_fall', name: 'Fall', position: { x: 275, y: 350 }, color: '#ef4444' },
      ],
      transitions: [
        {
          id: 'trans_1', fromStateId: 'state_idle', toStateId: 'state_walk',
          conditions: [{ id: 'c1', type: 'parameter', parameter: 'speed', operator: 'greater', value: 0 }],
          conditionMode: 'all', priority: 0,
        },
        {
          id: 'trans_2', fromStateId: 'state_walk', toStateId: 'state_idle',
          conditions: [{ id: 'c2', type: 'parameter', parameter: 'speed', operator: 'equals', value: 0 }],
          conditionMode: 'all', priority: 0,
        },
        {
          id: 'trans_3', fromStateId: 'state_idle', toStateId: 'state_jump',
          conditions: [{ id: 'c3', type: 'trigger', parameter: 'jump', operator: 'equals', value: true }],
          conditionMode: 'all', priority: 1,
        },
        {
          id: 'trans_4', fromStateId: 'state_walk', toStateId: 'state_jump',
          conditions: [{ id: 'c4', type: 'trigger', parameter: 'jump', operator: 'equals', value: true }],
          conditionMode: 'all', priority: 1,
        },
        {
          id: 'trans_5', fromStateId: 'state_jump', toStateId: 'state_fall',
          conditions: [{ id: 'c5', type: 'parameter', parameter: 'velocityY', operator: 'less', value: 0 }],
          conditionMode: 'all', priority: 0,
        },
        {
          id: 'trans_6', fromStateId: 'state_fall', toStateId: 'state_idle',
          conditions: [{ id: 'c6', type: 'parameter', parameter: 'isGrounded', operator: 'equals', value: 1 }],
          conditionMode: 'all', priority: 0,
        },
      ],
      parameters: [
        { id: 'param_speed', name: 'speed', type: 'float', defaultValue: 0 },
        { id: 'param_velocityY', name: 'velocityY', type: 'float', defaultValue: 0 },
        { id: 'param_isGrounded', name: 'isGrounded', type: 'bool', defaultValue: true },
        { id: 'param_jump', name: 'jump', type: 'trigger', defaultValue: false },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    });

    setNotification('Demo game restored with visual scripts!');
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, pushHistory]);

  // Save project to disk
  const saveProject = async () => {
    if (!gameSpec || !projectPath) return;

    try {
      const gameJsonPath = `${projectPath}/game.json`;
      // Include tilemap in gameSpec when saving
      const specToSave: GameSpec = {
        ...gameSpec,
        tilemap: currentTilemap || undefined,
      };
      const gameJsonContent = JSON.stringify(specToSave, null, 2);

      await invoke('write_file', {
        path: gameJsonPath,
        content: gameJsonContent,
      });

      // Ensure scripts directory exists for visual scripting data
      try {
        await invoke('create_directory', { path: `${projectPath}/scripts` });
      } catch {
        // Directory may already exist
      }

      // Save node graph if exists
      if (nodeGraph) {
        await invoke('write_file', {
          path: `${projectPath}/scripts/nodes.json`,
          content: JSON.stringify(nodeGraph, null, 2),
        });
      }

      // Save shader graph if exists
      if (shaderGraph) {
        await invoke('write_file', {
          path: `${projectPath}/scripts/shaders.json`,
          content: JSON.stringify(shaderGraph, null, 2),
        });
      }

      // Save behavior tree if exists
      if (behaviorTree) {
        await invoke('write_file', {
          path: `${projectPath}/scripts/behavior.json`,
          content: JSON.stringify(behaviorTree, null, 2),
        });
      }

      // Save state machine if exists
      if (stateMachine) {
        await invoke('write_file', {
          path: `${projectPath}/scripts/states.json`,
          content: JSON.stringify(stateMachine, null, 2),
        });
      }

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
              input: { moveSpeed: 150, jumpForce: -300 },
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
                input: { moveSpeed: 150, jumpForce: -300 },
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
                input: { moveSpeed: 150, jumpForce: 0 },
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
                input: { moveSpeed: 150, jumpForce: -300 },
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
            // Scale jumpForce: divide by scale to convert from pixels to 3D units
            // With gravity -20 and jumpForce ~8-10, we get a reasonable ~1.5-2.5 unit jump height
            const jumpForce3D = Math.abs(rawJumpForce) / scale;

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

  // Handle 3D entity transform changes (convert back to 2D coordinates)
  const handle3DEntityTransformChange = useCallback(
    (entityName: string, transform: { x: number; y: number; z: number }) => {
      if (!gameSpec) return;

      const scale = 50; // Same scale used in convertTo3DSpec
      const worldHeight = gameSpec.config?.worldBounds?.height || 600;
      const worldWidth = gameSpec.config?.worldBounds?.width || 800;

      // Convert 3D coordinates back to 2D pixel coordinates
      // Reverse of: x3d = (x2d / scale) - (worldWidth / scale / 2)
      // Reverse of: y3d = ((worldHeight - y2d) / scale) - 0.5
      const x2D = (transform.x * scale) + (worldWidth / 2);
      const y2D = worldHeight - ((transform.y + 0.5) * scale);

      // Update the entity's transform component
      const updatedEntities = gameSpec.entities?.map((entity) => {
        if (entity.name === entityName && entity.components?.transform) {
          return {
            ...entity,
            components: {
              ...entity.components,
              transform: {
                ...entity.components.transform,
                x: x2D,
                y: y2D,
              },
            },
          };
        }
        return entity;
      });

      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      setGameSpec(updatedSpec);
      setHasUnsavedChanges(true);
    },
    [gameSpec]
  );

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
        case 'show_nodes':
        case 'show_visual_scripts':
          setViewMode('nodes');
          if (!nodeGraph) {
            setNodeGraph(createDefaultGraph());
          }
          break;
        case 'show_shaders':
          setViewMode('shaders');
          if (!shaderGraph) {
            setShaderGraph(createDefaultShaderGraph());
          }
          break;
        case 'show_behavior_trees':
          setViewMode('behavior');
          if (!behaviorTree) {
            setBehaviorTree(createDefaultBehaviorTree());
          }
          break;
        case 'show_state_machines':
          setViewMode('states');
          if (!stateMachine) {
            setStateMachine(createDefaultStateMachine());
          }
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
        case 'restore_demo':
          if (projectPath) {
            restoreDemo();
          }
          break;
        case 'ai_playtest':
          setShowAIPlaytest(true);
          break;
        case 'game_settings':
          setRightPanelMode('physics');
          break;

        // ==================== WINDOW MENU ====================
        case 'community_gallery':
          setShowCloudProjects(true);
          break;
        case 'marketplace':
          setShowMarketplace(true);
          break;
        case 'collaborators':
          setShowCollaborators(!showCollaborators);
          break;
        case 'cloud_auth':
          setShowAuthDialog(true);
          break;
        case 'ai_tools':
          setShowAITools(!showAITools);
          break;
        case 'professional_tools':
          setShowProfessionalTools(!showProfessionalTools);
          break;
        case 'performance':
          setShowPerformance(!showPerformance);
          break;
        case 'multiplayer':
          setShowMultiplayer(!showMultiplayer);
          break;
        case 'monetization':
          setShowMonetization(!showMonetization);
          break;
        case 'extended_platforms':
          setShowExtendedPlatforms(!showExtendedPlatforms);
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
          setNotification('PromptPlay v3.0 - AI-First 2D/3D Game Engine');
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
      <aside
        style={{ width: leftPanelCollapsed ? '40px' : '256px' }}
        className="flex-shrink-0 bg-panel border-r border-subtle flex flex-col backdrop-blur-md transition-[width] duration-200 relative z-20"
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLeftPanelCollapsed(!leftPanelCollapsed);
          }}
          className="absolute top-1/2 -translate-y-1/2 -right-4 z-50 w-8 h-16 bg-[#1e1e2e] border border-[#3f3f5a] rounded-r-lg flex items-center justify-center hover:bg-[#2a2a3e] transition-colors shadow-lg cursor-pointer"
          title={leftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          style={{ pointerEvents: 'auto' }}
        >
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${leftPanelCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {/* Panel Mode Tabs */}
        {projectPath && gameSpec && !leftPanelCollapsed && (
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

        {/* Collapsed mode - vertical icon strip */}
        {projectPath && gameSpec && leftPanelCollapsed && (
          <div className="flex flex-col items-center py-2 gap-1">
            <button
              onClick={() => { setLeftPanelCollapsed(false); setLeftPanelMode('files'); }}
              className={`p-1.5 rounded transition-colors ${leftPanelMode === 'files' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="Files"
            >
              <FolderIcon size={16} />
            </button>
            <button
              onClick={() => { setLeftPanelCollapsed(false); setLeftPanelMode('entities'); }}
              className={`p-1.5 rounded transition-colors ${leftPanelMode === 'entities' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="Entities"
            >
              <EntityIcon size={16} />
            </button>
            <button
              onClick={() => { setLeftPanelCollapsed(false); setLeftPanelMode('assets'); }}
              className={`p-1.5 rounded transition-colors ${leftPanelMode === 'assets' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="Assets"
            >
              <ImageIcon size={16} />
            </button>
          </div>
        )}

        {/* Panel Header */}
        {(!projectPath || !gameSpec) && !leftPanelCollapsed && (
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
        {!leftPanelCollapsed && (
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
                  // Sync tilemap to gameSpec for runtime to use
                  if (gameSpec) {
                    setGameSpec({ ...gameSpec, tilemap });
                  }
                  setHasUnsavedChanges(true);
                }}
                selectedTileId={selectedTileId}
                onSelectedTileChange={setSelectedTileId}
                selectedLayerId={selectedLayerId}
                onSelectedLayerChange={setSelectedLayerId}
                tool={tilemapTool}
                onToolChange={setTilemapTool}
              />
            )}
          </div>
        )}

        {/* Footer Info */}
        {gameSpec && leftPanelMode === 'files' && !leftPanelCollapsed && (
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar Row with UserMenu */}
        <div className="flex items-center">
          <div className="flex-1">
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
          onMobileExport={() => setShowMobileExport(true)}
          onPublish={() => setShowPublishDialog(true)}
          onAIPlaytest={() => setShowAIPlaytest(true)}
        />
          </div>
          {/* User Menu & Cloud Actions */}
          <div className="flex items-center gap-2 px-3 h-10 bg-panel border-b border-subtle">
            <button
              onClick={() => setShowCollaborators(!showCollaborators)}
              className={`p-1.5 rounded transition-colors ${showCollaborators ? 'bg-green-500/20 text-green-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Collaborators"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowCloudProjects(true)}
              className="p-1.5 rounded text-text-tertiary hover:text-white hover:bg-white/10 transition-colors"
              title="Cloud Projects"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMarketplace(true)}
              className="p-1.5 rounded text-text-tertiary hover:text-white hover:bg-white/10 transition-colors"
              title="Asset Marketplace"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </button>
            <button
              onClick={() => setShowAITools(!showAITools)}
              className={`p-1.5 rounded transition-colors ${showAITools ? 'bg-purple-500/20 text-purple-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="AI Tools (Level Design, NPCs, Procedural, Art, Voice)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
            <button
              onClick={() => setShowProfessionalTools(!showProfessionalTools)}
              className={`p-1.5 rounded transition-colors ${showProfessionalTools ? 'bg-red-500/20 text-red-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Professional Tools (Materials, Shaders, Particles, Terrain, Weather, Day/Night)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowPerformance(!showPerformance)}
              className={`p-1.5 rounded transition-colors ${showPerformance ? 'bg-green-500/20 text-green-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Performance Tools (Instancing, LOD, Culling, Streaming, Memory)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMultiplayer(!showMultiplayer)}
              className={`p-1.5 rounded transition-colors ${showMultiplayer ? 'bg-cyan-500/20 text-cyan-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Multiplayer (Lobbies, Matchmaking, Leaderboards, State Sync)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMonetization(!showMonetization)}
              className={`p-1.5 rounded transition-colors ${showMonetization ? 'bg-amber-500/20 text-amber-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Monetization & Analytics (IAP, Ads, Analytics, A/B Testing)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowExtendedPlatforms(!showExtendedPlatforms)}
              className={`p-1.5 rounded transition-colors ${showExtendedPlatforms ? 'bg-violet-500/20 text-violet-400' : 'text-text-tertiary hover:text-white hover:bg-white/10'}`}
              title="Extended Platforms (Console, VR/AR, Steam, Mobile, WebGPU)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <div className="w-px h-5 bg-subtle mx-1" />
            <UserMenu
              onOpenAuth={() => setShowAuthDialog(true)}
              onOpenProfile={() => setShowAuthDialog(true)}
              onOpenCloudProjects={() => setShowCloudProjects(true)}
            />
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
              // Tilemap editing
              tilemapMode={tilemapMode}
              onTilemapModeToggle={() => setTilemapMode(prev => !prev)}
              selectedTileId={selectedTileId}
              selectedLayerId={selectedLayerId || gameSpec?.tilemap?.layers[0]?.id}
              tilemapTool={tilemapTool}
              onTilemapToolChange={setTilemapTool}
              onTilemapChange={(tilemap) => {
                setCurrentTilemap(tilemap as Tilemap);
                if (gameSpec) {
                  setGameSpec({ ...gameSpec, tilemap });
                }
                setHasUnsavedChanges(true);
              }}
            />
          )}

          {projectPath && viewMode === 'game' && is3DMode && game3DSpec && (
            <GameCanvas3D
              gameSpec={game3DSpec}
              isPlaying={isPlaying}
              selectedEntities={selectedEntities}
              onEntitySelect={handleEntitySelect}
              onEntityTransformChange={handle3DEntityTransformChange}
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

          {projectPath && viewMode === 'nodes' && (
            <NodeEditor
              graph={nodeGraph}
              gameSpec={gameSpec}
              onGraphChange={(graph) => {
                setNodeGraph(graph);
                setHasUnsavedChanges(true);
              }}
              onClose={() => setViewMode('game')}
              onSave={saveProject}
            />
          )}

          {projectPath && viewMode === 'shaders' && (
            <ShaderGraphEditor
              graph={shaderGraph}
              onGraphChange={(graph) => {
                setShaderGraph(graph);
                setHasUnsavedChanges(true);
              }}
              onClose={() => setViewMode('game')}
              onSave={saveProject}
            />
          )}

          {projectPath && viewMode === 'behavior' && (
            <BehaviorTreeEditor
              tree={behaviorTree}
              onTreeChange={(tree) => {
                setBehaviorTree(tree);
                setHasUnsavedChanges(true);
              }}
              onClose={() => setViewMode('game')}
              onSave={saveProject}
            />
          )}

          {projectPath && viewMode === 'states' && (
            <StateMachineEditor
              machine={stateMachine}
              onMachineChange={(sm: StateMachine) => {
                setStateMachine(sm);
                setHasUnsavedChanges(true);
              }}
              onClose={() => setViewMode('game')}
              onSave={saveProject}
            />
          )}
        </div>
      </main>

      {/* Right Panel - Inspector / JSON Editor */}
      <aside
        style={{
          width: rightPanelCollapsed ? '40px' : '320px',
          minWidth: rightPanelCollapsed ? '40px' : '320px',
          maxWidth: rightPanelCollapsed ? '40px' : '320px',
        }}
        className="flex-shrink-0 bg-panel border-l border-subtle flex flex-col backdrop-blur-md transition-[width,min-width,max-width] duration-200 relative z-20"
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRightPanelCollapsed(!rightPanelCollapsed);
          }}
          className="absolute top-1/2 -translate-y-1/2 -left-4 z-50 w-8 h-16 bg-[#1e1e2e] border border-[#3f3f5a] rounded-l-lg flex items-center justify-center hover:bg-[#2a2a3e] transition-colors shadow-lg cursor-pointer"
          title={rightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          style={{ pointerEvents: 'auto' }}
        >
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${rightPanelCollapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Panel Header - Always visible when expanded */}
        {!rightPanelCollapsed && (
          <div className="px-3 py-2 border-b border-subtle bg-surface">
            <span className="text-xs font-medium text-white">Inspector</span>
          </div>
        )}

        {/* Panel Mode Tabs */}
        {!rightPanelCollapsed && (
          <div className="flex gap-1 bg-surface border-b border-subtle p-1.5">
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

        {/* Collapsed mode - vertical icon strip */}
        {rightPanelCollapsed && (
          <div className="flex flex-col items-center py-2 gap-1">
            <button
              onClick={() => { setRightPanelCollapsed(false); setRightPanelMode('inspector'); }}
              className={`p-1.5 rounded transition-colors ${rightPanelMode === 'inspector' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="Inspector"
            >
              <EntityIcon size={16} />
            </button>
            <button
              onClick={() => { setRightPanelCollapsed(false); setRightPanelMode('json'); }}
              className={`p-1.5 rounded transition-colors ${rightPanelMode === 'json' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="JSON Editor"
            >
              <CodeIcon size={16} />
            </button>
            <button
              onClick={() => { setRightPanelCollapsed(false); setRightPanelMode('physics'); }}
              className={`p-1.5 rounded transition-colors ${rightPanelMode === 'physics' ? 'bg-primary/20 text-primary' : 'text-text-tertiary hover:text-text-primary hover:bg-white/5'}`}
              title="Physics"
            >
              <PhysicsIcon size={16} />
            </button>
          </div>
        )}

        {/* Panel Content */}
        {!rightPanelCollapsed && (
          <div className="flex-1 overflow-hidden">
            {viewMode === 'game' && rightPanelMode === 'inspector' ? (
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
          ) : viewMode === 'game' && rightPanelMode === 'json' ? (
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
          ) : viewMode === 'game' && rightPanelMode === 'scripts' ? (
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
        )}
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
        sceneContext={{
          selectedEntityId: selectedEntity,
          isPlaying,
          editorMode: is3DMode ? '3d' : '2d',
        }}
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

      {/* Mobile Export Dialog */}
      <MobileExportDialog
        isOpen={showMobileExport}
        onClose={() => setShowMobileExport(false)}
        gameSpec={gameSpec}
        onNotification={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 5000);
        }}
      />

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        gameSpec={gameSpec}
        onNotification={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 5000);
        }}
      />

      {/* AI Playtest Panel */}
      <AIPlaytestPanel
        isOpen={showAIPlaytest}
        onClose={() => setShowAIPlaytest(false)}
        gameSpec={gameSpec}
      />

      {/* v3.1 Cloud & Community Dialogs */}
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />

      <CloudProjectsDialog
        isOpen={showCloudProjects}
        onClose={() => setShowCloudProjects(false)}
        currentGameSpec={gameSpec}
        onLoadProject={(spec, name) => {
          setGameSpec(spec);
          setProjectPath(null);
          setNotification(`Loaded project: ${name}`);
          setTimeout(() => setNotification(null), 3000);
        }}
      />

      <MarketplaceDialog
        isOpen={showMarketplace}
        onClose={() => setShowMarketplace(false)}
      />

      {/* Collaborators Panel (side panel, always present when game is loaded) */}
      {showCollaborators && (
        <CollaboratorsPanel
          isOpen={showCollaborators}
          onClose={() => setShowCollaborators(false)}
          projectId={projectPath || 'default'}
        />
      )}

      {/* AI Tools Panel (v3.2 - Level Design, NPCs, Procedural, Art, Voice) */}
      <AIToolsPanel
        gameSpec={gameSpec}
        isOpen={showAITools}
        onClose={() => setShowAITools(false)}
        onApplyChanges={(entities) => {
          if (gameSpec) {
            const existingEntities = gameSpec.entities || [];
            setGameSpec({
              ...gameSpec,
              entities: [...existingEntities, ...entities],
            });
            setHasUnsavedChanges(true);
          }
        }}
        onNotification={showNotification}
      />

      {/* Professional Tools Panel (v4.0 - Materials, Shaders, Particles, Terrain, Weather, Day/Night) */}
      <ProfessionalToolsPanel
        isOpen={showProfessionalTools}
        onClose={() => setShowProfessionalTools(false)}
        onNotification={showNotification}
      />

      {/* Performance Panel (v4.1 - Instancing, LOD, Culling, Streaming, Memory) */}
      <PerformancePanel
        isOpen={showPerformance}
        onClose={() => setShowPerformance(false)}
        onNotification={showNotification}
      />

      {/* Multiplayer Panel (v5.0 - Lobbies, Matchmaking, Leaderboards, State Sync) */}
      <MultiplayerPanel
        isOpen={showMultiplayer}
        onClose={() => setShowMultiplayer(false)}
        onNotification={showNotification}
      />

      {/* Monetization Panel (v5.1 - IAP, Ads, Analytics, A/B Testing, Crash Reporting) */}
      <MonetizationPanel
        isOpen={showMonetization}
        onClose={() => setShowMonetization(false)}
        onNotification={showNotification}
      />

      {/* Extended Platforms Panel (v6.0 - Console, VR/AR, Steam, Mobile, WebGPU) */}
      <ExtendedPlatformsPanel
        isOpen={showExtendedPlatforms}
        onClose={() => setShowExtendedPlatforms(false)}
        onNotification={showNotification}
      />
    </div>
  );
}

export default App;
