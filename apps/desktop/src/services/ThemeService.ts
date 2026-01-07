/**
 * Theme Service
 * Manages application themes (dark/light/custom)
 */

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgActive: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;

  // Accent colors
  accentPrimary: string;
  accentHover: string;
  accentActive: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Special
  codeBackground: string;
  scrollbar: string;
  scrollbarHover: string;
}

export interface Theme {
  name: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

const DARK_THEME: Theme = {
  name: 'Dark',
  mode: 'dark',
  colors: {
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
  },
};

const LIGHT_THEME: Theme = {
  name: 'Light',
  mode: 'light',
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f3f4f6',
    bgTertiary: '#e5e7eb',
    bgHover: '#e5e7eb',
    bgActive: '#d1d5db',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
    borderPrimary: '#e5e7eb',
    borderSecondary: '#d1d5db',
    accentPrimary: '#3b82f6',
    accentHover: '#2563eb',
    accentActive: '#1d4ed8',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    codeBackground: '#f8fafc',
    scrollbar: '#d1d5db',
    scrollbarHover: '#9ca3af',
  },
};

const MIDNIGHT_THEME: Theme = {
  name: 'Midnight Blue',
  mode: 'dark',
  colors: {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgHover: '#334155',
    bgActive: '#475569',
    textPrimary: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    borderPrimary: '#334155',
    borderSecondary: '#475569',
    accentPrimary: '#6366f1',
    accentHover: '#4f46e5',
    accentActive: '#4338ca',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    codeBackground: '#020617',
    scrollbar: '#475569',
    scrollbarHover: '#64748b',
  },
};

const FOREST_THEME: Theme = {
  name: 'Forest',
  mode: 'dark',
  colors: {
    bgPrimary: '#14201a',
    bgSecondary: '#1c2b24',
    bgTertiary: '#2d4338',
    bgHover: '#2d4338',
    bgActive: '#3d5a4a',
    textPrimary: '#e8f5e9',
    textSecondary: '#a5d6a7',
    textMuted: '#81c784',
    borderPrimary: '#2d4338',
    borderSecondary: '#3d5a4a',
    accentPrimary: '#4caf50',
    accentHover: '#43a047',
    accentActive: '#388e3c',
    success: '#66bb6a',
    warning: '#ffa726',
    error: '#ef5350',
    info: '#29b6f6',
    codeBackground: '#0a1510',
    scrollbar: '#3d5a4a',
    scrollbarHover: '#4d7a5a',
  },
};

const PRESET_THEMES: Theme[] = [DARK_THEME, LIGHT_THEME, MIDNIGHT_THEME, FOREST_THEME];

class ThemeService {
  private currentTheme: Theme = DARK_THEME;
  private themeMode: ThemeMode = 'dark';
  private listeners: Set<(theme: Theme) => void> = new Set();
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    this.loadSavedTheme();
    this.setupSystemThemeListener();
  }

  private loadSavedTheme(): void {
    const savedMode = localStorage.getItem('promptplay_theme_mode') as ThemeMode | null;
    const savedThemeName = localStorage.getItem('promptplay_theme_name');

    if (savedMode) {
      this.themeMode = savedMode;
    }

    if (savedThemeName) {
      const theme = PRESET_THEMES.find(t => t.name === savedThemeName);
      if (theme) {
        this.currentTheme = theme;
      }
    }

    // Try to load custom themes
    const customThemes = localStorage.getItem('promptplay_custom_themes');
    if (customThemes) {
      try {
        const themes = JSON.parse(customThemes) as Theme[];
        const customTheme = themes.find(t => t.name === savedThemeName);
        if (customTheme) {
          this.currentTheme = customTheme;
        }
      } catch (e) {
        console.error('Failed to load custom themes:', e);
      }
    }

    this.applyTheme(this.resolveTheme());
  }

  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', () => {
        if (this.themeMode === 'system') {
          this.applyTheme(this.resolveTheme());
        }
      });
    }
  }

  private resolveTheme(): Theme {
    if (this.themeMode === 'system') {
      const isDark = this.mediaQuery?.matches ?? true;
      return isDark ? DARK_THEME : LIGHT_THEME;
    }
    return this.currentTheme;
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    const colors = theme.colors;

    // Apply CSS variables
    root.style.setProperty('--bg-primary', colors.bgPrimary);
    root.style.setProperty('--bg-secondary', colors.bgSecondary);
    root.style.setProperty('--bg-tertiary', colors.bgTertiary);
    root.style.setProperty('--bg-hover', colors.bgHover);
    root.style.setProperty('--bg-active', colors.bgActive);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--text-muted', colors.textMuted);
    root.style.setProperty('--border-primary', colors.borderPrimary);
    root.style.setProperty('--border-secondary', colors.borderSecondary);
    root.style.setProperty('--accent-primary', colors.accentPrimary);
    root.style.setProperty('--accent-hover', colors.accentHover);
    root.style.setProperty('--accent-active', colors.accentActive);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--error', colors.error);
    root.style.setProperty('--info', colors.info);
    root.style.setProperty('--code-background', colors.codeBackground);
    root.style.setProperty('--scrollbar', colors.scrollbar);
    root.style.setProperty('--scrollbar-hover', colors.scrollbarHover);

    // Set color scheme for browser UI
    root.style.colorScheme = theme.mode;

    // Notify listeners
    this.listeners.forEach(listener => listener(theme));
  }

  getTheme(): Theme {
    return this.resolveTheme();
  }

  getThemeMode(): ThemeMode {
    return this.themeMode;
  }

  getPresetThemes(): Theme[] {
    return [...PRESET_THEMES];
  }

  getCustomThemes(): Theme[] {
    const customThemes = localStorage.getItem('promptplay_custom_themes');
    if (customThemes) {
      try {
        return JSON.parse(customThemes) as Theme[];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.themeMode = theme.mode;
    localStorage.setItem('promptplay_theme_mode', this.themeMode);
    localStorage.setItem('promptplay_theme_name', theme.name);
    this.applyTheme(theme);
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode = mode;
    localStorage.setItem('promptplay_theme_mode', mode);
    this.applyTheme(this.resolveTheme());
  }

  saveCustomTheme(theme: Theme): void {
    const customThemes = this.getCustomThemes();
    const existingIndex = customThemes.findIndex(t => t.name === theme.name);

    if (existingIndex >= 0) {
      customThemes[existingIndex] = theme;
    } else {
      customThemes.push(theme);
    }

    localStorage.setItem('promptplay_custom_themes', JSON.stringify(customThemes));
  }

  deleteCustomTheme(themeName: string): void {
    const customThemes = this.getCustomThemes().filter(t => t.name !== themeName);
    localStorage.setItem('promptplay_custom_themes', JSON.stringify(customThemes));
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const themeService = new ThemeService();
export default themeService;
