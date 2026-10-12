# Multipage signature placement amendment

This user-authorized amendment removes the one-signature-per-signer restriction.
Each signer needs at least one signature; a draft may contain multiple signature
fields for the same signer across pages. Existing draft, role, and consent gates
remain unchanged. Completion fills every signature field assigned to that signer.

Render actual PDF pages into canvases using the pinned, self-hosted Mozilla PDF.js
browser distribution. Scroll inside the PDF container to select the visible page;
a page selector also jumps to a specific page. Place overlays only on their saved
page and preserve their positions after reload. Keep draft placement editable
after the initial field is saved, and avoid treating fields on another page as
occupied coordinates on the selected page.

Verification: pnpm types, pnpm test, pnpm lint, pnpm build, and
pnpm e2e:placement. The E2E uses real local Worker/D1/R2 boundaries and a synthetic
two-page PDF. It scrolls with the mouse wheel, verifies page selection updates,
drags/saves signatures for one signer on pages 1 and 2, adds another signer on
page 2, reads persisted fields through HTTP, and checks placements after reload.

Local setup: install dependencies, run pnpm build and pnpm db:migrate:dev, then
start wrangler dev from dist/server/wrangler.json on 127.0.0.1:8795 with
--local --persist-to "$PWD/.wrangler/state". Run pnpm e2e:placement with Chrome
installed. Alternatively run pnpm exec playwright install chromium and set
LUMI_E2E_BROWSER=chromium. The test refuses non-local targets and sends no email.

.github/workflows/placement-e2e.yml runs this flow on PRs and pushes to main,
retaining screenshot, report, trace, and Worker logs as CI artifacts. Local evidence
is under .wrangler/e2e/multipage-placement and is ignored by Git.
