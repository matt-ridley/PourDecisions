/* Cocktail variants: someone's own take on a recipe, with the bottles they picked and the amounts they used.
   Pure functions (no screen or Firebase code), so they can be tested with node.

   A variant is saved once and shared. Its id comes from what's in it, so making the same thing again (same bottles,
   same amounts) finds the variant already there instead of adding a copy. Logs point at it with variantId (kind stays
   "cocktail" and drinkId the original, so cocktail counts don't change), and it's rated like a drink (kind "variant").

   What makes a variant: a bottle picked, an amount changed, an ingredient removed or added, or a different glass or
   garnish. Picking one of a recipe's choices ("rye or bourbon") or leaving out an optional ingredient is still the
   recipe as written.

   A variant document, variants/{base}~{hash}:
     base             the original cocktail's id
     from             the variant it was remixed from (optional)
     name             optional, up to 40 characters
     by, at           who made it first, and when
     glass, garnish   only when changed (garnish "" = no garnish)
     ingredients      [{ slot, ing, oz | qty, drinkId?, optional? }]: slot is the recipe's row (none for an added
                      ingredient), ing the ingredient ids (just the one picked, for "rye or bourbon"), drinkId the bottle
   Once saved, only the name changes (an admin can also merge duplicates), so a rating always means the same drink. */
import { itemById, ingredientById, variantsOf, drinksFor, resolveId } from "./catalog.js";
import { ML_PER_OZ } from "./units.js";
import { recipeVolume, recipeAbv } from "./logs.js";

export const MAX_ROWS = 20;
export const MAX_NAME = 40;

// Amounts are compared in ml rounded to 5, the way jiggers are marked: ¼ oz and 5 ml steps both count as a change,
// but 1½ oz and 45 ml are the same pour.
const ml5 = oz => Math.round(oz * ML_PER_OZ / 5) * 5;
const cleanText = s => String(s == null ? "" : s).trim().replace(/\s+/g, " ");
const cleanQty = q => cleanText(q).toLowerCase();
const amountKey = r => r.oz != null ? `${ml5(r.oz)} ml` : cleanQty(r.qty);
export const cleanVariantName = s => cleanText(s).slice(0, MAX_NAME);

/* The rows the Make it screen starts from: the recipe as written, each row knowing which recipe row it came from. */
export const startRows = recipe => recipe.ingredients.map((x, slot) => ({
  slot, ing: [...x.ing], ...(x.oz != null ? { oz: x.oz } : { qty: x.qty }), ...(x.optional ? { optional: true } : {}) }));

/* Every row (recipe rows and added ones) scaled for a batch: oz amounts times n. Dashes and pinches stay as written. */
export const scaleRows = (rows, n) => rows.map(r => r.oz != null ? { ...r, oz: Math.round(r.oz * n * 100) / 100 } : r);

function cleanRow(r) {
  const out = {};
  if (r.slot != null) out.slot = r.slot;
  out.ing = [...new Set(r.ing || [])].filter(id => ingredientById(id));
  if (r.oz != null) out.oz = Math.round(r.oz * 100) / 100;
  else out.qty = cleanText(r.qty);
  if (r.drinkId) out.drinkId = r.drinkId;
  if (r.optional) out.optional = true;
  return out;
}

/* What's different from the recipe as written: recipe rows first, then added ingredients, then glass and garnish.
   [{ type, slot?, row?, minor? }], type one of:
     bottle (a bottle picked), more / less (an amount), qty (a count like "3 dashes"), removed, added,
     choice (one of the recipe's choices picked), glass, garnish.
   "minor" ones (a choice, or leaving out an optional ingredient) don't make a variant on their own. */
export function changes(recipe, v) {
  const out = [], rows = v.ingredients || [];
  recipe.ingredients.forEach((x, slot) => {
    const r = rows.find(r => r.slot === slot);
    if (!r) { out.push({ type: "removed", slot, minor: !!x.optional }); return; }
    if (!r.drinkId && r.ing.length < x.ing.length) out.push({ type: "choice", slot, row: r, minor: true });
    if (r.drinkId) out.push({ type: "bottle", slot, row: r });
    if (amountKey(r) !== amountKey(x)) {
      out.push({ type: x.oz != null && r.oz != null ? (r.oz > x.oz ? "more" : "less") : "qty", slot, row: r });
    }
  });
  for (const r of rows) if (r.slot == null) out.push({ type: "added", row: r });
  if ("glass" in v && cleanText(v.glass) !== recipe.glass) out.push({ type: "glass" });
  if ("garnish" in v && cleanText(v.garnish) !== (recipe.garnish || "")) out.push({ type: "garnish" });
  return out;
}

export const isVariant = (recipe, v) => changes(recipe, v).some(c => !c.minor);

/* What the variant is, as text, for its id. Order-proof (added ingredients are sorted) and leaves out the name, who
   made it and what it was remixed from: the same drink is the same variant. A row with a bottle is the bottle and
   amount, since the bottle already says which ingredient it was. */
export function fingerprint(v) {
  const row = r => [r.slot == null ? "+" : r.slot, r.drinkId ? `#${r.drinkId}` : r.ing.join("|"), amountKey(r)];
  const rows = v.ingredients || [];
  const base = rows.filter(r => r.slot != null).sort((a, b) => a.slot - b.slot).map(row);
  const added = rows.filter(r => r.slot == null).map(row).map(x => JSON.stringify(x)).sort();
  return JSON.stringify([v.base, base, added,
    "glass" in v ? cleanText(v.glass).toLowerCase() : null, "garnish" in v ? cleanText(v.garnish).toLowerCase() : null]);
}

/* cyrb53: a quick 53-bit string hash, plenty for one group's variants. */
function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/* The variant's document id: "whisky-sour~1x2y3z". The same contents always give the same id. */
export const variantId = v => `${v.base}~${hash(fingerprint(v))}`;

/* The variant to save from the Make it screen's rows, or null when it's the recipe as written (log the original).
   extra: { glass, garnish, name, from }. Returns { id, base, ingredients, glass?, garnish?, name?, from? }; the app
   adds by and at when saving it. */
export function buildVariant(recipe, rows, extra = {}) {
  const seen = new Set(), ingredients = [];
  for (const r of rows) {
    if (r.slot != null && (r.slot < 0 || r.slot >= recipe.ingredients.length || seen.has(r.slot))) continue;
    if (r.slot != null) seen.add(r.slot);
    const c = cleanRow(r);
    if (c.ing.length || c.drinkId) ingredients.push(c);
  }
  const v = { base: recipe.id, ingredients: ingredients.slice(0, MAX_ROWS) };
  if (extra.glass != null && cleanText(extra.glass) && cleanText(extra.glass) !== recipe.glass) v.glass = cleanText(extra.glass);
  if (extra.garnish != null && cleanText(extra.garnish) !== (recipe.garnish || "")) v.garnish = cleanText(extra.garnish);
  if (!isVariant(recipe, v)) return null;
  const name = cleanVariantName(extra.name);
  return { id: variantId(v), ...v, ...(name ? { name } : {}), ...(extra.from ? { from: extra.from } : {}) };
}

/* ---------- Showing a variant ---------- */

const lower = g => g.proper ? g.name : g.name.charAt(0).toLowerCase() + g.name.slice(1);

/* A row's name: the bottle's title when one was picked, the recipe's own wording when unchanged, otherwise the
   ingredient names ("Rye or bourbon"). */
export function rowName(recipe, r) {
  const d = r.drinkId && itemById("drink", r.drinkId);
  if (d) return d.title;
  const x = r.slot != null && recipe.ingredients[r.slot];
  if (x && r.ing.length === x.ing.length) return x.item;
  const gs = r.ing.map(id => ingredientById(id)).filter(Boolean);
  return gs.map((g, k) => k ? lower(g) : g.name).join(" or ") || "Something";
}

/* The variant as a full recipe, the same shape as a built-in one, so the recipe screens, recipeVolume and recipeAbv
   all work on it. */
export function variantRecipe(recipe, v) {
  return { ...recipe, glass: v.glass || recipe.glass, garnish: "garnish" in v ? v.garnish : recipe.garnish,
    ingredients: (v.ingredients || []).map(r => ({ ...r, item: rowName(recipe, r) })) };
}

/* A few words for one change: "Dillon's Rye Whisky", "more lemon juice", "no egg white", "+ Angostura bitters". */
function describe(recipe, v, c) {
  const x = c.slot != null ? recipe.ingredients[c.slot] : null;
  const name = x ? lowerItem(x.label ? x.label : x.ing.map(id => ingredientById(id)).filter(Boolean).map(lower).join(" or ")) : "";
  switch (c.type) {
    case "bottle": return rowName(recipe, c.row);
    case "choice": return c.row.ing.map(id => ingredientById(id)).filter(Boolean).map(lower).join(" or ");
    case "more": return `more ${name}`;
    case "less": return `less ${name}`;
    case "qty": return c.row.qty ? `${cleanQty(c.row.qty)} ${name}` : `${name} in oz`;
    case "removed": return `no ${name}`;
    case "added": return `+ ${rowName(recipe, c.row)}`;
    case "glass": return `in a ${v.glass.toLowerCase()} glass`;
    case "garnish": return v.garnish ? `${v.garnish.toLowerCase()} garnish` : "no garnish";
    default: return "";
  }
}
const lowerItem = s => s.charAt(0).toLowerCase() + s.slice(1);

/* What changed, in words, in recipe order: ["Dillon's Rye Whisky", "more fresh lemon juice"]. A picked choice ("rye
   or bourbon") is only listed when nothing else changed. */
export function changeWords(recipe, v) {
  const all = changes(recipe, v);
  const main = all.filter(c => c.type !== "choice");
  return (main.length ? main : all).map(c => describe(recipe, v, c)).filter(Boolean);
}

/* A name for a variant nobody named: "Whisky Sour · Dillon's Rye Whisky, more lemon juice". At most two changes are
   spelled out; the rest are counted. Picking a choice ("rye or bourbon") isn't named unless nothing else changed. */
export function autoName(recipe, v) {
  const parts = changeWords(recipe, v);
  if (!parts.length) return recipe.name;
  const more = parts.length > 2 ? `, +${parts.length - 2} more` : "";
  return `${recipe.name} · ${parts.slice(0, 2).join(", ")}${more}`;
}

/* What to call a variant: its name if it has one, otherwise the automatic one. */
export const variantTitle = (recipe, v) => v.name || autoName(recipe, v);

/* ---------- Who made it ---------- */

/* Who has made a variant, from the logs: [{ uid, count, last }], most makes first. Whoever made the drink counts
   (madeBy, when someone made it for someone else), and a merged duplicate's logs count for the variant kept. */
export function makersOf(logs, id) {
  const want = (itemById("variant", id) || { id }).id, by = new Map();
  for (const l of logs) {
    if (!l.variantId || (itemById("variant", l.variantId) || { id: l.variantId }).id !== want) continue;
    const uid = l.madeBy || l.uid, m = by.get(uid) || { uid, count: 0, last: 0 };
    m.count++; m.last = Math.max(m.last, l.at);
    by.set(uid, m);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || b.last - a.last);
}

const keptId = id => (itemById("variant", id) || { id }).id;

/* A cocktail's variants that someone has actually made (logged at least once, so an undone make doesn't count), most
   made first: [{ item, makes, makers, last }]. makers = how many people made it. Merged duplicates count as the kept one. */
export function madeVariants(baseId, logs) {
  const by = new Map();
  for (const l of logs) {
    const v = l.variantId && itemById("variant", l.variantId);
    if (!v || v.base !== baseId) continue;
    const id = v.id, m = by.get(id) || { makes: 0, who: new Set(), last: 0 };
    m.makes++; m.who.add(l.madeBy || l.uid); m.last = Math.max(m.last, l.at);
    by.set(id, m);
  }
  return variantsOf(baseId).filter(v => by.has(v.id))
    .map(v => { const m = by.get(v.id); return { item: v, makes: m.makes, makers: m.who.size, last: m.last }; })
    .sort((a, b) => b.makes - a.makes || b.last - a.last);
}

/* How many variants the group has made of a cocktail: the count on its catalogue row. */
export const variantCount = (baseId, logs) => madeVariants(baseId, logs).length;

/* What a variant was remixed from, nearest first (up to 5 back): [item]. */
export function lineage(id) {
  const out = [];
  let v = itemById("variant", id);
  for (let hops = 0; v && v.data.from && hops < 5; hops++) {
    v = itemById("variant", v.data.from);
    if (!v || out.includes(v)) break;
    out.push(v);
  }
  return out;
}

/* Variants remixed from this one (merged ones left out), oldest first. */
export const remixesOf = id => variantsOf((itemById("variant", id) || {}).base).filter(v => v.data.from && keptId(v.data.from) === keptId(id));

/* Make it again: your latest variants (made for yourself or someone else), one each, newest first: [{ item, log }]. */
export function recentVariants(logs, uid, n = 3) {
  const seen = new Set(), out = [];
  for (const l of [...logs].filter(l => l.variantId && (l.madeBy || l.uid) === uid).sort((a, b) => b.at - a.at)) {
    const item = itemById("variant", l.variantId);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id); out.push({ item, log: l });
    if (out.length >= n) break;
  }
  return out;
}

/* ---------- The Make it screen ---------- */

/* One tap of − or + on an amount: ¼ oz in oz, 5 ml in ml (stored in oz). Never below one step: remove the row instead. */
export function stepAmount(oz, dir, units) {
  if (units === "ml") {
    const ml = Math.max(5, Math.round(oz * ML_PER_OZ / 5) * 5 + dir * 5);
    return Math.round(ml / ML_PER_OZ * 100) / 100;
  }
  return Math.max(0.25, Math.round(oz * 4) / 4 + dir * 0.25);
}

/* A new row for an ingredient added to the recipe: dashes for bitters, a count for fruit, eggs and the pantry, else ½ oz.
   With a bottle (drinkId), it counts as the first ingredient the bottle is, if any. */
export function addedRow(ingId, drinkId = null) {
  const g = ingredientById(ingId);
  const amount = !g ? { oz: 0.5 } : g.kind === "bitters" ? { qty: "2 dashes" }
    : ["fresh", "dairy", "pantry"].includes(g.kind) ? { qty: "1" } : { oz: 0.5 };
  return { ing: g ? [g.id] : [], ...amount, ...(drinkId ? { drinkId } : {}) };
}

/* The bottles to offer for a row, in picking order: ones you've used in cocktails lately, then drinks you've logged
   lately, then the rest A to Z. Each comes with the ingredient it counts as (for "rye or bourbon").
   [{ item, ing }] */
export function bottleChoices(row, { logs = [], variants = [], uid = null } = {}) {
  const seen = new Map();
  for (const id of row.ing) for (const item of drinksFor(id)) if (!seen.has(item.id)) seen.set(item.id, { item, ing: id });
  const rank = new Map();
  const mine = logs.filter(l => l.uid === uid || l.madeBy === uid).sort((a, b) => b.at - a.at);
  let n = 0;
  for (const l of mine) {
    const v = l.variantId && variants.find(x => x.id === l.variantId);
    for (const r of (v && v.ingredients) || []) if (r.drinkId && !rank.has(r.drinkId)) rank.set(r.drinkId, n++);
  }
  for (const l of mine) if (l.kind === "drink" && !rank.has(l.drinkId)) rank.set(l.drinkId, 1000 + n++);
  const at = c => rank.has(c.item.id) ? rank.get(c.item.id) : Infinity;
  return [...seen.values()].sort((a, b) => at(a) - at(b) || a.item.title.localeCompare(b.item.title));
}

/* How many servings to show amounts for: the number picked, or else one per person drinking. */
export const servingsFor = (picked, drinkers) => picked || Math.max(1, drinkers.length);

/* The logs to save for one Make it: one serving for each person drinking, all at the same moment and place. Yours is
   just yours; for anyone else, you're the maker (madeBy). `variant` is the saved variant or null (the recipe as written).
   Returns log fields for cloud.saveLog. */
export function makeLogs({ recipe, variant, drinkers, me, at, placeId = null }) {
  const r = variant ? variantRecipe(recipe, variant) : recipe;
  const base = { kind: "cocktail", drinkId: recipe.id, title: variant ? variantTitle(recipe, variant) : recipe.name, style: recipe.style,
    size: "one", ml: recipeVolume(r), abv: recipeAbv(r), at, placeId,
    ...(variant ? { variantId: resolveId("variant", variant.id) } : {}) };
  return [...new Set(drinkers)].map(uid => ({ ...base, uid, ...(uid !== me ? { madeBy: me } : {}) }));
}

/* The document to save for a new variant: what buildVariant gave, without its id, plus who and when. */
export const variantDoc = (v, by, at) => { const { id, ...rest } = v; return { ...rest, by, at }; };
