// Rules for drink logs, their photos, shared places and drinks members add.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, writeBatch, deleteField } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const log = (uid, extra = {}) => ({ uid, kind: "drink", drinkId: "molson-canadian", title: "Molson Canadian", style: "am-lager", size: "can",
  ml: 355, abv: 5, at: Date.now() - 60000, createdAt: Date.now(), hasPhoto: false, ...extra });
const jpeg = n => "data:image/jpeg;base64," + "A".repeat(n);
const pic = (uid, n = 1000) => ({ uid, src: jpeg(n), at: Date.now(), bytes: n });

async function seedLog(id, uid, extra) {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "logs", id), log(uid, extra)));
}

test("members can log a drink for themselves, with the optional extras", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "logs/a"), log("member")));
  await assertSucceeds(setDoc(doc(db, "logs/b"), log("member", { rating: 4.5, notes: "Crisp.", tags: ["crisp", "light"], placeId: "p1" })));
});

test("nobody can log for someone else, and outsiders can't log or read", async () => {
  await assertFails(setDoc(doc(as(env, "member"), "logs/a"), log("owner")));
  await assertFails(setDoc(doc(as(env, "stranger"), "logs/a"), log("stranger")));
  await seedLog("x", "member");
  await assertFails(getDoc(doc(as(env, "stranger"), "logs/x")));
  await assertSucceeds(getDocs(collection(as(env, "owner"), "logs")));
});

test("a log must be sensible: real rating, size, time and only known fields", async () => {
  const db = as(env, "member");
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { rating: 4.3 })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { rating: 6 })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { ml: 0 })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { at: Date.now() + 3600000 })), "not in the future");
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { at: 1000 })), "not before 2020");
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { tags: ["a", "b", "c", "d", "e", "f"] })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { notes: "x".repeat(501) })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { kind: "other" })));
  await assertFails(setDoc(doc(db, "logs/a"), log("member", { price: 8 })));
  await assertSucceeds(setDoc(doc(db, "logs/a"), log("member", { at: Date.now() - 400 * 86400000 })), "late logs are fine for now");
});

test("you can edit your own log (and clear extras), but not who or when it was created", async () => {
  await seedLog("a", "member", { rating: 3, notes: "ok" });
  const db = as(env, "member");
  await assertSucceeds(updateDoc(doc(db, "logs/a"), { rating: 4, notes: deleteField(), editedAt: Date.now() }));
  await assertFails(updateDoc(doc(db, "logs/a"), { uid: "owner" }));
  await assertFails(updateDoc(doc(db, "logs/a"), { createdAt: 5 }));
  await assertFails(updateDoc(doc(as(env, "owner"), "logs/a"), { rating: 1 }), "not even the owner edits someone else's");
});

test("you can delete your own log; admins can delete anyone's", async () => {
  await seedLog("a", "owner");
  await seedLog("b", "owner");
  await assertFails(deleteDoc(doc(as(env, "member"), "logs/a")));
  await assertSucceeds(deleteDoc(doc(as(env, "owner"), "logs/a")));
  await seedLog("c", "member");
  await assertSucceeds(deleteDoc(doc(as(env, "admin2"), "logs/c")));
});

test("a log and its photos save together, and only small JPEGs fit", async () => {
  const db = as(env, "member");
  const b = writeBatch(db);
  b.set(doc(db, "logs/a"), log("member", { hasPhoto: true }));
  b.set(doc(db, "thumbs/a"), pic("member", 30000));
  b.set(doc(db, "photos/a"), pic("member", 250000));
  await assertSucceeds(b.commit());
  await assertSucceeds(getDoc(doc(as(env, "owner"), "photos/a")));
  await assertFails(getDoc(doc(as(env, "stranger"), "thumbs/a")));
  await assertFails(setDoc(doc(db, "thumbs/b"), pic("member", 90000)), "thumb too big");
  await assertFails(setDoc(doc(db, "photos/b"), pic("member", 700000)), "photo too big");
  await assertFails(setDoc(doc(db, "thumbs/b"), { ...pic("member"), src: "data:text/html;base64,AAAA" }), "JPEG only");
  await assertFails(setDoc(doc(db, "thumbs/b"), pic("owner")), "not in someone else's name");
  await assertFails(setDoc(doc(as(env, "owner"), "thumbs/a"), pic("owner")), "can't replace someone else's photo");
});

test("a photo's thumbnail can be framed (focus), with whole numbers 0 to 100 only", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "logs/a"), log("member", { hasPhoto: true, focus: { x: 20, y: 100 } })));
  await assertSucceeds(updateDoc(doc(db, "logs/a"), { focus: { x: 0, y: 50 }, editedAt: Date.now() }));
  await assertSucceeds(updateDoc(doc(db, "logs/a"), { focus: deleteField(), editedAt: Date.now() }));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { focus: { x: 101, y: 50 } })));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { focus: { x: 20.5, y: 50 } })));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { focus: { x: 20 } })));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { focus: { x: 20, y: 50, z: 1 } })));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { focus: "middle" })));
});

test("deleting a log's photos: yours, or anyone's for an admin, and missing ones are fine", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "thumbs/a"), pic("member")));
  await assertSucceeds(deleteDoc(doc(as(env, "member"), "photos/missing")));
  await assertSucceeds(deleteDoc(doc(as(env, "admin2"), "thumbs/a")));
});

test("members add shared places; only admins rename or remove them", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "places/p1"), { name: "The Keg", by: "member", at: Date.now() }));
  await assertFails(setDoc(doc(db, "places/p2"), { name: "", by: "member", at: Date.now() }));
  await assertFails(setDoc(doc(db, "places/p2"), { name: "Pub", by: "owner", at: Date.now() }));
  await assertFails(updateDoc(doc(db, "places/p1"), { name: "The Keg Mansion" }));
  await assertSucceeds(updateDoc(doc(as(env, "admin2"), "places/p1"), { name: "The Keg Mansion" }));
  await assertFails(deleteDoc(doc(db, "places/p1")));
  await assertSucceeds(deleteDoc(doc(as(env, "owner"), "places/p1")));
});

test("members add drinks to the list; only admins fix or remove them", async () => {
  const d = { brand: "Backyard Brewing", name: "Patio Pils", style: "czech-pils", abv: 4.8, origin: "CA-ON", by: "member", at: Date.now() };
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "drinks/d1"), d));
  await assertFails(setDoc(doc(db, "drinks/d2"), { ...d, by: "owner" }));
  await assertFails(setDoc(doc(db, "drinks/d2"), { ...d, brand: "" }));
  await assertFails(setDoc(doc(db, "drinks/d2"), { ...d, abv: 95 }));
  await assertFails(setDoc(doc(as(env, "stranger"), "drinks/d2"), { ...d, by: "stranger" }));
  await assertFails(updateDoc(doc(db, "drinks/d1"), { abv: 5 }));
  await assertSucceeds(updateDoc(doc(as(env, "admin2"), "drinks/d1"), { abv: 5 }));
  await assertFails(updateDoc(doc(as(env, "admin2"), "drinks/d1"), { by: "admin2" }));
  await assertSucceeds(deleteDoc(doc(as(env, "owner"), "drinks/d1")));
});

test("a paused member can't log", async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), "members/member"), { suspended: true }));
  await assertFails(setDoc(doc(as(env, "member"), "logs/a"), log("member")));
});

test("giving a drink: the giver logs it for a member, can delete it, and who gave it never changes", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "logs/g1"), log("owner", { givenBy: "member" })));
  await assertFails(setDoc(doc(db, "logs/g2"), log("owner", { givenBy: "admin2" })), "not as someone else");
  await assertFails(setDoc(doc(db, "logs/g3"), log("member", { givenBy: "member" })), "not to yourself");
  await assertFails(setDoc(doc(db, "logs/g4"), log("nobody", { givenBy: "member" })), "only to a member");
  await assertFails(updateDoc(doc(as(env, "owner"), "logs/g1"), { givenBy: "owner" }), "the receiver can't change who gave it");
  await assertSucceeds(updateDoc(doc(as(env, "owner"), "logs/g1"), { notes: "Thanks!", editedAt: Date.now() }), "the receiver edits their drink");
  await assertSucceeds(deleteDoc(doc(db, "logs/g1")), "the giver can take it back");
});
