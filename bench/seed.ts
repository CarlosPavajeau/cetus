// Creates the tenants the k6 scenarios run as, through the same HTTP endpoints as the console's tests,
// and writes them to bench/.state.json. Run it with `bench/bench.sh seed`, which points CONSOLE_URL and
// CETUS_API_URL at the benchmark stack before the helpers read them.
//
//   BENCH_ORGS (5)  organizations, each with one issuer (own NIT, so CUFEs never collide) and one API key.
import { writeFile } from "node:fs/promises";

import { createOrganization, type TestOrganization } from "../apps/console/tests/support/organization";
import {
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../apps/console/tests/support/issuers";
import { assertStackIsUp } from "../apps/console/tests/support/stack";

const organizations = Number(process.env.BENCH_ORGS ?? 5);
// Far more numbers than any run consumes; the cloned history (sql/clone-documents.sql) lives above it.
const rangeTo = 9_999_999;

/** Better Auth allows few sign-ups per window from one IP: wait for the next window instead of failing. */
async function withRetry<T>(what: string, action: () => Promise<T>, attempts = 6): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (attempts <= 1 || !String(error).includes("answered 429")) {
      throw error;
    }
    console.log(`  ${what}: rate limited, retrying in 11s`);
    await new Promise((resolve) => setTimeout(resolve, 11_000));
    return withRetry(what, action, attempts - 1);
  }
}

async function seedOrganization(index: number) {
  const name = `Bench ${index}`;
  const organization: TestOrganization = await withRetry(name, () => createOrganization(name));
  const nit = uniqueNit();
  const issuerId = await onboardIssuer(organization, nit, `${name} SAS`, { testSet: false, rangeTo });
  const apiKey = await createTestApiKey(organization);

  // One document through the whole pipeline proves the stack works and leaves a template to clone.
  const { id } = await issueInvoice(apiKey, issuerId, "Cliente de arranque");
  const status = await waitForStatus(organization, id);
  if (status !== "ACCEPTED") {
    throw new Error(`${name}: the warm-up invoice ended ${status}, check the worker and the DIAN mock`);
  }
  console.log(`  ${name}: issuer ${issuerId} (NIT ${nit}), warm-up invoice ACCEPTED`);
  return {
    name,
    email: organization.email,
    password: organization.password,
    cookies: organization.cookies,
    apiKey,
    issuerId,
    documentIds: [id],
  };
}

await assertStackIsUp();
console.log(`Seeding ${organizations} organizations`);
const seeded = [];
for (let index = 1; index <= organizations; index++) {
  seeded.push(await seedOrganization(index));
}
const path = new URL(".state.json", import.meta.url);
await writeFile(path, `${JSON.stringify({ createdAt: new Date().toISOString(), organizations: seeded }, null, 2)}\n`);
console.log(`Wrote ${path.pathname}`);
