// Brings in Generation 8: the Galar Pokémon (#810-898, Grookey to Calyrex),
// the Galarian forms, and the forms they battle in, from @pkmn/dex (Pokémon
// Showdown's data, Gen 8), and Legends: Arceus's (#899-905, Wyrdeer to
// Enamorus, and the Hisuian forms) from its Gen 9 data (Scarlet and Violet
// are where they battle), with PokeAPI's CSVs for what Showdown hasn't got
// (catch rate, egg steps, Exp. yield, EV yield, friendship, growth rate and
// the IDs the sprites are filed under):
//
//   node tools/build-gen8.js <folder with PokeAPI's data/v2/csv/*.csv>
//   (pokemon, pokemon_species, pokemon_stats, pokemon_forms, growth_rates);
//   it leaves gen8-sprites.json there for tools/fetch-gen7-sprites.js
//
// Writes:
//   data/dex-gen8.js        window.DEX's new entries, in data/dex.js's shape
//   data/learnsets-gen8.js  their LEARNSETS_GEN6 (Sword and Shield's level-up,
//                           TM, tutor and Egg moves; Scarlet and Violet's for
//                           the Hisuian ones), for the moves this game has
//   data/moves-gen8.js      the moves Gen 8 added (Sword and Shield's, not the
//                           Max Moves; Legends: Arceus's as Scarlet and
//                           Violet have them), in data/moves.js's shape
//
// Forms: the Galarian forms (Meowth to Stunfisk, Darmanitan's Zen Mode too);
// Toxtricity's Low Key; Cramorant's Gulping and Gorging; Eiscue's Noice Face;
// Indeedee's female; Morpeko's Hangry Mode; Zacian's and Zamazenta's Crowned;
// Urshifu's Rapid Strike; Calyrex's Ice and Shadow Riders; the Hisuian forms;
// Basculin's White-Striped; Basculegion's female; Enamorus's Therian. Not:
// Gigantamax, Eternamax, Alcremie's flavours, Sinistea's Antique, Zarude's
// Dada, Pikachu's World Cap, Dialga's and Palkia's Origin.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Dex } = require("@pkmn/dex");

const csvDir = process.argv[2];
if (!csvDir || !fs.existsSync(path.join(csvDir, "pokemon.csv"))) {
  console.error("Usage: node tools/build-gen8.js <PokeAPI csv folder>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/dex.js", "data/dex-gen7.js", "data/moves.js", "data/moves-gen7.js", "data/learnsets.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
}
const OLD_MOVES = Object.assign({}, window.MOVES);
// (This game's TMs and HMs: a Gen 8 machine move only counts if it's one here.)
for (const f of ["data/items.js", "game/bag.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const MACHINE_MOVES = new Set(window.Bag.machines().map(window.Bag.machineMove));

const gen8 = Dex.forGen(8), gen9 = Dex.forGen(9);
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
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

// ---------- Which ----------
// [Showdown's name, the @pkmn/dex generation it comes from]
const forms = [];
for (const s of gen8.species.all()) {
  if (!s.exists || s.num < 810 || s.num > 898 || s.isNonstandard || s.forme) continue;
  forms.push([s.name, gen8]);
}
const GALAR = ["Meowth", "Ponyta", "Rapidash", "Slowpoke", "Slowbro", "Slowking", "Farfetch’d", "Weezing", "Mr. Mime",
  "Articuno", "Zapdos", "Moltres", "Corsola", "Zigzagoon", "Linoone", "Darumaka", "Darmanitan", "Yamask", "Stunfisk"];
for (const n of GALAR) forms.push([n + "-Galar", gen8]);
for (const n of ["Darmanitan-Galar-Zen", "Toxtricity-Low-Key", "Cramorant-Gulping", "Cramorant-Gorging", "Eiscue-Noice",
  "Indeedee-F", "Morpeko-Hangry", "Zacian-Crowned", "Zamazenta-Crowned", "Urshifu-Rapid-Strike", "Calyrex-Ice", "Calyrex-Shadow"]) forms.push([n, gen8]);
for (const s of gen9.species.all()) {
  if (!s.exists || s.num < 899 || s.num > 905 || s.isNonstandard || s.forme) continue;
  forms.push([s.name, gen9]);
}
const HISUI = ["Growlithe", "Arcanine", "Voltorb", "Electrode", "Typhlosion", "Qwilfish", "Sneasel", "Samurott", "Lilligant",
  "Zorua", "Zoroark", "Braviary", "Sliggoo", "Goodra", "Avalugg", "Decidueye"];
for (const n of HISUI) forms.push([n + "-Hisui", gen9]);
forms.push(["Basculin-White-Striped", gen9], ["Basculegion-F", gen9], ["Enamorus-Therian", gen9]);
// PokeAPI's identifiers where they aren't Showdown's name.
const POKEAPI_FOR = { Toxtricity: "toxtricity-amped", Eiscue: "eiscue-ice", Indeedee: "indeedee-male", "Indeedee-F": "indeedee-female",
  Morpeko: "morpeko-full-belly", Urshifu: "urshifu-single-strike", "Darmanitan-Galar": "darmanitan-galar-standard",
  Basculegion: "basculegion-male", "Basculegion-F": "basculegion-female", Enamorus: "enamorus-incarnate" };

const dexOut = {}, learnOut = {}, sprites = {};   // sprites: our ID -> PokeAPI's sprite file name
const sources = {};   // our name -> [Showdown species, its dex]
for (const [sdName, dex] of forms) {
  const s = dex.species.get(sdName);
  if (!s.exists) throw new Error("No such species: " + sdName);
  const ours = ourName(s.name);
  const api = pokemonBy[POKEAPI_FOR[s.name] || apiID(s.name)];
  if (!api) throw new Error("No PokeAPI pokemon for " + s.name);
  const sp = speciesById[api.species_id];
  const a = s.abilities;
  const entry = {
    id: +api.id, types: s.types.slice(),
    abilities: [a[0], a[1]].filter(Boolean),
    hiddenAbility: a.H || a.S || undefined,
    captureRate: +sp.capture_rate, baseEggSteps: +sp.hatch_counter * 256,
    hp: s.baseStats.hp, atk: s.baseStats.atk, def: s.baseStats.def, spa: s.baseStats.spa, spd: s.baseStats.spd, spe: s.baseStats.spe,
    baseExp: +api.base_experience || 0, height: +api.height / 10, weight: +api.weight / 10,
    evYield: evYield[api.id] || {}, baseFriendship: +sp.base_happiness,
    gender: GENDER[sp.gender_rate], expGroup: growthById[sp.growth_rate_id], gen: 8
  };
  if (!entry.hiddenAbility) delete entry.hiddenAbility;
  dexOut[ours] = entry;
  sprites[entry.id] = String(api.id);
  sources[ours] = [s, dex];
}

// ---------- Moves ----------
// Gen 8's new moves, in data/moves.js's shape (Showdown's data, renamed).
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
    // (Showdown fills in `secondaries` from `secondary`; only a move with
    // several, Triple Arrows, needs the list.)
    if (k === "secondaries" && m[k].length < 2) continue;
    out[k] = JSON.parse(JSON.stringify(m[k]));
  }
  if (out.secondary && !Object.keys(out.secondary).some((k) => k !== "chance")) delete out.secondary;
  out.desc = m.desc; out.shortDesc = m.shortDesc;
  out.gen = 8;   // (Metronome, a Gen 6 move here, leaves them out)
  return out;
}
const movesOut = {};
for (const m of gen8.moves.all()) {
  if (m.gen !== 8 || m.isMax || m.isZ || m.isNonstandard || OLD_MOVES[m.name]) continue;
  movesOut[m.name] = convertMove(m);
}
// Legends: Arceus's (#827-850), as Scarlet and Violet have them.
for (const m of gen9.moves.all()) {
  if (m.num < 827 || m.num > 850 || m.isNonstandard || OLD_MOVES[m.name]) continue;
  movesOut[m.name] = convertMove(m);
}
const known = (name) => OLD_MOVES[name] || movesOut[name];

// ---------- Learnsets ----------
async function learnsets() {
  for (const ours of Object.keys(dexOut)) {
    const [s, dex] = sources[ours];
    const g = dex === gen9 ? "9" : "8";
    const ls = await dex.learnsets.get(s.id);
    let data = ls && ls.learnset;
    // (A battle form with no moves of its own learns its base form's: Zacian
    // Crowned, Darmanitan's Zen Mode, Cramorant's, Eiscue's, Morpeko's.)
    const baseName = s.changesFrom || s.battleOnly || s.baseSpecies;
    if (baseName && baseName !== s.name) {
      const base = dex.species.get(Array.isArray(baseName) ? baseName[0] : baseName);
      const b = await dex.learnsets.get(base.id);
      const levels = data && Object.values(data).some((how) => how.some((h) => h[0] === g && h[1] === "L"));
      if (!levels && b) data = Object.assign({}, b.learnset, data || {});
    }
    if (!data) throw new Error("No learnset: " + ours);
    const out = { levelup: [], tm: [], tutor: [], egg: [] };
    for (const [id, how] of Object.entries(data)) {
      const m = dex.moves.get(id);
      if (!m.exists || !known(m.name)) continue;
      for (const h of how) {
        if (h[0] !== g) continue;
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
  const header = (what) => "// Auto-generated by tools/build-gen8.js from @pkmn/dex (Gen 8; Gen 9 for Legends: Arceus's) and PokeAPI. Do not edit by hand.\n// " + what + "\n";
  const ser = (o) => "{\n" + Object.entries(o).map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n}";
  const byId = Object.fromEntries(Object.entries(dexOut).sort((a, b) => a[1].id - b[1].id));
  fs.writeFileSync(path.join(root, "data/dex-gen8.js"), header("Generation 8's Pokémon and forms, added to window.DEX.") +
    "Object.assign(window.DEX, " + ser(byId) + ");\n");
  fs.writeFileSync(path.join(root, "data/learnsets-gen8.js"), header("Their moves, added to window.LEARNSETS_GEN6.") +
    "Object.assign(window.LEARNSETS_GEN6, " + ser(learnOut) + ");\n");
  fs.writeFileSync(path.join(root, "data/moves-gen8.js"), header("The moves Generation 8 added (not Max Moves), added to window.MOVES.") +
    "Object.assign(window.MOVES, " + ser(movesOut) + ");\n");
  // (For tools/fetch-gen7-sprites.js.)
  fs.writeFileSync(path.join(csvDir, "gen8-sprites.json"), JSON.stringify(sprites));
  console.log("wrote data/dex-gen8.js (" + Object.keys(dexOut).length + " Pokémon and forms), data/learnsets-gen8.js, data/moves-gen8.js (" +
    Object.keys(movesOut).length + " moves)");
});
