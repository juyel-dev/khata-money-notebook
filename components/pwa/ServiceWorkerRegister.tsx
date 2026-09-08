"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Dev-e SW register kori na — nahole stale chunk serve kore
    // Turbopack HMR/edits test korte gele purono code atke thake.
    if (process.env.NODE_ENV !== "production") return;
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
