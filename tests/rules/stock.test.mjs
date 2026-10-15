// Rules for households and their fridge and bar: everyone can look, only a household's members change its stock.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
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


test("a drink from a friend's cooler goes on the Tab: given by whoever loaded it, checked against the cooler", async () => {
  await seedHouse();
  const COOLER = "h1~cooler~drink~molson-canadian";
  await assertSucceeds(setDoc(doc(as(env, "member"), `stock/${COOLER}`), { hh: "h1", where: "cooler", kind: "drink", item: "molson-canadian",
    count: 6, loadedBy: "member", by: "member", at: Date.now() }));
  const log = extra => ({ uid: "member2", kind: "drink", drinkId: "molson-canadian", title: "Molson Canadian", style: "am-lager", size: "can",
    ml: 355, abv: 5, at: Date.now(), createdAt: Date.now(), hasPhoto: false, ...extra });
  const friend = as(env, "member2");
  await assertSucceeds(setDoc(doc(friend, "logs/c1"), log({ from: COOLER, givenBy: "member" })));
  await assertFails(setDoc(doc(friend, "logs/c2"), log({ from: COOLER, givenBy: "owner" })), "only the one who loaded it");
  await assertFails(setDoc(doc(friend, "logs/c3"), log({ givenBy: "member" })), "needs the cooler it came from");
  await assertFails(setDoc(doc(friend, "logs/c4"), log({ from: "h1~fridge~drink~molson-canadian", givenBy: "member" })), "a cooler, not a fridge");
  await assertSucceeds(updateDoc(doc(friend, "logs/c1"), { disputed: true, editedAt: Date.now() }), "the receiver can dispute it");
  await assertFails(updateDoc(doc(as(env, "member"), "logs/c1"), { disputed: false, editedAt: Date.now() }), "the giver can't undo a dispute");
  await assertFails(updateDoc(doc(friend, `stock/${COOLER}`), { loadedBy: "member2", by: "member2", at: Date.now() }), "friends can't claim the cooler");
});

test("a bar's page: about, signature, menu and a photo kept in its own document", async () => {
  await seedHouse();
  const db = as(env, "member"), friend = as(env, "member2");
  await assertSucceeds(updateDoc(doc(db, "households/h1"), { about: "Rye and records.", signature: "cocktail:manhattan",
    menu: ["manhattan", "old-fashioned"], hasPhoto: true, by: "member", at: Date.now() }));
  await assertFails(updateDoc(doc(db, "households/h1"), { about: "x".repeat(201), by: "member", at: Date.now() }));
  await assertFails(updateDoc(doc(friend, "households/h1"), { about: "Mine now", by: "member2", at: Date.now() }));
  const photo = by => ({ src: "data:image/jpeg;base64,AAAA", by, at: Date.now() });
  await assertSucceeds(setDoc(doc(db, "barphotos/h1"), photo("member")));
  await assertFails(setDoc(doc(friend, "barphotos/h1"), photo("member2")), "only the household");
  await assertFails(setDoc(doc(db, "barphotos/h1"), { ...photo("member"), src: "data:image/png;base64,AAAA" }), "jpeg only");
  await assertSucceeds(getDoc(doc(friend, "barphotos/h1")), "everyone can see it");
  await assertFails(deleteDoc(doc(friend, "barphotos/h1")));
  await assertSucceeds(deleteDoc(doc(db, "barphotos/h1")));
});

test("orders: a guest orders, the household serves it or says no, the guest can take back a waiting one", async () => {
  await seedHouse();
  const host = as(env, "member"), guest = as(env, "member2");
  await assertSucceeds(updateDoc(doc(host, "households/h1"), { open: true, by: "member", at: Date.now() }));
  const order = (by, extra = {}) => ({ hh: "h1", by, kind: "cocktail", item: "manhattan", note: "Up, please", state: "waiting", at: Date.now(), ...extra });
  await assertSucceeds(setDoc(doc(guest, "orders/o1"), order("member2")));
  await assertFails(setDoc(doc(guest, "orders/o2"), order("owner")), "not for someone else");
  await assertFails(setDoc(doc(guest, "orders/o3"), order("member2", { state: "served" })), "orders start waiting");
  await assertFails(setDoc(doc(guest, "orders/o4"), order("member2", { hh: "nope" })), "the bar must exist");
  await assertFails(updateDoc(doc(guest, "orders/o1"), { state: "served", servedBy: "member2", at: Date.now() }), "guests don't serve themselves");
  await assertSucceeds(updateDoc(doc(host, "orders/o1"), { state: "served", servedBy: "member", logId: "log1", at: Date.now() }));
  await assertFails(updateDoc(doc(guest, "orders/o1"), { state: "cancelled", at: Date.now() }), "too late once it's served");
  await assertSucceeds(setDoc(doc(guest, "orders/o5"), order("member2")));
  await assertSucceeds(updateDoc(doc(guest, "orders/o5"), { state: "cancelled", at: Date.now() }), "take back a waiting one");
  await assertFails(updateDoc(doc(host, "orders/o5"), { item: "negroni", at: Date.now() }), "what was ordered never changes");
});

test("starred cocktails live on your own member document, up to 100", async () => {
  await assertSucceeds(updateDoc(doc(as(env, "member"), "members/member"), { starred: ["manhattan", "negroni"] }));
  await assertFails(updateDoc(doc(as(env, "member"), "members/member"), { starred: Array.from({ length: 101 }, (_, k) => `c${k}`) }));
  await assertFails(updateDoc(doc(as(env, "member"), "members/owner"), { starred: ["manhattan"] }), "not someone else's");
  // Drinks to try, up to 200.
  await assertSucceeds(updateDoc(doc(as(env, "member"), "members/member"), { wants: ["guinness-draught"] }));
  await assertFails(updateDoc(doc(as(env, "member"), "members/member"), { wants: Array.from({ length: 201 }, (_, k) => `d${k}`) }));
});
