// Rules for households and their fridge and bar: everyone can look, only a household's members change its stock.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, setDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seedGroup(env);
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), "members/member2"), { displayName: "member2", joinedAt: 1, suspended: false });
  });
});

const house = (by, members, extra = {}) => ({ name: "The Basement", members, by, at: Date.now(), ...extra });
const beer = (by, extra = {}) => ({ hh: "h1", where: "fridge", kind: "drink", item: "molson-canadian", count: 6, by, at: Date.now(), ...extra });
const BEER = "stock/h1~fridge~drink~molson-canadian";
const seedHouse = () => env.withSecurityRulesDisabled(async ctx => {
  await setDoc(doc(ctx.firestore(), "households/h1"), house("member", ["member"]));
});

test("members start a household with just themselves in it", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "households/a"), house("member", ["member"])));
  await assertFails(setDoc(doc(db, "households/b"), house("member", ["member", "owner"])), "can't put others in at the start");
  await assertFails(setDoc(doc(db, "households/c"), house("member", ["owner"])), "must include yourself");
  await assertFails(setDoc(doc(db, "households/d"), house("member", ["member"], { name: "" })));
  await assertFails(setDoc(doc(db, "households/e"), house("member", ["member"], { colour: "red" })), "known fields only");
  await assertFails(setDoc(doc(as(env, "stranger"), "households/f"), house("stranger", ["stranger"])));
});

test("a household's members rename it, add people and leave; others can only look", async () => {
  await seedHouse();
  const db = as(env, "member");
  await assertSucceeds(updateDoc(doc(db, "households/h1"), { members: ["member", "member2"], by: "member", at: Date.now() }));
  await assertSucceeds(updateDoc(doc(as(env, "member2"), "households/h1"), { name: "Our Place", by: "member2", at: Date.now() }));
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), "members/member3"), { displayName: "member3", joinedAt: 1, suspended: false });
  });
  await assertFails(updateDoc(doc(as(env, "member3"), "households/h1"), { name: "Mine now", by: "member3", at: Date.now() }));
  await assertSucceeds(getDocs(collection(as(env, "member3"), "households")), "everyone sees every household");
  await assertSucceeds(updateDoc(doc(db, "households/h1"), { members: ["member2"], by: "member", at: Date.now() }), "leaving");
  await assertFails(getDocs(collection(as(env, "stranger"), "households")));
});

test("only a household's members stock its fridge and bar", async () => {
  await seedHouse();
  const db = as(env, "member"), other = as(env, "member2");
  await assertSucceeds(setDoc(doc(db, BEER), beer("member")));
  await assertSucceeds(updateDoc(doc(db, BEER), { count: increment(-1), by: "member", at: Date.now() }));
  await assertSucceeds(updateDoc(doc(db, BEER), { low: 2, by: "member", at: Date.now() }));
  await assertFails(setDoc(doc(other, "stock/h1~fridge~drink~other"), beer("member2", { item: "other" })), "not their household");
  await assertFails(updateDoc(doc(other, BEER), { count: 0, by: "member2", at: Date.now() }));
  await assertFails(deleteDoc(doc(other, BEER)));
  await assertSucceeds(getDocs(collection(other, "stock")), "everyone sees every fridge");
  await assertFails(getDocs(collection(as(env, "stranger"), "stock")));
});

test("stock documents are checked: id, fields, sizes, and who changed it", async () => {
  await seedHouse();
  const db = as(env, "member");
  await assertFails(setDoc(doc(db, "stock/h1~fridge~drink~wrong"), beer("member")), "id must match");
  await assertFails(setDoc(doc(db, BEER), beer("owner")), "by must be you");
  await assertFails(setDoc(doc(db, BEER), beer("member", { where: "garage" })));
  await assertFails(setDoc(doc(db, BEER), beer("member", { price: 2 })), "known fields only");
  await assertFails(setDoc(doc(db, BEER), beer("member", { count: 1.5 })));
  const BOTTLE = "stock/h1~bar~drink~campari";
  await assertSucceeds(setDoc(doc(db, BOTTLE), { hh: "h1", where: "bar", kind: "drink", item: "campari", size: 750, left: 562.5, spares: 1, by: "member", at: Date.now() }));
  await assertFails(updateDoc(doc(db, BOTTLE), { spares: -1, by: "member", at: Date.now() }));
  await assertFails(updateDoc(doc(db, BOTTLE), { item: "aperol", by: "member", at: Date.now() }), "what it is never changes");
  const LIME = "stock/h1~bar~ing~lime-juice";
  await assertSucceeds(setDoc(doc(db, LIME), { hh: "h1", where: "bar", kind: "ing", item: "lime-juice", by: "member", at: Date.now() }));
  await assertSucceeds(updateDoc(doc(db, LIME), { out: true, by: "member", at: Date.now() }));
  await assertSucceeds(deleteDoc(doc(db, LIME)));
});

test("admins can clear out stock; nobody stocks a household that doesn't exist", async () => {
  await seedHouse();
  await assertSucceeds(setDoc(doc(as(env, "member"), BEER), beer("member")));
  await assertSucceeds(deleteDoc(doc(as(env, "admin2"), BEER)));
  await assertFails(setDoc(doc(as(env, "member"), "stock/nope~fridge~drink~molson-canadian"), beer("member", { hh: "nope" })));
});

test("pours come off with an increment, and logs say where a drink came from and what bottles it killed", async () => {
  await seedHouse();
  const db = as(env, "member");
  const BOTTLE = "stock/h1~bar~drink~campari";
  await assertSucceeds(setDoc(doc(db, BOTTLE), { hh: "h1", where: "bar", kind: "drink", item: "campari", size: 750, left: 20, by: "member", at: Date.now() }));
  await assertSucceeds(updateDoc(doc(db, BOTTLE), { left: increment(-44), by: "member", at: Date.now() }), "the last pour can dip below 0");
  const log = { uid: "member", kind: "drink", drinkId: "campari", title: "Campari", style: "bitter", size: "shot", ml: 44, abv: 25,
    at: Date.now(), createdAt: Date.now(), hasPhoto: false };
  await assertSucceeds(setDoc(doc(db, "logs/l1"), { ...log, from: "h1~bar~drink~campari", killed: ["campari"] }));
  await assertFails(setDoc(doc(db, "logs/l2"), { ...log, killed: [] }), "killed lists at least one bottle");
  await assertFails(setDoc(doc(db, "logs/l3"), { ...log, from: 5 }));
});

test("anyone in the group can take a drink from a cooler, but only its household loads it or changes anything else", async () => {
  await seedHouse();
  const COOLER = "stock/h1~cooler~drink~molson-canadian";
  const can = (by, extra = {}) => ({ hh: "h1", where: "cooler", kind: "drink", item: "molson-canadian", count: 12, by, at: Date.now(), ...extra });
  await assertFails(setDoc(doc(as(env, "member2"), COOLER), can("member2")), "only the household loads it");
  await assertSucceeds(setDoc(doc(as(env, "member"), COOLER), can("member")));
  const friend = as(env, "member2");
  await assertSucceeds(updateDoc(doc(friend, COOLER), { count: increment(-1), by: "member2", at: Date.now() }));
  await assertSucceeds(updateDoc(doc(friend, COOLER), { count: increment(1), by: "member2", at: Date.now() }), "Undo puts it back");
  await assertFails(updateDoc(doc(friend, COOLER), { low: 2, by: "member2", at: Date.now() }), "only the count");
  await assertFails(deleteDoc(doc(friend, COOLER)));
  await assertSucceeds(setDoc(doc(as(env, "member"), BEER), beer("member")));
  await assertFails(updateDoc(doc(friend, BEER), { count: increment(-1), by: "member2", at: Date.now() }), "fridges stay the household's");
  await assertFails(updateDoc(doc(as(env, "stranger"), COOLER), { count: increment(-1), by: "stranger", at: Date.now() }));
});

