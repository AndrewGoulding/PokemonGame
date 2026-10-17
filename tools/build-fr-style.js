// Learns FireRed's outdoor style from Kanto's own maps, for drawing other
// regions in it (tools/lib/fr-painter.js):
//
//   node tools/build-fr-style.js <path to a pret/pokefirered checkout>
//   (or set POKEFIRERED=<path>)
//
// Every metatile of FireRed's General tileset gets a class: what it is
// (grass, path, sand, pavement, bridge, tall grass, water, ledge, tree, rock,
// fence, building, object, waterrock). Then every tile of Kanto's outdoor maps
// (towns, cities, routes and the Sevii Islands) drawn with a General
// metatile is counted under its pattern: its class, its eight neighbours'
// classes, and whether its column and row are odd (FireRed's trees and grass
// repeat in 2x2 blocks). The painter looks a region's tiles up in that.
//
// Writes tools/data/fr-style.json:
//   { classes: { metatile id: class }, patterns: { class: [[pattern, { metatile id: count }], ...] },
//     stamps: [{ kind, from, dest, primary, secondary, w, h, door: [x, y], blocks (null: none) }], signs: [metatile id, ...] }
//   (a pattern: "<x odd><y odd>|<n>,<ne>,<e>,<se>,<s>,<sw>,<w>,<nw>", the neighbours' classes)
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./lib/fr-tiles");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "data/layouts/layouts.json"))) {
  console.error("Usage: node tools/build-fr-style.js <path to pret/pokefirered>");
  process.exit(1);
}
const root = path.join(__dirname, "..");

// ---------- Classes ----------

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// The General tileset's solid metatiles that aren't trees, rock or water, by id
// (the rest are told apart by behaviour and colour).
const SOLID = {
  object: [2, 3, 4, 352, 353, 354, 360, 361],
  fence: [...range(222, 249), ...range(252, 255), ...range(309, 311)],
  building: [7, 24, 25, 32, 33, ...range(40, 103), ...range(312, 316), ...range(320, 324), ...range(328, 332), ...range(336, 351),
    ...range(368, 372), ...range(384, 415), ...range(437, 439)],
  tree: [250, 251, ...range(325, 327), ...range(333, 335)]
};
// Wooden planks: bridges and boardwalks.
const BRIDGE = [...range(355, 356), ...range(362, 364), ...range(370, 372), ...range(445, 447), ...range(453, 455)];
const WATER_BEHAVIOURS = new Set([0x10, 0x11, 0x12, 0x13, 0x15, 0x16, 0x17, 0x1a, 0x1b, 0x50, 0x51, 0x52, 0x53]);
const LEDGES = { 0x38: "ledge_e", 0x39: "ledge_w", 0x3a: "ledge_n", 0x3b: "ledge_s" };

// A metatile's colours, flattened: how much is green, brown, sand, blue, grey.
function colours(primary, secondary, id) {
  const { below } = T.renderBlocks([id], 1, 1, primary, secondary, true);
  const f = { green: 0, brown: 0, sand: 0, blue: 0, grey: 0 };
  for (let i = 0; i < 256; i++) {
    const r = below[i * 4], g = below[i * 4 + 1], b = below[i * 4 + 2];
    if (g > r + 20 && g > b) f.green++;
    else if (b > r + 30 && b > g) f.blue++;
    else if (r > g + 15 && g > b + 10 && r < 200) f.brown++;
    else if (r > 200 && g > 180 && b < 170) f.sand++;
    else if (Math.abs(r - g) < 15 && Math.abs(g - b) < 20) f.grey++;
  }
  for (const k in f) f[k] /= 256;
  return f;
}

function classify(id, behavior, solid, f) {
  if (behavior === 0x02) return "tallgrass";
  if (LEDGES[behavior]) return LEDGES[behavior];
  if (WATER_BEHAVIOURS.has(behavior)) return solid ? "waterrock" : "water";
  if (!solid) {
    if (behavior === 0x21) return "sand";
    if (BRIDGE.includes(id)) return "bridge";
    if (f.green > 0.55) return "grass";
    if (f.grey > 0.4) return "pavement";
    return f.green > 0.3 ? "grass" : "path";
  }
  for (const [cls, ids] of Object.entries(SOLID)) if (ids.includes(id)) return cls;
  if (f.blue > 0.4) return "waterrock";
  if (f.green > 0.45) return "tree";
  return "rock";
}

// ---------- Styles: Kanto's outdoor maps, and its caves ----------

const allLayouts = JSON.parse(fs.readFileSync(path.join(pret, "data/layouts/layouts.json"), "utf8")).layouts.filter((l) => l.name);
const tilesets = {};
const tileset = (s) => tilesets[s] || (tilesets[s] = T.loadTileset(s));
const general = tileset("gTileset_General");
const NEIGHBOURS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

// A style learned from `layouts`: the classes of the metatiles they use, and
// the patterns. Its metatiles are the General tileset's, and (with `own`, a
// secondary tileset, as the Cave's) that one's too.
function learn(layouts, own) {
  // Each metatile's class, from its behaviour, its colours and whether
  // Kanto's maps mostly make it solid.
  const solidCount = {}, useCount = {}, behaviorOf = {}, grids = [];
  const mine = (l, id) => id < T.NUM_PRIMARY_METATILES || l.secondary_tileset === own;
  for (const l of layouts) {
    const bin = fs.readFileSync(path.join(pret, l.blockdata_filepath));
    const primary = tileset(l.primary_tileset), secondary = tileset(l.secondary_tileset);
    const blocks = Array.from({ length: l.width * l.height }, (_, i) => bin.readUInt16LE(i * 2));
    grids.push({ l, blocks, secondary });
    for (const b of blocks) {
      const id = b & 0x3ff;
      if (!mine(l, id)) continue;
      useCount[id] = (useCount[id] || 0) + 1;
      solidCount[id] = (solidCount[id] || 0) + ((b >> 10) & 3 ? 1 : 0);
      if (behaviorOf[id] == null) behaviorOf[id] = T.metatile(primary, secondary, id).behavior;
    }
  }
  const second = tileset(own || "gTileset_PalletTown");
  const classes = {};
  for (const id of Object.keys(useCount).map(Number)) {
    classes[id] = classify(id < T.NUM_PRIMARY_METATILES ? id : -1, behaviorOf[id], solidCount[id] / useCount[id] > 0.5, colours(general, second, id));
  }
  // (A town's own metatiles: its buildings, mostly; told apart the same way, for the neighbours.)
  const secondaryClass = {};
  function classOf(g, b) {
    const id = b & 0x3ff;
    if (mine(g.l, id)) return classes[id];
    const k = g.l.secondary_tileset + ":" + id;
    if (!(k in secondaryClass)) {
      const mt = T.metatile(general, g.secondary, id), f = colours(general, g.secondary, id);
      const solid = !!((b >> 10) & 3);
      secondaryClass[k] = solid && !WATER_BEHAVIOURS.has(mt.behavior) && f.green < 0.45 && f.brown < 0.35 ? "building" : classify(-1, mt.behavior, solid, f);
    }
    return secondaryClass[k];
  }
  const patterns = {};
  for (const g of grids) {
    const { width: w, height: h } = g.l;
    const cls = g.blocks.map((b) => classOf(g, b));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = g.blocks[y * w + x] & 0x3ff;
      if (!mine(g.l, id)) continue;
      const c = cls[y * w + x];
      if (c === "building" || c === "object") continue;
      // (Off the map's edge: as the tile at the edge.)
      const n = NEIGHBOURS.map(([dx, dy]) => cls[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))]);
      const key = (x & 1) + "" + (y & 1) + "|" + n.join(",");
      const table = patterns[c] || (patterns[c] = {});
      const counts = table[key] || (table[key] = {});
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return { grids, classOf, style: { primary: "gTileset_General", secondary: own || "gTileset_PalletTown", classes,
    patterns: Object.fromEntries(Object.entries(patterns).map(([c, t]) => [c, Object.entries(t)])) } };
}

// Outdoors: Kanto's towns, cities, routes and islands. Caves: those drawn with the Cave tileset (Mt. Moon, Victory Road, ...).
const outdoor = learn(allLayouts.filter((l) => l.primary_tileset === "gTileset_General" &&
  /^(\w+Town|\w+City|Route\d+|\w+Island|IndigoPlateau_Exterior)_Layout$/.test(l.name)));
const cave = learn(allLayouts.filter((l) => l.secondary_tileset === "gTileset_Cave"), "gTileset_Cave");
const { grids, classOf } = outdoor;
const layouts = outdoor.grids.map((g) => g.l);

// ---------- Stamps: Kanto's buildings and signs ----------
//
// Kanto's buildings, picked out by hand (layout, x, y, width, height; the
// door is the warp in it), to stand in for other regions' buildings of their
// kind: Pokémon Centers, Marts, Gyms, houses of several sizes, gates, towers
// and big buildings. Of each, the tiles of the building itself: those you can
// walk on, or the General tileset's trees, are left out (the painter's ground
// goes there). And each
// sign's metatile, from Kanto's signs.

const STAMPS = [
  ["pokecenter", "ViridianCity", 24, 22, 5, 5], ["pokecenter", "LavenderTown", 4, 1, 5, 5],
  ["mart", "ViridianCity", 34, 16, 4, 4], ["mart", "CeruleanCity", 27, 25, 4, 4],
  ["gym", "ViridianCity", 33, 6, 6, 5], ["gym", "CeruleanCity", 28, 17, 7, 5], ["gym", "CeladonCity", 8, 25, 8, 6],
  ["house", "PalletTown", 5, 3, 5, 5], ["house", "ViridianCity", 24, 7, 5, 5], ["house", "ViridianCity", 24, 15, 5, 4],
  ["house", "LavenderTown", 8, 8, 5, 4], ["house", "CeruleanCity", 8, 8, 7, 4], ["house", "CeruleanCity", 21, 25, 6, 4],
  ["dept", "CeruleanCity", 12, 23, 4, 6],
  ["lab", "PalletTown", 13, 9, 7, 5], ["dept", "CeladonCity", 31, 17, 6, 5], ["dept", "CeladonCity", 27, 4, 7, 8],
  ["tower", "LavenderTown", 15, 0, 7, 7], ["tower", "CeladonCity", 9, 4, 9, 11], ["tower", "SaffronCity", 29, 15, 9, 16],
  ["gate", "SaffronCity", 32, 0, 6, 6]
];
const mapsDir = path.join(pret, "data/maps");
const mapOfLayout = {};
for (const dir of fs.readdirSync(mapsDir)) {
  const f = path.join(mapsDir, dir, "map.json");
  if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f, "utf8")); (mapOfLayout[j.layout] = mapOfLayout[j.layout] || []).push(j); }
}
const stamps = [];
for (const [kind, name, x0, y0, sw, sh] of STAMPS) {
  const g = grids.find((t) => t.l.name === name + "_Layout");
  const { width: w } = g.l;
  const warps = (mapOfLayout[g.l.id] || []).flatMap((m) => m.warp_events || []);
  const door = warps.find((wp) => wp.x >= x0 && wp.x < x0 + sw && wp.y >= y0 && wp.y < y0 + sh);
  if (!door) throw new Error("no door in the " + kind + " at " + name + " " + x0 + "," + y0);
  const blocks = [];
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const b = g.blocks[(y0 + y) * w + x0 + x], c = classOf(g, b);
    const isDoor = x0 + x === door.x && y0 + y === door.y;
    const generalTree = (b & 0x3ff) < T.NUM_PRIMARY_METATILES && c === "tree";
    blocks.push(isDoor || ((b >> 10) & 3 && !generalTree) ? b : null);
  }
  stamps.push({ kind, from: name, dest: door.dest_map, primary: g.l.primary_tileset, secondary: g.l.secondary_tileset, w: sw, h: sh,
    door: [door.x - x0, door.y - y0], blocks });
}
const signs = {};
for (const g of grids) {
  for (const m of mapOfLayout[g.l.id] || []) for (const bg of m.bg_events || []) {
    if (bg.type !== "sign" || bg.x < 0 || bg.y < 0 || bg.x >= g.l.width || bg.y >= g.l.height) continue;
    const id = g.blocks[bg.y * g.l.width + bg.x] & 0x3ff;
    if (id < T.NUM_PRIMARY_METATILES) signs[id] = (signs[id] || 0) + 1;
  }
}

const out = { styles: { outdoor: outdoor.style, cave: cave.style }, stamps,
  signs: Object.entries(signs).sort((a, b) => b[1] - a[1]).map(([id]) => +id) };
fs.mkdirSync(path.join(root, "tools/data"), { recursive: true });
fs.writeFileSync(path.join(root, "tools/data/fr-style.json"), JSON.stringify(out));
for (const [name, st] of Object.entries(out.styles)) {
  console.log(name + ": " + Object.entries(st.patterns).map(([c, p]) => c + " " + p.length).join(", "));
}
console.log("learned from " + outdoor.grids.length + " outdoor and " + cave.grids.length + " cave maps");
console.log(stamps.length + " stamps; signs " + out.signs.join(" "));
