import path from "node:path";
import { defineConfig } from "vitest/config";

// Split into two projects by environment rather than one flat config:
//   - lib      → node (default) — fast, matches what's there today
//   - ui       → jsdom — components/**, app/** need a DOM to render into
// tests/rules/** still needs its own config (vitest.rules.config.ts) since
// it needs a real Firestore emulator, not just a DOM.
const alias = { "@": path.resolve(__dirname, ".") };
const exclude = ["**/node_modules/**", "tests/rules/**"];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "lib",
          environment: "node",
          exclude: [...exclude, "components/**", "app/**"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["components/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
          exclude,
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
