import { useCallback } from 'react';
import type { GameSpec, SceneSpec } from '@promptplay/shared-types';

interface UseSceneManagementOptions {
  gameSpec: GameSpec | null;
  activeSceneId: string | null;
  onGameSpecChange: (spec: GameSpec) => void;
  onActiveSceneChange: (sceneId: string | null) => void;
  onSelectedEntitiesChange: (entities: Set<string>) => void;
  onUnsavedChange: (value: boolean) => void;
  onNotification: (message: string) => void;
  pushHistory: (spec: GameSpec, description: string) => void;
}

export function useSceneManagement(options: UseSceneManagementOptions) {
  const {
    gameSpec,
    activeSceneId,
    onGameSpecChange,
    onActiveSceneChange,
    onSelectedEntitiesChange,
    onUnsavedChange,
    onNotification,
    pushHistory,
  } = options;

  const handleSwitchScene = useCallback((sceneId: string) => {
    onActiveSceneChange(sceneId);
    onSelectedEntitiesChange(new Set());
    onNotification('Switched to scene');
    setTimeout(() => onNotification(''), 1500);
  }, [onActiveSceneChange, onSelectedEntitiesChange, onNotification]);

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
    onGameSpecChange(updatedSpec);
    onActiveSceneChange(newSceneId);
    onUnsavedChange(true);
    onNotification(`Created scene "${name}"`);
    setTimeout(() => onNotification(''), 2000);
  }, [gameSpec, pushHistory, onGameSpecChange, onActiveSceneChange, onUnsavedChange, onNotification]);

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
    onGameSpecChange(updatedSpec);
    onUnsavedChange(true);
  }, [gameSpec, pushHistory, onGameSpecChange, onUnsavedChange]);

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
    onGameSpecChange(updatedSpec);
    onActiveSceneChange(newActiveScene);
    onUnsavedChange(true);
    onNotification('Deleted scene');
    setTimeout(() => onNotification(''), 2000);
  }, [gameSpec, activeSceneId, pushHistory, onGameSpecChange, onActiveSceneChange, onUnsavedChange, onNotification]);

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
    onGameSpecChange(updatedSpec);
    onUnsavedChange(true);
    onNotification('Duplicated scene');
    setTimeout(() => onNotification(''), 2000);
  }, [gameSpec, pushHistory, onGameSpecChange, onUnsavedChange, onNotification]);

  return {
    handleSwitchScene,
    handleCreateScene,
    handleRenameScene,
    handleDeleteScene,
    handleDuplicateScene,
  };
}
