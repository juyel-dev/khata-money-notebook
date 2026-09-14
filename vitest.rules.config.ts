import { defineConfig } from "vitest/config";

// Separate config for tests/rules/ (see tests/rules/README.md). Needs its
// own file rather than an --include override on the CLI: vitest.config.ts's
// `exclude` list applies globally regardless of the path given to `vitest
// run`, so pointing the default config at tests/rules still finds nothing.
export default defineConfig({
  test: {
    include: ["tests/rules/**/*.test.ts"],
  },
});
