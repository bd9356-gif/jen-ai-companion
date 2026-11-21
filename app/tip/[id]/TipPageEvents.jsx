'use client'
import { useEffect } from 'react'
import MoreThanRecipesInvite from '@/components/MoreThanRecipesInvite'

function track(name, params) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, {
      page_location: window.location.href,
      page_path: window.location.pathname,
      transport_type: 'beacon',
      ...params,
    })
  }
}

export function TipShareView({ tipId, tipTitle }) {
  useEffect(() => { track('tip_share_view', { tip_id: tipId, tip_title: tipTitle }) }, [tipId, tipTitle])
  return null
}

// Footer after the tip (Nov 2026): the same single invitation as the shared-recipe page —
// More Than Recipes, one button to the MyRecipe Companion product page. Replaces the earlier
// three links (more tips, dinner idea, Facebook group). GA4: myrecipe_homepage_click.
export function TipFooter({ tipId }) {
  return <MoreThanRecipesInvite sourceType="tip_share_page" params={{ tip_id: tipId }} />
}
