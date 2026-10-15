/* Variety on screen: the variety card on profiles, your private "just for you" numbers, and the group board (#/board).
   See stats.js. The board ranks variety only; how much anyone drinks is never shown to anyone else. */
import { el, fill, avatar, icon, fmtDay } from "./ui.js";
import { store, uid, memberName } from "./cloud.js";
import { CATEGORIES } from "./catalog/styles.js";
import { allItems, styleOf } from "./catalog.js";
import { groupRatings, starText } from "./ratepage.js";
import { POINTS, varietyOf, board, totals, volumeOf, firstsInGroup, countryList, flagOf, tryNext } from "./stats.js";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const member = id => store.members.get(id) || { id, displayName: memberName(id) };
const activeIds = () => [...store.members.values()].filter(m => !m.suspended).map(m => m.id);

/* The board, worked out again only when logs or members change. */
let memo = { key: [], rows: [] };
export function groupBoard() {
  const key = [store.logs, store.members];
  if (key.some((k, n) => k !== memo.key[n])) memo = { key, rows: board(store.logs, activeIds()) };
  return memo.rows;
}

const tile = (n, label, of) => el("div", { class: "stat" }, el("b", { text: String(n) }), el("span", { text: of ? `${label} of ${of}` : label }));

/* A member's variety: their score and rank, what they've tried, and styles per category. */
export function varietyCard(id) {
  const v = varietyOf(store.logs.filter(l => l.uid === id)), t = totals();
  const row = groupBoard().find(r => r.uid === id);
  return el("section", { class: "card stack" },
    el("div", { class: "row spread" }, el("h3", { text: "🧭 Variety" }),
      el("a", { class: "btn small", href: "#/board", text: row && v.score ? `#${row.rank} in the group` : "The board" })),
    el("div", { class: "score-line" }, el("b", { class: "score", text: String(v.score) }), el("span", { class: "muted", text: "variety points" })),
    el("div", { class: "mix-stats" },
      tile(v.drinks.size, "different drinks"), tile(v.styles.size, "styles", t.styles),
      tile(v.families.size, "families", t.families), tile(v.countries.size, "countries", t.countries)),
    el("div", { class: "row" },
      el("a", { class: "btn small", href: `#/passport/styles/${id}`, text: "🎫 Style passport" }),
      el("a", { class: "btn small", href: `#/passport/countries/${id}`, text: "🌍 Countries" })),
    v.styles.size ? el("ul", { class: "cat-bars" }, ...CATEGORIES.filter(c => v.byCategory.has(c.id)).map(c => {
      const n = v.byCategory.get(c.id).size, of = t.byCategory.get(c.id);
      return el("li", {}, el("span", { class: "cat-bar-label", text: `${c.icon} ${c.name}` }),
        el("span", { class: "bar", style: `--pct:${Math.round(n / of * 100)}%` }), el("span", { class: "muted small", text: `${n}/${of}` }));
    })) : el("p", { class: "muted", text: "Nothing tried yet. Every new drink, style and country adds points." }));
}

/* Just for you: how much you've had. Never shown to anyone else. */
export function volumeCard() {
  const v = volumeOf(store.logs.filter(l => l.uid === uid()));
  const line = (label, x) => el("div", { class: "vol-row" }, el("span", { text: label }),
    el("b", { text: plural(x.drinks, "drink") }), el("span", { class: "muted", text: `${x.std} standard` }));
  return el("section", { class: "card stack" },
    el("h3", { text: "🔒 Just for you" }),
    line("This week", v.week), line("This month", v.month), line("This year", v.year),
    line("Weekly average", v.avg8),
    el("p", { class: "hint", text: "Your weekly average is over the last 8 full weeks. Only you can see this card: the group competes on variety, not volume." }));
}

/* Home: the top of the board. */
export function boardTeaser() {
  const rows = groupBoard().filter(r => r.score).slice(0, 3);
  if (!rows.length) return null;
  return el("a", { class: "card admin-link", href: "#/board" },
    el("span", { class: "item-icon", text: "🧭" }),
    el("div", { class: "grow" }, el("b", { text: "Variety board" }),
      el("p", { class: "muted small", text: rows.map(r => `${r.rank}. ${r.uid === uid() ? "You" : member(r.uid).displayName} ${r.score}`).join(" · ") })),
    el("span", { class: "chev", html: icon.chevron }));
}

/* #/board: everyone by variety score. */
export function renderBoard(main) {
  const rows = groupBoard();
  fill(main,
    el("h2", { class: "page-title", text: "Variety board" }),
    el("p", { class: "muted", text: "Who has tried the most, not who has drunk the most. Points for every new thing you try." }),
    el("ol", { class: "item-list card board" }, ...rows.map(r => el("li", {},
      el("a", { class: "item-row", href: r.uid === uid() ? "#/me" : `#/u/${r.uid}` },
        el("span", { class: "top-rank", text: String(r.rank) }), avatar(member(r.uid), "sm"),
        el("span", { class: "grow" }, el("b", { text: r.uid === uid() ? "You" : member(r.uid).displayName }),
          el("span", { class: "muted small", text: `${plural(r.drinks, "drink")} · ${plural(r.styles, "style")} · ${plural(r.countries, "country", "countries")}` })),
        el("b", { class: "board-score", text: String(r.score) }))))),
    el("section", { class: "card stack" },
      el("h3", { text: "How the score works" }),
      el("ul", { class: "todo" },
        el("li", { text: `A new drink: ${POINTS.drink} point` }), el("li", { text: `A new style: ${POINTS.style} points` }),
        el("li", { text: `A new family (Stout, Scotch, IPA…): ${POINTS.family} points` }),
        el("li", { text: `A new country: ${POINTS.country} points (provinces count as Canada)` }),
        el("li", { text: `A new category (beer, whisky, wine…): ${POINTS.category} points` })),
      el("p", { class: "hint", text: "Having the same drink again scores nothing. A cocktail variant counts as its cocktail, and drinks kept off the feed still count." })));
}

/* ---------- Passports and Try next ---------- */
const nameOf = id => id === uid() ? "you" : member(id).displayName;
const firstLine = f => f ? `First in the group: ${nameOf(f.uid)}, ${fmtDay(f.at)}` : "Nobody in the group yet";

/* #/passport/<styles|countries>/<uid>: every style (by category and family) or country, stamped once tried. */
export function renderPassport(main, tab = "styles", who = uid()) {
  if (!store.members.has(who) && who !== uid()) who = uid();
  const v = varietyOf(store.logs.filter(l => l.uid === who)), firsts = firstsInGroup(store.logs);
  const whose = who === uid() ? "Your" : `${member(who).displayName}'s`;
  const tabs = el("div", { class: "seg", role: "tablist" }, ...[["styles", "🎫 Styles"], ["countries", "🌍 Countries"]].map(([k, label]) =>
    el("a", { class: "seg-link", role: "tab", "aria-selected": String(tab === k), href: `#/passport/${k}/${who}`, text: label })));
  const body = tab === "countries" ? countryPassport(v, firsts) : stylePassport(v, firsts);
  fill(main, el("h2", { class: "page-title", text: `${whose} passport` }), tabs, ...body,
    who === uid() ? tryNextCard() : null);
}

function stylePassport(v, firsts) {
  const t = totals();
  return [el("p", { class: "muted", text: `${v.styles.size} of ${t.styles} styles stamped. Tap a style to see its drinks.` }),
    ...CATEGORIES.map(c => {
      const n = (v.byCategory.get(c.id) || new Set()).size;
      return el("details", { class: "card fold passport-cat", open: n ? "" : null },
        el("summary", {}, el("b", { text: `${c.icon} ${c.name}` }), el("span", { class: "muted small", text: ` ${n}/${t.byCategory.get(c.id)}` })),
        ...c.families.map(f => el("div", { class: "stack-tight" },
          el("span", { class: "muted small passport-fam", text: f.name }),
          el("div", { class: "stamps" }, ...f.styles.map(st => {
            const got = v.styles.has(st.id), first = firsts.styles.get(st.id);
            return el("a", { class: `stamp${got ? " got" : ""}`, href: `#/style/${st.id}`, title: firstLine(first) },
              got ? "✓ " : "", st.name);
          })))));
    })];
}

function countryPassport(v, firsts) {
  const list = countryList(allItems());
  const got = list.filter(c => v.countries.has(c.code)), rest = list.filter(c => !v.countries.has(c.code));
  const row = c => el("li", { class: `country${v.countries.has(c.code) ? " got" : ""}` },
    el("span", { class: "flag", text: flagOf(c.code) }),
    el("span", { class: "grow" }, el("b", { text: c.name }),
      el("span", { class: "muted small", text: `${c.drinks} drink${c.drinks === 1 ? "" : "s"} in the list · ${firstLine(firsts.countries.get(c.code))}` })),
    v.countries.has(c.code) ? el("span", { class: "chip gold", text: "✓" }) : null);
  return [el("p", { class: "muted", text: `${got.length} of ${list.length} countries stamped.` }),
    got.length ? el("ul", { class: "item-list card" }, ...got.map(row)) : null,
    el("details", { class: "card fold" }, el("summary", {}, el("b", { text: `Still to try (${rest.length})` })),
      el("ul", { class: "item-list" }, ...rest.map(row)))];
}

/* Styles you haven't tried that the group likes, each with a drink to try. On your profile and passport. */
export function tryNextCard() {
  const list = tryNext(store.logs, groupRatings(), uid(), allItems());
  if (!list.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: "✨ Try next" }),
    el("p", { class: "hint", text: `Styles you haven't had that the group likes. Each one is worth at least ${POINTS.drink + POINTS.style} points.` }),
    el("ul", { class: "item-list" }, ...list.map(s => {
      const st = styleOf(s.style), d = s.drink;
      const meta = [s.avg ? `group ${starText(s.avg)}` : "", s.triedBy ? `${s.triedBy} in the group had it` : ""].filter(Boolean).join(" · ");
      return el("li", {}, el("a", { class: "item-row", href: `#/${d.kind === "cocktail" ? "recipe" : "drink"}/${d.id}` },
        el("span", { class: "item-icon", text: st ? st.category.icon : "✨" }),
        el("span", { class: "grow" }, el("b", { text: st ? st.style.name : s.style }), el("span", { class: "small", text: `Try: ${d.title}` }),
          meta ? el("span", { class: "muted small", text: meta }) : null),
        el("span", { class: "chev", html: icon.chevron })));
    })));
}
