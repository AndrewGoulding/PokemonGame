// Pokémon XD's purification moves -> window.XD_PURIFICATION_MOVES in data/machine-learners.js.
// The four moves each Shadow Pokémon has (PokeAPI's "xd-purification" learn method, which is
// what Serebii's Gen 3 Pokédex lists under "Special Attacks"); the BP tutor teaches them.
// Run with: node tools/build-xd-moves.js <dir holding PokeAPI's pokemon_moves.csv, moves.csv, pokemon.csv>
//   (curl each from https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/)
const fs = require("fs"), path = require("path");
const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/build-xd-moves.js <csv dir>"); process.exit(1); }
const rows = (f) => { const [h, ...l] = fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n").map((s) => s.split(",")); return l.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]]))); };
const root = path.join(__dirname, "..");
global.window = {};
require(path.join(root, "data/moves.js"));
for (const f of ["moves-gen7", "moves-gen8", "moves-gen9"]) require(path.join(root, "data", f + ".js"));
require(path.join(root, "data/dex.js"));
for (const f of ["dex-gen7", "dex-gen8"]) require(path.join(root, "data", f + ".js"));
const id = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^vicegrip$/, "visegrip");
const moveName = {}, speciesName = {};
for (const m of Object.keys(window.MOVES)) moveName[id(m)] = m;
for (const s of Object.keys(window.DEX)) speciesName[id(s)] = s;
const mv = Object.fromEntries(rows("moves.csv").map((r) => [r.id, r.identifier]));
const pk = Object.fromEntries(rows("pokemon.csv").map((r) => [r.id, r.identifier]));
const out = {};
for (const r of rows("pokemon_moves.csv")) {
  if (r.pokemon_move_method_id !== "9") continue;
  const sp = speciesName[id(pk[r.pokemon_id])], m = moveName[id(mv[r.move_id])];
  if (!sp || !m) { console.error("unmatched", pk[r.pokemon_id], mv[r.move_id]); continue; }
  (out[sp] = out[sp] || []).push(m);
}
const file = path.join(root, "data/machine-learners.js");
const old = fs.readFileSync(file, "utf8").replace(/\/\/ XD-BEGIN[\s\S]*?\/\/ XD-END\n/, "");
const block = "// XD-BEGIN (tools/build-xd-moves.js)\n// Pokémon XD's purification moves: species -> the four its Shadow Pokémon has.\n" +
  "window.XD_PURIFICATION_MOVES = " + JSON.stringify(out, null, 1).replace(/\n /g, "\n  ") + ";\n// XD-END\n";
fs.writeFileSync(file, old + block);
console.log("wrote XD_PURIFICATION_MOVES for " + Object.keys(out).length + " species");
