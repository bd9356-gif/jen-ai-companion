'use client'
import { useState } from 'react'

// Chef Jennifer saved recipe row. Title expands to show ingredients,
// instructions, cuisine/difficulty chips, and a Save-to-Vault button
// that promotes the recipe into personal_recipes.
//
// Used by /chef-recipes. The onSaveToVault callback is responsible for
// the DB insert and calls back on success; local state tracks whether
// the button has been pressed this session.
export default function ChefJenItem({ item, onRemove, onSaveToVault }) {
  const [expanded, setExpanded] = useState(false)
  const [savedToVault, setSavedToVault] = useState(false)
  const meta = item.metadata || {}
  const description  = meta.description || ''
  const ingredients  = Array.isArray(meta.ingredients) ? meta.ingredients : []
  const instructions = meta.instructions || ''
  const difficulty   = meta.difficulty || ''
  const cuisine      = meta.cuisine || ''
  // Fallback: some older saves may have used metadata.answer
  const answer       = meta.answer || ''
  const hasContent   = description || ingredients.length > 0 || instructions || answer

  async function handleSaveToVault() {
    if (savedToVault || !onSaveToVault) return
    await onSaveToVault()
    setSavedToVault(true)
  }

  return (
    <div className="bg-white hover:bg-gray-50">
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl shrink-0" title="Chef Jennifer recipe">👨‍🍳</span>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="font-semibold text-sm text-gray-900 leading-tight text-left w-full"
            title={expanded ? 'Collapse recipe' : 'Expand recipe'}
          >
            {item.title}
            <span className="text-gray-400 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
          </button>

          {expanded && (
            <div className="mt-2 space-y-3 text-sm text-gray-700">
              {(cuisine || difficulty) && (
                <div className="flex gap-2 flex-wrap">
                  {cuisine && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{cuisine}</span>}
                  {difficulty && <span className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 rounded-full">{difficulty}</span>}
                </div>
              )}

              {description && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{description}</p>
              )}

              {ingredients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Ingredients</h4>
                  <ul className="list-disc pl-5 space-y-0.5 text-gray-700">
                    {ingredients.map((ing, i) => {
                      if (typeof ing === 'string') return <li key={i}>{ing}</li>
                      const measure = ing?.measure || ''
                      const name = ing?.name || ''
                      if (!measure && !name) return <li key={i}>{JSON.stringify(ing)}</li>
                      return (
                        <li key={i}>
                          {measure && <span className="font-semibold text-gray-900">{measure} </span>}
                          {name}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {instructions && (
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-1">Instructions</h4>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{instructions}</p>
                </div>
              )}

              {answer && !description && !instructions && (
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{answer}</p>
              )}

              {!hasContent && (
                <p className="text-gray-400 italic">No details saved for this recipe.</p>
              )}

              {onSaveToVault && (
                <button
                  onClick={handleSaveToVault}
                  disabled={savedToVault}
                  title="Save this recipe to your Recipe Vault"
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                    savedToVault
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {savedToVault ? '✓ Saved to Recipe Vault' : '💾 Save to Recipe Vault'}
                </button>
              )}
            </div>
          )}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            title="Remove from Chef Jennifer Recipes"
            className="shrink-0 text-gray-300 hover:text-red-400 text-xl"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
