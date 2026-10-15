/* The feed on Home: what everyone's pouring (see feed.js), with filters, "Same here" on a friend's drink, 🍻 Cheers
   and comments on every post, and Show more for older days. Amounts are never shown: how much is a personal stat. */
import { el, fill, avatar, fmtAgo, toast, confirmButton } from "./ui.js";
import { store, uid, isAdmin, memberName, saveLog, deleteLog, toggleCheer, addComment, deleteComment } from "./cloud.js";
import { itemById } from "./catalog.js";
import { CATEGORIES } from "./catalog/styles.js";
import { feedItems, filterFeed, hasOlder, sameHere, FEED_DAYS, postId, cheersOn, commentsOn, cleanComment, MAX_COMMENT,
  topOfNight, outNow, sessions } from "./feed.js";
import { groupRatings, starText, ratingOfLog } from "./ratepage.js";
import { asItem, variantTitle } from "./variants.js";
import { lastPlace, resolvePlace } from "./logs.js";
import { titleOf, thumbBox } from "./logpage.js";
import { groupCrowns } from "./statspage.js";
import { CROWN_INDEX } from "./crowns.js";
import { nightRecap } from "./nights.js";

// Filters last for this session: who ("" = everyone), category, photos only, and how many days back.
const f = { who: "", cat: "", photos: false, days: FEED_DAYS };
const SHOWN = 4; // drinks shown on a night's card before "Show the rest"

/* Everything in the feed, worked out again only when the data behind it changes. */
let memo = { key: [], items: [] };
function allFeed() {
  const key = [store.logs, store.ratings, store.drinks, store.places, store.variants, store.nights, Math.floor(Date.now() / 600000)];
  if (key.some((k, n) => k !== memo.key[n])) {
    memo = { key, items: feedItems({ logs: store.logs, ratings: groupRatings(), drinks: store.drinks, places: store.places, crowns: groupCrowns().changes, nights: store.nights }) };
  }
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
      outStrip(),
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
  const card = { session: sessionCard, review: reviewCard, variant: variantCard, house: houseCard, added: addedCard,
    first: firstCard, recap: recapCard, crown: crownCard, night: nightFeedCard }[it.type];
  const li = card ? card(it) : null;
  if (li) li.append(reactions(it));
  return li;
}

/* ---------- Cheers and comments ---------- */
const openPosts = new Set(); // posts with their comments open (kept while the feed redraws)

/* "Dave, Sam and you" */
function people(ids) {
  const names = ids.map(id => id === uid() ? "you" : member(id).displayName);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] || "";
}

function reactions(it) {
  const post = postId(it), to = it.uid;
  const cheers = cheersOn(store.cheers, post), mine = cheers.includes(uid());
  const comments = commentsOn(store.comments, post), open = openPosts.has(post);
  const bar = el("div", { class: "react-bar" },
    el("button", { type: "button", class: "react-btn", "aria-pressed": String(mine), "aria-label": mine ? "Take back your cheers" : "Cheers",
      onclick: () => toggleCheer(post, to) }, "🍻 ", el("span", { text: cheers.length ? String(cheers.length) : "Cheers" })),
    el("button", { type: "button", class: "react-btn", "aria-expanded": String(open),
      "aria-label": comments.length ? `${comments.length} comment${comments.length === 1 ? "" : "s"}` : "Comment",
      onclick: () => { open ? openPosts.delete(post) : openPosts.add(post); box.replaceWith(reactions(it)); } },
      "💬 ", el("span", { text: comments.length ? String(comments.length) : "Comment" })),
    cheers.length ? el("span", { class: "muted small grow", text: `${people(cheers)} said cheers` }) : null);
  const box = el("div", { class: "react" }, bar, open ? commentBox(post, to, comments) : null);
  return box;
}

function commentBox(post, to, comments) {
  const input = el("textarea", { rows: 1, maxlength: MAX_COMMENT, placeholder: "Add a comment…", "aria-label": "Comment" });
  const send = () => {
    const text = cleanComment(input.value);
    if (!text) return;
    input.value = "";
    input.blur(); // lets the feed redraw with the new comment
    addComment(post, to, text);
  };
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  return el("div", { class: "comments" },
    comments.length ? el("ul", { class: "comment-list" }, ...comments.map(c => el("li", { class: "comment" },
      el("a", { href: c.uid === uid() ? "#/me" : `#/u/${c.uid}` }, avatar(member(c.uid), "xs")),
      el("div", { class: "grow" },
        el("p", {}, el("b", { text: nameOf(c.uid) }), " ", el("span", { class: "notes", text: c.text })),
        el("span", { class: "muted small", text: fmtAgo(c.at) })),
      c.uid === uid() || isAdmin() ? confirmButton("×", "Delete?", () => deleteComment(c.id), "btn small quiet comment-del") : null))) : null,
    el("div", { class: "comment-form" }, input, el("button", { type: "button", class: "btn small primary", text: "Send", onclick: send })));
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
  const meta = [item ? (l.variantId ? `Variant of ${item.title}` : item.style.name) : "", l.madeBy ? `made by ${nameOf(l.madeBy)}` : "", l.givenBy ? `🎁 from ${nameOf(l.givenBy)}` : "",
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

/* ---------- Firsts, night recaps and who's out ---------- */
const FIRST_ICON = { style: "🎉", country: "🌍", drinks: "🏅", styles: "🎨" };

/* "Dave's first Islay Single Malt", "Sam's first drink from Scotland", "Matt has tried 50 different drinks". */
function firstCard({ uid: id, at, what, label, logId }) {
  const l = store.logs.find(x => x.id === logId);
  const name = id === uid() ? "Your" : `${member(id).displayName}'s`;
  const text = what === "style" ? [`${name} first `, el("b", { text: label })]
    : what === "country" ? [`${name} first drink from `, el("b", { text: label })]
    : [who(id), id === uid() ? " have tried " : " has tried ", el("b", { text: label })];
  return el("li", { class: "card feed-card first" },
    head(id, [`${FIRST_ICON[what]} `, ...text], at),
    l ? el("a", { class: "item-row", href: `#/l/${l.id}` }, thumbBox(l), el("b", { class: "grow", text: titleOf(l) })) : null);
}

/* A night at one place with two or more people: who was there, the most-poured drink and the photos. */
function recapCard(n) {
  const place = placeName(n.placeId), top = topOfNight(n);
  const topItem = top && itemById(top.kind, top.drinkId);
  const photos = n.logs.filter(l => l.hasPhoto).slice(0, 3);
  return el("li", { class: "card feed-card recap" },
    el("div", { class: "feed-head" }, el("span", { class: "recap-icon", text: "🌙" }),
      el("div", { class: "grow" }, el("p", {}, el("b", { text: `A night at ${place || "a place"}` })),
        el("span", { class: "muted small", text: fmtAgo(n.at) }))),
    el("div", { class: "recap-people" }, ...n.people.map(id => el("a", { href: id === uid() ? "#/me" : `#/u/${id}`, title: nameOf(id) }, avatar(member(id), "sm"))),
      el("span", { class: "small", text: people(n.people) })),
    el("p", { class: "small", text: [`${n.logs.length} drinks`, topItem ? `most poured: ${topItem.title}` : ""].filter(Boolean).join(" · ") }),
    photos.length ? el("div", { class: "photo-grid" }, ...photos.map(l => el("a", { href: `#/l/${l.id}` }, thumbBox(l, "recap-photo")))) : null);
}

/* A hosted Drink Night that's over: the recap (top drink, bottles killed, most generous, first to tap out, Nightcap).
   No drinks per person here: that's on the night's own page. */
function nightFeedCard(it) {
  const n = store.nights.find(x => x.id === it.nightId);
  if (!n) return null;
  const r = nightRecap(n, store.logs.filter(l => !l.offFeed)), title = (k, id) => (itemById(k, id) || { title: "a drink" }).title;
  const photos = it.logs.filter(l => l.hasPhoto).slice(0, 3);
  const lines = [
    `${r.total} drinks`,
    r.top ? `most poured: ${title(r.top.kind, r.top.drinkId)}` : "",
    r.killed.length ? `🍾 killed: ${r.killed.map(k => title("drink", k.drinkId)).join(", ")}` : "",
    r.generous ? `🎁 most generous: ${nameOf(r.generous.uid)}` : "",
    r.firstOut ? `😴 first to tap out: ${nameOf(r.firstOut.uid)}` : "",
    r.nightcap ? `🌙 Nightcap: ${nameOf(r.nightcap.uid)}` : "",
  ].filter(Boolean);
  return el("li", { class: "card feed-card recap" },
    el("div", { class: "feed-head" }, el("span", { class: "recap-icon", text: "🎉" }),
      el("div", { class: "grow" }, el("p", {}, el("a", { href: `#/night/${n.id}` }, el("b", { text: n.name }))),
        el("span", { class: "muted small", text: `Hosted by ${nameOf(n.host)} · ${fmtAgo(it.at)}` }))),
    el("div", { class: "recap-people" }, ...it.people.map(id => el("a", { href: id === uid() ? "#/me" : `#/u/${id}`, title: nameOf(id) }, avatar(member(id), "sm"))),
      el("span", { class: "small", text: people(it.people) })),
    el("ul", { class: "recap-lines small" }, ...lines.map(t => el("li", { text: t }))),
    photos.length ? el("div", { class: "photo-grid" }, ...photos.map(l => el("a", { href: `#/l/${l.id}` }, thumbBox(l, "recap-photo")))) : null);
}

/* Who's out right now (logged in the last 2 hours), and where. Tap someone to see their drinks. */
function outStrip() {
  const out = outNow(store.logs, store.places, uid());
  if (!out.length) return null;
  return el("div", { class: "out-now", role: "list", "aria-label": "Out now" },
    el("span", { class: "out-label", text: "🟢 Out now" }),
    ...out.map(o => el("a", { class: "out-chip", role: "listitem", href: `#/u/${o.uid}` }, avatar(member(o.uid), "xs"),
      el("span", {}, el("b", { text: member(o.uid).displayName }), placeName(o.placeId) ? ` at ${placeName(o.placeId)}` : "",
        el("span", { class: "muted", text: ` · ${fmtAgo(o.at)}` })))));
}

/* ---------- One post, and a drink's night ---------- */
/* #/post/<id>: one feed post with its comments open, however old (alerts link here). Post ids hold a "~", and a
   variant's id has one too, so everything after "#/post/" is the id. */
export function renderPost(main) {
  const post = decodeURIComponent(location.hash.replace(/^#\/post\//, ""));
  const it = allFeed().find(x => postId(x) === post);
  if (!it) return fill(main, el("div", { class: "card" }, el("p", { text: "That post isn't in the feed any more." })));
  openPosts.add(post);
  fill(main, el("h2", { class: "page-title", text: "Post" }), el("ul", { class: "feed-list" }, feedRow(it)));
}

/* Cheers and comments for the night a log belongs to, for the log's own page. Null when it's kept off the feed. */
export function nightReactions(log) {
  if (log.offFeed) return null;
  const night = sessions(store.logs.filter(l => l.uid === log.uid), store.places).find(s => s.logs.some(l => l.id === log.id));
  return night ? el("section", { class: "card" }, reactions(night)) : null;
}

/* "👑 Sam took the Globetrotter crown from Dave" */
function crownCard({ uid: id, crown, from, at, value }) {
  const c = CROWN_INDEX.get(crown);
  if (!c) return null;
  return el("li", { class: "card feed-card crown" },
    head(id, ["👑 ", who(id), ` took the ${c.icon} `, el("a", { href: "#/board", text: c.name }), ...(from ? [" crown from ", el("b", { text: from === uid() ? "you" : member(from).displayName })] : [" crown"]),
      el("span", { class: "muted small", text: ` (${c.about}: ${value})` })], at));
}
