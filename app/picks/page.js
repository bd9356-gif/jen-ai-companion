import { redirect } from 'next/navigation'

// /picks is retired (Phase 2C). Its five sections now live at dedicated routes.
// This server-side redirect forwards old bookmarks to the right place:
//   /picks                         → /kitchen
//   /picks?open=meal_plan          → /meal-plan
//   /picks?open=shopping_list      → /shopping-list
//   /picks?open=ai_notes           → /chef-notes
//   /picks?open=chefjen            → /chef-recipes
//   /picks?open=chef_videos        → /skills
// Any unknown `?open=` value falls through to /kitchen.
const OPEN_TO_ROUTE = {
  meal_plan: '/meal-plan',
  shopping_list: '/shopping-list',
  ai_notes: '/chef-notes',
  chefjen: '/chef-recipes',
  chef_videos: '/skills',
}

export default async function PicksRedirect({ searchParams }) {
  const params = await searchParams
  const open = typeof params?.open === 'string' ? params.open : null
  const dest = (open && OPEN_TO_ROUTE[open]) || '/kitchen'
  redirect(dest)
}
