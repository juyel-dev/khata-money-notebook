"use client";

import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";

// Backward-compatible wrapper — existing call sites keep working.
// Home header-e variant="header" (compact pill), hamburger drawer-e
// default variant="drawer" (full-width) use kore.
export function InstallAppButton({
  className = "",
  variant = "drawer",
}: {
  className?: string;
  variant?: "header" | "drawer";
}) {
  return <PWAInstallButton variant={variant} className={className} />;
}
