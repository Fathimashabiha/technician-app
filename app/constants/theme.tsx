import React from 'react';
import { StyleSheet } from 'react-native';

// Dark Mode palette (Current)
export const DARK_COLORS = {
  background: '#0B0F1A', // Deep Midnight
  foreground: '#E5E7EB', // Primary Text
  card: '#121826',       // Dark Navy
  panel: '#1A2236',      // Soft Panel
  primary: '#00D1B2',    // Electric Teal
  primaryForeground: '#FFFFFF',
  secondary: '#7B61FF',  // Neon Purple
  secondaryForeground: '#FFFFFF',
  muted: '#2A3550',      // Border / Subtle Lines
  mutedForeground: '#9CA3AF', // Secondary Text
  accent: '#38BDF8',     // Sky Cyan
  accentForeground: '#FFFFFF',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#0EA5E9',
  border: '#2A3550',
  input: '#1A2236',
  ring: '#00D1B2',
  navy: '#0B0F1A',
};

// Premium Light Mode palette
export const LIGHT_COLORS = {
  background: '#F8FAFC', // Slate 50
  foreground: '#0F172A', // Slate 900
  card: '#FFFFFF',
  panel: '#F1F5F9',      // Slate 100
  primary: '#00D1B2',    // Keeping brand teal
  primaryForeground: '#FFFFFF',
  secondary: '#7B61FF',  // Keeping brand purple
  secondaryForeground: '#FFFFFF',
  muted: '#E2E8F0',      // Soft grey border
  mutedForeground: '#64748B', // Slate 500
  accent: '#0EA5E9',     // Sky Blue
  accentForeground: '#FFFFFF',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#16A34A',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  info: '#0284C7',
  border: '#E2E8F0',
  input: '#FFFFFF',
  ring: '#00D1B2',
  navy: '#0F172A',
};

export const COLORS = DARK_COLORS; // Fallback for static imports

export const DARK_GRADIENTS = {
  primary: ['#00D1B2', '#38BDF8'],   // Teal to Cyan
  secondary: ['#7B61FF', '#00D1B2'],  // Purple to Teal
  hero: ['#1A2236', '#0B0F1A'],       // soft panel to midnight
  glow: ['#00D1B2' + '50', 'transparent'],
};

export const LIGHT_GRADIENTS = {
  primary: ['#00D1B2', '#0EA5E9'],
  secondary: ['#7B61FF', '#00D1B2'],
  hero: ['#F1F5F9', '#FFFFFF'],
  glow: ['#00D1B2' + '20', 'transparent'],
};

export const GRADIENTS = DARK_GRADIENTS;

export const SHADOWS = {
  card: {
    shadowColor: '#00D1B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  glowTeal: {
    shadowColor: '#00D1B2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  glowPurple: {
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const SIZES = {
  radius: 12,
  radiusMd: 10,
  radiusSm: 8,
  radiusXl: 16,
  radius2Xl: 20,
};

import { createContext, useContext, useState, ReactNode } from 'react';

type ThemeContextType = {
  colors: typeof DARK_COLORS;
  gradients: typeof DARK_GRADIENTS;
  shadows: typeof SHADOWS;
  sizes: typeof SIZES;
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(!isDark);

  const themeValue = {
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    gradients: isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS,
    shadows: SHADOWS,
    sizes: SIZES,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to defaults if provider is missing
    return {
      colors: DARK_COLORS,
      gradients: DARK_GRADIENTS,
      shadows: SHADOWS,
      sizes: SIZES,
      isDark: true,
      toggleTheme: () => {},
    };
  }
  return context;
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: 16,
    ...SHADOWS.card,
  }
});
