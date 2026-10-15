/* Drink Nights: #/nights (tonight, upcoming and past), #/host (host one) and #/night/<id> (the night itself).
   The logic is in nights.js. */
import { el, fill, icon, avatar, fmtDate, fmtAgo, toast, confirmButton, field, openSheet, closeSheet } from "./ui.js";
import { store, uid, memberName, isAdmin, createNight, updateNight, joinNight, leaveNight, deleteNight, addPlace } from "./cloud.js";
import { nightLogs, nightStatus, nightcap, tonight, perPerson } from "./nights.js";
import { householdOf } from "./stock.js";
import { placesByUse, resolvePlace, findPlace, cleanPlaceName } from "./logs.js";
import { logRow, giftable } from "./logpage.js";

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
