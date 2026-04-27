// Starter recipes seeded into a new user's Recipe Vault on first MyKitchen visit.
// Keep this list short (5-6) and varied: one quick weeknight, one comfort, one
// healthy, one dessert, one "project" cook. The goal is a Vault that already
// feels lived-in, and a tour of what the app can do.
//
// Schema matches personal_recipes:
//   title, description, category, difficulty, servings, tags[],
//   ingredients: [{name, measure}], instructions (newline-separated string),
//   family_notes, photo_url, is_favorite
//
// family_notes carries a warm "welcome" line that doubles as the app-seeded
// marker so users know these are examples, not personal saves.
//
// is_favorite: true on a small subset (the easy weeknight + the dessert) so the
// new user lands in the Vault with the ❤️ Favorites filter chip already
// populated and Meal Plan ⭐ To Make pre-filled — it shows the feature exists
// without the user having to discover it cold.

export const STARTER_RECIPES = [
  {
    title: 'Spaghetti Aglio e Olio',
    description:
      "A 20-minute Italian classic — silky pasta with garlic, olive oil, and a whisper of chili. The kind of dinner you can make from what's already in the kitchen.",
    category: 'Italian',
    difficulty: 'easy',
    servings: 4,
    tags: ['pasta', 'quick', 'vegetarian', 'italian', 'weeknight'],
    ingredients: [
      { name: 'spaghetti', measure: '1 lb' },
      { name: 'garlic, thinly sliced', measure: '6 cloves' },
      { name: 'extra virgin olive oil', measure: '1/2 cup' },
      { name: 'red pepper flakes', measure: '1/2 tsp' },
      { name: 'fresh parsley, chopped', measure: '1/4 cup' },
      { name: 'kosher salt', measure: 'to taste' },
      { name: 'parmesan, grated', measure: 'for serving' },
    ],
    instructions: [
      'Bring a large pot of well-salted water to a boil. Cook spaghetti to al dente per package directions. Before draining, scoop out 1 cup of the pasta water.',
      'While the pasta cooks, warm the olive oil in a large skillet over medium-low heat. Add the sliced garlic and red pepper flakes and cook gently for 2 to 3 minutes until the garlic is fragrant and just turning golden — do not let it brown.',
      'Add the drained pasta to the skillet along with about 1/2 cup of the reserved pasta water. Toss to coat, adding more pasta water a splash at a time until the sauce is silky and clings to the noodles.',
      'Remove from heat, stir in the parsley, and taste for salt. Serve right away with a generous shower of parmesan.',
    ].join('\n'),
    family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own.",
    photo_url: '',
    is_favorite: true,
  },

  {
    title: 'Sheet-Pan Lemon Chicken & Vegetables',
    description:
      'Everything roasts together on one pan — golden chicken, tender potatoes, and caramelized broccoli in a bright lemon-garlic glaze. Minimal dishes, maximum cozy.',
    category: 'Weeknight',
    difficulty: 'easy',
    servings: 4,
    tags: ['chicken', 'sheet-pan', 'weeknight', 'one-pan', 'heart-healthy'],
    ingredients: [
      { name: 'boneless skinless chicken thighs', measure: '1.5 lbs' },
      { name: 'baby potatoes, halved', measure: '1 lb' },
      { name: 'broccoli florets', measure: '4 cups' },
      { name: 'lemon, zested and juiced', measure: '1 large' },
      { name: 'garlic, minced', measure: '4 cloves' },
      { name: 'olive oil', measure: '3 tbsp' },
      { name: 'dried oregano', measure: '1 tsp' },
      { name: 'kosher salt', measure: '1.5 tsp' },
      { name: 'black pepper', measure: '1/2 tsp' },
    ],
    instructions: [
      'Preheat the oven to 425°F (220°C) and line a large sheet pan with parchment.',
      'In a small bowl whisk together the olive oil, lemon zest, lemon juice, minced garlic, oregano, salt, and pepper.',
      'Toss the halved potatoes with a third of the sauce and spread them on one side of the sheet pan. Roast for 15 minutes to get a head start.',
      'While the potatoes roast, toss the chicken thighs in another third of the sauce. After the 15 minutes, push the potatoes to one side and add the chicken to the pan. Return to the oven for 15 more minutes.',
      'Toss the broccoli with the remaining sauce. Add it to the pan, give everything a stir, and roast another 10 to 12 minutes until the chicken is cooked through (165°F internal) and the broccoli edges are crispy.',
      'Let rest for 5 minutes, then serve straight from the pan with extra lemon wedges if you like.',
    ].join('\n'),
    family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own.",
    photo_url: '',
  },

  {
    title: 'Cozy Tomato Soup with Grilled Cheese',
    description:
      'Creamy tomato soup that tastes like you spent all day on it (you did not), paired with the crispiest grilled cheese. A rainy-day hug in bowl form.',
    category: 'Comfort',
    difficulty: 'easy',
    servings: 4,
    tags: ['soup', 'comfort', 'vegetarian', 'weeknight'],
    ingredients: [
      { name: 'canned whole peeled tomatoes', measure: '28 oz' },
      { name: 'yellow onion, chopped', measure: '1 medium' },
      { name: 'garlic, minced', measure: '3 cloves' },
      { name: 'vegetable broth', measure: '2 cups' },
      { name: 'heavy cream', measure: '1/2 cup' },
      { name: 'butter', measure: '3 tbsp' },
      { name: 'fresh basil leaves', measure: '1/4 cup' },
      { name: 'kosher salt', measure: '1 tsp' },
      { name: 'sourdough bread', measure: '8 slices' },
      { name: 'sharp cheddar, sliced', measure: '8 oz' },
      { name: 'butter, softened', measure: '4 tbsp' },
    ],
    instructions: [
      'Melt 3 tbsp butter in a Dutch oven or heavy pot over medium heat. Add the chopped onion and cook, stirring, until soft and translucent — about 6 minutes. Add the garlic and cook 1 more minute until fragrant.',
      'Pour in the canned tomatoes with their juices and the vegetable broth. Add the salt, stir, and bring to a simmer. Cook uncovered for 20 minutes so the flavors deepen.',
      'Off heat, stir in the cream and fresh basil. Use an immersion blender to purée until smooth (or carefully blend in batches in a standing blender). Taste and adjust salt.',
      'For the grilled cheese: butter one side of each bread slice. Place 4 slices butter-side down in a cold skillet, layer with cheddar, top with the remaining slices butter-side up.',
      'Heat the skillet over medium-low and cook for 3 to 4 minutes per side, pressing gently with a spatula, until the bread is deeply golden and the cheese is fully melted.',
      'Slice the sandwiches on the diagonal and serve alongside steaming bowls of the tomato soup.',
    ].join('\n'),
    family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own.",
    photo_url: '',
  },

  {
    title: 'Honey-Soy Salmon Rice Bowls',
    description:
      'Glazed salmon over warm rice with quick-pickled cucumber and a drizzle of spicy mayo. Weeknight-fast, dinner-party-pretty.',
    category: 'Asian',
    difficulty: 'easy',
    servings: 2,
    tags: ['salmon', 'bowl', 'quick', 'heart-healthy', 'asian'],
    ingredients: [
      { name: 'skin-on salmon fillets', measure: '2 (6 oz each)' },
      { name: 'soy sauce', measure: '3 tbsp' },
      { name: 'honey', measure: '2 tbsp' },
      { name: 'rice vinegar', measure: '1 tbsp' },
      { name: 'fresh ginger, grated', measure: '1 tsp' },
      { name: 'garlic, minced', measure: '1 clove' },
      { name: 'cooked jasmine rice', measure: '2 cups' },
      { name: 'english cucumber, thinly sliced', measure: '1/2' },
      { name: 'rice vinegar (for cukes)', measure: '1 tbsp' },
      { name: 'mayonnaise', measure: '3 tbsp' },
      { name: 'sriracha', measure: '1-2 tsp' },
      { name: 'sesame seeds', measure: 'for garnish' },
      { name: 'scallions, sliced', measure: 'for garnish' },
    ],
    instructions: [
      'Pat the salmon dry and season lightly with salt. In a small bowl whisk together the soy sauce, honey, 1 tbsp rice vinegar, ginger, and garlic.',
      'Toss the sliced cucumber with the remaining 1 tbsp rice vinegar and a pinch of salt. Set aside to quick-pickle while you cook.',
      'Heat a nonstick skillet over medium-high heat. Place the salmon skin-side down and sear for 4 minutes without moving. Flip and cook 2 more minutes.',
      'Pour the honey-soy mixture into the skillet and let it bubble, spooning the glaze over the salmon, for 1 to 2 minutes until thick and glossy. Remove from heat.',
      'Stir together the mayonnaise and sriracha in a small bowl to make spicy mayo.',
      'Divide the rice between two bowls. Top each with a salmon fillet, a pile of pickled cucumbers, a drizzle of spicy mayo, and a scatter of sesame seeds and scallions.',
    ].join('\n'),
    family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own.",
    photo_url: '',
  },

  {
    title: 'Brown Butter Chocolate Chip Cookies',
    description:
      "The cookie recipe worth earning your apron over. Nutty brown butter, a double hit of chocolate, and a sprinkle of flaky salt. Worth the wait — and there's a wait.",
    category: 'Dessert',
    difficulty: 'medium',
    servings: 24,
    tags: ['cookies', 'dessert', 'baking', 'weekend'],
    ingredients: [
      { name: 'unsalted butter', measure: '1 cup (2 sticks)' },
      { name: 'brown sugar, packed', measure: '1 cup' },
      { name: 'granulated sugar', measure: '1/2 cup' },
      { name: 'large eggs', measure: '2' },
      { name: 'vanilla extract', measure: '2 tsp' },
      { name: 'all-purpose flour', measure: '2 1/4 cups' },
      { name: 'baking soda', measure: '1 tsp' },
      { name: 'kosher salt', measure: '1 tsp' },
      { name: 'semisweet chocolate chips', measure: '1 cup' },
      { name: 'dark chocolate, chopped', measure: '1 cup' },
      { name: 'flaky sea salt', measure: 'for topping' },
    ],
    instructions: [
      'Melt the butter in a light-colored saucepan over medium heat, swirling often. Continue cooking until the butter foams, then turns a deep golden brown and smells nutty — 5 to 7 minutes. Pour into a large heatproof bowl and let cool for 15 minutes.',
      'Whisk both sugars into the cooled brown butter until smooth. Whisk in the eggs one at a time, then the vanilla, until the mixture looks glossy — about 1 minute.',
      'In a separate bowl whisk together the flour, baking soda, and kosher salt. Add to the wet ingredients and stir just until no dry streaks remain. Fold in both chocolates.',
      'Cover the dough and chill for at least 1 hour (or up to 48 hours for a deeper flavor). This step is worth it — do not skip.',
      'When ready to bake, preheat the oven to 375°F (190°C) and line two sheet pans with parchment.',
      'Scoop the dough into golf-ball-sized portions and place them 3 inches apart on the pans. Bake one tray at a time for 11 to 13 minutes, until the edges are set and the centers look slightly underdone.',
      'Sprinkle each warm cookie with a pinch of flaky sea salt. Let cool on the pan for 5 minutes before transferring to a rack. Resist eating all of them in one sitting.',
    ].join('\n'),
    family_notes: "Welcome — this starter's here to get you cooking. Yours to make your own.",
    photo_url: '',
    is_favorite: true,
  },
]

export const STARTER_RECIPES_VERSION = 'v2'

// Starter Chef Notes seeded into a new user's 📝 Chef Notes (Playbook) on
// first MyKitchen visit. Same idea as starter recipes — make the surface
// feel lived-in instead of greeting first-time users with an empty state.
//
// Each note maps to a `favorites` row with type='ai_answer':
//   title = the question (truncated to 120 chars to match save behavior)
//   metadata = { question, answer }
//
// We mirror two of the empty-state suggested prompts on /chef so the seeded
// notes reinforce the loop: a user who taps "How do I know when oil is hot
// enough?" on Chef Jennifer sees the same question waiting in their notes —
// it makes the feature legible at first glance.
export const STARTER_CHEF_NOTES = [
  {
    title: 'How do I know when oil is hot enough?',
    answer:
      "A few easy signals: when the oil shimmers and looks a little wavy in the pan, you're close. Drop in a single piece of whatever you're cooking — it should sizzle right away, not sit silently. For deep frying, the wooden-spoon test works: dip the handle in, and a steady stream of small bubbles around it means you're around 350°F.\n\nIf the oil smokes, it's gone too far — pull the pan off the heat for a minute and let it settle before adding food.",
  },
  {
    title: "What's a good substitute for buttermilk?",
    answer:
      'Easiest swap: 1 cup of milk + 1 tablespoon of lemon juice or white vinegar. Stir, let it sit 5 minutes — it will look slightly curdled, which is exactly what you want. Use as you would buttermilk.\n\nPlain yogurt or sour cream thinned with a splash of milk also works well, especially for pancakes, biscuits, or a tender cake crumb.',
  },
]

export const STARTER_CHEF_NOTES_VERSION = 'v1'
