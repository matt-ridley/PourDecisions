// Rules for catalogue moderation: corrections to built-in drinks, checking and merging member drinks, styles, places.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const memberDrink = { brand: "Backyard Brewing", name: "Patio Pils", style: "czech-pils", abv: 4.8, by: "member", at: 1 };
const seed = (path, data) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data));

test("admins correct built-in drinks; members can read corrections but not make them", async () => {
  const fix = { abv: 5.2, approx: false, by: "admin2", at: Date.now() };
  await assertFails(setDoc(doc(as(env, "member"), "fixes/molson-canadian"), { ...fix, by: "member" }));
  await assertSucceeds(setDoc(doc(as(env, "admin2"), "fixes/molson-canadian"), fix));
  await assertSucceeds(getDoc(doc(as(env, "member"), "fixes/molson-canadian")));
  await assertFails(getDoc(doc(as(env, "stranger"), "fixes/molson-canadian")));
  await assertFails(setDoc(doc(as(env, "admin2"), "fixes/x"), { ...fix, abv: 120 }));
  await assertFails(setDoc(doc(as(env, "admin2"), "fixes/x"), { ...fix, colour: "gold" }));
  await assertFails(setDoc(doc(as(env, "admin2"), "fixes/x"), { ...fix, by: "owner" }));
  await assertSucceeds(setDoc(doc(as(env, "owner"), "fixes/x"), { ing: ["rye"], mergedInto: "crown-royal-deluxe", by: "owner", at: 1 }));
  await assertFails(deleteDoc(doc(as(env, "member"), "fixes/x")));
  await assertSucceeds(deleteDoc(doc(as(env, "owner"), "fixes/x")));
});

test("members can't add a drink pre-checked or pre-merged", async () => {
  const db = as(env, "member");
  await assertFails(setDoc(doc(db, "drinks/d1"), { ...memberDrink, checked: true }));
  await assertFails(setDoc(doc(db, "drinks/d1"), { ...memberDrink, mergedInto: "molson-canadian" }));
  await assertSucceeds(setDoc(doc(db, "drinks/d1"), memberDrink));
});

test("admins check, fix, tag ingredients on, merge and unmerge member drinks", async () => {
  await seed("drinks/d1", memberDrink);
  const admin = as(env, "admin2");
  await assertFails(updateDoc(doc(as(env, "member"), "drinks/d1"), { checked: true }));
  await assertSucceeds(updateDoc(doc(admin, "drinks/d1"), { checked: true }));
  await assertSucceeds(updateDoc(doc(admin, "drinks/d1"), { abv: 5, ing: ["lager"], variant: deleteField() }));
  await assertFails(updateDoc(doc(admin, "drinks/d1"), { ing: "lager" }));
  await assertSucceeds(updateDoc(doc(admin, "drinks/d1"), { mergedInto: "pilsner-urquell" }));
  await assertSucceeds(updateDoc(doc(admin, "drinks/d1"), { mergedInto: deleteField() }));
  await assertFails(updateDoc(doc(admin, "drinks/d1"), { by: "admin2" }));
});

test("admins add and rename styles; members can't", async () => {
  const s = { name: "Cold Brew Ale", family: "beer/specialty-beer", about: "Ale brewed with cold brew coffee.", by: "owner", at: 1 };
  await assertFails(setDoc(doc(as(env, "member"), "styles/cold-brew-ale"), { ...s, by: "member" }));
  await assertSucceeds(setDoc(doc(as(env, "owner"), "styles/cold-brew-ale"), s));
  await assertSucceeds(setDoc(doc(as(env, "admin2"), "styles/helles"), { name: "Munich Helles", by: "admin2", at: 1 }));
  await assertFails(setDoc(doc(as(env, "admin2"), "styles/helles"), { name: "", by: "admin2", at: 1 }));
  await assertFails(setDoc(doc(as(env, "admin2"), "styles/helles"), { about: "x".repeat(201), by: "admin2", at: 1 }));
  await assertSucceeds(getDoc(doc(as(env, "member"), "styles/helles")));
  await assertSucceeds(deleteDoc(doc(as(env, "admin2"), "styles/helles")));
});

test("admins rename and merge places; members can't", async () => {
  await seed("places/p1", { name: "Keg", by: "member", at: 1 });
  await assertFails(updateDoc(doc(as(env, "member"), "places/p1"), { mergedInto: "p2" }));
  await assertSucceeds(updateDoc(doc(as(env, "admin2"), "places/p1"), { mergedInto: "p2" }));
  await assertSucceeds(updateDoc(doc(as(env, "admin2"), "places/p1"), { mergedInto: deleteField(), name: "The Keg" }));
  await assertFails(updateDoc(doc(as(env, "admin2"), "places/p1"), { by: "admin2" }));
});
