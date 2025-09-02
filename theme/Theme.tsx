import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  bg: string;
  header: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  icon: string;
  divider: string;
  inputBg: string;
  inputText: string;
  accent: string;
};

const palettes: Record<ThemeMode, ThemeColors> = {
  dark: {
    bg: '#1c1c1e',
    header: '#2c2c2e',
    card: '#2c2c2e',
    border: 'rgba(255,255,255,0.06)',
    text: '#fff',
    muted: '#bdbdbd',
    icon: '#fff',
    divider: 'rgba(255,255,255,0.06)',
    inputBg: 'rgba(255,255,255,0.08)',
    inputText: '#fff',
    accent: '#007AFF',
  },
  light: {
    bg: '#ffffff',
    header: '#f4f4f4',
    card: '#ffffff',
    border: '#e5e5ea',
    text: '#111',
    muted: '#666',
    icon: '#111',
    divider: '#e5e5ea',
    inputBg: '#f2f2f2',
    inputText: '#111',
    accent: '#007AFF',
  },
};

interface ThemeContextValue {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  initialized: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('theme');
        const mode: ThemeMode = saved === 'light' ? 'light' : 'dark';
        setThemeState(mode);
        try { await SystemUI.setBackgroundColorAsync(mode === 'dark' ? palettes.dark.bg : palettes.light.bg); } catch {}
      } catch {}
      setInitialized(true);
    })();
  }, []);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    try { await AsyncStorage.setItem('theme', mode); } catch {}
    try { await SystemUI.setBackgroundColorAsync(mode === 'dark' ? palettes.dark.bg : palettes.light.bg); } catch {}
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const colors = useMemo(() => palettes[theme], [theme]);

  const value = useMemo(() => ({ theme, colors, setTheme, toggleTheme, initialized }), [theme, colors, initialized]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
