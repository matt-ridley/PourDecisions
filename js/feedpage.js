/* The feed on Home: what everyone's pouring (see feed.js), with filters, "Same here" on a friend's drink, and
   Show more for older days. Amounts are never shown: how much is a personal stat. */
import { el, fill, avatar, fmtAgo, toast } from "./ui.js";
import { store, uid, memberName, saveLog, deleteLog } from "./cloud.js";
import { itemById } from "./catalog.js";
import { CATEGORIES } from "./catalog/styles.js";
import { feedItems, filterFeed, hasOlder, sameHere, FEED_DAYS } from "./feed.js";
import { groupRatings, starText, ratingOfLog } from "./ratepage.js";
import { asItem, variantTitle } from "./variants.js";
import { lastPlace, resolvePlace } from "./logs.js";
import { titleOf, thumbBox } from "./logpage.js";

// Filters last for this session: who ("" = everyone), category, photos only, and how many days back.
const f = { who: "", cat: "", photos: false, days: FEED_DAYS };
const SHOWN = 4; // drinks shown on a night's card before "Show the rest"

/* Everything in the feed, worked out again only when the data behind it changes. */
let memo = { key: [], items: [] };
function allFeed() {
  const key = [store.logs, store.ratings, store.drinks, store.places, store.variants];
  if (key.some((k, n) => k !== memo.key[n])) memo = { key, items: feedItems({ logs: store.logs, ratings: groupRatings(), drinks: store.drinks, places: store.places }) };
  return memo.items;
}

const member = id => store.members.get(id) || { id, displayName: memberName(id) };
const nameOf = id => id === uid() ? "You" : member(id).displayName;
const placeName = id => id ? ((resolvePlace(store.places, id) || {}).name || "") : "";

export function feedCard() {
  const box = el("section", { class: "stack" });
  const draw = () => {
    const all = allFeed(), items = filterFeed(all, f);
    const people = [...store.members.values()].filter(m => !m.suspended).sort((a, b) => a.displayName.localeCompare(b.displayName));
    const who = el("select", { "aria-label": "Whose drinks" }, el("option", { value: "", text: "Everyone" }),
      ...people.map(m => el("option", { value: m.id, text: m.id === uid() ? "Just me" : m.displayName })));
    who.value = f.who;
    who.addEventListener("change", () => { f.who = who.value; draw(); });
    const cat = el("select", { "aria-label": "Category" }, el("option", { value: "", text: "All drinks" }),
      ...CATEGORIES.map(c => el("option", { value: c.id, text: `${c.icon} ${c.name}` })));
    cat.value = f.cat;
    cat.addEventListener("change", () => { f.cat = cat.value; draw(); });
    fill(box,
      el("div", { class: "row spread" }, el("h3", { text: "The feed" }),
        el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(f.photos), onclick: () => { f.photos = !f.photos; draw(); } }, "📷 Photos")),
      el("div", { class: "feed-filters" }, who, cat),
      items.length ? el("ul", { class: "feed-list" }, ...items.map(feedRow).filter(Boolean))
        : el("p", { class: "card muted center", text: f.who || f.cat || f.photos ? "Nothing matches in these days. Try other filters or Show more."
            : "Nothing in the feed yet. Log a drink and it shows up here for the group." }),
      hasOlder(filterFeed(all, { ...f, days: 100000 }), f.days)
        ? el("button", { type: "button", class: "btn block", text: "Show more", onclick: () => { f.days += FEED_DAYS; draw(); } }) : null);
  };
  draw();
  return box;
}

function feedRow(it) {
  switch (it.type) {
    case "session": return sessionCard(it);
    case "review": return reviewCard(it);
    case "variant": return variantCard(it);
    case "house": return houseCard(it);
    case "added": return addedCard(it);
    default: return null;
  }
}

const head = (id, text, at) => el("div", { class: "feed-head" },
  el("a", { href: id === uid() ? "#/me" : `#/u/${id}` }, avatar(member(id), "sm")),
  el("div", { class: "grow" }, el("p", {}, text), el("span", { class: "muted small", text: fmtAgo(at) })));
const who = id => el("b", { text: nameOf(id) });

/* One person's night: their drinks, newest first, each with their rating and Same here. */
function sessionCard(s) {
  const place = placeName(s.placeId);
  const rows = s.logs.map(drinkRow);
  const list = el("ul", { class: "item-list" }, ...rows.slice(0, SHOWN));
  const more = rows.length > SHOWN ? el("button", { type: "button", class: "btn small quiet", text: "Show the rest",
    onclick: e => { list.append(...rows.slice(SHOWN)); e.currentTarget.remove(); } }) : null;
  return el("li", { class: "card feed-card" },
    head(s.uid, [who(s.uid), place ? ` at 📍 ${place}` : ""], s.at), list, more);
}

function drinkRow(l) {
  const r = ratingOfLog(l), item = itemById(l.kind, l.drinkId);
  const meta = [item ? (l.variantId ? `Variant of ${item.title}` : item.style.name) : "", l.madeBy ? `made by ${nameOf(l.madeBy)}` : "",
    r ? starText(r.rating) : ""].filter(Boolean).join(" · ");
  return el("li", { class: "log-row" },
    el("a", { class: "item-row grow", href: `#/l/${l.id}` }, thumbBox(l),
      el("span", { class: "grow" }, el("b", { text: titleOf(l) }), el("span", { class: "muted small", text: meta }))),
    l.uid !== uid() && item ? el("button", { class: "btn small", type: "button", text: "Same here", "aria-label": `Same here: ${titleOf(l)}`,
      onclick: () => {
        const p = lastPlace(store.logs, uid());
        const fields = sameHere(l, { placeId: p ? (resolvePlace(store.places, p) || { id: p }).id : null });
        if (!fields) return;
        const id = saveLog(fields);
        toast(`${titleOf(l)} logged for you 🍻`, { label: "Undo", run: () => deleteLog(id) });
      } }) : null);
}

function reviewCard({ uid: id, rating: r, at }) {
  const i = r.kind === "variant" ? asItem(r.drinkId) : itemById(r.kind, r.drinkId);
  if (!i) return null;
  const href = r.kind === "variant" ? `#/v/${i.id}` : `#/${r.kind === "cocktail" ? "recipe" : "drink"}/${i.id}`;
  return el("li", { class: "card feed-card" },
    head(id, [who(id), " reviewed ", el("a", { href, text: i.title }), " ", el("span", { class: "rating-line small", text: starText(r.rating) })], at),
    el("p", { class: "notes feed-quote", text: r.review }));
}

function variantCard({ uid: id, variantId, base, at }) {
  const v = itemById("variant", variantId), c = itemById("cocktail", base);
  if (!v || !c) return null;
  return el("li", { class: "card feed-card" },
    head(id, [who(id), ` made a new ${c.title}: 🍸 `, el("a", { href: `#/v/${v.id}`, text: variantTitle(c.data, v.data) })], at));
}

function houseCard({ variantId, base, at, uid: id }) {
  const v = itemById("variant", variantId), c = itemById("cocktail", base);
  if (!v || !c) return null;
  return el("li", { class: "card feed-card house" },
    head(id, ["👑 ", el("a", { href: `#/v/${v.id}`, text: variantTitle(c.data, v.data) }), ` is now the House Pour for ${c.title}`], at));
}

function addedCard({ uid: id, drinkId, at }) {
  const i = itemById("drink", drinkId);
  if (!i) return null;
  return el("li", { class: "card feed-card" },
    head(id, [who(id), " added ", el("a", { href: `#/drink/${i.id}`, text: i.title }), " to the list"], at));
}
