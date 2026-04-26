import { redirect } from 'next/navigation'

/* ─────────────────────────────────────────────────────────────
   /topchef → /chef redirect (Phase 2A — Cooking School pivot).

   The Meal/Mood/Protein/Preferences wizard was retired in
   April 2026 and folded into a single chat-first surface at
   /chef with a Teach/Practice pill row at the top:

     🎓 Teach    → Chef Jennifer answers your kitchen questions
     🍳 Practice → Chef Jennifer makes you a recipe

   The vocabulary pivoted from Love/Learn to Practice/Teach in
   migration 009 (April 2026): Love was the wrong word — it
   implied favorites/saved/liked/emotion. The new words name
   the *action* the user takes with each save.

   Old bookmarks still land somewhere useful — this redirect
   keeps them working without keeping the wizard alive.
   ─────────────────────────────────────────────────────────── */
export default function TopChefRedirect() {
  redirect('/chef')
}
