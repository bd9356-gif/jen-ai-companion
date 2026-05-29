export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-600">← Back</a>
          <h1 className="text-lg font-bold text-gray-900">Privacy Policy</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-gray-700">
        <p className="text-sm text-gray-500">Last updated: May 2026</p>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Overview</h2>
          <p className="text-sm leading-relaxed">MyRecipe Companion ("we", "our", or "us") is built by My Companion Apps. This privacy policy explains how we collect, use, and protect your information when you use MyRecipe Companion.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Information We Collect</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc pl-4">
            <li><strong>Account information:</strong> When you sign in with Google or email, we collect your name and email address.</li>
            <li><strong>Recipes and content:</strong> Recipes, notes, tags, and photos you save in the app are stored in your personal vault.</li>
            <li><strong>Usage data:</strong> We collect basic usage information to improve the app.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">How We Use Your Information</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc pl-4">
            <li>To provide and improve the MyRecipe Companion service</li>
            <li>To power Chef Jen AI recipe generation and cooking assistance</li>
            <li>To sync your recipes and preferences across devices</li>
            <li>To send important service updates (no marketing without consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Data Storage</h2>
          <p className="text-sm leading-relaxed">Your data is stored securely using Supabase, a trusted cloud database provider. Your recipe vault is private and only visible to you.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Third-Party Services</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc pl-4">
            <li><strong>Google OAuth:</strong> Used for sign-in. Governed by Google's privacy policy.</li>
            <li><strong>Anthropic Claude AI:</strong> Powers Chef Jen. Your recipe queries are sent to Anthropic's API. No personal data is stored by Anthropic.</li>
            <li><strong>OpenAI:</strong> Used for AI photo generation. Governed by OpenAI's privacy policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Your Rights</h2>
          <ul className="text-sm leading-relaxed space-y-2 list-disc pl-4">
            <li>You can delete your account and all associated data at any time</li>
            <li>You can export your recipe data</li>
            <li>You can contact us to request data deletion</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Children's Privacy</h2>
          <p className="text-sm leading-relaxed">MyRecipe Companion is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Contact Us</h2>
          <p className="text-sm leading-relaxed">If you have questions about this privacy policy, contact us at: <a href="mailto:support@mycompanionapps.com" className="text-orange-600 underline">support@mycompanionapps.com</a></p>
        </section>
      </main>
    </div>
  )
}