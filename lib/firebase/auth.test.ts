import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  GoogleAuthProvider: vi.fn(() => ({
    setCustomParameters: vi.fn(),
  })),
  getRedirectResult: vi.fn(() => Promise.resolve(null)),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  getFirebaseServices: vi.fn(() => ({ auth: { id: "auth" } })),
}));

vi.mock("firebase/auth", () => mocks);
vi.mock("./client", () => ({ getFirebaseServices: mocks.getFirebaseServices }));

import { observeAuthState, resolveRedirectSignIn, shouldUseRedirectAuth, signInWithGoogle } from "./auth";

function setBrowserContext({ userAgent, standalone, displayModeStandalone }: {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
}) {
  const browserWindow = (globalThis as typeof globalThis & {
    window?: {
      matchMedia: (query: string) => { matches: boolean };
    };
  }).window ?? { matchMedia: () => ({ matches: false }) };

  browserWindow.matchMedia = vi.fn(() => ({ matches: displayModeStandalone })) as unknown as typeof window.matchMedia;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent, standalone },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow,
  });
}

describe("Google authentication flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRedirectResult.mockResolvedValue(null);
    setBrowserContext({
      userAgent: "Mozilla/5.0 desktop",
      standalone: false,
      displayModeStandalone: false,
    });
  });

  it("uses popup authentication on desktop web", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user: { uid: "user-1" } });

    await signInWithGoogle();

    expect(mocks.signInWithPopup).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("uses redirect authentication on mobile web", async () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile Safari",
      standalone: false,
      displayModeStandalone: false,
    });
    mocks.signInWithRedirect.mockResolvedValue(undefined);

    await signInWithGoogle();

    expect(mocks.signInWithRedirect).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(shouldUseRedirectAuth()).toBe(true);
  });

  it("uses redirect authentication for an installed standalone PWA", async () => {
    setBrowserContext({
      userAgent: "Mozilla/5.0 desktop",
      standalone: false,
      displayModeStandalone: true,
    });
    mocks.signInWithRedirect.mockResolvedValue(undefined);

    await signInWithGoogle();

    expect(mocks.signInWithRedirect).toHaveBeenCalledWith({ id: "auth" }, expect.anything());
    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(shouldUseRedirectAuth()).toBe(true);
  });

  it("resolves a redirect sign-in result through Firebase Auth", async () => {
    const credential = { user: { uid: "user-1" } };
    mocks.getRedirectResult.mockResolvedValue(credential);

    await expect(resolveRedirectSignIn()).resolves.toEqual(credential);
    expect(mocks.getRedirectResult).toHaveBeenCalledWith({ id: "auth" });
  });

  it("forwards auth observer errors instead of hiding them", () => {
    const onError = vi.fn();
    observeAuthState(vi.fn(), onError);

    expect(mocks.onAuthStateChanged).toHaveBeenCalledWith(
      { id: "auth" },
      expect.any(Function),
      onError
    );
  });

  it("selects popup safely when no browser globals are available", () => {
    const originalWindow = globalThis.window;
    Reflect.deleteProperty(globalThis, "window");

    expect(shouldUseRedirectAuth()).toBe(false);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});
