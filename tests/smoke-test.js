// Smoke test: loads every non-UI script from index.html in order (in Node, with a
// fake `window`), then plays random-team battles to the end with random choices.
// Run with: npm test
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
const headless = scripts.filter((src) => !src.startsWith("ui/"));
for (const src of headless) {
  vm.runInThisContext(fs.readFileSync(path.join(root, src), "utf8"), { filename: src });
}

for (const name of ["TYPE_CHART", "NATURES", "DEX", "MOVES", "ABILITIES", "ITEMS", "LEARNSETS_GEN6",
  "Stats", "Damage", "CONDITIONS", "ITEM_EFFECTS", "BATTLE_MOVE_EFFECTS", "Battle", "RandomTeam"]) {
  assert(window[name], "missing global " + name);
}

// Seeded PRNG so a failure can be reproduced.
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random teams are valid: unique species, 1–4 known moves, sprites present.
const rng = mulberry32(42);
for (let i = 0; i < 50; i++) {
  const team = RandomTeam.team(3, { level: 5 + Math.floor(rng() * 96), rng });
  assert.strictEqual(new Set(team.map((s) => s.species)).size, 3, "duplicate species in team");
  for (const set of team) {
    assert(set.moves.length >= 1 && set.moves.length <= 4, set.species + " has " + set.moves.length + " moves");
    for (const m of set.moves) assert(MOVES[m], "unknown move " + m);
    for (const dir of ["", "back/"]) {
      const sprite = path.join(root, "assets/sprites/pokemon", dir, DEX[set.species].id + ".png");
      assert(fs.existsSync(sprite), "missing sprite " + sprite);
    }
  }
}

// Full battles with random choices on both sides must finish.
const BATTLES = 200;
let turns = 0;
for (let seed = 1; seed <= BATTLES; seed++) {
  const teamRng = mulberry32(seed * 7919);
  const battle = new Battle({
    seed,
    p1: { name: "A", team: RandomTeam.team(3, { level: 50, rng: teamRng }) },
    p2: { name: "B", team: RandomTeam.team(3, { level: 50, rng: teamRng }) }
  });
  battle.start();
  for (let step = 0; step < 2000 && !battle.ended; step++) {
    for (const side of ["p1", "p2"]) {
      const choice = battle.randomChoice(side);
      if (choice) assert(battle.choose(side, choice).ok, "choice rejected in battle " + seed);
    }
  }
  assert(battle.ended, "battle " + seed + " did not finish");
  turns += battle.turn;
}

// Regression: a multi-hit move that breaks a substitute on the first hit used to
// crash on the second hit.
{
  const battle = new Battle({
    seed: 1,
    p1: { name: "A", team: [{ species: "Garchomp", level: 100, moves: ["Swords Dance", "Dual Chop"] }] },
    p2: { name: "B", team: [{ species: "Pikachu", level: 20, moves: ["Substitute"] }] }
  });
  battle.start();
  battle.choose("p1", { type: "move", move: "Swords Dance" });
  battle.choose("p2", { type: "move", move: "Substitute" });
  assert(battle.sides.p2.active.volatiles.substitute, "Substitute was not set up");
  battle.choose("p1", { type: "move", move: "Dual Chop" });
  battle.choose("p2", { type: "move", move: "Substitute" });
  assert(battle.events.some((ev) => ev[0] === "-end" && ev[2] === "Substitute"), "Substitute did not break");
  assert(battle.ended, "second hit of Dual Chop should have knocked out Pikachu");
}

// Moves start at their base PP unless the set asks for PP Ups.
{
  const battle = new Battle({
    seed: 1,
    p1: { name: "A", team: [{ species: "Pelipper", level: 50, moves: ["Rain Dance"] },
                            { species: "Pelipper", level: 50, moves: ["Rain Dance"], ppUps: 3 }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] }
  });
  const [plain, boosted] = battle.sides.p1.pokemon;
  assert.strictEqual(plain.moves[0].maxpp, 5, "Rain Dance should have 5 PP");
  assert.strictEqual(boosted.moves[0].maxpp, 8, "Rain Dance with 3 PP Ups should have 8 PP");
}

// Nature Power calls Tri Attack with no terrain, and the terrain's move otherwise.
for (const [setup, called] of [[null, "Tri Attack"], ["Electric Terrain", "Thunderbolt"],
  ["Grassy Terrain", "Energy Ball"], ["Misty Terrain", "Moonblast"]]) {
  const battle = new Battle({
    seed: 1,
    p1: { name: "A", team: [{ species: "Ludicolo", level: 50, moves: ["Nature Power"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: [setup || "Splash"] }] }
  });
  battle.start();
  if (setup) {
    battle.choose("p1", { type: "move", move: 0 });
    battle.choose("p2", { type: "move", move: 0 });
  }
  const before = battle.events.length;
  battle.choose("p1", { type: "move", move: 0 });
  battle.choose("p2", { type: "move", move: 0 });
  const turn = battle.events.slice(before);
  assert(turn.some((ev) => ev[0] === "move" && ev[1] === "p1a: Ludicolo" && ev[2] === called),
    "Nature Power should call " + called + (setup ? " in " + setup : ""));
  assert(turn.some((ev) => ev[0] === "-damage" && ev[1] === "p2a: Snorlax"), "Nature Power did no damage");
  assert(!turn.some((ev) => ev[0] === "-fail" && ev[1] === "p1a: Ludicolo"), "Nature Power failed");
}

// Wring Out works against a full-HP target (and hits hardest there).
{
  const battle = new Battle({
    seed: 1,
    p1: { name: "A", team: [{ species: "Tentacruel", level: 50, moves: ["Wring Out"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] }
  });
  battle.start();
  battle.choose("p1", { type: "move", move: 0 });
  battle.choose("p2", { type: "move", move: 0 });
  assert(battle.events.some((ev) => ev[0] === "-damage" && ev[1] === "p2a: Snorlax"), "Wring Out did no damage");
  assert(!battle.events.some((ev) => ev[0] === "-fail" && ev[1] === "p1a: Tentacruel"), "Wring Out failed");
}

console.log("ok: loaded " + headless.length + " scripts, " + BATTLES + " random battles finished (" + turns + " turns)");
