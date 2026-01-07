/**
 * Theme Selector Component
 * UI for selecting and previewing themes
 */

import { useState, useEffect } from 'react';
import { themeService, Theme, ThemeMode } from '../services/ThemeService';

interface ThemeSelectorProps {
  onClose?: () => void;
}

export function ThemeSelector({ onClose }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themeService.getTheme());
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeService.getThemeMode());
  const [presetThemes] = useState(themeService.getPresetThemes());
  const [customThemes] = useState(themeService.getCustomThemes());

  useEffect(() => {
    const unsubscribe = themeService.subscribe((theme) => {
      setCurrentTheme(theme);
    });
    return unsubscribe;
  }, []);

  const handleThemeSelect = (theme: Theme) => {
    themeService.setTheme(theme);
    setCurrentTheme(theme);
  };

  const handleModeChange = (mode: ThemeMode) => {
    themeService.setThemeMode(mode);
    setThemeMode(mode);
  };

  const renderThemeCard = (theme: Theme, isActive: boolean) => (
    <button
      key={theme.name}
      onClick={() => handleThemeSelect(theme)}
      className={`p-3 rounded-lg border-2 transition-all ${
        isActive
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-gray-600 hover:border-gray-500'
      }`}
    >
      {/* Theme preview */}
      <div
        className="w-full h-20 rounded mb-2 overflow-hidden"
        style={{ backgroundColor: theme.colors.bgPrimary }}
      >
        <div className="flex h-full">
          {/* Sidebar preview */}
          <div
            className="w-1/4 h-full p-1"
            style={{ backgroundColor: theme.colors.bgSecondary }}
          >
            <div
              className="w-full h-2 rounded mb-1"
              style={{ backgroundColor: theme.colors.bgTertiary }}
            />
            <div
              className="w-3/4 h-2 rounded mb-1"
              style={{ backgroundColor: theme.colors.bgTertiary }}
            />
            <div
              className="w-1/2 h-2 rounded"
              style={{ backgroundColor: theme.colors.bgTertiary }}
            />
          </div>
          {/* Main area preview */}
          <div className="flex-1 p-2">
            <div
              className="w-1/2 h-2 rounded mb-2"
              style={{ backgroundColor: theme.colors.textPrimary }}
            />
            <div
              className="w-3/4 h-1.5 rounded mb-1"
              style={{ backgroundColor: theme.colors.textSecondary }}
            />
            <div
              className="w-2/3 h-1.5 rounded mb-2"
              style={{ backgroundColor: theme.colors.textMuted }}
            />
            <div
              className="w-16 h-4 rounded"
              style={{ backgroundColor: theme.colors.accentPrimary }}
            />
          </div>
        </div>
      </div>
      <div className="text-left">
        <div className="font-medium text-white">{theme.name}</div>
        <div className="text-xs text-gray-400 capitalize">{theme.mode} mode</div>
      </div>
    </button>
  );

  return (
    <div className="p-4">
      {/* Theme Mode */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Theme Mode</h3>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-4 py-2 rounded capitalize ${
                themeMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Preset Themes */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Preset Themes</h3>
        <div className="grid grid-cols-2 gap-3">
          {presetThemes.map(theme =>
            renderThemeCard(theme, currentTheme.name === theme.name)
          )}
        </div>
      </div>

      {/* Custom Themes */}
      {customThemes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Custom Themes</h3>
          <div className="grid grid-cols-2 gap-3">
            {customThemes.map(theme =>
              renderThemeCard(theme, currentTheme.name === theme.name)
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-700">
        <button
          onClick={() => {
            // TODO: Open theme editor
            alert('Theme editor coming soon!');
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
        >
          Create Custom Theme
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}

export default ThemeSelector;
