import { redirect } from 'next/navigation'

// Chef Jennifer Recipes was retired as a standalone page in April 2026,
// folded into My Playbook as the ✨ Chef Recipes tab. The data shape
// (favorites.type='ai_recipe') is unchanged — only the surface moved.
// Same pattern that brought Chef Notes (favorites.type='ai_answer') in
// from /chef-notes earlier.
//
// This server-side redirect preserves old /chef-recipes bookmarks and
// any in-app links from the legacy /picks?open=chefjen path.
export default function ChefRecipesRedirect() {
  redirect('/playbook')
}
