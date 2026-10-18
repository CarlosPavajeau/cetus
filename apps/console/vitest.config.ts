import { defineConfig } from "vitest/config";

// Integration tests: they call the running stack (`make dev-mock`) over HTTP, without mocks.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/support/global-setup.ts"],
    testTimeout: 30_000,
  },
});
