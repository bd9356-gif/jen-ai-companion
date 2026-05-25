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
// reference articles — Guides), then My Studio (the staging ground).
//
// Tile shape: { emoji, title, description, href }
//   - Cook descriptions stay short (~25–30 chars) so they fit one phone line
//     under truncate.
//   - Learn Your Way descriptions are slightly longer one-liners that
//     describe what the surface DOES — the Cook rhythm doesn't fit teaching
//     surfaces, where the action is the value.

// Per-section color story (May 2026): Cook = orange (the food /
// appetite signal — warm, energetic, the brand's primary), Learn Your
// Way = sky (the learning / calm-focus signal — and the same color
// already used for 🎓 Teach mode across Chef TV and Chef Jennifer, so
// the diptych on the hub previews the color you'll see when you walk
// into either classroom). Each section's `color` is a literal Tailwind
// class group so v4's JIT scanner picks them up — no dynamic concat.
export const KITCHEN_SECTIONS = [
  {
    name: 'My Vaults',
    subtitle: 'Your permanent home for everything you save.',
    color: {
      label: 'text-orange-600',
      stripe: 'border-l-orange-600',
      hover: 'hover:border-orange-300',
    },
    items: [
      { emoji: '🔐', title: 'Recipe Vault',   description: 'Your saved recipes, organized.',        href: '/secret' },
      { emoji: '🎓', title: 'Learning Vault', description: 'Your saved lessons and techniques.',    href: '/secret?view=cardbox' },
      { emoji: '🎤', title: 'Social Share',   description: 'Your stage — share your creations.',   href: '/secret?view=portfolio' },
    ],
  },
  {
    name: 'My Kitchen',
    subtitle: 'Your everyday cooking life.',
    color: {
      label: 'text-amber-600',
      stripe: 'border-l-amber-600',
      hover: 'hover:border-amber-300',
    },
    items: [
      { emoji: '🃏', title: 'Recipe Cards',  description: "Your mom's style cards.",         href: '/cards' },
      { emoji: '📅', title: 'Meal Plan',     description: "What you're cooking soon.",       href: '/meal-plan' },
      { emoji: '🛒', title: 'Shopping List', description: 'Ingredients, organized to shop.', href: '/shopping-list' },
    ],
  },
  {
    name: 'My Learning Journey',
    subtitle: 'Your personal cooking school.',
    color: {
      label: 'text-sky-600',
      stripe: 'border-l-sky-600',
      hover: 'hover:border-sky-300',
    },
    items: [
      { emoji: '👨‍🍳', title: 'Chef Jennifer', description: 'Let’s learn and improve together.',                  href: '/chef' },
      { emoji: '🎬',   title: 'Chef TV',       description: 'World-class chefs, teaching you their craft.',        href: '/videos' },
      { emoji: '📚',   title: 'Your Library',  description: 'Core knife skills, techniques, and cooking fundamentals.', href: '/guides' },
      { emoji: '📘',   title: 'My Studio',   description: 'Your staging ground — lessons, recipes, and notes.',     href: '/playbook' },
    ],
  },
]