// Shared helpers for component tests (components/**, app/**). Not a test
// file itself — vitest only picks up *.test.ts(x), so this is a plain
// module every component test can import from.
//
// See docs/TESTING.md for the conventions this is meant to support.
import "fake-indexeddb/auto";
import { vi } from "vitest";
import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/lib/i18n";
import { db } from "@/lib/db/schema";
import { syncDb } from "@/lib/firebase/syncDb";

function AllProviders({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

// Renders with the providers every component reasonably needs by default
// (currently just I18nProvider — useI18n() throws without it, and it's used
// nearly everywhere). Components that specifically need ThemeProvider,
// AuthProvider, or SyncProvider should wrap with those directly in the
// individual test rather than growing this default — most component tests
// shouldn't need to know sync or auth exist at all.
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Clears every local table (both Dexie databases) between tests. Call this
// in a beforeEach — component tests exercise real db/*.ts write functions
// against fake-indexeddb, same as lib/db/*.test.ts, so state leaks across
// tests exactly the same way it would there without this.
export async function resetTestDb(): Promise<void> {
  await db.transaction(
    "rw",
    [db.notebooks, db.people, db.transactions, db.settings, db.groups, db.syncCaptureIntents],
    async () => {
      await Promise.all([
        db.notebooks.clear(),
        db.people.clear(),
        db.transactions.clear(),
        db.settings.clear(),
        db.groups.clear(),
        db.syncCaptureIntents.clear(),
      ]);
    },
  );
  await Promise.all([
    syncDb.syncMutations.clear(),
    syncDb.syncTombstones.clear(),
    syncDb.syncMeta.clear(),
  ]);
}

// next/navigation's useRouter needs an app-router context this project
// doesn't set up in tests. The standard, low-ceremony approach is mocking
// the module per test file:
//
//   vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
//
// mockRouter is exported here so every test file mocks the same shape
// instead of redefining it, and so assertions (e.g. expect(mockRouter.push)
// .toHaveBeenCalledWith(...)) work by importing the same object.
export const mockRouter = {
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
