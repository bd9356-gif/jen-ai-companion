'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import UnifiedVideoPlayer from '@/components/UnifiedVideoPlayer'
import ExpandableItem from '@/components/ExpandableItem'

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
function TagSelector({ tags, onChange }) {
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

  // Anything in `tags` that isn't a curated suggestion is a custom tag —
  // render it in its own row so the curated chips stay tidy.
  const customTags = tags.filter(t => !CURATED_TAGS.includes(t))

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
          <div className="flex gap-2">
            <input
              placeholder="Add your own tag…"
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
          {customTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                  #{tag}
                  <button type="button" onClick={() => toggleTag(tag)} className="ml-1 text-orange-400 hover:text-orange-700" aria-label={`Remove ${tag}`}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── EDIT FORM ──
function EditForm({ initial, initialIngredients, onSave, onCancel }) {
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

      <TagSelector tags={tags} onChange={setTags} />

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
        <label className={labelClass}>Family Notes</label>
        <p className={helperClass}>The story, tips, source attribution — anything you want to remember.</p>
        <textarea value={familyNotes} onChange={e => setFamilyNotes(e.target.value)}
          placeholder="The story behind this recipe, tips, memories..."
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
              <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
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
              <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
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
  const [listStyle, setListStyle] = useState('list')
  // Curated Chef Notes promoted from Playbook into Recipe Vault via the
  // "💎 Add to Portfolio" button. Backed by `favorites.is_in_vault = true`
  // on rows where `type = 'ai_answer'`. Loaded once at auth and refreshed
  // whenever the user toggles between listStyle modes.
  const [portfolioNotes, setPortfolioNotes] = useState([])
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
  // Clipboard auto-detect — when the user lands on the Import view, peek
  // at the system clipboard once and (only if it looks like a URL) offer
  // a one-tap "Use it" prompt above the URL field. Stored as the detected
  // string so it can be displayed (truncated) and applied on tap. Silent
  // when the clipboard is empty, blocked, or holds non-URL text.
  const [clipboardSuggestion, setClipboardSuggestion] = useState('')
  // Import view active tab. The page used to stack three full cards
  // (URL / Paste / JSON) which made it long and busy on first open;
  // they're alternatives — you use one per import — so a tab strip
  // collapses the page to the single chosen path. Default 'url' is
  // the most common case and lets the clipboard prompt surface
  // immediately. Values: 'url' | 'paste' | 'json'.
  const [importTab, setImportTab] = useState('url')
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
    category: '', tags: [], family_notes: '', photo_url: ''
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadRecipes(session.user.id)
      loadNotes(session.user.id)
      loadEducationVideos(session.user.id)
      loadPortfolioNotes(session.user.id)
      loadPinnedCards(session.user.id)
      loadPicksIds(session.user.id)
    })
  }, [])

  // Clipboard auto-detect: on entry to the Import view, try to read the
  // system clipboard. If it looks like an http(s) URL and the URL field
  // is empty, expose it as a one-tap suggestion. readText() requires
  // HTTPS + a recent user gesture (the tap on "📥 Import" satisfies it
  // on most browsers); when blocked it rejects silently and we just don't
  // show the prompt. Cleared whenever the user leaves Import or fills
  // the URL field manually.
  useEffect(() => {
    if (view !== 'import' || importTab !== 'url') {
      setClipboardSuggestion('')
      return
    }
    if (importUrl.trim()) return
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return
    let cancelled = false
    // Run readText() synchronously in the effect — on iOS Safari the
    // gesture window from the tap-into-Import is consumed within the
    // same animation frame, so any setTimeout (even 0ms) moves the
    // call OUT of the gesture context and the promise rejects.
    navigator.clipboard.readText().then(text => {
      if (cancelled) return
      const trimmed = (text || '').trim()
      // Conservative URL match: http(s) only, no whitespace, reasonable
      // length cap so a clipboard full of pasted text never gets offered
      // as a "URL".
      if (/^https?:\/\/\S+$/i.test(trimmed) && trimmed.length < 2000) {
        setClipboardSuggestion(trimmed)
      }
    }).catch(() => { /* permission denied / not supported — silent */ })
    return () => { cancelled = true }
  }, [view, importTab, importUrl])

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
            const items = e.clipboardData?.items
            if (!items) return
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
            // Paste happened but no image item — keep the modal open
            // so the user can try again.
            showToast('That paste didn\'t contain an image — try copying again')
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
      await supabase.from('shopping_list').insert({ user_id: user.id, ingredient, recipe_title: viewing?.title || '' })
      setAddedToList(prev => new Set([...prev, key]))
      showToast('Added to Shopping List')
    }
  }

  async function addAllToShoppingList() {
    if (!user || !viewing) return
    const ings = viewing.ingredients || []
    if (!ings.length) return
    const rows = ings.map(ing => ({ user_id: user.id, ingredient: [ing.measure, ing.name].filter(Boolean).join(' '), recipe_title: viewing.title || '' }))
    await supabase.from('shopping_list').insert(rows)
    setAddedToList(new Set(ings.map(ing => [ing.measure, ing.name].filter(Boolean).join(' ').toLowerCase())))
    showToast(`Added ${ings.length} ingredients to Shopping List`)
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

  // Chef Portfolio — saved AI answers (Chef Notes) the user has promoted
  // from /playbook into the Recipe Vault as a curated keep-forever subset.
  // The notes still live on /playbook regardless; is_in_vault just marks
  // the ones worth keeping in the Vault's Portfolio view.
  async function loadPortfolioNotes(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'ai_answer')
      .eq('is_in_vault', true)
      .order('created_at', { ascending: false })
    setPortfolioNotes(data || [])
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

  async function loadRecipes(userId) {
    const { data } = await supabase.from('personal_recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
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
    if (viewParam === 'grid') setListStyle('grid')
    else if (viewParam === 'portfolio') setListStyle('portfolio')
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
      const decoded = decodeURIComponent(importParam).trim()
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
    // Clipboard auto-jump — when the user opens the Vault and the system
    // clipboard already holds a recipe-shaped URL (typical flow: copy from
    // Safari → switch to MyRecipe), skip the list view entirely and land
    // them on the Import → URL tab with the URL pre-filled. Collapses the
    // copy-paste flow from 4 taps to 2: before was [open] → tap 📥 Import
    // → tap "Use it" → tap "Import & Clean"; after is [open] → tap
    // "Import & Clean".
    //
    // Gated so explicit deep-links always win — if ?recipe= or ?import=
    // is on the URL, the user asked for something specific and we don't
    // override. Also gated on a generous URL pattern + length cap so we
    // don't bounce on a stray non-URL string sitting on the clipboard.
    //
    // The actual import is NOT auto-fired (only pre-filled) — the user
    // still confirms by tapping the orange button. That keeps the page
    // honest: a stale URL from yesterday's copy doesn't silently re-run.
    //
    // readText() requires browser permission. Safari/iOS may block it
    // when the page wasn't opened by a recent user gesture; in that case
    // the existing in-Import clipboard prompt still catches it on the
    // next tap, so the regression-floor is "current behavior".
    if (!recipeParam && !importParam && typeof navigator !== 'undefined' && navigator.clipboard) {
      readClipboardSmart().then((trimmed) => {
        if (!trimmed) return
        // Branch A — short string that looks like a URL → URL tab.
        // Length cap of 2000 keeps this branch URL-shaped only; longer
        // pasted blobs (which are almost always page-text dumps) fall
        // through to Branch B.
        if (trimmed.length <= 2000 && /^https?:\/\/\S+$/i.test(trimmed)) {
          // Skip URLs from our own domain — copying a Vault link and
          // landing back on the Vault shouldn't try to import itself.
          if (/recipe\.mycompanionapps\.com|jen-ai-companion\.vercel\.app/i.test(trimmed)) return
          setView('import')
          setImportTab('url')
          setImportUrl(trimmed)
          return
        }
        // Branch B — long block of text that smells like a recipe → Paste
        // tab. Designed for the Shortcut path Bill uses: an iOS Shortcut
        // grabs the whole page text from a recipe site (works on sites
        // that block our scraper because it runs in his Safari context),
        // copies it to clipboard, and he opens MyRecipe. We bounce him
        // straight into Paste with the text pre-filled — no manual
        // navigate-and-paste step. Heuristic: long enough to be a real
        // page (≥ 500 chars) AND contains classic recipe vocabulary.
        // The vocab gate keeps random long clipboard blobs (an email,
        // a chat history, a story) from yanking the user into Import
        // unsolicited. False negatives are recoverable — user can still
        // tap 📥 Import → Paste manually like before.
        if (trimmed.length >= 500 && /\b(ingredient|tablespoon|teaspoon|tbsp|tsp|preheat|cup of|cups of)\b/i.test(trimmed)) {
          setView('import')
          setImportTab('paste')
          setImportText(trimmed)
        }
      }).catch(() => { /* permission denied / no clipboard text — fall through */ })
    }
  }

  // ── openImportFromClipboard() — gesture-triggered clipboard route ──
  // The on-load auto-jump in loadRecipes() works on desktop browsers
  // that have already granted clipboard permission, but iOS Safari
  // refuses navigator.clipboard.read() unless it fires from a recent
  // user gesture. This wrapper is wired to the 📥 Import button(s) so
  // tapping Import IS the gesture — iOS Safari will allow the read,
  // show its native "Paste from <App>?" prompt, and once the user
  // confirms, we route them to the right tab AND pre-fill. We do the
  // clipboard read BEFORE setView() to keep the read as close as
  // possible to the user's tap (some iOS versions are strict about
  // this). If clipboard is empty / denied / unsupported, we still
  // open Import on the URL tab so the button never feels broken.
  async function openImportFromClipboard() {
    let trimmed = ''
    try {
      trimmed = await readClipboardSmart()
    } catch { /* permission denied / unsupported */ }
    setView('import')
    if (!trimmed) return
    // Branch A — short URL on clipboard → URL tab
    if (trimmed.length <= 2000 && /^https?:\/\/\S+$/i.test(trimmed)) {
      if (/recipe\.mycompanionapps\.com|jen-ai-companion\.vercel\.app/i.test(trimmed)) return
      setImportTab('url')
      setImportUrl(trimmed)
      return
    }
    // Branch B — long recipe-shaped text → Paste tab
    if (trimmed.length >= 500 && /\b(ingredient|tablespoon|teaspoon|tbsp|tsp|preheat|cup of|cups of)\b/i.test(trimmed)) {
      setImportTab('paste')
      setImportText(trimmed)
      return
    }
    // Fallback — long blob without recipe vocab still lands on Paste
    // (better than dumping into URL where it'll fail) so Bill's
    // Shortcut output isn't gated on our regex matching every site.
    if (trimmed.length >= 200) {
      setImportTab('paste')
      setImportText(trimmed)
    }
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
    } catch (err) {
      // Permission denied (NotAllowedError) or unsupported — fall
      // back to the manual paste-target modal here too. The modal's
      // paste handler doesn't need clipboard.read() permission, just
      // a paste event from the user's long-press → Paste.
      const tag = err?.name || 'Error'
      if (tag === 'NotAllowedError' || tag === 'AbortError' || tag === 'NotFoundError') {
        setPasteTarget(recipeId)
        return
      }
      const msg = err?.message ? `: ${err.message}` : ''
      showToast(`Clipboard ${tag}${msg}`)
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
    }).select().single()
    if (!error && data) {
      setRecipes(prev => [data, ...prev])
      setForm({ title: '', description: '', ingredients: '', instructions: '', category: '', tags: [], family_notes: '', photo_url: '' })
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

  async function deleteRecipe(id) {
    await supabase.from('personal_recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    setView('list'); setViewing(null)
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
      showToast('Saved as new recipe ✓')
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
    showToast('Recipe updated ✓')
  }

  // Optional `urlOverride` lets the auto-import-on-paste flows fire
  // handleImport without having to wait for the setImportUrl state
  // update to flush — pasting a URL via "Use it" / 📋 Paste / direct
  // input paste sets the field AND immediately starts the import in
  // the same handler, so the user doesn't have to tap "Import" too.
  async function handleImport(urlOverride) {
    const urlToUse = (typeof urlOverride === 'string' ? urlOverride : importUrl).trim()
    const textToUse = importText.trim()
    if (!textToUse && !urlToUse) return
    if (urlOverride && urlToUse) setImportUrl(urlToUse)
    setImporting(true)
    setImportError('')
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToUse, url: urlToUse })
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
        family_notes: data.family_notes || '', photo_url: data.image || '' })
      setImportText(''); setImportUrl(''); setView('add')
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
  // Whether the user has any custom tags in their vault — drives the
  // single "✏️ Custom" option at the bottom of the filter dropdown.
  const hasCustomTags = allTags.some(t => !CURATED_TAGS.includes(t))

  // Top 5 most-used tags for the chip row above search
  const topTags = (() => {
    const counts = new Map()
    recipes.forEach(r => (r.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)
  })()

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
            <div className="flex gap-2">
              <button onClick={() => setView('edit')}
                className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">✏️ Edit</button>
              <button onClick={() => setView('enhance')}
                className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5">✨ AI</button>
              <button onClick={() => toggleFavorite(viewing)}
                title={viewing.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                  viewing.is_favorite ? 'bg-rose-500 text-white border-rose-500' : 'text-rose-500 border-rose-200 hover:bg-rose-50'}`}>
                {viewing.is_favorite ? '❤️ Favorite' : '🤍 Favorite'}
              </button>
              <button onClick={() => toggleCardPin(viewing.id)}
                className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                  pinnedCards.includes(viewing.id) ? 'bg-orange-600 text-white border-orange-600' : 'text-gray-500 border-gray-200'}`}>
                {pinnedCards.includes(viewing.id) ? '🃏 In Cards' : '🃏 Cards'}
              </button>
              <button onClick={async () => {
                if (picksIds.includes(viewing.id)) {
                  await supabase.from('my_picks').delete().eq('user_id', user.id).eq('recipe_id', viewing.id)
                  setPicksIds(prev => prev.filter(id => id !== viewing.id))
                  showToast('Removed from Meal Plan')
                } else {
                  await supabase.from('my_picks').upsert({ user_id: user.id, recipe_id: viewing.id, title: viewing.title, photo_url: viewing.photo_url || '', category: viewing.category || '', bucket: 'top' }, { onConflict: 'user_id,recipe_id' })
                  setPicksIds(prev => prev.includes(viewing.id) ? prev : [...prev, viewing.id])
                  showToast('Added to Meal Plan ✓')
                }
              }} className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${picksIds.includes(viewing.id) ? 'bg-orange-600 text-white border-orange-600' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}>📅 {picksIds.includes(viewing.id) ? 'In Meal Plan' : 'Meal Plan'}</button>
              <button onClick={() => deleteRecipe(viewing.id)}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Delete</button>
            </div>
          </div>
        </header>

        {/* HERO — photo (if any) or gradient fallback, with title overlay.
            Edge-to-edge on mobile; caps at max-w-2xl on desktop so it doesn't
            stretch across a wide monitor. */}
        <div className="relative w-full max-w-2xl mx-auto h-40 sm:h-52 md:h-64">
          {viewing.photo_url ? (
            <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
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

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {viewing.category && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.category}</span>}
            {viewing.difficulty && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.difficulty}</span>}
            {viewing.cooking_time && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">⏱ {viewing.cooking_time}</span>}
            {viewing.prep_time && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">🔪 {viewing.prep_time}</span>}
          </div>

          {(viewing.cooking_time || viewing.prep_time || viewing.difficulty || viewing.equipment?.length > 0 || viewing.nutrition) && (
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
                {viewing.prep_time && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">🔪</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.prep_time}</p>
                    <p className="text-xs text-gray-500">Prep Time</p>
                  </div>
                )}
                {viewing.cooking_time && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">⏱</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.cooking_time}</p>
                    <p className="text-xs text-gray-500">Cook Time</p>
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
              {viewing.nutrition && (
                <div className="bg-white rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Nutrition per serving</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['calories','protein','carbs','fat'].map(k => viewing.nutrition[k] && (
                      <div key={k} className="text-center">
                        <p className="text-xs font-bold text-orange-600">{viewing.nutrition[k]}</p>
                        <p className="text-xs text-gray-500 capitalize">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                title={detailCollapsed.notes ? 'Expand Family Notes' : 'Collapse Family Notes'}
                className="w-full flex items-center justify-between text-left"
              >
                <p className="text-xs font-semibold text-amber-800">📖 Family Notes</p>
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
            <h1 className="text-lg font-bold text-gray-900">✨ AI Kitchen Helpers</h1>
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
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-2xl p-1">
            {[
              { key: 'polish', label: '🧹 Polish' },
              { key: 'resize', label: '⚖️ Resize' },
              { key: 'info', label: '📊 Details' },
              { key: 'transform', label: '🌿 Make more…' },
            ].map(t => {
              const active = helperTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setHelperTab(t.key)}
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

          {/* 🧹 Polish Recipe — ORANGE */}
          {helperTab === 'polish' && (
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-5">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-2xl">🧹</span>
              <div>
                <p className="font-bold text-gray-900">Polish this recipe</p>
                <p className="text-xs text-gray-600 mt-0.5">AI tidies up your steps, fixes wording, and makes instructions easier to follow.</p>
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
                <p className="text-xs text-gray-600 mt-0.5">AI estimates prep & cook time, difficulty, equipment, and nutrition.</p>
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
                <p className="text-xs text-gray-600 mt-0.5">Pick one or more cooking-style preferences — AI will adjust the recipe to match.</p>
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
  if (view === 'import') {
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📥 Import Recipe</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <p className="text-sm text-gray-600">Pick a way to bring a recipe in. AI will extract and clean it up.</p>

          {/* Tab strip — three alternatives, one at a time. The page used
              to stack all three cards which was long and busy on first
              open. URL is the default and most common; Paste is the
              "site blocked the fetch" fallback; JSON is for power-user
              imports/exports. Active tab fills with orange; inactive tabs
              are gray. Equal-width grid so labels line up cleanly. */}
          <div className="grid grid-cols-3 gap-1.5 bg-gray-100 rounded-2xl p-1">
            {[
              { key: 'url', label: '🔗 URL' },
              { key: 'paste', label: '📋 Paste' },
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
              <p className="text-sm text-gray-500">Copy a recipe link and open the Import screen — the app will detect it automatically and ask if you want to import it. One tap and you&apos;re in. If the link can&apos;t be read, just switch to <button type="button" onClick={() => setImportTab('paste')} className="underline font-semibold text-gray-700 hover:text-gray-900">📋 Paste</button>.</p>

              {/* Clipboard auto-detect prompt — surfaces a URL the user
                  already copied so they don't have to paste manually. Only
                  renders when readText() succeeded with a valid http(s) URL
                  AND the input is still empty. "Use it" fills the field
                  (and the prompt clears via the field-non-empty guard);
                  ✕ dismisses without filling. */}
              {clipboardSuggestion && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-base shrink-0">📋</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-orange-900 font-semibold">URL on your clipboard</p>
                    <p className="text-xs text-orange-800 truncate">{clipboardSuggestion}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = clipboardSuggestion
                      setImportUrl(url)
                      setClipboardSuggestion('')
                      // Auto-fire the import — Bill expects "tap Use
                      // it → recipe imports", not "tap Use it → tap
                      // Import & Clean".
                      handleImport(url)
                    }}
                    className="shrink-0 text-xs font-semibold bg-orange-600 text-white rounded-lg px-3 py-1.5 hover:bg-orange-700 transition-colors"
                  >
                    Use it
                  </button>
                  <button
                    type="button"
                    onClick={() => setClipboardSuggestion('')}
                    aria-label="Dismiss"
                    className="shrink-0 text-orange-500 hover:text-orange-800 text-base leading-none px-1"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input placeholder="https://www.example.com/recipe..." value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onPaste={e => {
                    // Direct paste into the field — auto-fire the
                    // import too. Read clipboardData synchronously so
                    // we have the URL value without waiting for state.
                    const pasted = (e.clipboardData?.getData('text') || '').trim()
                    if (/^https?:\/\/\S+$/i.test(pasted) && pasted.length < 2000) {
                      // Let the default-paste fill the field, then
                      // fire the import with the pasted value.
                      setTimeout(() => handleImport(pasted), 0)
                    }
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
                      setImportUrl(trimmed)
                      setClipboardSuggestion('')
                      // Auto-fire the import — Bill expects "tap
                      // Paste → recipe imports", not "tap Paste → tap
                      // Import & Clean".
                      handleImport(trimmed)
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

          {/* Paste tab */}
          {importTab === 'paste' && (
            <div className="border-2 border-gray-200 rounded-2xl p-4 space-y-2">
              <label className="text-base font-bold text-gray-800 block">📋 Paste Recipe Text</label>
              <div className="text-sm text-gray-500 space-y-2">
                <p>Copy the recipe from the website — Select All works fine because AI filters out the noise — then paste it here. It works on every site, even the ones that try to block copying.</p>
                <p>Or use the site&apos;s Print Recipe option. Save it, copy everything when you&apos;re ready, paste it in, and let AI handle the rest. You can add the image anytime with a simple copy-and-paste.</p>
              </div>
              {/* One-tap paste from clipboard. Reliable fallback: tapping
                  this button is its own user gesture so iOS Safari will
                  show its native "Paste from..." prompt and let us read
                  the clipboard even if the auto-jump on the Import
                  button didn't fire. */}
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

          {/* Inline error banner — replaces the old alert(). Shown on
              URL/Paste tabs (where handleImport is the action). */}
          {importError && importTab !== 'json' && (
            <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold text-red-800">Couldn&apos;t import from URL</p>
              <p className="text-sm text-red-700">{importError}</p>
              <p className="text-sm text-red-700">
                👇 Switch to <button type="button" onClick={() => setImportTab('paste')} className="underline font-semibold">📋 Paste</button> and copy the recipe text from the page — it works on every site.
              </p>
            </div>
          )}

          {/* Submit button — only on URL/Paste tabs (JSON has its own). */}
          {importTab !== 'json' && (
            <button onClick={handleImport} disabled={importing || (!importText.trim() && !importUrl.trim())}
              style={{ fontSize: '16px' }}
              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm">
              {importing ? '🤖 Extracting recipe...' : '📥 Import & Clean with AI'}
            </button>
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

  // ── ADD VIEW ──
  if (view === 'add') {
    return (
      <div className="min-h-screen bg-white">
        {toastEl}
        {pasteTargetEl}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">➕ Add Recipe</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-7 pb-24">

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">📷 Photo</label>
              <div className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Preview" className="h-32 object-cover rounded-xl" />
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

            <TagSelector tags={form.tags} onChange={tags => setForm(f => ({...f, tags}))} />

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
              <label className="block text-base font-bold text-gray-800 mb-2">Family Notes</label>
              <p className="text-sm text-gray-500 mb-2">The story, tips, source attribution — anything you want to remember.</p>
              <textarea placeholder="The story behind this recipe, tips, memories..."
                value={form.family_notes} onChange={e => setForm(f => ({...f, family_notes: e.target.value}))}
                rows={8}
                style={{ fontSize: '16px' }}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base leading-snug focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 resize-y font-mono transition-colors" />
            </div>

            {/* Sticky save footer — always reachable. */}
            <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex gap-3 z-20">
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
        </main>
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      {toastEl}
      {pasteTargetEl}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-500 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">Recipe Vault</h1>
            </div>
            <div className="flex gap-1.5">
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
                  { key: 'list', icon: '📋', title: 'List view (recipes)' },
                  { key: 'grid', icon: '🖼', title: 'Grid view (recipes)' },
                  { key: 'portfolio', icon: '💎', title: 'Chef Portfolio (saved notes)' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setListStyle(opt.key)
                      const url = new URL(window.location.href)
                      if (opt.key === 'list') url.searchParams.delete('view')
                      else url.searchParams.set('view', opt.key)
                      window.history.replaceState({}, '', url.toString())
                      if (opt.key === 'portfolio' && user) loadPortfolioNotes(user.id)
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
              <button onClick={openImportFromClipboard} title="Import a recipe" className="text-base font-semibold text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5">📥</button>
              <button onClick={() => setView('add')} title="Add a recipe" className="text-base font-bold text-white bg-orange-600 rounded-lg px-2.5 py-1.5">+</button>
            </div>
          </div>
          {/* Row below the header swaps between the chip scroller and the
              full-width search input. The search toggle lives up in the
              header (see 🔍/✕ button above), so the input takes 100% of
              this row and never has to share horizontal space.
              Hidden entirely on the Portfolio view — tags are recipe
              metadata, not note metadata, so the chips/dropdown don't
              apply when the page is showing Chef Notes. */}
          {listStyle === 'portfolio' ? null : (showSearch || searchText) ? (
            <input type="text" placeholder="Search recipes..." value={searchText}
              autoFocus
              onChange={e => setSearchText(e.target.value)}
              style={{ fontSize: '16px' }}
              className="w-full border-2 border-orange-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 mb-2" />
          ) : (
            (topTags.length > 0 || favoritesCount > 0) && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2 -mx-1 px-1 scrollbar-thin">
                <button
                  onClick={() => setSearchTag('')}
                  title="Show all recipes"
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-colors ${
                    !searchTag ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  All
                </button>
                {favoritesCount > 0 && (
                  <button
                    onClick={() => setSearchTag(searchTag === '__favorites__' ? '' : '__favorites__')}
                    title="Show only favorited recipes"
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-colors ${
                      searchTag === '__favorites__'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    ❤️ Favorites ({favoritesCount})
                  </button>
                )}
                {topTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchTag(searchTag === tag ? '' : tag)}
                    title={`Filter by #${tag}`}
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-colors ${
                      searchTag === tag ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )
          )}
          {/* Tag overflow dropdown — also hidden on Portfolio view.
              Tags don't apply to Chef Notes. */}
          {listStyle !== 'portfolio' && allTags.length > topTags.length && (
            // Filter dropdown — mirrors the form's three groups via
            // <optgroup>. Each group lists only the curated tags the
            // user has actually applied to their recipes (so we don't
            // show empty options). Custom tags collapse to a single
            // "✏️ Custom" entry at the bottom — picking it filters to
            // every recipe with any non-curated tag, matching how
            // custom tags render as one row in the form.
            <select
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
              title="All tags (overflow)"
            >
              <option value="">All tags…</option>
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
              {hasCustomTags && (
                <option value="__custom__">✏️ Custom</option>
              )}
            </select>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading your vault...</div>
        ) : listStyle === 'portfolio' ? (
          /* 💎 Chef Portfolio — curated Chef Notes the user has promoted
             from /playbook. Notes (saved AI answers), not recipes — so
             this branch replaces the regular recipe list/grid entirely.
             Tap a row to expand; tap the × to remove from the Portfolio
             (the underlying note stays in Playbook). */
          <div>
            <div className="mb-4 rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-3">
              <p className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <span>💎</span><span>Chef Portfolio</span>
              </p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your place to store the <strong>My Playbook</strong>{' '}notes you want to keep from your cooking questions. It&apos;s simply where you choose to send your saved answers so everything stays organized. Your Portfolio.
              </p>
              <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                Tap <strong>×</strong> to send it back.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-3">{portfolioNotes.length} {portfolioNotes.length === 1 ? 'note' : 'notes'} in your Portfolio</p>
            {portfolioNotes.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-4xl mb-3">💎</p>
                <p className="text-gray-700 font-semibold mb-1">Nothing filed yet</p>
                <p className="text-gray-500 text-sm mb-5 px-6">Open My Playbook → 📝 Chef Notes, zip through the inbox, and tap <strong>💎 File to Portfolio</strong> on the keepers.</p>
                <button onClick={() => window.location.href='/playbook?tab=chef_notes'} className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold">Open Chef Notes →</button>
              </div>
            ) : (
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
              <button onClick={() => setView('add')} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold w-48">+ Add a Recipe</button>
              <button onClick={openImportFromClipboard} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold w-48">📥 Import a Recipe</button>
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
                {listStyle === 'grid' ? (
                  /* Grid view — cream "index card" paper, thin red top rule,
                     title + photo tile. Shows every vault recipe as a
                     photo-first tile. Tapping opens the standard Vault
                     detail view (not the Card detail). */
                  <div className="grid grid-cols-2 gap-3">
                    {regularRecipes.map(recipe => (
                      <div key={recipe.id} className="relative">
                        {/* Heart overlay — absolute-positioned so it sits
                            on top of the card without nesting a <button>
                            inside the outer <button>. stopPropagation keeps
                            the tap from also opening the recipe. */}
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
                            <p className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 min-h-[2.5rem]">{recipe.title}</p>
                          </div>
                          <div className="px-3 pb-3">
                            {recipe.photo_url ? (
                              <div style={{height:'100px'}} className="rounded-xl overflow-hidden">
                                <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div style={{height:'100px'}} className="rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                                <span style={{fontSize:'32px'}}>{categoryEmoji(recipe)}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {regularRecipes.map(recipe => (
                      <button key={recipe.id} onClick={() => { setViewing(recipe); setView('detail') }}
                        className="w-full text-left bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-orange-200 hover:bg-orange-50 transition-colors">
                        <div className="flex gap-3 p-4">
                          {recipe.photo_url ? (
                            <img src={recipe.photo_url} alt={recipe.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                              <span className="text-2xl">🍽️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate mb-1">{recipe.title}</p>
                            {recipe.description && <p className="text-xs text-gray-500 truncate mb-1">{recipe.description}</p>}
                            <div className="flex flex-wrap gap-1">
                              {recipe.category && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{recipe.category}</span>}
                              {(recipe.tags || []).slice(0, 3).map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          {/* Heart toggle — taps don't bubble up to the
                              outer card click, so users can favorite without
                              opening the recipe. Keeps a visible 🤍 even when
                              empty so the affordance is always discoverable. */}
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(recipe) }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleFavorite(recipe) } }}
                            title={recipe.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            className={`self-center text-lg leading-none px-2 py-1 rounded-lg transition-colors ${
                              recipe.is_favorite ? 'text-rose-500' : 'text-gray-300 hover:text-rose-400'
                            }`}
                          >
                            {recipe.is_favorite ? '❤️' : '🤍'}
                          </span>
                          <span className="text-gray-400 text-xl self-center">→</span>
                        </div>
                      </button>
                    ))}
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

              {/* Education Videos Section */}
              {educationVideos.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">📚</span>
                    <h2 className="text-sm font-bold text-gray-700">Videos Only</h2>
                    <span className="text-xs text-gray-500">({educationVideos.length})</span>
                  </div>
                  <div className="space-y-3">
                    {educationVideos.map(item => (
                      <EducationVideoCard key={item.id} item={item} onDelete={deleteEducationVideo} />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        })()}
      </main>
    </div>
  )
}