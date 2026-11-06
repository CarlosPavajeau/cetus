import type { Page } from "@playwright/test";

import { forgetLastOrganization, inviteMember } from "../support/organization";
import { expect, open, test } from "./fixtures";

async function signIn(page: Page, email: string, password: string) {
  await open(page, "/sign-in");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("textbox", { name: "Contraseña" }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

test("a new session starts in the organization the person last worked in", async ({
  browser,
  organization: owner,
}) => {
  const { person } = await inviteMember(owner, "member");

  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await signIn(page, person.email, person.password);
  await page.waitForURL("**/overview");
  await expect(page.getByRole("button", { name: /Pruebas SAS/ })).toBeVisible();
  await visitor.close();
});

test("with several organizations and none to return to, the person picks one", async ({
  browser,
  organization: owner,
}) => {
  const { person } = await inviteMember(owner, "member");
  await forgetLastOrganization(person.email);

  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  await signIn(page, person.email, person.password);
  await page.waitForURL("**/organizations");
  await expect(page.getByText("Entra a una de tus organizaciones.")).toBeVisible();
  await page.getByRole("button", { name: "Entrar a Colega SAS" }).click();
  await page.waitForURL("**/overview");
  await expect(page.getByRole("button", { name: /Colega SAS/ })).toBeVisible();

  // The choice is remembered for the next session.
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/sign-in");
  await signIn(page, person.email, person.password);
  await page.waitForURL("**/overview");
  await expect(page.getByRole("button", { name: /Colega SAS/ })).toBeVisible();
  await visitor.close();
});
