'use client'
import { useState } from 'react'
import { categorizeIngredient, AISLES, AISLE_OTHER } from '@/lib/grocery_aisle'

// Per-aisle visual treatment for the sub-headers inside each store
// group. A colored top stripe + soft tinted background makes each
// aisle visually distinct as you walk through the store list. Tailwind
// v4 needs the full class strings present at lint time, so each color
// is mapped to a literal class group here rather than built from
// template strings at render time.
const AISLE_COLORS = {
  green:   { stripe: 'bg-green-500',   bg: 'bg-green-50',   text: 'text-green-800' },
  red:     { stripe: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-800' },
  sky:     { stripe: 'bg-sky-500',     bg: 'bg-sky-50',     text: 'text-sky-800' },
  amber:   { stripe: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-800' },
  orange:  { stripe: 'bg-orange-500',  bg: 'bg-orange-50',  text: 'text-orange-800' },
  purple:  { stripe: 'bg-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-800' },
  stone:   { stripe: 'bg-stone-500',   bg: 'bg-stone-50',   text: 'text-stone-800' },
  gray:    { stripe: 'bg-gray-400',    bg: 'bg-gray-50',    text: 'text-gray-700' },
  slate:   { stripe: 'bg-slate-400',   bg: 'bg-slate-50',   text: 'text-slate-700' },
}

// Renders the shopping list grouped by store. Items with no store_id
// land in an "Unsorted" bucket so nothing gets lost. Inside each
// store, items are SUB-GROUPED BY AISLE (May 2026, Bill's three-phase
// workflow: build → assign-stores → shop). When you're physically at
// Trader Joe's, you see the TJ items already arranged Produce →
// Meat → Dairy → Pantry, so the walk through the store is natural.
//
// Each row has a checkbox (mark bought), a store picker (reassign),
// and a remove button. Aisle is auto-categorized from the item text;
// no manual aisle assignment needed (per Bill's workflow, aisle is
// just an organizing layer for the shopping phase, not a planning
// concept).
//
// Also exports StoreEditor and StoreRow from the same file so the
// /shopping-list page can import everything from one spot.

// Canonical aisle order. Used to sort items within a store so the
// natural walk path is reflected. Built from AISLES + the catch-all.
const AISLE_ORDER_BY_KEY = (() => {
  const map = new Map()
  AISLES.forEach((a, i) => map.set(a.key, i))
  map.set(AISLE_OTHER.key, AISLES.length)
  return map
})()

function aisleSortIndex(item) {
  const aisle = categorizeIngredient(item.ingredient)
  return AISLE_ORDER_BY_KEY.get(aisle.key) ?? AISLES.length
}

// Group items in a single store into aisle buckets, returning an
// array of { aisle, items } in canonical aisle order. Within each
// bucket items keep their original order (insertion order).
function bucketByAisle(items) {
  const buckets = new Map()
  for (const item of items) {
    const aisle = categorizeIngredient(item.ingredient)
    if (!buckets.has(aisle.key)) buckets.set(aisle.key, { aisle, items: [] })
    buckets.get(aisle.key).items.push(item)
  }
  // Order: AISLES then OTHER last.
  const out = []
  for (const aisle of AISLES) {
    if (buckets.has(aisle.key)) out.push(buckets.get(aisle.key))
  }
  if (buckets.has(AISLE_OTHER.key)) out.push(buckets.get(AISLE_OTHER.key))
  return out
}

export default function ShoppingByStore({ shoppingList, stores, onToggle, onRemove, onSetItemStore }) {
  // Build map: storeId -> array of items, plus "unsorted"
  const groups = new Map()
  groups.set(null, [])
  for (const s of stores) groups.set(s.id, [])
  for (const item of shoppingList) {
    const key = item.store_id || null
    if (!groups.has(key)) groups.set(null, [...(groups.get(null) || []), item])
    else groups.get(key).push(item)
  }

  const orderedStores = [...stores, { id: null, name: 'Unsorted', emoji: '📦', website_url: '' }]

  return (
    <div className="px-3 pb-3 space-y-3">
      {orderedStores.map(store => {
        const items = groups.get(store.id) || []
        if (store.id === null && items.length === 0) return null // hide empty Unsorted
        if (items.length === 0 && stores.length > 0) {
          return (
            <div key={String(store.id)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
              <span>{store.emoji || '🛒'}</span>
              <span className="font-semibold text-gray-600">{store.name}</span>
              <span className="text-gray-400">· 0 items</span>
            </div>
          )
        }
        // Sort items by canonical aisle order, then bucket them so
        // we can render aisle sub-headers within the store group.
        const sorted = [...items].sort((a, b) => aisleSortIndex(a) - aisleSortIndex(b))
        const aisleBuckets = bucketByAisle(sorted)
        return (
          <div key={String(store.id)} className="rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{store.emoji || '🛒'}</span>
                <span className="font-semibold text-sm text-gray-900 truncate">{store.name}</span>
                <span className="text-xs text-gray-500">· {items.length}</span>
              </div>
              {store.website_url && (
                <a
                  href={store.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${store.name} in a new tab`}
                  className="text-xs font-semibold text-sky-700 border border-sky-200 rounded-lg px-2 py-0.5 hover:bg-sky-50"
                >
                  Open ↗
                </a>
              )}
            </div>
            <div>
              {aisleBuckets.map(({ aisle, items: aisleItems }) => {
                const c = AISLE_COLORS[aisle.color] || AISLE_COLORS.gray
                return (
                <div key={aisle.key}>
                  {/* Colored top stripe + tinted aisle sub-header inside
                      the store block. Stripe makes each aisle visually
                      distinct as you scroll (Bill's ask, May 2026); the
                      tinted background carries the same color softly so
                      the items below clearly belong to that section. */}
                  <div className={`h-1 ${c.stripe}`} />
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 ${c.bg} text-[11px] uppercase tracking-wider font-bold ${c.text}`}>
                    <span className="text-sm">{aisle.emoji}</span>
                    <span>{aisle.label}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {aisleItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-gray-50">
                        <button
                          onClick={() => onToggle(item)}
                          title={item.checked ? 'Mark as not bought' : 'Mark as bought'}
                          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                        >
                          {item.checked && <span className="text-xs">✓</span>}
                        </button>
                        <span className={`flex-1 text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.ingredient}</span>
                        {item.recipe_title && <span className="text-xs text-gray-400 truncate max-w-24">{item.recipe_title}</span>}
                        <select
                          value={item.store_id || ''}
                          onChange={e => onSetItemStore(item.id, e.target.value || null)}
                          title="Assign this item to a store"
                          className="shrink-0 text-xs border border-gray-200 rounded-lg px-1.5 py-0.5 bg-white text-gray-600 max-w-[5.5rem]"
                        >
                          <option value="">Unsorted</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.emoji || '🛒'} {s.name}</option>
                          ))}
                        </select>
                        <button onClick={() => onRemove(item.id)} title="Remove from shopping list" className="shrink-0 text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// StoreEditor — inline "My Stores" manager.
// Add, rename, emoji-pick, set a website URL, or remove a store.
// ──────────────────────────────────────────────────────────────
export function StoreEditor({ stores, onAdd, onUpdate, onRemove, onClose, onSetDefault }) {
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🛒')
  const [newUrl, setNewUrl] = useState('')

  async function handleAdd() {
    if (!newName.trim()) return
    await onAdd({ name: newName, emoji: newEmoji, website_url: newUrl })
    setNewName(''); setNewEmoji('🛒'); setNewUrl('')
  }

  return (
    <div className="mx-3 my-2 rounded-xl border-2 border-sky-200 bg-sky-50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-sky-800">🏬 My Stores</h4>
        <button onClick={onClose} title="Close editor" className="text-sky-700 hover:text-sky-900 text-lg leading-none">×</button>
      </div>

      {stores.length === 0 ? (
        <p className="text-xs text-sky-700">No stores yet. Add Publix, ShopRite, Costco, or wherever you shop below.</p>
      ) : (
        <>
          <p className="text-[10px] text-sky-700/80 italic">Tap ⭐ to make a store the default — new shopping items land there instead of Unsorted.</p>
          <div className="space-y-2">
            {stores.map(s => (
              <StoreRow key={s.id} store={s} onUpdate={onUpdate} onRemove={onRemove} onSetDefault={onSetDefault} />
            ))}
          </div>
        </>
      )}

      <div className="border-t-2 border-sky-200 pt-3">
        <p className="text-xs font-semibold text-sky-800 mb-2">Add a store</p>
        <div className="flex gap-2">
          <input
            value={newEmoji}
            onChange={e => setNewEmoji(e.target.value)}
            placeholder="🛒"
            className="w-12 text-center border border-sky-200 rounded-lg px-2 py-2 text-base bg-white"
            aria-label="Emoji"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Store name (e.g. Publix)"
            className="flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white"
            style={{ fontSize: '16px' }}
          />
        </div>
        <input
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          placeholder="Website URL (optional)"
          className="mt-2 w-full border border-sky-200 rounded-lg px-3 py-2 text-sm bg-white"
          style={{ fontSize: '16px' }}
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          title="Add this store"
          className="mt-2 w-full py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-40"
        >
          + Add Store
        </button>
      </div>
    </div>
  )
}

function StoreRow({ store, onUpdate, onRemove, onSetDefault }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(store.name)
  const [emoji, setEmoji] = useState(store.emoji || '🛒')
  const [url, setUrl] = useState(store.website_url || '')

  async function save() {
    await onUpdate(store.id, { name: name.trim() || store.name, emoji: emoji || '🛒', website_url: url })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-lg border border-sky-200 p-2 space-y-2">
        <div className="flex gap-2">
          <input value={emoji} onChange={e => setEmoji(e.target.value)} className="w-12 text-center border border-sky-200 rounded-lg px-2 py-1.5 text-base" />
          <input value={name} onChange={e => setName(e.target.value)} className="flex-1 border border-sky-200 rounded-lg px-3 py-1.5 text-sm" style={{ fontSize: '16px' }} />
        </div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Website URL" className="w-full border border-sky-200 rounded-lg px-3 py-1.5 text-sm" style={{ fontSize: '16px' }} />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold">Save</button>
          <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg border border-sky-200 text-xs font-semibold text-sky-700">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 ${store.is_default ? 'border-2 border-amber-300' : 'border border-sky-100'}`}>
      <span className="text-lg shrink-0">{store.emoji || '🛒'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {store.name}
          {store.is_default && <span className="ml-1.5 text-[10px] uppercase tracking-wider font-bold text-amber-700">⭐ Default</span>}
        </p>
        {store.website_url && <p className="text-xs text-sky-700 truncate">{store.website_url}</p>}
      </div>
      {onSetDefault && (
        <button
          onClick={() => onSetDefault(store.id)}
          title={store.is_default ? 'Already the default store' : 'Set as the default store for new shopping items'}
          className={`text-base shrink-0 leading-none px-1 ${store.is_default ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
          aria-label={store.is_default ? 'Default store' : 'Make default store'}
        >
          {store.is_default ? '⭐' : '☆'}
        </button>
      )}
      <button onClick={() => setEditing(true)} title="Edit this store" className="text-xs text-sky-700 font-semibold">Edit</button>
      <button onClick={() => onRemove(store.id)} title="Remove this store" className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
    </div>
  )
}
