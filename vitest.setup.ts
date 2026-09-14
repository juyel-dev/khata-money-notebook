import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL's automatic cleanup only wires itself up under vitest's `globals: true`
// mode. This project doesn't use that (existing lib/ tests explicitly
// import describe/it/expect for consistency), so it's done by hand here —
// without it, a component left mounted by one test bleeds into the next.
afterEach(() => {
  cleanup();
});

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
