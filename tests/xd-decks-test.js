// Pokémon XD's decks (data/xd-decks.js, tools/build-xd-decks.js): every species, move and held item one this game
// knows; XD's 83 Shadow Pokémon, each with its heart gauge and Shadow moves, and each battled by a story Trainer;
// and a few parties checked against the game itself.
"use strict";
const assert = require("node:assert/strict");
const path = require("path");
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/dex.js", "data/moves.js", "data/items.js", "data/xd-decks.js"]) require(path.join(root, f));
const X = window.XD_DECKS;

const shadows = X.shadow.filter(Boolean);
assert.equal(shadows.length, 83, "XD's 83 Shadow Pokémon");
for (const s of shadows) {
  assert(window.DEX[s.species], s.species);
  assert(s.heart > 0 && s.shadowMoves.length >= 1, s.species + "'s heart and Shadow moves");
  for (const m of s.moves.concat(s.shadowMoves)) assert(window.MOVES[m], s.species + ": " + m);
  assert(s.shadowMoves.every((m) => /^Shadow /.test(m)), s.species + "'s Shadow moves: " + s.shadowMoves);
}
let mons = 0;
for (const [deck, trainers] of Object.entries(X)) {
  if (deck === "classes" || deck === "shadow") continue;
  for (const [i, t] of Object.entries(trainers)) {
    assert(t.name && t.party.length >= 1, deck + " #" + i);
    for (const p of t.party) {
      if (p.shadow) { assert(X.shadow[p.shadow], deck + " #" + i + ": Shadow Pokémon " + p.shadow); continue; }
      mons++;
      assert(window.DEX[p.species], deck + " #" + i + ": " + p.species);
      assert(p.level >= 1 && p.level <= 100 && p.moves.length >= 1, deck + " #" + i + ": " + p.species);
      for (const m of p.moves) assert(window.MOVES[m], deck + " #" + i + ": " + m);
      if (p.item) assert(window.ITEMS[p.item], deck + " #" + i + ": " + p.item);
    }
  }
}
const used = new Set();
for (const t of Object.values(X.story)) for (const p of t.party) if (p.shadow) used.add(p.shadow);
assert.equal(used.size, 83, "every Shadow Pokémon is some story Trainer's");
console.log("ok: XD's decks: 83 Shadow Pokémon, " + mons + " other party Pokémon, all in this game's names");

// (Checked against the game: Naps's Shadow Teddiursa, XD's first; Lovrina, a woman, the European deck says; Greevil's
// last battle, the legendary birds among his Shadow Pokémon.)
const party = (t) => t.party.map((p) => (p.shadow ? "*" + X.shadow[p.shadow].species + " " + X.shadow[p.shadow].level : p.species + " " + p.level));
const find = (name, cls) => Object.values(X.story).filter((t) => t.name === name && (!cls || t.cls === cls));
assert.deepEqual(party(find("Naps", "Spy")[0]), ["*Teddiursa 11"]);
assert.deepEqual(X.shadow[1].shadowMoves, ["Shadow Blitz", "Shadow Mist"]);
assert(find("Lovrina").every((t) => t.female && t.cls === "Cipher Admin"));
assert(find("Greevil").some((t) => ["*Zapdos 50", "*Moltres 50", "*Articuno 50"].every((p) => party(t).includes(p))));
console.log("ok: XD's decks: Naps's Teddiursa, Lovrina, Greevil's birds as the game has them");
