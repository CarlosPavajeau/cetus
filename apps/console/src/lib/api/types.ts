// Aliases over the types generated from the API's OpenAPI spec (`pnpm api:types`). Do not write contract types here.
import type { components } from "./schema";

type Schemas = components["schemas"];

export type Environment = Schemas["Environment"];

/** The environments that talk to the DIAN: the setup assistant only prepares issuers for these. */
export type DianEnvironment = Exclude<Environment, "SANDBOX">;

export type Account = Schemas["AccountView"];

export type AccountStatus = Schemas["AccountStatus"];

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

export type InvoiceRequest = Schemas["InvoiceRequest"];

export type InvoiceLine = Schemas["Line"];

export type LineTax = Schemas["LineTax"];

export type IdentificationType = Schemas["IdentificationType"];

export type PersonType = Schemas["PersonType"];

export type CreditNoteConcept = Schemas["CreditNoteConcept"];

export type DebitNoteConcept = Schemas["DebitNoteConcept"];

export type DocumentPreview = Schemas["DocumentPreview"];

export type IssuedDocument = Schemas["IssuedDocument"];

export type Customer = Schemas["CustomerView"];

export type CustomerPage = Schemas["CustomerPage"];

export type Product = Schemas["ProductView"];

export type ProductPage = Schemas["ProductPage"];

export type ProductRequest = Schemas["ProductRequest"];

export type DocumentFile = "xml" | "pdf" | "attached-document";

/** Runtime list for the environment filters. Must list every value of the API enum. */
export const environments = ["SANDBOX", "TEST", "LIVE"] as const satisfies readonly Environment[];

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

export type WebhookEndpoint = Schemas["WebhookEndpointView"];

export type CreatedWebhookEndpoint = Schemas["CreatedWebhookEndpoint"];

export type WebhookDelivery = Schemas["WebhookDeliveryView"];

export type WebhookDeliveryPage = Schemas["WebhookDeliveryPage"];

export type AuditAction = Schemas["AuditAction"];

export type AuditEntry = Schemas["AuditEntry"];

export type AuditPage = Schemas["AuditPage"];

export type AdminAccountSummary = Schemas["AccountSummaryView"];

export type AdminAccountPage = Schemas["AccountPage"];

export type AdminAccountDetail = Schemas["AccountDetailView"];

export type AdminAuditEntry = Schemas["AdminAuditEntry"];

export type AdminAuditPage = Schemas["AdminAuditPage"];

export type Plan = Schemas["PlanView"];

export type PeriodUsage = Schemas["PeriodUsageView"];

export type Usage = Schemas["UsageView"];

export type CertificateUploadLink = Schemas["UploadLinkView"];

export type SupportTicket = Schemas["SupportTicketView"];

export type SupportTicketPage = Schemas["SupportTicketPage"];

export type SupportTicketPriority = Schemas["SupportTicketPriority"];

export type SupportTicketStatus = Schemas["SupportTicketStatus"];

export type SupportAttachment = Schemas["AttachmentView"];

export type AdminSupportTicketSummary = Schemas["AdminTicketSummaryView"];

export type AdminSupportTicketPage = Schemas["AdminTicketPage"];

export type AdminSupportTicketDetail = Schemas["AdminTicketDetailView"];

export type AdminFeedback = Schemas["FeedbackView"];

export type AdminFeedbackPage = Schemas["FeedbackPage"];

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
  "TECHNICAL_KEY_REQUESTED_FROM_DIAN",
  "ISSUER_STATUS_CHANGED",
  "ISSUER_PROMOTED",
  "WEBHOOK_ENDPOINT_CREATED",
  "WEBHOOK_ENDPOINT_DISABLED",
  "WEBHOOK_ENDPOINT_ENABLED",
  "WEBHOOK_DELIVERY_RETRIED",
  "INVOICE_ISSUED",
  "CREDIT_NOTE_ISSUED",
  "DEBIT_NOTE_ISSUED",
  "DOCUMENT_RESENT",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_REACTIVATED",
  "ACCOUNT_PLAN_CHANGED",
  "USER_BANNED",
  "USER_UNBANNED",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_ENDED",
  "CERTIFICATE_UPLOAD_LINK_CREATED",
  "CONTACT_CHANGE_REQUESTED",
  "CONTACT_CHANGE_CANCELED",
  "CONTACT_VERIFIED",
  "SUPPORT_TICKET_CREATED",
  "SUPPORT_TICKET_STATUS_CHANGED",
  "PLAN_CREATED",
  "PLAN_VERSION_ADDED",
  "BILLING_PROFILE_UPDATED",
  "BILLING_ORDER_CREATED",
  "BILLING_ORDER_PAID",
  "CREDITS_GRANTED",
  "CREDITS_ADJUSTED",
  "DOCUMENT_CREDIT_RELEASED",
] as const satisfies readonly AuditAction[];

/** Actions on a person or on the plan catalog rather than an account: only the administration's log has them. */
export const userAuditActions = [
  "USER_BANNED",
  "USER_UNBANNED",
  "PLAN_CREATED",
] as const satisfies readonly AuditAction[];

// Fails to compile when the API adds an action that is missing above.
type MissingAuditActions = Exclude<AuditAction, (typeof auditActions)[number]>;
const _allAuditActionsListed: MissingAuditActions extends never ? true : MissingAuditActions = true;
void _allAuditActionsListed;

type MissingEnvironments = Exclude<Environment, (typeof environments)[number]>;
const _allEnvironmentsListed: MissingEnvironments extends never ? true : MissingEnvironments = true;
void _allEnvironmentsListed;

type MissingDocumentTypes = Exclude<DocumentType, (typeof documentTypes)[number]>;
const _allDocumentTypesListed: MissingDocumentTypes extends never ? true : MissingDocumentTypes =
  true;
void _allDocumentTypesListed;

type MissingDocumentStatuses = Exclude<DocumentStatus, (typeof documentStatuses)[number]>;
const _allDocumentStatusesListed: MissingDocumentStatuses extends never
  ? true
  : MissingDocumentStatuses = true;
void _allDocumentStatusesListed;

export type ContactCategory = Schemas["Category"];

export type Contact = Schemas["ContactView"];

export type ContactVerification = Schemas["VerificationView"];
