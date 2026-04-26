import { redirect } from 'next/navigation'

// /chef-notes is retired (April 2026). Chef Notes (saved AI answers) now
// live inside /playbook alongside the Teach and Practice video buckets so
// everything a user has saved sits on one page. The Chef Notes section
// on /playbook reads the same favorites.type='ai_answer' rows and the
// save flow from Ask Chef Jennifer still writes to that table — only
// the surface moved.
export default function ChefNotesRedirect() {
  redirect('/playbook')
}
