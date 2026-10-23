// Draws a map in FireRed's style from what each of its tiles is: the painter
// that lets any region (Johto, and those to come) look like Kanto, whatever
// game its layout comes from. Styles: "outdoor" (Kanto's towns and routes)
// and "cave" (its caves). tools/build-fr-style.js learned, from Kanto's own
// maps, which of FireRed's General metatiles goes on a tile of each class
// given its neighbours' classes (tools/data/fr-style.json); here each tile
// gets the metatile of the closest pattern Kanto has.
//
//   const Painter = require("./lib/fr-painter");
//   const blocks = Painter.paint(classes, width, height, style)   // classes: a class a tile ("grass", "tree", ...)
//   const pic = Painter.render(blocks, width, height, skip, style) // -> { below, above, anim } (RGBA, as Kanto's maps)
//   const pic = Painter.compose(classes, width, height, { buildings, signs, style })
//       the whole map: the ground painted, and each building a stamp of
//       Kanto's (tools/build-fr-style.js) fitted to it, its door on the door;
//       buildings: [{ door: [x, y], tiles: [[x, y], ...], kind }] (kind:
//       pokecenter, mart, gym, house, lab, dept, tower, gate); signs: [[x, y, "tips" | "sign"]]
//       -> { below, above, anim: { cells, pics }, anims, placed: [{ stamp, x, y }] }
//
// Classes: grass, flowers, path, sand, pavement, bridge, tallgrass, water, waterfall, waterrock, tree,
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

// Each style's patterns (outdoor: Kanto's towns and routes; cave: its caves).
const STYLES = {};
for (const [name, st] of Object.entries(STYLE.styles)) {
  const patterns = {};
  for (const [cls, list] of Object.entries(st.patterns)) {
    patterns[cls] = list.map(([key, counts]) => {
      const [parity, n] = key.split("|");
      return { px: +parity[0], py: +parity[1], n: n.split(","), counts };
    });
  }
  STYLES[name] = { primary: st.primary, secondary: st.secondary, patterns, memo: new Map() };
}

// The metatile for a tile of class `c` at (x, y) with neighbours `n` (8 classes, from north, clockwise),
// in style `s`.
function pick(s, c, x, y, n) {
  const patterns = s.patterns, memo = s.memo;
  if (!patterns[c]) c = STAND_IN[c] && patterns[STAND_IN[c]] ? STAND_IN[c] : Object.keys(patterns)[0];
  const key = c + (x & 1) + (y & 1) + n.join(",");
  if (memo.has(key)) return memo.get(key);
  let best = -1, counts = {};
  for (const p of patterns[c]) {
    let sc = (p.px === (x & 1) ? 1.5 : 0) + (p.py === (y & 1) ? 1.5 : 0);
    for (let k = 0; k < 8; k++) sc += WEIGHT[k] * like(p.n[k], n[k]);
    if (sc > best + 1e-9) { best = sc; counts = Object.assign({}, p.counts); }
    else if (Math.abs(sc - best) < 1e-9) for (const [id, k] of Object.entries(p.counts)) counts[id] = (counts[id] || 0) + k;
  }
  const id = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  memo.set(key, id);
  return id;
}

// (A few classes are one metatile, and look like another to their neighbours.)
const SINGLE = { flowers: [4, "grass"], lonetree: [5, "grass"] };
// (A forest's deep inside, tools/lib/hgss-classes.js's thinForests: plain grass, as FireRed's, in its own two-by-two pattern.)
const MEADOW = [[17, 16], [9, 17]];   // [x & 1][y & 1]
const seenAs = { waterfall: "water", meadow: "grass" };
// -> blocks: a metatile id a tile (or null: a building's or object's), and
// `outdoor`: the tiles drawn in the outdoor style because `style` has nothing
// of their class (a cave's water).
// (parity: [dx, dy], shifting which tiles count as odd, for a map whose 2x2 trees sit a tile off Kanto's.)
// (neighbourAs: { class: class } a neighbour is taken for, as a building for a tree, beside the ground.)
function paint(classes, w, h, style, parity, neighbourAs) {
  const [px, py] = parity || [0, 0];
  const s = STYLES[style || "outdoor"], fallback = STYLES.outdoor;
  const seen = (c) => (neighbourAs && neighbourAs[c]) || (SINGLE[c] ? SINGLE[c][1] : seenAs[c] || c);
  const at = (x, y) => seen(classes[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]);
  const blocks = new Array(w * h).fill(null), outdoor = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = classes[y * w + x];
    if (c === "building" || c === "object" || c == null) continue;
    if (c === "meadow") { blocks[y * w + x] = MEADOW[x & 1][y & 1]; continue; }
    if (SINGLE[c]) { blocks[y * w + x] = SINGLE[c][0]; continue; }
    // (A waterfall: FireRed's General tileset's, a column's top, middle and foot.)
    if (c === "waterfall") {
      outdoor.add(y * w + x);
      blocks[y * w + x] = classes[(y - 1) * w + x] !== "waterfall" ? 295 : classes[(y + 1) * w + x] !== "waterfall" ? 311 : 303;
      continue;
    }
    const own = s.patterns[c] || s.patterns[STAND_IN[c]];
    if (!own && s !== fallback) outdoor.add(y * w + x);
    blocks[y * w + x] = pick(own ? s : fallback, c, x + px, y + py, NEIGHBOURS.map(([dx, dy]) => at(x + dx, y + dy)));
  }
  blocks.outdoor = outdoor;
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


// A building of Kanto's stretched to a footprint (the nine-slice way: the
// columns beside its door and the rows above it repeated, or dropped, to fit)
// when no stamp's size does: Johto's buildings aren't Kanto's sizes. The
// stamp's door goes on the building's, so what's beside it grows or shrinks.
// -> a stamp-like { kind, w, h, door, blocks (null off the footprint), primary, secondary }
function stretch(b, classes, w, h) {
  const foot = new Set(b.tiles.map(([x, y]) => y * w + x));
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const [x, y] of b.tiles) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const kinds = KIND_FALLBACK[b.kind] || ["house"];
  const W0 = x1 - x0 + 1, H0 = y1 - y0 + 1;
  // The stamp whose width is nearest (HGSS's solid part is often only a building's foot: its roof overhangs, so its height is no guide).
  let base = null, bestCost = 1e9;
  for (const st of STYLE.stamps) {
    const pref = kinds.indexOf(st.kind);
    if (pref < 0 || st.w < 3 || st.h < 3 || st.door[0] < 1) continue;
    const cost = pref * 6 + Math.abs(W0 - st.w) + (st.h > H0 + 4 ? (st.h - H0 - 4) * 0.7 : 0) + (st.h < H0 ? (H0 - st.h) * 1.5 : 0)
      + Math.abs((b.door[0] - x0) - st.door[0]) * 1.2 + Math.abs((x1 - b.door[0]) - (st.w - 1 - st.door[0])) * 1.2;
    if (cost < bestCost) { bestCost = cost; base = st; }
  }
  if (!base) return null;
  // The size drawn: at least the footprint, and at least a small building's (4 x 4), its roof rising above the footprint.
  const W = Math.max(W0, 4), H = Math.max(H0, Math.min(base.h, 5), 4);
  const left = Math.min(b.door[0] - x0, Math.floor((W - W0) / 2) + b.door[0] - x0), dxo = b.door[0] - (x0 - Math.floor((W - W0) / 2));
  const bx0 = x0 - Math.floor((W - W0) / 2), by0 = y1 - H + 1;
  const dx = b.door[0] - bx0, dy = b.door[1] - by0;
  if (dx < 1 || dy < 1 || bx0 < 0 || by0 < 0 || bx0 + W > w) return null;
  // Source index for each target index along one axis: `at` is the door's, `n` the target length,
  // `m` the source's, `d` its door's. Before the door the source's first index stays and the rest repeat
  // its second (or drop from the middle); after it the same from the door.
  const axis = (n, m, d, at, minRepeat) => {
    // (A side with fewer than `minRepeat` source indexes has no middle to repeat: padded with -1, nothing, beyond its outer edge.)
    const side = (len, from0, to, padFront) => {
      const src = []; for (let i = from0; i < to; i++) src.push(i);
      while (src.length > len && src.length > 1) src.splice(padFront ? Math.max(1, src.length >> 1) : Math.max(0, src.length - 2), 1);
      while (src.length < len) {
        if (src.length >= minRepeat) src.splice(1, 0, src[1]);
        else if (padFront) src.unshift(-1); else src.push(-1);
      }
      return src.slice(0, len);
    };
    const a = side(at, 0, d, true), z = side(n - at, d, m, false);
    return Array.from({ length: n }, (_, i) => (i < at ? a[i] : z[i - at]));
  };
  const cols = axis(W, base.w, base.door[0], dx, 3), rows = axis(H, base.h, base.door[1], dy, 2);
  const blocks = new Array(W * H).fill(null);
  const NOT = new Set(["water", "waterfall", "waterrock", "bridge"]);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = (by0 + j) * w + bx0 + i;
    if (!foot.has(k) && (NOT.has(classes[k]) || (by0 + j) > y1)) continue;
    blocks[j * W + i] = rows[j] < 0 || cols[i] < 0 ? null : base.blocks[rows[j] * base.w + cols[i]];
  }
  return { kind: base.kind, from: base.from, w: W, h: H, door: [dx, dy], blocks, primary: base.primary, secondary: base.secondary, ox: bx0, oy: by0, stretched: true };
}

// The whole map: ground, buildings, signs.
const SIGN_METATILES = { sign: 3, tips: 2, object: 5 };
function compose(classes, w, h, opts) {
  opts = opts || {};
  classes = classes.slice();
  const placed = [], covered = new Map();
  // (opts.minScore: a stamp that fits worse than this isn't used, and the
  // building is left for HGSS's own picture: tools/build-johto.js. opts.noFill:
  // no made-up buildings on the rest of a footprint, or on buildings with no
  // door: the ground round them instead, for that picture to stand on.)
  const place = (b) => {
    let f = fit(b, classes, w, h);
    // (A stamp that leaves much of the building's footprint bare isn't it: stretch one to fit.)
    let coverage = 1;
    if (f) {
      const foot = new Set(b.tiles.map(([x, y]) => y * w + x));
      let n = 0;
      for (let j = 0; j < f.stamp.h; j++) for (let i = 0; i < f.stamp.w; i++) if (f.stamp.blocks[j * f.stamp.w + i] != null && foot.has((f.y + j) * w + f.x + i)) n++;
      coverage = n / Math.max(1, foot.size);
    }
    if ((!f || coverage < 0.8 || (opts.minScore != null && f.score < opts.minScore)) && opts.stretch) {
      const st = stretch(b, classes, w, h);
      f = st && { stamp: st, x: st.ox, y: st.oy, score: 99 };
    }
    if (process.env.DUMP_BUILDINGS) console.log("building", b.kind, b.dest || "(none)", "door", b.door.join(","), "tiles", b.tiles.length, f ? (f.stamp.stretched ? "stretched " : "stamp ") + f.stamp.kind + " score " + f.score.toFixed(1) : "none");
    if (!f || (opts.minScore != null && f.score < opts.minScore)) return;
    placed.push(f);
    const st = f.stamp;
    for (let j = 0; j < st.h; j++) for (let i = 0; i < st.w; i++) {
      const x = f.x + i, y = f.y + j;
      if (st.blocks[j * st.w + i] == null || x < 0 || y < 0 || x >= w || y >= h) continue;
      covered.set(y * w + x, { stamp: st, i, j });
      classes[y * w + x] = "building";
    }
    // (The rest of its footprint, a big building's: more of Kanto's buildings.)
    if (!opts.noFill) fill(new Set(b.tiles.map(([x, y]) => y * w + x).filter((i) => !covered.has(i))));
  };
  const taken = new Set();
  for (const b of opts.buildings || []) { for (const [x, y] of b.tiles) taken.add(y * w + x); place(b); }
  if (opts.stretch) {
    // (Buildings with no door, a city's blocks and houses: stretched stamps too, a door on the bottom row in the middle.
    // Not what's left of one with a door, a tile beside a stamp.)
    const nearStamp = (k) => { const x = k % w, y = Math.floor(k / w); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (covered.has((y + dy) * w + x + dx)) return true; return false; };
    const seen = new Set(), extra = [];
    for (let i0 = 0; i0 < w * h; i0++) {
      if (classes[i0] !== "building" || covered.has(i0) || taken.has(i0) || seen.has(i0)) continue;
      const cells = [], q = [i0]; seen.add(i0);
      let touching = false;
      while (q.length) {
        const k = q.pop(); cells.push([k % w, Math.floor(k / w)]);
        if (nearStamp(k)) touching = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const u = (k % w) + dx, v = Math.floor(k / w) + dy, n = v * w + u;
          if (u < 0 || v < 0 || u >= w || v >= h || classes[n] !== "building" || covered.has(n) || taken.has(n) || seen.has(n)) continue;
          seen.add(n); q.push(n);
        }
      }
      // (Small things, a bridge's posts and the like, aren't buildings.)
      const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
      if (touching || cells.length < 6 || Math.max(...xs) - Math.min(...xs) < 2 || Math.max(...ys) - Math.min(...ys) < 2) continue;
      const bottom = Math.max(...ys), row = cells.filter(([, y]) => y === bottom).map(([x]) => x).sort((a, b) => a - b);
      extra.push({ door: [row[row.length >> 1], bottom], tiles: cells, kind: cells.length >= 36 ? "dept" : "house", pseudo: true });
    }
    for (const b of extra) place(b);
  }
  // Buildings with no door (a city's blocks): Kanto's buildings too.
  if (!opts.noFill) fill(new Set([...classes.keys()].filter((i) => classes[i] === "building" && !covered.has(i))));
  else {
    // (The ground round them, the commonest walkable class next door, spreading in.)
    for (let pass = 0; pass < 24; pass++) {
      const todo = [...classes.keys()].filter((i) => (classes[i] === "building" || classes[i] === "object") && !covered.has(i));
      if (!todo.length) break;
      let changed = false;
      for (const i of todo) {
        const x = i % w, y = Math.floor(i / w), votes = {};
        for (const [dx, dy] of NEIGHBOURS) { const u = x + dx, v = y + dy; if (u < 0 || v < 0 || u >= w || v >= h) continue; const c = classes[v * w + u]; if (WALKABLE.has(c) && c !== "water") votes[c] = (votes[c] || 0) + 1; }
        const best = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
        if (best) { classes[i] = best[0]; changed = true; }
      }
      if (!changed) { for (const i of todo) classes[i] = "grass"; break; }
    }
  }
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
  const blocks = paint(classes, w, h, opts.style, opts.parity, opts.neighbourAs);
  const signAt = new Map((opts.signs || []).map(([x, y, kind]) => [y * w + x, kind]));
  for (let i = 0; i < w * h; i++) if (classes[i] === "object") blocks[i] = SIGN_METATILES[signAt.get(i) || "object"];
  // The ground and signs, then each stamp's metatiles over it (with their own tilesets).
  const shown = blocks.map((b, i) => (covered.has(i) ? 1 : b));
  shown.outdoor = blocks.outdoor;
  const pic = render(shown, w, h, [...covered.keys()], opts.style);
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

// The metatiles drawn, with the style's tilesets (a town's tileset beside the
// General one for its shared palettes outdoors): below and above sprites, and
// the animated water cells. (`skip`: tiles something else is drawn over;
// their animated cells are left out. Tiles in blocks.outdoor: drawn with the
// outdoor style's tilesets.)
const loaded = {};
const tilesetOf = (name) => loaded[name] || (loaded[name] = T.loadTileset(name));
function render(blocks, w, h, skip, style) {
  const s = STYLES[style || "outdoor"];
  const primary = tilesetOf(s.primary), secondary = tilesetOf(s.secondary);
  const ids = blocks.map((b) => (b == null ? 1 : b));
  const { below, above } = T.renderBlocks(ids, w, h, primary, secondary, false);
  const anim = T.animCells(ids, w, h, primary, secondary);
  const outdoor = blocks.outdoor && s !== STYLES.outdoor ? blocks.outdoor : new Set();
  if (outdoor.size) {
    const o = STYLES.outdoor, other = T.renderBlocks(ids, w, h, tilesetOf(o.primary), tilesetOf(o.secondary), false);
    for (const i of outdoor) {
      const x0 = (i % w) * 16, y0 = Math.floor(i / w) * 16;
      for (let y = 0; y < 16; y++) {
        const k = ((y0 + y) * w * 16 + x0) * 4;
        below.set(other.below.subarray(k, k + 64), k); above.set(other.above.subarray(k, k + 64), k);
      }
    }
  }
  const out = new Set([...(skip || []), ...outdoor]);
  if (out.size) {
    const cells = [], pics = [];
    for (let k = 0; k < anim.cells.length; k += 4) {
      const [cx, cy, first, mask] = anim.cells.slice(k, k + 4);
      const n = (k + 4 < anim.cells.length ? anim.cells[k + 6] : anim.pics.length) - first;
      if (out.has((cy >> 1) * w + (cx >> 1))) continue;
      cells.push(cx, cy, pics.length, mask);
      for (let p = 0; p < n; p++) pics.push(anim.pics[first + p]);
    }
    anim.cells = cells; anim.pics = pics;
  }
  return { below, above, anim, anims: primary.anims.map((a) => a.name) };
}

module.exports = { paint, render, compose, fit, styles: Object.keys(STYLES), stamps: STYLE.stamps };
