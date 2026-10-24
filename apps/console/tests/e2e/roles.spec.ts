import type { Page } from "@playwright/test";

import { onboardIssuer, uniqueNit } from "../support/issuers";
import { type TestOrganization, inviteMember, setMemberRole } from "../support/organization";
import { consoleUrl } from "../support/stack";
import { expect, open, test } from "./fixtures";

async function signInAs(page: Page, person: TestOrganization) {
  await page.context().clearCookies();
  await page.context().addCookies(person.cookies.map((cookie) => ({ ...cookie, url: consoleUrl })));
}

test("a plain member reads the keys, webhooks and issuers but changes none", async ({
  page,
  organization: owner,
}) => {
  const issuerId = await onboardIssuer(owner, uniqueNit(), "Roles SAS", { testSet: false });
  const { person: member, memberId } = await inviteMember(owner, "member");
  await signInAs(page, member);

  await open(page, "/developers/api-keys");
  await expect(page.getByText("Solo lectura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear llave" })).toHaveCount(0);

  await open(page, "/developers/webhooks");
  await expect(page.getByText("Solo lectura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar webhook" })).toHaveCount(0);

  await open(page, "/issuers");
  await expect(page.getByText("Solo lectura")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nuevo emisor" })).toHaveCount(0);
  await open(page, `/issuers/${issuerId}`);
  await expect(page.getByRole("heading", { name: "Roles SAS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pasar a producción" })).toHaveCount(0);
  await open(page, "/setup");
  await expect(page).toHaveURL(/\/issuers$/);

  // Made an admin, the next page shows the changes again.
  await setMemberRole(owner, memberId, "admin");
  await open(page, "/developers/api-keys");
  await expect(page.getByText("Solo lectura")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Crear llave" }).first()).toBeVisible();
  await open(page, `/issuers/${issuerId}`);
  await expect(page.getByRole("button", { name: "Editar" })).toBeVisible();
});
