<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MyRecipe Companion — Project Brief

A **cozy, modern cooking companion** that blends a personal recipe vault, guided learning, and an AI chef who's always ready to help. For **home cooks** who want a simple, confidence-building way to save recipes, learn skills, and get AI help in the kitchen.

Repo: `bd9356-gif/jen-ai-companion`
Deploy: Vercel → `www.mycompanionapps.com` (production). The original Vercel URL `jen-ai-companion.vercel.app` is kept allow-listed during the transition.
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
| Chef TV                | `/videos`     | Cooking videos (YouTube-backed).                                    |
| My Playbook            | `/playbook`   | Saved Chef TV videos, bucketed by intent (Save/Love/Learn).         |
| Ask Chef Jennifer      | `/chef`       | Free-form AI Q&A. Saves land in Chef Notes.                         |
| Chef Notes             | `/chef-notes` | Saved AI answers, chronological.                                    |
| Chef Jennifer Recipes  | `/chef-recipes` | Recipes Chef Jennifer made for you; save-to-vault from here.      |
| Meal Plan              | `/meal-plan`  | 3 buckets of "what you're cooking soon".                            |
| Shopping List          | `/shopping-list` | Ingredients grouped by store; AI cleanup / copy / print.         |
| Chef Jennifer          | `/topchef`    | AI chef who generates recipes tailored to mood/meal/protein.        |

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

Phase 2 did not do a naming sweep of downstream pages — Ask Chef Anything still says "Ask Chef Anything" in places, for example. Those get swept as each page is touched in later phases.

## Kitchen navigation sections

These live in `app/kitchen/page.js`. MyKitchen is **4 sections and 9 tiles** total. All tiles use a unified **orange left stripe** (brand color) — `border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-2xl` — mirroring Golf's green-stripe Clubhouse pattern. No dash subtitles; each tile shows `title` (bold) + `description` (truncated one-liner).

Section headers are small orange uppercase labels with a one-line section subtitle below, followed by the section's tiles.

### Section structure

1. **Your Recipes** — "Your saved recipes and collections."
   - 🔐 Recipe Vault → `/secret` — "Your saved recipes, organized."
   - 🃏 Recipe Cards → `/cards` — "Flip through your collection."
   - ✨ Chef Jennifer Recipes → `/chef-recipes` — "Recipes Jennifer made for you."

2. **Plan & Shop** — "Organize what you're cooking next."
   - 📅 Meal Plan → `/meal-plan` — "What you're cooking soon."
   - 🛒 Shopping List → `/shopping-list` — "Ingredients, organized to shop."

3. **Learn** — "Build your cooking skills." Chef TV is the video source with My Playbook as its destination. Chef Notes is the destination for AI answers — the source (Ask Chef Jennifer at `/chef`) lives inside the Chef Jennifer section, not here, so Learn stays focused on what you've *saved* and *learned* rather than mixing in the ask-anything entry point.
   - 🎬 Chef TV → `/videos` — "Cooking videos, one tap away." **Source.**
   - 📘 My Playbook → `/playbook` — "Save it. Love it. Learn it." **Destination for Chef TV saves.**
   - 📝 Chef Notes → `/chef-notes` — "Saved AI answers, anytime." **Destination for Ask Chef Jennifer saves.**

4. **Chef Jennifer** — "Your personal AI chef."
   - 👨‍🍳 Chef Jennifer → `/topchef` — "Create a new recipe, tailored to you."

### `/picks` redirect

`app/picks/page.js` is a server component that calls `redirect()` from `next/navigation`. It reads `searchParams.open` (awaited — Next 16 pattern) and maps old keys to new routes:

| `?open=` value     | Destination        |
| ------------------ | ------------------ |
| `meal_plan`        | `/meal-plan`       |
| `shopping_list`    | `/shopping-list`   |
| `ai_notes`         | `/chef-notes`      |
| `chefjen`          | `/chef-recipes`    |
| `chef_videos`      | `/playbook`        |
| (missing/unknown)  | `/kitchen`         |

This preserves old bookmarks while the combined `/picks` page is gone. If/when we're confident no one is hitting these URLs anymore, delete `app/picks/` outright and Next will 404.

### Phase 2A pages (new as of April 2026)

Each of the four new pages is a focused single-screen experience, matching MyKitchen's aesthetic (sticky header, orange accents, mobile-first `max-w-2xl` container, toast system, auth gate).

- **`app/meal-plan/page.js`** — renders three bucket frames (⭐ To Make amber / 📋 Maybe violet / 🗂 Later sky). Data in `my_picks` keyed by `bucket`. Per-item move buttons show the *other* two bucket colors as cues for where the item would go. Empty state offers shortcut buttons to Recipe Cards and Recipe Vault.
- **`app/shopping-list/page.js`** — uses the shared `<ShoppingByStore>` grid, the shared `<StoreEditor>` (shown inline via `showStoreEditor` toggle), plus a full action bar in the card header: 🏬 Manage Stores, ✨ Clean Up List (calls `/api/cleanup-list`), 📋 Copy (clipboard), 🖨️ Print (popup window). "Clear All" lives on the right. All the existing `/picks` behaviors (grouped-by-store render, unsorted bucket, per-item store reassignment, AI cleanup with `recipe_title` discard, plain-text export sorted by `stores.sort_order`) are preserved because the heavy logic lives in the shared components plus the helpers duplicated here (`buildShoppingListText`, `cleanUpList`).
- **`app/chef-notes/page.js`** — chronological list of saved AI answers (`favorites` where `type='ai_answer'`). Each row uses `<ExpandableItem>` which opens in place to show the full answer. Header action points at `/chef`. Empty state encourages asking a question and saving it.
- **`app/chef-recipes/page.js`** — list of Chef Jennifer recipes (`favorites` where `type='ai_recipe'`). Each row uses `<ChefJenItem>`, which expands to show cuisine/difficulty chips, ingredients, instructions, and a 💾 Save to Recipe Vault button. `saveToVault(item)` inserts into `personal_recipes` with `family_notes: 'Saved from Chef Jennifer.'`, normalizing ingredients to `{name, measure}` shape. Header action points at `/topchef`.

### Shared row components (new as of April 2026)

Factored out of `app/picks/page.js` so both `/picks` and the Phase 2A pages render identical rows:

- `components/ExpandableItem.js` — one saved AI answer. Props: `item`, `emoji`, `onRemove`. Toggle-open reveals `metadata.answer`.
- `components/ChefJenItem.js` — one saved Chef Jennifer recipe. Props: `item`, `onRemove`, `onSaveToVault`. Renders measure + name for each ingredient; bolds measures when present.
- `components/VideoItem.js` — one saved Chef TV video thumbnail with play-to-embed behavior (used by `/playbook`).
- `components/ShoppingByStore.js` — the grouped-by-store grid. Default export: `ShoppingByStore`. Named export: `StoreEditor` (inline store manager — add/edit/remove with emoji + website URL). Internal helper: `StoreRow`.

`/picks` was retired in Phase 2C — the shared components above are used by the dedicated pages (`/meal-plan`, `/shopping-list`, `/chef-notes`, `/chef-recipes`, `/playbook`).

### My Playbook (`/playbook`)

**Pivot from Skills I Learned (April 2026).** The original Skills I Learned used six course-type buckets (Starter / Breakfast / Mains / Sides & Veg / Baking / Desserts). Bill's read: sorting cooking videos that way is impossible because videos don't cleanly fit course types — a single video is often a main AND a technique AND a weeknight thing. The buckets asked *what kind of food is it?*, but the question the user can actually answer at save time is *what do I want to do with this?*

My Playbook replaces course-type buckets with **intent-based** buckets. It's also video-only — saved AI answers land in Chef Notes (`/chef-notes`), not here, giving Chef TV and Ask Chef Jennifer each their own destination tile under the Learn section.

**4 → 3 bucket collapse (April 2026).** First shipped with four buckets (Save/Love/Cooked/Learn); Bill flagged that Cooked overlapped too much with Love ("I want to make this") and Learn ("I'm practicing this"). Dropped Cooked. The three remaining buckets map cleanly to how home cooks actually learn: **see → try → improve**.

| Key   | Emoji | Bucket | Meaning                      | Color |
| ----- | ----- | ------ | ---------------------------- | ----- |
| save  | 📥    | Save   | Keep videos that inspire you. (see)    | slate |
| love  | ❤️    | Love   | Meals you want to try. (try)           | rose  |
| learn | 🎓    | Learn  | What you're working on. (improve)      | sky   |

Header tagline: **"Save it today. Love it tomorrow. Learn it for life."**

No rename / reorder / delete — locked, like Golf's MyBag. All colors are written as complete literal Tailwind class strings in `app/playbook/page.js` (`COLOR` map) and `app/videos/page.js` (`PLAYBOOK_BUCKETS`) so v4's JIT scanner picks them up.

**Save-at-source UX (important).** Chef TV video cards no longer have a single heart-shaped save button. Instead, each card shows a **3-button save strip** under the thumbnail — 📥 Save / ❤️ Love / 🎓 Learn. One tap places the video directly into that bucket. Tapping the same bucket again removes the save. Tapping a different bucket moves it between buckets. Labels are hidden on mobile (`sm:inline`) to fit three buttons; desktop shows emoji + label. Per-bucket active state uses `activeCls` with a filled colored background; inactive buttons are white with gray border.

**Love + recipe → ingestion capture (important).** When a user hits ❤️ Love on a video that has a recipe (`video_metadata.ingredients` non-empty), `setBucket()` also writes a row to `loved_recipe_urls` (user_id, favorite_id, video_id, youtube_id, youtube_url, title, channel). Moving away from Love deletes that row. Toggling Love off deletes it. Pure backend signal capture — no user-facing surface. The table is for curation: which recipes are resonating so we can improve metadata or add them to the curated pool.

**Data model.** Same `cooking_skill_items` table. Migration history:
- `supabase/002_cooking_skill_items.sql` — created the table with six course-type buckets.
- `supabase/003_playbook_buckets.sql` — collapsed the six into `save`, installed CHECK for `save/love/cooked/learn`, default `save`.
- `supabase/004_playbook_3buckets.sql` — dropped the CHECK, collapsed `cooked` rows into `save`, installed CHECK for `save/love/learn`.
- `supabase/005_loved_recipe_urls.sql` — new `loved_recipe_urls` table for the Love+recipe capture. `favorite_id` FK cascades on delete. RLS scoped to `user_id = auth.uid()`.

All migrations are idempotent — safe to re-run.

`item_type` values on `cooking_skill_items`:
- `cooking_video` — `item_id` = `cooking_videos.id` (legacy Chef TV save)
- `education_video` — `item_id` = `education_videos.id` (legacy education save)
- `favorite` — `item_id` = `favorites.id`. Covers all favorites-sourced items. The source's `favorites.type` still discriminates — but `/playbook` only loads `video_recipe` and `video_education` (videos); `ai_answer` favorites are intentionally excluded and live only in Chef Notes.

**Page behavior.** `loadAll` fetches the three source tables + `cooking_skill_items` in parallel and merges them. If the same underlying video exists in both legacy (`saved_videos`) and new (`favorites`) form, the legacy row wins (dedupe by `_item_type:_item_id`). Each row renders via `<VideoItem>` plus an inline "Move ▾" menu showing the other two buckets as colored chips. Moving upserts into `cooking_skill_items`; removing deletes from the source table AND the `cooking_skill_items` row. All buckets default to **collapsed** on page load; moving an item auto-expands the destination bucket so the user sees where it went. A slate callout at the top of the page explains the three buckets.

**Back-compat.** `/skills` is now a server-side `redirect()` → `/playbook`. Old bookmarks survive.

## Meal Plan buckets (`/meal-plan`)

Meal Plan organizes saved recipes into three buckets and color-codes them consistently across the page (frames + move-to buttons):

| Bucket  | Emoji | Meaning                        | Color  |
| ------- | ----- | ------------------------------ | ------ |
| To Make | ⭐     | Your main focus for now.       | amber  |
| Maybe   | 📋     | If you get to them.            | violet |
| Later   | 🗂     | Still saved, not forgotten.    | sky    |

Borders use `border-2` with `-400` shade for emphasis. Each item's move buttons show the *other* two bucket colors as cues for where the item would go.

## Shopping List detail (`/shopping-list`)

- **Grouped by store.** `<ShoppingByStore>` renders items bucketed by `store_id`. Items with a null `store_id` land in a final "📦 Unsorted" group (hidden when empty). Each group shows `{emoji} {name}` + count; stores with a `website_url` show an "Open ↗" button opening it in a new tab. Every row has a small `<select>` to reassign the item to a different store (or Unsorted) via `setItemStore(itemId, storeId)`.
- **Inline "Manage Stores" editor.** The 🏬 Manage Stores toggle in the card header shows `<StoreEditor>` in place — add (name + emoji + optional website URL), rename, change emoji/URL, or remove. Removing a store soft-detaches items (they drop back to `store_id = null` both in-memory and via the DB's `on delete set null` cascade).
- **AI cleanup — ✨ Clean Up List.** A purple **✨ Clean Up List** button (next to 🏬 Manage Stores) calls `cleanUpList()` in `app/shopping-list/page.js`, which POSTs the current list + stores to `/api/cleanup-list`. The route asks `claude-haiku-4-5-20251001` to (1) round fractional purchasables up ("1/4 can tomato paste" → "1 can tomato paste"), (2) strip cooking-only measures (tsp/tbsp/pinch/dash/clove/sprig/"to taste"), (3) merge duplicates, and (4) preserve `store_id` when merges agree, setting it to `null` when they conflict. The handler confirms, wipes `shopping_list` for the user, and reinserts cleaned rows (`recipe_title` is intentionally discarded). Server-side, invalid `store_id` values are dropped. Button shows "✨ Cleaning…" and disables while in-flight.
- **📋 Copy / 🖨️ Print.** `copyShoppingList()` builds a grouped plain-text version via `buildShoppingListText()` — a "Shopping List" header, then each store block (`{emoji} {name}` or `📦 Unsorted`) with `[ ]` / `[x]` checkboxes per row, sorted by `stores.sort_order`. It writes to the clipboard via `navigator.clipboard.writeText` with a toast fallback suggesting Print if blocked. `printShoppingList()` opens a small popup via `window.open('', '_blank')` with the same text inside a styled `<pre>`, triggers `window.print()` after a short delay, and toasts if pop-ups are blocked. Both buttons render only when `shoppingList.length > 0`.

## Chef Jennifer Recipes detail (`/chef-recipes`)

- **ChefJenItem renders measures.** Each ingredient is `{measure} {name}` — string ingredients render as-is, and `{name, measure}` objects bold the measure.
- **💾 Save to Recipe Vault.** Inside each expanded item, `saveToVault(item)` inserts into `personal_recipes` with the original title/description/ingredients/instructions/difficulty, `family_notes = "Saved from Chef Jennifer."`, and empty `tags` + `photo_url`.

## Chef TV (`/videos`)

**Education-first framing (April 2026).** Chef TV is for learning, not shopping. Of the ~700 curated videos, only ~160 carry recipe metadata. The page is designed so users default to *watching and learning*; recipe content is secondary and surfaces only when the user opts in.

**Simplified filter strip.** Previously had category chips (cuisines/dishes/proteins/meals/style), sort dropdown, shorts toggle, and channel — plus a `🎛 Filters` panel toggle. All of that was pared down to what home cooks actually use:

- **🔍 Search toggle.** A single circular button in the header. Tapped, it reveals a full-width search input (auto-focus). Tapped again (or ✕), input clears and hides. Matches the Recipe Vault / Cards pattern. Input uses `style={{ fontSize: '16px' }}` to block iOS Safari auto-zoom.
- **Love / Learn / All tri-state pill row (default: Love).** Three equal-width buttons. `❤️ Love` (rose) shows only the ~158 recipe-bearing videos; `🎓 Learn` (sky) shows only the ~400 video-only items; `All` (orange) shows everything. Counts in parens. **Love is the default on page load** — the scarcer, higher-signal recipe set leads so the 400 video-only items don't drown it out. The tab vocabulary deliberately matches the Playbook save buckets (❤️ Love / 🎓 Learn) so the filter and the save strip speak the same language.
- **Topic chips — per-tab shortcut sets (no channel dropdown).** The old full-width `<select>` channel dropdown is retired. Below the pill row, Love and Learn each show their own horizontally-scrollable row of topic chips (the All tab shows no chips — it's the firehose). One chip active at a time; active chip uses the tab's color (rose for Love, sky for Learn); inactive chips are white with a gray border. Chip filter is a regex match against the video **title** — we don't have a proper tag/topic column, so it's keyword-based and tuned empirically. Constants in `app/videos/page.js`:
  - `LOVE_CHIPS`: All · 🍝 Pasta · 🍕 Pizza · 🥗 Salad · 🍲 Soup · 🥩 Meat · 🐟 Fish · 🍞 Bread · 🍰 Sweet. Default: All.
  - `LEARN_CHIPS`: ⭐ Featured · All · 🔪 Knife · 🥚 Eggs · 🥩 Meat · 🍞 Baking · 🧂 Season · 📚 Basics. Default: Featured.
  - Changing tabs resets the chip to the tab's default (see `setFilter` onClick). Switching from Love → Learn lands on Featured, not on whatever Love chip was active.
  - **⭐ Featured** is a special chip on Learn (not a keyword filter). It slices the post-sort list to `FEATURED_CAP = 15` so newcomers land on "what's good" instead of "what's next." All other Learn chips apply keyword matching to the full Learn set.
  - The channel dropdown was removed because (a) the search input already matches channel text, so chef-specific queries work via 🔍, and (b) channel × Love/Learn combos created "this chef has 1 recipe" sparse states that felt weak. Topic chips route around this by filtering on what the video *is about*, not who made it.

**Tab-aware sort — each tab highlights its own "best."** The default sort changed from raw view_count to a tab-specific score:
- Inside **Love** (`loveScore`), videos are sorted by `log10(view_count) × completeness`, where completeness = `1.3× if ingredients+instructions both present` × `1.15× if ai_summary present`. Net effect: fully-documented recipes with decent view counts float up; bare recipes with just ingredients sink even if popular.
- Inside **Learn** (`learnScore`), videos are sorted by `log10(view_count) × teachBoost`, where `teachBoost = 1.5×` for channels in `TEACHING_CHANNELS` (Ethan Chlebowski, Brian Lagerstrom, ATK, Serious Eats, Food Wishes, Adam Ragusea, Pro Home Cooks, Internet Shaquille). Entertainment-heavy channels are still visible — they just don't lead.
- Inside **All**, sort stays raw `view_count desc` — the neutral firehose.
- log10 of view count compresses the long tail so a 10× view count is worth +1 point, not 10× weight — a multiplier on quality can outweigh raw popularity.

Dropped entirely: category chips (`CATEGORY_GROUPS`), sort dropdown (hardcoded to view_count desc), shorts toggle (always filters out <3 min).

**Playbook save strip.** Under the thumbnail on every card: `📥 Save / ❤️ Love / 🎓 Learn`. See "Save-at-source UX" under My Playbook above. The strip is identical on recipe and non-recipe videos — the save is about the video, not the recipe.

**💾 Save to My Kitchen (recipe videos only).** Inside the expanded Recipe view (`isExpanded && hasRecipe`), after the Ingredients and Instructions blocks, an orange button `💾 Save to My Kitchen` calls `saveToKitchen(video)` which inserts into `personal_recipes`:
- `title = video.title`, `description = meta.ai_summary || ''`
- `ingredients = meta.ingredients` (already `{name, measure}` shape), `instructions = meta.instructions`
- `family_notes = "Saved from Chef TV — {channel}."`
- `photo_url = <YouTube hqdefault thumbnail>`
- `category: ''`, `tags: []`, `difficulty: ''`, `servings: null`

After click, button swaps to `✓ Saved to My Kitchen` (emerald) and disables. Tracking is session-level (`vaultIds: Set<string>`) — refresh resets the button, and re-saving creates another Vault row (no dedupe). Small print under the button: "Adds to your Recipe Vault and drops the video in ❤️ Love." This button is intentionally gated behind opening the Recipe view — user has to look at the recipe before pulling it into their Vault. Education-first.

**Save to Kitchen also auto-places the video in ❤️ Love.** Saving a recipe into the Vault implies the user wants to try it, and Love is "meals I want to try" — so `saveToKitchen` fires a fire-and-forget `ensureInLove(video)` right after the Vault insert. `ensureInLove` is idempotent: no-op if the video is already in Love, moves it from another bucket if present, or inserts favorites + `cooking_skill_items` (bucket='love') if unsaved. When the video has a recipe, the same `loved_recipe_urls` capture row is written (identical semantics to the normal Love toggle). The Playbook write is best-effort — a Playbook failure does not block or undo the Vault save, keeping the user's primary action reliable even if the Playbook write hits a transient error. This keeps the education loop intact (see → try → improve) without forcing the user to tap twice.

**❤️ Love → ingestion capture.** See "Love + recipe" under My Playbook. When `setBucket(video, 'love')` fires and the video has `meta.ingredients.length > 0`, a row is written to `loved_recipe_urls` (user_id, favorite_id, video_id, youtube_id, youtube_url, title, channel). Moving away from Love cleans it up. Not surfaced in the UI.

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
- **`cooking_videos`** — `id, title, channel, youtube_id, …`
- **`education_videos`** — `id, title, channel, youtube_id, …`
- **`education_video_metadata`** — per-video educational metadata, joined by `video_id`
- **`video_metadata`** — `id, video_id, ingredients (jsonb[]), instructions` — populated by ingestion scripts.
- **`cooking_skill_items`** — `id, user_id, item_type, item_id, bucket ('save'|'love'|'learn'), created_at, updated_at` — Playbook bucket placement for saved videos. Unique on `(user_id, item_type, item_id)`. RLS scoped to owner. Migration trail: `002_cooking_skill_items.sql` → `003_playbook_buckets.sql` → `004_playbook_3buckets.sql`.
- **`loved_recipe_urls`** — `id, user_id, favorite_id (fk → favorites, cascade), video_id, youtube_id, youtube_url, title, channel, created_at` — Love+recipe ingestion signal capture. Unique on `(user_id, favorite_id)`. RLS scoped to owner. Written from `/videos` when user hits ❤️ Love on a video with ingredients; deleted when they move away from Love. Not surfaced in the UI — for curation/ingestion pipeline only. Migration: `supabase/005_loved_recipe_urls.sql`.

## Chef Jennifer "Make my recipe more..." preferences

On `/topchef` the flow is: **Meal → Mood → Protein → Preferences → Cooking → Result.**

Preferences are **multi-select, per-generation** cooking-style adjustments (not medical advice). They get woven into the prompt sent to `/api/topchef` and snapshotted into `metadata.preferences` on save.

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

The **same option list** is also reused on the Recipe Vault "Make This Recipe More..." flow (see below). Keep the 8 `value` strings identical across Chef Jennifer (`app/topchef/page.js`), Recipe Vault (`app/secret/page.js`), and the server-side label map in `app/api/enhance-recipe/route.js` so preferences can be shared / compared across screens.

## Recipe Vault presentation notes (`/secret`)

- **Tag chip quick-filter (list view).** The top 5 most-used tags render as pill buttons along with an "All" chip in a horizontally-scrolling row directly under the sticky header. Tapping a chip sets `searchTag` (tapping the same chip twice clears it). The full `<select value={searchTag}>` dropdown still renders below — but only when `allTags.length > topTags.length`, so it's hidden on vaults with ≤ 5 unique tags (chips cover everything). `topTags` is computed by counting tag occurrences across all recipes and sorting desc.
- **Collapsible search input (list view) — toggle in header, input below.** The 🔍/✕ search toggle lives in the sticky header's right-side button group next to **📥 Import** and **+ Add** (so it can never compete with the input for horizontal space on narrow phones). Below the header, a single row holds *either* the tag chip scroller *or* a full-width (`w-full`) text search input — they swap, they don't stack, so toggling doesn't push content down. Tapping 🔍 flips the row into search mode and auto-focuses the input; the header button becomes ✕ (orange-filled). Tapping ✕ clears `searchText` and collapses back to chips. If `searchText` is non-empty the input stays visible regardless of the toggle so an active query is never hidden. The input uses `style={{ fontSize: '16px' }}` to prevent iOS Safari's auto-zoom on inputs smaller than 16px (which was contributing to the ✕ getting pushed off-screen on iPhone).
- **No big intro card on the list view.** The "Your Personal Recipe Vault" welcome card was removed — the sticky header already labels the page, and the space is better spent on the recipe grid. If we ever want context back, the "X of Y recipes" count above the grid is already doing the minimum.
- **Hero on the detail view.** The recipe detail screen replaces the old 220px inset photo with a full-width hero that is capped at `max-w-2xl mx-auto` so it spans edge-to-edge on phones but doesn't stretch across a wide desktop monitor. Heights are responsive: `h-40 sm:h-52 md:h-64` (160px / 208px / 256px) so the hero doesn't swallow the iPhone viewport. The title and description overlay the photo's bottom via a dark gradient (`from-black/75 via-black/30 to-transparent`). The title uses `text-xl sm:text-2xl md:text-3xl` and is no longer duplicated in the body — it lives in the hero.
- **Photo-less hero fallback.** When `viewing.photo_url` is empty, the hero shows a soft orange gradient (`from-orange-100 via-orange-50 to-amber-100`) with a large category emoji from `categoryEmoji(recipe)` — the fallback gives each recipe visual personality without a photo. The whole gradient is clickable and triggers the hidden `<input type="file">` for photo upload.
- **Change-photo affordance.** When a photo IS set, a small "📷 Change" button floats at the top-right of the hero. It triggers the same upload input, so the hero stays self-contained.
- **`categoryEmoji(recipe)` helper.** Lives at the top of `app/secret/page.js` and returns an emoji based on regex matches against the recipe's title / category / tags (pizza → 🍕, pasta → 🍝, salad → 🥗, soup → 🍲, etc.). Falls back to 🍽️. Used by the photo-less hero and by the Grid view's photo-less tile fallback.
- **List / Grid view toggle.** The sticky header has a 🖼/📋 button next to 🔍 / 📥 Import / + Add that flips the list-view layout between two styles:
  - **List** (default) — single column with a 64px thumb, title, description, category chip, and tag chips. Good when you know what you're looking for.
  - **Grid** — two-column photo-first tiles styled like classic 3x5 index cards: cream paper (`bg-amber-50`), thin `bg-red-600` top rule, title (bold, two-line clamp with `min-h-[2.5rem]`) + 100px photo below. Photo-less tiles fall back to `bg-amber-100` with the `categoryEmoji(recipe)`. Good for browsing/serendipity.
  - State lives in `listStyle` in `app/secret/page.js`. The toggle writes/clears `?view=grid` via `history.replaceState` so refresh and share preserve the choice. Unknown values stay on `list`.
  - **This is a Vault-only display choice, NOT the same as Recipe Cards (`/cards`).** Both styles tap through to the standard Vault detail view with full instructions. The index-card *visual* is intentionally reused — home cooks recognize it — but the *concept* stays separate (see "Recipe Cards concept" below).

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

## Recipe Vault "Make This Recipe More..." flow

On `/secret` → open a recipe → tap **✨ AI** → scroll to the purple "Make This Recipe More..." card. Uses the same 8 preference values as Chef Jennifer.

Flow: select chips → **Transform with N preferences** button → preview card shows the new title, description, chip summary, ingredients, and instructions → user picks one of three actions:

- **💾 Save as new recipe** — inserts a new row in `personal_recipes` with `title = transformResult.title` (or `"<original> (adjusted)"`), prepends a `family_notes` line: `Transformed from "<original>" — made more <labels>.`, carries over category/tags/photo/servings from the original. Original is untouched.
- **♻️ Replace this recipe** — confirms, then updates title/description/ingredients/instructions on the current row via `updateRecipe()`.
- **✕ Discard** — clears transform state; nothing is saved.

API: `POST /api/enhance-recipe` with `{ recipe, action: 'transform', preferences: [...] }`. Returns `{ title, description, ingredients[], instructions }`. The same disclaimer guard from Chef Jennifer is in the prompt. `max_tokens` is 2000 on this route (bumped from 1500) to give transforms room.

## API routes (`app/api/`)

- `/api/chef` — Ask-AI Anything backend.
- `/api/topchef` — MY-AI ChefJen recipe generator.
- `/api/import-recipe` — parse/ingest external recipes. Accepts `{ url }` or `{ text }`. **YouTube support:** if `url` is a `youtu.be` / `youtube.com/watch` / `youtube.com/shorts` link, the route pulls title/channel/description/thumbnail via the YouTube Data API v3 and captions via `youtube-transcript`, then feeds the combined blob to Claude. Requires `YOUTUBE_API_KEY` in env. Falls back to description-only when captions are unavailable. Thumbnail becomes the recipe image.
- `/api/enhance-recipe` — AI enrichment of existing recipes. Actions: `enhance`, `resize`, `generate_info`, `transform`.

## Ingestion scripts (run manually with `node <script>.js`)

- `ingest_videos.js` — pulls cooking videos.
- `ingest_education_metadata.js` — enriches education videos.
- `ingest_missing.js` — fills gaps.
- `generate-instructions.js` — AI-generates step-by-step instructions for videos that have ingredients but no instructions. Uses `SUPABASE_SERVICE_ROLE_KEY` — do **not** commit.

## Conventions

- **Mobile-first** layout. Main containers use `max-w-lg` (kitchen/hub) or `max-w-2xl` (content pages) with `mx-auto px-4`.
- **Sticky headers** with `← Back` button on the left, page title (emoji + name) center-left, and a context action on the right.
- **Toast**: `fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white …` — 2.5s auto-dismiss.
- **Color system**: page actions lean orange (`orange-600`), section accents follow MyKitchen palette (amber / pink / orange / purple). Meal Plan buckets override with amber/violet/sky; My Playbook buckets use slate/rose/emerald/sky.
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
- `git push origin main` — triggers Vercel deploy to `www.mycompanionapps.com`.
- Commit style: `feat: <page> - <short description>` (e.g., `feat: Shopping List - AI cleanup button`). Body uses `-` bullets for specifics.

## Naming canon (current state)

The canonical names in use across the app are:

- **MyKitchen** (`/kitchen`) — the one "My" we keep for the hub. Every other tile has a simple, direct name.
- **Recipe Vault** (`/secret`), **Recipe Cards** (`/cards`), **Chef TV** (`/videos`), **Chef Jennifer** (`/topchef`), **Ask Chef Jennifer** (`/chef`), **Chef Notes** (`/chef-notes`), **Chef Jennifer Recipes** (`/chef-recipes`), **Meal Plan** (`/meal-plan`), **Shopping List** (`/shopping-list`), **My Playbook** (`/playbook`) — simplified, no "My" prefix except Playbook (which keeps it because the intent-buckets are personal and it mirrors Golf's "MyBag").
- Brand name in titles, meta, headers, and copy is **MyRecipe Companion**. (We briefly tried "Recipe AI Companion" and reverted — the "My" prefix matches the MyCompanionApps family and reads more personal. Short-name/PWA label is **MyRecipe**.)
- `MyCooking` / `MyPlan` (the old combined `/picks` page) was retired in Phase 2C. Its sections now live at dedicated routes; `/picks` is a thin server-side redirect (see "`/picks` redirect" above). Save-button labels across the app were updated in the follow-up Phase 2C.1 sweep — "Save to MyCooking" now reads "Save to Chef Jennifer Recipes" on `/topchef`, "Save to Chef Notes" on `/chef`, "Meal Plan" on `/cards` and `/secret`, and the landing/about/notes tiles were retitled "Meal Plan". The single heart-save on Chef TV was later replaced by the 4-button My Playbook strip (see "My Playbook" above).

Swept in recent passes and no longer present:
- `app/login/page.js`, `app/profile/page.js`, `app/about/page.js`, `app/page.js`, `app/notes/page.js` — brand text (→ MyRecipe Companion).
- `app/manifest.js`, `app/layout.js` — PWA + HTML metadata (→ name "MyRecipe Companion", short_name "MyRecipe").
- `app/api/chef/route.js` — system prompt persona (→ Chef Jennifer, inside MyRecipe Companion).
- `../my-companion-apps/app/page.tsx` — hub landing tile + footer link (→ MyRecipe Companion / "MyRecipe").

Known still-stale spots (future cleanup candidates, low urgency):
- `app/topchef/page.js` — internal function name `MyChefPage` (harmless, internal only).
- `app/saved/page.js` — uses "MyFavorites" in the header and in a `family_notes` DB string. The page isn't in the main MyKitchen nav and the DB string is historical; leaving as-is unless the page is brought back into the main nav.

## Landing page palette (decided)

The landing page (`app/page.js`) and About page (`app/about/page.js`) intentionally break from the orange-heavy MyKitchen palette. Current scheme:

- Background: `bg-amber-50` (warm cream parchment).
- Cards/tiles: white with `border-stone-200`.
- Primary CTA: `bg-stone-800` warm charcoal, `hover:bg-stone-900`. (We tried `emerald-700` briefly; user felt it was too green.)
- Section label: `text-stone-500 uppercase tracking-[0.15em]`.
- Footer: two inline links in `text-stone-500` separated by a bullet — **About MyRecipe Companion** and **Tester notes** (see below).

The shift from cream landing → orange MyKitchen reads as an intentional tone change, not a jarring break. Keep MyKitchen orange; keep landing cream.

## Tester banner & `/notes` page

During the private test period, the landing page carries a small dark **tester banner** above the entry box, and a dedicated `/notes` page holds the longer "what to try this week" copy. Both are designed so non-dev Bill can edit copy by changing constants at the top of a file and pushing.

- **Banner** (`app/page.js`, `BANNER` constant): `{ enabled, version, message, linkHref, linkLabel }`. Dark `bg-stone-900` strip with an `×` dismiss button. Dismissal persists via `localStorage.recipe_ai_banner_dismissed_${BANNER.version}`. Bump `BANNER.version` to force-redisplay. Set `BANNER.enabled = false` to hide entirely. The setState-in-effect that reads the dismissal flag on mount is intentional (SSR has no `window`) and has a localized eslint-disable.
- **`/notes` page** (`app/notes/page.js`): palette matches the landing page. All copy lives in clearly-commented constants at the top: `NOTES_UPDATED` (date string), `INTRO` (paragraph), `WHATS_NEW` / `TRY_THIS` / `KNOWN_QUIRKS` (arrays of strings rendered as bullet lists via `<Section>`), and `FEEDBACK` (text + email). The page uses `next/link` for in-app navigation to satisfy `no-html-link-for-pages`.
- Footer on the landing page has a permanent `Tester notes` link next to `About MyRecipe Companion` so the page stays reachable after the banner is dismissed.
- When we ship publicly, the quickest retirement is `BANNER.enabled = false` in code and/or deleting the footer link. The `/notes` route can stay or be removed; nothing else depends on it.

## Authentication (Google OAuth + magic link via Resend)

Two ways to sign in, both on `/login`:

- **Continue with Google** — `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<origin>/auth/callback' } })`.
- **Email me a sign-in link** — `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: '<origin>/auth/callback' } })`. Success state replaces the form with a "Check your email" panel.

Both flows converge on `app/auth/callback/route.js` → forwards the `code` to `app/auth/confirm/page.js` → `exchangeCodeForSession(code)` → `/kitchen`. No callback changes are needed when adding another provider.

### SMTP for magic-link deliverability (Resend)

Supabase's default SMTP is rate-limited and gets spam-flagged by Hotmail/Outlook. Custom SMTP is wired up through Resend:

- **Provider:** Resend — domain `mycompanionapps.com` verified (SPF/DKIM/DMARC records live on the domain's DNS).
- **Supabase → Project Settings → Authentication → SMTP Settings:** host `smtp.resend.com`, port `465`, username `resend`, password = Resend API key. Sender `noreply@mycompanionapps.com`, display name "MyRecipe Companion".
- **Supabase → Auth → URL Configuration:** Site URL = `https://www.mycompanionapps.com`. Redirect allow-list includes `https://www.mycompanionapps.com/auth/callback`, `https://jen-ai-companion.vercel.app/auth/callback` (kept during the transition / for Vercel preview deploys), and `http://localhost:3000/auth/callback` for local dev.
- **Supabase → Auth → Providers → Email:** enabled.

Rotating / revoking the Resend API key is a Supabase SMTP-fields update only; no app-code change.

## New-user seeding (starter recipes)

First-time users get a small set of starter recipes loaded into their Recipe Vault automatically, so the app never feels empty on day one.

- Recipe data lives in `lib/starter_recipes.js` as a hand-curated array of 5 recipes — one quick weeknight (Aglio e Olio), one one-pan weeknight (Sheet-Pan Lemon Chicken), one comfort (Tomato Soup + Grilled Cheese), one healthy/modern (Honey-Soy Salmon Bowl), one project bake (Brown Butter Chocolate Chip Cookies). Each carries `family_notes: "A starter recipe — swap, edit, or delete anytime."` so users can tell they're examples.
- Seeding fires from `app/kitchen/page.js` via `seedStarterRecipesOnce(user)` inside the auth `useEffect`. It is idempotent in two ways:
  1. It checks a `localStorage` flag `recipe_ai_seeded_${STARTER_RECIPES_VERSION}_${user.id}`. If set, no work happens.
  2. If unflagged, it counts the user's `personal_recipes`. If count > 0 (returning user, or already seeded on another device), it sets the flag without inserting.
- Only when both checks indicate a brand-new vault does the function bulk-insert the starter rows. Insert errors do not set the flag, so the next visit retries.
- `STARTER_RECIPES_VERSION` is in the import path so we can ship a future v2 of the starter set without re-seeding existing users (just bump the const).

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
