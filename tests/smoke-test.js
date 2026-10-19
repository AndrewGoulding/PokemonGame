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
// A stand-in for the browser's localStorage, for game/save.js.
const storage = {};
global.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
assert(scripts.length > 0, "no <script src> tags found in index.html");
const headless = scripts.filter((src) => !src.startsWith("ui/"));
for (const src of headless) {
  vm.runInThisContext(fs.readFileSync(path.join(root, src), "utf8"), { filename: src });
}

for (const name of ["TYPE_CHART", "NATURES", "DEX", "MOVES", "ABILITIES", "ITEMS", "LEARNSETS_GEN6", "MACHINE_LEARNERS", "SPRITE_METRICS",
  "Stats", "Damage", "CONDITIONS", "ITEM_EFFECTS", "BATTLE_MOVE_EFFECTS", "Battle", "RandomTeam", "OpponentAI",
  "Experience", "Catching", "EVOLUTIONS", "Party", "Evolution", "Encounters",
  "ItemUse", "ITEM_SPRITES", "Player", "Bag", "Save", "WORLD_MAPS", "World"]) {
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
  const team = RandomTeam.team(3, { level: 5 + Math.floor(rng() * 96), rng, maxGen: 6 });
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
    p1: { name: "A", team: RandomTeam.team(3, { level: 50, rng: teamRng, maxGen: 6 }) },
    p2: { name: "B", team: RandomTeam.team(3, { level: 50, rng: teamRng, maxGen: 6 }) }
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

// Healing Wish: fails with no one to come in (a wild Pokémon); otherwise the
// user faints and the next Pokémon in is fully healed.
{
  const wild = new Battle({
    seed: 2, wild: true,
    p1: { name: "A", team: [{ species: "Pidgey", level: 20, moves: ["Growl"] }] },
    p2: { name: "Wild", team: [{ species: "Jirachi", level: 20, moves: ["Healing Wish"] }] }
  });
  wild.start();
  wild.choose("p1", { type: "move", move: 0 });
  wild.choose("p2", { type: "move", move: 0 });
  assert(!wild.sides.p2.active.fainted && !wild.ended, "a lone wild Pokémon's Healing Wish fails");
  assert(wild.events.some((ev) => ev[0] === "-fail"));

  const b = new Battle({
    seed: 3,
    p1: { name: "A", team: [{ species: "Jirachi", level: 50, moves: ["Healing Wish"] }, { species: "Pidgey", level: 50, moves: ["Growl"] }] },
    p2: { name: "B", team: [{ species: "Pidgey", level: 5, moves: ["Growl"] }] }
  });
  b.start();
  const pidgey = b.sides.p1.pokemon[1];
  pidgey.hp = 1; pidgey.status = "par";
  b.choose("p1", { type: "move", move: 0 });
  b.choose("p2", { type: "move", move: 0 });
  assert(b.sides.p1.pokemon[0].fainted, "Healing Wish's user faints");
  b.choose("p1", { type: "switch", index: 1 });
  assert.deepStrictEqual([pidgey.hp, pidgey.status], [pidgey.maxhp, ""], "the next Pokémon in is healed");
}

// False Swipe leaves the target at 1 HP, however hard it hits, and at 1 HP
// it does nothing more.
{
  const b = new Battle({
    seed: 4, wild: true,
    p1: { name: "A", team: [{ species: "Scyther", level: 60, moves: ["False Swipe"] }] },
    p2: { name: "Wild", team: [{ species: "Caterpie", level: 3, moves: ["String Shot"] }] }
  });
  b.start();
  for (let i = 0; i < 3; i++) { b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 }); }
  assert.strictEqual(b.sides.p2.active.hp, 1, "False Swipe leaves 1 HP");
  assert(!b.ended && !b.sides.p2.active.fainted);
}

// SHIFT: when only the opponent has a Pokémon to send out, you may switch first, free.
{
  const b = new Battle({
    seed: 5,
    p1: { name: "A", team: [{ species: "Machamp", level: 60, moves: ["Cross Chop"] }, { species: "Pidgey", level: 10, moves: ["Growl"] }] },
    p2: { name: "B", team: [{ species: "Rattata", level: 3, moves: ["Tackle"] }, { species: "Pidgey", level: 3, moves: ["Growl"] }] }
  });
  b.start();
  b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 });
  assert(b.sides.p2.active.fainted && b.canShift("p1"), "SHIFT is offered when the foe must send out");
  assert(b.shift("p1", 1));
  assert.strictEqual(b.sides.p1.active.species, "Pidgey");
  b.choose("p2", { type: "switch", index: 1 });
  assert.strictEqual(b.getRequest("p1").phase, "move");
  assert(!new Battle({ seed: 1, wild: true, p1: { name: "A", team: [{ species: "Pidgey", level: 5, moves: ["Growl"] }] },
    p2: { name: "W", team: [{ species: "Pidgey", level: 5, moves: ["Growl"] }] } }).canShift("p1"), "not in a wild battle");
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

// ---------- Opponent AI ----------

function aiPick(p1Team, p2Team, setup) {
  const battle = new Battle({ seed: 1, p1: { name: "A", team: p1Team }, p2: { name: "B", team: p2Team } });
  battle.start();
  if (setup) setup(battle);
  const choice = OpponentAI.choose(battle, "p2");
  const side = battle.sides.p2;
  return choice.type === "move" ? side.active.moves[choice.move].name : "switch:" + side.pokemon[choice.index].species;
}

// Picks the strongest move against this target, accounting for type matchups.
assert.strictEqual(aiPick([{ species: "Heatran", level: 50, moves: ["Splash"] }],
  [{ species: "Garchomp", level: 50, moves: ["Swords Dance", "Dragon Claw", "Earthquake"] }]), "Earthquake");
assert.strictEqual(aiPick([{ species: "Skarmory", level: 50, moves: ["Splash"] }],
  [{ species: "Garchomp", level: 50, moves: ["Swords Dance", "Earthquake", "Dragon Claw"] }]), "Dragon Claw");
// Weighs accuracy: Surf (90 power, 100%) over Hydro Pump (110 power, 80%), and
// when either would KO, the one that can't miss.
const starmie = [{ species: "Starmie", level: 50, moves: ["Hydro Pump", "Surf"] }];
assert.strictEqual(aiPick([{ species: "Snorlax", level: 50, moves: ["Splash"] }], starmie), "Surf");
assert.strictEqual(aiPick([{ species: "Snorlax", level: 50, moves: ["Splash"] }], starmie,
  (b) => { b.sides.p1.active.hp = 20; }), "Surf");
// After a faint, sends in the Pokémon with the best matchup (Raichu vs Gyarados).
assert.strictEqual(aiPick([{ species: "Gyarados", level: 50, moves: ["Waterfall"] }],
  [{ species: "Magikarp", level: 5, moves: ["Splash"] }, { species: "Charizard", level: 50, moves: ["Flamethrower"] },
   { species: "Raichu", level: 50, moves: ["Thunderbolt"] }, { species: "Onix", level: 50, moves: ["Rock Throw"] }],
  (b) => { b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 }); }), "switch:Raichu");

// Beats an opponent that picks random moves most of the time. Each seed is played
// twice with the teams swapped so team strength cancels out.
let aiWinRate;
{
  const randomMove = (battle, side, rng) => {
    const req = battle.getRequest(side);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    if (req.phase === "switch") return { type: "switch", index: pick(req.switches) };
    if (req.phase !== "move") return null;
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };
    return { type: "move", move: pick(req.active.moves.filter((m) => !m.disabled)).index };
  };
  let wins = 0, games = 0;
  for (let seed = 1; seed <= 100; seed++) {
    for (const swap of [false, true]) {
      const teamRng = mulberry32(seed * 31);
      let aiTeam = RandomTeam.team(3, { rng: teamRng, maxGen: 6 }), otherTeam = RandomTeam.team(3, { rng: teamRng, maxGen: 6 });
      if (swap) [aiTeam, otherTeam] = [otherTeam, aiTeam];
      const battle = new Battle({ seed, p1: { name: "AI", team: aiTeam }, p2: { name: "Random", team: otherTeam } });
      const rng = mulberry32(seed);
      battle.start();
      for (let step = 0; step < 2000 && !battle.ended; step++) {
        const a = OpponentAI.choose(battle, "p1", rng);
        if (a) assert(battle.choose("p1", a).ok, "AI choice rejected in battle " + seed);
        const r = randomMove(battle, "p2", rng);
        if (r) assert(battle.choose("p2", r).ok, "random choice rejected in battle " + seed);
      }
      assert(battle.ended, "AI battle " + seed + " did not finish");
      games++;
      if (battle.winner === "p1") wins++;
    }
  }
  assert(wins / games >= 0.7, "AI only won " + wins + "/" + games + " against random moves");
  aiWinRate = Math.round((100 * wins) / games);
}

// ---------- Experience ----------

// Growth curves: totals at level 100 and a few spot values.
for (const [group, level, exp] of [
  ["Erratic", 100, 600000], ["Fast", 100, 800000], ["Medium Fast", 100, 1000000],
  ["Medium Slow", 100, 1059860], ["Slow", 100, 1250000], ["Fluctuating", 100, 1640000],
  ["Medium Slow", 2, 9], ["Medium Slow", 16, 2535], ["Erratic", 50, 125000], ["Fluctuating", 15, 1957]
]) {
  assert.strictEqual(Experience.expForLevel(group, level), exp, group + " level " + level);
}
for (const group of Object.keys(Experience.GROWTH)) {
  assert.strictEqual(Experience.expForLevel(group, 1), 0);
  for (let l = 2; l <= 100; l++) {
    assert(Experience.expForLevel(group, l) > Experience.expForLevel(group, l - 1), group + " not increasing at " + l);
    assert.strictEqual(Experience.levelForExp(group, Experience.expForLevel(group, l)), l);
  }
}
// Gen 6 formula: base exp x level / 7, x1.5 for trainers, split between participants.
assert.strictEqual(Experience.gain({ species: "Rattata", level: 12 }), 87);
assert.strictEqual(Experience.gain({ species: "Rattata", level: 12, trainer: true }), 130);
assert.strictEqual(Experience.gain({ species: "Rattata", level: 12, participants: 2 }), 43);
{
  const evs = { atk: 250 };
  Experience.addEvs(evs, "Machop"); // yields 1 Atk
  Experience.addEvs(evs, "Machop");
  Experience.addEvs(evs, "Machop");
  assert.strictEqual(evs.atk, 252, "EVs should cap at 252 per stat");
}

// Level-up mid-battle: new level, stats, HP, friendship and the move offer.
{
  const group = Experience.growthRate("Charmander");
  const battle = new Battle({
    seed: 3, exp: true, wild: true,
    p1: { name: "P", team: [{ species: "Charmander", level: 16, exp: Experience.expForLevel(group, 17) - 5, hp: 30,
      moves: ["Scratch", "Growl", "Ember", "Smokescreen"] }] },
    p2: { name: "W", team: [{ species: "Rattata", level: 12, moves: ["Tackle"] }] }
  });
  battle.start();
  const mon = battle.sides.p1.active;
  assert.strictEqual(mon.hp, 30, "battle should start from saved HP");
  const maxBefore = mon.maxhp;
  for (let i = 0; i < 10 && !battle.ended; i++) {
    battle.choose("p1", { type: "move", move: "Ember" });
    battle.choose("p2", { type: "move", move: 0 });
  }
  assert.strictEqual(battle.winner, "p1");
  assert.strictEqual(mon.level, 17);
  assert(mon.leveledUp && mon.maxhp > maxBefore, "stats should go up on level-up");
  assert(battle.events.some((e) => e[0] === "-exp" && e[2] === 87));
  assert(battle.events.some((e) => e[0] === "-levelup" && e[2] === 17));
  // (Scarlet and Violet's learnset: Fire Fang at 17.)
  assert(battle.events.some((e) => e[0] === "-trylearn" && e[2] === "Fire Fang"), "should offer Fire Fang at 17");
  assert(battle.replaceMove("p1", 0, 1, "Fire Fang"));
  assert.deepStrictEqual(mon.moves.map((m) => m.name), ["Scratch", "Fire Fang", "Ember", "Smokescreen"]);
}

// Gen 6 Exp. Share: the Pokémon that battled gets the full amount, the rest of
// the party half (fainted ones nothing), and everyone gets EVs.
for (const share of [false, true]) {
  const battle = new Battle({
    seed: 3, exp: true, wild: true, expShare: share,
    p1: { name: "P", team: [{ species: "Charmander", level: 30, moves: ["Ember"] },
      { species: "Pidgey", level: 5, moves: ["Tackle"] }, { species: "Rattata", level: 5, moves: ["Tackle"], hp: 0 }] },
    p2: { name: "W", team: [{ species: "Machop", level: 12, moves: ["Leer"] }] }
  });
  battle.start();
  for (let i = 0; i < 10 && !battle.ended; i++) {
    battle.choose("p1", { type: "move", move: 0 });
    battle.choose("p2", { type: "move", move: 0 });
  }
  assert.strictEqual(battle.winner, "p1");
  const [lead, bench, fainted] = battle.sides.p1.pokemon;
  const full = Experience.gain({ species: "Machop", level: 12 });
  assert(battle.events.some((e) => e[0] === "-exp" && e[1] === lead.ident && e[2] === full), "the battler gets the full amount");
  const benchExp = battle.events.find((e) => e[0] === "-exp" && e[1] === bench.ident);
  if (share) {
    assert.strictEqual(benchExp[2], Experience.gain({ species: "Machop", level: 12, participants: 2 }), "the rest get half");
    assert.strictEqual(benchExp[5], "share");
    assert(battle.events.some((e) => e[0] === "-expshare"));
    assert.strictEqual(bench.evs.atk, 1, "EVs for the whole party");
  } else {
    assert(!benchExp && !bench.evs.atk, "without the Exp. Share only the battler gains");
  }
  assert(!battle.events.some((e) => e[0] === "-exp" && e[1] === fainted.ident), "fainted Pokémon gain nothing");
}

// ---------- Catching and running ----------
{
  const pidgey = { species: "Pidgey", level: 5, hp: 20, maxhp: 20, status: "", types: ["Normal", "Flying"] };
  const full = Catching.chance(pidgey, "poke-ball", {});
  assert(full > 0.35 && full < 0.55, "full-HP Pidgey in a Poké Ball: " + full);
  assert(Catching.chance(Object.assign({}, pidgey, { hp: 1 }), "poke-ball", {}) > full, "lower HP should help");
  assert(Catching.chance(Object.assign({}, pidgey, { status: "slp" }), "poke-ball", {}) > full, "sleep should help");
  assert(Catching.chance(pidgey, "ultra-ball", {}) > Catching.chance(pidgey, "great-ball", {}));
  assert.strictEqual(Catching.chance({ species: "Mewtwo", level: 70, hp: 300, maxhp: 300, status: "", types: ["Psychic"] }, "master-ball", {}), 1);

  let caught = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const battle = new Battle({ seed, wild: true, exp: true,
      p1: { name: "P", team: [{ species: "Pikachu", level: 10, moves: ["Growl"] }] },
      p2: { name: "W", team: [{ species: "Pidgey", level: 5, moves: ["Sand Attack"] }] } });
    battle.start();
    assert(battle.choose("p1", { type: "ball", ball: "poke-ball" }).ok);
    battle.choose("p2", { type: "move", move: 0 });
    if (battle.caught) {
      caught++;
      assert(battle.ended && battle.events.some((e) => e[0] === "caught"));
      assert(battle.events.some((e) => e[0] === "-exp"), "Gen 6 gives experience for catching");
    }
  }
  assert(Math.abs(caught / 300 - full) < 0.1, "catch rate " + caught / 300 + " vs predicted " + full);

  const trainer = new Battle({ seed: 1,
    p1: { name: "P", team: [{ species: "Pikachu", level: 10, moves: ["Growl"] }] },
    p2: { name: "T", team: [{ species: "Pidgey", level: 5, moves: ["Growl"] }] } });
  trainer.start();
  assert(!trainer.choose("p1", { type: "ball" }).ok, "can't catch a trainer's Pokémon");
  assert(!trainer.choose("p1", { type: "run" }).ok, "can't run from a trainer");

  const fast = new Battle({ seed: 1, wild: true,
    p1: { name: "P", team: [{ species: "Jolteon", level: 50, moves: ["Growl"] }] },
    p2: { name: "W", team: [{ species: "Shuckle", level: 5, moves: ["Withdraw"] }] } });
  fast.start();
  fast.choose("p1", { type: "run" });
  fast.choose("p2", { type: "move", move: 0 });
  assert(fast.escaped && fast.ended, "a faster Pokémon always escapes");
}

// ---------- Party records ----------
{
  const rng = mulberry32(5);
  const r = Party.create("Charmander", 15, { rng });
  assert.strictEqual(r.hp, Party.maxHp(r));
  assert.strictEqual(r.exp, Experience.expForLevel("Medium Slow", 15));
  r.hp = 0;
  const lead = Party.create("Squirtle", 15, { rng });
  lead.status = "slp";
  const battle = new Battle({ seed: 1, exp: true, wild: true,
    p1: { name: "P", team: [Party.toBattleSet(r), Party.toBattleSet(lead)] },
    p2: { name: "W", team: [Party.toBattleSet(Party.create("Pidgey", 3, { rng }))] } });
  battle.start();
  assert.strictEqual(battle.sides.p1.active.species, "Squirtle", "a fainted Pokémon can't lead");
  assert.strictEqual(battle.sides.p1.active.status, "slp", "status carries into battle");
  battle.sides.p1.active.moves[0].pp = 1;
  Party.syncFromBattle(lead, battle.sides.p1.active);
  assert.strictEqual(lead.moves[0].pp, 1, "PP carries out of battle");
  Party.heal(lead);
  assert.strictEqual(lead.status, "");
  assert.strictEqual(lead.moves[0].pp, MOVES[lead.moves[0].name].pp);
}

// ---------- Evolution ----------
{
  const rng = mulberry32(9);
  const evo = (species, level, edit, ctx) => {
    const r = Party.create(species, level, { rng });
    if (edit) edit(r);
    const e = Evolution.find(r, Object.assign({ trigger: "level" }, ctx));
    return e ? e.into : null;
  };
  assert.strictEqual(evo("Charmander", 15), null);
  assert.strictEqual(evo("Charmander", 16), "Charmeleon");
  assert.strictEqual(evo("Pichu", 10, (r) => { r.happiness = 220; }), "Pikachu");
  assert.strictEqual(evo("Pichu", 10, (r) => { r.happiness = 219; }), null);
  // (Eevee learns Baby-Doll Eyes, a Fairy move, at level 9, so set moves explicitly.)
  const eevee = (moves) => (r) => { r.happiness = 220; r.moves = moves.map((name) => ({ name, pp: 10 })); };
  assert.strictEqual(evo("Eevee", 10, eevee(["Tackle"]), { time: "day" }), "Espeon");
  assert.strictEqual(evo("Eevee", 10, eevee(["Tackle"]), { time: "night" }), "Umbreon");
  assert.strictEqual(evo("Eevee", 10, eevee(["Tackle", "Baby-Doll Eyes"]), { time: "day" }), "Sylveon");
  assert.strictEqual(evo("Wurmple", 7, (r) => { r.personality = 0; }), "Silcoon");
  assert.strictEqual(evo("Wurmple", 7, (r) => { r.personality = 7 << 16; }), "Cascoon");
  assert.strictEqual(evo("Kirlia", 30, (r) => { r.gender = "M"; }), "Gardevoir");
  assert.strictEqual(evo("Kadabra", 50), null, "trade evolutions don't happen on level-up");
  assert.strictEqual(evo("Charmander", 20, (r) => { r.item = "everstone"; }), null);
  assert.strictEqual(evo("Charmander", 20, (r) => { r.hp = 0; }), null, "fainted Pokémon don't evolve");
  const pikachu = Party.create("Pikachu", 20, { rng });
  assert.strictEqual(Evolution.find(pikachu, { trigger: "item", item: "thunder-stone" }).into, "Raichu");
  assert.strictEqual(Evolution.find(Party.create("Eevee", 20, { rng }), { trigger: "item", item: "ice-stone" }).into, "Glaceon");

  // Evolving keeps damage taken and returns the moves learned on evolving.
  const charmeleon = Party.create("Charmeleon", 36, { rng });
  charmeleon.hp -= 20;
  const learned = Evolution.evolve(charmeleon, "Charizard", { method: "level" });
  assert.strictEqual(charmeleon.species, "Charizard");
  assert.strictEqual(charmeleon.hp, Party.maxHp(charmeleon) - 20);
  assert.deepStrictEqual(learned, ["Air Slash"], "Scarlet and Violet: Air Slash on evolving");
  assert.strictEqual(Evolution.shedinja(Party.create("Nincada", 20, { rng })).species, "Shedinja");

  // Burmy: females become the Wormadam matching their cloak, males Mothim.
  for (const cloak of Party.CLOAKS) {
    const burmy = Party.create("Burmy", 20, { rng, cloak });
    burmy.gender = "F";
    const e = Evolution.find(burmy, { trigger: "level" });
    assert.strictEqual(e.into, "Wormadam-" + cloak.charAt(0).toUpperCase() + cloak.slice(1));
    Evolution.evolve(burmy, e.into, e);
    assert.strictEqual(Party.displayName(burmy), "Wormadam");
    assert.strictEqual(burmy.cloak, undefined);
    burmy.gender = "M";
  }
  const maleBurmy = Party.create("Burmy", 20, { rng, cloak: "trash" });
  maleBurmy.gender = "M";
  assert.strictEqual(Evolution.find(maleBurmy, { trigger: "level" }).into, "Mothim");
  assert(Party.CLOAKS.includes(Party.create("Burmy", 5, { rng }).cloak), "every Burmy gets a cloak");
  assert.strictEqual(Party.create("Pidgey", 5, { rng }).cloak, undefined);
  assert.strictEqual(Party.speciesName("Porygon-Z"), "Porygon-Z");
  assert.strictEqual(Party.speciesName("Darmanitan-Standard"), "Darmanitan");

  // Every evolution points at a real species, move and item.
  for (const [from, list] of Object.entries(EVOLUTIONS)) {
    assert(DEX[from], "unknown species " + from);
    for (const e of list) {
      assert(DEX[e.into], from + " evolves into unknown " + e.into);
      if (e.move) assert(MOVES[e.move], "unknown move " + e.move);
      if (e.item) assert(ITEMS[e.item], "unknown item " + e.item);
    }
  }
}

// ---------- Encounters ----------
{
  const rng = mulberry32(11);
  const early = Encounters.speciesFor(5);
  assert(early.includes("Pidgey") && early.includes("Pikachu"));
  assert(!early.includes("Charizard") && !early.includes("Mewtwo") && !early.includes("Pidgeot"));
  assert(Encounters.speciesFor(36).includes("Charizard"));
  assert(!Encounters.speciesFor(100).includes("Mewtwo"), "no legendaries in the wild");
  assert(Encounters.speciesFor(20).includes("Wormadam-Sandy") && !Encounters.speciesFor(19).includes("Wormadam-Trash"));
  assert(!Encounters.speciesFor(100).includes("Charizard-Mega-X"), "no other alternate formes in the wild");
  for (let i = 0; i < 50; i++) {
    const w = Encounters.wild(10, rng);
    assert(w.level >= 7 && w.level <= 10 && w.moves.length >= 1);
    const t = Encounters.trainer(10, rng);
    assert(t.team.length >= 1 && t.team.length <= 3 && t.name);
  }
}

// ---------- Items ----------
{
  const rng = mulberry32(21);
  const r = Party.create("Pikachu", 20, { rng });
  const max = Party.maxHp(r);
  assert(!Bag.canUseOn(r, "potion"), "a Potion does nothing at full HP");
  r.hp = 5;
  assert.strictEqual(Bag.useOn(r, "potion").healed, 20);
  assert.strictEqual(r.hp, 25);
  Bag.useOn(r, "max-potion");
  assert.strictEqual(r.hp, max);
  r.status = "par";
  assert(!Bag.canUseOn(r, "antidote") && Bag.canUseOn(r, "paralyze-heal") && Bag.canUseOn(r, "full-heal"));
  Bag.useOn(r, "paralyze-heal");
  assert.strictEqual(r.status, "");
  r.hp = 0;
  assert(!Bag.canUseOn(r, "potion") && Bag.canUseOn(r, "revive"));
  Bag.useOn(r, "revive");
  assert.strictEqual(r.hp, Math.floor(max / 2));
  r.moves[0].pp = 0;
  Bag.useOn(r, "ether", { move: 0 });
  assert.strictEqual(r.moves[0].pp, 10);
  Bag.useOn(r, "max-elixir");
  assert(r.moves.every((m) => m.pp === MOVES[m.name].pp));
  for (let i = 0; i < 30; i++) if (Bag.canUseOn(r, "protein")) Bag.useOn(r, "protein");
  assert.strictEqual(r.evs.atk, 252, "vitamins stop at 252 EVs");

  // Rare Candy: a level, the new level's moves, and friendship.
  const c = Party.create("Charmander", 16, { rng });
  const happy = c.happiness;
  assert.deepStrictEqual(Bag.levelUp(c), ["Fire Fang"]);
  assert.strictEqual(c.level, 17);
  assert(c.happiness > happy);
  assert.strictEqual(Evolution.find(c, { trigger: "level" }).into, "Charmeleon");

  // Stones only count as usable on Pokémon they evolve.
  assert(Bag.canUseOn(Party.create("Eevee", 5, { rng }), "thunder-stone"));
  assert(!Bag.canUseOn(Party.create("Pidgey", 5, { rng }), "thunder-stone"));

  assert.strictEqual(Bag.name("poke-ball"), "Poké Ball");
  assert.strictEqual(Bag.name("kings-rock"), "King's Rock");
  // FireRed's descriptions, three lines at most, in mixed case.
  assert.strictEqual(Bag.description("potion"), "A spray-type wound medicine.\nIt restores the HP of one Pokémon\nby 20 points.");
  assert.strictEqual(Bag.description("fire-stone"), "Evolves certain Pokémon\nwhen used.");
  assert.strictEqual(Bag.description("up-grade"), "Evolves certain Pokémon\nwhen used.");
  for (const [id, d] of Object.entries(window.ITEM_DESCRIPTIONS)) assert(d.split("\n").length <= 3 && !/POK/.test(d), id);
  assert.strictEqual(Bag.pocket("great-ball"), "Poké Balls");
  assert.strictEqual(Bag.pocket("super-potion"), "Medicine");
  assert.strictEqual(Bag.pocket("oran-berry"), "Berries");
  assert.strictEqual(Bag.pocket("fire-stone"), "Items");
  assert.strictEqual(Bag.sellPrice("potion"), 150);
  // The Fishing Rod is a key item; the weather rocks and the like sell for Gen 6's ₽100.
  assert.strictEqual(Bag.pocket("fishing-rod"), "Key Items");
  for (const id of ["smooth-rock", "heat-rock", "damp-rock", "icy-rock", "iron-ball", "light-clay"]) assert.strictEqual(Bag.sellPrice(id), 100, id);
  // Each Mart sells FireRed's list for it, read from the clerk's script.
  const viridian = WORLD_MAPS.ViridianCity_Mart.people.find((p) => p.mart).mart;
  assert.deepStrictEqual(viridian, ["poke-ball", "potion", "antidote", "paralyze-heal"]);
  assert.deepStrictEqual(Bag.martStock(viridian).map((s) => s.price), [200, 300, 100, 200]);
  for (const m of Object.values(WORLD_MAPS)) for (const p of m.people) for (const { item } of Bag.martStock(p.mart)) {
    assert(ITEMS[item] && Bag.price(item) > 0, "mart item " + item);
    assert(ITEM_SPRITES[item], "no sprite for mart item " + item);
  }
}
// Tera Raid dens (game/raid-dens.js): on their maps, on free tiles; stars by
// Badges and Lures; the boss; rewards; the Dojo's back room and its door.
{
  assert.strictEqual(RaidDens.DENS.length, 18);
  assert.deepStrictEqual(RaidDens.DENS.map((d) => d.type).sort(),
    ["Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying", "Ghost", "Grass", "Ground", "Ice", "Normal", "Poison", "Psychic", "Rock", "Steel", "Water"]);
  assert(!RaidDens.POOLS.Dark.some((t) => t.includes("Moltres-Galar")), "no Galarian Moltres");
  // (A raid from before its den changed type is gone.)
  assert.strictEqual(RaidDens.active({ raidDens: { indigo: { stars: 1, species: "Magnemite", level: 12 } } }, "indigo"), null);
  assert(RaidDens.active({ raidDens: { indigo: { stars: 1, species: "Dratini", level: 12 } } }, "indigo"));
  for (const d of RaidDens.DENS) {
    const m = WORLD_MAPS[d.map];
    assert(m, "no map " + d.map);
    const here = m.people.filter((p) => p.x === d.x && p.y === d.y);
    assert(here.length === 1 && here[0].script === d.script, "den " + d.id + " alone on its tile");
    assert(!m.collision[d.y * m.width + d.x] && !World.warpAt(d.map, d.x, d.y), "den " + d.id + " on a free tile");
    assert.strictEqual(RaidDens.byScript(d.script), d);
    for (const tier of RaidDens.POOLS[d.type]) for (const sp of tier) assert(DEX[sp] && RaidDens.isKanto(sp), sp + ": a Kanto Pokémon");
  }
  for (const f of ["raid_den", "raid_den_active"]) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + f + ".png")), f);
  // Stars: 1 with no Badges, up to 5 with all eight; stronger Lures, more stars.
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(RaidDens.maxStars), [1, 1, 2, 2, 3, 3, 4, 4, 5]);
  // Its turn limit, more for more stars; the battle screen blows you out after it (raidTurns).
  assert.deepStrictEqual(RaidDens.TURNS.slice(1), [10, 10, 12, 15, 20]);
  assert(/raidTurns: opts\.raid \? RaidDens\.TURNS\[opts\.raid\]/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  assert(/battle\.raidTimedOut = true/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")));
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mean = (lure, badges) => { let t = 0; for (let i = 0; i < 3000; i++) t += RaidDens.rollStars(lure, badges, rng); return t / 3000; };
  for (let i = 0; i < 500; i++) assert(RaidDens.rollStars("max-lure", 0, rng) === 1 && RaidDens.rollStars("max-lure", 3, rng) <= 2);
  const [a, b, c] = ["lure", "super-lure", "max-lure"].map((l) => mean(l, 8));
  assert(a < b && b < c && a < 2 && c > 3.3, "lure means " + [a, b, c]);
  // A raid: in the den's pool, its level; its boss Terastallizes into the den's type.
  const flags = {}, den = RaidDens.DENS.find((d) => d.type === "Fire");
  const raid = RaidDens.start(flags, den, "max-lure", 8, rng);
  assert.strictEqual(RaidDens.active(flags, den.id), raid);
  assert(RaidDens.POOLS.Fire[raid.stars - 1].includes(raid.species) && raid.level >= RaidDens.LEVELS[raid.stars] && raid.level <= RaidDens.LEVELS[raid.stars] + 3);
  const boss = RaidDens.boss(den, raid, rng);
  assert(boss.teraAce && boss.teraType === "Fire" && boss.level === raid.level && boss.ivs.atk === RaidDens.IVS[raid.stars]);
  // In battle: its HP times the stars' multiplier, at full; it Terastallizes when it moves.
  const bb = new Battle({ p1: { name: "P", team: [Party.toBattleSet(Party.create("Mewtwo", 100, { rng }))] },
    p2: { name: "Wild", tera: true, team: [Object.assign(Party.toBattleSet(boss), { raidHp: RaidDens.HP[5] })] }, wild: true, seed: 3 });
  const bm = bb.sides.p2.pokemon[0];
  assert.strictEqual(bm.maxhp, Math.round(bm.stats.hp * 4));
  assert.strictEqual(bm.hp, bm.maxhp);
  RaidDens.finish(flags, den.id);
  assert.strictEqual(RaidDens.active(flags, den.id), null);
  // Rewards: money, candies, vitamins and Berries, more with more stars.
  // (Kanto's: not Johto's Teddiursa, nor a Paldean Pokémon; but Scizor and Alolan Sandshrew.)
  assert(!RaidDens.isKanto("Teddiursa") && !RaidDens.isKanto("Lechonk") && RaidDens.isKanto("Scizor") && RaidDens.isKanto("Sandshrew-Alola"));
  // Metapod and Kakuna know more than Harden (their pre-evolutions' moves).
  const bug = RaidDens.DENS.find((d) => d.type === "Bug");
  const meta = RaidDens.boss(bug, { stars: 2, species: "Metapod", level: 20 }, rng), kak = RaidDens.boss(bug, { stars: 2, species: "Kakuna", level: 20 }, rng);
  assert(meta.moves.some((m) => m.name === "Tackle") && kak.moves.some((m) => m.name === "Poison Sting"));
  // Tera Shards of the den's type, more for more stars.
  const fire = RaidDens.rewards(3, rng, "Fire").items.find(([id]) => id === "fire-tera-shard");
  assert(fire && fire[1] === RaidDens.SHARDS[3] && RaidDens.SHARDS[5] > RaidDens.SHARDS[1]);
  const total = (st) => { const r = RaidDens.rewards(st, rng); return [r.money, r.items.reduce((n, [, k]) => n + k, 0), r.items]; };
  const [m1, n1, i1] = total(1), [m5, n5, i5] = total(5);
  assert(m5 > m1 && n5 > n1, "5-star rewards more");
  const VIT = ["hp-up", "protein", "iron", "calcium", "zinc", "carbos"];
  for (const items of [i1, i5]) {
    assert(items.every(([id]) => ITEMS[id]));
    assert(items.some(([id]) => /^exp-candy/.test(id)) && items.some(([id]) => /-berry$/.test(id)));
  }
  // Wings from 1- and 2-star raids, vitamins from 3 stars up.
  for (const st of [1, 2, 3, 4, 5]) {
    const items = RaidDens.rewards(st, rng).items;
    const wings = items.some(([id]) => /-wing$/.test(id)), vits = items.some(([id]) => VIT.includes(id));
    assert(st <= 2 ? wings && !vits : vits && !wings, st + " stars: " + JSON.stringify(items));
  }
  assert(i5.some(([id]) => id === "exp-candy-xl") && !i1.some(([id]) => id === "exp-candy-xl"));
  // The Dojo's back room: its way out back to the Dojo's door, which is behind a patch.
  const room = WORLD_MAPS.SaffronCity_Dojo_DenRoom, dojo = WORLD_MAPS.SaffronCity_Dojo;
  const door = dojo.warps.find((w) => w.map === "SaffronCity_Dojo_DenRoom");
  assert(door && dojo.patches.denroom && room.warps.every((w) => w.map === "SaffronCity_Dojo" && dojo.warps[w.warp] === door));
  assert(dojo.collision[door.y * dojo.width + door.x], "the wall, until the door's patch is on");
  // Mr. Psychic's back room, the same; its door opens with his TM.
  const proom = WORLD_MAPS.SaffronCity_MrPsychicsHouse_DenRoom, house = WORLD_MAPS.SaffronCity_MrPsychicsHouse;
  const pdoor = house.warps.find((w) => w.map === "SaffronCity_MrPsychicsHouse_DenRoom");
  assert(pdoor && house.patches.denroom && proom.warps.every((w) => w.map === "SaffronCity_MrPsychicsHouse" && house.warps[w.warp] === pdoor));
  assert(house.collision[pdoor.y * house.width + pdoor.x] && proom.warps.every((w) => !proom.collision[w.y * proom.width + w.x]));
  assert(/MrPsychicsHouse"\) return f\.gotTM29 \? \["denroom"\]/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  // Celadon's Berry Farm: its patch (the plots and the sign, blocked; the den's tile free) and its sign.
  const farm = WORLD_MAPS.CeladonCity.patches.berryfarm, gd = RaidDens.DENS.find((d) => d.type === "Grass");
  assert(farm && gd.map === "CeladonCity" && gd.x >= farm.x && gd.x < farm.x + farm.w && gd.y >= farm.y && gd.y < farm.y + farm.h);
  assert(!farm.collision.some(([x, y]) => x === gd.x && y === gd.y) && WORLD_MAPS.CeladonCity.signs.some((sg) => /BerryFarm/.test(sg.script)));
  for (const f of ["CeladonCity-patch-berryfarm", "SaffronCity_MrPsychicsHouse-patch-denroom", "SaffronCity_MrPsychicsHouse_DenRoom"])
    assert(fs.existsSync(path.join(root, "assets/world/maps/" + f + ".png")), f);
}

// Effect Spore: the status it gives says it's Effect Spore's, and whose, for
// "… has been paralyzed due to the opposing …'s Effect Spore!".
{
  let seen = null;
  for (let seed = 1; seed < 60 && !seen; seed++) {
    const b = new Battle({ seed, p1: { name: "A", team: [{ species: "Machamp", level: 50, moves: ["Tackle"] }] },
      p2: { name: "B", team: [{ species: "Breloom", level: 100, ability: "Effect Spore", moves: ["Splash"] }] } });
    b.start();
    for (let t = 0; t < 5 && !seen && !b.ended; t++) {
      b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 });
      seen = b.events.find((e) => e[0] === "-status" && /^p1/.test(e[1]));
    }
  }
  assert(seen, "Effect Spore went off");
  assert.strictEqual(seen[3], "[from] ability: Effect Spore");
  assert(/^p2a?: Breloom/.test(seen[4]), "and whose: " + seen[4]);
  assert(/has been " \+ \(STATUS_DONE\[b\]/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")));
}

// The EV-lowering Berries: their stat's EVs down 10, friendship up, told as such;
// the starters' catch rates; the Fishing Rod for every save.
{
  const r = Party.create("Pikachu", 20, { rng: () => 0.5 });
  r.evs = { hp: 25, atk: 4 }; r.happiness = 100;
  const hp0 = Party.maxHp(r); r.hp = hp0;
  assert(Bag.canUseOn(r, "pomeg-berry") && Bag.pocket("pomeg-berry") === "Berries");
  const out = Bag.useOn(r, "pomeg-berry");
  assert.deepStrictEqual([out.evDown, out.evStat, r.evs.hp], [10, "hp", 15]);
  assert(r.happiness > 100, "friendlier");
  assert(r.hp <= Party.maxHp(r) && r.hp >= 1);
  Bag.useOn(r, "kelpsy-berry");
  assert.strictEqual(r.evs.atk, 0, "not below 0");
  const maxed = Object.assign(Party.create("Pikachu", 20), { evs: {}, happiness: 255 });
  assert(!Bag.canUseOn(maxed, "grepa-berry"), "nothing to lower and as friendly as can be");
  for (const [b, st] of [["pomeg", "HP"], ["kelpsy", "Attack"], ["qualot", "Defense"], ["hondew", "Sp. Atk"], ["grepa", "Sp. Def"], ["tamato", "Speed"]]) {
    assert(/friendly/.test(Bag.description(b + "-berry")) && Bag.description(b + "-berry").includes("base " + st), b);
  }
  assert.deepStrictEqual(["Bulbasaur", "Charmander", "Squirtle"].map((sp) => DEX[sp].captureRate), [120, 120, 120]);
  assert.strictEqual(Player.create("RED", 0).bag["fishing-rod"], 1, "a new game starts with the Fishing Rod");
  const before = JSON.parse(Player.serialize(Object.assign(Player.create("RED", 0), { bag: { potion: 1 } })));
  assert.strictEqual(Player.load(before).player.bag["fishing-rod"], 1, "and so does an older save");
}

// Tera Shards: one of each type, in the Power-up pocket, with a picture; 50
// change a Pokémon's Tera Type (not to the one it has, nor Ogerpon's).
{
  const types = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
    "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"];
  for (const t of types) {
    const id = t.toLowerCase() + "-tera-shard";
    assert(ITEMS[id] && ITEM_SPRITES[id] && Bag.pocket(id) === "Power-up" && Bag.teraShardType(id) === t && Bag.name(id) === t + " Tera Shard", id);
  }
  const mon = Object.assign(Party.create("Pikachu", 20), { teraType: "Electric" });
  assert(Bag.canUseOn(mon, "fire-tera-shard") && !Bag.canUseOn(mon, "electric-tera-shard") && !Bag.canUseOn(Party.create("Ogerpon", 70), "fire-tera-shard"));
  assert.strictEqual(Bag.TERA_SHARDS_NEEDED, 50);
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  assert(/WILD_TERA_CHANCE = 0\.1/.test(gameJs) && /Object\.assign\(foe\.team\[0\], \{ teraType: wildTera, teraAce: true \}\)/.test(gameJs), "wild Tera Pokémon");
}

// Lures beside the Repels of their kind; Wings and Exp. Candies.
{
  assert.deepStrictEqual(Bag.martStock(["potion", "repel", "super-repel"]).map((x) => x.item), ["potion", "repel", "lure", "super-repel", "super-lure"]);
  assert.deepStrictEqual(["lure", "super-lure", "max-lure"].map((id) => [Bag.pocket(id), Bag.price(id), !!ITEM_SPRITES[id]]),
    [["Items", 400, true], ["Items", 700, true], ["Items", 900, true]]);
  // A Lure doubles the chance a step finds a wild Pokémon.
  const tries = (lure) => {
    let n = 0, seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const grass = (() => { const m = WORLD_MAPS.Route1; for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (World.isGrass(World.blockAt("Route1", x, y))) return [x, y]; })();
    for (let i = 0; i < 4000; i++) if (World.stepEncounter({ steps: 99, prev: World.blockAt("Route1", ...grass).behavior }, "Route1", grass[0], grass[1], { rng, lure })) n++;
    return n;
  };
  const plain = tries(false), lured = tries(true);
  assert(lured > plain * 1.7 && lured < plain * 2.3, "lure " + plain + " -> " + lured);
  // A Wing: 1 EV; a vitamin 10; either up to 252 in a stat (510 in all).
  const v = Party.create("Pidgey", 20, { rng });
  v.evs = { atk: 248 };
  assert.strictEqual(Bag.useOn(v, "protein").ev, 4, "a vitamin up to 252");
  assert(!Bag.canUseOn(v, "protein") && !Bag.canUseOn(v, "muscle-wing"));
  const w = Party.create("Pidgey", 20, { rng });
  w.evs = { atk: 251 };
  assert(Bag.canUseOn(w, "muscle-wing") && Bag.canUseOn(w, "protein"));
  assert.strictEqual(Bag.useOn(w, "muscle-wing").ev, 1);
  assert.strictEqual(w.evs.atk, 252);
  assert(!Bag.canUseOn(w, "muscle-wing"));
  assert.deepStrictEqual(["health-wing", "exp-candy-xl"].map((id) => [Bag.pocket(id), Bag.name(id)]), [["Power-up", "Health Wing"], ["Power-up", "Exp. Candy XL"]]);
  // An Exp. Candy: its Exp. Points, and every level they bring.
  const c = Party.create("Pidgey", 5, { rng });
  const r = Bag.expCandy(c, "exp-candy-m");
  assert.strictEqual(r.exp, 3000);
  assert(c.level > 10 && r.levels.length === c.level - 5 && r.levels.map((l) => l.level).join() === Array.from({ length: c.level - 5 }, (_, i) => i + 6).join());
  assert.strictEqual(c.level, Experience.levelForExp(Experience.growthRate("Pidgey"), c.exp));
  const top = Party.create("Pidgey", 100, { rng });
  assert(!Bag.canUseOn(top, "exp-candy-xs"));
}

// Items in battle: before moves, on benched and fainted Pokémon too.
{
  const battle = new Battle({ seed: 2,
    p1: { name: "P", team: [{ species: "Pikachu", level: 20, moves: ["Thunder Shock", "Growl"], hp: 10, status: "par", pp: [2, 40] },
                            { species: "Eevee", level: 20, moves: ["Tackle"], hp: 0 }] },
    p2: { name: "T", team: [{ species: "Rattata", level: 3, moves: ["Tail Whip"] }] } });
  battle.start();
  const [pika, eevee] = battle.sides.p1.pokemon;
  assert(!battle.choose("p1", { type: "item", item: "potion", target: 1 }).ok, "no Potions on fainted Pokémon");
  assert(!battle.choose("p1", { type: "item", item: "rare-candy", target: 0 }).ok, "no Rare Candy in battle");
  const turn = (choice) => { assert(battle.choose("p1", choice).ok); battle.choose("p2", { type: "move", move: 0 }); };
  turn({ type: "item", item: "super-potion", target: 0 });
  assert.strictEqual(pika.hp, Math.min(pika.maxhp, 60));
  const order = battle.events.map((e) => e[0]);
  assert(order.indexOf("-useitem") < order.lastIndexOf("move"), "items go before moves");
  turn({ type: "item", item: "full-heal", target: 0 });
  assert.strictEqual(pika.status, "");
  turn({ type: "item", item: "revive", target: 1 });
  assert(!eevee.fainted && eevee.hp === Math.floor(eevee.maxhp / 2));
  turn({ type: "item", item: "ether", target: 0, move: 0 });
  assert.strictEqual(pika.moves[0].pp, 12);
}

// ---------- Player, money, PC ----------
{
  const rng = mulberry32(31);
  const p = Player.create("Ash");
  assert.strictEqual(p.money, Player.STARTING_MONEY);
  for (let i = 0; i < 7; i++) Player.receive(p, Party.create("Pidgey", 5, { rng }));
  assert.strictEqual(p.party.length, 6);
  assert.strictEqual(Player.boxCount(p.boxes[0]), 1, "the seventh goes to the PC");
  assert.strictEqual(p.boxes.length, 30);
  assert.strictEqual(p.boxes[0].length, 30);
  assert(Player.hasCaught(p, "Pidgey"));
  assert.strictEqual(Player.withdraw(p, 0, 0), "Your party is full.");
  assert.strictEqual(Player.deposit(p, 0, 0), null);
  assert.strictEqual(Player.withdraw(p, 0, 0), null);
  p.party.forEach((r, i) => { r.hp = i === 0 ? 10 : 0; });
  assert(/no Pokémon left/.test(Player.deposit(p, 0, 1)), "can't deposit the last healthy Pokémon");

  // A party Pokémon and a box Pokémon can trade places, but not to leave the
  // party with nothing that can battle.
  {
    const q = Player.create("Q");
    Player.receive(q, Party.create("Pidgey", 5, { rng }));
    q.boxes[0][0] = Object.assign(Party.create("Rattata", 5, { rng }), { hp: 0 });
    assert(/no Pokémon left/.test(Player.swapWithBox(q, 0, 0, 0)));
    q.boxes[0][0].hp = 5;
    assert.strictEqual(Player.swapWithBox(q, 0, 0, 0), null);
    assert.deepStrictEqual([q.party[0].species, q.boxes[0][0].species], ["Rattata", "Pidgey"]);
  }

  // Saves from before FireRed's PC: 8 packed boxes become 30 of 30 slots.
  {
    const old = JSON.parse(Player.serialize(p));
    old.version = 2; old.boxes = [[p.party[0]]]; delete old.boxNames; delete old.boxWallpapers;
    const { player: o } = Player.load(old);
    assert.strictEqual(o.boxes.length, 30);
    assert.strictEqual(o.boxes[0][0].species, "Pidgey");
    assert.strictEqual(o.boxes[0][1], null);
    assert.deepStrictEqual([o.boxNames[29], o.boxWallpapers[5]], ["BOX30", 1]);
    assert.strictEqual(Player.deposit(o, 1, 3, 7), null);
    assert(o.boxes[3][7] && Player.boxCount(o.boxes[3]) === 1, "deposit into a chosen slot");
  }

  assert(!Player.removeItem(p, "ultra-ball"));
  Player.addItem(p, "ultra-ball", 2);
  assert(Player.removeItem(p, "ultra-ball", 2) && !("ultra-ball" in p.bag));

  // PC item storage starts with a Potion.
  assert.deepStrictEqual(p.pcItems, { potion: 1 });
  assert(Player.withdrawItem(p, "potion", 1) && !("potion" in p.pcItems));
  assert.strictEqual(p.bag.potion, 1);
  assert(!Player.withdrawItem(p, "potion", 1), "nothing left to withdraw");
  Player.addItem(p, "potion", 1);
  assert(Player.depositItem(p, "potion", 2) && p.pcItems.potion === 2 && !("potion" in p.bag));
  assert(!Player.depositItem(p, "ultra-ball", 1), "can't deposit what you don't have");
  assert.deepStrictEqual(Player.load(JSON.parse(Player.serialize(p))).player.pcItems, { potion: 2 });

  assert.strictEqual(Player.prizeMoney("Ace Trainer Vera", [{ level: 10 }, { level: 22 }]), 60 * 22);
  assert.strictEqual(Player.prizeMoney("Youngster Ben", [{ level: 5 }]), 80);
  p.money = 1000;
  assert.strictEqual(Player.blackoutLoss(p), 8 * 5, "0 badges: 8 x highest level");
  p.money = 10;
  assert.strictEqual(Player.blackoutLoss(p), 10, "can't lose more than you have");
}

// ---------- Saving ----------
{
  const rng = mulberry32(41);
  const p = Player.create("Misty");
  Player.receive(p, Party.create("Staryu", 12, { rng }));
  Player.receive(p, Party.create("Burmy", 10, { rng, cloak: "sandy" }));
  Player.markSeen(p, "Onix");
  Player.addItem(p, "fire-stone");
  p.badges.push("Cascade");
  assert(Save.write(p).ok);
  const back = Save.read();
  assert.strictEqual(back.error, null);
  assert.deepStrictEqual(JSON.parse(Player.serialize(back.player)), JSON.parse(Player.serialize(p)), "save round-trips exactly");

  const file = Save.fromFile(Save.toFile(p));
  assert.strictEqual(file.player.party[1].cloak, "sandy");

  // Damaged or edited saves load what they can.
  const data = JSON.parse(Save.toFile(p));
  data.party.push({ species: "Fakemon" });
  data.party[0].level = 250;
  data.party[0].moves.push({ name: "Not A Move", pp: 5 });
  data.bag["not-an-item"] = 4;
  delete data.flags;
  const fixed = Player.load(data);
  assert.strictEqual(fixed.player.party.length, 2);
  assert.strictEqual(fixed.player.party[0].level, 100);
  assert(!fixed.player.party[0].moves.some((m) => m.name === "Not A Move"));
  assert(!("not-an-item" in fixed.player.bag));
  assert.deepStrictEqual(fixed.player.flags, {});
  assert(fixed.warnings.length === 1);
  assert.throws(() => Save.fromFile("not json"), /isn't a save file/);
  assert.throws(() => Player.load({ version: Player.VERSION + 1, party: [] }), /newer version/);
  Save.clear();
  assert.strictEqual(Save.read().player, null);
}

// ---------- TMs, PP Ups and mints ----------
{
  const rng = mulberry32(51);
  // TMs: X and Y's TM01-TM100 in order without Flash and Rock Smash (HMs here),
  // then ORAS's Secret Power: TM01-TM99, then TM100 Bullet Seed (FireRed's TM09).
  // HMs cover every region.
  const XY = ["Hone Claws", "Dragon Claw", "Psyshock", "Calm Mind", "Roar", "Toxic", "Hail", "Bulk Up", "Venoshock",
    "Hidden Power", "Sunny Day", "Taunt", "Ice Beam", "Blizzard", "Hyper Beam", "Light Screen", "Protect", "Rain Dance",
    "Roost", "Safeguard", "Frustration", "Solar Beam", "Smack Down", "Thunderbolt", "Thunder", "Earthquake", "Return",
    "Dig", "Psychic", "Shadow Ball", "Brick Break", "Double Team", "Reflect", "Sludge Wave", "Flamethrower",
    "Sludge Bomb", "Sandstorm", "Fire Blast", "Rock Tomb", "Aerial Ace", "Torment", "Facade", "Flame Charge", "Rest",
    "Attract", "Thief", "Low Sweep", "Round", "Echoed Voice", "Overheat", "Steel Wing", "Focus Blast", "Energy Ball",
    "False Swipe", "Scald", "Fling", "Charge Beam", "Sky Drop", "Incinerate", "Quash", "Will-O-Wisp", "Acrobatics",
    "Embargo", "Explosion", "Shadow Claw", "Payback", "Retaliate", "Giga Impact", "Rock Polish", "Flash", "Stone Edge",
    "Volt Switch", "Thunder Wave", "Gyro Ball", "Swords Dance", "Struggle Bug", "Psych Up", "Bulldoze", "Frost Breath",
    "Rock Slide", "X-Scissor", "Dragon Tail", "Infestation", "Poison Jab", "Dream Eater", "Grass Knot", "Swagger",
    "Sleep Talk", "U-turn", "Substitute", "Flash Cannon", "Trick Room", "Wild Charge", "Rock Smash", "Snarl",
    "Nature Power", "Dark Pulse", "Power-Up Punch", "Dazzling Gleam", "Confide"];
  const HMS = ["Cut", "Fly", "Surf", "Strength", "Flash", "Whirlpool", "Waterfall", "Rock Smash", "Dive", "Defog", "Rock Climb"];
  const TMS = XY.filter((m) => !HMS.includes(m)).concat("Secret Power", "Bullet Seed", "Water Pulse", "Shock Wave", "Giga Drain", "Iron Tail", "Focus Punch", "Skill Swap", "Snatch");
  assert.strictEqual(TMS.length, 107);
  TMS.forEach((move, i) => assert.strictEqual(Bag.machineMove("tm" + String(i + 1).padStart(2, "0")), move, "TM" + (i + 1)));
  HMS.forEach((move, i) => assert.strictEqual(Bag.machineMove("hm" + String(i + 1).padStart(2, "0")), move, "HM" + (i + 1)));
  // (And after TM107, Johto's: HGSS's TMs for moves none of these teaches, data/johto-maps.js.)
  const johtoTMs = Bag.machines().filter((id) => /^tm\d+$/.test(id) && +id.slice(2) > 107);
  assert.strictEqual(Bag.machines().length, 118 + johtoTMs.length);
  assert(johtoTMs.every((id) => !TMS.includes(Bag.machineMove(id)) && !HMS.includes(Bag.machineMove(id))) && !ITEMS.hm12, "past TM107 only Johto's new moves; no HM12");
  assert.strictEqual(new Set(johtoTMs.map(Bag.machineMove)).size, johtoTMs.length, "one TM each");
  // Every move Pokémon learn by machine in Gen 6 is a TM or HM here; the
  // machines Gen 6 had none for (Bullet Seed, Whirlpool, Defog, Rock Climb)
  // take their compatibility from other generations.
  // (Gen 6's species: later generations' learnsets keep their TMs that are machines here.)
  const tmMoves = new Set();
  for (const [s, l] of Object.entries(LEARNSETS_GEN6)) if (!((DEX[s] || {}).gen >= 7)) for (const m of l.tm || []) tmMoves.add(m);
  const machineMoves = Bag.machines().map(Bag.machineMove);
  for (const m of tmMoves) assert(machineMoves.includes(m), "no machine for " + m);
  assert.deepStrictEqual(machineMoves.filter((m) => !tmMoves.has(m) && !johtoTMs.some((id) => Bag.machineMove(id) === m)), ["Bullet Seed", "Water Pulse", "Shock Wave", "Giga Drain", "Iron Tail", "Focus Punch", "Skill Swap", "Snatch", "Whirlpool", "Defog", "Rock Climb"]);
  for (const m of ["Whirlpool", "Defog", "Rock Climb", "Bullet Seed"]) assert(MACHINE_LEARNERS[m].length > 50, "who can use " + m);
  // (For Gen 7's and 8's Pokémon, any generation's machines: tools/build-gen7.js, build-gen8.js.)
  assert((MACHINE_LEARNERS.Thief || []).every((s) => DEX[s].gen >= 7), "TMs Gen 6 had keep Gen 6's compatibility");
  assert(MACHINE_LEARNERS.Thief.includes("Incineroar"), "Gen 7's Pokémon: any generation's machines");
  assert(Bag.canUseOn(Party.create("Oddish", 20, { rng }), "tm100") && !Bag.canUseOn(Party.create("Pidgey", 20, { rng }), "tm100"), "Bullet Seed: Oddish yes, Pidgey no");
  assert.strictEqual(Bag.name("tm100"), "TM100 Bullet Seed");
  // The move tutors teach as in FireRed: Charmander can learn Mega Punch.
  assert(TUTOR_LEARNERS["Mega Punch"].includes("Charmander") && TUTOR_LEARNERS["Seismic Toss"].includes("Charmander"));
  // Escape Ropes work where FireRed allows escaping.
  // (And in Johto: its caves, Ilex Forest and its towers and dungeons, as HGSS's.)
  for (const m of ["UnionCave_B2F", "IlexForest", "SproutTower_3F", "BellTower_5F", "TeamRocketHideout_B3F", "IcePath_B1F"]) assert(WORLD_MAPS[m].allowEscaping, m);
  for (const m of ["VioletCity", "Route36", "GoldenrodCity_DepartmentStore_1F", "EcruteakCity_Gym"]) assert(!WORLD_MAPS[m].allowEscaping, m);
  assert.deepStrictEqual(Object.keys(WORLD_MAPS).filter((m) => WORLD_MAPS[m].allowEscaping && WORLD_MAPS[m].region !== "johto"), ["ViridianForest", "MtMoon_1F", "MtMoon_B1F", "MtMoon_B2F",
    "DiglettsCave_NorthEntrance", "DiglettsCave_B1F", "DiglettsCave_SouthEntrance", "RockTunnel_1F", "RockTunnel_B1F",
    "PokemonTower_1F", "PokemonTower_2F", "PokemonTower_3F", "PokemonTower_4F", "PokemonTower_5F", "PokemonTower_6F", "PokemonTower_7F",
    "RocketHideout_B1F", "RocketHideout_B2F", "RocketHideout_B3F", "RocketHideout_B4F",
    "SaffronCity_Gym", "SilphCo_1F", "SilphCo_2F", "SilphCo_3F", "SilphCo_4F", "SilphCo_5F", "SilphCo_6F", "SilphCo_7F",
    "SilphCo_8F", "SilphCo_9F", "SilphCo_10F", "SilphCo_11F", "SeafoamIslands_1F", "SeafoamIslands_B1F", "SeafoamIslands_B2F",
    "SeafoamIslands_B3F", "SeafoamIslands_B4F", "PokemonMansion_1F", "PokemonMansion_2F", "PokemonMansion_3F", "PokemonMansion_B1F",
    "PowerPlant", "VictoryRoad_1F", "VictoryRoad_2F", "VictoryRoad_3F",
    "MtEmber_Summit", "MtEmber_SummitPath_1F", "MtEmber_SummitPath_2F", "MtEmber_SummitPath_3F", "MtEmber_RubyPath_1F",
    "MtEmber_RubyPath_B1F", "MtEmber_RubyPath_B1F_Stairs", "MtEmber_RubyPath_B2F", "MtEmber_RubyPath_B2F_Stairs",
    "MtEmber_RubyPath_B3F", "MtEmber_RubyPath_B4F", "MtEmber_RubyPath_B5F", "ThreeIsland_BerryForest", "ThreeIsland_DunsparceTunnel",
    "FourIsland_IcefallCave_Entrance", "FourIsland_IcefallCave_1F", "FourIsland_IcefallCave_B1F", "FourIsland_IcefallCave_Back",
    "FiveIsland_RocketWarehouse", "FiveIsland_LostCave_Entrance"].concat(Array.from({ length: 14 }, (_, i) => "FiveIsland_LostCave_Room" + (i + 1)),
    ["SixIsland_DottedHole_1F", "SixIsland_DottedHole_B1F", "SixIsland_DottedHole_B2F", "SixIsland_DottedHole_B3F", "SixIsland_DottedHole_B4F",
      "SixIsland_DottedHole_SapphireRoom", "SixIsland_PatternBush", "SixIsland_AlteringCave", "SevenIsland_SevaultCanyon_TanobyKey"],
    ["Monean", "Liptoo", "Weepth", "Dilford", "Scufib", "Rixy", "Viapois"].map((c) => "SevenIsland_TanobyRuins_" + c + "Chamber"),
    ["CeruleanCave_1F", "CeruleanCave_2F", "CeruleanCave_B1F"]));
  assert(WORLD_MAPS.MtMoon_1F.people.some((p) => p.item === "tm100"), "FireRed's TM09 in Mt. Moon is TM100 Bullet Seed here");
  assert(Bag.canUseOn(Party.create("Gyarados", 30, { rng }), "hm06"), "Gyarados can use Whirlpool");
  assert(Bag.canUseOn(Party.create("Pidgeot", 30, { rng }), "hm10"), "Pidgeot can use Defog");
  assert(Bag.canUseOn(Party.create("Geodude", 30, { rng }), "hm11"), "Geodude can use Rock Climb");
  assert(!Bag.canUseOn(Party.create("Pidgeot", 30, { rng }), "hm11"), "Pidgeot can't use Rock Climb");
  assert.strictEqual(Bag.name("tm24"), "TM24 Thunderbolt");
  assert.strictEqual(Bag.name("tm99"), "TM99 Secret Power");
  assert.strictEqual(Bag.name("hm11"), "HM11 Rock Climb");
  assert.deepStrictEqual(Bag.machines().slice(98, 107), ["tm99", "tm100", "tm101", "tm102", "tm103", "tm104", "tm105", "tm106", "tm107"]);
  assert.deepStrictEqual(Bag.machines().filter((id) => /^hm/.test(id)).slice(0, 2), ["hm01", "hm02"]);
  assert.strictEqual(Bag.name("tm103"), "TM103 Giga Drain");
  assert.strictEqual(Bag.name("tm104"), "TM104 Iron Tail");
  assert.strictEqual(Bag.name("tm105"), "TM105 Focus Punch");
  assert.strictEqual(Bag.name("tm106"), "TM106 Skill Swap");
  assert.strictEqual(Bag.name("tm107"), "TM107 Snatch");
  // FireRed's TM49 (Snatch) in the Rocket Hideout is TM107 here.
  assert(WORLD_MAPS.RocketHideout_B4F.people.some((p) => p.script === "RocketHideout_B4F_EventScript_ItemTM49" && p.item === "tm107"));
  // Saves from before keep their machines' moves under the new numbers.
  const oldSave = Object.assign(Player.create("T"), { party: [Party.create("Pidgey", 5, { rng })], bag: { "tm94-oras": 1 } });
  delete oldSave.pcItems;
  assert.deepStrictEqual(Player.load(JSON.parse(JSON.stringify(oldSave))).player.pcItems, { potion: 1 }, "old saves get the PC Potion");
  assert.deepStrictEqual(Player.load(oldSave).player.bag, { tm99: 1, "exp-share": 1, "explorer-kit": 1, "berry-pouch": 1, "fishing-rod": 1 },
    "old saves get Secret Power, the Exp. Share, the Explorer Kit, the Berry Pouch and the Fishing Rod");
  const v1 = Object.assign(Player.create("T"), { version: 1, party: [Object.assign(Party.create("Pidgey", 5, { rng }), { item: "tm71" })],
    bag: { tm69: 1, tm70: 1, tm71: 1, tm93: 1, tm94: 1, tm95: 1, tm100: 1, tm101: 1, hm05: 1, hm07: 1 }, pcItems: { tm24: 2 } });
  const fromV1 = Player.load(JSON.parse(JSON.stringify(v1))).player;
  const moves = (bag) => Object.keys(bag).filter(Bag.isMachine).map(Bag.name).sort();
  assert.deepStrictEqual(moves(fromV1.bag), ["HM05 Flash", "HM07 Waterfall", "HM08 Rock Smash", "HM09 Dive", "TM69 Rock Polish",
    "TM70 Stone Edge", "TM92 Wild Charge", "TM93 Snarl", "TM98 Confide", "TM99 Secret Power"]);
  assert.deepStrictEqual(fromV1.pcItems, { tm24: 2 });
  assert.strictEqual(Bag.machineMove(fromV1.party[0].item), "Stone Edge");
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(fromV1))).player.bag.hm05, 1, "a migrated save isn't migrated twice");
  // Key items: their own pocket; a save mid-errand gets Oak's Parcel back.
  for (const id of ["exp-share", "oaks-parcel", "town-map"]) {
    assert.strictEqual(Bag.pocket(id), "Key Items", id);
    assert(ITEM_SPRITES[id], "no sprite for " + id);
    assert.strictEqual(Bag.sellPrice(id), 0, "key items can't be sold");
  }
  assert(Player.create("T").bag["exp-share"], "new games start with the Exp. Share");
  assert(!Player.create("T").bag["poke-ball"], "no Poké Balls until Prof. Oak gives you some");
  const errand = Object.assign(Player.create("T"), { flags: { oaksParcel: true } });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(errand))).player.bag["oaks-parcel"], 1);
  assert.strictEqual(Bag.pocket("hm03"), "TMs & HMs");
  for (const id of Bag.machines()) assert(ITEM_SPRITES[id], "no sprite for " + id);

  const c = Party.create("Charmander", 20, { rng });
  assert(Bag.canUseOn(c, "tm35") && !Bag.canUseOn(c, "tm24"), "Charmander learns Flamethrower, not Thunderbolt");
  assert(Bag.canUseOn(c, "tm99") && !Bag.canUseOn(c, "hm09"), "Charmander learns Secret Power, not Dive");
  Party.teachMove(c, "Flamethrower", 0);
  assert(!Bag.canUseOn(c, "tm35"), "already knows it");

  // PP Up: +20% of base PP per use, three at most; current PP rises too.
  c.moves[1] = { name: "Ember", pp: 25 };
  Bag.useOn(c, "pp-up", { move: 1 });
  assert.deepStrictEqual(c.moves[1], { name: "Ember", pp: 30, ppUps: 1 });
  Bag.useOn(c, "pp-max", { move: 1 });
  assert.deepStrictEqual(c.moves[1], { name: "Ember", pp: 40, ppUps: 3 });
  assert(!Bag.canUseOn(c, "pp-up", { move: 1 }));
  const battle = new Battle({ seed: 1, p1: { name: "P", team: [Party.toBattleSet(c)] },
    p2: { name: "W", team: [Party.toBattleSet(Party.create("Pidgey", 3, { rng }))] } });
  battle.start();
  assert.strictEqual(battle.sides.p1.active.moves[1].maxpp, 40, "PP Ups carry into battle");
  battle.sides.p1.active.moves[1].pp = 7;
  Party.syncFromBattle(c, battle.sides.p1.active);
  assert.deepStrictEqual(c.moves[1], { name: "Ember", pp: 7, ppUps: 3 });
  Party.heal(c);
  assert.strictEqual(c.moves[1].pp, 40);
  const saved = Player.load(JSON.parse(Player.serialize(Object.assign(Player.create("T"), { party: [c] }))));
  assert.deepStrictEqual(saved.player.party[0].moves[1], { name: "Ember", pp: 40, ppUps: 3 }, "PP Ups survive saving");

  // Mints replace the nature, stats and all.
  c.nature = "Modest";
  const before = Party.stats(c);
  assert(!Bag.canUseOn(c, "modest-mint") && Bag.canUseOn(c, "adamant-mint"));
  assert.deepStrictEqual(Bag.useOn(c, "adamant-mint"), { nature: "Adamant", oldNature: "Modest" });
  const after = Party.stats(c);
  assert(after.atk > before.atk && after.spa < before.spa);
  assert.strictEqual(c.nature, "Adamant");
  assert.strictEqual(Party.toBattleSet(c).nature, "Adamant");
  assert(!Bag.canUseOn(c, "adamant-mint") && Bag.canUseOn(c, "modest-mint"));
  // Saves from when mints only changed stats get the mint's nature.
  const old = Object.assign(JSON.parse(JSON.stringify(c)), { nature: "Modest", mint: "Jolly" });
  const migrated = Player.load(Object.assign(Player.create("T"), { party: [old] })).player.party[0];
  assert.strictEqual(migrated.nature, "Jolly");
  assert(!("mint" in migrated));
  const mints = Object.keys(ITEMS).filter((id) => Bag.mintNature(id));
  assert.strictEqual(mints.length, 21, "the 21 Sword and Shield mints");
  for (const id of mints) assert(ITEM_SPRITES[id], "no sprite for " + id);
}

// ---------- Overworld ----------
{
  const maps = ["PalletTown", "PalletTown_PlayersHouse_1F", "PalletTown_PlayersHouse_2F", "PalletTown_RivalsHouse",
    "PalletTown_ProfessorOaksLab", "Route1", "ViridianCity", "ViridianCity_House", "ViridianCity_School",
    "ViridianCity_Mart", "ViridianCity_PokemonCenter_1F", "ViridianCity_PokemonCenter_2F"];
  for (const name of maps) {
    const m = WORLD_MAPS[name];
    assert(m, "missing map " + name);
    assert.strictEqual(m.collision.length, m.width * m.height);
    for (const part of ["", "-border"].concat(m.top ? ["-top"] : [])) {
      assert(fs.existsSync(path.join(root, "assets/world/maps", name + part + ".png")), "missing image " + name + part);
    }
    for (const person of m.people) {
      for (const look of [person, person.alt].filter(Boolean)) {
        assert(fs.existsSync(path.join(root, "assets/world/sprites", look.sprite + ".png")), "missing sprite " + look.sprite);
      }
    }
  }
  assert(fs.existsSync(path.join(root, "assets/world/sprites/player_custom.png")));
  assert.deepStrictEqual([WORLD_MAPS.PalletTown.width, WORLD_MAPS.PalletTown.height], [24, 20]);

  const at = (r) => (r.warp ? r.warp : r).map + " " + (r.warp ? r.warp : r).x + "," + (r.warp ? r.warp : r).y;
  // FireRed's weather where it draws one: the Tower's mist, the forest's shade.
  assert.strictEqual(WORLD_MAPS.PokemonTower_3F.weather, "fog_horizontal");
  assert.strictEqual(WORLD_MAPS.PokemonTower_2F.weather, undefined);
  assert.strictEqual(WORLD_MAPS.ViridianForest.weather, "shade");
  assert.strictEqual(WORLD_MAPS.PalletTown.weather, undefined);
  // Walking routes (Prof. Oak's aide): every tile reached is walkable, and the
  // way back from it leads step by step to where the search began (here a
  // door you've come out of: the last step, onto it, isn't walked).
  const tree = World.walkable({ map: "LavenderTown", x: 10, y: 11 }, null, 10);
  assert(tree.size > 20);
  for (const [key, t] of tree) {
    let pos = { map: "LavenderTown", x: t.x, y: t.y };
    const dirs = World.pathBack(tree, key);
    assert.strictEqual(dirs.length, t.dist);
    for (const d of dirs.slice(0, -1)) { const r = World.step(pos, d); assert(r.ok && !r.warp, key + " " + d); pos = { map: r.map, x: r.x, y: r.y }; }
    if (dirs.length) { const [dx, dy] = World.DIRS[dirs[dirs.length - 1]]; pos = { x: pos.x + dx, y: pos.y + dy }; }
    assert.strictEqual(pos.x + "," + pos.y, "10,11");
  }
  // Walking up into a door goes inside; walking down off the mat comes back out of that door.
  const inside = World.step({ map: "PalletTown", x: 6, y: 8 }, "up");
  assert.strictEqual(at(inside), "PalletTown_PlayersHouse_1F 4,8");
  const out = World.step({ map: "PalletTown_PlayersHouse_1F", x: 4, y: 8 }, "down");
  assert.strictEqual(at(out), "PalletTown 6,7");
  assert(out.warp.door, "arriving at a door steps you out of it");
  assert.strictEqual(at(World.step({ map: "PalletTown", x: 16, y: 14 }, "up")), "PalletTown_ProfessorOaksLab 6,12");
  // Stairs (FireRed's TryArrowWarp): stepping onto them is just a step; on
  // them, pressing toward them goes up, and walking away doesn't.
  assert.strictEqual(at(World.step({ map: "PalletTown_PlayersHouse_1F", x: 9, y: 2 }, "right")), "PalletTown_PlayersHouse_1F 10,2");
  assert.strictEqual(at(World.step({ map: "PalletTown_PlayersHouse_1F", x: 10, y: 2 }, "right")), "PalletTown_PlayersHouse_2F 10,2");
  assert.strictEqual(at(World.step({ map: "PalletTown_PlayersHouse_1F", x: 10, y: 2 }, "left")), "PalletTown_PlayersHouse_1F 9,2");
  // Pallet Town and Route 1 join at the top / bottom edge.
  assert.strictEqual(at(World.step({ map: "PalletTown", x: 12, y: 0 }, "up")), "Route1 12,39");
  assert.strictEqual(at(World.step({ map: "Route1", x: 12, y: 39 }, "down")), "PalletTown 12,0");
  // Route 1 leads on to Viridian City, then Route 2 and Pewter City; west of
  // Viridian is Route 22, east of Pewter Route 3, then Route 4 and Mt. Moon.
  // Cerulean City and Route 23 aren't built yet.
  assert.strictEqual(at(World.step({ map: "Route1", x: 12, y: 0 }, "up")), "ViridianCity 24,39");
  assert.strictEqual(at(World.step({ map: "ViridianCity", x: 24, y: 39 }, "down")), "Route1 12,0");
  assert.strictEqual(at(World.step({ map: "ViridianCity", x: 22, y: 0 }, "up")), "Route2 10,79");
  assert.strictEqual(at(World.step({ map: "Route2", x: 10, y: 79 }, "down")), "ViridianCity 22,0");
  assert.strictEqual(at(World.step({ map: "Route2", x: 10, y: 0 }, "up")), "PewterCity 22,39");
  assert.strictEqual(at(World.step({ map: "ViridianCity", x: 0, y: 12 }, "left")), "Route22 47,2");
  assert.strictEqual(at(World.step({ map: "PewterCity", x: 47, y: 20 }, "right")), "Route3 0,10");
  assert.strictEqual(at(World.step({ map: "Route3", x: 0, y: 10 }, "left")), "PewterCity 47,20");
  assert.strictEqual(at(World.step({ map: "Route3", x: 68, y: 0 }, "up")), "Route4 8,19");
  // East into Cerulean City; north from there to Nugget Bridge, then east along
  // Route 25 to Bill's Sea Cottage.
  assert.strictEqual(at(World.step({ map: "Route4", x: 107, y: 3 }, "right")), "CeruleanCity 0,13");
  assert.strictEqual(at(World.step({ map: "CeruleanCity", x: 22, y: 0 }, "up")), "Route24 10,39");
  assert.strictEqual(at(World.step({ map: "Route24", x: 23, y: 3 }, "right")), "Route25 0,3");
  assert.strictEqual(World.step({ map: "Route25", x: 51, y: 5 }, "up").warp.map, "Route25_SeaCottage");
  // East to Route 9 and Route 10 (its Pokémon Center and Rock Tunnel; the
  // way on to Lavender Town isn't built), south to Route 5,
  // its Day-Care, the Underground Path's entrance and the gate to Saffron.
  assert.strictEqual(at(World.step({ map: "CeruleanCity", x: 47, y: 11 }, "right")), "Route9 0,1");
  assert.strictEqual(at(World.step({ map: "Route9", x: WORLD_MAPS.Route9.width - 1, y: 9 }, "right")), "Route10 0,9");
  assert.strictEqual(World.warpTarget(World.warpAt("Route10", 8, 19)).map, "RockTunnel_1F");
  assert.strictEqual(World.warpTarget(World.warpAt("Route10", 8, 57)).map, "RockTunnel_1F");
  assert(WORLD_MAPS.RockTunnel_1F.dark && WORLD_MAPS.RockTunnel_B1F.dark, "Rock Tunnel needs Flash");
  // South down Route 10 to Lavender Town, Pokémon Tower, and west along Route 8
  // (Route 12 and Saffron City aren't built).
  assert.strictEqual(at(World.step({ map: "Route10", x: 8, y: WORLD_MAPS.Route10.height - 1 }, "down")), "LavenderTown 8,0");
  assert.strictEqual(World.warpTarget(World.warpAt("LavenderTown", 18, 6)).map, "PokemonTower_1F");
  assert.strictEqual(at(World.step({ map: "LavenderTown", x: 0, y: 9 }, "left")), "Route8 71,9");
  assert(window.TOWN_MAP.fly.LAVENDER_TOWN && Player.CENTERS.LavenderTown_PokemonCenter_1F);
  assert.strictEqual(at(World.step({ map: "CeruleanCity", x: 16, y: 39 }, "down")), "Route5 16,0");
  const intoR5 = (map, x, y, dir) => { const r = World.step({ map, x, y }, dir); return r.warp.map + " " + r.warp.x + "," + r.warp.y; };
  assert.strictEqual(intoR5("Route5", 23, 26, "up"), "Route5_PokemonDayCare 4,7");
  assert.strictEqual(intoR5("Route5", 31, 32, "up"), "UndergroundPath_NorthEntrance 6,8");
  assert(WORLD_MAPS.Route5.warps.some((w) => w.x === 24 && w.y === 32 && w.map === "Route5_SouthEntrance"));
  assert(WORLD_MAPS.Route9.people.filter((p) => p.trainer && p.trainer.id).length === 9, "Route 9's nine trainers");
  // Through the Underground Path to Route 6, then Vermilion City; its Gym's
  // beams are drawn and walked through by the switches' patches.
  assert.strictEqual(intoR5("Route6", 19, 14, "up"), "UndergroundPath_SouthEntrance 6,8");
  assert.strictEqual(at(World.step({ map: "Route6", x: 10, y: 39 }, "down")), "VermilionCity 22,0");
  const beams = WORLD_MAPS.VermilionCity_Gym.patches;
  assert.deepStrictEqual(Object.keys(beams), ["half", "off"]);
  assert(beams.off.collision.some(([x, y, c]) => x === 5 && y === 6 && c === 0) && beams.half.collision.every(([, , c]) => c === 1));
  // Into Mt. Moon and out the other side: Route 4 (19,5) -> 1F, ladders down,
  // B1F's far ladder (45,4) -> Route 4's east side (32,5).
  const into = (map, x, y, dir) => { const r = World.step({ map, x, y }, dir); return r.warp.map + " " + r.warp.x + "," + r.warp.y; };
  assert.strictEqual(into("Route4", 19, 6, "up"), "MtMoon_1F 18,37");
  assert.strictEqual(into("MtMoon_1F", 18, 37, "down"), "Route4 19,5");
  assert.strictEqual(into("MtMoon_B1F", 45, 5, "up"), "Route4 32,5");
  assert.strictEqual(into("Route4", 12, 6, "up"), "Route4_PokemonCenter_1F 7,8");
  for (const w of WORLD_MAPS.MtMoon_1F.warps.concat(WORLD_MAPS.MtMoon_B1F.warps, WORLD_MAPS.MtMoon_B2F.warps)) assert(w.map, "every Mt. Moon ladder leads somewhere built");
  { const r = World.step({ map: "Route22_NorthEntrance", x: 7, y: 2 }, "up"); assert.strictEqual(r.warp.map + " " + r.warp.x + "," + r.warp.y, "Route23 8,153"); }
  // Pewter's doors: the Gym, the Pokémon Center, the Mart; Route 22's League gate.
  const door = (map, x, y) => World.step({ map, x, y }, "up").warp.map;
  const wtD = (r) => r.warp.map + " " + r.warp.x + "," + r.warp.y;
  assert.deepStrictEqual([door("PewterCity", 15, 17), door("PewterCity", 17, 26), door("PewterCity", 28, 19), door("Route22", 8, 6)],
    ["PewterCity_Gym", "PewterCity_PokemonCenter_1F", "PewterCity_Mart", "Route22_NorthEntrance"]);
  // Diglett's Cave: Route 2 -> north entrance -> B1F -> south entrance -> Route 11.
  assert.strictEqual(wtD(World.step({ map: "Route2", x: 17, y: 12 }, "up")), "DiglettsCave_NorthEntrance 4,6");
  assert(WORLD_MAPS.DiglettsCave_SouthEntrance.warps.some((w) => w.map === "Route11") && WORLD_MAPS.DiglettsCave_B1F.warps.every((w) => w.map));
  assert.strictEqual(at(World.step({ map: "VermilionCity", x: 47, y: 16 }, "right")), "Route11 0,6");
  // Through Viridian Forest: Route 2 -> south gate -> forest -> north gate -> Route 2's north end.
  const wt = (r) => r.warp.map + " " + r.warp.x + "," + r.warp.y;
  assert.strictEqual(wt(World.step({ map: "Route2", x: 5, y: 52 }, "up")), "Route2_ViridianForest_SouthEntrance 7,10");
  assert.strictEqual(wt(World.step({ map: "Route2_ViridianForest_SouthEntrance", x: 7, y: 2 }, "up")), "ViridianForest 29,62");
  assert.strictEqual(wt(World.step({ map: "ViridianForest", x: 5, y: 10 }, "up")), "Route2_ViridianForest_NorthEntrance 7,10");
  assert.strictEqual(wt(World.step({ map: "Route2_ViridianForest_NorthEntrance", x: 7, y: 2 }, "up")), "Route2 5,13");
  assert.strictEqual(wt(World.step({ map: "ViridianForest", x: 29, y: 62 }, "down")), "Route2_ViridianForest_SouthEntrance 7,1");
  // Viridian's buildings: in through each door and back out.
  for (const [door, inside_] of [["26,27", "ViridianCity_PokemonCenter_1F"], ["36,20", "ViridianCity_Mart"],
    ["25,19", "ViridianCity_School"], ["25,12", "ViridianCity_House"]]) {
    const [x, y] = door.split(",").map(Number);
    const r = World.step({ map: "ViridianCity", x, y }, "up");
    assert.strictEqual(r.warp && r.warp.map, inside_, "door at " + door);
    const back = World.step({ map: inside_, x: r.warp.x, y: r.warp.y }, "down");
    assert.strictEqual(at(back), "ViridianCity " + x + "," + (y - 1));
  }
  // The Gym's door (its lock is a trigger on the step in front: ViridianCity_EventScript_GymDoorLocked).
  assert.strictEqual(World.step({ map: "ViridianCity", x: 36, y: 11 }, "up").warp.map, "ViridianCity_Gym");
  assert(WORLD_MAPS.ViridianCity.triggers.some((t) => t.script === "ViridianCity_EventScript_GymDoorLocked" && t.x === 36 && t.y === 11));
  assert.strictEqual(at(World.step({ map: "ViridianCity_PokemonCenter_1F", x: 2, y: 6 }, "left")), "ViridianCity_PokemonCenter_2F 1,6");
  // You come back in front of the nurse after blacking out; the PC is part of the map.
  const C = WORLD_MAPS.ViridianCity_PokemonCenter_1F, spot = Player.CENTERS.ViridianCity_PokemonCenter_1F;
  assert(!C.collision[spot.y * C.width + spot.x], "blackout spot is walkable");
  assert(C.behavior.includes(World.MB.PC));
  // People whose look the story changes, item balls, and the text the story uses.
  const oldMan = WORLD_MAPS.ViridianCity.people.find((p) => p.script === "ViridianCity_EventScript_TutorialOldMan");
  assert.strictEqual(oldMan.sprite, "old_man_1");
  assert.strictEqual(oldMan.alt.sprite, "old_man_lying_down");
  assert.strictEqual(WORLD_MAPS.ViridianCity.people.find((p) => p.flag === "FLAG_HIDE_VIRIDIAN_CITY_POTION").item, "potion");
  assert(WORLD_MAPS.PalletTown_RivalsHouse.people.some((p) => p.localId === "LOCALID_DAISY"));
  assert(WORLD_MAPS.PalletTown_RivalsHouse.people.some((p) => p.localId === "LOCALID_TOWN_MAP"));
  // Oak's walk to the lab, replayed from FireRed's movement scripts: Oak comes up
  // to just below you, then you both end up at the lab door (16,13).
  const replay = (pos, label) => {
    const moves = WORLD_MOVEMENTS[label];
    assert(moves, "missing movement " + label);
    for (const cmd of moves) {
      const m = /^walk_(up|down|left|right)$/.exec(cmd);
      if (m) { pos.x += World.DIRS[m[1]][0]; pos.y += World.DIRS[m[1]][1]; }
    }
    return pos;
  };
  for (const [side, x] of [["Left", 12], ["Right", 13]]) {
    const oak = replay({ x: 10, y: 8 }, "PalletTown_Movement_OakEnter" + side);
    assert.deepStrictEqual(oak, { x, y: 2 }, "Oak stops below the player (" + side + ")");
    replay(oak, "PalletTown_Movement_OakWalkToLab" + side);
    const me_ = replay({ x, y: 1 }, "PalletTown_Movement_PlayerWalkToLab" + side);
    assert.deepStrictEqual(replay(oak, "PalletTown_Movement_OakEnterLab"), { x: 16, y: 13 });
    assert.deepStrictEqual(replay(me_, "PalletTown_Movement_PlayerEnterLab"), { x: 16, y: 13 });
  }
  assert.deepStrictEqual(replay({ x: 6, y: 12 }, "PalletTown_ProfessorOaksLab_Movement_PlayerEnter"), { x: 6, y: 4 }, "you end up in front of Oak's desk");
  // The rival in the lab: from (5,4) he walks to the Poké Ball he takes (below it,
  // at y 5); when you reach the exit row (x 5-7, y 8) he walks to just above you,
  // and after the battle he walks out to the door mat (6,12).
  const ballX = { Bulbasaur: 8, Squirtle: 9, Charmander: 10 };
  for (const [mon, bx] of Object.entries(ballX)) {
    assert.deepStrictEqual(replay({ x: 5, y: 4 }, "PalletTown_ProfessorOaksLab_Movement_RivalWalksTo" + mon), { x: bx, y: 5 }, "rival to the " + mon + " ball");
    for (const [side, px] of [["Left", 5], ["Mid", 6], ["Right", 7]]) {
      const label = mon === "Charmander" ? "PalletTown_ProfessorOaksLab_Movement_ApproachForBattleCharmander" + side
        : "PalletTown_ProfessorOaksLab_Movement_RivalApproachForBattle" + mon + side;
      const rival = replay({ x: bx, y: 5 }, label);
      assert.deepStrictEqual(rival, { x: px, y: 7 }, "rival with " + mon + " walks above the player (" + side + ")");
      assert.deepStrictEqual(replay(rival, "PalletTown_ProfessorOaksLab_Movement_RivalExitAfterBattle" + side), { x: 6, y: 12 }, "rival leaves (" + side + ")");
    }
  }

  // The Pokédex scene: Oak (6,3) walks to the desk below the two Pokédexes
  // (4,1 and 5,1) and back; your rival walks in from the door to beside you.
  const dexes = WORLD_MAPS.PalletTown_ProfessorOaksLab.people.filter((p) => /POKEDEX/.test(p.localId || ""));
  assert.deepStrictEqual(dexes.map((p) => [p.x, p.y, p.flag]), [[4, 1, "FLAG_HIDE_POKEDEX"], [5, 1, "FLAG_HIDE_POKEDEX"]]);
  assert.deepStrictEqual(replay({ x: 6, y: 3 }, "PalletTown_ProfessorOaksLab_Movement_OakWalkToDesk"), { x: 5, y: 2 }, "Oak at the desk");
  assert.deepStrictEqual(replay({ x: 5, y: 2 }, "PalletTown_ProfessorOaksLab_Movement_OakBringDexesOver"), { x: 6, y: 3 }, "and back");
  assert.deepStrictEqual(replay({ x: 6, y: 3 }, "PalletTown_ProfessorOaksLab_Movement_OakWalkToDeskSouth"), { x: 4, y: 2 }, "Oak at the desk (you above him)");
  assert.deepStrictEqual(replay({ x: 6, y: 10 }, "PalletTown_ProfessorOaksLab_Movement_RivalEnter"), { x: 6, y: 4 }, "rival walks in");
  assert.deepStrictEqual(replay({ x: 6, y: 4 }, "PalletTown_ProfessorOaksLab_Movement_RivalExit"), { x: 6, y: 10 }, "and out");
  // No Pokédex until Oak gives it; old saves past the parcel already have it.
  assert(!Player.create("T").flags.pokedex, "new games start without the Pokédex");
  const pastParcel = Object.assign(Player.create("T"), { flags: { oaksParcel: true, parcelDelivered: true } });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(pastParcel))).player.flags.pokedex, true);

  // The Viridian Mart clerk calls you over: from the doormat (4,7) to the counter (4,3), across from him at (2,3).
  assert.strictEqual(at(World.step({ map: "ViridianCity", x: 36, y: 20 }, "up")), "ViridianCity_Mart 4,7");
  assert.deepStrictEqual(replay({ x: 4, y: 7 }, "ViridianCity_Mart_Movement_ApproachCounter"), { x: 4, y: 3 });
  assert(WORLD_MAPS.ViridianCity_Mart.people.some((p) => p.localId === "LOCALID_VIRIDIAN_MART_CLERK" && p.x === 2 && p.y === 3));
  assert(WORLD_MAPS.ViridianCity.people.filter((p) => p.sprite === "cut_tree").every((p) => p.inanimate), "cut trees don't turn to face you");
  assert(WORLD_MAPS.PalletTown.people.some((p) => p.localId === "LOCALID_PALLET_PROF_OAK"));
  for (const id of ["LOCALID_OAKS_LAB_PROF_OAK", "LOCALID_OAKS_LAB_RIVAL"]) assert(WORLD_MAPS.PalletTown_ProfessorOaksLab.people.some((p) => p.localId === id));
  assert(fs.existsSync(path.join(root, "assets/world/sprites/player_custom_run.png")), "running sprite sheet");

  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  for (const [, label] of gameJs.matchAll(/M\("(\w+)"\)/g)) assert(WORLD_MOVEMENTS[label], "missing movement " + label);
  for (const [, label] of gameJs.matchAll(/T\("(\w+)"\)/g)) assert(WORLD_TEXT[label], "missing story text " + label);
  // Walls, people and water block.
  assert(!World.step({ map: "PalletTown", x: 6, y: 9 }, "left", () => true).ok, "people block");
  const pond = WORLD_MAPS.PalletTown.behavior.findIndex((b) => b >= 0x10 && b <= 0x15);
  const pw = WORLD_MAPS.PalletTown.width;
  assert(pond >= 0 && !World.step({ map: "PalletTown", x: pond % pw, y: Math.floor(pond / pw) - 1 }, "down").ok, "can't walk into water");
  // Ledges: jump down over them, but not up.
  const R = WORLD_MAPS.Route1;
  const ledge = R.behavior.findIndex((b, i) => b === World.MB.JUMP_SOUTH && i > R.width && !R.collision[i - R.width] && R.behavior[i - R.width] !== World.MB.JUMP_SOUTH);
  const lx = ledge % R.width, ly = Math.floor(ledge / R.width);
  const jump = World.step({ map: "Route1", x: lx, y: ly - 1 }, "down");
  assert(jump.ok && jump.jump && jump.y === ly + 1, "jumps down a ledge");
  assert(!World.step({ map: "Route1", x: lx, y: ly + 1 }, "up").ok, "can't climb a ledge");

  // Route 1's FireRed encounters: only in grass, about rate x 16 / 2880 per step.
  assert.strictEqual(R.wild.rate, 21);
  const g = R.behavior.indexOf(World.MB.TALL_GRASS), gx = g % R.width, gy = Math.floor(g / R.width);
  const rng = mulberry32(61);
  let hits = 0;
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const e = World.wildEncounter("Route1", gx, gy, rng);
    if (!e) continue;
    hits++;
    seen.add(e.species);
    assert(e.level >= 2 && e.level <= 5);
  }
  assert(Math.abs(hits / 20000 - 336 / 2880) < 0.01, "encounter rate " + hits / 20000);
  assert.deepStrictEqual([...seen].sort(), ["Pidgey", "Rattata"]);
  const path_ = R.behavior.findIndex((b, i) => b === 0 && !R.encounter[i] && !R.collision[i]);
  assert.strictEqual(World.wildEncounter("Route1", path_ % R.width, Math.floor(path_ / R.width), () => 0), null, "no encounters off the grass");
  assert.strictEqual(World.wildEncounter("PalletTown", 10, 10, () => 0), null, "no wild Pokémon in town");
  assert.deepStrictEqual(WORLD_MAPS.PalletTown.signs.find((x) => x.x === 9 && x.y === 11).text,
    ["Pallet Town\nShades of your journey await!"]);

  // Saves: a new game starts in Pallet Town, outside Red's house, with no Pokémon.
  const fresh = Player.load(JSON.parse(Player.serialize(Player.create("Ash")))).player;
  assert.deepStrictEqual(fresh.location, { map: "PalletTown", x: 6, y: 8, facing: "down" });
  assert.strictEqual(fresh.party.length, 0);
  assert.strictEqual(fresh.look, "custom");
  const old = JSON.parse(Player.serialize(Player.create("Old")));
  delete old.location;
  old.party = [Party.create("Squirtle", 12, { rng })];
  const migrated = Player.load(old).player;
  assert.deepStrictEqual([migrated.location.map, migrated.location.x, migrated.location.y], ["PalletTown", 6, 8]);
  assert.strictEqual(migrated.flags.starter, "Squirtle");
  for (const loc of [Player.NEW_GAME_LOCATION, Player.HOME]) {
    const b = World.blockAt(loc.map, loc.x, loc.y);
    assert(!b.collision, "spawn point is walkable: " + loc.map);
  }
}

// FireRed's intro: every image ui/intro.js loads is built, and every text label it uses exists.
{
  const introJs = fs.readFileSync(path.join(root, "ui/intro.js"), "utf8");
  const names = new Set();
  for (const [, list] of introJs.matchAll(/_IMAGES = \[([^\]]+)\]/g)) for (const [, n] of list.matchAll(/"([\w-]+)"/g)) names.add(n);
  assert(names.size > 30, "intro image lists");
  for (const n of names) assert(fs.existsSync(path.join(root, "assets/intro", n + ".png")), "missing intro image " + n);
  for (const [, label] of introJs.matchAll(/IT\("(\w+)"\)/g)) assert(INTRO_TEXT[label], "missing intro text " + label);
  for (const n of ["Red", "Green", "Gary", "Leaf"]) assert(INTRO_TEXT["gNameChoice_" + n], "name choice " + n);
  assert.deepStrictEqual(INTRO_TEXT.gOakSpeech_Text_ThisWorld, ["This world…"]);
}

// FireRed's naming screen (ui/naming-screen.js): its pictures are built, the
// intro names you with it (not a text field), and it types, wraps and ends as
// FireRed's does. Run in a sandbox with the keys and pictures stubbed.
{
  const src = fs.readFileSync(path.join(root, "ui/naming-screen.js"), "utf8");
  assert(scripts.indexOf("ui/naming-screen.js") >= 0 && scripts.indexOf("ui/naming-screen.js") < scripts.indexOf("ui/intro.js"), "naming screen loads before the intro");
  const introJs = fs.readFileSync(path.join(root, "ui/intro.js"), "utf8");
  assert(introJs.includes("NamingScreen.create") && !introJs.includes("<input"), "the intro names you on the naming screen");
  let onKey = null;
  const sandbox = { Image: class { constructor() { this.complete = false; } }, document: {}, GBA_MENUS };
  sandbox.window = sandbox;
  sandbox.GbaMenus = { keys: (fn) => { onKey = fn; return new Promise(() => {}); } };
  vm.runInNewContext(src, sandbox, { filename: "ui/naming-screen.js" });
  const NS = sandbox.NamingScreen;
  for (const n of NS.PICTURES) assert(fs.existsSync(path.join(root, "assets/naming-screen", n + ".png")), "missing naming screen picture " + n);
  const ns = NS.create({ title: "YOUR NAME?", maxChars: 7, fallback: "RED" });
  ns.start();
  const press = (k) => { const r = onKey(k); for (let i = 0; i < 40; i++) ns.step(); return r; };
  assert.strictEqual(ns.state.cursor.join(), "0,0");
  assert.strictEqual(ns.state.page, "upper");
  press("left"); assert.strictEqual(ns.state.cursor.join(), "8,0");    // onto PAGE
  press("up"); assert.strictEqual(ns.state.cursor.join(), "8,2");      // wraps to OK
  press("right"); assert.strictEqual(ns.state.cursor.join(), "0,3");   // off OK onto the bottom row
  press("up"); press("up");
  press("a"); press("right"); press("a");                            // G, H
  press("select"); assert.strictEqual(ns.state.page, "lower");
  press("a"); assert.strictEqual(ns.state.text, "GHh");
  press("b"); assert.strictEqual(ns.state.text, "GH");
  press("select"); assert.strictEqual(ns.state.page, "symbols");
  assert.strictEqual(ns.state.cursor.join(), "1,1");
  for (let i = 0; i < 5; i++) press("a");                            // full at 7: the cursor goes to OK
  assert.strictEqual(ns.state.text, "GH66666");
  assert.strictEqual(ns.state.cursor.join(), "6,2");
  let name = null;
  ns.done.then((n) => { name = n; });
  assert.strictEqual(press("a"), "ok");
  // (Settled on the next turn of the event loop.)
  setImmediate(() => assert.strictEqual(name, "GH66666"));
  // Nothing typed: OK gives the fallback.
  const empty = NS.create({ fallback: "RED" });
  empty.start();
  onKey("start"); empty.step();
  onKey("a"); empty.step();
  empty.done.then((n) => assert.strictEqual(n, "RED"));
}

// Viridian Forest's trainers: FireRed's five Bug Catchers with their parties,
// lines and sight ranges; hidden items; the forest's own wild Pokémon.
{
  const forest = WORLD_MAPS.ViridianForest;
  const trainers = forest.people.filter((p) => p.trainer);
  assert.deepStrictEqual(trainers.map((p) => WORLD_TRAINERS[p.trainer.id].name), ["Rick", "Doug", "Sammy", "Anthony", "Charlie"]);
  for (const p of trainers) {
    const t = WORLD_TRAINERS[p.trainer.id];
    assert.strictEqual(t.className, "Bug Catcher");
    assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front", t.pic + ".png")), "trainer picture " + t.pic);
    assert(p.trainer.intro.length && p.trainer.defeat.length && p.trainer.after.length, "trainer text " + t.name);
    for (const m of t.party) {
      assert(DEX[m.species], "species " + m.species);
      const record = Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255), moves: m.moves });
      assert.strictEqual(record.ivs.atk, 0, "FireRed trainers' Pokémon have set IVs");
    }
  }
  const rick = trainers[0];
  assert.deepStrictEqual([rick.trainer.sight, rick.movement], [5, "face_left"]);
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_BUG_CATCHER_RICK.party.map((m) => m.species + " " + m.level), ["Weedle 6", "Caterpie 6"]);
  assert.strictEqual(Player.prizeMoney("Bug Catcher Rick", WORLD_TRAINERS.TRAINER_BUG_CATCHER_RICK.party), 16 * 6);
  assert.deepStrictEqual(forest.hidden.map((h) => h.item), ["potion", "antidote"]);
  // Red, who meets you at the forest's north exit, has his own overworld look.
  assert.deepStrictEqual([WORLD_SPRITES.red.sprite, WORLD_SPRITES.red.width, WORLD_SPRITES.red.height], ["red_normal", 16, 32]);
  assert(fs.existsSync(path.join(__dirname, "../assets/world/sprites/red_normal.png")));
  // Jessie & James at the end of Mt. Moon: Rocket Grunt looks, and one picture of both.
  assert.deepStrictEqual([WORLD_SPRITES.jessie.sprite, WORLD_SPRITES.james.sprite], ["rocket_f", "rocket_m"]);
  assert(fs.existsSync(path.join(__dirname, "../assets/sprites/trainers/front/jessie_james.png")));
  assert(forest.wild.slots.some((s) => s.species === "Pikachu"), "Pikachu in Viridian Forest");
  assert.deepStrictEqual(new Set(WORLD_MAPS.Route2.wild.slots.map((s) => s.species)), new Set(["Rattata", "Pidgey", "Caterpie", "Weedle"]));
  // Shared text keeps FireRed's {STR_VAR_n} slots for scripts to fill in.
  assert.deepStrictEqual(WORLD_TEXT.Trade_Text_WhatThatsNoMon, ["What?\nThat's no {STR_VAR_1}!"]);
}

// Sprite feet: every Pokémon sprite is measured, so small ones stand on the
// platform; FireRed's floating foes keep their elevation.
{
  for (const sub of ["", "back"]) {
    const files = fs.readdirSync(path.join(root, "assets/sprites/pokemon", sub)).filter((f) => f.endsWith(".png"));
    const table = SPRITE_METRICS[sub ? "back" : "front"];
    for (const f of files) assert(Number.isInteger(table[f.slice(0, -4)]), "no metrics for " + sub + "/" + f);
  }
  assert(SPRITE_METRICS.front[DEX.Caterpie.id] > SPRITE_METRICS.front[DEX.Onix.id], "Caterpie leaves more room under it than Onix");
  assert.strictEqual(SPRITE_METRICS.elevation.Gastly, 4);
  assert.strictEqual(SPRITE_METRICS.elevation.Pidgey, undefined);
  assert(Party.toBattleSet(Party.create("Pidgey", 5, { ball: "great-ball" })).ball === "great-ball", "battle sets carry their ball");
}

// Route 22 and Pewter City: FireRed's trainers and scripted walks.
{
  const replay = (pos, label) => {
    assert(WORLD_MOVEMENTS[label], "missing movement " + label);
    for (const cmd of WORLD_MOVEMENTS[label]) {
      const m = /^walk_(up|down|left|right)$/.exec(cmd);
      if (m) { pos.x += World.DIRS[m[1]][0]; pos.y += World.DIRS[m[1]][1]; }
    }
    return pos;
  };
  const party = (id) => WORLD_TRAINERS[id].party.map((m) => m.species + " " + m.level);
  assert.deepStrictEqual(party("TRAINER_LEADER_BROCK"), ["Geodude 12", "Onix 14"]);
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_BROCK.party[1].moves, ["Tackle", "Bind", "Rock Tomb"]);
  assert.deepStrictEqual(party("TRAINER_CAMPER_LIAM"), ["Geodude 10", "Sandshrew 11"]);
  for (const mon of ["Bulbasaur", "Charmander", "Squirtle"]) {
    assert.deepStrictEqual(party("TRAINER_RIVAL_ROUTE22_EARLY_" + mon.toUpperCase()), ["Pidgey 9", mon + " 9"]);
  }
  for (const pic of ["leader_brock", "camper", "rival_early"]) assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front", pic + ".png")), pic);
  assert.strictEqual(WORLD_MAPS.PewterCity_Gym.battleScene, "gym");
  assert(fs.existsSync(path.join(root, "assets/battle/gym.png")) && fs.existsSync(path.join(root, "assets/battle/leader.png")));
  assert.strictEqual(Player.prizeMoney("Leader Brock", WORLD_TRAINERS.TRAINER_LEADER_BROCK.party), 100 * 14);
  assert.deepStrictEqual(Player.CENTERS.PewterCity_PokemonCenter_1F, { map: "PewterCity_PokemonCenter_1F", x: 7, y: 4, facing: "up" });
  assert(WORLD_MAPS.PewterCity_Mart.people.find((p) => p.mart).mart.length > 3, "Pewter Mart stock");
  // The rival walks up beside you on Route 22 (you're at x 33, y 4-6).
  assert.deepStrictEqual(replay({ x: 25, y: 4 }, "Route22_Movement_RivalApproach"), { x: 32, y: 4 });
  assert.deepStrictEqual(replay({ x: 25, y: 5 }, "Route22_Movement_RivalApproach"), { x: 32, y: 5 });
  assert.deepStrictEqual(replay({ x: 25, y: 5 }, "Route22_Movement_RivalApproachBottom"), { x: 33, y: 5 });
  // The Gym guide leads you from the east exit to below the Gym door (15,16), whichever way it starts.
  for (const [side, from] of [["Top", { x: 42, y: 21 }], ["Mid", { x: 42, y: 22 }], ["Bottom", { x: 42, y: 23 }], ["East", { x: 41, y: 20 }]]) {
    assert.deepStrictEqual(replay(from, "PewterCity_Movement_PlayerWalkToGym" + side), { x: 15, y: 18 }, "to the Gym (" + side + ")");
    const g = replay({ x: 42, y: 20 }, "PewterCity_Movement_GuideMoveToLead" + side);
    assert.deepStrictEqual(replay(g, "PewterCity_Movement_GuideWalkToGym" + side), { x: 16, y: 18 }, "guide beside you (" + side + ")");
  }
  // The Museum guide (33,17) takes you to below the Museum's door.
  for (const [side, from] of [["North", { x: 33, y: 18 }], ["South", { x: 33, y: 16 }], ["West", { x: 34, y: 17 }], ["East", { x: 32, y: 17 }]]) {
    assert.deepStrictEqual(replay(from, "PewterCity_Movement_PlayerWalkToMuseum" + side), { x: 17, y: 9 }, "to the Museum (" + side + ")");
  }
  // Route 3's eight trainers, with FireRed's parties.
  const r3 = WORLD_MAPS.Route3.people.filter((p) => p.trainer).map((p) => WORLD_TRAINERS[p.trainer.id]);
  assert.deepStrictEqual(r3.map((t) => t.className + " " + t.name), ["Lass Robin", "Bug Catcher James", "Lass Sally", "Bug Catcher Greg",
    "Youngster Calvin", "Lass Janice", "Bug Catcher Colton", "Youngster Ben"]);
  assert.deepStrictEqual(party("TRAINER_BUG_CATCHER_GREG"), ["Weedle 9", "Kakuna 9", "Caterpie 9", "Metapod 9"]);
  for (const t of r3) assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front", t.pic + ".png")), t.pic);
  assert.deepStrictEqual(WORLD_MAPS.Route3.hidden.map((h) => h.item), ["oran-berry"]);
  assert(WORLD_MAPS.Route3.wild.slots.some((s) => s.species === "Mankey"), "FireRed's Route 3 has Mankey");
  // Route 4 and Mt. Moon: trainers, Team Rocket, Miguel's fossils, items.
  const moonTrainers = ["MtMoon_1F", "MtMoon_B2F", "Route4"].flatMap((m) => WORLD_MAPS[m].people.filter((p) => p.trainer))
    .map((p) => WORLD_TRAINERS[p.trainer.id].className + " " + WORLD_TRAINERS[p.trainer.id].name);
  assert.strictEqual(moonTrainers.length, 12);
  assert.strictEqual(moonTrainers.filter((t) => t === "Team Rocket Grunt").length, 4);
  assert.deepStrictEqual(party("TRAINER_SUPER_NERD_MIGUEL"), ["Grimer 12", "Voltorb 12", "Koffing 12"]);
  assert.deepStrictEqual(WORLD_MAPS.MtMoon_B2F.people.filter((p) => p.sprite === "fossil").map((p) => [p.x, p.y]), [[13, 7], [14, 7]]);
  assert(WORLD_MAPS.MtMoon_1F.people.some((p) => p.item === "moon-stone"), "Mt. Moon's Moon Stone");
  assert.deepStrictEqual(Player.CENTERS.Route4_PokemonCenter_1F.map, "Route4_PokemonCenter_1F");
  // FireRed's machines become this game's machine for the same move: FireRed
  // TM46 Thief is TM46 here; TM09 Bullet Seed is TM100.
  assert(WORLD_MAPS.MtMoon_B2F.people.some((p) => p.item === "tm46") && Bag.machineMove("tm46") === "Thief");
  assert(WORLD_MAPS.Route4.people.some((p) => p.item === "tm05") && Bag.machineMove("tm05") === "Roar");
  // Changed from FireRed: Route 22 and Viridian Forest (Bulbasaur in the forest).
  const rates = (map) => {
    const out = {};
    WORLD_MAPS[map].wild.slots.forEach((s, i) => {
      for (const [sp, share] of s.alt ? [[s.species, 0.5], [s.alt, 0.5]] : [[s.species, 1]]) out[sp] = (out[sp] || 0) + World.LAND_SLOT_WEIGHTS[i] * share;
    });
    return out;
  };
  assert.deepStrictEqual(rates("Route22"), { Rattata: 40, Mankey: 40, Spearow: 20 });
  assert.deepStrictEqual(rates("ViridianForest"), { Caterpie: 30, Weedle: 30, Metapod: 12.5, Kakuna: 12.5, Pikachu: 10, Bulbasaur: 5 });
  assert(WORLD_MAPS.ViridianForest.wild.slots.filter((s) => s.species === "Bulbasaur").every((s) => s.min === 5 && s.max === 5));
  // Both versions: Route 4's Ekans slots also give LeafGreen's Sandshrew.
  const ekans = WORLD_MAPS.Route4.wild.slots.filter((s) => s.species === "Ekans");
  assert(ekans.length && ekans.every((s) => s.alt === "Sandshrew"));
  // Random numbers in order: an encounter, slot 2 (Ekans), the version, the level.
  const grass = (() => { for (let y = 0; y < 20; y++) for (let x = 0; x < 108; x++) if (World.isGrass(World.blockAt("Route4", x, y))) return [x, y]; })();
  const roll = (coin) => { let i = 0; const seq = [0.0001, 0.42, coin, 0.5]; return World.wildEncounter("Route4", grass[0], grass[1], () => seq[i++]).species; };
  assert.deepStrictEqual([roll(0.9), roll(0.1)], ["Ekans", "Sandshrew"]);
  // New games start with no Potions in the bag (the one in the PC is all).
  assert.strictEqual(Player.create("T").bag.potion, undefined);
  assert.strictEqual(Player.create("T").pcItems.potion, 1);
}

// The player character: the custom one (Red and Leaf are rivals), and Wes
// in Orre, with every picture the game shows; the rival is Gary.
{
  assert.deepStrictEqual(Object.keys(Player.LOOKS), ["custom", "wes"]);
  assert.deepStrictEqual([Player.create("T").look, Player.create("T").rival], ["custom", "Gary"]);
  for (const [look, l] of Object.entries(Player.LOOKS)) {
    assert.strictEqual(Player.create("T", look).look, look);
    for (const file of ["assets/sprites/trainers/back/" + l.back + ".png", "assets/sprites/trainers/front/" + l.front + ".png",
      "assets/intro/" + l.speech + ".png", "assets/world/sprites/player_" + look + ".png", "assets/world/sprites/player_" + look + "_run.png"]) {
      assert(fs.existsSync(path.join(root, file)), "missing " + file);
    }
  }
  assert.strictEqual(Player.create("T", "nobody").look, "custom", "unknown looks fall back to the custom character");
  const asRed = Object.assign(Player.create("T"), { look: "red", party: [Party.create("Pidgey", 5)] });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(asRed))).player.look, "custom", "saves as Red or Leaf become the custom character");
  const saved = Object.assign(Player.create("T", "custom"), { party: [Party.create("Pidgey", 5)] });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(saved))).player.look, "custom", "the custom look survives saving");
  // Every picture Oak's speech uses is built (or added by hand, like the custom portrait).
  assert(fs.readFileSync(path.join(root, "ui/intro.js"), "utf8").includes('"oak-speech-player-character"'));
}

// Battle backgrounds: every terrain ui/game.js can pick is built, at 512x112
// (the 240x112 scene, then plain ground for the slide-in).
{
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  const terrains = new Set(["plain", "grass", "building", "cave"]);
  for (const [, t] of gameJs.matchAll(/terrain: "(\w+)"/g)) terrains.add(t);
  for (const t of terrains) {
    const file = path.join(root, "assets/battle", t + ".png");
    assert(fs.existsSync(file), "missing battle background " + t);
    const png = fs.readFileSync(file);
    assert.deepStrictEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [512, 112], "battle background size " + t);
  }
  assert.strictEqual(fs.readdirSync(path.join(root, "assets/battle")).length, 20, "all 20 FireRed battle terrains");
}

// The debug menu can add any species but battle-only forms: each must make a
// working party Pokémon (moves, stats, a battle set).
{
  const problems = [];
  for (const species of Object.keys(DEX).filter((s) => !/-(Mega|Primal)/.test(s))) {
    try {
      const r = Party.create(species, 50);
      if (!r.moves.length) problems.push(species + ": no moves");
      Party.stats(r);
      Party.toBattleSet(r);
    } catch (e) { problems.push(species + ": " + e.message); }
  }
  assert.deepStrictEqual(problems, [], "debug species");
}

// Moves learned at the same level come in the games' order (Scarlet and
// Violet's, tools/build-levelup-learnsets.js): a new Charmander knows
// Scratch, then Growl, then Ember (level 4).
{
  const Party = window.Party;
  assert.deepStrictEqual(Party.create("Charmander", 5).moves.map((m) => m.name), ["Scratch", "Growl", "Ember"]);
  // (This game's own: Charmander, Charmeleon and Charizard still learn Metal Claw at 13, for Brock.)
  for (const sp of ["Charmander", "Charmeleon", "Charizard"]) assert.deepStrictEqual(Party.movesLearnedAt(Party.create(sp, 12), 13), ["Metal Claw"], sp);
  assert.deepStrictEqual(Party.create("Pikachu", 5).moves.map((m) => m.name).slice(0, 2), ["Tail Whip", "Thunder Shock"]);
}

// FireRed's party screen (tools/build-party-menu.js): its graphics, and a
// party icon for every Pokémon.
{
  const D = window.PARTY_MENU;
  assert(D, "missing global PARTY_MENU");
  assert.strictEqual(D.tiles.length, 64 * 64);
  assert.strictEqual(D.palette.length, 176);
  assert.strictEqual(D.bg.length, 32 * 20);
  assert.deepStrictEqual([D.slots.main.length, D.slots.wide.length, D.slots.wideEmpty.length], [70, 54, 54]);
  assert.deepStrictEqual([D.pokeball.width, D.pokeball.height, D.status.width], [32, 64, 256]);
  const missing = Object.entries(window.DEX).filter(([, d]) => !fs.existsSync(path.join(root, "assets/sprites/icons", d.id + ".png"))).map(([n]) => n);
  assert.deepStrictEqual(missing, [], "Pokémon with no party icon");
}

// The main menu and Option screen's font, frames and palettes.
{
  const M = window.GBA_MENUS;
  assert(M, "missing global GBA_MENUS");
  // (512 characters: 0x100 and up are the extra symbols, like 0x105, the "Lv")
  assert.deepStrictEqual([M.fonts.normal.widths.length, M.fonts.small.widths.length], [512, 512]);
  assert.strictEqual(M.fonts.normal.glyphs.length, 512 * 16 * 16);
  assert.deepStrictEqual([M.charmap.A, M.charmap["é"], M.charmap[" "]], [0xBB, 0x1B, 0x00]);
  for (let i = 1; i <= 10; i++) assert.strictEqual(M.frames["type" + i].px.length, 24 * 24, "frame type" + i);
  assert(M.icons.A_BUTTON && M.icons.DPAD_UPDOWN && M.palettes.mainMenuTextbox.length === 16);
}

// The Town Map: FireRed's Kanto grid, with every map in the game placed on it.
{
  assert(window.TOWN_MAP, "missing global TOWN_MAP");
  const T = window.TOWN_MAP;
  assert.deepStrictEqual([T.width, T.height, T.map.length, T.dungeon.length], [22, 15, 15, 15]);
  assert.deepStrictEqual([T.map[11][4], T.names.PALLET_TOWN, T.dungeon[3][9], T.names.MT_MOON], ["PALLET_TOWN", "Pallet Town", "MT_MOON", "Mt. Moon"]);
  const onGrid = (R, sec) => R.map.some((r) => r.includes(sec)) || R.dungeon.some((r) => r.includes(sec));
  const onMap = (sec) => onGrid(T, sec) || T.sevii.some((R) => onGrid(R, sec));
  // (FireRed gives the Underground Path, the S.S. Anne, the Rocket Hideout, Silph Co., the Pokémon League,
  // the Ember Spa, the Dunsparce Tunnel (Three Isle Path), the Rocket Warehouse, Trainer Tower's inside, the Tanoby Key and the Tanoby chambers no square of their own.)
  for (const name of Object.keys(WORLD_MAPS)) {
    if (["johto", "emerald", "orre"].includes(WORLD_MAPS[name].region)) continue;   // (Johto, Faraway Island and Orre aren't on Kanto's Town Map)
    assert(T.mapSections[name] && (onMap(T.mapSections[name]) || ["UNDERGROUND_PATH", "UNDERGROUND_PATH_2", "S_S_ANNE", "ROCKET_HIDEOUT", "SILPH_CO",
      "POKEMON_LEAGUE", "EMBER_SPA", "THREE_ISLE_PATH", "ROCKET_WAREHOUSE", "TRAINER_TOWER_2", "TANOBY_KEY"].includes(T.mapSections[name]) || /_CHAMBER$/.test(T.mapSections[name])), name + " is on the Town Map");
  }
  // The Sevii Islands' maps: One, Two and Three Island on the first (FireRed's REGIONMAP_SEVII123).
  assert.deepStrictEqual(T.sevii.map((R) => [R.id, R.map.length, R.map[0].length]), [["SEVII_123", 15, 22], ["SEVII_45", 15, 22], ["SEVII_67", 15, 22]]);
  assert(onGrid(T.sevii[0], "ONE_ISLAND") && onGrid(T.sevii[0], "THREE_ISLE_PORT") && onGrid(T.sevii[0], "MT_EMBER") && !onGrid(T, "ONE_ISLAND"));
  for (const f of ["sevii-123", "sevii-45", "sevii-67"]) assert(fs.existsSync(path.join(__dirname, "../assets/town-map/" + f + ".png")), f);
  assert(fs.existsSync(path.join(__dirname, "../assets/town-map/kanto.png")));
}

// Johto's Town Map (tools/build-johto-town-map.js, at the end of data/johto-maps.js):
// HGSS's Pokégear map, every Johto map in a section, Fly outside each Pokémon Center.
if (window.JOHTO_TOWN_MAP) {
  const J = window.JOHTO_TOWN_MAP;
  assert.deepStrictEqual([J.width, J.height, J.map.length, J.map[0].length, J.dungeon.length], [27, 14, 14, 27, 14]);
  assert(fs.existsSync(path.join(__dirname, "../" + J.image)), J.image);
  const onGrid = (sec) => J.map.some((r) => r.includes(sec)) || J.dungeon.some((r) => r.includes(sec));
  assert(onGrid("NEW_BARK_TOWN") && onGrid("VIOLET_CITY") && onGrid("ROUTE_29") && onGrid("UNION_CAVE") && J.names.UNION_CAVE === "Union Cave");
  for (const name of Object.keys(WORLD_MAPS)) {
    if (WORLD_MAPS[name].region !== "johto") continue;
    assert(J.mapSections[name] && J.names[J.mapSections[name]], name + " is in a section of Johto's Town Map");
    assert(!(name in window.TOWN_MAP.mapSections), name + " isn't on Kanto's");
  }
  for (const [sec, spot] of Object.entries(J.fly)) {
    const fm = WORLD_MAPS[spot.map];
    assert(fm && !fm.collision[spot.y * fm.width + spot.x] && onGrid(sec) && J.towns.includes(sec), "Fly lands on open ground in " + sec);
    if (spot.center) assert(fm.warps.some((w) => w.map === spot.center && w.x === spot.x && w.y === spot.y - 1), "Fly lands at " + sec + "'s door");
  }
  assert(["VIOLET_CITY", "GOLDENROD_CITY", "BLACKTHORN_CITY"].every((sec) => J.fly[sec]));
}

// The Pokégear (ui/pokegear.js), its phone and radio from HGSS (tools/build-johto-phone.js,
// at the end of data/johto-maps.js): the phone book, the calls, the trainers' rematch tiers.
{
  const box = { window: { WORLD_TRAINERS: {}, WORLD_MAPS: {} }, Math: Object.create(Math) };
  vm.runInNewContext(fs.readFileSync(path.join(root, "tools/lib/johto-phone.generated.js"), "utf8"), box);
  vm.runInNewContext(fs.readFileSync(path.join(root, "ui/pokegear.js"), "utf8"), box);
  const P = box.window.JOHTO_PHONE, TR = box.window.WORLD_TRAINERS, plain = (x) => JSON.parse(JSON.stringify(x));   // (out of the sandbox)
  assert.strictEqual(P.contacts.length, 75);
  const joey = P.contacts[10];
  assert.deepStrictEqual(plain([joey.name, joey.cls, joey.trainer, joey.where, joey.gift]), ["Joey", "Youngster", "HGSS_TRAINER_YOUNGSTER_JOEY", "Route 30", "hp-up"]);
  assert.deepStrictEqual(plain(P.rematch.HGSS_TRAINER_YOUNGSTER_JOEY.slice(2)), ["HGSS_TRAINER_YOUNGSTER_JOEY_2", "HGSS_TRAINER_YOUNGSTER_JOEY_3", "HGSS_TRAINER_YOUNGSTER_JOEY_4"]);
  assert.deepStrictEqual(["_2", "_3", "_4"].map((t) => TR["HGSS_TRAINER_YOUNGSTER_JOEY" + t].party.map((m) => m.species + m.level).join()), ["Raticate34", "Raticate40", "Raticate54"]);
  assert.deepStrictEqual(plain(P.rematchIntro.HGSS_TRAINER_YOUNGSTER_JOEY), ["I've been waiting!\nLet's battle now!"]);
  assert.strictEqual(P.scripts[33][2], 3, "Joey's PHONE_SCRIPT_033 wants a rematch");
  assert(P.radio.music[0] === "Pokémon Music" && P.radio.passwords.length === 30 && P.radio.alph.includes("MAP_RUINS_OF_ALPH_UNDERGROUND_HALL"));
  // A game's worth of state for it: Joey beaten, his number and Lyra's.
  const s = { f: {}, v: {}, phone: [1, 10] }, flags = {}, said = [];
  const johto = { state: () => s, flag: (n) => !!s.f[n], setFlag: (n, on) => { if (on) s.f[n] = true; else delete s.f[n]; }, getVar: (n) => s.v[n] || 0 };
  let yes = true;
  const gear = box.window.Pokegear.create({
    player: () => ({ name: "GOLD", location: { map: "VioletCity", x: 1, y: 1 } }), johto: () => johto, map: () => "VioletCity", isGirl: () => false,
    sfx() {}, music() {}, mapMusic() {}, fanfare() {}, say: async (p) => { said.push(...[].concat(p)); }, confirm: async (q) => { said.push(q); return yes; },
    giveItem: async () => {}, hasItem: () => false, beaten: (id) => !!flags[id], setBeaten: (id, on) => { flags[id] = on; },
    badges: () => ({ johto: 2, all: 10 }), dex: () => ({ seen: 0, caught: 0 }), caught: () => false, dayCare: () => [], frame: () => 0
  });
  s.f.FLAG_GOT_POKEGEAR = true;
  assert(gear.has() && gear.registered(10) && !gear.registered(4));
  // GetPhoneBookRematch: nothing until he wants one; then his party again until the
  // Radio Tower (FLAG_UNK_97D), then his second tier, his third after the Elite Four.
  flags.HGSS_TRAINER_YOUNGSTER_JOEY = true;
  assert.strictEqual(gear.rematch(10), 0);
  s.gear.seeking[10] = true;
  assert.strictEqual(gear.rematch(10), "HGSS_TRAINER_YOUNGSTER_JOEY");
  s.f.FLAG_UNK_97D = true;
  assert.strictEqual(gear.rematch(10), "HGSS_TRAINER_YOUNGSTER_JOEY_2");
  flags.HGSS_TRAINER_YOUNGSTER_JOEY_2 = true;
  assert.strictEqual(gear.rematch(10), "HGSS_TRAINER_YOUNGSTER_JOEY_2", "his third tier waits for the Elite Four");
  s.f.FLAG_UNK_97E = true;
  assert.strictEqual(gear.rematch(10), "HGSS_TRAINER_YOUNGSTER_JOEY_3");
  // Calling him: his greeting, then one of his lines (Generic: a Pokémon of his, one where he is).
  delete s.gear.seeking[10];
  const lines = gear.callLines(10, false);
  assert(/This is Joey/.test(lines[0]) && lines.length >= 3 && !lines.join().includes("{BUF"), lines.join(" / "));
  // Elm's story calls (PhoneCall 1, 2, n) and his own by the story: the Egg, after Mr. Pokémon.
  assert.strictEqual(P.elmCalls[0], 2);
  assert(/disaster/.test(P.contacts[1].msgs[P.scripts[P.elmCalls[0]][0]].join(" ")));
  s.f.FLAG_GOT_ELMS_PANIC_CALL = true;
  assert(/stepped away/.test(gear.callLines(1, false).join(" ")), "Elm, after his panic call: " + gear.callLines(1, false).join(" "));
  // A call while walking: ten minutes on, the next step (half the time) rings.
  box.Math.random = () => 0;
  assert.strictEqual(gear.step(), null, "not yet");
  gear.callDue();
  s.phone.push(4);
  assert.deepStrictEqual(plain(gear.step()), { type: "phone" }, "Lyra calls");
  // A beaten trainer you haven't the number of asks again; Yes, and it's in.
  const before = s.phone.length;
  flags.HGSS_TRAINER_PICNICKER_LIZ = true;
  gear.talkTrainer({ trainer: { id: "HGSS_TRAINER_PICNICKER_LIZ" } }).then((asked) => {
    assert(asked && s.phone.length === before + 1 && s.phone.includes(12), "Liz's number");
    assert(said.includes("Registered the phone number in the\nPokégear!"));
  }).catch((e) => { console.error(e); process.exit(1); });
  assert.strictEqual(gear.encounterRate(), 1, "no radio on");
  // The radio's March and Lullaby: twice and half as many wild Pokémon (World.stepEncounter's scale).
  const tries = (scale) => {
    let n = 0, seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const grass = (() => { const m = WORLD_MAPS.Route1; for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (World.isGrass(World.blockAt("Route1", x, y))) return [x, y]; })();
    for (let i = 0; i < 4000; i++) if (World.stepEncounter({ steps: 99, prev: World.blockAt("Route1", ...grass).behavior }, "Route1", grass[0], grass[1], { rng, scale })) n++;
    return n;
  };
  const none = tries(1), march = tries(2), lullaby = tries(0.5);
  assert(march > none * 1.7 && lullaby < none * 0.65, "radio " + lullaby + " / " + none + " / " + march);
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
  assert(/<script src="ui\/pokegear\.js"><\/script>/.test(html) && /key: "gear", label: "Pokégear"/.test(gameJs) && /gear\.step\(\)/.test(gameJs));
  assert(["PhoneCall", "RegisterPokegearCard", "GetPhoneBookRematch", "UnsetPhoneCallTrigger"].every((c) => scriptJs.includes('case "' + c + '"')));
}

// Shiny Pokémon: 1 in 4096; kept through saving; trainers' never are.
{
  assert.strictEqual(Party.SHINY_ODDS, 1000);
  const shiny = Party.create("Pikachu", 5, { shiny: true });
  assert(shiny.shiny && Party.toBattleSet(shiny).shiny);
  const p = Player.create("S");
  Player.receive(p, shiny);
  Player.receive(p, Party.create("Eevee", 5, { shiny: false }));
  for (let i = 0; i < 50; i++) {
    const back = Player.load(JSON.parse(Player.serialize(p))).player;
    assert.deepStrictEqual(back.party.map((r) => !!r.shiny), [true, false], "a save keeps who's shiny (and no one else becomes it)");
  }
}

// Breeding and Eggs (game/breeding.js).
{
  const mk = (sp, g, lv) => Object.assign(Party.create(sp, lv || 30), { gender: g });
  const rng = mulberry32(7);
  assert.strictEqual(Breeding.compatibility(mk("Pikachu", "M"), mk("Raichu", "F")), 20, "same OT, different species: 20");
  assert.strictEqual(Breeding.compatibility(mk("Pikachu", "M"), mk("Pikachu", "F")), 50, "same species: 50");
  assert.strictEqual(Breeding.compatibility(mk("Pikachu", "M"), Object.assign(mk("Pikachu", "F"), { ot: { name: "X", id: 1 } })), 70, "different OT: 70");
  assert.strictEqual(Breeding.compatibility(mk("Pikachu", "M"), mk("Pikachu", "M")), 0, "same gender");
  assert.strictEqual(Breeding.compatibility(mk("Pikachu", "M"), mk("Geodude", "F")), 0, "no Egg Group in common");
  assert.strictEqual(Breeding.compatibility(mk("Mewtwo", "N"), mk("Ditto", "N")), 0, "Undiscovered");
  assert.strictEqual(Breeding.compatibility(mk("Magnemite", "N"), mk("Ditto", "N")), 20, "Ditto breeds with the genderless");
  // The Egg: the mother's first stage, Lv. 1, moves, ball, nature with an Everstone.
  const mom = Object.assign(mk("Raichu", "F"), { ball: "great-ball", item: "everstone", nature: "Timid" });
  const dad = mk("Pikachu", "M");
  dad.moves = [{ name: "Thunderbolt", pp: 15 }];
  const egg = Breeding.makeEgg(mom, dad, { rng });
  assert(egg.egg && egg.species === "Pichu" && egg.level === 1, "Raichu's Egg is a Pichu");
  assert.strictEqual(egg.nature, "Timid", "the Everstone passes the nature");
  assert.strictEqual(egg.ball, "great-ball", "the mother's ball");
  assert.strictEqual(egg.eggCycles, DEX.Pichu.baseEggSteps / 256);
  dad.item = "light-ball";
  assert(Breeding.makeEgg(mom, dad, { rng }).moves.some((m) => m.name === "Volt Tackle"), "Light Ball: Volt Tackle");
  const marill = Object.assign(mk("Azumarill", "F"), { item: "sea-incense" });
  assert.strictEqual(Breeding.makeEgg(marill, mk("Azumarill", "M"), { rng }).species, "Azurill", "Sea Incense: Azurill");
  assert.strictEqual(Breeding.makeEgg(mk("Azumarill", "F"), mk("Azumarill", "M"), { rng }).species, "Marill", "no incense: Marill");
  assert.strictEqual(Breeding.makeEgg(mk("Ditto", "N"), mk("Charizard", "M"), { rng }).species, "Charmander", "with Ditto, the other's");
  // Five IVs with a Destiny Knot.
  const a = Object.assign(Party.create("Eevee", 30, { ivs: 31 }), { gender: "F", item: "destiny-knot" });
  const b = Object.assign(Party.create("Eevee", 30, { ivs: 31 }), { gender: "M" });
  for (let i = 0; i < 20; i++) {
    const e = Breeding.makeEgg(a, b, { rng });
    assert(Party.STAT_KEYS.filter((k) => e.ivs[k] === 31).length >= 5, "Destiny Knot: five of the parents' IVs");
  }
  // The Day-Care finds one at the 255th step, compatibility percent of the time.
  const st = {};
  let found = false;
  for (let i = 0; i < 255; i++) found = Breeding.dayCareStep(st, [{ mon: mom }, { mon: mk("Pikachu", "M") }], () => 0) || found;
  assert(found && st.eggWaiting, "an Egg turns up");
  // Hatching: a cycle every 255 steps (two with Flame Body), then it hatches.
  const party = [Object.assign(Party.create("Magmar", 30), { ability: "Flame Body" }), Breeding.giftEgg("Togepi")];
  party[1].eggCycles = 2;
  const hs = {};
  let hatched = null;
  for (let i = 0; i < 255 * 2 && !hatched; i++) hatched = Breeding.hatchStep(hs, party);
  assert.strictEqual(hatched, party[1], "Flame Body: two cycles at once");
  Breeding.hatch(hatched, "Route5");
  assert(!hatched.egg && hatched.happiness === 120 && hatched.met.hatched, "hatched");
  // Eggs stay out of battles and field moves.
  const eggParty = [Breeding.giftEgg("Togepi"), Party.create("Pidgey", 10)];
  assert.deepStrictEqual(DoubleBattle.team(eggParty, null).map((r) => r.species), ["Pidgey"], "no Eggs in battle");
  assert(!DoubleBattle.canDouble(eggParty), "an Egg isn't a second Pokémon");
  assert.deepStrictEqual(FieldMoves.forMon(eggParty[0]), []);
  assert(!Bag.canUseOn(eggParty[0], "potion"), "no items on an Egg");
}

// The Ability Capsule, Ability Patch and Bottle Caps (game/bag.js).
{
  const r = Party.create("Gengar", 30);
  r.ability = "Levitate";
  assert(!Bag.canUseOn(r, "ability-capsule"), "Gengar has one Ability");
  const b = Party.create("Machamp", 30);
  b.ability = "Guts";
  assert(Bag.canUseOn(b, "ability-capsule"), "Machamp has two");
  Bag.useOn(b, "ability-capsule");
  assert.strictEqual(b.ability, "No Guard", "the capsule swaps them");
  b.ability = "Steadfast";
  assert(!Bag.canUseOn(b, "ability-capsule"), "not a Hidden Ability");
  // The Ability Patch: to the Hidden Ability and back (to the first ordinary one).
  assert(!Bag.canUseOn(r, "ability-patch"), "Gengar has no Hidden Ability here");
  assert(Bag.canUseOn(b, "ability-patch"));
  assert.deepStrictEqual(Bag.useOn(b, "ability-patch"), { ability: "Guts", oldAbility: "Steadfast" });
  b.ability = "No Guard";
  assert.deepStrictEqual(Bag.useOn(b, "ability-patch"), { ability: "Steadfast", oldAbility: "No Guard" });
  // A Hidden Ability stays hidden when it evolves.
  const machop = Party.create("Machop", 28);
  machop.ability = "Steadfast";
  Evolution.evolve(machop, "Machoke", { method: "level" });
  assert.strictEqual(machop.ability, "Steadfast");
  const m = Party.create("Machamp", 49, { ivs: 3 });
  assert(!Bag.canUseOn(m, "bottle-cap"), "Hyper Training needs Lv. 50");
  m.level = 50;
  const before = Party.stats(m), hp = m.hp = Party.maxHp(m);
  assert(Bag.canUseOn(m, "bottle-cap", { stat: "atk" }));
  Bag.useOn(m, "bottle-cap", { stat: "atk" });
  assert.strictEqual(m.ivs.atk, 3, "the IV itself stays (for breeding)");
  assert(Party.stats(m).atk > before.atk && Party.toBattleSet(m).ivs.atk === 31, "Attack acts as 31");
  assert(!Bag.canUseOn(m, "bottle-cap", { stat: "atk" }), "trained once");
  Bag.useOn(m, "gold-bottle-cap");
  assert.deepStrictEqual(Bag.trainableStats(m), [], "a Gold Bottle Cap trains the rest");
  assert(m.hp > hp, "trained HP raises current HP too");
  assert(!Bag.canUseOn(m, "gold-bottle-cap"));
  const saved = Player.load(JSON.parse(Player.serialize(Object.assign(Player.create("T", 0), { party: [m] })))).player.party[0];
  assert.deepStrictEqual(saved.hyper.slice().sort(), Party.STAT_KEYS.slice().sort(), "saves keep Hyper Training");
}

// Johto (data/johto-maps.js, from HeartGold and SoulSilver): New Bark Town to
// Violet, Azalea and Goldenrod (with their routes, gatehouses, Union Cave,
// Ilex Forest and the Ruins of Alph), and Route 27, Tohjo Falls and Route 26 to
// Kanto, joined to each other; Kanto's only way in is the League gate's
// west door (Route22_NorthEntrance), its guard there until you're Champion.
{
  const J = Object.keys(WORLD_MAPS).filter((n) => WORLD_MAPS[n].region === "johto");
  for (const n of ["CherrygroveCity", "Route29", "NewBarkTown", "Route27", "TohjoFalls", "Route26", "Route30", "Route31", "VioletCity", "Route32",
    "Route33", "AzaleaTown", "Route34", "GoldenrodCity", "Route35", "Route36", "RuinsOfAlph", "Route46", "UnionCave_1F", "IlexForest",
    "Route29_Route46_Gatehouse", "Route31_VioletGatehouse", "VioletCity_Route36_Gatehouse", "Route32_RuinsOfAlph_Gatehouse",
    "Route36_RuinsOfAlph_Gatehouse", "Route35_Goldenrod_Gatehouse", "AzaleaTown_IlexForest_Gatehouse", "Route34_IlexForest_Gatehouse"]) assert(J.includes(n), n + " is built");
  for (const name of J) {
    const m = WORLD_MAPS[name];
    assert(m && m.region === "johto", name + " is built");
    for (const k of ["collision", "behavior", "elevation", "encounter"]) assert.strictEqual(m[k].length, m.width * m.height, name + " " + k);
    for (const c of m.connections) assert(J.includes(c.map), name + " connects only within Johto");
    for (const part of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps", name + part + ".png")), name + part);
    for (const p of m.people) assert(fs.existsSync(path.join(root, "assets/world/sprites", p.sprite + ".png")), p.sprite);
    for (const t of [m.wild, m.water]) if (t) for (const s of t.slots) assert(DEX[s.species], name + ": " + s.species);
    for (const h of m.hidden) assert(ITEMS[h.item], h.item);
  }
  assert.deepStrictEqual(new Set(WORLD_MAPS.Route29.wild.slots.map((s) => s.species)), new Set(["Pidgey", "Sentret", "Rattata"]), "Route 29 by day");
  assert(!Object.values(WORLD_MAPS).some((m) => m.region !== "johto" && m.connections.some((c) => J.includes(c.map))), "nothing in Kanto leads to Johto");
  assert.strictEqual(World.step({ map: "NewBarkTown", x: 0, y: 15 }, "left").map, "Route29", "west out of New Bark Town");
  assert.strictEqual(World.fishingEncounter("NewBarkTown", "old-rod", () => 0).species, "Magikarp", "Gen 4 rods");
  assert.strictEqual(World.step({ map: "NewBarkTown", x: 23, y: 13 }, "up").warp.map, "NewBarkTown_PlayerHouse_1F", "New Bark's houses are built");
  // (Not the Battle Frontier's halls, which need games of their own.)
  assert(WORLD_MAPS.BattleFrontier.warps.some((w) => w.mapConst === "MAP_BATTLE_FRONTIER_BATTLE_FACTORY"), "the Battle Factory isn't built");
  // Every built warp's way back; every map reached from New Bark Town (walking, Surf, Waterfall, Whirlpool, Rock Climb).
  // (But for the maps scripts take you to: the Bug-Catching Contest's National Park, the Safari Zone's way in;
  // and, for reaching them, those you come to by a script, a train, an elevator or a hole in the floor: the
  // Ruins of Alph's hidden rooms, the Sinjoh Ruins, the Magnet Train, the Radio Tower's deck, the Lighthouse's top.)
  const JOHTO_BY_SCRIPT = /^(NationalPark_BugCatchingContest|SafariZone_EntranceInterior)$/;
  const JOHTO_NOT_WALKED = /^(NationalPark_BugCatchingContest|SafariZone_EntranceExterior|RuinsOfAlph_\w+HiddenRoom|RuinsOfAlph_\w*SinjohEvent2?|SinjohRuins_\w+|EmbeddedTower_\w+|GoldenrodCity_MagnetTrainStation_2F|GoldenrodCity_RadioTowerObservationDeck|OlivineCity_Lighthouse(Exterior|_5F|LightRoom))$/;
  for (const n of J.filter((n) => !JOHTO_BY_SCRIPT.test(n))) for (const [i, w] of WORLD_MAPS[n].warps.entries()) if (w.map && J.includes(w.map)) {
    const back = WORLD_MAPS[w.map].warps[w.warp];
    // (An elevator's way back: wherever you got in, FireRed's dynamic warp.)
    assert(back && (back.map === n || back.mapConst === "MAP_DYNAMIC"), n + " warp " + i + " to " + w.map + " and back");
  }
  {
    const key = (p) => p.map + ":" + p.x + ":" + p.y, start = { map: "NewBarkTown", x: 12, y: 14 }, seen = new Set([key(start)]), q = [start], reached = new Set();
    while (q.length) {
      const p = q.shift(); reached.add(p.map);
      for (const d of ["up", "down", "left", "right"]) for (const surf of [false, true]) {
        const r = World.step(p, d, null, surf ? { surf: true } : undefined);
        let n = r.warp && r.warp.map ? { map: r.warp.map, x: r.warp.x, y: r.warp.y } : r.ok ? { map: r.map, x: r.x, y: r.y } : null;
        if (!n && !surf) { const b = World.blockAt(p.map, p.x + World.DIRS[d][0], p.y + World.DIRS[d][1]); if (b.map && b.behavior === World.MB.WATERFALL) n = { map: b.map, x: b.x, y: b.y }; }
        // (Through a whirlpool, or over a rocky wall, to the far side: ui/game.js's crossWhirlpool and climbRocks.)
        if (!n && (r.whirlpool || r.climb)) {
          const [dx, dy] = World.DIRS[d];
          let k = 1;
          while (r.whirlpool ? World.blockAt(p.map, p.x + dx * k, p.y + dy * k).behavior === World.MB.WHIRLPOOL : World.climbable(World.blockAt(p.map, p.x + dx * k, p.y + dy * k).behavior, d)) k++;
          const b = World.blockAt(p.map, p.x + dx * k, p.y + dy * k);
          if (b.map) n = { map: b.map, x: b.x, y: b.y };
        }
        if (n && WORLD_MAPS[n.map] && !seen.has(key(n))) { seen.add(key(n)); q.push(n); }
      }
    }
    for (const n of J) if (!JOHTO_NOT_WALKED.test(n)) assert(reached.has(n), n + " reached from New Bark Town");
  }
  // Drawn in FireRed's style (tools/lib/fr-painter.js), its gate rooms, water animated as Kanto's; its
  // people HGSS's own (Lyra, Silver, Prof. Elm, everyone), and its item balls, small trees and rocks FireRed's.
  // Each Gym Leader can be walked up to from the Gym's door (Azalea's webs walked, as there are no carts).
  for (const g of J.filter((n) => /_Gym$|_GymLeaderRoom$/.test(n))) {
    const m = WORLD_MAPS[g], leader = m.people.find((p) => /^hgss_gsleader\d$/.test(p.sprite));
    const start = { map: g, x: m.warps[0].x, y: m.warps[0].y - 1 }, key = (p) => p.x + ":" + p.y, seen = new Set([key(start)]), q = [start];
    const occupied = (mm, x, y) => m.people.some((p) => p.x === x && p.y === y && !p.trainer);
    let near = false;
    while (q.length) {
      const p = q.shift();
      if (Math.abs(p.x - leader.x) + Math.abs(p.y - leader.y) === 1) near = true;
      for (const d of ["up", "down", "left", "right"]) {
        const r = World.step(p, d, occupied);
        if (r.ok && r.map === g && !r.warp && !seen.has(key(r))) { seen.add(key(r)); q.push({ map: g, x: r.x, y: r.y }); }
      }
    }
    assert(leader && near, g + ": its Leader can be walked up to");
  }
  // Whirlpools and rocky walls (HGSS's): in the way until Whirlpool or Rock Climb takes you over them.
  {
    const whirl = (n) => WORLD_MAPS[n].behavior.filter((b) => b === World.MB.WHIRLPOOL).length;
    const climbs = (n) => WORLD_MAPS[n].behavior.filter((b) => b === World.MB.ROCK_CLIMB_NS || b === World.MB.ROCK_CLIMB_EW).length;
    assert(whirl("Route41") >= 36 && whirl("Route27") >= 18 && whirl("DragonsDen") >= 9, "Johto's whirlpools");
    assert(climbs("Route47") >= 12 && climbs("MtSilverCave_UpperMountainside") >= 20 && climbs("CherrygroveCity") >= 2, "Johto's rocky walls");
    const R = WORLD_MAPS.Route41, i = R.behavior.indexOf(World.MB.WHIRLPOOL), wx = i % R.width, wy = Math.floor(i / R.width);
    const from = [["up", 0, 1], ["down", 0, -1], ["left", 1, 0], ["right", -1, 0]].find(([, dx, dy]) => World.isSurfable(World.blockAt("Route41", wx + dx, wy + dy).behavior));
    assert(from && World.step({ map: "Route41", x: wx + from[1], y: wy + from[2] }, from[0], null, { surf: true }).whirlpool, "a whirlpool stops you surfing");
    const C = WORLD_MAPS.CherrygroveCity, j = C.behavior.indexOf(World.MB.ROCK_CLIMB_NS);
    assert(World.step({ map: "CherrygroveCity", x: j % C.width, y: Math.floor(j / C.width) + 2 }, "up").climb, "a rocky wall stops you walking");
    assert(FieldMoves.info("Whirlpool").badge === "glacier" && FieldMoves.info("Rock Climb").badge === "rising", "Johto's field moves need Johto's Badges");
    assert.strictEqual(FieldMoves.hmFor("Whirlpool"), "hm06");
    assert.strictEqual(FieldMoves.hmFor("Rock Climb"), "hm11");
    // (HGSS's HM05 and HM08, as scripts give them: this game's Whirlpool and Rock Climb HMs.)
    const gives = new Set();
    for (const z of Object.values(JOHTO_SCRIPTS.zones)) for (const c of z.cmds) for (const a of c.slice(1)) if (/^hm\d+$/.test(a)) gives.add(a);
    assert(gives.has("hm06") && gives.has("hm08"), "HGSS's HMs as this game's: " + [...gives]);
    // (HM08 Rock Climb is Prof. Oak's, in Kanto, in HGSS: here he calls with it as you get the Rising Badge.)
    assert(/if \(b === "rising"\) player\.flags\.rockClimbDue = true;/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  }
  // Scripts' warps by HGSS's map numbers lead to their maps (Ecruteak's Gym's pit back to its entrance).
  assert.strictEqual(JOHTO_SCRIPTS.mapConsts[80], "EcruteakCity_Gym");
  assert.strictEqual(JOHTO_SCRIPTS.mapConsts.MAP_ECRUTEAK_GYM, "EcruteakCity_Gym");
  // Scripts' TMs are this game's machines for the same moves (Falkner's TM51 Roost is TM19 here),
  // and HGSS's TMs no machine here teaches are new TMs, with HGSS's learners.
  {
    const falkner = JOHTO_SCRIPTS.zones.T22GYM0101.cmds.find((c) => c[0] === "GoToIfNoItemSpace");
    assert(falkner && Bag.machineMove(falkner[1]) === "Roost", "Falkner's TM teaches Roost: " + (falkner && falkner[1]));
    const pulse = Bag.machines().find((id) => Bag.machineMove(id) === "Dragon Pulse");
    assert(pulse && +pulse.slice(2) > 107 && MACHINE_LEARNERS["Dragon Pulse"].includes("Kingdra"), "Dragon Pulse's new TM");
    assert(/case "GoToIfNoItemSpace": itemVars\(a\[0\], a\[1\]\)/.test(fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8")), "the Gyms' TMs are given");
  }
  // Johto's League: HGSS's Elite Four and Lance, their teams, sprites and lines.
  assert.strictEqual(JOHTO_LEAGUE.length, 5);
  for (const r of JOHTO_LEAGUE) {
    assert(WORLD_TRAINERS[r.trainer] && WORLD_TRAINERS[r.rematch] && r.intro && r.after && r.look && fs.existsSync(path.join(root, "assets/world/sprites", r.look.sprite + ".png")), r.trainer);
  }
  assert.deepStrictEqual(JOHTO_LEAGUE.map((r) => WORLD_TRAINERS[r.trainer].name), ["Will", "Koga", "Bruno", "Karen", "Lance"]);
  // The S.S. Aqua: off at Vermilion's dock once it's arrived there, and its sailor back to Olivine.
  assert(/function ssAquaExit\(\)/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")) && WORLD_MAPS.SSAqua_1F.warps[0].x === 24);
  // The Gyms' gimmicks (ui/johto-gymmicks.js): Violet's lift up to the walkways, Mahogany's ice blocks,
  // Ecruteak's dark, Cianwood's winch and the falls it stops.
  {
    const sandbox = { window: { WORLD_MAPS }, requestAnimationFrame: (f) => setImmediate(f) };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-gymmicks.js"), "utf8"), sandbox, { filename: "ui/johto-gymmicks.js" });
    const beaten = new Set(), sounds = [];
    const G = sandbox.window.JohtoGymmicks.create({ sfx: (n) => sounds.push(n), shake: () => Promise.resolve(), people: () => [], beaten: (id) => beaten.has(id) });
    const V = WORLD_MAPS.VioletCity_Gym, falkner = V.people.find((p) => p.sprite === "hgss_gsleader1");
    const reach = (start) => {
      const key = (p) => p.x + ":" + p.y, seen = new Set([key(start)]), q = [start];
      while (q.length) {
        const p = q.shift();
        for (const d of ["up", "down", "left", "right"]) {
          const r = World.step(p, d, null);
          if (r.ok && r.map === "VioletCity_Gym" && !seen.has(key(r))) { seen.add(key(r)); q.push({ map: r.map, x: r.x, y: r.y }); }
        }
      }
      return (x, y) => seen.has(x + ":" + y);
    };
    G.enter("VioletCity_Gym");
    assert(V.triggers.some((t) => t.x === 15 && t.y === 20), "the lift's step trigger");
    const can = reach({ map: "VioletCity_Gym", x: V.warps[0].x, y: V.warps[0].y - 1 });
    assert(can(15, 20) && !can(falkner.x, falkner.y + 1), "the lift down: Falkner's out of reach");
    // (Up it goes: checked once it's there, the rest going on meanwhile; a failure there fails the run.)
    G.violetLift().then(() => {
      assert(G.liftUp() && sounds.includes("se_elevator"));
      const up = reach({ map: "VioletCity_Gym", x: 15, y: 20 });
      assert(up(falkner.x, falkner.y + 1) && !up(V.warps[0].x, V.warps[0].y - 1), "the lift up: the walkways to Falkner, and not the floor");
      G.enter("VioletCity_Gym");
      assert(!G.liftUp(), "the lift's down again each time you come in");
    });
    // Mahogany's: ice blocks to push along the ice.
    for (const n of ["MahoganyTown_GymRoom1", "MahoganyTown_GymRoom2", "MahoganyTown_GymLeaderRoom"]) {
      const blocks = WORLD_MAPS[n].people.filter((p) => p.iceBlock);
      assert(blocks.length >= 2 && blocks.every((p) => p.sprite === "hgss_ice" && WORLD_MAPS[n].behavior[p.y * WORLD_MAPS[n].width + p.x] === World.MB.ICE), n + "'s ice blocks, on the ice");
    }
    // Ecruteak's: dark but for you, its lit rooms and the Mediums' candles.
    assert.strictEqual(G.darkness("VioletCity_Gym"), null);
    G.enter("EcruteakCity_Gym");
    const d = G.darkness("EcruteakCity_Gym");
    assert(d && d.radius > 0 && d.rects.length === 2, "Ecruteak's Gym is dark");
    const mediums = WORLD_MAPS.EcruteakCity_Gym.people.filter((p) => p.sprite === "hgss_itako" && p.trainer);
    assert.strictEqual(mediums.length, 4, "four Mediums, each with a candle");
    // Cianwood's: the winch turns once a visit, and the falls stop.
    G.enter("CianwoodCity_Gym");
    assert.deepStrictEqual([...G.patches("CianwoodCity_Gym")], []);
    assert(G.turnWinch() && !G.turnWinch(), "the winch turns, and won't again");
    assert.deepStrictEqual([...G.patches("CianwoodCity_Gym")], ["dry"]);
    const CG = WORLD_MAPS.CianwoodCity_Gym;
    assert(CG.patches && CG.patches.dry && fs.existsSync(path.join(root, "assets/world/maps/CianwoodCity_Gym-patch-dry.png")), "the falls stopped, drawn");
    G.enter("CianwoodCity_Gym");
    assert(!G.winch(), "the falls run again each time you come in");
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
    assert(/case "VioletGymElevator"/.test(scriptJs) && /case "CianwoodGymTurnWinch"/.test(scriptJs), "the Gyms' script commands run");
    assert(/darkness: \(map\) => gymmicks\.darkness\(map\)/.test(gameJs) && /gymmicks\.enter\(m\)/.test(gameJs));
  }
  // Johto's scripts' trades, loans and the like (ui/johto-script.js, tools/build-johto-script-data.js).
  {
    if (!window.JOHTO_SCRIPTS.trades) vm.runInThisContext(fs.readFileSync(path.join(root, "tools/lib/johto-script-data.generated.js"), "utf8"));
    const JS = window.JOHTO_SCRIPTS;
    assert.strictEqual(JS.trades.length, 13, "HGSS's thirteen in-game trades and loans");
    assert.deepStrictEqual([JS.trades[0].gives, JS.trades[0].wants, JS.trades[0].nickname], ["Onix", "Bellsprout", "Rocky"], "Violet City's Onix for a Bellsprout");
    assert.deepStrictEqual([JS.trades[7].gives, JS.trades[7].nickname, JS.trades[6].gives, JS.trades[6].nickname], ["Spearow", "Kenya", "Shuckle", "Shuckie"]);
    assert.strictEqual(JS.sounds[1185], "gs_me_item", "HGSS's jingles by number");
    assert(JS.messages["bank:191:126"] && JS.tutors.Headbutt.includes("Rattata"), "the standard menu's texts; Headbutt's tutor");
    if (!window.JohtoScript) vm.runInThisContext(fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8"));
    const party = [Party.create("Charizard", 50), Party.create("Bellsprout", 12)], said = [], traded = [], given = [], me = { name: "RED", flags: {}, party };
    const env = new Proxy({
      player: () => me, say: async (p) => { said.push(...p); }, confirm: async () => true, close: () => {},
      facePlayer: async () => {}, act: async () => {}, personAt: () => ({ x: 1, y: 1, facing: "up" }), choosePartyMon: async () => 1, fade: async () => {}, origin: () => ({ x: 0, y: 0 }),
      npcTrade: async (t, i) => { traded.push([t.gives, i]); party[i] = Party.create(t.gives, 12); },
      giveLoanMon: async (t, level, n) => { given.push(t.gives); party.push(Object.assign(Party.create(t.gives, level), { loan: n })); },
      giveItem: async (id) => { given.push(id); }, isGirl: () => false
    }, { get: (t, k) => t[k] || (() => {}) });
    const S = JohtoScript.create(env);
    (async () => {
      await S.run("T22R0601", "scr_seq_T22R0601_001", { person: { id: 1 } });
      assert.deepStrictEqual(traded, [["Onix", 1]], "the trade goes through with the Bellsprout chosen");
      assert(S.flag("FLAG_TRADE_VIOLET_CITY_BELLSPROUT_ONIX") && said.some((s) => /BELLSPROUT/.test(s)));
      // Cianwood's Shuckie, lent; Kenya's Mail delivered on Route 31, and TM44 for it (GoToIfNoItemSpace sets the item).
      await S.run("T24R0201", "scr_seq_T24R0201_000", { person: { id: 1 } });
      assert(given.includes("Shuckle") && party.some((r) => r.loan === 6), "Shuckie joins, lent");
      party.splice(1, 2, Object.assign(Party.create("Spearow", 20), { loan: 7, mail: "kenya" }));
      S.setVar("VAR_LOAN_SPEAROW", 1);
      await S.run("R31", "scr_seq_R31_001", { person: { id: 1 } });
      assert(party.length === 1 && given.includes("tm44") && S.getVar("VAR_LOAN_SPEAROW") === 3, "Kenya's Mail delivered, TM44 given");
      console.log("ok: Johto's scripts: an in-game trade, a loan, Kenya's Mail");
    })().catch((e) => { console.error(e); process.exit(1); });
  }
  // The Bug-Catching Contest (ui/bug-contest.js, tools/build-bug-contest.js): HGSS's scripts for it, its
  // wild Pokémon by day, the other contestants, the judging (BugContest_JudgePlayerMon) and the prizes.
  {
    const D = BUG_CONTEST_DATA, std = JOHTO_SCRIPTS.std;
    assert.strictEqual(D.encounters.length, 4, "a set without the National Pokédex, and Tuesday's, Thursday's and Saturday's");
    for (const set of D.encounters) assert(set.length === 10 && set.every((s) => DEX[s.species] && s.min <= s.max), "ten bugs a set");
    assert(D.contestants.length === 10 && D.names[0] === "Don" && D.classes[2] === "Ace Trainer");
    assert(ITEMS["sport-ball"] && ["sun-stone", "everstone", "sitrus-berry", "shed-shell"].every((id) => ITEMS[id]), "the Sport Balls and prizes");
    for (const n of ["std_bug_contest_guard_start", "std_bug_contest_guard_ask_end", "std_bug_contest_judging", "std_bug_contest_time_up", "std_bug_contest_retire"]) {
      assert(std[n] && std[n][1] in JOHTO_SCRIPTS.zones[std[n][0]].labels, n);
    }
    assert(JOHTO_SCRIPTS.messages.msg_0246_00014 && JOHTO_SCRIPTS.mapIds[487] === "MAP_NATIONAL_PARK_BUG_CATCHING_CONTEST");
    assert(WORLD_MAPS.NationalPark_BugCatchingContest.people.filter((p) => /^hgss:BUG_CONTEST:/.test(p.script)).length === 10, "the ten contestants talk");
    assert(JOHTO_SCRIPTS.zones.D22R0101.hdr.frame.some((f) => f[2] === "std_bug_contest_judging"), "the judging in the park");
    const sandbox = { window: { BUG_CONTEST_DATA: D, JOHTO_SCRIPTS } };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/bug-contest.js"), "utf8"), sandbox, { filename: "ui/bug-contest.js" });
    const C = sandbox.window.BugContest, seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
    // (The roll out of 100: 80-99 Caterpie, 60-79 Weedle, ... 5-9 Scyther, 0-4 Pinsir.)
    const kanto = C.encounterSet(false, 2);
    assert.deepStrictEqual([0.07, 0.02, 0.65].map((r) => C.encounter(kanto, seq(r, 0)).species), ["Scyther", "Pinsir", "Weedle"]);
    assert.strictEqual(JSON.stringify(C.encounter(kanto, seq(0.85, 0.999))), '{"species":"Caterpie","level":18}');
    assert.strictEqual(C.encounterSet(true, 4)[0].species, "Wurmple", "Thursday's, with the National Pokédex");
    const opp = C.opponents(true, 6, Math.random);
    assert(opp.length === 5 && new Set(opp.map((o) => o.id)).size === 5 && opp.every((o) => DEX[o.species] && o.score > 100), "five others, each with a bug");
    // A Lv. 18 Caterpie (its highest), all IVs 31, full HP: 60 + 100 + 100 + 100.
    const cat = { species: "Caterpie", level: 18, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, hp: 40 };
    assert.strictEqual(C.score(cat, kanto, 40), 360);
    assert.strictEqual(C.score(Object.assign({}, cat, { level: 9, hp: 20, ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }), kanto, 40), 60 + 50 + 0 + 50);
    assert.strictEqual(C.score(null, kanto, 1), 0, "nothing caught");
    assert.deepStrictEqual([...C.rank([300, 200, 250, 100, 150, 300])], [5, 0, 2, 1, 4, 3], "on a tie, you're ahead");
    assert.deepStrictEqual([0, 1, 2, 3].map((p) => C.prize(p, false, Math.random)), ["sun-stone", "everstone", "sitrus-berry", "shed-shell"]);
    assert.strictEqual(C.prize(0, true, () => 0.75), "dusk-stone", "first place with the National Pokédex: one of ten stones");
    const scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
    for (const c of ["BugContestAction", "JudgeBugContest", "BufferBugContestWinner", "IsBugContestantRegistered", "BugContestGetTimeLeft", "SetFlagVar"]) assert(scriptJs.includes('case "' + c + '"'), c);
    assert(scripts.includes("ui/bug-contest.js") && scripts.indexOf("ui/bug-contest.js") < scripts.indexOf("ui/game.js"));
  }
  // The Ruins of Alph (ui/johto-alph.js): each chamber's stone panel, put together by moving its loose
  // pieces into place and turning them upright; the Unown it wakes in the hall below, by letter; the walls
  // an Escape Rope, Flash and a Water Stone open; and the chambers' scripts, run: solved, the floor falls
  // in and you land in the hall, counted (the vars HGSS sets after the warp); the Research Center's Unown.
  {
    const chambers = Object.fromEntries(["Northeast", "Southeast", "Southwest", "Northwest"].map((c) => "RuinsOfAlph_" + c + "EntranceFirstRoom")
      .map((n) => [n, { people: WORLD_MAPS[n].people.map((p) => Object.assign({}, p)) }]));
    const sandbox = { window: { WORLD_MAPS: chambers, JOHTO_SCRIPTS }, requestAnimationFrame: (f) => setImmediate(f) };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-alph.js"), "utf8"), sandbox, { filename: "ui/johto-alph.js" });
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8"), sandbox, { filename: "ui/johto-script.js" });
    const A = sandbox.window.JohtoAlph;
    for (let n = 0; n < 4; n++) {
      const pieces = A.start(n), at = new Set(pieces.map((p) => p.x + ":" + p.y));
      assert(pieces.length === 16 && at.size === 16 && pieces.every((p) => !A.isCorner(p.x, p.y)) && !A.solved(pieces), "puzzle " + n + ": 16 pieces apart");
      for (const [i, p] of pieces.entries()) {
        if (p.fixed) { assert(p.turns === 0 && p.x === (i % 4) + 1 && p.y === Math.floor(i / 4) + 1, "puzzle " + n + ": a fixed piece in its place"); continue; }
        assert(A.canDrop(pieces, i, (i % 4) + 1, Math.floor(i / 4) + 1), "puzzle " + n + ": piece " + (i + 1) + "'s place is free");
        Object.assign(p, { x: (i % 4) + 1, y: Math.floor(i / 4) + 1, turns: 0 });
      }
      assert(A.solved(pieces), "puzzle " + n + " put together");
      assert(fs.existsSync(path.join(root, "assets/alph/pieces-" + n + ".png")) && fs.existsSync(path.join(root, "assets/alph/wall-" + n + ".png")));
    }
    assert(!A.canDrop(A.start(0), 5, 0, 0) && !A.canDrop(A.start(0), 5, 3, 1) && A.canDrop(A.start(0), 5, 2, 1), "not on a corner, nor on another piece");
    for (const f of ["board", "marks"]) assert(fs.existsSync(path.join(root, "assets/alph/" + f + ".png")));
    for (const f of ["alph_panel", "alph_wall"]) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + f + ".png")));
    assert(Object.values(chambers).every((m) => m.people.some((p) => p.sprite === "alph_panel" && p.underfoot) && m.people.some((p) => p.sprite === "alph_wall")),
      "each chamber's panel over its hole, and its wall");
    // Unown: none in the hall until a puzzle's solved; then the letters it woke (Kabuto's A-J), and ! and ? in the Sinjoh room.
    const hall = "RuinsOfAlph_UndergroundHall", none = [false, false, false, false], kabuto = [true, false, false, false];
    assert(A.locked(hall, none) && !A.locked(hall, kabuto) && !A.locked("RuinsOfAlph", none));
    for (let i = 0; i < 40; i++) assert("abcdefghij".includes(A.unownLetter(hall, kabuto)));
    assert.strictEqual(A.unownLetter(hall, [false, false, false, true], () => 0.99), "z");
    assert(["exclamation", "question"].includes(A.unownLetter("RuinsOfAlph_HallEntranceSinjohEvent", kabuto)) && A.unownLetter("RuinsOfAlph", kabuto) === null);
    const flags = {};
    A.recordCaught(flags, { species: "Unown" }); A.recordCaught(flags, { species: "Unown", unown: "q" }); A.recordCaught(flags, { species: "Unown" }); A.recordCaught(flags, { species: "Natu" });
    assert.strictEqual(flags.unownCaught.join(), "a,q");
    assert(!A.allLetters(flags.unownCaught) && A.allLetters("abcdefghijklmnopqrstuvwxyz".split("")) && A.caughtCount(["a", "question"]) === 2);
    // The walls: used at (6, 3) facing up, in front of the right one.
    const front = { x: 6, y: 3, facing: "up" };
    assert.deepStrictEqual(Object.assign({}, A.chamberReaction("RuinsOfAlph_NortheastEntranceFirstRoom", front, "escape-rope")), { zone: "D24R0202", label: "scr_seq_D24R0202_002" });
    assert(A.chamberReaction("RuinsOfAlph_SoutheastEntranceFirstRoom", front, "flash") && A.chamberReaction("RuinsOfAlph_SouthwestEntranceFirstRoom", front, "water-stone"));
    assert(!A.chamberReaction("RuinsOfAlph_NortheastEntranceFirstRoom", { x: 6, y: 3, facing: "left" }, "escape-rope") && !A.chamberReaction("RuinsOfAlph_NortheastEntranceFirstRoom", front, "flash"));
    for (const z of ["D24R0202", "D24R0204", "D24R0206"]) assert(("scr_seq_" + z + "_002") in JOHTO_SCRIPTS.zones[z].labels);
    // Each chamber's panel is its puzzle, and the flag its script checks.
    ["D24R0202", "D24R0204", "D24R0206", "D24R0208"].forEach((z, n) => {
      const c = JOHTO_SCRIPTS.zones[z].cmds, i = c.findIndex((x) => x[0] === "AlphPuzzle");
      assert(i >= 0 && c[i][1] === n && c.slice(i, i + 6).some((x) => x[0] === "GoToIfSet" && x[1] === A.PUZZLE_FLAGS[n]), z + "'s panel is puzzle " + n);
    });
    // The Kabuto chamber's panel, run: put together, the floor falls in and you land in the hall.
    const player = { name: "RED", party: [], flags: {} }, said = [], log = [];
    const env = { player: () => player, say: async (p) => { said.push(p.join(" ")); }, confirm: async () => true, close: () => {}, facePlayer: async () => {},
      act: async (t) => { log.push("act"); }, show: () => {}, hide: (id) => log.push("hide " + id), place: () => {}, personAt: () => ({ x: 6, y: 7, facing: "up" }),
      origin: () => ({ x: 0, y: 0 }), sleep: async () => {}, fade: async () => {}, shake: async () => { log.push("shake"); },
      warp: async (m, x, y, facing) => { log.push("warp " + (JOHTO_SCRIPTS.mapConsts[m] || m) + " " + x + "," + y); },
      alphPuzzle: async (n) => A.PUZZLE_FLAGS[n], alphWall: async (n) => log.push("wall " + n), unownCaught: () => player.flags.unownCaught || [],
      cry: () => {}, fanfare: () => {}, se: () => {}, music: () => {}, isGirl: () => false };
    const J2 = sandbox.window.JohtoScript.create(env);
    J2.run("D24R0202", "scr_seq_D24R0202_000", {}).then(async () => {
      assert(J2.flag("FLAG_SYS_ALPH_PUZZLE_KABUTO") && J2.flag("FLAG_UNK_21C") && log.includes("shake") && log.includes("hide obj_D24R0202_babyboy1_13"), "the panel put together, the floor falls in: " + log);
      assert(log.some((l) => /^warp (RuinsOfAlph_UndergroundHall|315) 25,6$/.test(l)), "into the hall below: " + log);
      assert(J2.getVar("VAR_UNK_40DD") === 1 && J2.getVar("VAR_UNK_40EC") === 1 && J2.getVar("VAR_UNK_40CE") === 1, "the fall counted, after the warp");
      await J2.run("D24R0202", "scr_seq_D24R0202_001", {});
      assert(log.includes("wall 0"), "the wall says ESCAPE");
      // The Research Center: all 26 letters caught.
      player.flags.unownCaught = "abcdefghijklmnopqrstuvwxyz".split("");
      await J2.run("D24R0102", "scr_seq_D24R0102_002", {});
      assert(/developed the UNOWN Report/.test(said[said.length - 1]), "the Research Center knows you've caught every letter: " + said[said.length - 1]);
    });
    // The falls: from behind each wall into its hidden room, and from there into the hall, onto the floor.
    const MC = JOHTO_SCRIPTS.mapConsts;
    for (const [z, to] of [["D24R0212", "NortheastHiddenRoom"], ["D24R0213", "SoutheastHiddenRoom"], ["D24R0214", "NorthwestHiddenRoom"], ["D24R0215", "SouthwestHiddenRoom"],
      ["D24R0203", "UndergroundHall"], ["D24R0210", "UndergroundHall"], ["D24R0209", "UndergroundHall"], ["D24R0207", "UndergroundHall"]]) {
      const w = JOHTO_SCRIPTS.zones[z].cmds.find((c) => c[0] === "Warp");
      if (typeof w[1] !== "string") continue;   // (a build from before maps went by name)
      const m = WORLD_MAPS[MC[w[1]]];
      assert(MC[w[1]] === "RuinsOfAlph_" + to && !m.collision[w[4] * m.width + w[3]], z + " falls into " + to + ", onto its floor");
    }
    assert(/if \(\/\^MAP_\/\.test\(tok\)\) return tok;/.test(fs.readFileSync(path.join(root, "tools/lib/hgss-script.js"), "utf8")), "scripts' maps by name, for Warp");
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/alphReaction\("escape-rope"\)/.test(gameJs) && /alphReaction\("water-stone"\)/.test(gameJs) && /chamberReaction\(player\.location\.map, Overworld\.position\(\), "flash"\)/.test(gameJs));
    assert(/JohtoAlph\.locked\(player\.location\.map, alphSolved\(\)\)/.test(gameJs) && /JohtoAlph\.unownLetter\(at\.map, alphSolved\(\)\)/.test(gameJs) && /JohtoAlph\.recordCaught/.test(gameJs));
    // The Unown Report (overlay 113): a book, the cover's two pages, the Unown 7 to a page (14 to a
    // spread) as caught, A to Z from the report's level 4, then the notes the level's up to.
    const RP = (letters, level) => Array.from(A.reportPages(letters, level), (pg) => pg.kind + (pg.forms ? ":" + pg.forms.join("") : pg.notes ? ":" + pg.notes.join(",") : ""));
    assert.deepStrictEqual(RP([], 0), ["cover", "cover"]);
    assert.deepStrictEqual(RP(["d", "a", "question", "k"], 0), ["cover", "cover", "unown:daquestionk", "unown:"]);
    assert.deepStrictEqual(RP(["d", "a", "question", "k"], 4).slice(2, 4), ["unown:adkquestion", "unown:"]);
    assert.deepStrictEqual(RP("abcdefghijklmnop".split(""), 2).slice(2), ["unown:abcdefg", "unown:hijklmn", "unown:op", "unown:", "notes:6", "notes:7", "notes:8", "notes:"]);
    assert.strictEqual(RP("abcdefghijklmnopqrstuvwxyz".split("").concat(["exclamation", "question"]), 8).length, 2 + 4 + 12, "28 Unown on two spreads, six spreads of notes");
    assert(A.REPORT_WORDS.length === 28 && A.REPORT_WORDS[17] === "REASSURE" && Object.keys(A.NOTES).length === 13);
    for (const n of ["plate-0", "plate-1", "lines", "bar", "words"]) assert(fs.existsSync(path.join(root, "assets/alph/report-" + n + ".png")), "the report's " + n);
    assert(/JohtoAlph\.report\(c, player\.flags\.unownCaught, \{[^}]*\s*level: \+johto\.getVar\("VAR_UNOWN_REPORT_LEVEL"\)/.test(gameJs), "the report's level from HGSS's var");
  }
  // The Safari Zone (tools/build-johto-safari.js, ui/johto-safari.js): twelve
  // Areas in a 3x2 layout (one of HGSS's ten defaults; the Area Customizer
  // changes it), each with its own Pokémon; the Safari Game: 30 Balls, no steps.
  {
    const D = window.JOHTO_SAFARI, SZ = WORLD_MAPS.SafariZone_EntranceExterior;
    assert(D && D.areas.length === 12 && D.defaults.length === 10 && D.defaults.every((l) => l.length === 6 && l[4] === 3), "HGSS's Areas and layouts (the Peak always in the middle of the bottom row)");
    for (const a of D.areas) {
      assert(a.solid.length === 1024 && a.behavior.length === 2048 && a.mons.land.day.length === 10, a.name + "'s tiles and Pokémon");
      assert(fs.existsSync(path.join(root, "assets/world/maps/SafariZone_EntranceExterior-patch-" + a.key + ".png")) && SZ.patches[a.key], a.name + "'s picture");
    }
    assert(D.areas[3].mons.land.day.some(([sp]) => sp === "Geodude") && D.areas[11].mons.land.day.some(([sp]) => sp === "Sandshrew"), "Baoba's Geodude in the Peak, Sandshrew in the Desert");
    const sandbox = { window: { WORLD_MAPS, JOHTO_SAFARI: D, JOHTO_SCRIPTS } };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-safari.js"), "utf8"), sandbox, { filename: "ui/johto-safari.js" });
    const p = { flags: {}, party: [], location: { map: "SafariZone_EntranceExterior", x: 79, y: 90 } }, vars = {}, went = [];
    const S = sandbox.window.JohtoSafari.create({ player: () => p, getVar: (k) => vars[k] || 0, setVar: (k, v) => { vars[k] = v; }, teleport: (to) => went.push(to),
      say: async () => {}, confirm: async () => true, sfx: () => {}, roomFor: () => true, applyPatches: () => {}, frameScript: async () => {} });
    const L = S.patches("SafariZone_EntranceExterior");
    assert(L.length === 6 && L[4] === "peak" && D.defaults.some((d) => d.join() === p.flags.johtoSafari.layout.join()), "a default layout: " + L);
    assert.strictEqual(S.areaAt(79, 90), 3);
    // (The Peak's tiles are on the map, its grass Pokémon those of whichever Area you're in.)
    const grass = [...Array(1024).keys()].find((k) => D.areas[3].behavior.substr(k * 2, 2) === "02"), gx = 64 + (grass & 31), gy = 64 + (grass >> 5);
    assert(SZ.encounter[gy * SZ.width + gx] === 1 && World.isGrass(World.blockAt("SafariZone_EntranceExterior", gx, gy)), "the Peak's grass");
    assert(SZ.wild.slots.length === 10 && SZ.wild.weights.every((w) => w === 10) && SZ.wild.slots.some((s) => s.species === "Geodude"), "the Peak's Pokémon, one in ten each");
    p.location = { map: "SafariZone_EntranceExterior", x: 2, y: 2 };
    assert.strictEqual(SZ.wild, null, "none outside the Areas");
    // The Safari Game: started by the counter's SafariZoneAction 0; out of Balls, back at the counter.
    S.action(0);
    assert.strictEqual(JSON.stringify(p.flags.safari), JSON.stringify({ balls: 30, hgss: true }));
    p.flags.safari.balls = 0;
    S.afterBattle("fled").then(() => {
      assert(!p.flags.safari && vars.VAR_SCENE_SAFARI_ZONE_ENTRANCE === 2 && went[0].map === "SafariZone_EntranceInterior" && went[0].x === 5 && went[0].y === 2, "out of Balls: back at the counter");
    });
    // Baoba's tests: a Geodude caught in the Safari Zone.
    assert.strictEqual(S.challenge(0), 0);
    p.party.push({ species: "Geodude", met: { level: 15, map: "SafariZone_EntranceExterior" } });
    assert.deepStrictEqual([S.challenge(0), S.challenge(1)], [1, 0]);
    // HGSS's Safari battle (engine/safari.js): Bait and Mud move stages 0-12 from 6.
    const h = Safari.encounter("Geodude", { hgss: true }), r7 = mulberry32(7);
    assert.deepStrictEqual([h.catchStage, h.fleeStage, h.fleeRate], [6, 6, 90]);
    const how = Safari.throwRock(h, r7);
    assert(h.catchStage === 7 && (how === "furious" ? h.fleeStage === 6 : how === "angry" && h.fleeStage === 7), "Mud");
    for (let i = 0; i < 20; i++) Safari.throwBait(h, r7);
    assert(h.fleeStage === 0 && h.catchStage <= 2, "Bait, down to stage 0");
    assert.strictEqual(Safari.odds(Object.assign({}, h, { catchStage: 6 }), { hp: 100, maxhp: 100, status: "" }), Math.floor(Math.floor(window.DEX.Geodude.captureRate * 15 / 10) * 100 / 300));
    assert.strictEqual(Safari.watch(h), "watching");
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
    assert(/case "SafariZoneAction"/.test(scriptJs) && /case "ScrCmd_716"/.test(scriptJs) && /johtoSafari\.patches\(map\)/.test(gameJs), "the Safari Zone's script commands and patches");
  }
  // (Upstairs in a Pokémon Center is FireRed's own floor, its people too.)
  for (const n of J.filter((n) => !/_PokemonCenter_2F$/.test(n))) for (const p of WORLD_MAPS[n].people) {
    const fr = /^(item_ball|cut_tree|rock_smash_rock)$/.test(p.sprite);
    assert(fr || /^hgss_/.test(p.sprite), n + ": HGSS's sprite for " + p.sprite);
    assert(fs.existsSync(path.join(root, "assets/world/sprites", p.sprite + ".png")), n + ": " + p.sprite + "'s picture");
  }
  // (But for one with a scene on its floor, as Lyra's in Route 31's, or that isn't a way between two maps, as Route 43's toll gate: HGSS's own.)
  const ownGate = (m) => m.triggers.length || new Set(m.warps.map((w) => w.map || w.mapConst)).size !== 2;
  assert(ownGate(WORLD_MAPS.Route31_VioletGatehouse) && WORLD_MAPS.Route31_VioletGatehouse.width === 32, "Route 31's gatehouse is HGSS's, for Lyra's scene");
  for (const n of J.filter((n) => /Gatehouse$/.test(n) && !ownGate(WORLD_MAPS[n]))) {
    const m = WORLD_MAPS[n], t = WORLD_MAPS[m.width === 13 ? "Route7_EastEntrance" : "Route5_SouthEntrance"];
    assert(m.width === t.width && m.height === t.height && m.collision.join() === t.collision.join(), n + " is FireRed's gate");
    for (const w of m.warps) assert(!m.collision[w.y * m.width + w.x], n + ": its doorways are floor");
  }
  assert(WORLD_MAPS.Route27.anim && fs.existsSync(path.join(root, "assets/world/maps/Route27-anim.png")), "Johto's sea moves");
  {
    const Painter = require(path.join(root, "tools/lib/fr-painter.js"));
    // A pond in a meadow, a tree line above: grass, water with shores, trees, as Kanto has them.
    const g = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) g.push(y < 2 ? "tree" : x >= 2 && x < 6 && y >= 4 && y < 7 ? "water" : "grass");
    const blocks = Painter.paint(g, 8, 8);
    const style = require(path.join(root, "tools/data/fr-style.json"));
    const kantoUses = (cls, id) => style.styles.outdoor.patterns[cls].some(([, counts]) => counts[id]);
    for (let i = 0; i < 64; i++) assert(kantoUses(g[i], blocks[i]), "tile " + i + ": a metatile Kanto uses for " + g[i]);
    assert(new Set(blocks.filter((b, i) => g[i] === "water")).size > 1, "the pond has shores");
    assert(Painter.stamps.some((t) => t.kind === "pokecenter") && Painter.stamps.some((t) => t.kind === "mart") && Painter.stamps.every((t) => t.blocks[t.door[1] * t.w + t.door[0]] != null));
  }
  // East: Route 27, then Route 26 (north of its east end).
  assert.strictEqual(World.step({ map: "NewBarkTown", x: 31, y: 15 }, "right", null, { surf: true }).map, "Route27", "east out of New Bark Town, by sea");
  assert.deepStrictEqual(WORLD_MAPS.Route27.connections.find((c) => c.map === "Route26"), { map: "Route26", direction: "right", offset: -96 });
  // Tohjo Falls: in and out of Route 27 both ways; its waterfalls are Waterfall's, not walls.
  for (const [i, w] of WORLD_MAPS.TohjoFalls.warps.entries()) if (w.map) assert.strictEqual(WORLD_MAPS[w.map].warps[w.warp].map, "TohjoFalls", "Tohjo Falls warp " + i);
  const tf = WORLD_MAPS.TohjoFalls, falls = tf.behavior.map((b, i) => [b, i]).filter(([b]) => b === World.MB.WATERFALL);
  assert(falls.length >= 10 && falls.every(([, i]) => !tf.collision[i]), "Tohjo Falls' waterfalls");
  // The League gate: its west mat to Route 26's door, and back; nothing else in Kanto leads to Johto.
  const gate = WORLD_MAPS.Route22_NorthEntrance, gw = gate.warps.findIndex((w) => w.map === "Route26");
  const r26 = WORLD_MAPS.Route26.warps.filter((w) => w.map === "Route22_NorthEntrance");
  assert(gw >= 0 && r26.length === 2 && r26.every((w) => w.warp === gw) && WORLD_MAPS.Route26.warps[gate.warps[gw].warp] === r26[0]);
  assert(gate.patches.johto && fs.existsSync(path.join(root, "assets/world/maps/Route22_NorthEntrance-patch-johto.png")));
  assert(!Object.values(WORLD_MAPS).some((m) => m.region !== "johto" && m.name !== "Route22_NorthEntrance" && m.warps.some((w) => J.includes(w.map))), "only the gate");
  const guard = gate.people.find((p) => p.script === "Route22_NorthEntrance_EventScript_JohtoGuard");
  assert(guard && guard.x === gate.warps[gw].x + 1 && guard.y === gate.warps[gw].y, "the guard stands before the way west");
  for (const y of [-1, 1]) assert(gate.collision[(gate.warps[gw].y + y) * gate.width + gate.warps[gw].x], "the mat's only way in is past him");
  // (And its east mat, to Route 28 and Mt. Silver, with a guard of its own.)
  const ge = gate.warps.findIndex((w) => w.map === "Route28");
  assert(ge >= 0 && WORLD_MAPS.Route28.warps.filter((w) => w.map === "Route22_NorthEntrance").every((w) => w.warp === ge) && gate.patches["johto-east"]);
  assert(gate.people.some((p) => p.script === guard.script && p.x === gate.warps[ge].x - 1 && p.y === gate.warps[ge].y), "a guard before the way east");
  assert(/JohtoGuard"\) return !f\.gameClear;/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")), "he's there until you're Champion");
}

// The Pokéathlon (tools/build-pokeathlon.js's tools/lib/johto-pokeathlon.generated.js,
// ui/pokeathlon.js, ui/pokeathlon-events.js): HGSS's Performance stats, the Dome's
// receptions' script and its Athlete Shop's prizes, and every event played through.
{
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const sb = { window: { JOHTO_SCRIPTS: { zones: { D49R0101: copy(JOHTO_SCRIPTS.zones.D49R0101) }, messages: {}, yesno: {} },
    WORLD_MAPS: { PokeathlonDome_Interior_1F: copy(WORLD_MAPS.PokeathlonDome_Interior_1F) }, DEX, ITEMS, NATURES } };
  for (const f of ["tools/lib/johto-pokeathlon.generated.js", "ui/pokeathlon-events.js", "ui/pokeathlon.js"]) vm.runInNewContext(fs.readFileSync(path.join(root, f), "utf8"), sb, { filename: f });
  const PA = sb.window.POKEATHLON, PK = sb.window.Pokeathlon, PE = sb.window.PokeathlonEvents;
  assert(Object.keys(PA.perf).length === 493 && PA.natures.length === 25 && PA.prizes.length === 14, "HGSS's Performance, natures and prize lists");
  // (Pikachu: Speed, Power, Skill, Stamina, Jump, each its base, lowest and highest, 0-4.)
  assert.strictEqual(PA.perf.Pikachu, "213203203203213");
  for (const day of PA.prizes) for (const [id, pts] of day) assert(ITEMS[id] && pts >= 100, "a prize: " + id);
  assert(PA.prizes[7].some(([id, pts]) => id === "shiny-stone" && pts === 3000) && PA.prizes[1].some(([id]) => id === "rare-candy"), "Sunday's Shiny Stone, Monday's Rare Candy");
  const z = sb.window.JOHTO_SCRIPTS.zones["0167"], dome = sb.window.WORLD_MAPS.PokeathlonDome_Interior_1F;
  assert(z && "scr_seq_0167_000" in z.labels && z.cmds.some((c) => c[0] === "Pokeathlon") && z.moves._0848, "the receptions' script, scr_seq_0167");
  assert(dome.people.some((p) => p.script === "hgss:0167:scr_seq_0167_000"), "the reception's receptionist runs it");
  assert(sb.window.JOHTO_SCRIPTS.zones.D49R0101.cmds.some((c) => c[0] === "SetVar" && c[2] === "lemonade"), "the vending machine's drinks");
  // Performance today: within each species' bounds, the day and nature moving it.
  const mon = { species: "Pikachu", personality: 3141592653, nature: "Adamant" };
  const a = PK.performance(mon, new Date(2024, 0, 15)), b = PK.performance(mon, new Date(2024, 0, 15));
  assert.deepStrictEqual(a, b, "the same all day");
  PK.STATS.forEach((k, i) => assert(a[k] >= +PA.perf.Pikachu[i * 3 + 1] + 1 && a[k] <= +PA.perf.Pikachu[i * 3 + 2] + 1 && a.max[k] === +PA.perf.Pikachu[i * 3 + 2] + 1, k));
  assert(PK.COURSES.length === 5 && PK.COURSES.every((c) => c.events.length === 3 && c.events.every((id) => PE.EVENTS[id])), "five courses of three events");
  assert.strictEqual(new Set([].concat(...PK.COURSES.map((c) => c.events))).size, 10, "all ten events");
  // Each event, the computer playing every team: it ends, and a team of five stars beats one of one star overall.
  const team = (n) => ({ name: "T" + n, mons: [0, 1, 2].map(() => ({ species: "Pikachu", stats: { speed: n, power: n, skill: n, stamina: n, jump: n } })) });
  const totals = [0, 0, 0, 0];
  for (const id of Object.keys(PE.EVENTS)) {
    const r = PE.simulate(id, [team(1), team(3), team(3), team(5)], mulberry32(7));
    assert(r.over && r.points.every((n) => n >= 0 && n < 1000), id + " ends: " + r.points);
    r.points.forEach((n, t) => { totals[t] += n; });
  }
  assert(totals[3] > totals[0], "stars count: " + totals);
  // (The Dome's own commands, from ui/johto-script.js; the Athlete Shop paid in points.)
  assert(/window\.Pokeathlon\.handles\(op\)/.test(fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8")));
  assert(/Pokeathlon\.attach\(/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  assert(/st\.opts\.currency/.test(fs.readFileSync(path.join(root, "ui/shop-screen.js"), "utf8")));
}

// Faraway Island (data/emerald-maps.js, from Emerald) and its Mew (game/faraway.js).
{
  const E = WORLD_MAPS.FarawayIsland_Entrance, I = WORLD_MAPS.FarawayIsland_Interior;
  assert(E && I && E.region === "emerald", "Faraway Island is built");
  for (const m of [E, I]) for (const k of ["collision", "behavior", "elevation"]) assert.strictEqual(m[k].length, m.width * m.height, m.name + " " + k);
  assert.strictEqual(World.warpTarget(E.warps[0]).map, "FarawayIsland_Interior", "the shore leads in");
  assert.strictEqual(World.warpTarget(I.warps[0]).map, "FarawayIsland_Entrance", "and back out");
  assert(!Object.values(WORLD_MAPS).some((m) => m.connections.some((c) => c.map === E.name || c.map === I.name)), "only the Seagallop goes there");
  assert(E.signs[0].text[1].startsWith("“…ber, 6th day"), "the old sign");
  assert(ITEMS["old-sea-map"] && Bag.isKeyItem("old-sea-map"), "the Old Sea Map is a key item");
  const grass = Faraway.isGrass("FarawayIsland_Interior");
  assert(grass(13, 14) && !grass(14, 9), "Mew's grass, not the rocks");
  // Mew moves away from you, and shows itself every 8th step (and stays put the 9th).
  const r = Faraway.mewStep({ mew: { x: 16, y: 14 }, prev: { x: 16, y: 17 }, cur: { x: 16, y: 16 }, steps: 1, isGrass: grass, rng: () => 0 });
  // (Against the rock at (13, 13) it goes round: Emerald's check for being trapped.)
  assert.strictEqual(Faraway.mewStep({ mew: { x: 13, y: 14 }, prev: { x: 13, y: 17 }, cur: { x: 13, y: 16 }, steps: 1, isGrass: grass }).dir, "right");
  assert.deepStrictEqual(r, { dir: "up", visible: false }, "up, away from you");
  assert.strictEqual(Faraway.mewStep({ mew: { x: 13, y: 14 }, prev: { x: 13, y: 17 }, cur: { x: 13, y: 16 }, steps: 8, isGrass: grass }).visible, true);
  assert.strictEqual(Faraway.mewStep({ mew: { x: 13, y: 14 }, prev: { x: 13, y: 17 }, cur: { x: 13, y: 16 }, steps: 9, isGrass: grass }).dir, null);
  assert.strictEqual(Faraway.mewStep({ mew: { x: 13, y: 14 }, prev: { x: 13, y: 16 }, cur: { x: 13, y: 16 }, steps: 3, isGrass: grass }).dir, null, "turning isn't a step");
}

// Orre's Outskirt Stand (data/orre-maps.js, tools/build-orre.js) and Wes (game/orre.js).
{
  const O = WORLD_MAPS.OutskirtStand, D = WORLD_MAPS.OutskirtStand_Diner;
  assert(O && D && O.region === "orre" && D.region === "orre", "the Outskirt Stand is built");
  for (const m of [O, D]) {
    for (const k of ["collision", "behavior", "elevation", "encounter"]) assert.strictEqual(m[k].length, m.width * m.height, m.name + " " + k);
    for (const p of m.people) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + p.sprite + ".png")), "missing sprite " + p.sprite);
    for (const f of ["", "-border"].concat(m.top ? ["-top"] : [])) assert(fs.existsSync(path.join(root, "assets/world/maps/" + m.name + f + ".png")), m.name + f);
  }
  // The door leads in (walking up into it), the mats back out.
  const door = O.warps[0];
  assert.strictEqual(O.behavior[door.y * O.width + door.x], World.MB.WARP_DOOR);
  assert.deepStrictEqual(World.step({ map: "OutskirtStand", x: door.x, y: door.y + 1 }, "up").warp.map, "OutskirtStand_Diner");
  for (const w of D.warps) assert.strictEqual(World.warpTarget(w).map, "OutskirtStand");
  // North and south are roads not built yet; nothing leads there from elsewhere.
  assert.deepStrictEqual(O.connections.map((c) => [c.direction, c.map, c.mapConst]), [["up", null, "MAP_PHENAC_CITY"], ["down", null, "MAP_SNAGEM_HIDEOUT"]]);
  assert(!Object.values(WORLD_MAPS).some((m) => m.connections.some((c) => c.map === O.name) || m.warps.some((w) => w.map === O.name && m !== D)), "only the debug menu goes there");
  // Across the bar from the bartender: a counter.
  const bar = D.people.find((p) => p.script === "OutskirtStand_Diner_EventScript_Bartender");
  assert.strictEqual(D.behavior[(bar.y + 1) * D.width + bar.x], World.MB.COUNTER);
  assert.strictEqual(D.collision[(bar.y + 2) * D.width + bar.x], 0, "room to stand and order");
  // The truck's footprint is solid while it's there.
  assert.deepStrictEqual(Orre.patches("OutskirtStand", { orre: 1 }), ["truck"]);
  assert.deepStrictEqual(Orre.patches("OutskirtStand", { orre: 2 }), []);
  assert.strictEqual(O.patches.truck.collision.length, 4);
  // Who's there as the opening goes on.
  const who = (step) => O.people.concat(D.people).filter((p) => Orre.visible(p, { orre: step }) !== false).map((p) => p.localId.replace("LOCALID_ORRE_", ""));
  assert.deepStrictEqual(who(0).filter((k) => ["TRUCK", "BIKE", "DINER_WILLIE"].includes(k)), ["TRUCK", "DINER_WILLIE"]);
  assert.deepStrictEqual(who(2).filter((k) => ["TRUCK", "BIKE", "DINER_WILLIE"].includes(k)), ["BIKE", "DINER_WILLIE"]);
  assert(!who(3).includes("DINER_WILLIE") && !who(3).includes("FOLLY") && !who(3).includes("WILLIE"), "Willie's gone once battled; Folly and Trudly only in their scene");
  // Becoming Wes and back.
  const pl = Player.create("Ash");
  pl.party = [Party.create("Pikachu", 12)];
  pl.bag = { potion: 3 };
  pl.location = { map: "PalletTown", x: 5, y: 6, facing: "up" };
  const mine = JSON.stringify([pl.name, pl.look, pl.party, pl.bag, pl.money, pl.trainerId]);
  Orre.enter(pl);
  assert.deepStrictEqual([pl.name, pl.look, pl.location.map], ["Wes", "wes", "OutskirtStand"]);
  assert.deepStrictEqual(pl.party.map((r) => [r.species, r.level, r.moves.map((m) => m.name).join("/")]),
    [["Espeon", 25, "Confusion/Return/Reflect/Helping Hand"], ["Umbreon", 26, "Bite/Secret Power/Taunt/Snatch"]]);
  assert(Orre.inOrre(pl.location) && !Orre.inOrre({ map: "PalletTown" }));
  assert.deepStrictEqual(Object.keys(pl.bag), [], "Wes starts with an empty Bag");
  pl.party[0].level = 26;
  pl.location = { map: "OutskirtStand_Diner", x: 7, y: 10, facing: "up" };
  Orre.leave(pl);
  assert.strictEqual(JSON.stringify([pl.name, pl.look, pl.party, pl.bag, pl.money, pl.trainerId]), mine, "all yours again");
  assert.deepStrictEqual(pl.location, { map: "PalletTown", x: 5, y: 6, facing: "up" });
  assert(!pl.flags.orreStash);
  Orre.enter(pl);
  assert.deepStrictEqual([pl.party[0].level, pl.location.map], [26, "OutskirtStand_Diner"], "Wes as he was left");
  Orre.leave(pl);
  // A save made as Wes loads as Wes (and doesn't hand him an Exp. Share or the Explorer Kit).
  Orre.enter(pl);
  const back = Player.load(JSON.parse(JSON.stringify(pl))).player;
  assert.deepStrictEqual([back.name, back.look, back.bag], ["Wes", "wes", {}]);
  // Rider Willie, and the bar's stock (no Escape Rope: it would take Wes to Kanto).
  assert.deepStrictEqual(Orre.willieTeam().map((r) => [r.species, r.level]), [["Zigzagoon", 23], ["Zigzagoon", 24]]);
  assert(Orre.SHOP.every((id) => ITEMS[id]) && !Orre.SHOP.includes("escape-rope"));
  for (const f of ["trainers/back/wes", "trainers/front/wes", "trainers/front/rider_willie"]) assert(fs.existsSync(path.join(root, "assets/sprites/" + f + ".png")), f);
  for (const k of ["", "_run", "_bike", "_surf", "_fish"]) assert(fs.existsSync(path.join(root, "assets/world/sprites/player_wes" + k + ".png")));
}

// Berry Crush (game/berry-crush.js): two players, Oran and Cheri Berries (100
// presses between them), both pressing every 8 frames together.
{
  assert.deepStrictEqual(BerryCrush.stats("oran-berry"), { difficulty: 50, powder: 30 });
  const g = BerryCrush.create([{ name: "Red", berry: "oran-berry" }, { name: "Cpu", berry: "cheri-berry" }]);
  assert.strictEqual(g.targetAPresses, 100);
  let fx, frames = 0;
  do { frames++; const on = frames % 8 === 0; fx = BerryCrush.step(g, [on, on], [on, on]); } while (!fx.done && frames < 5000);
  // (Together: 2 presses plus 1 for being in step, so 34 rounds of 3 reach 100.)
  assert.strictEqual(frames, 34 * 8, "the crusher is down after 34 pairs of presses");
  assert.strictEqual(fx.depth, 32);
  assert.strictEqual(g.players[0].numSyncedAPresses, 34, "every press in step");
  const r = BerryCrush.results(g, () => 0);
  assert.strictEqual(r.page, "neatness");
  assert.strictEqual(r.random[0].stat >> 4, 97, "33 of 34 presses neat");
  assert.strictEqual(r.silkiness, 100, "7 or 8 presses every 30 frames: big sparkles every time, 100%");
  assert.strictEqual(r.powder, 50 * 2, "powder x players x silkiness");
  assert.strictEqual(BerryCrush.speedText(r.pressingSpeed), "15.00", "68 presses in 4.53 seconds");
  assert.strictEqual(BerryCrush.speedText(0x0440), "4.25");
}

// Fishing (World.fishingEncounter): each rod its own slots of the map's fishing_mons.
{
  const rolls = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  assert.strictEqual(World.fishingEncounter("Route12", "old-rod", rolls([0.1, 0])).species, "Magikarp", "Old Rod: Magikarp");
  const good = World.fishingEncounter("Route12", "good-rod", rolls([0.7, 0.9]));
  assert.strictEqual(good.slot, 3, "Good Rod 60-79: slot 3");
  assert.strictEqual(World.fishingEncounter("Route12", "super-rod", rolls([0.995, 0.9])).slot, 9, "Super Rod 99: slot 9");
  assert.strictEqual(World.fishingEncounter("PewterCity", "old-rod"), null, "nothing to fish in Pewter");
  assert(World.canFish({ map: "Route12", x: 19, y: 63 }, "right", false), "the Route 12 pier faces water");
  assert(!World.canFish({ map: "Route12", x: 19, y: 63 }, "left", false), "...not land");
  // Other weights for a rod's slots (the Super Rod's at a high fishing level).
  assert.strictEqual(World.fishingEncounter("Route12", "super-rod", rolls([0.96, 0.9]), [30, 30, 25, 10, 5]).slot, 9, "96: slot 9 (only 99 is, with FireRed's)");
}

// Fishing levels (game/fishing.js): one Fishing Rod; the level picks which
// rod's slots a bite comes from, and each bite's XP goes by that rod.
{
  const rolls = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  assert.deepStrictEqual([0, 20, 380, 580].map(Fishing.level), [1, 2, 20, 25], "mining's levels");
  // Only the Old Rod's Pokémon at first, the Good Rod's from 10, the Super Rod's from 25.
  for (const r of [0, 0.5, 0.99]) assert.strictEqual(Fishing.pickRod(1, () => r), "old-rod");
  assert.deepStrictEqual([0.5, 0.7].map((r) => Fishing.pickRod(10, () => r)), ["old-rod", "good-rod"]);
  assert.deepStrictEqual([0.2, 0.5, 0.8].map((r) => Fishing.pickRod(25, () => r)), ["old-rod", "good-rod", "super-rod"]);
  assert.strictEqual(Fishing.pickRod(100, () => 0.3), "super-rod", "mostly the Super Rod's at the top");
  assert.deepStrictEqual(Fishing.superWeights(49), [40, 40, 15, 4, 1]);
  assert.deepStrictEqual(Fishing.superWeights(80), [30, 30, 25, 10, 5]);
  const low = Fishing.encounter("Route12", 1, rolls([0.5, 0.1, 0]));
  assert.deepStrictEqual([low.species, low.rod, low.xp], ["Magikarp", "old-rod", 10]);
  const high = Fishing.encounter("Route12", 100, rolls([0.99, 0.5, 0]));
  assert.deepStrictEqual([high.rod, high.xp], ["super-rod", 20]);
  assert(high.slot >= 5, "a Super Rod slot");
  assert.strictEqual(Fishing.encounter("PewterCity", 50), null, "nothing to fish in Pewter");
  assert.strictEqual(Fishing.encounter("NewBarkTown", 1, () => 0).species, "Magikarp", "Johto's rods too");
  // Saves with the old rods have the Fishing Rod instead (registered too).
  const old = JSON.parse(Player.serialize(Object.assign(Player.create("RED", 0), { bag: { "old-rod": 1, "super-rod": 1 } })));
  old.flags.registered = "super-rod";
  const loaded = Player.load(old).player;
  assert.deepStrictEqual([loaded.bag["fishing-rod"], loaded.bag["old-rod"], loaded.bag["super-rod"], loaded.flags.registered], [1, undefined, undefined, "fishing-rod"]);
}

// FireRed's encounter check (World.stepEncounter): after an encounter, Mt. Moon
// (rate 7) waits out its cooldown of 8 steps, each only a 5% chance of going on,
// and a missed roll builds up the buff. Coming out of Mt. Moon, you step out
// of the cave's mouth.
{
  const st = { steps: 0, buff: 0, prev: null };
  const m = WORLD_MAPS.MtMoon_1F;
  let gx = 0, gy = 0;
  for (let i = 0; i < m.width * m.height; i++) {
    if (World.isGrass(World.blockAt("MtMoon_1F", i % m.width, Math.floor(i / m.width))) && !m.collision[i]) { gx = i % m.width; gy = Math.floor(i / m.width); break; }
  }
  for (let i = 0; i < 8; i++) assert.strictEqual(World.stepEncounter(st, "MtMoon_1F", gx, gy, { rng: () => 0.5 }), null, "cooldown step " + i);
  assert.strictEqual(st.steps, 8);
  assert.strictEqual(World.stepEncounter(st, "MtMoon_1F", gx, gy, { rng: () => 0.5 }), null, "a missed roll");
  assert.strictEqual(st.buff, 7);
  const seq = [0, 0, 0.5]; let k = 0;
  assert(World.stepEncounter(st, "MtMoon_1F", gx, gy, { rng: () => seq[k++] || 0 }), "past the cooldown: an encounter");
  assert.deepStrictEqual([st.steps, st.buff], [0, 0]);
  const out = World.warpTarget(WORLD_MAPS.MtMoon_1F.warps.find((w) => w.map === "Route4"));
  assert(out.door, "out of Mt. Moon: step out of the cave's mouth");
}

// The Move Relearner and Move Deleter sit on the cushions upstairs in every
// Pokémon Center; the Marts have no upstairs, and a save made up there loads
// just inside the Mart's door.
for (const name of Object.keys(WORLD_MAPS).filter((n) => /_PokemonCenter_2F$/.test(n))) {
  const m = WORLD_MAPS[name];
  const tutors = m.people.filter((q) => /^CenterUpstairs_/.test(q.script)).map((q) => q.script + "@" + q.x + "," + q.y).sort();
  assert.deepStrictEqual(tutors, ["CenterUpstairs_EventScript_MoveDeleter@10,7", "CenterUpstairs_EventScript_MoveRelearner@6,7"], name);
  assert(new Set(m.people.map((q) => q.id)).size === m.people.length, name + ": people's ids are distinct");
}
for (const mart of ["ViridianCity_Mart", "PewterCity_Mart"]) {
  assert(!WORLD_MAPS[mart + "_2F"] && !WORLD_MAPS[mart].warps.some((w) => /_2F$/.test(w.map || "")), mart + " has no upstairs");
  const old = Player.create("U");
  old.location = { map: mart + "_2F", x: 6, y: 7, facing: "down" };
  const loaded = Player.load(JSON.parse(Player.serialize(old))).player.location;
  assert.strictEqual(loaded.map, mart);
}

// Music and cries: FireRed's songs played by its sound engine (game/m4a.js).
{
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/audio/music.js"), "utf8"), { filename: "assets/audio/music.js" });
  const { songs, bank } = window.MUSIC_DATA;
  // Every song the game asks for exists: each map's, and the ones named in the UI.
  const named = new Set(Object.values(WORLD_MAPS).map((m) => m.music).filter(Boolean));
  for (const t of Object.values(WORLD_TRAINERS)) named.add(t.music);
  for (const f of ["ui/game.js", "ui/battle-screen.js", "ui/intro.js"]) {
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/"(mus_[a-z0-9_]+)"/g)) named.add(m[1]);
  }
  // (Johto's gs_ songs are HGSS's, in assets/audio/johto-music.js: below.)
  for (const name of named) if (!/^gs_/.test(name)) assert(songs[name], "missing song " + name);
  // Pallet Town: a loop, seamless (the loop part is the second time through), and in range.
  const r = M4A.render(songs.mus_pallet, bank);
  assert.strictEqual(r.rate, 13379);
  assert(r.loopStart > 0 && r.loopEnd > r.loopStart, "Pallet Town loops");
  assert(r.left.every((v) => v >= -1 && v <= 1) && r.right.every((v) => !Number.isNaN(v)));
  // A jingle doesn't loop; and A4 on a square and on a sample comes out at 440 Hz.
  assert.strictEqual(M4A.render(songs.mus_heal, bank).loopStart, null);
  const hz = (prog) => {
    const g = songs.mus_pallet.group;
    const out = M4A.render({ group: g, vol: 127, reverb: 0, division: 24, tempos: [[0, 500000]], loop: null, end: 96,
      tracks: [[0, 1, prog, 0, 2, 7, 127, 0, 0, 69, 127, 96]] }, bank);
    let z = 0; const a = out.left, s0 = Math.floor(0.2 * out.rate), s1 = Math.floor(0.8 * out.rate);
    for (let i = s0 + 1; i < s1; i++) if ((a[i - 1] < 0) !== (a[i] < 0)) z++;
    return z / 2 / 0.6;
  };
  assert(Math.abs(hz(0) - 440) < 3, "square A4: " + hz(0));
  assert(Math.abs(hz(4) - 440) < 3, "sample A4: " + hz(4));
  // A cry for each of the first 386.
  for (let n = 1; n <= 386; n++) assert(fs.existsSync(path.join(root, "assets/audio/cries", n + ".wav")), "cry " + n);
}

// Johto's music: HGSS's songs, played by the DS's sound player (game/nds-sound.js).
{
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/audio/johto-music.js"), "utf8"), { filename: "assets/audio/johto-music.js" });
  const NDS = require(path.join(root, "game/nds-sound.js"));
  const J = window.JOHTO_MUSIC_DATA;
  // Every gs_ song asked for is there: the maps', and the ones named in the UI;
  // and each HGSS sequence in tools/lib/hgss-music.json.
  const named = new Set(Object.values(WORLD_MAPS).map((m) => m.music).filter((m) => /^gs_/.test(m || "")));
  for (const f of ["ui/game.js", "ui/audio.js", "ui/battle-screen.js"]) {
    for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/"(gs_[a-z0-9_]*[a-z0-9])"/g)) named.add(m[1]);
  }
  for (const v of Object.values(JSON.parse(fs.readFileSync(path.join(root, "tools/lib/hgss-music.json"), "utf8")))) named.add(v);
  for (const name of named) assert(J.songs[name], "missing Johto song " + name);
  for (const name of ["gs_t_wakaba", "gs_r_1_29", "gs_vs_norapoke", "gs_vs_trainer", "gs_vs_gymreader", "gs_vs_rival", "gs_vs_rocket",
    "gs_win1", "gs_win2", "gs_win3", "gs_eye_j_shounen", "gs_eye_j_shoujo", "gs_eye_j_ayashii", "gs_eye_k_shounen", "gs_eye_k_shoujo",
    "gs_eye_k_ayashii", "gs_eye_bouzu", "gs_eye_maiko", "gs_eye_rocket", "gs_e_rival1", "gs_pokesen", "gs_gym", "gs_utsugi_rabo",
    "gs_bicycle", "gs_naminori", "gs_me_lvup", "gs_me_item", "gs_me_badge", "gs_me_asa"]) assert(J.songs[name], "no " + name);
  // New Bark Town: a loop, in range; a jingle that doesn't loop.
  const r = NDS.render(J.songs.gs_t_wakaba, J);
  assert.strictEqual(r.rate, 32728);
  assert(r.loopStart > 0 && r.loopEnd > r.loopStart, "New Bark Town loops");
  assert(r.left.every((v) => v >= -1 && v <= 1) && r.right.every((v) => !Number.isNaN(v)));
  assert.strictEqual(NDS.render(J.songs.gs_me_lvup, J).loopStart, null);
  // A4 on a PSG square comes out at 440 Hz.
  const hz = (bank, prog) => {
    J.sequences._test = [{ ev: [], events: [[0, 1, prog], [0, 0xc1, 127], [0, 0, 69, 127, 96]], loop: -1, loopTick: 0, end: 96 }];
    const out = NDS.render({ seq: "_test", bank, vol: 127, loop: null }, J);
    delete J.sequences._test;
    let z = 0; const a = out.left, s0 = Math.floor(0.1 * out.rate), s1 = Math.floor(0.4 * out.rate);
    for (let i = s0 + 1; i < s1; i++) if ((a[i - 1] < 0) !== (a[i] < 0)) z++;
    return z / 2 / 0.3;
  };
  const wakabaBank = J.banks[J.songs.gs_t_wakaba.bank], psg = wakabaBank.findIndex((i) => i && i.t === "psg");
  assert(psg >= 0, "a PSG instrument");
  assert(Math.abs(hz(J.songs.gs_t_wakaba.bank, psg) - 440) < 4, "PSG A4: " + hz(J.songs.gs_t_wakaba.bank, psg));
}

// The VS Seeker: a key item with FireRed's picture and description, given in
// Vermilion's Pokémon Center; the S.S. Anne's resting woman's lines are there too.
{
  assert(window.ITEMS["vs-seeker"] && Bag.isKeyItem("vs-seeker") && Bag.sprite("vs-seeker") && window.ITEM_DESCRIPTIONS["vs-seeker"]);
  assert.strictEqual(Bag.name("vs-seeker"), "VS Seeker");
  for (const l of ["UrgeToBattleSomeoneAgain", "UseDeviceForRematches", "ExplainVSSeeker"]) assert(window.WORLD_TEXT["VermilionCity_PokemonCenter_1F_Text_" + l], l);
  for (const l of ["TakeAShortRest", "GladEveryoneIsRefreshed", "SorryYouLookLikeMyBrother", "SorryYouLookLikeMySister"]) assert(window.WORLD_TEXT["SSAnne_1F_Room6_Text_" + l], l);
}

// Friendship, as in FireRed (AdjustFriendship): by how friendly it is now,
// half again with a Soothe Bell, +1 in a Luxury Ball or where it was met.
{
  const E = window.Experience;
  // (Level ups and walking count double here.)
  assert.strictEqual(E.adjustFriendship(70, "levelUp"), 80);
  assert.strictEqual(E.adjustFriendship(150, "levelUp"), 156);
  assert.strictEqual(E.adjustFriendship(210, "levelUp"), 214);
  assert.strictEqual(E.adjustFriendship(70, "levelUp", { item: "soothe-bell" }), 85);   // 10 * 1.5
  assert.strictEqual(E.adjustFriendship(70, "levelUp", { ball: "luxury-ball", metHere: true }), 82);
  assert.strictEqual(E.adjustFriendship(210, "tm"), 210);                                // nothing at 200+
  assert.strictEqual(E.adjustFriendship(210, "faintLarge", { ball: "luxury-ball" }), 200); // (no bonus on a loss)
  assert.strictEqual(E.adjustFriendship(0, "faintSmall"), 0);
  assert.strictEqual(E.adjustFriendship(255, "walking"), 255);
  // A vitamin pleases it; the bitter herbs don't.
  const r = Party.create("Pikachu", 20);
  r.happiness = 70;
  Bag.useOn(r, "protein");
  assert.strictEqual(r.happiness, 75);
  r.hp = 1;
  Bag.useOn(r, "energy-root");
  assert.strictEqual(r.happiness, 65);
  // A Rare Candy's level up: +10; the Day-Care's levels: nothing.
  Bag.levelUp(r);
  assert.strictEqual(r.happiness, 75);
  Bag.levelUp(r, { noFriendship: true });
  assert.strictEqual(r.happiness, 75);
  // Walking: +2, and one more where it was met.
  r.met = { map: "Route1", level: 3 };
  Party.adjustFriendship(r, "walking", "Route1");
  assert.strictEqual(r.happiness, 78);
  Party.adjustFriendship(r, "walking", "PalletTown");
  assert.strictEqual(r.happiness, 80);
  // Fainting in battle: -1, or -5 against a foe 30 levels higher; the foe's don't change.
  for (const [foeLevel, want] of [[40, 69], [60, 65]]) {
    const b = new Battle({ seed: 1, p1: { name: "A", team: [Object.assign(Party.toBattleSet(Party.create("Pikachu", 20)), { happiness: 70 })] },
      p2: { name: "B", team: [Object.assign(Party.toBattleSet(Party.create("Rattata", foeLevel)), { happiness: 70 })] } });
    b.start();
    b.faint(b.sides.p1.active);
    assert.strictEqual(b.sides.p1.pokemon[0].happiness, want, "fainting against Lv. " + foeLevel);
    b.faint(b.sides.p2.active);
    assert.strictEqual(b.sides.p2.pokemon[0].happiness, 70);
  }
}

// Everything the built maps' Marts stock can be bought (has a price).
for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) {
  for (const item of p.mart || []) assert(Bag.price(item) > 0, m.name + "'s Mart sells " + item + " for nothing");
}

// Pokémon Tower's Ghost (no Silph Scope): too scared to move, "Get out…",
// balls dodged, and running always works.
{
  const b = new Battle({ seed: 3, wild: true, ghost: true, p1: { name: "A", team: [Party.toBattleSet(Party.create("Pikachu", 5))] },
    p2: { name: "B", team: [Object.assign(Party.toBattleSet(Party.create("Gastly", 30)), { name: "Ghost" })] } });
  b.start();
  const p1 = b.sides.p1.active, foeHp = b.sides.p2.active.hp, hp = p1.hp;
  b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 });
  assert(b.events.some((e) => e[0] === "cant" && e[2] === "scared") && b.events.some((e) => e[0] === "-ghostgetout"));
  assert.strictEqual(b.sides.p2.active.hp, foeHp); assert.strictEqual(p1.hp, hp);
  b.choose("p1", { type: "ball", ball: "poke-ball" }); b.choose("p2", { type: "move", move: 0 });
  assert(b.events.some((e) => e[0] === "-ghostdodge") && !b.ended);
  b.choose("p1", { type: "run" }); b.choose("p2", { type: "move", move: 0 });
  assert(b.ended && b.escaped, "you always get away from the Ghost");
  assert(Bag.isKeyItem("silph-scope") && Bag.sprite("silph-scope") && Bag.isKeyItem("poke-flute") && Bag.sprite("poke-flute"));
}

// Disable names the move it disabled; Leech Life is Gen 7's.
{
  const b = new Battle({ seed: 5, p1: { name: "A", team: [Object.assign(Party.toBattleSet(Party.create("Pikachu", 50, { rng: mulberry32(51) })), { moves: ["Disable"] })] },
    p2: { name: "B", team: [Object.assign(Party.toBattleSet(Party.create("Snorlax", 50, { rng: mulberry32(52) })), { moves: ["Tackle"] })] } });
  b.start();
  b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 });
  b.choose("p1", { type: "move", move: 0 }); b.choose("p2", { type: "move", move: 0 });
  assert(b.events.some((e) => e[0] === "-start" && /disable/i.test(e[2]) && e[3] === "Tackle"), "Disable names the move");
  assert.deepStrictEqual([MOVES["Leech Life"].power, MOVES["Leech Life"].pp], [80, 10]);
  assert(WORLD_MAPS.Route10.wild.slots.some((s) => s.species === "Magnemite"), "Magnemite on Route 10");
}

// HMs outside battle (game/field-moves.js): known, or learnable with the HM
// in the Bag, and the badge either way.
{
  const pl = Player.create("T");
  const paras = Party.create("Paras", 20), squirtle = Party.create("Squirtle", 20);
  pl.party.push(paras, squirtle);
  assert.deepStrictEqual(FieldMoves.forMon(paras).filter((m) => ["Cut", "Flash", "Rock Smash"].includes(m)), ["Flash", "Cut", "Rock Smash"]);
  assert(FieldMoves.forMon(squirtle).includes("Surf") && !FieldMoves.forMon(squirtle).includes("Fly"));
  assert.strictEqual(FieldMoves.hmFor("Cut"), "hm01");
  assert.strictEqual(FieldMoves.hmFor("Rock Smash"), "hm08");
  assert.strictEqual(FieldMoves.check(pl, paras, "Cut"), "hm");          // no HM01
  Player.addItem(pl, "hm01");
  assert.strictEqual(FieldMoves.check(pl, paras, "Cut"), "badge");       // no Cascade Badge
  pl.badges.push("cascade");
  assert.strictEqual(FieldMoves.check(pl, paras, "Cut"), null);
  assert.strictEqual(FieldMoves.user(pl, "Cut"), paras);
  assert.strictEqual(FieldMoves.check(pl, squirtle, "Fly"), "unable");
  // Knowing the move does without the HM, but not without the badge.
  Party.teachMove(squirtle, "Surf", 0);
  assert.strictEqual(FieldMoves.check(pl, squirtle, "Surf"), "badge");
  pl.badges.push("soul");
  assert.strictEqual(FieldMoves.user(pl, "Surf"), squirtle);
}

// Surfing (game/world.js): over water, off onto the shore, not up a
// waterfall; the water's Pokémon while surfing.
{
  const m = window.WORLD_MAPS.Route24;
  assert(m.water && m.water.slots.length === 5, "Route 24 has water Pokémon");
  assert(m.cycling && !window.WORLD_MAPS.PewterCity_PokemonCenter_1F.cycling, "cycling outdoors only");
  assert(World.facingWater({ map: "Route24", x: 5, y: 16 }, "right"));
  assert(!World.step({ map: "Route24", x: 5, y: 16 }, "right").ok, "can't walk onto water");
  const on = World.step({ map: "Route24", x: 6, y: 16 }, "right", null, { surf: true });
  assert(on.ok && !on.dismount, "surf along the water");
  const off = World.step({ map: "Route24", x: 6, y: 16 }, "left", null, { surf: true });
  assert(off.ok && off.dismount, "hop off onto the shore");
  // A waterfall stops you (only Waterfall goes up it).
  const fake = { name: "Fall", width: 1, height: 3, collision: [0, 0, 0], elevation: [1, 1, 1], behavior: [0x10, 0x13, 0x10],
    encounter: [0, 0, 0], connections: [], warps: [], people: [] };
  window.WORLD_MAPS.Fall = fake;
  assert(World.step({ map: "Fall", x: 0, y: 2 }, "up", null, { surf: true }).waterfall);
  delete window.WORLD_MAPS.Fall;
  // Encounters: the water's table while surfing, none on land then.
  let mon = null;
  for (let i = 0; i < 2000 && !mon; i++) mon = World.stepEncounter({ steps: 99, buff: 0 }, "Route24", 7, 16, { surf: true });
  assert(mon && mon.species === "Tentacool", "a Tentacool on the water");
  assert(!World.stepEncounter({ steps: 99, buff: 0 }, "Route24", 7, 16, {}), "no grass Pokémon on water");
  // Fly's landing spots are on the maps.
  for (const [sec, spot] of Object.entries(window.TOWN_MAP.fly)) {
    const fm = window.WORLD_MAPS[spot.map];
    assert(fm && !fm.collision[spot.y * fm.width + spot.x], "Fly lands on open ground in " + sec);
  }
  assert(Bag.isKeyItem("bicycle") && Bag.sprite("bicycle"), "the Bicycle is a key item");
}

// Digging with the Explorer Kit (Diamond and Pearl's Underground).
{
  assert(window.ITEMS["explorer-kit"] && Bag.isKeyItem("explorer-kit") && Bag.sprite("explorer-kit"));
  assert.strictEqual(Player.create("T").bag["explorer-kit"], 1, "you start with the Explorer Kit");
  assert.strictEqual(Player.create("T").bag["berry-pouch"], 1, "...and the Berry Pouch");
  assert(Bag.isKeyItem("berry-pouch") && Bag.sprite("berry-pouch"));
  // Every treasure is a real item with a picture, and its shape has tiles.
  for (const [item, , shape] of Mining.TREASURES) {
    assert(window.ITEMS[item] && Bag.sprite(item), item);
    assert(shape.join("").includes("x") && shape.every((row) => row.length === shape[0].length), item + " shape");
  }
  // Mining level: 1 to start, rising with treasures dug out; each level lets
  // rarer treasures be buried.
  // Levels 1-100 from mining XP, on a curve: 20 + floor(L² / 20) from level L to L + 1.
  assert.strictEqual(Mining.MAX_LEVEL, 100);
  assert.deepStrictEqual([0, 19, 20, 40, 41, 497, 18364, 18365, 99999].map(Mining.level), [1, 1, 2, 3, 3, 20, 99, 100, 100]);
  assert.deepStrictEqual([Mining.toNext(0), Mining.toNext(25), Mining.toNext(18365)], [20, 15, null]);
  assert.deepStrictEqual(Mining.progress(25), { level: 2, into: 5, need: 20 });
  assert.deepStrictEqual([Mining.progress(497).need, Mining.progress(2985).need], [40, 145], "steeper further up");
  assert.deepStrictEqual(Mining.progress(18365), { level: 100, into: 0, need: 0 });
  // (Fishing keeps the old steps: 20 a level up to 20, then 40, 60, 80 and 100.)
  assert.deepStrictEqual([0, 19, 20, 380, 400, 420, 5979, 5980].map(Fishing.level), [1, 1, 2, 20, 20, 21, 99, 100]);
  // More energy at higher levels.
  assert.deepStrictEqual([Mining.maxEnergy(1), Mining.maxEnergy(2), Mining.maxEnergy(100)], [40, 42, 238]);
  assert(Mining.maxEnergy(50) > Mining.maxEnergy(10));
  // Rarer treasures unlock with levels; all fossils at 30.
  const unlock = (item) => Mining.TREASURES.find((t) => t[0] === item)[3];
  assert.deepStrictEqual(["heart-scale", "revive", "star-piece", "oval-stone", "fire-stone", "moon-stone", "helix-fossil", "root-fossil", "max-revive", "flame-plate"]
    .map(unlock), [1, 10, 10, 10, 20, 20, 30, 30, 63, 100]);
  // Each fossil is only found in its own caves: Kanto's in Mt. Moon; the
  // others in no cave yet.
  const fossils = (map) => Mining.available(100, map).map((t) => t[0]).filter((i) => /fossil|amber/.test(i));
  assert.deepStrictEqual(fossils("MtMoon_B2F"), ["helix-fossil", "dome-fossil", "old-amber"]);
  assert.deepStrictEqual(fossils("SomeOtherCave_1F"), []);
  const moon = mulberry32(12);
  for (let n = 0; n < 200; n++) {
    for (const t of Mining.create(moon, 100, "MtMoon_1F").treasures) assert(!/^(root|claw|skull|armor)-fossil$/.test(t.item), t.item);
  }
  assert.deepStrictEqual(Mining.available(1).map((t) => t[0]).sort(),
    ["blue-shard", "green-shard", "heart-scale", "red-shard", "yellow-shard"]);
  assert.deepStrictEqual(["everstone", "hard-stone"].map((i) => Mining.TREASURES.find((t) => t[0] === i)[3]), [5, 5]);
  // Vitamins from level 15, Bottle Caps from 40 and Gold Bottle Caps from 80.
  assert.deepStrictEqual(["hp-up", "protein", "iron", "calcium", "zinc", "carbos", "bottle-cap", "gold-bottle-cap"].map(unlock),
    [15, 15, 15, 15, 15, 15, 40, 80]);
  // At the top level everything turns up, but fossils only in their own caves.
  assert.strictEqual(Mining.available(Mining.MAX_LEVEL, "MtMoon_1F").length, Mining.TREASURES.length - 4, "all but Sinnoh's fossils in Mt. Moon");
  for (let lv = 1; lv <= Mining.MAX_LEVEL; lv++) assert(Mining.available(lv).length > 0);
  const low = mulberry32(11);
  for (let n = 0; n < 100; n++) {
    for (const t of Mining.create(low, 1).treasures) assert(Mining.available(1).some((a) => a[0] === t.item), t.item + " at level 1");
  }
  const r = mulberry32(7);
  for (let n = 0; n < 50; n++) {
    const dig = Mining.create(r, 1 + (n % Mining.MAX_LEVEL));
    const lvl = 1 + (n % Mining.MAX_LEVEL);
    assert(dig.treasures.length >= 1 && dig.treasures.length <= (lvl <= 10 ? 2 : lvl <= 20 ? 3 : 4));
    assert(dig.rock.every((l) => l >= 2 && l <= 6));
    // Treasures and bedrock never overlap.
    const seen = new Set();
    for (const t of dig.treasures) for (const [x, y] of t.cells) { const k = y * 13 + x; assert(!seen.has(k) && !dig.bedrock[k]); seen.add(k); }
  }
  // The pickaxe takes 2 off the tile and 1 off the four beside it, for 1
  // energy; the hammer also hits the corners, for 2. Each hit is 1 XP.
  const dig = Mining.create(mulberry32(3), 1);
  assert.deepStrictEqual([dig.energy, dig.maxEnergy, dig.xp], [40, 40, 0]);
  dig.rock.fill(4); dig.bedrock.fill(false);
  Mining.hit(dig, 5, 5, "pick");
  assert.deepStrictEqual([dig.rock[5 * 13 + 5], dig.rock[4 * 13 + 5], dig.rock[4 * 13 + 4], dig.energy, dig.xp], [2, 3, 4, 39, 1]);
  Mining.hit(dig, 5, 5, "hammer");
  assert.deepStrictEqual([dig.rock[5 * 13 + 5], dig.rock[4 * 13 + 5], dig.rock[4 * 13 + 4], dig.energy, dig.xp], [0, 2, 3, 37, 2]);
  // A treasure is found once all its tiles are cleared (10 XP more each); all
  // found ends the dig.
  for (const t of dig.treasures) for (const [x, y] of t.cells) dig.rock[y * 13 + x] = 0;
  const last = Mining.hit(dig, 0, 0, "pick");
  assert.deepStrictEqual(last.found, dig.treasures.map((t) => t.item));
  assert.strictEqual(last.xp, 1 + 10 * dig.treasures.length);
  assert(dig.over && !dig.tired);
  // Out of energy, the dig ends, keeping only what was dug out.
  const tired = Mining.create(mulberry32(4), 1);
  for (let i = 0; i < 100 && !tired.over; i++) Mining.hit(tired, 12, 9, "pick");
  assert(tired.over && tired.tired && tired.energy === 0);
  assert.deepStrictEqual(Mining.found(tired), tired.treasures.filter((t) => t.found).map((t) => t.item));
  // The tools, by mining level: the hammer from 5, the bomb from 10, the survey kit from 20.
  assert.deepStrictEqual([1, 4, 5, 10, 19, 20, 100].map((lv) => Mining.tools(lv).map((t) => t.id).join()),
    ["pick", "pick", "pick,hammer", "pick,hammer,bomb", "pick,hammer,bomb", "pick,hammer,bomb,survey", "pick,hammer,bomb,survey"]);
  assert(Mining.ENERGY_COST.bomb > Mining.ENERGY_COST.hammer);
  assert.strictEqual(Mining.ENERGY_COST.bomb, 12, "the bomb costs 12 energy");
  {
    const g = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), o = fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8");
    // (The fossil doctors revive any fossil in your Bag: those dug up mining too.)
    assert(/const can = FOSSILS\.filter\(\(fo\) => Player\.itemCount\(player, fo\.item\)\)/.test(g));
    for (const t of Mining.TREASURES.filter((t) => /fossil|amber/.test(t[0]))) assert(new RegExp('item: "' + t[0] + '"').test(g), t[0] + " can be revived");
    // (The Rejuvenator upstairs in every Pokémon Center; Kindle Road's Black Belts running back and forth; the Ember Spa's bathers in up to the waist.)
    assert(/if \(\/_PokemonCenter_2F\$\/\.test\(map\)\) \{\n\s*out\.push\(Object\.assign\(\{ id: 902/.test(g), "the Rejuvenator upstairs");
    assert(/walkBackAndForth\(p, bf\[1\]\)/.test(o) && WORLD_MAPS.OneIsland_KindleRoad.people.some((p) => p.movement === "walk_left_and_right"));
    assert(/const HOT_SPRINGS = 0x28/.test(o) && WORLD_MAPS.OneIsland_KindleRoad_EmberSpa.behavior.includes(0x28));
  }
  // The bomb: somewhere at random, 2 layers off close by and 1 a little further.
  const bomb = Mining.create(mulberry32(5), 10);
  bomb.rock.fill(4); bomb.bedrock.fill(false);
  const e0 = bomb.energy, b = Mining.hit(bomb, 0, 0, "bomb");
  const [bx, by] = b.at, at = (x, y) => bomb.rock[y * 13 + x];
  assert.strictEqual(at(bx, by), 2, "2 off where it went off");
  assert(bomb.rock.filter((n) => n === 2).length >= 5 && bomb.rock.some((n) => n === 3) && bomb.rock.some((n) => n === 4), "a patch, not the whole wall");
  assert.strictEqual(bomb.energy, e0 - Mining.ENERGY_COST.bomb);
  // The survey kit: what's still buried, for its energy; nothing dug.
  const sv = Mining.create(mulberry32(6), 20), rock0 = sv.rock.slice(), e1 = sv.energy;
  assert.deepStrictEqual(Mining.survey(sv), sv.treasures.map((t) => t.item));
  assert.deepStrictEqual(sv.rock, rock0);
  assert.strictEqual(sv.energy, e1 - Mining.ENERGY_COST.survey);
}

// ---------- Double battles ----------

// A doubles battle: teams, then per-turn choices { p1: [...], p2: [...], p1b: ... }.
function doubles(p1, p2, opts) {
  const b = new Battle(Object.assign({ seed: 1, format: "doubles", debug: true, p1: Object.assign({ name: "A" }, p1), p2: Object.assign({ name: "B" }, p2) }, opts));
  b.start();
  return b;
}
function play(b, choices) {
  const from = b.events.length;
  for (const id of Object.keys(choices)) {
    const r = b.choose(id, choices[id]);
    assert(r.ok, "choice for " + id + " rejected: " + r.error);
  }
  return b.events.slice(from);
}
const mv = (move, target) => (target ? { type: "move", move, target } : { type: "move", move });
const damageTo = (evs, ident) => evs.filter((e) => e[0] === "-damage" && e[1] === ident && !e[3]);
const hpLost = (mon) => mon.maxhp - mon.hp;
const armored = (species, moves, level) => ({ species, level: level || 50, ability: "Shell Armor", moves: moves || ["Splash"] });

// Format: singles stays the default; doubles leads with two of each team,
// and events name the slots p1a/p1b/p2a/p2b.
{
  assert.strictEqual(new Battle({ p1: { team: [armored("Snorlax")] }, p2: { team: [armored("Snorlax")] } }).format, "singles");
  const b = doubles({ team: [armored("Snorlax"), armored("Blissey"), armored("Chansey")] },
    { team: [armored("Pidgey"), armored("Rattata")] });
  assert.deepStrictEqual(b.sides.p1.actives.map((m) => m.species), ["Snorlax", "Blissey"]);
  assert(b.events.some((e) => e[0] === "switch" && e[1] === "p2b: Rattata"));
  const req = b.getRequest("p1");
  assert.strictEqual(req.phase, "move");
  assert.strictEqual(req.actives.length, 2);
  assert.deepStrictEqual(req.switches, [2]);
  assert(!b.choose("p1", [{ type: "switch", index: 2 }, { type: "switch", index: 2 }]).ok, "the same Pokémon can't come in twice");
  assert(!b.choose("p1", [{ type: "switch", index: 1 }, mv(0)]).ok, "an active Pokémon can't be switched in");
}

// Spread moves do 0.75x to each target, and Earthquake hits the ally too.
{
  const b = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Earthquake"] }, armored("Snorlax")] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  const evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
  const [ally, foeA, foeB] = [b.sides.p1.actives[1], ...b.sides.p2.actives];
  assert(evs.some((e) => e[0] === "move" && e[2] === "Earthquake" && /^\[spread\]/.test(e[4] || "")));
  for (const t of [ally, foeA, foeB]) assert(hpLost(t) > 0, "Earthquake missed " + t.ident);
  const att = b.sides.p1.actives[0];
  const field = { isDoubles: true };
  const spread = Damage.calc(att, foeA, "Earthquake", field, { targets: 3 }).damage;
  const single = Damage.calc(att, foeA, "Earthquake", field, { targets: 1 }).damage;
  assert(spread.includes(hpLost(foeA)), "spread damage is one of the 0.75x rolls");
  assert(Math.max(...spread) < Math.min(...single));
  // With one foe left and no ally, no reduction.
  const lone = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Earthquake"] }] }, { team: [armored("Snorlax")] });
  play(lone, { p1: mv(0), p2: mv(0) });
  const t = lone.sides.p2.actives[0];
  assert(Damage.calc(lone.sides.p1.actives[0], t, "Earthquake", field, { targets: 1 }).damage.includes(hpLost(t)));
}

// A single-target move aimed at a foe that fainted earlier in the turn hits
// the other foe; the fainted slot is refilled at the end of the turn.
{
  const b = doubles({ team: [{ species: "Jolteon", level: 100, moves: ["Thunderbolt"] }, { species: "Snorlax", level: 50, moves: ["Tackle"] }] },
    { team: [armored("Magikarp", ["Splash"], 5), armored("Snorlax"), armored("Pidgey")] });
  const evs = play(b, { p1: [mv(0, 1), mv(0, 1)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "faint" && e[1] === "p2a: Magikarp"));
  assert(damageTo(evs, "p2b: Snorlax").length === 1, "Tackle retargets at the other foe");
  const req = b.getRequest("p2");
  assert.strictEqual(req.phase, "switch");
  assert.deepStrictEqual(req.forceSwitch, [true, false]);
  assert.strictEqual(b.getRequest("p1").phase, "wait");
  play(b, { p2: [{ type: "switch", index: 2 }] });
  assert.strictEqual(b.sides.p2.actives[0].species, "Pidgey");
  assert(b.events.some((e) => e[0] === "switch" && e[1] === "p2a: Pidgey"));
  assert.strictEqual(b.getRequest("p1").phase, "move");
}

// Aimed at an ally that fainted earlier in the turn, a move goes to the foe
// opposite the user instead (FireRed's HandleAction_UseMove).
{
  const b = doubles({ team: [{ species: "Snorlax", level: 50, ability: "Shell Armor", moves: ["Tackle"] }, armored("Magikarp", ["Splash"], 2), armored("Pidgey")] },
    { team: [{ species: "Jolteon", level: 100, moves: ["Thunderbolt"] }, armored("Snorlax")] });
  const evs = play(b, { p1: [mv(0, -2), mv(0)], p2: [mv(0, 2), mv(0)] });
  assert(evs.some((e) => e[0] === "faint" && e[1] === "p1b: Magikarp"));
  assert(!evs.some((e) => e[0] === "-notarget"), "no 'no target'");
  assert.strictEqual(damageTo(evs, "p2a: Jolteon").length, 1, "Tackle at the fainted ally hits the foe opposite");
}

// Both sides replace at the end of the turn, each into the right slot.
{
  const b = doubles({ team: [armored("Magikarp", ["Splash"], 2), { species: "Garchomp", level: 100, moves: ["Dragon Claw"] }, armored("Pidgey")] },
    { team: [{ species: "Garchomp", level: 100, moves: ["Dragon Claw"] }, armored("Magikarp", ["Splash"], 2), armored("Rattata")] });
  play(b, { p1: [mv(0), mv(0, 2)], p2: [mv(0, 1), mv(0)] });
  assert.deepStrictEqual([b.getRequest("p1").forceSwitch, b.getRequest("p2").forceSwitch], [[true, false], [false, true]]);
  play(b, { p1: [{ type: "switch", index: 2 }], p2: [null, { type: "switch", index: 2 }] });
  assert.deepStrictEqual([b.sides.p1.actives[0].ident, b.sides.p2.actives[1].ident], ["p1a: Pidgey", "p2b: Rattata"]);
  assert.strictEqual(b.getRequest("p1").phase, "move");
}

// Follow Me draws single-target moves to the user; Helping Hand makes the
// ally's attack 1.5x.
{
  const b = doubles({ team: [{ species: "Garchomp", level: 30, moves: ["Dragon Claw"] }, { species: "Pikachu", level: 50, moves: ["Helping Hand"] }] },
    { team: [armored("Snorlax", ["Splash"]), armored("Blissey", ["Follow Me"])] });
  const evs = play(b, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-singleturn" && e[2] === "Helping Hand"));
  const [snorlax, blissey] = b.sides.p2.actives;
  assert.strictEqual(hpLost(snorlax), 0, "Follow Me drew the attack away");
  const att = b.sides.p1.actives[0];
  const boosted = Damage.calc(att, blissey, "Dragon Claw", { isDoubles: true }, { targets: 1, helpingHand: true }).damage;
  const plain = Damage.calc(att, blissey, "Dragon Claw", { isDoubles: true }, { targets: 1 }).damage;
  assert(boosted.includes(hpLost(blissey)) && hpLost(blissey) > Math.max(...plain), "Helping Hand boost");
}

// Protect only protects its user; Wide Guard protects the whole side from
// spread moves (but not from single-target ones).
{
  const b = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Earthquake", "Rock Slide", "Dragon Claw"] }, armored("Snorlax")] },
    { team: [armored("Snorlax", ["Protect", "Wide Guard"]), armored("Snorlax", ["Splash"])] });
  let evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
  const [a, c] = b.sides.p2.actives;
  assert(evs.some((e) => e[0] === "-activate" && e[1] === "p2a: Snorlax" && e[2] === "move: Protect"));
  assert(hpLost(a) === 0 && hpLost(c) > 0, "Protect shields only its user");
  const before = [a.hp, c.hp];
  evs = play(b, { p1: [mv(1), mv(0)], p2: [mv(1), mv(0)] });
  assert(evs.filter((e) => e[0] === "-activate" && e[2] === "move: Wide Guard").length === 2);
  assert.deepStrictEqual([a.hp, c.hp], before, "Wide Guard blocks Rock Slide for both");
  evs = play(b, { p1: [mv(2, 2), mv(0)], p2: [mv(1), mv(0)] });
  assert(c.hp < before[1], "Wide Guard doesn't block single-target moves");
}

// Intimidate lowers both foes' Attack.
{
  const b = doubles({ team: [armored("Snorlax"), armored("Blissey")] }, { team: [{ species: "Gyarados", level: 50, ability: "Intimidate", moves: ["Splash"] }, armored("Pidgey")] });
  assert.deepStrictEqual(b.sides.p1.actives.map((m) => m.boosts.atk), [-1, -1]);
}

// Experience: a fainted foe's exp goes to the p1 Pokémon that were out
// while it was, not the bench.
{
  const b = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Dragon Claw"] }, armored("Pidgey", ["Splash"], 10), armored("Rattata", ["Splash"], 10)] },
    { team: [armored("Magikarp", ["Splash"], 10), armored("Snorlax"), armored("Pidgey")] }, { exp: true });
  const evs = play(b, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  const got = evs.filter((e) => e[0] === "-exp").map((e) => e[1]);
  assert.deepStrictEqual(got.sort(), ["p1a: Garchomp", "p1b: Pidgey"]);
}

// A team with one Pokémon that can fight uses one slot.
{
  const b = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Dragon Claw"] }, Object.assign(armored("Pidgey"), { hp: 0 })] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  assert.strictEqual(b.sides.p1.actives[1], null);
  const req = b.getRequest("p1");
  assert(req.actives[0] && req.actives[1] === null && req.switches.length === 0);
  play(b, { p1: mv(0, 2), p2: [mv(0), mv(0)] });
  assert.strictEqual(b.turn, 2);
}

// Tag battles: two trainers a side, each with their own party and slot.
{
  const b = doubles({ name: "Red", team: [armored("Magikarp", ["Splash"], 5), armored("Pidgey", ["Splash"], 5)],
    partner: { name: "Leaf", team: [{ species: "Mewtwo", level: 100, moves: ["Psychic"] }, armored("Rattata")] } },
  { team: [{ species: "Garchomp", level: 100, moves: ["Dragon Claw"] }, armored("Snorlax", ["Splash"], 20), armored("Snorlax", ["Splash"], 20)] }, { exp: true });
  assert.deepStrictEqual(b.sides.p1.actives.map((m) => m.species), ["Magikarp", "Mewtwo"]);
  assert(b.events.some((e) => e[0] === "switch" && e[1] === "p1b: Mewtwo" && e[6] === "Leaf"));
  const red = b.getRequest("p1"), leaf = b.getRequest("p1b");
  assert(red.actives[0] && !red.actives[1] && !leaf.actives[0] && leaf.actives[1]);
  assert.deepStrictEqual([red.switches, leaf.switches], [[1], [3]]);
  // Garchomp knocks out Red's Magikarp; Leaf's Mewtwo knocks out a Snorlax:
  // only Red's Pokémon gets experience.
  let evs = play(b, { p1: mv(0), p1b: mv(0, 2), p2: [mv(0, 1), mv(0)] });
  assert(evs.some((e) => e[0] === "faint" && e[1] === "p1a: Magikarp"));
  assert(evs.some((e) => e[0] === "faint" && e[1] === "p2b: Snorlax"));
  assert(!evs.some((e) => e[0] === "-exp" && /Mewtwo|Rattata/.test(e[1])), "no exp for the partner's Pokémon");
  // Red replaces from Red's own party only.
  const sw = b.getRequest("p1");
  assert.deepStrictEqual([sw.phase, sw.switches], ["switch", [1]]);
  assert(!b.choose("p1", { type: "switch", index: 3 }).ok, "can't send out the partner's Pokémon");
  play(b, { p1: { type: "switch", index: 1 }, p2: [null, { type: "switch", index: 2 }] });
  assert.strictEqual(b.sides.p1.actives[0].ident, "p1a: Pidgey");
  // Red's last Pokémon faints: Red is out, the slot stays empty and Leaf fights on.
  evs = play(b, { p1: mv(0), p1b: mv(0, 2), p2: [mv(0, 1), mv(0)] });
  assert(evs.some((e) => e[0] === "-trainerout" && e[2] === "Red"));
  assert(!b.ended);
  assert.strictEqual(b.getRequest("p1").phase, "wait");
  assert.strictEqual(b.getRequest("p1b").phase, "move");
  play(b, { p1b: mv(0, 1), p2: [mv(0, 2), null] });
  assert(b.sides.p1.actives[0].fainted && b.turn >= 4);
}

// ---- Doubles moves: Mat Block, Crafty Shield, After You, Quash, Instruct,
// Spotlight, Sky Drop, Acupressure / Aromatic Mist / Hold Hands ----
const moveOrder = (evs) => evs.filter((e) => e[0] === "move").map((e) => e[1]);

// Mat Block: on the user's first turn out its side is safe from damaging
// moves (not status moves); after that it fails, and it fails moving last.
{
  const b = doubles({ team: [{ species: "Jolteon", level: 50, moves: ["Mat Block"] }, armored("Snorlax")] },
    { team: [armored("Snorlax", ["Tackle"]), armored("Snorlax", ["Growl"])] });
  let evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0, 2), mv(0)] });
  const ally = b.sides.p1.actives[1];
  assert(evs.some((e) => e[0] === "-activate" && e[1] === "p1b: Snorlax" && e[2] === "move: Mat Block"));
  assert.strictEqual(hpLost(ally), 0, "Mat Block stops Tackle");
  assert.strictEqual(ally.boosts.atk, -1, "but not Growl");
  evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0, 2), mv(0)] });
  assert(evs.some((e) => e[0] === "-fail" && e[1] === "p1a: Jolteon"), "only on the first turn out");
  assert(hpLost(ally) > 0);
  // Singles: it protects the user; the slower user, moving last, fails.
  const s = new Battle({ seed: 1, p1: { team: [{ species: "Jolteon", level: 50, moves: ["Mat Block"] }] }, p2: { team: [armored("Snorlax", ["Tackle"])] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  assert.strictEqual(hpLost(s.sides.p1.active), 0);
  const slow = new Battle({ seed: 1, p1: { team: [armored("Snorlax", ["Mat Block"])] }, p2: { team: [{ species: "Jolteon", level: 50, moves: ["Splash"] }] } });
  slow.start();
  slow.choose("p1", mv(0)); slow.choose("p2", mv(0));
  assert(slow.events.some((e) => e[0] === "-fail" && e[1] === "p1a: Snorlax"));
}

// Crafty Shield: the user's side is safe from status moves aimed at it, not
// from attacks.
{
  const b = doubles({ team: [{ species: "Jolteon", level: 50, moves: ["Crafty Shield"] }, armored("Snorlax")] },
    { team: [armored("Snorlax", ["Toxic"]), armored("Snorlax", ["Tackle"])] });
  const evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0, 2), mv(0, 2)] });
  const ally = b.sides.p1.actives[1];
  assert(evs.some((e) => e[0] === "-activate" && e[1] === "p1b: Snorlax" && e[2] === "move: Crafty Shield"));
  assert.strictEqual(ally.status, "");
  assert(hpLost(ally) > 0, "Tackle still hits");
}

// After You: the target moves right after the user (Shuckle, the slowest,
// goes second); it fails if the target would move next anyway, so always in
// singles. Quash: the target moves after everyone else.
{
  const b = doubles({ team: [{ species: "Jolteon", level: 50, moves: ["After You"] }, armored("Shuckle", ["Splash"])] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  let evs = play(b, { p1: [mv(0, -2), mv(0)], p2: [mv(0), mv(0)] });
  assert.deepStrictEqual(moveOrder(evs).slice(0, 2), ["p1a: Jolteon", "p1b: Shuckle"]);
  assert(evs.some((e) => e[0] === "-activate" && e[1] === "p1b: Shuckle" && e[2] === "move: After You"));
  const s = new Battle({ seed: 1, p1: { team: [{ species: "Jolteon", level: 50, moves: ["After You"] }] }, p2: { team: [armored("Snorlax")] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  assert(s.events.some((e) => e[0] === "-fail" && e[1] === "p1a: Jolteon"), "After You fails in singles");

  const q = doubles({ team: [{ species: "Jolteon", level: 50, moves: ["Quash"] }, armored("Shuckle", ["Splash"])] },
    { team: [{ species: "Pikachu", level: 50, moves: ["Splash"] }, armored("Snorlax")] });
  evs = play(q, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-activate" && e[1] === "p2a: Pikachu" && e[2] === "move: Quash"));
  assert.deepStrictEqual(moveOrder(evs), ["p1a: Jolteon", "p2b: Snorlax", "p1b: Shuckle", "p2a: Pikachu"]);
}

// Instruct (Gen 7): the target repeats its last move at once, at the same
// target, using PP; it fails for a target with no last move or a banned one
// (Hyper Beam recharges). It works in singles too.
{
  const b = doubles({ team: [armored("Slowpoke", ["Instruct"]), { species: "Garchomp", level: 50, moves: ["Dragon Claw", "Hyper Beam"] }] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  let evs = play(b, { p1: [mv(0, -2), mv(0, 1)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-singleturn" && e[1] === "p1b: Garchomp" && e[2] === "move: Instruct"));
  assert.strictEqual(evs.filter((e) => e[0] === "move" && e[2] === "Dragon Claw").length, 2);
  assert.strictEqual(damageTo(evs, "p2a: Snorlax").length, 2, "the same target twice");
  assert.strictEqual(b.sides.p1.actives[1].moves[0].pp, b.sides.p1.actives[1].moves[0].maxpp - 2);
  evs = play(b, { p1: [mv(0, -2), mv(1, 1)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-fail" && e[1] === "p1a: Slowpoke"), "Hyper Beam can't be instructed");
  const fresh = doubles({ team: [armored("Slowpoke", ["Instruct"]), armored("Shuckle")] }, { team: [armored("Snorlax"), armored("Snorlax")] });
  evs = play(fresh, { p1: [mv(0, -2), mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-fail" && e[1] === "p1a: Slowpoke"), "no last move");
  const s = new Battle({ seed: 1, p1: { team: [armored("Slowpoke", ["Instruct"])] }, p2: { team: [{ species: "Garchomp", level: 50, moves: ["Dragon Claw"] }] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  assert.strictEqual(s.events.filter((e) => e[0] === "move" && e[2] === "Dragon Claw").length, 2);
}

// Spotlight (Gen 7): the target draws its foes' single-target moves; it
// fails in singles.
{
  const b = doubles({ team: [{ species: "Garchomp", level: 50, moves: ["Dragon Claw"] }, armored("Snorlax")] },
    { team: [armored("Snorlax", ["Spotlight"]), armored("Blissey")] });
  const evs = play(b, { p1: [mv(0, 1), mv(0)], p2: [mv(0, -2), mv(0)] });
  assert(evs.some((e) => e[0] === "-singleturn" && e[1] === "p2b: Blissey" && e[2] === "move: Spotlight"));
  assert.strictEqual(damageTo(evs, "p2b: Blissey").length, 1);
  assert.strictEqual(hpLost(b.sides.p2.actives[0]), 0);
  const s = new Battle({ seed: 1, p1: { team: [armored("Snorlax", ["Spotlight"])] }, p2: { team: [armored("Snorlax")] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  assert(s.events.some((e) => e[0] === "-fail" && e[1] === "p1a: Snorlax"));
}

// Acupressure and Aromatic Mist on an ally; Hold Hands needs one.
{
  const b = doubles({ team: [armored("Snorlax", ["Acupressure", "Aromatic Mist", "Hold Hands"]), armored("Blissey")] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  play(b, { p1: [mv(0, -2), mv(0)], p2: [mv(0), mv(0)] });
  const ally = b.sides.p1.actives[1];
  assert.strictEqual(Object.values(ally.boosts).filter((v) => v === 2).length, 1, "Acupressure: +2 to one stat");
  const before = ally.boosts.spd;
  let evs = play(b, { p1: [mv(1, -2), mv(0)], p2: [mv(0), mv(0)] });
  assert.strictEqual(ally.boosts.spd, Math.min(6, before + 1));
  evs = play(b, { p1: [mv(2, -2), mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-activate" && e[2] === "move: Hold Hands"));
  const s = new Battle({ seed: 1, p1: { team: [armored("Snorlax", ["Aromatic Mist", "Hold Hands"])] }, p2: { team: [armored("Snorlax")] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  s.choose("p1", mv(1)); s.choose("p2", mv(0));
  assert.strictEqual(s.events.filter((e) => e[0] === "-fail" && e[1] === "p1a: Snorlax").length, 2, "no ally in singles");
  assert.strictEqual(s.sides.p2.active.boosts.spd, 0);
}

// Sky Drop: the target goes up with the user (it can't move or switch, and
// both dodge most moves); the blow lands next turn. It fails on 200 kg and
// up, Flying types take no damage, and Gravity brings both down.
{
  const lifter = { species: "Aerodactyl", level: 50, ability: "Rock Head", moves: ["Sky Drop"] };
  const s = new Battle({ seed: 1, p1: { team: [lifter] }, p2: { team: [{ species: "Machamp", level: 50, ability: "Guts", moves: ["Bulk Up"] }, armored("Snorlax")] } });
  s.start();
  s.choose("p1", mv(0)); s.choose("p2", mv(0));
  const machamp = s.sides.p2.active;
  assert(s.events.some((e) => e[0] === "-prepare" && e[2] === "Sky Drop" && e[3] === "p2a: Machamp"));
  assert(!s.events.some((e) => e[0] === "move" && e[1] === "p2a: Machamp"), "the lifted target can't move");
  assert(machamp.volatiles.skydrop);
  const req = s.getRequest("p2");
  assert(req.active.trapped && !req.switches.length, "nor switch");
  assert.strictEqual(s.sides.p1.choice.forced.move, "Sky Drop", "the second turn is forced");
  const from = s.events.length;
  s.choose("p2", mv(0));
  const evs = s.events.slice(from);
  assert(hpLost(machamp) > 0 && !machamp.volatiles.skydrop);
  assert(evs.some((e) => e[0] === "-end" && e[1] === "p2a: Machamp" && e[2] === "Sky Drop"));
  assert(evs.some((e) => e[0] === "move" && e[1] === "p2a: Machamp"), "back down, it moves again");

  const heavy = new Battle({ seed: 1, p1: { team: [lifter] }, p2: { team: [armored("Snorlax")] } });
  heavy.start();
  heavy.choose("p1", mv(0)); heavy.choose("p2", mv(0));
  assert(heavy.events.some((e) => e[0] === "-fail" && e[2] === "move: Sky Drop" && e[3] === "[heavy]"));
  assert(!heavy.sides.p1.active.volatiles.twoturnmove);

  const bird = new Battle({ seed: 1, p1: { team: [lifter] }, p2: { team: [armored("Pidgeot")] } });
  bird.start();
  for (let i = 0; i < 2; i++) { bird.choose("p1", mv(0)); bird.choose("p2", mv(0)); }
  assert(bird.events.some((e) => e[0] === "-immune" && e[1] === "p2a: Pidgeot"));
  assert.strictEqual(hpLost(bird.sides.p2.active), 0);

  // Doubles: the foes' moves miss the two in the air; the ally's Gravity
  // brings them down.
  const b = doubles({ team: [lifter, { species: "Jolteon", level: 100, moves: ["Splash", "Gravity"] }] },
    { team: [{ species: "Machamp", level: 50, ability: "Guts", moves: ["Bulk Up"] }, armored("Snorlax", ["Tackle"])] });
  let d = play(b, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0, -1)] });
  assert(d.some((e) => e[0] === "-miss" && e[1] === "p2b: Snorlax"), "Tackle misses the user in the air");
  d = play(b, { p2: [mv(0), mv(0, -1)], p1: [null, mv(1)] });
  assert(d.some((e) => e[0] === "-activate" && e[1] === "p1a: Aerodactyl" && e[2] === "move: Gravity"));
  assert(d.some((e) => e[0] === "-end" && e[1] === "p2a: Machamp" && e[3] === "[interrupt]"));
  assert(!b.sides.p2.actives[0].volatiles.skydrop && !b.sides.p1.actives[0].volatiles.twoturnmove);
}

// ---- Ally-side abilities ----

// Flower Veil: Grass types on its side keep their stats and dodge status
// from others; Sweet Veil: no one on its side falls asleep (Yawn fails);
// Aroma Veil: no Taunt (and Encore, Disable, Torment, Attract, Heal Block)
// on its side. Each also covers the holder itself, in singles too.
{
  const b = doubles({ team: [armored("Florges"), armored("Venusaur")] }, { team: [armored("Snorlax", ["Growl"]), armored("Snorlax", ["Thunder Wave"])] });
  b.sides.p1.actives[0].ability = "Flower Veil";
  let evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0, 2)] });
  const [florges, venusaur] = b.sides.p1.actives;
  assert.strictEqual(venusaur.boosts.atk, 0);
  assert.strictEqual(florges.boosts.atk, -1, "Florges isn't Grass");
  assert.strictEqual(venusaur.status, "");
  assert(evs.some((e) => e[0] === "-block" && e[1] === "p1b: Venusaur" && e[2] === "ability: Flower Veil" && e[3] === "[of] p1a: Florges"));

  const sv = doubles({ team: [{ species: "Slurpuff", level: 50, ability: "Sweet Veil", moves: ["Splash"] }, armored("Snorlax")] },
    { team: [armored("Snorlax", ["Spore"]), armored("Snorlax", ["Yawn"])] });
  evs = play(sv, { p1: [mv(0), mv(0)], p2: [mv(0, 2), mv(0, 2)] });
  assert.strictEqual(sv.sides.p1.actives[1].status, "");
  assert(!sv.sides.p1.actives[1].volatiles.yawn);
  assert.strictEqual(evs.filter((e) => e[0] === "-block" && e[2] === "ability: Sweet Veil").length, 2);
  const svs = new Battle({ seed: 1, p1: { team: [{ species: "Slurpuff", level: 50, ability: "Sweet Veil", moves: ["Splash"] }] }, p2: { team: [armored("Snorlax", ["Spore"])] } });
  svs.start();
  svs.choose("p1", mv(0)); svs.choose("p2", mv(0));
  assert.strictEqual(svs.sides.p1.active.status, "", "Sweet Veil covers its holder");

  const av = doubles({ team: [{ species: "Aromatisse", level: 50, ability: "Aroma Veil", moves: ["Splash"] }, armored("Snorlax", ["Tackle"])] },
    { team: [armored("Snorlax", ["Taunt"]), armored("Snorlax")] });
  evs = play(av, { p1: [mv(0), mv(0, 1)], p2: [mv(0, 2), mv(0)] });
  assert(!av.sides.p1.actives[1].volatiles.taunt);
  assert(evs.some((e) => e[0] === "-block" && e[1] === "p1b: Snorlax" && e[2] === "ability: Aroma Veil"));
}

// Flower Gift: in the sun, Cherrim and its ally hit 1.5x as hard with
// physical moves.
{
  const b = doubles({ team: [{ species: "Cherrim", level: 50, ability: "Flower Gift", moves: ["Splash"] }, { species: "Garchomp", level: 50, moves: ["Dragon Claw"] }] },
    { team: [armored("Snorlax"), armored("Snorlax")] });
  Object.assign(b.field, { weather: "SunnyDay", weatherTurns: 5 });
  play(b, { p1: [mv(0), mv(0, 1)], p2: [mv(0), mv(0)] });
  const [att, def] = [b.sides.p1.actives[1], b.sides.p2.actives[0]];
  const opts = { targets: 1 }, field = { isDoubles: true, weather: "SunnyDay" };
  const boosted = Damage.calc(att, def, "Dragon Claw", field, Object.assign({ flowerGiftAtk: true }, opts)).damage;
  const plain = Damage.calc(att, def, "Dragon Claw", field, opts).damage;
  assert(boosted.includes(hpLost(def)) && Math.max(...boosted) > Math.max(...plain));
}

// Symbiosis: the ally that eats its Berry gets the holder's item. Unnerve:
// foes can't eat Berries.
{
  const b = doubles({ team: [{ species: "Florges", level: 50, ability: "Symbiosis", item: "Leftovers", moves: ["Splash"] },
    Object.assign(armored("Snorlax"), { item: "Sitrus Berry", hp: 50 })] }, { team: [armored("Snorlax"), armored("Snorlax")] });
  const [florges, snorlax] = b.sides.p1.actives;
  assert.strictEqual(snorlax.item, "leftovers");
  assert.strictEqual(florges.item, "");
  assert(b.events.some((e) => e[0] === "-activate" && e[1] === "p1a: Florges" && e[2] === "ability: Symbiosis"));
  const s = new Battle({ seed: 1, p1: { team: [Object.assign(armored("Snorlax"), { item: "Sitrus Berry", hp: 50 })] },
    p2: { team: [{ species: "Tyranitar", level: 50, ability: "Unnerve", moves: ["Splash"] }, armored("Pidgey")] } });
  s.start();
  assert.strictEqual(s.sides.p1.active.item, "sitrus-berry", "Unnerve: no Berry");
  s.choose("p1", mv(0)); s.choose("p2", { type: "switch", index: 1 });
  assert.strictEqual(s.sides.p1.active.item, "", "eaten once Unnerve is gone");
}

// Abilities against spread and side moves, per target: Hyper Voice fails only
// on the Soundproof foe; Petal Blizzard feeds the ally's Sap Sipper; Stealth
// Rock bounces off either foe's Magic Bounce; Mold Breaker ignores Lightning
// Rod's pull.
{
  const b = doubles({ team: [{ species: "Exploud", level: 50, moves: ["Hyper Voice", "Petal Blizzard", "Stealth Rock"] }, { species: "Sawsbuck", level: 50, ability: "Sap Sipper", moves: ["Splash"] }] },
    { team: [{ species: "Electrode", level: 50, ability: "Soundproof", moves: ["Splash"] }, { species: "Espeon", level: 50, ability: "Magic Bounce", moves: ["Splash"] }] });
  let evs = play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "-immune" && e[1] === "p2a: Electrode" && /Soundproof/.test(e[2])));
  assert.strictEqual(damageTo(evs, "p2b: Espeon").length, 1);
  evs = play(b, { p1: [mv(1), mv(0)], p2: [mv(0), mv(0)] });
  assert.strictEqual(b.sides.p1.actives[1].boosts.atk, 1);
  assert.strictEqual(damageTo(evs, "p1b: Sawsbuck").length, 0);
  assert.strictEqual(damageTo(evs, "p2a: Electrode").length + damageTo(evs, "p2b: Espeon").length, 2);
  play(b, { p1: [mv(2), mv(0)], p2: [mv(0), mv(0)] });
  assert(b.sides.p1.conditions.stealthrock && !b.sides.p2.conditions.stealthrock, "bounced by p2b's Magic Bounce");

  const m = doubles({ team: [{ species: "Pinsir", level: 50, ability: "Mold Breaker", moves: ["Thunder Punch"] }, armored("Snorlax")] },
    { team: [armored("Snorlax"), { species: "Raichu", level: 50, ability: "Lightning Rod", moves: ["Splash"] }] });
  evs = play(m, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  assert.strictEqual(damageTo(evs, "p2a: Snorlax").length, 1);
  assert(!evs.some((e) => e[0] === "-activate" && /Lightning Rod/.test(e[2])));
}

// Two fainted and one Pokémon left to send in: the side picks the slot
// (forceSwitch lists both, open the default slot a; one choice settles it).
{
  const b = doubles({ team: [{ species: "Garchomp", level: 100, moves: ["Earthquake"] }, armored("Pidgey")] },
    { team: [armored("Magikarp", ["Splash"], 2), armored("Magikarp", ["Splash"], 2), armored("Pidgey")] });
  play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
  let req = b.getRequest("p2");
  assert.strictEqual(req.phase, "switch");
  assert.deepStrictEqual(req.forceSwitch, [true, true]);
  assert.deepStrictEqual(req.open, [0]);
  assert.strictEqual(req.switchCount, 1);
  assert(!b.choose("p2", [{ type: "switch", index: 2 }, { type: "switch", index: 2 }]).ok);
  assert(!b.choose("p2", [null, null]).ok);
  play(b, { p2: [null, { type: "switch", index: 2 }] });
  assert.strictEqual(b.sides.p2.actives[1].species, "Pidgey");
  assert(b.sides.p2.actives[0].fainted);
  req = b.getRequest("p2");
  assert.strictEqual(req.phase, "move");
  assert.deepStrictEqual(req.actives.map((a) => a && a.slot), [null, 1]);
}

// Seeded random doubles battles (some tag battles), random choices against the
// AI, all finish without errors or stuck states.
const DOUBLES = 120;
let doublesTurns = 0;
for (let seed = 1; seed <= DOUBLES; seed++) {
  const teamRng = mulberry32(seed * 104729);
  const team = (n) => RandomTeam.team(n, { level: 50, rng: teamRng, maxGen: 6 });
  const tag = seed % 4 === 0;
  const p1 = tag ? { name: "A", team: team(3), partner: { name: "A2", team: team(1 + (seed % 3)) } } : { name: "A", team: team(1 + (seed % 6)) };
  const p2 = tag && seed % 8 === 0 ? { name: "B", team: team(2), partner: { name: "B2", team: team(3) } } : { name: "B", team: team(1 + ((seed * 5) % 6)) };
  const battle = new Battle({ seed, format: "doubles", exp: seed % 3 === 0, p1, p2 });
  const rng = mulberry32(seed);
  const ids = ["p1", "p2"].concat(p1.partner ? ["p1b"] : [], p2.partner ? ["p2b"] : []);
  battle.start();
  for (let step = 0; step < 3000 && !battle.ended; step++) {
    let acted = false;
    for (const id of ids) {
      const req = battle.getRequest(id);
      if (req.phase !== "move" && req.phase !== "switch") continue;
      const c = (seed + step) % 2 ? OpponentAI.choose(battle, id, rng) : battle.randomChoice(id);
      const r = battle.choose(id, c);
      assert(r.ok, "doubles choice rejected in battle " + seed + ": " + r.error);
      acted = true;
    }
    assert(acted || battle.ended, "doubles battle " + seed + " is stuck");
  }
  assert(battle.ended, "doubles battle " + seed + " did not finish");
  doublesTurns += battle.turn;
}

// Stance Change: Aegislash's Blade Forme for a damaging move, Shield Forme
// for King's Shield, Shield Forme again when it leaves the field.
{
  const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [{ species: "Aegislash-Shield", level: 50, moves: ["Iron Head", "King's Shield"] },
    { species: "Snorlax", level: 50, moves: ["Splash"] }] }, p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] } });
  b.start();
  const aegis = b.sides.p1.active;
  let evs = play(b, { p1: mv(0), p2: mv(0) });
  assert.strictEqual(aegis.species, "Aegislash-Blade");
  assert.strictEqual(aegis.stats.atk, Stats.calcAllStats("Aegislash-Blade", { level: 50, nature: aegis.nature, ivs: aegis.ivs, evs: aegis.evs }).atk);
  assert(evs.findIndex((e) => e[0] === "detailschange") < evs.findIndex((e) => e[0] === "move"), "it changes before it attacks");
  play(b, { p1: mv(1), p2: mv(0) });
  assert.strictEqual(aegis.species, "Aegislash-Shield");
  play(b, { p1: mv(0), p2: mv(0) });
  play(b, { p1: { type: "switch", index: 1 }, p2: mv(0) });
  assert.strictEqual(aegis.species, "Aegislash-Shield", "back to Shield Forme on switching out");
}
// Zygarde (50% Forme) has its own stats, not Complete Forme's.
assert.deepStrictEqual(["hp", "atk", "def", "spa", "spd", "spe"].map((k) => DEX.Zygarde[k]), [108, 100, 121, 81, 95, 95]);

// ---------- Generation 7 battles ----------
{
  const g7 = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2, seed) => {
    const b = new Battle({ seed: seed || 1, debug: true, p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } });
    b.start();
    return b;
  };
  const has = (evs, type, ...args) => evs.some((e) => e[0] === type && args.every((a, i) => a instanceof RegExp ? a.test(e[i + 1]) : e[i + 1] === a));

  // Psychic Surge: Psychic Terrain on the way in; a grounded Pokémon can't
  // be hit by priority moves, and Psychic moves get 1.5x.
  {
    const b = singles([g7("Tapu Lele", ["Psychic"])], [g7("Rattata", ["Quick Attack"], { ability: "Guts" })]);
    assert.strictEqual(b.field.terrain, "PsychicTerrain");
    assert(has(b.events, "-fieldstart", "PsychicTerrain"));
    const lele = b.sides.p1.active;
    const evs = play(b, { p1: mv(0), p2: mv(0) });
    assert(has(evs, "-activate", lele.ident, "move: Psychic Terrain"), "Quick Attack is blocked");
    assert.strictEqual(lele.hp, lele.maxhp);
    const r = Damage.calc(lele, b.sides.p2.active, "Psychic", { terrain: "PsychicTerrain" });
    const plain = Damage.calc(lele, b.sides.p2.active, "Psychic", {});
    assert(r.basePower === 135 && plain.basePower === 90, "Psychic Terrain: 1.5x power");
  }
  // Disguise: the first hit only busts Mimikyu's disguise.
  {
    const b = singles([g7("Mimikyu", ["Splash"])], [g7("Rattata", ["Bite"], { ability: "Guts" })]);
    const mimikyu = b.sides.p1.active;
    const evs = play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(mimikyu.species, "Mimikyu-Busted");
    assert.strictEqual(mimikyu.hp, mimikyu.maxhp);
    assert(has(evs, "detailschange", mimikyu.ident, "Mimikyu-Busted"));
    play(b, { p1: mv(0), p2: mv(0) });
    assert(mimikyu.hp < mimikyu.maxhp, "the second hit lands");
  }
  // Shields Down: Meteor Form above half HP (no status), Core at half or less.
  {
    const b = singles([g7("Minior", ["Splash"])], [g7("Raticate", ["Super Fang", "Toxic"], { ability: "Guts" })]);
    const minior = b.sides.p1.active;
    play(b, { p1: mv(0), p2: mv(1) });
    assert(!minior.status, "Meteor Form can't be poisoned");
    play(b, { p1: mv(0), p2: mv(0) });
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(minior.species, "Minior-Core");
    assert(minior.stats.spe > Stats.calcAllStats("Minior", { level: 50 }).spe);
  }
  // Schooling: from Lv. 20 Wishiwashi schools.
  {
    const b = singles([g7("Wishiwashi", ["Splash"], { level: 20 })], [g7("Wishiwashi", ["Splash"], { level: 19 })]);
    assert.strictEqual(b.sides.p1.active.species, "Wishiwashi-School");
    assert.strictEqual(b.sides.p2.active.species, "Wishiwashi");
  }
  // Galvanize: Normal moves become Electric, 1.2x.
  {
    const b = singles([g7("Golem-Alola", ["Tackle"], { ability: "Galvanize" })], [g7("Gyarados", ["Splash"])]);
    const r = Damage.calc(b.sides.p1.active, b.sides.p2.active, "Tackle", {});
    assert.strictEqual(r.type, "Electric");
    assert.strictEqual(r.basePower, 60);
  }
  // Stamina, Water Compaction, Beast Boost.
  {
    const b = singles([g7("Mudsdale", ["Splash"], { ability: "Stamina" })], [g7("Rattata", ["Tackle"], { ability: "Guts" })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.boosts.def, 1);
    const c = singles([g7("Nihilego", ["Sludge Bomb"], { level: 100 })], [g7("Caterpie", ["Splash"], { level: 2 }), g7("Caterpie", ["Splash"], { level: 2 })]);
    play(c, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(c.sides.p1.active.boosts.spd, 1, "Beast Boost raises its best stat (Sp. Def)");
  }
  // Baneful Bunker: protects and poisons a contact attacker.
  {
    const b = singles([g7("Toxapex", ["Baneful Bunker"])], [g7("Rattata", ["Tackle"], { ability: "Guts" })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.hp, b.sides.p1.active.maxhp);
    assert.strictEqual(b.sides.p2.active.status, "psn");
  }
  // Spirit Shackle traps; Throat Chop stops sound moves.
  {
    const b = singles([g7("Decidueye", ["Spirit Shackle", "Throat Chop"], { level: 30 })],
      [g7("Alakazam", ["Hyper Voice"], { level: 50 }), g7("Snorlax", ["Splash"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert(b.getRequest("p2").active.trapped, "Spirit Shackle traps");
    play(b, { p1: mv(1), p2: mv(0) });
    assert(b.sides.p2.active.volatiles.throatchop);
    assert(b.getRequest("p2").active.moves[0].disabled, "no sound moves after Throat Chop");
  }
  // Strength Sap: heals by the target's Attack, then lowers it.
  {
    const b = singles([g7("Shiinotic", ["Strength Sap"])], [g7("Snorlax", ["Splash"])]);
    const shiinotic = b.sides.p1.active, snorlax = b.sides.p2.active;
    shiinotic.hp = 1;
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(shiinotic.hp, Math.min(shiinotic.maxhp, 1 + snorlax.stats.atk));
    assert.strictEqual(snorlax.boosts.atk, -1);
  }
  // Aurora Veil only in hail (Snow Warning).
  {
    const b = singles([g7("Ninetales-Alola", ["Aurora Veil"], { ability: "Snow Warning" })], [g7("Snorlax", ["Splash"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert(b.sides.p1.conditions.auroraveil);
    const c = singles([g7("Ninetales-Alola", ["Aurora Veil"], { ability: "Snow Cloak" })], [g7("Snorlax", ["Splash"])]);
    const evs = play(c, { p1: mv(0), p2: mv(0) });
    assert(!c.sides.p1.conditions.auroraveil && has(evs, "-fail"));
  }
  // Dancer: Oricorio copies a dance move.
  {
    const b = singles([g7("Oricorio", ["Splash"])], [g7("Scizor", ["Swords Dance"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.boosts.atk, 2, "Dancer copied Swords Dance");
  }
  // Innards Out: the attacker takes the HP Pyukumuku had left.
  {
    const b = singles([g7("Pyukumuku", ["Splash"], { level: 5 }), g7("Pyukumuku", ["Splash"])], [g7("Snorlax", ["Body Slam"], { level: 100 })]);
    const left = b.sides.p1.active.hp;
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(hpLost(b.sides.p2.active), left);
  }
  // Comatose can't be statused; Merciless always crits a poisoned target.
  {
    const b = singles([g7("Komala", ["Splash"])], [g7("Mareanie", ["Toxic", "Poison Jab"], { ability: "Merciless" })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert(!b.sides.p1.active.status);
    const c = singles([g7("Snorlax", ["Splash"], { status: "psn", ability: "Thick Fat" })], [g7("Mareanie", ["Poison Jab"], { ability: "Merciless" })]);
    const evs = play(c, { p1: mv(0), p2: mv(0) });
    assert(has(evs, "-crit", c.sides.p1.active.ident));
  }
  // Emergency Exit: below half HP from an attack, it switches out.
  {
    const b = singles([g7("Snorlax", ["Super Fang"])], [g7("Golisopod", ["Splash"]), g7("Rattata", ["Splash"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.getRequest("p2").phase, "switch");
  }
  // Power Construct: Zygarde turns Complete at half HP or less, at the end
  // of the turn, and the HP it gains is added.
  {
    const b = singles([g7("Zygarde-10%", ["Splash"], { ability: "Power Construct" })], [g7("Raticate", ["Super Fang"])]);
    const z = b.sides.p1.active, before = z.maxhp;
    for (let i = 0; i < 6 && z.species !== "Zygarde-Complete"; i++) play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(z.species, "Zygarde-Complete");
    const hit = b.events.filter((e) => e[0] === "-damage" && e[1] === z.ident).pop();
    const lost = before - parseInt(hit[2], 10);
    assert(z.maxhp > before && z.maxhp - z.hp === lost, "the extra HP is added");
  }
  // Battle Bond: a knockout turns Greninja into Ash-Greninja.
  {
    const b = singles([g7("Greninja-Bond", ["Surf"], { level: 100 })], [g7("Caterpie", ["Splash"], { level: 2 }), g7("Caterpie", ["Splash"], { level: 2 })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.species, "Greninja-Ash");
  }
  // Multi-Attack and Revelation Dance take the user's type; Photon Geyser
  // goes physical; Darkest Lariat ignores Defense boosts.
  {
    const b = singles([g7("Silvally-Fire", ["Multi-Attack"])], [g7("Snorlax", ["Splash"])]);
    const evs = play(b, { p1: mv(0), p2: mv(0) });
    assert(hpLost(b.sides.p2.active) > 0);
    const a = b.sides.p1.active;
    assert.strictEqual(Damage.calc(a, b.sides.p2.active, "Multi-Attack", {}, { moveType: "Fire" }).type, "Fire");
    const nec = Damage.makePokemon("Necrozma", { level: 50 });
    const snorlax = Damage.makePokemon("Snorlax", { level: 50 });
    assert.strictEqual(Damage.calc(nec, snorlax, "Photon Geyser", {}).category, Damage.makePokemon("Necrozma", { level: 50 }).stats.atk > nec.stats.spa ? "Physical" : "Special");
    const incin = Damage.makePokemon("Incineroar", { level: 50 });
    const wall = Damage.makePokemon("Snorlax", { level: 50, boosts: { def: 6 } });
    assert.deepStrictEqual(Damage.calc(incin, wall, "Darkest Lariat", {}).damage, Damage.calc(incin, snorlax, "Darkest Lariat", {}).damage);
  }
  // Doubles: Soul-Heart, Receiver, Queenly Majesty, Battery.
  {
    const b = new Battle({ seed: 1, format: "doubles", debug: true,
      p1: { name: "A", team: [g7("Magearna", ["Splash"]), g7("Passimian", ["Splash"], { ability: "Receiver" })] },
      p2: { name: "B", team: [g7("Snorlax", ["Explosion"], { level: 100, ability: "Thick Fat" }), g7("Tsareena", ["Splash"], { ability: "Queenly Majesty" })] } });
    b.start();
    const [magearna, passimian] = b.sides.p1.actives;
    play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
    assert(b.sides.p2.actives[0].fainted, "Snorlax exploded");
    assert(magearna.fainted && passimian.ability === "Soul-Heart", "Receiver took Magearna's Soul-Heart");
    const c = new Battle({ seed: 1, format: "doubles", debug: true,
      p1: { name: "A", team: [g7("Rattata", ["Quick Attack"], { ability: "Guts" }), g7("Vikavolt", ["Splash"])] },
      p2: { name: "B", team: [g7("Snorlax", ["Splash"]), g7("Tsareena", ["Splash"], { ability: "Queenly Majesty" })] } });
    c.start();
    const evs = play(c, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
    assert(has(evs, "-activate", c.sides.p2.actives[1].ident, "ability: Queenly Majesty"), "Queenly Majesty guards its ally");
    assert.strictEqual(c.sides.p2.actives[0].hp, c.sides.p2.actives[0].maxhp);
    const charj = Damage.makePokemon("Charjabug", { level: 50 }), foe = Damage.makePokemon("Snorlax", { level: 50 });
    assert.strictEqual(Damage.calc(charj, foe, "Bug Buzz", {}, { battery: true }).basePower, 117);
  }
}

// Gen 7/8 follow-ups: Comatose counts as asleep; Emergency Exit from any
// damage; Shell Trap springs at once; Expanding Force and Dragon Darts in doubles.
{
  const g = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2) => { const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } }); b.start(); return b; };
  const dbl = (p1, p2) => { const b = new Battle({ seed: 1, debug: true, format: "doubles", p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } }); b.start(); return b; };
  const komala = Damage.makePokemon("Komala", { level: 50, ability: "Comatose" });
  // (Komala is Normal: Hex can't touch it, Wake-Up Slap shows it.)
  assert.strictEqual(Damage.calc(Damage.makePokemon("Machamp", { level: 50 }), komala, "Wake-Up Slap", {}).basePower, 140);
  const k = singles([g("Komala", ["Sleep Talk", "Wood Hammer"])], [g("Snorlax", ["Splash"])]);
  const evs = play(k, { p1: mv(0), p2: mv(0) });
  assert(evs.some((e) => e[0] === "move" && e[2] === "Wood Hammer"), "Komala can use Sleep Talk");
  // Emergency Exit: sandstorm takes Golisopod to half HP.
  const ex = singles([g("Tyranitar", ["Splash"], { ability: "Sand Stream" })], [g("Golisopod", ["Splash"]), g("Snorlax", ["Splash"])]);
  const golis = ex.sides.p2.active;
  golis.hp = Math.floor(golis.maxhp / 2) + 2;
  play(ex, { p1: mv(0), p2: mv(0) });
  assert.strictEqual(ex.getRequest("p2").phase, "switch", "Emergency Exit after sandstorm damage");
  // Shell Trap: hit by a physical move, Turtonator goes next, ahead of the others.
  const st = dbl([g("Turtonator", ["Shell Trap"]), g("Snorlax", ["Splash"], { level: 5 })],
    [g("Pidgeot", ["Wing Attack"], { level: 70 }), g("Rattata", ["Splash"], { level: 60, ability: "Guts" })]);
  const order = play(st, { p1: [mv(0), mv(0)], p2: [mv(0, 1), mv(0)] }).filter((e) => e[0] === "move").map((e) => e[2]);
  assert.deepStrictEqual(order.slice(0, 2), ["Wing Attack", "Shell Trap"]);
  // Expanding Force on Psychic Terrain and Dragon Darts hit both foes.
  const ef = dbl([g("Indeedee", ["Expanding Force"], { ability: "Psychic Surge" }), g("Snorlax", ["Splash"])],
    [g("Machamp", ["Splash"]), g("Machamp", ["Splash"])]);
  play(ef, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  assert(ef.sides.p2.actives.every((m) => hpLost(m) > 0), "Expanding Force spreads");
  const dd = dbl([g("Dragapult", ["Dragon Darts"]), g("Snorlax", ["Splash"])], [g("Snorlax", ["Splash"]), g("Snorlax", ["Splash"])]);
  play(dd, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
  assert(dd.sides.p2.actives.every((m) => hpLost(m) > 0), "Dragon Darts hits each foe");
  const df = dbl([g("Dragapult", ["Dragon Darts"]), g("Snorlax", ["Splash"])], [g("Clefable", ["Splash"]), g("Snorlax", ["Splash"])]);
  const hits = play(df, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] }).filter((e) => e[0] === "-damage" && e[1] === df.sides.p2.actives[1].ident && !e[3]);
  assert.strictEqual(hits.length, 2, "both hits go to the Snorlax when Clefable is immune");
}

// All of Zygarde's formes: the Zygarde Cube switches 10% and 50% and Aura
// Break / Power Construct; Power Construct makes either Complete in battle;
// Zygardite Mega Evolves the Complete Forme only.
{
  const z = Party.create("Zygarde", 60);
  z.ability = "Aura Break";
  assert(Bag.canUseOn(z, "zygarde-cube") && !Bag.canUseOn(Party.create("Pikachu", 5), "zygarde-cube"));
  z.hp -= 10;
  Bag.zygardeCube(z, "forme");
  assert.strictEqual(z.species, "Zygarde-10%");
  assert.strictEqual(Party.maxHp(z) - z.hp, 10, "the HP it's down stays down");
  Bag.zygardeCube(z, "ability");
  assert.strictEqual(z.ability, "Power Construct");
  Bag.zygardeCube(z, "forme");
  assert.strictEqual(z.species, "Zygarde");
  assert.strictEqual(Bag.pocket("zygardite"), "Mega Stones");
  z.item = "zygardite";
  z.moves = [{ name: "Dragon Pulse", pp: 10 }];
  const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [Party.toBattleSet(z)] },
    p2: { name: "B", team: [{ species: "Raticate", level: 60, moves: ["Super Fang"] }, { species: "Snorlax", level: 60, moves: ["Splash"] }] } });
  b.start();
  const mon = b.sides.p1.active;
  assert(!b.getRequest("p1").active.canMega, "no Mega Zygarde from the 50% Forme");
  for (let i = 0; i < 6 && mon.species !== "Zygarde-Complete"; i++) play(b, { p1: mv(0), p2: b.getRequest("p2").phase === "switch" ? { type: "switch", index: 1 } : mv(0) });
  assert.strictEqual(mon.species, "Zygarde-Complete");
  assert(b.getRequest("p1").active.canMega, "the Complete Forme can Mega Evolve");
  play(b, { p1: { type: "move", move: 0, mega: true }, p2: b.getRequest("p2").phase === "switch" ? { type: "switch", index: 1 } : mv(0) });
  assert.strictEqual(mon.species, "Zygarde-Mega");
  // (A Mega Stone only works for its own species.)
  const pika = new Battle({ seed: 1, p1: { name: "A", team: [{ species: "Pikachu", level: 50, item: "charizardite-x", moves: ["Tackle"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] } });
  pika.start();
  assert(!pika.getRequest("p1").active.canMega);
}

// Z-Moves: a Z-Crystal turns a move of its type into its Z-Move (status moves
// get a Z-Power bonus), once a battle, through Protect for a quarter; the
// species' own crystals; Ultra Burst; Silvally's Memories; Origin Dialga.
{
  const g = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2) => { const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } }); b.start(); return b; };
  const b = singles([g("Charizard", ["Flamethrower", "Swords Dance"], { item: "firium-z" })], [g("Snorlax", ["Protect", "Splash"], { level: 70 })]);
  assert.deepStrictEqual(b.getRequest("p1").active.zMoves, ["Inferno Overdrive", null]);
  const lax = b.sides.p2.active;
  let evs = play(b, { p1: { type: "move", move: 0, zmove: true }, p2: mv(0) });
  assert(evs.some((e) => e[0] === "-zpower") && evs.some((e) => e[0] === "move" && e[2] === "Inferno Overdrive"));
  assert(evs.some((e) => e[0] === "-zbroken"), "a Z-Move gets through Protect");
  const through = hpLost(lax);
  assert(through > 0);
  assert.strictEqual(b.sides.p1.active.moves[0].pp, b.sides.p1.active.moves[0].maxpp - 1, "the PP is Flamethrower's");
  assert.strictEqual(b.getRequest("p1").active.zMoves, null, "once a battle");
  assert(!b.choose("p1", { type: "move", move: 0, zmove: true }).ok);
  // The full Z-Move's power: 175 from Flamethrower.
  const zard = Damage.makePokemon("Charizard", { level: 50 }), foe = Damage.makePokemon("Snorlax", { level: 50 });
  assert.strictEqual(Damage.calc(zard, foe, "Inferno Overdrive", {}, { zPower: 175, zCategory: "Special" }).basePower, 175);
  // A status Z-Move: Z-Swords Dance clears the stat drops first.
  const c = singles([g("Snorlax", ["Swords Dance"], { item: "normalium-z" })], [g("Rattata", ["Growl"], { ability: "Guts" })]);
  play(c, { p1: mv(0), p2: mv(0) });
  play(c, { p1: { type: "move", move: 0, zmove: true }, p2: mv(0) });
  assert.strictEqual(c.sides.p1.active.boosts.atk, 2 - 1 + 1, "-1 from Growl cleared, then +2 (and Growl again after)");
  // Pikachu's own: Volt Tackle into Catastropika.
  const p = singles([g("Pikachu", ["Volt Tackle", "Thunderbolt"], { item: "pikanium-z" })], [g("Snorlax", ["Splash"])]);
  assert.deepStrictEqual(p.getRequest("p1").active.zMoves, ["Catastropika", null]);
  // Ultra Burst, then Light That Burns the Sky.
  const n = singles([g("Necrozma-Dusk-Mane", ["Photon Geyser"], { item: "ultranecrozium-z" })], [g("Snorlax", ["Splash"], { level: 90 })]);
  assert(n.getRequest("p1").active.canUltraBurst);
  assert.strictEqual(n.getRequest("p1").active.zMoves, null, "only Ultra Necrozma has its Z-Move");
  evs = play(n, { p1: { type: "move", move: 0, ultra: true }, p2: mv(0) });
  assert.strictEqual(n.sides.p1.active.species, "Necrozma-Ultra");
  assert(evs.some((e) => e[0] === "-burst"));
  assert.deepStrictEqual(n.getRequest("p1").active.zMoves, ["Light That Burns the Sky"]);
  assert(!n.getRequest("p1").active.canUltraBurst);
  // Silvally's Memories and the Origin Formes.
  const s = singles([g("Silvally", ["Multi-Attack"], { item: "fire-memory" })], [g("Ferrothorn", ["Splash"])]);
  assert.strictEqual(s.sides.p1.active.species, "Silvally-Fire");
  evs = play(s, { p1: mv(0), p2: mv(0) });
  assert(evs.some((e) => e[0] === "-supereffective"), "Fire Multi-Attack against Ferrothorn");
  const d = singles([g("Dialga", ["Splash"], { item: "adamant-crystal" })], [g("Palkia", ["Splash"], { item: "lustrous-globe" })]);
  assert.deepStrictEqual([d.sides.p1.active.species, d.sides.p2.active.species], ["Dialga-Origin", "Palkia-Origin"]);
}

// Alcremie's flavours: the cream from how Milcery spins and when, the Sweet
// on top; every one of the 63 has its pictures and party icon.
{
  assert.strictEqual(Party.alcremieCream(true, false, 12), "vanilla-cream");
  assert.strictEqual(Party.alcremieCream(false, false, 12), "ruby-cream");
  assert.strictEqual(Party.alcremieCream(false, true, 19), "rainbow-swirl");
  assert.strictEqual(Party.alcremieCream(true, false, 22), "matcha-cream");
  const a = Party.create("Alcremie", 30);
  assert.strictEqual(Party.form(a), "", "plain Alcremie: vanilla cream, Strawberry Sweet");
  a.alcremie = "ruby-swirl-clover-sweet";
  assert.strictEqual(Party.form(a), "ruby-swirl-clover-sweet");
  assert.strictEqual(ALCREMIE_FORMS.length, 63);
  for (const f of ALCREMIE_FORMS.filter((x) => x !== "vanilla-cream-strawberry-sweet")) {
    for (const sub of ["", "back/", "shiny/", "back/shiny/"]) assert(fs.existsSync(path.join(root, "assets/sprites/pokemon", sub + "869-" + f + ".png")), sub + f);
    assert(fs.existsSync(path.join(root, "assets/sprites/icons/869-" + f + ".png")), "icon " + f);
  }
}

// Dynamax (with the Dynamax Band: the side's `dynamax`): three turns, HP up
// by its Dynamax Level, Max Moves and their effects, Max Guard; Gigantamax
// with the G-Max Factor; Eternatus Eternamaxes; Dynamax Candy and Max Soup.
{
  const g = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2, dyn) => {
    const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: p1, dynamax: dyn !== false }, p2: { name: "B", team: p2 } });
    b.start();
    return b;
  };
  const no = singles([g("Snorlax", ["Body Slam"])], [g("Snorlax", ["Splash"])], false);
  assert(!no.getRequest("p1").active.canDynamax, "no Dynamax without the Dynamax Band");
  const b = singles([g("Snorlax", ["Body Slam", "Rest"])], [g("Snorlax", ["Splash", "Fissure", "Fake Out"], { level: 100, ability: "Thick Fat" })]);
  const lax = b.sides.p1.active, before = lax.maxhp;
  assert.deepStrictEqual(b.getRequest("p1").active.maxMoves, ["Max Strike", "Max Guard"]);
  let evs = play(b, { p1: { type: "move", move: 0, dynamax: true }, p2: mv(0) });
  assert(evs.some((e) => e[0] === "-dynamax") && evs.some((e) => e[0] === "move" && e[2] === "Max Strike"));
  assert.strictEqual(lax.maxhp, before * 2, "Dynamax Level 10: double HP");
  assert.strictEqual(b.sides.p2.active.boosts.spe, -1, "Max Strike lowers the foe's Speed");
  assert(b.getRequest("p1").active.dynamaxed && !b.getRequest("p1").active.canDynamax);
  evs = play(b, { p1: mv(0), p2: mv(1) });
  assert(evs.some((e) => e[0] === "-fail"), "no OHKO moves at a Dynamaxed Pokémon");
  evs = play(b, { p1: mv(0), p2: mv(2) });
  assert(!evs.some((e) => e[0] === "cant" && e[2] === "flinch"));
  assert(evs.some((e) => e[0] === "-dynamaxend"), "it ends after three turns");
  assert.strictEqual(lax.maxhp, before);
  // Max Guard, and a Max Move through Protect for a quarter.
  const p = singles([g("Snorlax", ["Body Slam"])], [g("Snorlax", ["Protect"]), g("Snorlax", ["Splash"])]);
  evs = play(p, { p1: { type: "move", move: 0, dynamax: true }, p2: mv(0) });
  assert(evs.some((e) => e[0] === "-zbroken") && hpLost(p.sides.p2.active) > 0);
  // Gigantamax: Charizard's G-Max Wildfire.
  const c = singles([g("Charizard", ["Flamethrower", "Air Slash"], { gmax: true })], [g("Snorlax", ["Splash"], { level: 70 })]);
  assert.deepStrictEqual(c.getRequest("p1").active.maxMoves, ["G-Max Wildfire", "Max Airstream"]);
  play(c, { p1: { type: "move", move: 0, dynamax: true }, p2: mv(0) });
  assert.strictEqual(c.sides.p1.active.species, "Charizard-Gmax");
  assert(c.sides.p2.conditions.gmaxwildfire, "G-Max Wildfire burns the field for four turns");
  // Dynamax Level 0 (a party Pokémon's own): ×1.5. Eternatus: Eternamax.
  const rec = Party.create("Snorlax", 50, { rng: mulberry32(5) });
  const d = new Battle({ seed: 1, p1: { name: "A", team: [Party.toBattleSet(rec)], dynamax: true }, p2: { name: "B", team: [g("Snorlax", ["Splash"])] } });
  d.start();
  const m0 = d.sides.p1.active.maxhp;
  play(d, { p1: { type: "move", move: 0, dynamax: true }, p2: mv(0) });
  assert.strictEqual(d.sides.p1.active.maxhp, Math.floor(m0 * 1.5));
  const e = singles([g("Eternatus", ["Dynamax Cannon"])], [g("Snorlax", ["Splash"], { level: 100 })]);
  play(e, { p1: { type: "move", move: 0, dynamax: true }, p2: mv(0) });
  assert.strictEqual(e.sides.p1.active.species, "Eternatus-Eternamax");
  // Dynamax Candy, Max Soup (Max Mushrooms).
  const zard = Party.create("Charizard", 50);
  assert(Bag.canUseOn(zard, "max-mushrooms") && !Bag.canUseOn(Party.create("Pidgey", 5), "max-mushrooms"));
  Bag.useOn(zard, "max-mushrooms");
  Bag.useOn(zard, "dynamax-candy");
  assert.deepStrictEqual([zard.gmax, zard.dynamaxLevel, Party.toBattleSet(zard).gmax], [true, 1, true]);
}

// FireRed's Fly and Transform animations (tools/build-move-anims.js).
{
  for (const f of ["round-shadow.png", "impact.png"]) assert(fs.existsSync(path.join(root, "assets/battle-anims", f)), f);
  const bs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8");
  assert(/async function flyUp\(pos\)/.test(bs) && /async function flyAttack\(pos, aim, lands\)/.test(bs) && /async function transformAnim\(pos, swap\)/.test(bs));
}

// Gen 7's Pokémon in random battles (singles and doubles, the battle in
// debug mode so an Ability or move effect that throws fails the test).
const GEN7 = 100;
let gen7Turns = 0;
for (let seed = 1; seed <= GEN7; seed++) {
  const teamRng = mulberry32(seed * 7919);
  const dbl = seed % 2 === 0;
  const team = () => RandomTeam.team(dbl ? 4 : 3, { level: 50, rng: teamRng, onlyGen: 7 });
  const battle = new Battle({ seed, debug: true, format: dbl ? "doubles" : "singles", p1: { name: "A", team: team() }, p2: { name: "B", team: team() } });
  const rng = mulberry32(seed);
  battle.start();
  for (let step = 0; step < 3000 && !battle.ended; step++) {
    for (const id of ["p1", "p2"]) {
      const req = battle.getRequest(id);
      if (req.phase !== "move" && req.phase !== "switch") continue;
      const r = battle.choose(id, step % 2 ? OpponentAI.choose(battle, id, rng) : battle.randomChoice(id));
      assert(r.ok, "Gen 7 choice rejected in battle " + seed + ": " + r.error);
    }
  }
  assert(battle.ended, "Gen 7 battle " + seed + " did not finish");
  gen7Turns += battle.turn;
}

// ---------- Generation 8 battles ----------
{
  const g8 = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2, seed) => {
    const b = new Battle({ seed: seed || 1, debug: true, p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } });
    b.start();
    return b;
  };
  const has = (evs, type, ...args) => evs.some((e) => e[0] === type && args.every((a, i) => a instanceof RegExp ? a.test(e[i + 1]) : e[i + 1] === a));

  // Zacian: Intrepid Sword; with the Rusted Sword, the Crowned Sword and
  // Behemoth Blade for Iron Head (Iron Head again after the battle).
  {
    const record = Party.create("Zacian", 70, { rng: mulberry32(8) });
    record.item = "rusted-sword";
    record.moves = [{ name: "Iron Head", pp: 15 }, { name: "Slash", pp: 20 }];
    const b = singles([Party.toBattleSet(record)], [g8("Snorlax", ["Splash"])]);
    const z = b.sides.p1.active;
    assert.strictEqual(z.species, "Zacian-Crowned");
    assert.strictEqual(z.boosts.atk, 1, "Intrepid Sword");
    assert.strictEqual(z.moves[0].name, "Behemoth Blade");
    play(b, { p1: mv(0), p2: mv(0) });
    Party.syncFromBattle(record, z);
    assert.deepStrictEqual(record.moves.map((m) => m.name), ["Iron Head", "Slash"]);
    assert.strictEqual(record.species, "Zacian");
  }
  // Ice Face takes a physical hit; Gulp Missile spits back.
  {
    const b = singles([g8("Eiscue", ["Splash"])], [g8("Snorlax", ["Tackle", "Ember"])]);
    const e = b.sides.p1.active;
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(e.species, "Eiscue-Noice");
    assert.strictEqual(e.hp, e.maxhp);
    const c = singles([g8("Cramorant", ["Surf"])], [g8("Snorlax", ["Splash", "Tackle"], { ability: "Thick Fat" })]);
    const cram = c.sides.p1.active, lax = c.sides.p2.active;
    play(c, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(cram.species, "Cramorant-Gulping");
    const evs = play(c, { p1: mv(0), p2: mv(1) });
    assert(has(evs, "detailschange", cram.ident, "Cramorant"), "Gulp Missile spat its catch");
    assert(lax.boosts.def < 0 || lax.status === "par");
  }
  // Hunger Switch, Aura Wheel's type.
  {
    const b = singles([g8("Morpeko", ["Aura Wheel"])], [g8("Snorlax", ["Splash"])]);
    const m = b.sides.p1.active;
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(m.species, "Morpeko-Hangry");
    const evs = play(b, { p1: mv(0), p2: mv(0) });
    assert(hpLost(b.sides.p2.active) > 0);
    assert.strictEqual(Damage.calc(m, b.sides.p2.active, "Aura Wheel", {}, { moveType: "Dark" }).type, "Dark");
  }
  // Neutralizing Gas: Levitate stops working.
  {
    const b = singles([g8("Weezing-Galar", ["Earthquake"], { ability: "Neutralizing Gas" })], [g8("Bronzong", ["Splash"], { ability: "Levitate" })]);
    assert(has(b.events, "-ability", b.sides.p1.active.ident, "Neutralizing Gas"));
    play(b, { p1: mv(0), p2: mv(0) });
    assert(hpLost(b.sides.p2.active) > 0, "Earthquake hit a Levitate Bronzong");
  }
  // Gorilla Tactics locks the move; Mirror Armor bounces Growl.
  {
    const b = singles([g8("Darmanitan-Galar", ["Ice Punch", "Fire Punch"], { ability: "Gorilla Tactics" })], [g8("Corviknight", ["Splash"], { ability: "Mirror Armor" })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert(b.getRequest("p1").active.moves[1].disabled, "Gorilla Tactics: locked into Ice Punch");
    const c = singles([g8("Rattata", ["Growl"], { ability: "Guts" })], [g8("Corviknight", ["Splash"], { ability: "Mirror Armor" })]);
    play(c, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(c.sides.p1.active.boosts.atk, -1);
    assert.strictEqual(c.sides.p2.active.boosts.atk, 0);
  }
  // Obstruct, Stone Axe, Steel Beam, Court Change, Clangorous Soul.
  {
    const b = singles([g8("Grimmsnarl", ["Obstruct"])], [g8("Snorlax", ["Tackle"], { ability: "Thick Fat" })]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p2.active.boosts.def, -2);
    const c = singles([g8("Kleavor", ["Stone Axe", "Court Change"])], [g8("Snorlax", ["Splash"]), g8("Snorlax", ["Splash"])]);
    for (let i = 0; i < 4 && !c.sides.p2.conditions.stealthrock; i++) play(c, { p1: mv(0), p2: mv(0) });   // (90% accurate)
    assert(c.sides.p2.conditions.stealthrock, "Stone Axe sets Stealth Rock");
    play(c, { p1: mv(1), p2: mv(0) });
    assert(c.sides.p1.conditions.stealthrock && !c.sides.p2.conditions.stealthrock, "Court Change swaps them");
    const d = singles([g8("Duraludon", ["Steel Beam"])], [g8("Snorlax", ["Splash"])]);
    const dura = d.sides.p1.active;
    play(d, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(dura.hp, dura.maxhp - Math.ceil(dura.maxhp / 2));
    const k = singles([g8("Kommo-o", ["Clangorous Soul"])], [g8("Snorlax", ["Splash"])]);
    play(k, { p1: mv(0), p2: mv(0) });
    assert.deepStrictEqual([k.sides.p1.active.boosts.atk, k.sides.p1.active.boosts.spe], [1, 1]);
    assert.strictEqual(hpLost(k.sides.p1.active), Math.floor(k.sides.p1.active.maxhp / 3));
  }
  // Damage: Body Press uses Defense, Bolt Beak doubles moving first,
  // Triple Axel 20/40/60, Wicked Blow always crits, Terrain Pulse.
  {
    const corv = Damage.makePokemon("Corviknight", { level: 50 }), lax = Damage.makePokemon("Snorlax", { level: 50 });
    const iron = Damage.makePokemon("Corviknight", { level: 50, boosts: { def: 2 } });
    assert(Damage.calc(iron, lax, "Body Press", {}).max > Damage.calc(corv, lax, "Body Press", {}).max, "Body Press: Defense");
    const zolt = Damage.makePokemon("Dracozolt", { level: 50 });
    assert.strictEqual(Damage.calc(zolt, lax, "Bolt Beak", {}, {}).basePower, 170);
    assert.strictEqual(Damage.calc(zolt, lax, "Bolt Beak", {}, { movesAfterTarget: true }).basePower, 85);
    const axel = Damage.makePokemon("Glaceon", { level: 50 });
    assert.deepStrictEqual([0, 1, 2].map((i) => Damage.calc(axel, lax, "Triple Axel", {}, { hitIndex: i }).basePower), [20, 40, 60]);
    assert.strictEqual(Damage.critChance(zolt, "Wicked Blow"), 1);
    // (Doubled to 100, and Electric Terrain powers Electric moves up 1.5x.)
    assert.strictEqual(Damage.calc(zolt, lax, "Terrain Pulse", { terrain: "ElectricTerrain" }, { moveType: "Electric" }).basePower, 150);
  }
  // Evolutions: Toxtricity by nature, Sirfetch'd after 3 critical hits,
  // Basculegion's recoil (counted in battle), Overqwil's Barb Barrages.
  {
    const toxel = Party.create("Toxel", 30, { rng: mulberry32(1) });
    toxel.nature = "Hardy";
    assert.strictEqual(Evolution.find(toxel, { trigger: "level" }).into, "Toxtricity");
    toxel.nature = "Modest";
    assert.strictEqual(Evolution.find(toxel, { trigger: "level" }).into, "Toxtricity-Low-Key");
    const fetch = Party.create("Farfetch'd-Galar", 30, { rng: mulberry32(1) });
    assert(!Evolution.find(fetch, { trigger: "battle", crits: 2 }));
    assert.strictEqual(Evolution.find(fetch, { trigger: "battle", crits: 3 }).into, "Sirfetch'd");
    const bass = Party.create("Basculin-White-Striped", 30, { rng: mulberry32(2) });
    bass.moves = [{ name: "Wave Crash", pp: 10 }];
    const b = singles([Party.toBattleSet(bass)], [g8("Snorlax", ["Splash"], { level: 100 })]);
    play(b, { p1: mv(0), p2: mv(0) });
    const mon = b.sides.p1.pokemon[0];
    assert(mon.recoilTaken > 0, "recoil counted");
    Party.syncFromBattle(bass, mon);
    assert.strictEqual(bass.recoil, mon.recoilTaken);
    assert(!Evolution.find(bass, { trigger: "level" }));
    bass.recoil = 294;
    assert(/^Basculegion/.test(Evolution.find(bass, { trigger: "level" }).into));
    const qwil = Party.create("Qwilfish-Hisui", 30, { rng: mulberry32(3) });
    qwil.moves = [{ name: "Barb Barrage", pp: 10 }];
    const c = singles([Party.toBattleSet(qwil)], [g8("Snorlax", ["Splash"], { level: 100 })]);
    play(c, { p1: mv(0), p2: mv(0) });
    Party.syncFromBattle(qwil, c.sides.p1.pokemon[0]);
    assert.deepStrictEqual(qwil.moveUses, { "Barb Barrage": 1 });
    qwil.moveUses["Barb Barrage"] = 20;
    assert.strictEqual(Evolution.find(qwil, { trigger: "level" }).into, "Overqwil");
  }
}

// Gen 8's Pokémon in random battles, as Gen 7's above, Dynamaxing.
const GEN8 = 100;
let gen8Turns = 0;
for (let seed = 1; seed <= GEN8; seed++) {
  const teamRng = mulberry32(seed * 7927);
  const dbl = seed % 2 === 0;
  const team = () => RandomTeam.team(dbl ? 4 : 3, { level: 50, rng: teamRng, onlyGen: 8 });
  const battle = new Battle({ seed, debug: true, format: dbl ? "doubles" : "singles", p1: { name: "A", team: team(), dynamax: true },
    p2: { name: "B", team: team(), dynamax: true } });   // (and Dynamax)
  const rng = mulberry32(seed);
  battle.start();
  for (let step = 0; step < 3000 && !battle.ended; step++) {
    for (const id of ["p1", "p2"]) {
      const req = battle.getRequest(id);
      if (req.phase !== "move" && req.phase !== "switch") continue;
      const r = battle.choose(id, step % 2 ? OpponentAI.choose(battle, id, rng) : battle.randomChoice(id));
      assert(r.ok, "Gen 8 choice rejected in battle " + seed + ": " + r.error);
    }
  }
  assert(battle.ended, "Gen 8 battle " + seed + " did not finish");
  gen8Turns += battle.turn;
}

// ---------- Generation 9 battles, and Legends: Z-A's Megas ----------
{
  const g9 = (species, moves, extra) => Object.assign({ species, level: 50, moves }, extra);
  const singles = (p1, p2, seed) => {
    const b = new Battle({ seed: seed || 1, debug: true, p1: { name: "A", team: p1 }, p2: { name: "B", team: p2 } });
    b.start();
    return b;
  };
  const has = (evs, type, ...args) => evs.some((e) => e[0] === type && args.every((a, i) => a instanceof RegExp ? a.test(e[i + 1]) : e[i + 1] === a));
  const megaGo = (b) => play(b, { p1: { type: "move", move: 0, mega: true }, p2: mv(0) });

  // Legends: Z-A's Megas: by stone, Meowstic's by gender, Tatsugiri's by form, Floette any.
  for (const [species, stone, extra, forme] of [["Clefable", "clefablite", {}, "Clefable-Mega"], ["Meowstic", "meowsticite", { gender: "F" }, "Meowstic-F-Mega"],
    ["Meowstic", "meowsticite", { gender: "M" }, "Meowstic-M-Mega"], ["Tatsugiri-Droopy", "tatsugirinite", {}, "Tatsugiri-Droopy-Mega"],
    ["Floette", "floettite", {}, "Floette-Mega"], ["Raichu", "raichunite-y", {}, "Raichu-Mega-Y"], ["Garchomp", "garchompite-z", {}, "Garchomp-Mega-Z"]]) {
    const b = singles([g9(species, ["Splash"], Object.assign({ item: stone }, extra))], [g9("Snorlax", ["Splash"])]);
    assert(b.getRequest("p1").active.canMega, species + " can Mega Evolve");
    megaGo(b);
    assert.strictEqual(b.sides.p1.active.species, forme, stone);
  }
  { const b = singles([g9("Clefable", ["Splash"], { item: "meowsticite" })], [g9("Snorlax", ["Splash"])]);
    assert(!b.getRequest("p1").active.canMega, "another's stone does nothing"); }
  // Mega Feraligatr's Dragonize: Normal moves become Dragon.
  { const b = singles([g9("Feraligatr", ["Return"], { item: "feraligite" })], [g9("Snorlax", ["Splash"])]);
    megaGo(b);
    assert.strictEqual(b.sides.p1.active.ability, "Dragonize"); }
  // Piercing Drill gets through Protect for a quarter.
  { const b = singles([g9("Excadrill", ["Splash", "Iron Head"], { item: "excadrite" })], [g9("Snorlax", ["Protect", "Splash"])]);
    megaGo(b);
    const evs = play(b, { p1: mv(1), p2: mv(0) });
    assert(hpLost(b.sides.p2.active) > 0 && has(evs, "-zbroken"), "Piercing Drill"); }

  // Snowscape: snow, no damage, Ice types' Defense up; Blizzard can't miss.
  { const b = singles([g9("Cetitan", ["Snowscape"])], [g9("Snorlax", ["Splash"])]);
    const evs = play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.getWeather(), "Snow");
    assert(!damageTo(evs, b.sides.p2.active.ident).length, "no snow damage");
    const c = b.sides.p1.active, l = b.sides.p2.active;
    assert(Damage.calc(l, c, "Tackle", { weather: "Snow" }).max < Damage.calc(l, c, "Tackle", {}).max, "Ice types' Defense in snow"); }

  // Good as Gold blocks status moves; Treasures of Ruin.
  { const b = singles([g9("Gholdengo", ["Splash"])], [g9("Snorlax", ["Thunder Wave"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.status, "", "Good as Gold");
    const pao = b.sides.p1.active;
    const plain = Damage.calc(pao, b.sides.p2.active, "Tackle", {}).max;
    assert(Damage.calc(pao, b.sides.p2.active, "Tackle", {}, { ruin: { def: true } }).max > plain, "Sword of Ruin"); }

  // Zero to Hero: Palafin out and in again is a Hero.
  { const b = singles([g9("Palafin", ["Splash"]), g9("Snorlax", ["Splash"])], [g9("Snorlax", ["Splash"])]);
    play(b, { p1: { type: "switch", index: 1 }, p2: mv(0) });
    play(b, { p1: { type: "switch", index: 0 }, p2: mv(0) });
    assert.strictEqual(b.sides.p1.active.species, "Palafin-Hero"); }
  // Tera Shift: Terapagos takes its Terastal Form and Tera Shell.
  { const b = singles([g9("Terapagos", ["Splash"])], [g9("Snorlax", ["Splash"])]);
    const t = b.sides.p1.active;
    assert.deepStrictEqual([t.species, t.ability], ["Terapagos-Terastal", "Tera Shell"]); }
  // Rage Fist grows with each hit taken; Last Respects with each fainted ally.
  { const a = Damage.makePokemon("Annihilape", { level: 50 }), d = Damage.makePokemon("Alakazam", { level: 50 });
    assert(Damage.calc(a, d, "Rage Fist", {}, { timesHit: 3 }).basePower === 200);
    assert(Damage.calc(a, d, "Last Respects", {}, { faintedAllies: 2 }).basePower === 150); }
  // Salt Cure: a quarter a turn to a Water type.
  { const b = singles([g9("Garganacl", ["Salt Cure"])], [g9("Vaporeon", ["Splash"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    const v = b.sides.p2.active;
    assert(v.volatiles.saltcure && hpLost(v) >= Math.floor(v.maxhp / 4), "Salt Cure"); }
  // Shed Tail: out, and the substitute stays for whoever comes in.
  { const b = singles([g9("Cyclizar", ["Shed Tail"]), g9("Snorlax", ["Splash"])], [g9("Snorlax", ["Splash"])]);
    play(b, { p1: mv(0), p2: mv(0) });
    if (b.getRequest("p1").phase === "switch") play(b, { p1: { type: "switch", index: 1 } });
    assert(b.sides.p1.active.species === "Snorlax" && b.sides.p1.active.volatiles.substitute, "Shed Tail"); }

  // Revival Blessing: you pick who comes back, with half its HP.
  { const b = singles([g9("Pawmot", ["Revival Blessing", "Splash"]), g9("Snorlax", ["Splash"]), g9("Machamp", ["Splash"])], [g9("Snorlax", ["Splash"])]);
    b.sides.p1.pokemon[1].hp = 0; b.sides.p1.pokemon[1].fainted = true;
    b.sides.p1.pokemon[2].hp = 0; b.sides.p1.pokemon[2].fainted = true;
    play(b, { p1: mv(0), p2: mv(0) });
    const rq = b.getRequest("p1");
    assert.deepStrictEqual([rq.phase, rq.revives], ["revive", [1, 2]]);
    assert(!b.choose("p1", { type: "revive", index: 0 }).ok, "only a fainted one");
    const evs = b.events.length;
    assert(b.choose("p1", { type: "revive", index: 2 }).ok);
    const m = b.sides.p1.pokemon[2];
    assert(!m.fainted && m.hp === Math.floor(m.maxhp / 2) && b.events.slice(evs).some((e) => e[0] === "-revive"));
    assert.strictEqual(b.getRequest("p1").phase, "move", "the turn went on");
    const c = singles([g9("Pawmot", ["Revival Blessing"])], [g9("Snorlax", ["Splash"])]);
    play(c, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(c.getRequest("p1").phase, "move", "nobody to revive: it fails"); }
  // Heal Block: no healing moves, no healing; Psychic Noise for two turns.
  { const b = singles([g9("Alakazam", ["Heal Block"])], [g9("Blissey", ["Soft-Boiled", "Splash"])]);
    play(b, { p1: mv(0), p2: mv(1) });
    const bl = b.sides.p2.active;
    assert(bl.volatiles.healblock && b.getRequest("p2").active.moves[0].disabled, "Heal Block");
    bl.hp = Math.floor(bl.maxhp / 2);
    assert.strictEqual(b.heal(bl, 100, bl), 0);
    const c = singles([g9("Indeedee", ["Psychic Noise"])], [g9("Snorlax", ["Splash"])]);
    play(c, { p1: mv(0), p2: mv(0) });
    assert.strictEqual(c.sides.p2.active.volatiles.healblock.duration, 1, "Psychic Noise: two turns"); }
  // Doubles: Dragon Cheer (+1, +2 for a Dragon) and Commander.
  { const b = doubles({ team: [g9("Hydrapple", ["Dragon Cheer", "Splash"]), g9("Garchomp", ["Splash"]), g9("Snorlax", ["Splash"])] },
      { team: [g9("Snorlax", ["Splash"]), g9("Snorlax", ["Splash"])] });
    play(b, { p1: [mv(0, -2), mv(0)], p2: [mv(0), mv(0)] });
    assert.strictEqual(b.sides.p1.actives[1].volatiles.dragoncheer.stages, 2, "Dragon Cheer on a Dragon"); }
  { const b = doubles({ team: [g9("Tatsugiri-Stretchy", ["Splash"]), g9("Dondozo", ["Order Up", "Splash"]), g9("Snorlax", ["Splash"])] },
      { team: [g9("Machamp", ["Close Combat", "Splash"]), g9("Machamp", ["Splash"])] });
    const [tat, zozo] = b.sides.p1.actives;
    assert(tat.volatiles.commanding && zozo.volatiles.commanded, "in Dondozo's mouth");
    assert.deepStrictEqual([zozo.boosts.atk, zozo.boosts.spe], [2, 2]);
    const rq = b.getRequest("p1");
    assert(!rq.open.includes(0) && rq.actives[1].trapped && !rq.actives[1].switches.length, "Tatsugiri can't act, Dondozo can't leave");
    // (Machamp's Close Combat at Tatsugiri, in slot a.)
    const evs = play(b, { p1: mv(0, 1), p2: [mv(0, 1), mv(0)] });
    assert.strictEqual(tat.hp, tat.maxhp, "an attack at Tatsugiri misses");
    assert(evs.some((e) => e[0] === "-miss" && e[2] === tat.ident));
    assert.strictEqual(zozo.boosts.spe, 3, "Order Up with a Stretchy Tatsugiri: Speed");
    zozo.hp = 1;
    play(b, { p1: mv(1), p2: [mv(0, 2), mv(0)] });
    assert(zozo.fainted && !tat.volatiles.commanding, "out again when Dondozo faints"); }
  // Terastallizing (with a Tera Orb: p1.tera): its Tera Type for the rest of
  // the battle, once a battle.
  { const tsingles = (p1, p2) => { const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: p1, tera: true }, p2: { name: "B", team: p2 } }); b.start(); return b; };
    const b = tsingles([g9("Snorlax", ["Tera Blast", "Roost"], { teraType: "Ghost" }), g9("Pidgeot", ["Roost"], { teraType: "Flying" })],
      [g9("Dusknoir", ["Splash"]), g9("Machamp", ["Close Combat"])]);
    const s = b.sides.p1.active;
    assert(b.getRequest("p1").active.canTera && !b.getRequest("p2").active.canTera, "only with a Tera Orb");
    const evs = play(b, { p1: { type: "move", move: 0, tera: true }, p2: mv(0) });
    assert(has(evs, "-terastallize", s.ident, "Ghost"));
    assert.deepStrictEqual([s.terastallized, s.types], ["Ghost", ["Ghost"]]);
    assert(hpLost(b.sides.p2.active) > 0, "a Ghost-type Tera Blast hits Dusknoir");
    assert(!b.getRequest("p1").active.canTera, "once a battle");
    play(b, { p1: { type: "switch", index: 1 }, p2: mv(0) });
    assert(!b.getRequest("p1").active.canTera, "once a battle, for any Pokémon");
    play(b, { p1: { type: "switch", index: 0 }, p2: { type: "switch", index: 1 } });
    assert.deepStrictEqual(b.sides.p1.active.types, ["Ghost"], "still Terastallized when it comes back");
    const cc = play(b, { p1: mv(1), p2: mv(0) });
    assert(has(cc, "-immune", s.ident), "Close Combat can't touch a Tera Ghost"); }
  // A trainer's ace (teraAce: Brock's Onix, Tera Dragon) Terastallizes as soon as it's out.
  { const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Pikachu", ["Splash"])] },
      p2: { name: "B", team: [g9("Onix", ["Tackle"], { teraType: "Dragon", teraAce: true }), g9("Geodude", ["Tackle"])], tera: true } });
    b.start();
    b.choose("p1", mv(0)); b.choose("p2", OpponentAI.choose(b, "p2", mulberry32(1)));
    const o = b.sides.p2.pokemon[0];
    assert.deepStrictEqual([o.terastallized, o.types], ["Dragon", ["Dragon"]], "Brock's Onix: Tera Dragon, first turn");
    const gameSrc = fs.readFileSync(path.join(__dirname, "../ui/game.js"), "utf8");
    assert(/Object\.assign\(onix, \{ teraType: "Dragon", teraAce: true \}\)/.test(gameSrc) && /pic: "leader_brock", tera: true/.test(gameSrc), "Brock's Onix");
    assert(/Object\.assign\(starmie, \{ teraType: "Psychic", teraAce: true \}\)/.test(gameSrc) && /pic: "leader_misty", tera: true/.test(gameSrc), "Misty's Starmie");
    assert(/r\.species === "Raichu"\), \{ teraType: "Water", teraAce: true \}\)/.test(gameSrc) && /pic: "leader_lt_surge", tera: true/.test(gameSrc), "Lt. Surge's Raichu");
    assert(WORLD_TRAINERS.TRAINER_LEADER_LT_SURGE.party.some((m) => m.species === "Raichu"));
    assert(/r\.species === "Vileplume"\), \{ teraType: "Poison", teraAce: true \}\)/.test(gameSrc) && /pic: "leader_erika", tera: true/.test(gameSrc), "Erika's Vileplume");
    assert(/item: "alakazite", teraType: "Dark", teraAce: true/.test(gameSrc) && /pic: "leader_sabrina", tera: true/.test(gameSrc), "Sabrina's Mega Alakazam");
    assert(/item: "houndoominite", teraType: "Dark", teraAce: true/.test(gameSrc) && /pic: "leader_blaine", tera: true/.test(gameSrc), "Blaine's Mega Houndoom");
    assert(/return \[Party\.create\("Magmortar", 43, \{ ivs: 0 \}\), Party\.create\("Magcargo", 42, \{ ivs: 0 \}\),\n\s*rapidash, arcanine, Object\.assign\(Party\.create\("Houndoom", 48, \{ ivs: 0 \}\)/.test(gameSrc), "Blaine: Magmortar, Magcargo, Rapidash, Arcanine, Mega Houndoom");
    // The Elite Four's, Giovanni's and Sabrina's swaps (first battle and rematch alike).
    const swaps = /const TEAM_SWAPS = (\{[\s\S]*?\n  \});/.exec(gameSrc);
    assert(swaps, "TEAM_SWAPS");
    const SW = eval("(" + swaps[1] + ")");
    const swapped = (id) => { const t = WORLD_TRAINERS[id].party.map((m) => ({ species: m.species })); for (const [i, sp, x] of SW[id] || []) { if (sp) t[i] = { species: sp }; Object.assign(t[i], x); } return t; };
    for (const r of ["", "_2"]) {
      assert.deepStrictEqual(swapped("TRAINER_ELITE_FOUR_AGATHA" + r).map((m) => m.species), ["Typhlosion-Hisui", "Cursola", "Marowak-Alola", "Mismagius", "Gengar"]);
      assert.deepStrictEqual(swapped("TRAINER_ELITE_FOUR_AGATHA" + r)[4], { species: "Gengar", item: "gengarite", teraType: "Dark", teraAce: true });
      assert.deepStrictEqual(swapped("TRAINER_ELITE_FOUR_LANCE" + r).map((m) => m.species), ["Gyarados", "Kingdra", "Charizard", "Aerodactyl", "Dragonite"]);
      assert.strictEqual(swapped("TRAINER_ELITE_FOUR_LANCE" + r)[4].teraType, "Flying");
      assert.strictEqual(swapped("TRAINER_ELITE_FOUR_BRUNO" + r)[3].species, "Hitmontop");
    }
    assert.deepStrictEqual(swapped("TRAINER_LEADER_GIOVANNI").map((m) => m.species), ["Rhydon", "Persian", "Nidoqueen", "Nidoking", "Kangaskhan"]);
    assert.strictEqual(swapped("TRAINER_LEADER_SABRINA")[0].species, "Jynx");
    for (const sp of ["Typhlosion-Hisui", "Cursola", "Marowak-Alola", "Mismagius", "Kingdra", "Hitmontop", "Jynx", "Rhydon", "Persian"]) assert(DEX[sp] && LEARNSETS_GEN6[sp], sp);
    assert(/team: swappedTeam\(ID\), pic: "leader_giovanni", tera: true/.test(gameSrc) && /team = swappedTeam\(id\)/.test(gameSrc));
    // Leaf on Route 22 before the League (Mega Dragonite, Tera Flying), Gary at the end of
    // Victory Road (his Growlithe an Arcanine, about level 50), and Red the Champion (Mega Charizard Y).
    // Gary's second battle (Cerulean): his Eevee knows Shadow Ball and Terastallizes into a Ghost type.
    assert(/concat\(\["Shadow Ball"\]\);\n\s*const eevee = Object\.assign\(Party\.create\("Eevee"[^\n]*teraType: "Ghost", teraAce: true \}\);\n\s*const team = base[^\n]*\n[^\n]*pic: "rival_early", tera: true/.test(gameSrc), "Gary's Cerulean Eevee");
    assert(/Party\.create\("Politoed", 48[^\n]*\n[^\n]*Object\.assign\(Party\.create\("Dragonite", 53, \{ ivs: 31 \}\), \{ item: "dragoninite", teraType: "Flying", teraAce: true \}\)/.test(gameSrc), "Leaf's Route 22 team");
    assert(/const VICTORY_ROAD_RIVAL_TEAM = \[\["Pidgeot", 50\], \["Arcanine", 50\], \["Gyarados", 50, "gyaradosite"\]/.test(gameSrc) && /at\.map === "Route23" && at\.x === 18 && at\.y === 28/.test(gameSrc), "Gary at the end of Victory Road");
    assert(/const CHAMPION_TEAM = \[\["Pikachu", 58, 72\], \["Espeon", 59, 72\], \["Wartortle", 60, 73\], \["Venusaur", 60, 73\], \["Snorlax", 61, 74\], \["Charizard", 63, 75, "charizardite-y"\]\]/.test(gameSrc)
      && /foe: \{ name: "Champion Red", team, pic: "red" \}/.test(gameSrc), "Red, the Champion");
    assert(WORLD_MAPS.VictoryRoad_2F.warps.some((w) => w.map === "Route23") && WORLD_MAPS.Route23.warps.some((w) => w.x === 18 && w.y === 28 && w.map === "VictoryRoad_2F"));
    // Every trainer's Pokémon knows the last four moves it learns by its level (not FireRed's sets).
    assert(!/moves: m\.moves/.test(gameSrc) && !/moves: m\.moves/.test(fs.readFileSync(path.join(__dirname, "../game/trainer-tower.js"), "utf8")), "trainers' moves by level");
    assert.deepStrictEqual(Party.create("Geodude", 12).moves.map((m) => m.name), RandomTeam.levelUpMoves("Geodude", 12));
    assert(/Houndoom to Mega Evolve into Mega Houndoom/.test(ITEMS.houndoominite.effect) && ITEM_SPRITES.houndoominite, "the Houndoominite");
    assert(/return \[weezing, muk, Party\.create\("Arbok"/.test(gameSrc) && /item: "beedrillite", teraType: "Fire", teraAce: true/.test(gameSrc)
      && /pic: "leader_koga", tera: true/.test(gameSrc), "Koga: Weezing, Muk, Arbok, Mega Beedrill (Tera Fire)");
    // Yours too: Mega Evolve and Terastallize in the same turn.
    const y = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Charizard", ["Ember"], { item: "charizardite-x", teraType: "Dragon" })], tera: true },
      p2: { name: "B", team: [g9("Snorlax", ["Splash"])] } });
    y.start();
    assert(y.choose("p1", { type: "move", move: 0, mega: true, tera: true }).ok); y.choose("p2", mv(0));
    assert.deepStrictEqual([y.sides.p1.active.species, y.sides.p1.active.terastallized], ["Charizard-Mega-X", "Dragon"], "Mega and Tera together");
    // While the ace is still to come, no one else Terastallizes (Erika's Victreebel, with Giga Drain, waits).
    const e = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Snorlax", ["Splash"])] },
      p2: { name: "B", team: [g9("Victreebel", ["Giga Drain"], { teraType: "Grass" }), g9("Vileplume", ["Acid"], { teraType: "Poison", teraAce: true })], tera: true } });
    e.start();
    e.choose("p1", mv(0)); e.choose("p2", OpponentAI.choose(e, "p2", mulberry32(1)));
    assert(!e.sides.p2.pokemon[0].terastallized, "the Orb is kept for the ace");
    // A Mega Stone holder Mega Evolves and Terastallizes in the same turn, the Mega Evolution first.
    const k = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Snorlax", ["Splash"])] },
      p2: { name: "B", team: [g9("Beedrill", ["Poison Jab"], { item: "beedrillite", teraType: "Fire", teraAce: true })], tera: true } });
    k.start();
    k.choose("p1", mv(0)); k.choose("p2", OpponentAI.choose(k, "p2", mulberry32(1)));
    const bee = k.sides.p2.pokemon[0], order = k.events.map((ev) => ev[0]).filter((t) => t === "-mega" || t === "-terastallize");
    assert.deepStrictEqual([bee.species, bee.terastallized, bee.types, order], ["Beedrill-Mega", "Fire", ["Fire"], ["-mega", "-terastallize"]], "Mega Beedrill, Tera Fire");
    assert(/script === "enter:PewterCity" \|\| script === "arrive:PewterCity"\) && !player\.flags\.gotTeraOrb/.test(gameSrc)
      && /Player\.addItem\(player, "tera-orb"\)/.test(gameSrc), "the Tera Orb from Prof. Oak's aide in Pewter"); }
  // Tera STAB: 2x for a Tera Type it already had, 1.5x for its own types or a new one; the 60-power floor.
  { const tera = (sp, t) => Object.assign(Damage.makePokemon(sp, { level: 50 }), { terastallized: t, teraBaseTypes: window.DEX[sp].types.slice(), types: t === "Stellar" ? window.DEX[sp].types.slice() : [t] });
    const d = Damage.makePokemon("Snorlax", { level: 50 }), plain = Damage.makePokemon("Pikachu", { level: 50 });
    const r = (a, m) => Damage.calc(a, d, m, {}).max;
    const same = r(tera("Pikachu", "Electric"), "Thunderbolt"), base = r(plain, "Thunderbolt");
    assert(same > base * 1.3 && same < base * 1.36, "Tera Electric Pikachu: 2x");
    assert.strictEqual(r(tera("Pikachu", "Water"), "Thunderbolt"), base, "its own type stays 1.5x");
    assert(r(tera("Pikachu", "Water"), "Surf") > r(plain, "Surf") * 1.45, "its Tera Type: 1.5x");
    assert.strictEqual(Damage.calc(tera("Pikachu", "Electric"), d, "Thunder Shock", {}).basePower, 60, "60 power at least");
    assert.strictEqual(Damage.calc(tera("Pikachu", "Normal"), d, "Quick Attack", {}).basePower, 40, "not for priority moves");
    const ad = Damage.makePokemon("Porygon-Z", { level: 50, ability: "Adaptability" });
    const adT = Object.assign(Damage.makePokemon("Porygon-Z", { level: 50, ability: "Adaptability" }), { terastallized: "Normal", teraBaseTypes: ["Normal"], types: ["Normal"] });
    assert(r(adT, "Hyper Voice") > r(ad, "Hyper Voice") * 1.1, "Adaptability: 2.25x");
    const target = Object.assign(Damage.makePokemon("Snorlax", { level: 50 }), { terastallized: "Normal" });
    const st = tera("Terapagos-Stellar", "Stellar");
    assert.strictEqual(Damage.calc(st, target, "Tera Starstorm", {}, { moveType: "Stellar" }).typeEffectiveness, 2, "Stellar: 2x at a Terastallized Pokémon");
    assert.strictEqual(Damage.calc(st, d, "Tera Starstorm", {}, { moveType: "Stellar" }).typeEffectiveness, 1); }
  // Ogerpon's masks: its Tera Type, its Tera form, Embody Aspect. Terapagos turns Stellar: Teraform Zero.
  { const b = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Ogerpon-Wellspring", ["Splash"], { item: "wellspring-mask", teraType: "Fire" })], tera: true },
      p2: { name: "B", team: [g9("Pelipper", ["Splash"], { ability: "Drizzle" })] } });
    b.start();
    const o = b.sides.p1.active;
    assert.strictEqual(o.teraType, "Water", "the mask's type");
    play(b, { p1: { type: "move", move: 0, tera: true }, p2: mv(0) });
    assert.deepStrictEqual([o.species, o.types, o.ability, o.boosts.spd], ["Ogerpon-Wellspring-Tera", ["Water"], "Embody Aspect (Wellspring)", 1]);
    const c = new Battle({ seed: 1, debug: true, p1: { name: "A", team: [g9("Terapagos", ["Tera Starstorm"])], tera: true },
      p2: { name: "B", team: [g9("Pelipper", ["Splash"], { ability: "Drizzle" })] } });
    c.start();
    assert.strictEqual(c.field.weather, "RainDance");
    play(c, { p1: { type: "move", move: 0, tera: true }, p2: mv(0) });
    const t = c.sides.p1.active;
    assert.deepStrictEqual([t.species, t.terastallized, t.ability, c.field.weather], ["Terapagos-Stellar", "Stellar", "Teraform Zero", ""]); }
  // Gen 9's evolution rules: steps, Coins, knockouts, 1 in 100.
  { const pawmo = Party.create("Pawmo", 30, { rng: mulberry32(9) });
    assert(!Evolution.find(pawmo, { trigger: "level", party: [pawmo] }));
    pawmo.steps = 1000;
    assert.strictEqual(Evolution.find(pawmo, { trigger: "level", party: [pawmo] }).into, "Pawmot");
    const g = Party.create("Gimmighoul", 30, { rng: mulberry32(9) });
    assert(!Evolution.find(g, { trigger: "level", party: [g], coins: 998 }));
    assert.strictEqual(Evolution.find(g, { trigger: "level", party: [g], coins: 999 }).into, "Gholdengo");
    const bis = Party.create("Bisharp", 60, { rng: mulberry32(9) });
    bis.koSpecies = { Bisharp: 3 };
    assert.strictEqual(Evolution.find(bis, { trigger: "level", party: [bis] }).into, "Kingambit");
    const t = Party.create("Tandemaus", 30, { rng: mulberry32(9) });
    t.personality = 1234500;
    assert.strictEqual(Evolution.find(t, { trigger: "level", party: [t] }).into, "Maushold-Four");
    t.personality = 1234501;
    assert.strictEqual(Evolution.find(t, { trigger: "level", party: [t] }).into, "Maushold"); }
}

// Gen 9's Pokémon in random battles, as Gen 8's above (no Dynamax).
const GEN9 = 100;
let gen9Turns = 0, gen9Tera = 0;
for (let seed = 1; seed <= GEN9; seed++) {
  const teamRng = mulberry32(seed * 104729);
  const dbl = seed % 2 === 0;
  const team = () => RandomTeam.team(dbl ? 4 : 3, { level: 50, rng: teamRng, onlyGen: 9 });
  const battle = new Battle({ seed, debug: true, format: dbl ? "doubles" : "singles", p1: { name: "A", team: team(), tera: true }, p2: { name: "B", team: team(), tera: true } });
  const rng = mulberry32(seed);
  battle.start();
  for (let step = 0; step < 3000 && !battle.ended; step++) {
    for (const id of ["p1", "p2"]) {
      const req = battle.getRequest(id);
      if (req.phase !== "move" && req.phase !== "switch" && req.phase !== "revive") continue;
      const r = battle.choose(id, step % 2 ? OpponentAI.choose(battle, id, rng) : battle.randomChoice(id));
      assert(r.ok, "Gen 9 choice rejected in battle " + seed + ": " + r.error);
    }
  }
  assert(battle.ended, "Gen 9 battle " + seed + " did not finish");
  if (battle.events.some((e) => e[0] === "-terastallize")) gen9Tera++;
  gen9Turns += battle.turn;
}

// Level caps (Player.levelCap): by the Badges of the region you're in; at the
// cap, no Exp. Points in battle, Exp. Candies stop at it, the Day-Care too.
{
  const p = Player.create("RED", 0);
  p.location = { map: "PalletTown", x: 5, y: 5 };
  assert.strictEqual(Player.levelCap(p), 15);
  p.badges = ["boulder", "cascade", "thunder"];
  assert.strictEqual(Player.levelCap(p), 35);
  p.badges = Player.REGION_BADGES.kanto.slice();
  assert.strictEqual(Player.levelCap(p), 100);
  assert.strictEqual(Player.levelCap(p, "Route29"), 15, "Johto goes by Johto's Badges");
  const b = new Battle({ seed: 3, exp: true, wild: true, levelCap: 15,
    p1: { name: "A", team: [Party.toBattleSet(Party.create("Charmander", 15), "PalletTown")] },
    p2: { name: "B", team: [{ species: "Caterpie", level: 2, moves: ["Tackle"] }] } });
  b.start();
  const before = b.sides.p1.active.exp;
  for (let i = 0; i < 10 && !b.ended; i++) { b.choose("p1", { type: "move", move: b.sides.p1.active.moves[0].id }); b.choose("p2", { type: "move", move: "Tackle" }); }
  assert(b.ended && b.sides.p1.active.level === 15 && b.sides.p1.active.exp === before && b.events.some((e) => e[0] === "-expcap"), "no Exp. Points at the cap");
  const r = Party.create("Charmander", 14);
  Bag.expCandy(r, "exp-candy-l", { cap: 15 });
  assert.strictEqual(r.level, 15, "an Exp. Candy stops at the cap");
  assert.strictEqual(r.exp, Experience.expForLevel(Experience.growthRate("Charmander"), 15));
  const dc = DayCare.deposit(Party.create("Pidgey", 10));
  dc.steps = 100000;
  assert.strictEqual(DayCare.levelsGained(dc, 15), 5);
  assert.strictEqual(DayCare.withdraw(dc, 15).level, 15, "the Day-Care stops at the cap");
}

console.log("ok: loaded " + headless.length + " scripts, " + BATTLES + " random battles finished (" + turns + " turns), AI beat random moves in " + aiWinRate + "% of games");
console.log("ok: doubles regressions, " + DOUBLES + " random doubles battles finished (" + doublesTurns + " turns)");

// The Route 5 Day-Care: 1 Exp. Point a step; ¥100 plus ¥100 a level to take it
// back; it learns its new moves, forgetting its first with four already.
{
  const mon = Party.create("Charmander", 5, { moves: ["Scratch", "Growl", "Ember", "Leer"] });
  const dc = DayCare.deposit(mon);
  assert.deepStrictEqual([DayCare.levelsGained(dc), DayCare.cost(dc)], [0, 100]);
  const target = Experience.expForLevel(Experience.growthRate("Charmander"), 10);
  while (mon.exp + dc.steps < target) DayCare.step(dc);
  assert.deepStrictEqual([DayCare.levelsGained(dc), DayCare.cost(dc)], [5, 600]);
  const back = DayCare.withdraw(dc);
  assert.strictEqual(back.level, 10);
  assert.strictEqual(back.moves.length, 4);
  assert.deepStrictEqual(back.moves.map((m) => m.name), ["Growl", "Ember", "Leer", "Smokescreen"]);   // Smokescreen at 10
}

// This game's own types.
{
  const types = (sp) => DEX[sp].types.join("/");
  assert.deepStrictEqual(["Aerodactyl", "Gyarados", "Gyarados-Mega", "Psyduck", "Golduck", "Blastoise", "Blastoise-Mega"].map(types),
    ["Dragon/Rock", "Dragon/Water", "Dragon/Water", "Water/Psychic", "Water/Psychic", "Water/Steel", "Water/Steel"]);
}

// X items: one stage up, only for the Pokémon in battle; in the Items pocket.
{
  const active = { hp: 10, maxhp: 20, fainted: false, isActive: true, boosts: { atk: 0 }, moves: [], evs: {}, level: 5 };
  assert(ItemUse.canUse(active, "x-attack", { inBattle: true }));
  assert(!ItemUse.canUse(active, "x-attack", {}) && !ItemUse.canUse(Object.assign({}, active, { isActive: false }), "x-attack", { inBattle: true }));
  assert(!ItemUse.canUse(Object.assign({}, active, { boosts: { atk: 6 } }), "x-attack", { inBattle: true }));
  assert.strictEqual(ItemUse.apply(active, "x-speed", { inBattle: true }).boost, "spe");
  assert.strictEqual(Bag.pocket("x-attack"), "Items");
  assert.strictEqual(Bag.sellPrice("stardust"), 1000);
}

// The S.S. Anne: every deck and cabin, the Captain (HM01) and Red's corridor.
{
  const ss = Object.keys(WORLD_MAPS).filter((m) => /^SSAnne/.test(m));
  assert.strictEqual(ss.length, 26);
  assert(WORLD_MAPS.SSAnne_CaptainsOffice.people.some((p) => p.script === "SSAnne_CaptainsOffice_EventScript_Captain"));
  assert.strictEqual(WORLD_MAPS.SSAnne_2F_Corridor.triggers.length, 3);
  for (const m of ss) for (const w of WORLD_MAPS[m].warps) assert(w.map, m + " leads somewhere built");
}

// An X Attack in battle: the Pokémon in battle's Attack goes up a stage.
{
  const battle = new Battle({
    seed: 3,
    p1: { name: "A", team: [{ species: "Pikachu", level: 20, moves: ["Growl"] }] },
    p2: { name: "B", team: [{ species: "Pidgey", level: 20, moves: ["Growl"] }] }
  });
  battle.start();
  assert(battle.choose("p1", { type: "item", item: "x-attack", target: 0 }).ok, "X Attack rejected");
  battle.choose("p2", { type: "move", move: "Growl" });
  assert(battle.events.some((ev) => ev[0] === "-useitem" && ev[2] === "x-attack"));
  assert(battle.events.some((ev) => ev[0] === "-boost"), "no -boost after X Attack");
}

// Pokémon going into the PC are fully healed.
{
  const pl = Player.create("T");
  for (const sp of ["Pidgey", "Rattata"]) Player.receive(pl, Party.create(sp, 10, { rng }));
  pl.party[1].hp = 1; pl.party[1].status = "psn"; pl.party[1].moves[0].pp = 0;
  assert.strictEqual(Player.deposit(pl, 1, 0), null);
  const r = pl.boxes[0][0];
  assert.deepStrictEqual([r.hp, r.status, r.moves[0].pp], [Party.maxHp(r), "", Party.maxPp(r.moves[0])]);
  while (pl.party.length < 6) Player.receive(pl, Party.create("Pidgey", 5, { rng }));
  const hurt = Party.create("Zubat", 5, { rng }); hurt.hp = 2;
  assert.strictEqual(Player.receive(pl, hurt), "box 1");
  assert.strictEqual(hurt.hp, Party.maxHp(hurt));
}

// Celadon and the Rocket Hideout.
{
  // Elevators: their doors lead wherever the dynamic warp says (the floor you
  // got in on, or the one you chose); with none set, nowhere.
  const exit = WORLD_MAPS.CeladonCity_DepartmentStore_Elevator.warps[0];
  World.setDynamicWarp(null);
  assert.strictEqual(World.warpTarget(exit), null);
  World.setDynamicWarp({ map: "CeladonCity_DepartmentStore_5F", x: 6, y: 1 });
  assert.deepStrictEqual(World.warpTarget(exit), { map: "CeladonCity_DepartmentStore_5F", x: 6, y: 1, door: true });
  World.setDynamicWarp(null);
  // The Hideout's arrows and stop tiles, and its barriers and the Game Corner's hidden stairs as patches.
  const b2 = WORLD_MAPS.RocketHideout_B2F, at = (m, x, y) => m.behavior[y * m.width + x];
  assert.strictEqual(at(b2, 16, 5), World.MB.SPIN_LEFT);
  assert.strictEqual(at(b2, 13, 7), World.MB.STOP_SPINNING);
  for (const [m, p] of [["CeladonCity_GameCorner", "hidden"], ["RocketHideout_B1F", "barrier"], ["RocketHideout_B4F", "barrier"]]) {
    assert(WORLD_MAPS[m].patches[p].collision.length >= 5, m + " " + p);
  }
  // Erika and Giovanni, and the Celadon Center as a respawn point.
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_ERIKA.party.map((m) => m.species), ["Victreebel", "Tangela", "Vileplume"]);
  assert.strictEqual(WORLD_TRAINERS.TRAINER_BOSS_GIOVANNI.className, "Boss");
  assert(Player.CENTERS.CeladonCity_PokemonCenter_1F);
  // Every Prize Room TM is one of this game's machines.
  for (const move of ["Ice Beam", "Iron Tail", "Thunderbolt", "Shadow Ball", "Flamethrower"]) {
    assert(Bag.machines().some((m) => Bag.machineMove(m) === move), "no TM for " + move);
  }
  for (const item of ["coin-case", "lift-key", "silph-scope", "tea", "fresh-water", "soda-pop", "lemonade", "smoke-ball", "yellow-flute"]) assert(ITEMS[item], item);
  // The slot machine's payouts (FireRed's CalcPayout): three 7s in the middle
  // pays 300; a cherry on the left reel pays 2.
  const Slots = require("../ui/slot-machine.js");
  const all = [];
  for (let i = 0; i < Slots.REEL_LENGTH; i++) for (let j = 0; j < Slots.REEL_LENGTH; j++) for (let k = 0; k < Slots.REEL_LENGTH; k++) all.push([i, j, k]);
  const sevens = all.filter((ps) => Slots.evaluate(ps, 1).rank === Slots.PAYOUT.SEVEN || Slots.evaluate(ps, 1).payout === 300);
  assert(sevens.length && sevens.every((ps) => Slots.evaluate(ps, 1).payout === 300), "three 7s in the middle pay 300");
  assert(all.some((ps) => Slots.evaluate(ps, 1).payout === 2), "a cherry pays 2");
  assert(all.every((ps) => Slots.evaluate(ps, 3).payout >= Slots.evaluate(ps, 1).payout), "more lines never pay less");
}

// Goldenrod's Game Corner: Voltorb Flip (ui/voltorb-flip.js, HGSS's src/voltorb_flip)
// at Mr. Game's table, and the prize counters' menus (tools/build-voltorb-flip.js).
{
  const VF = require("../ui/voltorb-flip.js").logic;
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const g = VF.create(rand);
  for (let round = 0; round < 40; round++) {
    VF.newBoard(g);
    const [volts, twos, threes] = VF.CONFIGS[g.boardId], count = (t) => g.cards.filter((c) => c.type === t).length;
    assert(g.boardId >= (g.level - 1) * 10 && g.boardId < g.level * 10, "a board of its level");
    assert.deepStrictEqual([count(VF.VOLTORB), count(VF.TWO), count(VF.THREE)], [volts, twos, threes], "the board's cards");
    assert.strictEqual(g.maxPayout, Math.min(50000, 2 ** twos * 3 ** threes));
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(g.voltorbsRow[i], g.cards.filter((c, k) => Math.floor(k / 5) === i && c.type === VF.VOLTORB).length);
      assert.strictEqual(g.pointsCol[i], g.cards.filter((c, k) => k % 5 === i && c.type !== VF.VOLTORB).reduce((a, c) => a + c.type, 0));
    }
    // Every 2 and 3 flipped: cleared, and up a level (to 7; Lv. 8 from a win
    // there, or from Lv. 5 up after five rounds of 8 cards or more, none lost).
    const before = g.level;
    g.cards.forEach((c, i) => { if (c.type === VF.TWO || c.type === VF.THREE) VF.flip(g, i); });
    assert(VF.cleared(g) && g.payout === g.maxPayout, "all the 2s and 3s found");
    VF.endRound(g, VF.WON);
    const streak = before >= 5 && g.history.every((r) => r.flipped >= 8 && r.outcome !== VF.LOST);
    assert.strictEqual(VF.nextLevel(g), before === 8 || streak ? 8 : Math.min(7, before + 1));
  }
  // A Voltorb first: back to Lv. 1; from Lv. 5, three cards flipped first: Lv. 3.
  VF.newBoard(g); VF.flip(g, g.cards.findIndex((c) => c.type === VF.VOLTORB)); VF.endRound(g, VF.LOST);
  assert.strictEqual(VF.nextLevel(g), 1);
  const h = VF.create(rand);
  h.history[4] = { outcome: VF.LOST, flipped: 3, boardId: 45, level: 5 };
  assert.strictEqual(VF.nextLevel(h), 3);
  h.history[4] = { outcome: VF.QUIT, flipped: 5, boardId: 45, level: 5 };
  assert.strictEqual(VF.nextLevel(h), 5, "quitting with 5 flipped keeps Lv. 5");
  // The payout: the first number, then times each.
  const p = VF.create(rand); VF.newBoard(p);
  const nums = p.cards.map((c, i) => i).filter((i) => p.cards[i].type !== VF.VOLTORB).slice(0, 3);
  nums.forEach((i) => VF.flip(p, i));
  assert.strictEqual(p.payout, nums.reduce((a, i) => a * p.cards[i].type, 1));
  assert(fs.existsSync(path.join(root, "assets/voltorb-flip/board.png")) && fs.existsSync(path.join(root, "assets/voltorb-flip/sprites.png")));
  assert(/<script src="ui\/voltorb-flip\.js"><\/script>/.test(html));
  // The script commands: Mr. Game's table, the Coins window, MenuInit's menus.
  const scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
  for (const op of ["CasinoGame", "ScrCmd_116", "ScrCmd_117", "MenuInit", "GetItemPocket", "BufferPocketName"]) assert(scriptJs.includes('case "' + op + '"'), op);
  const menus = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "tools/lib/johto-game-corner.generated.js"), "utf8"), { window: { JOHTO_SCRIPTS: { messages: menus } } });
  assert.deepStrictEqual(["12", "13", "11"].map((n) => menus["menu:T25SP0101:" + n][0]), ["Technical Machine", "Held Items", "Cancel"]);
  assert(/^Abra\{CLEAR_TO \d+\}\{FONT_SMALL\}200 Coins$/.test(menus["menu:T25SP0101:24"][0]));
  assert(/^Substitute\{CLEAR_TO \d+\}\{FONT_SMALL\}2,000 Coins$/.test(menus["menu:T25SP0101:14"][0]));
  // (HGSS's TM90 is Substitute: this game's TM with that move, so the prize is too.)
  assert.strictEqual(Bag.machineMove("tm89"), "Substitute");
}

// Saffron City and Silph Co.
{
  // The four gates lead into Saffron City now.
  for (const [gate, x, y] of [["Route5_SouthEntrance", 4, 9], ["Route6_NorthEntrance", 4, 1], ["Route7_EastEntrance", 11, 5], ["Route8_WestEntrance", 1, 5]]) {
    assert.strictEqual(World.warpTarget(World.warpAt(gate, x, y)).map, "SaffronCity", gate + " leads into Saffron");
  }
  // Sabrina's Gym: stepping onto a warp pad warps you, as a pad, within the Gym.
  const pad = World.step({ map: "SaffronCity_Gym", x: 17, y: 20 }, "right");
  assert(pad.warp && pad.warp.pad && pad.warp.map === "SaffronCity_Gym", "Saffron Gym warp pad");
  assert(!World.step({ map: "SaffronCity", x: 33, y: 31 }, "up").warp.pad, "a door isn't a warp pad");
  // Silph Co.'s twenty card-key doors, each a pair of patches (shut and open).
  let doors = 0;
  for (let n = 2; n <= 11; n++) {
    const p = WORLD_MAPS["SilphCo_" + n + "F"].patches || {};
    const shut = Object.keys(p).filter((k) => /^close\d+$/.test(k));
    for (const k of shut) assert(p["open" + k.slice(5)] && p[k].collision.some((c) => c[2] === 1), "SilphCo_" + n + "F " + k);
    doors += shut.length;
  }
  assert.strictEqual(doors, 20);
  assert.strictEqual(WORLD_MAPS.SilphCo_Elevator.warps[0].mapConst, "MAP_DYNAMIC");
  // Items: the Card Key on 5F, and FireRed's TM01 (Focus Punch) as TM105.
  assert(WORLD_MAPS.SilphCo_5F.people.some((p) => p.item === "card-key") && WORLD_MAPS.SilphCo_5F.people.some((p) => p.item === "tm105"));
  assert.strictEqual(Bag.machineMove("tm105"), "Focus Punch");
  assert(ITEMS["card-key"] && ITEMS["master-ball"] && ITEMS["poke-doll"]);
  // Sabrina, the rival on 7F, Giovanni on 11F; the Saffron Center; Fly to Saffron.
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_SABRINA.party.map((m) => m.species), ["Kadabra", "Mr. Mime", "Venomoth", "Alakazam"]);
  assert(WORLD_TRAINERS.TRAINER_RIVAL_SILPH_SQUIRTLE && WORLD_TRAINERS.TRAINER_BOSS_GIOVANNI_2);
  assert(Player.CENTERS.SaffronCity_PokemonCenter_1F && window.TOWN_MAP.fly.SAFFRON_CITY.center === "SaffronCity_PokemonCenter_1F");
}

// Routes 12-15, Fuchsia City and the Safari Zone
{
  // The Safari Game's numbers (engine/safari.js, FireRed's): catch factor =
  // catch rate x 100 / 1275, escape factor = Safari flee rate x 100 / 1275 (at least 2).
  assert.deepStrictEqual([Safari.ENTRY_FEE, Safari.BALLS, Safari.STEPS], [500, 30, 600]);
  const chansey = Safari.encounter("Chansey");
  assert.deepStrictEqual([chansey.catchFactor, chansey.escapeFactor, chansey.bait, chansey.rock], [2, 9, 0, 0]);
  assert.strictEqual(Safari.encounter("Rhyhorn").escapeFactor, 5);
  assert.strictEqual(Safari.encounter("Venonat").escapeFactor, 3);
  assert.strictEqual(Safari.encounter("Pidgey").escapeFactor, 2, "no flee rate: 2");
  // Watching: 9 x 5 = 45%; angry (a Rock): doubled, at most 20 -> 90%; eating (Bait): a quarter -> 10%.
  assert.strictEqual(Safari.fleeChance(chansey), 45);
  assert.strictEqual(Safari.fleeChance(Object.assign({}, chansey, { rock: 3 })), 90);
  assert.strictEqual(Safari.fleeChance(Object.assign({}, chansey, { bait: 3 })), 10);
  assert.strictEqual(Safari.fleeChance(Object.assign(Safari.encounter("Pidgey"), { bait: 2 })), 5, "a quarter of 2 is 0: at least 1");
  // A Rock doubles the catch factor (at most 20) for 2-6 turns and ends the eating;
  // Bait halves it (at least 3) and ends the anger.
  const rng = mulberry32(7);
  const s = Safari.encounter("Kangaskhan");   // catch rate 45: factor 3
  assert.strictEqual(s.catchFactor, 3);
  Safari.throwRock(s, rng);
  assert(s.catchFactor === 6 && s.rock >= 2 && s.rock <= 6 && s.bait === 0);
  for (let i = 0; i < 5; i++) Safari.throwRock(s, rng);
  assert(s.catchFactor === 20 && s.rock === 6, "a Rock: at most 20, at most 6 turns");
  Safari.throwBait(s, rng);
  assert(s.catchFactor === 10 && s.rock === 0 && s.bait >= 2 && s.bait <= 6);
  for (let i = 0; i < 5; i++) Safari.throwBait(s, rng);
  assert(s.catchFactor === 3 && s.bait === 6, "Bait: at least 3");
  assert.strictEqual(Safari.throwBait(Object.assign(Safari.encounter("Chansey")), rng), undefined);
  const c2 = Safari.encounter("Chansey"); Safari.throwBait(c2, rng);
  assert.strictEqual(c2.catchFactor, 3, "Chansey's factor of 2 halves to 1: raised to 3");
  // Watching wears the anger or eating off a turn at a time; the anger gone,
  // the catch factor is the species' own again.
  const w = Object.assign(Safari.encounter("Kangaskhan"), { rock: 2, catchFactor: 12 });
  assert.strictEqual(Safari.watch(w), "angry");
  assert.strictEqual(Safari.watch(w), "watching");
  assert.strictEqual(w.catchFactor, 3);
  const e = Object.assign(Safari.encounter("Kangaskhan"), { bait: 2, catchFactor: 3 });
  assert.deepStrictEqual([Safari.watch(e), Safari.watch(e), Safari.watch(e)], ["eating", "watching", "watching"]);
  // A Safari Ball (x1.5) at full HP: Chansey's catch rate 25 -> odds 12; each
  // shake passes below 1048560 / sqrt(sqrt(16711680 / 12)) = 30840 of 65536.
  const full = { hp: 100, maxhp: 100, status: "" };
  assert.strictEqual(Safari.odds(chansey, full), 12);
  assert.strictEqual(Safari.shakeOdds(12), 30840);
  assert(Math.abs(Safari.chance(chansey, full) - Math.pow(30840 / 65536, 4)) < 1e-12);
  assert.strictEqual(Safari.odds(Object.assign({}, chansey, { catchFactor: 20 }), full), 127);
  assert.deepStrictEqual(Safari.attempt(Object.assign({}, chansey, { catchFactor: 20 }), { hp: 1, maxhp: 100, status: "slp" }, rng), { caught: true, shakes: 4 });
  let caught = 0;
  for (let i = 0; i < 20000; i++) if (Safari.attempt(chansey, full, rng).caught) caught++;
  assert(Math.abs(caught / 20000 - Safari.chance(chansey, full)) < 0.01, "Safari Ball catches as often as its odds say");

  // A Safari battle: no one comes out, and each turn is a throw (or running);
  // the balls run out and it's game over.
  const mon = (sp) => Party.toBattleSet(Party.create(sp, 30, { rng }));
  let outcomes = {};
  for (let seed = 1; seed <= 300; seed++) {
    const b = new Battle({ seed, wild: true, safari: { balls: 3 }, p1: { name: "A", team: [mon("Pikachu")] }, p2: { name: "Wild", team: [mon("Tauros")] } });
    b.start();
    assert(!b.events.some((ev) => ev[0] === "-ability"), "no Ability stirs (Intimidate) in the Safari Zone");
    for (let turn = 0; turn < 50 && !b.ended; turn++) {
      const req = b.getRequest("p1");
      assert(req.safari && req.safari.balls === b.safari.balls);
      const pick = ["ball", "ball", "rock", "bait"][turn % 4];
      assert(b.choose("p1", { type: pick }).ok);
    }
    assert(b.ended);
    const out = b.caught ? "caught" : b.safariOut ? "noballs" : b.fled ? "fled" : "?";
    assert.notStrictEqual(out, "?");
    if (out === "noballs") assert(b.safari.balls === 0 && b.events.some((ev) => ev[0] === "-safariout"));
    if (out === "caught") assert(b.events.some((ev) => ev[0] === "caught" && ev[2] === "safari-ball"));
    assert(!b.events.some((ev) => ev[0] === "-exp"), "no Exp. in the Safari Zone");
    assert(!b.events.some((ev) => ev[0] === "move"), "no moves in the Safari Zone");
    outcomes[out] = (outcomes[out] || 0) + 1;
  }
  assert(outcomes.caught && outcomes.noballs && outcomes.fled, "Safari battles end all three ways: " + JSON.stringify(outcomes));
  const ran = new Battle({ seed: 3, wild: true, safari: { balls: 30 }, p1: { name: "A", team: [mon("Pikachu")] }, p2: { name: "Wild", team: [mon("Chansey")] } });
  ran.start();
  if (!ran.ended) { ran.choose("p1", { type: "run" }); assert(ran.escaped && ran.ended, "running from a Safari battle always works"); }
  assert(!ran.choose("p1", { type: "move", move: 0 }).ok);

  // The maps: Route 12 joins Lavender Town and Route 11; Routes 13-15 lead to
  // Fuchsia City (and Route 19, the sea, south of it).
  const conn = (m, dir) => (WORLD_MAPS[m].connections.find((c) => c.direction === dir) || {}).map;
  assert.deepStrictEqual([conn("LavenderTown", "down"), conn("Route11", "right"), conn("Route12", "down"), conn("Route13", "left"),
    conn("Route14", "left"), conn("Route15", "left")], ["Route12", "Route12", "Route13", "Route14", "Route15", "FuchsiaCity"]);
  assert.strictEqual(conn("FuchsiaCity", "down"), "Route19");
  // The Snorlax on Route 12; FireRed's TM48 (Skill Swap) there is the new TM106.
  assert(WORLD_MAPS.Route12.people.some((p) => p.script === "Route12_EventScript_Snorlax" && p.flag === "FLAG_HIDE_ROUTE_12_SNORLAX"));
  assert(WORLD_MAPS.Route12.people.some((p) => p.item === "tm106") && Bag.machineMove("tm106") === "Skill Swap");
  // The Safari Zone: its four areas' wild Pokémon, the Gold Teeth, the Secret House.
  for (const a of ["Center", "East", "North", "West"]) assert(WORLD_MAPS["SafariZone_" + a].wild.slots.length === 12, a);
  assert(WORLD_MAPS.SafariZone_West.people.some((p) => p.item === "gold-teeth") && Bag.isKeyItem("gold-teeth"));
  assert.strictEqual(World.warpTarget(World.warpAt("SafariZone_West", 12, 7)).map, "SafariZone_SecretHouse");
  // Koga's Gym; the Fuchsia Center; Fly to Fuchsia.
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_KOGA.party.map((m) => m.species), ["Koffing", "Muk", "Koffing", "Weezing"]);
  assert(Player.CENTERS.FuchsiaCity_PokemonCenter_1F && window.TOWN_MAP.fly.FUCHSIA_CITY.center === "FuchsiaCity_PokemonCenter_1F");
  assert(FieldMoves.info("Surf").badge === "soul" && FieldMoves.hmFor("Surf") === "hm03" && FieldMoves.hmFor("Strength") === "hm04");
}

// ---------- Routes 16-18: Cycling Road ----------
{
  const conn = (m, dir) => (WORLD_MAPS[m].connections.find((c) => c.direction === dir) || {}).map;
  // Celadon's west edge is Route 16; Routes 16, 17 and 18 run south to Fuchsia's west edge.
  assert.deepStrictEqual([conn("CeladonCity", "left"), conn("Route16", "right"), conn("Route16", "down"), conn("Route17", "down"),
    conn("Route18", "right"), conn("FuchsiaCity", "left")], ["Route16", "CeladonCity", "Route17", "Route18", "FuchsiaCity", "Route18"]);
  const west = World.step({ map: "FuchsiaCity", x: 0, y: 19 }, "left"), east = World.step({ map: "CeladonCity", x: 0, y: 23 }, "left");
  assert(east.ok && east.map === "Route16" && east.y === 13, "Celadon's west edge leads onto Route 16");
  assert(west.ok && west.map === "Route18", "Fuchsia's west edge leads onto Route 18");
  // Both gates, both floors; the secret house; the second Snorlax and the Leftovers under it.
  assert.strictEqual(World.warpTarget(World.warpAt("Route16", 20, 13)).map, "Route16_NorthEntrance_1F");
  assert.strictEqual(World.warpTarget(World.warpAt("Route16_NorthEntrance_1F", 9, 16)).map, "Route16_NorthEntrance_2F");
  assert.strictEqual(World.warpTarget(World.warpAt("Route18", 41, 9)).map, "Route18_EastEntrance_1F");
  assert.strictEqual(World.warpTarget(World.warpAt("Route18_EastEntrance_1F", 9, 10)).map, "Route18_EastEntrance_2F");
  assert.strictEqual(World.warpTarget(World.warpAt("Route16", 10, 5)).map, "Route16_House");
  assert(WORLD_MAPS.Route16.people.some((p) => p.script === "Route16_EventScript_Snorlax" && p.flag === "FLAG_HIDE_ROUTE_16_SNORLAX"));
  assert(WORLD_MAPS.Route16.people.some((p) => p.script === "EventScript_CutTree"));
  assert(WORLD_MAPS.Route16.hidden.some((h) => h.item === "leftovers" && h.x === 31 && h.y === 13));
  assert(FieldMoves.hmFor("Fly") === "hm02" && FieldMoves.info("Fly").badge === "thunder");
  // The guards' triggers: a column across each gate's Cycling Road side.
  for (const g of ["Route16_NorthEntrance_1F", "Route18_EastEntrance_1F"]) {
    const t = WORLD_MAPS[g].triggers.filter((t) => /NeedBikeTrigger/.test(t.script));
    assert.strictEqual(t.length, 5, g);
    assert(t.every((x) => x.x === 6));
    assert(WORLD_MAPS[g].cycling, g + " allows the Bicycle");
  }
  // Route 17 is the slope: most of it pulls you down.
  const pull = WORLD_MAPS.Route17.behavior.filter(World.isPullDown).length;
  assert(pull > 1000, "Route 17's slope: " + pull);
  assert(World.isPullDown(World.MB.CYCLING_ROAD_PULL_DOWN_GRASS) && World.isGrass({ behavior: World.MB.CYCLING_ROAD_PULL_DOWN_GRASS }));
  // On the slope: coasting south fast with nothing (or down) pressed; another
  // way pedals that way at walking pace; B holds you still.
  assert.deepStrictEqual(World.slopeMove(null, false), { dir: "down", speed: 4, downhill: true });
  assert.deepStrictEqual(World.slopeMove("down", false), { dir: "down", speed: 4, downhill: true });
  assert.deepStrictEqual(World.slopeMove("up", false), { dir: "up", speed: 1, downhill: false });
  assert.deepStrictEqual(World.slopeMove("left", false), { dir: "left", speed: 1, downhill: false });
  assert.strictEqual(World.slopeMove(null, true), null);
  assert.deepStrictEqual(World.slopeMove("down", true), { dir: "down", speed: 1, downhill: false });
  // Coasting from the top of Route 17 a step at a time ends up on Route 18 (the slope runs out at the bottom).
  {
    const R = WORLD_MAPS.Route17;
    let x = -1;
    for (let i = 0; i < R.width && x < 0; i++) if (World.isPullDown(R.behavior[i]) && !R.collision[i]) x = i;
    let pos = { map: "Route17", x, y: 0 }, steps = 0;
    while (World.isPullDown(World.blockAt(pos.map, pos.x, pos.y).behavior) && steps < 400) {
      const s = World.slopeMove(null, false), r = World.step(pos, s.dir);
      if (!r.ok) break;
      pos = { map: r.map, x: r.x, y: r.y }; steps++;
    }
    assert(steps > 100, "coasted " + steps + " tiles down Cycling Road from x=" + x);
  }
  // The trainers: Bikers and Cue Balls; Haden's trade.
  const classes = new Set(["Route16", "Route17", "Route18"].flatMap((m) => WORLD_MAPS[m].people.filter((p) => p.trainer && p.trainer.id)
    .map((p) => WORLD_TRAINERS[p.trainer.id].className)));
  for (const c of ["Biker", "Cue Ball", "Bird Keeper", "Young Couple"]) assert(classes.has(c), c);
  assert.strictEqual(Player.prizeMoney("Cue Ball Koji", [{ level: 28 }]), 24 * 28);
  assert(WORLD_MAPS.Route18_EastEntrance_2F.people.some((p) => p.script === "Route18_EastEntrance_2F_EventScript_Haden"));
  assert(WORLD_MAPS.Route17.hidden.length === 5);
}

// ---------- Routes 19-21, the Seafoam Islands, Cinnabar Island ----------
{
  const conn = (m, dir) => (WORLD_MAPS[m].connections.find((c) => c.direction === dir) || {}).map;
  // The sea routes: Fuchsia south to Route 19, west along Route 20 to Cinnabar,
  // and Route 21 north to Pallet Town.
  assert.deepStrictEqual([conn("FuchsiaCity", "down"), conn("Route19", "left"), conn("Route20", "left"), conn("CinnabarIsland", "up"),
    conn("Route21_South", "up"), conn("Route21_North", "up"), conn("PalletTown", "down")],
  ["Route19", "Route20", "CinnabarIsland", "Route21_South", "Route21_North", "PalletTown", "Route21_North"]);
  assert(WORLD_MAPS.Route19.water && WORLD_MAPS.Route21_North.water && WORLD_MAPS.Route20.water, "surfing Pokémon on the sea routes");
  assert(WORLD_MAPS.SeafoamIslands_B4F.people.some((p) => p.script === "SeafoamIslands_B4F_EventScript_Articuno" && p.flag === "FLAG_HIDE_ARTICUNO"));
  // A map with some of its patches on (as ui/game.js applyPatches does).
  const patched = (name, on) => {
    const m = WORLD_MAPS[name], collision = m.collision.slice(), behavior = m.behavior.slice();
    for (const p of on) for (const [x, y, c, b] of m.patches[p].collision) { collision[y * m.width + x] = c; behavior[y * m.width + x] = b; }
    return { at: (x, y) => ({ collision: collision[y * m.width + x], behavior: behavior[y * m.width + x] }) };
  };

  // Seafoam's boulders: the holes they drop through, and the boulder each one
  // turns into on the floor below (FireRed's reveal flags).
  const { MB } = World;
  for (const [m, x, y] of [["SeafoamIslands_1F", 21, 8], ["SeafoamIslands_1F", 30, 8], ["SeafoamIslands_B1F", 23, 8], ["SeafoamIslands_B1F", 28, 8],
    ["SeafoamIslands_B2F", 24, 8], ["SeafoamIslands_B2F", 27, 8], ["SeafoamIslands_B3F", 6, 18], ["SeafoamIslands_B3F", 9, 18]]) {
    assert.strictEqual(World.blockAt(m, x, y).behavior, MB.FALL_WARP, m + " hole at " + x + "," + y);
  }
  const boulder = (m, flag) => WORLD_MAPS[m].people.find((p) => p.flag === flag);
  const B = Seafoam.BOULDER;
  assert.strictEqual(boulder("SeafoamIslands_1F", B("1F", 1)).reveal, B("B1F", 1));
  assert.strictEqual(boulder("SeafoamIslands_B2F", B("B2F", 2)).reveal, B("B3F", 2));
  assert.strictEqual(boulder("SeafoamIslands_B3F", B("B3F", 3)).reveal, B("B4F", 1));
  assert(!boulder("SeafoamIslands_B3F", B("B3F", 4)).reveal, "B3F's other boulders are only in the way");
  assert(!WORLD_MAPS.SeafoamIslands_1F.people.some((p) => p.trainer), "boulders aren't trainers");
  // A boulder pushed into a hole: it's gone, and the one below appears.
  const f = {};
  assert(!Seafoam.hidden(f, B("1F", 1)) && Seafoam.hidden(f, B("B1F", 1)) && !Seafoam.hidden(f, B("B3F", 3)) && Seafoam.hidden(f, B("B4F", 2)));
  for (const [m, fl] of [["SeafoamIslands_1F", "1F"], ["SeafoamIslands_B1F", "B1F"], ["SeafoamIslands_B2F", "B2F"]]) {
    for (const n of [1, 2]) Seafoam.drop(f, boulder(m, B(fl, n)));
  }
  assert(Seafoam.hidden(f, B("1F", 1)) && Seafoam.hidden(f, B("B2F", 2)) && !Seafoam.hidden(f, B("B3F", 1)) && !Seafoam.hidden(f, B("B3F", 2)));
  // B3F's current: until you come back in with both boulders down, it runs,
  // and falling in from B2F rides it down to B4F (FireRed's moves, then the warp).
  const W = (m) => WORLD_MAPS[m];
  assert.strictEqual(World.currentStep({ map: "SeafoamIslands_B3F", x: 23, y: 9 }).dir, "down");
  const ride = Seafoam.fallRide({}, "SeafoamIslands_B3F", 23);
  assert.deepStrictEqual(ride.warp, { map: "SeafoamIslands_B4F", x: 27, y: 21 });
  let pos = { x: 23, y: 9 };
  for (const mv of ride.moves) {
    const [dx, dy] = World.DIRS[/(up|down|left|right)$/.exec(mv)[1]];
    pos = { x: pos.x + dx, y: pos.y + dy };
    assert(World.isSurfable(W("SeafoamIslands_B3F").behavior[pos.y * 38 + pos.x]), "the ride stays on the water at " + JSON.stringify(pos));
  }
  assert.deepStrictEqual(Seafoam.patches(f, "SeafoamIslands_B3F"), []);
  Seafoam.transition(f, "SeafoamIslands_B3F");
  assert(Seafoam.stopped(f, "B3F") && Seafoam.fallRide(f, "SeafoamIslands_B3F", 23) === null, "both boulders down: the current's stopped");
  assert.deepStrictEqual(Seafoam.patches(f, "SeafoamIslands_B3F"), ["stopped"]);
  const b3f = patched("SeafoamIslands_B3F", ["stopped"]);
  assert(!World.currentDir(b3f.at(23, 9).behavior) && World.isSurfable(b3f.at(23, 9).behavior), "calm water where the current ran");
  // B4F: B3F's own two boulders drop through its holes; its current stops too.
  Seafoam.route20(f);
  assert(Seafoam.hidden(f, B("1F", 1)) && !Seafoam.hidden(f, B("B3F", 2)), "B3F's current stopped: Route 20 leaves its boulders be");
  assert(!Seafoam.hidden(f, B("B3F", 1)) && !Seafoam.hidden(f, B("B3F", 3)) && Seafoam.hidden(f, B("B4F", 1)));
  const fall = Seafoam.fallRide(f, "SeafoamIslands_B4F", 8);
  assert.strictEqual(fall.dismount, "up");
  pos = { x: 8, y: 17 };
  for (const mv of fall.moves) { const [dx, dy] = World.DIRS[/(up|down|left|right)$/.exec(mv)[1]]; pos = { x: pos.x + dx, y: pos.y + dy }; }
  assert.deepStrictEqual(pos, { x: 12, y: 13 });
  assert(!W("SeafoamIslands_B4F").collision[12 * 38 + 12] && !World.isSurfable(W("SeafoamIslands_B4F").behavior[12 * 38 + 12]), "climbing out onto the shore");
  for (const n of [3, 5]) Seafoam.drop(f, boulder("SeafoamIslands_B3F", B("B3F", n)));
  assert(!Seafoam.hidden(f, B("B4F", 1)) && !Seafoam.hidden(f, B("B4F", 2)));
  assert.deepStrictEqual(Seafoam.patches(f, "SeafoamIslands_B4F"), ["calm"], "calm water by the stairs before the current's stopped");
  Seafoam.transition(f, "SeafoamIslands_B4F");
  assert.deepStrictEqual(Seafoam.patches(f, "SeafoamIslands_B4F"), ["stopped", "calm"]);
  assert(!World.currentDir(patched("SeafoamIslands_B4F", ["stopped"]).at(8, 17).behavior));
  // Route 20 puts the boulders back only while a current still runs.
  const g = {};
  Seafoam.drop(g, boulder("SeafoamIslands_1F", B("1F", 1)));
  Seafoam.route20(g);
  assert(!Seafoam.hidden(g, B("1F", 1)) && Seafoam.hidden(g, B("B1F", 1)), "back up on 1F");
  // Currents carry you their way while surfing, until something's in the way.
  assert.deepStrictEqual([0x50, 0x51, 0x52, 0x53].map(World.currentDir), ["right", "left", "up", "down"]);
  assert.strictEqual(World.currentStep({ map: "SeafoamIslands_B4F", x: 27, y: 19 }).dir, "up");
  assert.strictEqual(World.currentStep({ map: "SeafoamIslands_B4F", x: 4, y: 1 }), null, "into the wall: you're free to move");

  // The Pokémon Mansion's switch: one for the whole house, its doors swapped on every floor.
  for (const fl of ["1F", "2F", "3F", "B1F"]) assert(W("PokemonMansion_" + fl).patches.pressed, fl);
  const m1 = patched("PokemonMansion_1F", ["pressed"]), base1 = patched("PokemonMansion_1F", []);
  assert(base1.at(22, 10).collision && !m1.at(22, 10).collision, "pressed: the door at 22,10 opens");
  assert(!base1.at(31, 18).collision && m1.at(31, 18).collision, "pressed: the one at 31,18 shuts");
  assert(W("PokemonMansion_B1F").people.some((p) => p.item === "secret-key") && Bag.isKeyItem("secret-key"));
  assert(W("PokemonMansion_B1F").people.some((p) => p.item === "tm14") && Bag.machineMove("tm14") === "Blizzard");
  assert(W("PokemonMansion_B1F").people.some((p) => p.item === "tm22") && Bag.machineMove("tm22") === "Solar Beam");

  // Cinnabar: the Gym's six quiz doors, Blaine, and the locked door outside.
  assert.deepStrictEqual(Object.keys(W("CinnabarIsland_Gym").patches).sort(), ["door1", "door2", "door3", "door4", "door5", "door6"]);
  const gym = patched("CinnabarIsland_Gym", ["door1"]);
  assert(patched("CinnabarIsland_Gym", []).at(26, 9).collision && !gym.at(26, 9).collision, "quiz 1 opens its door");
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_BLAINE.party.map((m) => m.species), ["Growlithe", "Ponyta", "Rapidash", "Arcanine"]);
  assert.strictEqual(Bag.machineMove("tm38"), "Fire Blast");
  assert(W("CinnabarIsland").triggers.some((t) => t.script === "CinnabarIsland_EventScript_GymDoorLocked" && t.x === 20 && t.y === 5));
  for (const id of ["TRAINER_BURGLAR_QUINN", "TRAINER_SUPER_NERD_AVERY", "TRAINER_BURGLAR_RAMON", "TRAINER_SUPER_NERD_DEREK",
    "TRAINER_BURGLAR_DUSTY", "TRAINER_SUPER_NERD_ZAC"]) assert(W("CinnabarIsland_Gym").people.some((p) => p.trainer && p.trainer.id === id), id);
  assert.strictEqual(Player.prizeMoney("Burglar Quinn", [{ level: 36 }]), 88 * 36);
  assert(Player.CENTERS.CinnabarIsland_PokemonCenter_1F && window.TOWN_MAP.fly.CINNABAR_ISLAND.center === "CinnabarIsland_PokemonCenter_1F");
  assert.deepStrictEqual(W("CinnabarIsland_Mart").people.find((p) => p.mart).mart,
    ["ultra-ball", "great-ball", "hyper-potion", "revive", "full-heal", "escape-rope", "max-repel"]);

  // The Power Plant: in from Route 10, Zapdos, and the two "item balls" that are Electrode.
  assert(W("Route10").warps.filter((w) => w.map === "PowerPlant").length === 2);
  assert(W("PowerPlant").people.some((p) => p.script === "PowerPlant_EventScript_Zapdos" && p.flag === "FLAG_HIDE_ZAPDOS"));
  for (const n of [1, 2]) {
    const e = W("PowerPlant").people.find((p) => p.script === "PowerPlant_EventScript_Electrode" + n);
    assert(e && e.sprite === "item_ball" && !e.item, "Electrode " + n + " looks like an item ball");
  }
  assert.deepStrictEqual(["tm17", "tm25"].map((t) => W("PowerPlant").people.some((p) => p.item === t)), [true, true]);
  assert.deepStrictEqual([Bag.machineMove("tm17"), Bag.machineMove("tm25")], ["Protect", "Thunder"]);

  // Viridian Gym: locked until the Cascade to Volcano Badges (FireRed doesn't
  // check the Boulder Badge); its spin tiles; Giovanni's team and TM26 Earthquake.
  const seven = ["cascade", "thunder", "rainbow", "soul", "marsh", "volcano"];
  assert(LeagueRoad.gymOpen(seven) && !LeagueRoad.gymOpen(["boulder"].concat(seven.slice(0, 5))) && LeagueRoad.gymOpen(["boulder"].concat(seven)));
  assert([MB.SPIN_RIGHT, MB.SPIN_LEFT, MB.SPIN_UP, MB.SPIN_DOWN, MB.STOP_SPINNING].every((b) => W("ViridianCity_Gym").behavior.includes(b)), "spin tiles");
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_LEADER_GIOVANNI.party.map((m) => m.species + m.level), ["Rhyhorn45", "Dugtrio42", "Nidoqueen44", "Nidoking45", "Rhyhorn50"]);
  assert(Bag.machines().some((m) => Bag.machineMove(m) === "Earthquake"));
  assert.strictEqual(W("ViridianCity_Gym").people.filter((p) => p.trainer && !/LEADER/.test(p.trainer.id)).length, 8);

  // Route 22's late rival trigger, and Route 23: the gate, seven guards (one
  // Badge each, in order), Victory Road and the Indigo Plateau north.
  assert(W("Route22").triggers.some((t) => t.script === "Route22_EventScript_LateRivalTriggerBottom" && t.x === 33 && t.y === 6));
  const guards = W("Route23").people.filter((p) => /BadgeGuard$/.test(p.script)).map((p) => p.script.replace(/^Route23_EventScript_|BadgeGuard$/g, ""));
  assert.deepStrictEqual(guards, LeagueRoad.NAMES.slice(1));
  const fl = {}, badges = [];
  assert(LeagueRoad.guardStops(fl, 1) && !LeagueRoad.guardStops(fl, 2), "only the gate's guard, first");
  assert(!LeagueRoad.show(fl, badges, 1) && LeagueRoad.guardStops(fl, 1), "no Boulder Badge: stopped");
  for (let k = 1; k <= 8; k++) {
    badges.push(LeagueRoad.BADGES[k - 1]);
    assert(LeagueRoad.guardStops(fl, k) && LeagueRoad.show(fl, badges, k) && !LeagueRoad.guardStops(fl, k), "guard " + k);
    if (k < 8) assert(LeagueRoad.guardStops(fl, k + 1), "the next guard stops you");
  }
  assert.strictEqual(LeagueRoad.scene({ route23Guard: true }), 1, "an older save's gate guard");
  assert.deepStrictEqual([W("Route23").connections.find((c) => c.direction === "up").map, W("Route23").warps.slice(0, 2).map((w) => w.map)],
    ["IndigoPlateau_Exterior", ["VictoryRoad_1F", "VictoryRoad_2F"]]);

  // Victory Road: a boulder on a floor switch opens that floor's rock barrier
  // (patches up until then); Route 23 puts them back.
  assert.deepStrictEqual([1, 2, 3].map((n) => Object.keys(W("VictoryRoad_" + n + "F").patches).sort()), [["barrier"], ["barrier1", "barrier2"], ["barrier"]]);
  assert(patched("VictoryRoad_1F", ["barrier"]).at(12, 14).collision && !patched("VictoryRoad_1F", []).at(12, 14).collision);
  for (const [m, x, y] of [["VictoryRoad_1F", 20, 16], ["VictoryRoad_2F", 2, 19], ["VictoryRoad_2F", 14, 19], ["VictoryRoad_3F", 7, 7]]) {
    assert.strictEqual(World.blockAt(m, x, y).behavior, MB.STRENGTH_BUTTON, m + " switch");
    assert(W(m).triggers.some((t) => t.x === x && t.y === y && /FloorSwitch/.test(t.script)));
  }
  const vr = {}, sw = (m, x, y) => W(m).triggers.find((t) => t.x === x && t.y === y);
  const names = (m) => Object.keys(W(m).patches);
  assert.deepStrictEqual(LeagueRoad.barriers(vr, "VictoryRoad_2F", names("VictoryRoad_2F")), ["barrier1", "barrier2"]);
  assert(LeagueRoad.pressSwitch(vr, "VictoryRoad_2F", sw("VictoryRoad_2F", 14, 19)) && !LeagueRoad.pressSwitch(vr, "VictoryRoad_2F", sw("VictoryRoad_2F", 14, 19)));
  assert.deepStrictEqual(LeagueRoad.barriers(vr, "VictoryRoad_2F", names("VictoryRoad_2F")), ["barrier1"]);
  assert(LeagueRoad.pressSwitch(vr, "VictoryRoad_1F", sw("VictoryRoad_1F", 20, 16)));
  assert.deepStrictEqual(LeagueRoad.barriers(vr, "VictoryRoad_1F", names("VictoryRoad_1F")), []);
  assert.strictEqual(World.blockAt("VictoryRoad_3F", 34, 18).behavior, MB.FALL_WARP);
  assert.strictEqual(boulder("VictoryRoad_3F", "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER").reveal, "FLAG_HIDE_VICTORY_ROAD_2F_BOULDER");
  LeagueRoad.dropBoulder(vr);
  assert(LeagueRoad.dropped(vr));
  LeagueRoad.reset(vr);
  assert(!LeagueRoad.dropped(vr) && LeagueRoad.barriers(vr, "VictoryRoad_1F", names("VictoryRoad_1F")).length === 1);
  assert.deepStrictEqual(["tm02", "tm07", "tm37", "tm50"].map(Bag.machineMove), ["Dragon Claw", "Hail", "Sandstorm", "Overheat"]);
  assert(W("VictoryRoad_3F").people.filter((p) => p.trainer && p.trainer.id === "TRAINER_COOL_COUPLE_RAY_TYRA").every((p) => p.trainer.double));
  assert.strictEqual(Player.prizeMoney("Cool Couple Ray & Tyra", [{ level: 45 }], "Cool Couple"), 24 * 45);

  // The Indigo Plateau: its Pokémon Center (respawn, Fly spot, the Mart),
  // and the door at the back to the Elite Four.
  const ic = W("IndigoPlateau_PokemonCenter_1F"), ispot = Player.CENTERS.IndigoPlateau_PokemonCenter_1F;
  assert(!ic.collision[ispot.y * ic.width + ispot.x] && window.TOWN_MAP.fly.INDIGO_PLATEAU.center === "IndigoPlateau_PokemonCenter_1F");
  assert.deepStrictEqual(ic.people.find((p) => p.mart).mart, ["ultra-ball", "great-ball", "full-restore", "max-potion", "revive", "full-heal", "max-repel"]);
  { const r = World.step({ map: "IndigoPlateau_PokemonCenter_1F", x: 4, y: 2 }, "up"); assert.strictEqual(r.warp.map + " " + r.warp.x + "," + r.warp.y, "PokemonLeague_LoreleisRoom 6,12"); }

  // The Pokémon League: the rooms in FireRed's order, each one's door on to
  // the next and back, and the Hall of Fame past the Champion's room.
  const rooms = League.ROOMS.map((r) => r.map);
  assert.deepStrictEqual(rooms, ["PokemonLeague_LoreleisRoom", "PokemonLeague_BrunosRoom", "PokemonLeague_AgathasRoom",
    "PokemonLeague_LancesRoom", "PokemonLeague_ChampionsRoom"]);
  rooms.slice(0, -1).forEach((m, k) => assert.strictEqual(W(m).warps[1].map, rooms[k + 1], m + " leads on"));
  assert.strictEqual(W("PokemonLeague_ChampionsRoom").warps[1].map, League.HALL_OF_FAME);
  for (const [m, x, y] of [["PokemonLeague_LoreleisRoom", 6, 2], ["PokemonLeague_AgathasRoom", 6, 2], ["PokemonLeague_LancesRoom", 6, 5]]) {
    assert(patched(m, []).at(x, y).collision && !patched(m, ["door"]).at(x, y).collision, m + "'s door: shut until opened");
  }
  // (The way in is shut to walking anyway: the scene walks you in. Closed, it looks it.)
  rooms.slice(0, 4).forEach((m) => assert(W(m).patches.closed && W(m).patches.door, m + "'s patches"));
  assert(!patched("PokemonLeague_LancesRoom", []).at(6, 15).collision && patched("PokemonLeague_LancesRoom", ["closed"]).at(6, 15).collision);
  assert(["lorelei", "bruno", "agatha", "lance"].every((n) => fs.existsSync(path.join(root, "assets/sprites/trainers/front/elite_four_" + n + ".png"))));
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_ELITE_FOUR_LORELEI.party.map((m) => m.species + m.level), ["Dewgong52", "Cloyster51", "Slowbro52", "Jynx54", "Lapras54"]);
  assert.deepStrictEqual(WORLD_TRAINERS.TRAINER_ELITE_FOUR_LANCE.party.map((m) => m.species + m.level), ["Gyarados56", "Dragonair54", "Dragonair54", "Aerodactyl58", "Dragonite60"]);
  assert.deepStrictEqual(["BRUNO", "AGATHA", "LANCE"].map((n) => WORLD_TRAINERS["TRAINER_ELITE_FOUR_" + n].party.slice(-1)[0].item), ["sitrus-berry", "sitrus-berry", "sitrus-berry"]);
  assert.strictEqual(Player.prizeMoney("Elite Four Lance", [{ level: 60 }], "Elite Four"), 100 * 60);
  // The run: each room's entry scene once it's that room's turn, the way in
  // shut behind you, the door on once its trainer's beaten.
  const lf = {};
  assert(League.entryDue(lf, rooms[0]) && !League.entryDue(lf, rooms[1]));
  League.enter(lf, rooms[0]);
  assert.deepStrictEqual(League.patches(lf, rooms[0]), ["closed"]);
  assert(!League.entryDue(lf, rooms[0]) && League.entryDue(lf, rooms[1]));
  League.beat(lf, 0);
  assert.deepStrictEqual(League.patches(lf, rooms[0]), ["closed", "door"]);
  for (let k = 1; k < 4; k++) {
    League.enter(lf, rooms[k]);
    assert.deepStrictEqual(League.patches(lf, rooms[k]), ["closed"], rooms[k]);
    assert.deepStrictEqual(League.patches(lf, rooms[k - 1]), ["door"], rooms[k - 1] + " stays open behind");
    League.beat(lf, k);
  }
  assert(League.entryDue(lf, rooms[4]) && League.scene(lf) === 4);
  assert.strictEqual(League.trainerId(lf, 0), "TRAINER_ELITE_FOUR_LORELEI");
  assert.strictEqual(League.trainerId({ canLinkWithRS: true }, 3), "TRAINER_ELITE_FOUR_LANCE_2");
  assert(WORLD_TRAINERS.TRAINER_ELITE_FOUR_LANCE_2.party.length === 5);
  // Losing (or the Hall of Fame) starts it over from Lorelei.
  lf.TRAINER_ELITE_FOUR_BRUNO = true; lf.TRAINER_CHAMPION_FIRST_SQUIRTLE = true; lf.TRAINER_LEADER_BROCK = true;
  League.beat(lf, 4);
  assert(!League.entryDue(lf, rooms[4]));
  League.reset(lf);
  assert(League.entryDue(lf, rooms[0]) && League.entryDue(lf, rooms[4]) && !League.beaten(lf, 0) && League.patches(lf, rooms[0]).length === 0);
  assert(!lf.TRAINER_ELITE_FOUR_BRUNO && !lf.TRAINER_CHAMPION_FIRST_SQUIRTLE && lf.TRAINER_LEADER_BROCK, "only the League's trainers forgotten");
  // The Hall of Fame: game clear, and the team on record (up to 50, oldest dropped).
  const hf = {}, team = [Party.create("Charizard", 63, { rng }), Party.create("Pikachu", 55, { rng, nickname: "Sparky" })];
  team[0].ot = { name: "ASH", id: 12345 };
  const rec = League.record(hf, team, { name: "ASH", id: 12345, playTimeMs: 3600000 });
  assert(hf.gameClear && hf.hofCount === 1 && hf.hallOfFame.length === 1 && rec.number === 1);
  assert.deepStrictEqual(rec.team.map((m) => [m.species, m.level, m.nickname, m.ot.id]), [["Charizard", 63, null, 12345], ["Pikachu", 55, "Sparky", 12345]]);
  for (let i = 0; i < 60; i++) League.record(hf, team, { name: "ASH", id: 12345 });
  assert(hf.hallOfFame.length === League.MAX_TEAMS && hf.hallOfFame[0].number === 12 && hf.hofCount === 61);
  assert.strictEqual(JSON.parse(Player.serialize(Object.assign(Player.create("ASH"), { flags: hf }))).flags.hallOfFame.length, 50, "saved with the game");
  // The champion's room: Gary, and Prof. Oak (hidden until he comes in).
  const champ = W("PokemonLeague_ChampionsRoom");
  assert(champ.people.some((p) => p.localId === "LOCALID_CHAMPIONS_ROOM_RIVAL" && p.x === 6 && p.y === 8));
  assert(champ.people.some((p) => p.localId === "LOCALID_CHAMPIONS_ROOM_PROF_OAK" && p.flag === "FLAG_HIDE_OAK_IN_CHAMP_ROOM"));
  assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front/champion_rival.png")));
  for (const f of ["the_end", "confetti", "rival", "pokeball_charizard", "pikachu_2"]) assert(fs.existsSync(path.join(root, "assets/credits", f + ".png")), f);
  assert(W("PokemonLeague_HallOfFame").people.some((p) => p.localId === "LOCALID_HALL_OF_FAME_PROF_OAK"));
}

// Held items whose names end in "Ball" aren't Poké Balls.
for (const item of ["iron-ball", "light-ball", "smoke-ball"]) {
  assert(!Bag.isBall(item) && Bag.pocket(item) === "Held Items", item + " goes in Held Items");
}
assert(Bag.isBall("poke-ball") && Bag.isBall("safari-ball"));
// Rock Tunnel's floors are numbered.
assert.deepStrictEqual([WORLD_MAPS.RockTunnel_1F.floor, WORLD_MAPS.RockTunnel_B1F.floor], [1, -1]);

// Double battles in the game: FireRed's trainerbattle_double trainers fight as
// doubles, with their "not enough Pokémon" text; and the game's rules for
// double and tag battles (game/double-battle.js).
{
  const eli = WORLD_MAPS.Route8.people.find((p) => p.script === "Route8_EventScript_Eli").trainer;
  assert(eli.double && eli.id === "TRAINER_TWINS_ELI_ANNE", "Eli & Anne are a double battle");
  assert.deepStrictEqual(eli.notEnough, ["Eli: We can't battle if you don't\nhave two Pokémon."]);
  for (const [map, id] of [["Route12", "TRAINER_YOUNG_COUPLE_GIA_JES"], ["Route14", "TRAINER_TWINS_KIRI_JAN"], ["Route15", "TRAINER_CRUSH_KIN_RON_MYA"],
    ["Route16", "TRAINER_YOUNG_COUPLE_LEA_JED"], ["Route19", "TRAINER_SIS_AND_BRO_LIA_LUC"]]) {
    const both = WORLD_MAPS[map].people.filter((p) => p.trainer && p.trainer.id === id);
    assert(both.length === 2 && both.every((p) => p.trainer.double && p.trainer.notEnough), id + " is a double battle");
  }
  assert(!WORLD_MAPS.Route8.people.some((p) => p.trainer && p.trainer.id !== "TRAINER_TWINS_ELI_ANNE" && p.trainer.double), "singles stay singles");
  const D = DoubleBattle;
  const mk = (s, hp) => Object.assign(Party.create(s, 20), hp === 0 ? { hp: 0 } : {});
  const party = [mk("Pikachu"), mk("Rattata", 0), mk("Pidgey"), mk("Bulbasaur"), mk("Squirtle")];
  assert(D.canDouble(party) && !D.canDouble([mk("Pikachu"), mk("Rattata", 0)]) && !D.canDouble([mk("Pikachu")]));
  let order = [];
  assert.deepStrictEqual(D.descs(party, order), ["ABLE", "NOT ABLE", "ABLE", "ABLE", "ABLE"]);
  assert.strictEqual(D.entryStatus(party, order, 1), "notable");
  assert(D.enter(party, order, 1, 3).error, "a fainted Pokémon can't enter");
  for (const i of [3, 0]) order = D.enter(party, order, i, 3).order;
  assert.strictEqual(D.confirmError(party, order, 3), "Three POKéMON are needed.");
  order = D.enter(party, order, 4, 3).order;
  assert.deepStrictEqual(order, [3, 0, 4]);
  assert.deepStrictEqual(D.descs(party, order), ["SECOND", "NOT ABLE", "ABLE", "FIRST", "THIRD"]);
  assert(/No more than three/.test(D.enter(party, order, 2, 3).error));
  assert.strictEqual(D.confirmError(party, order, 3), null);
  order = D.noEntry(order, 0);
  assert.deepStrictEqual(order, [3, 4]);
  assert.strictEqual(D.confirmError([mk("Pikachu"), mk("Pidgey"), mk("Rattata", 0)], [0, 1], 3), null, "as many as can fight");
  // A tag battle: only the chosen three are synced, in the order chosen.
  const chosen = [3, 0, 4];
  const b = new Battle({ seed: 5, format: "doubles", exp: true,
    p1: { name: "Red", team: D.team(party, chosen).map((r) => Party.toBattleSet(r)), partner: { name: "Leaf", team: [Party.toBattleSet(mk("Ivysaur"))] } },
    p2: { name: "Twins", team: [Party.toBattleSet(Party.create("Magikarp", 5)), Party.toBattleSet(Party.create("Magikarp", 5))] } });
  b.start();
  for (let i = 0; i < 200 && !b.ended; i++) for (const id of ["p1", "p1b", "p2"]) {
    const req = b.getRequest(id);
    if (req && (req.phase === "move" || req.phase === "switch") && req.open.length) b.choose(id, OpponentAI.choose(b, id));
  }
  assert(b.ended && b.winner === "p1", "the tag battle ends");
  // A tag battle against one trainer (Giovanni in Silph Co., with Red): the
  // partner's Charizard and the foe's Kangaskhan each Mega Evolve (the foe's
  // Alakazam can't too: once a trainer).
  {
    const held = (s, item) => Object.assign(Party.toBattleSet(Party.create(s, 36)), { item });
    const t = new Battle({ seed: 3, format: "doubles",
      p1: { name: "Red", team: [Party.toBattleSet(mk("Pikachu"))], partner: { name: "Red", team: [held("Charizard", "charizardite-x")] } },
      p2: { name: "Giovanni", team: [held("Kangaskhan", "kangaskhanite"), held("Alakazam", "alakazite"), Party.toBattleSet(Party.create("Rhyhorn", 37))] } });
    t.start();
    for (const id of ["p1", "p1b", "p2"]) t.choose(id, OpponentAI.choose(t, id));
    const megas = t.events.filter((e) => e[0] === "-mega").map((e) => e[1].replace(/:.*/, ""));
    assert.deepStrictEqual(megas.sort(), ["p1b", "p2a"], "the partner's and the foe's Mega Evolution: " + megas);
  }
  const before = JSON.stringify(party[2]);
  const synced = D.syncBack(party, chosen, b.sides.p1.pokemon, (r, mon) => Party.syncFromBattle(r, mon));
  assert.deepStrictEqual(synced.map((r) => r.species), ["Bulbasaur", "Pikachu", "Squirtle"]);
  assert(party[3].exp > Party.create("Bulbasaur", 20).exp || party[0].exp > Party.create("Pikachu", 20).exp, "the chosen ones gained exp");
  assert.strictEqual(JSON.stringify(party[2]), before, "an unchosen one is untouched");
  assert.strictEqual(D.team(party, null).length, 5);
  // Prize money: each trainer's, doubled in a double battle (FireRed's getmoneyreward).
  const prizeOf = (f) => Player.prizeMoney(f.name, f.team, f.prizeClass);
  assert.strictEqual(D.prize([{ name: "Twins Eli & Anne", prizeClass: "Twins", team: [{ level: 22 }, { level: 22 }] }], prizeOf, true), 12 * 22 * 2);
  assert.strictEqual(D.prize([{ name: "Youngster Ben", team: [{ level: 11 }] }], prizeOf, false), Player.prizeMoney("Youngster Ben", [{ level: 11 }]));
}

// The Nidoran are written Nidoran♀ and Nidoran♂, in battle and everywhere else.
assert.deepStrictEqual(["Nidoran-F", "Nidoran-M", "Ho-Oh", "Wormadam-Sandy"].map(Party.speciesName), ["Nidoran♀", "Nidoran♂", "Ho-Oh", "Wormadam"]);
assert.strictEqual(Party.toBattleSet(Party.create("Nidoran-M", 5, { rng })).name, "Nidoran♂");
// Lil & Ian on Route 21 have their lines (FireRed keeps them in Route 21 South's text).
for (const p of WORLD_MAPS.Route21_North.people.filter((q) => /_(Lil|Ian)$/.test(q.script))) assert(p.trainer.intro && p.trainer.defeat && p.trainer.notEnough, p.script);

// The Sevii Islands, part 1 (game/sevii.js, ui/game.js): One, Two and Three
// Island, Mt. Ember and the Seagallop ferries.
{
  const W = (m) => { assert(WORLD_MAPS[m], m + " is built"); return WORLD_MAPS[m]; };
  for (const m of ["OneIsland", "OneIsland_Harbor", "OneIsland_PokemonCenter_1F", "OneIsland_KindleRoad", "OneIsland_KindleRoad_EmberSpa",
    "OneIsland_TreasureBeach", "MtEmber_Exterior", "MtEmber_Summit", "MtEmber_RubyPath_B5F", "TwoIsland", "TwoIsland_JoyfulGameCorner",
    "TwoIsland_CapeBrink", "TwoIsland_CapeBrink_House", "ThreeIsland", "ThreeIsland_Port", "ThreeIsland_BondBridge", "ThreeIsland_BerryForest"]) W(m);
  // The Seagallop's ports, where it leaves you, and its numbers.
  for (const port of ["VERMILION_CITY", "ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND", "FOUR_ISLAND", "FIVE_ISLAND", "SIX_ISLAND", "SEVEN_ISLAND", "CINNABAR_ISLAND"]) {
    const p = Sevii.port(port), m = W(p.map);
    assert(Sevii.built(port) && !m.collision[p.y * m.width + p.x], port + ": the Seagallop lands on open ground");
  }
  assert.deepStrictEqual([Sevii.ferryNumber("CINNABAR_ISLAND", "ONE_ISLAND"), Sevii.ferryNumber("VERMILION_CITY", "TWO_ISLAND"),
    Sevii.ferryNumber("ONE_ISLAND", "THREE_ISLAND"), Sevii.ferryNumber("FOUR_ISLAND", "FIVE_ISLAND"), Sevii.ferryNumber("SIX_ISLAND", "SEVEN_ISLAND")], [1, 7, 2, 3, 5]);
  // The ferry heads east from Cinnabar to One Island, west from One Island back to Vermilion.
  assert(Sevii.eastbound("CINNABAR_ISLAND", "ONE_ISLAND") && !Sevii.eastbound("ONE_ISLAND", "VERMILION_CITY") && Sevii.eastbound("VERMILION_CITY", "ONE_ISLAND"));
  // The harbors' menus: the Tri-Pass's islands (and Vermilion once Bill's gone home); the Rainbow Pass's two pages.
  assert.deepStrictEqual(Sevii.menu({ celioScene: 1 }, "ONE_ISLAND").items, ["TWO_ISLAND", "THREE_ISLAND", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 3, cinnabarScene: 4 }, "TWO_ISLAND").items, ["VERMILION_CITY", "ONE_ISLAND", "THREE_ISLAND", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 1 }, "VERMILION_CITY").items, ["ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "VERMILION_CITY").items, ["ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND", "FOUR_ISLAND", "MORE", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "ONE_ISLAND", 1).items, ["FIVE_ISLAND", "SIX_ISLAND", "SEVEN_ISLAND", "MORE", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "SIX_ISLAND", 1).items, ["FOUR_ISLAND", "FIVE_ISLAND", "SEVEN_ISLAND", "MORE", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "ONE_ISLAND").labels, ["Vermilion", "Two Island", "Three Island", "Four Island", "Other", "Exit"]);
  // Cape Brink: a fully evolved starter, as fond of you as can be, in the lead; each move once.
  const venusaur = Object.assign(Party.create("Venusaur", 50, { rng }), { happiness: 255 });
  assert.deepStrictEqual(Sevii.capeBrinkMove(venusaur, {}), { move: "Frenzy Plant", flag: "tutorFrenzyPlant" });
  assert(!Sevii.capeBrinkMove(Object.assign({}, venusaur, { happiness: 254 }), {}), "not fond enough");
  assert(!Sevii.capeBrinkMove(venusaur, { tutorFrenzyPlant: true }) && !Sevii.capeBrinkMove(Party.create("Ivysaur", 30, { rng }), {}));
  assert.strictEqual(Sevii.capeBrinkMove(Object.assign(Party.create("Blastoise", 50, { rng }), { happiness: 255 }), {}).move, "Hydro Cannon");
  assert(Sevii.capeBrinkDone({ tutorFrenzyPlant: true, tutorBlastBurn: true, tutorHydroCannon: true }) && !Sevii.capeBrinkDone({ tutorBlastBurn: true }));
  // The key items, the Pokémon Centers (respawn and Fly), the story's people and patches.
  for (const item of ["meteorite", "tri-pass", "rainbow-pass", "ruby", "sapphire"]) assert(Bag.isKeyItem(item) && Bag.sprite(item), item);
  for (const [sec, center] of [["ONE_ISLAND", "OneIsland_PokemonCenter_1F"], ["TWO_ISLAND", "TwoIsland_PokemonCenter_1F"], ["THREE_ISLAND", "ThreeIsland_PokemonCenter_1F"]]) {
    assert(Player.CENTERS[center] && window.TOWN_MAP.fly[sec].center === center, sec);
    const c = Player.CENTERS[center], cm = W(center);
    assert(!cm.collision[c.y * cm.width + c.x], center + " respawn spot");
  }
  assert.deepStrictEqual(Object.keys(W("OneIsland_PokemonCenter_1F").patches), ["ruby", "sapphire", "on"]);
  assert.deepStrictEqual(Object.keys(W("MtEmber_Exterior").patches), ["cave"]);
  assert(W("ThreeIsland_DunsparceTunnel").patches.dugout, "the tunnel dug out");
  assert(W("MtEmber_Summit").people.some((p) => p.script === "MtEmber_Summit_EventScript_Moltres" && p.flag === "FLAG_HIDE_MOLTRES"));
  assert(W("MtEmber_RubyPath_B5F").people.some((p) => p.localId === "LOCALID_RUBY"));
  assert(W("ThreeIsland_BerryForest").people.some((p) => p.localId === "LOCALID_BERRY_FOREST_LOSTELLE"));
  assert.strictEqual(W("ThreeIsland").people.filter((p) => p.flag === "FLAG_HIDE_THREE_ISLAND_BIKERS").length, 6);
  for (const id of ["TRAINER_BIKER_GOON", "TRAINER_BIKER_GOON_2", "TRAINER_BIKER_GOON_3", "TRAINER_CUE_BALL_PAXTON", "TRAINER_TEAM_ROCKET_GRUNT_43",
    "TRAINER_TEAM_ROCKET_GRUNT_44"]) assert(WORLD_TRAINERS[id], id);
  assert.strictEqual(WORLD_TRAINERS.TRAINER_PKMN_RANGER_LOGAN.className, "Pokémon Ranger");
  for (const cls of ["Crush Girl", "Pokémon Ranger", "Aroma Lady", "Tuber"]) assert(Player.prizeMoney(cls + " X", [{ level: 10 }]) > 0, cls);
  // Kindle Road's Crush Kin and Bond Bridge's twins are double battles; wild Pokémon on land and water.
  assert(W("OneIsland_KindleRoad").people.filter((p) => p.trainer && p.trainer.id === "TRAINER_CRUSH_KIN_MIK_KIA").every((p) => p.trainer.double));
  assert(W("OneIsland_KindleRoad").wild && W("OneIsland_KindleRoad").water && W("MtEmber_Exterior").wild && W("ThreeIsland_BerryForest").wild);
  // The ferry ride's pictures.
  for (const f of ["sea-west", "sea-east", "ferry", "wake"]) assert(fs.existsSync(path.join(root, "assets/seagallop/" + f + ".png")), f);
  // Text the scenes use.
  for (const label of ["Text_AllAboardSeagallopNum", "Text_WhereDoYouWantToSail", "OneIsland_PokemonCenter_1F_Text_UsualPCServicesUnavailable",
    "CinnabarIsland_Text_ComeWithMeToOneIsland", "MtEmber_Exterior_Text_FirstPasswordGoldeen", "Text_UltimateMoveThatMon"]) assert(WORLD_TEXT[label], label);
}

// The Sevii Islands, part 2 (game/sevii.js, ui/game.js): Four and Five Island.
{
  const W = (m) => { assert(WORLD_MAPS[m], m + " is built"); return WORLD_MAPS[m]; };
  for (const m of ["FourIsland", "FourIsland_Harbor", "FourIsland_PokemonDayCare", "FourIsland_LoreleisHouse", "FourIsland_IcefallCave_Entrance",
    "FourIsland_IcefallCave_1F", "FourIsland_IcefallCave_B1F", "FourIsland_IcefallCave_Back", "FiveIsland", "FiveIsland_Harbor", "FiveIsland_Meadow",
    "FiveIsland_RocketWarehouse", "FiveIsland_MemorialPillar", "FiveIsland_WaterLabyrinth", "FiveIsland_ResortGorgeous",
    "FiveIsland_ResortGorgeous_House", "FiveIsland_LostCave_Entrance", "FiveIsland_LostCave_Room10", "FiveIsland_LostCave_Room14"]) W(m);
  // The ferry sails to Four and Five Island now; they're on the Rainbow Pass's menu.
  assert(Sevii.built("FOUR_ISLAND") && Sevii.built("FIVE_ISLAND"));
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "FOUR_ISLAND").items, ["VERMILION_CITY", "ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND", "MORE", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "FIVE_ISLAND", 1).items, ["FOUR_ISLAND", "SIX_ISLAND", "SEVEN_ISLAND", "MORE", "EXIT"]);
  // Icefall Cave 1F's thin ice: nine spots, each cracking and then breaking
  // through to open floor on B1F; B1F's slippery ice.
  const ice = W("FourIsland_IcefallCave_1F"), b1f = W("FourIsland_IcefallCave_B1F");
  assert.strictEqual(Sevii.ICEFALL_ICE.length, 9);
  for (const [x, y] of Sevii.ICEFALL_ICE) {
    assert.strictEqual(ice.behavior[y * ice.width + x], World.MB.THIN_ICE, "thin ice at " + x + "," + y);
    assert(!b1f.collision[y * b1f.width + x], "B1F below " + x + "," + y + " is open");
  }
  for (let i = 0; i < 9; i++) {
    assert.strictEqual(ice.patches["crack" + i].collision[0][3], World.MB.CRACKED_ICE);
    assert(ice.patches["hole" + i], "hole" + i);
  }
  assert.deepStrictEqual(Sevii.icefallPatches({ "8,3": 1, "10,5": 2 }), ["crack0", "hole1"]);
  assert(b1f.behavior.filter((b) => b === World.MB.ICE).length > 50, "B1F's ice floor");
  // The Rocket Warehouse: its door in the Meadow, the arrows the Admin turns, its spin tiles.
  assert.deepStrictEqual(W("FiveIsland_Meadow").patches.unlocked.collision[0].slice(0, 2), [12, 21]);
  assert.strictEqual(W("FiveIsland_Meadow").patches.unlocked.collision[0][3], World.MB.WARP_DOOR);
  assert.deepStrictEqual(W("FiveIsland_RocketWarehouse").patches.arrows.collision.map((c) => c[3]), [World.MB.SPIN_UP, World.MB.SPIN_UP]);
  assert(W("FiveIsland_RocketWarehouse").behavior.some((b) => b === World.MB.SPIN_LEFT));
  for (const id of ["TRAINER_TEAM_ROCKET_ADMIN", "TRAINER_TEAM_ROCKET_ADMIN_2", "TRAINER_SCIENTIST_GIDEON", "TRAINER_TEAM_ROCKET_GRUNT_45",
    "TRAINER_LADY_SELPHY", "TRAINER_RUIN_MANIAC_LAWSON", "TRAINER_PSYCHIC_LAURA", "TRAINER_PAINTER_DAISY", "TRAINER_PKMN_BREEDER_ALIZE"]) assert(WORLD_TRAINERS[id], id);
  for (const cls of ["Lady", "Painter", "Ruin Maniac", "Pokémon Breeder"]) assert(Player.prizeMoney(cls + " X", [{ level: 10 }]) > 0, cls);
  // Selphy's wish: a Pokémon you've seen (of FireRed's 386), and her thanks; she tires after 250 steps.
  const seen = ["Pikachu", "Togekiss"], req = Sevii.resortRequest(seen, () => 0.1);
  assert.strictEqual(req.species, "Pikachu");
  assert(["luxury-ball"].concat(Sevii.RESORT_DELUXE).includes(req.reward) && Sevii.resortRequest(seen, () => 0.9).reward === "luxury-ball");
  for (const item of Sevii.RESORT_DELUXE.concat(["luxury-ball", "lemonade", "sapphire"])) assert(window.ITEMS[item], item);
  for (let i = 0; i < 249; i++) assert(!Sevii.resortStep(req));
  assert(Sevii.resortStep(req) && req.expired);
  // The sticker man's tiers; the Water Labyrinth's test.
  assert.deepStrictEqual([1, 39, 40, 99, 100, 200].map(Sevii.hofBrag), [1, 1, 2, 2, 3, 4]);
  assert(Sevii.leadFriendshipMax([{ happiness: 255 }]) && !Sevii.leadFriendshipMax([{ happiness: 254 }, { happiness: 255 }]));
  // Four Island's Day-Care keeps two, each growing.
  const pair = [DayCare.deposit(Party.create("Rattata", 5, { rng })), DayCare.deposit(Party.create("Pidgey", 5, { rng }))];
  for (let i = 0; i < 500; i++) DayCare.step(pair);
  assert(pair.every((d) => d.steps === 500 && DayCare.levelsGained(d) > 0));
  // The Pokémon Centers (respawn and Fly), the story's people.
  for (const [sec, center] of [["FOUR_ISLAND", "FourIsland_PokemonCenter_1F"], ["FIVE_ISLAND", "FiveIsland_PokemonCenter_1F"]]) {
    assert(Player.CENTERS[center] && window.TOWN_MAP.fly[sec].center === center, sec);
    const c = Player.CENTERS[center], cm = W(center);
    assert(!cm.collision[c.y * cm.width + c.x], center + " respawn spot");
  }
  assert(onGridSevii("FOUR_ISLAND") && onGridSevii("ICEFALL_CAVE") && onGridSevii("LOST_CAVE") && onGridSevii("RESORT_GORGEOUS"));
  function onGridSevii(sec) { const R = window.TOWN_MAP.sevii[1]; return R.map.some((r) => r.includes(sec)) || R.dungeon.some((r) => r.includes(sec)); }
  assert(W("FourIsland").people.some((p) => p.localId === "LOCALID_FOUR_ISLAND_RIVAL" && p.flag === "FLAG_HIDE_FOUR_ISLAND_RIVAL"));
  assert.strictEqual(W("FourIsland_IcefallCave_Back").people.filter((p) => p.flag === "FLAG_HIDE_ICEFALL_CAVE_ROCKETS").length, 3);
  assert(W("FourIsland_IcefallCave_1F").people.some((p) => p.item === FieldMoves.hmFor("Waterfall")), "HM Waterfall in Icefall Cave");
  assert(W("FiveIsland_LostCave_Room10").people.some((p) => p.localId === "LOCALID_LOST_CAVE_SELPHY"));
  assert(W("FiveIsland_ResortGorgeous_House").people.some((p) => p.localId === "LOCALID_RESORT_GORGEOUS_HOUSE_BUTLER"));
  assert(W("FiveIsland_RocketWarehouse").people.some((p) => p.item === "tm36" || /^tm\d+$/.test(p.item)), "the Warehouse's TM");
  assert(W("FourIsland_IcefallCave_1F").wild && W("FiveIsland_LostCave_Room1").wild && W("FiveIsland_ResortGorgeous").water && W("FiveIsland_Meadow").wild);
  for (const label of ["FourIsland_Text_RivalAlreadyGotEggBeSmellingYa", "DayCare_Text_WeCanRaiseOneMore", "FourIsland_House2_Text_HoFStickerApplied",
    "FourIsland_IcefallCave_Back_Text_LoreleiPlayerHelpMeKickPoachersOut", "FiveIsland_Meadow_Text_EnteredPasswordDoorOpened",
    "FiveIsland_MemorialPillar_Text_ThankYouPleaseTakeThis", "FiveIsland_WaterLabyrinth_Text_ReceivedEggFromMan",
    "FiveIsland_ResortGorgeous_House_Text_WishToSeeMonPlease", "FiveIsland_LostCave_Room10_Text_MayIAskYouToTakeMeHome", "Text_BodySlamTeach"]) assert(WORLD_TEXT[label], label);
  for (const m of ["FourIsland_Movement_RivalApproach", "FourIsland_IcefallCave_Back_Movement_PlayerToRockets", "FourIsland_PokemonDayCare_Movement_RetrieveMon",
    "FiveIsland_ResortGorgeous_House_Movement_ButlerApproachPlayerNorth", "FiveIsland_LostCave_Room10_Movement_SelphyApproach"]) assert(WORLD_MOVEMENTS[m], m);
}

// The Sevii Islands, part 3 (game/sevii.js, game/trainer-tower.js, ui/game.js): Six and Seven Island.
{
  const W = (m) => { assert(WORLD_MAPS[m], m + " is built"); return WORLD_MAPS[m]; };
  for (const m of ["SixIsland", "SixIsland_Harbor", "SixIsland_PokemonCenter_1F", "SixIsland_WaterPath", "SixIsland_WaterPath_House1",
    "SixIsland_RuinValley", "SixIsland_DottedHole_1F", "SixIsland_DottedHole_B4F", "SixIsland_DottedHole_SapphireRoom", "SixIsland_GreenPath",
    "SixIsland_PatternBush", "SixIsland_OutcastIsland", "SixIsland_AlteringCave", "SevenIsland", "SevenIsland_Harbor", "SevenIsland_TrainerTower",
    "TrainerTower_Lobby", "TrainerTower_1F", "TrainerTower_8F", "TrainerTower_Roof", "TrainerTower_Elevator", "SevenIsland_SevaultCanyon_Entrance",
    "SevenIsland_SevaultCanyon", "SevenIsland_SevaultCanyon_House", "SevenIsland_SevaultCanyon_TanobyKey", "SevenIsland_TanobyRuins"]
    .concat(Sevii.TANOBY_CHAMBERS)) W(m);
  // The ferry sails everywhere now; Six and Seven Island's page of the menu.
  for (const port of Sevii.PORTS) assert(Sevii.built(port.id), port.id);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "SIX_ISLAND", 1).items, ["FOUR_ISLAND", "FIVE_ISLAND", "SEVEN_ISLAND", "MORE", "EXIT"]);
  assert.deepStrictEqual(Sevii.menu({ celioScene: 5 }, "SEVEN_ISLAND", 1).items, ["FOUR_ISLAND", "FIVE_ISLAND", "SIX_ISLAND", "MORE", "EXIT"]);
  // Ruin Valley: the Dotted Hole's door shut (no way in) until Cut opens it, from below, facing it.
  const rv = W("SixIsland_RuinValley"), door = 24 * rv.width + 24;
  assert(rv.collision[door] && rv.patches.open.collision[0][2] === 0 && rv.warps.some((w) => w.x === 24 && w.y === 24 && w.map === "SixIsland_DottedHole_1F"));
  assert(Sevii.cutOpensDottedHole({}, { map: "SixIsland_RuinValley", x: 24, y: 25, facing: "up" }));
  assert(!Sevii.cutOpensDottedHole({}, { map: "SixIsland_RuinValley", x: 24, y: 25, facing: "left" }));
  assert(!Sevii.cutOpensDottedHole({ usedCutOnRuinValleyBraille: true }, { map: "SixIsland_RuinValley", x: 24, y: 25, facing: "up" }));
  assert(rv.people.some((p) => p.localId === "LOCALID_RUIN_VALLEY_SCIENTIST" && p.x === 24 && p.y === 25 && p.flag === "FLAG_HIDE_RUIN_VALLEY_SCIENTIST"));
  // The Dotted Hole: holes down a floor at a time (the Braille's way), the rest back up to 1F; B4F's down to the Sapphire.
  const hole = (m, x, y) => { const M = W(m); return M.behavior[y * M.width + x] === World.MB.FALL_WARP && M.warps.find((w) => w.x === x && w.y === y).map; };
  assert.strictEqual(hole("SixIsland_DottedHole_1F", 6, 5), "SixIsland_DottedHole_B1F");
  assert.deepStrictEqual([hole("SixIsland_DottedHole_B1F", 6, 1), hole("SixIsland_DottedHole_B2F", 1, 5), hole("SixIsland_DottedHole_B3F", 11, 5),
    hole("SixIsland_DottedHole_B4F", 6, 9)], ["SixIsland_DottedHole_B2F", "SixIsland_DottedHole_B3F", "SixIsland_DottedHole_B4F", "SixIsland_DottedHole_SapphireRoom"]);
  assert.strictEqual(hole("SixIsland_DottedHole_B2F", 6, 1), "SixIsland_DottedHole_1F");
  assert(W("SixIsland_DottedHole_SapphireRoom").people.some((p) => p.localId === "LOCALID_SAPPHIRE" && p.flag === "FLAG_HIDE_SAPPHIRE"));
  // Outcast Island's grunt goes with the Warehouse's Rockets.
  assert(W("SixIsland_OutcastIsland").people.some((p) => p.flag === "FLAG_HIDE_FIVE_ISLAND_ROCKETS" && p.trainer && p.trainer.id === "TRAINER_TEAM_ROCKET_GRUNT_46"));
  // Altering Cave: FireRed's first table, Zubat only.
  assert(W("SixIsland_AlteringCave").wild.slots.every((s) => s.species === "Zubat" && !s.alt));
  // Wild Pokémon: Pattern Bush (Heracross), the Water Path's water, Sevault Canyon's rocks.
  assert(W("SixIsland_PatternBush").wild.slots.some((s) => s.species === "Heracross"));
  assert(W("SixIsland_WaterPath").water && W("SevenIsland_SevaultCanyon").rockSmash && W("SevenIsland_TanobyRuins").water);
  // The Tanoby chambers: Unown, by slot (sUnownLetterSlots), only once the Tanoby Key's solved.
  for (const c of Sevii.TANOBY_CHAMBERS) assert(W(c).wild.slots.every((s) => s.species === "Unown"), c);
  assert.deepStrictEqual(Array.from({ length: 12 }, (_, i) => Sevii.unownLetter("SevenIsland_TanobyRuins_MoneanChamber", i)),
    Array(11).fill("a").concat(["question"]));
  assert.strictEqual(Sevii.unownLetter("SevenIsland_TanobyRuins_ViapoisChamber", 11), "exclamation");
  assert.strictEqual(Sevii.unownLetter("SevenIsland_TanobyRuins_RixyChamber", 10), "b");
  assert.strictEqual(Sevii.unownLetter("SixIsland_PatternBush", 3), null);
  assert(Sevii.tanobyLocked({}, "SevenIsland_TanobyRuins_DilfordChamber") && !Sevii.tanobyLocked({ unlockedTanobyRuins: true }, "SevenIsland_TanobyRuins_DilfordChamber"));
  assert(!Sevii.tanobyLocked({}, "SevenIsland_TanobyRuins"));
  assert.strictEqual(World.pickWild(W("SevenIsland_TanobyRuins_MoneanChamber"), () => 0.999).slot, 11);
  const unown = Party.create("Unown", 25, { rng, unown: "question" });
  assert.strictEqual(Party.form(unown), "question");
  assert.strictEqual(Party.toBattleSet(unown).form, "question");
  assert.strictEqual(Party.form(Party.create("Unown", 25, { rng, unown: "a" })), "");
  for (const form of ["b", "z", "exclamation", "question"]) {
    for (const dir of ["", "back/", "shiny/", "back/shiny/"]) assert(fs.existsSync(path.join(root, "assets/sprites/pokemon", dir, "201-" + form + ".png")), dir + "201-" + form);
    assert(fs.existsSync(path.join(root, "assets/sprites/icons/201-" + form + ".png")));
  }
  // The Tanoby Key: seven switches, the boulders to push onto them.
  const tk = W("SevenIsland_SevaultCanyon_TanobyKey");
  assert.strictEqual(tk.triggers.length, 7);
  assert(tk.triggers.every((q) => tk.behavior[q.y * tk.width + q.x] === World.MB.STRENGTH_BUTTON));
  assert.deepStrictEqual(Object.values(Sevii.TANOBY_BOULDERS_SOLVED).map(([x, y]) => x + "," + y).sort(), tk.triggers.map((q) => q.x + "," + q.y).sort());
  // The Pokémon Centers (respawn and Fly).
  for (const [sec, center] of [["SIX_ISLAND", "SixIsland_PokemonCenter_1F"], ["SEVEN_ISLAND", "SevenIsland_PokemonCenter_1F"]]) {
    assert(Player.CENTERS[center] && window.TOWN_MAP.fly[sec].center === center, sec);
    const c = Player.CENTERS[center], cm = W(center);
    assert(!cm.collision[c.y * cm.width + c.x], center + " respawn spot");
  }
  const onGrid67 = (sec) => { const R = window.TOWN_MAP.sevii[2]; return R.map.some((r) => r.includes(sec)) || R.dungeon.some((r) => r.includes(sec)); };
  for (const sec of ["SIX_ISLAND", "SEVEN_ISLAND", "RUIN_VALLEY", "WATER_PATH", "GREEN_PATH", "OUTCAST_ISLAND", "TRAINER_TOWER", "SEVAULT_CANYON",
    "TANOBY_RUINS", "CANYON_ENTRANCE"]) assert(onGrid67(sec), sec);
  // Trainers (doubles automatic) and their classes' prize money.
  for (const id of ["TRAINER_TWINS_MIU_MIA", "TRAINER_SIS_AND_BRO_AVA_GEB", "TRAINER_YOUNG_COUPLE_EVE_JON", "TRAINER_COOL_COUPLE_LEX_NYA"]) {
    assert(Object.values(WORLD_MAPS).some((m) => m.people.some((p) => p.trainer && p.trainer.id === id && p.trainer.double)), id + " is a double battle");
  }
  // Text and movements the scenes use.
  for (const label of ["SixIsland_PokemonCenter_1F_Text_RivalImpossibleToGetAllMonsAroundHere", "SixIsland_DottedHole_SapphireRoom_Text_SellToTeamRocketTellPassword",
    "SixIsland_WaterPath_House1_Text_ItsXInchesDeserveReward", "SevenIsland_SevaultCanyon_TanobyKey_Text_MysteriousRumbleFarAway",
    "TrainerTower_Lobby_Text_ExplainTrainerTower", "TrainerTower_Roof_Text_DoneItInRecordTime", "TrainerTower_Text_XMinYZSec", "Text_SwordsDanceTeach",
    "SevenIsland_SevaultCanyon_House_Text_YoureAllChipperNow"]) assert(WORLD_TEXT[label], label);
  for (const m of ["SixIsland_PokemonCenter_1F_Movement_RivalApproach", "SixIsland_DottedHole_SapphireRoom_Movement_ThiefExitNorth",
    "SixIsland_DottedHole_SapphireRoom_Movement_ThiefGetSapphireFromBelow"]) assert(WORLD_MOVEMENTS[m], m);
  // After the islands: the hook for Cerulean Cave's guard.
  assert(Sevii.ceruleanCaveOpen({ gameClear: true, canLinkWithRS: true }) && !Sevii.ceruleanCaveOpen({ gameClear: true }));
}

// ---------- Cerulean Cave, the League's door, Lorelei's dolls (and no Navel Rock or Birth Island) ----------
{
  const W = (m) => { assert(WORLD_MAPS[m], m + " is built"); return WORLD_MAPS[m]; };
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  // Cerulean Cave's guard stands in the way (just below the way in) until
  // Celio has the Sapphire (FLAG_SYS_CAN_LINK_WITH_RS), Champion or not.
  assert(!Sevii.ceruleanCaveOpen({}) && !Sevii.ceruleanCaveOpen({ gameClear: true }));
  assert(Sevii.ceruleanCaveOpen({ canLinkWithRS: true }) && Sevii.ceruleanCaveOpen({ gameClear: true, canLinkWithRS: true }));
  const guard = W("CeruleanCity").people.find((p) => p.flag === "FLAG_HIDE_CERULEAN_CAVE_GUARD");
  const caveDoor = W("CeruleanCity").warps.find((w) => w.map === "CeruleanCave_1F");
  assert(guard && caveDoor && guard.x === caveDoor.x && guard.y === caveDoor.y + 1, "the guard stands below the cave's way in");
  assert(/case "FLAG_HIDE_CERULEAN_CAVE_GUARD": return !Sevii\.ceruleanCaveOpen\(f\);/.test(gameJs));
  // The cave: three floors joined up, its wild Pokémon, Mewtwo on B1F (Lv. 70).
  for (const m of ["CeruleanCave_1F", "CeruleanCave_2F", "CeruleanCave_B1F"]) {
    assert(W(m).wild && W(m).allowEscaping, m);
    for (const w of W(m).warps) assert(WORLD_MAPS[w.map], m + " -> " + w.map);
  }
  assert(W("CeruleanCave_1F").wild.slots.some((s) => s.species === "Ditto") && W("CeruleanCave_B1F").wild.slots.some((s) => s.species === "Wobbuffet"));
  assert(W("CeruleanCave_1F").water && W("CeruleanCave_B1F").water && W("CeruleanCave_2F").rockSmash, "surfing and Rock Smash encounters");
  const mewtwo = W("CeruleanCave_B1F").people.find((p) => p.script === "CeruleanCave_B1F_EventScript_Mewtwo");
  assert(mewtwo && mewtwo.flag === "FLAG_HIDE_MEWTWO" && WORLD_SPRITES && WORLD_TEXT.CeruleanCave_B1F_Text_Mew);
  assert(/legendaryBird\(ev\.person, "Mewtwo", "foughtMewtwo", \{ level: 70, text: T\("CeruleanCave_B1F_Text_Mew"\), music: "mus_vs_mewtwo" \}\)/.test(gameJs));
  // The Town Map shows the cave once it's open (FLAG_SYS_CAN_LINK_WITH_RS).
  assert(/sec === "CERULEAN_CAVE" && !f\.canLinkWithRS/.test(gameJs));
  // Indigo Plateau's door guard: closed once you're Champion until the Sapphire's in.
  assert(!Sevii.leagueClosed({}) && Sevii.leagueClosed({ gameClear: true }) && !Sevii.leagueClosed({ gameClear: true, canLinkWithRS: true }));
  const doorGuard = W("IndigoPlateau_PokemonCenter_1F").people.find((p) => p.localId === "LOCALID_LEAGUE_DOOR_GUARD");
  const leagueDoor = W("IndigoPlateau_PokemonCenter_1F").warps.find((w) => w.map === "PokemonLeague_LoreleisRoom");
  assert(doorGuard && leagueDoor.x === 4 && leagueDoor.y === 1, "she'd stand at (4, 2), in front of the door");
  assert(WORLD_TEXT.IndigoPlateau_PokemonCenter_1F_Text_LoreleiIsAbsentClosedForTimeBeing);
  // Lorelei's dolls: six always, one more each 25 Hall of Fame entries.
  assert.deepStrictEqual([0, 1, 24, 25, 49, 50, 199, 200, 999].map(Sevii.loreleiDolls), [0, 0, 0, 1, 1, 2, 7, 8, 8]);
  assert(!Sevii.loreleiDollShown("FLAG_HIDE_LORELEI_HOUSE_MEOWTH_DOLL", 0) && Sevii.loreleiDollShown("FLAG_HIDE_LORELEI_HOUSE_MEOWTH_DOLL", 25));
  assert(!Sevii.loreleiDollShown("FLAG_HIDE_LORELEIS_HOUSE_LAPRAS_DOLL", 199) && Sevii.loreleiDollShown("FLAG_HIDE_LORELEIS_HOUSE_LAPRAS_DOLL", 200));
  const dolls = W("FourIsland_LoreleisHouse").people.filter((p) => p.script === "FourIsland_LoreleisHouse_EventScript_Doll");
  assert.strictEqual(dolls.filter((p) => !p.flag).length, 6);
  assert.deepStrictEqual(dolls.filter((p) => p.flag).map((p) => p.flag).sort(), Sevii.LORELEI_DOLL_FLAGS.slice().sort());

  // Navel Rock and Birth Island are left out on purpose: no maps, no ferries
  // there, no tickets from Celio, nothing of theirs on the Town Map.
  assert(!Object.keys(WORLD_MAPS).some((m) => /^(NavelRock|BirthIsland)_/.test(m)));
  for (const m of Object.keys(WORLD_MAPS)) for (const w of WORLD_MAPS[m].warps) assert(!/^(NavelRock|BirthIsland)_/.test(w.map), m);
  assert(!ITEMS["mystic-ticket"] && !ITEM_SPRITES["mystic-ticket"] && !ITEM_SPRITES["aurora-ticket"]);
  assert(!Sevii.ticketPorts && !Sevii.EVENT_PORTS && !Sevii.deoxysTouch && !Sevii.port("NAVEL_ROCK") && !Sevii.port("BIRTH_ISLAND"));
  for (const from of Sevii.PORTS.map((p) => p.id)) for (const page of [0, 1]) for (const flags of [{ celioScene: 7, cinnabarScene: 4 }, { celioScene: 3, cinnabarScene: 4 }]) {
    assert(!Sevii.menu(flags, from, page).items.some((i) => i === "NAVEL_ROCK" || i === "BIRTH_ISLAND"));
  }
  assert(!/mystic-ticket|aurora-ticket|NavelRock_|BirthIsland_|panCamera|se_deoxys_move|se_thunderstorm_stop/.test(gameJs));
  assert(!/se_deoxys_move|se_thunderstorm_stop/.test(fs.readFileSync(path.join(root, "tools/build-audio.js"), "utf8")));
  for (const R of window.TOWN_MAP.sevii) {
    assert(!R.hidden && !R.map.some((row) => row.includes("NAVEL_ROCK") || row.includes("BIRTH_ISLAND")), R.id);
    assert(!R.dungeon.some((row) => row.includes("NAVEL_ROCK") || row.includes("BIRTH_ISLAND")), R.id);
  }
  assert(!Object.values(window.TOWN_MAP.mapSections).some((sec) => sec === "NAVEL_ROCK" || sec === "BIRTH_ISLAND"));
  {
    // An old save with Celio's tickets, made on Navel Rock: the tickets and
    // the islands' flags go, and it's back at Vermilion's dock.
    const old = JSON.parse(Player.serialize(Player.create("Red")));
    old.bag = Object.assign({}, old.bag, { "mystic-ticket": 1, "aurora-ticket": 1 });
    old.flags = Object.assign({}, old.flags, { gotEventTickets: true, enableShipNavelRock: true, enableShipBirthIsland: true,
      worldMapNavelRock: true, hoOhFlewAway: true, foughtLugia: true, canLinkWithRS: true });
    old.location = { map: "NavelRock_Summit", x: 9, y: 12, facing: "up" };
    const { player: p } = Player.load(JSON.parse(JSON.stringify(old)));
    assert(!p.bag["mystic-ticket"] && !p.bag["aurora-ticket"] && p.flags.canLinkWithRS);
    assert(!p.flags.gotEventTickets && !p.flags.enableShipNavelRock && !p.flags.worldMapNavelRock && !p.flags.hoOhFlewAway && !p.flags.foughtLugia);
    assert.strictEqual(p.location.map, "VermilionCity");
  }

  // Trainer Tower: FireRed's built-in challenges, eight floors each.
  const TT = window.TRAINER_TOWER;
  assert.deepStrictEqual(TT.challenges.map((c) => c.length), [8, 8, 8, 8]);
  assert.deepStrictEqual(TrainerTower.MODES, ["Single", "Double", "Knockout", "Mixed"]);
  for (let mode = 0; mode < 4; mode++) for (let n = 1; n <= 8; n++) {
    const fl = TrainerTower.floor(mode, n);
    if (mode < 3) assert.strictEqual(fl.type, ["single", "double", "knockout"][mode]);
    assert.strictEqual(fl.trainers.length, { single: 1, double: 2, knockout: 3 }[fl.type]);
    for (const t of fl.trainers) {
      assert(t.mons.length === 6 && t.intro && t.lose && t.after && fs.existsSync(path.join(root, "assets/sprites/trainers/front", t.pic + ".png")), t.name);
      for (const m of t.mons) assert(DEX[m.species] && m.moves.every((mv) => MOVES[mv]) && NATURES[m.nature], t.name + " " + m.species);
    }
    for (const look of fl.looks) assert(WORLD_SPRITES[look], look);
    assert(WORLD_MAPS["TrainerTower_" + n + "F"].patches.doubles && WORLD_MAPS["TrainerTower_" + n + "F"].patches.knockout);
  }
  assert.deepStrictEqual(TrainerTower.MODES.map((_, m) => TrainerTower.prize(m)), ["up-grade", "dragon-scale", "metal-coat", "kings-rock"]);
  assert.strictEqual(TrainerTower.floor(3, 4), TT.floors.Double_8);
  assert.strictEqual(TT.floors.Single_4.trainers[0].intro, "Ahaha you're not\ngoing anywhere!");
  // Their Pokémon (BuildEnemyParty): at your best's level, by floors cleared.
  const tf = TrainerTower.floor(0, 1), lvl = TrainerTower.partyLevel([{ level: 12 }, { level: 57 }]);
  assert.strictEqual(lvl, 57);
  const single = TrainerTower.team(tf, 0, 0, lvl);
  assert.deepStrictEqual(single.map((r) => [r.species, r.level]), [[tf.trainers[0].mons[0].species, 57], [tf.trainers[0].mons[2].species, 57]]);
  assert.strictEqual(single[0].item, tf.trainers[0].mons[0].item || "");
  assert.deepStrictEqual(single[0].evs, tf.trainers[0].mons[0].evs);
  const df = TrainerTower.floor(1, 3), dbl = TrainerTower.team(df, 0, 2, 50);
  assert.deepStrictEqual(dbl.map((r) => r.species), [df.trainers[0].mons[2].species, df.trainers[1].mons[0].species]);
  const kf = TrainerTower.floor(2, 8);
  assert.deepStrictEqual([0, 1, 2].map((i) => TrainerTower.team(kf, i, 7, 50)[0].species), [kf.trainers[0].mons[1].species, kf.trainers[1].mons[4].species, kf.trainers[2].mons[5].species]);
  // The challenge: floors in turn, the clock, the record.
  const tflags = {};
  TrainerTower.start(tflags, 2);
  assert(!TrainerTower.floorCleared(tflags, 1) && TrainerTower.floorCleared(tflags, 2));
  tflags.tower.floorsCleared = 1;
  assert(TrainerTower.floorCleared(tflags, 1) && !TrainerTower.floorCleared(tflags, 2));
  TrainerTower.tick(tflags, 61000);
  assert.strictEqual(tflags.tower.frames, 3660);
  assert.deepStrictEqual(TrainerTower.time(3660), [" 1", " 1", "00"]);
  assert.deepStrictEqual(TrainerTower.time(TrainerTower.MAX_TIME), ["59", "59", "99"]);
  assert.strictEqual(TrainerTower.finalTime(tflags), 0);
  assert.strictEqual(TrainerTower.best(tflags, 2), 3660);
  assert.strictEqual(TrainerTower.finalTime(tflags), 2);
  TrainerTower.start(tflags, 2); TrainerTower.tick(tflags, 99000);
  assert.strictEqual(TrainerTower.finalTime(tflags), 1);
  assert.strictEqual(TrainerTower.best(tflags, 2), 3660);
  tflags.tower.running = false; TrainerTower.tick(tflags, 5000);
  assert.strictEqual(tflags.tower.frames, 5940);
}

// ---------- The National Pokédex, from the start ----------
{
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  const dexJs = fs.readFileSync(path.join(root, "ui/pokedex-screen.js"), "utf8");
  const p = Player.create("Red");
  assert(!Player.nationalDex(p));
  p.flags.pokedex = true;   // (Oak hands it over: FLAG_SYS_POKEDEX_GET)
  assert(Player.nationalDex(p));
  // Kanto's counts are National Dex numbers 1-151; the National one counts
  // every number once (a form isn't one of its own).
  for (const sp of ["Bulbasaur", "Mew", "Chikorita", "Heracross", "Deoxys-Normal", "Deoxys-Attack"]) Player.markCaught(p, sp);
  Player.markSeen(p, "Pikachu");
  assert.deepStrictEqual([Player.dexCount(p, "seen", true), Player.dexCount(p, "caught", true), Player.dexCount(p, "seen", false),
    Player.dexCount(p, "caught", false)], [3, 2, 6, 5]);
  assert.strictEqual(Player.dexNumber("Chikorita"), 152);
  // Prof. Oak's rating: by Kanto kinds caught; 150 is complete without Mew.
  const rate = (ids) => { const q = Player.create("Red"); for (const n of ids) Player.markCaught(q, Object.keys(DEX).find((k) => DEX[k].id === n)); return Player.dexRating(q); };
  assert.deepStrictEqual(rate([1, 2, 3]), { text: "LessThan10", complete: false });
  assert.deepStrictEqual(rate(Array.from({ length: 52 }, (_, i) => i + 1).concat([152, 153])), { text: "LessThan60", complete: false });
  assert.deepStrictEqual(rate(Array.from({ length: 150 }, (_, i) => i + 1)), { text: "Complete", complete: true });
  assert.deepStrictEqual(rate(Array.from({ length: 149 }, (_, i) => i + 1).concat([151])), { text: "LessThan150", complete: false });
  assert(!Player.hasAllMons(p));
  for (const k of ["SeenXOwnedY", "LessThan10", "LessThan150", "Complete", "NationalDexSeenXOwnedY", "LookForwardToFilledNationalDex", "YouveCompletedDex"]) {
    assert(WORLD_TEXT["PokedexRating_Text_" + k], k);
  }
  // FireRed's National Pokédex checks: the Pokédex here.
  // (and, as FireRed's comes after the Hall of Fame, once you're Champion: until
  // then only One, Two and Three Island can be reached.)
  assert(/if \(Player\.nationalDex\(player\) && player\.flags\.gameClear && scene >= 3\)/.test(gameJs), "Celio asks for the Ruby once you're Champion");
  // (The Dunsparce Tunnel's dug out once you're Champion, this game's rule.)
  assert(/ThreeIsland_DunsparceTunnel"\) return f\.gameClear \? \["dugout"\]/.test(gameJs));
  // The aides count Kanto's kinds (GetPokedexCount with VAR_0x8004 0).
  assert(!/player\.pokedex\.caught\.length/.test(gameJs));
  // The Pokédex screen: the National Pokédex's table of contents and lists.
  assert(/national: Player\.nationalDex\(player\)/.test(gameJs));
  for (const label of ["Numerical mode: Kanto", "Numerical mode: National", "A to Z mode", "Type mode", "Lightest mode", "Smallest mode"]) {
    assert(dexJs.includes('"' + label + '"'), label);
  }
}

// The Bag's nine pockets (game/bag.js): Power-up, Held Items and Mega Stones
// besides FireRed's own and this game's; in battle, only those with
// something usable there.
{
  assert.deepStrictEqual(Bag.POCKETS, ["Items", "Medicine", "Power-up", "Poké Balls", "TMs & HMs", "Berries", "Held Items", "Mega Stones", "Key Items"]);
  for (const id of ["hp-up", "protein", "pp-up", "pp-max", "rare-candy", "adamant-mint", "health-wing", "ability-capsule", "bottle-cap", "exp-candy-s"]) {
    assert.strictEqual(Bag.pocket(id), "Power-up", id);
  }
  for (const id of ["leftovers", "choice-band", "charcoal", "smooth-rock", "light-clay", "everstone", "lucky-egg", "life-orb", "flame-plate"]) {
    assert.strictEqual(Bag.pocket(id), "Held Items", id);
  }
  for (const id of ["charizardite-x", "alakazite", "beedrillite"]) assert.strictEqual(Bag.pocket(id), "Mega Stones", id);
  for (const [id, p] of [["potion", "Medicine"], ["x-attack", "Items"], ["fire-stone", "Items"], ["nugget", "Items"], ["oran-berry", "Berries"],
    ["ultra-ball", "Poké Balls"], ["mega-ring", "Key Items"], ["tm01", "TMs & HMs"]]) assert.strictEqual(Bag.pocket(id), p, id);
  assert.deepStrictEqual(Bag.BATTLE_POCKETS, ["Items", "Medicine", "Poké Balls", "Berries"]);
  const bagJs = fs.readFileSync(path.join(root, "ui/bag-screen.js"), "utf8");
  assert(/BAG_FRAMES\[st\.pocket % 3\]/.test(bagJs) && !/POCKET_FRAMES/.test(bagJs), "every pocket shows FireRed's bag, not a recoloured one");
  const bagPng = fs.readFileSync(path.join(root, "assets/bag/bag-male.png"));
  assert.strictEqual(bagPng.readUInt32BE(20), 640, "ten bag frames");
  const battleJs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8");
  assert(/Bag\.BATTLE_POCKETS\.includes\(p\.name\)/.test(battleJs));
}

// Mega Evolution's pictures from pokeemerald-expansion: the healthbox
// indicator and the move menu's trigger.
{
  for (const f of ["mega-indicator", "mega-trigger"]) assert(fs.existsSync(path.join(root, "assets/battle-interface", f + ".png")), f);
  const battleJs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8");
  assert(/mega: \/-Mega\(-\|\$\)\/\.test/.test(battleJs) && /showTrigger\(pos, kind, alt && alt.kind\)/.test(battleJs) && /hideTrigger\(\)/.test(battleJs));
  const menusJs = fs.readFileSync(path.join(root, "ui/gba-menus.js"), "utf8");
  assert(!menusJs.includes("START: MEGA EVOLVE") && /g\.toggled\(g\.on\)/.test(menusJs) && /if \(startHeld && \["left", "right", "up", "down"\]\.includes\(k\)\)/.test(menusJs));
}

// ui/game.js: every move tutor charges (Mimic's first lesson is for a Poké Doll); the Fighting Dojo's
// rematch once you're Champion; the in-battle Summary of a Mega; the Mega
// Stones (item balls on reachable tiles, and the gifts).
{
  const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  assert(/moveTutor\("Thunder Wave", "tutorThunderWave", "Text_ThunderWave"\)/.test(gameJs) && /if \(price === undefined\) price = TUTOR_PRICE;/.test(gameJs));
  assert.deepStrictEqual([...gameJs.matchAll(/moveTutor\("([^"]+)"[^;]*null/g)].map((m) => m[1]), ["Mimic"]);
  assert(!/MoveCanOnlyBeLearnedOnce/.test(gameJs), "no tutor teaches only once");
  // The Dojo: every trainer of FireRed's Dojo, fully evolved, levels 48-52,
  // FireRed's species lines.
  const dojo = /const DOJO_REMATCH = \{([\s\S]*?)\n  \};/.exec(gameJs)[1];
  const ids = WORLD_MAPS.SaffronCity_Dojo.people.filter((p) => p.trainer).map((p) => p.trainer.id);
  assert.strictEqual(ids.length, 5);
  for (const id of ids) {
    const key = id === "TRAINER_BLACK_BELT_KOICHI" ? "[DOJO_MASTER]" : id;
    const m = new RegExp(key.replace(/[[\]]/g, "\\$&") + ": \\{\\s*team: (\\[.*?\\]\\]),").exec(dojo);
    assert(m, id + " has a rematch");
    const team = JSON.parse(m[1].replace(/'/g, '"'));
    assert(team.length >= 1);
    for (const [sp, lv] of team) {
      assert(DEX[sp] && lv >= 48 && lv <= 52, id + " " + sp);
      assert(!(EVOLUTIONS[sp] || []).length, sp + " is fully evolved");
    }
  }
  assert(/if \(!re \|\| !f\.gameClear \|\| !f\[id\] \|\| \(f\.dojoRematch && f\.dojoRematch\[id\]\)\) return null;/.test(gameJs));
  assert(/const DOJO_SECOND_LEVEL = 50;/.test(gameJs) && /f\.dojoHitmon2 = species/.test(gameJs));
  // The in-battle Summary: a Mega's picture, stats and ability.
  assert(/const views = now\.map\(\(r, k\) => battleSummaryView\(r, mons\[k\]\)\)/.test(gameJs));
  assert(/if \(\(mon\.mega \|\| mon\.formeChanged\) && DEX\[mon\.species\]\)/.test(gameJs));
  // Mega Stones.
  const balls = [...gameJs.matchAll(/\{ map: "(\w+)", x: (\d+), y: (\d+), item: "([\w-]+)"/g)].map((m) => ({ map: m[1], x: +m[2], y: +m[3], item: m[4] }));
  const gifts = [...gameJs.matchAll(/megaStoneGift\("([\w-]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(gifts.sort(), ["alakazite", "kangaskhanite", "pidgeotite"]);
  const all = new Set(balls.map((b) => b.item).concat(gifts));
  for (const id of ["beedrillite", "pidgeotite", "alakazite", "slowbronite", "kangaskhanite", "pinsirite", "scizorite", "gyaradosite", "aerodactylite",
    "mewtwonite-x", "mewtwonite-y", "clefablite", "victreebelite", "raichunite-x", "raichunite-y", "starminite", "dragoninite"]) {
    assert(all.has(id), id + " can be found");
    assert.strictEqual(ITEMS[id].category, "mega-stones", id);
  }
  for (const b of balls) {
    const m = World.map(b.map);
    // (Gary's and Giovanni's, for an old save, where they stood before they went.)
    const gone = ["FLAG_HIDE_SILPH_RIVAL", "FLAG_HIDE_VIRIDIAN_GIOVANNI"];
    assert(!m.people.some((p) => p.x === b.x && p.y === b.y && !gone.includes(p.flag)), b.item + ": nobody stands there");
    const occupied = (mp, x, y) => m.people.some((p) => p.x === x && p.y === y && !gone.includes(p.flag));
    // Reachable on foot from one of the map's doors, or from beside Mewtwo
    // (Cerulean Cave's B1F is reached by water).
    const starts = m.warps.flatMap((w) => [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dy]) => ({ map: b.map, x: w.x + dx, y: w.y + dy })));
    if (b.map === "CeruleanCave_B1F") starts.push({ map: b.map, x: 7, y: 13 });
    assert(starts.some((s) => World.walkable(s, occupied, 9999).has(b.x + "," + b.y)), b.item + " is reachable");
  }
  assert(/when: \(f\) => f\.foughtMewtwo/.test(gameJs), "Mewtwonites once Mewtwo is caught or beaten");
}
console.log("ok: Gen 7, " + GEN7 + " random battles finished (" + gen7Turns + " turns)");
console.log("ok: Gen 8, " + GEN8 + " random battles finished (" + gen8Turns + " turns)");
assert(gen9Tera > GEN9 / 2, "Terastallizing in the Gen 9 battles");
console.log("ok: Gen 9, " + GEN9 + " random battles finished (" + gen9Turns + " turns)");

// Berry picking (game/berry-picking.js): shake a tree to the meter, catch what falls.
{
  const B = BerryPicking;
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  // Every tier's berries are real items, and every berry is in a tier; a tier opens at its farming level.
  for (const t of B.TIERS) for (const id of t.berries) assert(window.ITEMS[id] && Bag.sprite(id) && Bag.description(id), id);
  const tiered = new Set(B.TIERS.flatMap((t) => t.berries));
  for (const id of Object.keys(window.ITEMS).filter((k) => /-berry$/.test(k))) assert(tiered.has(id), id + " in a tier");
  assert.strictEqual(tiered.size, 67, "Gen 3's 43 berries and the 24 since");
  assert.deepStrictEqual(B.tiersAt(1).map((t) => t.name), ["Basic"]);
  assert.deepStrictEqual(B.tiersAt(30).map((t) => t.name), ["Basic", "Restoring", "Contest", "EV-reducing"]);
  assert.strictEqual(B.tiersAt(100).length, B.TIERS.length);
  // Shakes: on the sweet spot, near it, off it, and while the tree still sways.
  const g = B.create(seq([0.5]), 1);
  const at = (target) => { while (Math.abs(B.meterAt(g.t + 1) - target) > 0.01) B.step(g, {}); };
  at(g.sweet); B.step(g, { shake: true });
  assert.strictEqual(g.events[0].quality, "perfect");
  assert.strictEqual(g.berries.filter((b) => b.kind === "ripe").length, 3, "three ripe berries");
  B.step(g, { shake: true });
  assert.strictEqual(g.events[0].quality, "over", "shaking again too soon");
  assert.strictEqual(g.berries.filter((b) => b.kind === "green").length, 3);
  // Catching: standing under a ripe berry catches it (10 points, a combo of 1);
  // a green one costs points and breaks the combo; one let fall is a miss.
  const c = B.create(seq([0.5]), 1);
  c.berries = [{ kind: "ripe", x: c.x, y: B.CATCH_Y - 1, speed: 1, wait: 0 }];
  B.step(c, {});
  assert.deepStrictEqual([c.ripe, c.score, c.combo], [1, 12, 1]);
  c.berries = [{ kind: "green", x: c.x, y: B.CATCH_Y - 1, speed: 1, wait: 0 }];
  B.step(c, {});
  assert.deepStrictEqual([c.bad, c.score, c.combo], [1, 2, 0]);
  c.berries = [{ kind: "gold", x: c.x + 60, y: B.H + 7, speed: 2, wait: 0 }];
  B.step(c, {});
  assert.strictEqual(c.misses, 1);
  // Touching you at all catches it: on your body below the basket, or walked
  // into from the side after it's passed the basket's height.
  const body = B.create(seq([0.5]), 1);
  body.berries = [{ kind: "ripe", x: body.x + 5, y: B.CATCH_Y + 15, speed: 1, wait: 0 }];
  B.step(body, {});
  assert.strictEqual(body.ripe, 1, "caught on the body");
  const side = B.create(seq([0.5]), 1);
  side.berries = [{ kind: "ripe", x: side.x - 24, y: B.CATCH_Y + 10, speed: 0.1, wait: 0 }];
  for (let i = 0; i < 12 && !side.ripe; i++) B.step(side, { left: true });
  assert.strictEqual(side.ripe, 1, "walked into from the side");
  assert(!B.touches({ x: side.x + 30, y: B.CATCH_Y }, side.x), "not one well to the side");
  // 30 seconds, and 10 more every 10 farming levels.
  assert.deepStrictEqual([1, 9, 10, 25, 100].map((lv) => B.create(seq([0.5]), lv).left / 60), [30, 30, 40, 50, 130]);
  // A perfect shake adds a second (never past the full time left).
  const pf = B.create(seq([0.5]), 1);
  for (let i = 0; i < 600; i++) B.step(pf, {});
  const leftBefore = pf.left;
  while (Math.abs(B.meterAt(pf.t + 1) - pf.sweet) > 0.01) B.step(pf, {});
  const ticks = leftBefore - pf.left;
  B.step(pf, { shake: true });
  assert.strictEqual(pf.events[0].quality, "perfect");
  assert.strictEqual(B.PERFECT_BONUS, 60);
  assert.strictEqual(pf.left, leftBefore - ticks - 1 + B.PERFECT_BONUS, "a second more");
  // Time up with berries still falling: you can still move, and it's over once they're down.
  const end = B.create(seq([0.5]), 1);
  end.left = 1;
  end.berries = [{ kind: "ripe", x: 20, y: 70, speed: 1, wait: 0 }];
  B.step(end, {});
  assert(end.left === 0 && !end.over);
  const ex = end.x; B.step(end, { left: true }); assert(end.x < ex, "moving after time's up");
  B.step(end, { shake: true }); assert(!end.events.some((e) => e.type === "shake"), "no shaking after time's up");
  for (let i = 0; i < 200 && !end.over; i++) B.step(end, { left: true });
  assert(end.over && end.ripe === 1, "caught it, then over");
  // Left and right move you; time runs out after 30 seconds.
  const x0 = c.x; B.step(c, { left: true }); assert(c.x < x0 && c.facing === "left");
  const t = B.create(seq([0.5]), 1);
  for (let i = 0; i < B.FRAMES; i++) B.step(t, {});
  assert(t.over, "30 seconds");
  // Results: a berry for every 60 points (and one), less for green ones and
  // misses; XP 5 and a tenth of the score; the farming level adds berries,
  // and each gold berry brings one from the best tier.
  const r = B.result(Object.assign(B.create(seq([0.5])), { score: 300, gold: 1 }));
  assert.deepStrictEqual([r.berries, r.xp], [6, 35]);
  assert.strictEqual(B.result(Object.assign(B.create(seq([0.5])), { score: 300, bad: 12 })).berries, 3, "green ones lower the yield");
  assert.strictEqual(B.rewards(r, 1, seq([0.5])).length, 6 + 1);
  assert.strictEqual(B.rewards(r, 100, seq([0.5])).length, 12 + 1, "up to twice as many at level 100");
  const best = B.rewards(Object.assign({}, r, { berries: 0 }), 60, seq([0.5]));
  assert(B.tiersAt(60).pop().berries.includes(best[best.length - 1]), "a gold berry's is from the best tier");
  assert.deepStrictEqual(B.rewards(Object.assign({}, r, { berries: 0 }), 85, seq([0.5])), ["enigma-berry"], "the Enigma Berry from 85");
  assert(B.rewards(r, 1, Math.random).every((id) => B.TIERS[0].berries.includes(id)), "only Basic berries at level 1");
}

// Texas Hold'em (game/poker.js): hands, betting, side pots, and the regulars.
{
  const P = Poker;
  const c = (s) => s.split(" ").map((x) => ({ rank: { T: 10, J: 11, Q: 12, K: 13, A: 14 }[x[0]] || +x[0], suit: x[1] }));
  const name = (s) => P.best(c(s)).name;
  assert.strictEqual(name("AS KS QS JS TS 2H 3D"), "Royal Flush");
  assert.strictEqual(name("AS 2S 3S 4S 5S 9H 9D"), "Straight Flush, 5 high");
  assert.strictEqual(name("9S 9H 9D 4C 4D 4H 3D"), "9s full of 4s", "the best full house of two trips");
  assert.strictEqual(name("AH 2D 3C 4S 5H KD QD"), "Straight, 5 high", "ace low");
  assert.strictEqual(name("KH KD 7C 7S 2H 2D 9C"), "Two Pair, Kings and 7s", "the best two of three pairs");
  assert.strictEqual(name("AH KH 8H 4H 2H 3S 3D"), "Flush, Ace high");
  assert(P.compare(P.best(c("AH AD KC 7S 2H 3D 9C")).score, P.best(c("AH AD QC 7S 2H 3D 9C")).score) > 0, "the kicker counts");
  assert.strictEqual(P.compare(P.best(c("AH KD 2C 3S 9H TD JC")).score, P.best(c("AS KC 2D 3H 9C TS JD")).score), 0, "a split");
  // A hand: blinds, and the big blind gets its option before the flop.
  const rng = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const t = P.create({ chips: 200, rng });
  t.button = 2;   // (it moves on to seat 3: you are the small blind)
  P.startHand(t);
  assert.deepStrictEqual(t.blinds, [0, 1]);
  assert.deepStrictEqual([t.seats[0].bet, t.seats[1].bet, t.toAct], [5, 10, 2]);
  P.act(t, { type: "call" }); P.act(t, { type: "call" }); P.act(t, { type: "call" });
  assert.strictEqual(t.toAct, 1, "the big blind's option");
  assert(P.options(t).canCheck && P.options(t).raiseTo === 20);
  P.act(t, { type: "check" });
  assert.deepStrictEqual([t.street, t.board.length, P.pot(t)], ["flop", 3, 40]);
  // Bets are 20 on the turn; four bets a round at most.
  P.act(t, { type: "check" }); P.act(t, { type: "check" }); P.act(t, { type: "check" }); P.act(t, { type: "check" });
  assert.strictEqual(t.street, "turn");
  P.act(t, { type: "raise" });
  assert.strictEqual(t.currentBet, 20, "a turn bet is 20");
  P.act(t, { type: "raise" }); P.act(t, { type: "raise" }); P.act(t, { type: "raise" });
  assert(!P.options(t).canRaise, "capped at four bets");
  // Everyone else folds: the last one in takes the pot without a showdown.
  while (t.street !== "done") P.act(t, { type: t.seats[t.toAct].bet === t.currentBet ? "check" : "fold" });
  assert(!t.result.showdown && t.result.winners.length === 1);
  assert.strictEqual(t.seats.reduce((n, s) => n + s.chips, 0), 200 + 3 * t.stakes.buyIn, "no chips made or lost");
  // Side pots: you go all in for 15 with aces; the main pot (15 from each of
  // four) is yours, the 15 more the others put in goes to the best of them.
  const s = P.create({ chips: 15, rng });
  s.button = 2; P.startHand(s);   // (you: small blind; seat 1: big blind; seat 2 first)
  s.seats[0].cards = c("AS AH"); s.seats[1].cards = c("KS KH"); s.seats[2].cards = c("QS QH"); s.seats[3].cards = c("2C 7D");
  s.deck = c("3C 4D 9H JS 8C").concat(s.deck);
  P.act(s, { type: "raise" });   // seat 2 to 20
  P.act(s, { type: "call" });    // seat 3
  P.act(s, { type: "call" });    // you, all in for 10 more
  assert(s.seats[0].allIn && s.seats[0].total === 15);
  P.act(s, { type: "call" });    // seat 1
  while (s.street !== "done") P.act(s, { type: "check" });
  assert.deepStrictEqual(s.result.won, [60, 15, 0, 0]);
  assert.deepStrictEqual(s.result.pots.map((p) => [p.amount, p.winners]), [[60, [0]], [15, [1]]]);
  // The regulars play: hundreds of hands without getting stuck, chips kept whole.
  const r = P.create({ chips: 300, rng });
  for (let h = 0; h < 40; h++) {
    if (r.seats[0].chips <= 0) r.seats[0].chips = 300;
    P.startHand(r);
    const before = r.seats.reduce((n, x) => n + x.chips + x.total, 0);
    for (let k = 0; k < 200 && r.street !== "done"; k++) P.act(r, P.decide(r, 30));
    assert.strictEqual(r.street, "done", "hand " + h + " finished");
    assert.strictEqual(r.seats.reduce((n, x) => n + x.chips, 0), before, "hand " + h + ": chips whole");
  }
  const e = P.create({ chips: 100, rng }); P.startHand(e); e.seats[e.toAct].cards = c("AS AH");
  assert(P.equity(e, e.toAct, 300) > 0.5, "aces are favourites against three");
}

// Blackjack (game/blackjack.js): totals, the deal, doubling, splitting, payouts.
{
  const B = Blackjack;
  const c = (s) => s.split(" ").map((x) => ({ rank: { T: 10, J: 11, Q: 12, K: 13, A: 14 }[x[0]] || +x[0], suit: x[1] || "S" }));
  assert.deepStrictEqual(B.value(c("AS 6H")), { total: 17, soft: true });
  assert.deepStrictEqual(B.value(c("AS 6H 9C")), { total: 16, soft: false }, "the Ace drops to 1");
  assert.deepStrictEqual(B.value(c("AS AH 9C")), { total: 21, soft: true });
  assert(B.isBlackjack(c("AS KH")) && !B.isBlackjack(c("7S 7H 7C")));
  // A table with a stacked shoe: yours, the dealer's, yours, the dealer's, then draws.
  const table = (cards, coins) => { const g = B.create({ coins: coins || 100, rng: () => 0.5 }); g.shoe = c(cards).concat(g.shoe); return g; };
  // (The deal goes yours, the dealer's, yours, the dealer's; then draws in order.)
  let g = table("TS 9H 7C 8D 5S");   // you 10+7, the dealer 9+8
  B.deal(g, 10);
  assert.deepStrictEqual([g.coins, g.phase, B.options(g).double, B.options(g).split], [90, "player", true, false]);
  B.act(g, "stand");
  assert.deepStrictEqual([g.result[0].outcome, g.coins, g.dealer.length], ["push", 100, 2], "17 against 17: a push");
  g = table("AS 9H KH 7D");          // Blackjack against 16
  B.deal(g, 10);
  assert.deepStrictEqual([g.phase, g.result[0].outcome, g.coins], ["done", "blackjack", 115], "3 to 2");
  g = table("TS AH 9H KD");          // the dealer's Blackjack, checked first
  B.deal(g, 10);
  assert.deepStrictEqual([g.phase, g.result[0].outcome, g.coins], ["done", "lose", 90]);
  g = table("5S TH 6H 7D TC");       // 11: double down, a ten: 21 against 17
  B.deal(g, 10); B.act(g, "double");
  assert.deepStrictEqual([g.hands[0].bet, g.hands[0].cards.length, g.result[0].outcome, g.coins], [20, 3, "win", 120]);
  g = table("8S TH 8H 6D 9C TC KS"); // split 8s: 17 and 18; the dealer's 16 draws a King and busts
  B.deal(g, 10); B.act(g, "split");
  assert.deepStrictEqual(g.hands.map((h) => B.value(h.cards).total), [17, 18]);
  assert(!B.options(g).split, "one split");
  B.act(g, "stand"); B.act(g, "stand");
  assert.deepStrictEqual([g.result.map((r) => r.outcome), g.coins], [["win", "win"], 120]);
  g = table("TS TH 6H 7D KC");       // 16, hit, bust: the dealer doesn't draw
  B.deal(g, 10); B.act(g, "hit");
  assert.deepStrictEqual([g.result[0].outcome, g.dealer.length, g.coins], ["bust", 2, 90]);
  g = table("AS TH AH 7D 2C 9S");    // split Aces: one card each, then it's the dealer's
  B.deal(g, 10); B.act(g, "split");
  assert.strictEqual(g.phase, "done", "split Aces take one card each");
  assert.deepStrictEqual(g.result.map((r) => r.outcome), ["lose", "win"], "13 and 20 against 17");
  // Hands of basic strategy lose about half a percent of what's bet.
  const sim = B.create({ coins: 1e6, rng: (() => { let x = 5; return () => (x = (x * 16807) % 2147483647) / 2147483647; })() });
  for (let r = 0; r < 4000; r++) {
    B.deal(sim, 10);
    while (sim.phase === "player") { const v = B.value(sim.hands[sim.active].cards).total, up = B.points(sim.dealer[0]); B.act(sim, v >= 17 || (v >= 13 && up <= 6) ? "stand" : "hit"); }
  }
  assert(Math.abs(1e6 - sim.coins) < 4000 * 10 * 0.06, "close to even");
}

// Mahjong (game/mahjong.js): hands, scores, and a whole game between the AIs.
{
  const M = Mahjong;
  const hand = [1, 2, 3, 4, 5, 6, 11, 12, 13, 23, 24, 25, 13, 13];
  assert.strictEqual(M.shanten(hand, 0), -1, "a complete hand");
  assert.deepStrictEqual(M.waits([1, 2, 4, 5, 6, 11, 12, 13, 23, 24, 25, 13, 13], 0), [0, 3], "waiting on 1 and 4 man");
  const tp = M.score({ tiles: hand, melds: [] }, { dora: [33], ura: [], win: 3, tsumo: false, seatWind: 28, roundWind: 27 });
  assert.deepStrictEqual([tp.yaku.map((y) => y[0]).join(","), tp.han, tp.fu], ["Tanyao,Pinfu", 2, 30], "tanyao pinfu");
  assert.strictEqual(M.score({ tiles: [0, 0, 0, 8, 8, 8, 9, 9, 9, 17, 17, 17, 27, 27], melds: [] }, { dora: [33], win: 27, tsumo: true, seatWind: 28, roundWind: 27 }).name, "Yakuman", "four concealed triplets");
  assert.strictEqual(M.score({ tiles: [1, 2, 3, 4, 5, 6, 11, 12, 13, 23, 24, 25, 30, 30], melds: [] }, { dora: [33], win: 5, tsumo: false, seatWind: 28, roundWind: 27 }), null, "no yaku, no win");
  const g = M.create({ rng: mulberry32(7) });
  let hands = 0;
  while (!g.over && hands < 12) {
    M.startHand(g);
    for (let guard = 0; g.phase !== "end"; guard++) {
      assert(guard < 1000, "a hand ends");
      if (g.phase === "discard") M.aiTurn(g);
      else for (const seat of Object.keys(g.claims)) if (g.phase === "claim" && g.claims[seat] && g.claims[seat].answer === undefined) M.aiClaim(g, +seat);
    }
    hands++;
    assert.strictEqual(g.players.reduce((n, p) => n + p.points, 0) + g.sticks * 1000, 100000, "points kept");
  }
}

// The Game Corner's card room (data/card-room.js): through the wall and back, the tables and their chairs.
{
  const room = WORLD_MAPS.CeladonCity_GameCorner_CardRoom, gc = WORLD_MAPS.CeladonCity_GameCorner;
  const door = gc.warps.findIndex((w) => w.map === "CeladonCity_GameCorner_CardRoom");
  assert(door >= 0 && gc.patches.cardroom, "a doorway in the Game Corner");
  assert(room.warps.length && room.warps.every((w) => w.map === gc.name && w.warp === door), "the mat leads back");
  assert(room.warps[gc.warps[door].warp], "the doorway leads to the mat");
  for (const s of ["Game_EventScript_PokerTable", "Game_EventScript_BlackjackTable"]) assert(room.signs.some((g) => g.script === s), s);
  for (const s of ["Game_EventScript_PokerDealer", "Game_EventScript_BlackjackDealer"]) assert(room.people.some((p) => p.script === s), s);
  assert(!room.people.some((p) => /Mahjong/.test(p.script || "")), "no mahjong dealer: its players ask you to sit in");
  const gameSrc = fs.readFileSync(path.join(__dirname, "../ui/game.js"), "utf8");
  assert(/"Want to play with us\?\\nIt costs " \+ MAHJONG_BUY_IN \+ " Coins for the buy-in\."/.test(gameSrc) && !/gives\\nyou their seat/.test(gameSrc), "the mahjong players' invitation");
  assert(/mahjongCrowd = null;/.test(gameSrc), "new mahjong players after every game");
  assert.strictEqual(SUMMARY_SCREEN.abilityText["Embody Aspect (Teal)"], "Terastal raises Speed.");
  assert(room.top && fs.existsSync(path.join(__dirname, "../assets/world/maps/CeladonCity_GameCorner_CardRoom-top.png")), "the plants' leaves over you");
  for (const [table, seats] of Object.entries(room.seats)) {
    assert.strictEqual(seats.length, 4, table);
    for (const [x, y] of seats) assert(room.signs.some((g) => Math.abs(g.x - x) + Math.abs(g.y - y) === 1), table + " chair by its table");
  }
}

// The card tables' players (game/table-players.js): trainers, with portraits.
{
  const picked = TablePlayers.pick(3, () => 0.5);
  assert.strictEqual(new Set(picked.map((p) => p.name)).size, 3, "three different trainers");
  for (const p of picked) {
    assert(/^\S.* \S+$/.test(p.name) && p.pic && require("fs").existsSync(require("path").join(__dirname, "..", "assets/sprites/trainers/front", p.pic + ".png")), p.name);
    assert(!/Leader|Elite|Champion|Rival|Rocket/.test(p.className), p.name);
  }
  assert(!TablePlayers.pick(5, Math.random, picked.map((p) => p.name)).some((p) => picked.some((q) => q.name === p.name)), "nobody twice");
  // Now and then a star: the Gym Leaders, the Elite Four, and the game's own (Red, Leaf, your rival).
  const stars = TablePlayers.stars();
  assert.strictEqual(stars.filter((p) => /^Leader /.test(p.name)).length, 8, "the eight Gym Leaders");
  assert.strictEqual(stars.filter((p) => /^Elite Four /.test(p.name)).length, 4, "the Elite Four");
  TablePlayers.setStars([{ name: "Pokémon Trainer Red", pic: "red", sprite: "red" }]);
  const starry = TablePlayers.pick(13, () => 0);
  assert(starry.every((p) => p.star) && new Set(starry.map((p) => p.name)).size === 13 && starry.some((p) => p.name === "Pokémon Trainer Red"), "all stars, once each");
  for (const p of starry) assert(require("fs").existsSync(require("path").join(__dirname, "..", "assets/sprites/trainers/front", p.pic + ".png")) && Poker.STYLES[p.style], p.name);
  assert(!TablePlayers.pick(3, () => 0.5).some((p) => p.star), "rarely");
  TablePlayers.setStars([]);
  // Poker: a trainer out of chips leaves and another sits down.
  const t = Poker.create({ chips: 100 });
  assert(t.seats.slice(1).every((s) => s.pic && Poker.STYLES[Object.keys(Poker.STYLES).find((k) => Poker.STYLES[k] === s.style)]));
  const gone = t.seats[2].name;
  t.seats[2].chips = 0;
  Poker.startHand(t);
  assert(t.seats[2].name !== gone && t.seats[2].chips + t.seats[2].total === t.stakes.buyIn && t.log.some((e) => e.type === "replace" && e.left === gone));
  // Blackjack with others at the table: everyone's hands are dealt and played
  // (basic strategy), you sit in the middle, and the coins all add up.
  const rng = (() => { let x = 9; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  const g = Blackjack.create({ coins: 500, rng, others: TablePlayers.pick(2, rng) });
  assert.deepStrictEqual([g.players.length, g.you, g.players[1].human], [3, 1, true]);
  for (let r = 0; r < 200; r++) {
    const before = g.players.reduce((n, p) => n + p.coins, 0);
    Blackjack.deal(g, 10, (away) => TablePlayers.pick(1, rng, away)[0]);
    for (let k = 0; k < 40 && g.phase === "player"; k++) Blackjack.act(g, Blackjack.options(g).human ? "stand" : Blackjack.strategy(g));
    assert.strictEqual(g.phase, "done", "round " + r);
    const bets = g.players.reduce((n, p) => n + p.result.reduce((m, x) => m + x.bet, 0), 0), paid = g.players.reduce((n, p) => n + p.result.reduce((m, x) => m + x.paid, 0), 0);
    assert.strictEqual(g.players.reduce((n, p) => n + p.coins, 0), before - bets + paid + g.log.filter((e) => e.joined).length * Blackjack.STACK, "round " + r + ": coins add up");
    if (g.coins < 10) g.coins = 500;
  }
  assert(g.players.every((p) => p.result && p.result.length >= 1));
}

// Wild held items (data/wild-items.js: FireRed's, else Emerald's; Encounters.heldItem).
{
  const W = window.WILD_ITEMS;
  assert.deepStrictEqual(W.Chansey, [null, "lucky-egg"], "FireRed's");
  assert.deepStrictEqual(W.Pikachu, ["oran-berry", "light-ball"], "none in FireRed: Emerald's");
  assert(!W.Mawile && !W.Lucario, "neither: nothing (and nothing past Gen 3)");
  for (const [sp, items] of Object.entries(W)) for (const id of items) assert(id === null || (ITEMS[id] && Bag.sprite(id)), sp + ": " + id);
  const at = (r) => () => r;
  // 45% nothing, 50% common, 5% rare; Compound Eyes 20 / 60 / 20; the same item twice, always.
  assert.deepStrictEqual([0.44, 0.45, 0.94, 0.95].map((r) => Encounters.heldItem("Pikachu", at(r))), ["", "oran-berry", "oran-berry", "light-ball"]);
  assert.deepStrictEqual([0.19, 0.2, 0.79, 0.8].map((r) => Encounters.heldItem("Pikachu", at(r), true)), ["", "oran-berry", "oran-berry", "light-ball"]);
  assert.strictEqual(Encounters.heldItem("Shuckle", at(0)), "berry-juice", "always its Berry Juice");
  assert.strictEqual(Encounters.heldItem("Chansey", at(0.5)), "", "no common item: nothing");
  assert.strictEqual(Encounters.heldItem("Mawile", at(0.99)), "");
  const lead = Object.assign(Party.create("Butterfree", 20), { ability: "Compound Eyes" });
  assert.strictEqual(Encounters.withHeldItem(Party.create("Pikachu", 5), lead, at(0.85)).item, "light-ball", "Compound Eyes");
  // Caught, it keeps what it's still holding.
  const wild = Object.assign(Party.create("Pikachu", 5), { item: "oran-berry" });
  assert.strictEqual(Party.caught(wild, { level: 5, exp: wild.exp, evs: wild.evs, happiness: 70, hp: 10, status: "", moves: [], item: "oran-berry" }, "poke-ball").item, "oran-berry");
  assert.strictEqual(Party.caught(wild, { level: 5, exp: wild.exp, evs: wild.evs, happiness: 70, hp: 10, status: "", moves: [], item: "" }, "poke-ball").item, "", "a Berry it ate is gone");
}

// Poker's stakes: the blinds, bets and everyone's buy-in go by them.
{
  const [low, mid, high] = Poker.STAKES;
  assert.deepStrictEqual([low, mid, high].map((s) => [s.buyIn, s.sb, s.bb]), [[200, 1, 2], [1000, 5, 10], [3000, 15, 30]]);
  const t = Poker.create({ chips: 200, stakes: low });
  assert(t.seats.slice(1).every((s) => s.chips === 200), "the others buy in the same");
  t.button = 2; Poker.startHand(t);
  assert.deepStrictEqual([t.seats[0].bet, t.seats[1].bet, Poker.options(t).raiseTo], [1, 2, 4]);
  const h = Poker.create({ chips: 3000, stakes: high }); h.button = 2; Poker.startHand(h);
  assert.deepStrictEqual([h.seats[0].bet, h.seats[1].bet, Poker.options(h).raiseTo], [15, 30, 60]);
}

// HGSS's walking Pokémon (ui/follower.js, ui/overworld.js's follower), Johto's
// Headbutt trees and Kurt's Apricorn Balls (ui/johto-field.js), and the
// Apricorn Balls' catch bonuses (engine/catching.js).
{
  const FD = window.JOHTO_FOLLOWERS, HB = window.JOHTO_HEADBUTT;
  assert(FD && HB, "the follower's and Headbutt's data are in data/johto-maps.js");
  for (const n of ["25", "152", "249", "201-b", "479-heat", "3-f", "650", "906"]) assert(fs.existsSync(path.join(root, "assets/world/sprites/follow", n + ".png")), "follower sheet " + n);
  assert(FD.big.includes("249") && FD.tall.includes("249") && !FD.tall.includes("25"), "Lugia's big, and too tall indoors");
  assert.strictEqual(FD.modes.Route29, 2); assert.strictEqual(FD.modes.NewBarkTown_House, 1);
  let opt = 0;
  const sandbox = { window: { WORLD_MAPS, DEX, ITEMS, Party, Player, JOHTO_FOLLOWERS: FD, JOHTO_HEADBUTT: HB, LEARNSETS_GEN6, GameOptions: { get: () => ({ follower: opt }) } } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "ui/follower.js"), "utf8"), sandbox, { filename: "ui/follower.js" });
  vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-field.js"), "utf8"), sandbox, { filename: "ui/johto-field.js" });
  const p = Player.create("RED", 0);
  p.party = [Object.assign(Party.create("Pikachu", 20), { hp: 0 }), Party.create("Lugia", 50)];
  const F = sandbox.window.Follower.create({ player: () => p });
  assert.strictEqual(F.look("Route29").sprite, "follow/249", "the first that can still fight");
  assert.strictEqual(F.look("Route29").width, 64);
  assert.strictEqual(F.look("NewBarkTown_House"), null, "too tall to come in");
  assert(F.look("PalletTown") && !F.look("PalletTown_PlayersHouse_1F"), "in Kanto too, but not tall ones indoors");
  opt = 1; assert.strictEqual(F.look("Route29"), null, "FOLLOWER OFF");
  opt = 0;
  p.party[0].hp = 10; p.party[0].gender = "F";
  assert.strictEqual(F.look("NewBarkTown_House").sprite, "follow/25-f", "a female Pikachu's own look, indoors too");
  assert.strictEqual(F.sheet(Party.create("Rotom-Heat", 20)), "479-heat");
  // Headbutt: Route 29's first tree is a rare one for an ID ending in 2, and nothing for one ending in 0.
  const t0 = HB.maps.Route29.trees[0][0];
  const JF = (id) => sandbox.window.JohtoField.create({ player: () => Object.assign(p, { trainerId: id }) });
  assert(JF(12).headbuttTree("Route29", t0[0], t0[1]) && !JF(12).headbuttTree("Route29", 0, 0));
  const tree = { m: HB.maps.Route29, i: 0, secret: false };
  assert.strictEqual(JF(12).treeTable(tree), HB.maps.Route29.rare);
  assert.strictEqual(JF(10).treeTable(tree), null);
  assert(HB.learners.includes("Pikachu") && HB.learners.includes("Chikorita"), "the tutor teaches HGSS's learners");
  // Kurt: three Red Apricorns, three Level Balls.
  const bag = { "red-apricorn": 3 }, js = {};
  const K = sandbox.window.JohtoField.create({ player: () => p, johtoState: () => js, choose: async () => 0, quantity: async () => 3, itemName: (id) => id,
    takeItem: (id, n) => { if ((bag[id] | 0) < n) return false; bag[id] -= n; return true; } });
  p.bag = bag;
  (async () => {
    assert.strictEqual(await K.kurt("GetTotalApricornCount"), 3);
    assert.strictEqual(await K.kurt("ScrCmd_739"), 3);
    assert.deepStrictEqual([await K.kurt("ScrCmd_735"), await K.kurt("ScrCmd_737"), bag["red-apricorn"]], [3, "level-ball", 0]);
    await K.kurt("ClearKurtApricorn");
    assert.strictEqual(await K.kurt("ScrCmd_735"), 0);
  })().catch((e) => { console.error(e); process.exit(1); });
  for (const b of Object.values(sandbox.window.JohtoField.KURT_BALLS)) assert(ITEMS[b] && Bag.sprite(b), b);
  // HGSS's Apricorn Box (ui/apricorn-box.js): Kurt's Apricorns chosen on it when it's there, and the Bag opens it.
  {
    const bag2 = { "blue-apricorn": 5 }, js2 = {};
    const K2 = sandbox.window.JohtoField.create({ player: () => Object.assign({}, p, { bag: bag2 }), johtoState: () => js2, apricornBox: async () => ({ colour: "blue", id: "blue-apricorn", n: 4 }),
      takeItem: (id, n) => { if ((bag2[id] | 0) < n) return false; bag2[id] -= n; return true; } });
    (async () => {
      assert.strictEqual(await K2.kurt("ScrCmd_739"), 4);
      assert.deepStrictEqual([await K2.kurt("ScrCmd_737"), bag2["blue-apricorn"]], ["lure-ball", 1]);
    })().catch((e) => { console.error(e); process.exit(1); });
    const box = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/apricorn-box.js"), "utf8"), box, { filename: "ui/apricorn-box.js" });
    const AB = box.window.ApricornBox;
    assert.deepStrictEqual(Array.from(AB.counts({ "red-apricorn": 3, "black-apricorn": 120 })), [3, 0, 0, 0, 0, 0, 99]);
    assert(AB.SPOTS.length === 7 && AB.spotAt(27, 17) === 0 && AB.spotAt(75, 33) === 1 && AB.spotAt(50, 145) === 7 && AB.spotAt(200, 20) === -1, "the box's holes, top to bottom in turn, and its plate");
    assert(fs.existsSync(path.join(root, "assets/apricorn-box/box.png")));
    const gj = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/"unown-report", "apricorn-box"\]\.concat\(RODS\)/.test(gj) && /item === "apricorn-box"\) await apricornBox\("view"\)/.test(gj) && /apricornBox: \(\) => apricornBox\("give"\)/.test(gj), "the Bag and Kurt open the Apricorn Box");
  }
  const scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8"), owJs = fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8");
  assert(/case "ScrCmd_739"/.test(scriptJs) && /case "WaitFollowingPokemonMovement"/.test(scriptJs) && /FLAG_DAILY_/.test(scriptJs), "Kurt's and the follower's script commands");
  assert(/---------- The follower Pokémon/.test(owJs) && /type: "follower"/.test(owJs) && /type: "headbutt"/.test(owJs));
  // The Apricorn Balls: only for these, nothing else changes.
  const tgt = { species: "Snorlax", level: 10, gender: "F" };
  assert.strictEqual(Catching.ballBonus("level-ball", { target: tgt, user: { species: "Pikachu", level: 40 } }), 8);
  assert.strictEqual(Catching.ballBonus("level-ball", { target: tgt, user: { species: "Pikachu", level: 10 } }), 1);
  assert.strictEqual(Catching.ballBonus("lure-ball", { target: tgt, fishing: true }), 3);
  assert.strictEqual(Catching.ballBonus("lure-ball", { target: tgt }), 1);
  assert.strictEqual(Catching.ballBonus("moon-ball", { target: { species: "Clefairy", level: 5 } }), 4);
  assert.strictEqual(Catching.ballBonus("love-ball", { target: tgt, user: { species: "Snorlax", level: 5, gender: "M" } }), 8);
  assert.strictEqual(Catching.ballBonus("love-ball", { target: tgt, user: { species: "Snorlax", level: 5, gender: "F" } }), 1);
  assert(Catching.ballBonus("heavy-ball", { target: tgt }) > 1 && Catching.ballBonus("heavy-ball", { target: { species: "Pidgey" } }) < 1, "by weight");
  assert.strictEqual(Catching.ballBonus("fast-ball", { target: { species: "Jolteon" } }), 4);
  assert.strictEqual(Catching.ballBonus("poke-ball", { target: tgt, fishing: true, user: { level: 99 } }), 1);
}

// The game's clock (Player.gameTime: no real-time clock): an hour each 100 steps, a day each 2,400,
// a new game on a Monday at 10:00; day and night evolutions go by it; and Johto's encounters
// that HGSS has by the time of day are any of their morning's, day's and night's.
{
  const p = Player.create("RED", 0), t = Player.gameTime(p);
  assert.deepStrictEqual([t.day, t.weekday, t.hour, t.timeOfDay], [0, 1, 10, "day"]);
  Player.advanceClock(p, 1400);
  assert.deepStrictEqual([Player.gameTime(p).day, Player.gameTime(p).hour, Player.gameTime(p).timeOfDay], [1, 0, "night"]);
  assert(Player.load(JSON.parse(Player.serialize(p))).player.clockSteps === 2400, "the clock's in the save");
  const slot = { species: "Pidgey", morning: "Ledyba", night: "Hoothoot", min: 2, max: 2 }, seen = new Set();
  for (let i = 0; i < 60; i++) seen.add(World.pickWild({ wild: { rate: 20, slots: Array(12).fill(slot) } }, Math.random).species);
  assert.deepStrictEqual([...seen].sort(), ["Hoothoot", "Ledyba", "Pidgey"], "any of the slot's Pokémon, whatever the time");
  for (const f of ["game/world.js", "game/evolution.js", "ui/johto-script.js", "ui/follower.js"]) assert(!/new Date\(\)\.get(Hours|Day)|toDateString/.test(fs.readFileSync(path.join(root, f), "utf8")), f + " has no real-time clock");
  // A form's name is its species' (Marowak-Alola is a Marowak), but for names with a hyphen of their own.
  assert.deepStrictEqual(["Marowak-Alola", "Necrozma-Dusk-Mane", "Mr. Mime-Galar", "Venusaur-Mega", "Porygon-Z", "Ho-Oh", "Nidoran-F"].map(Party.speciesName),
    ["Marowak", "Necrozma", "Mr. Mime", "Venusaur", "Porygon-Z", "Ho-Oh", "Nidoran♀"]);
  assert.strictEqual(Party.displayName(Party.create("Marowak-Alola", 30)), "Marowak");
  // The Bug-Catching Contest: once each time you beat the Elite Four, not by the weekday.
  const scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8"), gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  assert(/const contestWeekday = /.test(scriptJs) && /s\.contestRound = \(s\.contestRound \|\| 0\) \+ 1; johto\.setFlag\("FLAG_DAILY_DID_BUG_CONTEST", false\)/.test(gameJs));
}
