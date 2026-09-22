import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, mockRouter } from "@/tests/test-utils";
import AdminPage from "./page";
import * as authLib from "@/lib/firebase/AuthProvider";
import * as clientLib from "@/lib/firebase/client";
import * as bannersLib from "@/lib/firebase/banners";
import { useToastStore } from "@/components/shared/Toast";
import type { Banner } from "@/lib/banners";

vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

const banner = (overrides: Partial<Banner> = {}): Banner => ({
  id: "b1",
  imageUrl: "https://example.com/b1.png",
  destinationUrl: "https://example.com",
  order: 0,
  active: true,
  ...overrides,
});

function mockAuth(user: { uid: string; email: string } | null, signIn = vi.fn()) {
  vi.spyOn(authLib, "useAuth").mockReturnValue({
    user,
    loading: false,
    error: null,
    signIn,
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof authLib.useAuth>);
}

beforeEach(() => {
  vi.spyOn(clientLib, "getFirebaseServices").mockReturnValue({ firestore: {} } as unknown as ReturnType<
    typeof clientLib.getFirebaseServices
  >);
  useToastStore.getState().hide();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminPage — signed out", () => {
  it("shows a sign-in prompt and never touches banners", async () => {
    const signIn = vi.fn();
    mockAuth(null, signIn);
    const listSpy = vi.spyOn(bannersLib, "listAllBanners");

    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await user.click(screen.getByRole("button", { name: /Sign in with Google/i }));
    expect(signIn).toHaveBeenCalled();
    expect(listSpy).not.toHaveBeenCalled();
  });
});

describe("AdminPage — signed in, authorized", () => {
  beforeEach(() => {
    mockAuth({ uid: "admin-uid", email: "admin@example.com" });
  });

  it("lists banners and shows the signed-in UID", async () => {
    vi.spyOn(bannersLib, "listAllBanners").mockResolvedValue([banner()]);
    renderWithProviders(<AdminPage />);

    expect(await screen.findByText("admin-uid")).toBeInTheDocument();
    expect(await screen.findByDisplayValue(banner().imageUrl)).toBeInTheDocument();
  });

  it("adds a new banner", async () => {
    vi.spyOn(bannersLib, "listAllBanners").mockResolvedValue([]);
    const createSpy = vi.spyOn(bannersLib, "createBanner").mockResolvedValue(banner());
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await screen.findByText(/No banners yet/i);
    await user.click(screen.getByRole("button", { name: /Add banner/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
  });

  it("saves an edited banner", async () => {
    vi.spyOn(bannersLib, "listAllBanners").mockResolvedValue([banner()]);
    const saveSpy = vi.spyOn(bannersLib, "saveBanner").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    const input = await screen.findByDisplayValue(banner().imageUrl);
    await user.clear(input);
    await user.type(input, "https://example.com/new.png");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ imageUrl: "https://example.com/new.png" }),
    ));
  });

  it("deletes a banner after confirmation", async () => {
    vi.spyOn(bannersLib, "listAllBanners").mockResolvedValue([banner()]);
    const deleteSpy = vi.spyOn(bannersLib, "deleteBanner").mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(<AdminPage />);

    await screen.findByDisplayValue(banner().imageUrl);
    await user.click(screen.getByRole("button", { name: /Delete/i }));

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(expect.anything(), "b1"));
  });
});

describe("AdminPage — signed in, not authorized", () => {
  it("shows the unauthorized message when listAllBanners is rejected", async () => {
    mockAuth({ uid: "some-other-uid", email: "notadmin@example.com" });
    vi.spyOn(bannersLib, "listAllBanners").mockRejectedValue(new Error("permission-denied"));

    renderWithProviders(<AdminPage />);

    expect(await screen.findByText(/isn't authorized to manage banners/i)).toBeInTheDocument();
  });
});
