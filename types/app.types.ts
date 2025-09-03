export enum ETheme {
  LIGHT = "light",
  DARK = "dark",
}

export type TResolvedTheme = ETheme.LIGHT | ETheme.DARK;

export interface IThemeContextValue {
  theme: ETheme;
  resolvedTheme: TResolvedTheme;
  setTheme: (theme: ETheme) => void;
  toggleTheme: () => void;
}
