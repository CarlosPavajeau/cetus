# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cetus is a multi-tenant e-commerce platform. UI text is in **Spanish (es-CO)**.

## Monorepo Structure

- **Package manager:** Bun (v1.3.5 workspaces)
- **Build orchestration:** Turborepo
- **`apps/web`** — Frontend app (React 19 + TanStack Start + Vite + Nitro)
- **`packages/api-client`** — Axios-based API client with `anonymousClient` and `authenticatedClient` instances
- **`packages/auth`** — Authentication (better-auth with Google OAuth + email/password, organization-based access)
- **`packages/db`** — Drizzle ORM schemas and migrations (PostgreSQL via Neon serverless)
- **`packages/env`** — Arktype-validated environment variables (client: `VITE_*`, server: `DATABASE_URL`, auth secrets, etc.)
- **`packages/integrations`** — Payment integrations (Wompi, Mercado Pago)
- **`packages/schemas`** — Arktype validation schemas shared across the app
- **`packages/shared`** — Shared utilities, constants, and types

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Start all dev servers (Turbo)
bun run build            # Build all packages (Turbo)
bun run check-types      # TypeScript type checking (Turbo)
bun run check            # Biome lint + format check (with auto-fix)
bun run format           # Biome format (with auto-fix)
```

### Database (run from `packages/db`)

```bash
bun run db:push          # Push schema to database
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
```

### Web app (run from `apps/web`)

```bash
bun run dev              # Dev server on port 3000
bun run build            # Production build (Vite)
bun run serve            # Preview production build
```

## Architecture

### Routing (TanStack Router — file-based)

Routes live in `apps/web/src/routes/`. Key patterns:
- `_store-required.tsx` — Layout route that gates access to a store context
- `/app/` — Admin dashboard routes (products, orders, inventory, categories, coupons, customers, reports)
- Top-level routes — Public storefront pages (product listings, categories, cart)
- `/api/` — Server API routes handled by Nitro

Route files export `Route` with `loader`, `component`, `pendingComponent`, and `validateSearch`.

### Data Fetching & State

- **Server state:** TanStack React Query (queryClient available via router context)
- **Client state:** Zustand stores with persistence (`useCart` in sessionStorage, `useTenantStore`)
- **URL state:** nuqs (`useQueryState`) for search params
- **Forms:** React Hook Form + `@hookform/resolvers` with Arktype schemas from `@cetus/schemas`

### API Client (`packages/api-client`)

Endpoint modules in `src/endpoints/` (products, orders, categories, customers, coupons, inventory, reviews, reports, stores, aws). Each exports an object with methods that call `authenticatedClient` or `anonymousClient`.

### Feature Modules (`apps/web/src/features/`)

Domain features (auth, products, orders, customers, categories, coupons, payments) each contain their own `components/` and `hooks/` subdirectories.

### UI Components (`apps/web/src/components/ui/`)

shadcn/ui + Radix UI primitives. Configured via `components.json` at the repo root.

### Path Aliases

- `@cetus/web/*` → `apps/web/src/*`
- `@cetus/ui/*` → `apps/web/src/components/ui/*`
- Package imports: `@cetus/api-client`, `@cetus/schemas`, `@cetus/shared`, `@cetus/auth`, `@cetus/env`, `@cetus/db`

## Code Standards

### Linting & Formatting

Uses **Biome** via **Ultracite** preset. Key style rules:
- 2-space indent, single quotes, trailing commas, no semicolons
- Line width: 80, LF line endings
- Strict accessibility, performance, and type-safety rules enforced (see `.rules` file)
- Use `import type` for type-only imports

### TypeScript

- Strict mode with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- Target: ES2022, module resolution: bundler
- Prefer `unknown` over `any`, use const assertions, leverage type narrowing

### Validation

Uses **Arktype** (not Zod). Schemas are defined in `packages/schemas/src/` and shared between frontend forms and API validation.

### React Patterns

- Function components only (no class components, no `forwardRef` — React 19 ref-as-prop)
- Hooks at top level only
- Semantic HTML with proper ARIA attributes
- No `console.log`, `debugger`, or `alert` in production code
