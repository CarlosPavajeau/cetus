import type { Locator, Page } from "@playwright/test";

import { expect, open as openPage, test } from "../e2e/fixtures";
import { markEmailVerified } from "../support/invitations";

const directory = new URL("../../../docs/public/images/consola/", import.meta.url).pathname;

/** Opens a page without what only shows in development: the React Query devtools button. */
async function open(page: Page, path: string) {
  await openPage(page, path);
  await page.addStyleTag({ content: ".tsqd-parent-container { display: none !important; }" });
}

async function capture(page: Page, name: string, mask: Locator[] = []) {
  await page.screenshot({ path: `${directory}${name}.png`, mask, maskColor: "#e4e4e7" });
}

// A confirmed address, so the screens show no banner asking for it.
test.beforeEach(async ({ organization }) => {
  await markEmailVerified(organization.email);
});

test("the first simulated invoice, from the console", async ({ page }) => {
  await open(page, "/overview");
  await expect(page.getByRole("button", { name: "Emitir factura de prueba" })).toBeVisible();
  await capture(page, "resumen-simulacion");

  await page.getByRole("button", { name: "Emitir factura de prueba" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "119.000" }).first()).toBeVisible();
  await capture(page, "factura-precargada");

  await page.getByRole("button", { name: "Emitir factura" }).click();
  await expect(page.getByText("El simulador de Cetus lo aceptó")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  await capture(page, "factura-aceptada");
});

test("an API key and a webhook for the simulation", async ({ page }) => {
  await open(page, "/developers/api-keys");
  await page.getByRole("button", { name: "Crear llave" }).first().click();
  const keyDialog = page.getByRole("dialog");
  await keyDialog.getByLabel("Nombre").fill("Mi integración");
  await capture(page, "nueva-llave");
  await keyDialog.getByRole("button", { name: "Crear llave" }).click();
  const key = keyDialog.getByLabel("Llave de API");
  await expect(key).toHaveValue(/^cetus_sandbox_/);
  await capture(page, "llave-creada", [key]);
  await keyDialog.getByRole("button", { name: "Listo" }).click();

  await open(page, "/developers/webhooks");
  await page.getByRole("button", { name: "Registrar webhook" }).first().click();
  const webhookDialog = page.getByRole("dialog");
  await webhookDialog.getByLabel("URL").fill("https://webhook.site/tu-url");
  await webhookDialog.getByLabel("Ambiente").click();
  await page.getByRole("option", { name: /^Simulación/ }).click();
  await webhookDialog.getByRole("checkbox", { name: "Factura aceptada" }).click();
  await capture(page, "nuevo-webhook");
});
