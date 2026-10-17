// FireRed's tilesets (this repo's assets/tilesets: FireRed's tiles, palettes,
// metatiles and their attributes) and drawing metatiles with them, shared by
// tools/build-maps.js (Kanto) and tools/lib/fr-painter.js (the other regions,
// drawn in FireRed's style).
//
//   const T = require("./lib/fr-tiles");
//   const primary = T.loadTileset("gTileset_General"), secondary = T.loadTileset("gTileset_PalletTown");
//   T.renderBlocks(blocks, w, h, primary, secondary, flatten)   // -> { below, above, anyAbove } (RGBA)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./png");

const root = path.join(__dirname, "../..");


const NUM_PRIMARY_TILES = 640, NUM_PRIMARY_METATILES = 640, NUM_PRIMARY_PALS = 7;


function tilesetDir(symbol) {
  const snake = { gTileset_SSAnne: "ss_anne" }[symbol] ||
    symbol.replace(/^gTileset_/, "").replace(/([a-z])([A-Z0-9])/g, "$1_$2").replace(/([0-9])([A-Z])/g, "$1_$2").toLowerCase();
  for (const kind of ["primary", "secondary"]) {
    const dir = path.join(root, "assets/tilesets", kind, snake);
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error("No tileset folder for " + symbol + " (looked for " + snake + ")");
}

// Tilesets drawn with another's tiles and palettes (src/data/tilesets/headers.h:
// gTileset_SilphCo uses gTilesetTiles_Condominiums), by folder.
const SHARED_GRAPHICS = { silph_co: "condominiums" };
function loadTileset(symbol) {
  const dir = tilesetDir(symbol);
  const gfx = SHARED_GRAPHICS[path.basename(dir)] ? path.join(path.dirname(dir), SHARED_GRAPHICS[path.basename(dir)]) : dir;
  const meta = fs.readFileSync(path.join(dir, "metatiles.bin"));
  const attrs = fs.readFileSync(path.join(dir, "metatile_attributes.bin"));
  const palettes = [];
  for (let i = 0; i < 16; i++) {
    const f = path.join(gfx, "palettes", String(i).padStart(2, "0") + ".pal");
    palettes.push(fs.existsSync(f) ? readPal(f) : null);
  }
  const anims = (TILE_ANIMS[path.basename(dir)] || []).map((a) => Object.assign({}, a, {
    frames: Array.from({ length: a.frames }, (_, k) => readPng(path.join(dir, "anim", a.dir, k + ".png")))
  }));
  return { tiles: readPng(path.join(gfx, "tiles.png")), meta, attrs, palettes, anims };
}

// FireRed's tile animations (src/tileset_anims.c) on the General tileset:
// frames of anim/<dir>/<k>.png copied over tiles first.. (VRAM tile numbers),
// as ui/overworld.js times them.
const TILE_ANIMS = {
  general: [
    { name: "water", dir: "water_current_landwatersedge", first: 416, count: 48, frames: 8 },
    { name: "sand", dir: "sandwatersedge", first: 464, count: 18, frames: 8 },
    { name: "flower", dir: "flower", first: 508, count: 4, frames: 5 }
  ]
};
// The animation (index into the primary tileset's anims) a tile entry belongs to, or -1.
function tileAnim(entry, primary) {
  const idx = entry & 0x3ff;
  return idx < NUM_PRIMARY_TILES ? primary.anims.findIndex((a) => idx >= a.first && idx < a.first + a.count) : -1;
}

// A metatile's 8 tiles (4 below, 4 above), behaviour and layer type.
function metatile(primary, secondary, id) {
  const ts = id < NUM_PRIMARY_METATILES ? primary : secondary;
  const i = id < NUM_PRIMARY_METATILES ? id : id - NUM_PRIMARY_METATILES;
  const tiles = [];
  for (let k = 0; k < 8; k++) tiles.push(i * 16 + k * 2 + 1 < ts.meta.length ? ts.meta.readUInt16LE(i * 16 + k * 2) : 0);
  const attr = i * 4 + 3 < ts.attrs.length ? ts.attrs.readUInt32LE(i * 4) : 0;
  return { tiles, behavior: attr & 0x1ff, encounter: (attr >> 24) & 7, layer: (attr >>> 29) & 3 };
}

// Draws one 8x8 tile into an RGBA image. `frames`: an animated tile's frame
// per primary anim (else the tileset's own tile).
function drawTile(img, imgW, x0, y0, entry, primary, secondary, opaqueBackground, frames) {
  const idx = entry & 0x3ff, hflip = entry & 0x400, vflip = entry & 0x800, pal = entry >> 12;
  let sheet = (idx < NUM_PRIMARY_TILES ? primary : secondary).tiles;
  let t = idx < NUM_PRIMARY_TILES ? idx : idx - NUM_PRIMARY_TILES;
  const a = frames ? tileAnim(entry, primary) : -1;
  if (a >= 0) { sheet = primary.anims[a].frames[frames[a]]; t = idx - primary.anims[a].first; }
  const palette = (pal < NUM_PRIMARY_PALS ? primary : secondary).palettes[pal] || primary.palettes[0];
  const perRow = sheet.width / 8;
  const tx = (t % perRow) * 8, ty = Math.floor(t / perRow) * 8;
  if (ty >= sheet.height) return;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sx = tx + (hflip ? 7 - x : x), sy = ty + (vflip ? 7 - y : y);
      const c = sheet.px[sy * sheet.width + sx] & 15;
      const o = ((y0 + y) * imgW + x0 + x) * 4;
      if (c === 0 && !opaqueBackground) continue;
      const rgb = c === 0 ? primary.palettes[0][0] : palette[c];
      img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255;
    }
  }
}

// Layer types: 0 normal (top tiles over sprites), 1 covered (all under), 2 split.
function renderBlocks(blocks, w, h, primary, secondary, flatten) {
  const below = new Uint8ClampedArray(w * 16 * h * 16 * 4);
  const above = new Uint8ClampedArray(w * 16 * h * 16 * 4);
  let anyAbove = false;
  for (let by = 0; by < h; by++) {
    for (let bx = 0; bx < w; bx++) {
      const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
      for (let k = 0; k < 4; k++) {
        drawTile(below, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[k], primary, secondary, true);
      }
      const topGoesBelow = flatten || mt.layer === 1;
      for (let k = 0; k < 4; k++) {
        const target = topGoesBelow ? below : above;
        if (!topGoesBelow && (mt.tiles[4 + k] & 0x3ff)) anyAbove = true;
        drawTile(target, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[4 + k], primary, secondary, false);
      }
    }
  }
  return { below, above, anyAbove };
}

// The animated 8x8 cells of the part under sprites: each cell whose tiles
// (a metatile's bottom ones, and its top ones when they're drawn under
// sprites too) include animated ones, drawn in every combination of its anims'
// frames. -> { cells: [x, y, first, mask, ...] (x, y in 8x8 tiles; first:
// its first picture; mask: which anims, bit n = anim n), pics: the pictures }
function animCells(blocks, w, h, primary, secondary) {
  const cells = [], pics = [];
  if (!primary.anims.length) return { cells, pics };
  for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
    const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
    for (let q = 0; q < 4; q++) {
      const entries = [mt.tiles[q]].concat(mt.layer === 1 ? [mt.tiles[4 + q]] : []);
      const used = [...new Set(entries.map((e) => tileAnim(e, primary)).filter((a) => a >= 0))].sort();
      if (!used.length) continue;
      const mask = used.reduce((m, a) => m | (1 << a), 0);
      cells.push(bx * 2 + (q & 1), by * 2 + (q >> 1), pics.length, mask);
      // Every combination, the first anim's frame changing fastest.
      const combos = used.reduce((n, a) => n * primary.anims[a].frames.length, 1);
      for (let c = 0; c < combos; c++) {
        const frames = primary.anims.map(() => 0);
        let rest = c;
        for (const a of used) { const n = primary.anims[a].frames.length; frames[a] = rest % n; rest = Math.floor(rest / n); }
        const pic = new Uint8ClampedArray(8 * 8 * 4);
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


module.exports = { NUM_PRIMARY_TILES, NUM_PRIMARY_METATILES, NUM_PRIMARY_PALS, tilesetDir, loadTileset, tileAnim, metatile, drawTile,
  renderBlocks, animCells, writeAnimSheet };
