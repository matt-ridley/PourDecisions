/* Your places: you can be in more than one household (home, the cottage), each with its own fridge, bar, cooler and
   people. The one you're using is remembered on this phone (localStorage pour-place). Screens that work from one place
   (From home, Make it, What can I make, the LCBO run, adding a drink) use it, with chips to switch when you have more
   than one. */
import { el } from "./ui.js";
import { store, uid } from "./cloud.js";
import { householdsOf } from "./stock.js";

const KEY = "pour-place";

export const myPlaces = () => householdsOf(store.households, uid());
export const isMyPlace = hh => !!hh && myPlaces().some(h => h.id === hh);

/* The place in use: the last one picked on this phone, else your first (A to Z). Null with none. */
export function myPlace() {
  const all = myPlaces();
  let want = null;
  try { want = localStorage.getItem(KEY); } catch {}
  return all.find(h => h.id === want) || all[0] || null;
}
export function setMyPlace(id) { try { localStorage.setItem(KEY, id); } catch {} }

/* Chips to switch place (it's remembered), or null with fewer than two places. onPick(h) redraws. */
export function placeSwitch(current, onPick) {
  const all = myPlaces();
  if (all.length < 2) return null;
  return el("div", { class: "chips", role: "group", "aria-label": "Which place" }, ...all.map(h =>
    el("button", { type: "button", class: "chip-btn", "aria-pressed": String(!!current && current.id === h.id),
      onclick: () => { setMyPlace(h.id); onPick(h); } }, `🏠 ${h.name}`)));
}

/* "Your fridge", or "The Cottage fridge" when you have more than one place. */
export const placeWord = (h, what) => myPlaces().length > 1 && h ? `${h.name} ${what}` : `Your ${what}`;
