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
      let aiTeam = RandomTeam.team(3, { rng: teamRng }), otherTeam = RandomTeam.team(3, { rng: teamRng });
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
    p1: { name: "P", team: [{ species: "Charmander", level: 15, exp: Experience.expForLevel(group, 16) - 5, hp: 30,
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
  assert.strictEqual(mon.level, 16);
  assert(mon.leveledUp && mon.maxhp > maxBefore, "stats should go up on level-up");
  assert(battle.events.some((e) => e[0] === "-exp" && e[2] === 87));
  assert(battle.events.some((e) => e[0] === "-levelup" && e[2] === 16));
  assert(battle.events.some((e) => e[0] === "-trylearn" && e[2] === "Dragon Rage"), "should offer Dragon Rage at 16");
  assert(battle.replaceMove("p1", 0, 1, "Dragon Rage"));
  assert.deepStrictEqual(mon.moves.map((m) => m.name), ["Scratch", "Dragon Rage", "Ember", "Smokescreen"]);
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
  assert.deepStrictEqual(learned, ["Wing Attack"]);
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
  for (let i = 0; i < 12; i++) if (Bag.canUseOn(r, "protein")) Bag.useOn(r, "protein");
  assert.strictEqual(r.evs.atk, 100, "vitamins stop at 100 EVs");

  // Rare Candy: a level, the new level's moves, and friendship.
  const c = Party.create("Charmander", 15, { rng });
  const happy = c.happiness;
  assert.deepStrictEqual(Bag.levelUp(c), ["Dragon Rage"]);
  assert.strictEqual(c.level, 16);
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
  // The fishing rods are key items; the weather rocks and the like sell for Gen 6's ₽100.
  for (const rod of ["old-rod", "good-rod", "super-rod"]) assert.strictEqual(Bag.pocket(rod), "Key Items", rod);
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
  assert.strictEqual(p.boxes.length, 14);
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

  // Saves from before FireRed's PC: 8 packed boxes become 14 of 30 slots.
  {
    const old = JSON.parse(Player.serialize(p));
    old.version = 2; old.boxes = [[p.party[0]]]; delete old.boxNames; delete old.boxWallpapers;
    const { player: o } = Player.load(old);
    assert.strictEqual(o.boxes.length, 14);
    assert.strictEqual(o.boxes[0][0].species, "Pidgey");
    assert.strictEqual(o.boxes[0][1], null);
    assert.deepStrictEqual([o.boxNames[13], o.boxWallpapers[5]], ["BOX14", 1]);
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
  assert.strictEqual(Bag.machines().length, 118);
  assert(!ITEMS.tm108 && !ITEMS.hm12, "no machines past TM107 and HM11");
  // Every move Pokémon learn by machine in Gen 6 is a TM or HM here; the
  // machines Gen 6 had none for (Bullet Seed, Whirlpool, Defog, Rock Climb)
  // take their compatibility from other generations.
  const tmMoves = new Set();
  for (const l of Object.values(LEARNSETS_GEN6)) for (const m of l.tm || []) tmMoves.add(m);
  const machineMoves = Bag.machines().map(Bag.machineMove);
  for (const m of tmMoves) assert(machineMoves.includes(m), "no machine for " + m);
  assert.deepStrictEqual(machineMoves.filter((m) => !tmMoves.has(m)), ["Bullet Seed", "Water Pulse", "Shock Wave", "Giga Drain", "Iron Tail", "Focus Punch", "Skill Swap", "Snatch", "Whirlpool", "Defog", "Rock Climb"]);
  for (const m of ["Whirlpool", "Defog", "Rock Climb", "Bullet Seed"]) assert(MACHINE_LEARNERS[m].length > 50, "who can use " + m);
  assert(!MACHINE_LEARNERS.Thief, "TMs Gen 6 had keep Gen 6's compatibility");
  assert(Bag.canUseOn(Party.create("Oddish", 20, { rng }), "tm100") && !Bag.canUseOn(Party.create("Pidgey", 20, { rng }), "tm100"), "Bullet Seed: Oddish yes, Pidgey no");
  assert.strictEqual(Bag.name("tm100"), "TM100 Bullet Seed");
  // The move tutors teach as in FireRed: Charmander can learn Mega Punch.
  assert(TUTOR_LEARNERS["Mega Punch"].includes("Charmander") && TUTOR_LEARNERS["Seismic Toss"].includes("Charmander"));
  // Escape Ropes work where FireRed allows escaping.
  assert.deepStrictEqual(Object.keys(WORLD_MAPS).filter((m) => WORLD_MAPS[m].allowEscaping), ["ViridianForest", "MtMoon_1F", "MtMoon_B1F", "MtMoon_B2F",
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
    ["Monean", "Liptoo", "Weepth", "Dilford", "Scufib", "Rixy", "Viapois"].map((c) => "SevenIsland_TanobyRuins_" + c + "Chamber")));
  assert(WORLD_MAPS.MtMoon_1F.people.some((p) => p.item === "tm100"), "FireRed's TM09 in Mt. Moon is TM100 Bullet Seed here");
  assert(Bag.canUseOn(Party.create("Gyarados", 30, { rng }), "hm06"), "Gyarados can use Whirlpool");
  assert(Bag.canUseOn(Party.create("Pidgeot", 30, { rng }), "hm10"), "Pidgeot can use Defog");
  assert(Bag.canUseOn(Party.create("Geodude", 30, { rng }), "hm11"), "Geodude can use Rock Climb");
  assert(!Bag.canUseOn(Party.create("Pidgeot", 30, { rng }), "hm11"), "Pidgeot can't use Rock Climb");
  assert.strictEqual(Bag.name("tm24"), "TM24 Thunderbolt");
  assert.strictEqual(Bag.name("tm99"), "TM99 Secret Power");
  assert.strictEqual(Bag.name("hm11"), "HM11 Rock Climb");
  assert.deepStrictEqual(Bag.machines().slice(98, 109), ["tm99", "tm100", "tm101", "tm102", "tm103", "tm104", "tm105", "tm106", "tm107", "hm01", "hm02"]);
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
  assert.deepStrictEqual(Player.load(oldSave).player.bag, { tm99: 1, "exp-share": 1, "explorer-kit": 1 },
    "old saves get Secret Power, the Exp. Share and the Explorer Kit");
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
  // Stairs.
  assert.strictEqual(at(World.step({ map: "PalletTown_PlayersHouse_1F", x: 9, y: 2 }, "right")), "PalletTown_PlayersHouse_2F 10,2");
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

// The player character: the custom one (Red and Leaf are rivals), with every
// picture the game shows; the rival is Gary.
{
  assert.deepStrictEqual(Object.keys(Player.LOOKS), ["custom"]);
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

// Moves learned at the same level come in the games' order
// (tools/order-learnsets.js): a new Charmander knows Scratch, then Growl.
{
  const Party = window.Party;
  assert.deepStrictEqual(Party.create("Charmander", 5).moves.map((m) => m.name), ["Scratch", "Growl"]);
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
    assert(T.mapSections[name] && (onMap(T.mapSections[name]) || ["UNDERGROUND_PATH", "UNDERGROUND_PATH_2", "S_S_ANNE", "ROCKET_HIDEOUT", "SILPH_CO",
      "POKEMON_LEAGUE", "EMBER_SPA", "THREE_ISLE_PATH", "ROCKET_WAREHOUSE", "TRAINER_TOWER_2", "TANOBY_KEY"].includes(T.mapSections[name]) || /_CHAMBER$/.test(T.mapSections[name])), name + " is on the Town Map");
  }
  // The Sevii Islands' maps: One, Two and Three Island on the first (FireRed's REGIONMAP_SEVII123).
  assert.deepStrictEqual(T.sevii.map((R) => [R.id, R.map.length, R.map[0].length]), [["SEVII_123", 15, 22], ["SEVII_45", 15, 22], ["SEVII_67", 15, 22]]);
  assert(onGrid(T.sevii[0], "ONE_ISLAND") && onGrid(T.sevii[0], "THREE_ISLE_PORT") && onGrid(T.sevii[0], "MT_EMBER") && !onGrid(T, "ONE_ISLAND"));
  for (const f of ["sevii-123", "sevii-45", "sevii-67"]) assert(fs.existsSync(path.join(__dirname, "../assets/town-map/" + f + ".png")), f);
  assert(fs.existsSync(path.join(__dirname, "../assets/town-map/kanto.png")));
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
  for (const name of named) assert(songs[name], "missing song " + name);
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
  // Every treasure is a real item with a picture, and its shape has tiles.
  for (const [item, , shape] of Mining.TREASURES) {
    assert(window.ITEMS[item] && Bag.sprite(item), item);
    assert(shape.join("").includes("x") && shape.every((row) => row.length === shape[0].length), item + " shape");
  }
  // Mining level: 1 to start, rising with treasures dug out; each level lets
  // rarer treasures be buried.
  // Levels 1-100 from mining XP: 20 a level up to 20, then 40, 60, 80 and 100.
  assert.strictEqual(Mining.MAX_LEVEL, 100);
  assert.deepStrictEqual([0, 19, 20, 380, 400, 420, 5979, 5980, 99999].map(Mining.level), [1, 1, 2, 20, 20, 21, 99, 100, 100]);
  assert.deepStrictEqual([Mining.toNext(0), Mining.toNext(25), Mining.toNext(5980)], [20, 15, null]);
  assert.deepStrictEqual(Mining.progress(25), { level: 2, into: 5, need: 20 });
  assert.deepStrictEqual(Mining.progress(5980), { level: 100, into: 0, need: 0 });
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
  const team = (n) => RandomTeam.team(n, { level: 50, rng: teamRng });
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
  assert(!Bag.isBall(item) && Bag.pocket(item) === "Items", item + " goes in Items");
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
