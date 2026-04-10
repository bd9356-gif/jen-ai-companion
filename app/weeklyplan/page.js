'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WeeklyPlanPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  
  const [plan, setPlan] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return }
      setUser(session.user)
      loadPlan(session.user.id)
    })
  }, [])

  async function loadPlan(userId) {
    const weekStart = getWeekStart()
    const { data } = await supabase
      .from('weekly_plan')
      .select('id, day_of_week, meal_type, recipe_id, recipes(id, title, thumbnail_url, category)')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .order('day_of_week')
    setPlan(data || [])
    setLoading(false)
  }

  async function removeFromPlan(id) {
    await supabase.from('weekly_plan').delete().eq('id', id)
    setPlan(prev => prev.filter(p => p.id !== id))
  }

  async function clearPlan() {
    if (!user) return
    const weekStart = getWeekStart()
    await supabase.from('weekly_plan').delete().eq('user_id', user.id).eq('week_start', weekStart)
    setPlan([])
  }

  function getWeekStart() {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const planByDay = DAYS.reduce((acc, day) => {
    acc[day] = plan.filter(p => p.day_of_week === day)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={() => window.location.href='/kitchen'} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
              <h1 className="text-lg font-bold text-gray-900">📅 Daily / Weekly Recipes</h1>
            </div>
            {plan.length > 0 && (
              <button onClick={clearPlan} className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-3 py-1">
                Clear Week
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 ml-1">Fresh ideas for today, plans for your week.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading your week...</div>
        ) : plan.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-gray-700 font-semibold mb-2">Your week is empty</p>
            <p className="text-gray-400 text-sm mb-6">Browse recipes and add them to your weekly plan</p>
            <a href="/recipes" className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors">
              Browse Recipes
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">{plan.length} recipe{plan.length !== 1 ? 's' : ''} planned this week</p>
            {DAYS.map(day => (
              planByDay[day].length > 0 && (
                <div key={day}>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">{day}</h3>
                  <div className="space-y-2">
                    {planByDay[day].map(item => (
                      <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3">
                        {item.recipes?.thumbnail_url && (
                          <img src={item.recipes.thumbnail_url} alt={item.recipes.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <a href={`/recipes/${item.recipe_id}`}>
                            <p className="font-semibold text-sm text-gray-900 truncate">{item.recipes?.title}</p>
                          </a>
                          <p className="text-xs text-gray-400 capitalize">{item.meal_type}</p>
                        </div>
                        <button onClick={() => removeFromPlan(item.id)} className="text-gray-300 hover:text-red-400 text-xl shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        <div className="mt-8 bg-orange-50 border border-orange-100 rounded-2xl p-5">
          <p className="text-sm font-semibold text-orange-900 mb-1">📌 How to add to your plan</p>
          <p className="text-xs text-orange-700 leading-relaxed">Browse any recipe and tap "Add to Weekly Plan" — then choose the day and meal type. Your plan resets each Monday.</p>
          <a href="/recipes" className="mt-3 inline-block text-sm font-semibold text-orange-700 hover:text-orange-900">
            Browse Recipes →
          </a>
        </div>
      </main>
    </div>
  )
}