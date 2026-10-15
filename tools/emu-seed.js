/* Local testing only: writes documents straight into the Firebase emulator, past the security rules, so a test group
   can have other members' drinks, ratings and comments. Load it from the browser console on a ?emulator=<name> page:
     const { seed } = await import("/tools/emu-seed.js"); await seed("members", "friend1", { displayName: "Dave", ... });
   It only talks to the emulator on 127.0.0.1, never the real project. */
const toValue = v => v === null ? { nullValue: null }
  : typeof v === "boolean" ? { booleanValue: v }
  : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : typeof v === "object" ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } }
  : { stringValue: String(v) };

export async function seed(path, id, data) {
  const project = "demo-" + (new URLSearchParams(location.search).get("emulator") || "pour").replace(/[^a-z0-9-]/gi, "").slice(0, 20);
  const url = `http://127.0.0.1:8180/v1/projects/${project}/databases/(default)/documents/${path}?documentId=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)])) }) });
  if (!res.ok) throw new Error(`${path}/${id}: ${res.status} ${await res.text()}`);
}
