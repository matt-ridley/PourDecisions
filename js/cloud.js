/* Firebase: sign-in, live listeners and writes.
   Everything is mirrored into `store`, and every change calls the subscribers so the screen re-renders.
   Firestore's persistent cache keeps a copy on the phone, so the app opens and accepts changes with no signal;
   queued writes are sent when the phone is back online. Times are stored as epoch milliseconds from the phone clock. */
import { FIREBASE_CONFIG, FIREBASE_SDK } from "./config.js";
import { setMemberDrinks, setFixes, setStyles } from "./catalog.js";
import { outboxPut, outboxDelete, outboxGet, outboxAll } from "./outbox.js";
import { dataBytes } from "./photo.js";
import { ratingId } from "./ratings.js";

/* Add ?emulator to a localhost address to use the local Firebase emulator (npm run emulators) instead of the real project. */
export const USE_EMULATOR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has("emulator");
// Different ports from Lunker League's emulator, so both can run at once.
export const EMULATOR_PORTS = { auth: 9199, firestore: 8180 };

export const cloud = {
  on: !!FIREBASE_CONFIG || USE_EMULATOR, api: null, db: null, auth: null,
  user: null, authKnown: false, failed: false, loadError: false,
  meta: {}, unsubs: [], memberUnsubs: [], retry: null,
  statusKind: "", statusSince: Date.now(), lastServerAt: 0,
};

export const store = {
  group: undefined,       // undefined = not loaded yet, null = no group yet (confirmed by the server)
  me: undefined,          // this user's member doc; null = not a member
  members: new Map(),     // uid -> member
  invite: undefined,      // current invite code (admins only)
  logs: [],               // every drink logged in the group
  places: [],             // the group's shared places
  drinks: [],             // drinks members added to the list
  fixes: [],              // admins' corrections to built-in drinks (and built-in drinks merged into others)
  styles: [],             // admins' new and renamed styles
  ratings: [],            // one per person per drink: stars, flavours and a review (see ratings.js)
  outbox: [],             // this phone's logs the group doesn't have yet (see outbox.js)
};

const subs = new Set();
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
let emitQueued = false;
export function emit() {
  if (emitQueued) return;
  emitQueued = true;
  queueMicrotask(() => { emitQueued = false; subs.forEach(fn => fn()); });
}

export const uid = () => cloud.user && cloud.user.uid;
export const isAdmin = () => !!(store.group && uid() && (store.group.admins || []).includes(uid()));
export const isOwner = () => !!(store.group && uid() && store.group.ownerUid === uid());
export const memberName = id => (store.members.get(id) || {}).displayName || "Former member";

/* Which screen the app should show before the main tabs. */
export function gate() {
  if (!cloud.on) return "setup";
  if (cloud.loadError) return "load-error";
  if (!cloud.authKnown) return "loading";
  if (!cloud.user) return "signed-out";
  if (store.group === undefined || store.me === undefined) return navigator.onLine ? "loading" : "offline-unknown";
  if (store.group === null) return "claim";
  if (store.me === null) return "join";
  if (store.me.suspended) return "suspended";
  return "in";
}

/* ---------- Sync status ---------- */
/* What the dot on the glass shows: live (connected), busy (syncing), offline, bad (a sync problem) or off.
   `since` is when it last changed; `pending` = changes on this phone the group doesn't have yet. */
export function syncStatus() {
  const s = currentStatus();
  if (s.kind !== cloud.statusKind) { cloud.statusKind = s.kind; cloud.statusSince = Date.now(); }
  return { ...s, since: cloud.statusSince };
}
function currentStatus() {
  if (!cloud.on || !cloud.user) return { kind: "off", label: "" };
  const m = Object.values(cloud.meta);
  const pending = m.some(x => x.hasPendingWrites);
  if (cloud.failed) return { kind: "bad", label: "Sync problem", pending };
  if (!navigator.onLine || m.some(x => x.fromCache)) return { kind: "offline", label: pending ? "Offline · changes waiting" : "Offline", pending };
  if (pending) return { kind: "busy", label: "Syncing", pending };
  return { kind: "live", label: "Connected", pending };
}
window.addEventListener("online", emit);
window.addEventListener("offline", emit);

/* ---------- Listeners ---------- */
const OPTS = { includeMetadataChanges: true };
const seen = (key, snap) => {
  cloud.meta[key] = snap.metadata; cloud.failed = false;
  if (!snap.metadata.fromCache) cloud.lastServerAt = Date.now();
};

function startListeners() {
  const { onSnapshot, doc } = cloud.api;
  stopListeners();
  cloud.unsubs = [
    onSnapshot(doc(cloud.db, "config", "group"), OPTS, snap => {
      seen("group", snap);
      // A missing doc read from the phone's cache doesn't prove there is no group yet; wait for the server.
      if (!snap.exists() && snap.metadata.fromCache) { if (store.group === undefined) emit(); return; }
      store.group = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      refreshMemberListeners();
      emit();
    }, syncError),
    onSnapshot(doc(cloud.db, "members", uid()), OPTS, snap => {
      seen("me", snap);
      if (!snap.exists() && snap.metadata.fromCache) { if (store.me === undefined) emit(); return; }
      // A join this phone just sent isn't real until the server accepts the invite code.
      if (snap.exists() && snap.metadata.hasPendingWrites && !store.me) return;
      store.me = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      refreshMemberListeners();
      emit();
    }, syncError),
  ];
}

/* Collections only members can read, started once this user is a member (and stopped if that changes). */
let memberKey = "";
function refreshMemberListeners() {
  const member = !!(store.me && !store.me.suspended);
  const key = member ? (isAdmin() ? "admin" : "member") : "";
  if (key === memberKey) return;
  memberKey = key;
  cloud.memberUnsubs.forEach(u => u());
  cloud.memberUnsubs = [];
  for (const k of Object.keys(cloud.meta)) if (k !== "group" && k !== "me") delete cloud.meta[k];
  store.members = new Map(); store.invite = undefined; store.logs = []; store.places = []; store.drinks = []; setMemberDrinks([]);
  store.fixes = []; store.styles = []; store.ratings = []; setFixes([]); setStyles([]);
  if (!member) return;
  const { onSnapshot, collection, doc } = cloud.api;
  cloud.memberUnsubs.push(onSnapshot(collection(cloud.db, "members"), OPTS, snap => {
    seen("members", snap);
    store.members = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    emit();
  }, syncError));
  const list = (name, fn) => cloud.memberUnsubs.push(onSnapshot(collection(cloud.db, name), OPTS, snap => {
    seen(name, snap);
    fn(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    emit();
  }, syncError));
  list("logs", l => { store.logs = l; });
  list("places", l => { store.places = l; });
  list("drinks", l => { store.drinks = l; setMemberDrinks(l); });
  list("fixes", l => { store.fixes = l; setFixes(l); });
  list("styles", l => { store.styles = l; setStyles(l); });
  list("ratings", l => { store.ratings = l; });
  flushOutbox();
  if (key === "admin") cloud.memberUnsubs.push(onSnapshot(doc(cloud.db, "config", "invite"), OPTS, snap => {
    seen("invite", snap);
    store.invite = snap.exists() ? snap.data().code : null;
    emit();
  }, syncError));
}

function stopListeners() {
  cloud.unsubs.forEach(u => u());
  cloud.memberUnsubs.forEach(u => u());
  cloud.unsubs = []; cloud.memberUnsubs = []; memberKey = "";
  cloud.meta = {};
  store.group = undefined; store.me = undefined; store.members = new Map(); store.invite = undefined;
  store.logs = []; store.places = []; store.drinks = []; setMemberDrinks([]);
  store.fixes = []; store.styles = []; store.ratings = []; setFixes([]); setStyles([]);
}

function syncError(e) {
  console.warn("Sync error", e);
  cloud.failed = true;
  emit();
  // A refused listener stops for good, so reconnect shortly.
  clearTimeout(cloud.retry);
  cloud.retry = setTimeout(() => { if (cloud.user) startListeners(); }, 10000);
}

/* ---------- Start up ---------- */
export async function initCloud() {
  if (!cloud.on) return emit();
  try {
    const [app, auth, fs] = await Promise.all(["app", "auth", "firestore"].map(m => import(`${FIREBASE_SDK}firebase-${m}.js`)));
    cloud.api = { ...auth, ...fs };
    // ?emulator uses the "demo-pour" project; ?emulator=name uses "demo-name", so two test setups can share one emulator.
    const emuProject = "demo-" + (new URLSearchParams(location.search).get("emulator") || "pour").replace(/[^a-z0-9-]/gi, "").slice(0, 20);
    const fbApp = app.initializeApp(USE_EMULATOR ? { ...(FIREBASE_CONFIG || { apiKey: "demo-key" }), projectId: emuProject } : FIREBASE_CONFIG);
    cloud.auth = auth.getAuth(fbApp);
    if (USE_EMULATOR) {
      // Local testing only: pretend accounts and data in the Firebase emulator, never the real group.
      cloud.db = fs.initializeFirestore(fbApp, { localCache: fs.memoryLocalCache() });
      auth.connectAuthEmulator(cloud.auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
      fs.connectFirestoreEmulator(cloud.db, "127.0.0.1", EMULATOR_PORTS.firestore);
    } else {
      cloud.db = fs.initializeFirestore(fbApp, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager(), cacheSizeBytes: 200 * 1024 * 1024 }),
      });
    }
  } catch (e) {
    console.warn("Firebase didn't load", e);
    cloud.loadError = true;
    return emit();
  }
  cloud.api.onAuthStateChanged(cloud.auth, user => {
    cloud.user = user; cloud.authKnown = true;
    if (user) startListeners(); else stopListeners();
    emit();
  });
}

/* ---------- Accounts ---------- */
const AUTH_MSG = {
  "auth/network-request-failed": "No internet connection. Signing in needs signal the first time.",
  "auth/too-many-requests": "Too many tries. Wait a few minutes and try again.",
  "auth/invalid-credential": "That email or password isn't right.",
  "auth/wrong-password": "That email or password isn't right.",
  "auth/user-not-found": "That email or password isn't right.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/email-already-in-use": "There is already an account with that email. Sign in instead.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/missing-password": "Enter a password.",
};
export const authMessage = e => AUTH_MSG[e && e.code] || "Something went wrong. Try again.";

export const signIn = (email, pass) => cloud.api.signInWithEmailAndPassword(cloud.auth, email, pass);
export const signUp = (email, pass) => cloud.api.createUserWithEmailAndPassword(cloud.auth, email, pass);
export const resetPassword = email => cloud.api.sendPasswordResetEmail(cloud.auth, email);
export const signOut = () => cloud.api.signOut(cloud.auth);

const ref = (...path) => cloud.api.doc(cloud.db, ...path);
const cleanName = s => String(s || "").trim().replace(/\s+/g, " ").slice(0, 40);
export const cleanCode = s => String(s || "").trim().toUpperCase().replace(/\s+/g, "");

/* First run: whoever creates the group owns it. The rules only allow this while config/group doesn't exist. */
export async function claimGroup({ groupName, inviteCode, displayName }) {
  const me = uid(), now = Date.now();
  const b = cloud.api.writeBatch(cloud.db);
  b.set(ref("config", "group"), { name: cleanName(groupName) || "Pour Decisions", ownerUid: me, admins: [me], createdAt: now });
  b.set(ref("config", "invite"), { code: cleanCode(inviteCode) });
  b.set(ref("members", me), { displayName: cleanName(displayName), joinedAt: now, suspended: false });
  await b.commit();
}

/* Joining: the rules check the code against config/invite. The code is then removed from the member doc. */
export async function joinGroup({ inviteCode, displayName }) {
  const r = ref("members", uid());
  await cloud.api.setDoc(r, { displayName: cleanName(displayName), joinedAt: Date.now(), suspended: false, invite: cleanCode(inviteCode) });
  await cloud.api.updateDoc(r, { invite: cloud.api.deleteField() });
}

/* Ordinary edits don't wait for the server, so they work offline; errors surface through the sync status. */
function write(p) { p.catch(syncError); }

export function updateMe(fields) {
  const f = { ...fields };
  if ("displayName" in f) f.displayName = cleanName(f.displayName);
  if ("hometown" in f) f.hometown = String(f.hometown || "").trim().slice(0, 60);
  if ("favourite" in f) f.favourite = String(f.favourite || "").trim().slice(0, 60);
  write(cloud.api.updateDoc(ref("members", uid()), f));
}

/* ---------- Admin ---------- */
export const setGroupName = name => write(cloud.api.updateDoc(ref("config", "group"), { name: cleanName(name) || "Pour Decisions" }));
export const setInviteCode = code => write(cloud.api.setDoc(ref("config", "invite"), { code: cleanCode(code) }));
export const setSuspended = (id, suspended) => write(cloud.api.updateDoc(ref("members", id), { suspended }));
export const removeMember = id => write(cloud.api.deleteDoc(ref("members", id)));
export function setAdmin(id, on) {
  const { arrayUnion, arrayRemove } = cloud.api;
  write(cloud.api.updateDoc(ref("config", "group"), { admins: on ? arrayUnion(id) : arrayRemove(id) }));
}

/* A readable random code like NEGRONI-4821. */
const CODE_WORDS = ["PILSNER", "STOUT", "PORTER", "LAGER", "IPA", "RYE", "BOURBON", "DRAM", "NEGRONI", "CAESAR", "MOJITO", "SPRITZ", "PINT", "CHEERS"];
export function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(2));
  return `${CODE_WORDS[n[0] % CODE_WORDS.length]}-${1000 + (n[1] % 9000)}`;
}

/* ---------- Logging drinks ---------- */
const newId = name => cloud.api.doc(cloud.api.collection(cloud.db, name)).id;
const clip = (v, n) => String(v || "").trim().slice(0, n);
const OPTIONAL = ["rating", "notes", "tags", "placeId"];

/* The fields a log may have. Empty optional fields are left out rather than saved blank. */
function cleanLog(f) {
  const log = { kind: f.kind, drinkId: f.drinkId, title: clip(f.title, 120), style: clip(f.style, 40), size: clip(f.size, 20),
    ml: Math.round(f.ml), abv: Math.round(Number(f.abv) * 10) / 10, at: Math.round(f.at) };
  if (f.rating) log.rating = f.rating;
  const notes = clip(f.notes, 500);
  if (notes) log.notes = notes;
  if (f.tags && f.tags.length) log.tags = f.tags.slice(0, 5);
  if (f.placeId) log.placeId = f.placeId;
  return log;
}
const pic = (src, at) => ({ uid: uid(), src, at, bytes: dataBytes(src) });

async function refreshOutbox() { store.outbox = await outboxAll(); emit(); }

/* Sends one outbox entry. When the group has it, it leaves the outbox; a refusal marks it failed so the app can say so. */
function sendEntry(e) {
  const b = cloud.api.writeBatch(cloud.db);
  b.set(ref("logs", e.id), e.log);
  if (e.thumb) {
    b.set(ref("thumbs", e.id), pic(e.thumb, e.log.at));
    b.set(ref("photos", e.id), pic(e.photo, e.log.at));
  }
  return b.commit().then(async () => { await outboxDelete(e.id); refreshOutbox(); }, async err => {
    console.warn("Log refused", err);
    await outboxPut({ ...e, state: "failed", error: err.code || String(err) });
    refreshOutbox();
  });
}

/* A new log. Saved to the outbox first, then sent; works offline (Firestore sends it when there's signal).
   pics: { photo, thumb } data URLs, or null. Returns the new log's id straight away. */
export function saveLog(fields, pics = null) {
  const id = newId("logs"), now = Date.now();
  const log = { ...cleanLog(fields), uid: uid(), createdAt: now, hasPhoto: !!pics };
  const entry = { id, log, thumb: pics && pics.thumb, photo: pics && pics.photo, state: "sending", savedAt: now };
  outboxPut(entry).then(refreshOutbox).then(() => sendEntry(entry));
  return id;
}

/* Changes to a log. pics: undefined = leave the photo, null = remove it, { photo, thumb } = replace it. */
export async function updateLog(id, fields, pics) {
  const old = store.logs.find(l => l.id === id);
  if (!old) return;
  const log = cleanLog({ ...old, ...fields });
  const upd = { ...log, editedAt: Date.now() };
  // Optional fields that were cleared are deleted, not left with their old values.
  for (const k of OPTIONAL) if (!(k in log) && k in old) upd[k] = cloud.api.deleteField();
  if (pics !== undefined) upd.hasPhoto = !!pics;
  const b = cloud.api.writeBatch(cloud.db);
  b.update(ref("logs", id), upd);
  if (pics) { b.set(ref("thumbs", id), pic(pics.thumb, log.at)); b.set(ref("photos", id), pic(pics.photo, log.at)); }
  else if (pics === null && old.hasPhoto) { b.delete(ref("thumbs", id)); b.delete(ref("photos", id)); }
  if (pics !== undefined) { thumbCache.delete(id); photoCache.delete(id); }
  // Still waiting in the outbox? Keep its copy up to date, so a resend can't bring back the old version.
  const waiting = await outboxGet(id);
  if (waiting) {
    const merged = { ...waiting.log, ...log, hasPhoto: pics === undefined ? waiting.log.hasPhoto : !!pics };
    for (const k of OPTIONAL) if (!(k in log)) delete merged[k];
    await outboxPut({ ...waiting, log: merged, ...(pics !== undefined ? { thumb: pics && pics.thumb, photo: pics && pics.photo } : {}) });
  }
  write(b.commit());
}

/* Deletes a log and its photos: your own, or anyone's for an admin. */
export async function deleteLog(id) {
  const old = store.logs.find(l => l.id === id);
  const b = cloud.api.writeBatch(cloud.db);
  b.delete(ref("logs", id));
  if (!old || old.hasPhoto) { b.delete(ref("thumbs", id)); b.delete(ref("photos", id)); }
  await outboxDelete(id);
  refreshOutbox();
  write(b.commit());
}

/* On start-up and when signal returns: anything still in the outbox is checked against the server and sent again
   if the group doesn't have it. Sending the same log twice just saves it again under the same id. */
let flushing = false;
export async function flushOutbox() {
  if (flushing || !cloud.api || !uid()) return;
  flushing = true;
  try {
    const entries = await outboxAll();
    store.outbox = entries; emit();
    for (const e of entries) {
      if (e.state === "failed" || e.log.uid !== uid()) continue;
      try {
        const snap = await cloud.api.getDocFromServer(ref("logs", e.id));
        if (snap.exists()) { await outboxDelete(e.id); continue; }
      } catch { continue; } // no signal: Firestore still has it queued; check again later
      sendEntry(e);
    }
    refreshOutbox();
  } finally { flushing = false; }
}
window.addEventListener("online", () => setTimeout(flushOutbox, 2000));

export async function retryLog(id) {
  const e = await outboxGet(id);
  if (!e) return;
  const entry = { ...e, state: "sending", error: null };
  await outboxPut(entry);
  refreshOutbox();
  sendEntry(entry);
}
export async function discardLog(id) { await outboxDelete(id); refreshOutbox(); }

/* ---------- Ratings: one per person per drink ---------- */
/* Rating a drink, or changing your rating. Works offline. `oldId`: your earlier rating's document, if it was saved
   under a duplicate that has since been merged into this drink (it's replaced by this one). */
export function saveRating(item, f, oldId = null) {
  const id = ratingId(uid(), item.kind, item.id);
  if (oldId && oldId !== id) deleteRating(oldId);
  const r = { uid: uid(), kind: item.kind, drinkId: item.id, title: clip(item.title, 120), rating: f.rating, at: Date.now() };
  if (f.tags && f.tags.length) r.tags = f.tags.slice(0, 5);
  const review = clip(f.review, 500);
  if (review) r.review = review;
  write(cloud.api.setDoc(ref("ratings", id), r));
  // Show it straight away, before the listener catches up.
  store.ratings = [...store.ratings.filter(x => x.id !== id), { id, ...r }];
  emit();
}
export function deleteRating(id) {
  write(cloud.api.deleteDoc(ref("ratings", id)));
  store.ratings = store.ratings.filter(x => x.id !== id);
  emit();
}
/* Admins: take down someone's review text. Their stars and flavours stay. */
export const removeReview = id => write(cloud.api.updateDoc(ref("ratings", id), { review: cloud.api.deleteField() }));

/* ---------- Photos: loaded only when shown ---------- */
const thumbCache = new Map(), photoCache = new Map();
function loadPic(name, cache, id) {
  if (!cache.has(id)) cache.set(id, (async () => {
    const waiting = await outboxGet(id); // not sent yet: show the copy on this phone
    if (waiting && waiting.thumb) return name === "thumbs" ? waiting.thumb : waiting.photo;
    const snap = await cloud.api.getDoc(ref(name, id));
    return snap.exists() ? snap.data().src : null;
  })().catch(() => { cache.delete(id); return null; }));
  return cache.get(id);
}
export const loadThumb = id => loadPic("thumbs", thumbCache, id);
export const loadPhoto = id => loadPic("photos", photoCache, id);

/* ---------- Places and member drinks ---------- */
/* A shared place. Returns its id straight away (works offline). */
export function addPlace(name) {
  const id = newId("places");
  const p = { name: clip(name, 60), by: uid(), at: Date.now() };
  write(cloud.api.setDoc(ref("places", id), p));
  store.places = [...store.places, { id, ...p }];
  return id;
}

/* A drink a member adds to the shared list. Admins check new drinks later (catalogue moderation). */
export function addDrink(f) {
  const id = newId("drinks");
  const d = { brand: clip(f.brand, 60), name: clip(f.name, 80), style: f.style, abv: Math.round(Number(f.abv) * 10) / 10, by: uid(), at: Date.now() };
  const variant = clip(f.variant, 40), origin = clip(f.origin, 10);
  if (variant) d.variant = variant;
  if (origin) d.origin = origin;
  write(cloud.api.setDoc(ref("drinks", id), d));
  // Show it in the list straight away, before the listener catches up.
  store.drinks = [...store.drinks, { id, ...d }];
  setMemberDrinks(store.drinks);
  return id;
}

/* ---------- Catalogue moderation (admins) ---------- */
const stamp = () => ({ by: uid(), at: Date.now() });
const cleanAbv = v => Math.round(Number(v) * 10) / 10;

/* A new member drink looks right. */
export const checkDrink = id => write(cloud.api.updateDoc(ref("drinks", id), { checked: true }));

/* Fixing a drink's details. A member's drink is changed in place; a built-in drink gets a correction that the app
   lays over the built-in list. `fix` holds only the fields that differ from the built-in drink (empty = no fix). */
export function updateMemberDrink(id, f) {
  const del = cloud.api.deleteField();
  const d = { brand: clip(f.brand, 60), name: clip(f.name, 80), style: f.style, abv: cleanAbv(f.abv), checked: true,
    variant: clip(f.variant, 40) || del, origin: clip(f.origin, 10) || del, ing: f.ing && f.ing.length ? f.ing.slice(0, 10) : del };
  write(cloud.api.updateDoc(ref("drinks", id), d));
}
export function saveFix(id, fix) {
  const old = store.fixes.find(x => x.id === id);
  const keep = old && old.mergedInto ? { mergedInto: old.mergedInto } : {};
  if (!Object.keys(fix).length && !keep.mergedInto) return write(cloud.api.deleteDoc(ref("fixes", id)));
  write(cloud.api.setDoc(ref("fixes", id), { ...fix, ...keep, ...stamp() }));
}

/* Merging a duplicate into the drink to keep, and undoing it. */
export function mergeDrink(item, intoId) {
  if (item.member) return write(cloud.api.updateDoc(ref("drinks", item.id), { mergedInto: intoId, checked: true }));
  write(cloud.api.setDoc(ref("fixes", item.id), { mergedInto: intoId, ...stamp() }, { merge: true }));
}
export function unmergeDrink(item) {
  if (item.member) return write(cloud.api.updateDoc(ref("drinks", item.id), { mergedInto: cloud.api.deleteField() }));
  const f = store.fixes.find(x => x.id === item.id) || {};
  const rest = Object.keys(f).filter(k => !["id", "mergedInto", "by", "at"].includes(k));
  write(rest.length ? cloud.api.updateDoc(ref("fixes", item.id), { mergedInto: cloud.api.deleteField() }) : cloud.api.deleteDoc(ref("fixes", item.id)));
}
/* Only for a member drink nobody has logged; otherwise merge it. */
export const deleteMemberDrink = id => write(cloud.api.deleteDoc(ref("drinks", id)));

/* A new style ({ name, family: "cat/fam", about }) or a built-in one's new name or description ({ name, about }). */
export function saveStyle(id, f) {
  const d = { ...stamp() };
  if (clip(f.name, 40)) d.name = clip(f.name, 40);
  if (clip(f.about, 200)) d.about = clip(f.about, 200);
  if (f.family) d.family = f.family;
  write(cloud.api.setDoc(ref("styles", id), d));
}
export const resetStyle = id => write(cloud.api.deleteDoc(ref("styles", id)));

/* Places: rename, or merge a duplicate into the one to keep (and undo). */
export const renamePlace = (id, name) => write(cloud.api.updateDoc(ref("places", id), { name: clip(name, 60) }));
export const mergePlace = (id, intoId) => write(cloud.api.updateDoc(ref("places", id), { mergedInto: intoId }));
export const unmergePlace = id => write(cloud.api.updateDoc(ref("places", id), { mergedInto: cloud.api.deleteField() }));
