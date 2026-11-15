// kalos routes, drawn by hand. See README.md.
"use strict";
// ---- small hand-drawn pieces shared by the plans below (pixels; T = 16 per tile) ----
const T = 16;
const STONE = [[226, 220, 204], [196, 188, 170], [150, 142, 128], [96, 90, 84]];
const WOOD = [[206, 168, 112], [170, 128, 80], [120, 86, 54], [76, 54, 40]];
const shade = (col, f) => col.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
// Tiles a prop may stand on: kept tiles (people, their sight lines, gates) are skipped rather than failing the build.
function spot(p, x, y) { try { p.block(x, y, 1, 1); return true; } catch (_) { return false; } }
// Blocks the 1-wide strip tile by tile and returns the runs that could be blocked (a w x h block is taken whole).
function runs(p, x, y, w, h) {
  if (w > 1 && h > 1) { const out = []; for (let j = 0; j < h; j++) { let ok = true; for (let i = 0; i < w; i++) if (!spot(p, x + i, y + j)) ok = false; if (ok) out.push(j); } return out.length === h ? [[x, y, w, h]] : []; }
  const out = [], horiz = w >= h, n = horiz ? w : h; let start = -1;
  for (let k = 0; k <= n; k++) { const ok = k < n && spot(p, horiz ? x + k : x, horiz ? y : y + k); if (ok) { if (start < 0) start = k; } else if (start >= 0) { out.push(horiz ? [x + start, y, k - start, 1] : [x, y + start, 1, k - start]); start = -1; } }
  return out;
}
const strip = (draw) => (p, x, y, w, h, ...rest) => { for (const [a, b, c, d] of runs(p, x, y, w, h)) draw(p, a, b, c, d, ...rest); };
const hedgeRow = strip(_hedgeRow), fence = strip(_fence), rail = strip(_rail), pipe = strip(_pipe), plot = strip(_plot);
// A low clipped hedge over the tile rectangle (solid).
function _hedgeRow(p, x, y, w, h) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py + 2, pw, ph - 2, [38, 92, 52]); c.rect(px + 1, py, pw - 2, ph - 4, [70, 142, 74]); for (let j = 1; j < ph - 5; j += 3) for (let i = 2 + (j % 2) * 3; i < pw - 2; i += 6) c.rect(px + i, py + j, 2, 1, [112, 180, 96]); c.rect(px + 1, py + ph - 5, pw - 2, 1, [50, 110, 60]); });
}
// A wooden rail fence over the tile rectangle (solid); one of w / h is 1.
function _fence(p, x, y, w, h, pal = WOOD) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; if (w >= h) { c.rect(px, py + 5, pw, 2, pal[0]); c.rect(px, py + 7, pw, 1, pal[2]); c.rect(px, py + 10, pw, 2, pal[0]); c.rect(px, py + 12, pw, 1, pal[2]); for (let i = 3; i < pw; i += 8) { c.rect(px + i, py + 2, 3, 13, pal[1]); c.rect(px + i, py + 2, 1, 13, pal[0]); c.rect(px + i, py + 14, 3, 1, pal[3]); } } else { c.rect(px + 6, py, 2, ph, pal[0]); c.rect(px + 8, py, 1, ph, pal[2]); for (let j = 2; j < ph; j += 8) { c.rect(px + 5, py + j, 5, 5, pal[1]); c.rect(px + 5, py + j, 5, 1, pal[0]); c.rect(px + 5, py + j + 5, 5, 1, pal[3]); } } });
}
// A street lamp on one tile (solid).
function lamp(p, x, y) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.rect(px + 7, py - 6, 2, 20, [60, 62, 76]); c.rect(px + 5, py + 13, 6, 2, [60, 62, 76]); top.box(px + 4, py - 14, 8, 9, [255, 236, 150], [60, 62, 76]); top.rect(px + 3, py - 16, 10, 2, [60, 62, 76]); });
}
// A statue on a plinth, one tile (solid).
function statue(p, x, y, col = [206, 204, 196]) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T, d = shade(col, 0.62); c.box(px + 2, py + 6, 12, 10, STONE[1], STONE[3]); c.rect(px + 3, py + 7, 10, 2, STONE[0]); c.rect(px + 5, py - 4, 6, 11, col); top.rect(px + 5, py - 6, 6, 3, col); top.ellipse(px + 8, py - 9, 3, 3, col); top.rect(px + 3, py - 4, 2, 6, d); c.rect(px + 10, py - 3, 1, 10, d); });
}
// A standing stone (menhir) on one tile (solid); `tall` px high.
function menhir(p, x, y, tall = 26, col = [150, 146, 150]) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T, d = shade(col, 0.62), l = shade(col, 1.3); c.ellipse(px + 9, by - 2, 8, 3, [0, 0, 0, 60]); for (const cv of [top, c]) { const lo = cv === c ? by - 14 : by - tall, hi = cv === c ? by - 1 : by - 14; cv.poly([[px + 3, hi], [px + 2, Math.max(lo, by - tall + 8)], [px + 6, lo], [px + 11, lo], [px + 14, Math.max(lo, by - tall + 10)], [px + 13, hi]], d); cv.poly([[px + 4, hi], [px + 3, Math.max(lo, by - tall + 9)], [px + 6, lo + 1], [px + 10, lo + 1], [px + 12, Math.max(lo, by - tall + 10)], [px + 11, hi]], col); cv.rect(px + 5, Math.max(lo + 2, by - tall + 9), 2, hi - Math.max(lo + 2, by - tall + 9) - 2, l); } });
}
// A stone bridge look over a plank street: the tile rectangle keeps walking, parapets drawn on the sides.
function stoneBridge(p, x, y, w, h, vertical = true) {
  p.paint(1, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, STONE[1]); for (let j = 0; j < ph; j += 8) for (let i = ((j / 8) & 1) * 8; i < pw; i += 16) c.box(px + i, py + j, 16, 8, STONE[(Math.floor(p.hash(i, j, 3) * 2))], STONE[2]); if (vertical) { c.rect(px - 3, py - 2, 5, ph + 4, STONE[3]); c.rect(px - 2, py - 2, 3, ph + 4, STONE[0]); c.rect(px + pw - 2, py - 2, 5, ph + 4, STONE[3]); c.rect(px + pw - 1, py - 2, 3, ph + 4, STONE[0]); } else { c.rect(px - 2, py - 3, pw + 4, 5, STONE[3]); c.rect(px - 2, py - 2, pw + 4, 3, STONE[0]); c.rect(px - 2, py + ph - 2, pw + 4, 5, STONE[3]); c.rect(px - 2, py + ph - 1, pw + 4, 3, STONE[0]); } });
}
// A metal grind rail over the tile rectangle (solid); one of w / h is 1.
function _rail(p, x, y, w, h, col = [196, 60, 70]) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T, d = shade(col, 0.6), l = shade(col, 1.3); if (w >= h) { c.rect(px + 1, py + 13, pw - 2, 2, [0, 0, 0, 50]); for (let i = 4; i < pw; i += 16) c.rect(px + i, py + 6, 2, 8, [90, 92, 104]); c.rect(px + 1, py + 4, pw - 2, 3, col); c.rect(px + 1, py + 4, pw - 2, 1, l); c.rect(px + 1, py + 7, pw - 2, 1, d); } else { c.rect(px + 9, py + 2, 2, ph - 2, [0, 0, 0, 50]); c.rect(px + 6, py + 1, 3, ph - 2, col); c.rect(px + 6, py + 1, 1, ph - 2, l); c.rect(px + 9, py + 1, 1, ph - 2, d); for (let j = 4; j < ph; j += 16) c.rect(px + 5, py + j, 5, 2, [90, 92, 104]); } });
}
// A pipe line over the tile rectangle (solid); one of w / h is 1.
function _pipe(p, x, y, w, h, col = [150, 156, 170]) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T, d = shade(col, 0.6), l = shade(col, 1.25); if (w >= h) { c.rect(px, py + 12, pw, 3, [0, 0, 0, 50]); c.rect(px, py + 3, pw, 9, col); c.rect(px, py + 3, pw, 2, l); c.rect(px, py + 10, pw, 2, d); for (let i = 6; i < pw; i += 16) { c.rect(px + i, py + 2, 3, 11, d); c.rect(px + i + 1, py + 2, 1, 11, l); } } else { c.rect(px + 12, py, 3, ph, [0, 0, 0, 50]); c.rect(px + 3, py, 9, ph, col); c.rect(px + 3, py, 2, ph, l); c.rect(px + 10, py, 2, ph, d); for (let j = 6; j < ph; j += 16) { c.rect(px + 2, py + j, 11, 3, d); c.rect(px + 2, py + j + 1, 11, 1, l); } } });
}
// A wind turbine: one solid tile at (x, y); mast and blades are walked behind.
function turbine(p, x, y, turn = 0) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T + 8, by = (y + 1) * T, hub = by - 58, w = [236, 238, 242], g = [150, 156, 170]; c.ellipse(px + 3, by - 2, 7, 3, [0, 0, 0, 60]); c.rect(px - 2, by - 14, 4, 13, w); c.rect(px + 1, by - 14, 1, 13, g); top.rect(px - 2, hub, 4, 58 - 14, w); top.rect(px + 1, hub, 1, 58 - 14, g); for (let k = 0; k < 3; k++) { const a = turn + k * 2.0944, ex = px + Math.round(Math.cos(a) * 24), ey = hub + Math.round(Math.sin(a) * 24), nx = Math.round(-Math.sin(a) * 3), ny = Math.round(Math.cos(a) * 3); top.poly([[px, hub], [px + Math.round(Math.cos(a) * 8) + nx, hub + Math.round(Math.sin(a) * 8) + ny], [ex, ey]], w); top.line(px, hub, ex, ey, g); } top.ellipse(px, hub, 3, 3, g); });
}
// A mine cart on a short length of track (solid), w tiles of track along row y.
function cart(p, x, y, w = 3, col = [120, 110, 104]) {
  p.block(x, y, w, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T, pw = w * T; for (let i = 1; i < pw; i += 5) c.rect(px + i, py + 9, 2, 6, WOOD[2]); c.rect(px, py + 10, pw, 1, [170, 172, 180]); c.rect(px, py + 13, pw, 1, [170, 172, 180]); const cx = px + (pw >> 1) - 9; c.box(cx, py - 1, 18, 10, col, shade(col, 0.5)); c.rect(cx + 1, py, 16, 2, shade(col, 1.3)); c.rect(cx + 2, py - 3, 14, 3, [60, 54, 60]); c.rect(cx + 4, py - 4, 4, 2, [150, 190, 220]); c.rect(cx + 10, py - 4, 3, 2, [230, 200, 90]); c.ellipse(cx + 4, py + 11, 2, 2, [50, 50, 56]); c.ellipse(cx + 14, py + 11, 2, 2, [50, 50, 56]); });
}
// A berry plot: soil rows with sprouts over the tile rectangle (solid).
function _plot(p, x, y, w, h, fruit = [214, 70, 90]) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.box(px, py, pw, ph, [150, 112, 76], [100, 72, 52]); for (let j = 3; j < ph - 3; j += 8) { c.rect(px + 2, py + j + 4, pw - 4, 2, [116, 84, 58]); for (let i = 4; i < pw - 4; i += 8) { c.rect(px + i, py + j - 1, 3, 5, [70, 150, 70]); c.rect(px + i - 1, py + j + 1, 5, 2, [50, 120, 60]); if (p.hash(x * 16 + i, y * 16 + j, 7) > 0.4) c.rect(px + i + 1, py + j, 2, 2, fruit); } } });
}
// A tree-lined row: single trees every `step` tiles (their crowns are walked behind).
function treeRow(p, x, y, n, dx, dy, opts = {}) { for (let k = 0; k < n; k++) p.decor(opts.stamp || "tree1", x + k * dx, y + k * dy, { canopy: true, tint: opts.tint }); }
// A snowman on one tile (solid).
function snowman(p, x, y) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T + 8, by = (y + 1) * T; c.ellipse(px, by - 2, 7, 3, [0, 0, 0, 50]); c.ellipse(px, by - 7, 6, 6, [244, 248, 252]); c.ellipse(px + 2, by - 5, 3, 3, [214, 226, 240]); top.ellipse(px, by - 16, 4, 4, [244, 248, 252]); top.rect(px - 2, by - 17, 1, 1, [30, 30, 40]); top.rect(px + 1, by - 17, 1, 1, [30, 30, 40]); top.rect(px, by - 15, 3, 1, [240, 140, 40]); top.rect(px - 3, by - 22, 6, 3, [40, 40, 56]); c.rect(px - 4, by - 12, 8, 2, [200, 60, 70]); });
}
// A beach parasol with a towel on one tile (solid).
function parasol(p, x, y, col) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 12, 6, 3, [0, 0, 0, 50]); c.box(px + 2, py + 8, 12, 6, [240, 236, 224], shade(col, 0.7)); c.rect(px + 7, py - 1, 2, 12, [90, 80, 76]); top.ellipse(px + 8, py - 3, 11, 6, col); top.ellipse(px + 8, py - 4, 7, 3, [250, 246, 236]); top.rect(px + 7, py - 9, 2, 2, [90, 80, 76]); });
}
// A round hay bale on one tile (solid).
function bale(p, x, y) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c) => { const px = x * T + 8, py = y * T + 9; c.ellipse(px, py + 4, 7, 3, [0, 0, 0, 50]); c.ellipse(px, py, 7, 6, [214, 180, 90]); c.ellipse(px, py, 5, 4, [236, 208, 120]); c.ellipse(px, py, 2, 2, [190, 150, 70]); });
}
// A jagged rock spike on one tile (solid).
const spike = (p, x, y, tall = 22) => menhir(p, x, y, tall, [168, 136, 104]);
// A swing set, 3 tiles wide on row y (solid).
function swing(p, x, y) {
  p.block(x, y, 3, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T, m = [200, 70, 70]; c.rect(px + 2, by - 3, 44, 2, [0, 0, 0, 50]); for (const i of [2, 42]) { c.rect(px + i, by - 16, 3, 15, m); top.rect(px + i, by - 26, 3, 10, m); } top.rect(px + 2, by - 27, 43, 3, shade(m, 1.2)); for (const i of [12, 28]) { top.rect(px + i, by - 24, 1, 8, [90, 90, 100]); top.rect(px + i + 7, by - 24, 1, 8, [90, 90, 100]); c.rect(px + i, by - 16, 1, 7, [90, 90, 100]); c.rect(px + i + 7, by - 16, 1, 7, [90, 90, 100]); c.rect(px + i - 1, by - 9, 10, 2, [240, 200, 80]); } });
}
// A slide, 2 tiles wide and 2 tall with its foot on row y + 1 (solid).
function slide(p, x, y) {
  p.block(x, y, 2, 2);
  p.paint(y + 2, (c, top) => { const px = x * T, by = (y + 2) * T, b = [70, 120, 200]; c.rect(px + 2, by - 3, 28, 2, [0, 0, 0, 50]); c.rect(px + 3, by - 24, 2, 22, [200, 70, 70]); c.rect(px + 10, by - 24, 2, 22, [200, 70, 70]); for (let j = 4; j < 22; j += 4) c.rect(px + 5, by - j, 5, 1, [230, 230, 236]); c.poly([[px + 10, by - 24], [px + 13, by - 24], [px + 30, by - 4], [px + 30, by - 1], [px + 24, by - 1]], b); c.line(px + 11, by - 24, px + 28, by - 4, shade(b, 1.4)); top.rect(px + 2, by - 30, 11, 6, [240, 200, 80]); });
}
// Opens the listed tile rectangles [x0, y0, x1, y1] back to plain ground (after a solid fill).
const carve = (p, rects, kind = "ground") => { for (const [x0, y0, x1, y1] of rects) p.fill(kind, x0, y0, x1, y1); };
// A waterfall face painted over the tile rectangle (over rock or water; changes no collision).
function falls(p, x, y, w, h) {
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, [120, 170, 232]); for (let i = 1; i < pw; i += 4) { const o = Math.floor(p.hash(x * 16 + i, y, 11) * 8); c.rect(px + i, py + o, 2, ph - o, [200, 226, 250]); c.rect(px + i + 2, py, 1, ph, [90, 140, 214]); } c.rect(px, py, pw, 2, [236, 246, 255]); for (let i = 0; i < pw; i += 5) c.ellipse(px + i + 2, py + ph - 1, 3, 2, [240, 248, 255]); });
}
// A flag on a pole, one tile (solid).
function banner(p, x, y, col) {
  if (!spot(p, x, y)) return;
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T; c.rect(px + 7, by - 14, 2, 13, [90, 90, 104]); c.rect(px + 5, by - 2, 6, 2, [60, 62, 76]); top.rect(px + 7, by - 34, 2, 20, [90, 90, 104]); top.poly([[px + 9, by - 34], [px + 22, by - 30], [px + 9, by - 24]], col); top.poly([[px + 9, by - 32], [px + 17, by - 30], [px + 9, by - 27]], shade(col, 1.3)); });
}
// A broken stone column on one tile (solid).
const column = (p, x, y, tall = 30) => menhir(p, x, y, tall, [204, 198, 184]);
// A back alley: everything but the listed rectangles becomes town-house blocks (solid), drawn as slate roofs with
// a two-storey facade wherever a block looks down onto the alley.
function alleyBlocks(p, rects, wallCol = [214, 196, 168], roofCol = [92, 98, 122]) {
  p.fill("border", 2, 2, p.W - 3, p.H - 3); carve(p, rects, "paving");
  const open = (x, y) => rects.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  p.paint(0, (c) => {
    const d = shade(wallCol, 0.6), l = shade(wallCol, 1.15), rd = shade(roofCol, 0.75), rl = shade(roofCol, 1.2);
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
      if (open(x, y)) continue; const px = x * T, py = y * T;
      if (open(x, y + 1)) { c.rect(px, py, T, T, wallCol); c.rect(px, py + 13, T, 3, d); if (x % 3 === 0) c.box(px + 4, py + 1, 8, 12, [96, 70, 56], d); else { c.box(px + 3, py + 2, 10, 8, [150, 190, 220], d); c.rect(px + 8, py + 2, 1, 8, d); } }
      else if (open(x, y + 2)) { c.rect(px, py, T, T, wallCol); c.rect(px, py, T, 3, l); c.rect(px, py + 3, T, 1, d); c.box(px + 4, py + 6, 8, 9, [150, 190, 220], d); c.rect(px + 2, py + 6, 2, 9, [70, 110, 90]); c.rect(px + 12, py + 6, 2, 9, [70, 110, 90]); }
      else { c.rect(px, py, T, T, roofCol); c.rect(px, py + 7, T, 1, rd); c.rect(px, py + 15, T, 1, rd); c.rect(px + ((x + y) % 2) * 8, py, 1, 7, rd); c.rect(px + ((x + y + 1) % 2) * 8, py + 8, 1, 7, rd); if (open(x, y + 3)) c.rect(px, py + 13, T, 3, rl); if (p.hash(x, y, 31) > 0.965) c.box(px + 4, py + 2, 7, 9, [150, 96, 80], [90, 60, 56]); }
    }
  });
}

module.exports = {
  // Route 1, Vaniville Pathway: nothing but a short grey cobbled lane straight through the trees (reference).
  KalosRoute1: {
    theme: { ground: "grass", road: "gravel", density: 0.1, groves: 0, flowers: 0.03 },
    plan(p) {
      p.fill("tree", 2, 2, 7, 19); p.fill("tree", 17, 2, 21, 19);                         // woods either side
      p.fill("grass", 8, 2, 16, 19);
      p.street("gravel", 3, [[12, 19], [12, 2]]);                                          // the lane
      treeRow(p, 8, 4, 4, 0, 4); treeRow(p, 15, 6, 3, 0, 4);
    },
  },
  // Route 2, Avance Trail: a straight dirt trail north through bands of tall grass, the river and its bank down the
  // west side, woods to the east (reference).
  KalosRoute2: {
    theme: { ground: "grass", road: "dirt", density: 0.2, groves: 0.1, flowers: 0.06 },
    plan(p) {
      p.fill("water", 5, 2, 6, 9); p.fill("water", 6, 9, 8, 10); p.fill("water", 8, 10, 9, 16); p.fill("water", 6, 16, 9, 17); p.fill("water", 5, 17, 6, 27);   // the river
      p.fill("rock", 10, 9, 10, 15); p.fill("rock", 7, 3, 7, 7);                            // its bank
      p.fill("tree", 2, 2, 3, 27); p.fill("tree", 24, 8, 29, 27);                           // the woods
      p.street("dirt", 2, [[16, 27], [16, 2]]);
      p.fill("grass", 13, 18, 20, 20); p.fill("grass", 13, 12, 20, 14); p.fill("grass", 13, 6, 20, 8);   // mown clearings between the grass bands
    },
  },
  // Santalune Forest: the looping trail under the canopy, with a tall-grass glade in the middle and side glades.
  KalosSantaluneForest: {
    theme: { ground: "shade", road: "dirt", density: 0.12, groves: 0.04, flowers: 0.03 },
    plan(p) {
      p.fill("tree", 2, 2, 41, 37);
      for (const [x0, y0, x1, y1] of [[20, 28, 24, 37], [10, 28, 24, 31], [10, 7, 14, 31], [5, 14, 9, 19], [10, 6, 31, 11], [20, 2, 24, 6], [27, 8, 31, 27], [13, 24, 31, 27], [19, 21, 22, 24]]) p.fill("ground", x0, y0, x1, y1);
      p.disc("ground", 20.5, 17.5, 4.6, 3.8); p.disc("ground", 35, 22, 3.6); p.fill("ground", 31, 21, 33, 23);   // the middle glade, the east glade
      p.street("dirt", 2, [[22, 37], [22, 29], [12, 29], [12, 9], [22, 9], [22, 2]]);       // the west trail
      p.street("dirt", 2, [[13, 26], [29, 26], [29, 9], [22, 9]]);                          // the east loop
      p.disc("meadow", 7.5, 17, 2.4); p.disc("meadow", 35.5, 22.5, 2.4); p.fill("flowersBlue", 35, 21, 36, 22); p.fill("flowersPink", 6, 15, 7, 16);
    },
  },
  // Route 3, Ouvert Way: the trail runs almost straight north on the east side under a rock scarp; a winding ledge and
  // the pond lie west of it (reference).
  KalosRoute3: {
    theme: { ground: "grass", road: "dirt", density: 0.2, groves: 0.08, flowers: 0.06 },
    plan(p) {
      p.disc("water", 9, 21.5, 3.2, 2);                                                     // the pond, south-west of the trail
      p.street("dirt", 2, [[17, 29], [17, 22], [19, 22], [19, 9], [17, 9], [17, 2]]);
      p.fill("rock", 27, 5, 31, 22);                                                        // the scarp along the east side
      p.fill("rock", 4, 13, 13, 13); p.fill("rock", 14, 13, 14, 18); p.fill("rock", 10, 18, 13, 18);   // the winding ledge
      p.fill("grass", 20, 11, 22, 20); p.fill("grass", 13, 24, 15, 27);
      p.fill("tree", 2, 27, 4, 29); p.fill("tree", 2, 2, 4, 6);
    },
  },
  // Route 22, Detourner Way: hedged lanes and two ponds between Santalune and the Victory Road gate.
  KalosRoute22: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.15, groves: 0.05, flowers: 0.1 },
    plan(p) {
      p.disc("water", 19, 21.5, 4.2, 2.4); p.disc("water", 20, 4.2, 3.4, 1.6);              // the ponds
      p.street("dirt", 2, [[2, 14], [12, 14], [12, 12], [29, 12]]);                         // Santalune - east
      p.street("dirt", 2, [[29, 9], [29, 23]]);                                             // Chamber of Emptiness - the falls
      p.street("dirt", 2, [[7, 9], [7, 14]]);                                               // the League gate
      hedgeRow(p, 9, 10, 9, 1); hedgeRow(p, 20, 10, 7, 1); hedgeRow(p, 14, 14, 13, 1); hedgeRow(p, 4, 17, 3, 1); hedgeRow(p, 10, 17, 4, 1); hedgeRow(p, 26, 17, 1, 5); hedgeRow(p, 32, 12, 1, 8);
      p.fill("flowersPink", 3, 19, 6, 20); p.fill("flowersRed", 13, 3, 15, 4); p.fill("flowersBlue", 31, 3, 33, 5);
      p.fill("rock", 26, 5, 27, 8); p.fill("rock", 31, 6, 33, 8);                          // the crag round the cave mouth
    },
  },
  // Route 4, Parterre Way: the formal garden - a sand avenue between clipped hedge mazes, with the round Perle
  // fountain on its stone plaza in the middle (reference).
  KalosRoute4Entrance: {
    theme: { ground: "lawn", road: "sand", density: 0, groves: 0, flowers: 0.03 },
    plan(p) {
      p.street("sand", 3, [[15, 21], [15, 2]]);
      p.street("sand", 1, [[7, 3], [7, 21]]); p.street("sand", 1, [[21, 3], [21, 21]]);     // the walks through the mazes
      p.street("sand", 1, [[7, 7], [21, 7]]); p.street("sand", 1, [[7, 16], [21, 16]]);
      p.disc("ornate", 15.5, 11.5, 4.2); p.disc("water", 15.5, 11.5, 2.2);
      p.decor("fountain", 14, 10);                                                          // the Perle fountain
      for (const y of [3, 18]) { hedgeRow(p, 9, y, 4, 3); hedgeRow(p, 18, y, 2, 3); hedgeRow(p, 3, y, 3, 3); hedgeRow(p, 23, y, 4, 3); }
      for (const y of [9, 13]) { hedgeRow(p, 3, y, 3, 2); hedgeRow(p, 23, y, 4, 2); hedgeRow(p, 9, y, 1, 2); hedgeRow(p, 19 + 1, y, 1, 2); }
      p.fill("flowersRed", 9, 6, 12, 6); p.fill("flowersRed", 18, 6, 19, 6); p.fill("flowersPink", 9, 17, 12, 17); p.fill("flowersPink", 18, 17, 19, 17);
    },
  },
  // Route 5, Versant Road: the skate park sits at the top by the Lumiose gate; from it the road winds down the hillside
  // south-west to Camphrier past ledges and tall grass (reference).
  KalosRoute5: {
    theme: { ground: "grass", road: "sand", density: 0.2, groves: 0.08, flowers: 0.06 },
    plan(p) {
      p.street("sand", 3, [[23, 3], [23, 14], [33, 14], [33, 19], [13, 19], [13, 26], [22, 26], [22, 33], [3, 33]]);
      p.fill("paving", 30, 4, 41, 12); p.fill("sand", 32, 6, 39, 10); p.street("paving", 2, [[24, 8], [30, 8]]);   // the skate park: a tan court in a paved surround
      rail(p, 32, 5, 6, 1); rail(p, 40, 5, 1, 6, [70, 120, 200]); rail(p, 32, 11, 5, 1, [240, 200, 80]); rail(p, 34, 8, 4, 1, [70, 120, 200]);
      hedgeRow(p, 30, 3, 12, 1); hedgeRow(p, 29, 4, 1, 3); hedgeRow(p, 29, 10, 1, 3); hedgeRow(p, 36, 13, 6, 1);
      p.decor("bench", 31, 4); lamp(p, 29, 7); lamp(p, 29, 9);
      p.fill("rock", 3, 13, 10, 13); p.fill("rock", 36, 22, 42, 22); p.fill("rock", 3, 28, 9, 28); p.fill("rock", 15, 22, 20, 22); p.fill("rock", 26, 29, 34, 29);   // the slope's ledges
      p.fill("flowersPink", 19, 5, 21, 7); p.fill("flowersBlue", 15, 28, 18, 30);
    },
  },
  // Route 7 east, Riviere Walk: the stone bridge the Snorlax sleeps on, berry fields on the Camphrier bank.
  KalosRoute7East: {
    theme: { ground: "meadow", road: "dirt", density: 0.15, groves: 0.05, flowers: 0.12 },
    plan(p) {
      p.street("dirt", 3, [[2, 16], [35, 16]]); p.street("dirt", 2, [[20, 3], [20, 15]]);
      stoneBridge(p, 14, 14, 5, 5, false);
      plot(p, 24, 20, 4, 2); plot(p, 30, 20, 4, 2, [90, 110, 220]); plot(p, 24, 24, 4, 2, [240, 200, 80]); plot(p, 30, 24, 4, 2);
      fence(p, 22, 19, 13, 1); fence(p, 22, 20, 1, 7); fence(p, 35, 20, 1, 7);
      p.fill("flowersPink", 4, 20, 11, 23); p.fill("flowersRed", 5, 8, 10, 11); p.fill("flowersBlue", 26, 6, 32, 9);
      hedgeRow(p, 3, 13, 9, 1); hedgeRow(p, 24, 13, 9, 1); lamp(p, 12, 13); lamp(p, 20, 13); lamp(p, 12, 19); lamp(p, 20, 19);
    },
  },
  // Route 6, Palais Lane: a narrow dark earth avenue under two close lines of trees, with wide tall-grass fields and
  // their footpaths on either side (reference).
  KalosRoute6: {
    theme: { ground: "meadow", road: "dirt", density: 0.06, groves: 0.03, flowers: 0.03 },
    plan(p) {
      p.street("dirt", 2, [[21, 37], [21, 2]]);
      p.fill("shade", 19, 2, 20, 37); p.fill("shade", 23, 2, 24, 37);                       // the shade under the trees
      treeRow(p, 16, 3, 11, 0, 3); treeRow(p, 25, 3, 11, 0, 3);                             // the two tree lines
      p.street("dirt", 1, [[8, 5], [8, 30]]); p.street("dirt", 1, [[28, 5], [28, 24]]); p.street("dirt", 1, [[8, 5], [13, 5]]); p.street("dirt", 1, [[28, 5], [33, 5]]);   // footpaths through the grass
    },
  },
  // Parfum Palace forecourt: the gilded fence and gate, the cobbled court with its fountains and parterres, the palace front.
  KalosParfumApproach: {
    theme: { ground: "lawn", road: "cobble", density: 0, groves: 0, flowers: 0.05, autoHouses: false },
    plan(p) {
      p.building(1, "hall", { tint: p.roof(1.9, 1.6, 0.7) });
      p.fill("ornate", 9, 11, 27, 17); p.street("cobble", 3, [[18, 27], [18, 11]]);
      const GOLD = [[255, 236, 150], [232, 196, 80], [170, 130, 50], [110, 84, 40]];
      fence(p, 3, 19, 14, 1, GOLD); fence(p, 20, 19, 14, 1, GOLD); statue(p, 16, 20, [232, 196, 80]); statue(p, 20, 20, [232, 196, 80]);
      p.decor("fountain", 11, 12); p.decor("fountain", 23, 12);
      hedgeRow(p, 3, 11, 5, 1); hedgeRow(p, 29, 11, 4, 1); hedgeRow(p, 8, 11, 1, 7); hedgeRow(p, 28, 11, 1, 7);
      p.fill("flowersRed", 3, 13, 6, 16); p.fill("flowersBlue", 30, 13, 32, 16); p.fill("flowersPink", 4, 22, 14, 24); p.fill("flowersPink", 22, 22, 32, 24);
      hedgeRow(p, 4, 21, 11, 1); hedgeRow(p, 22, 21, 11, 1); hedgeRow(p, 4, 25, 11, 1); hedgeRow(p, 22, 25, 11, 1);
      lamp(p, 16, 23); lamp(p, 20, 23); lamp(p, 16, 26); lamp(p, 20, 26);
    },
  },
  // Route 7 west, Riviere Walk: the broad river lies north of the walk and the Battle Chateau stands beyond it at the end
  // of its own bridge; south of the walk run flower strips and a long hedge, with the berry plots and day care behind (reference).
  KalosRoute7West: {
    theme: { ground: "meadow", road: "dirt", density: 0.1, groves: 0.04, flowers: 0.1, autoHouses: false },
    plan(p) {
      p.fill("water", 2, 10, 41, 14);                                                       // the river
      p.street("dirt", 3, [[41, 18], [2, 18]]);
      p.street("paving", 2, [[33, 9], [33, 17]]);                                           // the Chateau's bridge
      p.building(2, "church");
      p.fill("flowersBlue", 5, 20, 12, 20); p.fill("flowersPink", 15, 20, 20, 20); p.fill("flowersBlue", 24, 20, 30, 20);   // the flower strips
      hedgeRow(p, 3, 21, 30, 1);
      plot(p, 8, 24, 3, 2); plot(p, 12, 24, 3, 2, [90, 110, 220]); plot(p, 16, 24, 3, 2, [240, 200, 80]); plot(p, 8, 27, 3, 2); plot(p, 12, 27, 3, 2, [240, 200, 80]); plot(p, 16, 27, 3, 2, [90, 110, 220]);   // the berry fields
      p.decor("logHouse", 24, 23); fence(p, 31, 23, 6, 1); fence(p, 31, 27, 6, 1); fence(p, 36, 24, 1, 3); p.fill("grass", 31, 24, 35, 26);   // the day care and its paddock
      lamp(p, 31, 16); lamp(p, 35, 16);
    },
  },
  // Route 8 upper, Muraille Coast: the cliff-top path zigzags down the ledges above the sea.
  KalosRoute8Upper: {
    theme: { ground: "grass", road: "dirt", border: "rock", water: "sea", density: 0.2, groves: 0.05, flowers: 0.03 },
    plan(p) {
      p.fill("water", 2, 2, 4, 35); p.fill("rock", 5, 2, 6, 35);                            // the sea below the cliff edge
      p.street("dirt", 2, [[19, 5], [19, 11], [28, 11], [28, 18], [11, 18], [11, 26], [19, 26], [19, 33]]);
      p.fill("rock", 7, 14, 25, 15); p.fill("rock", 14, 21, 35, 23); p.fill("rock", 22, 28, 29, 29);   // the ledges the path winds round
      p.fill("rock", 31, 12, 35, 14);
    },
  },
  // Route 9, Spikes Passage: the Rhyhorn trail - a rubble track along terraces of brown rock, grey boulders beside it.
  KalosRoute9: {
    theme: { ground: "dirt", road: "gravel", border: "rock", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("rock", 2, 2, 37, 33); p.fill("tree", 15, 27, 37, 33); p.fill("tree", 2, 32, 14, 33); p.fill("darktree", 2, 2, 16, 9);   // brown crags; woods below and above (reference)
      for (const [x0, y0, x1, y1] of [[3, 25, 13, 30], [9, 20, 12, 25], [9, 20, 22, 23], [19, 19, 22, 21], [20, 17, 20, 19], [18, 12, 27, 16], [24, 16, 27, 22], [25, 8, 25, 11], [23, 4, 36, 7]]) p.fill("ground", x0, y0, x1, y1);
      p.street("gravel", 1, [[3, 28], [10, 28], [10, 21], [20, 21], [20, 14], [25, 14], [25, 6], [34, 6]]);        // the rubble the Rhyhorn crosses
      for (const [x, y, t] of [[4, 25, 24], [8, 26, 18], [12, 27, 26], [13, 30, 20], [3, 30, 18], [12, 23, 22], [14, 20, 26], [17, 23, 18], [22, 20, 24], [18, 12, 26], [22, 16, 20], [27, 13, 24], [24, 20, 18], [27, 19, 26], [26, 22, 20], [23, 4, 22], [28, 7, 26], [31, 4, 18], [36, 7, 24]]) menhir(p, x, y, 10 + (t >> 2), [150, 150, 158]);   // round grey boulders
    },
  },
  // Route 8 coast, Muraille Coast: the bare beach under the cliff - pale sand between the surf and the rock, coves and tide pools.
  KalosRoute8Coast: {
    theme: { ground: "beach", road: "sand", border: "rock", water: "sea", density: 0.06, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("rock", 31, 2, 35, 37); p.fill("rock", 29, 16, 30, 24); p.fill("rock", 30, 30, 30, 37);     // the cliff the upper route runs along
      p.disc("water", 6, 30, 5.2, 4); p.disc("water", 6, 19, 3.4, 2.4);                                  // coves
      p.disc("water", 25.5, 27.5, 1.6); p.disc("water", 24, 14.5, 1.4, 1);                               // tide pools
      p.street("sand", 2, [[19, 34], [19, 28], [14, 28], [14, 20], [22, 20], [22, 12], [19, 12], [19, 5]]);
      p.fill("rock", 26, 31, 29, 34); p.fill("rock", 26, 3, 29, 5);                                       // spurs of the cliff (the reference has no palms or parasols)
      for (const [x, y] of [[11, 24], [16, 32], [25, 17], [11, 12], [26, 22], [9, 4]]) menhir(p, x, y, 12, [150, 132, 110]);   // rocks on the sand
    },
  },
  // Route 10, Menhir Trail: straight rows of standing stones across the grass either side of the trail.
  KalosRoute10Entrance: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0, groves: 0, flowers: 0.04 },
    plan(p) {
      p.street("dirt", 2, [[15, 21], [15, 15], [14, 15], [14, 8], [15, 8], [15, 2]]);
      for (const y of [5, 9, 13, 17]) for (let k = 0; k < 5; k++) { menhir(p, 3 + k * 2, y, 24 + ((k + y) % 3) * 4); menhir(p, 19 + k * 2, y, 24 + ((k * 2 + y) % 3) * 4); }
      menhir(p, 12, 20, 34); menhir(p, 18, 20, 34); menhir(p, 12, 3, 34); menhir(p, 18, 3, 34);
    },
  },
  // Route 11, Miroir Way: a dirt path over the grass in the west, climbing past ledges into the brown mountain that fills the east.
  KalosRoute11: {
    theme: { ground: "grass", road: "dirt", border: "rock", tree: "tree1", density: 0.15, groves: 0.05, flowers: 0.06 },
    plan(p) {
      p.fill("rock", 30, 2, 37, 31); carve(p, [[30, 11, 35, 13], [33, 4, 35, 11]], "dirt");   // the brown mountain filling the east, and the cut up to the cave (reference)
      p.street("dirt", 2, [[3, 26], [12, 26], [12, 19], [24, 19], [24, 12], [34, 12], [34, 6]]);
      p.fill("rock", 3, 22, 9, 22); p.fill("rock", 14, 15, 21, 16); p.fill("rock", 15, 22, 26, 22);   // ledges
      p.fill("tree", 2, 29, 16, 31); p.fill("tree", 2, 2, 5, 5);
      p.fill("flowersBlue", 18, 25, 22, 27); p.fill("flowersRed", 4, 14, 7, 16); p.fill("flowersPink", 28, 19, 31, 21);
    },
  },
  // Route 12, Fourrage Road: the bay cuts the road in two - Shalour's shore to the north, the ranch lane and pastures to the south.
  KalosRoute12: {
    theme: { ground: "grass", road: "sand", water: "sea", shore: 2, density: 0.15, groves: 0.05, flowers: 0.12 },
    plan(p) {
      p.disc("water", 10, 17, 6, 2.2); p.disc("water", 35, 23.5, 6, 2.6); p.disc("water", 30, 16.5, 4, 1.8);   // the bay's coves
      p.street("sand", 2, [[22, 5], [22, 13], [6, 13], [5, 12]]); p.street("sand", 2, [[22, 13], [22, 17]]);
      p.street("sand", 2, [[22, 23], [22, 36]]); p.street("sand", 2, [[22, 29], [37, 29]]);
      fence(p, 25, 27, 12, 1); fence(p, 25, 31, 7, 1); fence(p, 35, 31, 5, 1);               // the ranch lane
      p.fill("meadow", 25, 24, 31, 26); bale(p, 26, 25); bale(p, 29, 24); bale(p, 30, 26);
      p.fill("rock", 36, 5, 41, 8); p.fill("rock", 2, 5, 4, 8);
      p.fill("flowersPink", 4, 34, 9, 36); p.fill("flowersRed", 12, 25, 16, 27);
    },
  },
  // Baa de Mer Ranch: the fenced Skiddo paddock with its jumping ledges, the farmhouse and barn, hay bales, the sea beyond.
  KalosSkiddoRanch: {
    theme: { ground: "grass", road: "sand", water: "sea", shore: 1, density: 0.05, groves: 0, flowers: 0.1, autoHouses: false },
    plan(p) {
      p.fill("water", 33, 2, 35, 27);
      p.street("sand", 2, [[3, 24], [30, 24], [30, 8], [22, 8]]); p.street("sand", 2, [[12, 24], [12, 20]]);
      p.fill("dirt", 7, 10, 26, 19);                                                        // the bare earth paddock (reference)
      fence(p, 6, 9, 22, 1); fence(p, 6, 10, 1, 10); fence(p, 27, 10, 1, 10); fence(p, 6, 20, 5, 1); fence(p, 14, 20, 14, 1);
      p.fill("rock", 9, 12, 13, 12); p.fill("rock", 20, 12, 24, 12); p.fill("rock", 10, 17, 15, 17); p.fill("rock", 21, 16, 25, 16);   // ledges the Skiddo jump
      p.decor("logHouse", 20, 2); p.decor("cabin", 9, 3);                                   // the farmhouse and the barn
      bale(p, 15, 5); bale(p, 16, 5); bale(p, 15, 6); bale(p, 5, 5); bale(p, 6, 6); bale(p, 24, 22); bale(p, 25, 22);
      p.fill("flowersPink", 4, 26, 10, 27); p.fill("flowersRed", 20, 26, 26, 27);
    },
  },
  // Azure Bay: sandy islets joined by narrow spits; a single footpath threads the tall grass to the Sea Spirit's Den.
  KalosAzureBay: {
    theme: { ground: "beach", road: "sand", border: "rock", water: "sea", density: 0.05, groves: 0, flowers: 0 },
    plan(p) {
      p.street("sand", 1, [[21, 35], [21, 5]]); p.street("sand", 1, [[21, 13], [8, 13]]); p.street("sand", 1, [[21, 19], [32, 19]]); p.street("sand", 1, [[21, 30], [12, 30]]);
      p.fill("palms", 4, 7, 5, 8); p.fill("palms", 35, 22, 36, 23); p.fill("palms", 9, 32, 10, 33); p.fill("palms", 35, 15, 36, 16);
      p.fill("rock", 19, 3, 19, 4); p.fill("rock", 23, 3, 23, 4);                            // the den's crag
    },
  },
  // Route 13, Lumiose Badlands: an open waste of red clay between red rock scarps, crossed by grind rails; only a faint
  // paler track marks the way (reference - it shows no wind turbines).
  KalosRoute13: {
    theme: { ground: "clay", road: "dirt", border: "ashrock", tree: "boulder", density: 0.05, groves: 0, flowers: 0, autoHouses: false },
    plan(p) {
      p.street("dirt", 1, [[23, 5], [23, 10], [32, 10], [32, 18], [20, 18], [20, 26], [27, 26], [27, 31], [23, 31], [23, 34]]);
      p.street("dirt", 1, [[20, 26], [9, 26], [9, 25]]);                                    // the plant's side track
      pipe(p, 13, 20, 6, 1); pipe(p, 23, 20, 8, 1); pipe(p, 30, 21, 1, 9); pipe(p, 3, 12, 15, 1); pipe(p, 3, 13, 1, 5);   // grind rails
      p.fill("ashrock", 26, 13, 29, 15); p.fill("ashrock", 36, 22, 42, 25); p.fill("ashrock", 4, 30, 9, 32); p.fill("ashrock", 37, 4, 42, 6); p.fill("ashrock", 12, 5, 16, 7);   // scarps
      p.fill("ashrock", 3, 3, 8, 8); p.fill("ashrock", 36, 30, 42, 36); p.fill("ashrock", 3, 20, 5, 28); p.fill("ashrock", 38, 10, 42, 17);
    },
  },
  // Route 14 (Lumiose end), Laverre Nature Trail: a boardwalk out of the city past the old playground and the first bog pools.
  KalosRoute14Entrance: {
    theme: { ground: "marsh", road: "deck", water: "bog", density: 0.12, groves: 0.05, flowers: 0, puddles: 0.04 },
    plan(p) {
      p.disc("water", 23, 8, 3.6, 2.4); p.disc("water", 23.5, 17, 3, 2); p.disc("water", 6, 18, 3, 1.8);
      p.street("deck", 2, [[15, 21], [15, 15], [14, 15], [14, 9], [15, 9], [15, 2]]);
      p.fill("sand", 4, 5, 11, 12); p.street("deck", 2, [[12, 10], [13, 10]]);                // the playground
      swing(p, 5, 6); slide(p, 9, 6); p.decor("bench", 4, 10); p.decor("bench", 11, 5);
      p.disc("gravel", 8, 10.5, 1.6);                                                        // the sandpit
      fence(p, 3, 4, 10, 1); fence(p, 3, 5, 1, 8); fence(p, 3, 13, 10, 1); fence(p, 12, 5, 1, 4); fence(p, 12, 12, 1, 1);
      p.fill("tree", 2, 20, 9, 21); p.fill("tree", 21, 20, 27, 21); p.fill("tree", 20, 2, 27, 3);
    },
  },
  // Route 14, Laverre Nature Trail: boardwalks wind over the swamp between black pools; a spur leads to the scary house on its island.
  KalosRoute14: {
    theme: { ground: "marsh", road: "deck", water: "bog", density: 0.15, groves: 0.06, flowers: 0, puddles: 0.06, treeTint: "dark" },
    plan(p) {
      p.disc("water", 33, 24, 3.6, 3); p.disc("water", 14, 12, 2.4, 1.6); p.disc("water", 26, 27, 2.2, 1.6); p.disc("water", 11, 3.5, 3, 1.4);
      p.street("deck", 2, [[20, 31], [20, 24], [15, 24], [15, 17], [22, 17], [22, 10], [20, 10], [20, 2]]);
      p.street("deck", 2, [[22, 17], [30, 17], [30, 15]]);                                   // the spur to the scary house
      p.building(2, "peak", { tint: p.roof(0.55, 0.5, 0.8) });
      p.fill("darktree", 2, 30, 14, 31); p.fill("darktree", 26, 30, 37, 31); p.fill("darktree", 35, 16, 37, 20);
    },
  },
  // Route 15, Brun Way: autumn woods - a brook under a footbridge, the fork to Route 16, and the ruined Lost Hotel in the east.
  KalosRoute15: {
    theme: { ground: "autumn", road: "dirt", border: "autumntree", tree: "honeyTree", treeTint: "autumn", density: 0.2, groves: 0.08, flowers: 0.02 },
    plan(p) {
      p.fill("water", 10, 5, 37, 6);                                                         // the brook out of the pond
      p.street("dirt", 2, [[3, 18], [13, 18], [13, 12], [20, 12], [20, 2]]);                  // Laverre - Dendemille
      p.street("dirt", 2, [[20, 12], [26, 12], [26, 26], [34, 26], [34, 25]]);                // the Lost Hotel
      p.street("dirt", 2, [[13, 18], [13, 26], [8, 26]]);                                     // Route 16
      p.bare(2); p.decor("brickFlat", 32, 17, { tint: p.roof(0.8, 0.7, 0.7) });
      p.paint(25, (c) => { const px = 34 * T, py = 23 * T; c.box(px + 1, py - 2, 14, 18, [30, 26, 34], [90, 80, 76]); c.rect(px + 3, py, 4, 6, [70, 60, 70]); });
      for (const [x, y] of [[31, 24], [37, 24], [30, 21]]) { if (spot(p, x, y)) p.paint(y + 1, (c) => { c.box(x * T + 2, y * T + 6, 12, 9, STONE[2], STONE[3]); c.rect(x * T + 4, y * T + 3, 6, 4, STONE[1]); }); }   // fallen masonry
      p.fill("autumntree", 22, 29, 37, 31); p.fill("autumntree", 2, 29, 5, 31); p.fill("autumntree", 28, 2, 37, 3); p.fill("autumntree", 15, 21, 23, 24);
    },
  },
  // Route 16, Melancolie Path: autumn woods along a stream, the fishing shack, and a plank bridge on the way down to Lumiose.
  KalosRoute16: {
    theme: { ground: "autumn", road: "dirt", border: "autumntree", tree: "honeyTree", treeTint: "autumn", density: 0.2, groves: 0.08, flowers: 0.02, autoHouses: false },
    plan(p) {
      p.fill("water", 10, 12, 37, 13); p.fill("water", 3, 16, 4, 31);                         // the stream
      p.street("dirt", 2, [[20, 5], [20, 10], [12, 10], [12, 19], [26, 19], [26, 25], [20, 25], [20, 28]]);
      p.decor("cabin", 32, 2); p.street("dirt", 1, [[20, 7], [33, 7]]);                        // the fishing shack
      p.fill("autumntree", 2, 29, 14, 31); p.fill("autumntree", 27, 29, 37, 31); p.fill("autumntree", 14, 21, 23, 23); p.fill("autumntree", 28, 16, 28, 20);
    },
  },
  // Frost Cavern approach: a snowbound climb in switchbacks past the frozen tarn to the cave mouth in the crag.
  KalosFrostExterior: {
    theme: { ground: "drift", road: "frostpath", border: "pine", tree: "tree1", treeTint: "frost", density: 0.12, groves: 0.05, flowers: 0 },
    plan(p) {
      p.street("frostpath", 2, [[20, 31], [20, 25], [28, 25], [28, 17], [14, 17], [14, 9], [20, 9], [20, 4]]);
      p.fill("rock", 13, 2, 18, 5); p.fill("rock", 22, 2, 30, 5); p.fill("rock", 31, 2, 37, 3);       // the crag
      p.fill("rock", 16, 20, 25, 21); p.fill("rock", 17, 12, 34, 13); p.fill("rock", 3, 20, 10, 21);   // ledges
      p.fill("pine", 30, 27, 37, 31); p.fill("pine", 2, 26, 10, 31); p.fill("pine", 33, 6, 37, 10);
      snowman(p, 16, 27); snowman(p, 24, 28); snowman(p, 23, 15);
    },
  },
  // Route 17, Mamoswine Road: a trench trodden through deep drifts, winding between snow-capped outcrops and pine belts.
  KalosRoute17: {
    theme: { ground: "drift", road: "snow", border: "pine", tree: "tree1", treeTint: "frost", density: 0.08, groves: 0.03, flowers: 0 },
    plan(p) {
      p.street("snow", 3, [[3, 17], [10, 17], [10, 11], [17, 11], [17, 17], [23, 17], [23, 23], [30, 23], [30, 17], [36, 17]]);
      p.disc("rock", 14, 14.5, 1.8, 1.4); p.disc("rock", 26.5, 20, 2, 1.5); p.disc("rock", 13, 24, 4, 1.8); p.disc("rock", 26, 9, 4.4, 2); p.disc("rock", 34, 26, 2.6, 1.6); p.disc("rock", 6, 8, 2.4, 1.6); p.disc("rock", 34, 10, 2, 1.4);
      p.fill("pine", 2, 2, 37, 3); p.fill("pine", 2, 30, 37, 31); p.fill("pine", 16, 4, 21, 5); p.fill("pine", 4, 28, 9, 29);
      snowman(p, 20, 20); snowman(p, 7, 13);
    },
  },
  // Route 18, Vallee Etroite Way: a narrow mining valley between rock walls, with ore-cart track along the gravel road.
  KalosRoute18: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.12, groves: 0, flowers: 0.02 },
    plan(p) {
      p.fill("rock", 33, 2, 37, 31); p.fill("rock", 2, 18, 5, 31); p.fill("rock", 22, 26, 32, 28); p.fill("rock", 10, 21, 16, 23); p.fill("rock", 22, 11, 32, 12); p.fill("rock", 6, 27, 14, 31);   // the valley walls
      p.street("gravel", 2, [[20, 31], [20, 24], [26, 24], [26, 16], [15, 16], [15, 9], [20, 9], [20, 2]]);
      p.street("gravel", 1, [[15, 9], [11, 9], [11, 8], [10, 8]]);                           // toward Terminus Cave
      cart(p, 27, 19, 5); cart(p, 21, 14, 4, [150, 90, 70]); cart(p, 8, 19, 4); cart(p, 23, 22, 3, [150, 90, 70]); cart(p, 24, 5, 5);
    },
  },
  // Route 19, Grande Vallee Way: marshy meadows cut by two streams, each crossed by a plank bridge.
  KalosRoute19: {
    theme: { ground: "marsh", road: "dirt", water: "water", density: 0.15, groves: 0.06, flowers: 0.1, puddles: 0.05 },
    plan(p) {
      p.fill("water", 10, 12, 37, 13); p.fill("water", 2, 21, 37, 22); p.disc("water", 32, 27, 3, 2);   // the streams
      p.street("dirt", 2, [[20, 31], [20, 26], [26, 26], [26, 17], [14, 17], [14, 7], [20, 7], [20, 2]]);
      p.fill("flowersPink", 28, 16, 33, 18); p.fill("flowersBlue", 4, 25, 9, 27); p.fill("flowersRed", 23, 4, 27, 6);
      p.fill("tree", 34, 2, 37, 9); p.fill("tree", 2, 29, 12, 31);
    },
  },
  // Route 19, Bridge of Friends: the long plank bridge over the gorge, lit by lamps, with benches on the viewing deck.
  KalosRoute19Bridge: {
    theme: { ground: "deck", road: "deck", density: 0, groves: 0, flowers: 0, puddles: 0 },
    plan(p) {
      p.street("planks", 3, [[20, 31], [20, 2]]); p.street("planks", 3, [[4, 16], [35, 16]]);
      for (const [x, y] of [[17, 4], [23, 4], [17, 9], [23, 9], [17, 23], [23, 23], [17, 28], [23, 28], [7, 13], [7, 19], [32, 13], [32, 19], [12, 13], [12, 19], [27, 13], [27, 19]]) lamp(p, x, y);
      p.decor("bench", 9, 13); p.decor("bench", 30, 13); p.decor("bench", 14, 13); p.decor("bench", 25, 13);
    },
  },
  // Route 20, Winding Woods: a dark wood of look-alike corridors - the true trail is only faintly trodden, the rest are dead ends.
  KalosRoute20: {
    theme: { ground: "shade", road: "dirt", border: "darktree", treeTint: "dark", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("darktree", 2, 2, 37, 31);
      carve(p, [[17, 3, 23, 8], [19, 8, 21, 14], [5, 6, 13, 13], [6, 12, 21, 14], [6, 14, 8, 22], [6, 20, 18, 22], [16, 16, 18, 22], [16, 16, 27, 18], [25, 10, 27, 18], [25, 10, 33, 12], [31, 10, 33, 26], [31, 16, 36, 18], [22, 24, 33, 26], [22, 22, 24, 29], [10, 22, 12, 28], [10, 26, 18, 28], [28, 4, 30, 10]]);
      p.street("dirt", 1, [[20, 4], [20, 13], [7, 13], [7, 21], [17, 21], [17, 17], [26, 17], [26, 11], [32, 11], [32, 17], [35, 17]]);
      p.disc("meadow", 29, 5, 1.6); p.disc("meadow", 14, 27, 1.6);
    },
  },
  // Winding Woods, second clearing: the trail doubles back north before dropping to the south exit.
  KalosWinding1: {
    theme: { ground: "shade", road: "dirt", border: "darktree", treeTint: "dark", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("darktree", 2, 2, 37, 31);
      carve(p, [[3, 16, 9, 18], [7, 7, 9, 18], [5, 6, 12, 11], [10, 9, 17, 11], [15, 9, 17, 15], [15, 13, 26, 15], [24, 6, 26, 15], [22, 4, 30, 7], [19, 15, 21, 21], [19, 19, 33, 21], [31, 12, 33, 27], [31, 12, 36, 14], [18, 25, 33, 27], [18, 25, 22, 30], [3, 18, 5, 27], [3, 25, 12, 27], [10, 21, 12, 27]]);
      p.street("dirt", 1, [[4, 17], [8, 17], [8, 10], [16, 10], [16, 14], [20, 14], [20, 20], [32, 20], [32, 26], [20, 26], [20, 29]]);
      p.disc("meadow", 26, 5.5, 2); p.fill("flowersBlue", 34, 12, 35, 13);
    },
  },
  // Winding Woods, third clearing: a long loop south and back up before the east exit.
  KalosWinding2: {
    theme: { ground: "shade", road: "dirt", border: "darktree", treeTint: "dark", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("darktree", 2, 2, 37, 31);
      carve(p, [[3, 16, 7, 18], [5, 18, 7, 28], [5, 26, 16, 28], [14, 20, 16, 28], [14, 20, 21, 22], [19, 12, 21, 22], [5, 5, 11, 11], [9, 11, 11, 14], [9, 12, 21, 14], [19, 14, 28, 16], [26, 8, 28, 16], [26, 8, 35, 10], [33, 8, 35, 18], [33, 16, 36, 18], [22, 20, 24, 26], [22, 24, 34, 26], [28, 20, 30, 26], [15, 4, 17, 12], [15, 4, 23, 6]]);
      p.street("dirt", 1, [[4, 17], [6, 17], [6, 27], [15, 27], [15, 21], [20, 21], [20, 15], [27, 15], [27, 9], [34, 9], [34, 17], [35, 17]]);
      p.disc("meadow", 32.5, 25, 1.6); p.fill("flowersPink", 21, 4, 22, 5);
    },
  },
  // Winding Woods, fourth clearing: one last climb round the north before the flowers that announce Pokemon Village.
  KalosWinding3: {
    theme: { ground: "shade", road: "dirt", border: "darktree", treeTint: "dark", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("darktree", 2, 2, 37, 31);
      carve(p, [[3, 16, 12, 18], [10, 12, 12, 18], [10, 12, 18, 14], [5, 6, 12, 10], [7, 10, 9, 16], [16, 6, 18, 14], [16, 6, 30, 8], [28, 6, 30, 22], [19, 16, 30, 18], [22, 20, 30, 22], [22, 20, 24, 27], [18, 25, 24, 27], [18, 25, 22, 30], [30, 10, 36, 12], [5, 18, 7, 28], [5, 26, 14, 28], [32, 20, 34, 28], [30, 20, 34, 22]]);
      p.street("dirt", 1, [[4, 17], [11, 17], [11, 13], [17, 13], [17, 7], [29, 7], [29, 21], [23, 21], [23, 26], [20, 26], [20, 29]]);
      p.fill("flowersPink", 18, 27, 19, 28); p.fill("flowersRed", 21, 27, 22, 28); p.fill("flowersBlue", 33, 26, 34, 27); p.disc("meadow", 12, 27, 1.6);
    },
  },
  // Route 21, Derniere Way: the river out of the tarn cuts a ravine across the road - two bridges, ledges, and the Victory Road crag.
  KalosRoute21: {
    theme: { ground: "grass", road: "sand", border: "rock", density: 0.15, groves: 0.05, flowers: 0.1 },
    plan(p) {
      p.fill("water", 10, 12, 26, 13); p.fill("water", 25, 14, 26, 31);                       // the river
      p.street("sand", 2, [[3, 17], [12, 17], [12, 9], [20, 9], [20, 2]]);                    // Snowbelle - Victory Road
      p.street("sand", 2, [[12, 20], [33, 20], [33, 26]]);                                    // the east bank
      p.fill("rock", 14, 2, 18, 4); p.fill("rock", 22, 2, 37, 4); p.fill("rock", 33, 5, 37, 9);          // the crag
      p.fill("rock", 2, 22, 9, 23); p.fill("rock", 14, 24, 22, 25); p.fill("rock", 28, 15, 36, 16); p.fill("rock", 22, 6, 27, 7);   // ledges
      hedgeRow(p, 14, 16, 9, 1); hedgeRow(p, 28, 23, 4, 1);
      p.fill("flowersPink", 4, 26, 9, 28); p.fill("flowersBlue", 29, 28, 34, 30);
    },
  },
  // Victory Road, the grove: an open-air shelf between two cave mouths - ledges, fallen columns and the ruins' old road.
  KalosVictoryGrove: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "tree1", density: 0.12, groves: 0.05, flowers: 0.03 },
    plan(p) {
      p.street("gravel", 2, [[20, 31], [20, 20], [22, 20], [22, 14], [20, 14], [20, 2]]);
      p.fill("rock", 3, 16, 15, 17); p.fill("rock", 25, 16, 36, 17); p.fill("rock", 3, 26, 15, 27); p.fill("rock", 25, 28, 36, 29); p.fill("rock", 3, 6, 15, 7); p.fill("rock", 25, 6, 36, 7);   // ledges
      p.fill("rock", 14, 2, 18, 4); p.fill("rock", 22, 2, 26, 4);
      for (const [x, y, t] of [[18, 7, 34], [23, 7, 22], [18, 18, 26], [24, 18, 34], [17, 27, 30], [23, 27, 20], [10, 10, 28], [29, 20, 24]]) column(p, x, y, t);
      p.fill("paving", 9, 9, 12, 10); p.fill("paving", 27, 19, 31, 20);                        // flagstones of the ruin
    },
  },
  // Victory Road, the waterfall: the falls drop into a tarn, the stream runs on over a second ledge; the trail climbs round them.
  KalosVictoryFalls: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.1, groves: 0, flowers: 0.02 },
    plan(p) {
      p.fill("water", 5, 16, 7, 31); falls(p, 4, 1, 5, 2); p.fill("rock", 2, 22, 4, 23); p.fill("rock", 8, 22, 16, 23); falls(p, 5, 22, 3, 2);
      p.street("gravel", 2, [[20, 31], [20, 25], [28, 25], [28, 14], [20, 14], [20, 4]]);
      p.fill("rock", 22, 19, 26, 20); p.fill("rock", 31, 19, 36, 20); p.fill("rock", 12, 9, 17, 10); p.fill("rock", 23, 8, 34, 9); p.fill("rock", 12, 2, 18, 4); p.fill("rock", 22, 2, 37, 4); p.fill("rock", 31, 26, 37, 31);
      column(p, 17, 6, 30); column(p, 23, 6, 22);
    },
  },
  // Route 22 lower, the waterfall basin: the falls feed a wide pool under the crag; hedged steps lead up to the Chamber of Emptiness.
  KalosRoute22Lower: {
    theme: { ground: "grass", road: "gravel", border: "rock", density: 0.12, groves: 0.05, flowers: 0.1 },
    plan(p) {
      p.fill("rock", 3, 3, 15, 6); falls(p, 7, 3, 4, 4);                                      // the falls above the pool
      p.street("gravel", 2, [[20, 28], [20, 22], [27, 22], [27, 12], [20, 12], [20, 5]]);
      p.fill("rock", 16, 2, 18, 5); p.fill("rock", 22, 2, 28, 4); p.fill("rock", 30, 8, 36, 10); p.fill("rock", 22, 16, 25, 17); p.fill("rock", 30, 18, 36, 19);
      hedgeRow(p, 22, 25, 9, 1); hedgeRow(p, 15, 14, 1, 7); hedgeRow(p, 22, 8, 5, 1);
      p.fill("flowersBlue", 15, 25, 18, 27); p.fill("flowersRed", 30, 12, 33, 14);
    },
  },
  // Lumiose, the Champion's parade: the boulevard dressed with flags and lamps between tall town houses, a dais at its head.
  KalosChampionParade: {
    theme: { ground: "ornate", road: "cobble", density: 0, groves: 0, flowers: 0, lawns: 0, autoHouses: false },
    plan(p) {
      p.street("cobble", 5, [[20, 31], [20, 11]]); p.fill("paving", 13, 5, 27, 10); p.disc("brick", 20.5, 8, 3.2, 2.4);   // the avenue and the dais
      p.decor("brickTall", 3, 2); p.decor("apartment", 4, 13); p.decor("towerShort", 3, 20); p.decor("towerShort", 33, 2); p.decor("apartment", 33, 13); p.decor("brickTall", 33, 20);
      p.decor("apartment", 8, 2); p.decor("apartment", 29, 2);
      [[16, 12], [24, 12], [16, 16], [24, 16], [16, 20], [24, 20], [16, 24], [24, 24], [16, 28], [24, 28]].forEach(([x, y], k) => banner(p, x, y, [[214, 70, 70], [70, 120, 200], [240, 200, 80]][k % 3]));
      for (const y of [14, 18, 22, 26]) { lamp(p, 15, y); lamp(p, 25, y); }
      hedgeRow(p, 9, 12, 5, 1); hedgeRow(p, 27, 12, 5, 1); hedgeRow(p, 9, 29, 5, 1); hedgeRow(p, 27, 29, 5, 1);
      p.fill("flowersRed", 9, 14, 13, 16); p.fill("flowersBlue", 27, 14, 31, 16); p.fill("flowersPink", 9, 25, 13, 27); p.fill("flowersRed", 27, 25, 31, 27);
      p.decor("fountain", 10, 19); p.decor("fountain", 28, 19);
      statue(p, 14, 6, [232, 196, 80]); statue(p, 26, 6, [232, 196, 80]);
    },
  },
  // Lumiose, Le Nah Alley: a brick back alley with two cross lanes where Looker's suspects wait.
  KalosLookerAlley0: {
    theme: { ground: "paving", road: "asphalt", border: "brick", tree: "barrels", density: 0, groves: 0, flowers: 0, autoHouses: false },
    plan(p) {
      alleyBlocks(p, [[17, 5, 19, 27], [13, 5, 23, 9], [5, 11, 31, 13], [5, 18, 31, 20], [24, 14, 26, 17]]);
      p.street("asphalt", 1, [[18, 26], [18, 6]]); p.street("asphalt", 1, [[6, 12], [30, 12]]); p.street("asphalt", 1, [[6, 19], [30, 19]]);
      p.decor("barrels", 13, 5); p.decor("barrels", 23, 5); p.decor("barrel", 5, 11); p.decor("barrel", 31, 13); p.decor("barrels", 5, 19); p.decor("barrel", 31, 18); p.decor("barrel", 24, 14);
      lamp(p, 17, 10); lamp(p, 19, 22); lamp(p, 12, 11); lamp(p, 26, 18);
    },
  },
  // Lumiose, Galette Alley: a dog-leg alley round the back of the galette stand to a small yard.
  KalosLookerAlley1: {
    theme: { ground: "paving", road: "asphalt", border: "brick", tree: "barrels", density: 0, groves: 0, flowers: 0, autoHouses: false },
    plan(p) {
      alleyBlocks(p, [[17, 15, 19, 27], [17, 15, 27, 17], [25, 6, 27, 17], [14, 5, 27, 8], [9, 20, 19, 22]], [226, 206, 170], [128, 84, 76]);
      p.street("asphalt", 1, [[18, 26], [18, 16], [26, 16], [26, 7], [18, 7]]);
      p.decor("barrels", 14, 5); p.decor("barrel", 15, 5); p.decor("barrels", 9, 20); p.decor("barrel", 10, 22); p.decor("barrel", 27, 12);
      p.decor("bench", 21, 5); lamp(p, 19, 19); lamp(p, 25, 9); lamp(p, 17, 23);
    },
  },
  // Lumiose, Station Alley: a straight service lane beside the station's pipework to a loading yard.
  KalosLookerAlley2: {
    theme: { ground: "paving", road: "asphalt", border: "brick", tree: "barrels", density: 0, groves: 0, flowers: 0, autoHouses: false },
    plan(p) {
      alleyBlocks(p, [[16, 10, 20, 27], [8, 5, 28, 10]], [190, 192, 200], [70, 80, 96]); p.fill("gravel", 9, 5, 27, 5);
      p.street("asphalt", 2, [[18, 26], [18, 7]]);
      pipe(p, 9, 5, 7, 1); pipe(p, 21, 5, 7, 1); pipe(p, 21, 12, 1, 12); pipe(p, 15, 12, 1, 6, [170, 120, 90]);
      p.decor("barrels", 8, 8); p.decor("barrels", 28, 8); p.decor("barrel", 9, 9); p.decor("barrel", 27, 9); p.decor("barrel", 16, 20); p.decor("barrels", 16, 23);
      lamp(p, 12, 7); lamp(p, 24, 7);
    },
  },
  // Lumiose, Cafe Triste Alley: a zigzag alley behind the cafe, its yard set with tables.
  KalosLookerAlley3: {
    theme: { ground: "paving", road: "asphalt", border: "brick", tree: "barrels", density: 0, groves: 0, flowers: 0, autoHouses: false },
    plan(p) {
      alleyBlocks(p, [[17, 20, 19, 27], [9, 20, 19, 22], [9, 11, 11, 22], [9, 11, 27, 13], [24, 11, 27, 18], [17, 5, 19, 13], [12, 5, 24, 8]], [216, 190, 180], [84, 104, 110]);
      p.street("asphalt", 1, [[18, 26], [18, 21], [10, 21], [10, 12], [18, 12], [18, 6]]);
      parasol(p, 13, 5, [90, 90, 110]); parasol(p, 23, 5, [90, 90, 110]); parasol(p, 15, 8, [150, 70, 80]); parasol(p, 21, 8, [150, 70, 80]);
      p.decor("barrels", 27, 11); p.decor("barrel", 9, 22); p.decor("barrel", 24, 18); lamp(p, 11, 14); lamp(p, 19, 23);
    },
  },
  // Lumiose, South Shopping Arcade: a row of boutiques along a promenade, a fountain circle and a cafe terrace.
  KalosLumioseArcade: {
    theme: { ground: "paving", road: "cobble", border: "brick", tree: "hedge", density: 0, groves: 0, flowers: 0, lawns: 0, autoHouses: false },
    plan(p) {
      [["gable", p.roof(1.5, 0.8, 0.8)], ["peak", p.roof(0.8, 1, 1.6)], ["gable", p.roof(1.9, 1.5, 0.6)], ["peak", p.roof(0.7, 1.4, 0.8)], ["gable", p.roof(1.6, 0.9, 1.5)], ["peak", p.roof(1.5, 0.8, 0.8)]].forEach(([st, tint], k) => p.building(k + 1, st, { tint }));
      p.building(7, "martSmall"); p.building(8, "pcSmall");
      p.street("cobble", 2, [[4, 9], [55, 9]]); p.street("cobble", 2, [[4, 15], [28, 15]]); p.street("cobble", 2, [[11, 9], [11, 16]]);
      p.street("cobble", 4, [[30, 43], [30, 9]]);
      p.disc("brick", 30, 28.5, 7, 5); p.decor("parkFountain", 26, 26);                       // the fountain circle
      p.fill("lawn", 4, 19, 22, 40); p.fill("lawn", 38, 26, 55, 40); p.fill("lawn", 51, 3, 55, 7);
      treeRow(p, 6, 20, 5, 4, 0); treeRow(p, 6, 36, 5, 4, 0); treeRow(p, 40, 37, 4, 4, 0);
      p.fill("flowersRed", 6, 25, 20, 26); p.fill("flowersBlue", 6, 31, 20, 32); p.fill("flowersPink", 40, 28, 53, 29);
      p.fill("ornate", 36, 13, 54, 22);                                                       // the cafe terrace
      [[38, 15], [42, 15], [46, 15], [50, 15], [40, 19], [44, 19], [48, 19], [52, 19]].forEach(([x, y], k) => parasol(p, x, y, [[214, 70, 70], [240, 200, 80], [70, 120, 200]][k % 3]));
      hedgeRow(p, 36, 12, 19, 1); hedgeRow(p, 36, 23, 19, 1);
      for (const y of [14, 20, 34, 40]) { lamp(p, 27, y); lamp(p, 33, y); }
      p.decor("bench", 24, 34); p.decor("bench", 36, 31); p.decor("bench", 24, 22);
    },
  },
  // Lumiose, North Activity Arcade: the same promenade of venues, here round twin fountains and a statue garden.
  KalosLumioseNorthArcade: {
    theme: { ground: "paving", road: "cobble", border: "brick", tree: "hedge", density: 0, groves: 0, flowers: 0, lawns: 0, autoHouses: false },
    plan(p) {
      [["peak", p.roof(0.8, 1, 1.6)], ["gable", p.roof(1.9, 1.5, 0.6)], ["gable", p.roof(1.5, 0.8, 0.8)], ["peak", p.roof(1.6, 0.9, 1.5)], ["gable", p.roof(0.7, 1.4, 0.8)], ["peak", p.roof(1.9, 1.5, 0.6)]].forEach(([st, tint], k) => p.building(k + 1, st, { tint }));
      p.building(7, "pcSmall"); p.building(8, "martSmall");
      p.street("cobble", 2, [[4, 9], [55, 9]]); p.street("cobble", 2, [[4, 15], [28, 15]]); p.street("cobble", 2, [[11, 9], [11, 16]]);
      p.street("cobble", 4, [[30, 43], [30, 9]]); p.street("cobble", 2, [[8, 30], [52, 30]]);
      p.disc("brick", 16, 30.5, 5, 4); p.decor("twinFountain", 14, 28); p.disc("brick", 45, 30.5, 5, 4); p.decor("twinFountain", 43, 28);   // twin fountains
      p.fill("lawn", 4, 19, 26, 24); p.fill("lawn", 34, 13, 55, 24); p.fill("lawn", 4, 36, 26, 41); p.fill("lawn", 34, 37, 55, 41); p.fill("lawn", 51, 3, 55, 7);
      [[37, 15], [41, 15], [45, 15], [49, 15], [53, 15], [37, 21], [41, 21], [45, 21], [49, 21], [53, 21]].forEach(([x, y], k) => statue(p, x, y, k % 2 ? [232, 196, 80] : [206, 204, 196]));
      p.fill("flowersBlue", 36, 17, 54, 19); p.fill("flowersRed", 6, 20, 24, 22); p.fill("flowersPink", 6, 38, 24, 39); p.fill("flowersBlue", 36, 39, 52, 40);
      hedgeRow(p, 4, 18, 23, 1); hedgeRow(p, 4, 35, 23, 1); hedgeRow(p, 34, 36, 22, 1); hedgeRow(p, 34, 25, 22, 1);
      for (const y of [14, 20, 26, 34, 40]) { lamp(p, 27, y); lamp(p, 33, y); }
      p.decor("bench", 10, 27); p.decor("bench", 21, 27); p.decor("bench", 39, 27); p.decor("bench", 50, 27);
    },
  },
};
