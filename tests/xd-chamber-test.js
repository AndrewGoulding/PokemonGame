// Pokémon XD's Purify Chamber's rules (game/xd-chamber.js): nine Sets; a ring's tempo by how many are in it, how many
// pairs round it flow (each super effective against the next) or are resisted, and the Shadow Pokémon against the
// first of the ring; a perfect circle of four; and its Shadow Pokémon's heart opened by that tempo every 161 steps.
"use strict";
const assert = require("node:assert/strict");
require("./browser/lib").loadHeadless();

const C = window.XDChamber, mon = (sp) => Party.create(sp, 20);
const flags = {};
assert.equal(C.sets(flags).length, 9, "nine Sets");
const ted = window.Orre.XD.shadowRecord(1);
window.OrreHeart.snagged(ted);
// Water, fire, grass round a ring of three: each super effective against the next. (Teddiursa against Squirtle:
// neither way.)
let t = C.tempo({ shadow: ted, ring: [mon("Squirtle"), mon("Charmander"), mon("Bulbasaur")] });
assert.deepEqual([t.amount, t.flows, t.resisted, t.perfect], [49 + 3 * 6, 3, 0, false]);
// The other way round: Water and Fire each resisted by the next (Bulbasaur's Poison neither way against Charmander).
t = C.tempo({ shadow: ted, ring: [mon("Squirtle"), mon("Bulbasaur"), mon("Charmander")] });
assert.deepEqual([t.flows, t.resisted], [0, 2]);
assert.equal(t.amount, 49 - 2 * 3);
// Four Normal-types: Normal flows into Normal, a perfect circle (doubled with four), and Teddiursa (Normal) on the
// first of them: a third more.
t = C.tempo({ shadow: ted, ring: ["Rattata", "Zigzagoon", "Sentret", "Pidgey"].map(mon) });
assert(t.perfect, "a perfect circle");
assert.equal(t.amount, Math.ceil((96 + 4 * 6 * 2) * 4 / 3));
// No Shadow Pokémon, or no ring: nothing.
assert.equal(C.tempo({ shadow: null, ring: [mon("Rattata")] }).amount, 0);
assert.equal(C.tempo({ shadow: ted, ring: [] }).amount, 0);
console.log("ok: the Purify Chamber's tempo: flows, resisted pairs, a perfect circle");

// Walking: every 161 steps the Set's Shadow Pokémon's heart opens by its tempo; ready once it's all the way open.
C.sets(flags)[0] = { shadow: ted, ring: ["Rattata", "Zigzagoon", "Sentret", "Pidgey"].map(mon) };
const per = C.tempo(C.sets(flags)[0]).amount;
for (let i = 0; i < C.STEPS - 1; i++) assert.deepEqual(C.step(flags), []);
assert.equal(ted.heart, 3000);
C.step(flags);
assert.equal(ted.heart, 3000 - per, "one tempo's worth after 161 steps");
let ready = [];
for (let i = 0; i < 100000 && !ready.length; i++) ready = C.step(flags);
assert.equal(ready[0], ted, "ready once its heart's open");
assert.equal(ted.heart, 0);
console.log("ok: the Purify Chamber opens its Shadow Pokémon's hearts as you walk, 161 steps at a time");
