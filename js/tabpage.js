/* The Tab: #/tab (your balances and the group's open tabs), #/tab/<uid> (you and a friend) and #/tab/<a>/<b> (any two
   people: everyone can see every balance). The logic is in tab.js. */
import { el, fill, avatar, icon } from "./ui.js";
import { store, uid, memberName } from "./cloud.js";
import { balancesFor, openTabs, pair, historyOf } from "./tab.js";
import { logRow, giveNext } from "./logpage.js";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const member = id => store.members.get(id) || { id, displayName: memberName(id) };
const nameOf = id => id === uid() ? "You" : member(id).displayName;

/* "Dave owes you 2", "You owe Dave 1", "Even with Dave" (from your side). */
export function balanceText(id, net) {
  const n = member(id).displayName;
  return net > 0 ? `${n} owes you ${plural(net, "drink")}` : net < 0 ? `You owe ${n} ${plural(-net, "drink")}` : `Even with ${n}`;
}

/* The line on a friend's profile: the balance between you, linking to the history. */
export function tabLine(id) {
  if (id === uid()) return null;
  const p = pair(store.logs, uid(), id);
  if (!p.given && !p.received) return null;
  return el("a", { class: "card admin-link", href: `#/tab/${id}` },
    el("span", { class: "item-icon", text: "🧾" }),
    el("div", { class: "grow" }, el("b", { text: balanceText(id, p.net) }),
      el("p", { class: "muted small", text: `You gave ${p.given}, they gave ${p.received}` })),
    el("span", { class: "chev", html: icon.chevron }));
}

export function renderTab(main, a, b) {
  if (a && b) return renderPair(main, a, b);
  if (a) return renderPair(main, uid(), a);
  const mine = balancesFor(store.logs, uid()), open = openTabs(store.logs).filter(t => t.creditor !== uid() && t.debtor !== uid());
  fill(main,
    el("h2", { class: "page-title", text: "🧾 The Tab" }),
    el("p", { class: "hint", text: "Every drink counts as 1, each pair of people has its own tab, and it's paid back in drinks." }),
    el("section", { class: "card stack" },
      el("h3", { text: "You and everyone" }),
      mine.length ? el("ul", { class: "item-list" }, ...mine.map(t => el("li", {}, el("a", { class: "item-row", href: `#/tab/${t.id}` },
        avatar(member(t.id), "sm"),
        el("span", { class: "grow" }, el("b", { text: balanceText(t.id, t.net) }),
          el("span", { class: "muted small", text: `You gave ${t.given} · they gave ${t.received}` })),
        el("span", { class: "chev", html: icon.chevron })))))
        : el("p", { class: "muted", text: "Nothing on your tab yet. Give a friend a drink with 🎁 Give one in your fridge, or Who's it for? when logging." })),
    open.length ? el("section", { class: "card stack" },
      el("h3", { text: "Around the group" }),
      el("ul", { class: "item-list" }, ...open.map(t => el("li", {}, el("a", { class: "item-row", href: `#/tab/${t.creditor}/${t.debtor}` },
        avatar(member(t.debtor), "sm"),
        el("span", { class: "grow" }, el("b", { text: `${member(t.debtor).displayName} owes ${member(t.creditor).displayName} ${plural(t.n, "drink")}` })),
        el("span", { class: "chev", html: icon.chevron })))))) : null);
}

/* Two people: the balance, Pay one back (when it's you), and every drink between them. */
function renderPair(main, a, b) {
  const p = pair(store.logs, a, b), hist = historyOf(store.logs, a, b), me = a === uid() || b === uid();
  const other = a === uid() ? b : a;
  const head = me ? balanceText(other, a === uid() ? p.net : -p.net)
    : p.net > 0 ? `${nameOf(b)} owes ${nameOf(a)} ${plural(p.net, "drink")}` : p.net < 0 ? `${nameOf(a)} owes ${nameOf(b)} ${plural(-p.net, "drink")}` : `${nameOf(a)} and ${nameOf(b)} are even`;
  fill(main,
    el("nav", { class: "crumbs", "aria-label": "Where you are" }, el("ol", {},
      el("li", {}, el("a", { href: "#/tab", text: "The Tab" })),
      el("li", {}, el("span", { "aria-current": "page", text: `${nameOf(a)} & ${nameOf(b)}` })))),
    el("section", { class: "hero card" },
      el("div", { class: "row center" }, avatar(member(a), "lg"), avatar(member(b), "lg")),
      el("h2", { text: head }),
      el("p", { class: "muted", text: `${nameOf(a)} gave ${p.given} · ${nameOf(b)} gave ${p.received}` }),
      me ? el("button", { class: "btn primary", type: "button", text: `🎁 Give ${member(other).displayName} one`, onclick: () => {
        giveNext(other); location.hash = "#/log";
      } }) : null),
    el("section", { class: "card stack" },
      el("h3", { text: "Every drink between them" }),
      hist.length ? el("ul", { class: "item-list" }, ...hist.map(l => {
        const row = logRow(l, { who: true });
        if (l.disputed) row.querySelector(".muted").append(" · ❌ disputed, not on the tab");
        return row;
      })) : el("p", { class: "muted", text: "Nothing yet." })));
}
