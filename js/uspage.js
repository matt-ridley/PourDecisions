/* Us (#/us): the group side of the app. Drink Nights, the variety board and crowns, the Tab, and everyone in the group. */
import { el, fill, avatar, linkList } from "./ui.js";
import { store, uid } from "./cloud.js";
import { nightsCard } from "./nightpage.js";
import { groupBoard, groupCrowns } from "./statspage.js";
import { tabSummary } from "./tabpage.js";
import { crownsOf } from "./crowns.js";

export function renderUs(main) {
  const members = [...store.members.values()].filter(m => !m.suspended).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const top = groupBoard().filter(r => r.score).slice(0, 3);
  const name = id => id === uid() ? "You" : (store.members.get(id) || {}).displayName || "Someone";
  const { holders } = groupCrowns();
  fill(main,
    el("h2", { class: "page-title", text: "Us" }),
    nightsCard(),
    linkList([
      { icon: "🧭", title: "Variety board & crowns", href: "#/board",
        sub: top.length ? top.map(r => `${r.rank}. ${name(r.uid)} ${r.score}`).join(" · ") : "Who has tried the most" },
      { icon: "🧾", title: "The Tab", sub: tabSummary(), href: "#/tab" },
      { icon: "🎁", title: "Most Generous & Thirstiest", sub: "Who gives the most, and who's most in the red", href: "#/generous" },
    ]),
    el("section", { class: "card stack" },
      el("h3", { text: `The group · ${members.length}` }),
      el("ul", { class: "item-list" }, ...members.map(m => {
        const sub = [m.favourite ? `❤️ ${m.favourite}` : "", crownsOf(holders, m.id).map(c => `👑${c.icon}`).join(" ")].filter(Boolean).join(" · ");
        return el("li", {}, el("a", { class: "item-row", href: m.id === uid() ? "#/me" : `#/u/${m.id}` }, avatar(m),
          el("span", { class: "grow" }, el("b", { text: m.displayName }), sub ? el("span", { class: "muted small", text: sub }) : null)));
      }))));
}
