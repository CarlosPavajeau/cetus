# AGENTS.md – Cetus Development Guide

This file is the first stop for agents working in this repo. Keep changes
small, typed, verified, and routed through mise.

## Communication

- Be concise.
- Say what changed and how you verified it.
- If you provide a plan, end with unresolved questions, if any.
- Preserve pre-existing uncommitted changes and unrelated work. Modify existing
  code as needed for the requested task.
- Complete authorized work through verification. Resolve routine implementation
  choices using repository patterns. Ask only when missing information
  materially affects scope or correctness; continue independent work while
  waiting.

## Repository map

```
cetus/
├── apps/
│   ├── api/            Quarkus · public REST (/v1) and console endpoints (/console); validates, numbers, stores, enqueues
│   ├── worker/         Quarkus · job runner: UBL, XAdES signing, DIAN submission and status, emails, webhook delivery
│   ├── console/        TanStack Start + Better Auth · web panel (BFF to the API), owns the "auth" schema (Drizzle) and its emails
│   └── dian-mock/      Local stand-in for the DIAN web services; development and bench only, never deployed
├── modules/
│   ├── domain/         Plain Java · model, totals, CUFE/CUDE, DIAN rules; depends on no framework
│   ├── persistence/    Panache entities + Flyway migrations ("billing" schema)
│   ├── jobs/           Postgres-backed job queue (FOR UPDATE SKIP LOCKED)
│   ├── ubl/            Hand-written JAXB model of UBL 2.1 + mapper
│   ├── signing/        XAdES-EPES signing with the JDK API
│   ├── dian-client/    SOAP 1.2 + WS-Security over HttpClient
│   ├── aws/            KMS envelope encryption for secrets, S3 for documents
│   ├── email/          Outbound email behind EmailSender (Resend)
│   ├── webhooks/       Outbound webhook events, Standard Webhooks signing, transactional publisher
│   └── notifications/  Notices to account contacts, enqueued as emails in the caller's transaction
├── build-logic/        Gradle convention plugins (cetus.java-conventions, cetus.java-library)
├── infra/              Local init (Postgres schemas, LocalStack) and production AWS policies (IAM, S3 lifecycle)
├── scripts/            dev.sh (behind the mise tasks), Railway deploy, one-off data scripts
├── bench/              k6 load benchmarks against production images (see bench/README.md)
├── mise.toml           Pinned tools and dev tasks (`mise tasks`)
└── docker-compose.yml  Postgres + LocalStack for local development
```

## Tooling rules

Use `mise` for all installs, tasks, and direct tool execution. The Makefile was
replaced by mise tasks; do not reintroduce one.

```bash
# Install pinned toolchain (Java, Node, pnpm, k6); Docker is also required
mise trust
mise install

# Discover tasks
mise tasks
```

Prefer `mise run <task>` when a task covers the required scope. Use
`mise exec -- <tool>` when no task applies or a broader task would touch
unrelated files, such as when formatting changed files.

### Common tasks

```bash
# First-time setup: pnpm install, containers, auth migrations, Java build
mise run setup

# Run the stack: infra + console (:3000), API (:8080), worker (:8081)
mise run dev
mise run dev-mock      # same, plus the DIAN mock (:8090) with the worker pointing at it
mise run api           # a single service; also console, worker, mock, infra

# Java build and tests
mise exec -- ./gradlew build
mise exec -- ./gradlew :modules:domain:test
mise exec -- ./gradlew :apps:api:test --tests '*InvoiceResourceTest'

# Format Java (palantir-java-format) and the console (oxfmt); fmt-check only checks
mise run fmt
mise run fmt-check
mise exec -- ./gradlew :modules:domain:spotlessApply

# Console checks (lint, format, types) and tests
mise exec -- pnpm --filter @cetus/console check
mise exec -- pnpm --filter @cetus/console typecheck
mise run test-console  # needs `mise run dev-mock` running

# Database
mise run migrate       # console "auth" schema; Flyway migrates "billing" when the API starts
```

## Architecture rules

- `domain` depends on no framework. Every other module points toward it.
- The API never calls the DIAN: it validates, numbers, stores, and enqueues.
  The worker does the rest; `apps/api` must not depend on `dian-client`.
- Better Auth owns users, organizations, and memberships in the `auth` schema.
  `billing.accounts.organization_id` stores the organization ID with no
  cross-schema foreign key.
- Flyway manages only `billing`; Drizzle manages only `auth` (`schemaFilter`).
  Never run `drizzle-kit push` against production.
- `apps/console/src/lib/auth/schema.ts` is maintained by hand. `pnpm
  auth:generate` rewrites it with `pgTable` in `public`; use it only to see the
  columns a new plugin needs, copy them with `authSchema.table`, and discard
  the rest. Then `pnpm db:generate` creates the migration and
  `mise run migrate` applies it.
- `OpenApiFilter` marks every member of a response schema as required; do not
  add `@Schema(required = true)`. Mark members that can be null with
  `@Schema(nullable = true)`. Requests take `required` from Bean Validation.
- Account emails (invitations, and later password reset and email
  verification) go out from the console (`src/lib/email`, Resend with
  react-email templates in `src/emails`), next to the `auth` data they come
  from. Billing emails and notices stay in the worker (`modules/email`).
- Secrets (PIN, technical key, certificate password and file) are sealed with
  KMS. The `.p12` lives in S3; the database only holds metadata.

## Migrations

- Never edit an existing Flyway migration, even if its PR is unmerged or it
  only ran locally. Add a new `V<n+1>__<name>.sql` in
  `modules/persistence/src/main/resources/db/migration`; an edited migration
  breaks every database that already applied it with a checksum mismatch.

## Dependencies

- Upgrade only to versions published at least 7 days ago, unless a critical
  security fix affects the project. pnpm enforces this with
  `minimumReleaseAge`; check Maven Central release dates for Gradle.
- For third-party providers, use the official Java SDK behind an interface in
  its own module (see `modules/email`), not hand-written `HttpClient` calls.
  `dian-client` is hand-written only because the DIAN has no SDK.

## Testing

- With `mise run dev` or `dev-mock` up, the worker holds port 8081, which is
  also the Quarkus test port. Run Quarkus tests with
  `QUARKUS_HTTP_TEST_PORT=0` (a Gradle `-D` flag does not reach the test JVM).
- Console e2e tests run in parallel against one stack. Any test that waits for
  a document to be accepted must onboard its issuer with `uniqueNit()` from
  `apps/console/tests/support/issuers.ts`; a shared NIT produces duplicate
  CUFEs and the document stays in `PROCESSING`.
- New console routes need `vite build` or the dev server to regenerate
  `src/routeTree.gen.ts` before typecheck.
- Without Resend, the console writes account emails to
  `CETUS_EMAIL_OUTBOX_DIR` (`.email-outbox` in `.env.example`); e2e tests read
  their links with `latestEmailTo` from `tests/support/outbox.ts`. Joining an
  organization takes a verified address: fixtures that only need a member use
  `markEmailVerified`.

## DIAN rules

- When the XSD or a field description contradicts the annex examples or the
  DIAN validator, follow the examples and the validator, and ask before
  forcing the XSD. `UblSchemaValidationTest` tolerates only one deviation:
  the NIT check digit in `schemeID` (`coID2Type`), as the examples do.
- Credit notes: `cac:DiscrepancyResponse/cbc:Description` must be the concept
  name from annex table 13.2.4 (rule CBF04); the issuer's reason goes in
  `cbc:Note`.
- Take code lists from the annex's "Tablas Referenciadas" spreadsheets and
  rules from the annex PDF. The toolbox `Listas de valores/*.gc` files are
  stale and have caused rejections.

## Code standards

- Make minimal, surgical changes.
- Preserve type safety. Do not add TypeScript `any`, non-null assertions, or
  unsafe casts.
- Model domain states explicitly. Parse untyped input at boundaries.
- Prefer existing packages, helpers, and patterns before adding new ones.
- Avoid new dependencies unless the local implementation would be worse.
- Keep variable scope small.
- Name from most to least significant, with qualifiers last: `freqMax`, not
  `maxFreq`. Follow this even when nearby code does not.
- Handle every error. If a state is impossible, assert it rather than ignoring
  it.
- Do not write raw JSON strings in tests. Encode and decode typed records or objects.
- Do not hardcode IDs in tests.

## Code comments

- Avoid code comments by default.
- Only add a comment when the code itself cannot clearly communicate why
  something is necessary.
- Never comment what the code does.
- Comments should be rare and reserved for essential context that a future
  reader would otherwise be unable to infer, such as non-obvious constraints,
  intentional trade-offs, or decisions that cannot be expressed through the
  code itself.
- Do not add comments solely to explain changes to the current reviewer,
  unless explicitly asked.
