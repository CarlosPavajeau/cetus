import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { type } from "arktype";

import { api } from "~/lib/api/client";
import type { Environment, Issuer } from "~/lib/api/types";
import { env } from "~/lib/env";

const cookieName = "cetus-environment";
const environment = type("'SANDBOX' | 'TEST' | 'LIVE'");

function remember(value: Environment) {
  setCookie(cookieName, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.BETTER_AUTH_URL.startsWith("https:"),
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Where the person last chose to work. The first time, the most real environment an issuer of theirs can
 * already issue in: a new organization starts in the sandbox, one that bills for real in production.
 */
export const getActiveEnvironment = createServerFn({ method: "GET" }).handler(
  async (): Promise<Environment> => {
    const stored = environment(getCookie(cookieName));
    if (!(stored instanceof type.errors)) {
      return stored;
    }
    const issuers: Issuer[] = await api.get("/console/issuers");
    const issuing = (wanted: Environment) =>
      issuers.some(
        (issuer) =>
          issuer.environment === wanted &&
          (issuer.status === "ENABLED" || (wanted === "TEST" && issuer.status === "TESTING")),
      );
    const initial = issuing("LIVE") ? "LIVE" : issuing("TEST") ? "TEST" : "SANDBOX";
    remember(initial);
    return initial;
  },
);

export const setActiveEnvironment = createServerFn({ method: "POST" })
  .validator(type({ environment }))
  .handler(({ data }) => {
    remember(data.environment);
    return data.environment;
  });
