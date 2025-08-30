"use client";

import { Switch } from "@/components/ui/switch";
import { useThemeContext } from "@/store/providers/theme.provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/utils/tailwind.utils";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useThemeContext();
  const isDark = resolvedTheme === "dark";
  console.log("🚀 ~ ThemeToggle ~ resolvedTheme:", resolvedTheme);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Sun className={cn("h-4 w-4 text-primary transition-opacity")} aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label='Toggle dark mode'
      />
      <Moon className={cn("h-4 w-4 dark:text-gray-200 text-black transition-opacity")} aria-hidden />
    </div>
  );
}
