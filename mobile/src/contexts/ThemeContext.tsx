import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, type ThemeColors } from '../theme';

const THEME_KEY = 'stock_analyzer_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  themeMode: ThemeMode;
  cycleTheme: () => void;
  /** @deprecated Use cycleTheme instead */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: darkColors,
  themeMode: 'dark',
  cycleTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setThemeMode(val);
      }
    }).catch(() => {});
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeMode(prev => {
      const cycle: Record<ThemeMode, ThemeMode> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
      };
      const next = cycle[prev];
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const isDark = themeMode === 'system'
    ? systemScheme !== 'light'
    : themeMode === 'dark';

  const value = useMemo(() => ({
    isDark,
    colors: isDark ? darkColors : lightColors,
    themeMode,
    cycleTheme,
    toggleTheme: cycleTheme,
  }), [isDark, themeMode, cycleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
