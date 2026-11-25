'use client'

// One invitation after a shared recipe or Chef Jen tip (Nov 2026): what the visitor came for
// comes first; then one button (See What Chef Jen Can Do for You →) with one
// supporting line beneath it, one destination — the MyRecipe Companion
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
      {/* Button first, then the one supporting line (Nov 2026). The label may wrap to two
          balanced lines on a phone; "for You →" always stays together. */}
      <a
        href={MYRECIPE_HOME_URL}
        onClick={handleClick}
        className="inline-flex items-center justify-center max-w-full min-h-[52px] px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-[17px] leading-snug font-bold shadow-md transition-colors"
        style={{ textWrap: 'balance' }}
      >
        See What Chef Jen Can Do for&nbsp;You&nbsp;→
      </a>
      <p className="text-[16px] text-gray-600 leading-relaxed mt-4 max-w-md mx-auto">
        Your personal cooking companion. Discover how Chef Jen can help you in the&nbsp;kitchen.
      </p>
    </footer>
  )
}
