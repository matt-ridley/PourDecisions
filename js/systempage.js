/* System info (#/system): the connection behind the dot on the glass, the app version, and this phone.
   Opened by tapping the glass at the top, or from your profile. */
import { VERSION, FIREBASE_SDK } from "./config.js";
import { el, fill, fmtDate, fmtAgo, toast } from "./ui.js";
import { store, cloud, syncStatus, USE_EMULATOR } from "./cloud.js";
import { usage, FREE } from "./usage.js";
import { getTheme, THEMES } from "./theme.js";

/* The dot's colour, in words. `kind` comes from syncStatus(). */
const STATUS_TEXT = {
  live: { title: "Connected", text: "Everything on this phone matches the group." },
  busy: { title: "Syncing", text: "Your changes are on their way to the group." },
  offline: { title: "Offline", text: "No signal. You can keep logging; changes send when signal comes back." },
  bad: { title: "Sync problem", text: "The group refused a change or the connection keeps failing. It retries on its own." },
  off: { title: "Not signed in", text: "" },
};
export const statusText = kind => STATUS_TEXT[kind] || STATUS_TEXT.off;

const SDK = (FIREBASE_SDK.match(/\/(\d+\.\d+\.\d+)\//) || [])[1] || "?";
const plural = (n, one, many = one + "s") => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const line = (k, v) => v == null ? null : el("div", { class: "fact" }, el("dt", { text: k }), el("dd", {}, v));
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const fmtBytes = n => (n >= 1024 ** 3 ? `${+(n / 1024 ** 3).toFixed(2)} GB` : n >= 1024 ** 2 ? `${Math.round(n / 1024 ** 2)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${Math.round(n)} bytes`);

/* Filled in after the page draws (they're async), so the page never waits on them. */
function later(promise, fmt) {
  const span = el("span", { class: "muted", text: "Checking…" });
  promise.then(v => { span.className = ""; span.textContent = fmt(v); }).catch(() => { span.textContent = "Not available on this phone"; });
  return span;
}

function connection() {
  const s = syncStatus(), t = statusText(s.kind);
  const sending = store.outbox.filter(e => e.state !== "failed").length, failed = store.outbox.length - sending;
  return el("section", { class: "card stack" },
    el("div", { class: "row" },
      el("span", { class: `status-ball big status-${s.kind}`, "aria-hidden": "true" }),
      el("div", { class: "grow" }, el("h3", { text: t.title }), el("span", { class: "muted small", text: `Since ${fmtAgo(s.since)}` }))),
    t.text ? el("p", { text: t.text }) : null,
    el("dl", { class: "facts" },
      line("Since", fmtDate(s.since)),
      line("Last synced", cloud.lastServerAt ? `${fmtDate(cloud.lastServerAt)} (${fmtAgo(cloud.lastServerAt)})` : "Not yet since the app was opened"),
      line("Network", navigator.onLine ? "On" : "Off (no signal or airplane mode)"),
      line("Drinks to send", sending ? `${plural(sending, "drink")}, kept on this phone until the group has them` : "None"),
      failed ? line("Refused", `${plural(failed, "drink")}. Open Home to try again.`) : null,
      line("Changes to send", s.pending ? "Yes, they send when there's signal" : "None")),
    el("p", { class: "hint", text: "The dot on the glass at the top shows this: green = connected, pulsing green = syncing, blue = offline, red = a sync problem." }));
}

/* ---------- The free plan ---------- */
/* Everything the app listens to, as { collection: [docs] }, for the estimate. */
function collections() {
  return {
    config: [store.group || {}, ...(store.invite ? [{ id: "invite", code: store.invite }] : [])], members: [...store.members.values()],
    logs: store.logs, places: store.places, drinks: store.drinks, fixes: store.fixes, styles: store.styles, ratings: store.ratings,
    variants: store.variants, cheers: store.cheers, comments: store.comments, households: store.households, stock: store.stock,
    nights: store.nights, bring: store.bring, orders: store.orders,
  };
}

/* A bar filled to a share (0 to 1): amber from 60%, red from 85%. */
function meter(share, label) {
  const p = Math.min(1, Math.max(0, share));
  return el("div", { class: `meter${p >= 0.85 ? " bad" : p >= 0.6 ? " warn" : ""}`, role: "meter", "aria-label": label,
    "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(Math.round(p * 100)) }, el("i", { style: `width: ${(p * 100).toFixed(1)}%` }));
}
const pct = p => p < 0.001 ? "under 0.1%" : `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const many = n => n === Infinity ? "lots of" : n.toLocaleString();

/* Storage, and what each app open costs, against the free plan (on System info and Group admin). */
export function freePlanCard() {
  const photos = store.logs.filter(l => l.hasPhoto).length + store.households.filter(h => h.hasPhoto).length;
  const u = usage(collections(), photos);
  return el("section", { class: "card stack" },
    el("h3", { text: "📊 The free plan" }),
    el("p", { class: "small" }, el("b", { text: "Storage: " }), `about ${fmtBytes(u.stored)} of ${fmtBytes(FREE.stored)} (${pct(u.pct.stored)})`),
    meter(u.pct.stored, "Storage used"),
    el("p", { class: "muted small", text: `Room for about ${many(u.logsLeft)} more drinks at today's average (${fmtBytes(u.avgLog)} each, photos included).` }),
    el("p", { class: "small" }, el("b", { text: "Each app open on a new phone: " }), `${plural(u.perOpen.reads, "read")} and ${fmtBytes(u.perOpen.bytes)} to download`),
    meter(u.perOpen.reads / FREE.readsPerDay, "Reads per open, of the daily limit"),
    el("p", { class: "muted small", text: `The free plan allows ${FREE.readsPerDay.toLocaleString()} reads a day: about ${many(u.opensPerDay)} opens like that a day, and ${fmtBytes(FREE.downloadPerMonth)} of downloads a month: about ${many(u.opensPerMonth)} a month.` }),
    el("p", { class: "hint", text: "Estimates, worked out on this phone. Opening the app again on the same phone mostly reads only what changed, so real use is well under this." }));
}

function app() {
  return el("section", { class: "card stack" },
    el("h3", { text: "📱 App" }),
    el("dl", { class: "facts" },
      line("Version", VERSION),
      line("Installed", installed() ? "Yes, on the home screen" : "No, running in the browser"),
      line("Works offline", navigator.serviceWorker && navigator.serviceWorker.controller ? "Yes, ready" : "Not yet (reopen the app once)"),
      line("Firebase", `${SDK}${USE_EMULATOR ? " (test emulator)" : ""}`),
      line("Signed in as", cloud.user && cloud.user.email)),
    el("button", { class: "btn block", type: "button", text: "Check for an update", onclick: checkUpdate }));
}

/* App files are fetched fresh whenever there's signal, so the version on the site is the one a reload would give.
   The query string keeps the check from being saved by the service worker (see sw.js). */
async function checkUpdate() {
  if (!navigator.onLine) return toast("Needs signal to check.");
  toast("Checking…");
  try {
    const text = await (await fetch(`js/config.js?check=${Date.now()}`, { cache: "no-store" })).text();
    const live = (text.match(/VERSION = "([^"]+)"/) || [])[1];
    if (!live) throw new Error("No version");
    if (live === VERSION) return toast(`You're on the latest version (${VERSION}).`);
    toast(`Version ${live} is ready.`, { label: "Update", run: () => location.reload(), sticky: true });
  } catch { toast("Couldn't check right now. Try again."); }
}

function phone() {
  const est = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.reject();
  const kept = navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : Promise.reject();
  const look = (THEMES.find(([k]) => k === getTheme()) || [, getTheme()])[1];
  return el("section", { class: "card stack" },
    el("h3", { text: "🔋 This phone" }),
    el("dl", { class: "facts" },
      line("Space used", later(est, e => fmtBytes(e.usage || 0))),
      line("Data protected", later(kept, p => p ? "Yes, the phone won't clear it when space runs low" : "No, the phone may clear it if space runs very low")),
      line("Look", look)));
}

export function renderSystem(main) {
  fill(main, el("h2", { class: "page-title", text: "System info" }), connection(), app(), freePlanCard(), phone());
}
