import { redirect } from 'next/navigation'

// Skills I Learned was retired in favor of My Playbook (April 2026). The
// course-type buckets (Breakfast / Mains / Sides / Baking / Desserts) didn't
// fit how home cooks actually sort cooking videos — one video could be a
// breakfast AND a technique AND a comfort dish. Intent-based buckets in
// Playbook ask a question the user can actually answer at save time. The
// vocabulary settled at Teach / Practice via migration 009 (April 2026)
// after passing through several intermediate shapes (Save/Love/Cooked/Learn
// → Save/Love/Learn → Love/Learn → Practice/Teach).
//
// This server-side redirect preserves old /skills bookmarks. Data in
// cooking_skill_items was migrated through supabase/003 → 004 → 006 → 009.
export default function SkillsRedirect() {
  redirect('/playbook')
}
