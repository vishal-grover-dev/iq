"use client";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme.hook";
import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/utils/tailwind.utils";
import { useEffect, useState } from "react";
import { ETheme as Theme } from "@/types/app.types";
import { THEME_CONFIG } from "@/constants/ui.constants";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <SunIcon size={20} className={cn("text-primary transition-opacity")} aria-hidden />
        <Switch checked={false} disabled aria-label={THEME_CONFIG.LABELS.SWITCH_TO_DARK} />
        <MoonIcon size={20} className={cn("dark:text-gray-200 text-black transition-opacity")} aria-hidden />
      </div>
    );
  }

  const isDark = resolvedTheme === Theme.DARK;
  const ariaLabel = isDark ? THEME_CONFIG.LABELS.SWITCH_TO_LIGHT : THEME_CONFIG.LABELS.SWITCH_TO_DARK;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <SunIcon size={20} className={cn("text-primary transition-opacity")} aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? Theme.DARK : Theme.LIGHT)}
        aria-label={ariaLabel}
      />
      <span className='sr-only'>{isDark ? THEME_CONFIG.LABELS.LIGHT_MODE : THEME_CONFIG.LABELS.DARK_MODE}</span>
      <MoonIcon size={20} className={cn("dark:text-gray-200 text-black transition-opacity")} aria-hidden />
    </div>
  );
}
