'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUGGESTED = [
  "What can I make with chicken, garlic, and lemon?",
  "How do I know when oil is hot enough for frying?",
  "What's a good substitute for buttermilk?",
  "How do I make pasta not stick together?",
  "What should I make for a quick weeknight dinner?",
  "How do I fix a sauce that's too salty?",
]

export default function ChefPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [toast, setToast] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      setMessages([...newMessages, { role: 'assistant', content: data.reply, question: text.trim() }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function saveToFavorites(msg) {
    if (!user) { window.location.href = '/login'; return }
    if (savedIds.has(msg.question)) return

    await supabase.from('favorites').insert({
      user_id: user.id,
      type: 'ai_answer',
      title: msg.question.substring(0, 120),
      thumbnail_url: '',
      source: 'ai',
      is_in_vault: false,
      metadata: {
        question: msg.question,
        answer: msg.content,
      }
    })

    setSavedIds(prev => new Set([...prev, msg.question]))
    showToast(type === 'recipe' ? 'Saved as AI Recipe ✓' : 'Saved as Note ✓')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <h1 className="text-lg font-bold text-gray-900">🤖 Ask-AI Anything</h1>
          </div>
          <button onClick={() => setMessages([])} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1">
            Clear
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="text-center py-6">
                <p className="text-4xl mb-2">🤖</p>
                <p className="text-gray-700 font-semibold">Ask me anything about cooking!</p>
                <p className="text-gray-400 text-sm mt-1">Instant answers, clearly explained.</p>
              </div>
              <p className="text-sm text-gray-400 text-center">Try asking:</p>
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-xl text-sm text-gray-700 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-orange-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <p className="text-xs text-gray-500 font-semibold mb-1">🤖 Ask-AI Anything</p>
                  )}
                  {msg.content}
                </div>

                {/* Save button for AI responses */}
                {msg.role === 'assistant' && msg.question && (
                  <div className="flex gap-2 mt-2 ml-1">
                    <button
                      onClick={() => saveToFavorites(msg)}
                      disabled={savedIds.has(msg.question)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        savedIds.has(msg.question)
                          ? 'bg-gray-100 text-gray-400 border-gray-200'
                          : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
                      }`}>
                      {savedIds.has(msg.question) ? '✓ Saved to MyFavorites' : '♥ Save to MyFavorites'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Ask your chef anything..."
              rows={1}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
              className="h-11 w-11 shrink-0 bg-orange-600 text-white rounded-xl flex items-center justify-center hover:bg-orange-700 disabled:opacity-40 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Instant answers, clearly explained.</p>
        </div>
      </main>
    </div>
  )
}