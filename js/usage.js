/* How much of Firebase's free plan (Spark) the group uses, worked out on the phone from what it already has, so the
   limits are seen coming. Estimates: Firestore's own counts aren't readable from the app.
   Pure functions (no screen or Firebase code), so they can be tested with node.
   - Stored: every document every phone loads (sized the way Firestore counts), plus photos, which live in their own
     documents and aren't loaded, so they're estimated from how many logs have one.
   - Each app open: with no copy on the phone (a new phone, or cleared data) every listened-to document is read and
     downloaded once. Opens after that mostly read only what changed, so this is the worst case. */

export const FREE = { stored: 1024 ** 3, readsPerDay: 50000, writesPerDay: 20000, downloadPerMonth: 10 * 1024 ** 3 };

// A log's photo: the full copy (about 150 to 250 KB as a JPEG) plus the small one (20 to 30 KB), stored as base64 text,
// which is a third bigger. See photo.js.
export const PHOTO_BYTES = Math.round((200 + 25) * 1024 * 4 / 3);

/* A value's size as Firestore counts it: strings are their UTF-8 length + 1, numbers 8, booleans and null 1, maps and
   arrays the sum of what's in them (map keys counted like strings). */
export function valueBytes(v) {
  if (v == null || typeof v === "boolean") return 1;
  if (typeof v === "number") return 8;
  if (typeof v === "string") return new TextEncoder().encode(v).length + 1;
  if (Array.isArray(v)) return v.reduce((t, x) => t + valueBytes(x), 0);
  if (typeof v === "object") return Object.entries(v).reduce((t, [k, x]) => t + valueBytes(k) + valueBytes(x), 0);
  return 8;
}

/* A document's size: its name (collection and id) + 16, its fields, + 32. `id` isn't a field (the app adds it). */
export const docBytes = (collection, doc) => {
  const { id = "", ...fields } = doc;
  return valueBytes(collection) + valueBytes(String(id)) + 16 + valueBytes(fields) + 32;
};

/* collections: { name: [docs] } of everything the app listens to. photos: how many logs (and bars) have a photo.
   -> { docs, stored, perOpen: { reads, bytes }, opensPerDay, opensPerMonth, avgLog, logsLeft, pct: { stored } } */
export function usage(collections, photos = 0) {
  let docs = 0, bytes = 0;
  for (const [name, list] of Object.entries(collections)) for (const d of list) { docs++; bytes += docBytes(name, d); }
  const stored = bytes + photos * PHOTO_BYTES;
  const logs = collections.logs || [];
  const logBytes = logs.length ? logs.reduce((t, l) => t + docBytes("logs", l), 0) / logs.length : 300;
  const photoShare = logs.length ? logs.filter(l => l.hasPhoto).length / logs.length : 0;
  const avgLog = Math.round(logBytes + photoShare * PHOTO_BYTES);
  return {
    docs, stored,
    perOpen: { reads: docs, bytes },
    opensPerDay: docs ? Math.floor(FREE.readsPerDay / docs) : Infinity,
    opensPerMonth: bytes ? Math.floor(FREE.downloadPerMonth / bytes) : Infinity,
    avgLog, logsLeft: Math.max(0, Math.floor((FREE.stored - stored) / avgLog)),
    pct: { stored: stored / FREE.stored },
  };
}
