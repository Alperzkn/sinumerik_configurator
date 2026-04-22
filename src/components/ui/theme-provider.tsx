"use client";

import { create } from "zustand";
import { useEffect } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  /** Resolved theme actually applied to the DOM ("light" or "dark") */
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "sinumerik-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function resolve(theme: Theme): "light" | "dark" {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

function applyToDom(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.style.colorScheme = resolved;
}

export const useTheme = create<ThemeStore>((set) => ({
  // SSR: render in dark to match the default class on <html>
  theme: "dark",
  resolved: "dark",
  setTheme: (t) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
    }
    const resolved = resolve(t);
    applyToDom(resolved);
    set({ theme: t, resolved });
  },
}));

/**
 * Mount once at the app root (inside <body>). Hydrates the theme from
 * localStorage / system preference on first client render and listens for
 * OS-level changes when the user has set theme="system".
 */
export function ThemeProvider() {
  const setTheme = useTheme((s) => s.setTheme);

  useEffect(() => {
    const stored = readStoredTheme();
    setTheme(stored);

    if (stored !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [setTheme]);

  return null;
}
