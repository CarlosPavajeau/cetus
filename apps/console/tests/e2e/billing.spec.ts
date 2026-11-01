import type { Page } from "@playwright/test";

import { grantPackage, subscribe } from "../support/credits";
import { type TestOrganization, inviteMember } from "../support/organization";
import { consoleCookies } from "../support/stack";
import { expect, open, test } from "./fixtures";

/** The text with each COP amount as Intl writes it: "$", a no-break space, then the digits. */
function cop(text: string) {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped.replaceAll("\\$", "\\$\\s"));
}

async function signInAs(page: Page, person: TestOrganization) {
  await page.context().clearCookies();
  await page.context().addCookies(consoleCookies(person.cookies));
}

test("a new account has no product and sees subscriptions and packages for sale", async ({
  page,
  organization: _owner,
}) => {
  await open(page, "/overview");
  await expect(page.getByText(/^Sin producto vigente · cuenta/)).toBeVisible();

  await page.getByRole("link", { name: "Facturación", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Facturación", level: 1 })).toBeVisible();
  await expect(page.getByText("No tienes una suscripción ni un paquete vigente")).toBeVisible();
  await expect(page.getByText("0 de 0 incluidos")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Documentos facturables por mes" }).getByRole("row"),
  ).toHaveCount(7);

  await page.getByRole("link", { name: "Comprar créditos" }).click();
  await expect(page.getByRole("heading", { name: "Negocio" })).toBeVisible();
  await expect(page.getByText("Precio final, sin IVA").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Recarga/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Inicial" })).toBeVisible();
  await expect(page.getByText(cop("$150 por documento adicional"))).toBeVisible();
});

test("a subscribed account sees its period, changes its overage limit and buys no packages", async ({
  page,
  organization,
}) => {
  await subscribe(organization, "INICIAL");

  await open(page, "/billing");
  await expect(page.getByText(/^Suscripción Inicial$/).first()).toBeVisible();
  const subscription = page.getByRole("region", { name: "Suscripción Inicial" });
  await expect(subscription.getByText("0 de 200", { exact: true })).toBeVisible();
  await expect(subscription.getByText(cop("0 documentos · $0"))).toBeVisible();
  await expect(subscription.getByText(cop("$117.000 · 0 de 780 documentos"))).toBeVisible();
  await expect(page.getByRole("link", { name: "Comprar créditos" })).toHaveCount(0);

  await subscription.getByRole("button", { name: "Cambiar límite" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Límite por periodo, en pesos").fill("300000");
  await dialog.getByRole("button", { name: "Guardar límite" }).click();
  await expect(dialog).toBeHidden();
  await expect(subscription.getByText(cop("$300.000 · 0 de 2.000 documentos"))).toBeVisible();

  await subscription.getByRole("button", { name: "Cancelar suscripción" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar al final del periodo" })
    .click();
  await expect(page.getByText("Tu suscripción termina con este periodo")).toBeVisible();
  await expect(subscription.getByRole("button", { name: "Reanudar suscripción" })).toBeVisible();

  await open(page, "/billing/products");
  await expect(page.getByText("Tienes la suscripción Inicial")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar" })).toHaveCount(0);
});

test("a subscribed account saves a card for its renewals and removes it", async ({
  page,
  organization,
}) => {
  await subscribe(organization, "INICIAL");
  const profile = await organization.api("/console/billing-profile", {
    method: "PUT",
    body: JSON.stringify({
      personType: "LEGAL_ENTITY",
      identificationType: "NIT",
      identificationNumber: "900123456",
      legalName: "Tarjeta E2E SAS",
      taxLevelCodes: ["O-13"],
      taxScheme: "IVA",
      email: "facturas@tarjeta-e2e.test",
    }),
  });
  expect(profile.ok).toBe(true);

  await open(page, "/billing");
  const automatic = page.getByRole("region", { name: "Cobro automático" });
  await expect(automatic.getByText(/^Sin tarjeta guardada/)).toBeVisible();
  await automatic.getByRole("button", { name: "Activar cobro automático" }).click();
  const dialog = page.getByRole("dialog");
  // The card goes from the browser to Wompi's sandbox; a stack without Wompi's keys cannot save one.
  const unavailable = dialog.getByText(
    "Los pagos no están disponibles en este momento. Intenta más tarde.",
  );
  const save = dialog.getByRole("button", { name: "Guardar tarjeta" });
  await expect(save.and(page.locator(":enabled")).or(unavailable)).toBeVisible();
  if (await unavailable.isVisible()) {
    return;
  }
  await dialog.getByLabel("Número de la tarjeta").fill("4242 4242 4242 4242");
  await dialog.getByLabel("Vencimiento (MM/AA)").fill("08/29");
  await dialog.getByLabel("Código de seguridad").fill("123");
  await dialog.getByLabel("Nombre en la tarjeta").fill("Prueba Cetus");
  await save.click();
  await expect(
    dialog.getByText("Acepta los términos de Wompi para guardar la tarjeta."),
  ).toBeVisible();
  await dialog.getByRole("checkbox", { name: /términos y condiciones de Wompi/ }).click();
  await dialog.getByRole("checkbox", { name: /tratamiento de mis datos personales/ }).click();
  await save.click();
  // Two calls to Wompi's sandbox: the browser tokenizes the card, then the API saves it.
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(automatic.getByText("VISA ••4242")).toBeVisible();
  await expect(automatic.getByText("08/29")).toBeVisible();

  await automatic.getByRole("button", { name: "Quitar tarjeta" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar tarjeta" }).click();
  await expect(automatic.getByText(/^Sin tarjeta guardada/)).toBeVisible();
});

test("old links to the plan page land on billing", async ({ page, organization: _owner }) => {
  await open(page, "/settings/usage");

  await expect(page).toHaveURL(/\/billing$/);
  await expect(page.getByRole("heading", { name: "Facturación", level: 1 })).toBeVisible();
});

test("an account with a package sees its lot and buys after setting its billing profile", async ({
  page,
  organization,
}) => {
  await grantPackage(organization);
  await page.route("https://checkout.wompi.co/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>Checkout de Wompi</p>" }),
  );

  await open(page, "/billing");
  await expect(page.getByText("No tienes una suscripción ni un paquete vigente")).toHaveCount(0);
  await expect(page.getByText("0 de 3.000", { exact: true })).toBeVisible();
  await expect(page.getByText("0 de 3 incluidos")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Contador" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Paquete de las pruebas e2e" })).toBeVisible();

  await page.getByRole("link", { name: "Comprar créditos" }).click();
  await expect(page.getByRole("heading", { name: "Recarga de 100 documentos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar" })).toHaveCount(0);

  await page.getByRole("button", { name: "Completar perfil de facturación" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Número").fill("800197268");
  await dialog.getByLabel("Nombre o razón social").fill("Compradora Andina SAS");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog.getByText("Escribe el correo donde recibirás las facturas.")).toBeVisible();
  await dialog.getByLabel("Correo de facturación").fill("facturas@andina.test");
  await dialog.getByRole("button", { name: "Guardar" }).click();
  await expect(dialog).toHaveCount(0);

  const topUp = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole("heading", { name: "Recarga de 100 documentos" }) });
  await topUp.getByRole("button", { name: "Comprar" }).click();
  await expect(dialog.getByText("Compradora Andina SAS")).toBeVisible();
  await expect(dialog.getByText("facturas@andina.test")).toBeVisible();
  await dialog.getByRole("button", { name: "Ir a pagar" }).click();
  // The stack may run without Wompi's keys: then no order can be placed.
  await expect(
    page
      .getByText("Checkout de Wompi")
      .or(page.getByText("Los pagos no están disponibles en este momento. Intenta más tarde.")),
  ).toBeVisible();

  await open(page, "/billing");
  await expect(page.getByRole("region", { name: "Perfil de facturación" })).toContainText(
    "NIT 800197268-4",
  );
});

test("a plain member reads the balance but neither buys nor edits the profile", async ({
  page,
  organization: owner,
}) => {
  await grantPackage(owner);
  const { person: member } = await inviteMember(owner, "member");
  await signInAs(page, member);

  await open(page, "/billing");
  await expect(page.getByText("0 de 3.000", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /perfil/i })).toHaveCount(0);

  await open(page, "/billing/products");
  await expect(page.getByText("Solo lectura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Completar perfil de facturación" })).toHaveCount(
    0,
  );

  await open(page, "/billing/orders");
  await expect(page.getByText("Todavía no tienes compras")).toBeVisible();
});
