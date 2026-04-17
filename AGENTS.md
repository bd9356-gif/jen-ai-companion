<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Recipe AI Companion — Project Brief

A **cozy, modern cooking companion** that blends a personal recipe vault, guided learning, and an AI chef who's always ready to help. For **home cooks** who want a simple, confidence-building way to save recipes, learn skills, and get AI help in the kitchen.

Repo: `bd9356-gif/jen-ai-companion`
Deploy: Vercel → `jen-ai-companion.vercel.app`
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

| Name            | Route        | What it is                                                           |
| --------------- | ------------ | -------------------------------------------------------------------- |
| MyKitchen       | `/kitchen`   | The hub page. Everything routes from here.                            |
| Explore Recipes | `/explore`   | Discovery feed of new recipe ideas.                                   |
| Chef TV         | `/videos`    | Cooking videos (YouTube-backed). (Renamed from MyChef TV.)            |
| Favorites       | `/saved`     | Staging drawer — recipes you've hearted but not committed to.         |
| Recipe Vault    | `/secret`    | Your permanent, organized recipe collection.                          |
| Recipe Cards    | `/cards`     | Card-style recipe browser (swipe / pick).                             |
| Plan            | `/picks`     | What you're actually cooking. 3 buckets + shopping list + notes.      |
| Chef Jennifer   | `/topchef`   | AI chef who generates recipes tailored to mood/meal/protein, **and** hosts the "Ask anything" entry. |
| Ask anything    | `/chef`      | Free-form AI Q&A (saves answers as AI Notes). **Not in the Kitchen nav** — reached via Chef Jennifer's first screen. |

Other routes: `/education` (learning videos), `/weeklyplan`, `/recipes`, `/browse`, `/about`, `/profile`, `/login`, `/auth`, `/not-found`.

## Kitchen navigation sections (with accent colors)

These live in `app/kitchen/page.js` and drive MyKitchen's grouped layout. Copy them exactly if referenced elsewhere:

- **Explore** (`#f97316` orange) — "Find ideas, inspiration, and dishes worth considering." → Explore Recipes, Chef TV
- **Collect & Decide** (`#e85d8a` pink) — "Your staging drawer — review, compare, and choose what moves into your cooking life." → Favorites
- **Your Cooking Life** (`#f59e0b` amber) — "Your saved recipes, cooking cards, and what you're making next." → Recipe Vault, Recipe Cards, Plan
- **AI Kitchen** (`#a855f7` purple) — "Smart support whenever you need ideas, guidance, or answers." → Chef Jennifer (which also contains the Ask-anything entry)

## MyPlan buckets (`/picks`)

MyPlan organizes meal-plan recipes into three buckets and color-codes them consistently across the page (frames + move-to buttons):

| Bucket  | Emoji | Meaning                        | Color  |
| ------- | ----- | ------------------------------ | ------ |
| To Make | ⭐     | Your main focus for now.       | amber  |
| Maybe   | 📋     | If you get to them.            | violet |
| Later   | 🗂     | Still saved, not forgotten.    | sky    |

Borders on bucket frames, section cards, and move buttons use `border-2` with `-400` shade for emphasis. Section tabs default to **closed** on page load.

## Plan page sections (`/picks`) — labels & subtitles

Each collapsible section on the Plan page has a one-line subtitle below the label. Keep the tone cozy and user-facing. Current copy:

| Section        | Emoji   | Subtitle |
| -------------- | ------- | -------- |
| Meal Plan      | 📅      | What you're cooking soon, organized your way. |
| Shopping List  | 🛒      | Your ingredients, organized and ready to shop. |
| AI Notes       | 💡      | Tips and answers from Chef Jennifer, saved for later. |
| Chef Jennifer  | 👨‍🍳   | Your personal AI chef — guiding your cooking and planning. |
| Chef Videos    | 🎬      | Skills you're learning, lessons you've added, and what you're mastering next. |

The ChefJen section is labeled **Chef Jennifer** on the Plan page to match the Kitchen nav. The underlying data key is still `chefjen` and the table is `favorites` with `type='ai_recipe'`.

## Supabase schema (inferred from code — verify before migrations)

Tables referenced in the app:

- **`my_picks`** — `id, user_id, recipe_id, title, photo_url, bucket ('top'|'nice'|'later'), sort_order, created_at`
- **`shopping_list`** — `id, user_id, ingredient, recipe_title, checked, created_at`
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
- `/api/import-recipe` — parse/ingest external recipes.
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
- **Color system**: page actions lean orange (`orange-600`), section accents follow MyKitchen palette (amber / pink / orange / purple). MyPlan buckets override with amber/violet/sky.
- **Borders**: `border-2` with `-300`/`-400` shades on emphasis elements; `border` with `-100`/`-200` for subtle dividers.
- **Rounded**: cards are `rounded-2xl`; chips/pills are `rounded-full`; buttons `rounded-xl`.
- **Auth gate**: every authenticated page does a `supabase.auth.getSession()` check in `useEffect` and redirects to `/login` if absent.
- **Navigation**: `window.location.href = '...'` is used instead of `next/link` in most pages (keep it consistent when adding new buttons).
- **Shared components** live in `components/`:
  - `SafeYouTube.js`, `YouTubePlayer.js`, `UnifiedVideoPlayer.js` — video embedding with sandboxing.

## Security & secrets

- `.env.local` holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. Never commit these.
- Service role key is only for ingestion scripts; app code uses the anon key.
- **Known issue**: the GitHub Personal Access Token is currently embedded in the `origin` remote URL (`.git/config`). Rotate at https://github.com/settings/tokens and reset the remote to use SSH or a credential helper.

## Workflow

- `npm run dev` — local dev at `http://localhost:3000`.
- `git push origin main` — triggers Vercel deploy to `jen-ai-companion.vercel.app`.
- Commit style: `feat: <page> - <short description>` (e.g., `feat: MyPlan - default tabs closed, fix ChefJen expand`). Body uses `-` bullets for specifics.

## Known pre-existing lint issues in `app/picks/page.js`

- `loadAll` accessed before declared (hoist fix needed).
- Two `<img>` warnings — should migrate to `next/image`.

Not breaking, but worth cleaning up in a focused pass.

## Pending naming cleanup (in-page titles still use old names)

The Kitchen nav now uses the simplified names (Chef TV, Favorites, Recipe Vault, Recipe Cards, Plan, Chef Jennifer). Destination page headers still show the old names in several places. Sweep these next time we focus on naming:

- `app/picks/page.js` — header shows "📋 MyPlan"; "Added to MyPlan" toast text; "MyVault" button label.
- `app/secret/page.js` — "Added to MyPlan" toast; "In MyPlan" / "MyPlan" button.
- `app/cards/page.js` — "Added to MyPlan!" alert.
- `app/saved/page.js` — likely references "MyFavorites".
- `app/topchef/page.js` — "Saved to My Favorites" toast/button.

Intentional kept-as-"My": `MyKitchen` (hub) stays.

## Don't-touch / confirm first

(Populate this as we make decisions — currently empty. Candidates: auth flow, Supabase schema migrations, anything in `ingest_*` scripts during a live ingestion run.)

## How to use this file

- Every Cowork / Claude session starts fresh with **no memory** of previous conversations. This file is the handoff.
- When adding a new page, section, or convention: update the relevant section here in the same commit.
- When a decision matters ("we tried X and rejected it because Y"), capture it under a new `## Decision log` section rather than burying it in commit messages.
