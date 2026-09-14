import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tests/rules/** needs a running Firestore emulator (see
    // tests/rules/README.md) and must not be picked up by the default
    // `npm test` run — it has its own script (`npm run test:rules`).
    exclude: ["**/node_modules/**", "tests/rules/**"],
  },
});
