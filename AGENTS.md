# Lumi Sign — repository agent guide

Lumi Sign runs on TanStack Start, React, Hono, Cloudflare Workers, D1 SQLite,
Drizzle, R2, and Cloudflare Email Service. This file guides agents changing the
repository. `/agent.md` and `/openapi.json` guide clients using the product API.

## Start with the task

1. Inspect `git status --short --branch` and relevant files. Preserve unrelated edits; do not reset, stash, clean, or switch away from someone else's work.
2. Define the result and acceptance criteria. For an issue, fetch `gh issue view <number> --json number,title,body,state,labels,url`; local drafts are supporting context.
3. Load relevant documents below and applicable nested `AGENTS.md` instructions. Code/config establish current behavior; PRDs establish intent. Investigate disagreements and distinguish historical evidence from the current deployment.
4. Make a complete change through existing boundaries. Finish requested validation, PR, merge, and deployment steps; ask only for missing information or authority.

Latest user instructions and platform restrictions take precedence over this file.
Do not assume a machine-local skill, absolute path, authenticated account, or
production credential exists. Use available skills when they fit the task; their
absence does not block ordinary repository work.

## Load context by need

| Task | Read |
| --- | --- |
| Product behavior / lifecycle | `plans/simple-esignature-prd.md` and the relevant `plans/*-prd.md` amendment |
| Service boundaries / code navigation | `ARCHITECTURE.md` |
| Implementation / review / local browser checks | `docs/AGENT_GUIDE.md` |
| UI / transactional email | `DESIGN.md` and `docs/DESIGN.md` |
| Cloudflare configuration / deployment / recovery | `docs/PRODUCTION_DEPLOYMENT.md`, `wrangler.jsonc`, `scripts/deploy-production.sh` |
| Setup / API examples / historical context | `README.md`; `llms.txt` is a discovery index |
| Prior release proof | The relevant file under `plans/evidence/`; recheck live state when needed |

## Code map

| Responsibility | Main boundary |
| --- | --- |
| Worker routing and request-scoped D1 | `src/server.ts`, `src/db/setup.ts` |
| Envelope lifecycle, fields, signing, source/final PDFs | `src/db/envelope/` |
| Verified-email sessions, catalog, role authorization | `src/db/history-access/` |
| Personal tokens, idempotent commands, human review | `src/db/agentic-access/` |
| HTTP adapters and Bearer API | `src/hono/api/`; `agent-v1*.ts` owns `/api/v1` |
| Public Agent guide and OpenAPI publisher | `src/hono/public-agent-*.ts` |
| Thin route adapters | `src/routes/` |
| Preparation / signer / My Documents / Agentic UI | `src/components/envelopes/`, `src/components/signing/`, `src/components/history/`, `src/components/agentic/` |
| Shared layouts / patterns / brand tokens | `src/components/layout/`, `src/components/patterns/`, `src/styles.css` |
| Email renderer and provider boundary | `src/lib/email-template.ts`, `src/db/envelope/email-delivery.ts` |
| Behavioral tests / release contracts / browser E2E | Adjacent `*.test.ts(x)`, `src/release/`, `scripts/e2e/` |

## Product invariants

- Preserve self-sign/two-party flows, all three signature methods, multipage placement, and draft field clearing. `/envelope-fields` prepares fields; `/my-documents` is the worklist.
- Store originals at `envelopes/<id>/source-v<version>.pdf` and signed PDFs at `envelopes/<id>/final.pdf`. Persist the final object and D1 key/hash/size before completed status. Preserve saved signatures on failure; retries reuse them and valid finals.
- Recovery requires authorized access, completed recipients, and saved values for every field. Preserve source pages, Unicode names, and audit evidence. Status/metadata alone do not prove a usable PDF.
- Documents remain until explicit creator deletion. Link/session expiry must not delete PDFs. Standard My Documents sessions last a fixed seven days; identity bridges cannot outlive their source authority. Agentic management sessions remain separate and short. Use the constants in the credential-authority modules.
- Recheck role and lifecycle state on document access. Management cookies, process links, history cookies, and personal Bearer tokens are distinct authorities. Preserve same-origin checks and matching-human approval for protected actions.
- Every `/api/v1` mutation requires `Idempotency-Key`; identical retries replay, changed reuse conflicts. Keep runtime schemas, `/openapi.json`, `/agent.md`, and contract tests in sync.
- Production uses D1 and Cloudflare Email Service. PostgreSQL migrations and Neon/Resend submission records are historical. Turnstile is explicitly disabled; verified-email authority and IP/email limits remain active.
- Distinguish email records, provider acceptance, inbox delivery, and valid attachments. Automatic completion records currently do not invoke a provider send; verify the actual path before claiming delivery.
- Keep real document contents, signature images, magic links, cookies, API tokens, and credentials out of Git, logs, PRs, and shared screenshots/evidence. Use synthetic fixtures and redact access material.

## Implementation rules

- Keep SQL in DB domains, HTTP adaptation in Hono, routes thin, and UI behavior in feature components. Prefer narrow public interfaces.
- Derive boundary types from Zod; no `any`, narrow `unknown`. Keep source files under 500 lines; do not expand oversized files.
- Use TanStack Form for fields and Query for server state; local state is for UI/browser primitives. Preserve accessibility and mobile reflow.
- Use the light-only Lumi contract, shared components, Tabler icons, and official assets/licenses. Leave generated Shadcn internals generated.
- Do not manually edit `src/routeTree.gen.ts`, `worker-configuration.d.ts`, generated migrations, or `src/components/ui/*`. Use the relevant generator. SQLite migrations belong in `src/db/migrations/d1/`.
- Tests belong beside source and exercise public behavior. Mock external boundaries only: DB, R2, network, clock, randomness, and browser APIs. Routes are excluded from Vitest discovery; test their component or HTTP boundary.
- Use the pinned pnpm version in `package.json` and the lockfile. CI uses Node 24. Do not bypass hooks or weaken checks to obtain a green PR.

## Verification by change

| Change | Required evidence |
| --- | --- |
| Documentation only | `pnpm lint`, `git diff --check`, resolve changed paths/commands against the repository; run affected existing doc contracts when applicable |
| Application / config / dependencies | `pnpm types`, `pnpm knip`, `pnpm test`, `pnpm lint`, `pnpm build` |
| PDF / signing / storage | Application checks plus `pnpm e2e:storage`; confirm separate object keys, original-byte preservation, final checksum/pages, Unicode values, and retry behavior |
| Placement | `pnpm e2e:placement` for real multipage scrolling, multiple fields, clearing/replacement, and reload persistence |
| UI / email appearance | `pnpm email:preview` then `pnpm e2e:brand`; inspect screenshots. HTML preview does not prove inbox rendering or delivery |
| Agent API / authority / contract | Relevant API and `src/release/` checks; use `pnpm agentic:smoke` only with a configured environment and scoped temporary token |
| Production deployment | Guarded deploy dry run, hosted checks, deployed Git SHA/version, affected live workflow; follow the deployment runbook |

Local commands and browser setup are in `docs/AGENT_GUIDE.md`. E2E storage/brand
fixtures refuse non-local hosts; inspect the placement target too. Agentic smoke
and calibration can touch a real environment: inspect their options and report,
use an authorized target/token, and explicitly handle retained fixtures and token
revocation. Do not run calibration without a measurement need.

## PR, merge, and handoff

- Work on a focused `codex/<topic>` branch from current main when the checkout is clean; use an isolated worktree if needed to preserve unrelated work.
- Review the diff, generated changes, credential exposure, and acceptance criteria. PRs explain the change, reason, checks, and limitations.
- Create a PR when requested. Merge only with user authorization, after the applicable hosted checks pass on its exact current head. Recheck head/state immediately before merging; never merge an older passing revision.
- After merge, fetch/read back remote main and synchronize the clean checkout. Report PR/merge state; confirm Cloudflare build/version separately for deployment tasks.
- Retain substantial-work evidence under `plans/evidence/`: scope, commands, environment/commit, results, unresolved criteria. Keep changing SHAs/counts and private incident identifiers out of this guide.
- Final status: verified, failing, and unverified criteria, with the relevant local/CI/runtime/provider proof. Never turn an attempted action into a success claim.

## Code Review Rules

- Flag authorization or idempotency regressions across the browser and Bearer APIs. Preserve role/state checks and the existing human-review boundary; a new route is not an exemption.
- Flag completion before durable final-PDF storage, source/final key reuse, source loss, duplicate signing on retry, or recovery without recorded signing evidence. Follow the existing finalization/recovery boundaries.
- Flag public API drift, exposed credential/document data, and production instructions that select historical PostgreSQL infrastructure. Use runtime schemas, D1 configuration, and sanitized fixtures as the safe path.
