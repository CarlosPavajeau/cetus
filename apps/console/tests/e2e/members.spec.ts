import { type } from "arktype";

import { ageInvitation, invitationExpiry } from "../support/invitations";
import { addRange, onboardIssuer, uniqueNit } from "../support/issuers";
import { createOrganization } from "../support/organization";
import { enableTwoFactor, totp } from "../support/platform-staff";
import { consoleUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

test("a biller is invited by link, issues in production and is removed", async ({
  page,
  browser,
  organization: owner,
}) => {
  // A production issuer makes LIVE the starting environment of whoever joins.
  const testIssuerId = await onboardIssuer(owner, uniqueNit(), "Facturas SAS", { testSet: false });
  const promoted = await owner.api(`/console/issuers/${testIssuerId}/promote`, { method: "POST" });
  expect(promoted.status).toBe(200);
  const { id: liveIssuerId } = type({ id: "string" }).assert(await promoted.json());
  await addRange(owner, liveIssuerId, "FE");

  const email = `e2e-biller-${crypto.randomUUID().slice(0, 8)}@cetus.test`;
  await open(page, "/settings/members");
  await expect(page.getByRole("cell", { name: /\(tú\)/ })).toBeVisible();
  await page.getByRole("button", { name: "Invitar" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Correo").fill(email);
  await dialog.getByRole("button", { name: "Crear invitación" }).click();
  // Without a Resend key the local stack writes the email to its log, so it counts as sent.
  await expect(dialog.getByRole("heading", { name: "Invitación enviada" })).toBeVisible();
  const url = (await dialog.locator("code", { hasText: "/invitations/" }).textContent()) ?? "";
  expect(url).toContain(`${consoleUrl}/invitations/`);
  await dialog.getByRole("button", { name: "Listo" }).click();
  const pending = page.getByRole("region", { name: "Invitaciones pendientes" });
  await expect(pending.getByRole("cell", { name: email, exact: true })).toBeVisible();
  await expect(pending.getByRole("cell", { name: "Facturador" })).toBeVisible();
  // It was just sent: sending it again waits a minute.
  await pending.getByRole("button", { name: "Reenviar" }).click();
  await expect(pending.getByText("Espera un minuto antes de reenviarla")).toBeVisible();
  // A minute later it goes out again: the same invitation, valid for another 48 hours.
  const invitationId = new URL(url).pathname.split("/").pop() ?? "";
  const aged = await ageInvitation(invitationId, 61);
  await pending.getByRole("button", { name: "Reenviar" }).click();
  await expect(pending.getByText("Invitación reenviada.")).toBeVisible();
  expect((await invitationExpiry(invitationId)).getTime()).toBeGreaterThan(aged.getTime());
  await expect(pending.getByRole("row")).toHaveCount(2);
  await pending.getByRole("button", { name: "Reenviar" }).click();
  await expect(pending.getByText("Espera un minuto antes de reenviarla")).toBeVisible();

  // The invited person creates their account from the link and lands in the owner's organization.
  const visitor = await browser.newContext();
  const invited = await visitor.newPage();
  await open(invited, url);
  await expect(invited.getByRole("heading", { name: "Te invitaron a Cetus" })).toBeVisible();
  await invited.getByRole("button", { name: "Crear cuenta" }).click();
  await invited.getByLabel("Nombre completo").fill("Persona Facturadora");
  await invited.getByLabel("Correo electrónico").fill(email);
  await invited.getByLabel("Contraseña", { exact: true }).fill("clave-facturadora-segura");
  await invited.getByLabel("Confirmar contraseña").fill("clave-facturadora-segura");
  await invited.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(invited).toHaveURL(/\/overview$/);
  await expect(invited.getByRole("heading", { name: "Pruebas SAS" })).toBeVisible();

  await open(invited, "/documents/new");
  await expect(invited.getByRole("combobox", { name: "Ambiente" })).toHaveText(/Producción/);
  await expect(invited.getByRole("button", { name: "Emitir factura" })).toBeEnabled();
  await open(invited, "/developers/api-keys");
  await expect(invited.getByText("Solo lectura")).toBeVisible();

  // Made a plain member, they no longer issue in production.
  await open(page, "/settings/members");
  await expect(pending).toHaveCount(0);
  await page.getByRole("combobox", { name: "Rol de Persona Facturadora" }).click();
  await page.getByRole("option", { name: "Miembro" }).click();
  await expect(page.getByRole("combobox", { name: "Rol de Persona Facturadora" })).toHaveText(
    "Miembro",
  );
  await open(invited, "/documents/new");
  await expect(invited.getByRole("button", { name: "Emitir factura" })).toBeDisabled();
  await open(invited, "/settings/members");
  await expect(invited.getByText("Solo lectura")).toBeVisible();
  await expect(invited.getByRole("button", { name: "Invitar" })).toHaveCount(0);

  await page
    .getByRole("row", { name: /Persona Facturadora/ })
    .getByRole("button", { name: "Quitar" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByRole("cell", { name: "Persona Facturadora" })).toHaveCount(0);
  await visitor.close();
});

test("an invitation only opens for its address", async ({ page, browser, organization: owner }) => {
  const invitation = await owner.auth<{ id: string }>("/organization/invite-member", {
    email: `e2e-otro-${crypto.randomUUID().slice(0, 8)}@cetus.test`,
    role: "member",
  });

  // Someone else, signed in with another address, cannot use it.
  await open(page, `/invitations/${invitation.id}`);
  await expect(page.getByRole("heading", { name: "Invitación no válida" })).toBeVisible();
  await expect(page.getByText("Esta invitación es para otro correo")).toBeVisible();

  const visitor = await browser.newContext();
  const anonymous = await visitor.newPage();
  await open(anonymous, `/invitations/${invitation.id}`);
  await expect(anonymous.getByRole("button", { name: "Ya tengo cuenta" })).toBeVisible();
  await visitor.close();
});

test("the members page renders on the server with a pending invitation", async ({
  page,
  organization: owner,
}) => {
  const email = `e2e-pendiente-${crypto.randomUUID().slice(0, 8)}@cetus.test`;
  await owner.auth("/organization/invite-member", { email, role: "member" });

  // React falls back to rendering in the browser when the server fails, so read what the server sent:
  // the row's copy button, which the serialized loader data does not hold.
  const html = await (await page.request.get("/settings/members")).text();
  expect(html).toContain(`Copiar enlace de ${email}`);

  await open(page, "/settings/members");
  const pending = page.getByRole("region", { name: "Invitaciones pendientes" });
  await expect(pending.getByRole("cell", { name: email, exact: true })).toBeVisible();
  await expect(pending.getByRole("button", { name: `Copiar enlace de ${email}` })).toBeVisible();
});

test("someone with 2FA comes back to the invitation after the second step", async ({
  browser,
  organization: owner,
}) => {
  const invited = await createOrganization("Con 2FA SAS");
  const secret = await enableTwoFactor(invited);
  const invitation = await owner.auth<{ id: string }>("/organization/invite-member", {
    email: invited.email,
    role: "member",
  });

  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await open(page, `/invitations/${invitation.id}`);
  await page.getByRole("button", { name: "Ya tengo cuenta" }).click();
  await page.getByLabel("Correo electrónico").fill(invited.email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(invited.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/two-factor**");
  await page.getByLabel("Código de verificación").fill(totp(secret));
  await page.getByRole("button", { name: "Verificar", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/invitations/${invitation.id}$`));
  await expect(page.getByRole("heading", { name: "Únete a Pruebas SAS" })).toBeVisible();
  await visitor.close();
});
