/**
 * GameContext - Centralized game state management
 * Reduces prop drilling and prevents unnecessary re-renders
 */

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { GameSpec, EntitySpec } from '@promptplay/shared-types';

interface GameState {
  gameSpec: GameSpec | null;
  selectedEntities: Set<string>;
  isPlaying: boolean;
  hasUnsavedChanges: boolean;
  projectPath: string | null;
}

interface GameActions {
  setGameSpec: (spec: GameSpec | null) => void;
  updateGameSpec: (updater: (prev: GameSpec) => GameSpec) => void;
  selectEntity: (entityName: string, addToSelection?: boolean) => void;
  deselectEntity: (entityName: string) => void;
  clearSelection: () => void;
  selectMultiple: (entityNames: string[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  setProjectPath: (path: string | null) => void;
}

interface GameContextValue extends GameState, GameActions {
  // Computed values
  selectedEntity: EntitySpec | undefined;
  isMultiSelect: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
  initialState?: Partial<GameState>;
}

export function GameProvider({ children, initialState }: GameProviderProps) {
  const [gameSpec, setGameSpecInternal] = useState<GameSpec | null>(initialState?.gameSpec ?? null);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(
    initialState?.selectedEntities ?? new Set()
  );
  const [isPlaying, setIsPlaying] = useState(initialState?.isPlaying ?? false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(initialState?.hasUnsavedChanges ?? false);
  const [projectPath, setProjectPath] = useState<string | null>(initialState?.projectPath ?? null);

  // Actions
  const setGameSpec = useCallback((spec: GameSpec | null) => {
    setGameSpecInternal(spec);
  }, []);

  const updateGameSpec = useCallback((updater: (prev: GameSpec) => GameSpec) => {
    setGameSpecInternal(prev => prev ? updater(prev) : prev);
    setHasUnsavedChanges(true);
  }, []);

  const selectEntity = useCallback((entityName: string, addToSelection = false) => {
    setSelectedEntities(prev => {
      if (addToSelection) {
        const next = new Set(prev);
        if (next.has(entityName)) {
          next.delete(entityName);
        } else {
          next.add(entityName);
        }
        return next;
      }
      return new Set([entityName]);
    });
  }, []);

  const deselectEntity = useCallback((entityName: string) => {
    setSelectedEntities(prev => {
      const next = new Set(prev);
      next.delete(entityName);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntities(new Set());
  }, []);

  const selectMultiple = useCallback((entityNames: string[]) => {
    setSelectedEntities(new Set(entityNames));
  }, []);

  // Computed values
  const selectedEntity = useMemo(() => {
    if (selectedEntities.size === 0 || !gameSpec?.entities) return undefined;
    const firstSelected = Array.from(selectedEntities)[0];
    return gameSpec.entities.find(e => e.name === firstSelected);
  }, [gameSpec, selectedEntities]);

  const isMultiSelect = selectedEntities.size > 1;

  const value = useMemo<GameContextValue>(() => ({
    // State
    gameSpec,
    selectedEntities,
    isPlaying,
    hasUnsavedChanges,
    projectPath,
    // Actions
    setGameSpec,
    updateGameSpec,
    selectEntity,
    deselectEntity,
    clearSelection,
    selectMultiple,
    setIsPlaying,
    setHasUnsavedChanges,
    setProjectPath,
    // Computed
    selectedEntity,
    isMultiSelect,
  }), [
    gameSpec,
    selectedEntities,
    isPlaying,
    hasUnsavedChanges,
    projectPath,
    setGameSpec,
    updateGameSpec,
    selectEntity,
    deselectEntity,
    clearSelection,
    selectMultiple,
    selectedEntity,
    isMultiSelect,
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Selector hooks for performance optimization
export function useGameSpec(): GameSpec | null {
  const { gameSpec } = useGame();
  return gameSpec;
}

export function useSelectedEntities(): Set<string> {
  const { selectedEntities } = useGame();
  return selectedEntities;
}

export function useIsPlaying(): boolean {
  const { isPlaying } = useGame();
  return isPlaying;
}

export default GameContext;
