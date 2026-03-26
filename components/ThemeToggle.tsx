"use client";

import { useTheme } from "@/app/providers";
import { Sun, Moon, Monitor } from "lucide-react";
import * as React from "react";

interface ThemeToggleProps { className?: string; showLabel?: boolean }

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <button className={`p-2 rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`} aria-label="Loading theme..." disabled />;

  const safeTheme = theme || 'system';
  const cycleOrder = { light: "dark", dark: "system", system: "light" } as const;
  const nextTheme = cycleOrder[safeTheme as keyof typeof cycleOrder];
  const Icon = safeTheme === "light" ? Sun : safeTheme === "dark" ? Moon : Monitor;

  return (
    <button onClick={() => setTheme(nextTheme)}
      className={`p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all active:scale-95 ${className}`}
      aria-label={`Change theme to ${nextTheme}`} title={`Current: ${safeTheme}`}>
      <Icon className="w-5 h-5" />
      {showLabel && <span className="ml-2 text-sm">{safeTheme}</span>}
    </button>
  );
}

export function ThemeToggleWithLabel() {
  return <div className="flex items-center gap-3"><ThemeToggle showLabel className="w-full" /></div>;
}
