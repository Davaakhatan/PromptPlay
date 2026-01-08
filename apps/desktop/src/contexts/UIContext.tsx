/**
 * UIContext - Centralized UI state management
 * Manages view modes, panels, and UI preferences
 */

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type ViewMode = 'game' | 'code' | 'nodes' | 'shaders' | 'behavior' | 'states';
type LeftPanelMode = 'files' | 'scenes' | 'entities' | 'prefabs' | 'assets' | 'tilemap';
type RightPanelMode = 'inspector' | 'json' | 'physics' | 'scripts';

interface UIState {
  viewMode: ViewMode;
  leftPanelMode: LeftPanelMode;
  rightPanelMode: RightPanelMode;
  showAIPanel: boolean;
  showGrid: boolean;
  showDebug: boolean;
  is3DMode: boolean;
  notification: string | null;
}

interface UIActions {
  setViewMode: (mode: ViewMode) => void;
  setLeftPanelMode: (mode: LeftPanelMode) => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  toggleAIPanel: () => void;
  setShowAIPanel: (show: boolean) => void;
  toggleGrid: () => void;
  toggleDebug: () => void;
  toggle3DMode: () => void;
  setIs3DMode: (mode: boolean) => void;
  showNotification: (message: string, duration?: number) => void;
  clearNotification: () => void;
}

interface UIContextValue extends UIState, UIActions {}

const UIContext = createContext<UIContextValue | null>(null);

interface UIProviderProps {
  children: ReactNode;
  initialState?: Partial<UIState>;
}

export function UIProvider({ children, initialState }: UIProviderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialState?.viewMode ?? 'game');
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>(initialState?.leftPanelMode ?? 'files');
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(initialState?.rightPanelMode ?? 'inspector');
  const [showAIPanel, setShowAIPanel] = useState(initialState?.showAIPanel ?? false);
  const [showGrid, setShowGrid] = useState(initialState?.showGrid ?? false);
  const [showDebug, setShowDebug] = useState(initialState?.showDebug ?? false);
  const [is3DMode, setIs3DMode] = useState(initialState?.is3DMode ?? false);
  const [notification, setNotification] = useState<string | null>(initialState?.notification ?? null);

  // Actions
  const toggleAIPanel = useCallback(() => {
    setShowAIPanel(prev => !prev);
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);

  const toggleDebug = useCallback(() => {
    setShowDebug(prev => !prev);
  }, []);

  const toggle3DMode = useCallback(() => {
    setIs3DMode(prev => !prev);
  }, []);

  const showNotification = useCallback((message: string, duration = 3000) => {
    setNotification(message);
    if (duration > 0) {
      setTimeout(() => setNotification(null), duration);
    }
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const value = useMemo<UIContextValue>(() => ({
    // State
    viewMode,
    leftPanelMode,
    rightPanelMode,
    showAIPanel,
    showGrid,
    showDebug,
    is3DMode,
    notification,
    // Actions
    setViewMode,
    setLeftPanelMode,
    setRightPanelMode,
    toggleAIPanel,
    setShowAIPanel,
    toggleGrid,
    toggleDebug,
    toggle3DMode,
    setIs3DMode,
    showNotification,
    clearNotification,
  }), [
    viewMode,
    leftPanelMode,
    rightPanelMode,
    showAIPanel,
    showGrid,
    showDebug,
    is3DMode,
    notification,
    toggleAIPanel,
    toggleGrid,
    toggleDebug,
    toggle3DMode,
    showNotification,
    clearNotification,
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

// Selector hooks for performance
export function useViewMode(): ViewMode {
  const { viewMode } = useUI();
  return viewMode;
}

export function useNotification(): string | null {
  const { notification } = useUI();
  return notification;
}

export default UIContext;
