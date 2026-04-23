'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import ExpandableItem from '@/components/ExpandableItem'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Chef Notes — chronological list of every AI answer you've saved from
// Ask Chef Jennifer (/chef). Each note expands in place to reveal the
// full answer. Remove button deletes from favorites.
//
// Data: `favorites` table, type = 'ai_answer'. metadata.answer holds the
// full response text.
export default function ChefNotesPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [toast, setToast] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function loadNotes(userId) {
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'ai_answer')
      .order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function removeNote(item) {
    await supabase.from('favorites').delete().eq('id', item.id)
    setNotes(prev => prev.filter(n => n.id !== item.id))
    showToast('Note removed')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadNotes(session.user.id).finally(() => setLoading(false))
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
            <h1 className="text-lg font-bold text-gray-900">📝 Chef Notes</h1>
            {notes.length > 0 && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{notes.length}</span>}
          </div>
          <button onClick={() => window.location.href='/chef'} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5">Ask Chef Jennifer</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-16">
        <div className="text-center px-2 mb-3">
          <p className="text-sm text-gray-600 leading-snug">Saved answers from Chef Jennifer — your cooking notebook.</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-4xl mb-2">📝</p>
            <p className="text-gray-500 font-medium">No saved notes yet</p>
            <p className="text-sm text-gray-400 mt-1">Ask Chef Jennifer a question and save her answer to build your notebook.</p>
            <button onClick={() => window.location.href='/chef'} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Ask Chef Jennifer →</button>
          </div>
        ) : (
          <div className="border-2 border-gray-300 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
            {notes.map(item => (
              <ExpandableItem
                key={item.id}
                item={item}
                emoji="💡"
                onRemove={() => removeNote(item)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
