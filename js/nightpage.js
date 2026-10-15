/* Drink Nights: #/nights (tonight, upcoming and past), #/host (host one) and #/night/<id> (the night itself).
   The logic is in nights.js. */
import { el, fill, icon, avatar, fmtDate, fmtAgo, toast, confirmButton, field, openSheet, closeSheet } from "./ui.js";
import { store, uid, memberName, isAdmin, createNight, updateNight, joinNight, leaveNight, deleteNight, addPlace,
  addBring, setArrived, removeBring } from "./cloud.js";
import { search, itemById, allItems } from "./catalog.js";
import { sortByHave } from "./makeable.js";
import { currentCovers } from "./makeablepage.js";
import { nightLogs, nightStatus, nightcap, tonight, perPerson, roundPicks, bringFor, nightRecap, mornings } from "./nights.js";
import { householdOf, sourcesFor, levelText, fridgeCount, nightBars, combinedHave, borrowNeeds } from "./stock.js";
import { placesByUse, resolvePlace, findPlace, cleanPlaceName, logStd } from "./logs.js";
import { logRow, giftable, roundOf } from "./logpage.js";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const member = id => store.members.get(id) || { id, displayName: memberName(id) };
const placeName = id => id ? (resolvePlace(store.places, id) || {}).name || "" : "";
const hhName = id => (store.households.find(h => h.id === id) || {}).name || "";
const where = n => [n.hh ? `🏠 ${hhName(n.hh)}` : "", placeName(n.placeId) ? `📍 ${placeName(n.placeId)}` : ""].filter(Boolean).join(" · ");
const toLocalInput = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };

/* "Live", "Starts 2026-Oct-16 08:00:00 PM", "Over" */
function statusChip(n) {
  const s = nightStatus(n, store.logs);
  return s.state === "live" ? el("span", { class: "chip gold", text: "🎉 Live" })
    : s.state === "upcoming" ? el("span", { class: "chip", text: `Starts ${fmtDate(n.start)}` })
    : el("span", { class: "chip", text: "Over" });
}

function nightRow(n) {
  const list = nightLogs(n, store.logs);
  return el("li", {}, el("a", { class: "item-row", href: `#/night/${n.id}` },
    el("span", { class: "item-icon", text: "🎉" }),
    el("span", { class: "grow" }, el("b", { text: n.name }),
      el("span", { class: "muted small", text: [fmtDate(n.start), where(n), plural((n.guests || []).length, "person", "people"), plural(list.length, "drink")].filter(Boolean).join(" · ") })),
    statusChip(n)));
}

/* Home: tonight's nights (live, or starting within 12 hours), or a way to host one. */
export function tonightCard() {
  const list = tonight(store.nights, store.logs);
  if (!list.length) return el("a", { class: "card admin-link", href: "#/nights" },
    el("span", { class: "item-icon", text: "🎉" }),
    el("div", { class: "grow" }, el("b", { text: "Drink Nights" }), el("p", { class: "muted small", text: "Host a night: who's coming, rounds and a recap" })),
    el("span", { class: "chev", html: icon.chevron }));
  return el("section", { class: "card stack" },
    el("h3", { text: "🎉 Tonight" }),
    el("ul", { class: "item-list" }, ...list.map(nightRow)));
}

export function renderNights(main) {
  const all = [...store.nights].sort((a, b) => b.start - a.start);
  const now = tonight(store.nights, store.logs), past = all.filter(n => !now.includes(n));
  fill(main,
    el("h2", { class: "page-title", text: "🎉 Drink Nights" }),
    el("a", { class: "btn primary block", href: "#/host", text: "Host a night" }),
    now.length ? el("section", { class: "card stack" }, el("h3", { text: "Tonight" }), el("ul", { class: "item-list" }, ...now.map(nightRow))) : null,
    el("section", { class: "card stack" },
      el("h3", { text: "All nights" }),
      past.length ? el("ul", { class: "item-list" }, ...past.slice(0, 40).map(nightRow))
        : el("p", { class: "muted", text: "No nights yet. Host one: pick a place and who's coming, and the drinks logged that night come together." })));
}

/* #/host: name, when, where, at your place or out, and who's coming. */
export function renderHost(main) {
  const me = store.me || {}, hh = householdOf(store.households, uid());
  const s = { start: null, placeId: null, home: !!hh, guests: new Set() };
  const name = el("input", { type: "text", maxlength: 40, autocapitalize: "words", value: `${me.displayName || "My"}'s night` });
  const startIn = el("input", { type: "datetime-local", class: "when-input", "aria-label": "Starts", value: toLocalInput(Date.now() + 3600000) });
  const whenRow = el("div", { hidden: true }, startIn);
  const whenBox = el("div", { class: "chips", role: "group", "aria-label": "When" });
  const drawWhen = () => { whenRow.hidden = !s.start; fill(whenBox,
    el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.start), onclick: () => { s.start = null; drawWhen(); } }, "Now"),
    el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!!s.start), onclick: () => { s.start = "later"; drawWhen(); startIn.focus(); } }, "Later…")); };
  drawWhen();

  const placeBox = el("div", { class: "chips", role: "group", "aria-label": "Where" });
  const newPlace = el("input", { type: "text", maxlength: 60, placeholder: "Or a new place", autocapitalize: "words" });
  const drawPlaces = () => fill(placeBox,
    el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.placeId), onclick: () => { s.placeId = null; drawPlaces(); } }, "No place"),
    ...placesByUse(store.places, store.logs, uid()).slice(0, 6).map(p => el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.placeId === p.id),
      onclick: () => { s.placeId = p.id; newPlace.value = ""; drawPlaces(); } }, `📍 ${p.name}`)));
  drawPlaces();

  const homeIn = el("input", { type: "checkbox", checked: s.home ? true : null, onchange: e => { s.home = e.target.checked; } });
  const guestBox = el("div", { class: "chips", role: "group", "aria-label": "Who's coming" });
  const drawGuests = () => fill(guestBox, ...giftable().map(m => el("button", { type: "button", class: "chip-btn who", "aria-pressed": String(s.guests.has(m.id)),
    onclick: () => { s.guests.has(m.id) ? s.guests.delete(m.id) : s.guests.add(m.id); drawGuests(); } }, avatar(m, "xs"), m.displayName)));
  drawGuests();

  const msg = el("p", { class: "msg err", role: "alert" });
  fill(main,
    el("h2", { class: "page-title", text: "🎉 Host a night" }),
    el("section", { class: "card stack" }, field("Name", name, "e.g. Game night, The Basement Friday")),
    el("section", { class: "card stack" }, el("h3", { text: "When" }), whenBox, whenRow,
      el("p", { class: "hint", text: "No end time needed: the night ends with its last drink (the Nightcap). You can end it yourself too." })),
    el("section", { class: "card stack" }, el("h3", { text: "Where" }), placeBox, newPlace,
      hh ? el("label", { class: "check" }, homeIn, el("span", {}, `🏠 At ${hh.name} (rounds can come from your fridge and bar)`)) : null),
    el("section", { class: "card stack" }, el("h3", { text: "Who's coming" }), guestBox,
      el("p", { class: "hint", text: "Anyone else in the group can tap \"I'm here\" to join." })),
    msg,
    el("button", { class: "btn primary block", type: "button", text: "Start the night 🎉", onclick: () => {
      let start = Date.now();
      if (s.start) { start = new Date(startIn.value).getTime(); if (!start) { msg.textContent = "Pick when it starts."; return; } }
      let placeId = s.placeId;
      const typed = cleanPlaceName(newPlace.value);
      if (typed) { const found = findPlace(store.places, typed); placeId = found ? found.id : addPlace(typed); }
      const id = createNight({ name: name.value, start, placeId, hh: s.home && hh ? hh.id : null, guests: [...s.guests] });
      location.hash = `#/night/${id}`;
    } }));
}

/* #/night/<id>: who's there, the drinks so far and the Nightcap. */
export function renderNight(main, id) {
  const n = store.nights.find(x => x.id === id);
  if (!n) return fill(main, el("div", { class: "card" }, el("p", { text: "That night isn't here any more." })), el("a", { class: "btn block", href: "#/nights", text: "Drink Nights" }));
  const me = uid(), host = n.host === me, here = (n.guests || []).includes(me), st = nightStatus(n, store.logs);
  const list = nightLogs(n, store.logs), cap = nightcap(n, store.logs);
  fill(main,
    el("nav", { class: "crumbs", "aria-label": "Where you are" }, el("ol", {},
      el("li", {}, el("a", { href: "#/nights", text: "Drink Nights" })),
      el("li", {}, el("span", { "aria-current": "page", text: n.name })))),
    el("section", { class: "hero card" },
      el("span", { class: "hero-icon", text: "🎉" }),
      el("h2", { text: n.name }),
      statusChip(n),
      el("p", { class: "muted", text: [`Hosted by ${host ? "you" : member(n.host).displayName}`, fmtDate(n.start), where(n)].filter(Boolean).join(" · ") }),
      n.end != null ? el("p", { class: "muted small", text: `Ended ${fmtDate(n.end)}` }) : null,
      el("div", { class: "chips center" }, ...(n.guests || []).map(g => el("a", { class: "chip-btn who", href: g === me ? "#/me" : `#/u/${g}` }, avatar(member(g), "xs"), member(g).displayName))),
      !here && st.state !== "over" ? el("button", { class: "btn primary", type: "button", text: "🙋 I'm here", onclick: () => { joinNight(n.id); toast("You're in. Drinks you log now count for the night."); } }) : null),
    n.hh && st.state !== "over" ? el("a", { class: "card admin-link", href: `#/bar/${n.hh}/bar` }, el("span", { class: "item-icon", text: "🛎️" }),
      el("div", { class: "grow" }, el("b", { text: "Order from the bar" }), el("p", { class: "muted small", text: `${hhName(n.hh)}'s menu, open while the night is on` })),
      el("span", { class: "chev", html: icon.chevron })) : null,
    st.state !== "over" ? el("a", { class: "card admin-link", href: `#/plan/${n.id}` }, el("span", { class: "item-icon", text: "🍸" }),
      el("div", { class: "grow" }, el("b", { text: "What can we make" }), el("p", { class: "muted small", text: "Everyone's bars together, and who could bring what" })),
      el("span", { class: "chev", html: icon.chevron })) : null,
    st.state === "over" ? recapCard(n) : null,
    st.state === "over" && here ? morningCard(n) : null,
    here && st.state !== "over" ? roundCard(n, list) : null,
    st.state !== "over" || bringFor(store.bring, n.id).length ? bringCard(n, here || host, st.state !== "over") : null,
    el("section", { class: "card stack" },
      el("h3", { text: list.length ? `${plural(list.length, "drink")} so far` : "No drinks yet" }),
      list.length ? el("p", { class: "muted small", text: perPerson(list).map(p => `${member(p.uid).displayName} ${p.n}`).join(" · ") }) : null,
      list.length ? el("ul", { class: "item-list" }, ...[...list].reverse().map(l => {
        const row = logRow(l, { who: true });
        if (cap && cap.id === l.id) row.querySelector(".muted").append(" · 🌙 Nightcap");
        return row;
      })) : el("p", { class: "muted", text: "Drinks logged by anyone here count for the night automatically." })),
    el("div", { class: "stack" },
      host ? el("button", { class: "btn block", type: "button", text: "Invite people", onclick: () => inviteSheet(n) }) : null,
      host && st.state === "live" && n.end == null ? confirmButton("End the night", "Tap again to end it now", () => { updateNight(n.id, { end: Date.now() }); toast("Night over. 🌙"); }, "btn block") : null,
      host && n.end != null ? el("button", { class: "btn block", type: "button", text: "Keep it going (take the end time off)", onclick: () => updateNight(n.id, { end: null }) }) : null,
      here && !host ? el("button", { class: "btn quiet block", type: "button", text: "Leave this night", onclick: () => leaveNight(n.id) }) : null,
      host || isAdmin() ? confirmButton("Delete this night", "Tap again to delete (the drinks stay)", () => { deleteNight(n.id); location.hash = "#/nights"; }, "btn danger block") : null));
}

/* ---------- Planning a night ---------- */
/* #/plan/<night>: What can I make, from every guest's bar and fridge together. Cocktails the host's bar can't make on its
   own say what to borrow and from whom, and the host can ask them to bring it (it goes on the bring list). */
export function renderPlan(main, id) {
  const n = store.nights.find(x => x.id === id);
  if (!n) return fill(main, el("div", { class: "card" }, el("p", { text: "That night isn't here any more." })));
  const cov = currentCovers(), bars = nightBars(store.stock, store.households, n.guests || [], cov);
  const baseId = n.hh || (householdOf(store.households, n.host) || {}).id, base = bars.find(b => b.hh === baseId);
  const all = combinedHave(bars), host = n.host === uid();
  const { now, one } = sortByHave(allItems().filter(i => i.kind === "cocktail"), all);
  const asked = new Set(store.bring.filter(b => b.night === n.id).map(b => b.text.toLowerCase()));
  const askButton = (need, bar) => {
    const who = bar.people[0], text = need.line.item.replace(/ \(optional\)$/, "");
    return asked.has(text.toLowerCase()) ? el("span", { class: "chip", text: "On the bring list" })
      : el("button", { class: "btn small", type: "button", text: `Ask ${member(who).displayName}`, onclick: () => {
          addBring(n.id, who, text); toast(`Added to the bring list: ${member(who).displayName} brings ${text}`);
        } });
  };
  const nowRow = r => {
    const needs = base ? borrowNeeds(r.item.data, base.have, bars.filter(b => b !== base)) : [];
    return el("li", { class: "stack tight" },
      el("a", { class: "item-row", href: `#/recipe/${r.item.id}` }, el("span", { class: "item-icon", text: r.item.category.icon }),
        el("span", { class: "grow" }, el("b", { text: r.item.title }),
          el("span", { class: "muted small", text: needs.length ? `Borrow: ${needs.map(x => `${x.line.item} (${x.from.map(b => b.name).join(" or ")})`).join(", ")}` : base ? `All at ${base.name}` : "" })),
        el("span", { class: "chev", html: icon.chevron })),
      host && needs.length ? el("div", { class: "row" }, ...needs.map(x => askButton(x, x.from[0]))) : null);
  };
  fill(main,
    el("nav", { class: "crumbs", "aria-label": "Where you are" }, el("ol", {},
      el("li", {}, el("a", { href: `#/night/${n.id}`, text: n.name })),
      el("li", {}, el("span", { "aria-current": "page", text: "What can we make" })))),
    el("h2", { class: "page-title", text: "🍸 What can we make" }),
    el("section", { class: "card stack" },
      el("p", {}, bars.length ? `From ${bars.map(b => b.name).join(", ")} together.` : "Nobody coming has a bar & fridge set up yet."),
      el("p", { class: "hint", text: host ? "Cocktails that need something from a guest's bar say what to borrow. Ask them to bring it, and it goes on the bring list." : "Cocktails that need something from someone's bar say what to borrow." })),
    el("section", { class: "card stack" },
      el("h3", { text: `✅ Can make together · ${now.length}` }),
      now.length ? el("ul", { class: "item-list" }, ...now.map(nowRow)) : el("p", { class: "muted", text: "Nothing yet. Missing 1 shows what's closest." })),
    one.length ? el("section", { class: "card stack" },
      el("h3", { text: `🛒 Nobody has 1 thing · ${one.length}` }),
      el("ul", { class: "item-list" }, ...one.slice(0, 40).map(r => el("li", {}, el("a", { class: "item-row", href: `#/recipe/${r.item.id}` },
        el("span", { class: "item-icon", text: r.item.category.icon }),
        el("span", { class: "grow" }, el("b", { text: r.item.title }), el("span", { class: "muted small", text: `Someone needs to buy: ${r.missing[0].item}` })),
        el("span", { class: "chev", html: icon.chevron })))))) : null);
}

/* ---------- Recaps ---------- */
const drinkTitle = id => (itemById("drink", id) || { title: "a drink" }).title;
const timeOf = t => fmtDate(t).split(" ").slice(1).join(" ");

/* The night's recap, once it's over: everything, including drinks per person (shown here, not in the feed). */
function recapCard(n) {
  const r = nightRecap(n, store.logs);
  const line = (icon, label, value) => value ? el("li", {}, `${icon} `, el("b", { text: `${label}: ` }), value) : null;
  const stockNow = id => store.stock.find(s => s.id === id);
  return el("section", { class: "card stack" },
    el("h3", { text: "🌙 The recap" }),
    el("ul", { class: "recap-lines" },
      line("🍻", "Drinks", `${r.total}${r.people.length ? ` (${r.people.map(p => `${nameOf(p.uid)} ${p.n}`).join(", ")})` : ""}`),
      line("🏆", "Most poured", r.top ? `${(itemById(r.top.kind, r.top.drinkId) || { title: "a drink" }).title} (${r.top.n})` : ""),
      line("🍾", "Bottles killed", r.killed.map(k => `${drinkTitle(k.drinkId)} (${nameOf(k.by)})`).join(", ")),
      line("🥃", "Poured from the bar", r.poured.map(p => { const s = stockNow(p.stockId); return `${drinkTitle(p.item)} ${Math.round(p.ml)} ml${s ? `, now ${levelText(s)}` : ""}`; }).join("; ")),
      line("🧊", "Out of fridges and coolers", r.takenOut.map(t => `${t.n} × ${drinkTitle(t.item)}`).join(", ")),
      line("🎁", "Most generous", r.generous ? `${nameOf(r.generous.uid)} (${plural(r.generous.n, "drink")} given)` : ""),
      line("😴", "First to tap out", r.firstOut ? `${nameOf(r.firstOut.uid)} (last drink ${timeOf(r.firstOut.at)})` : ""),
      line("🌙", "Nightcap", r.nightcap ? `${nameOf(r.nightcap.uid)} at ${timeOf(r.nightcap.at)}` : "")),
    el("p", { class: "hint", text: "The recap is posted to the feed too (without the drinks per person)." }));
}
const nameOf = id => id === uid() ? "You" : member(id).displayName;

/* The morning after, just for you: what you drank, your standard drinks, and what you gave and were given. */
function morningBody(m) {
  return [
    el("p", {}, el("b", { text: `${plural(m.logs.length, "drink")} · ${m.std} standard drink${m.std === 1 ? "" : "s"}` })),
    el("p", { class: "muted small", text: m.logs.map(l => l.title).join(", ") }),
    m.gave || m.got ? el("p", { class: "small", text: [m.gave ? `🎁 You gave ${plural(m.gave, "drink")}` : "", m.got ? `you were given ${plural(m.got, "drink")}` : ""].filter(Boolean).join(" · ") }) : null,
    el("p", { class: "hint", text: "Only you can see this. If you don't remember, the app will." }),
  ];
}
function morningCard(n) {
  const m = mornings([n], store.logs, uid(), logStd)[0];
  return m ? el("section", { class: "card stack" }, el("h3", { text: "☀️ Your morning after" }), ...morningBody(m)) : null;
}

/* Home: the morning after a night you drank at, until noon. */
export function morningHomeCard() {
  const m = mornings(store.nights, store.logs, uid(), logStd)[0];
  if (!m) return null;
  return el("section", { class: "card stack" },
    el("div", { class: "row spread" }, el("h3", { text: `☀️ The morning after ${m.night.name}` }),
      el("a", { class: "btn small", href: `#/night/${m.night.id}`, text: "Recap" })),
    ...morningBody(m));
}

/* ---------- The bring list ---------- */
/* Who's bringing what, ticked off when it arrives. The bringer or the host ticks it; you add your own, the host adds for
   anyone. Drinks to share go in the bringer's cooler, so handing them out uses the cooler and goes on the Tab. */
function bringCard(n, canAdd, open) {
  const me = uid(), host = n.host === me, groups = bringFor(store.bring, n.id), myHh = householdOf(store.households, me);
  const text = el("input", { type: "text", maxlength: 80, placeholder: "e.g. 12 Molson, ice, chips", autocapitalize: "sentences" });
  const count = el("input", { type: "number", inputmode: "numeric", min: "1", max: "99", placeholder: "How many", "aria-label": "How many (optional)" });
  const who = host ? el("select", { "aria-label": "Who's bringing it" }, ...(n.guests || []).map(g => el("option", { value: g, text: g === me ? "Me" : member(g).displayName }))) : null;
  const add = () => {
    if (!text.value.trim()) return text.focus();
    addBring(n.id, who ? who.value : me, text.value, Number(count.value) || 0);
    text.value = ""; count.value = "";
  };
  return el("section", { class: "card stack" },
    el("h3", { text: "📝 Bring list" }),
    groups.length ? el("ul", { class: "item-list" }, ...groups.flatMap(g => g.items.map(b => {
      const mine = b.by === me || host;
      return el("li", { class: "make-row" },
        el("label", { class: "check grow" },
          el("input", { type: "checkbox", checked: b.arrived ? true : null, disabled: !mine, onchange: e => setArrived(b.id, e.target.checked) }),
          el("span", {}, el("b", { text: `${b.n ? `${b.n} × ` : ""}${b.text}` }), el("br"),
            el("span", { class: "muted small", text: `${b.by === me ? "You" : member(b.by).displayName}${b.arrived ? " · ✓ here" : ""}` }))),
        mine || b.addedBy === me ? el("button", { type: "button", class: "icon-x", "aria-label": `Remove ${b.text}`, text: "×", onclick: () => removeBring(b.id) }) : null);
    }))) : el("p", { class: "muted", text: "Nothing on the list yet. Say what you're bringing so nobody brings three bags of ice." }),
    canAdd && open ? el("div", { class: "stack" },
      el("div", { class: "row" }, text, count),
      who ? field("Who's bringing it", who) : null,
      el("button", { class: "btn", type: "button", text: "Add to the list", onclick: add }),
      el("p", { class: "hint" }, "Bringing drinks to share? ",
        myHh ? el("a", { href: `#/bar/${myHh.id}/cooler`, text: "Load your cooler" }) : "Load your cooler",
        ": friends can grab one, and it goes on the Tab.")) : null);
}

/* ---------- Group rounds ---------- */
// The last round poured on this phone, per night, for Same again: { drinkId, people, from }.
const lastRound = new Map();

function roundCard(n, list) {
  const last = lastRound.get(n.id), item = last && itemById("drink", last.drinkId);
  return el("section", { class: "card stack" },
    el("div", { class: "row" },
      el("button", { class: "btn primary", type: "button", text: "🍻 Round", onclick: () => roundSheet(n, list) }),
      item ? el("button", { class: "btn", type: "button", text: `🔁 Same again (${last.people.length} × ${item.title})`, onclick: () => {
        pour(n, item, last.people, last.from);
      } }) : null),
    el("p", { class: "hint", text: "One of the same drink for everyone you pick, in one tap. Yours is yours; everyone else's is on you (the Tab)." }));
}

// Pours the round from the stock entry picked, if it's still there.
function pour(n, item, people, fromId) {
  const entry = fromId ? store.stock.find(s => s.id === fromId) : null;
  roundOf(item, entry, people);
  lastRound.set(n.id, { drinkId: item.id, people, from: fromId });
}

function roundSheet(n, list) {
  const me = uid(), hh = (householdOf(store.households, me) || {}).id;
  const s = { item: null, people: new Set(n.guests || []), from: null };
  openSheet(box => {
    const q = el("input", { type: "search", class: "search-input", placeholder: "Search for a drink…", autocomplete: "off", autocorrect: "off", spellcheck: "false" });
    const results = el("ul", { class: "item-list" }), body = el("div", { class: "stack" });
    const pickItem = i => {
      s.item = i;
      const homes = sourcesFor(store.stock, hh, i.id);
      s.from = homes.length ? homes[0].id : null;
      draw();
    };
    const row = i => el("li", {}, el("button", { type: "button", class: "item-row plain", "aria-pressed": String(s.item === i), onclick: () => pickItem(i) },
      el("span", { class: "item-icon", text: i.category.icon }), el("span", { class: "grow" }, el("b", { text: i.title }), el("span", { class: "muted small", text: i.style.name }))));
    const drawResults = () => {
      const text = q.value.trim();
      const picks = text ? search(text).filter(i => i.kind === "drink").slice(0, 10)
        : roundPicks(list).map(p => itemById("drink", p.drinkId)).filter(Boolean).slice(0, 8);
      fill(results, ...picks.map(row), !text && !picks.length ? el("p", { class: "muted small", text: "Search for what everyone's having." }) : null);
    };
    q.addEventListener("input", drawResults);
    const draw = () => {
      if (!s.item) return fill(body, el("label", { class: "search" }, el("span", { html: icon.search }), q), results);
      const homes = sourcesFor(store.stock, hh, s.item.id);
      const label = e => e.where === "cooler" ? `❄️ Your cooler (${fridgeCount(e)})` : e.where === "fridge" ? `🧊 Your fridge (${fridgeCount(e)})` : `🍾 Your bar (${levelText(e)})`;
      fill(body,
        el("div", { class: "row spread" }, el("b", { text: `${s.item.category.icon} ${s.item.title}` }),
          el("button", { class: "btn small", type: "button", text: "Change", onclick: () => { s.item = null; draw(); drawResults(); } })),
        el("h3", { text: "Who's having one" }),
        el("div", { class: "chips" }, ...(n.guests || []).map(g => el("button", { type: "button", class: "chip-btn who", "aria-pressed": String(s.people.has(g)),
          onclick: () => { s.people.has(g) ? s.people.delete(g) : s.people.add(g); draw(); } }, avatar(member(g), "xs"), g === me ? "Me" : member(g).displayName))),
        homes.length ? [el("h3", { text: "From" }), el("div", { class: "chips" },
          el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!s.from), onclick: () => { s.from = null; draw(); } }, "Not from home"),
          ...homes.map(e => el("button", { type: "button", class: "chip-btn", "aria-pressed": String(s.from === e.id), onclick: () => { s.from = e.id; draw(); } }, label(e))))] : null,
        el("button", { class: "btn primary block", type: "button", disabled: !s.people.size, text: s.people.size ? `Pour ${s.people.size} 🍻` : "Pick who's having one",
          onclick: () => { pour(n, s.item, [...s.people], s.from); closeSheet(); } }));
    };
    drawResults(); draw();
    box.append(el("div", { class: "stack" }, el("h2", { text: "🍻 A round" }), body,
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

function inviteSheet(n) {
  openSheet(box => {
    const pick = new Set(n.guests || []);
    const chips = el("div", { class: "chips" });
    const draw = () => fill(chips, ...giftable().map(m => el("button", { type: "button", class: "chip-btn who", "aria-pressed": String(pick.has(m.id)),
      onclick: () => { pick.has(m.id) ? pick.delete(m.id) : pick.add(m.id); draw(); } }, avatar(m, "xs"), m.displayName)));
    draw();
    box.append(el("div", { class: "stack" }, el("h2", { text: "Who's coming" }), chips,
      el("button", { class: "btn primary block", type: "button", text: "Save", onclick: () => { updateNight(n.id, { guests: [...new Set([n.host, ...pick])] }); closeSheet(); } }),
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}
