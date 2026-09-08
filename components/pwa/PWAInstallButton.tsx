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

  // SSR/hydration-safe: server-e kichhu render hoy na, aar standalone
  // mode-e (already installed) cholle button lukiye thake.
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
      // iOS Safari ba beforeinstallprompt-support-chhara browser-er jonno guide
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

  // Header — compact pill button
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
            <Download size={14} className="animate-bounce transition-transform group-hover:scale-110" />
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-paper-card border border-rule p-6 shadow-xl z-10 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center">
                  <Smartphone size={20} />
                </div>
                <h3 className="text-base font-bold text-ink">{t("install.installGuideTitle")}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg text-ink-dim hover:text-ink transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-ink-dim leading-relaxed">{t("install.installAppDesc")}</p>

            {isIOS ? (
              <div className="space-y-3 p-3.5 rounded-2xl bg-paper border border-rule text-xs text-ink">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Share size={14} />
                  </div>
                  <div>{t("install.installGuideIOSStep1")}</div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Plus size={14} />
                  </div>
                  <div>{t("install.installGuideIOSStep2")}</div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-paper border border-rule text-xs text-ink space-y-2">
                <p>{t("install.installGuideAndroid")}</p>
                <p className="text-[11px] text-ink-dim">{t("install.installGuideAndroidTip")}</p>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-accent text-paper text-xs font-bold hover:opacity-90 transition-all"
            >
              OK
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
