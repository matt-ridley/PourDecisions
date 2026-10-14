/* Happy Hour / Last Call / Auto. Auto leaves the choice to the phone's light or dark setting. Stored per phone. */
const KEY = "pour-theme";
export const THEMES = [["auto", "Auto"], ["happy", "Happy Hour"], ["last", "Last Call"]];

export function getTheme() {
  try { return localStorage.getItem(KEY) || "auto"; } catch { return "auto"; }
}
export function setTheme(t) {
  try { localStorage.setItem(KEY, t); } catch {}
  applyTheme();
}
export function applyTheme() {
  const t = getTheme();
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const dark = t === "last" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#120D0B" : "#0A6E78");
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
