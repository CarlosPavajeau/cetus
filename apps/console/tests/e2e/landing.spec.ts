import { type } from "arktype";

import { formatCents } from "~/features/billing/labels";

import { apiUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

const publicPlan = type({
  name: "string",
  kind: "'SUBSCRIPTION' | 'PACKAGE' | 'TOPUP'",
  version: type({ totalCents: "number" }),
}).array();

async function publicPlans() {
  const response = await fetch(`${apiUrl}/public/plans`);
  expect(response.ok).toBe(true);
  return publicPlan.assert(await response.json());
}

test("the landing shows the catalog's prices and sends developers to the sign-up", async ({
  page,
}) => {
  const subscriptions = (await publicPlans()).filter((offer) => offer.kind === "SUBSCRIPTION");
  expect(subscriptions.length).toBeGreaterThan(0);

  await open(page, "/");

  await expect(page.getByRole("heading", { level: 1, name: /Conectados a la DIAN/ })).toBeVisible();
  const pricing = page.locator("#precios");
  await Promise.all(
    subscriptions.map((offer) =>
      expect(pricing.getByRole("article", { name: offer.name })).toContainText(
        formatCents(offer.version.totalCents),
      ),
    ),
  );
  await expect(page.getByRole("link", { name: "Crear llave de sandbox" }).first()).toHaveAttribute(
    "href",
    "/sign-up?audience=dev",
  );
});

test("the business view offers the console instead of the API", async ({ page }) => {
  await open(page, "/");

  await page.getByRole("button", { name: "Para negocios" }).first().click();

  await expect(page).toHaveURL(/audience=negocio/);
  await expect(page.getByRole("link", { name: "Empezar gratis" }).first()).toHaveAttribute(
    "href",
    "/sign-up?audience=negocio",
  );
});

test("a signed-in visitor goes back to the console", async ({ page, organization }) => {
  expect(organization.cookies.length).toBeGreaterThan(0);

  await open(page, "/");

  await expect(page.getByRole("link", { name: "Ir a la consola" }).first()).toHaveAttribute(
    "href",
    "/overview",
  );
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeHidden();
});

test("the pricing page lists the annual packages", async ({ page }) => {
  const packages = (await publicPlans()).filter((offer) => offer.kind === "PACKAGE");

  await open(page, "/precios");
  await page.getByRole("tab", { name: "Anual" }).click();

  await Promise.all(
    packages.map((offer) =>
      expect(page.getByRole("article", { name: offer.name })).toContainText(
        formatCents(offer.version.totalCents),
      ),
    ),
  );
});
