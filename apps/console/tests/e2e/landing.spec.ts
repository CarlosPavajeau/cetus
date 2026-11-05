import type { Page } from "@playwright/test";
import { type } from "arktype";

import { formatCents } from "~/features/billing/labels";
import { acceptedDocumentsMin } from "~/features/marketing/figures";

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
  await expect(
    page.getByRole("link", { name: "Crear llave de simulación" }).first(),
  ).toHaveAttribute("href", "/sign-up?audience=dev");
  await expect(
    page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Contadores" }),
  ).toHaveAttribute("href", "/contadores");
});

test("the business view offers the console instead of the API", async ({ page }) => {
  await open(page, "/");

  await page.getByRole("button", { name: "Para negocios" }).first().click();

  await expect(page).toHaveURL(/audience=negocio/);
  await expect(page.getByRole("link", { name: "Empezar gratis" }).first()).toHaveAttribute(
    "href",
    "/sign-up?audience=negocio",
  );
  await expect(page.getByRole("heading", { level: 1, name: /desde tu navegador/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sin código, desde la consola" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu sistema se entera al instante" })).toHaveCount(
    0,
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

function octet() {
  return Math.floor(Math.random() * 254) + 1;
}

/** Each test leaves its leads from its own IP, so the API's hourly quota per IP never trips a rerun. */
async function fromFreshIp(page: Page) {
  await page.setExtraHTTPHeaders({ "cf-connecting-ip": `10.${octet()}.${octet()}.${octet()}` });
}

test("the calculator answers a natural person and emails the result", async ({ page }) => {
  await fromFreshIp(page);
  await open(page, "/estoy-obligado-a-facturar");

  await page.getByText("Persona natural", { exact: true }).click();
  const answer = (question: RegExp, value: string) =>
    page.getByRole("radiogroup", { name: question }).getByText(value, { exact: true }).click();
  await answer(/régimen simple/i, "No");
  await answer(/ingresos brutos/, "No");
  await answer(/más de un establecimiento/, "Sí");
  await answer(/franquicias/, "No sé");

  await expect(
    page.getByRole("heading", { name: "Debes facturar electrónicamente" }),
  ).toBeVisible();
  await expect(
    page.getByText("Con más de un establecimiento eres responsable de IVA."),
  ).toBeVisible();

  const email = `calculadora-${crypto.randomUUID()}@ejemplo.com`;
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Enviarme el resultado" }).click();
  await expect(page.getByText("Para escribirte necesitamos tu autorización.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Autorizo a Cetus/ }).click();
  await page.getByRole("button", { name: "Enviarme el resultado" }).click();

  await expect(page.getByText(`Te enviamos el resultado a ${email}.`)).toBeVisible();
});

test("accountants see the multi-issuer plans and can ask to be partners", async ({ page }) => {
  const contador = (await publicPlans()).find((offer) => offer.name === "Contador");
  await fromFreshIp(page);
  await open(page, "/contadores");

  if (contador === undefined) {
    throw new Error("The catalog has no Contador package");
  }
  const card = page.getByRole("article", { name: "Contador" });
  await expect(card).toContainText(formatCents(contador.version.totalCents));
  await expect(card).toContainText("en total");
  await expect(card.getByRole("link", { name: "Crear cuenta gratis" })).toHaveAttribute(
    "href",
    "/sign-up?audience=negocio",
  );
  const form = page.getByRole("form", { name: "Quiero ser socio" });
  const email = `socio-${crypto.randomUUID()}@ejemplo.com`;
  await form.getByLabel("Nombre", { exact: true }).fill("Ana Contadora");
  await form.getByLabel("Correo", { exact: true }).fill(email);
  await form.getByLabel("¿Cuántas empresas manejas?").fill("doce");
  await form.getByRole("checkbox", { name: /Autorizo a Cetus/ }).click();
  await form.getByRole("button", { name: "Quiero ser socio" }).click();
  await expect(form.getByText("Escribe cuántas empresas manejas")).toBeVisible();

  await form.getByLabel("¿Cuántas empresas manejas?").fill("12");
  await form.getByRole("button", { name: "Quiero ser socio" }).click();

  await expect(page.getByText(`Recibimos tus datos. Te escribiremos a ${email}.`)).toBeVisible();
});

test("avísame keeps the address for an upcoming integration", async ({ page }) => {
  await fromFreshIp(page);
  await open(page, "/");

  await page.getByRole("button", { name: /Avísame.*Shopify/ }).click();
  const popover = page.getByRole("dialog", { name: "Shopify" });
  const email = `avisame-${crypto.randomUUID()}@ejemplo.com`;
  await popover.getByLabel("Correo", { exact: true }).fill(email);
  await popover.getByRole("checkbox", { name: /Autorizo a Cetus/ }).click();
  await popover.getByRole("button", { name: "Avisarme" }).click();

  await expect(popover.getByText(`Listo. Te avisaremos a ${email}.`)).toBeVisible();
});

test("the trust band waits for real production figures", async ({ page }) => {
  const response = await fetch(`${apiUrl}/console/public/landing`);
  expect(response.ok).toBe(true);
  const figures = type({ acceptedDocuments: "number" }).assert(await response.json());

  await open(page, "/");

  await expect(
    page.getByRole("heading", { name: "Tu sistema se entera al instante" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Cetus en producción" })).toHaveCount(
    figures.acceptedDocuments >= acceptedDocumentsMin ? 1 : 0,
  );
});
