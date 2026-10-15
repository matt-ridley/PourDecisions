// Rules for Drink Nights: the host sets it up; anyone in the group can add or take only themselves.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const night = (host, extra = {}) => ({ name: "Friday", host, start: Date.now(), guests: [host], by: host, at: Date.now(), ...extra });

test("members host a night as themselves, and everyone can see it", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "nights/n1"), night("member", { guests: ["member", "owner"], placeId: "p1" })));
  await assertFails(setDoc(doc(db, "nights/n2"), night("owner")), "not as someone else");
  await assertFails(setDoc(doc(db, "nights/n3"), night("member", { guests: ["owner"] })), "the host is there");
  await assertFails(setDoc(doc(db, "nights/n4"), night("member", { end: 1 })), "it can't end before it starts");
  await assertFails(setDoc(doc(db, "nights/n5"), night("member", { cover: 10 })), "known fields only");
  await assertSucceeds(getDocs(collection(as(env, "owner"), "nights")));
  await assertFails(getDocs(collection(as(env, "stranger"), "nights")));
});

test("the host changes it; others only join or leave themselves", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "nights/n1"), night("member")));
  await assertSucceeds(updateDoc(doc(db, "nights/n1"), { name: "Saturday", end: Date.now() + 1000, by: "member", at: Date.now() }));
  const other = as(env, "owner");
  await assertSucceeds(updateDoc(doc(other, "nights/n1"), { guests: arrayUnion("owner"), by: "owner", at: Date.now() }), "I'm here");
  await assertFails(updateDoc(doc(other, "nights/n1"), { guests: arrayUnion("admin2"), by: "owner", at: Date.now() }), "not someone else");
  await assertFails(updateDoc(doc(other, "nights/n1"), { name: "Mine", by: "owner", at: Date.now() }), "only the host renames it");
  await assertFails(updateDoc(doc(db, "nights/n1"), { host: "owner", by: "member", at: Date.now() }), "the host never changes");
  await assertSucceeds(updateDoc(doc(other, "nights/n1"), { guests: arrayRemove("owner"), by: "owner", at: Date.now() }), "leaving");
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), "members/member2"), { displayName: "m2", joinedAt: 1, suspended: false }));
  await assertFails(deleteDoc(doc(as(env, "member2"), "nights/n1")), "only the host or an admin deletes it");
  await assertSucceeds(deleteDoc(doc(db, "nights/n1")));
});
