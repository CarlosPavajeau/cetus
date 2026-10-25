import { defineConfig, devices } from "@playwright/test";

import { consoleUrl } from "./tests/support/stack";

// Captures the console for the docs site's guides (apps/docs/public/images/consola). Run by hand when the
// screens change, with the stack up: `pnpm --filter @cetus/console screenshots`.
export default defineConfig({
  testDir: "tests/screenshots",
  globalSetup: "./tests/support/global-setup.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: consoleUrl,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    colorScheme: "light",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
