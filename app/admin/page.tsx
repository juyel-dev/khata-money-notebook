"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, LogIn, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { getFirebaseServices } from "@/lib/firebase/client";
import { createBanner, deleteBanner, listAllBanners, saveBanner } from "@/lib/firebase/banners";
import type { Banner } from "@/lib/banners";
import { showToast } from "@/components/shared/Toast";

// Internal tool — only ever used by the app's single admin, so this stays
// plain English rather than pulling in the app's i18n system.
export default function AdminPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const services = getFirebaseServices();
    if (!services) return;
    try {
      const all = await listAllBanners(services.firestore);
      setBanners(all);
      setAuthorized(true);
    } catch {
      // firestore.rules rejects the whole list query for a non-admin (some
      // banners may be inactive, which only the admin can read) — this is
      // the actual authorization check, not just a UI gate.
      setBanners([]);
      setAuthorized(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the admin's banner list once signed in.
    if (user) void refresh();
  }, [user]);

  async function handleSignIn() {
    setBusy(true);
    try {
      await signIn();
    } catch {
      showToast("Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    const services = getFirebaseServices();
    if (!services) return;
    setBusy(true);
    try {
      await createBanner(services.firestore, {
        imageUrl: "",
        destinationUrl: "",
        order: (banners?.length ?? 0) * 10,
        active: false,
      });
      await refresh();
    } catch {
      showToast("Couldn't create banner — check you're signed in as the admin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(banner: Banner) {
    const services = getFirebaseServices();
    if (!services) return;
    setBusy(true);
    try {
      await saveBanner(services.firestore, banner);
      await refresh();
      showToast("Saved.");
    } catch {
      showToast("Couldn't save — check you're signed in as the admin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    const services = getFirebaseServices();
    if (!services) return;
    if (!confirm("Delete this banner?")) return;
    setBusy(true);
    try {
      await deleteBanner(services.firestore, id);
      await refresh();
    } catch {
      showToast("Couldn't delete — check you're signed in as the admin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => router.push("/")}
            className="p-1 -ml-1 text-ink rounded-full active:bg-accent-soft active:scale-90 transition-all"
          >
            <ChevronLeft size={22} />
          </button>
          <span className="text-lg font-bold text-ink">Admin — Banners</span>
        </div>

        {loading ? null : !user ? (
          <button
            onClick={() => void handleSignIn()}
            disabled={busy}
            className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 font-semibold text-paper disabled:opacity-60"
          >
            <LogIn size={16} /> Sign in with Google
          </button>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-rule bg-paper-card px-3 py-2 text-xs text-ink-dim">
              Signed in as {user.email}
              <br />
              UID: <span className="font-mono">{user.uid}</span>
            </div>

            {authorized === false && (
              <div className="mb-4 rounded-xl border border-owe-you bg-owe-you-soft px-3 py-2 text-xs text-owe-you">
                This account isn&apos;t authorized to manage banners. Copy the UID above and
                set it as the admin UID in firestore.rules.
              </div>
            )}

            <button
              onClick={() => void handleAdd()}
              disabled={busy}
              className="mb-4 flex items-center gap-2 rounded-full border border-rule px-3 py-2 text-sm font-semibold text-ink disabled:opacity-60"
            >
              <Plus size={16} /> Add banner
            </button>

            <div className="space-y-3">
              {banners?.map((banner) => (
                <BannerEditor
                  key={banner.id}
                  banner={banner}
                  busy={busy}
                  onSave={handleSave}
                  onDelete={() => void handleDelete(banner.id)}
                />
              ))}
              {banners?.length === 0 && authorized && (
                <p className="text-sm text-ink-dim">No banners yet — add one above.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BannerEditor({
  banner,
  busy,
  onSave,
  onDelete,
}: {
  banner: Banner;
  busy: boolean;
  onSave: (banner: Banner) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(banner);
  const dirty = JSON.stringify(draft) !== JSON.stringify(banner);

  return (
    <div className="rounded-2xl border border-rule bg-paper-card p-4">
      {draft.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URL, see HeroBannerCarousel
        <img
          src={draft.imageUrl}
          alt=""
          className="mb-3 w-full rounded-xl bg-rule object-cover"
          style={{ aspectRatio: "3 / 1" }}
        />
      )}
      <label className="block text-xs font-semibold text-ink-dim mb-1">Image URL</label>
      <input
        value={draft.imageUrl}
        onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
        placeholder="https://... (Drive, imgbb, any direct image URL)"
        className="mb-3 w-full rounded-lg border border-rule bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      <label className="block text-xs font-semibold text-ink-dim mb-1">Destination link (optional)</label>
      <input
        value={draft.destinationUrl ?? ""}
        onChange={(e) => setDraft({ ...draft, destinationUrl: e.target.value })}
        placeholder="https://..."
        className="mb-3 w-full rounded-lg border border-rule bg-paper px-2.5 py-2 text-sm text-ink outline-none focus:border-accent"
      />
      <div className="flex items-center gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
          Active
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink">
          Order
          <input
            type="number"
            value={draft.order}
            onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
            className="w-16 rounded-lg border border-rule bg-paper px-2 py-1 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(draft)}
          disabled={busy || !dirty || !draft.imageUrl}
          className="rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-paper disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-danger disabled:opacity-40"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );
}
