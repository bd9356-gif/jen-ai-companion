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
//   Cook            — what the user does in the kitchen
//   Learn Your Way  — how the user gets better at it (cooking school framing)
//
// Inside Learn Your Way, Chef Jennifer leads (AI instructor — most personal
// teaching surface), then Chef TV (video classroom), then Your Library (the
// reference articles — Guides), then My Playbook (the practice book).
//
// Tile shape: { emoji, title, description, href }
//   - Cook descriptions stay short (~25–30 chars) so they fit one phone line
//     under truncate.
//   - Learn Your Way descriptions are slightly longer one-liners that
//     describe what the surface DOES — the Cook rhythm doesn't fit teaching
//     surfaces, where the action is the value.

export const KITCHEN_SECTIONS = [
  {
    name: 'Cook',
    subtitle: 'Recipes, meal plans & shopping, simplified by AI.',
    items: [
      { emoji: '🔐', title: 'Recipe Vault',  description: 'Your saved recipes, organized.',  href: '/secret' },
      { emoji: '🃏', title: 'Recipe Cards',  description: "Your mom's style cards.",         href: '/cards' },
      { emoji: '📅', title: 'Meal Plan',     description: "What you're cooking soon.",       href: '/meal-plan' },
      { emoji: '🛒', title: 'Shopping List', description: 'Ingredients, organized to shop.', href: '/shopping-list' },
    ],
  },
  {
    name: 'Learn Your Way',
    subtitle: 'An AI-powered cooking school.',
    items: [
      { emoji: '👨‍🍳', title: 'Chef Jennifer', description: 'Learn, practice, improve with AI.',                   href: '/chef' },
      { emoji: '🎬',   title: 'Chef TV',       description: 'Learn and cook with chefs on video.',                 href: '/videos' },
      { emoji: '📚',   title: 'Your Library',  description: 'Core knife skills, techniques, and cooking fundamentals.', href: '/guides' },
      { emoji: '📘',   title: 'My Playbook',   description: 'Your saved lessons, recipes, videos, and notes.',     href: '/playbook' },
    ],
  },
]
