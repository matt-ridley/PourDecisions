/* The outbox: every log this phone sends (with its photo) is also kept on the phone, in IndexedDB, until the group
   has it. Firestore already queues writes while offline, but if the server refuses one (a paused account, a rules
   problem) it quietly drops it. The outbox keeps a copy so the app can say so and offer to try again.
   Entries: { id, log, thumb, photo, state: "sending" | "failed", error, savedAt }. If IndexedDB isn't available
   (private browsing), every call quietly does nothing and logs still send as normal. */
const DB = "pour-outbox", STORE = "logs";
let opening = null;

function open() {
  if (!opening) opening = new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) return reject(new Error("no IndexedDB"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(e => { opening = null; throw e; });
  return opening;
}

async function run(mode, fn) {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Outbox unavailable", e);
    return undefined;
  }
}

export const outboxPut = entry => run("readwrite", s => s.put(entry));
export const outboxDelete = id => run("readwrite", s => s.delete(id));
export const outboxGet = id => run("readonly", s => s.get(id));
export const outboxAll = async () => (await run("readonly", s => s.getAll())) || [];
