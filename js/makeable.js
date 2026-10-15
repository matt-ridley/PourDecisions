/* What can I make: cocktails sorted by what you have. Pure functions (no screen or Firebase code), so they can be
   tested with node. For now "what you have" is a checklist of recipe ingredients kept on this phone; once My Bar
   arrives it will come from the bottles in your bar and fridge instead.
   An ingredient covers the others whose bottles all count as it too: anyone with rye has whisky, and anyone with
   Crown Royal has rye, Canadian whisky and whisky. So ticking Rye makes a Whisky Sour. */
import { INGREDIENTS, ingredientById, countsAs, missingFor, allItems } from "./catalog.js";

const isBottle = g => !!(g.cats || g.families || g.styles || g.drinks);

/* For each ingredient, the ingredient ids it covers (itself included). A bottle ingredient covers another when every
   drink in the list that counts as it also counts as the other. Mixers, juices and the rest cover only themselves. */
export function coverMap(drinks = allItems().filter(i => i.kind === "drink").map(i => i.data), ingredients = INGREDIENTS) {
  const sets = new Map(ingredients.filter(isBottle).map(g => [g.id, new Set(drinks.filter(d => countsAs(d, g)).map(d => d.id))]));
  const map = new Map();
  for (const g of ingredients) {
    const mine = sets.get(g.id), covers = new Set([g.id]);
    if (mine && mine.size) for (const [id, other] of sets) if (id !== g.id && [...mine].every(d => other.has(d))) covers.add(id);
    map.set(g.id, covers);
  }
  return map;
}

/* Everything the ticked ingredients cover. */
export function expandHave(have, covers) {
  const out = new Set();
  for (const id of have) for (const c of covers.get(id) || [id]) out.add(c);
  return out;
}

/* Does the recipe use the ingredient? A line counts when the ingredient would fill it: "Rye" fills a Whisky Sour's
   "Whisky" line, so the Whisky Sour is a rye drink. */
export const usesIngredient = (recipe, id, covers) => {
  const c = covers.get(id) || new Set([id]);
  return recipe.ingredients.some(x => x.ing.some(i => c.has(i)));
};

/* Cocktail items sorted into Can make now, Missing 1 and Missing 2+, each row with the lines still needed.
   Missing 1 and 2+ are sorted by fewest missing, then by name. */
export function sortByHave(items, have) {
  const now = [], one = [], more = [];
  for (const item of items) {
    const missing = missingFor(item.data, have);
    const row = { item, missing };
    (missing.length === 0 ? now : missing.length === 1 ? one : more).push(row);
  }
  const byName = (a, b) => a.item.title.localeCompare(b.item.title);
  return { now: now.sort(byName), one: one.sort(byName), more: more.sort((a, b) => a.missing.length - b.missing.length || byName(a, b)) };
}

/* Best buys: the ingredients that would move the most Missing 1 cocktails to Can make now. Buying rye also fills
   "Whisky" lines, so it's credited for those too. Ties go to the more general ingredient (fewer others covered),
   then by name. */
export function bestBuys(one, covers, limit = 5) {
  const score = new Map();
  for (const g of INGREDIENTS) {
    if (g.pantry) continue;
    const c = covers.get(g.id) || new Set([g.id]);
    const unlocks = one.filter(r => r.missing[0].ing.some(i => c.has(i))).map(r => r.item);
    if (unlocks.length) score.set(g.id, unlocks);
  }
  return [...score].map(([id, unlocks]) => ({ ing: ingredientById(id), unlocks }))
    .sort((a, b) => b.unlocks.length - a.unlocks.length || covers.get(a.ing.id).size - covers.get(b.ing.id).size
      || a.ing.name.localeCompare(b.ing.name))
    .slice(0, limit);
}

/* The ingredients worth ticking: every recipe ingredient except kitchen basics, which are assumed. */
export const checklistIngredients = () => INGREDIENTS.filter(g => !g.pantry);
