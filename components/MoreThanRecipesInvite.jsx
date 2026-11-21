'use client'

// One invitation after a shared recipe or Chef Jen tip (Nov 2026): what the visitor came for
// comes first; then one message, one button, one destination — the MyRecipe Companion
// product page (same tab). Same design and wording on recipe and tip pages.
// GA4: myrecipe_homepage_click with cta_location more_than_recipes_footer and the page type
// (source_type) plus the recipe or tip id, so recipe → product and tip → product can be compared.

const MYRECIPE_HOME_URL = 'https://mycompanionapps.com/myrecipe'

export default function MoreThanRecipesInvite({ sourceType, params = {} }) {
  function handleClick() {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'myrecipe_homepage_click', {
        cta_location: 'more_than_recipes_footer',
        source_type: sourceType,
        source_page: window.location.pathname,
        page_location: window.location.href,
        destination_url: MYRECIPE_HOME_URL,
        transport_type: 'beacon',
        ...params,
      })
    }
  }

  return (
    <footer className="mt-10 pt-8 border-t border-gray-200 text-center px-2">
      <h2 className="text-[28px] font-bold text-gray-900 leading-tight">More Than Recipes</h2>
      <p className="text-[16px] text-gray-600 leading-relaxed mt-2 mb-5">
        Experience the future of home cooking with AI Chef&nbsp;Jen.
      </p>
      <a
        href={MYRECIPE_HOME_URL}
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 min-h-[52px] px-7 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-[17px] font-bold shadow-md transition-colors"
      >
        Explore MyRecipe Companion&nbsp;→
      </a>
    </footer>
  )
}
