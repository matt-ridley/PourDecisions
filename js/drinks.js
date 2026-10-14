/* The Drinks tab: search the catalog, browse a category's families and styles, and open a drink, a cocktail recipe
   or a recipe ingredient. */
import { el, fill, icon, fmtDay } from "./ui.js";
import { CATEGORIES } from "./catalog/styles.js";
import { INGREDIENT_KINDS } from "./catalog/ingredients.js";
import { search, browse, countIn, styleCount, itemById, originName, styleOf, ingredientById, ingredientsOf, drinksFor, cocktailsUsing } from "./catalog.js";
import { getUnits, setUnits, fmtAmount } from "./units.js";
import { store, uid } from "./cloud.js";
import { drinkHistory } from "./logs.js";

// The search box keeps what was typed while moving between screens (this session only).
let query = "";
const MAX_RESULTS = 60;

/* #/drinks: search box and category tiles, or results while typing. */
export function renderDrinks(main) {
  const box = el("input", { type: "search", class: "search-input", placeholder: "Search beer, whisky, cocktails…", value: query,
    "aria-label": "Search the drink list", autocomplete: "off", autocorrect: "off", spellcheck: "false" });
  const results = el("div", { class: "stack" });
  const draw = () => {
    query = box.value;
    if (!query.trim()) return fill(results, categoryGrid());
    const hits = search(query);
    fill(results, hits.length
      ? el("ul", { class: "item-list card" }, ...hits.slice(0, MAX_RESULTS).map(itemRow))
      : el("p", { class: "muted center", text: "Nothing in the list matches that yet. Soon you'll be able to add it." }),
      hits.length > MAX_RESULTS ? el("p", { class: "hint center", text: `Showing ${MAX_RESULTS} of ${hits.length.toLocaleString()}. Type more to narrow it down.` }) : null);
  };
  box.addEventListener("input", draw);
  draw();
  fill(main,
    el("h2", { class: "page-title", text: "Drinks" }),
    el("label", { class: "search" }, el("span", { html: icon.search }), box),
    results);
}

function categoryGrid() {
  return el("div", { class: "cat-grid" }, ...CATEGORIES.map(c => el("a", { class: "cat-tile", href: `#/cat/${c.id}` },
    el("span", { class: "cat-icon", text: c.icon }),
    el("b", { text: c.name }),
    el("span", { class: "muted small", text: `${styleCount(c.id)} styles · ${countIn(c.id)} drinks` }))));
}

/* A drink or cocktail in a list. */
function itemRow(i) {
  const d = i.data;
  const meta = i.kind === "cocktail"
    ? [i.style.name, d.method].join(" · ")
    : [i.style.name, d.origin ? originName(d.origin) : "", abvText(d)].filter(Boolean).join(" · ");
  return el("li", {}, el("a", { class: "item-row", href: `#/${i.kind === "cocktail" ? "recipe" : "drink"}/${i.id}` },
    el("span", { class: "item-icon", text: i.category.icon }),
    el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}

const abvText = d => `${d.approx ? "~" : ""}${d.abv}%`;

/* #/cat/<id>: every family and style in the category, with the drinks in each. */
export function renderCategory(main, id) {
  const cat = browse(id);
  if (!cat) return fill(main, el("div", { class: "card" }, el("p", { text: "That category isn't in the list." })));
  fill(main,
    el("h2", { class: "page-title" }, `${cat.icon} ${cat.name}`),
    el("p", { class: "muted", text: `${styleCount(id)} styles. Tap a style to see what's in it.` }),
    ...cat.families.map(f => {
      const n = f.styles.reduce((t, s) => t + s.items.length, 0);
      return el("details", { class: "family card", open: n > 0 ? "" : null },
        el("summary", {}, el("b", { text: f.name }), el("span", { class: "muted small", text: `${f.styles.length} styles${n ? ` · ${n} drinks` : ""}` })),
        el("ul", { class: "style-list" }, ...f.styles.map(styleRow)));
    }));
}

/* A style in a category: tap to open its drinks. They're only drawn when opened, so a long list stays quick. */
function styleRow(s) {
  const name = el("span", { class: "style-name" }, el("span", { text: s.name }), s.items.length ? el("span", { class: "chip", text: String(s.items.length) }) : null);
  if (!s.items.length) return el("li", {}, name);
  const box = el("details", { class: "style" }, el("summary", {}, name));
  box.addEventListener("toggle", () => {
    if (box.open && box.children.length === 1) box.append(el("ul", { class: "item-list" }, ...s.items.map(itemRow)));
  });
  return el("li", {}, box);
}

/* #/drink/<id> */
export function renderDrink(main, id) {
  const i = itemById("drink", id);
  if (!i) return fill(main, el("div", { class: "card" }, el("p", { text: "That drink isn't in the list." })));
  const d = i.data;
  const facts = [
    ["Brand", d.brand],
    d.variant ? ["Flavour", d.variant] : null,
    ["Style", `${i.style.name} (${i.family.name})`],
    ["Category", i.category.name],
    d.origin ? ["From", [d.town, originName(d.origin)].filter(Boolean).join(", ")] : null,
    ["Alcohol", `${abvText(d)}${d.approx ? " (approx., varies by batch or market)" : ""}`],
  ].filter(Boolean);
  fill(main,
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: i.category.icon }),
      el("h2", { text: i.title }),
      el("p", { class: "muted", text: i.style.name })),
    el("dl", { class: "facts card" }, ...facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])),
    logThis(i),
    useItIn(d));
}

/* The cocktails a drink can go in, from the recipe ingredients it counts as. Long lists start folded. */
function useItIn(d) {
  const ings = ingredientsOf(d);
  const list = ings.length ? cocktailsUsing(ings) : [];
  if (!list.length) return null;
  const names = ings.map(id => ingredientById(id).name).join(", ");
  return el("details", { class: "card fold", open: list.length <= 8 ? "" : null },
    el("summary", {}, el("b", { text: `Use it in ${list.length} cocktail${list.length === 1 ? "" : "s"}` })),
    el("p", { class: "muted small", text: `Counts as: ${names}.` }),
    el("ul", { class: "item-list" }, ...list.map(itemRow)));
}

/* #/recipe/<id>: the default recipe, in oz or ml. */
export function renderRecipe(main, id) {
  const i = itemById("cocktail", id);
  if (!i) return fill(main, el("div", { class: "card" }, el("p", { text: "That cocktail isn't in the list." })));
  const r = i.data, units = getUnits();
  const unitsSeg = el("div", { class: "seg small", role: "group", "aria-label": "Units" }, ...[["oz", "oz"], ["ml", "ml"]].map(([k, label]) =>
    el("button", { type: "button", "aria-pressed": String(units === k), text: label, onclick: () => { setUnits(k); renderRecipe(main, id); } })));
  fill(main,
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: "🍹" }),
      el("h2", { text: r.name }),
      el("p", { class: "muted", text: `${i.style.name} · ${r.method} · ${r.glass}` }),
      r.note ? el("p", { class: "small", text: r.note }) : null),
    el("section", { class: "card stack" },
      el("div", { class: "row spread" }, el("h3", { text: "Ingredients" }), unitsSeg),
      el("ul", { class: "ingredients" }, ...r.ingredients.map(x => el("li", {},
        el("b", { text: x.oz ? fmtAmount(x.oz, units) : x.qty }), ingredientLinks(x)))),
      el("p", {}, el("b", { text: "Garnish: " }), r.garnish)),
    el("section", { class: "card stack" },
      el("h3", { text: "Method" }),
      el("ol", { class: "steps" }, ...r.steps.map(s => el("li", { text: s })))),
    logThis(i),
    el("p", { class: "hint center", text: "This is the default recipe. Your group's own recipes and twists are coming later." }));
}

/* An ingredient line's name, linked to its ingredient page. With choices, each choice gets its own link. */
function ingredientLinks(x) {
  const link = (id, text) => el("a", { href: `#/ing/${id}`, text });
  if (x.label || x.ing.length === 1) return el("span", {}, link(x.ing[0], x.item));
  const parts = x.ing.map((id, k) => {
    const g = ingredientById(id);
    return link(id, k && !g.proper ? g.name.charAt(0).toLowerCase() + g.name.slice(1) : g.name);
  });
  return el("span", {}, ...parts.flatMap((p, k) => k ? [" or ", p] : [p]), x.optional ? " (optional)" : "");
}

const KIND_ICONS = { spirit: "🥃", liqueur: "🍶", wine: "🍷", beer: "🍺", mixer: "🥤", juice: "🍋", syrup: "🍯", bitters: "💧",
  fresh: "🌿", dairy: "🥛", pantry: "🧂" };

/* What counts as an ingredient, in words: "Canadian Rye, American Rye or Canadian Blended". */
function countsAsText(g) {
  const name = id => (styleOf(id) || { style: { name: id } }).style.name;
  const fam = id => CATEGORIES.flatMap(c => c.families).find(f => f.id === id);
  const parts = [
    ...(g.cats || []).map(id => `any ${CATEGORIES.find(c => c.id === id).name.toLowerCase()}`),
    ...(g.families || []).map(id => `any ${fam(id).name} style`),
    ...(g.styles || []).map(name),
  ];
  if (!parts.length) return "";
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}` : parts[0];
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}${g.not ? ` (not ${g.not.map(name).join(" or ")})` : ""}.`;
}

/* #/ing/<id>: a recipe ingredient. Which bottles in the list count as it, and the cocktails that use it. */
export function renderIngredient(main, id) {
  const g = ingredientById(id);
  if (!g) return fill(main, el("div", { class: "card" }, el("p", { text: "That ingredient isn't in the list." })));
  const bottles = drinksFor(id), cocktails = cocktailsUsing(id), rule = countsAsText(g);
  const isBottle = g.cats || g.families || g.styles || g.drinks;
  fill(main,
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: KIND_ICONS[g.kind] || "🍹" }),
      el("h2", { text: g.name }),
      el("p", { class: "muted", text: INGREDIENT_KINDS[g.kind] })),
    isBottle
      ? el("section", { class: "card stack" },
          el("h3", { text: `${bottles.length} drink${bottles.length === 1 ? "" : "s"} in the list count${bottles.length === 1 ? "s" : ""}` }),
          rule ? el("p", { class: "muted small", text: rule }) : null,
          !bottles.length ? null : bottles.length <= 12 ? el("ul", { class: "item-list" }, ...bottles.map(itemRow))
            : el("details", { class: "fold" }, el("summary", {}, el("b", { text: `Show all ${bottles.length}` })),
                el("ul", { class: "item-list" }, ...bottles.map(itemRow))))
      : el("p", { class: "card muted", text: g.pantry
          ? "A kitchen basic: \"what can I make\" will assume you have it."
          : "Not a drink in the list. Once My Bar arrives, you'll be able to keep it in your bar." }),
    el("section", { class: "card stack" },
      el("h3", { text: `Used in ${cocktails.length} cocktail${cocktails.length === 1 ? "" : "s"}` }),
      el("ul", { class: "item-list" }, ...cocktails.map(itemRow))));
}

/* "Log this" plus how often you've had it. */
function logThis(i) {
  const h = drinkHistory(store.logs, uid(), i.kind, i.id);
  return el("section", { class: "card stack" },
    h.count ? el("p", { class: "muted", text: [`You've had it ${h.count === 1 ? "once" : `${h.count} times`}`,
      h.avg ? `your average ★ ${h.avg}` : "", `last ${fmtDay(h.last)}`].filter(Boolean).join(" · ") }) : null,
    el("a", { class: "btn primary block", href: `#/log/${i.kind}/${i.id}`, text: h.count ? "Log another" : "Log this" }));
}
