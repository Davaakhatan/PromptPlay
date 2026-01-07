/**
 * useTheme Hook
 * React hook for theme management
 */

import { useState, useEffect } from 'react';
import { themeService, Theme, ThemeMode } from '../services/ThemeService';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(themeService.getTheme());
  const [themeMode, setThemeMode] = useState<ThemeMode>(themeService.getThemeMode());

  useEffect(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
      setThemeMode(themeService.getThemeMode());
    });
    return unsubscribe;
  }, []);

  return {
    theme,
    themeMode,
    setTheme: (t: Theme) => themeService.setTheme(t),
    setThemeMode: (m: ThemeMode) => themeService.setThemeMode(m),
    presetThemes: themeService.getPresetThemes(),
    customThemes: themeService.getCustomThemes(),
    isDarkMode: theme.mode === 'dark',
  };
}

export default useTheme;
