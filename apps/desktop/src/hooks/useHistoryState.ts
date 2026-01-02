import { useCallback, useRef, useState } from 'react';
import type { GameSpec } from '@promptplay/shared-types';

interface HistoryEntry {
  gameSpec: GameSpec;
  description: string;
}

interface HistoryState {
  undoCount: number;
  redoCount: number;
  lastAction: string;
}

interface UseHistoryStateOptions {
  onGameSpecChange: (spec: GameSpec) => void;
  onUnsavedChange: (hasChanges: boolean) => void;
  onNotification: (message: string | null) => void;
  maxHistorySize?: number;
}

export function useHistoryState({
  onGameSpecChange,
  onUnsavedChange,
  onNotification,
  maxHistorySize = 50,
}: UseHistoryStateOptions) {
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);
  const [historyState, setHistoryState] = useState<HistoryState>({
    undoCount: 0,
    redoCount: 0,
    lastAction: '',
  });

  const updateHistoryState = useCallback(() => {
    const undoCount = historyIndexRef.current;
    const redoCount = historyRef.current.length - 1 - historyIndexRef.current;
    const lastAction = historyRef.current[historyIndexRef.current]?.description || '';
    setHistoryState({ undoCount, redoCount, lastAction });
  }, []);

  const pushHistory = useCallback(
    (spec: GameSpec, description: string) => {
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
      if (historyRef.current.length > maxHistorySize) {
        historyRef.current.shift();
      } else {
        historyIndexRef.current++;
      }

      updateHistoryState();
    },
    [maxHistorySize, updateHistoryState]
  );

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    onGameSpecChange(JSON.parse(JSON.stringify(entry.gameSpec)));
    onUnsavedChange(true);
    onNotification(`Undo: ${entry.description}`);
    setTimeout(() => onNotification(null), 2000);
    updateHistoryState();
  }, [onGameSpecChange, onUnsavedChange, onNotification, updateHistoryState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current++;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    onGameSpecChange(JSON.parse(JSON.stringify(entry.gameSpec)));
    onUnsavedChange(true);
    onNotification(`Redo: ${entry.description}`);
    setTimeout(() => onNotification(null), 2000);
    updateHistoryState();
  }, [onGameSpecChange, onUnsavedChange, onNotification, updateHistoryState]);

  const initializeHistory = useCallback(
    (spec: GameSpec) => {
      historyRef.current = [
        { gameSpec: JSON.parse(JSON.stringify(spec)), description: 'Initial state' },
      ];
      historyIndexRef.current = 0;
      updateHistoryState();
    },
    [updateHistoryState]
  );

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    updateHistoryState();
  }, [updateHistoryState]);

  return {
    historyState,
    canUndo: historyState.undoCount > 0,
    canRedo: historyState.redoCount > 0,
    pushHistory,
    handleUndo,
    handleRedo,
    initializeHistory,
    clearHistory,
  };
}
