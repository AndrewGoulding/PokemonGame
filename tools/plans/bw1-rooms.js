// Unova (Black/White) interiors and caves, drawn by hand. See README.md, "Rooms".
// The rooms keep the game's own floor (a 44x34 hall, x 2..45, y 2..35): plans re-tile it, stand props on it and paint.
"use strict";
const T = 16;
const WHITE = [244, 244, 250], INK = [40, 38, 52], GOLD = [236, 196, 80], WOOD = [156, 108, 62], DKW = [80, 52, 34];
const A = (col, a) => [col[0], col[1], col[2], a];
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));
const sh = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
const X0 = 2, X1 = 45, Y0 = 2, Y1 = 37;

// ---------------------------------------------------------------- shared pieces
// Tiles that must stay free (warps, the tile inside the exit, people and the tile below them, the map's middle).
function kept(p) {
  if (p._kept) return p._kept;
  const s = new Set(), add = (x, y) => s.add(x + "," + y);
  for (const w of p.warps) { add(w.x, w.y); add(w.x, w.y - 1); add(w.x, w.y + 1); add(w.x + 1, w.y); add(w.x - 1, w.y); }
  for (const q of p.people) { add(q.x, q.y); add(q.x, q.y + 1); }
  add(p.W >> 1, p.H >> 1);
  return (p._kept = s);
}
// A solid block of tiles, leaving any kept tile free.
function blk(p, x, y, w = 1, h = 1) { const k = kept(p); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!k.has(i + "," + j)) p.block(i, j, 1, 1); }
function glow(c, cx, cy, r, col, a = 30) { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); }
function frame(c, x, y, w, h, col, t = 1) { c.rect(x, y, w, t, col); c.rect(x, y + h - t, w, t, col); c.rect(x, y + t, t, h - 2 * t, col); c.rect(x + w - t, y + t, t, h - 2 * t, col); }
// The room's back wall (tile rows 0-1), a flat colour with a light top edge and a dark skirting.
function wall(c, col, skirt) { c.rect(X0 * T, 0, (X1 - X0 + 1) * T, 32, col); c.rect(X0 * T, 0, (X1 - X0 + 1) * T, 3, mix(col, WHITE, 0.3)); c.rect(X0 * T, 27, (X1 - X0 + 1) * T, 5, skirt || sh(col, 0.6)); }
// A carpet over tiles x0..x1, y0..y1.
function rug(c, x0, y0, x1, y1, col, trim) { const x = x0 * T + 1, y = y0 * T + 1, w = (x1 - x0 + 1) * T - 2, h = (y1 - y0 + 1) * T - 2; c.rect(x, y, w, h, col); frame(c, x, y, w, h, trim || sh(col, 0.6), 1); frame(c, x + 3, y + 3, w - 6, h - 6, trim || mix(col, WHITE, 0.4), 1); }
// A round floor plate centred on a tile.
function plate(c, x, y, col, r = 20) { const cx = x * T + 8, cy = y * T + 9; c.ellipse(cx, cy, r, r * 0.8, sh(col, 0.45)); c.ellipse(cx, cy, r - 2, r * 0.8 - 2, col); c.ellipse(cx, cy, r - 5, r * 0.8 - 4, mix(col, WHITE, 0.45), 2); }
// A stone column on one tile (solid), its upper part walked behind.
function pillar(p, x, y, col = [176, 172, 186], h = 30) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 9, 4, [0, 0, 0, 70]); c.box(px, py + 9, 16, 6, sh(col, 0.8), sh(col, 0.4)); c.box(px + 2, py - 2, 12, 12, col, sh(col, 0.4)); c.rect(px + 4, py - 1, 3, 10, mix(col, WHITE, 0.45)); top.box(px + 2, py - h + 6, 12, h - 7, col, sh(col, 0.4)); top.rect(px + 4, py - h + 7, 3, h - 9, mix(col, WHITE, 0.45)); top.box(px, py - h, 16, 6, mix(col, WHITE, 0.2), sh(col, 0.4)); });
}
// A standing torch / brazier on one tile.
function torch(p, x, y, flame = [250, 150, 40], post = [96, 98, 112]) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T; glow(c, px, py, 22, flame, 22); c.ellipse(px, py + 13, 6, 3, [0, 0, 0, 70]); c.box(px - 2, py - 2, 4, 16, post, INK); c.box(px - 5, py + 11, 10, 4, post, INK); top.box(px - 6, py - 7, 12, 6, sh(post, 1.2), INK); top.poly([[px - 5, py - 7], [px + 5, py - 7], [px + 3, py - 14], [px, py - 21], [px - 3, py - 14]], flame); top.poly([[px - 3, py - 7], [px + 3, py - 7], [px, py - 16]], mix(flame, WHITE, 0.6)); });
}
// A wooden crate / steel box on one tile.
function crate(p, x, y, col = [180, 134, 80]) { blk(p, x, y); p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.rect(px + 2, py + 13, 14, 3, [0, 0, 0, 60]); c.box(px + 1, py - 3, 14, 17, col, sh(col, 0.4)); c.rect(px + 2, py - 2, 12, 4, mix(col, WHITE, 0.3)); c.line(px + 2, py + 3, px + 13, py + 12, sh(col, 0.65)); c.line(px + 13, py + 3, px + 2, py + 12, sh(col, 0.65)); }); }
// Bookshelves along tile row y, tiles x0..x1 (solid; the upper half is walked behind).
function shelf(p, x0, x1, y, seed = 1, wood = WOOD) {
  blk(p, x0, y, x1 - x0 + 1, 1);
  p.paint(y + 1, (c, top) => {
    const px = x0 * T, py = y * T, w = (x1 - x0 + 1) * T, BOOKS = [[200, 60, 60], [60, 110, 200], [70, 160, 90], [230, 190, 80], [150, 90, 180], [230, 230, 220], [200, 120, 60]];
    c.rect(px + 2, py + 13, w, 3, [0, 0, 0, 60]);
    for (const [cv, yy, hh] of [[top, py - 16, 16], [c, py, 15]]) {
      cv.box(px, yy, w, hh, sh(wood, 0.5), sh(wood, 0.35)); if (cv === top) cv.rect(px, yy, w, 3, mix(wood, WHITE, 0.25));
      for (let bx = px + 2; bx < px + w - 3; bx += 3) { const r = p.hash(bx, yy, seed), col = BOOKS[Math.floor(p.hash(bx, yy, seed + 3) * BOOKS.length) % BOOKS.length], bh = 8 + Math.floor(r * 3); if (r < 0.1) continue; cv.rect(bx, yy + hh - 3 - bh, 2, bh, col); cv.rect(bx, yy + hh - 3 - bh + 2, 2, 1, mix(col, WHITE, 0.5)); }
      cv.rect(px, yy + hh - 3, w, 2, wood);
    }
    c.rect(px, py + 13, w, 2, sh(wood, 0.35));
  });
}
// Bookcases painted along the back wall, px x0..x1.
function wallBooks(p, c, x0, x1, seed = 5, wood = WOOD) {
  const BOOKS = [[200, 60, 60], [60, 110, 200], [70, 160, 90], [230, 190, 80], [150, 90, 180], [230, 230, 220]];
  c.box(x0, 2, x1 - x0, 30, sh(wood, 0.5), sh(wood, 0.3));
  for (let r = 0; r < 2; r++) { for (let bx = x0 + 2; bx < x1 - 3; bx += 3) { const h = p.hash(bx, r, seed); if (h < 0.08) continue; const col = BOOKS[Math.floor(p.hash(bx, r, seed + 2) * BOOKS.length) % BOOKS.length], bh = 8 + Math.floor(h * 4); c.rect(bx, 4 + r * 14 + 11 - bh, 2, bh, col); } c.rect(x0 + 1, 15 + r * 14, x1 - x0 - 2, 2, wood); }
  for (let x = x0; x < x1; x += 48) c.rect(x, 2, 2, 30, wood);
}
// A window on the back wall, px.
function windowAt(c, x, w = 22, sky = [150, 200, 240], fr = [236, 226, 200]) { c.box(x, 5, w, 20, sky, sh(fr, 0.5)); c.rect(x + 1, 6, w - 2, 6, mix(sky, WHITE, 0.4)); c.rect(x + w / 2 - 1, 5, 2, 20, fr); c.rect(x, 14, w, 2, fr); c.rect(x - 2, 25, w + 4, 3, fr); }
// A hanging banner on the back wall, px.
function banner(c, x, y, w, h, col, mark) { c.rect(x - 1, y - 2, w + 2, 3, [70, 60, 50]); c.rect(x, y, w, h - 5, col); c.poly([[x, y + h - 5], [x + w, y + h - 5], [x + w / 2, y + h]], col); c.rect(x, y, 2, h - 5, sh(col, 0.7)); if (mark) c.ellipse(x + w / 2, y + (h - 5) / 2, w / 4, w / 4, mark); }
function flameMark(c, x, y, s = 1) { c.poly([[x - 5 * s, y + 5 * s], [x + 5 * s, y + 5 * s], [x + 4 * s, y - 2 * s], [x, y - 8 * s], [x - 4 * s, y - 2 * s]], [240, 110, 40]); c.poly([[x - 2 * s, y + 5 * s], [x + 2 * s, y + 5 * s], [x, y - 3 * s]], [252, 214, 90]); }
function dropMark(c, x, y, s = 1) { c.ellipse(x, y + 1 * s, 5 * s, 5 * s, [80, 150, 240]); c.poly([[x - 4 * s, y - 1 * s], [x + 4 * s, y - 1 * s], [x, y - 9 * s]], [80, 150, 240]); c.ellipse(x - 2 * s, y, 1.5 * s, 2 * s, [200, 230, 255]); }
function leafMark(c, x, y, s = 1) { c.ellipse(x, y, 4 * s, 7 * s, [80, 180, 90]); c.line(x, y - 6 * s, x, y + 8 * s, [40, 110, 60], 1); c.line(x, y, x + 3 * s, y - 3 * s, [40, 110, 60]); c.line(x, y + 2 * s, x - 3 * s, y - 1 * s, [40, 110, 60]); }

// The way out at the foot of the room: steps down through the front wall, drawn over the tile below the exit.
function doorstep(p, col = [150, 146, 160]) {
  const w = p.warps.find((q) => q.exit); if (!w || p.isFloor(w.x, w.y + 1)) return;
  p.paint(w.y + 2.5, (c) => { const px = w.x * T - 8, py = (w.y + 1) * T; c.rect(px, py - 1, 32, 17, [20, 18, 28]); for (let k = 0; k < 3; k++) { c.rect(px + 2 + k * 2, py + k * 5, 28 - k * 4, 4, sh(col, 1 - k * 0.22)); c.rect(px + 2 + k * 2, py + k * 5, 28 - k * 4, 1, sh(col, 1.2 - k * 0.22)); } });
}
// An entrance set in the floor (the rooms entered from the side): a stair hatch or a striped pad on warp k.
function hatch(p, k, kind, col = [150, 146, 160]) {
  const w = p.warps[k]; p.bare(k);
  p.paint(0.5, (c) => {
    const px = w.x * T, py = w.y * T;
    if (kind === "stairs") { c.rect(px - 10, py - 6, 36, 28, sh(col, 0.5)); c.rect(px - 8, py - 4, 32, 24, [16, 14, 24]); for (let i = 0; i < 4; i++) { c.rect(px - 8 + i * 8, py - 4 + i * 2, 8, 24 - i * 2, sh(col, 1.1 - i * 0.24)); c.rect(px - 8 + i * 8, py - 4 + i * 2, 1, 24 - i * 2, sh(col, 0.5)); } c.rect(px - 10, py - 8, 36, 3, col); }
    else { c.box(px - 10, py - 8, 36, 32, [70, 74, 92], INK); for (let i = 0; i < 9; i++) { c.rect(px - 9 + i * 4, py - 7, 2, 3, i % 2 ? [240, 200, 50] : INK); c.rect(px - 9 + i * 4, py + 20, 2, 3, i % 2 ? INK : [240, 200, 50]); } c.rect(px - 6, py - 2, 28, 20, col); c.poly([[px - 2, py + 8], [px + 6, py], [px + 6, py + 5], [px + 16, py + 5], [px + 16, py + 11], [px + 6, py + 11], [px + 6, py + 16]], WHITE); }
  });
}

const PLANS = {};

// ================================================================ Gyms
// Striaton Gym: the trio's restaurant. Three great curtains (fire, water, grass) hang across the hall with their
// floor switches in front; dining tables below, the brothers' stage behind.
PLANS.BW1StriatonCityGym = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const CUR = [[5, 16, [206, 56, 50], flameMark], [19, 29, [56, 110, 214], dropMark], [32, 43, [66, 160, 84], leafMark]], SW = [12, 24, 36];
    p.fill("hallFloor", X0, Y0, X1, 9);
    for (const [x0, x1] of CUR) blk(p, x0, 11, x1 - x0 + 1, 1);
    const tables = []; for (const y of [19, 24, 29]) for (const x of [6, 12, 18, 28, 34, 40]) tables.push([x, y]);
    for (const [x, y] of tables) blk(p, x, y, 2, 2);
    for (const [x, y] of [[20, 36], [28, 36], [2, 36], [45, 36], [2, 12], [45, 12]]) p.decor("rPlant", x, y, { optional: true });
    p.paint(0, (c) => {
      // panelled back wall with arched windows and wine racks
      wall(c, [150, 96, 70], [96, 58, 44]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 16) c.rect(x, 3, 1, 24, [120, 74, 54]);
      for (const x of [5, 13, 21, 26, 34, 42]) windowAt(c, x * T - 3, 22, [250, 226, 150], [246, 236, 210]);
      for (const x of [9, 17, 30, 38]) { c.box(x * T - 8, 6, 32, 20, [70, 42, 34], [50, 30, 26]); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) c.ellipse(x * T - 4 + i * 6, 10 + j * 6, 2, 2, [[120, 30, 50], [60, 100, 60], [200, 170, 90]][(i + j) % 3]); }
      // the stage: a step along its front and a rug under each brother
      c.rect(X0 * T, 9 * T + 10, 44 * T, 6, [150, 120, 90]); c.rect(X0 * T, 9 * T + 10, 44 * T, 1, [236, 220, 190]);
      CUR.forEach(([, , col, mark], i) => { const x = 16 + i * 8; rug(c, x - 2, 5, x + 2, 8, mix(col, [255, 255, 255], 0.15), GOLD); mark(c, x * T + 8, 8 * T + 4, 1); });
      // the red carpet from the door, branching to the three switches
      rug(c, 23, 12, 25, 37, [170, 40, 50], GOLD); rug(c, 10, 17, 38, 17, [170, 40, 50], GOLD); c.rect(23 * T + 4, 17 * T + 1, 3 * T - 8, T - 2, [170, 40, 50]);
      CUR.forEach(([, , col, mark], i) => { plate(c, SW[i], 15, col, 22); mark(c, SW[i] * T + 8, 14 * T - 2, 1); });
    });
    // the curtains
    CUR.forEach(([x0, x1, col, mark]) => p.paint(12, (c, top) => {
      const px = x0 * T, w = (x1 - x0 + 1) * T, py = 11 * T, dk = sh(col, 0.62), lt = mix(col, WHITE, 0.25);
      c.rect(px + 2, py + 14, w, 3, [0, 0, 0, 70]);
      for (const [cv, y0, h] of [[top, py - 32, 32], [c, py, 15]]) { cv.rect(px, y0, w, h, col); for (let x = px; x < px + w; x += 8) { cv.rect(x, y0, 2, h, dk); cv.rect(x + 4, y0, 1, h, lt); } }
      for (let x = px; x < px + w; x += 8) c.ellipse(x + 4, py + 14, 4, 2, dk);
      top.rect(px - 3, py - 36, w + 6, 5, GOLD); top.rect(px - 3, py - 32, w + 6, 1, [150, 110, 40]);
      for (let x = px; x < px + w; x += 16) top.poly([[x, py - 31], [x + 16, py - 31], [x + 8, py - 24]], dk);
      const cx = px + w / 2; top.ellipse(cx, py - 12, 13, 13, GOLD); top.ellipse(cx, py - 12, 11, 11, [250, 244, 220]); mark(top, cx, py - 12, 1.1);
      for (const ex of [px, px + w - 4]) { top.rect(ex, py - 31, 4, 31, GOLD); c.rect(ex, py, 4, 14, GOLD); }
    }));
    // dining tables with white cloths
    for (const [x, y] of tables) p.paint(y + 2, (c) => {
      const cx = (x + 1) * T, cy = (y + 1) * T;
      c.ellipse(cx, cy + 9, 14, 5, [0, 0, 0, 60]);
      for (const dx of [-14, 9]) { c.box(cx + dx, cy - 6, 6, 12, [150, 96, 60], DKW); c.rect(cx + dx + 1, cy - 5, 4, 3, [200, 60, 60]); }
      c.ellipse(cx, cy + 2, 11, 9, [190, 186, 200]); c.ellipse(cx, cy, 11, 9, [250, 250, 252]); c.ellipse(cx, cy, 11, 9, [206, 206, 220], 1);
      c.ellipse(cx - 4, cy + 1, 3, 2, [220, 226, 240]); c.ellipse(cx + 4, cy + 1, 3, 2, [220, 226, 240]); c.rect(cx - 1, cy - 6, 2, 5, [250, 240, 200]); c.rect(cx - 1, cy - 8, 2, 2, [250, 170, 60]);
    });
  },
};

// Nacrene Gym: the museum's library. Rows of bookshelves, Lenora's study at the back and the stair hidden behind a bookcase.
PLANS.BW1NacreneCityGym = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const RA = [[4, 9], [12, 20], [28, 36], [39, 43]], RB = [[2, 7], [10, 20], [28, 38], [41, 45]];
    [[12, RA], [18, RB], [22, RA], [26, RB], [30, RA]].forEach(([y, segs], k) => segs.forEach(([x0, x1], j) => shelf(p, x0, x1, y, 10 + k * 7 + j)));
    p.fill("hallFloor", X0, Y0, X1, 9);
    blk(p, 21, 3, 7, 1); blk(p, 31, 2, 3, 2); blk(p, 35, 2, 3, 1); blk(p, 6, 3, 7, 3); blk(p, 40, 4, 2, 2);
    for (const [x, y] of [[5, 34], [40, 34]]) blk(p, x, y, 3, 1);
    p.paint(0, (c) => {
      wall(c, [120, 84, 60], [70, 46, 36]); wallBooks(p, c, X0 * T, 21 * T, 3); wallBooks(p, c, 28 * T, (X1 + 1) * T, 9);
      c.box(22 * T + 8, 3, 5 * T, 24, [226, 214, 180], [96, 70, 40]); c.rect(23 * T, 8, 4 * T, 1, [150, 120, 80]); c.ellipse(24 * T + 8, 15, 14, 7, [150, 190, 140]); c.ellipse(24 * T + 2, 14, 5, 3, [110, 160, 200]);
      c.rect(X0 * T, 9 * T + 10, 44 * T, 6, [120, 100, 80]); c.rect(X0 * T, 9 * T + 10, 44 * T, 1, [226, 210, 180]);
      rug(c, 23, 10, 25, 37, [50, 120, 80], GOLD); rug(c, 20, 5, 28, 8, [50, 120, 80], GOLD);
      for (const x of [12, 24, 36]) plate(c, x, 15, [226, 200, 120], 20);
    });
    // Lenora's desk
    p.paint(4, (c) => { const px = 21 * T, py = 3 * T; c.rect(px + 2, py + 14, 7 * T, 3, [0, 0, 0, 60]); c.box(px, py - 2, 7 * T, 17, [130, 84, 50], DKW); c.rect(px + 1, py - 1, 7 * T - 2, 5, [176, 126, 80]); c.box(px + 8, py - 4, 14, 8, [250, 246, 230], [150, 140, 120]); c.box(px + 80, py - 6, 12, 9, [200, 60, 60], INK); c.ellipse(px + 56, py - 2, 6, 6, [90, 150, 210]); c.ellipse(px + 54, py - 3, 3, 2, [110, 190, 120]); c.rect(px + 55, py + 4, 2, 3, GOLD); });
    // the hidden stair: a bookcase slid aside over a dark stairwell
    p.paint(4.1, (c) => { const px = 31 * T, py = 2 * T; c.rect(px, py, 3 * T, 2 * T - 2, [20, 18, 26]); for (let k = 0; k < 5; k++) c.rect(px + 4 + k * 2, py + 4 + k * 5, 3 * T - 8 - k * 4, 4, sh([170, 160, 150], 1 - k * 0.15)); frame(c, px, py, 3 * T, 2 * T - 2, [96, 70, 40], 2); for (let k = 0; k < 6; k++) c.rect(px - 10 + k * 3, py + 2 * T + 2, 1, 2, [90, 60, 40, 150]); });
    shelf(p, 35, 37, 2, 77);
    // the skeleton exhibit
    p.paint(6, (c, top) => {
      const px = 6 * T, py = 3 * T, B = [240, 236, 220], D = [170, 160, 140];
      c.box(px, py + 20, 7 * T, 27, [110, 60, 60], [60, 30, 34]); c.rect(px + 1, py + 21, 7 * T - 2, 5, [160, 90, 90]); c.rect(px + 3, py + 46, 7 * T, 3, [0, 0, 0, 60]);
      const cv = top; cv.line(px + 20, py + 8, px + 84, py + 2, B, 3); for (let k = 0; k < 6; k++) { cv.line(px + 30 + k * 8, py + 7 - k, px + 28 + k * 8, py + 20, B, 2); cv.p(px + 29 + k * 8, py + 14, D); }
      cv.ellipse(px + 92, py - 2, 9, 7, B); cv.rect(px + 94, py - 4, 3, 3, INK); cv.rect(px + 96, py + 2, 8, 2, B); cv.line(px + 20, py + 8, px + 6, py + 18, B, 2);
      for (const lx of [34, 72]) { cv.line(px + lx, py + 12, px + lx - 2, py + 22, B, 3); c.rect(px + lx - 4, py + 14, 4, 8, B); }
    });
    // a globe
    p.paint(6.1, (c) => { const cx = 41 * T, cy = 4 * T + 10; c.ellipse(cx, cy + 18, 10, 4, [0, 0, 0, 60]); c.box(cx - 2, cy + 6, 4, 12, DKW, INK); c.box(cx - 8, cy + 16, 16, 4, WOOD, DKW); c.ellipse(cx, cy, 11, 11, [70, 130, 210]); c.ellipse(cx - 3, cy - 2, 5, 4, [100, 180, 110]); c.ellipse(cx + 5, cy + 4, 3, 3, [100, 180, 110]); c.ellipse(cx, cy, 11, 11, GOLD, 1); });
    // reading desks
    for (const [x, y] of [[5, 34], [40, 34]]) p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.rect(px + 2, py + 13, 3 * T, 3, [0, 0, 0, 60]); c.box(px, py - 2, 3 * T, 16, [150, 100, 60], DKW); c.rect(px + 1, py - 1, 3 * T - 2, 5, [190, 140, 90]); c.box(px + 6, py - 2, 12, 7, [250, 246, 230], [150, 140, 120]); c.rect(px + 34, py - 8, 2, 8, [60, 60, 70]); c.ellipse(px + 35, py - 9, 6, 3, [70, 170, 110]); glow(c, px + 35, py - 4, 12, [250, 240, 160], 22); });
  },
};

// Castelia Gym: Burgh's hive. Honeycomb walls split the hall into cells, the doorways hung with honey you push
// through; the artist's studio lies at the back.
PLANS.BW1CasteliaCityGym = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    const HON = [240, 176, 40], COMB = [214, 150, 50];
    // wall runs [x0, x1, y] (horizontal) and [x, y0, y1] (vertical); gates are gaps hung with honey
    const H = [[2, 9, 10], [13, 34, 10], [38, 45, 10], [2, 21, 20], [27, 45, 20], [2, 7, 28], [11, 36, 28], [40, 45, 28]], V = [[18, 11, 12], [18, 15, 19], [30, 11, 12], [30, 15, 19], [18, 21, 23], [18, 26, 27], [30, 21, 23], [30, 26, 27]];
    const gatesH = [[10, 12, 10], [35, 37, 10], [22, 26, 20], [8, 10, 28], [37, 39, 28]], gatesV = [[18, 13, 14], [30, 13, 14], [18, 24, 25], [30, 24, 25]];
    for (const [x0, x1, y] of H) blk(p, x0, y, x1 - x0 + 1, 1);
    for (const [x, y0, y1] of V) blk(p, x, y0, 1, y1 - y0 + 1);
    p.fill("rHouse", X0, Y0, X1, 9);
    const easels = [[7, 4, [90, 170, 100]], [13, 3, [230, 120, 150]], [34, 3, [90, 150, 220]], [40, 4, [236, 190, 70]]], pots = [[4, 33], [43, 33], [14, 32], [33, 32], [5, 22], [42, 22], [4, 12], [43, 12], [22, 12], [26, 18]];
    for (const [x, y] of easels) blk(p, x, y, 2, 1);
    for (const [x, y] of pots) blk(p, x, y);
    p.paint(0, (c) => {
      // hexagon cells across the hive floor
      for (let y = 10 * T; y + 14 < 38 * T; y += 14) for (let x = X0 * T - ((y / 14) & 1) * 8; x + 16 <= (X1 + 1) * T; x += 16) { if (x < X0 * T) continue; c.poly([[x + 8, y], [x + 15, y + 4], [x + 15, y + 11], [x + 8, y + 15], [x + 1, y + 11], [x + 1, y + 4]], [250, 214, 110, 90]); c.line(x + 8, y, x + 15, y + 4, [200, 150, 50, 130]); c.line(x + 1, y + 4, x + 8, y, [200, 150, 50, 130]); c.line(x + 1, y + 4, x + 1, y + 11, [200, 150, 50, 130]); }
      // the studio: a leafy wall with framed pictures, paint spots on the floor
      wall(c, [70, 130, 80], [40, 84, 56]);
      for (let i = 0; i < 160; i++) c.ellipse(X0 * T + p.hash(i, 1, 3) * 44 * T, 3 + p.hash(i, 2, 3) * 22, 4, 3, i % 3 ? [90, 160, 96] : [56, 110, 70]);
      [[5, [236, 190, 70]], [12, [230, 120, 150]], [19, [90, 150, 220]], [27, [150, 100, 200]], [34, [240, 130, 60]], [41, [90, 190, 190]]].forEach(([x, col], i) => { c.box(x * T - 4, 4, 28, 21, [250, 246, 230], [150, 110, 50]); c.ellipse(x * T + 10, 14, 8, 6, col); c.ellipse(x * T + 5 + (i % 3) * 4, 11, 3, 3, mix(col, WHITE, 0.5)); c.rect(x * T + 9, 8, 2, 12, sh(col, 0.5)); });
      for (let i = 0; i < 40; i++) { const x = X0 * T + 8 + p.hash(i, 5, 7) * 43 * T, y = 2 * T + 8 + p.hash(i, 6, 7) * 7 * T; c.ellipse(x, y, 2 + p.hash(i, 7, 7) * 3, 1.5 + p.hash(i, 8, 7) * 2, A([[230, 90, 110], [90, 150, 220], [240, 200, 70], [90, 180, 110], [160, 110, 210]][i % 5], 200)); }
      rug(c, 21, 4, 27, 8, [90, 170, 100], [250, 230, 120]);
      for (const x of [12, 24, 36]) { plate(c, x, 15, [250, 220, 110], 20); c.ellipse(x * T + 8, 15 * T + 9, 8, 6, [200, 60, 60]); c.ellipse(x * T + 8, 15 * T + 8, 6, 4, [240, 110, 100]); }
    });
    const comb = (c, top, x, y) => { const px = x * T, py = y * T; c.rect(px, py - 2, T, 18, sh(COMB, 0.62)); c.rect(px, py + 13, T, 3, sh(COMB, 0.4)); c.poly([[px + 8, py + 1], [px + 14, py + 4], [px + 14, py + 9], [px + 8, py + 12], [px + 2, py + 9], [px + 2, py + 4]], [120, 70, 20]); c.poly([[px + 8, py + 3], [px + 12, py + 5], [px + 12, py + 8], [px + 8, py + 10], [px + 4, py + 8], [px + 4, py + 5]], HON); top.rect(px, py - 12, T, 10, COMB); top.rect(px, py - 12, T, 2, mix(COMB, WHITE, 0.45)); top.poly([[px + 8, py - 10], [px + 13, py - 8], [px + 13, py - 5], [px + 8, py - 3], [px + 3, py - 5], [px + 3, py - 8]], mix(COMB, WHITE, 0.25)); top.rect(px, py - 2, T, 1, sh(COMB, 0.5)); };
    for (const [x0, x1, y] of H) p.paint(y + 1, (c, top) => { for (let x = x0; x <= x1; x++) comb(c, top, x, y); });
    for (const [x, y0, y1] of V) for (let y = y0; y <= y1; y++) p.paint(y + 1, (c, top) => comb(c, top, x, y));
    // honey curtains in the doorways (walked through)
    const honey = (top, px, py, w, h) => { top.rect(px, py, w, h, A(HON, 150)); for (let x = px + 1; x < px + w - 2; x += 5) { const d = 3 + Math.floor(p.hash(x, py, 9) * 6); top.rect(x, py, 2, h, [255, 226, 120, 130]); top.ellipse(x + 1, py + h + d - 2, 2, 3, A(HON, 190)); top.rect(x, py + h, 2, d - 2, A(HON, 190)); } top.rect(px, py, w, 2, [255, 236, 150, 220]); };
    for (const [x0, x1, y] of gatesH) p.paint(y + 1, (c, top) => honey(top, x0 * T, y * T - 12, (x1 - x0 + 1) * T, 22));
    for (const [x, y0, y1] of gatesV) p.paint(y1 + 1, (c, top) => honey(top, x * T + 2, y0 * T - 12, T - 4, (y1 - y0 + 1) * T + 6));
    // easels and honey pots
    for (const [x, y, col] of easels) p.paint(y + 1, (c, top) => { const px = x * T + 4, py = y * T; c.rect(px + 2, py + 13, 26, 3, [0, 0, 0, 50]); c.line(px + 2, py + 14, px + 8, py - 12, WOOD, 2); c.line(px + 22, py + 14, px + 16, py - 12, WOOD, 2); c.box(px, py - 14, 24, 20, [250, 248, 240], DKW); c.ellipse(px + 12, py - 4, 7, 6, col); c.ellipse(px + 8, py - 7, 3, 3, mix(col, WHITE, 0.5)); c.ellipse(px + 16, py - 1, 3, 2, sh(col, 0.6)); c.rect(px - 1, py + 6, 26, 2, WOOD); });
    for (const [x, y] of pots) p.paint(y + 1, (c) => { const px = x * T + 8, py = y * T; c.ellipse(px, py + 13, 7, 3, [0, 0, 0, 60]); c.ellipse(px, py + 6, 7, 8, [170, 110, 60]); c.ellipse(px, py + 6, 6, 7, [206, 150, 90]); c.ellipse(px, py - 1, 5, 2, HON); c.rect(px - 6, py - 2, 12, 2, [130, 80, 40]); c.rect(px + 3, py, 2, 7, A(HON, 230)); c.ellipse(px - 2, py + 5, 1, 3, [240, 200, 150]); });
  },
};

// Nimbasa Gym: Elesa's roller coaster. A neon track loops the dark hall past three boarding platforms, cars waiting
// on the rails; her spot-lit catwalk runs out from the back.
PLANS.BW1NimbasaCityGym = {
  theme: { room: "arena", floor: "neon", wall: null },
  plan(p) {
    const TRACK = [[6, 33], [6, 18], [18, 18], [18, 10], [30, 10], [30, 18], [41, 18], [41, 32], [28, 32], [28, 26], [20, 26], [20, 33], [6, 33]];
    const PADS = [[12, 15, [250, 214, 70]], [24, 15, [240, 110, 170]], [36, 15, [90, 190, 240]]], cars = [[9, 18, 1, 0, [250, 214, 70]], [23, 10, 1, 0, [240, 110, 170]], [41, 24, 0, 1, [90, 190, 240]], [23, 26, 1, 0, [130, 230, 140]]];
    p.fill("darkpave", 20, Y0, 28, 9);
    for (const [x, y, hz, vt] of cars) blk(p, x, y, 1 + hz, 1 + vt);
    for (const [x, y] of [[3, 3], [44, 3], [3, 36], [44, 36], [12, 4], [35, 4]]) blk(p, x, y);
    p.paint(0, (c) => {
      // back wall: night-dark with neon bolts, stars and a row of bulbs
      wall(c, [30, 26, 60], [18, 16, 40]);
      for (let x = X0 * T + 6; x < (X1 + 1) * T; x += 12) c.ellipse(x, 28, 2, 2, [[250, 220, 90], [250, 120, 180], [110, 210, 250]][(x / 12 | 0) % 3]);
      for (const [x, col] of [[6, [250, 220, 70]], [14, [240, 110, 170]], [33, [90, 190, 240]], [41, [250, 220, 70]]]) { glow(c, x * T, 14, 16, col, 26); c.poly([[x * T + 2, 3], [x * T - 6, 15], [x * T - 1, 15], [x * T - 4, 25], [x * T + 6, 11], [x * T + 1, 11]], col); }
      for (let i = 0; i < 40; i++) c.p(X0 * T + p.hash(i, 1, 2) * 44 * T, 4 + p.hash(i, 2, 2) * 20, WHITE);
      c.box(20 * T, 2, 9 * T, 24, [16, 14, 36], [250, 220, 90]); for (let i = 0; i < 9; i++) { const h = 4 + p.hash(i, 9, 4) * 14; c.rect(20 * T + 8 + i * 15, 24 - h, 9, h, [[250, 120, 180], [110, 210, 250], [250, 220, 90]][i % 3]); }
      // the catwalk with bulbs along its edges and spotlight pools
      for (let y = Y0; y <= 9; y++) for (const x of [20, 28]) { c.rect(x === 20 ? x * T : x * T + 13, y * T, 3, T, [250, 220, 90]); c.ellipse(x === 20 ? x * T + 1 : x * T + 14, y * T + 8, 2, 2, WHITE); }
      c.rect(20 * T, 9 * T + 13, 9 * T, 3, [250, 220, 90]); rug(c, 22, Y0, 26, 9, [200, 60, 130], [250, 220, 90]);
      for (const [x, y, col] of [[24, 6, [250, 240, 180]], [22, 4, [250, 120, 180]], [26, 4, [110, 210, 250]]]) c.ellipse(x * T + 8, y * T + 10, 26, 16, A(col, 46));
      // glowing floor stars
      for (let i = 0; i < 26; i++) { const x = (3 + p.hash(i, 3, 5) * 41) * T, y = (11 + p.hash(i, 4, 5) * 23) * T, col = [[250, 220, 90], [250, 120, 180], [110, 210, 250]][i % 3]; c.poly([[x, y - 5], [x + 2, y - 1], [x + 6, y - 1], [x + 3, y + 2], [x + 4, y + 6], [x, y + 3], [x - 4, y + 6], [x - 3, y + 2], [x - 6, y - 1], [x - 2, y - 1]], A(col, 110)); }
      // the track: sleepers, then two bright rails
      for (let s = 0; s + 1 < TRACK.length; s++) { const [ax, ay] = TRACK[s], [bx, by] = TRACK[s + 1], n = (Math.abs(bx - ax) + Math.abs(by - ay)) * 2, hz = ay === by; for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (hz) c.rect(x - 1, y - 7, 3, 14, [70, 70, 110]); else c.rect(x - 7, y - 1, 14, 3, [70, 70, 110]); } }
      for (let s = 0; s + 1 < TRACK.length; s++) { const [ax, ay] = TRACK[s], [bx, by] = TRACK[s + 1], hz = ay === by, x0 = Math.min(ax, bx) * T + 8, y0 = Math.min(ay, by) * T + 8, len = (Math.abs(bx - ax) + Math.abs(by - ay)) * T; for (const o of [-5, 4]) { if (hz) { c.rect(x0 - 5, y0 + o - 1, len + 10, 4, [250, 230, 120, 70]); c.rect(x0 - 5, y0 + o, len + 10, 2, [255, 244, 170]); } else { c.rect(x0 + o - 1, y0 - 5, 4, len + 10, [250, 230, 120, 70]); c.rect(x0 + o, y0 - 5, 2, len + 10, [255, 244, 170]); } } }
      // boarding platforms
      for (const [x, y, col] of PADS) { const px = (x - 2) * T, py = (y - 1) * T; c.box(px, py, 5 * T, 3 * T, [60, 58, 96], col); c.rect(px + 2, py + 2, 5 * T - 4, 3 * T - 4, A(col, 60)); for (let k = 0; k < 10; k++) { c.rect(px + 2 + k * 8, py + 3 * T - 6, 4, 4, k % 2 ? col : INK); c.rect(px + 2 + k * 8, py + 2, 4, 3, k % 2 ? INK : col); } glow(c, x * T + 8, y * T + 8, 26, col, 20); }
    });
    for (const [x, y, hz, vt, col] of cars) p.paint(y + 1 + vt, (c) => {
      const px = x * T, py = y * T, w = hz ? 32 : 16, h = vt ? 30 : 15;
      glow(c, px + w / 2, py + h / 2, 24, col, 22); c.rect(px + 2, py + h, w, 3, [0, 0, 0, 80]);
      c.box(px, py - 2, w, h + 2, col, INK); c.rect(px + 1, py - 1, w - 2, 3, mix(col, WHITE, 0.5)); c.rect(px + 2, py + h - 4, w - 4, 3, sh(col, 0.6));
      for (let k = 0; k < 2; k++) { const sx = px + (hz ? 4 + k * 14 : 3), sy = py + (vt ? 3 + k * 13 : 3); c.box(sx, sy, 10, 8, [40, 36, 70], INK); c.rect(sx + 2, sy + 1, 6, 3, [110, 100, 160]); }
      c.ellipse(px + (hz ? w - 2 : 4), py + (vt ? h - 2 : 7), 2, 2, [255, 250, 200]); c.ellipse(px + (hz ? w - 2 : 12), py + (vt ? h - 2 : 11), 2, 2, [255, 250, 200]);
    });
    for (const [x, y] of [[3, 3], [44, 3], [3, 36], [44, 36], [12, 4], [35, 4]]) p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T, col = [[250, 220, 90], [250, 120, 180], [110, 210, 250]][(x + y) % 3]; glow(c, px, py, 26, col, 20); c.ellipse(px, py + 13, 6, 3, [0, 0, 0, 80]); c.box(px - 2, py - 6, 4, 20, [90, 90, 120], INK); top.box(px - 6, py - 16, 12, 10, [50, 50, 80], INK); top.ellipse(px, py - 11, 4, 4, col); top.ellipse(px - 1, py - 12, 2, 2, WHITE); });
  },
};

// Driftveil Gym: Clay's mine. Steel lifts with hazard-striped edges at the three switches, cart rails and timbered
// galleries, scaffolds and ore heaps down to the pit floor where Clay waits.
PLANS.BW1DriftveilCityGym = {
  theme: { room: "arena", floor: "caveFloor", wall: null },
  plan(p) {
    const STEEL = [150, 156, 172], HAZ = [240, 200, 50];
    const towers = [[4, 4], [42, 4], [4, 29], [42, 29]], carts = [[9, 22, [110, 200, 250]], [37, 22, [250, 210, 110]], [6, 30, [200, 200, 210]]];
    const frames = [[20, 11, 9], [20, 19, 9], [20, 27, 9]], heaps = [[15, 5], [31, 5], [3, 12], [43, 13], [16, 31], [31, 31], [3, 24], [44, 24], [14, 26], [33, 26]];
    p.fill("gravel", X0, Y0, X1, 8);
    for (const [x, y] of towers) blk(p, x, y, 2, 2);
    for (const [x, y] of carts) blk(p, x, y);
    for (const [x, y, w] of frames) { blk(p, x, y); blk(p, x + w - 1, y); }
    for (const [x, y] of heaps) blk(p, x, y);
    blk(p, 30, 33, 13, 1);
    p.paint(0, (c) => {
      // the rock wall of the pit: strata, a seam of ore and steel bracing
      wall(c, [120, 86, 62], [70, 48, 40]);
      for (let k = 0; k < 4; k++) c.rect(X0 * T, 5 + k * 6, 44 * T, 1, [96, 66, 50]);
      for (let i = 0; i < 70; i++) { const x = X0 * T + p.hash(i, 1, 8) * 44 * T, y = 3 + p.hash(i, 2, 8) * 22; c.rect(x, y, 3, 2, i % 4 ? [150, 110, 80] : [[110, 200, 250], [250, 210, 110], [130, 230, 160]][i % 3]); }
      for (let x = X0 * T + 30; x < (X1 + 1) * T; x += 64) { c.rect(x, 0, 5, 32, STEEL); c.rect(x + 1, 0, 1, 32, WHITE); c.line(x + 5, 2, x + 64, 30, sh(STEEL, 0.7)); }
      c.rect(X0 * T, 8 * T + 10, 44 * T, 6, [90, 66, 54]); c.rect(X0 * T, 8 * T + 10, 44 * T, 1, [176, 140, 110]);
      // rails
      const rails = (pts) => { for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = (Math.abs(bx - ax) + Math.abs(by - ay)) * 3, hz = ay === by; for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (hz) c.rect(x - 1, y - 6, 2, 12, [110, 76, 50]); else c.rect(x - 6, y - 1, 12, 2, [110, 76, 50]); } const x0 = Math.min(ax, bx) * T + 8, y0 = Math.min(ay, by) * T + 8, len = (Math.abs(bx - ax) + Math.abs(by - ay)) * T; for (const o of [-4, 3]) { if (hz) { c.rect(x0, y0 + o, len, 2, [176, 182, 196]); c.rect(x0, y0 + o + 1, len, 1, [96, 100, 116]); } else { c.rect(x0 + o, y0, 2, len, [176, 182, 196]); c.rect(x0 + o + 1, y0, 1, len, [96, 100, 116]); } } } };
      rails([[3, 22], [44, 22]]); rails([[6, 22], [6, 35]]); rails([[24, 9], [24, 36]]); rails([[41, 22], [41, 10], [30, 10]]);
      // the lifts
      for (const x of [12, 24, 36]) {
        const px = (x - 2) * T, py = 13 * T, w = 5 * T;
        c.rect(px - 3, py - 3, w + 6, w + 6, [30, 24, 26]); c.box(px, py, w, w, STEEL, INK);
        for (let k = 0; k < w; k += 8) for (const [ex, ey, ew, eh] of [[px + k, py, 8, 5], [px + k, py + w - 5, 8, 5], [px, py + k, 5, 8], [px + w - 5, py + k, 5, 8]]) c.rect(ex, ey, ew, eh, (k / 8) % 2 ? HAZ : INK);
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) c.p(px + 14 + i * 13, py + 14 + j * 13, sh(STEEL, 0.6));
        frame(c, px + 8, py + 8, w - 16, w - 16, mix(STEEL, WHITE, 0.4), 1);
        c.poly([[x * T + 8, py + 12], [x * T + 16, py + 22], [x * T, py + 22]], HAZ); c.poly([[x * T + 8, py + w - 12], [x * T + 16, py + w - 22], [x * T, py + w - 22]], HAZ);
      }
      rug(c, 21, 3, 27, 7, [130, 96, 70], [200, 160, 110]);
    });
    // lift gantries (walked under)
    for (const x of [12, 24, 36]) p.paint(18.5, (c, top) => { const px = (x - 2) * T, py = 13 * T; for (const ex of [px - 2, px + 5 * T - 3]) { top.box(ex, py - 26, 5, 30, STEEL, INK); c.box(ex, py + 4, 5, 76, sh(STEEL, 0.8), INK); } top.box(px - 4, py - 30, 5 * T + 8, 7, HAZ, INK); for (let k = 0; k < 11; k++) top.poly([[px + k * 8, py - 29], [px + k * 8 + 4, py - 29], [px + k * 8, py - 24], [px + k * 8 - 4, py - 24]], INK); top.rect(x * T + 7, py - 23, 2, 14, [60, 60, 70]); top.box(x * T + 4, py - 10, 8, 6, [80, 80, 96], INK); });
    // scaffold towers
    for (const [x, y] of towers) p.paint(y + 2, (c, top) => { const px = x * T, py = y * T; c.rect(px + 3, py + 28, 32, 4, [0, 0, 0, 70]); for (const ex of [px, px + 27]) { c.box(ex, py, 5, 31, STEEL, INK); top.box(ex, py - 26, 5, 26, STEEL, INK); } for (const [cv, yy] of [[top, py - 26], [top, py - 13], [c, py], [c, py + 13]]) { cv.rect(px, yy, 32, 3, sh(STEEL, 0.8)); cv.line(px + 4, yy + 3, px + 27, yy + 13, sh(STEEL, 0.65)); cv.line(px + 27, yy + 3, px + 4, yy + 13, sh(STEEL, 0.65)); } top.box(px - 3, py - 31, 38, 6, WOOD, DKW); top.ellipse(px + 16, py - 34, 5, 4, HAZ); glow(top, px + 16, py - 34, 14, HAZ, 26); });
    // carts
    for (const [x, y, load] of carts) p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 14, 8, 2, [0, 0, 0, 80]); c.box(px + 1, py + 2, 14, 10, [110, 80, 60], INK); c.rect(px + 2, py + 3, 12, 2, [150, 116, 86]); c.ellipse(px + 4, py + 13, 2, 2, INK); c.ellipse(px + 12, py + 13, 2, 2, INK); c.ellipse(px + 8, py + 2, 6, 4, load); c.ellipse(px + 6, py, 2, 1, mix(load, WHITE, 0.5)); });
    // timber frames across the main gallery
    for (const [x, y, w] of frames) p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; for (const dx of [3, (w - 1) * T + 3]) { c.rect(px + dx + 2, py + 13, 10, 3, [0, 0, 0, 60]); c.box(px + dx, py - 8, 9, 23, WOOD, DKW); c.rect(px + dx + 2, py - 7, 2, 21, mix(WOOD, WHITE, 0.3)); top.box(px + dx, py - 22, 9, 15, WOOD, DKW); } top.box(px - 2, py - 28, w * T + 4, 8, [176, 128, 76], DKW); top.rect(px - 1, py - 27, w * T + 2, 2, [214, 170, 110]); top.ellipse(px + w * T / 2, py - 17, 4, 4, [250, 220, 120]); glow(top, px + w * T / 2, py - 17, 16, [250, 220, 120], 26); });
    // ore heaps
    heaps.forEach(([x, y], k) => p.paint(y + 1, (c) => { const px = x * T, py = y * T, gem = [[110, 200, 250], [250, 210, 110], [130, 230, 160], [250, 130, 200]][k % 4]; c.ellipse(px + 8, py + 13, 9, 3, [0, 0, 0, 70]); c.poly([[px, py + 14], [px + 3, py + 4], [px + 8, py - 2], [px + 13, py + 3], [px + 16, py + 14]], [96, 70, 56]); c.poly([[px + 2, py + 13], [px + 4, py + 5], [px + 8, py], [px + 11, py + 6], [px + 13, py + 13]], [140, 104, 80]); c.poly([[px + 5, py + 6], [px + 8, py + 1], [px + 9, py + 7]], [180, 144, 112]); c.poly([[px + 9, py + 10], [px + 11, py + 5], [px + 13, py + 10]], gem); c.poly([[px + 3, py + 12], [px + 5, py + 8], [px + 7, py + 12]], mix(gem, WHITE, 0.4)); }));
    // conveyor belt
    p.paint(34, (c) => { const px = 30 * T, py = 33 * T, w = 13 * T; c.rect(px + 2, py + 13, w, 3, [0, 0, 0, 70]); c.box(px, py - 2, w, 16, [60, 60, 70], INK); for (let x = px + 3; x < px + w - 3; x += 6) c.rect(x, py, 2, 8, [96, 96, 110]); c.rect(px, py + 9, w, 4, STEEL); for (let x = px + 6; x < px + w; x += 16) c.ellipse(x, py + 11, 2, 2, INK); for (let k = 0; k < 6; k++) { const x = px + 12 + k * 32; c.ellipse(x, py + 1, 5, 4, [120, 90, 70]); c.ellipse(x - 1, py, 2, 2, [[110, 200, 250], [250, 210, 110]][k % 2]); } });
  },
};

// Mistralton Gym: Skyla's hangar. Cannons stand on the steel floor aimed at painted landing marks, a runway down the
// middle to her pad under the hangar windows, a cargo plane parked in the corner.
PLANS.BW1MistraltonCityGym = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    // cannons [x, y, dx, dy] (2x2, aimed along dx,dy) and where each lands
    const cannons = [[14, 14, 0, -1, 14, 6], [8, 22, 1, 0, 17, 22], [38, 14, -1, 0, 30, 14], [33, 22, 0, 1, 33, 30], [6, 12, 0, 1, 6, 18], [40, 24, 0, -1, 40, 19], [16, 30, -1, 0, 9, 30]];
    const crates = [[3, 3], [4, 3], [3, 4], [44, 3], [43, 3], [44, 36], [3, 36], [4, 36], [3, 35], [29, 36], [30, 36], [19, 36]], fans = [[2, 9], [45, 9], [2, 27], [45, 27]];
    p.fill("runway", 21, 9, 27, Y1); p.fill("paving", 19, Y0, 29, 8);
    for (const [x, y] of cannons) blk(p, x, y, 2, 2);
    for (const [x, y] of crates) crate(p, x, y, (x + y) % 2 ? [150, 156, 170] : [180, 134, 80]);
    for (const [x, y] of fans) blk(p, x, y, 1, 2);
    blk(p, 36, 30, 7, 2); blk(p, 38, 28, 3, 6);
    p.paint(0, (c) => {
      // hangar wall: corrugated steel, a strip of sky windows, warning stripes
      wall(c, [120, 132, 150], [70, 78, 96]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 4) c.rect(x, 3, 1, 24, [100, 112, 130]);
      for (let x = 4; x <= 42; x += 4) { if (x >= 20 && x <= 27) continue; c.box(x * T - 6, 5, 44, 16, [140, 200, 245], [60, 66, 84]); c.ellipse(x * T + 6, 14, 8, 3, [240, 248, 255]); c.ellipse(x * T + 22, 10, 6, 2, [240, 248, 255]); c.rect(x * T + 15, 5, 2, 16, [60, 66, 84]); }
      c.box(20 * T, 2, 9 * T, 26, [70, 78, 96], INK); for (let k = 0; k < 9; k++) c.rect(20 * T + 2, 4 + k * 3, 9 * T - 4, 1, [110, 120, 140]); c.poly([[24 * T + 8, 6], [26 * T, 20], [25 * T, 18], [24 * T + 8, 24], [24 * T, 18], [23 * T, 20]], [140, 200, 245]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 16) c.poly([[x, 27], [x + 8, 27], [x + 13, 32], [x + 5, 32]], [240, 200, 50]);
      // the runway: edge lines, dashes, threshold bars and lamps
      const rx = 21 * T, rw = 7 * T; c.rect(rx + 2, 9 * T, 2, 29 * T, WHITE); c.rect(rx + rw - 4, 9 * T, 2, 29 * T, WHITE);
      for (let y = 12 * T; y < 35 * T; y += 28) c.rect(rx + rw / 2 - 2, y, 4, 16, WHITE);
      for (let k = 0; k < 6; k++) { c.rect(rx + 10 + k * 16, 33 * T + 2, 8, 22, WHITE); c.rect(rx + 10 + k * 16, 9 * T + 6, 8, 14, WHITE); }
      for (let y = 9 * T + 8; y < 38 * T; y += 24) for (const ex of [rx - 3, rx + rw + 1]) { glow(c, ex + 1, y, 8, [120, 200, 255], 30); c.ellipse(ex + 1, y, 2, 2, [200, 236, 255]); }
      // Skyla's pad
      const cx = 24 * T + 8, cy = 6 * T + 4; c.ellipse(cx, cy, 70, 44, [96, 170, 226]); c.ellipse(cx, cy, 64, 39, [150, 206, 244]); c.ellipse(cx, cy, 64, 39, WHITE, 2); c.ellipse(cx, cy, 30, 18, WHITE, 2);
      for (const s of [-1, 1]) { c.poly([[cx + s * 14, cy - 3], [cx + s * 54, cy - 16], [cx + s * 46, cy - 2], [cx + s * 52, cy + 8], [cx + s * 14, cy + 5]], WHITE); c.line(cx + s * 22, cy + 1, cx + s * 46, cy - 6, [150, 206, 244]); }
      // landing marks and the dotted flight of each cannon
      for (const [x, y, , , tx, ty] of cannons) {
        const ax = (x + 1) * T, ay = (y + 1) * T, bx = tx * T + 8, by = ty * T + 8;
        c.ellipse(bx, by, 15, 12, [226, 70, 60, 200]); c.ellipse(bx, by, 11, 9, WHITE); c.ellipse(bx, by, 7, 5, [226, 70, 60]); c.ellipse(bx, by, 3, 2, WHITE);
        const n = Math.round(Math.hypot(bx - ax, by - ay) / 9); for (let t = 2; t < n - 1; t++) { const f = t / n; c.ellipse(ax + (bx - ax) * f, ay + (by - ay) * f, 2, 2, A(WHITE, 190)); }
      }
      for (const x of [12, 24, 36]) plate(c, x, 15, [240, 200, 50], 16);
    });
    for (const [x, y, dx, dy] of cannons) p.paint(y + 2, (c, top) => {
      const cx = (x + 1) * T, cy = (y + 1) * T, B = [70, 110, 190], D = [40, 60, 120];
      c.ellipse(cx + 2, cy + 12, 17, 6, [0, 0, 0, 80]); c.ellipse(cx, cy + 4, 16, 12, INK); c.ellipse(cx, cy + 3, 15, 11, [120, 128, 150]); c.ellipse(cx, cy + 2, 12, 8, [170, 178, 196]);
      for (let a = 0; a < 8; a++) c.ellipse(cx + Math.cos(a * 0.785) * 13, cy + 3 + Math.sin(a * 0.785) * 9, 1, 1, INK);
      const cv = dy < 0 ? top : c, ex = cx + dx * 22, ey = cy - 4 + dy * 20;
      cv.line(cx, cy - 4, ex, ey, INK, 16); cv.line(cx, cy - 4, ex, ey, B, 13); cv.line(cx - (dy ? 3 : 0), cy - 4 - (dx ? 3 : 0), ex - (dy ? 3 : 0), ey - (dx ? 3 : 0), mix(B, WHITE, 0.45), 3);
      cv.line(ex - dx * 2, ey - dy * 2, ex + dx * 3, ey + dy * 3, INK, 20); cv.line(ex - dx, ey - dy, ex + dx * 2, ey + dy * 2, [240, 200, 50], 17); if (dy > 0 || dx) cv.ellipse(ex + dx * 3, ey + dy * 3, dx ? 3 : 7, dy ? 3 : 7, [20, 20, 30]);
      c.ellipse(cx, cy - 2, 8, 8, D); c.ellipse(cx, cy - 3, 6, 6, B); c.ellipse(cx - 2, cy - 5, 2, 2, mix(B, WHITE, 0.6));
    });
    // wall fans
    for (const [x, y] of fans) p.paint(y + 2, (c) => { const px = x * T + 8, py = y * T + 12; c.box(px - 7, py - 14, 14, 30, [96, 104, 124], INK); c.ellipse(px, py, 6, 12, [40, 44, 60]); for (let k = 0; k < 3; k++) c.line(px, py, px + Math.cos(k * 2.09 + 0.5) * 5, py + Math.sin(k * 2.09 + 0.5) * 11, [200, 206, 220], 2); c.ellipse(px, py, 2, 2, WHITE); for (let k = 0; k < 3; k++) c.rect(px + (x < 24 ? 10 : -22), py - 8 + k * 8, 12, 1, [255, 255, 255, 120]); });
    // the cargo plane
    p.paint(34, (c, top) => {
      const cx = 39 * T + 8, cy = 31 * T, W1 = [236, 240, 248], B = [70, 130, 210];
      c.ellipse(cx + 4, cy + 10, 60, 30, [0, 0, 0, 50]);
      c.poly([[cx - 56, cy - 4], [cx + 56, cy - 4], [cx + 56, cy + 10], [cx - 56, cy + 10]], INK); c.poly([[cx - 55, cy - 3], [cx + 55, cy - 3], [cx + 55, cy + 9], [cx - 55, cy + 9]], W1); c.rect(cx - 55, cy + 5, 110, 4, [190, 196, 212]); c.rect(cx - 55, cy - 3, 10, 12, B); c.rect(cx + 45, cy - 3, 10, 12, B);
      for (const s of [-1, 1]) { c.ellipse(cx + s * 30, cy + 2, 6, 8, [80, 86, 104]); c.rect(cx + s * 30 - 8, cy - 8, 16, 2, INK); }
      top.ellipse(cx, cy - 2, 13, 50, INK); top.ellipse(cx, cy - 2, 12, 49, W1); top.rect(cx - 2, cy - 44, 4, 84, B); top.ellipse(cx, cy - 38, 7, 6, [110, 190, 240]); top.ellipse(cx - 2, cy - 40, 3, 2, WHITE);
      c.ellipse(cx, cy + 2, 13, 46, INK); c.ellipse(cx, cy + 2, 12, 45, W1); c.rect(cx - 2, cy - 30, 4, 74, B);
      c.poly([[cx - 22, cy + 38], [cx + 22, cy + 38], [cx + 22, cy + 46], [cx - 22, cy + 46]], INK); c.rect(cx - 21, cy + 39, 42, 6, W1); c.rect(cx - 21, cy + 39, 6, 6, B); c.rect(cx + 15, cy + 39, 6, 6, B);
    });
  },
};

// Icirrus Gym: Brycen's ice. A sheet of slick ice with half-pipe ramps crossing it, snow islands at the switches,
// ice boulders to stop a slide and a frozen wall of icicles behind the snowy dais.
PLANS.BW1IcirrusCityGym = {
  theme: { room: "arena", floor: "drift", wall: null },
  plan(p) {
    const ICE = [170, 220, 246], rocks = [[8, 12], [17, 17], [30, 12], [39, 18], [10, 24], [19, 28], [33, 25], [41, 30], [15, 23], [29, 23], [6, 31], [36, 32], [21, 12], [27, 30], [4, 18], [43, 24]];
    const pipes = [[5, 20, 17], [31, 20, 12], [8, 27, 9], [30, 28, 9]];
    for (const [x, y] of rocks) blk(p, x, y);
    for (const [x, y] of [[3, 3], [44, 3], [16, 3], [31, 3]]) blk(p, x, y);
    const snowy = (x, y) => y <= 9 || y >= 36 || x <= 2 || x >= 45 || (x >= 22 && x <= 26 && y >= 31) || [12, 24, 36].some((sx) => ((x - sx) / 2.6) ** 2 + ((y - 15.2) / 2.1) ** 2 <= 1);
    p.paint(0, (c) => {
      // frozen wall: ice blocks and icicles
      wall(c, [150, 196, 232], [96, 140, 190]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 24) { c.rect(x, 3, 1, 24, [120, 170, 214]); c.rect(x + 3, 6, 6, 2, WHITE); }
      c.rect(X0 * T, 14, 44 * T, 1, [120, 170, 214]);
      for (let x = X0 * T + 2; x < (X1 + 1) * T - 4; x += 7) { const h = 6 + Math.floor(p.hash(x, 1, 6) * 14); c.poly([[x, 32], [x + 6, 32], [x + 3, 32 + h]], [220, 240, 255]); c.rect(x + 2, 32, 1, h - 3, WHITE); }
      // the ice sheet
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) if (!snowy(x, y)) {
        const px = x * T, py = y * T; c.rect(px, py, T, T, ICE);
        if (snowy(x, y - 1)) { c.rect(px, py, T, 3, [120, 176, 220]); c.rect(px, py, T, 1, [96, 150, 200]); } if (snowy(x - 1, y)) c.rect(px, py, 2, T, [130, 184, 226]); if (snowy(x + 1, y)) c.rect(px + 14, py, 2, T, [214, 240, 255]); if (snowy(x, y + 1)) c.rect(px, py + 14, T, 2, [214, 240, 255]);
        const h = p.hash(x, y, 4); if (h < 0.3) { c.line(px + 3, py + 11, px + 10, py + 4, [226, 244, 255]); c.line(px + 6, py + 13, px + 9, py + 10, [226, 244, 255]); } else if (h > 0.9) c.line(px + 2, py + 5, px + 13, py + 9, [140, 196, 232]);
      }
      // half-pipe ramps
      for (const [x, y, w] of pipes) { const px = x * T, py = y * T, pw = w * T; for (let k = 0; k < 24; k++) { const t = Math.abs(k - 11.5) / 11.5; c.rect(px, py + k, pw, 1, mix([96, 160, 220], [226, 244, 255], t * t)); } c.rect(px, py, pw, 2, WHITE); c.rect(px, py + 22, pw, 2, WHITE); for (let i = px + 8; i < px + pw; i += 16) c.poly([[i - 3, py + 9], [i + 3, py + 12], [i - 3, py + 15]], [255, 255, 255, 170]); c.rect(px - 2, py - 1, 3, 26, [70, 120, 190]); c.rect(px + pw - 1, py - 1, 3, 26, [70, 120, 190]); }
      rug(c, 21, 4, 27, 8, [110, 170, 226], WHITE);
      for (const x of [12, 24, 36]) plate(c, x, 15, [110, 170, 226], 16);
    });
    for (const [x, y] of rocks) p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 9, 3, [40, 80, 130, 90]); c.poly([[px, py + 14], [px + 2, py + 2], [px + 7, py - 6], [px + 13, py], [px + 16, py + 14]], [96, 150, 206]); c.poly([[px + 2, py + 13], [px + 3, py + 3], [px + 7, py - 4], [px + 9, py + 13]], [200, 232, 252]); c.poly([[px + 9, py + 13], [px + 7, py - 4], [px + 12, py + 1], [px + 14, py + 13]], [140, 196, 236]); c.line(px + 5, py + 2, px + 4, py + 10, WHITE); c.ellipse(px + 7, py - 4, 4, 2, WHITE); });
    for (const [x, y] of [[3, 3], [44, 3], [16, 3], [31, 3]]) p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T + 14; glow(c, px, py - 12, 20, [170, 226, 255], 26); c.ellipse(px, py, 8, 3, [40, 80, 130, 90]); for (const [dx, h, w, cv] of [[-5, 14, 3, c], [5, 16, 3, c], [0, 30, 4, top]]) { cv.poly([[px + dx - w, py], [px + dx + w, py], [px + dx + w, py - h * 0.7], [px + dx, py - h], [px + dx - w, py - h * 0.7]], [110, 170, 226]); cv.poly([[px + dx - w + 1, py - 1], [px + dx, py - 1], [px + dx, py - h + 2], [px + dx - w + 1, py - h * 0.7]], [220, 242, 255]); } c.box(px - 4, py - 13, 9, 13, [150, 200, 240], [110, 170, 226]); });
  },
};

// Opelucid Gym: the dragon hall. Two great dragon statues lie the length of the room, their bodies the walkways,
// heads raised either side of the dais; blue-flame braziers line the aisle.
PLANS.BW1OpelucidCityGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const BODY = [[[13, 33], [13, 27], [8, 24], [8, 19], [12, 15], [12, 11], [16, 8], [17, 6]], [[35, 33], [35, 27], [40, 24], [40, 19], [36, 15], [36, 11], [32, 8], [31, 6]]], COL = [[214, 170, 70], [150, 110, 200]];
    blk(p, 15, 3, 4, 3); blk(p, 30, 3, 4, 3);
    for (const y of [11, 18, 25, 32]) for (const x of [21, 27]) torch(p, x, y, [90, 170, 250], [110, 100, 130]);
    for (const [x, y] of [[4, 8], [43, 8], [4, 30], [43, 30]]) pillar(p, x, y, [120, 112, 140]);
    p.paint(0, (c) => {
      wall(c, [70, 62, 96], [40, 36, 60]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 32) { c.rect(x, 3, 1, 24, [54, 48, 78]); c.rect(x + 16, 14, 1, 13, [54, 48, 78]); } c.rect(X0 * T, 14, 44 * T, 1, [54, 48, 78]);
      for (const [x, col] of [[6, COL[0]], [12, COL[1]], [35, COL[0]], [41, COL[1]]]) { banner(c, x * T, 4, 16, 24, sh(col, 0.8), [250, 240, 200]); c.poly([[x * T + 8, 9], [x * T + 12, 17], [x * T + 8, 15], [x * T + 4, 17]], sh(col, 0.5)); }
      // a dragon's eye relief over the dais
      const ex = 24 * T + 8; c.ellipse(ex, 14, 44, 12, [40, 36, 60]); c.ellipse(ex, 14, 40, 9, [214, 170, 70]); c.ellipse(ex, 14, 14, 9, [200, 60, 60]); c.ellipse(ex, 14, 3, 8, INK); c.ellipse(ex - 5, 11, 2, 2, WHITE);
      // the dais and the long purple runner
      for (let k = 0; k < 3; k++) { c.rect((19 - k) * T + k * 6, (9 + k) * T - 8 + k * 2, (11 + 2 * k) * T - k * 12, 10, sh([120, 112, 140], 1 - k * 0.14)); c.rect((19 - k) * T + k * 6, (9 + k) * T - 8 + k * 2, (11 + 2 * k) * T - k * 12, 1, [176, 170, 196]); }
      rug(c, 20, 3, 29, 8, [96, 60, 150], GOLD); rug(c, 23, 11, 25, 37, [96, 60, 150], GOLD);
      // the dragons' bodies: outline, hide, belly scales and a ridge of spines
      BODY.forEach((pts, k) => {
        const col = COL[k], P = pts.map(([x, y]) => [x * T + 8, y * T + 8]);
        for (const [w, cc] of [[38, [30, 26, 44]], [34, sh(col, 0.6)], [28, col]]) for (let s = 0; s + 1 < P.length; s++) c.line(P[s][0], P[s][1], P[s + 1][0], P[s + 1][1], cc, w);
        for (let s = 0; s + 1 < P.length; s++) { const [ax, ay] = P[s], [bx, by] = P[s + 1], len = Math.hypot(bx - ax, by - ay), n = Math.round(len / 9), ux = (bx - ax) / len, uy = (by - ay) / len; for (let t = 0; t < n; t++) { const x = ax + (bx - ax) * t / n, y = ay + (by - ay) * t / n; c.line(x - uy * 9, y + ux * 9, x + uy * 9, y - ux * 9, mix(col, WHITE, 0.35)); c.line(x - uy * 9 + ux * 4, y + ux * 9 + uy * 4, x + ux * 6, y + uy * 6, sh(col, 0.75)); c.line(x + uy * 9 + ux * 4, y - ux * 9 + uy * 4, x + ux * 6, y + uy * 6, sh(col, 0.75)); } }
        // tail tip and claws
        const [tx, ty] = P[0]; c.poly([[tx - 17, ty], [tx + 17, ty], [tx + (k ? 26 : -26), ty + 26]], sh(col, 0.6)); c.poly([[tx - 13, ty], [tx + 13, ty], [tx + (k ? 22 : -22), ty + 20]], col);
        for (const [cx, cy, s] of [[P[3][0], P[3][1] + 20, k ? 1 : -1], [P[5][0], P[5][1] + 10, k ? -1 : 1]]) { c.line(cx, cy, cx + s * 30, cy + 4, sh(col, 0.6), 9); c.line(cx, cy, cx + s * 30, cy + 4, col, 6); for (const d of [-8, 0, 8]) c.poly([[cx + s * 30, cy + d], [cx + s * 44, cy + 4 + d * 1.4], [cx + s * 30, cy + 8 + d]], [240, 236, 220]); }
      });
      plate(c, 24, 15, [200, 60, 60], 22); plate(c, 12, 15, mix(COL[0], WHITE, 0.4), 15); plate(c, 36, 15, mix(COL[1], WHITE, 0.4), 15);
    });
    // the heads
    [[17, 5, 1, COL[0]], [31, 5, -1, COL[1]]].forEach(([x, y, s, col]) => p.paint(6, (c, top) => {
      const cx = x * T + 8, cy = y * T + 2, D = sh(col, 0.6);
      c.ellipse(cx, cy + 14, 30, 8, [0, 0, 0, 80]);
      c.ellipse(cx, cy - 8, 30, 24, [30, 26, 44]); c.ellipse(cx, cy - 8, 28, 22, D); c.ellipse(cx, cy - 11, 26, 19, col);
      c.poly([[cx + s * 10, cy - 14], [cx + s * 44, cy - 2], [cx + s * 44, cy + 10], [cx + s * 8, cy + 12]], [30, 26, 44]); c.poly([[cx + s * 10, cy - 12], [cx + s * 42, cy - 1], [cx + s * 42, cy + 4], [cx + s * 10, cy + 4]], col); c.poly([[cx + s * 10, cy + 5], [cx + s * 42, cy + 5], [cx + s * 42, cy + 9], [cx + s * 10, cy + 11]], D);
      for (let k = 0; k < 5; k++) c.poly([[cx + s * (14 + k * 6), cy + 4], [cx + s * (18 + k * 6), cy + 4], [cx + s * (16 + k * 6), cy + 9]], WHITE);
      c.ellipse(cx + s * 38, cy - 1, 2, 1, INK); c.ellipse(cx + s * 12, cy - 12, 6, 5, [250, 240, 200]); c.ellipse(cx + s * 13, cy - 12, 3, 4, [200, 50, 50]); c.rect(cx + s * 13 - 1, cy - 15, 2, 7, INK);
      for (const [dx, dy] of [[-10, -26], [0, -30]]) top.poly([[cx + s * dx - 5, cy + dy + 8], [cx + s * dx + 5, cy + dy + 8], [cx + s * (dx - 12), cy + dy - 16]], [240, 236, 220]);
      for (let k = 0; k < 4; k++) c.poly([[cx - s * (8 + k * 6), cy - 24 + k * 5], [cx - s * (14 + k * 6), cy - 30 + k * 6], [cx - s * (14 + k * 6), cy - 18 + k * 5]], D);
    }));
  },
};

// ================================================================ The Pokémon League
// Shauntal (Ghost): the novelist's library. Tall shelves down both sides, stacks of books, violet ghost-candles
// along the runner and her writing desk under a moonlit window.
PLANS.BW1Elite0 = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const V = [150, 110, 250], DW = [96, 66, 86];
    [5, 11, 17, 23, 29].forEach((y, k) => { const o = k % 2 ? 2 : 0; shelf(p, 3 + o, 11 + o, y, 30 + k, DW); shelf(p, 36 - o, 44 - o, y, 60 + k, DW); });
    const stacks = [[15, 8], [32, 8], [16, 20], [31, 20], [14, 27], [33, 27], [17, 33], [30, 33], [19, 3], [29, 3]];
    for (const [x, y] of stacks) blk(p, x, y);
    for (const y of [12, 18, 24, 30]) for (const x of [20, 28]) torch(p, x, y, V, [80, 70, 110]);
    blk(p, 21, 5, 7, 1);
    p.paint(0, (c) => {
      wall(c, [60, 46, 84], [36, 28, 56]); wallBooks(p, c, X0 * T, 19 * T, 21, DW); wallBooks(p, c, 30 * T, (X1 + 1) * T, 27, DW);
      const mx = 24 * T + 8; c.ellipse(mx, 15, 30, 14, [30, 24, 50]); c.ellipse(mx, 15, 27, 12, [40, 44, 96]); c.ellipse(mx + 4, 13, 8, 8, [250, 244, 200]); c.ellipse(mx + 7, 11, 7, 7, [40, 44, 96]); for (let i = 0; i < 9; i++) c.p(mx - 22 + i * 5, 8 + (i * 7) % 12, WHITE); c.rect(mx - 1, 3, 2, 24, [30, 24, 50]);
      rug(c, 23, 10, 25, 37, [110, 70, 170], [200, 170, 240]); c.ellipse(mx, 8 * T + 8, 62, 34, [70, 46, 120]); c.ellipse(mx, 8 * T + 8, 56, 30, [110, 70, 170]); c.ellipse(mx, 8 * T + 8, 48, 25, [200, 170, 240], 1);
      for (let i = 0; i < 30; i++) { const x = (3 + p.hash(i, 1, 6) * 41) * T, y = (4 + p.hash(i, 2, 6) * 30) * T; c.box(x, y, 7, 5, [240, 236, 220], [150, 140, 130]); c.rect(x + 1, y + 2, 4, 1, [150, 140, 130]); }
    });
    p.paint(6, (c) => { const px = 21 * T, py = 5 * T; c.rect(px + 2, py + 14, 7 * T, 3, [0, 0, 0, 70]); c.box(px, py - 3, 7 * T, 18, [110, 70, 90], [50, 30, 46]); c.rect(px + 1, py - 2, 7 * T - 2, 5, [150, 100, 120]); c.box(px + 40, py - 6, 30, 10, [250, 246, 230], [150, 140, 120]); c.rect(px + 54, py - 6, 2, 10, [150, 140, 120]); for (let k = 0; k < 3; k++) { c.rect(px + 43, py - 4 + k * 2, 9, 1, [110, 100, 120]); c.rect(px + 58, py - 4 + k * 2, 9, 1, [110, 100, 120]); } c.line(px + 78, py - 2, px + 88, py - 12, WHITE, 2); c.box(px + 12, py - 5, 8, 8, [50, 40, 70], INK); glow(c, px + 98, py - 6, 12, V, 30); c.rect(px + 97, py - 4, 3, 7, [240, 236, 220]); c.rect(px + 97, py - 8, 3, 4, V); });
    stacks.forEach(([x, y], k) => p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 70]); const n = 3 + (k % 3); for (let i = 0; i < n; i++) { const col = [[200, 60, 60], [60, 110, 200], [70, 160, 90], [230, 190, 80], [150, 90, 180]][(i + k) % 5]; c.box(px + 2 + ((i + k) % 2), py + 10 - i * 4, 12, 5, col, sh(col, 0.5)); c.rect(px + 3 + ((i + k) % 2), py + 12 - i * 4, 10, 1, [240, 236, 220]); } }));
    // books adrift in the air
    p.paint(36, (c, top) => { for (const [x, y, k] of [[14, 13, 0], [33, 14, 1], [18, 23, 2], [31, 25, 3], [13, 31, 4], [34, 32, 0], [17, 6, 1], [31, 6, 2]]) { const px = x * T, py = y * T, col = [[200, 60, 60], [60, 110, 200], [150, 90, 180], [70, 160, 90], [230, 190, 80]][k]; glow(top, px + 6, py + 3, 12, V, 26); top.poly([[px, py + 2], [px + 6, py + 4], [px + 12, py + 2], [px + 12, py - 4], [px + 6, py - 2], [px, py - 4]], col); top.poly([[px + 1, py + 1], [px + 6, py + 3], [px + 11, py + 1], [px + 11, py - 5], [px + 6, py - 3], [px + 1, py - 5]], [246, 242, 228]); top.rect(px + 6, py - 3, 1, 6, [150, 140, 130]); } });
  },
};

// Marshal (Fighting): the dojo. A roped ring on a raised canvas, punch bags, steel uprights and rocks to break.
PLANS.BW1Elite1 = {
  theme: { room: "arena", floor: "asphalt", wall: null },
  plan(p) {
    const OR = [240, 140, 50], posts = [[15, 3], [33, 3], [15, 14], [33, 14]], bags = [[6, 6], [10, 6], [38, 6], [42, 6], [8, 11], [40, 11]];
    p.fill("steel", 16, 4, 32, 13);
    blk(p, 15, 3, 19, 1); blk(p, 15, 4, 1, 11); blk(p, 33, 4, 1, 11); blk(p, 16, 14, 6, 1); blk(p, 27, 14, 6, 1);
    for (const [x, y] of bags) blk(p, x, y);
    for (const [x, y] of [[5, 18], [40, 18], [8, 27], [37, 27], [15, 30], [31, 30]]) p.decor("boulder", x, y, { optional: true });
    for (const [x, y] of [[12, 20], [35, 20], [3, 33], [44, 33], [3, 14], [44, 14]]) pillar(p, x, y, [130, 136, 154], 34);
    for (const [x, y] of [[19, 34], [29, 34], [4, 24], [43, 24]]) blk(p, x, y);
    p.paint(0, (c) => {
      wall(c, [70, 74, 92], [40, 42, 58]);
      for (let x = X0 * T + 20; x < (X1 + 1) * T; x += 48) { c.rect(x, 0, 6, 32, [110, 116, 136]); c.rect(x + 1, 0, 1, 32, [176, 180, 196]); for (let y = 4; y < 28; y += 8) c.ellipse(x + 3, y, 1, 1, INK); }
      for (const x of [8, 40]) { banner(c, x * T - 6, 3, 28, 26, [200, 70, 40], null); c.box(x * T + 2, 9, 12, 10, [250, 230, 200], INK); for (let k = 0; k < 4; k++) c.rect(x * T + 3 + k * 3, 9, 1, 5, INK); c.rect(x * T, 13, 4, 5, [250, 230, 200]); }
      for (let x = 14; x <= 34; x += 5) { glow(c, x * T, 8, 12, OR, 30); c.ellipse(x * T, 8, 3, 3, [255, 220, 150]); }
      // floor chevrons up the aisle
      for (let y = 16; y <= 33; y += 2) c.poly([[24 * T + 8, y * T], [26 * T + 8, y * T + 14], [26 * T + 8, y * T + 22], [24 * T + 8, y * T + 8], [22 * T + 8, y * T + 22], [22 * T + 8, y * T + 14]], A(OR, 150));
      // the ring: apron, canvas, the fist at its centre
      c.rect(15 * T - 4, 3 * T + 8, 19 * T + 8, 12 * T + 2, [40, 42, 58]); c.rect(15 * T, 3 * T + 12, 19 * T, 11 * T + 6, [200, 60, 50]); c.rect(15 * T + 6, 4 * T, 18 * T + 4, 10 * T + 8, [226, 232, 244]); frame(c, 15 * T + 12, 4 * T + 6, 18 * T - 8, 10 * T - 4, [70, 120, 210], 3);
      const cx = 24 * T + 8, cy = 11 * T; c.ellipse(cx, cy, 30, 22, A(OR, 200)); c.ellipse(cx, cy, 26, 18, [226, 232, 244]); c.box(cx - 11, cy - 8, 22, 15, OR, INK); for (let k = 1; k < 4; k++) c.rect(cx - 11 + k * 5, cy - 8, 1, 8, INK); c.box(cx - 15, cy - 1, 7, 9, OR, INK);
      // steps up into the ring
      for (let k = 0; k < 3; k++) { c.rect(22 * T, 14 * T + k * 6, 5 * T, 6, sh([150, 156, 172], 1 - k * 0.12)); c.rect(22 * T, 14 * T + k * 6, 5 * T, 1, WHITE); }
    });
    // ropes and corner posts
    p.paint(15, (c, top) => {
      for (const [k, col] of [[0, [226, 70, 60]], [1, WHITE], [2, [70, 120, 210]]]) {
        const yo = -18 + k * 6; top.rect(15 * T + 8, 3 * T + 8 + yo, 18 * T, 2, col); top.rect(15 * T + 7, 3 * T + 8 + yo, 2, 11 * T, col); top.rect(33 * T + 7, 3 * T + 8 + yo, 2, 11 * T, col);
        top.rect(15 * T + 8, 14 * T + 8 + yo, 6 * T + 8, 2, col); top.rect(27 * T, 14 * T + 8 + yo, 6 * T + 8, 2, col);
      }
      for (const [x, y] of [...posts, [21, 14], [27, 14]]) { const px = x * T + (x === 21 ? 12 : x === 27 ? -4 : 0), py = y * T; c.ellipse(px + 8, py + 14, 7, 3, [0, 0, 0, 80]); c.box(px + 4, py - 2, 8, 17, [200, 60, 50], INK); top.box(px + 4, py - 22, 8, 20, [200, 60, 50], INK); top.rect(px + 6, py - 21, 2, 18, [250, 150, 130]); top.box(px + 3, py - 25, 10, 5, WHITE, INK); }
    });
    for (const [x, y] of bags) p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T; c.ellipse(px, py + 13, 7, 3, [0, 0, 0, 80]); top.rect(px - 1, py - 30, 2, 12, [150, 150, 160]); for (const [cv, y0, h] of [[top, py - 20, 20], [c, py, 9]]) { cv.rect(px - 6, y0, 12, h, INK); cv.rect(px - 5, y0, 10, h, [170, 60, 50]); cv.rect(px - 4, y0, 2, h, [226, 110, 90]); } c.ellipse(px, py + 9, 6, 3, INK); c.ellipse(px, py + 8, 5, 2, [130, 44, 40]); top.ellipse(px, py - 20, 6, 3, INK); top.ellipse(px, py - 20, 5, 2, [200, 80, 66]); top.rect(px - 5, py - 8, 10, 2, [240, 230, 210]); });
    // dumbbells
    for (const [x, y] of [[19, 34], [29, 34], [4, 24], [43, 24]]) p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 2, [0, 0, 0, 80]); c.rect(px + 3, py + 7, 10, 3, [176, 180, 196]); for (const dx of [0, 11]) { c.box(px + dx, py + 3, 5, 11, [60, 62, 78], INK); c.rect(px + dx + 1, py + 4, 1, 9, [130, 134, 150]); } });
  },
};

// Grimsley (Dark): the gambler's parlour. A chequered floor, card tables, crimson drapes, red-flamed candelabra and
// the couch he lounges on.
PLANS.BW1Elite2 = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const CR = [150, 30, 44], tables = [[8, 13], [38, 13], [12, 23], [34, 23], [8, 30], [38, 30]];
    blk(p, 21, 4, 7, 2);
    for (const [x, y] of tables) blk(p, x, y, 2, 2);
    for (const y of [11, 17, 23, 29]) for (const x of [19, 29]) torch(p, x, y, [240, 70, 110], [70, 60, 76]);
    for (const [x, y] of [[4, 6], [43, 6], [4, 19], [43, 19], [4, 33], [43, 33]]) pillar(p, x, y, [70, 62, 80], 34);
    p.paint(0, (c) => {
      // chequered floor
      for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) if (((x >> 1) + (y >> 1)) % 2) c.rect(x * T, y * T, T, T, [120, 20, 40, 70]); else c.rect(x * T, y * T, T, T, [0, 0, 0, 90]);
      // drapes, moonlit windows and crossed blades
      wall(c, [50, 40, 60], [30, 24, 40]);
      for (let x = X0; x <= X1; x += 6) { if (x >= 20 && x < 28) continue; c.box(x * T + 34, 4, 24, 22, [30, 34, 70], [20, 16, 30]); c.ellipse(x * T + 48, 13, 5, 5, [250, 240, 190]); c.ellipse(x * T + 51, 11, 5, 5, [30, 34, 70]); for (const dx of [0, 62]) { c.rect(x * T + dx, 2, 30, 26, CR); for (let k = 0; k < 30; k += 6) c.rect(x * T + dx + k, 2, 2, 26, sh(CR, 0.6)); c.rect(x * T + dx, 2, 30, 3, GOLD); } }
      const mx = 24 * T + 8; c.rect(20 * T, 2, 9 * T, 26, CR); for (let k = 0; k < 9 * T; k += 8) c.rect(20 * T + k, 2, 2, 26, sh(CR, 0.6)); c.rect(20 * T, 2, 9 * T, 3, GOLD); c.line(mx - 16, 6, mx + 16, 26, [220, 224, 236], 3); c.line(mx + 16, 6, mx - 16, 26, [220, 224, 236], 3); c.line(mx - 12, 22, mx - 18, 18, GOLD, 3); c.line(mx + 12, 22, mx + 18, 18, GOLD, 3); c.ellipse(mx, 16, 5, 5, GOLD); c.ellipse(mx, 16, 3, 3, CR);
      rug(c, 23, 9, 25, 37, CR, GOLD); rug(c, 19, 6, 29, 9, CR, GOLD);
    });
    // the couch
    p.paint(6, (c) => { const px = 21 * T, py = 4 * T; c.rect(px + 3, py + 28, 7 * T, 4, [0, 0, 0, 80]); c.box(px, py - 10, 7 * T, 26, [96, 20, 34], [40, 10, 20]); for (let k = 8; k < 7 * T - 4; k += 12) c.ellipse(px + k, py - 2, 1, 1, GOLD); c.box(px, py + 12, 7 * T, 18, CR, [40, 10, 20]); c.rect(px + 1, py + 13, 7 * T - 2, 4, [200, 60, 76]); for (const dx of [0, 7 * T - 12]) { c.box(px + dx, py + 2, 12, 28, [120, 24, 40], [40, 10, 20]); c.ellipse(px + dx + 6, py + 3, 6, 4, [170, 44, 60]); } c.box(px + 20, py + 6, 16, 10, [40, 36, 60], INK); c.box(px + 74, py + 6, 16, 10, GOLD, INK); });
    // card tables
    tables.forEach(([x, y], k) => p.paint(y + 2, (c) => { const cx = (x + 1) * T, cy = (y + 1) * T; c.ellipse(cx, cy + 10, 15, 5, [0, 0, 0, 80]); c.box(cx - 2, cy + 2, 4, 10, DKW, INK); c.ellipse(cx, cy, 15, 11, [60, 36, 30]); c.ellipse(cx, cy - 1, 13, 9, [40, 110, 70]); c.ellipse(cx, cy - 1, 13, 9, [30, 80, 50], 1); for (let i = 0; i < 4; i++) { const ax = cx - 9 + i * 5, ay = cy - 4 + ((i + k) % 2) * 3; c.box(ax, ay, 5, 7, WHITE, INK); c.rect(ax + 2, ay + 2, 1, 2, (i + k) % 2 ? [200, 40, 50] : INK); } for (let i = 0; i < 3; i++) c.ellipse(cx + 7, cy + 2 - i * 2, 3, 1.5, [[200, 40, 50], GOLD, [60, 110, 200]][(i + k) % 3]); }));
  },
};

// Caitlin (Psychic): the bedchamber. Her great canopied bed, veils drifting at the walls, a starry carpet and
// rings of floating lights.
PLANS.BW1Elite3 = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const PK = [240, 170, 220], LI = [190, 160, 240], orbs = [[12, 10], [8, 16], [8, 24], [12, 30], [35, 10], [39, 16], [39, 24], [35, 30], [17, 14], [30, 14], [17, 26], [30, 26]];
    blk(p, 20, 2, 9, 4);
    for (const [x, y] of orbs) blk(p, x, y);
    for (const [x, y] of [[16, 3], [32, 3], [4, 34], [43, 34], [20, 34], [28, 34]]) pillar(p, x, y, [236, 226, 244], 32);
    p.paint(0, (c) => {
      c.rect(X0 * T, Y0 * T, 44 * T, 36 * T, [236, 190, 236, 70]);
      wall(c, [200, 170, 226], [150, 120, 190]);
      for (let x = 4; x <= 42; x += 5) { if (x > 18 && x < 30) continue; c.box(x * T - 4, 3, 26, 24, [50, 40, 100], [236, 226, 244]); c.ellipse(x * T + 9, 3, 13, 5, [200, 170, 226]); for (let i = 0; i < 5; i++) c.p(x * T + p.hash(x, i, 3) * 20, 8 + p.hash(x, i, 4) * 16, [255, 250, 200]); c.rect(x * T + 8, 6, 1, 21, [236, 226, 244]); }
      // the starry carpet: rings about the middle of the room, a runner to the bed
      const cx = 24 * T + 8, cy = 20 * T + 8;
      rug(c, 22, 6, 26, 37, PK, WHITE);
      for (const [r, col] of [[150, [226, 150, 210]], [140, PK], [104, [250, 214, 240]], [96, LI], [60, [226, 206, 250]], [52, PK]]) c.ellipse(cx, cy, r, r * 0.66, col);
      for (let a = 0; a < 12; a++) { const x = cx + Math.cos(a * 0.5236) * 120, y = cy + Math.sin(a * 0.5236) * 79; c.poly([[x, y - 6], [x + 2, y - 2], [x + 6, y], [x + 2, y + 2], [x, y + 6], [x - 2, y + 2], [x - 6, y], [x - 2, y - 2]], [255, 250, 210]); }
      c.poly([[cx, cy - 22], [cx + 7, cy - 7], [cx + 24, cy], [cx + 7, cy + 7], [cx, cy + 22], [cx - 7, cy + 7], [cx - 24, cy], [cx - 7, cy - 7]], WHITE);
      for (let i = 0; i < 60; i++) { const x = (2.5 + p.hash(i, 5, 8) * 43) * T, y = (6 + p.hash(i, 6, 8) * 29) * T; c.p(x, y, WHITE); c.p(x + 1, y, [255, 240, 250]); c.p(x, y + 1, [255, 240, 250]); c.p(x - 1, y, [255, 240, 250]); c.p(x, y - 1, [255, 240, 250]); }
    });
    // the bed
    p.paint(6, (c, top) => {
      const px = 20 * T, py = 2 * T, w = 9 * T;
      c.rect(px + 3, py + 62, w, 5, [0, 0, 0, 60]); c.box(px, py - 6, w, 70, [226, 206, 240], [130, 100, 170]); c.box(px + 5, py + 14, w - 10, 46, PK, [200, 120, 180]); c.rect(px + 6, py + 15, w - 12, 5, WHITE); for (let k = 0; k < 4; k++) c.rect(px + 6, py + 28 + k * 8, w - 12, 1, [226, 140, 200]);
      c.box(px + 5, py - 2, w - 10, 16, WHITE, [200, 180, 220]); for (const dx of [18, w - 60]) { c.ellipse(px + dx + 21, py + 6, 20, 7, [220, 200, 236]); c.ellipse(px + dx + 21, py + 5, 19, 6, [255, 246, 252]); }
      c.box(px, py + 56, w, 9, [200, 170, 226], [130, 100, 170]);
      // canopy
      for (const ex of [px - 2, px + w - 4]) { c.box(ex, py + 20, 6, 46, [236, 226, 244], [130, 100, 170]); top.box(ex, py - 30, 6, 50, [236, 226, 244], [130, 100, 170]); }
      top.box(px - 5, py - 34, w + 10, 9, LI, [130, 100, 170]); for (let k = 0; k < w + 6; k += 12) top.poly([[px - 3 + k, py - 25], [px + 9 + k, py - 25], [px + 3 + k, py - 17]], PK);
      for (const s of [0, 1]) { const ex = s ? px + w - 22 : px + 2; top.poly([[ex, py - 25], [ex + 20, py - 25], [ex + (s ? 20 : 0), py + 40], [ex + (s ? 12 : 8), py + 30]], [255, 220, 245, 170]); }
    });
    // floating lights
    orbs.forEach(([x, y], k) => p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T, col = k % 2 ? LI : PK; c.ellipse(px, py + 13, 5, 2, [80, 40, 100, 90]); glow(c, px, py + 2, 22, col, 30); top.ellipse(px, py - 6, 7, 7, sh(col, 0.8)); top.ellipse(px, py - 6, 6, 6, mix(col, WHITE, 0.4)); top.ellipse(px - 2, py - 8, 2, 2, WHITE); c.ellipse(px, py + 2, 6, 5, A(col, 120)); for (let i = 0; i < 3; i++) c.p(px - 6 + i * 6, py + 8 - (i % 2) * 3, WHITE); }));
    // veils by the walls (walked behind)
    p.paint(36, (c, top) => { for (const x0 of [X0, 42]) for (let k = 0; k < 4; k++) { const px = (x0 + k) * T; top.rect(px, 2 * T, T, 36 * T, [255, 214, 244, 54 + (k % 2) * 26]); top.rect(px + 7, 2 * T, 1, 36 * T, [255, 255, 255, 90]); } });
  },
};

// N's Castle: the throne room. A blue runner between two channels of water and ranks of columns up to the throne,
// the seals of the two dragons set in the floor.
PLANS.BW1NsCastle = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const ST = [214, 220, 236], BL = [50, 80, 170];
    const wet = (x, y) => (((x >= 16 && x <= 18) || (x >= 30 && x <= 32)) && y >= 11 && y <= 33 && y !== 21 && y !== 22);
    for (let y = 11; y <= 33; y++) for (let x = 16; x <= 32; x++) if (wet(x, y)) blk(p, x, y);
    blk(p, 22, 2, 5, 2);
    for (const y of [12, 17, 26, 31]) for (const x of [20, 28]) pillar(p, x, y, ST, 36);
    for (const [x, y] of [[4, 5], [43, 5], [4, 20], [43, 20], [4, 33], [43, 33], [10, 5], [37, 5]]) pillar(p, x, y, ST, 36);
    for (const [x, y] of [[19, 5], [29, 5], [19, 9], [29, 9]]) torch(p, x, y, [110, 190, 250], [150, 156, 180]);
    p.paint(0, (c) => {
      // pale wall, tall windows and Team Plasma's banners
      wall(c, [176, 186, 214], [110, 120, 160]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 32) c.rect(x, 3, 1, 24, [150, 160, 196]);
      for (const x of [5, 11, 17, 30, 36, 42]) { c.box(x * T - 3, 3, 22, 24, [120, 190, 240], [90, 100, 140]); c.ellipse(x * T + 8, 3, 11, 4, [176, 186, 214]); c.rect(x * T + 7, 4, 2, 23, [90, 100, 140]); c.rect(x * T - 2, 5, 6, 20, [200, 230, 250, 120]); }
      for (const x of [8, 14, 33, 39]) { banner(c, x * T - 1, 3, 18, 26, BL, null); c.poly([[x * T + 2, 7], [x * T + 14, 7], [x * T + 14, 16], [x * T + 8, 21], [x * T + 2, 16]], WHITE); c.rect(x * T + 2, 7, 6, 12, INK); c.rect(x * T + 7, 9, 2, 9, [90, 170, 240]); c.rect(x * T + 7, 9, 5, 2, [90, 170, 240]); c.rect(x * T + 10, 9, 2, 5, [90, 170, 240]); c.rect(x * T + 7, 13, 5, 2, [90, 170, 240]); }
      c.box(20 * T, 2, 9 * T, 26, [236, 240, 250], [90, 100, 140]); for (let k = 0; k < 9; k++) c.rect(20 * T + 4 + k * 16, 4, 1, 22, [176, 186, 214]);
      // the dais
      for (let k = 2; k >= 0; k--) { c.rect((19 - k * 2) * T, 2 * T, (11 + k * 4) * T, (6 + k) * T, sh(ST, 1.06 - k * 0.1)); c.rect((19 - k * 2) * T, (8 + k) * T - 5, (11 + k * 4) * T, 5, sh(ST, 0.7 - k * 0.06)); c.rect((19 - k * 2) * T, (8 + k) * T - 6, (11 + k * 4) * T, 1, WHITE); }
      rug(c, 22, 4, 26, 37, BL, GOLD); for (let y = 12; y <= 34; y += 3) { const cy = y * T; c.poly([[24 * T + 8, cy - 6], [24 * T + 14, cy], [24 * T + 8, cy + 6], [24 * T + 2, cy]], [90, 130, 220]); }
      // the water channels with stone kerbs, and the two bridges
      for (let y = 11; y <= 33; y++) for (let x = 16; x <= 32; x++) if (wet(x, y)) { const px = x * T, py = y * T; c.rect(px, py, T, T, [70, 140, 220]); if ((x + y) % 2) c.rect(px + 3, py + 5, 8, 1, [150, 206, 250]); else c.rect(px + 6, py + 11, 7, 1, [120, 186, 240]); if (!wet(x, y - 1)) { c.rect(px, py, T, 4, [110, 120, 160]); c.rect(px, py, T, 1, WHITE); } if (!wet(x, y + 1)) c.rect(px, py + 13, T, 3, [150, 160, 196]); if (!wet(x - 1, y)) c.rect(px, py, 2, T, [150, 160, 196]); if (!wet(x + 1, y)) c.rect(px + 14, py, 2, T, [150, 160, 196]); }
      for (const x0 of [16, 30]) { c.box(x0 * T - 2, 21 * T - 2, 3 * T + 4, 2 * T + 4, ST, [110, 120, 160]); for (let k = 0; k < 6; k++) c.rect(x0 * T + k * 8, 21 * T, 1, 2 * T, [176, 186, 214]); }
      // the dragons' seals
      for (const [x, y, a, b] of [[12, 12, [250, 250, 255], [50, 50, 70]], [36, 12, [50, 50, 70], [250, 250, 255]]]) { const cx = x * T + 8, cy = y * T + 8; c.ellipse(cx, cy, 58, 44, [110, 120, 160]); c.ellipse(cx, cy, 54, 40, a); c.ellipse(cx, cy, 54, 40, GOLD, 2); c.ellipse(cx, cy, 34, 25, b); c.ellipse(cx, cy, 34, 25, GOLD, 1); for (let k = 0; k < 8; k++) { const an = k * 0.785; c.poly([[cx + Math.cos(an) * 36, cy + Math.sin(an) * 27], [cx + Math.cos(an + 0.2) * 50, cy + Math.sin(an + 0.2) * 37], [cx + Math.cos(an + 0.4) * 36, cy + Math.sin(an + 0.4) * 27]], b); } c.ellipse(cx, cy, 14, 10, a); }
    });
    // the throne
    p.paint(4, (c, top) => { const px = 22 * T, py = 2 * T; c.rect(px + 4, py + 28, 5 * T, 4, [0, 0, 0, 60]); c.box(px + 8, py + 6, 5 * T - 16, 24, [226, 230, 244], [90, 100, 140]); c.box(px + 16, py + 12, 5 * T - 32, 16, BL, [30, 50, 110]); for (const dx of [4, 5 * T - 16]) c.box(px + dx, py + 10, 12, 22, GOLD, [130, 100, 40]); c.box(px + 14, py - 26, 5 * T - 28, 36, [226, 230, 244], [90, 100, 140]); c.box(px + 20, py - 20, 5 * T - 40, 28, BL, [30, 50, 110]); c.poly([[px + 14, py - 26], [px + 40, py - 40], [px + 66, py - 26]], GOLD); c.ellipse(px + 40, py - 28, 5, 5, [90, 170, 240]); c.ellipse(px + 39, py - 29, 2, 2, WHITE); });
  },
};

// ================================================================ Towers, stores, labs and homes
// Celestial Tower: the hall of graves. Ranks of headstones, violet candles, and the roof-top ring where the great
// bell hangs.
PLANS.BW1CelestialTower = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    const ST = [156, 150, 172], V = [170, 120, 250], graves = [];
    for (const x of [5, 9, 13, 17, 21, 25, 29]) for (const y of [7, 12, 17]) graves.push([x, y]);
    for (const x of [5, 9, 13, 17, 21]) for (const y of [24, 29, 34]) graves.push([x, y]);
    for (const [x, y] of [[33, 7], [37, 7], [33, 12], [37, 12], [41, 12], [35, 17], [41, 17], [43, 34], [40, 34]]) graves.push([x, y]);
    for (const [x, y] of graves) blk(p, x, y, 1, 2);
    blk(p, 31, 24, 3, 2); blk(p, 40, 3, 4, 4);
    for (const [x, y] of [[27, 22], [37, 22], [27, 30], [37, 30], [2, 2], [36, 2], [2, 37], [45, 37], [45, 21]]) torch(p, x, y, V, [110, 100, 130]);
    hatch(p, 0, "stairs", ST);
    p.paint(0, (c) => {
      // night windows in an old stone wall
      wall(c, [96, 88, 120], [60, 54, 84]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 16) c.rect(x + ((x / 16) % 2) * 8, 3, 1, 24, [80, 72, 104]); c.rect(X0 * T, 14, 44 * T, 1, [80, 72, 104]);
      for (let x = 5; x <= 42; x += 6) { c.box(x * T - 2, 5, 20, 22, [24, 26, 60], [60, 54, 84]); c.ellipse(x * T + 8, 5, 10, 4, [96, 88, 120]); for (let i = 0; i < 4; i++) c.p(x * T + p.hash(x, i, 1) * 16, 9 + p.hash(x, i, 2) * 14, WHITE); if (x % 12 === 5) { c.ellipse(x * T + 10, 13, 4, 4, [250, 244, 200]); } }
      // a worn runner from the stairs to the bell ring
      rug(c, 6, 20, 26, 20, [110, 80, 150], [176, 150, 210]);
      const cx = 32 * T + 8, cy = 26 * T + 8; c.ellipse(cx, cy, 104, 82, [70, 64, 96]); c.ellipse(cx, cy, 98, 77, [176, 170, 196]); c.ellipse(cx, cy, 86, 67, [130, 124, 156]); c.ellipse(cx, cy, 82, 64, [196, 190, 214]);
      for (let a = 0; a < 16; a++) c.line(cx + Math.cos(a * 0.3927) * 34, cy + Math.sin(a * 0.3927) * 26, cx + Math.cos(a * 0.3927) * 82, cy + Math.sin(a * 0.3927) * 64, [150, 144, 176]);
      c.ellipse(cx, cy, 34, 26, [110, 80, 150]); c.ellipse(cx, cy, 30, 23, [150, 120, 196]); c.ellipse(cx, cy, 30, 23, GOLD, 1);
      for (let i = 0; i < 18; i++) c.ellipse((3 + p.hash(i, 3, 3) * 41) * T, (4 + p.hash(i, 4, 3) * 32) * T, 22, 6, [220, 214, 240, 26]);
    });
    graves.forEach(([x, y], k) => p.paint(y + 2.05, (c) => {
      const px = x * T, py = y * T, col = k % 3 ? ST : [176, 170, 186];
      c.rect(px, py - 8, T, 40, sh(col, 0.45)); c.rect(px + 1, py - 7, 14, 28, col); c.rect(px + 1, py - 7, 14, 3, mix(col, WHITE, 0.4)); c.rect(px + 1, py - 7, 2, 28, mix(col, WHITE, 0.2)); c.rect(px + 12, py - 4, 3, 25, sh(col, 0.8));
      c.rect(px + 7, py - 2, 2, 9, sh(col, 0.55)); c.rect(px + 5, py + 1, 6, 2, sh(col, 0.55)); for (let i = 0; i < 3; i++) c.rect(px + 4, py + 10 + i * 3, 8, 1, sh(col, 0.65));
      c.rect(px, py + 21, T, 17, sh(col, 0.7)); c.rect(px, py + 21, T, 2, sh(col, 0.95)); c.rect(px, py + 34, T, 4, sh(col, 0.5));
      if (k % 4 === 1) { c.ellipse(px + 4, py + 28, 2, 2, [240, 130, 170]); c.ellipse(px + 8, py + 29, 2, 2, [250, 240, 200]); c.ellipse(px + 12, py + 28, 2, 2, [170, 150, 250]); }
    }));
    // the bell in its frame
    p.paint(26, (c, top) => {
      const px = 31 * T, py = 24 * T, B = [226, 180, 70];
      c.ellipse(px + 24, py + 30, 28, 6, [0, 0, 0, 70]);
      for (const ex of [px + 1, px + 40]) { c.box(ex, py - 2, 7, 34, [120, 84, 60], DKW); top.box(ex, py - 40, 7, 38, [120, 84, 60], DKW); top.rect(ex + 2, py - 38, 1, 36, [170, 126, 90]); }
      top.box(px - 4, py - 46, 56, 8, [140, 96, 66], DKW); top.rect(px - 3, py - 45, 54, 2, [190, 146, 100]); top.rect(px + 22, py - 38, 4, 6, [80, 70, 60]);
      glow(top, px + 24, py - 12, 30, [250, 230, 150], 22);
      top.poly([[px + 15, py - 32], [px + 33, py - 32], [px + 38, py - 6], [px + 42, py + 2], [px + 6, py + 2], [px + 10, py - 6]], sh(B, 0.55)); top.poly([[px + 16, py - 31], [px + 32, py - 31], [px + 37, py - 6], [px + 40, py + 1], [px + 8, py + 1], [px + 11, py - 6]], B); top.poly([[px + 17, py - 30], [px + 21, py - 30], [px + 16, py - 5], [px + 11, py]], mix(B, WHITE, 0.5)); top.rect(px + 9, py - 5, 30, 2, sh(B, 0.7)); c.ellipse(px + 24, py + 5, 4, 4, sh(B, 0.6));
    });
    // the winding stair to the next floor
    p.paint(7, (c) => { const cx = 42 * T, cy = 5 * T; c.ellipse(cx, cy + 2, 34, 32, [60, 54, 84]); c.ellipse(cx, cy, 32, 30, [20, 18, 30]); for (let a = 0; a < 9; a++) { const an = 1.2 + a * 0.52; c.poly([[cx, cy], [cx + Math.cos(an) * 31, cy + Math.sin(an) * 29], [cx + Math.cos(an + 0.5) * 31, cy + Math.sin(an + 0.5) * 29]], sh([196, 190, 214], 1 - a * 0.09)); } c.ellipse(cx, cy, 5, 5, [110, 100, 130]); c.ellipse(cx, cy, 32, 30, [110, 100, 130], 2); });
  },
};

// Cold Storage: the frozen warehouse. Frosted shipping containers in rows, pallets of ice, slick patches on the
// floor and the chillers roaring along the back wall.
PLANS.BW1ColdStorageInside = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const boxes = [[7, 7], [34, 7], [7, 27], [13, 7], [19, 7], [28, 7], [40, 7], [10, 13], [16, 13], [31, 13], [37, 13], [13, 27], [28, 27], [40, 27], [10, 32], [16, 32], [25, 33], [40, 33], [30, 20], [36, 20]];
    const ice = [[22, 11], [23, 11], [25, 16], [4, 12], [43, 17], [20, 24], [21, 24], [44, 30], [5, 35], [24, 29], [3, 26], [33, 34], [43, 3], [3, 3]];
    for (const [x, y] of boxes) blk(p, x, y, 3, 2);
    for (const [x, y] of ice) blk(p, x, y);
    blk(p, 21, 17, 2, 2);
    hatch(p, 0, "pad", [176, 196, 220]);
    p.paint(0, (c) => {
      wall(c, [130, 150, 176], [80, 96, 124]);
      for (let x = X0 * T; x < (X1 + 1) * T; x += 32) { c.rect(x, 3, 1, 24, [100, 120, 150]); c.rect(x + 1, 3, 1, 24, [176, 196, 220]); }
      for (const x of [6, 14, 22, 30, 38]) { c.box(x * T, 4, 44, 20, [90, 104, 130], INK); c.ellipse(x * T + 12, 14, 8, 8, [40, 46, 64]); for (let k = 0; k < 4; k++) c.line(x * T + 12, 14, x * T + 12 + Math.cos(k * 1.57 + 0.4) * 7, 14 + Math.sin(k * 1.57 + 0.4) * 7, [190, 206, 226], 2); for (let k = 0; k < 4; k++) c.rect(x * T + 25, 7 + k * 4, 15, 2, [50, 58, 80]); c.rect(x * T + 38, 20, 3, 2, [110, 230, 140]); }
      for (let x = X0 * T + 1; x < (X1 + 1) * T - 5; x += 6) { const h = 3 + Math.floor(p.hash(x, 2, 5) * 11); c.poly([[x, 32], [x + 5, 32], [x + 2, 32 + h]], [226, 242, 255]); }
      // slick ice and drifting cold
      for (let i = 0; i < 22; i++) { const x = (4 + p.hash(i, 1, 9) * 39) * T, y = (5 + p.hash(i, 2, 9) * 30) * T, rx = 18 + p.hash(i, 3, 9) * 26, ry = 8 + p.hash(i, 4, 9) * 10; c.ellipse(x, y, rx, ry, [150, 210, 244, 150]); c.ellipse(x, y, rx - 3, ry - 2, [196, 232, 252, 170]); c.line(x - rx / 2, y + 2, x - rx / 2 + 8, y - 3, WHITE); c.line(x + 3, y + 3, x + 9, y - 1, WHITE); }
      for (let i = 0; i < 16; i++) c.ellipse((3 + p.hash(i, 5, 9) * 41) * T, (4 + p.hash(i, 6, 9) * 32) * T, 26, 7, [255, 255, 255, 40]);
      // painted bay lines
      for (const y of [10, 16, 30]) for (let x = 4; x <= 43; x += 2) c.rect(x * T, y * T + 7, 12, 2, [240, 200, 50, 170]);
    });
    boxes.forEach(([x, y], k) => p.paint(y + 2.05, (c) => {
      const px = x * T, py = y * T, col = [[60, 130, 170], [200, 110, 60], [90, 150, 110], [130, 136, 160], [50, 90, 170]][k % 5], w = 48;
      c.rect(px + 3, py + 37, w, 3, [0, 0, 0, 50]); c.rect(px, py - 8, w, 46, sh(col, 0.4));
      c.rect(px + 1, py - 7, w - 2, 12, mix(col, WHITE, 0.35)); for (let i = px + 4; i < px + w - 2; i += 6) c.rect(i, py - 6, 1, 10, mix(col, WHITE, 0.15));
      c.rect(px + 1, py + 5, w - 2, 32, col); for (let i = px + 3; i < px + w - 2; i += 4) c.rect(i, py + 7, 2, 28, sh(col, 0.8)); c.rect(px + 1, py + 5, w - 2, 2, sh(col, 0.6)); c.rect(px + 1, py + 35, w - 2, 2, sh(col, 0.55));
      c.box(px + 17, py + 14, 14, 9, WHITE, sh(col, 0.5)); c.poly([[px + 24, py + 15], [px + 27, py + 18], [px + 24, py + 21], [px + 21, py + 18]], [110, 190, 240]);
      for (let i = 0; i < 9; i++) { const fx = px + 1 + Math.floor(p.hash(i, k, 7) * (w - 8)); c.rect(fx, py - 7, 6, 2 + Math.floor(p.hash(i, k, 8) * 5), [240, 248, 255]); } for (let i = 0; i < 5; i++) { const fx = px + 2 + Math.floor(p.hash(i, k, 11) * (w - 6)); c.rect(fx, py + 5, 2, 3 + Math.floor(p.hash(i, k, 12) * 6), [226, 242, 255]); }
    }));
    for (const [x, y] of ice) p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.rect(px + 2, py + 13, 14, 3, [40, 80, 130, 80]); c.box(px, py + 11, 16, 4, [176, 140, 96], DKW); c.box(px + 1, py - 4, 14, 16, [170, 220, 246], [96, 150, 206]); c.rect(px + 2, py - 3, 12, 4, [226, 244, 255]); c.line(px + 4, py + 9, px + 9, py + 3, WHITE); c.rect(px + 11, py + 2, 2, 8, [140, 196, 236]); });
    // a forklift
    p.paint(19, (c) => { const px = 21 * T, py = 17 * T; c.ellipse(px + 16, py + 30, 17, 4, [0, 0, 0, 70]); c.box(px + 4, py + 6, 22, 22, [240, 190, 50], INK); c.box(px + 7, py - 6, 16, 14, [60, 66, 84], INK); c.rect(px + 9, py - 4, 12, 7, [150, 206, 244]); c.rect(px + 4, py + 20, 22, 3, [200, 150, 30]); c.ellipse(px + 9, py + 28, 4, 4, INK); c.ellipse(px + 22, py + 28, 4, 4, INK); c.rect(px + 27, py - 8, 3, 36, [110, 116, 136]); c.rect(px + 27, py + 24, 12, 2, [176, 180, 196]); c.rect(px + 27, py + 18, 12, 2, [176, 180, 196]); });
  },
};

// P2 Laboratory: Team Plasma's hidden lab. A containment tank at its heart fed by cables from the machine banks,
// conveyors either side, work benches below.
PLANS.BW1P2Laboratory = {
  theme: { room: "lab", floor: "rLab" },
  plan(p) {
    const PU = [170, 110, 240];
    for (const x of [4, 8, 12, 33, 37, 41]) p.decor("rMachine", x, 0, { optional: true });
    for (const x of [17, 20, 26, 29]) p.decor("rShelf", x, 0, { optional: true });
    for (const [x, y] of [[6, 25], [14, 25], [30, 25], [38, 25], [10, 31], [34, 31]]) p.decor("rLabTable", x, y, { optional: true });
    for (const [x, y] of [[2, 34], [44, 34], [20, 34], [27, 34]]) p.decor("rStack", x, y, { optional: true });
    blk(p, 22, 8, 5, 4); blk(p, 6, 17, 13, 1); blk(p, 29, 17, 13, 1);
    hatch(p, 0, "pad", [200, 206, 220]);
    p.paint(0, (c) => {
      const cx = 24 * T + 8, cy = 10 * T;
      // cables across the floor to the tank
      for (const [x, y] of [[5, 4], [9, 4], [13, 4], [34, 4], [38, 4], [42, 4], [6, 17], [41, 17]]) { c.line(x * T + 8, y * T, x * T + 8, cy + 20, [50, 50, 66], 3); c.line(x * T + 8, cy + 20, cx, cy + 20, [50, 50, 66], 3); c.line(x * T + 8, y * T, x * T + 8, cy + 20, [110, 110, 136], 1); }
      c.ellipse(cx, cy + 8, 96, 70, [240, 200, 50]); c.ellipse(cx, cy + 8, 92, 66, [70, 74, 92]); c.ellipse(cx, cy + 8, 80, 56, [110, 116, 136]); for (let a = 0; a < 24; a++) c.poly([[cx + Math.cos(a * 0.262) * 82, cy + 8 + Math.sin(a * 0.262) * 58], [cx + Math.cos(a * 0.262 + 0.13) * 82, cy + 8 + Math.sin(a * 0.262 + 0.13) * 58], [cx + Math.cos(a * 0.262 + 0.13) * 92, cy + 8 + Math.sin(a * 0.262 + 0.13) * 66], [cx + Math.cos(a * 0.262) * 92, cy + 8 + Math.sin(a * 0.262) * 66]], INK);
      glow(c, cx, cy + 8, 70, PU, 26);
      for (const y of [22, 29]) for (let x = 4; x <= 43; x += 2) c.rect(x * T, y * T + 7, 12, 2, [240, 200, 50, 150]);
    });
    // the tank
    p.paint(12, (c, top) => { const px = 22 * T, py = 8 * T, w = 5 * T; c.ellipse(px + w / 2, py + 62, 42, 8, [0, 0, 0, 80]); c.box(px, py + 44, w, 20, [80, 84, 104], INK); c.rect(px + 2, py + 46, w - 4, 3, [150, 156, 176]); for (let k = 0; k < 6; k++) c.rect(px + 8 + k * 12, py + 54, 6, 4, k % 2 ? [110, 230, 140] : [240, 110, 110]); for (const [cv, y0, h] of [[top, py - 26, 34], [c, py + 8, 36]]) { cv.rect(px + 8, y0, w - 16, h, [60, 40, 110]); cv.rect(px + 10, y0, w - 20, h, [130, 90, 220, 235]); cv.rect(px + 14, y0, 6, h, [200, 170, 250]); cv.rect(px + w - 20, y0, 3, h, [100, 70, 180]); } top.box(px + 2, py - 34, w - 4, 10, [80, 84, 104], INK); top.rect(px + 4, py - 32, w - 8, 2, [150, 156, 176]); c.ellipse(px + w / 2, py + 22, 12, 16, [90, 60, 150]); c.ellipse(px + w / 2, py + 14, 9, 8, [110, 80, 170]); c.rect(px + w / 2 - 4, py + 12, 8, 2, [250, 90, 90]); for (let i = 0; i < 5; i++) c.ellipse(px + 16 + i * 11, py + 36 - (i * 7) % 20, 2, 2, [226, 210, 255]); glow(top, px + w / 2, py - 8, 30, PU, 22); });
    // conveyors
    for (const [x0, dir] of [[6, 1], [29, -1]]) p.paint(18, (c) => { const px = x0 * T, py = 17 * T, w = 13 * T; c.rect(px + 2, py + 13, w, 3, [0, 0, 0, 70]); c.box(px, py - 3, w, 17, [60, 60, 70], INK); for (let x = px + 6; x < px + w - 8; x += 12) c.poly([[x, py], [x + 5 * dir, py + 4], [x, py + 8]], [130, 134, 150]); c.rect(px, py + 10, w, 4, [150, 156, 172]); for (let k = 0; k < 4; k++) { const x = px + 20 + k * 48; c.box(x, py - 8, 14, 13, [70, 110, 190], INK); c.rect(x + 1, py - 7, 12, 3, [130, 170, 240]); c.box(x + 4, py - 3, 6, 5, WHITE, INK); } });
  },
};

// The player's house in Nuvema: kitchen, table and sofa downstairs feel, the bed and the PC, and the rug where the
// three friends open the present.
PLANS.BW1Home = {
  theme: { room: "house", floor: "deck" },
  plan(p) {
    p.decor("rKitchen", 9, 0, { optional: true }); for (const x of [14, 19, 28, 40]) p.decor("rWindow", x, 0, { optional: true });
    p.decor("rTV", 23, 1, { optional: true }); p.decor("rBooks", 32, 0, { optional: true }); p.decor("rBooks", 3, 0, { optional: true });
    p.decor("rTable", 9, 27, { optional: true }); p.decor("rSeats", 35, 27, { optional: true }); p.decor("rSeats", 35, 20, { optional: true });
    for (const [x, y] of [[2, 36], [45, 36], [45, 2], [20, 36], [28, 36], [2, 14]]) p.decor("rPlant", x, y, { optional: true });
    p.decor("rShelf", 42, 0, { optional: true }); p.decor("rShelf", 44, 12, { optional: true });
    blk(p, 38, 6, 1, 1);
    p.paint(0, (c) => {
      rug(c, 14, 5, 34, 15, [90, 160, 110], [236, 226, 180]); for (let k = 0; k < 10; k++) { const x = (15.5 + k * 2) * T; c.poly([[x, 5 * T + 10], [x + 6, 5 * T + 16], [x, 5 * T + 22], [x - 6, 5 * T + 16]], [236, 226, 180]); c.poly([[x, 14 * T + 10], [x + 6, 14 * T + 16], [x, 14 * T + 22], [x - 6, 14 * T + 16]], [236, 226, 180]); }
      c.ellipse(24 * T + 8, 9 * T, 40, 26, [236, 226, 180]); c.ellipse(24 * T + 8, 9 * T, 36, 23, [70, 130, 90]);
      rug(c, 7, 19, 13, 22, [226, 120, 110], [250, 230, 200]); rug(c, 31, 20, 40, 30, [110, 140, 210], [236, 226, 180]); rug(c, 22, 33, 26, 37, [200, 80, 70], [250, 230, 200]);
    });
    // the bed (over the game's own bed tiles) and a bedside table
    p.paint(9.05, (c) => { const px = 35 * T, py = 6 * T; c.rect(px + 3, py + 52, 32, 4, [0, 0, 0, 50]); c.box(px, py - 8, 32, 62, [176, 126, 80], DKW); c.box(px, py - 10, 32, 10, [150, 100, 60], DKW); c.box(px + 3, py + 1, 26, 50, [90, 140, 220], [50, 80, 150]); c.rect(px + 4, py + 2, 24, 14, WHITE); c.box(px + 7, py + 3, 18, 9, [250, 250, 255], [200, 206, 226]); c.rect(px + 4, py + 16, 24, 3, [200, 220, 250]); for (let k = 0; k < 4; k++) c.rect(px + 4, py + 24 + k * 7, 24, 1, [70, 110, 190]); });
    p.paint(7, (c) => { const px = 38 * T, py = 6 * T; c.box(px + 1, py - 2, 14, 16, [176, 126, 80], DKW); c.rect(px + 2, py - 1, 12, 4, [214, 170, 120]); c.rect(px + 6, py + 7, 4, 2, GOLD); c.rect(px + 7, py - 8, 2, 7, [60, 60, 70]); c.ellipse(px + 8, py - 9, 5, 3, [250, 220, 120]); });
    doorstep(p, [176, 126, 80]);
  },
};

// Professor Juniper's lab: machines and shelves along the wall, the table with the three Poké Balls, book stacks
// and work benches.
PLANS.BW1JuniperLab = {
  theme: { room: "lab", floor: "rLab" },
  plan(p) {
    for (const x of [3, 7, 11]) p.decor("rMachine", x, 0, { optional: true });
    for (const x of [30, 33, 36, 39, 42]) p.decor("rShelf", x, 0, { optional: true });
    p.decor("rLabTable", 26, 7, { optional: true }); p.decor("rLabTable", 16, 7, { optional: true });
    for (const [x, y] of [[32, 16], [38, 16], [32, 23], [38, 23], [6, 30], [12, 30]]) p.decor("rLabTable", x, y, { optional: true });
    for (const [x, y] of [[32, 30], [38, 30]]) p.decor("rBench", x, y, { optional: true });
    for (const [x, y] of [[2, 35], [44, 35]]) p.decor("rStack", x, y, { optional: true });
    for (const [x, y] of [[20, 36], [28, 36], [2, 12], [45, 12], [16, 0], [27, 0]]) p.decor("rPlant", x, y, { optional: true });
    shelf(p, 4, 12, 16, 3, [150, 156, 172]); shelf(p, 4, 12, 22, 5, [150, 156, 172]);
    p.paint(0, (c) => {
      rug(c, 19, 5, 29, 11, [70, 130, 200], WHITE); c.ellipse(24 * T + 8, 9 * T, 30, 20, WHITE); c.ellipse(24 * T + 8, 9 * T, 27, 18, [200, 60, 60]); c.rect(21 * T + 12, 9 * T - 2, 5 * T + 8, 4, WHITE); c.ellipse(24 * T + 8, 9 * T, 7, 6, WHITE); c.ellipse(24 * T + 8, 9 * T, 4, 3, [70, 130, 200]);
      rug(c, 23, 12, 25, 37, [70, 130, 200], WHITE);
      for (const y of [14, 28]) for (let x = 3; x <= 44; x += 2) { if (x >= 22 && x <= 26) continue; c.rect(x * T, y * T + 7, 10, 2, [110, 170, 230, 150]); }
    });
    doorstep(p, [176, 182, 196]);
  },
};

// ================================================================ Caves (outdoor-style cavern maps)
const inDisc = (cx, cy, rx, ry = rx) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const nearSeg = (ax, ay, bx, by, w) => (x, y) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x + 0.5 - ax - t * dx, y + 0.5 - ay - t * dy) <= w; };
const inRect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const anyOf = (fs) => (x, y) => fs.some((f) => f(x, y));
// Dig a cave out of solid rock: open(x, y) says where the floor is. Returns that test, clipped to the map.
function dig(p, open, face) {
  const ok = (x, y) => x >= 2 && y >= 2 && x <= p.W - 3 && y <= p.H - 3 && open(x, y);
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) p.fill(ok(x, y) ? "ground" : "border", x, y, x, y);
  if (face) p.paint(0, (c) => { for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) if (!ok(x, y) && ok(x, y + 1)) { const X = x * T, Y = y * T; c.rect(X, Y, T, T, face); c.rect(X, Y, T, 3, sh(face, 1.3)); c.rect(X, Y + 12, T, 4, sh(face, 0.62)); for (let k = 0; k < 3; k++) c.rect(X + 1 + Math.floor(p.hash(x, y, k + 1) * 14), Y + 3, 1, 5 + Math.floor(p.hash(x, y, k + 5) * 5), sh(face, 0.78)); if (!ok(x - 1, y + 1)) c.rect(X, Y, 1, T, sh(face, 0.62)); if (!ok(x + 1, y + 1)) c.rect(X + 15, Y, 1, T, sh(face, 0.62)); } });
  return ok;
}
// A wash of colour over the cave floor (the cave's light).
function wash(p, ok, col) { p.paint(0.1, (c) => { for (let y = 2; y < p.H - 2; y++) for (let x = 2; x < p.W - 2; x++) if (ok(x, y)) c.rect(x * T, y * T, T, T, col); }); }
function rock(p, x, y, col = [150, 140, 130]) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); c.poly([[px + 1, py + 14], [px + 3, py + 3], [px + 9, py], [px + 14, py + 5], [px + 15, py + 14]], sh(col, 0.45)); c.poly([[px + 2, py + 13], [px + 4, py + 4], [px + 9, py + 1], [px + 13, py + 6], [px + 14, py + 13]], col); c.poly([[px + 4, py + 5], [px + 9, py + 2], [px + 10, py + 6], [px + 5, py + 8]], sh(col, 1.25)); });
}
function spire(p, x, y, col, h = 32) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T + 14; c.ellipse(px + 8, py, 8, 3, [0, 0, 0, 60]); for (const [cv, a, b] of [[c, 0, 14], [top, 14, h]]) { const wa = 7 * (1 - a / h), wb = 7 * (1 - b / h); cv.poly([[px + 8 - wa - 1, py - a], [px + 8 + wa + 1, py - a], [px + 8 + wb + 1, py - b], [px + 8 - wb - 1, py - b]], sh(col, 0.45)); cv.poly([[px + 8 - wa, py - a], [px + 8 + wa, py - a], [px + 8 + wb, py - b], [px + 8 - wb, py - b]], col); cv.poly([[px + 8 - wa, py - a], [px + 8 - wa / 3, py - a], [px + 8 - wb / 3, py - b], [px + 8 - wb, py - b]], sh(col, 1.25)); } });
}
function crystal(p, x, y, col, big = 1) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); glow(c, px + 8, py + 4, 22 * big, col, 26); for (const [dx, hgt, w] of [[3, 12, 3], [12, 14, 3], [8, 24 * big, 4]]) { const cv = hgt > 16 ? top : c; cv.poly([[px + dx - w, py + 13], [px + dx + w, py + 13], [px + dx + w, py + 13 - hgt * 0.7], [px + dx, py + 13 - hgt], [px + dx - w, py + 13 - hgt * 0.7]], sh(col, 0.6)); cv.poly([[px + dx - w + 1, py + 12], [px + dx, py + 12], [px + dx, py + 14 - hgt], [px + dx - w + 1, py + 14 - hgt * 0.7]], mix(col, WHITE, 0.55)); cv.poly([[px + dx, py + 12], [px + dx + w - 1, py + 12], [px + dx + w - 1, py + 14 - hgt * 0.7], [px + dx, py + 14 - hgt]], col); if (cv === top) c.box(px + dx - w, py + 2, w * 2 + 1, 12, col, sh(col, 0.6)); } });
}

// Wellspring Cave: a damp cavern round an underground lake, crossed by a plank bridge; drips and blue light.
PLANS.BW1WellspringCave = {
  theme: { density: 0.02, groves: 0 },
  plan(p) {
    const R = [110, 104, 124];
    const ok = dig(p, anyOf([inDisc(8, 20.5, 5.5, 4.2), nearSeg(8, 21, 12.5, 26, 2.3), inDisc(13, 27.5, 5.5, 4), nearSeg(9, 20.5, 22, 19, 2.4), inDisc(28, 19.5, 14, 10.5), nearSeg(30, 26, 36, 31, 2.6), inDisc(37, 32, 6, 4), nearSeg(26, 12, 21, 6.5, 2.2), inDisc(20, 6, 5.5, 3.2), nearSeg(15, 28, 24, 33, 2), inDisc(25, 34, 5, 2.6)]), [96, 92, 120]);
    p.disc("water", 28, 19.5, 9.5, 6.2); p.disc("water", 38, 32.5, 3, 1.8); p.disc("water", 20.5, 5.4, 2.2, 1.1);
    p.street("caveFloor", 2, [[17, 19], [40, 19]]);
    wash(p, ok, [50, 90, 190, 46]);
    for (const [x, y] of [[20, 12], [36, 12], [18, 26], [39, 25], [6, 17], [10, 24], [33, 30], [24, 8], [16, 30], [41, 17]]) spire(p, x, y, R, 28 + (x % 3) * 4);
    for (const [x, y] of [[23, 11], [34, 27], [8, 23], [41, 30], [16, 7], [28, 33], [15, 17]]) rock(p, x, y, R);
    for (const [x, y] of [[32, 10], [16, 24], [42, 21], [22, 5]]) crystal(p, x, y, [120, 200, 250]);
    p.paint(0.3, (c) => { for (let i = 0; i < 26; i++) { const a = p.hash(i, 1, 3) * 6.28, x = 28 * T + Math.cos(a) * 150, y = 19.5 * T + Math.sin(a) * 100; c.ellipse(x, y, 6, 3, [160, 210, 250, 120], 1); } for (let i = 0; i < 14; i++) { const x = (20 + p.hash(i, 2, 5) * 16) * T, y = (15 + p.hash(i, 3, 5) * 9) * T; c.rect(x, y, 7, 1, [200, 230, 255, 170]); } });
  },
};

// Relic Castle: the buried ruin under the desert. Square sandstone halls ankle-deep in sand, rows of columns,
// pits of quicksand, and the sun-moth's chamber at the top.
PLANS.BW1RelicCastle = {
  theme: { density: 0, groves: 0, ground: "desert", road: "desert", grass: "desert" },
  plan(p) {
    const S = [214, 176, 110], rooms = [[3, 17, 10, 23], [10, 19, 15, 21], [14, 9, 31, 32], [5, 8, 14, 14], [31, 10, 34, 13], [31, 3, 41, 9], [34, 9, 37, 14], [31, 29, 34, 32], [33, 27, 42, 35], [18, 3, 28, 9], [36, 17, 42, 23], [31, 19, 36, 21]];
    const ok = dig(p, anyOf(rooms.map((r) => inRect(...r))), [176, 136, 84]);
    const pits = [[19, 15, 3.2, 2.2], [27, 24, 3.4, 2.4], [18, 28, 2.6, 1.8], [39, 20, 2.2, 1.6], [8, 11, 2, 1.4]];
    for (const [x, y, rx, ry] of pits) p.disc("sand", x, y, rx + 1.2, ry + 1);
    p.fill("sand", 21, 9, 24, 32); p.fill("sand", 4, 19, 14, 21);
    p.paint(0.2, (c) => {
      // flagstones showing through the sand, drifts along the walls
      for (const [x0, y0, x1, y1] of rooms) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const h = p.hash(x, y, 4); if (h < 0.16) { c.box(x * T + 1, y * T + 1, 14, 14, [200, 170, 120, 150], [150, 116, 76, 170]); c.line(x * T + 3, y * T + 10, x * T + 8, y * T + 5, [150, 116, 76, 170]); } else if (h > 0.9) for (let k = 0; k < 3; k++) c.rect(x * T + 2 + k * 3, y * T + 5 + k * 3, 8, 1, [250, 226, 160, 190]); }
      // quicksand: darker whirls
      for (const [x, y, rx, ry] of pits) { const cx = x * T, cy = y * T; for (let k = 0; k < 5; k++) c.ellipse(cx, cy, (rx * T) * (1 - k * 0.19), (ry * T) * (1 - k * 0.19), k % 2 ? [176, 136, 80] : [146, 108, 62]); c.ellipse(cx, cy, 3, 2, [96, 70, 44]); }
      // painted wall friezes along the back of the great hall and the high chamber
      for (const [x0, x1, y] of [[14, 31, 8], [31, 41, 2], [18, 28, 2]]) for (let x = x0; x <= x1; x++) { c.rect(x * T, y * T + 4, T, 6, [150, 70, 50]); c.poly([[x * T + 2, y * T + 9], [x * T + 8, y * T + 4], [x * T + 14, y * T + 9]], [70, 130, 150]); c.rect(x * T + 7, y * T + 6, 2, 2, GOLD); }
      // the moth's sun disc
      const cx = 36 * T + 8, cy = 6 * T + 8; c.ellipse(cx, cy, 44, 30, [150, 70, 50]); c.ellipse(cx, cy, 40, 27, [236, 190, 90]); c.ellipse(cx, cy, 40, 27, [250, 230, 150], 2); for (let a = 0; a < 12; a++) c.poly([[cx + Math.cos(a * 0.5236) * 20, cy + Math.sin(a * 0.5236) * 13], [cx + Math.cos(a * 0.5236 + 0.26) * 36, cy + Math.sin(a * 0.5236 + 0.26) * 24], [cx + Math.cos(a * 0.5236 + 0.52) * 20, cy + Math.sin(a * 0.5236 + 0.52) * 13]], [226, 110, 50]); c.ellipse(cx, cy, 16, 10, [250, 230, 150]);
    });
    for (const y of [11, 16, 21, 26, 31]) for (const x of [16, 20, 25, 29]) { if (pits.some(([px, py, rx, ry]) => Math.abs(x - px) < rx + 1 && Math.abs(y - py) < ry + 1)) continue; pillar(p, x, y, S, 30); }
    for (const [x, y] of [[32, 4], [40, 4], [32, 8], [40, 8], [6, 9], [13, 9], [34, 28], [41, 28]]) pillar(p, x, y, S, 30);
    for (const [x, y] of [[4, 18], [9, 22], [37, 34], [20, 4], [26, 8], [41, 18], [37, 22], [6, 13], [30, 31], [15, 30]]) rock(p, x, y, [200, 160, 100]);
    for (const [x, y] of [[19, 4], [27, 4], [34, 4], [38, 4]]) torch(p, x, y, [250, 170, 60], [150, 110, 70]);
    // a fallen statue
    blk(p, 22, 5, 3, 2); p.paint(7, (c) => { const px = 22 * T, py = 5 * T; c.ellipse(px + 24, py + 28, 26, 5, [0, 0, 0, 60]); c.box(px, py + 6, 3 * T, 22, sh(S, 0.8), sh(S, 0.45)); c.rect(px + 1, py + 7, 3 * T - 2, 4, mix(S, WHITE, 0.3)); c.ellipse(px + 24, py - 2, 12, 12, sh(S, 0.45)); c.ellipse(px + 24, py - 3, 11, 11, S); c.rect(px + 19, py - 5, 3, 3, [96, 70, 44]); c.rect(px + 26, py - 5, 3, 3, [96, 70, 44]); c.rect(px + 20, py + 2, 8, 1, [96, 70, 44]); c.poly([[px + 12, py - 10], [px + 36, py - 10], [px + 30, py - 18], [px + 18, py - 18]], [70, 130, 150]); c.line(px + 6, py + 12, px + 16, py + 24, sh(S, 0.5)); });
  },
};

// Chargestone Cave: blue-lit galleries where charged stones hang in the air and crystals crackle.
PLANS.BW1ChargestoneCave = {
  theme: { density: 0, groves: 0 },
  plan(p) {
    const B = [90, 150, 250], R = [70, 84, 150];
    const ok = dig(p, anyOf([inDisc(24, 35, 6.5, 3), nearSeg(24, 34, 15, 27, 2.6), inDisc(13.5, 25, 7.5, 5), nearSeg(14, 25, 27, 19, 2.6), inDisc(28.5, 18, 8.5, 5.2), nearSeg(28, 17, 22, 12, 2.6), inDisc(21, 11.5, 6.5, 4), nearSeg(21, 11, 24, 5, 2.4), inDisc(24, 4.8, 5.5, 2.8), nearSeg(30, 20, 36, 29, 2.5), inDisc(36.5, 30.5, 6.5, 4.6), nearSeg(12, 23, 7.5, 14, 2.3), inDisc(7.5, 12, 5, 4.2), nearSeg(34, 16, 40, 10, 2.2), inDisc(40.5, 9, 4, 3.4)]), [60, 76, 150]);
    wash(p, ok, [30, 70, 220, 112]);
    p.paint(0.3, (c) => {
      // veins of charge in the floor
      for (let i = 0; i < 70; i++) { const x = (3 + p.hash(i, 1, 2) * 42) * T, y = (3 + p.hash(i, 2, 2) * 34) * T; if (!ok(Math.floor(x / T), Math.floor(y / T)) || !ok(Math.floor(x / T) + 1, Math.floor(y / T))) continue; let px = x, py = y; for (let k = 0; k < 4; k++) { const nx = px + 3 + p.hash(i, k, 7) * 4, ny = py + (p.hash(i, k, 8) - 0.5) * 8; c.line(px, py, nx, ny, [150, 220, 255, 190]); px = nx; py = ny; } }
    });
    const big = [[9, 24, 1], [18, 23, 1], [26, 15, 1], [33, 19, 1], [18, 10, 1], [38, 27, 1], [33, 33, 1], [5, 10, 1], [10, 14, 1], [41, 7, 1], [20, 34, 1], [28, 34, 1], [21, 3, 0], [27, 3, 0], [12, 28, 0], [24, 21, 0], [39, 33, 0], [31, 15, 0], [16, 21, 0], [25, 9, 0]];
    for (const [x, y, k] of big) crystal(p, x, y, k ? B : [140, 230, 250], k ? 1.25 : 1);
    // floating charged stones (their shadows on the floor, the stones overhead)
    const stones = [[14, 26], [29, 19], [21, 13], [36, 31], [8, 12], [24, 33], [22, 24]];
    for (const [x, y] of stones) blk(p, x, y);
    stones.forEach(([x, y], i) => p.paint(y + 1, (c, top) => { const cx = x * T + 8, cy = y * T; c.ellipse(cx, cy + 12, 9, 3, [10, 20, 60, 130]); glow(top, cx, cy - 10, 26, [120, 200, 255], 30); top.poly([[cx - 10, cy - 8], [cx - 5, cy - 20], [cx + 6, cy - 22], [cx + 11, cy - 10], [cx + 5, cy], [cx - 6, cy + 1]], [30, 40, 90]); top.poly([[cx - 8, cy - 8], [cx - 4, cy - 18], [cx + 5, cy - 20], [cx + 9, cy - 10], [cx + 4, cy - 2], [cx - 5, cy - 1]], [60, 80, 160]); top.poly([[cx - 6, cy - 9], [cx - 3, cy - 17], [cx + 3, cy - 18], [cx, cy - 8]], [110, 150, 230]); top.line(cx - 12, cy - 4, cx - 18, cy - 12 + (i % 3) * 3, [200, 240, 255]); top.line(cx - 18, cy - 12 + (i % 3) * 3, cx - 22, cy - 8, [200, 240, 255]); top.line(cx + 12, cy - 14, cx + 19, cy - 20, [200, 240, 255]); top.line(cx + 19, cy - 20, cx + 21, cy - 14, [200, 240, 255]); }));
    for (const [x, y] of [[11, 22], [31, 21], [23, 8], [34, 28], [6, 15], [38, 11]]) rock(p, x, y, [80, 96, 170]);
  },
};

// Twist Mountain: the mine's great pit. A ring road round a terraced quarry hole, a plank bridge across it,
// scaffolds, a crane and ore carts.
PLANS.BW1TwistMountain = {
  theme: { density: 0, groves: 0 },
  plan(p) {
    const R = [136, 110, 96], pit = inDisc(24, 21, 11, 6.8), bridge = inRect(12, 20, 36, 21);
    const ok = dig(p, (x, y) => (inDisc(24, 20.5, 20, 15.5)(x, y) && (!pit(x, y) || bridge(x, y))) || nearSeg(24, 36, 24, 33, 2.4)(x, y) || nearSeg(24, 4, 24, 7, 2.4)(x, y), null);
    p.street("deck", 2, [[13, 20], [35, 20]]);
    p.paint(0.2, (c) => {
      // the pit: terraces stepping down into the dark, a spiral track cut into them
      const cx = 24 * T, cy = 21 * T;
      for (let y = 12; y <= 29; y++) for (let x = 12; x <= 36; x++) if (pit(x, y)) c.rect(x * T, y * T, T, T, sh(R, 0.5));
      for (let k = 0; k < 6; k++) { const rx = 11 * T - k * 24, ry = 6.8 * T - k * 14; c.ellipse(cx, cy + k * 5, rx, ry, sh(R, 0.5 - k * 0.07)); c.ellipse(cx, cy + k * 5 + 6, rx - 3, ry - 4, sh(R, 0.9 - k * 0.14)); }
      c.ellipse(cx, cy + 32, 34, 18, [14, 12, 20]);
      for (let a = 0; a < 200; a++) { const an = a * 0.11, f = 1 - a / 230, x = cx + Math.cos(an) * 10.4 * T * f, y = cy + 6 + Math.sin(an) * 6.2 * T * f + (1 - f) * 28; if (a % 2) c.rect(x, y, 3, 2, [96, 76, 66]); }
      // rails round the ring
      for (let a = 0; a < 360; a += 2) { const an = a * Math.PI / 180, x = cx + Math.cos(an) * 14.2 * T, y = cy + Math.sin(an) * 11 * T; if (!ok(Math.floor(x / T), Math.floor(y / T))) continue; c.rect(x - 1, y - 1, 3, 3, [96, 70, 50]); }
      for (const r of [13.95, 14.45]) for (let a = 0; a < 1440; a++) { const an = a * Math.PI / 720, x = cx + Math.cos(an) * r * T, y = cy + Math.sin(an) * (r - 3.2) * T; if (ok(Math.floor(x / T), Math.floor(y / T))) c.p(x, y, [176, 182, 196]); }
    });
    p.paint(0.25, (c) => { const x0 = 13 * T, w = 23 * T, y0 = 20 * T; c.rect(x0, y0 + 2 * T, w, 5, [0, 0, 0, 90]); c.rect(x0, y0, w, 2 * T, [170, 124, 74]); for (let x = x0; x < x0 + w; x += 8) { c.rect(x, y0, 1, 2 * T, [110, 76, 46]); c.rect(x + 3, y0 + 4 + (x % 3) * 7, 2, 1, [130, 92, 56]); } c.rect(x0, y0, w, 2, [206, 164, 110]); c.rect(x0, y0 + 2 * T - 2, w, 2, [110, 76, 46]); });
    // the face of the terraces behind the bridge and the bridge's rails
    p.paint(22.4, (c, top) => { for (const y of [20 * T - 3, 22 * T - 2]) { top.rect(13 * T, y, 23 * T, 2, [170, 124, 74]); for (let x = 13 * T; x <= 36 * T; x += 16) top.box(x - 1, y - 5, 3, 8, [150, 108, 62], DKW); } });
    // scaffold props, crane, carts, ore
    for (const [x, y] of [[23, 33], [26, 33], [23, 8], [26, 8]]) pillar(p, x, y, [150, 108, 62], 28);
    blk(p, 37, 13, 2, 2); p.paint(15, (c, top) => { const px = 37 * T, py = 13 * T; c.ellipse(px + 16, py + 30, 18, 4, [0, 0, 0, 70]); c.box(px + 2, py + 6, 28, 24, [240, 190, 50], INK); c.box(px + 6, py + 10, 12, 10, [150, 206, 244], INK); for (let k = 0; k < 4; k++) c.ellipse(px + 6 + k * 7, py + 29, 3, 3, INK); top.line(px + 10, py + 6, px - 44, py - 30, INK, 6); top.line(px + 10, py + 6, px - 44, py - 30, [240, 190, 50], 4); top.line(px - 44, py - 30, px - 44, py + 2, [60, 60, 70]); top.box(px - 48, py + 2, 9, 7, [110, 116, 136], INK); });
    for (const [x, y, col] of [[10, 15, [110, 200, 250]], [38, 27, [250, 210, 110]], [16, 31, [200, 200, 210]], [30, 9, [130, 230, 160]]]) { blk(p, x, y); p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 14, 8, 2, [0, 0, 0, 80]); c.box(px + 1, py + 2, 14, 10, [110, 80, 60], INK); c.rect(px + 2, py + 3, 12, 2, [150, 116, 86]); c.ellipse(px + 4, py + 13, 2, 2, INK); c.ellipse(px + 12, py + 13, 2, 2, INK); c.ellipse(px + 8, py + 2, 6, 4, col); c.ellipse(px + 6, py, 2, 1, mix(col, WHITE, 0.5)); }); }
    for (const [x, y] of [[7, 20], [41, 21], [14, 9], [34, 32], [12, 30], [35, 9], [8, 26], [40, 15], [18, 6], [30, 34]]) rock(p, x, y, R);
    for (const [x, y, col] of [[6, 16, [110, 200, 250]], [42, 25, [250, 130, 200]], [20, 34, [130, 230, 160]], [29, 6, [250, 220, 110]]]) crystal(p, x, y, col);
    for (const [x, y] of [[11, 12], [37, 30], [9, 22]]) crate(p, x, y);
  },
};

// Dragonspiral Tower: the round ground floor. A ring of broken columns, a moat about the central stair, rubble
// from the storeys above.
PLANS.BW1DragonspiralTower = {
  theme: { density: 0, groves: 0, ground: "ruinFloor", road: "ruinFloor", grass: "ruinFloor" },
  plan(p) {
    const ST = [170, 164, 186], cx = 24 * T, cy = 20 * T;
    const ok = dig(p, anyOf([inDisc(24, 20, 17.5, 15.5), nearSeg(3, 20.5, 9, 20.5, 1.6)]), [130, 124, 150]);
    p.disc("water", 24, 20, 8.6, 7); p.disc("ground", 24, 20, 5.4, 4.2);
    for (const pts of [[[24, 11], [24, 17]], [[24, 23], [24, 29]], [[13, 20], [20, 20]], [[28, 20], [35, 20]]]) p.street("ruinFloor", 2, pts);
    p.paint(0.2, (c) => {
      // rings and spokes set in the floor
      for (const [rx, ry] of [[16.6 * T, 14.6 * T], [12.6 * T, 11 * T]]) c.ellipse(cx, cy, rx, ry, [110, 104, 136, 170], 3);
      for (let a = 0; a < 16; a++) { const an = a * 0.3927 + 0.196; c.line(cx + Math.cos(an) * 9.4 * T, cy + Math.sin(an) * 7.8 * T, cx + Math.cos(an) * 16.4 * T, cy + Math.sin(an) * 14.4 * T, [110, 104, 136, 150]); }
      // the central stair, spiralling up
      c.ellipse(cx, cy + 3, 60, 46, [80, 74, 106]); c.ellipse(cx, cy, 58, 44, [200, 196, 214]); for (let a = 0; a < 12; a++) { const an = 2 + a * 0.5; c.poly([[cx, cy], [cx + Math.cos(an) * 56, cy + Math.sin(an) * 42], [cx + Math.cos(an + 0.48) * 56, cy + Math.sin(an + 0.48) * 42]], sh([214, 210, 226], 1.05 - a * 0.065)); } c.ellipse(cx, cy, 58, 44, [110, 104, 136], 2);
      // moss and cracks
      for (let i = 0; i < 60; i++) { const x = (7 + p.hash(i, 1, 4) * 34) * T, y = (5 + p.hash(i, 2, 4) * 30) * T; if (!inDisc(24, 20, 16.5, 14.5)(x / T - 0.5, y / T - 0.5) || inDisc(24, 20, 9.4, 7.8)(x / T - 0.5, y / T - 0.5)) continue; if (i % 3) { c.line(x, y, x + 6, y + 3, [96, 90, 120]); c.line(x + 6, y + 3, x + 8, y + 8, [96, 90, 120]); } else c.ellipse(x, y, 5, 3, [96, 150, 110, 150]); }
    });
    blk(p, 22, 18, 5, 4);
    p.paint(22.2, (c, top) => { top.ellipse(cx, cy - 44, 16, 10, [110, 104, 136]); top.ellipse(cx, cy - 46, 15, 9, ST); c.box(cx - 9, cy - 44, 18, 54, ST, [80, 74, 106]); top.box(cx - 9, cy - 44, 18, 30, ST, [80, 74, 106]); top.rect(cx - 6, cy - 43, 4, 28, mix(ST, WHITE, 0.5)); c.rect(cx - 6, cy - 14, 4, 22, mix(ST, WHITE, 0.5)); });
    for (let a = 0; a < 12; a++) { const an = a * 0.5236 + 0.26, x = Math.round(24 + Math.cos(an) * 12.4 - 0.5), y = Math.round(20 + Math.sin(an) * 10.6 - 0.5); if (a % 4 === 2) rock(p, x, y, ST); else pillar(p, x, y, ST, a % 3 ? 34 : 18); }
    for (const [x, y] of [[12, 12], [35, 11], [11, 28], [37, 28], [18, 32], [30, 7], [8, 17], [40, 23]]) rock(p, x, y, [150, 144, 170]);
    for (const [x, y] of [[9, 19], [9, 22]]) torch(p, x, y, [120, 200, 250], [110, 104, 136]);
  },
};

// Victory Road: the last climb. Rock terraces one above another, joined by stairs cut at their ends, and a side
// cavern near the top.
PLANS.BW1VictoryRoad = {
  theme: { density: 0, groves: 0 },
  plan(p) {
    const R = [150, 116, 90], bands = [[7, 30, 41, 33], [7, 23, 41, 26], [7, 16, 41, 19], [7, 9, 30, 12]], steps = [[38, 27, 40, 29], [8, 20, 10, 22], [38, 13, 40, 15]];
    const ok = dig(p, anyOf([...bands.map((r) => inRect(...r)), ...steps.map((r) => inRect(...r)), inRect(22, 34, 26, 37), inRect(22, 3, 26, 8), inDisc(37, 6.5, 5.5, 3.6), inRect(36, 9, 38, 15), inRect(30, 9, 36, 10), inRect(3, 23, 7, 26), inDisc(4.5, 30, 2.6, 3.6), inRect(41, 16, 44, 19), inDisc(43.5, 12, 2.4, 3.6)]), R);
    p.paint(0.2, (c) => {
      // stairs on the links between terraces and at the two mouths
      for (const [x0, y0, x1, y1] of [...steps, [22, 34, 26, 34], [22, 7, 26, 8]]) for (let y = y0 * T; y < (y1 + 1) * T; y += 4) { c.rect(x0 * T + 2, y, (x1 - x0 + 1) * T - 4, 3, [176, 144, 116]); c.rect(x0 * T + 2, y + 3, (x1 - x0 + 1) * T - 4, 1, [96, 72, 58]); }
      // each terrace's worn track
      for (const [x0, y0, x1] of bands) for (let x = x0 * T + 6; x < (x1 + 1) * T - 8; x += 10) if (p.hash(x, y0, 3) < 0.6) c.ellipse(x, (y0 + 2) * T + (p.hash(x, y0, 4) - 0.5) * 20, 4, 2, [120, 92, 72, 130]);
      const cx = 37 * T, cy = 6.5 * T; c.ellipse(cx, cy, 52, 32, [110, 84, 66]); c.ellipse(cx, cy, 46, 28, [176, 150, 124]); c.ellipse(cx, cy, 46, 28, [226, 206, 170], 2);
    });
    for (const [x, y] of [[12, 30], [20, 33], [30, 30], [34, 33], [14, 23], [26, 26], [33, 23], [12, 19], [22, 16], [31, 19], [36, 16], [10, 9], [18, 12], [27, 9], [5, 25], [43, 18]]) rock(p, x, y, R);
    for (const [x, y] of [[16, 31], [36, 31], [18, 25], [29, 24], [16, 17], [27, 18], [14, 11], [23, 10]]) p.decor("boulder", x - 1, y - 2, { });
    for (const [x, y] of [[8, 33], [41, 30], [41, 23], [7, 16], [8, 12], [33, 5], [41, 5], [4, 32], [43, 10]]) spire(p, x, y, R, 30);
    for (const [x, y] of [[21, 35], [27, 35], [21, 5], [27, 5]]) torch(p, x, y);
  },
};

// Giant Chasm: the crater. A snow-bound hollow ringed by pines round a frozen pond, ice spikes everywhere, and the
// cave of the ice dragon above it.
PLANS.BW1GiantChasm = {
  theme: { density: 0, groves: 0, ground: "snow", road: "snow", grass: "snow" },
  plan(p) {
    const I = [150, 200, 240];
    const ok = dig(p, anyOf([inDisc(24.5, 22, 19, 13.5), nearSeg(3, 20.5, 8, 20.5, 1.8), nearSeg(33, 11, 36, 7, 2.4), inDisc(36.5, 6, 6, 3.4)]), [130, 150, 190]);
    const pines = [[9, 14], [11, 12], [14, 10], [38, 14], [40, 17], [41, 27], [38, 30], [34, 33], [10, 30], [13, 32], [17, 34], [7, 26], [20, 9], [27, 9], [29, 34], [24, 34]];
    for (const [x, y] of pines) if (ok(x, y) && ok(x + 1, y)) p.fill("pine", x, y, x + 1, y);
    p.disc("water", 24.5, 22, 7.5, 5); p.disc("drift", 24.5, 22, 10, 7);
    p.paint(0.2, (c) => {
      // the pond is frozen: floes, cracks and a glare of light
      const cx = 24.5 * T, cy = 22 * T; c.ellipse(cx, cy, 7.2 * T, 4.7 * T, [190, 230, 250, 215]); c.ellipse(cx - 20, cy - 12, 60, 30, [226, 244, 255, 150]);
      for (let i = 0; i < 14; i++) { const a = p.hash(i, 1, 6) * 6.28, r = p.hash(i, 2, 6) * 0.8, x = cx + Math.cos(a) * 7 * T * r, y = cy + Math.sin(a) * 4.4 * T * r; c.line(x, y, x + 10, y + 4, [130, 190, 230]); c.line(x + 10, y + 4, x + 13, y + 11, [130, 190, 230]); c.line(x - 4, y + 6, x + 4, y + 2, WHITE); }
      c.ellipse(cx, cy, 7.2 * T, 4.7 * T, [120, 180, 226], 2);
      // the dragon's lair: a ring of rime
      const kx = 36.5 * T, ky = 6.5 * T; c.ellipse(kx, ky, 56, 30, [150, 200, 240, 200]); c.ellipse(kx, ky, 46, 24, [214, 240, 255, 220]); c.ellipse(kx, ky, 46, 24, WHITE, 2);
      for (let i = 0; i < 90; i++) { const x = (6 + p.hash(i, 3, 6) * 37) * T, y = (9 + p.hash(i, 4, 6) * 26) * T; if (ok(Math.floor(x / T), Math.floor(y / T))) { c.p(x, y, [170, 200, 236]); c.p(x + 1, y, [170, 200, 236]); } }
    });
    for (const [x, y] of [[15, 18], [34, 19], [18, 28], [32, 28], [12, 24], [37, 23], [22, 13], [28, 30], [32, 4], [41, 5], [30, 14], [16, 14]]) crystal(p, x, y, I, 1.2);
    for (const [x, y] of [[13, 21], [36, 26], [21, 30], [29, 13], [10, 18], [39, 21], [34, 9]]) rock(p, x, y, [190, 214, 240]);
    for (const [x, y] of [[17, 22], [32, 23], [25, 15], [24, 29]]) spire(p, x, y, [170, 214, 246], 30);
  },
};

// Mistralton Cave: dark galleries of blue-grey rock, boulders to shove aside, and the Guidance Chamber at the end.
PLANS.BW1MistraltonCave = {
  theme: { density: 0, groves: 0 },
  plan(p) {
    const R = [96, 110, 140];
    const ok = dig(p, anyOf([inDisc(7, 20.5, 5, 3.6), nearSeg(7, 20, 10, 12.5, 2.3), inDisc(11, 11.5, 6, 4.2), nearSeg(11, 11.5, 23, 11.5, 2.3), inDisc(24, 11.5, 5.5, 4.2), nearSeg(24, 11, 33, 7.5, 2.1), inDisc(36.5, 6.5, 6, 3.8), nearSeg(8, 22, 19, 29, 2.4), inDisc(22, 30.5, 9.5, 5.4), nearSeg(24, 14, 24, 26, 2.1), nearSeg(30, 30, 39, 24, 2.3), inDisc(40, 22, 4.4, 4.8)]), [70, 84, 116]);
    p.disc("water", 20, 31.5, 4.5, 2.4); p.disc("water", 40.5, 20.5, 2, 1.8);
    wash(p, ok, [20, 30, 80, 96]);
    p.paint(0.3, (c) => { const cx = 36.5 * T, cy = 6.5 * T; c.ellipse(cx, cy, 60, 36, [60, 70, 110]); c.ellipse(cx, cy, 54, 32, [120, 136, 176]); c.ellipse(cx, cy, 54, 32, [200, 214, 240], 2); c.ellipse(cx, cy, 30, 17, [90, 104, 150]); for (let a = 0; a < 8; a++) c.line(cx + Math.cos(a * 0.785) * 30, cy + Math.sin(a * 0.785) * 17, cx + Math.cos(a * 0.785) * 52, cy + Math.sin(a * 0.785) * 30, [200, 214, 240]); glow(c, cx, cy, 70, [150, 190, 255], 18); });
    for (const [x, y] of [[17, 11], [24, 18], [28, 29], [14, 26], [35, 27], [5, 22]]) p.decor("boulder", x, y - 2, { });
    for (const [x, y] of [[6, 10], [15, 8], [20, 14], [28, 13], [16, 32], [28, 33], [39, 26], [32, 4], [41, 4], [12, 23], [26, 23]]) spire(p, x, y, R, 26 + (x % 3) * 4);
    for (const [x, y] of [[7, 13], [21, 9], [27, 27], [18, 28], [37, 21], [10, 19]]) rock(p, x, y, R);
    for (const [x, y] of [[31, 5], [42, 6], [25, 33], [13, 14]]) crystal(p, x, y, [130, 170, 250]);
    for (const [x, y] of [[33, 9], [40, 9]]) torch(p, x, y, [150, 200, 255], [90, 100, 130]);
  },
};

// Challenger's Cave: a plain, deep cave of pools and stalagmites that winds back on itself in the dark.
PLANS.BW1ChallengersCave = {
  theme: { density: 0.02, groves: 0 },
  plan(p) {
    const R = [124, 100, 90];
    const ok = dig(p, anyOf([inDisc(7, 20.5, 5, 3.6), nearSeg(7, 20, 18, 13, 2.5), inDisc(20, 11.5, 7.5, 5.2), nearSeg(20, 12, 33, 16, 2.5), inDisc(35.5, 18, 7.5, 6.2), nearSeg(35, 18, 30, 30, 2.4), inDisc(28, 31.5, 8.5, 4.6), nearSeg(22, 31, 10, 30, 2.3), inDisc(9, 30, 5.5, 4.2), nearSeg(27, 9, 36, 5.5, 2), inDisc(38.5, 5.5, 4.5, 2.8)]), [100, 78, 70]);
    p.disc("water", 20, 10.5, 3.6, 2); p.disc("water", 37, 19.5, 3.4, 2.6); p.disc("water", 27, 32.5, 4, 1.8); p.disc("water", 8, 31, 2.2, 1.6);
    wash(p, ok, [20, 14, 40, 84]);
    for (const [x, y] of [[14, 9], [25, 14], [16, 15], [31, 14], [40, 14], [31, 22], [33, 27], [22, 29], [34, 33], [6, 27], [12, 33], [4, 18], [10, 23], [36, 3], [42, 6]]) spire(p, x, y, R, 26 + (y % 3) * 5);
    for (const [x, y] of [[23, 8], [12, 16], [29, 18], [39, 23], [24, 34], [14, 28], [5, 22], [33, 6]]) rock(p, x, y, R);
    for (const [x, y] of [[26, 11], [32, 30], [6, 32]]) p.decor("boulder", x, y - 2, { });
    for (const [x, y] of [[41, 17], [18, 7], [20, 33]]) crystal(p, x, y, [250, 210, 120]);
  },
};

for (const n of Object.keys(PLANS)) if (/Gym$/.test(n)) { const f = PLANS[n].plan; PLANS[n].plan = (p) => { f(p); doorstep(p); }; }
module.exports = PLANS;
