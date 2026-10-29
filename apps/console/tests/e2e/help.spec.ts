import { expect, open, test } from "./fixtures";

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
  await expect(dialog.getByText("Elige la prioridad del caso.")).toBeVisible();

  await dialog.getByLabel("Mensaje").fill("La factura de prueba no llega al correo del cliente.");
  await dialog.getByText("Algo está bloqueado, pero sigo emitiendo").click();
  await dialog
    .locator("#ticket-attachments")
    .setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: png });
  await expect(dialog.getByRole("button", { name: "Quitar captura.png" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Enviar" }).click();

  await expect(dialog.getByText(/Recibimos tu caso #\d+/)).toBeVisible();
  await dialog.getByRole("button", { name: "Listo" }).click();
  const tickets = page.getByRole("region", { name: "Casos de la organización" });
  await expect(tickets.getByText("La factura de prueba no llega")).toBeVisible();
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
    dialog.getByText("Adjunta imágenes JPEG, PNG, GIF o WebP, o archivos PDF."),
  ).toBeVisible();
});

test("feedback goes to the team without opening a ticket", async ({ page, organization: _ }) => {
  await open(page, "/help");
  await page.getByRole("button", { name: "Escribir opinión" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tu opinión").fill("Me gustaría exportar los documentos a Excel.");
  await dialog.getByRole("button", { name: "Enviar" }).click();
  await expect(dialog.getByText("Gracias por escribirnos")).toBeVisible();
});
