/* #/makeable[/<household>|/list]: What can I make. Cocktails sort into Can make now, Missing 1 (with what to buy) and
   Missing 2+, with the best single bottle to buy, from what's in a household's bar and fridge (yours by default) or
   from a checklist ticked by hand (kept on this phone only). The logic is in makeable.js and stock.js. */
import { el, fill, icon, field, confirmButton } from "./ui.js";
import { INGREDIENT_KINDS } from "./catalog/ingredients.js";
import { allItems, normalize } from "./catalog.js";
import { coverMap, expandHave, usesIngredient, sortByHave, bestBuys, checklistIngredients } from "./makeable.js";
import { store, uid } from "./cloud.js";
import { householdOf, haveFromStock, stockIn, onHand } from "./stock.js";

const KEY = "pour-have";
const KIND_ICONS = { spirit: "🥃", liqueur: "🍶", wine: "🍷", beer: "🍺", mixer: "🥤", juice: "🍋", syrup: "🍯", bitters: "💧",
  fresh: "🌿", dairy: "🥛" };

/* The ticked ingredient ids, as saved on this phone. */
export function ticked() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
}
function saveTicked(set) {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch {}
}

// Which ingredients cover which depends on the drink list, so it's worked out again only when the list changes.
let coverFor = null, covers = null;
export function currentCovers() {
  const items = allItems();
  if (coverFor !== items) { coverFor = items; covers = coverMap(items.filter(i => i.kind === "drink").map(i => i.data)); }
  return covers;
}

/* Where "what you have" comes from: a household id, or "list" for the checklist. With none picked yet, your own
   household if you have one. Other pages' "Can make" badges follow the last one picked. */
let lastSource = null;
function sourceOf(arg) {
  const want = arg || lastSource;
  if (want === "list") return null;
  return store.households.find(h => h.id === want) || householdOf(store.households, uid());
}

/* Everything you have, or null when there's nothing to go on (so other pages can skip badges). */
export function haveSet() {
  const h = sourceOf(null);
  if (h) return stockIn(store.stock, h.id, "bar").some(onHand) || stockIn(store.stock, h.id, "fridge").some(onHand)
    ? haveFromStock(store.stock, h.id, currentCovers()) : null;
  const t = ticked();
  return t.size ? expandHave(t, currentCovers()) : null;
}

// Filters stay put while moving between screens (this session only).
let kind = "all", must = "", find = "";
const openKinds = new Set(); // checklist folds left open, so a redraw keeps them open
const KINDS = [["all", "All"], ["cocktail", "Cocktails"], ["mocktail", "Mocktails"]];
const isMocktail = i => i.style && i.style.id === "mocktail";

export function renderMakeable(main, arg) {
  const hh = sourceOf(arg);
  lastSource = hh ? hh.id : "list";
  const have = ticked(), cov = currentCovers(), list = checklistIngredients();
  const results = el("div", { class: "stack" }), count = el("span", { class: "muted small" });

  const draw = () => {
    count.textContent = have.size ? `${have.size} ticked` : "Nothing ticked yet";
    fill(results, ...resultCards(hh ? haveFromStock(store.stock, hh.id, cov) : expandHave(have, cov), cov));
  };

  // The checklist: one fold per kind (spirits, liqueurs...), with a box to find an ingredient quickly.
  const chip = g => el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(have.has(g.id)), text: g.name,
    "data-name": normalize(g.name),
    onclick: e => {
      have.has(g.id) ? have.delete(g.id) : have.add(g.id);
      e.currentTarget.setAttribute("aria-pressed", String(have.has(g.id)));
      saveTicked(have);
      folds.forEach(f => f.update());
      draw();
    } });
  const folds = Object.keys(INGREDIENT_KINDS).filter(k => k !== "pantry").map(k => {
    const gs = list.filter(g => g.kind === k).sort((a, b) => a.name.localeCompare(b.name));
    const n = el("span", { class: "muted small" }), chips = gs.map(chip);
    const fold = el("details", { class: "fold", open: openKinds.has(k), ontoggle: () => fold.open ? openKinds.add(k) : openKinds.delete(k) },
      el("summary", {}, el("b", { text: `${KIND_ICONS[k]} ${INGREDIENT_KINDS[k]}` }), " ", n),
      el("div", { class: "chips" }, ...chips));
    fold.update = () => { const on = gs.filter(g => have.has(g.id)).length; n.textContent = on ? `· ${on} of ${gs.length}` : `· ${gs.length}`; };
    fold.filter = q => {
      let shown = 0;
      chips.forEach(c => { const hit = !q || c.dataset.name.includes(q); c.hidden = !hit; shown += hit; });
      fold.hidden = !shown;
      if (q && shown) fold.open = true;
    };
    fold.update();
    return fold;
  });
  const findBox = el("input", { type: "search", class: "search-input", placeholder: "Find an ingredient…", value: find,
    "aria-label": "Find an ingredient", autocomplete: "off", autocorrect: "off", spellcheck: "false" });
  const applyFind = () => { find = findBox.value; const q = normalize(find); folds.forEach(f => f.filter(q)); };
  findBox.addEventListener("input", applyFind);
  applyFind();

  const clear = confirmButton("Clear all", "Tap again to untick everything", () => {
    have.clear(); saveTicked(have);
    renderMakeable(main, "list");
  }, "btn small");

  // Filters: cocktails or mocktails, and an ingredient the drink must use.
  const seg = el("div", { class: "seg small", role: "group", "aria-label": "Show" }, ...KINDS.map(([k, label]) =>
    el("button", { type: "button", "aria-pressed": String(kind === k), text: label, onclick: e => {
      kind = k;
      seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === e.currentTarget)));
      draw();
    } })));
  const pick = el("select", { "aria-label": "Must use" },
    el("option", { value: "", text: "Any ingredient" }),
    ...[...list].sort((a, b) => a.name.localeCompare(b.name)).map(g => el("option", { value: g.id, text: g.name, selected: g.id === must })));
  pick.addEventListener("change", () => { must = pick.value; draw(); });

  // From: your household first, then everyone else's, then the checklist.
  const mine = householdOf(store.households, uid());
  const others = store.households.filter(h => h !== mine).sort((a, b) => a.name.localeCompare(b.name));
  const from = el("select", { "aria-label": "From" },
    mine ? el("option", { value: mine.id, text: `Your bar & fridge (${mine.name})`, selected: hh === mine }) : null,
    ...others.map(h => el("option", { value: h.id, text: h.name, selected: hh === h })),
    el("option", { value: "list", text: mine ? "Planning: tick by hand" : "A checklist I tick by hand", selected: !hh }));
  from.addEventListener("change", () => { location.hash = `#/makeable/${from.value}`; });
  const stockCount = hh ? [...stockIn(store.stock, hh.id, "bar"), ...stockIn(store.stock, hh.id, "fridge")].filter(onHand).length : 0;

  fill(main,
    el("h2", { class: "page-title", text: "🍸 What can I make" }),
    store.households.length ? field("From", from) : null,
    hh ? el("section", { class: "card stack" },
      el("p", {}, el("b", { text: hh.name }), ` has ${stockCount} thing${stockCount === 1 ? "" : "s"} on hand. A bottle counts for the broader ingredient too: Rye also makes anything that asks for Whisky. Kitchen basics like sugar and water are assumed.`),
      el("a", { class: "btn block", href: `#/bar/${hh.id}/bar`, text: (hh.members || []).includes(uid()) ? "Open the bar to change it" : "See this bar" }))
    : el("section", { class: "card stack" },
      el("div", { class: "row spread" }, el("h3", { text: "What you have" }), count),
      el("p", { class: "hint", text: mine ? "For planning: tick ingredients by hand (a bar that isn't in the app, or what you'd buy). Your own bar is the first choice in From. Kitchen basics like sugar and water are assumed. Saved on this phone." :
        "Tick what's in your bar, or start your bar & fridge on the Bar tab to keep it up to date as you pour. A bottle counts for the broader ingredient too: Rye also makes anything that asks for Whisky. Kitchen basics like sugar and water are assumed. Saved on this phone." }),
      el("label", { class: "search" }, el("span", { html: icon.search }), findBox),
      ...folds,
      have.size ? clear : null),
    el("section", { class: "card stack" },
      el("h3", { text: "Show" }),
      seg,
      field("Must use", pick, "Rye also picks drinks that ask for any whisky.")),
    results);
  draw();

  function resultCards(on, cov) {
    let items = allItems().filter(i => i.kind === "cocktail");
    if (kind === "cocktail") items = items.filter(i => !isMocktail(i));
    if (kind === "mocktail") items = items.filter(isMocktail);
    if (must) items = items.filter(i => usesIngredient(i.data, must, cov));
    const { now, one, more } = sortByHave(items, on);
    const buys = bestBuys(one, cov);
    const need = r => `Need: ${r.missing.map(x => x.item).join(", ")}`;
    return [
      el("section", { class: "card stack" },
        el("h3", { text: `✅ Can make now · ${now.length}` }),
        now.length ? el("ul", { class: "item-list" }, ...now.map(r => row(r.item, metaOf(r.item))))
          : el("p", { class: "muted", text: hh ? "Nothing yet. Missing 1 shows what's closest." : have.size ? "Nothing yet. Missing 1 shows what's closest." : "Tick what you have above, and the cocktails you can make show up here." })),
      buys.length ? el("section", { class: "card stack" },
        el("h3", { text: "🛒 Best buy" }),
        el("p", { class: "hint", text: "One more bottle or ingredient, and the most cocktails you could add." }),
        el("ul", { class: "item-list" }, ...buys.map(b => el("li", {}, el("a", { class: "item-row", href: `#/ing/${b.ing.id}` },
          el("span", { class: "item-icon", text: KIND_ICONS[b.ing.kind] || "🍹" }),
          el("span", { class: "grow" }, el("b", { text: b.ing.name }),
            el("span", { class: "muted small", text: `${b.unlocks.length} more: ${b.unlocks.slice(0, 4).map(i => i.title).join(", ")}${b.unlocks.length > 4 ? "…" : ""}` })),
          el("span", { class: "chev", html: icon.chevron })))))) : null,
      one.length ? el("section", { class: "card stack" },
        el("h3", { text: `Missing 1 · ${one.length}` }),
        el("ul", { class: "item-list" }, ...one.map(r => row(r.item, need(r))))) : null,
      more.length ? el("section", { class: "card stack" },
        el("details", { class: "fold" },
          el("summary", {}, el("b", { text: `Missing 2 or more · ${more.length}` })),
          el("ul", { class: "item-list" }, ...more.map(r => row(r.item, need(r)))))) : null,
    ];
  }
}

const metaOf = i => [i.style.name, i.data.method, i.data.glass].filter(Boolean).join(" · ");

function row(i, meta) {
  return el("li", {}, el("a", { class: "item-row", href: `#/recipe/${i.id}` },
    el("span", { class: "item-icon", text: i.category.icon }),
    el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}
