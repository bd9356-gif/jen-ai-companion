'use client'
import { useState } from 'react'

// Saved AI note row — title that expands to show the full answer.
// Used by /chef-notes (saved AI answers) and can be reused by /skills
// when a note lives inside a cooking-skill bucket.
export default function ExpandableItem({ item, emoji = '💡', onRemove }) {
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
        </div>
        {onRemove && (
          <button onClick={onRemove} title="Remove from Chef Notes" className="shrink-0 text-gray-300 hover:text-red-400 text-xl">×</button>
        )}
      </div>
    </div>
  )
}
