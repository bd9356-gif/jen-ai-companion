'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import VideoItem from '@/components/VideoItem'
import ExpandableItem from '@/components/ExpandableItem'
import ChefJenItem from '@/components/ChefJenItem'
import { instructionsToString } from '@/lib/normalize_instructions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// My Playbook — your notebook from two classrooms with two teachers.
// Each teacher has the same two modes (🎓 Teach + 🍳 Practice), and
// the page nav reflects that: two stacked pill rows, one per teacher,
// with the same two pills inside each. Repeating "Teach"/"Practice"
// is fine because the row label tells you which classroom you're in.
//
//                | 🎓 Teach (learn-it) | 🍳 Practice (cook-it) |
//   Chef Jen     | chef_notes (amber)  | chef_recipes (rose)   |
//   Chef TV      | teach (sky)         | practice (orange)     |
//
// Tab keys stay the same as before (`teach` / `practice` for Chef TV
// videos, `chef_notes` / `chef_recipes` for Chef Jen saves) so
// `?tab=<key>` deep-links from /chef still work — only the visual
// grouping moved. Same Teach/Practice vocabulary as Chef TV's filter
// tabs and Chef Jennifer's mode pills, so the same two words mean
// the same two things across the app.
//
// Order: Chef Jen first (top), Chef TV second (below). She's the AI
// instructor — leads in Learning Journey on MyKitchen, leads in this
// page nav, and the default landing tab (chef_notes = her Teach
// surface) so saves from /chef land somewhere familiar.
//
// Pivot history (April 2026):
//   - Skills I Learned had 6 course-type buckets (mig 002).
//   - Collapsed to 4 intent buckets Save/Love/Cooked/Learn (mig 003).
//   - Collapsed to 3 buckets Save/Love/Learn (mig 004).
//   - Collapsed to 2 buckets Love/Learn (mig 006) — Save was the
//     "undecided" middle and didn't add signal. Chef Notes (AI answers)
//     merged in at the same time so the Playbook is the single home for
//     everything the user has saved from Chef TV and Ask Chef Jennifer.
//   - Renamed Love→Practice, Learn→Teach (mig 009) — Love is the wrong
//     word; Practice + Teach read as the teaching loop end-to-end.
//   - Folded Chef Jennifer Recipes into Playbook as a fourth tab — same
//     "all saves under one roof" framing that brought Chef Notes in.
//     `/chef-recipes` became a redirect; data shape unchanged
//     (favorites.type='ai_recipe').
//
// Bucket assignments for videos live in `cooking_skill_items` keyed by
// (user_id, item_type, item_id). Source data:
//   - saved_videos → cooking_videos (item_type='cooking_video')            (legacy)
//   - saved_education_videos → education_videos (item_type='education_video') (legacy)
//   - favorites where type in ('video_recipe','video_education') (item_type='favorite')
// AI content is sourced directly from `favorites`:
//   - favorites.type='ai_recipe' → ✨ Chef Recipes tab
//   - favorites.type='ai_answer' → 📝 Chef Notes tab
// Neither of those lives in cooking_skill_items — they aren't bucketed,
// they're separate kinds of save with no move-between UX.
const BUCKETS = [
  { key: 'teach',    emoji: '🎓', label: 'Teach',    hint: 'Videos that teach you.' },
  { key: 'practice', emoji: '🍳', label: 'Practice', hint: 'Recipes to cook.' },
]

// Full Tailwind class literals per bucket — v4 JIT requires complete strings.
const COLOR = {
  teach:    { border: 'border-2 border-sky-400',    header: 'bg-sky-100',    body: 'bg-sky-50',    title: 'text-sky-800',    pill: 'bg-sky-200 text-sky-900',       btnCls: 'border-sky-400 text-sky-800' },
  practice: { border: 'border-2 border-orange-400', header: 'bg-orange-100', body: 'bg-orange-50', title: 'text-orange-900', pill: 'bg-orange-200 text-orange-900', btnCls: 'border-orange-400 text-orange-800' },
}

// Chef Notes section uses its own color family (amber) so users
// see at a glance that it's a different kind of save (AI answers, not
// videos) and there's no bucket/move UX to worry about.
const NOTES_COLOR = {
  border: 'border-2 border-amber-400',
  header: 'bg-amber-100',
  body: 'bg-amber-50',
  title: 'text-amber-900',
  pill: 'bg-amber-200 text-amber-900',
}

// Chef Recipes section — Chef-Jennifer-generated recipes. Rose/pink
// tint to keep it distinct from Practice's orange (which is also
// "recipes" but specifically video saves). Two recipe surfaces, two
// colors, so a quick glance tells you which kind you're in.
const RECIPES_COLOR = {
  border: 'border-2 border-rose-400',
  header: 'bg-rose-100',
  body: 'bg-rose-50',
  title: 'text-rose-900',
  pill: 'bg-rose-200 text-rose-900',
}

// Given a video-item record (has _item_type, metadata on favorites, etc.),
// pick a sensible default bucket for rows that don't have an explicit
// cooking_skill_items placement yet. Recipe-bearing content → practice;
// all else → teach. Mirrors the server-side default from migration 009 so
// the UI reads consistently even before a user ever taps a bucket.
function defaultBucketFor(item) {
  if (item._item_type === 'cooking_video') return 'practice'
  if (item._item_type === 'education_video') return 'teach'
  if (item._item_type === 'favorite') return item._favType === 'video_recipe' ? 'practice' : 'teach'
  return 'teach'
}

export default function PlaybookPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])          // normalized video items with _bucket
  const [recipes, setRecipes] = useState([])      // ai_recipe favorites
  const [notes, setNotes] = useState([])          // ai_answer favorites
  // Active tab: 'teach' | 'practice' | 'chef_recipes' | 'chef_notes'.
  // Default to chef_notes — the top-left cell in the 2×2 (Chef Jen's
  // Teach surface). Two reasons: (1) Jen leads in Learning Journey,
  // so her Teach side reads as the natural landing, and (2) saves
  // from /chef Teach mode deep-link to chef_notes anyway, so an
  // untracked entry to /playbook lands on the same surface a fresh
  // save would. Deep-linkable via `?tab=<key>` so /chef can hand off
  // the user straight to the right surface after saving.
  const [tab, setTab] = useState('chef_notes')
  // Collapsed "what's on this page" tip. Folded into a tiny ℹ️ button next to
  // Chef TV in the header — keeps the body focused on tabs + content, but
  // the explainer is one tap away when needed.
  const [showAbout, setShowAbout] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // Load video saves from all three sources + bucket assignments + the
  // Chef Notes (ai_answer favorites). Merge into: items (videos) and
  // notes (answers). Items land in teach or practice; Chef Notes renders
  // in its own section below.
  //
  // Each video item carries:
  //   _item_type   : 'cooking_video' | 'education_video' | 'favorite'
  //   _item_id     : uuid used as cooking_skill_items.item_id
  //   _legacy_src  : 'cooking' | 'education' | null (for legacy remove routing)
  //   _favoriteId  : favorites.id (for favorite-source remove routing)
  //   _favType     : favorites.type for 'favorite' items, else null
  //   _bucket      : resolved bucket key (default chosen by defaultBucketFor)
  async function loadAll(userId) {
    const [{ data: sv1 }, { data: sv2 }, { data: vidFavs }, { data: bucketRows }, { data: recipeFavs }, { data: answerFavs }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['video_recipe','video_education']),
      supabase.from('cooking_skill_items').select('*').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_recipe').order('created_at', { ascending: false }),
      supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_answer').order('created_at', { ascending: false }),
    ])

    const cookingIds = (sv1 || []).map(s => s.video_id)
    const educationIds = (sv2 || []).map(s => s.video_id)
    const [{ data: cv }, { data: ev }] = await Promise.all([
      cookingIds.length ? supabase.from('cooking_videos').select('*').in('id', cookingIds) : { data: [] },
      educationIds.length ? supabase.from('education_videos').select('*').in('id', educationIds) : { data: [] },
    ])

    // Bucket lookup map keyed on `${item_type}:${item_id}`
    const bucketMap = new Map()
    for (const row of (bucketRows || [])) {
      bucketMap.set(`${row.item_type}:${row.item_id}`, row.bucket)
    }

    const legacyCooking = (cv || []).map(v => {
      const base = {
        _item_type: 'cooking_video',
        _item_id: v.id,
        _legacy_src: 'cooking',
        _favoriteId: null,
        _favType: null,
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        channel: v.channel,
      }
      base._bucket = bucketMap.get(`cooking_video:${v.id}`) || defaultBucketFor(base)
      return base
    })

    const legacyEducation = (ev || []).map(v => {
      const base = {
        _item_type: 'education_video',
        _item_id: v.id,
        _legacy_src: 'education',
        _favoriteId: null,
        _favType: null,
        id: v.id,
        youtube_id: v.youtube_id,
        title: v.title,
        channel: v.channel,
      }
      base._bucket = bucketMap.get(`education_video:${v.id}`) || defaultBucketFor(base)
      return base
    })

    // Dedupe favorites-sourced saves against legacy — if the same underlying
    // video exists in both, prefer the legacy record (simpler remove path).
    const legacyKey = new Set([...legacyCooking, ...legacyEducation].map(v => `${v._item_type}:${v._item_id}`))

    const favItems = (vidFavs || []).map(f => {
      const meta = f.metadata || {}
      const legacyType = f.type === 'video_education' ? 'education_video' : 'cooking_video'
      const refId = f.ref_id || null
      if (refId && legacyKey.has(`${legacyType}:${refId}`)) return null
      const base = {
        _item_type: 'favorite',
        _item_id: f.id,
        _legacy_src: null,
        _favoriteId: f.id,
        _favType: f.type,
        id: refId || f.id,
        youtube_id: meta.youtube_id || '',
        title: f.title || '',
        channel: meta.channel || '',
      }
      base._bucket = bucketMap.get(`favorite:${f.id}`) || defaultBucketFor(base)
      return base
    }).filter(Boolean)

    setItems([...legacyCooking, ...legacyEducation, ...favItems])
    setRecipes(recipeFavs || [])
    setNotes(answerFavs || [])
  }

  async function moveToBucket(item, bucket) {
    if (!user) return
    const { error } = await supabase.from('cooking_skill_items').upsert({
      user_id: user.id,
      item_type: item._item_type,
      item_id: item._item_id,
      bucket,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,item_type,item_id' })
    if (error) { showToast('Could not move item'); return }
    setItems(prev => prev.map(i =>
      (i._item_type === item._item_type && i._item_id === item._item_id) ? { ...i, _bucket: bucket } : i
    ))
    // Jump to the destination tab so the user sees where it went.
    setTab(bucket)
    showToast(`Moved to ${BUCKETS.find(b => b.key === bucket)?.label} ✓`)
  }

  async function removeItem(item) {
    if (!user) return
    if (item._legacy_src === 'cooking') {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._legacy_src === 'education') {
      await supabase.from('saved_education_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._favoriteId) {
      await supabase.from('favorites').delete().eq('id', item._favoriteId)
    }
    await supabase.from('cooking_skill_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', item._item_type)
      .eq('item_id', item._item_id)
    setItems(prev => prev.filter(i => !(i._item_type === item._item_type && i._item_id === item._item_id)))
    showToast('Removed')
  }

  async function removeNote(note) {
    if (!user) return
    await supabase.from('favorites').delete().eq('id', note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    showToast('Note removed')
  }

  // Promote / demote a note in the user's Recipe Vault Portfolio.
  // Uses the existing `favorites.is_in_vault` flag — no migration needed.
  // Portfolio is a curated subset (the keep-forever shelf); the note stays
  // here in Playbook regardless. Toggle is optimistic with toast feedback.
  async function togglePortfolio(note) {
    if (!user) return
    const next = !note.is_in_vault
    const { error } = await supabase
      .from('favorites')
      .update({ is_in_vault: next })
      .eq('id', note.id)
    if (error) { showToast('Could not update portfolio'); return }
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_in_vault: next } : n))
    showToast(next ? '💎 Added to Portfolio' : 'Removed from Portfolio')
  }

  async function removeRecipe(item) {
    if (!user) return
    await supabase.from('favorites').delete().eq('id', item.id)
    setRecipes(prev => prev.filter(r => r.id !== item.id))
    showToast('Recipe removed')
  }

  // Promote a Chef Jennifer recipe into the user's permanent vault.
  // Mirrors the saveToVault logic that used to live on /chef-recipes —
  // ingredients normalized to {name, measure}, instructions normalized
  // through instructionsToString(), description moved into family_notes
  // (Vault hero overlay clips long descriptions; family_notes has room),
  // and the "Saved from Chef Jennifer." attribution always trails.
  async function saveRecipeToVault(item) {
    if (!user) return
    const meta = item.metadata || {}
    const ingredients = Array.isArray(meta.ingredients) ? meta.ingredients.map(ing => {
      if (typeof ing === 'string') return { name: ing, measure: '' }
      return { name: ing?.name || '', measure: ing?.measure || '' }
    }) : []
    const description = (meta.description || '').trim()
    const familyNotes = description
      ? `${description}\n\nSaved from Chef Jennifer.`
      : 'Saved from Chef Jennifer.'
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: item.title,
      description: '',
      ingredients,
      instructions: instructionsToString(meta.instructions),
      category: '',
      tags: [],
      family_notes: familyNotes,
      photo_url: '',
      difficulty: meta.difficulty || '',
    })
    if (error) {
      showToast('Could not save to Vault')
      return
    }
    showToast('Saved to Recipe Vault ✓')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadAll(session.user.id).finally(() => setLoading(false))
    })
  }, [])

  // Deep-link `?tab=<key>` support. /chef appends this to its
  // "📘 View in Playbook →" exit cue after a save so the user lands
  // on the right surface (chef_recipes after a recipe save,
  // chef_notes after an answer save). Unknown values fall back to
  // the Teach default. Read once on mount; subsequent tab changes
  // are local state only (no URL sync — refresh shouldn't surprise
  // the user back to a stale link).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t && ['teach', 'practice', 'chef_recipes', 'chef_notes'].includes(t)) {
      setTab(t)
    }
  }, [])

  const byBucket = Object.fromEntries(BUCKETS.map(b => [b.key, []]))
  for (const it of items) {
    const key = byBucket[it._bucket] ? it._bucket : 'teach'
    byBucket[key].push(it)
  }
  const totalCount = items.length + recipes.length + notes.length

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📘 My Playbook</h1>
            {totalCount > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{totalCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/videos'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef TV</button>
            {/* About toggle — opens the per-surface explainer without
                cluttering the body. Stays small (icon-only) so it doesn't
                compete with the Chef TV action next to it. */}
            <button
              onClick={() => setShowAbout(v => !v)}
              title={showAbout ? 'Hide about' : 'What is each tab?'}
              aria-label={showAbout ? 'Hide about' : 'About this page'}
              aria-expanded={showAbout}
              className={`w-7 h-7 rounded-full border text-xs font-bold flex items-center justify-center transition-colors ${
                showAbout
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-700'
              }`}
            >
              {showAbout ? '✕' : 'ℹ'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Heading tagline — names the two-classroom framing. Each
            teacher has both 🎓 Teach and 🍳 Practice; the row labels
            below tell you which classroom each pair belongs to. */}
        <div className="text-center px-2 mb-6">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            Everything you&rsquo;ve saved
          </p>
          <p className="text-sm text-gray-500 mt-2">Your notebook from Chef Jennifer&rsquo;s classroom and Chef TV&rsquo;s.</p>
          {/* Three-pair framing line — Bill's tagline for the 2x2 grid
              below: two teachers, each with two modes, equals four
              "teaching kitchens" where instruction happens. Sits
              between the headline and the tab grid so the structure
              of the 2x2 reads as deliberate, not arbitrary. */}
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-3">
            Two instructors &middot; Two classrooms &middot; Two teaching kitchens
          </p>
        </div>

        {/* Intro callout — explains the two-classroom framing. Each
            teacher has both modes (🎓 Teach + 🍳 Practice); the rows
            below labeled with the teacher's name tell you which
            classroom each pair belongs to. Collapsed by default and
            opened via the ℹ️ toggle next to Chef TV in the header so
            the body stays focused on tabs + content. */}
        {showAbout && (
          <div className="mb-6 rounded-2xl border-2 border-slate-400 bg-slate-50 p-4 space-y-3">
            <p className="text-sm text-slate-900 leading-relaxed">
              You have two cooking teachers, and a notebook for each. Both teachers have a 🎓 <span className="font-bold">Teach</span> side and a 🍳 <span className="font-bold">Practice</span> side &mdash; the row label tells you which classroom you&rsquo;re in.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              👨‍🍳 <span className="font-bold">Chef Jennifer</span> is your AI instructor. Save the answers she teaches you (🎓 Teach) and the recipes she cooks up for you (🍳 Practice).
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              🎬 <span className="font-bold">Chef TV</span> is your video instructor. Save the technique videos that teach you (🎓 Teach) and the recipe videos you want to cook (🍳 Practice).
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your playbook...</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">📘</p>
            <p className="text-gray-500 font-medium">Your playbook is empty</p>
            <p className="text-sm text-gray-400 mt-1">Save a video from Chef TV or an answer from Chef Jennifer.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => window.location.href='/videos'} className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold">Chef TV →</button>
              <button onClick={() => window.location.href='/chef'} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Ask Chef Jennifer →</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Two-classroom nav — one stacked row per teacher, two pills
                inside each (🎓 Teach / 🍳 Practice). The teacher's name
                labels the row so a repeated "Teach" / "Practice" reads
                unambiguously: same vocabulary, two different classrooms.
                Order is locked Chef Jennifer → Chef TV. Only one pill is
                active across both rows; the active pill fills with the
                cell's color (amber / rose / sky / orange) while the
                others are muted gray. */}
            <div className="space-y-3 mb-4">
              {/* Chef Jennifer's classroom */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1">
                  👨‍🍳 Chef Jennifer
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setTab('chef_notes')}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'chef_notes' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
                    }`}
                  >
                    🎓 Teach ({notes.length})
                  </button>
                  <button
                    onClick={() => setTab('chef_recipes')}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'chef_recipes' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-rose-50'
                    }`}
                  >
                    🍳 Practice ({recipes.length})
                  </button>
                </div>
              </div>

              {/* Chef TV's classroom */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 px-1">
                  🎬 Chef TV
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setTab('teach')}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'teach' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-sky-50'
                    }`}
                  >
                    🎓 Teach ({byBucket.teach.length})
                  </button>
                  <button
                    onClick={() => setTab('practice')}
                    className={`flex-1 py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'practice' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
                    }`}
                  >
                    🍳 Practice ({byBucket.practice.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Active tab body. Each tab frames its content with its own
                soft-tint border so a user who scrolled past the pills
                still sees which surface they're in. */}
            {tab === 'teach' || tab === 'practice' ? (
              (() => {
                const b = BUCKETS.find(x => x.key === tab)
                const list = byBucket[tab]
                const c = COLOR[tab]
                return (
                  <div className={`rounded-2xl ${c.border} ${c.body} overflow-hidden shadow-sm`}>
                    <div className={`${c.header} px-3 py-2.5 flex items-center gap-2`}>
                      <span className="text-lg">🎬</span>
                      <span className={`text-sm font-bold ${c.title}`}>Chef TV &middot; {b.emoji} {b.label}</span>
                      <span className={`text-xs font-semibold ${c.pill} px-2 py-0.5 rounded-full`}>{list.length}</span>
                      {b.hint && <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">{b.hint}</span>}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {list.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-6 px-3">Nothing here yet.</p>
                      ) : (
                        list.map(item => (
                          <PlaybookRow
                            key={`${item._item_type}:${item._item_id}`}
                            item={item}
                            onMove={(bucket) => moveToBucket(item, bucket)}
                            onRemove={() => removeItem(item)}
                            currentBucket={tab}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })()
            ) : tab === 'chef_recipes' ? (
              /* Chef Recipes tab — Chef-Jennifer-generated recipes
                 (favorites.type='ai_recipe'). Not a bucket (no
                 move-between UX). ChefJenItem renders the row + the
                 in-place 💾 Save to Recipe Vault button. Empty state
                 routes users to /chef in 🍳 Practice mode. */
              <div className={`rounded-2xl ${RECIPES_COLOR.border} ${RECIPES_COLOR.body} overflow-hidden shadow-sm`}>
                <div className={`${RECIPES_COLOR.header} px-3 py-2.5 flex items-center gap-2`}>
                  <span className="text-lg">👨‍🍳</span>
                  <span className={`text-sm font-bold ${RECIPES_COLOR.title}`}>Chef Jennifer &middot; 🍳 Practice</span>
                  <span className={`text-xs font-semibold ${RECIPES_COLOR.pill} px-2 py-0.5 rounded-full`}>{recipes.length}</span>
                  <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">Recipes Chef Jennifer made for you.</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {recipes.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-400">No Chef Jennifer recipes yet.</p>
                      <button onClick={() => window.location.href='/chef'} className="mt-3 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-semibold">Ask Chef Jennifer →</button>
                    </div>
                  ) : (
                    recipes.map(item => (
                      <ChefJenItem
                        key={item.id}
                        item={item}
                        onRemove={() => removeRecipe(item)}
                        onSaveToVault={() => saveRecipeToVault(item)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Chef Notes tab — saved AI answers from Ask Chef Jennifer.
                 Not a bucket (no move-between UX), it's a separate kind
                 of content. Empty state routes users to /chef. */
              <div className={`rounded-2xl ${NOTES_COLOR.border} ${NOTES_COLOR.body} overflow-hidden shadow-sm`}>
                <div className={`${NOTES_COLOR.header} px-3 py-2.5 flex items-center gap-2`}>
                  <span className="text-lg">👨‍🍳</span>
                  <span className={`text-sm font-bold ${NOTES_COLOR.title}`}>Chef Jennifer &middot; 🎓 Teach</span>
                  <span className={`text-xs font-semibold ${NOTES_COLOR.pill} px-2 py-0.5 rounded-full`}>{notes.length}</span>
                  <span className="text-xs text-gray-500 italic ml-2 hidden sm:inline">Saved answers from Chef Jennifer.</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {notes.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-400">No saved notes yet.</p>
                      <button onClick={() => window.location.href='/chef'} className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold">Ask Chef Jennifer →</button>
                    </div>
                  ) : (
                    notes.map(note => (
                      <ExpandableItem
                        key={note.id}
                        item={note}
                        emoji="💡"
                        onRemove={() => removeNote(note)}
                        onPortfolio={() => togglePortfolio(note)}
                        inPortfolio={!!note.is_in_vault}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// One saved video row. Shows the video thumb + embed via <VideoItem>,
// plus a Move ▾ menu. With only 2 buckets, the "move to" target is
// always the single other bucket — one tap, no submenu needed.
function PlaybookRow({ item, onMove, onRemove, currentBucket }) {
  const other = BUCKETS.find(b => b.key !== currentBucket)
  const c = other ? COLOR[other.key] : null

  return (
    <div>
      <VideoItem video={item} onRemove={onRemove} />
      {other && c && (
        <div className="px-3 pb-2 pt-1 bg-white">
          <button
            onClick={() => onMove(other.key)}
            title={`Move to ${other.label}`}
            className={`text-xs font-semibold border-2 ${c.btnCls} rounded-lg px-2.5 py-1 hover:opacity-80`}
          >
            Move to {other.emoji} {other.label}
          </button>
        </div>
      )}
    </div>
  )
}
