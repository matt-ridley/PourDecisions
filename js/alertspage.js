/* The alerts bell in the header and #/alerts: what happened to you while you were away (see alerts.js).
   What you've seen is kept on your member document (alertsSeenAt), so it's the same on every phone. */
import { el, fill, avatar, fmtAgo, icon } from "./ui.js";
import { store, uid, memberName, updateMe } from "./cloud.js";
import { itemById } from "./catalog.js";
import { alertsFor, unreadCount } from "./alerts.js";
import { groupRatings, starText } from "./ratepage.js";
import { variantTitle } from "./variants.js";
import { titleOf } from "./logpage.js";
import { groupCrowns } from "./statspage.js";
import { CROWN_INDEX } from "./crowns.js";
import { lowStock, fridgeCount, levelText } from "./stock.js";
import { myPlaces } from "./myplace.js";
import { mornings } from "./nights.js";
import { orderItem } from "./orders.js";
import { logStd } from "./logs.js";

/* Your alerts, worked out again only when the data behind them changes. */
let memo = { key: [], list: [] };
function myAlerts() {
  const key = [uid(), store.logs, store.cheers, store.comments, store.ratings, store.variants, store.stock, store.households, store.nights, store.orders, Math.floor(Date.now() / 600000)];
  if (key.some((k, n) => k !== memo.key[n])) {
    memo = { key, list: alertsFor(uid(), { logs: store.logs, cheers: store.cheers, comments: store.comments, ratings: groupRatings(), crowns: groupCrowns().changes,
      low: myPlaces().flatMap(h => lowStock(store.stock, h.id)),
      mornings: mornings(store.nights, store.logs, uid(), logStd),
      orders: store.orders, myHh: myPlaces().map(h => h.id) }) };
  }
  return memo.list;
}
const seenAt = () => (store.me && store.me.alertsSeenAt) || 0;

/* The bell, with how many alerts are new. */
export function bellButton() {
  const n = unreadCount(myAlerts(), seenAt());
  return el("a", { class: "icon-btn bell", href: "#/alerts", "aria-label": n ? `Alerts, ${n} new` : "Alerts" },
    el("span", { html: icon.bell }), n ? el("b", { class: "bell-count", text: n > 9 ? "9+" : String(n) }) : null);
}

// What was new when this visit to the page started stays highlighted while you're on it.
let visit = { on: false, since: 0 };
window.addEventListener("hashchange", () => { if (!location.hash.startsWith("#/alerts")) visit.on = false; });

export function renderAlerts(main) {
  const list = myAlerts();
  if (!visit.on) {
    visit = { on: true, since: seenAt() };
    if (unreadCount(list, seenAt())) updateMe({ alertsSeenAt: Date.now() });
  }
  fill(main,
    el("h2", { class: "page-title", text: "Alerts" }),
    list.length
      ? el("ul", { class: "item-list card alert-list" }, ...list.slice(0, 60).map(a => alertRow(a, a.at > visit.since)).filter(Boolean))
      : el("section", { class: "card empty" }, el("span", { class: "empty-art", text: "🔔" }),
          el("p", { class: "muted", text: "Nothing yet. Cheers, comments and friends making your cocktails show up here." })),
    el("p", { class: "hint center", text: "The last 30 days." }));
}

const member = id => store.members.get(id) || { id, displayName: memberName(id) };
/* "Dave", "Dave and Sam", "Dave and 2 others" */
const names = ids => ids.length === 1 ? member(ids[0]).displayName
  : ids.length === 2 ? `${member(ids[0]).displayName} and ${member(ids[1]).displayName}`
  : `${member(ids[0]).displayName} and ${ids.length - 1} others`;

function variantName(id) {
  const v = itemById("variant", id), c = v && itemById("cocktail", v.base);
  return v && c ? variantTitle(c.data, v.data) : "your variant";
}

/* "Molson Canadian is running low: 2 left", "Campari is down to ¼", "Out of fresh lime juice" */
const lowText = s => s.kind === "ing" ? `Out of ${s.thing.title.charAt(0).toLowerCase()}${s.thing.title.slice(1)}`
  : s.where === "fridge" ? `${s.thing.title} is running low: ${fridgeCount(s)} left in the fridge`
  : levelText(s) === "Empty" ? `${s.thing.title} is empty, with no spare` : `${s.thing.title} is down to ${levelText(s)}, with no spare`;

const crownName = id => { const c = CROWN_INDEX.get(id); return c ? `${c.icon} ${c.name}` : "a"; };

function alertRow(a, isNew) {
  const log = a.logId && store.logs.find(l => l.id === a.logId);
  const quote = t => `"${t.length > 80 ? `${t.slice(0, 80)}…` : t}"`;
  const [emoji, text, href] = {
    cheer: () => ["🍻", `${names(a.from)} said cheers to your post`, `#/post/${a.post}`],
    comment: () => ["💬", `${names(a.from)} commented: ${quote(a.text)}`, `#/post/${a.post}`],
    reply: () => ["💬", `${names(a.from)} also commented: ${quote(a.text)}`, `#/post/${a.post}`],
    made: () => ["🍸", `${names(a.from)} made your ${variantName(a.variantId)}`, `#/v/${a.variantId}`],
    madeFor: () => ["🎁", `${names(a.from)} made you ${log ? titleOf(log) : "a drink"}`, `#/l/${a.logId}`],
    given: () => ["🎁", `${names(a.from)} gave you ${log ? titleOf(log) : "a drink"}`, `#/l/${a.logId}`],
    disputed: () => ["❌", `${names(a.from)} says the ${log ? titleOf(log) : "drink"} you gave isn't right: it's off the Tab`, `#/l/${a.logId}`],
    rated: () => ["⭐", `${names(a.from)} rated your ${variantName(a.variantId)} ${starText(a.rating)}`, `#/v/${a.variantId}`],
    houseWon: () => ["👑", `Your ${variantName(a.variantId)} is now the House Pour`, `#/v/${a.variantId}`],
    houseLost: () => ["👑", `${names(a.from)}'s ${variantName(a.variantId)} took your House Pour`, `#/v/${a.variantId}`],
    crownWon: () => ["👑", `You took the ${crownName(a.crown)} crown`, "#/board"],
    crownLost: () => ["👑", `${names(a.from)} took your ${crownName(a.crown)} crown`, "#/board"],
    order: () => ["🛎️", `${names(a.from)} ordered ${(orderItem(a.order) || { title: "a drink" }).title}${a.order.note ? `: "${a.order.note}"` : ""}`, `#/bar/${a.order.hh}`],
    served: () => ["🍹", `${names(a.from)} served your ${(orderItem(a.order) || { title: "drink" }).title}`, a.order.logId ? `#/l/${a.order.logId}` : `#/bar/${a.order.hh}`],
    morning: () => ["☀️", `Good morning. Your recap of ${(store.nights.find(n => n.id === a.nightId) || { name: "last night" }).name} is ready`, `#/night/${a.nightId}`],
    low: () => [a.stock.where === "fridge" ? "🧊" : "🍾", lowText(a.stock), `#/bar/${a.stock.hh}/${a.stock.where}`],
  }[a.kind]?.() || [];
  if (!text) return null;
  return el("li", { class: isNew ? "alert new" : "alert" }, el("a", { class: "item-row", href },
    a.from.length ? avatar(member(a.from[0]), "sm") : el("span", { class: "item-icon", text: emoji }),
    el("span", { class: "grow" }, el("span", { text: `${a.from.length ? `${emoji} ` : ""}${text}` }),
      el("span", { class: "muted small", text: fmtAgo(a.at) })),
    isNew ? el("span", { class: "new-dot", "aria-label": "New" }) : null));
}
