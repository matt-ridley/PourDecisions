/* Boot, routing, header and bottom navigation. */
import { VERSION, APP_NAME } from "./config.js";
import { $, el, avatar, icon, initToast, closeSheet, sheetOpen, toast, fill } from "./ui.js";
import { cloud, store, subscribe, gate, syncStatus, initCloud, uid } from "./cloud.js";
import { renderGate } from "./gate.js";
import { renderProfile } from "./profile.js";
import { renderAdmin } from "./admin.js";
import { renderHome } from "./home.js";
import { renderLog, renderLogDetail, renderLogEdit } from "./logpage.js";
import { renderDrinks, renderCategory, renderDrink, renderRecipe, renderIngredient } from "./drinks.js";
import { applyTheme } from "./theme.js";

/* Each route renders into <main>. `live` routes re-render when group data changes; the rest don't, so typing isn't lost. */
const ROUTES = {
  home: { tab: "home", live: true, render: renderHome },
  log: { tab: "log", live: false, render: renderLog },
  l: { tab: null, live: true, render: renderLogDetail },
  edit: { tab: null, live: false, render: renderLogEdit },
  drinks: { tab: "drinks", live: false, render: renderDrinks },
  cat: { tab: "drinks", sub: true, live: false, render: renderCategory },
  drink: { tab: "drinks", sub: true, live: false, render: renderDrink },
  recipe: { tab: "drinks", sub: true, live: false, render: renderRecipe },
  ing: { tab: "drinks", sub: true, live: false, render: renderIngredient },
  me: { tab: null, live: true, render: main => renderProfile(main) },
  u: { tab: null, live: true, render: (main, id) => renderProfile(main, id) },
  admin: { tab: null, live: true, render: renderAdmin },
};

function parseRoute() {
  const [name, arg, arg2] = location.hash.replace(/^#\/?/, "").split("/");
  return ROUTES[name] ? { name, arg, arg2, ...ROUTES[name] } : { name: "home", ...ROUTES.home };
}

/* Redraws wait while someone is typing in a box on the page, so a friend's change can't wipe what's half typed. */
let pendingRender = false;
const typing = () => {
  const a = document.activeElement;
  return !!(a && $("main").contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
};
const flushPending = () => { if (pendingRender && !typing()) { pendingRender = false; render(); } };
document.addEventListener("focusout", () => setTimeout(flushPending, 0));
setInterval(flushPending, 2000); // backup: focus events don't always fire (e.g. when the app is in the background)

let lastKey = "";
function render(force = false) {
  const g = gate(), main = $("main"), r = parseRoute();
  const inApp = g === "in";
  document.body.classList.toggle("gated", !inApp);
  renderHeader(inApp);
  renderNav(inApp, r.tab);
  const key = inApp ? `in:${r.name}:${r.arg || ""}:${r.arg2 || ""}` : `gate:${g}`;
  if (!force && key === lastKey && !(inApp && r.live)) return;
  if (!force && key === lastKey && typing()) { pendingRender = true; return; }
  const changed = key !== lastKey;
  lastKey = key;
  if (inApp) r.render(main, r.arg, r.arg2); else renderGate(main);
  if (changed) window.scrollTo(0, 0);
}

function renderHeader(inApp) {
  const head = $("top");
  head.hidden = !inApp;
  if (!inApp) return;
  const s = syncStatus(), r = parseRoute();
  // Pages without a tab, and pages inside the Drinks tab, get a back button.
  const back = !r.tab || r.sub ? el("button", { class: "icon-btn", type: "button", "aria-label": "Back", html: icon.back,
    onclick: () => history.length > 1 ? history.back() : (location.hash = r.tab ? `#/${r.tab}` : "#/home") }) : null;
  fill(head,
    back || el("span", { class: "brand-mark", html: icon.glass }),
    el("div", { class: "brand" },
      el("div", { class: "brand-name", text: (store.group && store.group.name) || APP_NAME })),
    el("span", { class: `sync ${s.kind}`, role: "status", text: s.label }),
    el("a", { class: "me-btn", href: "#/me", "aria-label": "Your profile" }, avatar({ ...store.me, id: uid() }, "sm")));
}

function renderNav(inApp, active) {
  const nav = $("nav");
  nav.hidden = !inApp;
  if (!inApp) return;
  const item = (tab, label, svg, cls = "") => el("a", { class: "nav-item " + cls, href: `#/${tab}`,
    "aria-current": active === tab ? "page" : null, html: svg }, el("span", { text: label }));
  fill(nav,
    item("home", "Home", icon.feed),
    item("log", "Log", icon.plus, "log"),
    item("drinks", "Drinks", icon.bottle));
}

/* ---------- Service worker: lets the app open with no signal ---------- */
function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch(e => console.warn("Service worker failed", e));
  // A new version took over while the app was open: offer a reload rather than swapping it mid-entry.
  let had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (had) toast("A new version is ready.", { label: "Update", run: () => location.reload(), sticky: true });
    had = true;
  });
}

/* ---------- Boot ---------- */
applyTheme();
initToast();
$("scrim").addEventListener("click", closeSheet);
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheetOpen()) closeSheet(); });
window.addEventListener("hashchange", () => { closeSheet(); render(true); });
subscribe(() => render());
// Ask the phone not to clear saved data (changes waiting for signal live there) when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
registerWorker();
render(true);
initCloud();
document.documentElement.dataset.version = VERSION;

// Handy when testing locally: window.__pd in the console.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__pd = { cloud, store, render };
