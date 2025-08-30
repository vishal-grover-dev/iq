export enum Theme {
  LIGHT = "light",
  DARK = "dark",
}

export type ResolvedTheme = Theme.LIGHT | Theme.DARK;

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
