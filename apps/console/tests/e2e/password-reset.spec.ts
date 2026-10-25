import { type } from "arktype";

import { latestEmailTo, linkUnder } from "../support/outbox";
import { expect, open, test } from "./fixtures";

const sessionUser = type({ user: { emailVerified: "boolean" } });

test("a forgotten password is changed from the emailed link, which works once", async ({
  page,
  browser,
  organization,
}) => {
  const visitor = await browser.newPage();
  await open(visitor, "/sign-in");
  await expect(visitor.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
  await open(visitor, "/forgot-password");
  await visitor.getByLabel("Correo electrónico").fill(organization.email);
  await visitor.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(visitor.getByText(`Si hay una cuenta con ${organization.email}`)).toBeVisible();

  const email = await latestEmailTo(organization.email);
  expect(email.subject).toBe("Recupera tu contraseña de Cetus");
  const link = linkUnder(email, "/api/auth/reset-password/");
  await open(visitor, link);
  await visitor.waitForURL("**/reset-password?token=*");

  const password = `nueva-${crypto.randomUUID().slice(0, 8)}-clave`;
  await visitor.getByLabel("Contraseña nueva").fill(password);
  await visitor.getByLabel("Confirmar contraseña").fill(password);
  await visitor.getByRole("button", { name: "Cambiar contraseña" }).click();
  await visitor.waitForURL("**/sign-in?reset=true");
  await expect(visitor.getByText("Contraseña cambiada")).toBeVisible();

  const notice = await latestEmailTo(organization.email);
  expect(notice.subject).toBe("Tu contraseña de Cetus cambió");

  // The session opened before the reset is closed.
  await open(page, "/overview");
  await expect(page).toHaveURL(/\/sign-in$/);

  await visitor.getByLabel("Correo electrónico").fill(organization.email);
  await visitor.getByRole("textbox", { name: "Contraseña" }).fill(organization.password);
  await visitor.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(visitor.getByText("El correo o la contraseña no coinciden")).toBeVisible();
  await visitor.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await visitor.getByRole("button", { name: "Iniciar sesión" }).click();
  await visitor.waitForURL("**/overview");
  // Following the emailed link confirmed the address.
  const session = await visitor.request.get("/api/auth/get-session");
  expect(sessionUser.assert(await session.json()).user.emailVerified).toBe(true);

  await open(visitor, link);
  await expect(visitor.getByText("El enlace venció o ya se usó")).toBeVisible();
  await visitor.close();
});

test("an address without an account gets the same answer and no email", async ({ page }) => {
  const address = `e2e-nadie-${crypto.randomUUID().slice(0, 8)}@cetus.test`;
  await open(page, "/forgot-password");
  await page.getByLabel("Correo electrónico").fill(address);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await expect(page.getByText(`Si hay una cuenta con ${address}`)).toBeVisible();
  await expect(latestEmailTo(address, 4)).rejects.toThrow(`No email to ${address}`);
});
