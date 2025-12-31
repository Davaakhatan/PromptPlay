import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { GameSpec } from '@promptplay/shared-types';
import GameCanvas from './components/GameCanvas';
import CodeEditor from './components/CodeEditor';
import FileTree from './components/FileTree';
import SceneTree from './components/SceneTree';
import Inspector from './components/Inspector';
import JSONEditorPanel from './components/JSONEditorPanel';
import AIPromptPanel from './components/AIPromptPanel';
import AssetBrowser from './components/AssetBrowser';
import WelcomeScreen from './components/WelcomeScreen';
import ErrorDisplay from './components/ErrorDisplay';
import { useFileWatcher } from './hooks/useFileWatcher';
import { SaveIcon, UndoIcon, RedoIcon, NewProjectIcon, AIIcon, CodeIcon, ImageIcon, ExportIcon, LoadingSpinner, CheckIcon } from './components/Icons';

type ViewMode = 'game' | 'code';
type LeftPanelMode = 'files' | 'scene' | 'assets';
type RightPanelMode = 'inspector' | 'json';

// History entry for undo/redo
interface HistoryEntry {
  gameSpec: GameSpec;
  description: string;
}

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('inspector');
  const [isExporting, setIsExporting] = useState(false);

  // Undo/Redo history
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);

  // Push to history
  const pushHistory = useCallback((spec: GameSpec, description: string) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Remove any future history if we're in the middle
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

    // Add new entry
    historyRef.current.push({
      gameSpec: JSON.parse(JSON.stringify(spec)),
      description,
    });

    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, []);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    setGameSpec(JSON.parse(JSON.stringify(entry.gameSpec)));
    setHasUnsavedChanges(true);
    setNotification(`Undo: ${entry.description}`);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    setGameSpec(JSON.parse(JSON.stringify(entry.gameSpec)));
    setHasUnsavedChanges(true);
    setNotification(`Redo: ${entry.description}`);
    setTimeout(() => setNotification(null), 2000);
  }, []);

  // Check if undo/redo available
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

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

  const openProject = useCallback(async () => {
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
      setIsPlaying(false); // Start in editing mode
      setLoading(false);
      setHasUnsavedChanges(false);

      // Initialize history
      historyRef.current = [{ gameSpec: JSON.parse(JSON.stringify(spec)), description: 'Initial state' }];
      historyIndexRef.current = 0;
    } catch (err) {
      console.error('Full error:', err);
      console.error('Game JSON string:', gameJsonStr);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      setIsPlaying(false);
    }
  }, []);

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
      setNotification('Project saved');
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

      // Initialize history
      historyRef.current = [{ gameSpec: JSON.parse(JSON.stringify(defaultSpec)), description: 'Initial state' }];
      historyIndexRef.current = 0;

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

      // Initialize history
      historyRef.current = [{ gameSpec: JSON.parse(JSON.stringify(templateSpec)), description: 'Initial state' }];
      historyIndexRef.current = 0;

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

  const handleUpdateEntity = async (entityName: string, updates: any) => {
    if (!gameSpec) return;

    // Update the game spec with modified entity
    const updatedEntities = gameSpec.entities?.map((entity) =>
      entity.name === entityName ? { ...entity, ...updates } : entity
    );

    const updatedSpec = {
      ...gameSpec,
      entities: updatedEntities,
    };

    // Push to history
    pushHistory(updatedSpec, `Update ${entityName}`);

    // Update state (don't auto-save, mark as unsaved)
    setGameSpec(updatedSpec);
    setHasUnsavedChanges(true);
  };

  const handleCreateEntity = async () => {
    if (!gameSpec) return;

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

    // Push to history
    pushHistory(updatedSpec, `Create ${newName}`);

    setGameSpec(updatedSpec);
    setSelectedEntity(newName);
    setLeftPanelMode('scene');
    setHasUnsavedChanges(true);
    setNotification('Entity created');
    setTimeout(() => setNotification(null), 2000);
  };

  const handleDeleteEntity = async (entityName: string) => {
    if (!gameSpec) return;

    const updatedEntities = gameSpec.entities?.filter((e) => e.name !== entityName) || [];

    const updatedSpec = {
      ...gameSpec,
      entities: updatedEntities,
    };

    // Push to history
    pushHistory(updatedSpec, `Delete ${entityName}`);

    setGameSpec(updatedSpec);
    if (selectedEntity === entityName) {
      setSelectedEntity(null);
    }
    setHasUnsavedChanges(true);
    setNotification('Entity deleted');
    setTimeout(() => setNotification(null), 2000);
  };

  const handleDuplicateEntity = async (entityName: string) => {
    if (!gameSpec) return;

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

    // Push to history
    pushHistory(updatedSpec, `Duplicate ${entityName}`);

    setGameSpec(updatedSpec);
    setSelectedEntity(newName);
    setHasUnsavedChanges(true);
    setNotification('Entity duplicated');
    setTimeout(() => setNotification(null), 2000);
  };

  // Handle AI-generated changes
  const handleAIChanges = useCallback((updatedSpec: GameSpec) => {
    if (!gameSpec) return;

    pushHistory(updatedSpec, 'AI modification');
    setGameSpec(updatedSpec);
    setHasUnsavedChanges(true);
    setNotification('AI changes applied');
    setTimeout(() => setNotification(null), 2000);
  }, [gameSpec, pushHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
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
            setNotification('Project saved');
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, gameSpec, projectPath, openProject, exportGame]);

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
          <div className="flex gap-1 bg-panel border-b border-subtle p-2">
            <button
              onClick={() => setLeftPanelMode('files')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${leftPanelMode === 'files'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              Files
            </button>
            <button
              onClick={() => setLeftPanelMode('scene')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${leftPanelMode === 'scene'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              Scene
            </button>
            <button
              onClick={() => setLeftPanelMode('assets')}
              className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${leftPanelMode === 'assets'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <ImageIcon size={12} />
              Assets
            </button>
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
          {leftPanelMode === 'scene' && (
            <SceneTree
              gameSpec={gameSpec}
              selectedEntity={selectedEntity}
              onSelectEntity={setSelectedEntity}
              onCreateEntity={handleCreateEntity}
            />
          )}
          {leftPanelMode === 'assets' && (
            <AssetBrowser
              projectPath={projectPath}
              onAssetSelect={(path, type) => {
                console.log('Selected asset:', path, type);
                // Could be used to set texture on selected entity
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
        {/* Toolbar */}
        {/* Toolbar */}
        <div className="bg-panel border-b border-subtle p-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-text-primary">PromptPlay Desktop</h1>

            {/* View Mode Tabs */}
            {projectPath && (
              <div className="flex gap-1 bg-subtle rounded-lg p-1">
                <button
                  onClick={() => setViewMode('game')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'game'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                  Game
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'code'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                >
                  Code
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* New Project */}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md transition-all"
              title="New Project"
            >
              <NewProjectIcon size={18} />
            </button>

            <button
              onClick={openProject}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size={16} />
                  <span>Loading...</span>
                </>
              ) : (
                projectPath ? 'Change Project' : 'Open Project'
              )}
            </button>

            {/* Divider */}
            {projectPath && <div className="w-px h-6 bg-subtle" />}

            {/* Save */}
            {projectPath && (
              <button
                onClick={saveProject}
                className={`p-2 rounded-md ${hasUnsavedChanges
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                title="Save Project (Cmd+S)"
              >
                <SaveIcon size={18} />
              </button>
            )}

            {/* Undo/Redo */}
            {projectPath && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Undo (Cmd+Z)"
                >
                  <UndoIcon size={18} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Redo (Cmd+Shift+Z)"
                >
                  <RedoIcon size={18} />
                </button>
              </>
            )}

            {/* Divider */}
            {gameSpec && viewMode === 'game' && <div className="w-px h-6 bg-gray-300" />}

            {gameSpec && viewMode === 'game' && (
              <>
                <button
                  onClick={togglePlayPause}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${isPlaying
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
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

            {/* Divider */}
            {projectPath && <div className="w-px h-6 bg-gray-300" />}

            {/* AI Assistant */}
            {projectPath && (
              <button
                onClick={() => setShowAIPanel(prev => !prev)}
                className={`p-2 rounded-md flex items-center gap-1 ${showAIPanel
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                title="AI Assistant"
              >
                <AIIcon size={18} />
                <span className="text-sm font-medium">AI</span>
              </button>
            )}

            {/* Export */}
            {gameSpec && (
              <button
                onClick={exportGame}
                disabled={isExporting}
                className="px-3 py-2 rounded-md flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                title="Export as HTML (Ctrl+E)"
              >
                {isExporting ? (
                  <LoadingSpinner size={16} />
                ) : (
                  <ExportIcon size={16} />
                )}
                <span className="text-sm font-medium">{isExporting ? 'Exporting...' : 'Export'}</span>
              </button>
            )}

            {/* Unsaved indicator */}
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-500 font-medium">Unsaved</span>
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
              selectedEntity={selectedEntity}
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
          <div className="flex gap-1 bg-panel border-b border-subtle p-2">
            <button
              onClick={() => setRightPanelMode('inspector')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${rightPanelMode === 'inspector'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              Inspector
            </button>
            <button
              onClick={() => setRightPanelMode('json')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 ${rightPanelMode === 'json'
                ? 'bg-subtle text-white shadow-sm border border-white/5'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
            >
              <CodeIcon size={14} />
              JSON
            </button>
          </div>
        )}

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'game' && gameSpec && rightPanelMode === 'inspector' ? (
            <Inspector
              gameSpec={gameSpec}
              selectedEntity={selectedEntity}
              onUpdateEntity={handleUpdateEntity}
              onDeleteEntity={handleDeleteEntity}
              onDuplicateEntity={handleDuplicateEntity}
            />
          ) : viewMode === 'game' && gameSpec && rightPanelMode === 'json' ? (
            <JSONEditorPanel
              gameSpec={gameSpec}
              onApplyChanges={handleAIChanges}
              selectedEntity={selectedEntity}
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
        onApplyChanges={handleAIChanges}
        isVisible={showAIPanel}
        onClose={() => setShowAIPanel(false)}
      />
    </div>
  );
}

export default App;
