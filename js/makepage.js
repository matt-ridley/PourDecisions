/* #/make/<cocktail>[/<variant>]: making a cocktail. Follow the recipe, pick the bottles you used, change amounts, add or
   leave out ingredients, change the glass or garnish, and name it if you like. Anything different from the recipe is
   saved as a variant (see variants.js). Pick who's drinking: each gets a logged serving, and you're the maker of theirs.
   Bartender mode shows the recipe in big text with a checkbox per line and keeps the screen awake.
   Starting from a variant (/<variant>) fills in its bottles and amounts: change anything and the new one is a remix of it. */
import { el, fill, icon, toast, openSheet, closeSheet, avatar } from "./ui.js";
import { store, uid, memberName, saveLog, deleteLog, saveVariant, takeOut } from "./cloud.js";
import { householdOf, sourcesFor, makePours, levelText, fridgeCount } from "./stock.js";
import { ML_PER_OZ } from "./units.js";
import { itemById, rawItem, drinksFor, ingredientById, ingredientsOf, search, normalize, INGREDIENTS } from "./catalog.js";
import { COCKTAILS } from "./catalog/cocktails.js";
import { getUnits, setUnits, fmtAmount, fmtVolume, standardDrinks } from "./units.js";
import { recipeVolume, recipeAbv, lastPlace, resolvePlace } from "./logs.js";
import { shrinkPhoto } from "./photo.js";
import { startRows, buildVariant, variantRecipe, variantTitle, changeWords, rowName, makersOf, cleanVariantName, MAX_NAME,
  MAX_ROWS, stepAmount, addedRow, bottleChoices, servingsFor, makeLogs, variantDoc } from "./variants.js";

const GLASSES = [...new Set(COCKTAILS.map(c => c.glass))].sort();
const SERVINGS = [[1, "1"], [2, "×2"], [4, "×4"], [8, "Pitcher (8)"]];
const stdText = n => `${n} standard drink${n === 1 ? "" : "s"}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function renderMake(main, id, fromId) {
  const item = itemById("cocktail", id);
  if (!item) return fill(main, el("div", { class: "card" }, el("p", { text: "That cocktail isn't in the list." })));
  const recipe = item.data, me = uid();
  const from = fromId ? itemById("variant", fromId) : null;
  const start = from && from.base === recipe.id ? from.data : null;

  // What's being made. slots: one per recipe row (null = left out); added: extra rows. baseIng remembers a row's
  // original choices, so a picked bottle can be swapped back to "any rye or bourbon".
  const s = {
    slots: startRows(recipe).map(r => ({ ...r, baseIng: r.ing })),
    added: [],
    glass: (start && start.glass) || recipe.glass,
    garnish: start && "garnish" in start ? start.garnish : recipe.garnish || "",
    drinkers: [me], servings: 0, // 0 = one per person drinking
    offFeed: false, // your own drink only; drinks made for friends are theirs to show
  };
  if (start) {
    s.slots = s.slots.map(r => {
      const v = start.ingredients.find(x => x.slot === r.slot);
      return v ? { ...v, baseIng: r.baseIng } : null;
    });
    s.added = start.ingredients.filter(x => x.slot == null).map(x => ({ ...x, baseIng: x.ing }));
  }
  const rows = () => [...s.slots.filter(Boolean), ...s.added];
  const build = () => buildVariant(recipe, rows(), { glass: s.glass, garnish: s.garnish, name: nameIn.value, from: start ? from.id : null });
  const existingOf = v => v && itemById("variant", v.id); // follows merges to the variant kept
  const servings = () => servingsFor(s.servings, s.drinkers);
  // Your household's bar and fridge: their bottles come first in the picker, and what you pour comes out of them.
  const hh = (householdOf(store.households, me) || {}).id;
  const homeOf = drinkId => sourcesFor(store.stock, hh, drinkId).sort((a, b) => (a.where === "bar" ? 0 : 1) - (b.where === "bar" ? 0 : 1))[0];
  const homeText = e => e.where === "bar" ? `In your bar · ${levelText(e)}` : `In your fridge · ${fridgeCount(e)}`;

  /* ---------- Ingredients ---------- */
  const units = () => getUnits();
  const rowsBox = el("ul", { class: "make-list" });
  const leftOut = el("div", { class: "chips" });
  const drawRows = () => {
    const n = servings();
    fill(rowsBox, ...s.slots.map((r, k) => r ? rowLine(r, n, () => { s.slots[k] = null; changed(); }) : null),
      ...s.added.map((r, k) => rowLine(r, n, () => { s.added.splice(k, 1); changed(); })));
    const gone = recipe.ingredients.map((x, k) => s.slots[k] ? null : el("button", { type: "button", class: "chip-btn",
      onclick: () => { s.slots[k] = { ...startRows(recipe)[k], baseIng: x.ing }; changed(); } }, `+ ${x.item.replace(/ \(optional\)$/, "")}`)).filter(Boolean);
    fill(leftOut, gone.length ? el("span", { class: "muted small", text: "Left out:" }) : null, ...gone);
    addBtn.disabled = rows().length >= MAX_ROWS;
  };

  function rowLine(r, n, remove) {
    const name = rowName(recipe, r);
    const amount = r.oz != null
      ? el("div", { class: "stepper", role: "group", "aria-label": `Amount of ${name}` },
          el("button", { type: "button", class: "step-btn", "aria-label": "Less", text: "−", onclick: () => { r.oz = stepAmount(r.oz, -1, units()); changed(); } }),
          el("b", { class: "step-val", text: fmtAmount(r.oz * n, units()) }),
          el("button", { type: "button", class: "step-btn", "aria-label": "More", text: "+", onclick: () => { r.oz = stepAmount(r.oz, 1, units()); changed(); } }))
      : qtyInput(r, n);
    const pickable = (r.baseIng || r.ing).some(id => drinksFor(id).length);
    const label = pickable
      ? el("button", { type: "button", class: "make-name", onclick: () => bottleSheet(r) },
          el("b", { text: name }), el("span", { class: "muted small", text: r.drinkId ? (homeOf(r.drinkId) ? `Change bottle · ${homeText(homeOf(r.drinkId))}` : "Change bottle") : "Pick the bottle" }))
      : el("span", { class: "make-name" }, el("b", { text: name }));
    return el("li", { class: "make-row" }, amount, label,
      el("button", { type: "button", class: "icon-x", "aria-label": `Leave out ${name}`, text: "×", onclick: remove }));
  }

  function qtyInput(r, n) {
    const q = el("input", { type: "text", class: "qty-input", maxlength: 20, value: r.qty || "", "aria-label": "How much" });
    q.addEventListener("input", () => { r.qty = q.value; drawSummary(); });
    return el("div", { class: "stepper qty" }, q, n > 1 ? el("span", { class: "muted small", text: `×${n}` }) : null);
  }

  /* Pick the bottle for a row: "any" for each of the recipe's choices, then bottles (yours first). */
  function bottleSheet(r) {
    openSheet(box => {
      const base = r.baseIng || r.ing;
      const q = el("input", { type: "search", placeholder: "Search bottles", autocomplete: "off", "data-focus": "" });
      const list = el("ul", { class: "item-list" });
      // Bottles you have at home first (keeping the usual order within each group).
      const choices = bottleChoices({ ing: base }, { logs: store.logs, variants: store.variants, uid: me })
        .map((c, k) => ({ c, k, home: homeOf(c.item.id) })).sort((a, b) => (a.home ? 0 : 1) - (b.home ? 0 : 1) || a.k - b.k)
        .map(x => ({ ...x.c, home: x.home }));
      const pick = fn => () => { fn(); closeSheet(); changed(); };
      // "Any rye or bourbon" (as written), then "Any rye", "Any bourbon": no particular bottle.
      const lower = id => { const g = ingredientById(id); return g.proper ? g.name : g.name.toLowerCase(); };
      const anys = [...(base.length > 1 ? [base] : []), ...base.map(id => [id])];
      const draw = () => {
        const t = normalize(q.value), words = t.split(" ").filter(Boolean);
        const hits = choices.filter(c => words.every(w => c.item.haystack.includes(w)));
        fill(list,
          ...(t ? [] : anys.map(ing => el("li", {}, el("button", { type: "button", class: "item-row plain",
            "aria-pressed": String(!r.drinkId && r.ing.join() === ing.join()),
            onclick: pick(() => { delete r.drinkId; r.ing = ing; }) },
            el("span", { class: "item-icon", text: "✨" }),
            el("span", { class: "grow" }, el("b", { text: `Any ${ing.map(lower).join(" or ")}` }),
              el("span", { class: "muted small", text: "No particular bottle" })))))),
          ...hits.slice(0, 40).map(c => el("li", {}, el("button", { type: "button", class: "item-row plain",
            "aria-pressed": String(r.drinkId === c.item.id), onclick: pick(() => { r.drinkId = c.item.id; r.ing = [c.ing]; }) },
            el("span", { class: "item-icon", text: c.item.category.icon }),
            el("span", { class: "grow" }, el("b", { text: c.item.title }),
              el("span", { class: "muted small", text: [c.home ? `🏠 ${homeText(c.home)}` : "", c.item.style.name, `${c.item.data.approx ? "~" : ""}${c.item.data.abv}%`].filter(Boolean).join(" · ") }))))),
          hits.length > 40 ? el("li", { class: "hint", text: `Showing 40 of ${hits.length}. Type to narrow it down.` }) : null,
          !hits.length && t ? el("li", { class: "muted", text: "No bottle in the list matches. Add it from the Log tab first." }) : null);
      };
      q.addEventListener("input", draw);
      draw();
      box.append(el("div", { class: "stack" }, el("h2", { text: rowName(recipe, r) }), q, list,
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet })));
    });
  }

  /* Add an ingredient: any recipe ingredient (bitters, a syrup, a juice) or a bottle from the list. */
  function addSheet() {
    openSheet(box => {
      const q = el("input", { type: "search", placeholder: "Bitters, maple syrup, a bottle…", autocomplete: "off", "data-focus": "" });
      const list = el("ul", { class: "item-list" });
      const ings = [...INGREDIENTS].sort((a, b) => a.name.localeCompare(b.name));
      const add = row => () => { s.added.push({ ...row, baseIng: row.ing }); closeSheet(); changed(); };
      const draw = () => {
        const t = normalize(q.value), words = t.split(" ").filter(Boolean);
        const gs = ings.filter(g => words.every(w => normalize(g.name).includes(w))).slice(0, t ? 12 : 60);
        const bottles = t ? search(q.value).filter(i => i.kind === "drink").slice(0, 15) : [];
        fill(list,
          ...gs.map(g => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: add(addedRow(g.id)) },
            el("span", { class: "item-icon", text: "➕" }), el("b", { class: "grow", text: g.name })))),
          ...bottles.map(i => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: add(addedRow(ingredientsOf(i.data)[0], i.id)) },
            el("span", { class: "item-icon", text: i.category.icon }),
            el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: i.style.name }))))),
          !gs.length && !bottles.length ? el("li", { class: "muted", text: "Nothing matches that." }) : null);
      };
      q.addEventListener("input", draw);
      draw();
      box.append(el("div", { class: "stack" }, el("h2", { text: "Add an ingredient" }), q, list,
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet })));
    });
  }
  const addBtn = el("button", { type: "button", class: "btn block", text: "+ Add an ingredient", onclick: addSheet });

  const unitsSeg = el("div", { class: "seg small", role: "group", "aria-label": "Units" });
  const drawUnits = () => fill(unitsSeg, ...[["oz", "oz"], ["ml", "ml"]].map(([k, label]) =>
    el("button", { type: "button", "aria-pressed": String(getUnits() === k), text: label, onclick: () => { setUnits(k); drawUnits(); drawRows(); drawSummary(); } })));

  /* ---------- Glass and garnish ---------- */
  const glassIn = el("select", { "aria-label": "Glass" }, ...GLASSES.map(g => el("option", { value: g, text: g })));
  glassIn.value = s.glass;
  glassIn.addEventListener("change", () => { s.glass = glassIn.value; drawSummary(); });
  const garnishIn = el("input", { type: "text", maxlength: 80, value: s.garnish, placeholder: "No garnish", "aria-label": "Garnish" });
  garnishIn.addEventListener("input", () => { s.garnish = garnishIn.value; drawSummary(); });

  /* ---------- Who's drinking, and how many ---------- */
  const whoBox = el("div", { class: "chips", role: "group", "aria-label": "Who's drinking" });
  const people = () => [...store.members.values()].filter(m => !m.suspended)
    .sort((a, b) => (b.id === me) - (a.id === me) || a.displayName.localeCompare(b.displayName));
  const drawWho = () => fill(whoBox, ...people().map(m => el("button", { type: "button", class: "chip-btn who",
    "aria-pressed": String(s.drinkers.includes(m.id)),
    onclick: () => {
      s.drinkers = s.drinkers.includes(m.id) ? s.drinkers.filter(x => x !== m.id) : [...s.drinkers, m.id];
      drawWho(); drawServings(); drawRows(); drawSave();
    } }, avatar(m, "xs"), m.id === me ? "Me" : m.displayName)));
  const servBox = el("div", { class: "chips", role: "group", "aria-label": "Servings" });
  const drawServings = () => fill(servBox,
    el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.servings), onclick: () => { s.servings = 0; drawServings(); drawRows(); } },
      el("b", { text: "One each" }), el("span", { text: plural(Math.max(1, s.drinkers.length), "serving") })),
    ...SERVINGS.map(([n, label]) => el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.servings === n),
      onclick: () => { s.servings = n; drawServings(); drawRows(); } }, el("b", { text: label }), el("span", { text: plural(n, "serving") }))));

  /* ---------- What it is: the recipe as written, a new variant, or one the group already made ---------- */
  const summary = el("section", { class: "card stack" });
  const nameIn = el("input", { type: "text", maxlength: MAX_NAME, placeholder: "e.g. The Basement Sour", autocapitalize: "words", "aria-label": "Name it" });
  nameIn.addEventListener("input", () => drawSummary(true));
  const nameField = el("label", { class: "field" }, el("span", { class: "field-label", text: "Name it (optional)" }), nameIn,
    el("span", { class: "hint", text: "Leave it empty and it's named from what you changed." }));
  const summaryText = el("div", { class: "stack" });
  summary.append(summaryText, nameField);
  const drawSummary = (keepName = false) => {
    const v = build(), have = existingOf(v);
    const shown = have ? { ...have.data, id: have.id } : v;
    const r = shown ? variantRecipe(recipe, shown) : recipe, ml = recipeVolume(r), abv = recipeAbv(r);
    const strength = el("p", { class: "muted small", text: `Each: ${fmtVolume(ml, getUnits())} at about ${abv}% = ${stdText(standardDrinks(ml, abv))}` });
    nameField.hidden = !v || !!have;
    if (keepName && v && !have) return; // typing a name doesn't change anything else shown
    if (!v) return fill(summaryText, el("h3", { text: "The recipe as written" }),
      el("p", { class: "muted", text: "Pick a bottle or change anything and it becomes your own variant." }), strength);
    const words = changeWords(recipe, v);
    const makers = have ? makersOf(store.logs, have.id) : [];
    fill(summaryText,
      el("h3", { text: have ? variantTitle(recipe, have.data) : "A new variant" }),
      have ? el("p", { class: "note small", text: [`Already in the group's list${have.data.by ? `, first made by ${have.data.by === me ? "you" : memberName(have.data.by)}` : ""}.`,
        makers.length ? `Made ${plural(makers.reduce((t, m) => t + m.count, 0), "time")}.` : ""].filter(Boolean).join(" ") }) : null,
      el("ul", { class: "changes" }, ...words.map(w => el("li", { text: w }))),
      strength);
  };

  /* ---------- Method and bartender mode ---------- */
  const method = el("section", { class: "card stack" },
    el("div", { class: "row spread" }, el("h3", { text: "Method" }),
      el("button", { type: "button", class: "btn small", text: "🍸 Bartender mode", onclick: () => bartender() })),
    el("ol", { class: "steps" }, ...recipe.steps.map(t => el("li", { text: t }))));

  function bartender() {
    const n = servings(), lines = rows().map(r => `${r.oz != null ? fmtAmount(r.oz * n, getUnits()) : `${r.qty}${n > 1 ? ` ×${n}` : ""}`}  ${rowName(recipe, r)}`);
    const tick = text => el("button", { type: "button", class: "bt-line", "aria-pressed": "false",
      onclick: e => { const b = e.currentTarget; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); } }, el("span", { class: "bt-box" }), el("span", { text }));
    const ov = el("div", { class: "bartender", role: "dialog", "aria-modal": "true", "aria-label": "Bartender mode" },
      el("div", { class: "bt-head" }, el("h2", { text: recipe.name }),
        el("p", { text: [n > 1 ? plural(n, "serving") : "", s.glass, s.garnish ? `Garnish: ${s.garnish}` : ""].filter(Boolean).join(" · ") })),
      el("h3", { text: "Pour" }), el("div", { class: "bt-list" }, ...lines.map(tick)),
      el("h3", { text: "Then" }), el("div", { class: "bt-list" }, ...recipe.steps.map(tick)),
      el("div", { class: "bt-foot" },
        el("button", { type: "button", class: "btn", text: "Close", onclick: () => close() }),
        el("button", { type: "button", class: "btn primary", text: "Done, log it", onclick: () => { close(); save(); } })));
    let lock = null, open = true;
    const getLock = async () => { try { if (open && navigator.wakeLock) lock = await navigator.wakeLock.request("screen"); } catch {} };
    const onVis = () => { if (document.visibilityState === "visible") getLock(); };
    const close = () => {
      open = false; ov.remove(); document.body.classList.remove("locked");
      document.removeEventListener("visibilitychange", onVis); window.removeEventListener("hashchange", close);
      if (lock) lock.release().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("hashchange", close);
    document.body.append(ov); document.body.classList.add("locked");
    getLock();
  }

  /* ---------- A photo (optional): kept with your own log, and shown on the variant's page ---------- */
  let pics = null;
  const photoIn = el("input", { type: "file", accept: "image/*", hidden: true });
  const photoBox = el("div", { class: "photo-pick" });
  const drawPhoto = () => fill(photoBox, pics
    ? el("div", { class: "photo-preview" }, el("img", { src: pics.thumb, alt: "Your photo" }),
        el("button", { class: "btn small", type: "button", text: "Remove", onclick: () => { pics = null; drawPhoto(); } }))
    : el("button", { class: "btn block", type: "button", onclick: () => photoIn.click() }, "📷 Add a photo"));
  photoIn.addEventListener("change", async () => {
    const f = photoIn.files && photoIn.files[0];
    photoIn.value = "";
    if (!f) return;
    try { pics = await shrinkPhoto(f); drawPhoto(); }
    catch (e) { console.warn(e); toast("That photo couldn't be read. Try another one."); }
  });
  drawPhoto();

  /* ---------- Saving ---------- */
  const msg = el("p", { class: "msg err", role: "alert" });
  const saveBtn = el("button", { type: "button", class: "btn primary block", onclick: () => save() });
  const drawSave = () => {
    const others = s.drinkers.filter(x => x !== me).length;
    saveBtn.textContent = !s.drinkers.length ? "Log it 🍹" : others ? `Log it for ${plural(s.drinkers.length, "person", "people")} 🍹` : "Log it 🍹";
  };

  function save() {
    if (!s.drinkers.length) { msg.textContent = "Who's drinking? Pick at least one person."; return; }
    if (rows().some(r => r.oz == null && !String(r.qty || "").trim())) { msg.textContent = "Say how much of each ingredient, or leave it out."; return; }
    const v = build(), have = existingOf(v), now = Date.now();
    if (v && !rawItem("variant", v.id)) saveVariant(v.id, variantDoc(v, me, now));
    const variant = have ? { ...have.data, id: have.id } : v;
    const placeId = lastPlace(store.logs, me);
    const logs = makeLogs({ recipe, variant, drinkers: s.drinkers, me, at: now, placeId: placeId ? (resolvePlace(store.places, placeId) || { id: placeId }).id : null })
      .map(f => f.uid === me && s.offFeed ? { ...f, offFeed: true } : f);
    // Picked bottles in your bar lose what was poured (a beer from the fridge, one per serving). Bottles emptied go on
    // your own drink, or the first one when you're making for others: whoever pours gets the credit.
    const taken = makePours(rows(), servings(), store.stock, hh, ML_PER_OZ)
      .map(p => ({ p, t: takeOut(p.entry, { ml: p.ml, n: p.n }) })).filter(x => x.t);
    const killed = taken.filter(x => x.t.killed).map(x => x.p.drinkId);
    if (killed.length) { const k = logs.findIndex(f => f.uid === me); logs[k < 0 ? 0 : k].killed = killed; }
    // The photo goes with your own drink only: a friend couldn't delete their log if it carried your photo.
    const ids = logs.map(f => saveLog(f, f.uid === me ? pics : null));
    const title = variant ? variantTitle(recipe, variant) : recipe.name;
    const done = ids.length > 1 ? `${title} logged for ${plural(ids.length, "person", "people")} 🍹` : `${title} logged 🍹`;
    toast(killed.length ? `${done} You killed the bottle! 🍾` : done,
      { label: "Undo", run: () => { ids.forEach(deleteLog); taken.forEach(x => x.t.undo()); } });
    location.hash = "#/home";
  }

  function changed() { msg.textContent = ""; drawRows(); drawSummary(); }

  drawUnits(); drawRows(); drawWho(); drawServings(); drawSummary(); drawSave();
  fill(main,
    el("section", { class: "card log-head" },
      el("span", { class: "item-icon", text: "🍸" }),
      el("div", { class: "grow" }, el("h2", { text: `Make a ${recipe.name}` }),
        el("p", { class: "muted small", text: start ? `Starting from ${variantTitle(recipe, start)}` : `${item.style.name} · ${recipe.method}` })),
      el("a", { class: "btn small", href: `#/recipe/${recipe.id}`, text: "Recipe" })),
    el("section", { class: "card stack" },
      el("div", { class: "row spread" }, el("h3", { text: "Ingredients" }), unitsSeg),
      el("p", { class: "hint", text: hh ? "Tap a bottle to pick the one you're using: yours at home come first, and what you pour comes out of them. − and + change the amount; × leaves it out."
        : "Tap a bottle to pick the one you're using. − and + change the amount; × leaves it out." }),
      rowsBox, leftOut, addBtn),
    el("section", { class: "card stack" }, el("h3", { text: "Glass and garnish" }),
      el("label", { class: "field" }, el("span", { class: "field-label", text: "Glass" }), glassIn),
      el("label", { class: "field" }, el("span", { class: "field-label", text: "Garnish" }), garnishIn)),
    method,
    el("section", { class: "card stack" }, el("h3", { text: "Who's drinking?" }), whoBox,
      el("p", { class: "hint", text: "Each person gets one logged. Drinks you make for friends show you as the maker." }),
      el("h3", { text: "How many to make" }), servBox),
    summary,
    el("section", { class: "card stack" }, el("h3", { text: "Photo" }), photoBox, photoIn,
      el("p", { class: "hint", text: "Optional. It goes with your own drink and shows on the variant's page." })),
    el("section", { class: "card stack" }, el("label", { class: "check" },
      el("input", { type: "checkbox", onchange: e => { s.offFeed = e.target.checked; } }), el("span", {}, "🙈 Keep my drink off the feed")),
      el("p", { class: "hint", text: "Your drink still counts in your stats. The group just doesn't see it in the feed or on your profile." })),
    msg, saveBtn);
}
