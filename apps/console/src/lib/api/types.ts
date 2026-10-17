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
