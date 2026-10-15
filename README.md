# Pour Decisions

**If you don't remember, the app will.**

A private drink-tracking app for a group of friends. Log what you drink, rate and review it, recommend drinks to each other, and compete on variety: the most different beers, whiskies, styles and countries, not the most drinks. It is a phone web app for Android and iPhone that you add to your home screen. It has no build step and no server to run.

**Live app:** https://matt-ridley.github.io/PourDecisions/

**Current version:** 0.10.0 (beta)

## Features

- **Accounts for friends only.** Friends create an account with their email and a password, confirm they're of legal drinking age, then join with the group's invite code. Nobody else can see anything.
- **Group owner and admins.** Whoever sets up the group owns it. The owner can make other members admins. Admins can change the invite code, rename the group, and pause or remove members.
- **Keeping the drink list tidy (admins).** **Group admin › Drink list** (and a reminder on Home) shows:
  - **New drinks to check:** drinks members added, newest first, each with **Looks good**, **Fix**, **Merge** or **Delete** (Delete only when nobody has logged it).
  - **Fix details** on any drink's page: name, brand, flavour, style, alcohol %, approximate, where it's from, and extra recipe ingredients it counts as (a new dry vermouth counts as "Dry vermouth"). A fix to a built-in drink is laid over the built-in list for everyone, so a wrong ABV is fixed without a new app version, and it can be undone.
  - **Merge duplicates:** pick the drink to keep. The duplicate disappears from search and browsing, and its logs show and count as the drink kept. Nobody's logs change, so it can be undone.
  - **Styles:** add a style under an existing family (with its description), or rename a built-in style or rewrite its description. Only admins can.
  - **Places:** rename a place, or merge a duplicate ("Keg" into "The Keg"). Logs at the duplicate show the place kept.
- **Profiles.** Each member has a name, an optional hometown and a favourite drink.
- **Two looks.** **Happy Hour** is bright and sunny (sand, turquoise and coral). **Last Call** is the dark bar (wood, amber and a neon glow). **Auto** follows the phone's light or dark setting. Saved per phone.
- **Logging a drink.** Tap Log, search for what you're drinking (or tap one of your recent drinks), and log it. Works with no signal.
  - **How much:** sizes that fit the drink (Bottle 341 ml, Can, Tall can, Pint for beer; Single, Shot, Double for spirits; Glass and Bottle for wine; One or Double for a cocktail) or any amount. It shows the standard drinks as you pick. A cocktail's size and strength come from its recipe.
  - **Where:** pick from the group's shared places (yours come first) or add a new one. Logging again the same night suggests the same place.
  - **When:** now, or earlier for a drink you forgot to log.
  - **Notes and a photo:** both optional, about this pour or this night. The photo is shrunk on the phone; lists show a small copy and the full one loads only when the log is opened.
  - **Another one:** your recent drinks on Home have an **Another** button that logs the same drink again in one tap (with Undo).
  - **Never lost without a word:** every log is kept on the phone until the group has it. Home shows drinks waiting for signal, and if the server ever refuses one it says why, with **Try again** and **Discard**.
  - **Your logs:** open any log to see it, edit it, log another or delete it. Admins can delete anyone's log. Profiles show each member's recent drinks, and each drink's page shows how many times you've had it.
- **The feed.** The top of Home shows what everyone's pouring over the last week (**Show more** for older), newest first. It never shows amounts or standard drinks: how much is a personal stat.
  - **A night is one card:** someone's drinks at one place, each within 6 hours of the last, with their rating of each.
  - Also: written reviews, new cocktail variants, a new 👑 House Pour, and drinks added to the list.
  - **Filters:** everyone or one person, a category, and photos only.
  - **Same here:** tap it on a friend's drink to log the same thing for yourself, now (the same variant for a cocktail), with Undo.
  - **Keep it off the feed:** a switch when logging (and on Make it). The drink still counts in your stats, but the group doesn't see it in the feed or on your profile.
  - Your own recent drinks, with **Another**, are on your profile.
- **Ratings and reviews.** One rating per person per drink, not one per log: rate a Bud Light once and you're done, and change it whenever you like. Rating is separate from logging, so log when you start a drink and rate it during or after.
  - **Rating:** five stars, halves allowed (tap the left half of a star), plus up to 5 flavours that fit the drink (Hoppy and Crisp for beer, Peaty and Smoky for whisky, Tannic for wine) and an optional short review.
  - **How was it?** Home lists drinks you logged in the last day and haven't rated, with stars to tap right there. You can also rate from a log's page or the drink's page.
  - **On each drink's page:** the group's average rating, how many rated it, the most-picked flavours and everyone's reviews, newest first. Admins can take down a review's text (the stars stay).
  - **Top rated:** the group's favourites (Drinks › Top rated), best average first, filtered by category.
  - Ratings saved on logs before 0.8.0 still count: your latest one is your rating for that drink until you rate it again.
- **Making a cocktail.** Tap **Make it** on any cocktail (or **Make it your way** when logging one) to follow its recipe with what you've actually got.
  - **Pick the bottles:** each ingredient offers the bottles in the list that count for it (any Canadian rye for "Rye"), the ones you've used in cocktails or logged lately first. Or leave it as "any rye".
  - **Change it up:** − and + change each amount (¼ oz or 5 ml at a time), × leaves an ingredient out (put it back from **Left out**), **Add an ingredient** adds bitters, a syrup or another bottle, and the glass and garnish can change too.
  - **Your own variant:** anything different from the recipe is saved as a variant of the cocktail, named from what changed ("Whisky Sour · Dillon's Rye Whisky, more fresh lemon juice") unless you name it. Making the same thing again (same bottles, same amounts) counts toward the same variant, even if a friend made it first. Its strength comes from the real bottles, so standard drinks stay right.
  - **Who's drinking:** tick yourself and anyone you're making one for. Each person gets one logged, and drinks you make for friends show you as the maker. **How many to make** scales the amounts for 2, 4 or a pitcher of 8.
  - **Bartender mode:** the recipe in big text with a checkbox for every pour and step, and the screen stays awake while you make it.
- **The group's variants.** Each cocktail in the list shows how many variants the group has made ("Whisky Sour · 3 variants"), and its page lists them, most made first. Only variants someone has logged count, so an undone one doesn't.
  - **A variant's page:** its recipe with the changed rows marked and anything left out listed, what's different from the original, its strength, who has made it and how often, what it was remixed from, and its remixes. Its maker (or an admin) can name or rename it.
  - **Make this one:** opens Make it with the variant's bottles and amounts. Make it as it is, or change anything and it's saved as your remix, linked back to the one it came from.
  - **Make it again:** Home lists your latest variants with an **Again** button that logs the same drink in one tap (with Undo).
  - A cocktail log's page links to its variant and shows who made it, when a friend made it for you.
  - **Ratings:** each variant is rated on its own (stars, flavours and a review, once per person), separately from the original cocktail's stars. **How was it?** on Home asks about the variant you made. Variants show in **Top rated** among the cocktails.
  - **👑 House Pour:** the group's best-rated variant of each cocktail (at least 2 ratings, so nobody crowns their own) wears the crown, is listed first, and is named on the cocktail's page. Ties go to more ratings, then the older variant.
  - **Compare:** put a variant side by side with the recipe as written or another variant: ratings, times made, strength, every ingredient row (differences highlighted), glass and garnish.
  - **Photos:** add an optional photo when you make it. It goes with your own drink, and the variant's page shows the latest photos.
  - **Mixologist stats** on each profile: cocktails made, variants created, times friends made them, the average rating they get, and House Pours held.
- **Adding a drink.** Not in the list? Add it (brand, name, flavour, style, alcohol % and where it's from) and it's on the list for everyone. The form shows similar drinks already in the list. Only admins can add styles.
- **Ounces or millilitres.** Pick oz or ml on your profile (saved per phone). Used for drink sizes and cocktail recipes.
- **The drink list.** Search, or drill down one level at a time: Drinks › Whisky › Scotch › Islay Single Malt › the bottle. Every category, family and style has its own page with a short description, and breadcrumbs at the top lead back up. A level with only one choice is skipped (Rosé opens its drinks straight away).
  - **Categories:** Beer, Whisky, Spirits, Wine, Cider/Seltzer/More, Cocktails and Non-alcoholic, with beer and whisky first. Each one is split into families and styles, from Czech Pilsner and Hazy IPA to Islay single malt and Canadian rye (about 270 styles, including Appassimento and Icewine).
  - **Drinks:** about 1,580 brands and products, Ontario first (about 290 from Ontario breweries, distilleries, wineries and cideries), then the rest of Canada and imports. Deepest for whisky (540), spirits (510) and beer (350). Flavours are their own entries (Crown Royal Peach, White Claw Mango). Each shows its style, where it's from (with the town for Ontario makers) and its alcohol %. "~" means approximate: it varies by batch or vintage, or hasn't been checked against the label.
  - **Search:** matches names, brands, styles, categories, places (`guelph`, `county`) and cocktail ingredients, and ignores accents (`jager` finds Jägermeister).
  - **Cocktail recipes:** 210 default recipes (201 cocktails plus 9 mocktails), each with ingredients (in oz or ml), garnish, glass and method. Classics, tiki, frozen drinks, shots and shooters, with Canada well covered: seven Caesars, Rye and Ginger, the Paralyzer, Caribou, the Toronto, Moose Milk and Spanish Coffee.
  - **Ingredients:** tap an ingredient in a recipe to see which drinks in the list count as it (any Canadian rye counts as "Rye") and the other cocktails that use it. Each drink's page lists the cocktails you can use it in.
  - The list sticks to drinks known to be real, so it doesn't have every craft beer. Members add what's missing when they log it.
- **Status light.** A small ball on the glass at the top shows the connection: green = connected, pulsing green = syncing, blue = offline, red = a sync problem. On inner pages the glass turns into Back, and the ball stays on it.
- **System info.** Tap the glass (or **System info** on your profile) to see the connection in words (since when, the last sync, drinks and changes still waiting to send), the app version with **Check for an update**, whether the app is installed and ready offline, and this phone (space used, whether its saved data is protected, and the look).
- **Works offline.** After the first sign-in the app opens with no signal. The drink list is built in, so it's always there. With a weak signal it waits a few seconds, then opens from the copy saved on the phone. If it ever fails to start, it says so with a Reload button and details to screenshot, not a blank screen.

## Roadmap

The admin and offline steps carry over what Lunker League learned the hard way, so Pour Decisions starts with them instead of fixing them later.

1. **Status light, System info and admin tools.**
   - ✅ **Status light** and **System info** (0.7.0).
   - **Storage and free-plan meters:** how much of Firebase's free 1 GB is used and how many more logs fit, and what each app open costs against the free plan's daily reads and monthly downloads. Shown on System info and Group admin, so limits are seen coming.
   - **Email an invite (owner):** writes an invite email in the owner's own email app, with what the app is, how to install it on iPhone and Android, how to sign up, and the invite code. It comes from the owner's address and needs no email service.
2. ✅ **Ratings and reviews** (0.8.0).
3. ✅ **Cocktail variants** (0.9.0 to 0.9.3). Make a cocktail by following its recipe, pick the bottles you actually used, change the amounts, add or leave out ingredients, and name it if you like. Each different version becomes a variant under the original cocktail, which shows how many variants the group has made. Making the same thing again (same bottles, same amounts) counts toward the same variant instead of adding a copy. Variants are rated by the group, and each one shows who has made it.
   - ✅ **Variants core** (0.9.0): what makes a variant, ids from what's in it, automatic names, makers, strength from the real bottles, security rules.
   - ✅ **Make it** (0.9.1): follow the recipe with a bottle picker and amount stepper on each ingredient, add or remove ingredients, change the glass or garnish, an optional name, and batches (×2, ×4, a pitcher). **Bartender mode:** big text, a checkbox per step and the screen kept awake. **Make it for someone:** log it for another member, with you as the maker.
   - ✅ **Variants in the catalogue** (0.9.2): the variant count on each cocktail, a Variants list on its page, and a page per variant showing what's different from the original. **Remix** someone's variant (it shows what it was remixed from). **Make it again** from Home.
   - ✅ **Ratings, crown and stats** (0.9.3): rate variants (separate from the original's stars), top variants, a **House Pour** crown for the group's best-rated variant of each cocktail, **Compare** two variants side by side, a photo per variant, and mixologist stats on profiles (variants created, made by others, average rating).
4. **The feed.** What everyone's pouring, at the top of Home. It's worked out from what every phone already has, so it costs no extra reads. It never shows amounts: how much is a personal stat.
   - ✅ **Feed core** (0.10.0): each night at a place as one card per person, written reviews, new cocktail variants, House Pour changes and drinks added to the list. Filters (who, category, photos only), **Same here** on a friend's drink, **Keep it off the feed** when logging, and Show more.
   - **Cheers and comments** (0.10.1): a 🍻 Cheers on any post (showing who cheered) and short comments underneath. Delete your own; admins can delete any comment.
   - **Firsts, recaps and who's out** (0.10.2): automatic posts for firsts and milestones ("Dave's first Islay Scotch", "Sam's 100th drink"), a recap card when a night at a place ends, and a strip showing who's out right now and where.
   - **Alerts** (0.10.3): a bell in the header for cheers and comments on your drinks, friends making your variants, and House Pours won or lost. In the app only: true phone notifications need a paid server.
5. **Variety stats.** Distinct drinks, styles, families and countries on each profile, plus standard drinks as a personal stat.

### After the core: the bar, the fridge and the tab

These milestones come after steps 1 to 5, since they all build on logging a drink. They share one idea: **every drink comes from somewhere (a fridge, a bar, a cooler or a store) and ends up with someone.** Each log records where the drink came from and who drank it, and the Tab, Drink Nights and recaps are worked out from those logs.

**A. Stock: the fridge and the bar**
- **Households:** a fridge and a bar belong to a household, either one person or several people who share them (couples, roommates). Everyone in the group can see every household's fridge and bar.
- **The Fridge:** beer and other cans and bottles, counted. **Reload** with one tap (+1, 6, 12, 15, 24 or 30), with recently reloaded drinks first. **Drink one** logs it and takes it out of the fridge. Warns when a drink is running low, at a level the household sets.
- **My Bar:** bottles, tracked by how full they are (full, ¾, ½, ¼, empty) rather than exact amounts. A logged pour lowers the level using the bottle size. Mixers, bitters, syrups and garnishes go in the bar too.
- **Killed the bottle:** whoever pours the last drop gets the credit. A wall of empties on each profile.
- **Coolers:** for a night out, load a cooler from your fridge. Drinks then come out of the cooler, and whatever's left goes back into the fridge afterwards.

**B. The Tab**
- **Give a drink:** pick a person. The drink is logged for them, comes out of your fridge, bar or cooler, and goes on the Tab. When it comes from a shared household fridge, the person who hands it over is the giver.
- **Every drink counts as 1**, whatever it is.
- **Person to person:** each pair has its own balance (given vs received), and balances are never combined or passed on to other people.
- **Paid back in drinks**, never cash.
- **Most Generous** board, plus a playful opposite.
- To decide when building: whether the person receiving confirms a drink, or can dispute one logged to them.

**C. Drink Nights**
- Host, place, who's there and start time. The end time is optional: with none, the night ends with the last drink logged, which is marked as the **Nightcap**.
- At home (the host's fridge and bar), out with coolers, or both.
- Drinks logged during the night by people who are there attach to it automatically.
- **Group log:** a round for everyone in one tap. It logs a drink for each person, takes the drinks out of the host's fridge or someone's cooler, and adds them to the Tab.
- **Bring list:** a potluck list of who's bringing what. Drinks people bring go into the night's pool and onto the Tab when they're handed out.
- **Recap:** total drinks, drinks per person, top drink, bottles killed, what got emptied, bottle levels before and after, most generous, first to tap out and who had the Nightcap. Posted to the feed.
- **Morning-after recap:** the next morning, what you drank, standard drinks, and what you gave away and were given. "If you don't remember, the app will."

**D. The bartender**
- **What can I make:** cocktails sorted into Can make now, Missing 1 (with what to buy) and Missing 2+, from what's in your bar.
- **Planning a night:** put everyone coming's bars together to see what the group could make, then agree who brings what (feeds the bring list).
- **Your bar's page:** a name ("The Basement"), a photo, a signature drink and the current menu.
- **Bar Menu / Order up:** the host publishes a menu of what they can make. Guests order from their phones, the host sees the queue and taps **Served**, and the drink is logged for the guest and comes out of the host's bar.
- **LCBO run list:** a shopping list made from drinks running low and the missing ingredients for cocktails you've starred. It can be shared for a night.

### Carried over from Lunker League

Rules to follow from the start, so they never need fixing later:

- Never match saved app files while ignoring the query string, and never save an address that has one.
- Photos (small and full) never go inside the documents every phone loads at start-up.
- Listeners load only what a screen needs. Once loading the whole history costs too much, older years get packed into an archive.
- A change that needs new security rules goes out with them: publish the rules before (or right when) merging, or phones show a sync problem.
- Still open in Lunker League, so worth trying to solve here: in a dead zone, sign-in checks the account over the network at start-up and can show "Loading…" for up to 30 seconds.

### Backlog

- Crowns (one holder at a time, e.g. Explorer, Peat Freak, Globetrotter) and badges. (The House Pour crown for cocktail variants comes earlier, in step 3.)
- Recommendations ("you should try this"), wishlist and palate match.
- The group's own cocktail book: brand-new recipes, not variants of a built-in one.
- Challenges: blind tastings, Style Bingo, Around the World, Cocktail of the Month, Sober October.
- Year-end "Wrapped".
- Group start date and a late-logging window, like Lunker League's (late entries count for your history but not the competition). Decide once there's something to compete on.
- An admin points editor with saved versions and a preview, once crowns, badges or challenges award points.

### Possible ideas

Worth keeping in mind, but not planned:

- **Batch drinks:** "Made a pitcher of Caesars (8)". Guests pour from the batch, and the recap shows who drank most of it.
- **Barcode scan to reload:** the first person to scan a can links the barcode to the drink, and everyone after gets it. Android Chrome can scan on its own, but iPhone Safari needs a scanning library.
- **Spending stats:** what you paid when reloading, cost per drink, monthly spend (private).
- **Rounds at the pub:** "my round" when out, feeding the Tab.
- **Hangover rating:** an optional 1 to 5 the next morning, and what the worst nights had in common.
- **Hunt list:** your wishlist, showing who already has the drink in their bar.
- **Bottle share:** someone opens a special bottle and everyone at the night gets a logged pour.
- **Who's driving:** a designated-driver flag on a Drink Night.
- **Cellar** (vintage and "drink by", e.g. Icewine), **homebrew** batches that refill the fridge, **keg** tracking and a **party planner** (how much to buy for so many people and hours).

## Installing on a phone

1. Open the live app in **Chrome** on Android or **Safari** on iPhone.
2. Add it to the home screen:
   - **Android:** tap the menu (three dots), then **Add to home screen** or **Install app**.
   - **iPhone:** tap **Share**, then **Add to Home Screen**.
3. Always open the app from the home-screen icon.

## Setting up the group (first time only)

### 1. Create the Firebase project

The app uses a free Firebase project (Google) for accounts and to share data between phones.

1. Go to https://console.firebase.google.com and create a project named `pourdecisions`. Google Analytics isn't needed.
2. In the left menu, open **Security > Authentication** and click **Get started**. On the **Sign-in method** tab, choose **Email/Password**, turn on the first switch only (leave **Email link** off) and click **Save**.
3. Still in Authentication, open the **Settings** tab, then **Authorized domains > Add domain**, and add `matt-ridley.github.io`. `localhost` is already there.
4. Open **Databases and storage > Firestore** and click **Create database**. Pick a nearby location (for example `northamerica-northeast2`, Toronto) and start in **production mode**.
5. On Firestore's **Rules** tab: paste the whole of [`firestore.rules`](firestore.rules) and click **Publish**.
6. Open **Settings** (the gear) **> General**, scroll to **Your apps** and click the web icon `</>`. Give it a nickname and leave Hosting unticked. Copy its `firebaseConfig` values into `FIREBASE_CONFIG` in [`js/config.js`](js/config.js).
   - These values are public by design. The rules are what keep the data private.
7. Put the project ID in [`.firebaserc`](.firebaserc) so `npm run deploy:rules` knows where to publish.

The free Spark plan is plenty for a group of friends.

### 2. Claim the group

Do this right after the first deploy, before sharing the link.

1. Open the app, tap **Join the group**, and create your account. Leave **Invite code** blank.
2. The app sees there's no group yet and shows **Start your group**. Enter the group name and an invite code.
3. You're now the owner and an admin. Nobody else can claim the group after this.

### 3. Invite friends

Open your profile, then **Group admin > Copy invite**, and text it to your friends. They tap **Join the group**, create an account and enter the code. If you ever need to stop new sign-ups, change the code.

### Updating the security rules

Some new versions change `firestore.rules`, and the changelog says when. Publish them before (or right after) merging, or the new features show a sync problem. Either paste the file into **Firestore > Rules** in the Firebase console and click **Publish**, or from this folder:

```bash
npx firebase login
```

```bash
npm run deploy:rules
```

`npx firebase login` is needed only once per PC.

## Where data is stored

- Accounts, profiles, logged drinks, shared places and drinks members add are stored in the group's Firebase project. Only members can read them.
- Admins' fixes to built-in drinks (`fixes`, only the fields that differ) and their new or renamed styles (`styles`) are stored there too, and laid over the built-in list by the app.
- Ratings are stored in `ratings`, one document per person per drink (id `uid_kind_drinkId`). A cocktail variant is rated with kind `variant`.
- A log kept off the feed has `offFeed: true`. It still counts in its owner's stats.
- Cocktail variants are stored in `variants`, with an id made from the original cocktail's id and a hash of what's in it (`whisky-sour~1x2y3z`), so the same drink made twice is one variant. A log of one keeps the original cocktail as its drink and adds `variantId`. A drink someone made for you is logged as yours, with their id in `madeBy`.
- A log's photos are stored in their own documents (`thumbs` for the small copy, `photos` for the full one, same id as the log), so opening the app never downloads every photo.
- Each phone also keeps its own unsent logs (with photos) in the browser's IndexedDB until the group has them.
- The built-in drink list ships with the app, so it costs nothing to store and works offline.
- Nothing about members is stored in this repository, which is public so GitHub Pages can host it for free.
- Each phone keeps an offline copy. Changes made with no signal wait on the phone. Signing out before they're sent can lose them, so the app warns you.

## Running locally

```bash
py -m http.server 8768
```

Then open http://localhost:8768. Service workers and sign-in need `localhost` or HTTPS, not `file://`. Until `FIREBASE_CONFIG` is filled in, the app shows **Almost ready**; use the emulator (below) to try everything.

### Testing

Install the dev tools once:

```bash
npm install
```

Check the drink list, search and units:

```bash
npm test
```

The emulator is a pretend Firebase that runs only on this PC, so tests never touch the real group. It needs Java 21 (installed with `winget install Microsoft.OpenJDK.21`). It uses ports 8180 (Firestore) and 9199 (sign-in), so it can run alongside Lunker League's emulator.

Check the security rules (`firestore.rules`) with the automated tests:

```bash
npm run test:rules
```

Try the app against the emulator: start it in one terminal, run the web server in another, then open http://localhost:8768/?emulator. Any made-up email such as `owner@example.test` works, and everything is wiped when the emulator stops. Use http://127.0.0.1:8768/?emulator in a second tab to be a second person.

```bash
npm run emulators
```

`?emulator` only works on `localhost` and `127.0.0.1`. The live site always uses the real project.

To fill a test group with other members' drinks, ratings and so on, [`tools/emu-seed.js`](tools/emu-seed.js) writes straight into the emulator from the browser console (it only ever talks to the emulator on 127.0.0.1):

```js
const { seed } = await import("/tools/emu-seed.js");
await seed("members", "friend1", { displayName: "Dave", joinedAt: 1, suspended: false });
```

To redraw the app icons after changing `tools/make-icons.mjs`:

```bash
node tools/make-icons.mjs
```

## The drink list files

- [`js/catalog/styles.js`](js/catalog/styles.js): categories, families and styles. Style ids are unique across the whole tree.
- [`js/catalog/drinks.js`](js/catalog/drinks.js): joins the drink lists and holds the places (`ORIGINS`). The lists are one file per category: [`beer.js`](js/catalog/beer.js), [`whisky.js`](js/catalog/whisky.js), [`spirits.js`](js/catalog/spirits.js), [`wine.js`](js/catalog/wine.js), [`more.js`](js/catalog/more.js) (cider, mead, sake, seltzers) and [`na.js`](js/catalog/na.js). `brand` + `name` + `variant` make the title; `abv` is as sold in Canada, with `approx: true` when it varies.
- [`js/catalog/about.js`](js/catalog/about.js): the short description on each category, family and style page (families keyed `category/family`).
- [`js/catalog/make.js`](js/catalog/make.js): helpers for writing the lists. `maker(brand, origin, town)` declares a maker once, then one short line per product. Ids come from the title (`Dillon's Rye Whisky` is `dillons-rye-whisky`) and are permanent once shipped: if a title changes, pass the old id as `id`.
- [`js/catalog/ingredients.js`](js/catalog/ingredients.js): what recipes are made of. Each ingredient has an id, a name and a kind (spirit, liqueur, mixer, juice, syrup, bitters, fresh, dairy, pantry). For bottles it says what counts: whole categories (`cats`), `families`, `styles` or specific `drinks`, with `not` to leave styles out. Canadian blended counts as rye, as Canadians use the word. `pantry` items (water, salt, sugar) are assumed to be on hand.
- [`js/catalog/cocktails.js`](js/catalog/cocktails.js): joins the recipe files and adds each ingredient's display name. The recipes are one file per group: [`recipes-stirred.js`](js/catalog/recipes-stirred.js), [`recipes-sours.js`](js/catalog/recipes-sours.js), [`recipes-long.js`](js/catalog/recipes-long.js) (highballs, mules, Caesars, Collinses, mojitos), [`recipes-party.js`](js/catalog/recipes-party.js) (spritzes, sparkling, tiki, frozen) and [`recipes-sweet.js`](js/catalog/recipes-sweet.js) (creamy, coffee, hot, shots, mocktails). Amounts are in oz with `oz(1.5, "vodka")`, or `qty("2 dashes", "angostura")` for things that aren't poured. A list of ids means any will do (`oz(2, ["rye", "bourbon"])`), and `{ optional: true }` marks what a drink works without. Ids come from the name and are permanent once shipped.

`npm test` checks every drink points at a real style, ids are unique tidy slugs, ABVs are sensible, Ontario comes first, every recipe is complete, every recipe ingredient exists (and every ingredient is used), and bottles count as the right ingredients.

## Versioning

The version number is the `VERSION` constant in [`js/config.js`](js/config.js), shown at the bottom of your profile. It follows `major.minor.patch`:

- **Major** for a big change in how the app works.
- **Minor** for each new feature.
- **Patch** for fixes and smaller changes.

Update this README's **Current version** and the changelog in the same commit. When adding a new file under `js/`, also add it to `APP_FILES` in [`sw.js`](sw.js) so it's available offline (`npm test` checks this).

## Changelog

- **0.10.0** (2026-Oct-14): The feed, part 1. The top of Home now shows what everyone's pouring this week: each night at a place as one card per person, written reviews, new cocktail variants, House Pour changes and drinks added to the list, with filters (who, category, photos only) and Show more. **Same here** logs a friend's drink for you in one tap. **Keep it off the feed** when logging or making a cocktail: it still counts in your stats. Your recent drinks moved to your profile. No amounts in the feed. **New `firestore.rules`: publish them before merging.**
- **0.9.3** (2026-Oct-14): Ratings, crown and stats for cocktail variants, the last part of roadmap step 3. Rate a variant on its own page (separate from the original's stars); **How was it?** asks about the variant you made, and variants show in Top rated. The best-rated variant of each cocktail (at least 2 ratings) is the **👑 House Pour**: crowned, listed first and named on the cocktail's page. **Compare** puts a variant beside the recipe or another variant, with differences highlighted. Make it takes an optional photo, and a variant's page shows the latest ones. Profiles show **Mixologist** stats. No new security rules.
- **0.9.2** (2026-Oct-14): Variants in the catalogue. Cocktails show how many variants the group has made, and each cocktail's page lists them, most made first (only variants someone has logged count). Each variant has its own page: the recipe with the changes marked, what's different, strength, who made it and how often, what it was remixed from and its remixes, with **Make this one** (change anything to make a remix) and, for its maker or an admin, **Rename**. Home gets **Make it again** for your latest variants. A cocktail log's page links to its variant and shows who made it. Drinks you made for friends that are still waiting to send now show on Home. No new security rules.
- **0.9.1** (2026-Oct-14): Making a cocktail. **Make it** on each cocktail's page (and **Make it your way** when logging one) follows the recipe: pick the bottle you're using for each ingredient (yours first), change amounts with − and +, leave ingredients out or add new ones, and change the glass or garnish. Anything different is saved as your own variant, named from what changed unless you name it; making the same drink again reuses it. Tick who's drinking to log one for each of them, with you as the maker of theirs, and scale the amounts for a batch. **Bartender mode** shows it in big text with a checkbox per line and keeps the screen awake. Drinks made for friends are resent from the outbox like your own. No new security rules.
- **0.9.0** (2026-Oct-14): Cocktail variants, the groundwork (nothing new on screen yet). New roadmap step 3: cocktail variants, in four parts. The new `js/variants.js` decides what counts as a variant (a bottle picked, an amount changed, an ingredient added or removed, or a different glass or garnish; picking "rye or bourbon" or leaving out an optional ingredient is still the recipe), gives each one an id made from what's in it, names unnamed ones from what changed ("Whisky Sour · Dillon's Rye Whisky, more fresh lemon juice"), and counts who has made each one. A cocktail's strength now uses the real bottles picked, so a full-proof bourbon counts as stronger. Security rules for variants, logs that point at a variant or were made for someone else, and rating a variant. **New `firestore.rules`: publish them before merging.**
- **0.8.0** (2026-Oct-14): Ratings and reviews. One rating per person per drink, kept apart from logs, so a drink is rated once and changed whenever. Stars and flavours are gone from the log screen (logs keep their own notes). Rate later from **How was it?** on Home, a log's page or the drink's page, with stars, flavours and an optional review. Each drink's page shows the group's average, the most-picked flavours and everyone's reviews. New **Top rated** list under Drinks. Admins can take down a review's text. Ratings on older logs carry over. **New `firestore.rules`: publish them before merging.**
- **0.7.0** (2026-Oct-13): Status light and System info. The Live/Offline pill is gone from the header, making room for an alerts icon later. Instead, a small ball on the glass shows the connection (green connected, pulsing green syncing, blue offline, red a sync problem), and stays on Back on inner pages. Tap the glass, or **System info** on your profile, for the connection in words, the app version with **Check for an update**, and this phone. No new security rules.
- **0.6.1** (2026-Oct-13): A much bigger whisky and spirits list: about 580 more bottles (whisky 255 to 539, spirits 203 to 513). More Canadian whisky (Wiser's, Canadian Club, Lot No. 40, Forty Creek, Alberta and BC distilleries), many more Scotch single malts and blends, bourbon and rye, Irish, Japanese and world whisky. More gin, vodka and flavours, rum, tequila and mezcal, cognac and brandy, and liqueurs (including the McGuinness and Sour Puss range), amari and vermouths. Every new bottle counts toward the recipes that call for its style.
- **0.6.0** (2026-Oct-13): Catalogue moderation for admins. A Drink list page under Group admin (with a reminder on Home) for new drinks to check: Looks good, Fix, Merge or Delete. Fix details on any drink, built-in ones included (laid over the list, can be undone), including which recipe ingredients it counts as. Merge duplicates: hidden from the list, their logs count as the drink kept, undoable. Add, rename and describe styles. Rename and merge places. Logs show a drink's or place's current name. **New `firestore.rules`: publish them before merging.**
- **0.5.0** (2026-Oct-13): The Drinks tab drills down: category, then family, then style, each on its own page with a short description (all 7 categories, 49 families and 271 styles) and breadcrumbs back up. Drink and recipe pages show the full trail too. Empty styles say so, with a button to log one.
- **0.4.0** (2026-Oct-13): Logging a drink. Pick it (or one of your recent drinks), then size with standard drinks, a half-star rating, flavour tags, a place from the group's shared list, now or earlier, notes and an optional photo. "Another" logs the same drink again in one tap, with Undo. Logs wait on the phone until the group has them, and a refused one is shown with Try again. Open a log to edit or delete it (admins can delete anyone's). Members can add drinks to the shared list. Home and profiles show recent drinks, and drink pages show how often you've had it. Fixed the start-up safety net, which had a typo that stopped it from ever showing. **New `firestore.rules`: publish them before merging.**
- **0.3.0** (2026-Oct-13): Cocktail recipes: 210 (201 cocktails and 9 mocktails, up from 12), from Old Fashioneds and Negronis to tiki, frozen drinks, shots and layered shooters, with seven Caesars and Canadian favourites (Rye and Ginger, Paralyzer, Caribou, Toronto, Moose Milk, Spanish Coffee, B-52). Recipes are now made of ingredients that know which drinks count as them, ready for "what can I make". Tap an ingredient for its page (the drinks that count and the cocktails that use it), and each drink's page lists the cocktails it goes in.
- **0.2.1** (2026-Oct-13): Roadmap: after the core steps, four milestones for the bar, the fridge and the tab. A: stock (households sharing a fridge and bar that everyone can see, reloads, bottle levels, killed bottles, coolers). B: the Tab (every drink counts as 1, person to person, paid back in drinks only). C: Drink Nights (Nightcap ends a night with no end time, group rounds, bring list, recap, morning-after recap). D: the bartender (what can I make, planning what to bring, bar pages, Bar Menu orders, LCBO run list). Cocktail recipes get ingredient ids. New Possible ideas list.
- **0.2.0** (2026-Oct-13): The drink list: about 1,000 drinks, Ontario first (about 260 Ontario entries), deepest for beer and whisky, with flavours as their own entries. Ontario makers show their town, and towns are searchable. Four new styles: International Pale Lager, India Pale Lager, Appassimento and Pinot Blanc. Browsing a category opens one style at a time, so long lists stay quick, and search says when there are more results than it shows. Cocktail recipes are still the 12-recipe sample.
- **0.1.3** (2026-Oct-13): Offline safety, from what Lunker League learned. The fonts no longer hold up the page (with no signal they could leave it blank), and they're saved when the app installs. Once a page opens from the saved copy, its other files load from saved copies straight away. Saved files are matched by their exact address, and app files are saved all or none. New start-up safety net: "Pour Decisions didn't start" with Reload and details, instead of a blank screen.
- **0.1.2** (2026-Oct-13): Roadmap: offline safety next, then catalogue moderation, a status light with System info, storage and free-plan meters, email invites and admin moderation, carried over from Lunker League.
- **0.1.1** (2026-Oct-13): Connected to the group's Firebase project (`pourdecisions-910bf`).
- **0.1.0** (2026-Oct-07): The foundation. Accounts with invite codes and a legal-age check, group owner and admins, profiles, Happy Hour and Last Call looks, oz or ml, works offline. The drink list: the full style tree (about 270 styles) with a sample of drinks in every category, search, and default cocktail recipes. New `firestore.rules`.

## Credits

Built by Matt Ridley.
