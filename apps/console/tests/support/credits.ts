import { type } from "arktype";

import type { TestOrganization } from "./organization";
import { createPlatformStaff } from "./platform-staff";

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
