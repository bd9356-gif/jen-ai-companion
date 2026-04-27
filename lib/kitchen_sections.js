// Shared source of truth for the MyKitchen tile layout.
//
// Imported by:
//   • app/kitchen/page.js  — the hub, where every tile is a real route
//   • app/page.js          — the landing's "What's inside" preview, where
//                            tiles deep-link to /login (signed-out) or
//                            /kitchen (signed-in) instead of their own routes
//
// When you add/remove/rename a section or tile, you only edit this file.
// Both surfaces stay in sync automatically.
//
// Section model (April 2026 reframe):
//   Cooking Life      — what the user does in the kitchen
//   Learning Journey  — how the user gets better at it
//
// Inside Learning Journey, Chef Jennifer leads (AI instructor — most personal
// teaching surface), then Chef TV (video classroom), then Guides (the
// library), then My Playbook (the practice book).
//
// Tile shape: { emoji, title, description, href }
//   - description text is short (~25–30 chars) so it fits one phone line
//     under truncate. Keep that rhythm when editing.

export const KITCHEN_SECTIONS = [
  {
    name: 'Cooking Life',
    subtitle: 'Your recipes, your plan, your essentials.',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',  description: 'Your saved recipes, organized.',  href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',  description: "Your mom's style cards.",         href: '/cards' },
      { emoji: '📅', title: 'Meal Plan',     description: "What you're cooking soon.",       href: '/meal-plan' },
      { emoji: '🛒', title: 'Shopping List', description: 'Ingredients, organized to shop.', href: '/shopping-list' },
    ],
  },
  {
    name: 'Learning Journey',
    subtitle: 'Your classrooms, your library, your practice book.',
    items: [
      { emoji: '👨‍🍳', title: 'Chef Jennifer — Your Instructor', description: 'Your AI cooking teacher.',    href: '/chef' },
      { emoji: '🎬',   title: 'Chef TV — Watch & Learn',         description: 'Every lesson, on video.',     href: '/videos' },
      { emoji: '📚',   title: 'Guides — Your Library',           description: 'Knife skills, techniques, and tips.', href: '/guides' },
      { emoji: '📘',   title: 'My Playbook — Your Saved Items',  description: 'Videos, recipes, and notes.', href: '/playbook' },
    ],
  },
]
