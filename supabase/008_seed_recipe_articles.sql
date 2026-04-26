-- Seed the Recipe Guides library with 12 curated starter articles
-- (2 per topic × 6 topics). The goal is to fill the /guides page on
-- day one so the Library never reads "is being stocked" once 008 has
-- been run.
--
-- Idempotency: we add a UNIQUE INDEX on title and use ON CONFLICT DO
-- NOTHING. Re-running this migration is a no-op once the rows exist.
-- Editing an article later means writing a 009_*.sql with an UPDATE
-- (or deleting + reinserting) — this seed is the *initial stock*, not
-- the source of truth for ongoing edits.
--
-- Markdown supported by /guides:
--   ## headers, **bold**, paragraph breaks (\n\n), line breaks (\n).
-- Lists are rendered as plain "- " lines with <br/> between them
-- (no <ul>/<li> in v1) — that's intentional.

create unique index if not exists recipe_articles_title_key
  on public.recipe_articles (title);

-- ============================================================
-- KNIFE SKILLS (2)
-- ============================================================
insert into public.recipe_articles (title, summary, content, topic, read_time_minutes)
values
(
  'How to Hold a Chef''s Knife',
  'The grip that makes every cut faster, safer, and less tiring.',
  $$A good knife grip is the single biggest jump you can make in the kitchen. It's the difference between fighting your knife and letting it work for you.

## The Pinch Grip

Pinch the blade itself — thumb on one side, side of your index finger on the other, right where the blade meets the handle. The other three fingers wrap the handle below.

It feels weird the first time. It's also how every line cook holds a knife. You get more control because your fingers are right at the pivot point.

## The Guide Hand

Your other hand — the one holding the food — is your **claw**. Curl your fingertips back, knuckles forward. The flat of the blade rides against your knuckles like a wall.

The blade physically can't reach your fingertips because they're tucked behind the wall. That's the whole point.

## Cutting Motion

Don't chop straight down. Push the knife forward and down in a slicing motion, then draw it back. The blade does the work — you're just guiding it.

If you're sawing back and forth or slamming straight down, you're working harder than you need to.

## The One Thing

If you remember nothing else: **pinch the blade, claw the food, slice forward**. Practice it on an onion tonight. By the second onion it'll feel natural.$$,
  'knife_skills',
  3
),
(
  'The Three Cuts You''ll Use Every Day',
  'Dice, mince, slice — the only knife terms you really need.',
  $$Recipes throw cooking terms around like everyone went to culinary school. Here are the three cuts that cover 90% of what you'll actually do.

## Dice

A **dice** is even cubes. Big dice (3/4 inch) for stews and roasts. Medium (1/2 inch) for soups and stir-fries. Small (1/4 inch) for sauces and salsas.

The trick to even dice: cut your food into planks first, then sticks, then cubes. Like building it from the inside out.

## Mince

A **mince** is just dice taken further — chopped fine until the pieces blur together. Used for garlic, ginger, fresh herbs, anchovies — anything you want to disappear into a sauce.

Don't mince by smashing the knife straight down. Rock the tip on the board and pivot the heel through the pile, sweeping it back together every few rocks.

## Slice

A **slice** is a thin, flat cut. The thickness depends on what you're doing — paper-thin for garlic going in oil, half-inch for onions on a burger.

Use the full length of the blade. One smooth motion, drawing the knife back as you press down. If your slices are ragged, the blade is dull or you're sawing.

## What About Julienne, Brunoise, Chiffonade?

Skip them for now. They're variations of the three above with French names. Once you can dice, mince, and slice cleanly, the fancier cuts make sense in five minutes.$$,
  'knife_skills',
  3
),

-- ============================================================
-- TECHNIQUES (2)
-- ============================================================
(
  'How to Sauté',
  'The everyday move behind almost every dinner you''ve ever liked.',
  $$Sauté just means **to cook food in a small amount of fat over fairly high heat, moving it often**. It sounds fancy. It's how you cook onions, peppers, mushrooms, greens, ground meat, shrimp, and most weeknight things.

## The Setup

Get the pan hot first. **Put it on medium-high, let it sit for a minute, then add the fat.** A drop of water should sizzle and skate, not pop violently.

Olive oil for most things. Butter for flavor. A mix of both gives you the flavor of butter with the higher smoke point of oil.

## What Goes In, In What Order

Hard stuff first (carrots, onions). Soft stuff last (garlic, herbs, leafy greens). Garlic burns in a minute — add it at the very end.

Don't crowd the pan. If you pile food in, it steams instead of sautés. Cook in batches if you have to.

## Movement

The word *sauté* literally means **"to jump"** in French. The pros toss the pan to flip the food without a spoon. You don't have to. A wooden spoon or spatula works fine — just keep things moving so nothing sits and burns.

## When It's Done

Onions are sautéed when they go from crunchy and white to soft and translucent (5–7 minutes). Mushrooms are done when they release their water and brown around the edges. Spinach is done in 90 seconds — when it wilts, get it out of the pan.

Trust your eyes. Sauté is a feel thing, and the feel comes after maybe four dinners.$$,
  'techniques',
  3
),
(
  'The Sear: Why Brown Means Flavor',
  'How a hot pan turns plain meat into restaurant flavor.',
  $$Searing is how you get the brown crust on a steak, a chicken thigh, or a scallop. That brown isn't just color — it's a wave of new flavors created when proteins and sugars cook at high heat. The food scientists call it the **Maillard reaction**. Your taste buds don't care what it's called; they care that it happened.

## Three Rules

**1. Dry the food.** Pat it with paper towels. Wet meat steams instead of browning. The first minute in the pan is just water evaporating — wasted heat.

**2. Hot pan, hot fat.** Get the pan ripping hot, then add a high-smoke-point oil (vegetable, canola, avocado). When the oil shimmers and almost smokes, you're ready. Olive oil burns at sear temps — save it for sautéing.

**3. Don't move it.** This is the hardest one. Lay the food in the pan and walk away. If you poke and flip and shuffle, you reset the clock every time. Wait for the crust to form (3–4 minutes for steak, 5–6 for chicken thighs), then flip once.

## The "It's Stuck" Test

When you try to flip and the meat resists, it's not done. The crust hasn't released yet. Wait another minute. When it's ready, the meat lifts off the pan cleanly.

## After the Sear

Let it rest. Three to five minutes on a cutting board. The juices redistribute and the meat finishes cooking from residual heat. Cutting in immediately means juice on your board instead of in the meat.$$,
  'techniques',
  3
),

-- ============================================================
-- COOKING TIMES & HEAT (2)
-- ============================================================
(
  'When Meat Is Actually Done',
  'Forget the timer. Use your thermometer or your finger.',
  $$Most overcooked dinners come from one of two mistakes: trusting recipe times that don't match your stove, or guessing when something is done.

## The Thermometer Is Your Friend

A $10 instant-read thermometer is the single biggest upgrade for home cooks. It removes guessing entirely.

**Target temperatures (pull-off temp — the meat keeps cooking 5° while it rests):**
- **Chicken**: 160°F (rests to 165°)
- **Pork**: 140°F (rests to 145°) — yes, pink pork is fine and the USDA agrees
- **Beef rare**: 120°F (rests to 125°)
- **Beef medium-rare**: 125°F (rests to 130°)
- **Beef medium**: 135°F (rests to 140°)
- **Ground meat**: 160°F all the way through, no exceptions

Stick the probe in the **thickest part**, not touching bone.

## The Finger Test (For Steak)

If you don't have a thermometer, touch your steak with a clean finger.

- **Soft and squishy** like the meat under your thumb when your hand is relaxed = rare.
- **Springy** like the meat under your thumb when you touch your index finger = medium-rare.
- **Firm** like when you touch your ring finger = medium-well.
- **Hard** like a hockey puck = you went too far.

## Rest Everything

Whatever the meat, let it rest. Steak: 5 minutes. Chicken pieces: 5 minutes. Whole roast or whole chicken: 15 minutes. The juices redistribute and the temperature evens out. Cutting in early dumps juice on the board.$$,
  'cooking_times',
  3
),
(
  'Reading the Heat: Low, Medium, High',
  'What the dial actually means and when to use each setting.',
  $$"Cook over medium heat" means nothing if your medium is your friend's high. Stoves vary. What matters is what's happening in the pan.

## Low

You can hold your hand 6 inches over the pan for a full count of ten. Used for **simmers**, slow eggs, melting cheese into sauce, gentle reductions. Nothing aggressive happens at low — that's the point.

## Medium

A drop of water dances and evaporates in 2–3 seconds. Used for **most cooking** — sautéing onions, building risottos, cooking pancakes, frying eggs that won't burn at the edges.

If you're guessing, start at medium. You can always go up.

## Medium-High

A drop of water sizzles and disappears in 1 second. Used for **searing**, stir-fries, pan-roasting steaks, and reducing sauces fast. The sweet spot for browning meat without burning fat.

## High

The pan smokes a little when you add oil. Used for **boiling water**, getting a pan ripping hot before a sear, and stir-frying with a wok. Most home cooking does NOT happen at high — you'll burn things waiting for them to brown.

## The Real Trick

**Adjust as you go.** Heat in a pan isn't constant — food drops it, fat changes it, the pan keeps cooking even when you turn the dial down. Watch the food, not the timer. If it's browning too fast, drop the heat. If nothing's happening, raise it.

You'll get fast at this. After 20 dinners, you stop reading the dial and just adjust.$$,
  'cooking_times',
  3
),

-- ============================================================
-- PANTRY & SUBSTITUTIONS (2)
-- ============================================================
(
  'The 12 Pantry Staples Every Home Cook Needs',
  'Stock these and you can cook almost anything tonight.',
  $$A well-stocked pantry means dinner is always 20 minutes away. These twelve cover most weeknight cooking.

## The Foundations

**1. Olive oil** — for everyday cooking and dressings. Get a decent extra-virgin for finishing; a cheaper one for the pan.
**2. Neutral oil** — vegetable, canola, or avocado for high-heat searing.
**3. Kosher salt** — Diamond Crystal or Morton. Cooks measure differently than table salt; recipes assume kosher.
**4. Black pepper** — whole peppercorns in a grinder. Pre-ground loses its flavor in months.

## The Acids

**5. Vinegar** — apple cider, white wine, or red wine. Adds brightness to almost anything.
**6. Lemons** — fresh, not the squeeze bottle. Half a lemon transforms a sauce.

## The Aromatics

**7. Garlic** — fresh heads, not pre-minced.
**8. Onions** — yellow are the workhorse. A bag lasts weeks in a cool spot.

## The Boxes & Cans

**9. Canned tomatoes** — whole peeled San Marzanos are gold. They become sauce, soup, stew, braise.
**10. Chicken or vegetable stock** — boxed, low-sodium. The base of half of dinner.
**11. Pasta** — a few shapes. Spaghetti, penne, rigatoni. Stays good forever.
**12. Beans** — canned or dried. Cheap protein, blank canvas.

## Bonus: Soy Sauce, Hot Sauce, Honey

Not on the list of twelve but earn their shelf space. Soy sauce adds depth to non-Asian dishes too (try a teaspoon in beef stew). Honey balances sharp sauces. Hot sauce wakes up eggs.$$,
  'pantry',
  3
),
(
  'Common Substitutions That Actually Work',
  'When the recipe calls for something you don''t have.',
  $$You're halfway through cooking and the recipe needs something you don't have. Here's what really works (not the "just use water!" advice).

## Dairy

- **Buttermilk**: 1 cup milk + 1 tbsp lemon juice or vinegar. Wait 5 minutes.
- **Heavy cream (in cooking, not whipping)**: equal parts milk + melted butter (3/4 cup milk + 1/4 cup butter for 1 cup cream).
- **Sour cream**: plain Greek yogurt is a near-perfect swap.
- **Whole milk**: 2% works almost everywhere. Skim is a stretch in baking.

## Acids

- **Lemon juice**: white wine vinegar or apple cider vinegar (use 75% as much).
- **White wine** (in pan sauces): chicken stock + a splash of vinegar.

## Herbs & Aromatics

- **Fresh herbs → dried**: 1 tbsp fresh = 1 tsp dried.
- **Shallot**: half a small onion + a small clove of garlic.
- **Garlic clove**: 1/4 tsp garlic powder. Lower the heat or it burns fast.

## Eggs (in baking)

- **1 egg → applesauce or mashed banana**: 1/4 cup. Works in muffins and quick breads, not in delicate cakes.

## Sweeteners

- **Brown sugar**: 1 cup white sugar + 1 tbsp molasses (or skip the molasses — your cookies just won't be as chewy).
- **Honey → maple syrup**: 1:1 swap.

## When to Just Stop and Get It

Fresh garlic in a stir-fry. Eggs in a custard. Fresh basil on pizza Margherita. Some ingredients carry the dish — substituting them changes what you're making.$$,
  'pantry',
  3
),

-- ============================================================
-- SAFETY & STORAGE (2)
-- ============================================================
(
  'Safe Meat Temperatures (and the Pork Pink Myth)',
  'What''s actually dangerous and what''s just outdated advice.',
  $$Food safety isn't about cooking the joy out of meat. It's about hitting the right internal temperature for the right amount of time.

## The Numbers (USDA, current)

- **Whole-muscle beef, lamb, pork (steak, chops, roasts)**: 145°F + 3 minutes rest
- **Ground beef, lamb, pork**: 160°F all the way through
- **Chicken (whole or pieces)**: 165°F
- **Ground chicken or turkey**: 165°F
- **Fish**: 145°F (or sushi-grade is a different conversation)

## Why Pink Pork Is Fine Now

Pork at 145°F is slightly pink in the middle. **This is safe.** The USDA dropped the temperature from 160° in 2011. The trichinosis worry is essentially eliminated in commercial U.S. pork — it's been a non-issue since the 1990s.

If your grandmother insists on gray pork chops, that's love. But you don't have to ruin the meat.

## Why Ground Meat Is Different

Whole-muscle meat only has bacteria on the **surface**, which the high heat of a sear kills. Grinding mixes that surface bacteria throughout the meat, so the inside has to hit the kill temperature too. That's why a rare burger is risky and rare steak isn't.

## The Two-Hour Rule

Cooked food shouldn't sit at room temperature longer than **two hours** (one hour if it's hot outside). After that, you're in the "bacterial growth zone" between 40°F and 140°F.

## Reheating

Reheat leftovers to 165°F. A microwave usually gets there fine; just stir halfway so cold spots don't hide.$$,
  'safety',
  3
),
(
  'How Long Leftovers Actually Last',
  'A real timeline for the fridge and freezer.',
  $$"Smell it" is bad food-safety advice. Plenty of dangerous bacteria don't smell like anything. Here are real numbers.

## In the Fridge (40°F or below)

- **Cooked chicken, turkey, beef, pork**: 3–4 days
- **Cooked fish**: 1–2 days (it goes downhill fast)
- **Cooked rice**: 4–5 days. Reheat thoroughly — rice is a known source of food poisoning when it sits warm too long.
- **Soups and stews**: 3–4 days
- **Cooked pasta (no sauce)**: 5 days
- **Cut fruit**: 3–5 days
- **Cut vegetables (raw)**: 5–7 days
- **Hard cheese**: 3–4 weeks
- **Soft cheese**: 1 week
- **Eggs (raw, in shell)**: 3–5 weeks past purchase
- **Hard-boiled eggs**: 1 week

## In the Freezer (0°F)

Most cooked food keeps **2–3 months** in the freezer at peak quality. It's still safe longer — just expect freezer burn and texture changes after.

- **Cooked meat or poultry**: 2–6 months
- **Soup or stew**: 2–3 months
- **Bread**: 3 months
- **Berries**: 6 months

## Containers Matter

Get the food into a sealed container within two hours of cooking. A flat shape cools faster than a deep one. Date the container — your three-day-ago self always lies about what day it was.

## When in Doubt

Throw it out. The cost of dinner is less than the cost of food poisoning.$$,
  'safety',
  3
),

-- ============================================================
-- EQUIPMENT (2)
-- ============================================================
(
  'The Three Pans Worth Owning',
  'Skip the 12-piece set. These three cover almost everything.',
  $$Most home kitchens have eight pans and use the same three over and over. Save the cabinet space.

## A Heavy Stainless-Steel Skillet (10 or 12 inch)

Used for **searing**, sautéing, building pan sauces. Stainless takes ripping high heat without warping, develops a fond (the brown stuck-on bits) that turns into great sauce, and lasts a lifetime. Heavy is the key word — thin stainless warps and hot-spots.

A good one runs $80–$150 and you'll never buy another one.

## A Cast-Iron Skillet (10 or 12 inch)

Used for **anything that wants a hard sear** — steak, cornbread, pan-roasted chicken. Goes from stovetop to oven without a thought. Holds heat better than any other pan.

A new Lodge is $30. Pre-seasoned, ready to go. The "cast iron is hard to maintain" thing is overblown — wipe it dry, rub a little oil in, you're done.

## A Nonstick Skillet (10 inch)

Used for **eggs, fish, pancakes, anything that sticks to anything else**. Don't go expensive — nonstick coatings wear out in 2–3 years no matter what. Buy a cheap one and replace it when it stops working.

Don't put metal utensils in it. Don't crank it past medium-high.

## What About...

- **Sauté pan with straight sides** — useful but a deep skillet covers it.
- **Wok** — great if you stir-fry weekly. Otherwise the cast iron does the job.
- **Dutch oven** — yes, this is the fourth one. Lodge enameled is $80, lasts forever, makes every braise and stew you'll ever want. Add it when you have $80.

That's the kit. If a recipe needs something else, the skillet usually covers it.$$,
  'equipment',
  3
),
(
  'Why a Sharp Knife Is the Whole Game',
  'One good chef''s knife beats a 15-piece block any day.',
  $$Walk into any restaurant kitchen and count knives at each station. You'll find one chef's knife, maybe a paring knife. That's it. The 15-piece "knife block" set is for selling kitchens, not cooking.

## What Actually Matters

**Sharpness.** A sharp $30 knife outperforms a dull $300 knife every time. Sharpness reduces the force you have to use, which means more control, which means fewer cuts to your fingers. **Dull knives are more dangerous, not less.**

## What to Buy

A solid 8-inch chef's knife is the kitchen workhorse. Brands that do not let you down at the entry-level price:

- **Victorinox Fibrox 8-inch** ($45) — line cooks all over the country use this. Light, sharp, easy to maintain.
- **Mercer Culinary Genesis** ($55) — fuller handle, slightly heavier. Same quality.
- **Tojiro DP** ($85) — Japanese, harder steel, holds an edge longer. Step up when ready.

## A Paring Knife

A 3-inch paring knife handles small jobs (peeling, hulling, halving cherry tomatoes). $10 for a Victorinox. Done.

## How to Keep It Sharp

**Use a honing rod** before each cooking session — that's the long steel rod in the knife block. It doesn't sharpen, it straightens the edge. Five swipes per side, light pressure.

**Send it for sharpening** twice a year. Hardware stores, knife shops, and farmers' markets often have sharpeners ($5–$10 a knife). Cheaper than buying new and gives you a near-new edge.

**Don't put it in the dishwasher.** Hand wash, dry immediately. Dishwasher heat and detergent eat the edge.

## What to Skip

The 15-piece block set. The bread knife you'll use twice a year. The "santoku for vegetables." A chef's knife handles all of it.$$,
  'equipment',
  3
)
on conflict (title) do nothing;
