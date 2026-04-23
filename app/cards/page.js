import { redirect } from 'next/navigation'

// /cards is retired (Phase 3). The index-card grid now lives at /secret as a
// list/cards view toggle, so all /cards traffic (including the old Kitchen
// tile bookmark) forwards to /secret with ?view=cards so the vault lands in
// cards mode on arrival.
export default function CardsRedirect() {
  redirect('/secret?view=cards')
}
