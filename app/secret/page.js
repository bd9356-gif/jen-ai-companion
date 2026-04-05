'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SUGGESTED_TAGS = ['chicken', 'fish', 'pasta', 'dessert', 'family', 'holiday', 'quick', 'vegetarian', 'beef', 'breakfast', 'soup', 'salad']

export default function MyRecipesPage() {
  const [user, setUser] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'add' | 'import' | 'detail' | 'enhance'
  const [viewing, setViewing] = useState(null)
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
  const [tagInput, setTagInput] = useState('')
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
    })
  }, [])

  async function loadRecipes(userId) {
    const { data } = await supabase
      .from('personal_recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setRecipes(data || [])
    setLoading(false)
  }

  async function uploadPhoto(file, userId) {
    if (!file) return null
    setUploadingPhoto(true)
    try {
      // Get fresh session to ensure auth token is current
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in again to upload photos')
        setUploadingPhoto(false)
        return null
      }

      const ext = file.name.split('.').pop().toLowerCase()
      const safeName = ext === 'heic' ? 'jpg' : ext
      const path = `${userId}/${Date.now()}.${safeName}`

      // Use fetch directly to upload with auth header
      const formData = new FormData()
      formData.append('', file)

      const uploadUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/recipe-photos/${path}`
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-upsert': 'true',
        },
        body: file,
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Upload error:', errText)
        alert('Photo upload failed: ' + errText)
        setUploadingPhoto(false)
        return null
      }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipe-photos/${path}`
      setUploadingPhoto(false)
      return publicUrl
    } catch (err) {
      console.error('Upload exception:', err)
      alert('Photo upload error: ' + err.message)
      setUploadingPhoto(false)
      return null
    }
  }

  async function saveRecipe() {
    if (!form.title.trim()) return
    let photo_url = ''
    if (selectedPhoto) {
      photo_url = await uploadPhoto(selectedPhoto, user.id) || ''
    }
    const ingredients = form.ingredients.split('\n').filter(Boolean).map(line => {
      const parts = line.split(' - ')
      return { name: parts[0]?.trim(), measure: parts[1]?.trim() || '' }
    })
    const { data, error } = await supabase.from('personal_recipes').insert({
      user_id: user.id,
      title: form.title,
      description: form.description,
      ingredients,
      instructions: form.instructions,
      category: form.category,
      tags: form.tags,
      family_notes: form.family_notes,
      photo_url,
    }).select().single()
    if (!error && data) {
      setRecipes(prev => [data, ...prev])
      setForm({ title: '', description: '', ingredients: '', instructions: '', category: '', tags: [], family_notes: '', photo_url: '' })
      setView('list')
    }
  }

  async function updateRecipe(id, updates) {
    const { data, error } = await supabase
      .from('personal_recipes').update(updates).eq('id', id).select().single()
    if (!error && data) {
      setRecipes(prev => prev.map(r => r.id === id ? data : r))
      setViewing(data)
    }
  }

  async function deleteRecipe(id) {
    await supabase.from('personal_recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
    setView('list')
    setViewing(null)
  }

  async function handleEnhance(action) {
    setEnhancing(true)
    setEnhanceResult(null)
    setGeneratedInfo(null)
    try {
      const res = await fetch('/api/enhance-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (enhanceResult.instructions) updates.instructions = enhanceResult.instructions
    await updateRecipe(viewing.id, updates)
    setEnhanceResult(null)
    setView('detail')
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
    setGeneratedInfo(null)
    alert('✓ Recipe info saved!')
  }

  async function handleImport() {
    if (!importText.trim() && !importUrl.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/import-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, url: importUrl })
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setImporting(false); return }
      // Pre-fill the add form with imported data
      const ingredientsText = (data.ingredients || []).map(i => `${i.name} - ${i.measure}`).join('\n')
      setForm({
        title: data.title || '',
        description: data.description || '',
        ingredients: ingredientsText,
        instructions: data.instructions || '',
        category: data.category || '',
        tags: data.tags || [],
        family_notes: data.family_notes || '',
        photo_url: ''
      })
      setImportText('')
      setImportUrl('')
      setView('add')
    } catch (err) { console.error(err) }
    setImporting(false)
  }

  function addTag(tag) {
    const t = tag.trim().toLowerCase()
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }))
  }

  function removeTag(tag) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  const filtered = recipes.filter(r => {
    const matchSearch = searchText === '' || r.title.toLowerCase().includes(searchText.toLowerCase())
    const matchTag = searchTag === '' || (r.tags || []).includes(searchTag)
    return matchSearch && matchTag
  })

  // All tags used across recipes
  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))]

  // ── DETAIL VIEW ──
  if (view === 'detail' && viewing) {
    const ingredients = viewing.ingredients || []
    const instructions = (viewing.instructions || '').split('\n').filter(Boolean)
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setView('list'); setViewing(null); setEnhanceResult(null); setGeneratedInfo(null) }} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <div className="flex gap-2">
              <button onClick={() => setView('enhance')} className="text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5">✨ AI Enhance</button>
              <button onClick={() => deleteRecipe(viewing.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1.5">Delete</button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          {/* Photo */}
          {viewing.photo_url ? (
            <div className="w-full rounded-2xl overflow-hidden mb-5" style={{height:'220px'}}>
              <img src={viewing.photo_url} alt={viewing.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 mb-5 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => photoInputRef.current?.click()}>
              <span className="text-3xl mb-2">📷</span>
              <p className="text-sm text-orange-600 font-semibold">Add a photo</p>
              <p className="text-xs text-gray-400">Tap to upload from your device</p>
              <input ref={photoInputRef} type="file" accept="image/*,.heic" className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingPhoto(true)
                  const url = await uploadPhoto(file, user.id)
                  if (url) {
                    await updateRecipe(viewing.id, { photo_url: url })
                    alert('✓ Photo saved!')
                  } else {
                    alert('Photo upload failed — please try again')
                  }
                  setUploadingPhoto(false)
                }} />
            </div>
          )}

          {/* Tags */}
          {(viewing.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {viewing.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold">#{tag}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            {viewing.category && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.category}</span>}
            {viewing.difficulty && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{viewing.difficulty}</span>}
            {viewing.cooking_time && <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">⏱ {viewing.cooking_time}</span>}
          </div>

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

          {instructions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Instructions</h2>
              <div className="space-y-4">
                {instructions.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
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

  // ── ENHANCE VIEW ──
  if (view === 'enhance' && viewing) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <button onClick={() => { setView('detail'); setEnhanceResult(null); setGeneratedInfo(null) }} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">✨ AI Enhance — {viewing.title}</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16 space-y-4">

          {/* Polish recipe */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">🧹 Polish Recipe</p>
            <p className="text-xs text-gray-500 mb-3">AI rewrites steps for clarity and fixes formatting</p>
            <button onClick={() => handleEnhance('enhance')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {enhancing ? 'Polishing...' : 'Polish My Recipe'}
            </button>
            {enhanceResult?.instructions && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 mb-2">Preview — tap Apply to save</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{enhanceResult.instructions}</p>
                <button onClick={applyEnhancement} className="mt-3 w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  ✓ Apply Changes
                </button>
              </div>
            )}
          </div>

          {/* Resize servings */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">⚖️ Resize Servings</p>
            <p className="text-xs text-gray-500 mb-3">Recalculate ingredient amounts for any serving size</p>
            <div className="flex gap-3 mb-3 items-center">
              <label className="text-sm text-gray-600">Currently makes:</label>
              <input type="number" min="1" max="50" value={viewing.servings || 4}
                onChange={e => updateRecipe(viewing.id, { servings: parseInt(e.target.value) })}
                className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              <label className="text-sm text-gray-600">→ resize to:</label>
              <input type="number" min="1" max="50" value={servings}
                onChange={e => setServings(parseInt(e.target.value))}
                className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <button onClick={() => handleEnhance('resize')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {enhancing ? 'Calculating...' : `Resize to ${servings} Servings`}
            </button>
            {enhanceResult?.ingredients && !enhanceResult?.instructions && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200">
                <p className="text-xs font-semibold text-orange-700 mb-2">Resized ingredients — tap Apply to save</p>
                <ul className="space-y-1">
                  {enhanceResult.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-700">• <span className="font-semibold">{ing.measure}</span> {ing.name}</li>
                  ))}
                </ul>
                <button onClick={applyEnhancement} className="mt-3 w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  ✓ Apply Changes
                </button>
              </div>
            )}
          </div>

          {/* Generate info */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <p className="font-semibold text-gray-900 mb-1">📊 Generate Recipe Info</p>
            <p className="text-xs text-gray-500 mb-3">AI generates cooking time, difficulty, equipment list, and nutrition estimate</p>
            <button onClick={() => handleEnhance('generate_info')} disabled={enhancing}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-semibold text-sm hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {enhancing ? 'Analyzing...' : 'Generate Info'}
            </button>
            {generatedInfo && (
              <div className="mt-3 bg-white rounded-xl p-4 border border-orange-200 space-y-2">
                <p className="text-xs font-semibold text-orange-700 mb-2">Generated Info</p>
                {generatedInfo.cooking_time && <p className="text-sm text-gray-700">⏱ Cook time: <span className="font-semibold">{generatedInfo.cooking_time}</span></p>}
                {generatedInfo.prep_time && <p className="text-sm text-gray-700">🔪 Prep time: <span className="font-semibold">{generatedInfo.prep_time}</span></p>}
                {generatedInfo.difficulty && <p className="text-sm text-gray-700">📊 Difficulty: <span className="font-semibold capitalize">{generatedInfo.difficulty}</span></p>}
                {generatedInfo.equipment?.length > 0 && (
                  <p className="text-sm text-gray-700">🍳 Equipment: <span className="font-semibold">{generatedInfo.equipment.join(', ')}</span></p>
                )}
                {generatedInfo.nutrition_estimate && (
                  <div className="bg-gray-50 rounded-xl p-3 mt-2">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Nutrition (per serving estimate)</p>
                    <p className="text-xs text-gray-600">Calories: {generatedInfo.nutrition_estimate.calories}</p>
                    <p className="text-xs text-gray-600">Protein: {generatedInfo.nutrition_estimate.protein}</p>
                    <p className="text-xs text-gray-600">Carbs: {generatedInfo.nutrition_estimate.carbs}</p>
                    <p className="text-xs text-gray-600">Fat: {generatedInfo.nutrition_estimate.fat}</p>
                  </div>
                )}
                <button onClick={applyInfo} className="mt-2 w-full py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
                  ✓ Save to Recipe
                </button>
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
          <p className="text-sm text-gray-500">Paste a recipe URL, or paste the recipe text directly. AI will extract and clean it up.</p>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Recipe URL</label>
            <input
              placeholder="https://www.example.com/recipe..."
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or paste text below</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Recipe Text</label>
            <textarea
              placeholder="Paste your recipe here — ingredients, steps, notes..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={importing || (!importText.trim() && !importUrl.trim())}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {importing ? '🤖 Extracting recipe...' : '📥 Import & Clean with AI'}
          </button>

          <p className="text-xs text-gray-400 text-center">AI will extract ingredients, steps, and notes, then open the Add Recipe form pre-filled.</p>
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
          <div className="space-y-4">

            {/* Photo upload */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">📷 Photo</label>
              <div
                className="w-full rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Preview" className="h-32 object-cover rounded-xl" />
                ) : (
                  <>
                    <span className="text-3xl mb-2">📷</span>
                    <p className="text-sm text-orange-600 font-semibold">Browse & Upload Photo</p>
                    <p className="text-xs text-gray-400">JPG, PNG, HEIC supported</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*,.heic" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setSelectedPhoto(file)
                    const url = URL.createObjectURL(file)
                    setForm(f => ({ ...f, photo_url: url }))
                  }} />
              </div>
            </div>

            <input placeholder="Recipe title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />

            <input placeholder="Short description (optional)" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />

            <input placeholder="Category (e.g. Dessert, Main, Side)" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">🏷️ Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SUGGESTED_TAGS.map(tag => (
                  <button key={tag} onClick={() => addTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${form.tags.includes(tag) ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
                    #{tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Custom tag..." value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { addTag(tagInput); setTagInput('') }}}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                <button onClick={() => { addTag(tagInput); setTagInput('') }}
                  className="px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700">Add</button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 text-orange-400 hover:text-orange-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <textarea placeholder="Ingredients — one per line, e.g. Flour - 2 cups" value={form.ingredients}
              onChange={e => setForm(f => ({...f, ingredients: e.target.value}))} rows={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />

            <textarea placeholder="Instructions — one step per line" value={form.instructions}
              onChange={e => setForm(f => ({...f, instructions: e.target.value}))} rows={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />

            <textarea placeholder="Family notes — the story behind this recipe (optional)" value={form.family_notes}
              onChange={e => setForm(f => ({...f, family_notes: e.target.value}))} rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />

            <button onClick={() => saveRecipe()} disabled={!form.title.trim() || uploadingPhoto}
              className="w-full py-4 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
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
              <h1 className="text-lg font-bold text-gray-900">🔒 MyRecipes</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('import')} className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">📥 Import</button>
              <button onClick={() => setView('add')} className="text-xs font-semibold text-white bg-orange-600 rounded-lg px-3 py-1.5 hover:bg-orange-700">+ Add</button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">The heart of your recipe library, all in one trusted place.</p>
          <input type="text" placeholder="Search recipes..." value={searchText} onChange={e => setSearchText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-2" />
          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSearchTag('')}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${searchTag === '' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                All
              </button>
              {allTags.map(tag => (
                <button key={tag} onClick={() => setSearchTag(tag === searchTag ? '' : tag)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${searchTag === tag ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your recipes...</div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔒</p>
            <p className="text-gray-700 font-semibold mb-2">Your recipe library is empty</p>
            <p className="text-gray-400 text-sm mb-6">Add your personal and family recipes — private and only visible to you</p>
            <div className="flex flex-col gap-3 items-center">
              <button onClick={() => setView('add')} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors w-48">
                + Add a Recipe
              </button>
              <button onClick={() => setView('import')} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors w-48">
                📥 Import a Recipe
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">{filtered.length} of {recipes.length} recipes</p>
            {filtered.map(recipe => (
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
        )}
      </main>
    </div>
  )
}