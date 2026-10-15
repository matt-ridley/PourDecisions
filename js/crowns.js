/* Crowns: one holder at a time, for the most variety in one thing (most countries, most styles, most different IPAs...).
   Worked out by replaying everyone's drinks in time order, so it's also known when a crown changed hands. A crown only
   moves when someone strictly passes the holder: a tie keeps it with whoever got there first. Never about volume.
   Pure functions (no screen or Firebase code), so they can be tested with node. */
import { itemById } from "./catalog.js";
import { countsOf, scoreOf } from "./stats.js";

const isPeated = (c, item) => c.style === "islay" || /peat|smok/i.test(item.title);

/* Each crown: what it counts for a person (from their running tallies) and the least needed to hold it. */
export const CROWNS = [
  { id: "explorer", icon: "🧭", name: "Explorer", about: "the highest variety score", min: 1, value: t => t.score },
  { id: "globetrotter", icon: "🌍", name: "Globetrotter", about: "the most countries", min: 3, value: t => t.countries.size },
  { id: "style-hunter", icon: "🎨", name: "Style Hunter", about: "the most styles", min: 5, value: t => t.styles.size },
  { id: "peat-freak", icon: "🔥", name: "Peat Freak", about: "the most different Islay and peated whiskies", min: 2, value: t => t.peated.size },
  { id: "hop-head", icon: "🍺", name: "Hop Head", about: "the most different IPAs", min: 3, value: t => t.ipas.size },
  { id: "dram-master", icon: "🥃", name: "Dram Master", about: "the most different whiskies", min: 3, value: t => t.whiskies.size },
  { id: "sommelier", icon: "🍷", name: "Sommelier", about: "the most different wines", min: 3, value: t => t.wines.size },
  { id: "mixologist", icon: "🍹", name: "Mixologist", about: "the most different cocktails made, for anyone", min: 2, value: t => t.cocktailsMade.size },
  { id: "true-north", icon: "🍁", name: "True North", about: "the most different Canadian drinks", min: 5, value: t => t.canadian.size },
];
export const CROWN_INDEX = new Map(CROWNS.map(c => [c.id, c]));

const tally = () => ({ drinks: new Set(), styles: new Set(), families: new Set(), countries: new Set(), categories: new Set(),
  peated: new Set(), ipas: new Set(), whiskies: new Set(), wines: new Set(), cocktailsMade: new Set(), canadian: new Set(), score: 0 });

/* Replays everyone's drinks in time order. Returns who holds each crown now ({ crown -> { uid, value, at } }) and
   every change of hands, oldest first: [{ type: "crown", crown, uid, from (the previous holder, or null), at, value }]. */
export function crownHistory(logs) {
  const people = new Map(), holders = new Map(), changes = [];
  const t = uid => { if (!people.has(uid)) people.set(uid, tally()); return people.get(uid); };
  for (const l of [...logs].sort((a, b) => a.at - b.at)) {
    const c = countsOf(l), item = c && itemById(l.kind, l.drinkId);
    if (!c) continue;
    // Who changed: the drinker, and for a cocktail made for someone, the maker too.
    const touched = new Set([l.uid]);
    const me = t(l.uid);
    me.drinks.add(c.drink); me.styles.add(c.style); me.families.add(c.family); me.categories.add(c.category);
    if (c.country) me.countries.add(c.country);
    if (c.category === "whisky") { me.whiskies.add(c.drink); if (isPeated(c, item)) me.peated.add(c.drink); }
    if (c.category === "wine") me.wines.add(c.drink);
    if (c.family === "beer/pale-ipa") me.ipas.add(c.drink);
    if (c.country === "CA") me.canadian.add(c.drink);
    me.score = scoreOf(me);
    if (l.kind === "cocktail") { const maker = l.madeBy || l.uid; t(maker).cocktailsMade.add(c.drink); touched.add(maker); }
    for (const uid of touched) {
      for (const crown of CROWNS) {
        const value = crown.value(t(uid)), held = holders.get(crown.id);
        if (value < crown.min || (held && (held.uid === uid || value <= crown.value(t(held.uid))))) continue;
        holders.set(crown.id, { uid, value, at: l.at });
        changes.push({ type: "crown", crown: crown.id, uid, from: held ? held.uid : null, at: l.at, value });
      }
    }
  }
  // The value now (holders keep growing after they take a crown).
  for (const [id, h] of holders) h.value = CROWN_INDEX.get(id).value(t(h.uid));
  return { holders, changes };
}

/* The crowns someone holds now: [crown]. */
export const crownsOf = (holders, uid) => CROWNS.filter(c => (holders.get(c.id) || {}).uid === uid);
