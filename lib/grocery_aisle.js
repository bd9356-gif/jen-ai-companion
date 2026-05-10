// Categorize a shopping-list line into one of 8 grocery aisles.
// Used by the Shopping List page when the user picks "By Aisle"
// view (vs the default "By Store" grouping).
//
// Heuristic: regex keyword match against the lowercased ingredient
// text. Order matters — more-specific buckets are checked first
// so e.g. "ice cream" lands in 🧊 Frozen instead of 🥛 Dairy. Items
// that don't match anything fall to "🛒 Other" at the bottom.
//
// Keep this list editable — when shopping reveals a miscategorized
// ingredient ("oh, baking soda landed in Other"), add the keyword
// to the right group. No DB changes; pure render-time JS.

export const AISLES = [
  {
    key: 'produce',
    label: 'Fresh Produce',
    emoji: '🥬',
    color: 'green',
    match: /\b(lettuce|spinach|kale|arugula|romaine|cabbage|broccoli|cauliflower|carrot|celery|onion|shallot|leek|scallion|garlic|ginger|potato|sweet potato|yam|tomato|cucumber|zucchini|squash|pumpkin|bell pepper|pepper|jalape[ñn]o|chili|chile|eggplant|asparagus|artichoke|mushroom|corn|peas|green bean|brussels|beet|radish|turnip|parsnip|fennel|avocado|apple|banana|orange|lemon|lime|grapefruit|berry|berries|strawberr|blueberr|raspberr|blackberr|grape|melon|watermelon|cantaloupe|honeydew|peach|plum|pear|cherry|pineapple|mango|kiwi|papaya|pomegranate|fig|date|herb|herbs|parsley|cilantro|basil|mint|rosemary|thyme|oregano|sage|dill|chive|tarragon|bay leaf|fresh)\b/i,
  },
  {
    key: 'meat_seafood',
    label: 'Meat & Seafood',
    emoji: '🥩',
    color: 'red',
    match: /\b(chicken|turkey|duck|cornish hen|beef|steak|ground beef|brisket|chuck|sirloin|ribeye|tenderloin|pork|bacon|pancetta|prosciutto|sausage|ham|hot dog|hotdog|lamb|veal|liver|fish|salmon|tuna|cod|halibut|tilapia|trout|sardine|anchov|mackerel|sea bass|snapper|shrimp|prawn|scallop|crab|lobster|mussel|clam|oyster|squid|octopus|calamari|seafood)\b/i,
  },
  {
    key: 'frozen',
    label: 'Frozen',
    emoji: '🧊',
    color: 'sky',
    match: /\b(frozen|ice cream|gelato|sorbet|popsicle|frozen veg|frozen pea|frozen corn|frozen berry|frozen pizza|tv dinner|frozen meal|fish stick)\b/i,
  },
  {
    key: 'dairy',
    label: 'Dairy & Eggs',
    emoji: '🥛',
    color: 'amber',
    match: /\b(milk|cream|half[- ]?and[- ]?half|buttermilk|yogurt|yoghurt|sour cream|cottage cheese|cream cheese|cheese|cheddar|mozzarella|parmesan|parmigiano|feta|brie|gouda|swiss|provolone|ricotta|mascarpone|gruyere|blue cheese|goat cheese|butter|ghee|margarine|egg|eggs)\b/i,
  },
  {
    key: 'bakery',
    label: 'Bakery',
    emoji: '🍞',
    color: 'orange',
    match: /\b(bread|loaf|baguette|ciabatta|focaccia|sourdough|brioche|challah|pita|naan|tortilla|wrap|bun|roll|biscuit|croissant|bagel|english muffin|muffin|pastry|cake|cupcake|donut|doughnut|pie crust|pie shell|tart shell)\b/i,
  },
  {
    key: 'beverages',
    label: 'Beverages',
    emoji: '🥤',
    color: 'purple',
    match: /\b(water|sparkling water|seltzer|club soda|tonic|soda|cola|coke|pepsi|sprite|juice|orange juice|apple juice|lemonade|tea|coffee|espresso|cocoa|hot chocolate|wine|red wine|white wine|rose|champagne|prosecco|beer|ale|lager|cider|vodka|gin|rum|whiskey|whisky|bourbon|tequila|liqueur|cocktail|kombucha|sports drink|gatorade|powerade|energy drink)\b/i,
  },
  {
    key: 'pantry',
    label: 'Pantry',
    emoji: '🥫',
    color: 'stone',
    match: /\b(flour|sugar|brown sugar|powdered sugar|salt|sea salt|kosher salt|pepper|black pepper|peppercorn|baking soda|baking powder|yeast|cornstarch|cornmeal|oat|oats|rice|brown rice|quinoa|barley|farro|couscous|bulgur|pasta|spaghetti|linguine|fettuccine|penne|fusilli|rigatoni|ravioli|lasagna|noodle|bean|beans|black bean|kidney bean|pinto|chickpea|garbanzo|lentil|split pea|tomato sauce|tomato paste|crushed tomato|diced tomato|broth|stock|chicken broth|beef broth|vegetable broth|stock cube|bouillon|coconut milk|condensed milk|evaporated milk|honey|maple syrup|molasses|agave|jam|jelly|preserve|nut butter|peanut butter|almond butter|tahini|nutella|olive oil|vegetable oil|canola oil|avocado oil|sesame oil|coconut oil|vinegar|balsamic|red wine vinegar|white vinegar|apple cider vinegar|rice vinegar|soy sauce|tamari|fish sauce|worcestershire|hot sauce|sriracha|ketchup|mustard|mayonnaise|mayo|salsa|barbecue sauce|bbq sauce|salad dressing|sauce|spice|spices|cumin|paprika|cinnamon|nutmeg|cloves|allspice|cardamom|coriander|turmeric|chili powder|curry powder|garam masala|cayenne|red pepper flake|italian seasoning|bay leaves|vanilla|extract|cocoa powder|chocolate chip|nuts|almond|walnut|pecan|cashew|pistachio|peanut|sesame seed|chia|flax|sunflower|raisin|cranberry|crackers|cereal|granola|chip|chips|pretzel|popcorn|olive|caper|pickle|relish|pesto|broth|stock)\b/i,
  },
  {
    key: 'household',
    label: 'Household & Other',
    emoji: '🛒',
    color: 'gray',
    match: /\b(paper towel|toilet paper|tissue|napkin|foil|plastic wrap|plastic bag|trash bag|sandwich bag|sponge|dish soap|laundry detergent|cleaner|bleach|paper plate|cup|toothpaste|shampoo|deodorant|battery|lightbulb)\b/i,
  },
]

// Fallback for anything that doesn't match — kept separate so it
// renders distinctly ("we couldn't categorize this") and the user
// can still see it.
export const AISLE_OTHER = {
  key: 'other',
  label: 'Other',
  emoji: '❓',
  color: 'slate',
}

/**
 * Return the aisle bucket for one ingredient string.
 *
 * @param {string} ingredient — the raw ingredient text from
 *   shopping_list.ingredient (e.g. "2 cups flour", "salmon fillet").
 * @returns {{ key, label, emoji, color }} — one of AISLES or AISLE_OTHER.
 */
export function categorizeIngredient(ingredient) {
  if (!ingredient) return AISLE_OTHER
  const text = String(ingredient).toLowerCase()
  for (const aisle of AISLES) {
    if (aisle.match.test(text)) return aisle
  }
  return AISLE_OTHER
}

/**
 * Group a shopping list by aisle. Returns an array of
 * { aisle, items: [...] } in the canonical AISLE order, with empty
 * aisles dropped. Items not matching any aisle land in AISLE_OTHER
 * which always sorts last.
 */
export function groupByAisle(shoppingList) {
  const groups = new Map()
  for (const item of shoppingList || []) {
    const aisle = categorizeIngredient(item.ingredient)
    if (!groups.has(aisle.key)) groups.set(aisle.key, { aisle, items: [] })
    groups.get(aisle.key).items.push(item)
  }
  // Order: AISLES in canonical order, then OTHER last if present.
  const out = []
  for (const aisle of AISLES) {
    const group = groups.get(aisle.key)
    if (group && group.items.length) out.push(group)
  }
  if (groups.has(AISLE_OTHER.key)) out.push(groups.get(AISLE_OTHER.key))
  return out
}
