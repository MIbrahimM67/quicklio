# Quicklio SEO Strategy

## Canonical domain
- Primary host: `https://quicklio.app/`.
- Use HTTPS everywhere.
- Keep the apex domain as canonical and redirect `www.quicklio.app` to the apex.
- Every indexable HTML page must have one self-referencing canonical URL.
- Do not create separate indexable URLs for homepage filters or UI state.

## Three-pillar SEO operating model
Quicklio SEO is managed as three connected workstreams. A page is not considered fully launched until all three have been considered.

### 1. On-page SEO
Purpose: make each page the clearest and most useful answer for one underlying search job.

For every important landing/tool page:
- one clear search intent per canonical URL;
- unique, concise `<title>` with the main task near the beginning;
- useful meta description written for click clarity rather than keyword density;
- exactly one descriptive H1;
- tool/workflow visible immediately above the fold;
- semantic supporting copy that explains the real problem, constraints, examples, limitations, terminology, and next step;
- natural coverage of close query variants without creating thin doorway pages;
- descriptive internal anchor text from hubs and adjacent workflows;
- appropriate heading hierarchy;
- accurate image alt text where images carry meaning;
- visible trust/privacy claims only when they are true;
- schema that matches visible content.

Do not treat word count, keyword density, exact-match repetition, FAQ volume, or a list of NLP terms as ranking formulas. The target is complete intent satisfaction.

### 2. Technical SEO
Purpose: make every intended page easy to crawl, render, understand, index, and use.

Maintain:
- HTTPS and the apex canonical host;
- one self-referencing canonical for every indexable page;
- canonical URLs only in `sitemap.xml`;
- `robots.txt` that allows public pages and points to the canonical sitemap;
- no accidental indexing of test/QA routes, duplicate UI states, filters, or parameter variants;
- crawlable internal links to every important page so the sitemap is not the only discovery mechanism;
- valid status codes and permanent redirects for retired/moved URLs where hosting permits them;
- mobile-first responsive layouts;
- good Core Web Vitals and low-friction page experience;
- minimal render-blocking and unnecessary third-party JavaScript;
- accessible, semantic HTML where practical;
- parseable structured data that accurately describes the page;
- CI coverage for titles, descriptions, H1s, canonicals, sitemap coverage, schema JSON, and duplicate sitemap entries;
- browser QA before merge.

Query-string filter states such as homepage category filters are UI state, not separate search landing pages, unless we explicitly design a unique search page for that intent.

### 3. Off-page SEO and authority
Purpose: earn real discovery, mentions, links, feedback, and brand demand outside Quicklio.

Prioritize:
- useful participation in Reddit/forums where the exact problem is being discussed;
- transparent maker disclosure whenever linking to Quicklio;
- Product Hunt / maker-community launches for meaningful product milestones;
- outreach to relevant tutorials, resource pages, educators, print/craft/business communities, and niche publishers when a Quicklio tool genuinely improves their workflow;
- editorial links earned because a tool, reference, dataset, comparison, or workflow is useful;
- partnerships and integrations with real topical relevance;
- user reviews and word-of-mouth from people who actually completed a task.

Avoid:
- buying or selling links for ranking manipulation;
- mass directory submissions solely for PageRank;
- paid niche edits with dofollow requirements;
- excessive reciprocal linking;
- optimized-anchor forum/comment spam;
- fake accounts, fake recommendations, fake reviews, or pretending to have “found” a tool we built;
- mass guest posting where the main purpose is a backlink.

Off-page work is judged by qualified visits, product usage, earned mentions/links, repeat users, and branded demand — not raw backlink count.

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
- Prefer natural, descriptive anchors over repeated exact-match anchors.

## Structured data
- Homepage: `WebSite` + `Organization`.
- Collection hubs: `CollectionPage` + `ItemList`.
- Tool pages: `WebApplication` + `BreadcrumbList`.
- Structured data must describe visible page content and must never invent ratings, reviews, prices, or capabilities.
- Current tools are free, so Software/WebApplication offers may use price 0 USD.
- Do not add FAQ markup simply for SEO; use question/answer content only when it genuinely helps users.

## Crawl and index controls
- `robots.txt` allows public pages and declares the sitemap.
- `sitemap.xml` must contain every intended indexable canonical page exactly once.
- Query-string filter states canonicalize to the clean page and are not separate landing pages.
- Do not index internal QA/test routes.
- Important pages must be discoverable through crawlable HTML links, not just a sitemap.

## Performance and UX
- Keep the site static/browser-first where possible.
- Avoid heavy third-party scripts unless they materially improve the tool.
- Defer or lazy-load conversion/OCR/rendering libraries until they are needed where practical.
- Maintain responsive layouts and test with Playwright.
- Prioritize fast interaction over decorative effects.
- Watch Core Web Vitals in Search Console and investigate regressions by template/tool family.
- Avoid intrusive interstitials and ad layouts that obscure the main workflow.

## Off-page distribution workflow
For each important launch or meaningful update:
1. Identify communities where the exact user problem already appears.
2. Read current community rules before posting or linking.
3. Participate helpfully before asking for attention.
4. Solve the problem first; link only when the tool is directly relevant and links are allowed.
5. Disclose that Quicklio is our product.
6. Use UTM parameters for allowed campaign links so source quality can be measured.
7. Track visit -> `tool_started` -> `tool_completed` -> `download_clicked` / review.
8. Reuse community feedback as product research and on-page clarification.
9. Stop using any channel that produces removals, low-quality traffic, or spam signals.

## Launch checklist for every new tool
### Opportunity and product
1. Validate the search opportunity and competing tools.
2. Confirm one underlying user job and one canonical URL.
3. Define a real product advantage.

### On-page
4. Add unique title, description, canonical, and one H1.
5. Put the actual tool immediately into the workflow.
6. Add evidence-based semantic supporting content and honest limitations.
7. Add contextual links to adjacent Quicklio workflows.

### Technical
8. Add the tool to homepage discovery.
9. Add it to the relevant collection hub.
10. Add it to the sitemap.
11. Validate schema, crawlability, mobile layout, and performance impact.
12. Add/update unit and browser tests.
13. Merge only after CI and browser QA pass.

### Off-page and measurement
14. Inspect the live URL in Google Search Console.
15. Request indexing for important new pages and monitor queries/impressions.
16. Choose a small number of relevant community/distribution channels and follow their rules.
17. Measure traffic quality and product completion, not just clicks or backlinks.

## Search Console and analytics
- Use a Google Search Console Domain property for `quicklio.app`.
- Verify it with DNS so all protocols/subdomains are covered.
- Submit `https://quicklio.app/sitemap.xml`.
- Connect GA4 only after a real Measurement ID exists; never commit a placeholder ID.
- Use Search Console data to decide which pages to improve: impressions with weak CTR, positions 5–20, unexpected queries, indexing/canonical issues, Core Web Vitals, and generative-AI/search appearance reports where available.
- Use GA4 product events to separate rankings that actually solve the job from rankings that only attract clicks.

## Content expansion
Build supporting content only when it strengthens a tool cluster. Prefer:
- tool-specific how-to sections,
- comparison/size/reference pages that naturally link to a tool,
- official-standard explainers,
- troubleshooting pages with a direct tool solution,
- original tests or examples that add information competitors do not provide.

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

Do not treat DR, KD, search volume, or allintitle counts as automatic build rules. They are discovery evidence only; final selection depends on intent, SERP quality, product differentiation, topical fit, technical health, and authority/distribution quality.
