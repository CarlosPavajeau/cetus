import "@tanstack/react-start/server-only";
import { getRequestHeaders, getRequestIP } from "@tanstack/react-start/server";
import createClient from "openapi-fetch";

import { auth } from "../auth/server";
import { env } from "../env";
import type { paths } from "./schema";

export class CetusApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Typed client for the Java API, used from the console server (BFF). The browser never sees this token:
 * it is minted per request from the Better Auth session cookie and lives for 5 minutes.
 * The end user's IP and user agent are forwarded for the audit log, since the API only sees this server.
 */
export const api = createClient<paths>({ baseUrl: env.CETUS_API_URL });

api.use({
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
export function unwrap<R extends ApiResult>(result: R): SuccessData<R> {
  const { response } = result;
  if (!response.ok) {
    const body = (
      typeof result.error === "object" && result.error !== null ? result.error : {}
    ) as {
      code?: string;
      message?: string;
    };
    throw new CetusApiError(
      response.status,
      body.code ?? "error",
      body.message ?? response.statusText,
    );
  }
  return result.data as SuccessData<R>;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers = new Headers(getRequestHeaders() as HeadersInit);
  const { token } = await auth.api.getToken({ headers });
  return { Authorization: `Bearer ${token}`, ...clientOriginHeaders(headers) };
}

function clientOriginHeaders(headers: Headers): Record<string, string> {
  const origin: Record<string, string> = {};
  const ip = getRequestIP({ xForwardedFor: true });
  const userAgent = headers.get("user-agent");
  if (ip) {
    origin["X-Cetus-Client-IP"] = ip;
  }
  if (userAgent) {
    origin["X-Cetus-Client-User-Agent"] = userAgent;
  }
  return origin;
}
