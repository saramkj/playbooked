# STACK.md — Playbooked (Stage 4)

## Stack Summary
A boring, shippable full-stack TypeScript setup: React (Vite) on the frontend, a traditional Node.js API server (Express) on the backend, Postgres as the source of truth, and Redis for session storage so cookie sessions work across multiple backend instances. Deploy using Render (static site + web service + managed Postgres + managed Redis). Add Sentry + structured logs, and keep tests focused on the riskiest MVP paths (Gate evaluator + concurrency-safe trade creation).

## Locked decisions
- Frontend: **React + TypeScript + Tailwind CSS + Vite** (.tsx)
- Auth: **cookie-based sessions + double-submit CSRF**
- Status code policy: **401 / 403 / 404 / 409 / 422**
- Templates: **Option A (checklist/help only)**; playbook fields are fixed columns
- Process Gate: **hard-blocks trade creation**; every click logs a **GateAttempt**
- Concurrency: **one planned PaperTrade per playbook** (server + DB enforced)
- Time: **store UTC**, UI displays local time with offset label

## Why this stack is employable (concrete)
- TypeScript across frontend + backend is a very common hiring baseline in modern SWE roles.
- Express is ubiquitous and interview-friendly (you can explain every layer clearly).
- Postgres + Prisma is widely used in startups and mid-sized companies for fast delivery with real constraints.
- Redis-backed sessions are the standard solution for cookie-session apps across multiple instances.
- Render mirrors real industry patterns (separate FE/BE + managed DB/Redis) without complex infrastructure.

---

## Assumptions
- Production database is **Postgres** (so we can use a partial unique index for planned trades).
- No uploads in MVP (all data stored in Postgres).
- Domains are configured so cookies work cleanly over HTTPS (e.g., same apex domain with subdomains for app/api).

---

## A) Frontend (React + TS + Tailwind + Vite)

### Decision
- Framework/build: **React + TypeScript + Tailwind + Vite**
- Routing: **React Router**
- Forms + validation: **React Hook Form + Zod**
- Data fetching/caching: **TanStack Query**
- UI/accessibility: Headless components (your own) + consistent focus/aria patterns

### Why
- React Router is the default “boring” router for Vite React SPAs.
- RHF + Zod maps perfectly to your 422 shape (`field_errors`) and keeps forms consistent.
- TanStack Query helps with “refresh correctness” and server-driven UI states (planned_trade_id, locks, etc.).
- Tailwind is fast to ship and marketable.

### Not choosing
- Next.js: good, but adds SSR/edge choices you don’t need for this MVP.
- Redux: unnecessary complexity for this app; TanStack Query + local state is enough.
- Formik: less common today and heavier than RHF.

### Risks + mitigations
- Risk: inconsistent UI copy/handling for 401/403/404/409/422 across screens.
  - Mitigation: a single `handleApiError()` utility + shared UI components (ErrorBanner, FieldErrorSummary, GateErrorPanel).
- Risk: dashboard shows stale data due to caching.
  - Mitigation: TanStack Query with stable query keys + explicit refetch on navigation + manual refresh button.
- Risk: accessibility regressions with custom components.
  - Mitigation: enforce a reusable form template with aria-live + focus management; keyboard-only pass on each screen.

---

## B) Backend framework/approach (pick ONE)

### Decision
- Runtime: **Node.js (TypeScript)**
- Framework: **Express**
- Conventions (boring + scalable):
  - `routes/` → route definitions
  - `controllers/` → request/response mapping
  - `services/` → business logic (Gate evaluator, trade creation, dashboard stats)
  - `repos/` → DB access layer (Prisma queries)
  - `validators/` → Zod request schemas
  - `middlewares/` → session/auth, CSRF, rate limiting, error handler
  - `lib/` → config, logger, utilities

### Why
- Express has the most mature ecosystem for cookie sessions + CSRF + middleware ordering.
- Easy to explain and maintain as a solo developer.
- Avoids “fragile serverless-only” auth/session pitfalls.

### Not choosing
- NestJS: employable but adds ceremony that slows a solo MVP.
- Serverless-only API: cookie sessions + CSRF become more brittle and harder to reason about.

### Risks + mitigations
- Risk: middleware ordering mistakes (session must exist before CSRF/auth checks).
  - Mitigation: lock middleware order in `app.ts` and add an integration test for CSRF failure behavior.
- Risk: inconsistent error body shapes.
  - Mitigation: one centralized error handler that always returns the locked error contract and status codes.

---

## C) Database + ORM + migrations (pick ONE)

### Decision
- Database: **Postgres**
- ORM: **Prisma**
- Migrations: **Prisma Migrate**

### Why
- Postgres supports your required constraints/indexes and concurrency-safe uniqueness.
- Prisma is a modern, widely-used TS ORM with strong types and fast iteration.

### Not choosing
- MongoDB: weaker fit for relational constraints and concurrency rules.
- SQLite in production: not ideal for multi-instance production (and constraint features differ).

### Risks + mitigations
- Risk: schema churn early on.
  - Mitigation: keep migrations small; always include explicit indexes/constraints in the migration plan.
- Risk: race condition around planned trade creation.
  - Mitigation: DB-level partial unique index + integration tests for 201/409 behavior.

---

## D) Auth & security implementation notes (high-level)

### Cookie session strategy
- Library: `express-session`
- Cookie flags:
  - `HttpOnly: true`
  - `Secure: true` (production only)
  - `SameSite: Lax`
  - `Path: /`
- Session rotation:
  - rotate session ID on login
- Logout:
  - destroy server session + clear cookie

### Double-submit CSRF (cookie + header)
- Server sets `csrf_token` cookie (**NOT HttpOnly**).
- Client sends `X-CSRF-Token` header on all non-GET requests.
- Server validates header matches cookie; mismatch → **403**.

### Password hashing
- **argon2** (preferred) for password hashing.

### Rate limiting (auth endpoints)
- Rate-limit `/signup` and `/login` (IP-based + optionally email-based).
- Return **429** is fine internally, but keep UI handling generic (not part of locked codes list).

### Input validation
- Zod schemas per endpoint:
  - 422 for `field_errors`
  - gate failures returned as 422 with `gate_errors` + `passed_gate_count`

---

## E) Session storage strategy (must work across multiple instances)

### Decision
- **Redis session store** (connect-redis)

### Why
- Works across multiple backend instances immediately (no sticky sessions required).
- Common in production and strongly employable.

### Not choosing
- In-memory sessions: breaks on restarts and with multiple instances.
- DB-backed sessions: workable but adds unnecessary load/complexity to Postgres for MVP.

### Risks + mitigations
- Risk: Redis outage causes sudden logouts.
  - Mitigation: handle 401 cleanly; keep session TTL reasonable; use managed Redis.

---

## F) Hosting plan (frontend + backend + DB)

### Decision (one coherent plan)
- Provider: **Render**
  - Frontend: Render Static Site (Vite build)
  - Backend: Render Web Service (Express API)
  - Database: Render Managed Postgres
  - Sessions: Render Managed Redis
- Env var management:
  - store all secrets in Render environment variables
  - commit `.env.example` only (never real `.env`)

### Why
- Low-cost, simple, common in industry for small services.
- Clean separation of FE/BE and easy HTTPS + deploy hooks.

### Not choosing
- Kubernetes / microservices: unnecessary for MVP.
- Pure serverless: not ideal for cookie sessions + CSRF consistency.

### Risks + mitigations
- Risk: cookie domain/cors issues between FE and API.
  - Mitigation: use same apex domain with subdomains and configure CORS with credentials + exact allowed origin.

---

## G) Storage plan (uploads)

### Decision
- **No uploads in MVP; no object storage required.**

### Why
- MVP scope doesn’t include file handling; avoids integration/permissions complexity.

### Risks + mitigations
- Risk: future desire for attachments/screenshots.
  - Mitigation: v1+ can add S3-compatible storage (backlog), but keep MVP clean.

---

## H) Error logging/monitoring

### Decision
- Error monitoring: **Sentry** (frontend + backend)
- Server logs: **pino** structured JSON logs

### Why
- Sentry is widely used and easy to demo in a portfolio project.
- Structured logs help debug status code policies and state transitions.

### MUST NOT be logged (locked safety rule)
Never log free-text fields:
- Playbook text: thesis, invalidation_rule
- Trade plan/outcome/post-mortem notes
Log only:
- IDs, timestamps, gate counts, statuses, conflict_type, event_type

### Risks + mitigations
- Risk: accidentally logging request bodies.
  - Mitigation: disable body logging; add logger redaction for known keys.

---

## I) Testing strategy (minimal but real)

### Backend (Vitest + Supertest)
- Unit tests:
  - Gate evaluator: each gate’s pass/fail edges (min chars, checklist completeness, max_loss_percent > 0)
  - Key metrics caps and validation rules
- Integration tests:
  - `POST /api/paper-trades`:
    - 422 gates fail (returns gate_errors + passed_gate_count; GateAttempt logged)
    - 409 planned_trade_exists (planned_trade_id returned; GateAttempt logged with blocked flag)
    - 201 success (trade_id + redirect_url; GateAttempt linked)
  - Concurrency test: two near-simultaneous creates → only one planned trade exists
- Optional E2E smoke (Playwright):
  - login → add ticker → create event → create playbook → attempt trade (fail) → fix → create planned

### Why
- Tests target your highest-risk areas: gate logic, status codes, and concurrency.

### Not choosing
- Full test pyramid / heavy mocks: too slow for MVP.

### Risks + mitigations
- Risk: flaky tests due to shared DB state.
  - Mitigation: isolate test DB, reset tables between tests, run migrations once per suite.

---

## J) Dev experience

### Decision
- Repo: **Monorepo**
  - `apps/web` (React)
  - `apps/api` (Express)
  - `packages/shared` (shared TS types: status enums, API error types, gate constants)

### Local dev setup
- Node: **20 LTS**
- Local services: Postgres + Redis via Docker Compose
- Scripts:
  - `pnpm dev` (runs web + api)
  - `pnpm test`
  - `pnpm lint`
  - `pnpm typecheck`

### Lint/format/typecheck
- ESLint + Prettier
- TypeScript `tsc --noEmit` in CI

### Risks + mitigations
- Risk: monorepo tooling friction.
  - Mitigation: keep it simple with pnpm workspaces + a short README with 3 commands.
