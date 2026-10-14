/* Looking things up in the catalog: titles, searching and browsing by category.
   Pure functions (no screen or Firebase code), so they can be tested with node. */
import { CATEGORIES, STYLE_INDEX, applyStyleOverlay } from "./catalog/styles.js";
import { ABOUT_STYLE } from "./catalog/about.js";
import { DRINKS, ORIGINS } from "./catalog/drinks.js";
import { COCKTAILS } from "./catalog/cocktails.js";
import { INGREDIENTS, INGREDIENT_INDEX } from "./catalog/ingredients.js";
import { normalize, drinkTitle } from "./catalog/make.js";

// The title and search-text rules live with the catalog helpers, so the catalog files can use them too.
export { normalize, drinkTitle };

export { INGREDIENTS };
export const styleOf = id => STYLE_INDEX.get(id) || null;
export const originName = code => ORIGINS[code] || "";

/* Every catalog item, drinks and cocktail recipes alike, in one shape for lists and search. */
function toItem(x, kind) {
  const s = styleOf(x.style);
  const title = kind === "cocktail" ? x.name : drinkTitle(x);
  return { kind, id: x.id, title, data: x, style: s && s.style, family: s && s.family, category: s && s.category,
    haystack: normalize([title, x.brand, x.variant, s && s.style.name, s && s.family.name, s && s.category.name, originName(x.origin), x.town,
      kind === "cocktail" ? x.ingredients.map(i => i.item).join(" ") : ""].join(" ")) };
}

/* The built-in list as shipped, before any admin corrections. */
export const ITEMS = [...DRINKS.map(x => toItem(x, "drink")), ...COCKTAILS.map(x => toItem(x, "cocktail"))];
const BUILT_IN = new Map(DRINKS.map(d => [d.id, d]));
const COCKTAIL_IDS = new Set(COCKTAILS.map(c => c.id));
export const builtInDrink = id => BUILT_IN.get(id) || null;

/* ---- The live list: built-in drinks with admins' corrections laid over them, plus drinks members added ----
   Set by cloud.js whenever Firestore changes:
   - fixes:   corrections to built-in drinks ({ id, ...changed fields, mergedInto? }), so a wrong ABV can be fixed
              without a new app version
   - members: drinks members added (Firestore ids never look like built-in slugs), with admin fields checked, ing,
              mergedInto
   - styles:  admins' new or renamed styles (see applyStyleOverlay)
   A merged drink (mergedInto) is hidden from search, browse and counts, and looking it up gives the drink it was
   merged into, so logs of the duplicate show and count as the kept one. Nobody's logs are rewritten. */
export const FIX_FIELDS = ["brand", "name", "variant", "style", "abv", "approx", "origin", "town", "ing"];
let fixes = new Map(), memberDocs = [], variantDocs = [];
let allList = ITEMS, visible = ITEMS, index = new Map(), variantList = [];

function rebuild() {
  const built = DRINKS.map(d => {
    const f = fixes.get(d.id);
    if (!f) return toItem(d, "drink");
    const x = { ...d };
    for (const k of FIX_FIELDS) if (k in f) x[k] = f[k];
    if (!styleOf(x.style)) x.style = d.style; // a fix pointing at a style that's gone
    return { ...toItem(x, "drink"), fixed: true, ...(f.mergedInto ? { mergedInto: f.mergedInto } : {}) };
  });
  const mine = memberDocs.filter(d => styleOf(d.style)).map(d => ({ ...toItem(d, "drink"), member: true, ...(d.mergedInto ? { mergedInto: d.mergedInto } : {}) }));
  allList = [...built, ...COCKTAILS.map(x => toItem(x, "cocktail")), ...mine];
  visible = allList.filter(i => !i.mergedInto);
  // Members' cocktail variants (see variants.js) can be looked up and merged like drinks, but they live under their
  // cocktail: they're kept out of search, browsing and counts. Their titles come from variants.js.
  variantList = variantDocs.filter(v => COCKTAIL_IDS.has(v.base))
    .map(v => ({ kind: "variant", id: v.id, base: v.base, data: v, ...(v.mergedInto ? { mergedInto: v.mergedInto } : {}) }));
  index = new Map([...allList, ...variantList].map(i => [`${i.kind}:${i.id}`, i]));
}
rebuild();

export function setFixes(list) { fixes = new Map(list.map(f => [f.id, f])); rebuild(); }
export function setMemberDrinks(list) { memberDocs = list; rebuild(); }
export function setStyles(list) { applyStyleOverlay(list); rebuild(); }
export function setVariants(list) { variantDocs = list; rebuild(); }

/* The variants a member made first, merged duplicates left out. */
export const variantsBy = uid => variantList.filter(v => v.data.by === uid && !v.mergedInto);

/* A cocktail's variants, merged duplicates left out, oldest first. */
export const variantsOf = baseId => variantList.filter(v => v.base === baseId && !v.mergedInto)
  .sort((a, b) => (a.data.at || 0) - (b.data.at || 0));

/* Everything people can find: merged duplicates left out. */
export const allItems = () => visible;
/* Everything, merged duplicates included (for admins' screens). */
export const everyItem = () => allList;
export const memberDrinks = () => allList.filter(i => i.member);
export const fixOf = id => fixes.get(id) || null;

/* The item itself, even if it was merged. */
export const rawItem = (kind, id) => index.get(`${kind}:${id}`) || null;
/* What a log or link should show: a merged drink gives the one it was merged into (following up to 5 merges). */
export function itemById(kind, id) {
  let i = rawItem(kind, id);
  for (let hops = 0; i && i.mergedInto && hops < 5; hops++) {
    const next = rawItem(kind, i.mergedInto);
    if (!next) break;
    i = next;
  }
  return i;
}
/* The id a log's drink counts as, after merges. */
export const resolveId = (kind, id) => (itemById(kind, id) || { id }).id;

/* A style's description: an admin's version, or the built-in one. */
export const aboutStyle = id => { const s = styleOf(id); return (s && s.style.about) || ABOUT_STYLE[id] || ""; };

const byTitle = (a, b) => a.title.localeCompare(b.title);

/* Every word typed must appear somewhere (title, brand, style, category, origin or, for cocktails, an ingredient).
   Titles that start with what was typed come first. */
export function search(query, { category = null, items = visible } = {}) {
  const q = normalize(query), words = q.split(" ").filter(Boolean);
  const pool = category ? items.filter(i => i.category && i.category.id === category) : items;
  if (!words.length) return [...pool].sort(byTitle);
  const hits = pool.filter(i => words.every(w => i.haystack.includes(w)));
  const starts = i => normalize(i.title).startsWith(q) ? 0 : 1;
  return hits.sort((a, b) => starts(a) - starts(b) || byTitle(a, b));
}

/* A category's families and styles, each with the catalog items in it (empty styles included). */
export function browse(categoryId, items = visible) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  return { ...cat, families: cat.families.map(f => ({ ...f, styles: f.styles.map(s => ({
    ...s, items: items.filter(i => i.style && i.style.id === s.id).sort(byTitle) })) })) };
}

export const countIn = (categoryId, items = visible) => items.filter(i => i.category && i.category.id === categoryId).length;
export const styleCount = categoryId => (CATEGORIES.find(c => c.id === categoryId) || { families: [] })
  .families.reduce((n, f) => n + f.styles.length, 0);

/* ---- Ingredients: which bottles count as which recipe ingredient ---- */

export const ingredientById = id => INGREDIENT_INDEX.get(id) || null;

/* Does this drink count as the ingredient? Any rye counts as "Rye"; a member's drink can also name its ingredients (`ing`). */
export function countsAs(drink, g) {
  if ((drink.ing || []).includes(g.id)) return true;
  const s = styleOf(drink.style);
  if (!s || (g.not || []).includes(s.style.id)) return (g.drinks || []).includes(drink.id);
  return (g.drinks || []).includes(drink.id) || (g.styles || []).includes(s.style.id)
    || (g.families || []).includes(s.family.id) || (g.cats || []).includes(s.category.id);
}

/* The ingredient ids a drink counts as, e.g. Crown Royal Deluxe -> whisky, rye, canadian-whisky, crown-royal. */
export const ingredientsOf = drink => INGREDIENTS.filter(g => countsAs(drink, g)).map(g => g.id);

/* Catalog drinks that count as an ingredient, and the cocktails that use it (as any of its choices). */
export const drinksFor = (id, items = visible) => {
  const g = ingredientById(id);
  return g ? items.filter(i => i.kind === "drink" && countsAs(i.data, g)).sort(byTitle) : [];
};
export const cocktailsUsing = (ids, items = visible) => {
  const want = new Set([].concat(ids));
  return items.filter(i => i.kind === "cocktail" && i.data.ingredients.some(x => x.ing.some(id => want.has(id)))).sort(byTitle);
};

/* What a recipe still needs, given the ingredient ids on hand. Optional and pantry items never count as missing;
   an ingredient with choices ("rye or bourbon") is covered by any one of them. */
export function missingFor(recipe, have) {
  const on = have instanceof Set ? have : new Set(have);
  return recipe.ingredients.filter(x => !x.optional && !x.ing.every(id => (ingredientById(id) || {}).pantry) && !x.ing.some(id => on.has(id)));
}
