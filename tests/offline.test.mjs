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
