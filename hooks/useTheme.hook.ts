import { useContext } from "react";
import { ThemeContext } from "@/store/providers/theme.provider";
import { IThemeContextValue } from "@/types/app.types";

export function useTheme(): IThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
