'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import UnifiedVideoPlayer from '@/components/UnifiedVideoPlayer'
import ExpandableItem from '@/components/ExpandableItem'
import VideoItem from '@/components/VideoItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)



// Curated tag set, organized into three groups so the form scans as
// "what kind of meal? what protein? what mood?" instead of one long
// flat list. Groups render as labelled chip rows in <TagSelector>.
// Custom tags are still allowed via the input below the groups — these
// are just the suggestions. Keep total count modest (~15) so the form
// stays scannable on a phone.
const TAG_GROUPS = [
  {
    label: 'Meal',
    emoji: '🍽',
    tags: ['breakfast', 'lunch', 'dinner', 'dessert', 'side', 'snack'],
  },
  {
    label: 'Food Groups',
    emoji: '🥩',
    tags: ['chicken', 'beef', 'seafood', 'pasta', 'vegetarian'],
  },
  {
    label: 'Style',
    emoji: '✨',
    tags: ['quick', 'comfort', 'healthy', 'baking', 'holiday'],
  },
  // Source — auto-stamped when a recipe is promoted into the Vault from
  // a Cooking School surface. Lets the user one-tap filter the Vault
  // (or Cards) down to "everything from Chef Jen" or "everything from
  // Chef TV". Writes happen in `saveRecipeToVault` / `saveVideoToVault`
  // on /playbook and `saveToKitchen` on /videos.
  {
    label: 'Source',
    emoji: '🍳',
    tags: ['chef-jen', 'chef-tv'],
  },
]
const CURATED_TAGS = TAG_GROUPS.flatMap(g => g.tags)

// Chef Portfolio — keep-forever Chef Notes get auto-grouped into 5 fixed
// "How to..." buckets so the Portfolio reads as a kitchen reference shelf
// instead of a chronological pile. Order is locked. Each group carries its
// own color stripe (mirrors Guides/Library color rhythm) and is rendered
// as a collapsed accordion by default. Notes that don't match any pattern
// fall back to the last group ("How to Improve a Dish") so nothing is
// orphaned. Patterns scan title + answer body case-insensitively; the
// first match wins (top-down) so more specific groups (Prep, Cook, Season,
// Shop) get a chance before the catch-all Improve bucket.
//
// Class strings are written out in full (no dynamic concat) because
// Tailwind v4's JIT scanner needs literal class names.
const PORTFOLIO_GROUPS = [
  {
    key: 'prep',
    emoji: '🔪',
    label: 'How to Prep',
    pattern: /\b(prep|prepare|chop|dice|slice|cut|peel|wash|clean|measure|mince|julienne|blanch|knife|board|trim|core|seed|deseed|pit|zest|grate|shred)\b/i,
    border: 'border-orange-300',
    headerBg: 'bg-orange-50',
    headerText: 'text-orange-800',
    countBg: 'bg-orange-100',
    countText: 'text-orange-700',
    bodyBg: 'bg-orange-50/30',
    stripe: 'border-l-orange-500',
  },
  {
    key: 'cook',
    emoji: '🔥',
    label: 'How to Cook',
    pattern: /\b(cook|bake|roast|sear|saut[eé]|simmer|boil|grill|fry|steam|braise|oven|stovetop|temperature|done|doneness|heat|preheat|reduce|deglaze|render|caramelize)\b/i,
    border: 'border-red-300',
    headerBg: 'bg-red-50',
    headerText: 'text-red-800',
    countBg: 'bg-red-100',
    countText: 'text-red-700',
    bodyBg: 'bg-red-50/30',
    stripe: 'border-l-red-500',
  },
  {
    key: 'season',
    emoji: '🧂',
    label: 'How to Season',
    pattern: /\b(season|salt|pepper|spice|herb|marinate|marinade|flavor|taste|umami|aromat|brine|rub|paste|vinaigrette)\b/i,
    border: 'border-amber-300',
    headerBg: 'bg-amber-50',
    headerText: 'text-amber-800',
    countBg: 'bg-amber-100',
    countText: 'text-amber-700',
    bodyBg: 'bg-amber-50/30',
    stripe: 'border-l-amber-500',
  },
  {
    key: 'improve',
    emoji: '✨',
    label: 'How to Improve a Dish',
    pattern: /\b(improve|better|fix|save|balance|enhance|rescue|elevate|too salty|too sweet|too bland|too sour|too spicy|burned|burnt|overcooked|undercooked|tough|dry|watery)\b/i,
    border: 'border-emerald-300',
    headerBg: 'bg-emerald-50',
    headerText: 'text-emerald-800',
    countBg: 'bg-emerald-100',
    countText: 'text-emerald-700',
    bodyBg: 'bg-emerald-50/30',
    stripe: 'border-l-emerald-500',
  },
  {
    key: 'shop',
    emoji: '🛒',
    label: 'How to Shop',
    pattern: /\b(shop|buy|pick|choose|select|store|keep fresh|ripe|grocery|grocer|market|produce|aisle|substitut|swap|replace|brand|quality)\b/i,
    border: 'border-sky-300',
    headerBg: 'bg-sky-50',
    headerText: 'text-sky-800',
    countBg: 'bg-sky-100',
    countText: 'text-sky-700',
    bodyBg: 'bg-sky-50/30',
    stripe: 'border-l-sky-500',
  },
]

// Walk the groups top-down and return the first whose pattern matches the
// note's question + answer body. Falls through to "improve" (the catch-all
// last group) so every note lands somewhere — never null.
function categorizeChefNote(note) {
  const haystack = `${note?.title || ''} ${note?.metadata?.answer || ''} ${note?.metadata?.question || ''}`
  for (const g of PORTFOLIO_GROUPS) {
    if (g.pattern.test(haystack)) return g.key
  }
  return 'improve'
}

// Best-guess emoji for recipes without a photo. Used as a visual fallback
// on vault cards and the detail hero. Order matters — first match wins.
function categoryEmoji(recipe) {
  const t = `${recipe?.title || ''} ${recipe?.category || ''} ${(recipe?.tags || []).join(' ')}`.toLowerCase()
  if (/pizza/.test(t)) return '🍕'
  if (/pasta|spaghetti|linguine|noodle|lasagna|ravioli|gnocchi/.test(t)) return '🍝'
  if (/salad/.test(t)) return '🥗'
  if (/soup|chowder|stew|broth|chili/.test(t)) return '🍲'
  if (/bread|loaf|focaccia|baguette/.test(t)) return '🍞'
  if (/burger/.test(t)) return '🍔'
  if (/taco|burrito|enchilada|fajita|quesadilla/.test(t)) return '🌮'
  if (/sushi|sashimi|poke/.test(t)) return '🍣'
  if (/cake|cupcake|cookie|brownie|pie|tart|dessert|cobbler/.test(t)) return '🍰'
  if (/pancake|waffle|breakfast|omelet|frittata|egg/.test(t)) return '🥞'
  if (/chicken|poultry|turkey/.test(t)) return '🍗'
  if (/beef|steak|roast|brisket/.test(t)) return '🥩'
  if (/fish|salmon|tuna|shrimp|seafood|cod|halibut/.test(t)) return '🐟'
  if (/rice|risotto|pilaf|paella/.test(t)) return '🍚'
  if (/sandwich|wrap|panini/.test(t)) return '🥪'
  if (/taco|tortilla/.test(t)) return '🌯'
  if (/drink|cocktail|smoothie|beverage/.test(t)) return '🥤'
  return '🍽️'
}

// Parse the creator attribution saveToKitchen() writes into family_notes when
// the user pulls a recipe from Chef TV. Expected format:
//   "Saved from Chef TV — {channel}." (em dash, from app/videos/page.js)
// Returns { channel } or null. Surfaced as a visible credit chip on the detail
// view so the creator is one tap away from the saved recipe — the app never
// pretends a recipe is ours, and every vault entry still points home.
function parseChefTVCredit(familyNotes) {
  if (!familyNotes) return null
  const m = familyNotes.match(/Saved from Chef TV\s*[—–-]\s*([^.\n]+)\./)
  return m ? { channel: m[1].trim() } : null
}

// "Make This Recipe More..." — keep in sync with Chef Jennifer (app/chef/page.js)
// and the server-side labels in /api/enhance-recipe.
const PREFERENCE_OPTIONS = [
  { value: 'carb_aware',       label: 'Carb-aware',             emoji: '🌾', hint: 'lower carbs where sensible' },
  { value: 'carb_counting',    label: 'Carb-counting friendly', emoji: '📊', hint: 'clearer per-serving carb info' },
  { value: 'portion_focused',  label: 'Portion-focused',        emoji: '⚖️', hint: 'right-sized servings' },
  { value: 'vegetarian',       label: 'Vegetarian-friendly',    emoji: '🥦', hint: 'swap meat for plant options' },
  { value: 'gluten_friendly',  label: 'Gluten-friendly',        emoji: '🌿', hint: 'avoid wheat where possible' },
  { value: 'dairy_friendly',   label: 'Dairy-friendly',         emoji: '🥛', hint: 'avoid dairy where possible' },
  { value: 'low_sodium',       label: 'Low-sodium',             emoji: '🧂', hint: 'reduce added salt' },
  { value: 'heart_healthy',    label: 'Heart-healthy',          emoji: '❤️', hint: 'leaner fats, more veg' },
]

// ── readClipboardSmart() — clipboard read that handles rich text ──
// readText() only returns the plain-text representation of the
// clipboard. iOS Shortcuts' "Get Contents of Web Page" action puts
// HTML / rich text on the clipboard — readText() returns empty (or
// just a snippet) and our auto-jump heuristic short-circuits.
//
// This helper tries the richer Async Clipboard API (clipboard.read())
// first, which exposes every MIME type on the clipboard. We prefer
// text/plain when it's non-empty; otherwise we fall back to text/html
// and convert it to plain text on our side (strip script/style blocks,
// turn block-level tags into newlines, strip remaining tags, decode
// the most common entities, collapse whitespace). If clipboard.read()
// isn't available or throws (older Safari, permission denied), we
// fall through to readText() so we degrade rather than break.
// Strip iMessage Tapback prefixes from a clipboard string. Modern iOS
// pastes Tap-Backed messages with the reactor's NAME baked into the
// prefix — formats observed:
//   Tom loved "<original>"
//   ❤️ Tom: <original>
//   Loved by Tom: <original>
//   Sarah laughed at "<original>"
// The original message (often a URL) is then either quote-wrapped or
// follows a colon. Hearted URLs that come through this path no longer
// start at line 1 of the clipboard, so the smart-paste `^https?://`
// regex misses them and the import silently does nothing.
//
// This helper makes a best-effort strip:
//   1. Leading reaction emoji (❤️ 👍 😂 etc.)
//   2. Either "<Name> <verb> " OR "<verb> by <Name>: " OR "<Name>: "
//   3. Wrapping smart-quotes around what remains
// Idempotent — runs cleanly on plain content.
function stripTapbackPrefix(s) {
  if (!s) return s
  let out = s.trim()
  // Tapback verbs Apple uses in the pasted form (English locale).
  const VERBS = '(?:loved|liked|disliked|laughed at|emphasized|questioned)'
  // A "name" — one to four capitalized words, possibly with apostrophes,
  // hyphens, or accented characters. Conservative so we don't eat real
  // recipe titles by accident.
  const NAME = "(?:[A-Z][\\p{L}'’\\-]*(?:\\s+[A-Z][\\p{L}'’\\-]*){0,3})"
  // Run a few sweeps so layered prefixes ("❤️ Tom loved \"…\"") get
  // peeled cleanly even though each individual rule only nibbles once.
  // The bare-name strip ("Tom: URL") is gated on having JUST stripped a
  // reaction emoji this iteration — otherwise we'd eat regular content
  // like "Title: my recipe".
  let emojiJustStripped = false
  for (let i = 0; i < 3; i++) {
    const before = out
    // Leading reaction emoji + zero-width joiners + variation selectors.
    // The U+200D / U+FE0F characters show up inside compound emoji like
    // ❤️ — accept them as part of the leading run so we strip the whole
    // glyph, not just one codepoint.
    const beforeEmoji = out
    out = out.replace(
      /^[\s​-‍﻿]*[❤️♥️💚💙💛🧡🖤🤍🤎💜👍👎😂🤣😮😍⁉‼️🥰😆]+[️‍]*\s*/u,
      ''
    )
    if (out !== beforeEmoji) emojiJustStripped = true
    // "<Name> <verb> " (e.g. `Tom loved `, `Sarah laughed at `)
    out = out.replace(new RegExp(`^${NAME}\\s+${VERBS}\\s+`, 'iu'), '')
    // "<verb> by <Name>[:]? " (e.g. `Loved by Tom: `, `Liked by Sarah `)
    out = out.replace(new RegExp(`^${VERBS}\\s+by\\s+${NAME}\\s*:?\\s*`, 'iu'), '')
    // "<verb> " on its own (e.g. just `Loved "..."`)
    out = out.replace(new RegExp(`^${VERBS}\\s+`, 'iu'), '')
    // "<Name>: " — bare name + colon. Only fire after a reaction emoji
    // was stripped (this run or any previous one) so we don't eat real
    // recipe content like "Title: …". The cumulative `emojiJustStripped`
    // flag means a leading "❤️ Tom: URL" gets fully cleaned across two
    // iterations.
    if (emojiJustStripped) {
      out = out.replace(new RegExp(`^${NAME}\\s*:\\s*`, 'u'), '')
    }
    if (out === before) break
    out = out.trim()
  }
  // If what's left is wrapped in quotes (straight, curly, or backtick),
  // strip exactly one matching pair. Tapback wraps the original content
  // in smart-quotes ("…") around the URL.
  const m = out.match(/^([‘’“”"'`])([\s\S]*?)\1\s*$/)
  if (m) out = m[2]
  return out
}

// Pull the first http(s) URL out of arbitrary text. Used to rescue
// messy iMessage clipboards (Tapbacks, reply threads, quote-blocks
// with multiple messages stacked together). The user pastes whatever
// they have; we extract the URL inside it. Trailing punctuation that
// commonly hangs off the end of a sentence-ending URL gets shaved off.
// Returns '' when no URL is found.
function extractFirstUrl(s) {
  if (!s) return ''
  const m = s.match(/https?:\/\/[^\s'"‘’“”`<>()[\]]+/i)
  if (!m) return ''
  return m[0].replace(/[.,!?;:)\]]+$/, '')
}

function htmlToCleanText(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(br|p|div|li|h[1-6]|tr|ol|ul|table|section|article)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

async function readClipboardSmart() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.read) {
      const items = await navigator.clipboard.read()
      // Pull BOTH plain and html when present, then return the longer one.
      // iOS web-page clipboards (from Shortcuts' Get Contents of Web Page,
      // or Safari's Share → Copy) put a short URL fallback on text/plain
      // and the real page content on text/html — preferring text/plain
      // would route the user to the URL tab instead of the Paste tab,
      // which was the bug we hit.
      let plain = ''
      let html = ''
      for (const item of items) {
        if (!plain && item.types?.includes('text/plain')) {
          try {
            const blob = await item.getType('text/plain')
            plain = ((await blob.text()) || '').trim()
          } catch { /* try html instead */ }
        }
        if (!html && item.types?.includes('text/html')) {
          try {
            const blob = await item.getType('text/html')
            const raw = await blob.text()
            html = htmlToCleanText(raw)
          } catch { /* try next item */ }
        }
      }
      if (html.length > plain.length) return html
      if (plain) return plain
      if (html) return html
    }
  } catch { /* fall through to readText */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      return ((await navigator.clipboard.readText()) || '').trim()
    }
  } catch { /* permission denied / unsupported */ }
  return ''
}

// ── TAG SELECTOR — inline chip groups ──
// Three labelled chip rows (Meal / Food Groups / Style) replace the old
// 19-item dropdown. Tap a chip to toggle. Below the curated groups, a
// custom-tag input lets the user add anything else (e.g. "Mom's", a
// kid's name). Custom tags that aren't in CURATED_TAGS render as their
// own chip row underneath, removable via × — same data model as before
// (a flat string array on the recipe).
function TagSelector({ tags, onChange, libraryCustomTags = [] }) {
  const [customInput, setCustomInput] = useState('')

  function toggleTag(tag) {
    if (tags.includes(tag)) {
      onChange(tags.filter(t => t !== tag))
    } else {
      onChange([...tags, tag])
    }
  }

  function addCustom() {
    const t = customInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setCustomInput('')
  }

  // Custom-tag chip pool — union of (every custom tag in the user's
  // library) + (any custom tag already on THIS recipe). Lets the user
  // re-use a tag they applied to another recipe without retyping (May
  // 2026, Bill's ask). Sorted alphabetically. Just-typed tags land in
  // local `tags` and show up here immediately because they're
  // unioned in.
  const onThisRecipeCustom = tags.filter(t => !CURATED_TAGS.includes(t))
  const allCustomChips = [...new Set([...libraryCustomTags, ...onThisRecipeCustom])].sort()

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">🏷️ Tags</label>
      <div className="space-y-3">
        {TAG_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              {group.emoji} {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map(tag => {
                const selected = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={
                      selected
                        ? 'px-3 py-1.5 bg-orange-600 text-white border-2 border-orange-600 rounded-full text-xs font-semibold transition-colors'
                        : 'px-3 py-1.5 bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 rounded-full text-xs font-semibold transition-colors'
                    }
                  >
                    #{tag}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            ✏️ Custom
          </p>
          {/* Custom-tag chip row — every custom tag the user has used
              anywhere in their vault renders here as a toggleable chip,
              same treatment as curated chips. Filled orange = applied to
              this recipe. Tap to toggle. Just-typed tags appear in the
              row immediately via `allCustomChips` (union of library +
              this recipe's custom tags). */}
          {allCustomChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allCustomChips.map(tag => {
                const selected = tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={
                      selected
                        ? 'px-3 py-1.5 bg-orange-600 text-white border-2 border-orange-600 rounded-full text-xs font-semibold transition-colors'
                        : 'px-3 py-1.5 bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 rounded-full text-xs font-semibold transition-colors'
                    }
                  >
                    #{tag}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              placeholder="Add a new custom tag…"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() }}}
              style={{ fontSize: '16px' }}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-300 transition-colors"
            />
            <button
              type="button"
              onClick={addCustom}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold"
            >Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── EDIT FORM ──
function EditForm({ initial, initialIngredients, onSave, onCancel, photoUrl, onUploadImage, onPasteImage, uploadingPhoto, libraryCustomTags }) {
  const editPhotoInputRef = useRef(null)
  const [title, setTitle] = useState(initial.title || '')
  const [description, setDescription] = useState(initial.description || '')
  const [category, setCategory] = useState(initial.category || '')
  const [ingredients, setIngredients] = useState(initialIngredients || '')
  const [instructions, setInstructions] = useState(initial.instructions || '')
  const [familyNotes, setFamilyNotes] = useState(initial.family_notes || '')
  const [tags, setTags] = useState(initial.tags || [])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    // Ingredient lines are now "Measure - Name" (measure/qty first), matching
    // how they render in the recipe. If only one segment is present, treat
    // the whole line as the name with no measure (e.g. "Salt").
    const parsedIngredients = ingredients.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const sep = line.indexOf(' - ')
      if (sep === -1) return { name: line, measure: '' }
      return {
        measure: line.slice(0, sep).trim(),
        name: line.slice(sep + 3).trim(),
      }
    })
    await onSave({ title, description, category, ingredients: parsedIngredients, instructions, family_notes: familyNotes, tags })
    setSaving(false)
  }

  // If scraped instructions arrived as one giant paragraph, this heuristically
  // splits them on sentence boundaries so each step gets its own line.
  function autoSplitSteps() {
    const raw = instructions.trim()
    if (!raw || raw.includes('\n')) return
    const parts = raw
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
      .map(s => s.trim())
      .filter(Boolean)
    if (parts.length > 1) setInstructions(parts.join('\n'))
  }

  const instructionsLooksLikeParagraph =
    instructions.trim().length > 200 && !instructions.includes('\n')

  // Shared styling for all inputs/textareas. fontSize:16px is required to
  // stop iOS Safari from auto-zooming when a field is tapped. text-base keeps
  // desktop at 16px too; padding + rounded corners are bumped for finger taps.
  const fieldBase =
    "w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-colors"
  const fieldStyle = { fontSize: '16px' }
  const labelClass = "block text-base font-bold text-gray-800 mb-2"
  const helperClass = "text-sm text-gray-500 mb-2"

  return (
    <div className="space-y-7 pb-24">

      {/* Photo block — mirrors the detail-view hero affordances so users
          can swap the photo from the Edit form too. Tap the preview to
          open the file picker; or use 📁 Upload / 📋 Paste pills. Photo
          changes save immediately via the parent's onUploadImage /
          onPasteImage callbacks (same path as the detail view), so they
          land on the recipe row whether the user hits Save Recipe or
          Cancel — same as the detail-view paste flow. */}
      {(onUploadImage || onPasteImage) && (
        <div>
          <label className={labelClass}>Photo</label>
          <p className={helperClass}>Tap to upload, or paste an image from your clipboard.</p>
          <div className="relative w-full rounded-2xl overflow-hidden border-2 border-gray-200" style={{ height: '180px' }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" decoding="async" src={photoUrl} alt="Recipe" className="w-full h-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => editPhotoInputRef.current?.click()}
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 hover:from-orange-100 hover:to-amber-100 transition-colors"
              >
                <span className="text-4xl mb-1">📷</span>
                <span className="text-sm font-semibold text-orange-700">Add a photo</span>
              </button>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => editPhotoInputRef.current?.click()}
                disabled={uploadingPhoto}
                title="Upload from device"
                className="text-xs font-semibold bg-white/95 text-orange-700 border border-orange-300 rounded-lg px-2.5 py-1 hover:bg-orange-50 disabled:opacity-50"
              >
                {photoUrl ? '📷 Change' : '📁 Upload'}
              </button>
              {onPasteImage && (
                <button
                  type="button"
                  onClick={() => onPasteImage()}
                  disabled={uploadingPhoto}
                  title="Paste image from clipboard"
                  className="text-xs font-semibold bg-white/95 text-orange-700 border border-orange-300 rounded-lg px-2.5 py-1 hover:bg-orange-50 disabled:opacity-50"
                >
                  {uploadingPhoto ? '⏳ …' : (photoUrl ? '📋 Paste' : '📋 Paste image')}
                </button>
              )}
            </div>
          </div>
          <input
            ref={editPhotoInputRef}
            type="file"
            accept="image/*,.heic"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (onUploadImage) onUploadImage(file)
              e.target.value = ''
            }}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Recipe Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Grandma's Chicken Soup"
          style={fieldStyle}
          className={fieldBase} />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <p className={helperClass}>One or two sentences about the dish.</p>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="A short description of this recipe"
          rows={3}
          style={fieldStyle}
          className={`${fieldBase} resize-y`} />
      </div>

      <div>
        <label className={labelClass}>Category</label>
        <input value={category} onChange={e => setCategory(e.target.value)}
          placeholder="e.g. Main Dish, Dessert, Side"
          style={fieldStyle}
          className={fieldBase} />
      </div>

      <TagSelector tags={tags} onChange={setTags} libraryCustomTags={libraryCustomTags} />

      <div>
        <label className={labelClass}>Ingredients</label>
        <p className={helperClass}>
          One per line. Format: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">2 cups - flour</span> — quantity first, then a dash, then the name.
        </p>
        <textarea value={ingredients} onChange={e => setIngredients(e.target.value)}
          placeholder="2 cups - flour&#10;1 cup - sugar&#10;1/2 cup - butter&#10;Salt"
          rows={14}
          style={fieldStyle}
          className={`${fieldBase} resize-y font-mono`} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`${labelClass} mb-0`}>Instructions</label>
          {instructionsLooksLikeParagraph && (
            <button type="button" onClick={autoSplitSteps}
              className="text-sm font-semibold text-orange-600 border-2 border-orange-200 rounded-xl px-3 py-1.5 hover:bg-orange-50 transition-colors">
              ✨ Auto-split into steps
            </button>
          )}
        </div>
        <p className={helperClass}>One step per line — a new line per numbered instruction.</p>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
          placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients and stir"
          rows={16}
          style={fieldStyle}
          className={`${fieldBase} resize-y font-mono`} />
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <p className={helperClass}>Tips, tweaks, source attribution — anything you want to remember.</p>
        <textarea value={familyNotes} onChange={e => setFamilyNotes(e.target.value)}
          placeholder="Less salt next time. Doubled the garlic. Saved from..."
          rows={8}
          style={fieldStyle}
          className={`${fieldBase} resize-y font-mono`} />
      </div>

      {/* Sticky save/cancel footer — always reachable even on long recipes.
          bg-white/95 + backdrop-blur keeps form content readable through it
          while scrolling. pb-24 on the form body reserves room so the last
          field isn't hidden behind the bar. */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex gap-3 z-20">
        <button onClick={onCancel}
          style={fieldStyle}
          className="px-5 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-semibold hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!title.trim() || saving}
          style={fieldStyle}
          className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>
    </div>
  )
}

function EducationVideoCard({ item, onDelete }) {
  const [playing, setPlaying] = useState(false)
  const youtubeId = item.metadata?.youtube_id
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
      {playing && youtubeId ? (
        <UnifiedVideoPlayer url={`https://www.youtube.com/watch?v=${youtubeId}`} onClose={() => setPlaying(false)} />
      ) : (
        <div className="flex gap-3 p-4">
          <button onClick={() => setPlaying(true)} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-blue-100">
            {item.thumbnail_url ? (
              <img loading="lazy" decoding="async" src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="text-white text-xs">▶</span>
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate mb-1">{item.title}</p>
            {item.metadata?.channel && <p className="text-xs text-blue-600 mb-1">{item.metadata.channel}</p>}
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">📚 Videos Only</span>
          </div>
          <button onClick={() => onDelete(item.id)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 text-2xl self-center">×</button>
        </div>
      )}
    </div>
  )
}

function VaultRecipeVideoCard({ recipe, onDelete }) {
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const familyNotes = recipe.family_notes || ''
  const youtubeIdMatch = familyNotes.match(/youtube_id:([^|]+)/)
  const youtubeId = youtubeIdMatch ? youtubeIdMatch[1].trim() : null
  const ingredients = recipe.ingredients || []
  const instructions = (recipe.instructions || '').split('\n').filter(Boolean)

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden">
      {/* Video player */}
      {playing && youtubeId ? (
        <UnifiedVideoPlayer url={`https://www.youtube.com/watch?v=${youtubeId}`} onClose={() => setPlaying(false)} />
      ) : (
        <div className="flex gap-3 p-4">
          <button onClick={() => setPlaying(true)} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-blue-100">
            {recipe.photo_url ? (
              <img loading="lazy" decoding="async" src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🍳</div>
            )}
            {youtubeId && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="text-white text-xs">▶</span>
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate mb-1">{recipe.title}</p>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">📺 Recipe Video</span>
          </div>
          <button onClick={() => onDelete(recipe.id)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 text-2xl self-center">×</button>
        </div>
      )}

      {/* Recipe content toggle */}
      {(ingredients.length > 0 || instructions.length > 0) && (
        <div className="border-t border-blue-100">
          <button onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 text-xs font-semibold text-blue-600 text-left flex justify-between items-center bg-blue-50">
            <span>{expanded ? 'Hide Recipe' : 'Show Recipe'}</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div className="bg-white px-4 pb-4">
              {ingredients.length > 0 && (
                <div className="mb-4 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ingredients</p>
                    <button onClick={addAllToShoppingList} className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-50">🛒 Add All</button>
                  </div>
                  <ul className="space-y-1">
                    {ingredients.map((ing, i) => {
                      const key = [ing.measure, ing.name].filter(Boolean).join(' ').toLowerCase()
                      return (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-orange-400">•</span>
                          <span className="flex-1 text-gray-700">
                            {ing.measure && <span className="font-semibold">{ing.measure} </span>}
                            {ing.name}
                          </span>
                          <button onClick={() => addToShoppingList(ing)}
                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${addedToList.has(key) ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                            {addedToList.has(key) ? '✓' : '+'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {instructions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Instructions</p>
                  <div className="space-y-2">
                    {instructions.map((step, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="shrink-0 w-5 h-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-lg">💬</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate mb-1">{note.title}</p>
            {note.question && <p className="text-xs text-indigo-600 truncate">Q: {note.question}</p>}
          </div>
          <span className="text-gray-500 text-sm shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-indigo-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mt-3">{note.content}</p>
        </div>
      )}
    </div>
  )
}

export default function MyRecipeVaultPage() {
  const [user, setUser] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [notes, setNotes] = useState([])
  const [educationVideos, setEducationVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list')
  // listStyle = 'list' | 'grid' | 'portfolio' — what the Vault list-view
  // shows. 'list' and 'grid' are display modes for *recipes* (single
  // column with thumb+description vs. two-column photo-first cream-paper
  // tiles); both tap-through to the same Vault detail view with full
  // instructions. 'portfolio' (💎 Chef Portfolio) is a different surface —
  // it shows the curated Chef Notes the user promoted from Playbook via
  // "💎 Add to Portfolio". Notes only, no recipes; the Add/Import buttons
  // don't apply there. Synced to ?view=grid|portfolio via
  // history.replaceState so refresh/share preserves the user's choice.
  // Distinct from Recipe Cards (/cards), a separate "chef card" concept.
  // Default is 'grid' (May 2026, Bill's call) — the index-card-style
  // photo-first tile view reads as the front door of the vault. The
  // What's Cooking? cardbox + Portfolio still live one tap away in the
  // toggle; they're just not what you land on by default.
  const [listStyle, setListStyle] = useState('grid')
  // Surprise me — random recipe pulled from non-favorites when the user
  // taps 🎲. Stored as a recipe object so the result card can render
  // without re-querying. Cleared when user picks a different list mode.
  const [surpriseRecipe, setSurpriseRecipe] = useState(null)
  // Card box drawer state — favorites open by default, all-recipes
  // collapsed. Per-mount, no persistence.
  const [favOpen, setFavOpen] = useState(true)
  const [allOpen, setAllOpen] = useState(false)
  // Story mode — full-screen vertical-scroll viewer over the All Recipes
  // drawer. Younger-user UX (TikTok / Instagram pattern). Opt-in via a
  // 📱 Story button on the drawer; ✕ closes back to the page.
  const [storyMode, setStoryMode] = useState(false)
  // Curated Chef Notes promoted from Playbook into Recipe Vault via the
  // "💎 Add to Portfolio" button. Backed by `favorites.is_in_vault = true`
  // on rows where `type = 'ai_answer'`. Loaded once at auth and refreshed
  // whenever the user toggles between listStyle modes.
  const [portfolioNotes, setPortfolioNotes] = useState([])
  // Settings → 🗑 Recently Deleted (May 2026, migration 020). Recipes
  // soft-deleted from the Vault (deleted_at IS NOT NULL) stay
  // recoverable for 30 days. Loaded lazily when the user opens
  // Settings, not on auth, since most sessions never touch the trash.
  const [trashRecipes, setTrashRecipes] = useState([])
  // Portfolio also holds Chef TV Teach videos the user moved over from
  // Playbook (April 2026). Same `favorites.is_in_vault=true` flag as
  // notes; type is `video_education` or `video_recipe` instead of
  // `ai_answer`. Rendered in its own collapsible section above the
  // Notes accordion.
  const [portfolioVideos, setPortfolioVideos] = useState([])
  // Whether the "📺 Learning Videos" Portfolio section is expanded.
  // Default closed to match the Notes accordion's collapsed-by-default
  // pattern — user taps the section header to open. Collapsed state
  // is per-mount (no persistence) since the user usually opens
  // Portfolio for one specific thing and closes again.
  const [portfolioVideosOpen, setPortfolioVideosOpen] = useState(false)
  // Which of the 5 Chef Portfolio "How to..." groups are expanded.
  // Defaults to all collapsed (matches Guides/Library accordion pattern) so
  // the Portfolio opens as a 5-row scannable index — tap a row to drill in.
  const [portfolioOpenGroups, setPortfolioOpenGroups] = useState(() => new Set())
  const [viewing, setViewing] = useState(null)
  const [showVideo, setShowVideo] = useState(true)
  const [searchTag, setSearchTag] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceResult, setEnhanceResult] = useState(null)
  const [generatedInfo, setGeneratedInfo] = useState(null)
  // "Make This Recipe More..." state
  const [transformPrefs, setTransformPrefs] = useState([])
  const [transforming, setTransforming] = useState(false)
  const [transformResult, setTransformResult] = useState(null)
  const [servings, setServings] = useState(4)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  // Import view active tab. URL is default (most common). Paste is the
  // "site blocked the fetcher" fallback. Add is manual entry + the
  // post-import preview surface (where parsed data lands for review).
  // JSON is power-user import/export. Values: 'url' | 'paste' | 'add' | 'json'.
  const [importTab, setImportTab] = useState('url')
  // Paste tab — three collapsible "how to get content" instruction
  // groups (Paste Text / Print Capture / Share Shortcut). All three end
  // with pasting into the same textarea below; they're just different
  // recipes for HOW you got the content. Tracks which option is open.
  // null = none expanded; 'text' | 'print' | 'shortcut' = that one open.
  const [pasteOption, setPasteOption] = useState(null)
  // AI Kitchen Helpers tab — matches the Import Recipes tab pattern.
  // The four helper cards used to stack on the same scroll which made
  // the page busy on first open. Since they're alternatives (only one
  // is used per session), the page is now a tab strip with one active
  // card at a time. Default 'polish' is the most common entry point.
  // Values: 'polish' | 'resize' | 'info' | 'transform'.
  const [helperTab, setHelperTab] = useState('polish')
  const importTextRef = useRef(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [pinnedCards, setPinnedCards] = useState([])
  const [picksIds, setPicksIds] = useState([])
  // Default shopping store — when set, new shopping_list rows land
  // here instead of NULL/Unsorted (May 2026, Bill's ask). Loaded on
  // mount; null means user hasn't picked a default. Set via the
  // 🏬 Manage Stores editor on /shopping-list.
  const [defaultStoreId, setDefaultStoreId] = useState(null)
  const [toastMsg, setToastMsg] = useState(null)
  // When navigator.clipboard.read() can't see the image (iOS Photos +
  // some Windows sources put images in legacy formats the async API
  // doesn't surface), we fall back to a tiny modal with a focused
  // paste-target — the synchronous `paste` event has access to
  // formats clipboard.read() can't read. `pasteTarget` holds the
  // recipe id we should attach the pasted image to.
  const [pasteTarget, setPasteTarget] = useState(null)
  const [addedToList, setAddedToList] = useState(new Set())
  // Recipe detail view — collapsible section state. Defaults to expanded.
  const [detailCollapsed, setDetailCollapsed] = useState({
    info: false,
    notes: false,
    ingredients: false,
    instructions: false,
  })
  function toggleDetailSection(key) {
    setDetailCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '', description: '', ingredients: '', instructions: '',
    category: '', tags: [], family_notes: '', photo_url: '',
    // Structured fields from JSON-LD on import (May 2026). All optional;
    // null/undefined means "not set, don't render the pill". Numbers are
    // stored as plain JS numbers; the DB columns are int / numeric(6,2).
    prep_time_minutes: null, cook_time_minutes: null, total_time_minutes: null,
    calories: null, protein_g: null, carbs_g: null, fat_g: null,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Preserve the URL the user was trying to reach (e.g.
        // /secret?import=… from the iOS Shortcut deep-link or
        // /secret?smart_import=1) so /login can return them here
        // after sign-in. Without this, the auth round-trip lands
        // them on /kitchen and the import URL is lost.
        const next = window.location.pathname + window.location.search
        window.location.href = `/login?next=${encodeURIComponent(next)}`
        return
      }
      setUser(session.user)
      loadRecipes(session.user.id)
      loadNotes(session.user.id)
      loadEducationVideos(session.user.id)
      loadPortfolioNotes(session.user.id)
      loadPinnedCards(session.user.id)
      loadPicksIds(session.user.id)
      loadDefaultStore(session.user.id)
    })
  }, [])

  // (Clipboard auto-detect on Import view retired April 2026.) Used to
  // peek at the clipboard when entering the URL tab and surface a
  // "📋 URL on your clipboard — Use it" prompt. Removed because the
  // app-side clipboard read triggered iOS's "Paste from <App>?" prompt
  // every time the user opened Import, even when the clipboard was
  // unrelated. Simpler now: user pastes URL themselves into the field,
  // iOS shows the paste suggestion above the keyboard at the right
  // moment (when they're focused on the field, not on page entry).

  // Detail-view paste listener — when looking at a recipe, Cmd/Ctrl+V
  // lifts an image off the clipboard straight into the recipe. Skips
  // when the paste target is a text input/textarea/contenteditable so
  // it doesn't hijack normal text-paste in the editor. Uses the
  // synchronous `e.clipboardData.items` API (works without permission
  // because the paste event itself is a user gesture).
  useEffect(() => {
    if (view !== 'detail' || !viewing || !user) return
    function onPaste(e) {
      const t = e.target
      if (t && (t.matches?.('input, textarea, [contenteditable], [contenteditable="true"]'))) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const it of items) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const blob = it.getAsFile()
          if (blob) {
            e.preventDefault()
            attachImageBlobToRecipe(blob, viewing.id, user.id)
          }
          return
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewing?.id, user?.id])

  // ESC closes the Story-mode overlay. Also lock <body> scroll while it's
  // open so a swipe-up doesn't bleed into the underlying page.
  useEffect(() => {
    if (!storyMode) return
    function onKey(e) { if (e.key === 'Escape') setStoryMode(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [storyMode])

  function showToast(msg) {
    setToastMsg(msg)
    // Diagnostic / error toasts (anything that mentions "Clipboard",
    // "No image", "Could not", or "failed") stay up longer so the user
    // can actually read them — short success toasts auto-dismiss in 2s.
    const isDiagnostic = typeof msg === 'string' && /clipboard|no image|could not|failed|error/i.test(msg)
    setTimeout(() => setToastMsg(null), isDiagnostic ? 6000 : 2500)
  }

  // Shared toast element. Rendered at the bottom of every view return
  // so messages from showToast (success + diagnostic) actually appear.
  // Without this the showToast() calls were no-ops — that's why "Photo
  // added", "Added to Meal Plan", "Clipboard NotAllowedError", and the
  // "No image found — clipboard types: …" diagnostics were all firing
  // silently. Tap-to-dismiss for the longer diagnostic toasts.
  const toastEl = toastMsg ? (
    <div
      onClick={() => setToastMsg(null)}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[92%] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm cursor-pointer break-words text-center"
      role="status"
      aria-live="polite"
    >
      {toastMsg}
    </div>
  ) : null

  // Manual paste-target modal — fallback for when
  // navigator.clipboard.read() can't see the image (iOS Photos / some
  // Windows clipboard formats). Renders a focused contenteditable +
  // a regular paste handler. The synchronous `paste` event has
  // access to formats the async API hides, so this works in cases
  // where the auto-paste path returns "no image".
  const pasteTargetEl = pasteTarget ? (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      onClick={() => setPasteTarget(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📋 Paste your image</h3>
            <p className="text-sm text-gray-600 mt-1">The browser couldn&apos;t read the clipboard directly. Paste your image here instead:</p>
          </div>
          <button
            type="button"
            onClick={() => setPasteTarget(null)}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1"
          >
            ×
          </button>
        </div>
        <div
          contentEditable
          suppressContentEditableWarning
          autoFocus
          ref={(el) => { if (el) setTimeout(() => el.focus(), 50) }}
          onPaste={async (e) => {
            const cd = e.clipboardData
            // Pass 1 — direct image bytes. The clipboard exposes a
            // File item with type image/*. Works for desktop copies
            // and the Notes-as-converter path on iOS.
            const items = cd?.items
            if (items) {
              for (const it of items) {
                if (it.kind === 'file' && it.type.startsWith('image/')) {
                  const blob = it.getAsFile()
                  if (blob && user) {
                    e.preventDefault()
                    const targetId = pasteTarget
                    setPasteTarget(null)
                    await attachImageBlobToRecipe(blob, targetId, user.id)
                  }
                  return
                }
              }
            }
            // Pass 2 — extract a URL from any of three places:
            //   - text/uri-list (most reliable when present)
            //   - text/plain (iOS Safari often only puts plain text)
            //   - text/html (iOS Safari sometimes only ships an
            //                <img loading="lazy" decoding="async" src="..."> blob — extract the src)
            // Fetch the URL; if it's an image, use it. Tries hardest
            // before giving up because iOS Safari's "long-press → Copy
            // image" path is flaky and varies by version.
            const uriList = (cd?.getData('text/uri-list') || '').trim()
            const plain = (cd?.getData('text/plain') || '').trim()
            const html = cd?.getData('text/html') || ''
            const htmlImgMatch = html.match(/<img loading="lazy" decoding="async"[^>]+src=["']([^"']+)["']/i)
            const fromHtml = htmlImgMatch ? htmlImgMatch[1] : ''
            const candidate =
              [uriList, plain, fromHtml]
                .map(s => s && s.match(/^https?:\/\/\S+/i)?.[0])
                .find(Boolean) || ''
            if (candidate && user) {
              e.preventDefault()
              const targetId = pasteTarget
              setPasteTarget(null)
              try {
                const res = await fetch(candidate)
                const ct = res.headers.get('content-type') || ''
                if (ct.startsWith('image/')) {
                  const blob = await res.blob()
                  await attachImageBlobToRecipe(blob, targetId, user.id)
                  return
                }
                showToast(`URL fetched but not an image (got ${ct || 'unknown'}). Try paste-through-Notes.`)
              } catch (err) {
                showToast(`Couldn't fetch URL — likely CORS-blocked. ${err?.name || ''}`)
              }
              return
            }
            // Nothing usable. Diagnostic toast lists what was actually
            // on the clipboard so we can see why iOS rejected it. Tap
            // to dismiss; auto-dismisses in 6s (diagnostic toasts hold
            // longer than success ones).
            const types = []
            if (items) for (const it of items) types.push(`${it.kind}:${it.type || '(no type)'}`)
            const typeList = types.length ? types.join(', ') : '(empty)'
            showToast(`No image found. Clipboard had: ${typeList}. On iPhone, long-press → Save Image, then Upload.`)
          }}
          className="border-2 border-dashed border-orange-300 rounded-xl p-6 min-h-[120px] text-center text-gray-500 text-sm bg-orange-50 focus:outline-none focus:border-orange-500 focus:bg-orange-100"
        >
          <span className="pointer-events-none select-none">
            Tap and hold here, then choose <strong>Paste</strong> from the menu
            <br /><span className="text-xs text-gray-400">(or press Ctrl/⌘+V)</span>
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          If paste still doesn&apos;t work, tap <strong>📁 Upload</strong> on the photo to pick from your files.
        </p>
      </div>
    </div>
  ) : null

  async function addToShoppingList(ing) {
    if (!user) return
    const ingredient = [ing.measure, ing.name].filter(Boolean).join(' ')
    const key = ingredient.toLowerCase()
    if (addedToList.has(key)) {
      await supabase.from('shopping_list').delete().eq('user_id', user.id).eq('ingredient', ingredient)
      setAddedToList(prev => { const n = new Set(prev); n.delete(key); return n })
      showToast('Removed from Shopping List')
    } else {
      // Default to the user's preferred shopping store when set, so
      // the new row lands in that store's section instead of 📦
      // Unsorted. The store editor on /shopping-list controls this.
      await supabase.from('shopping_list').insert({ user_id: user.id, ingredient, recipe_title: viewing?.title || '', store_id: defaultStoreId || null })
      setAddedToList(prev => new Set([...prev, key]))
      showToast('Added to Shopping List')
    }
  }

  async function addAllToShoppingList() {
    if (!user || !viewing) return
    const ings = viewing.ingredients || []
    if (!ings.length) return
    const rows = ings.map(ing => ({ user_id: user.id, ingredient: [ing.measure, ing.name].filter(Boolean).join(' '), recipe_title: viewing.title || '', store_id: defaultStoreId || null }))
    await supabase.from('shopping_list').insert(rows)
    setAddedToList(new Set(ings.map(ing => [ing.measure, ing.name].filter(Boolean).join(' ').toLowerCase())))
    showToast(`Added ${ings.length} ingredients to Shopping List`)
  }

  // Pull the user's default-store id (if any). Light query — id only.
  async function loadDefaultStore(userId) {
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()
    setDefaultStoreId(data?.id || null)
  }

  async function loadPinnedCards(userId) {
    const { data } = await supabase.from('recipe_cards').select('recipe_id').eq('user_id', userId)
    setPinnedCards((data || []).map(d => d.recipe_id))
  }

  async function loadPicksIds(userId) {
    const { data } = await supabase.from('my_picks').select('recipe_id').eq('user_id', userId)
    setPicksIds((data || []).map(d => d.recipe_id))
  }

  async function toggleCardPin(id) {
    if (!user) return
    if (pinnedCards.includes(id)) {
      await supabase.from('recipe_cards').delete().eq('user_id', user.id).eq('recipe_id', id)
      setPinnedCards(prev => prev.filter(p => p !== id))
    } else {
      await supabase.from('recipe_cards').insert({ user_id: user.id, recipe_id: id })
      setPinnedCards(prev => [...prev, id])
    }
  }

  // Toggle a recipe in/out of the Meal Plan (top bucket). Same logic
  // as the detail-view header button, exposed here as a helper so the
  // 📅 button on Card Box / Grid / Story tiles can reuse it without
  // duplicating the upsert/delete + state-flip + toast for every
  // surface. Used by the inline "📅 Meal Plan" button on tiles.
  async function toggleMealPlanPick(recipe) {
    if (!user || !recipe) return
    if (picksIds.includes(recipe.id)) {
      await supabase.from('my_picks').delete().eq('user_id', user.id).eq('recipe_id', recipe.id)
      setPicksIds(prev => prev.filter(id => id !== recipe.id))
      showToast('Removed from Meal Plan')
    } else {
      await supabase.from('my_picks').upsert({
        user_id: user.id,
        recipe_id: recipe.id,
        title: recipe.title,
        photo_url: recipe.photo_url || '',
        category: recipe.category || '',
        // New picks default to 'nice' (Maybe) so they don't crowd the
        // carefully-ordered ⭐ To Make list. The user promotes to To
        // Make from /meal-plan when they're actually ready to cook.
        bucket: 'nice',
      }, { onConflict: 'user_id,recipe_id' })
      setPicksIds(prev => prev.includes(recipe.id) ? prev : [...prev, recipe.id])
      showToast('Added to Maybe ✓')
    }
  }

  async function loadNotes(userId) {
    const { data } = await supabase.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function loadEducationVideos(userId) {
    const { data } = await supabase.from('favorites').select('*').eq('user_id', userId).eq('is_in_vault', true).eq('type', 'video_education').order('created_at', { ascending: false })
    setEducationVideos(data || [])
  }

  async function deleteEducationVideo(id) {
    await supabase.from('favorites').delete().eq('id', id)
    setEducationVideos(prev => prev.filter(v => v.id !== id))
  }

  // Chef Portfolio — saved Chef Notes (AI answers) AND Chef TV Teach
  // videos the user has promoted from /playbook. Both live on the
  // `favorites` table with `is_in_vault=true`; we run two parallel
  // queries because the rendering surface differs (notes get the
  // 5-bucket "How to..." accordion, videos get a flat thumbnail grid
  // above it). Both still live on /playbook regardless; the flag
  // just marks the keepers for the Vault's Portfolio view.
  async function loadPortfolioNotes(userId) {
    const [{ data: noteRows }, { data: videoRows }] = await Promise.all([
      supabase
        .from('favorites').select('*')
        .eq('user_id', userId).eq('type', 'ai_answer')
        .eq('is_in_vault', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('favorites').select('*')
        .eq('user_id', userId).in('type', ['video_education', 'video_recipe'])
        .eq('is_in_vault', true)
        .order('created_at', { ascending: false }),
    ])
    setPortfolioNotes(noteRows || [])
    setPortfolioVideos(videoRows || [])
  }

  // Load soft-deleted recipes for the Settings → 🗑 Recently Deleted
  // view. Filters to rows the auto-purge hasn't grabbed yet (within
  // the 30-day window). Ordered by deleted_at desc so the most-recent
  // delete is at the top of the trash.
  async function loadTrashRecipes(userId) {
    const { data } = await supabase
      .from('personal_recipes')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setTrashRecipes(data || [])
  }

  // Un-file a note: send it back to the Chef Notes inbox in Playbook.
  // Does NOT delete the underlying saved note — flips is_in_vault to false
  // so the note disappears from this Portfolio surface and reappears as
  // an unfiled row on /playbook → 📝 Chef Notes (where × hard-deletes).
  // Matches Bill's metaphor: Portfolio is the filed keepers, Chef Notes
  // is the inbox; un-filing is the safe escape from Portfolio.
  async function removeFromPortfolio(note) {
    if (!user) return
    const { error } = await supabase
      .from('favorites')
      .update({ is_in_vault: false })
      .eq('id', note.id)
    if (error) { showToast('Could not un-file note'); return }
    setPortfolioNotes(prev => prev.filter(n => n.id !== note.id))
    showToast('↩ Returned to Chef Notes')
  }

  // Un-file a video: send it back to Chef TV · Teach in Playbook by
  // flipping is_in_vault to false. Bucket placement was deleted when the
  // video was moved here, so on un-file we also re-create the Teach
  // bucket row so it shows up where the user expects. Doesn't delete
  // the underlying favorites row — same safe-escape pattern as notes.
  async function removeVideoFromPortfolio(video) {
    if (!user) return
    const { error: updErr } = await supabase
      .from('favorites')
      .update({ is_in_vault: false })
      .eq('id', video.id)
    if (updErr) { showToast('Could not un-file video'); return }
    // Restore the Teach bucket placement on Playbook so the video
    // reappears in the Chef TV Teach inbox (same as Chef Notes' return).
    await supabase.from('cooking_skill_items').upsert({
      user_id: user.id,
      item_type: 'favorite',
      item_id: video.id,
      bucket: 'teach',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,item_type,item_id' })
    setPortfolioVideos(prev => prev.filter(v => v.id !== video.id))
    showToast('↩ Returned to Chef TV · Teach')
  }

  async function loadRecipes(userId) {
    // Soft-delete filter — only show recipes the user hasn't deleted.
    // Migration 020 added the `deleted_at` column; older rows have it
    // NULL by default, so the filter is a no-op for pre-migration data.
    const { data } = await supabase
      .from('personal_recipes')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
    // Auto-purge: hard-delete any soft-deleted rows older than the
    // 30-day recovery window. Best-effort, fire-and-forget — a failure
    // here doesn't block the Vault from rendering. Runs on every load
    // so cleanup happens incrementally as users open the Vault. The
    // user's session has RLS scoped to their own rows so this only
    // touches their soft-deleted data.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('personal_recipes')
      .delete()
      .eq('user_id', userId)
      .lt('deleted_at', thirtyDaysAgo)
      .then(() => {})
    // Auto-open recipe if ?recipe=ID in URL
    const searchParams = new URLSearchParams(window.location.search)
    const recipeParam = searchParams.get('recipe')
    if (recipeParam && data) {
      const match = data.find(r => r.id === recipeParam)
      if (match) { setViewing(match); setView('detail') }
    }
    // Honor ?view=grid|portfolio so a bookmark / shared link preserves
    // the user's chosen list style. Unknown / missing values leave the
    // default 'list'. Portfolio (💎) renders curated Chef Notes the user
    // promoted from Playbook, not recipes.
    const viewParam = searchParams.get('view')
    // 'list' retired May 2026 — old ?view=list bookmarks fall through
    // to the default (cardbox / What's Cooking?). Grid covers visual
    // browse; the cardbox All Recipes drawer covers dense scanning.
    if (viewParam === 'grid') setListStyle('grid')
    else if (viewParam === 'portfolio') setListStyle('portfolio')
    else if (viewParam === 'cardbox') setListStyle('cardbox')
    // ?import=<encoded-url> deep-link — the entry point used by the
    // iOS Share-Sheet Shortcut (and any other "send a URL to MyRecipe"
    // flow). Switches to the import view, prefills the URL field, and
    // immediately fires the existing import pipeline. handleImport
    // accepts an explicit override so we don't have to wait for the
    // setImportUrl state flush before kicking it off. The recipe lands
    // on the standard Add form for the user to review/save, exactly
    // the same path as a manual Import 📥 → URL → Import tap.
    const importParam = searchParams.get('import')
    if (importParam) {
      // Same Tapback strip as smart-paste — defends against the deep-link
      // path picking up a URL the user copied from a hearted iMessage.
      const decoded = stripTapbackPrefix(decodeURIComponent(importParam).trim())
      if (decoded) {
        setView('import')
        setImportTab('url')
        setImportUrl(decoded)
        // Strip the param from the URL so a refresh doesn't re-trigger.
        try {
          const u = new URL(window.location.href)
          u.searchParams.delete('import')
          window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash)
        } catch { /* noop */ }
        // Defer to next tick so React has flushed the view switch before
        // the import network call kicks off — keeps the loading UI in sync.
        setTimeout(() => handleImport(decoded), 0)
      }
    }
    // ?smart_import=1 — the iOS Share-Sheet Shortcut path. The Shortcut
    // copies a "URL\n\nHTML" payload to the clipboard, then opens this
    // route. We read the clipboard (the navigation IS the user gesture,
    // so iOS Safari typically allows the read), split on the first blank
    // line, and POST both pieces to /api/import-recipe. The API tries the
    // URL fetch first and silently falls back to the HTML if the site
    // blocks the server-side fetcher — same code path either way, so the
    // user's experience is "share, tap, recipe lands."
    //
    // Resilient if the clipboard read denies: the page still ends up on
    // Import → URL with an empty form, so the user can paste manually.
    // Stale-clipboard guard: we only fire handleImport if we successfully
    // parsed a URL or substantial HTML out of the payload. Junk clipboard
    // contents fall through to the empty Import view.
    const smartImport = searchParams.get('smart_import')
    if (smartImport === '1') {
      setView('import')
      setImportTab('url')
      // Strip the param immediately so refresh doesn't re-trigger.
      try {
        const u = new URL(window.location.href)
        u.searchParams.delete('smart_import')
        window.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash)
      } catch { /* noop */ }
      // Read clipboard + fire import on next tick (after view-state flush).
      setTimeout(async () => {
        let payload = ''
        try {
          payload = await readClipboardSmart()
        } catch { /* permission denied — leave Import view empty */ }
        if (!payload) return
        // Strip iMessage Tapback prefix ("Loved", heart emoji, wrapping
        // smart-quotes) before the regex — old hearted iMessage copies
        // would otherwise hide the URL and skip the smart_import path.
        payload = stripTapbackPrefix(payload)
        // Parse "<URL>\n\n<HTML>" — first line is the URL, blank line, then HTML.
        // Tolerant: accepts URL-only (no separator) and HTML-only (no leading URL).
        // Quote-tolerant: a Tapback often leaves the URL wrapped in
        // smart-quotes ("https://…") even after the verb is stripped,
        // so the URL boundary is `[^\s'"‘’“”`]` — anything-but-whitespace-
        // or-quote — to peel them off cleanly.
        const URL_TOKEN = `(?:['"‘’“”\`]?)(https?:\\/\\/[^\\s'"‘’“”\`]+)(?:['"‘’“”\`]?)`
        const sepMatch = payload.match(new RegExp(`^\\s*${URL_TOKEN}\\s*\\r?\\n\\s*\\r?\\n([\\s\\S]+)$`))
        let smartUrl = ''
        let smartHtml = ''
        if (sepMatch) {
          smartUrl = sepMatch[1].trim()
          smartHtml = sepMatch[2].trim()
        } else if (new RegExp(`^${URL_TOKEN}$`, 'i').test(payload.trim())) {
          smartUrl = payload.trim().replace(/^['"‘’“”`]|['"‘’“”`]$/g, '')
        } else if (payload.trim().length >= 200) {
          // Long blob with no leading URL → treat as HTML/text payload.
          smartHtml = payload.trim()
        }
        if (!smartUrl && !smartHtml) return
        if (smartUrl) setImportUrl(smartUrl)
        handleImport(smartUrl, smartHtml)
      }, 0)
    }
    // (Clipboard auto-jump retired April 2026.) The on-load auto-jump
    // used to read the system clipboard, classify it (URL / URL+HTML /
    // recipe text), and route the user into Import pre-filled. Removed
    // because (a) it triggered iOS's "Paste from <App>?" prompt on every
    // page load — extra friction, especially when the clipboard wasn't
    // even a recipe — and (b) the heuristics misfired on Bill's iOS
    // Shortcut payload, routing to Paste tab and losing the image path.
    // Simple flow now: user taps 📥 Import → URL tab opens empty → user
    // pastes URL → tap Import. If URL fails (B-site), the existing
    // auto-fallback in handleImport switches them to Paste tab with the
    // textarea focused. No more app-side clipboard reading on load.
  }

  // ── openImportFromClipboard() — opens Import view, no clipboard read ──
  // The 📥 Import button(s) call this. It used to read the clipboard
  // and route the user to URL or Paste tab pre-filled, but that
  // (a) triggered the iOS "Paste from <App>?" prompt on every tap and
  // (b) misclassified Bill's iOS Shortcut payload, routing to Paste
  // tab and losing the image. Stripped down to the minimum: open the
  // Import view, default to URL tab, leave the fields empty. User
  // pastes URL themselves — iOS gives them the same Paste prompt at
  // the URL field (where it belongs), and the URL fetch handles the
  // image. If URL fails, handleImport's existing auto-fallback flips
  // them to Paste tab with the textarea focused.
  function openImportFromClipboard() {
    setView('import')
    setImportTab('url')
  }

  // ── pasteFromClipboardToTextarea() — manual fallback button ──
  // The "📋 Paste from clipboard" button on the Paste tab calls this.
  // Reliable fallback for when the auto-route on Import-button-tap
  // didn't fire (iOS denied the read silently, or the user dismissed
  // the system dialog without tapping Paste). Tapping the button is
  // a fresh gesture, so iOS will re-prompt for clipboard access.
  async function pasteFromClipboardToTextarea() {
    try {
      const trimmed = await readClipboardSmart()
      if (!trimmed) {
        showToast('Clipboard looks empty — try copying again')
        return
      }
      setImportText(trimmed)
      showToast('Pasted from clipboard ✓')
      setTimeout(() => importTextRef.current?.focus(), 100)
    } catch {
      showToast("Couldn't read clipboard — long-press the box and tap Paste")
    }
  }

  async function uploadPhoto(file, userId) {
    if (!file) return null
    setUploadingPhoto(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('Please sign in again'); setUploadingPhoto(false); return null }
      const ext = file.name.split('.').pop().toLowerCase()
      const safeName = ext === 'heic' ? 'jpg' : ext
      const path = `${userId}/${Date.now()}.${safeName}`
      const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/personal_recipes/${path}`
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'x-upsert': 'true' },
        body: file,
      })
      if (!response.ok) { const e = await response.text(); alert('Upload failed: ' + e); setUploadingPhoto(false); return null }
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/personal_recipes/${path}`
      setUploadingPhoto(false)
      return publicUrl
    } catch (err) { alert('Upload error: ' + err.message); setUploadingPhoto(false); return null }
  }

  // Take a Blob (from clipboard, drag-drop, or anywhere) and run it
  // through the same uploadPhoto path used for file-picked images, then
  // patch the recipe row. Centralized so the button handler and the
  // paste-event handler both go through the same code path.
  async function attachImageBlobToRecipe(blob, recipeId, userId) {
    if (!blob) return
    const mime = blob.type || 'image/png'
    const ext = (mime.split('/')[1] || 'png').toLowerCase()
    const file = new File([blob], `pasted-${Date.now()}.${ext}`, { type: mime })
    const url = await uploadPhoto(file, userId)
    if (url) {
      await updateRecipe(recipeId, { photo_url: url })
      showToast('Photo added ✓')
    }
  }

  // Async-clipboard read path — used by the visible "📋 Paste image"
  // button. navigator.clipboard.read() is HTTPS-gated and needs a
  // recent user gesture (the tap satisfies it). On failure (no image,
  // permission denied, unsupported browser) we toast and bail rather
  // than throw — this is a "shortcut" feature, not the only path.
  //
  // Diagnostic note: iOS Safari (especially in standalone/PWA mode)
  // sometimes silently rejects `clipboard.read()` even with a tap
  // gesture. We surface the actual error name in the toast so we can
  // tell what's failing without a console.
  async function pasteImageFromClipboard(recipeId) {
    if (!user) {
      showToast('Not signed in — refresh the page')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      showToast('Paste not supported in this browser — use Upload instead')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      // Pass 1 — direct image bytes. Works when the clipboard exposes a
      // proper image MIME type (the desktop / "Copy Photo" path).
      for (const item of items) {
        const imgType = item.types.find(t => t.startsWith('image/'))
        if (imgType) {
          const blob = await item.getType(imgType)
          await attachImageBlobToRecipe(blob, recipeId, user.id)
          return
        }
      }
      // Pass 2 — URL fallback. iOS Safari sometimes exposes only
      // `text/uri-list` or `text/plain` even when a real image is on
      // the clipboard (e.g. after long-press → Copy on a webpage
      // image). If the text looks like an http(s) URL, fetch it and
      // see if the response is an image.
      for (const item of items) {
        const textType = item.types.find(t => t === 'text/uri-list' || t === 'text/plain')
        if (!textType) continue
        try {
          const textBlob = await item.getType(textType)
          const text = (await textBlob.text()).trim().split(/\r?\n/)[0]
          if (!/^https?:\/\/\S+$/i.test(text)) continue
          const res = await fetch(text)
          const ct = res.headers.get('content-type') || ''
          if (ct.startsWith('image/')) {
            const imgBlob = await res.blob()
            await attachImageBlobToRecipe(imgBlob, recipeId, user.id)
            return
          }
        } catch { /* try next item */ }
      }
      // Both passes missed — iOS Photos and some Windows clipboard
      // sources put images on the clipboard in formats that
      // navigator.clipboard.read() can't see (even though pasting
      // into Notes / a textarea works). Fall back to the manual
      // paste-target modal — the synchronous paste-event handler has
      // access to formats the async API hides.
      setPasteTarget(recipeId)
    } catch {
      // Any clipboard.read() failure — permission denied, NotReadable,
      // DataError, AbortError, format mismatch, iOS PWA quirks, etc. —
      // falls through to the manual paste-target modal. The modal uses
      // a synchronous `paste` event handler that doesn't need
      // clipboard.read() permission; the user's long-press → Paste
      // there bypasses every variant of the async-API failure. Used
      // to whitelist three specific error names; that left other
      // errors (like NotReadableError on iOS Safari) showing a dead-
      // end "Clipboard <Error>" toast instead of opening the working
      // fallback. Every clipboard error is now treated the same way.
      setPasteTarget(recipeId)
    }
  }

  async function saveRecipe() {
    if (!form.title.trim()) return
    // Preference order: a newly-picked file → the scraped/imported URL → none.
    let photo_url = ''
    if (selectedPhoto) photo_url = await uploadPhoto(selectedPhoto, user.id) || ''
    else if (form.photo_url) photo_url = form.photo_url
    // Same "Measure - Name" parser as EditForm: split on the first ' - '.
    // If only one segment, treat it as the ingredient name with no measure.
    const ingredients = form.ingredients.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const sep = line.indexOf(' - ')
      if (sep === -1) return { name: line, measure: '' }
      return {
        measure: line.slice(0, sep).trim(),
        name: line.slice(sep + 3).trim(),
      }
    })
    const { data, error } = await supabase.from('personal_recipes').insert({
      user_id: user.id, title: form.title, description: form.description,
      ingredients, instructions: form.instructions, category: form.category,
      tags: form.tags, family_notes: form.family_notes, photo_url,
      // Structured fields land iff the import set them. Spreading nulls
      // is fine — the DB columns are nullable.
      prep_time_minutes: form.prep_time_minutes,
      cook_time_minutes: form.cook_time_minutes,
      total_time_minutes: form.total_time_minutes,
      calories: form.calories,
      protein_g: form.protein_g,
      carbs_g: form.carbs_g,
      fat_g: form.fat_g,
    }).select().single()
    if (!error && data) {
      setRecipes(prev => [data, ...prev])
      setForm({
        title: '', description: '', ingredients: '', instructions: '',
        category: '', tags: [], family_notes: '', photo_url: '',
        prep_time_minutes: null, cook_time_minutes: null, total_time_minutes: null,
        calories: null, protein_g: null, carbs_g: null, fat_g: null,
      })
      setView('list')
    }
  }

  async function updateRecipe(id, updates) {
    const { data, error } = await supabase.from('personal_recipes').update(updates).eq('id', id).select().single()
    if (error) { console.error('Update error:', error.message); return null }
    if (data) {
      setRecipes(prev => prev.map(r => r.id === id ? {...r, ...data} : r))
      setViewing({...data})
      setShowVideo(true)
    }
    return data
  }

  // Delete a recipe from the Vault. Soft-delete (May 2026, migration 020):
  // sets `deleted_at = now()` instead of hard-deleting the row. The
  // recipe disappears from the main list (loadRecipes filters
  // `deleted_at IS NULL`) but stays recoverable for 30 days via the
  // Settings → 🗑 Recently Deleted view. Auto-purge in loadRecipes
  // hard-deletes anything older than that window. This protects the
  // user's modifications — once a Vault recipe carries personal tweaks
  // (adjusted ingredients, family notes, cook-log entries), it's no
  // longer just an AI suggestion and a hard-delete would lose real
  // work. Mirrors iOS Notes / Gmail Trash.
  //
  // We do NOT un-set is_in_vault on the source Chef Jennifer favorite
  // — the MOVE semantics (Vault → permanent) still apply. If the user
  // wants the original AI version back, they Restore from Recently
  // Deleted (preferred — keeps modifications) or ask Chef Jen again
  // (loses modifications).
  async function deleteRecipe(recipeOrId) {
    const recipe = typeof recipeOrId === 'object' ? recipeOrId : recipes.find(r => r.id === recipeOrId)
    const id = recipe?.id || recipeOrId
    if (!id) return
    await supabase
      .from('personal_recipes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    setView('list'); setViewing(null)
    showToast('Moved to Recently Deleted — recoverable for 30 days')
  }

  // Hard delete + restore for the Settings → Recently Deleted surface.
  // restoreRecipe clears `deleted_at` so the recipe reappears in the
  // main Vault list. purgeRecipe does the real DELETE — gone forever.
  async function restoreRecipe(id) {
    if (!user || !id) return
    const { error } = await supabase
      .from('personal_recipes')
      .update({ deleted_at: null })
      .eq('id', id)
    if (error) { showToast('Could not restore'); return }
    setTrashRecipes(prev => prev.filter(r => r.id !== id))
    // Refresh the main list so the restored recipe shows up next time
    // the user goes back to the Vault.
    if (user) loadRecipes(user.id)
    showToast('Restored to Recipe Vault ✓')
  }

  async function purgeRecipe(id) {
    if (!user || !id) return
    if (!window.confirm('Delete this recipe forever? This cannot be undone.')) return
    const { error } = await supabase.from('personal_recipes').delete().eq('id', id)
    if (error) { showToast('Could not delete'); return }
    setTrashRecipes(prev => prev.filter(r => r.id !== id))
    showToast('Deleted forever')
  }

  // Toggle ❤️ favorite on a recipe — used by the detail-view header
  // button and the heart icons on list / grid rows. Optimistic: flips
  // local state immediately, then persists. We deliberately don't
  // touch `showVideo` or call updateRecipe() so this never disturbs
  // the player state when toggled from the detail view.
  async function toggleFavorite(recipe) {
    if (!recipe || !user) return
    const next = !recipe.is_favorite
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: next } : r))
    if (viewing?.id === recipe.id) setViewing(prev => prev ? { ...prev, is_favorite: next } : prev)
    showToast(next ? 'Added to Favorites ❤️' : 'Removed from Favorites')
    const { error } = await supabase.from('personal_recipes').update({ is_favorite: next }).eq('id', recipe.id)
    if (error) {
      // Revert on failure so the heart doesn't lie about the DB state.
      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !next } : r))
      if (viewing?.id === recipe.id) setViewing(prev => prev ? { ...prev, is_favorite: !next } : prev)
      showToast('Could not save favorite — try again')
    }
  }

  async function handleEnhance(action) {
    setEnhancing(true); setEnhanceResult(null); setGeneratedInfo(null)
    try {
      const res = await fetch('/api/enhance-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: viewing, action, servings })
      })
      const data = await res.json()
      if (action === 'generate_info') setGeneratedInfo(data)
      else setEnhanceResult(data)
    } catch (err) { console.error(err) }
    setEnhancing(false)
  }

  async function applyEnhancement() {
    if (!enhanceResult) return
    const updates = {}
    if (enhanceResult.ingredients) updates.ingredients = enhanceResult.ingredients

    // Preserve any Watch video: line from original instructions
    const existingLines = (viewing.instructions || '').split('\n')
    const watchLine = existingLines.find(s => s.startsWith('Watch video:'))

    if (enhanceResult.instructions) {
      // Re-attach the video link at the top if it existed
      updates.instructions = watchLine
        ? `${watchLine}\n${enhanceResult.instructions}`
        : enhanceResult.instructions
    }

    // If this was a resize, also regenerate nutrition for the new serving count
    if (enhanceResult.ingredients && !enhanceResult.instructions) {
      setEnhancing(true)
      try {
        const recipeForInfo = { ...viewing, ingredients: enhanceResult.ingredients, servings }
        const res = await fetch('/api/enhance-recipe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipe: recipeForInfo, action: 'generate_info', servings })
        })
        const info = await res.json()
        if (info.cooking_time) updates.cooking_time = info.cooking_time
        if (info.prep_time) updates.prep_time = info.prep_time
        if (info.difficulty) updates.difficulty = info.difficulty
        if (info.equipment) updates.equipment = info.equipment
        if (info.nutrition_estimate) updates.nutrition = info.nutrition_estimate
        updates.servings = servings
      } catch (err) { console.error('Auto generate_info failed:', err) }
      setEnhancing(false)
    }

    await updateRecipe(viewing.id, updates)
    setEnhanceResult(null); setGeneratedInfo(null); setView('detail')
    // Toast speaks AS Chef Jen, not about her. She just did the work —
    // so the message is her handing it back. Polish + Resize both go
    // through here; distinguish by whether the result included new
    // instructions text (Polish does, Resize doesn't).
    const wasPolish = !!enhanceResult.instructions
    showToast(wasPolish ? 'Cleaned it up — take a look ✓' : `Resized for ${servings} — take a look ✓`)
  }

  async function applyInfo() {
    if (!generatedInfo) return
    const updates = {}
    if (generatedInfo.cooking_time) updates.cooking_time = generatedInfo.cooking_time
    if (generatedInfo.prep_time) updates.prep_time = generatedInfo.prep_time
    if (generatedInfo.difficulty) updates.difficulty = generatedInfo.difficulty
    if (generatedInfo.servings) updates.servings = generatedInfo.servings
    if (generatedInfo.equipment) updates.equipment = generatedInfo.equipment
    if (generatedInfo.nutrition_estimate) updates.nutrition = generatedInfo.nutrition_estimate
    await updateRecipe(viewing.id, updates)
    setGeneratedInfo(null); setEnhanceResult(null); setView('detail')
    showToast('Filled in the details ✓')
  }

  // ── "Make This Recipe More..." ──
  function toggleTransformPref(value) {
    setTransformPrefs(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  async function handleTransform() {
    if (!viewing || transformPrefs.length === 0) return
    setTransforming(true); setTransformResult(null)
    try {
      const res = await fetch('/api/enhance-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: viewing, action: 'transform', preferences: transformPrefs })
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setTransforming(false); return }
      setTransformResult(data)
    } catch (err) { console.error('transform error:', err) }
    setTransforming(false)
  }

  function discardTransform() {
    setTransformResult(null)
    setTransformPrefs([])
  }

  async function saveTransformAsNew() {
    if (!transformResult || !user || !viewing) return
    const originalTitle = viewing.title
    const newTitle = transformResult.title && transformResult.title !== originalTitle
      ? transformResult.title
      : `${originalTitle} (adjusted)`
    const prefLabels = transformPrefs
      .map(v => PREFERENCE_OPTIONS.find(o => o.value === v)?.label)
      .filter(Boolean)
      .join(', ')
    const noteLine = `Transformed from "${originalTitle}" — made more ${prefLabels}.`
    const family_notes = viewing.family_notes
      ? `${noteLine}\n\n${viewing.family_notes}`
      : noteLine

    const { data, error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: newTitle,
      description: transformResult.description || viewing.description || '',
      ingredients: transformResult.ingredients || [],
      instructions: transformResult.instructions || '',
      category: viewing.category || '',
      tags: viewing.tags || [],
      family_notes,
      photo_url: viewing.photo_url || '',
      servings: viewing.servings || null,
    }).select().single()
    if (error) { alert('Save failed: ' + error.message); return }
    if (data) {
      setRecipes(prev => [data, ...prev])
      setTransformResult(null)
      setTransformPrefs([])
      setViewing(data)
      setView('detail')
      showToast('Saved the adjusted version for you ✓')
    }
  }

  async function replaceWithTransform() {
    if (!transformResult || !viewing) return
    const ok = window.confirm('Replace this recipe with the transformed version? The original ingredients and instructions will be overwritten.')
    if (!ok) return
    const updates = {}
    if (transformResult.title) updates.title = transformResult.title
    if (transformResult.description) updates.description = transformResult.description
    if (transformResult.ingredients) updates.ingredients = transformResult.ingredients
    if (transformResult.instructions) updates.instructions = transformResult.instructions
    await updateRecipe(viewing.id, updates)
    setTransformResult(null)
    setTransformPrefs([])
    setView('detail')
    showToast('Replaced with the adjusted version ✓')
  }

  // Optional `urlOverride` lets the auto-import-on-paste flows fire
  // handleImport without having to wait for the setImportUrl state
  // update to flush — pasting a URL via "Use it" / 📋 Paste / direct
  // input paste sets the field AND immediately starts the import in
  // the same handler, so the user doesn't have to tap "Import" too.
  //
  // Optional `htmlOverride` is the iOS Share-Sheet Shortcut path: the
  // Shortcut sends BOTH the URL and the page HTML so the API can fall
  // back to the HTML payload when its own server-side fetch is blocked
  // (Cloudflare, paywall, login wall). The caller sets it; the server
  // decides which to use. Today only the smart_import handler in
  // loadRecipes passes this; all other call sites omit it.
  async function handleImport(urlOverride, htmlOverride) {
    // Strip iMessage Tapback prefixes ("Loved", "❤️", quotes) from any
    // user-supplied URL/text before parsing — old hearted iMessage
    // copies otherwise hide the URL behind a verb + quote pair and the
    // smart-paste regex would miss it.
    let urlToUse = stripTapbackPrefix((typeof urlOverride === 'string' ? urlOverride : importUrl).trim())
    let textToUse = stripTapbackPrefix(importText.trim())
    let htmlToUse = (typeof htmlOverride === 'string' ? htmlOverride : '').trim()
    // Smart paste: if the Paste textarea holds a "<URL>\n\n<HTML>" payload
    // (typical iOS Share-Sheet Shortcut clipboard contents, dropped in via
    // long-press → Paste), split it so the server sees both the URL (for
    // canonical og:image + content extraction) and the HTML (as a B-site
    // fallback when the server-side fetch is blocked). Without this branch
    // the whole blob gets sent as `text` — which works for content but
    // loses the image. Only fires when the caller didn't already supply
    // url/html overrides, so smart_import + URL-tab paths are unaffected.
    if (!urlToUse && !htmlToUse && textToUse) {
      // Quote-tolerant URL boundary so a residual Tapback smart-quote
      // wrap ("https://…") still parses as a URL — see the smart_import
      // handler comment for why.
      const URL_TOKEN = `(?:['"‘’“”\`]?)(https?:\\/\\/[^\\s'"‘’“”\`]+)(?:['"‘’“”\`]?)`
      const sepMatch = textToUse.match(new RegExp(`^\\s*${URL_TOKEN}\\s*\\r?\\n\\s*\\r?\\n([\\s\\S]+)$`))
      if (sepMatch) {
        urlToUse = sepMatch[1].trim()
        htmlToUse = sepMatch[2].trim()
        textToUse = ''
      }
    }
    if (!textToUse && !urlToUse && !htmlToUse) return
    if (urlOverride && urlToUse) setImportUrl(urlToUse)
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToUse, url: urlToUse, html: htmlToUse })
      })
      const data = await res.json()
      if (data.error) {
        setImportError(data.error)
        setImporting(false)
        // If the URL attempt failed, clear the URL field so the user
        // isn't left staring at a bad link, flip to the Paste tab, and
        // focus the textarea — paste is a first-class fallback, not a
        // dead end. Focus runs in setTimeout because the textarea is
        // conditionally rendered (only mounts when the tab is 'paste').
        const wasUrlAttempt = urlToUse && !textToUse
        if (wasUrlAttempt) {
          setImportUrl('')
          setImportTab('paste')
          setTimeout(() => importTextRef.current?.focus(), 100)
        }
        return
      }
      // Render scraped ingredients into the Add form textarea in
      // "Measure - Name" order so it matches the edit form and the
      // on-screen display. If measure is empty, show just the name.
      const ingredientsText = (data.ingredients || []).map(i => {
        const m = (i?.measure || '').trim()
        const n = (i?.name || '').trim()
        if (!m) return n
        if (!n) return m
        return `${m} - ${n}`
      }).join('\n')
      setForm({ title: data.title || '', description: data.description || '', ingredients: ingredientsText,
        instructions: data.instructions || '', category: data.category || '', tags: data.tags || [],
        family_notes: data.family_notes || '', photo_url: data.image || '',
        // Carry through any structured fields the API extracted from
        // JSON-LD. Missing fields stay null so the save path skips them.
        prep_time_minutes: data.prep_time_minutes ?? null,
        cook_time_minutes: data.cook_time_minutes ?? null,
        total_time_minutes: data.total_time_minutes ?? null,
        calories: data.calories ?? null,
        protein_g: data.protein_g ?? null,
        carbs_g: data.carbs_g ?? null,
        fat_g: data.fat_g ?? null,
      })
      setImportText(''); setImportUrl(''); setImportTab('add')
      // Toast speaks AS Chef Jen, not about her — she's handing the
      // imported recipe back to the user. Fires AFTER the form is
      // pre-filled so the user sees the recipe arrive + her note in
      // the same beat.
      showToast('Got it — review and save when you’re ready ✓')
    } catch (err) { console.error(err) }
    setImporting(false)
  }

  const filtered = recipes.filter(r => {
    const matchSearch = searchText === '' || r.title.toLowerCase().includes(searchText.toLowerCase())
    // searchTag can be '' (all), a specific tag, or one of two sentinels:
    //   '__favorites__' — only ❤️ favorited recipes
    //   '__custom__'    — any recipe with a non-curated tag (the dropdown's
    //                     collapsed view of every custom tag at once)
    const matchTag =
      searchTag === ''
        ? true
        : searchTag === '__favorites__'
          ? !!r.is_favorite
          : searchTag === '__custom__'
            ? (r.tags || []).some(t => !CURATED_TAGS.includes(t))
            : (r.tags || []).includes(searchTag)
    return matchSearch && matchTag
  })

  const favoritesCount = recipes.filter(r => r.is_favorite).length

  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))]
  // Custom tags the user has used anywhere — feeds TagSelector so the
  // user can reuse them on a new recipe without retyping. Sorted in
  // the component; the unsorted union is fine here.
  const libraryCustomTags = allTags.filter(t => !CURATED_TAGS.includes(t))

  // ── DETAIL VIEW ──
  if (view === 'detail' && viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)
    const isVideoEntry = viewing.category === 'Video Reference' || viewing.category === 'From Video' || viewing.category === 'Recipe Videos'
    const youtubeIdMatch = (viewing.family_notes || '').match(/youtube_id:([^|]+)/)
    const youtubeId = youtubeIdMatch ? youtubeIdMatch[1] : null
    const channelMatch = (viewing.family_notes || '').match(/channel:([^|]+)/)
    const videoChannel = channelMatch ? channelMatch[1] : null
    // Extract video URL from instructions "Watch video: <url>"
    const watchLine = instructions.find(s => s.startsWith('Watch video:'))
    const watchUrl = watchLine ? watchLine.replace('Watch video:', '').trim() : null
    // Detect video type from watchUrl or from stored youtubeId
    const ytMatch = watchUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    const resolvedYoutubeId = youtubeId || (ytMatch ? ytMatch[1] : null)
    const isMp4 = watchUrl && !resolvedYoutubeId && (watchUrl.match(/\.(mp4|mov|webm|m4v)/i) || watchUrl.includes('s3.amazonaws.com'))
    const isTikTok = watchUrl && watchUrl.includes('tiktok.com')
    const nonVideoInstructions = instructions.filter(s => !s.startsWith('Watch video:'))

    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setView('list'); setViewing(null); setEnhanceResult(null); setGeneratedInfo(null) }}
              className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            {/* Detail-view action cluster — text-only labels (May 2026).
                Heart kept as an icon because ❤️ vs 🤍 communicates state
                at a glance better than any word. All other buttons drop
                the leading emoji and tighten padding (px-2.5 py-1) so
                six buttons fit a phone without wrapping. */}
            <div className="flex gap-1.5">
              <button onClick={() => setView('edit')}
                className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1">Edit</button>
              <button onClick={() => setView('enhance')}
                className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-2.5 py-1">Chef Jen</button>
              <button onClick={() => toggleFavorite(viewing)}
                title={viewing.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                className={`text-sm font-semibold border rounded-lg px-2 py-1 transition-colors leading-none ${
                  viewing.is_favorite ? 'bg-rose-500 text-white border-rose-500' : 'text-rose-500 border-rose-200 hover:bg-rose-50'}`}>
                {viewing.is_favorite ? '❤️' : '🤍'}
              </button>
              <button onClick={() => toggleCardPin(viewing.id)}
                title={pinnedCards.includes(viewing.id) ? 'Pinned to Cards — tap to remove' : 'Pin to Cards'}
                className={`text-xs font-semibold border rounded-lg px-2.5 py-1 transition-colors ${
                  pinnedCards.includes(viewing.id) ? 'bg-orange-600 text-white border-orange-600' : 'text-gray-500 border-gray-200'}`}>
                Cards
              </button>
              <button onClick={async () => {
                if (picksIds.includes(viewing.id)) {
                  await supabase.from('my_picks').delete().eq('user_id', user.id).eq('recipe_id', viewing.id)
                  setPicksIds(prev => prev.filter(id => id !== viewing.id))
                  showToast('Removed from Meal Plan')
                } else {
                  await supabase.from('my_picks').upsert({ user_id: user.id, recipe_id: viewing.id, title: viewing.title, photo_url: viewing.photo_url || '', category: viewing.category || '', bucket: 'nice' }, { onConflict: 'user_id,recipe_id' })
                  setPicksIds(prev => prev.includes(viewing.id) ? prev : [...prev, viewing.id])
                  showToast('Added to Maybe ✓')
                }
              }}
                title={picksIds.includes(viewing.id) ? 'In Meal Plan — tap to remove' : 'Add to Meal Plan'}
                className={`text-xs font-semibold border rounded-lg px-2.5 py-1 transition-colors ${picksIds.includes(viewing.id) ? 'bg-orange-600 text-white border-orange-600' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}>
                Meal Plan
              </button>
              <button onClick={() => deleteRecipe(viewing)}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2.5 py-1">Delete</button>
            </div>
          </div>
        </header>

        {/* HERO — photo (if any) or gradient fallback, with title overlay.
            Edge-to-edge on mobile; caps at max-w-2xl on desktop so it doesn't
            stretch across a wide monitor. */}
        <div className="relative w-full max-w-2xl mx-auto h-40 sm:h-52 md:h-64">
          {viewing.photo_url ? (
            <img loading="lazy" decoding="async" src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 via-orange-50 to-amber-100 flex items-center justify-center cursor-pointer hover:brightness-95 transition-all"
              onClick={() => photoInputRef.current?.click()}
              title="Tap to add a photo"
            >
              <span className="text-5xl sm:text-6xl md:text-7xl opacity-60">{categoryEmoji(viewing)}</span>
            </div>
          )}
          {/* Single hidden file input shared by every "upload photo"
              affordance on this view (gradient click, 📁 Upload pill,
              📷 Change pill). Renders once, regardless of state. */}
          <input ref={photoInputRef} type="file" accept="image/*,.heic" className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return
              const url = await uploadPhoto(file, user.id)
              if (url) await updateRecipe(viewing.id, { photo_url: url })
              e.target.value = ''
            }} />
          {/* Dark gradient so the title reads on any photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />
          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="max-w-2xl mx-auto px-4 pb-3 sm:pb-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-lg line-clamp-2">{viewing.title}</h1>
              {viewing.description && (
                <p className="text-xs sm:text-sm text-white/90 mt-1 line-clamp-3 drop-shadow">{viewing.description}</p>
              )}
            </div>
          </div>
          {/* Photo affordances (top-right). Layout differs by state:
              • No photo → 📁 Upload + 📋 Paste image pills, both visible
                so users see two ways to add a picture (file picker or
                clipboard). Cmd/Ctrl+V also works via the document-level
                paste listener.
              • Photo set → 📷 Change + 📋 Paste pills so the user can
                swap it via either path.
              All buttons stop propagation so they don't also trigger
              the gradient's tap-to-upload click. While a paste/upload
              is in flight, both pills disable. */}
          <div className="absolute top-3 right-3 flex gap-1.5">
            {!viewing.photo_url && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click() }}
                disabled={uploadingPhoto}
                title="Upload from device"
                className="bg-white/90 hover:bg-white disabled:opacity-60 text-gray-700 text-xs font-semibold rounded-full px-3 py-1.5 shadow-sm"
              >
                📁 Upload
              </button>
            )}
            {viewing.photo_url && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click() }}
                disabled={uploadingPhoto}
                title="Change photo"
                className="bg-white/90 hover:bg-white disabled:opacity-60 text-gray-700 text-xs font-semibold rounded-full px-3 py-1.5 shadow-sm"
              >
                📷 Change
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pasteImageFromClipboard(viewing.id) }}
              disabled={uploadingPhoto}
              title="Paste image from clipboard (or just press ⌘/Ctrl+V)"
              className="bg-white/90 hover:bg-white disabled:opacity-60 text-gray-700 text-xs font-semibold rounded-full px-3 py-1.5 shadow-sm"
            >
              {uploadingPhoto ? '⏳ …' : (viewing.photo_url ? '📋 Paste' : '📋 Paste image')}
            </button>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">

          {(viewing.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {viewing.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">#{tag}</span>
              ))}
            </div>
          )}

          {/* Pill row under the title — at-a-glance timing + nutrition.
              Each pill renders only when its source field is populated.
              Structured fields (prep_time_minutes, calories, etc.) are
              the May 2026 JSON-LD-import additions; legacy text fields
              (prep_time, cooking_time, nutrition.calories) are kept for
              older Vault entries. The new fields are formatted with a
              "m" / "g" / "cal" suffix; legacy strings render as-is. */}
          {(() => {
            const prepMin = viewing.prep_time_minutes
            const cookMin = viewing.cook_time_minutes
            const totalMin = viewing.total_time_minutes
            const cal = viewing.calories ?? viewing.nutrition?.calories
            const pro = viewing.protein_g ?? viewing.nutrition?.protein
            return (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {viewing.category && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.category}</span>}
                {viewing.difficulty && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.difficulty}</span>}
                {prepMin != null
                  ? <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs">🔪 {prepMin}m prep</span>
                  : viewing.prep_time && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">🔪 {viewing.prep_time}</span>}
                {cookMin != null
                  ? <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs">⏱ {cookMin}m cook</span>
                  : viewing.cooking_time && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">⏱ {viewing.cooking_time}</span>}
                {totalMin != null && <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs">⏲ {totalMin}m total</span>}
                {cal != null && <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">{cal} cal</span>}
                {pro != null && <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">{pro}g protein</span>}
              </div>
            )
          })()}

          {(viewing.cooking_time || viewing.prep_time || viewing.difficulty || viewing.equipment?.length > 0 || viewing.nutrition || viewing.prep_time_minutes != null || viewing.cook_time_minutes != null || viewing.total_time_minutes != null || viewing.calories != null || viewing.protein_g != null || viewing.carbs_g != null || viewing.fat_g != null) && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-5">
              <button
                type="button"
                onClick={() => toggleDetailSection('info')}
                title={detailCollapsed.info ? 'Expand Recipe Info' : 'Collapse Recipe Info'}
                className="w-full flex items-center justify-between text-left mb-3"
              >
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">📊 Recipe Info</p>
                <span className="text-orange-600 text-sm">{detailCollapsed.info ? '▶' : '▼'}</span>
              </button>
              {!detailCollapsed.info && (<>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {(viewing.prep_time_minutes != null || viewing.prep_time) && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">🔪</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.prep_time_minutes != null ? `${viewing.prep_time_minutes} min` : viewing.prep_time}</p>
                    <p className="text-xs text-gray-500">Prep Time</p>
                  </div>
                )}
                {(viewing.cook_time_minutes != null || viewing.cooking_time) && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">⏱</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.cook_time_minutes != null ? `${viewing.cook_time_minutes} min` : viewing.cooking_time}</p>
                    <p className="text-xs text-gray-500">Cook Time</p>
                  </div>
                )}
                {viewing.total_time_minutes != null && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">⏲</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.total_time_minutes} min</p>
                    <p className="text-xs text-gray-500">Total Time</p>
                  </div>
                )}
                {viewing.difficulty && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">📊</p>
                    <p className="text-xs font-bold text-gray-900 mt-1 capitalize">{viewing.difficulty}</p>
                    <p className="text-xs text-gray-500">Difficulty</p>
                  </div>
                )}
                {viewing.servings && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">👥</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.servings} servings</p>
                    <p className="text-xs text-gray-500">Serves</p>
                  </div>
                )}
              </div>
              {viewing.equipment?.length > 0 && (
                <div className="bg-white rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1">🍳 Equipment</p>
                  <p className="text-sm text-gray-700">{viewing.equipment.join(', ')}</p>
                </div>
              )}
              {(() => {
                // Prefer the new flat columns (May 2026 JSON-LD import).
                // Fall back to the legacy nested `viewing.nutrition` object
                // for older Vault rows that came in via the previous path.
                const nutr = {
                  calories: viewing.calories ?? viewing.nutrition?.calories,
                  protein: viewing.protein_g ?? viewing.nutrition?.protein,
                  carbs: viewing.carbs_g ?? viewing.nutrition?.carbs,
                  fat: viewing.fat_g ?? viewing.nutrition?.fat,
                }
                const hasAny = Object.values(nutr).some(v => v != null && v !== '')
                if (!hasAny) return null
                return (
                  <div className="bg-white rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Nutrition per serving</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: 'calories', label: 'cal', value: nutr.calories, suffix: '' },
                        { key: 'protein', label: 'protein', value: nutr.protein, suffix: 'g' },
                        { key: 'carbs', label: 'carbs', value: nutr.carbs, suffix: 'g' },
                        { key: 'fat', label: 'fat', value: nutr.fat, suffix: 'g' },
                      ].map(({ key, label, value, suffix }) => value != null && value !== '' && (
                        <div key={key} className="text-center">
                          <p className="text-xs font-bold text-orange-600">{value}{typeof value === 'number' && suffix ? suffix : ''}</p>
                          <p className="text-xs text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              </>)}
            </div>
          )}

          {/* Creator credit — promotes the "Saved from Chef TV — {channel}."
              line in family_notes to a visible link back to the creator's
              YouTube channel. Retroactive: lights up every recipe the user
              already pulled from Chef TV without any schema change. Clicking
              sends traffic to the channel, which is the whole point — the
              creator still captures the value from their own work. */}
          {(() => {
            const credit = parseChefTVCredit(viewing.family_notes)
            if (!credit) return null
            return (
              <div className="mb-5">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(credit.channel)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Visit ${credit.channel}'s channel on YouTube`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 hover:bg-orange-100 transition-colors"
                >
                  🎬 Recipe from <span className="underline">{credit.channel}</span> on YouTube ↗
                </a>
              </div>
            )
          })()}

          {viewing.family_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <button
                type="button"
                onClick={() => toggleDetailSection('notes')}
                title={detailCollapsed.notes ? 'Expand Notes' : 'Collapse Notes'}
                className="w-full flex items-center justify-between text-left"
              >
                <p className="text-xs font-semibold text-amber-800">📝 Notes</p>
                <span className="text-amber-700 text-sm">{detailCollapsed.notes ? '▶' : '▼'}</span>
              </button>
              {!detailCollapsed.notes && (
                <p className="text-sm text-amber-900 mt-2">{viewing.family_notes}</p>
              )}
            </div>
          )}

          {ingredients.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 gap-2">
                <button
                  type="button"
                  onClick={() => toggleDetailSection('ingredients')}
                  title={detailCollapsed.ingredients ? 'Expand Ingredients' : 'Collapse Ingredients'}
                  className="flex items-center gap-2 text-left"
                >
                  <h2 className="text-lg font-bold text-gray-900">Ingredients</h2>
                  <span className="text-gray-500 text-sm">{detailCollapsed.ingredients ? '▶' : '▼'}</span>
                </button>
                <button onClick={addAllToShoppingList} className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50">🛒 Add All</button>
              </div>
              {!detailCollapsed.ingredients && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <ul className="space-y-2">
                    {ingredients.map((ing, i) => {
                      const key = [ing.measure, ing.name].filter(Boolean).join(' ').toLowerCase()
                      return (
                        <li key={i} className="flex items-center gap-3 text-sm">
                          <span className="text-orange-400">•</span>
                          <span className="flex-1 text-gray-600">
                            {ing.measure && <span className="font-semibold text-gray-800">{ing.measure} </span>}
                            {ing.name}
                          </span>
                          <button onClick={() => addToShoppingList(ing)}
                            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${addedToList.has(key) ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}>
                            {addedToList.has(key) ? '✓' : '+'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {nonVideoInstructions.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => toggleDetailSection('instructions')}
                title={detailCollapsed.instructions ? 'Expand Instructions' : 'Collapse Instructions'}
                className="w-full flex items-center justify-between text-left mb-3"
              >
                <h2 className="text-lg font-bold text-gray-900">Instructions</h2>
                <span className="text-gray-500 text-sm">{detailCollapsed.instructions ? '▶' : '▼'}</span>
              </button>
              {!detailCollapsed.instructions && (
                <div className="space-y-4">
                  {nonVideoInstructions.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                      <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── EDIT VIEW ──
  if (view === 'edit' && viewing) {
    // Edit textarea uses "Measure - Name" order so it matches the on-screen
    // display convention. If measure is empty, show just the name (no dash).
    const editIngredients = (viewing.ingredients || []).map(i => {
      const m = (i?.measure || '').trim()
      const n = (i?.name || '').trim()
      if (!m) return n
      if (!n) return m
      return `${m} - ${n}`
    }).join('\n')
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('detail')} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">✏️ Edit Recipe</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <EditForm initial={viewing} initialIngredients={editIngredients}
            photoUrl={viewing.photo_url || ''}
            uploadingPhoto={uploadingPhoto}
            libraryCustomTags={libraryCustomTags}
            onUploadImage={(file) => attachImageBlobToRecipe(file, viewing.id, user.id)}
            onPasteImage={() => pasteImageFromClipboard(viewing.id)}
            onSave={async (updates) => { await updateRecipe(viewing.id, updates); setView('detail') }}
            onCancel={() => setView('detail')} />
        </main>
      </div>
    )
  }

  // ── ENHANCE VIEW ──
  if (view === 'enhance' && viewing) {
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => { setView('detail'); setEnhanceResult(null); setGeneratedInfo(null); setTransformResult(null); setTransformPrefs([]) }}
              className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">✨ Chef Jen Kitchen Helpers</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-5">
          {/* Intro card */}
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Helping with</p>
            <p className="text-lg font-bold text-gray-900 leading-snug">{viewing.title}</p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Four cozy ways to tune up this recipe. Pick one below — nothing saves until you tap the green button in each card, so feel free to experiment.
            </p>
          </div>

          {/* Tab strip — four helpers, one at a time. Matches the Import
              Recipes pattern: only one is used per visit, so stacking
              them all on the page made it long and busy. Active tab fills
              with orange; inactive tabs are gray. 2-column grid on phones
              so the labels don't truncate. */}
          {/* Tab strip — four helpers, one at a time. Text-only labels
              (May 2026 — emojis dropped, the tab name says enough and the
              row gets tighter). 4-column grid so the four short labels
              fit one row on a phone without stacking. */}
          <div className="grid grid-cols-4 gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'polish', label: 'Polish' },
              { key: 'resize', label: 'Resize' },
              { key: 'info', label: 'Details' },
              { key: 'transform', label: 'Adjust' },
            ].map(t => {
              const active = helperTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setHelperTab(t.key)}
                  className={
                    active
                      ? 'py-1.5 rounded-lg text-sm font-semibold bg-orange-600 text-white shadow-sm'
                      : 'py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:text-gray-800'
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* 🧹 Polish Recipe — ORANGE */}
          {helperTab === 'polish' && (
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-2xl">🧹</span>
              <div>
                <p className="font-bold text-gray-900">Polish this recipe</p>
                <p className="text-xs text-gray-600 mt-0.5">Chef Jen tidies up your steps, fixes the wording, and makes instructions easier to follow.</p>
              </div>
            </div>
            <button onClick={() => handleEnhance('enhance')} disabled={enhancing}
              className="mt-3 w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-opacity">
              {enhancing ? 'Polishing…' : '🧹 Polish my recipe'}
            </button>
            {enhanceResult?.instructions && (
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-orange-300">
                <p className="text-xs font-semibold text-orange-700 mb-2">✨ Preview the polished version</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{enhanceResult.instructions}</p>
                <button onClick={applyEnhancement} className="mt-4 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">
                  ✓ Apply these changes
                </button>
              </div>
            )}
          </div>
          )}

          {/* ⚖️ Resize Servings — SKY */}
          {helperTab === 'resize' && (
          <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-2xl">⚖️</span>
              <div>
                <p className="font-bold text-gray-900">Resize for a different crowd</p>
                <p className="text-xs text-gray-600 mt-0.5">Scale ingredients up or down to match how many you are cooking for.</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between bg-white rounded-xl border border-sky-100 px-4 py-3">
                <label className="text-sm text-gray-600">Currently makes</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateRecipe(viewing.id, { servings: Math.max(1, (viewing.servings || 4) - 1) })}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200">−</button>
                  <span className="text-base font-semibold w-6 text-center">{viewing.servings || 4}</span>
                  <button onClick={() => updateRecipe(viewing.id, { servings: (viewing.servings || 4) + 1 })}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center hover:bg-gray-200">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white rounded-xl border border-sky-200 px-4 py-3">
                <label className="text-sm text-sky-700 font-semibold">Resize to</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(s => Math.max(1, s - 1))}
                    className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-lg flex items-center justify-center hover:bg-sky-200">−</button>
                  <span className="text-base font-semibold text-sky-700 w-6 text-center">{servings}</span>
                  <button onClick={() => setServings(s => s + 1)}
                    className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-lg flex items-center justify-center hover:bg-sky-200">+</button>
                </div>
              </div>
            </div>
            <button onClick={() => handleEnhance('resize')} disabled={enhancing}
              className="mt-3 w-full py-3 bg-sky-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-opacity">
              {enhancing ? 'Calculating…' : `⚖️ Resize to ${servings} serving${servings === 1 ? '' : 's'}`}
            </button>
            {enhanceResult?.ingredients && !enhanceResult?.instructions && (
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-sky-300">
                <p className="text-xs font-semibold text-sky-700 mb-2">✨ Preview — resized ingredients</p>
                <ul className="space-y-1.5">
                  {enhanceResult.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                      <span className="text-sky-400">•</span>
                      <span><span className="font-semibold text-gray-900">{ing.measure}</span> {ing.name}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={applyEnhancement} disabled={enhancing} className="mt-4 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {enhancing ? '⏳ Updating nutrition…' : '✓ Apply & refresh nutrition'}
                </button>
              </div>
            )}
          </div>
          )}

          {/* 📊 Generate Recipe Info — EMERALD */}
          {helperTab === 'info' && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-bold text-gray-900">Add cooking details</p>
                <p className="text-xs text-gray-600 mt-0.5">Chef Jen estimates prep & cook time, difficulty, equipment, and nutrition.</p>
              </div>
            </div>
            <button onClick={() => handleEnhance('generate_info')} disabled={enhancing}
              className="mt-3 w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-opacity">
              {enhancing ? 'Analyzing…' : '📊 Generate details'}
            </button>
            {generatedInfo && (
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-emerald-300 space-y-2">
                <p className="text-xs font-semibold text-emerald-700 mb-2">✨ Preview the generated details</p>
                <div className="grid grid-cols-2 gap-2">
                  {generatedInfo.prep_time && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">🔪 Prep time</p>
                      <p className="text-sm font-bold text-gray-900">{generatedInfo.prep_time}</p>
                    </div>
                  )}
                  {generatedInfo.cooking_time && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">⏱ Cook time</p>
                      <p className="text-sm font-bold text-gray-900">{generatedInfo.cooking_time}</p>
                    </div>
                  )}
                  {generatedInfo.difficulty && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">📊 Difficulty</p>
                      <p className="text-sm font-bold text-gray-900 capitalize">{generatedInfo.difficulty}</p>
                    </div>
                  )}
                  {generatedInfo.servings && (
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500">👥 Makes</p>
                      <p className="text-sm font-bold text-gray-900">{generatedInfo.servings} serving{generatedInfo.servings === 1 ? '' : 's'}</p>
                    </div>
                  )}
                </div>
                {generatedInfo.equipment?.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">🍳 Equipment</p>
                    <p className="text-sm text-gray-700">{generatedInfo.equipment.join(', ')}</p>
                  </div>
                )}
                {generatedInfo.nutrition_estimate && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Nutrition (per serving estimate)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['calories','protein','carbs','fat'].map(k => generatedInfo.nutrition_estimate[k] && (
                        <div key={k} className="text-center bg-white rounded-lg p-2">
                          <p className="text-xs font-bold text-emerald-700">{generatedInfo.nutrition_estimate[k]}</p>
                          <p className="text-xs text-gray-500 capitalize">{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={applyInfo} className="mt-2 w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">
                  ✓ Save to recipe
                </button>
              </div>
            )}
          </div>
          )}

          {/* 🌿 Make This Recipe More... — PURPLE */}
          {helperTab === 'transform' && (
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="font-bold text-gray-900">Make this recipe more…</p>
                <p className="text-xs text-gray-600 mt-0.5">Pick one or more cooking-style preferences — Chef Jen will adjust the recipe to match.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {PREFERENCE_OPTIONS.map(opt => {
                const selected = transformPrefs.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleTransformPref(opt.value)}
                    disabled={transforming}
                    className={`text-left rounded-xl border-2 p-3 transition-all ${
                      selected
                        ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-200'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{opt.emoji}</span>
                      <span className="text-sm font-semibold">{opt.label}</span>
                    </div>
                    <p className={`text-xs mt-1 ${selected ? 'text-purple-100' : 'text-gray-500'}`}>
                      {opt.hint}
                    </p>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-gray-500 italic mb-3">
              These are cooking-style preferences, not medical advice. Always check with a healthcare provider for specific dietary needs.
            </p>

            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleTransform}
                disabled={transforming || transformPrefs.length === 0}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {transforming
                  ? 'Transforming...'
                  : transformPrefs.length === 0
                    ? 'Select a preference to continue'
                    : `Transform with ${transformPrefs.length} preference${transformPrefs.length === 1 ? '' : 's'} →`}
              </button>
              {transformPrefs.length > 0 && !transforming && (
                <button
                  onClick={() => setTransformPrefs([])}
                  className="text-xs text-purple-700 underline px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {transformResult && (
              <div className="mt-4 bg-white rounded-xl p-4 border-2 border-purple-300 space-y-3">
                <p className="text-xs font-semibold text-purple-700">Preview — pick an action below</p>

                {transformResult.title && (
                  <p className="text-base font-bold text-gray-900">{transformResult.title}</p>
                )}

                {transformResult.description && (
                  <p className="text-sm text-gray-600 italic">{transformResult.description}</p>
                )}

                {transformPrefs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {transformPrefs.map(v => {
                      const opt = PREFERENCE_OPTIONS.find(o => o.value === v)
                      if (!opt) return null
                      return (
                        <span key={v} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {opt.emoji} {opt.label}
                        </span>
                      )
                    })}
                  </div>
                )}

                {transformResult.ingredients?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Ingredients</p>
                    <ul className="space-y-1">
                      {transformResult.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          • {ing.measure && <span className="font-semibold">{ing.measure} </span>}{ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {transformResult.instructions && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Instructions</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{transformResult.instructions}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-purple-100">
                  <button
                    onClick={saveTransformAsNew}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold"
                  >
                    💾 Save as new recipe
                  </button>
                  <button
                    onClick={replaceWithTransform}
                    className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold"
                  >
                    ♻️ Replace this recipe
                  </button>
                  <button
                    onClick={discardTransform}
                    className="w-full py-2 text-gray-500 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    ✕ Discard
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </main>
      </div>
    )
  }

  // ── IMPORT VIEW ──
  // ── SETTINGS VIEW ──
  // First-class Vault settings page. v1 ships with one section:
  // 🗑 Recently Deleted (soft-delete recovery, migration 020). Designed
  // to grow — future cards (preferences, default tags, account stuff)
  // slot in as additional sections in the same container.
  if (view === 'settings') {
    // Days remaining before auto-purge, rounded down. Hint copy on
    // each row so the user knows their window is shrinking.
    function daysLeft(deletedAt) {
      if (!deletedAt) return 30
      const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()
      return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
    }
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">⚙️ Vault Settings</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* 🗑 Recently Deleted — soft-delete recovery window. */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗑</span>
                <h2 className="text-base font-bold text-gray-900">Recently Deleted</h2>
                {trashRecipes.length > 0 && (
                  <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{trashRecipes.length}</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1 ml-7">
                Deleted recipes stay here for 30 days, then go forever. Restore the keepers; delete the rest.
              </p>
            </div>
            {trashRecipes.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8 px-4">Nothing here. Deleted recipes will show up for 30 days.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {trashRecipes.map(r => {
                  const days = daysLeft(r.deleted_at)
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {r.photo_url ? (
                          <img src={r.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-orange-50 flex items-center justify-center text-2xl shrink-0">{categoryEmoji(r)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {days > 0
                              ? `Auto-deletes in ${days} ${days === 1 ? 'day' : 'days'}`
                              : 'Auto-deletes today'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => restoreRecipe(r.id)}
                              className="text-xs font-semibold text-orange-700 border-2 border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50"
                            >
                              ↩ Restore
                            </button>
                            <button
                              onClick={() => purgeRecipe(r.id)}
                              className="text-xs font-semibold text-red-600 border-2 border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                            >
                              🗑 Delete Forever
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (view === 'import') {
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📥 Import Tools</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <p className="text-sm text-gray-600">Pick a way to bring a recipe in. Chef Jen will extract and clean it up.</p>

          {/* Tab strip — four alternatives, one at a time. URL is the
              default and most common; Paste is the "site blocked the
              fetcher" fallback (with three sub-instructions for HOW to
              get content into the textarea); ✏️ Add is manual entry +
              the post-import preview surface; JSON is power-user
              imports/exports. Active tab fills with orange; inactive
              tabs are gray. Equal-width grid keeps the strip tight
              even at 4 columns on phone. */}
          <div className="grid grid-cols-4 gap-1.5 bg-gray-100 rounded-2xl p-1">
            {[
              { key: 'url', label: '🔗 URL' },
              { key: 'paste', label: '📋 Paste' },
              { key: 'add', label: '✏️ Add' },
              { key: 'json', label: '📄 JSON' },
            ].map(t => {
              const active = importTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setImportTab(t.key)}
                  className={
                    active
                      ? 'py-2 rounded-xl text-sm font-semibold bg-orange-600 text-white shadow-sm'
                      : 'py-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-800'
                  }
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* URL tab */}
          {importTab === 'url' && (
            <div className="border-2 border-gray-200 rounded-2xl p-4 space-y-2">
              <label className="text-base font-bold text-gray-800 block">🔗 Import by URL</label>
              <p className="text-sm text-gray-500">Paste a recipe link below and tap Import. If the site blocks our reader, switch to <button type="button" onClick={() => setImportTab('paste')} className="underline font-semibold text-gray-700 hover:text-gray-900">📋 Paste</button> and send the page text instead.</p>

              <div className="flex gap-2">
                <input placeholder="https://www.example.com/recipe..." value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onPaste={e => {
                    // Robust paste — handles clean URLs AND messy
                    // iMessage clipboards (Tapbacks, replies, quote
                    // blocks). Strip the Tapback prefix first, then
                    // pull the first http(s) URL out of whatever is
                    // left. preventDefault so the messy original
                    // doesn't dump into the field; we put just the
                    // clean URL in via setImportUrl.
                    const pasted = (e.clipboardData?.getData('text') || '').trim()
                    if (!pasted) return
                    const url = extractFirstUrl(stripTapbackPrefix(pasted))
                    if (url) {
                      e.preventDefault()
                      setImportUrl(url)
                      setTimeout(() => handleImport(url), 0)
                    }
                    // No URL found → let the default paste land
                    // (user can edit) so we don't silently swallow it.
                  }}
                  style={{ fontSize: '16px' }}
                  className="flex-1 min-w-0 border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-colors" />
                {/* Explicit paste button — iOS PWA mode often blocks the
                    passive auto-detect above, but readText() called from
                    a direct tap-handler usually succeeds. Surfaces the
                    actual error in a toast on failure so we can diagnose. */}
                <button
                  type="button"
                  onClick={async () => {
                    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
                      showToast('Paste not supported in this browser')
                      return
                    }
                    try {
                      const text = await navigator.clipboard.readText()
                      const trimmed = (text || '').trim()
                      if (!trimmed) {
                        showToast('Clipboard is empty')
                        return
                      }
                      // Pull the first http(s) URL out of whatever's
                      // on the clipboard, after stripping any Tapback
                      // prefix. Handles messy iMessage replies that
                      // bundle multiple messages + reactions around
                      // the URL the user actually wants to import.
                      const url = extractFirstUrl(stripTapbackPrefix(trimmed))
                      if (!url) {
                        showToast('No URL found in clipboard')
                        return
                      }
                      setImportUrl(url)
                      // Auto-fire the import — Bill expects "tap
                      // Paste → recipe imports", not "tap Paste → tap
                      // Import & Clean".
                      handleImport(url)
                    } catch (err) {
                      const tag = err?.name || 'Error'
                      const msg = err?.message ? `: ${err.message}` : ''
                      showToast(`Clipboard ${tag}${msg}`)
                    }
                  }}
                  className="shrink-0 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-3 py-3 transition-colors"
                  title="Paste from clipboard"
                >
                  📋 Paste
                </button>
              </div>
            </div>
          )}

          {/* Paste tab — three collapsible "how to get content" groups
              above one shared textarea. Each group is just instructions
              for how to fill the textarea below; they all end at the
              same paste step. Tap a header to expand/collapse its
              instructions. Multiple closed by default so the page is
              short on first open. */}
          {importTab === 'paste' && (
            <div className="border-2 border-gray-200 rounded-2xl p-4 space-y-3">
              <label className="text-base font-bold text-gray-800 block">📋 Paste Recipe Text</label>

              {/* Three collapsible instruction groups — Option 1, 2, 3.
                  Each renders as a tappable header row that expands to
                  show its instructions below. Visual: gray border + soft
                  bg when collapsed, orange border + soft orange bg when
                  open. Chevron flips ▸/▾ to telegraph state. */}
              {[
                { key: 'text', emoji: '📝', title: 'Option 1 — Paste Text', body: 'Copy the recipe from the site (Select All works great) and paste it here.' },
                { key: 'print', emoji: '🖨️', title: 'Option 2 — Print Capture', body: 'Open the site’s Print Capture, save it, copy all, and paste it here. Chef Jen cleans it automatically.' },
                { key: 'shortcut', emoji: '📲', title: 'Option 3 — Share Shortcut', body: 'Tap Share → choose the app’s Share Shortcut to send the recipe straight in — no copying needed, just click paste.' },
              ].map(opt => {
                const open = pasteOption === opt.key
                return (
                  <div key={opt.key} className={`rounded-xl border-2 ${open ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                    <button
                      type="button"
                      onClick={() => setPasteOption(open ? null : opt.key)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-base">{opt.emoji}</span>
                        {opt.title}
                      </span>
                      <span className="text-xs text-gray-500">{open ? '▾' : '▸'}</span>
                    </button>
                    {open && (
                      <div className="px-3 pb-3 -mt-1">
                        <p className="text-sm text-gray-700 leading-snug">{opt.body}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* One-tap paste from clipboard. User-gesture clipboard read,
                  so iOS will show its native "Paste from..." prompt
                  and fill the textarea below. */}
              <button
                type="button"
                onClick={pasteFromClipboardToTextarea}
                className="w-full px-4 py-3 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-700 rounded-xl font-semibold text-base"
              >
                📋 Paste from clipboard
              </button>
              <textarea ref={importTextRef} placeholder="Paste your recipe here — title, ingredients, instructions, notes…" value={importText} onChange={e => setImportText(e.target.value)}
                rows={10}
                style={{ fontSize: '16px' }}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y font-mono transition-colors" />
            </div>
          )}

          {/* Inline error banner — replaces the old alert(). Only on
              URL/Paste tabs (where handleImport is the action). Add and
              JSON each have their own flow with their own error paths. */}
          {importError && (importTab === 'url' || importTab === 'paste') && (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-red-800">Couldn&apos;t import from URL</p>
              <p className="text-sm text-red-700">{importError}</p>
              <p className="text-sm text-red-700">
                👇 Switch to <button type="button" onClick={() => setImportTab('paste')} className="underline font-semibold">📋 Paste</button> and copy the recipe text from the page — it works on every site.
              </p>
            </div>
          )}

          {/* Submit button — only on URL/Paste tabs. Add tab has its
              own Save button inline; JSON has a separate file picker. */}
          {(importTab === 'url' || importTab === 'paste') && (
            <button onClick={handleImport} disabled={importing || (!importText.trim() && !importUrl.trim())}
              style={{ fontSize: '16px' }}
              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
              {importing ? '🤖 Extracting recipe...' : '📥 Import & Clean with AI'}
            </button>
          )}

          {/* Add tab — manual recipe entry. Form fields lifted from the
              old standalone view='add' page so users can add a recipe
              directly from Import Tools (the + Add button in the Vault
              header was retired April 2026). Same form is also used as
              the post-import preview surface — after URL/Paste/JSON
              imports succeed, importTab flips to 'add' with the form
              pre-filled for the user to review/edit/save. */}
          {importTab === 'add' && (
            <div className="border-2 border-gray-200 rounded-2xl p-4 space-y-7 pb-4">
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">📷 Photo</label>
                <div className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => fileInputRef.current?.click()}>
                  {form.photo_url ? (
                    <img loading="lazy" decoding="async" src={form.photo_url} alt="Preview" className="h-32 object-cover rounded-xl" />
                  ) : (
                    <><span className="text-3xl mb-2">📷</span>
                    <p className="text-base text-orange-600 font-semibold">Browse & Upload Photo</p>
                    <p className="text-sm text-gray-500">JPG, PNG, HEIC supported</p></>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,.heic" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return
                      setSelectedPhoto(file)
                      setForm(f => ({ ...f, photo_url: URL.createObjectURL(file) }))
                    }} />
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Recipe Title *</label>
                <input placeholder="e.g. Grandma's Chicken Soup" value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-colors" />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Description</label>
                <p className="text-sm text-gray-500 mb-2">One or two sentences about the dish.</p>
                <textarea placeholder="A short description of this recipe" value={form.description}
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={3}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y transition-colors" />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Category</label>
                <input placeholder="e.g. Main Dish, Dessert, Side" value={form.category}
                  onChange={e => setForm(f => ({...f, category: e.target.value}))}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-colors" />
              </div>

              <TagSelector tags={form.tags} onChange={tags => setForm(f => ({...f, tags}))} libraryCustomTags={libraryCustomTags} />

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Ingredients</label>
                <p className="text-sm text-gray-500 mb-2">
                  One per line. Format: <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">2 cups - flour</span> — quantity first, then a dash, then the name.
                </p>
                <textarea placeholder="2 cups - flour&#10;1 cup - sugar&#10;1/2 cup - butter&#10;Salt"
                  value={form.ingredients} onChange={e => setForm(f => ({...f, ingredients: e.target.value}))}
                  rows={14}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y font-mono transition-colors" />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Instructions</label>
                <p className="text-sm text-gray-500 mb-2">One step per line — a new line per numbered instruction.</p>
                <textarea placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Combine wet and dry"
                  value={form.instructions} onChange={e => setForm(f => ({...f, instructions: e.target.value}))}
                  rows={16}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y font-mono transition-colors" />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">Notes</label>
                <p className="text-sm text-gray-500 mb-2">Tips, tweaks, source attribution — anything you want to remember.</p>
                <textarea placeholder="Less salt next time. Doubled the garlic. Saved from..."
                  value={form.family_notes} onChange={e => setForm(f => ({...f, family_notes: e.target.value}))}
                  rows={8}
                  style={{ fontSize: '16px' }}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y font-mono transition-colors" />
              </div>

              {/* Time & Nutrition — May 2026. Pre-filled from JSON-LD on
                  imports that ship Recipe schema; manual otherwise. All
                  optional; blank fields stay null in the DB and don't
                  render their pill on the detail view. Number inputs use
                  inputMode="decimal" so iOS shows the numeric keypad. */}
              <div>
                <label className="block text-base font-bold text-gray-800 mb-2">⏱ Time &amp; Nutrition</label>
                <p className="text-sm text-gray-500 mb-3">Optional. We pre-fill these when the source recipe has them.</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    { key: 'prep_time_minutes', label: 'Prep (min)', step: '1' },
                    { key: 'cook_time_minutes', label: 'Cook (min)', step: '1' },
                    { key: 'total_time_minutes', label: 'Total (min)', step: '1' },
                  ].map(({ key, label, step }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={step}
                        min="0"
                        value={form[key] ?? ''}
                        onChange={e => {
                          const v = e.target.value
                          setForm(f => ({ ...f, [key]: v === '' ? null : parseInt(v, 10) }))
                        }}
                        style={{ fontSize: '16px' }}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'calories', label: 'Cal', step: '1', isInt: true },
                    { key: 'protein_g', label: 'Protein g', step: '0.1', isInt: false },
                    { key: 'carbs_g', label: 'Carbs g', step: '0.1', isInt: false },
                    { key: 'fat_g', label: 'Fat g', step: '0.1', isInt: false },
                  ].map(({ key, label, step, isInt }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={step}
                        min="0"
                        value={form[key] ?? ''}
                        onChange={e => {
                          const v = e.target.value
                          setForm(f => ({ ...f, [key]: v === '' ? null : (isInt ? parseInt(v, 10) : parseFloat(v)) }))
                        }}
                        style={{ fontSize: '16px' }}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-base focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Cancel — saves to Vault and exits Import Tools. */}
              <div className="flex gap-3">
                <button onClick={() => setView('list')}
                  style={{ fontSize: '16px' }}
                  className="px-5 py-4 border-2 border-gray-200 text-gray-600 rounded-2xl font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={saveRecipe} disabled={!form.title.trim() || uploadingPhoto}
                  style={{ fontSize: '16px' }}
                  className="flex-1 py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
                  {uploadingPhoto ? '📷 Uploading photo...' : '💾 Save Recipe'}
                </button>
              </div>
            </div>
          )}

          {/* JSON tab */}
          {importTab === 'json' && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📄</span>
                <h2 className="text-sm font-bold text-gray-900">Import JSON File</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">Import a recipe exported from this app or any compatible JSON format. Fields: title, description, ingredients, instructions, category, tags.</p>
              <input type="file" accept=".json,application/json" id="json-import-input" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const json = JSON.parse(text)
                  const recipes = Array.isArray(json) ? json : [json]
                  let count = 0
                  for (const r of recipes) {
                    if (!r.title) continue
                    // Get first valid web image URL from images array or photo_url
                    const rawImages = Array.isArray(r.images) ? r.images : (r.photo_url ? [r.photo_url] : [])
                    const photoUrl = rawImages.find(img => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) || ''
                    await supabase.from('personal_recipes').insert({
                      user_id: user.id,
                      title: r.title || '',
                      description: r.description || '',
                      ingredients: typeof r.ingredients === 'string' ? r.ingredients.split('\n').filter(Boolean).map(line => ({ name: line.trim(), measure: '' })) : Array.isArray(r.ingredients) ? r.ingredients.map(ing => typeof ing === 'string' ? { name: ing, measure: '' } : ing) : [],
                      instructions: (r.instructions || '').replace(/^#+\s*/gm, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/^[-_]{3,}$/gm, '').replace(/\[.*?\]\(.*?\)/g, '').trim(),
                      category: Array.isArray(r.categories) && r.categories.length > 0 ? r.categories[0] : (r.category || 'Imported'),
                      tags: r.tags || ['imported'],
                      photo_url: photoUrl,
                      family_notes: r.family_notes || '',
                      servings: r.servings || r.yield || 4,
                    })
                    count++
                  }
                  await loadRecipes(user.id)
                  setView('list')
                } catch (err) {
                  alert('Invalid JSON file. Please check the format and try again.')
                }
                e.target.value = ''
              }}
            />
              <button onClick={() => document.getElementById('json-import-input').click()}
                className="w-full py-3 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors">
                📄 Choose JSON File
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── (view === 'add' retired April 2026.) The standalone Add Recipe
  //     page was folded into the Import Tools page as the ✏️ Add tab.
  //     The form lives inline as `importTab === 'add'` content. The
  //     post-import preview flow now sets `setImportTab('add')` instead
  //     of `setView('add')`, and the Vault's old + Add header button
  //     was removed at the same time.

  // ── LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      {toastEl}
      {pasteTargetEl}
      {/* Sticky list-view header. z-20 (not z-10) so the absolute-positioned
          ❤️ heart overlays on each Grid tile (also z-10 within their own
          stacking context) don't bleed through the header as the page
          scrolls. The other view headers (detail, import) don't have
          tile-level z-10 elements underneath them, so their z-10 is fine. */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-3">
          {/* Row 1: ← Back tucked into the title row's left side, title
              centered (flex-1). Keeps "Recipe Vault" at the visual top of
              the page and uses the empty space next to it for the back
              affordance. Right side mirrors the back button's width to
              keep the title geometrically centered. */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-500 hover:text-gray-600 shrink-0">← Back</button>
            <h1 className="text-xl font-bold text-gray-900 flex-1 text-center">
              {listStyle === 'portfolio' ? '💎 Chef Portfolio' : '🔐 Recipe Vault'}
            </h1>
            {/* ⚙️ Settings — opens the Vault settings view (Recently
                Deleted recovery, future preferences). Matches the back
                button's width so the title stays geometrically centered. */}
            <button
              onClick={() => { if (user) loadTrashRecipes(user.id); setView('settings') }}
              title="Vault settings"
              className="text-sm text-gray-500 hover:text-gray-600 shrink-0 w-12 text-right"
            >
              ⚙️
            </button>
          </div>
          {/* Row 2: filter pulldown on the left (uses the empty space that
              used to be a dedicated chip-scroller row below the header),
              action cluster on the right. The pulldown is a single native
              <select> that combines what used to be three separate UI
              elements — the "All / Favorites / #tag" chips, the top-5 chip
              shortcut row, and the overflow tag dropdown — into one
              compact control. Native <select> on mobile gives us a clean
              full-screen picker for free. Hidden on Portfolio (no tags). */}
          <div className="flex items-center justify-between gap-2 mb-3">
            {listStyle !== 'portfolio' ? (
              <select
                value={searchTag}
                onChange={e => setSearchTag(e.target.value)}
                style={{ fontSize: '16px' }}
                className={`flex-1 min-w-0 border-2 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                  searchTag === '__favorites__'
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : searchTag
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'bg-white border-gray-200 text-gray-600'
                }`}
                title="Filter recipes"
              >
                <option value="">All recipes</option>
                {favoritesCount > 0 && (
                  <option value="__favorites__">❤️ Favorites</option>
                )}
                {TAG_GROUPS.map(group => {
                  const usedInGroup = group.tags.filter(t => allTags.includes(t))
                  if (usedInGroup.length === 0) return null
                  return (
                    <optgroup key={group.label} label={`${group.emoji} ${group.label}`}>
                      {usedInGroup.map(tag => (
                        <option key={tag} value={tag}>#{tag}</option>
                      ))}
                    </optgroup>
                  )
                })}
                {/* Custom tags — list each non-curated tag the user has
                    actually applied to a recipe (was collapsed to a
                    single "Custom tags" sentinel option, but Bill wanted
                    individual entries so users can filter to a specific
                    custom tag). Sorted alphabetically for predictable
                    scanning. */}
                {(() => {
                  const customTags = allTags.filter(t => !CURATED_TAGS.includes(t)).sort()
                  if (customTags.length === 0) return null
                  return (
                    <optgroup label="✏️ Custom">
                      {customTags.map(tag => (
                        <option key={tag} value={tag}>#{tag}</option>
                      ))}
                    </optgroup>
                  )
                })()}
              </select>
            ) : (
              /* Portfolio row 2 — book image moved out (May 2026) to a
                 proper hero banner at the top of the page content; this
                 slot now stays empty so the action buttons on the right
                 keep their natural spacing without a competing widget
                 fighting for visual weight. */
              <div className="flex-1" />
            )}
            <div className="flex gap-1 shrink-0">
              {/* Search 🔍 — hidden on Portfolio view (notes have no
                  searchable title; tags don't apply). */}
              {listStyle !== 'portfolio' && (
                <button
                  onClick={() => {
                    if (showSearch || searchText) {
                      // Close: clear any active query AND collapse back to chips
                      setSearchText('')
                      setShowSearch(false)
                    } else {
                      setShowSearch(true)
                    }
                  }}
                  title={(showSearch || searchText) ? 'Close search' : 'Search by name'}
                  className={`text-base font-semibold border rounded-lg px-2.5 py-1.5 ${
                    (showSearch || searchText)
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'text-gray-500 border-gray-200'
                  }`}
                >
                  {(showSearch || searchText) ? '✕' : '🔍'}
                </button>
              )}
              {/* List / Grid / Portfolio segmented toggle. List + Grid are
                  pure display choices for the recipe collection (Grid shows
                  recipes as photo-first cream-paper tiles; both tap-through
                  to the same Vault detail view). Portfolio (💎) is a
                  *different surface* — it shows curated Chef Notes the user
                  promoted from Playbook via "💎 Add to Portfolio". Notes,
                  not recipes — so Add/Import buttons won't apply there.
                  NOT the same as /cards (a separate "chef card" concept). */}
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {[
                  { key: 'cardbox', icon: '🍽', title: "What's Cooking? — favorites + a wildcard" },
                  { key: 'grid', icon: '🖼', title: 'Grid view (recipes)' },
                  { key: 'portfolio', icon: '💎', title: 'Chef Portfolio (saved notes)' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setListStyle(opt.key)
                      // Grid is the default (May 2026) — no ?view= param
                      // needed when landing there. Other modes get the
                      // explicit view param so refresh / share preserves
                      // the user's choice.
                      const url = new URL(window.location.href)
                      if (opt.key === 'grid') url.searchParams.delete('view')
                      else url.searchParams.set('view', opt.key)
                      window.history.replaceState({}, '', url.toString())
                      if (opt.key === 'portfolio' && user) loadPortfolioNotes(user.id)
                      // Clear the surprise me pick when leaving cardbox so
                      // it doesn't reappear stale on next return. Also kill
                      // story mode if it was open — it only belongs to the
                      // cardbox All Recipes drawer.
                      if (opt.key !== 'cardbox') {
                        setSurpriseRecipe(null)
                        setStoryMode(false)
                      }
                    }}
                    title={opt.title}
                    className={`text-base font-semibold px-2.5 py-1.5 ${
                      listStyle === opt.key
                        ? 'bg-orange-600 text-white'
                        : 'text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
              <button onClick={openImportFromClipboard} title="Import Tools" className="text-xl font-semibold text-gray-600 border-2 border-gray-300 rounded-lg px-3.5 py-2">📥</button>
            </div>
          </div>
          {/* Conditional search input — only renders when the 🔍 button is
              toggled on, OR when there's an active query. Hidden on the
              Portfolio view (notes have no searchable title). The tag
              filter has moved up to row 2 as a compact dropdown, so this
              is the only thing that can ever appear below the action row. */}
          {listStyle !== 'portfolio' && (showSearch || searchText) && (
            <input type="text" placeholder="Search recipes..." value={searchText}
              autoFocus
              onChange={e => setSearchText(e.target.value)}
              style={{ fontSize: '16px' }}
              className="w-full border-2 border-orange-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2" />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your vault...</div>
        ) : listStyle === 'cardbox' ? (
          /* 📦 Card box — the recipe-box-on-the-counter mode. ❤️ Favorites
             drawer (open by default) renders as splayed cards the user
             can scroll through and 🎴 Pin without opening. 🎲 Surprise me
             button at top deals one random non-favorite when the user
             wants something new. 📚 All recipes drawer (collapsed) gives
             access to the full Vault when the favorites pass isn't enough.
             This is the home view for daily meal planning. */
          (() => {
            // Honor the search box + tag chip filter the user typed at
            // the top of the page — Card Box used to render raw
            // `recipes`, so typing in the 🔍 input did nothing here
            // even though the input was visible. Alphabetical sort by
            // title gives the drawers the predictable "flipping through
            // a card box" feel.
            const cardBoxList = [...filtered].sort((a, b) =>
              (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
            )
            const favs = cardBoxList.filter(r => r.is_favorite)
            const nonFavs = cardBoxList.filter(r => !r.is_favorite)
            // Surprise me pool — only dinner-tagged non-favorites (May
            // 2026, Bill's ask). This is the "what should I cook
            // tonight?" surface, so the wildcard should land on actual
            // dinner options, not desserts or sides. Recipes without a
            // dinner tag never appear in the surprise rotation; they're
            // still browsable via the All Recipes drawer.
            const surprisePool = nonFavs.filter(r => (r.tags || []).includes('dinner'))
            function rollSurprise() {
              if (surprisePool.length === 0) return
              let pick = surprisePool[Math.floor(Math.random() * surprisePool.length)]
              // Try to avoid landing on the same one twice in a row.
              if (surpriseRecipe && surprisePool.length > 1) {
                let safety = 5
                while (pick?.id === surpriseRecipe.id && safety-- > 0) {
                  pick = surprisePool[Math.floor(Math.random() * surprisePool.length)]
                }
              }
              setSurpriseRecipe(pick)
            }
            return (
              <div>
                {/* "What's Cooking?" header — names the decision-surface
                    framing (Bill's tagline, May 2026). This mode is the
                    answer to "what should I cook?" — favorites first,
                    a 🎲 surprise when you're stuck, the whole vault one
                    tap below. The List / Grid / Portfolio toggles are
                    about HOW you look at the vault; this one is about
                    WHAT to make. */}
                <div className="text-center mb-4 px-2">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
                    What&rsquo;s Cooking?
                  </p>
                  <p className="text-base text-gray-600 mt-2 leading-snug">
                    Favorites you love, a surprise pick when you want one, and your full vault &mdash; cards or stories &mdash; just a tap away.
                  </p>
                </div>
                {/* Surprise me — header chip + result card */}
                <div className="mb-4 flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    {cardBoxList.length} {cardBoxList.length === 1 ? 'recipe' : 'recipes'}
                    {(searchText || searchTag) ? ' match' : ' in your vault'}
                  </p>
                  <button
                    onClick={rollSurprise}
                    disabled={surprisePool.length === 0}
                    title={surprisePool.length === 0
                      ? 'No dinner-tagged recipes yet — tag one as #dinner to unlock'
                      : 'Pick a random dinner recipe'}
                    className="text-xs font-semibold border-2 border-sky-300 bg-sky-50 text-sky-800 rounded-lg px-3 py-1.5 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    🎲 Surprise me
                  </button>
                </div>

                {surpriseRecipe && (
                  <div className="mb-4 rounded-2xl border-2 border-sky-200 bg-sky-50/60 p-3 flex items-start gap-3">
                    <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-amber-100 flex items-center justify-center">
                      {surpriseRecipe.photo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img loading="lazy" decoding="async" src={surpriseRecipe.photo_url} alt={surpriseRecipe.title} className="w-full h-full object-cover" />
                        : <span className="text-3xl">{categoryEmoji(surpriseRecipe)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">🎲 Tonight&rsquo;s pick</p>
                      <button
                        onClick={() => { setViewing(surpriseRecipe); setView('detail') }}
                        className="block text-left font-bold text-sm text-gray-900 leading-snug mt-0.5 hover:text-sky-700"
                      >
                        {surpriseRecipe.title}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">From your &ldquo;haven&rsquo;t favorited yet&rdquo; pile</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <button
                          onClick={() => toggleCardPin(surpriseRecipe.id)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors ${
                            pinnedCards.includes(surpriseRecipe.id)
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          {pinnedCards.includes(surpriseRecipe.id) ? '🃏 Pinned' : '🃏 Pin to Cards'}
                        </button>
                        <button
                          onClick={() => toggleMealPlanPick(surpriseRecipe)}
                          title={picksIds.includes(surpriseRecipe.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors ${
                            picksIds.includes(surpriseRecipe.id)
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {picksIds.includes(surpriseRecipe.id) ? '📅 In Meal Plan' : '📅 Meal Plan'}
                        </button>
                        <button
                          onClick={rollSurprise}
                          className="text-xs font-semibold rounded-lg px-2.5 py-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        >
                          🎲 Again
                        </button>
                        <button
                          onClick={() => setSurpriseRecipe(null)}
                          aria-label="Dismiss"
                          className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ❤️ Favorites drawer — splayed cards, open by default */}
                <div className="mb-3 bg-white rounded-2xl border-2 border-rose-200 border-l-8 border-l-rose-500 overflow-hidden">
                  <button
                    onClick={() => setFavOpen(o => !o)}
                    className={`w-full flex items-center justify-between px-4 py-3 ${favOpen ? 'bg-rose-50' : 'bg-white'} hover:bg-rose-50 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">❤️</span>
                      <span className="font-bold text-rose-900">Favorites</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">{favs.length}</span>
                    </div>
                    <span className="text-xl text-rose-900">{favOpen ? '▾' : '▸'}</span>
                  </button>
                  {favOpen && (
                    favs.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Tap the ❤️ on a recipe to add it here.
                      </div>
                    ) : (
                      <div className="px-3 py-3 flex gap-3 overflow-x-auto">
                        {favs.map((r, i) => {
                          const rot = ((i % 5) - 2) * 0.6
                          const pinned = pinnedCards.includes(r.id)
                          return (
                            <div key={r.id} className="shrink-0 w-32" style={{ transform: `rotate(${rot}deg)` }}>
                              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="h-1 bg-red-600" />
                                <button
                                  onClick={() => { setViewing(r); setView('detail') }}
                                  className="block w-full text-left"
                                >
                                  <div className="px-2 pt-2">
                                    <p className="font-bold text-xs text-gray-900 leading-snug line-clamp-2 min-h-[2rem]">{r.title}</p>
                                  </div>
                                  <div className="p-2">
                                    {r.photo_url ? (
                                      <div className="rounded-lg overflow-hidden h-20">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img loading="lazy" decoding="async" src={r.photo_url} alt={r.title} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="rounded-lg bg-amber-100 h-20 flex items-center justify-center text-2xl">
                                        {categoryEmoji(r)}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <div className="px-2 pb-2 space-y-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleCardPin(r.id) }}
                                    className={`w-full text-[11px] font-semibold rounded-md py-1 border transition-colors ${
                                      pinned
                                        ? 'bg-orange-600 text-white border-orange-600'
                                        : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
                                    }`}
                                  >
                                    {pinned ? 'Pinned' : 'Pin to Cards'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleMealPlanPick(r) }}
                                    title={picksIds.includes(r.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                                    className={`w-full text-[11px] font-semibold rounded-md py-1 border transition-colors ${
                                      picksIds.includes(r.id)
                                        ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                    }`}
                                  >
                                    {picksIds.includes(r.id) ? 'In Meal Plan' : 'Meal Plan'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}
                </div>

                {/* Story mode — full-screen vertical-snap viewer rendered as
                    a fixed overlay above the page. Each recipe is one
                    snapped page (h-screen + scroll-snap-align: start) with
                    a hero photo, title overlay, family-notes excerpt, and
                    a "View recipe →" CTA. Designed for younger users who
                    instinctively swipe TikTok / Instagram-style. ✕ in the
                    top-right closes back to the drawer. */}
                {storyMode && (
                  <div className="fixed inset-0 z-50 bg-black">
                    <button
                      onClick={() => setStoryMode(false)}
                      className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white text-2xl flex items-center justify-center backdrop-blur"
                      title="Close story view"
                    >
                      ✕
                    </button>
                    <div
                      className="h-full overflow-y-auto"
                      style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
                    >
                      {cardBoxList.map(r => {
                        const pinned = pinnedCards.includes(r.id)
                        const notesExcerpt = (r.family_notes || r.description || '')
                          .replace(/^Saved from .*?\n+/i, '')
                          .replace(/\n+/g, ' ')
                          .trim()
                          .slice(0, 180)
                        return (
                          <div
                            key={r.id}
                            className="relative h-screen w-full overflow-hidden"
                            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                          >
                            {/* Hero — photo or emoji-on-gradient fallback */}
                            {r.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img loading="lazy" decoding="async"
                                src={r.photo_url}
                                alt={r.title}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-300 to-rose-300 flex items-center justify-center">
                                <span className="text-[10rem]">{categoryEmoji(r)}</span>
                              </div>
                            )}
                            {/* Top + bottom gradients for legibility */}
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none" />

                            {/* Top-left favorite badge */}
                            {r.is_favorite && (
                              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-500/90 text-white text-xs font-bold backdrop-blur">
                                ❤️ Favorite
                              </div>
                            )}

                            {/* Bottom content stack */}
                            <div className="absolute inset-x-0 bottom-0 p-6 pb-10 text-white">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200 mb-2">
                                {r.category || 'Recipe'}
                              </p>
                              <h2 className="text-3xl font-black leading-tight mb-3 drop-shadow-lg">
                                {r.title}
                              </h2>
                              {notesExcerpt && (
                                <p className="text-sm text-white/85 leading-relaxed mb-4 line-clamp-3">
                                  {notesExcerpt}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setStoryMode(false); setViewing(r); setView('detail') }}
                                  className="flex-1 py-3 rounded-full bg-white text-gray-900 text-sm font-bold shadow-lg hover:bg-gray-100 transition-colors"
                                >
                                  View recipe →
                                </button>
                                <button
                                  onClick={() => toggleMealPlanPick(r)}
                                  title={picksIds.includes(r.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-colors ${
                                    picksIds.includes(r.id)
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-white/20 text-white border border-white/40 backdrop-blur hover:bg-white/30'
                                  }`}
                                >
                                  📅
                                </button>
                                <button
                                  onClick={() => toggleCardPin(r.id)}
                                  title={pinned ? 'Unpin from Cards' : 'Pin to Cards'}
                                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-colors ${
                                    pinned
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-white/20 text-white border border-white/40 backdrop-blur hover:bg-white/30'
                                  }`}
                                >
                                  🃏
                                </button>
                              </div>
                              {/* Tiny progress dot row — visual cue that more is below */}
                              <p className="text-[10px] text-white/60 text-center mt-4 tracking-widest">
                                ▼ SWIPE UP FOR NEXT
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      {/* Final pad so the last card snaps cleanly */}
                      <div className="h-screen w-full bg-black flex items-center justify-center" style={{ scrollSnapAlign: 'start' }}>
                        <div className="text-center text-white px-6">
                          <p className="text-5xl mb-4">🎉</p>
                          <p className="text-xl font-bold mb-2">That&rsquo;s your whole vault</p>
                          <p className="text-sm text-white/70 mb-6">{cardBoxList.length} {cardBoxList.length === 1 ? 'recipe' : 'recipes'} saved</p>
                          <button
                            onClick={() => setStoryMode(false)}
                            className="px-6 py-3 rounded-full bg-white text-gray-900 text-sm font-bold"
                          >
                            ← Back to vault
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 📚 All recipes drawer — collapsed by default. The header
                    is a tap-to-toggle row with a tucked-in 📱 Story button
                    on the right that flips the drawer into a TikTok /
                    Instagram-style full-screen vertical scroller (younger-
                    user UX). The Story button stops propagation so it
                    doesn't also collapse/expand the drawer. */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 border-l-8 border-l-gray-400 overflow-hidden">
                  <div className={`flex items-center ${allOpen ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                    <button
                      onClick={() => setAllOpen(o => !o)}
                      className="flex-1 flex items-center gap-2 px-4 py-3 text-left"
                    >
                      <span className="text-2xl shrink-0">📚</span>
                      <span className="font-bold text-gray-900">{(searchText || searchTag) ? 'Matching recipes' : 'All recipes'}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 shrink-0">{cardBoxList.length}</span>
                      <span className="text-xl text-gray-600 shrink-0">{allOpen ? '▾' : '▸'}</span>
                    </button>
                    {cardBoxList.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setStoryMode(true) }}
                        title="Browse story-style — full-screen, swipe-up"
                        className="mr-3 my-2 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-sm hover:from-fuchsia-600 hover:to-pink-600"
                      >
                        📱 Story
                      </button>
                    )}
                  </div>
                  {allOpen && (
                    <div className="px-3 py-3 grid grid-cols-2 gap-3">
                      {cardBoxList.map(r => {
                        const pinned = pinnedCards.includes(r.id)
                        return (
                          <div key={r.id} className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden">
                            <div className="h-1 bg-red-600" />
                            <button
                              onClick={() => { setViewing(r); setView('detail') }}
                              className="block w-full text-left"
                            >
                              <div className="px-3 pt-2">
                                <p className="font-bold text-xs text-gray-900 leading-snug line-clamp-2 min-h-[2rem]">
                                  {r.is_favorite && <span className="text-rose-500 mr-1">❤️</span>}
                                  {r.title}
                                </p>
                              </div>
                              <div className="p-2">
                                {r.photo_url ? (
                                  <div className="rounded-lg overflow-hidden h-20">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img loading="lazy" decoding="async" src={r.photo_url} alt={r.title} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="rounded-lg bg-amber-100 h-20 flex items-center justify-center text-2xl">
                                    {categoryEmoji(r)}
                                  </div>
                                )}
                              </div>
                            </button>
                            <div className="px-2 pb-2 space-y-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCardPin(r.id) }}
                                className={`w-full text-[11px] font-semibold rounded-md py-1 border transition-colors ${
                                  pinned
                                    ? 'bg-orange-600 text-white border-orange-600'
                                    : 'bg-white text-orange-700 border-orange-300 hover:bg-orange-50'
                                }`}
                              >
                                {pinned ? 'Pinned' : 'Pin to Cards'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleMealPlanPick(r) }}
                                title={picksIds.includes(r.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                                className={`w-full text-[11px] font-semibold rounded-md py-1 border transition-colors ${
                                  picksIds.includes(r.id)
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                }`}
                              >
                                {picksIds.includes(r.id) ? 'In Meal Plan' : 'Meal Plan'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })()
        ) : listStyle === 'portfolio' ? (
          /* 💎 Chef Portfolio — curated Chef Notes the user has promoted
             from /playbook. Notes (saved AI answers), not recipes — so
             this branch replaces the regular recipe list/grid entirely.
             Tap a row to expand; tap the × to remove from the Portfolio
             (the underlying note stays in Playbook). */
          <div>
            {/* Portfolio hero banner (May 2026) — open reference book with
                botanical illustrations and foreground fruit, used as the
                full-width hero at the top of the Portfolio. "💎 Chef
                Portfolio" overlays in elegant serif in the dark area at
                the bottom of the banner; small italic tagline below. The
                page already has the brand in the sticky header, but the
                hero is where the room is *set* — the user knows
                immediately they're somewhere different from the working
                Vault. The earlier intro stack (Back link + explainer
                paragraph + count) was retired in the same pass — the
                hero says everything that intro tried to say. */}
            <div className="relative mb-4 rounded-2xl overflow-hidden shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/portfolio-book.png"
                alt=""
                className="w-full h-auto block"
                width={1536}
                height={1024}
              />
              <div
                className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center pb-4 sm:pb-6 px-4"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.7)' }}
              >
                <h2
                  className="text-2xl sm:text-4xl font-bold text-amber-50 tracking-tight leading-none"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  💎 Chef Portfolio
                </h2>
                <p className="text-xs sm:text-sm italic text-amber-100/90 mt-1 leading-snug">
                  Your curated reference shelf.
                </p>
              </div>
            </div>

            {/* Single small back-link under the hero. The explainer
                paragraph and N-saved count were retired — the hero
                carries the framing now and the items below show
                themselves. */}
            <a
              href="/playbook"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 hover:text-orange-800 mb-4 ml-1"
            >
              ← Back to My Playbook
            </a>

            {/* 📺 Learning Videos section — collapsible accordion. The
                sky-blue palette was retired (May 2026) in favor of amber
                to match the Portfolio's premium warm-sepia aesthetic.
                One curated room, one color family. */}
            {portfolioVideos.length > 0 && (
              <div className="mb-4 bg-white rounded-2xl border-2 border-amber-200 border-l-8 border-l-amber-500 overflow-hidden">
                <button
                  onClick={() => setPortfolioVideosOpen(o => !o)}
                  className={`w-full flex items-center justify-between px-4 py-3 ${portfolioVideosOpen ? 'bg-amber-50' : 'bg-white'} hover:bg-amber-50 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📺</span>
                    <span className="font-bold text-amber-900">Learning Videos</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">{portfolioVideos.length}</span>
                  </div>
                  <span className="text-xl text-amber-900">{portfolioVideosOpen ? '▾' : '▸'}</span>
                </button>
                {portfolioVideosOpen && (
                  <div className="divide-y divide-amber-100">
                    {portfolioVideos.map(v => {
                      // Map favorites-row shape → VideoItem's expected
                      // { youtube_id, title, channel } props. Both legacy-
                      // sourced and favorites-sourced videos store the
                      // youtube_id in metadata.youtube_id when filed.
                      const videoForItem = {
                        youtube_id: v.metadata?.youtube_id || '',
                        title: v.title,
                        channel: v.metadata?.channel || '',
                      }
                      return (
                        <VideoItem
                          key={v.id}
                          video={videoForItem}
                          onRemove={() => removeVideoFromPortfolio(v)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {portfolioNotes.length === 0 && portfolioVideos.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-3">💎</p>
                <p className="text-gray-700 font-semibold mb-1">Nothing filed yet</p>
                <p className="text-gray-500 text-sm mb-5 px-6">Open My Playbook and tap <strong>💎 Move to Portfolio</strong> on the Chef Notes (Chef Jennifer · Teach) or technique videos (Chef TV · Teach) you want to keep here.</p>
                <button onClick={() => window.location.href='/playbook?tab=chef_notes'} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold">Open Playbook →</button>
              </div>
            ) : portfolioNotes.length === 0 ? null : (
              /* Group portfolio notes into the 5 fixed "How to..." buckets and
                 render each as a collapsed accordion section. Empty groups are
                 hidden so the page only shows what the user has actually saved
                 against. Tap a header to expand; tap × on a row to remove from
                 the Portfolio (note still lives in Playbook). */
              (() => {
                const grouped = {}
                for (const g of PORTFOLIO_GROUPS) grouped[g.key] = []
                for (const note of portfolioNotes) {
                  const key = categorizeChefNote(note)
                  if (grouped[key]) grouped[key].push(note)
                }
                return (
                  <div className="space-y-3">
                    {PORTFOLIO_GROUPS.map(g => {
                      const items = grouped[g.key]
                      if (!items.length) return null
                      const isOpen = portfolioOpenGroups.has(g.key)
                      return (
                        <div key={g.key} className={`bg-white rounded-2xl border-2 ${g.border} border-l-8 ${g.stripe} overflow-hidden`}>
                          <button
                            onClick={() => {
                              setPortfolioOpenGroups(prev => {
                                const next = new Set(prev)
                                if (next.has(g.key)) next.delete(g.key)
                                else next.add(g.key)
                                return next
                              })
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 ${isOpen ? g.headerBg : 'bg-white'} hover:${g.headerBg} transition-colors`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{g.emoji}</span>
                              <span className={`font-bold ${g.headerText}`}>{g.label}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.countBg} ${g.countText}`}>{items.length}</span>
                            </div>
                            <span className={`text-xl ${g.headerText}`}>{isOpen ? '▾' : '▸'}</span>
                          </button>
                          {isOpen && (
                            <div className={`${g.bodyBg} divide-y divide-gray-100`}>
                              {items.map(note => (
                                <ExpandableItem
                                  key={note.id}
                                  item={note}
                                  emoji="💎"
                                  removeTitle="Return to Chef Notes inbox (un-file)"
                                  onRemove={() => removeFromPortfolio(note)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔐</p>
            <p className="text-gray-700 font-semibold mb-2">Your vault is empty</p>
            <p className="text-gray-500 text-sm mb-6">Add your personal and family recipes — private and only visible to you</p>
            <div className="flex flex-col gap-3 items-center">
              <button onClick={() => { setView('import'); setImportTab('add') }} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold w-48">+ Add a Recipe</button>
              <button onClick={openImportFromClipboard} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold w-48">📥 Import Tools</button>
            </div>
          </div>
        ) : (() => {
          const videoRefs = filtered.filter(r => r.category === 'Video Reference' || r.category === 'Recipe Videos')
          const regularRecipes = filtered.filter(r => r.category !== 'Video Reference' && r.category !== 'Recipe Videos')
          return (
            <div className="space-y-6">
              {/* Regular Recipes */}
              <div>
                <p className="text-sm text-gray-500 mb-3">{regularRecipes.length} of {recipes.filter(r => r.category !== 'Video Reference').length} recipes</p>
                {regularRecipes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No recipes match your search</p>
                )}
                {(
                  /* Grid view — cream "index card" paper, thin red top rule,
                     title + photo tile. Shows every vault recipe as a
                     photo-first tile. Tapping opens the standard Vault
                     detail view (not the Card detail). 🃏 Pin button sits
                     under the photo so users can pin to /cards without
                     opening the recipe — matches the Card box pattern. */
                  <div className="grid grid-cols-2 gap-3">
                    {regularRecipes.map(recipe => {
                      const pinned = pinnedCards.includes(recipe.id)
                      return (
                      <div key={recipe.id} className="relative">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe) }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleFavorite(recipe) } }}
                          title={recipe.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                          className={`absolute top-2 right-2 z-10 text-lg leading-none w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors ${
                            recipe.is_favorite ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'
                          }`}
                        >
                          {recipe.is_favorite ? '❤️' : '🤍'}
                        </span>
                        <button onClick={() => { setViewing(recipe); setView('detail') }}
                          className="w-full text-left bg-amber-50 border-2 border-amber-200 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-md transition-all active:scale-95 shadow-sm">
                          <div className="bg-red-600 h-1.5" />
                          <div className="px-3 pt-3 pb-1">
                            <p className="font-bold text-xs text-gray-900 leading-snug line-clamp-2 min-h-[2rem]">{recipe.title}</p>
                          </div>
                          <div className="px-3 pb-3">
                            {recipe.photo_url ? (
                              <div style={{height:'88px'}} className="rounded-xl overflow-hidden">
                                <img loading="lazy" decoding="async" src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div style={{height:'88px'}} className="rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                                <span style={{fontSize:'28px'}}>{categoryEmoji(recipe)}</span>
                              </div>
                            )}
                          </div>
                        </button>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); toggleCardPin(recipe.id) }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleCardPin(recipe.id) } }}
                          title={pinned ? 'Pinned to Recipe Cards' : 'Pin to Recipe Cards'}
                          className={`absolute bottom-2 right-2 z-10 text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors cursor-pointer ${
                            pinned
                              ? 'bg-orange-600 text-white border-orange-600'
                              : 'bg-white/95 text-orange-700 border-orange-300 hover:bg-orange-50'
                          }`}
                        >
                          {pinned ? 'Pinned' : 'Pin to Cards'}
                        </div>
                        {/* 📅 Meal Plan pill — mirror position bottom-left
                            so it doesn't collide with 🃏 Pin in the
                            bottom-right. Same pattern: absolute over the
                            photo, white-with-amber-border when off,
                            filled amber when in the plan. */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); toggleMealPlanPick(recipe) }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleMealPlanPick(recipe) } }}
                          title={picksIds.includes(recipe.id) ? 'Remove from Meal Plan' : 'Add to Meal Plan'}
                          className={`absolute bottom-2 left-2 z-10 text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors cursor-pointer ${
                            picksIds.includes(recipe.id)
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white/95 text-amber-700 border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          {picksIds.includes(recipe.id) ? 'Planned' : 'Meal Plan'}
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>

              {/* My References Section */}
              {videoRefs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">📺</span>
                    <h2 className="text-sm font-bold text-gray-700">Recipe Videos</h2>
                    <span className="text-xs text-gray-500">({videoRefs.length})</span>
                  </div>
                  <div className="space-y-3">
                    {videoRefs.map(recipe => (
                      <VaultRecipeVideoCard key={recipe.id} recipe={recipe} supabase={supabase} user={user} onDelete={async (id) => {
                        await supabase.from('personal_recipes').delete().eq('id', id)
                        loadRecipes(user.id)
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* "Videos Only" section retired May 2026 — video-only
                  saves now live in 💎 Chef Portfolio's Learning Videos
                  section (filed from My Playbook with 💎 Move to
                  Portfolio). The educationVideos state + loader still
                  populate so Portfolio reads them, but they're not
                  rendered here on the Vault list view anymore. */}

            </div>
          )
        })()}
      </main>
    </div>
  )
}