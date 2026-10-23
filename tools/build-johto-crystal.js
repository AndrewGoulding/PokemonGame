// Johto drawn in FireRed's style from Pokémon Crystal's own maps (a trial: tools/build-johto.js draws Johto
// from HeartGold and SoulSilver). Crystal's maps are flat grids of 32x32 blocks, four steps each, like the
// Red and Blue maps FireRed was redrawn from; each step's square is told apart by its collision
// (data/tilesets/johto_collision.asm) and its tiles' palettes (gfx/tilesets/johto_palette_map.asm): grass,
// path, trees, cliffs, fences, water, ledges, buildings. FireRed's painter (tools/lib/fr-painter.js) draws
// the ground, and each building with a door is one of Kanto's, of the kind its door leads to.
//
//   node tools/build-johto-crystal.js <path to pret/pokecrystal> --only=VioletCity,... --out=<dir>
"use strict";

const fs = require("fs");
const path = require("path");
const Painter = require("./lib/fr-painter");
const { writePng } = require("./lib/png");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!ROOT || !fs.existsSync(path.join(ROOT, "data/tilesets/johto_metatiles.bin"))) {
  console.error("Usage: node tools/build-johto-crystal.js <path to pret/pokecrystal> --only=Map,... --out=<dir>");
  process.exit(1);
}
const arg = (k) => (process.argv.find((a) => a.startsWith("--" + k + "=")) || "").slice(k.length + 3);
const ONLY = arg("only").split(",").filter(Boolean);
const OUT = arg("out");
const PARITY = (arg("parity") || "0,0").split(",").map(Number);
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ---------- Crystal's data ----------
const camelToConst = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Za-z])(\d)/g, "$1_$2").toUpperCase();
const dims = {};
for (const m of rd("constants/map_constants.asm").matchAll(/map_const (\w+),\s*(\d+),\s*(\d+)/g)) dims[m[1]] = [+m[2], +m[3]];
const tilesetOf = {};
for (const m of rd("data/maps/maps.asm").matchAll(/^\s*map (\w+), TILESET_(\w+)/gm)) tilesetOf[m[1]] = m[2].toLowerCase();

function tileset(ts) {
  const bin = fs.readFileSync(path.join(ROOT, "data/tilesets/" + ts + "_metatiles.bin"));
  const blocks = [];
  for (let i = 0; i < bin.length / 16; i++) blocks.push([...bin.subarray(i * 16, i * 16 + 16)]);
  const coll = [...rd("data/tilesets/" + ts + "_collision.asm").matchAll(/tilecoll ([^;\n]+)/g)].map((m) => m[1].split(",").map((s) => s.trim()));
  const pal = [];
  for (const l of rd("gfx/tilesets/" + ts + "_palette_map.asm").split("\n")) {
    const m = l.match(/tilepal \d, (.*)/);
    if (m) pal.push(...m[1].split(",").map((s) => s.trim()));
    else if (/rept 16/.test(l)) while (pal.length < 128) pal.push("GRAY");
  }
  return { blocks, coll, pal };
}

function events(name) {
  const s = rd("maps/" + name + ".asm");
  return {
    warps: [...s.matchAll(/warp_event\s+(\d+),\s*(\d+),\s*(\w+)/g)].map((m) => ({ x: +m[1], y: +m[2], dest: m[3] })),
    signs: [...s.matchAll(/bg_event\s+(\d+),\s*(\d+),\s*BGEVENT_(READ|UP)/g)].map((m) => ({ x: +m[1], y: +m[2] })),
    people: [...s.matchAll(/object_event\s+(\d+),\s*(\d+),\s*(SPRITE_\w+)/g)].map((m) => ({ x: +m[1], y: +m[2], sprite: m[3] }))
  };
}

// ---------- What each step's square is ----------
// (Blocks of Crystal's Johto tileset that are buildings where they're solid: walls, roofs, the Gym's, Mart's and
// Pokémon Center's fronts, the towers; the rest of what's solid is told by its palette: trees green, cliffs brown,
// fences grey.)
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const BUILDING_BLOCKS = new Set([0x08, 0x09, 0x0b, 0x0c, 0x0d, 0x0e, ...range(0x0f, 0x1f), ...range(0x20, 0x29), 0x2b, 0x2e, 0x2f, 0x37, 0x3b, 0x77, 0x7c, 0x7d, 0x7e, 0x7f]);
const FENCE_BLOCKS = new Set([0x40, 0x41, 0x42, 0x44, 0x46, 0x48, 0x49, 0x4a]);
const SIGN_BLOCKS = new Set([0x45, 0x47, 0x78]);   // (the ground under a sign: the painter puts FireRed's sign on it)
const ROOF_UNDER_TREES = new Set([0x2a, 0x2c, 0x2d]);   // (trees above, the top of a house's roof below)
const FLOWER_BLOCKS = new Set([0x04]);
const PIER_BLOCKS = new Set([0x06]);   // (the pink boards over water: Route 32's pier)
const CAVE_DOOR = 0xa9;   // (FireRed's General metatile for a cave's mouth in a cliff, MB_CAVE_DOOR)
const HOP = { HOP_DOWN: "ledge_s", HOP_DOWN_LEFT: "ledge_s", HOP_DOWN_RIGHT: "ledge_s", HOP_LEFT: "ledge_w", HOP_RIGHT: "ledge_e", HOP_UP: "ledge_n" };

function classify(name) {
  const C = camelToConst(name), [bw, bh] = dims[C], T = tileset(tilesetOf[name]);
  const blk = fs.readFileSync(path.join(ROOT, "maps/" + name + ".blk"));
  const w = bw * 2, h = bh * 2, classes = new Array(w * h), blockAt = new Array(w * h), caves = [];
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    const b = blk[by * bw + bx], tiles = T.blocks[b], coll = T.coll[b];
    for (let q = 0; q < 4; q++) {
      const qx = q & 1, qy = q >> 1, x = bx * 2 + qx, y = by * 2 + qy, i = y * w + x;
      const pals = [0, 1, 4, 5].map((k) => T.pal[tiles[qy * 8 + qx * 2 + k]] || "GRAY");
      const most = (p) => pals.filter((v) => v === p).length;
      const c = coll[q];
      let cls;
      if (c === "TALL_GRASS") cls = "tallgrass";
      else if (c === "WATER" || c === "WHIRLPOOL" || c === "BUOY") cls = "water";
      else if (c === "WATERFALL") cls = "waterfall";
      else if (HOP[c]) cls = HOP[c];
      else if (c === "CUT_TREE" || c === "HEADBUTT_TREE") cls = "tree";
      else if (c === "CAVE") { cls = "rock"; caves.push(i); }
      else if (c === "DOOR") cls = "building";
      else if (c === "WALL" || c === "UP_WALL" || c === "01") {
        if (most("WATER") >= 2) cls = "water";
        else if (SIGN_BLOCKS.has(b)) cls = b === 0x47 ? "grass" : "path";
        else if (ROOF_UNDER_TREES.has(b)) cls = qy ? "building" : "tree";
        else if (BUILDING_BLOCKS.has(b)) cls = "building";
        else if (FENCE_BLOCKS.has(b)) cls = "fence";
        else if (most("GREEN") >= 2) cls = "tree";
        else if (most("GRAY") >= 3) cls = "fence";
        else cls = "rock";
      } else {
        // (Floor.)
        if (FLOWER_BLOCKS.has(b)) cls = "flowers";
        else if (PIER_BLOCKS.has(b)) cls = "bridge";
        else if (most("GREEN") >= 2) cls = "grass";
        else if (most("BROWN") >= 3 && !SIGN_BLOCKS.has(b)) cls = "path";
        else cls = "path";
      }
      classes[i] = cls; blockAt[i] = b;
    }
  }
  return { w, h, classes, blockAt, caves };
}

// The kind of building a door leads to (fr-painter's stamps).
const kindOf = (dest) => /POKECENTER/.test(dest) ? "pokecenter" : /MART/.test(dest) ? "mart" : /GYM/.test(dest) ? "gym"
  : /LAB/.test(dest) ? "lab" : /TOWER|THEATER|ACADEMY/.test(dest) ? "dept" : /GATE/.test(dest) ? "gate" : "house";

function build(name) {
  const { w, h, classes, caves } = classify(name), ev = events(name);
  // Buildings: the solid squares joined to a door.
  const seen = new Set(), buildings = [];
  for (const wp of ev.warps) {
    const i0 = wp.y * w + wp.x;
    if (classes[i0] !== "building" || seen.has(i0)) continue;
    const tiles = [], q = [i0]; seen.add(i0);
    while (q.length) {
      const k = q.pop(); tiles.push([k % w, Math.floor(k / w)]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const u = (k % w) + dx, v = Math.floor(k / w) + dy, n = v * w + u;
        if (u < 0 || v < 0 || u >= w || v >= h || classes[n] !== "building" || seen.has(n)) continue;
        seen.add(n); q.push(n);
      }
    }
    buildings.push({ door: [wp.x, wp.y], tiles, kind: kindOf(wp.dest), dest: wp.dest });
  }
  const signs = ev.signs.map((s) => [s.x, s.y, "sign"]);
  if (process.env.DUMP_CLASSES) {
    const ch = { grass: ".", flowers: "f", path: "p", tallgrass: "g", water: "~", waterfall: "w", tree: "T", rock: "R", fence: "#", building: "B", ledge_s: "v", ledge_e: ">", ledge_w: "<", ledge_n: "^" };
    console.log(name + "\n" + Array.from({ length: h }, (_, y) => classes.slice(y * w, (y + 1) * w).map((c) => ch[c] || "?").join("")).join("\n"));
  }
  const pic = Painter.compose(classes, w, h, { buildings, signs, style: "outdoor", stretch: true, noFill: true, parity: PARITY });
  // (A cave's mouth, FireRed's, in the cliff.)
  const mouth = Painter.render([CAVE_DOOR], 1, 1, null, "outdoor").below;
  for (const i of caves) {
    const x0 = (i % w) * 16, y0 = Math.floor(i / w) * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const o = ((y0 + y) * w * 16 + x0 + x) * 4, q = (y * 16 + x) * 4;
      if (mouth[q + 3]) pic.below.set(mouth.subarray(q, q + 4), o);
    }
  }
  return { w, h, pic, ev, buildings };
}

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const name of ONLY) {
    const { w, h, pic, buildings } = build(name);
    writePng(path.join(OUT, name + ".png"), w * 16, h * 16, pic.below);
    writePng(path.join(OUT, name + "-top.png"), w * 16, h * 16, pic.above);
    console.log(name, w + "x" + h, "buildings", buildings.map((b) => b.kind).join(","));
  }
}
module.exports = { classify, events, build };
