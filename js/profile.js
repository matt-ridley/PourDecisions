/* Profile: your own or another member's (#/me, #/u/<id>), and your settings (#/settings: edit, look, units, sign out). */
import { el, field, avatar, fmtDay, openSheet, closeSheet, icon, fill, linkList } from "./ui.js";
import { store, uid, isAdmin, updateMe, signOut, syncStatus } from "./cloud.js";
import { VERSION, APP_NAME } from "./config.js";
import { THEMES, getTheme, setTheme } from "./theme.js";
import { getUnits, setUnits } from "./units.js";
import { logRow } from "./logpage.js";
import { mixologistStats } from "./variants.js";
import { varietyCard, volumeCard, tryNextCard } from "./statspage.js";
import { groupRatings, starText } from "./ratepage.js";
import { householdOf, stockIn, fridgeCount, emptiesOf, onHand } from "./stock.js";
import { itemById } from "./catalog.js";
import { tabLine } from "./tabpage.js";

const seg = (label, options, current, pick) => el("div", { class: "seg wide", role: "group", "aria-label": label },
  ...options.map(([k, text]) => el("button", { type: "button", "aria-pressed": String(current === k), text, onclick: () => pick(k) })));

export function renderProfile(main, id) {
  const mine = !id || id === uid();
  const m = mine ? { ...store.me, id: uid() } : store.members.get(id);
  if (!m) return fill(main, el("div", { class: "card" }, el("p", { text: "That member isn't in the group any more." })));

  const head = el("section", { class: "profile-head" },
    avatar(m, "xl"),
    el("div", {},
      el("h2", { text: m.displayName }),
      m.hometown ? el("p", { class: "muted", text: `📍 ${m.hometown}` }) : null,
      m.favourite ? el("p", { class: "muted", text: `❤️ ${m.favourite}` }) : null,
      el("p", { class: "muted small", text: `Joined ${fmtDay(m.joinedAt || Date.now())}` }),
      store.group && (store.group.admins || []).includes(m.id) ? el("span", { class: "chip gold", text: store.group.ownerUid === m.id ? "Group owner" : "Admin" }) : null),
    mine ? el("a", { class: "icon-btn profile-gear", href: "#/settings", "aria-label": "Settings", html: icon.gear }) : null);

  // Someone else's drinks kept off the feed stay off their profile too.
  const theirs = store.logs.filter(l => l.uid === m.id && (mine || !l.offFeed)).sort((a, b) => b.at - a.at);
  const parts = [head,
    el("section", { class: "card stack" },
      // How many someone has logged is a personal stat: only your own profile shows the count.
      el("h3", { text: `Recent drinks${mine && theirs.length ? ` (${theirs.length} logged)` : ""}` }),
      theirs.length ? el("ul", { class: "item-list" }, ...theirs.slice(0, 10).map(l => logRow(l, { another: mine })))
        : el("p", { class: "muted", text: "Nothing logged yet." })),
    // Your own bar and the Tab have tabs of their own (Bar, Us); a friend's profile links to theirs.
    mine ? null : barLink(m.id),
    mine ? null : tabLine(m.id),
    wantsCard(m, mine),
    emptiesCard(m.id),
    varietyCard(m.id),
    mine ? tryNextCard() : null,
    mine ? volumeCard() : null,
    mixologistCard(m.id)].filter(Boolean);

  if (mine) parts.push(el("a", { class: "btn block", href: "#/settings", html: icon.gear }, "Settings"));
  fill(main, ...parts);
}

/* #/settings: your name and details, the look, units, System info, Group admin and signing out. */
export function renderSettings(main) {
  const redraw = () => renderSettings(main);
  fill(main,
    el("h2", { class: "page-title", text: "Settings" }),
    el("section", { class: "card stack" },
      el("h3", { text: "Your profile" }),
      el("button", { class: "btn", type: "button", text: "Edit name, hometown and favourite", onclick: editSheet })),
    el("section", { class: "card stack" },
      el("h3", { text: "Look" }),
      seg("Theme", THEMES, getTheme(), k => { setTheme(k); redraw(); }),
      el("p", { class: "hint", text: "Happy Hour is bright and sunny. Last Call is the dark bar. Auto follows the phone's light or dark setting." }),
      el("h3", { text: "Units" }),
      seg("Units", [["oz", "Ounces (oz)"], ["ml", "Millilitres (ml)"]], getUnits(), k => { setUnits(k); redraw(); }),
      el("p", { class: "hint", text: "Used for drink sizes and cocktail recipes. Saved on this phone." })),
    el("section", { class: "stack" },
      el("a", { class: "btn block", href: "#/system", html: icon.glass }, "System info"),
      isAdmin() ? el("a", { class: "btn block", href: "#/admin", html: icon.shield }, "Group admin") : null,
      el("button", { class: "btn quiet block", type: "button", text: "Sign out", onclick: confirmSignOut })),
    credit());
}

const credit = () => el("footer", { class: "credit" },
  el("span", { text: `${APP_NAME} v${VERSION}${VERSION.startsWith("0.") ? " (beta)" : ""}` }),
  el("span", { text: "Built by Matt Ridley" }));

function editSheet() {
  openSheet(box => {
    const name = el("input", { type: "text", maxlength: 40, autocapitalize: "words", value: store.me.displayName || "", "data-focus": "" });
    const town = el("input", { type: "text", maxlength: 60, autocapitalize: "words", value: store.me.hometown || "", placeholder: "e.g. Guelph" });
    const fav = el("input", { type: "text", maxlength: 60, autocapitalize: "words", value: store.me.favourite || "", placeholder: "e.g. Lot No. 40 neat" });
    const form = el("form", { class: "stack" },
      el("h2", { text: "Edit profile" }),
      field("Name in the group", name),
      field("Hometown (optional)", town),
      field("Favourite drink (optional)", fav, "Shown on your profile. Bragging encouraged."),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })));
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!name.value.trim()) return name.focus();
      updateMe({ displayName: name.value, hometown: town.value, favourite: fav.value });
      closeSheet();
    });
    box.append(form);
  });
}

function confirmSignOut() {
  const s = syncStatus();
  const waiting = s.pending || store.outbox.length > 0;
  openSheet(box => box.append(el("div", { class: "stack" },
    el("h2", { text: "Sign out?" }),
    el("p", { text: waiting
      ? "Some changes on this phone haven't reached the group yet. Signing out now could lose them. Wait until you have signal and the dot on the glass is green."
      : "You'll need your email, password and signal to sign back in." }),
    el("div", { class: "row" },
      el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
      el("button", { class: "btn danger", type: "button", text: "Sign out", onclick: () => { closeSheet(); signOut(); } })))));
}

/* Want to try: drinks someone marked on a drink's page and hasn't had yet, with whose bar has one. */
function wantsCard(m, mine) {
  const tried = new Set(store.logs.filter(l => l.uid === m.id).map(l => (itemById(l.kind, l.drinkId) || { id: l.drinkId }).id));
  const list = [...new Set(m.wants || [])].map(id => itemById("drink", id)).filter(i => i && !tried.has(i.id)).reverse();
  if (!list.length) return null;
  const where = id => store.households.filter(h => store.stock.some(s => s.hh === h.id && s.kind === "drink" && s.item === id && onHand(s)))
    .map(h => h.name);
  return el("section", { class: "card stack" },
    el("h3", { text: `🎯 Want to try · ${list.length}` }),
    el("ul", { class: "item-list" }, ...list.slice(0, 12).map(i => {
      const bars = where(i.id);
      return el("li", {}, el("a", { class: "item-row", href: `#/drink/${i.id}` },
        el("span", { class: "item-icon", text: i.category.icon }),
        el("span", { class: "grow" }, el("b", { text: i.title }),
          el("span", { class: "muted small", text: [i.style.name, bars.length ? `🏠 In ${bars.join(", ")}` : ""].filter(Boolean).join(" · ") })),
        el("span", { class: "chev", html: icon.chevron })));
    })),
    list.length > 12 ? el("p", { class: "muted small", text: `And ${list.length - 12} more.` }) : null,
    mine ? el("p", { class: "hint", text: "Add drinks with 🎯 Want to try on a drink's page. They leave the list once you log one." }) : null);
}

/* Killed the bottle: a wall of the empties someone poured the last drop of. */
function emptiesCard(id) {
  const all = emptiesOf(store.logs, id);
  if (!all.length) return null;
  return el("section", { class: "card stack" },
    el("h3", { text: `🍾 Killed the bottle · ${all.length}` }),
    el("div", { class: "chips" }, ...all.slice(0, 24).map(e => el("a", { class: "chip-btn tag", href: `#/l/${e.logId}`,
      text: (itemById("drink", e.drinkId) || { title: "A bottle" }).title }))),
    all.length > 24 ? el("p", { class: "muted small", text: `And ${all.length - 24} more.` }) : null);
}

/* The household a friend is in, with what's in it. */
function barLink(id) {
  const h = householdOf(store.households, id);
  if (!h) return null;
  const f = stockIn(store.stock, h.id, "fridge").reduce((n, s) => n + fridgeCount(s), 0);
  const b = stockIn(store.stock, h.id, "bar").filter(s => s.kind === "drink").length;
  return linkList([{ icon: "🏠", title: h.name, sub: `${f} in the fridge · ${b} bottle${b === 1 ? "" : "s"} in the bar`, href: `#/bar/${h.id}/fridge` }]);
}

/* Cocktails made, variants created, how often friends made them, how they're rated, and House Pours held. */
function mixologistCard(id) {
  const s = mixologistStats(id, store.logs, groupRatings());
  if (!s.made && !s.created) return null;
  const stat = (n, label) => el("div", { class: "stat" }, el("b", { text: String(n) }), el("span", { text: label }));
  return el("section", { class: "card stack" },
    el("h3", { text: "🍸 Mixologist" }),
    el("div", { class: "mix-stats" },
      stat(s.made, "cocktails made"), stat(s.created, `variant${s.created === 1 ? "" : "s"} created`),
      stat(s.byOthers, "made by friends"), stat(s.avg ? starText(s.avg) : "–", s.ratings ? `from ${s.ratings} rating${s.ratings === 1 ? "" : "s"}` : "no ratings yet"),
      s.houses ? stat(`👑 ${s.houses}`, `House Pour${s.houses === 1 ? "" : "s"}`) : null));
}
