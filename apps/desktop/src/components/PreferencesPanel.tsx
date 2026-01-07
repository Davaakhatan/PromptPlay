/**
 * Preferences Panel
 * Settings and configuration for the editor
 */

import { useState, useEffect } from 'react';

interface Preferences {
  // Editor Settings
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  autoSave: boolean;
  autoSaveInterval: number; // seconds

  // Grid & Snapping
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;

  // Performance
  maxFps: number;
  enableVsync: boolean;
  hardwareAcceleration: boolean;

  // Preview
  defaultPreviewSize: 'auto' | 'fixed';
  previewWidth: number;
  previewHeight: number;

  // Code Editor
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;

  // Asset Pipeline
  enableAssetCaching: boolean;
  maxCacheSize: number; // MB
  preloadAssets: boolean;

  // Collaboration
  sharePresence: boolean;
  showCursors: boolean;

  // Notifications
  enableNotifications: boolean;
  soundEffects: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  fontSize: 14,
  autoSave: true,
  autoSaveInterval: 60,
  gridSize: 16,
  snapToGrid: true,
  showRulers: false,
  maxFps: 60,
  enableVsync: true,
  hardwareAcceleration: true,
  defaultPreviewSize: 'auto',
  previewWidth: 800,
  previewHeight: 600,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  enableAssetCaching: true,
  maxCacheSize: 100,
  preloadAssets: true,
  sharePresence: true,
  showCursors: true,
  enableNotifications: true,
  soundEffects: false,
};

const STORAGE_KEY = 'promptplay-preferences';

interface PreferencesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange?: (prefs: Preferences) => void;
}

type PreferenceCategory = 'editor' | 'grid' | 'performance' | 'preview' | 'code' | 'assets' | 'collaboration' | 'notifications';

export function PreferencesPanel({ isOpen, onClose, onPreferencesChange }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [activeCategory, setActiveCategory] = useState<PreferenceCategory>('editor');
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    }
  }, []);

  // Save preferences
  const savePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    onPreferencesChange?.(preferences);
    setHasChanges(false);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setHasChanges(true);
  };

  // Update a preference
  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const categories: { id: PreferenceCategory; label: string; icon: string }[] = [
    { id: 'editor', label: 'Editor', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { id: 'grid', label: 'Grid & Snapping', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'performance', label: 'Performance', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'preview', label: 'Preview', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'code', label: 'Code Editor', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    { id: 'assets', label: 'Assets', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'collaboration', label: 'Collaboration', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ];

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'editor':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
              <select
                value={preferences.theme}
                onChange={(e) => updatePref('theme', e.target.value as 'dark' | 'light' | 'system')}
                className="w-full bg-subtle border border-white/10 rounded px-3 py-2 text-text-primary"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Font Size: {preferences.fontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="24"
                value={preferences.fontSize}
                onChange={(e) => updatePref('fontSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Auto Save</label>
                <p className="text-xs text-text-tertiary">Automatically save changes</p>
              </div>
              <button
                onClick={() => updatePref('autoSave', !preferences.autoSave)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.autoSave ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.autoSave ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {preferences.autoSave && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Auto Save Interval: {preferences.autoSaveInterval}s
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={preferences.autoSaveInterval}
                  onChange={(e) => updatePref('autoSaveInterval', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Grid Size: {preferences.gridSize}px
              </label>
              <input
                type="range"
                min="4"
                max="64"
                step="4"
                value={preferences.gridSize}
                onChange={(e) => updatePref('gridSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Snap to Grid</label>
                <p className="text-xs text-text-tertiary">Align entities to grid</p>
              </div>
              <button
                onClick={() => updatePref('snapToGrid', !preferences.snapToGrid)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.snapToGrid ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.snapToGrid ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Show Rulers</label>
                <p className="text-xs text-text-tertiary">Display rulers on canvas edges</p>
              </div>
              <button
                onClick={() => updatePref('showRulers', !preferences.showRulers)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.showRulers ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.showRulers ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max FPS: {preferences.maxFps}
              </label>
              <input
                type="range"
                min="30"
                max="144"
                step="1"
                value={preferences.maxFps}
                onChange={(e) => updatePref('maxFps', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">VSync</label>
                <p className="text-xs text-text-tertiary">Synchronize with display refresh</p>
              </div>
              <button
                onClick={() => updatePref('enableVsync', !preferences.enableVsync)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.enableVsync ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.enableVsync ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Hardware Acceleration</label>
                <p className="text-xs text-text-tertiary">Use GPU for rendering</p>
              </div>
              <button
                onClick={() => updatePref('hardwareAcceleration', !preferences.hardwareAcceleration)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.hardwareAcceleration ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.hardwareAcceleration ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Default Preview Size</label>
              <select
                value={preferences.defaultPreviewSize}
                onChange={(e) => updatePref('defaultPreviewSize', e.target.value as 'auto' | 'fixed')}
                className="w-full bg-subtle border border-white/10 rounded px-3 py-2 text-text-primary"
              >
                <option value="auto">Auto (fit to panel)</option>
                <option value="fixed">Fixed dimensions</option>
              </select>
            </div>
            {preferences.defaultPreviewSize === 'fixed' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Width: {preferences.previewWidth}px
                  </label>
                  <input
                    type="range"
                    min="320"
                    max="1920"
                    step="10"
                    value={preferences.previewWidth}
                    onChange={(e) => updatePref('previewWidth', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Height: {preferences.previewHeight}px
                  </label>
                  <input
                    type="range"
                    min="240"
                    max="1080"
                    step="10"
                    value={preferences.previewHeight}
                    onChange={(e) => updatePref('previewHeight', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'code':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Tab Size: {preferences.tabSize} spaces
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={preferences.tabSize}
                onChange={(e) => updatePref('tabSize', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Word Wrap</label>
                <p className="text-xs text-text-tertiary">Wrap long lines</p>
              </div>
              <button
                onClick={() => updatePref('wordWrap', !preferences.wordWrap)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.wordWrap ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.wordWrap ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Minimap</label>
                <p className="text-xs text-text-tertiary">Show code overview</p>
              </div>
              <button
                onClick={() => updatePref('minimap', !preferences.minimap)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.minimap ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.minimap ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Line Numbers</label>
                <p className="text-xs text-text-tertiary">Show line numbers</p>
              </div>
              <button
                onClick={() => updatePref('lineNumbers', !preferences.lineNumbers)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.lineNumbers ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.lineNumbers ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'assets':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Enable Asset Caching</label>
                <p className="text-xs text-text-tertiary">Cache loaded assets in memory</p>
              </div>
              <button
                onClick={() => updatePref('enableAssetCaching', !preferences.enableAssetCaching)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.enableAssetCaching ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.enableAssetCaching ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {preferences.enableAssetCaching && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Max Cache Size: {preferences.maxCacheSize} MB
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={preferences.maxCacheSize}
                  onChange={(e) => updatePref('maxCacheSize', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Preload Assets</label>
                <p className="text-xs text-text-tertiary">Load assets before game starts</p>
              </div>
              <button
                onClick={() => updatePref('preloadAssets', !preferences.preloadAssets)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.preloadAssets ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.preloadAssets ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'collaboration':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Share Presence</label>
                <p className="text-xs text-text-tertiary">Show your activity to collaborators</p>
              </div>
              <button
                onClick={() => updatePref('sharePresence', !preferences.sharePresence)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.sharePresence ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.sharePresence ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Show Cursors</label>
                <p className="text-xs text-text-tertiary">See collaborator cursors</p>
              </div>
              <button
                onClick={() => updatePref('showCursors', !preferences.showCursors)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.showCursors ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.showCursors ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Enable Notifications</label>
                <p className="text-xs text-text-tertiary">Show desktop notifications</p>
              </div>
              <button
                onClick={() => updatePref('enableNotifications', !preferences.enableNotifications)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.enableNotifications ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.enableNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-text-primary">Sound Effects</label>
                <p className="text-xs text-text-tertiary">Play sounds for actions</p>
              </div>
              <button
                onClick={() => updatePref('soundEffects', !preferences.soundEffects)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.soundEffects ? 'bg-blue-500' : 'bg-subtle'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  preferences.soundEffects ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-panel border border-subtle rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <h2 className="text-lg font-semibold text-text-primary">Preferences</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-text-tertiary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-subtle p-2 overflow-y-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} />
                </svg>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Settings */}
          <div className="flex-1 p-6 overflow-y-auto">
            {renderCategoryContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-subtle">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-subtle hover:bg-white/10 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              disabled={!hasChanges}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                hasChanges
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-subtle text-text-tertiary cursor-not-allowed'
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to use preferences
export function usePreferences(): Preferences {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    }

    // Listen for changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(e.newValue) });
        } catch (e) {
          console.error('Failed to parse preferences:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return preferences;
}

export default PreferencesPanel;
