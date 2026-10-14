/* Home: your recent drinks (with "Another one"), anything that didn't reach the group, and the group. The feed of
   everyone's drinks comes in a later release. */
import { el, fill, avatar } from "./ui.js";
import { store, uid, retryLog, discardLog } from "./cloud.js";
import { TAGLINE } from "./config.js";
import { CATEGORIES } from "./catalog/styles.js";
import { allItems } from "./catalog.js";
import { logRow } from "./logpage.js";

const RECENT = 6;

export function renderHome(main) {
  const me = store.me || {};
  const members = [...store.members.values()].filter(m => !m.suspended).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const styles = CATEGORIES.reduce((n, c) => n + c.families.reduce((t, f) => t + f.styles.length, 0), 0);
  const mine = store.logs.filter(l => l.uid === uid()).sort((a, b) => b.at - a.at);
  fill(main,
    el("section", { class: "welcome" },
      el("p", { class: "eyebrow", text: "Cheers" }),
      el("h2", { text: `Hey ${me.displayName || "there"} 👋` }),
      el("p", { text: TAGLINE }),
      el("div", { class: "hero-stats" },
        el("div", { class: "stat" }, el("b", { text: String(members.length) }), el("span", { text: "in the group" })),
        el("div", { class: "stat" }, el("b", { text: String(store.logs.length) }), el("span", { text: "drinks logged" })),
        el("div", { class: "stat" }, el("b", { text: String(allItems().length) }), el("span", { text: `in the list (${styles} styles)` })))),
    outboxCard(),
    el("section", { class: "card stack" },
      el("h3", { text: "Your recent drinks" }),
      mine.length
        ? el("ul", { class: "item-list" }, ...mine.slice(0, RECENT).map(l => logRow(l, { another: true })))
        : el("p", { class: "muted", text: "Nothing logged yet. Tap Log to add your first drink." }),
      el("a", { class: "btn primary block", href: "#/log", text: "Log a drink" })),
    el("section", { class: "card stack" },
      el("h3", { text: "Coming up" }),
      el("ul", { class: "todo" },
        el("li", {}, el("b", { text: "The feed. " }), "See what everyone's pouring."),
        el("li", {}, el("b", { text: "Variety stats. " }), "Distinct drinks, styles and countries on your profile."))),
    el("section", { class: "card stack" },
      el("h3", { text: "The group" }),
      el("ul", { class: "member-list" }, ...members.map(m => el("li", {},
        el("a", { class: "member-row", href: m.id === uid() ? "#/me" : `#/u/${m.id}` }, avatar(m),
          el("div", { class: "grow" }, el("div", { class: "name", text: m.displayName }),
            m.favourite ? el("div", { class: "muted small", text: `❤️ ${m.favourite}` }) : null)))))));
}

/* Logs this phone hasn't got to the group: waiting for signal, or refused by the server (with Try again). */
function outboxCard() {
  const mine = store.outbox.filter(e => e.log.uid === uid());
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
