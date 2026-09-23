import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Queries like getByText/findByText search raw DOM text and, unlike
// role-based queries, don't skip aria-hidden content by default. Several
// components render off-screen, aria-hidden helper markup (e.g.
// PersonStatementCard, captured to an image and never actually shown) that
// can duplicate visible text — extending the default ignore list here is
// the semantically correct fix (aria-hidden content isn't something a user
// sees) and avoids every test file needing its own workaround for it.
configure({ defaultIgnore: "script, style, [aria-hidden='true'], [aria-hidden='true'] *" });

// RTL's automatic cleanup only wires itself up under vitest's `globals: true`
// mode. This project doesn't use that (existing lib/ tests explicitly
// import describe/it/expect for consistency), so it's done by hand here —
// without it, a component left mounted by one test bleeds into the next.
afterEach(() => {
  cleanup();
});

// jsdom on some Node builds exposes `window` but leaves `localStorage`
// undefined (ExperimentalWarning: localStorage is not available because
// --localstorage-file was not provided). lib/i18n reads bare `localStorage`
// after mount — without this polyfill every component test that mounts
// I18nProvider throws before rendering. Check the API, not just key
// presence: the property can exist and still be undefined/broken.
function ensureLocalStorage(): void {
  if (typeof window === "undefined") return;

  const current = window.localStorage;
  if (current && typeof current.getItem === "function") return;

  const store = new Map<string, string>();
  const polyfill = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };

  try {
    Object.defineProperty(window, "localStorage", { value: polyfill, configurable: true });
  } catch {
    // ignore — non-configurable host binding
  }
  try {
    Object.defineProperty(globalThis, "localStorage", { value: polyfill, configurable: true });
  } catch {
    // ignore — free-variable binding may be separate from window
  }
}
ensureLocalStorage();

// jsdom doesn't implement matchMedia — lib/theme.tsx (via ThemeProvider)
// reads it directly, so any component test that mounts ThemeProvider needs
// this or it throws immediately.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't implement ResizeObserver/IntersectionObserver, which
// framer-motion (used throughout components/) touches in some code paths.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  // @ts-expect-error — minimal stub, not a full implementation
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
