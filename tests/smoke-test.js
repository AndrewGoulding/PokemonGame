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

// Pokémon Stadium (Stadium Island): the Cups' rules, their opponents, the Castle's Trainers.
{
  const have = (sp) => Object.assign(Party.create(sp, 5), {});
  assert.strictEqual(Stadium.cupLevel("pika"), 16);
  assert.strictEqual(Stadium.cupLevel("petit"), 26);
  assert.strictEqual(Stadium.cupLevel("poke"), 51);
  assert.strictEqual(Stadium.cupLevel("prime"), 100);
  assert(Stadium.cupProblem("pika", [have("Charizard"), have("Pikachu"), have("Rattata")]), "a fully evolved Pokémon can't enter the Pika Cup");
  assert.strictEqual(Stadium.cupProblem("pika", [have("Pikachu"), have("Charmander"), have("Pidgey")]), null);
  assert(Stadium.cupProblem("petit", [have("Snorlax"), have("Pikachu"), have("Rattata")]), "Snorlax is too big for the Petit Cup");
  assert(Stadium.cupProblem("poke", [have("Mewtwo"), have("Pikachu"), have("Rattata")]), "no Legendaries in the Poké Cup");
  assert.strictEqual(Stadium.cupProblem("prime", [have("Mewtwo"), have("Mew"), have("Rattata")]), null);
  assert(Stadium.cupProblem("pika", [have("Pikachu"), have("Pikachu"), have("Pidgey")]), "no two of a species");
  const big = Party.create("Blastoise", 80);
  const small = Stadium.scaled("poke", big);
  assert.strictEqual(small.level, 51); assert.strictEqual(big.level, 80, "the scaled copy leaves the original alone");
  assert(small.hp === Party.maxHp(small) && Party.maxHp(small) < Party.maxHp(big));
  const people = Stadium.rivals();
  assert.strictEqual(new Set(people.map((p) => p[1])).size, 8, "eight different Trainers");
  for (const key of ["pika", "petit", "poke", "prime"]) {
    const foe = Stadium.opponent(key, 8, people[7]);
    assert.strictEqual(foe.mons.length, 3);
    assert(foe.mons.every((m) => m.level === Stadium.cupLevel(key) && m.moves.length && Stadium.eligible(key, m.species)), key + "'s opponent follows its rules");
  }
  for (let r = 0; r < 2; r++) for (let i = 0; i < STADIUM.castle[r].length; i++) {
    const t = Stadium.castleFoe(r, i, 60);
    assert(t.mons.length === 3 && t.mons.every((m) => m.level === 60) && t.name && t.pic && t.lose && t.intro, "castle Trainer " + r + "/" + i);
  }
}

// Eject Button: the holder, hit and standing, goes back to its Trainer; Red Card drags the attacker out.
for (const item of ["eject-button", "red-card"]) {
  const b = new Battle({ seed: 5,
    p1: { name: "A", team: [{ species: "Snorlax", level: 50, item, moves: ["Splash"] }, { species: "Pikachu", level: 50, moves: ["Splash"] }] },
    p2: { name: "B", team: [{ species: "Machamp", level: 50, moves: ["Karate Chop"] }, { species: "Geodude", level: 50, moves: ["Tackle"] }] } });
  b.start();
  b.choose("p1", { type: "move", move: "Splash" });
  b.choose("p2", { type: "move", move: "Karate Chop" });
  assert(b.events.some((e) => e[0] === "-enditem" && /Eject Button|Red Card/.test(e.join(" "))), item + " did not go off");
  if (item === "eject-button") assert.strictEqual(b.phase, "switch", "Eject Button asks for a switch");
  else assert.strictEqual(b.sides.p2.active.species, "Geodude", "Red Card drags Machamp out");
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

// Future Sight: foreseen, no damage that turn or the next, then it lands at
// the end of the turn after (a second one meanwhile fails); and a Dark type's immune.
{
  const battle = new Battle({
    seed: 3,
    p1: { name: "A", team: [{ species: "Alakazam", level: 50, moves: ["Future Sight", "Calm Mind"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Rest"] }] }
  });
  battle.start();
  const hp = () => battle.sides.p2.active.hp, full = hp();
  battle.choose("p1", { type: "move", move: "Future Sight" }); battle.choose("p2", { type: "move", move: "Rest" });
  assert.strictEqual(hp(), full, "Future Sight hit at once");
  assert(battle.events.some((ev) => ev[0] === "-text" && /foresaw/.test(ev[2])));
  battle.choose("p1", { type: "move", move: "Future Sight" }); battle.choose("p2", { type: "move", move: "Rest" });
  assert.strictEqual(hp(), full, "Future Sight hit a turn early");
  assert(battle.events.some((ev) => ev[0] === "-fail" && /^p1/.test(ev[1])), "a second Future Sight should fail");
  battle.choose("p1", { type: "move", move: "Calm Mind" }); battle.choose("p2", { type: "move", move: "Rest" });
  assert(hp() < full && battle.events.some((ev) => ev[0] === "-text" && /took the\nFuture Sight attack/.test(ev[2])), "Future Sight didn't land");
  const dark = new Battle({ seed: 3, p1: { name: "A", team: [{ species: "Alakazam", level: 50, moves: ["Future Sight"] }] },
    p2: { name: "B", team: [{ species: "Umbreon", level: 50, moves: ["Wish"] }] } });
  dark.start();
  for (let i = 0; i < 3; i++) { dark.choose("p1", { type: "move", move: "Future Sight" }); dark.choose("p2", { type: "move", move: "Wish" }); }
  assert(dark.events.some((ev) => ev[0] === "-immune") && dark.sides.p2.active.hp === dark.sides.p2.active.maxhp, "Umbreon should be immune");
}
// Last Resort: fails until every other move it knows has been used since it came in.
{
  const battle = new Battle({
    seed: 4,
    p1: { name: "A", team: [{ species: "Eevee", level: 50, moves: ["Last Resort", "Growl", "Tail Whip"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] }
  });
  battle.start();
  const hp = () => battle.sides.p2.active.hp, full = hp();
  const turn = (m) => { battle.choose("p1", { type: "move", move: m }); battle.choose("p2", { type: "move", move: "Splash" }); };
  turn("Last Resort"); turn("Growl"); turn("Last Resort");
  assert.strictEqual(hp(), full, "Last Resort worked too soon");
  assert.strictEqual(battle.events.filter((ev) => ev[0] === "-fail" && /^p1/.test(ev[1])).length, 2);
  turn("Tail Whip"); turn("Last Resort");
  assert(hp() < full, "Last Resort should work once Growl and Tail Whip have been used");
  const alone = new Battle({ seed: 4, p1: { name: "A", team: [{ species: "Eevee", level: 50, moves: ["Last Resort"] }] },
    p2: { name: "B", team: [{ species: "Snorlax", level: 50, moves: ["Splash"] }] } });
  alone.start();
  alone.choose("p1", { type: "move", move: "Last Resort" }); alone.choose("p2", { type: "move", move: "Splash" });
  assert(alone.events.some((ev) => ev[0] === "-fail" && /^p1/.test(ev[1])), "Last Resort alone should fail");
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
  assert.strictEqual(evo("Charmander", 20, (r) => { r.item = "eviolite"; }), null, "an Eviolite held: no evolving");
  {
    const gj = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/\.concat\(canEvolve\(player\.party\[slot\]\) \? \[\{ label: "Evolve", value: "evolve" \}\] : \[\]\)/.test(gj), "the party screen's EVOLVE, under SUMMARY");
  }
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
  // Every den can be walked up to: from its map's doors and edges, over the ledges the way they jump.
  for (const d of RaidDens.DENS) {
    const m = WORLD_MAPS[d.map], W = m.width, H = m.height, MB = World.MB;
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !m.collision[y * W + x] && !(x === d.x && y === d.y);
    const JUMP = { [MB.JUMP_SOUTH]: [0, 1], [MB.JUMP_NORTH]: [0, -1], [MB.JUMP_EAST]: [1, 0], [MB.JUMP_WEST]: [-1, 0] };
    const seen = new Set(), q = [], add = (x, y) => { if (open(x, y) && !seen.has(x + "," + y)) { seen.add(x + "," + y); q.push([x, y]); } };
    for (const w of m.warps) for (const [dx, dy] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) add(w.x + dx, w.y + dy);
    for (let x = 0; x < W; x++) { add(x, 0); add(x, H - 1); }
    for (let y = 0; y < H; y++) { add(0, y); add(W - 1, y); }
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const j = JUMP[m.behavior[(y + dy) * W + x + dx]];
        if (j && j[0] === dx && j[1] === dy) add(x + 2 * dx, y + 2 * dy); else add(x + dx, y + dy);
      }
    }
    assert([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has((d.x + dx) + "," + (d.y + dy))), "den " + d.id + " can be walked up to");
  }
  // Stars: 1 with no Badges, up to 5 with all eight; stronger Lures, more stars.
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(RaidDens.maxStars), [1, 1, 2, 2, 3, 3, 4, 4, 5]);
  // Its turn limit, more for more stars; the battle screen blows you out after it (raidTurns).
  assert.deepStrictEqual(RaidDens.TURNS.slice(1), [10, 12, 15, 20, 25]);
  assert.deepStrictEqual([RaidDens.LEVELS.slice(1), RaidDens.HP.slice(1)], [[12, 20, 35, 45, 75], [2, 3, 4, 6, 8]], "Scarlet and Violet's levels, bigger HP");
  assert(/raidTurns: opts\.raid \? RaidDens\.TURNS\[opts\.raid\]/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  assert(/battle\.raidTimedOut = true/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")));
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // A Lure 1 or 2 stars, a Super Lure 3 or 4, a Max Lure 5; past what your Badges allow, the most they do.
  const rolls = (lure, badges) => { const seen = new Set(); for (let i = 0; i < 300; i++) seen.add(RaidDens.rollStars(lure, badges, rng)); return [...seen].sort().join(); };
  assert.deepStrictEqual(["lure", "super-lure", "max-lure"].map((l) => rolls(l, 8)), ["1,2", "3,4", "5"]);
  assert.deepStrictEqual(["lure", "super-lure", "max-lure"].map((l) => rolls(l, 0)), ["1", "1", "1"]);
  assert.deepStrictEqual(["lure", "super-lure", "max-lure"].map((l) => rolls(l, 4)), ["1,2", "3", "3"]);
  assert.deepStrictEqual(["super-lure", "max-lure"].map((l) => rolls(l, 6)), ["3,4", "4"]);
  // (Every page script parses: the UI's aren't loaded by these tests otherwise.)
  for (const f of fs.readdirSync(path.join(root, "ui")).filter((n) => n.endsWith(".js"))) new vm.Script(fs.readFileSync(path.join(root, "ui", f), "utf8"), { filename: "ui/" + f });
  // (Move tutors: ₽10,000 a time. Gary at Victory Road's end: a step out of the cave first.
  // Kanto's Gym Leaders' rematches once you're Champion, but Giovanni's.)
  {
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/const TUTOR_PRICE = 10000;/.test(gameJs));
    assert(/LOCALID_VICTORY_ROAD_RIVAL";\n.*\n    await Overworld\.act\(\[\{ who: "player", moves: \["walk_down"\] \}\]\);/.test(gameJs), "a step out first");
    assert(/FLAG_HIDE_VIRIDIAN_GIOVANNI": return !f\.giovanniLeft;/.test(gameJs) && !/ViridianCity_Gym_EventScript_Giovanni: \{ id:/.test(gameJs), "no rematch for Giovanni");
    const ids = [...gameJs.matchAll(/team: \(\) => leaderTeam\("(\w+)"/g)].map((m) => m[1]);
    assert(ids.length === 7 && ids.every((id) => WORLD_TRAINERS[id] && WORLD_TRAINERS[id].party.length === 6), "the rematch teams: " + ids);
    assert.strictEqual([...gameJs.matchAll(/_EventScript_\w+: \{ id: "TRAINER_LEADER_/g)].length, 7, "Kanto's Gym Leaders but Giovanni");
  }
  // (No Master Ball for a raid's catch; Lostelle's dad stays where he is until your next visit;
  // a shop's long names in the small font; move descriptions wrapped to the summary's window.)
  {
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/id !== "master-ball" && Player\.itemCount/.test(gameJs) && /LostellesDaddy" && \(f\.gameCornerScene \|\| 0\) >= 4/.test(gameJs));
    assert(/textWidth\(name\) > room \? "small"/.test(fs.readFileSync(path.join(root, "ui/shop-screen.js"), "utf8")));
    assert(/mv\.shortDesc \|\| "", 108\)/.test(fs.readFileSync(path.join(root, "ui/summary-screen.js"), "utf8")));
  }
  // A raid: in the den's pool, its level; its boss Terastallizes into the den's type.
  const flags = {}, den = RaidDens.DENS.find((d) => d.type === "Fire");
  const raid = RaidDens.start(flags, den, "max-lure", 8, rng);
  assert.strictEqual(RaidDens.active(flags, den.id), raid);
  assert(RaidDens.POOLS.Fire[raid.stars - 1].includes(raid.species) && raid.level >= RaidDens.LEVELS[raid.stars] && raid.level <= RaidDens.LEVELS[raid.stars] + 3);
  const boss = RaidDens.boss(den, raid, rng);
  assert(boss.teraAce && boss.teraType === "Fire" && boss.level === raid.level && boss.ivs.atk === RaidDens.IVS[raid.stars]);
  // No move that takes the boss out: Golem's Explosion gives way to an earlier move.
  {
    const rock = RaidDens.DENS.find((d) => d.type === "Rock");
    const golem = RaidDens.boss(rock, { stars: 5, species: "Golem", level: 75 }, rng).moves.map((m) => m.name);
    assert(golem.length === 4 && !golem.some((m) => MOVES[m].selfdestruct) && RandomTeam.levelUpMoves("Golem", 75).includes("Explosion"), "raid Golem: " + golem);
    assert.deepStrictEqual(RandomTeam.levelUpMoves("Golem", 75, (m) => m === "Explosion").length, 4);
    // Competitive movesets: the boss's Tera Type's STAB first, a setup or status move, nothing awkward.
    assert.deepStrictEqual(golem, RaidDens.movesetFor("Golem", 75, { stars: 5, tera: "Rock" }));
    assert(MOVES[golem[0]].type === "Rock" && golem.some((m) => MOVES[m].cat === "Status"), "raid Golem: " + golem);
    const zam = RaidDens.movesetFor("Alakazam", 75, { stars: 5, tera: "Psychic" });
    assert(!zam.includes("Future Sight") && MOVES[zam[0]].type === "Psychic" && zam.includes("Calm Mind"), "raid Alakazam: " + zam);
    for (const type of Object.keys(RaidDens.POOLS)) RaidDens.POOLS[type].forEach((pool, i) => pool.forEach((sp) => {
      const ms = RaidDens.movesetFor(sp, RaidDens.LEVELS[i + 1], { stars: i + 1, tera: type });
      assert(ms.length >= 1 && ms.length <= 4 && ms.every((m) => MOVES[m] && !MOVES[m].selfdestruct && !MOVES[m].ohko), sp + ": " + ms);
    }));
    // Allies: what's super effective against the raid's Tera Type first; and they choose it in battle.
    const lap = RaidDens.movesetFor("Lapras", 45, { stars: 4, against: "Fire" });
    assert(Damage.typeEffectiveness(MOVES[lap[0]].type, ["Fire"]) > 1 && Damage.typeEffectiveness(MOVES[lap[1]].type, ["Fire"]) > 1, "ally Lapras: " + lap);
    assert(/mv\.power \* eff \* \(eff > 1 \? 2 : 1\)/.test(fs.readFileSync(path.join(root, "engine/battle.js"), "utf8")), "allies favour super effective moves");
    // The joining text wraps long names instead of running off the text box.
    const jt = RaidDens.joinedText(["Cooltrainer Nathan", "Bird Keeper Chester", "Crush Girl Sharon"]);
    assert(jt.split("\n").every((l) => l.length <= 34) && jt.replace(/\n/g, " ") === "Cooltrainer Nathan, Bird Keeper Chester and Crush Girl Sharon joined the Tera Raid!", jt);
    assert.strictEqual(RaidDens.joinedText(["Misty"]), "Misty joined the Tera Raid!");
    // Celadon: no Exp. Candies at the vitamin counter; the TM counter's names
    // all in the small font; selling as many as you have (not 99 at most);
    // a vitamin says which base stat rose.
    const bagJs0 = fs.readFileSync(path.join(root, "ui/bag-screen.js"), "utf8"), shopJs0 = fs.readFileSync(path.join(root, "ui/shop-screen.js"), "utf8");
    const gJs0 = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    const vit = gJs0.slice(gJs0.indexOf('case "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins"'));
    assert(!/exp-candy/.test(vit.slice(0, vit.indexOf("return;"))) && /"swift-wing"\]\)\);/.test(vit), "no Exp. Candies at Celadon's vitamin counter");
    assert(/smallNames: stock\.length > 0 && stock\.every\(\(id\) => \/\^\(tm\|hm\)\\d\/\.test\(id\)\)/.test(gJs0) && /\(it && st\.opts\.smallNames\) \|\| s\.textWidth\(name\) > room/.test(shopJs0), "TM counter: small names");
    assert(/kind: "count", n: 1, max: it\.qty, price: unit/.test(bagJs0) && !/Math\.min\(it\.qty, 99\)/.test(bagJs0), "sell more than 99");
    assert(/name \+ "'s base " \+ STAT_NAMES\[eff\.ev\] \+ "\\nrose\."/.test(gJs0) && ItemUse.effect("calcium").ev === "spa" && ItemUse.effect("swift-wing").ev === "spe", "vitamin message names the stat");
    // PP Up asks as FireRed does; level 100's EXP bar is empty; a wild Tera
    // Pokémon's symbol by its name, and it Terastallizes on screen; the Fire
    // den on Mt. Ember; out of a door, the follower beside you; no autosave,
    // a prompt every 5 minutes; Fly's map without buttons.
    const bsJs0 = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8"), owJs0 = fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8");
    assert(/multichoice\(eff\.ppUp \? "Boost PP of which move\?" : "Restore which move\?", 29, 5,/.test(gJs0), "PP Up's question");
    assert.strictEqual(Experience.progress(Experience.growthRate("Mew"), 100, Experience.expForLevel(Experience.growthRate("Mew"), 100)), 0);
    assert(/const wildTera = d\.tera && st\.foe && battle && battle\.wild;/.test(bsJs0) && /"The wild " \+ m\.name \+ " is\\nTerastallizing!"/.test(bsJs0), "wild Tera");
    const ember = RaidDens.DENS.find((d) => d.type === "Fire"), oldFlags = { raidDens: { cinnabar: { stars: 1, species: "Vulpix", level: 12 } } };
    assert(ember.map === "MtEmber_Exterior" && RaidDens.active(oldFlags, "mtEmber") && !oldFlags.raidDens.cinnabar, "the Fire den on Mt. Ember");
    assert(/if \(r\.ok\) \{ startStep\(r, "down"\); followerOutOfDoor\(r\); \}/.test(owJs0) && /\["left", "right"\]\.map\(\(d\) => World\.step\(from, d, occupiedForPlayer\)\)/.test(owJs0), "follower out of a door");
    assert(/async function persist\(\) \{ tick\(\); \}/.test(gJs0) && !/beforeunload/.test(gJs0) && /SAVE_PROMPT_MS = 5 \* 60 \* 1000/.test(gJs0) && /\|\| saveReminderStep\(\);/.test(gJs0), "no autosave; a prompt every 5 minutes");
    assert(/if \(flying\) r = await choose;/.test(gJs0), "Fly's map: no buttons");
    // "… BP in total."; Koga's rematch Beedrill Tera Ground too; the PC's
    // "/species" without its form; every form's species name plain.
    assert(/BP!\\n\(" \+ f\.bp \+ " BP in total\.\)"/.test(gJs0) && !/BP in all/.test(gJs0), "BP in total");
    assert(/\["Skuntank", "Beedrill", \{ item: "beedrillite", teraType: "Ground" \}\]/.test(gJs0), "Koga's rematch: Tera Ground");
    assert(/species: Party\.speciesName\(r\.species\), level: r\.level/.test(gJs0), "PC: plain species");
    assert.deepStrictEqual(["Darmanitan-Galar", "Darmanitan-Galar-Zen", "Maushold-Four", "Raichu-Alola", "Ho-Oh", "Porygon-Z", "Kommo-o"].map(Party.speciesName),
      ["Darmanitan", "Darmanitan", "Maushold", "Raichu", "Ho-Oh", "Porygon-Z", "Kommo-o"]);
    // Every TM of Red/Blue/Yellow, Gold/Silver/Crystal, FireRed/LeafGreen and
    // HeartGold/SoulSilver has a machine here (TM114-TM165 the ones added),
    // with Gen 1 and 2's learners.
    const machineMoves = new Set(Bag.machines().map(Bag.machineMove));
    assert.strictEqual(Bag.machines().length, machineMoves.size, "one machine a move");
    for (const mv of ["Mega Punch", "Bubble Beam", "Tri Attack", "Dynamic Punch", "Nightmare", "Zap Cannon", "Drain Punch", "Pluck", "Silver Wind", "Recycle", "Endure"])
      assert(machineMoves.has(mv), "a TM for " + mv);
    assert.deepStrictEqual(["tm114", "tm143", "tm144", "tm161", "tm165"].map(Bag.machineMove), ["Mega Punch", "Tri Attack", "Dynamic Punch", "Nightmare", "Pluck"]);
    assert(["tm114", "tm165"].every((t) => Bag.sprite(t)), "TM sprites");
    const learns = (sp, mv) => Party.canLearnMachine(Party.create(sp, 30), mv);
    assert(learns("Squirtle", "Bubble Beam") && learns("Gengar", "Nightmare") && learns("Pidgeot", "Pluck") && learns("Lucario", "Drain Punch") && !learns("Charmander", "Bubble Beam"));
    // And every later game's (TM166-TM347, tools/build-later-tms.js): Black and White's to Legends: Z-A's, Sword and
    // Shield's TRs as TMs; Legends: Z-A's never-a-machine moves go to whoever learns them some other way.
    assert.strictEqual(Bag.machines().filter((t) => /^tm/.test(t)).length, 347, "TM01-TM347");
    assert.deepStrictEqual(["tm166", "tm169", "tm175", "tm271", "tm272", "tm347"].map(Bag.machineMove), ["Telekinesis", "Leech Life", "Pin Missile", "Body Press", "Acid Spray", "Sheer Cold"]);
    for (const mv of ["Work Up", "Brutal Swing", "Aurora Veil", "Nasty Plot", "Body Press", "Liquidation", "Tera Blast", "Trailblaze", "Upper Hand", "Comet Punch", "Fake Out"])
      assert(machineMoves.has(mv) || new Set(Bag.machines().map(Bag.machineMove)).has(mv), "a TM for " + mv);
    for (const t of Bag.machines()) assert(MOVES[Bag.machineMove(t)] && Bag.sprite(t), t + ": its move and disc");
    assert(learns("Snorlax", "Body Press") && learns("Hitmonchan", "Comet Punch") && learns("Lapras", "Sheer Cold") && learns("Pikachu", "Tera Blast") && !learns("Magikarp", "Body Press"));
    // Mints 25 BP; out of the elevator past the counter; a Metal Coat to dig
    // and in Rock Tunnel; the older games' TM balls; Johto's balls by move.
    assert(/walk_down", "walk_down", "walk_down"\] \}\]\);\n    towerCounterOpen = false;/.test(gJs0), "out past the counter");
    assert.deepStrictEqual(Mining.TREASURES.find((t) => t[0] === "metal-coat"), ["metal-coat", 3, ["xx", "xx", "xx"], 25]);
    const oldBalls = gJs0.slice(gJs0.indexOf("const OLD_GAME_BALLS = ["), gJs0.indexOf("].map((b, i) => Object.assign({ id: 1100"));
    const ob = [...oldBalls.matchAll(/\{ map: "(\w+)", x: (\d+), y: (\d+), item: "([\w-]+)" \}/g)].map((m) => ({ map: m[1], x: +m[2], y: +m[3], item: m[4] }));
    assert.strictEqual(ob.length, 33, "32 TMs and a Metal Coat");
    assert(ob.some((b) => b.map === "RockTunnel_B1F" && b.item === "metal-coat") && ob.some((b) => b.map === "MtMoon_1F" && Bag.machineMove(b.item) === "Water Gun"));
    // (Johto's at HGSS's tiles, on its maps as they are now, Heart & Soul's: ui/johto-coords.js, as ui/game.js places them.)
    if (!window.JohtoCoords) vm.runInThisContext(fs.readFileSync(path.join(root, "ui/johto-coords.js"), "utf8"));
    for (const b0 of ob) {
      const b = (window.JOHTO_COORDS.where || {})[b0.map] ? Object.assign({}, b0, window.JohtoCoords.toMapFree(b0.map, b0.x, b0.y)) : b0;
      const blk = World.blockAt(b.map, b.x, b.y), m = WORLD_MAPS[b.map];
      assert(blk.map && !blk.collision && !World.warpAt(b.map, b.x, b.y) && !m.people.some((p) => p.x === b.x && p.y === b.y), "an open spot: " + b.map + " " + b.item);
    }
    const jb = Object.values(WORLD_MAPS).filter((m) => m.region === "johto").flatMap((m) => m.people.filter((p) => /_TM(\d+)$/.test(p.flag || "") && p.item));
    const hgss = { 82: "Sleep Talk", 87: "Swagger", 72: "Avalanche", 60: "Drain Punch", 88: "Pluck" };
    for (const p of jb) { const n = +/_TM(\d+)$/.exec(p.flag)[1]; if (hgss[n]) assert.strictEqual(Bag.machineMove(p.item), hgss[n], p.flag); }
    // Inviting: A invites, B takes back the last one invited.
    const gJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/if \(v < 0\) \{\n\s*if \(!picked\.length\) return \[\];\n\s*cursor = can\.indexOf\(picked\.pop\(\)\);/.test(gJs) && /RaidDens\.joinedText\(allies\.map/.test(gJs), "raid invite keys");
  }
  // In battle: its HP times the stars' multiplier, at full; it Terastallizes when it moves.
  const bb = new Battle({ p1: { name: "P", team: [Party.toBattleSet(Party.create("Mewtwo", 100, { rng }))] },
    p2: { name: "Wild", tera: true, team: [Object.assign(Party.toBattleSet(boss), { raidHp: RaidDens.HP[5] })] }, wild: true, seed: 3 });
  const bm = bb.sides.p2.pokemon[0];
  assert.strictEqual(bm.maxhp, Math.round(bm.stats.hp * 8));
  assert.strictEqual(bm.hp, bm.maxhp);
  // Outside its turn (Battle.raidCheck): past each HP mark, and every few turns. Your
  // raised stats wiped first; then its own drops shaken off; then stronger, or attacking again.
  {
    const rb = new Battle({ p1: { name: "P", team: [Party.toBattleSet(Party.create("Mewtwo", 100, { rng }))] },
      p2: { name: "Wild", tera: true, team: [Object.assign(Party.toBattleSet(boss), { raidHp: RaidDens.HP[5] })] }, wild: true, seed: 5, raid: 5 });
    rb.start();
    const me = rb.sides.p1.pokemon[0], rbm = rb.sides.p2.pokemon[0], texts = () => rb.events.filter((e) => e[0] === "-text").map((e) => e[2]);
    me.boosts.atk = 2; rbm.boosts.def = -1;
    rb.raidCheck(false);
    assert.strictEqual(texts().length, 0, "nothing at full HP");
    rbm.hp = Math.floor(rbm.maxhp * 0.7);
    rb.raidCheck(false);
    assert(me.boosts.atk === 0 && /nullified/.test(texts().join()), "past 75%: your boosts wiped");
    rbm.hp = Math.floor(rbm.maxhp * 0.45);
    rb.raidCheck(false);
    assert(rbm.boosts.def === 0 && /negative/.test(texts().join()), "past 50%: its drops gone");
    rb.turn = 3;
    rb.raidCheck(true);
    assert(/stronger|again/.test(texts()[texts().length - 1]), "every 3 turns: " + texts().join(" | "));
    assert.strictEqual(rb.raidThresholdsLeft.length, 1, "25% still to come");
    // Four on one (raidAllies): the Gym Leaders you invite, then the region's trainers, each
    // with what hits the Tera Raid Pokémon hardest, at about its level; what they do told in words.
    {
      const grass = RaidDens.DENS.find((d) => d.type === "Grass"), r5 = { stars: 5, level: 76, species: "Venusaur" };
      assert.deepStrictEqual(RaidDens.leaders({ TRAINER_LEADER_MISTY: true, TRAINER_LEADER_BLAINE: true }).map((L) => L.name), ["Misty", "Blaine"]);
      assert.deepStrictEqual(RaidDens.leaders({ TRAINER_LEADER_MISTY: true, TRAINER_LEADER_GIOVANNI: true }).map((L) => L.name), ["Misty"], "no Giovanni in raids");
      const al = RaidDens.allies(grass, r5, ["Blaine", "Misty"], rng);
      assert(al.length === 3 && al[0].trainer === "Blaine" && al[1].trainer === "Misty" && al[0].leader && !al[2].leader, al.map((a) => a.trainer).join());
      const hitsGrass = (sp) => Math.max(...DEX[sp].types.map((t) => Damage.typeEffectiveness(t, ["Grass"])));
      assert(hitsGrass(al[0].record.species) > 1 && hitsGrass(al[2].record.species) > 1, "type advantage: " + al.map((a) => a.record.species).join());
      assert(al.every((a) => Math.abs(a.record.level - r5.level) <= 2), "at about the raid's level");
      assert(WORLD_TRAINERS[Object.keys(WORLD_TRAINERS).find((id) => /^TRAINER_/.test(id) && (WORLD_TRAINERS[id].className + " " + WORLD_TRAINERS[id].name) === al[2].trainer)], "a real trainer of Kanto's: " + al[2].trainer);
      const ab = new Battle({ p1: { name: "P", team: [Party.toBattleSet(Party.create("Mewtwo", 100, { rng }))] },
        p2: { name: "Wild", tera: true, team: [Object.assign(Party.toBattleSet(boss), { raidHp: RaidDens.HP[5] * RaidDens.ALLY_HP })] }, wild: true, seed: 9, raid: 5,
        raidAllies: al.map((a) => ({ set: Party.toBattleSet(a.record), trainer: a.trainer })) });
      ab.start();
      for (let t = 0; t < 4 && !ab.ended; t++) { ab.choose("p1", { type: "move", move: 0 }); ab.choose("p2", ab.randomChoice("p2")); }
      assert(ab.raidAllies.length === 3 && ab.events.some((e) => e[0] === "-text" && /^Blaine's \w+ used /.test(e[2])), "the allies move");
      assert(!ab.events.some((e) => e.some((x) => /^p1r\d: /.test(String(x)))), "the screen never sees an ally's name in the log");
      const ally = ab.raidAllies[0];
      ab.damage(ally, ally.hp);
      assert(!ally.fainted && ally.hp === ally.maxhp && ab.events.some((e) => e[0] === "-text" && /Blaine's \w+ got back up/.test(e[2])), "an ally gets back up too");
      const bsJs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8"), gJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
      assert(/raidAlliesPanel\(battle\.raidAllies\)/.test(bsJs) && /RaidDens\.allies\(den, raid, await inviteLeaders\(\)\)/.test(gJs) && /RaidDens\.ALLY_HP/.test(gJs));
    }
    // Fainting, as in Scarlet and Violet: back up at full HP, two turns off the limit.
    me.boosts.spe = 1;
    rb.damage(me, me.hp);
    assert(!me.fainted && me.hp === me.maxhp && me.boosts.spe === 0 && rb.raidPenalty === 2, "back up, the raid lost time");
    assert(/raidTurns - battle\.turn \+ 1 - \(battle\.raidPenalty \|\| 0\)/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")));
    assert(/raid: cfg\.raid \|\| 0/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")));
  }
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
  // Celadon's Berry Farm (tools/build-berry-farm.js): its own map, through a gap in the trees
  // south of Celadon's Gym (the "farmpath" patch, always on), no sign; four beds of 17 in its garden;
  // the Grass den on its lawn.
  {
    const city = WORLD_MAPS.CeladonCity, farm = WORLD_MAPS.CeladonCity_BerryFarm, gd = RaidDens.DENS.find((d) => d.type === "Grass");
    assert(farm && city.connections.some((c) => c.map === farm.name && c.direction === "down") && farm.connections.some((c) => c.map === "CeladonCity" && c.direction === "up"));
    assert(city.patches.farmpath && city.patches.farmpath.collision.every(([, , c]) => c === 0) && !city.patches.berryfarm && !city.signs.some((sg) => /BerryFarm/.test(sg.script)));
    assert(/CeladonCity"\) return \["farmpath"\]/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
    // (The way through: open from Celadon's lawn down into the farm.)
    assert([10, 11].every((x) => !farm.collision[x] && !farm.collision[farm.width + x]));
    assert(gd.map === farm.name && !farm.collision[gd.y * farm.width + gd.x]);
    const B = window.BERRY_FARM;
    assert(B.spots.length === 30 && farm.people.filter((pp) => /^BerryFarm_Tree_\d+$/.test(pp.script)).length === 30 && farm.people.some((pp) => pp.script === "BerryFarm_Caretaker"));
    assert(Object.keys(window.ITEMS).filter((id) => /-berry$/.test(id)).every((id) => B.berries[id] && fs.existsSync(path.join(root, "assets/world/sprites/berry_tree_" + B.berries[id].tree + ".png"))), "every berry grows as one of Emerald's trees");
    assert.deepStrictEqual([B.berries["cheri-berry"].hours, B.berries["lum-berry"].hours, B.berries["liechi-berry"].hours, B.berries["razz-berry"].max], [3, 12, 24, 6], "Emerald's gBerries");
    assert(window.ITEMS["wailmer-pail"] && fs.existsSync(path.join(root, "assets/sprites/items/key-item/wailmer-pail.png")));
    // Growing (ui/berry-farm.js): Emerald's stages, each the berry's hours (100 steps an hour),
    // 1 + level / 50 times as fast; berries four stages long, then it sprouts again.
    const box = { window: { BERRY_FARM: B, Player: { STEPS_PER_HOUR: 100, removeItem: () => {}, addItem: (p, id, n) => { p.bag[id] = (p.bag[id] || 0) + (n || 1); }, itemCount: (p, id) => p.bag[id] | 0 }, Bag: { name: (id) => Bag.name(id) } } };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/berry-farm.js"), "utf8"), box);
    let level = 1;
    const pl = { name: "RED", flags: {}, bag: { "cheri-berry": 3, "wailmer-pail": 1 } }, said = [];
    const F = box.window.BerryFarm.create({ player: () => pl, say: async (pg) => said.push(...pg), confirm: async () => true, jingle: async (s, pg) => said.push(...pg),
      chooseBerry: async () => "cheri-berry", farmingLevel: () => level, addFarmingXp: async () => {}, refresh: () => {}, here: () => "x" });
    const spot = farm.people.find((pp) => pp.script === "BerryFarm_Tree_0");
    assert.strictEqual(F.visible(spot, farm.name).sprite, "berry_soil");
    (async () => {
      await F.talk(spot);
      const t = pl.flags.berryFarm.trees[0];
      assert(t && t.stage === 1 && F.visible(spot, farm.name).sprite === "berry_tree_cheri");
      assert(said.some((x) => /planted one Cheri Berry in/.test(x)), "its name as it's written: " + said.join(" / "));
      for (let st = 1; st <= 4; st++) {
        assert.strictEqual(F.visible(spot, farm.name).frame, [0, 2, 4, 6][st - 1] + 9, "dry soil: it wants water");
        await F.talk(spot);   // (water it: each stage once)
        assert.strictEqual(F.visible(spot, farm.name).frame, [0, 2, 4, 6][st - 1] + 18, "wet soil: watered");
        for (let i = 0; i < 300; i++) F.step();
        assert.strictEqual(t.stage, st + 1, "Cheri: 3 hours a stage");
      }
      assert(t.yield === 3 && F.visible(spot, farm.name).frame === 8, "watered every stage: Cheri's most");
      for (let i = 0; i < 10000; i++) F.step();
      assert(t.stage === 5 && t.yield === 3, "berries stay till they're picked");
      level = 100;
      await F.talk(spot);
      assert(!pl.flags.berryFarm.trees[0] && pl.bag["cheri-berry"] === 3 + 6, "farming level 100: twice as many (the stub Bag keeps the one planted)");
      assert(said.some((x) => /picked the 6 Cheri Berries\./.test(x)) && said.some((x) => /Bag's Berries Pocket/.test(x)), said.slice(-4).join(" / "));
      await F.talk(spot);
      for (let i = 0; i < 100; i++) F.step();
      assert.strictEqual(pl.flags.berryFarm.trees[0].stage, 2, "farming level 100: three times as fast");
    })().catch((e) => { console.error(e); process.exit(1); });
  }
  for (const f of ["CeladonCity-patch-farmpath", "SaffronCity_MrPsychicsHouse-patch-denroom", "SaffronCity_MrPsychicsHouse_DenRoom"])
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
  assert(!Bag.canUseOn(Object.assign(Party.create("Pikachu", 20), { evs: {}, happiness: 70 }), "grepa-berry"), "no EVs to lower: no effect, however friendly");
  // Berries sell by tier, ₽50 to ₽500.
  assert.deepStrictEqual(["oran", "sitrus", "razz", "pomeg", "spelon", "occa", "liechi", "kee", "enigma"].map((b) => Bag.sellPrice(b + "-berry")), [50, 100, 150, 200, 250, 300, 350, 425, 500]);
  // Tera Shards sell for ₽1,000 each; and the Bag opening on a Berry you've none of left
  // (the last one planted) mustn't trip over its CLOSE BAG row.
  assert.deepStrictEqual(["fire-tera-shard", "water-tera-shard"].map((id) => Bag.sellPrice(id)), [500, 500]);
  // Faraway Island's Mew: Psychic, Nasty Plot, Aura Sphere, Ice Beam.
  assert(/const FARAWAY_MEW_MOVES = \["Psychic", "Nasty Plot", "Aura Sphere", "Ice Beam"\];/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")), "Mew's moves");
  assert.deepStrictEqual(Party.create("Mew", 50, { moves: ["Psychic", "Nasty Plot", "Aura Sphere", "Ice Beam"] }).moves.map((m) => m.name), ["Psychic", "Nasty Plot", "Aura Sphere", "Ice Beam"]);
  // Tall grass: its sprite in data/field-effects.js, drawn over whoever's in it.
  assert(FIELD_EFFECTS.tallGrass && FIELD_EFFECTS.tallGrass.px.length === 16 * 16 * 5 && FIELD_EFFECTS.tallGrass.palette.length >= 16);
  assert(/for \(const s of tallGrassSprites\(camX, camY, shade\)\) sprites\.push\(s\);/.test(fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8")), "tall grass drawn");
  // A Tin Bottle Cap: one IV down to 0 (undoing Hyper Training there).
  {
    const r = Object.assign(Party.create("Snorlax", 30, { ivs: 31 }), { hyper: ["spe"] });
    assert(Bag.canUseOn(r, "tin-bottle-cap", { stat: "spe" }));
    Bag.useOn(r, "tin-bottle-cap", { stat: "spe" });
    assert.strictEqual(r.ivs.spe, 0);
    assert(!r.hyper.includes("spe") && !Bag.canUseOn(r, "tin-bottle-cap", { stat: "spe" }));
  }
  {
    const g = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    // Trainer Tower's BP shop in place of its Poké Mart, and the Egg move tutor beside the tutor.
    assert(/case "TrainerTower_Lobby_EventScript_MartClerk": await bpShop\(\); return;/.test(g) && /const BP_SHOP = \[\["bottle-cap", 25\], \["gold-bottle-cap", 75\], \["tin-bottle-cap", 10\]\]/.test(g), "the BP shop");
    assert(/\.concat\(\["hp-up", "protein", "iron", "calcium", "zinc", "carbos"\]\.map\(\(id\) => \[id, 2\]\)\)/.test(g) && /filter\(\(id\) => Bag\.mintNature\(id\)\)\.sort\(\)\.map\(\(id\) => \[id, 25\]\)/.test(g));
    assert(/case "TrainerTower_Lobby_EventScript_BPEggTutor": await bpEggTutor\(\); return;/.test(g) && /const bpEggTutor = \(\) => bpTeacher\(bpEggMoves,/.test(g), "the Egg move tutor");
  }
  assert(/findIndex\(\(e\) => e && e\.id === opts\.select\)/.test(fs.readFileSync(path.join(root, "ui/bag-screen.js"), "utf8")), "the Bag's select");
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
  assert.deepStrictEqual(Object.keys(WORLD_MAPS).filter((m) => WORLD_MAPS[m].allowEscaping && !["johto", "hoenn"].includes(WORLD_MAPS[m].region)), ["ViridianForest", "MtMoon_1F", "MtMoon_B1F", "MtMoon_B2F",
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
    ["CeruleanCave_1F", "CeruleanCave_2F", "CeruleanCave_B1F", "TohjoFalls", "MtSilverCave_1F", "TohjoFallsHiddenRoom", "MtSilverCave_UpperMountainside", "MtSilverCave_LowerMountainside", "MtSilverCave_ExpertBeltChamber",
    "MtSilverCave_MoltresChamber", "MtSilverCave_2F", "MtSilverCave_3F", "MtSilverCave_Summit"]));
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
  assert(names.size > 25, "intro image lists");
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
      "assets/world/sprites/player_" + look + ".png", "assets/world/sprites/player_" + look + "_run.png"]) {
      assert(fs.existsSync(path.join(root, file)), "missing " + file);
    }
  }
  assert.strictEqual(Player.create("T", "nobody").look, "custom", "unknown looks fall back to the custom character");
  const asRed = Object.assign(Player.create("T"), { look: "red", party: [Party.create("Pidgey", 5)] });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(asRed))).player.look, "custom", "saves as Red or Leaf become the custom character");
  const saved = Object.assign(Player.create("T", "custom"), { party: [Party.create("Pidgey", 5)] });
  assert.strictEqual(Player.load(JSON.parse(JSON.stringify(saved))).player.look, "custom", "the custom look survives saving");
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
  // (And this game's own: the meteoroid's, tools/build-delta-episode.js.)
  assert.strictEqual(fs.readdirSync(path.join(root, "assets/battle")).filter((f) => f !== "space.png").length, 20, "all 20 FireRed battle terrains");
  assert(fs.existsSync(path.join(root, "assets/battle/space.png")), "the meteoroid's background");
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
    if (["johto", "emerald", "orre", "hoenn", "sinnoh"].includes(WORLD_MAPS[name].region)) continue;
    if (["yugioh", "yakuza"].includes(WORLD_MAPS[name].realm)) continue;   // (nor the Yu-Gi-Oh! and Like a Dragon realms')   // (Johto, Hoenn, Faraway Island, Orre and Sinnoh aren't on Kanto's Town Map)
    if (window.JOHTO_TOWN_MAP && window.JOHTO_TOWN_MAP.at[name]) continue;   // (nor Johto's maps east of New Bark Town, which are Kanto's for Badges but on Johto's)
    // (Saffron's Magnet Train station, HGSS's: its townMapSection, which ui/magnet-train.js adds.)
    if (WORLD_MAPS[name].townMapSection) { assert(onMap(WORLD_MAPS[name].townMapSection), name + " is on the Town Map"); continue; }
    assert(T.mapSections[name] && (onMap(T.mapSections[name]) || ["UNDERGROUND_PATH", "UNDERGROUND_PATH_2", "S_S_ANNE", "ROCKET_HIDEOUT", "SILPH_CO",
      "POKEMON_LEAGUE", "EMBER_SPA", "THREE_ISLE_PATH", "ROCKET_WAREHOUSE", "TRAINER_TOWER_2", "TANOBY_KEY"].includes(T.mapSections[name]) || /_CHAMBER$/.test(T.mapSections[name])), name + " is on the Town Map");
  }
  // The Sevii Islands' maps: One, Two and Three Island on the first (FireRed's REGIONMAP_SEVII123).
  assert.deepStrictEqual(T.sevii.map((R) => [R.id, R.map.length, R.map[0].length]), [["SEVII_123", 15, 22], ["SEVII_45", 15, 22], ["SEVII_67", 15, 22]]);
  assert(onGrid(T.sevii[0], "ONE_ISLAND") && onGrid(T.sevii[0], "THREE_ISLE_PORT") && onGrid(T.sevii[0], "MT_EMBER") && !onGrid(T, "ONE_ISLAND"));
  for (const f of ["sevii-123", "sevii-45", "sevii-67"]) assert(fs.existsSync(path.join(__dirname, "../assets/town-map/" + f + ".png")), f);
  assert(fs.existsSync(path.join(__dirname, "../assets/town-map/kanto.png")));
}

// New Bark Town's Pokémon Center (tools/build-new-bark-center.js): Cherrygrove's, cloned, Fly's spot;
// Elm's lab's words for a Champion from Kanto, and his Pokégear; Route 27's man and Reena.
if (WORLD_MAPS.NewBarkTown_PokemonCenter_1F) {
  const town = WORLD_MAPS.NewBarkTown, f1 = WORLD_MAPS.NewBarkTown_PokemonCenter_1F, f2 = WORLD_MAPS.NewBarkTown_PokemonCenter_2F;
  const door = town.warps.find((w) => w.map === f1.name);
  // (On New Bark drawn from Pokémon Heart & Soul's, the building's Cherrygrove's, copied in as the map's built
  // (tools/data/hns-johto-maps.json): its door one you walk onto, as Heart & Soul's are. On HGSS's: a patch, its door solid.)
  if (town.pokecenterDoor) assert(door && door.x === town.pokecenterDoor.x && door.y === town.pokecenterDoor.y && town.behavior[door.y * town.width + door.x] === 0x69 && !town.patches, "its door");
  else {
    assert(door && town.collision[door.y * town.width + door.x] === 1 && town.behavior[door.y * town.width + door.x] === 0x69, "its door");
    assert(town.patches.pokecenter && town.patches.pokecenter.top && fs.existsSync(path.join(root, "assets/world/maps/NewBarkTown-patch-pokecenter.png")) && fs.existsSync(path.join(root, "assets/world/maps/NewBarkTown-patch-pokecenter-top.png")));
  }
  assert(f1.pokemonCenter && f1.image === "CherrygroveCity_PokemonCenter_1F" && f2.image === "CherrygroveCity_PokemonCenter_2F");
  assert(f1.warps.filter((w) => w.map === "NewBarkTown").every((w) => town.warps[w.warp] === door) && f1.warps.some((w) => w.map === f2.name) && f2.warps.some((w) => w.map === f1.name));
  assert(f1.people.some((p) => p.script === "NewBarkTown_PokemonCenter_1F_EventScript_Nurse") && window.JOHTO_SCRIPTS.maps[f1.name] === window.JOHTO_SCRIPTS.maps.CherrygroveCity_PokemonCenter_1F);
  assert.deepStrictEqual(window.JOHTO_TOWN_MAP.fly.NEW_BARK_TOWN, { map: "NewBarkTown", x: door.x, y: door.y + 1, center: f1.name });
  const M = window.JOHTO_SCRIPTS.messages, lab = window.JOHTO_SCRIPTS.zones.T20R0101;
  assert(/Champion of Kanto/.test(M.msg_0543_T20R0101_00000.join(" ")) && !/Lyra|walk/.test(M.msg_0543_T20R0101_00000.join(" ")) && !/Ethan|walk/.test(M.msg_0543_T20R0101_00001.join(" ")));
  assert(/Pokégear/.test(M.msg_0543_T20R0101_00010.join(" ")) && /received the Pokégear/.test(M.msg_0543_T20R0101_pokegear[0]) && !/walk with/.test(M.msg_0543_T20R0101_00102.join(" ")));
  assert(lab.cmds.some((c, i) => c[0] === "ElmPokegear" && lab.cmds[i - 1][1] === "msg_0543_T20R0101_00010"), "Elm's Pokégear after his words about it");
  assert(/Rejuvenator/.test(M.msg_0369_R27_00001.join(" ")) && /Rejuvenator/.test(WORLD_MAPS.Route27.people.find((p) => p.localId === "obj_R27_gsbigman").text.join(" ")));
  assert(WORLD_TRAINERS.HGSS_TRAINER_ACE_TRAINER_F_REENA.intro.join(" ").includes("Pallet Town") && !JSON.stringify(WORLD_TRAINERS).includes("came from New Bark Town?"));
}

// Cherrygrove's Guide Gent is gone (the Map card's yours from the start), Silver's name and
// picture, Prof. Oak's words at Mr. Pokémon's, Elm's; HGSS's own Town Map picture.
if (WORLD_MAPS.CherrygroveCity && WORLD_MAPS.CherrygroveCity.region === "johto") {
  const c = WORLD_MAPS.CherrygroveCity;
  assert(!c.people.some((p) => p.localId === "obj_T21_gsoldman1") && !c.triggers.some((t) => /scr_seq_T21_00[12]\?/.test(t.script)), "no Guide Gent");
  assert(c.triggers.some((t) => /scr_seq_T21_003/.test(t.script)), "Silver still comes");
  for (const id of ["HGSS_TRAINER_PASSERBY_BOY", "HGSS_TRAINER_PASSERBY_BOY_2", "HGSS_TRAINER_PASSERBY_BOY_3"])
    assert.deepStrictEqual([WORLD_TRAINERS[id].className, WORLD_TRAINERS[id].name, WORLD_TRAINERS[id].pic], ["Rival", "Silver", "hgss_silver"], id);
  const M = window.JOHTO_SCRIPTS.messages;
  assert(/Champion of Kanto/.test(M.msg_0377_R30R0201_00008.join(" ")) && !/I'm Professor Oak/.test(M.msg_0377_R30R0201_00009.join(" ")));
  assert(/still have the Pokédex/.test(M.msg_0377_R30R0201_00011.join(" ")) && /ready for/.test(M.msg_0377_R30R0201_00012[0]));
  assert(!/mom/.test(M.msg_0543_T20R0101_00038.join(" ")) && !/mom/.test(M.msg_0543_T20R0101_00039.join(" ")));
  assert(fs.existsSync(path.join(root, "assets/town-map/johto.png")) && fs.existsSync(path.join(root, "tools/build-johto-town-map-picture.js")));
}

// HMs in Johto need HGSS's Badges, Fly none (game/field-moves.js).
{
  const pl = Player.create("RED", 0);
  const mon = Party.create("Pidgeot", 40);
  mon.moves = [{ name: "Fly", pp: 15 }, { name: "Cut", pp: 30 }];
  pl.location = { map: "NewBarkTown", x: 0, y: 0 };
  assert.strictEqual(FieldMoves.check(pl, mon, "Fly"), null, "Fly in Johto with no Badges");
  assert.strictEqual(FieldMoves.check(pl, mon, "Cut"), "badge", "Cut in Johto needs the Hive Badge");
  pl.badges = ["cascade"];
  assert.strictEqual(FieldMoves.check(pl, mon, "Cut"), "badge", "not Kanto's Cascade Badge");
  pl.badges = ["hive"];
  assert.strictEqual(FieldMoves.check(pl, mon, "Cut"), null);
  pl.location = { map: "PalletTown", x: 0, y: 0 };
  assert.strictEqual(FieldMoves.check(pl, mon, "Cut"), "badge", "in Kanto, the Cascade Badge");
  assert.strictEqual(FieldMoves.check(pl, mon, "Fly"), "badge", "in Kanto, Fly needs the Thunder Badge");
  pl.badges = ["cascade", "thunder"];
  assert.strictEqual(FieldMoves.check(pl, mon, "Cut"), null);
  assert.strictEqual(FieldMoves.check(pl, mon, "Fly"), null);
}

// Trainer Tower's reward pools, Crystal's Battle Tower's too (game/trainer-tower.js).
{
  for (const [tier, n] of [[1, 2], [2, 2], [3, 2]]) {
    const r = TrainerTower.rewardsAt(tier, n, () => 0.5);
    assert.strictEqual(r.length, n);
    for (const id of r) assert(ITEMS[id], id);
  }
  const all = new Set(); for (let i = 0; i < 400; i++) for (const id of TrainerTower.rewardsAt(3, 1)) all.add(id);
  assert(all.has("rare-candy") || all.has("exp-candy-m") || all.has("exp-candy-l") || all.has("exp-candy-xl"), "candies in the pools");
  // (Battle Points for finishing, by pace: a Knockout's 5 more.)
  assert.deepStrictEqual([TrainerTower.finishBP(0, 60 * 60 * 5), TrainerTower.finishBP(0, 60 * 60 * 10), TrainerTower.finishBP(3, 60 * 60 * 40), TrainerTower.finishBP(2, 60 * 60 * 10)], [15, 10, 5, 20]);
}

// The GS Ball (Crystal's): Prof. Oak's once you're through the Hall of Fame; Ilex Forest's shrine takes it, and Celebi comes (ui/game.js).
{
  assert(ITEMS["gs-ball"] && ITEMS["gs-ball"].category === "key-items" && Bag.name("gs-ball") === "GS Ball" && Bag.sprite("gs-ball"), "the GS Ball, a Key Item with its picture");
  const gJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  assert(/else if \(f\.gameClear && !f\.gotGsBall\) await oakGsBall\(\);/.test(gJs), "Oak gives it after the Hall of Fame");
  assert(/script === "hgss:D36R0101:scr_seq_D36R0101_012" && Player\.itemCount\(player, "gs-ball"\) > 0/.test(gJs) && /Party\.create\("Celebi", 50\)/.test(gJs), "the shrine: a Lv. 50 Celebi");
  assert(Object.keys(WORLD_MAPS).filter((n) => /PokemonCenter/.test(n)).every((n) => !WORLD_MAPS[n].cycling), "no cycling in Pokémon Centers");
  assert(Object.values(WORLD_MAPS).some((m) => m.region === "johto" && m.people.some((p) => p.sprite === "hgss_gsman3")), "HGSS's own Ace Trainers");
  assert(WORLD_MAPS.IlexForest.signs.some((s) => s.script === "hgss:D36R0101:scr_seq_D36R0101_012"), "Ilex Forest's shrine is there");
}

// The Delta Episode and Jirachi's observation deck (this game's own: ui/game.js, tools/build-delta-episode.js).
{
  const D = WORLD_MAPS.MossdeepCity_SpaceCenter_ObservationDeck, SC2 = WORLD_MAPS.MossdeepCity_SpaceCenter_2F;
  assert(D && D.region === "hoenn" && D.signs.some((x) => x.script === "SpaceCenter_EventScript_WishRock") && D.warps[0].map === SC2.name, "the deck, its rock and its way out");
  const door = SC2.warps.findIndex((w) => w.map === D.name);
  assert(door >= 0 && D.warps[0].warp === door && SC2.patches.sealed && SC2.patches.open && SC2.patches.open.collision[0][3] === 0x69, "2F's door, sealed and open");
  for (const f of ["MossdeepCity_SpaceCenter_ObservationDeck.png", "MossdeepCity_SpaceCenter_ObservationDeck-patch-glow.png", "MossdeepCity_SpaceCenter_ObservationDeck-patch-glow-top.png",
    "MossdeepCity_SpaceCenter_ObservationDeck-patch-stars.png", "MossdeepCity_SpaceCenter_2F-patch-sealed.png", "MossdeepCity_SpaceCenter_2F-patch-open.png"])
    assert(fs.existsSync(path.join(root, "assets/world/maps", f)), f);
  assert(fs.existsSync(path.join(root, "assets/sprites/trainers/front/zinnia.png")) && fs.existsSync(path.join(root, "assets/world/sprites/em_zinnia.png")), "Zinnia's pictures");
  const gj = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
  assert(/hoenn\.setFlag\("FLAG_SYS_GAME_CLEAR", true\)/.test(gj), "Hoenn's Hall of Fame sets FLAG_SYS_GAME_CLEAR");
  assert(/Party\.create\("Deoxys-Normal", 80\)/.test(gj) && /Party\.create\("Jirachi", 50\)/.test(gj) && /RayquazaScene\.play\(\$\("#overlay"\), 2,/.test(gj), "Deoxys, Jirachi, Rayquaza's flight");
  assert(DEX["Deoxys-Normal"] && DEX.Jirachi && DEX.Zinnia === undefined);
}

// Raids: the Elite Four, Blue, Red and Leaf can be invited once you've battled with or against them (game/raid-dens.js).
{
  const names = (f) => RaidDens.leaders(f).map((L) => L.name);
  assert.deepStrictEqual(names({}), []);
  assert.deepStrictEqual(names({ TRAINER_LEADER_BROCK: true, TRAINER_ELITE_FOUR_LANCE: true, victoryRoadRival: true, TRAINER_BOSS_GIOVANNI_2: true, megaTowerDone: true }),
    ["Brock", "Lance", "Blue", "Red", "Leaf"]);
  // (League.reset clears the League's trainers' flags: beaten once, they stay invited; the Hall of Fame counts for all.)
  assert.deepStrictEqual(names({ leagueEverBeaten: { TRAINER_ELITE_FOUR_BRUNO: true } }), ["Bruno"]);
  assert.deepStrictEqual(names({ gameClear: true }), ["Lorelei", "Bruno", "Agatha", "Lance", "Blue"], "the Elite Four and your rival, once you're Champion");
  assert(/leagueEverBeaten \|\| \(player\.flags\.leagueEverBeaten = \{\}\)\)\[opts\.trainerId\] = true/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")));
  // (Each brings one of their highest-levelled team: Lance's Champion team in Johto, Red's at Mt. Silver.)
  const lanceTop = RaidDens.teamOf(RaidDens.OTHERS.find((o) => o.name === "Lance"));
  assert(lanceTop.length && lanceTop.every((sp) => DEX[sp]), "Lance's team: " + lanceTop);
  for (const L of RaidDens.LEADERS) assert(RaidDens.teamOf(L).length >= 3, L.name + "'s team");
  RaidDens.setTeams({ Brock: () => [[{ species: "Onix", level: 12 }, { species: "Geodude", level: 14 }], [{ species: "Golem", level: 60 }, { species: "Steelix", level: 62 }]] }, { Blue: () => "GARY" });
  assert.deepStrictEqual(RaidDens.teamOf(RaidDens.LEADERS[0]), ["Golem", "Steelix"], "the highest-levelled team");
  assert.strictEqual(RaidDens.leaders({ gameClear: true }).find((L) => L.name === "Blue").label, "GARY", "your rival by his name");
  const bro = RaidDens.allies(RaidDens.DENS.find((d) => d.type === "Fire"), { stars: 3, species: "Vulpix", level: 30 }, ["Brock", "Blue"], () => 0.5);
  assert(["Golem", "Steelix"].includes(bro[0].record.species) && bro[1].trainer === "GARY", bro.map((a) => a.trainer + " " + a.record.species).join());
  RaidDens.setTeams({});
  const den = RaidDens.DENS[0], raid = { stars: 3, species: "Pikachu", level: 30 };
  const a = RaidDens.allies(den, raid, ["Lance", "Red"], () => 0.5);
  assert.strictEqual(a.length, 3);
  assert(a[0].trainer === "Lance" && a[0].leader && DEX[a[0].record.species], "Lance brings one of his own");
  assert(a[1].trainer === "Red" && ["Pikachu", "Charizard", "Blastoise", "Venusaur", "Espeon", "Snorlax"].includes(a[1].record.species));
  // (The region's trainers: a Pokémon from their own team, not evolved past it.)
  const own = (a2) => Object.values(WORLD_TRAINERS).some((t) => (t.className + " " + t.name) === a2.trainer && t.party.some((m) => m.species === a2.record.species));
  assert(own(a[2]), "a trainer's own Pokémon: " + a[2].trainer + " " + a[2].record.species);
}

// The lead Pokémon's abilities on the map, and Pickup (game/encounters.js).
{
  const E = Encounters, table = { slots: [{ species: "Pidgey", min: 2, max: 4 }, { species: "Mareep", min: 3, max: 5 }] };
  const lead = Party.create("Pikachu", 30);
  for (const [a, want] of [["Static", "Mareep"], ["Lightning Rod", "Mareep"], ["Magnet Pull", "Pidgey"], ["Run Away", "Pidgey"]]) {
    lead.ability = a;
    assert.strictEqual(E.leadWild({ species: "Pidgey", level: 3, slot: 0 }, lead, table, () => 0.1).species, want, a);
  }
  lead.ability = "Static";
  assert.strictEqual(E.leadWild({ species: "Pidgey", level: 3, slot: 0 }, lead, table, () => 0.9).species, "Pidgey", "half the time");
  lead.ability = "Keen Eye";
  assert.strictEqual(E.leadWild({ species: "Pidgey", level: 3, slot: 0 }, lead, table, () => 0.1), null);
  assert.strictEqual(E.leadWild({ species: "Pidgey", level: 26, slot: 0 }, lead, table, () => 0.1).species, "Pidgey");
  lead.ability = "Pressure";
  assert.strictEqual(E.leadWild({ species: "Pidgey", level: 2, slot: 0 }, lead, table, () => 0.1).level, 4);
  lead.ability = "Synchronize"; lead.nature = "Adamant";
  assert.strictEqual(E.leadRecord(Party.create("Sentret", 5), lead).nature, "Adamant");
  lead.ability = "Cute Charm"; lead.gender = "M";
  assert.strictEqual(E.leadRecord(Party.create("Sentret", 5), lead, () => 0.1).gender, "F");
  assert.strictEqual(E.leadRecord(Object.assign(Party.create("Sentret", 5), { gender: "M" }), lead, () => 0.9).gender, "M");
  assert.strictEqual(E.leadRecord(Party.create("Magnemite", 5), lead, () => 0.1).gender, "N");
  for (const [a, want] of [["Stench", 0.5], ["White Smoke", 0.5], ["Illuminate", 2], ["Arena Trap", 2], ["Blaze", 1]]) { lead.ability = a; assert.strictEqual(E.leadRateScale(lead), want, a); }
  assert.strictEqual(E.leadRateScale(null), 1);
  assert.strictEqual(E.PICKUP.length, 10);
  for (const row of E.PICKUP) { assert.strictEqual(row.reduce((a, [, p]) => a + p, 0), 100); for (const [it] of row) assert(ITEMS[it], it); }
  assert.strictEqual(E.pickupItem(1, () => 0), "potion");
  assert.strictEqual(E.pickupItem(100, () => 0), "full-restore");
  const z = Party.create("Zigzagoon", 12); z.ability = "Pickup"; z.item = "";
  assert.deepStrictEqual(E.pickup([z], () => 0.5), []);
  assert.strictEqual(E.pickup([z], () => 0.05).length, 1);
  assert(z.item && ITEMS[z.item]);
  assert.deepStrictEqual(E.pickup([z], () => 0.05), [], "holding something already");
  const egg = Party.create("Zigzagoon", 1); egg.ability = "Pickup"; egg.egg = true; egg.item = "";
  assert.deepStrictEqual(E.pickup([egg], () => 0.05), []);
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
    badges: () => ({ johto: 2, all: 10 }), dex: () => ({ seen: 0, caught: 0 }), caught: () => false, dayCare: () => [], frame: () => 0,
    money: () => wallet, addMoney: (n) => { wallet += n; }
  });
  let wallet = 500;
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
  assert(/<script src="ui\/pokegear\.js"><\/script>/.test(html) && /key: "gear", label: hasPokenav\(\) \? "PokéNav" : "Pokégear"/.test(gameJs) && /gear\.step\(\)/.test(gameJs));
  assert(["PhoneCall", "RegisterPokegearCard", "GetPhoneBookRematch", "UnsetPhoneCallTrigger"].every((c) => scriptJs.includes('case "' + c + '"')));
  // Mom: not on the Pokégear, and saving nothing (she's Ethan's mother here, not yours); an older save's
  // savings come back to you, and a gift she'd already bought is still with the deliveryman.
  assert(!gear.registered(0), "no Mom's number");
  s.phone.unshift(0);
  assert(!gear.registered(0), "an older save's Mom's number gone");
  s.f.FLAG_SYS_MOMS_SAVINGS = true;
  s.gear.mom = { balance: 1200, queue: [["super-potion", 1]], given: [0] };
  assert.strictEqual(gear.savePrize(4000), 0, "nothing saved");
  assert(wallet === 500 + 1200 && s.gear.mom.balance === 0 && !s.f.FLAG_SYS_MOMS_SAVINGS, "her savings back: " + wallet);
  said.length = 0;
  gear.deliveryman().then(() => {
    assert(s.gear.mom.queue.length === 0 && s.f.FLAG_HIDE_MOM_GIFT_DELIVERYMAN && /package for you/.test(said.join(" ")), "the deliveryman: " + said.join(" / "));
  }).catch((e) => { console.error(e); process.exit(1); });
  // Buena's Password: one of the thirty, the same all day (the step clock's).
  const pw = gear.passwordSet();
  assert(pw >= 0 && pw < 30 && gear.passwordSet() === pw);
  // The Gym Leaders: all sixteen at Saffron's Dojo with their rematch teams, their day and time from the phone book.
  assert.strictEqual(Object.keys(P.leaders).length, 16);
  for (const [i, L] of Object.entries(P.leaders)) assert(TR[L.trainer] && TR[L.trainer].party.length && L.intro.length && P.contacts[i].day != null, "leader " + i);
  assert(fs.existsSync(path.join(root, "assets/world/sprites/hgss_gsleader11.png")) && /gear\.talkPerson\(ev\.person/.test(gameJs) && /gear\.savePrize\(/.test(gameJs));
  assert(/case "GetBuenasPassword"/.test(scriptJs));
}

// Shiny Pokémon: 1 in 4096; kept through saving; trainers' never are.
{
  assert.strictEqual(Party.SHINY_ODDS, 4096);
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
  assert.strictEqual(Breeding.makeEgg(mk("Azumarill", "F"), mk("Azumarill", "M"), { rng }).species, "Azurill", "no incense needed: Azurill");
  assert.strictEqual(Breeding.makeEgg(mk("Blissey", "F"), mk("Ditto", "N"), { rng }).species, "Happiny", "Blissey: Happiny");
  assert.strictEqual(Breeding.makeEgg(mk("Raichu", "F"), mk("Pikachu", "M"), { rng }).species, "Pichu", "Raichu: Pichu");
  assert.deepStrictEqual(window.XD_PURIFICATION_MOVES.Zapdos.slice().sort(), ["Baton Pass", "Extrasensory", "Metal Sound", "Thunderbolt"], "XD: Zapdos's four");
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
  assert.strictEqual(m.ivs.atk, 31, "the IV itself is 31 now");
  assert(Party.stats(m).atk > before.atk && Party.toBattleSet(m).ivs.atk === 31, "Attack acts as 31");
  assert(!Bag.canUseOn(m, "bottle-cap", { stat: "atk" }), "trained once");
  Bag.useOn(m, "gold-bottle-cap");
  assert.deepStrictEqual(Bag.trainableStats(m), [], "a Gold Bottle Cap trains the rest");
  assert(m.hp > hp, "trained HP raises current HP too");
  assert(!Bag.canUseOn(m, "gold-bottle-cap"));
  const saved = Player.load(JSON.parse(Player.serialize(Object.assign(Player.create("T", 0), { party: [m] })))).player.party[0];
  assert.deepStrictEqual(saved.hyper.slice().sort(), Party.STAT_KEYS.slice().sort(), "saves keep Hyper Training");
  // (Fly to Victory Road, once you've been inside: outside its entrance, open ground by the cave's door.)
  {
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), r23 = WORLD_MAPS.Route23;
    assert(/TOWN_MAP\.fly\.KANTO_VICTORY_ROAD = \{ map: "Route23", x: 5, y: 29 \}/.test(gameJs) && /const flySec = /.test(gameJs));
    assert(!r23.collision[29 * r23.width + 5] && r23.warps.some((w) => w.map === "VictoryRoad_1F" && w.x === 5 && w.y === 28));
  }
}

// Johto (data/johto-maps.js, from HeartGold and SoulSilver): New Bark Town to
// Violet, Azalea and Goldenrod (with their routes, gatehouses, Union Cave,
// Ilex Forest and the Ruins of Alph), and Route 27, Tohjo Falls and Route 26 to
// Kanto, joined to each other; Kanto's only way in is the League gate's
// west door (Route22_NorthEntrance), its guard there until you're Champion.
{
  // (Johto's maps: those east of New Bark Town, Route 26 to Mt. Silver, are Kanto's for Badges and level caps, so region "kanto".)
  const EAST = /^(Route2[678]|TohjoFalls|MtSilver)/;
  const J = Object.keys(WORLD_MAPS).filter((n) => WORLD_MAPS[n].region === "johto" || (EAST.test(n) && window.JOHTO_TOWN_MAP.at[n]));
  for (const n of ["CherrygroveCity", "Route29", "NewBarkTown", "Route27", "TohjoFalls", "Route26", "Route30", "Route31", "VioletCity", "Route32",
    "Route33", "AzaleaTown", "Route34", "GoldenrodCity", "Route35", "Route36", "RuinsOfAlph", "Route46", "UnionCave_1F", "IlexForest",
    "Route29_Route46_Gatehouse", "Route31_VioletGatehouse", "Route32_RuinsOfAlph_Gatehouse",
    "Route36_RuinsOfAlph_Gatehouse", "Route35_Goldenrod_Gatehouse", "AzaleaTown_IlexForest_Gatehouse", "Route34_IlexForest_Gatehouse"]) assert(J.includes(n), n + " is built");
  for (const name of J) {
    const m = WORLD_MAPS[name];
    assert(m && m.region === (EAST.test(name) ? "kanto" : "johto"), name + " is built");
    for (const k of ["collision", "behavior", "elevation", "encounter"]) assert.strictEqual(m[k].length, m.width * m.height, name + " " + k);
    for (const c of m.connections) assert(J.includes(c.map), name + " connects only within Johto");
    // (A map drawn with another's pictures, WORLD_MAPS[..].image: New Bark Town's Pokémon Center, Cherrygrove's.)
    for (const part of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps", (m.image || name) + part + ".png")), name + part);
    for (const p of m.people) assert(fs.existsSync(path.join(root, "assets/world/sprites", p.sprite + ".png")), p.sprite);
    for (const t of [m.wild, m.water]) if (t) for (const s of t.slots) assert(DEX[s.species], name + ": " + s.species);
    for (const h of m.hidden) assert(ITEMS[h.item], h.item);
  }
  assert.deepStrictEqual(new Set(WORLD_MAPS.Route29.wild.slots.map((s) => s.species)), new Set(["Pidgey", "Sentret", "Rattata"]), "Route 29 by day");
  // (Signs on Heart & Soul's signposts, matched by what they say: Kurt's, the well's and the town's in Azalea, the
  // shrine and Trainer Tips in Ilex Forest; Slowpoke Well's Kurt by its ladder, the other out of sight till his scene.)
  const signAt = (n, x, y) => WORLD_MAPS[n].signs.some((g) => g.x === x && g.y === y && g.text);
  assert([[17, 11], [55, 12], [50, 23]].every(([x, y]) => signAt("AzaleaTown", x, y)) && signAt("IlexForest", 32, 36) && signAt("IlexForest", 23, 27), "Azalea's and Ilex Forest's signs on their signposts");
  const kurts = WORLD_MAPS.SlowpokeWell_B1F.people.filter((p) => p.sprite === "hgss_gantetsu");
  assert(kurts.length === 2 && kurts.some((p) => p.x === 27 && p.y === 26) && kurts.some((p) => p.x === 0 && p.y === 0), "one Kurt in Slowpoke Well, by the ladder");
  assert(/who === "obj_partner_poke" \? \(followerShown\(\) \? pal : null\)/.test(fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8"))
    && /function followerWalk\(map, t\)/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")), "your walking Pokémon walks in a scene (Ilex Forest's Kimono Girl)");
  // (Scenes walked Heart & Soul's way, sceneMoves: Lyra to her grandpa and into the Day-Care by its side door, the
  // Day-Care Man over to you with his number, Lyra up the stairs of whichever Underground room you came in by.)
  assert(WORLD_MAPS.Route34.sceneMoves["obj_R34_var_1 _049C"][0] === "to:30,34" && WORLD_MAPS.Route34.sceneMoves["obj_R34_gsoldman1 _0130"]
    && Object.keys(WORLD_MAPS.Route34_Daycare.sceneMoves).length >= 10, "Route 34's Day-Care scenes, on Heart & Soul's ground");
  assert(WORLD_MAPS.GoldenrodCity_Tunnel_1F.sceneMoves["obj_D37R0101_var_1 _01C4 @x>=14"][0] === "at:23,3"
    && WORLD_MAPS.GoldenrodCity_Tunnel_1F.sceneMoves["obj_D37R0101_var_1 _01C4 @x<14"][0] === "at:4,3", "the Underground's Lyra, in either room");
  assert(WORLD_MAPS.Route34.people.some((p) => p.script === "Johto_DaycareMan") && WORLD_MAPS.Route34_Daycare.people.some((p) => p.script === "Johto_DaycareLady"),
    "Route 34's Day-Care couple at work");
  assert(/johto: \{ list: "johtoDayCare", eggs: "johtoDayCareEggs"/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")), "its own Day-Care, not Four Island's");
  // (This game's changes: the Ruins of Alph's grass at Lv. 7-11; Houndour, Slugma and Larvitar on Johto's routes.)
  assert(WORLD_MAPS.RuinsOfAlph.wild.slots.every((s) => s.min >= 7 && s.max <= 11), "the Ruins of Alph at Lv. 7-11");
  assert(WORLD_MAPS.Route37.wild.slots.some((s) => s.species === "Houndour") && WORLD_MAPS.Route42.wild.slots.some((s) => s.species === "Slugma")
    && WORLD_MAPS.Route45.wild.slots.some((s) => s.species === "Larvitar"), "Houndour, Slugma and Larvitar on Johto's routes");
  assert(!Object.values(WORLD_MAPS).some((m) => m.region !== "johto" && !EAST.test(m.name) && m.connections.some((c) => J.includes(c.map))), "nothing in Kanto leads to Johto");
  // (Johto's maps are Pokémon Heart & Soul's (tools/lib/hns-johto.js), HGSS's events moved onto them: places by what's there.)
  const NB = WORLD_MAPS.NewBarkTown, west = [...Array(NB.height).keys()].find((y) => !NB.collision[y * NB.width]);
  assert(west != null && World.step({ map: "NewBarkTown", x: 0, y: west }, "left").map === "Route29", "west out of New Bark Town");
  assert.strictEqual(World.fishingEncounter("NewBarkTown", "old-rod", () => 0).species, "Magikarp", "Gen 4 rods");
  const home = NB.warps.find((w) => w.map === "NewBarkTown_PlayerHouse_1F");
  assert(home && World.step({ map: "NewBarkTown", x: home.x, y: home.y + 1 }, "up").warp.map === "NewBarkTown_PlayerHouse_1F", "New Bark's houses are built");
  // (Every Johto map Heart & Soul has is drawn from it, with HGSS's map it stands for, and where HGSS's maps went.)
  for (const n of ["NewBarkTown", "VioletCity", "EcruteakCity", "Route32", "OlivineCity_Lighthouse_3F", "SSAqua_1F_NortheastRooms", "MahoganyTown_GymRoom1"]) assert(WORLD_MAPS[n].hgss && WORLD_MAPS[n].hgss.some((h) => h.map === n), n + " is Heart & Soul's");
  assert(window.JOHTO_COORDS.where.MahoganyTown_GymLeaderRoom === "MahoganyTown_GymRoom1" && !WORLD_MAPS.MahoganyTown_GymLeaderRoom, "Pryce's room in his Gym");
  assert(!WORLD_MAPS.PokeathlonDome.hgss && WORLD_MAPS.PokeathlonDome, "the Pokéathlon's dome HGSS's own");
  // (Not the Battle Frontier's halls, which need games of their own.)
  assert(WORLD_MAPS.BattleFrontier.warps.some((w) => w.mapConst === "MAP_BATTLE_FRONTIER_BATTLE_FACTORY"), "the Battle Factory isn't built");
  // Every built warp's way back; every map reached from New Bark Town (walking, Surf, Waterfall, Whirlpool, Rock Climb).
  // (But for the maps scripts take you to: the Bug-Catching Contest's National Park, the Safari Zone's way in;
  // and, for reaching them, those you come to by a script, a train, an elevator or a hole in the floor: the
  // Ruins of Alph's hidden rooms, the Sinjoh Ruins, the Magnet Train, the Radio Tower's deck, the Lighthouse's top.)
  const JOHTO_BY_SCRIPT = /^(NationalPark_BugCatchingContest|SafariZone_EntranceInterior)$/;
  const JOHTO_NOT_WALKED = /^(NationalPark_BugCatchingContest|SafariZone_EntranceExterior|RuinsOfAlph_\w+HiddenRoom|RuinsOfAlph_\w*SinjohEvent2?|SinjohRuins_\w+|EmbeddedTower_\w+|GoldenrodCity_MagnetTrainStation_2F|GoldenrodCity_RadioTowerObservationDeck|OlivineCity_Lighthouse(Exterior|_5F|LightRoom))$/;
  // (Heart & Soul's ways that go one way: the Lighthouse's drops to the floor below, the Ruins' word rooms out to the
  // hall, the Ruins' entrance hall out through the Hall door (which leads down: tools/lib/johto-changes.js), and the
  // S.S. Aqua's way off, which ui/game.js's ssAquaExit sets as the ship docks.)
  const ONE_WAY = (n, w) => /^OlivineCity_Lighthouse/.test(n) && /^OlivineCity_Lighthouse/.test(w.map) || /^RuinsOfAlph_\w+HiddenRoom$/.test(n) ||
    (/^RuinsOfAlph_HallEntrance/.test(n) && w.map === "RuinsOfAlph") || (n === "SSAqua_1F" && /^SSAqua_OlivinePort/.test(w.map)) || (n === "SSAqua_OlivinePortExterior" && w.map === "SSAqua_1F");
  for (const n of J.filter((n) => !JOHTO_BY_SCRIPT.test(n))) for (const [i, w] of WORLD_MAPS[n].warps.entries()) if (w.map && J.includes(w.map) && !ONE_WAY(n, w)) {
    const back = WORLD_MAPS[w.map].warps[w.warp];
    // (An elevator's way back: wherever you got in, FireRed's dynamic warp.)
    assert(back && (back.map === n || back.mapConst === "MAP_DYNAMIC"), n + " warp " + i + " to " + w.map + " and back");
  }
  {
    const key = (p) => p.map + ":" + p.x + ":" + p.y, start = { map: "NewBarkTown", x: home.x, y: home.y + 1 }, seen = new Set([key(start)]), q = [start], reached = new Set();
    while (q.length) {
      const p = q.shift(); reached.add(p.map);
      for (const d of ["up", "down", "left", "right"]) for (const surf of [false, true]) {
        const r = World.step(p, d, null, surf ? { surf: true } : undefined);
        let n = r.warp && r.warp.map ? { map: r.warp.map, x: r.warp.x, y: r.warp.y } : r.ok ? { map: r.map, x: r.x, y: r.y } : null;
        if (!n && !surf) { const b = World.blockAt(p.map, p.x + World.DIRS[d][0], p.y + World.DIRS[d][1]); if (b.map && b.behavior === World.MB.WATERFALL) n = { map: b.map, x: b.x, y: b.y }; }
        // (Onto the water from the shore, as Surf starts (facingWater), whatever its height: Heart & Soul's maps, as Emerald's, have the water lower.)
        if (!n && surf && World.facingWater(p, d)) { const b = World.blockAt(p.map, p.x + World.DIRS[d][0], p.y + World.DIRS[d][1]); n = { map: b.map, x: b.x, y: b.y }; }
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
  // Each Gym Leader can be walked up to from the Gym's door (Azalea's: its Ariados ride from each station to the one
  // it pairs with, ui/game.js azaleaRide).
  for (const g of J.filter((n) => /_Gym$|_GymLeaderRoom$|^MahoganyTown_GymRoom1$/.test(n))) {
    const m = WORLD_MAPS[g], leader = m.people.find((p) => /^hgss_gsleader\d$/.test(p.sprite));
    const start = { map: g, x: m.warps[0].x, y: m.warps[0].y - 1 }, key = (p) => p.x + ":" + p.y, seen = new Set([key(start)]), q = [start];
    const occupied = (mm, x, y) => m.people.some((p) => p.x === x && p.y === y && !p.trainer);
    let near = false;
    const RIDE = { 1: 5, 5: 1, 2: 6, 6: 2, 3: 4, 4: 3, 7: 10, 10: 7, 8: 12, 12: 8, 9: 11, 11: 9 };
    const station = (n) => m.triggers.find((t) => t.script === "Johto_AzaleaRide:" + n);
    while (q.length) {
      const p = q.shift();
      if (Math.abs(p.x - leader.x) + Math.abs(p.y - leader.y) === 1) near = true;
      const ride = m.triggers.find((t) => t.x === p.x && t.y === p.y && /^Johto_AzaleaRide:/.test(t.script)), to = ride && station(RIDE[+ride.script.split(":")[1]]);
      if (to && !seen.has(key(to))) { seen.add(key(to)); q.push({ map: g, x: to.x, y: to.y }); }
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
    // (Heart & Soul's: its whirlpools, people there: tools/lib/hns-johto.js. Its maps, as Gold and Silver's, have no
    // rocky walls; the HGSS maps this game keeps have none either.)
    assert(whirl("Route41") >= 6 && whirl("DragonsDen") >= 2, "Johto's whirlpools");
    void climbs;
    const R = WORLD_MAPS.Route41, i = R.behavior.indexOf(World.MB.WHIRLPOOL), wx = i % R.width, wy = Math.floor(i / R.width);
    const from = [["up", 0, 1], ["down", 0, -1], ["left", 1, 0], ["right", -1, 0]].find(([, dx, dy]) => World.isSurfable(World.blockAt("Route41", wx + dx, wy + dy).behavior));
    assert(from && World.step({ map: "Route41", x: wx + from[1], y: wy + from[2] }, from[0], null, { surf: true }).whirlpool, "a whirlpool stops you surfing");
    assert(World.climbable(World.MB.ROCK_CLIMB_NS, "up") && World.climbable(World.MB.ROCK_CLIMB_EW, "left") && !World.climbable(World.MB.ROCK_CLIMB_NS, "left"), "rocky walls are climbed their way");
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
  assert(/function ssAquaExit\(\)/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")) && /^SSAqua_OlivinePort/.test(WORLD_MAPS.SSAqua_1F.warps[0].map));
  // The Magnet Train (tools/build-magnet-train.js, ui/magnet-train.js): Saffron's station, Kanto's, and
  // its new door in FireRed's Saffron; no Pass at the gates; Goldenrod's always runs, Saffron's once
  // you're Champion; the ride off to the other station's platform.
  {
    const st = WORLD_MAPS.SaffronCity_MagnetTrainStation_1F, saffron = WORLD_MAPS.SaffronCity;
    // (Its platform, 2F: a map of its own in HGSS; in Pokémon Heart & Soul's station, the same map, ui/johto-coords.js taking the scripts there.)
    const platform = (n) => WORLD_MAPS[n] || window.JOHTO_COORDS.where[n] === st.name;
    assert(st && st.region === "kanto" && platform("SaffronCity_MagnetTrainStation_2F") && platform("SaffronCity_MagnetTrainStation_2F_Empty"), "Saffron's station");
    const door = saffron.warps.find((w) => w.map === st.name);
    assert(door && st.warps[0].map === "SaffronCity" && saffron.warps[st.warps[0].warp] === door && saffron.patches.magnettrain, "its door");
    assert(fs.existsSync(path.join(root, "assets/world/maps/SaffronCity-patch-magnettrain.png")));
    for (const z of ["T25R0501", "T11R0601"]) assert(!JOHTO_SCRIPTS.zones[z].cmds.some((c) => c[0] === "HasItem"), "no Pass: " + z);
    assert(!JOHTO_SCRIPTS.zones.T25R0501.cmds.some((c) => c.includes("FLAG_RESTORED_POWER")) && JOHTO_SCRIPTS.zones.T11R0601.cmds.some((c) => c.includes("FLAG_RESTORED_POWER")));
    assert(/Champion/.test(JOHTO_SCRIPTS.messages.msg_0535_T11R0601_00000.join(" ")));
    assert.strictEqual(JOHTO_SCRIPTS.mapConsts[401], "SaffronCity_MagnetTrainStation_2F");
    assert.strictEqual(JOHTO_SCRIPTS.mapConsts[198], "GoldenrodCity_MagnetTrainStation_2F");
    assert(/case "ScrCmd_722":/.test(fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8")));
    const sandbox = { window: {}, setTimeout };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/magnet-train.js"), "utf8"), sandbox, { filename: "ui/magnet-train.js" });
    const flags = {}, log = [], pl = { flags: {} };
    const T = sandbox.window.MagnetTrain.create({ player: () => pl, johto: { setFlag: (n, on) => { flags[n] = on; } }, music: (s) => log.push(s),
      sleep: async () => {}, fadeOut: async () => log.push("fade"), warp: async (...a) => log.push(a.join(",")) });
    T.enter("SaffronCity_MagnetTrainStation_1F");
    assert.strictEqual(flags.FLAG_RESTORED_POWER, false, "Saffron's train waits for the Champion");
    pl.flags.gameClear = true;
    T.enter("SaffronCity_MagnetTrainStation_1F");
    assert.strictEqual(flags.FLAG_RESTORED_POWER, true);
    T.ride(0, 401, 14, 11).then(() => assert.deepStrictEqual(log, ["fade", "gs_e_linear", "401,14,11,down"])).catch((e) => { console.error(e); process.exit(1); });
  }
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
    // (Gyms drawn from Pokémon Heart & Soul's, their maps' `hgss`, have its own puzzles: none of HGSS's gimmicks there.)
    if (V.hgss) {
      G.enter("VioletCity_Gym");
      assert(!V.triggers.some((t) => /T22GYM0101_004/.test(t.script || "")), "no HGSS lift trigger on Heart & Soul's Violet Gym");
      assert(!G.liftUp());
      for (const n of ["MahoganyTown_GymRoom1", "MahoganyTown_GymRoom2", "MahoganyTown_GymLeaderRoom"]) assert(!WORLD_MAPS[n] || !WORLD_MAPS[n].people.some((p) => p.iceBlock), n + ": no HGSS ice blocks");
      G.enter("EcruteakCity_Gym");
      assert.strictEqual(G.darkness("EcruteakCity_Gym"), null, "Heart & Soul's Ecruteak Gym isn't dark");
      G.enter("CianwoodCity_Gym");
      G.turnWinch();
      assert.deepStrictEqual([...G.patches("CianwoodCity_Gym")], []);
      assert(JOHTO_SCRIPTS.zones.T24GYM0101.cmds.some((c) => c[0] === "SetFlag" && c.includes("FLAG_SYS_CIANWOOD_WATERFALL_DISABLE")), "Cianwood's falls off");
    } else {
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
    }
    const gameJs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8"), scriptJs = fs.readFileSync(path.join(root, "ui/johto-script.js"), "utf8");
    assert(/case "VioletGymElevator"/.test(scriptJs) && /case "CianwoodGymTurnWinch"/.test(scriptJs), "the Gyms' script commands run");
    assert(/darkness: \(map\) => .*gymmicks\.darkness\(map\)/.test(gameJs) && /gymmicks\.enter\(m\)/.test(gameJs));
    // (Found playing the story: Falkner was away on Mondays from the start, HGSS's
    // days off counting from Kanto's Soul Badge, which you come to Johto with;
    // and the rival took your starter, the script's 152 never equal to "Chikorita".)
    assert(/hasBadge: \(n\) => \(n >= 8 \? !!player\.flags\.johtoLeagueClear && /.test(gameJs), "Kanto's Badges count after Johto's League");
    assert(/typeof q === "string" \? speciesOf\(p\)/.test(scriptJs), "a species by name against its dex number");
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
  // Object Arrangement (ui/johto-safari.js, ui/johto-safari-objects.js): HGSS's
  // 24 objects in Baoba's four groups, their pictures; Baoba's calls unlock
  // them; an Area's objects (worth more the more days, of the step clock, it's
  // been in the layout) bring its bonus Pokémon over its first slots.
  {
    const D = window.JOHTO_SAFARI, SZ = WORLD_MAPS.SafariZone_EntranceExterior;
    assert(D.objects.length === 24 && D.objects[3].name === "Tree" && D.objects[3].w === 2 && D.objects[3].type === "forest" && D.objects[12].type === null, "HGSS's objects");
    assert(D.groups.length === 4 && D.groups.every((g) => g.length === 6) && D.unlockOrder.length === 40 && D.boosts[0].join() === "1,5,10,15,20", "Baoba's groups and the points by days");
    assert(fs.existsSync(path.join(root, "assets/world/maps/SafariZone_EntranceExterior-objects.png")) && D.objects.every((o) => o.sprite.length === 5 && o.sprite[1] > 0), "the objects' pictures");
    assert(D.areas.every((a) => a.place.length === 1024) && D.areas[0].mons.land.bonus[0].needs.join() === "plains,3", "where objects go; the Plains' Girafarig wants 3 Plains points");
    let steps = 1000;
    const Pl = { STEPS_PER_HOUR: 100, gameTime: () => ({ steps, day: Math.floor(steps / 2400) }) };
    const sandbox = { window: { WORLD_MAPS, JOHTO_SAFARI: D, JOHTO_SCRIPTS, JOHTO_PHONE: window.JOHTO_PHONE, Player: Pl } };
    vm.runInNewContext(fs.readFileSync(path.join(root, "ui/johto-safari.js"), "utf8"), sandbox, { filename: "ui/johto-safari.js" });
    const p = { name: "GOLD", trainerId: 10, flags: { johtoSafari: { layout: [0, 7, 1, 5, 3, 6] } }, party: [], location: { map: "SafariZone_EntranceExterior", x: 40, y: 40 } };
    const vars = { VAR_UNK_4057: 3 }, triggers = {}, said = [];
    const S = sandbox.window.JohtoSafari.create({ player: () => p, getVar: (k) => vars[k] || 0, setVar: (k, v) => { vars[k] = v; }, teleport: async () => {},
      say: async (t) => said.push([].concat(t).join(" ")), confirm: async () => true, choose: async () => 0, sfx: () => {}, roomFor: () => true, applyPatches: () => {},
      frameScript: async () => {}, isGirl: () => false, phone: () => true, phoneTrigger: (n, on) => { triggers[n] = on; }, nationalDex: () => true, here: () => here });
    let here = { x: 0, y: 0 };
    S.patches("SafariZone_EntranceExterior");
    // Baoba's calls: three hours (300 steps) after his clock, the next test; then the objects.
    S.stamp(); S.tick();
    assert(!triggers[7], "not yet");
    steps += 300; S.tick();
    assert(triggers[7] && S.phoneCall(142) === null && vars.VAR_UNK_4057 === 4, "Baoba's next test, on the Pokégear");
    vars.VAR_UNK_4057 = 6; S.stamp(); steps += 300; S.tick();
    assert(triggers[8] && S.phoneCall(143) === null && vars.VAR_UNK_4057 === 7 && p.flags.johtoSafari.unlock === 1, "Object Arrangement");
    assert.deepStrictEqual(S.unlockedIds(), [0, 1, 2, 19, 20, 12], "Trainer ID ...0: the Plains objects first");
    // Three Shrubbery in the Plains (place 0): 3 Plains points, the Girafarig.
    assert(S.slotsOf(0, "land")[0][1][0] !== "Girafarig");
    // (n objects on the open ground of an Area, a tile apart.)
    const scatter = (a, id, n) => { const at = []; for (let k = 0; k < 1024 && at.length < n; k += 2) if (S.fits(a, id, k & 31, k >> 5, -1)) { S.place(a, id, k & 31, k >> 5); at.push(k); } return at; };
    const put = scatter(0, 0, 3);
    assert(S.points(0).points.plains === 3 && S.slotsOf(0, "land")[0][1][0] === "Girafarig", "the Plains' bonus Pokémon");
    assert(SZ.collision[(32 + (put[0] >> 5)) * SZ.width + 32 + (put[0] & 31)] === 1 && !S.fits(0, 0, put[0] & 31, put[0] >> 5, -1), "an object blocks its tile");
    // Six more in the Meadow (place 2): 6 points, the Chansey wants 12; ten days (of steps) on, each is worth 2, and Baoba calls.
    scatter(1, 1, 6);
    const chansey = () => S.slotsOf(1, "land").some((v) => v[1][0] === "Chansey");
    assert(S.points(1).points.plains === 6 && !chansey());
    steps += 10 * 2400; S.tick();
    assert(S.points(1).points.plains === 12 && chansey() && triggers[6], "ten days on: the Meadow's Chansey");
    assert(/Meadow/.test(S.phoneCall(null).join(" ")), "Baoba says where");
    // In the Safari Game: A facing an open spot places one, facing one takes it away.
    S.action(0);
    const open = [...Array(1024).keys()].find((k) => k > 64 && S.fits(0, 0, k & 31, k >> 5, -1) && S.fits(0, 0, k & 31, (k >> 5) + 1, -1)), fx = 32 + (open & 31), fy = 32 + (open >> 5);
    here = { x: fx, y: fy + 1 };
    assert(S.faced("SafariZone_EntranceExterior", fx, fy, false) && !S.faced("SafariZone_EntranceExterior", 2, 2, false));
    S.fieldObject(fx, fy).then(() => {
      assert(S.points(0).count.plains === 4 && /Placed Shrubbery/.test(said.join("|")), "placed in the field: " + said.join("|"));
      return S.fieldObject(fx, fy);
    }).then(() => assert(S.points(0).count.plains === 3 && /Removed the Shrubbery/.test(said.join("|")), "taken away"));
    const owJs = fs.readFileSync(path.join(root, "ui/overworld.js"), "utf8"), gearJs = fs.readFileSync(path.join(root, "ui/pokegear.js"), "utf8");
    assert(/ctx\.faced && ctx\.faced\(/.test(owJs) && /6: \[24, null\], 7: \[24, 142\]/.test(gearJs) && /env\.baobaCall\(script\)/.test(gearJs), "the field and the Pokégear's sides");
    assert(scripts.indexOf("ui/johto-safari-objects.js") >= 0 && scripts.indexOf("ui/johto-safari-objects.js") < scripts.indexOf("ui/game.js"), "the arranging screen loads");
  }
  // (Everyone's picture is there: HGSS's own (hgss_*) for everyone but the item balls, Cut trees and rocks,
  // at Kanto's people's size: 32x32 frames, the person no taller than Kanto's; upstairs in a Pokémon Center
  // is FireRed's own floor, its people too.)
  const { readPng } = require(path.join(root, "tools/lib/png.js"));
  for (const n of J.filter((n) => !/_PokemonCenter_2F$/.test(n))) for (const p of WORLD_MAPS[n].people) {
    assert(fs.existsSync(path.join(root, "assets/world/sprites", p.sprite + ".png")), n + ": " + p.sprite + "'s picture");
  }
  for (const n of ["hgss_hero", "hgss_heroine", "hgss_gsleader1", "hgss_gsrivel"]) {
    const png = readPng(path.join(root, "assets/world/sprites", n + ".png"));
    let top = 32;
    for (let y = 0; y < 32 && top === 32; y++) for (let x = 0; x < 32; x++) if (png.rgba[(y * png.width + x) * 4 + 3]) { top = y; break; }
    assert(png.height === 32 && png.width === 32 * 9 && top >= 10, n + " stands no taller than Kanto's people (from row " + top + ")");
  }
  assert(/scalePersonSheet\(rgba, W, 32, order\.length\)/.test(fs.readFileSync(path.join(root, "tools/build-johto.js"), "utf8")), "the build scales HGSS's people");
  for (const n of ["hgss_gsboy1", "hgss_gsman1", "hgss_pcwoman1"]) assert(fs.existsSync(path.join(root, "assets/world/sprites", n + ".png")), n + ": HGSS's own sheet");
  assert(J.filter((n) => !/_PokemonCenter_2F$/.test(n)).every((n) => WORLD_MAPS[n].people.every((p) => /^hgss_/.test(p.sprite) || ["item_ball", "cut_tree", "rock_smash_rock"].includes(p.sprite) || p.apricorn)), "Johto's people all in HGSS's sprites");
  // (The maps are HGSS's own, seen from above: the gatehouses and Pokémon Centers HGSS's rooms (their
  // nurses healing as Kanto's), nothing painted in FireRed's style any more.)
  for (const n of J.filter((n) => /Gatehouse$/.test(n))) assert(WORLD_MAPS[n].hgss || WORLD_MAPS[n].width === 32, n + " is HGSS's own gatehouse, or Heart & Soul's");
  assert(WORLD_MAPS.Route27.hgss ? WORLD_MAPS.Route27.anim : !fs.existsSync(path.join(root, "assets/world/maps/Route27-anim.png")) && !WORLD_MAPS.Route27.anim, "HGSS's look: no painted water animation (Heart & Soul's: its tileset's own)");
  assert(fs.existsSync(path.join(root, "assets/world/maps/NewBarkTown.png")) && fs.existsSync(path.join(root, "assets/world/maps/NewBarkTown-top.png")));
  {
    const pc = WORLD_MAPS.CherrygroveCity_PokemonCenter_1F, up = WORLD_MAPS.CherrygroveCity_PokemonCenter_2F;
    assert(pc.pokemonCenter && (pc.hgss || pc.width === 32) && pc.people.some((p) => p.script === "CherrygroveCity_PokemonCenter_1F_EventScript_Nurse" && p.sprite === "hgss_pcwoman1"), "HGSS's Center, its nurse in HGSS's sprite");
    assert(!pc.people.some((p) => /FLAG_HIDE_(COMM|WIFI)/.test(p.hgssFlag || "")), "no Wi-Fi staff");
    const stairs = pc.warps.find((w) => w.map === "CherrygroveCity_PokemonCenter_2F");
    assert(stairs && up && up.warps.some((w) => w.map === "CherrygroveCity_PokemonCenter_1F" && w.warp === pc.warps.indexOf(stairs)), "its stairs go up to FireRed's 2F and back");
  }
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
  {
    const NB = WORLD_MAPS.NewBarkTown, ex = NB.width - 1, ey = [...Array(NB.height).keys()].find((y) => ((b) => b >= 0x10 && b <= 0x15)(NB.behavior[y * NB.width + ex]));
    assert.strictEqual(World.step({ map: "NewBarkTown", x: ex, y: ey }, "right", null, { surf: true }).map, "Route27", "east out of New Bark Town, by sea");
    const r26 = WORLD_MAPS.Route27.connections.find((c) => c.map === "Route26");
    assert(r26 && r26.direction === "right", "Route 26 east of Route 27's end");
  }
  // Tohjo Falls: in and out of Route 27 both ways; its waterfalls are Waterfall's, not walls.
  for (const [i, w] of WORLD_MAPS.TohjoFalls.warps.entries()) if (w.map) assert.strictEqual(WORLD_MAPS[w.map].warps[w.warp].map, "TohjoFalls", "Tohjo Falls warp " + i);
  const tf = WORLD_MAPS.TohjoFalls, falls = tf.behavior.map((b, i) => [b, i]).filter(([b]) => b === World.MB.WATERFALL);
  assert(falls.length >= 10 && falls.every(([, i]) => !tf.collision[i]), "Tohjo Falls' waterfalls");
  // The League gate: its west mat to Route 26's door, and back; nothing else in Kanto leads to Johto.
  const gate = WORLD_MAPS.Route22_NorthEntrance, gw = gate.warps.findIndex((w) => w.map === "Route26");
  const r26 = WORLD_MAPS.Route26.warps.filter((w) => w.map === "Route22_NorthEntrance");
  assert(gw >= 0 && r26.length === 2 && r26.every((w) => w.warp === gw) && WORLD_MAPS.Route26.warps[gate.warps[gw].warp] === r26[0]);
  assert(gate.patches.johto && fs.existsSync(path.join(root, "assets/world/maps/Route22_NorthEntrance-patch-johto.png")));
  // (Besides Johto's own east, Route 26 to Mt. Silver, Kanto's for Badges: they lead to Johto's maps.)
  assert(!Object.values(WORLD_MAPS).some((m) => m.region !== "johto" && m.name !== "Route22_NorthEntrance" && !/^(Route2[678]|TohjoFalls|MtSilver)/.test(m.name) && m.warps.some((w) => J.includes(w.map))), "only the gate");
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
  const a = PK.performance(mon, 15), b = PK.performance(mon, 15);
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
  // HGSS's points for each event's result (overlay 96's ov96_0221D9C8), 200 at most.
  const EP = PE.eventPoints;
  assert.deepStrictEqual(EP("hurdle", [3000, 1725, 6000, 100]), [115, 200, 57, 200]);
  assert.deepStrictEqual(EP("relay", [12288, 0, 1024, 30000]), [120, 0, 10, 200]);
  assert.deepStrictEqual(EP("disc", [40, 0, 10, 100]), [121, 30, 83, 136]);
  assert.deepStrictEqual(EP("lamp", [350, 7, 0, 1000]), [100, 2, 0, 200]);
  assert.deepStrictEqual(EP("pennant", [35, 1, 0, 70]).concat(EP("ring", [70, 3, 0, 1]), EP("block", [80, 0, 1, 300])), [105, 3, 0, 200, 105, 4, 0, 1, 80, 0, 1, 200]);
  // (Goal Roll: five a goal, and 100, 80, 70 or 60 for the place, a tie taking the lower.)
  assert.deepStrictEqual(EP("goal", [3, 5, 5, 0]), [85, 105, 105, 60]);
  // The closing ceremony's bonuses: the Challenge Bonus (75 less the base stars), the
  // No-Miss Bonus, the points leader, and the prize for effort.
  assert.strictEqual(PK.challenge({ mons: [0, 1, 2].map(() => ({ species: "Pikachu" })) }), 75 - 3 * 5 * 3, "Pikachu: three stars in each");
  const acts = (o) => Object.assign({ failed: 0, jumped: 0, points: 0, tackled: 0, fell: 0, dashed: 0, switched: 0, impeded: 0 }, o);
  const four = [0, 1, 2, 3].map((t) => [0, 1, 2].map((i) => acts(t === 1 && i === 2 ? { points: 9, jumped: 4, failed: 1 } : t === 2 && i === 0 ? { fell: 2, jumped: 4 } : {})));
  const bo = PK.bonuses([0, 1, 2, 3].map(() => ({ mons: [0, 1, 2].map(() => ({ species: "Pikachu" })) })), four, () => 0);
  assert.strictEqual(bo.noMiss.length, 10, "ten didn't miss");
  assert.strictEqual(JSON.stringify(bo.leader), "[[1,2]]");
  assert(bo.effort === "jumped" && bo.effortMons.length === 2, "the most jumps: two of them");
  // ScrCmd_724's records (src/field/scrcmd_pokemon_misc.c, overlay 3's labels).
  const pl = { flags: {}, party: [] };
  PK.attach({ player: () => pl });
  pl.flags.pokeathlon = { ap: 0, rank: 7, rec: { eventWins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], wins: 11, joined: 12, instructions: 13, jumped: 14, tackled: 15, dashed: 16, switched: 17 } };
  assert.deepStrictEqual([0, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(PK.record), [1, 10, 11, 7, 12, 13, 14, 15, 16, 17, 0]);
  assert(PK.FRIENDSHIP.hurdle === 3000 && PK.FRIENDSHIP.relay === 12288, "the Friendship room's marks");
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

// Orre: the Air Strip, the Snagem Hideout and the Outskirt Stand (data/orre-maps.js, tools/build-orre.js), and going
// there and about (game/orre.js).
{
  const O = WORLD_MAPS.OutskirtStand, D = WORLD_MAPS.OutskirtStand_Diner, A = WORLD_MAPS.OrreAirStrip, H = WORLD_MAPS.SnagemHideout;
  assert(O && D && A && H && [O, D, A, H].every((m) => m.region === "orre"), "the Outskirt Stand, the Air Strip and the hideout are built");
  for (const m of [O, D, A, H]) {
    for (const k of ["collision", "behavior", "elevation", "encounter"]) assert.strictEqual(m[k].length, m.width * m.height, m.name + " " + k);
    for (const p of m.people) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + p.sprite + ".png")), "missing sprite " + p.sprite);
    for (const f of ["", "-border"].concat(m.top ? ["-top"] : [])) assert(fs.existsSync(path.join(root, "assets/world/maps/" + m.name + f + ".png")), m.name + f);
  }
  // The door leads in (walking up into it), the mats back out.
  const door = O.warps[0];
  assert.strictEqual(O.behavior[door.y * O.width + door.x], World.MB.WARP_DOOR);
  assert.deepStrictEqual(World.step({ map: "OutskirtStand", x: door.x, y: door.y + 1 }, "up").warp.map, "OutskirtStand_Diner");
  for (const w of D.warps) assert.strictEqual(World.warpTarget(w).map, "OutskirtStand");
  // No roads between places: their ways out (open edge tiles) bring up Orre's map, and it takes you to each place's
  // way in; only the plane goes there from elsewhere.
  // Phenac City, and its Pokémon Center.
  const P = WORLD_MAPS.PhenacCity, PP = WORLD_MAPS.PhenacCity_PokemonCenter_1F;
  for (const m of [P, PP]) for (const k of ["collision", "behavior", "elevation", "encounter"]) assert.strictEqual(m[k].length, m.width * m.height, m.name + " " + k);
  for (const p of P.people) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + p.sprite + ".png")), "missing sprite " + p.sprite);
  assert(P.people.some((p) => p.script === "PhenacCity_EventScript_Kodo"), "the Trainer with the Makuhita");
  assert(PP.pokemonCenter && World.warpTarget(P.warps[0]).map === PP.name && PP.warps.every((w) => World.warpTarget(w).map === "PhenacCity"));
  assert(!Orre.isOpen({}, "PhenacCity") && Orre.isOpen({ orreMap: ["PhenacCity"] }, "PhenacCity"), "Phenac City opens with Snagem's first test");
  assert.strictEqual(Player.levelCap({ badges: ["boulder", "cascade"], flags: {}, location: { map: "PhenacCity" } }), 15, "Orre's level cap");
  assert.strictEqual(Player.levelCap({ badges: [], flags: { orreLevelCap: 30 }, location: { map: "PhenacCity" } }), 30);
  for (const m of [O, A, H, P]) {
    assert.deepStrictEqual(m.connections, [], m.name);
    const exits = m.triggers.filter((t) => t.script === "Orre_WorldMap");
    assert(exits.length >= 2 && exits.every((t) => !m.collision[t.y * m.width + t.x] && (t.y === 0 || t.y === m.height - 1)), m.name + "'s way out");
  }
  assert(!Object.values(WORLD_MAPS).some((m) => m.region !== "orre" && (m.connections.some((c) => [O, A, H].some((q) => c.map === q.name)) || m.warps.some((w) => [O, A, H].some((q) => w.map === q.name)))), "only the plane goes there");
  for (const pl of Orre.PLACES) {
    const m = WORLD_MAPS[pl.map], a = pl.arrive;
    assert(m && !m.collision[a.y * m.width + a.x] && !m.triggers.some((t) => t.x === a.x && t.y === a.y), pl.map + ": room to come in");
    assert(pl.x > 0 && pl.x < 240 && pl.y > 0 && pl.y < 160, pl.map + " on the map");
  }
  assert(fs.existsSync(path.join(root, "assets/town-map/orre.png")), "Orre's map");
  // At first only the Air Strip and the hideout; the rest as they open (and the Stand, for a save that's been).
  assert.deepStrictEqual(Orre.openPlaces({}).map((p) => p.map), ["SnagemHideout", "OrreAirStrip"]);
  assert.deepStrictEqual(Orre.openPlaces({ orre: 3 }).map((p) => p.map), ["SnagemHideout", "OutskirtStand", "OrreAirStrip"]);
  { const fl = {}; assert(Orre.unlock(fl, "OutskirtStand") && !Orre.unlock(fl, "OutskirtStand") && Orre.isOpen(fl, "OutskirtStand")); }
  const st = Orre.START;
  assert.strictEqual(st.map, "OrreAirStrip");
  assert.strictEqual(A.collision[st.y * A.width + st.x], 0, "room by the plane's door");
  // The Air Strip's Pokémon Center: its door in, the nurse who heals (and where you come to if you black out).
  const PCI = WORLD_MAPS.OrreAirStrip_PokemonCenter_1F, pcDoor = A.warps.find((w) => w.map === PCI.name);
  assert(PCI.pokemonCenter && PCI.region === "orre" && pcDoor && A.behavior[pcDoor.y * A.width + pcDoor.x] === World.MB.WARP_DOOR);
  assert(PCI.people.some((p) => /_PokemonCenter_1F_EventScript_Nurse$/.test(p.script)) && PCI.warps.every((w) => World.warpTarget(w).map === "OrreAirStrip"));
  // The hideout's door, its guards.
  assert(H.people.filter((p) => /Guard/.test(p.script)).length === 2, "two guards at the door");
  assert(A.people.some((p) => p.script === "OrreAirStrip_EventScript_Pilot"), "the pilot, to fly you back");
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
  assert.deepStrictEqual(who(2).filter((k) => ["TRUCK", "BIKE", "DINER_WILLIE"].includes(k)), ["DINER_WILLIE"], "no Wes, no bike");
  assert(!who(3).includes("DINER_WILLIE") && !who(3).includes("FOLLY") && !who(3).includes("WILLIE"), "Willie's gone once battled; Folly and Trudly only in their scene");
  // Going to Orre as yourself, and back where you were.
  const me = Player.create("Ash");
  me.party = [Party.create("Pikachu", 12)];
  me.location = { map: "PalletTown", x: 5, y: 6, facing: "up" };
  const mineToo = JSON.stringify([me.name, me.look, me.party, me.bag, me.money, me.trainerId]);
  Orre.enter(me);
  assert.deepStrictEqual(me.location, Orre.START);
  assert.strictEqual(JSON.stringify([me.name, me.look, me.party, me.bag, me.money, me.trainerId]), mineToo, "still you in Orre");
  Orre.leave(me);
  assert.deepStrictEqual(me.location, { map: "PalletTown", x: 5, y: 6, facing: "up" });
  Orre.leave(me);
  assert.deepStrictEqual(me.location.map, "PalletTown", "leaving when not in Orre leaves you be");
  // An older save's Wes (Orre had you be him at first): becoming him and back.
  const pl = Player.create("Ash");
  pl.party = [Party.create("Pikachu", 12)];
  pl.bag = { potion: 3 };
  pl.location = { map: "PalletTown", x: 5, y: 6, facing: "up" };
  const mine = JSON.stringify([pl.name, pl.look, pl.party, pl.bag, pl.money, pl.trainerId]);
  Orre.enterAsWes(pl);
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
  Orre.enterAsWes(pl);
  assert.deepStrictEqual([pl.party[0].level, pl.location.map], [26, "OutskirtStand_Diner"], "Wes as he was left");
  Orre.leave(pl);
  // A save made as Wes loads as Wes (and doesn't hand him an Exp. Share or the Explorer Kit).
  Orre.enterAsWes(pl);
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
for (const name of Object.keys(WORLD_MAPS).filter((n) => /_PokemonCenter_2F$/.test(n) && WORLD_MAPS[n].region !== "hoenn")) {   // (Hoenn's upstairs are Emerald's: link rooms)
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
  for (const name of named) if (!/^(gs_|em_|dp_)/.test(name)) assert(songs[name], "missing song " + name);
  // (Sinnoh's dp_ songs: Ogg files, window.SINNOH_MUSIC.)
  for (const name of named) if (/^dp_/.test(name)) assert(window.SINNOH_MUSIC[name] && fs.existsSync(path.join(root, window.SINNOH_MUSIC[name].file)), "missing song " + name);
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
  assert.strictEqual(Mining.ENERGY_COST.bomb, 6, "the bomb costs 6 energy");
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

// Shadow moves (Pokémon XD's, data/moves.js): super effective on anything but a Shadow Pokémon (a Ghost too), not very
// effective on one; no PP used; no recoil; Shadow Sky, Half, Hold, Shed, Down.
{
  const shadow = (species, moves) => ({ species, level: 50, shadow: true, moves });
  const SH = ["Shadow Rush", "Shadow End", "Shadow Wave", "Shadow Sky", "Shadow Half", "Shadow Hold", "Shadow Shed", "Shadow Down", "Shadow Mist", "Shadow Panic",
    "Shadow Blitz", "Shadow Break", "Shadow Rave", "Shadow Storm", "Shadow Fire", "Shadow Bolt", "Shadow Chill", "Shadow Blast"];
  assert(SH.every((n) => MOVES[n] && MOVES[n].type === "Shadow" && !MOVES[n].recoil), "the eighteen Shadow moves, none with recoil");
  assert.strictEqual(MOVES["Shadow Rush"].power, 55, "Shadow Rush as XD has it");
  {
    const b = doubles({ team: [shadow("Mightyena", ["Shadow Rush", "Shadow End"]), armored("Snorlax")] },
      { team: [armored("Gengar"), Object.assign(armored("Snorlax"), { shadow: true })] });
    const me = b.sides.p1.actives[0];
    const evs = play(b, { p1: [mv(0, 1), mv(0)], p2: [mv(0), mv(0)] });
    assert(evs.some((e) => e[0] === "-supereffective" && /Gengar/.test(e[1])), "super effective on a Ghost that isn't a Shadow Pokémon");
    const evs2 = play(b, { p1: [mv(0, 2), mv(0)], p2: [mv(0), mv(0)] });
    assert(evs2.some((e) => e[0] === "-resisted" && /Snorlax/.test(e[1])), "not very effective on a Shadow Pokémon");
    assert.strictEqual(me.hp, me.maxhp, "no recoil");
    assert.strictEqual(me.moves[0].pp, me.moves[0].maxpp, "no PP used");
  }
  {
    // Shadow Sky: everything but Shadow Pokémon loses 1/16 a turn.
    const b = doubles({ team: [shadow("Mightyena", ["Shadow Sky"]), armored("Snorlax")] }, { team: [armored("Blissey"), armored("Chansey")] });
    play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
    assert.strictEqual(b.field.weather, "ShadowSky");
    assert.strictEqual(b.sides.p1.actives[0].hp, b.sides.p1.actives[0].maxhp, "a Shadow Pokémon isn't hurt by Shadow Sky");
    for (const m of [b.sides.p1.actives[1], ...b.sides.p2.actives]) assert.strictEqual(m.maxhp - m.hp, Math.floor(m.maxhp / 16), m.ident + " hurt by Shadow Sky");
  }
  {
    // Shadow Half: everyone halved, then the user rests.
    const b = doubles({ team: [shadow("Mightyena", ["Shadow Half"]), armored("Snorlax")] }, { team: [armored("Blissey"), armored("Chansey")] });
    const before = b.getActives().map((m) => m.hp);
    play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
    b.getActives().forEach((m, i) => assert.strictEqual(m.hp, before[i] - Math.floor(before[i] / 2), m.ident + " halved"));
    assert(b.sides.p1.actives[0].volatiles.mustrecharge, "Shadow Half: the user rests");
  }
  {
    // Shadow Hold traps both foes; Shadow Down lowers both foes' Defense by 2; Shadow Shed takes Reflect away.
    const b = doubles({ team: [shadow("Mightyena", ["Shadow Hold", "Shadow Down", "Shadow Shed"]), armored("Snorlax")] },
      { team: [armored("Blissey", ["Reflect", "Splash"]), armored("Chansey")] }, { seed: 3 });
    for (let i = 0; i < 4 && !b.sides.p2.actives.every((m) => m.volatiles.shadowhold); i++) play(b, { p1: [mv(0), mv(0)], p2: [mv(0), mv(0)] });
    assert(b.sides.p2.actives.every((m) => b.isTrapped(m)), "Shadow Hold traps both foes");
    play(b, { p1: [mv(1), mv(0)], p2: [mv(0), mv(0)] });
    assert(b.sides.p2.actives.every((m) => m.boosts.def <= -2), "Shadow Down");
    assert(b.sides.p2.conditions.reflect, "Reflect up");
    play(b, { p1: [mv(2), mv(0)], p2: [mv(1), mv(0)] });
    assert(!b.sides.p2.conditions.reflect, "Shadow Shed removes Reflect");
  }
  // A Shadow Pokémon in the party goes into battle as one.
  assert.strictEqual(Party.toBattleSet(Object.assign(Party.create("Mightyena", 30), { shadow: true })).shadow, true);
}

// The Snag Machine (opts.snag): a Ball at a trainer's Pokémon of a species that can be snagged; snagged, it leaves the
// trainer's team and the battle goes on; other trainers' Pokémon can't be caught.
{
  const b = doubles({ team: [armored("Snorlax", ["Splash"]), armored("Blissey", ["Splash"])] },
    { team: [armored("Makuhita", ["Splash"]), armored("Machop", ["Splash"])] }, { snag: ["Makuhita"] });
  assert(b.getRequest("p1").actives.every((a) => a.canCatch), "a Ball can be thrown while there's a Makuhita to snag");
  const evs = play(b, { p1: [{ type: "ball", ball: "master-ball" }, mv(0)], p2: [mv(0), mv(0)] });
  assert(evs.some((e) => e[0] === "caught" && /Makuhita/.test(e[1]) && e[3] === "snag"), "Makuhita snagged");
  assert.strictEqual(b.snagged.length, 1);
  assert(!b.ended && b.sides.p2.remaining === 1, "the battle goes on against the Machop");
  assert(!b.getRequest("p1").actives.some((a) => a.canCatch), "nothing left to snag");
  const plain = doubles({ team: [armored("Snorlax")] }, { team: [armored("Makuhita"), armored("Machop")] });
  assert(!plain.getRequest("p1").actives.some((a) => a && a.canCatch), "no snagging without the Snag Machine");
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
    assert(/const CHAMPION_TEAM = \[\["Pikachu", 58, 72\], \["Espeon", 59, 72\], \["Blastoise", 60, 73\], \["Venusaur", 60, 73\], \["Snorlax", 61, 74\], \["Charizard", 63, 75, "charizardite-y"\]\]/.test(gameSrc)
      && /foe: \{ name: "Champion Red", team, pic: "red" \}/.test(gameSrc), "Red, the Champion");
    // After him: your Pokémon in its ball while Oak walks up; Red (not Gary) out of the
    // Indigo Plateau before the credits, which Start always skips; the credits' scenes
    // drawn with the maps joined to theirs (Route 10 on into Lavender Town).
    assert(/Overworld\.follower\.hide\(true\);[^\n]*\n\s*Overworld\.addObject\(O, \{ x: 6, y: 15, facing: "up" \}\)/.test(gameSrc), "Oak and your Pokémon");
    assert(/Overworld\.addObject\(R, \{ x: 11, y: 6, facing: "down" \}, lookOf\("red"\)\)/.test(gameSrc) && /HallOfFame\.credits\(\$\("#overlay"\), \{ skippable: true,/.test(gameSrc), "Red at the Plateau; Start skips the credits");
    assert(/c\.direction === "down" \? \[c\.map, at, m\.height \* 16\]/.test(fs.readFileSync(path.join(__dirname, "../ui/hall-of-fame.js"), "utf8")), "the credits' joined maps");
    assert(WORLD_MAPS.Route10.connections.some((c) => c.map === "LavenderTown" && c.direction === "down"));
    // Icefall Cave: Lorelei beside you against two Grunts (her back picture pixelled from her front one, Leaf's pose).
    assert(/partner: \{ name: "Lorelei", team: ICEFALL_LORELEI[^\n]*pic: "lorelei" \}/.test(gameSrc) && /foe2: \{ name: data\.className \+ " " \+ data\.name, team: ICEFALL_GRUNT2/.test(gameSrc), "Lorelei's tag battle");
    assert(fs.existsSync(path.join(__dirname, "../assets/sprites/trainers/back/lorelei.png")));
    for (const sp of ["Dewgong", "Jynx", "Lapras", "Sneasel", "Koffing", "Golbat"]) assert(DEX[sp], sp);
    // Sturdy and the like between how effective a hit was and the hit: after it, the hit's sound kept.
    assert(/if \(hitNotes\.length && HELD_AFTER_HIT\.has\(ev\[0\]\)\) \{ heldAfterHit\.push\(ev\); return; \}/.test(fs.readFileSync(path.join(__dirname, "../ui/battle-screen.js"), "utf8")), "Sturdy's hit sound");
    // Your Pokémon in a hot spring, as you are.
    assert(/const sunk = !pal\.move && !lift \? sunkAt\(me\.map, pal\.x, pal\.y\) : 0;/.test(fs.readFileSync(path.join(__dirname, "../ui/overworld.js"), "utf8")), "the follower in the Ember Spa");
    assert(WORLD_MAPS.VictoryRoad_2F.warps.some((w) => w.map === "Route23") && WORLD_MAPS.Route23.warps.some((w) => w.x === 18 && w.y === 28 && w.map === "VictoryRoad_2F"));
    // Every trainer's Pokémon knows the last four moves it learns by its level (not FireRed's
    // sets), but Trainer Tower's, which have FireRed's.
    assert(!/moves: m\.moves/.test(gameSrc), "trainers' moves by level");
    { const fl = TrainerTower.floor(0, 1), t = TrainerTower.team(fl, 0, 0, 50);
      assert.deepStrictEqual(t[0].moves.map((m) => m.name), fl.trainers[0].mons[0].moves, "Trainer Tower's FireRed sets"); }
    // Trainer Tower's Battle Points for every trainer beaten, and the lobby's BP tutor.
    assert(/const towerBP = \(floor\) => \(floor <= 3 \? 1 : floor <= 6 \? 2 : 3\);/.test(gameSrc) && /const bp = towerBP\(n\) \* \(double \? 2 : 1\);\n\s*f\.bp = \(f\.bp \|\| 0\) \+ bp;/.test(gameSrc), "BP for each trainer");
    assert(WORLD_MAPS.TrainerTower_Lobby.people.some((p) => p.script === "TrainerTower_Lobby_EventScript_BPTutor") || /script: BP_TUTOR/.test(gameSrc), "the BP tutor");
    assert(/case "TrainerTower_Lobby_EventScript_BPTutor": await bpTutor\(\); return;/.test(gameSrc) && /f\.bp -= bpTutorPrice\(move\);/.test(gameSrc));
    // Every game's Egg and tutor moves: Charmander's Dragon Dance (an Egg move since Gen 3)
    // and Belly Drum (Gen 6's on), Pichu's Volt Tackle; tutors from FireRed's Body Slam to Gen 9's.
    for (const [sp, egg] of [["Charmander", "Dragon Dance"], ["Charmander", "Belly Drum"], ["Pichu", "Volt Tackle"], ["Dratini", "Extreme Speed"]]) assert(LEARNSETS_GEN6[sp].egg.includes(egg), sp + " " + egg);
    for (const [sp, tu] of [["Snorlax", "Body Slam"], ["Snorlax", "Seismic Toss"], ["Charizard", "Blast Burn"], ["Gengar", "Shadow Ball"]]) assert(LEARNSETS_GEN6[sp].tutor.includes(tu) || (LEARNSETS_GEN6[sp].tm || []).includes(tu), sp + " " + tu);
    assert.deepStrictEqual(Party.create("Geodude", 12).moves.map((m) => m.name), RandomTeam.levelUpMoves("Geodude", 12));
    assert(/Houndoom to Mega Evolve into Mega Houndoom/.test(ITEMS.houndoominite.effect) && ITEM_SPRITES.houndoominite, "the Houndoominite");
    assert(/return \[weezing, muk, Party\.create\("Arbok"/.test(gameSrc) && /item: "beedrillite", teraType: "Ground", teraAce: true/.test(gameSrc)
      && /pic: "leader_koga", tera: true/.test(gameSrc), "Koga: Weezing, Muk, Arbok, Mega Beedrill (Tera Ground)");
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
      p2: { name: "B", team: [g9("Beedrill", ["Poison Jab"], { item: "beedrillite", teraType: "Ground", teraAce: true })], tera: true } });
    k.start();
    k.choose("p1", mv(0)); k.choose("p2", OpponentAI.choose(k, "p2", mulberry32(1)));
    const bee = k.sides.p2.pokemon[0], order = k.events.map((ev) => ev[0]).filter((t) => t === "-mega" || t === "-terastallize");
    assert.deepStrictEqual([bee.species, bee.terastallized, bee.types, order], ["Beedrill-Mega", "Ground", ["Ground"], ["-mega", "-terastallize"]], "Mega Beedrill, Tera Ground");
    assert(/script === "enter:Route2" && !player\.flags\.gotTeraOrb/.test(gameSrc)
      && /Player\.addItem\(player, "tera-orb"\)/.test(gameSrc), "the Tera Orb from Prof. Oak's aide, out of Viridian Forest"); }
  // The Trainer Cards (FireRed's and Emerald's), and Battle Points kept through New Game +.
  { for (const r of ["kanto", "hoenn"]) for (const f of ["front-0", "back-4-f", "badges", "star"])
      assert(fs.existsSync(path.join(__dirname, "../assets/trainer-card/" + r + "-" + f + ".png")), "the " + r + " Trainer Card's " + f);
    const old = Player.create("RED", 0);
    old.flags.bp = 42; old.flags.hoennFrontier = { bp: 17, team: [] };
    const plus = Player.newGamePlus(old, "RED", 0);
    assert.deepStrictEqual([plus.flags.bp, plus.flags.hoennFrontier], [42, { bp: 17 }], "Battle Points through New Game +");
    assert(/name: "DEBUG", action: "debug"/.test(fs.readFileSync(path.join(__dirname, "../ui/game.js"), "utf8")), "save, load and debug on the Option screen"); }
  // Sinnoh's first maps (tools/build-sinnoh.js): Twinleaf Town up into Route 201, the lake's entrance, the grass's Pokémon.
  { const tw = World.blockAt("TwinleafTown", 17, -1), lake = World.step({ map: "VerityLakefront", x: 10, y: 3 }, "up");
    assert.deepStrictEqual([tw.map, tw.x, tw.y, lake.warp && lake.warp.map, lake.warp && lake.warp.y], ["Route201", 15, 29, "LakeVerity", 42], "Sinnoh's maps join");
    assert(WORLD_MAPS.Route201.wild.slots.some((s) => s.species === "Starly") && WORLD_MAPS.TwinleafTown.music === "dp_twinleaf_town", "Sinnoh's Pokémon and music");
    // (Sandgem Town's Pokémon Center through its door, and out again; Route 202 up into Jubilife City; the S.S. Tidal sails.)
    const door = World.step({ map: "SandgemTown", x: 17, y: 10 }, "up"), jub = World.blockAt("Route202", 18, -1);
    const out = World.step({ map: "SandgemTown_PokemonCenter_1F", x: 15, y: 16 }, "down");
    assert.deepStrictEqual([door.warp && door.warp.map, out.warp && out.warp.map, out.warp && out.warp.door, jub.map],
      ["SandgemTown_PokemonCenter_1F", "SandgemTown", true, "JubilifeCity"], "Sinnoh's doors and Route 202");
    assert(WORLD_MAPS.JubilifeCity_Mart.people.some((p) => p.mart && p.martTiers.length) && WORLD_MAPS.SandgemTown_PokemonCenter_1F.pokemonCenter, "Sinnoh's Mart and Pokémon Center");
    // (All of it: Oreburgh City's Pokémon Center through its door, Route 203 into Oreburgh Gate, Canalave's ferry.)
    const sinnohMaps = Object.values(WORLD_MAPS).filter((m) => m.region === "sinnoh");
    const pc = World.step({ map: "OreburghCity", x: 50, y: 19 }, "up"), gate = World.step({ map: "Route203", x: 54, y: 11 }, "right");
    assert.deepStrictEqual([sinnohMaps.length >= 160, pc.warp && pc.warp.map, gate.warp && gate.warp.map,
      WORLD_MAPS.CanalaveCity.people.some((p) => p.ferry && p.ferry.map === "IronIsland"), Object.keys(window.SINNOH_BERRY_TREES).length > 100],
      [true, "OreburghCity_PokemonCenter_1F", "Oreburgh_Gate", true, true], "all of Sinnoh");
    assert(/afterScript = sailToSinnoh/.test(fs.readFileSync(path.join(__dirname, "../ui/game.js"), "utf8")), "the S.S. Tidal sails to Sinnoh"); }
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
  assert.strictEqual(Player.levelCap(p), 14, "Brock's Onix");
  p.badges = ["boulder", "cascade", "thunder"];
  assert.strictEqual(Player.levelCap(p), 29, "Erika's Vileplume");
  p.badges = Player.REGION_BADGES.kanto.slice();
  assert.strictEqual(Player.levelCap(p), 100);
  assert.strictEqual(Player.levelCap(p, "Route29"), 13, "Johto goes by Johto's Badges: Falkner's Pidgeotto");
  assert.strictEqual(Player.levelCap(p, "Route101"), 15, "Hoenn by Hoenn's: Roxanne's Nosepass");
  // (Each the next Leader's ace, as the game's teams have them.)
  const ace = (id) => Math.max(...WORLD_TRAINERS[id].party.map((m) => m.level));
  assert.deepStrictEqual(["BROCK", "MISTY", "LT_SURGE", "ERIKA", "KOGA", "SABRINA", "BLAINE", "GIOVANNI"].map((n) => ace("TRAINER_LEADER_" + n)), Player.LEVEL_CAPS.kanto);
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
  assert.deepStrictEqual(["Aerodactyl", "Gyarados", "Gyarados-Mega", "Psyduck", "Golduck", "Blastoise", "Blastoise-Mega", "Chansey"].map(types),
    ["Dragon/Rock", "Dragon/Water", "Dragon/Water", "Water/Psychic", "Water/Psychic", "Water/Steel", "Water/Steel", "Fairy/Normal"]);
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
  const balls = [...gameJs.matchAll(/\{ map: "(\w+)", x: (\d+), y: (\d+), item: "([\w-]+)"/g)].map((m) => ({ map: m[1], x: +m[2], y: +m[3], item: m[4] }))
    .filter((b) => ITEMS[b.item] && ITEMS[b.item].category === "mega-stones");
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
  // (On Heart & Soul's Route 29, its own trees, each one of HGSS's: tools/build-johto.js.)
  const own29 = WORLD_MAPS.Route29.headbuttTrees, t0 = own29 ? own29[0].tiles[0] : HB.maps.Route29.trees[0][0];
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
    assert(/"unown-report", "apricorn-box", "pokeblock-case"\]\.concat\(RODS\)/.test(gj) && /item === "apricorn-box"\) await apricornBox\("view"\)/.test(gj) && /apricornBox: \(\) => apricornBox\("give"\)/.test(gj), "the Bag and Kurt open the Apricorn Box");
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

// Battle animations (ui/battle-anim*.js): every move's, pokeemerald-expansion's script and C,
// runs to its end without a screen: yours at the foe, and (every third move) the foe's at
// you in a double battle.
{
  for (const f of ["ui/battle-anim-data.js", "ui/battle-anim-code.js", "ui/battle-anim.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), { filename: f });
  const BA = window.BattleAnim, names = Object.keys(window.MOVES);
  const missing = names.filter((n) => !BA.has(n));
  assert.deepStrictEqual(missing, [], "every move has its animation");
  const boxes = [{ cx: 70, cy: 62, size: 96, top: 20, bottom: 10 }, { cx: 176, cy: 30, size: 72, top: 4, bottom: 10 },
    { cx: 100, cy: 70, size: 96, top: 20, bottom: 10 }, { cx: 150, cy: 22, size: 72, top: 4, bottom: 10 }];
  const mons = [{ name: "Pikachu", hp: 30, maxHP: 50 }, { name: "Charizard", hp: 50, maxHP: 50 }, { name: "Bulbasaur", hp: 9, maxHP: 9 }, { name: "Gengar", hp: 9, maxHP: 9 }];
  let runs = 0, frames = 0;
  for (const [attacker, target, doubles, every] of [[0, 1, false, 1], [3, 0, true, 3]]) {
    for (const move of names.filter((n, i) => i % every === 0)) {
      const r = BA.run({ move, attacker, target, doubles, boxes, mons, seed: 7, maxFrames: 3000 });
      assert(!r.error && r.finished, move + " (" + attacker + " at " + target + "): " + (r.error ? r.error.stack : "didn't end"));
      runs++; frames += r.frames;
    }
  }
  console.log("ok: battle animations, " + names.length + " moves' scripts ran to their end " + runs + " times (" + frames + " frames)");
  // The expansion's other animations (its general, status and special
  // tables: stat changes, statuses, the weather, a ball thrown, the
  // Substitute doll...): every one but the four that need a trainer's sprite
  // or a tilemap this runtime hasn't (the Safari Zone's and the catching
  // tutorial's throws, the Pokéblock, the Silph Scope's ghost).
  const D = window.BATTLE_ANIM_DATA, skip = new Set(["POKEBLOCK_THROW", "ROCK_THROW", "GHOST_GET_OUT", "BALL_THROW_WITH_TRAINER"]);
  let tables = 0;
  for (const kind of ["general", "status", "special"]) {
    for (const id of Object.keys(D.anims[kind])) {
      if (skip.has(id)) continue;
      for (const o of [{ attacker: 0, target: 1 }, { attacker: 1, target: 0, substitute: [true, false] }, { attacker: 3, target: 0, doubles: true }]) {
        const r = BA.run(Object.assign({ anim: kind, id, boxes, mons, seed: 7, maxFrames: 3000, ball: "great-ball", ballCase: 4,
          arg: id === "STATS_CHANGE" ? D.stats.STAT_ANIM_PLUS2 + D.stats.STAT_SPEED : id === "TURN_TRAP" ? BA.moveId("Wrap") : id === "LEECH_SEED_DRAIN" ? 1 : 0 }, o));
        assert(!r.error && r.finished, kind + " " + id + " (" + o.attacker + "): " + (r.error ? r.error.stack : "didn't end"));
        tables++;
      }
    }
  }
  // (A ball that opens again, and the doll in a move's way: Tackle on a Pokémon behind one, Substitute itself, Transform's hook.)
  for (const c of [0, 2, 3]) assert(BA.run({ anim: "special", id: "BALL_THROW", attacker: 0, target: 1, boxes, mons, seed: 7, ball: "poke-ball", ballCase: c }).finished, "the ball opens (" + c + " shakes)");
  assert(BA.run({ move: "Tackle", attacker: 0, target: 1, boxes, mons, seed: 7, substitute: [false, true] }).finished, "a hit on the doll");
  let hooked = 0;
  assert(BA.run({ move: "Transform", attacker: 0, target: 1, boxes, mons, seed: 7, transform: () => hooked++ }).finished && hooked === 1, "Transform changes the picture once");
  for (const f of ["substitute.png", "substitute-back.png"]) assert(fs.existsSync(path.join(root, "assets/battle-anims", f)), "the doll: " + f);
  console.log("ok: battle animations, " + tables + " runs of the general, status and special tables ended");
}

// Hoenn (tools/build-hoenn.js, from pokeemerald): the first slice, imported with Emerald's tilesets.
{
  const hoenn = Object.entries(WORLD_MAPS).filter(([, m]) => m.region === "hoenn");
  assert(hoenn.length >= 20, "Hoenn's maps are in: " + hoenn.length);
  for (const [name, m] of hoenn) {
    const n = m.width * m.height;
    assert([m.collision, m.elevation, m.behavior, m.encounter].every((a) => a.length === n), name + ": layers match the size");
    assert(fs.existsSync(path.join(root, "assets/world/maps/" + name + ".png")), name + ": picture");
    for (const w of m.warps) assert(w.map ? WORLD_MAPS[w.map] : w.mapConst, name + ": warp to " + (w.map || w.mapConst) + " (a map in the game, or unbuilt)");
    for (const q of m.people) if (q.sprite && /^em_/.test(q.sprite)) assert(fs.existsSync(path.join(root, "assets/world/sprites/" + q.sprite + ".png")), name + ": sprite " + q.sprite);
  }
  assert(hoenn.some(([n]) => /_PokemonCenter_1F$/.test(n) && WORLD_MAPS[n].pokemonCenter), "Hoenn's Pokémon Centers heal");
  // Its Town Map (Emerald's region map: tools/lib/hoenn-town-map.js): the grid, every map's section, and Fly's spots.
  const HT = window.HOENN_TOWN_MAP;
  assert.deepStrictEqual([HT.width, HT.height, HT.map.length, HT.towns.length], [28, 15, 15, 16]);
  assert(fs.existsSync(path.join(root, "assets/town-map/hoenn.png")), "Hoenn's map picture");
  const off = [];
  for (const [name, m] of hoenn) {
    const sec = HT.mapSections[name];
    assert(sec && (HT.names[sec] || sec === "DYNAMIC"), name + "'s section " + sec);
    if (!HT.map.some((r) => r.includes(sec)) && !HT.at[name]) off.push(name);
  }
  // (Almost all are somewhere on it: only the truck, the ships, the Trick House, the Secret Bases and the like are nowhere.)
  assert(off.length <= 70, "maps nowhere on the Town Map: " + off.join(" "));
  for (const t of HT.towns) {
    const spot = HT.fly[t], m = spot && WORLD_MAPS[spot.map];
    assert(m && m.region === "hoenn" && !m.collision[spot.y * m.width + spot.x], t + "'s Fly spot is open ground");
  }
  assert.strictEqual(HT.fly.LITTLEROOT_TOWN.girl.x, 14, "May's house, for a girl");
  // Its music: Emerald's own songs (assets/audio/hoenn-music.js), every one the maps and trainers ask for, and they play.
  vm.runInThisContext(fs.readFileSync(path.join(root, "assets/audio/hoenn-music.js"), "utf8"), { filename: "assets/audio/hoenn-music.js" });
  const H = window.HOENN_MUSIC_DATA;
  for (const [name, m] of hoenn) if (m.music) assert(H.songs[m.music], name + "'s song " + m.music);
  for (const [id, t] of Object.entries(WORLD_TRAINERS)) if (/^EM_/.test(id)) assert(H.songs[t.music], id + "'s song " + t.music);
  const littleroot = M4A.render(H.songs.em_littleroot, H.bank);
  assert(littleroot.left.length > littleroot.rate * 60 && littleroot.loopEnd > littleroot.loopStart && Math.max(...littleroot.left.filter((_, i) => i % 97 === 0)) > 0.1, "Littleroot's song plays");
  console.log("ok: Hoenn, " + hoenn.length + " maps from Emerald's tilesets, " + Object.keys(H.songs).length + " of its songs");
}
// The Battle Frontier (ui/hoenn-frontier.js) through Emerald's own scripts: a whole Battle Tower challenge, the Brain, the tents' rentals.
{
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-script.js"), "utf8"), { filename: "ui/hoenn-script.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-pyramid.js"), "utf8"), { filename: "ui/hoenn-pyramid.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-frontier.js"), "utf8"), { filename: "ui/hoenn-frontier.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-contest.js"), "utf8"), { filename: "ui/hoenn-contest.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-pokeblock.js"), "utf8"), { filename: "ui/hoenn-pokeblock.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hall-of-fame.js"), "utf8"), { filename: "ui/hall-of-fame.js" });
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-decor.js"), "utf8"), { filename: "ui/hoenn-decor.js" });
  const HF = window.HOENN_FRONTIER;
  // Other people's Secret Bases (ui/game.js hoennNpcBases, ui/hoenn-decor.js furnish): furnished where decorations may go, their owners Emerald's kinds.
  {
    const dp = { flags: {} };
    const DC = window.HoennDecor.create({ player: () => dp, say: async () => {}, confirm: async () => true, sfx() {}, choose: async () => 0, canvas: () => null, baseMap: () => null, refresh() {}, persist() {}, money: () => 0, addMoney() {} });
    const rng = mulberry32(99), placed = DC.furnish("SecretBase_RedCave1", rng, 6);
    assert(placed.length === 6 && placed.every((p) => DC.byId(p.id)), "six decorations set out");
    const cells = new Set();
    for (const p of placed) {
      const d = DC.byId(p.id), m = WORLD_MAPS.SecretBase_RedCave1;
      const foot = d.perm === "sprite" ? [[p.x, p.y]] : [].concat(...Array.from({ length: d.h }, (_, r) => Array.from({ length: d.w }, (_, c) => [p.x + c, p.y - (d.h - 1) + r])));
      for (const [x, y] of foot) { assert(x >= 0 && y >= 0 && x < m.width && y < m.height && !cells.has(x + "," + y), "a decoration on the map, on its own tiles"); cells.add(x + "," + y); }
    }
    assert(DC.furnish("LittlerootTown", rng, 3).length === 0, "nowhere to furnish but a base");
    assert(DC.contextOf("SecretBase_RedCave1") === null, "no base, no context");
    const gj = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/const NPC_BASE_LOOKS = \["OBJ_EVENT_GFX_YOUNGSTER", "OBJ_EVENT_GFX_BUG_CATCHER", "OBJ_EVENT_GFX_RICH_BOY", "OBJ_EVENT_GFX_CAMPER", "OBJ_EVENT_GFX_MAN_3",/.test(gj) && /"OBJ_EVENT_GFX_LASS", "OBJ_EVENT_GFX_GIRL_3", "OBJ_EVENT_GFX_WOMAN_2", "OBJ_EVENT_GFX_PICNICKER", "OBJ_EVENT_GFX_WOMAN_5"\]/.test(gj), "sSecretBaseOwnerGfxIds");
    assert(/const NPC_BASE_CLASSES = \["youngster", "bug_catcher", "rich_boy", "camper", "cooltrainer_m", "lass", "school_kid_f", "lady", "picnicker", "cooltrainer_f"\]/.test(gj), "sSecretBaseFacilityClasses");
    assert(/if \(npc\) \{ player\.flags\.hoennVisit = npc\.id; return hoenn\.scriptOf\(\{ script: "SecretBase_EventScript_Enter" \}\); \}/.test(gj) && /case "GetSecretBaseOwnerAndState": \{ const v = hoennVisiting\(\); api\.setVar\("VAR_0x8004", v \? v\.type : 0\); api\.set\(v && v\.battledDay === dayKey\(\) \? 1 : 0\);/.test(gj)
      && /await npcBaseBattle\(api\); return true;/.test(gj) && /for \(const n of hoennNpcBases\(\)\) if \(n\.map === map\) open\(n\.id\);/.test(gj) && /"SecretBase_EventScript_RecordMixingPC"/.test(gj), "the way in, the owner, the battle, the spots open, the PC");
    assert(window.HOENN_SCRIPTS.s.SecretBase_EventScript_RecordMixTrainer && window.HOENN_SCRIPTS.s.SecretBase_EventScript_RecordMixingPC && window.HOENN_SCRIPTS.t.SecretBase_Text_Trainer9Defeated, "Emerald's owner scripts and words");
  }
  assert(HF.mons.length === 882 && HF.trainers.length === 300 && HF.banned.length === 9 && HF.brain.length === 7 && HF.tents.slateport.mons.length === 70, "the Frontier's data");
  assert.deepStrictEqual(HF.brainStreaks[0], [35, 70, 35, 1]);
  const fplayer = { flags: {}, party: ["Swampert", "Gardevoir", "Salamence", "Metagross"].map((sp) => Party.create(sp, 50)), name: "ASH", badges: [], bag: {} };
  let F, H, spoken = [], battles = 0, wonAll = true, pickFn = async () => 0, chooseItemFn = async () => null, lastSpec = null;
  const fenv = {
    player: () => fplayer, map: () => "BattleFrontier_BattleTowerLobby", say: async (t) => { spoken.push(t); }, confirm: async () => true, choose: async (texts) => { const k = (texts || []).findIndex((x) => /^(Go on|Continue|Ready|Next round|Enter the)/i.test(x)); return k >= 0 ? k : 0; }, close() {}, facePlayer: async () => {}, act: async () => {},
    show() {}, hide() {}, place() {}, moveTo() {}, personAt: () => ({ x: 6, y: 6, facing: "up" }), giveItem: async () => true, hasItem: () => true, takeItem: () => 1, itemCount: () => 1,
    itemName: (x) => x, cry() {}, fade: async () => {}, trainerBattle: async () => "won", wildBattle: async () => "won", warp: async (m, at) => { (fenv.__warps = fenv.__warps || []).push([m, at]); }, giveMon: async () => true,
    mart: async () => {}, healParty() { F.healTeam(); }, money: () => 9999, addMoney() {}, music() {}, fanfare: async () => {}, se() {}, shake: async () => {}, sleep: async () => {}, isGirl: () => false,
    choosePartyMon: async () => 0, beaten: () => false, setBeaten() {}, setMetatile() {}, badge() {}, respawn() {}, setDynamicWarp() {}, moneyBox() {}, save: async () => {}, special: async () => false,
    frontierOp: (op, a, api) => F.op(op, a, api)
  };
  H = window.HoennScript.create(fenv);
  F = window.HoennFrontier.create({
    player: () => fplayer, getVar: (n) => H.getVar(n), flag: (n) => H.flag(n), createMon: (sp, lv, o) => Party.create(sp, lv, o), say: async (t) => { spoken.push(t); }, caught: () => false,
    itemName: (x) => x, itemConst: (x) => "ITEM_" + x.toUpperCase().replace(/-/g, "_"), giveItem: async () => true, chooseParty: async ({ max }) => [0, 1, 2, 3].slice(0, max),
    pick: async (title, labels) => pickFn(title, labels), chooseItem: async () => chooseItemFn(), battle: async (spec) => { battles++; lastSpec = spec; assert(spec.team.length >= 1 && spec.foe.team.length >= 1, "teams " + spec.team.length + " " + spec.foe.team.length + " facility " + H.getVar("VAR_FRONTIER_FACILITY") + " mode " + H.getVar("VAR_FRONTIER_BATTLE_MODE") + " " + JSON.stringify([F.state().A, F.state().lvl, F.state().num])); for (const r of spec.team.concat(spec.foe.team)) assert(r.hp > 0 && r.moves.length, "a made Pokémon: " + r.species); return "won"; },
    bpBox() {}, markHome() {}, save: async () => {}, softReset: async () => {}, rand: mulberry32(7)
  });
  const CT = window.HoennContest.create({ player: () => fplayer, say: async (t) => { spoken.push(t); }, pick: async () => 0, choosePartyMon: async () => 0, rand: mulberry32(11) });
  fenv.contestOp = (op, a, api) => CT.op(op, a, api);
  fenv.special = async (name, api) => (await F.special(name, api)) || (await CT.special(name, api)) || undefined;
  const run = (label, localId) => H.run(label, { person: { localId, id: 0 } });
  const frontierDone = (async () => {
    // Singles, Level 50: the lobby, then the battle room carries the seven battles through.
    await run("BattleFrontier_BattleTowerLobby_EventScript_SinglesAttendant", "LOCALID_TOWER_ATTENDANT_SINGLES");
    let s = F.state();
    assert.strictEqual(s.status, 1, "the challenge is on"); assert.deepStrictEqual(s.order, [0, 1, 2]);
    assert(s.active["0.0.0"], "the streak is live");
    await run("BattleFrontier_BattleTowerBattleRoom_EventScript_EnterRoom", "LOCALID_PLAYER");
    assert.strictEqual(battles, 7, "seven battles"); assert.strictEqual(s.streak["0.0.0"], 7); assert.strictEqual(s.status, 3, "won");
    assert(s.team.every((r) => r.level === 50), "levelled to 50");
    // (Back in the lobby: the Battle Points.)
    H.setVar("VAR_TEMP_CHALLENGE_STATUS", 3);
    await run("BattleFrontier_BattleTowerLobby_EventScript_WonChallenge", "LOCALID_TOWER_ATTENDANT_SINGLES");
    assert.strictEqual(s.bp, 1, "a first challenge's Battle Point (" + s.bp + ")");
    // The Brain: Anabel is the seventh opponent of the fifth challenge (a streak of 34 going in).
    s.streak["0.0.0"] = 28; battles = 0;
    await run("BattleFrontier_BattleTowerLobby_EventScript_SinglesAttendant", "LOCALID_TOWER_ATTENDANT_SINGLES");
    s.status = 1; await run("BattleFrontier_BattleTowerBattleRoom_EventScript_EnterRoom", "LOCALID_PLAYER");
    assert.strictEqual(s.streak["0.0.0"], 35, "28 and seven");
    assert(H.flag("FLAG_SYS_TOWER_SILVER"), "Anabel's Silver Symbol");
    // The other facilities and the tents, from their lobbies through every battle: each ends won, with the battles it has.
    const PLANS = [
      ["SlateportCity_BattleTent", "Lobby_EventScript_Attendant", ["Corridor_EventScript_EnterCorridor", "BattleRoom_EventScript_EnterRoom"], 3],
      ["VerdanturfTown_BattleTent", "Lobby_EventScript_Attendant", ["Corridor_EventScript_EnterCorridor", "BattleRoom_EventScript_EnterRoom"], 3],
      ["FallarborTown_BattleTent", "Lobby_EventScript_Attendant", ["Corridor_EventScript_EnterCorridor", "BattleRoom_EventScript_EnterRoom"], 3],
      ["BattleFrontier_BattleFactory", "Lobby_EventScript_SinglesAttendant", ["PreBattleRoom_EventScript_EnterRoom", "BattleRoom_EventScript_EnterRoom"], 7],
      ["BattleFrontier_BattleFactory", "Lobby_EventScript_DoublesAttendant", ["PreBattleRoom_EventScript_EnterRoom", "BattleRoom_EventScript_EnterRoom"], 7],
      ["BattleFrontier_BattleArena", "Lobby_EventScript_Attendant", ["Corridor_EventScript_WalkToBattleRoom", "BattleRoom_EventScript_EnterRoom"], 7],
      ["BattleFrontier_BattlePalace", "Lobby_EventScript_SinglesAttendant", ["Corridor_EventScript_WalkToBattleRoom", "BattleRoom_EventScript_EnterRoom"], 7],
      ["BattleFrontier_BattlePalace", "Lobby_EventScript_DoublesAttendant", ["Corridor_EventScript_WalkToBattleRoom", "BattleRoom_EventScript_EnterRoom"], 7],
      ["BattleFrontier_BattleDome", "Lobby_EventScript_SinglesAttendant", ["PreBattleRoom_EventScript_EnterRoom", "BattleRoom_EventScript_EnterRoom"], 4]
    ];
    for (const [map, lobby, loop, n] of PLANS) {
      H.resetTemp(); s = F.state(); battles = 0; s.status = 0; s.num = 0; H.setVar("VAR_0x8006", 0); H.setVar("VAR_TEMP_CHALLENGE_STATUS", 255);
      await run(map + lobby, "LOCALID_X");
      for (let i = 0; i < 12 && s.status !== 3; i++) for (const l of loop) await run(map + l);
      assert.strictEqual(s.status, 3, map + " " + lobby + " is won"); assert.strictEqual(battles, n, map + " " + lobby + ": " + n + " battles, " + battles + " ");
    }
    // The Battle Pike: fourteen rooms of three doors each (here always the left one), then the final room.
    {
      s = F.state(); battles = 0; s.status = 0; s.num = 0; H.resetTemp(); H.setVar("VAR_0x8006", 0); H.setVar("VAR_TEMP_CHALLENGE_STATUS", 255);
      await run("BattleFrontier_BattlePikeLobby_EventScript_Attendant", "LOCALID_X");
      assert.strictEqual(s.status, 1, "the Pike's challenge is on");
      H.resetTemp(); await H.transition("BattleFrontier_BattlePikeCorridor");
      await run("BattleFrontier_BattlePikeCorridor_EventScript_EnterCorridor");
      let last = "", rooms = 0;
      for (let i = 0; i < 20 && !/FINAL/.test(last); i++) {
        H.resetTemp(); H.setVar("VAR_0x8007", i % 3); await H.transition("BattleFrontier_BattlePikeThreePathRoom");
        await run("BattleFrontier_BattlePikeThreePathRoom_EventScript_RoomWarp");
        last = fenv.__warps.slice(-1)[0][0]; if (/FINAL/.test(last)) break;
        const wild = /WILD/.test(last), kind = wild ? "BattlePikeRoomWildMons" : "BattlePikeRoomNormal";
        H.resetTemp(); await H.transition("BattleFrontier_" + kind);
        if (wild) { await run("BattleFrontier_BattlePikeRoomWildMons_EventScript_SetInWildMonRoom"); await run("BattleFrontier_BattlePikeRoomWildMons_EventScript_Exit"); }
        else { await run("BattleFrontier_BattlePikeRoomNormal_EventScript_EnterRoom"); if (s.pike.room >= 1 && s.pike.room <= 4) await run("BattleFrontier_BattlePikeRoomNormal_EventScript_NPC", "LOCALID_PIKE_ROOM_NPC_1"); await run("BattleFrontier_BattlePikeRoomNormal_EventScript_Exit"); }
        last = fenv.__warps.slice(-1)[0][0]; rooms++;
      }
      assert(/FINAL/.test(last) && rooms === 7, "the final room after seven pairs of rooms: " + rooms);
      assert.strictEqual(s.streak["5.0.0"], 14, "fourteen rooms");
      H.resetTemp(); await H.transition("BattleFrontier_BattlePikeRoomFinal");
      await run("BattleFrontier_BattlePikeRoomFinal_EventScript_EnterRoom");
      assert.strictEqual(s.status, 3, "the Pike is cleared");
    }
    // The Battle Pyramid: every floor has a way out you can walk to from the way in, and the challenge's Pokémon and bag stand in for yours until the lobby.
    {
      const Y = window.HOENN_PYRAMID;
      assert(Y.squares.length === 17 && Y.templates.length === 16 && Y.wild50.length === 20 && Y.pickups50.length === 20, "the Pyramid's data");
      const pyrRng = mulberry32(99);
      for (let i = 0; i < 700; i++) {
        const seed = [0, 1, 2, 3].map(() => Math.floor(pyrRng() * 65536)), fl = window.HoennPyramid.floor(Y, seed, i % 7);
        const wall = new Set(fl.tiles.filter((t) => t.c).map((t) => t.x + "," + t.y)), seen = new Set([fl.start.x + "," + fl.start.y]), q = [[fl.start.x, fl.start.y]];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + "," + (y + dy); if (x + dx < 0 || y + dy < 0 || x + dx > 31 || y + dy > 31 || seen.has(k) || wall.has(k)) continue; seen.add(k); q.push([x + dx, y + dy]); } }
        assert(fl.exit && seen.has(fl.exit.x + "," + fl.exit.y), "a floor's way out can be reached");
        assert.strictEqual(fl.trainers.length, Y.templates[fl.template].trainers); assert.strictEqual(fl.items.length, Y.templates[fl.template].items);
      }
      const realParty = fplayer.party, realBag = fplayer.bag;
      H.resetTemp(); s = F.state(); s.status = 0; s.num = 0; H.setVar("VAR_0x8006", 0); H.setVar("VAR_TEMP_CHALLENGE_STATUS", 255);
      await run("BattleFrontier_BattlePyramidLobby_EventScript_Attendant", "LOCALID_X");
      assert(fenv.__warps.slice(-1)[0][0] === "MAP_BATTLE_FRONTIER_BATTLE_PYRAMID_FLOOR" && fplayer.party === s.team && fplayer.bag !== realBag && fplayer.bag["hyper-potion"] === 1, "into the first floor with the challenge's team and bag");
      for (let f = 0; f < 7; f++) {
        H.resetTemp(); await H.transition("BattleFrontier_BattlePyramidFloor");
        const L = F.pyramidLayout(); assert(L.tiles.length > 50 && F.pyramidPeople().length === L.trainers.length + L.items.length, "floor " + f + " is made");
        const spec = F.pyramidTrainer(0); assert(spec.foe.team.length === 3 && spec.team === s.team, "a trainer's three");
        await run("BattlePyramid_WarpToNextFloor");
      }
      assert.strictEqual(fenv.__warps.slice(-1)[0][0], "MAP_BATTLE_FRONTIER_BATTLE_PYRAMID_TOP", "the top after seven floors");
      assert.strictEqual(s.streak["6.0.0"], 7);
      s.status = 3; H.setVar("VAR_TEMP_CHALLENGE_STATUS", 3);
      await run("BattleFrontier_BattlePyramidLobby_EventScript_WonChallenge", "LOCALID_X");
      assert(fplayer.party === realParty && fplayer.bag === realBag, "your own Pokémon and bag come back");
      assert(window.HoennFrontier.create && s.bp >= 1, "Battle Points for the Pyramid");
      assert(spoken.some((x) => /here is your prize/.test(String(x))) && spoken.some((x) => /received an? (HP Up|Protein|Iron|Calcium|Carbos|Zinc|hp-up|protein|iron|calcium|carbos|zinc)/i.test(String(x))), "and a prize, a vitamin for a short streak: " + spoken.slice(-4).join("|"));
      // (RETIRE on the Start menu in the Pyramid: BattlePyramid_Retire, the challenge lost and back to the lobby.)
      const gjs = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
      assert(window.HOENN_SCRIPTS.s.BattlePyramid_Retire && /key: "retirePyramid", label: "Retire"/.test(gjs) && /runHoenn\("BattlePyramid_Retire"\)/.test(gjs), "Retire in the Pyramid");
      // (Hoenn's berry picking: the Berry Pouch in Petalburg Woods, and a tree's berries picked as the Berry Farm's, for farming XP.)
      assert(/"PetalburgWoods"\]/.test(gjs) && /const hoennBerries = BerryFarm\.create\(berryEnv,/.test(gjs) && !/pickGame: \(berry, n\) => pickingGame/.test(gjs), "Hoenn's berries are picked as the Berry Farm's");
    }
    // The Lilycove Contest Hall: enter a Pokémon in the Normal Rank Coolness Contest, and the hall's own scripts run the contest to its judges' marks.
    {
      assert(window.HOENN_CONTEST.opponents.length === 95 && Object.keys(window.HOENN_CONTEST.moves).length > 300, "the Contests' data");
      H.resetTemp(); H.setVar("VAR_0x8006", 0);
      await run("LilycoveCity_ContestLobby_EventScript_ContestReceptionist", "LOCALID_X");
      assert.strictEqual(fenv.__warps.slice(-1)[0][0], "MAP_CONTEST_HALL_COOL", "into the Cool hall");
      const ct = CT.state();
      assert(ct.cont.length === 4 && ct.cont[3].nick, "four contestants, you last");
      H.resetTemp(); spoken.length = 0;
      await run("ContestHall_EventScript_Contest", "LOCALID_X");
      assert(ct.final && ct.final.length === 4 && [...ct.final].sort().join() === "0,1,2,3", "four places");
      assert(spoken.some((x) => /The judges' marks/.test(String(x))), "the marks are read out");
      if (ct.final[ct.player] === 0) assert.strictEqual(fplayer.party[0].contestRibbons.cool, 1, "a winner's ribbon");
    }
  })();
  // The Battle Arena's rules in the engine (opts.arena): three turns with both standing, then the referee's judgment on
  // Mind, Skill and Body, the loser fainting, the next in order coming out, no switching; the Battle Palace's (opts.palace):
  // each Pokémon picks its own move by its nature's odds, or can't bring itself to (palaceIdle).
  {
    const mk = (sp, moves, nature) => Object.assign({ species: sp, level: 50, moves }, nature ? { nature } : {});
    const b = new Battle({ seed: 5, arena: true, p1: { name: "A", team: [mk("Chansey", ["Growl", "Pound"]), mk("Blissey", ["Pound"])] },
      p2: { name: "B", team: [mk("Snorlax", ["Growl"]), mk("Wobbuffet", ["Counter"])] } });
    b.start();
    assert.deepStrictEqual(b.events.find((e) => e[0] === "-arena"), ["-arena", "commence", "p1a: Chansey", "p2a: Snorlax"], "the referee starts the bout");
    assert.deepStrictEqual(b.getRequest("p1").switches, [], "no switching in the Arena");
    for (let t = 0; t < 3; t++) { b.choose("p1", { type: "move", move: t === 2 ? 1 : 0 }); b.choose("p2", { type: "move", move: 0 }); }
    const judge = b.events.find((e) => e[0] === "-arena" && e[1] === "judge");
    assert(judge && b.turn === 3, "judged after three turns");
    const d = JSON.parse(judge[4]);
    assert.deepStrictEqual(d.cats, [[1, 0], [3, 3], [100, 98]], "Mind (a Pound 1, Growls 0), Skill (three plain hits each), Body (HP left)");
    assert.deepStrictEqual(d.score, [5, 1]);
    assert(d.result === "won" && b.sides.p2.active.fainted && !b.sides.p1.active.fainted && b.phase === "switch", "the loser faints");
    assert(!b.canShift("p1"), "no Shift prompt in the Arena");
    b.choose("p2", { type: "switch", index: 1 });
    assert(b.arenaTurn === 0 && b.events.filter((e) => e[0] === "-arena" && e[1] === "commence").length === 2, "the next bout's count starts over");
    assert.strictEqual(window.Battle.prototype.arenaSkill.length, 2);
    const pb = new Battle({ seed: 7, palace: true, p1: { name: "A", team: [mk("Snorlax", ["Tackle", "Curse", "Rest", "Yawn"], "Sassy")] }, p2: { name: "B", team: [mk("Chansey", ["Pound", "Soft-Boiled"], "Bold")] } });
    pb.start();
    const picks = {};
    for (let i = 0; i < 60; i++) { const c = pb.palaceChoice("p1"); picks[c.palaceIdle ? "idle" : c.move] = (picks[c.palaceIdle ? "idle" : c.move] || 0) + 1; }
    assert(picks[0] >= 40, "a Sassy Snorlax mostly attacks (88%): " + JSON.stringify(picks));
    assert(pb.choose("p1", { type: "move", palaceIdle: true }).ok && pb.choose("p2", pb.palaceChoice("p2")).ok);
    assert(pb.events.some((e) => e[0] === "-text" && /incapable/.test(e[2])), "it couldn't bring itself to");
    const bs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8"), fr = fs.readFileSync(path.join(root, "ui/hoenn-frontier.js"), "utf8");
    assert(/if \(config\.palace\) return battle\.palaceChoice\("p1"/.test(bs) && /async function arenaJudgment/.test(bs) && /case "-arena":/.test(bs), "the screen: the Palace's FIGHT, the Arena's judgment window");
    assert(/arena: tentMode \? s\.A\.tent === "verdanturf" : f === FAC\.ARENA/.test(fr), "the Arena and the Verdanturf tent judge");
    // The Factory's rental and swap screens and the Dome's tourney tree (ui/hoenn-frontier-screens.js), where the game gives them.
    assert(scripts.indexOf("ui/hoenn-frontier-screens.js") > scripts.indexOf("ui/hoenn-frontier.js") && scripts.indexOf("ui/hoenn-frontier-screens.js") < scripts.indexOf("ui/game.js"), "the Frontier's screens load");
    const fss = fs.readFileSync(path.join(root, "ui/hoenn-frontier-screens.js"), "utf8");
    assert(/async function factorySelect/.test(fss) && /async function factorySwap/.test(fss) && /async function tourneyTree/.test(fss) && /X = \[\[68, 87, 95, 103, 120\], \[172, 153, 145, 137, 120\]\]/.test(fss), "Emerald's tree layout");
    assert(/if \(what === "rentmons" && env\.factorySelect\)/.test(fr) && /if \(env\.domeTree\)/.test(fr) && /dm\.rounds \|\| \(dm\.rounds = /.test(fr), "the Frontier asks for them");
  }
  // Pokéblocks (ui/hoenn-pokeblock.js): Emerald's blending arithmetic, the case, feeding for contest conditions; the Blender's game
  // (ui/berry-blender.js) and the Pokéblock Case load for the game.
  {
    const PB = window.HoennPokeblock;
    assert.deepStrictEqual(PB.blend(["cheri-berry", "chesto-berry"], 10000, () => 0), { color: 2, spicy: 0, dry: 12, sweet: 0, bitter: 0, sour: 0, feel: 23 }, "Cheri and Chesto at 100 RPM: a Blue Pokéblock");
    assert.strictEqual(PB.blend(["cheri-berry", "cheri-berry"], 10000, () => 0.5).color, 12, "the same berry twice: black");
    assert.deepStrictEqual(PB.blend(["spelon-berry", "pamtre-berry", "watmel-berry", "durin-berry"], 20000, () => 0), { color: 14, spicy: 0, dry: 0, sweet: 0, bitter: 61, sour: 0, feel: 66 }, "the Master's berries: gold");
    assert.deepStrictEqual(PB.npcBerries("cheri-berry", 3, false), ["aspear-berry", "rawst-berry", "pecha-berry"]);
    assert.deepStrictEqual(PB.npcBerries("oran-berry", 1, true), ["pamtre-berry"], "the Blend Master's own");
    const pp = { name: "MAY", flags: {}, bag: { "cheri-berry": 2 }, party: [Party.create("Zigzagoon", 10)] };
    pp.party[0].nature = "Adamant";
    const said = [];
    const pb = PB.create({ player: () => pp, say: async (t) => said.push([].concat(t).join(" ")), confirm: async () => true, pick: async () => 0, chooseBerry: async () => "cheri-berry",
      choosePartyMon: async () => 0, blender: async (players) => { assert(players.length === 2 && players[1].name === "MISTER" && players[1].berry === "aspear-berry"); return { maxRPM: 9000 }; },
      flag: () => true, itemName: (x) => x, fanfare() {}, sfx() {}, rand: () => 0 });
    const vars = {}, api = { getVar: (k) => vars[k], setVar: (k, v) => { vars[k] = v; }, set() {}, setBuffer() {}, flush: async () => {} };
    vars.VAR_0x8004 = 1;
    pb.special("DoBerryBlending", api).then(() => {
      assert(pp.flags.hoennPokeblocks.length === 1 && pp.bag["cheri-berry"] === 1 && pp.flags.hoennBlenderRecords[0] === 9000 && said.some((x) => /was made!/.test(x)), "a block made, the berry used, the record kept");
      const b = pp.flags.hoennPokeblocks[0];
      assert(b.color === 1 && b.spicy > 0, "Cheri and Aspear: a Red Pokéblock " + JSON.stringify(b));
      assert.strictEqual(pb.feed(pp.party[0], b), "happily", "an Adamant Pokémon likes spicy");
      assert(pp.party[0].contest.cool === b.spicy && pp.party[0].contest.sheen === b.feel, "Cool from spicy, sheen from the feel");
      pp.party[0].contest.sheen = 255;
      assert.strictEqual(pb.feed(pp.party[0], b), "full");
      return pb.special("GetFirstFreePokeblockSlot", api);
    }).then(() => assert.strictEqual(vars.VAR_RESULT, 1));
    assert(scripts.indexOf("ui/hoenn-pokeblock.js") > scripts.indexOf("ui/hoenn-contest.js") && scripts.indexOf("ui/berry-blender.js") < scripts.indexOf("ui/game.js"), "the Pokéblock modules load");
    const gj = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
    assert(/if \(await hoennPokeblock\.special\(name, api\)\) return true;/.test(gj) && /item === "pokeblock-case"/.test(gj), "the game asks it");
    assert(/const c = r\.contest \|\| \{\};/.test(fs.readFileSync(path.join(root, "ui/hoenn-contest.js"), "utf8")), "contests count what Pokéblocks gave");
    // Hoenn's Safari Zone: Emerald's areas (named apart from Kanto's), rules (engine/safari.js's hoenn mode) and scripts.
    for (const n of ["HoennSafariZone_South", "HoennSafariZone_North", "HoennSafariZone_Northeast", "HoennSafariZone_Southwest", "HoennSafariZone_RestHouse", "Route121_SafariZoneEntrance"]) assert(WORLD_MAPS[n] && WORLD_MAPS[n].region === "hoenn", n);
    assert(WORLD_MAPS.SafariZone_North.width === 57 && !WORLD_MAPS.SafariZone_North.region, "Kanto's Safari Zone is still its own");
    assert(WORLD_MAPS.HoennSafariZone_South.signs.some((x) => x.script === "EventScript_PokeBlockFeeder"), "the feeders are looked at");
    assert(window.HOENN_SCRIPTS.s.SafariZone_EventScript_TimesUp && window.HOENN_SCRIPTS.s.SafariZone_EventScript_RetirePrompt && window.HOENN_SCRIPTS.consts.MAP_SAFARI_ZONE_SOUTH === "HoennSafariZone_South");
    const sz = Safari.encounter("Pikachu", { hoenn: true });
    assert(sz.escapeFactor === 3 && sz.catchFactor === Math.floor(DEX.Pikachu.captureRate * 100 / 1275), "Emerald's factors");
    assert(Safari.throwPokeblock(sz, 1) === "enthralled" && sz.escapeFactor === 1, "a Pokéblock it's enthralled by: 5 off the escape factor, to 1 at least");
    assert(Safari.goNear(sz) === "closer" && sz.catchFactor === Math.floor(DEX.Pikachu.captureRate * 100 / 1275) + 4 && sz.escapeFactor === 5);
    Safari.goNear(sz); Safari.goNear(sz); assert(Safari.goNear(sz) === "cant" && sz.near === 3, "no closer than three times");
    const sb = new Battle({ seed: 3, wild: true, safari: { balls: 30, hoenn: true }, p1: { name: "A", team: [{ species: "Pikachu", level: 20, moves: ["Tackle"] }] }, p2: { name: "Wild", team: [{ species: "Pikachu", level: 20, moves: ["Tackle"] }] } });
    sb.start();
    assert(sb.choose("p1", { type: "pokeblock", liking: 2, name: "RED POKéBLOCK" }).ok && sb.events.some((e) => e[0] === "-safaripokeblock" && e[2] === "ignored"), "a Pokéblock thrown in battle");
    assert(sb.choose("p1", { type: "gonear" }).ok && sb.events.some((e) => e[0] === "-safarinear"));
    assert(/name === "EnterSafariMode"/.test(gj) && /HoennSafariZone_/.test(gj) && /runHoenn\("SafariZone_EventScript_RetirePrompt"\)/.test(gj) && /hoennSafari\.nature\(\)/.test(gj), "the game's Safari hooks");
    assert(/labels: hoenn \? \["BALL", "POKéBLOCK", "GO NEAR", "RUN"\]/.test(fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8")), "Emerald's Safari menu");
    // Emerald's credits (ui/hall-of-fame.js hoennCredits, pictures from tools/build-emerald-credits.js): after Hoenn's Hall of Fame.
    const hof = fs.readFileSync(path.join(root, "ui/hall-of-fame.js"), "utf8");
    const pages = JSON.parse(/const EMERALD_PAGES = (\[[\s\S]*?\n  \]);/.exec(hof)[1]);
    assert(pages.length === 57 && pages[0][0][1] === "POKéMON EMERALD VERSION" && pages[56][1][1] === "Tsunekaz Ishihara" && pages.every((p) => p.length <= 5), "Emerald's 57 credits pages");
    for (const f of ["sky-day-a", "sky-sunset-b", "forest-sunset", "town-night-a", "grass-night", "birch-grass", "brendan", "may", "bicycle-may", "clouds-sunset-3", "trees-2", "house", "the-end"])
      assert(fs.existsSync(path.join(root, "assets/credits/emerald", f + ".png")), "credits picture " + f);
    assert(/case 30: m\.state = 5; v\.state = 3; b\.state = 50; break;/.test(hof) && /b\.key === "forestCatch"\) \{ if \(b\.timer === 584\)/.test(hof) && /Math\.floor\(EMERALD_PAGES\.length \/ 9\)/.test(hof), "Task_BikeScene and CheckChangeScene");
    assert(/HallOfFame\.hoennCredits\(\$\("#overlay"\), \{ skippable: true, music, girl: isGirl\(\), caught: player\.pokedex\.caught\.slice\(\),/.test(gj), "the credits roll after Hoenn's Hall of Fame");
    // Recorded battles (Emerald's): the engine plays the same battle again from its seed and the choices made; the Frontier
    // keeps the last battle's on the Frontier Pass (frontier_savebattle), the Pass on the Start menu plays it back.
    {
      const teamRng = mulberry32(4242), team = (n) => RandomTeam.team(n, { level: 50, rng: teamRng, maxGen: 3 });
      const p1 = { name: "A", team: team(3) }, p2 = { name: "B", team: team(3) };
      const first = new Battle({ seed: 777, p1, p2 }), rng = mulberry32(9), choices = [];
      first.start();
      for (let step = 0; step < 3000 && !first.ended; step++) {
        for (const id of ["p1", "p2"]) {
          const req = first.getRequest(id);
          if (req.phase !== "move" && req.phase !== "switch") continue;
          const c = OpponentAI.choose(first, id, rng);
          assert(first.choose(id, c).ok);
          choices.push([id, JSON.parse(JSON.stringify(c))]);
        }
      }
      assert(first.ended && choices.length > 2, "the recorded battle finished");
      const again = new Battle({ seed: 777, p1, p2 });
      again.start();
      for (const [id, c] of choices) assert(again.choose(id, c).ok, "the replay took every choice");
      assert(again.ended && again.winner === first.winner, "the replay ends as the battle did");
      assert.deepStrictEqual(again.events.map((e) => e[0]), first.events.map((e) => e[0]), "the replay's events are the battle's");
    }
    const bs = fs.readFileSync(path.join(root, "ui/battle-screen.js"), "utf8"), hf = fs.readFileSync(path.join(root, "ui/hoenn-frontier.js"), "utf8");
    assert(/if \(r && r\.ok && recording\) recording\.choices\.push\(\[side, /.test(bs) && /seed: cfg\.seed,/.test(bs) && /cfg\.replay \? await replayLoop\(cfg\.replay\) : await loop\(\)/.test(bs)
      && /return \{ outcome, battle, raidBall, record \};/.test(bs), "the battle screen records and replays");
    assert(/case "frontier_savebattle": \{\s*const rec = env\.lastRecord && env\.lastRecord\(\);/.test(hf) && /d === 6 \? s\.noRecord/.test(hf) && /s\.noRecord = env\.lastRecord && env\.lastRecord\(\) \? 0 : 1;/.test(hf), "the Frontier saves the last battle");
    assert(/record: true \};/.test(gj) && /lastRecord: \(\) => lastRecord, saveRecord: \(rec\) => \{ player\.flags\.hoennBattleRecord = rec;/.test(gj)
      && /hoenn\.flag\("FLAG_SYS_FRONTIER_PASS"\)/.test(gj) && /labels\[i\] === "VIEW RECORDED BATTLE"\) await playRecord\(rec\)/.test(gj) && /replay: rec\.choices, seed: rec\.seed/.test(gj), "the Frontier Pass plays it back");
    {
      // DeterminePokemonToShow: 71 slides from what's caught, round again when there are fewer, the starter last.
      let seed = 7; const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);
      const few = window.HallOfFame.emeraldSlides(["Poochyena", "Zigzagoon", "Treecko"], "Treecko", rng);
      assert(few.length === 71 && few[70] === "Treecko" && few.slice(0, 3).sort().join() === "Poochyena,Treecko,Zigzagoon" && few[3] === few[0] && few[4] === few[1], "few caught: round again, the starter last");
      const many = window.HallOfFame.emeraldSlides(Object.keys(window.DEX).slice(0, 120), "Torchic", rng);
      assert(many.length === 71 && many[70] === "Torchic" && new Set(many).size === 71, "many caught: 71 different, the starter last");
      assert(window.HallOfFame.emeraldSlides([], "Mudkip", rng).every((s) => s === "Mudkip"), "nothing caught: the starter");
    }
  }
  // The Apprentice (ui/hoenn-frontier.js apprentice, through Emerald's own scripts): taught over the days, saved, then met in the Tower.
  const apprenticeDone = frontierDone.then(async () => {
    assert(HF.apprentices.length === 16 && HF.apprentices[0].name === "Alann" && HF.apprentices[0].cls === "bug_catcher" && HF.apprentices[0].species.length === 10 && HF.apprentices[15].name === "Arturo", "the sixteen Apprentices");
    assert(HF.apprenticeMoves.length >= 290 && HF.apprenticeMoves.includes("Swords Dance") && !HF.apprenticeMoves.includes("Pound"), "the moves they're glad of");
    assert.deepStrictEqual(HF.apprenticeThreshold, [1, 2, 3, 4, 5, 8, 9, 10, 11, 12]);
    assert(HF.apprenticeText.Challenge.length === 16 && /no\. \{STR_VAR_2\} apprentice/.test(HF.apprenticeText.Challenge[1][0]) && HF.apprenticeText.WhichMove[0].length === 4 && HF.apprenticeSpeeches.length === 8, "their words");
    const s = F.state();
    fplayer.flags.hoennFrontier.app = null; fplayer.flags.hoennFrontier.apprentices = [];
    H.resetTemp(); spoken = [];
    const talk = () => H.run("BattleFrontier_BattleTowerLobby_EventScript_Apprentice", { person: { localId: "LOCALID_APPRENTICE", id: 5 } });
    const newDay = () => { s.appDay = "never"; H.setFlag("FLAG_DAILY_APPRENTICE_LEAVES", false); };
    // The first meeting: "please teach me", yes, Open Level.
    pickFn = async (title, labels) => (labels[1] === "Open Level" ? 1 : 0);
    await talk();
    assert(s.app && s.app.lvlMode === 2 && HF.apprenticeFirst.includes(s.app.id) && s.app.speciesIds.length === 3 && new Set(s.app.speciesIds.flatMap((x) => [x >> 4, x & 15])).size === 6, "an Apprentice, Open Level, six species shuffled into pairs");
    assert(H.flag("FLAG_DAILY_APPRENTICE_LEAVES") && H.flag("FLAG_HIDE_APPRENTICE"), "gone for the day");
    assert(spoken.some((p) => /Open Level/.test(p)), "thanked for the level mode: " + spoken.slice(-2).join(" | "));
    // Three Pokémon, the second of each pair.
    pickFn = async (title, labels) => 1;
    for (let i = 0; i < 3; i++) { newDay(); await talk(); }
    assert(s.app.answered === 3 && s.app.party === 7 && s.app.questions.length === 9, "three chosen (the second each time), the questions laid out (" + s.app.questions.length + ")");
    const kinds = s.app.questions.map((q) => q.kind), numQ = kinds.includes(0) ? kinds.indexOf(0) : 9;
    assert(kinds.filter((k) => k === 1).length <= 3 && kinds.filter((k) => k === 2).length <= 5 && kinds.filter((k) => k === 3).length <= 1 && kinds.filter((k) => k === 0).length <= 1, "items, moves, which first, the win speech once at most");
    assert(s.app.questions.filter((q) => q.kind === 2).every((q) => q.data && window.MOVES[q.data]), "each move question offers another move");
    const species = [0, 1, 2].map((i) => HF.apprentices[s.app.id].species[(s.app.speciesIds[i] >> 4) & 15]);   // (the second of each pair: the high nibble)
    const itemQs = kinds.slice(0, numQ).filter((k) => k === 1).length, leadFirst = kinds.slice(0, numQ).includes(3);
    // The rest: items (Leftovers, then it's refused again, so nothing), moves (the second), which first (the third), the win speech (the sixth).
    let items = 0;
    chooseItemFn = async () => { items++; return "leftovers"; };
    pickFn = async (title, labels) => (labels[0] === "Give" ? 1 : labels.length === 3 ? 2 : labels.length === 8 ? 5 : 1);
    for (let i = 0; i < 12 && s.apprentices.length === 0; i++) { newDay(); await talk(); }
    assert(s.apprentices.length === 1, "taught through and saved (" + s.app.answered + " answered)");
    const ap = s.apprentices[0];
    assert(ap.number === 1 && ap.lvlMode === 2 && ap.numQuestions === numQ && ap.playerName === "ASH" && ap.speechWon === HF.apprenticeSpeeches[5], "the saved Apprentice: no. 1, " + numQ + " questions, the speech chosen: " + JSON.stringify(ap));
    assert(ap.party.length === 3 && ap.party[0].species === species[leadFirst ? 2 : 0] && ap.party.every((p) => species.includes(p.species) && p.moves.length >= 1 && p.moves.length <= 4), "the party you taught, the lead first: " + JSON.stringify(ap.party.map((p) => p.species)));
    assert(ap.party.filter((p) => p.item === "leftovers").length === Math.min(1, itemQs) && items >= Math.min(2, itemQs), "Leftovers once, refused after (" + items + " offered, " + itemQs + " asked)");
    assert(s.app && s.app.id !== ap.id && s.app.lvlMode === 0, "a new Apprentice waits");
    // In the Tower: at the streak their questions earned, in singles at their level mode, they're the opponent, with that party.
    const T = F.state(); T.lvl = 1; T.streak["0.0.1"] = HF.apprenticeThreshold[numQ]; T.num = 0; T.ids = [];
    H.setVar("VAR_FRONTIER_FACILITY", 0); H.setVar("VAR_FRONTIER_BATTLE_MODE", 0);
    await F.op("tower_setopponent", [], { num: (x) => +x, setVar: (n, v) => H.setVar(n, v), getVar: (n) => H.getVar(n), setBuffer() {}, setFlag(n, v) { H.setFlag(n, v); }, flag: (n) => H.flag(n) });
    assert(T.A && T.A.kind === "apprentice", "the Apprentice is the opponent at streak 8: " + JSON.stringify(T.A));
    T.streak["0.0.1"] = HF.apprenticeThreshold[numQ] + 1;
    await F.op("tower_setopponent", [], { num: (x) => +x, setVar: (n, v) => H.setVar(n, v), getVar: (n) => H.getVar(n), setBuffer() {}, setFlag(n, v) { H.setFlag(n, v); }, flag: (n) => H.flag(n) });
    assert(T.A.kind === "frontier", "not at 9");
    const hf = fs.readFileSync(path.join(root, "ui/hoenn-frontier.js"), "utf8");
    assert(/if \(ref\.kind === "apprentice"\) return apprenticeTrainer\(ref\.idx\);/.test(hf) && /else if \(t\.apprentice\) foe = t\.party\.map\(\(p\) => apprenticeMon\(t, p, level\)\);/.test(hf), "they battle with what you taught");
    assert(/case "ShowEasyChatScreen": \{\s*if \(v\("VAR_0x8004"\) !== 19\) return false;/.test(hf), "the win speech in place of the Easy Chat screen");
    assert(/chooseItem: async \(\) => \{/.test(fs.readFileSync(path.join(root, "ui/game.js"), "utf8")), "the Bag opens to suggest an item");
    assert(F.state().A && spoken.length >= 0, "the Apprentice as a trainer");
    const at = F.state(); at.A = { kind: "apprentice", idx: 0 };
    H.setVar("VAR_0x8004", 0); battles = 0;
    await F.special("DoSpecialTrainerBattle", { num: (x) => +x, setVar: (n, v) => H.setVar(n, v), getVar: (n) => H.getVar(n), setBuffer() {}, setFlag(n, v) { H.setFlag(n, v); }, flag: (n) => H.flag(n), flush: async () => {} });
    assert(battles === 1 && lastSpec && lastSpec.foe.team.length === 3 && lastSpec.foe.team.map((r) => r.species).join() === ap.party.map((p) => p.species).join() && /apprentice/.test(lastSpec.foe.name + " " + (lastSpec.foeIntro || "")) === false, "the Apprentice battles with the party you taught: " + JSON.stringify(lastSpec && lastSpec.foe.team.map((r) => [r.species, r.item, r.moves.map((m) => m.name)])));
    console.log("ok: the Apprentice, taught over " + (s.apprentices[0].numQuestions + 4) + " days and met in the Tower");
  });
  var frontierTest = apprenticeDone.then(() => console.log("ok: Battle Frontier, the Tower, the Brain's symbol, the Factory, Arena, Palace, Dome, Pike, the Pyramid, the three tents and a Contest through Emerald's scripts"));
}

// Hoenn's script interpreter (ui/hoenn-script.js) against a stub game: the constants, a story scene end to end, a frame table, Dive's connections, trades.
{
  const HS = window.HOENN_SCRIPTS;
  assert.deepStrictEqual([HS.numConsts.DIR_SOUTH, HS.numConsts.DIR_NORTH, HS.numConsts.PARTY_NOTHING_CHOSEN, HS.numConsts.B_OUTCOME_CAUGHT], [1, 2, 255, 7]);
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/hoenn-script.js"), "utf8"), { filename: "ui/hoenn-script.js" });
  const player = { flags: {}, party: [{ species: "Treecko", level: 10, hp: 30, moves: [{ name: "Cut" }] }], name: "ASH", badges: [] };
  let here = "PetalburgCity_Gym", warped = null, said = 0;
  const env = {
    player: () => player, map: () => here, say: async () => { said++; }, confirm: async () => true, choose: async () => 0, close() {}, facePlayer: async () => {}, act: async () => {},
    show() {}, hide() {}, place() {}, moveTo() {}, personAt: () => ({ x: 4, y: 108, facing: "up" }), giveItem: async () => {}, hasItem: () => true, takeItem: () => 1, itemCount: () => 1,
    itemName: (x) => x, cry() {}, fade: async () => {}, trainerBattle: async () => "won", wildBattle: async () => "won", warp: async (m) => { warped = m; }, giveMon: async () => true,
    mart: async () => {}, healParty() {}, money: () => 9999, addMoney() {}, music() {}, fanfare: async () => {}, se() {}, shake: async () => {}, sleep: async () => {}, isGirl: () => false,
    choosePartyMon: async () => 0, beaten: () => false, setBeaten() {}, setMetatile() {}, badge() {}, respawn() {}, setDynamicWarp() {}, moneyBox() {}, save: async () => {}, special: async () => false
  };
  const H = window.HoennScript.create(env);
  // Norman's first talk (it switches on the way you face: DIR_NORTH): Wally's lesson begins and you're sent out to Petalburg.
  const done = H.run("PetalburgCity_Gym_EventScript_Norman", { person: { localId: "LOCALID_PETALBURG_GYM_NORMAN", id: 0 } }).then(() => {
    assert.strictEqual(H.getVar("VAR_PETALBURG_GYM_STATE"), 1, "Norman starts Wally's lesson");
    assert.strictEqual(H.getVar("VAR_PETALBURG_CITY_STATE"), 2);
    assert.strictEqual(warped, "MAP_PETALBURG_CITY", "...and you're sent to Petalburg");
    assert(said > 5, "with his words");
    // (There, the map's frame table has Wally's lesson due.)
    assert.strictEqual(H.frameScript("PetalburgCity", false), "PetalburgCity_EventScript_WallyTutorial");
    assert.strictEqual(H.frameScript("PetalburgCity", true), "PetalburgCity_EventScript_WallyTutorial");
  });
  // Dive: each surface sea's deep water goes down to its Underwater map, which comes up again.
  for (const n of ["Route105", "Route124", "Route125", "Route126", "Route127", "Route128", "Route129"]) {
    assert(WORLD_MAPS[n].connections.some((c) => c.direction === "dive" && /^Underwater_/.test(c.map)), n + " dives");
    assert(WORLD_MAPS[WORLD_MAPS[n].connections.find((c) => c.direction === "dive").map].connections.some((c) => c.direction === "emerge" && c.map === n), n + "'s deep comes up");
  }
  assert.strictEqual(WORLD_MAPS.Underwater_Route124.type, "underwater");
  assert(WORLD_MAPS.Underwater_Route124.wild && WORLD_MAPS.Underwater_Route124.wild.weights.length === 5, "seaweed has the water's Pokémon");
  assert(fs.existsSync(path.join(root, "assets/world/sprites/em_brendan_underwater.png")), "the diving sprite");
  // Berry trees: the ones along the routes are people on the Berry Farm's engine, and the new game's are grown.
  {
    const trees = Object.values(WORLD_MAPS).flatMap((m) => (m.region === "hoenn" ? m.people : [])).filter((p) => /^HoennBerry_Tree_\d+$/.test(p.script || ""));
    assert(trees.length >= 80 && new Set(trees.map((p) => p.script)).size === trees.length, "berry trees: " + trees.length);
    assert.strictEqual(HS.berryTrees[2].berry, "oran-berry");
    assert(Object.keys(HS.berryTrees).every((id) => trees.some((p) => p.script === "HoennBerry_Tree_" + id)), "each grown tree is on a map");
  }
  // Weather: each map's header, the steps that change it, and the module that draws it.
  {
    vm.runInThisContext(fs.readFileSync(path.join(root, "ui/weather.js"), "utf8"), { filename: "ui/weather.js" });
    assert.strictEqual(window.Weather.FILTERS.shade, "brightness(0.8125)");
    assert(WORLD_MAPS.MtChimney.weatherHeader === "volcanic_ash" && WORLD_MAPS.PetalburgWoods.weatherHeader === "shade" && WORLD_MAPS.Underwater_Route124.weatherHeader === "underwater");
    assert(WORLD_MAPS.Route119.weatherSteps.some((s) => s.weather === "route119_cycle") && WORLD_MAPS.Route113.weatherSteps.some((s) => s.weather === "volcanic_ash"));
    const ops = [];
    const cx = new Proxy({}, { get: (t, p) => (p in t ? t[p] : (...a) => { ops.push(p); }), set: (t, p, v) => { t[p] = v; return true; } });
    const wx = window.Weather.create(cx, 240, 160, {});
    for (const k of ["rain", "thunderstorm", "downpour", "snow", "sandstorm", "drought", "sunny_clouds", "volcanic_ash", "underwater", "shade"]) for (let i = 0; i < 5; i++) { wx.update(k); wx.draw(k); }
    assert(ops.includes("stroke") && ops.includes("fillRect"), "the weather draws");
  }
  // Swapped layouts (the Mirage Tower gone, Sky Pillar cleaned), the rotating-tile puzzles, the Rayquaza scene.
  assert(WORLD_MAPS.Route111.layouts.LAYOUT_ROUTE111_NO_MIRAGE_TOWER.length > 10 && WORLD_MAPS.SkyPillar_Top.layouts.LAYOUT_SKY_PILLAR_TOP_CLEAN.length > 50);
  assert(HS.rotStart.gym > 0 && HS.rotStart.trick > 0 && WORLD_MAPS.MossdeepCity_Gym.blocks && WORLD_MAPS.Route110_TrickHousePuzzle6.blocks, "the rotating tiles' arrows");
  assert(WORLD_MAPS.Route110_TrickHousePuzzle8 && WORLD_MAPS.MarineCave_End && WORLD_MAPS.Underwater_SealedChamber, "the maps only scripts go to");
  vm.runInThisContext(fs.readFileSync(path.join(root, "ui/rayquaza-scene.js"), "utf8"), { filename: "ui/rayquaza-scene.js" });
  assert.strictEqual(typeof window.RayquazaScene.play, "function");
  // Emerald's five scenes from its own pictures (tools/build-rayquaza-scene.js), timed as src/rayquaza_scene.c times them.
  {
    for (const f of ["1-clouds-far", "1-clouds-near", "1-rain", "1-groudon", "1-kyogre", "1-kyogre-pectoral-fin", "2-bg", "2-rayquaza", "2-smoke", "3-bg", "3-light", "3-rayquaza", "3-rayquaza-tail",
      "4-bg", "4-orbs", "4-streaks", "4-rayquaza", "5-bg", "5-light", "5-ring", "5-groudon", "5-groudon-tail", "5-kyogre", "5-rayquaza", "5-rayquaza-tail", "5-kyogre-splash"])
      assert(fs.existsSync(path.join(root, "assets/rayquaza-scene", f + ".png")), "the scene's picture " + f);
    const rs = fs.readFileSync(path.join(root, "ui/rayquaza-scene.js"), "utf8");
    assert(/if \(timer === 32 \|\| timer === 112\) \{ sfx\("se_thunder"\); lightning\(16, 0, 0\); \}/.test(rs) && /else if \(timer === 380\) panning = true;/.test(rs) && /else if \(timer === 412\) break;/.test(rs), "the fight's lightning and its end");
    assert(/if \(f === 0\) \{ R\.xp = 12; R\.yp = 8; \}/.test(rs) && /if \(\+\+timer === 368\)/.test(rs), "the descent's pace");
    assert(/else if \(f === 328\) \{ float\(\); setAnim\(3, 48, 16\); Ry\.x2 = 1; if \(env\.cry\) env\.cry\("Rayquaza"\);/.test(rs) && /if \(timer === 448\) \{ timer = 0; state = 3; \}/.test(rs), "the roar, the ring, the pair's leaving");
    assert(/await duoFight\(false\); await takesFlight\(\); await descends\(\); await charges\(\); await chasesAway\(\);/.test(rs) && /if \(mode === 0\) await duoFight\(true\);/.test(rs), "all five scenes, or the fight alone");
  }
  // Secret Bases and decorations: the catalogue, its pictures, the spots and the rooms.
  {
    assert.strictEqual(HS.decor.length, 120);
    for (const d of HS.decor) {
      assert(d.name && d.price >= 0 && d.cat >= 0 && d.cat < 8 && d.w * d.h >= 1, d.key + " is in the catalogue");
      if (d.perm === "sprite") assert(d.tiles[0] && fs.existsSync(path.join(root, "assets/world/sprites/" + d.tiles[0].sprite + ".png")), d.key + "'s picture");
      else assert(d.tiles.length === d.w * d.h && d.tiles.every((t) => t >= 512 && t <= 0x340), d.key + "'s tiles");
    }
    for (const t of ["RedCave", "BrownCave", "BlueCave", "YellowCave", "Tree", "Shrub"]) assert(fs.existsSync(path.join(root, "assets/world/maps/_decor_" + t + "-mt.png")), t + "'s decoration tiles");
    const bases = Object.values(WORLD_MAPS).filter((m) => /^SecretBase_/.test(m.name));
    assert.strictEqual(bases.length, 24);
    assert(bases.every((m) => m.decorSheet && /f/.test(m.decorKind) && m.signs.some((s) => s.script === "SecretBase_EventScript_PC") && m.scriptName === "SecretBase"), "the bases' rooms");
    const spots = Object.values(WORLD_MAPS).flatMap((m) => (m.signs || []).filter((s) => s.spot));
    assert(spots.length >= 70 && spots.every((s) => WORLD_MAPS["SecretBase_" + s.spot.replace(/^SECRET_BASE_/, "").replace(/_\d+$/, "").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join("")]), "each spot's room: " + spots.length);
    assert(WORLD_MAPS.LittlerootTown_BrendansHouse_2F.decorKind.includes("l"), "your room holds dolls");
    assert(HS.multi.MULTI_BASE_PC_NO_REGISTRY, "the base PC's menu");
  }
  // In-game trades: Rustboro's Seedot for a Ralts.
  assert.deepStrictEqual([HS.trades.INGAME_TRADE_SEEDOT.species, HS.trades.INGAME_TRADE_SEEDOT.requested], ["Seedot", "Ralts"]);
  assert(Object.keys(HS.trades).length >= 4, "the trades are in");
  // The gym puzzles' tiles are on their sheets.
  assert(WORLD_MAPS.MauvilleCity_Gym.mt && Object.keys(WORLD_MAPS.MauvilleCity_Gym.mt).length > 20 && WORLD_MAPS.PetalburgCity_Gym.mt.METATILE_PetalburgGym_SlidingDoor_Frame4);
  done.then(() => console.log("ok: Hoenn's scripts, Norman's scene and Wally's lesson, Dive, trades, " + Object.keys(HS.s).length + " scripts"));
}

// The other realms' battles (engine/battle.js's Ultimax): Kamurocho's fights, played with random choices, end;
// the chart's immunities hold; EXP levels a member up and teaches their skills.
{
  const R = window.Ultimax, S = window.REALM_SKILLS, groups = window.REALM_ENCOUNTERS.Kamurocho.groups;
  assert.strictEqual(R.effect("Psychic", ["Dark"]), 0);
  assert.strictEqual(R.effect("Ground", ["Dark", "Steel"]), 2);
  for (const id in window.REALM_FIGHTERS) for (const [, s] of window.REALM_FIGHTERS[id].skills) assert(S[s], id + "'s " + s);
  for (const id in window.REALM_FOES) for (const s of window.REALM_FOES[id].skills) assert(S[s], id + "'s " + s);
  let turns = 0;
  for (let g = 0; g < 60; g++) {
    const races = window.REALM_RACES.map((r) => r.id).concat("you");
    const recs = [R.recruit(races[g % races.length], 1 + g % 8), R.recruit("kiryu", 3 + g % 8)].concat(g % 2 ? [R.recruit("majima", 8)] : []);
    const b = R.create(recs.map((r) => R.member(r, "Red")), g % 3 ? groups[g % groups.length][1] : ["majima"], { seed: g + 1 });
    b.items = { staminan: 2 };
    for (let n = 0; !b.over; n++) {
      assert(n < 300, "a realm battle ends");
      const choices = b.allies.map((f, i) => (g % 4 === 0 && i === 0 ? { act: "item", item: "staminan", target: 1 } : f.skills[n % 3] && R.skillOf(f, f.skills[n % 3]).mp <= f.mp ? { act: "skill", skill: f.skills[n % 3], target: 0 } : { act: "attack", target: 0 }));
      for (const st of R.turn(b, n % 9 === 8 ? "run" : choices)) assert(!/NaN|undefined/.test(st.text), st.text);
      turns++;
    }
  }
  const rec = R.recruit("you", 1), ups = R.gainExp(rec, R.expFor(5));
  assert(rec.lv === 5 && ups.length === 4 && ups.some((u) => u.learned.includes("rush")));
  // (Each race is a fighter of its own, levelling up through all its skills.)
  for (const r of window.REALM_RACES) { const x = R.recruit(r.id, 1); R.gainExp(x, R.expFor(20)); assert.strictEqual(R.skillsAt(r.id, x.lv).length, 7, r.id); }
  // (A Pokémon out of its realm: the Ultimax system's rules, its stats as theirs, its types as elements.)
  const TYPES = { Dragon: "Air", Flying: "Air", Normal: "Neutral", Electric: "Electric", Water: "Water", Grass: "Grass", Psychic: "Psychic",
    Fire: "Fire", Rock: "Ground", Ground: "Ground", Steel: "Steel", Ghost: "Dark", Fairy: "Light", Poison: "Poison", Bug: "Grass",
    Fighting: "Neutral", Ice: "Ice", Dark: "Dark" };
  for (const t in TYPES) assert.deepStrictEqual(R.pokemonElements([t]), [TYPES[t]], t);
  assert.deepStrictEqual(R.pokemonElements(["Normal", "Flying"]), ["Air"]);
  assert.deepStrictEqual(R.pokemonElements(["Rock", "Ground"]), ["Ground"]);
  assert.deepStrictEqual(R.pokemonElements(["Fighting", "Normal"]), ["Neutral"]);
  assert.deepStrictEqual(R.pokemonElements(["Ghost", "Fairy"]), ["Dark", "Light"]);
  for (const e of Object.values(TYPES)) assert(window.REALM_ELEMENTS.includes(e), e);
  const pika = Party.create("Pikachu", 20, { moves: ["Thunderbolt", "Quick Attack", "Thunder Wave", "Growl"] }), ps = Party.stats(pika);
  const pf = R.pokemon(pika, ps, "Pikachu");
  assert(pf.str === ps.atk && pf.def === ps.def && pf.int === ps.spa && pf.wis === ps.spd && pf.spd === ps.spe && pf.maxHp === ps.hp * R.HP_SCALE);
  assert.deepStrictEqual(pf.elements, ["Electric"]);
  assert.deepStrictEqual(pf.skills, ["move:Thunderbolt", "move:Quick Attack", "move:Thunder Wave", "move:Growl"]);
  assert(pf.own["move:Thunderbolt"].kind === "magic" && pf.own["move:Thunderbolt"].element === "Electric" && pf.own["move:Thunderbolt"].status === "paralysis");
  assert(pf.own["move:Quick Attack"].kind === "phys" && pf.own["move:Quick Attack"].priority === 1 && pf.own["move:Thunder Wave"].kind === "status" && pf.own["move:Thunder Wave"].status === "paralysis");
  assert(pf.own["move:Growl"].kind === "boost" && pf.own["move:Growl"].boosts.atk === -1);
  assert(R.pokemonSkill("Recover", 30, 100).kind === "heal" && R.pokemonSkill("Protect", 30, 100).kind === "protect" && R.pokemonSkill("Harden", 30, 100).kind === "boost");
  assert(R.pokemonSkill("Sleep Powder", 30, 100).status === "sleep" && R.pokemonSkill("Toxic", 30, 100).status === "toxic" && R.pokemonSkill("Will-O-Wisp", 30, 100).status === "burn");
  assert(R.pokemonSkill("Swords Dance", 30, 100).kind === "boost" && R.pokemonSkill("Confuse Ray", 30, 100).status === "confusion" && !R.pokemonSkill("Rain Dance", 30, 100));
  for (const id in S) assert(S[id].status !== "stun", id + ": stun is paralysis now");
  {
    const b = R.create([R.member(R.recruit("hylian", 20), "Red"), pf], ["thug", "knife"], { seed: 7 });
    // (its moves cost MP, not PP: its MP its species', data/mon-mp.js)
    const mp0 = pf.mp, pp0 = pika.moves[0].pp;
    assert(mp0 === R.monMp("Pikachu", 20) && mp0 > 0 && pf.own["move:Thunderbolt"].mp === 5, "a Pokémon's MP and its moves' costs");
    for (let n = 0; !b.over; n++) {
      assert(n < 100, "a fight with a Pokémon in it ends");
      for (const st of R.turn(b, [{ act: "attack", target: 0 }, { act: "skill", skill: "move:Thunderbolt", target: 0 }])) assert(!/NaN|undefined/.test(st.text), st.text);
    }
    assert(pf.mp < mp0, "its moves cost MP");
    R.keep(b);
    assert(pika.moves[0].pp === pp0 && pika.realmMp === pf.mp && pika.hp === Math.ceil(pf.hp / R.HP_SCALE), "its MP and HP go back to it, its PP untouched");
    assert(R.pokemon(pika, ps, "Pikachu").mp === pf.mp, "and it comes back with that MP");
    Party.heal(pika);
    assert(pika.realmMp === undefined && R.pokemon(pika, ps, "Pikachu").mp === mp0, "a Pokémon Center fills it again");
    assert(R.pokemonExp(pika, 20) > 0);
    assert(Object.keys(window.MON_MP).length === 386 && window.MON_MP.Bulbasaur > 0 && window.MON_MP["Deoxys-Normal"] > 0, "the first 386's MP");
  }
  // (Kanto's Pokémon Trainers: weak but for speed; Go! sends one out, and they become it at their level, its stats,
  // elements, four moves and Return; Return, and the fight's end, make them themselves again.)
  {
    const rec = R.recruit("kanto", 12), me = R.member(rec, "Red"), hyl = R.member(R.recruit("hylian", 12), "Red");
    assert(me.str < hyl.str && me.def < hyl.def && me.spd > hyl.spd && me.maxHp < hyl.maxHp, "a trainer's weak, but quick");
    assert.deepStrictEqual(R.skillsAt("kanto", 1), ["go_pikachu"], "one Pokémon to send out at first");
    const b = R.create([me], ["punk"], { seed: 11 });
    R.turn(b, [{ act: "skill", skill: "go_bulbasaur", target: 0 }]);
    const st = R.monStats("Bulbasaur", 12);
    assert(me.form === "Bulbasaur" && me.str === st.atk && me.spd === st.spe && me.maxHp === st.hp * R.HP_SCALE && me.maxMp === R.monMp("Bulbasaur", 12), "they become it, at their level");
    assert.deepStrictEqual(me.elements, ["Grass", "Poison"]);
    assert(me.skills.length === 5 && me.skills[4] === "return_mon" && me.skills.slice(0, 4).every((id) => me.own[id]), "its four moves, and Return");
    R.turn(b, [{ act: "skill", skill: "return_mon", target: 0 }]);
    assert(!me.form && me.name === "Red" && me.str === hyl.str - (hyl.str - me.str) && me.skills[0] === "go_pikachu", "Return: themselves again");
    R.turn(b, [{ act: "skill", skill: "go_pikachu", target: 0 }]);
    R.keep(b);
    assert(rec.hp <= R.statsOf(rec).hp && rec.mp <= R.statsOf(rec).mp, "out of the fight, themselves");
  }
  // (Four fight and four wait in reserve: Swap brings one in, and one comes in for anyone who falls; the fight's lost
  // only when the reserve's down too.)
  {
    const mk = (id, lv) => R.member(R.recruit(id, lv), "Red");
    const b = R.create([mk("hylian", 3)], ["grunt"], { seed: 3, reserve: [mk("kiryu", 30), mk("majima", 30)] });
    const k0 = b.reserve[0];
    R.turn(b, [{ act: "swap", reserve: 0 }]);
    assert(b.allies[0] === k0 && b.reserve[0].id === "hylian", "a swap");
    b.allies[0].hp = 1;
    for (let n = 0; !b.over && n < 60; n++) R.turn(b, [{ act: "attack", target: 0 }]);
    assert(b.over === "won", "the reserve fights on: " + b.over);
    const lost = R.create([mk("hylian", 1)], ["shakedown"], { seed: 5, reserve: [mk("hylian", 1)] });
    for (let n = 0; !lost.over && n < 200; n++) R.turn(lost, [{ act: "defend" }]);
    assert(lost.over === "lost" && lost.allies.concat(lost.reserve).every((f) => f.hp === 0), "lost once everyone's down");
  }
  // (HP_SCALE: everyone's HP that many times, a save's from before as much of the new; the Pokémon realm's ways:
  // stat stages, Protect, paralysis and the rest.)
  {
    const old = { id: "kiryu", lv: 5, exp: R.expFor(5), hp: 20, mp: 5 };
    R.rescale(old);
    assert(old.hp === 20 * R.HP_SCALE && old.hpScale === R.HP_SCALE && R.stats("kiryu", 5).hp % R.HP_SCALE === 0);
    assert.strictEqual(R.create([], ["punk"]).foes[0].maxHp, window.REALM_FOES.punk.hp * R.FOE_HP_SCALE, "the street's foes keep their own HP");
    assert.strictEqual(R.create([], ["majima"]).foes[0].maxHp, window.REALM_FOES.majima.hp * R.HP_SCALE, "a boss's is scaled");
    // (Categories: Physical by Strength, Magical by Intelligence, the rest Status, heals by Wisdom; a Pokémon's
    // Special moves Magical.)
    const SK = window.REALM_SKILLS;
    assert.deepStrictEqual([R.category(SK.rush), R.category(SK.kamehameha), R.category(SK.first_aid), R.category(SK.brace)], ["Physical", "Magical", "Status", "Status"]);
    assert.strictEqual(R.category(R.pokemonSkill("Thunderbolt", 20, 60)), "Magical");
    assert.strictEqual(R.category(R.pokemonSkill("Tackle", 20, 60)), "Physical");
    const hitBy = (k, v, skill) => {
      const me = R.member(R.recruit("human", 10)), b = R.create([me], ["punk"], { seed: 7 });
      me[k] = v; me.mp = 99; b.foes[0].hp = b.foes[0].maxHp = 9999; b.foes[0].def = b.foes[0].wis = 0;
      R.turn(b, [{ act: "skill", skill, target: 0 }]);
      return 9999 - b.foes[0].hp;
    };
    assert(hitBy("int", 80, "kamehameha") > hitBy("int", 20, "kamehameha") * 2, "Magical goes by Intelligence");
    assert(hitBy("str", 80, "wolf_fang") > hitBy("str", 20, "wolf_fang") * 2, "Physical by Strength");
    const healBy = (wis) => {
      const me = R.member(R.recruit("you", 10)), b = R.create([me], ["punk"], { seed: 3 });
      me.wis = wis; me.mp = 99; me.hp = 1; b.foes[0].str = 0;
      R.turn(b, [{ act: "skill", skill: "first_aid", target: 0 }]);
      return me.hp;
    };
    assert(healBy(40) > healBy(10) * 1.5, "heals by Wisdom");
    // (Stat points: 3 a level, into any stat; a member saved before them gets their levels' worth.)
    const pr = R.recruit("kiryu", 1);
    R.gainExp(pr, R.expFor(3));
    assert.strictEqual(pr.points, 6);
    const before = R.statsOf(pr);
    assert(R.spend(pr, "str") && R.spend(pr, "hp") && R.statsOf(pr).str === before.str + 1 && R.statsOf(pr).hp === before.hp + 2 * R.HP_SCALE && pr.points === 4);
    const old5 = { id: "kiryu", lv: 5, exp: R.expFor(5), hp: 10, mp: 5, hpScale: R.HP_SCALE };
    assert.strictEqual(R.pointsOf(old5).points, 12);
    assert.strictEqual(R.member(pr).str, R.statsOf(pr).str);
    const mon = (moves) => { const m = Party.create("Machamp", 50, { moves }); return R.pokemon(m, Party.stats(m), "Machamp"); };
    // (Swords Dance: Strength two stages up, the damage with it.)
    const sd = mon(["Swords Dance", "Protect", "Thunder Punch", "Bulk Up"]);
    const b1 = R.create([sd], ["shakedown"], { seed: 11 });
    const t1 = R.turn(b1, [{ act: "skill", skill: "move:Swords Dance" }]).map((x) => x.text).join(" ");
    assert(sd.boosts.str === 2 && /Strength sharply rose/.test(t1), t1);
    // (Protect: nothing lands; straight after, a third as likely; Thunder Punch can paralyse, and paralysis halves speed.)
    let guarded = 0;
    for (let seed = 1; seed < 40; seed++) {
      const p = mon(["Protect"]), b = R.create([p], ["grunt"], { seed });
      const hp = p.hp, text = R.turn(b, [{ act: "skill", skill: "move:Protect" }]).map((x) => x.text).join(" ");
      if (/protected itself/.test(text) && p.hp === hp) guarded++;
    }
    assert(guarded >= 35, "Protect works: " + guarded);
    let again = 0;
    for (let seed = 1; seed <= 90; seed++) {
      const p = mon(["Protect"]), b = R.create([p], ["punk"], { seed });
      R.turn(b, [{ act: "skill", skill: "move:Protect" }]);
      if (p.protectChain === 1 && /protected itself/.test(R.turn(b, [{ act: "skill", skill: "move:Protect" }])[0].text)) again++;
    }
    assert(again > 10 && again < 50, "Protect straight after works a third of the time: " + again);
    const z = R.create([sd], ["grunt"], { seed: 1 }).foes[0];
    const spd = z.spd;
    z.status = "paralysis";
    assert(R.TYPE_ELEMENT.Electric === "Electric" && z.spd === spd);
    // (Thunder Wave doesn't paralyse the Electric; Will-O-Wisp doesn't burn the Fire.)
    const tw = R.pokemon(Party.create("Jolteon", 50, { moves: ["Thunder Wave"] }), Party.stats(Party.create("Jolteon", 50)), "Jolteon");
    const b3 = R.create([tw], ["punk"], { seed: 3 });
    b3.foes[0].elements = ["Electric"];
    const t3 = R.turn(b3, [{ act: "skill", skill: "move:Thunder Wave", target: 0 }]).map((x) => x.text).join(" ");
    assert(!b3.foes[0].status && /doesn't work|no effect/.test(t3), t3);
    b3.foes[0].elements = ["Neutral"]; b3.foes[0].hp = b3.foes[0].maxHp;
    for (let n = 0; n < 10 && !b3.foes[0].status; n++) { tw.mp = tw.maxMp; R.turn(b3, [{ act: "skill", skill: "move:Thunder Wave", target: 0 }]); }
    assert.strictEqual(b3.foes[0].status, "paralysis");
    // (Fights with every kind of move in them end, and say nothing undefined.)
    const all = ["Swords Dance", "Protect", "Toxic", "Will-O-Wisp", "Confuse Ray", "Leech Seed", "Rest", "Close Combat", "Giga Drain", "Double-Edge", "Fake Out",
      "Sand Attack", "Endure", "Wide Guard", "Spiky Shield", "Haze", "Belly Drum", "Swagger", "Ice Beam", "Fire Fang", "Explosion", "Aqua Ring"];
    for (let g = 0; g < 30; g++) {
      const ms = [0, 1, 2, 3].map((k) => all[(g * 4 + k) % all.length]);
      const m = Party.create("Mew", 40, { moves: ms }), f = R.pokemon(m, Party.stats(m), "Mew");
      const b = R.create([f, R.member(R.recruit("kai", 10), "Red")], ["thug", "biker"], { seed: g + 5, reserve: [R.member(R.recruit("kiryu", 12), "Red")] });
      for (let n = 0; !b.over; n++) {
        assert(n < 400, "a fight with " + ms.join(", ") + " ends");
        const choices = b.allies.map((x) => (x.mon ? { act: "skill", skill: x.skills[n % x.skills.length], target: 0 } : { act: "attack", target: 0 }));
        if (f.mon) f.mp = f.maxMp;
        for (const st of R.turn(b, choices)) assert(!/NaN|undefined/.test(st.text), st.text);
      }
      R.keep(b);
      assert(m.hp >= 0 && m.hp <= Party.stats(m).hp && (m.hp > 0 || !m.status));
    }
  }
  // (Kamurocho's streets, side on: every scene's picture and people drawn, everyone and every way in on its floor;
  // the manhole in Serena's backlot, the ladder up from the sewer to it.)
  {
    const K = window.KAMUROCHO_STREET, here = (f) => fs.existsSync(require("path").join(__dirname, "..", f));
    const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    assert(K.scenes[K.arrive.scene] && inside(K.scenes[K.arrive.scene].floor, K.arrive.x, K.arrive.y), "the Time Machine leaves you on the floor");
    for (const [id, S] of Object.entries(K.scenes)) {
      assert(here(S.image), id + "'s picture");
      for (const p of S.people || []) assert(here("assets/kamurocho/people/" + p.sprite + ".png") && inside(S.floor, p.x, p.y), id + ": " + p.script);
      // (those who walk: their walk a strip of four frames as wide as they stand, its frames' heights theirs, and
      // both ends of their beat on the floor)
      const png = (f) => { const b = fs.readFileSync(require("path").join(__dirname, "..", "assets/kamurocho/people", f + ".png")); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
      for (const p of (S.people || []).filter((p) => p.walk)) {
        const [w, h] = png(p.sprite), [ww, wh] = png(p.walk), r = p.range || 50;
        assert(ww === 4 * w && wh === h && inside(S.floor, p.x - r, p.y) && inside(S.floor, p.x + r, p.y), id + ": " + p.script + " walks");
      }
      for (const e of S.exits || []) assert(K.scenes[e.to] && inside(K.scenes[e.to].floor, e.x, e.y), id + " to " + e.to);
      for (const th of S.things || []) assert(here(th.image), th.image);
    }
    for (const f of Object.values(window.REALM_FOES)) if (f.street) assert(here("assets/kamurocho/people/" + f.street + ".png"), f.name);
    assert(K.scenes.street.exits.some((e) => e.to === "backlot" && e.spot) && !K.scenes.street.exits.some((e) => e.to === "sewer"), "Serena's backlot, off the street");
    assert(K.scenes.backlot.exits.some((e) => e.to === "sewer") && K.scenes.sewer.exits.some((e) => e.to === "backlot") && !K.scenes.backlot.encounters, "the backlot's manhole");
    // (every scene reached from the sewer, and back; the gangs' foes each with a walk if it's said to have one, and
    // something to say; no fights off the streets)
    const reach = (from) => { const seen = new Set([from]), todo = [from]; while (todo.length) for (const e of K.scenes[todo.pop()].exits || []) if (!seen.has(e.to)) { seen.add(e.to); todo.push(e.to); } return seen; };
    for (const id of Object.keys(K.scenes)) assert(reach(K.arrive.scene).has(id) && reach(id).has(K.arrive.scene), id + " is reached, and left");
    for (const f of K.foeWalks) assert(here("assets/kamurocho/people/" + f + "_walk.png"), f + "'s walk");
    for (const [, foes] of window.REALM_ENCOUNTERS.Kamurocho.groups) assert(K.barks[foes[0]] && K.barks[foes[0]].length, foes[0] + "'s bark");
    for (const id of ["alley", "backlot", "sewer", "poppo", "bacchus", "champion", "nakamichi-alley", "pink-alley", "theater-alley"]) assert(!K.scenes[id].encounters, id + ": no fights");
    for (const id of ["street", "taihei", "tenkaichi", "nakamichi", "pink", "theater", "showa", "senryo", "hotels", "shichifuku"]) assert(K.scenes[id].encounters, id + ": its gangs");
    // (each picture as wide and as high as its scene says; Taihei Boulevard's road below its pavement, walked on)
    const size = (f) => { const b = fs.readFileSync(require("path").join(__dirname, "..", f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    for (const [id, S] of Object.entries(K.scenes)) assert.deepStrictEqual(size(S.image), [S.width, S.height || 480], id + "'s size");
    assert(inside(K.scenes.taihei.floor, 800, 590), "Taihei Boulevard's road");
    // (the karaoke box: its spot, and each song's words within its bars, each line done before the next, a
    // syllable a note)
    assert(K.scenes.theater.spots.some((sp) => sp.script === "Kamurocho_Karaoke"), "the karaoke box");
    for (const song of window.KARAOKE_SONGS) {
      let end = 0;
      for (const [start, syl] of song.lines) {
        assert(start >= end && start >= song.intro * 4, song.id + ": its lines in turn");
        end = start + syl.reduce((t, [w, midi, len]) => (assert(typeof w === "string" && midi >= 40 && midi <= 96 && len > 0, song.id + ": " + w), t + len), 0);
      }
      assert(end <= song.chords.length * 4 && song.chords.every(([r, q]) => r > 0 && ["maj", "min", "7"].includes(q)), song.id + ": its bars");
    }
  }
  // (And each has its looks: parts that are drawn, and skins that are colours.)
  const skins = window.LOOK_COLOURS.skin.map((c) => c[0]);
  for (const r of window.REALM_RACES) {
    assert(r.looks, r.id);
    const P = window.PLAYER_LOOK_PARTS, part = (p) => P[p] && fs.existsSync(require("path").join(__dirname, "..", "assets/world/sprites/looks", p + ".png"));
    for (const p of r.looks.bodies) assert(part(p), r.id + ": " + p);
    for (const h of r.looks.heads || []) assert(part(h + "_face"), r.id + ": " + h);
    for (const s of r.looks.skin) assert(skins.includes(s), r.id + ": " + s);
    for (const b of Object.keys(r.looks.bodyLabels || {})) assert(r.looks.bodies.includes(b), r.id + ": " + b);
    // (a character cut in three: its body says where its head is, in each of its 15 frames, its face and hair where
    // theirs is; each face's hairstyles are parts, its own among them)
    for (const b of r.looks.bodies) {
      if (P[b].kind === "whole") continue;
      assert(P[b].kind === "body" && P[b].headAt && P[b].headAt.length === 15, b + "'s neck");
      const F = P[b + "_face"];
      if (!F && r.looks.heads) continue;   // (Hyrule's bodies, with no heads of their own: they take its heads)
      assert(F && F.kind === "face" && F.ref.length === 15 && F.family === P[b].family, b + "'s face");
      for (const h of F.hairs) assert(h === "" || (P[h] && P[h].kind === "hair"), b + ": " + h);
      assert(F.hairs.includes(P[b + "_hair"] ? b + "_hair" : ""), b + " takes its own hair");
    }
    if (r.looks.start) for (const k of ["body", "face", "hairstyle"]) assert(!r.looks.start[k] || P[r.looks.start[k]], r.id + "'s start: " + k);
  }
  // (Every race has a man and a woman among its presets, each preset's parts there to be drawn, its colours colours.)
  {
    const P = window.PLAYER_LOOK_PARTS, C = window.LOOK_COLOURS, ids = (k) => C[k].map((c) => c[0]);
    for (const r of window.REALM_RACES) {
      const L = r.looks, pr = L.bodies.filter((b) => P[b].kind === "whole" || P[b + "_face"]).map((b) => ({ body: b, gender: (L.female || []).includes(b) ? "female" : "male" })).concat(L.presets || []);
      for (const g of ["male", "female"]) assert(pr.some((p) => p.gender === g), r.id + " has a " + g + " preset");
      for (const p of L.presets || []) {
        assert(["male", "female"].includes(p.gender) && P[p.body] && (!p.face || P[p.face].kind === "face") && (!p.hairstyle || P[p.hairstyle].kind === "hair"), r.id + ": " + p.name);
        if (p.face && p.hairstyle !== undefined) assert(P[p.face].hairs.includes(p.hairstyle || ""), p.name + "'s hair fits its face");
        if (p.face) assert(P[p.face].family === P[p.body].family, p.name + ": one family");
        for (const k of ["hair", "outfit", "trim"]) assert(!p[k] || ids(k === "hair" ? "hair" : "cloth").includes(p[k]), p.name + ": " + k);
        assert(!p.skin || L.skin.includes(p.skin), p.name + ": skin");
      }
    }
  }
  // (The colours: each four shades, darkest first, its id once in its list; a good many of each, and seven skins or
  // more for every race.)
  {
    const C = window.LOOK_COLOURS, lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
    for (const k of ["hair", "cloth", "skin"]) {
      assert(new Set(C[k].map((c) => c[0])).size === C[k].length && C[k].length >= 25, k + ": its colours");
      for (const c of C[k]) assert(c.length === 6 && c.slice(2).every((h, i, a) => /^#[0-9a-f]{6}$/.test(h) && (!i || lum(h) > lum(a[i - 1]))), k + ": " + c[0]);
    }
    for (const r of window.REALM_RACES) assert(r.looks.skin.length >= 7, r.id + "'s skins");
    // (the Frieza Clan's and the Kais' women have heads of their own race's, made for them, in the Face row)
    const P = window.PLAYER_LOOK_PARTS;
    for (const [id, head] of [["arcosian", "arcosian_woman"], ["kai", "kai_woman"]]) {
      const L = window.REALM_RACES.find((r) => r.id === id).looks, w = L.presets.find((p) => p.gender === "female");
      assert(L.heads.includes(head) && w.face === head + "_face" && P[w.face].family === P[w.body].family && P[w.face].ref.length === 15, id + "'s woman");
    }
  }
  // (Android 20 is Dr. Gero, not Mr. Popo; the Frieza Clan by that name)
  assert.strictEqual(window.REALM_RACES.find((r) => r.id === "arcosian").name, "Frieza Clan");
  console.log("ok: realm battles, 60 of Kamurocho's fights finished (" + turns + " turns)");
}
