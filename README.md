# FreshFind — Fresh All Along

A static, client-only Single Page Application built to the "FreshFind" SRS
(eGreen Basket theme, Web Innovation Unleashed). No backend, no build step —
plain HTML, CSS, and JavaScript, with data loaded from local JSON files.

## How to run it

Browsers block `fetch()` of local files when a page is opened directly as
`file://`, so serve the folder with any lightweight local server:

```bash
# Option 1 — Python (usually pre-installed)
cd freshfind
python3 -m http.server 8000
# then open http://localhost:8000

# Option 2 — Node
npx serve .

# Option 3 — VS Code
# Install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

No install, build tools, or internet access are required except for the two
Google-hosted resources used purely for presentation:

- Google Fonts (Fraunces / Work Sans) — cosmetic only, the page still works if blocked.
- Google Maps embed iframes on Market Detail pages — cosmetic only.

## Project structure

```
freshfind/
├── index.html          Single HTML shell; all views render into #app-content
├── css/style.css        All styling (responsive, no CSS framework)
├── js/app.js            Router, state, rendering, chatbot, widgets
├── data/markets.json     Selected markets in Nigeria, Ghana, Kenya, and South Africa
├── data/nigeria-markets.json  Markets filling state coverage gaps
├── data/nigeria-market-expansion.json  Additional markets across Nigerian states
├── data/nigeria-market-expansion-extra.json  Further markets with regional produce profiles
├── data/nigeria-market-expansion-further.json  Additional Nigerian market listings
├── data/international-markets.json  Representative markets across Ghana, Kenya, and South Africa
├── data/international-market-expansion.json  Additional market listings for international regions
├── data/produce.json     33 foods and fruits with category/availability/description
└── data/chatbot.json     Pre-scripted rule-based Q&A dataset for the chatbot
```

## Features implemented (mapped to the SRS)

- **Home** — quick find by country, region, and produce; market highlights and
  staple goods, with a floating chatbot launcher.
- **Market Directory** — filterable by country, state/region, and goods, and sortable
  (alphabetical or approximate proximity via browser geolocation).
- **Market Detail** — address, embedded map, schedule caveat, and a chip grid
  linking to goods commonly traded at that market.
- **Produce Guide** — browsable, filterable by category, each item links to
  every market that carries it.
- **Chatbot** — floating widget, quick-reply chips, and lookups against the
  market, country, and produce records, with curated answers for common topics.
  Answers link to relevant pages; live stock, prices, and hours are not available.
- **Bookmarking** — star icon on any market/produce card, a bookmarks drawer
  with per-item session-only notes (`sessionStorage`), export as a downloaded
  `.txt` list, and a "share" button that opens a pre-filled social share link.
  Bookmarks themselves persist in `localStorage` so they survive a reload;
  the SRS marks _notes_ specifically as session-only, which is respected.
- **Contact Us / About Us** — static information about the directory.
- **UI extras** — simulated visitor counter, live clock, hover/transition
  effects, and breadcrumb navigation on every inner page.

## Assumptions made

- Listings include markets across all 36 Nigerian states and the FCT, Ghana's
  16 regions, Kenya's 47 counties, and South Africa's 9 provinces. International
  coverage uses representative markets, not a complete registry. Each market has a
  representative produce list, and produce searches show markets listing that
  item. Listings are not verified live inventories; stock, prices, and trader
  hours vary, so confirm locally before travelling. Coordinates are approximate
  and used for proximity sorting and map display.
- No product photography is bundled (keeps the project dependency-free and
  avoids third-party image licensing); each market/produce card uses a
  representative emoji icon instead, styled as a card graphic.
- Bookmarks persist across sessions (`localStorage`) since the SRS only
  requires _notes_ to be session-only; if reviewers want bookmarks to also
  reset per session, swap `localStorage` for `sessionStorage` in
  `js/app.js` (`toggleBookmark`, `state.bookmarks` init).
- "Proximity" sort requires the visitor to grant browser geolocation
  permission; without it, the Directory falls back to alphabetical order.

## Suggested next steps for the project report

- Run Google Lighthouse against the served site (performance/accessibility/SEO)
  and paste the scores into your report, per the SRS's testing hint.
- Add flowcharts / DFDs for: page navigation, bookmark flow, and chatbot
  intent matching, for the deliverables checklist.
