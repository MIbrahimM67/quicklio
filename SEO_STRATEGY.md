# Quicklio SEO Strategy

## Canonical domain
- Primary host: `https://quicklio.app/`.
- Use HTTPS everywhere.
- Keep the apex domain as canonical and redirect `www.quicklio.app` to the apex.
- Every indexable HTML page must have one self-referencing canonical URL.
- Do not create separate indexable URLs for homepage filters or UI state.

## What earns a new tool page
A tool is added only when all four conditions are met:
1. There is real search demand or repeated user pain.
2. Search intent clearly wants an interactive tool or calculator.
3. The current SERP is weak, incomplete, outdated, or article/forum-heavy.
4. Quicklio can materially improve the workflow, not merely copy a formula.

Keyword volume and difficulty figures are evidence, not permission to build. Do not fabricate volume, KD, or DR values.

## Site architecture
- Homepage: brand + all-tool discovery.
- Collection hubs: create only when a topic has enough real utility to support a useful hub.
- Tool pages: one search intent and one primary job per canonical URL.
- Current hubs:
  - `/en/pdf/`
  - `/en/images/`
  - `/en/crafts/`

Do not create thin category pages for a category with only one weak tool merely to increase indexed URL count.

## Tool-page template
Above the fold:
- Clear H1 matching the main job/query.
- Tool opens immediately.
- One concise sentence explaining the outcome.
- No forced signup.

Below the tool:
- Explain the exact problem the tool solves.
- Answer the main confusion behind the query.
- Include examples, limitations, formulas, official-source notes, or FAQs only when they add real value.
- Avoid generic filler and keyword stuffing.

## Titles and descriptions
- Each indexable page needs a unique title and meta description.
- Put the primary task/query near the beginning of the title.
- Use `| Quicklio` consistently on tool and collection pages.
- Write descriptions for click clarity, not keyword density.
- Never mass-produce near-identical metadata.

## Internal linking
- Homepage links to strong collection hubs and all current tools.
- Collection hubs link to every relevant tool.
- Tool pages link back to an appropriate hub through a breadcrumb where a real hub exists.
- Add contextual related-tool links when they solve the user's next likely task.
- Avoid orphan pages.

## Structured data
- Homepage: `WebSite` + `Organization`.
- Collection hubs: `CollectionPage` + `ItemList`.
- Tool pages: `WebApplication` + `BreadcrumbList`.
- Structured data must describe visible page content and must never invent ratings, reviews, prices, or capabilities.
- Current tools are free, so Software/WebApplication offers may use price 0 USD.

## Crawl and index controls
- `robots.txt` allows public pages and declares the sitemap.
- `sitemap.xml` must contain every intended indexable canonical page.
- Query-string filter states canonicalize to the clean page and are not separate landing pages.
- Do not index internal QA/test routes.

## Performance and UX
- Keep the site static/browser-first where possible.
- Avoid heavy third-party scripts unless they materially improve the tool.
- Maintain responsive layouts and test with Playwright.
- Prioritize fast interaction over decorative effects.

## Launch checklist for every new tool
1. Validate the search opportunity and competing tools.
2. Create a clean permanent URL.
3. Add unique title, description, canonical, and one H1.
4. Add the tool to homepage discovery.
5. Add it to its collection hub or create a hub only if justified.
6. Add it to the sitemap.
7. Add/update tests.
8. Merge only after CI and browser QA pass.
9. Inspect the live URL in Google Search Console.
10. Request indexing for important new pages and monitor queries/impressions.

## Search Console and analytics
- Use a Google Search Console Domain property for `quicklio.app`.
- Verify it with DNS so all protocols/subdomains are covered.
- Submit `https://quicklio.app/sitemap.xml`.
- Connect GA4 only after a real Measurement ID exists; never commit a placeholder ID.
- Use Search Console data to decide which pages to improve: impressions with weak CTR, positions 5–20, unexpected queries, and indexing/canonical issues.

## Content expansion
Build supporting content only when it strengthens a tool cluster. Prefer:
- tool-specific how-to sections,
- comparison/size/reference pages that naturally link to a tool,
- official-standard explainers,
- troubleshooting pages with a direct tool solution.

Do not build a generic blog publishing machine. Quicklio's moat is useful browser workflows paired with concise, evidence-based supporting content.


## Opportunity research pipeline
Before building a new tool, use the cluster-first process documented in `SEO_TOPICAL_MAP.md`:
1. Start from an existing strong Quicklio cluster.
2. Mine SERP-visible specialist competitors for successful workflows.
3. Group synonymous queries into one intent before deciding URLs.
4. Manually validate the current SERP and reject commoditized tool queries unless Quicklio has a real product advantage.
5. Prefer technical or workflow gaps where articles/forums are standing in for an interactive solution.
6. Expand an existing canonical tool when the new query is only a parameter/preset variation of the same job.
7. Build contextual internal links around the user's next likely task, not only global navigation links.
8. Use Search Console data after launch to decide whether to strengthen the page or split a genuinely different intent.

Do not treat DR, KD, search volume, or allintitle counts as automatic build rules. They are discovery evidence only; final selection depends on intent, SERP quality, product differentiation, and topical fit.
