/* Firebase: sign-in, live listeners and writes.
   Everything is mirrored into `store`, and every change calls the subscribers so the screen re-renders.
   Firestore's persistent cache keeps a copy on the phone, so the app opens and accepts changes with no signal;
   queued writes are sent when the phone is back online. Times are stored as epoch milliseconds from the phone clock. */
import { FIREBASE_CONFIG, FIREBASE_SDK } from "./config.js";

/* Add ?emulator to a localhost address to use the local Firebase emulator (npm run emulators) instead of the real project. */
export const USE_EMULATOR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has("emulator");
// Different ports from Lunker League's emulator, so both can run at once.
export const EMULATOR_PORTS = { auth: 9199, firestore: 8180 };

export const cloud = {
  on: !!FIREBASE_CONFIG || USE_EMULATOR, api: null, db: null, auth: null,
  user: null, authKnown: false, failed: false, loadError: false,
  meta: {}, unsubs: [], memberUnsubs: [], retry: null,
};

export const store = {
  group: undefined,       // undefined = not loaded yet, null = no group yet (confirmed by the server)
  me: undefined,          // this user's member doc; null = not a member
  members: new Map(),     // uid -> member
  invite: undefined,      // current invite code (admins only)
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
export function syncStatus() {
  if (!cloud.on || !cloud.user) return { kind: "off", label: "" };
  if (cloud.failed) return { kind: "bad", label: "Sync problem" };
  const m = Object.values(cloud.meta);
  const pending = m.some(x => x.hasPendingWrites);
  if (!navigator.onLine || m.some(x => x.fromCache)) return { kind: "offline", label: pending ? "Offline · changes waiting" : "Offline" };
  if (pending) return { kind: "busy", label: "Syncing" };
  return { kind: "live", label: "Live" };
}
window.addEventListener("online", emit);
window.addEventListener("offline", emit);

/* ---------- Listeners ---------- */
const OPTS = { includeMetadataChanges: true };
const seen = (key, snap) => { cloud.meta[key] = snap.metadata; cloud.failed = false; };

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
  store.members = new Map(); store.invite = undefined;
  if (!member) return;
  const { onSnapshot, collection, doc } = cloud.api;
  cloud.memberUnsubs.push(onSnapshot(collection(cloud.db, "members"), OPTS, snap => {
    seen("members", snap);
    store.members = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    emit();
  }, syncError));
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
