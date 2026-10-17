// Brings in Generation 9: the Paldea Pokémon (#906-1025, Sprigatito to
// Pecharunt), the Paldean forms and the forms Gen 9's Pokémon come in, from
// @pkmn/dex (Pokémon Showdown's data, Gen 9), and Legends: Z-A's Mega
// Evolutions (and their Mega Stones), with PokeAPI's CSVs for what Showdown
// hasn't got (catch rate, egg steps, Exp. yield, EV yield, friendship,
// growth rate and the IDs the sprites are filed under):
//
//   node tools/build-gen9.js <folder with PokeAPI's data/v2/csv/*.csv>
//   (pokemon, pokemon_species, pokemon_stats, growth_rates);
//   it leaves gen9-sprites.json there for tools/fetch-gen7-sprites.js
//
// Writes:
//   data/dex-gen9.js        window.DEX's new entries, in data/dex.js's shape;
//                           the Megas (and Floette's Eternal Flower, which Mega
//                           Evolves) learn their species' moves
//   data/learnsets-gen9.js  their LEARNSETS_GEN6 (Scarlet and Violet's level-up,
//                           TM, tutor and Egg moves), for the moves this game has
//   data/moves-gen9.js      the moves Gen 9 added, in data/moves.js's shape
//   data/items-gen9.js      Legends: Z-A's Mega Stones, each with `megaStone`:
//                           { species: its Mega }, the way engine/battle.js reads them
//
// Forms: the Paldean Tauros (Combat, Blaze, Aqua) and Wooper, Bloodmoon
// Ursaluna, Oinkologne's female, Maushold's Family of Four, Squawkabilly's
// plumages, Palafin's Hero, Tatsugiri's Droopy and Stretchy, Dudunsparce's
// Three-Segment, Gimmighoul's Roaming, Ogerpon's masks and Terapagos's
// Terastal Form. Not: the Tera formes (Ogerpon's Tera masks, Stellar
// Terapagos: there's no Terastallizing here), Koraidon's and Miraidon's
// travel modes, Poltchageist's and Sinistcha's Artisan and Masterpiece
// (they look the same). Megas: the 47 Legends: Z-A and its Mega Dimension
// added (Mega Zygarde was already in, tools/build-extra-forms.js), not Mega
// Magearna's Original Color. Floettite works for any Floette, the Eternal
// Flower being out of reach.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Dex } = require("@pkmn/dex");

const csvDir = process.argv[2];
if (!csvDir || !fs.existsSync(path.join(csvDir, "pokemon.csv"))) {
  console.error("Usage: node tools/build-gen9.js <PokeAPI csv folder>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/dex.js", "data/dex-gen7.js", "data/dex-gen8.js", "data/moves.js", "data/moves-gen7.js", "data/moves-gen8.js",
  "data/learnsets.js", "data/learnsets-gen7.js", "data/learnsets-gen8.js", "data/dex-forms.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
}
const OLD_MOVES = Object.assign({}, window.MOVES);
// (This game's TMs and HMs: a Gen 9 machine move only counts if it's one here.)
for (const f of ["data/items.js", "game/bag.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const MACHINE_MOVES = new Set(window.Bag.machines().map(window.Bag.machineMove));

const gen9 = Dex.forGen(9);
// (Showdown writes Farfetch’d with a curly apostrophe; this game, straight.)
const ourName = (s) => s.replace(/’/g, "'");

// ---------- PokeAPI ----------
function csv(name) {
  const text = fs.readFileSync(path.join(csvDir, name + ".csv"), "utf8").trim();
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  row.push(field); rows.push(row);
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const pokemon = csv("pokemon"), species = csv("pokemon_species"), statRows = csv("pokemon_stats"), growth = csv("growth_rates");
const pokemonBy = Object.fromEntries(pokemon.map((p) => [p.identifier, p]));
const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
const growthName = { slow: "Slow", medium: "Medium Fast", fast: "Fast", "medium-slow": "Medium Slow",
  "slow-then-very-fast": "Erratic", "fast-then-very-slow": "Fluctuating" };
const growthById = Object.fromEntries(growth.map((g) => [g.id, growthName[g.identifier]]));
const STAT = { 1: "hp", 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe" };
const evYield = {};
for (const r of statRows) if (+r.effort) (evYield[r.pokemon_id] = evYield[r.pokemon_id] || {})[STAT[r.stat_id]] = +r.effort;
const GENDER = { "-1": "Genderless", 0: "100% Male", 1: "87.5% Male / 12.5% Female", 2: "75% Male / 25% Female",
  4: "50% Male / 50% Female", 6: "25% Male / 75% Female", 8: "100% Female" };
// PokeAPI's identifier: Showdown's name in lower case, hyphenated.
const apiID = (s) => s.toLowerCase().replace(/[’'.:]/g, "").replace(/ /g, "-");
// PokeAPI's identifiers where they aren't Showdown's name.
const POKEAPI_FOR = {
  "Tauros-Paldea-Combat": "tauros-paldea-combat-breed", "Tauros-Paldea-Blaze": "tauros-paldea-blaze-breed",
  "Tauros-Paldea-Aqua": "tauros-paldea-aqua-breed", Oinkologne: "oinkologne-male", "Oinkologne-F": "oinkologne-female",
  Maushold: "maushold-family-of-three", "Maushold-Four": "maushold-family-of-four", Squawkabilly: "squawkabilly-green-plumage",
  "Squawkabilly-Blue": "squawkabilly-blue-plumage", "Squawkabilly-Yellow": "squawkabilly-yellow-plumage",
  "Squawkabilly-White": "squawkabilly-white-plumage", Palafin: "palafin-zero", Tatsugiri: "tatsugiri-curly",
  Dudunsparce: "dudunsparce-two-segment", "Dudunsparce-Three-Segment": "dudunsparce-three-segment",
  "Ogerpon-Wellspring": "ogerpon-wellspring-mask", "Ogerpon-Hearthflame": "ogerpon-hearthflame-mask",
  "Ogerpon-Cornerstone": "ogerpon-cornerstone-mask", "Meowstic-M-Mega": "meowstic-male-mega",
  "Meowstic-F-Mega": "meowstic-female-mega"
};

// ---------- Which ----------
const forms = [];   // Showdown names
for (const s of gen9.species.all()) {
  if (!s.exists || s.num < 906 || s.num > 1025 || s.isNonstandard || s.forme) continue;
  forms.push(s.name);
}
forms.push("Tauros-Paldea-Combat", "Tauros-Paldea-Blaze", "Tauros-Paldea-Aqua", "Wooper-Paldea", "Ursaluna-Bloodmoon", "Oinkologne-F",
  "Maushold-Four", "Squawkabilly-Blue", "Squawkabilly-Yellow", "Squawkabilly-White", "Palafin-Hero", "Tatsugiri-Droopy", "Tatsugiri-Stretchy",
  "Dudunsparce-Three-Segment", "Gimmighoul-Roaming", "Ogerpon-Wellspring", "Ogerpon-Hearthflame", "Ogerpon-Cornerstone", "Terapagos-Terastal");
// Legends: Z-A's Megas, and the form one of them comes from.
const MEGA_STONES = gen9.items.all().filter((i) => i.megaStone && i.isNonstandard === "Future" && i.id !== "zygardite");
const megas = [];
for (const it of MEGA_STONES) for (const [from, mega] of Object.entries(it.megaStone)) {
  if (/Original/.test(from)) continue;
  megas.push(mega);
}
forms.push("Floette-Eternal");
// A form whose moves are its species' (the Megas, the Eternal Flower): our name -> the species'.
const SAME_MOVES = { "Floette-Eternal": "Floette" };

const dexOut = {}, learnOut = {}, sprites = {};   // sprites: our ID -> PokeAPI's sprite file name
function add(sdName, opts) {
  const s = gen9.species.get(sdName);
  if (!s.exists) throw new Error("No such species: " + sdName);
  const ours = ourName(s.name);
  const api = pokemonBy[POKEAPI_FOR[s.name] || apiID(s.name)];
  if (!api) throw new Error("No PokeAPI pokemon for " + s.name);
  const sp = speciesById[api.species_id];
  const base = opts.base && window.DEX[opts.base];
  const a = s.abilities;
  const entry = {
    id: +api.id, types: s.types.slice(),
    abilities: [a[0], a[1]].filter(Boolean),
    hiddenAbility: a.H || a.S || undefined,
    captureRate: +sp.capture_rate, baseEggSteps: +sp.hatch_counter * 256,
    hp: s.baseStats.hp, atk: s.baseStats.atk, def: s.baseStats.def, spa: s.baseStats.spa, spd: s.baseStats.spd, spe: s.baseStats.spe,
    // (PokeAPI has no Exp. or EV yield for Legends: Z-A's Megas yet: their species'.)
    baseExp: +api.base_experience || (base ? base.baseExp : 0), height: +api.height / 10, weight: +api.weight / 10,
    evYield: evYield[api.id] || (base ? base.evYield : {}), baseFriendship: +sp.base_happiness,
    gender: GENDER[sp.gender_rate], expGroup: growthById[sp.growth_rate_id], gen: base ? base.gen : 9
  };
  // (A Mega has only its one Ability.)
  if (opts.mega) { entry.abilities = [a[0]]; delete entry.hiddenAbility; }
  if (!entry.hiddenAbility) delete entry.hiddenAbility;
  dexOut[ours] = entry;
  sprites[entry.id] = String(api.id);
  return [ours, s];
}
const sources = {};
for (const n of forms) {
  const [ours, s] = add(n, { base: SAME_MOVES[n] });
  if (!SAME_MOVES[ours]) sources[ours] = s;
}
for (const n of megas) {
  const s = gen9.species.get(n);
  // (Our base: Meowstic's Megas are both Meowstic's; the others, the species the stone is for.)
  const from = MEGA_STONES.map((it) => Object.entries(it.megaStone).find(([, m]) => m === n)).find(Boolean)[0];
  const base = window.DEX[from] ? from : window.DEX[s.baseSpecies] ? s.baseSpecies : dexOut[from] ? from : null;
  if (!base && !dexOut[from]) throw new Error("No base for " + n);
  const [ours] = add(n, { mega: true, base: base || from });
  SAME_MOVES[ours] = base || from;
}

// ---------- Mega Stones ----------
const itemsOut = {};
for (const it of MEGA_STONES) {
  const map = {};
  for (const [from, mega] of Object.entries(it.megaStone)) if (!/Original/.test(from)) map[ourName(from)] = ourName(mega);
  // (The Eternal Flower can't be caught here: Floettite works for any Floette.)
  if (map["Floette-Eternal"]) map.Floette = map["Floette-Eternal"];
  const first = Object.keys(map)[0], mega = map[first];
  const megaName = "Mega " + first.replace(/-.*/, "") + (/-Mega-([XYZ])$/.exec(mega) ? " " + /-Mega-([XYZ])$/.exec(mega)[1] : "");
  const who = first === "Floette-Eternal" ? "an Eternal Flower Floette" : first.replace(/-.*/, "");
  // (Our IDs as PokeAPI's: "absolite-z", like "charizardite-x".)
  const id = it.id.replace(/ite([xyz])$/, "ite-$1");
  itemsOut[id] = {
    name: id, category: "mega-stones",
    effect: "Held: Allows " + who + " to Mega Evolve into " + megaName + ".", megaStone: map
  };
}

// ---------- Moves ----------
// Gen 9's new moves, in data/moves.js's shape (Showdown's data, renamed).
const KEEP = ["drain", "secondary", "boosts", "critRatio", "volatileStatus", "multihit", "callsMove", "self", "selfSwitch", "recoil",
  "ignoreDefensive", "ignoreEvasion", "forceSwitch", "sideCondition", "status", "stallingMove", "terrain", "selfdestruct",
  "pseudoWeather", "breaksProtect", "secondaries", "ohko", "overrideOffensivePokemon", "willCrit", "weather", "slotCondition",
  "hasCrashDamage", "overrideDefensiveStat", "thawsTarget", "sleepUsable", "multiaccuracy", "heal", "ignoreAbility",
  "selfBoost", "overrideOffensiveStat", "mindBlownRecoil", "smartTarget"];
function convertMove(m) {
  const out = { power: m.basePower, acc: m.accuracy === true ? null : m.accuracy, cat: m.category, type: m.type, pp: m.pp,
    priority: m.priority, target: m.target, flags: Object.assign({}, m.flags) };
  for (const k of KEEP) {
    if (m[k] == null || m[k] === false) continue;
    if (k === "critRatio" && m[k] === 1) continue;
    if (k === "secondaries" && m[k].length < 2) continue;
    out[k] = JSON.parse(JSON.stringify(m[k]));
  }
  if (out.secondary && !Object.keys(out.secondary).some((k) => k !== "chance")) delete out.secondary;
  out.desc = m.desc; out.shortDesc = m.shortDesc;
  out.gen = 9;   // (Metronome, a Gen 6 move here, leaves them out)
  return out;
}
const movesOut = {};
for (const m of gen9.moves.all()) {
  if (m.gen !== 9 || m.isMax || m.isZ || m.isNonstandard || OLD_MOVES[m.name]) continue;
  movesOut[m.name] = convertMove(m);
}
// (Psychic Noise's two turns without healing are data/battle-moves.js's, its own condition.)
delete movesOut["Psychic Noise"].secondary;
const known = (name) => OLD_MOVES[name] || movesOut[name];

// ---------- Learnsets ----------
async function learnsets() {
  for (const [ours, s] of Object.entries(sources)) {
    const ls = await gen9.learnsets.get(s.id);
    let data = ls && ls.learnset;
    // (A form with no moves of its own learns its base form's: Palafin's Hero, Terapagos's Terastal...)
    const baseName = s.changesFrom || s.battleOnly || s.baseSpecies;
    if (baseName && baseName !== s.name) {
      const base = gen9.species.get(Array.isArray(baseName) ? baseName[0] : baseName);
      const b = await gen9.learnsets.get(base.id);
      const levels = data && Object.values(data).some((how) => how.some((h) => h[0] === "9" && h[1] === "L"));
      if (!levels && b) data = Object.assign({}, b.learnset, data || {});
    }
    if (!data) throw new Error("No learnset: " + ours);
    const out = { levelup: [], tm: [], tutor: [], egg: [] };
    for (const [id, how] of Object.entries(data)) {
      const m = gen9.moves.get(id);
      if (!m.exists || !known(m.name)) continue;
      for (const h of how) {
        if (h[0] !== "9") continue;
        if (h[1] === "L") out.levelup.push([Math.max(1, +h.slice(2)), m.name]);
        else if (h[1] === "M" && MACHINE_MOVES.has(m.name) && !out.tm.includes(m.name)) out.tm.push(m.name);
        else if (h[1] === "T" && !out.tutor.includes(m.name)) out.tutor.push(m.name);
        else if (h[1] === "E" && !out.egg.includes(m.name)) out.egg.push(m.name);
      }
    }
    out.levelup.sort((x, y) => x[0] - y[0]);
    for (const k of ["tm", "tutor", "egg"]) out[k].sort();
    if (!out.levelup.length) throw new Error("No level-up moves: " + ours);
    learnOut[ours] = out;
  }
}

learnsets().then(() => {
  const header = (what) => "// Auto-generated by tools/build-gen9.js from @pkmn/dex (Gen 9) and PokeAPI. Do not edit by hand.\n// " + what + "\n";
  const ser = (o) => "{\n" + Object.entries(o).map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n}";
  const byId = Object.fromEntries(Object.entries(dexOut).sort((a, b) => a[1].id - b[1].id));
  fs.writeFileSync(path.join(root, "data/dex-gen9.js"), header("Generation 9's Pokémon and forms, and Legends: Z-A's Megas, added to window.DEX.") +
    "Object.assign(window.DEX, " + ser(byId) + ");\n" +
    "// (The Megas, and the Eternal Flower, learn their species' moves.)\n" +
    "for (const [form, base] of Object.entries(" + JSON.stringify(SAME_MOVES) + ")) window.LEARNSETS_GEN6[form] = window.LEARNSETS_GEN6[base];\n");
  fs.writeFileSync(path.join(root, "data/learnsets-gen9.js"), header("Their moves, added to window.LEARNSETS_GEN6.") +
    "Object.assign(window.LEARNSETS_GEN6, " + ser(learnOut) + ");\n");
  fs.writeFileSync(path.join(root, "data/moves-gen9.js"), header("The moves Generation 9 added, added to window.MOVES.") +
    "Object.assign(window.MOVES, " + ser(movesOut) + ");\n");
  fs.writeFileSync(path.join(root, "data/items-gen9.js"), header("Legends: Z-A's Mega Stones, added to window.ITEMS (megaStone: species -> its Mega).") +
    "Object.assign(window.ITEMS, " + ser(itemsOut) + ");\n");
  fs.writeFileSync(path.join(csvDir, "gen9-sprites.json"), JSON.stringify(sprites));
  console.log("wrote data/dex-gen9.js (" + Object.keys(dexOut).length + " Pokémon and forms, " + megas.length + " Megas), data/learnsets-gen9.js, data/moves-gen9.js (" +
    Object.keys(movesOut).length + " moves), data/items-gen9.js (" + Object.keys(itemsOut).length + " Mega Stones)");
});
