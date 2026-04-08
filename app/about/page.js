'use client'
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => window.history.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-lg font-bold text-gray-900">About</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* App Identity */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
            <span style={{fontSize:'32px'}}>🍽️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">MyRecipe Companion</h2>
          <p className="text-sm text-gray-500 mt-1">Version 1.0</p>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-xs">
            Your personal AI-powered cooking companion — discover recipes, save favorites, plan meals, and build your private recipe vault.
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">What's Inside</p>
          </div>
          {[
            { emoji: '🔐', label: 'MyRecipeVault', desc: 'Your private recipe library' },
            { emoji: '🍳', label: 'Explore Recipes', desc: '1,200+ recipes to discover' },
            { emoji: '❤️', label: 'MyFavorites', desc: 'Save recipes and cooking videos' },
            { emoji: '🤖', label: 'MyChef AI', desc: 'AI-powered cooking guidance' },
            { emoji: '📅', label: 'Meal Planner', desc: 'Plan your week ahead' },
          ].map((item, i, arr) => (
            <div key={item.label} className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span style={{fontSize:'18px'}}>{item.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Built by */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Built By</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              MyRecipe Companion is part of the <span className="font-semibold text-orange-600">MyCompanionApps</span> suite — a family of AI-powered companion apps built to make everyday life a little easier.
            </p>
            <a href="https://mycompanionapps.com" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700">
              Visit MyCompanionApps.com ↗
            </a>
          </div>
        </div>

        {/* Tech */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Powered By</p>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {['Next.js', 'Supabase', 'Claude AI', 'Vercel', 'Tailwind CSS'].map(tech => (
              <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{tech}</span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">© 2025 MyCompanionApps · All rights reserved</p>

      </main>
    </div>
  )
}