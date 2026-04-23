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
| Chef Jennifer Recipes  | `/picks?open=chefjen` (Phase 1) | Recipes Jennifer has created and you've saved.   |
| Meal Plan              | `/picks?open=meal_plan` (Phase 1) | What you're cooking soon, organized by bucket.  |
| Shopping List          | `/picks?open=shopping_list` (Phase 1) | Ingredients grouped by store.               |
| Chef TV                | `/videos`     | Cooking videos (YouTube-backed).                                    |
| Skills I Learned       | `/picks?open=chef_videos` (Phase 1) | Saved Chef TV videos + notes, by course.      |
| Ask Chef Jennifer      | `/chef`       | Free-form AI Q&A. Saves land in Chef Notes.                         |
| Chef Notes             | `/picks?open=ai_notes` (Phase 1) | Saved AI answers, chronological.                 |
| Chef Jennifer          | `/topchef`    | AI chef who generates recipes tailored to mood/meal/protein.        |

"(Phase 1)" markers flag tiles that currently deep-link into `/picks` using a `?open=<section_key>` query param. Phase 2 splits `/picks` into dedicated pages and those routes update in one sweep — see **IA restructure roadmap** below.

Other routes: `/education` (learning videos), `/weeklyplan`, `/recipes`, `/browse`, `/about`, `/profile`, `/login`, `/auth`, `/not-found`.

## IA restructure roadmap (April 2026)

MyKitchen moved from a 3-section (Your Cooking Life / AI Kitchen / Explore) layout with 5 tiles to a **4-section, 10-tile** layout. Bill's framing: "Separate cupboards, separate bowls — each thing with its place. It reminds me of my mother's way of cooking."

The rollout is phased so no single commit drops a huge amount of unreviewed code:

- **Phase 1 (shipped).** Rewrite `app/kitchen/page.js` with the new sections/tiles and a unified orange left stripe. Add a `?open=<key>` handler on `/picks` so five of the tiles (Meal Plan, Shopping List, Chef Notes, Skills I Learned, Chef Jennifer Recipes) deep-link straight to the right section on that still-combined page. This is a **bridge** — the hub looks finished immediately, the underlying pages catch up in Phase 2.
- **Phase 2 (next).** Split `/picks` into four dedicated pages — `/meal-plan`, `/shopping-list`, `/chef-notes`, `/skills`. Retire the `?open=` handler. Ship Skills I Learned as a MyBag-style bucketed view (see "Skills I Learned buckets" below).
- **Phase 3.** Fold `/cards` into `/secret` as a list/card view toggle; build a dedicated Chef Jennifer Recipes page (or filter inside Recipe Vault). Decision on which is deferred — will pick based on how many Chef Jen saves feel natural alongside vault recipes during Phase 2 review.

Phase 1 is NOT a full naming sweep of downstream pages yet — the /picks page still labels itself "MyCooking" internally, Ask Chef Anything still says "Ask Chef Anything" in places, etc. Those get swept as each page is rebuilt in its phase.

## Kitchen navigation sections

These live in `app/kitchen/page.js`. MyKitchen is **4 sections and 10 tiles** total. All tiles use a unified **orange left stripe** (brand color) — `border-2 border-gray-200 border-l-8 border-l-orange-600 hover:border-orange-300 hover:shadow-sm rounded-2xl` — mirroring Golf's green-stripe Clubhouse pattern. No dash subtitles; each tile shows `title` (bold) + `description` (truncated one-liner).

Section headers are small orange uppercase labels with a one-line section subtitle below, followed by the section's tiles.

### Section structure

1. **Your Recipes** — "Your saved recipes and collections."
   - 🔐 Recipe Vault → `/secret` — "Your saved recipes, organized."
   - 🃏 Recipe Cards → `/cards` — "Flip through your collection."
   - ✨ Chef Jennifer Recipes → `/picks?open=chefjen` — "Recipes Jennifer made for you."

2. **Plan & Shop** — "Organize what you're cooking next."
   - 📅 Meal Plan → `/picks?open=meal_plan` — "What you're cooking soon."
   - 🛒 Shopping List → `/picks?open=shopping_list` — "Ingredients, organized to shop."

3. **Learn** — "Build your cooking skills."
   - 🎬 Chef TV → `/videos` — "Cooking videos, one tap away."
   - 🎓 Skills I Learned → `/picks?open=chef_videos` — "Your saves, by course."
   - 💬 Ask Chef Jennifer → `/chef` — "Ask anything. Get clear answers."
   - 📝 Chef Notes → `/picks?open=ai_notes` — "Saved AI answers, anytime."

4. **Chef Jennifer** — "Your personal AI chef."
   - 👨‍🍳 Chef Jennifer → `/topchef` — "Create a new recipe, tailored to you."

### `/picks` deep-link handler (Phase 1 bridge)

`app/picks/page.js` has a second `useEffect` that reads `?open=<section_key>` on mount. If the key is valid (`meal_plan`, `shopping_list`, `ai_notes`, `chefjen`, `chef_videos`), the page auto-expands that section and smooth-scrolls to it via `document.getElementById('section-' + key)`. Each section wrapper has a matching `id` and `scroll-mt-20` so the section title isn't hidden under the sticky header.

This handler exists purely to make Phase 1 usable on its own. Phase 2 retires it.

### Skills I Learned buckets (Phase 2 spec)

When Phase 2 ships Skills I Learned at its own route, it will mirror Golf's MyBag pattern — six **fixed** buckets that hold both saved Chef TV videos AND saved Chef Notes together. Buckets are **by course type**, not technique, because that matches how home cooks actually learn (Bill: "I learned the dishes first, then realized they were skills"):

| Emoji | Bucket       | Meaning                                             |
| ----- | ------------ | --------------------------------------------------- |
| 📥    | The Starter  | New saves land here; user moves them.               |
| 🍳    | Breakfast    |                                                     |
| 🍽️    | Mains        |                                                     |
| 🥕    | Sides & Veg  |                                                     |
| 🥖    | Baking       | Breads and savory baking.                           |
| 🍰    | Desserts     | Sweet endings.                                      |

No rename / reorder / delete (locked like Golf's MyBag). The `favorites` + `saved_videos` + `saved_education_videos` tables already carry enough metadata; Phase 2 will add a nullable `cooking_bucket` column (or a per-user mapping table) to remember which item the user has placed in which bucket.

## MyCooking buckets (`/picks`)

MyCooking organizes meal-plan recipes into three buckets and color-codes them consistently across the page (frames + move-to buttons):

| Bucket  | Emoji | Meaning                        | Color  |
| ------- | ----- | ------------------------------ | ------ |
| To Make | ⭐     | Your main focus for now.       | amber  |
| Maybe   | 📋     | If you get to them.            | violet |
| Later   | 🗂     | Still saved, not forgotten.    | sky    |

Borders on bucket frames, section cards, and move buttons use `border-2` with `-400` shade for emphasis. Section tabs default to **closed** on page load.

## Plan page sections (`/picks`) — labels & subtitles

Under the sticky header, the page shows a two-line **tagline** defining MyCooking as a central hub. Line 1 (semibold gray-700): *"Your central cooking hub."* Line 2 (smaller gray-500): *"Plan, shop, watch, learn, save tips, and create with Chef Jennifer — all in one place."* The tagline is deliberately broad because MyCooking isn't just the week's plan — it's planning, saving, learning, watching, shopping, AI notes, and Chef Jennifer's creations all under one roof.

Each collapsible section on the Plan page has a one-line subtitle below the label. Keep the tone cozy and user-facing. Current copy:

| Section        | Emoji   | Subtitle |
| -------------- | ------- | -------- |
| Meal Plan      | 📅      | What you're cooking soon, organized your way. |
| Shopping List  | 🛒      | Your ingredients, organized and ready to shop. |
| AI Notes       | 💡      | Tips and answers from Chef Jennifer, saved for later. |
| Chef Jennifer  | 👨‍🍳   | Your personal AI chef — guiding your cooking and planning. |
| Saved Skills from Chef TV | 🎬 | Skills you're learning, lessons you've added, and what you're mastering next. |

The ChefJen section is labeled **Chef Jennifer** on the Plan page to match the Kitchen nav. The underlying data key is still `chefjen` and the table is `favorites` with `type='ai_recipe'`.

### Plan page behavior notes

- **Icon tooltips.** Every icon-only button on `/picks` has a `title` attribute so hovering (desktop) or long-pressing (mobile) reveals a plain-English label. This includes the bucket move buttons (⭐ Top Pick, 📋 Maybe, 🗂 Later), × remove buttons across every section, the video play button, and the Chef Jennifer expand / save-to-vault controls.
- **"Saved Skills from Chef TV" is dual-sourced.** `loadVideos` in `app/picks/page.js` reads **both** the legacy `saved_videos` / `saved_education_videos` tables **and** new Chef TV saves that land in `favorites` with `type in ('video_recipe','video_education')`. Favorites-sourced rows carry a `_favoriteId` marker so `removeVideo` knows to delete from `favorites`; legacy rows still delete from the per-source table. If the same video exists in both places the legacy record wins (dedupe is by `id`).
- **Chef Jennifer items show measures.** `ChefJenItem` renders each ingredient as `{measure} {name}` — string ingredients still render as-is, and `{name, measure}` objects bold the measure. This fixes older saves that were dropping quantity.
- **Save to Recipe Vault from Plan.** Each Chef Jennifer item has a 💾 **Save to Recipe Vault** button inside its expanded view. Clicking it calls `saveChefJenToVault(item)`, which inserts into `personal_recipes` with the recipe's title/description/ingredients/instructions/cuisine, `family_notes = "Saved from Chef Jennifer."`, empty `tags` and `photo_url`, and the original `difficulty`. The button disables to `✓ Saved to Recipe Vault` after one successful save (per session — no persisted flag yet).
- **Shopping list is grouped by store.** The Shopping List section renders items grouped by their `store_id` using `<ShoppingByStore>`. Items with a null `store_id` land in a final "📦 Unsorted" bucket (which is hidden when empty). Each group shows an emoji + name + count header; when the store has a `website_url`, an "Open ↗" button opens it in a new tab. Every row also has a small `<select>` that lets the user reassign the item to a different store (or Unsorted) via `setItemStore(itemId, storeId)`.
- **Inline "Manage Stores" editor.** The Shopping List header has a 🏬 Manage Stores toggle that shows `<StoreEditor>` in place. Users can add a store (name + emoji + optional website URL), rename, change emoji/URL, or remove. Removing a store soft-detaches items — they drop back to `store_id = null` both in-memory and via the DB's `on delete set null` cascade.
- **AI cleanup — ✨ Clean Up List.** The Shopping List header has a purple **✨ Clean Up List** button (next to 🏬 Manage Stores) that calls `cleanUpList()` in `app/picks/page.js`. It POSTs the current list + the user's stores to `/api/cleanup-list`, which asks `claude-haiku-4-5-20251001` to (1) round fractional purchasables up (e.g. "1/4 can tomato paste" → "1 can tomato paste"), (2) strip cooking-only measures (tsp/tbsp/pinch/dash/clove/sprig/"to taste"), (3) merge duplicate ingredients, and (4) preserve `store_id` when merges agree, setting it to `null` when they conflict. The handler confirms with the user, then wipes `shopping_list` for the user and reinserts the cleaned rows (no `recipe_title` on cleaned rows). `recipe_title` info is discarded during cleanup — this is expected. Server-side, invalid `store_id` values are dropped. The button shows "✨ Cleaning…" and is disabled while the request is in-flight.
- **📋 Copy / 🖨️ Print (Shopping List).** Two buttons in the Shopping List header (next to ✨ Clean Up List) let the user move the list into their grocery app of choice. `copyShoppingList()` builds a grouped plain-text version via `buildShoppingListText()` — Shopping List header, then each store block (`{emoji} {name}` or `📦 Unsorted`) with `[ ]` / `[x]` checkboxes per row, sorted by `stores.sort_order`. The text goes onto the clipboard via `navigator.clipboard.writeText`; a toast confirms success or falls back to suggesting Print if the clipboard API is blocked. `printShoppingList()` opens a small `window.open('', '_blank')` popup with the same text inside a styled `<pre>`, triggers `window.print()` after a short delay, and shows a toast if the pop-up is blocked. Both buttons only render when `shoppingList.length > 0`.

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
- **`categoryEmoji(recipe)` helper.** Lives at the top of `app/secret/page.js` and returns an emoji based on regex matches against the recipe's title / category / tags (pizza → 🍕, pasta → 🍝, salad → 🥗, soup → 🍲, etc.). Falls back to 🍽️. Used by the photo-less hero; can be reused for list cards if we want to extend the pattern.

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
- **Color system**: page actions lean orange (`orange-600`), section accents follow MyKitchen palette (amber / pink / orange / purple). MyCooking buckets override with amber/violet/sky.
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
- Commit style: `feat: <page> - <short description>` (e.g., `feat: MyCooking - default tabs closed, fix ChefJen expand`). Body uses `-` bullets for specifics.

## Known pre-existing lint issues in `app/picks/page.js`

- `loadAll` accessed before declared (hoist fix needed).
- Two `<img>` warnings — should migrate to `next/image`.

Not breaking, but worth cleaning up in a focused pass.

## Naming canon (current state)

The canonical names in use across the app are:

- **MyKitchen** (`/kitchen`) — the one "My" we keep for the hub.
- **MyCooking** (`/picks`) — the other "My" we keep, for everything the user is actively making. (Was previously **MyPlan**; renamed in April 2026 because "MyCooking" captures everything the user does there, not just the week's plan. Route stays `/picks` to preserve bookmarks. We'd also briefly tried plain "Plan" even earlier but reverted — users wanted the personal framing.)
- **Recipe Vault** (`/secret`), **Recipe Cards** (`/cards`), **Chef TV** (`/videos`), **Chef Jennifer** (`/topchef`), **Ask Chef Anything** (`/chef`) — simplified, no "My" prefix.
- Brand name in titles, meta, headers, and copy is **MyRecipe Companion**. (We briefly tried "Recipe AI Companion" and reverted — the "My" prefix matches the MyCompanionApps family and reads more personal. Short-name/PWA label is **MyRecipe**.)
- Chef Jennifer's save buttons read **Save to MyCooking** / **Saved to MyCooking ✓**. Ask Chef Anything's save button matches.

Swept in recent passes and no longer present:
- `app/picks/page.js` — MyVault buttons (→ Recipe Vault), MyRecipe Cards button (→ Recipe Cards).
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
