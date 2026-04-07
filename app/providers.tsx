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
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

interface ProvidersProps extends ThemeProviderProps {
  children: React.ReactNode;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[10000] mx-auto flex max-w-lg flex-col gap-2 px-4">
      {toasts.map((toast) => {
        const tone = toast.type === "success"
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
          : toast.type === "error"
          ? "border-red-500/40 bg-red-500/15 text-red-100"
          : "border-violet-500/40 bg-violet-500/15 text-violet-100";
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${tone}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

export function Providers({ children, ...props }: ProvidersProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const showToast = React.useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  return (
    <NextThemesProvider
      {...props}
      defaultTheme="system"
      forcedTheme={undefined}
      disableTransitionOnChange={true}
      storageKey="theme"
    >
      <ToastContext.Provider value={{ showToast }}>
        {children}
        <ToastViewport toasts={toasts} />
      </ToastContext.Provider>
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

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within Providers");
  return context;
}
