// Every app file must be in the service worker's list, or the app breaks with no signal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("every js file is saved for offline use", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const files = readdirSync(new URL("../js", import.meta.url), { recursive: true })
    .map(f => "js/" + String(f).replace(/\\/g, "/")).filter(f => f.endsWith(".js"));
  for (const f of files) assert.ok(sw.includes(`"${f}"`), `${f} is missing from APP_FILES in sw.js`);
});

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("saved app files are matched by their exact address", () => {
  // Matching while ignoring the query string handed out an old file with no signal (Lunker League 0.76.4).
  assert.ok(!read("sw.js").includes("ignoreSearch"), "sw.js must not use ignoreSearch");
});

test("the fonts don't hold up the page, and the worker saves the same fonts", () => {
  const html = read("index.html");
  const link = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"([^>]*)>/);
  assert.ok(link, "fonts link not found in index.html");
  assert.match(link[2], /media="print" onload="this\.media='all'"/, "the fonts link must not block the page");
  const css = read("sw.js").match(/const FONTS_CSS = "([^"]+)"/);
  assert.ok(css, "FONTS_CSS not found in sw.js");
  assert.equal(css[1], link[1].replace(/&amp;/g, "&"), "FONTS_CSS in sw.js must match the fonts link in index.html");
});

test("the start-up safety net runs before the stylesheets", () => {
  const html = read("index.html");
  const net = html.indexOf("didn't start"), css = html.indexOf('rel="stylesheet"');
  assert.ok(net > 0 && net < css, "the safety-net script must come before the stylesheets");
});

test("the inline scripts in index.html parse (the start-up safety net must be able to run)", async () => {
  const { Script } = await import("node:vm");
  const scripts = [...read("index.html").matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length >= 1);
  for (const s of scripts) assert.doesNotThrow(() => new Script(s), s.slice(0, 80));
});
