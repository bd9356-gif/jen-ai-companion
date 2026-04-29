<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MyRecipe Companion — Project Brief

A **cozy, modern cooking companion** that blends a personal recipe vault, guided learning, and an AI chef who's always ready to help. For **home cooks** who want a simple, confidence-building way to save recipes, learn skills, and get AI help in the kitchen.

Repo: `bd9356-gif/jen-ai-companion`
Deploy: Vercel → **`recipe.mycompanionapps.com`** (production — the Recipe-specific subdomain). `www.mycompanionapps.com` is a *separate* Next site (the MyCompanionApps hub at `/sessions/epic-upbeat-ritchie/mnt/my-companion-apps/`), which lists Recipe + Golf + NET as tiles. Do not confuse the two — `www` does NOT serve the Recipe app and never has. The original Vercel URL `jen-ai-companion.vercel.app` is kept allow-listed during the transition.
Mobile-first (`max-w-lg` / `max-w-2xl` container widths throughout).

## Stack

- **Next.js 16** (App Router) — the AGENTS.md block above is real: APIs have drifted from older Next.js; check `node_modules/next/dist/docs/` before writing anything novel.
- **React 19**
- **Tailwind CSS v4** (with `@tailwindcss/postcss`)
- **Supabase** (auth + Postgres) — client in `lib/supabase.js`, also instantiated inline at the top of most pages.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — used in API routes and ingestion scripts. Current model in use: `claude-haiku-4-5-20251001`.
- **ESLint 9** / `eslint-config-next`.

## Brand & Naming

Brand voice is **cozy, modern, confidence-building**. User is **home cooks** who want a simple, cozy way to save recipes, learn skills, and get AI help.

The hub still uses **MyKitchen** (it's the one "My" we kept). All other nav labels were simplified — use them exactly:

| Name                   | Route         | What it is                                                         |
| ---------------------- | ------------- | ------------------------------------------------------------------ |
| MyKitchen              | `/kitchen`    | The hub page. Everything routes from here.                          |
| Recipe Vault           | `/secret`     | Your permanent, organized recipe collection.                        |
| Recipe Cards           | `/cards`      | Card-style recipe browser (swipe / pick).                           |
| Chef TV                | `/videos`     | Cooking videos (YouTube-backed). Learn Your Way classroom #2 (video instructor). |
| Chef Jennifer          | `/chef`       | AI chef + instructor — 🎓 Teach teaches, 🍳 Practice makes a recipe. Learn Your Way classroom #1 (AI instructor). |
| Guides                 | `/guides`     | The Library — curated reference articles by topic.                  |
| My Playbook            | `/playbook`   | Saved videos (Teach / Practice) + Chef Recipes + Chef Notes. Your Learn Your Way practice book. |
| Chef Notes             | `/playbook`   | Saved AI answers — a section on Playbook. `/chef-notes` redirects.  |
| Chef Jennifer Recipes  | `/playbook` (✨ Recipes tab) | Recipes Chef Jennifer made for you; save-to-vault from here. `/chef-recipes` redirects. |
| Meal Plan              | `/meal-plan`  | 3 buckets of "what you're cooking soon".                            |
| Shopping List          | `/shopping-list` | Ingredients grouped by store; AI cleanup / copy / print.         |

All tiles route to dedicated pages. `/picks` is retired as of Phase 2C — it's now a thin server-side redirect that forwards `/picks` → `/kitchen` and old `?open=<key>` bookmarks to their new homes (see the **IA restructure roadmap** below).

Other routes: `/education` (learning videos), `/weeklyplan`, `/recipes`, `/browse`, `/about`, `/profile`, `/login`, `/auth`, `/not-found`.

## IA restructure roadmap (April 2026)

MyKitchen moved from a 3-section (Your Cooking Life / AI Kitchen / Explore) layout with 5 tiles to a **4-section, 9-tile** layout. Bill's framing: "Separate cupboards, separate bowls — each thing with its place. It reminds me of my mother's way of cooking."

The rollout is phased so no single commit drops a huge amount of unreviewed code:

- **Phase 1 (shipped).** Rewrite `app/kitchen/page.js` with the new sections/tiles and a unified orange left stripe. Add a `?open=<key>` handler on `/picks` so five of the tiles (Meal Plan, Shopping List, Chef Notes, Skills I Learned, Chef Jennifer Recipes) deep-link straight to the right section on that still-combined page. This is a **bridge** — the hub looks finished immediately, the underlying pages catch up in Phase 2.
- **Phase 2A (shipped).** Extract four dedicated pages from `/picks` — `/meal-plan`, `/shopping-list`, `/chef-notes`, `/chef-recipes` — each a focused, single-purpose screen. Hub tiles updated to point at the real routes. Shared row components live in `components/ExpandableItem.js`, `components/ChefJenItem.js`, `components/VideoItem.js`, `components/ShoppingByStore.js` (which also exports `StoreEditor`) so both the old `/picks` page and the new dedicated pages stay in sync.
- **Phase 2B (shipped, later pivoted).** Initially shipped Skills I Learned at `/skills` with six course-type buckets (📥 The Starter, 🍳 Breakfast, 🍽️ Mains, 🥕 Sides & Veg, 🥖 Baking, 🍰 Desserts). Bucket assignments live in `cooking_skill_items` (migration `supabase/002_cooking_skill_items.sql`). This was **retired in April 2026** — see "My Playbook pivot" below. `/skills` is now a server-side redirect to `/playbook`; the `cooking_skill_items` table was migrated via `supabase/003_playbook_buckets.sql` to use the new intent-based buckets (Save/Love/Cooked/Learn).
- **Phase 2C (shipped).** Retire `/picks` entirely. `app/picks/page.js` is now a server-side redirect — it forwards the plain route to `/kitchen` and each of the five old `?open=<key>` bookmarks to the matching dedicated page (see "`/picks` redirect" below). The combined `/picks` UI (and its `loadAll` etc.) is gone; behavior that lived there now lives in `/meal-plan`, `/shopping-list`, `/chef-notes`, `/chef-recipes`, and `/playbook` (formerly `/skills`).
- **Phase 3 (reverted, reopened).** First attempt folded `/cards` into `/secret` as a list/card view toggle — that was **wrong** (see "Recipe Cards concept" below). A Card is its own object, not a visual mode of a recipe. Reverted in commit `2e211bc`. Still to do: decide whether a separate `/cards` page is the right home going forward or if the Card concept lives as something else. Also still to decide whether to keep `/chef-recipes` as its own page or fold it into Recipe Vault as a filter — picking once there's usage signal.
- **Phase 4 — Cooking School (April 2026, shipped).** Bill's framing after using the app deeply: Chef Jennifer has been sitting in her own MyKitchen section as a recipe generator, but she's *also* the AI instructor — she belongs *inside* Learn, not next to it. Renamed Learn to **Cooking School** and folded Chef Jennifer in as the second classroom. Added **Guides** (the Library) as a new tile, mirroring Golf's `/guides`. Final structure: 3 sections / 9 tiles. Cooking School order is fixed: Chef TV → Chef Jennifer → Guides → My Playbook ("two classrooms, a library, and your notebook"). Phased rollout — 1A added the `/guides` page + `recipe_articles` table without wiring (so it could land alone), 1B seeded 12 starter articles (2 per topic), 1C did the MyKitchen 4→3 restructure + Guides tile + this AGENTS.md update.

Phase 2 did not do a naming sweep of downstream pages — Ask Chef Anything still says "Ask Chef Anything" in places, for example. Those get swept as each page is touched in later phases.

## Kitchen navigation sections

These live in `app/kitchen/page.js`. MyKitchen is **2 sections and 8 tiles** total (after the April 2026 Cooking Life / Learn Your Way reframe). All tiles use a unified **orange left stripe** (brand color) — `border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-2xl` — mirroring Golf's green-stripe Clubhouse pattern.

Section headers are small orange uppercase labels with a one-line section subtitle below, followed by the section's tiles.

### Section structure

1. **Cooking Life** — "Your recipes, your plan, your essentials." Everything the user *does* in the kitchen — saving recipes, planning meals, shopping for them. Plain tile names ("Recipe Vault", "Meal Plan").
   - 🔐 Recipe Vault → `/secret` — "Your saved recipes, organized."
   - 🃏 Recipe Cards → `/cards` — "Your mom's style cards."
   - 📅 Meal Plan → `/meal-plan` — "What you're cooking soon."
   - 🛒 Shopping List → `/shopping-list` — "Ingredients, organized to shop."

2. **Learn Your Way** — "An AI-powered cooking school." Everything that helps the user *get better* in the kitchen — Chef Jennifer (AI instructor) leads, then Chef TV (video classroom), then Your Library (reference articles), then My Playbook (the practice book). Tile names are plain ("Chef Jennifer", "Your Library", "My Playbook") — no "Name — Role" pattern — and descriptions are slightly longer one-liners that say what the surface DOES. Order locked: Chef Jennifer leads (the AI instructor — the most personal teaching surface), then Chef TV (video classroom), then Your Library (the library), then My Playbook (the user's practice book).
   - 👨‍🍳 Chef Jennifer → `/chef` — "Learn, practice, improve with AI." **Classroom #1 — AI instructor.**
   - 🎬 Chef TV → `/videos` — "Learn and cook with chefs on video." **Classroom #2 — video instructor.**
   - 📚 Your Library → `/guides` — "Core knife skills, techniques, and cooking fundamentals." **The Library.**
   - 📘 My Playbook → `/playbook` — "Your saved lessons, recipes, videos, and notes." **The practice book — destination for all saves.**

**Tile description rhythm.** Cooking Life descriptions stay short (~25–30 chars) so they fit one phone line under `truncate` — short, punchy, scannable, mirroring Golf Clubhouse's tile rhythm ("Every lesson, one tap away." / "Notes, tips, tee times."). Learn Your Way descriptions are slightly longer one-liners that describe what the surface DOES — the Cooking Life rhythm doesn't fit teaching surfaces, where the action is the value (e.g. "Core knife skills, techniques, and cooking fundamentals." reads better than a 25-char tagline that has to drop the substance). The earlier "Name — Role" pattern descriptions (e.g. "Learn directly from Chef Jennifer — your personal AI cooking teacher.") were 58–70 chars and `truncate`'d on iPhone — the current descriptions are tuned to fit without truncation while still saying something concrete.

**Reframe history (April 2026).** The hub used to read as three flat groups (Your Recipes / Plan & Shop / Cooking School). Once Chef Jennifer + Chef TV + Library + Playbook were all locked together under one Learning section, the symmetry tipped — *all* the cooking-life surfaces (saving + planning + shopping) belong together too. So the hub is now two halves of the same story: **Cooking Life** (what the user does) and **Learn Your Way** (how the user gets better). Inside Learn Your Way, Chef Jennifer was promoted from second tile (after Chef TV) to first — she's the AI instructor and the most personal teaching surface, so she leads the column. The section was originally labeled "Learning Journey" with subtitle "Your classrooms, your library, your practice book." — renamed to "Learn Your Way / An AI-powered cooking school." (April 2026) because the cooking-school framing reads more concrete than the abstract "Journey" metaphor and "An AI-powered cooking school" telegraphs the section's purpose at a glance. Same tiles, same order, just simpler framing.

**Title format note.** Both groups now use plain tile names — no "Name — Role" pattern. Cooking Life tiles ("Recipe Vault", "Meal Plan") have always been plain because *what they are* and *what they do* collapse to the same thing. Learn Your Way tiles ("Chef Jennifer", "Chef TV", "Your Library", "My Playbook") were briefly em-dashed ("Chef Jennifer — Your Instructor", "Guides — Your Library") to carry teaching framing the plain names couldn't, but the role-labels added visual noise without enough payoff once the descriptions started doing the work — reverted to plain names (April 2026). The "Guides" tile was also renamed to **"Your Library"** in the same pass (route stays `/guides`) because "Your Library" reads as the *thing it is* on the hub, while "Guides" needed the em-dash role-label to communicate.

### `/picks` redirect

`app/picks/page.js` is a server component that calls `redirect()` from `next/navigation`. It reads `searchParams.open` (awaited — Next 16 pattern) and maps old keys to new routes:

| `?open=` value     | Destination        |
| ------------------ | ------------------ |
| `meal_plan`        | `/meal-plan`       |
| `shopping_list`    | `/shopping-list`   |
| `ai_notes`         | `/playbook`        |
| `chefjen`          | `/playbook`        |
| `chef_videos`      | `/playbook`        |
| (missing/unknown)  | `/kitchen`         |

This preserves old bookmarks while the combined `/picks` page is gone. If/when we're confident no one is hitting these URLs anymore, delete `app/picks/` outright and Next will 404.

### Phase 2A pages (new as of April 2026)

Each of the four new pages is a focused single-screen experience, matching MyKitchen's aesthetic (sticky header, orange accents, mobile-first `max-w-2xl` container, toast system, auth gate).

- **`app/meal-plan/page.js`** — renders three bucket frames (⭐ To Make amber / 📋 Maybe violet / 🗂 Later sky). Data in `my_picks` keyed by `bucket`. Per-item move buttons show the *other* two bucket colors as cues for where the item would go. Empty state offers shortcut buttons to Recipe Cards and Recipe Vault.
- **`app/shopping-list/page.js`** — uses the shared `<ShoppingByStore>` grid, the shared `<StoreEditor>` (shown inline via `showStoreEditor` toggle), plus a full action bar in the card header: 🏬 Manage Stores, ✨ Clean Up List (calls `/api/cleanup-list`), 📋 Copy (clipboard), 🖨️ Print (popup window). "Clear All" lives on the right. All the existing `/picks` behaviors (grouped-by-store render, unsorted bucket, per-item store reassignment, AI cleanup with `recipe_title` discard, plain-text export sorted by `stores.sort_order`) are preserved because the heavy logic lives in the shared components plus the helpers duplicated here (`buildShoppingListText`, `cleanUpList`).
- **`app/chef-notes/page.js`** — chronological list of saved AI answers (`favorites` where `type='ai_answer'`). Each row uses `<ExpandableItem>` which opens in place to show the full answer. Header action points at `/chef`. Empty state encourages asking a question and saving it.
- **`app/chef-recipes/page.js`** — list of Chef Jennifer recipes (`favorites` where `type='ai_recipe'`). Each row uses `<ChefJenItem>`, which expands to show cuisine/difficulty chips, ingredients, numbered instructions (rendered as `<ol>`), and a 💾 Save to Recipe Vault button. `saveToVault(item)` inserts into `personal_recipes` with the recipe's description moved into `family_notes` (prefixed, blank line, then `Saved from Chef Jennifer.`) and an empty `description`, normalizing ingredients to `{name, measure}` shape, and running instructions through `instructionsToString()` so steps land on separate lines. Header action points at `/chef`.

### Shared row components (new as of April 2026)

Factored out of `app/picks/page.js` so both `/picks` and the Phase 2A pages render identical rows:

- `components/ExpandableItem.js` — one saved AI answer. Props: `item`, `emoji`, `onRemove`. Toggle-open reveals `metadata.answer`.
- `components/ChefJenItem.js` — one saved Chef Jennifer recipe. Props: `item`, `onRemove`, `onSaveToVault`. Renders measure + name for each ingredient; bolds measures when present.
- `components/VideoItem.js` — one saved Chef TV video thumbnail with play-to-embed behavior (used by `/playbook`).
- `components/ShoppingByStore.js` — the grouped-by-store grid. Default export: `ShoppingByStore`. Named export: `StoreEditor` (inline store manager — add/edit/remove with emoji + website URL). Internal helper: `StoreRow`.

`/picks` was retired in Phase 2C — the shared components above are used by the dedicated pages (`/meal-plan`, `/shopping-list`, `/chef-notes`, `/chef-recipes`, `/playbook`).

### My Playbook (`/playbook`)

**Pivot from Skills I Learned (April 2026).** The original Skills I Learned used six course-type buckets (Starter / Breakfast / Mains / Sides & Veg / Baking / Desserts). Bill's read: sorting cooking videos that way is impossible because videos don't cleanly fit course types — a single video is often a main AND a technique AND a weeknight thing. The buckets asked *what kind of food is it?*, but the question the user can actually answer at save time is *what do I want to do with this?*

My Playbook replaces course-type buckets with **intent-based** buckets, and consolidates Chef Notes (saved AI answers) into the same page so Playbook is the single home for everything a user has saved.

**3 → 2 bucket collapse + Chef Notes merge (April 2026).** After shipping with Save/Love/Learn, Bill flagged that Save — the "I haven't decided yet" middle — didn't add any real signal: every Chef TV video is either a recipe (→ Practice) or a technique (→ Teach), and forcing a third non-committal choice just gave users a place to stash things and forget them. Dropped Save. At the same time, the standalone `/chef-notes` page was folded into Playbook as a third section — same data (`favorites.type='ai_answer'`), different surface. "One place for everything I've saved" replaced two separate pages.

**Love → Practice + Learn → Teach rename (April 2026).** Bill's read after using the 2-bucket version: "Love" was the wrong word — it suggested favorites/saved/liked/emotion, when the actual meaning is "a recipe to *cook*". And the visual order was wrong: Teach is what Chef Jennifer does *first* (instruction), then the user goes to Practice (the lab). The vocabulary was renamed across Chef TV, Chef Jennifer, and Playbook so the same two words mean the same two things everywhere. Visual order is locked: **Teach first, Practice second**. Migration `supabase/009_rename_buckets.sql` updates `cooking_skill_items.bucket` values (`love → practice`, `learn → teach`), swaps the CHECK constraint to `('practice','teach')`, and changes the default to `'teach'`.

| Key        | Emoji | Section     | Meaning                                                | Color  |
| ---------- | ----- | ----------- | ------------------------------------------------------ | ------ |
| teach      | 🎓    | Teach       | Techniques to master. (technique / video-only)         | sky    |
| practice   | 🍳    | Practice    | Recipes to cook. (recipe videos)                       | orange |
| chef_notes | 📝    | Chef Notes  | Saved answers from Chef Jennifer.                      | amber  |

Header tagline: **"Teach it → Practice it → Note it"** (joinery arrows, `text-2xl sm:text-3xl font-bold`). Subline: "All your saved content — from videos to chef guidance." The three pieces are connected stages of the same save habit, not three unrelated tabs — the arrows are the visual shorthand for that.

Below the tagline, a slate callout spells out each surface in Bill's exact wording, one sentence per bucket on its own line so it scans as a legend, not a paragraph: "🎓 **Teach** is where you save techniques to master. / 🍳 **Practice** is where you keep recipes to cook. / 📝 **Chef Notes** is where you save the answers and guidance you get from Chef Jennifer."

No rename / reorder / delete — locked, like Golf's MyBag. All colors are written as complete literal Tailwind class strings in `app/playbook/page.js` (`COLOR` map for Teach/Practice, `NOTES_COLOR` for Chef Notes) and `app/videos/page.js` (`PLAYBOOK_BUCKETS`) so v4's JIT scanner picks them up. Practice uses orange (the brand color) because Practice is the user's primary action surface; Teach keeps sky.

**Save-at-source UX — single contextual button (April 2026).** Chef TV video cards no longer show a 3-button Save / Love / Learn strip. Instead, each card shows **one** full-width save button whose label depends on the video's content: video-only items get 🎓 **Save to Teach**, recipe-bearing videos get 🍳 **Save to Practice**. One tap saves; tap again to remove. The choice is binary because the content is binary — no third "Save for later" option. Inactive: white with gray border. Active: filled tab color (sky for Teach, orange for Practice) with label "Saved to Teach" / "Saved to Practice".

**Chef Notes section on `/playbook`.** Rendered below the Teach and Practice buckets, with amber header/body and the 📝 emoji. Row template is `<ExpandableItem>` (same component as the old `/chef-notes` page). No move/bucket UX — Chef Notes isn't a bucket, it's a separate kind of save (AI answers, not videos). Remove button deletes from `favorites` like before. Empty state links to `/chef` (Ask Chef Jennifer) so users know where the answers come from.

**`/chef-notes` retired.** `app/chef-notes/page.js` is now a thin server-side redirect to `/playbook`. The Ask Chef Jennifer save flow (`/chef`) still writes to `favorites` with `type='ai_answer'` unchanged — only the surface moved. The "Saved to Chef Notes" button label on `/chef` stays because Chef Notes is still the conceptual name for that content.

**Practice + recipe → ingestion capture (important).** When a user hits 🍳 Practice on a video that has a recipe (`video_metadata.ingredients` non-empty), `setBucket()` also writes a row to `loved_recipe_urls` (user_id, favorite_id, video_id, youtube_id, youtube_url, title, channel). Moving away from Practice deletes that row. Toggling Practice off deletes it. Pure backend signal capture — no user-facing surface. The table name `loved_recipe_urls` is historical (predates the rename) and stays — it's never exposed to users. The table is for curation: which recipes are resonating so we can improve metadata or add them to the curated pool.

**Data model.** Same `cooking_skill_items` table (videos only). Migration history:
- `supabase/002_cooking_skill_items.sql` — created the table with six course-type buckets.
- `supabase/003_playbook_buckets.sql` — collapsed the six into `save`, installed CHECK for `save/love/cooked/learn`, default `save`.
- `supabase/004_playbook_3buckets.sql` — dropped the CHECK, collapsed `cooked` rows into `save`, installed CHECK for `save/love/learn`.
- `supabase/005_loved_recipe_urls.sql` — new `loved_recipe_urls` table for the Practice+recipe capture. `favorite_id` FK cascades on delete. RLS scoped to `user_id = auth.uid()`.
- `supabase/006_playbook_2buckets.sql` — dropped the CHECK, migrated `save` rows to `love` or `learn` based on the underlying item type (recipe-bearing → love, else → learn), installed CHECK for `love/learn`, changed default to `learn`.
- `supabase/009_rename_buckets.sql` — renamed bucket values: `love → practice`, `learn → teach`. Drops the old CHECK by definition match, installs new CHECK for `('practice','teach')`, changes default to `'teach'`. Idempotent.

All migrations are idempotent — safe to re-run.

`item_type` values on `cooking_skill_items`:
- `cooking_video` — `item_id` = `cooking_videos.id` (legacy Chef TV save). Default bucket: `practice` (cooking videos are recipe-bearing by convention).
- `education_video` — `item_id` = `education_videos.id` (legacy education save). Default: `teach`.
- `favorite` — `item_id` = `favorites.id`. Covers all favorites-sourced video saves. The source's `favorites.type` still discriminates — `video_recipe` → practice default, `video_education` → teach default. AI answers (`favorites.type='ai_answer'`) are NOT stored here; they render in the Chef Notes section directly from `favorites`. The `favorites.type` strings describe the content type and stay unchanged across the rename.

**Page behavior — two-classroom tab nav.** Bill's reframe (April 2026) — the discriminator on Playbook isn't the *mode*, it's the *teacher*. Both teachers (Chef Jennifer and Chef TV) have a 🎓 Teach side and a 🍳 Practice side. So the nav is **two stacked pill rows, one per teacher**, each containing the same two pills:

```
👨‍🍳 CHEF JENNIFER     [🎓 Teach (N)]   [🍳 Practice (N)]
🎬 CHEF TV             [🎓 Teach (N)]   [🍳 Practice (N)]
```

Order is locked **Chef Jennifer first, Chef TV second** — Jen is the AI instructor and the most personal teaching surface, so she leads. Within each row, **Teach first, Practice second** matches the locked order across the rest of the app (Chef TV filter, Chef Jennifer mode pill).

Repeating "Teach" / "Practice" across rows is intentional — the row label tells you which classroom you're in, so the same words can mean different content in different rows. The four cells map to the existing tab keys (which are kept unchanged so `/chef ?tab=…` deep-links still work):

|                | 🎓 Teach              | 🍳 Practice            |
| -------------- | --------------------- | ---------------------- |
| Chef Jennifer  | `chef_notes` (amber)  | `chef_recipes` (rose)  |
| Chef TV        | `teach` (sky)         | `practice` (orange)    |

Pills are equal-width within each row; one active at a time across the whole page (only one cell of the 2×2 is selected). Active shows a filled color matching its cell; inactive pills are `bg-gray-100 text-gray-600`. Counts in parens. Default tab is **Chef Jennifer · 🎓 Teach** (top-left of the 2×2) — instruction-from-the-AI is the most personal starting point. Below the pills, only the active cell's content renders, with a color-matched framed body (`border-2` + soft tint header) so a user who scrolled past the pills still sees which cell they're in. Body headers read "Chef Jennifer · 🎓 Teach", "Chef Jennifer · 🍳 Practice", "Chef TV · 🎓 Teach", "Chef TV · 🍳 Practice" so the surface name confirms the active pill.

`loadAll` fetches the three video source tables + `cooking_skill_items` + AI-answer favorites in parallel and merges them. If the same underlying video exists in both legacy (`saved_videos`) and new (`favorites`) form, the legacy row wins (dedupe by `_item_type:_item_id`). Each video row renders via `<VideoItem>` plus a single "Move to {other bucket}" button — with only 2 buckets, the target is unambiguous and there's no submenu. Moving upserts into `cooking_skill_items`; removing deletes from the source table AND the `cooking_skill_items` row. Moving an item **auto-switches the active tab** to the destination so the user sees where it went. A slate callout above the tabs explains each surface in one sentence.

**Back-compat.** `/skills` and `/chef-notes` are server-side `redirect()` routes → `/playbook`. Old bookmarks survive.

## Guides — the Library (`/guides`)

The third Cooking School surface, alongside Chef TV (video classroom) and Chef Jennifer (AI classroom). Guides is **the Library** — curated, hand-edited reference articles that stay put. The page tagline reads "The Library / Reference reading for everything in the kitchen." Mirrors Golf's `/guides` layout intentionally — same accordion-by-topic shape so the muscle memory transfers between MyCompanionApps products.

### Topic taxonomy (locked at 6)

| Key             | Label                  | Icon | Stripe color |
| --------------- | ---------------------- | ---- | ------------ |
| `knife_skills`  | Knife Skills           | 🔪   | red          |
| `techniques`    | Techniques             | 🥘   | orange       |
| `cooking_times` | Cooking Times & Heat   | ⏱️   | amber        |
| `pantry`        | Pantry & Substitutions | 🥫   | emerald      |
| `safety`        | Safety & Storage       | 🛡️   | sky          |
| `equipment`     | Equipment              | 🧰   | stone        |

Adding a 7th topic later requires bumping the CHECK constraint in `supabase/007_recipe_articles.sql`. Six was deliberate — same logic as Golf's six skill topics: enough breadth to cover the kitchen, few enough to fit on one mobile screen as collapsed accordions.

### Page behavior

- All sections start **collapsed** on first open. Tap a header to expand. Inside an expanded section, articles also start collapsed; tap an article row to read it inline. Two-level accordion, scan-first design — same pattern as Golf's `/guides`.
- Per-topic color appears on the **outer left stripe** (`border-l-8`), the section header background when open, the title text, the count pill, and a soft body tint. All Tailwind classes are written as complete literal strings in `TOPIC_COLORS` so v4's JIT scanner picks them up — no dynamic concat.
- Header: `← Back` (returns to MyKitchen), `📚 Guides` + count pill, and a `Chef TV` shortcut on the right (the most likely cross-link).
- Empty state: "📚 The library is being stocked." — only shown if `recipe_articles` is empty (which should never happen post-008 seed).

### Markdown renderer (v1)

`renderMarkdown(text)` in `app/guides/page.js` handles the minimal subset:

- `## Header` → `<h2>` with article-level styling
- `**bold**` → `<strong>`
- `\n\n` → paragraph break (`</p><p class="mb-4">`)
- `\n` → `<br/>`

The whole string is wrapped in `<p class="mb-4">…</p>` at render time. **Lists, links, blockquotes, and code blocks are NOT supported in v1.** Bullet lines authored as `- **Term**: definition` still render readably (the dash carries the visual, the bold survives, line breaks via `<br/>`). When we want real `<ul>/<li>`, upgrade the renderer; don't try to fake it with HTML in the article body.

### Data model

- **Table:** `recipe_articles` (id uuid, title text, summary text, content text, topic text, read_time_minutes int, created_at timestamptz). Migration `supabase/007_recipe_articles.sql` — idempotent, includes the 6-topic CHECK, indexes on topic + created_at desc, RLS read-only for authenticated.
- **Writes:** the app never inserts directly. Articles are added via service-role-keyed migrations (`supabase/008_seed_recipe_articles.sql` is the initial seed of 12 starter articles, 2 per topic). Future article additions ship as additional `0NN_*.sql` migrations. Editing an existing article ships as an `UPDATE` migration, not by mutating the original seed.
- **Idempotency on the seed:** 008 adds a unique index on `title` and uses `ON CONFLICT (title) DO NOTHING`, so re-running the seed is a no-op once the rows exist.

### Why Guides exists separately from Chef Jennifer

Chef Jennifer answers questions on demand and creates recipes — she's *generative*. Guides is *curated reference* — the stuff we want every cook to know that doesn't change. When a user asks "how long does pork last in the fridge?" Chef Jennifer can answer, but the user gets a better experience reading the curated leftovers article once and remembering it. Guides is the *durable* learning surface; Chef Jennifer is the *immediate* one. Both belong in Cooking School.

## Meal Plan buckets (`/meal-plan`)

Meal Plan organizes saved recipes into three buckets and color-codes them consistently across the page (frames + move-to buttons):

| Bucket  | Emoji | Meaning                        | Color  |
| ------- | ----- | ------------------------------ | ------ |
| To Make | ⭐     | Your main focus for now.       | amber  |
| Maybe   | 📋     | If you get to them.            | violet |
| Later   | 🗂     | Still saved, not forgotten.    | sky    |

Borders use `border-2` with `-400` shade for emphasis. Each item's move buttons show the *other* two bucket colors as cues for where the item would go.

**Drag-to-reorder within each bucket (April 2026).** Ordering meals inside a bucket uses drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable`. Each bucket renders its own `<SortableContext>` with `verticalListSortingStrategy`, so drags are **bucket-local** — you can't pull an item out of "To Make" into "Maybe" by dragging. Cross-bucket moves stay on the existing colored emoji buttons, where a user can't misfire with a finger slip. Rows get a dedicated `⋮⋮` drag handle on the left (touch-friendly, keyboard-accessible); the title itself stays a plain link so tapping a meal still navigates to `/secret?recipe=…`. Sensors: `PointerSensor` with an 8px activation distance (prevents accidental drags while tapping move buttons) and `TouchSensor` with a 150ms delay + 5px tolerance (lets mobile users scroll past rows without triggering a drag). On drop, `handleDragEnd` optimistically reorders local state and dispatches parallel `UPDATE my_picks SET sort_order = <idx>` batches for every row in the affected bucket (dense 0..n-1 numbering). `loadPicks` reads `ORDER BY sort_order ASC` so the persisted order survives refresh. `my_picks.sort_order` already existed on the schema — no migration.

## Shopping List detail (`/shopping-list`)

- **Grouped by store.** `<ShoppingByStore>` renders items bucketed by `store_id`. Items with a null `store_id` land in a final "📦 Unsorted" group (hidden when empty). Each group shows `{emoji} {name}` + count; stores with a `website_url` show an "Open ↗" button opening it in a new tab. Every row has a small `<select>` to reassign the item to a different store (or Unsorted) via `setItemStore(itemId, storeId)`.
- **Inline "Manage Stores" editor.** The 🏬 Manage Stores toggle in the card header shows `<StoreEditor>` in place — add (name + emoji + optional website URL), rename, change emoji/URL, or remove. Removing a store soft-detaches items (they drop back to `store_id = null` both in-memory and via the DB's `on delete set null` cascade).
- **AI cleanup — ✨ Clean Up List.** A purple **✨ Clean Up List** button (next to 🏬 Manage Stores) calls `cleanUpList()` in `app/shopping-list/page.js`, which POSTs the current list + stores to `/api/cleanup-list`. The route asks `claude-haiku-4-5-20251001` to (1) round fractional purchasables up ("1/4 can tomato paste" → "1 can tomato paste"), (2) strip cooking-only measures (tsp/tbsp/pinch/dash/clove/sprig/"to taste"), (3) merge duplicates, and (4) preserve `store_id` when merges agree, setting it to `null` when they conflict. The handler confirms, wipes `shopping_list` for the user, and reinserts cleaned rows (`recipe_title` is intentionally discarded). Server-side, invalid `store_id` values are dropped. Button shows "✨ Cleaning…" and disables while in-flight.
- **📋 Copy / 🖨️ Print.** `copyShoppingList()` builds a grouped plain-text version via `buildShoppingListText()` — a "Shopping List" header, then each store block (`{emoji} {name}` or `📦 Unsorted`) with `[ ]` / `[x]` checkboxes per row, sorted by `stores.sort_order`. It writes to the clipboard via `navigator.clipboard.writeText` with a toast fallback suggesting Print if blocked. `printShoppingList()` renders the same text into a hidden in-page container (`#print-shopping-list`) and triggers `window.print()` on the current window — no popup. An `@media print` block hides the rest of the page (`body * { visibility: hidden !important }`) and reveals only the print container. The container is cleared on the `afterprint` event (with a 5s safety fallback) so dismissing the print sheet leaves the user back on the live page. **Why no popup.** The original `window.open('', '_blank')` approach got stuck behind the app on iOS Safari — closing the print preview without printing left a hidden window that only a phone restart could clear. In-page printing avoids the popup lifecycle entirely. Both Copy and Print render only when `shoppingList.length > 0`.

## Chef Jennifer Recipes — folded into My Playbook (April 2026)

The standalone `/chef-recipes` page was retired and the recipes Chef Jennifer makes are now a **fourth tab on `/playbook`** (✨ Recipes, rose-colored). Same precedent as Chef Notes: data shape unchanged (`favorites.type='ai_recipe'`), only the surface moved. `app/chef-recipes/page.js` is now a server-side `redirect('/playbook')` and the `/picks?open=chefjen` redirect target was updated to `/playbook`. The MyKitchen tile for "Chef Jennifer Recipes" was removed (Your Recipes section dropped 3 → 2 tiles); the Playbook tile description was rewritten to "Saved videos, chef recipes, chef notes."

**Why fold in.** Bill's framing: "All saves under one roof." With Chef Notes already living in Playbook, leaving Chef Recipes as its own page split the AI's output across two surfaces. Now everything Chef Jennifer produces lives next to everything Chef TV produces in the same notebook.

**Color choice — rose for the Recipes tab.** Practice (cooking-video saves) is orange because it's the user's primary Chef-TV cooking action; Chef Recipes (AI-generated recipes) needed its own color so a quick glance tells the user which kind of recipe surface they're looking at. Two recipe surfaces, two colors.

**Tab pill row is now 4-up — see "two-classroom tab nav" above.** Originally shipped as a single flat row of four pills (🎓 Teach → 🍳 Practice → ✨ Recipes → 📝 Notes). Bill flagged that the four shared pills had no "where am I" anchor — same words and emojis (Teach / Practice) were doing double duty without any cue that one Teach was AI and the other was video. Re-laid-out as **two stacked teacher rows** (Chef Jennifer first, Chef TV second), each containing 🎓 Teach + 🍳 Practice pills. The four cells are the same four tab keys (`chef_notes`, `chef_recipes`, `teach`, `practice`) — only the visual grouping changed. Default is Chef Jennifer · 🎓 Teach (top-left of the 2×2). Cell colors: Jen Teach = amber, Jen Practice = rose, TV Teach = sky, TV Practice = orange.

**Recipes tab body.** Renders `<ChefJenItem>` rows (same component used by the old `/chef-recipes` page). Props/handlers ported into `app/playbook/page.js` as `removeRecipe(item)` and `saveRecipeToVault(item)` — the latter inserts into `personal_recipes` with ingredients normalized to `{name, measure}` shape, instructions through `instructionsToString()`, and the recipe's description moved into `family_notes` (prefixed, blank line, then "Saved from Chef Jennifer.") with the Vault `description` set to empty. Same logic as the original `/chef-recipes` saveToVault.

**ChefJenItem renders measures.** Each ingredient is `{measure} {name}` — string ingredients render as-is, and `{name, measure}` objects bold the measure.

**Instruction normalization.** Chef Jennifer's prompt occasionally returns instructions as a numbered blob (`"1. Dice onion. 2. Heat pan."`), sometimes as an array, sometimes as a newline string. Both `saveRecipe` on `/chef` (🍳 Practice mode) and `saveRecipeToVault` on `/playbook` run the value through `instructionsToString()` from `lib/normalize_instructions.js`, which strips leading numbering, splits on `\n` or `\s\d+[\.\)]\s` boundaries, trims, and rejoins as a clean newline-separated string. `<ChefJenItem>` parses the same way on render and emits an `<ol>` — saved rows and live model output both render as numbered steps on separate lines.

**Data fetch.** `loadAll` on `/playbook` now fetches AI-recipe favorites in the same parallel `Promise.all` as the video tables, articles, and AI-answer favorites: `supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_recipe').order('created_at', { ascending: false })`. Result is held in a `recipes` state slot independent of `byBucket` (recipes aren't a bucket — they're a separate kind of save, like Chef Notes).

**Header tagline rework.** Tagline is "Everything you've saved" with subline "Your notebook from Chef Jennifer's classroom and Chef TV's." The slate callout below explains the structure in three short paragraphs: a two-teachers-with-the-same-two-modes intro, then one paragraph per teacher describing what to save in their Teach vs Practice. (Earlier subline "Videos, chef recipes, and chef notes — all in one place." was retired when the layout moved to the two-classroom model — listing the four content types undercut the simpler "two teachers" frame.)

**`/chef-recipes` redirect.** `app/chef-recipes/page.js` now contains a single `redirect('/playbook')` plus a comment header explaining the fold-in. Old bookmarks survive.

## Chef TV (`/videos`)

**Education-first framing (April 2026).** Chef TV is for learning, not shopping. Of the ~700 curated videos, only ~160 carry recipe metadata. The page is designed so users default to *watching and learning*; recipe content is secondary and surfaces only when the user opts in.

**Simplified filter strip.** Previously had category chips (cuisines/dishes/proteins/meals/style), sort dropdown, shorts toggle, and channel — plus a `🎛 Filters` panel toggle. All of that was pared down to what home cooks actually use:

- **🔍 Search toggle.** A single circular button in the header. Tapped, it reveals a full-width search input (auto-focus). Tapped again (or ✕), input clears and hides. Matches the Recipe Vault / Cards pattern. Input uses `style={{ fontSize: '16px' }}` to block iOS Safari auto-zoom.
- **Teach / Practice binary pill row (default: Teach).** Two equal-width buttons. `🎓 Teach` (sky) shows only the ~400 video-only items; `🍳 Practice` (orange) shows only the ~158 recipe-bearing videos. Counts in parens. **Teach is the default on page load** — Teach leads in the visual order across every surface (Chef TV, Chef Jennifer, Playbook), so the user lands on instructional content first and steps to Practice when they're ready to cook. The tab vocabulary deliberately matches the Playbook save buckets (🎓 Teach / 🍳 Practice) so the filter and the save strip speak the same language. An earlier version had a third `All` tab for the full firehose; it was dropped (April 2026) because every video is either a recipe or it isn't, and the two tabs together cover everything — a neutral firehose just let users skip the choice the app is trying to make.
- **Topic chips — per-tab shortcut sets (no channel dropdown).** The old full-width `<select>` channel dropdown is retired. Below the pill row, Teach and Practice each show their own horizontally-scrollable row of topic chips. One chip active at a time; active chip uses the tab's color (sky for Teach, orange for Practice); inactive chips are white with a gray border. Chip filter is a regex match against the video **title** — we don't have a proper tag/topic column, so it's keyword-based and tuned empirically. Constants in `app/videos/page.js`:
  - `TEACH_CHIPS`: ⭐ Featured · All · 🔪 Knife · 🥚 Eggs · 🥩 Meat · 🍞 Baking · 🧂 Season · 📚 Basics. Default: Featured.
  - `PRACTICE_CHIPS`: All · 🍝 Pasta · 🍕 Pizza · 🥗 Salad · 🍲 Soup · 🥩 Meat · 🐟 Fish · 🍞 Bread · 🍰 Sweet. Default: All.
  - Changing tabs resets the chip to the tab's default (see `setFilter` onClick). Switching from Teach → Practice lands on All, not on whatever Teach chip was active.
  - **⭐ Featured** is a special chip on Teach (not a keyword filter). It slices the post-sort list to `FEATURED_CAP = 15` so newcomers land on "what's good" instead of "what's next." All other Teach chips apply keyword matching to the full Teach set.
  - The channel dropdown was removed because (a) the search input already matches channel text, so chef-specific queries work via 🔍, and (b) channel × Teach/Practice combos created "this chef has 1 recipe" sparse states that felt weak. Topic chips route around this by filtering on what the video *is about*, not who made it.

**Tab-aware sort — each tab highlights its own "best."** The default sort changed from raw view_count to a tab-specific score:
- Inside **Practice** (`practiceScore`), videos are sorted by `log10(view_count) × completeness`, where completeness = `1.3× if ingredients+instructions both present` × `1.15× if ai_summary present`. Net effect: fully-documented recipes with decent view counts float up; bare recipes with just ingredients sink even if popular.
- Inside **Teach** (`teachScore`), videos are sorted by `log10(view_count) × teachBoost`, where `teachBoost = 1.5×` for channels in `TEACHING_CHANNELS` (Ethan Chlebowski, Brian Lagerstrom, ATK, Serious Eats, Food Wishes, Adam Ragusea, Pro Home Cooks, Internet Shaquille). Entertainment-heavy channels are still visible — they just don't lead.
- log10 of view count compresses the long tail so a 10× view count is worth +1 point, not 10× weight — a multiplier on quality can outweigh raw popularity.

Dropped entirely: category chips (`CATEGORY_GROUPS`), sort dropdown (hardcoded to view_count desc), shorts toggle (always filters out <3 min).

**Single contextual save button.** Under the thumbnail on every card, one button whose identity depends on the video: `🎓 Save to Teach` for video-only items, `🍳 Save to Practice` for recipe-bearing videos (`hasRecipe`). Tap to save into that bucket; tap again to remove. There is **no chooser** — the card already knows what the video is, so we pick the right bucket for the user. Matches the Chef TV filter vocabulary (Teach = video-only, Practice = recipe) so the save destination never contradicts the filter the user came from. See "Save-at-source UX" under My Playbook above.

**💾 Save to My Kitchen (recipe videos only).** Inside the expanded Recipe view (`isExpanded && hasRecipe`), after the Ingredients and Instructions blocks, an orange button `💾 Save to My Kitchen` calls `saveToKitchen(video)` which inserts into `personal_recipes`:
- `title = video.title`, `description = meta.ai_summary || ''`
- `ingredients = meta.ingredients` (already `{name, measure}` shape), `instructions = meta.instructions`
- `family_notes = "Saved from Chef TV — {channel}."`
- `photo_url = <YouTube hqdefault thumbnail>`
- `category: ''`, `tags: []`, `difficulty: ''`, `servings: null`

After click, button swaps to `✓ Saved to My Kitchen` (emerald) and disables. Tracking is session-level (`vaultIds: Set<string>`) — refresh resets the button, and re-saving creates another Vault row (no dedupe). Small print under the button: "Adds to your Recipe Vault and drops the video in 🍳 Practice." This button is intentionally gated behind opening the Recipe view — user has to look at the recipe before pulling it into their Vault. Education-first.

**Save to Kitchen also auto-places the video in 🍳 Practice.** Saving a recipe into the Vault implies the user wants to cook it, and Practice is "recipes to cook" — so `saveToKitchen` fires a fire-and-forget `ensureInPractice(video)` right after the Vault insert. `ensureInPractice` is idempotent: no-op if the video is already in Practice, moves it from another bucket if present, or inserts favorites + `cooking_skill_items` (bucket='practice') if unsaved. When the video has a recipe, the same `loved_recipe_urls` capture row is written (identical semantics to the normal Practice toggle). The Playbook write is best-effort — a Playbook failure does not block or undo the Vault save, keeping the user's primary action reliable even if the Playbook write hits a transient error. This keeps the education loop intact (see → cook → improve) without forcing the user to tap twice.

**🍳 Practice → ingestion capture.** See "Practice + recipe" under My Playbook. When `setBucket(video, 'practice')` fires and the video has `meta.ingredients.length > 0`, a row is written to `loved_recipe_urls` (user_id, favorite_id, video_id, youtube_id, youtube_url, title, channel). Moving away from Practice cleans it up. Not surfaced in the UI.

**Creator attribution is always one tap away.** Every Chef TV card shows an `↗ More from {channel} on YouTube` credit link under the title (search URL by channel name — the channel card reliably tops YouTube's results). The user's view of a video goes through YouTube's iframe embed, which counts as a real view and serves the creator's ads. When a recipe is pulled into the Vault via `💾 Save to My Kitchen`, the attribution line `"Saved from Chef TV — {channel}."` in `family_notes` isn't just free-text — `/secret` parses it via `parseChefTVCredit(familyNotes)` and renders a visible `🎬 Recipe from {channel} on YouTube ↗` chip on the detail view, above the Family Notes block. The chip is retroactive (works on every previously-saved Chef TV recipe with no migration) and keeps the creator one tap away even inside the user's private vault. This is the legal-posture anchor: we're a discovery/aggregation layer that drives traffic back to creators, not a substitute for their content.

## Supabase schema (inferred from code — verify before migrations)

Tables referenced in the app:

- **`my_picks`** — `id, user_id, recipe_id, title, photo_url, bucket ('top'|'nice'|'later'), sort_order, created_at`
- **`shopping_list`** — `id, user_id, ingredient, recipe_title, checked, store_id (nullable fk to stores), created_at`
- **`stores`** — `id, user_id, name, emoji, website_url, sort_order, created_at` — per-user grocery stores the user shops at. Migration lives in `supabase/001_stores.sql` (run once in the Supabase SQL editor). RLS policy restricts rows to the owner.
- **`favorites`** — `id, user_id, type ('ai_answer'|'ai_recipe'|'recipe'|'video_recipe'), title, thumbnail_url, source, metadata (jsonb), is_in_vault, created_at`
  - For `type='ai_recipe'`, `metadata` contains `{description, ingredients[], instructions, difficulty, cuisine, meal, mood, protein}`.
  - For `type='ai_answer'`, `metadata.answer` holds the AI response text.
- **`saved_videos`** — `user_id, video_id` (join to `cooking_videos.id`)
- **`saved_education_videos`** — `user_id, video_id` (join to `education_videos.id`)
- **`cooking_videos`** — `id, title, channel, youtube_id, view_count, is_featured, …`. `is_featured` (added in `supabase/010_chef_tv_featured.sql`) is the human override for the ⭐ Featured chip on Chef TV's Teach tab — flipped from `/admin/featured`. Not user-editable. Default `false`. Partial index `cooking_videos_is_featured_idx` on `is_featured = true`.
- **`education_videos`** — `id, title, channel, youtube_id, …`
- **`education_video_metadata`** — per-video educational metadata, joined by `video_id`
- **`video_metadata`** — `id, video_id, ingredients (jsonb[]), instructions` — populated by ingestion scripts.
- **`cooking_skill_items`** — `id, user_id, item_type, item_id, bucket ('practice'|'teach'), created_at, updated_at` — Playbook bucket placement for saved videos. Unique on `(user_id, item_type, item_id)`. RLS scoped to owner. Migration trail: `002_cooking_skill_items.sql` → `003_playbook_buckets.sql` → `004_playbook_3buckets.sql` → `005_loved_recipe_urls.sql` → `006_playbook_2buckets.sql` → `009_rename_buckets.sql`.
- **`loved_recipe_urls`** — `id, user_id, favorite_id (fk → favorites, cascade), video_id, youtube_id, youtube_url, title, channel, created_at` — Practice+recipe ingestion signal capture. Unique on `(user_id, favorite_id)`. RLS scoped to owner. Written from `/videos` when user hits 🍳 Practice on a video with ingredients; deleted when they move away from Practice. Not surfaced in the UI — for curation/ingestion pipeline only. Table name is historical (predates the Love→Practice rename) and stays — it's never user-visible. Migration: `supabase/005_loved_recipe_urls.sql`.
- **`recipe_articles`** — `id, title, summary, content, topic ('knife_skills'|'techniques'|'cooking_times'|'pantry'|'safety'|'equipment'), read_time_minutes, created_at` — global content for the Guides Library. RLS read for any authenticated user; writes go through the service role only (the app never inserts directly). Indexes on topic + created_at desc. Unique index on title (added by 008) so the seed migration is idempotent. Migrations: `supabase/007_recipe_articles.sql` (table + RLS), `supabase/008_seed_recipe_articles.sql` (12 starter articles).

## Chef Jennifer (`/chef`) — Teach / Practice chat (April 2026 pivot)

**Phase 2A.** Chef Jennifer is now a single chat-first surface at `/chef` with a Teach / Practice pill row at the top. The old wizard at `/topchef` (Meal → Mood → Protein → Preferences → Cooking → Result) is retired — `app/topchef/page.js` is a server-side `redirect('/chef')` so any old bookmark lands on the new surface. The bridge to the wizard from `/chef` (the "Or just ask" card on STEP 1) is gone with the wizard.

**Why the pivot.** Bill's read after using the app: Chef Jennifer was generating recipes but not *teaching*. He wanted her to be the AI instructor inside Cooking School, not a separate recipe button next to it. The fix: borrow Chef TV's Teach/Practice vocabulary (technique content vs recipe content) and use it as Chef Jennifer's two modes. Same two words, same two meanings, across Chef TV, Chef Jennifer, and Playbook saves.

**The two modes.**

| Mode         | Color  | Backend                           | Saves to                                              |
| ------------ | ------ | --------------------------------- | ----------------------------------------------------- |
| 🎓 Teach     | sky    | `POST /api/chef` (chat reply)     | `favorites.type='ai_answer'` → Chef Notes (📝 Notes tab on Playbook) |
| 🍳 Practice  | orange | `POST /api/topchef` (recipe JSON) | `favorites.type='ai_recipe'` → Chef Recipes (✨ Recipes tab on Playbook) |

The visual order is locked **Teach first, Practice second** across every surface — pill row, tab strip, save buttons, and copy. Teach is what Chef Jennifer does first (instruction); Practice is what the user does next (cooking).

**Default mode is 🎓 Teach.** Chef Jennifer leads with instruction; recipes come when the user asks for one (or steps over to Practice). Mode persists across the conversation; the user can switch any time and the next message uses the new mode. Conversation history is shared — switching mode mid-thread doesn't wipe what's there.

**Empty-state suggested prompts.** When `messages.length === 0`, a mode-aware list of 6 suggested prompts shows below the empty state — `TEACH_PROMPTS` ("How do I know when oil is hot enough?", "What's a good substitute for buttermilk?"...) or `PRACTICE_PROMPTS` ("A cozy weeknight dinner with chicken", "A 30-minute pasta with bold flavors"...). Tapping a chip sends the message immediately. This is the wizard's replacement — instead of forcing the user through Meal/Mood/Protein, we give them a low-friction starting point in plain English. They can also just type whatever they want.

**Practice mode under the hood.** The user's free text is wrapped in a thin prompt (`Create a recipe based on this request from a home cook: "<text>". Keep it approachable...`) and POSTed to `/api/topchef`. The route hasn't changed — it still asks the model for a JSON recipe and inserts a row into `chef_recipes` for analytics. The recipe lands as an assistant message rendered with `<RecipeMessage>` (orange-tinted card with title, difficulty/cuisine pills, description, ingredients chips, numbered instructions, and a 💾 Save button). Save flow inserts into `favorites` with `type='ai_recipe'` and the same metadata shape the old wizard wrote (no `meal/mood/protein/preferences` fields — those don't exist in Practice-mode anymore, just `prompt`). Saved recipes show up on the ✨ Recipes tab of `/playbook`. The `/api/topchef` route name is legacy — only the page redirected; the API route still carries the `topchef` name.

**Teach mode under the hood.** Standard chat — the route `/api/chef` got a tightened system prompt that instructs Claude to teach, not dump recipes. The system prompt explicitly tells Claude to suggest switching to 🍳 Practice when a question is really "give me a recipe". Reply renders in a gray bubble with a "📝 Save to Chef Notes" button.

**Save state per message.** Saved messages are tracked by `keyFor(msg)` = `${mode}:${question}` so the same question asked in both modes (or asked twice) is dedupe-able and survives across messages without index churn.

**Post-save exit cue — "📘 View in Playbook →" (April 2026).** Originally, after a save the page just sat there: toast briefly appeared, the save button greyed out, and that was it — Bill flagged it ("the page stays after save need to go back to get out"). Once `saved === true`, the save row now also renders a prominent "📘 View in Playbook →" link next to the greyed button, deep-linked to the right Playbook tab via the `?tab=` query param: `/playbook?tab=chef_recipes` for Practice-mode recipe saves (orange button to match Practice's brand color), `/playbook?tab=chef_notes` for Teach-mode answer saves (amber button to match Notes). Symmetric fix on both save rows in `app/chef/page.js`. The link is opt-in navigation, not a redirect — users who want to ask another question can still type into the input bar and stay on `/chef`.

**Playbook `?tab=` deep-link.** `app/playbook/page.js` reads `?tab=<key>` on mount via a `useEffect` that runs once after the auth gate. Valid keys: `'teach' | 'practice' | 'chef_recipes' | 'chef_notes'`. Anything else is ignored and the default ('teach') stands. Tab changes inside Playbook are local-state only and don't sync back to the URL — refreshing the page after navigating tabs returns the user to the linked tab, which matches the "I came here from a save, refresh shouldn't take me somewhere else" intuition.

**Phase 2A.1 — Teaching loop (Teach assigns homework, Practice is the lab).** Bill's reframe after using Phase 2A: *"Practice becomes like homework — teach topics, ask questions, homework go practice."* Teach was answering, but the answers didn't *go* anywhere — the user finished a lesson and the app didn't pick a next step for them. Phase 2A.1 wires the two modes together as a single teaching loop instead of leaving them as parallel tabs.

The system prompt on `/api/chef` is now a 3-step loop:
1. **Teach.** Lead with the answer, then a short "why" so the user learns the principle.
2. **Check or invite.** When natural, one small follow-up question — never multiple.
3. **Assign practice (homework).** When the topic has a natural cooking exercise, end the message with EXACTLY this format on its own line, last thing in the message:

   ```
   🎯 Practice this: <one-line cooking idea phrased as something a home cook could request as a recipe>
   ```

   The marker is intentionally a single-line, predictable format so the page can parse it deterministically. Skip the marker entirely when the topic has no natural cooking exercise (food storage / shelf life, equipment FAQs, "what does this term mean", quick conversions) — homework on those topics would feel forced.

`/chef/page.js` parses the marker via `parsePractice(content)`:

```js
const m = content.match(/🎯\s*Practice this:\s*([^\n]+?)\s*$/m)
```

The regex captures the practice text and strips the whole marker line from the prose. The Teach-mode renderer shows `prose` in the gray bubble, then — when `practice` is non-null — appends a styled chip inside the same bubble: a top divider, a small orange-700 uppercase "🎯 Homework — Practice this" label, and the practice text below it. So the homework reads as part of Chef Jennifer's answer, not a separate UI element.

Below the bubble (next to the existing "📝 Save to Chef Notes" button) a second button — **🍳 Cook in Practice →** — appears whenever `practice` is non-null and the message isn't still loading. Tapping it calls `sendMessage(practice, 'practice')` which switches mode to Practice AND sends the practice line as the next user message in one tap. The full recipe lands in the Practice bubble immediately, and the user can save it to Chef Jennifer Recipes from there.

**modeOverride / useMode.** `sendMessage(text, modeOverride = null)` accepts an optional second argument that takes precedence over the current `mode` state for the duration of that call. The function reads a local `useMode = modeOverride || mode` and uses it for both the user-message tag and the API-route branch. If `modeOverride` differs from `mode` it also fires `setMode(modeOverride)` so the UI catches up. This avoids a React state race — without the override, calling `setMode('practice')` then `sendMessage(practice)` in the same handler would still see the old `mode` value because the state update hasn't flushed yet.

**Empty-state and mode-pill copy reflect the loop.** Teach empty-state subline: *"Ask anything kitchen. When the topic has a natural exercise, Chef Jennifer will assign a recipe to cook in 🍳 Practice."* Teach mode pill: *"🎓 Teach — Chef Jennifer teaches, then assigns homework you can cook in Practice."* Practice empty-state subline: *"Tell Chef Jennifer what to cook — or come here from 🎓 Teach to practice what you just learned."* Practice mode pill: *"🍳 Practice — the kitchen lab. Cook a recipe, practice the lesson."* The two surfaces explicitly reference each other so the loop reads as one experience.

**Models.** Both `/api/chef` and `/api/topchef` use `claude-haiku-4-5-20251001`.

**Phase 2B — Library awareness (April 2026).** Teach mode now searches the user's own app content before answering and gives Chef Jennifer the option to cite what it found. Three sources, one helper, inline chips.

The flow:

1. User asks something in 🎓 Teach. The page calls `searchLibrary(question, user.id)` from `lib/library_search.js`.
2. `searchLibrary` runs three parallel `ilike` queries (no FTS, no migration) across:
   - `recipe_articles` — title + summary (📚 Guides Library)
   - `cooking_videos` — title; pulls `video_metadata.ai_summary` via implicit join (🎬 Chef TV)
   - `personal_recipes` — title + description, scoped by `user_id` (🔐 the user's Recipe Vault)
3. Each source oversamples 8 candidates, then JS-side scores by counting keyword hits with title-weight-3 / body-weight-1, drops zeroes, keeps the top 3. Stopwords + cooking-noise words ("recipe", "cook", "make") are stripped from the query; keywords cap at 6 unique tokens.
4. The page POSTs `{ messages, library }` to `/api/chef`. The route appends a `LIBRARY CONTEXT` block to the system prompt listing each candidate with a stable `{cite:type:id}` token plus a short summary, with explicit "cite when / don't cite when" guardrails: cite for direct matches, never for loose-topical matches, never invent IDs.
5. Claude embeds the tokens inline in its answer where appropriate. The page parses them via `renderProseWithCitations(prose, library)` — regex `/\{cite:(article|video|recipe):([a-zA-Z0-9_-]+)\}/g` — and replaces matched tokens with `<CitationChip type={type} item={item} />` JSX nodes. Tokens whose IDs aren't in the message's library payload are dropped silently (model hallucinated, or the row was deleted between turns).
6. Chips are clickable: `📚` → `/guides?article=<id>` (Phase 2C deep-link — `/guides` reads the param on mount, expands the article's topic, opens it, and scrolls it into view; falls through to the default collapsed Library if the id doesn't match anything), `🎬` → `https://youtu.be/<youtube_id>` (target=_blank), `🔐` → `/secret?recipe=<id>` (uses the existing Vault deep-link). Colors mirror the destination page: emerald for articles, sky for videos (matches Chef TV's Teach tab), orange for recipes (the Vault's brand color).

The library payload is stored on the assistant message in conversation state so chips survive the rest of the session — re-rendering doesn't need to re-search. Search is best-effort: any `searchLibrary` failure falls through with `library = null`, the model gets the base prompt with no LIBRARY CONTEXT block, and chips simply don't render.

**Why ilike, not FTS, for v1.** Postgres `to_tsvector` + GIN indexes would rank better — but the migration adds setup friction and v1 didn't need it to validate the concept. The ilike + JS scoring path covers ~90% of the value with zero schema changes. Phase 2C can graduate to FTS once we see whether ranking actually feels coarse in practice.

**What's deliberately NOT searched (v1).** Recipe `ingredients` (jsonb fan-out is awkward and noisy — every recipe with "salt" would match a query about salting), `family_notes` (long-form, tangential), Chef TV `description` (sometimes auto-generated, often noisy), article `content` (covered by summary). Adding any of these later is a one-line change in `lib/library_search.js`.

**Phase 2C (next).** Polish + threshold tuning: validate citation density on real conversations, decide whether to graduate to FTS, possibly add deep-links from article chips into `/guides` (currently lands on the page index — user has to scan), possibly auto-suggest a 🍳 Practice line when the user cites a recipe ("Want to cook your saved Spinach Lasagna?").

## Chef Jennifer — topic guard (April 2026)

Both modes politely refuse non-cooking requests instead of forcing an answer. Bill flagged this on use: "i ask one and it created a recipe" — Practice mode was generating a full recipe for a non-food prompt because the route had no topic gate.

**Practice mode (`/api/topchef`).** The recipe prompt now starts with a one-shot classifier-and-respond rule: "FIRST, decide if this is actually a request for a cooking recipe or food. If it is NOT (jokes, random questions, non-food topics), respond with ONLY `{"refusal":"<one warm sentence in Chef Jennifer's voice>"}`. Otherwise respond with the recipe JSON shape." Same instruction is wired into both the cache-hit *adapt* path and the cache-miss *fresh* path so the gate fires regardless of whether the corpus matched on a keyword.

When a refusal comes back (`recipe.refusal && !recipe.title`), the route short-circuits: it does **NOT** bump `times_served` on the cache base (we didn't actually serve anything) and does **NOT** INSERT the refusal into `chef_recipes` (we don't want refusals showing up as future cache candidates). Response shape: `{ recipe: { refusal: "<text>" }, source: 'refusal' }` — same outer envelope the page already parses, with a new `source` value so we can observe how often it fires.

The fresh-path adapt-failure fallback (return `base` recipe directly when JSON parse fails) is unchanged — it only triggers on parse errors, not on intentional refusals.

**Teach mode (`/api/chef`).** The system prompt grew an "OFF-TOPIC HANDLING" block right above the STYLE section: "If the user's question is clearly NOT about cooking, food, kitchens, ingredients, or eating — for example jokes, current events, math problems, coding, poetry, weather, sports, or anything outside the kitchen — do NOT try to answer it. Instead, warmly redirect them in ONE short sentence to bring it back to the kitchen. Skip the teaching loop, skip the practice line, skip citations." Teach is intentionally broader than Practice (storage, equipment, terminology, meal planning all count) but the off-topic floor still exists.

**Page rendering (`/chef/page.js`).** When `data.recipe.refusal` is set, the Practice branch in `sendMessage()` pushes an assistant message with `content: recipe.refusal, refusal: true` (no `recipe` property), so the conversation renderer falls through past the `mode === 'practice' && msg.recipe` branch into the prose-bubble branch. The prose bubble's emoji label is mode-aware (`{msg.mode === 'practice' ? '🍳' : '🎓'} Chef Jennifer`) so a Practice refusal still reads as Chef Jennifer's Practice voice. The save-button row's render condition picked up `&& !msg.refusal` so refusals don't get a Save to Chef Notes / Save to Chef Jennifer Recipes button — there's nothing meaningful to save.

**What this trades.** Each Practice request still costs one haiku call (the classifier and the recipe come from the same prompt, no extra round-trip). Refusal latency is comparable to a fast recipe gen. False-refusal risk is low because the refusal criterion is "not about food" rather than "about a *good* recipe" — the model defaults to recipe shape unless the prompt is clearly off-topic. We're betting on the corpus staying clean over time as a result.

## Chef Jennifer — corpus mining (April 2026)

Every Practice-mode tap on `/chef` already INSERTs the generated recipe into `chef_recipes` (title, description, ingredients, instructions, cuisine, difficulty, ai_prompt). That table is a free corpus that grows on its own — over time it becomes a meaningful library of "recipes home cooks have actually asked for". The corpus mining layer taps it before generating fresh.

**Stage 1 (shipped) — instrument.** Two columns on `chef_recipes`:
- `times_served int default 1` — increments every time a row is served (fresh insert starts at 1, cache hits bump it).
- `last_served_at timestamptz default now()` — recency for future cold-rotation.

**Stage 2 (shipped) — DB-first lookup + adapt.** `lib/chef_recipe_cache.js` exposes `findCachedRecipe(prompt, cuisine)` which keyword-extracts the prompt (mirrors `lib/library_search.js`'s stopword + length filter), runs an `ilike` OR over `title + description + ai_prompt` on `chef_recipes`, optionally filters by cuisine when one is specified (skips the filter for the generic "International" default), pulls the 20 lowest-`times_served` matching rows, scores them in JS (title 3× / ai_prompt 2× / description 1×), and returns a random pick from the top 5. Random rotation prevents the same prompt from always handing back the identical row before per-user dedup is added.

`/api/topchef` calls `findCachedRecipe` at the top of POST. On a hit it builds an adapt prompt (base recipe JSON + user request + "vary 2–4 ingredients, adjust title, rewrite description") and sends it to haiku, then `bumpServeCount`s the base. On a miss it falls through to the original fresh-generation path which still INSERTs the new row. Either way the response includes `source: 'cache' | 'fresh'` so we can observe hit rate. **The adapted recipe is NOT inserted** — it shares structure with the base and re-saving would double-count popularity and bloat the corpus.

If the adapt call fails (parse error, model timeout), the route falls through to returning the base recipe directly — never an error, worst case a less-varied result.

**Cost note.** Stage 2 alone is roughly cost-neutral per call (input tokens go up because we ship the base recipe, output stays similar). The architectural win is that it sets up Stage 3, where rows above a `times_served` threshold can be returned with no AI call at all.

**Stage 3 (next, not shipped) — pure cache pulls + per-user dedup.** Once a row has been served N times (e.g. ≥ 3) it's "hot" — proven to fit a class of prompts. Hot rows can be returned directly with no model call. To avoid serving the same person the same recipe twice, add a per-user impressions table or a JSONB array on the user row tracking which `chef_recipes.id`s they've seen, and filter those out of the lookup. That's where the actual cost reduction lands.

**Why we keep the adapt layer instead of pure-cache-only.** Variety. The user just remarked that the same prompt giving a different recipe every time is a feature, not a bug — and that's a temperature artifact of fresh generation. Pure cache pulls would lose that. The adapt layer preserves the "fresh feeling" by riffing on the base, while still benefiting from the corpus as a structural prior.

**What's deliberately NOT searched.** `chef_recipes.ingredients` and `instructions` (jsonb / long text — noisy match signal). Adding either is a one-line change in `chef_recipe_cache.js`.

## Recipe Vault "Make my recipe more..." preferences

The 8-preference list lives on the Recipe Vault detail-view's **🌿 Make more…** tab inside ✨ AI Kitchen Helpers. It's a per-transformation, multi-select cooking-style adjustment (not medical advice). The list got created with the old Chef Jennifer wizard and was retained on the Vault when the wizard was retired in Phase 2A.

Current options (value / label):

| Value              | Label                    |
| ------------------ | ------------------------ |
| `carb_aware`       | Carb-aware               |
| `carb_counting`    | Carb-counting friendly   |
| `portion_focused`  | Portion-focused          |
| `vegetarian`       | Vegetarian-friendly      |
| `gluten_friendly`  | Gluten-friendly          |
| `dairy_friendly`   | Dairy-friendly           |
| `low_sodium`       | Low-sodium               |
| `heart_healthy`    | Heart-healthy            |

The prompt includes an explicit guard: "Frame every change as a practical home-cook tip — do not provide medical advice or make health claims." The UI also shows a small disclaimer under the chips.

Keep the 8 `value` strings identical across Recipe Vault (`app/secret/page.js`) and the server-side label map in `app/api/enhance-recipe/route.js`. Chef Jennifer no longer exposes a preference picker (Phase 2A free-text chat handles it implicitly via the user's prompt).

## Recipe Vault tags & category (April 2026 rework)

The Vault used to have two overlapping fields — a free-text `category` input ("e.g. Main Dish, Dessert, Side") and a flat 19-item tag dropdown that mixed proteins, dish types, meal times, diet labels, and mood words into one undifferentiated list. Two problems: the flat list was intimidating for a quick "tag this" action, and the free-text category fragmented data ("Main" vs "Mains" vs "Main Dish" vs "Dinner") so it never drove useful filtering.

**The rework — fewer, smarter, grouped:**

- **Category field stays.** Initially retired in favor of the chip groups; brought back after Bill flagged it on use ("missed Lunch and lost category in edit"). Category and tags now coexist — Category is the user's single one-line categorization (free text, "e.g. Main Dish, Dessert, Side"), and Tags are the multi-select chips for cross-cutting attributes. The Edit form and Add form both render Category as a sibling field above `<TagSelector>`. The read-only chip on the detail/list views still renders for any recipe with a non-empty category.
- **Tags are organized into three labelled groups** (`TAG_GROUPS` in `app/secret/page.js`) totaling 16 curated suggestions: **🍽 Meal** (breakfast, lunch, dinner, dessert, side, snack), **🥩 Food Groups** (chicken, beef, seafood, pasta, vegetarian), **✨ Style** (quick, comfort, healthy, baking, holiday). `CURATED_TAGS` is the flat union, used to separate curated chips from custom tags in the renderer. The middle group started as "Protein" with `chicken/beef/fish/veg`; renamed to "Food Groups" and broadened to `chicken/beef/seafood/pasta/vegetarian` after Bill flagged that home cooks think in food groups, not just proteins (April 2026). Lunch was added to the Meal group in the same fix as the Category restore.
- **Inline chip-grid `<TagSelector>`** replaces the old dropdown. Each group renders as a labelled row of pill buttons; tap to toggle. Selected = orange fill, unselected = white with gray border. Below the curated groups, an "✏️ Custom" row holds the `customInput` field + Add button — anything typed here gets lowercased and pushed onto the same `tags[]` array. Custom tags (anything in `tags` not in `CURATED_TAGS`) render as their own removable chip row underneath the input. No dropdown, no extra tap to "open" the picker — the chips are visible the moment the form opens.
- **Data shape is unchanged.** `personal_recipes.tags` is still a flat string array. Old recipes' tags survive — they just appear as "custom" chips if they aren't in the curated set (e.g. an older `fish` or `veg` tag from the original Protein group will show up underneath the input alongside whatever the user has typed).
- **Import API prompt** (`/api/import-recipe/route.js`) asks Claude to fill in both `category` (one-liner like "Main Dish | Side | Dessert | Breakfast | Soup | etc.") and a curated-set-biased `tags` array. Free-form tags from AI still pass through (the form treats them as custom tags), so we're nudging without locking down.
- **List-view filter dropdown mirrors the form groups.** The overflow `<select>` next to the chip row uses `<optgroup>` to organize curated tags into the same Meal/Food Groups/Style buckets, listing only the tags actually in use across the user's recipes (so empty groups vanish). All custom tags collapse into a single `✏️ Custom` option at the bottom; selecting it filters via a `__custom__` sentinel that matches any recipe with at least one non-curated tag. The dropdown's show/hide condition is unchanged (`allTags.length > topTags.length` — the chip row covers the top 5, the dropdown is the structured overflow).

## Recipe Vault presentation notes (`/secret`)

- **Tag chip quick-filter (list view).** The top 5 most-used tags render as pill buttons along with an "All" chip in a horizontally-scrolling row directly under the sticky header. Tapping a chip sets `searchTag` (tapping the same chip twice clears it). The full `<select value={searchTag}>` dropdown still renders below — but only when `allTags.length > topTags.length`, so it's hidden on vaults with ≤ 5 unique tags (chips cover everything). `topTags` is computed by counting tag occurrences across all recipes and sorting desc.
- **Collapsible search input (list view) — toggle in header, input below.** The 🔍/✕ search toggle lives in the sticky header's right-side button group next to **📥 Import** and **+ Add** (so it can never compete with the input for horizontal space on narrow phones). Below the header, a single row holds *either* the tag chip scroller *or* a full-width (`w-full`) text search input — they swap, they don't stack, so toggling doesn't push content down. Tapping 🔍 flips the row into search mode and auto-focuses the input; the header button becomes ✕ (orange-filled). Tapping ✕ clears `searchText` and collapses back to chips. If `searchText` is non-empty the input stays visible regardless of the toggle so an active query is never hidden. The input uses `style={{ fontSize: '16px' }}` to prevent iOS Safari's auto-zoom on inputs smaller than 16px (which was contributing to the ✕ getting pushed off-screen on iPhone).
- **No big intro card on the list view.** The "Your Personal Recipe Vault" welcome card was removed — the sticky header already labels the page, and the space is better spent on the recipe grid. If we ever want context back, the "X of Y recipes" count above the grid is already doing the minimum.
- **📅 Meal Plan button toggles (April 2026).** The Meal Plan button in the detail-view header now toggles on/off. The button visually reflects `picksIds.includes(viewing.id)` ("📅 In Meal Plan" filled orange when present, "📅 Meal Plan" outlined when absent), and the `onClick` matches: tapping when already in the plan deletes from `my_picks` and toasts "Removed from Meal Plan"; tapping when absent upserts and toasts "Added to Meal Plan ✓". The previous one-way upsert made the button look toggleable but never let the user back out — they had to bounce to `/meal-plan` to remove items.
- **Hero on the detail view.** The recipe detail screen replaces the old 220px inset photo with a full-width hero that is capped at `max-w-2xl mx-auto` so it spans edge-to-edge on phones but doesn't stretch across a wide desktop monitor. Heights are responsive: `h-40 sm:h-52 md:h-64` (160px / 208px / 256px) so the hero doesn't swallow the iPhone viewport. The title and description overlay the photo's bottom via a dark gradient (`from-black/75 via-black/30 to-transparent`). The title uses `text-xl sm:text-2xl md:text-3xl` and is no longer duplicated in the body — it lives in the hero.
- **Photo-less hero fallback.** When `viewing.photo_url` is empty, the hero shows a soft orange gradient (`from-orange-100 via-orange-50 to-amber-100`) with a large category emoji from `categoryEmoji(recipe)` — the fallback gives each recipe visual personality without a photo. The whole gradient is clickable and triggers the hidden `<input type="file">` for photo upload.
- **Photo affordances (top-right pills).** The hero exposes two ways to attach a picture, side-by-side at the top-right:
  - **No photo set** → `📁 Upload` (file picker) + `📋 Paste image` (clipboard).
  - **Photo set** → `📷 Change` (file picker) + `📋 Paste` (clipboard) so the user can swap by either path.
  Both pills `stopPropagation` so they don't also trigger the gradient's tap-to-upload click. While an upload is in flight (`uploadingPhoto`), both pills disable and the paste pill swaps to `⏳ …`.
- **Paste-to-photo.** `📋 Paste image` calls `pasteImageFromClipboard(recipeId)` which uses `navigator.clipboard.read()`, walks the clipboard items for any `image/*` MIME, pulls the blob, and runs it through the existing `uploadPhoto` → `updateRecipe({ photo_url })` path via the shared `attachImageBlobToRecipe(blob, recipeId, userId)` helper. Toast on success ("Photo added ✓"); toast on failure with a hint (no image / clipboard read denied / unsupported browser) — never throws.
- **Cmd/Ctrl+V also works.** A document-level `paste` listener mounts while the detail view is open. It reads `e.clipboardData.items` (synchronous API — no permission prompt because the paste event itself is the user gesture), grabs the first `image/*` file, and runs it through `attachImageBlobToRecipe`. The listener skips when the paste target matches `input, textarea, [contenteditable]` so it never hijacks normal text-paste in the title/notes editor.
- **`categoryEmoji(recipe)` helper.** Lives at the top of `app/secret/page.js` and returns an emoji based on regex matches against the recipe's title / category / tags (pizza → 🍕, pasta → 🍝, salad → 🥗, soup → 🍲, etc.). Falls back to 🍽️. Used by the photo-less hero and by the Grid view's photo-less tile fallback.
- **Import view — three tabs (URL / Paste / JSON).** The Import view used to stack all three import cards on the same scroll, which made the page long and busy on first open. Since they're alternatives — only one is used per import — the page is now a tab strip (`importTab` state, default `'url'`). Three equal-width pill buttons in a `bg-gray-100 rounded-2xl` container; active tab fills `bg-orange-600 text-white`, inactive tabs are `text-gray-600`. Below the tabs only the active tab's card renders. URL is the default because it's the most common path and lets the clipboard prompt surface immediately. Paste is the "this site blocks the fetcher" fallback (its description has an inline button that flips back to Paste). JSON has its own button inside the card; URL/Paste share the bottom **📥 Import & Clean with AI** action. The shared error banner only renders on URL/Paste, and now suggests switching to Paste with a clickable inline button.
- **Import view — clipboard auto-detect on the URL field.** When the user lands on the URL tab of the Import view, an effect peeks at `navigator.clipboard.readText()`. If the clipboard holds an `http(s)://` URL (regex `^https?:\/\/\S+$/i`, length-capped at 2000 chars) and the URL field is still empty, a small orange `📋 URL on your clipboard — {url} — [Use it] [×]` prompt renders inside the URL card, between the description and the input. Tapping **Use it** fills `importUrl` and clears the prompt; ✕ dismisses without filling. The prompt also clears whenever the user switches to the Paste/JSON tab, leaves the Import view, or starts typing into the URL field. `readText()` requires HTTPS + a recent user gesture; the tap on 📥 Import (and any tab click) satisfies it on most browsers, and a permission denial rejects silently (no UI). State: `clipboardSuggestion` in `app/secret/page.js`, watched in a `useEffect` keyed on `[view, importTab, importUrl]`.
- **Import view — clear URL field on error.** When `handleImport()` runs the URL path and the API responds with an error, the URL input is wiped (`setImportUrl('')`), the page auto-switches to the Paste tab (`setImportTab('paste')`), and the paste textarea is focused. Rationale: a failed URL is almost always a site that blocks the fetcher, and the next step is "paste the recipe in" — leaving a bad URL in the field forced the user to manually clear it before they could even read the error suggestion. Detection is `wasUrlAttempt = importUrl.trim() && !importText.trim()` so a paste-tab error doesn't blow away whatever the user pasted. The error banner still renders normally.
- **Recipe import deep-link — `?import=<encoded-url>` and `/import?url=<encoded-url>` (April 2026).** External entry point for "send a URL to MyRecipe" flows — primary use case is the iOS Share-Sheet shortcut Bill builds in iOS Shortcuts (Safari → Share → "Send to MyRecipe").
  - **`/secret?import=<encoded>`** is the deep-link handler. `loadRecipes` reads the `import` param after the recipes load, switches `view` to `'import'`, sets `importTab='url'`, prefills `importUrl` with the decoded URL, strips the param from `history.replaceState` so a refresh doesn't re-trigger, and calls `handleImport(decoded)` on the next tick. The recipe lands on the standard Add-form preview for the user to review/save — exactly the same path as a manual 📥 Import → URL → Import tap.
  - **`/import?url=<encoded>`** (`app/import/page.js`) is the short, easy-to-type entry point that the iOS Shortcut hits. Defensive: rejects anything that isn't `http(s)://`. If signed in, redirects to `/secret?import=<encoded>` via `window.location.replace`. If not signed in, redirects to `/login?next=/import?url=<encoded>` so the URL survives the auth round-trip (note: `/login` doesn't yet honor `next`, so testers should sign in first; the URL stays in browser history regardless). Falls back to a small help card when no `?url=` is present so the route is never a dead end. Also accepts `?u=` as a shorter alias.
  - **Why a separate `/import` page** instead of just `/secret?import=…`: the URL is shorter and easier to type into a Shortcut, gives us one place to centralize auth-redirect-with-preserved-URL, and reserves room for future ingestion entry points (e.g. a future HTML-blob POST that bypasses the scraper for sites that block fetching). Today only the URL path is wired up; HTML capture is a follow-up.
- **Clipboard auto-jump on Vault open (April 2026).** Bill's pivot from the iOS Shortcut path: the Shortcut UX was too fiddly to set up (URL Encode action, Open URL action, share-sheet enrollment), and the existing copy-paste flow already worked. To collapse the copy-paste path from 4 taps to 2, `loadRecipes` calls the `readClipboardSmart()` helper after the auth load and branches on what it finds. **`readClipboardSmart()` uses `navigator.clipboard.read()` first** (the richer Async Clipboard API that exposes every MIME type on the clipboard) and falls back to `readText()` when `read()` is unavailable. This matters because iOS Shortcuts' "Get Contents of Web Page" action puts **HTML / rich text** on the clipboard, not plain text — `readText()` returns empty or a useless snippet, but `read()` lets us pull `text/html`, strip tags into a clean text dump (`htmlToCleanText()` — script/style blocks dropped, block-level tags turned into newlines, remaining tags stripped, common HTML entities decoded, whitespace collapsed), and feed that into the auto-jump logic. **Longer-wins between text/plain and text/html.** When BOTH MIME types are present (the common case on iOS Safari's Share → Copy and Shortcuts' Get Contents of Web Page), the helper returns whichever is longer. iOS web-page clipboards typically put a short URL fallback on `text/plain` and the actual page content on `text/html` — preferring `text/plain` first (the obvious-looking choice) routed users to the URL tab when they wanted Paste; the longer-wins rule fixes that without losing the URL-only case (text/plain wins when it's the only thing present, or when text/html happens to be smaller). Helper is at module scope in `app/secret/page.js` so a future Recipe Cards / Chef Notes paste path can reuse it.
  - **Branch A — URL on clipboard** (`http(s)://...`, length ≤ 2000, not our own domain): auto-switch to `view='import'`, `importTab='url'`, pre-fill `importUrl`. User lands on the URL tab with the link already in the field — one tap on **📥 Import & Clean with AI** finishes the job.
  - **Branch B — recipe-shaped text on clipboard** (length ≥ 500, matches `/\b(ingredient|tablespoon|teaspoon|tbsp|tsp|preheat|cup of|cups of)\b/i`): auto-switch to `view='import'`, `importTab='paste'`, pre-fill `importText`. This handles Bill's iOS Shortcut path that grabs the **whole page text** (Safari's `Get Contents of Web Page` action) and copies it to clipboard — works on sites that block our server-side scraper because the Shortcut runs in his Safari context with his cookies. The page text dump lands on the Paste tab pre-filled; one tap on **📥 Import & Clean with AI** sends the whole blob to Claude for parsing. Image isn't carried (clipboard text doesn't include images) — that's a known trade-off; user can paste an image into the recipe detail view afterward.
  - **Both branches** are gated on `!recipeParam && !importParam` so explicit deep-links always win. Import is **not** auto-fired — pre-fill only — so stale clipboard content can't silently re-run. The vocab gate on Branch B (`ingredient|tablespoon|...`) keeps random long blobs (emails, chat history) from yanking the user into Import unsolicited. `readText()` may be denied by Safari/iOS without a recent user gesture; the catch-arm falls through silently and the existing in-Import-view clipboard prompt still catches a URL on the next tap, so the regression-floor is "current behavior."
  - **Gesture-triggered fallback — `openImportFromClipboard()` on the 📥 Import button.** iOS Safari refuses `navigator.clipboard.read()` on page load because there's no recent user gesture, so the on-load auto-jump above silently denies on iPhone. The 📥 Import buttons (in the sticky header AND on the empty state) are wired to a wrapper that calls `setView('import')` first, then runs `readClipboardSmart()` and applies the same Branch A / Branch B routing. Tapping the button IS the gesture, so iOS will allow the clipboard read and prompt the user with its native "Paste from <App>?" sheet. Once they confirm, we route to URL or Paste tab and pre-fill. If the clipboard is empty, denied, or contains nothing recipe-shaped, Import still opens on the default URL tab — the button never feels broken. The on-load auto-jump in `loadRecipes` is kept (works on desktop browsers with persisted permission), so iPhone users land on Import via the button and desktop users land on Import via the on-load read — different paths, same destination.
- **List / Grid / Portfolio segmented toggle.** The sticky header has a 3-state segmented control next to 🔍 / 📥 Import / + Add. List + Grid are display modes for the recipe collection; Portfolio (💎) is a *different surface* showing curated Chef Notes promoted from `/playbook`.
  - **List** — single column with a 64px thumb, title, description, category chip, and tag chips. Good when you know what you're looking for. `?view=list` overrides the new Grid default for users who prefer the dense list.
  - **Grid** (default) — two-column photo-first tiles styled like classic 3x5 index cards: cream paper (`bg-amber-50`), thin `bg-red-600` top rule, title (bold, two-line clamp with `min-h-[2.5rem]`) + 100px photo below. Photo-less tiles fall back to `bg-amber-100` with the `categoryEmoji(recipe)`. Good for browsing/serendipity. Promoted to default in April 2026 — Grid is more recipe-book-like and gives photos the room they earn.
  - **💎 Portfolio** — see "Chef Portfolio" below. Notes, not recipes — Add/Import don't apply here.
  - State lives in `listStyle` in `app/secret/page.js`. The toggle writes/clears `?view=grid|portfolio` via `history.replaceState` so refresh and share preserve the choice. Unknown values stay on `list`.
  - **List + Grid are Vault-only display choices, NOT the same as Recipe Cards (`/cards`).** Both styles tap through to the standard Vault detail view with full instructions. The index-card *visual* is intentionally reused — home cooks recognize it — but the *concept* stays separate (see "Recipe Cards concept" below).

## Chef Portfolio (`/secret?view=portfolio`)

The 💎 Chef Portfolio is a curated subset of saved Chef Notes the user has promoted out of `/playbook` and into the Recipe Vault. **Notes, not recipes** — it's the equivalent of pinning a Chef Jennifer answer to the Vault as a "keep forever" reference. The note still lives in Playbook regardless; Portfolio is just a second surface that renders the marked subset.

**Why it exists.** Bill's framing (April 2026): Chef TV and Chef Jennifer already have paths to move recipes into the Vault, but **notes** had no equivalent. Saved AI answers piled up in Playbook with no way to elevate the genuinely valuable ones. Portfolio gives the user a one-tap "this one's a keeper" gesture.

**Filing model (April 2026 refinement).** Bill's clarified workflow: "i have a bunch of notes in note page. i zip through them file the ones i want to keep and then delete the rest." So filing is a **MOVE, not a copy** — the act of filing a note removes it from the Chef Notes inbox in Playbook and places it into the Portfolio in the Vault. This eliminates the duplication that the original toggle model created (where filed notes lived in *both* places). The two surfaces now have clean, non-overlapping roles:

- **Chef Notes (Playbook) = the inbox.** Holds only *unfiled* notes (`is_in_vault = false` or null). The × on a row is a hard delete (existing behavior).
- **Portfolio (Vault) = the filed keepers.** Holds only *filed* notes (`is_in_vault = true`). The × on a row is **un-file** — sends the note back to the Chef Notes inbox, where it can be hard-deleted if the user changes their mind. This makes Portfolio the *safe* place: you can't accidentally nuke a keeper with one tap.

To delete a filed note entirely: un-file it from Portfolio (× → returns to inbox) → then × from Chef Notes (hard delete).

**Data model — no migration.** Reuses the existing `favorites.is_in_vault` boolean (already in active use for `video_education` saves on `/secret`). For `type = 'ai_answer'` rows: `is_in_vault = true` ⇒ shows in Portfolio (and is hidden from Playbook), `is_in_vault = false`/null ⇒ shows in Playbook (and is hidden from Portfolio). Filing/un-filing is a single column UPDATE; nothing else moves. Same `favorites` row, two surfaces, mutually exclusive visibility.

**Filing (from Playbook).** `components/ExpandableItem.js` accepts an optional `onPortfolio` callback + `inPortfolio` boolean. When set, the expanded note shows a "💎 File to Portfolio" button (orange outline). `app/playbook/page.js` wires `togglePortfolio(note)` on the 📝 Chef Notes section — the function sets `is_in_vault = true` and **filters the note out of `notes` state** so the row disappears from the inbox immediately (toast "💎 Filed to Portfolio"). The "✓ Filed" state is kept in the component for completeness but is rarely visible since filed notes vanish from the inbox view. The `loadAll` Playbook fetch also filters `answerFavs` client-side via `.filter(n => !n.is_in_vault)` so a refresh stays consistent.

**Un-filing (from Portfolio).** The × on a row inside the Portfolio (`/secret?view=portfolio`) calls `removeFromPortfolio(note)` which sets `is_in_vault = false` and removes the note from `portfolioNotes` state (toast "↩ Returned to Chef Notes"). The note reappears on `/playbook` → 📝 Chef Notes the next time that page loads. The row's tooltip reads "Return to Chef Notes inbox (un-file)" so the affordance is unambiguous.

**Render (in the Vault).** `app/secret/page.js` extends `listStyle` from `'list' | 'grid'` to `'list' | 'grid' | 'portfolio'` and renders the third segment as a 💎 icon. When active, the entire recipe list/grid is replaced by the Portfolio view: an amber callout explaining what Portfolio is + how to add notes from Playbook, a count line, and either an empty state with a `Open Chef Notes →` button (deep-links to `/playbook?tab=chef_notes`) or a grouped accordion of the promoted notes (see below). **Important:** the Portfolio view does NOT pass `onPortfolio` to `<ExpandableItem>` — inside the Portfolio surface the × removes the note from Portfolio (same `removeFromPortfolio` semantics — flips `is_in_vault` to false, doesn't delete the underlying favorites row), so the redundant 💎 button would be misleading.

**Tag UI is hidden in the Portfolio view.** The 🔍 search button, the chip scroller, the search input, and the tag overflow `<select>` are all gated on `listStyle !== 'portfolio'`. Notes aren't recipes — they don't carry tags or categories — so showing the recipe-filtering UI on the Portfolio view was misleading. The 5-group accordion (below) is the Portfolio's own organization layer.

**5-group "How to..." accordion (April 2026).** Bill's framing: a chronological list of saved Chef Notes is hard to scan once it grows past ~10 entries — the Portfolio should read as a kitchen reference shelf, not a pile. Notes are auto-sorted into 5 fixed buckets, each rendered as a collapsed accordion section that mirrors the Guides/Library color rhythm (border-l-8 stripe, soft-tinted body, count pill). Order is locked. Each section is collapsed by default — tap a header to expand. Empty groups are hidden so the user only sees what they've actually saved against.

| Key       | Emoji | Label                  | Stripe color |
| --------- | ----- | ---------------------- | ------------ |
| `prep`    | 🔪    | How to Prep            | orange       |
| `cook`    | 🔥    | How to Cook            | red          |
| `season`  | 🧂    | How to Season          | amber        |
| `improve` | ✨    | How to Improve a Dish  | emerald      |
| `shop`    | 🛒    | How to Shop            | sky          |

**Categorization is regex-on-content.** `categorizeChefNote(note)` walks `PORTFOLIO_GROUPS` top-down and returns the first group whose regex matches the haystack `${note.title} ${note.metadata.answer} ${note.metadata.question}`. Patterns scan case-insensitively and match cooking vocabulary specific to each bucket (Prep: chop/dice/peel/julienne/zest/etc.; Cook: bake/sear/braise/simmer/etc.; Season: salt/spice/marinade/umami/etc.; Improve: too salty/burned/balance/rescue/etc.; Shop: buy/select/store/substitute/etc.). Order matters — the more specific groups (Prep, Cook, Season, Shop) get a chance before the catch-all Improve bucket.

**Catch-all is `improve`.** Notes that don't match any pattern fall through to the last group ("How to Improve a Dish") so nothing is orphaned. Empirically, generic "how do I make this better" notes that don't fit Prep/Cook/Season/Shop tend to be improvement advice anyway, so the fallback reads naturally rather than being a "Misc" dumping ground.

**No migration, no DB column.** Categorization runs at render time — pure JS over data already loaded into `portfolioNotes`. If we want to graduate to LLM-classified categories or user-pickable groups later, the data model doesn't move; only the helper changes.

**Why fixed groups instead of free-text tagging.** Tags would force the user into a second cataloging gesture every time they save (already a 2-tap path: save → promote). Fixed groups + auto-sorting let the user keep the single-tap "💎 keeper" gesture and still get a structured Portfolio. Cost: occasional miscategorization. Benefit: zero friction.

**Loading.** `loadPortfolioNotes(userId)` runs in the auth chain on `/secret` mount alongside `loadRecipes` etc., and re-runs whenever the user taps the 💎 segment in the toggle (so notes promoted in another tab show up without a hard refresh). State: `portfolioNotes` in `app/secret/page.js`.

**`?view=portfolio` deep link.** `loadRecipes`'s on-mount block reads `searchParams.get('view')` and accepts `list`, `grid`, or `portfolio` (anything else falls through to the default `grid`). The toggle writes the param via `history.replaceState` so a Chef Notes save → "Open in Portfolio" path can land directly on the curated view in a future iteration.

**What this trades.** The Portfolio is intentionally a *subset*, not a sort. We don't show every saved note — only the ones the user marked. The cost is the user has to make a choice; the win is that opening Portfolio always gives them their best stuff, not a chronological pile.

## Recipe Cards concept — READ THIS BEFORE TOUCHING `/cards`

**A Card is NOT a short recipe or a visual mode of a recipe. A Card is a chef card.**

Bill's framing: "The card does not need instructions — concept is an old-style card or chef card, they know how to make it." Think grandma's 3x5 index box, or a pro's station cards: the stuff a chef already knows how to make and only needs a reminder for. Name, picture, ingredients, a place for family notes and memories, maybe quick tips. The formal step-by-step recipe lives in the **Vault**, not on the Card — that's what "Full Recipe →" links out to when you actually need instructions.

So:
- **Vault recipe** = the full teach-me-how version: ingredients AND instructions AND metadata.
- **Card** = the remind-me version: ingredients + family notes + (optionally) quick chef suggestions. **No instructions.** The absence is the point.

Implications for anyone tempted to "simplify" `/cards`:
- Do not fold `/cards` into `/secret` as a visual toggle. That was tried once (Phase 3, commit `b4c4a38`) and reverted (`2e211bc`) because it deleted the concept.
- Do not tap a card and open the Vault detail view with full instructions — that defeats the point.
- Cards are a curated subset (the ones a user has actually captured to their "card box") — not every vault recipe is automatically a card.
- The pin-to-cards button on the Vault detail view is the user's way of saying "this one goes in the card box." Keep it.
- The Vault's **Grid** view *reuses the index-card visual* (cream paper, red top rule) because home cooks recognize that shape. That's cosmetic only — it's still a Vault recipe underneath, and tapping opens the full Vault detail (with instructions). Do NOT wire the Grid tile to open `/cards`-style detail, and do NOT treat Grid recipes as being "in the card box." The Grid view and `/cards` are two different surfaces that happen to share a look.

## Recipe Cards presentation notes (`/cards`)

- **Index-card paper look.** Card thumbnails use `bg-amber-50` (cream paper) with `border-2 border-amber-200` and a thin `bg-red-600 h-1.5` top rule — a nod to classic 3x5 index cards. Hover state lifts the border to `border-orange-400` with a soft shadow. The old orange-header + white-body look was retired.
- **Title + picture only on the tile.** Each card now shows just the recipe title (bold, two-line clamp with `min-h-[2.5rem]` so short titles still reserve two rows for a tidy grid) and the photo below (100px, rounded). Category, servings count, ingredient count, and the "📝 Notes" badge were removed from the grid — all the metadata still lives one tap away in the detail view.
- **Photo-less fallback.** If `photo_url` is empty the tile shows `bg-amber-100` with a 32px 🍽️ emoji so every card stays rectangular in the grid.
- **Collapsible search in the header.** `/cards` mirrors the Recipe Vault pattern: a 🔍/✕ toggle lives in the sticky header's right-side button group (next to Clear All and + Add), and the full-width `<input>` only appears under the header when search is active. Input uses `style={{ fontSize: '16px' }}` to block iOS Safari auto-zoom.
- **"My Photo" section removed.** The "My Photo" (`card_photos` upload) block on the card detail view is gone. The `card_photos` table is no longer read or written from this page — the supporting state (`cardPhoto`, `uploadingPhoto`, `photoInputRef`) and the `loadCardPhoto` / `uploadCardPhoto` helpers were deleted at the same time. If/when we bring user photos back on cards, plan for a simpler UX (e.g. swap the hero photo itself, like Recipe Vault).
- **Shopping List — per-ingredient +/✓ toggle (matches Recipe Vault).** Inside the Ingredients section of the card detail view, each row has a small round `+` button that turns green `✓` once that ingredient is in the list. `toggleIngredient(ing)` adds a row to `shopping_list` (`ingredient = "{measure} {name}"`, `recipe_title = viewing.title`, `checked = false`, `store_id = null`) or deletes it on toggle-off. A `🛒 Add All` button sits next to the "Ingredients" heading and calls `addAllToShoppingList()` to insert every ingredient at once and mark them all as added. Session-level state (`addedToList: Set<string>`) tracks what was added during the current view; it resets when a different card is opened. The old full-width "Add all ingredients" button below the card was removed.

## AI Kitchen Helpers — tab strip (April 2026)

The `view === 'enhance'` screen on `/secret` (the **✨ AI Kitchen Helpers** page) used to stack four helper cards on the same scroll: 🧹 Polish / ⚖️ Resize / 📊 Details / 🌿 Make more… Since they're alternatives — only one is used per visit — the page is now a **tab strip** matching the Import Recipes pattern. State: `helperTab` in `app/secret/page.js`, default `'polish'`. Values: `'polish' | 'resize' | 'info' | 'transform'`. A `grid-cols-2` pill row sits below the intro card; active tab fills `bg-orange-600 text-white`, inactive tabs are `text-gray-600`. Below the tabs, only the active card renders. The card colors (orange / sky / emerald / purple) and per-card behavior are unchanged — just the gating.

## Recipe Vault "Make This Recipe More..." flow

On `/secret` → open a recipe → tap **✨ AI** → switch to the **🌿 Make more…** tab. Uses the same 8 preference values as Chef Jennifer.

Flow: select chips → **Transform with N preferences** button → preview card shows the new title, description, chip summary, ingredients, and instructions → user picks one of three actions:

- **💾 Save as new recipe** — inserts a new row in `personal_recipes` with `title = transformResult.title` (or `"<original> (adjusted)"`), prepends a `family_notes` line: `Transformed from "<original>" — made more <labels>.`, carries over category/tags/photo/servings from the original. Original is untouched.
- **♻️ Replace this recipe** — confirms, then updates title/description/ingredients/instructions on the current row via `updateRecipe()`.
- **✕ Discard** — clears transform state; nothing is saved.

API: `POST /api/enhance-recipe` with `{ recipe, action: 'transform', preferences: [...] }`. Returns `{ title, description, ingredients[], instructions }`. The same disclaimer guard from Chef Jennifer is in the prompt. `max_tokens` is 2000 on this route (bumped from 1500) to give transforms room.

## API routes (`app/api/`)

- `/api/chef` — Chef Jennifer 🎓 Teach-mode chat backend (Q&A / teaching). Uses `claude-haiku-4-5-20251001`.
- `/api/topchef` — Chef Jennifer 🍳 Practice-mode recipe generator (returns JSON recipe). Uses `claude-haiku-4-5-20251001`. The wizard at `/topchef` was retired Phase 2A; the page is now a `redirect('/chef')` and only the API route still carries the `topchef` name. **DB-first cache layer (April 2026)** — the route tries `findCachedRecipe` from `lib/chef_recipe_cache.js` before generating fresh; on a hit it sends the matched row + the user's prompt to haiku for an adapt pass and bumps `times_served` + `last_served_at` on the base. On miss it falls through to fresh generation and INSERTs into `chef_recipes`. Response includes `source: 'cache' | 'fresh'` so we can watch the hit rate climb as the corpus fills. See "Chef Jennifer — corpus mining" below.
- `/api/import-recipe` — parse/ingest external recipes. Accepts `{ url }` or `{ text }`. **YouTube support:** if `url` is a `youtu.be` / `youtube.com/watch` / `youtube.com/shorts` link, the route pulls title/channel/description/thumbnail via the YouTube Data API v3 and captions via `youtube-transcript`, then feeds the combined blob to Claude. Requires `YOUTUBE_API_KEY` in env. Falls back to description-only when captions are unavailable. Thumbnail becomes the recipe image.
- `/api/enhance-recipe` — AI enrichment of existing recipes. Actions: `enhance`, `resize`, `generate_info`, `transform`.
- `/api/admin/cooking-videos` (GET) — admin-only list of `cooking_videos` for the Featured curator. Bearer-token gated on `ADMIN_EMAIL` (`bd9356@gmail.com`). Optional `q` (title ilike), `featured=true` (restrict to `is_featured` rows), `limit` (capped at 500). Response sorts featured-first then by `view_count` desc, with each row's `video_metadata` flattened under `_meta`.
- `/api/admin/video-action` (POST) — admin-only mutation endpoint. Bearer-token gated. Actions: `feature` / `unfeature` only (Recipe doesn't have Golf's `editorial_status` / `primary_bucket` knobs, so the surface is intentionally smaller). Body: `{ videoId, action }`. Mutates `cooking_videos.is_featured`. Returns `{ success: true, video: { id, is_featured } }`. Uses `SUPABASE_SERVICE_ROLE_KEY` (falls back to anon if missing) so it can write regardless of RLS.

## Admin pages (`app/admin/`)

- `/admin/featured` — Featured curator for Chef TV (April 2026). Mirrors Golf's `/admin/featured` pattern but pared down to the only knob Recipe has: flip `cooking_videos.is_featured` on/off. Auth is double-gated — client-side check redirects non-admin to `/kitchen`, and the API routes also re-validate the Bearer token against `ADMIN_EMAIL`. UI: sticky search input (300ms debounce) + "⭐ only" checkbox in the header; row list shows thumbnail, title, channel + view-count, a 🍳 Recipe / 🎓 Teach chip (derived from `video_metadata.ingredients` so the curator can see at a glance what kind of video they're picking), and a single ⭐ Feature / ☆ Unfeature button. No bucket tabs, no Hide button, no Rebucket select — Recipe doesn't carry those columns. Optimistic updates: feature/unfeature flips the in-memory row immediately; when "⭐ only" is on, an unfeature also drops the row from the list. Sorted featured-first then `view_count` desc by the API. Powers the ⭐ Featured chip on `/videos` Teach tab — see below.

## Featured chip on Chef TV (`/videos`)

The ⭐ Featured chip on the Teach tab is curator-additive. The chip's filter logic on `app/videos/page.js`:

1. Pull the current `afterFilter` list (Teach-mode + non-Shorts + active topic + search), already sorted by `teachScore` desc.
2. Slice off all rows with `is_featured = true` — these are the curator's hand-picks (sorted within by `teachScore`, since they came in pre-sorted).
3. If there are ≥ `FEATURED_CAP` (15) curated rows, return them.
4. Otherwise, append the top `teachScore` rows that *weren't* in the curated set, until the list reaches `FEATURED_CAP`.

So the chip never feels empty — when the curator hasn't picked anything yet, it falls back to the automatic top-15 by `teachScore`, and as the curator adds picks they progressively replace the auto-slice rows from the top down. `cooking_videos.is_featured` was added in `supabase/010_chef_tv_featured.sql` (idempotent, partial index on `is_featured = true`).

## Ingestion scripts (run manually with `node <script>.js`)

- `ingest_videos.js` — pulls cooking videos.
- `ingest_education_metadata.js` — enriches education videos.
- `ingest_missing.js` — fills gaps.
- `generate-instructions.js` — AI-generates step-by-step instructions for videos that have ingredients but no instructions. Uses `SUPABASE_SERVICE_ROLE_KEY` — do **not** commit.

## Conventions

- **Mobile-first** layout. Main containers use `max-w-lg` (kitchen/hub) or `max-w-2xl` (content pages) with `mx-auto px-4`.
- **Sticky headers** with `← Back` button on the left, page title (emoji + name) center-left, and a context action on the right.
- **Toast**: `fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white …` — 2.5s auto-dismiss.
- **Color system**: page actions lean orange (`orange-600`), section accents follow MyKitchen palette (amber / pink / orange / purple). Meal Plan buckets override with amber/violet/sky; My Playbook buckets use sky for 🎓 Teach, orange for 🍳 Practice, and amber for 📝 Chef Notes.
- **Borders**: `border-2` with `-300`/`-400` shades on emphasis elements; `border` with `-100`/`-200` for subtle dividers.
- **Rounded**: cards are `rounded-2xl`; chips/pills are `rounded-full`; buttons `rounded-xl`.
- **Auth gate**: every authenticated page does a `supabase.auth.getSession()` check in `useEffect` and redirects to `/login` if absent.
- **Navigation**: `window.location.href = '...'` is used instead of `next/link` in most pages (keep it consistent when adding new buttons).
- **Shared components** live in `components/`:
  - `SafeYouTube.js`, `YouTubePlayer.js`, `UnifiedVideoPlayer.js` — video embedding with sandboxing.

## Security & secrets

- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `YOUTUBE_API_KEY`. Never commit these. `YOUTUBE_API_KEY` is only used by `/api/import-recipe` for YouTube URL imports (Data API v3).
- Service role key is only for ingestion scripts; app code uses the anon key.
- **Known issue**: the GitHub Personal Access Token is currently embedded in the `origin` remote URL (`.git/config`). Rotate at https://github.com/settings/tokens and reset the remote to use SSH or a credential helper.

## Workflow

- `npm run dev` — local dev at `http://localhost:3000`.
- `git push origin main` — triggers Vercel deploy to `recipe.mycompanionapps.com`.
- Commit style: `feat: <page> - <short description>` (e.g., `feat: Shopping List - AI cleanup button`). Body uses `-` bullets for specifics.

## Naming canon (current state)

The canonical names in use across the app are:

- **MyKitchen** (`/kitchen`) — the one "My" we keep for the hub. Every other tile has a simple, direct name.
- **Cooking Life** and **Learn Your Way** are *section names on MyKitchen*, not routes. Cooking Life groups Recipe Vault + Recipe Cards + Meal Plan + Shopping List ("Your recipes, your plan, your essentials."). Learn Your Way groups Chef Jennifer + Chef TV + Your Library + My Playbook ("An AI-powered cooking school."). Previous labels for the same section: **Cooking School** (the original April 2026 reframe), then **Learning Journey** ("Your classrooms, your library, your practice book."), now **Learn Your Way** ("An AI-powered cooking school.") — same tiles, same order, just simpler framing each time. The "Guides" tile also picked up the friendlier name **"Your Library"** in the Learn Your Way pass (route stays `/guides`). There are no `/cooking-life` or `/learn-your-way` URLs and there shouldn't be — the hub already does the framing.
- **Recipe Vault** (`/secret`), **Recipe Cards** (`/cards`), **Chef TV** (`/videos`), **Chef Jennifer** (`/chef` — single chat-first surface with 🎓 Teach / 🍳 Practice modes), **Guides** (`/guides`), **Meal Plan** (`/meal-plan`), **Shopping List** (`/shopping-list`), **My Playbook** (`/playbook`) — simplified, no "My" prefix except Playbook (which keeps it because it's the personal saves surface and it mirrors Golf's "MyBag"). **Chef Notes** and **Chef Jennifer Recipes** are still concept names but both live inside `/playbook` as tabs (📝 Notes and ✨ Recipes), not their own routes — `/chef-notes` and `/chef-recipes` both redirect to `/playbook`. The "Ask Chef Jennifer" / "Ask Chef Anything" name was retired Phase 2A — there's just **Chef Jennifer** at `/chef` now. **The Library** is the in-page tagline for `/guides` (header H2), not the route name.
- Brand name in titles, meta, headers, and copy is **MyRecipe Companion**. (We briefly tried "Recipe AI Companion" and reverted — the "My" prefix matches the MyCompanionApps family and reads more personal. Short-name/PWA label is **MyRecipe**.)
- **Vocabulary canon — Teach / Practice (April 2026 rename).** Across Chef TV (filter pill row), Chef Jennifer (mode pill row), and Playbook (tab strip), the same two words mean the same two things: **🎓 Teach** = techniques to master / video-only / Q&A teaching; **🍳 Practice** = recipes to cook / recipe videos / generated recipes. Visual order is locked **Teach first, Practice second** on every surface. Practice uses orange (the brand color) because it's the user's primary action; Teach uses sky. The previous "❤️ Love / 🎓 Learn" vocabulary was retired — Love read as favorites/saved/liked when the actual meaning is "cook this", and the visual order was wrong (instruction comes first, cooking comes after). Database table `loved_recipe_urls` and the historical `favorites.type` strings (`ai_recipe`, `ai_answer`, `video_recipe`, `video_education`) are unchanged — they describe content type, not mode, and they're never user-visible.
- `MyCooking` / `MyPlan` (the old combined `/picks` page) was retired in Phase 2C. Its sections now live at dedicated routes; `/picks` is a thin server-side redirect (see "`/picks` redirect" above). Save-button labels across the app were updated in the follow-up Phase 2C.1 sweep — "Save to MyCooking" now reads "Save to Chef Jennifer Recipes" (on `/chef` 🍳 Practice mode), "Save to Chef Notes" on `/chef` 🎓 Teach mode, "Meal Plan" on `/cards` and `/secret`, and the landing/about/notes tiles were retitled "Meal Plan". The single contextual save on Chef TV evolved from the 4-button My Playbook strip to a 3-button strip (Save/Love/Learn) and finally to a single contextual button (🍳 Practice for recipe videos, 🎓 Teach for video-only) — see "My Playbook" above.
- **Chef Jennifer Recipes folded into Playbook (April 2026).** The standalone `/chef-recipes` page is now a redirect to `/playbook`; saved recipes live on Playbook in the **Chef Jennifer · 🍳 Practice** cell (rose color). Same precedent as Chef Notes. The Playbook nav grew from 3 flat tabs to a 2×2 (two teachers × two modes), then the four cells were laid out as two stacked teacher pill rows — see "two-classroom tab nav" under My Playbook. MyKitchen "Your Recipes" section dropped from 3 → 2 tiles (Vault + Cards). Save-flow on `/chef` Practice mode is unchanged (`favorites.type='ai_recipe'`); only the destination surface changed.

Swept in recent passes and no longer present:
- `app/login/page.js`, `app/profile/page.js`, `app/about/page.js`, `app/page.js`, `app/notes/page.js` — brand text (→ MyRecipe Companion).
- `app/manifest.js`, `app/layout.js` — PWA + HTML metadata (→ name "MyRecipe Companion", short_name "MyRecipe").
- `app/api/chef/route.js` — system prompt persona (→ Chef Jennifer, inside MyRecipe Companion).
- `../my-companion-apps/app/page.tsx` — hub landing tile + footer link (→ MyRecipe Companion / "MyRecipe").

Known still-stale spots (future cleanup candidates, low urgency):
- `app/saved/page.js` — uses "MyFavorites" in the header and in a `family_notes` DB string. The page isn't in the main MyKitchen nav and the DB string is historical; leaving as-is unless the page is brought back into the main nav.

## Landing page (April 2026 — match-the-hub redesign)

The landing page (`app/page.js`) is a hub-shaped front door for cold visitors. Visual story matches MyKitchen exactly so signing in feels like stepping through a door, not switching apps:

- **Background:** `bg-gray-50` (same as MyKitchen).
- **Container:** `max-w-lg` (was `max-w-2xl` — narrowed to match the hub).
- **Header:** brand left ("🍽️ MyRecipe Companion" + small subtitle "Your AI guide to better cooking."), action pill right. Pill is `bg-orange-50 text-orange-600` to mirror MyKitchen's Profile pill — same warm orange chip in the same corner. Sticky like MyKitchen's header.
- **Section labels:** `text-orange-600 uppercase tracking-wider font-extrabold` (matches the hub).
- **Tiles:** `border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-2xl` — identical to MyKitchen's tiles, including hover state and the › arrow. 26px emoji, bold black title, gray description (truncated to one line).
- **Primary CTA:** `bg-orange-600 hover:bg-orange-700` warm orange (was `bg-stone-800`). The CTA color matches the tile-stripe color, so signing in and tapping into a tile read as the same gesture.
- **Footer:** two inline links in `text-stone-500` separated by a bullet — **About MyRecipe Companion** and **Tester notes**, hover to `text-orange-600`.

The food-photo hero stays. It's the only thing the landing has that the hub doesn't, and it's the right grab for cold visitors — gradient + white headline still reads against any photo in rotation.

**Color history.** Earlier iteration was a neutral stone palette (`bg-stone-800` CTA, `text-stone-500` labels, `border-stone-200` cards) — it kept the page legible but the handoff to MyKitchen's orange-stripe tiles felt like a tone change. April 2026 redesign unified the two pages on MyKitchen's brand orange. An earlier-still iteration used `bg-amber-50` (cream parchment) for the landing + About to contrast MyKitchen's gray; the two-color handoff read as a jarring break and was reverted (we kept `bg-gray-50` shared).

**Hero tagline (signed-out).** The signed-out hero shows **"Cooking, figured out."** at `text-3xl sm:text-4xl font-bold` with subline "Recipes, meal plans, and an AI chef — one cozy kitchen." The hero container is 220px tall so the photo + headline read as the first thing on the page, not an afterthought. Signed-in visitors see a personalized greeting ("Welcome back, {name}.") at the same large size. Earlier variants tried and reverted: "Cook with a little help." (too quiet; didn't grab), "Save it → Plan it → Cook it" with joinery arrows (busy next to the feature tiles; the arrow pattern only fits a single linear story, not a 2×2 group grid).

**What's inside — full hub preview from a shared source.** The landing's "What's inside" block renders the same two sections (Cooking Life / Learn Your Way) and the same 8 tiles as MyKitchen, with the same orange uppercase section headers and the same orange-stripe tile rows. The data lives in **`lib/kitchen_sections.js`** (`KITCHEN_SECTIONS`). Both `app/kitchen/page.js` and `app/page.js` import from there, so the two pages can never drift — when you add/rename/remove a section or tile, you only edit `kitchen_sections.js`. Tile hrefs in the data are deliberately ignored on the landing: every tile's `<a href>` is overridden to `/kitchen` for signed-in visitors and `/login` for signed-out visitors. The hub is where individual tiles route to their pages; on the landing every tile is a sign-in path or a hub entry. Earlier iterations of this block (each one named in a one-line comment): a flat 8-tile list under small section labels (too long), then a compact `grid-cols-2` group-card preview with just emoji strips (felt abstract — emoji strips weren't legible enough), then this April 2026 hub-mirror version.

## Tester banner & `/notes` page

During the private test period, the landing page carries a small dark **tester banner** above the entry box, and a dedicated `/notes` page holds the longer "what to try this week" copy. Both are designed so non-dev Bill can edit copy by changing constants at the top of a file and pushing.

- **Banner** (`app/page.js`, `BANNER` constant): `{ enabled, version, message, linkHref, linkLabel }`. Dark `bg-stone-900` strip with an `×` dismiss button. Dismissal persists via `localStorage.recipe_ai_banner_dismissed_${BANNER.version}`. Bump `BANNER.version` to force-redisplay. Set `BANNER.enabled = false` to hide entirely. The setState-in-effect that reads the dismissal flag on mount is intentional (SSR has no `window`) and has a localized eslint-disable.
- **`/notes` page** (`app/notes/page.js`): palette matches the landing page. All copy lives in clearly-commented constants at the top: `NOTES_UPDATED` (date string), `INTRO` (paragraph), `WHATS_NEW` / `TRY_THIS` / `KNOWN_QUIRKS` (arrays of strings rendered as bullet lists via `<Section>`), and `FEEDBACK` (text + email). The page uses `next/link` for in-app navigation to satisfy `no-html-link-for-pages`.
- Footer on the landing page has a permanent `Tester notes` link next to `About MyRecipe Companion` so the page stays reachable after the banner is dismissed.
- When we ship publicly, the quickest retirement is `BANNER.enabled = false` in code and/or deleting the footer link. The `/notes` route can stay or be removed; nothing else depends on it.

## Authentication (Google + Microsoft OAuth + magic link via Resend)

Three ways to sign in, all on `/login`:

- **Sign in with Gmail** — `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })`.
- **Sign in with Microsoft** — `supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: '<origin>/auth/callback', scopes: 'email openid profile' } })`. Covers Hotmail, Outlook.com, Live, MSN, Office365 (all share one Microsoft account). Added April 2026 because magic-link sign-in is fragile in mobile email apps' in-app browsers (Outlook on iOS opens links in its own webview that doesn't share localStorage with Safari, so the session "sticks" inside Outlook but the user appears signed-out when they later open the app in Safari). Microsoft OAuth bypasses email entirely for that audience.
- **Email me a sign-in link** — `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<origin>/auth/callback' } })`. Success state replaces the form with a "Check your email" panel. Kept as the catch-all for any tester whose email isn't covered by the two OAuth buttons (Yahoo, custom-domain, etc.).

Both flows converge on `app/auth/callback/route.js` → forwards the `code` to `app/auth/confirm/page.js` → `exchangeCodeForSession(code)` → `/kitchen`. No callback changes are needed when adding another provider.

**Azure / Microsoft setup.** One shared Azure app registration covers both Recipe and Golf (and any future MyCompanion apps). In Azure Portal → App registrations → New, supported account types = "Personal Microsoft accounts only" (Hotmail/Outlook/Live) or "Personal + work/school" if you want corporate Office365 too; redirect URIs include both Supabase callback URLs (`https://<recipe-supabase-ref>.supabase.co/auth/v1/callback` and `https://<golf-supabase-ref>.supabase.co/auth/v1/callback`). The resulting Application (client) ID + a generated client secret get pasted into each Supabase project under **Authentication → Providers → Azure → enable**. Tenant ID stays at `common` (the default) so both personal and work Microsoft accounts can sign in.

### SMTP for magic-link deliverability (Resend)

Supabase's default SMTP is rate-limited and gets spam-flagged by Hotmail/Outlook. Custom SMTP is wired up through Resend:

- **Provider:** Resend — domain `mycompanionapps.com` verified (SPF/DKIM/DMARC records live on the domain's DNS).
- **Supabase → Project Settings → Authentication → SMTP Settings:** host `smtp.resend.com`, port `465`, username `resend`, password = Resend API key. Sender `noreply@mycompanionapps.com`, display name "MyRecipe Companion".
- **Supabase → Auth → URL Configuration:** Site URL = `https://recipe.mycompanionapps.com`. Redirect allow-list includes `https://recipe.mycompanionapps.com/auth/callback`, `https://jen-ai-companion.vercel.app/auth/callback` (kept during the transition / for Vercel preview deploys), and `http://localhost:3000/auth/callback` for local dev.
- **Supabase → Auth → Providers → Email:** enabled.

Rotating / revoking the Resend API key is a Supabase SMTP-fields update only; no app-code change.

## New-user seeding (starter content)

First-time users get a small set of starter content loaded across **two** surfaces — Recipe Vault and Chef Notes — so the app feels lived-in on day one instead of greeting them with empty pages. All seeders fire from `app/kitchen/page.js` inside the auth `useEffect`, are idempotent, and swallow errors so a single Supabase hiccup never blocks the hub.

**Meal Plan is intentionally NOT seeded.** Bill's framing (April 2026): clicking ❤️ Favorite is a preference signal; tapping 📅 Meal Plan is the explicit "I'm cooking this" gesture. They're two separate actions and shouldn't be coupled at seed-time — auto-populating Meal Plan from favorites taught the wrong mental model on day one. New users land on an empty Meal Plan and discover it by tapping the tile, then fill it via the 📅 Meal Plan button on a Vault recipe (or a Card / a Chef Jennifer recipe). Do NOT re-add automatic Meal Plan seeding without revisiting this product framing first.

### Recipe Vault — `seedStarterRecipesOnce`

- Recipe data lives in `lib/starter_recipes.js` as a hand-curated array of 5 recipes — one quick weeknight (Aglio e Olio), one one-pan weeknight (Sheet-Pan Lemon Chicken), one comfort (Tomato Soup + Grilled Cheese), one healthy/modern (Honey-Soy Salmon Bowl), one project bake (Brown Butter Chocolate Chip Cookies). Each carries `family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own."` — the warm-welcome wording doubles as the app-seeded marker so users know these are examples, not personal saves.
- Two recipes (Aglio e Olio + Brown Butter Cookies) are flagged `is_favorite: true` so the new user lands in the Vault with the ❤️ Favorites filter chip already populated. Favoriting is a preference signal only — it does not pre-fill any other surface.
- Idempotent in two ways:
  1. `localStorage` flag `recipe_ai_seeded_${STARTER_RECIPES_VERSION}_${user.id}` — if set, no work happens.
  2. Counts the user's `personal_recipes` first; if > 0 (returning user, or already seeded on another device), sets the flag without inserting.
- A second pass `backfillStarterFavoritesOnce` runs idempotently on every visit (gated by `STARTER_BACKFILL_VERSION`) to retroactively flag any starter rows whose first-seed `is_favorite` write didn't land — mostly a defense against PostgREST schema-cache lag right after migration 011 added the column. Match is by `FAVORITE_STARTER_TITLES` + the `"Welcome —"` family_notes prefix, so we never touch a user's own recipes.
- `STARTER_RECIPES_VERSION` is in the localStorage flag so we can ship a future content rev without re-seeding existing users (just bump the const).

### Chef Notes — `seedChefNotesOnce`

Independent of the recipe seeder, gated on its own `STARTER_CHEF_NOTES_VERSION` flag and its own emptiness check (`favorites where type='ai_answer'`), so existing v1-seeded users still pick up notes here without a redundant recipe re-seed.

- Two starter notes live in `lib/starter_recipes.js` as `STARTER_CHEF_NOTES`. Content mirrors two of the empty-state suggested prompts on `/chef` ("How do I know when oil is hot enough?" / "What's a good substitute for buttermilk?") so the surfaces feel connected — tap that prompt later, see your saved note already there.
- Each note becomes a `favorites` row with `type='ai_answer'`, `metadata: { question, answer }` — same shape `/chef`'s save flow writes — so they render via `<ExpandableItem>` on `/playbook` (📝 Chef Notes section) without any special-casing.

### Why two surfaces

The Vault gets the recipes, Playbook gets the Chef Notes. Both make their own page non-empty so the user has something concrete to look at, and the ❤️ Favorites filter chip on the Vault is pre-populated to telegraph that the chip exists. Meal Plan, Recipe Cards, and Shopping List all start empty by design — those surfaces are about *the user's* intent, not about content we ship. The discoverability cost (an empty page on first tap) is worth keeping the gestures honest.

## PWA

The app is an installable PWA as of April 2026:

- `app/manifest.js` — Next 16 built-in manifest. Name "MyRecipe Companion", short name "MyRecipe", standalone display, portrait, `background_color: #fffbeb`, `theme_color: #ffffff`. Served by Next at `/manifest.webmanifest`.
- `app/layout.js` — uses the Next 16 metadata + viewport exports. `appleWebApp.title` is "Recipe AI", phone auto-detection disabled, `mobile-web-app-capable` meta for non-Apple browsers.
- `/public/icon-192.png`, `/public/icon-512.png`, `/public/icon-512-maskable.png`, `/public/apple-touch-icon.png` (180x180), `/public/favicon-32.png` — stone-800 background with a cream circle + bold "R" + amber accent dot. Placeholder design; swap for a brand-final icon later.
- No service worker yet. Offline support and push notifications are deferred — per the Next PWA guide, installability doesn't require a service worker.
- iOS install path: Safari → Share → Add to Home Screen.

## Don't-touch / confirm first

(Populate this as we make decisions — currently empty. Candidates: auth flow, Supabase schema migrations, anything in `ingest_*` scripts during a live ingestion run.)

## How to use this file

- Every Cowork / Claude session starts fresh with **no memory** of previous conversations. This file is the handoff.
- When adding a new page, section, or convention: update the relevant section here in the same commit.
- When a decision matters ("we tried X and rejected it because Y"), capture it under a new `## Decision log` section rather than burying it in commit messages.
