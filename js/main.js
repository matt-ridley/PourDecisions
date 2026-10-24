/* Boot, routing, header and bottom navigation. */
import { VERSION, APP_NAME } from "./config.js";
import { $, el, avatar, icon, initToast, closeSheet, sheetOpen, toast, fill } from "./ui.js";
import { cloud, store, subscribe, gate, syncStatus, initCloud, uid } from "./cloud.js";
import { renderGate } from "./gate.js";
import { renderProfile, renderSettings } from "./profile.js";
import { renderAdmin } from "./admin.js";
import { renderCatalogAdmin } from "./moderation.js";
import { renderHome } from "./home.js";
import { renderLog, renderLogDetail, renderLogEdit } from "./logpage.js";
import { drinksParent, renderDrinks, renderCatalogue, renderCategory, renderStyle, renderDrink, renderRecipe, renderIngredient, renderVariant, renderCompare } from "./drinks.js";
import { renderSystem, statusText } from "./systempage.js";
import { renderTop } from "./ratepage.js";
import { bellButton, renderAlerts } from "./alertspage.js";
import { renderPost } from "./feedpage.js";
import { renderBoard, renderPassport, renderVs, renderCharts } from "./statspage.js";
import { renderMake } from "./makepage.js";
import { renderMakeable } from "./makeablepage.js";
import { renderBar, renderBars } from "./barpage.js";
import { renderRun } from "./runpage.js";
import { renderTab, renderGenerous } from "./tabpage.js";
import { renderNights, renderNight, renderHost, renderPlan } from "./nightpage.js";
import { renderUs } from "./uspage.js";
import { isMyPlace } from "./myplace.js";
import { applyTheme } from "./theme.js";

/* Each route renders into <main>. `live` routes re-render when group data changes; the rest don't, so typing isn't lost.
   `tab` is the bottom-nav tab it belongs to; `sub` pages inside a tab show Back instead of the glass. */
const ROUTES = {
  home: { tab: "home", live: true, render: renderHome },
  // #/log asks again, home or search, then drills down; those pages redraw as data arrives, the form (#/log/<kind>/<id>) doesn't.
  log: { tab: "log", sub: a => !!a, live: a => !a || LOG_STEPS.includes(a), render: renderLog },
  l: { tab: null, live: true, render: renderLogDetail },
  edit: { tab: null, live: false, render: renderLogEdit },
  make: { tab: null, live: false, render: renderMake }, // not live: a friend's new log mustn't reset what you're making
  drinks: { tab: "drinks", live: true, render: renderDrinks },
  catalogue: { tab: "drinks", sub: true, live: false, render: renderCatalogue }, // search, filters, browse
  // Drink list pages redraw when admins fix or merge something (they have no boxes to type in).
  cat: { tab: "drinks", sub: true, live: true, render: renderCategory },
  style: { tab: "drinks", sub: true, live: true, render: renderStyle },
  drink: { tab: "drinks", sub: true, live: true, render: renderDrink },
  recipe: { tab: "drinks", sub: true, live: true, render: renderRecipe }, // live for its ratings
  ing: { tab: "drinks", sub: true, live: false, render: renderIngredient },
  v: { tab: "drinks", sub: true, live: true, render: renderVariant }, // a cocktail variant
  compare: { tab: "drinks", sub: true, live: true, render: renderCompare }, // two versions of a cocktail
  top: { tab: "drinks", sub: true, live: true, render: renderTop },
  // The Bar tab: your household (its own page, not a sub page), anyone else's, and what you can make from it.
  bar: { tab: "bar", sub: hh => !!hh && !mineHh(hh), live: true, render: renderBar }, // #/bar[/<household>/<fridge|bar|cooler>]
  makeable: { tab: "bar", sub: true, live: true, render: renderMakeable }, // what can I make: #/makeable[/<household or "list">]
  bars: { tab: "bar", sub: true, live: true, render: renderBars }, // every household
  run: { tab: "bar", sub: true, live: true, render: renderRun }, // the LCBO run: your household's shopping list
  // The Us tab: nights, the boards, the Tab and the group.
  us: { tab: "us", live: true, render: renderUs },
  tab: { tab: "us", sub: true, live: true, render: renderTab }, // the Tab: #/tab, #/tab/<uid>, #/tab/<a>/<b>
  generous: { tab: "us", sub: true, live: true, render: renderGenerous }, // Most Generous and Thirstiest: #/generous[/month]
  nights: { tab: "us", sub: true, live: true, render: renderNights }, // Drink Nights
  night: { tab: "us", sub: true, live: true, render: renderNight }, // a night: redraws as drinks come in
  host: { tab: "us", sub: true, live: false, render: renderHost }, // hosting a night: not live, so picks aren't lost
  plan: { tab: "us", sub: true, live: true, render: renderPlan }, // what a night's guests can make together
  board: { tab: "us", sub: true, live: true, render: renderBoard }, // the variety board
  passport: { tab: "us", sub: true, live: true, render: renderPassport }, // #/passport/<styles|countries>/<uid>
  vs: { tab: "us", sub: true, live: true, render: renderVs }, // head-to-head with a friend
  u: { tab: "us", sub: true, live: true, render: (main, id) => renderProfile(main, id) },
  me: { tab: null, live: true, render: main => renderProfile(main) },
  settings: { tab: null, live: false, render: renderSettings }, // your name, look, units, System info, admin, sign out
  charts: { tab: null, live: true, render: renderCharts }, // your own charts, only you
  admin: { tab: null, live: true, render: renderAdmin },
  catalog: { tab: null, live: true, render: renderCatalogAdmin },
  system: { tab: null, live: true, render: renderSystem },
  alerts: { tab: null, live: true, render: renderAlerts },
  post: { tab: null, live: true, render: renderPost }, // one feed post with its comments open (from an alert)
};

const LOG_STEPS = ["again", "home", "search"];
const mineHh = isMyPlace;

function parseRoute() {
  const [name, arg, arg2] = location.hash.replace(/^#\/?/, "").split("/");
  if (!ROUTES[name]) return { name: "home", ...ROUTES.home };
  const r = { name, arg, arg2, ...ROUTES[name] };
  if (typeof r.sub === "function") r.sub = r.sub(arg);
  if (typeof r.live === "function") r.live = r.live(arg);
  return r;
}

/* Where Back goes when there's no earlier page in the app (opened from an alert, a link or a reload): one level up. */
const PARENTS = {
  log: (a, b) => a === "home" && b ? "#/log/home" : "#/log",
  l: "#/me", edit: a => `#/l/${a}`, make: a => `#/recipe/${a}`,
  bar: "#/bars", makeable: "#/bar", bars: "#/bar", run: "#/bar",
  tab: a => a ? "#/tab" : "#/us", generous: "#/tab", nights: "#/us", night: "#/nights", host: "#/nights", plan: a => `#/night/${a}`,
  board: "#/us", passport: (a, b) => b && b !== uid() ? `#/u/${b}` : "#/me", vs: a => `#/u/${a}`, u: "#/us",
  me: "#/home", settings: "#/me", charts: "#/me", system: "#/settings", admin: "#/settings", catalog: "#/admin",
  alerts: "#/home", post: "#/alerts",
};
function parentOf(r) {
  if (r.tab === "drinks") return drinksParent(r.name, r.arg, r.arg2);
  const p = PARENTS[r.name];
  return typeof p === "function" ? p(r.arg, r.arg2) : p || `#/${r.tab || "home"}`;
}

/* Each history entry is stamped with how deep into the app it is (0 = the page the app opened on). Back goes to the
   earlier page when there is one, otherwise up a level in place, so it never leaves the app or lands somewhere odd. */
let depth = -1, goingUp = false;
function stampDepth() {
  const d = history.state && history.state.pdDepth;
  depth = typeof d === "number" ? d : goingUp ? Math.max(depth, 0) : depth + 1;
  goingUp = false;
  if (typeof d !== "number") history.replaceState({ ...(history.state || {}), pdDepth: depth }, "");
}
function goBack() {
  if (depth > 0) return history.back();
  goingUp = true;
  location.replace(parentOf(parseRoute()));
}

/* Redraws wait while someone is typing in a box on the page, so a friend's change can't wipe what's half typed. */
let pendingRender = false;
const typing = () => {
  const a = document.activeElement;
  // An empty search box has nothing to lose, so it doesn't hold up a redraw.
  if (a && a.type === "search" && !a.value) return false;
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
    onclick: goBack },
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
    item("drinks", "Drinks", icon.bottle),
    item("log", "Log", icon.plus, "log"),
    item("bar", "Bar", icon.bar),
    item("us", "Us", icon.us));
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
window.addEventListener("hashchange", () => { stampDepth(); closeSheet(); render(true); });
subscribe(() => render());
// Ask the phone not to clear saved data (changes waiting for signal live there) when storage runs low.
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
registerWorker();
stampDepth();
render(true);
initCloud();
document.documentElement.dataset.version = VERSION;

// Handy when testing locally: window.__pd in the console.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__pd = { cloud, store, render };
