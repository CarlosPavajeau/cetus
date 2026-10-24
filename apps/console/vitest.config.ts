import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        // Unit tests: pure functions, no stack needed.
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        // Integration tests: they call the running stack (`mise run dev-mock`) over HTTP, without mocks.
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/global-setup.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
