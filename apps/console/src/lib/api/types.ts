// Aliases over the types generated from the API's OpenAPI spec (`pnpm api:types`). Do not write contract types here.
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Environment = Schemas["Environment"];

export type Account = Schemas["AccountView"];

export type ApiKey = Schemas["ApiKeyView"];

export type ApiKeyDetail = Schemas["ApiKeyDetail"];

export type ApiKeyRequest = Schemas["ApiKeyRequestEntry"];

export type CreatedApiKey = Schemas["CreatedApiKey"];

export type Issuer = Schemas["IssuerView"];

export type IssuerDetail = Schemas["IssuerDetailView"];

export type NumberingRange = Schemas["NumberingRangeView"];

export type TestSetProgress = Schemas["TestSetProgressView"];

export type AuditAction = Schemas["AuditAction"];

export type AuditEntry = Schemas["AuditEntry"];

export type AuditPage = Schemas["AuditPage"];

/** Runtime list of audit actions for the filter and its validator. Must list every value of the API enum. */
export const auditActions = [
  "ACCOUNT_CREATED",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "ISSUER_CREATED",
  "ISSUER_UPDATED",
  "SOFTWARE_CREDENTIALS_SET",
  "CERTIFICATE_UPLOADED",
  "NUMBERING_RANGE_ADDED",
  "ISSUER_STATUS_CHANGED",
  "ISSUER_PROMOTED",
  "WEBHOOK_ENDPOINT_CREATED",
  "WEBHOOK_ENDPOINT_DISABLED",
  "WEBHOOK_DELIVERY_RETRIED",
] as const satisfies readonly AuditAction[];

// Fails to compile when the API adds an action that is missing above.
type MissingAuditActions = Exclude<AuditAction, (typeof auditActions)[number]>;
const _allAuditActionsListed: MissingAuditActions extends never ? true : MissingAuditActions = true;
void _allAuditActionsListed;
