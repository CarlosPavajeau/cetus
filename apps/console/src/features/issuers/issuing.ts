import type { Environment, Issuer } from "~/lib/api/types";

/** Whether the API takes the issuer's documents in the environment, by the API's own rule. */
export function canIssue(issuer: Issuer, environment: Environment) {
  return issuer.environment === environment && issuer.canIssue;
}
