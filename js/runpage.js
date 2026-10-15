/* #/run: the LCBO run, your household's shopping list (the same for everyone in it, since it comes from the stock).
   What's running low, and the one thing missing for cocktails someone in the household starred. Got it restocks;
   Share sends the list with the phone's share sheet. The logic is in stock.js (runList). */
import { el, fill, toast, openSheet, closeSheet, copyText } from "./ui.js";
import { store, uid, setStock, changeStock, addToFridge } from "./cloud.js";
import { drinksFor } from "./catalog.js";
import { householdOf, runList, runText, stockId, RELOADS } from "./stock.js";
import { currentCovers } from "./makeablepage.js";

export function renderRun(main) {
  const h = householdOf(store.households, uid());
  if (!h) return fill(main, el("h2", { class: "page-title", text: "🛒 LCBO run" }),
    el("section", { class: "card stack" }, el("p", { text: "Start your bar & fridge first: the run is made from what's running low in it." }),
      el("a", { class: "btn primary block", href: "#/bar", text: "Start my bar & fridge" })));
  const list = runList(store.stock, h, [...store.members.values()], currentCovers());
  const low = list.filter(r => r.type === "low"), star = list.filter(r => r.type === "star");
  const row = r => el("li", { class: "make-row" },
    el("span", { class: "make-name" }, el("b", { text: r.title }), el("span", { class: "muted small", text: r.why })),
    el("button", { class: "btn small primary", type: "button", text: "Got it", onclick: () => gotIt(h, r) }));
  fill(main,
    el("h2", { class: "page-title", text: "🛒 LCBO run" }),
    el("p", { class: "hint", text: `For ${h.name}. Everyone in the household sees the same list, and Got it puts it back in the bar or fridge.` }),
    list.length ? el("button", { class: "btn block", type: "button", text: "📤 Share the list", onclick: () => share(h, list) }) : null,
    el("section", { class: "card stack" },
      el("h3", { text: `Running low · ${low.length}` }),
      low.length ? el("ul", { class: "item-list" }, ...low.map(row)) : el("p", { class: "muted", text: "Nothing's running low. Set a warning on fridge drinks to see them here." })),
    el("section", { class: "card stack" },
      el("h3", { text: `For starred cocktails · ${star.length}` }),
      star.length ? el("ul", { class: "item-list" }, ...star.map(row))
        : el("p", { class: "muted", text: "Star cocktails you want to make (☆ on a recipe): when you're one thing short, it shows up here." })));
}

async function share(h, list) {
  const text = runText(h, list);
  try {
    if (navigator.share) { await navigator.share({ title: "LCBO run", text }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  toast(await copyText(text) ? "Copied the list." : "Couldn't share it from here.");
}

/* Bought it: back in stock. A fridge drink gets a reload, a bottle a new one (or a spare), an ingredient goes back to
   Have it; something for a starred cocktail goes in the bar (pick the bottle when it's a bottle). */
function gotIt(h, r) {
  if (r.type === "low") {
    const s = r.entry;
    if (s.kind === "ing") { changeStock(s.id, { out: false }); return toast(`${r.title} is back in the bar`); }
    if (s.where === "fridge") return reloadSheet(s, r.title);
    changeStock(s.id, (s.left || 0) <= 0 ? { left: s.size } : { spares: (s.spares || 0) + 1 });
    return toast(`${r.title}: ${(s.left || 0) <= 0 ? "a fresh bottle" : "a spare"} in the bar`);
  }
  const bottles = r.ing.flatMap(id => drinksFor(id)).slice(0, 12);
  if (!bottles.length) {
    const id = r.ing[0];
    setStock(stockId(h.id, "bar", "ing", id), { hh: h.id, where: "bar", kind: "ing", item: id }, { out: false });
    return toast(`${r.title} is in the bar`);
  }
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: `Which ${r.title.toLowerCase()}?` }),
    el("ul", { class: "item-list" }, ...bottles.map(i => el("li", {}, el("button", { type: "button", class: "item-row plain", onclick: () => {
      setStock(stockId(h.id, "bar", "drink", i.id), { hh: h.id, where: "bar", kind: "drink", item: i.id }, { size: 750, left: 750, spares: 0 });
      closeSheet(); toast(`${i.title} is in the bar`);
    } }, el("span", { class: "item-icon", text: i.category.icon }), el("b", { class: "grow", text: i.title }))))),
    el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet }))));
}

function reloadSheet(s, title) {
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: `How many ${title}?` }),
    el("div", { class: "chips" }, ...RELOADS.map(n => el("button", { type: "button", class: "chip-btn", text: `+${n}`, onclick: () => {
      addToFridge(s.id, (s.count || 0) < 0 ? n - s.count : n); closeSheet(); toast(`Added ${n} ${title}`);
    } }))),
    el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet }))));
}
