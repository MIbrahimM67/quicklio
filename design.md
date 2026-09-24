# Design — Quicklio

Quicklio is a warm, practical browser-tools brand: approachable enough for everyday users, credible enough for file and calculation utilities, and recognizable across many categories.

## Brand position
**Promise:** practical tools for real jobs, without unnecessary friction.
**Voice:** clear, useful, friendly, never cute at the expense of clarity.
**Tagline:** Simple tools. Real solutions.

## Visual language
- Warm ivory page background rather than sterile white.
- Quicklio green is the single brand anchor.
- Tool categories get soft pastel surfaces, but the global brand stays green + ink.
- Soft 12–22px radii are allowed because the brand reference explicitly calls for a friendly consumer-tool surface; avoid nested card-on-card excess.
- Subtle shadows only on elevated navigation, hero containers, and working panels.

## Logo
Use `/assets/brand/quicklio-mark.svg` with the Manrope wordmark. The mark combines a circular Q-like silhouette with a lightning cut to communicate speed and utility.

## Typography
- Display/marketing: Fraunces 700–900, roman only.
- UI/body: Manrope 400–800.
- Mono: system mono only when a technical value genuinely benefits.
- Tool titles use Manrope rather than Fraunces so working pages remain utilitarian.

## Color tokens
Defined centrally in `assets/css/styles.css`.
- Brand green: `--color-green`
- Warm paper: `--color-paper`
- Ink: `--color-ink`
- Category surfaces: candle, PDF/print, images, labels, social, money, crafts, Halloween, pumpkin, Christmas.

## Structure
- Homepage: value-led split hero → search/filter → popular tools → trust strip → language/support.
- Tool pages: branded tool hero → two-panel workbench → concise education below.
- Content pages: simple content shell using the same header/footer.

## Navigation
Top-level navigation is intentionally product-oriented rather than tool-name spam:
- Products mega-dropdown
- About
- Leave a Review
- Language menu
- Support Us
The Products dropdown groups current tools by category and provides direct tool links.
- Grouped product catalogue: Images, PDF & Print, Labels, Social, Money, Crafts, Candle, Halloween, Christmas.
- Category links may deep-link to the homepage with `?category=<slug>#tools`.

## Interaction
- Native `details` for dropdown navigation.
- Search/filter operates client-side.
- Tool calculations and file processing stay owned by each tool's existing JS.
- Focus rings are always visible for keyboard navigation.
- Motion is restrained to hover/press feedback.

## Responsive floor
Every page must work without horizontal scrolling at 320, 375, 414, and 768 CSS px. Desktop-only nav collapses to a compact mobile menu.


## Icon system
- Use the self-hosted Lucide SVG sprite at `/assets/icons/lucide.svg`.
- Do not use emoji, Unicode arrows, text chevrons, or mixed icon families in production UI.
- Use `<svg class="icon"><use href="/assets/icons/lucide.svg#i-…"></use></svg>`.
- Arrow-right is the only forward-action arrow; chevron-down is the only disclosure chevron.
- Icons inherit `currentColor` and use the same Lucide stroke geometry throughout the site.
- Decorative tool illustrations should be built from crisp HTML/CSS/SVG, not generated raster images containing text.

## Anti-slop QA
Before shipping a new page:
1. Verify no text overflows at 320, 375, 414, 768, 1024, and desktop widths.
2. Never apply `white-space: nowrap` globally to anchors.
3. Check for stray emoji or Unicode arrow glyphs in navigation, cards, and calls to action.
4. Keep one icon family and one arrow language.
5. Avoid AI-generated text inside images; all brand text must remain real HTML/SVG.

## Catalogue scale
- Homepage and Products navigation currently expose 20 tools.
- Print preparation is treated as part of the PDF & Print discovery category even when the route lives under `/en/print/`.
- Labels is a distinct category because CSV-to-label workflows have different user intent from general PDF tools.

## Editor surfaces
- Image and PDF editors use a workspace pattern rather than the standard two-panel calculator layout.
- Toolbars use the shared Lucide sprite; no emoji or text-glyph controls.
- Desktop: toolbar + sidebar/page strip + large canvas. Mobile: sidebar/page strip collapses into normal document flow.
- Contact-sheet ordering uses visible draggable thumbnails; output order must mirror the arranged thumbnail order.
