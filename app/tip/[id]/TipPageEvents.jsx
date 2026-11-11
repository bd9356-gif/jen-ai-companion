'use client'
import { useEffect } from 'react'

const MYRECIPE_HOME_URL = 'https://mycompanionapps.com/myrecipe'
const TIPS_URL = 'https://mycompanionapps.com/tips'
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

// Footer after the tip: exactly three next steps (same as the website tip pages).
// "Find Your Next Dinner Idea" goes to the MyRecipe Companion homepage (/myrecipe).
// GA4: learn_more_click, myrecipe_homepage_click, chef_jen_group_click.
export function TipFooter({ tipId }) {
  const heading = 'text-[19px] font-semibold leading-snug underline underline-offset-4'
  const body = 'text-[16px] leading-relaxed mt-1'
  const t = (name, params) => track(name, { tip_id: tipId, source_type: 'tip_share_page', cta_location: 'tip_footer', ...params })
  return (
    <footer className="mt-8 px-1 text-left">
      <div className="space-y-6">
        <section>
          <a href={TIPS_URL} onClick={() => t('learn_more_click', { destination_url: TIPS_URL })} className={heading} style={{ color: '#5F8A70' }}>
            👩‍🍳 More Chef Jen Kitchen&nbsp;Tips&nbsp;→
          </a>
          <p className={body} style={{ color: '#292929' }}>Cooking made easier.</p>
        </section>
        <section>
          <a href={MYRECIPE_HOME_URL} onClick={() => t('myrecipe_homepage_click', { cta_location: 'tip_footer_dinner_idea', destination_url: MYRECIPE_HOME_URL })} className={heading} style={{ color: '#557FA3' }}>
            🍽️ Find Your Next Dinner&nbsp;Idea&nbsp;→
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
            👥 Join What’s for Dinner? with&nbsp;Chef&nbsp;Jen&nbsp;→
          </a>
          <p className={body} style={{ color: '#292929' }}>Join the conversation.</p>
        </section>
      </div>
    </footer>
  )
}
