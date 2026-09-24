# Design — Quicklio

A locked Hallmark design system for Quicklio. Every page redesign reads this file first. Extend this system when needed; do not invent a new visual language per tool.

## Genre
Modern-minimal utility, with an almanac/workbench character.

## Macrostructure family
- Marketing/home: Index-First utility catalogue with a compact asymmetrical intro.
- App/tool pages: Workbench. The function appears immediately; explanation follows.
- Content pages: Long Document with restrained rules and wide negative space.

## Theme
Quicklio keeps its warm paper, near-black ink, and acid-lime accent. The palette is expressed as OKLCH tokens in `assets/css/styles.css`.

- `--color-paper`: warm off-white page
- `--color-paper-2`: slightly deeper working surface
- `--color-surface`: bright input/work surface
- `--color-ink`: near-black primary ink
- `--color-ink-2`: secondary ink
- `--color-muted`: metadata
- `--color-rule`: quiet rule
- `--color-accent`: Quicklio acid lime
- `--color-accent-ink`: dark text on lime
- `--color-focus`: high-contrast keyboard focus

## Typography
- Display: system sans, weight 780–900, roman.
- Body: system sans, weight 400–650.
- Mono: system monospace, used only for values/technical metadata where useful.
- Display tracking: tight, never italic.
- Type scale anchor: `--text-display` uses `clamp()`.

No remote font dependency is required.

## Spacing
4-point-derived named scale in `assets/css/styles.css`. Components use named spacing tokens rather than arbitrary repeated gaps.

## Motion
- Motion stance: restrained and functional.
- Hover/press: short transform/background feedback only.
- No universal scroll reveals.
- `prefers-reduced-motion` disables non-essential transitions.

## Microinteractions stance
- Silent success when the changed result is already visible.
- Visible `:focus-visible` on every interactive element.
- Constant border widths across input states.
- Minimum touch target: 44px.
- No celebratory toasts or decorative loaders.

## CTA voice
- Primary: near-black rectangular button, short label.
- Secondary: paper/surface button with a one-pixel ink rule.
- Shape: soft rectangle, not pills.
- Press state: 1px downward translation.

## Per-page allowances
- Homepage may use typography and rules as its enrichment.
- Tool pages must not use decorative enrichment; the workbench is the hero.
- Content pages use typography only.

## What pages MUST share
- Quicklio wordmark and Q mark.
- Acid-lime accent placement.
- System sans typography.
- Rectangular control voice.
- Rule-based hierarchy.
- Warm-paper surface.
- Focus treatment and interaction states.

## What pages MAY differ on
- Internal workbench composition required by the tool.
- Preview/output region shape.
- Number of control groups and metric cells.
- Supporting article length.

## Structural fingerprint
- Heading placement: hanging/stacked, left-biased.
- Body composition: asymmetrical spans for home, workbench for tools, single document measure for content.
- Divider language: hairline + negative space.
- Button voice: outlined/solid soft rectangles.
- Imagery: none by default; user-supplied preview only where the tool requires it.
- Reveal pattern: none.

## Hallmark guardrails
- No gradient hero.
- No glassmorphism.
- No pill-heavy interface.
- No three-identical-feature-card marketing row.
- No decorative invented metrics.
- No card-in-card nesting.
- No italic display headings.
- No colors or font-family declarations outside named tokens.
- No horizontal scroll at 320 / 375 / 414 / 768 px.
