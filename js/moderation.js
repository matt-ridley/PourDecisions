/* Catalogue moderation (admins): new drinks to check, fixing any drink's details, merging duplicates, styles and
   places. The page is #/catalog; the drink page also gets Fix and Merge buttons for admins. */
import { el, fill, field, openSheet, closeSheet, toast, confirmButton, fmtDay } from "./ui.js";
import { store, isAdmin, memberName, checkDrink, updateMemberDrink, saveFix, mergeDrink, unmergeDrink, deleteMemberDrink,
  saveStyle, resetStyle, renamePlace, mergePlace, unmergePlace } from "./cloud.js";
import { search, rawItem, itemById, everyItem, memberDrinks, fixOf, builtInDrink, FIX_FIELDS, styleOf, aboutStyle, ingredientsOf,
  originName, INGREDIENTS } from "./catalog.js";
import { CATEGORIES, isBuiltInStyle, builtInStyleName } from "./catalog/styles.js";
import { ORIGINS } from "./catalog/drinks.js";
import { slug } from "./catalog/make.js";
import { resolvePlace } from "./logs.js";

const BOTTLE_KINDS = ["spirit", "liqueur", "wine", "beer"];
const plural = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;
const logCount = id => store.logs.filter(l => l.kind === "drink" && l.drinkId === id).length;
const abvText = d => `${d.approx ? "~" : ""}${d.abv}%`;
const drinkLink = i => el("a", { href: `#/drink/${i.id}`, text: i.title });

/* New drinks members added that no admin has looked at yet, newest first. */
export const toCheck = () => memberDrinks().filter(i => !i.data.checked && !i.mergedInto).sort((a, b) => (b.data.at || 0) - (a.data.at || 0));

/* ---------- Style picker shared by the forms ---------- */
function stylePicker(current) {
  const catOf = id => (styleOf(id) || { category: CATEGORIES[0] }).category.id;
  const cat = el("select", { "aria-label": "Category" }, ...CATEGORIES.filter(c => c.id !== "cocktail").map(c => el("option", { value: c.id, text: `${c.icon} ${c.name}` })));
  const style = el("select", { "aria-label": "Style" });
  cat.value = catOf(current);
  const fillStyles = () => fill(style, ...CATEGORIES.find(c => c.id === cat.value).families.map(f =>
    el("optgroup", { label: f.name }, ...f.styles.map(st => el("option", { value: st.id, text: st.name })))));
  cat.addEventListener("change", fillStyles);
  fillStyles();
  if (current) style.value = current;
  return { cat, style };
}

/* ---------- Fix a drink's details ---------- */
export function editDrinkSheet(item) {
  const d = item.data, base = item.member ? null : builtInDrink(item.id);
  openSheet(box => {
    const brand = el("input", { type: "text", maxlength: 60, value: d.brand || "", "data-focus": "" });
    const name = el("input", { type: "text", maxlength: 80, value: d.name || "" });
    const variant = el("input", { type: "text", maxlength: 40, value: d.variant || "" });
    const { cat, style } = stylePicker(d.style);
    const abv = el("input", { type: "number", inputmode: "decimal", min: "0", max: "80", step: "0.1", value: d.abv });
    const approx = el("input", { type: "checkbox", checked: d.approx ? "" : null });
    const origin = el("select", {}, el("option", { value: "", text: "Not sure / many places" }), ...Object.entries(ORIGINS).map(([k, v]) => el("option", { value: k, text: v })));
    origin.value = d.origin || "";
    const town = el("input", { type: "text", maxlength: 60, value: d.town || "" });
    // Extra recipe ingredients this drink counts as, on top of what its style already gives it.
    let ing = [...(d.ing || [])];
    const ingBox = el("div", { class: "stack" });
    const fromStyle = () => ingredientsOf({ ...d, style: style.value, ing: [] });
    const drawIng = () => {
      const auto = fromStyle(), name = id => (INGREDIENTS.find(g => g.id === id) || { name: id }).name;
      const add = el("select", { "aria-label": "Add an ingredient" }, el("option", { value: "", text: "Also counts as…" }),
        ...INGREDIENTS.filter(g => BOTTLE_KINDS.includes(g.kind) && !auto.includes(g.id) && !ing.includes(g.id)).map(g => el("option", { value: g.id, text: g.name })));
      add.addEventListener("change", () => { if (add.value) { ing.push(add.value); drawIng(); } });
      fill(ingBox,
        el("p", { class: "hint", text: auto.length ? `From its style it already counts as: ${auto.map(name).join(", ")}.` : "Its style doesn't make it count as any recipe ingredient." }),
        ing.length ? el("div", { class: "chips" }, ...ing.map(id => el("button", { type: "button", class: "chip-btn tag", "aria-pressed": "true",
          "aria-label": `Remove ${name(id)}`, onclick: () => { ing = ing.filter(x => x !== id); drawIng(); } }, `${name(id)} ×`))) : null,
        add);
    };
    style.addEventListener("change", drawIng);
    cat.addEventListener("change", drawIng);
    drawIng();
    const msg = el("p", { class: "msg err", role: "alert" });
    const form = el("form", { class: "stack" },
      el("h2", { text: "Fix details" }),
      el("p", { class: "hint", text: item.member ? `Added by ${memberName(d.by)}. Saving also marks it checked.`
        : "A built-in drink. Your fix is laid over the built-in list for everyone, and can be undone." }),
      field("Brand or maker", brand), field("Name", name), field("Flavour", variant), field("Category", cat), field("Style", style),
      field("Alcohol %", abv),
      item.member ? null : el("label", { class: "check" }, approx, el("span", { text: "Approximate (varies by batch, or not checked against a label)" })),
      field("Where it's from", origin), item.member ? null : field("Town (optional)", town),
      el("div", { class: "field" }, el("span", { class: "field-label", text: "Recipe ingredients" }), ingBox),
      msg,
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })),
      !item.member && fixOf(item.id) && Object.keys(fixOf(item.id)).some(k => FIX_FIELDS.includes(k))
        ? confirmButton("Undo all fixes to this drink", "Tap again to undo", () => { saveFix(item.id, {}); closeSheet(); toast("Back to the built-in details."); }, "btn danger block") : null);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const a = Number(abv.value);
      if (!brand.value.trim()) { msg.textContent = "Enter the brand or maker."; return; }
      if (abv.value === "" || !(a >= 0 && a <= 80)) { msg.textContent = "Enter the alcohol % (0 to 80)."; return; }
      const next = { brand: brand.value.trim(), name: name.value.trim(), variant: variant.value.trim(), style: style.value, abv: Math.round(a * 10) / 10,
        approx: approx.checked, origin: origin.value, town: town.value.trim(), ing };
      if (item.member) updateMemberDrink(item.id, next);
      else {
        // Only what differs from the built-in drink is saved.
        const fix = {};
        for (const k of FIX_FIELDS) {
          const was = k === "ing" ? [] : k === "approx" ? !!base.approx : base[k] == null ? "" : base[k];
          const now = next[k];
          if (k === "ing" ? now.length : now !== was) fix[k] = now;
        }
        saveFix(item.id, fix);
      }
      closeSheet();
      toast("Saved for everyone.");
    });
    box.append(form);
  });
}

/* ---------- Merge a duplicate into the drink to keep ---------- */
export function mergeSheet(item) {
  openSheet(box => {
    const q = el("input", { type: "search", placeholder: "Search for the drink to keep", value: item.data.brand || "", "data-focus": "", autocomplete: "off" });
    const list = el("ul", { class: "item-list" });
    const draw = () => fill(list, ...search(q.value).filter(i => i.kind === "drink" && i.id !== item.id).slice(0, 20).map(i =>
      el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => confirmMerge(item, i) },
        el("span", { class: "item-icon", text: i.category.icon }),
        el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: `${i.style.name} · ${abvText(i.data)}${i.member ? " · added by a member" : ""}` }))))));
    q.addEventListener("input", draw);
    draw();
    box.append(el("div", { class: "stack" },
      el("h2", { text: `Merge ${item.title}` }),
      el("p", { class: "hint", text: "Pick the drink to keep. This one is hidden from the list, and its logs show and count as the one kept. Nobody's logs change, and you can undo it." }),
      q, list, el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

function confirmMerge(item, keep) {
  const n = logCount(item.id);
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: "Merge these?" }),
    el("p", {}, el("b", { text: item.title }), " will be hidden, and ", el("b", { text: plural(n, "log") }), " of it will count as ", el("b", { text: keep.title }), "."),
    el("div", { class: "row" },
      el("button", { class: "btn", type: "button", text: "Back", onclick: () => mergeSheet(item) }),
      el("button", { class: "btn primary", type: "button", text: "Merge", onclick: () => {
        mergeDrink(item, keep.id); closeSheet(); toast(`Merged into ${keep.title}.`, { label: "Undo", run: () => unmergeDrink(item) });
        if (location.hash === `#/drink/${item.id}`) location.hash = `#/drink/${keep.id}`;
      } })))));
}

/* Admin buttons at the bottom of a drink page. */
export function adminDrinkTools(item) {
  if (!isAdmin() || item.kind !== "drink") return null;
  const raw = rawItem("drink", item.id) || item;
  return el("section", { class: "card stack admin-tools" },
    el("h3", { text: "Admin" }),
    raw.member ? el("p", { class: "hint", text: `Added by ${memberName(raw.data.by)} on ${fmtDay(raw.data.at || 0)}${raw.data.checked ? " · checked" : " · not checked yet"}.` })
      : raw.fixed ? el("p", { class: "hint", text: "Built-in drink, with fixes from an admin." }) : el("p", { class: "hint", text: "Built-in drink." }),
    el("div", { class: "row" },
      raw.member && !raw.data.checked ? el("button", { class: "btn small", type: "button", text: "Looks good", onclick: () => { checkDrink(raw.id); toast("Checked."); } }) : null,
      el("button", { class: "btn small", type: "button", text: "Fix details", onclick: () => editDrinkSheet(raw) }),
      el("button", { class: "btn small", type: "button", text: "Merge into…", onclick: () => mergeSheet(raw) })));
}

/* ---------- Styles ---------- */
function styleSheet(id = null) {
  const existing = id && styleOf(id);
  openSheet(box => {
    const picker = existing ? null : (() => {
      const cat = el("select", { "aria-label": "Category" }, ...CATEGORIES.map(c => el("option", { value: c.id, text: `${c.icon} ${c.name}` })));
      const fam = el("select", { "aria-label": "Family" });
      const fillFam = () => fill(fam, ...CATEGORIES.find(c => c.id === cat.value).families.map(f => el("option", { value: f.id, text: f.name })));
      cat.addEventListener("change", fillFam);
      fillFam();
      return { cat, fam };
    })();
    const name = el("input", { type: "text", maxlength: 40, value: existing ? existing.style.name : "", "data-focus": "", placeholder: "e.g. Cold IPA" });
    const about = el("textarea", { rows: 3, maxlength: 200, value: existing ? aboutStyle(id) : "", placeholder: "A sentence or two about it." });
    const msg = el("p", { class: "msg err", role: "alert" });
    const builtIn = existing && isBuiltInStyle(id);
    const form = el("form", { class: "stack" },
      el("h2", { text: existing ? `Edit ${existing.style.name}` : "Add a style" }),
      builtIn ? el("p", { class: "hint", text: `Built-in name: ${builtInStyleName(id)}.` }) : null,
      picker ? field("Category", picker.cat) : null, picker ? field("Family", picker.fam) : null,
      field("Name", name), field("Description", about, "Shown at the top of the style's page."),
      msg,
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })),
      builtIn && store.styles.some(s => s.id === id) ? confirmButton("Back to the built-in name and description", "Tap again", () => { resetStyle(id); closeSheet(); }, "btn danger block") : null);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const n = name.value.trim();
      if (!n) { msg.textContent = "Give it a name."; return; }
      if (existing) {
        saveStyle(id, builtIn ? { name: n === builtInStyleName(id) ? "" : n, about: about.value } : { name: n, about: about.value, family: (store.styles.find(s => s.id === id) || {}).family });
      } else {
        const newId = slug(n).slice(0, 40);
        if (!newId || styleOf(newId)) { msg.textContent = "There's already a style with that name."; return; }
        saveStyle(newId, { name: n, about: about.value, family: `${picker.cat.value}/${picker.fam.value}` });
      }
      closeSheet();
      toast("Saved for everyone.");
    });
    box.append(form);
  });
}

function pickStyleSheet() {
  openSheet(box => {
    const { cat, style } = stylePicker(null);
    box.append(el("div", { class: "stack" },
      el("h2", { text: "Rename a style" }), field("Category", cat), field("Style", style),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "button", text: "Next", onclick: () => styleSheet(style.value) }))));
  });
}

/* ---------- Places ---------- */
function placeSheet(p) {
  openSheet(box => {
    const name = el("input", { type: "text", maxlength: 60, value: p.name, "data-focus": "" });
    const into = el("select", {}, el("option", { value: "", text: "Merge it into…" }),
      ...store.places.filter(x => x.id !== p.id && !x.mergedInto).sort((a, b) => a.name.localeCompare(b.name)).map(x => el("option", { value: x.id, text: x.name })));
    const form = el("form", { class: "stack" },
      el("h2", { text: p.name }),
      field("Name", name),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Rename" })),
      field("Or merge it into another place", into, "Its logs will show the other place. You can undo it."),
      el("button", { class: "btn block", type: "button", text: "Merge", onclick: () => {
        if (!into.value) return into.focus();
        mergePlace(p.id, into.value); closeSheet(); toast("Places merged.", { label: "Undo", run: () => unmergePlace(p.id) });
      } }));
    form.addEventListener("submit", e => { e.preventDefault(); if (!name.value.trim()) return name.focus(); renamePlace(p.id, name.value); closeSheet(); });
    box.append(form);
  });
}

/* ---------- #/catalog ---------- */
export function renderCatalogAdmin(main) {
  if (!isAdmin()) return fill(main, el("div", { class: "card" }, el("p", { text: "Only group admins can open this page." })));
  const queue = toCheck();
  const merged = everyItem().filter(i => i.mergedInto);
  const fixed = everyItem().filter(i => i.fixed && !i.mergedInto && Object.keys(fixOf(i.id) || {}).some(k => FIX_FIELDS.includes(k)));
  const added = memberDrinks().filter(i => !i.mergedInto && i.data.checked).sort((a, b) => a.title.localeCompare(b.title));
  const custom = store.styles.map(s => ({ s, st: styleOf(s.id) })).filter(x => x.st);
  const places = [...store.places].sort((a, b) => a.name.localeCompare(b.name));
  // A place's logs include those of places merged into it.
  const placeLogs = id => store.logs.filter(l => l.placeId && (resolvePlace(store.places, l.placeId) || {}).id === id).length;

  fill(main,
    el("h2", { class: "page-title", text: "Drink list" }),
    el("p", { class: "muted", text: "Keep the shared list tidy: check drinks members add, fix details, merge duplicates, and look after styles and places." }),

    el("section", { class: "card stack" },
      el("h3", { text: `New drinks to check (${queue.length})` }),
      queue.length ? el("ul", { class: "mod-list" }, ...queue.map(i => el("li", { class: "stack" },
        el("div", {}, el("b", {}, drinkLink(i)),
          el("div", { class: "muted small", text: [i.style.name, abvText(i.data), originName(i.data.origin)].filter(Boolean).join(" · ") }),
          el("div", { class: "muted small", text: `Added by ${memberName(i.data.by)} on ${fmtDay(i.data.at || 0)} · ${plural(logCount(i.id), "log")}` })),
        el("div", { class: "row" },
          el("button", { class: "btn small", type: "button", text: "Looks good", onclick: () => { checkDrink(i.id); toast(`${i.title} checked.`); } }),
          el("button", { class: "btn small", type: "button", text: "Fix", onclick: () => editDrinkSheet(i) }),
          el("button", { class: "btn small", type: "button", text: "Merge", onclick: () => mergeSheet(i) }),
          logCount(i.id) ? null : confirmButton("Delete", "Sure?", () => { deleteMemberDrink(i.id); toast("Deleted."); }, "btn small danger")))))
        : el("p", { class: "muted", text: "All caught up. 🍻" })),

    el("section", { class: "card stack" },
      el("h3", { text: `Merged (${merged.length})` }),
      merged.length ? el("ul", { class: "mod-list" }, ...merged.map(i => {
        const keep = itemById("drink", i.id);
        return el("li", { class: "row spread" },
          el("span", { class: "grow" }, el("b", { text: i.title }), " → ", keep ? drinkLink(keep) : "a drink that's gone",
            el("div", { class: "muted small", text: plural(logCount(i.id), "log") })),
          el("button", { class: "btn small", type: "button", text: "Undo", onclick: () => { unmergeDrink(i); toast(`${i.title} is back on the list.`); } }));
      })) : el("p", { class: "muted", text: "No duplicates merged yet. Use Merge on a new drink, or on any drink's page." })),

    el("section", { class: "card stack" },
      el("h3", { text: `Fixes to built-in drinks (${fixed.length})` }),
      fixed.length ? el("ul", { class: "mod-list" }, ...fixed.map(i => el("li", { class: "row spread" },
        el("span", { class: "grow" }, drinkLink(i), el("div", { class: "muted small", text: `Changed: ${Object.keys(fixOf(i.id)).filter(k => FIX_FIELDS.includes(k)).join(", ")}` })),
        el("button", { class: "btn small", type: "button", text: "Edit", onclick: () => editDrinkSheet(i) }))))
        : el("p", { class: "muted", text: "None yet. Open any drink and tap Fix details to correct it for everyone." })),

    el("section", { class: "card stack" },
      el("h3", { text: "Styles" }),
      el("div", { class: "row" },
        el("button", { class: "btn small", type: "button", text: "Add a style", onclick: () => styleSheet() }),
        el("button", { class: "btn small", type: "button", text: "Rename a style", onclick: pickStyleSheet })),
      custom.length ? el("ul", { class: "mod-list" }, ...custom.map(({ s, st }) => el("li", { class: "row spread" },
        el("span", { class: "grow" }, el("a", { href: `#/style/${s.id}`, text: st.style.name }),
          el("div", { class: "muted small", text: isBuiltInStyle(s.id) ? `Built-in, was ${builtInStyleName(s.id)}${s.name ? "" : " (description only)"}` : `New in ${st.category.name} › ${st.family.name}` })),
        el("button", { class: "btn small", type: "button", text: "Edit", onclick: () => styleSheet(s.id) }))))
        : el("p", { class: "hint", text: "Only admins can add or rename styles. New styles go under an existing family." })),

    el("section", { class: "card stack" },
      el("h3", { text: `Places (${places.filter(p => !p.mergedInto).length})` }),
      places.length ? el("ul", { class: "mod-list" }, ...places.map(p => el("li", { class: "row spread" },
        el("span", { class: "grow" }, el("b", { text: p.name }),
          el("div", { class: "muted small", text: p.mergedInto ? `Merged into ${(store.places.find(x => x.id === p.mergedInto) || { name: "a place that's gone" }).name}` : plural(placeLogs(p.id), "log") })),
        p.mergedInto ? el("button", { class: "btn small", type: "button", text: "Undo", onclick: () => unmergePlace(p.id) })
          : el("button", { class: "btn small", type: "button", text: "Edit", onclick: () => placeSheet(p) }))))
        : el("p", { class: "muted", text: "No places yet." })),

    added.length ? el("details", { class: "card fold" },
      el("summary", {}, el("b", { text: `Checked drinks members added (${added.length})` })),
      el("ul", { class: "mod-list" }, ...added.map(i => el("li", { class: "row spread" },
        el("span", { class: "grow" }, drinkLink(i), el("div", { class: "muted small", text: `${i.style.name} · ${abvText(i.data)} · by ${memberName(i.data.by)}` })),
        el("button", { class: "btn small", type: "button", text: "Fix", onclick: () => editDrinkSheet(i) }))))) : null);
}
