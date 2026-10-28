// Creates the tenants the k6 scenarios run as, through the same HTTP endpoints as the console's tests,
// and writes them to bench/.state.json. Run it with `bench/bench.sh seed`, which points CONSOLE_URL and
// CETUS_API_URL at the benchmark stack before the helpers read them.
//
//   BENCH_ORGS (5)  organizations, each with one issuer (own NIT, so CUFEs never collide) and one API key.
import { writeFile } from "node:fs/promises";

import {
  createTestApiKey,
  issueInvoice,
  onboardIssuer,
  uniqueNit,
  waitForStatus,
} from "../apps/console/tests/support/issuers";
import {
  createOrganization,
  type TestOrganization,
} from "../apps/console/tests/support/organization";
import { assertStackIsUp } from "../apps/console/tests/support/stack";

const fetchOriginal = globalThis.fetch;
let clientIp = "198.18.0.1";
if (process.env.BENCH_CLIENT_IPS === "1") {
  globalThis.fetch = (input, init) => {
    const target = new URL(input instanceof Request ? input.url : input);
    if (target.origin !== "http://localhost:3100") return fetchOriginal(input, init);
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.set("CF-Connecting-IP", clientIp);
    return fetchOriginal(input, { ...init, headers });
  };
}

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
  clientIp = `198.18.${Math.floor(index / 250)}.${(index % 250) + 1}`;
  const name = `Bench ${index}`;
  const organization: TestOrganization = await withRetry(name, () => createOrganization(name));
  const nit = uniqueNit();
  const issuerId = await onboardIssuer(organization, nit, `${name} SAS`, {
    testSet: false,
    rangeTo,
  });
  const apiKey = await createTestApiKey(organization);
  if (process.env.BENCH_WEBHOOKS === "1") {
    const response = await organization.api("/console/webhook-endpoints", {
      method: "POST",
      body: JSON.stringify({
        url: `http://webhook-receiver:8192/${index}`,
        environment: "TEST",
        eventTypes: ["invoice.accepted"],
      }),
    });
    if (!response.ok) throw new Error(`Creating benchmark webhook answered ${response.status}`);
    await response.body?.cancel();
  }

  // One document through the whole pipeline proves the stack works and leaves a template to clone.
  const { id } = await issueInvoice(apiKey, issuerId, "Cliente de arranque");
  const status = await waitForStatus(organization, id);
  if (status !== "ACCEPTED") {
    throw new Error(
      `${name}: the warm-up invoice ended ${status}, check the worker and the DIAN mock`,
    );
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
await writeFile(
  path,
  `${JSON.stringify({ createdAt: new Date().toISOString(), seed: { webhooks: process.env.BENCH_WEBHOOKS === "1", clientIps: process.env.BENCH_CLIENT_IPS === "1" }, organizations: seeded }, null, 2)}\n`,
);
console.log(`Wrote ${path.pathname}`);
