"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures shouldn't break the app — it just runs
        // online-only until the next successful attempt.
      });
    }
    if ("storage" in navigator && "persist" in navigator.storage) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);
  return null;
}
