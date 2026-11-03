import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Cloud tests (testCloud) boot a workerd, which on a busy machine takes more than vitest's 5 s test and 10 s hook
    // defaults. A passing test ends as soon as it is done, so only a hang waits this long.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
