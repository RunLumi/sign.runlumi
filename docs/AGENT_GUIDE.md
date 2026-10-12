# Agent Guide

This guide is the detailed operating manual for agents working in signmos. Keep `AGENTS.md` as the compact entry point; use this guide for task-specific detail and executable local workflows.

## Context Loading

- Start from `AGENTS.md`.
- For code navigation, read `ARCHITECTURE.md`.
- For UI/email changes, use `DESIGN.md` and `docs/DESIGN.md`; for deployment/recovery, use `docs/PRODUCTION_DEPLOYMENT.md`.
- For product behavior and acceptance criteria, read `plans/simple-esignature-prd.md` plus the relevant feature amendment: `plans/frictionless-signing-ux-prd.md`, `plans/single-signer-mode-prd.md`, `plans/my-documents-prd.md`, or `plans/agentic-mode-prd.md`.
- For issue implementation, fetch the live GitHub issue, then read the matching local plan in `plans/issues/` if it exists.
- For API examples and manual smoke instructions, read `README.md`.
- Do not load all docs by default. Add context only when the current task needs it.

## Issue Implementation

- Fetch the live issue body before implementing: `gh issue view <number> --json number,title,body,state,labels,url`.
- Read the product and architecture docs relevant to the issue.
- Use a relevant available implementation skill when useful. Do not require a machine-local skill as a prerequisite; the repository commands and public-boundary tests are the portable workflow.
- Use issue acceptance criteria as the source of implementation scope.
- End with an acceptance-criteria evidence table: verified, failing, unverified, and evidence.

## Measurement And Resource Criteria

- Numeric acceptance criteria need tests or measured checks.
- Do not quote runtime or memory estimates unless measured on representative data, extrapolated from a stated calibration, or sourced from a documented benchmark.
- Long-running commands or scripts need heartbeat output with `flush` or unbuffered execution before a user waits on them.

## TypeScript Rules

- Never use `any`.
- Prefer `unknown` over `any`, then narrow with type guards.
- Prefer discriminated unions over boolean mode flags.
- Use `satisfies` for type-safe object literals with useful inference.
- Use `as const` for readonly literal data.
- Add explicit return types on public APIs.
- Guard indexed array access. Prefer `for...of` when the index is not needed.
- Use kebab-case filenames, PascalCase types/interfaces, camelCase functions/variables, and UPPER_SNAKE_CASE only for true constants.

## Deep Modules

A deep module has a small public interface hiding a larger implementation.

- Before creating a file, ask whether it deepens an existing module or widens the public surface.
- Before exporting a helper, ask whether callers really need it.
- Test at module boundaries, not internals.
- If an internal function needs direct tests, consider splitting the module at a real boundary.

| Layer | Boundary | Interface | Hides |
| --- | --- | --- | --- |
| DB domain | `src/db/{domain}/index.ts` | Exported queries and types | Tables, query builders, persistence details |
| API endpoint | `src/hono/api/{name}.ts` | HTTP routes | Validation, status codes, error mapping |
| Component feature | `src/components/{feature}/` | Props and named exports | UI state, mutations, local composition |
| Server function | `src/core/functions/` | `createServerFn` signature | Auth, data fetching, transforms |

## Error Handling

- Known recoverable failures use structured errors with a stable `code`, `message`, and status.
- `AppError` and `Result<T>` live in `src/core/errors.ts`.
- Unexpected errors should propagate to the global handler/logging path.
- The active database is D1 SQLite. Handle D1/SQLite errors at the persistence boundary; do not apply PostgreSQL error codes to current D1 operations. PostgreSQL helpers are historical compatibility code.
- Success responses use `{ data: ... }`; paged responses may add `{ meta: ... }`.
- Error responses should use `{ error: { code, message, ... } }` for lifecycle APIs.

## Hono And Worker Rules

- `src/server.ts` is the custom Cloudflare Worker entry.
- It runs each request inside `withDatabase(env.DB, ...)`, routes `/api/*` to Hono, serves `/agent.md` and `/openapi.json` through the public Agent contract publisher, and routes app requests to TanStack Start after remembered-login handling.
- Access bindings through `env` or `c.env`, never `process.env`.
- Workers are stateless. Do not rely on mutable global request state.
- Use `waitUntil()` for non-blocking work after a response when needed; critical signing persistence, final-PDF storage, and authorization decisions must finish before their success response.
- Hono handlers should be thin: validate request input, call a domain function, map response/error shape.
- Prefer named Zod schemas from the relevant DB domain. Do not inline large `z.object()` schemas in route handlers.

## Agentic API Rules

- `/api/agentic/*` is browser-management-session authority; `/api/v1/*` is personal Bearer document authority. Neither credential class may substitute for the other.
- Resolve the normalized-email Bearer principal and current creator/signer role on every request. Never authorize a document from token possession alone.
- Every `/api/v1` `POST`, `PUT`, `PATCH`, and `DELETE` requires `Idempotency-Key`, exact replay for an identical request, and `IDEMPOTENCY_CONFLICT` for changed reuse. Route enumeration must leave no mutation exempt.
- Runtime Zod schemas and operation metadata are the source for `/openapi.json`. Update the public contract and drift test with every route/schema change.
- Keep `/agent.md` complete for workflows, structured-error recovery, polling/backoff, goal-directed execution, and secret safety; do not duplicate its full operation catalog in static docs.
- Raw Agentic links, management sessions, Bearer secrets, and hashes must stay out of URLs, redirects, later responses, logs, errors, audits, analytics, email content outside intended one-time link delivery, screenshots, and retained evidence.
- Rate-limit policy changes require representative calibration evidence plus below/exact/above tests for both token and IP bounds. Do not infer throughput or SLA claims from latency samples.
- Agentic release changes must preserve the capability matrix, live `pnpm agentic:smoke`, credential-canary scan, and existing browser compatibility evidence.

## D1, Drizzle, And Zod Rules

- Domain tables live in `src/db/{domain}/table.ts`.
- Validation schemas and response adapters live in `src/db/{domain}/schema.ts`.
- Query and lifecycle functions live in `src/db/{domain}/queries.ts`.
- Public re-exports live in `src/db/{domain}/index.ts`.
- Query functions call `getDb()` internally; do not pass DB handles through app code.
- Use `.returning()` on mutations when the caller needs inserted/updated rows.
- Use `drizzle-orm/d1` and the request-scoped `withDatabase` boundary in `src/db/setup.ts`. `getDb()` requires that context; do not cache a request database in a global or assume `initDatabase()` exists.
- Use Zod at trust boundaries: request input, route params, external API responses, and serialized server/client data.
- Derive TypeScript types with `z.infer`; do not duplicate schema types manually.
- Do not use `z.unknown()` in schemas crossing the TanStack server-to-client serialization boundary. Use serializable values.
- Generate SQLite migrations with `pnpm db:generate:dev` (`drizzle-d1.config.ts`) and review the output under `src/db/migrations/d1/`. Apply local migrations with `pnpm db:migrate:dev`. The staging/production migration commands are remote writes; use them only for an authorized rollout.

## React, TanStack, And UI Rules

- Routes live in `src/routes/`; `src/routeTree.gen.ts` is generated and must not be edited.
- Keep route files thin. Put feature UI in `src/components/{feature}/`.
- Components use named exports and a props interface above the component.
- Use TanStack Router loaders for initial route data when appropriate.
- Use TanStack Query `queryOptions` and query-key factories for reusable queries.
- Use TanStack Form plus React Query mutations for non-trivial forms. Avoid raw `useState` form models for complex forms.
- When `validateSearch` uses defaults, provide fallback defaults inside `navigate({ search: prev => ... })` callbacks.
- Use intact Tabler Outline icons for application controls; preserve generated Shadcn primitives.
- Use Tailwind CSS v4 with theme variables. Do not hardcode palette colors such as `text-gray-*`, `bg-white`, or `text-black`.
- Use semantic variants such as `text-destructive`, `bg-success/10`, and Shadcn variants.
- Preserve accessibility: labels, keyboard navigation, focus states, and contrast.

## Generated And Protected Files

- Do not manually edit `src/components/ui/*`; use Shadcn tooling.
- Do not manually edit `src/routeTree.gen.ts`.
- Do not manually edit generated migration files.
- Do not manually edit `worker-configuration.d.ts`; run `pnpm cf-typegen`.
- Combine import additions with their usage in one edit so formatter hooks do not remove unused imports between edits.

## Cloudflare Deployment Rules

- Use `wrangler.jsonc`, not `wrangler.toml`.
- Prefer `custom_domain: true` over route patterns that require manual proxied DNS records.
- Do not use Cloudflare redirect rules that intercept Worker custom domains and create redirect loops.
- SSL/TLS mode must be Full or Full strict, not Flexible.
- With the Cloudflare Vite plugin, environment config is baked into the build mode; deploy the configured build.

## Verification

Run before declaring code changes ready:

```bash
pnpm types
pnpm test
pnpm lint
pnpm build
```

For docs-only changes, run the smallest relevant check, usually `pnpm lint`, unless a doc contract test or generated index is affected.

When finishing, report acceptance-criteria status explicitly. Do not say "complete" unless every required acceptance criterion is verified or intentionally out of scope with evidence.

## Local setup and browser E2E

Use the pnpm version pinned in `package.json`; CI uses Node 24.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:dev
pnpm dev
```

For the real Worker/D1/R2 browser flows, build first and start a local Worker in a
separate terminal with the same persistence directory used for local migrations:

```bash
pnpm build
pnpm db:migrate:dev
pnpm exec playwright install chromium
pnpm exec wrangler dev --config dist/server/wrangler.json --ip 127.0.0.1 --port 8795 --local --persist-to "$PWD/.wrangler/state"
```

When `/api/health/ready` succeeds at `http://127.0.0.1:8795`, run:

```bash
LUMI_E2E_BROWSER=chromium pnpm e2e:storage
LUMI_E2E_BROWSER=chromium pnpm e2e:placement
pnpm email:preview
LUMI_E2E_BROWSER=chromium pnpm e2e:brand
```

The scripts default to installed Chrome unless `LUMI_E2E_BROWSER=chromium` is set.
`LUMI_E2E_BASE_URL` defaults to `http://127.0.0.1:8795`; fixture runs must stay local.
Stop the local Worker after the run. These flows use local D1/R2 and synthetic
identities; they do not establish production delivery or real inbox rendering.

| Command | Evidence location |
| --- | --- |
| `pnpm e2e:storage` | `.wrangler/e2e/signed-pdf-storage/`: reports, PDFs, completed-page screenshots |
| `pnpm e2e:placement` | `.wrangler/e2e/multipage-placement/`: report, screenshot, browser trace |
| `pnpm email:preview` | `output/playwright/email-previews/`: HTML samples; no mail sent |
| `pnpm e2e:brand` | `output/playwright/brand-surfaces/`: responsive screenshots and results |

These output directories are ignored by Git. Retained traces can contain fixture
credentials; review/redact before sharing. The hosted `placement` job runs these
flows and retains artifacts; `validate` runs types, tests, lint, production build,
and deploy dry run. Inspect the logs of a failed gate; fix the cause or rerun a
confirmed transient runtime interruption, never remove an assertion to pass.

## Signed PDF diagnosis and recovery

For storage incidents, follow the request from authority to lifecycle state to
D1 metadata to the exact R2 key. A 401 is an identity/session problem; a 404 is not
proof that R2 itself is unavailable.

- Check the source object separately from the final object and metadata. A
  completed envelope must have a usable signed PDF, not only its original.
- Finalization uses `signing-finalization.ts` and `finalization.ts`; it stores the
  artifact and metadata before setting completed status. Recorded-signature
  retries must not add another signing event/value merely to retry storage.
- `final-document-recovery.ts` rebuilds only from completed recipients and saved
  assigned values after caller authorization. Keep source pages, existing intent,
  timestamps, and certificate material intact. Do not fabricate a signature or
  ask a user to re-sign to repair storage alone.
- Check Unicode rendering, final page count, PDF producer, size/hash, and the
  downloaded bytes. The bundled Noto Sans fallback and its OFL live under
  `src/db/envelope/fonts/`; do not replace unsupported names with transliteration.
- Use synthetic local fixtures first. For an authorized production repair,
  privately retain the minimum evidence required, protect it from Git/logs, and
  verify R2 readback plus the actual download route. Code rollback does not undo
  document/database mutations.

## Delivery proof and closeout

Completion email records are currently stored by finalization without a provider
send. User-requested signed-PDF backups use the actual delivery/attachment path.
Read the applicable sender/signer/history/Agentic builder and provider boundary;
do not equate record creation, provider acceptance, inbox delivery, or successful
attachment rendering.

Report the requested result, changed boundaries, checks/environment, PR/merge
state, and remaining criteria. Keep local tests, hosted CI, live runtime/storage,
and provider/inbox proof separate. Name a concrete blocker and the remaining work
when a gate cannot be satisfied.

## Maintaining agent instructions

Keep the root map concise and focused on non-obvious repository invariants.
Put longer workflows here or in their existing runbook; add nested instructions
only for a genuinely distinct scope. Update instructions and indexes alongside
behavior changes. Prefer verified paths and executable commands over generic
personality prompts, copied checklists, or a second hand-maintained API catalog.

Guidance consulted on 2026-10-12:
[official AGENTS.md configuration](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[context and instruction maintenance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra),
[scoped code review rules](https://developers.openai.com/blog/custom-code-review-rules-for-codex).
