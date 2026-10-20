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
const MEET_CHEF_JEN_URL = 'https://mycompanionapps.com/meet-chef-jen'

// Promotional cards after the recipe (approved copy — same as the website recipe pages):
//   1. ❤️ Meet Chef Jen (primary)       → mycompanionapps.com/meet-chef-jen   GA4: meet_chef_jen_click
//   2. 🍳 Come Cook With Us! (secondary) → Facebook group                      GA4: chef_jen_group_click
//   3. 💡 Recipe Import Tip (quiet)
export function RecipeTips({ recipeId }) {
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

  return (
    <div className="space-y-3 mb-6">
      <a
        href={MEET_CHEF_JEN_URL}
        onClick={() => track('meet_chef_jen_click', {})}
        className="block rounded-2xl border-2 border-orange-600 bg-orange-50 p-5 shadow-sm hover:bg-orange-100 transition-colors"
      >
        <p className="text-xl font-bold text-gray-900 mb-1.5">❤️ Meet Chef Jen</p>
        <p className="text-[15px] text-gray-700 leading-relaxed">
          Need dinner inspiration? Have ingredients but no plan? Chef Jen in MyRecipe Companion helps turn what you have into a meal you’ll love.{' '}
          <span className="font-bold text-orange-600 underline underline-offset-2">Come see what she can do.</span>
        </p>
      </a>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <p className="text-base font-bold text-gray-900 mb-1">🍳 Come Cook With Us!</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          Enjoyed this recipe? Join{' '}
          <a href={FACEBOOK_GROUP_URL} onClick={(e) => { track('chef_jen_group_click', { cta_location: 'recipe_tip' }); openFacebookGroup(e) }} className="font-semibold text-orange-600 underline">
            {FACEBOOK_GROUP_NAME}
          </a>{' '}
          on Facebook for more recipes, cooking tips, and dinner ideas.
        </p>
      </div>
      <p className="px-1 text-xs text-gray-500 leading-relaxed">
        💡 <strong className="text-gray-600">Recipe Import Tip</strong><br />
        Want to save this recipe? Copy its link and paste it into your favorite recipe app that supports recipe links.
      </p>
    </div>
  )
}
