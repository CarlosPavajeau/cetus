import { defineConfig, devices } from "@playwright/test";

import { consoleUrl } from "./tests/support/stack";

// End-to-end tests: a real browser against the running stack (`mise run dev-mock`).
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/support/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: consoleUrl,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } },
    },
  ],
});
