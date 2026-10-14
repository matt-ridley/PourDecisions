/* The Log tab: pick a drink, then size, rating, flavour, place, time, notes and an optional photo. Also a log's own
   page (#/l/<id>), editing it, adding a drink to the shared list, and the "Another one" shortcut. */
import { el, fill, icon, field, toast, openSheet, closeSheet, confirmButton, avatar, fmtDate, fmtAgo } from "./ui.js";
import { store, uid, isAdmin, memberName, saveLog, updateLog, deleteLog, addPlace, addDrink, loadThumb, loadPhoto } from "./cloud.js";
import { search, itemById, allItems } from "./catalog.js";
import { CATEGORIES } from "./catalog/styles.js";
import { ORIGINS } from "./catalog/drinks.js";
import { sizesFor, defaultSize, itemAbv, logStd, cleanRating, tagsFor, TAG_INDEX, MAX_TAGS, recentDrinks, placesByUse,
  lastPlace, findPlace, cleanPlaceName, SAME_NIGHT_MS } from "./logs.js";
import { getUnits, fmtVolume, standardDrinks, ozToMl } from "./units.js";
import { shrinkPhoto } from "./photo.js";

const MAX_RESULTS = 40;
let query = "";

const itemOf = log => itemById(log.kind, log.drinkId);
const iconOf = log => { const i = itemOf(log); return i ? i.category.icon : "🍹"; };
const placeName = id => (store.places.find(p => p.id === id) || {}).name || "";
const stdText = n => `${n} standard drink${n === 1 ? "" : "s"}`;

/* ---------- Stars ---------- */
/* Read-only "★ 4.5". */
export const starText = r => r ? `★ ${r % 1 ? r.toFixed(1) : r}` : "";

/* Five stars you can tap: the left half of a star gives a half. Tapping the current rating clears it. */
function starPicker(value, onChange) {
  const box = el("div", { class: "stars", role: "group", "aria-label": "Rating" });
  const draw = () => fill(box, ...[1, 2, 3, 4, 5].map(n => {
    const filled = value >= n ? 100 : value >= n - 0.5 ? 50 : 0;
    return el("span", { class: "star", style: `--fill:${filled}%` },
      ...[n - 0.5, n].map(v => el("button", { type: "button", class: v % 1 ? "half left" : "half right",
        "aria-label": `${v} star${v === 1 ? "" : "s"}`, "aria-pressed": String(value === v),
        onclick: () => { value = value === v ? null : v; draw(); onChange(value); } })));
  }), el("span", { class: "star-value", text: value ? `${value} / 5` : "Not rated" }));
  draw();
  return box;
}

/* ---------- Thumbnails (loaded only when shown) ---------- */
function thumbBox(log, cls = "log-thumb") {
  if (!log.hasPhoto) return el("span", { class: `${cls} icon`, text: iconOf(log) });
  const img = el("img", { class: cls, alt: "", loading: "lazy" });
  loadThumb(log.id).then(src => { if (src) img.src = src; else img.replaceWith(el("span", { class: `${cls} icon`, text: iconOf(log) })); });
  return img;
}

/* A log in a list: photo or icon, the drink, then size, time and rating. */
export function logRow(log, { who = false, another = false } = {}) {
  const meta = [who ? memberName(log.uid) : "", fmtVolume(log.ml, getUnits()), fmtAgo(log.at), starText(log.rating), placeName(log.placeId) && `📍 ${placeName(log.placeId)}`]
    .filter(Boolean).join(" · ");
  return el("li", { class: "log-row" },
    el("a", { class: "item-row grow", href: `#/l/${log.id}` }, thumbBox(log),
      el("span", { class: "grow" }, el("b", { text: log.title }), el("span", { class: "muted small", text: meta }))),
    another ? el("button", { class: "btn small", type: "button", text: "Another", "aria-label": `Another ${log.title}`, onclick: () => anotherOne(log) }) : null);
}

/* Logs the same drink again, now: same size, and the same place if it's the same night. */
export function anotherOne(log) {
  const sameNight = Date.now() - log.at < SAME_NIGHT_MS;
  const id = saveLog({ kind: log.kind, drinkId: log.drinkId, title: log.title, style: log.style, size: log.size, ml: log.ml, abv: log.abv,
    at: Date.now(), placeId: sameNight ? log.placeId : lastPlace(store.logs, uid()) });
  toast(`Another ${log.title} logged 🍻`, { label: "Undo", run: () => deleteLog(id) });
}

/* ---------- #/log: what are you drinking? ---------- */
export function renderLog(main, kind, id) {
  if (kind && id) return renderLogForm(main, itemById(kind, id));
  const box = el("input", { type: "search", class: "search-input", placeholder: "Search beer, whisky, cocktails…", value: query,
    "aria-label": "Search for what you're drinking", autocomplete: "off", autocorrect: "off", spellcheck: "false" });
  const results = el("div", { class: "stack" });
  const recent = recentDrinks(store.logs, uid());
  const draw = () => {
    query = box.value;
    if (!query.trim()) return fill(results, recent.length ? el("section", { class: "card stack" },
      el("h3", { text: "Having another?" }),
      el("ul", { class: "item-list" }, ...recent.map(l => pickRow(itemOf(l), l)).filter(Boolean))) : null);
    const hits = search(query);
    fill(results,
      hits.length ? el("ul", { class: "item-list card" }, ...hits.slice(0, MAX_RESULTS).map(i => pickRow(i))) : null,
      hits.length > MAX_RESULTS ? el("p", { class: "hint center", text: `Showing ${MAX_RESULTS} of ${hits.length.toLocaleString()}. Type more to narrow it down.` }) : null,
      el("section", { class: "card stack center" },
        el("p", { class: "muted", text: hits.length ? "Not the one?" : "That isn't in the list yet." }),
        el("button", { class: "btn block", type: "button", text: "Add a drink to the list", onclick: () => addDrinkSheet(query) })));
  };
  box.addEventListener("input", draw);
  draw();
  fill(main,
    el("h2", { class: "page-title", text: "What are you drinking?" }),
    el("label", { class: "search" }, el("span", { html: icon.search }), box),
    results);
  if (!query) box.focus({ preventScroll: true });
}

function pickRow(i, last) {
  if (!i) return null;
  const meta = last ? `Last: ${fmtVolume(last.ml, getUnits())} · ${fmtAgo(last.at)}`
    : i.kind === "cocktail" ? i.style.name : [i.style.name, i.data.abv != null ? `${i.data.approx ? "~" : ""}${i.data.abv}%` : ""].filter(Boolean).join(" · ");
  return el("li", {}, el("a", { class: "item-row", href: `#/log/${i.kind}/${i.id}` },
    el("span", { class: "item-icon", text: i.category.icon }),
    el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: meta })),
    el("span", { class: "chev", html: icon.chevron })));
}

/* ---------- The log form (new, or editing an existing log) ---------- */
const pad = n => String(n).padStart(2, "0");
const toLocalInput = t => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function renderLogForm(main, item, editing = null) {
  if (!item) return fill(main, el("div", { class: "card" }, el("p", { text: "That drink isn't in the list." })));
  const units = getUnits(), sizes = sizesFor(item), abv = editing ? editing.abv : itemAbv(item);
  const last = !editing && recentDrinks(store.logs, uid(), 50).find(l => l.kind === item.kind && l.drinkId === item.id);
  const s = {
    size: editing ? editing.size : last && sizes.some(z => z.key === last.size) ? last.size : defaultSize(item),
    ml: editing ? editing.ml : null, rating: editing ? editing.rating || null : null, tags: editing ? [...(editing.tags || [])] : [],
    placeId: editing ? editing.placeId || null : lastPlace(store.logs, uid()),
    at: editing ? editing.at : null, // null = now
    notes: editing ? editing.notes || "" : "",
    pics: undefined, // undefined = unchanged, null = no photo, { photo, thumb } = new photo
  };
  if (s.ml == null) s.ml = (sizes.find(z => z.key === s.size) || sizes[0]).ml || 0;
  if (s.size === "other" || !sizes.some(z => z.key === s.size)) s.size = "other";

  // Size
  const stdLine = el("p", { class: "muted small" });
  const otherIn = el("input", { type: "number", inputmode: "decimal", min: "0", step: "any", "aria-label": `Amount in ${units}`,
    value: s.size === "other" ? (units === "ml" ? s.ml : Math.round(s.ml / 29.5735 * 10) / 10) : "" });
  const otherRow = el("div", { class: "row other-amount", hidden: s.size !== "other" }, otherIn, el("span", { class: "muted", text: units }));
  const sizeBox = el("div", { class: "chips", role: "group", "aria-label": "Size" });
  const drawStd = () => { stdLine.textContent = `${fmtVolume(s.ml, units)} at ${abv}% = ${stdText(standardDrinks(s.ml, abv))}`; };
  const drawSizes = () => fill(sizeBox, ...sizes.map(z => el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.size === z.key),
    "aria-label": `${z.label}, ${fmtVolume(z.ml, units)}`,
    onclick: () => { s.size = z.key; s.ml = z.ml; otherRow.hidden = true; drawSizes(); drawStd(); } },
    el("b", { text: z.label }), el("span", { text: fmtVolume(z.ml, units) }))),
  el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.size === "other"), "aria-label": "Other amount",
    onclick: () => { s.size = "other"; otherRow.hidden = false; drawSizes(); otherIn.focus(); } }, el("b", { text: "Other" }), el("span", { text: units })));
  otherIn.addEventListener("input", () => {
    const v = Number(otherIn.value);
    s.ml = v > 0 ? Math.round(units === "ml" ? v : ozToMl(v)) : 0;
    drawStd();
  });
  drawSizes(); drawStd();

  // Flavour tags
  const tagBox = el("div", { class: "chips", role: "group", "aria-label": "Flavour" });
  const drawTags = () => fill(tagBox, ...tagsFor(item).map(t => el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(s.tags.includes(t.id)),
    onclick: () => {
      if (s.tags.includes(t.id)) s.tags = s.tags.filter(x => x !== t.id);
      else if (s.tags.length < MAX_TAGS) s.tags.push(t.id);
      else return toast(`Up to ${MAX_TAGS} flavours.`);
      drawTags();
    } }, t.label)));
  drawTags();

  // Place
  const placeBox = el("div", { class: "chips", role: "group", "aria-label": "Where" });
  const drawPlaces = () => {
    const top = placesByUse(store.places, store.logs, uid()).slice(0, 4);
    if (s.placeId && !top.some(p => p.id === s.placeId)) top.unshift({ id: s.placeId, name: placeName(s.placeId) || "Place" });
    fill(placeBox,
      el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.placeId), onclick: () => { s.placeId = null; drawPlaces(); } }, "Nowhere special"),
      ...top.map(p => el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.placeId === p.id),
        onclick: () => { s.placeId = p.id; drawPlaces(); } }, `📍 ${p.name}`)),
      el("button", { type: "button", class: "chip-btn", onclick: () => placeSheet(id => { s.placeId = id; drawPlaces(); }) }, "More or new…"));
  };
  drawPlaces();

  // When
  const whenIn = el("input", { type: "datetime-local", class: "when-input", "aria-label": "When", max: toLocalInput(Date.now()),
    value: toLocalInput(s.at || Date.now()) });
  const whenRow = el("div", { class: "stack", hidden: !editing }, whenIn);
  const nowBtn = el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.at), hidden: !!editing,
    onclick: () => { s.at = null; whenRow.hidden = true; nowBtn.setAttribute("aria-pressed", "true"); earlierBtn.setAttribute("aria-pressed", "false"); } }, "Now");
  const earlierBtn = el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!!s.at), hidden: !!editing,
    onclick: () => { whenIn.max = toLocalInput(Date.now()); whenRow.hidden = false; nowBtn.setAttribute("aria-pressed", "false"); earlierBtn.setAttribute("aria-pressed", "true"); whenIn.focus(); } }, "Earlier…");

  // Notes
  const notesIn = el("textarea", { rows: 3, maxlength: 500, placeholder: "How was it? (optional)", value: s.notes });

  // Photo
  const photoIn = el("input", { type: "file", accept: "image/*", hidden: true });
  const photoBox = el("div", { class: "photo-pick" });
  const drawPhoto = (src) => fill(photoBox, src
    ? el("div", { class: "photo-preview" }, el("img", { src, alt: "Your photo" }),
        el("button", { class: "btn small", type: "button", text: "Remove", onclick: () => { s.pics = null; drawPhoto(null); } }))
    : el("button", { class: "btn block", type: "button", onclick: () => photoIn.click() }, "📷 Add a photo"));
  photoIn.addEventListener("change", async () => {
    const f = photoIn.files && photoIn.files[0];
    photoIn.value = "";
    if (!f) return;
    try { s.pics = await shrinkPhoto(f); drawPhoto(s.pics.thumb); }
    catch (e) { console.warn(e); toast("That photo couldn't be read. Try another one."); }
  });
  drawPhoto(null);
  if (editing && editing.hasPhoto) loadThumb(editing.id).then(src => { if (src && s.pics === undefined) drawPhoto(src); });

  const msg = el("p", { class: "msg err", role: "alert" });
  const save = el("button", { class: "btn primary block", type: "submit", text: editing ? "Save changes" : `Log it ${item.category.icon}` });
  const form = el("form", { class: "stack" },
    el("section", { class: "card stack" }, el("h3", { text: "How much?" }), sizeBox, otherRow, stdLine),
    el("section", { class: "card stack" }, el("h3", { text: "Rating" }), starPicker(s.rating, v => { s.rating = v; })),
    el("section", { class: "card stack" }, el("h3", { text: "Flavour" }), el("p", { class: "hint", text: `Pick up to ${MAX_TAGS} (optional).` }), tagBox),
    el("section", { class: "card stack" }, el("h3", { text: "Where" }), placeBox),
    el("section", { class: "card stack" }, el("h3", { text: "When" }), el("div", { class: "chips" }, nowBtn, earlierBtn), whenRow),
    el("section", { class: "card stack" }, el("h3", { text: "Notes and photo" }), notesIn, photoBox, photoIn),
    msg, save);

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!(s.ml > 0)) { msg.textContent = "How much? Pick a size or enter an amount."; return; }
    let at = Date.now();
    if (editing || !whenRow.hidden) {
      at = new Date(whenIn.value).getTime();
      if (!at) { msg.textContent = "Pick a date and time."; return; }
      if (at > Date.now() + 60000) { msg.textContent = "That time hasn't happened yet."; return; }
    }
    const fields = { kind: editing ? editing.kind : item.kind, drinkId: editing ? editing.drinkId : item.id,
      title: editing ? editing.title : item.title, style: editing ? editing.style : item.style.id, size: s.size, ml: s.ml, abv,
      rating: cleanRating(s.rating), tags: s.tags, placeId: s.placeId, notes: notesIn.value, at };
    if (editing) {
      updateLog(editing.id, fields, s.pics);
      toast("Saved.");
      history.back();
      return;
    }
    const id = saveLog(fields, s.pics || null);
    query = "";
    toast(`${item.title} logged 🍻`, { label: "Undo", run: () => deleteLog(id) });
    location.hash = "#/home";
  });

  const d = item.data;
  fill(main,
    el("section", { class: "card log-head" },
      el("span", { class: "item-icon", text: item.category.icon }),
      el("div", { class: "grow" }, el("h2", { text: item.title }),
        el("p", { class: "muted small", text: [item.style.name, `${item.kind === "cocktail" ? "about " : d.approx ? "~" : ""}${abv}%`].join(" · ") })),
      editing ? null : el("a", { class: "btn small", href: "#/log", text: "Change" })),
    form);
}

/* ---------- Places ---------- */
function placeSheet(pick) {
  openSheet(box => {
    const q = el("input", { type: "search", placeholder: "Search or type a new place", maxlength: 60, "data-focus": "", autocomplete: "off" });
    const list = el("ul", { class: "item-list" });
    const draw = () => {
      const t = q.value.trim().toLowerCase(), all = placesByUse(store.places, store.logs, uid());
      const hits = t ? all.filter(p => p.name.toLowerCase().includes(t)) : all;
      const exact = findPlace(store.places, q.value);
      fill(list,
        ...hits.slice(0, 30).map(p => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => { closeSheet(); pick(p.id); } },
          el("span", { class: "item-icon", text: "📍" }), el("b", { class: "grow", text: p.name })))),
        t && !exact ? el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => { closeSheet(); pick(addPlace(cleanPlaceName(q.value))); } },
          el("span", { class: "item-icon", text: "➕" }), el("span", { class: "grow" }, el("b", { text: `Add "${cleanPlaceName(q.value)}"` }),
            el("span", { class: "muted small", text: "Shared with the group, so everyone can pick it" })))) : null,
        !hits.length && !t ? el("li", { class: "muted", text: "No places yet. Type one to add it." }) : null);
    };
    q.addEventListener("input", draw);
    draw();
    box.append(el("div", { class: "stack" }, el("h2", { text: "Where are you?" }), q, list,
      el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

/* ---------- Adding a drink to the shared list ---------- */
function addDrinkSheet(typed = "") {
  openSheet(box => {
    const brand = el("input", { type: "text", maxlength: 60, autocapitalize: "words", value: typed, placeholder: "e.g. Collective Arts", "data-focus": "" });
    const name = el("input", { type: "text", maxlength: 80, autocapitalize: "words", placeholder: "e.g. Ransack the Universe" });
    const variant = el("input", { type: "text", maxlength: 40, autocapitalize: "words", placeholder: "e.g. Mango (optional)" });
    const cat = el("select", { "aria-label": "Category" }, ...CATEGORIES.filter(c => c.id !== "cocktail").map(c => el("option", { value: c.id, text: `${c.icon} ${c.name}` })));
    const style = el("select", { "aria-label": "Style" });
    const fillStyles = () => fill(style, ...CATEGORIES.find(c => c.id === cat.value).families.map(f =>
      el("optgroup", { label: f.name }, ...f.styles.map(st => el("option", { value: st.id, text: st.name })))));
    cat.addEventListener("change", fillStyles);
    fillStyles();
    const abv = el("input", { type: "number", inputmode: "decimal", min: "0", max: "80", step: "0.1", placeholder: "e.g. 5.5" });
    const origin = el("select", { "aria-label": "Where it's from" }, el("option", { value: "", text: "Not sure" }),
      ...Object.entries(ORIGINS).map(([k, v]) => el("option", { value: k, text: v })));
    origin.value = "CA-ON";
    const dupes = el("div", { class: "stack" });
    const checkDupes = () => {
      const t = [brand.value, name.value, variant.value].join(" ").trim();
      const hits = t.length > 2 ? search(t, { items: allItems().filter(i => i.kind === "drink") }).slice(0, 3) : [];
      fill(dupes, hits.length ? el("div", { class: "note" }, el("b", { text: "Already in the list?" }),
        el("ul", { class: "item-list" }, ...hits.map(i => el("li", {}, el("a", { class: "item-row", href: `#/log/drink/${i.id}`, onclick: closeSheet },
          el("span", { class: "item-icon", text: i.category.icon }), el("b", { class: "grow", text: i.title })))))) : null);
    };
    [brand, name, variant].forEach(x => x.addEventListener("input", checkDupes));
    checkDupes();
    const msg = el("p", { class: "msg err", role: "alert" });
    const form = el("form", { class: "stack" },
      el("h2", { text: "Add a drink" }),
      el("p", { class: "hint", text: "It goes on the group's list for everyone. Admins tidy up the details later." }),
      field("Brand or maker", brand), field("Name (optional)", name, "Leave it empty when the brand is the drink, like Jägermeister."),
      field("Flavour (optional)", variant), field("Category", cat), field("Style", style, "Only admins can add new styles."),
      field("Alcohol %", abv), field("Where it's from", origin), dupes, msg,
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Add and log it" })));
    form.addEventListener("submit", e => {
      e.preventDefault();
      const a = Number(abv.value);
      if (!brand.value.trim()) { msg.textContent = "Enter the brand or maker."; return brand.focus(); }
      if (abv.value === "" || !(a >= 0 && a <= 80)) { msg.textContent = "Enter the alcohol % (0 for non-alcoholic)."; return abv.focus(); }
      const id = addDrink({ brand: brand.value, name: name.value, variant: variant.value, style: style.value, abv: a, origin: origin.value });
      closeSheet();
      location.hash = `#/log/drink/${id}`;
    });
    box.append(form);
  });
}

/* ---------- #/l/<id>: one log ---------- */
/* #/edit/<id>: your own log in the form. Not a live page, so a friend's new log can't redraw it mid-edit. */
export function renderLogEdit(main, id) {
  const log = store.logs.find(l => l.id === id);
  if (!log || log.uid !== uid()) return fill(main, el("div", { class: "card" }, el("p", { text: "That drink log isn't yours to edit, or it's gone." })));
  renderLogForm(main, itemOf(log) || fallbackItem(log), log);
}

export function renderLogDetail(main, id) {
  const log = store.logs.find(l => l.id === id);
  if (!log) return fill(main, el("div", { class: "card" }, el("p", { text: "That drink log isn't here any more." })));
  const item = itemOf(log), mineLog = log.uid === uid();
  const m = store.members.get(log.uid) || { id: log.uid, displayName: memberName(log.uid) };
  const photo = log.hasPhoto ? el("div", { class: "log-photo" }, thumbBox(log, "log-photo-img")) : null;
  if (photo) loadPhoto(log.id).then(src => { if (src) { const img = photo.querySelector("img"); if (img) img.src = src; } });
  const std = logStd(log);
  const facts = [
    ["How much", `${fmtVolume(log.ml, getUnits())} at ${log.abv}% (${stdText(std)})`],
    log.placeId ? ["Where", placeName(log.placeId) || "A place that was removed"] : null,
    ["When", fmtDate(log.at)],
    log.editedAt ? ["Edited", fmtDate(log.editedAt)] : null,
  ].filter(Boolean);
  fill(main,
    photo,
    el("section", { class: "card log-head" },
      el("span", { class: "item-icon", text: iconOf(log) }),
      el("div", { class: "grow" },
        item ? el("a", { href: `#/${log.kind === "cocktail" ? "recipe" : "drink"}/${log.drinkId}` }, el("h2", { text: log.title })) : el("h2", { text: log.title }),
        log.rating ? el("p", { class: "rating-line", text: `${starText(log.rating)} / 5` }) : null)),
    el("a", { class: "member-row card", href: mineLog ? "#/me" : `#/u/${log.uid}` }, avatar(m),
      el("div", { class: "grow" }, el("div", { class: "name", text: m.displayName }), el("div", { class: "muted small", text: fmtAgo(log.at) }))),
    el("dl", { class: "facts card" }, ...facts.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])),
    log.tags && log.tags.length ? el("div", { class: "chips" }, ...log.tags.map(t => el("span", { class: "chip", text: (TAG_INDEX.get(t) || { label: t }).label }))) : null,
    log.notes ? el("p", { class: "card notes", text: log.notes }) : null,
    el("div", { class: "stack" },
      mineLog ? el("button", { class: "btn primary block", type: "button", text: "Another one", onclick: () => { anotherOne(log); location.hash = "#/home"; } }) : null,
      mineLog ? el("a", { class: "btn block", href: `#/edit/${log.id}`, text: "Edit" }) : null,
      mineLog || isAdmin() ? confirmButton(mineLog ? "Delete this log" : "Delete this log (admin)", "Tap again to delete", () => {
        deleteLog(log.id); toast("Deleted."); history.back();
      }, "btn danger block") : null));
}

/* A log whose drink was removed from the list: still editable, with sizes for its old style. */
function fallbackItem(log) {
  const cat = CATEGORIES.find(c => c.families.some(f => f.styles.some(st => st.id === log.style))) || CATEGORIES[0];
  const fam = cat.families.find(f => f.styles.some(st => st.id === log.style)) || cat.families[0];
  return { kind: "drink", id: log.drinkId, title: log.title, category: cat, family: fam,
    style: fam.styles.find(st => st.id === log.style) || fam.styles[0], data: { abv: log.abv } };
}
