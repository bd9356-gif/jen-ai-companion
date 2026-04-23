import { redirect } from 'next/navigation'

// Skills I Learned was retired in favor of My Playbook (April 2026). The
// course-type buckets (Breakfast / Mains / Sides / Baking / Desserts) didn't
// fit how home cooks actually sort cooking videos — one video could be a
// breakfast AND a technique AND a comfort dish. The four intent-based
// buckets in Playbook (Save / Love / Cooked / Learn) ask a question the
// user can actually answer at save time.
//
// This server-side redirect preserves old /skills bookmarks. Data in
// cooking_skill_items was migrated (supabase/003_playbook_buckets.sql).
export default function SkillsRedirect() {
  redirect('/playbook')
}
