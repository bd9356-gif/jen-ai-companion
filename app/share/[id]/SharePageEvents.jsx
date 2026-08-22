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
  const destinationUrl = 'https://mycompanionapps.com/myrecipe'

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
      className="inline-flex items-center text-xs font-semibold text-orange-700 border border-orange-200 bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition-colors"
    >
      See What MyRecipe Companion Can Do →
    </a>
  )
}
