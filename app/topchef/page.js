import { redirect } from 'next/navigation'

/* ─────────────────────────────────────────────────────────────
   /topchef → /chef redirect (Phase 2A — Cooking School pivot).

   The Meal/Mood/Protein/Preferences wizard was retired in
   April 2026 and folded into a single chat-first surface at
   /chef with a Love/Learn pill row at the top:

     ❤️ Love  → Chef Jennifer makes you a recipe
     🎓 Learn → Chef Jennifer answers your kitchen questions

   Old bookmarks still land somewhere useful — this redirect
   keeps them working without keeping the wizard alive.
   ─────────────────────────────────────────────────────────── */
export default function TopChefRedirect() {
  redirect('/chef')
}
