// Brings in Generation 7: the Alola Pokémon (#722-809), the Alolan forms of
// Kanto's, and the forms they battle in, from @pkmn/dex (Pokémon Showdown's
// data, Gen 7) and PokeAPI's CSVs (what Showdown hasn't got: catch rate, egg
// steps, Exp. yield, EV yield, friendship, growth rate and the form IDs the
// sprites are filed under):
//
//   node tools/build-gen7.js <folder with PokeAPI's data/v2/csv/*.csv>
//   (pokemon, pokemon_species, pokemon_stats, pokemon_forms, growth_rates);
//   it leaves gen7-sprites.json there for tools/fetch-gen7-sprites.js
//
// Writes:
//   data/dex-gen7.js        window.DEX's new entries, in data/dex.js's shape
//   data/learnsets-gen7.js  their LEARNSETS_GEN6 (Gen 7's level-up, TM, tutor
//                           and Egg moves, for the moves this game has)
//   data/moves-gen7.js      the moves Gen 7 added (not Z-Moves), in
//                           data/moves.js's shape
//
// Forms: Alolan Rattata to Marowak; Lycanroc's Midnight and Dusk; Oricorio's
// four dances; Wishiwashi's School; Minior (Meteor) and Minior-Core (this
// game's names: Shields Down turns the Meteor into the Core, its red one);
// Mimikyu-Busted; Silvally's seventeen types (RKS System and the Memories);
// Necrozma's Dusk Mane and Dawn Wings; Zygarde's 10% and Complete forms; and
// Greninja's Battle Bond and Ash forms. Not: Totems, Pikachu's caps,
// Minior's other cores, Ultra Necrozma. Meltan and Melmetal (Let's Go) use
// Gen 8's moves, as Gen 7's main games haven't got them.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { Dex } = require("@pkmn/dex");

const csvDir = process.argv[2];
if (!csvDir || !fs.existsSync(path.join(csvDir, "pokemon.csv"))) {
  console.error("Usage: node tools/build-gen7.js <PokeAPI csv folder>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/dex.js", "data/moves.js", "data/learnsets.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const OLD_MOVES = Object.assign({}, window.MOVES);
// (This game's TMs and HMs: a Gen 7 machine move only counts if it's one here.)
for (const f of ["data/items.js", "game/bag.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const MACHINE_MOVES = new Set(window.Bag.machines().map(window.Bag.machineMove));

const gen7 = Dex.forGen(7), gen8 = Dex.forGen(8);
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

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
const formRows = csv("pokemon_forms");
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

// ---------- Which ----------
// [our name, Showdown's name, PokeAPI identifier]
const forms = [];
for (const s of gen7.species.all()) {
  if (!s.exists || s.num < 722 || s.num > 807 || s.isNonstandard || s.forme) continue;
  forms.push([s.name, s.name, null]);
}
forms.push(["Meltan", "Meltan", "meltan"], ["Melmetal", "Melmetal", "melmetal"]);
const ALOLAN = ["Rattata", "Raticate", "Raichu", "Sandshrew", "Sandslash", "Vulpix", "Ninetales", "Diglett", "Dugtrio",
  "Meowth", "Persian", "Geodude", "Graveler", "Golem", "Grimer", "Muk", "Exeggutor", "Marowak"];
for (const n of ALOLAN) forms.push([n + "-Alola", n + "-Alola", toID(n) + "-alola"]);
forms.push(
  ["Lycanroc-Midnight", "Lycanroc-Midnight", "lycanroc-midnight"], ["Lycanroc-Dusk", "Lycanroc-Dusk", "lycanroc-dusk"],
  ["Oricorio-Pom-Pom", "Oricorio-Pom-Pom", "oricorio-pom-pom"], ["Oricorio-Pa'u", "Oricorio-Pa'u", "oricorio-pau"],
  ["Oricorio-Sensu", "Oricorio-Sensu", "oricorio-sensu"], ["Wishiwashi-School", "Wishiwashi-School", "wishiwashi-school"],
  ["Minior-Core", "Minior", "minior-red"], ["Mimikyu-Busted", "Mimikyu-Busted", "mimikyu-busted"],
  ["Necrozma-Dusk-Mane", "Necrozma-Dusk-Mane", "necrozma-dusk"], ["Necrozma-Dawn-Wings", "Necrozma-Dawn-Wings", "necrozma-dawn"],
  ["Zygarde-10%", "Zygarde-10%", "zygarde-10"], ["Zygarde-Complete", "Zygarde-Complete", "zygarde-complete"],
  ["Greninja-Bond", "Greninja-Bond", "greninja-battle-bond"], ["Greninja-Ash", "Greninja-Ash", "greninja-ash"]);
for (const t of ["Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying", "Ghost", "Grass", "Ground",
  "Ice", "Poison", "Psychic", "Rock", "Steel", "Water"]) forms.push(["Silvally-" + t, "Silvally-" + t, "silvally-" + t.toLowerCase()]);
// (Minior, out of battle and at more than half HP, is the Meteor.)
const SHOWDOWN_FOR = { Minior: "Minior-Meteor" };
const POKEAPI_FOR = { Minior: "minior-red-meteor", "Oricorio": "oricorio-baile", "Lycanroc": "lycanroc-midday",
  "Wishiwashi": "wishiwashi-solo", "Mimikyu": "mimikyu-disguised", "Type: Null": "type-null", "Tapu Koko": "tapu-koko",
  "Tapu Lele": "tapu-lele", "Tapu Bulu": "tapu-bulu", "Tapu Fini": "tapu-fini", "Jangmo-o": "jangmo-o", "Hakamo-o": "hakamo-o",
  "Kommo-o": "kommo-o", "Silvally": "silvally", "Necrozma": "necrozma", "Magearna": "magearna" };

const dexOut = {}, learnOut = {}, sprites = {};   // sprites: our ID -> PokeAPI's sprite file name
const sources = {};   // our name -> Showdown species (for learnsets)
for (const [ours, sdName, apiName] of forms) {
  const sdFull = SHOWDOWN_FOR[ours] || sdName;
  const dexGen = /^Mel/.test(ours) ? gen8 : gen7;
  const s = dexGen.species.get(sdFull);
  if (!s.exists) throw new Error("No such species: " + sdFull);
  const want = POKEAPI_FOR[ours] || apiName || toID(sdName);
  let api = pokemonBy[want] || pokemonBy[toID(sdName)], spriteName = api && api.id;
  // (A form that's only a PokeAPI form, Silvally's types: the base Pokémon's
  // numbers, an ID of its own, its sprites filed as "773-fighting".)
  let formId = null;
  if (!api) {
    const f = formRows.find((r) => r.identifier === want);
    if (!f) throw new Error("No PokeAPI pokemon for " + ours);
    api = pokemon.find((p) => p.id === f.pokemon_id);
    // (Numbered from 10500, clear of PokeAPI's Pokémon IDs: its form IDs
    // 10232-10248 are Hisuian Pokémon's there.)
    formId = 10500 + (+f.id - 10232);
    spriteName = api.id + "-" + f.form_identifier;
  }
  const sp = speciesById[api.species_id];
  const a = s.abilities;
  const entry = {
    id: formId || +api.id, types: s.types.slice(),
    abilities: [a[0], a[1]].filter(Boolean),
    hiddenAbility: a.H || a.S || undefined,
    captureRate: +sp.capture_rate, baseEggSteps: +sp.hatch_counter * 256,
    hp: s.baseStats.hp, atk: s.baseStats.atk, def: s.baseStats.def, spa: s.baseStats.spa, spd: s.baseStats.spd, spe: s.baseStats.spe,
    baseExp: +api.base_experience || 0, height: +api.height / 10, weight: +api.weight / 10,
    evYield: evYield[api.id] || {}, baseFriendship: +sp.base_happiness,
    gender: GENDER[sp.gender_rate], expGroup: growthById[sp.growth_rate_id], gen: 7
  };
  if (!entry.hiddenAbility) delete entry.hiddenAbility;
  dexOut[ours] = entry;
  sprites[entry.id] = String(spriteName);
  sources[ours] = s;
}

// ---------- Moves ----------
// Gen 7's new moves, in data/moves.js's shape (Showdown's data, renamed).
const KEEP = ["drain", "secondary", "boosts", "critRatio", "volatileStatus", "multihit", "callsMove", "self", "selfSwitch", "recoil",
  "ignoreDefensive", "ignoreEvasion", "forceSwitch", "sideCondition", "status", "stallingMove", "terrain", "selfdestruct",
  "pseudoWeather", "breaksProtect", "secondaries", "ohko", "overrideOffensivePokemon", "willCrit", "weather", "slotCondition",
  "hasCrashDamage", "overrideDefensiveStat", "thawsTarget", "sleepUsable", "multiaccuracy", "heal", "ignoreAbility",
  "selfBoost", "overrideOffensiveStat"];
function convertMove(m) {
  const out = { power: m.basePower, acc: m.accuracy === true ? null : m.accuracy, cat: m.category, type: m.type, pp: m.pp,
    priority: m.priority, target: m.target, flags: Object.assign({}, m.flags) };
  for (const k of KEEP) {
    if (m[k] == null || m[k] === false) continue;
    if (k === "critRatio" && m[k] === 1) continue;
    if (k === "secondaries") continue;
    out[k] = JSON.parse(JSON.stringify(m[k]));
  }
  if (out.secondary && !Object.keys(out.secondary).some((k) => k !== "chance")) delete out.secondary;
  out.desc = m.desc; out.shortDesc = m.shortDesc;
  out.gen = 7;   // (Metronome, a Gen 6 move here, leaves them out)
  return out;
}
const movesOut = {};
for (const m of gen7.moves.all()) {
  if (m.num <= 621 || m.isZ || m.isNonstandard || OLD_MOVES[m.name]) continue;
  movesOut[m.name] = convertMove(m);
}
const db = gen8.moves.get("Double Iron Bash");   // (Melmetal's, from Let's Go)
movesOut[db.name] = convertMove(db);
const known = (name) => OLD_MOVES[name] || movesOut[name];

// ---------- Learnsets ----------
async function learnsets() {
  for (const [ours] of forms) {
    const s = sources[ours];
    const isMel = /^Mel/.test(ours);
    const ls = await (isMel ? gen8 : gen7).learnsets.get(s.id);
    let data = ls && ls.learnset;
    // (A form with no level-up moves of its own learns its base form's too:
    // Showdown keeps those on the base, Necrozma's and Zygarde's.)
    const baseName = s.changesFrom || s.battleOnly || s.baseSpecies;
    if (baseName && baseName !== s.name) {
      const base = (isMel ? gen8 : gen7).species.get(baseName);
      const b = await (isMel ? gen8 : gen7).learnsets.get(base.id);
      const levels = data && Object.values(data).some((how) => how.some((h) => /^[78]L/.test(h)));
      if (!levels && b) data = Object.assign({}, b.learnset, data || {});
    }
    if (!data) throw new Error("No learnset: " + ours);
    const g = isMel ? "8" : "7";
    const out = { levelup: [], tm: [], tutor: [], egg: [] };
    for (const [id, how] of Object.entries(data)) {
      const m = (isMel ? gen8 : gen7).moves.get(id);
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
    learnOut[ours] = out;
  }
}

learnsets().then(() => {
  const header = (what) => "// Auto-generated by tools/build-gen7.js from @pkmn/dex (Gen 7) and PokeAPI. Do not edit by hand.\n// " + what + "\n";
  const ser = (o) => "{\n" + Object.entries(o).map(([k, v]) => "  " + JSON.stringify(k) + ": " + JSON.stringify(v)).join(",\n") + "\n}";
  const byId = Object.fromEntries(Object.entries(dexOut).sort((a, b) => a[1].id - b[1].id));
  fs.writeFileSync(path.join(root, "data/dex-gen7.js"), header("Generation 7's Pokémon and forms, added to window.DEX.") +
    "Object.assign(window.DEX, " + ser(byId) + ");\n");
  fs.writeFileSync(path.join(root, "data/learnsets-gen7.js"), header("Their moves, added to window.LEARNSETS_GEN6.") +
    "Object.assign(window.LEARNSETS_GEN6, " + ser(learnOut) + ");\n");
  fs.writeFileSync(path.join(root, "data/moves-gen7.js"), header("The moves Generation 7 added (not Z-Moves), added to window.MOVES.") +
    "Object.assign(window.MOVES, " + ser(movesOut) + ");\n");
  // (For tools/fetch-gen7-sprites.js.)
  fs.writeFileSync(path.join(csvDir, "gen7-sprites.json"), JSON.stringify(sprites));
  console.log("wrote data/dex-gen7.js (" + Object.keys(dexOut).length + " Pokémon and forms), data/learnsets-gen7.js, data/moves-gen7.js (" +
    Object.keys(movesOut).length + " moves)");
});
