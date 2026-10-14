/* Rating a drink (once, changed whenever) and the group's view of it: the rating sheet, "How was it?" on Home,
   the ratings card on a drink's page, and the group's top-rated list (#/top). */
import { el, fill, toast, openSheet, closeSheet, confirmButton, avatar, fmtAgo } from "./ui.js";
import { store, uid, isAdmin, memberName, saveRating, deleteRating, removeReview } from "./cloud.js";
import { itemById } from "./catalog.js";
import { CATEGORIES } from "./catalog/styles.js";
import { tagsFor, TAG_INDEX, MAX_TAGS, cleanRating } from "./logs.js";
import { allRatings, ratingOf, drinkSummary, topRated, toRate } from "./ratings.js";
import { asItem, rateKey } from "./variants.js";

/* Everyone's ratings, older log ratings included. Worked out again only when ratings or logs change (each listener
   update brings new arrays). */
let memo = { ratings: null, logs: null, list: [] };
export function groupRatings() {
  if (memo.ratings !== store.ratings || memo.logs !== store.logs) memo = { ratings: store.ratings, logs: store.logs, list: allRatings(store.ratings, store.logs) };
  return memo.list;
}
export const myRatingOf = (kind, drinkId) => ratingOf(groupRatings(), uid(), kind, drinkId);
/* The drinker's rating of a logged drink (one per drink, not per log). A cocktail variant's log shows the variant's. */
export const ratingOfLog = log => ratingOf(groupRatings(), log.uid, ...rateKey(log));

/* ---------- Stars ---------- */
/* Read-only "★ 4.5". */
export const starText = r => r ? `★ ${r % 1 ? r.toFixed(1) : r}` : "";

/* Five stars you can tap: the left half of a star gives a half. Tapping the current rating clears it, unless
   `required` (then it stays). */
export function starPicker(value, onChange, { required = false, label = true } = {}) {
  const box = el("div", { class: "stars", role: "group", "aria-label": "Rating" });
  const draw = () => fill(box, ...[1, 2, 3, 4, 5].map(n => {
    const filled = value >= n ? 100 : value >= n - 0.5 ? 50 : 0;
    return el("span", { class: "star", style: `--fill:${filled}%` },
      ...[n - 0.5, n].map(v => el("button", { type: "button", class: v % 1 ? "half left" : "half right",
        "aria-label": `${v} star${v === 1 ? "" : "s"}`, "aria-pressed": String(value === v),
        onclick: () => { value = value === v && !required ? null : v; draw(); onChange(value); } })));
  }), label ? el("span", { class: "star-value", text: value ? `${value} / 5` : "Not rated" }) : null);
  draw();
  return box;
}

const tagLabel = t => (TAG_INDEX.get(t) || { label: t }).label;
const itemLink = i => i.kind === "variant" ? `#/v/${i.id}` : `#/${i.kind === "cocktail" ? "recipe" : "drink"}/${i.id}`;
/* Any rated thing as an item: a drink, a cocktail, or a cocktail variant. */
const anyItem = (kind, id) => kind === "variant" ? asItem(id) : itemById(kind, id);

/* ---------- The rating sheet ---------- */
/* Stars, flavours and a short review for one drink. `stars` pre-fills the stars (a tap on Home). */
export function rateSheet(item, stars = null) {
  const old = myRatingOf(item.kind, item.id);
  const s = { rating: stars || (old && old.rating) || null, tags: old ? [...old.tags] : [] };
  openSheet(box => {
    const tagBox = el("div", { class: "chips", role: "group", "aria-label": "Flavour" });
    const drawTags = () => fill(tagBox, ...tagsFor(item).map(t => el("button", { type: "button", class: "chip-btn tag", "aria-pressed": String(s.tags.includes(t.id)),
      onclick: () => {
        if (s.tags.includes(t.id)) s.tags = s.tags.filter(x => x !== t.id);
        else if (s.tags.length < MAX_TAGS) s.tags.push(t.id);
        else return toast(`Up to ${MAX_TAGS} flavours.`);
        drawTags();
      } }, t.label)));
    drawTags();
    const review = el("textarea", { rows: 3, maxlength: 500, placeholder: "What did you think? (optional)", value: old ? old.review : "" });
    const msg = el("p", { class: "msg err", role: "alert" });
    const form = el("form", { class: "stack" },
      el("div", { class: "log-head" }, el("span", { class: "item-icon", text: item.category.icon }),
        el("div", { class: "grow" }, el("h2", { text: item.title }), el("p", { class: "muted small", text: old ? "Change your rating" : "Rate it" }))),
      starPicker(s.rating, v => { s.rating = v; msg.textContent = ""; }, { required: true }),
      el("h3", { text: "Flavour" }), el("p", { class: "hint", text: `Pick up to ${MAX_TAGS} (optional).` }), tagBox,
      el("h3", { text: "Review" }), review,
      el("p", { class: "hint", text: "One rating per drink. The group sees it on the drink's page. Change it any time." }),
      msg,
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })),
      old && !old.fromLog ? confirmButton("Remove my rating", "Tap again to remove", () => { deleteRating(old.docId); closeSheet(); toast("Rating removed."); }, "btn quiet block") : null);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const rating = cleanRating(s.rating);
      if (!rating) { msg.textContent = "Tap the stars to rate it."; return; }
      saveRating(item, { rating, tags: s.tags, review: review.value }, old && old.docId);
      closeSheet();
      toast(`${item.title}: ${starText(rating)}`);
    });
    box.append(form);
  });
}

/* A button that opens the sheet: "Rate it", or your stars to change them. */
export function rateButton(item, cls = "btn block") {
  const r = myRatingOf(item.kind, item.id);
  return el("button", { class: cls, type: "button", text: r ? `Your rating ${starText(r.rating)} · Change` : "⭐ Rate it", onclick: () => rateSheet(item) });
}

/* ---------- Home: "How was it?" ---------- */
/* Drinks you logged today and haven't rated, with stars to tap right there. A tap opens the sheet with those stars,
   for flavours and a review (or just Save). */
export function rateCard() {
  const list = toRate(groupRatings(), store.logs, uid()).map(l => anyItem(...rateKey(l))).filter(Boolean).slice(0, 3);
  if (!list.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: "How was it?" }),
    el("p", { class: "hint", text: "Rate what you've been drinking. Once per drink; change it any time." }),
    el("ul", { class: "rate-list" }, ...list.map(i => el("li", { class: "stack-tight" },
      el("a", { class: "rate-title", href: itemLink(i) }, el("span", { text: i.category.icon }), el("b", { text: i.title })),
      starPicker(null, v => { if (v) rateSheet(i, v); }, { label: false })))));
}

/* ---------- A drink's page: the group's ratings ---------- */
export function ratingsCard(item) {
  const s = drinkSummary(groupRatings(), item.kind, item.id);
  const mine = myRatingOf(item.kind, item.id);
  return el("section", { class: "card stack" },
    el("div", { class: "row spread" },
      el("h3", { text: "Ratings" }),
      s.count ? el("span", { class: "rating-line", text: `${starText(s.avg)} / 5` }) : null),
    el("p", { class: "muted small", text: s.count ? `${s.count} rating${s.count === 1 ? "" : "s"} in the group${mine ? ` · yours ${starText(mine.rating)}` : ""}` : "Nobody in the group has rated it yet." }),
    s.tags.length ? el("div", { class: "chips" }, ...s.tags.map(([t, n]) => el("span", { class: "chip", text: s.count > 1 ? `${tagLabel(t)} · ${n}` : tagLabel(t) }))) : null,
    s.reviews.length ? el("ul", { class: "review-list" }, ...s.reviews.map(reviewRow)) : null,
    rateButton(item, mine ? "btn block" : "btn primary block"));
}

function reviewRow(r) {
  const m = store.members.get(r.uid) || { id: r.uid, displayName: memberName(r.uid) };
  return el("li", { class: "review" },
    el("a", { href: r.uid === uid() ? "#/me" : `#/u/${r.uid}` }, avatar(m, "sm")),
    el("div", { class: "grow stack-tight" },
      el("div", { class: "row spread" }, el("b", { text: m.displayName }), el("span", { class: "rating-line small", text: starText(r.rating) })),
      el("p", { class: "notes", text: r.review }),
      el("span", { class: "muted small", text: fmtAgo(r.at) }),
      isAdmin() && r.uid !== uid() && r.docId ? confirmButton("Remove review (admin)", "Tap again to remove", () => { removeReview(r.docId); toast("Review removed."); }, "btn small quiet") : null));
}

/* ---------- #/top: the group's top rated ---------- */
let topCat = "all";
export function renderTop(main) {
  const list = groupRatings();
  const catOf = (kind, id) => { const i = anyItem(kind, id); return i ? i.category.id : null; };
  const cats = CATEGORIES.filter(c => list.some(r => catOf(r.kind, r.drinkId) === c.id));
  if (topCat !== "all" && !cats.some(c => c.id === topCat)) topCat = "all";
  const top = topRated(list, (k, id) => catOf(k, id) && (topCat === "all" || catOf(k, id) === topCat)).slice(0, 50);
  fill(main,
    el("h2", { class: "page-title", text: "Top rated" }),
    el("p", { class: "muted", text: "The group's favourites, by average rating, then by how many rated it." }),
    cats.length > 1 ? el("div", { class: "chips", role: "group", "aria-label": "Category" },
      ...[["all", "All"], ...cats.map(c => [c.id, `${c.icon} ${c.name}`])].map(([id, label]) => el("button", { type: "button", class: "chip-btn tag",
        "aria-pressed": String(topCat === id), onclick: () => { topCat = id; renderTop(main); } }, label))) : null,
    top.length
      ? el("ol", { class: "item-list card top-list" }, ...top.map((d, n) => {
          const i = anyItem(d.kind, d.drinkId);
          return el("li", {}, el("a", { class: "item-row", href: itemLink(i) },
            el("span", { class: "top-rank", text: String(n + 1) }),
            el("span", { class: "item-icon", text: i.category.icon }),
            el("span", { class: "grow" }, el("b", { text: i.title }),
              el("span", { class: "muted small", text: `${i.kind === "variant" ? `Variant of ${itemById("cocktail", i.base).title}` : i.kind === "cocktail" ? "Cocktail" : i.style.name} · ${d.count} rating${d.count === 1 ? "" : "s"}` })),
            el("span", { class: "rating-line", text: starText(d.avg) })));
        }))
      : el("section", { class: "card empty" }, el("span", { class: "empty-art", text: "⭐" }),
          el("p", { class: "muted", text: "Nothing rated yet. Rate a drink from its page, or from Home after you log one." })));
}
