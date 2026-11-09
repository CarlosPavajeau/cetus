import { type BrowserContext } from "@playwright/test";
import { type } from "arktype";

import { createTestApiKey } from "../support/issuers";
import { type TestOrganization, createOrganization } from "../support/organization";
import { createPlatformStaff } from "../support/platform-staff";
import { apiUrl, billingPool, consoleCookies } from "../support/stack";
import { expect, open, test } from "./fixtures";

async function signIn(context: BrowserContext, who: TestOrganization) {
  await context.clearCookies();
  await context.addCookies(consoleCookies(who.cookies));
}

test("an admin suspends an account: its keys stop and its console turns read-only", async ({
  page,
  context,
}) => {
  const name = `Morosa ${crypto.randomUUID().slice(0, 8)} SAS`;
  const customer = await createOrganization(name);
  const apiKey = await createTestApiKey(customer);
  const admin = await createPlatformStaff("admin");
  await signIn(context, admin);

  await open(page, "/admin/organizations");
  await expect(page.getByRole("navigation", { name: "Administración" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar organizaciones" }).fill(name);
  await page.keyboard.press("Enter");
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(customer.email)).toBeVisible();

  await page.getByRole("button", { name: "Suspender cuenta" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Suspender" }).click();
  await expect(dialog.getByText("Escribe el motivo")).toBeVisible();
  await dialog.getByLabel("Motivo").fill("Factura de octubre sin pagar");
  await dialog.getByRole("button", { name: "Suspender" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Suspendida", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivar cuenta" })).toBeVisible();

  const call = await fetch(`${apiUrl}/v1/invoices/${crypto.randomUUID()}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  expect(call.status).toBe(403);

  await page.getByRole("link", { name: "Ver el registro de auditoría de esta cuenta" }).click();
  const row = page.getByRole("row", { name: /Cuenta suspendida/ });
  await expect(row.getByText(admin.email)).toBeVisible();
  await expect(row.getByText("Motivo: Factura de octubre sin pagar")).toBeVisible();

  await signIn(context, customer);
  await open(page, "/activity");
  await expect(page.getByText("Tu cuenta está suspendida")).toBeVisible();
  await expect(
    page.getByText("Motivo: Factura de octubre sin pagar.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Cuenta suspendida/ }).getByText("Soporte de Cetus"),
  ).toBeVisible();
});

test("support reads accounts but cannot suspend them", async ({ page, context }) => {
  const name = `Consultada ${crypto.randomUUID().slice(0, 8)} SAS`;
  await createOrganization(name);
  await signIn(context, await createPlatformStaff("support"));

  await open(page, "/admin/organizations?q=" + encodeURIComponent(name));
  await page.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspender cuenta" })).toHaveCount(0);
});

test("staff without 2FA are sent to enable it, and customers never see the administration", async ({
  page,
  context,
}) => {
  await signIn(context, await createPlatformStaff("admin", { twoFactor: false }));
  await open(page, "/admin/organizations");
  await expect(page).toHaveURL(/\/settings\/security\?required=true/);
  await expect(page.getByText("Activa la verificación en dos pasos para continuar")).toBeVisible();

  await signIn(context, await createOrganization());
  await open(page, "/admin/organizations");
  await expect(page).not.toHaveURL(/\/admin/);
  await expect(page.getByRole("link", { name: "Administración" })).toHaveCount(0);
});

test("an admin queues a failed provider event again and it leaves the list", async ({
  page,
  context,
}) => {
  const error = `Resend no respondió ${crypto.randomUUID()}`;
  const pool = billingPool();
  try {
    const { rows } = await pool.query(
      `INSERT INTO billing.inbound_webhook_events (provider, event_id, event_type, payload, status, attempts, error)
       VALUES ('RESEND', $1, 'email.bounced', $2, 'FAILED', 5, $3) RETURNING id`,
      [crypto.randomUUID(), JSON.stringify({}), error],
    );
    const { id } = type({ id: "string" }).assert(rows[0]);
    await signIn(context, await createPlatformStaff("admin"));

    await open(page, "/admin/inbound-events");
    const row = page.getByRole("row").filter({ hasText: error });
    await expect(row.getByText("Resend · email.bounced")).toBeVisible();
    await row.getByRole("button", { name: "Volver a encolar" }).click();
    await expect(row).toHaveCount(0);

    const requeued = await pool.query(
      `SELECT status FROM billing.inbound_webhook_events WHERE id = $1`,
      [id],
    );
    expect(type({ status: "string" }).assert(requeued.rows[0]).status).not.toBe("FAILED");
  } finally {
    await pool.end();
  }
});

test("support sees failed provider events but cannot queue them again", async ({
  page,
  context,
}) => {
  await signIn(context, await createPlatformStaff("support"));
  await open(page, "/admin/inbound-events");
  await expect(page.getByRole("heading", { name: "Eventos fallidos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a encolar" })).toHaveCount(0);
});
