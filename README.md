# Pour Decisions

**If you don't remember, the app will.**

A private drink-tracking app for a group of friends. Log what you drink, rate and review it, recommend drinks to each other, and compete on variety: the most different beers, whiskies, styles and countries, not the most drinks. It is a phone web app for Android and iPhone that you add to your home screen. It has no build step and no server to run.

**Live app:** https://matt-ridley.github.io/PourDecisions/

**Current version:** 0.2.1 (beta)

## Features

- **Accounts for friends only.** Friends create an account with their email and a password, confirm they're of legal drinking age, then join with the group's invite code. Nobody else can see anything.
- **Group owner and admins.** Whoever sets up the group owns it. The owner can make other members admins. Admins can change the invite code, rename the group, and pause or remove members.
- **Profiles.** Each member has a name, an optional hometown and a favourite drink.
- **Two looks.** **Happy Hour** is bright and sunny (sand, turquoise and coral). **Last Call** is the dark bar (wood, amber and a neon glow). **Auto** follows the phone's light or dark setting. Saved per phone.
- **Ounces or millilitres.** Pick oz or ml on your profile (saved per phone). Used for cocktail recipes now and drink sizes later.
- **The drink list.** Search or browse by category:
  - **Categories:** Beer, Whisky, Spirits, Wine, Cider/Seltzer/More, Cocktails and Non-alcoholic, with beer and whisky first. Each one is split into families and styles, from Czech Pilsner and Hazy IPA to Islay single malt and Canadian rye (about 270 styles, including Appassimento and Icewine).
  - **Drinks:** about 1,000 brands and products, Ontario first (about 260 from Ontario breweries, distilleries, wineries and cideries), then the rest of Canada and imports. Deepest for beer (350) and whisky (255). Flavours are their own entries (Crown Royal Peach, White Claw Mango). Each shows its style, where it's from (with the town for Ontario makers) and its alcohol %. "~" means approximate: it varies by batch or vintage, or hasn't been checked against the label.
  - **Search:** matches names, brands, styles, categories, places (`guelph`, `county`) and cocktail ingredients, and ignores accents (`jager` finds Jägermeister).
  - **Cocktail recipes:** every cocktail has a default recipe with ingredients (in oz or ml), garnish, glass and method.
  - The list sticks to drinks known to be real, so it doesn't have every craft beer. Logging (next) lets members add what's missing, and admins fix details.
- **Works offline.** After the first sign-in the app opens with no signal. The drink list is built in, so it's always there. With a weak signal it waits a few seconds, then opens from the copy saved on the phone. If it ever fails to start, it says so with a Reload button and details to screenshot, not a blank screen.

## Roadmap

The admin and offline steps carry over what Lunker League learned the hard way, so Pour Decisions starts with them instead of fixing them later.

1. **Cocktail recipes.** 150 to 200 default recipes with Caesar variants (the drink list itself shipped in 0.2.0). On hold for now.
   - **Ingredients with ids.** Each recipe ingredient points at an ingredient id (`rye-whisky`, `bourbon`, `sweet-vermouth`, `clamato`, `simple-syrup`) instead of plain text like "Rye or bourbon", and the drink list says which styles and bottles count as each ingredient (any rye counts as rye; "rye or bourbon" takes either). **What can I make** (Milestone D) depends on this, so it's done when the recipes are written, not added later.
2. **Logging a drink.** Pick it from the list (or add a new one), size, rating and notes. Works with no signal. Any member can add a drink to the shared list. Only admins can add styles.
   - **Optional photo.** The small photo is stored in its own document from day one, not inside the log, so opening the app doesn't download every photo. Lunker League had to move its small photos out later. The full photo loads only when a drink is opened.
   - **Outbox.** Every log this phone sends (with its photo) is also kept on the phone until the group has it. If the server refuses one (for example a paused account), the app says so and offers to try again. A drink is never lost without a word.
   - **Admins can delete any log.**
3. **Catalogue moderation (admins).** Keeps the shared drink list clean as members add to it.
   - **New drinks to check:** drinks added by members, newest first, with a count on Group admin. Admins mark them checked, fix them or merge them.
   - **Fix details:** admins can edit any drink a member added (name, brand, style, where it's from, ABV, flavour). For built-in drinks a fix is saved as a correction that the app lays over the built-in list, so a wrong ABV can be fixed without a new app version.
   - **Merge duplicates:** pick the one to keep. The duplicate is hidden from search and points at the one kept, and logs of the duplicate show and count as the kept drink. Nobody's logs are rewritten, so a merge works offline and can be undone.
   - **Styles:** only admins add styles (under an existing family) or rename them.
4. **Status light, System info and admin tools.**
   - **Status light:** a glass icon at the top shows the connection: green = connected, pulsing = syncing, blue = offline, red = a sync problem. Tap it for System info.
   - **System info:** connection state and since when, when the group last synced, drinks and changes still waiting to send, the outbox, the app version with **Check for an update**, whether the app is installed and ready offline, and space used on the phone (and whether the phone protects it).
   - **Storage and free-plan meters:** how much of Firebase's free 1 GB is used and how many more logs fit, and what each app open costs against the free plan's daily reads and monthly downloads. Shown on System info and Group admin, so limits are seen coming.
   - **Email an invite (owner):** writes an invite email in the owner's own email app, with what the app is, how to install it on iPhone and Android, how to sign up, and the invite code. It comes from the owner's address and needs no email service.
5. **Ratings and reviews.** Star ratings, tasting notes and flavour tags. Admins can delete any review.
6. **The feed.** What everyone's pouring. Admins can delete any comment.
7. **Variety stats.** Distinct drinks, styles, families and countries on each profile, plus standard drinks as a personal stat.

### After the core: the bar, the fridge and the tab

These milestones come after steps 1 to 7, since they all build on logging a drink. They share one idea: **every drink comes from somewhere (a fridge, a bar, a cooler or a store) and ends up with someone.** Each log records where the drink came from and who drank it, and the Tab, Drink Nights and recaps are worked out from those logs.

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

- Crowns (one holder at a time, e.g. Explorer, Peat Freak, Globetrotter) and badges.
- Recommendations ("you should try this"), wishlist and palate match.
- The group's own cocktail book.
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

- Accounts, profiles and (later) logged drinks are stored in the group's Firebase project. Only members can read them.
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

To redraw the app icons after changing `tools/make-icons.mjs`:

```bash
node tools/make-icons.mjs
```

## The drink list files

- [`js/catalog/styles.js`](js/catalog/styles.js): categories, families and styles. Style ids are unique across the whole tree.
- [`js/catalog/drinks.js`](js/catalog/drinks.js): joins the drink lists and holds the places (`ORIGINS`). The lists are one file per category: [`beer.js`](js/catalog/beer.js), [`whisky.js`](js/catalog/whisky.js), [`spirits.js`](js/catalog/spirits.js), [`wine.js`](js/catalog/wine.js), [`more.js`](js/catalog/more.js) (cider, mead, sake, seltzers) and [`na.js`](js/catalog/na.js). `brand` + `name` + `variant` make the title; `abv` is as sold in Canada, with `approx: true` when it varies.
- [`js/catalog/make.js`](js/catalog/make.js): helpers for writing the lists. `maker(brand, origin, town)` declares a maker once, then one short line per product. Ids come from the title (`Dillon's Rye Whisky` is `dillons-rye-whisky`) and are permanent once shipped: if a title changes, pass the old id as `id`.
- [`js/catalog/cocktails.js`](js/catalog/cocktails.js): default cocktail recipes, amounts in oz.

`npm test` checks every drink points at a real style, ids are unique tidy slugs, ABVs are sensible, Ontario comes first and every recipe is complete.

## Versioning

The version number is the `VERSION` constant in [`js/config.js`](js/config.js), shown at the bottom of your profile. It follows `major.minor.patch`:

- **Major** for a big change in how the app works.
- **Minor** for each new feature.
- **Patch** for fixes and smaller changes.

Update this README's **Current version** and the changelog in the same commit. When adding a new file under `js/`, also add it to `APP_FILES` in [`sw.js`](sw.js) so it's available offline (`npm test` checks this).

## Changelog

- **0.2.1** (2026-Oct-13): Roadmap: after the core steps, four milestones for the bar, the fridge and the tab. A: stock (households sharing a fridge and bar that everyone can see, reloads, bottle levels, killed bottles, coolers). B: the Tab (every drink counts as 1, person to person, paid back in drinks only). C: Drink Nights (Nightcap ends a night with no end time, group rounds, bring list, recap, morning-after recap). D: the bartender (what can I make, planning what to bring, bar pages, Bar Menu orders, LCBO run list). Cocktail recipes get ingredient ids. New Possible ideas list.
- **0.2.0** (2026-Oct-13): The drink list: about 1,000 drinks, Ontario first (about 260 Ontario entries), deepest for beer and whisky, with flavours as their own entries. Ontario makers show their town, and towns are searchable. Four new styles: International Pale Lager, India Pale Lager, Appassimento and Pinot Blanc. Browsing a category opens one style at a time, so long lists stay quick, and search says when there are more results than it shows. Cocktail recipes are still the 12-recipe sample.
- **0.1.3** (2026-Oct-13): Offline safety, from what Lunker League learned. The fonts no longer hold up the page (with no signal they could leave it blank), and they're saved when the app installs. Once a page opens from the saved copy, its other files load from saved copies straight away. Saved files are matched by their exact address, and app files are saved all or none. New start-up safety net: "Pour Decisions didn't start" with Reload and details, instead of a blank screen.
- **0.1.2** (2026-Oct-13): Roadmap: offline safety next, then catalogue moderation, a status light with System info, storage and free-plan meters, email invites and admin moderation, carried over from Lunker League.
- **0.1.1** (2026-Oct-13): Connected to the group's Firebase project (`pourdecisions-910bf`).
- **0.1.0** (2026-Oct-07): The foundation. Accounts with invite codes and a legal-age check, group owner and admins, profiles, Happy Hour and Last Call looks, oz or ml, works offline. The drink list: the full style tree (about 270 styles) with a sample of drinks in every category, search, and default cocktail recipes. New `firestore.rules`.

## Credits

Built by Matt Ridley.
