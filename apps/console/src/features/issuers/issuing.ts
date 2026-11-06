import type { Environment, Issuer } from "~/lib/api/types";

/** What the API lets issue: an enabled issuer, or one in habilitación with the TEST environment. */
export function canIssue(issuer: Issuer, environment: Environment) {
  return (
    issuer.environment === environment &&
    (issuer.status === "ENABLED" || (environment === "TEST" && issuer.status === "TESTING"))
  );
}
