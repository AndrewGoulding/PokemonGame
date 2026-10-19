// Celadon's Berry Farm, this game's own: through the gap in the trees south of
// Celadon's Gym, a field of soft soil laid out as X and Y's Berry Fields on
// Route 7 (36 places to plant, here Emerald's 2x2 plots, two trees each, as
// Route 123's garden has them, inside a fence), drawn in Emerald's tiles
// (the General tileset and Lilycove's, as Route 123 is), with Emerald's berry
// trees growing in it (ui/berry-farm.js grows them, as Emerald's
// src/berry.c does, on the game's step clock).
//
//   node tools/build-berry-farm.js <path to pret/pokeemerald>
//   (or set POKEEMERALD=<path>)
//
// Writes:
//   assets/world/maps/CeladonCity_BerryFarm.png, -top.png, -border.png
//   assets/world/sprites/berry_tree_<kind>.png   each of Emerald's berry trees
//       (graphics/object_events/pics/berry_trees: 16x32 frames, the dirt
//       pile, the sprout's two, then two each growing taller, flowering and
//       with berries, in the palettes gBerryTreePaletteSlotTable gives them)
//   assets/world/sprites/berry_soil.png           an empty spot (nothing to see)
//   assets/sprites/items/key-item/wailmer-pail.png
//   data/emerald-maps.js (its end, between the markers): the farm's map, its
//       join to Celadon City, the Wailmer Pail, and window.BERRY_FARM: each
//       berry's tree, growing time and yield (gBerries' stageDuration,
//       minYield, maxYield) and the spots trees grow on.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const EM = process.argv[2] || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "data/tilesets/primary/general"))) {
  console.error("Usage: node tools/build-berry-farm.js <path to pret/pokeemerald>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const P = (...p) => path.join(EM, ...p);
const E = require("./lib/emerald-tiles")(EM);
const NAME = "CeladonCity_BerryFarm";

// ---------- The map ----------
// Emerald's metatiles: grass; the forest's tree tops and bottoms (15 a top
// with grass above it, 22 a bottom with grass below); the garden's fence
// (Route 123's: its corners, sides, top and bottom); and the soil plots
// (Lilycove's 2x2: berry trees stand on the top row, the bottom row is soil
// you walk on).
const MT = { grass: 1, flowers: 4, top: 198, bottom: 199, topEdge: 15, bottomEdge: 22,
  fenceTL: 321, fenceT: 329, fenceTR: 313, fenceL: 322, fenceR: 320, fenceBL: 307, fenceB: 329, fenceBR: 306,
  plot: [[627, 629], [635, 637]] };
const W = 30, H = 26;
const ENTRANCE = [10, 11];                          // (under Celadon's gap, rows 38-39 there)
const GARDEN = { x0: 4, y0: 5, x1: 24, y1: 14 };    // the fence
const GATE = [10, 11];                              // (in its top)
const PLOT_X = [6, 9, 12, 15, 18, 21], PLOT_Y = [7, 9, 11];
const CARETAKER = { x: 12, y: 4 };   // (and the Grass Tera Raid den at (25, 20): game/raid-dens.js)
// (Flower beds on the lawn south of the garden: Emerald's swaying flowers.)
const FLOWERS = [[5, 17, 3, 2], [13, 19, 4, 1], [21, 17, 3, 2], [7, 21, 2, 1], [18, 22, 3, 1]];

const blocks = new Array(W * H).fill(MT.grass), solid = new Array(W * H).fill(0);
const set = (x, y, mt, s) => { blocks[y * W + x] = mt; solid[y * W + x] = s ? 1 : 0; };
// The forest: round the edge, two deep (the bottom three), but the way in.
const forest = (x, y) => (x < 2 || x >= W - 2 || y < 2 || y >= H - 2) && !(y < 2 && ENTRANCE.includes(x));
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!forest(x, y)) continue;
  // (Rows of tops and bottoms: even rows the tops, odd the bottoms; the bottom
  // forest starts on an even row.)
  const isTop = y % 2 === 0;
  const open = (dx, dy) => { const u = x + dx, v = y + dy; return u >= 0 && v >= 0 && u < W && v < H && !forest(u, v); };
  set(x, y, isTop ? (open(0, -1) ? MT.topEdge : MT.top) : (open(0, 1) ? MT.bottomEdge : MT.bottom), true);
}
// The garden's fence, its gate in the top.
for (let x = GARDEN.x0; x <= GARDEN.x1; x++) {
  if (!GATE.includes(x)) set(x, GARDEN.y0, x === GARDEN.x0 ? MT.fenceTL : x === GARDEN.x1 ? MT.fenceTR : MT.fenceT, true);
  set(x, GARDEN.y1, x === GARDEN.x0 ? MT.fenceBL : x === GARDEN.x1 ? MT.fenceBR : MT.fenceB, true);
}
for (let y = GARDEN.y0 + 1; y < GARDEN.y1; y++) { set(GARDEN.x0, y, MT.fenceL, true); set(GARDEN.x1, y, MT.fenceR, true); }
for (const [x0, y0, w, h] of FLOWERS) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, MT.flowers, false);
// The plots, and the spots trees grow on (their top rows).
const spots = [];
for (const y of PLOT_Y) for (const x of PLOT_X) {
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) set(x + dx, y + dy, MT.plot[dy][dx], false);
  spots.push({ x, y }, { x: x + 1, y });
}

const general = E.loadTileset("primary", "general", E.GENERAL_ANIMS);
const lilycove = E.loadTileset("secondary", "lilycove");
const outMaps = path.join(root, "assets/world/maps");
const r = E.render(blocks, W, H, general, lilycove, false);
writePng(path.join(outMaps, NAME + ".png"), W * 16, H * 16, r.below);
writePng(path.join(outMaps, NAME + "-top.png"), W * 16, H * 16, r.above);
writePng(path.join(outMaps, NAME + "-border.png"), 32, 32, E.render([MT.top, MT.top, MT.bottom, MT.bottom], 2, 2, general, lilycove, true).below);
const anim = E.animCells(blocks, W, H, general, lilycove);
if (anim.pics.length) E.writeAnimSheet(path.join(outMaps, NAME + "-anim.png"), anim.pics);

// ---------- The berry trees ----------
// Each of Emerald's tree pictures, as a 9-frame sheet: the dirt pile, the
// sprout's 2 frames, then the tree's 6 (taller, flowering, with berries: 2 each).
const SPRITES = path.join(root, "assets/world/sprites");
const pal = (slot) => readPal(P("graphics/object_events/palettes", "npc_" + (slot - 1) + ".pal"));
const tables = fs.readFileSync(P("src/data/object_events/berry_tree_graphics_tables.h"), "utf8");
const slots = {};
for (const m of tables.matchAll(/gBerryTreePaletteSlotTable_(\w+)\[\] = \{([^}]*)\}/g)) slots[m[1]] = m[2].split(",").map(Number);
const picOf = {};   // Emerald berry -> the tree picture (and palette table) it uses
for (const m of tables.matchAll(/\[ITEM_(\w+)_BERRY - FIRST_BERRY_INDEX\]\s*= sPicTable_(\w+)BerryTree/g)) picOf[m[1].toLowerCase()] = m[2];
function sheet(kind) {
  const dirt = readPng(P("graphics/object_events/pics/berry_trees/dirt_pile.png"));
  const sprout = readPng(P("graphics/object_events/pics/berry_trees/sprout.png"));
  const tree = readPng(P("graphics/object_events/pics/berry_trees", kind.toLowerCase() + ".png"));
  const sl = slots[kind], img = new Uint8ClampedArray(9 * 16 * 32 * 4);
  const put = (src, sx, sw, sh, frame, slot) => {
    const p = pal(slot);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const c = src.px[y * src.width + sx + x] & 15;
      if (!c) continue;
      const o = ((32 - sh + y) * 9 * 16 + frame * 16 + x) * 4;
      img[o] = p[c][0]; img[o + 1] = p[c][1]; img[o + 2] = p[c][2]; img[o + 3] = 255;
    }
  };
  put(dirt, 0, 16, 16, 0, sl[0]);
  for (let f = 0; f < 2; f++) put(sprout, f * 16, 16, 16, 1 + f, sl[1]);
  for (let f = 0; f < 6; f++) put(tree, f * 16, 16, 32, 3 + f, sl[2 + (f >> 1)]);
  writePng(path.join(SPRITES, "berry_tree_" + kind.toLowerCase() + ".png"), 9 * 16, 32, img);
}
const kinds = [...new Set(Object.values(picOf))];
kinds.forEach(sheet);
writePng(path.join(SPRITES, "berry_soil.png"), 16, 32, new Uint8ClampedArray(16 * 32 * 4));

// ---------- The berries ----------
// Emerald's (gBerries: hours a stage, the fewest and most it bears) by name,
// and the trees they grow as. Berries since Emerald grow as one of its trees
// (a likely-looking one) and take as long as Diamond and Pearl's: the
// type-resisting ones (and Chilan, Roseli) 18 hours a stage, the rest 24.
const berrySrc = fs.readFileSync(P("src/berry.c"), "utf8");
const berries = {};
for (const m of berrySrc.matchAll(/\.name = _\("(\w+)"\),[\s\S]*?\.maxYield = (\d+),\s*\.minYield = (\d+),[\s\S]*?\.stageDuration = (\d+),/g)) {
  const n = m[1].toLowerCase();
  berries[n + "-berry"] = { tree: picOf[n].toLowerCase(), hours: +m[4], min: +m[3], max: +m[2] };
}
const LATER = {
  occa: "cheri", passho: "oran", wacan: "aspear", rindo: "lum", yache: "rawst", chople: "figy", kebia: "kelpsy", shuca: "persim",
  coba: "wiki", payapa: "pecha", tanga: "lum", charti: "grepa", kasib: "spelon", haban: "pamtre", colbur: "durin", babiri: "lansat",
  chilan: "nomel", roseli: "pecha", micle: "liechi", custap: "tamato", jaboca: "cornn", rowap: "sitrus", kee: "rabuta", maranga: "hondew"
};
const resist = ["occa", "passho", "wacan", "rindo", "yache", "chople", "kebia", "shuca", "coba", "payapa", "tanga", "charti", "kasib", "haban", "colbur", "babiri", "chilan", "roseli"];
for (const [n, tree] of Object.entries(LATER)) berries[n + "-berry"] = resist.includes(n) ? { tree, hours: 18, min: 1, max: 3 } : { tree, hours: 24, min: 1, max: 2 };

// ---------- The Wailmer Pail's icon (24x24, centred in 32x32) ----------
{
  const png = readPng(P("graphics/items/icons/wailmer_pail.png"));
  const ip = readPal(P("graphics/items/icon_palettes/wailmer_pail.pal"));
  const rgba = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = png.px[y * png.width + x];
    if (!c) continue;
    const o = ((y + 4) * 32 + x + 4) * 4;
    rgba[o] = ip[c][0]; rgba[o + 1] = ip[c][1]; rgba[o + 2] = ip[c][2]; rgba[o + 3] = 255;
  }
  writePng(path.join(root, "assets/sprites/items/key-item/wailmer-pail.png"), 32, 32, rgba);
}

// ---------- The map's data ----------
const collision = solid.slice(), elevation = solid.map((v) => (v ? 0 : 3)), behavior = blocks.map(() => 0), encounter = blocks.map(() => 0);
const person = (id, x, y, sprite, w, h, frames, movement, script, extra) => Object.assign(
  { id, x, y, movement, rangeX: 1, rangeY: 1, script, flag: null, text: null, sprite, width: w, height: h, frames }, extra || {});
const map = {
  name: NAME, title: "Celadon Berry Farm", width: W, height: H, type: "route", music: "mus_celadon",
  townMapSection: "CELADON_CITY",   // (on Kanto's Town Map in Celadon City: ui/magnet-train.js adds it)
  cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  anim: anim.cells.length ? { cells: anim.cells, anims: general.anims.map((a) => a.name) } : undefined,
  collision, elevation, behavior, encounter,
  connections: [{ map: "CeladonCity", mapConst: "MAP_CELADON_CITY", direction: "up", offset: 0 }],
  warps: [], signs: [], triggers: [], hidden: [],
  people: [person(0, CARETAKER.x, CARETAKER.y, "woman_2", 16, 32, 9, "face_down", "BerryFarm_Caretaker", { localId: "LOCALID_BERRY_FARM_CARETAKER" })]
    .concat(spots.map((s, i) => person(10 + i, s.x, s.y, "berry_soil", 16, 32, 9, "face_down", "BerryFarm_Tree_" + i,
      { localId: "LOCALID_BERRY_TREE_" + i, inanimate: true, rangeX: 0, rangeY: 0 }))),
  wild: null
};
const START = "// Celadon's Berry Farm (tools/build-berry-farm.js", END = "// (End of Celadon's Berry Farm.)\n";
const js = START + ", from pret/pokeemerald): its map, its join to Celadon City, the Wailmer Pail, and its berries' trees.\n" +
  "window.WORLD_MAPS[" + JSON.stringify(NAME) + "] = " + JSON.stringify(map) + ";\n" +
  "(function () {\n" +
  "  const city = window.WORLD_MAPS.CeladonCity;\n" +
  "  if (city && !city.connections.some((c) => c.map === " + JSON.stringify(NAME) + ")) city.connections.push({ map: " + JSON.stringify(NAME) + ", direction: \"down\", offset: 0 });\n" +
  "  if (window.ITEMS && !window.ITEMS[\"wailmer-pail\"]) window.ITEMS[\"wailmer-pail\"] = { name: \"wailmer-pail\", category: \"key-items\", effect: \"A tool for watering Berries to make them grow better.\" };\n" +
  "  if (window.ITEM_SPRITES) window.ITEM_SPRITES[\"wailmer-pail\"] = \"assets/sprites/items/key-item/wailmer-pail.png\";\n" +
  "})();\n" +
  "window.BERRY_FARM = " + JSON.stringify({ map: NAME, spots, berries }) + ";\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
const a = text.indexOf(START);
if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log(NAME, W + "x" + H, spots.length, "spots,", kinds.length, "tree pictures,", Object.keys(berries).length, "berries");
