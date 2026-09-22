# Admin Panel

`/admin` — a normal route inside this same Next.js app (not a separate
deploy, not a separate repo). Next.js code-splits by route, so this adds
nothing to the bundle any regular user downloads; it only loads for
whoever actually visits `/admin`.

## Purpose

Lets the app's single admin (the maker) manage content that shouldn't
require a code change + redeploy to update. Currently: home-screen ad/
sponsor banners. Designed to extend to other admin-controlled content
later without restructuring — see "Adding a new admin-controlled feature"
below.

## Auth model

Single hardcoded owner UID, same single-owner model as the rest of the
app (`isOwner(uid)` in firestore.rules). `/admin` reuses the app's
existing `useAuth()` (Google sign-in via Firebase Auth) — there is no
separate admin login system.

**The real enforcement is in `firestore.rules`, not the page.** The page
shows the signed-in UID and lets any signed-in user attempt to manage
banners; if their UID doesn't match the admin UID, every write (and every
read of an inactive/draft banner) is rejected by the rules, and the page
shows "This account isn't authorized" based on that rejection — it is not
a client-side gate that could be bypassed by editing the page's JS.

**Setup**: `firestore.rules`' `isAdmin()` function currently has the
placeholder `'REPLACE_WITH_ADMIN_UID'`. Sign in at `/admin` once, copy the
UID shown there, and replace the placeholder in both `firestore.rules` and
`tests/rules/firestore.rules.test.ts`'s `ADMIN` constant (keep them in
sync — the rules test suite authenticates as that literal string).

## Data model

`/banners/{bannerId}` (Firestore) — public read of `active == true`
documents (no auth required — the home screen has no account
requirement), admin-only read/write otherwise.

```
{ id, imageUrl, destinationUrl?, order, active }
```

Deliberately just an image + optional destination link — no title/
subtitle/sponsor-name fields. Any copy or branding lives inside the image
itself, uploaded elsewhere (the admin pastes a URL — Drive, imgbb, or any
other host with a direct image link; there is no upload/storage step in
this app). Rendered full-bleed at a 3:1 aspect ratio
(`components/home/HeroBannerCarousel.tsx`); recommend admin-supplied
images at 1200×400px or a multiple of it.

## Resilience (same pattern as the share-view cache)

`lib/shared/useLiveBanners.ts`: try a live Firestore read of active
banners; on success, cache locally (`lib/shared/bannerCache.ts`, a small
dedicated Dexie database, same reasoning as
`lib/shared/shareViewCache.ts` — display content, not sync state) and
render it; on failure (offline, Firebase not configured), fall back to
the local cache; if there's no cache either, fall back to the hardcoded
`BANNERS` array in `lib/banners.ts` (empty by default). Never an error
state — worst case is `HeroBannerCarousel` rendering nothing, which it
already does gracefully when there are no banners at all.

## Adding a new admin-controlled feature

Two patterns, matching how the rest of the app's data is modeled:

- **List-type content** (banners, and anything else that's "several items
  the admin manages individually" — e.g. future announcements): its own
  top-level Firestore collection, its own `isAdmin()`-gated rules block,
  its own small section/tab in `/admin`.
- **Simple settings/flags** (a single on/off switch or value, not a list):
  a flexible `/adminConfig/{key}` document rather than a dedicated
  collection per setting.

Either way: public read only where genuinely needed (most admin-managed
config an app reads for itself doesn't need to be publicly readable at
all — banners are a special case since the home screen itself is
unauthenticated-safe to read from), write always gated by the same
`isAdmin()` function, and `/admin` gains a new section rather than a new
route.
