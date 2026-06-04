'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function PrintMisePage({ searchParams }) {
  const [recipe, setRecipe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = searchParams?.id
    if (!id) { setError('No recipe ID'); return }

    supabase
      .from('personal_recipes')
      .select('title, ingredients')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setError('Recipe not found'); return }
        setRecipe(data)
      })
  }, [])

  useEffect(() => {
    if (!recipe) return
    const timer = setTimeout(() => {
      window.print()
      window.onafterprint = () => window.close()
    }, 500)
    return () => clearTimeout(timer)
  }, [recipe])

  if (error) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>{error}</div>
  if (!recipe) return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Loading...</div>

  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', fontSize: 14, lineHeight: 1.7, maxWidth: 600 }}>
      <style>{`@media print { body { margin: 0; } } @page { margin: 0.5in; }`}</style>
      <h2 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
        Mise en Place — {recipe.title}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {ings.map((ing, i) => {
          const measure = (typeof ing === 'object' && ing?.measure) || ''
          const name = (typeof ing === 'object' && ing?.name) || (typeof ing === 'string' ? ing : '')
          const text = [measure, name].filter(Boolean).join(' ').trim()
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid #333', borderRadius: 3, flexShrink: 0 }}></span>
              <span>{text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}