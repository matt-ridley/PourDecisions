/* Group admin: name, invite code, members and (owner only) admins. */
import { el, field, avatar, fmtDay, openSheet, closeSheet, toast, copyText, confirmButton, fill } from "./ui.js";
import { store, uid, isAdmin, isOwner, setGroupName, setInviteCode, setSuspended, removeMember, setAdmin, randomCode, cleanCode } from "./cloud.js";
import { APP_NAME, TAGLINE } from "./config.js";
import { toCheck } from "./moderation.js";
import { freePlanCard } from "./systempage.js";

const publicUrl = () => location.origin + location.pathname; // without ?emulator or anything else

export function renderAdmin(main) {
  if (!isAdmin()) return fill(main, el("div", { class: "card" }, el("p", { text: "Only group admins can open this page." })));
  const G = store.group;
  const code = store.invite;

  const invite = el("section", { class: "card stack" },
    el("h3", { text: "Invite friends" }),
    el("p", { text: "Friends open the app, tap Join the group, and enter this code." }),
    el("div", { class: "invite-code", text: code === undefined ? "…" : code || "(none set)" }),
    el("div", { class: "row" },
      el("button", { class: "btn primary", type: "button", text: "Copy invite", onclick: async () => {
        const text = `Join ${G.name} on ${APP_NAME}! Open ${publicUrl()} , tap "Join the group" and use invite code ${code}`;
        toast(await copyText(text) ? "Invite copied. Paste it into a text." : text);
      } }),
      el("button", { class: "btn", type: "button", text: "Change code", onclick: () => codeSheet(code) })),
    isOwner() && code ? el("button", { class: "btn block", type: "button", text: "✉️ Email an invite", onclick: () => emailSheet(code) }) : null,
    el("p", { class: "hint", text: "Changing the code stops new sign-ups with the old one. People already in the group stay in." }));

  const group = el("section", { class: "card stack" },
    el("h3", { text: "Group" }),
    el("div", { class: "row spread" }, el("strong", { text: G.name }),
      el("button", { class: "btn small", type: "button", text: "Rename", onclick: renameSheet })),
    el("p", { class: "hint", text: `Started ${fmtDay(G.createdAt || Date.now())}.` }));

  const members = [...store.members.values()].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  const list = el("section", { class: "card stack" },
    el("h3", { text: `Members (${members.length})` }),
    el("ul", { class: "member-list" }, ...members.map(m => {
      const owner = G.ownerUid === m.id, admin = (G.admins || []).includes(m.id);
      return el("li", { class: "member-row" + (m.suspended ? " paused" : "") },
        avatar(m),
        el("div", { class: "grow" },
          el("div", { class: "name", text: m.displayName + (m.id === uid() ? " (you)" : "") }),
          el("div", { class: "muted small", text: [owner ? "Owner" : admin ? "Admin" : "Member", `joined ${fmtDay(m.joinedAt || 0)}`, m.suspended ? "paused" : ""].filter(Boolean).join(" · ") })),
        owner || m.id === uid() ? null : el("button", { class: "btn small", type: "button", text: "Manage", onclick: () => memberSheet(m.id) }));
    })));
  const n = toCheck().length;
  const catalog = el("a", { class: "card admin-link", href: "#/catalog" },
    el("div", { class: "grow" }, el("h3", { text: "Drink list" }),
      el("p", { class: "muted small", text: "Check new drinks, fix details, merge duplicates, styles and places." })),
    n ? el("span", { class: "chip gold", text: `${n} to check` }) : null);
  fill(main, el("h2", { class: "page-title", text: "Group admin" }), catalog, invite, group, list, freePlanCard());
}

/* The owner's invite email: what the app is, installing it on iPhone and Android, signing up and the invite code.
   It opens in the owner's own email app, so it comes from their address and needs no email service. */
export function inviteEmail(groupName, code, url, name = "") {
  const subject = `Join ${groupName} on ${APP_NAME}`;
  const body = [
    `Hi${name ? ` ${name}` : ""},`,
    "",
    `I'd like you to join ${groupName} on ${APP_NAME}, our private drinks app. ${TAGLINE}`,
    "Log what you drink, rate it, see what everyone's pouring, and compete on variety (the most different drinks, styles and countries, never the most drinks).",
    "",
    `1. Open ${url} on your phone.`,
    "2. Put it on your home screen:",
    "   - iPhone: open it in Safari, tap the Share button, then Add to Home Screen.",
    "   - Android: open it in Chrome, tap the ⋮ menu, then Install app (or Add to Home screen).",
    "3. Open it from the home screen and create an account with your email and a password.",
    `4. Tap Join the group and enter the invite code: ${code}`,
    "",
    "Cheers!",
  ].join("\n");
  return { subject, body };
}

function emailSheet(code) {
  openSheet(box => {
    const to = el("input", { type: "email", inputmode: "email", autocomplete: "off", placeholder: "friend@example.com", "data-focus": "" });
    const name = el("input", { type: "text", maxlength: 40, autocapitalize: "words", placeholder: "e.g. Sam" });
    box.append(el("div", { class: "stack" },
      el("h2", { text: "✉️ Email an invite" }),
      el("p", { class: "hint", text: "Writes the email in your own email app (from your address): what the app is, how to install it on iPhone and Android, how to sign up, and the invite code. Check it and send it from there." }),
      field("Their email (optional)", to),
      field("Their name (optional)", name),
      el("button", { class: "btn primary block", type: "button", text: "Open in my email app", onclick: () => {
        const { subject, body } = inviteEmail(store.group.name, code, publicUrl(), name.value.trim());
        location.href = `mailto:${encodeURIComponent(to.value.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        closeSheet();
      } }),
      el("button", { class: "btn quiet block", type: "button", text: "Cancel", onclick: closeSheet })));
  });
}

function codeSheet(current) {
  openSheet(box => {
    const input = el("input", { type: "text", maxlength: 30, autocapitalize: "characters", value: current || "", "data-focus": "" });
    const form = el("form", { class: "stack" },
      el("h2", { text: "Invite code" }),
      field("New code", input, "At least 4 characters. Not case sensitive."),
      el("button", { class: "btn block", type: "button", text: "Make a random one", onclick: () => { input.value = randomCode(); } }),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })));
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (cleanCode(input.value).length < 4) return input.focus();
      setInviteCode(input.value); closeSheet(); toast("Invite code changed.");
    });
    box.append(form);
  });
}

function renameSheet() {
  openSheet(box => {
    const input = el("input", { type: "text", maxlength: 40, autocapitalize: "words", value: store.group.name, "data-focus": "" });
    const form = el("form", { class: "stack" },
      el("h2", { text: "Rename group" }), field("Group name", input),
      el("div", { class: "row" },
        el("button", { class: "btn", type: "button", text: "Cancel", onclick: closeSheet }),
        el("button", { class: "btn primary", type: "submit", text: "Save" })));
    form.addEventListener("submit", e => { e.preventDefault(); if (!input.value.trim()) return input.focus(); setGroupName(input.value); closeSheet(); });
    box.append(form);
  });
}

function memberSheet(id) {
  const m = store.members.get(id);
  if (!m) return;
  const admin = (store.group.admins || []).includes(id);
  // Only the owner can pause or remove another admin.
  if (admin && !isOwner()) return openSheet(box => box.append(el("div", { class: "stack" },
    el("div", { class: "row" }, avatar(m, "lg"), el("h2", { text: m.displayName })),
    el("p", { text: `${m.displayName} is an admin. Only the group owner can change their account.` }),
    el("button", { class: "btn block", type: "button", text: "Close", onclick: closeSheet }))));
  openSheet(box => box.append(el("div", { class: "stack" },
    el("div", { class: "row" }, avatar(m, "lg"), el("h2", { text: m.displayName })),
    isOwner() ? el("button", { class: "btn block", type: "button", text: admin ? "Remove admin rights" : "Make admin",
      onclick: () => { setAdmin(id, !admin); closeSheet(); toast(admin ? `${m.displayName} is no longer an admin.` : `${m.displayName} is now an admin.`); } }) : null,
    el("button", { class: "btn block", type: "button", text: m.suspended ? "Switch account back on" : "Pause account",
      onclick: () => { setSuspended(id, !m.suspended); closeSheet(); } }),
    el("p", { class: "hint", text: "A paused member can't see or post anything until switched back on." }),
    confirmButton("Remove from group", "Tap again to remove", () => {
      if (admin) setAdmin(id, false);
      removeMember(id); closeSheet(); toast(`${m.displayName} was removed. Change the invite code so they can't rejoin.`);
    }, "btn danger block"),
    el("button", { class: "btn quiet block", type: "button", text: "Close", onclick: closeSheet }))));
}
