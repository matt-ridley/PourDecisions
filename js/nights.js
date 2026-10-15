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
