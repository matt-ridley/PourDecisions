/* Service worker: lets the app open with no signal.
   - App files (this site): network first, so a new version shows up as soon as there is signal,
     falling back to the saved copy after a few seconds or when offline. Once a page has opened from the saved copy,
     the rest of its files come from saved copies straight away (they load in rounds, so the waits would add up).
     Requests with a query string (such as an update check) go to the network only and are never saved: saved under
     their own address, an old copy could be handed out as the real file with no signal (Lunker League 0.76.4).
   - Firebase SDK and fonts: saved copy first. Their URLs include a version, so they never change.
   Group data itself is not handled here; Firestore keeps its own offline copy. */
const SHELL = "pour-shell-v2"; // v1 matched saved files ignoring the query string; activating v2 deletes it
const STATIC = "pour-static-v1";
const SDK = "https://www.gstatic.com/firebasejs/12.19.0/";
const APP_FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/main.js", "js/config.js", "js/ui.js", "js/cloud.js", "js/gate.js", "js/profile.js", "js/admin.js", "js/theme.js",
  "js/units.js", "js/home.js", "js/drinks.js", "js/catalog.js",
  "js/logs.js", "js/logpage.js", "js/outbox.js", "js/photo.js", "js/moderation.js", "js/systempage.js", "js/ratings.js", "js/ratepage.js",
  "js/variants.js", "js/makepage.js", "js/feed.js", "js/feedpage.js", "js/alerts.js", "js/alertspage.js", "js/stats.js", "js/statspage.js", "js/crowns.js",
  "js/makeable.js", "js/makeablepage.js", "js/stock.js", "js/barpage.js", "js/tab.js", "js/tabpage.js", "js/nights.js", "js/nightpage.js",
  "js/catalog/styles.js", "js/catalog/drinks.js", "js/catalog/cocktails.js", "js/catalog/make.js",
  "js/catalog/beer.js", "js/catalog/whisky.js", "js/catalog/spirits.js", "js/catalog/wine.js", "js/catalog/more.js", "js/catalog/na.js",
  "js/catalog/ingredients.js", "js/catalog/about.js", "js/catalog/recipes-stirred.js", "js/catalog/recipes-sours.js", "js/catalog/recipes-long.js",
  "js/catalog/recipes-party.js", "js/catalog/recipes-sweet.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
const SDK_FILES = ["app", "auth", "firestore"].map(m => `${SDK}firebase-${m}.js`);
// Must match the fonts link in index.html (npm test checks). Saved when installing, with its Latin font files, so the
// first open with no signal has them too (otherwise they're only saved on a later open).
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Figtree:wght@400;500;600;700;800&display=swap";
const NETWORK_WAIT_MS = 3500;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    // All app files or none (then the install is tried again later): a set mixing old and new files can't start.
    const shell = await caches.open(SHELL);
    await shell.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })));
    const stat = await caches.open(STATIC);
    await Promise.allSettled([...SDK_FILES.map(u => stat.add(u)), saveFonts(stat)]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![SHELL, STATIC].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function saveFonts(stat) {
  const res = await fetch(FONTS_CSS);
  if (!res.ok) return;
  const css = await res.clone().text();
  await stat.put(FONTS_CSS, res);
  // The stylesheet lists each font in several alphabets ("/* latin */", "/* vietnamese */"…); the app only needs Latin.
  const urls = css.split("/* ").filter(b => b.startsWith("latin */")).flatMap(b => [...b.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]));
  await Promise.allSettled([...new Set(urls)].map(u => stat.add(u)));
}

const isStatic = url => url.href.startsWith(SDK) || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.search && req.mode !== "navigate") return; // network only, never saved (see the top)
    e.respondWith(networkFirst(e));
  }
  else if (isStatic(url)) e.respondWith(cacheFirst(req));
});

/* Pages (by client id) that opened from the saved copy. If the worker is stopped and loses this, files just wait as usual. */
const savedPages = new Set();

async function networkFirst(e) {
  const req = e.request, nav = req.mode === "navigate";
  const cache = await caches.open(SHELL);
  const key = nav ? "index.html" : req;
  // "no-cache" makes the browser check with the server every time (a quick "not modified" when nothing changed),
  // so a new deploy never mixes fresh and stale files from the browser's own HTTP cache.
  const fromNet = fetch(new Request(req.url, { cache: "no-cache", credentials: "same-origin" })).then(res => {
    if (res.ok && res.type === "basic") cache.put(key, res.clone());
    return res;
  });
  fromNet.catch(() => {}); // offline: handled below, so don't report it as unhandled
  const saved = () => cache.match(key);
  if (!nav && savedPages.has(e.clientId)) {
    const hit = await saved();
    if (hit) return hit; // the download above still finishes and is saved for next time
  }
  try {
    // Weak signal: give the network a few seconds, then use the saved copy (the download still finishes and is saved).
    return await Promise.race([fromNet, new Promise((_, no) => setTimeout(() => no(new Error("slow")), NETWORK_WAIT_MS))]);
  } catch {
    const hit = await saved();
    if (hit) {
      if (nav && e.resultingClientId) savedPages.add(e.resultingClientId);
      return hit;
    }
    return fromNet;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
}
