/* Home: a short hello, then anything that needs you now (drinks that didn't send, the morning after, tonight's nights,
   drinks to rate), then the feed. The group, the boards and the Tab are on the Us tab. */
import { el, fill, toast } from "./ui.js";
import { store, uid, isAdmin, retryLog, discardLog, saveLog, deleteLog } from "./cloud.js";
import { toCheck } from "./moderation.js";
import { TAGLINE } from "./config.js";
import { itemById } from "./catalog.js";
import { rateCard } from "./ratepage.js";
import { feedCard } from "./feedpage.js";
import { recentVariants, variantTitle, makeLogs } from "./variants.js";
import { lastPlace, resolvePlace } from "./logs.js";
import { tonightCard, morningHomeCard } from "./nightpage.js";

export function renderHome(main) {
  const me = store.me || {};
  fill(main,
    el("section", { class: "welcome slim" },
      el("h2", { text: `Hey ${me.displayName || "there"} 👋` }),
      el("p", { text: TAGLINE })),
    outboxCard(),
    morningHomeCard(),
    tonightCard(),
    rateCard(),
    againCard(),
    isAdmin() && toCheck().length ? el("a", { class: "card admin-link", href: "#/catalog" },
      el("div", { class: "grow" }, el("b", { text: "New drinks to check" }), el("p", { class: "muted small", text: "Members added drinks to the list. Have a look." })),
      el("span", { class: "chip gold", text: String(toCheck().length) })) : null,
    feedCard());
}

/* Logs this phone hasn't got to the group: waiting for signal, or refused by the server (with Try again). */
function outboxCard() {
  const mine = store.outbox.filter(e => (e.log.madeBy || e.log.givenBy || e.log.uid) === uid());
  const failed = mine.filter(e => e.state === "failed"), waiting = mine.length - failed.length;
  if (!failed.length && !waiting) return null;
  return el("section", { class: `card stack ${failed.length ? "problem" : ""}` },
    failed.length ? el("h3", { text: `${failed.length} drink${failed.length === 1 ? "" : "s"} didn't reach the group` }) : null,
    failed.length ? el("p", { class: "small", text: "The server said no, so they're only on this phone. Try again, or check with the group's admin if it keeps happening." }) : null,
    ...failed.map(e => el("div", { class: "row spread" },
      el("div", { class: "grow" }, el("b", { text: e.log.title }), el("div", { class: "muted small", text: reason(e.error) })),
      el("button", { class: "btn small", type: "button", text: "Try again", onclick: () => retryLog(e.id) }),
      el("button", { class: "btn small quiet", type: "button", text: "Discard", onclick: () => discardLog(e.id) }))),
    waiting ? el("p", { class: "muted small", text: `⏳ ${waiting} drink${waiting === 1 ? "" : "s"} waiting to send. They'll go when there's signal.` }) : null);
}

const REASONS = {
  "permission-denied": "The group's rules refused it. Is your account paused, or the time in the future?",
  "invalid-argument": "Something in it wasn't valid (a photo that's too big?).",
  "resource-exhausted": "The group is over its free daily limit. Try again tomorrow.",
};
const reason = code => REASONS[code] || `Reason: ${code || "unknown"}`;

/* Make it again: your latest cocktail variants, logged again in one tap (same bottles, same amounts), with Undo. */
function againCard() {
  const list = recentVariants(store.logs, uid());
  if (!list.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: "Make it again" }),
    el("ul", { class: "item-list" }, ...list.map(({ item }) => {
      const base = itemById("cocktail", item.base);
      if (!base) return null;
      const title = variantTitle(base.data, item.data);
      return el("li", { class: "log-row" },
        el("a", { class: "item-row grow", href: `#/v/${item.id}` }, el("span", { class: "log-thumb icon", text: "🍸" }),
          el("span", { class: "grow" }, el("b", { text: title }), el("span", { class: "muted small", text: base.title }))),
        el("button", { class: "btn small", type: "button", text: "Again", "aria-label": `Make ${title} again`, onclick: () => {
          const p = lastPlace(store.logs, uid());
          const [f] = makeLogs({ recipe: base.data, variant: { ...item.data, id: item.id }, drinkers: [uid()], me: uid(), at: Date.now(),
            placeId: p ? (resolvePlace(store.places, p) || { id: p }).id : null });
          const id = saveLog(f);
          toast(`Another ${title} logged 🍹`, { label: "Undo", run: () => deleteLog(id) });
        } }));
    })));
}
