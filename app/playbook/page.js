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

// My Studio — your notebook from two classrooms with two teachers.
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
// `label` drives the pill text (kept short — Teach / Practice — to
// match the locked Teach/Practice vocabulary across the app). The
// body header inside each open cell reads richer using `bodyEmoji`
// + `bodyName` + `desc`, so the pill stays scannable but the cell
// itself reads like a labeled room ("Learning Videos / Watch & Cook").
const BUCKETS = [
  // Body section names + taglines kept consistent with the info-callout
  // phrasing (May 2026): each notebook has a 🎓 Teach book and a 🍳
  // Practice book; the descriptor says what's saved in this one.
  { key: 'teach',    emoji: '🎓', label: 'Teach',    bodyEmoji: '🎓', bodyName: 'Teach',    desc: 'Your technique videos go here — keep what helps, clear the rest.' },
  { key: 'practice', emoji: '🍳', label: 'Practice', bodyEmoji: '🍳', bodyName: 'Practice', desc: 'Your cooking videos go here — save the keepers, clear the rest.' },
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
  const [studyResults, setStudyResults] = useState([]) // 🎓 Study Hall history
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
  // (vaultIds session-Set retired April 2026 in favor of `_inVault` on
  // each item — single source of truth that's set at load time AND
  // refreshed on visibilitychange, so deletes-elsewhere flip the
  // button back to "🔐 Move to Recipe Vault" automatically.)

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
    const [{ data: sv1 }, { data: sv2 }, { data: vidFavs }, { data: bucketRows }, { data: recipeFavs }, { data: answerFavs }, { data: vaultRecipes }, { data: studyHall }] = await Promise.all([
      supabase.from('saved_videos').select('video_id').eq('user_id', userId),
      supabase.from('saved_education_videos').select('video_id').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).in('type', ['video_recipe','video_education']),
      supabase.from('cooking_skill_items').select('*').eq('user_id', userId),
      supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_recipe').order('created_at', { ascending: false }),
      supabase.from('favorites').select('*').eq('user_id', userId).eq('type', 'ai_answer').order('created_at', { ascending: false }),
      // Pull every ACTIVE Vault recipe's photo_url so we can detect
      // which Chef TV videos already in the Vault flip the per-row
      // "✓ In Recipe Vault" badge. Soft-deleted rows (deleted_at IS
      // NOT NULL) are intentionally excluded — a recipe sitting in
      // Settings → Recently Deleted isn't really "in the Vault"; the
      // badge would be stale. Match is by youtube_id parsed out of
      // the photo_url (saveToKitchen / saveVideoToVault both write
      // the YouTube hqdefault URL).
      supabase.from('personal_recipes')
        .select('photo_url')
        .eq('user_id', userId)
        .is('deleted_at', null),
      // 🎓 Study Hall history — every completed quiz attempt. Renders
      // as a "Lessons Learned" section on Playbook. Limit to recent
      // history to keep the section scannable.
      supabase.from('study_hall_results')
        .select('*')
        .eq('user_id', userId)
        .order('taken_at', { ascending: false })
        .limit(50),
    ])

    const vaultYoutubeIds = new Set()
    for (const r of (vaultRecipes || [])) {
      const m = (r.photo_url || '').match(/youtube\.com\/vi\/([^/]+)\//)
      if (m && m[1]) vaultYoutubeIds.add(m[1])
    }
    // Set of favorites IDs (and youtube_ids) that are currently in
    // Portfolio (`favorites.is_in_vault=true`). Used to stamp
    // `_inPortfolio` on Teach items so the row badge reflects the
    // Portfolio state without requiring the user to refresh.
    const portfolioFavIds = new Set()
    const portfolioYoutubeIds = new Set()
    for (const f of (vidFavs || [])) {
      if (!f.is_in_vault) continue
      portfolioFavIds.add(f.id)
      const yt = f.metadata?.youtube_id
      if (yt) portfolioYoutubeIds.add(yt)
    }

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
        _inVault: vaultYoutubeIds.has(v.youtube_id),
        _inPortfolio: portfolioYoutubeIds.has(v.youtube_id),
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
        _inVault: vaultYoutubeIds.has(v.youtube_id),
        _inPortfolio: portfolioYoutubeIds.has(v.youtube_id),
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
      const yt = meta.youtube_id || ''
      const base = {
        _item_type: 'favorite',
        _item_id: f.id,
        _legacy_src: null,
        _favoriteId: f.id,
        _favType: f.type,
        id: refId || f.id,
        youtube_id: yt,
        title: f.title || '',
        channel: meta.channel || '',
        _inVault: yt ? vaultYoutubeIds.has(yt) : false,
        _inPortfolio: !!f.is_in_vault,
      }
      base._bucket = bucketMap.get(`favorite:${f.id}`) || defaultBucketFor(base)
      return base
    }).filter(Boolean)

    // MOVE semantics (May 2026): items filed to Portfolio leave the
    // notebook (_inPortfolio filters them out). We deliberately do NOT
    // filter by _inVault — under proper MOVE semantics saving to the
    // Vault deletes the Playbook rows, so an item can't be in both
    // places. For LEGACY data where an old broken saveToKitchen left
    // favorites + cooking_skill_items behind alongside a Vault row,
    // the user still expects to see the Practice save they made — so
    // we show it. If the duplicate bugs the user, they can manage it
    // from either side (the modern saveToKitchen + saveVideoToVault
    // both clean the Playbook rows on use). Filtering by _inVault
    // hid legitimate saves and was the cause of the May 2026 "videos
    // I once had don't show in MyPlaybook" report.
    const visibleItems = [...legacyCooking, ...legacyEducation, ...favItems]
      .filter(i => !i._inPortfolio)
    setItems(visibleItems)
    // Chef Jennifer Practice tab — only show recipes that haven't been
    // moved to the Vault. Mirrors Chef Notes' inbox semantics. Vault
    // delete is permanent (no round-trip), so the favorites row's
    // is_in_vault flag stays true forever once moved.
    setRecipes((recipeFavs || []).filter(r => !r.is_in_vault))
    // Chef Notes is the inbox of UNFILED notes. Once the user taps
    // "💎 Move to Learning Vault" on /playbook (or "Move to Learning Vault" from
    // the row), the note is moved to /secret?view=portfolio and
    // disappears from this list. Filing = move (not copy), matching
    // Bill's "zip through, file the keepers, delete the rest" workflow.
    setNotes((answerFavs || []).filter(n => !n.is_in_vault))
    setStudyResults(studyHall || [])
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

  // Move a Chef TV Teach video to the Recipe Vault Portfolio. Updated
  // April 2026 to mirror the Practice → Recipe Vault behavior — the
  // video STAYS in Teach after the move, with the per-row button
  // flipping to "✓ In Learning Vault". Filing is non-destructive: the
  // bucket placement and underlying save record are kept. Un-filing
  // (× on the Portfolio row in /secret) flips is_in_vault back to
  // false, and the next visibility refresh on Playbook drops the
  // "✓ In Learning Vault" badge.
  async function moveVideoToPortfolio(item) {
    if (!user) return
    if (item._favoriteId) {
      // Already a favorites row — flip is_in_vault=true so the video
      // shows on /secret?view=portfolio, AND delete the bucket placement
      // so it leaves Chef TV · Teach entirely. MOVE semantics (May 2026):
      // the notebook is an inbox; once filed, the video leaves. Un-filing
      // from Portfolio (× on the row in the Vault) re-creates the
      // cooking_skill_items row with bucket='teach' so the round-trip
      // is preserved — see removeVideoFromPortfolio in /secret.
      const { error } = await supabase
        .from('favorites')
        .update({ is_in_vault: true })
        .eq('id', item._favoriteId)
      if (error) { showToast('Could not move to Learning Vault'); return }
      await supabase.from('cooking_skill_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', item._item_type)
        .eq('item_id', item._item_id)
      setItems(prev => prev.filter(i => !(i._item_type === item._item_type && i._item_id === item._item_id)))
      showToast('🎓 Moved to Learning Vault')
      return
    }
    if (item._legacy_src) {
      // Legacy cooking_video / education_video → synthesize a favorites
      // row with is_in_vault=true so the video shows up on the Portfolio
      // surface, then DROP the bucket placement (and the legacy save row)
      // so the video leaves Teach entirely under MOVE semantics. If the
      // user un-files from Portfolio later, removeVideoFromPortfolio
      // restores the bucket placement so the video returns to Teach.
      const favType = item._legacy_src === 'education' ? 'video_education' : 'video_recipe'
      const { data: inserted, error: insErr } = await supabase.from('favorites').insert({
        user_id: user.id,
        type: favType,
        title: item.title,
        thumbnail_url: item.youtube_id ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg` : null,
        source: 'chef_tv',
        metadata: { youtube_id: item.youtube_id || '', channel: item.channel || '', legacy_video_id: item._item_id },
        is_in_vault: true,
      }).select('id').single()
      if (insErr || !inserted) { showToast('Could not move to Learning Vault'); return }
      // Drop the bucket placement — the video is leaving Teach.
      await supabase.from('cooking_skill_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', item._item_type)
        .eq('item_id', item._item_id)
      // Remove the legacy saved-video row.
      const legacyTable = item._legacy_src === 'education' ? 'saved_education_videos' : 'saved_videos'
      await supabase.from(legacyTable).delete().eq('user_id', user.id).eq('video_id', item._item_id)
      // Filter from local state — the row leaves Teach immediately.
      setItems(prev => prev.filter(i => !(i._item_type === item._item_type && i._item_id === item._item_id)))
      showToast('🎓 Moved to Learning Vault')
    }
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

  // File a Chef Note out of the inbox into the Recipe Vault Portfolio.
  // Uses the existing `favorites.is_in_vault` flag — no migration needed.
  // Filing is a MOVE (not a copy): the note disappears from this Chef Notes
  // inbox after filing, matching Bill's "zip through, file keepers, delete
  // the rest" workflow. To un-file, tap × on the row in the Portfolio view —
  // the note returns here as unfiled.
  async function togglePortfolio(note) {
    if (!user) return
    // .select() so we can detect "succeeded with 0 rows" (RLS blocked)
    // vs real success. Without that the user could see the note vanish
    // from the inbox even when the move didn't actually persist.
    const { data: moved, error } = await supabase
      .from('favorites')
      .update({ is_in_vault: true })
      .eq('id', note.id)
      .select('id')
    if (error) { showToast(`Could not move note: ${error.message}`); return }
    if (!moved || moved.length === 0) {
      showToast('Move did not take effect (RLS?)')
      return
    }
    setNotes(prev => prev.filter(n => n.id !== note.id))
    showToast('🎓 Moved to Learning Vault')
  }

  async function removeRecipe(item) {
    if (!user) return
    await supabase.from('favorites').delete().eq('id', item.id)
    setRecipes(prev => prev.filter(r => r.id !== item.id))
    showToast('Recipe removed')
  }

  // Save a Chef TV video's recipe into the user's permanent Recipe Vault.
  // Mirrors the saveToKitchen logic on /videos but invoked from inside
  // Playbook's 🍳 Practice tab — same flow, second surface. Item shape
  // differs by source (legacy cooking_video vs favorites-sourced
  // video_recipe), so the metadata fetch picks the right table on each
  // path. The video stays in Practice — saving to the Vault doesn't
  // remove it from Playbook (the user might still want to rewatch).
  async function saveVideoToVault(item) {
    if (!user) return
    let recipe = null
    if (item._favoriteId) {
      const { data: f } = await supabase
        .from('favorites').select('metadata').eq('id', item._favoriteId).maybeSingle()
      recipe = f?.metadata || null
    } else if (item._item_type === 'cooking_video') {
      const { data: meta } = await supabase
        .from('video_metadata').select('*').eq('video_id', item.id).maybeSingle()
      recipe = meta || null
    }
    if (!recipe?.ingredients?.length) {
      showToast('No recipe data found for this video')
      return
    }
    const { error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: item.title,
      description: recipe.ai_summary || '',
      ingredients: recipe.ingredients,
      instructions: recipe.instructions || '',
      category: '',
      // Source-stamp — see saveToKitchen on /videos for the rationale.
      tags: ['chef-tv'],
      family_notes: `Saved from Chef TV — ${item.channel || ''}.`.replace(' — .', '.'),
      photo_url: item.youtube_id ? `https://img.youtube.com/vi/${item.youtube_id}/hqdefault.jpg` : '',
      difficulty: '',
      servings: null,
    })
    if (error) { showToast('Could not save to Vault'); return }
    // MOVE semantics (May 2026): the Vault is the home — delete the
    // Playbook bucket placement AND the underlying favorite/legacy save
    // row so the video leaves the notebook entirely. Vault delete is
    // permanent; the round-trip back to Practice doesn't exist by design
    // (the Vault is the working cookbook, not an archive).
    await supabase.from('cooking_skill_items')
      .delete()
      .eq('user_id', user.id)
      .eq('item_type', item._item_type)
      .eq('item_id', item._item_id)
    if (item._legacy_src === 'cooking') {
      await supabase.from('saved_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._legacy_src === 'education') {
      await supabase.from('saved_education_videos').delete().eq('user_id', user.id).eq('video_id', item._item_id)
    } else if (item._favoriteId) {
      await supabase.from('favorites').delete().eq('id', item._favoriteId)
    }
    // Filter (not map) — the row disappears from Playbook on save, same
    // as Chef Notes → Portfolio. The user's notebook stays an inbox.
    setItems(prev => prev.filter(i => !(i._item_type === item._item_type && i._item_id === item._item_id)))
    showToast('Saved to Recipe Vault ✓')
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
      // Source-stamp so the user can one-tap filter their Vault (and
      // Cards) down to "show me everything Chef Jennifer made for me".
      tags: ['chef-jen'],
      family_notes: familyNotes,
      // Branded default photo for Chef Jennifer recipes promoted to
      // the Vault. Lives in /public so it ships with the build; user
      // can swap it for a real photo from the recipe detail view.
      photo_url: '/chef-jen-recipe.jpg',
      difficulty: meta.difficulty || '',
    })
    if (error) {
      showToast('Could not save to Vault')
      return
    }
    // MOVE semantics (May 2026): flip favorites.is_in_vault=true so the
    // recipe disappears from this Practice tab (loadAll filters by the
    // flag, mirroring the Chef Notes → Portfolio pattern). Vault delete
    // is permanent — no round-trip back to Practice. If the user wants
    // a recipe back, ask Chef Jennifer for it again; the corpus mining
    // cache will likely surface it on the next adapt pass.
    const { error: lockErr } = await supabase
      .from('favorites').update({ is_in_vault: true }).eq('id', item.id)
    if (lockErr) { showToast('Could not move recipe'); return }
    setRecipes(prev => prev.filter(r => r.id !== item.id))
    showToast('Saved to Recipe Vault ✓')
  }

  // Re-check which Practice videos are in the Recipe Vault AND which
  // Teach videos are currently in Portfolio. Lightweight version of
  // loadAll's two scans — only re-queries `personal_recipes` and the
  // video favorites' `is_in_vault` flag, then re-stamps `_inVault` and
  // `_inPortfolio` on existing items in place. Runs whenever the
  // Playbook tab regains visibility (e.g. user deleted a recipe on
  // /secret or un-filed a video from Portfolio and switched back),
  // so both badges flip back to their default "Move to ..." states
  // without a hard reload.
  async function refreshInVaultStatus(userId) {
    const [{ data: vaultRecipes }, { data: portfolioFavs }] = await Promise.all([
      supabase.from('personal_recipes').select('photo_url').eq('user_id', userId),
      supabase.from('favorites').select('id, metadata, is_in_vault').eq('user_id', userId).in('type', ['video_recipe', 'video_education']),
    ])
    const vaultYoutubeIds = new Set()
    for (const r of (vaultRecipes || [])) {
      const m = (r.photo_url || '').match(/youtube\.com\/vi\/([^/]+)\//)
      if (m && m[1]) vaultYoutubeIds.add(m[1])
    }
    const portfolioFavIds = new Set()
    const portfolioYoutubeIds = new Set()
    for (const f of (portfolioFavs || [])) {
      if (!f.is_in_vault) continue
      portfolioFavIds.add(f.id)
      const yt = f.metadata?.youtube_id
      if (yt) portfolioYoutubeIds.add(yt)
    }
    setItems(prev => prev.map(it => ({
      ...it,
      _inVault: it.youtube_id ? vaultYoutubeIds.has(it.youtube_id) : false,
      _inPortfolio: it._favoriteId
        ? portfolioFavIds.has(it._favoriteId)
        : it.youtube_id ? portfolioYoutubeIds.has(it.youtube_id) : false,
    })))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadAll(session.user.id).finally(() => setLoading(false))
    })
  }, [])

  // Re-fetch vault status whenever the page regains visibility — covers
  // the "user deleted the recipe in another tab" case so the Practice
  // button flips back to "🔐 Move to Recipe Vault" without requiring
  // a manual refresh of Playbook.
  useEffect(() => {
    if (!user) return
    function onVisibility() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshInVaultStatus(user.id)
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
  }, [user])

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading URL params on mount; no SSR alternative
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
            <h1 className="text-lg font-bold text-gray-900">📘 My Studio</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/chef'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Chef Jen</button>
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
        {/* Heading tagline — single line that ties the page to the
            two-classroom framing without belaboring it. The 2x2 grid
            below makes the "two classrooms, two modes" structure
            visible; the tagline just names what's saved here. */}
        <div className="text-center px-2 mb-6">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight tracking-tight">
            Everything you&rsquo;ve saved
          </p>
          <p className="text-base text-gray-500 mt-2">in your two teaching notebooks.</p>
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
              You have two cooking teachers, and a notebook for each.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              Each notebook has a 🎓 <span className="font-bold">Teach</span>{' '}book and a 🍳 <span className="font-bold">Practice</span>{' '}book &mdash; the labels tell you which notebook you&rsquo;re in.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              👨‍🍳 <span className="font-bold">Chef Jennifer (AI)</span>: save the answers she teaches in 🎓 Teach, and the recipes she creates in 🍳 Practice.
            </p>
            <p className="text-sm text-slate-900 leading-relaxed">
              🎬 <span className="font-bold">Chef TV (video)</span>: save technique videos in 🎓 Teach, and recipe videos you want to cook in 🍳 Practice.
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
            {/* Two-classroom nav — side-by-side columns, one per teacher.
                Each column has the teacher name on top, then 🎓 Teach
                and 🍳 Practice stacked vertically below. Reading the page
                left-to-right names the two teachers; reading top-to-bottom
                inside a column names that teacher's two modes. Same
                Teach/Practice vocabulary repeats across columns — the
                column header tells you which classroom you're in.
                Order is locked Chef Jennifer (left) → Chef TV (right).
                Only one pill is active across the whole grid; the active
                pill fills with its cell color (amber / rose / sky /
                orange) while the others are muted gray. */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Chef Jennifer's column */}
              <div>
                {/* Column header is a tappable link to /chef so users can
                    jump from Playbook back to the source surface (where
                    they generated the saves they're now reviewing). */}
                <button
                  onClick={() => window.location.href = '/chef'}
                  title="Open Chef Jennifer"
                  className="block w-full hover:text-orange-600 mb-1.5 px-1 text-center"
                >
                  <p className="text-[12px] font-bold text-gray-700 leading-tight">👨‍🍳 Chef Jennifer&rsquo;s</p>
                  <p className="text-[11px] font-semibold italic text-orange-600 leading-tight mt-0.5 pl-5">Classroom</p>
                </button>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setTab('chef_notes')}
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'chef_notes' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-50'
                    }`}
                  >
                    🎓 Teach ({notes.length})
                  </button>
                  <button
                    onClick={() => setTab('chef_recipes')}
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'chef_recipes' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-rose-50'
                    }`}
                  >
                    🍳 Practice ({recipes.length})
                  </button>
                </div>
              </div>

              {/* Chef TV's column */}
              <div>
                {/* Column header is a tappable link to /videos — same
                    pattern as the Chef Jennifer column. */}
                <button
                  onClick={() => window.location.href = '/videos'}
                  title="Open Chef TV"
                  className="block w-full hover:text-orange-600 mb-1.5 px-1 text-center"
                >
                  <p className="text-[12px] font-bold text-gray-700 leading-tight">🎬 Chef TV&rsquo;s</p>
                  <p className="text-[11px] font-semibold italic text-orange-600 leading-tight mt-0.5 pl-5">Classroom</p>
                </button>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setTab('teach')}
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-colors ${
                      tab === 'teach' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-sky-50'
                    }`}
                  >
                    🎓 Teach ({byBucket.teach.length})
                  </button>
                  <button
                    onClick={() => setTab('practice')}
                    className={`w-full py-2 rounded-full text-xs font-semibold transition-colors ${
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
                    <div className={`${c.header} px-3 py-2.5`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎬</span>
                        <span className={`text-sm font-bold ${c.title}`}>Chef TV &middot; {b.bodyEmoji} {b.bodyName}</span>
                        <span className={`text-xs font-semibold ${c.pill} px-2 py-0.5 rounded-full`}>{list.length}</span>
                      </div>
                      {b.desc && <p className="text-xs text-gray-600 mt-1 ml-7">{b.desc}</p>}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {list.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-6 px-3">Nothing here yet.</p>
                      ) : (
                        list.map(item => {
                          const key = `${item._item_type}:${item._item_id}`
                          return (
                            <PlaybookRow
                              key={key}
                              item={item}
                              onMove={(bucket) => moveToBucket(item, bucket)}
                              onSaveToVault={() => saveVideoToVault(item)}
                              onMoveToPortfolio={() => moveVideoToPortfolio(item)}
                              inVault={!!item._inVault}
                              inPortfolio={!!item._inPortfolio}
                              onRemove={() => removeItem(item)}
                              currentBucket={tab}
                            />
                          )
                        })
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
                <div className={`${RECIPES_COLOR.header} px-3 py-2.5`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍🍳</span>
                    <span className={`text-sm font-bold ${RECIPES_COLOR.title}`}>Chef Jennifer &middot; 🍳 Practice</span>
                    <span className={`text-xs font-semibold ${RECIPES_COLOR.pill} px-2 py-0.5 rounded-full`}>{recipes.length}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-7">The recipes we make together go here &mdash; save the keepers, clear the rest.</p>
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
                <div className={`${NOTES_COLOR.header} px-3 py-2.5`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍🍳</span>
                    <span className={`text-sm font-bold ${NOTES_COLOR.title}`}>Chef Jennifer &middot; 🎓 Teach</span>
                    <span className={`text-xs font-semibold ${NOTES_COLOR.pill} px-2 py-0.5 rounded-full`}>{notes.length}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-7">Your questions go here &mdash; keep what helps, clear the rest.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {notes.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-gray-400">Inbox is empty — nothing waiting to be filed.</p>
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

        {/* 🎓 Lessons Learned — Study Hall history. Lives outside the
            2×2 classroom grid because it's neither Teach nor Practice
            content; it's the *record* of what you've studied. Shows
            up only after the user has taken at least one quiz. Each
            row is one attempt — date, article, score. Clicking the
            article title returns the user to Library so they can
            re-read and re-take. */}
        {studyResults.length > 0 && (
          <div className="mt-6">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 overflow-hidden shadow-sm">
              <div className="bg-emerald-50 px-3 py-2.5 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  <span className="text-sm font-bold text-emerald-900">Lessons Learned</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">{studyResults.length}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 ml-7">Your Study Hall history &mdash; every quiz Chef Jen gave you.</p>
              </div>
              <div className="divide-y divide-emerald-100">
                {studyResults.map(r => {
                  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0
                  const date = new Date(r.taken_at)
                  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  return (
                    <a
                      key={r.id}
                      href={`/guides?article=${r.article_id}`}
                      className="block px-3 py-2.5 hover:bg-emerald-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-12 h-12 rounded-full bg-white border-2 border-emerald-200 flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-emerald-700 leading-none">{r.score}/{r.total}</span>
                          <span className="text-[10px] text-emerald-600 leading-none mt-0.5">{pct}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.article_title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{dateStr}</p>
                        </div>
                        <span className="text-gray-300 text-sm shrink-0">›</span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// One saved video row. Shows the video thumb + embed via <VideoItem>,
// plus an action button below the thumb.
//   - currentBucket = 'practice': button reads "Move to Recipe Vault"
//     and calls onSaveToVault — copies the video's recipe into the
//     user's personal Recipe Vault. The video stays in Practice (this
//     is a cross-surface save, not a bucket move).
//   - currentBucket = 'teach': button reads "Move to 🍳 Practice"
//     and calls onMove — swaps to the other bucket. Existing behavior.
// The Practice → Recipe Vault path is a real product gesture: "I want
// to actually cook this." It mirrors the 💾 Save to My Kitchen button
// on Chef TV's Recipe view, surfaced here for users browsing their
// saved Practice videos in Playbook.
function PlaybookRow({ item, onMove, onSaveToVault, onMoveToPortfolio, inVault, inPortfolio, onRemove, currentBucket }) {
  const isPractice = currentBucket === 'practice'
  const isTeach = currentBucket === 'teach'

  return (
    <div>
      <VideoItem video={item} onRemove={onRemove} />
      <div className="px-3 pb-2 pt-1 bg-white">
        {isPractice ? (
          // Practice: "🔐 Move to Recipe Vault" → "✓ In Recipe Vault"
          // (disabled emerald confirmation after save). Persistent —
          // _inVault flips back automatically when the user deletes
          // the recipe in /secret and returns to this tab.
          inVault ? (
            <button
              type="button"
              disabled
              title="This recipe is in your Recipe Vault"
              className="text-xs font-semibold border-2 border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 cursor-default"
            >
              ✓ In Recipe Vault
            </button>
          ) : (
            <button
              onClick={onSaveToVault}
              title="Save this recipe to your Recipe Vault"
              className="text-xs font-semibold border-2 border-orange-300 bg-orange-50 text-orange-700 rounded-lg px-2.5 py-1 hover:opacity-80"
            >
              🔐 Move to Recipe Vault
            </button>
          )
        ) : isTeach ? (
          // Teach: "🎓 Move to Learning Vault" → "✓ In Learning Vault" (disabled
          // emerald confirmation after save). Same persistence pattern
          // as Practice — _inPortfolio flips back when the user un-files
          // the video from Portfolio in /secret. Video stays visible
          // in Teach the whole time so the user can see the new badge.
          inPortfolio ? (
            <button
              type="button"
              disabled
              title="This video is in your Recipe Vault Portfolio"
              className="text-xs font-semibold border-2 border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 cursor-default"
            >
              ✓ In Learning Vault
            </button>
          ) : (
            <button
              onClick={onMoveToPortfolio}
              title="Move this technique video to your Recipe Vault Portfolio"
              className="text-xs font-semibold border-2 border-orange-300 bg-orange-50 text-orange-700 rounded-lg px-2.5 py-1 hover:opacity-80"
            >
              🎓 Move to Learning Vault
            </button>
          )
        ) : null}
      </div>
    </div>
  )
}