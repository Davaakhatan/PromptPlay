import { useCallback, useRef, useState } from 'react';
import type { NodeGraph } from '../types/NodeEditor';

interface HistoryEntry {
  graph: NodeGraph;
  description: string;
}

interface HistoryState {
  undoCount: number;
  redoCount: number;
  lastAction: string;
}

interface UseNodeGraphHistoryOptions {
  maxHistorySize?: number;
}

export function useNodeGraphHistory({
  maxHistorySize = 50,
}: UseNodeGraphHistoryOptions = {}) {
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
    (graph: NodeGraph, description: string) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }

      // Remove any future history if we're in the middle
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

      // Add new entry
      historyRef.current.push({
        graph: JSON.parse(JSON.stringify(graph)),
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

  const undo = useCallback((): NodeGraph | null => {
    if (historyIndexRef.current <= 0) return null;

    historyIndexRef.current--;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    updateHistoryState();
    return JSON.parse(JSON.stringify(entry.graph));
  }, [updateHistoryState]);

  const redo = useCallback((): NodeGraph | null => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return null;

    historyIndexRef.current++;
    isUndoRedoRef.current = true;

    const entry = historyRef.current[historyIndexRef.current];
    updateHistoryState();
    return JSON.parse(JSON.stringify(entry.graph));
  }, [updateHistoryState]);

  const initializeHistory = useCallback(
    (graph: NodeGraph) => {
      historyRef.current = [
        { graph: JSON.parse(JSON.stringify(graph)), description: 'Initial state' },
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

  const getActionDescription = useCallback((): string => {
    return historyRef.current[historyIndexRef.current]?.description || '';
  }, []);

  return {
    historyState,
    canUndo: historyState.undoCount > 0,
    canRedo: historyState.redoCount > 0,
    pushHistory,
    undo,
    redo,
    initializeHistory,
    clearHistory,
    getActionDescription,
  };
}
