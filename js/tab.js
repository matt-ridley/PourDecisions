/* The Tab: who has given whom drinks. Every drink counts as 1, each pair of people has its own balance (never combined
   or passed on), and it's paid back in drinks. Worked out from the logs, so it costs no extra reads.
   Pure functions (no screen or Firebase code), so they can be tested with node.
   A drink is on the Tab when someone else gave it: givenBy (Give one, Who's it for?, or a friend's cooler: whoever
   loaded it) or madeBy (a cocktail made for someone). A drink the receiver marked "That's not right" (disputed) isn't. */

export const giverOf = l => l.givenBy || l.madeBy || null;

/* Every drink on the Tab: { log, from (giver), to (receiver) }. */
export const giftsIn = logs => logs.filter(l => { const g = giverOf(l); return g && g !== l.uid && !l.disputed; })
  .map(l => ({ log: l, from: giverOf(l), to: l.uid }));

/* Between a and b: how many a gave b, how many b gave a, and net (positive = b owes a that many). */
export function pair(logs, a, b) {
  let given = 0, received = 0;
  for (const g of giftsIn(logs)) {
    if (g.from === a && g.to === b) given++;
    else if (g.from === b && g.to === a) received++;
  }
  return { given, received, net: given - received };
}

/* Your balance with everyone you've given to or received from: biggest difference first, then most drinks. */
export function balancesFor(logs, me) {
  const by = new Map();
  for (const g of giftsIn(logs)) {
    const other = g.from === me ? g.to : g.to === me ? g.from : null;
    if (!other) continue;
    const b = by.get(other) || { id: other, given: 0, received: 0 };
    g.from === me ? b.given++ : b.received++;
    by.set(other, b);
  }
  return [...by.values()].map(b => ({ ...b, net: b.given - b.received }))
    .sort((x, y) => Math.abs(y.net) - Math.abs(x.net) || (y.given + y.received) - (x.given + x.received));
}

/* Every pair in the group that isn't even: { creditor, debtor, n } (debtor owes creditor n), biggest first. */
export function openTabs(logs) {
  const nets = new Map();
  for (const g of giftsIn(logs)) {
    const [a, b] = [g.from, g.to].sort(), k = `${a}|${b}`;
    nets.set(k, (nets.get(k) || 0) + (g.from === a ? 1 : -1));
  }
  return [...nets].filter(([, n]) => n).map(([k, n]) => { const [a, b] = k.split("|"); return n > 0 ? { creditor: a, debtor: b, n } : { creditor: b, debtor: a, n: -n }; })
    .sort((x, y) => y.n - x.n);
}

/* The drinks between a and b, either way, newest first, disputed ones included (marked) so the history is complete. */
export const historyOf = (logs, a, b) => logs.filter(l => { const g = giverOf(l); return g && g !== l.uid && ((g === a && l.uid === b) || (g === b && l.uid === a)); })
  .sort((x, y) => y.at - x.at);

/* Generosity since a time (0 = all time): each person's drinks given and received on the Tab. Most Generous: most given
   (ties: fewest received). Thirstiest: received the most more than they gave (ties: most received). */
export function generosity(logs, since = 0) {
  const by = new Map(), p = id => { if (!by.has(id)) by.set(id, { id, given: 0, received: 0 }); return by.get(id); };
  for (const g of giftsIn(logs)) if (g.log.at >= since) { p(g.from).given++; p(g.to).received++; }
  const all = [...by.values()];
  return {
    generous: all.filter(x => x.given > 0).sort((a, b) => b.given - a.given || a.received - b.received),
    thirstiest: all.map(x => ({ ...x, net: x.received - x.given })).filter(x => x.net > 0)
      .sort((a, b) => b.net - a.net || b.received - a.received),
  };
}

/* The start of this month, on the phone's clock. */
export const monthStart = (now = Date.now()) => { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
