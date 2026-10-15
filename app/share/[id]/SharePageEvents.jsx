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

const FACEBOOK_GROUP_URL = 'https://www.facebook.com/share/g/19shn7AGTN/?mibextid=wwXIfr'
const FACEBOOK_GROUP_NAME = 'What’s for Dinner? with Chef Jen'

// Two small tips after the recipe: import it into a recipe app, and join Chef
// Jen's Facebook group (GA4: chef_jen_group_click, same event as the website).
export function RecipeTips({ recipeId }) {
  function handleGroupClick() {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'chef_jen_group_click', {
        source_page: window.location.pathname,
        source_type: 'recipe_share_page',
        cta_location: 'recipe_tip',
        recipe_id: recipeId,
        transport_type: 'beacon',
      })
    }
  }

  return (
    <div className="space-y-3 mb-6">
      <p className="bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed shadow-sm">
        💡 <strong>Recipe Import Tip:</strong> Copy the recipe link from your browser, or tap Share → Copy Link on your phone. Then paste it into the import feature of your favorite recipe app that supports recipe links.
      </p>
      <p className="bg-white rounded-2xl border border-gray-200 p-4 text-sm text-gray-700 leading-relaxed shadow-sm">
        💡 <strong>Facebook Tip:</strong> Enjoy this recipe? Join{' '}
        <a href={FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer" onClick={handleGroupClick} className="font-semibold text-orange-600 underline">
          {FACEBOOK_GROUP_NAME}
        </a>{' '}
        on Facebook for more recipes, cooking tips, and ideas for what to make tonight.
      </p>
    </div>
  )
}
