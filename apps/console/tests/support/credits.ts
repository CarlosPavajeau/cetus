import { type } from "arktype";
import { config } from "dotenv";
import { Pool } from "pg";

import type { TestOrganization } from "./organization";
import { createPlatformStaff } from "./platform-staff";

config({ quiet: true });

let admin: ReturnType<typeof createPlatformStaff> | undefined;

/**
 * Gives the organization's account the package that production needs, as the Cetus team grants a courtesy
 * lot: CONTADOR, 3000 documents and three production issuers, for a month.
 */
export async function grantPackage(organization: TestOrganization) {
  admin ??= createPlatformStaff("admin");
  const staff = await admin;
  const account = type({ id: "string" }).assert(
    await (await organization.api("/console/account")).json(),
  );
  const plans = type({ code: "string", version: type({ id: "string" }).or("null") })
    .array()
    .assert(await (await organization.api("/console/plans")).json());
  const contador = plans.find((plan) => plan.code === "CONTADOR")?.version;
  if (contador === undefined || contador === null) {
    throw new Error("The catalog has no CONTADOR package");
  }
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const granted = await staff.api(`/admin/accounts/${account.id}/credits/grants`, {
    method: "POST",
    body: JSON.stringify({
      planVersionId: contador.id,
      quantity: 3000,
      expiresAt,
      reason: "Paquete de las pruebas e2e",
    }),
  });
  if (!granted.ok) {
    throw new Error(`Granting the package answered ${granted.status}: ${await granted.text()}`);
  }
}

/**
 * Starts a subscription of the organization's account to the plan's current public version, as the worker does
 * once its first order is paid: an active subscription, its first period from now and the period's lot. No
 * endpoint starts one without a payment, so this writes straight to the database the local stack uses.
 */
export async function subscribe(organization: TestOrganization, planCode: string) {
  const account = type({ id: "string" }).assert(
    await (await organization.api("/console/account")).json(),
  );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      `WITH version AS (
         SELECT v.id, v.price_cents, v.documents_included FROM billing.plan_versions v
         JOIN billing.plans p ON p.id = v.plan_id
         WHERE p.code = $2 AND v.account_id IS NULL AND v.valid_from <= now()
           AND (v.valid_to IS NULL OR v.valid_to > now())
       ), subscription AS (
         INSERT INTO billing.subscriptions (account_id, plan_version_id, status, overage_limit_cents, started_at)
         SELECT $1, id, 'ACTIVE', price_cents * 3, now() FROM version
         RETURNING id
       ), period AS (
         INSERT INTO billing.subscription_periods (subscription_id, number, plan_version_id, starts_at, ends_at, status)
         SELECT subscription.id, 1, version.id, now(), now() + interval '1 month', 'OPEN' FROM subscription, version
         RETURNING id, plan_version_id, ends_at
       ), lot AS (
         INSERT INTO billing.credit_grants (account_id, plan_version_id, source_type, source_id, quantity, remaining,
                                            expires_at, status)
         SELECT $1, period.plan_version_id, 'SUBSCRIPTION_PERIOD', period.id, version.documents_included,
                version.documents_included, period.ends_at + interval '60 days', 'ACTIVE'
         FROM period, version
         RETURNING id, quantity
       ), movement AS (
         INSERT INTO billing.credit_movements (account_id, grant_id, type, quantity, actor_type)
         SELECT $1, lot.id, 'GRANT', lot.quantity, 'SYSTEM' FROM lot
       )
       UPDATE billing.subscription_periods SET grant_id = lot.id FROM lot, period
       WHERE subscription_periods.id = period.id`,
      [account.id, planCode],
    );
  } finally {
    await pool.end();
  }
}
