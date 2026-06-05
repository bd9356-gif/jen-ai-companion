'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function ShoppingPrint() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setItems([]); return }
      supabase.from('shopping_list').select('ingredient, recipe_title')
        .eq('user_id', session.user.id).order('recipe_title')
        .then(({ data }) => setItems(data || []))
    })
  }, [])

  useEffect(() => {
    if (items === null) return
    const timer = setTimeout(() => {
      window.print()
      window.onafterprint = () => window.history.back()
      window.onafterprint = () => window.close()
    }, 500)
    return () => clearTimeout(timer)
  }, [items])

  if (items === null) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Loading...</div>

  const grouped = items.reduce((acc, item) => {
    const key = item.recipe_title || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(item.ingredient)
    return acc
  }, {})

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', fontSize: 14, lineHeight: 1.7, maxWidth: 600 }}>
      <style>{`@media print { body { margin: 0; } } @page { margin: 0.5in; }`}</style>
      <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>🛒 Shopping List</h2>
      {Object.entries(grouped).map(([title, ingredients]) => (
        <div key={title} style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 'bold', fontSize: 13, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ingredients.map((ing, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #333', borderRadius: 3, flexShrink: 0 }}></span>
                <span>{ing}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default function PrintShoppingPage() {
  return <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}><ShoppingPrint /></Suspense>
}
