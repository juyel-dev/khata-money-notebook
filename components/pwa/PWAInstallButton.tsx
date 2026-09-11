"use client";

import React, { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Plus, X, Check, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/lib/useInstallPrompt";
import { useI18n } from "@/lib/i18n";

interface PWAInstallButtonProps {
  variant?: "header" | "drawer";
  className?: string;
}

const emptySubscribe = () => () => {};

export function PWAInstallButton({ variant = "header", className = "" }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const { t } = useI18n();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  if (!isMounted || isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (canInstall) {
      const outcome = await install();
      if (outcome) {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 3000);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === "drawer") {
    return (
      <>
        <button
          id="pwa-install-drawer-btn"
          type="button"
          onClick={handleClick}
          className={`w-full py-2.5 px-3 rounded-xl bg-accent text-paper text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer ${className}`}
        >
          <Download size={16} className="shrink-0" />
          <span>{t("install.installApp")}</span>
        </button>

        <InstallGuideModal isOpen={showModal} isIOS={isIOS} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        id="pwa-install-header-btn"
        type="button"
        onClick={handleClick}
        className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-accent hover:opacity-90 text-paper text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0 ${className}`}
        title={t("install.installAppDesc")}
      >
        {justInstalled ? (
          <>
            <Check size={14} />
            <span className="text-[11px] font-bold">{t("install.appInstalled")}</span>
          </>
        ) : (
          <>
            <Download size={14} className="transition-transform group-hover:scale-105" />
            <span className="text-[11px] font-bold hidden sm:inline">{t("install.installApp")}</span>
            <span className="text-[11px] font-bold sm:hidden">{t("install.installAppShort")}</span>
          </>
        )}
      </button>

      <InstallGuideModal isOpen={showModal} isIOS={isIOS} onClose={() => setShowModal(false)} />
    </>
  );
}

function InstallGuideModal({
  isOpen,
  isIOS,
  onClose,
}: {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm space-y-4 rounded-t-3xl border border-rule bg-paper-card p-6 shadow-xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-base font-bold text-ink">{t("install.installGuideTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-ink-dim transition-colors hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-ink-dim">{t("install.installAppDesc")}</p>

            {isIOS ? (
              <div className="space-y-3 rounded-2xl border border-rule bg-paper p-3.5 text-xs text-ink">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Share size={14} />
                  </div>
                  <div>{t("install.installGuideIOSStep1")}</div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Plus size={14} />
                  </div>
                  <div>{t("install.installGuideIOSStep2")}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-rule bg-paper p-3.5 text-xs text-ink">
                <p>{t("install.installGuideAndroid")}</p>
                <p className="text-[11px] text-ink-dim">{t("install.installGuideAndroidTip")}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-paper transition-opacity hover:opacity-90"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
