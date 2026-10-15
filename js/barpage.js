/* The bar and the fridge: #/bar (yours), #/bar/<household>/<fridge|bar>, and #/bars (every household).
   Everyone can look at every household; only its members change it. The data rules are in stock.js. */
import { el, fill, icon, avatar, openSheet, closeSheet, toast, confirmButton, field } from "./ui.js";
import { store, uid, cloud, memberName, createHousehold, updateHousehold, leaveHousehold, setStock, changeStock, addToFridge, removeStock } from "./cloud.js";
import { search, ingredientById, INGREDIENTS, normalize } from "./catalog.js";
import { drinkOne } from "./logpage.js";
import { RELOADS, BOTTLE_SIZES, LEVELS, stockId, householdOf, defaultWhere, stockIn, fridgeCount, isLow, level, levelText, homeless } from "./stock.js";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Bottle sizes are always in ml or litres, as on the label.
const mlText = ml => ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`;
const KIND_ICONS = { spirit: "🥃", liqueur: "🍶", wine: "🍷", beer: "🍺", mixer: "🥤", juice: "🍋", syrup: "🍯", bitters: "💧",
  fresh: "🌿", dairy: "🥛" };
const thingIcon = s => s.kind === "ing" ? KIND_ICONS[s.thing.ing.kind] || "🍹" : s.thing.item.category.icon;
const memberList = h => (h.members || []).filter(id => store.members.has(id));
const peopleText = h => memberList(h).map(memberName).join(" & ") || "Nobody yet";

/* #/bar: your household's bar and fridge, or starting one. #/bar/<id>/<tab>: anyone's. */
export function renderBar(main, hhId, tab) {
  const mineHh = householdOf(store.households, uid());
  const h = hhId ? store.households.find(x => x.id === hhId) : mineHh;
  if (!h) return hhId ? fill(main, el("div", { class: "card" }, el("p", { text: "That household isn't here any more." })), allLink())
    : renderStart(main);
  const mine = (h.members || []).includes(uid());
  tab = tab === "bar" ? "bar" : "fridge";
  const fridge = stockIn(store.stock, h.id, "fridge"), bar = stockIn(store.stock, h.id, "bar");
  const base = `#/bar/${h.id}`;

  fill(main,
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: "🏠" }),
      el("h2", { text: h.name }),
      el("div", { class: "chips center" }, ...memberList(h).map(id => el("a", { class: "chip-btn who", href: `#/u/${id}` },
        avatar(store.members.get(id), "xs"), memberName(id)))),
      mine ? el("button", { class: "btn small", type: "button", text: "Household settings", onclick: () => settingsSheet(h) }) : null),
    el("div", { class: "seg", role: "tablist" },
      el("a", { class: "seg-link", href: `${base}/fridge`, "aria-selected": String(tab === "fridge"), text: `🧊 Fridge · ${fridge.reduce((n, s) => n + fridgeCount(s), 0)}` }),
      el("a", { class: "seg-link", href: `${base}/bar`, "aria-selected": String(tab === "bar"), text: `🍾 Bar · ${bar.length}` })),
    tab === "fridge" ? fridgeCard(h, fridge, mine) : barCards(h, bar, mine),
    mine ? el("button", { class: "btn primary block", type: "button", html: icon.plus, onclick: () => addSheet(h, tab) },
      tab === "fridge" ? "Add to the fridge" : "Add to the bar") : null,
    el("a", { class: "card admin-link", href: `#/makeable/${h.id}` },
      el("span", { class: "item-icon", text: "🍸" }),
      el("div", { class: "grow" }, el("b", { text: "What can I make here" }), el("p", { class: "muted small", text: "Cocktails from this bar and fridge" })),
      el("span", { class: "chev", html: icon.chevron })),
    allLink());
}

const allLink = () => el("a", { class: "btn block", href: "#/bars", text: "Everyone's bars" });

/* No household yet: start one (just you; add the people you live with afterwards). */
function renderStart(main) {
  const name = el("input", { type: "text", maxlength: 40, autocapitalize: "words", value: `${(store.me && store.me.displayName) || "My"}'s place` });
  fill(main,
    el("h2", { class: "page-title", text: "🏠 Your bar & fridge" }),
    el("section", { class: "card stack" },
      el("p", { text: "Keep track of what's in your fridge and your bar: the beer counted, the bottles by how full they are, and the mixers and juices on hand. Then see which cocktails you can make." }),
      el("p", { class: "hint", text: "Live with someone in the group? Start one and add them: you'll share it. Everyone in the group can see every bar." }),
      field("Name", name, "e.g. The Basement"),
      el("button", { class: "btn primary block", type: "button", text: "Start my bar & fridge", onclick: () => {
        const id = createHousehold(name.value);
        location.hash = `#/bar/${id}/fridge`;
      } })),
    allLink());
}

/* #/bars: every household, with what's in it. */
export function renderBars(main) {
  const hs = [...store.households].sort((a, b) => a.name.localeCompare(b.name));
  const mine = householdOf(store.households, uid());
  fill(main,
    el("h2", { class: "page-title", text: "🏠 Everyone's bars" }),
    hs.length ? el("ul", { class: "item-list card" }, ...hs.map(h => {
      const f = stockIn(store.stock, h.id, "fridge").reduce((n, s) => n + fridgeCount(s), 0);
      const b = stockIn(store.stock, h.id, "bar").filter(s => s.kind === "drink").length;
      return el("li", {}, el("a", { class: "item-row", href: `#/bar/${h.id}/fridge` },
        el("span", { class: "item-icon", text: "🏠" }),
        el("span", { class: "grow" }, el("b", { text: h.name }),
          el("span", { class: "muted small", text: `${peopleText(h)} · ${plural(f, "in the fridge", "in the fridge")} · ${plural(b, "bottle")}` })),
        el("span", { class: "chev", html: icon.chevron })));
    })) : el("p", { class: "card muted", text: "Nobody has set up a bar yet." }),
    mine ? null : el("a", { class: "btn primary block", href: "#/bar", text: "Start yours" }));
}

/* ---------- The fridge ---------- */
function fridgeCard(h, rows, mine) {
  const low = rows.filter(isLow);
  return el("section", { class: "card stack" },
    low.length ? el("p", { class: "note small" }, el("b", { text: "Running low: " }), low.map(s => `${s.thing.title} (${fridgeCount(s)})`).join(", ")) : null,
    rows.length ? el("ul", { class: "item-list" }, ...rows.map(s => el("li", { class: "make-row" },
      el("button", { type: "button", class: "make-name", disabled: !mine, onclick: () => fridgeSheet(s) },
        el("b", { text: `${thingIcon(s)} ${s.thing.title}` }),
        el("span", { class: "muted small", text: isLow(s) ? `Running low · warns at ${s.low}` : mine ? "Drink one, reload or change" : "" })),
      mine ? el("div", { class: "stepper", role: "group", "aria-label": `How many ${s.thing.title}` },
        el("button", { type: "button", class: "step-btn", "aria-label": "One less", text: "−", disabled: fridgeCount(s) <= 0, onclick: () => addToFridge(s.id, -1) }),
        el("b", { class: "step-val", text: String(fridgeCount(s)) }),
        el("button", { type: "button", class: "step-btn", "aria-label": "One more", text: "+", onclick: () => reload(s, 1) }))
        : el("b", { class: "step-val", text: String(fridgeCount(s)) }))))
      : el("p", { class: "muted", text: mine ? "The fridge is empty. Add the beer, cider and cans you have." : "Nothing in this fridge." }));
}

// A count that dipped below 0 (two phones taking the last can offline) starts again from 0.
const reload = (s, n) => addToFridge(s.id, (s.count || 0) < 0 ? n - s.count : n);

function fridgeSheet(s) {
  openSheet(box => {
    const lowPick = el("select", { "aria-label": "Warn when down to" },
      el("option", { value: "", text: "Never" }),
      ...[0, 1, 2, 3, 4, 6, 8, 12].map(n => el("option", { value: String(n), text: n ? `${n} left` : "None left", selected: s.low === n })));
    lowPick.addEventListener("change", () => changeStock(s.id, { low: lowPick.value === "" ? cloud.api.deleteField() : Number(lowPick.value) }));
    box.append(el("div", { class: "stack" },
      el("h2", { text: s.thing.title }),
      el("p", { class: "muted", text: `${fridgeCount(s)} in the fridge` }),
      fridgeCount(s) > 0 ? el("button", { class: "btn primary block", type: "button", text: `${thingIcon(s)} Drink one`, onclick: () => {
        drinkOne(s.thing.item, s); closeSheet();
      } }) : null,
      el("p", { class: "hint", text: "Drink one logs it for you and takes it out of the fridge. − takes one out without logging it." }),
      el("h3", { text: "Reload" }),
      el("div", { class: "chips" }, ...RELOADS.map(n => el("button", { type: "button", class: "chip-btn", text: `+${n}`, onclick: () => {
        reload(s, n); closeSheet(); toast(`Added ${n} ${s.thing.title}`);
      } }))),
      field("Running low warning", lowPick, "Shows a warning on the fridge when it's down to this many."),
      el("div", { class: "row" },
        confirmButton("Empty it", "Tap again to set it to 0", () => { changeStock(s.id, { count: 0 }); closeSheet(); }, "btn"),
        confirmButton("Remove", "Tap again to remove", () => { removeStock(s.id); closeSheet(); })),
      el("button", { class: "btn quiet block", type: "button", text: "Done", onclick: closeSheet })));
  });
}

/* ---------- The bar ---------- */
function barCards(h, rows, mine) {
  const bottles = rows.filter(s => s.kind === "drink"), ings = rows.filter(s => s.kind === "ing");
  return [
    el("section", { class: "card stack" },
      el("h3", { text: `Bottles · ${bottles.length}` }),
      bottles.length ? el("ul", { class: "item-list" }, ...bottles.map(s => el("li", {},
        el("button", { type: "button", class: "item-row plain", disabled: !mine, onclick: () => bottleSheet(s) },
          el("span", { class: "item-icon", text: thingIcon(s) }),
          el("span", { class: "grow" }, el("b", { text: s.thing.title }),
            el("span", { class: "muted small", text: [mlText(s.size), s.spares ? `+${plural(s.spares, "spare")}` : ""].filter(Boolean).join(" · ") })),
          gauge(s)))))
        : el("p", { class: "muted", text: mine ? "No bottles yet. Add your whisky, spirits, liqueurs and wine." : "No bottles in this bar." })),
    el("section", { class: "card stack" },
      el("h3", { text: `Mixers, juices & more · ${ings.length}` }),
      ings.length ? el("ul", { class: "item-list" }, ...ings.map(s => el("li", { class: "make-row" },
        el("span", { class: "make-name" }, el("b", { text: `${thingIcon(s)} ${s.thing.title}` })),
        mine ? el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(!s.out), text: s.out ? "Out" : "Have it",
          onclick: () => changeStock(s.id, { out: !s.out }) }) : el("span", { class: "muted small", text: s.out ? "Out" : "Have it" }),
        mine ? el("button", { type: "button", class: "icon-x", "aria-label": `Remove ${s.thing.title}`, text: "×", onclick: () => removeStock(s.id) }) : null)))
        : el("p", { class: "muted", text: "Tonic, limes, simple syrup, bitters: anything a cocktail needs that isn't a bottle." })),
  ];
}

/* How full a bottle is, as four bars. */
function gauge(s) {
  const f = level(s);
  return el("span", { class: "gauge", role: "img", "aria-label": `${levelText(s)} full` },
    ...[0.25, 0.5, 0.75, 1].map(q => el("i", { class: f >= q ? "on" : "" })),
    el("b", { class: "small", text: levelText(s) }));
}

function bottleSheet(s) {
  openSheet(box => {
    const draw = () => {
      const now = store.stock.find(x => x.id === s.id);
      if (!now) return closeSheet();
      const cur = { ...s, ...now }, f = level(cur);
      fill(box, el("div", { class: "stack" },
        el("h2", { text: s.thing.title }),
        f > 0 || cur.spares ? el("button", { class: "btn primary block", type: "button", text: `${thingIcon(s)} Pour one`, onclick: () => {
          drinkOne(s.thing.item, cur); closeSheet();
        } }) : null,
        el("h3", { text: "How full" }),
        el("div", { class: "seg small", role: "group", "aria-label": "How full" }, ...LEVELS.map(([q, label]) =>
          el("button", { type: "button", "aria-pressed": String(f === q), text: label, onclick: () => { changeStock(s.id, { left: Math.round(cur.size * q) }); later(draw); } }))),
        cur.spares && f === 0 ? el("button", { class: "btn primary block", type: "button", text: "Open a new bottle",
          onclick: () => { changeStock(s.id, { left: cur.size, spares: cur.spares - 1 }); later(draw); } }) : null,
        el("div", { class: "row spread" },
          el("span", {}, el("b", { text: "Spare bottles" }), el("br"), el("span", { class: "muted small", text: "Sealed, same drink" })),
          el("div", { class: "stepper", role: "group", "aria-label": "Spare bottles" },
            el("button", { type: "button", class: "step-btn", "aria-label": "One less", text: "−", disabled: !cur.spares, onclick: () => { changeStock(s.id, { spares: (cur.spares || 0) - 1 }); later(draw); } }),
            el("b", { class: "step-val", text: String(cur.spares || 0) }),
            el("button", { type: "button", class: "step-btn", "aria-label": "One more", text: "+", onclick: () => { changeStock(s.id, { spares: (cur.spares || 0) + 1 }); later(draw); } }))),
        field("Bottle size", sizePick(cur.size, size => { changeStock(s.id, { size, left: Math.round(size * f) }); later(draw); })),
        confirmButton("Remove from the bar", "Tap again to remove", () => { removeStock(s.id); closeSheet(); }),
        el("button", { class: "btn quiet block", type: "button", text: "Done", onclick: closeSheet })));
    };
    draw();
  });
}
// The change lands in the local copy straight away; redraw the sheet once it has.
const later = fn => setTimeout(fn, 50);

function sizePick(current, pick) {
  const sel = el("select", { "aria-label": "Bottle size" }, ...BOTTLE_SIZES.map(ml => el("option", { value: String(ml), text: mlText(ml), selected: ml === current })));
  sel.addEventListener("change", () => pick(Number(sel.value)));
  return sel;
}

/* ---------- Adding ---------- */
const ADDABLE_INGS = INGREDIENTS.filter(g => !g.pantry);

function addSheet(h, tab) {
  openSheet(box => {
    const q = el("input", { type: "search", class: "search-input", placeholder: tab === "fridge" ? "Search beer, cider, cans…" : "Search bottles, mixers, juices…",
      "aria-label": "Search", autocomplete: "off", autocorrect: "off", spellcheck: "false", "data-focus": "" });
    const results = el("ul", { class: "item-list" });
    const draw = () => {
      const text = q.value.trim();
      if (!text) return fill(results, el("p", { class: "muted small", text: "Type to search the drink list." }));
      const drinks = search(text).filter(i => i.kind === "drink").slice(0, 12);
      const words = normalize(text).split(" ").filter(Boolean);
      const ings = tab === "bar" ? ADDABLE_INGS.filter(g => words.every(w => normalize(g.name).includes(w))).slice(0, 6) : [];
      fill(results,
        ...ings.map(g => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => addIng(h, g) },
          el("span", { class: "item-icon", text: KIND_ICONS[g.kind] || "🍹" }),
          el("span", { class: "grow" }, el("b", { text: g.name }), el("span", { class: "muted small", text: "Ingredient: have it or not" }))))),
        ...drinks.map(i => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => pickWhere(h, i, tab) },
          el("span", { class: "item-icon", text: i.category.icon }),
          el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: i.style.name }))))),
        !drinks.length && !ings.length ? el("p", { class: "muted small", text: "Nothing matches. Add it to the list from Log first." }) : null);
    };
    q.addEventListener("input", draw);
    draw();
    box.append(el("div", { class: "stack" },
      el("h2", { text: tab === "fridge" ? "Add to the fridge" : "Add to the bar" }),
      el("label", { class: "search" }, el("span", { html: icon.search }), q),
      results,
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

function addIng(h, g) {
  const id = stockId(h.id, "bar", "ing", g.id);
  setStock(id, { hh: h.id, where: "bar", kind: "ing", item: g.id }, { out: false });
  closeSheet();
  toast(`${g.name} is in the bar`);
}

/* Second step for a drink: fridge (how many) or bar (bottle size). Already there? Add to it instead. */
function pickWhere(h, i, tab) {
  let where = defaultWhere(i);
  openSheet(box => {
    const draw = () => {
      const id = stockId(h.id, where, "drink", i.id), have = store.stock.find(s => s.id === id);
      let size = (have && have.size) || 750;
      fill(box, el("div", { class: "stack" },
        el("h2", { text: i.title }),
        el("div", { class: "seg small", role: "group", "aria-label": "Where" }, ...[["fridge", "🧊 Fridge"], ["bar", "🍾 Bar"]].map(([k, label]) =>
          el("button", { type: "button", "aria-pressed": String(where === k), text: label, onclick: () => { where = k; draw(); } }))),
        where === "fridge"
          ? [el("h3", { text: have ? `How many more? (${fridgeCount(have)} in now)` : "How many?" }),
             el("div", { class: "chips" }, ...RELOADS.map(n => el("button", { type: "button", class: "chip-btn", text: `+${n}`, onclick: () => {
               if (have) reload(have, n);
               else setStock(id, { hh: h.id, where, kind: "drink", item: i.id }, { count: n });
               closeSheet(); toast(`Added ${n} ${i.title}`);
               location.hash = `#/bar/${h.id}/fridge`;
             } })))]
          : [have ? el("p", { class: "muted", text: `Already in the bar (${levelText(have)}). Adding it again counts a spare bottle.` })
               : field("Bottle size", sizePick(size, v => { size = v; })),
             el("button", { class: "btn primary block", type: "button", text: have ? "Add a spare bottle" : "Add a full bottle", onclick: () => {
               if (have) changeStock(id, { spares: (have.spares || 0) + 1 });
               else setStock(id, { hh: h.id, where, kind: "drink", item: i.id }, { size, left: size, spares: 0 });
               closeSheet(); toast(`${i.title} is in the bar`);
               location.hash = `#/bar/${h.id}/bar`;
             } })],
        el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
    };
    draw();
  });
}

/* ---------- Household settings ---------- */
function settingsSheet(h) {
  openSheet(box => {
    const name = el("input", { type: "text", maxlength: 40, autocapitalize: "words", value: h.name });
    const free = homeless([...store.members.values()].filter(m => !m.suspended), store.households);
    const add = el("select", { "aria-label": "Add someone" }, el("option", { value: "", text: free.length ? "Pick someone…" : "Everyone already has a household" }),
      ...free.map(m => el("option", { value: m.id, text: m.displayName })));
    box.append(el("div", { class: "stack" },
      el("h2", { text: "Household settings" }),
      field("Name", name),
      el("button", { class: "btn primary", type: "button", text: "Save name", onclick: () => { updateHousehold(h.id, { name: name.value }); closeSheet(); } }),
      el("h3", { text: "Who lives here" }),
      el("p", { class: "muted", text: peopleText(h) }),
      field("Add someone you live with", add, "They share this fridge and bar and can change them. People already in a household aren't listed."),
      el("button", { class: "btn", type: "button", text: "Add them", disabled: !free.length, onclick: () => {
        if (!add.value) return;
        updateHousehold(h.id, { members: [...(h.members || []), add.value] }); closeSheet();
      } }),
      confirmButton("Leave this household", (h.members || []).length > 1 ? "Tap again to leave" : "Tap again: this deletes its fridge and bar", () => {
        leaveHousehold(h); closeSheet(); location.hash = "#/bar";
      }),
      el("button", { class: "btn quiet block", type: "button", text: "Done", onclick: closeSheet })));
  });
}
