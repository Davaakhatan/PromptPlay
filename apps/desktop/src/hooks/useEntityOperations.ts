import { useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';

interface UseEntityOperationsOptions {
  gameSpec: GameSpec | null;
  selectedEntity: string | null;
  onGameSpecChange: (spec: GameSpec) => void;
  onSelectedEntityChange: (name: string | null) => void;
  onUnsavedChange: (hasChanges: boolean) => void;
  onNotification: (message: string | null) => void;
  onLeftPanelModeChange: (mode: 'files' | 'scenes' | 'entities' | 'prefabs' | 'assets') => void;
  pushHistory: (spec: GameSpec, description: string) => void;
}

export function useEntityOperations({
  gameSpec,
  selectedEntity,
  onGameSpecChange,
  onSelectedEntityChange,
  onUnsavedChange,
  onNotification,
  onLeftPanelModeChange,
  pushHistory,
}: UseEntityOperationsOptions) {
  const handleUpdateEntity = useCallback(
    (entityName: string, updates: any) => {
      if (!gameSpec) return;

      const updatedEntities = gameSpec.entities?.map((entity) =>
        entity.name === entityName ? { ...entity, ...updates } : entity
      );

      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      pushHistory(updatedSpec, `Update ${entityName}`);
      onGameSpecChange(updatedSpec);
      onUnsavedChange(true);
    },
    [gameSpec, pushHistory, onGameSpecChange, onUnsavedChange]
  );

  const handleCreateEntity = useCallback(() => {
    if (!gameSpec) return;

    const baseName = 'entity';
    let counter = 1;
    const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
    while (existingNames.has(`${baseName}${counter}`)) {
      counter++;
    }
    const newName = `${baseName}${counter}`;

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

    pushHistory(updatedSpec, `Create ${newName}`);
    onGameSpecChange(updatedSpec);
    onSelectedEntityChange(newName);
    onLeftPanelModeChange('entities');
    onUnsavedChange(true);
    onNotification('Entity created');
    setTimeout(() => onNotification(null), 2000);
  }, [gameSpec, pushHistory, onGameSpecChange, onSelectedEntityChange, onLeftPanelModeChange, onUnsavedChange, onNotification]);

  const handleDeleteEntity = useCallback(
    (entityName: string) => {
      if (!gameSpec) return;

      const updatedEntities = gameSpec.entities?.filter((e) => e.name !== entityName) || [];
      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      pushHistory(updatedSpec, `Delete ${entityName}`);
      onGameSpecChange(updatedSpec);
      if (selectedEntity === entityName) {
        onSelectedEntityChange(null);
      }
      onUnsavedChange(true);
      onNotification('Entity deleted');
      setTimeout(() => onNotification(null), 2000);
    },
    [gameSpec, selectedEntity, pushHistory, onGameSpecChange, onSelectedEntityChange, onUnsavedChange, onNotification]
  );

  const handleDuplicateEntity = useCallback(
    (entityName: string) => {
      if (!gameSpec) return;

      const entity = gameSpec.entities?.find((e) => e.name === entityName);
      if (!entity) return;

      let counter = 1;
      const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
      while (existingNames.has(`${entityName}_copy${counter}`)) {
        counter++;
      }
      const newName = `${entityName}_copy${counter}`;

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

      pushHistory(updatedSpec, `Duplicate ${entityName}`);
      onGameSpecChange(updatedSpec);
      onSelectedEntityChange(newName);
      onUnsavedChange(true);
      onNotification('Entity duplicated');
      setTimeout(() => onNotification(null), 2000);
    },
    [gameSpec, pushHistory, onGameSpecChange, onSelectedEntityChange, onUnsavedChange, onNotification]
  );

  const handleRenameEntity = useCallback(
    (oldName: string, newName: string) => {
      if (!gameSpec) return;
      if (!newName || newName === oldName) return;

      const existingNames = new Set(gameSpec.entities?.map((e) => e.name) || []);
      if (existingNames.has(newName)) return;

      const updatedEntities = gameSpec.entities?.map((entity) =>
        entity.name === oldName ? { ...entity, name: newName } : entity
      );

      const updatedSpec = {
        ...gameSpec,
        entities: updatedEntities,
      };

      pushHistory(updatedSpec, `Rename ${oldName} to ${newName}`);
      onGameSpecChange(updatedSpec);
      if (selectedEntity === oldName) {
        onSelectedEntityChange(newName);
      }
      onUnsavedChange(true);
      onNotification(`Renamed to "${newName}"`);
      setTimeout(() => onNotification(null), 2000);
    },
    [gameSpec, selectedEntity, pushHistory, onGameSpecChange, onSelectedEntityChange, onUnsavedChange, onNotification]
  );

  const handleApplyAIChanges = useCallback(
    (updatedSpec: GameSpec) => {
      if (!gameSpec) return;

      pushHistory(updatedSpec, 'AI modification');
      onGameSpecChange(updatedSpec);
      onUnsavedChange(true);
      onNotification('AI changes applied');
      setTimeout(() => onNotification(null), 2000);
    },
    [gameSpec, pushHistory, onGameSpecChange, onUnsavedChange, onNotification]
  );

  return {
    handleUpdateEntity,
    handleCreateEntity,
    handleDeleteEntity,
    handleDuplicateEntity,
    handleRenameEntity,
    handleApplyAIChanges,
  };
}
