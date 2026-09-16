# Testing

> Conventions for writing tests in this repo — three separate layers, each
> with its own config and its own reason to exist. Read this before adding
> a new test file so it lands in the right place with the right pattern.

## The three layers

| Layer | Where | Environment | Run by | What it's for |
|---|---|---|---|---|
| `lib` | `lib/**/*.test.ts` | node | `npm test` | Business logic — money math, db functions, sync engine, reconciliation. No DOM. |
| `ui` | `components/**/*.test.tsx`, `app/**/*.test.tsx` | jsdom | `npm test` | Rendered component behavior — user interaction, error handling, what shows up on screen. |
| `rules` | `tests/rules/**/*.test.ts` | node + real Firestore emulator | `npm run test:rules` | Firestore security rules — see `tests/rules/README.md`. Needs a JVM and network access to download the emulator; not part of `npm test`. |

All three are defined across `vitest.config.ts` (a `test.projects` array —
`lib` and `ui` as separate projects sharing one config file) and
`vitest.rules.config.ts` (`rules`, kept fully separate because it needs the
emulator, not just a different environment).

**Where a new test goes:** co-locate it next to the file it tests, same as
the existing `lib/` tests do (`Foo.ts` → `Foo.test.ts` in the same folder).
Component tests follow the identical pattern (`NotebookForm.tsx` →
`NotebookForm.test.tsx` right next to it). Don't invent a parallel
`__tests__/` tree — the two vitest projects already route by the
`components/**` / `app/**` / everything-else split, not by folder name.

## Writing a component test

Import from `tests/test-utils.tsx`, not `@testing-library/react` directly —
it re-exports everything from RTL plus the project-specific helpers below,
so one import line gets you both.

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, resetTestDb, mockRouter } from "@/tests/test-utils";
import { MyComponent } from "./MyComponent";

vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

beforeEach(async () => {
  await resetTestDb();
  mockRouter.push.mockClear();
});

it("does the thing", async () => {
  const user = userEvent.setup();
  renderWithProviders(<MyComponent />);
  await user.click(screen.getByRole("button", { name: "Save" }));
  // ...
});
```

**`renderWithProviders`** wraps with `I18nProvider` only — that's the one
context almost every component needs (`useI18n()` throws without it).
If the component under test also calls `useTheme()`, `useAuth()`, or
`useSync()`, wrap with the specific provider(s) it needs directly in that
test file rather than growing the default wrapper. Most component tests
shouldn't have to know sync or auth exist.

**`resetTestDb()`** clears every table in both Dexie databases
(`khata-db` and `khata-sync-db`). Call it in `beforeEach` for any test that
touches real data — which is most of them, since the convention here is to
exercise the real `lib/db/*.ts` functions against `fake-indexeddb` rather
than mocking the database layer. Only mock a specific db function
(`vi.spyOn(someDbModule, "someFunction")`) when the test is specifically
about failure handling — see the `mockRejectedValueOnce` examples in
`NotebookForm.test.tsx` / `TransactionSheet.test.tsx`.

**`mockRouter`** is a shared `vi.fn()`-based mock for `next/navigation`'s
`useRouter()`. Mock the module per test file as shown above; import the
same `mockRouter` object everywhere so assertions
(`expect(mockRouter.push).toHaveBeenCalledWith(...)`) work without every
file redefining its own mock shape.

**Toasts** (`showToast`) and the transaction-sheet/notebook-picker state
(`useUIStore`) are plain Zustand stores, not React context — no wrapper
needed. Read `useToastStore.getState().message` to assert on what toast
was shown; call `useUIStore.getState().openAddSheet(...)` etc. directly to
drive sheet state before rendering.

**jsdom gaps**: `vitest.setup.ts` polyfills `matchMedia`, `ResizeObserver`,
and `IntersectionObserver`, since jsdom doesn't implement them and
`ThemeProvider`/`framer-motion` touch them. If a new component test hits
another missing browser API, add the polyfill there rather than in the
individual test file.

## What's covered so far, and what isn't

`NotebookForm` and `TransactionSheet` have real coverage — both were where
the write-failure/error-handling bugs from the earlier UI audit pass were
found and fixed, so their tests are regression tests for those fixes
specifically (stuck-disabled Save button, silent failure, invalid-date
handling) plus a couple of happy-path/validation checks.

Nothing else under `components/` or `app/` has tests yet. This pass built
the infrastructure and proved it against the two components with known
history; extending coverage to the rest of the component tree is future
work, not something this doc should claim is already done.
