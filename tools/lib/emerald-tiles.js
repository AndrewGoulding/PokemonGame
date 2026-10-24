// Pokémon Emerald's tilesets (a pret/pokeemerald checkout's data/tilesets),
// drawn as this game's maps are: shared by tools/build-emerald-maps.js and
// tools/build-orre.js.
//
//   const E = require("./lib/emerald-tiles")(<path to pret/pokeemerald>);
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./png");

// (opts: a hack's sizes, where it widens Emerald's primary tileset: { primaryTiles, primaryMetatiles, primaryPals },
// as Pokémon Heart & Soul's 640, 640 and 7: its include/fieldmap.h.)
module.exports = function emeraldTiles(EM, opts) {
  const P = (...p) => path.join(EM, ...p);

  const o = opts || {};
  const NUM_PRIMARY_TILES = o.primaryTiles || 512, NUM_PRIMARY_METATILES = o.primaryMetatiles || 512, NUM_PRIMARY_PALS = o.primaryPals || 6;

  // Emerald's General tileset animations (TilesetAnim_General): VRAM tile, how
  // many tiles, the frames in order, and its slot in the 16-frame round.
  const GENERAL_ANIMS = [
    { name: "e_flower", dir: "flower", first: 508, count: 4, order: [0, 1, 0, 2] },
    { name: "e_water", dir: "water", first: 432, count: 30, order: [0, 1, 2, 3, 4, 5, 6, 7] },
    { name: "e_sand", dir: "sand_water_edge", first: 464, count: 10, order: [0, 1, 2, 3, 4, 5, 6, 0] },
    { name: "e_waterfall", dir: "waterfall", first: 496, count: 6, order: [0, 1, 2, 3] },
    { name: "e_land", dir: "land_water_edge", first: 480, count: 10, order: [0, 1, 2, 3] }
  ];

  // And the secondary tilesets' own (src/tileset_anims.c), by folder: each VRAM tile (past the primary's 512), how
  // many, its frames in order and when it turns (every N frames, `at` into the round; `shift`: a slot running that
  // many frames behind, as Rustboro's windy water's eight). (src: frames from another tileset's folder, as Lavaridge's
  // lava from the cave's; pair: two pictures a frame, one under the other, as Sootopolis's stormy water.)
  const S = 512, seq = (n) => Array.from({ length: n }, (_, i) => i);
  const slots = (name, dir, first, every) => seq(8).map((k) => ({ name: name + k, dir, first: S + first + 4 * k, count: 4, order: seq(8), every, at: k, shift: k }));
  const SECONDARY_ANIMS = {
    rustboro: slots("e_rustboro_water", "windy_water", 128, 8).concat([{ name: "e_rustboro_fountain", dir: "fountain", first: S + 448, count: 4, order: [0, 1], every: 8, at: 0 }]),
    dewford: [{ name: "e_dewford_flag", dir: "flag", first: S + 170, count: 6, order: seq(4), every: 8, at: 0 }],
    slateport: [{ name: "e_slateport_balloons", dir: "balloons", first: S + 224, count: 4, order: seq(4), every: 16, at: 0 }],
    lavaridge: [{ name: "e_lavaridge_steam0", dir: "steam", first: S + 288, count: 4, order: seq(4), every: 16, at: 0 },
      { name: "e_lavaridge_steam1", dir: "steam", first: S + 292, count: 4, order: seq(4), every: 16, at: 0, shift: -2 },
      { name: "e_lavaridge_lava", dir: "lava", src: "secondary/cave", first: S + 160, count: 4, order: seq(8), every: 16, at: 1 }],
    ever_grande: slots("e_evergrande_flowers", "flowers", 224, 8),
    pacifidlog: [{ name: "e_pacifidlog_logs", dir: "log_bridges", first: S + 464, count: 30, order: [0, 1, 2, 1], every: 16, at: 0 },
      { name: "e_pacifidlog_currents", dir: "water_currents", first: S + 496, count: 8, order: seq(8), every: 16, at: 1 }],
    sootopolis: [{ name: "e_sootopolis_water", dir: "stormy_water", pair: ["kyogre", "groudon"], first: S + 240, count: 96, order: seq(8), every: 16, at: 0 }],
    battle_frontier_outside_west: [{ name: "e_frontier_flag", dir: "flag", first: S + 218, count: 6, order: seq(4), every: 8, at: 0 }],
    battle_frontier_outside_east: [{ name: "e_frontier_flag", dir: "flag", first: S + 218, count: 6, order: seq(4), every: 8, at: 0 }],
    underwater: [{ name: "e_seaweed", dir: "seaweed", first: S + 496, count: 4, order: seq(4), every: 16, at: 0 }],
    sootopolis_gym: [{ name: "e_soot_gym_side", dir: "side_waterfall", first: S + 496, count: 12, order: seq(3), every: 8, at: 0, wrap: 240 },
      { name: "e_soot_gym_front", dir: "front_waterfall", first: S + 464, count: 20, order: seq(3), every: 8, at: 0, wrap: 240 }],
    cave: [{ name: "e_cave_lava", dir: "lava", first: S + 416, count: 4, order: seq(8), every: 16, at: 1 }]
  };
  // (Two pictures of the same width, one under the other.)
  const stack = (a, b) => ({ width: a.width, height: a.height + b.height, px: Uint8Array.from([...a.px, ...b.px]) });
  function loadTileset(kind, dir, anims) {
    const d = P("data/tilesets", kind, dir);
    // (The secret bases' kinds share their metatiles, in the folder above: secondary/secret_base/<kind>.)
    const shared = fs.existsSync(path.join(d, "metatiles.bin")) ? d : path.dirname(d);
    const palettes = [];
    for (let i = 0; i < 16; i++) {
      const f = path.join(d, "palettes", String(i).padStart(2, "0") + ".pal");
      palettes.push(fs.existsSync(f) ? readPal(f) : null);
    }
    return {
      tiles: readPng(path.join(d, "tiles.png")), meta: fs.readFileSync(path.join(shared, "metatiles.bin")),
      attrs: fs.readFileSync(path.join(shared, "metatile_attributes.bin")), palettes,
      anims: (anims || []).map((a) => {
        const ad = a.src ? P("data/tilesets", a.src, "anim", a.dir) : path.join(d, "anim", a.dir);
        const frame = (k) => (a.pair ? stack(...a.pair.map((n) => readPng(path.join(ad, k + "_" + n + ".png")))) : readPng(path.join(ad, k + ".png")));
        return Object.assign({}, a, { frames: a.order.map(frame) });
      })
    };
  }
  // (Which anim a tile is in: the primary's, then the secondary's after them.)
  const allAnims = (primary, secondary) => primary.anims.concat((secondary && secondary.anims) || []);
  const tileAnim = (entry, primary, secondary) => {
    const idx = entry & 0x3ff;
    if (idx < NUM_PRIMARY_TILES) return primary.anims.findIndex((a) => idx >= a.first && idx < a.first + a.count);
    const j = ((secondary && secondary.anims) || []).findIndex((a) => idx >= a.first && idx < a.first + a.count);
    return j < 0 ? -1 : primary.anims.length + j;
  };
  function metatile(primary, secondary, id) {
    const ts = id < NUM_PRIMARY_METATILES ? primary : secondary;
    const i = id < NUM_PRIMARY_METATILES ? id : id - NUM_PRIMARY_METATILES;
    const tiles = [];
    for (let k = 0; k < 8; k++) tiles.push(i * 16 + k * 2 + 1 < ts.meta.length ? ts.meta.readUInt16LE(i * 16 + k * 2) : 0);
    const attr = i * 2 + 1 < ts.attrs.length ? ts.attrs.readUInt16LE(i * 2) : 0;
    return { tiles, behavior: attr & 0xff, layer: (attr >> 12) & 0xf };
  }
  function drawTile(img, imgW, x0, y0, entry, primary, secondary, opaque, frames) {
    const idx = entry & 0x3ff, hflip = entry & 0x400, vflip = entry & 0x800, pal = entry >> 12;
    let sheet = (idx < NUM_PRIMARY_TILES ? primary : secondary).tiles;
    let t = idx < NUM_PRIMARY_TILES ? idx : idx - NUM_PRIMARY_TILES;
    const a = frames ? tileAnim(entry, primary, secondary) : -1;
    // (from: where in each frame's sheet the anim's tiles start, as Heart & Soul's waterfall, 34 tiles into its water's frames.)
    if (a >= 0) { const an = allAnims(primary, secondary)[a]; sheet = an.frames[frames[a]]; t = idx - an.first + (an.from || 0); }
    const palette = (pal < NUM_PRIMARY_PALS ? primary : secondary).palettes[pal] || primary.palettes[0];
    const perRow = sheet.width / 8, tx = (t % perRow) * 8, ty = Math.floor(t / perRow) * 8;
    if (ty >= sheet.height) return;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const c = sheet.px[(ty + (vflip ? 7 - y : y)) * sheet.width + tx + (hflip ? 7 - x : x)] & 15;
      if (c === 0 && !opaque) continue;
      const rgb = c === 0 ? primary.palettes[0][0] : palette[c];
      const o = ((y0 + y) * imgW + x0 + x) * 4;
      img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255;
    }
  }
  // Layer types: 0 normal (top tiles over sprites), 1 covered (all under), 2 split.
  function render(blocks, w, h, primary, secondary, flatten) {
    const below = new Uint8ClampedArray(w * h * 256 * 4), above = new Uint8ClampedArray(w * h * 256 * 4);
    let anyAbove = false;
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
      for (let k = 0; k < 4; k++) drawTile(below, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[k], primary, secondary, true);
      const down = flatten || mt.layer === 1;
      for (let k = 0; k < 4; k++) {
        if (!down && (mt.tiles[4 + k] & 0x3ff)) anyAbove = true;
        drawTile(down ? below : above, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[4 + k], primary, secondary, false);
      }
    }
    return { below, above, anyAbove };
  }
  // The animated 8x8 cells under sprites, in every combination of their anims'
  // frames (as tools/build-maps.js's animCells).
  function animCells(blocks, w, h, primary, secondary) {
    const cells = [], pics = [], all = allAnims(primary, secondary);
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
      for (let q = 0; q < 4; q++) {
        const entries = [mt.tiles[q]].concat(mt.layer === 1 ? [mt.tiles[4 + q]] : []);
        const used = [...new Set(entries.map((e) => tileAnim(e, primary, secondary)).filter((a) => a >= 0))].sort((x, y) => x - y);
        if (!used.length) continue;
        cells.push(bx * 2 + (q & 1), by * 2 + (q >> 1), pics.length, used.reduce((m, a) => m | (1 << a), 0));
        const combos = used.reduce((n, a) => n * all[a].frames.length, 1);
        for (let c = 0; c < combos; c++) {
          const frames = all.map(() => 0);
          let rest = c;
          for (const a of used) { const n = all[a].frames.length; frames[a] = rest % n; rest = Math.floor(rest / n); }
          const pic = new Uint8ClampedArray(256);
          entries.forEach((e, i) => drawTile(pic, 8, 0, 0, e, primary, secondary, i === 0, frames));
          pics.push(pic);
        }
      }
    }
    return { cells, pics };
  }
  function writeAnimSheet(file, pics) {
    const perRow = 64, rows = Math.ceil(pics.length / perRow), W = perRow * 8, rgba = new Uint8ClampedArray(W * rows * 8 * 4);
    pics.forEach((pic, i) => {
      const x0 = (i % perRow) * 8, y0 = Math.floor(i / perRow) * 8;
      for (let y = 0; y < 8; y++) rgba.set(pic.subarray(y * 32, y * 32 + 32), ((y0 + y) * W + x0) * 4);
    });
    writePng(file, W, rows * 8, rgba);
  }

  // Emerald's behaviours as FireRed's (game/world.js's MB). Most share Ruby and
  // Sapphire's numbers; the grass and the mountain top differ.
  function frBehavior(b) {
    switch (b) {
      case 0x02: case 0x03: return b;      // tall grass, long grass (Faraway Island's, which hides whoever's in it)
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x15: case 0x16: case 0x17: return b;   // waters, puddles
      case 0x21: return 0x21;              // sand
      case 0x38: case 0x39: case 0x3a: case 0x3b: return b;   // ledges
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x69: return b;   // doors, ladders, arrow warps
      default: return 0;
    }
  }

  // Where someone standing above shows a reflection (MetatileBehavior_IsReflective, _IsIce, _GetBridgeType), run-length
  // coded [start, run, kind, ...]: 1 water (pond, puddle, Sootopolis's deep water), 2 ice, 6 the water under a bridge; and the
  // bridges over ponds, whose reflection falls further, 3 low, 4 middling, 5 high (Route 120's).
  function reflectKind(b) {
    if (b === 0x10 || b === 0x16 || b === 0x1a || b === 0x14) return 1;
    if (b === 0x2b) return 6;   // (under a bridge: it gives a reflection, but the bridge is over it)
    if (b === 0x20) return 2;
    if (b >= 0x71 && b <= 0x73) return b - 0x70 + 2;
    if (b === 0x7a || b === 0x7b) return 4;
    if (b === 0x7c || b === 0x7d) return 5;
    return 0;
  }
  function reflections(blocks, primary, secondary) {
    const out = [];
    let start = 0, kind = 0;
    for (let i = 0; i <= blocks.length; i++) {
      const k = i < blocks.length ? reflectKind(metatile(primary, secondary, blocks[i] & 0x3ff).behavior) : -1;
      if (k === kind) continue;
      if (kind > 0) out.push(start, i - start, kind);
      start = i; kind = k;
    }
    return out;
  }

  const tilesetFolder = (sym) => sym.replace(/^gTileset_/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

  return { NUM_PRIMARY_TILES, NUM_PRIMARY_METATILES, NUM_PRIMARY_PALS, GENERAL_ANIMS, SECONDARY_ANIMS, allAnims,
    loadTileset, tileAnim, metatile, drawTile, render, animCells, writeAnimSheet, reflections, frBehavior, tilesetFolder };
};
