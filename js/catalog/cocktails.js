/* Built-in cocktail recipes: the default recipe for each named cocktail. Each family lives in its own file; this one
   joins them and adds each ingredient's display name.
   Amounts are in oz (shown as ml when someone picks ml); things that aren't poured use `qty` instead.
   Ingredients point at ids in ingredients.js, so the app knows which bottles count (any rye counts as "Rye").
   Group members will be able to add their own recipes and variations later. */
import { INGREDIENT_INDEX } from "./ingredients.js";
import { STIRRED } from "./recipes-stirred.js";
import { SOURS } from "./recipes-sours.js";
import { LONG } from "./recipes-long.js";
import { PARTY } from "./recipes-party.js";
import { SWEET } from "./recipes-sweet.js";

/* "Rye or Bourbon", plus "(optional)" when the recipe works without it. */
function withName(x) {
  const ings = x.ing.map(id => INGREDIENT_INDEX.get(id) || { name: id });
  const item = x.label || ings.map((g, k) => k && !g.proper ? g.name.charAt(0).toLowerCase() + g.name.slice(1) : g.name).join(" or ");
  return { ...x, item: x.optional ? `${item} (optional)` : item };
}

export const COCKTAILS = [...STIRRED, ...SOURS, ...LONG, ...PARTY, ...SWEET]
  .map(r => ({ ...r, ingredients: r.ingredients.map(withName) }));
