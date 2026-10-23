/* The Drinks tab: a landing page (What can I make, Top rated, the Catalogue), the Catalogue (search, filters and
   Browse), and the drill down Category > Family > Style > drink, each page with a short
   description and breadcrumbs back up. Also a cocktail recipe and a recipe ingredient's page.
   A level with only one choice is skipped: Rosé goes straight to its drinks, Non-alcoholic straight to its styles. */
import { el, fill, icon, fmtDay, fmtAgo, avatar, openSheet, closeSheet, toast, linkList, field } from "./ui.js";
import { CATEGORIES } from "./catalog/styles.js";
import { INGREDIENT_KINDS } from "./catalog/ingredients.js";
import { ABOUT_CATEGORY, ABOUT_FAMILY } from "./catalog/about.js";
import { adminDrinkTools } from "./moderation.js";
import { search, filterItems, browse, countIn, styleCount, itemById, allItems, aboutStyle, originName, styleOf, ingredientById, ingredientsOf, drinksFor, cocktailsUsing, missingFor, resolveId } from "./catalog.js";
import { getUnits, setUnits, fmtAmount, fmtVolume, standardDrinks } from "./units.js";
import { store, uid, isAdmin, memberName, renameVariant, loadThumb, loadBottlePhoto, updateMe } from "./cloud.js";
import { drinkHistory, recipeVolume, recipeAbv } from "./logs.js";
import { madeVariants, variantCount, variantTitle, variantRecipe, changes, changeWords, makersOf, lineage, remixesOf, MAX_NAME,
  rankVariants, asItem, compareRows } from "./variants.js";
import { ratingsCard, groupRatings, starText } from "./ratepage.js";
import { haveSet } from "./makeablepage.js";
import { householdOf, bottlePhotoOf } from "./stock.js";
import { pickWhere } from "./barpage.js";
import { giftable, giveNext } from "./logpage.js";
import { focusStyle } from "./thumbfocus.js";

// The Catalogue's search box and filters keep what was set while moving between screens (this session only).
let query = "";
const f = { cat: "", from: "", fresh: false, rated: false };
const MAX_RESULTS = 60;
const FROM = [["", "Anywhere"], ["on", "Ontario"], ["ca", "Canada"], ["import", "Imports"]];

/* #/drinks: what can I make, the group's top rated, and the Pour Decisions Catalogue. */
export function renderDrinks(main) {
  const n = new Set(groupRatings().map(r => `${r.kind}|${r.drinkId}`)).size;
  const items = allItems(), recipes = items.filter(i => i.kind === "cocktail").length;
  fill(main,
    el("h2", { class: "page-title", text: "Drinks" }),
    linkList([
      { icon: "🍸", title: "What can I make", sub: "Cocktails from your bar, or from what you tick", href: "#/makeable" },
      n ? { icon: "🏆", title: "Top rated", sub: `The group's favourites · ${n} drink${n === 1 ? "" : "s"} rated`, href: "#/top" } : null,
      { icon: "📖", title: "Pour Decisions Catalogue", sub: `Search, filter and browse ${(items.length - recipes).toLocaleString()} drinks and ${recipes} cocktails`, href: "#/catalogue" },
    ]));
}

/* #/catalogue: search and filters over every drink and cocktail; with neither in use, Browse by category. */
export function renderCatalogue(main) {
  const box = el("input", { type: "search", class: "search-input", placeholder: "Search beer, whisky, cocktails…", value: query,
    "aria-label": "Search the drink list", autocomplete: "off", autocorrect: "off", spellcheck: "false" });
  const results = el("div", { class: "stack" });
  const draw = () => {
    query = box.value;
    const catOf = id => CATEGORIES.find(c => c.id === id);
    const on = [
      f.cat && catOf(f.cat) ? [`${catOf(f.cat).icon} ${catOf(f.cat).name}`, () => { f.cat = ""; }] : null,
      f.from ? [`📍 ${FROM.find(x => x[0] === f.from)[1]}`, () => { f.from = ""; }] : null,
      f.fresh ? ["🆕 Not had yet", () => { f.fresh = false; }] : null,
      f.rated ? ["⭐ Rated by the group", () => { f.rated = false; }] : null,
    ].filter(Boolean);
    const bar = el("div", { class: "row spread" }, el("h3", { text: on.length || query.trim() ? "Results" : "Browse" }),
      el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(on.length > 0), onclick: () => filterSheet(draw) },
        on.length ? `Filter · ${on.length}` : "Filter"));
    const chips = on.length ? el("div", { class: "chips" }, ...on.map(([text, clear]) => el("button", { type: "button", class: "chip-btn tag",
      "aria-label": `Remove filter: ${text}`, onclick: () => { clear(); draw(); } }, `${text} ✕`))) : null;
    if (!query.trim() && !on.length) return fill(results, bar, categoryGrid());
    const had = new Set(store.logs.filter(l => l.uid === uid()).map(l => `${l.kind === "variant" ? "cocktail" : l.kind}:${l.drinkId}`));
    const rated = new Set(groupRatings().map(r => `${r.kind}:${r.drinkId}`));
    const hits = search(query, { items: filterItems(allItems(), f, { had, rated }) });
    fill(results, bar, chips, hits.length
      ? el("ul", { class: "item-list card" }, ...hits.slice(0, MAX_RESULTS).map(itemRow))
      : el("p", { class: "muted center", text: on.length ? "Nothing matches. Try other filters." : "Nothing in the list matches that yet. Soon you'll be able to add it." }),
      hits.length > MAX_RESULTS ? el("p", { class: "hint center", text: `Showing ${MAX_RESULTS} of ${hits.length.toLocaleString()}. Type more or filter to narrow it down.` }) : null);
  };
  box.addEventListener("input", draw);
  draw();
  fill(main,
    el("h2", { class: "page-title", text: "Pour Decisions Catalogue" }),
    el("label", { class: "search" }, el("span", { html: icon.search }), box),
    results);
}

/* What kind, where from, not had yet, rated by the group. Changes apply as they're picked. */
function filterSheet(draw) {
  const cat = el("select", {}, el("option", { value: "", text: "All drinks" }),
    ...CATEGORIES.map(c => el("option", { value: c.id, text: `${c.icon} ${c.name}` })));
  cat.value = f.cat;
  cat.addEventListener("change", () => { f.cat = cat.value; draw(); });
  const from = el("select", {}, ...FROM.map(([value, text]) => el("option", { value, text })));
  from.value = f.from;
  from.addEventListener("change", () => { f.from = from.value; draw(); });
  const check = (key, text) => {
    const box = el("input", { type: "checkbox" });
    box.checked = f[key];
    box.addEventListener("change", () => { f[key] = box.checked; draw(); });
    return el("label", { class: "check" }, box, el("span", { text }));
  };
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: "Filter the catalogue" }),
    field("What kind", cat),
    field("Where from", from, "Cocktails aren't from anywhere, so they drop out of this one."),
    check("fresh", "🆕 Only ones I haven't had"),
    check("rated", "⭐ Only ones the group has rated"),
    el("button", { class: "btn primary block", type: "button", text: "Done", onclick: closeSheet }))));
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
  const nv = i.kind === "cocktail" ? variantCount(i.id, store.logs) : 0;
  const meta = i.kind === "cocktail"
    ? [canMake(d) ? "✅ Can make" : "", st, d.method, d.glass, nv ? `${nv} variant${nv === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")
    : [st, d.origin ? originName(d.origin) : "", abvText(d)].filter(Boolean).join(" · ");
  return el("li", {}, el("a", { class: "item-row", href: `#/${i.kind === "cocktail" ? "recipe" : "drink"}/${i.id}` },
    el("span", { class: "item-icon", text: i.category.icon }),
    el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}

const abvText = d => `${d.approx ? "~" : ""}${d.abv}%`;

/* Can you make this cocktail with what you've ticked in What can I make? False when nothing is ticked. */
const canMake = r => { const have = haveSet(); return !!have && !missingFor(r, have).length; };

/* ---------- Drilling down ---------- */
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const familyOf = (cat, id) => cat.families.find(f => f.id === id) || null;
const soloFamily = cat => cat.families.length === 1; // the category page lists its styles itself
const famHref = (cat, f) => f.styles.length === 1 ? `#/style/${f.styles[0].id}` : `#/cat/${cat.id}/${f.id}`;

/* Drinks › Whisky › Scotch › Islay Single Malt, each a link, then the current page (not a link). */
function crumbs(...parts) {
  const all = [["Catalogue", "#/catalogue"], ...parts];
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

/* Where Back goes on a Drinks page when there's no earlier page in the app to go back to: one level up. */
export function drinksParent(name, arg, arg2) {
  const up = (kind, id) => { const i = itemById(kind, id); return i ? `#/style/${i.style.id}` : "#/catalogue"; };
  if (name === "cat") return arg2 ? `#/cat/${arg}` : "#/catalogue";
  if (name === "style") { const t = styleTrail(arg); return t.length > 1 ? t[t.length - 2][1] : "#/catalogue"; }
  if (name === "drink") return up("drink", arg);
  if (name === "recipe") return up("cocktail", arg);
  if (name === "v") { const v = itemById("variant", arg); return v ? `#/recipe/${v.base}` : "#/drinks"; }
  return "#/drinks";
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
    pageHead(s.category.icon, s.style.name, aboutStyle(id)),
    items.length ? el("ul", { class: "item-list card" }, ...items.map(i => itemRow(i, { style: false })))
      : el("section", { class: "card stack center" },
          el("p", { class: "muted", text: "Nothing in the list in this style yet." }),
          s.category.id === "cocktail" ? null : el("a", { class: "btn block", href: "#/log/search", text: "Log one and add it" })));
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
      ...bottleHero(i),
      el("h2", { text: i.title }),
      el("p", { class: "muted", text: i.style.name }),
      drinkActions(i)),
    el("dl", { class: "facts card" }, ...facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])),
    ratingsCard(i),
    useItIn(d),
    adminDrinkTools(i));
}

/* The top of a drink's page: the newest photo of a bottle of it in anyone's bar (and whose bar), or its icon. */
function bottleHero(i) {
  const s = bottlePhotoOf(store.stock, i.id, id => resolveId("drink", id));
  const h = s && store.households.find(x => x.id === s.hh);
  if (!s) return [el("span", { class: "hero-icon", text: i.category.icon })];
  const img = el("img", { class: "bar-photo bottle", alt: i.title });
  loadBottlePhoto(s).then(src => { if (src) img.src = src; else img.replaceWith(el("span", { class: "hero-icon", text: i.category.icon })); });
  return [img, h ? el("a", { class: "muted small", href: `#/bar/${h.id}/bar`, text: `📷 From ${h.name}` }) : null];
}

/* Under a drink's name: Log it (how often you've had it), then add it to your fridge or bar, want to try it, or give
   one to a friend. */
function drinkActions(i) {
  const h = drinkHistory(store.logs, uid(), i.kind, i.id), hh = householdOf(store.households, uid());
  const wants = (store.me && store.me.wants) || [], wanted = wants.includes(i.id);
  return el("div", { class: "stack drink-actions" },
    h.count ? el("p", { class: "muted small", text: `You've had it ${h.count === 1 ? "once" : `${h.count} times`} · last ${fmtDay(h.last)}` }) : null,
    el("a", { class: "btn primary block", href: `#/log/${i.kind}/${i.id}`, text: h.count ? "Log another" : "Log this" }),
    el("div", { class: "row" },
      hh ? el("button", { class: "btn small", type: "button", text: "🏠 Add", "aria-label": "Add to my fridge or bar", onclick: () => pickWhere(hh, i, null, { stay: true }) }) : null,
      h.count ? null : el("button", { class: "btn small", type: "button", "aria-pressed": String(wanted), "aria-label": "Want to try", text: wanted ? "🎯 On list" : "🎯 To try",
        onclick: e => {
          const now = (store.me && store.me.wants) || [], on = now.includes(i.id);
          updateMe({ wants: on ? now.filter(x => x !== i.id) : [...now, i.id].slice(-200) });
          e.currentTarget.textContent = on ? "🎯 To try" : "🎯 On list";
          e.currentTarget.setAttribute("aria-pressed", String(!on));
          if (!on) toast("On your Want to try list (on your profile) 🎯");
        } }),
      giftable().length ? el("button", { class: "btn small", type: "button", text: "🎁 Give", "aria-label": "Give one to a friend", onclick: () => giveSheet(i) }) : null));
}

/* Give one: pick the friend, then the log form opens with them as who it's for (it goes on the Tab). */
function giveSheet(i) {
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: `Give a ${i.title}` }),
    el("p", { class: "muted", text: "It's logged for them and goes on the Tab: they owe you one." }),
    el("div", { class: "chips" }, ...giftable().map(m => el("button", { type: "button", class: "chip-btn who", onclick: () => {
      giveNext(m.id); closeSheet(); location.hash = `#/log/${i.kind}/${i.id}`;
    } }, avatar(m, "xs"), m.displayName))),
    el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet }))));
}

const foldOpen = new Map();
/* The cocktails a drink can go in, from the recipe ingredients it counts as. Long lists start folded. */
function useItIn(d) {
  const ings = ingredientsOf(d);
  const list = ings.length ? cocktailsUsing(ings) : [];
  if (!list.length) return null;
  const names = ings.map(id => ingredientById(id).name).join(", ");
  // The page redraws when group data changes, so remember whether this was opened.
  const open = foldOpen.has(d.id) ? foldOpen.get(d.id) : list.length <= 8;
  const box = el("details", { class: "card fold", open: open ? "" : null });
  box.addEventListener("toggle", () => foldOpen.set(d.id, box.open));
  return fill(box,
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
      starButton(i.id),
      r.note ? el("p", { class: "small", text: r.note }) : null),
    el("section", { class: "card stack" },
      el("div", { class: "row spread" }, el("h3", { text: "Ingredients" }), unitsSeg),
      el("ul", { class: "ingredients" }, ...r.ingredients.map(x => el("li", {},
        el("b", { text: x.oz ? fmtAmount(x.oz, units) : x.qty }), ingredientLinks(x)))),
      el("p", {}, el("b", { text: "Garnish: " }), r.garnish),
      haveLine(r)),
    el("section", { class: "card stack" },
      el("h3", { text: "Method" }),
      el("ol", { class: "steps" }, ...r.steps.map(s => el("li", { text: s })))),
    variantsCard(i),
    ratingsCard(i),
    makeThis(i));
}

/* ⭐ Star a cocktail you want to make: the LCBO run lists the one thing you're missing for it. */
function starButton(id) {
  const starred = (store.me && store.me.starred) || [], on = starred.includes(id);
  return el("button", { class: "btn small", type: "button", "aria-pressed": String(on), text: on ? "⭐ Starred" : "☆ Star it", onclick: e => {
    const next = on ? starred.filter(x => x !== id) : [...starred, id].slice(-100);
    updateMe({ starred: next });
    e.currentTarget.textContent = on ? "☆ Star it" : "⭐ Starred";
    if (!on) toast("Starred. If you're one thing short, it's on your LCBO run 🛒");
  } });
}

/* Under a recipe's ingredients: whether what you've ticked in What can I make covers it. */
function haveLine(r) {
  const have = haveSet();
  if (!have) return null;
  const missing = missingFor(r, have);
  return el("a", { class: "note small", href: "#/makeable", text: missing.length
    ? `🛒 You're missing ${missing.map(x => x.item).join(", ")}`
    : "✅ You have everything for this one" });
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

/* A cocktail: Make it (your bottles and amounts), or log it as written, plus how often you've had it. */
function makeThis(i) {
  const h = drinkHistory(store.logs, uid(), i.kind, i.id);
  return el("section", { class: "card stack" },
    h.count ? el("p", { class: "muted", text: `You've had it ${h.count === 1 ? "once" : `${h.count} times`} · last ${fmtDay(h.last)}` }) : null,
    el("a", { class: "btn primary block", href: `#/make/${i.id}`, text: "🍸 Make it" }),
    el("p", { class: "hint center", text: "Follow the recipe, pick the bottles you're using and change the amounts. Anything you change is saved as your own variant." }),
    el("a", { class: "btn block", href: `#/log/${i.kind}/${i.id}`, text: "Just log it as written" }));
}

/* "Log this" plus how often you've had it. */

/* ---------- Cocktail variants ---------- */
const times = n => n === 1 ? "once" : `${n} times`;

/* The group's variants of a cocktail: the House Pour first, then best rated, then most made. */
function variantsCard(i) {
  const list = rankVariants(madeVariants(i.id, store.logs), groupRatings());
  const house = list.find(x => x.house);
  return el("section", { class: "card stack" },
    el("h3", { text: list.length ? `${list.length} variant${list.length === 1 ? "" : "s"} by the group` : "Variants" }),
    house ? el("p", { class: "note small" }, el("b", { text: "👑 House Pour: " }), `${variantTitle(i.data, house.item.data)}, the group's favourite version (${starText(house.avg)} from ${house.count} ratings).`) : null,
    list.length ? el("ul", { class: "item-list" }, ...list.map(x => variantRow(i.data, x)))
      : el("p", { class: "muted", text: "Nobody has made their own version yet. Tap Make it, pick your bottles or change an amount, and it shows up here." }));
}

function variantRow(recipe, { item, makes, makers, avg, house }) {
  const by = item.data.by;
  const meta = [by ? `by ${by === uid() ? "you" : memberName(by)}` : "", `made ${times(makes)}`, makers > 1 ? `by ${makers} people` : ""]
    .filter(Boolean).join(" · ");
  return el("li", {}, el("a", { class: "item-row", href: `#/v/${item.id}` },
    el("span", { class: "item-icon", text: house ? "👑" : "🍸" }),
    el("span", { class: "grow" }, el("b", { text: variantTitle(recipe, item.data) }), el("span", { class: "muted small", text: meta })),
    avg ? el("span", { class: "rating-line small", text: starText(avg) }) : null,
    el("span", { class: "chev", html: icon.chevron })));
}

/* #/v/<id>: one variant. Its recipe with the changes marked, who made it, what it was remixed from, and its remixes. */
export function renderVariant(main, id) {
  const item = itemById("variant", id), base = item && itemById("cocktail", item.base);
  if (!item || !base) return fill(main, el("div", { class: "card" }, el("p", { text: "That variant isn't in the list." })));
  const recipe = base.data, v = item.data, r = variantRecipe(recipe, v), units = getUnits();
  const cs = changes(recipe, v);
  const changedSlots = new Set(cs.filter(c => c.slot != null && c.type !== "removed" && !c.minor).map(c => c.slot));
  const removed = cs.filter(c => c.type === "removed").map(c => recipe.ingredients[c.slot].item.replace(/ \(optional\)$/, ""));
  const ml = recipeVolume(r), abv = recipeAbv(r);
  const makers = makersOf(store.logs, item.id), made = makers.reduce((t, m) => t + m.count, 0);
  const from = lineage(item.id)[0], remixes = remixesOf(item.id);
  const who = u => u === uid() ? "you" : memberName(u);
  const ranked = rankVariants(madeVariants(recipe.id, store.logs), groupRatings());
  const house = (ranked.find(x => x.item.id === item.id) || {}).house;
  fill(main,
    crumbs(...styleTrail(recipe.style), [recipe.name, `#/recipe/${recipe.id}`], [v.name || "Variant"]),
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: "🍸" }),
      el("h2", { text: variantTitle(recipe, v) }),
      house ? el("span", { class: "chip gold", text: "👑 House Pour" }) : null,
      el("p", { class: "muted" }, "A variant of ", el("a", { href: `#/recipe/${recipe.id}`, text: recipe.name })),
      from ? el("p", { class: "small" }, "Remixed from ", el("a", { href: `#/v/${from.id}`, text: variantTitle(recipe, from.data) })) : null,
      el("p", { class: "muted small", text: [v.by ? `First made by ${who(v.by)}` : "", v.at ? fmtDay(v.at) : ""].filter(Boolean).join(" · ") })),
    el("section", { class: "card stack" },
      el("h3", { text: "What's different" }),
      el("ul", { class: "changes" }, ...changeWords(recipe, v).map(w => el("li", { text: w })))),
    el("section", { class: "card stack" },
      el("h3", { text: "Ingredients" }),
      el("ul", { class: "ingredients" }, ...r.ingredients.map(x => el("li", { class: x.slot == null || changedSlots.has(x.slot) ? "changed" : null },
        el("b", { text: x.oz != null ? fmtAmount(x.oz, units) : x.qty }),
        el("span", {}, x.drinkId ? el("a", { href: `#/drink/${x.drinkId}`, text: x.item }) : x.item, x.slot == null ? " (added)" : "")))),
      removed.length ? el("p", { class: "muted small", text: `Left out: ${removed.join(", ")}` }) : null,
      el("p", {}, el("b", { text: "Glass: " }), r.glass),
      el("p", {}, el("b", { text: "Garnish: " }), r.garnish || "None"),
      el("p", { class: "muted small", text: `Each: ${fmtVolume(ml, units)} at about ${abv}% = ${standardDrinks(ml, abv)} standard drinks` })),
    ratingsCard(asItem(item)),
    photosCard(item),
    el("section", { class: "card stack" },
      el("h3", { text: made ? `Made ${times(made)}` : "Not made yet" }),
      makers.length ? el("ul", { class: "member-list" }, ...makers.map(m => {
        const mm = store.members.get(m.uid) || { id: m.uid, displayName: memberName(m.uid) };
        return el("li", {}, el("a", { class: "member-row", href: m.uid === uid() ? "#/me" : `#/u/${m.uid}` }, avatar(mm),
          el("div", { class: "grow" }, el("div", { class: "name", text: m.uid === uid() ? "You" : mm.displayName }),
            el("div", { class: "muted small", text: `${times(m.count)} · last ${fmtAgo(m.last)}` }))));
      })) : el("p", { class: "muted", text: "Be the first: tap Make this one." })),
    remixes.length ? el("section", { class: "card stack" },
      el("h3", { text: `Remixed ${times(remixes.length)}` }),
      el("ul", { class: "item-list" }, ...remixes.map(x => el("li", {}, el("a", { class: "item-row", href: `#/v/${x.id}` },
        el("span", { class: "item-icon", text: "🔀" }), el("b", { class: "grow", text: variantTitle(recipe, x.data) }),
        el("span", { class: "chev", html: icon.chevron })))))) : null,
    el("section", { class: "card stack" },
      el("a", { class: "btn primary block", href: `#/make/${recipe.id}/${item.id}`, text: "🍸 Make this one" }),
      el("p", { class: "hint center", text: "Make it as it is, or change anything to make your own remix." }),
      el("button", { class: "btn block", type: "button", text: "⚖️ Compare", onclick: () => compareSheet(recipe, item.id) }),
      v.by === uid() || isAdmin()
        ? el("button", { class: "btn block", type: "button", text: v.name ? "Rename" : "Give it a name", onclick: () => renameSheet(item, recipe) }) : null));
}

/* The maker (or an admin) names or renames a variant. Empty goes back to the automatic name. */
function renameSheet(item, recipe) {
  openSheet(box => {
    const name = el("input", { type: "text", maxlength: MAX_NAME, value: item.data.name || "", placeholder: "e.g. The Basement Sour",
      autocapitalize: "words", "data-focus": "" });
    const form = el("form", { class: "stack" },
      el("h2", { text: item.data.name ? "Rename it" : "Name it" }),
      el("label", { class: "field" }, el("span", { class: "field-label", text: "Name" }), name,
        el("span", { class: "hint", text: `Leave it empty for the automatic name: ${variantTitle(recipe, { ...item.data, name: "" })}` })),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })));
    form.addEventListener("submit", e => { e.preventDefault(); renameVariant(item.id, name.value); closeSheet(); toast("Saved."); });
    box.append(form);
  });
}

/* Photos people took of this variant (from their logs), small copies only; tap one for its log. */
function photosCard(item) {
  const logs = store.logs.filter(l => l.hasPhoto && l.variantId && (itemById("variant", l.variantId) || {}).id === item.id)
    .sort((a, b) => b.at - a.at).slice(0, 6);
  if (!logs.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: "Photos" }),
    el("div", { class: "photo-grid" }, ...logs.map(l => {
      const img = el("img", { alt: `${memberName(l.uid)}'s photo`, loading: "lazy", style: focusStyle(l) });
      loadThumb(l.id).then(src => { if (src) img.src = src; else img.closest("a")?.remove(); });
      return el("a", { href: `#/l/${l.id}` }, img);
    })));
}

/* Pick what to compare this variant with: the recipe as written, or another of the group's variants. */
function compareSheet(recipe, id) {
  const others = rankVariants(madeVariants(recipe.id, store.logs), groupRatings()).filter(x => x.item.id !== id);
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: "Compare with" }),
    el("ul", { class: "item-list" },
      el("li", {}, el("a", { class: "item-row", href: `#/compare/${id}/${recipe.id}`, onclick: closeSheet },
        el("span", { class: "item-icon", text: "📖" }), el("span", { class: "grow" }, el("b", { text: recipe.name }), el("span", { class: "muted small", text: "The recipe as written" })))),
      ...others.map(x => el("li", {}, el("a", { class: "item-row", href: `#/compare/${id}/${x.item.id}`, onclick: closeSheet },
        el("span", { class: "item-icon", text: x.house ? "👑" : "🍸" }), el("b", { class: "grow", text: variantTitle(recipe, x.item.data) }),
        x.avg ? el("span", { class: "rating-line small", text: starText(x.avg) }) : null)))),
    el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }))));
}

/* #/compare/<a>/<b>: two versions of a cocktail side by side. Each is a variant id, or the cocktail's id for the recipe
   as written. Rows that differ are marked. */
export function renderCompare(main, a, b) {
  const side = id => {
    const v = id && id.includes("~") ? itemById("variant", id) : null;
    const base = itemById("cocktail", v ? v.base : id);
    return base ? { v, base } : null;
  };
  const A = side(a), B = side(b);
  if (!A || !B || A.base.id !== B.base.id) return fill(main, el("div", { class: "card" }, el("p", { text: "Those two can't be compared." })));
  const recipe = A.base.data, units = getUnits(), ratings = groupRatings();
  const info = x => {
    const r = x.v ? variantRecipe(recipe, x.v.data) : recipe, ml = recipeVolume(r), abv = recipeAbv(r);
    const rs = ratings.filter(t => x.v ? t.kind === "variant" && t.drinkId === x.v.id : t.kind === "cocktail" && t.drinkId === recipe.id);
    const avg = rs.length ? Math.round(rs.reduce((t, q) => t + q.rating, 0) / rs.length * 10) / 10 : null;
    const made = x.v ? makersOf(store.logs, x.v.id).reduce((t, m) => t + m.count, 0) : null;
    return { title: x.v ? variantTitle(recipe, x.v.data) : `${recipe.name} (as written)`, href: x.v ? `#/v/${x.v.id}` : `#/recipe/${recipe.id}`,
      glass: r.glass, garnish: r.garnish || "None", strength: `${abv}% · ${standardDrinks(ml, abv)} std`, avg, count: rs.length, made };
  };
  const ia = info(A), ib = info(B);
  const cell = c => c ? el("span", {}, el("b", { text: c.oz != null ? fmtAmount(c.oz, units) : c.qty }), " ", c.name) : el("span", { class: "muted", text: "—" });
  const line = (label, x, y, differs) => el("div", { class: `cmp-row${differs ? " differs" : ""}` },
    el("span", { class: "cmp-label", text: label }), el("span", {}, x), el("span", {}, y));
  fill(main,
    crumbs(...styleTrail(recipe.style), [recipe.name, `#/recipe/${recipe.id}`], ["Compare"]),
    el("h2", { class: "page-title", text: "Compare" }),
    el("section", { class: "card cmp" },
      el("div", { class: "cmp-row cmp-head" }, el("span"), el("a", { href: ia.href, text: ia.title }), el("a", { href: ib.href, text: ib.title })),
      line("Rating", ia.avg ? `${starText(ia.avg)} (${ia.count})` : "Not rated", ib.avg ? `${starText(ib.avg)} (${ib.count})` : "Not rated"),
      ia.made != null || ib.made != null ? line("Made", ia.made != null ? times(ia.made) : "—", ib.made != null ? times(ib.made) : "—") : null,
      line("Strength", ia.strength, ib.strength, ia.strength !== ib.strength),
      ...compareRows(recipe, A.v && A.v.data, B.v && B.v.data).map(r => line(r.label, cell(r.a), cell(r.b), r.differs)),
      line("Glass", ia.glass, ib.glass, ia.glass !== ib.glass),
      line("Garnish", ia.garnish, ib.garnish, ia.garnish !== ib.garnish)),
    el("p", { class: "hint center", text: "Highlighted rows are different." }));
}
