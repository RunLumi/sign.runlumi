# RunLumi Sign production deployment

Production runs at `https://sign.runlumi.app` on the `signmos-production`
Cloudflare Worker. D1 stores metadata and access credentials, R2 stores PDFs,
and Cloudflare Email Service sends transactional verification and signing mail.
Turnstile is disabled by explicit product decision; IP/email rate limits and
email verification remain required. This is a new deployment, not an import of
any former Lumi Sign database or documents.

## Infrastructure

- Cloudflare zone: `runlumi.app`; the `sign.runlumi.app` hostname must have no
  conflicting CNAME. Wrangler manages the Custom Domain DNS and certificate.
- D1: `signmos-production`, binding `DB`, migrations in `src/db/migrations/d1`.
- R2: `signmos-documents-production`, binding `DOCUMENTS_BUCKET`.
- Email: binding `EMAIL`, sending enabled for `runlumi.app`.
- Sender: `Lumi Sign <sign@runlumi.app>`; reply-to: `sign@runlumi.app`.
  The reply-to address must be connected to an inbox to receive replies.

Public routing and sender values are in `wrangler.jsonc`. Neon, Resend, and
Turnstile secrets are not needed by this production deployment. PostgreSQL
migrations remain historical; do not apply them to D1. Generate SQLite changes
with `pnpm exec drizzle-kit generate --config drizzle-d1.config.ts`.
Use `--local` for development D1 commands. Do not run production migrations or
seed commands against an unrelated database.

## Deployment

`./scripts/deploy-production.sh --dry-run` builds with `CLOUDFLARE_ENV=production`
and validates `dist/server/wrangler.json` without changing remote state.
`./scripts/deploy-production.sh --deploy` requires a clean committed tree,
applies committed D1 migrations, publishes that Git SHA, and checks `/`,
`/agent.md`, and `/openapi.json`. The generated Vite configuration already
contains the selected environment; do not add `--env production` to its deploy.

Cloudflare Workers Builds connects `RunLumi/sign.runlumi` to `signmos-production`
and deploys pushes to `main`. Preview builds are disabled. The approved managed
`signmos-production build token` stays in Cloudflare; no deploy token is needed
in GitHub. Build environment: `NODE_VERSION=24`, root directory `/`.

Build command:
`pnpm install --frozen-lockfile && pnpm types && pnpm test && pnpm lint && ./scripts/deploy-production.sh --dry-run`

Deploy command: `./scripts/deploy-production.sh --deploy`.

`.github/workflows/deploy.yml` validates pushes and pull requests with types,
tests, lint, production build, and dry run. It does not publish a second release.
Cloudflare skips commits marked `[skip ci]`, such as semantic-release changelog
updates. Check the Cloudflare build result and active version after code updates.

## Verification and recovery

HTTP success alone does not prove email or signing. Check a real controlled inbox
for passwordless mail, then upload a synthetic PDF, verify identity, sign, and
download the final PDF. Test My Documents and Agentic access as well. Never record
magic links, personal token values, or document content in logs or Git.

For a bad code release, use
`pnpm exec wrangler rollback --config wrangler.jsonc --env production`, then
repeat endpoint and affected workflow checks. D1 migrations are not rolled back
with Worker code; use backward-compatible schema changes and export a database
backup before destructive migrations. Retain the last successful SHA and
Cloudflare version ID in release evidence.
