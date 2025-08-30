"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Theme, ResolvedTheme, ThemeContextValue } from "@/types/app.types";

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyThemeToDocument(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === Theme.DARK) {
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(Theme.DARK);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(Theme.DARK);

  // Load stored theme on mount
  useEffect(() => {
    try {
      const stored = (localStorage.getItem("theme") as Theme | null) ?? Theme.DARK;
      setThemeState(stored);
      setResolvedTheme(stored as ResolvedTheme);
      applyThemeToDocument(stored as ResolvedTheme);
    } catch {}
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setResolvedTheme(next as ResolvedTheme);
    if (typeof document !== "undefined") applyThemeToDocument(next as ResolvedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK);
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
