// Railway infrastructure for Cetus (production): three services from this repository, each built from its
// own Dockerfile at the repository root. Autodeploy is off in each service's settings (the IaC has no field
// for it): .github/workflows/deploy.yml deploys them in order (api, then worker and console), so the console
// never goes live before the API it calls. Applied with the Railway CLI, never on push:
//   railway config plan    (preview)
//   railway config apply   (asks for confirmation)
// The restart policy is Railway's default (ON_FAILURE, 10 retries), so it is not set here: Railway reports
// the default as null and plan would always show it as a change.
// Secrets are preserve(): their values live only in Railway (set them sealed in the dashboard), so this
// file never holds a password or key. Every variable a service uses must be listed here: plan shows
// any variable that exists in Railway but not here as a removal. Custom domains (cetus.cantte.com for the
// console, cetus-api.cantte.com for the API) are added in the dashboard: the CLI cannot register them.
import { defineRailway, github, preserve, project, service } from "railway/iac";

const repo = "CarlosPavajeau/cetus";

/** One replica in Virginia, next to PlanetScale (AWS us-east-1), S3 and KMS. */
const replicas = { "us-east4-eqdc4a": 1 };

const MB = 1024 * 1024;
/**
 * Resource ceilings. Railway bills actual usage, but the JVM sizes its heap from the container memory
 * (MaxRAMPercentage=40), so a lower ceiling also keeps the Java services from growing into it.
 */
const limits = (cpu: number, memoryMB: number) => ({ containers: { cpu, memoryBytes: memoryMB * MB } });

/** What makes a Java service rebuild: its app, the shared modules and the Gradle build. */
const javaWatch = (app: string) => [
  `apps/${app}/**`,
  "modules/**",
  "build-logic/**",
  "gradle/**",
  "gradlew",
  "*.gradle.kts",
  "gradle.properties",
];

/** AWS settings shared by the API and the worker; each has its own IAM user (infra/aws/). */
const aws = {
  AWS_REGION: "us-east-1",
  AWS_ACCESS_KEY_ID: preserve(),
  AWS_SECRET_ACCESS_KEY: preserve(),
  CETUS_KMS_KEY_ID: "alias/cetus-prod",
  CETUS_DOCUMENTS_BUCKET: "cetus-prod-documents-434227",
};

/**
 * PlanetScale role that owns the billing schema (pscale_api_…), shared by the API and the worker.
 * CETUS_DB_URL goes through PgBouncer (port 6432, transaction mode) and carries the pools. Only what needs a
 * session takes a direct connection (port 5432): Flyway in the API (CETUS_DB_MIGRATION_URL), the worker's
 * LISTEN (CETUS_JOBS_LISTEN_URL) and the console. That is about 7, twice during a deploy, under the 25 direct
 * connections; PgBouncer takes up to 400 clients.
 */
const billingDatabase = {
  CETUS_DB_URL: preserve(),
  CETUS_DB_USER: preserve(),
  CETUS_DB_PASSWORD: preserve(),
};

export default defineRailway((ctx) => {
  // Console: TanStack Start with Better Auth. The API reaches its JWKS through the private network.
  const consoleApp = service("console", {
    source: github(repo, { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "apps/console/Dockerfile",
      watchPatterns: ["apps/console/**", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"],
    },
    deploy: {
      preDeployCommand: ["pnpm db:migrate"],
      healthcheckPath: "/sign-in",
      healthcheckTimeout: 120,
      limitOverride: limits(1, 512),
    },
    replicas,
    env: {
      PORT: "3000",
      // PlanetScale role that owns the auth schema.
      DATABASE_URL: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: "https://cetus.cantte.com",
      CETUS_API_URL: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}",
    },
  });

  // API: /v1 for integrators, /console for the console (private network only), Resend's webhook.
  // Flyway migrates the billing schema when it starts.
  const api = service("api", {
    source: github(repo, { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "apps/api/Dockerfile",
      watchPatterns: javaWatch("api"),
    },
    deploy: {
      healthcheckPath: "/q/health/ready",
      healthcheckTimeout: 300,
      limitOverride: limits(1, 1024),
    },
    replicas,
    env: {
      PORT: "8080",
      ...billingDatabase,
      // The same database on port 5432, for Flyway.
      CETUS_DB_MIGRATION_URL: preserve(),
      ...aws,
      CETUS_AUTH_JWKS_URL: "http://${{console.RAILWAY_PRIVATE_DOMAIN}}:${{console.PORT}}/api/auth/jwks",
      // Must equal the console's BETTER_AUTH_URL, without a trailing slash.
      CETUS_AUTH_ISSUER: "https://cetus.cantte.com",
      RESEND_WEBHOOK_SECRET: preserve(),
    },
  });

  // Worker: signs and sends documents to the DIAN, delivers them by email and webhooks, raises alerts.
  // No public domain. Without CETUS_DIAN_TEST_URL it talks to the real DIAN endpoints.
  const worker = service("worker", {
    source: github(repo, { branch: "main" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "apps/worker/Dockerfile",
      watchPatterns: javaWatch("worker"),
    },
    deploy: {
      healthcheckPath: "/q/health/ready",
      healthcheckTimeout: 300,
      limitOverride: limits(1, 1024),
    },
    replicas,
    env: {
      PORT: "8081",
      ...billingDatabase,
      // The same database on port 5432, for the LISTEN that starts jobs as soon as they are enqueued.
      CETUS_JOBS_LISTEN_URL: preserve(),
      ...aws,
      // Documents stay locked (S3 Object Lock, compliance) for the prod default of 1826 days; set
      // CETUS_STORAGE_RETENTION_DAYS here only to change that period. It cannot be shortened afterwards.
      RESEND_API_KEY: preserve(),
      CETUS_EMAIL_FROM: "Facturas <facturas@cetus.cantte.com>",
      CETUS_EMAIL_TEST_RECIPIENT: preserve(),
      CETUS_OPS_ALERT_EMAIL: preserve(),
    },
  });

  return project(ctx.projectName ?? "cetus", {
    resources: [consoleApp, api, worker],
  });
});
