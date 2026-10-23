import { describe, expect, test } from "vite-plus/test";

import { consoleUrl } from "../support/stack";

// src/start.ts replaces Start's default CSRF check on server functions, so these tests make sure it is still
// there. The check runs before the function is looked up, so any path under /_serverFn/ is enough: a refused
// request answers 403, one that passes reaches the lookup instead.
const serverFn = `${consoleUrl}/_serverFn/csrf-probe`;

function call(headers: Record<string, string>) {
  return fetch(serverFn, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}

describe("CSRF on server functions", () => {
  test("refuses a call from another site", async () => {
    const response = await call({ Origin: "https://evil.test", "Sec-Fetch-Site": "cross-site" });

    expect(response.status).toBe(403);
  });

  test("refuses a call from another origin without Sec-Fetch-Site", async () => {
    const response = await call({ Origin: "https://evil.test" });

    expect(response.status).toBe(403);
  });

  test("lets a call from the console itself reach the function", async () => {
    const response = await call({
      Origin: new URL(consoleUrl).origin,
      "Sec-Fetch-Site": "same-origin",
    });

    expect(response.status).not.toBe(403);
  });
});
