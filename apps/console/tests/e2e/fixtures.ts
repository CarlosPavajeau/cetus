import { type Page, test as base } from "@playwright/test";

import { nitCheckDigit } from "~/features/issuance/nitCheckDigit";

import { uniqueNit } from "../support/issuers";
import { type TestOrganization, createOrganization } from "../support/organization";
import { consoleCookies } from "../support/stack";

/**
 * `organization` signs the browser in as a brand-new organization, created over HTTP so each test
 * starts from a clean account without going through the sign-up form.
 */
export const test = base.extend<{ organization: TestOrganization }>({
  // `provide` is Playwright's `use`, renamed so the React hooks lint rule does not mistake it for a hook.
  organization: async ({ context }, provide) => {
    const organization = await createOrganization();
    await context.addCookies(consoleCookies(organization.cookies));
    await provide(organization);
  },
});

export { expect } from "@playwright/test";

/**
 * Opens a page and waits until the app has hydrated: before that, buttons that are not plain form
 * submits do nothing and forms submit natively. The network going idle is not enough: React hydrates in a
 * transition, a Suspense boundary at a time, and on a busy CI runner it finishes seconds later. React marks
 * each element it hydrates with a `__reactProps$` key, so this waits until every control has one, except the
 * development-only query devtools, which React does not render.
 */
export async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("button, a[href], input, select, textarea"))
      .filter((element) => !element.closest('[class*="tsqd"]'))
      .every((element) => Object.keys(element).some((key) => key.startsWith("__reactProps$"))),
  );
}

/** Picks one fiscal responsibility in the multiple select of the issuer form, and closes it. */
export async function pickTaxLevel(page: Page, code: string) {
  await page
    .getByRole("group", { name: "Responsabilidades tributarias" })
    .getByRole("checkbox", { name: code })
    .click();
}

/** A natural person with a NIT no other test uses. */
export function sampleIssuer() {
  const nit = uniqueNit();
  const checkDigit = nitCheckDigit(nit);
  if (checkDigit === null) {
    throw new Error(`${nit} is not a NIT`);
  }
  return { legalName: "PERSONA DE PRUEBAS", nit, checkDigit };
}

/** Fills the assistant's first step for a natural person, as the RUT shows the data. */
export async function fillIssuer(page: Page, issuer = sampleIssuer()) {
  await page.getByRole("radio", { name: /Persona natural/ }).click();
  await page.getByLabel("Nombre completo").fill(issuer.legalName);
  // Typed as the RUT shows it, verification digit included.
  await page.getByLabel("NIT").pressSequentially(`${issuer.nit}-${issuer.checkDigit}`);
  await pickTaxLevel(page, "O-47");
  await page.getByLabel("Dirección", { exact: true }).fill("Calle 1 # 2-3");
  await page.getByLabel("Código postal").fill("200001");
  await page.getByLabel("Departamento").fill("Cesa");
  await page.getByRole("option", { name: "Cesar", exact: true }).click();
  await page.getByLabel("Municipio").fill("Valledu");
  await page.getByRole("option", { name: "Valledupar" }).click();
  await page.getByLabel("Correo electrónico").fill("facturas@emisores.test");
  await page.getByLabel("Teléfono").fill("6011234567");
  return issuer;
}
