import "@tanstack/react-start/server-only";
import { getRequestHeaders, getRequestIP } from "@tanstack/react-start/server";
import { auth } from "../auth/server";
import { env } from "../env";

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
 * Calls the Java API from the console server (BFF). The browser never sees this token:
 * it is minted per request from the Better Auth session cookie and lives for 5 minutes.
 * The end user's IP and user agent are forwarded for the audit log, since the API only sees this server.
 */
export async function cetusApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(getRequestHeaders() as HeadersInit);
  const { token } = await auth.api.getToken({ headers });

  const response = await fetch(`${env.CETUS_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...clientOriginHeaders(headers),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new CetusApiError(response.status, body.code ?? "error", body.message ?? response.statusText);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
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
