// Pokémon XD's Reverse Mode in the battle engine (engine/battle.js, game/party.js, game/orre-heart.js): an XD Shadow
// Pokémon's own Shadow moves all usable; it goes into Reverse Mode as it finishes acting (its turn not lost), hurts
// itself 1/16 of its HP at each turn's end, takes no item but a Scent, doesn't come back to its senses by itself,
// and a Call brings it back. Colosseum's Hyper Mode is unchanged.
"use strict";
const assert = require("node:assert/strict");
require("./browser/lib").loadHeadless();

const Orre = window.Orre, OrreHeart = window.OrreHeart;
const ted = Orre.XD.shadowRecord(1);
OrreHeart.snagged(ted);
assert.equal(ted.heartMax, 3000, "XD's heart gauge, its own size");
assert(OrreHeart.reverseChance(ted) > 0 && OrreHeart.reverseChance(Object.assign({}, ted, { heart: 0 })) > OrreHeart.reverseChance(ted),
  "likelier the more its heart's opened");
const set = Party.toBattleSet(ted);
assert(set.reverse && set.ownMoves == null, "Reverse Mode, nothing sealed");
set.reverseChance = 1;   // (sure to go into it, for the test)
set.level = 60; set.ivs = 31;
const b = new Battle({ seed: 7, trainer: true, p1: { name: "YOU", team: [set] }, p2: { name: "FOE", team: [{ species: "Blissey", level: 100, moves: ["Splash"], ivs: 31 }] } });
b.start();
const mon = b.sides.p1.pokemon[0];
assert(mon.moves.every((m) => !m.sealed), "its Shadow moves all usable");
const ev = (from) => b.events.slice(from).map((e) => e.join("|"));
let at = b.events.length;
const hp0 = mon.hp;
b.choose("p1", { type: "move", move: 0 });
b.choose("p2", { type: "move", move: 0 });
assert(mon.hyper, "into Reverse Mode once it had acted");
const turn1 = ev(at);
const used = turn1.findIndex((e) => /^move\|.*Shadow/.test(e)), into = turn1.findIndex((e) => /^-reverse\|.*\|start/.test(e));
assert(used >= 0 && into > used, "it used its move, then went into Reverse Mode: " + turn1.join(" / "));
const hurt = turn1.findIndex((e) => /^-reverse\|.*\|hurt/.test(e));
assert(hurt > into, "hurt at the turn's end");
assert.equal(hp0 - mon.hp, Math.floor(mon.maxhp / 16), "1/16 of its HP");
// No item but a Scent.
assert(/REVERSE MODE/.test(b.itemError(b.sides.p1, { item: "potion", target: 0 }) || ""), "no Potion");
assert(!b.itemError(b.sides.p1, { item: "joy-scent", target: 0 }), "but a Scent");
// It stays in it, turn after turn, by itself.
for (let i = 0; i < 30 && !b.ended; i++) { b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 }); if (!mon.hyper) break; }
assert(mon.hyper || mon.fainted || b.ended, "doesn't come back to its senses by itself");
if (!b.ended && !mon.fainted) {
  at = b.events.length;
  b.choose("p1", { type: "call" }); b.choose("p2", { type: "move", move: 0 });
  assert(!mon.hyper && ev(at).some((e) => /^-hyper\|.*\|end/.test(e)), "a Call brings it back");
}
console.log("ok: XD's Reverse Mode: entered as it finishes acting, 1/16 a turn, a Scent only, ended by a Call");

// Colosseum's Shadow Pokémon: still Hyper Mode, its own moves sealed as before.
const mak = Orre.shadowMon(Orre.shadowOf("Trudly")[0]);
OrreHeart.snagged(mak);
const cs = Party.toBattleSet(mak);
assert(!cs.reverse && cs.ownMoves === 0, "Colosseum's: Hyper Mode, its moves sealed");
console.log("ok: Colosseum's Hyper Mode as it was");

// The Exp. Share passing on what a Pokémon at the level cap can't take: not to a Shadow Pokémon (it doesn't level).
{
  const shadow = Orre.XD.shadowRecord(14);
  OrreHeart.snagged(shadow);
  const lead = Party.create("Mewtwo", 22, { moves: ["Psychic"], ivs: 31 });
  const b = new Battle({ seed: 3, trainer: true, expShare: true, exp: true, levelCap: 22,
    p1: { name: "YOU", team: [Party.toBattleSet(lead), Party.toBattleSet(shadow)] },
    p2: { name: "FOE", team: [{ species: "Snorlax", level: 30, moves: ["Splash"] }] } });
  b.start();
  for (let i = 0; i < 20 && !b.ended; i++) { b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 }); }
  assert(b.ended, "won");
  const s2 = b.sides.p1.pokemon[1];
  assert.equal(s2.level, 17, "the Shadow Pokémon didn't level");
  assert.equal(s2.exp, Party.toBattleSet(shadow).exp ?? s2.exp, "no Exp. Points passed on to it");
  console.log("ok: no Exp. Points passed on to a Shadow Pokémon by the Exp. Share");
}
