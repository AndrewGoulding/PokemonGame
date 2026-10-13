// Smoke test: loads every script from index.html in order (in Node, with a fake
// `window`) and runs a short battle. Run with: node tests/smoke-test.js
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
global.window = global;

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
assert(scripts.length > 0, "no <script src> tags found in index.html");
for (const src of scripts) {
  vm.runInThisContext(fs.readFileSync(path.join(root, src), "utf8"), { filename: src });
}

for (const name of ["TYPE_CHART", "NATURES", "DEX", "MOVES", "ABILITIES", "ITEMS", "LEARNSETS_GEN6",
  "Stats", "Damage", "CONDITIONS", "ITEM_EFFECTS", "BATTLE_MOVE_EFFECTS", "Battle"]) {
  assert(window[name], "missing global " + name);
}

const battle = new Battle({
  seed: 1,
  p1: { name: "A", team: [{ species: "Garchomp", level: 50, moves: ["Earthquake"] }] },
  p2: { name: "B", team: [{ species: "Pikachu", level: 50, moves: ["Thunderbolt"] }] }
});
battle.start();
for (let turn = 0; turn < 50 && !battle.ended; turn++) {
  battle.choose("p1", { type: "move", move: 0 });
  battle.choose("p2", { type: "move", move: 0 });
}
assert(battle.ended, "battle did not finish within 50 turns");

console.log("ok: loaded " + scripts.length + " scripts, sample battle finished in " + battle.turn + " turn(s)");
