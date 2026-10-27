import "@tanstack/react-start/server-only";
import { getRequestHeaders, getRequestIP } from "@tanstack/react-start/server";
import createClient from "openapi-fetch";

import { auth } from "../auth/server";
import { env } from "../env";
import type { components, paths } from "./schema";

type ProblemDetail = components["schemas"]["ProblemDetail"];

/** An RFC 9457 problem detail from the API; {@link code} is the stable value to branch on. */
export class CetusApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: ProblemDetail["errors"],
  ) {
    super(message);
  }
}

/**
 * Typed client for the Java API, used from the console server (BFF). The browser never sees this token:
 * it is minted per request from the Better Auth session cookie and lives for 5 minutes.
 * The end user's IP and user agent are forwarded for the audit log, since the API only sees this server.
 */
const client = createClient<paths>({ baseUrl: env.CETUS_API_URL });

client.use({
  async onRequest({ request }) {
    for (const [name, value] of Object.entries(await authHeaders())) {
      request.headers.set(name, value);
    }
    return request;
  },
});

type ApiResult = { data?: unknown; error?: unknown; response: Response };

/** The body type of the success branch of an openapi-fetch result. */
type SuccessData<R extends ApiResult> = Extract<R, { error?: never }>["data"];

/** Returns the response body, or throws {@link CetusApiError} with the API's error code and message. */
function unwrap<R extends ApiResult>(result: R): SuccessData<R> {
  const { response } = result;
  if (!response.ok) {
    const body = (
      typeof result.error === "object" && result.error !== null ? result.error : {}
    ) as Partial<ProblemDetail>;
    throw new CetusApiError(
      response.status,
      body.code ?? "error",
      body.detail ?? body.title ?? response.statusText,
      body.errors,
    );
  }
  return result.data;
}

/**
 * Wraps an openapi-fetch method so it resolves to the success body. The method's generics carry over,
 * so the path, params and body are still checked against the OpenAPI schema.
 */
function unwrapped<A extends unknown[], R extends ApiResult>(
  method: (...args: A) => Promise<R>,
): (...args: A) => Promise<SuccessData<R>> {
  return async (...args) => unwrap(await method(...args));
}

/** The API client: each method resolves to the response body or throws {@link CetusApiError}. */
export const api = {
  get: unwrapped(client.GET),
  post: unwrapped(client.POST),
  put: unwrapped(client.PUT),
  patch: unwrapped(client.PATCH),
  delete: unwrapped(client.DELETE),
};

const publicClient = createClient<paths>({ baseUrl: env.CETUS_API_URL });

publicClient.use({
  onRequest({ request }) {
    const headers = new Headers(getRequestHeaders());
    for (const [name, value] of Object.entries(clientOriginHeaders(headers))) {
      request.headers.set(name, value);
    }
    return request;
  },
});

/**
 * For the few console pages without a session, whose request carries its own credential (a one-time
 * certificate upload or contact verification link). Sends no token.
 */
export const publicApi = {
  get: unwrapped(publicClient.GET),
  put: unwrapped(publicClient.PUT),
  post: unwrapped(publicClient.POST),
};

async function authHeaders(): Promise<Record<string, string>> {
  const headers = new Headers(getRequestHeaders());
  const { token } = await auth.api.getToken({ headers });
  return { Authorization: `Bearer ${token}`, ...clientOriginHeaders(headers) };
}

/**
 * The IP comes from CF-Connecting-IP, which Cloudflare sets for every request it proxies. Not from
 * X-Forwarded-For: its first entry is whatever the browser sent, so anyone could pick the IP of the audit log.
 */
function clientOriginHeaders(headers: Headers): Record<string, string> {
  const origin: Record<string, string> = {};
  const ip = headers.get("cf-connecting-ip") ?? getRequestIP();
  const userAgent = headers.get("user-agent");
  if (ip) {
    origin["X-Cetus-Client-IP"] = ip;
  }
  if (userAgent) {
    origin["X-Cetus-Client-User-Agent"] = userAgent;
  }
  return origin;
}
