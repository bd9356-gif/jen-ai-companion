'use client'
import { useEffect } from 'react'

export function RecipeShareView({ recipeId, recipeTitle }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'recipe_share_view', {
        recipe_id: recipeId,
        recipe_title: recipeTitle,
        page_location: window.location.href,
        page_path: window.location.pathname,
      })
    }
  }, [recipeId, recipeTitle])
  return null
}

export function LearnMoreButton({ recipeId, recipeTitle }) {
  const destinationUrl = 'https://mycompanionapps.com/recipes'

  function handleClick() {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'learn_more_click', {
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_title: document.title,
        recipe_id: recipeId,
        recipe_title: recipeTitle,
        destination_url: destinationUrl,
      })
    }
  }

  return (
    <a
      href={destinationUrl}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-orange-600 px-4 py-1.5 rounded-full hover:bg-orange-700 transition-colors shadow-sm"
    >
      👩‍🍳 See More Recipes →
    </a>
  )
}

const FACEBOOK_GROUP_URL = 'https://m.facebook.com/groups/2143785163199218'
const FACEBOOK_GROUP_NAME = 'What’s for Dinner? with Chef Jen'
// Inside Facebook's own built-in browser on iPhone, every group link shows "Page not found".
// There, hand the link to Safari instead (iOS 17+ x-safari-https: scheme); iOS then opens the group.
const FACEBOOK_GROUP_VIA_SAFARI = 'x-safari-https://www.facebook.com/groups/2143785163199218'
function openFacebookGroup(e) {
  if (typeof navigator === 'undefined') return
  const ua = navigator.userAgent
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua) && /iPhone|iPad|iPod/.test(ua)) {
    e.preventDefault()
    window.location.href = FACEBOOK_GROUP_VIA_SAFARI
  }
}
// Footer after the recipe: three quiet sections, left-aligned, no cards or orange.
//   1. Find Your Next Dinner Idea → → mycompanionapps.com/myrecipe (same tab)   GA4: myrecipe_homepage_click
//   2. You're Welcome to Join Us!  → Facebook group (new tab)   GA4: chef_jen_group_click
//   3. Recipe Import Tip (informational)
const MYRECIPE_HOME_URL = 'https://mycompanionapps.com/myrecipe'
const SAGE = '#5F8A70'
const SLATE = '#557FA3'
const CHARCOAL = '#292929'

export function ShareFooter({ recipeId }) {
  function track(name, params) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, {
        source_page: window.location.pathname,
        source_type: 'recipe_share_page',
        recipe_id: recipeId,
        transport_type: 'beacon',
        ...params,
      })
    }
  }

  const heading = 'text-[19px] font-semibold leading-snug mb-1'
  const body = 'text-[16px] leading-relaxed'

  return (
    <footer className="mt-8 px-1 space-y-6 text-left">
      <section>
        <h2 className={heading}>
          <a
            href={MYRECIPE_HOME_URL}
            onClick={() => track('myrecipe_homepage_click', { cta_location: 'share_footer', destination_url: MYRECIPE_HOME_URL })}
            className="underline underline-offset-4"
            style={{ color: SLATE }}
          >
            🍽️ Find Your Next Dinner&nbsp;Idea&nbsp;→
          </a>
        </h2>
        <p className={body} style={{ color: CHARCOAL }}>Or make any recipe your own, just the way you like it.</p>
      </section>

      <section>
        <h2 className={heading} style={{ color: SAGE }}>You’re Welcome to Join Us!</h2>
        <p className={body} style={{ color: CHARCOAL }}>
          Enjoy cooking? Join{' '}
          <a
            href={FACEBOOK_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { track('chef_jen_group_click', { cta_location: 'recipe_tip' }); openFacebookGroup(e) }}
            className="font-semibold underline underline-offset-2"
            style={{ color: SAGE }}
          >
            {FACEBOOK_GROUP_NAME}
          </a>{' '}
          for recipes, cooking tips, and friendly conversation.
        </p>
      </section>

      <section>
        <h2 className={heading + ' text-gray-700'}>💡 Recipe Import Tip</h2>
        <p className={body + ' text-gray-600'}>
          Want to save this recipe? Copy its link and paste it into your favorite recipe app that supports recipe links.
        </p>
      </section>
    </footer>
  )
}
