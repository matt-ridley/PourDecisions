/* Boot, routing, header and bottom navigation. */
import { VERSION, APP_NAME } from "./config.js";
import { $, el, avatar, icon, initToast, closeSheet, sheetOpen, toast, fill } from "./ui.js";
import { cloud, store, subscribe, gate, syncStatus, initCloud, uid } from "./cloud.js";
import { renderGate } from "./gate.js";
import { renderProfile } from "./profile.js";
import { renderAdmin } from "./admin.js";
import { renderCatalogAdmin } from "./moderation.js";
import { renderHome } from "./home.js";
import { renderLog, renderLogDetail, renderLogEdit } from "./logpage.js";
import { renderDrinks, renderCategory, renderStyle, renderDrink, renderRecipe, renderIngredient, renderVariant, renderCompare } from "./drinks.js";
import { renderSystem, statusText } from "./systempage.js";
import { renderTop } from "./ratepage.js";
import { bellButton, renderAlerts } from "./alertspage.js";
import { renderPost } from "./feedpage.js";
import { renderBoard, renderPassport, renderVs, renderCharts } from "./statspage.js";
import { renderMake } from "./makepage.js";
import { applyTheme } from "./theme.js";

/* Each route renders into <main>. `live` routes re-render when group data changes; the rest don't, so typing isn't lost. */
const ROUTES = {
  home: { tab: "home", live: true, render: renderHome },
  log: { tab: "log", live: false, render: renderLog },
  l: { tab: null, live: true, render: renderLogDetail },
  edit: { tab: null, live: false, render: renderLogEdit },
  make: { tab: null, live: false, render: renderMake }, // not live: a friend's new log mustn't reset what you're making
  drinks: { tab: "drinks", live: false, render: renderDrinks },
  // Drink list pages redraw when admins fix or merge something (they have no boxes to type in).
  cat: { tab: "drinks", sub: true, live: true, render: renderCategory },
  style: { tab: "drinks", sub: true, live: true, render: renderStyle },
  drink: { tab: "drinks", sub: true, live: true, render: renderDrink },
  recipe: { tab: "drinks", sub: true, live: true, render: renderRecipe }, // live for its ratings
  ing: { tab: "drinks", sub: true, live: false, render: renderIngredient },
  v: { tab: "drinks", sub: true, live: true, render: renderVariant }, // a cocktail variant
  compare: { tab: "drinks", sub: true, live: true, render: renderCompare }, // two versions of a cocktail
  top: { tab: "drinks", sub: true, live: true, render: renderTop },
  me: { tab: null, live: true, render: main => renderProfile(main) },
  u: { tab: null, live: true, render: (main, id) => renderProfile(main, id) },
  admin: { tab: null, live: true, render: renderAdmin },
  catalog: { tab: null, live: true, render: renderCatalogAdmin },
  system: { tab: null, live: true, render: renderSystem },
  alerts: { tab: null, live: true, render: renderAlerts },
  board: { tab: null, live: true, render: renderBoard }, // the variety board
  passport: { tab: null, live: true, render: renderPassport }, // #/passport/<styles|countries>/<uid>
  vs: { tab: null, live: true, render: renderVs }, // head-to-head with a friend
  charts: { tab: null, live: true, render: renderCharts }, // your own charts, only you
  post: { tab: null, live: true, render: renderPost }, // one feed post with its comments open (from an alert)
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
  // A ball on the glass shows the connection: green connected, pulsing syncing, blue offline, red a problem.
  // Tap the glass for System info. Pages without a tab, and pages inside the Drinks tab, swap the glass for Back,
  // which keeps the ball.
  const said = statusText(s.kind).title;
  const ball = el("i", { class: `status-ball status-${s.kind}`, "aria-hidden": "true" });
  const back = !r.tab || r.sub ? el("button", { class: "icon-btn has-ball", type: "button", "aria-label": `Back. ${said}`,
    onclick: () => history.length > 1 ? history.back() : (location.hash = r.tab ? `#/${r.tab}` : "#/home") },
    el("span", { html: icon.back }), ball) : null;
  fill(head,
    back || el("a", { class: "brand-mark has-ball", href: "#/system", "aria-label": `${said}. System info` },
      el("span", { html: icon.glass }), ball),
    el("div", { class: "brand" },
      el("div", { class: "brand-name", text: (store.group && store.group.name) || APP_NAME })),
    bellButton(),
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
