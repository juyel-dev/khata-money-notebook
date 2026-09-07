"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "khata:theme";

// System dark-mode preference as a proper external store subscription
// (useSyncExternalStore) rather than effect-driven state — this is the
// React-recommended pattern for a synchronously-readable external source
// like matchMedia, and avoids the render-cascade issue that comes with
// setting state from inside an effect body.
function subscribeToSystemDark(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getSystemDarkSnapshot() {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}
function getSystemDarkServerSnapshot() {
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const systemDark = useSyncExternalStore(
    subscribeToSystemDark,
    getSystemDarkSnapshot,
    getSystemDarkServerSnapshot
  );

  // One-time read of the stored preference after mount — localStorage isn't
  // available during SSR. The blocking inline script in layout.tsx already
  // applied the correct class before first paint, so this only syncs React
  // state to match; it doesn't cause a visible flash.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(THEME_STORAGE_KEY) : null;
    const initial: ThemeMode =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initial);
  }, []);

  const isDark = theme === "dark" || (theme === "system" && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    if (typeof window !== "undefined") localStorage.setItem(THEME_STORAGE_KEY, t);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
