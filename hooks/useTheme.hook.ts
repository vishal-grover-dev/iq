import { useContext } from "react";
import { ThemeContext } from "@/store/providers/theme.provider";
import { ThemeContextValue } from "@/types/app.types";

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
