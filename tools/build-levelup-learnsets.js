// Builds data/learnsets-levelup.js: every Pokémon's level-up moves as
// Scarlet and Violet have them (with The Teal Mask and The Indigo Disk), or,
// for one that isn't in them, as the latest game it's in has them (Legends:
// Arceus, Brilliant Diamond and Shining Pearl, Sword and Shield, Let's Go,
// Ultra Sun and Ultra Moon, ... by PokeAPI's version-group order). It
// replaces the levelup list of each species in window.LEARNSETS_GEN6 (the
// TM, tutor and egg lists stay as they are).
//
//   node tools/build-levelup-learnsets.js <PokeAPI csv folder>
//     (pokemon_moves.csv, version_groups.csv, move_names.csv from
//     PokeAPI/pokeapi data/v2/csv)
//
// Level 0 is a move learned on evolving (Charizard's Air Slash), as the
// games list it; level 1 moves keep the games' order. A form with no
// level-up moves of its own in PokeAPI takes its base species'. Moves this
// game hasn't got are left out (the tool lists them).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, "pokemon_moves.csv"))) {
  console.error("Usage: node tools/build-levelup-learnsets.js <PokeAPI csv folder>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
// (The data as the game loads it, in index.html's order, up to this file.)
for (const [, f] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="(data\/[^"]+)"><\/script>/g)) {
  if (f === "data/learnsets-levelup.js") break;
  vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), { filename: f });
}
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

function csv(name) {
  const [head, ...lines] = fs.readFileSync(path.join(dir, name), "utf8").trim().split(/\r?\n/);
  const keys = head.split(",");
  return lines.map((l) => { const v = l.split(","); return Object.fromEntries(keys.map((k, i) => [k, v[i]])); });
}

// Scarlet and Violet (and its DLC) first; then the latest game.
const SV = new Set(["25", "26", "27"]);
const groups = csv("version_groups.csv");
const groupOrder = Object.fromEntries(groups.map((g) => [g.id, +g.order]));
const groupName = Object.fromEntries(groups.map((g) => [g.id, g.identifier]));

// Move names (English) -> this game's.
const ourMove = {};
for (const k of Object.keys(window.MOVES)) ourMove[toID(k)] = k;
const ALIAS = { vicegrip: "visegrip", visegrip: "vicegrip", highjumpkick: "hijumpkick", hijumpkick: "highjumpkick" };
const moveName = {};
for (const r of csv("move_names.csv")) if (r.local_language_id === "9") moveName[r.move_id] = r.name;
const missing = {};
function our(moveId) {
  const name = moveName[moveId] || ("#" + moveId);
  const k = ourMove[toID(name)] || ourMove[ALIAS[toID(name)]];
  if (!k) missing[name] = (missing[name] || 0) + 1;
  return k || null;
}

// pokemon_id -> version group -> [[level, order, move_id]]
const byMon = {};
for (const r of csv("pokemon_moves.csv")) {
  if (r.pokemon_move_method_id !== "1") continue;
  ((byMon[r.pokemon_id] || (byMon[r.pokemon_id] = {}))[r.version_group_id] || (byMon[r.pokemon_id][r.version_group_id] = [])).push([+r.level, r.order ? +r.order : 0, r.move_id]);
}
function pick(id) {
  const g = byMon[id];
  if (!g) return null;
  const sv = Object.keys(g).filter((v) => SV.has(v));
  if (sv.length) return { groups: sv, rows: sv.flatMap((v) => g[v]) };
  const latest = Object.keys(g).sort((a, b) => groupOrder[b] - groupOrder[a])[0];
  return { groups: [latest], rows: g[latest] };
}

// This game's own additions, kept through every rebuild: Charmander,
// Charmeleon and Charizard still learn Metal Claw at 13, as in FireRed, for
// Brock's Rock types.
const EXTRA = { Charmander: [[13, "Metal Claw"]], Charmeleon: [[13, "Metal Claw"]], Charizard: [[13, "Metal Claw"]] };

const out = {}, source = {}, kept = [];
// (A form that shares its base species' learnset, as Gigantamax ones do, gets it from there.)
const owner = new Map();
for (const species of Object.keys(window.LEARNSETS_GEN6)) {
  const set = window.LEARNSETS_GEN6[species];
  if (!owner.has(set) || window.DEX[species] && window.DEX[owner.get(set)] && window.DEX[species].id < window.DEX[owner.get(set)].id) owner.set(set, species);
}
for (const species of Object.keys(window.LEARNSETS_GEN6).sort()) {
  if (owner.get(window.LEARNSETS_GEN6[species]) !== species) continue;
  // (Wormadam's learnset is by its species name; its Pokédex entries by form.)
  const d = window.DEX[species] || window.DEX[Object.keys(window.DEX).find((k) => k.startsWith(species + "-"))];
  const base = species.split("-")[0];
  let p = d && pick(String(d.id));
  if (!p && window.DEX[base]) p = pick(String(window.DEX[base].id));
  if (!p) { kept.push(species); continue; }
  const seen = new Set(), list = [];
  p.rows.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([lvl, , moveId]) => {
    const m = our(moveId);
    if (!m || seen.has(lvl + "|" + m)) return;
    seen.add(lvl + "|" + m);
    list.push([lvl, m]);
  });
  // (A move it learns on evolving and again later: both, as the games have it.)
  for (const [lvl, m] of EXTRA[species] || []) if (!list.some((x) => x[1] === m)) list.push([lvl, m]);
  list.sort((a, b) => a[0] - b[0]);
  if (!list.length) { kept.push(species); continue; }
  out[species] = list;
  source[species] = p.groups.map((v) => groupName[v]).join("+");
}

const counts = {};
for (const s of Object.values(source)) counts[s] = (counts[s] || 0) + 1;
fs.writeFileSync(path.join(root, "data/learnsets-levelup.js"),
  "// Auto-generated by tools/build-levelup-learnsets.js from PokeAPI. Do not edit by hand.\n" +
  "// Level-up moves as Scarlet and Violet have them, or the latest game each Pokémon is in\n" +
  "// (LEVELUP_SOURCE). Level 0: learned on evolving.\n" +
  "window.LEVELUP_SOURCE = " + JSON.stringify(source) + ";\n" +
  "(function () {\n  const L = " + JSON.stringify(out) + ";\n" +
  "  for (const k of Object.keys(L)) if (window.LEARNSETS_GEN6[k]) window.LEARNSETS_GEN6[k].levelup = L[k];\n})();\n");
console.log("wrote data/learnsets-levelup.js: " + Object.keys(out).length + " species; " +
  Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", "));
if (kept.length) console.log("kept as they were (no PokeAPI level-up moves): " + kept.join(", "));
if (Object.keys(missing).length) console.log("moves this game hasn't got, left out: " + Object.entries(missing).map(([k, v]) => k + " (" + v + ")").join(", "));
