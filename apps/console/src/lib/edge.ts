/** Cloudflare adds it to every request it proxies (a Transform Rule), with the value of CETUS_EDGE_SECRET. */
export const edgeSecretHeader = "x-cetus-edge-secret";

/**
 * Hosts that never pass through Cloudflare: Railway's private network (the API reads the JWKS there), its health
 * check and the machine itself. Railway's edge routes by Host, so a public request cannot carry one of them.
 */
const directHosts = new Set(["localhost", "127.0.0.1", "[::1]", "healthcheck.railway.app"]);

/**
 * Railway's edge also answers for cetus.cantte.com when reached directly, so without this anyone could skip
 * Cloudflare and send the CF-Connecting-IP they like (to the rate limit and the audit log). Without a secret
 * in development and tests every request is let through. Production public requests require a secret.
 */
export function comesThroughEdge(
  request: Request,
  secret: string | undefined,
  production = false,
): boolean {
  if (!secret && !production) {
    return true;
  }
  const host = hostname(request.headers.get("host"));
  if (host.endsWith(".railway.internal") || directHosts.has(host)) {
    return true;
  }
  if (!secret || secret.length < 32) {
    return false;
  }
  return sameSecret(request.headers.get(edgeSecretHeader) ?? "", secret);
}

/** The Host header without its port; IPv6 literals keep their brackets. */
function hostname(header: string | null): string {
  const value = (header ?? "").trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end < 0 ? value : value.slice(0, end + 1);
  }
  const colon = value.indexOf(":");
  return colon < 0 ? value : value.slice(0, colon);
}

/** Compares without stopping at the first difference, so the time taken says nothing about the secret. */
function sameSecret(given: string, expected: string): boolean {
  let diff = given.length ^ expected.length;
  for (let i = 0; i < expected.length; i++) {
    diff |= (given.charCodeAt(i) || 0) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
