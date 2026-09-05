// Khata service worker — minimal, reliable app-shell caching for offline use.
// (See docs/PWA.md for the full offline strategy. This is the Phase 0/1
// implementation; swapping in a fuller Workbox/Serwist setup later is a
// drop-in replacement, not a redesign, since there's no external API
// dependency to reconcile.)
//
// IMPORTANT caching split (learned the hard way — see git history):
// - HTML navigations (the page shell) MUST be network-first. Next.js embeds
//   build-specific chunk references in that HTML, so a stale cached HTML
//   document can keep serving an old build indefinitely even after a
//   successful new deploy, with no visible error. Offline is the fallback,
//   not the default.
// - Hashed static assets under /_next/static/ are safe to cache-first:
//   their URL changes whenever their content does, so a cached copy is
//   never stale by definition.
// - Everything else (icons, manifest) uses stale-while-revalidate: fast
//   from cache, refreshed in the background for next time.

const CACHE_NAME = "khata-shell-v2";
const APP_SHELL = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Page navigations: network-first, cache only as an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // 2. Hashed build assets: cache-first is safe, the URL itself is the version.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // 3. Everything else (icons, manifest, etc.): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
