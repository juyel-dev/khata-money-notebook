"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import en from "./en.json";
import bn from "./bn.json";

export type Locale = "en" | "bn";

const messages: Record<Locale, typeof en> = { en, bn };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const LOCALE_STORAGE_KEY = "khata:locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    // This one-time read of localStorage/navigator.language can only happen after
    // mount (these APIs don't exist during SSR), so syncing it into state here —
    // rather than as a lazy useState initializer — is what avoids a server/client
    // hydration mismatch. That's exactly what this effect is for.
    if (stored === "en" || stored === "bn") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    } else if (typeof navigator !== "undefined" && navigator.language?.startsWith("bn")) {
      setLocaleState("bn");
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(LOCALE_STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const raw = getByPath(messages[locale], path);
      let str = typeof raw === "string" ? raw : path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale]
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
