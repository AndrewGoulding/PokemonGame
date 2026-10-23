// Draws Johto's maps from Pokémon Heart & Soul, a GBA remake of Johto built on the Emerald decomp
// (github.com/PokemonHnS-Development/pokemonHnS), to look at: its own maps and tilesets, drawn as this game draws
// Hoenn's (tools/lib/emerald-tiles.js, with Heart & Soul's wider primary tileset: 640 tiles and metatiles,
// 7 palettes). It writes only pictures; nothing of Heart & Soul's goes into the game.
//
//   node tools/build-johto-hns.js <path to a pokemonHnS checkout> <out dir> NewBarkTown VioletCity ...
"use strict";
const fs = require("fs"), path = require("path");
const [H, OUT, ...names] = process.argv.slice(2);
if (!H || !OUT || !names.length || !fs.existsSync(path.join(H, "data/layouts/layouts.json"))) {
  console.error("Usage: node tools/build-johto-hns.js <path to a pokemonHnS checkout> <out dir> Map [Map ...]");
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const { writePng } = require("./lib/png");
const ET = require("./lib/emerald-tiles")(H, { primaryTiles: 640, primaryMetatiles: 640, primaryPals: 7 });
const layouts = JSON.parse(fs.readFileSync(path.join(H, "data/layouts/layouts.json"), "utf8")).layouts;
const cache = {};
// (Each tileset's folder, from the decomp's headers.h (its tiles' symbol) and graphics.h (that symbol's file).)
const headers = fs.readFileSync(path.join(H, "src/data/tilesets/headers.h"), "utf8"), gfx = fs.readFileSync(path.join(H, "src/data/tilesets/graphics.h"), "utf8");
function folder(sym) {
  const i = headers.indexOf("struct Tileset " + sym + " =");
  const m = i >= 0 && headers.slice(i, i + 400).match(/\.tiles = (\w+)/);
  const j = m ? gfx.indexOf(m[1] + "[]") : -1;
  const f = j >= 0 && gfx.slice(j, j + 200).match(/data\/tilesets\/(primary|secondary)\/([^/]+)\//);
  return f ? f[2] : ET.tilesetFolder(sym);
}
const ts = (kind, sym) => cache[sym] || (cache[sym] = ET.loadTileset(kind, folder(sym)));
for (const n of names) {
  const map = JSON.parse(fs.readFileSync(path.join(H, "data/maps", n, "map.json"), "utf8"));
  const L = layouts.find((l) => l.id === map.layout);
  const bin = fs.readFileSync(path.join(H, L.blockdata_filepath)), blocks = [];
  for (let i = 0; i < L.width * L.height; i++) blocks.push(bin.readUInt16LE(i * 2));
  const r = ET.render(blocks, L.width, L.height, ts("primary", L.primary_tileset), ts("secondary", L.secondary_tileset), false);
  writePng(path.join(OUT, n + ".png"), L.width * 16, L.height * 16, r.below);
  writePng(path.join(OUT, n + "-top.png"), L.width * 16, L.height * 16, r.above);
  console.log(n, L.width + "x" + L.height, L.primary_tileset, L.secondary_tileset);
}
