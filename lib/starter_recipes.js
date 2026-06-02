// Starter recipes seeded into a new user's Recipe Vault on first MyKitchen visit.
// Real recipes from the app — imported and loved by users.

export const STARTER_RECIPES_VERSION = 'v3'
export const FAVORITE_STARTER_TITLES = [
  'One-Pan Creamy Chicken and Spinach',
  'Brown Butter Chocolate Chip Cookies',
]
export const STARTER_BACKFILL_VERSION = 'v1'
export const STARTER_PHOTO_BACKFILL_VERSION = 'v1'

export const STARTER_RECIPES = [
  {
    title: 'One-Pan Creamy Chicken and Spinach',
    description: 'Tender chicken breast cutlets with spinach and fire-roasted tomatoes in a creamy Boursin cheese sauce.',
    category: 'Main Dish',
    difficulty: null,
    servings: 4,
    tags: ['dinner', 'chicken', 'quick'],
    ingredients: [
      { name: 'boneless skinless chicken breasts', measure: '1 pound' },
      { name: 'salt and freshly ground black pepper', measure: 'to taste' },
      { name: 'olive oil', measure: '1 tablespoon' },
      { name: 'unsalted butter', measure: '1 tablespoon' },
      { name: 'chopped onion', measure: '1/2 cup' },
      { name: 'garlic, minced', measure: '1 clove' },
      { name: 'white wine or chicken broth', measure: '1/3 cup' },
      { name: 'fire-roasted diced tomatoes', measure: '1 (14.5 ounce) can' },
      { name: 'Boursin Garlic & Fine Herbs cheese, cut into cubes', measure: '1 (5 ounce) package' },
      { name: 'Italian seasoning', measure: '1 teaspoon' },
      { name: 'fresh spinach, roughly-chopped', measure: '4 cups packed' },
      { name: 'minced fresh chives', measure: '2 tablespoons' },
    ],
    instructions: `Slice chicken breasts across the grain into cutlets. Season both sides with salt and pepper.
Heat oil and butter in a large skillet over medium heat. Lightly brown chicken cutlets, turning once, about 2 to 3 minutes per side. Transfer to a plate and keep warm.
To the same skillet, add onion and cook 2 minutes. Add garlic and cook until fragrant, 30 seconds. Add wine and cook until most liquid evaporates, 2 minutes.
Stir in tomatoes, Boursin, and Italian seasoning until cheese melts, about 5 minutes. Stir in chopped spinach.
Return chicken to the skillet, coating with sauce. Heat until chicken reaches 165°F. Garnish with chives.`,
    family_notes: "Welcome — Chef Jen's pick. Yours to make your own.",
    photo_url: 'https://epgtahifcphwjifxmxst.supabase.co/storage/v1/object/public/personal_recipes/7f021ea0-eade-4a67-8dfb-fb62aa56ec0e/1777650533848.jpeg',
    is_favorite: true,
  },
  {
    title: 'Chicken and Broccoli Stir-Fry',
    description: 'A simple weeknight stir-fry with marinated chicken and crisp broccoli in a savory sauce.',
    category: 'Main Dish',
    difficulty: null,
    servings: 4,
    tags: ['chicken', 'dinner', 'quick'],
    ingredients: [
      { name: 'chicken breast, cubed', measure: '1 pound' },
      { name: 'scallions, whites only', measure: '3, thinly sliced' },
      { name: 'sugar', measure: '2 tablespoons' },
      { name: 'dark sesame oil', measure: '1 tablespoon' },
      { name: 'dry sherry', measure: '1 tablespoon' },
      { name: 'soy sauce', measure: '1 tablespoon' },
      { name: 'garlic', measure: '2 cloves, minced' },
      { name: 'fresh ginger, peeled', measure: '1-inch piece, minced' },
      { name: 'cornstarch', measure: '1 tablespoon plus 1 teaspoon' },
      { name: 'vegetable oil', measure: '3 tablespoons' },
      { name: 'broccoli florets and sliced stalks', measure: '5 to 6 cups' },
      { name: 'hoisin sauce', measure: '1 tablespoon' },
      { name: 'jasmine rice', measure: 'for serving' },
    ],
    instructions: `In a medium bowl, toss chicken with scallion whites, sugar, sesame oil, sherry, soy sauce, half the garlic, half the ginger, 1 teaspoon cornstarch and 1 teaspoon salt. Marinate 15 minutes.
Mix remaining cornstarch with 1/3 cup water and reserve.
Heat a large nonstick skillet over high heat with 1 tablespoon oil. Stir-fry broccoli with remaining garlic and ginger, 2 tablespoons water, salt and pepper until bright green but crisp, 2 minutes. Transfer to a plate.
Heat remaining oil, add chicken and stir-fry until golden, 3 minutes. Add hoisin sauce and return broccoli. Stir in cornstarch mixture and bring to a boil to thicken. Serve over rice.`,
    family_notes: "Welcome — Chef Jen's pick. Yours to make your own.",
    photo_url: 'https://food.fnr.sndimg.com/content/dam/images/food/fullset/2013/10/4/2/FNM_110113-Chicken-Broccoli-Stir-Fry-Recipe_s4x3.jpg.rend.hgtvcom.406.305.suffix/1389294665506.webp',
    is_favorite: false,
  },
  {
    title: 'Pan-Seared Salmon with Lemon Garlic Sauce',
    description: 'Restaurant-quality pan-seared salmon with a delicious lemon garlic butter sauce.',
    category: 'Main Dish',
    difficulty: null,
    servings: 4,
    tags: ['seafood', 'dinner', 'quick'],
    ingredients: [
      { name: 'salmon fillets', measure: '4' },
      { name: 'salt', measure: 'to taste' },
      { name: 'pepper', measure: 'to taste' },
      { name: 'olive oil', measure: '2 tablespoons' },
      { name: 'butter', measure: '2 tablespoons' },
      { name: 'garlic', measure: '3 cloves, minced' },
      { name: 'lemon juice', measure: '2 tablespoons' },
      { name: 'fresh dill', measure: 'to taste' },
      { name: 'fresh parsley', measure: 'to taste' },
    ],
    instructions: `Pat salmon fillets dry. Season both sides with salt and pepper.
Heat olive oil in a pan over medium-high heat until shimmering. Place salmon skin-side down and cook until skin is crispy, 4-5 minutes. Flip and cook 2-3 minutes until done.
Remove salmon. In the same pan, melt butter, add garlic and cook 1 minute. Add lemon juice, dill and parsley. Pour sauce over salmon and serve.`,
    family_notes: "Welcome — Chef Jen's pick. Yours to make your own.",
    photo_url: 'https://www.jessicagavin.com/wp-content/uploads/2020/08/pan-seared-salmon-15-1200.jpg',
    is_favorite: false,
  },
  {
    title: 'Filipino Pancit Canton with Chicken and Vegetables',
    description: 'A savory stir-fried noodle dish loaded with chicken and crisp vegetables—the weeknight dinner that comes together in under an hour.',
    category: 'Main Dish',
    difficulty: null,
    servings: 4,
    tags: ['chicken', 'dinner', 'quick'],
    ingredients: [
      { name: 'pancit canton noodles', measure: '8 ounces' },
      { name: 'vegetable oil', measure: '1 tablespoon' },
      { name: 'boneless skinless chicken breast, cut into strips', measure: '1 pound' },
      { name: 'garlic, minced', measure: '4 cloves' },
      { name: 'yellow onion, thinly sliced', measure: '1 medium' },
      { name: 'carrots, julienned', measure: '1 cup' },
      { name: 'green cabbage, thinly sliced', measure: '2 cups' },
      { name: 'snow peas, trimmed', measure: '1 cup' },
      { name: 'red bell pepper, thinly sliced', measure: '1' },
      { name: 'chicken broth', measure: '1/2 cup' },
      { name: 'soy sauce', measure: '1/4 cup' },
      { name: 'oyster sauce', measure: '2 tablespoons' },
      { name: 'brown sugar', measure: '1 tablespoon' },
      { name: 'lime wedges', measure: 'for serving' },
    ],
    instructions: `Cook noodles per package directions until al dente. Drain, rinse with cold water, toss with oil and set aside.
Heat oil in a wok over medium-high. Cook chicken until browned, 5-7 minutes. Remove and set aside.
Add garlic and onion, cook 2-3 minutes. Add carrots, cabbage, snow peas and bell pepper, stir-fry 3-5 minutes.
Whisk together broth, soy sauce, oyster sauce, brown sugar and black pepper. Return chicken to wok, pour sauce over everything. Add noodles and toss to coat. Cook 2-3 minutes until sauce is absorbed. Garnish with green onions and serve with lime.`,
    family_notes: "Welcome — Chef Jen's pick. Yours to make your own.",
    photo_url: 'https://flirtyfoods.com/images/2026/05/filipino-pancit-canton-with-chicken-and-vegetables.webp',
    is_favorite: false,
  },
  {
    title: 'Brown Butter Chocolate Chip Cookies',
    description: "The cookie recipe worth earning your apron over. Nutty brown butter, a double hit of chocolate, and a sprinkle of flaky salt.",
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
    instructions: `Brown butter in a saucepan over medium heat, swirling often, until deep golden and nutty, 5-7 minutes. Pour into a bowl and cool 15 minutes.
Whisk both sugars into cooled butter. Whisk in eggs one at a time, then vanilla, until glossy.
Whisk flour, baking soda, and salt. Stir into wet ingredients. Fold in both chocolates. Chill dough at least 1 hour.
Preheat oven to 375°F. Scoop golf-ball-sized portions 3 inches apart on parchment-lined pans. Bake 11-13 minutes until edges are set. Sprinkle with flaky salt. Cool 5 minutes on pan.`,
    family_notes: "Welcome — Chef Jen's pick. Yours to make your own.",
    photo_url: 'https://scientificallysweet.com/wp-content/uploads/2020/11/IMG_5349-brown-butter-chocolate-chip-cookies-720x1062.jpg',
    is_favorite: true,
  },
]