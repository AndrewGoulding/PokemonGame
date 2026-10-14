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

for (const name of ["TYPE_CHART", "NATURES", "DEX", "MOVES", "ABILITIES", "ITEMS", "LEARNSETS_GEN6",
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
  assert.strictEqual(Bag.pocket("great-ball"), "Poké Balls");
  assert.strictEqual(Bag.pocket("super-potion"), "Medicine");
  assert.strictEqual(Bag.pocket("oran-berry"), "Berries");
  assert.strictEqual(Bag.pocket("fire-stone"), "Items");
  assert.strictEqual(Bag.sellPrice("potion"), 150);
  assert.deepStrictEqual(Bag.martStock(5).map((s) => s.item).slice(0, 2), ["poke-ball", "potion"]);
  assert(!Bag.martStock(5).some((s) => s.item === "ultra-ball") && Bag.martStock(25).some((s) => s.item === "ultra-ball"));
  for (const { item } of Bag.martStock(100)) {
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
  assert.strictEqual(p.boxes[0].length, 1, "the seventh goes to the PC");
  assert(Player.hasCaught(p, "Pidgey"));
  assert.strictEqual(Player.withdraw(p, 0, 0), "Your party is full.");
  assert.strictEqual(Player.deposit(p, 0, 0), null);
  assert.strictEqual(Player.withdraw(p, 0, 0), null);
  p.party.forEach((r, i) => { r.hp = i === 0 ? 10 : 0; });
  assert(/no Pokémon left/.test(Player.deposit(p, 0, 1)), "can't deposit the last healthy Pokémon");

  assert(!Player.removeItem(p, "ultra-ball"));
  Player.addItem(p, "ultra-ball", 2);
  assert(Player.removeItem(p, "ultra-ball", 2) && !("ultra-ball" in p.bag));

  // PC item storage starts with a Potion.
  assert.deepStrictEqual(p.pcItems, { potion: 1 });
  assert(Player.withdrawItem(p, "potion", 1) && !("potion" in p.pcItems));
  assert.strictEqual(p.bag.potion, Player.STARTING_BAG.potion + 1);
  assert(!Player.withdrawItem(p, "potion", 1), "nothing left to withdraw");
  assert(Player.depositItem(p, "potion", 2) && p.pcItems.potion === 2);
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
  // X and Y's TM01-TM100 and HM01-HM05, plus ORAS's Secret Power and HM07 Dive.
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
  XY.forEach((move, i) => assert.strictEqual(Bag.machineMove("tm" + String(i + 1).padStart(2, "0")), move, "TM" + (i + 1)));
  ["Cut", "Fly", "Surf", "Strength", "Waterfall"].forEach((move, i) => assert.strictEqual(Bag.machineMove("hm0" + (i + 1)), move));
  assert.strictEqual(Bag.machineMove("tm101"), "Secret Power");
  assert.strictEqual(Bag.machineMove("hm07"), "Dive");
  assert(!Bag.machines().includes("hm06"), "ORAS's HM06 would be a second Rock Smash");
  assert.strictEqual(Bag.machines().length, 107);
  // Every machine move is something Pokémon learn by TM in the Gen 6 learnsets, and vice versa.
  const tmMoves = new Set();
  for (const l of Object.values(LEARNSETS_GEN6)) for (const m of l.tm || []) tmMoves.add(m);
  assert.deepStrictEqual([...new Set(Bag.machines().map(Bag.machineMove))].sort(), [...tmMoves].sort());
  assert.strictEqual(Bag.name("tm24"), "TM24 Thunderbolt");
  assert.strictEqual(Bag.name("tm101"), "TM101 Secret Power");
  assert.deepStrictEqual(Bag.machines().slice(99, 102), ["tm100", "tm101", "hm01"]);
  const oldSave = Object.assign(Player.create("T"), { party: [Party.create("Pidgey", 5, { rng })], bag: { "tm94-oras": 1 } });
  delete oldSave.pcItems;
  assert.deepStrictEqual(Player.load(JSON.parse(JSON.stringify(oldSave))).player.pcItems, { potion: 1 }, "old saves get the PC Potion");
  assert.deepStrictEqual(Player.load(oldSave).player.bag, { tm101: 1, "exp-share": 1 }, "old saves get TM101 and the Exp. Share");
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
  assert(Bag.canUseOn(c, "tm101") && !Bag.canUseOn(c, "hm07"));
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
  assert(fs.existsSync(path.join(root, "assets/world/sprites/player_red.png")));
  assert.deepStrictEqual([WORLD_MAPS.PalletTown.width, WORLD_MAPS.PalletTown.height], [24, 20]);

  const at = (r) => (r.warp ? r.warp : r).map + " " + (r.warp ? r.warp : r).x + "," + (r.warp ? r.warp : r).y;
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
  // Route 1 leads on to Viridian City; Route 2 and Route 22 aren't built yet.
  assert.strictEqual(at(World.step({ map: "Route1", x: 12, y: 0 }, "up")), "ViridianCity 24,39");
  assert.strictEqual(at(World.step({ map: "ViridianCity", x: 24, y: 39 }, "down")), "Route1 12,0");
  assert.strictEqual(World.step({ map: "ViridianCity", x: 22, y: 0 }, "up").unbuilt, "MAP_ROUTE2");
  assert.strictEqual(World.step({ map: "ViridianCity", x: 0, y: 12 }, "left").unbuilt, "MAP_ROUTE22");
  // Viridian's buildings: in through each door and back out.
  for (const [door, inside_] of [["26,27", "ViridianCity_PokemonCenter_1F"], ["36,20", "ViridianCity_Mart"],
    ["25,19", "ViridianCity_School"], ["25,12", "ViridianCity_House"]]) {
    const [x, y] = door.split(",").map(Number);
    const r = World.step({ map: "ViridianCity", x, y }, "up");
    assert.strictEqual(r.warp && r.warp.map, inside_, "door at " + door);
    const back = World.step({ map: inside_, x: r.warp.x, y: r.warp.y }, "down");
    assert.strictEqual(at(back), "ViridianCity " + x + "," + (y - 1));
  }
  assert(!World.step({ map: "ViridianCity", x: 36, y: 11 }, "up").warp, "the Gym (not built) stays shut");
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
  assert(WORLD_MAPS.PalletTown.people.some((p) => p.localId === "LOCALID_PALLET_PROF_OAK"));
  for (const id of ["LOCALID_OAKS_LAB_PROF_OAK", "LOCALID_OAKS_LAB_RIVAL"]) assert(WORLD_MAPS.PalletTown_ProfessorOaksLab.people.some((p) => p.localId === id));
  assert(fs.existsSync(path.join(root, "assets/world/sprites/player_red_run.png")), "running sprite sheet");

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

  // Saves: a new game starts in the bedroom with no Pokémon; old saves appear outside the house.
  const fresh = Player.load(JSON.parse(Player.serialize(Player.create("Leaf", "green")))).player;
  assert.strictEqual(fresh.location.map, "PalletTown_PlayersHouse_2F");
  assert.strictEqual(fresh.party.length, 0);
  assert.strictEqual(fresh.look, "green");
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

console.log("ok: loaded " + headless.length + " scripts, " + BATTLES + " random battles finished (" + turns + " turns), AI beat random moves in " + aiWinRate + "% of games");
