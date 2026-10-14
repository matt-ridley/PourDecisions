/* Looking things up in the catalog: titles, searching and browsing by category.
   Pure functions (no screen or Firebase code), so they can be tested with node. */
import { CATEGORIES, STYLE_INDEX } from "./catalog/styles.js";
import { DRINKS, ORIGINS } from "./catalog/drinks.js";
import { COCKTAILS } from "./catalog/cocktails.js";

/* "Jägermeister" -> "jagermeister": lower case, no accents, punctuation as spaces. */
export function normalize(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim();
}

/* "Crown Royal" + "" + "Peach" -> "Crown Royal Peach". A name that already starts with the brand isn't doubled. */
export function drinkTitle(d) {
  const base = !d.name ? d.brand : normalize(d.name).startsWith(normalize(d.brand)) ? d.name : `${d.brand} ${d.name}`;
  return d.variant ? `${base} ${d.variant}` : base;
}

export const styleOf = id => STYLE_INDEX.get(id) || null;
export const originName = code => ORIGINS[code] || "";

/* Every catalog item, drinks and cocktail recipes alike, in one shape for lists and search. */
function toItem(x, kind) {
  const s = styleOf(x.style);
  const title = kind === "cocktail" ? x.name : drinkTitle(x);
  return { kind, id: x.id, title, data: x, style: s && s.style, family: s && s.family, category: s && s.category,
    haystack: normalize([title, x.brand, x.variant, s && s.style.name, s && s.family.name, s && s.category.name, originName(x.origin),
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
