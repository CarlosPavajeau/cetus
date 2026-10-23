import { expect, open, test } from "./fixtures";

test("every category waits for the owner to confirm their address, and can point elsewhere", async ({
  page,
  organization,
}) => {
  await open(page, "/settings/contacts");
  await expect(page.getByText("Confirma tu correo para recibir los avisos")).toBeVisible();
  const fiscal = page.locator('[data-slot="card"]', { hasText: "Fiscal" });
  await expect(fiscal.getByText(organization.email)).toBeVisible();
  await expect(page.getByText("Pendiente de verificación")).toHaveCount(3);
  await expect(page.getByText("Verificado", { exact: true })).toHaveCount(0);

  await fiscal.getByRole("button", { name: "Cambiar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Correo").fill("no-es-un-correo");
  await dialog.getByRole("button", { name: "Enviar verificación" }).click();
  await expect(dialog.getByText("Escribe un correo válido")).toBeVisible();
  await dialog.getByLabel("Correo").fill("contador@cetus.test");
  await dialog.getByRole("button", { name: "Enviar verificación" }).click();

  await expect(fiscal.getByText("contador@cetus.test")).toBeVisible();
  await expect(fiscal.getByText(organization.email)).toBeHidden();

  // A second link to the same address right away is refused: one a minute.
  await fiscal.getByRole("button", { name: "Reenviar el enlace" }).click();
  await expect(fiscal.getByText("Espera un minuto")).toBeVisible();

  await fiscal.getByRole("button", { name: "Cancelar el cambio" }).click();
  await expect(fiscal.getByText("Pendiente de verificación")).toBeHidden();
  await expect(fiscal.getByText("Sin correo verificado")).toBeVisible();

  await open(page, "/activity");
  await expect(page.getByText("Cambio de contacto solicitado")).toBeVisible();
  await expect(page.getByText("Cambio de contacto cancelado")).toBeVisible();
});

test("an unknown verification link says it is no longer valid", async ({ page }) => {
  await open(page, `/contact-verification/${"a".repeat(43)}`);
  await expect(page.getByText("Enlace no válido")).toBeVisible();
});
