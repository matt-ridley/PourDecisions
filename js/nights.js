/* Drink Nights: a host, a place, a start time, who's there and an optional end time. Pure functions (no screen or
   Firebase code), so they can be tested with node.
   - nights/{id}: { name, host, placeId?, hh? (the host's household, when it's at their place), start, end?, guests: [uid],
     by, at }. The host invites people; anyone else in the group can tap "I'm here".
   - Drinks attach by themselves: anything logged by someone who's there, from the start until the end. With no end time
     the night ends with its last drink (the Nightcap), once nobody has logged one for 6 hours.
   - The bring list (bring/{id}) is who's bringing what; drinks people bring go in their cooler. */
import { SAME_NIGHT_MS } from "./logs.js";

export const UPCOMING_MS = 12 * 3600 * 1000; // a night starting within 12 hours shows as Tonight

/* The drinks of a night: by people who are there, from the start. With an end time, until then; without one, until
   nobody has logged a drink for 6 hours (a gap that long ends it). Oldest first. */
export function nightLogs(night, logs) {
  const guests = new Set(night.guests || []);
  const mine = logs.filter(l => guests.has(l.uid) && l.at >= night.start && (night.end == null || l.at <= night.end))
    .sort((a, b) => a.at - b.at);
  if (night.end != null) return mine;
  const out = [];
  let prev = night.start;
  for (const l of mine) { if (l.at - prev > SAME_NIGHT_MS) break; out.push(l); prev = l.at; }
  return out;
}

/* Where a night is: "upcoming" (not started), "live", or "over" (past its end time, or 6 hours after its last drink,
   or 6 hours after it started with nothing logged). `ends` is when it ended (or will by itself, if nothing more is logged). */
export function nightStatus(night, logs, now = Date.now()) {
  if (now < night.start) return { state: "upcoming", ends: null };
  if (night.end != null) return { state: now > night.end ? "over" : "live", ends: night.end };
  const list = nightLogs(night, logs), last = list.length ? list[list.length - 1].at : night.start;
  return { state: now - last > SAME_NIGHT_MS ? "over" : "live", ends: last };
}

/* The Nightcap: the last drink of a night that's over. */
export function nightcap(night, logs, now = Date.now()) {
  if (nightStatus(night, logs, now).state !== "over") return null;
  const list = nightLogs(night, logs);
  return list.length ? list[list.length - 1] : null;
}

/* Nights to show as Tonight: live, or starting within 12 hours. Soonest first. */
export const tonight = (nights, logs, now = Date.now()) => nights
  .filter(n => { const s = nightStatus(n, logs, now).state; return s === "live" || (s === "upcoming" && n.start - now <= UPCOMING_MS); })
  .sort((a, b) => a.start - b.start);

/* The live night you're at (for a new drink's place), if any. */
export const myLiveNight = (nights, logs, me, now = Date.now()) =>
  nights.find(n => (n.guests || []).includes(me) && nightStatus(n, logs, now).state === "live") || null;

/* Drinks per person, most first: [{ uid, n }]. */
export function perPerson(list) {
  const by = new Map();
  for (const l of list) by.set(l.uid, (by.get(l.uid) || 0) + 1);
  return [...by].map(([uid, n]) => ({ uid, n })).sort((a, b) => b.n - a.n);
}

/* ---------- Group rounds ---------- */

/* Drinks to offer for a round: what's been had tonight, most first (ties: most recent). [{ kind, drinkId, n }] */
export function roundPicks(list) {
  const by = new Map();
  list.forEach((l, k) => {
    if (l.kind !== "drink") return;
    const p = by.get(l.drinkId) || { kind: l.kind, drinkId: l.drinkId, n: 0, last: 0 };
    p.n++; p.last = k; by.set(l.drinkId, p);
  });
  return [...by.values()].sort((a, b) => b.n - a.n || b.last - a.last).map(({ last, ...p }) => p);
}

/* ---------- The bring list ---------- */
/* bring/{id}: { night, by (who's bringing it), text, n? (how many), arrived?, addedBy, at }. A plan, ticked off when it
   arrives: drinks people bring go in their cooler, so handing them out uses the cooler and the Tab. */

/* A night's bring list: grouped by who's bringing, in the order people joined the list, oldest item first. */
export function bringFor(bring, nightId) {
  const items = bring.filter(b => b.night === nightId).sort((a, b) => a.at - b.at), order = [];
  for (const b of items) if (!order.includes(b.by)) order.push(b.by);
  return order.map(by => ({ by, items: items.filter(b => b.by === by) }));
}

/* ---------- Recaps ---------- */

/* What happened at a night: totals, who had what, the top drink, bottles killed, what was poured from the bar and taken
   out of fridges and coolers, the most generous, the first to tap out and the Nightcap. Volume per person stays on the
   night's own page (the feed shows the night as a whole). */
export function nightRecap(night, logs, now = Date.now()) {
  const list = nightLogs(night, logs), people = perPerson(list);
  const count = (key, add) => { const m = new Map(); for (const l of list) { const k = key(l); if (k) m.set(k, (m.get(k) || 0) + add(l)); } return m; };
  const [topKey, topN] = [...count(l => `${l.kind}|${l.drinkId}`, () => 1)].sort((a, b) => b[1] - a[1])[0] || [];
  const top = topN >= 2 ? { kind: topKey.split("|")[0], drinkId: topKey.split("|")[1], n: topN } : null;
  const killed = list.flatMap(l => (l.killed || []).map(drinkId => ({ drinkId, by: l.madeBy || l.uid })));
  const poured = [...count(l => l.from && l.from.includes("~bar~") ? l.from : null, l => l.ml)].map(([stockId, ml]) => ({ stockId, item: stockId.split("~").pop(), ml }));
  const takenOut = [...count(l => l.from && !l.from.includes("~bar~") ? l.from : null, () => 1)].map(([stockId, n]) => ({ stockId, item: stockId.split("~").pop(), n }));
  const gifts = count(l => { const g = l.givenBy || l.madeBy; return g && g !== l.uid && !l.disputed ? g : null; }, () => 1);
  const [genUid, genN] = [...gifts].sort((a, b) => b[1] - a[1])[0] || [];
  const lastBy = new Map();
  for (const l of list) lastBy.set(l.uid, l.at);
  const [outUid, outAt] = people.length >= 2 ? [...lastBy].sort((a, b) => a[1] - b[1])[0] : [];
  const cap = nightcap(night, logs, now);
  return { total: list.length, people, top, killed, poured, takenOut,
    generous: genUid ? { uid: genUid, n: genN } : null,
    firstOut: outUid ? { uid: outUid, at: outAt } : null,
    nightcap: cap ? { uid: cap.uid, at: cap.at, logId: cap.id } : null };
}

/* Hosted nights that are over, for the feed: { type: "night", uid (host), at (the last drink, or the end), nightId,
   people (who drank), logs (newest first) }. Drinks kept off the feed are left out. */
export function nightItems(nights, logs, now = Date.now()) {
  return nights.map(n => {
    const st = nightStatus(n, logs, now), list = nightLogs(n, logs).filter(l => !l.offFeed);
    if (st.state !== "over" || !list.length) return null;
    return { type: "night", uid: n.host, at: n.end != null ? n.end : list[list.length - 1].at, nightId: n.id, name: n.name,
      people: [...new Set(list.map(l => l.uid))], logs: [...list].reverse() };
  }).filter(Boolean);
}

/* ---------- The morning after ---------- */
const NOON = 12;

/* The morning after a night you drank at: until noon the day after (a drink after midnight still counts as that night).
   Private: your drinks, standard drinks and what you gave and were given. stdOf(log) gives a log's standard drinks.
   Most recent night first: [{ night, logs, std, gave, got, until, at (when the night ended) }] */
export function mornings(nights, logs, me, stdOf, now = Date.now()) {
  const out = [];
  for (const n of nights) {
    const st = nightStatus(n, logs, now);
    if (st.state !== "over") continue;
    const list = nightLogs(n, logs), mine = list.filter(l => l.uid === me);
    if (!mine.length) continue;
    const last = list[list.length - 1].at, d = new Date(last - 5 * 3600000);
    const until = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, NOON).getTime();
    if (now >= until) continue;
    const giver = l => l.givenBy || l.madeBy;
    out.push({ night: n, logs: mine, std: Math.round(mine.reduce((t, l) => t + stdOf(l), 0) * 10) / 10,
      gave: list.filter(l => giver(l) === me && l.uid !== me && !l.disputed).length,
      got: mine.filter(l => giver(l) && giver(l) !== me && !l.disputed).length,
      until, at: n.end != null ? n.end : last });
  }
  return out.sort((a, b) => b.at - a.at);
}
