"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export const ACCENT_COLORS = [
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
  "cyan",
  "orange",
  "pink",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

interface ProvidersProps extends ThemeProviderProps {
  children: React.ReactNode;
}

export function Providers({ children, ...props }: ProvidersProps) {
  return (
    <NextThemesProvider
      {...props}
      defaultTheme="system"
      forcedTheme={undefined}
      disableTransitionOnChange={true}
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}

const ACCENT_COLOR_STORAGE_KEY = "accent-color";

export function useAccentColor() {
  const [accentColor, setAccentColor] = React.useState<AccentColor>(() => {
    if (typeof window === "undefined") return "violet";
    const stored = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
    return (stored as AccentColor) || "violet";
  });

  const updateAccentColor = React.useCallback((color: AccentColor) => {
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color);
    setAccentColor(color);
  }, []);

  return { accentColor, setAccentColor: updateAccentColor };
}

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme();
  const { accentColor, setAccentColor } = useAccentColor();
  return { theme, setTheme, systemTheme, accentColor, setAccentColor };
}
