import { useEffect, useCallback } from 'react';
import type { GameSpec } from '@promptplay/shared-types';

interface UseKeyboardShortcutsOptions {
  gameSpec: GameSpec | null;
  projectPath: string | null;
  viewMode: 'game' | 'code';
  selectedEntity: string | null;
  selectedEntities: Set<string>;
  clipboardEntity: any;
  showKeyboardShortcuts: boolean;

  // Callbacks
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => Promise<void>;
  onOpenProject: () => void;
  onExportGame: () => void;
  onCreateEntity: () => void;
  onDeleteEntity: (name: string) => void;
  onDeleteSelected: () => void;
  onDuplicateEntity: (name: string) => void;
  onDuplicateSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCopyEntity: (entity: any) => void;
  onShowNewProjectModal: () => void;
  onShowKeyboardShortcuts: () => void;
  onHideKeyboardShortcuts: () => void;
  onNotification: (message: string) => void;
  pushHistory: (spec: GameSpec, description: string) => void;
  setGameSpec: (spec: GameSpec) => void;
  setSelectedEntity: (name: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const {
    gameSpec,
    projectPath,
    viewMode,
    selectedEntity,
    selectedEntities,
    clipboardEntity,
    showKeyboardShortcuts,
    onUndo,
    onRedo,
    onSave,
    onOpenProject,
    onExportGame,
    onCreateEntity,
    onDeleteEntity,
    onDeleteSelected,
    onDuplicateEntity,
    onDuplicateSelected,
    onSelectAll,
    onClearSelection,
    onCopyEntity,
    onShowNewProjectModal,
    onShowKeyboardShortcuts,
    onHideKeyboardShortcuts,
    onNotification,
    pushHistory,
    setGameSpec,
    setSelectedEntity,
    setHasUnsavedChanges,
  } = options;

  const handlePaste = useCallback(() => {
    if (!clipboardEntity || !gameSpec || viewMode !== 'game') return;

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
    onNotification('Entity pasted');
  }, [clipboardEntity, gameSpec, viewMode, pushHistory, setGameSpec, setSelectedEntity, setHasUnsavedChanges, onNotification]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Quick Create Entity: Cmd/Ctrl + Shift + N
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        if (gameSpec) {
          onCreateEntity();
        }
        return;
      }

      // New Project: Cmd/Ctrl + N
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        onShowNewProjectModal();
        return;
      }

      // Open Project: Cmd/Ctrl + O
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        onOpenProject();
        return;
      }

      // Save: Cmd/Ctrl + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (gameSpec && projectPath) {
          await onSave();
        }
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Export: Cmd/Ctrl + E
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        if (gameSpec) {
          onExportGame();
        }
        return;
      }

      // Keyboard shortcuts help: ?
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        onShowKeyboardShortcuts();
        return;
      }

      // Close modals: Escape
      if (e.key === 'Escape') {
        if (showKeyboardShortcuts) {
          onHideKeyboardShortcuts();
          return;
        }
        if (selectedEntities.size > 0) {
          onClearSelection();
          return;
        }
      }

      // Select All: Cmd/Ctrl + A
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && viewMode === 'game' && gameSpec?.entities) {
        if (isInputField) return;
        e.preventDefault();
        onSelectAll();
        return;
      }

      // Delete selected entity(ies): Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntities.size > 0 && viewMode === 'game') {
        if (isInputField) return;
        e.preventDefault();
        if (selectedEntities.size > 1) {
          onDeleteSelected();
        } else if (selectedEntity) {
          onDeleteEntity(selectedEntity);
        }
        return;
      }

      // Duplicate: Cmd/Ctrl + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && selectedEntities.size > 0 && viewMode === 'game') {
        e.preventDefault();
        if (selectedEntities.size > 1) {
          onDuplicateSelected();
        } else if (selectedEntity) {
          onDuplicateEntity(selectedEntity);
        }
        return;
      }

      // Copy: Cmd/Ctrl + C
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedEntity && gameSpec && viewMode === 'game') {
        const entity = gameSpec.entities?.find((e) => e.name === selectedEntity);
        if (entity) {
          onCopyEntity(JSON.parse(JSON.stringify(entity)));
          onNotification('Entity copied');
        }
        return;
      }

      // Paste: Cmd/Ctrl + V
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboardEntity && gameSpec && viewMode === 'game') {
        e.preventDefault();
        handlePaste();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameSpec,
    projectPath,
    viewMode,
    selectedEntity,
    selectedEntities,
    clipboardEntity,
    showKeyboardShortcuts,
    onUndo,
    onRedo,
    onSave,
    onOpenProject,
    onExportGame,
    onCreateEntity,
    onDeleteEntity,
    onDeleteSelected,
    onDuplicateEntity,
    onDuplicateSelected,
    onSelectAll,
    onClearSelection,
    onCopyEntity,
    onShowNewProjectModal,
    onShowKeyboardShortcuts,
    onHideKeyboardShortcuts,
    onNotification,
    handlePaste,
  ]);
}
