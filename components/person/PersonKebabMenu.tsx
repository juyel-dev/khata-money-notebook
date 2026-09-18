import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreVertical } from "lucide-react";

export interface PersonKebabAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

// Reusable ⋮ button + dropdown for person-level actions (rename, share
// statement, delete). Used by both PersonDetailView's header and
// PersonRow's list card — every click inside stops propagation, since
// PersonRow's whole card is a next/link Link and a menu action must never
// also trigger the row's navigation.
export function PersonKebabMenu({ actions, ariaLabel }: { actions: PersonKebabAction[]; ariaLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all"
        aria-label={ariaLabel}
      >
        <MoreVertical size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 top-10 z-40 bg-paper-card border border-rule rounded-xl shadow-lg overflow-hidden w-48"
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                    action.onClick();
                  }}
                  className={`block w-full text-left px-4 py-3 text-sm hover:bg-accent-soft ${action.danger ? "text-danger" : "text-ink"}`}
                >
                  {action.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
