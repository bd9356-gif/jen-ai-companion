'use client'
import { useEffect } from 'react'
import MoreThanRecipesInvite from '@/components/MoreThanRecipesInvite'

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

// Footer after the recipe (Nov 2026): one invitation — More Than Recipes, one button to the
// MyRecipe Companion product page. Replaces the earlier dinner-idea link, Facebook group
// invitation and Recipe Import Tip. GA4: myrecipe_homepage_click (more_than_recipes_footer).
export function ShareFooter({ recipeId }) {
  return <MoreThanRecipesInvite sourceType="recipe_share_page" params={{ recipe_id: recipeId }} />
}
