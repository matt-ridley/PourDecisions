/* The bar and the fridge: #/bar (yours), #/bar/<household>/<fridge|bar|cooler>, and #/bars (every household).
   Everyone can look at every household; only its members change it. The data rules are in stock.js. */
import { el, fill, icon, avatar, openSheet, closeSheet, toast, confirmButton, field, linkList } from "./ui.js";
import { store, uid, cloud, memberName, createHousehold, updateHousehold, leaveHousehold, setStock, changeStock, addToFridge, removeStock,
  loadCooler, unloadCooler, loadBarPhoto, setBarPhoto, setBottlePhoto, loadBottleThumb, loadBottlePhoto, placeOrder, cancelOrder, serveOrder } from "./cloud.js";
import { barIsOpen, orderable, queueOf, ordersBy, orderItem } from "./orders.js";
import { makeForOrder } from "./makepage.js";
import { pickImage, shrinkPhoto } from "./photo.js";
import { sortByHave } from "./makeable.js";
import { currentCovers } from "./makeablepage.js";
import { search, ingredientById, INGREDIENTS, normalize, allItems } from "./catalog.js";
import { drinkOne, giftable } from "./logpage.js";
import { RELOADS, BOTTLE_SIZES, LEVELS, stockId, householdOf, defaultWhere, stockIn, fridgeCount, isLow, level, levelText, homeless, coolerTotal,
  menuOf, signatureOf, haveFromStock, runList } from "./stock.js";

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
  tab = tab === "bar" || tab === "cooler" ? tab : "fridge";
  const fridge = stockIn(store.stock, h.id, "fridge"), bar = stockIn(store.stock, h.id, "bar"), cooler = stockIn(store.stock, h.id, "cooler");
  const base = `#/bar/${h.id}`;

  const sig = signatureOf(h);
  const photo = h.hasPhoto ? el("img", { class: "bar-photo", alt: `${h.name}` }) : null;
  if (photo) loadBarPhoto(h.id).then(src => { if (src) photo.src = src; else photo.remove(); });
  fill(main,
    el("section", { class: "hero card" },
      photo || el("span", { class: "hero-icon", text: "🏠" }),
      el("h2", { text: h.name }),
      h.about ? el("p", { text: h.about }) : null,
      sig ? el("p", {}, "⭐ Signature: ", el("a", { href: `#/${sig.kind === "cocktail" ? "recipe" : "drink"}/${sig.id}`, text: sig.title })) : null,
      el("div", { class: "chips center" }, ...memberList(h).map(id => el("a", { class: "chip-btn who", href: `#/u/${id}` },
        avatar(store.members.get(id), "xs"), memberName(id)))),
      barIsOpen(h, store.nights, store.logs) ? el("span", { class: "chip gold", text: "🟢 Open for orders" }) : null),
    mine ? queueCard(h) : null,
    barIsOpen(h, store.nights, store.logs) ? orderCard(h) : null,
    myOrdersCard(h),
    // Guests come for the menu, so it's first for them; the household sees what it has first and hosting below.
    mine ? null : menuCard(h, mine),
    el("div", { class: "seg", role: "tablist" },
      el("a", { class: "seg-link", href: `${base}/fridge`, "aria-selected": String(tab === "fridge"), text: `🧊 Fridge · ${fridge.reduce((n, s) => n + fridgeCount(s), 0)}` }),
      el("a", { class: "seg-link", href: `${base}/bar`, "aria-selected": String(tab === "bar"), text: `🍾 Bar · ${bar.length}` }),
      el("a", { class: "seg-link", href: `${base}/cooler`, "aria-selected": String(tab === "cooler"), text: `❄️ Cooler · ${coolerTotal(store.stock, h.id)}` })),
    tab === "fridge" ? fridgeCard(h, fridge, mine) : tab === "bar" ? barCards(h, bar, mine) : coolerCard(h, cooler, fridge, mine),
    mine && tab !== "cooler" ? el("button", { class: "btn primary block", type: "button", html: icon.plus, onclick: () => addSheet(h, tab) },
      tab === "fridge" ? "Add to the fridge" : "Add to the bar") : null,
    linkList([
      { icon: "🍸", title: mine ? "What can I make" : "What can I make here", sub: "Cocktails from this bar and fridge", href: `#/makeable/${h.id}` },
      mine ? (n => ({ icon: "🛒", title: "LCBO run", sub: n ? `${n} thing${n === 1 ? "" : "s"} to pick up` : "Nothing to pick up right now", href: "#/run" }))(
        runList(store.stock, h, [...store.members.values()], currentCovers()).length) : null,
    ]),
    mine ? el("section", { class: "card stack" },
      el("h3", { text: "🛎️ Hosting" }),
      el("p", { class: "muted small", text: h.open ? "The bar is open: guests can order from your menu."
        : "Open the bar and guests can order from your menu. It's open during a night you host here, too." }),
      el("button", { class: "btn block", type: "button", text: h.open ? "Close the bar" : "🟢 Open the bar", onclick: () => {
        updateHousehold(h.id, { open: !h.open }); toast(h.open ? "Bar closed." : "Bar open: guests can order from the menu 🛎️");
      } })) : null,
    mine ? menuCard(h, mine) : null,
    mine ? el("div", { class: "row" },
      el("button", { class: "btn grow", type: "button", text: "Edit the bar's page", onclick: () => pageSheet(h) }),
      el("button", { class: "btn grow", type: "button", html: icon.gear, "aria-label": "Household settings", onclick: () => settingsSheet(h) }, "Household")) : null,
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
  const out = hs.filter(h => coolerTotal(store.stock, h.id) > 0);
  fill(main,
    el("h2", { class: "page-title", text: "🏠 Everyone's bars" }),
    out.length ? el("section", { class: "card stack" },
      el("h3", { text: "❄️ Coolers out" }),
      el("ul", { class: "item-list" }, ...out.map(h => el("li", {}, el("a", { class: "item-row", href: `#/bar/${h.id}/cooler` },
        el("span", { class: "item-icon", text: "❄️" }),
        el("span", { class: "grow" }, el("b", { text: h.name }), el("span", { class: "muted small", text: `${plural(coolerTotal(store.stock, h.id), "drink")} left · grab one` })),
        el("span", { class: "chev", html: icon.chevron })))))) : null,
    hs.length ? el("ul", { class: "item-list card" }, ...hs.map(h => {
      const f = stockIn(store.stock, h.id, "fridge").reduce((n, s) => n + fridgeCount(s), 0);
      const b = stockIn(store.stock, h.id, "bar").filter(s => s.kind === "drink").length;
      return el("li", {}, el("a", { class: "item-row", href: `#/bar/${h.id}/fridge` },
        el("span", { class: "item-icon", text: barIsOpen(h, store.nights, store.logs) ? "🟢" : "🏠" }),
        el("span", { class: "grow" }, el("b", { text: h.name }),
          el("span", { class: "muted small", text: `${peopleText(h)} · ${plural(f, "in the fridge", "in the fridge")} · ${plural(b, "bottle")}` })),
        el("span", { class: "chev", html: icon.chevron })));
    })) : el("p", { class: "card muted", text: "Nobody has set up a bar yet." }),
    mine ? null : el("a", { class: "btn primary block", href: "#/bar", text: "Start yours" }));
}

/* ---------- Bar Menu / Order up (see orders.js) ---------- */
/* The household's queue: what's been ordered, oldest first. Serve makes it (Make it, with the guest picked) or hands
   it over from the fridge or cooler; either way it's logged for the guest and goes on the Tab. */
function queueCard(h) {
  const q = queueOf(store.orders, h.id);
  if (!q.length) return null;
  return el("section", { class: "card stack problem" },
    el("h3", { text: `🛎️ Orders · ${q.length}` }),
    el("ul", { class: "item-list" }, ...q.map(o => {
      const item = orderItem(o);
      return el("li", { class: "make-row" },
        avatar(store.members.get(o.by) || { id: o.by, displayName: memberName(o.by) }, "sm"),
        el("span", { class: "make-name" }, el("b", { text: `${memberName(o.by)}: ${item ? item.title : "a drink that's gone"}` }),
          o.note ? el("span", { class: "muted small", text: `"${o.note}"` }) : null),
        item ? el("button", { class: "btn small primary", type: "button", text: "Serve", onclick: () => serve(h, o, item) }) : null,
        el("button", { class: "btn small", type: "button", text: "No", "aria-label": "Can't make it", onclick: () => { cancelOrder(o.id); toast("Order turned down."); } }));
    })));
}

function serve(h, o, item) {
  if (o.kind === "cocktail") { makeForOrder(o); location.hash = `#/make/${item.id}`; return; }
  const entry = [...stockIn(store.stock, h.id, "cooler"), ...stockIn(store.stock, h.id, "fridge")].find(s => s.item === item.id && fridgeCount(s) > 0);
  const id = drinkOne(item, entry || null, o.by === uid() ? null : o.by);
  serveOrder(o.id, id);
}

/* Ordering: what the bar can make or hand out right now. */
function orderCard(h) {
  const list = orderable(h, store.stock, currentCovers());
  if (!list.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: "🍹 Order up" }),
    el("p", { class: "hint", text: "Order from your phone: the bar sees it, makes it and it's logged for you (and on the Tab)." }),
    el("ul", { class: "item-list" }, ...list.map(o => el("li", { class: "make-row" },
      el("span", { class: "make-name" }, el("b", { text: `${o.kind === "cocktail" ? "🍹" : o.item.category.icon} ${o.item.title}` }),
        el("span", { class: "muted small", text: o.kind === "cocktail" ? "From the menu" : "In the fridge" })),
      el("button", { class: "btn small", type: "button", text: "Order", onclick: () => orderSheet(h, o) })))));
}

function orderSheet(h, o) {
  openSheet(box => {
    const note = el("input", { type: "text", maxlength: 80, placeholder: "Anything? e.g. light on the ice", "data-focus": "" });
    box.append(el("div", { class: "stack" },
      el("h2", { text: `Order a ${o.item.title}` }),
      field("Note (optional)", note),
      el("button", { class: "btn primary block", type: "button", text: "Order it 🛎️", onclick: () => {
        placeOrder(h.id, o.kind, o.item.id, note.value); closeSheet(); toast("Ordered. The bar will see it 🛎️");
      } }),
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

/* Your orders at this bar in the last 12 hours, and where they're at. */
function myOrdersCard(h) {
  const mine = ordersBy(store.orders, uid()).filter(o => o.hh === h.id);
  if (!mine.length) return null;
  const state = { waiting: "⏳ Waiting", served: "✅ Served", cancelled: "✖ Not this time" };
  return el("section", { class: "card stack" },
    el("h3", { text: "Your orders" }),
    el("ul", { class: "item-list" }, ...mine.map(o => el("li", { class: "make-row" },
      el("span", { class: "make-name" }, el("b", { text: (orderItem(o) || { title: "A drink" }).title }), el("span", { class: "muted small", text: state[o.state] })),
      o.state === "waiting" ? el("button", { class: "btn small", type: "button", text: "Take it back", onclick: () => cancelOrder(o.id) }) : null))));
}

/* ---------- The bar's page: photo, about, signature drink and the menu ---------- */
function menuCard(h, mine) {
  const menu = menuOf(h, store.stock, currentCovers());
  if (!menu.length && !mine) return null;
  return el("section", { class: "card stack" },
    el("div", { class: "row spread" }, el("h3", { text: "📜 The menu" }),
      mine ? el("button", { class: "btn small", type: "button", text: menu.length ? "Edit" : "Make a menu", onclick: () => menuSheet(h) }) : null),
    menu.length ? el("ul", { class: "item-list" }, ...menu.map(m => el("li", {}, el("a", { class: "item-row", href: `#/recipe/${m.item.id}` },
      el("span", { class: "item-icon", text: "🍹" }),
      el("span", { class: "grow" }, el("b", { text: m.item.title }),
        el("span", { class: "muted small", text: m.missing.length ? `Out of ${m.missing.map(x => x.item).join(", ")} right now` : "✅ Can make now" })),
      el("span", { class: "chev", html: icon.chevron })))))
      : el("p", { class: "muted", text: "Pick the cocktails you serve. Guests will see what you can make right now." }));
}

/* Pick the menu: what the bar can make now first, plus anything already on it. */
function menuSheet(h) {
  const have = haveFromStock(store.stock, h.id, currentCovers());
  const { now } = sortByHave(allItems().filter(i => i.kind === "cocktail"), have);
  const pick = new Set(h.menu || []);
  const extra = [...pick].filter(id => !now.some(r => r.item.id === id));
  openSheet(box => {
    const list = el("ul", { class: "item-list" });
    const draw = () => fill(list, ...[...now.map(r => r.item.id), ...extra].map(id => {
      const r = now.find(x => x.item.id === id), title = r ? r.item.title : (allItems().find(i => i.kind === "cocktail" && i.id === id) || { title: id }).title;
      return el("li", {}, el("label", { class: "check" },
        el("input", { type: "checkbox", checked: pick.has(id) ? true : null, onchange: e => { e.target.checked ? pick.add(id) : pick.delete(id); } }),
        el("span", {}, el("b", { text: title }), r ? "" : el("span", { class: "muted small", text: " (can't make it right now)" }))));
    }));
    draw();
    box.append(el("div", { class: "stack" },
      el("h2", { text: "📜 The menu" }),
      el("p", { class: "hint", text: now.length ? `${now.length} cocktails you can make right now.` : "Nothing can be made from this bar yet: add bottles and mixers first." }),
      now.length ? el("button", { class: "btn small", type: "button", text: "Tick everything we can make", onclick: () => { now.forEach(r => pick.add(r.item.id)); draw(); } }) : null,
      list,
      el("button", { class: "btn primary block", type: "button", text: "Save the menu", onclick: () => {
        updateHousehold(h.id, { menu: [...pick].slice(0, 40) }); closeSheet(); toast("Menu saved 📜");
      } }),
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

/* The bar's page: about, signature drink and photo. */
function pageSheet(h) {
  openSheet(box => {
    const about = el("textarea", { rows: 3, maxlength: 200, placeholder: "e.g. Rye, records and a very good ice machine." , value: h.about || "" });
    let sig = h.signature || "";
    const sigLabel = el("p", { class: "muted" });
    const drawSig = () => { const i = signatureOf({ signature: sig }); sigLabel.textContent = i ? `⭐ ${i.title}` : "None yet"; };
    drawSig();
    const q = el("input", { type: "search", class: "search-input", placeholder: "Search drinks and cocktails…", autocomplete: "off" });
    const hits = el("ul", { class: "item-list" });
    q.addEventListener("input", () => fill(hits, ...(q.value.trim() ? search(q.value).filter(i => i.kind === "drink" || i.kind === "cocktail").slice(0, 6) : [])
      .map(i => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => { sig = `${i.kind}:${i.id}`; q.value = ""; fill(hits); drawSig(); } },
        el("span", { class: "item-icon", text: i.category.icon }), el("b", { class: "grow", text: i.title }))))));
    const photoIn = el("input", { type: "file", accept: "image/*", hidden: true });
    photoIn.addEventListener("change", async () => {
      const f = photoIn.files && photoIn.files[0];
      photoIn.value = "";
      if (!f) return;
      try { const p = await shrinkPhoto(f); setBarPhoto(h.id, p.photo); toast("Photo saved 📷"); }
      catch (e) { console.warn(e); toast("That photo couldn't be read. Try another one."); }
    });
    box.append(el("div", { class: "stack" },
      el("h2", { text: "The bar's page" }),
      field("About the bar", about),
      el("h3", { text: "Signature drink" }), sigLabel,
      el("label", { class: "search" }, el("span", { html: icon.search }), q), hits,
      sig ? el("button", { class: "btn small", type: "button", text: "No signature drink", onclick: () => { sig = ""; drawSig(); } }) : null,
      el("h3", { text: "Photo" }),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: h.hasPhoto ? "📷 Change the photo" : "📷 Add a photo", onclick: () => photoIn.click() }),
        h.hasPhoto ? el("button", { class: "btn", type: "button", text: "Remove it", onclick: () => { setBarPhoto(h.id, null); closeSheet(); } }) : null),
      photoIn,
      el("button", { class: "btn primary block", type: "button", text: "Save", onclick: () => {
        updateHousehold(h.id, { about: about.value.trim().slice(0, 200), signature: sig || cloud.api.deleteField() }); closeSheet();
      } }),
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

/* ---------- The cooler ---------- */
/* Loaded from the fridge for a night out. Anyone in the group can take a drink from it; what's left goes back in the
   fridge afterwards. */
function coolerCard(h, rows, fridge, mine) {
  const total = rows.reduce((n, s) => n + fridgeCount(s), 0), canLoad = fridge.some(s => fridgeCount(s) > 0);
  if (!rows.length) return el("section", { class: "card stack" },
    el("p", { text: mine ? "Heading out? Load the cooler from your fridge. Drinks then come out of the cooler (friends can grab one too), and whatever's left goes back in the fridge when you're home." : "This cooler isn't out right now." }),
    mine ? el("button", { class: "btn primary block", type: "button", text: "❄️ Load the cooler", disabled: !canLoad, onclick: () => loadSheet(h, fridge) }) : null,
    mine && !canLoad ? el("p", { class: "hint", text: "The fridge is empty: add drinks to it first." }) : null);
  return el("section", { class: "card stack" },
    el("h3", { text: `${plural(total, "drink")} in the cooler` }),
    el("ul", { class: "item-list" }, ...rows.map(s => el("li", { class: "make-row" },
      el("span", { class: "make-name" }, el("b", { text: `${thingIcon(s)} ${s.thing.title}` }), el("span", { class: "muted small", text: `${fridgeCount(s)} left` })),
      mine && fridgeCount(s) > 0 ? giveButton(s, s.thing, "btn small") : null,
      el("button", { type: "button", class: "btn small", text: "Drink one", disabled: fridgeCount(s) <= 0, onclick: () => drinkOne(s.thing.item, s) })))),
    mine ? el("div", { class: "row" },
      el("button", { class: "btn", type: "button", text: "Load more", disabled: !canLoad, onclick: () => loadSheet(h, fridge) }),
      confirmButton("Back in the fridge", total ? `Tap again: ${total} go back` : "Tap again to put it away", () => {
        unloadCooler(h.id); toast(total ? `${plural(total, "drink")} back in the fridge` : "Cooler put away");
      }, "btn")) : null);
}

/* Give one to a friend: pick who, and it's logged for them and goes on the Tab. */
function giveButton(s, thing = s.thing, cls = "btn") {
  return el("button", { class: cls, type: "button", text: "🎁 Give one", onclick: () => openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: `Give a ${thing.title}` }),
    el("p", { class: "hint", text: "It's logged for them, comes out of here, and goes on the Tab." }),
    el("div", { class: "chips" }, ...giftable().map(m => el("button", { type: "button", class: "chip-btn who", onclick: () => {
      drinkOne(thing.item, s, m.id); closeSheet();
    } }, avatar(m, "xs"), m.displayName))),
    giftable().length ? null : el("p", { class: "muted", text: "Nobody else is in the group yet." }),
    el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })))) });
}

/* Pick how many of each fridge drink go in the cooler. */
function loadSheet(h, fridge) {
  const rows = fridge.filter(s => s.kind === "drink" && fridgeCount(s) > 0), pick = new Map(rows.map(s => [s.id, 0]));
  openSheet(box => {
    const go = el("button", { class: "btn primary block", type: "button" });
    const drawGo = () => {
      const n = [...pick.values()].reduce((a, b) => a + b, 0);
      go.textContent = n ? `Load ${plural(n, "drink")}` : "Pick what goes in";
      go.disabled = !n;
    };
    const line = s => {
      const val = el("b", { class: "step-val" });
      const set = n => { pick.set(s.id, Math.max(0, Math.min(fridgeCount(s), n))); val.textContent = String(pick.get(s.id)); drawGo(); };
      set(0);
      return el("li", { class: "make-row" },
        el("span", { class: "make-name" }, el("b", { text: s.thing.title }), el("span", { class: "muted small", text: `${fridgeCount(s)} in the fridge` })),
        el("button", { type: "button", class: "chip-btn tag", text: "All", onclick: () => set(fridgeCount(s)) }),
        el("div", { class: "stepper", role: "group", "aria-label": `How many ${s.thing.title}` },
          el("button", { type: "button", class: "step-btn", "aria-label": "One less", text: "−", onclick: () => set(pick.get(s.id) - 1) }),
          val,
          el("button", { type: "button", class: "step-btn", "aria-label": "One more", text: "+", onclick: () => set(pick.get(s.id) + 1) })));
    };
    go.addEventListener("click", () => {
      loadCooler(h.id, rows.map(s => ({ entry: s, n: pick.get(s.id) })));
      closeSheet(); toast("Cooler loaded ❄️");
      location.hash = `#/bar/${h.id}/cooler`;
    });
    drawGo();
    box.append(el("div", { class: "stack" },
      el("h2", { text: "Load the cooler" }),
      el("p", { class: "hint", text: "They come out of the fridge now and go back in when you put the cooler away." }),
      el("ul", { class: "item-list" }, ...rows.map(line)),
      go,
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
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
      fridgeCount(s) > 0 ? el("div", { class: "row" },
        el("button", { class: "btn primary", type: "button", text: `${thingIcon(s)} Drink one`, onclick: () => { drinkOne(s.thing.item, s); closeSheet(); } }),
        giveButton(s)) : null,
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
          bottleThumb(s),
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

/* A bottle's photo in a list (the small copy), or its icon when it has none. */
function bottleThumb(s) {
  if (!s.photoAt) return el("span", { class: "item-icon", text: thingIcon(s) });
  const img = el("img", { class: "log-thumb", alt: "", loading: "lazy" });
  loadBottleThumb(s).then(src => { if (src) img.src = src; else img.replaceWith(el("span", { class: "item-icon", text: thingIcon(s) })); });
  return img;
}

/* The photo part of the bottle sheet: tap it (or Camera) to take one, Gallery to pick one. Saved straight away. */
function bottlePhoto(cur, redraw) {
  const msg = el("p", { class: "msg", role: "status" });
  const area = el("button", { type: "button", class: "photo-pick", "aria-label": cur.photoAt ? "Retake the photo with the camera" : "Take a photo of this bottle",
    onclick: () => take(true) });
  if (cur.photoAt) {
    const img = el("img", { alt: `Your ${cur.thing.title}` });
    loadBottlePhoto(cur).then(src => { if (src) img.src = src; });
    area.append(img);
  } else area.append(el("div", { class: "photo-empty" }, el("span", { html: icon.camera }), el("span", { text: "Tap to take a photo of your bottle" })));
  const take = async camera => {
    const file = await pickImage({ camera });
    if (!file) return;
    msg.className = "msg ok"; msg.textContent = "Preparing photo…";
    try { setBottlePhoto(cur.id, await shrinkPhoto(file)); msg.textContent = ""; toast("Photo saved 📷"); later(redraw); }
    catch (e) { console.warn(e); msg.className = "msg err"; msg.textContent = "That photo couldn't be read. Try another one."; }
  };
  return el("div", { class: "stack" }, area,
    el("div", { class: "row" },
      el("button", { class: "btn", type: "button", html: icon.camera, onclick: () => take(true) }, "Camera"),
      el("button", { class: "btn", type: "button", html: icon.image, onclick: () => take(false) }, "Gallery"),
      cur.photoAt ? el("button", { class: "btn", type: "button", text: "Remove", onclick: () => { setBottlePhoto(cur.id, null); later(redraw); } }) : null),
    msg);
}

function bottleSheet(s) {
  openSheet(box => {
    let shown;
    const draw = () => {
      const now = store.stock.find(x => x.id === s.id);
      if (!now) return closeSheet();
      const cur = { ...s, ...now }, f = level(cur);
      // Keeps the photo element across redraws unless the photo itself changed, so it doesn't flicker on every tap.
      if (!shown || shown.at !== cur.photoAt) shown = { at: cur.photoAt, node: bottlePhoto(cur, draw) };
      fill(box, el("div", { class: "stack" },
        el("h2", { text: s.thing.title }),
        f > 0 || cur.spares ? el("div", { class: "row" },
          el("button", { class: "btn primary", type: "button", text: `${thingIcon(s)} Pour one`, onclick: () => { drinkOne(s.thing.item, cur); closeSheet(); } }),
          giveButton(cur, s.thing)) : null,
        shown.node,
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

/* Second step for a drink: fridge (how many) or bar (bottle size). Already there? Add to it instead. From a drink's
   page (`stay`), it stays on that page instead of opening the fridge or bar. */
export function pickWhere(h, i, tab, { stay = false } = {}) {
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
               if (!stay) location.hash = `#/bar/${h.id}/fridge`;
             } })))]
          : [have ? el("p", { class: "muted", text: `Already in the bar (${levelText(have)}). Adding it again counts a spare bottle.` })
               : field("Bottle size", sizePick(size, v => { size = v; })),
             el("button", { class: "btn primary block", type: "button", text: have ? "Add a spare bottle" : "Add a full bottle", onclick: () => {
               if (have) changeStock(id, { spares: (have.spares || 0) + 1 });
               else setStock(id, { hh: h.id, where, kind: "drink", item: i.id }, { size, left: size, spares: 0 });
               closeSheet(); toast(`${i.title} is in the bar`);
               if (!stay) location.hash = `#/bar/${h.id}/bar`;
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
