"use client";

import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme.hook";
import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/utils/tailwind.utils";
import { useEffect, useState } from "react";
import { Theme } from "@/types/app.types";

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
        <Switch checked={false} disabled aria-label='Toggle dark mode' />
        <MoonIcon size={20} className={cn("dark:text-gray-200 text-black transition-opacity")} aria-hidden />
      </div>
    );
  }

  const isDark = resolvedTheme === Theme.DARK;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <SunIcon size={20} className={cn("text-primary transition-opacity")} aria-hidden />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? Theme.DARK : Theme.LIGHT)}
        aria-label='Toggle dark mode'
      />
      <MoonIcon size={20} className={cn("dark:text-gray-200 text-black transition-opacity")} aria-hidden />
    </div>
  );
}
