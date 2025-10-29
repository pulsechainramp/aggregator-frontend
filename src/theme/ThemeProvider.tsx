import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeName, defaultTheme, theme } from "./index";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "pulsechain-theme";

const getStoredTheme = (): ThemeName | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "institutionalLight" ? stored : null;
};

const applyThemeTokens = (name: ThemeName) => {
  if (typeof document === "undefined") {
    return;
  }
  const tokens = theme[name];
  const root = document.documentElement;

  root.dataset.theme = name;
  root.style.setProperty("color-scheme", name === "dark" ? "dark" : "light");

  // Surfaces
  root.style.setProperty("--bg-page", tokens.colors.bg.page);
  root.style.setProperty("--bg-surface", tokens.colors.bg.surface);
  root.style.setProperty("--bg-raised", tokens.colors.bg.raised);

  // Text
  root.style.setProperty("--text", tokens.colors.text.default);
  root.style.setProperty("--text-muted", tokens.colors.text.muted);
  root.style.setProperty("--text-subtle", tokens.colors.text.subtle);
  root.style.setProperty("--text-inverse", tokens.colors.text.inverse);

  // Brand / Actions
  root.style.setProperty("--primary", tokens.colors.primary.default);
  root.style.setProperty("--primary-600", tokens.colors.primary["600"]);
  root.style.setProperty("--primary-050", tokens.colors.primary["050"]);

  root.style.setProperty("--accent", tokens.colors.accent);
  root.style.setProperty("--success", tokens.colors.success);
  root.style.setProperty("--warning", tokens.colors.warning);
  root.style.setProperty("--danger", tokens.colors.danger);

  // UI
  root.style.setProperty("--border", tokens.colors.border.default);
  root.style.setProperty("--border-strong", tokens.colors.border.strong);
  root.style.setProperty("--focus", tokens.colors.focus);
  root.style.setProperty("--overlay", tokens.colors.overlay);

  // Shadows
  root.style.setProperty("--shadow-1", tokens.shadows["shadow-1"]);
  root.style.setProperty("--shadow-2", tokens.shadows["shadow-2"]);
  root.style.setProperty("--shadow-3", tokens.shadows["shadow-3"]);

  // Radius
  root.style.setProperty("--radius", tokens.radius.radius);
  root.style.setProperty("--radius-lg", tokens.radius["radius-lg"]);
  root.style.setProperty("--radius-xl", tokens.radius["radius-xl"]);
  root.style.setProperty("--radius-2xl", tokens.radius["radius-2xl"]);
  root.style.setProperty("--radius-full", tokens.radius["radius-full"]);
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [activeTheme, setActiveTheme] = useState<ThemeName>(() => {
    const stored = getStoredTheme();
    const initial = stored ?? defaultTheme;
    applyThemeTokens(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeTokens(activeTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    }
  }, [activeTheme]);

  const setThemeName = useCallback((name: ThemeName) => {
    setActiveTheme(name);
  }, []);

  const toggleTheme = useCallback(() => {
    setActiveTheme((current) => (current === "dark" ? "institutionalLight" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: activeTheme,
      setTheme: setThemeName,
      toggleTheme,
    }),
    [activeTheme, setThemeName, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
