'use client'
import { useState } from 'react'

// Saved AI note row — title that expands to show the full answer.
// Used by /playbook (📝 Chef Notes section) and /secret (💎 Chef Portfolio
// view inside the Recipe Vault).
//
// Optional `onPortfolio` + `inPortfolio` props add a portfolio toggle button:
//   - inPortfolio=false → "💎 Add to Portfolio" (orange outline)
//   - inPortfolio=true  → "✓ In Portfolio" (orange filled)
// Tap toggles. Portfolio promotes the note to the user's Recipe Vault as a
// curated "keep-forever" subset. The note stays in Playbook regardless.
// When `onPortfolio` is omitted, the button is hidden (e.g. when the note
// is already rendered inside the Vault portfolio view itself, where the
// remove × is the right affordance).
export default function ExpandableItem({ item, emoji = '💡', onRemove, onPortfolio, inPortfolio = false }) {
  const [expanded, setExpanded] = useState(false)
  const answer = item.metadata?.answer || ''
  return (
    <div className="bg-white hover:bg-gray-50">
      <div className="flex items-start gap-3 p-3">
        <span className="text-xl shrink-0" title="Saved AI note">{emoji}</span>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse note' : 'Expand note'}
            className="font-semibold text-sm text-gray-900 leading-tight text-left w-full"
          >
            {item.title}
            <span className="text-gray-400 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && answer && (
            <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">{answer}</p>
          )}
          {onPortfolio && (
            <button
              onClick={onPortfolio}
              title={inPortfolio ? 'Remove from Recipe Vault Portfolio' : 'Save to Recipe Vault Portfolio'}
              className={`mt-2 text-xs font-semibold rounded-lg px-2.5 py-1 border-2 transition-colors ${
                inPortfolio
                  ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                  : 'text-orange-700 border-orange-300 bg-white hover:bg-orange-50'
              }`}
            >
              {inPortfolio ? '✓ In Portfolio' : '💎 Add to Portfolio'}
            </button>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} title="Remove" className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
        )}
      </div>
    </div>
  )
}
