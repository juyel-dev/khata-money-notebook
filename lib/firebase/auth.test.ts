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

  browserWindow.matchMedia = vi.fn(() => ({ matches: displayModeStandalone }));
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
