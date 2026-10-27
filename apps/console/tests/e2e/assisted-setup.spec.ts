import { createIssuer, uniqueNit } from "../support/issuers";
import { createOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { consoleCookies, consoleUrl, testCertificate } from "../support/stack";
import { expect, open, test } from "./fixtures";

test("support sets up an issuer and the customer uploads the certificate through a one-time link", async ({
  page,
  context,
  browser,
}) => {
  const name = `Acompañada ${crypto.randomUUID().slice(0, 8)} SAS`;
  const customer = await createOrganization(name);
  await createIssuer(customer, uniqueNit(), "Emisor Acompañado SAS");
  const support = await createPlatformStaff("support");
  await context.addCookies(consoleCookies(support.cookies));

  await open(page, `/admin/organizations?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: "Emisor Acompañado SAS" }).click();
  await expect(page.getByRole("heading", { name: "Emisor Acompañado SAS" })).toBeVisible();

  await page.getByRole("button", { name: "Configurar software" }).click();
  const software = page.getByRole("dialog");
  const softwareId = crypto.randomUUID();
  await software.getByLabel("Software ID").fill(softwareId);
  await software.getByLabel("PIN del software").fill("12345");
  await software.getByRole("button", { name: "Guardar" }).click();
  await expect(software).toBeHidden();
  await expect(page.getByText(softwareId)).toBeVisible();

  await page.getByRole("button", { name: "Agregar rango" }).click();
  const range = page.getByRole("dialog");
  await range.getByLabel("Clave técnica").fill("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
  await range.getByRole("button", { name: "Agregar" }).click();
  await expect(range).toBeHidden();
  await expect(page.getByRole("cell", { name: /SETP990000000/ })).toBeVisible();

  await page.getByRole("button", { name: "Generar enlace de carga" }).click();
  const url = (await page.locator("code", { hasText: "/certificate-upload/" }).textContent()) ?? "";
  expect(url).toContain(`${consoleUrl}/certificate-upload/`);

  // Whoever has the link uploads the certificate, without an account.
  const visitor = await browser.newContext();
  const upload = await visitor.newPage();
  await open(upload, url);
  await expect(upload.getByRole("heading", { name: "Carga el certificado" })).toBeVisible();
  await expect(upload.getByText("Emisor Acompañado SAS")).toBeVisible();
  await upload.locator('input[type="file"]').setInputFiles(testCertificate.path);
  await upload.getByLabel("Contraseña del certificado").fill("no-es-la-clave");
  await upload.getByRole("button", { name: "Guardar certificado" }).click();
  await expect(upload.getByText("No pudimos abrir el certificado")).toBeVisible();
  await upload.getByLabel("Contraseña del certificado").fill(testCertificate.password);
  await upload.getByRole("button", { name: "Guardar certificado" }).click();
  await expect(upload.getByText("Certificado guardado")).toBeVisible();

  await open(upload, url);
  await expect(upload.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();
  await visitor.close();

  await page.reload();
  await expect(page.getByText("Sin certificado.")).toHaveCount(0);

  await context.clearCookies();
  await context.addCookies(consoleCookies(customer.cookies));
  await open(page, "/activity?action=CERTIFICATE_UPLOAD_LINK_CREATED");
  await expect(
    page.getByRole("row", { name: /Enlace de carga de certificado enviado/ }),
  ).toBeVisible();
  await open(page, "/activity?action=CERTIFICATE_UPLOADED");
  await expect(page.getByRole("row", { name: /Certificado cargado/ })).toContainText(
    "Enlace de carga",
  );
});
