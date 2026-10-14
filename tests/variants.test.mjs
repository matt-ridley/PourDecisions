// Cocktail variants: what counts as a variant, ids from contents, names, makers, strength from the bottles used.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { COCKTAILS } from "../js/catalog/cocktails.js";
import { setVariants, variantsOf, itemById, resolveId, allItems, search } from "../js/catalog.js";
import { recipeAbv, recipeVolume } from "../js/logs.js";
import { ML_PER_OZ } from "../js/units.js";
import { startRows, scaleRows, buildVariant, changes, isVariant, variantId, variantRecipe, autoName, variantTitle,
  makersOf, variantCount, madeVariants, lineage, remixesOf, recentVariants, cleanVariantName, changeWords, stepAmount, addedRow, bottleChoices, servingsFor, makeLogs,
  variantDoc } from "../js/variants.js";

afterEach(() => { setVariants([]); });

const recipe = id => COCKTAILS.find(c => c.id === id);
const sour = recipe("whisky-sour"), nySour = recipe("new-york-sour"), manhattan = recipe("manhattan");
// The Make it screen's rows with some changes: { slot: { ...changed fields } }, or null to remove that row.
const rowsWith = (r, edits = {}, added = []) => [
  ...startRows(r).map(x => edits[x.slot] === null ? null : { ...x, ...edits[x.slot] }).filter(Boolean), ...added];
const DILLONS = { drinkId: "dillons-rye-whisky" };
const H = 3600000, now = 1_800_000_000_000;

test("the recipe as written isn't a variant", () => {
  assert.equal(buildVariant(sour, startRows(sour)), null);
  assert.equal(buildVariant(sour, startRows(sour), { glass: "Rocks", garnish: "Cherry and lemon wheel", name: "Mine" }), null,
    "the recipe's own glass and garnish, and a name on its own, don't make one");
});

test("picking one of the choices or leaving out an optional ingredient is still the recipe", () => {
  assert.equal(buildVariant(nySour, rowsWith(nySour, { 0: { ing: ["bourbon"] } })), null, "bourbon is one of its choices");
  assert.equal(buildVariant(sour, rowsWith(sour, { 3: null })), null, "egg white is optional");
});

test("a bottle, an amount, a removed or added ingredient, the glass or the garnish makes a variant", () => {
  assert.ok(buildVariant(sour, rowsWith(sour, { 0: DILLONS })), "a bottle");
  assert.ok(buildVariant(sour, rowsWith(sour, { 1: { oz: 1 } })), "more lemon");
  assert.ok(buildVariant(sour, rowsWith(sour, { 2: null })), "no syrup");
  assert.ok(buildVariant(sour, rowsWith(sour, {}, [{ qty: "2 dashes", ing: ["angostura"] }])), "added bitters");
  assert.ok(buildVariant(manhattan, rowsWith(manhattan, { 2: { qty: "3 dashes" } })), "a dash more");
  assert.equal(buildVariant(manhattan, rowsWith(manhattan, { 2: { qty: " 2  Dashes " } })), null, "same count, tidied");
  assert.ok(buildVariant(sour, startRows(sour), { glass: "Coupe" }), "glass");
  assert.ok(buildVariant(sour, startRows(sour), { garnish: "" }), "no garnish");
});

test("amounts compare by the pour, in ml rounded to 5: 2 oz and 60 ml are the same, ¼ oz and 5 ml steps aren't", () => {
  assert.equal(buildVariant(sour, rowsWith(sour, { 0: { oz: 60 / ML_PER_OZ } })), null);
  assert.ok(buildVariant(sour, rowsWith(sour, { 0: { oz: 55 / ML_PER_OZ } })));
  assert.ok(buildVariant(sour, rowsWith(sour, { 0: { oz: 2.25 } })));
  assert.ok(buildVariant(sour, rowsWith(sour, { 1: { oz: 0.5 } })));
});

test("the same drink gives the same id, whoever makes it and whatever it's called", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 } }), { name: "Matt's Sour" });
  const b = buildVariant(sour, rowsWith(sour, { 1: { oz: 1 }, 0: DILLONS }), { from: "whisky-sour~abc" });
  assert.equal(a.id, b.id);
  assert.match(a.id, /^whisky-sour~[a-z0-9]+$/, "the original's id, ~, then a hash");
  assert.equal(a.name, "Matt's Sour");
  assert.equal(b.from, "whisky-sour~abc");
  assert.ok(!("name" in b));
  assert.equal(variantId(a), a.id);
});

test("different drinks give different ids", () => {
  const ids = new Set([
    rowsWith(sour, { 0: DILLONS }),
    rowsWith(sour, { 0: { drinkId: "crown-royal-deluxe" } }),
    rowsWith(sour, { 0: DILLONS, 1: { oz: 1 } }),
    rowsWith(sour, { 0: DILLONS, 3: null }),
    rowsWith(sour, { 1: { oz: 1 } }),
    rowsWith(sour, { 1: { oz: 1 } }, [{ qty: "2 dashes", ing: ["angostura"] }]),
  ].map(rows => buildVariant(sour, rows).id));
  assert.equal(ids.size, 6);
  const glass = buildVariant(sour, rowsWith(sour, { 0: DILLONS }), { glass: "Coupe" });
  assert.ok(!ids.has(glass.id));
});

test("added ingredients' order doesn't matter, and recipe rows can't be doubled or invented", () => {
  const bitters = { qty: "2 dashes", ing: ["angostura"] }, orange = { qty: "1 dash", ing: ["orange-bitters"] };
  assert.equal(buildVariant(sour, rowsWith(sour, {}, [bitters, orange])).id, buildVariant(sour, rowsWith(sour, {}, [orange, bitters])).id);
  const v = buildVariant(sour, [...rowsWith(sour, { 0: DILLONS }), { slot: 0, oz: 5, ing: ["whisky"] }, { slot: 9, oz: 1, ing: ["whisky"] }]);
  assert.equal(v.ingredients.filter(r => r.slot === 0).length, 1);
  assert.equal(v.ingredients[0].oz, 2, "the first row for a slot wins");
  assert.ok(!v.ingredients.some(r => r.slot === 9));
  assert.ok(!buildVariant(sour, rowsWith(sour, {}, [{ oz: 1, ing: ["not-a-thing"] }])), "unknown ingredients are dropped");
});

test("changes lists what's different, in recipe order", () => {
  const v = buildVariant(nySour, rowsWith(nySour, { 0: { ...DILLONS, ing: ["rye"] }, 1: { oz: 1 }, 3: null }, [{ qty: "2 dashes", ing: ["angostura"] }]),
    { glass: "Coupe" });
  assert.deepEqual(changes(nySour, v).map(c => c.type), ["bottle", "more", "removed", "added", "glass"]);
  const choice = buildVariant(nySour, rowsWith(nySour, { 0: { ing: ["bourbon"] }, 2: { oz: 0.5 } }));
  assert.deepEqual(changes(nySour, choice).map(c => [c.type, !!c.minor]), [["choice", true], ["less", false]]);
  assert.ok(isVariant(nySour, choice));
});

test("unnamed variants get a name from what changed", () => {
  assert.equal(autoName(sour, buildVariant(sour, rowsWith(sour, { 0: DILLONS }))), "Whisky Sour · Dillon's Rye Whisky");
  assert.equal(autoName(sour, buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 } }))), "Whisky Sour · Dillon's Rye Whisky, more fresh lemon juice");
  assert.equal(autoName(sour, buildVariant(sour, rowsWith(sour, { 2: null }, [{ oz: 0.5, ing: ["maple-syrup"] }]))), "Whisky Sour · no simple syrup, + Maple syrup");
  assert.equal(autoName(sour, buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 }, 2: { oz: 0.5 } }), { glass: "Coupe" })),
    "Whisky Sour · Dillon's Rye Whisky, more fresh lemon juice, +2 more");
  assert.equal(autoName(manhattan, buildVariant(manhattan, rowsWith(manhattan, { 2: { qty: "4 dashes" } }))), "Manhattan · 4 dashes angostura bitters");
  const named = buildVariant(sour, rowsWith(sour, { 0: DILLONS }), { name: "  The   Basement Sour " });
  assert.equal(variantTitle(sour, named), "The Basement Sour");
  assert.equal(cleanVariantName("x".repeat(60)).length, 40);
});

test("a variant reads as a full recipe, with the bottles named", () => {
  const v = buildVariant(nySour, rowsWith(nySour, { 0: { ...DILLONS, ing: ["rye"] } }, [{ qty: "2 dashes", ing: ["angostura"] }]), { garnish: "" });
  const r = variantRecipe(nySour, v);
  assert.deepEqual(r.ingredients.map(x => x.item), ["Dillon's Rye Whisky", "Fresh lemon juice", "Simple syrup", "Red wine", "Angostura bitters"]);
  assert.equal(r.garnish, "");
  assert.equal(r.glass, "Rocks");
  assert.equal(r.steps, nySour.steps);
  const choice = variantRecipe(nySour, { ingredients: rowsWith(nySour, { 0: { ing: ["bourbon"] } }) });
  assert.equal(choice.ingredients[0].item, "Bourbon");
});

test("strength comes from the bottles picked", () => {
  const asWritten = recipeAbv(sour);
  const strong = variantRecipe(sour, buildVariant(sour, rowsWith(sour, { 0: { drinkId: "1792-full-proof" } })));
  assert.ok(recipeAbv(strong) > asWritten, `${recipeAbv(strong)} > ${asWritten}`);
  const same = variantRecipe(sour, buildVariant(sour, rowsWith(sour, { 0: DILLONS })));
  assert.equal(recipeAbv(same), asWritten, "a 40% bottle is what the estimate assumed");
  assert.equal(recipeVolume(variantRecipe(sour, buildVariant(sour, rowsWith(sour, { 1: { oz: 1 } })))), recipeVolume(sour) + Math.round(0.25 * ML_PER_OZ));
});

test("scaling a batch multiplies poured amounts only", () => {
  const rows = scaleRows(startRows(manhattan), 4);
  assert.deepEqual(rows.map(r => r.oz ?? r.qty), [8, 4, "2 dashes"]);
});

test("variants sit under their cocktail: looked up and merged like drinks, but not searched or counted", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS })), b = buildVariant(sour, rowsWith(sour, { 1: { oz: 1 } }));
  const dup = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 3: null }));
  const before = allItems().length;
  setVariants([{ ...a, by: "u1", at: now - 3 * H }, { ...b, by: "u2", at: now - 2 * H }, { ...dup, by: "u3", at: now - H, mergedInto: a.id },
    { id: "gone~123", base: "not-a-cocktail", ingredients: [], by: "u1", at: now }]);
  assert.deepEqual(variantsOf("whisky-sour").map(v => v.id), [a.id, b.id], "oldest first, merged left out");
  const made = [{ uid: "u1", kind: "cocktail", drinkId: "whisky-sour", variantId: a.id, at: now }, { uid: "u2", kind: "cocktail", drinkId: "whisky-sour", variantId: b.id, at: now }];
  assert.equal(variantCount("whisky-sour", made), 2);
  assert.equal(variantCount("whisky-sour", made.slice(1)), 1, "only variants someone has logged count");
  assert.equal(variantCount("manhattan", made), 0);
  assert.equal(itemById("variant", dup.id).id, a.id, "a merged duplicate gives the one kept");
  assert.equal(resolveId("variant", dup.id), a.id);
  assert.equal(itemById("variant", "gone~123"), null, "a variant of an unknown cocktail is ignored");
  assert.equal(allItems().length, before);
  assert.ok(!search("whisky sour").some(i => i.kind === "variant"));
});

test("makers come from the logs: whoever made it, merged duplicates counted for the one kept", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS })), dup = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 3: null }));
  setVariants([{ ...a, by: "u1", at: now - 9 * H }, { ...dup, by: "u2", at: now - 9 * H, mergedInto: a.id }]);
  const log = (uid, variantId, at, extra = {}) => ({ uid, kind: "cocktail", drinkId: "whisky-sour", variantId, at, ...extra });
  const logs = [log("u1", a.id, now - 5 * H), log("u1", a.id, now - 4 * H), log("u2", dup.id, now - 3 * H),
    log("u3", a.id, now - H, { madeBy: "u2" }), log("u3", undefined, now), log("u4", "whisky-sour~other", now)];
  assert.deepEqual(makersOf(logs, a.id), [{ uid: "u2", count: 2, last: now - H }, { uid: "u1", count: 2, last: now - 4 * H }]);
  assert.deepEqual(makersOf(logs, dup.id), makersOf(logs, a.id), "asking about the duplicate gives the same");
});

/* ---------- The Make it screen ---------- */

test("− and + step by ¼ oz, or by 5 ml, never below one step", () => {
  assert.equal(stepAmount(2, 1, "oz"), 2.25);
  assert.equal(stepAmount(0.75, -1, "oz"), 0.5);
  assert.equal(stepAmount(0.25, -1, "oz"), 0.25);
  assert.equal(stepAmount(1.69, 1, "oz"), 2, "an amount from ml snaps to the quarter");
  const ml = oz => Math.round(oz * ML_PER_OZ);
  assert.equal(ml(stepAmount(1.5, 1, "ml")), 50, "45 ml + 5");
  assert.equal(ml(stepAmount(2, -1, "ml")), 55, "60 ml − 5");
  assert.equal(ml(stepAmount(0.17, -1, "ml")), 5);
  const v = buildVariant(sour, rowsWith(sour, { 0: { oz: stepAmount(2, -1, "ml") } }));
  assert.ok(v, "a 5 ml step is a variant");
  assert.equal(buildVariant(sour, rowsWith(sour, { 0: { oz: stepAmount(stepAmount(2, -1, "ml"), 1, "ml") } })), null, "and back again is the recipe");
});

test("an added ingredient starts at a sensible amount", () => {
  assert.deepEqual(addedRow("angostura"), { ing: ["angostura"], qty: "2 dashes" });
  assert.deepEqual(addedRow("egg-white"), { ing: ["egg-white"], qty: "1" });
  assert.deepEqual(addedRow("maple-syrup"), { ing: ["maple-syrup"], oz: 0.5 });
  assert.deepEqual(addedRow("rye", "dillons-rye-whisky"), { ing: ["rye"], oz: 0.5, drinkId: "dillons-rye-whisky" });
  assert.deepEqual(addedRow(undefined, "some-member-drink"), { ing: [], oz: 0.5, drinkId: "some-member-drink" });
});

test("bottle choices: every bottle that counts, yours from cocktails first, then drinks you've logged, then A to Z", () => {
  const rye = startRows(nySour)[0];
  const plain = bottleChoices(rye);
  assert.ok(plain.length > 20);
  assert.ok(plain.some(c => c.item.id === "dillons-rye-whisky" && c.ing === "rye"));
  assert.ok(plain.some(c => c.ing === "bourbon"), "both choices offered");
  assert.deepEqual(plain.map(c => c.item.title), [...plain.map(c => c.item.title)].sort((a, b) => a.localeCompare(b)));
  const v = buildVariant(nySour, rowsWith(nySour, { 0: { drinkId: "crown-royal-deluxe", ing: ["rye"] } }));
  const logs = [
    { uid: "me", kind: "drink", drinkId: "dillons-rye-whisky", at: now - 2 * H },
    { uid: "you", kind: "drink", drinkId: "1792-small-batch", at: now },
    { uid: "you", madeBy: "me", kind: "cocktail", drinkId: "new-york-sour", variantId: v.id, at: now - 5 * H },
  ];
  const mine = bottleChoices(rye, { logs, variants: [v], uid: "me" });
  assert.deepEqual(mine.slice(0, 2).map(c => c.item.id), ["crown-royal-deluxe", "dillons-rye-whisky"]);
  assert.notEqual(mine[2].item.id, "1792-small-batch", "someone else's drinks don't count");
});

test("servings: one each unless a batch size is picked", () => {
  assert.equal(servingsFor(0, ["me"]), 1);
  assert.equal(servingsFor(0, ["me", "a", "b"]), 3);
  assert.equal(servingsFor(0, []), 1);
  assert.equal(servingsFor(8, ["me", "a"]), 8);
});

test("making it logs one serving for each person drinking; you're the maker of theirs", () => {
  const v = buildVariant(sour, rowsWith(sour, { 0: { drinkId: "1792-full-proof" } }), { name: "Proof Sour" });
  const logs = makeLogs({ recipe: sour, variant: v, drinkers: ["me", "a", "a"], me: "me", at: now, placeId: "p1" });
  assert.equal(logs.length, 2, "once per person");
  const [mine, theirs] = logs;
  assert.equal(mine.uid, "me");
  assert.ok(!("madeBy" in mine));
  assert.equal(theirs.uid, "a");
  assert.equal(theirs.madeBy, "me");
  for (const l of logs) {
    assert.equal(l.kind, "cocktail"); assert.equal(l.drinkId, "whisky-sour"); assert.equal(l.variantId, v.id);
    assert.equal(l.title, "Proof Sour"); assert.equal(l.size, "one"); assert.equal(l.at, now); assert.equal(l.placeId, "p1");
    assert.equal(l.ml, recipeVolume(variantRecipe(sour, v)));
    assert.ok(l.abv > recipeAbv(sour), "stronger with a full-proof bourbon");
  }
  const plain = makeLogs({ recipe: sour, variant: null, drinkers: ["me"], me: "me", at: now });
  assert.equal(plain[0].title, "Whisky Sour");
  assert.ok(!("variantId" in plain[0]));
  assert.equal(plain[0].abv, recipeAbv(sour));
});

test("a log of a merged variant points at the one kept", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS })), dup = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 3: null }));
  setVariants([{ ...a, by: "u1", at: now }, { ...dup, by: "u2", at: now, mergedInto: a.id }]);
  assert.equal(makeLogs({ recipe: sour, variant: dup, drinkers: ["me"], me: "me", at: now })[0].variantId, a.id);
});

test("the saved document has no id, plus who and when; changes read as words", () => {
  const v = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 } }), { name: "Mine" });
  const d = variantDoc(v, "me", now);
  assert.ok(!("id" in d));
  assert.deepEqual(Object.keys(d).sort(), ["base", "by", "at", "ingredients", "name"].sort());
  assert.deepEqual(changeWords(sour, v), ["Dillon's Rye Whisky", "more fresh lemon juice"]);
  assert.deepEqual(changeWords(nySour, { ingredients: rowsWith(nySour, { 0: { ing: ["bourbon"] } }) }), ["bourbon"],
    "a picked choice alone is still worded");
});

/* ---------- In the catalogue ---------- */

const mkLog = (uid, v, at, extra = {}) => ({ uid, kind: "cocktail", drinkId: v.base, variantId: v.id, at, ...extra });

test("made variants: only ones logged, most made first, a merged duplicate's makes counted for the one kept", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS })), b = buildVariant(sour, rowsWith(sour, { 1: { oz: 1 } }));
  const dup = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 3: null })), unmade = buildVariant(sour, rowsWith(sour, { 2: null }));
  const m = buildVariant(manhattan, rowsWith(manhattan, { 2: { qty: "4 dashes" } }));
  setVariants([a, b, dup, unmade, m].map(v => ({ ...v, by: "u1", at: now - 9 * H, ...(v === dup ? { mergedInto: a.id } : {}) })));
  const logs = [mkLog("u1", a, now - 5 * H), mkLog("u2", dup, now - 4 * H), mkLog("u3", a, now - 3 * H, { madeBy: "u2" }),
    mkLog("u1", b, now - H), mkLog("u1", m, now)];
  const list = madeVariants("whisky-sour", logs);
  assert.deepEqual(list.map(x => [x.item.id, x.makes, x.makers]), [[a.id, 3, 1 + 1], [b.id, 1, 1]]);
  assert.equal(list[0].last, now - 3 * H);
});

test("lineage follows what each variant was remixed from; remixes list the ones made from it", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS }));
  const b = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 } }), { from: a.id });
  const c = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 1: { oz: 1 }, 2: { oz: 0.5 } }), { from: b.id });
  const d = buildVariant(sour, rowsWith(sour, { 0: DILLONS, 2: { oz: 1 } }), { from: a.id });
  setVariants([a, b, c, d].map((v, k) => ({ ...v, by: "u1", at: now + k })));
  assert.deepEqual(lineage(c.id).map(v => v.id), [b.id, a.id]);
  assert.deepEqual(lineage(a.id), []);
  assert.deepEqual(remixesOf(a.id).map(v => v.id), [b.id, d.id]);
  assert.deepEqual(remixesOf(c.id), []);
  setVariants([{ ...a, by: "u1", at: now, from: b.id }, { ...b, by: "u1", at: now }]);
  assert.equal(lineage(a.id).length <= 5, true, "a loop can't run forever");
});

test("make it again: your latest variants, one each, including ones you made for friends", () => {
  const a = buildVariant(sour, rowsWith(sour, { 0: DILLONS })), b = buildVariant(manhattan, rowsWith(manhattan, { 2: { qty: "4 dashes" } }));
  setVariants([a, b].map(v => ({ ...v, by: "me", at: now - 9 * H })));
  const logs = [mkLog("me", a, now - 5 * H), mkLog("me", a, now - 2 * H), mkLog("you", b, now - H, { madeBy: "me" }),
    mkLog("you", a, now), { uid: "me", kind: "cocktail", drinkId: "negroni", at: now }];
  assert.deepEqual(recentVariants(logs, "me").map(x => [x.item.id, x.log.at]), [[b.id, now - H], [a.id, now - 2 * H]]);
  assert.deepEqual(recentVariants(logs, "me", 1).map(x => x.item.id), [b.id]);
  assert.deepEqual(recentVariants(logs, "you").map(x => x.item.id), [a.id], "made for you by someone else isn't yours to make again");
});
