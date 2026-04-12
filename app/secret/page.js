'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SUGGESTED_TAGS = [
  'chicken','beef','pork','fish','seafood','pasta','pizza',
  'soup','salad','dessert','breakfast','bread','vegetarian',
  'quick','family','holiday','comfort food','baking','healthy'
]

// ── TAG SELECTOR DROPDOWN ──
function TagSelector({ tags, onChange }) {
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">🏷️ Tags</label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 hover:border-orange-300 transition-colors"
        >
          <span className="text-gray-500">{tags.length > 0 ? `${tags.length} tag${tags.length > 1 ? 's' : ''} selected` : 'Select tags...'}</span>
          <span className="text-gray-400 text-xs ml-2">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-52 overflow-y-auto">
              {SUGGESTED_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-orange-50 transition-colors ${
                    tags.includes(tag) ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span>#{tag}</span>
                  {tags.includes(tag) && <span className="text-orange-500 text-xs">✓</span>}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2 flex gap-2">
              <input
                placeholder="Add custom tag..."
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() }}}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                type="button"
                onClick={addCustom}
                className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold"
              >Add</button>
            </div>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              #{tag}
              <button type="button" onClick={() => toggleTag(tag)} className="ml-1 text-orange-400 hover:text-orange-700">×</button>
            </span>
          ))}
        </div>
      )}
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
    const parsedIngredients = ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.split(' - ')
      return { name: parts[0]?.trim(), measure: parts[1]?.trim() || '' }
    })
    await onSave({ title, description, category, ingredients: parsedIngredients, instructions, family_notes: familyNotes, tags })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Recipe Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Grandma's Chicken Soup"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="A short description of this recipe"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
        <input value={category} onChange={e => setCategory(e.target.value)}
          placeholder="e.g. Main Dish, Dessert, Side"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
      </div>

      <TagSelector tags={tags} onChange={setTags} />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Ingredients</label>
        <p className="text-xs text-gray-400 mb-2">One per line — format: Flour - 2 cups</p>
        <textarea value={ingredients} onChange={e => setIngredients(e.target.value)}
          placeholder="Flour - 2 cups&#10;Sugar - 1 cup&#10;Butter - 1/2 cup"
          rows={10}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Instructions</label>
        <p className="text-xs text-gray-400 mb-2">One step per line</p>
        <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
          placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients and stir"
          rows={12}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Family Notes</label>
        <textarea value={familyNotes} onChange={e => setFamilyNotes(e.target.value)}
          placeholder="The story behind this recipe, tips, memories..."
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={!title.trim() || saving}
          className="flex-1 py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
        <button onClick={onCancel}
          className="px-6 py-4 border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors">
          Cancel
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
        <div className="relative w-full bg-black" style={{aspectRatio:'16/9'}}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button onClick={() => setPlaying(false)}
            className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-11 h-11 flex items-center justify-center text-lg font-bold">✕</button>
          <button onClick={() => setPlaying(false)} className="absolute bottom-0 left-0 right-0 py-3 bg-gray-900/90 text-white text-sm font-semibold text-center">
            ✕ Close Video
          </button>
        </div>
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
            className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 text-2xl self-center">×</button>
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
          <span className="text-gray-400 text-sm shrink-0">{expanded ? '▲' : '▼'}</span>
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
  const [viewing, setViewing] = useState(null)
  const [showVideo, setShowVideo] = useState(true)
  const [searchTag, setSearchTag] = useState('')
  const [searchText, setSearchText] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceResult, setEnhanceResult] = useState(null)
  const [generatedInfo, setGeneratedInfo] = useState(null)
  const [servings, setServings] = useState(4)
  const [importText, setImportText] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [pinnedCards, setPinnedCards] = useState([])

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
      loadPinnedCards(session.user.id)
    })
  }, [])

  async function loadPinnedCards(userId) {
    const { data } = await supabase.from('recipe_cards').select('recipe_id').eq('user_id', userId)
    setPinnedCards((data || []).map(d => d.recipe_id))
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

  async function loadRecipes(userId) {
    const { data } = await supabase.from('personal_recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
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

  async function saveRecipe() {
    if (!form.title.trim()) return
    let photo_url = ''
    if (selectedPhoto) photo_url = await uploadPhoto(selectedPhoto, user.id) || ''
    const ingredients = form.ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.split(' - ')
      return { name: parts[0]?.trim(), measure: parts[1]?.trim() || '' }
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

  async function handleImport() {
    if (!importText.trim() && !importUrl.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, url: importUrl })
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setImporting(false); return }
      const ingredientsText = (data.ingredients || []).map(i => `${i.name} - ${i.measure}`).join('\n')
      setForm({ title: data.title || '', description: data.description || '', ingredients: ingredientsText,
        instructions: data.instructions || '', category: data.category || '', tags: data.tags || [],
        family_notes: data.family_notes || '', photo_url: '' })
      setImportText(''); setImportUrl(''); setView('add')
    } catch (err) { console.error(err) }
    setImporting(false)
  }

  const filtered = recipes.filter(r => {
    const matchSearch = searchText === '' || r.title.toLowerCase().includes(searchText.toLowerCase())
    const matchTag = searchTag === '' || (r.tags || []).includes(searchTag)
    return matchSearch && matchTag
  })

  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))]

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
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setView('list'); setViewing(null); setEnhanceResult(null); setGeneratedInfo(null) }}
              className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <div className="flex gap-2">
              <button onClick={() => setView('edit')}
                className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">✏️ Edit</button>
              <button onClick={() => setView('enhance')}
                className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5">✨ AI</button>
              <button onClick={() => toggleCardPin(viewing.id)}
                className={`text-xs font-semibold border rounded-lg px-3 py-1.5 transition-colors ${
                  pinnedCards.includes(viewing.id) ? 'bg-orange-600 text-white border-orange-600' : 'text-gray-500 border-gray-200'}`}>
                {pinnedCards.includes(viewing.id) ? '🃏 In Cards' : '🃏 Cards'}
              </button>
              <button onClick={() => deleteRecipe(viewing.id)}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Delete</button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          {/* Video player for video entries */}
          {resolvedYoutubeId && showVideo ? (
            <div className="w-full rounded-2xl overflow-hidden mb-5">
              <div className="relative w-full" style={{position:'relative', paddingBottom:'56.25%'}}>
                <iframe
                  src={`https://www.youtube.com/embed/${resolvedYoutubeId}?rel=0&modestbranding=1&iv_load_policy=3`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <button onClick={() => setShowVideo(false)}
                className="w-full py-3 bg-gray-900 text-white text-sm font-semibold text-center">
                ✕ Close Video
              </button>
            </div>
          ) : resolvedYoutubeId && !showVideo ? (
            <button onClick={() => setShowVideo(true)}
              className="w-full py-3 bg-gray-800 text-white text-sm font-semibold text-center rounded-2xl mb-5">
              ▶ Show Video
            </button>
          ) : isMp4 ? (
            <div className="w-full rounded-2xl overflow-hidden mb-5">
              <video src={watchUrl} controls className="w-full rounded-2xl bg-black" style={{maxHeight:'300px'}} />
            </div>
          ) : isTikTok ? (
            <a href={watchUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gray-800 text-white rounded-2xl font-semibold text-sm mb-5">
              ▶ Watch on TikTok
            </a>
          ) : isVideoEntry ? (
            <div className="w-full rounded-2xl overflow-hidden mb-5 relative" style={{height:'200px'}}>
              {viewing.photo_url ? (
                <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-5xl">📺</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(viewing.title)}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm">
                  ▶ Watch on YouTube
                </a>
              </div>
            </div>
          ) : viewing.photo_url ? (
            <div className="w-full rounded-2xl overflow-hidden mb-5" style={{height:'220px'}}>
              <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 mb-5 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => photoInputRef.current?.click()}>
              <span className="text-3xl mb-2">📷</span>
              <p className="text-sm text-orange-600 font-semibold">Add a photo</p>
              <p className="text-xs text-gray-400">Tap to upload</p>
              <input ref={photoInputRef} type="file" accept="image/*,.heic" className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]; if (!file) return
                  const url = await uploadPhoto(file, user.id)
                  if (url) await updateRecipe(viewing.id, { photo_url: url })
                }} />
            </div>
          )}

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
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-3">📊 Recipe Info</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {viewing.prep_time && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">🔪</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.prep_time}</p>
                    <p className="text-xs text-gray-400">Prep Time</p>
                  </div>
                )}
                {viewing.cooking_time && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">⏱</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.cooking_time}</p>
                    <p className="text-xs text-gray-400">Cook Time</p>
                  </div>
                )}
                {viewing.difficulty && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">📊</p>
                    <p className="text-xs font-bold text-gray-900 mt-1 capitalize">{viewing.difficulty}</p>
                    <p className="text-xs text-gray-400">Difficulty</p>
                  </div>
                )}
                {viewing.servings && (
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-base">👥</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{viewing.servings} servings</p>
                    <p className="text-xs text-gray-400">Serves</p>
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
                        <p className="text-xs text-gray-400 capitalize">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{viewing.title}</h1>
          {viewing.description && <p className="text-gray-500 text-sm mb-4">{viewing.description}</p>}

          {viewing.family_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-amber-800 mb-1">📖 Family Notes</p>
              <p className="text-sm text-amber-900">{viewing.family_notes}</p>
            </div>
          )}

          {ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Ingredients</h2>
              <div className="bg-gray-50 rounded-2xl p-4">
                <ul className="space-y-2">
                  {ingredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="text-orange-400">•</span>
                      <span className="text-gray-600">
                        {ing.measure && <span className="font-semibold text-gray-800">{ing.measure} </span>}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {nonVideoInstructions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
              <div className="space-y-4">
                {nonVideoInstructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i+1}</div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── EDIT VIEW ──
  if (view === 'edit' && viewing) {
    const editIngredients = (viewing.ingredients || []).map(i => `${i.name} - ${i.measure}`).join('\n')
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('detail')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
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
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => { setView('detail'); setEnhanceResult(null); setGeneratedInfo(null) }}
              className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">✨ AI Enhance</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-4">
          <p className="text-sm text-gray-500 font-semibold">{viewing.title}</p>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">🧹 Polish Recipe</p>
            <p className="text-xs text-gray-500 mb-3">AI rewrites steps for clarity and fixes formatting</p>
            <button onClick={() => handleEnhance('enhance')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {enhancing ? 'Polishing...' : 'Polish My Recipe'}
            </button>
            {enhanceResult?.instructions && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 mb-2">Preview — tap Apply to save</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{enhanceResult.instructions}</p>
                <button onClick={applyEnhancement} className="mt-3 w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">✓ Apply Changes</button>
              </div>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">⚖️ Resize Servings</p>
            <p className="text-xs text-gray-500 mb-3">Recalculate ingredient amounts</p>
            <div className="mb-3 space-y-3">
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                <label className="text-sm text-gray-600">Currently makes</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateRecipe(viewing.id, { servings: Math.max(1, (viewing.servings || 4) - 1) })}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">−</button>
                  <span className="text-base font-semibold w-6 text-center">{viewing.servings || 4}</span>
                  <button onClick={() => updateRecipe(viewing.id, { servings: (viewing.servings || 4) + 1 })}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                <label className="text-sm text-gray-600">Resize to</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setServings(s => Math.max(1, s - 1))}
                    className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center">−</button>
                  <span className="text-base font-semibold text-orange-700 w-6 text-center">{servings}</span>
                  <button onClick={() => setServings(s => s + 1)}
                    className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center">+</button>
                </div>
              </div>
            </div>
            <button onClick={() => handleEnhance('resize')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {enhancing ? 'Calculating...' : `Resize to ${servings} Servings`}
            </button>
            {enhanceResult?.ingredients && !enhanceResult?.instructions && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 mb-2">Resized — tap Apply to save & update nutrition</p>
                <ul className="space-y-1">
                  {enhanceResult.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-700">• <span className="font-semibold">{ing.measure}</span> {ing.name}</li>
                  ))}
                </ul>
                <button onClick={applyEnhancement} disabled={enhancing} className="mt-3 w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {enhancing ? '⏳ Updating nutrition...' : '✓ Apply & Update Nutrition'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">📊 Generate Recipe Info</p>
            <p className="text-xs text-gray-500 mb-3">AI generates cook time, difficulty, equipment & nutrition</p>
            <button onClick={() => handleEnhance('generate_info')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50">
              {enhancing ? 'Analyzing...' : 'Generate Info'}
            </button>
            {generatedInfo && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200 space-y-2">
                <p className="text-xs font-semibold text-orange-700 mb-2">Generated — tap Save to add to recipe</p>
                {generatedInfo.cooking_time && <p className="text-sm text-gray-700">⏱ Cook time: <span className="font-semibold">{generatedInfo.cooking_time}</span></p>}
                {generatedInfo.prep_time && <p className="text-sm text-gray-700">🔪 Prep time: <span className="font-semibold">{generatedInfo.prep_time}</span></p>}
                {generatedInfo.difficulty && <p className="text-sm text-gray-700">📊 Difficulty: <span className="font-semibold capitalize">{generatedInfo.difficulty}</span></p>}
                {generatedInfo.equipment?.length > 0 && (
                  <p className="text-sm text-gray-700">🍳 Equipment: <span className="font-semibold">{generatedInfo.equipment.join(', ')}</span></p>
                )}
                {generatedInfo.nutrition_estimate && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-2">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Nutrition (per serving estimate)</p>
                    <div className="grid grid-cols-4 gap-2">
                      {['calories','protein','carbs','fat'].map(k => generatedInfo.nutrition_estimate[k] && (
                        <div key={k} className="text-center bg-white rounded-lg p-2">
                          <p className="text-xs font-bold text-orange-700">{generatedInfo.nutrition_estimate[k]}</p>
                          <p className="text-xs text-gray-400 capitalize">{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={applyInfo} className="mt-2 w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold">✓ Save to Recipe</button>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ── IMPORT VIEW ──
  if (view === 'import') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">📥 Import Recipe</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <p className="text-sm text-gray-500">Paste a recipe URL or recipe text. AI will extract and clean it up.</p>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Recipe URL</label>
            <input placeholder="https://www.example.com/recipe..." value={importUrl} onChange={e => setImportUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or paste text below</span><div className="flex-1 h-px bg-gray-200" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Recipe Text</label>
            <textarea placeholder="Paste your recipe here..." value={importText} onChange={e => setImportText(e.target.value)}
              rows={10} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
          </div>
          <button onClick={handleImport} disabled={importing || (!importText.trim() && !importUrl.trim())}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold disabled:opacity-50">
            {importing ? '🤖 Extracting recipe...' : '📥 Import & Clean with AI'}
          </button>

          {/* JSON Import */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or import a JSON file</span><div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📄</span>
              <h2 className="text-sm font-bold text-gray-900">Import JSON File</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Import a recipe exported from this app or any compatible JSON format. Fields: title, description, ingredients, instructions, category, tags.</p>
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
                    await supabase.from('personal_recipes').insert({
                      user_id: user.id,
                      title: r.title || '',
                      description: r.description || '',
                      ingredients: r.ingredients || [],
                      instructions: r.instructions || '',
                      category: r.category || 'Imported',
                      tags: r.tags || ['imported'],
                      photo_url: r.photo_url || '',
                      family_notes: r.family_notes || '',
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
        </main>
      </div>
    )
  }

  // ── ADD VIEW ──
  if (view === 'add') {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => setView('list')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">➕ Add Recipe</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="space-y-6">

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📷 Photo</label>
              <div className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Preview" className="h-32 object-cover rounded-xl" />
                ) : (
                  <><span className="text-3xl mb-2">📷</span>
                  <p className="text-sm text-orange-600 font-semibold">Browse & Upload Photo</p>
                  <p className="text-xs text-gray-400">JPG, PNG, HEIC supported</p></>
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
              <label className="block text-sm font-bold text-gray-700 mb-2">Recipe Title *</label>
              <input placeholder="e.g. Grandma's Chicken Soup" value={form.title}
                onChange={e => setForm(f => ({...f, title: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <input placeholder="A short description" value={form.description}
                onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <input placeholder="e.g. Main Dish, Dessert, Side" value={form.category}
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>

            <TagSelector tags={form.tags} onChange={tags => setForm(f => ({...f, tags}))} />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Ingredients</label>
              <p className="text-xs text-gray-400 mb-2">One per line — format: Flour - 2 cups</p>
              <textarea placeholder="Flour - 2 cups&#10;Sugar - 1 cup&#10;Butter - 1/2 cup"
                value={form.ingredients} onChange={e => setForm(f => ({...f, ingredients: e.target.value}))}
                rows={10} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Instructions</label>
              <p className="text-xs text-gray-400 mb-2">One step per line</p>
              <textarea placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Combine wet and dry"
                value={form.instructions} onChange={e => setForm(f => ({...f, instructions: e.target.value}))}
                rows={12} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Family Notes</label>
              <textarea placeholder="The story behind this recipe, tips, memories..."
                value={form.family_notes} onChange={e => setForm(f => ({...f, family_notes: e.target.value}))}
                rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y" />
            </div>

            <button onClick={saveRecipe} disabled={!form.title.trim() || uploadingPhoto}
              className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50">
              {uploadingPhoto ? '📷 Uploading photo...' : '💾 Save Recipe'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ── LIST VIEW ──
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">🔐 MyRecipeVault</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('import')} className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">📥 Import</button>
              <button onClick={() => setView('add')} className="text-xs font-semibold text-white bg-orange-600 rounded-lg px-3 py-1.5">+ Add</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">Your personal cooking library — private and only visible to you.</p>
          <input type="text" placeholder="Search recipes..." value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
          {allTags.length > 0 && (
            <select
              value={searchTag}
              onChange={e => setSearchTag(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-600"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>#{tag}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your vault...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔐</p>
            <p className="text-gray-700 font-semibold mb-2">Your vault is empty</p>
            <p className="text-gray-400 text-sm mb-6">Add your personal and family recipes — private and only visible to you</p>
            <div className="flex flex-col gap-3 items-center">
              <button onClick={() => setView('add')} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold w-48">+ Add a Recipe</button>
              <button onClick={() => setView('import')} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold w-48">📥 Import a Recipe</button>
            </div>
          </div>
        ) : (() => {
          const videoRefs = filtered.filter(r => r.category === 'Video Reference' || r.category === 'Recipe Videos')
          const regularRecipes = filtered.filter(r => r.category !== 'Video Reference' && r.category !== 'Recipe Videos')
          return (
            <div className="space-y-6">
              {/* Regular Recipes */}
              <div>
                <p className="text-sm text-gray-400 mb-3">{regularRecipes.length} of {recipes.filter(r => r.category !== 'Video Reference').length} recipes</p>
                {regularRecipes.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No recipes match your search</p>
                )}
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
                          {recipe.description && <p className="text-xs text-gray-400 truncate mb-1">{recipe.description}</p>}
                          <div className="flex flex-wrap gap-1">
                            {recipe.category && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{recipe.category}</span>}
                            {(recipe.tags || []).slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs">#{tag}</span>
                            ))}
                          </div>
                        </div>
                        <span className="text-gray-300 text-xl self-center">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* My References Section */}
              {videoRefs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">📺</span>
                    <h2 className="text-sm font-bold text-gray-700">Recipe Videos</h2>
                    <span className="text-xs text-gray-400">({videoRefs.length})</span>
                  </div>
                  <div className="space-y-3">
                    {videoRefs.map(recipe => (
                      <button key={recipe.id} onClick={() => { setViewing(recipe); setView('detail') }}
                        className="w-full text-left bg-blue-50 border border-blue-100 rounded-2xl overflow-hidden hover:border-blue-300 transition-colors">
                        <div className="flex gap-3 p-4">
                          {recipe.photo_url ? (
                            <img src={recipe.photo_url} alt={recipe.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                              <span className="text-2xl">📺</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate mb-1">{recipe.title}</p>
                            {recipe.description && <p className="text-xs text-gray-400 truncate mb-1">{recipe.description}</p>}
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">📺 Recipe Video</span>
                          </div>
                          <span className="text-gray-300 text-xl self-center">→</span>
                        </div>
                      </button>
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
                    <span className="text-xs text-gray-400">({educationVideos.length})</span>
                  </div>
                  <div className="space-y-3">
                    {educationVideos.map(item => (
                      <EducationVideoCard key={item.id} item={item} onDelete={deleteEducationVideo} />
                    ))}
                  </div>
                </div>
              )}

              {/* My Notes Section */}
              {notes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">💬</span>
                    <h2 className="text-sm font-bold text-gray-700">My Notes</h2>
                    <span className="text-xs text-gray-400">({notes.length})</span>
                  </div>
                  <div className="space-y-3">
                    {notes.map(note => (
                      <NoteCard key={note.id} note={note} />
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