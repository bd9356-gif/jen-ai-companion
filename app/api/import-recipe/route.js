// YouTube Video Ingestion Script for MyRecipe Companion
// Run: node ingest_videos.js
// Requires: npm install @supabase/supabase-js node-fetch

const { createClient } = require('@supabase/supabase-js')

// ── CREDENTIALS ──────────────────────────────────────────────
const YOUTUBE_API_KEY = 'AIzaSyBkpPcDD2_UFRuNmui7vcUyh8yrCDenPjo'
const SUPABASE_URL = 'https://epgtahifcphwjifxmxst.supabase.co'
const SUPABASE_KEY = 'sb_secret_LuPgurliq-92bmy5HGhjTQ_3udJuXCU'
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CHANNELS = [
  { name: 'Chef Jean-Pierre',     id: 'UCqEqHuax9o-ZyRRQARpH6Dg', category: 'Classic',      cuisine: 'French/American' },
  { name: 'Binging with Babish',  id: 'UCJHA_jMfCvEnv-3kRjTCQXw', category: 'Creative',     cuisine: 'American' },
  { name: 'Joshua Weissman',      id: 'UChBEbMKI1eCcejTtmI32UEw', category: 'Homemade',     cuisine: 'American' },
  { name: 'Gordon Ramsay',        id: 'UCIEv3lZ_tNXHzL3ox-_uUGQ', category: 'Professional', cuisine: 'International' },
  { name: 'Ethan Chlebowski',     id: 'UCDq5v10l4wkV5-ZBIJJFbzQ', category: 'Science',      cuisine: 'American' },
  { name: 'Brian Lagerstrom',     id: 'UCNSzmLeDmWpPHm8kTZ9rQiw', category: 'Homemade',     cuisine: 'American' },
  { name: 'Adam Ragusea',         id: 'UC9_p50tH3WmMslWRWKnM7dQ', category: 'Science',      cuisine: 'American' },
  { name: 'Pro Home Cooks',       id: 'UCTRiPn3sU-W5xHSVQzVoaQw', category: 'Everyday',     cuisine: 'American' },
  { name: 'Internet Shaquille',   id: 'UCVBRQtB1xMmhqFY1wbEYHFA', category: 'Everyday',     cuisine: 'American' },
  { name: 'Italia Squisita',      id: 'UCgNDnOwAUF6ynq_RUR1mQqg', category: 'Classic',      cuisine: 'Italian' },
]

async function fetchVideos(channel, pageToken = null, collected = []) {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    channelId: channel.id,
    part: 'snippet',
    type: 'video',
    order: 'viewCount',
    maxResults: 50,
    ...(pageToken && { pageToken })
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  const data = await res.json()

  if (data.error) {
    console.error(`Error for ${channel.name}:`, data.error.message)
    return collected
  }

  const items = data.items || []
  collected.push(...items)

  if (collected.length >= 50 || !data.nextPageToken) {
    return collected.slice(0, 50)
  }

  return fetchVideos(channel, data.nextPageToken, collected)
}

async function getVideoDetails(videoIds) {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoIds.join(','),
    part: 'contentDetails,statistics',
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`)
  const data = await res.json()
  return data.items || []
}

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || 0)
  const m = parseInt(match[2] || 0)
  const s = parseInt(match[3] || 0)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

async function ingestChannel(channel) {
  console.log(`\n📺 Fetching: ${channel.name}...`)
  const videos = await fetchVideos(channel)
  console.log(`  Found ${videos.length} videos`)
  if (videos.length === 0) return

  const videoIds = videos.map(v => v.id.videoId).filter(Boolean)
  const details = await getVideoDetails(videoIds)
  const detailMap = {}
  details.forEach(d => { detailMap[d.id] = d })

  let inserted = 0, skipped = 0

  for (const video of videos) {
    const id = video.id?.videoId
    if (!id) continue

    const snippet = video.snippet
    const detail = detailMap[id]
    const stats = detail?.statistics || {}
    const duration = parseDuration(detail?.contentDetails?.duration || '')

    const { error } = await supabase.from('cooking_videos').upsert({
      youtube_id: id,
      title: snippet.title,
      channel: channel.name,
      channel_id: channel.id,
      thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
      duration,
      category: channel.category,
      cuisine: channel.cuisine,
      tags: [],
      view_count: parseInt(stats.viewCount || 0),
      published_at: snippet.publishedAt,
    }, { onConflict: 'youtube_id' })

    if (error) { skipped++; console.log(`  ⚠️  ${snippet.title.substring(0,40)}: ${error.message}`) }
    else inserted++
  }

  console.log(`  ✅ Inserted/updated: ${inserted} | Skipped: ${skipped}`)
}

async function main() {
  console.log('🍳 MyRecipe Companion — YouTube Video Ingestion')
  console.log('================================================')

  for (const channel of CHANNELS) {
    await ingestChannel(channel)
    await new Promise(r => setTimeout(r, 1000))
  }

  const { count } = await supabase
    .from('cooking_videos')
    .select('*', { count: 'exact', head: true })

  console.log(`\n🎉 Done! Total videos in database: ${count}`)
}

main().catch(console.error)