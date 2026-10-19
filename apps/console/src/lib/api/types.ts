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

export type DocumentType = Schemas["DocumentType"];

export type DocumentStatus = Schemas["DocumentStatus"];

export type DocumentSummary = Schemas["DocumentSummary"];

export type DocumentPage = Schemas["DocumentPage"];

export type DocumentDetail = Schemas["DocumentDetail"];

export type DocumentEvent = Schemas["DocumentEvent"];

export type Delivery = Schemas["DeliveryView"];

export type DocumentFile = "xml" | "pdf" | "attached-document";

/** Runtime lists for the document filters and their validators. Must list every value of the API enums. */
export const documentTypes = [
  "INVOICE",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
] as const satisfies readonly DocumentType[];

export const documentStatuses = [
  "RECEIVED",
  "PROCESSING",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "FAILED",
] as const satisfies readonly DocumentStatus[];

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
  "WEBHOOK_ENDPOINT_ENABLED",
  "WEBHOOK_DELIVERY_RETRIED",
  "CREDIT_NOTE_ISSUED",
] as const satisfies readonly AuditAction[];

// Fails to compile when the API adds an action that is missing above.
type MissingAuditActions = Exclude<AuditAction, (typeof auditActions)[number]>;
const _allAuditActionsListed: MissingAuditActions extends never ? true : MissingAuditActions = true;
void _allAuditActionsListed;

type MissingDocumentTypes = Exclude<DocumentType, (typeof documentTypes)[number]>;
const _allDocumentTypesListed: MissingDocumentTypes extends never ? true : MissingDocumentTypes =
  true;
void _allDocumentTypesListed;

type MissingDocumentStatuses = Exclude<DocumentStatus, (typeof documentStatuses)[number]>;
const _allDocumentStatusesListed: MissingDocumentStatuses extends never
  ? true
  : MissingDocumentStatuses = true;
void _allDocumentStatusesListed;
