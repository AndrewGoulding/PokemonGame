// Every machine move of the main games this game has no TM or HM for, as new
// TMs after TM165 (data/items.js, and their discs in data/item-sprites.js):
// from PokeAPI's machines.csv (each game's TMs, TRs and HMs, by version
// group), in the order of the games, each game's in its own order. Sword and
// Shield's TRs are TMs here. (Legends: Arceus has no machines.)
//
//   node tools/build-later-tms.js <folder with PokeAPI's data/v2/csv/*.csv>
//
// Then `npm run build:machine-learners`, for who can use them.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const csvDir = process.argv[2];
if (!csvDir || !fs.existsSync(path.join(csvDir, "machines.csv"))) {
  console.error("Usage: node tools/build-later-tms.js <PokeAPI csv folder>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/items.js", "data/moves.js", "data/moves-gen7.js", "data/moves-gen8.js", "data/moves-gen9.js"]) {
  vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
}
// (Johto's TM108-TM113, from tools/build-johto.js.)
window.WORLD_MAPS = {}; window.WORLD_TRAINERS = {};
try { vm.runInThisContext(fs.readFileSync(path.join(root, "data/johto-maps.js"), "utf8")); } catch (e) { /* (only its items matter) */ }

const FIRST = 166;   // (TM114-TM165: the older games' TMs, data/items.js)
const BEGIN = "  // LATER-TMS-BEGIN (tools/build-later-tms.js)\n", END = "  // LATER-TMS-END\n";
// The games, in order, by PokeAPI's version groups.
const GAMES = [["Red, Blue and Yellow", [1, 2]], ["Gold, Silver and Crystal", [3, 4]], ["Ruby, Sapphire and Emerald", [5, 6]],
  ["FireRed and LeafGreen", [7]], ["Diamond, Pearl and Platinum", [8, 9]], ["HeartGold and SoulSilver", [10]],
  ["Black and White, Black 2 and White 2", [11, 14]], ["X and Y", [15]], ["Omega Ruby and Alpha Sapphire", [16]],
  ["Sun and Moon, Ultra Sun and Ultra Moon", [17, 18]], ["Brilliant Diamond and Shining Pearl", [23]], ["Sword and Shield", [20]],
  ["Legends: Arceus", [24]], ["Scarlet and Violet", [25, 26, 27]], ["Legends: Z-A", [30, 31]]];

function csv(name) {
  const [head, ...rows] = fs.readFileSync(path.join(csvDir, name + ".csv"), "utf8").trim().split("\n");
  const keys = head.split(",");
  return rows.map((l) => { const v = l.split(","); return Object.fromEntries(keys.map((k, i) => [k, v[i]])); });
}
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const moveName = {};
for (const n of Object.keys(window.MOVES)) moveName[toID(n)] = n;
const pokeapiMove = {};
for (const r of csv("moves")) pokeapiMove[r.id] = r.identifier;

// What this game's machines teach now (but the ones this tool made).
const isMachine = (id) => /^(tm|hm)\d+$/.test(id);
const num = (id) => +/\d+$/.exec(id)[0];
const taught = new Set(Object.keys(window.ITEMS).filter((id) => isMachine(id) && !(/^tm/.test(id) && num(id) >= FIRST))
  .map((id) => /^Teaches (.+?) to a compatible/.exec(window.ITEMS[id].effect)[1]));
const machines = csv("machines");
const added = [], unknown = new Set();
for (const [game, groups] of GAMES) {
  const rows = machines.filter((r) => groups.includes(+r.version_group_id))
    .sort((a, b) => groups.indexOf(+a.version_group_id) - groups.indexOf(+b.version_group_id) || a.machine_number - b.machine_number);
  for (const r of rows) {
    const move = moveName[toID(pokeapiMove[r.move_id])];
    if (!move) { unknown.add(pokeapiMove[r.move_id]); continue; }
    if (taught.has(move)) continue;
    taught.add(move);
    added.push({ move, game });
  }
}
if (unknown.size) console.log("moves this game hasn't got (no TM for them): " + [...unknown].join(", "));

// data/items.js: after TM165, between the markers.
const itemsFile = path.join(root, "data/items.js");
let items = fs.readFileSync(itemsFile, "utf8").replace(new RegExp(BEGIN.replace(/[()]/g, "\\$&") + "[\\s\\S]*?" + END), "");
const after = items.indexOf("\n", items.indexOf('  "tm165": ')) + 1;
let block = BEGIN, last = null;
added.forEach(({ move, game }, i) => {
  if (game !== last) { block += "  // " + game + "'s\n"; last = game; }
  const id = "tm" + (FIRST + i);
  block += '  "' + id + '": { name: "' + id + '", category: "all-machines", effect: "Teaches ' + move + ' to a compatible Pokémon." },\n';
});
items = items.slice(0, after) + block + END + items.slice(after);
fs.writeFileSync(itemsFile, items);

// data/item-sprites.js: each one's disc, by its move's type (as tools/build-item-sprites.js does), and its box.
const spritesFile = path.join(root, "data/item-sprites.js");
let sprites = fs.readFileSync(spritesFile, "utf8").replace(new RegExp(BEGIN.replace(/[()]/g, "\\$&") + "[\\s\\S]*?" + END), "");
const sAfter = sprites.indexOf("\n", sprites.indexOf('  "tm165": ')) + 1;
const disc = (move) => "assets/sprites/items/tm/" + window.MOVES[move].type.toLowerCase() + ".png";
sprites = sprites.slice(0, sAfter) + BEGIN + added.map(({ move }, i) => '  "tm' + (FIRST + i) + '": "' + disc(move) + '",\n').join("") + END + sprites.slice(sAfter);
sprites = sprites.replace(/window\.ITEM_SPRITE_BOXES = (\{.*\});/, (all, json) => {
  const boxes = JSON.parse(json), out = {};
  for (const [k, v] of Object.entries(boxes)) {
    if (/^tm\d+$/.test(k) && num(k) >= FIRST) continue;
    out[k] = v;
    if (k === "tm165") added.forEach((a, i) => { out["tm" + (FIRST + i)] = v; });
  }
  return "window.ITEM_SPRITE_BOXES = " + JSON.stringify(out) + ";";
});
fs.writeFileSync(spritesFile, sprites);
console.log("TM" + FIRST + "-TM" + (FIRST + added.length - 1) + ": " + GAMES.map(([g]) => g + " " + added.filter((a) => a.game === g).length).join(", "));
