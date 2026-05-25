'use client'
import { useState } from 'react'

// Saved AI note row — title that expands to show the full answer.
// Used by /playbook (📝 Chef Notes section) and /secret (💎 Chef Portfolio
// view inside the Recipe Vault).
//
// Optional `onPortfolio` + `inPortfolio` props add a portfolio move button:
//   - inPortfolio=false → "💎 Move to Portfolio" (orange outline)
//   - inPortfolio=true  → "✓ In Portfolio" (emerald — matches the
//                         "✓ In Recipe Vault" confirmation pattern on
//                         Chef TV Practice videos so the cross-surface
//                         "after I moved it" state reads the same way
//                         everywhere)
// Tap moves the note: it MOVES out of the Playbook inbox and into the
// Recipe Vault Portfolio (favorites.is_in_vault = true). Matches Bill's
// "zip through, file the keepers, delete the rest" workflow. To un-file,
// tap × on the row inside the Portfolio view — the note returns to the
// Playbook inbox as unfiled. When `onPortfolio` is omitted, the button is
// hidden (e.g. when the note is rendered inside the Portfolio itself,
// where the × is the right affordance).
export default function ExpandableItem({ item, emoji = '💡', onRemove, removeTitle = 'Remove', onPortfolio, inPortfolio = false }) {
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
              onClick={inPortfolio ? undefined : onPortfolio}
              disabled={inPortfolio}
              title={inPortfolio ? 'This note is in your Learning Vault' : 'Move this note to Learning Vault'}
              className={`mt-2 text-xs font-semibold rounded-lg px-2.5 py-1 border-2 transition-colors ${
                inPortfolio
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 cursor-default'
                  : 'text-orange-700 border-orange-300 bg-white hover:bg-orange-50'
              }`}
            >
              {inPortfolio ? '✓ In Learning Vault' : '🎓 Move to Learning Vault'}
            </button>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} title={removeTitle} className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
        )}
      </div>
    </div>
  )
}