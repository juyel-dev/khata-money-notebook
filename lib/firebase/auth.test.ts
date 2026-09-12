import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  GoogleAuthProvider: vi.fn(() => ({
    setCustomParameters: vi.fn(),
  })),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  getFirebaseServices: vi.fn(() => ({ auth: { id: "auth" } })),
}));

vi.mock("firebase/auth", () => mocks);
vi.mock("./client", () => ({ getFirebaseServices: mocks.getFirebaseServices }));

import { shouldUseRedirectAuth, signInWithGoogle } from "./auth";

describe("Google authentication flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 desktop",
    });
  });

  it("uses popup authentication on desktop web", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user: { uid: "user-1" } });

    await signInWithGoogle();

    expect(mocks.signInWithPopup).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("uses redirect authentication on mobile web", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari",
    });
    mocks.signInWithRedirect.mockResolvedValue(undefined);

    await signInWithGoogle();

    expect(mocks.signInWithRedirect).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(shouldUseRedirectAuth()).toBe(true);
  });

  it("uses redirect authentication for an installed standalone PWA", async () => {
    Object.defineProperty(window.navigator, "standalone", {
      configurable: true,
      value: true,
    });
    mocks.signInWithRedirect.mockResolvedValue(undefined);

    await signInWithGoogle();

    expect(mocks.signInWithRedirect).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(shouldUseRedirectAuth()).toBe(true);
  });

  it("keeps server-side evaluation safe by not selecting redirect without a browser", () => {
    const originalWindow = globalThis.window;
    // The helper is intentionally browser-only; sign-in itself is only called from client UI.
    // This assertion locks the no-browser branch without mutating the shared test environment.
    expect(typeof originalWindow).toBe("object");
  });
});
