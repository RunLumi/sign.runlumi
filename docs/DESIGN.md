# Lumi Sign design system

The UI goal: outstanding but simple — one layout system, one surface style, one link style, restrained color. Deep ink-navy brand (`#030b22` heritage from `manifest.json`) over cool neutrals, Inter Variable (self-hosted in `public/fonts/`), dark mode is navy-tinted, never flat gray.

## Building blocks

Always reach for these before hand-rolling markup:

| Component | Import | Use for |
| --- | --- | --- |
| `PageShell` | `@/components/layout/page-shell` | Outermost wrapper of every page. `width`: `narrow` (max-w-xl, confirmations/verifications), `content` (max-w-3xl, default), `wide` (max-w-5xl, editors/PDF previews). `center` for vertically centered pages. |
| `PageHeader` | `@/components/layout/page-shell` | Wordmark eyebrow + `h1` (text-3xl) + optional lead paragraph. `align="center"` for centered pages. |
| `Wordmark` | `@/components/layout/wordmark` | Brand mark (Signature icon tile + "Lumi Sign"). Links to `/` by default. |
| `Panel`, `PanelTitle`, `PanelDescription` | `@/components/patterns/panel` | Every card-like surface (forms, summaries, lists). `as="form"` etc. for other elements. |
| `StatusBadge` | `@/components/patterns/status-badge` | All status pills. Tones: `neutral`, `info`, `success`, `warning`, `destructive`. Never hand-roll emerald/amber spans. |
| `TextLink` / `textLinkClass` | `@/components/patterns/text-link` | All inline links. `textLinkClass` for router `<Link>`s. |
| `BackLink` | `@/components/patterns/text-link` | All back navigation (renders `<a>` with `href`, `<button>` otherwise). |
| `NativeSelect` | `@/components/patterns/native-select` | All `<select>` elements. Matches `Input` height (h-9). |
| `EmptyState` | `@/components/patterns/empty-state` | Empty lists/queues. Must offer one clear next action when one exists. |
| `LoadingText` | `@/components/patterns/loading-text` | Inline loading/status lines (`aria-live` `<output>`). `boxed` for standalone page-level loading. |
| shadcn `src/components/ui/*` | `@/components/ui/*` | Buttons, inputs, dialogs, alerts, tables, badges. Generated files — never edit manually. |

## Layout rules

- Page skeleton: `PageShell` → optional `AuthenticatedProductNavigation`/`ProductModeNavigation` → `PageHeader` → content blocks. Vertical rhythm between blocks comes from PageShell's `space-y-8`; inside panels use `space-y-4`/`space-y-5`.
- Never `min-h-screen`; `PageShell` owns `min-h-dvh` and background.
- Headings: `h1` only via `PageHeader` (text-3xl); section `h2` outside panels `text-xl font-semibold`; `PanelTitle` inside panels (text-lg). Landing hero is the single exception (text-4xl/5xl).
- `text-balance` on headings, `text-pretty` on paragraphs, `tabular-nums` on dates/counts/data.

## Color rules

- One accent per view: navy `primary`. Status color only via `StatusBadge` and `Alert`.
- No gradients, no glows, no raw hex/slate/zinc classes in components. Every color must render correctly in dark mode (`dark:` variant or token).
- Exception: PDF page previews are always paper — `bg-white text-slate-950` is correct there and must not get dark variants; field overlay palettes on top of the paper likewise stay light.

## Interaction & states

- Destructive/irreversible actions: `ui/dialog` (or AlertDialog pattern) confirm — never a hand-rolled fixed overlay.
- Links inside prose are underlined (`TextLink`); actions look like buttons (`Button`, or `Button asChild` around `<a>`) — never hand-rolled anchor-buttons.
- Errors render next to the action via `<Alert variant="destructive">`; field-level hints may be small `text-destructive` text under the field.
- Loading: `LoadingText`. Empty: `EmptyState`. Don't invent per-page variants.

## Copy rules

- Sentence case everywhere ("Try again", not "Try Again").
- Ellipsis is the single character `…`, never three dots ("Saving…").
- Buttons name the action ("Start envelope", "Send for signing"); loading labels are the verb + `…`.
