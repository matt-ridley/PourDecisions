// Rules for ratings: one per person per drink, your own only; admins can take down review text.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const rating = (uid, extra = {}) => ({ uid, kind: "drink", drinkId: "bud-light", title: "Bud Light", rating: 2, at: Date.now(), ...extra });
const path = (uid, drinkId = "bud-light", kind = "drink") => `ratings/${uid}_${kind}_${drinkId}`;
async function seed(uid, extra) {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path(uid)), rating(uid, extra)));
}

test("members rate a drink for themselves, under their own id for that drink", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, path("member")), rating("member")));
  await assertSucceeds(setDoc(doc(db, path("member", "margarita", "cocktail")), rating("member", { kind: "cocktail", drinkId: "margarita", title: "Margarita", rating: 4.5, tags: ["sour", "balanced"], review: "Lovely." })));
  await assertFails(setDoc(doc(db, path("member", "corona-extra")), rating("member")), "id must match the drink");
  await assertFails(setDoc(doc(db, path("owner")), rating("owner")), "not for someone else");
  await assertFails(setDoc(doc(db, path("member")), rating("owner")));
  await assertFails(setDoc(doc(as(env, "stranger"), path("stranger")), rating("stranger")));
  await assertSucceeds(getDocs(collection(db, "ratings")));
  await assertFails(getDocs(collection(as(env, "stranger"), "ratings")));
});

test("a rating must be sensible: half stars, short review, few tags, known fields", async () => {
  const db = as(env, "member");
  for (const bad of [{ rating: 0 }, { rating: 4.3 }, { rating: 6 }, { review: "x".repeat(501) }, { tags: ["a", "b", "c", "d", "e", "f"] }, { price: 3 }]) {
    await assertFails(setDoc(doc(db, path("member")), rating("member", bad)), JSON.stringify(bad).slice(0, 40));
  }
  const noStars = rating("member"); delete noStars.rating;
  await assertFails(setDoc(doc(db, path("member")), noStars), "stars are required");
});

test("you change or remove your own rating; others can't", async () => {
  await seed("member", { review: "Water." });
  await assertSucceeds(setDoc(doc(as(env, "member"), path("member")), rating("member", { rating: 1.5 })));
  await assertFails(updateDoc(doc(as(env, "owner"), path("member")), { rating: 5 }), "not even the owner");
  await assertFails(deleteDoc(doc(as(env, "admin2"), path("member"))));
  await assertSucceeds(deleteDoc(doc(as(env, "member"), path("member"))));
});

test("admins can take down a review's text, and nothing else", async () => {
  await seed("member", { review: "Rude words." });
  await assertFails(updateDoc(doc(as(env, "member"), path("member")), { uid: "owner" }));
  await assertFails(updateDoc(doc(as(env, "admin2"), path("member")), { review: "Edited by admin" }));
  await assertFails(updateDoc(doc(as(env, "admin2"), path("member")), { review: deleteField(), rating: 5 }));
  await assertFails(updateDoc(doc(as(env, "member2"), path("member")), { review: deleteField() }), "not a member");
  await assertSucceeds(updateDoc(doc(as(env, "admin2"), path("member")), { review: deleteField() }));
});
