// Hand-written for now. Replace with types generated from the OpenAPI spec (`pnpm api:types`).
export type Environment = "TEST" | "LIVE";

export type Account = { id: string; name: string; status: string; plan: string };

export type ApiKey = {
  id: string;
  name: string;
  environment: Environment;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type CreatedApiKey = { key: ApiKey; secret: string };

export type Issuer = {
  id: string;
  environment: Environment;
  nit: string;
  checkDigit: string;
  legalName: string;
  tradeName: string | null;
  status: "ONBOARDING" | "TESTING" | "ENABLED" | "DISABLED";
};

export const auditActions = [
  "ACCOUNT_CREATED",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "ISSUER_CREATED",
  "SOFTWARE_CREDENTIALS_SET",
  "CERTIFICATE_UPLOADED",
  "NUMBERING_RANGE_ADDED",
  "ISSUER_STATUS_CHANGED",
] as const;

export type AuditAction = (typeof auditActions)[number];

export type AuditEntry = {
  id: number;
  action: AuditAction;
  actorType: "USER" | "API_KEY" | "SYSTEM";
  actorId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  /** Flat metadata, never secrets. */
  data: Record<string, string | number | boolean | null>;
  ipAddress: string | null;
  createdAt: string;
};

export type AuditPage = { items: AuditEntry[]; nextCursor: number | null };
