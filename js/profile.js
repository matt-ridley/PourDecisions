/* Profile: your own (with edit, look, units and sign out) or another member's. */
import { el, field, avatar, fmtDay, openSheet, closeSheet, icon, fill } from "./ui.js";
import { store, uid, isAdmin, updateMe, signOut, syncStatus } from "./cloud.js";
import { VERSION, APP_NAME } from "./config.js";
import { THEMES, getTheme, setTheme } from "./theme.js";
import { getUnits, setUnits } from "./units.js";
import { logRow } from "./logpage.js";
import { mixologistStats } from "./variants.js";
import { groupRatings, starText } from "./ratepage.js";

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
      store.group && (store.group.admins || []).includes(m.id) ? el("span", { class: "chip gold", text: store.group.ownerUid === m.id ? "Group owner" : "Admin" }) : null));

  // Someone else's drinks kept off the feed stay off their profile too.
  const theirs = store.logs.filter(l => l.uid === m.id && (mine || !l.offFeed)).sort((a, b) => b.at - a.at);
  const parts = [head,
    el("section", { class: "card stack" },
      el("h3", { text: `Recent drinks${theirs.length ? ` (${theirs.length} logged)` : ""}` }),
      theirs.length ? el("ul", { class: "item-list" }, ...theirs.slice(0, 10).map(l => logRow(l, { another: mine })))
        : el("p", { class: "muted", text: "Nothing logged yet." })),
    mixologistCard(m.id),
    el("section", { class: "card stack" },
      el("h3", { text: "Variety stats" }),
      el("p", { class: "muted", text: "Distinct drinks, styles and countries tried will show here in a later release." }))];

  if (mine) {
    parts.push(el("section", { class: "card stack" },
      el("h3", { text: "Your profile" }),
      el("button", { class: "btn", type: "button", text: "Edit name, hometown and favourite", onclick: editSheet })));

    const redraw = () => renderProfile(main, id);
    parts.push(el("section", { class: "card stack" },
      el("h3", { text: "Look" }),
      seg("Theme", THEMES, getTheme(), k => { setTheme(k); redraw(); }),
      el("p", { class: "hint", text: "Happy Hour is bright and sunny. Last Call is the dark bar. Auto follows the phone's light or dark setting." }),
      el("h3", { text: "Units" }),
      seg("Units", [["oz", "Ounces (oz)"], ["ml", "Millilitres (ml)"]], getUnits(), k => { setUnits(k); redraw(); }),
      el("p", { class: "hint", text: "Used for drink sizes and cocktail recipes. Saved on this phone." })));

    parts.push(el("section", { class: "stack" },
      el("a", { class: "btn block", href: "#/system", html: icon.glass }, "System info"),
      isAdmin() ? el("a", { class: "btn block", href: "#/admin", html: icon.shield }, "Group admin") : null,
      el("button", { class: "btn quiet block", type: "button", text: "Sign out", onclick: confirmSignOut })));
  }

  parts.push(el("footer", { class: "credit" },
    el("span", { text: `${APP_NAME} v${VERSION}${VERSION.startsWith("0.") ? " (beta)" : ""}` }),
    el("span", { text: "Built by Matt Ridley" })));
  fill(main, ...parts);
}

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
