# The Reading Room — Notion Book Tracker & Reading Hub

Status: completed native Notion template and verified Etsy DRAFT, 27 October 2026. The final implementation record below overrides the earlier design proposals where explicitly noted.

## Product promise
A beautiful personal reading library that is easy to start and easy to return to. For readers and book bloggers who want reading progress, a TBR shortlist, notes, quotes and year goals in one calm workspace. Automatic delivery of a duplicable template; no customisation service or seller work after purchase. No guarantee of sales.

## Design
Editorial literary style. Forest #203D35, ivory #F7F3EB, muted copper #A57855 and ink #262B28 for original art and delivery materials. Native Notion UI retains its available theme/font/colour constraints: do not promise arbitrary HEX interface colours. Serif page font, original wide still-life cover, concise headings, generous dividers and short instructions. No third-party widgets, embedded trackers, copyrighted book covers or external accounts beyond Notion. Functional pages remain readable without cover art. Never manufacture app screenshots.

## Complete native scope: 5 databases

### 1 Books
Title (title), Authors (two-way relation Authors.Books), Genres (two-way relation Genres.Books), Status (select: Want to read, Reading, Finished, Paused, DNF), Format (select: Print, Ebook, Audio), Total pages (number), Current page (number), Started (date), Finished (date), Rating (number, manual 1–5), Year goal (relation Goals.Books; one goal per book), Quotes (two-way relation Quotes.Book), Sample (checkbox).

Progress (formula, display percent):
```
if(prop("Total pages") > 0, min(1, max(0, prop("Current page") / prop("Total pages"))), 0)
```
Pages left (formula):
```
if(prop("Total pages") > 0, max(0, prop("Total pages") - max(0, prop("Current page"))), 0)
```
Entry check (formula):
```
ifs(prop("Total pages") <= 0, "Add a page total, or leave progress unused for audio", prop("Current page") < 0, "Current page cannot be negative", prop("Current page") > prop("Total pages"), "Current page exceeds the total", and(prop("Status") == "Finished", empty(prop("Finished"))), "Add a finish date", and(not empty(prop("Started")), not empty(prop("Finished")), prop("Finished") < prop("Started")), "Check the reading dates", and(not empty(prop("Rating")), or(prop("Rating") < 1, prop("Rating") > 5)), "Use a rating from 1 to 5", "")
```
Native formula syntax must be checked in Notion before release. Audiobooks use status/dates/notes; no page-progress claim without real page totals. Finishing a book does not silently overwrite its manually entered current page.

### 2 Authors
Name (title), Books (reciprocal Books.Authors), Website (url), Notes (rich text), Book count (rollup Books.Title/count all), Sample (checkbox). Do not include personal/private author data.

### 3 Quotes
Excerpt (title, short), Book (relation Books.Quotes; single book), Page / location (rich text), Theme (multi-select), Notes (rich text), Sample (checkbox). User adds quotations for their own reading journal. Sample quotations must be original invented demonstration text, explicitly labelled, not attributed to real authors.

### 4 Genres
Name (title), Books (reciprocal Books.Genres), Book count (rollup Books.Title/count all), Description (rich text). No unsupported automated genre classification.

### 5 Goals
Name (title), Year (number), Target books (number), Books (reciprocal Books.Year goal), Sample (checkbox).
Completed (formula):
```
lets(y, prop("Year"), prop("Books").filter(and(current.prop("Status") == "Finished", not empty(current.prop("Finished")), year(current.prop("Finished")) == y, not current.prop("Sample"))).length())
```
Goal progress (formula, display percent):
```
if(prop("Target books") > 0, min(1, prop("Completed") / prop("Target books")), 0)
```
Remaining (formula):
```
max(0, prop("Target books") - prop("Completed"))
```
The user must link a book to the chosen Year goal. No claim of automatic capture of every book, re-read histories, automatic goal relation assignment or automatic dates. Completion counts finished linked books in the selected year; never counts demo books, DNF or merely rated books. Zero target is safe. Goal displays “Set a target” guidance when target is zero.

## Pages and views
1. Home: cover, “The Reading Room”, one-line introduction, Start here link, Currently reading gallery (Reading, Sample false; Title/Authors/Progress only), TBR shortlist (Want to read, Sample false), Finished this year view (Finished date current year, Finished status, Sample false), Goals view, link strip Library / Authors / Quotes / Genres / Goals / Help.
2. Library: all real books (Sample false), Reading gallery, TBR board grouped Genres if supported (otherwise Format), Finished list, Paused / DNF separate low-pressure view. Advanced properties hidden by default.
3. Book page template “New book”: short instruction, spoiler-free summary prompt, notes, reflection prompts, review draft, quote capture instructions. Linked Quotes view filtered to that template page; verify the filter rebinds on new book creation.
4. Quotes: gallery and table; related book + location visible. No mandatory excerpt text length beyond a short label; long quotations stay in page content.
5. Goals: current year card and archive. New goal template explains how to link Books and which dates count.
6. Examples: three demo books, two demo authors, three original demonstration quotes, one demo goal. All segregated with Sample true; no huge preloaded library. Demo data never appears in personal views or progress counts. Sample count is labelled, easy to remove.
7. Start here / Help: duplicate, add first book, choose status, enter pages, link year goal, add a quote, remove examples, use on mobile, personal licence and limitations. Keep the first-use path under five actions.

## Original sample content
- SAMPLE — The Lantern Archive / Mira Vale / Reading / Print / 240 total, 96 current / Literary fiction.
- SAMPLE — A Map of Quiet Places / Ellis Rowan / Want to read / Ebook / 180 total, 0 current / Essays.
- SAMPLE — Letters from the Orchard / Mira Vale / Finished / Print / 210 total, 210 current / Fiction; dates explicitly labelled demo dates.
These names and books are fictional demonstration data. Original sample quote: “Some journeys begin with a quieter question.” No borrowed reviews, real customer outcomes or book-cover artwork.

## Quality gates before customer delivery
- All 5 databases are native editable databases with the stated property types.
- Each relation and reciprocal relation opens the correct page/database.
- Progress: 96/240 = 40%; zero/missing total does not divide by zero; negative input and over-total input are flagged.
- Goals: includes only linked non-sample Finished books with a finish date in that goal year. Test other year, missing date, DNF, sample, zero target and over-target.
- Duplicate the public root into an isolated test page/workspace; verify all child databases, formulas, relations and filtered views point to the duplicated copy, not the seller original. Confirm no No access blocks.
- Verify new book template creates a fresh book and its quote view points to that book.
- Verify no sample contamination, missing-access views, broken covers or unnecessary blank fields.
- Inspect desktop and narrow mobile layout. Do not claim native iOS/Android testing if performed only in browser.
- Public template link has duplication enabled. Do not expose unrelated workspace pages, user data or edit access to the master.
- Exactly 10 Etsy ads based on actual screenshots; original cover art may be shown separately. Ads Etsy only, no Drive.
- Delivery PDF contains the real tested template link plus concise duplication instructions. Include personal-use licence. AI artwork disclosure accurate where required.
- Save Etsy DRAFT only, reopen and verify photos, file, title, description, 13 tags ≤20 chars, price, instant download and no partner defaults.

## Listing preparation
Working title: The Reading Room Notion Book Tracker: Reading Journal, TBR Library, Quotes and Year Goals
Working price: EUR 9.90, subject to actual finished scope. No fake discount, urgency or sales count.
13 proposed tags: notion book tracker; reading journal; notion template; book journal; tbr tracker; reading tracker; book lover gift; digital book log; reading goals; quote collection; library organizer; book review journal; reading dashboard.
Do not publish or create a delivery-complete draft before a tested working duplicable Notion template exists.

## Access and final implementation — 27 October 2026
Notion access is connected. The native template is complete and publicly duplicable; indexing is disabled. A separate private duplicate was created and its five databases, relations and inline views were checked against copied IDs.

Public template: https://chartreuse-bolt-dc6.notion.site/The-Reading-Room-406051b0d561811b9526ff93d1357ce1

Etsy DRAFT (not published): https://www.etsy.com/your/shops/me/listing-editor/edit/4604358549

Actual implementation differs from the initial plan above:
- Goals.Completed is a SUM rollup of Books.Completed count. Books uses Goal year (MAX) and Goal count (COUNT) rollups; Completed count returns 1 only for Finished, non-sample books with a finish date matching the sole linked goal year. The nested relation-filter formula proposed above was rejected and is NOT used.
- Entry check flags negative/over-total pages, missing finish date, multiple goals, goal-year mismatch and ratings outside 1–5. Started-after-Finished validation is not implemented.
- Native New book template is the default across Books views. Its quote capture instructions are present; a newly created record's quote-view rebinding was not independently verified.
- Home has Currently reading, TBR and Goals inline views. Library includes Finished and Paused/DNF views; do not promise an extra dynamic Finished-this-year home view.
- Root artwork is an inline image, not a native page cover. Notion supports its own native interface styles.
- Browser QA verified 40% / 144 pages left, safe zero totals, input flags,100% clamping, year mismatch exclusion, sample exclusion,1/12 goal count with11 remaining, and safe zero target. Native iOS/Android and narrow mobile layout were not tested.
- Final delivery: one clickable access PDF using the owner's adapted PNG design and embedded fonts. No buyer ZIP or Drive link is needed for this Notion product.
- Ten separate 4000×3000 ads use real screenshots scaled into the layouts. These are not native4K app captures. Ads were individually displayed and reviewed; ads are Etsy-only and excluded from buyer files.
- Saved draft was reopened:10 images,1PDF,EUR9.90,999 quantity,13tags≤20 characters,instant download,manual renewal,no partner. Both AI/original creation radios remain blank for owner review; decorative AI artwork is disclosed truthfully in the description.

## Official references
https://www.notion.com/help/duplicate-public-pages
https://www.notion.com/help/import-data-into-notion
https://www.notion.com/help/relations-and-rollups
https://www.notion.com/help/formula-syntax
