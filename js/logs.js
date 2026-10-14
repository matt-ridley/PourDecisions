/* Logging a drink: sizes, flavour tags, standard drinks, recent drinks and places.
   Pure functions (no screen or Firebase code), so they can be tested with node.
   A log stores the drink (kind + drinkId, plus its title at the time), how much (ml) and how strong (abv), so standard
   drinks stay right even if the drink list changes later. */
import { INGREDIENT_INDEX } from "./catalog/ingredients.js";
import { resolveId, itemById } from "./catalog.js";
import { ML_PER_OZ, standardDrinks } from "./units.js";

/* ---------- Sizes ---------- */
// [key, label, ml]. A cocktail size has no ml: it's a number of servings of the recipe.
const BEER = [["taster", "Taster", 148], ["bottle", "Bottle", 341], ["can", "Can", 355], ["sleeve", "Sleeve", 414],
  ["tall", "Tall can", 473], ["pint", "Pint", 568]];
const CANS = [["bottle", "Bottle", 341], ["can", "Can", 355], ["tall", "Tall can", 473]];
const WINE = [["taste", "Taste", 59], ["glass", "Glass", 148], ["big", "Big glass", 266], ["half", "Half bottle", 375], ["bottle", "Bottle", 750]];
const FLUTE = [["taste", "Taste", 59], ["flute", "Flute", 148], ["half", "Half bottle", 375], ["bottle", "Bottle", 750]];
const SMALL = [["small", "Small pour", 59], ["glass", "Glass", 89], ["big", "Big glass", 148]];
const SHOTS = [["single", "Single", 30], ["shot", "Shot", 44], ["double", "Double", 59], ["big", "Big pour", 89]];
const SAKE = [["glass", "Glass", 59], ["carafe", "Carafe", 180], ["bottle", "Bottle", 300]];
const COCKTAIL = [["one", "One", null], ["double", "Double", null]];

const SET = { BEER, CANS, WINE, FLUTE, SMALL, SHOTS, SAKE, COCKTAIL };
const DEFAULT = { BEER: "can", CANS: "can", WINE: "glass", FLUTE: "flute", SMALL: "small", SHOTS: "shot", SAKE: "glass", COCKTAIL: "one" };

/* Which list of sizes fits a catalog item (from catalog.js: kind, category, family, style). */
export function sizeSet(item) {
  if (item.kind === "cocktail") return "COCKTAIL";
  const cat = item.category && item.category.id, fam = item.family && item.family.id, style = item.style && item.style.id;
  if (cat === "beer") return "BEER";
  if (cat === "whisky" || cat === "spirits") return "SHOTS";
  if (cat === "wine") return fam === "sparkling" ? "FLUTE" : fam === "fortified" || fam === "dessert" ? "SMALL" : "WINE";
  if (cat === "cider-more") return fam === "sake" ? "SAKE" : fam === "mead" ? "WINE" : style === "ice-cider" ? "SMALL" : "CANS";
  if (cat === "na") return style === "na-wine" ? "WINE" : style === "na-spirit" ? "SHOTS" : "CANS";
  return "CANS";
}

/* The sizes to offer: [{ key, label, ml }]. For a cocktail, ml is the recipe's volume times the servings. */
export function sizesFor(item) {
  const set = sizeSet(item), vol = item.kind === "cocktail" ? recipeVolume(item.data) : 0;
  return SET[set].map(([key, label, ml]) => ({ key, label, ml: ml == null ? vol * (key === "double" ? 2 : 1) : ml }));
}
export const defaultSize = item => DEFAULT[sizeSet(item)];

/* ---------- Cocktails: how much and how strong ---------- */
// Rough strength by ingredient kind, for standard drinks. Spirits 40%, liqueurs 25%, wine 13%, beer 5%.
const KIND_ABV = { spirit: 40, liqueur: 25, wine: 13, beer: 5 };
// A variant's row can name the bottle used: then its own strength counts.
const ingAbv = x => {
  const d = x.drinkId && itemById("drink", x.drinkId);
  if (d) return d.data.abv || 0;
  const g = INGREDIENT_INDEX.get(x.ing[0]) || {};
  return x.ing[0] === "overproof-rum" ? 63 : KIND_ABV[g.kind] || 0;
};

/* Poured volume in ml (things measured in dashes or pinches don't count). Optional items are left out. */
export const recipeVolume = r => Math.round(r.ingredients.filter(x => x.oz && !x.optional).reduce((t, x) => t + x.oz, 0) * ML_PER_OZ);

/* Estimated % alcohol of the finished drink, before ice melts into it. */
export function recipeAbv(r) {
  const parts = r.ingredients.filter(x => x.oz && !x.optional);
  const total = parts.reduce((t, x) => t + x.oz, 0);
  if (!total) return 0;
  return Math.round(parts.reduce((t, x) => t + x.oz * ingAbv(x), 0) / total * 10) / 10;
}

/* The alcohol % to save with a log. */
export const itemAbv = item => item.kind === "cocktail" ? recipeAbv(item.data) : (item.data.abv || 0);

export const logStd = log => standardDrinks(log.ml, log.abv);

/* ---------- Ratings ---------- */
/* 0.5 to 5 in halves, or null for no rating. */
export function cleanRating(v) {
  const n = Math.round(Number(v) * 2) / 2;
  return n >= 0.5 && n <= 5 ? n : null;
}

/* ---------- Flavour tags ---------- */
// One list: each tag says which categories it's offered for. Ids are permanent (logs store them).
const T = (id, label, cats) => ({ id, label, cats: cats.split(" ") });
export const TAGS = [
  T("crisp", "Crisp", "beer wine cider-more na"), T("hoppy", "Hoppy", "beer na"), T("juicy", "Juicy", "beer"),
  T("malty", "Malty", "beer"), T("roasty", "Roasty", "beer"), T("bitter", "Bitter", "beer cocktail"),
  T("sour", "Sour", "beer cocktail"), T("smoky", "Smoky", "whisky spirits beer"), T("peaty", "Peaty", "whisky"),
  T("sweet", "Sweet", "whisky spirits wine cider-more cocktail na"), T("dry", "Dry", "wine cider-more na"),
  T("fruity", "Fruity", "beer whisky spirits wine cider-more cocktail na"), T("spicy", "Spicy", "whisky spirits cocktail"),
  T("oaky", "Oaky", "whisky wine"), T("vanilla", "Vanilla", "whisky spirits"), T("caramel", "Caramel", "whisky spirits"),
  T("herbal", "Herbal", "spirits cocktail"), T("floral", "Floral", "spirits wine"), T("buttery", "Buttery", "wine"),
  T("tannic", "Tannic", "wine"), T("bold", "Bold", "wine"), T("bubbly", "Bubbly", "wine cider-more"),
  T("tart", "Tart", "cider-more"), T("funky", "Funky", "beer cider-more"), T("creamy", "Creamy", "cocktail beer"),
  T("refreshing", "Refreshing", "beer cider-more cocktail na"), T("strong", "Strong", "cocktail whisky spirits"),
  T("balanced", "Balanced", "cocktail"), T("smooth", "Smooth", "whisky spirits beer"), T("harsh", "Harsh", "whisky spirits"),
  T("light", "Light", "beer wine na"), T("heavy", "Heavy", "beer"), T("real-thing", "Like the real thing", "na"),
];
export const TAG_INDEX = new Map(TAGS.map(t => [t.id, t]));
export const MAX_TAGS = 5;

export function tagsFor(item) {
  const cat = item.kind === "cocktail" || item.kind === "variant" ? (item.data.style === "mocktail" ? "na" : "cocktail") : item.category && item.category.id;
  return TAGS.filter(t => t.cats.includes(cat));
}

/* ---------- Recent drinks and places ---------- */
const mine = (logs, uid) => logs.filter(l => l.uid === uid).sort((a, b) => b.at - a.at);

/* Your most recent logs, one per drink (a merged duplicate counts as the drink kept), newest first: the
   "Another one" list. */
export function recentDrinks(logs, uid, n = 6) {
  const seen = new Set(), out = [];
  for (const l of mine(logs, uid)) {
    const key = `${l.kind}:${resolveId(l.kind, l.drinkId)}`;
    if (seen.has(key)) continue;
    seen.add(key); out.push(l);
    if (out.length >= n) break;
  }
  return out;
}

/* How many times you've logged a drink, and your average rating of it. */
export function drinkHistory(logs, uid, kind, drinkId) {
  const want = resolveId(kind, drinkId);
  const list = logs.filter(l => l.uid === uid && l.kind === kind && resolveId(l.kind, l.drinkId) === want);
  const rated = list.filter(l => l.rating);
  return { count: list.length, avg: rated.length ? Math.round(rated.reduce((t, l) => t + l.rating, 0) / rated.length * 10) / 10 : null,
    last: list.reduce((t, l) => Math.max(t, l.at), 0) || null };
}

/* A place an admin merged into another ("Keg" into "The Keg") gives the one kept. */
export function resolvePlace(places, id) {
  let p = places.find(x => x.id === id);
  for (let hops = 0; p && p.mergedInto && hops < 5; hops++) p = places.find(x => x.id === p.mergedInto) || p;
  return p || null;
}

/* Places in picking order: the ones you log at most, then the group's favourites, then A to Z. Merged ones are left
   out, and their logs count for the place kept. */
export function placesByUse(places, logs, uid) {
  const yours = new Map(), all = new Map();
  for (const l of logs) if (l.placeId) {
    const id = (resolvePlace(places, l.placeId) || { id: l.placeId }).id;
    all.set(id, (all.get(id) || 0) + 1);
    if (l.uid === uid) yours.set(id, (yours.get(id) || 0) + 1);
  }
  return places.filter(p => !p.mergedInto).sort((a, b) => (yours.get(b.id) || 0) - (yours.get(a.id) || 0)
    || (all.get(b.id) || 0) - (all.get(a.id) || 0) || a.name.localeCompare(b.name));
}

/* Same night, same place: the place of your last log if it was within the last 6 hours. */
export const SAME_NIGHT_MS = 6 * 3600 * 1000;
export function lastPlace(logs, uid, now = Date.now()) {
  const last = mine(logs, uid).find(l => l.at <= now);
  return last && last.placeId && now - last.at < SAME_NIGHT_MS ? last.placeId : null;
}

export const cleanPlaceName = s => String(s || "").trim().replace(/\s+/g, " ").slice(0, 60);
/* An existing place with the same name (ignoring case and spaces), so "the keg" doesn't become a second "The Keg". */
export const findPlace = (places, name) => {
  const n = cleanPlaceName(name).toLowerCase();
  return places.find(p => !p.mergedInto && p.name.toLowerCase() === n) || null;
};
