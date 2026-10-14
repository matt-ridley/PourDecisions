/* The Drinks tab: search the catalog, browse a category's families and styles, and open a drink or a cocktail recipe. */
import { el, fill, icon } from "./ui.js";
import { CATEGORIES } from "./catalog/styles.js";
import { search, browse, countIn, styleCount, itemById, originName } from "./catalog.js";
import { getUnits, setUnits, fmtAmount } from "./units.js";

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
    el("p", { class: "hint center", text: "Logging, ratings and reviews are coming next." }));
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
        el("b", { text: x.oz ? fmtAmount(x.oz, units) : x.qty }), el("span", { text: x.item })))),
      el("p", {}, el("b", { text: "Garnish: " }), r.garnish)),
    el("section", { class: "card stack" },
      el("h3", { text: "Method" }),
      el("ol", { class: "steps" }, ...r.steps.map(s => el("li", { text: s })))),
    el("p", { class: "hint center", text: "This is the default recipe. Your group's own recipes and twists are coming later." }));
}
