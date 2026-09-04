# PWA & Offline Strategy

## Core promise

The app must be **fully usable with zero network connection**, indefinitely, after the first successful load — including creating notebooks, adding transactions, viewing all history and balances. This is not a "nice to have" offline fallback; it is the primary operating mode, since the target user is a shopkeeper who may have unreliable connectivity and needs this to work exactly like a paper notebook always does.

## Why this is achievable simply

Per ARCHITECTURE.md, there is no server-side data dependency in v1 — all reads/writes are local IndexedDB via Dexie. This means "offline support" is mostly just "cache the app shell," not "build a sync-conflict-resolution system." That complexity is deliberately deferred to Phase 2 (see ROADMAP.md) when Supabase sync is added.

## Service worker (Serwist)

- **Precache:** the full app shell — JS/CSS bundles, fonts (Inter + Noto Sans Bengali, self-hosted, not loaded from Google Fonts CDN at runtime — critical for true offline use), icons, manifest.
- **Runtime caching:** none required for core functionality in v1, since there are no external API calls on the critical path. If the home banner (DESIGN-SYSTEM.md) links to external content, that's an outbound tap action, not a fetch the app depends on.
- **Update strategy:** standard "new service worker waits, prompts user to refresh" pattern — a small, dismissible "Update available" toast, never a forced reload (never interrupt someone mid-transaction-entry).

## Manifest

```json
{
  "name": "Khata — Simple Money Notebook",
  "short_name": "Khata",
  "description": "A simple offline money notebook for daily gave/took cash tracking.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FBF7EF",
  "theme_color": "#2F6B4F",
  "orientation": "portrait",
  "icons": [ /* 192, 512, and maskable variants, matching the accent-green mark */ ]
}
```

- `display: standalone` — no browser chrome once installed, reinforces "this is an app, not a website" for a non-technical user.
- `theme_color` matches `--color-accent` from DESIGN-SYSTEM.md so the OS status bar / task switcher tab matches the brand.
- Portrait-locked orientation — this is a one-handed phone tool, no meaningful landscape layout needed in v1.

## Install prompt

- No aggressive custom "Install our app!" banner/modal on first visit — respect the browser's native install affordance (Add to Home Screen), surfaced via a simple, low-pressure row in Settings/About ("Install Khata on your phone" with a short one-line explanation) for users who missed the native prompt.
- On iOS Safari (no native beforeinstallprompt event), the About/Help screen includes brief plain-language instructions for the Share → Add to Home Screen flow, since this is genuinely non-obvious and the target user will not know it.

## Data persistence safety

- Request `navigator.storage.persist()` on first launch (silently — no user-facing permission dialog needed for this specific API on most browsers) to reduce the risk of the browser evicting IndexedDB data under storage pressure. This directly protects the user's financial records.
- Combined with the manual JSON export/import in DATA-MODEL.md as a user-controlled belt-and-suspenders backup, independent of browser storage guarantees.

## Testing checklist for "done"

- Fresh install, then airplane mode: create a notebook, add 3 transactions, close and reopen the app — all data intact, balances correct.
- Force-refresh with an intentionally broken network mid-load — app shell still renders from cache, no blank white screen.
- Verify service worker update flow doesn't wipe an in-progress (unsaved) transaction sheet.
