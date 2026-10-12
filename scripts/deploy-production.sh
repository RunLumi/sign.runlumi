#!/usr/bin/env bash
set -euo pipefail
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"
mode="${1:---dry-run}"
if [[ "$mode" != "--dry-run" && "$mode" != "--deploy" ]]; then
  printf 'Usage: %s <--dry-run|--deploy>\n' "$0" >&2
  exit 64
fi
if [[ "$mode" == "--deploy" && -n "$(git status --porcelain --untracked-files=all)" ]]; then
  printf 'Error: Production deploy requires a clean working tree tied to one exact commit.\n' >&2
  exit 1
fi
candidate_sha="$(git rev-parse HEAD)"
production_origin="https://sign.runlumi.app"
unset CLOUDFLARE_ENV
printf 'Building production candidate %s\n' "$candidate_sha"
CLOUDFLARE_ENV=production pnpm build
printf 'Validating generated production configuration\n'
pnpm exec wrangler deploy --config dist/server/wrangler.json --dry-run
if [[ "$mode" == "--dry-run" ]]; then
  printf 'Production deploy dry run passed for %s\n' "$candidate_sha"
  exit 0
fi
pnpm exec wrangler whoami >/dev/null
pnpm exec wrangler r2 bucket info signmos-documents-production >/dev/null
printf 'Applying committed D1 migrations before publishing\n'
pnpm exec wrangler d1 migrations apply signmos-production --remote --config wrangler.jsonc --env production
printf 'Publishing production candidate %s\n' "$candidate_sha"
pnpm exec wrangler deploy --config dist/server/wrangler.json --message "git:$candidate_sha"
for path in / /agent.md /openapi.json; do
  curl --fail --silent --show-error --retry 3 --retry-all-errors --max-time 30 --output /dev/null "$production_origin$path"
done
printf 'Deployed candidate %s to %s\n' "$candidate_sha" "$production_origin"
