// Draws a map in FireRed's style from what each of its tiles is: the painter
// that lets any region (Johto, and those to come) look like Kanto, whatever
// game its layout comes from. tools/build-fr-style.js learned, from Kanto's own
// maps, which of FireRed's General metatiles goes on a tile of each class
// given its neighbours' classes (tools/data/fr-style.json); here each tile
// gets the metatile of the closest pattern Kanto has.
//
//   const Painter = require("./lib/fr-painter");
//   const blocks = Painter.paint(classes, width, height)   // classes: a class a tile ("grass", "tree", ...)
//   const pic = Painter.render(blocks, width, height)      // -> { below, above, anim } (RGBA, as Kanto's maps)
//   const pic = Painter.compose(classes, width, height, { buildings, signs })
//       the whole map: the ground painted, and each building a stamp of
//       Kanto's (tools/build-fr-style.js) fitted to it, its door on the door;
//       buildings: [{ door: [x, y], tiles: [[x, y], ...], kind }] (kind:
//       pokecenter, mart, gym, house, lab, dept, tower, gate); signs: [[x, y, "tips" | "sign"]]
//       -> { below, above, anim: { cells, pics }, anims, placed: [{ stamp, x, y }] }
//
// Classes: grass, flowers, path, sand, pavement, bridge, tallgrass, water, waterrock, tree,
// rock, fence, ledge_n / ledge_s / ledge_e / ledge_w, and building and object
// (which the painter leaves out, as null: stamps go there).
"use strict";

const fs = require("fs");
const path = require("path");
const T = require("./fr-tiles");

const STYLE = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/fr-style.json"), "utf8"));
const NEIGHBOURS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
// How much a neighbour counts: the four beside a tile more than the corners.
const WEIGHT = [4, 1, 4, 1, 4, 1, 4, 1];
// Classes that look alike from next door (half a match).
const LIKE = [["grass", "tallgrass"], ["path", "sand", "pavement", "bridge"], ["water", "waterrock"], ["tree", "rock", "fence", "building", "object"],
  ["ledge_s", "ledge_n", "ledge_e", "ledge_w"]];
const like = (a, b) => a === b ? 1 : LIKE.some((g) => g.includes(a) && g.includes(b)) ? 0.5 : 0;
// A class Kanto never has (as ledges facing up): drawn as its nearest.
const STAND_IN = { ledge_n: "ledge_s", object: "rock", building: "rock", bridge: "pavement" };

const patterns = {};
for (const [cls, list] of Object.entries(STYLE.patterns)) {
  patterns[cls] = list.map(([key, counts]) => {
    const [parity, n] = key.split("|");
    return { px: +parity[0], py: +parity[1], n: n.split(","), counts };
  });
}

// The metatile for a tile of class `c` at (x, y) with neighbours `n` (8 classes, from north, clockwise).
const memo = new Map();
function pick(c, x, y, n) {
  if (!patterns[c]) c = STAND_IN[c] || "grass";
  const key = c + (x & 1) + (y & 1) + n.join(",");
  if (memo.has(key)) return memo.get(key);
  let best = -1, counts = {};
  for (const p of patterns[c]) {
    let s = (p.px === (x & 1) ? 1.5 : 0) + (p.py === (y & 1) ? 1.5 : 0);
    for (let k = 0; k < 8; k++) s += WEIGHT[k] * like(p.n[k], n[k]);
    if (s > best + 1e-9) { best = s; counts = Object.assign({}, p.counts); }
    else if (Math.abs(s - best) < 1e-9) for (const [id, k] of Object.entries(p.counts)) counts[id] = (counts[id] || 0) + k;
  }
  const id = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  memo.set(key, id);
  return id;
}

// (A few classes are one metatile, and look like another to their neighbours.)
const SINGLE = { flowers: [4, "grass"] };
function paint(classes, w, h) {
  const seen = (c) => (SINGLE[c] ? SINGLE[c][1] : c);
  const at = (x, y) => seen(classes[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]);
  const blocks = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = classes[y * w + x];
    if (c === "building" || c === "object" || c == null) continue;
    blocks[y * w + x] = SINGLE[c] ? SINGLE[c][0] : pick(c, x, y, NEIGHBOURS.map(([dx, dy]) => at(x + dx, y + dy)));
  }
  return blocks;
}

// ---------- Stamps ----------

// Kinds a building may borrow when Kanto has none of its own that fits.
const KIND_FALLBACK = { pokecenter: ["pokecenter"], mart: ["mart"], gym: ["gym", "dept"], lab: ["lab", "dept", "house"],
  dept: ["dept", "lab", "tower"], tower: ["tower", "dept"], gate: ["gate", "dept", "house"], house: ["house", "lab"] };
const WALKABLE = new Set(["grass", "flowers", "path", "sand", "pavement", "bridge", "tallgrass", "water", "ledge_n", "ledge_s", "ledge_e", "ledge_w"]);
// The stamp, and where, that best fits a building: as much of its footprint
// covered and as little else as can be, its door on the door (or, for one with
// none that fits, anywhere over the footprint).
function fit(b, classes, w, h) {
  const foot = new Set(b.tiles.map(([x, y]) => y * w + x));
  let best = null;
  const kinds = KIND_FALLBACK[b.kind] || ["house"];
  for (const st of STYLE.stamps) {
    const pref = kinds.indexOf(st.kind);
    if (pref < 0) continue;
    const origins = [[b.door[0] - st.door[0], b.door[1] - st.door[1], 0]];
    if (b.anywhere) for (const [x, y] of b.tiles) origins.push([x, y, -2]);
    for (const [ox, oy, bonus] of origins) {
      let s = bonus - pref * 3, covered = 0;
      for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) {
        if (st.blocks[j * st.w + i] == null) continue;
        const x = ox + i, y = oy + j;
        if (x < 0 || y < 0 || x >= w || y >= h) { s -= 3; continue; }
        if (foot.has(y * w + x)) { s += 1; covered++; } else s -= WALKABLE.has(classes[y * w + x]) ? 3 : 0.5;
      }
      s -= 0.3 * (foot.size - covered);
      if (!best || s > best.score) best = { stamp: st, x: ox, y: oy, score: s };
    }
  }
  return best;
}

// The whole map: ground, buildings, signs.
const SIGN_METATILES = { sign: 3, tips: 2, object: 5 };
function compose(classes, w, h, opts) {
  opts = opts || {};
  classes = classes.slice();
  const placed = [], covered = new Map();
  for (const b of opts.buildings || []) {
    const f = fit(b, classes, w, h);
    if (!f) continue;
    placed.push(f);
    const st = f.stamp;
    for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) {
      const x = f.x + i, y = f.y + j;
      if (st.blocks[j * st.w + i] == null || x < 0 || y < 0 || x >= w || y >= h) continue;
      covered.set(y * w + x, { stamp: st, i, j });
      classes[y * w + x] = "building";
    }
    // (The rest of its footprint, a big building's: more of Kanto's buildings.)
    fill(new Set(b.tiles.map(([x, y]) => y * w + x).filter((i) => !covered.has(i))));
  }
  // Buildings with no door (a city's blocks): Kanto's buildings too.
  fill(new Set([...classes.keys()].filter((i) => classes[i] === "building" && !covered.has(i))));
  // As many of Kanto's buildings as fit wholly on `left`, biggest first; the
  // rest trees, as round a building in Kanto.
  function fill(left) {
    for (let tries = 0; tries < 40 && left.size >= 6; tries++) {
      let best = null;
      for (const st of STYLE.stamps) {
        // (Not a Pokémon Center, Mart or Gym: one where there's none would mislead.)
        if (!["house", "dept", "lab", "tower"].includes(st.kind)) continue;
        const cells = [];
        for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) if (st.blocks[j * st.w + i] != null) cells.push([i, j]);
        for (const k of left) {
          const ox = (k % w), oy = Math.floor(k / w);
          if (!cells.every(([i, j]) => left.has((oy + j) * w + ox + i) && ox + i < w)) continue;
          if (!best || cells.length > best.n) best = { stamp: st, x: ox, y: oy, n: cells.length, score: 0 };
        }
      }
      if (!best) break;
      placed.push(best);
      const st = best.stamp;
      for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) {
        if (st.blocks[j * st.w + i] == null) continue;
        const k = (best.y + j) * w + best.x + i;
        covered.set(k, { stamp: st, i, j }); classes[k] = "building"; left.delete(k);
      }
    }
    for (const k of left) classes[k] = "tree";
  }
  const blocks = paint(classes, w, h);
  const signAt = new Map((opts.signs || []).map(([x, y, kind]) => [y * w + x, kind]));
  for (let i = 0; i < w * h; i++) if (classes[i] === "object") blocks[i] = SIGN_METATILES[signAt.get(i) || "object"];
  // The ground and signs, then each stamp's metatiles over it (with their own tilesets).
  const pic = render(blocks.map((b, i) => (covered.has(i) ? 1 : b)), w, h, [...covered.keys()]);
  const cache = {};
  const tileset = (s) => cache[s] || (cache[s] = T.loadTileset(s));
  for (const [i, { stamp: st, i: si, j: sj }] of covered) {
    const b = st.blocks[sj * st.w + si];
    const one = T.renderBlocks([b & 0x3ff], 1, 1, tileset(st.primary), tileset(st.secondary), false);
    const x0 = (i % w) * 16, y0 = Math.floor(i / w) * 16;
    for (let y = 0; y < 16; y++) {
      pic.below.set(one.below.subarray(y * 64, y * 64 + 64), ((y0 + y) * w * 16 + x0) * 4);
      pic.above.set(one.above.subarray(y * 64, y * 64 + 64), ((y0 + y) * w * 16 + x0) * 4);
    }
  }
  return Object.assign(pic, { placed, classes });
}

// The General tileset's metatiles drawn (a town's tileset beside it for its
// shared palettes): below and above sprites, and the animated water cells.
let tilesets = null;
// (`skip`: tiles something else is drawn over; their animated cells are left out.)
function render(blocks, w, h, skip) {
  tilesets = tilesets || { primary: T.loadTileset("gTileset_General"), secondary: T.loadTileset("gTileset_PalletTown") };
  const ids = blocks.map((b) => (b == null ? 1 : b));
  const { below, above } = T.renderBlocks(ids, w, h, tilesets.primary, tilesets.secondary, false);
  const anim = T.animCells(ids, w, h, tilesets.primary, tilesets.secondary);
  if (skip && skip.length) {
    const out = new Set(skip), cells = [], pics = [];
    for (let k = 0; k < anim.cells.length; k += 4) {
      const [cx, cy, first, mask] = anim.cells.slice(k, k + 4);
      if (out.has((cy >> 1) * w + (cx >> 1))) continue;
      const n = (k + 4 < anim.cells.length ? anim.cells[k + 6] : anim.pics.length) - first;
      cells.push(cx, cy, pics.length, mask);
      for (let p = 0; p < n; p++) pics.push(anim.pics[first + p]);
    }
    anim.cells = cells; anim.pics = pics;
  }
  return { below, above, anim, anims: tilesets.primary.anims.map((a) => a.name) };
}

module.exports = { paint, render, compose, fit, classes: STYLE.classes, stamps: STYLE.stamps };
