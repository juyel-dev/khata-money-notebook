"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptContextValue {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

const InstallPromptContext = createContext<InstallPromptContextValue>({
  canInstall: false,
  promptInstall: async () => {},
});

// The 'beforeinstallprompt' event fires once, early, and only ever reaches
// listeners that are already attached at that moment. Any consumer that
// mounts later (like a component inside a closed hamburger drawer) would
// miss it entirely if it registered its own listener on mount — so this is
// a single app-wide provider (mounted once, always) rather than a
// per-component hook, and everything else just reads from its context.
export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const value = { canInstall: !!deferredPrompt && !installed, promptInstall };

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>;
}

export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}
