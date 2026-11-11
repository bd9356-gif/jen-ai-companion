'use client'
import { useEffect } from 'react'

const MYRECIPE_HOME_URL = 'https://mycompanionapps.com/myrecipe'
const TIPS_URL = 'https://mycompanionapps.com/tips'
const RECIPES_URL = 'https://mycompanionapps.com/recipes'
const FACEBOOK_GROUP_SHARE_URL = 'https://www.facebook.com/share/g/19wjF8WYr7/?mibextid=wwXIfr'
// Inside Facebook's own built-in browser on iPhone, group links show "Page not found".
// There, hand the link to Safari instead (same fix as the shared-recipe page).
const FACEBOOK_GROUP_VIA_SAFARI = 'x-safari-https://www.facebook.com/groups/2143785163199218'
function openFacebookGroup(e) {
  if (typeof navigator === 'undefined') return
  const ua = navigator.userAgent
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(ua) && /iPhone|iPad|iPod/.test(ua)) {
    e.preventDefault()
    window.location.href = FACEBOOK_GROUP_VIA_SAFARI
  }
}

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

// Footer after the tip: three helpful next steps, then a quieter More Than Recipes invitation.
// Left-aligned, no boxes (same style as the shared-recipe footer and the website tip pages).
// GA4: learn_more_click, recipe_collection_click, chef_jen_group_click, myrecipe_homepage_click.
export function TipFooter({ tipId }) {
  const heading = 'text-[19px] font-semibold leading-snug underline underline-offset-4'
  const body = 'text-[16px] leading-relaxed mt-1'
  const t = (name, params) => track(name, { tip_id: tipId, source_type: 'tip_share_page', cta_location: 'tip_footer', ...params })
  return (
    <footer className="mt-8 px-1 text-left">
      <div className="space-y-6">
        <section>
          <a href={TIPS_URL} onClick={() => t('learn_more_click', { destination_url: TIPS_URL })} className={heading} style={{ color: '#5F8A70' }}>
            👩‍🍳 More Chef Jen Kitchen Tips →
          </a>
          <p className={body} style={{ color: '#292929' }}>Cooking made easier.</p>
        </section>
        <section>
          <a href={RECIPES_URL} onClick={() => t('recipe_collection_click', { destination_url: RECIPES_URL })} className={heading} style={{ color: '#557FA3' }}>
            🍽️ Find Your Next Dinner Idea →
          </a>
          <p className={body} style={{ color: '#292929' }}>What’s for dinner tonight?</p>
        </section>
        <section>
          <a
            href={FACEBOOK_GROUP_SHARE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { t('chef_jen_group_click', {}); openFacebookGroup(e) }}
            className={heading}
            style={{ color: '#262626' }}
          >
            👥 Join What’s for Dinner? with Chef Jen →
          </a>
          <p className={body} style={{ color: '#292929' }}>Join the conversation.</p>
        </section>
      </div>

      {/* Quieter secondary invitation, set apart from the three links above */}
      <section className="mt-11">
        <a
          href={MYRECIPE_HOME_URL}
          onClick={() => t('myrecipe_homepage_click', { destination_url: MYRECIPE_HOME_URL })}
          className="text-[16px] font-semibold underline underline-offset-[3px]"
          style={{ color: '#5C5C5C' }}
        >
          Explore More Than Recipes →
        </a>
        <p className="text-[15px] leading-relaxed mt-1" style={{ color: '#6B6B6B' }}>See what MyRecipe Companion can do for you.</p>
      </section>
    </footer>
  )
}
