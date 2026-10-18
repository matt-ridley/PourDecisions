/* Small DOM and formatting helpers shared by every screen. */

export const $ = id => document.getElementById(id);

/* el("button", { class: "btn", onclick: fn }, "Label", childNode) */
export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k === "value") n.value = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
  return n;
}

/* Replaces a node's contents, skipping empty (null/false) parts. */
export function fill(node, ...kids) {
  node.replaceChildren(...kids.flat().filter(k => k != null && k !== false));
  return node;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = n => String(n).padStart(2, "0");
const toDate = d => d instanceof Date ? d : new Date(d);

/* 2026-Oct-03 07:09:15 PM */
export function fmtDate(d) {
  d = toDate(d);
  const h = d.getHours() % 12 || 12;
  return `${d.getFullYear()}-${MON[d.getMonth()]}-${pad(d.getDate())} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
/* 2026-Oct-03 */
export function fmtDay(d) {
  d = toDate(d);
  return `${d.getFullYear()}-${MON[d.getMonth()]}-${pad(d.getDate())}`;
}
/* "5 min ago", "3 h ago", or the full date once it is over a week old. */
export function fmtAgo(d) {
  const s = (Date.now() - toDate(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return fmtDay(d);
}

export function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

/* A member's photo, or their initials on a colour picked from their id. */
const AVATAR_TINTS = ["#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
export function avatar(member, size = "") {
  const m = member || {};
  if (m.avatar) return el("img", { class: "avatar " + size, src: m.avatar, alt: "" });
  let h = 0;
  for (const c of String(m.id || m.displayName || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return el("span", { class: "avatar " + size, "aria-hidden": "true", style: `--tint:${AVATAR_TINTS[h % AVATAR_TINTS.length]}`,
    text: initials(m.displayName) });
}

/* ---------- Bottom sheet ---------- */
let sheetClose = null;
export function openSheet(build, { onClose } = {}) {
  const box = $("sheet");
  box.replaceChildren();
  build(box);
  box.hidden = false; $("scrim").hidden = false;
  document.body.classList.add("locked");
  sheetClose = onClose || null;
  const first = box.querySelector("[data-focus]");
  if (first) first.focus({ preventScroll: true });
}
export function closeSheet() {
  const box = $("sheet");
  if (box.hidden) return;
  box.hidden = true; $("scrim").hidden = true;
  box.replaceChildren();
  document.body.classList.remove("locked");
  const fn = sheetClose; sheetClose = null;
  if (fn) fn();
}
export const sheetOpen = () => !$("sheet").hidden;

/* ---------- Toast ---------- */
let toastTimer = null, toastAction = null;
export function toast(text, action) {
  clearTimeout(toastTimer);
  toastAction = action || null;
  $("toast-text").textContent = text;
  const b = $("toast-action");
  b.hidden = !toastAction;
  if (toastAction) b.textContent = toastAction.label;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => { $("toast").hidden = true; toastAction = null; }, action && action.sticky ? 60000 : 5000);
}
export function initToast() {
  $("toast-action").addEventListener("click", () => {
    const a = toastAction;
    toastAction = null; clearTimeout(toastTimer); $("toast").hidden = true;
    if (a) a.run();
  });
}

/* A button that needs a second tap to confirm, for anything destructive. */
export function confirmButton(label, armedLabel, run, cls = "btn danger") {
  let armed = false, t = null;
  const b = el("button", { class: cls, type: "button", text: label });
  b.addEventListener("click", () => {
    if (!armed) {
      armed = true; b.classList.add("armed"); b.textContent = armedLabel;
      t = setTimeout(() => { armed = false; b.classList.remove("armed"); b.textContent = label; }, 4000);
      return;
    }
    clearTimeout(t);
    run();
  });
  return b;
}

/* Links to other pages, as rows in one card: [{ icon, title, sub, href }]. Empty rows are skipped. */
export function linkList(rows, title) {
  rows = rows.filter(Boolean);
  if (!rows.length) return null;
  return el("section", { class: "card stack" }, title ? el("h3", { text: title }) : null,
    el("ul", { class: "item-list" }, ...rows.map(r => el("li", {}, el("a", { class: "item-row", href: r.href },
      el("span", { class: "item-icon", text: r.icon }),
      el("span", { class: "grow" }, el("b", { text: r.title }), r.sub ? el("span", { class: "muted small", text: r.sub }) : null),
      r.chip || null,
      el("span", { class: "chev", html: icon.chevron }))))));
}

/* A labelled form field. */
export function field(label, input, hint) {
  return el("label", { class: "field" }, el("span", { class: "field-label", text: label }), input,
    hint ? el("span", { class: "hint", text: hint }) : null);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

const svg = (body, width = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const icon = {
  glass: svg('<path d="M5 4h14l-1.6 15.2a2 2 0 0 1-2 1.8H8.6a2 2 0 0 1-2-1.8z"/><path d="M5.8 11h12.4"/>'),
  feed: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  bottle: svg('<path d="M10 2h4v4l1.5 2.5A3 3 0 0 1 16 10v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10a3 3 0 0 1 .5-1.5L10 6z"/><path d="M8 13h8"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 3),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 2.5),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'),
  chevron: svg('<path d="m9 6 6 6-6 6"/>', 2.5),
  bar: svg('<path d="M4 4h16l-8 9z"/><path d="M12 13v7M8 20h8"/>'),
  us: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17.5 14.5a4.5 4.5 0 0 1 4 5.5"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  bell: svg('<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>'),
};
