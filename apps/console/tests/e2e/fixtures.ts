import { type Page, test as base } from "@playwright/test";

import { type TestOrganization, createOrganization } from "../support/organization";
import { consoleUrl } from "../support/stack";

/**
 * `organization` signs the browser in as a brand-new organization, created over HTTP so each test
 * starts from a clean account without going through the sign-up form.
 */
export const test = base.extend<{ organization: TestOrganization }>({
  // `provide` is Playwright's `use`, renamed so the React hooks lint rule does not mistake it for a hook.
  organization: async ({ context }, provide) => {
    const organization = await createOrganization();
    await context.addCookies(
      organization.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })),
    );
    await provide(organization);
  },
});

export { expect } from "@playwright/test";

/**
 * Opens a page and waits until the app has hydrated: before that, buttons that are not plain form
 * submits do nothing and forms submit natively.
 */
export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}
