'use client'
import { useEffect } from 'react'

const MYRECIPE_HOME_URL = 'https://mycompanionapps.com/myrecipe'
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

// Footer after the tip: two quiet, left-aligned invitations (same style as the shared-recipe footer).
//   1. Explore More Than Recipes →  → mycompanionapps.com/myrecipe (same tab)   GA4: myrecipe_homepage_click
//   2. 👩‍🍳 See More Chef Jen Tips → → mycompanionapps.com/tips                  GA4: learn_more_click (unchanged)
export function TipFooter({ tipId }) {
  const heading = 'text-[19px] font-semibold leading-snug mb-1'
  const body = 'text-[16px] leading-relaxed'
  return (
    <footer className="mt-8 px-1 space-y-6 text-left">
      <section>
        <h2 className={heading}>
          <a
            href={MYRECIPE_HOME_URL}
            onClick={() => track('myrecipe_homepage_click', { tip_id: tipId, source_type: 'tip_share_page', cta_location: 'tip_footer', destination_url: MYRECIPE_HOME_URL })}
            className="underline underline-offset-4"
            style={{ color: '#5F8A70' }}
          >
            Explore More Than Recipes →
          </a>
        </h2>
        <p className={body} style={{ color: '#292929' }}>See what MyRecipe Companion can do for you.</p>
      </section>
      <section>
        <h2 className={heading}>
          <a
            href={TIPS_URL}
            onClick={() => track('learn_more_click', { tip_id: tipId, destination_url: TIPS_URL })}
            className="underline underline-offset-4"
            style={{ color: '#557FA3' }}
          >
            👩‍🍳 See More Chef Jen Tips →
          </a>
        </h2>
        <p className={body} style={{ color: '#292929' }}>Explore more cooking tips, helpful ideas, and everyday kitchen advice.</p>
      </section>
    </footer>
  )
}
