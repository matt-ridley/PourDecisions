// Rules for the feed's cheers and comments: your own only, one cheer per post, comments deleted by their writer or an admin.
import { test, before, after, beforeEach } from "node:test";
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDocs, collection, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { startEnv, seedGroup, as } from "./helpers.mjs";

let env;
before(async () => { env = await startEnv(); });
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedGroup(env); });

const POST = "s~log123";
const cheer = (uid, extra = {}) => ({ post: POST, uid, to: "owner", at: Date.now(), ...extra });
const comment = (uid, extra = {}) => ({ post: POST, uid, to: "owner", text: "Cheers to that!", at: Date.now(), ...extra });

test("members cheer a post once, as themselves, and take it back", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, `cheers/${POST}|member`), cheer("member")));
  await assertFails(setDoc(doc(db, `cheers/${POST}|owner`), cheer("owner")), "not for someone else");
  await assertFails(setDoc(doc(db, `cheers/v~other|member`), cheer("member")), "the id must match the post");
  await assertFails(setDoc(doc(db, `cheers/x~bad|member`), cheer("member", { post: "x~bad" })), "only known kinds of post");
  await assertFails(setDoc(doc(db, `cheers/${POST}|member`), cheer("member", { emoji: "🍺" })), "known fields only");
  await assertFails(deleteDoc(doc(as(env, "admin2"), `cheers/${POST}|member`)), "someone else's cheers stay");
  await assertSucceeds(deleteDoc(doc(db, `cheers/${POST}|member`)));
  await assertSucceeds(getDocs(collection(db, "cheers")));
  await assertFails(getDocs(collection(as(env, "stranger"), "cheers")));
  await assertFails(setDoc(doc(as(env, "stranger"), `cheers/${POST}|stranger`), cheer("stranger")));
});

test("comments: your own, short, never edited; deleted by their writer or an admin", async () => {
  const db = as(env, "member");
  await assertSucceeds(setDoc(doc(db, "comments/c1"), comment("member")));
  await assertFails(setDoc(doc(db, "comments/c2"), comment("owner")), "not as someone else");
  await assertFails(setDoc(doc(db, "comments/c3"), comment("member", { text: "" })));
  await assertFails(setDoc(doc(db, "comments/c4"), comment("member", { text: "x".repeat(301) })));
  await assertFails(setDoc(doc(db, "comments/c5"), comment("member", { post: "nope" })));
  await assertFails(updateDoc(doc(db, "comments/c1"), { text: "Edited" }), "no editing");
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), "comments/o1"), comment("owner"));
    await setDoc(doc(ctx.firestore(), "members/member2"), { displayName: "member2", joinedAt: 1, suspended: false });
  });
  await assertFails(deleteDoc(doc(as(env, "member2"), "comments/c1")), "another member can't");
  await assertSucceeds(deleteDoc(doc(db, "comments/c1")));
  await assertSucceeds(deleteDoc(doc(as(env, "admin2"), "comments/o1")), "an admin can delete anyone's");
  await assertFails(getDocs(collection(as(env, "stranger"), "comments")));
});

test("night recaps and firsts can be cheered and commented on too", async () => {
  const db = as(env, "member");
  for (const post of ["n~log123", "f~log123_style", "c~globetrotter_1_member"]) {
    await assertSucceeds(setDoc(doc(db, `cheers/${post}|member`), cheer("member", { post })));
    await assertSucceeds(setDoc(doc(db, `comments/${post.slice(0, 1)}c`), comment("member", { post })));
  }
});

test("members keep when they last looked at their alerts on their own profile", async () => {
  await assertSucceeds(updateDoc(doc(as(env, "member"), "members/member"), { alertsSeenAt: Date.now() }));
  await assertFails(updateDoc(doc(as(env, "member"), "members/owner"), { alertsSeenAt: Date.now() }), "not someone else's");
});
