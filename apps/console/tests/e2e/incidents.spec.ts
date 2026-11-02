import { type BrowserContext } from "@playwright/test";

import { type TestOrganization, createOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { consoleCookies } from "../support/stack";
import { expect, open, test } from "./fixtures";

async function signIn(context: BrowserContext, who: TestOrganization) {
  await context.clearCookies();
  await context.addCookies(consoleCookies(who.cookies));
}

test("an incident an admin publishes shows in every console until it is resolved", async ({
  page,
  context,
}) => {
  const title = `Cola lenta ${crypto.randomUUID().slice(0, 8)}`;
  const customer = await createOrganization();
  const admin = await createPlatformStaff("admin");
  await signIn(context, admin);

  await open(page, "/admin/incidents");
  await page.getByRole("button", { name: "Publicar incidente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox", { name: "Componente" }).click();
  await page.getByRole("option", { name: "Procesamiento de documentos" }).click();
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByLabel("Mensaje").fill("Los documentos tardan más de lo normal.");
  await dialog.getByRole("button", { name: "Publicar" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row.getByText("Abierto")).toBeVisible();

  await signIn(context, customer);
  await open(page, "/");
  const banner = page.getByRole("complementary", { name: "Incidentes" });
  await expect(banner.getByText(title)).toBeVisible();
  await expect(banner.getByRole("link", { name: "Ver estado" })).toHaveAttribute(
    "href",
    /\/estado$/,
  );

  await signIn(context, admin);
  await open(page, "/admin/incidents");
  await row.getByRole("button", { name: "Resolver" }).click();
  await expect(row.getByText(/Resuelto el/)).toBeVisible();

  await signIn(context, customer);
  await open(page, "/");
  await expect(page.getByText(title)).toBeHidden();
});
