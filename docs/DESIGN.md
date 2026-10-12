# Lumi Sign design implementation

`DESIGN.md` at the repository root is an unchanged copy of the RunLumi brand contract,
from `RunLumi/brand.runlumi` commit `7a158f6e31227b9a5b76a5d2648bce4459c802d1`.
This document adapts its shared identity to the signing application. Landing-specific
product positioning and composition do not replace Lumi Sign's existing task flows.

## Shared identity

- Light only: Paper White `#f4f0e8`, opaque Surface White `#ffffff`, Civic Navy `#102a43`, Ink `#172033`.
- Lumi Blue `#006093` is the primary action color; hover `#004f80`, pressed `#003e6a`.
- Self-hosted variable Geist Latin and Latin Extended fonts cover English and Vietnamese. The SIL OFL is in `public/fonts/Geist-OFL.txt`.
- The official folded-L SVG and email PNG are copied without modification into `public/brand/`. Preserve their ownership notice.
- Functional application icons use intact Tabler Outline glyphs. Its MIT notice is in `public/brand/Tabler-LICENSE.txt`. Generated Shadcn primitives retain their supplied internal icons; do not edit generated files manually.
- Opaque white sheets hold document content. Glass is confined to the header and product navigation, with opaque, reduced-transparency, contrast, and reduced-motion treatments.

## Components

| Component | Responsibility |
| --- | --- |
| `PageShell` | Shared brand header, My documents entry, skip link, main landmark, footer; narrow/content/wide widths. Wide stops at 1200px. |
| `PageHeader` | One page heading and optional lead; the shell owns the logo. |
| `Wordmark` | Official folded-L asset plus Lumi Sign; accessible home link. |
| `Panel` / `PanelTitle` / `PanelDescription` | Opaque work sheet, navy heading, readable body copy. |
| `StatusBadge` | Label plus dot, using canonical info/success/warning/risk colors. |
| `TextLink` / `BackLink` | Consistent prose and back navigation. |
| `NativeSelect`, generated Shadcn primitives | Existing inputs and controls; shared CSS sets 44px minimum control height and visible focus without editing generated source. |
| `EmptyState` / `LoadingText` | Existing empty/loading behavior with shared typography and surfaces. |

Keep the four signing tasks, verified-email authority, PDF placement geometry,
creator controls, and Agentic review behavior intact. PDF previews remain white paper.
Do not introduce decorative motion, false security claims, fake usage statistics,
or new legal policies as part of a visual update.

## Transactional email

`src/lib/email-template.ts` owns the responsive table layout shared by sender and
signer verification, signing links, signature notifications, revision requests,
human review, My documents access, Agentic access, and signed PDF backups.

- HTML escapes all names, comments, details, and URLs; action links accept HTTP(S) only.
- Inline canonical colors, a 600px sheet, mobile padding, Outlook table fallback,
  hidden non-sensitive preview text, and a readable fallback link.
- The logo is hosted at the app's public asset URL; the product name remains visible
  if a mail client blocks images. System fonts fall back when Geist is unavailable.
- Preserve plain-text bodies, recipient authority, expiry semantics, and PDF attachments.
- Rendering a template does not prove inbox-client rendering or provider delivery.
- Generate local samples with `pnpm email:preview`; no mail is sent by that command.
