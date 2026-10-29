import { type BrowserContext } from "@playwright/test";

import { createIssuer, uniqueNit } from "../support/issuers";
import { type TestOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { consoleCookies } from "../support/stack";
import { expect, fillIssuer, open, test } from "./fixtures";

async function signIn(context: BrowserContext, who: TestOrganization) {
  await context.clearCookies();
  await context.addCookies(consoleCookies(who.cookies));
}

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

test("a member opens a ticket with an attachment and sees it in the organization's list", async ({
  page,
  organization,
}) => {
  await open(page, "/overview");
  await page.getByRole("link", { name: "Ayuda" }).first().click();
  await expect(page.getByRole("heading", { name: "Ayuda", level: 1 })).toBeVisible();
  await expect(page.getByText("Sin casos de soporte")).toBeVisible();

  await page.getByRole("button", { name: "Nuevo caso" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  await expect(dialog.getByText("Cuéntanos qué pasa")).toBeVisible();
  await expect(dialog.getByRole("radiogroup", { name: "Prioridad" })).toHaveAccessibleDescription(
    "Elige la prioridad del caso.",
  );

  await dialog.getByLabel("Mensaje").fill("La factura de prueba no llega al correo del cliente.");
  await dialog.getByText("Algo está bloqueado, pero sigo emitiendo").click();
  await dialog
    .locator("#ticket-attachments")
    .setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: png });
  await expect(dialog.getByText("captura.png adjuntado.")).toBeAttached();
  await dialog.getByRole("button", { name: "Enviar" }).click();

  await expect(dialog.getByText(/Recibimos tu caso #\d+/)).toBeVisible();
  await dialog.getByRole("button", { name: "Listo" }).click();
  const tickets = page.getByRole("region", { name: "Casos de la organización" });
  await expect(
    tickets.getByText("La factura de prueba no llega al correo del cliente."),
  ).toBeVisible();
  await expect(tickets.getByText("Alta")).toBeVisible();
  await expect(tickets.getByText("Abierto")).toBeVisible();
  await expect(tickets.getByText(organization.email)).toBeVisible();

  await open(page, "/activity");
  await expect(page.getByText("Caso de soporte abierto")).toBeVisible();
});

test("an attachment that is not an image or a PDF is refused before uploading", async ({
  page,
  organization: _,
}) => {
  await open(page, "/help?new=true");
  const dialog = page.getByRole("dialog");
  await dialog.locator("#ticket-attachments").setInputFiles({
    name: "notas.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hola"),
  });
  await expect(
    dialog
      .getByRole("listitem")
      .getByText("Adjunta imágenes JPEG, PNG, GIF o WebP, o archivos PDF."),
  ).toBeVisible();
  // Screen readers hear it too: the list changes without moving focus.
  await expect(dialog.getByText(/^notas\.txt no se adjuntó\./)).toBeAttached();
});

test("feedback goes to the team without opening a ticket", async ({ page, organization: _ }) => {
  await open(page, "/help");
  await page.getByRole("button", { name: "Escribir opinión" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu opinión").fill("Me gustaría exportar los documentos a Excel.");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  await expect(dialog.getByText("Gracias por escribirnos")).toBeVisible();
});

test("a new ticket after one about an issuer starts without that issuer", async ({
  page,
  organization,
}) => {
  const legalName = `Anterior ${crypto.randomUUID().slice(0, 8)} SAS`;
  const issuerId = await createIssuer(organization, uniqueNit(), legalName);

  await open(page, `/help?new=true&issuerId=${issuerId}`);
  const issuer = page.getByRole("dialog").getByRole("combobox", { name: "Emisor (opcional)" });
  await expect(issuer).toContainText(legalName);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/help$/);

  await page.getByRole("button", { name: "Nuevo caso" }).click();
  await expect(issuer).toContainText("Ninguno en particular");
});

test("help from the assistant carries the issuer, and the team resolves the ticket", async ({
  page,
  context,
  organization,
}) => {
  const legalName = "PAVAJEAU MAX CARLOS ANDRES";
  // The issuer does not exist yet when the assistant opens: its first step creates it.
  await open(page, "/setup");
  await page.getByRole("button", { name: "Empezar" }).click();
  await fillIssuer(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByLabel("Software ID")).toBeVisible();

  await page.getByRole("button", { name: "Pedir ayuda" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("combobox", { name: "Emisor (opcional)" })).toContainText(
    legalName,
  );
  await dialog.getByLabel("Mensaje").fill("No encuentro el Software ID en el portal de la DIAN.");
  await dialog.getByText("Busco orientación").click();
  await dialog.getByRole("button", { name: "Enviar" }).click();
  const number = (await dialog.getByText(/Recibimos tu caso #\d+/).textContent())?.match(
    /\d+/,
  )?.[0];
  expect(number).toBeTruthy();

  const support = await createPlatformStaff("support");
  await signIn(context, support);
  await open(page, "/admin/support");
  await page.getByRole("link", { name: `#${number}` }).click();
  await expect(page.getByRole("heading", { name: `Caso #${number}` })).toBeVisible();
  await expect(page.getByText(`Emisor: ${legalName}`)).toBeVisible();
  await expect(page.getByText("Sin configurar")).toBeVisible();
  await expect(page.getByText("Dueño", { exact: true })).toBeVisible();

  await page.getByRole("combobox", { name: "Estado del caso" }).click();
  await page.getByRole("option", { name: "Resuelto" }).click();
  await expect(page.getByRole("combobox", { name: "Estado del caso" })).toContainText("Resuelto");

  await signIn(context, organization);
  await open(page, "/help");
  await expect(
    page.getByRole("region", { name: "Casos de la organización" }).getByText("Resuelto"),
  ).toBeVisible();
});
