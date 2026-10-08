/* Home (the feed, once drinks can be logged) and the Log tab, which arrives in the next release. */
import { el, fill, avatar } from "./ui.js";
import { store, uid } from "./cloud.js";
import { TAGLINE } from "./config.js";
import { CATEGORIES } from "./catalog/styles.js";
import { ITEMS } from "./catalog.js";

export function renderHome(main) {
  const me = store.me || {};
  const members = [...store.members.values()].filter(m => !m.suspended).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const styles = CATEGORIES.reduce((n, c) => n + c.families.reduce((t, f) => t + f.styles.length, 0), 0);
  fill(main,
    el("section", { class: "welcome" },
      el("p", { class: "eyebrow", text: "Cheers" }),
      el("h2", { text: `Hey ${me.displayName || "there"} 👋` }),
      el("p", { text: TAGLINE }),
      el("div", { class: "hero-stats" },
        el("div", { class: "stat" }, el("b", { text: String(members.length) }), el("span", { text: "in the group" })),
        el("div", { class: "stat" }, el("b", { text: String(styles) }), el("span", { text: "styles" })),
        el("div", { class: "stat" }, el("b", { text: String(ITEMS.length) }), el("span", { text: "drinks so far" })))),
    el("section", { class: "card stack" },
      el("h3", { text: "Coming up" }),
      el("ul", { class: "todo" },
        el("li", {}, el("b", { text: "The full drink list. " }), "About 2,000 beers, whiskies, spirits, wines, coolers and cocktails, Ontario first."),
        el("li", {}, el("b", { text: "Logging a drink. " }), "Pick it, rate it, done. Works with no signal."),
        el("li", {}, el("b", { text: "The feed. " }), "See what everyone's pouring."),
        el("li", {}, el("b", { text: "Variety stats. " }), "Distinct drinks, styles and countries on your profile.")),
      el("a", { class: "btn primary block", href: "#/drinks", text: "Browse the drink list" })),
    el("section", { class: "card stack" },
      el("h3", { text: "The group" }),
      el("ul", { class: "member-list" }, ...members.map(m => el("li", {},
        el("a", { class: "member-row", href: m.id === uid() ? "#/me" : `#/u/${m.id}` }, avatar(m),
          el("div", { class: "grow" }, el("div", { class: "name", text: m.displayName }),
            m.favourite ? el("div", { class: "muted small", text: `❤️ ${m.favourite}` }) : null)))))));
}

export function renderLog(main) {
  fill(main,
    el("section", { class: "card empty" },
      el("span", { class: "empty-art", text: "🥂" }),
      el("h2", { text: "Logging is next" }),
      el("p", { class: "muted", text: "Soon you'll tap here, pick what you're drinking, rate it and you're done. For now, have a look through the drink list." }),
      el("a", { class: "btn primary block", href: "#/drinks", text: "Browse the drink list" })));
}
