import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import type { GameSpec, Prefab, ChatMessage } from '@promptplay/shared-types';
import {
  exportGamePackage,
  importGamePackage,
  type ExportOptions,
} from '../services/GamePackageService';
import { logError, getErrorMessage } from '../utils/errorUtils';

interface UseProjectOperationsOptions {
  gameSpec: GameSpec | null;
  projectPath: string | null;
  prefabs?: Prefab[];
  chatHistory?: ChatMessage[];
  onGameSpecChange: (spec: GameSpec | null) => void;
  onProjectPathChange: (path: string | null) => void;
  onActiveSceneChange: (sceneId: string | null) => void;
  onSelectedEntitiesChange: (entities: Set<string>) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onLoadingChange: (isLoading: boolean) => void;
  onErrorChange: (error: string | null) => void;
  onUnsavedChange: (hasUnsaved: boolean) => void;
  onExportingChange: (isExporting: boolean) => void;
  onNotification: (message: string) => void;
  initializeHistory: (spec: GameSpec) => void;
  onPrefabsChange?: (prefabs: Prefab[]) => void;
  onChatHistoryChange?: (history: ChatMessage[]) => void;
}

// Template specs for different game types
function getTemplateSpec(templateId: string, projectName: string): GameSpec {
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
              input: { moveSpeed: 150, jumpForce: 280 },
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
              input: { moveSpeed: 150, jumpForce: 280 },
            },
            tags: ['player'],
          },
        ],
      };
  }
}

export function useProjectOperations(options: UseProjectOperationsOptions) {
  const {
    gameSpec,
    projectPath,
    prefabs = [],
    chatHistory = [],
    onGameSpecChange,
    onProjectPathChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onPlayingChange,
    onLoadingChange,
    onErrorChange,
    onUnsavedChange,
    onExportingChange,
    onNotification,
    initializeHistory,
    onPrefabsChange,
    onChatHistoryChange,
  } = options;

  const openProject = useCallback(async () => {
    try {
      onLoadingChange(true);
      onErrorChange(null);

      // Use custom Rust command to avoid cyclic structure serialization issues
      const selected = await invoke<string | null>('pick_directory', {
        title: 'Open Game Project',
      });

      if (!selected) {
        onLoadingChange(false);
        return;
      }

      onProjectPathChange(selected);
      const gameJsonStr = await invoke<string>('load_game_spec', { projectPath: selected });
      const spec = JSON.parse(gameJsonStr) as GameSpec;

      onGameSpecChange(spec);
      onPlayingChange(false);
      onLoadingChange(false);
      onUnsavedChange(false);
      onSelectedEntitiesChange(new Set());

      // Initialize active scene if project has scenes
      if (spec.scenes && spec.scenes.length > 0) {
        onActiveSceneChange(spec.activeScene || spec.scenes[0].id);
      } else {
        onActiveSceneChange(null);
      }

      initializeHistory(spec);
    } catch (err) {
      logError('Failed to open project', err);
      onErrorChange(getErrorMessage(err));
      onLoadingChange(false);
      onPlayingChange(false);
    }
  }, [
    onGameSpecChange,
    onProjectPathChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onPlayingChange,
    onLoadingChange,
    onErrorChange,
    onUnsavedChange,
    initializeHistory,
  ]);

  const saveProject = useCallback(async () => {
    if (!gameSpec || !projectPath) return;

    try {
      const gameJsonPath = `${projectPath}/game.json`;
      const gameJsonContent = JSON.stringify(gameSpec, null, 2);

      await invoke('write_file', {
        path: gameJsonPath,
        content: gameJsonContent,
      });

      onUnsavedChange(false);
      onNotification('Saved');
      setTimeout(() => onNotification(''), 2000);
    } catch (err) {
      logError('Failed to save project', err);
      onErrorChange('Failed to save project: ' + getErrorMessage(err));
    }
  }, [gameSpec, projectPath, onUnsavedChange, onNotification, onErrorChange]);

  const createNewProject = useCallback(async (projectName: string) => {
    if (!projectName.trim()) return;

    try {
      const selectedPath = await save({
        title: 'Create New Project',
        defaultPath: projectName,
      });

      if (!selectedPath) return;

      // Create project directory
      await invoke('create_directory', { path: selectedPath });

      // Create default game.json
      const defaultSpec: GameSpec = {
        version: '1.0.0',
        metadata: {
          title: projectName,
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
              input: { moveSpeed: 150, jumpForce: 280 },
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

      onProjectPathChange(selectedPath);
      onGameSpecChange(defaultSpec);
      onPlayingChange(false);
      onUnsavedChange(false);
      onActiveSceneChange(null);
      onSelectedEntitiesChange(new Set());
      initializeHistory(defaultSpec);

      onNotification('Project created');
      setTimeout(() => onNotification(''), 2000);

      return true;
    } catch (err) {
      logError('Failed to create project', err);
      onErrorChange('Failed to create project: ' + getErrorMessage(err));
      return false;
    }
  }, [
    onProjectPathChange,
    onGameSpecChange,
    onPlayingChange,
    onUnsavedChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onNotification,
    onErrorChange,
    initializeHistory,
  ]);

  const createFromTemplate = useCallback(async (templateId: string) => {
    const projectName = `${templateId}-game`;

    try {
      const selectedPath = await save({
        title: `Create ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Project`,
        defaultPath: projectName,
      });

      if (!selectedPath) return;

      await invoke('create_directory', { path: selectedPath });

      const templateSpec = getTemplateSpec(templateId, projectName);

      const gameJsonPath = `${selectedPath}/game.json`;
      await invoke('write_file', {
        path: gameJsonPath,
        content: JSON.stringify(templateSpec, null, 2),
      });

      onProjectPathChange(selectedPath);
      onGameSpecChange(templateSpec);
      onPlayingChange(false);
      onUnsavedChange(false);
      onActiveSceneChange(null);
      onSelectedEntitiesChange(new Set());
      initializeHistory(templateSpec);

      onNotification(`${templateId} project created`);
      setTimeout(() => onNotification(''), 2000);
    } catch (err) {
      logError('Failed to create project from template', err);
      onErrorChange('Failed to create project: ' + getErrorMessage(err));
    }
  }, [
    onProjectPathChange,
    onGameSpecChange,
    onPlayingChange,
    onUnsavedChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onNotification,
    onErrorChange,
    initializeHistory,
  ]);

  const exportGame = useCallback(async () => {
    if (!gameSpec) return;

    try {
      onExportingChange(true);

      const gameTitle = gameSpec.metadata?.title || 'PromptPlay Game';
      const defaultFileName = `${gameTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.html`;

      const outputPath = await save({
        title: 'Export Game as HTML',
        defaultPath: defaultFileName,
        filters: [{ name: 'HTML Files', extensions: ['html'] }],
      });

      if (!outputPath) {
        onExportingChange(false);
        return;
      }

      await invoke('export_game_html', {
        gameSpecJson: JSON.stringify(gameSpec),
        outputPath,
        gameTitle,
      });

      onNotification('Game exported successfully!');
      setTimeout(() => onNotification(''), 3000);
    } catch (err) {
      logError('Failed to export game', err);
      onErrorChange('Failed to export game: ' + getErrorMessage(err));
    } finally {
      onExportingChange(false);
    }
  }, [gameSpec, onExportingChange, onNotification, onErrorChange]);

  /**
   * Export game as a portable .promptplay.json package
   */
  const exportPackage = useCallback(async (exportOptions?: ExportOptions) => {
    if (!gameSpec) return;

    try {
      onExportingChange(true);

      const savedPath = await exportGamePackage(
        gameSpec,
        projectPath,
        prefabs,
        chatHistory,
        exportOptions
      );

      if (savedPath) {
        onNotification('Package exported successfully!');
        setTimeout(() => onNotification(''), 3000);
      }
    } catch (err) {
      logError('Failed to export package', err);
      onErrorChange('Failed to export package: ' + getErrorMessage(err));
    } finally {
      onExportingChange(false);
    }
  }, [gameSpec, projectPath, prefabs, chatHistory, onExportingChange, onNotification, onErrorChange]);

  /**
   * Import a .promptplay.json package
   */
  const importPackage = useCallback(async () => {
    try {
      onLoadingChange(true);
      onErrorChange(null);

      const result = await importGamePackage(projectPath || undefined);

      if (!result) {
        onLoadingChange(false);
        return; // User cancelled
      }

      // Update game spec
      onGameSpecChange(result.gameSpec);
      initializeHistory(result.gameSpec);

      // Update prefabs if handler provided
      if (onPrefabsChange && result.prefabs.length > 0) {
        onPrefabsChange(result.prefabs);
      }

      // Update chat history if handler provided
      if (onChatHistoryChange && result.chatHistory) {
        onChatHistoryChange(result.chatHistory);
      }

      // Set active scene if multi-scene
      if (result.gameSpec.scenes && result.gameSpec.scenes.length > 0) {
        onActiveSceneChange(result.gameSpec.activeScene || result.gameSpec.scenes[0].id);
      } else {
        onActiveSceneChange(null);
      }

      onSelectedEntitiesChange(new Set());
      onPlayingChange(false);
      onUnsavedChange(true); // Mark as unsaved since it's imported

      const assetMsg = result.extractedAssets.length > 0
        ? ` (${result.extractedAssets.length} assets extracted)`
        : '';
      onNotification(`Imported "${result.gameSpec.metadata.title}"${assetMsg}`);
      setTimeout(() => onNotification(''), 3000);

      onLoadingChange(false);
    } catch (err) {
      logError('Failed to import package', err);
      onErrorChange('Failed to import package: ' + getErrorMessage(err));
      onLoadingChange(false);
    }
  }, [
    projectPath,
    onGameSpecChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onPlayingChange,
    onLoadingChange,
    onErrorChange,
    onUnsavedChange,
    onNotification,
    initializeHistory,
    onPrefabsChange,
    onChatHistoryChange,
  ]);

  return {
    openProject,
    saveProject,
    createNewProject,
    createFromTemplate,
    exportGame,
    exportPackage,
    importPackage,
  };
}
