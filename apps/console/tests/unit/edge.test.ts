import { describe, expect, it } from "vite-plus/test";

import { comesThroughEdge, edgeSecretHeader } from "~/lib/edge";

const secret = "s".repeat(32);

function request(host: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://${host}/sign-in`, { headers: { host, ...headers } });
}

describe("comesThroughEdge", () => {
  it("lets everything through without a secret", () => {
    expect(comesThroughEdge(request("cetus.cantte.com"), undefined)).toBe(true);
  });

  it("accepts the public domain with the secret", () => {
    expect(
      comesThroughEdge(request("cetus.cantte.com", { [edgeSecretHeader]: secret }), secret),
    ).toBe(true);
  });

  it("refuses the public domain without the secret or with another one", () => {
    expect(comesThroughEdge(request("cetus.cantte.com"), secret)).toBe(false);
    expect(
      comesThroughEdge(request("cetus.cantte.com", { [edgeSecretHeader]: `${secret}x` }), secret),
    ).toBe(false);
    expect(
      comesThroughEdge(request("cetus.cantte.com", { [edgeSecretHeader]: "t".repeat(32) }), secret),
    ).toBe(false);
  });

  it("accepts the private network, Railway's health check and the machine itself", () => {
    for (const host of [
      "console.railway.internal:3000",
      "healthcheck.railway.app",
      "localhost:3000",
      "[::1]:3000",
    ]) {
      expect(comesThroughEdge(request(host), secret)).toBe(true);
    }
  });

  it("does not take a public host that only mentions a private one", () => {
    expect(comesThroughEdge(request("railway.internal.evil.com"), secret)).toBe(false);
  });
});
