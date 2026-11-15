// Paldea routes and wild areas, drawn by hand. See README.md.
// Nearly every map here shares one frame: 34x32, the way in at 17,28, the way on at 17,3, someone waiting near
// 17,13 and an opening in the middle of each edge. What differs is everything laid out between them.
"use strict";
const T = 16, EDGE = [56, 44, 48], WHITE = [246, 242, 232];
const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f].map((v) => Math.max(0, Math.min(255, Math.round(v))));

// ---------------------------------------------------------------- props
function prop(p, x, y, w, h, draw) { p.block(x, y, w, h); p.paint(y + h, (c, top) => draw(c, x * T, y * T, top)); }
function decal(p, draw, z) { p.paint(z || 0, draw); }
function arch(c, cx, by, rx, ry, col) { for (let y = -ry; y < 0; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); c.rect(cx - w, by + y, w * 2, 1, col); } }
function star(c, cx, cy, r, col) { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.42 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } c.poly(pts, col); }
function fence(p, x0, y0, x1, y1, col) {
  const post = col || [150, 116, 80]; p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x * T, py = y * T; if (x1 > x0) { c.rect(px, py + 5, 16, 2, post); c.rect(px, py + 10, 16, 2, mul(post, 0.8)); c.rect(px + 6, py + 2, 3, 13, mul(post, 0.65)); } else { c.rect(px + 6, py, 3, 16, post); c.rect(px + 4, py + 3, 7, 2, mul(post, 0.65)); c.rect(px + 4, py + 11, 7, 2, mul(post, 0.65)); } } });
}
// Flights of steps painted over walkable ground.
const steps = (p, x, y, w, h, col) => decal(p, (c) => { const s = col || [222, 214, 196]; for (let j = 0; j < h * T; j += 4) { c.rect(x * T, y * T + j, w * T, 3, s); c.rect(x * T, y * T + j + 3, w * T, 1, mul(s, 0.7)); } c.rect(x * T, y * T, 1, h * T, mul(s, 0.6)); c.rect((x + w) * T - 1, y * T, 1, h * T, mul(s, 0.6)); }, 0.3);
// A ledge of rock from x0 to x1 on rows y..y+h-1, left open at each gap column (a stair of `gw` tiles).
function ledge(p, kind, x0, x1, y, h, gaps, gw, stepCol) {
  p.fill(kind, x0, y, x1, y + h - 1);
  for (const g of gaps || []) { p.fill("ground", g, y, g + (gw || 2) - 1, y + h - 1); steps(p, g, y, gw || 2, h, stepCol); }
}
// A tree with a round crown on one tile (olive, apple, orchard trees).
const olive = (p, x, y, fruit, leaf) => prop(p, x, y, 1, 1, (c, px, py, top) => { const g = leaf || [128, 152, 110]; c.ellipse(px + 8, py + 14, 6, 2, [0, 0, 0, 50]); c.rect(px + 6, py + 5, 4, 10, [112, 86, 60]); top.ellipse(px + 8, py, 10, 9, mul(g, 0.6)); top.ellipse(px + 7, py - 1, 8, 7, g); top.ellipse(px + 5, py - 3, 4, 3, mul(g, 1.2)); if (fruit) for (const [a, b] of [[3, 1], [11, -3], [8, 4], [6, -5]]) top.rect(px + a, py + b, 2, 2, fruit); });
const palm = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 6, 2, [0, 0, 0, 50]); c.rect(px + 6, py, 4, 15, [150, 116, 76]); top.rect(px + 6, py - 14, 4, 14, [150, 116, 76]); for (let k = 0; k < 4; k++) top.rect(px + 6, py - 12 + k * 6, 4, 1, [110, 84, 56]); for (const [dx, dy] of [[-12, -4], [12, -4], [-9, -12], [9, -12], [0, -14]]) { top.line(px + 8, py - 15, px + 8 + dx, py - 15 + dy + 8, [40, 110, 60], 3); top.line(px + 8, py - 16, px + 8 + dx, py - 16 + dy + 7, [80, 170, 90], 1); } top.ellipse(px + 6, py - 13, 2, 2, [130, 90, 50]); top.ellipse(px + 11, py - 13, 2, 2, [130, 90, 50]); });
const cactus = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { const g = [86, 150, 90], d = [54, 108, 66]; c.ellipse(px + 8, py + 14, 6, 2, [0, 0, 0, 50]); for (const t of [c, top]) { t.box(px + 5, py - 8, 6, 23, g, d); t.box(px + 1, py - 1, 3, 8, g, d); t.rect(px + 3, py + 5, 3, 3, g); t.box(px + 12, py - 5, 3, 8, g, d); t.rect(px + 10, py + 1, 3, 3, g); t.rect(px + 7, py - 6, 1, 19, mul(g, 1.25)); } top.rect(px + 6, py - 10, 4, 3, [240, 120, 150]); });
const crystal = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 7, 2, [0, 0, 0, 50]); for (const t of [c, top]) { t.poly([[px + 8, py - 12], [px + 14, py + 3], [px + 11, py + 14], [px + 5, py + 14], [px + 2, py + 3]], mul(col, 0.7)); t.poly([[px + 8, py - 10], [px + 12, py + 3], [px + 8, py + 13], [px + 4, py + 3]], col); t.poly([[px + 8, py - 10], [px + 8, py + 13], [px + 4, py + 3]], mul(col, 1.25)); } c.poly([[px + 13, py + 4], [px + 16, py + 10], [px + 13, py + 15], [px + 11, py + 10]], mul(col, 1.1)); });
const stoneLantern = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 4, py + 10, 8, 6, [150, 150, 146], EDGE); c.rect(px + 6, py + 2, 4, 8, [170, 170, 166]); top.box(px + 3, py - 6, 10, 8, [170, 170, 166], EDGE); top.rect(px + 6, py - 4, 4, 4, [250, 220, 120]); top.poly([[px + 1, py - 6], [px + 8, py - 12], [px + 15, py - 6]], [120, 120, 118]); });
// Team Star's tents are white tarpaulin boxes sprayed with yellow zigzags; the crew colour is on the star.
const tent = (p, x, y, col) => prop(p, x, y, 3, 2, (c, px, py) => { const w = [236, 238, 240], ylw = [226, 206, 84]; c.rect(px + 2, py + 29, 46, 4, [0, 0, 0, 50]); c.box(px + 1, py + 2, 46, 29, w, EDGE); c.poly([[px, py + 3], [px + 6, py - 6], [px + 42, py - 6], [px + 48, py + 3]], EDGE); c.poly([[px + 2, py + 2], [px + 7, py - 4], [px + 41, py - 4], [px + 46, py + 2]], [250, 250, 252]); for (let k = 0; k < 7; k++) c.line(px + 3 + k * 6, py + (k % 2 ? 12 : 18), px + 9 + k * 6, py + (k % 2 ? 18 : 12), ylw, 2); c.rect(px + 2, py + 24, 44, 2, [200, 204, 210]); star(c, px + 24, py + 21, 6, col); });
const flag = (p, x, y, col, mark) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.rect(px + 5, py + 12, 6, 3, [60, 54, 60]); c.rect(px + 7, py, 2, 13, [110, 100, 100]); top.rect(px + 7, py - 28, 2, 28, [110, 100, 100]); top.poly([[px + 9, py - 28], [px + 27, py - 21], [px + 9, py - 13]], col); star(top, px + 14, py - 21, 4, mark || [250, 230, 90]); });
const lamp = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.rect(px + 5, py + 12, 6, 3, [60, 60, 70]); c.rect(px + 7, py, 2, 13, [80, 80, 92]); top.rect(px + 7, py - 12, 2, 12, [80, 80, 92]); top.ellipse(px + 8, py - 13, 8, 8, [col[0], col[1], col[2], 70]); top.ellipse(px + 8, py - 13, 4, 4, col); top.ellipse(px + 7, py - 14, 2, 2, WHITE); });
// A Paldean watchtower: a round stone tower with a parapet (2x2 footprint, drawn tall).
const watchtower = (p, x, y) => prop(p, x, y, 2, 2, (c, px, py, top) => { const s = [206, 196, 176], d = [150, 140, 124]; c.ellipse(px + 16, py + 30, 15, 3, [0, 0, 0, 60]); for (const t of [c, top]) { t.box(px + 3, py - 30, 26, 60, s, EDGE); t.rect(px + 21, py - 29, 7, 58, d); for (let k = 0; k < 6; k++) t.rect(px + 5 + (k % 2) * 9, py - 22 + k * 9, 6, 2, d); t.box(px + 12, py - 16, 6, 9, [40, 36, 44], EDGE); t.box(px, py - 38, 32, 9, s, EDGE); for (let k = 0; k < 4; k++) t.box(px + k * 9, py - 44, 5, 7, s, EDGE); } c.box(px + 11, py + 16, 10, 14, [96, 70, 50], EDGE); });
// A windmill: a white tower with four sails (2x2 footprint).
const windmill = (p, x, y) => prop(p, x, y, 2, 2, (c, px, py, top) => { c.ellipse(px + 16, py + 30, 14, 3, [0, 0, 0, 60]); for (const t of [c, top]) { t.poly([[px + 4, py + 31], [px + 9, py - 22], [px + 23, py - 22], [px + 28, py + 31]], EDGE); t.poly([[px + 6, py + 30], [px + 10, py - 20], [px + 22, py - 20], [px + 26, py + 30]], WHITE); t.poly([[px + 19, py - 20], [px + 22, py - 20], [px + 26, py + 30], [px + 21, py + 30]], [206, 200, 190]); t.poly([[px + 7, py - 21], [px + 16, py - 34], [px + 25, py - 21]], [190, 96, 70]); } c.box(px + 12, py + 18, 8, 12, [110, 80, 56], EDGE); const cx = px + 16, cy = py - 22; for (const [dx, dy] of [[20, 14], [-20, -14], [14, -20], [-14, 20]]) { top.line(cx, cy, cx + dx, cy + dy, [120, 96, 70], 2); top.line(cx + dx * 0.35 - dy * 0.14, cy + dy * 0.35 + dx * 0.14, cx + dx - dy * 0.14, cy + dy + dx * 0.14, [236, 226, 200], 4); } top.ellipse(cx, cy, 3, 3, EDGE); });
// A round boulder that looks as if it could roll.
const roller = (p, x, y) => prop(p, x, y, 2, 2, (c, px, py) => { c.ellipse(px + 17, py + 28, 14, 4, [0, 0, 0, 60]); c.ellipse(px + 16, py + 15, 15, 15, EDGE); c.ellipse(px + 16, py + 15, 14, 14, [150, 140, 130]); c.ellipse(px + 12, py + 10, 8, 7, [178, 168, 156]); c.line(px + 10, py + 20, px + 22, py + 24, [110, 100, 96], 1); c.line(px + 20, py + 6, px + 26, py + 14, [110, 100, 96], 1); });
// A cave mouth painted on a cliff face.
const cave = (p, x, y, w, h) => decal(p, (c) => { const cx = x * T + w * 8, by = (y + h) * T; arch(c, cx, by, w * 8, h * T, [84, 74, 70]); arch(c, cx, by, w * 8 - 4, h * T - 4, [26, 22, 30]); arch(c, cx, by, w * 8 - 12, h * T - 14, [12, 10, 16]); }, y + h + 0.5);
const falls = (p, x0, x1, y, h) => decal(p, (c) => { const px = x0 * T, W = (x1 - x0 + 1) * T, py = y * T, H = (h || 1) * T; c.rect(px, py, W, H, [150, 200, 236]); for (let x = px + 1; x < px + W; x += 4) c.rect(x, py + 2 + (x % 3), 2, H - 4, [226, 240, 250]); c.rect(px, py, W, 3, [196, 190, 178]); c.rect(px, py + H - 3, W, 3, WHITE); }, 0.5);
const boat = (p, x, y, hull) => p.paint(y + 3, (c) => { const px = x * T, py = y * T; c.poly([[px, py + 6], [px + 40, py + 6], [px + 34, py + 22], [px + 6, py + 22]], [60, 50, 50]); c.poly([[px + 2, py + 7], [px + 38, py + 7], [px + 33, py + 20], [px + 7, py + 20]], hull); c.box(px + 12, py - 2, 14, 10, [236, 236, 240], [80, 80, 96]); c.rect(px + 15, py + 1, 8, 3, [120, 180, 230]); });
// The usual spurs to the east and west openings.
const spurs = (p, kind, w, xw, xe, y) => { if (xw != null) p.street(kind, w || 1, [[1, y || 16], [xw, y || 16]]); if (xe != null) p.street(kind, w || 1, [[xe, y || 16], [32, y || 16]]); };

// A river (or any band of `kind`) `w` tiles wide through the points.
function river(p, w, pts, kind) { for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1); for (let t = 0; t <= n; t++) { const x = Math.round(ax + (bx - ax) * t / n), y = Math.round(ay + (by - ay) * t / n); p.fill(kind || "water", x, y, x + w - 1, y + w - 1); } } }
// Strata painted across a cliff face (tiles x0..x1, y0..y1).
const strata = (p, x0, y0, x1, y1, col) => decal(p, (c) => { for (let y = y0 * T + 5; y < (y1 + 1) * T - 2; y += 7) for (let x = x0 * T + ((y * 5) % 11); x < (x1 + 1) * T - 12; x += 23 + (y % 9)) c.rect(x, y, 12 + ((x + y) % 9), 1, col || [120, 104, 92, 170]); }, y1 + 0.9);

// A sheer cliff face painted over rock tiles x0..x1, y0..y1: banded stone with a lit lip and a shadowed foot.
const face = (p, x0, y0, x1, y1, col) => decal(p, (c) => { const b = col || [150, 128, 110], px = x0 * T, py = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(px, py, W, H, b); c.rect(px, py, W, 3, mul(b, 1.3)); c.rect(px, py + H - 4, W, 4, mul(b, 0.62)); for (let y = py + 6; y < py + H - 5; y += 5) for (let x = px + ((y * 7) % 13); x < px + W - 6; x += 17 + (y % 7)) c.rect(x, y, Math.min(11 + ((x + y) % 8), px + W - x), 1, mul(b, 0.75)); for (let x = px + 9; x < px + W - 2; x += 29) c.rect(x, py + 3 + (x % 5), 1, H - 9, mul(b, 0.82)); }, y1 + 0.95);
// A slalom gate: two poles with pennants either side of a run.
const skiGate = (p, x, y, col, gap) => { for (const gx of [x, x + (gap || 2)]) prop(p, gx, y, 1, 1, (c, px, py, top) => { c.rect(px + 7, py + 2, 2, 13, [90, 90, 100]); top.rect(px + 7, py - 12, 2, 14, [90, 90, 100]); top.poly([[px + 9, py - 12], [px + 17, py - 8], [px + 9, py - 4]], col); c.ellipse(px + 8, py + 14, 4, 1, [0, 0, 0, 50]); }); };
// A pool of something that glows (lava, by default): solid.
const pool = (p, x, y, w, h, col) => prop(p, x, y, w, h, (c, px, py) => { const l = col || [244, 120, 40], cx = px + w * 8, cy = py + h * 8; c.ellipse(cx, cy, w * 8, h * 8, [60, 40, 40]); c.ellipse(cx, cy, w * 8 - 2, h * 8 - 2, l); c.ellipse(cx - 3, cy - 1, w * 8 - 8, h * 8 - 6, mul(l, 1.15)); for (let k = 0; k < w * 2; k++) c.rect(px + 5 + ((k * 13) % (w * 16 - 12)), cy - 3 + ((k * 7) % 7), 3, 1, [255, 236, 150]); });
// Rows of a crop painted over a tilled plot (the plot stays walkable).
function crops(p, x0, y0, x1, y1, col) { p.fill("field", x0, y0, x1, y1); decal(p, (c) => { const g = col || [96, 160, 84]; for (let y = y0 * T + 3; y < (y1 + 1) * T - 2; y += 6) { c.rect(x0 * T + 1, y + 3, (x1 - x0 + 1) * T - 2, 1, [150, 122, 84]); for (let x = x0 * T + 2 + ((y / 6) & 1) * 3; x < (x1 + 1) * T - 3; x += 6) { c.rect(x, y, 3, 3, g); c.rect(x + 1, y - 1, 1, 1, mul(g, 1.3)); } } }, 0.3); }
const bale = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py) => { c.ellipse(px + 8, py + 13, 7, 2, [0, 0, 0, 50]); c.ellipse(px + 8, py + 7, 7, 7, [150, 120, 60]); c.ellipse(px + 8, py + 7, 6, 6, [226, 196, 110]); c.ellipse(px + 8, py + 7, 3, 3, [196, 164, 86], 1); });
const dummy = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 5, 2, [0, 0, 0, 50]); c.rect(px + 7, py + 2, 2, 12, [120, 90, 60]); for (const t of [c, top]) { t.box(px + 3, py - 8, 10, 12, [214, 186, 130], EDGE); t.rect(px, py - 5, 16, 2, [120, 90, 60]); t.ellipse(px + 8, py - 12, 4, 4, EDGE); t.ellipse(px + 8, py - 12, 3, 3, [214, 186, 130]); t.rect(px + 4, py - 3, 8, 2, [220, 120, 50]); } });
const pylon = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { const s = [110, 114, 126]; c.rect(px + 5, py + 12, 6, 3, [70, 70, 80]); c.rect(px + 7, py, 2, 13, s); top.rect(px + 7, py - 30, 2, 30, s); top.rect(px - 2, py - 26, 20, 2, s); top.rect(px + 1, py - 18, 14, 2, s); for (const dx of [-2, 16, 1, 13]) top.rect(px + dx, py - 25 + (dx === 1 || dx === 13 ? 8 : 0), 2, 3, [220, 230, 240]); top.poly([[px + 9, py - 12], [px + 5, py - 5], [px + 8, py - 5], [px + 6, py + 1], [px + 12, py - 7], [px + 9, py - 7]], [250, 220, 60]); });
// A gate of two posts and a beam across a path three tiles wide (posts at x and x + 4).
const torii = (p, x, y, col) => { for (const gx of [x, x + 4]) prop(p, gx, y, 1, 1, (c, px, py, top) => { c.box(px + 5, py - 2, 6, 17, col, EDGE); top.box(px + 5, py - 26, 6, 24, col, EDGE); }); p.paint(y + 1.1, (c, top) => { top.box(x * T - 4, y * T - 30, 5 * T + 8, 6, mul(col, 0.8), EDGE); top.box(x * T + 2, y * T - 20, 5 * T - 4, 4, col, EDGE); }); };
// A Team Star picket across the road at row y: scrap fence either side of a three-tile gap at cx, and two crew flags.
function picket(p, cx, y, col, l, r) { const scrap = [120, 110, 110]; fence(p, cx - 1 - (l || 3), y, cx - 2, y, scrap); fence(p, cx + 2, y, cx + 1 + (r || 3), y, scrap); flag(p, cx - 2, y - 1, col); flag(p, cx + 2, y - 1, col); }

// Mine rails along axis-aligned points (painted; walkable).
const rails = (p, pts) => decal(p, (c) => { for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4, h = ay === by; for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (h) c.rect(x - 1, y - 5, 2, 10, [110, 84, 60]); else c.rect(x - 5, y - 1, 10, 2, [110, 84, 60]); } const x0 = Math.min(ax, bx) * T + 8, y0 = Math.min(ay, by) * T + 8, L = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * T; for (const o of [-4, 3]) { if (h) c.rect(x0, y0 + o, L, 1, [170, 174, 186]); else c.rect(x0 + o, y0, 1, L, [170, 174, 186]); } } }, 0.35);
const cart = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py) => { c.box(px + 1, py + 3, 14, 9, [120, 110, 120], EDGE); c.rect(px + 2, py + 1, 12, 3, [90, 70, 60]); c.ellipse(px + 5, py + 2, 2, 2, [150, 150, 170]); c.ellipse(px + 10, py + 1, 2, 2, [190, 190, 210]); c.ellipse(px + 4, py + 13, 2, 2, EDGE); c.ellipse(px + 12, py + 13, 2, 2, EDGE); });
// Ruins: a broken stretch of sandstone wall, and a column (whole or snapped).
const ruin = (p, x, y, w, col) => prop(p, x, y, w, 1, (c, px, py, top) => { const s = col || [214, 190, 146]; for (let k = 0; k < w * 2; k++) { const h = 8 + ((k * 7 + x) % 4) * 5, bx = px + k * 8; for (const t of [c, top]) { t.box(bx, py + 16 - h, 8, h, s, EDGE); t.rect(bx + 1, py + 16 - h + 1, 6, 1, mul(s, 1.15)); for (let j = 6; j < h; j += 6) t.rect(bx + 1, py + 16 - j, 6, 1, mul(s, 0.8)); } } });
const column = (p, x, y, snapped, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { const s = col || [222, 204, 168], h = snapped ? 10 : 26; c.box(px + 2, py + 10, 12, 6, mul(s, 0.9), EDGE); for (const t of [c, top]) { t.rect(px + 4, py + 11 - h, 8, h, s); t.rect(px + 9, py + 11 - h, 3, h, mul(s, 0.8)); t.rect(px + 6, py + 11 - h, 1, h, mul(s, 1.12)); if (!snapped) t.box(px + 2, py + 7 - h, 12, 5, mul(s, 0.95), EDGE); else t.poly([[px + 4, py + 11 - h], [px + 8, py + 7 - h], [px + 12, py + 11 - h]], s); } });
// A rock hanging in the air over its shadow (walk-behind; the ground under it stays open).
const floater = (p, x, y, col) => p.paint(y + 1, (c, top) => { const px = x * T, py = y * T, s = col || [130, 124, 136]; c.ellipse(px + 12, py + 12, 11, 4, [0, 0, 0, 60]); top.poly([[px - 2, py - 22], [px + 10, py - 30], [px + 26, py - 24], [px + 22, py - 10], [px + 12, py - 2], [px + 2, py - 10]], EDGE); top.poly([[px, py - 22], [px + 10, py - 28], [px + 24, py - 23], [px + 21, py - 11], [px + 12, py - 4], [px + 3, py - 11]], s); top.poly([[px, py - 22], [px + 10, py - 28], [px + 24, py - 23], [px + 12, py - 19]], mul(s, 1.3)); top.poly([[px + 14, py - 30], [px + 18, py - 38], [px + 21, py - 27]], [120, 220, 230]); });
const TERA = [[120, 220, 230], [230, 150, 230], [250, 220, 120], [150, 240, 170], [240, 140, 130], [150, 170, 250]];

// A flooded rice paddy (solid).
function paddy(p, x0, y0, x1, y1) {
  p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => { const px = x0 * T, py = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.box(px, py, W, H, [150, 122, 84], [96, 76, 56]); c.rect(px + 3, py + 3, W - 6, H - 6, [104, 158, 176]); for (let y = py + 6; y < py + H - 5; y += 5) for (let x = px + 6 + ((y / 5) & 1) * 2; x < px + W - 5; x += 5) { c.rect(x, y, 1, 3, [70, 150, 70]); c.rect(x + 1, y + 1, 1, 2, [130, 200, 100]); } });
}
// A flat-topped savanna tree.
const acacia = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 9, 2, [0, 0, 0, 50]); c.rect(px + 6, py + 2, 4, 13, [120, 90, 60]); top.rect(px + 6, py - 8, 4, 10, [120, 90, 60]); top.line(px + 8, py - 4, px - 2, py - 12, [120, 90, 60], 2); top.line(px + 8, py - 4, px + 18, py - 12, [120, 90, 60], 2); top.ellipse(px + 8, py - 15, 19, 6, [88, 120, 50]); top.ellipse(px + 7, py - 17, 16, 4, [130, 160, 70]); top.ellipse(px + 2, py - 18, 6, 2, [164, 190, 90]); });
const crate = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py) => { c.box(px + 1, py + 3, 14, 12, [176, 136, 90], EDGE); for (const [a, b] of [[3, 2], [7, 1], [11, 2], [5, 5], [9, 5]]) c.ellipse(px + a + 1, py + b + 2, 2, 2, col); });
const umbrella = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 1, py + 9, 14, 6, [240, 236, 220], EDGE); c.rect(px + 7, py, 2, 10, [110, 100, 100]); top.ellipse(px + 8, py - 3, 11, 6, EDGE); top.ellipse(px + 8, py - 3, 10, 5, col); top.rect(px + 2, py - 4, 3, 3, WHITE); top.rect(px + 11, py - 4, 3, 3, WHITE); top.rect(px + 7, py - 8, 2, 3, WHITE); });

// The way into a Terarium trial: two light-posts and a hexagon sign over warp k (which is left bare).
function trialGate(p, k, col) {
  const w = p.warps[k]; p.bare(k);
  for (const gx of [w.x - 2, w.x + 2]) prop(p, gx, w.y - 1, 1, 2, (c, px, py, top) => { for (const t of [c, top]) { t.box(px + 4, py - 14, 8, 45, [176, 184, 200], EDGE); t.rect(px + 6, py - 10, 4, 36, col); t.rect(px + 7, py - 10, 1, 36, mul(col, 1.3)); } });
  p.paint(w.y + 1.2, (c, top) => { const cx = w.x * T + 8, y = (w.y - 1) * T - 20; top.box((w.x - 2) * T + 2, y, 5 * T - 4, 7, [176, 184, 200], EDGE); top.poly([[cx - 9, y + 3], [cx - 5, y - 5], [cx + 5, y - 5], [cx + 9, y + 3], [cx + 5, y + 11], [cx - 5, y + 11]], EDGE); top.poly([[cx - 7, y + 3], [cx - 4, y - 3], [cx + 4, y - 3], [cx + 7, y + 3], [cx + 4, y + 9], [cx - 4, y + 9]], col); c.ellipse(cx, w.y * T + 9, 12, 6, [col[0], col[1], col[2], 110], 2); });
}

module.exports = {
  // Poco Path: the stepped trail from Cabo Poco down the cliffs to the cove. Grassy terraces drop one ledge at a
  // time toward the sea on the east; the lighthouse headland shows across the water.
  PaldeaPocoPath: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "sea", sea: null, density: 0.06, groves: 0.05, flowers: 0.35 },
    plan(p) {
      p.fill("water", 25, 1, 32, 30); p.fill("beach", 22, 1, 24, 13); p.fill("beach", 23, 19, 24, 30); p.fill("beach", 20, 1, 21, 6);
      p.disc("grass", 29.5, 23.5, 3.5, 4);                                             // the lighthouse headland
      ledge(p, "rock", 1, 22, 23, 1, [9], 2); ledge(p, "rock", 1, 21, 19, 1, [19], 2); ledge(p, "rock", 5, 21, 10, 1, [12], 2); ledge(p, "rock", 1, 19, 6, 1, [8], 2);
      p.street("sand", 2, [[17, 29], [17, 26], [9, 26], [9, 21], [19, 21], [19, 16], [12, 16], [12, 8], [8, 8], [8, 4], [17, 4]]);
      p.street("sand", 2, [[17, 1], [17, 4]]); p.street("sand", 1, [[1, 16], [12, 16]]);
      p.street("deck", 1, [[20, 16], [32, 16]]);                                       // the jetty out to the east
      p.street("sand", 1, [[20, 26], [27, 26]]); p.decor("lighthouse", 28, 18);
      fence(p, 12, 22, 17, 22); fence(p, 3, 9, 6, 9);
      boat(p, 26, 9, [200, 60, 60]);
      for (const [x, y] of [[23, 4], [22, 11]]) p.decor("boulder", x, y);
    },
  },
  // Poco Path Lighthouse: the white lighthouse on its headland above the sea, a fenced lookout round it,
  // and the lane climbing on north toward Los Platos.
  PaldeaLighthouse: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "sea", sea: null, density: 0.05, groves: 0.05, flowers: 0.4 },
    plan(p) {
      p.fill("water", 26, 1, 32, 30); p.fill("water", 22, 22, 32, 30); p.fill("beach", 21, 23, 21, 30); p.fill("beach", 22, 21, 25, 21);
      p.fill("rock", 25, 1, 25, 14); p.fill("rock", 25, 18, 25, 20);
      p.disc("meadow", 19.5, 12.5, 5, 4.5); p.fill("flowersRed", 21, 15, 23, 15); p.fill("flowersBlue", 14, 9, 15, 10);
      p.street("sand", 2, [[17, 29], [17, 24], [11, 24], [11, 16], [17, 16], [17, 14]]);
      p.street("sand", 2, [[11, 16], [11, 6], [17, 6], [17, 1]]);
      p.street("sand", 1, [[1, 16], [11, 16]]); p.street("deck", 1, [[18, 16], [32, 16]]);
      p.decor("lighthouse", 20, 6);
      fence(p, 23, 8, 23, 13); fence(p, 14, 20, 19, 20); fence(p, 20, 18, 23, 18);
      p.decor("bench", 15, 12); p.decor("board", 19, 14);
      boat(p, 27, 25, [240, 240, 244]);
      for (const [x, y] of [[23, 24], [29, 4]]) p.decor("boulder", x, y, { walk: false });
    },
  },
  // South Province (Area One): the green hills between Los Platos and Mesagoza. The city's lake lies across the
  // north with the causeway over it to the south gate, a Pokémon Center kiosk stands at the foot of the bridge,
  // a watchtower on the eastern rise and ponds among the olive trees.
  PaldeaSouthProvince: {
    theme: { ground: "grass", road: "dirt", border: "tree", water: "water", density: 0.05, groves: 0.08, flowers: 0.3 },
    plan(p) {
      p.fill("water", 1, 1, 27, 5); p.fill("rock", 1, 6, 17, 6); p.fill("rock", 23, 6, 27, 6);
      p.disc("water", 9.5, 24.5, 3.2, 2.2); p.disc("water", 5, 10.5, 2.2, 1.5);
      p.fill("rock", 28, 9, 36, 9); p.fill("rock", 28, 2, 28, 8); p.fill("ground", 31, 9, 32, 9); steps(p, 31, 9, 2, 1);
      p.fill("meadow", 29, 2, 36, 8);
      p.street("dirt", 3, [[1, 15], [36, 15]]);
      p.street("dirt", 2, [[19, 15], [19, 9], [20, 9], [20, 6]]); p.street("paving", 3, [[20, 1], [20, 6]]); p.street("dirt", 2, [[19, 16], [19, 28]]);
      p.street("dirt", 1, [[31, 14], [31, 6]]);
      watchtower(p, 33, 4);
      p.decor("pcSmall", 22, 9);
      for (const y of [19, 21, 23, 25, 27]) for (const x of [23, 25, 27, 29, 31, 33]) if ((x + y) % 4) olive(p, x, y, [70, 90, 50]);
      for (const [x, y] of [[14, 8], [16, 10], [13, 12], [9, 8], [3, 8], [8, 12], [3, 13]]) olive(p, x, y, [70, 90, 50]);
      fence(p, 22, 18, 34, 18);
      p.fill("flowersRed", 2, 19, 5, 20); p.decor("board", 21, 13);
    },
  },
  // East Province (Area One): windmills turning over the fields below Artazon, flower meadows by the town, the
  // mine cut into the north-east cliff and the crossroads of the four trails on the east side.
  PaldeaEastProvince: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.05, groves: 0.06, flowers: 0.35 },
    plan(p) {
      p.fill("rock", 23, 1, 32, 6); p.fill("gravel", 25, 7, 31, 9);
      p.fill("field", 2, 19, 10, 29); p.fill("flowersRed", 8, 2, 13, 3); p.fill("flowersBlue", 8, 4, 13, 5); p.fill("flowersPink", 20, 2, 21, 5);
      p.disc("dirt", 26, 15.5, 3.5, 2.5);
      p.street("dirt", 2, [[17, 29], [17, 24], [12, 24], [12, 16], [22, 16], [22, 10], [17, 10], [17, 1]]);
      p.street("dirt", 2, [[22, 16], [32, 16]]); p.street("dirt", 1, [[1, 16], [12, 16]]); p.street("gravel", 1, [[28, 13], [28, 7]]);
      cave(p, 27, 4, 3, 3); strata(p, 23, 1, 32, 3);
      windmill(p, 4, 8); windmill(p, 8, 11); windmill(p, 27, 22); windmill(p, 4, 22);
      p.decor("pcSmall", 6, 26); p.decor("barrels", 25, 8); p.decor("barrels", 30, 8);
      fence(p, 2, 18, 10, 18); fence(p, 19, 19, 24, 19);
      for (const [x, y] of [[21, 23], [23, 26], [29, 27]]) olive(p, x, y, [70, 90, 50]);
      p.decor("board", 23, 13);
    },
  },
  // West Province (Area One): green river country below Cascarrafa that dries out northward into the first
  // dunes of the Asado Desert. A plank bridge over the river, mesas either side, cacti in the sand.
  PaldeaWestProvince: {
    theme: { ground: "grass", road: "dirt", border: "rock", water: "water", density: 0.05, groves: 0.05, flowers: 0.15 },
    plan(p) {
      p.fill("desert", 1, 1, 32, 9); p.fill("beach", 1, 10, 32, 11);
      river(p, 2, [[1, 21], [8, 21], [12, 23], [22, 23], [26, 21], [32, 21]]);
      p.fill("rock", 2, 2, 7, 5); p.fill("rock", 24, 2, 31, 4); p.fill("rock", 28, 5, 31, 7); p.fill("rock", 2, 26, 9, 29);
      p.disc("dirt", 25.5, 15, 3.5, 2.5);
      p.street("dirt", 2, [[17, 29], [17, 19], [21, 19], [21, 16], [12, 16], [12, 8]]); p.street("beach", 2, [[12, 8], [12, 6], [17, 6], [17, 1]]);
      p.street("dirt", 2, [[21, 16], [32, 16]]); p.street("dirt", 1, [[1, 16], [12, 16]]);
      strata(p, 2, 2, 7, 4); strata(p, 24, 2, 31, 3);
      for (const [x, y] of [[9, 3], [21, 4], [14, 8], [20, 8], [5, 8], [26, 8], [30, 9]]) cactus(p, x, y);
      watchtower(p, 5, 12); p.decor("pcSmall", 22, 25);
      for (const [x, y] of [[9, 13], [28, 26], [3, 18]]) p.decor("boulder", x, y);
      fence(p, 13, 25, 15, 25); p.decor("board", 22, 13);
    },
  },
  // Stony Cliff: the red badlands wall east of Mesagoza where the Stony Cliff Titan clings. A sheer banded face
  // across the map, the arena of broken stone at its foot, and the ramp round the east end up to the cave behind.
  PaldeaStonyCliff: {
    theme: { ground: "dirt", road: "sand", border: "rock", density: 0.08, groves: 0, flowers: 0 },
    plan(p) {
      const RED = [200, 112, 78];
      p.fill("rock", 1, 6, 25, 11); p.fill("rock", 1, 1, 13, 5); p.fill("rock", 21, 1, 25, 2); p.fill("rock", 30, 1, 32, 12);
      p.fill("rock", 1, 20, 6, 22); p.fill("rock", 24, 21, 32, 23); p.fill("grass", 7, 24, 15, 29); p.fill("grass", 20, 25, 31, 29);
      p.disc("sand", 17.5, 14.5, 6, 3);
      p.street("sand", 2, [[17, 29], [17, 22], [11, 22], [11, 16], [27, 16], [27, 4], [17, 4]]); p.street("sand", 2, [[17, 1], [17, 4]]);
      p.street("sand", 1, [[1, 16], [11, 16]]); p.street("sand", 1, [[27, 16], [32, 16]]);
      face(p, 1, 6, 25, 11, RED); face(p, 1, 1, 13, 5, mul(RED, 1.08)); face(p, 30, 1, 32, 12, RED); face(p, 1, 20, 6, 22, RED); face(p, 24, 21, 32, 23, RED); strata(p, 1, 1, 13, 5, [140, 70, 50, 170]);
      decal(p, (c) => { for (const [x, y, r] of [[9, 12.6, 5], [13, 13.2, 4], [22, 12.7, 5], [24, 14.2, 3], [12, 15.2, 3]]) { c.ellipse(x * T, y * T, r + 1, r, EDGE); c.ellipse(x * T, y * T, r, r - 1, [206, 130, 96]); } }, 0.4);
      watchtower(p, 3, 25);
      for (const [x, y] of [[7, 13], [22, 18], [14, 19], [28, 26]]) p.decor("boulder", x, y);
      fence(p, 28, 6, 28, 12, [120, 110, 110]); p.decor("board", 19, 18);
    },
  },
  // Open Sky Trail: switchbacks up the mountain, one ledge after another, with the boulders the Titan rolls
  // down waiting on every slope.
  PaldeaOpenSkyTrail: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.04, groves: 0, flowers: 0.05 },
    plan(p) {
      ledge(p, "rock", 1, 32, 24, 1, [27], 2); ledge(p, "rock", 1, 32, 19, 1, [5], 2); ledge(p, "rock", 1, 32, 12, 1, [27], 2); ledge(p, "rock", 1, 32, 7, 1, [8], 2);
      p.fill("ground", 16, 12, 18, 12);
      p.fill("rock", 1, 1, 6, 6); p.fill("rock", 24, 1, 32, 3); p.fill("rock", 1, 25, 8, 30); p.fill("rock", 22, 27, 32, 30);
      p.street("gravel", 2, [[17, 29], [17, 26], [27, 26], [27, 22], [5, 22], [5, 16], [27, 16], [27, 9], [8, 9], [8, 4], [17, 4], [17, 1]]);
      p.street("gravel", 1, [[1, 16], [5, 16]]); p.street("gravel", 1, [[28, 16], [32, 16]]);
      for (const [x, y] of [[12, 20], [21, 20], [9, 13], [22, 13], [13, 10], [20, 5], [11, 5], [29, 20]]) roller(p, x, y);
      p.fill("ground", 16, 12, 18, 12); strata(p, 1, 1, 6, 6); strata(p, 24, 1, 32, 3);
      fence(p, 10, 25, 15, 25, [120, 110, 110]); p.decor("board", 19, 27);
    },
  },
  // Open Sky Titan's nest: the bare summit. A ring of piled stones round the nest, boulders on the brink, sky all round.
  PaldeaOpenSkySummit: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.03, groves: 0, flowers: 0.05 },
    plan(p) {
      p.fill("rock", 1, 1, 30, 28); p.disc("ground", 16, 14.5, 12.5, 11); p.fill("ground", 1, 14, 30, 16); p.fill("ground", 15, 1, 17, 28);
      p.disc("gravel", 17.5, 12.5, 6.5, 5);
      p.street("gravel", 2, [[16, 28], [16, 22], [12, 22], [12, 17], [17, 17], [17, 15]]);
      decal(p, (c) => { const cx = 18.5 * T, cy = 13.3 * T; c.ellipse(cx, cy, 44, 26, [96, 76, 56]); c.ellipse(cx, cy, 36, 19, [150, 122, 84]); for (let k = 0; k < 40; k++) { const a = k * 0.157 * 2, x = cx + Math.cos(a) * 40, y = cy + Math.sin(a) * 22; c.line(x - 5, y - 2 + (k % 3), x + 5, y + 2 - (k % 2) * 3, k % 2 ? [120, 96, 66] : [176, 146, 100], 1); } }, 0.4);
      for (const [x, y] of [[9, 8], [24, 7], [25, 17], [7, 18], [20, 22]]) roller(p, x, y);
      for (const [x, y] of [[13, 9], [22, 10], [11, 13]]) p.decor("boulder", x, y);
    },
  },
  // Segin Squad road: the lane up the West Province hillside to the Dark crew's camp. Grassy shelves between
  // brown cliff bands, lantern posts, a scrap barricade and the crew's flags at the top.
  PaldeaSeginRoad: {
    theme: { ground: "grass", road: "dirt", border: "rock", density: 0.04, groves: 0.03, flowers: 0.15 },
    plan(p) {
      const dark = [70, 60, 110], CLIFF = [164, 128, 100];
      p.fill("rock", 1, 6, 12, 8); p.fill("rock", 22, 6, 32, 8); p.fill("rock", 21, 19, 32, 21); p.fill("rock", 1, 22, 8, 24); p.fill("rock", 1, 12, 9, 13); p.fill("rock", 24, 12, 32, 13);
      face(p, 1, 7, 12, 8, CLIFF); face(p, 22, 7, 32, 8, CLIFF); face(p, 21, 20, 32, 21, CLIFF); face(p, 1, 23, 8, 24, CLIFF); face(p, 1, 13, 9, 13, CLIFF); face(p, 24, 13, 32, 13, CLIFF);
      p.street("dirt", 2, [[17, 29], [17, 25], [22, 25], [22, 22], [13, 22], [13, 16], [19, 16], [19, 10], [17, 10], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [13, 16]]); p.street("dirt", 1, [[19, 16], [32, 16]]);
      fence(p, 13, 7, 15, 7, [120, 110, 110]); fence(p, 19, 7, 21, 7, [120, 110, 110]);
      flag(p, 15, 5, dark); flag(p, 19, 5, dark);
      for (const [x, y] of [[15, 24], [15, 18], [21, 12], [15, 9]]) lamp(p, x, y, [200, 160, 250]);
      for (const [x, y] of [[5, 18], [27, 24], [9, 27], [28, 15]]) p.decor("tree1", x, y, { canopy: true });
      tent(p, 21, 2, dark); p.decor("barrels", 14, 2); p.decor("board", 19, 26);
    },
  },
  // Schedar Squad road: the green East Province hills on the way to the Fire crew. Grass slopes cut by bare
  // brown banks, a few trees, and torches lighting the picket.
  PaldeaSchedarRoad: {
    theme: { ground: "grass", road: "dirt", border: "rock", density: 0.04, groves: 0.04, flowers: 0.2 },
    plan(p) {
      const fire = [226, 80, 50], BANK = [170, 124, 92];
      p.fill("rock", 1, 10, 9, 13); p.fill("rock", 24, 4, 32, 6); p.fill("rock", 25, 26, 32, 30); p.fill("rock", 1, 27, 6, 30); p.fill("rock", 24, 21, 30, 22); p.fill("rock", 3, 3, 8, 4);
      face(p, 1, 11, 9, 13, BANK); face(p, 24, 5, 32, 6, BANK); face(p, 24, 22, 30, 22, BANK); face(p, 3, 4, 8, 4, BANK);
      p.fill("dirt", 3, 21, 7, 22); p.fill("dirt", 25, 9, 30, 11);
      p.street("dirt", 2, [[17, 29], [17, 25], [10, 25], [10, 20], [21, 20], [21, 16], [14, 16], [14, 9], [17, 9], [17, 1]]);
      p.street("dirt", 2, [[21, 16], [32, 16]]); p.street("dirt", 1, [[1, 16], [14, 16]]);
      picket(p, 17, 7, fire);
      for (const [x, y] of [[15, 12], [19, 22], [12, 23], [23, 14]]) lamp(p, x, y, [255, 170, 70]);
      for (const [x, y] of [[5, 6], [27, 13], [5, 17], [28, 18], [22, 26]]) p.decor("tree1", x, y, { canopy: true });
      tent(p, 20, 2, fire); p.decor("barrels", 13, 3); p.decor("board", 19, 26);
    },
  },
  // Navi Squad road: Tagtree Thicket. Still ponds under the trees with boggy margins, the path winding between
  // them, and trunks wrapped in the Poison crew's bright paint.
  PaldeaNaviRoad: {
    theme: { ground: "shade", grass: "shadegrass", road: "dirt", border: "tree", water: "water", density: 0.2, groves: 0.2, flowers: 0 },
    plan(p) {
      const poison = [150, 80, 190];
      p.disc("marsh", 8, 22.5, 6, 4.5); p.disc("marsh", 25.5, 10, 5.5, 5); p.disc("marsh", 26, 24.5, 4.5, 3.5);
      p.disc("water", 8, 22.5, 4.5, 3); p.disc("water", 25.5, 10, 4, 3.5); p.disc("water", 26, 24.5, 3, 2); p.disc("water", 5, 6, 3, 2);
      p.street("dirt", 2, [[17, 29], [17, 24], [6, 24], [6, 16], [26, 16], [26, 6], [17, 6], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [6, 16]]); p.street("dirt", 1, [[27, 16], [32, 16]]);
      const tag = (x, y, col) => { olive(p, x, y, null, [70, 120, 80]); p.paint(y + 1.2, (c, top) => { top.rect(x * T + 2, y * T - 4, 6, 3, col); top.rect(x * T + 9, y * T, 4, 2, [240, 220, 80]); c.rect(x * T + 6, y * T + 6, 4, 2, col); c.rect(x * T + 6, y * T + 9, 4, 2, [70, 110, 220]); c.rect(x * T + 6, y * T + 12, 4, 2, [240, 220, 80]); }); };
      for (const [x, y] of [[10, 13], [13, 18], [21, 19], [15, 9], [20, 13], [11, 27], [21, 27], [3, 13]]) tag(x, y, (x + y) % 2 ? poison : [230, 90, 160]);
      picket(p, 17, 4, poison, 2, 2);
      for (const [x, y] of [[4, 23], [28, 12]]) lamp(p, x, y, [200, 120, 250]);
      p.decor("board", 19, 26);
    },
  },
  // Ruchbah Squad road: the flower-covered headland of North Province (Area Three). Pink, violet and yellow
  // flower fields on stepped ground, dark pines, the sea beyond the northern cliff and the Fairy crew's flags.
  PaldeaRuchbahRoad: {
    theme: { ground: "meadow", road: "gravel", border: "rock", water: "sea", density: 0.03, groves: 0, flowers: 0.5 },
    plan(p) {
      const fairy = [240, 150, 200];
      ledge(p, "rock", 1, 32, 21, 1, [23], 2); ledge(p, "rock", 1, 32, 10, 1, [11], 2);
      p.fill("water", 1, 1, 9, 3); p.fill("water", 25, 1, 32, 3); p.fill("rock", 1, 4, 9, 4); p.fill("rock", 25, 4, 32, 4);
      p.fill("flowersPink", 3, 12, 9, 14); p.fill("flowersBlue", 26, 18, 31, 20); p.fill("flowersPink", 3, 23, 12, 25); p.fill("flowersRed", 20, 5, 24, 8); p.fill("flowersBlue", 27, 11, 31, 13); p.fill("flowersPink", 25, 26, 31, 28); p.fill("flowersBlue", 3, 6, 8, 8);
      p.street("gravel", 2, [[17, 29], [17, 23], [23, 23], [23, 16], [11, 16], [11, 7], [17, 7], [17, 1]]);
      p.street("gravel", 2, [[23, 16], [32, 16]]); p.street("gravel", 1, [[1, 16], [11, 16]]);
      for (const [x, y] of [[14, 12], [20, 12], [14, 19], [20, 19], [7, 18], [28, 24], [9, 27], [14, 4], [21, 3], [29, 8], [5, 28]]) olive(p, x, y, null, [50, 96, 70]);
      picket(p, 17, 5, fairy, 2, 2);
      p.decor("bench", 19, 13); p.decor("board", 19, 26);
    },
  },
  // Caph Squad road: the cliff where the Fighting crew trains. A long stair between sheer faces, a timber
  // gate at its head and a yard of straw dummies below.
  PaldeaCaphRoad: {
    theme: { ground: "field", road: "dirt", border: "rock", tree: "boulder", density: 0.05, groves: 0.04, flowers: 0.03 },
    plan(p) {
      const fight = [226, 130, 50];
      p.fill("rock", 1, 8, 14, 11); p.fill("rock", 20, 8, 32, 11); p.fill("rock", 1, 1, 6, 7); p.fill("rock", 27, 1, 32, 7);
      p.fill("rock", 1, 23, 6, 30); p.fill("rock", 26, 25, 32, 30);
      p.disc("clay", 9.5, 20, 4.5, 3);
      p.street("dirt", 2, [[17, 29], [17, 25], [23, 25], [23, 16], [17, 16]]); p.street("dirt", 3, [[17, 16], [17, 1]]);
      p.street("dirt", 2, [[23, 16], [32, 16]]); p.street("dirt", 1, [[1, 16], [17, 16]]); p.street("dirt", 1, [[10, 16], [10, 18]]);
      steps(p, 16, 8, 3, 4, [206, 196, 176]);
      face(p, 1, 9, 14, 11); face(p, 20, 9, 32, 11);
      torii(p, 15, 6, [176, 70, 50]);
      for (const [x, y] of [[7, 19], [9, 21], [12, 19], [11, 21]]) dummy(p, x, y);
      flag(p, 14, 13, fight); flag(p, 20, 13, fight); flag(p, 13, 4, fight); flag(p, 21, 4, fight);
      fence(p, 5, 23, 14, 23); p.decor("barrels", 13, 21); p.decor("board", 19, 26);
      for (const [x, y] of [[26, 19], [4, 13]]) p.decor("boulder", x, y);
    },
  },
  // The coast road to Levincia: the lane along the eastern shore, pylons carrying the city's power south,
  // sandy coves, rocks offshore and a jetty.
  PaldeaLevinciaRoad: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "sea", sea: null, density: 0.05, groves: 0.05, flowers: 0.2 },
    plan(p) {
      for (let y = 1; y <= 30; y++) { const sx = 23 + Math.round(2 * Math.sin(y / 3.2)); p.fill("beach", sx - 2, y, sx - 1, y); p.fill("water", sx, y, 32, y); }
      p.disc("rock", 28.5, 6, 1.5, 1); p.disc("rock", 30, 24, 1.5, 1.5); p.disc("rock", 27, 27, 1, 1);
      p.street("sand", 2, [[17, 29], [17, 25], [12, 25], [12, 20], [18, 20], [18, 16], [18, 11], [13, 11], [13, 5], [17, 5], [17, 1]]);
      p.street("sand", 1, [[1, 16], [18, 16]]); p.street("deck", 1, [[19, 16], [32, 16]]);
      for (const [x, y] of [[15, 27], [15, 22], [20, 18], [20, 13], [15, 9], [15, 3]]) pylon(p, x, y);
      watchtower(p, 5, 6);
      boat(p, 27, 18, [240, 200, 60]); boat(p, 26, 11, [70, 130, 200]);
      fence(p, 3, 19, 9, 19); p.decor("bench", 19, 22); p.decor("board", 19, 27);
    },
  },
  // The road to Medali: the rolling green country of West Province (Area Three). Grassy shelves between brown
  // banks, a pond, scattered trees and the lane switching back up toward the town.
  PaldeaMedaliRoad: {
    theme: { ground: "grass", road: "dirt", border: "tree", water: "water", density: 0.05, groves: 0.06, flowers: 0.3 },
    plan(p) {
      const BANK = [170, 130, 100];
      p.fill("rock", 2, 8, 8, 9); p.fill("rock", 25, 7, 31, 8); p.fill("rock", 2, 19, 7, 20); p.fill("rock", 26, 19, 31, 20); p.fill("rock", 20, 25, 31, 26);
      face(p, 2, 9, 8, 9, BANK); face(p, 25, 8, 31, 8, BANK); face(p, 2, 20, 7, 20, BANK); face(p, 26, 20, 31, 20, BANK); face(p, 20, 26, 31, 26, BANK);
      p.fill("meadow", 2, 3, 8, 7); p.fill("meadow", 25, 3, 31, 6); p.fill("meadow", 20, 27, 31, 29);
      p.disc("water", 27.5, 12.5, 3, 2);
      p.street("dirt", 2, [[17, 29], [17, 23], [10, 23], [10, 16], [23, 16], [23, 9], [17, 9], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [10, 16]]); p.street("dirt", 1, [[23, 16], [32, 16]]);
      for (const [x, y] of [[5, 11], [13, 26], [3, 25], [21, 4], [28, 22], [13, 12], [20, 19], [5, 4], [28, 4]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[14, 6], [7, 14], [24, 22]]) p.decor("boulder", x, y);
      p.fill("flowersBlue", 12, 18, 15, 19); p.fill("flowersRed", 25, 27, 28, 28);
      p.decor("board", 19, 26);
    },
  },
  // The pass to Montenevera: a snowbound defile between cliffs. Pines, a frozen tarn, lamps along the trail
  // and the first gates of the ski run coming down from the town.
  PaldeaMonteneveraRoad: {
    theme: { density: 0.12, groves: 0.1 },
    plan(p) {
      p.fill("rock", 1, 1, 9, 9); p.fill("rock", 25, 1, 32, 12); p.fill("rock", 1, 20, 7, 30); p.fill("rock", 26, 21, 32, 30);
      face(p, 1, 7, 9, 9, [150, 156, 176]); face(p, 25, 10, 32, 12, [150, 156, 176]); face(p, 1, 28, 7, 30, [150, 156, 176]); face(p, 26, 28, 32, 30, [150, 156, 176]);
      p.disc("water", 8.5, 14, 3.5, 2.5); p.disc("frost", 8.5, 14, 4.5, 3.5); p.disc("water", 8.5, 14, 3, 2);
      p.fill("snow", 19, 4, 23, 13);
      p.street("frost", 2, [[17, 29], [17, 24], [12, 24], [12, 18], [17, 18], [17, 16], [14, 16], [14, 8], [17, 8], [17, 1]]);
      p.street("frost", 1, [[1, 16], [14, 16]]); p.street("frost", 1, [[18, 16], [32, 16]]);
      skiGate(p, 19, 5, [220, 60, 60]); skiGate(p, 21, 8, [60, 110, 220]); skiGate(p, 19, 11, [220, 60, 60]);
      for (const [x, y] of [[15, 26], [10, 21], [15, 20], [12, 11], [15, 5]]) lamp(p, x, y, [255, 230, 150]);
      p.decor("cabin", 20, 21); p.decor("board", 19, 27);
    },
  },
  // The climb to Alfornada: the dry plateau of South Province (Area Six). Yellowed grass on shelves between
  // bare brown cliffs, the trail doubling back up them and the mouths of Alfornada Cavern in the lowest wall.
  PaldeaAlfornadaRoad: {
    theme: { ground: "field", road: "dirt", border: "rock", tree: "boulder", density: 0.05, groves: 0, flowers: 0.05 },
    plan(p) {
      p.fill("rock", 1, 19, 22, 23); p.fill("rock", 12, 9, 32, 13); p.fill("rock", 1, 3, 13, 6); p.fill("rock", 21, 1, 32, 5);
      p.fill("meadow", 3, 25, 12, 29); p.fill("meadow", 24, 19, 31, 22); p.fill("meadow", 2, 8, 6, 14); p.fill("meadow", 20, 6, 31, 8);
      p.street("dirt", 2, [[17, 29], [17, 25], [25, 25], [25, 16], [8, 16], [8, 8], [17, 8], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [8, 16]]); p.street("dirt", 1, [[26, 16], [32, 16]]);
      face(p, 1, 21, 22, 23, [158, 132, 108]); face(p, 12, 11, 32, 13, [158, 132, 108]); face(p, 1, 5, 13, 6, [158, 132, 108]); face(p, 21, 4, 32, 5, [158, 132, 108]);
      for (const [x, y] of [[3, 21], [9, 21]]) cave(p, x, y, 2, 3);
      steps(p, 25, 19, 2, 5, [196, 180, 160]); steps(p, 8, 9, 2, 5, [196, 180, 160]);
      for (const [x, y] of [[4, 10], [28, 26], [20, 26]]) p.decor("boulder", x, y);
      p.decor("barrels", 5, 14); p.decor("board", 19, 27);
    },
  },
  // Glaseado Mountain trail: the snow slope run. A groomed piste swings down the mountainside through
  // coloured gates beside the walkers' trail; crags and frosted pines to either hand.
  PaldeaGlaseadoRoad: {
    theme: { density: 0.1, groves: 0.08 },
    plan(p) {
      p.fill("rock", 1, 1, 7, 5); p.fill("rock", 1, 6, 3, 12); p.fill("rock", 28, 24, 32, 30); p.fill("rock", 1, 26, 5, 30);
      face(p, 1, 4, 7, 5, [150, 156, 176]); face(p, 1, 28, 5, 30, [150, 156, 176]); face(p, 28, 28, 32, 30, [150, 156, 176]);
      river(p, 4, [[22, 2], [27, 7], [27, 12], [22, 18], [22, 22], [26, 27]], "snow");                      // the piste
      p.street("frost", 2, [[17, 29], [17, 25], [11, 25], [11, 19], [17, 19], [17, 16], [13, 16], [13, 9], [17, 9], [17, 1]]);
      p.street("frost", 1, [[1, 16], [13, 16]]); p.street("frost", 1, [[18, 16], [32, 16]]);
      decal(p, (c) => { const pts = [[24, 3], [29, 8], [29, 13], [24, 19], [24, 23], [28, 28]]; for (let s2 = 0; s2 + 1 < pts.length; s2++) for (const o of [-9, 7]) c.line(pts[s2][0] * T + o, pts[s2][1] * T, pts[s2 + 1][0] * T + o, pts[s2 + 1][1] * T, [176, 200, 232], 1); }, 0.3);
      skiGate(p, 23, 3, [220, 60, 60], 3); skiGate(p, 27, 9, [60, 110, 220], 3); skiGate(p, 24, 14, [220, 60, 60], 3); skiGate(p, 22, 20, [60, 110, 220], 3); skiGate(p, 25, 25, [220, 60, 60], 3);
      p.paint(3, (c, top) => { top.box(22 * T, 1 * T - 6, 5 * T, 8, [240, 240, 244], EDGE); for (let k = 0; k < 5; k++) top.rect(22 * T + 4 + k * 15, 1 * T - 4, 8, 4, k % 2 ? [220, 60, 60] : [60, 110, 220]); });
      p.decor("cabin", 5, 20); for (const [x, y] of [[9, 12], [19, 22]]) p.decor("boulder", x, y);
      p.decor("board", 19, 27);
    },
  },
  // The League road: the path up from Mesagoza's west gate. A dirt track climbing two shelves of brown cliff
  // by rough steps to the grassy shelf under the League building.
  PaldeaLeagueRoad: {
    theme: { ground: "grass", road: "dirt", border: "rock", tree: "tree1", density: 0.04, groves: 0.05, flowers: 0.25 },
    plan(p) {
      const CLIFF = [166, 130, 102];
      p.fill("rock", 1, 20, 32, 22); p.fill("rock", 1, 9, 32, 11); p.fill("rock", 1, 1, 8, 5); p.fill("rock", 26, 1, 32, 6);
      p.fill("ground", 16, 20, 18, 22); p.fill("ground", 9, 9, 11, 11);
      p.street("dirt", 3, [[17, 29], [17, 19], [10, 19]]); p.street("dirt", 3, [[10, 19], [10, 16], [10, 8], [17, 8]]); p.street("dirt", 3, [[17, 8], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [10, 16]]); p.street("dirt", 1, [[11, 16], [32, 16]]);
      steps(p, 16, 20, 3, 3, [196, 176, 150]); steps(p, 9, 9, 3, 3, [196, 176, 150]);
      face(p, 1, 21, 15, 22, CLIFF); face(p, 19, 21, 32, 22, CLIFF); face(p, 1, 10, 8, 11, CLIFF); face(p, 12, 10, 32, 11, CLIFF);
      for (const [x, y] of [[14, 20], [8, 20], [13, 6], [21, 6]]) lamp(p, x, y, [255, 236, 170]);
      for (const [x, y] of [[23, 13], [5, 25], [26, 26], [22, 3]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[4, 13], [28, 17], [12, 26]]) p.decor("boulder", x, y);
      p.fill("flowersBlue", 3, 24, 8, 25); p.fill("flowersRed", 24, 24, 29, 25);
      p.decor("board", 19, 27);
    },
  },
  // Lurking Steel trail: mine country in the east. Rails run out of the adits to a spoil yard, and the
  // ground between the mesas is holed by the Titan's burrows.
  PaldeaSteelTrail: {
    theme: { ground: "gravel", road: "dirt", border: "rock", grass: "tallgrass", tree: "boulder", density: 0.05, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 12, 6); p.fill("rock", 22, 1, 32, 8); p.fill("rock", 1, 20, 8, 30); p.fill("rock", 24, 22, 32, 30);
      p.fill("field", 9, 18, 15, 22); p.fill("field", 20, 9, 23, 14); p.fill("field", 20, 24, 23, 29);
      p.disc("dirt", 18, 13.5, 4.5, 3);
      p.street("dirt", 2, [[17, 29], [17, 24], [11, 24], [11, 16], [14, 16], [14, 9], [17, 9], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [11, 16]]); p.street("dirt", 1, [[14, 16], [32, 16]]);
      face(p, 1, 4, 12, 6, [150, 132, 120]); face(p, 22, 6, 32, 8, [150, 132, 120]); face(p, 1, 28, 8, 30, [150, 132, 120]); face(p, 24, 28, 32, 30, [150, 132, 120]);
      cave(p, 25, 6, 3, 3); cave(p, 4, 4, 3, 3);
      rails(p, [[26, 9], [26, 13], [30, 13]]); rails(p, [[5, 7], [5, 11], [9, 11]]); cart(p, 31, 13); cart(p, 10, 11);
      for (const [x, y] of [[21, 11], [22, 18], [7, 13], [20, 26], [13, 26]]) pool(p, x, y, 2, 2, [44, 38, 46]);
      p.decor("barrels", 29, 10); p.decor("barrels", 3, 8); fence(p, 28, 9, 31, 9, [120, 110, 110]);
      for (const [x, y] of [[3, 17], [28, 19]]) p.decor("boulder", x, y);
      p.decor("board", 19, 27);
    },
  },
  // Quaking Earth trail: the Asado Desert. Dunes, cacti and the sand-scoured ruins of an older Paldea either
  // side of the track to the Titan's den.
  PaldeaEarthTrail: {
    theme: { density: 0.05, wander: 1 },
    plan(p) {
      p.fill("rock", 1, 1, 9, 4); p.fill("rock", 26, 1, 32, 6); p.fill("rock", 1, 26, 7, 30); p.fill("rock", 27, 24, 32, 30);
      face(p, 1, 3, 9, 4, [196, 150, 110]); face(p, 26, 5, 32, 6, [196, 150, 110]); face(p, 1, 29, 7, 30, [196, 150, 110]); face(p, 27, 29, 32, 30, [196, 150, 110]);
      p.disc("beach", 17.5, 13.5, 5, 3);
      p.street("beach", 2, [[17, 29], [17, 25], [23, 25], [23, 19], [12, 19], [12, 16], [12, 9], [17, 9], [17, 1]]);
      p.street("beach", 1, [[1, 16], [12, 16]]); p.street("beach", 1, [[13, 16], [32, 16]]);
      decal(p, (c) => { for (const [x, y, w] of [[3, 8, 5], [20, 4, 5], [26, 11, 5], [4, 21, 6], [14, 23, 4], [25, 21, 4], [10, 27, 5]]) for (let k = 0; k < 3; k++) for (let t = 0; t < w * T; t += 2) c.rect(x * T + t + k * 5, y * T + k * 7 + Math.round(3 * Math.sin(t / 9)), 2, 1, [206, 170, 110, 200]); }, 0.3);
      ruin(p, 4, 11, 4); ruin(p, 22, 8, 3); ruin(p, 26, 14, 3); ruin(p, 5, 24, 3);
      column(p, 9, 11); column(p, 4, 13, true); column(p, 21, 10, true); column(p, 25, 9); column(p, 20, 12); column(p, 14, 12, true); column(p, 9, 24, true); column(p, 4, 22);
      for (const [x, y] of [[14, 5], [21, 3], [7, 7], [29, 9], [28, 19], [9, 19], [19, 22], [13, 28], [21, 28], [3, 18]]) cactus(p, x, y);
      p.decor("board", 19, 27);
    },
  },
  // The Quaking Earth Titan's den: a sand bowl walled by red rock, the burrow mouth under the north-east
  // cliff, old columns standing round and the pits it leaves when it surfaces.
  PaldeaEarthDen: {
    theme: { density: 0.03, wander: 1 },
    plan(p) {
      p.fill("rock", 1, 1, 30, 28); p.disc("ground", 15.5, 15, 13, 10.5); p.fill("ground", 1, 14, 30, 16); p.fill("ground", 15, 1, 17, 28);
      p.fill("rock", 19, 3, 28, 8);
      p.disc("beach", 17, 14, 6, 4);
      p.street("beach", 2, [[16, 28], [16, 22], [11, 22], [11, 17], [16, 17], [16, 15]]);
      face(p, 19, 6, 28, 8, [196, 150, 110]); cave(p, 21, 5, 5, 4);
      for (const [x, y] of [[9, 9], [12, 7], [7, 19], [24, 19], [22, 22], [9, 12]]) column(p, x, y, (x + y) % 3 === 0);
      ruin(p, 4, 11, 3); ruin(p, 24, 12, 3);
      for (const [x, y] of [[20, 18], [8, 15], [24, 10]]) pool(p, x, y, 2, 2, [120, 86, 60]);
      for (const [x, y] of [[13, 24], [20, 24], [6, 13], [26, 17], [13, 4]]) cactus(p, x, y);
    },
  },
  // False Dragon trail: Casseroya Lake. The trail leaves the south shore by plank bridge and goes from islet
  // to islet across the open water to the far bank.
  PaldeaDragonTrail: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "water", sea: null, shore: 0, density: 0.05, groves: 0.05, flowers: 0.2 },
    plan(p) {
      p.fill("water", 1, 6, 32, 25);
      for (let x = 1; x <= 32; x++) { if (Math.sin(x / 2.7) > 0.2) p.fill("water", x, 5, x, 5); if (Math.cos(x / 3.1) > 0.3) p.fill("water", x, 26, x, 26); }
      p.fill("beach", 12, 25, 22, 26); p.fill("beach", 20, 5, 28, 6);
      p.disc("grass", 17.5, 21, 3.2, 2.6); p.disc("grass", 9.5, 16, 3.4, 3); p.disc("meadow", 17, 13.5, 4, 3.2); p.disc("grass", 25.5, 10.5, 3.2, 2.6);
      p.disc("beach", 5, 9.5, 2.2, 1.6); p.disc("grass", 27.5, 21.5, 2.6, 2); p.disc("rock", 4.5, 22.5, 1.5, 1.5); p.disc("rock", 30, 14, 1, 1); p.disc("rock", 11.5, 8.5, 1.5, 1);
      p.street("sand", 2, [[17, 29], [17, 21], [9, 21], [9, 15], [16, 15]]); p.street("sand", 2, [[16, 15], [16, 10], [25, 10], [25, 4], [17, 4], [17, 1]]);
      p.street("sand", 1, [[1, 16], [9, 16]]); p.street("sand", 1, [[18, 16], [32, 16]]);
      olive(p, 27, 21, null, [90, 150, 90]); olive(p, 28, 22, null, [90, 150, 90]); olive(p, 11, 17, null, [90, 150, 90]); olive(p, 27, 11, null, [90, 150, 90]);
      p.decor("boulder", 4, 8); boat(p, 21, 23, [200, 60, 60]);
      fence(p, 3, 28, 12, 28); p.decor("board", 19, 27); p.decor("board", 19, 12);
    },
  },
  // The False Dragon Titan's water: the heart of Casseroya Lake, ringed by its banks. One jetty runs out to
  // the islet in the middle; something very large is moving under the surface.
  PaldeaDragonLake: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "water", sea: null, shore: 0, density: 0.04, groves: 0.05, flowers: 0.2 },
    plan(p) {
      p.disc("water", 15.5, 13, 11.5, 9.5); p.fill("water", 6, 8, 25, 18);
      p.disc("beach", 17, 13.5, 4, 3); p.disc("grass", 17.5, 13, 2.5, 1.6);
      p.disc("rock", 9, 8, 1.5, 1); p.disc("rock", 24, 18, 1.5, 1.2); p.disc("beach", 8.5, 18, 1.8, 1.4);
      p.fill("beach", 12, 23, 20, 23);
      p.street("sand", 2, [[16, 28], [16, 15]]); p.street("sand", 1, [[1, 15], [4, 15]]); p.street("sand", 1, [[27, 15], [30, 15]]); p.street("sand", 1, [[16, 1], [16, 3]]);
      p.street("sand", 1, [[2, 15], [2, 25], [16, 25]]); p.street("sand", 1, [[29, 15], [29, 25], [17, 25]]); p.street("sand", 1, [[2, 15], [2, 2], [29, 2], [29, 15]]);
      decal(p, (c) => { const cx = 23 * T, cy = 9.5 * T, d = [30, 60, 110, 120]; c.ellipse(cx, cy, 34, 13, d); c.poly([[cx + 30, cy], [cx + 50, cy - 12], [cx + 46, cy], [cx + 50, cy + 12]], d); c.ellipse(cx - 8, cy, 20, 8, [30, 60, 110, 90]); for (const [x, y] of [[9, 12], [11, 15], [22, 14]]) { c.ellipse(x * T, y * T, 9, 4, [226, 240, 250, 150], 1); c.ellipse(x * T, y * T, 5, 2, [226, 240, 250, 150], 1); } }, 0.6);
      boat(p, 10, 20, [240, 200, 60]);
      for (const [x, y] of [[5, 5], [26, 5], [5, 22], [25, 23]]) olive(p, x, y, null, [90, 150, 90]);
      fence(p, 10, 26, 13, 26); fence(p, 19, 26, 22, 26);
    },
  },
  // Area Zero Gate: the Zero Gate set in the rim of the Great Crater. A paved apron under the cliffs, rails
  // along the drop, signal lamps and the steel doors of the gatehouse at the top.
  PaldeaAreaZeroGate: {
    theme: { ground: "gravel", road: "paving", border: "rock", grass: "tallgrass", tree: "boulder", treeTint: null, density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      const cyan = [120, 220, 240];
      p.fill("rock", 1, 1, 11, 9); p.fill("rock", 23, 1, 32, 9); p.fill("rock", 1, 22, 8, 30); p.fill("rock", 26, 22, 32, 30);
      p.fill("steel", 12, 4, 22, 9); p.disc("paving", 17.5, 13.5, 6.5, 4);
      p.fill("field", 3, 11, 9, 14); p.fill("field", 25, 18, 31, 20); p.fill("field", 10, 25, 14, 29);
      p.street("paving", 3, [[17, 29], [17, 22], [12, 22], [12, 16], [17, 16], [17, 1]]);
      p.street("paving", 1, [[1, 16], [12, 16]]); p.street("paving", 1, [[18, 16], [32, 16]]);
      face(p, 1, 7, 11, 9, [120, 112, 124]); face(p, 23, 7, 32, 9, [120, 112, 124]); face(p, 1, 28, 8, 30, [120, 112, 124]); face(p, 26, 28, 32, 30, [120, 112, 124]);
      // The gatehouse: two steel wings either side of the way in and the lintel over it.
      for (const gx of [12, 19]) prop(p, gx, 1, 4, 3, (c, px, py) => { c.box(px, py - 4, 64, 52, [156, 162, 176], EDGE); c.rect(px + 1, py + 40, 62, 7, [110, 116, 132]); for (let k = 0; k < 3; k++) c.box(px + 6 + k * 19, py + 6, 13, 16, [70, 80, 100], EDGE); c.rect(px + 2, py + 28, 60, 3, cyan); });
      p.paint(4.1, (c, top) => { top.box(16 * T - 2, -2, 3 * T + 4, 14, [156, 162, 176], EDGE); top.poly([[17.5 * T, 1], [17.5 * T + 7, 5], [17.5 * T, 10], [17.5 * T - 7, 5]], cyan); });
      fence(p, 12, 10, 14, 10, [130, 134, 150]); fence(p, 20, 10, 22, 10, [130, 134, 150]); fence(p, 2, 21, 8, 21, [130, 134, 150]); fence(p, 26, 21, 31, 21, [130, 134, 150]);
      for (const [x, y] of [[14, 8], [20, 8], [14, 19], [10, 23], [20, 25]]) lamp(p, x, y, cyan);
      pylon(p, 24, 12); crystal(p, 27, 11, TERA[0]); crystal(p, 5, 18, TERA[1]);
      p.decor("barrels", 21, 12); p.decor("board", 19, 27);
      // The flying-taxi stand where the party sets down.
      p.bare(0); decal(p, (c) => { const cx = 17.5 * T, cy = 28.5 * T; c.ellipse(cx, cy, 30, 20, [250, 220, 90], 2); c.ellipse(cx, cy, 22, 14, [250, 220, 90, 120], 1); for (const dx of [-36, 36]) c.rect(cx + dx - 2, cy - 2, 5, 5, [250, 220, 90]); }, 0.4);
    },
  },
  // Area Zero, upper crater: green shelves stepping down into the mist. A stream falls from ledge to ledge
  // down the east side, rocks hang in the air and Tera crystals stud the grass.
  PaldeaAreaZeroUpper: {
    theme: { ground: "grass", road: "dirt", border: "rock", grass: "tallgrass", tree: "tree1", treeTint: null, density: 0.04, groves: 0.04, flowers: 0.2 },
    plan(p) {
      ledge(p, "rock", 1, 32, 22, 2, [8], 2); ledge(p, "rock", 1, 32, 11, 2, [24], 2); ledge(p, "rock", 1, 32, 6, 2, [10], 2);
      p.fill("rock", 1, 27, 6, 30); p.fill("rock", 1, 1, 6, 3);
      river(p, 3, [[28, 24], [28, 30]]); river(p, 3, [[28, 13], [28, 21]]); river(p, 3, [[28, 8], [28, 10]]); river(p, 3, [[28, 1], [28, 5]]);
      p.disc("water", 29.5, 26, 3, 2.5);
      p.street("dirt", 2, [[17, 29], [17, 25], [8, 25], [8, 16], [24, 16], [24, 9], [10, 9], [10, 4], [17, 4], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [8, 16]]); p.street("dirt", 1, [[25, 16], [32, 16]]);
      for (const y of [22, 11, 6]) { face(p, 1, y + 1, 7 + (y === 11 ? 16 : y === 6 ? 2 : 0), y + 1, [130, 126, 140]); face(p, (y === 22 ? 10 : y === 11 ? 26 : 12), y + 1, 27, y + 1, [130, 126, 140]); face(p, 31, y + 1, 32, y + 1, [130, 126, 140]); falls(p, 28, 30, y, 2); }
      for (const [x, y] of [[12, 19], [21, 13], [5, 9], [20, 26], [14, 3], [22, 20]]) floater(p, x, y);
      [[4, 14], [13, 14], [21, 18], [26, 19], [14, 27], [23, 27], [5, 19], [15, 10], [21, 4], [6, 5], [25, 3]].forEach(([x, y], k) => crystal(p, x, y, TERA[k % TERA.length]));
      p.decor("board", 19, 27);
    },
  },
  // Area Zero's Underdepths: the crystal cavern under the lab. Every wall and outcrop is Tera crystal,
  // pools of light lie in the floor, and a causeway of hexagonal plates runs up to the chamber.
  PaldeaUnderdepths: {
    theme: { ground: "caveFloor", road: "darkpave", border: "caveVoid", grass: "caveFloor", tree: "boulder", treeTint: null, density: 0.03, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("border", 1, 1, 10, 5); p.fill("border", 24, 1, 32, 6); p.fill("border", 1, 20, 6, 30); p.fill("border", 25, 21, 32, 30); p.fill("border", 22, 10, 26, 12); p.fill("border", 6, 9, 9, 12);
      p.disc("darkpave", 17.5, 14, 5.5, 3.5);
      p.street("darkpave", 2, [[17, 29], [17, 24], [11, 24], [11, 16], [21, 16], [21, 8], [17, 8], [17, 1]]);
      p.street("darkpave", 1, [[1, 16], [11, 16]]); p.street("darkpave", 1, [[22, 16], [32, 16]]);
      decal(p, (c) => { for (let y = 2; y < 30; y++) for (let x = 2; x < 32; x++) if (p.hash(x, y, 77) > 0.86) { const px = x * T + 8, py = y * T + 8, col = TERA[(x * 3 + y) % TERA.length]; c.poly([[px - 5, py], [px - 2, py - 4], [px + 3, py - 4], [px + 6, py], [px + 3, py + 4], [px - 2, py + 4]], [col[0], col[1], col[2], 70]); } }, 0.2);
      // The lift down from the lab, and the crystal gate of the chamber.
      p.bare(0); p.bare(1);
      decal(p, (c) => { const cx = 17.5 * T, cy = 28.5 * T; c.ellipse(cx, cy, 26, 17, [70, 80, 100]); c.ellipse(cx, cy, 22, 14, [150, 160, 180]); c.ellipse(cx, cy, 16, 9, [120, 220, 240], 2); }, 0.4);
      for (const gx of [15, 19]) prop(p, gx, 2, 1, 2, (c, px, py, top) => { for (const t of [c, top]) { t.poly([[px + 8, py - 22], [px + 16, py + 8], [px + 12, py + 31], [px + 4, py + 31], [px, py + 8]], [90, 170, 190]); t.poly([[px + 8, py - 19], [px + 13, py + 8], [px + 8, py + 29], [px + 3, py + 8]], [150, 236, 244]); t.poly([[px + 8, py - 19], [px + 8, py + 29], [px + 3, py + 8]], [214, 250, 252]); } });
      p.paint(4.2, (c, top) => { top.ellipse(17.5 * T, 2.5 * T, 22, 26, [150, 236, 244, 60]); top.ellipse(17.5 * T, 2.5 * T, 22, 26, [214, 250, 252], 1); });
      pool(p, 4, 13, 4, 2, [120, 230, 240]); pool(p, 24, 17, 5, 3, [200, 150, 250]); pool(p, 12, 4, 3, 2, [150, 240, 190]); pool(p, 20, 26, 3, 2, [120, 230, 240]);
      [[10, 6], [11, 7], [23, 7], [22, 5], [7, 19], [8, 21], [24, 20], [23, 22], [13, 12], [22, 13], [14, 19], [20, 19], [13, 27], [21, 23], [9, 14], [27, 14], [3, 8], [29, 9], [15, 22], [19, 4], [15, 2], [3, 17], [30, 15], [9, 27]].forEach(([x, y], k) => crystal(p, x, y, TERA[k % TERA.length]));
    },
  },
  // Kitakami, the school trip's arrival: the bus stop at the end of the country road. The bus stands by its
  // shelter; the road winds on between rice paddies and apple trees to Mossui Town.
  PaldeaKitakamiBus: {
    theme: { ground: "grass", road: "asphalt", border: "tree", density: 0.05, groves: 0.08, flowers: 0.25 },
    plan(p) {
      paddy(p, 2, 3, 9, 7); paddy(p, 2, 9, 9, 13); paddy(p, 26, 19, 31, 23); paddy(p, 26, 25, 31, 29); paddy(p, 3, 19, 8, 22);
      p.street("asphalt", 3, [[17, 29], [17, 21], [23, 21], [23, 10], [13, 10], [13, 5], [17, 5], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [22, 16]]); p.street("dirt", 1, [[24, 16], [32, 16]]);
      p.bare(0);
      // The bus, its stop and shelter.
      prop(p, 20, 25, 5, 3, (c, px, py) => { c.rect(px + 4, py + 42, 72, 5, [0, 0, 0, 60]); c.box(px + 2, py + 4, 76, 36, [240, 236, 220], EDGE); c.rect(px + 3, py + 26, 74, 8, [70, 150, 110]); c.rect(px + 3, py + 34, 74, 5, [200, 196, 184]); for (let k = 0; k < 5; k++) c.box(px + 6 + k * 14, py + 9, 11, 12, [150, 200, 232], EDGE); c.box(px + 4, py + 9, 1, 26, [90, 60, 40], EDGE); for (const wx of [16, 62]) { c.ellipse(px + wx, py + 41, 6, 6, [30, 28, 34]); c.ellipse(px + wx, py + 41, 2, 2, [170, 170, 180]); } c.rect(px + 75, py + 22, 3, 4, [250, 240, 160]); });
      prop(p, 12, 24, 3, 2, (c, px, py, top) => { c.box(px + 2, py + 6, 44, 24, [176, 140, 100], EDGE); c.rect(px + 4, py + 20, 40, 4, [120, 90, 60]); c.rect(px + 4, py + 10, 40, 8, [70, 60, 60]); top.poly([[px - 3, py + 8], [px + 5, py - 6], [px + 43, py - 6], [px + 51, py + 8]], EDGE); top.poly([[px - 1, py + 7], [px + 6, py - 4], [px + 42, py - 4], [px + 49, py + 7]], [90, 110, 120]); });
      prop(p, 15, 26, 1, 1, (c, px, py, top) => { c.rect(px + 7, py, 2, 15, [110, 100, 100]); top.rect(px + 7, py - 14, 2, 14, [110, 100, 100]); top.ellipse(px + 8, py - 16, 6, 6, EDGE); top.ellipse(px + 8, py - 16, 5, 5, [70, 130, 200]); top.rect(px + 5, py - 17, 6, 2, WHITE); });
      for (const [x, y] of [[26, 8], [28, 6], [30, 9], [27, 12], [30, 13], [20, 4], [22, 6], [5, 26], [8, 28], [11, 19]]) olive(p, x, y, [226, 50, 50], [90, 160, 80]);
      for (const [x, y] of [[15, 12], [21, 19], [15, 7]]) stoneLantern(p, x, y);
      fence(p, 2, 8, 9, 8); fence(p, 26, 24, 31, 24); p.decor("board", 21, 12);
    },
  },
  // Apple Hills: the orchards above Mossui Town. Apple trees in rows on stepped hillsides, crates at the
  // lane's edge and the grower's cabin.
  PaldeaAppleHills: {
    theme: { ground: "meadow", road: "dirt", border: "tree", density: 0.03, groves: 0.04, flowers: 0.25 },
    plan(p) {
      const apple = [226, 50, 50], leaf = [90, 160, 80];
      ledge(p, "rock", 1, 32, 22, 1, [11], 2); ledge(p, "rock", 1, 32, 9, 1, [22], 2);
      p.street("dirt", 2, [[17, 29], [17, 25], [11, 25], [11, 16], [22, 16], [22, 6], [17, 6], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [11, 16]]); p.street("dirt", 1, [[23, 16], [32, 16]]);
      for (const y of [11, 13, 19]) for (const x of [2, 4, 6, 8, 25, 27, 29, 31]) olive(p, x, y, apple, leaf);
      for (const y of [11, 13]) for (const x of [13, 15, 19]) if (!(x === 19 && y === 13)) olive(p, x, y, apple, leaf);
      for (const y of [24, 26, 28]) for (const x of [21, 23, 25, 27, 29, 31]) olive(p, x, y, (x + y) % 3 ? apple : [240, 200, 80], leaf);
      for (const y of [3, 5, 7]) for (const x of [3, 5, 7, 9, 11]) olive(p, x, y, apple, leaf);
      p.decor("cabin", 26, 2); fence(p, 2, 21, 9, 21); fence(p, 20, 23, 31, 23);
      crate(p, 13, 23, apple); crate(p, 14, 23, apple); crate(p, 24, 7, [240, 200, 80]); crate(p, 20, 18, apple); crate(p, 9, 17, apple);
      p.decor("board", 19, 27);
    },
  },
  // Oni Mountain: the long stone stair. Flight after flight between red gates and lanterns, cliffs closing
  // in, a fall coming down the western face.
  PaldeaOniMountain: {
    theme: { ground: "field", road: "gravel", border: "rock", tree: "tree1", density: 0.06, groves: 0.1, flowers: 0.05 },
    plan(p) {
      const red = [190, 60, 50], st = [200, 196, 186];
      p.fill("rock", 1, 20, 32, 22); p.fill("rock", 1, 9, 32, 11); p.fill("rock", 1, 1, 9, 8); p.fill("rock", 26, 1, 32, 5); p.fill("rock", 27, 23, 32, 30);
      p.fill("ground", 16, 20, 18, 22); p.fill("ground", 21, 9, 23, 11); p.fill("ground", 4, 9, 5, 11); p.fill("ground", 4, 20, 5, 22);
      river(p, 2, [[4, 9], [4, 30]]); p.disc("water", 5, 27, 3, 2.5);
      p.street("gravel", 3, [[17, 29], [17, 16], [22, 16], [22, 6], [17, 6], [17, 1]]);
      p.street("gravel", 1, [[1, 16], [16, 16]]); p.street("gravel", 1, [[23, 16], [32, 16]]);
      steps(p, 16, 20, 3, 3, st); steps(p, 21, 9, 3, 3, st); steps(p, 16, 24, 3, 2, st); steps(p, 21, 13, 3, 2, st); steps(p, 16, 2, 3, 2, st);
      face(p, 1, 21, 3, 22, [140, 132, 128]); face(p, 6, 21, 15, 22, [140, 132, 128]); face(p, 19, 21, 32, 22, [140, 132, 128]); face(p, 1, 10, 3, 11, [140, 132, 128]); face(p, 6, 10, 20, 11, [140, 132, 128]); face(p, 24, 10, 32, 11, [140, 132, 128]);
      falls(p, 4, 5, 9, 3); falls(p, 4, 5, 20, 3);
      torii(p, 15, 26, red); torii(p, 15, 18, red); torii(p, 20, 7, red);
      for (const [x, y] of [[15, 23], [19, 23], [20, 12], [24, 12], [15, 4], [19, 4]]) stoneLantern(p, x, y);
      for (const [x, y] of [[10, 13], [28, 17], [10, 26]]) p.decor("boulder", x, y);
      p.decor("board", 20, 27);
    },
  },
  // Crystal Pool: the still turquoise water in the bare white crown of Oni Mountain. Crystals stand out of
  // the shallows, a plank walk crosses to the far bank, and the path to the Dreaded Den goes on behind.
  PaldeaCrystalPool: {
    theme: { ground: "gravel", road: "sand", border: "rock", water: "water", tree: "boulder", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 6, 4); p.fill("rock", 27, 1, 32, 4); p.fill("rock", 1, 26, 6, 30); p.fill("rock", 27, 26, 32, 30);
      p.disc("beach", 17, 10.5, 14, 8.2); p.disc("water", 17, 10.5, 11.5, 5.8);
      p.disc("beach", 17.5, 14.5, 3.5, 2.4);
      p.street("sand", 2, [[17, 29], [17, 23], [11, 23], [11, 19], [17, 19], [17, 16]]); p.street("sand", 2, [[17, 16], [17, 1]]);
      p.street("sand", 1, [[1, 16], [3, 16], [3, 19], [11, 19]]); p.street("sand", 1, [[32, 16], [30, 16], [30, 19], [18, 19]]);
      decal(p, (c) => { c.ellipse(17 * T, 10.5 * T, 11 * T, 5.2 * T, [120, 230, 220, 110]); for (const [x, y] of [[9, 9], [24, 12], [13, 13], [22, 7]]) { c.ellipse(x * T, y * T, 10, 4, [236, 250, 252, 170], 1); c.ellipse(x * T, y * T, 5, 2, [236, 250, 252, 170], 1); } }, 0.6);
      [[10, 10], [12, 7], [14, 11], [21, 9], [23, 11], [25, 9], [20, 13], [8, 12], [13, 9], [22, 6], [26, 12]].forEach(([x, y], k) => crystal(p, x, y, k % 3 ? [150, 230, 240] : [214, 244, 250]));
      for (const [x, y] of [[5, 22], [24, 24], [8, 26], [27, 21], [21, 26]]) p.decor("boulder", x, y);
      p.decor("board", 19, 27);
    },
  },
  // Blueberry Academy's entrance: the steel deck of the academy standing in the open sea. The landing
  // stage to the south, flags and planters on the plaza, the blue dome's doors to the north.
  PaldeaBlueberryDock: {
    theme: { ground: "steel", road: "paving", border: "rock", water: "sea", autoHouses: false, density: 0, groves: 0, flowers: 0, fountain: false, lawns: 0 },
    plan(p) {
      const blue = [70, 120, 220], berry = [90, 110, 230];
      p.fill("water", 1, 1, 32, 30); p.fill("ground", 8, 4, 26, 23); p.fill("ground", 11, 1, 23, 3); p.fill("ground", 5, 13, 29, 19);
      p.disc("paving", 17.5, 13.5, 6, 4.2);
      p.street("paving", 3, [[17, 23], [17, 1]]); p.street("deck", 3, [[17, 24], [17, 30]]);
      p.street("deck", 1, [[1, 16], [4, 16]]); p.street("deck", 1, [[30, 16], [32, 16]]); p.street("deck", 2, [[18, 27], [24, 27]]);
      p.bare(0);
      for (const gx of [11, 19]) prop(p, gx, 1, 5, 3, (c, px, py, top) => { const l = gx === 11; c.box(px, py + 12, 80, 36, [214, 222, 236], EDGE); c.rect(px + 1, py + 40, 78, 7, [150, 160, 184]); for (let k = 0; k < 4; k++) c.box(px + 6 + k * 18, py + 20, 13, 14, [130, 190, 236], EDGE); for (const t of [c, top]) for (let y = 0; y < 30; y++) { const w = Math.round(80 * Math.sqrt(1 - ((30 - y) / 30) ** 2)); t.rect(l ? px + 80 - w : px, py - 16 + y, w, 1, y < 2 ? EDGE : y % 6 === 5 ? mul(blue, 0.8) : blue); } });
      p.paint(4.1, (c, top) => { top.rect(16 * T, -16, 3 * T, 14, blue); top.box(16 * T - 2, -2, 3 * T + 4, 12, [214, 222, 236], EDGE); star(top, 17.5 * T, 4, 5, [250, 226, 90]); });
      boat(p, 21, 28, [240, 240, 244]); boat(p, 10, 26, berry);
      flag(p, 14, 21, berry); flag(p, 20, 21, berry); flag(p, 9, 6, berry); flag(p, 25, 6, berry);
      for (const [x, y] of [[10, 9], [24, 9], [10, 21], [24, 21], [6, 14], [28, 14]]) palm(p, x, y);
      for (const [x, y] of [[14, 6], [20, 6], [12, 17], [22, 17]]) lamp(p, x, y, [150, 220, 250]);
      p.decor("fountain", 11, 11); p.decor("fountain", 22, 11); p.decor("bench", 13, 19); p.decor("bench", 21, 19);
      fence(p, 8, 24, 15, 24, [150, 160, 184]); fence(p, 19, 24, 26, 24, [150, 160, 184]);
    },
  },
  // Terarium, Savanna Biome: golden grassland under the dome. Flat-topped trees, a waterhole, kopjes of
  // red rock and worn game tracks.
  PaldeaSavannaBiome: {
    theme: { tree: "boulder", density: 0.03, groves: 0, flowers: 0, water: "water" },
    plan(p) {
      p.disc("beach", 8.5, 21.5, 5.5, 4); p.disc("water", 8.5, 21.5, 4, 2.6);
      p.disc("rock", 26, 8, 3.5, 2.5); p.disc("rock", 6, 6, 2.5, 2); p.disc("rock", 26.5, 24.5, 2.5, 2);
      p.street("dirt", 2, [[17, 29], [17, 25], [22, 25], [22, 19], [14, 19], [14, 16], [14, 10], [20, 10], [20, 5], [17, 5], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [14, 16]]); p.street("dirt", 1, [[15, 16], [32, 16]]); p.street("dirt", 1, [[13, 21], [14, 21]]);
      face(p, 23, 9, 29, 10, [190, 120, 84]); face(p, 4, 7, 8, 7, [190, 120, 84]); face(p, 24, 25, 28, 26, [190, 120, 84]);
      trialGate(p, 1, [240, 180, 70]);
      for (const [x, y] of [[10, 6], [5, 12], [23, 13], [29, 14], [11, 27], [26, 19], [3, 27], [23, 3], [12, 13], [19, 22], [30, 28], [16, 7]]) acacia(p, x, y);
      p.decor("board", 19, 27);
    },
  },
  // Terarium, Coastal Biome: a tropical shore. Surf along the south and east, a lagoon behind the beach,
  // palms, parasols and sea stacks.
  PaldeaCoastalBiome: {
    theme: { ground: "beach", road: "sand", border: "palms", tree: "boulder", sea: null, density: 0.02, groves: 0, flowers: 0 },
    plan(p) {
      p.fill("grass", 1, 1, 22, 11); p.fill("grass", 1, 12, 9, 14);
      for (let y = 1; y <= 30; y++) { const sx = 26 + Math.round(1.5 * Math.sin(y / 2.6)); p.fill("water", sx, y, 32, y); }
      for (let x = 1; x <= 32; x++) { const sy = 26 + Math.round(1.2 * Math.cos(x / 2.9)); if (x < 15 || x > 19) p.fill("water", x, sy, x, 30); }
      p.disc("water", 8, 20, 4.5, 2.8);
      p.disc("rock", 29.5, 5.5, 1.5, 1.5); p.disc("rock", 30, 22, 1.2, 1.5); p.disc("rock", 5.5, 28.5, 1.5, 1);
      p.street("sand", 2, [[17, 29], [17, 23], [21, 23], [21, 16], [13, 16], [13, 8], [17, 8], [17, 1]]);
      p.street("sand", 1, [[1, 16], [13, 16]]); p.street("deck", 1, [[22, 16], [32, 16]]);
      for (const [x, y] of [[3, 17], [5, 23], [12, 23], [11, 18], [23, 20], [24, 12], [23, 4], [15, 12], [19, 12], [10, 13], [24, 24], [14, 25]]) palm(p, x, y);
      trialGate(p, 1, [80, 170, 240]);
      umbrella(p, 19, 20, [226, 80, 70]); umbrella(p, 23, 9, [70, 130, 200]); umbrella(p, 15, 21, [240, 200, 80]);
      p.fill("flowersRed", 3, 3, 8, 4); p.fill("flowersPink", 19, 3, 21, 5);
      boat(p, 28, 12, [240, 200, 60]); p.decor("board", 19, 26);
    },
  },
  // Terarium, Canyon Biome: red mesas and a dry gorge. Stepped tablelands with banded walls, a stone arch
  // over the track, cacti on the flats.
  PaldeaCanyonBiome: {
    theme: { ground: "clay", road: "dirt", border: "rock", tree: "boulder", density: 0.04, groves: 0, flowers: 0 },
    plan(p) {
      const redrock = [200, 118, 78];
      p.fill("rock", 1, 1, 12, 7); p.fill("rock", 22, 1, 32, 5); p.fill("rock", 21, 9, 32, 13); p.fill("rock", 1, 19, 11, 23); p.fill("rock", 23, 20, 32, 24); p.fill("rock", 1, 27, 8, 30); p.fill("rock", 26, 27, 32, 30);
      p.fill("rock", 1, 10, 5, 13);
      p.street("dirt", 2, [[17, 29], [17, 25], [13, 25], [13, 21], [20, 21], [20, 16], [9, 16], [9, 9], [17, 9], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [9, 16]]); p.street("dirt", 1, [[21, 16], [32, 16]]);
      face(p, 1, 4, 12, 7, redrock); face(p, 22, 3, 32, 5, redrock); face(p, 21, 11, 32, 13, redrock); face(p, 1, 21, 11, 23, redrock); face(p, 23, 22, 32, 24, redrock); face(p, 1, 29, 8, 30, redrock); face(p, 26, 29, 32, 30, redrock); face(p, 1, 12, 5, 13, redrock);
      // The natural arch over the track.
      for (const gx of [15, 20]) prop(p, gx, 5, 1, 2, (c, px, py, top) => { for (const t of [c, top]) { t.box(px + 1, py - 20, 14, 52, redrock, EDGE); t.rect(px + 2, py - 19, 12, 2, mul(redrock, 1.3)); for (let y = -12; y < 28; y += 7) t.rect(px + 2, py + y, 12, 1, mul(redrock, 0.75)); } });
      p.paint(7.2, (c, top) => { top.box(15 * T + 1, 5 * T - 34, 6 * T - 2, 16, redrock, EDGE); top.rect(15 * T + 2, 5 * T - 33, 6 * T - 4, 2, mul(redrock, 1.3)); top.rect(15 * T + 2, 5 * T - 26, 6 * T - 4, 1, mul(redrock, 0.75)); arch(top, 18 * T, 5 * T - 17, 30, 6, [0, 0, 0, 40]); });
      for (const [x, y] of [[14, 13], [5, 15], [24, 17], [28, 18], [15, 23], [21, 27], [11, 28], [18, 12], [7, 25]]) cactus(p, x, y);
      for (const [x, y] of [[12, 11], [24, 7]]) p.decor("boulder", x, y);
      trialGate(p, 1, [230, 110, 70]);
      p.decor("board", 19, 27);
    },
  },
  // Terarium, Polar Biome: snowfields and blue ice. A frozen lake with floes, ice spires, glacier walls and
  // a trail of packed snow.
  PaldeaPolarBiome: {
    theme: { density: 0.05, groves: 0.05, water: "water" },
    plan(p) {
      const ice = [176, 214, 240];
      p.fill("rock", 1, 1, 10, 6); p.fill("rock", 24, 1, 32, 4); p.fill("rock", 26, 20, 32, 30); p.fill("rock", 1, 26, 7, 30);
      face(p, 1, 1, 10, 6, ice); face(p, 24, 1, 32, 4, ice); face(p, 26, 20, 32, 30, ice); face(p, 1, 26, 7, 30, ice);
      p.disc("frost", 23, 12, 7, 4.5); p.disc("water", 23, 12, 6, 3.5);
      p.disc("frost", 7, 21.5, 5, 3); p.disc("water", 7, 21.5, 3.5, 1.8);
      p.street("frost", 2, [[17, 29], [17, 25], [21, 25], [21, 19], [13, 19], [13, 16], [13, 8], [17, 8], [17, 1]]);
      p.street("frost", 1, [[1, 16], [13, 16]]); p.street("frost", 1, [[14, 16], [32, 16]]);
      decal(p, (c) => { for (const [x, y, r] of [[20, 11, 9], [24, 13, 11], [26, 10.5, 7], [22, 14, 6], [7, 21.5, 9]]) { c.ellipse(x * T, y * T, r + 1, r * 0.6 + 1, [150, 190, 226]); c.ellipse(x * T, y * T - 1, r, r * 0.6, [240, 248, 255]); } }, 0.6);
      trialGate(p, 1, [170, 220, 250]);
      [[11, 9], [10, 11], [15, 12], [19, 6], [21, 5], [5, 13], [3, 10], [24, 18], [15, 22], [11, 27], [23, 27], [29, 17], [9, 17], [20, 22]].forEach(([x, y], k) => crystal(p, x, y, k % 2 ? [190, 226, 250] : [150, 200, 240]));
      p.decor("board", 19, 27);
    },
  },
};
