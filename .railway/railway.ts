// Railway infrastructure for Cetus (production): three services from this repository, each built from its
// own Dockerfile at the repository root. Applied with the Railway CLI, never on push:
//   railway config plan    (preview)
//   railway config apply   (asks for confirmation)
// Secrets are preserve(): their values live only in Railway (set them sealed in the dashboard), so this
// file never holds a password or key. Every variable a service uses must be listed here: plan shows
// any variable that exists in Railway but not here as a removal.
import { defineRailway, github, preserve, project, service } from "railway/iac";

const repo = "CarlosPavajeau/cetus";

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

/** PlanetScale role that owns the billing schema (pscale_api_…), shared by the API and the worker. */
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
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    replicas: 1,
    domains: [{ domain: "cetus.cantte.com", port: 3000 }],
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
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    replicas: 1,
    domains: [{ domain: "cetus-api.cantte.com", port: 8080 }],
    env: {
      PORT: "8080",
      ...billingDatabase,
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
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    replicas: 1,
    env: {
      PORT: "8081",
      ...billingDatabase,
      ...aws,
      // Days each document stays locked (S3 Object Lock). Unset: 1826. "1" only to try the bucket first.
      CETUS_STORAGE_RETENTION_DAYS: "1",
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
