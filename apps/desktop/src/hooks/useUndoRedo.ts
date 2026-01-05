// useUndoRedo - Generic undo/redo hook for state management

import { useState, useCallback, useRef, useEffect } from 'react';

interface UndoRedoOptions {
  maxHistorySize?: number;
  // Debounce time in ms - groups rapid changes into single undo step
  debounceMs?: number;
}

interface UndoRedoState<T> {
  current: T;
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
}

interface UndoRedoActions<T> {
  set: (value: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (initialValue: T) => void;
  // For creating a checkpoint (e.g., before a drag operation)
  checkpoint: () => void;
}

// Combined state to ensure atomic updates
interface HistoryState<T> {
  history: T[];
  index: number;
}

export function useUndoRedo<T>(
  initialValue: T,
  options: UndoRedoOptions = {}
): [UndoRedoState<T>, UndoRedoActions<T>] {
  const { maxHistorySize = 50, debounceMs = 300 } = options;

  // Combined history state for atomic updates
  const [state, setState] = useState<HistoryState<T>>({
    history: [initialValue],
    index: 0
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastChangeTimeRef = useRef<number>(0);

  // Current value
  const current = state.history[state.index];

  // Can undo/redo flags
  const canUndo = state.index > 0;
  const canRedo = state.index < state.history.length - 1;

  // Set new value with history tracking
  const set = useCallback((value: T) => {
    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTimeRef.current;

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setState(prev => {
      const newHistory = prev.history.slice(0, prev.index + 1);

      // If change is within debounce window, replace the last entry
      if (timeSinceLastChange < debounceMs && newHistory.length > 1) {
        newHistory[newHistory.length - 1] = value;
        return { history: newHistory, index: prev.index };
      } else {
        // Add new entry
        newHistory.push(value);

        // Trim history if too long
        if (newHistory.length > maxHistorySize) {
          const trimmed = newHistory.slice(newHistory.length - maxHistorySize);
          return { history: trimmed, index: trimmed.length - 1 };
        }

        return { history: newHistory, index: newHistory.length - 1 };
      }
    });

    lastChangeTimeRef.current = now;
  }, [debounceMs, maxHistorySize]);

  // Undo
  const undo = useCallback(() => {
    setState(prev => {
      if (prev.index > 0) {
        return { ...prev, index: prev.index - 1 };
      }
      return prev;
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState(prev => {
      if (prev.index < prev.history.length - 1) {
        return { ...prev, index: prev.index + 1 };
      }
      return prev;
    });
  }, []);

  // Reset with new initial value
  const reset = useCallback((initialValue: T) => {
    setState({ history: [initialValue], index: 0 });
    lastChangeTimeRef.current = 0;
  }, []);

  // Create a checkpoint (forces next change to be a new undo step)
  const checkpoint = useCallback(() => {
    lastChangeTimeRef.current = 0;
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const undoRedoState: UndoRedoState<T> = {
    current,
    canUndo,
    canRedo,
    historyIndex: state.index,
    historyLength: state.history.length,
  };

  const actions: UndoRedoActions<T> = {
    set,
    undo,
    redo,
    reset,
    checkpoint,
  };

  return [undoRedoState, actions];
}

// Hook to add keyboard shortcuts for undo/redo
export function useUndoRedoKeyboard(
  undo: () => void,
  redo: () => void,
  canUndo: boolean,
  canRedo: boolean
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if (modKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) redo();
      } else if (modKey && e.key === 'y') {
        // Windows-style redo
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);
}

export default useUndoRedo;
