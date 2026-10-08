/* Ounces or millilitres (picked per phone), and standard drinks.
   Drink sizes are stored in ml. Cocktail recipes are written in oz, the way bartenders measure them. */
const KEY = "pour-units";
export const ML_PER_OZ = 29.5735;
// A Canadian standard drink is 13.45 g of alcohol, which is 17.05 ml of pure alcohol.
export const STANDARD_DRINK_ML = 17.05;

export function getUnits() {
  try { return localStorage.getItem(KEY) === "ml" ? "ml" : "oz"; } catch { return "oz"; }
}
export function setUnits(u) {
  try { localStorage.setItem(KEY, u === "ml" ? "ml" : "oz"); } catch {}
}

export const ozToMl = oz => oz * ML_PER_OZ;
export const mlToOz = ml => ml / ML_PER_OZ;

/* 1.5 -> "1½", 0.75 -> "¾", 2 -> "2". Rounded to the nearest quarter. */
export function fmtOz(oz) {
  const q = Math.round(oz * 4), whole = Math.floor(q / 4), frac = ["", "¼", "½", "¾"][q % 4];
  return whole ? `${whole}${frac}` : frac || "0";
}

/* A recipe amount in oz, shown in the chosen units. ml is rounded to the nearest 5 (that's how jiggers are marked). */
export function fmtAmount(oz, units) {
  if (units === "ml") return `${Math.max(5, Math.round(ozToMl(oz) / 5) * 5)} ml`;
  return `${fmtOz(oz)} oz`;
}

/* A drink size in ml, shown in the chosen units: "355 ml" or "12 oz". */
export function fmtVolume(ml, units) {
  if (units === "ml") return `${Math.round(ml)} ml`;
  const oz = Math.round(mlToOz(ml) * 10) / 10;
  return `${Number.isInteger(oz) ? oz : oz.toFixed(1)} oz`;
}

/* How many standard drinks are in `ml` of something at `abv` percent. 355 ml at 5% -> 1.0 */
export function standardDrinks(ml, abv) {
  if (!(ml > 0) || !(abv >= 0)) return 0;
  return Math.round((ml * abv / 100 / STANDARD_DRINK_ML) * 10) / 10;
}
