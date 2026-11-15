// Kalos caves and dungeons, drawn by hand. See README.md ("Caves and trial sites").
// Each cave is dug out of solid rock from a list of shapes (discs, passages, rectangles); the rock gets its own
// colour and face, and the set-pieces (crystals, mirrors, rails, ice, ruins) are painted on top.
"use strict";
const T = 16;
const WHITE = [246, 248, 252], INK = [34, 32, 44];
const sh = (c, f) => [0, 1, 2].map((k) => Math.max(0, Math.min(255, Math.round(c[k] * f))));
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));
const A = (c, a) => [c[0], c[1], c[2], a];

// ---------------------------------------------------------------- shapes (tile coordinates; a tile is its index)
const D = (cx, cy, rx, ry = rx) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const S = (ax, ay, bx, by, w = 1.2) => (x, y) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= w; };
const R = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

// Dig the cave: every tile no shape covers becomes rock. `st`: rock (colour of the rock mass, or null for the plain
// cave rock), face (colour of the rock face above floor), wet (shapes of existing water, left alone), deco(c, x, y, k)
// (called for every face tile, to hang things on the wall), floor (tile kind), tint (a wash over the floor), pools
// (shapes of new water inside the floor). Returns isOpen(x, y).
function dig(p, shapes, st = {}) {
  const W = p.W, H = p.H, open = new Uint8Array(W * H), wet = new Uint8Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (shapes.some((f) => f(x, y))) open[y * W + x] = 1; if ((st.wet || []).some((f) => f(x, y))) wet[y * W + x] = 1; }
  for (const q of [...p.warps, ...p.people]) open[q.y * W + q.x] = 1;
  // Scraps of floor that only touch the cave at a corner (or sit cut off behind a pool) are rock after all.
  const pool = (x, y) => (st.pools || []).some((f) => f(x, y)), mark = new Uint8Array(W * H), anchor = new Set([...p.warps, ...p.people].map((q) => q.y * W + q.x));
  for (let s = 0; s < W * H; s++) {
    if (!open[s] || mark[s] || pool(s % W, (s / W) | 0)) continue;
    const q = [s]; mark[s] = 1; let fixed = false;
    for (let k = 0; k < q.length; k++) { if (anchor.has(q[k])) fixed = true; for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= W * H || mark[j] || !open[j] || pool(j % W, (j / W) | 0)) continue; mark[j] = 1; q.push(j); } }
    if (q.length < 8 && !fixed) for (const i of q) open[i] = 0;
  }
  // And a stub of rock of a tile or three left between two shapes is floor.
  mark.fill(0);
  for (let s = 0; s < W * H; s++) {
    if (open[s] || wet[s] || mark[s]) continue;
    const q = [s]; mark[s] = 1;
    for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= W * H || (Math.abs(d) === 1 && ((j / W) | 0) !== ((q[k] / W) | 0)) || mark[j] || open[j] || wet[j]) continue; mark[j] = 1; q.push(j); }
    if (q.length <= 3) for (const i of q) open[i] = 1;
  }
  // (The floor is laid tile by tile, so the builder adds no rock clumps of its own to it.)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (wet[y * W + x]) continue; if (!open[y * W + x]) p.fill("border", x, y, x, y); else if (pool(x, y)) p.fill("water", x, y, x, y); else p.fill(st.floor || "caveFloor", x, y, x, y); }
  const isOpen = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (open[y * W + x] || wet[y * W + x]) === 1;
  const face = st.face || [150, 112, 84], dark = sh(face, 0.55);
  p.paint(0, (c) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (isOpen(x, y)) { if (st.tint && !wet[y * W + x] && !pool(x, y)) c.rect(x * T, y * T, T, T, st.tint); continue; }
      const X = x * T, Y = y * T;
      if (st.rock) { c.rect(X, Y, T, T, st.rock); for (let k = 0; k < 3; k++) { const hx = Math.floor(p.hash(x, y, 11 + k) * 13), hy = Math.floor(p.hash(x, y, 21 + k) * 13); c.rect(X + hx, Y + hy, 3, 2, k ? sh(st.rock, 1.25) : sh(st.rock, 0.7)); } }
      if (isOpen(x, y + 1)) {
        c.rect(X, Y, T, T, face); c.rect(X, Y, T, 3, sh(face, 1.3)); c.rect(X, Y + 3, T, 1, sh(face, 1.1)); c.rect(X, Y + 12, T, 4, dark);
        for (let k = 0; k < 3; k++) { const dx = Math.floor(p.hash(x, y, k + 1) * 14); c.rect(X + dx, Y + 4, 1, 4 + Math.floor(p.hash(x, y, k + 5) * 6), sh(face, 0.75)); }
        if (!isOpen(x - 1, y + 1) && !isOpen(x - 1, y)) c.rect(X, Y, 1, T, dark); if (!isOpen(x + 1, y + 1) && !isOpen(x + 1, y)) c.rect(X + 15, Y, 1, T, dark);
      } else {
        if (isOpen(x - 1, y)) c.rect(X, Y, 3, T, dark); if (isOpen(x + 1, y)) c.rect(X + 13, Y, 3, T, dark); if (isOpen(x, y - 1)) c.rect(X, Y, T, 3, dark);
      }
    }
    if (st.deco) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isOpen(x, y) && isOpen(x, y + 1)) st.deco(c, x, y);
  });
  return isOpen;
}

// ---------------------------------------------------------------- ways in and out
// The way out at the bottom of a chamber: daylight (or lamp light) spilling in over a threshold.
function exitS(p, k, glow = [250, 240, 200]) {
  const w = p.warps[k]; p.bare(k);
  p.paint(w.y + 1, (c) => { const X = w.x * T, Y = w.y * T; c.rect(X - 4, Y + 4, 24, 14, [14, 12, 20]); c.poly([[X - 3, Y + 18], [X + 19, Y + 18], [X + 14, Y + 4], [X + 2, Y + 4]], A(glow, 170)); c.poly([[X + 1, Y + 18], [X + 15, Y + 18], [X + 12, Y + 8], [X + 4, Y + 8]], A(WHITE, 120)); c.rect(X - 6, Y + 1, 28, 3, [86, 74, 70]); });
}
// A passage in the wall above the warp: a dark arch with steps.
function exitN(p, k, stone = [110, 96, 92], glow = null) {
  const w = p.warps[k]; p.bare(k);
  p.paint(0.5, (c) => {
    const X = w.x * T, Y = (w.y - 1) * T;
    c.ellipse(X + 8, Y + 6, 12, 12, sh(stone, 0.7)); c.rect(X - 4, Y + 6, 24, 10, sh(stone, 0.7)); c.ellipse(X + 8, Y + 7, 9, 10, [14, 12, 20]); c.rect(X - 1, Y + 7, 18, 9, [14, 12, 20]);
    if (glow) { c.ellipse(X + 8, Y + 9, 6, 7, A(glow, 150)); c.rect(X + 2, Y + 9, 12, 7, A(glow, 150)); }
    for (let s = 0; s < 4; s++) { c.rect(X + 1, Y + T + s * 4, 14, 3, sh(stone, 1.25 - s * 0.08)); c.rect(X + 1, Y + T + s * 4 + 3, 14, 1, sh(stone, 0.6)); }
  });
}
// A way down in the floor: a pit with a ladder.
function pit(p, k, wood = [170, 124, 74]) {
  const w = p.warps[k]; p.bare(k);
  p.paint(0.5, (c) => { const X = w.x * T + 8, Y = w.y * T + 8; c.ellipse(X, Y, 10, 8, [70, 58, 56]); c.ellipse(X, Y + 1, 8, 6, [10, 8, 14]); c.rect(X - 4, Y - 9, 2, 14, wood); c.rect(X + 2, Y - 9, 2, 14, wood); for (let i = 0; i < 4; i++) c.rect(X - 4, Y - 7 + i * 4, 8, 1, sh(wood, 1.2)); });
}

// ---------------------------------------------------------------- props (tile coordinates)
function glow(c, cx, cy, r, col, a = 30) { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4 * 0.8, A(col, a)); }
function rock(p, x, y, col = [150, 130, 112]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 60]); c.poly([[X + 1, Y + 14], [X + 3, Y + 3], [X + 9, Y], [X + 14, Y + 5], [X + 15, Y + 14]], sh(col, 0.45)); c.poly([[X + 2, Y + 13], [X + 4, Y + 4], [X + 9, Y + 1], [X + 13, Y + 6], [X + 14, Y + 13]], col); c.poly([[X + 4, Y + 5], [X + 9, Y + 2], [X + 10, Y + 6], [X + 5, Y + 8]], sh(col, 1.25)); });
}
// A stalagmite (solid base, tip walked behind).
function spire(p, x, y, col, h = 30) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => {
    const X = x * T, Y = y * T + 14; c.ellipse(X + 8, Y, 8, 3, [0, 0, 0, 60]);
    for (const [cv, a, b] of [[c, 0, 14], [top, 14, h]]) { const wa = 7 * (1 - a / h), wb = 7 * (1 - b / h); cv.poly([[X + 7 - wa, Y - a], [X + 9 + wa, Y - a], [X + 9 + wb, Y - b], [X + 7 - wb, Y - b]], sh(col, 0.45)); cv.poly([[X + 8 - wa, Y - a], [X + 8 + wa, Y - a], [X + 8 + wb, Y - b], [X + 8 - wb, Y - b]], col); cv.poly([[X + 8 - wa, Y - a], [X + 8 - wa / 3, Y - a], [X + 8 - wb / 3, Y - b], [X + 8 - wb, Y - b]], sh(col, 1.25)); }
  });
}
// A cluster of crystals standing on the floor (solid), glowing.
function crystal(p, x, y, col, lit = 34) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => {
    const X = x * T, Y = y * T; if (lit) glow(c, X + 8, Y + 8, 20, col, lit); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 60]);
    for (const [dx, hgt, w] of [[3, 11, 3], [12, 13, 3], [8, 23, 4]]) { const cv = hgt > 16 ? top : c; cv.poly([[X + dx - w, Y + 13], [X + dx + w, Y + 13], [X + dx + w, Y + 13 - hgt * 0.7], [X + dx, Y + 13 - hgt], [X + dx - w, Y + 13 - hgt * 0.7]], sh(col, 0.6)); cv.poly([[X + dx - w + 1, Y + 12], [X + dx, Y + 12], [X + dx, Y + 14 - hgt], [X + dx - w + 1, Y + 14 - hgt * 0.7]], mix(col, WHITE, 0.45)); cv.poly([[X + dx, Y + 12], [X + dx + w - 1, Y + 12], [X + dx + w - 1, Y + 14 - hgt * 0.7], [X + dx, Y + 14 - hgt]], col); if (cv === top) c.box(X + dx - w, Y + 2, w * 2 + 1, 12, col, sh(col, 0.6)); }
  });
}
// Crystals growing out of a rock face tile (drawn inside dig's deco).
function seam(c, x, y, col, n = 3) {
  const X = x * T, Y = y * T; glow(c, X + 8, Y + 9, 15, col, 26);
  for (let k = 0; k < n; k++) { const dx = 3 + k * 5 - (n > 2 ? 0 : -2), h = 6 + ((x * 7 + y * 3 + k * 5) % 5); c.poly([[X + dx - 2, Y + 14], [X + dx + 2, Y + 14], [X + dx + 2, Y + 15 - h * 0.6], [X + dx, Y + 14 - h], [X + dx - 2, Y + 15 - h * 0.6]], sh(col, 0.65)); c.poly([[X + dx - 1, Y + 14], [X + dx, Y + 14], [X + dx, Y + 15 - h], [X + dx - 1, Y + 15 - h * 0.6]], mix(col, WHITE, 0.55)); c.rect(X + dx + 1, Y + 16 - h * 0.6, 1, h * 0.6 - 2, col); }
}
// Steps painted on walkable floor (tiles x0..x1, y0..y1), going up to the north.
function steps(c, x0, y0, x1, y1, col) {
  const X = x0 * T, W = (x1 - x0 + 1) * T; for (let y = y0 * T; y < (y1 + 1) * T; y += 4) { c.rect(X, y, W, 3, col); c.rect(X, y, W, 1, sh(col, 1.25)); c.rect(X, y + 3, W, 1, sh(col, 0.55)); } c.rect(X, y0 * T, 1, (y1 - y0 + 1) * T, sh(col, 0.55)); c.rect(X + W - 1, y0 * T, 1, (y1 - y0 + 1) * T, sh(col, 0.55));
}
// A ledge: a low rock lip along a row (solid), from x0 to x1.
function ledge(p, x0, x1, y, col) {
  p.block(x0, y, x1 - x0 + 1, 1);
  p.paint(y + 0.5, (c) => { const X = x0 * T, Y = y * T, W = (x1 - x0 + 1) * T; c.rect(X, Y + 2, W, 3, sh(col, 1.3)); c.rect(X, Y + 5, W, 8, col); c.rect(X, Y + 11, W, 2, sh(col, 0.55)); c.rect(X + 1, Y + 13, W - 2, 2, [0, 0, 0, 60]); for (let i = X + 3; i < X + W - 2; i += 6) c.rect(i + Math.floor(p.hash(i, y, 3) * 3), Y + 6, 1, 3 + Math.floor(p.hash(i, y, 4) * 3), sh(col, 0.72)); c.rect(X, Y + 2, 1, 11, sh(col, 0.55)); c.rect(X + W - 1, Y + 2, 1, 11, sh(col, 0.55)); });
}
// Mine rails through the tile points (walkable), a cart, and timber frames across a gallery.
function rails(c, pts) {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], hz = ay === by, n = (Math.abs(bx - ax) + Math.abs(by - ay)) * 4;
    for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (hz) c.rect(x - 1, y - 6, 2, 12, [112, 80, 54]); else c.rect(x - 6, y - 1, 12, 2, [112, 80, 54]); }
    const X0 = Math.min(ax, bx) * T + 8, Y0 = Math.min(ay, by) * T + 8, len = (Math.abs(bx - ax) + Math.abs(by - ay)) * T;
    for (const o of [-4, 3]) { if (hz) { c.rect(X0, Y0 + o, len, 2, [176, 180, 194]); c.rect(X0, Y0 + o + 1, len, 1, [92, 96, 112]); } else { c.rect(X0 + o, Y0, 2, len, [176, 180, 194]); c.rect(X0 + o + 1, Y0, 1, len, [92, 96, 112]); } }
  }
}
function cart(p, x, y, load) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 80]); c.box(X + 1, Y + 3, 14, 9, [104, 84, 76], INK); c.rect(X + 2, Y + 4, 12, 2, [150, 124, 104]); c.rect(X + 2, Y + 9, 12, 1, [70, 56, 52]); c.ellipse(X + 4, Y + 13, 2, 2, INK); c.ellipse(X + 12, Y + 13, 2, 2, INK); if (load) { c.ellipse(X + 8, Y + 3, 6, 3, load); c.ellipse(X + 6, Y + 2, 2, 1, mix(load, WHITE, 0.5)); } });
}
function timber(p, x, y, w) {
  p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T; for (const dx of [0, (w - 1) * T + 10]) { c.box(X + dx, Y - 8, 6, 24, [150, 108, 62], [70, 46, 30]); c.rect(X + dx + 1, Y - 7, 2, 22, [186, 142, 88]); } top.box(X - 2, Y - 14, w * T + 4, 7, [170, 124, 74], [70, 46, 30]); top.rect(X - 1, Y - 13, w * T + 2, 2, [204, 160, 104]); });
}
function lantern(p, x, y, col = [255, 214, 120]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T; glow(c, X, Y + 6, 26, col, 26); c.ellipse(X, Y + 13, 5, 2, [0, 0, 0, 70]); c.rect(X - 1, Y - 6, 2, 20, [90, 80, 80]); top.box(X - 4, Y - 14, 8, 9, col, INK); top.rect(X - 2, Y - 12, 3, 5, WHITE); top.rect(X - 5, Y - 16, 10, 2, [70, 60, 60]); });
}
function crate(p, x, y, col = [176, 132, 80]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 70]); c.box(X + 1, Y + 1, 14, 13, col, sh(col, 0.4)); c.rect(X + 2, Y + 2, 12, 2, sh(col, 1.25)); c.line(X + 2, Y + 3, X + 13, Y + 12, sh(col, 0.6), 1); c.line(X + 13, Y + 3, X + 2, Y + 12, sh(col, 0.6), 1); });
}
// A little bat hanging on a rock face tile.
function bat(c, x, y) { const X = x * T + 8, Y = y * T + 5; c.poly([[X - 6, Y], [X - 2, Y + 1], [X - 4, Y + 6]], [96, 76, 150]); c.poly([[X + 6, Y], [X + 2, Y + 1], [X + 4, Y + 6]], [96, 76, 150]); c.ellipse(X, Y + 3, 3, 4, [70, 110, 190]); c.rect(X - 2, Y - 1, 1, 2, [70, 110, 190]); c.rect(X + 1, Y - 1, 1, 2, [70, 110, 190]); c.p(X - 1, Y + 4, [255, 230, 120]); c.p(X + 1, Y + 4, [255, 230, 120]); }

const PLANS = {};
const BARE = { density: 0, groves: 0 };

// ---------------------------------------------------------------- Connecting Cave (Zubat Roost)
// Two terraces of brown rock: the Route 8 door on the upper shelf to the west, the Route 7 door down on the east,
// ledges and worn steps between them and Zubat hanging from the walls.
PLANS.KalosConnectingCave = {
  theme: BARE,
  plan(p) {
    const ROCK = [156, 118, 86];
    dig(p, [D(5, 19, 4, 3), S(5, 17, 8, 10, 1.6), D(8, 8, 5, 3.4), S(8, 7, 17, 7, 2), R(11, 4, 23, 23), D(27, 8, 4, 3), S(22, 8, 27, 8, 1.6), D(27, 20, 5, 3.6), S(22, 20, 27, 20, 2), S(27, 11, 28, 17, 1.4)], {
      face: ROCK, deco: (c, x, y) => { if (p.hash(x, y, 77) < 0.22) bat(c, x, y); },
    });
    exitN(p, 1, [130, 104, 84], [250, 240, 200]); exitS(p, 0);
    ledge(p, 11, 14, 13, ROCK); ledge(p, 17, 23, 13, ROCK); ledge(p, 11, 18, 18, ROCK); ledge(p, 21, 23, 18, ROCK);
    p.paint(0.2, (c) => { steps(c, 15, 13, 16, 13, [176, 140, 106]); steps(c, 19, 18, 20, 18, [176, 140, 106]); });
    for (const [x, y, h] of [[12, 5, 30], [22, 5, 26], [13, 16, 26], [21, 15, 28], [12, 22, 24], [22, 22, 28], [30, 17, 26], [4, 16, 24]]) spire(p, x, y, [170, 134, 100], h);
    for (const [x, y] of [[14, 10], [20, 11], [16, 21], [25, 22], [6, 21], [29, 7], [10, 6], [19, 15]]) rock(p, x, y, [160, 126, 96]);
  },
};

// ---------------------------------------------------------------- Glittering Cave
const GLITTER = [[110, 220, 250], [250, 130, 210], [140, 240, 160], [250, 226, 120], [190, 150, 255]];
const glit = (p, x, y) => GLITTER[Math.floor(p.hash(x, y, 91) * GLITTER.length) % GLITTER.length];
// The outer tunnels: a maze of narrow square-cut passages in the dark, lit only by the crystals in the walls.
PLANS.KalosGlitteringCave = {
  theme: BARE,
  plan(p) {
    dig(p, [R(18, 24, 19, 30), R(17, 28, 21, 30), R(8, 24, 29, 25), R(8, 17, 9, 25), R(28, 13, 29, 25), R(8, 17, 16, 18), R(15, 11, 16, 18), R(22, 19, 29, 20), R(22, 11, 23, 20), R(15, 11, 23, 12), R(18, 4, 19, 12), R(17, 4, 21, 5),
      R(3, 24, 9, 25), R(3, 20, 4, 25), R(3, 20, 5, 21), R(28, 13, 34, 14), R(33, 8, 34, 14), R(26, 8, 34, 9), R(26, 5, 27, 9), R(4, 10, 9, 11), R(8, 10, 9, 18), R(3, 5, 6, 11), R(10, 5, 14, 6), R(6, 5, 14, 6), R(29, 24, 34, 25), R(33, 19, 34, 29), R(24, 28, 34, 29), R(11, 28, 14, 30), R(13, 24, 14, 30)], {
      face: [112, 98, 118], tint: [30, 22, 60, 110], deco: (c, x, y) => { if (p.hash(x, y, 5) < 0.42) seam(c, x, y, glit(p, x, y), 2 + Math.floor(p.hash(x, y, 6) * 2)); },
    });
    exitS(p, 0); exitN(p, 1, [96, 86, 110], [120, 220, 250]);
    for (const [x, y] of [[3, 5], [6, 8], [3, 20], [34, 8], [26, 5], [34, 29], [24, 28], [11, 30], [29, 13], [14, 5], [34, 19], [15, 17], [23, 11]]) crystal(p, x, y, glit(p, x, y), 40);
    for (const [x, y] of [[5, 10], [33, 24], [11, 28], [9, 21]]) rock(p, x, y, [120, 106, 126]);
  },
};
// The fossil chamber: a wide glittering cavern, the dig at its far end under a work lamp.
PLANS.KalosGlitteringDepths = {
  theme: BARE,
  plan(p) {
    dig(p, [D(17, 26, 4.5, 2.6), S(14, 25, 10, 23, 1.6), D(9, 22, 5, 3.6), S(9, 19, 13, 15, 1.7), D(17, 13, 7, 4.2), D(25, 18, 5, 3.8), S(22, 15, 25, 17, 1.8), S(24, 21, 20, 25, 1.5), S(17, 10, 17, 7, 2.2), D(17, 5.5, 9, 3.2)], {
      face: [120, 104, 122], tint: [30, 22, 60, 80], deco: (c, x, y) => { if (p.hash(x, y, 5) < 0.4) seam(c, x, y, glit(p, x, y), 2 + Math.floor(p.hash(x, y, 6) * 2)); },
    });
    exitS(p, 0);
    for (const [x, y] of [[5, 21], [12, 24], [22, 20], [29, 17], [11, 13], [23, 12], [14, 27], [21, 27], [9, 5], [25, 5], [13, 10], [21, 10]]) crystal(p, x, y, glit(p, x, y), 40);
    // The dig: a roped-off trench with fossils showing, spoil heaps, crates and a lamp.
    p.block(11, 5, 3, 2); p.block(21, 5, 2, 2);
    p.paint(7, (c) => {
      const X = 11 * T, Y = 5 * T; c.box(X + 1, Y + 3, 3 * T - 2, 2 * T - 6, [84, 66, 62], [50, 38, 40]); c.rect(X + 3, Y + 5, 3 * T - 6, 3, [60, 46, 46]);
      c.ellipse(X + 14, Y + 17, 7, 6, [226, 216, 190]); c.ellipse(X + 14, Y + 17, 4, 3, [150, 136, 110]); c.ellipse(X + 15, Y + 17, 1, 1, [226, 216, 190]);
      for (let k = 0; k < 4; k++) c.rect(X + 27 + k * 4, Y + 12 + (k & 1), 2, 8, [232, 224, 204]); c.rect(X + 26, Y + 15, 18, 2, [232, 224, 204]);
      for (const [dx, dy] of [[0, 2], [3 * T - 3, 2], [0, 2 * T - 6], [3 * T - 3, 2 * T - 6]]) c.rect(X + dx, Y + dy - 5, 3, 8, [176, 132, 80]);
      c.rect(X + 1, Y - 2, 3 * T - 2, 1, [236, 200, 90]); c.rect(X + 1, Y + 2 * T - 10, 3 * T - 2, 1, [236, 200, 90]);
      const Q = 21 * T; c.ellipse(Q + 16, Y + 24, 16, 5, [0, 0, 0, 60]); c.ellipse(Q + 10, Y + 18, 10, 9, [118, 96, 86]); c.ellipse(Q + 22, Y + 20, 9, 7, [136, 112, 98]); c.ellipse(Q + 9, Y + 15, 5, 4, [160, 134, 116]); c.ellipse(Q + 22, Y + 17, 4, 3, [176, 150, 130]);
      c.line(Q + 26, Y + 4, Q + 16, Y + 22, [150, 108, 62], 2); c.poly([[Q + 21, Y + 2], [Q + 31, Y + 4], [Q + 29, Y + 7], [Q + 24, Y + 5]], [176, 180, 194]);
    });
    crate(p, 14, 4); crate(p, 20, 4); lantern(p, 15, 4); lantern(p, 19, 4);
    for (const [x, y] of [[8, 25], [27, 21], [20, 15]]) rock(p, x, y, [126, 110, 128]);
  },
};

// ---------------------------------------------------------------- Reflection Cave
// Mirror-bright crystal walls: polished faces that throw the light back, pale crystal spires on a blue floor.
const MIRROR = [176, 222, 244];
function mirrorWall(p) {
  return (c, x, y) => {
    const X = x * T, Y = y * T, h = p.hash(x, y, 31);
    if (h < 0.6) { c.box(X, Y + 1, T, 14, [150, 200, 232], [56, 74, 130]); c.poly([[X + 2, Y + 14], [X + 8, Y + 2], [X + 11, Y + 2], [X + 5, Y + 14]], [234, 248, 255]); c.poly([[X + 10, Y + 14], [X + 14, Y + 6], [X + 14, Y + 10], [X + 12, Y + 14]], [206, 234, 250]); c.rect(X + 1, Y + 2, 14, 1, [234, 248, 255]); }
    else if (h < 0.8) seam(c, x, y, MIRROR, 3);
  };
}
const REFL = (p, extra = {}) => ({ face: [96, 112, 160], rock: [44, 50, 92], tint: [50, 80, 170, 96], deco: mirrorWall(p), ...extra });
// A tall free-standing mirror crystal.
function mirror(p, x, y) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T; glow(c, X + 8, Y + 4, 22, MIRROR, 24); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.poly([[X + 2, Y + 14], [X + 14, Y + 14], [X + 14, Y], [X + 2, Y]], [130, 180, 226]); c.poly([[X + 3, Y + 13], [X + 8, Y + 13], [X + 8, Y], [X + 3, Y]], [226, 244, 255]); top.poly([[X + 2, Y], [X + 14, Y], [X + 14, Y - 10], [X + 8, Y - 18], [X + 2, Y - 10]], [130, 180, 226]); top.poly([[X + 3, Y], [X + 8, Y], [X + 8, Y - 16], [X + 3, Y - 9]], [226, 244, 255]); top.line(X + 10, Y - 2, X + 13, Y - 9, WHITE, 1); c.line(X + 10, Y + 11, X + 13, Y + 3, WHITE, 1); });
}
PLANS.KalosReflectionB1F = {
  theme: BARE,
  plan(p) {
    dig(p, [D(20, 28, 4.5, 2.6), S(20, 26, 20, 19, 1.7), D(20, 16, 6.5, 4), D(8, 8, 5.2, 3.6), S(8, 9, 9, 22, 2.6), D(8, 23, 5.2, 3.4), S(12, 23, 16, 23, 1.6), D(18, 23, 3.4, 2.6), D(19, 7, 6, 3.4), S(12, 7, 14, 7, 1.6), S(19, 9, 20, 13, 1.7), D(29, 8, 5, 3.8), S(24, 7, 26, 7, 1.6), S(29, 11, 30, 20, 1.8), D(30, 23, 6, 3.6), S(25, 16, 29, 16, 1.5)], REFL(p));
    exitS(p, 0, [170, 210, 250]); exitN(p, 1, [96, 112, 160], [170, 210, 250]); pit(p, 2);
    for (const [x, y] of [[15, 15], [25, 15], [20, 12], [5, 14], [12, 15], [4, 9], [12, 10], [24, 5], [33, 6], [27, 22], [34, 26], [6, 26], [16, 28], [24, 28], [32, 14]]) mirror(p, x, y);
    for (const [x, y, h] of [[17, 18, 26], [23, 18, 28], [11, 20, 24], [26, 10, 26], [15, 6, 24]]) spire(p, x, y, [150, 186, 230], h);
  },
};
PLANS.KalosReflectionB2F = {
  theme: BARE,
  plan(p) {
    dig(p, [D(19, 26, 4.5, 2.6), S(17, 24, 14, 20, 1.8), D(12, 14, 9, 6.5), S(19, 12, 25, 8, 1.8), D(28, 7, 6, 3.6), D(24, 18, 4.5, 3.4), S(20, 16, 22, 17, 1.6), S(22, 21, 21, 24, 1.4)], REFL(p));
    exitS(p, 0, [170, 210, 250]); exitN(p, 1, [96, 112, 160], [200, 160, 250]);
    for (const [x, y] of [[5, 12], [18, 10], [6, 18], [16, 19], [13, 9], [23, 6], [33, 8], [27, 19], [22, 16], [15, 27], [23, 27], [10, 14], [14, 15]]) mirror(p, x, y);
    for (const [x, y, h] of [[9, 17, 26], [15, 12, 28], [25, 9, 24], [31, 5, 26]]) spire(p, x, y, [150, 186, 230], h);
  },
};
// The hidden chamber: a ring of mirrors round a great crystal.
PLANS.KalosReflectionDeep = {
  theme: BARE,
  plan(p) {
    dig(p, [D(11, 9, 7.5, 5.2), R(10, 13, 12, 14)], REFL(p));
    exitS(p, 0, [170, 210, 250]);
    for (const [x, y] of [[5, 8], [17, 8], [7, 5], [15, 5], [6, 11], [16, 11]]) mirror(p, x, y);
    p.block(10, 6, 3, 2);
    p.paint(8, (c, top) => {
      const X = 11 * T + 8, Y = 8 * T - 2; glow(c, X, Y - 10, 46, [200, 170, 255], 26); c.ellipse(X, Y, 24, 6, [0, 0, 0, 70]);
      for (const [dx, w, h, col] of [[-14, 6, 24, [150, 190, 236]], [13, 6, 28, [150, 190, 236]], [0, 9, 46, [200, 180, 250]]]) { for (const cv of [c, top]) { cv.poly([[X + dx - w, Y], [X + dx + w, Y], [X + dx + w, Y - h * 0.7], [X + dx, Y - h], [X + dx - w, Y - h * 0.7]], sh(col, 0.7)); cv.poly([[X + dx - w + 1, Y - 1], [X + dx, Y - 1], [X + dx, Y - h + 2], [X + dx - w + 1, Y - h * 0.7]], mix(col, WHITE, 0.6)); cv.poly([[X + dx, Y - 1], [X + dx + w - 1, Y - 1], [X + dx + w - 1, Y - h * 0.7], [X + dx, Y - h + 2]], col); } }
    });
  },
};

// ---------------------------------------------------------------- Sea Spirit's Den
// A sea cave: wet sand, tide pools either side and a rock perch at the back in a shaft of light.
PLANS.KalosSeaSpiritsDen = {
  theme: { ...BARE, water: "sea", ground: "beach", road: "beach", grass: "beach" },
  plan(p) {
    dig(p, [D(11, 9, 8, 6), R(9, 13, 13, 15)], { face: [104, 124, 150], rock: [46, 58, 88], floor: "beach", pools: [D(4.5, 9, 2.4, 3), D(17.5, 9, 2.4, 3), D(7, 4.5, 2, 1.2), D(15, 4.5, 2, 1.2)] });
    exitS(p, 0, [190, 230, 255]);
    const q = { x: 11, y: 9 };
    p.paint(0.3, (c) => { const X = q.x * T + 8, Y = q.y * T + 10; c.ellipse(X, Y + 3, 30, 15, [70, 84, 110]); c.ellipse(X, Y, 28, 13, [128, 146, 170]); c.ellipse(X, Y - 1, 22, 9, [156, 174, 196]); c.ellipse(X - 6, Y - 3, 8, 3, [186, 202, 220]); });
    p.paint(0.6, (c, top) => { top.poly([[158, 64], [194, 64], [236, 200], [120, 200]], [220, 240, 255, 34]); top.poly([[168, 64], [184, 64], [206, 200], [150, 200]], [240, 250, 255, 30]); });
    for (const [x, y] of [[8, 7], [14, 7], [7, 12], [15, 12]]) rock(p, x, y, [120, 138, 160]);
    for (const [x, y, h] of [[9, 4, 24], [13, 4, 26], [5, 13, 22], [17, 13, 22]]) spire(p, x, y, [130, 150, 176], h);
  },
};

// ---------------------------------------------------------------- Lost Hotel
// A derelict hotel: square rooms off a long corridor, peeling wallpaper sprayed with tags, holes knocked through
// the walls, rubble and the punks' grind rails.
const TAGS = [[250, 90, 120], [90, 220, 250], [250, 220, 80], [150, 240, 120], [200, 130, 250], [250, 150, 60]];
function wallpaper(p) {
  return (c, x, y) => {
    const X = x * T, Y = y * T, h = p.hash(x, y, 41);
    c.rect(X, Y, T, T, [150, 150, 132]); for (let k = 1; k < T; k += 4) c.rect(X + k, Y, 1, 11, [128, 132, 118]); c.rect(X, Y, T, 2, [92, 78, 70]); c.rect(X, Y + 11, T, 5, [104, 78, 60]); c.rect(X, Y + 11, T, 1, [140, 108, 82]); c.rect(X, Y + 15, T, 1, [60, 44, 40]);
    if (h < 0.3) { const col = TAGS[Math.floor(p.hash(x, y, 42) * TAGS.length) % TAGS.length]; c.line(X + 2, Y + 9, X + 6, Y + 3, col, 2); c.line(X + 6, Y + 3, X + 9, Y + 9, col, 2); c.line(X + 9, Y + 9, X + 14, Y + 4, col, 2); c.rect(X + 3, Y + 11, 9, 1, col); }
    else if (h < 0.42) { c.poly([[X + 3, Y + 2], [X + 12, Y + 2], [X + 10, Y + 8], [X + 5, Y + 9]], [110, 106, 100]); c.line(X + 5, Y + 9, X + 7, Y + 14, [70, 60, 56], 1); }
    else if (h < 0.5) { c.box(X + 3, Y + 2, 10, 8, [70, 80, 96], [60, 44, 40]); c.line(X + 4, Y + 9, X + 9, Y + 3, [150, 170, 190], 1); c.line(X + 9, Y + 3, X + 12, Y + 7, [150, 170, 190], 1); }
  };
}
const HOTEL = (p) => ({ face: [150, 150, 132], rock: [40, 36, 46], floor: "hallFloor", tint: [70, 60, 50, 70], deco: wallpaper(p) });
function rubble(p, x, y, w = 2) {
  p.block(x, y, w, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + w * 8, Y + 13, w * 8, 3, [0, 0, 0, 70]); for (let k = 0; k < w * 3; k++) { const dx = 2 + k * 5 + Math.floor(p.hash(x + k, y, 51) * 3), dy = 4 + Math.floor(p.hash(x + k, y, 52) * 6), col = k % 3 ? [136, 130, 124] : [166, 110, 86]; c.box(X + dx, Y + dy, 6, 5, col, [60, 54, 56]); c.rect(X + dx + 1, Y + dy + 1, 3, 1, sh(col, 1.25)); } });
}
// A grind rail along a row (solid): a steel bar on short posts.
function grind(p, x0, x1, y) {
  p.block(x0, y, x1 - x0 + 1, 1);
  p.paint(y + 1, (c) => { const X = x0 * T, Y = y * T, W = (x1 - x0 + 1) * T; c.rect(X + 2, Y + 13, W - 4, 2, [0, 0, 0, 60]); for (let i = X + 3; i < X + W; i += 14) c.rect(i, Y + 5, 2, 9, [96, 100, 116]); c.rect(X + 1, Y + 3, W - 2, 3, [196, 202, 216]); c.rect(X + 1, Y + 3, W - 2, 1, WHITE); c.rect(X + 1, Y + 6, W - 2, 1, [80, 84, 100]); });
}
// A quarter-pipe ramp against a wall (solid), w tiles wide.
function ramp(p, x, y, w) {
  p.block(x, y, w, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T, W = w * T; c.box(X, Y - 2, W, 16, [176, 132, 80], [70, 46, 30]); for (let k = 1; k < 5; k++) c.rect(X + 1, Y - 2 + k * 3, W - 2, 1, [140, 100, 60]); c.rect(X, Y - 3, W, 2, [196, 202, 216]); c.rect(X + 2, Y + 14, W - 2, 2, [0, 0, 0, 60]); });
}
// Faded carpet, cracks and stains on the floor (walkable).
function carpet(c, x0, y0, x1, y1, col) { const X = x0 * T + 3, Y = y0 * T + 2, W = (x1 - x0 + 1) * T - 6, H = (y1 - y0 + 1) * T - 4; c.rect(X, Y, W, H, A(col, 120)); c.rect(X, Y, W, 2, A(sh(col, 0.6), 170)); c.rect(X, Y + H - 2, W, 2, A(sh(col, 0.6), 170)); c.rect(X, Y, 2, H, A(sh(col, 0.6), 170)); c.rect(X + W - 2, Y, 2, H, A(sh(col, 0.6), 170)); }
function cracks(p, c, list) { for (const [x, y] of list) { const X = x * T, Y = y * T; c.line(X + 2, Y + 3, X + 8, Y + 8, [50, 44, 48, 200], 1); c.line(X + 8, Y + 8, X + 6, Y + 14, [50, 44, 48, 200], 1); c.line(X + 8, Y + 8, X + 14, Y + 10, [50, 44, 48, 200], 1); } }
function bed(p, x, y) {
  p.block(x, y, 2, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 16, Y + 14, 16, 2, [0, 0, 0, 60]); c.box(X + 1, Y + 2, 30, 12, [120, 86, 60], [60, 40, 30]); c.rect(X + 2, Y + 3, 28, 8, [150, 160, 150]); c.rect(X + 3, Y + 4, 7, 6, [214, 214, 200]); c.poly([[X + 16, Y + 3], [X + 24, Y + 3], [X + 21, Y + 11], [X + 14, Y + 11]], [110, 70, 80]); });
}
PLANS.KalosLostHotel = {
  theme: { ...BARE, ground: "hallFloor", road: "hallFloor", grass: "hallFloor" },
  plan(p) {
    dig(p, [R(3, 26, 36, 29), R(19, 3, 21, 26), R(3, 4, 10, 11), R(16, 6, 24, 10), R(27, 4, 36, 11), R(11, 7, 15, 8), R(25, 7, 26, 8), R(3, 14, 15, 22), R(24, 14, 36, 22), R(16, 18, 18, 19), R(22, 17, 23, 18), R(5, 12, 6, 13), R(33, 12, 34, 13), R(8, 23, 9, 25), R(30, 23, 31, 25)], HOTEL(p));
    exitS(p, 0); exitN(p, 1, [120, 110, 100]);
    p.paint(0.2, (c) => { carpet(c, 19, 11, 21, 25, [150, 50, 60]); carpet(c, 4, 5, 9, 6, [60, 100, 110]); carpet(c, 28, 5, 35, 6, [60, 100, 110]); cracks(p, c, [[12, 28], [27, 27], [33, 29], [7, 16], [13, 20], [26, 16], [34, 20], [20, 14], [5, 10], [31, 10], [17, 9]]); });
    // The skaters' hall on the west side, the caved-in rooms on the east.
    grind(p, 5, 10, 16); grind(p, 7, 12, 20); ramp(p, 12, 14, 3); ramp(p, 3, 22, 3);
    rubble(p, 26, 15, 3); rubble(p, 33, 18, 2); rubble(p, 27, 21, 2); rubble(p, 30, 14, 2); rubble(p, 34, 28, 2); rubble(p, 3, 29, 2);
    bed(p, 3, 4); bed(p, 8, 10); bed(p, 34, 4); bed(p, 27, 10); crate(p, 36, 26, [150, 120, 90]); crate(p, 35, 22, [150, 120, 90]); crate(p, 24, 22, [150, 120, 90]);
    grind(p, 27, 33, 28);
  },
};
PLANS.KalosLostHotelSouth = {
  theme: { ...BARE, ground: "hallFloor", road: "hallFloor", grass: "hallFloor" },
  plan(p) {
    dig(p, [R(17, 27, 23, 30), R(19, 11, 21, 30), R(4, 17, 35, 19), R(3, 4, 10, 12), R(6, 13, 7, 16), R(14, 4, 25, 10), R(27, 5, 36, 13), R(31, 14, 32, 16), R(3, 22, 14, 29), R(8, 20, 9, 21), R(26, 22, 36, 29), R(30, 20, 31, 21), R(11, 7, 13, 8)], HOTEL(p));
    exitS(p, 0);
    p.paint(0.2, (c) => { carpet(c, 5, 17, 34, 19, [150, 50, 60]); carpet(c, 15, 5, 24, 6, [60, 100, 110]); cracks(p, c, [[12, 18], [27, 18], [6, 25], [12, 27], [28, 24], [34, 27], [20, 14], [5, 6], [30, 8], [22, 8], [20, 24]]); });
    grind(p, 5, 11, 25); grind(p, 28, 33, 26); ramp(p, 10, 22, 4); ramp(p, 27, 22, 3);
    rubble(p, 28, 6, 3); rubble(p, 34, 11, 2); rubble(p, 3, 11, 2); rubble(p, 23, 9, 2); rubble(p, 34, 28, 2); rubble(p, 3, 28, 2); rubble(p, 14, 9, 2);
    bed(p, 3, 4); bed(p, 9, 4); bed(p, 35, 5); bed(p, 14, 4); bed(p, 24, 4); crate(p, 27, 13, [150, 120, 90]); crate(p, 36, 22, [150, 120, 90]); crate(p, 4, 19, [150, 120, 90]); crate(p, 35, 17, [150, 120, 90]);
  },
};

// ---------------------------------------------------------------- Frost Cavern
const ICE = [176, 222, 250], FROST = { ...BARE, ground: "drift", road: "drift", grass: "drift" };
const FROSTY = (extra = {}) => ({ face: [150, 180, 220], rock: [70, 98, 146], floor: "drift", deco: (c, x, y) => { const X = x * T, Y = y * T; c.rect(X, Y, T, 2, WHITE); for (let k = 2; k < T; k += 5) c.poly([[X + k, Y + 2], [X + k + 3, Y + 2], [X + k + 1, Y + 6 + ((x * 3 + k + y) % 5)]], [226, 242, 255]); }, ...extra });
// Lay a ground kind over the open floor inside the shapes.
function lay(p, isOpen, kind, shapes) { for (let y = 2; y < p.H - 2; y++) for (let x = 2; x < p.W - 2; x++) if (isOpen(x, y) && shapes.some((f) => f(x, y))) p.fill(kind, x, y, x, y); }
// Sheets of bare ice on the floor (walkable), or a frozen skin over water when `over` is set.
function ice(p, isOpen, shapes, over = false) {
  p.paint(0.1, (c) => {
    const on = (x, y) => (over || isOpen(x, y)) && shapes.some((f) => f(x, y));
    for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) {
      if (!on(x, y)) continue; const X = x * T, Y = y * T;
      c.rect(X, Y, T, T, over ? [196, 228, 248, 235] : [178, 216, 244]); c.line(X + 2, Y + 12, X + 9, Y + 3, [236, 248, 255], 1); if (p.hash(x, y, 61) < 0.5) c.line(X + 9, Y + 14, X + 14, Y + 8, [226, 242, 255], 1); if (p.hash(x, y, 62) < 0.25) c.line(X + 3, Y + 4, X + 12, Y + 11, [140, 186, 226], 1);
      if (!on(x, y - 1)) c.rect(X, Y, T, 2, WHITE); if (!on(x, y + 1)) c.rect(X, Y + 14, T, 2, [130, 176, 220]); if (!on(x - 1, y)) c.rect(X, Y, 2, T, [236, 246, 255]); if (!on(x + 1, y)) c.rect(X + 14, Y, 2, T, [130, 176, 220]);
    }
  });
}
function snowpile(p, x, y) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [90, 120, 170, 90]); c.ellipse(X + 8, Y + 9, 8, 6, [206, 224, 244]); c.ellipse(X + 7, Y + 7, 6, 4, WHITE); c.ellipse(X + 11, Y + 11, 4, 3, [226, 238, 250]); });
}
function frostSet(p, crystals, spires, piles) {
  for (const [x, y] of crystals) crystal(p, x, y, ICE, 30);
  for (const [x, y, h] of spires) spire(p, x, y, [206, 228, 248], h || 28);
  for (const [x, y] of piles) snowpile(p, x, y);
}
// 1F: a cavern cut in two by a half-frozen stream, a plank bridge over it.
PLANS.KalosFrost1F = {
  theme: FROST,
  plan(p) {
    const stream = [S(3, 19, 12, 20, 0.9), S(12, 20, 27, 19, 0.9), S(27, 19, 36, 20, 0.9), R(34, 19, 37, 20), R(2, 19, 4, 20)];
    const open = dig(p, [D(20, 27.5, 5.5, 3), S(20, 25, 20, 22, 2.2), D(20, 19.5, 17, 3.4), S(20, 17, 19, 13, 2.2), D(18, 9, 8, 4.4), D(6, 9, 4, 4.2), S(8, 9, 12, 9, 1.8), D(30, 9, 5.5, 4.2), S(24, 9, 27, 9, 1.8), S(20, 6, 20, 3, 1.6), S(31, 12, 32, 17, 1.6), S(6, 12, 7, 17, 1.6)], FROSTY({ pools: stream }));
    p.street("deck", 3, [[20, 17], [20, 22]]);
    exitS(p, 0, [220, 240, 255]); exitN(p, 1, [150, 180, 220]);
    lay(p, open, "snow", [D(8, 17, 3, 1.4), D(30, 22, 4, 1.2), D(25, 27, 2, 1.5), D(12, 7, 2.5, 1.5)]);
    ice(p, open, [D(13, 10, 2.6, 1.6), D(26, 11, 2.4, 1.4), D(30, 6.5, 2.6, 1.2), D(5, 11, 2, 1.3)]);
    ice(p, open, [S(3, 19, 9, 20, 0.9), S(30, 19, 36, 20, 0.9), R(34, 19, 37, 20), R(2, 19, 4, 20)], true);
    frostSet(p, [[4, 7], [9, 6], [12, 12], [24, 6], [27, 12], [34, 8], [16, 26], [24, 26], [5, 17], [35, 17], [14, 22], [27, 22]], [[11, 6, 30], [25, 13, 26], [33, 12, 28], [15, 17, 24], [24, 17, 26], [17, 29, 24]], [[22, 12], [4, 12], [9, 22], [33, 22]]);
  },
};
// 2F: the frozen lake fills the north-west corner; an ice rink in the hall beyond it.
PLANS.KalosFrost2F = {
  theme: FROST,
  plan(p) {
    const open = dig(p, [D(20, 27.5, 5.5, 3), S(20, 25, 16, 19, 2.2), D(14, 17, 7, 3), R(2, 8, 2, 16), R(2, 15, 9, 17), R(10, 3, 12, 17), D(19, 7, 6.5, 4.2), S(13, 6, 14, 6, 1.6), S(20, 4, 20, 3, 1.6), D(30, 9, 5.5, 4.6), S(24, 8, 26, 8, 1.8), D(29, 21, 6.5, 4.4), S(30, 13, 29, 17, 2), S(24, 22, 22, 26, 1.7), S(20, 17, 24, 20, 1.6)], FROSTY({ wet: [R(3, 3, 9, 14)] }));
    exitS(p, 0, [220, 240, 255]); exitN(p, 1, [150, 180, 220]);
    ice(p, () => true, [D(4.5, 5, 2, 1.6), D(7.5, 9, 1.8, 2.2), D(5, 12.5, 2.2, 1.4), R(8, 3, 9, 4)], true);
    ice(p, open, [D(29, 21, 4.4, 2.6), D(19, 8, 3, 1.6), D(14, 17, 3, 1.3)]);
    lay(p, open, "snow", [D(31, 6, 3, 1.4), D(11, 10, 1.5, 4), D(20, 28, 3, 1.2)]);
    frostSet(p, [[13, 5], [24, 5], [26, 6], [34, 8], [27, 12], [23, 19], [35, 20], [25, 24], [15, 27], [25, 27], [8, 16], [18, 15], [12, 13]], [[15, 9, 28], [23, 10, 26], [33, 12, 28], [10, 19, 24], [34, 23, 26], [11, 4, 26]], [[33, 5], [16, 19], [31, 24], [12, 8]]);
  },
};
// 3F: a ring of passages round a frozen pool.
PLANS.KalosFrost3F = {
  theme: FROST,
  plan(p) {
    const open = dig(p, [D(20, 27.5, 5.5, 3), S(17, 26, 11, 22, 2), D(8, 20, 5.5, 4), S(8, 17, 6, 11, 2), D(6, 8, 4, 3.8), S(9, 8, 14, 8, 1.8), D(18, 8, 5.5, 3.8), S(20, 5, 20, 3, 1.6), S(22, 9, 27, 9, 1.8), D(30, 9, 5, 4.2), S(30, 12, 29, 16, 2), D(27, 20, 7.5, 4.4), S(21, 21, 13, 21, 1.8), S(23, 23, 21, 26, 1.6)], FROSTY({ pools: [D(27, 20, 3.4, 1.7)] }));
    exitS(p, 0, [220, 240, 255]); exitN(p, 1, [150, 180, 220]);
    ice(p, () => true, [D(25.5, 20, 1.6, 1.4), D(29.5, 19.6, 1, 1)], true);
    ice(p, open, [D(8, 20, 3.4, 2.2), D(18, 9, 3, 1.5), D(31, 10, 2.6, 1.6), D(17, 21, 2.4, 0.9)]);
    lay(p, open, "snow", [D(6, 6, 2.6, 1.2), D(20, 29, 3, 1), D(33, 20, 2, 2.5), D(28, 6, 2.5, 1)]);
    frostSet(p, [[3, 7], [9, 5], [14, 6], [23, 6], [27, 6], [34, 10], [21, 18], [33, 23], [4, 22], [12, 18], [15, 27], [25, 28], [22, 23]], [[4, 18, 28], [12, 23, 26], [15, 10, 24], [26, 11, 26], [32, 17, 28], [22, 26, 24]], [[9, 11], [33, 7], [24, 23], [5, 23]]);
  },
};
// Abomasnow's chamber: a great hall of ice at the top of the cavern, the giant's snowy hollow at its back.
PLANS.KalosFrostDeep = {
  theme: FROST,
  plan(p) {
    const open = dig(p, [D(20, 28, 5.5, 2.8), S(20, 26, 20, 16, 2.4), D(18, 9.5, 15.5, 6.6), D(27, 22, 4.5, 3.2), S(23, 22, 22, 22, 1.5), D(12, 22, 4.5, 3.2), S(16, 22, 18, 22, 1.5), D(6, 16.5, 3.6, 3), S(6, 13, 6, 15, 1.8)], FROSTY({ pools: [D(27, 22, 2.4, 1.4)] }));
    exitS(p, 0, [220, 240, 255]);
    ice(p, () => true, [D(27, 22, 2.4, 1.4)], true);
    lay(p, open, "snow", [D(20, 6.5, 6, 2.6), D(12, 22, 3, 2), D(6, 17, 2, 1.5)]);
    ice(p, open, [D(12, 12, 4, 1.8), D(27, 9, 3, 1.4), D(20, 20, 1.6, 2.5)]);
    // The hollow: a wall of giant ice crystals behind the rescue, snow-laden firs either side.
    for (const [x, h, w] of [[15, 34, 6], [17, 44, 7], [23, 44, 7], [25, 34, 6]]) { p.block(x, 4, 1, 1); p.paint(5, (c, top) => { const X = x * T + 8, Y = 5 * T - 2; glow(c, X, Y - 10, 30, ICE, 22); for (const cv of [c, top]) { cv.poly([[X - w, Y], [X + w, Y], [X + w, Y - h * 0.7], [X, Y - h], [X - w, Y - h * 0.7]], sh(ICE, 0.7)); cv.poly([[X - w + 1, Y - 1], [X, Y - 1], [X, Y - h + 2], [X - w + 1, Y - h * 0.7]], mix(ICE, WHITE, 0.6)); cv.poly([[X, Y - 1], [X + w - 1, Y - 1], [X + w - 1, Y - h * 0.7], [X, Y - h + 2]], ICE); } }); }
    frostSet(p, [[4, 9], [8, 5], [32, 6], [33, 12], [10, 13], [24, 14], [16, 14], [15, 26], [25, 26], [9, 20], [30, 24], [4, 15], [29, 14]], [[12, 5, 30], [28, 5, 30], [5, 12, 26], [31, 11, 26], [17, 18, 24], [23, 18, 24], [14, 24, 24]], [[19, 4], [21, 4], [13, 8], [26, 6], [8, 18], [10, 23]]);
  },
};

// ---------------------------------------------------------------- Terminus Cave
// An abandoned mine: square-cut galleries shored with timber, cart rails down the middle, lamps and ore tubs.
const MINE = (extra = {}) => ({ face: [132, 104, 96], rock: [50, 38, 46], tint: [70, 40, 50, 60], ...extra });
const ORE = [[120, 200, 250], [250, 210, 110], [250, 140, 110], [150, 230, 160]];
function orepile(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 60]); c.ellipse(X + 8, Y + 10, 7, 5, [96, 80, 80]); c.ellipse(X + 6, Y + 8, 4, 3, [128, 108, 104]); c.rect(X + 4, Y + 8, 2, 2, col); c.rect(X + 9, Y + 6, 2, 2, col); c.rect(X + 11, Y + 10, 2, 2, mix(col, WHITE, 0.4)); c.rect(X + 7, Y + 11, 2, 1, col); });
}
PLANS.KalosTerminus1F = {
  theme: BARE,
  plan(p) {
    dig(p, [R(15, 25, 25, 29), R(19, 10, 21, 25), R(6, 15, 33, 18), R(6, 6, 9, 22), R(3, 20, 11, 24), R(30, 8, 33, 26), R(28, 23, 35, 27), R(13, 5, 27, 10), R(19, 3, 21, 4), R(6, 6, 13, 8), R(27, 7, 33, 9)], MINE());
    exitS(p, 0); exitN(p, 1, [132, 104, 96]);
    p.paint(0.2, (c) => { rails(c, [[20, 28], [20, 6]]); rails(c, [[20, 16], [7, 16], [7, 7], [13, 7]]); rails(c, [[20, 16], [32, 16], [32, 25]]); });
    for (const [x, y, w] of [[19, 23, 3], [19, 20, 3], [19, 13, 3], [6, 11, 4], [6, 20, 4], [30, 12, 4], [30, 21, 4]]) timber(p, x, y, w);
    cart(p, 21, 17, ORE[0]); cart(p, 8, 10, ORE[1]); cart(p, 31, 25, null); cart(p, 14, 8, ORE[2]);
    lantern(p, 16, 25); lantern(p, 24, 25); lantern(p, 13, 15); lantern(p, 27, 15); lantern(p, 14, 5); lantern(p, 26, 5);
    for (const [x, y, k] of [[3, 20, 0], [11, 24, 1], [4, 24, 2], [35, 23, 3], [28, 27, 0], [35, 27, 1], [22, 9, 2], [17, 5, 3], [25, 9, 0]]) orepile(p, x, y, ORE[k]);
    crate(p, 10, 20); crate(p, 28, 23); crate(p, 24, 5); for (const [x, y] of [[9, 18], [25, 18], [16, 29], [33, 9]]) rock(p, x, y, [140, 112, 104]);
  },
};
PLANS.KalosTerminusB1F = {
  theme: BARE,
  plan(p) {
    dig(p, [R(16, 27, 24, 30), R(19, 3, 21, 27), R(4, 10, 33, 14), R(4, 19, 22, 23), R(4, 10, 8, 23), R(29, 10, 33, 26), R(27, 22, 35, 27), R(26, 4, 34, 7), R(30, 7, 31, 10), R(12, 4, 15, 10)], MINE());
    exitS(p, 0); exitN(p, 1, [132, 104, 96]);
    p.paint(0.2, (c) => { rails(c, [[20, 29], [20, 5]]); rails(c, [[5, 13], [32, 13], [32, 25]]); rails(c, [[20, 22], [5, 22]]); rails(c, [[5, 13], [5, 22]]); });
    for (const [x, y, w] of [[19, 25, 3], [19, 17, 3], [19, 8, 3], [4, 17, 5], [29, 17, 5], [29, 21, 5]]) timber(p, x, y, w);
    cart(p, 22, 14, ORE[3]); cart(p, 8, 23, ORE[0]); cart(p, 33, 20, null); cart(p, 13, 5, ORE[1]);
    lantern(p, 17, 27); lantern(p, 23, 27); lantern(p, 12, 10); lantern(p, 26, 10); lantern(p, 12, 19); lantern(p, 22, 19);
    for (const [x, y, k] of [[27, 27, 0], [35, 22, 1], [35, 27, 2], [26, 4, 3], [34, 4, 0], [12, 4, 1], [15, 4, 2], [4, 16, 3]]) orepile(p, x, y, ORE[k]);
    crate(p, 34, 7); crate(p, 27, 22); crate(p, 14, 23); for (const [x, y] of [[10, 10], [24, 14], [10, 19], [16, 30]]) rock(p, x, y, [140, 112, 104]);
  },
};
// B2F: below the workings the mine breaks into natural caverns: the rails end, the timbers lean, water stands in the hollows.
PLANS.KalosTerminusB2F = {
  theme: BARE,
  plan(p) {
    dig(p, [D(20, 28, 5, 2.7), S(20, 26, 19, 24, 2.2), D(18, 21, 5.4, 3.6), D(7, 21, 5.2, 3.7), S(11, 21, 14, 21, 1.9), S(7, 18, 6, 15, 1.9), D(7, 12, 5.2, 3.7), S(11, 12, 14, 12, 1.9), D(18, 12, 5.4, 3.7), S(22, 12, 26, 12, 1.9), D(30, 12, 5.2, 4), D(20, 6, 5, 3.3), S(19, 9, 19, 9, 2.2), D(30, 22, 5.4, 4), S(30, 15, 30, 19, 1.9), S(23, 22, 26, 22, 1.7)], MINE({ pools: [D(31.5, 23, 2.6, 1.6), D(4.5, 22.5, 1.6, 1.4)] }));
    exitS(p, 0); exitN(p, 1, [132, 104, 96], [120, 230, 150]);
    p.paint(0.2, (c) => { rails(c, [[20, 29], [20, 24]]); rails(c, [[14, 13], [26, 13]]); });
    timber(p, 19, 26, 3); cart(p, 21, 24, null); cart(p, 13, 13, ORE[1]); crate(p, 16, 27); lantern(p, 24, 28);
    for (const [x, y, h] of [[4, 10, 28], [10, 9, 26], [15, 15, 26], [22, 15, 24], [27, 9, 28], [34, 10, 26], [3, 19, 26], [11, 24, 24], [14, 19, 26], [22, 19, 24], [27, 19, 26], [34, 25, 26], [16, 5, 24], [24, 5, 24]]) spire(p, x, y, [150, 122, 112], h);
    for (const [x, y] of [[17, 4], [23, 4], [34, 14], [26, 24]]) crystal(p, x, y, [120, 230, 150], 36);
    for (const [x, y] of [[9, 15], [21, 9], [33, 19], [9, 24], [15, 23], [25, 14]]) rock(p, x, y, [140, 112, 104]);
  },
};
// The east stairway: flight after flight of cut steps climbing to the last chamber.
PLANS.KalosTerminusEast = {
  theme: BARE,
  plan(p) {
    dig(p, [R(14, 22, 22, 26), R(16, 6, 20, 22), R(13, 12, 23, 15), R(14, 3, 22, 6), R(5, 13, 13, 14), D(6, 13.5, 3.6, 3), R(23, 13, 30, 14), D(29, 13.5, 3.6, 3)], MINE({ tint: [40, 70, 60, 60] }));
    exitS(p, 0); exitN(p, 1, [132, 104, 96], [120, 230, 150]);
    p.paint(0.2, (c) => { steps(c, 16, 16, 20, 21, [150, 124, 116]); steps(c, 16, 7, 20, 11, [150, 124, 116]); });
    for (const [x, y] of [[15, 22], [21, 22], [14, 12], [22, 12], [15, 6], [21, 6]]) lantern(p, x, y, [150, 240, 170]);
    for (const [x, y] of [[4, 12], [8, 15], [31, 12], [27, 15]]) crystal(p, x, y, [120, 230, 150], 36);
    for (const [x, y, h] of [[14, 26, 24], [22, 26, 24], [4, 15, 26], [31, 15, 26], [14, 3, 24], [22, 3, 24]]) spire(p, x, y, [150, 122, 112], h);
    orepile(p, 6, 11, ORE[3]); orepile(p, 29, 11, ORE[0]); rock(p, 10, 14, [140, 112, 104]); rock(p, 25, 13, [140, 112, 104]);
  },
};
// The final chamber: a vast green-lit vault, Zygarde coiled on a ring of light, four treasure hollows below it.
PLANS.KalosZygardeChamber = {
  theme: BARE,
  plan(p) {
    const G = [120, 236, 150];
    dig(p, [D(19, 29, 4.5, 2.2), S(19, 28, 19, 18, 2.6), D(19, 11, 12, 7.4), D(8, 18, 3.2, 2.8), D(30, 18, 3.2, 2.8), D(8, 26, 3.2, 2.6), D(30, 26, 3.2, 2.6), S(11, 19, 17, 22, 1.5), S(27, 19, 21, 22, 1.5), S(11, 26, 17, 26, 1.4), S(27, 26, 21, 26, 1.4)], { face: [96, 124, 112], rock: [30, 46, 46], tint: [30, 110, 70, 70], deco: (c, x, y) => { if (p.hash(x, y, 5) < 0.3) seam(c, x, y, G, 2 + Math.floor(p.hash(x, y, 6) * 2)); } });
    exitS(p, 0, G);
    p.paint(0.3, (c) => {
      const X = 19 * T + 8, Y = 9 * T + 10; glow(c, X, Y, 90, G, 22);
      c.ellipse(X, Y, 66, 40, A(G, 60)); c.ellipse(X, Y, 66, 40, A(G, 220), 2); c.ellipse(X, Y, 50, 30, A(WHITE, 150), 1); c.ellipse(X, Y, 30, 18, A(G, 110));
      for (let a = 0; a < 6; a++) { const ax = Math.cos(a * Math.PI / 3), ay = Math.sin(a * Math.PI / 3); c.line(X + ax * 30, Y + ay * 18, X + ax * 66, Y + ay * 40, A(G, 200), 1); const hx = X + ax * 82, hy = Y + ay * 52; c.poly([[hx - 6, hy], [hx - 3, hy - 5], [hx + 3, hy - 5], [hx + 6, hy], [hx + 3, hy + 5], [hx - 3, hy + 5]], A(G, 150)); }
      for (const [x, y] of [[8, 18], [30, 18], [8, 26], [30, 26]]) { c.ellipse(x * T + 8, y * T + 9, 20, 13, A(G, 50)); c.ellipse(x * T + 8, y * T + 9, 20, 13, A(G, 190), 1); }
      for (let y = 15; y <= 27; y += 3) { c.poly([[19 * T + 2, y * T + 4], [19 * T + 8, y * T], [19 * T + 14, y * T + 4], [19 * T + 14, y * T + 10], [19 * T + 8, y * T + 14], [19 * T + 2, y * T + 10]], A(G, 90)); }
    });
    for (const [x, y] of [[9, 8], [29, 8], [12, 4], [26, 4], [8, 13], [30, 13], [13, 16], [25, 16], [15, 30], [23, 30], [5, 17], [33, 17], [5, 27], [33, 27]]) crystal(p, x, y, G, 40);
    for (const [x, y, h] of [[15, 5, 30], [23, 5, 30], [10, 11, 26], [28, 11, 26], [16, 20, 24], [22, 20, 24]]) spire(p, x, y, [120, 150, 136], h);
  },
};

// ---------------------------------------------------------------- Victory Road
// Old stonework shows through the rock: flights of steps, fallen columns, deep green pools.
const VICTORY = (extra = {}) => ({ face: [142, 128, 110], rock: [52, 48, 52], tint: [90, 90, 80, 50], ...extra });
const STONE = [186, 180, 168];
function column(p, x, y, broken = false) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T, E = [80, 76, 80]; c.ellipse(X + 8, Y + 13, 8, 4, [0, 0, 0, 70]); c.box(X + 2, Y - 2, 12, 16, STONE, E); c.rect(X + 4, Y, 3, 12, sh(STONE, 1.2)); c.box(X, Y + 10, 16, 5, sh(STONE, 0.85), E); if (broken) { c.poly([[X + 2, Y - 2], [X + 6, Y - 7], [X + 9, Y - 3], [X + 13, Y - 6], [X + 14, Y - 2]], STONE); } else { top.box(X + 2, Y - 14, 12, 13, STONE, E); top.rect(X + 4, Y - 12, 3, 11, sh(STONE, 1.2)); top.box(X, Y - 18, 16, 6, sh(STONE, 1.1), E); } });
}
// A stretch of ruined wall (solid), w tiles wide.
function ruinWall(p, x, y, w) {
  p.block(x, y, w, 1);
  p.paint(y + 1, (c) => { const X = x * T, Y = y * T, W = w * T, E = [80, 76, 80]; c.rect(X + 2, Y + 13, W - 2, 3, [0, 0, 0, 60]); c.box(X, Y + 1, W, 13, sh(STONE, 0.9), E); for (let r = 0; r < 3; r++) { c.rect(X + 1, Y + 5 + r * 4, W - 2, 1, E); for (let i = X + 4 + (r & 1) * 5; i < X + W - 2; i += 10) c.rect(i, Y + 2 + r * 4, 1, 3, E); } for (let i = 0; i < w; i++) if (p.hash(x + i, y, 71) < 0.5) c.poly([[X + i * T + 3, Y + 1], [X + i * T + 8, Y - 4 - Math.floor(p.hash(x + i, y, 72) * 4)], [X + i * T + 13, Y + 1]], STONE); c.rect(X + 1, Y + 2, W - 2, 1, sh(STONE, 1.2)); });
}
// Worn flagstones on the floor (walkable).
function flags(p, c, x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (p.hash(x, y, 81) < 0.25) continue; const X = x * T, Y = y * T; c.rect(X + 1, Y + 1, 14, 14, A(STONE, 150)); c.rect(X + 1, Y + 1, 14, 1, A(WHITE, 90)); c.rect(X + 1, Y + 14, 14, 1, [70, 66, 70, 150]); c.rect(X + 14, Y + 1, 1, 14, [70, 66, 70, 150]); } }
// The first cave: an underground river cuts it in two (Surf across); the League gate door on the south bank.
PLANS.KalosVictoryCave1 = {
  theme: BARE,
  plan(p) {
    dig(p, [R(15, 25, 25, 30), R(3, 22, 36, 24), R(5, 25, 9, 25), R(2, 12, 2, 16), R(2, 16, 36, 16), R(10, 3, 11, 16), D(18, 11.5, 7, 4.6), D(30, 11.5, 5.6, 4.6), S(24, 11, 26, 11, 2), D(20, 5.5, 5.4, 2.7), S(12, 6, 15, 6, 1.6), S(30, 15, 30, 16, 2)], VICTORY({ wet: [R(3, 3, 9, 15), R(2, 17, 37, 21)] }));
    exitS(p, 0); exitN(p, 1, [142, 128, 110], [250, 240, 200]); exitS(p, 2, [255, 230, 170]);
    p.paint(0.2, (c) => { flags(p, c, 16, 26, 24, 29); flags(p, c, 12, 22, 28, 23); steps(c, 18, 7, 21, 8, [170, 160, 146]); flags(p, c, 17, 4, 23, 6); });
    column(p, 16, 25); column(p, 24, 25); column(p, 12, 24, true); column(p, 28, 24, true); column(p, 4, 24, true); column(p, 10, 24); column(p, 17, 4); column(p, 23, 4); column(p, 22, 14, true); column(p, 14, 14);
    ruinWall(p, 31, 24, 3); ruinWall(p, 13, 9, 2); ruinWall(p, 26, 14, 2);
    for (const [x, y, h] of [[35, 23, 26], [34, 9, 28], [27, 8, 26], [12, 12, 26], [24, 15, 24], [11, 4, 26]]) spire(p, x, y, [160, 146, 128], h);
    for (const [x, y] of [[33, 13], [15, 8], [22, 24], [9, 22]]) rock(p, x, y, [150, 136, 120]);
  },
};
// The second cave: three terraces joined by steps, a pool in the east hollow.
PLANS.KalosVictoryCave2 = {
  theme: BARE,
  plan(p) {
    dig(p, [D(20, 28, 5, 2.7), S(20, 26, 19, 24, 2.2), D(12, 22, 10, 3.7), S(6, 19, 6, 15, 2), D(6.5, 12, 4.6, 3.7), S(10, 12, 14, 12, 1.9), D(18, 12, 5.4, 3.7), S(22, 12, 26, 12, 1.9), D(30, 12, 5.2, 4), S(30, 9, 27, 6, 1.9), D(21, 5.5, 6.4, 2.8), D(30, 22, 5.4, 3.8), S(30, 15, 30, 19, 1.9), S(22, 22, 26, 22, 1.7)], VICTORY({ pools: [D(31.5, 22.5, 2.8, 1.7), D(8.5, 8.5, 1.4, 0.9)] }));
    exitS(p, 0); exitN(p, 1, [142, 128, 110], [250, 240, 200]);
    p.paint(0.2, (c) => { steps(c, 5, 16, 7, 18, [170, 160, 146]); steps(c, 29, 16, 31, 18, [170, 160, 146]); steps(c, 27, 7, 29, 8, [170, 160, 146]); flags(p, c, 17, 4, 24, 6); flags(p, c, 9, 21, 16, 23); flags(p, c, 16, 11, 20, 13); });
    column(p, 4, 15); column(p, 8, 15); column(p, 28, 15, true); column(p, 32, 15); column(p, 16, 4); column(p, 25, 4, true); column(p, 8, 20, true); column(p, 16, 20); column(p, 14, 10, true); column(p, 22, 10);
    ruinWall(p, 11, 24, 3); ruinWall(p, 24, 9, 2); ruinWall(p, 2, 22, 2);
    for (const [x, y, h] of [[3, 10, 26], [10, 9, 24], [34, 10, 28], [26, 20, 26], [34, 24, 26], [16, 27, 24], [24, 27, 24], [21, 24, 24]]) spire(p, x, y, [160, 146, 128], h);
    for (const [x, y] of [[33, 11], [14, 14], [20, 20], [5, 24]]) rock(p, x, y, [150, 136, 120]);
  },
};
// The final cave: a deep pool in the north-west and the great stair climbing out to the League.
PLANS.KalosVictoryCave3 = {
  theme: BARE,
  plan(p) {
    dig(p, [D(20, 28, 5, 2.7), S(20, 26, 19, 24, 2.2), D(12, 22, 10, 3.6), R(2, 12, 2, 17), R(2, 16, 12, 18), R(10, 3, 12, 18), D(18, 12, 6, 4), S(23, 12, 26, 12, 2), D(30, 12, 5.2, 4.4), R(17, 3, 23, 9), S(30, 16, 28, 20, 1.9), D(27, 23, 5.4, 3.2), S(21, 23, 23, 23, 1.6)], VICTORY({ wet: [R(3, 3, 9, 15)], pools: [D(28.5, 23.5, 2.4, 1.3)] }));
    exitS(p, 0); exitN(p, 1, [186, 180, 168], [255, 244, 200]);
    p.paint(0.2, (c) => { steps(c, 18, 5, 22, 8, [186, 180, 168]); flags(p, c, 17, 3, 23, 4); flags(p, c, 15, 10, 21, 13); flags(p, c, 8, 21, 16, 23); });
    column(p, 17, 3); column(p, 23, 3); column(p, 17, 6); column(p, 23, 6); column(p, 17, 9, true); column(p, 23, 9); column(p, 14, 10, true); column(p, 22, 15); column(p, 6, 20); column(p, 17, 20, true); column(p, 16, 26); column(p, 24, 26, true);
    ruinWall(p, 10, 25, 3); ruinWall(p, 26, 9, 2); ruinWall(p, 11, 8, 2);
    for (const [x, y, h] of [[34, 10, 28], [27, 15, 26], [33, 15, 24], [3, 21, 26], [23, 26, 24], [32, 24, 24], [12, 14, 24]]) spire(p, x, y, [160, 146, 128], h);
    for (const [x, y] of [[32, 9], [14, 17], [20, 20], [10, 12]]) rock(p, x, y, [150, 136, 120]);
  },
};

// ---------------------------------------------------------------- Unknown Dungeon and the Chamber of Emptiness
// The Unknown Dungeon: one still chamber, dark water either side of the path to a slab at the back.
PLANS.KalosUnknownDungeon = {
  theme: BARE,
  plan(p) {
    const V = [190, 150, 255];
    dig(p, [D(14, 10.5, 10, 7), R(12, 16, 16, 19)], { face: [116, 106, 140], rock: [40, 34, 62], tint: [60, 40, 110, 80], pools: [D(6, 11, 3.6, 3.4), D(22, 11, 3.6, 3.4)], deco: (c, x, y) => { if (p.hash(x, y, 5) < 0.3) seam(c, x, y, V, 2); } });
    exitS(p, 0);
    p.block(13, 5, 3, 1);
    p.paint(6, (c) => { const X = 13 * T, Y = 5 * T; glow(c, X + 24, Y + 8, 44, V, 24); c.ellipse(X + 24, Y + 14, 26, 4, [0, 0, 0, 70]); c.box(X, Y + 3, 48, 11, [130, 122, 156], [50, 44, 76]); c.rect(X + 2, Y + 4, 44, 3, [176, 168, 200]); c.box(X + 6, Y - 2, 36, 6, [150, 142, 176], [50, 44, 76]); c.rect(X + 8, Y - 1, 32, 1, WHITE); });
    for (const [x, y] of [[10, 5], [18, 5], [5, 15], [23, 15], [11, 17], [17, 17]]) crystal(p, x, y, V, 38);
    for (const [x, y, h] of [[11, 8, 26], [17, 8, 26], [10, 13, 24], [18, 13, 24]]) spire(p, x, y, [140, 130, 170], h);
  },
};
// The Chamber of Emptiness: bare rock, nothing in it but a worn plinth under a crack of light.
PLANS.KalosChamberOfEmptiness = {
  theme: BARE,
  plan(p) {
    dig(p, [D(12, 9.5, 8.6, 6), R(11, 14, 13, 17), R(5, 14, 7, 17)], { face: [128, 120, 116], rock: [44, 42, 48], tint: [60, 60, 80, 70] });
    exitS(p, 0); exitS(p, 1);
    p.block(12, 8, 1, 1);
    p.paint(9, (c, top) => { const X = 12 * T, Y = 8 * T; c.ellipse(X + 8, Y + 13, 12, 5, [0, 0, 0, 70]); c.box(X - 3, Y + 8, 22, 7, [150, 146, 150], [70, 66, 76]); c.box(X + 1, Y - 2, 14, 11, [176, 172, 176], [70, 66, 76]); c.rect(X + 3, Y, 3, 8, [210, 208, 212]); c.box(X - 1, Y - 5, 18, 4, [196, 192, 196], [70, 66, 76]); top.poly([[X + 2, 3 * T], [X + 12, 3 * T], [X + 24, Y + 20], [X - 10, Y + 20]], [255, 250, 220, 30]); top.poly([[X + 5, 3 * T], [X + 9, 3 * T], [X + 14, Y + 20], [X, Y + 20]], [255, 250, 220, 30]); });
    for (const [x, y, h] of [[6, 7, 24], [18, 7, 24], [8, 13, 22], [17, 13, 22]]) spire(p, x, y, [146, 138, 134], h);
    for (const [x, y] of [[9, 5], [15, 5], [5, 10], [19, 11]]) rock(p, x, y, [140, 132, 128]);
  },
};

module.exports = PLANS;
