// Pokémon Emerald's tilesets (a pret/pokeemerald checkout's data/tilesets),
// drawn as this game's maps are: shared by tools/build-emerald-maps.js and
// tools/build-orre.js.
//
//   const E = require("./lib/emerald-tiles")(<path to pret/pokeemerald>);
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./png");

module.exports = function emeraldTiles(EM) {
  const P = (...p) => path.join(EM, ...p);

  const NUM_PRIMARY_TILES = 512, NUM_PRIMARY_METATILES = 512, NUM_PRIMARY_PALS = 6;

  // Emerald's General tileset animations (TilesetAnim_General): VRAM tile, how
  // many tiles, the frames in order, and its slot in the 16-frame round.
  const GENERAL_ANIMS = [
    { name: "e_flower", dir: "flower", first: 508, count: 4, order: [0, 1, 0, 2] },
    { name: "e_water", dir: "water", first: 432, count: 30, order: [0, 1, 2, 3, 4, 5, 6, 7] },
    { name: "e_sand", dir: "sand_water_edge", first: 464, count: 10, order: [0, 1, 2, 3, 4, 5, 6, 0] },
    { name: "e_waterfall", dir: "waterfall", first: 496, count: 6, order: [0, 1, 2, 3] },
    { name: "e_land", dir: "land_water_edge", first: 480, count: 10, order: [0, 1, 2, 3] }
  ];

  function loadTileset(kind, dir, anims) {
    const d = P("data/tilesets", kind, dir);
    const palettes = [];
    for (let i = 0; i < 16; i++) {
      const f = path.join(d, "palettes", String(i).padStart(2, "0") + ".pal");
      palettes.push(fs.existsSync(f) ? readPal(f) : null);
    }
    return {
      tiles: readPng(path.join(d, "tiles.png")), meta: fs.readFileSync(path.join(d, "metatiles.bin")),
      attrs: fs.readFileSync(path.join(d, "metatile_attributes.bin")), palettes,
      anims: (anims || []).map((a) => Object.assign({}, a, { frames: a.order.map((k) => readPng(path.join(d, "anim", a.dir, k + ".png"))) }))
    };
  }
  const tileAnim = (entry, primary) => {
    const idx = entry & 0x3ff;
    return idx < NUM_PRIMARY_TILES ? primary.anims.findIndex((a) => idx >= a.first && idx < a.first + a.count) : -1;
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
    const a = frames ? tileAnim(entry, primary) : -1;
    if (a >= 0) { sheet = primary.anims[a].frames[frames[a]]; t = idx - primary.anims[a].first; }
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
    const cells = [], pics = [];
    for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
      const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
      for (let q = 0; q < 4; q++) {
        const entries = [mt.tiles[q]].concat(mt.layer === 1 ? [mt.tiles[4 + q]] : []);
        const used = [...new Set(entries.map((e) => tileAnim(e, primary)).filter((a) => a >= 0))].sort();
        if (!used.length) continue;
        cells.push(bx * 2 + (q & 1), by * 2 + (q >> 1), pics.length, used.reduce((m, a) => m | (1 << a), 0));
        const combos = used.reduce((n, a) => n * primary.anims[a].frames.length, 1);
        for (let c = 0; c < combos; c++) {
          const frames = primary.anims.map(() => 0);
          let rest = c;
          for (const a of used) { const n = primary.anims[a].frames.length; frames[a] = rest % n; rest = Math.floor(rest / n); }
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
      case 0x02: case 0x03: return 0x02;   // tall grass, long grass
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x15: case 0x16: case 0x17: return b;   // waters, puddles
      case 0x21: return 0x21;              // sand
      case 0x38: case 0x39: case 0x3a: case 0x3b: return b;   // ledges
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x69: return b;   // doors, ladders, arrow warps
      default: return 0;
    }
  }

  const tilesetFolder = (sym) => sym.replace(/^gTileset_/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();

  return { NUM_PRIMARY_TILES, NUM_PRIMARY_METATILES, NUM_PRIMARY_PALS, GENERAL_ANIMS,
    loadTileset, tileAnim, metatile, drawTile, render, animCells, writeAnimSheet, frBehavior, tilesetFolder };
};
