// Chef Jennifer prompt banks — large rotating suggestion pools that
// drive the empty-state chips on /chef. Bill's framing: a small fixed
// list of suggestions goes stale after a visit or two; a large bank
// that randomly picks 6 each time keeps the page feeling fresh and
// gives the user a reason to come back ("oh, today she's suggesting
// something I haven't seen before"). Same code path as before — just
// a deeper well to draw from.
//
// Add more entries here over time. The picker just shuffles + slices,
// so growing the bank is zero-friction. Aim for variety across:
//   Teach: heat / substitutions / storage / fixes / equipment / prep /
//          technique / seasoning / baking / knife / safety / meat /
//          veg / pasta / eggs / sauces / bread / conversions / terms
//   Practice: meal / cuisine / protein / mood / time / season /
//             dietary / use-what-you-have / occasion

export const TEACH_BANK = [
  // ─── Heat & temperature ───
  'How do I know when oil is hot enough for frying?',
  "Why does my pan need to be hot before adding food?",
  "What's the smoke point and why does it matter?",
  "When should I let meat come to room temperature first?",
  "Why do I rest meat after cooking?",
  "What's the difference between simmer and boil?",
  "When should I use high vs. medium-high heat?",
  // ─── Substitutions ───
  "What's a good substitute for buttermilk?",
  "I don't have heavy cream — what can I use?",
  "Substitute for sour cream in a recipe?",
  "What can I use instead of fresh herbs?",
  "No shallots — what else works?",
  "Can I sub Greek yogurt for sour cream?",
  "What replaces an egg in baking?",
  // ─── Storage & shelf life ───
  'How long does cooked chicken last in the fridge?',
  "How do I tell if eggs are still good?",
  "Can I freeze cooked rice?",
  "How long does opened pasta sauce last?",
  "Best way to store fresh herbs?",
  "How do I keep avocados from browning?",
  "Should I refrigerate tomatoes?",
  // ─── Fixing mistakes ───
  "How do I fix a sauce that's too salty?",
  "My soup is too thin — how do I thicken it?",
  "I burned the bottom — can I save the dish?",
  "How do I rescue an over-salted recipe?",
  "My rice is mushy — what now?",
  "Why is my pasta sticking together?",
  "How do I fix curdled cream sauce?",
  // ─── Equipment ───
  "Cast iron vs. nonstick — when to use each?",
  "Do I really need a meat thermometer?",
  "When should I use a wooden spoon vs. metal?",
  "How do I season a cast iron pan?",
  "What's the difference between sauté and frying pan?",
  // ─── Ingredient prep ───
  "How do I dice an onion without crying?",
  "Best way to peel garlic fast?",
  "How do I julienne a carrot?",
  "How do I chiffonade basil?",
  "How do I peel ginger easily?",
  "What's the right way to wash mushrooms?",
  // ─── Technique ───
  "How do I get a good sear on meat?",
  "What does fold gently mean?",
  "How do I deglaze a pan?",
  "What does it mean to bloom spices?",
  "How do I emulsify a vinaigrette?",
  "How do I reduce a sauce properly?",
  "What does sweat the onions mean?",
  // ─── Seasoning & flavor ───
  "When should I salt my pasta water?",
  "How much salt is too much?",
  "Why does lemon brighten dishes?",
  "When do I add fresh herbs vs. dried?",
  "How do I balance flavors in a dish?",
  "What's umami and how do I add it?",
  // ─── Baking ───
  "What's the difference between baking soda and baking powder?",
  "Why does my bread come out dense?",
  "Room temp vs. cold butter for baking?",
  "How do I know when bread is done?",
  "Why do cookies spread too much?",
  // ─── Eggs ───
  "How do I make a perfect soft-boiled egg?",
  "Why are my scrambled eggs rubbery?",
  "How do I poach an egg?",
  "When are eggs done cooking?",
  // ─── Meat & protein ───
  "How do I know when chicken is fully cooked?",
  "Should I brine my chicken?",
  "What's the best way to cook a steak?",
  "How long do I rest a roast?",
  "How do I cook fish without it falling apart?",
  // ─── Pasta ───
  "How do I cook pasta al dente?",
  "Why save the pasta water?",
  "Fresh pasta vs. dried — when to use which?",
  // ─── Safety ───
  "Is it safe to wash raw chicken?",
  "How long can food sit out at room temp?",
  "What's cross-contamination?",
  // ─── Conversions & terms ───
  "What does it mean to cook low and slow?",
  "What's the difference between broil and bake?",
  "What does folding mean in a recipe?",
  "What's a roux?",
  "What does blanch mean?",
  "What's the difference between sauté and stir-fry?",
]

export const PRACTICE_BANK = [
  // ─── Weeknight dinners ───
  'A cozy weeknight dinner with chicken',
  'A 30-minute pasta with bold flavors',
  'A one-pan dinner with minimal cleanup',
  'A sheet-pan meal for a busy night',
  'An easy chicken thigh dinner',
  'A weeknight ground beef recipe',
  'A simple pork chop dinner',
  // ─── Quick & light ───
  "Something light for lunch with what's in the fridge",
  'A quick and vegetarian dinner',
  'A 20-minute meal for one',
  'A simple grain bowl',
  'Something light and protein-packed',
  // ─── Comfort food ───
  'A cozy soup for a cold night',
  'A comforting pasta with cheese',
  'Old-school comfort food on a budget',
  'A hearty stew for a slow afternoon',
  'A creamy chicken and rice dish',
  'Mac and cheese, elevated',
  // ─── Date night ───
  'An impressive dinner for date night',
  'A romantic meal for two',
  'A dinner that looks fancy but is easy',
  'A wine-friendly main course',
  // ─── Family dinner ───
  'A family dinner the kids will eat',
  'A casserole that feeds a crowd',
  'A meal that hides extra veggies',
  'A weeknight chili everyone likes',
  // ─── Make-ahead & meal prep ───
  'A make-ahead breakfast for busy mornings',
  'Lunch prep for the work week',
  'A freezer-friendly dinner',
  'Meal-prep chicken five ways',
  'Overnight oats with a twist',
  // ─── Breakfast & brunch ───
  'A weekend brunch dish to impress',
  'A savory breakfast for one',
  'Eggs Benedict simplified',
  'A sweet breakfast for slow Sundays',
  'Breakfast for dinner',
  // ─── Protein-forward ───
  'A salmon dinner thats impressive but easy',
  'A roast chicken that feeds a small army',
  'Steak night, done right',
  'Something with shrimp for a quick win',
  'A pork tenderloin for a small gathering',
  // ─── Cuisine-specific ───
  'A weeknight Italian dish',
  'Something Mexican-inspired',
  'A Thai-style noodle bowl',
  'A simple Indian curry',
  'A French bistro classic, simplified',
  'Spanish-style tapas for two',
  'Korean-inspired bowls',
  'Greek night at home',
  // ─── Vegetarian / vegan ───
  'A satisfying vegetarian main',
  'A meatless Monday recipe',
  'A vegan dinner that doesnt feel like a compromise',
  'A pasta with vegetables as the star',
  'A grain bowl with all the colors',
  // ─── Seasonal ───
  'Something with summer tomatoes',
  'A fall squash recipe',
  'A bright spring vegetable dish',
  'A winter root-vegetable braise',
  'Berry-forward dessert in season',
  // ─── Use-what-you-have ───
  'A recipe with whatever is in my fridge',
  'Something to use up leftover rotisserie chicken',
  'A way to use leftover rice',
  'A dish from pantry staples only',
  'A recipe that uses canned beans',
  // ─── Occasions ───
  'A holiday side dish',
  'A potluck-friendly main',
  'Something for game day',
  'A summer cookout side',
  'A picnic-friendly recipe',
  // ─── Soups & salads ───
  'A hearty winter soup',
  'A cold-weather chowder',
  'A salad thats a full meal',
  'A grain salad that holds up',
  // ─── Desserts ───
  'A simple weeknight dessert',
  'A no-bake dessert',
  'A chocolate fix that takes 15 minutes',
  'A fruit-forward dessert',
]

// Pick `n` unique random prompts from the requested mode's bank.
// Implementation note: shuffle a copy of the bank (Fisher-Yates-ish
// via sort + random) then slice. Good enough for ~100-entry banks —
// no need for a fancy reservoir sampler. The caller decides how
// often this fires (once on mount via useMemo, ideally, so the
// chips don't reshuffle on every re-render).
export function pickPrompts(mode, n = 6) {
  const bank = mode === 'practice' ? PRACTICE_BANK : TEACH_BANK
  if (!Array.isArray(bank) || bank.length === 0) return []
  const shuffled = [...bank].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}
