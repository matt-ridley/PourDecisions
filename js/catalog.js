/* Looking things up in the catalog: titles, searching and browsing by category.
   Pure functions (no screen or Firebase code), so they can be tested with node. */
import { CATEGORIES, STYLE_INDEX } from "./catalog/styles.js";
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

export const ITEMS = [...DRINKS.map(x => toItem(x, "drink")), ...COCKTAILS.map(x => toItem(x, "cocktail"))];
export const itemById = (kind, id) => ITEMS.find(i => i.kind === kind && i.id === id) || null;

const byTitle = (a, b) => a.title.localeCompare(b.title);

/* Every word typed must appear somewhere (title, brand, style, category, origin or, for cocktails, an ingredient).
   Titles that start with what was typed come first. */
export function search(query, { category = null, items = ITEMS } = {}) {
  const q = normalize(query), words = q.split(" ").filter(Boolean);
  const pool = category ? items.filter(i => i.category && i.category.id === category) : items;
  if (!words.length) return [...pool].sort(byTitle);
  const hits = pool.filter(i => words.every(w => i.haystack.includes(w)));
  const starts = i => normalize(i.title).startsWith(q) ? 0 : 1;
  return hits.sort((a, b) => starts(a) - starts(b) || byTitle(a, b));
}

/* A category's families and styles, each with the catalog items in it (empty styles included). */
export function browse(categoryId, items = ITEMS) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;
  return { ...cat, families: cat.families.map(f => ({ ...f, styles: f.styles.map(s => ({
    ...s, items: items.filter(i => i.style && i.style.id === s.id).sort(byTitle) })) })) };
}

export const countIn = (categoryId, items = ITEMS) => items.filter(i => i.category && i.category.id === categoryId).length;
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
export const drinksFor = (id, items = ITEMS) => {
  const g = ingredientById(id);
  return g ? items.filter(i => i.kind === "drink" && countsAs(i.data, g)).sort(byTitle) : [];
};
export const cocktailsUsing = (ids, items = ITEMS) => {
  const want = new Set([].concat(ids));
  return items.filter(i => i.kind === "cocktail" && i.data.ingredients.some(x => x.ing.some(id => want.has(id)))).sort(byTitle);
};

/* What a recipe still needs, given the ingredient ids on hand. Optional and pantry items never count as missing;
   an ingredient with choices ("rye or bourbon") is covered by any one of them. */
export function missingFor(recipe, have) {
  const on = have instanceof Set ? have : new Set(have);
  return recipe.ingredients.filter(x => !x.optional && !x.ing.every(id => (ingredientById(id) || {}).pantry) && !x.ing.some(id => on.has(id)));
}
