/* Helpers for writing the catalog files compactly, plus the title and search-text rules they share.
   Pure functions, no imports, so every catalog file and catalog.js can use them. */

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

// Apostrophes are dropped rather than split on, so "Dillon's" becomes "dillons".
export const slug = s => normalize(String(s).replace(/['’]/g, "")).replace(/ /g, "-");

/* One drink. The id comes from the title ("Crown Royal Peach" -> "crown-royal-peach").
   Ids are permanent once shipped (logs point at them): if a title changes later, pass the old one as `id`.
   extra: { variant, approx, town, id } */
export function d(brand, name, style, abv, origin, extra = {}) {
  const x = { brand, name, style, abv, ...(origin ? { origin } : {}), ...extra };
  if (!x.id) x.id = slug(drinkTitle(x));
  return x;
}

/* A maker's products: declare the brand, where it's from and its town once, then one short line per product.
   const m = maker("Bellwoods Brewery", "CA-ON", "Toronto", APPROX); m("Jelly King", "fruit-sour", 5.6) */
export const maker = (brand, origin, town = "", defaults = {}) => (name, style, abv, extra = {}) =>
  d(brand, name, style, abv, origin, { ...(town ? { town } : {}), ...defaults, ...extra });

/* The same product in several flavours, each its own entry: flavours(m, "Vodka Soda", "seltzer", 5, ["Lime", "Grapefruit"]). */
export const flavours = (make, name, style, abv, variants, extra = {}) => variants.map(v => make(name, style, abv, { ...extra, variant: v }));

export const APPROX = { approx: true };

/* Cocktail recipes. One ingredient is an amount in oz, or a quantity that isn't poured ("2 dashes").
   `ing` is an ingredient id from ingredients.js, or a list of ids when any of them will do ("rye or bourbon").
   extra: { optional: true, label } (label is shown instead of the ingredient names, e.g. "Rim of celery salt") */
export const oz = (n, ing, extra = {}) => ({ oz: n, ing: [].concat(ing), ...extra });
export const qty = (q, ing, extra = {}) => ({ qty: q, ing: [].concat(ing), ...extra });

/* One recipe. The id comes from the name ("Moscow Mule" -> "moscow-mule") and is permanent once shipped.
   extra: { note, id } */
export const cocktail = (name, style, glass, method, ingredients, garnish, steps, extra = {}) =>
  ({ id: slug(name), name, style, glass, method, ingredients, garnish, steps, ...extra });
