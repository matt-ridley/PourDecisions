// Free-plan meters: sizing documents the way Firestore counts them, and what's left.
import { test } from "node:test";
import assert from "node:assert/strict";
import { valueBytes, docBytes, usage, FREE, PHOTO_BYTES } from "../js/usage.js";

test("values are sized the way Firestore counts them", () => {
  assert.equal(valueBytes("abc"), 4);
  assert.equal(valueBytes("é"), 3, "UTF-8 bytes");
  assert.equal(valueBytes(5), 8);
  assert.equal(valueBytes(true), 1);
  assert.equal(valueBytes(null), 1);
  assert.equal(valueBytes(["a", 1]), 2 + 8);
  assert.equal(valueBytes({ a: 1 }), 2 + 8);
});

test("a document is its name, fields and 32 bytes; the id isn't a field", () => {
  assert.equal(docBytes("logs", { id: "x1", ml: 355 }), 5 + 3 + 16 + (3 + 8) + 32);
});

test("usage: stored, per open, opens per day and month, and logs left (photos counted from logs that have one)", () => {
  const logs = Array.from({ length: 100 }, (_, k) => ({ id: `l${k}`, uid: "me", title: "Molson Canadian", ml: 355, hasPhoto: k < 10 }));
  const u = usage({ logs, members: [{ id: "me", displayName: "Me" }] }, 10);
  assert.equal(u.docs, 101);
  assert.equal(u.perOpen.reads, 101);
  assert.equal(u.opensPerDay, Math.floor(FREE.readsPerDay / 101));
  assert.ok(u.stored > 10 * PHOTO_BYTES && u.stored < 11 * PHOTO_BYTES);
  assert.ok(u.avgLog > PHOTO_BYTES / 10 && u.avgLog < PHOTO_BYTES / 10 + 300);
  assert.ok(u.logsLeft > 30000 && u.logsLeft < 50000);
  assert.equal(usage({}).opensPerDay, Infinity);
});
