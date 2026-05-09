-- 016_seed_more_articles.sql
-- Second batch of Recipe Library articles (May 2026). Doubles the
-- starter library from 12 → 24 (still 6 topics, 4 articles per topic).
--
-- Picked from gaps a home cook hits in the first month:
--   - How to actually sharpen a knife at home
--   - The onion-dice trick everyone benefits from
--   - The roasting + pan-sauce basics that turn weeknight dinners around
--   - How to read pasta and rested meat
--   - The pantry differences that confuse people (salt grades, oil heat)
--   - The two-hour rule + cross-contamination habits
--   - Cast iron care + the oven-temperature lie
--
-- Idempotent: re-running this migration is a no-op once the rows
-- exist (UNIQUE INDEX on title + ON CONFLICT DO NOTHING). Editing an
-- article later means an UPDATE migration, not mutating this seed.
--
-- Markdown supported: ## headers, **bold**, paragraph breaks (\n\n),
-- line breaks (\n). No real <ul>/<li> in v1 — fake lists with "- " lines.

insert into public.recipe_articles (title, summary, content, topic, read_time_minutes)
values
-- ============================================================
-- KNIFE SKILLS (+2)
-- ============================================================
(
  'How to Sharpen a Knife at Home',
  'Three options that actually work, ranked by effort.',
  $$A sharp knife is the safest tool in your kitchen — you push less, slip less, cut yourself less. Here are the three at-home options, easiest first.

## Option 1: Pull-Through Sharpener

A small countertop tool with two slots: one coarse, one fine. Run the blade through each slot 5–10 times, light pressure, heel to tip.

It's the easiest path. It's also the most aggressive — it removes more metal than the other options, so a cheap pull-through used weekly will eat a knife over the years. Use it monthly, not weekly.

A good one runs $20–$30. Skip the $5 ones; they grind unevenly.

## Option 2: Ceramic Honing Rod

Looks like a regular honing rod (the long steel one in your knife block) but the surface is fine ceramic. Real honing rods only **straighten** an edge that's gone slightly off — they don't sharpen. Ceramic honing rods do both.

Hold the rod vertically, tip down on a cutting board. Draw the blade down and across at roughly 20° (about a thumbnail's gap), heel to tip. Five swipes each side, alternating.

Takes 30 seconds before you cook. Keeps a knife sharp for months without ever touching a real sharpener.

## Option 3: Send It Out

Hardware stores, farmers' markets, and most cookware shops sharpen knives for $5–$10. Twice a year is plenty. The result is better than anything you can do at home, and it's cheaper than a pull-through over time.

## What to Skip

**Whetstones** if you're new — they work beautifully but require practice to hold the angle. Worth learning eventually; not the right starting point.

## How to Tell It's Sharp

A sharp knife glides through a tomato skin under its own weight. If you have to push, it's dull.$$,
  'knife_skills',
  3
),
(
  'The Onion Trick: Even Dice in Under a Minute',
  'The lattice cuts that turn an onion into perfect dice fast.',
  $$Recipes say "dice an onion" like it's a single move. It's three moves, and once you know the order, every onion looks the same and takes a minute.

## Step 1: Cut It in Half, Root to Tip

Slice the onion in half from the pointy tip down through the root end. The root end is the **hairy** end — leave it intact, it holds the layers together while you cut.

Peel the papery skin off both halves. Place one half flat-side down on the board. The other goes in the fridge for tomorrow.

## Step 2: Make Vertical Cuts (Toward the Root)

With your knife parallel to the board, make 3–4 horizontal cuts through the onion, **stopping before you cut through the root**. Then make several vertical cuts from the tip toward the root, again stopping just shy of the root.

You now have a half-onion that's been pre-cut into a grid but is still holding together because the root end is intact.

## Step 3: Slice Across

Slice straight down across the grain you just made, from tip to root. Even dice fall away with each slice.

When you reach the root end, toss it.

## Why It Works

The root holds the onion's structure while you make all those cuts. If you skip the root or cut through it, the onion falls apart and you end up chasing pieces around the board.

## Smaller or Bigger Dice

Tighter spacing on the vertical and horizontal cuts gives you a finer dice. Wider spacing gives you bigger pieces. Same three moves — just adjust the gap between cuts.

By the second onion this'll feel automatic.$$,
  'knife_skills',
  3
),
-- ============================================================
-- TECHNIQUES (+2)
-- ============================================================
(
  'Roasting Vegetables: The One Method That Always Works',
  'High heat, oil, salt, single layer. That''s the whole recipe.',
  $$If you can roast a vegetable, you can put dinner on the table any night of the week. The method is the same for almost everything — broccoli, cauliflower, carrots, potatoes, brussels sprouts, squash, peppers, onions.

## The Four Rules

**1. Hot oven.** 425°F is the floor; 450°F is better. Lower temperatures steam the vegetable instead of caramelizing it.

**2. Real oil.** A real glug — 1–2 tablespoons per sheet pan. Toss the vegetables until every piece is glossy. Olive oil for most things; avocado oil if you want a higher smoke point.

**3. Real salt.** A big pinch of kosher salt before they go in. Salt before, not after — it draws moisture out so the surface can brown.

**4. Single layer.** Crowding is the killer. If pieces touch, they steam each other instead of browning. Use two sheet pans before crowding one.

## How Long?

Most vegetables take 20–35 minutes at 425°F. Check at 20 and decide:

- **Edges browning, fork goes through** → done.
- **Pale and limp** → another 5–10 minutes.

Stir or flip once at the halfway point. Don't fuss with them more than that; you want time on the pan.

## Two Tips That Make a Difference

**Cut everything roughly the same size.** Inch-and-a-half pieces is a good default for most vegetables. Mixed sizes give you some pieces burnt, some raw.

**Preheat the sheet pan.** Throw the empty pan in the oven while it heats. Add the oiled vegetables to a hot pan and the bottoms start caramelizing immediately. Optional but a real upgrade.

## Last Move

A squeeze of lemon or a splash of balsamic right out of the oven wakes everything up. Or skip it — they're already great.$$,
  'techniques',
  4
),
(
  'How to Build a Pan Sauce in Five Minutes',
  'The restaurant move that turns plain chicken into dinner.',
  $$A pan sauce is the brown stuff stuck to the bottom of the pan after you cook meat — turned into a glossy, restaurant-style sauce in five minutes. It's the single biggest weeknight upgrade you can learn.

## Step 1: Cook Your Meat First

Sear chicken, pork chops, steak, or fish in a regular (not nonstick) pan until done. Move it to a plate to rest. Don't wipe the pan.

The dark crust stuck to the bottom is called **fond**. That's the whole sauce.

## Step 2: Aromatics

Pan still on medium heat. Add a tablespoon of butter or oil and a chopped shallot (or 2 cloves garlic, or both). Stir for 30 seconds until fragrant.

## Step 3: Deglaze

Pour in 1/2 cup of liquid — wine, broth, or even water in a pinch. The fond will sizzle and start to lift off the pan. Use a wooden spoon to scrape it up. **This step is the magic.** All that flavor that was stuck to the pan is now in the sauce.

## Step 4: Reduce

Let it bubble for 2–3 minutes. The liquid will reduce by about half and start to look syrupy.

## Step 5: Mount with Butter

Turn off the heat. Drop in 2 tablespoons of cold butter and swirl the pan until it melts in. The sauce will thicken into a glossy, silky finish. **Don't skip this step** — it's what makes the sauce look like restaurant food.

## Pour It Over the Meat

Resting juices on the plate? Pour those into the sauce too — free flavor.

## Variations

- **Lemon pan sauce:** finish with a squeeze of lemon and chopped parsley.
- **Mustard pan sauce:** stir in a teaspoon of Dijon before mounting with butter.
- **Cream pan sauce:** swap the butter for a splash of heavy cream. Reduce 30 more seconds.

Same five steps every time. By the third dinner you won't need a recipe.$$,
  'techniques',
  4
),
-- ============================================================
-- COOKING TIMES & HEAT (+2)
-- ============================================================
(
  'Resting Meat: Why It Matters More Than You Think',
  'The five minutes that decide whether your steak is great or sad.',
  $$Rested meat tastes better. Unrested meat looks great on your plate and then bleeds out the moment you cut it, leaving you with a puddle of pink water and a gray, dry steak.

## What''s Happening

While meat cooks, the muscle fibers contract and squeeze juices toward the center. Cut into it immediately and that pressurized juice runs out onto the board.

Let it rest, and the fibers relax, letting the juices redistribute through the meat. Cut into it then and the juice stays where it belongs.

## How Long

The rule is **5–10 minutes for steaks and chops, 15–20 minutes for roasts and whole birds**.

A small chicken breast: 5 minutes. A ribeye: 8 minutes. A pork tenderloin: 10 minutes. A whole roast chicken: 20 minutes.

## Will It Get Cold?

Not really. A steak loses about 5°F over a 10-minute rest, sitting on a warm plate, tented loosely with foil. The flavor and texture upgrade is enormous; the temperature drop is barely there.

If you're worried, warm your serving plates first.

## Don''t Wrap It Tight

Tent foil **loosely** over the meat. Wrapped tight, the surface steams and the crust you worked for goes soft. A piece of foil draped on top is plenty.

## The Pull-Off Temperature Trick

Meat keeps cooking after you pull it from the heat — about 5°F more for a steak, 10°F for a roast. So **pull it 5–10°F before your target** and let the rest finish the cook.

Want medium-rare steak (130°F)? Pull at 125°F. Want a medium chicken thigh (175°F)? Pull at 170°F.

## The Last Detail

When you slice, **cut against the grain** — perpendicular to the muscle fibers. Look at the surface; you'll see lines running one direction. Cut across them. Same meat, much more tender bite.$$,
  'cooking_times',
  3
),
(
  'Pasta Al Dente: How to Actually Tell',
  'Forget the timer. Use the bite test.',
  $$"Al dente" is Italian for "to the tooth" — pasta that has just a tiny bit of resistance when you bite it. Not crunchy. Not soft. Just a hint of structure left.

## Why It Matters

Al dente pasta holds onto sauce. Overcooked pasta turns to mush, releases starch into your bowl, and makes everything gummy.

## The Bite Test

Start tasting pasta **2 minutes before the box says it''s done**. Box times are conservative — they assume hard water, low altitude, and a soft preference. Real al dente is almost always 1–2 minutes earlier than the package claims.

Pull a piece out. Bite into it. You're looking for:

- **Cooked through** — no white chalky core in the center.
- **Slight resistance** — a tiny push back from your teeth, not crunch.

If you see a chalky white dot: 1 more minute.
If it bites soft and gives no resistance: it's overcooked. Drain immediately.

## The "Throw It at the Wall" Myth

Skip it. Even mush sticks to a wall. The bite test is the only reliable way.

## Save the Pasta Water

Before draining, scoop out a cup of the cooking water. It's salty and starchy — adding a splash to your sauce thickens it and helps it cling to the pasta. This is what restaurants do.

## The Finish Trick

Drain pasta **a minute before al dente**, then finish it directly in the sauce for the last minute. The pasta absorbs the sauce instead of just being coated in it. Different food entirely.

## Salt the Water Like the Sea

Use way more salt than feels right — 1–2 tablespoons of kosher salt per pot. The water should taste like the ocean. Most of it goes down the drain; what's left properly seasons the pasta from the inside.

## A Quick Test

Cooking spaghetti? It's al dente when you can see a tiny pinpoint of white in a cross-section but the rest looks evenly cooked. Once that dot disappears, you have about 30 seconds before it's mush.$$,
  'cooking_times',
  3
),
-- ============================================================
-- PANTRY & SUBSTITUTIONS (+2)
-- ============================================================
(
  'Salt: Kosher, Table, and Flaky',
  'Three salts, three jobs. Why the kind matters as much as the amount.',
  $$Most recipes just say "salt" and assume you know which one. They're not the same. Using the wrong salt is the most common reason a recipe comes out under-seasoned or weirdly salty.

## Kosher Salt — The Cooking Salt

Bigger flakes than table salt, no iodine, no anti-caking agents. **This is what every recipe means when it says "salt" without specifying** — at least in modern American cookbooks.

The two big brands taste different at the same volume:

- **Diamond Crystal** is the lighter flake. A teaspoon weighs less.
- **Morton** is denser. A teaspoon has roughly 50% more salt by weight.

If a recipe was developed with Diamond Crystal and you sub in Morton, you'll over-salt. Most cookbooks now specify which one. If you're not sure, **start with half the amount and taste**.

## Table Salt — Skip It for Cooking

Fine grains, iodized, anti-caking agents. The salt you grew up with on the diner table.

It's twice as salty by volume as kosher salt because the grains are smaller and pack tighter. **A teaspoon of table salt = about 2 teaspoons of Diamond Crystal kosher.** It also tastes slightly metallic from the iodine.

Use it for baking (where precision matters and the flavor disappears) and nothing else.

## Flaky Sea Salt — The Finishing Salt

Big crunchy flakes (Maldon is the famous one). Used to **sprinkle on top** of finished food — roasted vegetables, chocolate cookies, sliced steak, focaccia.

You don't cook with flaky salt; you decorate with it. The texture is the whole point — a tiny crunch and a burst of saltiness in your mouth.

## How to Salt Right

**Salt early, salt often, taste constantly.** Salt at every stage — when you start the onions, when you add the broth, when the dish is almost done — and taste before adding more.

**Salt by feel, not by measure.** A pinch from a small pinch bowl is faster, more accurate, and more responsive than measuring spoons. Get a pinch bowl.

## When You Mess Up

Over-salted? Add acid (lemon, vinegar) or fat (butter, cream) — both balance saltiness. Adding more water dilutes everything else along with the salt.$$,
  'pantry',
  4
),
(
  'Cooking Oils: Which Heat Goes with Which Oil',
  'Smoke points, in plain English, with a chart you''ll actually remember.',
  $$Every cooking oil has a **smoke point** — the temperature where it starts to break down, smoke, and taste burnt. Heat past it and you ruin both the oil and what you're cooking.

## The Three Heat Tiers

**Low to medium heat (under 350°F)** — sweating onions, scrambling eggs, finishing dishes. Any oil works here, including butter and good olive oil.

**Medium-high heat (350–425°F)** — sautéing, pan-roasting, most weeknight cooking. You want a neutral-ish oil with a higher smoke point. Olive oil's still fine; avocado, canola, vegetable, and refined peanut oil are all good.

**High heat (over 425°F)** — searing steaks, deep frying, stir-frying. Olive oil starts to smoke. Reach for **avocado, refined peanut, grapeseed, or vegetable oil**.

## The Big Names

- **Extra-virgin olive oil:** smoke point ~375°F. Great for medium heat, finishing, and most everyday cooking. The "don't cook with it" advice is overstated — for sautéing onions or roasting vegetables, it's perfect.
- **Avocado oil:** ~520°F. Highest smoke point of common oils, neutral flavor. Best all-purpose high-heat option.
- **Canola / vegetable oil:** ~400°F. Cheap, neutral, fine for most things. Not exciting but reliable.
- **Butter:** ~325°F. Burns easily but tastes amazing. **Mix it with a splash of oil** to raise the effective smoke point — you get the flavor of butter without the burnt-butter risk.
- **Sesame oil (toasted):** ~350°F but you don't cook with it — you finish with it. Adds nutty flavor at the end.

## How to Tell If Oil Is Hot Enough

Drop a tiny piece of food in. If it sizzles immediately and a small ring of bubbles forms, it's ready. If it just sits there, the oil's still cold. If it browns instantly and starts smoking, the oil's too hot — pull it off the heat.

A drop of water also works (carefully — it'll spit). Skates and disappears = ready.

## Storage

**Store oils away from heat and light** (a cabinet, not on top of the stove). Oxidation and heat make them go rancid. Rancid oil tastes like crayons. If you're not sure, smell the bottle — fresh oil smells clean; rancid smells like old paint.$$,
  'pantry',
  4
),
-- ============================================================
-- SAFETY & STORAGE (+2)
-- ============================================================
(
  'The Two-Hour Rule',
  'How long cooked food can sit at room temperature before it''s a risk.',
  $$Cooked food sitting on the counter is fine for a while — and then it isn''t. The cutoff is shorter than most people think.

## The Rule

Cooked food can safely sit at room temperature for **two hours**. After that, the risk of bacterial growth gets real.

In hot conditions (over 90°F — outdoor parties, hot kitchens, summer picnics), cut it to **one hour**.

## Why

Bacteria love the temperature range between 40°F and 140°F — the so-called "danger zone." They double roughly every 20 minutes in there. After two hours at room temp, what was a safe amount of bacteria is now a problem amount.

This applies to everything cooked: meat, dairy, eggs, leftover soup, cooked rice, casseroles, sliced fruit. Anything you wouldn't eat raw needs to get back below 40°F within two hours of cooking.

## What to Do at the Two-Hour Mark

Either eat it or refrigerate it. Don't be sentimental — if the leftover lasagna's been on the counter for three hours, the right move is to throw it out.

## Cooling Big Pots Faster

A giant pot of soup or chili takes hours to cool in the fridge — the middle stays warm long after the edges are cold. While it cools, the danger-zone clock keeps ticking.

Two ways to speed it up:

- **Divide it into shallow containers** before refrigerating. Less depth = faster cooling.
- **Ice bath:** sit the pot in a sink of ice water and stir every few minutes. Cools a soup from boiling to fridge-safe in 20–30 minutes.

## What People Get Wrong

**"I'll just reheat it really hot — that kills the bacteria."** Heating kills bacteria, but not all of them release their toxins on cooking. Some toxins survive boiling. Reheating doesn't fully reverse the damage of a long sit-out.

**"It still smells fine."** Most foodborne illness comes from bacteria that don't smell or taste like anything. The nose is not a safety device.

## When to Just Toss It

If it's been out longer than two hours (one in the heat) and you can't honestly say it was at a safe temperature the whole time — toss it. The cost of one meal is much less than a night of food poisoning.$$,
  'safety',
  4
),
(
  'Cross-Contamination: The Boring Habits That Matter',
  'The five small habits that prevent most home-kitchen food poisoning.',
  $$Cross-contamination is when raw food (especially raw meat, poultry, eggs, or seafood) leaves bacteria on something you''re going to eat without further cooking. It's how most home-kitchen food poisoning happens, and it's almost entirely preventable with five small habits.

## 1. Two Cutting Boards

Use one cutting board for raw meat and one for everything else (vegetables, fruit, bread, anything you eat without cooking).

The cheap way: a plastic board for meat (color-coded if you want), a wood board for produce. Plastic is dishwasher-safe; wood needs hand-washing but is gentler on knives.

If you only have one board: **wash it with hot soapy water immediately after raw meat.** Don't just rinse.

## 2. Wash Your Hands After Touching Raw Meat

Sounds obvious. The trip from the steak to the lettuce is where it goes sideways. After you've handled raw chicken, **wash your hands before you touch anything else** — the salt cellar, the fridge handle, your phone, the salad bowl.

20 seconds with soap. Sing the chorus of any song you know.

## 3. The Plate Trick

When you're grilling or pan-cooking, you put raw meat on a plate to bring it to the heat. **Don't put cooked meat back on that same plate.** The juices on it are still raw.

Either wash the plate or use a fresh one for the cooked meat. If you're outside grilling, two plates — one in, one out.

## 4. Wash Vegetables Even If You're Going to Cook Them

Surprise upgrade: even vegetables that get cooked benefit from a rinse. Soil on the outside can have things growing on it that won't all die in a quick stir-fry.

Spinach, lettuce, herbs, and ready-to-eat produce especially. A quick rinse and shake.

## 5. Don't Wash Raw Chicken

This one's counterintuitive. Rinsing raw chicken in the sink doesn't clean it — it sprays bacteria-laden droplets up to three feet around the sink, onto your dish rack, your sponge, your counter, your other food.

Pat it dry with paper towels (which go straight in the trash) and cook it. Heat is what kills the bacteria, not a rinse.

## What These Five Habits Replace

A whole pile of more elaborate worries. Stick to these and the rest mostly takes care of itself.$$,
  'safety',
  4
),
-- ============================================================
-- EQUIPMENT (+2)
-- ============================================================
(
  'Cast Iron: Care and Feeding',
  'How to use, clean, and store the pan that lasts a hundred years.',
  $$A cast-iron skillet is the most-misunderstood piece of cookware in most kitchens. Treated right, it cooks better than any nonstick and lasts forever. Treated wrong, it rusts, sticks, and ends up in a yard sale.

## What "Seasoned" Means

The black, slick surface on a cast-iron pan isn't paint or coating — it's polymerized oil baked into the iron's surface. Every time you cook with oil, you add a tiny new layer. After enough use, the pan develops a deep, glassy nonstick surface that gets better with age.

Most new cast iron comes pre-seasoned (a thin factory layer). Your job is to keep building it up.

## How to Cook in It

**Preheat the pan first.** Cast iron heats slowly but holds heat like a brick. Put it on medium for 3–4 minutes before adding anything. A hot pan + oil + food is the formula for a clean release.

**Use real fat.** A glug of oil, butter, or bacon fat — not a mist of cooking spray. Spray oil leaves sticky residue that ruins seasoning.

**Skip soaking.** Tomato sauce, wine, citrus juice, and other acidic ingredients can break down seasoning if simmered for a long time. Quick contact (a deglaze, a splash) is fine. A slow tomato braise — use a different pan.

## How to Clean It

While it's still warm (not hot): rinse with hot water, scrub with a stiff brush or chainmail scrubber, dry immediately with a paper towel. Never let it sit wet.

**Soap is fine** — modern dish soap won't strip seasoning. Just don't soak it. The myth that cast iron can't see soap belongs to the 1950s.

**Stuck-on bits:** simmer a half-inch of water in the pan for a few minutes. Everything lifts off with a wooden spoon.

## After Each Wash

Dry it on the burner for 30 seconds (any leftover moisture evaporates). Rub a tiny bit of oil into the surface with a paper towel. Wipe it almost dry — you want a thin film, not a puddle. Store.

## Storage

Anywhere dry. Don't lid it or stack a wet pan on top. A cabinet or hanging hook is fine.

## Rust

If you forget it in the dishwasher overnight (it happens) and it rusts: scrub with steel wool until you see clean iron, dry, oil it generously, bake at 450°F upside-down for an hour. You've just re-seasoned it. Indestructible.$$,
  'equipment',
  4
),
(
  'The 25-Degree Oven Lie',
  'Most home ovens are 25°F off. Here''s how to find out and fix it.',
  $$Your oven probably isn''t the temperature it says. Most home ovens drift 15–50°F off the dial after a few years — sometimes more, sometimes less, sometimes hot in front and cold in back.

This is why your friend's recipe takes 45 minutes at her place and 35 at yours, and the cookies somehow always burn on the bottom rack but stay raw on the top.

## How to Test Yours

Buy an oven thermometer. They run $5–$15 at any hardware store or grocery — the small dial-style ones that hang from a rack. Put it on the middle rack. Set the oven to 350°F. Wait 15 minutes after the preheat beep. Check.

If the thermometer reads 325°F, your oven runs cold. If it reads 380°F, it runs hot.

## What to Do About It

**Mental adjustment.** Easiest path. If your oven runs 25°F cold, set every recipe 25°F higher than the recipe says. 350°F recipe → set to 375°F.

**Built-in calibration.** Most ovens from the last 15 years have a temperature offset setting. The owner's manual will tell you the button sequence (often holding the "Bake" or "Settings" button for a few seconds). You enter a +25 or −15 offset and the oven adjusts every future bake.

If you can't find the manual, search "[brand] [model] calibrate oven" — there's a YouTube video for every model.

## Hot Spots

Even a calibrated oven has uneven spots. The back is usually hotter (closer to the heating element); the front-left and front-right corners cool down every time you open the door.

**Rotate sheet pans** halfway through any bake longer than 20 minutes — turn the pan 180° and swap rack positions if you're using two pans. A small habit; visibly better cookies, biscuits, and roasted vegetables.

## When to Use Convection

If your oven has a convection setting, it has a fan that circulates hot air. The result: faster cooking, better browning, more even temperature.

The rule of thumb: **drop the temperature 25°F and reduce the time by about 20%.** A 350°F / 30-minute conventional bake becomes a 325°F / 24-minute convection bake.

Convection is great for roasting vegetables, baking cookies in batches, and roasting whole birds. Skip it for delicate cakes and custards — the moving air can dry them out.

## Why It Matters

A 25°F miscalibration is the difference between a perfect roast chicken and a dry one, between flaky biscuits and hockey pucks, between cookies and burnt cookies. Five-dollar thermometer, fixes most of your kitchen.$$,
  'equipment',
  4
)
on conflict (title) do nothing;
