/* The Drinks tab: search the catalog, or drill down Category > Family > Style > drink, each page with a short
   description and breadcrumbs back up. Also a cocktail recipe and a recipe ingredient's page.
   A level with only one choice is skipped: Rosé goes straight to its drinks, Non-alcoholic straight to its styles. */
import { el, fill, icon, fmtDay } from "./ui.js";
import { CATEGORIES } from "./catalog/styles.js";
import { INGREDIENT_KINDS } from "./catalog/ingredients.js";
import { ABOUT_CATEGORY, ABOUT_FAMILY, ABOUT_STYLE } from "./catalog/about.js";
import { search, browse, countIn, styleCount, itemById, allItems, originName, styleOf, ingredientById, ingredientsOf, drinksFor, cocktailsUsing } from "./catalog.js";
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

/* A drink or cocktail in a list. On a style's own page the style isn't repeated on every row. */
function itemRow(i, { style = true } = {}) {
  const d = i.data, st = style ? i.style.name : "";
  const meta = i.kind === "cocktail"
    ? [st, d.method, d.glass].filter(Boolean).join(" · ")
    : [st, d.origin ? originName(d.origin) : "", abvText(d)].filter(Boolean).join(" · ");
  return el("li", {}, el("a", { class: "item-row", href: `#/${i.kind === "cocktail" ? "recipe" : "drink"}/${i.id}` },
    el("span", { class: "item-icon", text: i.category.icon }),
    el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}

const abvText = d => `${d.approx ? "~" : ""}${d.abv}%`;

/* ---------- Drilling down ---------- */
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const familyOf = (cat, id) => cat.families.find(f => f.id === id) || null;
const soloFamily = cat => cat.families.length === 1; // the category page lists its styles itself
const famHref = (cat, f) => f.styles.length === 1 ? `#/style/${f.styles[0].id}` : `#/cat/${cat.id}/${f.id}`;

/* Drinks › Whisky › Scotch › Islay Single Malt, each a link, then the current page (not a link). */
function crumbs(...parts) {
  const all = [["Drinks", "#/drinks"], ...parts];
  return el("nav", { class: "crumbs", "aria-label": "Where you are" }, el("ol", {}, ...all.map(([text, href], k) =>
    el("li", {}, k === all.length - 1 && !href ? el("span", { "aria-current": "page", text }) : el("a", { href, text })))));
}

/* The trail down to a style: category, then its family when that's a page of its own. */
function styleTrail(styleId) {
  const s = styleOf(styleId);
  if (!s) return [];
  const cat = CATEGORIES.find(c => c.id === s.category.id);
  const parts = [[cat.name, `#/cat/${cat.id}`]];
  if (!soloFamily(cat) && s.family.styles.length > 1) parts.push([s.family.name, `#/cat/${cat.id}/${s.family.id}`]);
  parts.push([s.style.name, `#/style/${styleId}`]);
  return parts;
}

const pageHead = (emoji, title, about) => el("section", { class: "level-head" },
  el("h2", { class: "page-title" }, emoji ? `${emoji} ${title}` : title),
  about ? el("p", { class: "muted", text: about }) : null);

/* A row that drills down one level: name, a count line, and a chevron. Empty ones are shown, but quieter. */
function levelRow(href, name, meta, empty = false) {
  return el("li", {}, el("a", { class: `item-row${empty ? " empty-row" : ""}`, href },
    el("span", { class: "grow" }, el("b", { text: name }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}

const styleRows = (styles, items) => el("ul", { class: "item-list card" }, ...styles.map(st => {
  const n = items.filter(i => i.style && i.style.id === st.id).length;
  return levelRow(`#/style/${st.id}`, st.name, n ? plural(n, "drink") : "None in the list yet", !n);
}));

/* #/cat/<cat> (its families) and #/cat/<cat>/<family> (its styles). */
export function renderCategory(main, id, famId) {
  const cat = browse(id);
  if (!cat) return fill(main, el("div", { class: "card" }, el("p", { text: "That category isn't in the list." })));
  const items = allItems().filter(i => i.category && i.category.id === id);
  if (famId) {
    const f = familyOf(cat, famId);
    if (!f) return fill(main, crumbs([cat.name, `#/cat/${id}`]), el("div", { class: "card" }, el("p", { text: "That isn't in the list." })));
    return fill(main,
      crumbs([cat.name, `#/cat/${id}`], [f.name]),
      pageHead(cat.icon, f.name, ABOUT_FAMILY[`${id}/${f.id}`]),
      styleRows(f.styles, items));
  }
  fill(main,
    crumbs([cat.name]),
    pageHead(cat.icon, cat.name, ABOUT_CATEGORY[id]),
    soloFamily(cat) ? styleRows(cat.families[0].styles, items)
      : el("ul", { class: "item-list card" }, ...cat.families.map(f => {
          const n = items.filter(i => i.family && i.family.id === f.id).length;
          const meta = [f.styles.length > 1 ? plural(f.styles.length, "style") : "", n ? plural(n, "drink") : "None in the list yet"].filter(Boolean).join(" · ");
          return levelRow(famHref(cat, f), f.name, meta, !n);
        })));
}

/* #/style/<id>: one style and everything in the list in it. */
export function renderStyle(main, id) {
  const s = styleOf(id);
  if (!s) return fill(main, crumbs(), el("div", { class: "card" }, el("p", { text: "That style isn't in the list." })));
  const items = allItems().filter(i => i.style && i.style.id === id).sort((a, b) => a.title.localeCompare(b.title));
  const trail = styleTrail(id);
  trail[trail.length - 1] = [s.style.name];
  fill(main,
    crumbs(...trail),
    pageHead(s.category.icon, s.style.name, ABOUT_STYLE[id]),
    items.length ? el("ul", { class: "item-list card" }, ...items.map(i => itemRow(i, { style: false })))
      : el("section", { class: "card stack center" },
          el("p", { class: "muted", text: "Nothing in the list in this style yet." }),
          s.category.id === "cocktail" ? null : el("a", { class: "btn block", href: "#/log", text: "Log one and add it" })));
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
    crumbs(...styleTrail(d.style), [i.title]),
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
    crumbs(...styleTrail(r.style), [r.name]),
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
