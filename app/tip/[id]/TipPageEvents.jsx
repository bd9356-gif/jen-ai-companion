'use client'
import { useEffect } from 'react'

const MEET_CHEF_JEN_URL = 'https://mycompanionapps.com/meet-chef-jen'
const TIPS_URL = 'https://mycompanionapps.com/tips'

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

export function TipAppButton({ tipId }) {
  return (
    <a
      href={MEET_CHEF_JEN_URL}
      onClick={() => track('meet_chef_jen_click', { tip_id: tipId, source_type: 'tip_share_page', destination_url: MEET_CHEF_JEN_URL })}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-orange-600 px-4 py-2 rounded-full hover:bg-orange-700 transition-colors shadow-sm"
    >
      Meet Chef Jen →
    </a>
  )
}

export function TipMoreButton({ tipId }) {
  return (
    <a
      href={TIPS_URL}
      onClick={() => track('learn_more_click', { tip_id: tipId, destination_url: TIPS_URL })}
      className="inline-flex items-center justify-center gap-1.5 text-sm font-bold text-orange-700 bg-white border-2 border-orange-600 px-4 py-2 rounded-full hover:bg-orange-50 transition-colors"
    >
      👩‍🍳 See More Chef Jen Tips →
    </a>
  )
}
