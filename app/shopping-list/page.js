'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import ShoppingByStore, { StoreEditor } from '@/components/ShoppingByStore'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Shopping List — grouped by store. Includes the grocery-store editor,
// AI cleanup pass (✨), and Copy/Print for moving the list into Notes /
// Reminders / the store's own app.
export default function ShoppingListPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shoppingList, setShoppingList] = useState([])
  const [stores, setStores] = useState([])
  const [showStoreEditor, setShowStoreEditor] = useState(false)
  const [cleaningList, setCleaningList] = useState(false)
  const [toast, setToast] = useState(null)
  // Print uses an in-page hidden container instead of a popup window.
  // On iOS, popup-based print previews can leave a stranded popup tab
  // behind the app when the user dismisses the sheet without printing —
  // and there's no obvious way out from a phone. Printing the current
  // window with @media print rules avoids the popup entirely.
  const [printText, setPrintText] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function loadShoppingList(userId) {
    const { data } = await supabase.from('shopping_list').select('*').eq('user_id', userId).order('created_at', { ascending: true })
    setShoppingList(data || [])
  }

  async function loadStores(userId) {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setStores(data || [])
  }

  async function addStore({ name, emoji, website_url }) {
    if (!user || !name.trim()) return
    const nextOrder = stores.length
    const { data, error } = await supabase.from('stores').insert({
      user_id: user.id,
      name: name.trim(),
      emoji: emoji || '🛒',
      website_url: website_url || '',
      sort_order: nextOrder,
    }).select().single()
    if (error) { showToast('Could not add store'); return }
    setStores(prev => [...prev, data])
  }

  async function updateStore(id, updates) {
    await supabase.from('stores').update(updates).eq('id', id)
    setStores(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  async function removeStore(id) {
    await supabase.from('stores').delete().eq('id', id)
    setStores(prev => prev.filter(s => s.id !== id))
    setShoppingList(prev => prev.map(i => i.store_id === id ? { ...i, store_id: null } : i))
  }

  async function setItemStore(itemId, storeId) {
    await supabase.from('shopping_list').update({ store_id: storeId }).eq('id', itemId)
    setShoppingList(prev => prev.map(i => i.id === itemId ? { ...i, store_id: storeId } : i))
  }

  async function toggleShoppingItem(item) {
    await supabase.from('shopping_list').update({ checked: !item.checked }).eq('id', item.id)
    setShoppingList(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i))
  }

  async function removeShoppingItem(id) {
    await supabase.from('shopping_list').delete().eq('id', id)
    setShoppingList(prev => prev.filter(i => i.id !== id))
  }

  async function clearShoppingList() {
    if (!user || !confirm('Clear every item from your shopping list?')) return
    await supabase.from('shopping_list').delete().eq('user_id', user.id)
    setShoppingList([])
    showToast('Shopping list cleared')
  }

  // Build a plain-text version of the list, grouped by store. Used for
  // both Copy-to-clipboard and Print.
  function buildShoppingListText() {
    if (!shoppingList.length) return ''
    const groups = new Map()
    for (const item of shoppingList) {
      const key = item.store_id || '__unsorted__'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    const storeById = Object.fromEntries(stores.map(s => [s.id, s]))
    const sortedKeys = [...groups.keys()].sort((a, b) => {
      if (a === '__unsorted__') return 1
      if (b === '__unsorted__') return -1
      const sa = storeById[a]?.sort_order ?? 0
      const sb = storeById[b]?.sort_order ?? 0
      return sa - sb
    })
    const lines = ['Shopping List', '']
    for (const key of sortedKeys) {
      const header = key === '__unsorted__'
        ? '📦 Unsorted'
        : `${storeById[key]?.emoji || '🏪'} ${storeById[key]?.name || 'Store'}`
      lines.push(header)
      for (const item of groups.get(key)) {
        const prefix = item.checked ? '[x]' : '[ ]'
        lines.push(`${prefix} ${item.ingredient}`)
      }
      lines.push('')
    }
    return lines.join('\n').trim()
  }

  async function copyShoppingList() {
    const text = buildShoppingListText()
    if (!text) { showToast('Nothing to copy'); return }
    try {
      await navigator.clipboard.writeText(text)
      showToast('Shopping list copied to clipboard ✓')
    } catch {
      showToast('Copy failed — try Print instead')
    }
  }

  function printShoppingList() {
    const text = buildShoppingListText()
    if (!text) { showToast('Nothing to print'); return }
    setPrintText(text)
    // One-tick wait so the hidden print container has rendered with the
    // text before the print dialog opens. afterprint fires whether the
    // user prints or cancels (in every browser including iOS Safari),
    // so the container is cleared either way and the page returns to
    // its normal state.
    setTimeout(() => {
      const cleanup = () => { setPrintText(''); window.removeEventListener('afterprint', cleanup) }
      window.addEventListener('afterprint', cleanup)
      window.print()
      // Belt-and-braces fallback in case afterprint never fires
      // (older mobile browsers occasionally swallow it).
      setTimeout(() => { setPrintText(''); window.removeEventListener('afterprint', cleanup) }, 5000)
    }, 50)
  }

  // AI cleanup — round fractions, strip cooking-only measures, merge dupes.
  async function cleanUpList() {
    if (!user || shoppingList.length === 0 || cleaningList) return
    if (!confirm('Clean up the whole list with AI? This will replace the current items with a cleaned, deduped version.')) return
    setCleaningList(true)
    try {
      const res = await fetch('/api/cleanup-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: shoppingList.map(i => ({ id: i.id, ingredient: i.ingredient, store_id: i.store_id || null })),
          stores: stores.map(s => ({ id: s.id, name: s.name })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data.items)) {
        showToast(data?.error || 'Cleanup failed')
        return
      }
      if (data.items.length === 0) {
        showToast('Cleanup returned no items')
        return
      }
      const { error: delErr } = await supabase.from('shopping_list').delete().eq('user_id', user.id)
      if (delErr) { showToast('Could not clear existing list'); return }
      const rows = data.items.map(it => ({
        user_id: user.id,
        ingredient: it.ingredient,
        recipe_title: '',
        store_id: it.store_id || null,
      }))
      const { data: inserted, error: insErr } = await supabase.from('shopping_list').insert(rows).select()
      if (insErr) { showToast('Could not save cleaned list'); return }
      setShoppingList(inserted || [])
      showToast(`Cleaned ✨ — ${data.items.length} item${data.items.length === 1 ? '' : 's'}`)
    } catch (err) {
      showToast('Cleanup failed: ' + err.message)
    } finally {
      setCleaningList(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      Promise.all([loadShoppingList(session.user.id), loadStores(session.user.id)])
        .finally(() => setLoading(false))
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">{toast}</div>
      )}

      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🛒 Shopping List</h1>
            {shoppingList.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{shoppingList.length}</span>}
          </div>
          <button onClick={() => window.location.href='/meal-plan'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Meal Plan</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-3">
          <p className="text-sm text-gray-600 leading-snug">Your ingredients, organized and ready to shop.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your shopping list...</div>
        ) : (
          <div className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 flex-wrap border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowStoreEditor(v => !v)}
                  title="Add or edit the stores you shop at"
                  className="text-xs font-semibold text-sky-700 border border-sky-200 rounded-lg px-2.5 py-1 hover:bg-sky-50"
                >
                  🏬 Manage Stores
                </button>
                {shoppingList.length > 0 && (
                  <button
                    onClick={cleanUpList}
                    disabled={cleaningList}
                    title="Use AI to consolidate fractions into whole store units, strip cooking-only measures (tsp/tbsp/pinch), and dedupe repeats"
                    className="text-xs font-semibold text-purple-700 border border-purple-200 rounded-lg px-2.5 py-1 hover:bg-purple-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {cleaningList ? '✨ Cleaning…' : '✨ Clean Up List'}
                  </button>
                )}
                {shoppingList.length > 0 && (
                  <button
                    onClick={copyShoppingList}
                    title="Copy the list as plain text so you can paste it into Notes, Reminders, or your store's app"
                    className="text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50"
                  >
                    📋 Copy
                  </button>
                )}
                {shoppingList.length > 0 && (
                  <button
                    onClick={printShoppingList}
                    title="Open a printable version of the shopping list in a new window"
                    className="text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                  >
                    🖨️ Print
                  </button>
                )}
              </div>
              {shoppingList.length > 0 && (
                <button onClick={clearShoppingList} title="Clear every item from the shopping list" className="text-xs text-red-400 hover:text-red-600 font-semibold">Clear All</button>
              )}
            </div>

            {showStoreEditor && (
              <StoreEditor
                stores={stores}
                onAdd={addStore}
                onUpdate={updateStore}
                onRemove={removeStore}
                onClose={() => setShowStoreEditor(false)}
              />
            )}

            {shoppingList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No items yet — add ingredients from a recipe in your Vault to get started.</p>
            ) : (
              <ShoppingByStore
                shoppingList={shoppingList}
                stores={stores}
                onToggle={toggleShoppingItem}
                onRemove={removeShoppingItem}
                onSetItemStore={setItemStore}
              />
            )}
          </div>
        )}
      </main>

      {/* Print container — invisible in normal view, becomes the only
          visible element during print via the @media print rules below.
          Text comes from buildShoppingListText() which already groups by
          store and includes [ ] checkboxes. printText is cleared on
          afterprint so this stays empty between prints. */}
      <div id="print-shopping-list" aria-hidden="true" style={{ display: printText ? 'block' : 'none' }}>
        <pre style={{
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: '1.7',
          margin: 0,
          padding: '24px',
          color: '#111',
        }}>{printText}</pre>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-shopping-list, #print-shopping-list * { visibility: visible !important; }
          #print-shopping-list {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
