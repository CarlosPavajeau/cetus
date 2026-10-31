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
 * endpoint starts one without a payment, so this writes straight to the "billing" schema the local stack uses,
 * as the API's own Postgres user: the console's only reaches "auth".
 */
export async function subscribe(organization: TestOrganization, planCode: string) {
  const account = type({ id: "string" }).assert(
    await (await organization.api("/console/account")).json(),
  );
  const connectionString = process.env.CETUS_TEST_BILLING_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set CETUS_TEST_BILLING_DATABASE_URL in apps/console/.env (see .env.example)");
  }
  const pool = new Pool({ connectionString });
  try {
    // The ids come first: a statement's own CTEs never see each other's rows, so the period is inserted with
    // its lot's id instead of being updated afterwards.
    const started = await pool.query(
      `WITH version AS (
         SELECT v.id, v.price_cents, v.documents_included FROM billing.plan_versions v
         JOIN billing.plans p ON p.id = v.plan_id
         WHERE p.code = $2 AND v.account_id IS NULL AND v.valid_from <= now()
           AND (v.valid_to IS NULL OR v.valid_to > now())
       ), ids AS (
         SELECT uuidv7() AS subscription_id, uuidv7() AS period_id, uuidv7() AS grant_id
       ), subscription AS (
         INSERT INTO billing.subscriptions (id, account_id, plan_version_id, status, overage_limit_cents, started_at)
         SELECT ids.subscription_id, $1, version.id, 'ACTIVE', version.price_cents * 3, now() FROM ids, version
       ), lot AS (
         INSERT INTO billing.credit_grants (id, account_id, plan_version_id, source_type, source_id, quantity,
                                            remaining, expires_at, status)
         SELECT ids.grant_id, $1, version.id, 'SUBSCRIPTION_PERIOD', ids.period_id, version.documents_included,
                version.documents_included, now() + interval '1 month' + interval '60 days', 'ACTIVE'
         FROM ids, version
       ), movement AS (
         INSERT INTO billing.credit_movements (account_id, grant_id, type, quantity, actor_type)
         SELECT $1, ids.grant_id, 'GRANT', version.documents_included, 'SYSTEM' FROM ids, version
       )
       INSERT INTO billing.subscription_periods (id, subscription_id, number, plan_version_id, starts_at, ends_at,
                                                 status, grant_id)
       SELECT ids.period_id, ids.subscription_id, 1, version.id, now(), now() + interval '1 month', 'OPEN',
              ids.grant_id
       FROM ids, version`,
      [account.id, planCode],
    );
    if (started.rowCount !== 1) {
      throw new Error(`The catalog has no public version of ${planCode} in force`);
    }
  } finally {
    await pool.end();
  }
}
