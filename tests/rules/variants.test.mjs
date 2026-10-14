// Rules for cocktail variants, logs that point at one or were made for someone else, and rating a variant.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const ID = "whisky-sour~abc123";
const variant = (by, extra = {}) => ({ base: "whisky-sour", by, at: Date.now(),
  ingredients: [{ slot: 0, ing: ["whisky"], oz: 2, drinkId: "dillons-rye-whisky" }, { slot: 1, ing: ["lemon-juice"], oz: 1 }], ...extra });
async function seedVariant(by, extra, id = ID) {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "variants", id), variant(by, extra)));
}
const log = (uid, extra = {}) => ({ uid, kind: "cocktail", drinkId: "whisky-sour", title: "Whisky Sour", style: "whisky-sour-family",
  size: "one", ml: 104, abv: 25, at: Date.now() - 60000, createdAt: Date.now(), hasPhoto: false, variantId: ID, ...extra });

test("members save a variant as themselves, under its cocktail's id", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "variants", ID), variant("member", { name: "Basement Sour", from: "whisky-sour~zzz", glass: "Coupe", garnish: "" })));
  await assertFails(setDoc(doc(db, "variants/whisky-sour~def"), variant("owner")), "not as someone else");
  await assertFails(setDoc(doc(db, "variants/manhattan~def"), variant("member")), "the id must start with its cocktail");
  await assertFails(setDoc(doc(db, "variants/whisky-sour"), variant("member")), "the id needs its hash");
  await assertFails(setDoc(doc(db, "variants/Whisky-Sour~DEF"), variant("member", { base: "Whisky-Sour" })), "lower case only");
  await assertFails(setDoc(doc(as(env, "stranger"), "variants/whisky-sour~def"), variant("stranger")));
  await assertSucceeds(getDocs(collection(db, "variants")));
  await assertFails(getDocs(collection(as(env, "stranger"), "variants")));
});

test("a variant must be sensible: ingredients, a short name, known fields, not born merged", async () => {
  const db = as(env, "member");
  for (const bad of [{ ingredients: [] }, { ingredients: Array(21).fill({ slot: 0, ing: ["whisky"], oz: 1 }) }, { name: "" },
    { name: "x".repeat(41) }, { glass: "x".repeat(41) }, { price: 3 }, { mergedInto: "whisky-sour~x" }, { at: "now" }]) {
    await assertFails(setDoc(doc(db, "variants", ID), variant("member", bad)), JSON.stringify(bad).slice(0, 40));
  }
});

test("once saved, the maker can only rename it, and nobody else can save over it", async () => {
  await seedVariant("member", { name: "Old name" });
  const db = as(env, "member");
  await assertSucceeds(updateDoc(doc(db, "variants", ID), { name: "New name" }));
  await assertSucceeds(updateDoc(doc(db, "variants", ID), { name: deleteField() }));
  await assertFails(updateDoc(doc(db, "variants", ID), { ingredients: [{ slot: 0, ing: ["whisky"], oz: 3 }] }), "what's in it never changes");
  await assertFails(updateDoc(doc(db, "variants", ID), { glass: "Coupe" }));
  await assertFails(updateDoc(doc(db, "variants", ID), { by: "owner" }));
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "members/member2"), { displayName: "member2", joinedAt: 1, suspended: false }));
  await assertFails(setDoc(doc(as(env, "member2"), "variants", ID), variant("member2")), "making the same drink doesn't take it over");
  await assertFails(setDoc(doc(as(env, "owner"), "variants", ID), variant("owner")), "not even for an admin");
  await assertFails(updateDoc(doc(as(env, "member2"), "variants", ID), { name: "Mine now" }), "admins rename; other members don't");
  await assertFails(deleteDoc(doc(db, "variants", ID)), "only admins delete");
});

test("admins rename, merge and delete variants", async () => {
  await seedVariant("member");
  const db = as(env, "admin2");
  await assertSucceeds(updateDoc(doc(db, "variants", ID), { name: "Tidied" }));
  await assertSucceeds(updateDoc(doc(db, "variants", ID), { mergedInto: "whisky-sour~keep" }));
  await assertFails(updateDoc(doc(db, "variants", ID), { ingredients: [{ slot: 0, ing: ["whisky"], oz: 3 }] }));
  await assertFails(updateDoc(doc(as(env, "member"), "variants", ID), { mergedInto: deleteField() }));
  await assertSucceeds(deleteDoc(doc(db, "variants", ID)));
});

test("a cocktail log can point at a variant; a drink log can't", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "logs/a"), log("member")));
  await assertFails(setDoc(doc(db, "logs/b"), log("member", { kind: "drink", drinkId: "molson-canadian" })));
  await assertFails(setDoc(doc(db, "logs/c"), log("member", { variantId: "" })));
  await assertFails(setDoc(doc(db, "logs/d"), log("member", { variantId: "x".repeat(121) })));
});

test("you can make a drink for another member: you log it for them as madeBy", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "logs/a"), log("owner", { madeBy: "member" })));
  const plain = log("admin2", { madeBy: "member" }); delete plain.variantId;
  await assertSucceeds(setDoc(doc(db, "logs/b"), plain), "the recipe as written, no variant");
  await assertFails(setDoc(doc(db, "logs/c"), log("owner", { madeBy: "admin2" })), "madeBy must be you");
  await assertFails(setDoc(doc(db, "logs/d"), log("owner")), "without madeBy it must be your own");
  await assertFails(setDoc(doc(db, "logs/e"), log("member", { madeBy: "member" })), "madeBy is for someone else's drink");
  await assertFails(setDoc(doc(db, "logs/f"), log("stranger", { madeBy: "member" })), "only for members");
});

test("a drink made for you is yours to edit; the maker can delete it but not edit it", async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "logs/a"), log("owner", { madeBy: "member" })));
  await assertSucceeds(updateDoc(doc(as(env, "owner"), "logs/a"), { notes: "Thanks!", editedAt: Date.now() }));
  await assertFails(updateDoc(doc(as(env, "owner"), "logs/a"), { madeBy: "owner" }), "who made it never changes");
  await assertFails(updateDoc(doc(as(env, "owner"), "logs/a"), { madeBy: deleteField() }));
  await assertFails(updateDoc(doc(as(env, "member"), "logs/a"), { notes: "Mine" }));
  // Another ordinary member can't delete it; the maker can (made it for the wrong person).
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "members/member2"), { displayName: "member2", joinedAt: 1, suspended: false }));
  await assertFails(deleteDoc(doc(as(env, "member2"), "logs/a")));
  await assertSucceeds(deleteDoc(doc(as(env, "member"), "logs/a")));
});

test("members rate a variant like a drink, one rating each", async () => {
  const rating = uid => ({ uid, kind: "variant", drinkId: ID, title: "Whisky Sour · Dillon's Rye Whisky", rating: 4.5, at: Date.now() });
  await assertSucceeds(setDoc(doc(as(env, "member"), `ratings/member_variant_${ID}`), rating("member")));
  await assertFails(setDoc(doc(as(env, "member"), `ratings/member_cocktail_${ID}`), rating("member")), "the id must say variant");
  await assertFails(setDoc(doc(as(env, "member"), `ratings/member_variant_x`), { ...rating("member"), drinkId: "x".repeat(121) }));
});
