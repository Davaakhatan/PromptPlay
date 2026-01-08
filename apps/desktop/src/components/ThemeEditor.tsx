/**
 * Theme Editor Component
 * Create and edit custom themes with live preview
 */

import { useState, useCallback } from 'react';
import { themeService, Theme, ThemeColors } from '../services/ThemeService';

interface ThemeEditorProps {
  initialTheme?: Theme;
  onSave?: (theme: Theme) => void;
  onCancel?: () => void;
}

type ColorCategory = 'background' | 'text' | 'border' | 'accent' | 'status' | 'special';

interface ColorField {
  key: keyof ThemeColors;
  label: string;
  category: ColorCategory;
}

const COLOR_FIELDS: ColorField[] = [
  // Background
  { key: 'bgPrimary', label: 'Primary Background', category: 'background' },
  { key: 'bgSecondary', label: 'Secondary Background', category: 'background' },
  { key: 'bgTertiary', label: 'Tertiary Background', category: 'background' },
  { key: 'bgHover', label: 'Hover Background', category: 'background' },
  { key: 'bgActive', label: 'Active Background', category: 'background' },
  // Text
  { key: 'textPrimary', label: 'Primary Text', category: 'text' },
  { key: 'textSecondary', label: 'Secondary Text', category: 'text' },
  { key: 'textMuted', label: 'Muted Text', category: 'text' },
  // Border
  { key: 'borderPrimary', label: 'Primary Border', category: 'border' },
  { key: 'borderSecondary', label: 'Secondary Border', category: 'border' },
  // Accent
  { key: 'accentPrimary', label: 'Primary Accent', category: 'accent' },
  { key: 'accentHover', label: 'Accent Hover', category: 'accent' },
  { key: 'accentActive', label: 'Accent Active', category: 'accent' },
  // Status
  { key: 'success', label: 'Success', category: 'status' },
  { key: 'warning', label: 'Warning', category: 'status' },
  { key: 'error', label: 'Error', category: 'status' },
  { key: 'info', label: 'Info', category: 'status' },
  // Special
  { key: 'codeBackground', label: 'Code Background', category: 'special' },
  { key: 'scrollbar', label: 'Scrollbar', category: 'special' },
  { key: 'scrollbarHover', label: 'Scrollbar Hover', category: 'special' },
];

const CATEGORY_LABELS: Record<ColorCategory, string> = {
  background: 'Background Colors',
  text: 'Text Colors',
  border: 'Border Colors',
  accent: 'Accent Colors',
  status: 'Status Colors',
  special: 'Special Colors',
};

const DEFAULT_DARK_COLORS: ThemeColors = {
  bgPrimary: '#111827',
  bgSecondary: '#1f2937',
  bgTertiary: '#374151',
  bgHover: '#374151',
  bgActive: '#4b5563',
  textPrimary: '#f9fafb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  borderPrimary: '#374151',
  borderSecondary: '#4b5563',
  accentPrimary: '#3b82f6',
  accentHover: '#2563eb',
  accentActive: '#1d4ed8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  codeBackground: '#0d1117',
  scrollbar: '#4b5563',
  scrollbarHover: '#6b7280',
};

export function ThemeEditor({ initialTheme, onSave, onCancel }: ThemeEditorProps) {
  const [themeName, setThemeName] = useState(initialTheme?.name || 'My Custom Theme');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(initialTheme?.mode || 'dark');
  const [colors, setColors] = useState<ThemeColors>(initialTheme?.colors || DEFAULT_DARK_COLORS);
  const [activeCategory, setActiveCategory] = useState<ColorCategory>('background');
  const [themeNameTouched, setThemeNameTouched] = useState(false);

  // Validation
  const themeNameError = themeNameTouched && !themeName.trim() ? 'Theme name is required' : null;

  const handleColorChange = useCallback((key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!themeName.trim()) {
      setThemeNameTouched(true);
      return;
    }

    const theme: Theme = {
      name: themeName.trim(),
      mode: themeMode,
      colors,
    };

    themeService.saveCustomTheme(theme);
    themeService.setTheme(theme);
    onSave?.(theme);
  }, [themeName, themeMode, colors, onSave]);

  const handlePreview = useCallback(() => {
    const theme: Theme = {
      name: 'Preview',
      mode: themeMode,
      colors,
    };
    themeService.setTheme(theme);
  }, [themeMode, colors]);

  const categories = Object.keys(CATEGORY_LABELS) as ColorCategory[];
  const categoryFields = COLOR_FIELDS.filter(f => f.category === activeCategory);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Theme Editor</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
          >
            Preview
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
          >
            Save Theme
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Categories */}
        <div className="w-48 border-r border-gray-700 p-3">
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">
              Theme Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              onBlur={() => setThemeNameTouched(true)}
              className={`w-full px-2 py-1.5 bg-gray-800 border rounded text-sm text-white transition-colors ${
                themeNameError ? 'border-red-500' : 'border-gray-600 focus:border-blue-500'
              }`}
              placeholder="My Theme"
              aria-required="true"
              aria-invalid={!!themeNameError}
            />
            {themeNameError && (
              <p className="mt-1 text-xs text-red-400">{themeNameError}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Mode</label>
            <select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value as 'dark' | 'light')}
              className="w-full px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-sm text-white"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="space-y-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm capitalize ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main - Color Pickers */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">
            {CATEGORY_LABELS[activeCategory]}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {categoryFields.map(field => (
              <div key={field.key} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded border border-gray-600 cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: colors[field.key] }}
                >
                  <input
                    type="color"
                    value={colors[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">{field.label}</div>
                  <input
                    type="text"
                    value={colors[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="w-full px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-xs text-gray-300 font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="w-64 border-l border-gray-700 p-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Live Preview</h3>

          <div
            className="rounded-lg overflow-hidden border"
            style={{
              backgroundColor: colors.bgPrimary,
              borderColor: colors.borderPrimary,
            }}
          >
            {/* Header preview */}
            <div
              className="p-2 border-b"
              style={{
                backgroundColor: colors.bgSecondary,
                borderColor: colors.borderPrimary,
              }}
            >
              <div
                className="text-sm font-medium"
                style={{ color: colors.textPrimary }}
              >
                Header
              </div>
            </div>

            {/* Sidebar preview */}
            <div className="flex h-32">
              <div
                className="w-1/3 p-2 border-r"
                style={{
                  backgroundColor: colors.bgSecondary,
                  borderColor: colors.borderPrimary,
                }}
              >
                <div
                  className="h-2 w-full rounded mb-2"
                  style={{ backgroundColor: colors.bgTertiary }}
                />
                <div
                  className="h-2 w-3/4 rounded mb-2"
                  style={{ backgroundColor: colors.bgTertiary }}
                />
                <div
                  className="h-2 w-1/2 rounded"
                  style={{ backgroundColor: colors.bgActive }}
                />
              </div>

              {/* Content preview */}
              <div className="flex-1 p-2">
                <div
                  className="text-xs mb-1"
                  style={{ color: colors.textPrimary }}
                >
                  Primary Text
                </div>
                <div
                  className="text-xs mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Secondary Text
                </div>
                <div
                  className="text-xs mb-2"
                  style={{ color: colors.textMuted }}
                >
                  Muted Text
                </div>
                <button
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{ backgroundColor: colors.accentPrimary }}
                >
                  Button
                </button>
              </div>
            </div>

            {/* Status colors */}
            <div
              className="flex gap-1 p-2 border-t"
              style={{ borderColor: colors.borderPrimary }}
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.success }}
                title="Success"
              />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.warning }}
                title="Warning"
              />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.error }}
                title="Error"
              />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.info }}
                title="Info"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThemeEditor;
