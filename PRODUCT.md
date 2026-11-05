# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally:

- **Developers** integrating electronic invoicing into their own product (POS, e-commerce, ERP, SaaS). They
  want to send JSON to a REST API and never touch UBL 2.1, XAdES signing, CUFE/CUDE or SOAP with the DIAN.
  They start in sandbox, read the docs, wire webhooks and move to production.
- **Businesses and accountants (contadores)** who issue invoices, credit notes and debit notes from the
  console, onboard their issuers through DIAN habilitación, and manage several NITs (an accountant may run
  three or more clients).

Both share the console: sign-up, issuer onboarding, API keys, documents, billing, and help.

## Product Purpose

Cetus is an electronic invoicing API for Colombia, connected to the DIAN. It issues invoices, credit notes and
debit notes, signs them, submits them to the DIAN, and delivers the result to the buyer by email and to
integrators by webhooks.

Every document runs in one of three environments, chosen by the API key prefix:

- **Sandbox** (`cetus_sandbox_…`): never reaches the DIAN; a simulator answers. Each new account ships with a
  sample issuer, ready to issue from the first minute.
- **Test** (`cetus_test_…`): DIAN habilitación with the issuer's own software, certificate and test set.
- **Live** (`cetus_live_…`): production.

Success is an account that issues its first sandbox invoice, completes habilitación, and moves to a paid plan
issuing in production.

## Positioning

- **Sandbox from minute one:** a sample issuer is ready at sign-up; no certificate or habilitación needed to
  issue the first document.
- **Modern, documented API:** REST `/v1`, idempotency keys, signed webhooks (Standard Webhooks), a public
  OpenAPI spec, and docs written in Spanish.
- **Public, low prices:** plans and prepaid packages are published with per-document overage; no quote needed
  (except the "Socios" plan, by contract).
- **Help with habilitación:** direct support through the DIAN test set.

## Operating Context

- Surfaces: the console at `cetus.cantte.com` (app, plus the marketing pages: landing, `/precios`,
  `/contadores`, `/estoy-obligado-a-facturar`), the docs at `cetus-docs.cantte.com` (guides and API
  reference, `/v1` only), and a public status page on Better Stack.
- Onboarding flows through the DIAN portal: software registration, test set (TestSetId), certificate `.p12`
  upload, technical key, numbering ranges.
- Documents end `ACCEPTED` or `REJECTED`; DIAN rejections carry rule codes the user must understand and fix.
- Support: tickets and feedback in `/help`, mailbox `contact@cantte.com`.
- All product copy is Spanish (Colombia).

## Capabilities and Constraints

- Document types: invoice, credit note, debit note. Billing emails and webhooks come from the worker.
- Organizations, members, invitations, two-factor auth (Better Auth). Several issuers (NITs) per account,
  limited by plan.
- Commercial terms (from `catalogo-planes-cetus.md`, prices final, not IVA-responsible): unlimited sandbox and
  test for every account; monthly plans Inicial, Crecimiento, Escala, Socios; annual prepaid packages
  Emprendedor, Negocio, Contador. Production (`LIVE`) issuing requires an active subscription or package.
  Prices on public pages come from the plan catalog, never hard-coded.
- Terminology: emisor (issuer), adquiriente (buyer), habilitación, set de pruebas, CUFE/CUDE, llave de API,
  ambiente (sandbox / pruebas / producción).
- Unused monthly documents roll over for 60 days after the period ends, capped at two monthly quotas.

## Brand Commitments

- Name: Cetus. Logo and favicons in `apps/console/public`.
- Voice: the console's current tone — short, declarative sentences in direct, professional Spanish
  ("Primero pruebas. Después, producción."). Explain tax jargon instead of assuming it.

## Evidence on Hand

- No customer logos, testimonials or case studies exist yet. Do not invent customers, quotes, logos, adoption
  numbers or benchmarks.
- Real material available: the API itself, the public OpenAPI spec (`apps/docs/public/openapi.public.json`),
  docs and guides, console screenshots (`pnpm screenshots`), and the published plan catalog.

## Product Principles

1. **Hide the DIAN, not the truth.** Absorb UBL, signing and SOAP, but show the real document state, the
   DIAN's rule code and what to do about it.
2. **Sandbox first.** Every path should let someone see a working document before asking for a certificate,
   a card, or a call.
3. **Two audiences, one product.** Developer and business needs differ in entry point and language, not in
   the facts; never fork the truth between them.
4. **Prices and limits in plain sight.** Commercial terms are public and read from one source.
5. **Claims we can prove.** Only state numbers, customers and guarantees that exist.
