import React, { createContext, useContext, useMemo } from 'react';
import { themes, type Theme, type ThemeName } from './tokens';

const ThemeContext = createContext<Theme>(themes.customer);

export const ThemeProvider = ({ name, children }: { name: ThemeName; children: React.ReactNode }) => {
  const value = useMemo(() => themes[name], [name]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => useContext(ThemeContext);
export const useThemeName = (): ThemeName => useContext(ThemeContext).name;
export const useColors = () => useContext(ThemeContext).colors;
