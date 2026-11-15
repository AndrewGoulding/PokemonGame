// Paldea interiors: the eight Gyms, the Academy, the League, Team Star's garages, Area Zero and the
// Kitakami / Blueberry rooms. Rooms use the "Rooms" calls of README.md; caves use the town calls.
"use strict";
const S = 16;
const mix = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const lite = (c, f) => [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f];
const WHITE = [250, 250, 255], INK = [40, 36, 48];
const shadow = (c, cx, by, rx) => c.ellipse(cx, by, rx, Math.max(2, rx / 3), [0, 0, 0, 60]);

const frame = (c, x, y, w, h, col) => { c.rect(x, y, w, 1, col); c.rect(x, y + h - 1, w, 1, col); c.rect(x, y + 1, 1, h - 2, col); c.rect(x + w - 1, y + 1, 1, h - 2, col); };
// A solid prop on tiles (x, y, w, h): draw(c, top, X, Y, W, H) in pixels. Only its bottom `rows` rows are solid.
function prop(p, x, y, w, h, draw, rows = h) {
  if (rows > 0) p.block(x, y + h - rows, w, rows);
  p.paint(y + h, (c, top) => draw(c, top, x * S, y * S, w * S, h * S));
}
// A painted floor of two-tone tiles.
function tiles(p, x0, y0, x1, y1, a, b = a, z = 0.1, skip = null) {
  p.paint(z, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (skip && skip(x, y)) continue; const col = (x + y) & 1 ? a : b; c.rect(x * S, y * S, S, S, col); c.rect(x * S, y * S + 15, S, 1, mix(col, 0.92)); c.rect(x * S + 15, y * S, 1, S, mix(col, 0.92)); } });
}
// A plank floor.
function planks(p, x0, y0, x1, y1, col, z = 0.1) {
  p.paint(z, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const f = 0.94 + p.hash(x, y, 5) * 0.1; c.rect(x * S, y * S, S, S, mix(col, f)); c.rect(x * S, y * S + 7, S, 1, mix(col, 0.82)); c.rect(x * S, y * S + 15, S, 1, mix(col, 0.82)); c.rect(x * S + ((x * 7 + y * 5) % 11) + 2, y * S, 1, 7, mix(col, 0.82)); c.rect(x * S + ((x * 3 + y * 11) % 12) + 1, y * S + 8, 1, 7, mix(col, 0.82)); } });
}
// A lined battle court over tiles x0..x1, y0..y1; the trainers stand left and right (or top and bottom).
function court(p, x0, y0, x1, y1, col, o = {}) {
  p.paint(o.z || 0.5, (c) => {
    const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, ln = o.line || [250, 250, 255, 230], cx = X + w / 2, cy = Y + h / 2, r = o.r || 22;
    if (col) c.rect(X, Y, w, h, col);
    if (o.under) o.under(c, X, Y, w, h, cx, cy);
    c.rect(X, Y, w, 2, ln); c.rect(X, Y + h - 2, w, 2, ln); c.rect(X, Y, 2, h, ln); c.rect(X + w - 2, Y, 2, h, ln);
    if (o.vertical) { c.rect(X, cy - 1, w, 2, ln); frame(c, cx - 14, Y + 6, 28, 14, ln); frame(c, cx - 14, Y + h - 20, 28, 14, ln); }
    else { c.rect(cx - 1, Y, 2, h, ln); frame(c, X + 6, cy - 14, 14, 28, ln); frame(c, X + w - 20, cy - 14, 14, 28, ln); }
    c.ellipse(cx, cy, r, r, ln, 3);
    if (o.emblem) o.emblem(c, cx, cy); else { c.ellipse(cx, cy, 8, 8, ln); c.rect(cx - 8, cy - 1, 16, 2, INK); c.ellipse(cx, cy, 3, 3, o.dot || [220, 70, 70]); }
  });
}
// ---- small painted things; (cx, by) is the middle of the base in pixels.
function cake(c, cx, by, icing = [250, 160, 185], sponge = [250, 232, 196]) {
  shadow(c, cx, by - 1, 15); c.ellipse(cx, by - 3, 15, 5, [226, 226, 238]);
  for (const [w, y, h] of [[12, by - 5, 10], [8, by - 15, 8], [5, by - 23, 7]]) { c.rect(cx - w, y - h, w * 2, h, sponge); c.ellipse(cx, y, w, 3, mix(sponge, 0.86)); c.ellipse(cx, y - h, w, 3, icing); for (let i = -w + 1; i < w - 1; i += 4) c.rect(cx + i, y - h, 2, 4, icing); }
  c.ellipse(cx, by - 32, 3, 3, [220, 50, 60]); c.rect(cx - 1, by - 34, 1, 1, WHITE);
}
function donuts(c, cx, by) { shadow(c, cx, by, 9); [[250, 150, 180], [150, 100, 70], [250, 220, 120], [170, 220, 250]].forEach((col, i) => { const y = by - 3 - i * 6; c.ellipse(cx, y, 8, 4, [214, 160, 96]); c.ellipse(cx, y - 1, 8, 3, col); c.ellipse(cx, y - 1, 2, 1, [150, 100, 60]); }); }
function cafeTable(c, cx, by, cloth = [250, 250, 250], shade = null) {
  shadow(c, cx, by, 11);
  for (const dx of [-11, 11]) { c.box(cx + dx - 3, by - 10, 6, 8, [200, 150, 100], [110, 70, 50]); }
  c.rect(cx - 1, by - 10, 2, 9, [120, 90, 70]); c.ellipse(cx, by - 11, 9, 5, mix(cloth, 0.8)); c.ellipse(cx, by - 12, 9, 5, cloth); c.ellipse(cx - 2, by - 12, 2, 1, [230, 120, 140]); c.ellipse(cx + 3, by - 13, 2, 1, [150, 110, 70]);
  if (shade) { c.rect(cx - 1, by - 34, 2, 22, [120, 100, 90]); c.poly([[cx - 16, by - 26], [cx, by - 38], [cx + 16, by - 26]], shade); for (let i = -12; i < 16; i += 8) c.poly([[cx + i - 4, by - 26], [cx, by - 38], [cx + i, by - 26]], WHITE); c.rect(cx - 16, by - 26, 32, 2, mix(shade, 0.8)); }
}
function diner(c, cx, by, wood = [150, 96, 60]) {   // a square table with two chairs, 2 tiles wide
  shadow(c, cx, by, 15);
  for (const dx of [-14, 9]) { c.box(cx + dx, by - 16, 6, 13, mix(wood, 0.8), mix(wood, 0.45)); c.rect(cx + dx + 1, by - 9, 4, 3, [190, 60, 60]); }
  c.box(cx - 8, by - 16, 16, 13, wood, mix(wood, 0.45)); c.rect(cx - 7, by - 15, 14, 2, lite(wood, 0.25)); c.rect(cx - 6, by - 3, 2, 3, mix(wood, 0.5)); c.rect(cx + 4, by - 3, 2, 3, mix(wood, 0.5));
  c.ellipse(cx - 3, by - 10, 3, 2, WHITE); c.ellipse(cx + 3, by - 9, 2, 2, [240, 240, 240]); c.rect(cx + 2, by - 10, 3, 1, INK);
}
function speaker(c, cx, by, h = 30, col = [44, 42, 56]) { shadow(c, cx, by, 9); c.box(cx - 8, by - h, 16, h, col, [16, 14, 24]); for (let y = by - h + 8; y < by - 2; y += 13) { c.ellipse(cx, y, 5, 5, [20, 18, 28]); c.ellipse(cx, y, 3, 3, [90, 90, 110]); c.ellipse(cx, y, 1, 1, [20, 18, 28]); } }
function screen(c, x, y, w, h, col, draw) { c.box(x - 2, y - 2, w + 4, h + 4, [30, 28, 40], [12, 10, 20]); c.rect(x, y, w, h, mix(col, 0.35)); for (let j = y; j < y + h; j += 2) c.rect(x, j, w, 1, mix(col, 0.45)); if (draw) draw(c, x, y, w, h); c.rect(x, y, w, 1, lite(col, 0.5)); c.rect(x - 4, y - 4, w + 8, h + 8, [col[0], col[1], col[2], 28]); }
function bolt(c, cx, cy, s, col) { c.poly([[cx + 2 * s, cy - 8 * s], [cx - 5 * s, cy + 1 * s], [cx - 1 * s, cy + 1 * s], [cx - 3 * s, cy + 8 * s], [cx + 5 * s, cy - 2 * s], [cx + 1 * s, cy - 2 * s]], col); }
function star(c, cx, cy, r, col) { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k & 1 ? r * 0.42 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } c.poly(pts, col); }
function heart(c, cx, cy, r, col) { c.ellipse(cx - r / 2, cy - r / 3, r / 2 + 1, r / 2 + 1, col); c.ellipse(cx + r / 2, cy - r / 3, r / 2 + 1, r / 2 + 1, col); c.poly([[cx - r - 1, cy - r / 6], [cx + r + 1, cy - r / 6], [cx, cy + r]], col); }
function crystal(c, cx, by, s, col) {   // a cluster of Tera crystals
  c.ellipse(cx, by - 1, 9 * s, 3 * s, [0, 0, 0, 70]);
  for (const [dx, w, h, f] of [[-6, 4, 14, 0.8], [6, 4, 17, 0.7], [0, 5, 26, 1]]) { const x = cx + dx * s, t = by - h * s; c.poly([[x - w * s, by - 2], [x - w * s, t + 5 * s], [x, t], [x + w * s, t + 5 * s], [x + w * s, by - 2]], mix(col, f)); c.poly([[x - w * s, by - 2], [x - w * s, t + 5 * s], [x, t], [x, by - 2]], lite(mix(col, f), 0.35)); c.line(x, t, x, by - 3, lite(col, 0.75)); }
  c.ellipse(cx, by - 12 * s, 14 * s, 14 * s, [col[0], col[1], col[2], 26]);
}
function pine(c, top, cx, by, snow = true) {
  shadow(c, cx, by, 11); c.rect(cx - 2, by - 8, 4, 8, [96, 66, 44]);
  for (const [w, y] of [[13, by - 6], [11, by - 15], [8, by - 24], [5, by - 32]]) { const g = y < by - 16 ? top : c; g.poly([[cx - w, y], [cx, y - 13], [cx + w, y]], [40, 96, 76]); g.poly([[cx - w, y], [cx, y - 13], [cx, y]], [56, 122, 92]); if (snow) { g.poly([[cx - w * 0.6, y - 5], [cx, y - 13], [cx + w * 0.6, y - 5], [cx + 2, y - 7], [cx - 3, y - 6]], [244, 248, 255]); } }
}
function mound(c, cx, by, rx, col = [244, 248, 255]) { c.ellipse(cx + 2, by - 2, rx, rx * 0.5, mix(col, 0.82)); c.ellipse(cx, by - 4, rx, rx * 0.5, col); c.ellipse(cx - rx * 0.3, by - 5 - rx * 0.15, rx * 0.4, rx * 0.15, WHITE); }
function tulip(c, cx, by, col) { c.rect(cx, by - 9, 1, 9, [70, 150, 80]); c.rect(cx - 2, by - 5, 2, 1, [70, 150, 80]); c.rect(cx - 2, by - 13, 5, 4, col); c.rect(cx - 2, by - 14, 1, 1, col); c.rect(cx, by - 14, 1, 1, col); c.rect(cx + 2, by - 14, 1, 1, col); }
function planter(c, X, Y, w, cols) { c.box(X + 1, Y + 6, w - 2, 9, [200, 150, 110], [110, 70, 50]); c.rect(X + 2, Y + 6, w - 4, 2, [90, 60, 40]); for (let i = 4, k = 0; i < w - 3; i += 5, k++) tulip(c, X + i, Y + 8, cols[k % cols.length]); }
function crowd(c, X, Y, w, h, seed, p) {   // rows of heads
  for (let y = Y + 4; y < Y + h - 2; y += 9) for (let x = X + 2 + ((y / 9) & 1) * 4; x < X + w - 6; x += 9) {
    const k = p.hash(x, y, seed), col = [[240, 200, 90], [220, 90, 90], [90, 150, 230], [120, 200, 130], [200, 120, 220], [240, 240, 240]][Math.floor(k * 6)], hair = [[60, 44, 40], [120, 80, 50], [230, 200, 110], [40, 40, 60]][Math.floor(p.hash(y, x, seed) * 4)];
    c.rect(x, y + 5, 7, 5, col); c.ellipse(x + 3.5, y + 3, 3, 3, [244, 204, 170]); c.rect(x + 1, y, 6, 2, hair); if (k > 0.6) c.rect(x + (k > 0.8 ? -2 : 7), y - 2, 2, 7, col);
  }
}
function beam(top, x, y, x2, y2, r, col) { top.poly([[x - 2, y], [x + 2, y], [x2 + r, y2], [x2 - r, y2]], [col[0], col[1], col[2], 34]); top.ellipse(x2, y2, r, r * 0.4, [col[0], col[1], col[2], 40]); }
function easel(c, cx, by, pic) { shadow(c, cx, by, 8); c.line(cx - 7, by, cx - 3, by - 24, [120, 84, 54], 2); c.line(cx + 7, by, cx + 3, by - 24, [120, 84, 54], 2); c.box(cx - 8, by - 24, 16, 16, [250, 246, 236], [120, 84, 54]); pic(c, cx - 6, by - 22); }
function sunflora(c, cx, by, s = 1, stone = false) {   // one of Brassius's sunflower statues
  const pet = stone ? [200, 196, 180] : [250, 210, 70], face = stone ? [230, 226, 210] : [250, 236, 170], stem = stone ? [160, 156, 140] : [80, 160, 80];
  shadow(c, cx, by, 10 * s); c.box(cx - 8 * s, by - 5, 16 * s, 5, [170, 166, 176], [90, 86, 100]);
  c.rect(cx - 2, by - 18 * s, 4, 14 * s, stem); c.poly([[cx - 2, by - 9 * s], [cx - 11 * s, by - 16 * s], [cx - 2, by - 13 * s]], stem); c.poly([[cx + 2, by - 9 * s], [cx + 11 * s, by - 16 * s], [cx + 2, by - 13 * s]], stem);
  for (let a = 0; a < 10; a++) c.ellipse(cx + Math.cos(a * 0.628) * 9 * s, by - 26 * s + Math.sin(a * 0.628) * 9 * s, 4 * s, 4 * s, pet);
  c.ellipse(cx, by - 26 * s, 7 * s, 7 * s, face); c.rect(cx - 3 * s, by - 28 * s, 2, 2, INK); c.rect(cx + 2 * s, by - 28 * s, 2, 2, INK); c.rect(cx - 2 * s, by - 24 * s, 4 * s, 1, INK);
}
function stall(c, X, Y, w, col, goods) {   // a market stall: awning over a counter of crates
  const b = Y + 32; c.rect(X + 2, b - 1, w - 2, 3, [0, 0, 0, 50]);
  c.box(X + 1, b - 14, w - 2, 14, [176, 130, 84], [90, 60, 40]); for (let i = X + 3; i < X + w - 8; i += 11) { c.box(i, b - 20, 10, 8, [150, 106, 66], [90, 60, 40]); for (let k = 0; k < 3; k++) c.ellipse(i + 2 + k * 3, b - 20, 2, 2, goods[(k + ((i / 11) | 0)) % goods.length]); }
  c.rect(X + 2, b - 34, 2, 22, [110, 80, 60]); c.rect(X + w - 4, b - 34, 2, 22, [110, 80, 60]);
  c.rect(X, b - 38, w, 9, col); for (let i = X; i < X + w; i += 8) c.rect(i, b - 38, 4, 9, WHITE); for (let i = X; i < X + w; i += 4) c.ellipse(i + 2, b - 29, 2, 2, (i / 4) & 1 ? col : WHITE); c.rect(X, b - 39, w, 1, mix(col, 0.7));
}
function banner(c, cx, y, w, h, col, emblem) { c.rect(cx - w / 2 - 1, y - 2, w + 2, 2, [90, 80, 80]); c.poly([[cx - w / 2, y], [cx + w / 2, y], [cx + w / 2, y + h], [cx, y + h - 5], [cx - w / 2, y + h]], col); c.rect(cx - w / 2, y, 2, h - 2, lite(col, 0.25)); if (emblem) emblem(c, cx, y + h / 2 - 2); }

function sofa(c, X, Y, col) { c.rect(X + 2, Y + 30, 46, 3, [0, 0, 0, 50]); c.box(X, Y + 8, 48, 22, col, mix(col, 0.6)); c.box(X + 4, Y + 16, 40, 12, lite(col, 0.4), mix(col, 0.6)); c.rect(X + 24, Y + 16, 1, 12, mix(col, 0.6)); }
function decks(c, X, Y, body, a, b) { c.rect(X + 2, Y + 30, 60, 3, [0, 0, 0, 60]); c.box(X, Y + 10, 64, 21, body, [20, 16, 34]); c.rect(X + 1, Y + 11, 62, 3, a); for (const dx of [14, 50]) { c.ellipse(X + dx, Y + 8, 10, 5, [30, 28, 40]); c.ellipse(X + dx, Y + 8, 7, 3, [70, 70, 90]); c.ellipse(X + dx, Y + 8, 2, 1, b); } c.box(X + 26, Y + 2, 12, 9, [200, 200, 214], [60, 60, 80]); c.rect(X + 28, Y + 4, 8, 5, b); star(c, X + 32, Y + 22, 6, b); }
function flame(c, cx, by, s) { c.poly([[cx - 5 * s, by], [cx - 6 * s, by - 6 * s], [cx - 2 * s, by - 9 * s], [cx, by - 16 * s], [cx + 3 * s, by - 9 * s], [cx + 6 * s, by - 5 * s], [cx + 5 * s, by]], [240, 110, 40]); c.poly([[cx - 3 * s, by], [cx - 3 * s, by - 5 * s], [cx, by - 10 * s], [cx + 3 * s, by - 4 * s], [cx + 3 * s, by]], [250, 210, 80]); c.ellipse(cx, by - 6 * s, 9 * s, 9 * s, [250, 180, 80, 40]); }
function brazier(c, cx, by) { shadow(c, cx, by, 7); c.rect(cx - 1, by - 10, 2, 10, [90, 80, 80]); c.rect(cx - 5, by - 1, 10, 2, [90, 80, 80]); c.poly([[cx - 7, by - 14], [cx + 7, by - 14], [cx + 4, by - 9], [cx - 4, by - 9]], [70, 60, 66]); flame(c, cx, by - 14, 1); }
function vat(c, cx, by, goo = [130, 220, 90]) { shadow(c, cx, by, 8); c.box(cx - 7, by - 16, 14, 16, [120, 110, 136], [50, 44, 66]); c.rect(cx - 7, by - 11, 14, 1, [50, 44, 66]); c.rect(cx - 7, by - 5, 14, 1, [50, 44, 66]); c.ellipse(cx, by - 16, 7, 3, goo); c.ellipse(cx - 2, by - 19, 2, 2, goo); c.ellipse(cx + 3, by - 22, 1, 1, goo); c.rect(cx + 5, by - 14, 2, 6, goo); }
function tyres(c, cx, by, n = 3) { shadow(c, cx, by, 9); for (let i = 0; i < n; i++) { c.ellipse(cx, by - 3 - i * 6, 8, 4, [26, 24, 34]); c.ellipse(cx, by - 4 - i * 6, 8, 4, [50, 48, 60]); c.ellipse(cx, by - 4 - i * 6, 4, 2, [20, 18, 26]); } }
function starmobile(c, X, Y, col, acc) {   // 6 x 4 tiles
  c.ellipse(X + 48, Y + 60, 46, 5, [0, 0, 0, 70]);
  for (const dx of [14, 82]) { c.ellipse(X + dx, Y + 50, 11, 12, [26, 24, 34]); c.ellipse(X + dx, Y + 50, 6, 7, [90, 90, 104]); c.ellipse(X + dx, Y + 50, 2, 2, acc); }
  for (const dx of [5, 85]) { c.box(X + dx, Y + 2, 6, 36, [150, 150, 166], [60, 60, 76]); c.rect(X + dx, Y + 2, 6, 3, acc); c.ellipse(X + dx + 3, Y - 2, 4, 3, [200, 200, 210, 120]); }
  c.box(X + 12, Y + 20, 72, 34, col, mix(col, 0.45)); c.rect(X + 13, Y + 21, 70, 4, lite(col, 0.35)); c.rect(X + 13, Y + 46, 70, 7, mix(col, 0.75));
  c.box(X + 16, Y + 10, 64, 11, [50, 46, 62], [20, 18, 30]); for (let i = X + 18; i < X + 80; i += 6) c.rect(i, Y + 4, 1, 7, [170, 170, 190]); c.rect(X + 16, Y + 4, 64, 1, [170, 170, 190]);
  c.ellipse(X + 48, Y + 38, 16, 13, [110, 110, 126]); c.ellipse(X + 48, Y + 37, 14, 11, [176, 176, 192]);
  for (const dx of [42, 54]) { c.ellipse(X + dx, Y + 34, 3, 3, [250, 220, 90]); c.rect(X + dx - 1, Y + 33, 2, 3, INK); }
  c.rect(X + 40, Y + 41, 16, 4, INK); c.rect(X + 44, Y + 43, 8, 5, [230, 90, 110]);
  for (const dx of [25, 64]) { c.box(X + dx, Y + 28, 7, 16, [150, 150, 166], [60, 60, 76]); c.rect(X + dx + 1, Y + 28, 5, 3, acc); }
  for (const dx of [19, 77]) { c.ellipse(X + dx, Y + 48, 4, 4, [255, 244, 170]); star(c, X + dx, Y + 31, 5, acc); }
  c.box(X + 10, Y + 54, 76, 6, [60, 60, 76], [20, 18, 30]);
  c.rect(X + 47, Y - 16, 2, 22, [150, 150, 166]); c.rect(X + 49, Y - 16, 20, 12, col); frame(c, X + 49, Y - 16, 20, 12, mix(col, 0.5)); star(c, X + 59, Y - 10, 5, WHITE);
}

function hex(c, cx, cy, r, col, sq = 0.8) { const pts = []; for (let k = 0; k < 6; k++) pts.push([cx + Math.cos(k * Math.PI / 3) * r, cy + Math.sin(k * Math.PI / 3) * r * sq]); c.poly(pts, col); }
function pillar(c, X, Y, col = [200, 198, 210]) { c.ellipse(X + 8, Y + 13, 8, 4, [0, 0, 0, 70]); c.box(X + 2, Y - 14, 12, 28, mix(col, 0.86), [70, 70, 86]); c.rect(X + 4, Y - 12, 3, 24, lite(col, 0.5)); c.box(X, Y - 18, 16, 6, col, [70, 70, 86]); c.box(X, Y + 10, 16, 5, mix(col, 0.75), [70, 70, 86]); }
function berry(c, cx, cy, r) { c.ellipse(cx, cy + 1, r, r, [60, 90, 200]); c.ellipse(cx - r * 0.3, cy - r * 0.2, r * 0.4, r * 0.4, [130, 160, 250]); c.poly([[cx - 1, cy - r], [cx + r * 0.7, cy - r * 1.5], [cx + 2, cy - r * 0.6]], [110, 200, 110]); star(c, cx, cy + 2, r * 0.5, WHITE); }

function stalagmite(c, cx, by, h, col = [126, 90, 76]) { c.ellipse(cx, by - 1, h * 0.4, 3, [0, 0, 0, 60]); c.poly([[cx - h * 0.33, by], [cx - 1, by - h], [cx + h * 0.33, by]], mix(col, 0.7)); c.poly([[cx - h * 0.33, by], [cx - 1, by - h], [cx, by]], col); c.line(cx - 1, by - h, cx - h * 0.12, by - 3, lite(col, 0.4)); }
// Carve a cave: everything inside the rim is rock, then the chambers (discs [cx, cy, rx, ry]) and passages
// ([width, [[x, y], ...]]) are opened in `floor`. Rock faces are painted where rock stands over open ground.
function carve(p, discs, passages = [], floor = "ground", rock = [150, 104, 80]) {
  const W = p.W, H = p.H, open = new Uint8Array(W * H), at = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && open[y * W + x];
  p.fill("border", 1, 1, W - 2, H - 2);
  const cell = (x, y) => { if (x < 2 || y < 2 || x > W - 3 || y > H - 3) return; open[y * W + x] = 1; p.fill(floor, x, y, x, y); };
  for (const [cx, cy, rx, ry0] of discs) { const ry = ry0 == null ? rx : ry0; for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) cell(x, y); }
  for (const [w, pts] of passages) for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1]; for (let y = Math.min(ay, by) - ((w - 1) >> 1); y <= Math.max(ay, by) + (w >> 1); y++) for (let x = Math.min(ax, bx) - ((w - 1) >> 1); x <= Math.max(ax, bx) + (w >> 1); x++) cell(x, y); }
  for (const w of p.warps) { open[w.y * W + w.x] = 1; }
  p.paint(0.05, (c) => { for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (at(x, y)) continue; const px = x * S, py = y * S;
      if (at(x, y + 1)) { c.rect(px, py, S, S, rock); for (let i = 0; i < 4; i++) { const k = Math.floor(p.hash(x * 4 + i, y, 12) * 4); c.rect(px + i * 4 + k % 3, py + 3 + k, 1, 9 - k, mix(rock, 0.74)); c.rect(px + i * 4 + 2, py + 5, 1, 4 + k, lite(rock, 0.18)); } c.rect(px, py, S, 3, lite(rock, 0.3)); c.rect(px, py + 13, S, 3, mix(rock, 0.6)); }
      else { if (at(x + 1, y)) c.rect(px + 12, py, 4, S, mix(rock, 0.62)); if (at(x - 1, y)) c.rect(px, py, 4, S, mix(rock, 0.62)); if (at(x, y - 1)) c.rect(px, py, S, 4, mix(rock, 0.62)); } } });
  // Ground of another kind (or water), only where the cave is open.
  const lay = (kind, cx, cy, rx, ry = rx) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (at(x, y) && ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) p.fill(kind, x, y, x, y); };
  return { at, lay };
}

const R = {};

// ---------------------------------------------------------------- the eight Gyms
// Cortondo: Katy's patisserie. The shop counter of cakes along the back, a pistachio court, giant sweets.
R.PaldeaCortondoGym = {
  theme: { room: "arena", floor: "rHouse", wall: null },
  plan(p) {
    tiles(p, 1, 4, 22, 19, [250, 240, 222], [246, 222, 214]);
    // The shop front: striped awning, shelves of bread, glass cases of cakes.
    p.block(1, 4, 22, 2);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 2 * S, w, 4 * S, [244, 226, 196]); c.rect(X, 2 * S, w, 3, [150, 100, 70]);
      for (let x = X + 6; x < X + w - 30; x += 44) { if (x > 9 * S && x < 13 * S) continue; c.box(x, 2 * S + 16, 36, 20, [120, 80, 56], [80, 50, 36]); for (let j = 0; j < 2; j++) { c.rect(x + 2, 2 * S + 25 + j * 9, 32, 1, [200, 160, 110]); for (let i = 0; i < 5; i++) c.ellipse(x + 5 + i * 6.5, 2 * S + 22 + j * 9, 3, 2, [[226, 170, 90], [200, 130, 70], [240, 200, 130]][(i + j + x) % 3]); } }
      c.box(10 * S + 4, 2 * S + 12, 56, 52, [96, 64, 48], [60, 40, 30]); c.rect(10 * S + 8, 2 * S + 16, 48, 48, [60, 44, 40]); c.box(10 * S + 14, 2 * S + 20, 36, 12, [250, 240, 222], [150, 100, 70]); for (let i = 0; i < 4; i++) c.rect(10 * S + 18 + i * 8, 2 * S + 25, 5, 2, [220, 120, 140]);
      for (let x = X; x < X + w; x += 8) { c.rect(x, 2 * S + 3, 8, 10, (x / 8) & 1 ? [250, 150, 175] : WHITE); c.ellipse(x + 4, 2 * S + 13, 4, 3, (x / 8) & 1 ? [250, 150, 175] : WHITE); }
      for (const [x0, x1] of [[X + 4, 10 * S], [14 * S, X + w - 4]]) { c.box(x0, 4 * S + 6, x1 - x0, 26, [214, 236, 244], [150, 100, 70]); c.rect(x0 + 1, 4 * S + 7, x1 - x0 - 2, 3, WHITE); c.rect(x0 + 1, 4 * S + 20, x1 - x0 - 2, 2, [150, 100, 70]); c.rect(x0 + 1, 4 * S + 26, x1 - x0 - 2, 5, [200, 150, 110]);
        for (let x = x0 + 6, k = 0; x < x1 - 6; x += 10, k++) { const col = [[250, 160, 185], [250, 236, 180], [150, 100, 70], [170, 220, 150], [250, 250, 250]][k % 5]; c.rect(x - 3, 4 * S + 13, 7, 6, col); c.rect(x - 3, 4 * S + 13, 7, 2, lite(col, 0.5)); c.rect(x, 4 * S + 11, 1, 2, [220, 50, 60]); } }
    });
    court(p, 6, 9, 17, 15, [176, 214, 150, 235], { dot: [120, 180, 90], under: (c, X, Y, w, h) => { for (let y = Y; y < Y + h; y += 16) for (let x = X + ((y / 16) & 1) * 8; x < X + w; x += 16) c.ellipse(x + 4, y + 8, 3, 3, [200, 230, 170, 200]); } });
    for (const [x, col] of [[2, [250, 160, 185]], [20, [170, 210, 250]]]) prop(p, x, 7, 2, 3, (c, top, X, Y) => cake(c, X + 16, Y + 46, col), 2);
    for (const [x, y, sh] of [[2, 11, [250, 150, 175]], [20, 11, [250, 200, 110]], [2, 14, [170, 210, 250]], [20, 14, [250, 150, 175]]]) prop(p, x, y, 2, 2, (c, top, X, Y) => cafeTable(c, X + 16, Y + 30, WHITE, sh), 1);
    for (const x of [3, 20]) prop(p, x, 17, 1, 2, (c, top, X, Y) => donuts(c, X + 8, Y + 30), 1);
    for (const x of [9, 14]) prop(p, x, 17, 2, 2, (c, top, X, Y) => cake(c, X + 16, Y + 30, [200, 230, 160], [250, 240, 210]), 1);
    p.decor("rPlant", 1, 18, { optional: true }); p.decor("rPlant", 22, 18, { optional: true });
  },
};

// Artazon: Brassius's studio garden. A glasshouse wall, flower beds, his sunflower sculptures and easels round a turf court.
R.PaldeaArtazonGym = {
  theme: { room: "arena", floor: "lawn", wall: null },
  plan(p) {
    p.fill("flowersRed", 1, 4, 5, 5); p.fill("flowersPink", 6, 4, 9, 4); p.fill("flowersBlue", 18, 4, 22, 5); p.fill("flowersPink", 14, 4, 17, 4);
    p.fill("sand", 11, 16, 12, 19); p.fill("sand", 4, 16, 19, 16); p.fill("sand", 4, 8, 4, 16); p.fill("sand", 19, 8, 19, 16); p.fill("sand", 4, 8, 19, 8);
    p.paint(0.3, (c) => { const X = S, w = 22 * S, y = S + 6, h = 2 * S + 10;
      c.rect(X, y, w, h, [150, 214, 226]); for (let i = 0; i < 26; i++) { const x = X + p.hash(i, 1, 3) * (w - 16), r = 6 + p.hash(i, 2, 3) * 9; c.ellipse(x + 8, y + h - 2, r, r * 1.3, [70 + (i % 3) * 14, 150 + (i % 4) * 10, 90]); }
      for (let i = 0; i < 9; i++) { const x = X + 12 + i * 40 + p.hash(i, 5, 3) * 10; c.rect(x, y, 1, 8 + (i % 3) * 3, [90, 130, 80]); c.ellipse(x, y + 10 + (i % 3) * 3, 4, 3, [[250, 120, 120], [250, 220, 100], [200, 130, 230]][i % 3]); }
      c.rect(X, y, w, h, [255, 255, 255, 40]); for (let x = X; x <= X + w; x += 16) c.rect(Math.min(x, X + w - 2), y, 2, h, WHITE); c.rect(X, y, w, 3, WHITE); c.rect(X, y + 14, w, 1, WHITE); c.rect(X, y + h - 3, w, 3, [226, 226, 236]);
      for (let x = X + 3; x < X + w; x += 16) c.line(x, y + 26, x + 8, y + 18, [255, 255, 255, 120]);
    });
    court(p, 6, 10, 17, 14, [150, 206, 110, 200], { dot: [90, 170, 80], r: 20 });
    prop(p, 11, 4, 2, 3, (c, top, X, Y) => { c.box(X + 2, Y + 36, 28, 12, [190, 186, 196], [90, 86, 100]); sunflora(c, X + 16, Y + 40, 1.25); }, 2);
    prop(p, 2, 7, 2, 3, (c, top, X, Y) => sunflora(c, X + 16, Y + 46, 1), 1); prop(p, 2, 10, 2, 3, (c, top, X, Y) => sunflora(c, X + 16, Y + 46, 1, true), 1); prop(p, 2, 13, 2, 3, (c, top, X, Y) => sunflora(c, X + 16, Y + 46, 1), 1);
    const pics = [(c, x, y) => { c.rect(x, y, 12, 12, [140, 200, 240]); c.ellipse(x + 6, y + 6, 4, 4, [250, 210, 70]); c.rect(x, y + 9, 12, 3, [90, 170, 90]); }, (c, x, y) => { c.rect(x, y, 12, 12, [250, 236, 200]); c.rect(x + 1, y + 1, 5, 5, [220, 70, 70]); c.rect(x + 6, y + 6, 5, 5, [70, 110, 210]); c.rect(x + 6, y + 1, 5, 4, [250, 210, 70]); }, (c, x, y) => { c.rect(x, y, 12, 12, [90, 170, 110]); c.poly([[x + 1, y + 11], [x + 6, y + 2], [x + 11, y + 11]], [120, 90, 60]); c.ellipse(x + 6, y + 4, 3, 3, [60, 140, 70]); }];
    [[20, 6], [21, 10], [20, 14]].forEach(([x, y], i) => prop(p, x, y, 1, 2, (c, top, X, Y) => { easel(c, X + 8, Y + 30, pics[i]); for (let k = 0; k < 3; k++) c.box(X - 8 + k * 5, Y + 26, 4, 5, [[220, 70, 70], [70, 110, 210], [250, 210, 70]][k], [80, 70, 70]); }, 1));
    p.decor("tree1", 1, 17, { optional: true }); p.decor("tree1", 21, 17, { optional: true });
    for (const [x, y] of [[6, 18], [7, 18], [16, 18], [17, 18], [1, 6], [22, 6]]) p.decor("hedge", x, y, { optional: true });
  },
};
// Levincia: Iono's streaming studio. Three great screens, a lit stage, cameras and an electric court.
R.PaldeaLevinciaGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const cy = [90, 236, 250], pk = [250, 110, 200], yl = [250, 224, 90];
    tiles(p, 1, 4, 22, 19, [48, 46, 78], [42, 40, 70]); tiles(p, 1, 4, 22, 6, [84, 70, 130], [76, 64, 120], 0.12);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 0, w, 4 * S, [24, 22, 40]); c.rect(X, 4, w, 3, [70, 70, 90]); for (let x = X; x < X + w; x += 8) c.line(x, 4, x + 4, 10, [70, 70, 90]); c.rect(X, 10, w, 2, [70, 70, 90]);
      screen(c, 2 * S, 20, 5 * S + 8, 38, cy, (g, x, y, w2) => { for (let i = 0; i < 4; i++) { g.rect(x + 4, y + 5 + i * 8, 5, 5, [cy, pk, yl][i % 3]); g.rect(x + 12, y + 6 + i * 8, 30 + ((i * 17) % 30), 2, lite(cy, 0.6)); } heart(g, x + w2 - 10, y + 12, 5, pk); heart(g, x + w2 - 16, y + 26, 4, pk); });
      screen(c, 8 * S + 8, 16, 7 * S, 44, pk, (g, x, y, w2, h2) => { g.ellipse(x + w2 / 2, y + h2 / 2, 30, 17, lite(pk, 0.7)); g.ellipse(x + w2 / 2, y + h2 / 2, 13, 13, cy); g.ellipse(x + w2 / 2, y + h2 / 2, 6, 6, INK); bolt(g, x + 16, y + 14, 1.4, yl); bolt(g, x + w2 - 16, y + 30, 1.4, yl); });
      screen(c, 16 * S + 8, 20, 5 * S + 8, 38, yl, (g, x, y, w2, h2) => { for (let i = 0; i < 8; i++) { const hh = 6 + ((i * 13 + 5) % 23); g.rect(x + 6 + i * 10, y + h2 - 3 - hh, 7, hh, i & 1 ? pk : lite(yl, 0.5)); } });
      c.rect(X, 7 * S - 3, w, 3, yl); c.rect(X, 7 * S, w, 2, [30, 28, 50]); for (let x = X + 4; x < X + w; x += 12) c.rect(x, 7 * S - 3, 4, 3, pk);
      for (const x of [3, 8, 16, 21]) { c.box(x * S - 4, 12, 8, 7, [50, 50, 66], [20, 20, 30]); c.ellipse(x * S, 20, 3, 2, [yl, pk, cy, yl][x % 4]); }
    });
    court(p, 5, 10, 19, 18, [30, 28, 58, 255], { line: cy, r: 24, emblem: (c, cx, cy2) => { c.ellipse(cx, cy2, 14, 14, [250, 224, 90, 60]); bolt(c, cx, cy2, 1.6, yl); },
      under: (c, X, Y, w, h) => { for (let x = X + 6; x < X + w - 4; x += 12) { c.rect(x, Y - 4, 5, 2, (x / 12) & 1 ? pk : yl); c.rect(x, Y + h + 2, 5, 2, (x / 12) & 1 ? yl : pk); } for (let i = 0; i < 5; i++) { c.line(X + 20 + i * 48, Y + 4, X + 4 + i * 48, Y + h - 4, [90, 236, 250, 26], 3); } } });
    for (const x of [1, 22]) for (const y of [4, 7]) prop(p, x, y, 1, 2, (c, top, X, Y) => speaker(c, X + 8, Y + 31, 30), 1);
    const cam = (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 7); for (const dx of [-6, 0, 6]) c.line(X + 8, Y + 14, X + 8 + dx, Y + 30, [90, 90, 110], 1); c.box(X + 1, Y + 6, 13, 9, [60, 60, 80], [20, 20, 30]); c.ellipse(X + 12, Y + 10, 3, 3, cy); c.rect(X + 2, Y + 4, 3, 2, [230, 60, 60]); };
    for (const [x, y] of [[3, 10], [21, 10], [3, 17], [21, 17]]) prop(p, x, y, 1, 2, cam, 1);
    const ring = (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 6); c.rect(X + 7, Y + 12, 2, 18, [90, 90, 110]); c.ellipse(X + 8, Y + 8, 7, 7, [255, 250, 220], 2); c.ellipse(X + 8, Y + 8, 9, 9, [255, 250, 200, 50]); };
    for (const [x, y] of [[2, 13], [22, 13]]) prop(p, x, y, 1, 2, ring, 1);
    p.paint(90, (c, top) => { beam(top, 3 * S, 16, 8 * S, 13 * S, 34, cy); beam(top, 12 * S + 8, 16, 12 * S + 8, 14 * S + 8, 40, yl); beam(top, 21 * S, 16, 17 * S, 13 * S, 34, pk); });
  },
};
// Cascarrafa: Kofu's court beside the market. A cascade into a basin, stalls of fish and fruit, water either side.
R.PaldeaCascarrafaGym = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    tiles(p, 1, 4, 22, 19, [238, 218, 176], [230, 208, 164], 0.1, (x, y) => (y <= 5 && x >= 9 && x <= 14) || (y >= 9 && y <= 15 && (x === 2 || x === 3 || x === 20 || x === 21)));
    p.fill("water", 9, 4, 14, 5); p.fill("water", 2, 9, 3, 15); p.fill("water", 20, 9, 21, 15);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 2 * S, w, 2 * S, [226, 196, 150]); for (let y = 2 * S; y < 4 * S; y += 8) for (let x = X + ((y / 8) & 1) * 8; x < X + w; x += 16) c.rect(x, y, 15, 7, [214, 182, 136]); c.rect(X, 2 * S, w, 3, [250, 236, 200]);
      c.rect(9 * S + 6, 2 * S - 4, 5 * S + 4, 6, [120, 130, 150]); c.rect(9 * S + 10, 2 * S, 5 * S - 4, 2 * S + 4, [110, 190, 236]); for (let x = 9 * S + 12; x < 14 * S + 4; x += 5) c.rect(x, 2 * S + ((x * 7) % 9), 2, 2 * S - 6, [220, 244, 255]); c.ellipse(12 * S, 4 * S + 5, 40, 5, [240, 250, 255, 200]);
      for (const [x0, y0, x1, y1] of [[9, 4, 14, 5], [2, 9, 3, 15], [20, 9, 21, 15]]) frame(c, x0 * S - 2, y0 * S - 2, (x1 - x0 + 1) * S + 4, (y1 - y0 + 1) * S + 4, [70, 130, 200]), frame(c, x0 * S - 1, y0 * S - 1, (x1 - x0 + 1) * S + 2, (y1 - y0 + 1) * S + 2, WHITE);
    });
    court(p, 6, 9, 17, 15, [86, 160, 226, 235], { r: 20, under: (c, X, Y, w, h) => { for (let y = Y + 8; y < Y + h - 4; y += 12) for (let x = X + 6; x < X + w - 10; x += 16) { c.rect(x + ((y / 12) & 1) * 8, y, 6, 1, [170, 216, 250]); c.rect(x + 6 + ((y / 12) & 1) * 8, y + 1, 4, 1, [170, 216, 250]); } },
      emblem: (c, cx, cy) => { c.ellipse(cx, cy + 3, 8, 8, WHITE); c.poly([[cx - 7, cy], [cx, cy - 13], [cx + 7, cy]], WHITE); c.ellipse(cx, cy + 3, 5, 5, [70, 140, 220]); } });
    const fish = [[150, 190, 230], [240, 150, 130], [200, 210, 220]], fruit = [[240, 90, 70], [250, 200, 80], [130, 200, 90]];
    [[1, [60, 130, 210], fish], [5, [240, 140, 60], fruit], [16, [220, 80, 80], fruit], [20, [60, 160, 150], fish]].forEach(([x, col, goods]) => prop(p, x, 4, 3, 2, (c, top, X, Y) => stall(c, X, Y, 48, col, goods)));
    for (const [x, y] of [[1, 17], [22, 17], [5, 7], [18, 7]]) p.decor("barrels", x, y, { optional: true });
    for (const [x, y, g] of [[8, 18, fish], [15, 18, fruit], [2, 18, fruit], [21, 18, fish]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { c.box(X + 1, Y + 4, 14, 11, [176, 130, 84], [90, 60, 40]); for (let k = 0; k < 6; k++) c.ellipse(X + 4 + (k % 3) * 4, Y + 5 + ((k / 3) | 0) * 4, 2, 2, g[k % 3]); });
  },
};
// Medali: the Treasure Eatery. The bar and kitchen along the back, tables down both sides, Larry's court between.
R.PaldeaMedaliGym = {
  theme: { room: "arena", floor: "rHouse", wall: null },
  plan(p) {
    const wood = [150, 96, 60];
    planks(p, 1, 4, 22, 19, [204, 156, 104]);
    p.block(1, 4, 15, 2);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 2 * S, w, 2 * S, [128, 84, 58]); for (let x = X; x < X + w; x += 16) c.rect(x, 2 * S, 1, 2 * S, [100, 64, 46]); c.rect(X, 2 * S, w, 3, [80, 50, 36]); c.rect(X, 4 * S - 3, w, 3, [80, 50, 36]);
      for (let k = 0; k < 2; k++) { c.rect(2 * S, 2 * S + 12 + k * 10, 9 * S, 2, [70, 44, 32]); for (let x = 2 * S + 3; x < 11 * S - 4; x += 7) { const col = [[90, 150, 90], [200, 160, 70], [150, 70, 70], [230, 230, 220], [70, 110, 160]][(x + k * 3) % 5]; c.rect(x, 2 * S + 5 + k * 10, 4, 7, col); c.rect(x + 1, 2 * S + 3 + k * 10, 2, 2, col); } }
      for (const x of [12, 14]) { c.box(x * S - 4, 2 * S + 6, 22, 20, [40, 60, 50], [200, 160, 90]); for (let j = 0; j < 4; j++) c.rect(x * S - 1, 2 * S + 10 + j * 4, 10 + ((j * 5 + x) % 6), 1, [230, 230, 220]); }
      c.box(17 * S - 2, 2 * S + 4, 3 * S + 4, 2 * S - 4, [50, 36, 30], [80, 50, 36]); for (let i = 0; i < 4; i++) { c.rect(17 * S + i * 13, 2 * S + 4, 12, 16, [50, 80, 150]); c.ellipse(17 * S + 6 + i * 13, 2 * S + 11, 3, 3, WHITE); }
      for (const x of [3, 8, 13, 21]) { c.rect(x * S + 7, 2 * S + 3, 1, 4, INK); c.ellipse(x * S + 8, 2 * S + 11, 5, 6, [240, 90, 60]); c.rect(x * S + 5, 2 * S + 5, 6, 2, INK); c.rect(x * S + 5, 2 * S + 15, 6, 2, INK); c.ellipse(x * S + 8, 2 * S + 11, 9, 9, [250, 200, 120, 40]); }
      // behind the bar: stove and sink; then the counter with its stools
      c.rect(X, 4 * S, 15 * S, 16, [170, 170, 180]); for (let x = X + 4; x < 15 * S; x += 24) { c.box(x, 4 * S + 2, 18, 12, [200, 200, 210], [110, 110, 126]); c.ellipse(x + 5, 4 * S + 8, 3, 3, [60, 60, 70]); c.ellipse(x + 13, 4 * S + 8, 3, 3, [150, 100, 60]); }
      c.box(X, 5 * S, 15 * S, 15, wood, mix(wood, 0.45)); c.rect(X + 1, 5 * S + 1, 15 * S - 2, 4, lite(wood, 0.3)); c.rect(X + 1, 5 * S + 11, 15 * S - 2, 3, mix(wood, 0.7));
      for (let x = 2; x <= 14; x += 3) { c.ellipse(x * S + 8, 5 * S + 3, 4, 2, WHITE); c.poly([[x * S + 22, 5 * S + 5], [x * S + 26, 5 * S], [x * S + 30, 5 * S + 5]], WHITE); c.rect(x * S + 24, 5 * S + 3, 4, 2, INK); }
    });
    for (let x = 2; x <= 14; x += 2) prop(p, x, 6, 1, 1, (c, top, X, Y) => { c.ellipse(X + 8, Y + 13, 5, 2, [0, 0, 0, 60]); c.rect(X + 7, Y + 6, 2, 7, [90, 80, 80]); c.ellipse(X + 8, Y + 6, 5, 3, [190, 60, 60]); c.ellipse(X + 8, Y + 5, 5, 3, [226, 90, 80]); });
    p.decor("rKitchen", 18, 4, { optional: true });
    court(p, 6, 10, 18, 18, [226, 200, 150, 150], { line: [250, 240, 214, 240], dot: [150, 150, 150], r: 22 });
    for (const x of [2, 20]) for (const y of [8, 11, 14, 17]) { if (x === 2 && y === 8) continue; prop(p, x, y, 2, 2, (c, top, X, Y) => diner(c, X + 16, Y + 31, wood), 1); }
    p.decor("rPlant", 1, 8, { optional: true }); p.decor("rPlant", 22, 5, { optional: true });
  },
};
// Montenevera: Ryme's stage. Speaker stacks and a DJ booth under the lights, the crowd along both walls.
R.PaldeaMonteneveraGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const pu = [170, 110, 250], gr = [120, 250, 150], pk = [250, 110, 200];
    tiles(p, 1, 4, 22, 19, [52, 48, 70], [46, 42, 62]); planks(p, 1, 4, 22, 7, [104, 76, 124], 0.12);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 0, w, 4 * S, [20, 16, 34]); c.rect(X, 4, w, 3, [80, 80, 100]); for (let x = X; x < X + w; x += 8) c.line(x, 4, x + 4, 10, [80, 80, 100]); c.rect(X, 10, w, 2, [80, 80, 100]);
      c.box(6 * S, 16, 12 * S, 44, [44, 30, 76], pu); for (let i = 0; i < 9; i++) c.poly([[6 * S + 6 + i * 21, 58], [6 * S + 12 + i * 21, 42 - (i % 3) * 5], [6 * S + 20 + i * 21, 58]], [90, 50, 150]);
      c.ellipse(12 * S, 36, 15, 13, [236, 230, 250]); c.rect(12 * S - 9, 44, 18, 8, [236, 230, 250]); c.ellipse(12 * S - 6, 35, 4, 5, INK); c.ellipse(12 * S + 6, 35, 4, 5, INK); for (let i = -6; i <= 6; i += 4) c.rect(12 * S + i, 46, 1, 6, INK);
      for (const sx of [8, 16]) { star(c, sx * S, 30, 9, gr); star(c, sx * S, 46, 5, pk); }
      for (const x of [3, 7, 12, 17, 21]) { c.box(x * S - 4, 12, 8, 7, [50, 50, 66], [20, 20, 30]); c.ellipse(x * S, 20, 3, 2, [pu, gr, pk][x % 3]); }
      c.rect(X, 8 * S - 4, w, 4, [70, 50, 90]); c.rect(X, 8 * S, w, 3, [26, 22, 40]); for (let x = X + 2; x < X + w; x += 10) c.rect(x, 8 * S - 3, 5, 2, (x / 10) & 1 ? pu : gr);
    });
    for (const x of [2, 20]) prop(p, x, 3, 2, 4, (c, top, X, Y) => { speaker(c, X + 8, Y + 62, 42); speaker(c, X + 24, Y + 62, 42); speaker(c, X + 16, Y + 22, 24, [60, 50, 80]); }, 2);
    prop(p, 10, 4, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 60, 3, [0, 0, 0, 60]); c.box(X, Y + 10, 64, 21, [60, 44, 96], [20, 16, 34]); c.rect(X + 1, Y + 11, 62, 3, pu); for (const dx of [14, 50]) { c.ellipse(X + dx, Y + 8, 10, 5, [30, 28, 40]); c.ellipse(X + dx, Y + 8, 7, 3, [70, 70, 90]); c.ellipse(X + dx, Y + 8, 2, 1, pk); } c.box(X + 26, Y + 2, 12, 9, [200, 200, 214], [60, 60, 80]); c.rect(X + 28, Y + 4, 8, 5, gr); star(c, X + 32, Y + 22, 6, gr); });
    for (const x of [7, 16]) prop(p, x, 6, 1, 2, (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 5); c.rect(X + 7, Y + 8, 2, 22, [150, 150, 170]); c.ellipse(X + 8, Y + 6, 3, 4, [60, 60, 76]); c.rect(X + 4, Y + 29, 8, 2, [150, 150, 170]); }, 1);
    court(p, 5, 10, 19, 18, [66, 46, 108, 255], { line: [214, 180, 255, 240], r: 24, emblem: (c, cx, cy) => { c.ellipse(cx, cy - 2, 9, 9, [236, 230, 250]); c.rect(cx - 9, cy - 1, 18, 9, [236, 230, 250]); for (let i = -9; i < 9; i += 6) c.poly([[cx + i, cy + 8], [cx + i + 3, cy + 12], [cx + i + 6, cy + 8]], [236, 230, 250]); c.ellipse(cx - 4, cy - 2, 2, 3, INK); c.ellipse(cx + 4, cy - 2, 2, 3, INK); },
      under: (c, X, Y, w, h) => { for (let i = 0; i < 14; i++) star(c, X + 12 + p.hash(i, 1, 4) * (w - 24), Y + 10 + p.hash(i, 2, 4) * (h - 20), 3, [120, 90, 170]); } });
    for (const x of [1, 21]) prop(p, x, 9, 2, 10, (c, top, X, Y, w, h) => { c.rect(X, Y, w, h, [30, 26, 44]); crowd(c, x === 1 ? X - 2 : X + 3, Y, w, h, x, p); const e = x === 1 ? X + w - 2 : X; c.rect(e, Y, 2, h, [170, 170, 190]); for (let y = Y; y < Y + h; y += 16) c.rect(e - 1, y, 4, 3, [220, 220, 236]); });
    p.paint(90, (c, top) => { beam(top, 3 * S, 16, 8 * S, 13 * S, 34, pu); beam(top, 12 * S + 8, 16, 12 * S + 8, 14 * S + 8, 40, gr); beam(top, 21 * S, 16, 17 * S, 13 * S, 34, pk); });
  },
};
// Alfornada: Tulip's studio. Mirrors and a barre, the pads of the Emotional Spectrum Practice, tulips, a rose-pink court.
R.PaldeaAlfornadaGym = {
  theme: { room: "arena", floor: "rHouse", wall: null },
  plan(p) {
    const pk = [236, 110, 170], tul = [[236, 80, 110], [250, 200, 90], [250, 150, 190], [200, 130, 230]];
    tiles(p, 1, 4, 22, 19, [252, 226, 236], [248, 208, 224]);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 2 * S, w, 2 * S, [214, 160, 200]); c.rect(X, 2 * S, w, 3, [250, 226, 240]);
      for (let x = X + 8; x < X + w - 30; x += 44) { c.box(x, 2 * S + 5, 36, 24, [196, 232, 244], [226, 190, 110]); c.line(x + 4, 2 * S + 24, x + 16, 2 * S + 8, [255, 255, 255, 190], 2); c.line(x + 14, 2 * S + 26, x + 30, 2 * S + 8, [255, 255, 255, 120], 3); c.poly([[x, 2 * S + 5], [x + 18, 2 * S - 1], [x + 36, 2 * S + 5]], [226, 190, 110]); }
      c.rect(X, 4 * S - 6, w, 2, [150, 100, 70]); for (let x = X + 4; x < X + w; x += 44) c.rect(x, 4 * S - 6, 2, 6, [150, 100, 70]);
      // the Emotional Spectrum pads
      [[240, 80, 90], [250, 160, 70], [250, 226, 90], [120, 210, 120], [90, 170, 240], [130, 110, 230], [220, 120, 220]].forEach((col, i) => { const cx = (4.5 + i * 2.5) * S, cyy = 7 * S + 2; c.ellipse(cx, cyy + 1, 13, 8, mix(col, 0.7)); c.ellipse(cx, cyy, 13, 8, col); c.ellipse(cx, cyy, 9, 5, lite(col, 0.45)); heart(c, cx, cyy - 1, 3, WHITE); });
      for (const [x, y] of [[9, 18], [15, 18]]) heart(c, x * S + 8, y * S + 6, 7, [250, 170, 200, 200]);
    });
    court(p, 5, 10, 19, 18, [240, 140, 186, 235], { r: 24, emblem: (c, cx, cy) => { c.ellipse(cx, cy, 15, 9, WHITE); c.ellipse(cx, cy, 7, 7, [170, 90, 220]); c.ellipse(cx, cy, 3, 3, INK); c.rect(cx - 3, cy - 4, 2, 2, WHITE); for (let a = 0; a < 5; a++) c.line(cx - 12 + a * 6, cy - 9, cx - 14 + a * 7, cy - 14, WHITE, 1); },
      under: (c, X, Y, w, h) => { for (let y = Y + 10; y < Y + h - 6; y += 22) for (let x = X + 14 + ((y / 22) & 1) * 16; x < X + w - 10; x += 32) heart(c, x, y, 4, [250, 176, 208]); } });
    const vanity = (c, top, X, Y) => { c.rect(X + 2, Y + 30, 30, 3, [0, 0, 0, 50]); c.box(X + 1, Y + 16, 30, 15, WHITE, [200, 150, 180]); c.rect(X + 3, Y + 22, 26, 1, [226, 190, 110]); c.ellipse(X + 16, Y + 7, 10, 10, [226, 190, 110]); c.ellipse(X + 16, Y + 7, 8, 8, [196, 232, 244]); c.line(X + 12, Y + 10, X + 18, Y + 3, WHITE, 1); for (let a = 0; a < 8; a++) c.rect(X + 15 + Math.cos(a * 0.785) * 11, Y + 6 + Math.sin(a * 0.785) * 11, 2, 2, [255, 244, 180]); for (let k = 0; k < 4; k++) c.rect(X + 5 + k * 6, Y + 13, 3, 4, tul[k]); };
    prop(p, 1, 4, 2, 2, vanity); prop(p, 21, 4, 2, 2, vanity);
    prop(p, 4, 4, 3, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 4, 2, 27, [150, 150, 170]); c.rect(X + 44, Y + 4, 2, 27, [150, 150, 170]); c.rect(X + 2, Y + 4, 44, 2, [150, 150, 170]); for (let k = 0; k < 6; k++) { const col = [[240, 80, 90], [250, 226, 90], [90, 170, 240], [220, 120, 220], [250, 250, 250], [120, 210, 120]][k]; c.poly([[X + 7 + k * 6, Y + 8], [X + 12 + k * 6, Y + 8], [X + 13 + k * 6, Y + 24], [X + 6 + k * 6, Y + 24]], col); } c.rect(X, Y + 30, 48, 2, [0, 0, 0, 50]); }, 1);
    prop(p, 17, 4, 3, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 46, 3, [0, 0, 0, 50]); c.box(X, Y + 8, 48, 22, pk, mix(pk, 0.6)); c.box(X + 4, Y + 16, 40, 12, lite(pk, 0.4), mix(pk, 0.6)); c.rect(X + 24, Y + 16, 1, 12, mix(pk, 0.6)); heart(c, X + 12, Y + 20, 4, WHITE); });
    for (const x of [1, 21]) for (const y of [10, 13, 16]) prop(p, x, y, 2, 1, (c, top, X, Y) => planter(c, X, Y, 32, tul.slice((y + x) % 3)));
    p.decor("rPlant", 1, 18, { optional: true }); p.decor("rPlant", 22, 18, { optional: true });
  },
};
// Glaseado: Grusha's court on the mountain top. Peaks behind, snowbound pines, slalom gates and an ice court.
R.PaldeaGlaseadoGym = {
  theme: { room: "arena", floor: "snow", wall: null },
  plan(p) {
    for (const [x, y, r] of [[4, 7, 3], [19, 8, 2.6], [12, 6, 2.4], [3, 15, 2], [21, 16, 2.2]]) p.disc("drift", x, y, r, r * 0.7);
    p.paint(0.3, (c) => { const w = 24 * S;
      for (let y = 0; y < 4 * S; y++) c.rect(0, y, w, 1, [150 + y * 1.3, 196 + y * 0.8, 240]);
      for (const [x, h, ww] of [[30, 34, 50], [110, 50, 70], [200, 40, 60], [280, 56, 80], [350, 36, 50]]) { c.poly([[x - ww, 64], [x, 64 - h], [x + ww, 64]], [150, 170, 206]); c.poly([[x - ww, 64], [x, 64 - h], [x - ww * 0.1, 64]], [200, 214, 236]); c.poly([[x - ww * 0.35, 64 - h * 0.65], [x, 64 - h], [x + ww * 0.35, 64 - h * 0.65], [x + ww * 0.12, 64 - h * 0.55], [x, 64 - h * 0.68], [x - ww * 0.15, 64 - h * 0.5]], WHITE); }
      c.rect(0, 60, w, 4, [236, 242, 252]); c.rect(0, 4 * S, S, 16 * S + 6, [200, 214, 236]); c.rect(23 * S, 4 * S, S, 16 * S + 6, [200, 214, 236]); c.rect(0, 20 * S, w, 6, [200, 214, 236]);
    });
    court(p, 5, 10, 19, 18, [176, 222, 246, 240], { line: [70, 130, 210, 240], r: 24, dot: [70, 130, 210],
      under: (c, X, Y, w, h) => { for (let i = 0; i < 9; i++) { const x = X + 10 + i * 27; c.line(x + 12, Y + 6 + (i % 3) * 30, x, Y + 26 + (i % 3) * 30, [255, 255, 255, 170], 2); c.line(x + 20, Y + 50 + (i % 2) * 40, x + 12, Y + 62 + (i % 2) * 40, [255, 255, 255, 120], 1); } },
      emblem: (c, cx, cy) => { for (let a = 0; a < 3; a++) { const dx = Math.cos(a * 1.047) * 12, dy = Math.sin(a * 1.047) * 12; c.line(cx - dx, cy - dy, cx + dx, cy + dy, WHITE, 2); } c.ellipse(cx, cy, 4, 4, [70, 130, 210]); } });
    for (const x of [1, 22]) for (const y of [5, 9, 13, 17]) prop(p, x, y, 1, 1, (c, top, X, Y) => pine(c, top, X + 8, Y + 15));
    [[5, 5, 0], [8, 7, 1], [11, 5, 0], [14, 7, 1], [17, 5, 0], [20, 7, 1]].forEach(([x, y, k]) => p.paint(y + 1, (c) => { const col = k ? [70, 110, 220] : [226, 60, 60]; for (const dx of [2, 22]) { c.rect(x * S + dx, y * S, 1, 15, [120, 100, 90]); c.poly([[x * S + dx + 1, y * S], [x * S + dx + 8, y * S + 3], [x * S + dx + 1, y * S + 6]], col); } }));
    for (const [x, y] of [[3, 9], [20, 10]]) prop(p, x, y, 1, 2, (c, top, X, Y) => crystal(c, X + 8, Y + 31, 0.9, [150, 210, 250]), 1);
    prop(p, 3, 18, 1, 2, (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 8); c.ellipse(X + 8, Y + 23, 7, 7, WHITE); c.ellipse(X + 8, Y + 12, 5, 5, WHITE); c.rect(X + 6, Y + 11, 1, 1, INK); c.rect(X + 10, Y + 11, 1, 1, INK); c.rect(X + 8, Y + 13, 3, 1, [240, 140, 60]); c.rect(X + 3, Y + 16, 10, 2, [220, 70, 70]); c.rect(X + 5, Y + 5, 6, 3, INK); }, 1);
    for (const [x, y, r] of [[3, 13, 10], [21, 14, 9], [8, 19, 9], [16, 19, 8], [20, 5, 10]]) p.paint(y + 0.5, (c) => mound(c, x * S + 8, y * S + 12, r));
    p.decor("boulder", 2, 4, { optional: true });
  },
};

// ---------------------------------------------------------------- Team Star's garages
// A Starmobile in its bay under the crew's flags, tyres and tools along the wall, and each crew's own gear.
function garage(col, acc, extras) {
  return {
    theme: { room: "lab", floor: "rLab", wall: null },
    plan(p) {
      tiles(p, 1, 4, 16, p.bottom, [152, 154, 166], [144, 146, 158]);
      p.paint(0.3, (c) => { const X = S, w = 16 * S;
        c.rect(X, 2 * S, w, 2 * S, [84, 88, 108]); for (let x = X; x < X + w; x += 4) c.rect(x, 2 * S, 1, 2 * S, [66, 70, 90]); c.rect(X, 2 * S, w, 3, [120, 124, 144]); c.rect(X, 4 * S - 3, w, 3, [50, 52, 68]);
        c.box(6 * S - 2, 2 * S + 3, 6 * S + 4, 2 * S - 3, [110, 114, 130], [40, 42, 56]); for (let y = 2 * S + 6; y < 4 * S; y += 4) c.rect(6 * S, y, 6 * S, 1, [80, 84, 100]);
        for (const x of [3.5, 14.5]) banner(c, x * S, 2 * S + 3, 26, 27, col, (g, cx, cy) => { star(g, cx, cy, 8, WHITE); star(g, cx, cy, 4, acc); });
        for (const [x0, y0, x1, y1] of [[5, 4, 13, 4], [5, 8, 13, 8]]) for (let x = x0 * S; x < x1 * S; x += 8) c.rect(x, y0 * S + (y0 === 4 ? 0 : 12), 8, 4, (x / 8) & 1 ? [250, 210, 60] : [40, 40, 50]);
        for (let y = 4 * S; y < 9 * S; y += 8) { c.rect(5 * S, y, 4, 8, (y / 8) & 1 ? [250, 210, 60] : [40, 40, 50]); c.rect(13 * S - 4, y, 4, 8, (y / 8) & 1 ? [40, 40, 50] : [250, 210, 60]); }
        for (const [x, y, r] of [[4, 11, 9], [11, 10, 7], [7, 12, 5]]) c.ellipse(x * S, y * S, r, r * 0.5, [60, 60, 76, 70]);
        star(c, 9 * S + 8, 10 * S + 8, 20, [col[0], col[1], col[2], 90]); star(c, 9 * S + 8, 10 * S + 8, 11, [255, 255, 255, 70]);
      });
      prop(p, 6, 4, 6, 4, (c, top, X, Y) => starmobile(c, X, Y, col, acc));
      prop(p, 1, 4, 1, 2, (c, top, X, Y) => tyres(c, X + 8, Y + 30, 4), 1); prop(p, 2, 5, 1, 1, (c, top, X, Y) => tyres(c, X + 8, Y + 14, 2));
      prop(p, 3, 4, 2, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 30, 3, [0, 0, 0, 50]); c.box(X, Y + 12, 32, 19, [200, 60, 60], [90, 30, 34]); c.rect(X + 1, Y + 18, 30, 1, [90, 30, 34]); c.rect(X + 1, Y + 24, 30, 1, [90, 30, 34]); for (let k = 0; k < 3; k++) c.rect(X + 12, Y + 14 + k * 6, 8, 2, [230, 230, 236]); c.rect(X + 4, Y + 6, 10, 3, [150, 150, 166]); c.rect(X + 4, Y + 4, 3, 7, [150, 150, 166]); c.line(X + 18, Y + 10, X + 28, Y + 4, [250, 210, 60], 2); }, 1);
      p.decor("barrels", 16, 4, { optional: true }); p.decor("barrels", 15, 4, { optional: true });
      extras(p, col, acc);
    },
  };
}
// Segin (Dark): Giacomo's decks and speakers.
R.PaldeaSeginGarage = garage([64, 56, 84], [226, 60, 70], (p, col, acc) => {
  prop(p, 1, 8, 4, 2, (c, top, X, Y) => decks(c, X, Y, [50, 44, 66], acc, [250, 220, 90]));
  for (const [x, y] of [[1, 10], [4, 10], [13, 6], [16, 6]]) prop(p, x, y, 1, 2, (c, top, X, Y) => speaker(c, X + 8, Y + 31, 30), 1);
});
// Schedar (Fire): Mela's braziers.
R.PaldeaSchedarGarage = garage([226, 70, 50], [250, 200, 70], (p) => {
  for (const [x, y] of [[2, 8], [4, 10], [2, 12], [13, 6], [16, 7], [14, 9]]) prop(p, x, y, 1, 1, (c, top, X, Y) => brazier(c, X + 8, Y + 15));
  p.paint(0.4, (c) => { for (const [x, y, s] of [[3, 10, 1.6], [14, 11, 1.2], [9, 10, 0]]) if (s) { c.ellipse(x * S, y * S + 6, 16 * s, 6 * s, [240, 110, 40, 60]); } });
});
// Navi (Poison): Atticus's vats and his tailor's dummy.
R.PaldeaNaviGarage = garage([150, 80, 200], [150, 230, 110], (p, col, acc) => {
  for (const [x, y] of [[1, 8], [2, 8], [1, 10], [13, 6], [14, 6]]) prop(p, x, y, 1, 2, (c, top, X, Y) => vat(c, X + 8, Y + 31, acc), 1);
  for (const [x, y] of [[3, 10], [16, 7]]) prop(p, x, y, 1, 2, (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 6); c.rect(X + 7, Y + 18, 2, 12, [120, 100, 90]); c.rect(X + 4, Y + 29, 8, 2, [120, 100, 90]); c.poly([[X + 3, Y + 6], [X + 13, Y + 6], [X + 12, Y + 20], [X + 4, Y + 20]], col); c.rect(X + 6, Y + 3, 4, 3, [226, 200, 170]); c.rect(X + 3, Y + 12, 10, 2, INK); }, 1);
  p.paint(0.4, (c) => { for (const [x, y] of [[2, 12], [14, 9]]) { c.ellipse(x * S + 8, y * S + 8, 12, 5, [150, 230, 110, 110]); c.ellipse(x * S + 14, y * S + 4, 3, 2, [150, 230, 110, 140]); } });
});
// Ruchbah (Fairy): Ortega's sofa, ribbons and plush toys.
R.PaldeaRuchbahGarage = garage([240, 130, 190], [250, 230, 120], (p, col) => {
  prop(p, 1, 8, 3, 2, (c, top, X, Y) => { sofa(c, X, Y, col); heart(c, X + 12, Y + 21, 4, WHITE); heart(c, X + 36, Y + 21, 4, WHITE); });
  const plush = (k) => (c, top, X, Y) => { const b = [[250, 190, 210], [190, 220, 250], [250, 236, 170]][k]; shadow(c, X + 8, Y + 15, 6); c.ellipse(X + 8, Y + 10, 6, 5, b); c.ellipse(X + 8, Y + 4, 5, 4, b); c.ellipse(X + 4, Y + 1, 2, 2, b); c.ellipse(X + 12, Y + 1, 2, 2, b); c.rect(X + 6, Y + 3, 1, 1, INK); c.rect(X + 10, Y + 3, 1, 1, INK); c.rect(X + 6, Y + 7, 5, 2, [230, 80, 130]); };
  [[2, 11], [4, 10], [13, 6], [14, 7], [16, 6]].forEach(([x, y], k) => prop(p, x, y, 1, 1, plush(k % 3)));
  p.paint(0.4, (c) => { for (const [x, y] of [[3, 12], [12, 10], [6, 10]]) heart(c, x * S + 8, y * S + 8, 5, [250, 170, 210, 150]); });
});
// Caph (Fighting): Eri's punching bags and weights.
R.PaldeaCaphGarage = garage([236, 140, 50], [70, 120, 220], (p, col, acc) => {
  for (const [x, y] of [[13, 5], [15, 6], [1, 8]]) prop(p, x, y, 1, 3, (c, top, X, Y) => { shadow(c, X + 8, Y + 46, 7); c.rect(X + 1, Y + 2, 2, 44, [120, 120, 136]); c.rect(X + 1, Y + 2, 12, 2, [120, 120, 136]); c.rect(X + 9, Y + 4, 1, 6, [200, 200, 210]); c.box(X + 5, Y + 10, 9, 24, [200, 60, 50], [100, 30, 30]); c.rect(X + 6, Y + 14, 7, 2, WHITE); c.rect(X + 6, Y + 28, 7, 2, WHITE); c.rect(X - 1, Y + 45, 8, 2, [120, 120, 136]); }, 1);
  prop(p, 3, 9, 2, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 30, 3, [0, 0, 0, 50]); c.box(X + 1, Y + 14, 30, 4, [120, 120, 136], [50, 50, 66]); c.box(X + 1, Y + 24, 30, 4, [120, 120, 136], [50, 50, 66]); c.rect(X + 2, Y + 14, 2, 17, [80, 80, 96]); c.rect(X + 28, Y + 14, 2, 17, [80, 80, 96]); for (let k = 0; k < 3; k++) for (const yy of [9, 19]) { c.rect(X + 4 + k * 9, Y + yy + 1, 8, 2, [200, 200, 210]); c.rect(X + 3 + k * 9, Y + yy - 1, 3, 6, [40, 40, 50]); c.rect(X + 10 + k * 9, Y + yy - 1, 3, 6, [40, 40, 50]); } }, 1);
  p.paint(0.4, (c) => { c.box(2 * S, 11 * S + 4, 3 * S, 2 * S - 6, [70, 120, 220, 170], [40, 70, 150, 200]); c.rect(2 * S + 22, 11 * S + 5, 2, 2 * S - 8, [255, 255, 255, 150]); });
});

// ---------------------------------------------------------------- homes and the Academy
// Home in Cabo Poco: terracotta tiles, the kitchen along the back, the table, a sofa by the television.
R.PaldeaHome = {
  theme: { room: "house" },
  plan(p) {
    tiles(p, 1, 4, 16, p.bottom, [226, 176, 130], [216, 162, 116]);
    p.paint(0.2, (c) => { c.box(6 * S, 9 * S, 7 * S, 3 * S + 8, [200, 80, 70], [130, 44, 44]); frame(c, 6 * S + 3, 9 * S + 3, 7 * S - 6, 3 * S + 2, [250, 220, 150]); for (let x = 6 * S + 10; x < 13 * S - 8; x += 12) { c.poly([[x, 10 * S + 12], [x + 5, 10 * S + 6], [x + 10, 10 * S + 12], [x + 5, 10 * S + 18]], [250, 220, 150]); c.rect(x + 4, 10 * S + 11, 3, 3, [70, 110, 170]); } });
    p.decor("rKitchen", 1, 2); p.decor("rFridge", 4, 2); p.decor("rWindow", 7, 2); p.decor("rWindow", 10, 2); p.decor("rBooks", 13, 2, { optional: true }); p.decor("rTV", 13, 4, { optional: true });
    prop(p, 2, 8, 4, 3, (c, top, X, Y) => { const wd = [176, 120, 76]; c.rect(X + 4, Y + 44, 58, 3, [0, 0, 0, 50]); for (const dx of [6, 26, 46]) { c.box(X + dx, Y + 2, 12, 10, [90, 150, 200], [50, 90, 140]); c.box(X + dx, Y + 36, 12, 10, [90, 150, 200], [50, 90, 140]); } c.box(X + 2, Y + 10, 60, 28, wd, mix(wd, 0.5)); c.rect(X + 3, Y + 11, 58, 3, lite(wd, 0.3)); c.box(X + 12, Y + 16, 40, 16, [250, 246, 236], [200, 190, 170]); for (const dx of [18, 32, 46]) { c.ellipse(X + dx, Y + 24, 4, 4, WHITE); c.ellipse(X + dx, Y + 24, 2, 2, [[240, 200, 110], [150, 200, 110], [230, 110, 90]][(dx / 14) % 3 | 0]); } });
    prop(p, 12, 9, 3, 2, (c, top, X, Y) => { sofa(c, X, Y, [90, 150, 200]); c.box(X + 6, Y + 18, 10, 8, [250, 220, 150], [150, 110, 70]); });
    prop(p, 3, 12, 2, 1, (c, top, X, Y) => { c.box(X + 2, Y + 3, 28, 12, [200, 150, 100], [110, 70, 50]); for (let k = 0; k < 3; k++) { c.ellipse(X + 8 + k * 8, Y + 6, 3, 3, [[240, 90, 70], [250, 200, 80], [130, 200, 90]][k]); } c.rect(X + 2, Y + 1, 28, 3, [226, 190, 140]); });
    p.decor("rPot", 1, 12, { optional: true }); p.decor("rPot", 16, 12, { optional: true }); p.decor("rPlant", 16, 4, { optional: true });
  },
};
// The Academy's entrance hall: the great wall of books either side of the stairs, reception, the Director's desk,
// and by the door the ways on to the courtyard, Area Zero, Kitakami and Blueberry.
R.PaldeaAcademy = {
  theme: { room: "house", floor: "hallFloor", wall: null },
  plan(p) {
    const wood = [150, 100, 64], spine = [[190, 70, 60], [70, 110, 170], [90, 150, 90], [220, 180, 90], [150, 100, 170], [230, 226, 210], [200, 120, 60]];
    tiles(p, 1, 4, 16, p.bottom, [236, 224, 200], [226, 212, 186]);
    p.block(1, 4, 6, 2); p.block(12, 4, 5, 2); p.block(7, 4, 5, 3);
    const shelves = (c, x0, x1, y0, y1) => { c.rect(x0, y0, x1 - x0, y1 - y0, mix(wood, 0.6)); for (let y = y0 + 2; y + 9 <= y1; y += 11) { for (let x = x0 + 2; x < x1 - 3; ) { const k = p.hash(x, y, 7), w = 2 + Math.floor(k * 3), h = 6 + Math.floor(p.hash(y, x, 8) * 3); if (k > 0.1) c.rect(x, y + 9 - h, w, h, spine[Math.floor(p.hash(x, y, 9) * 7)]); x += w + (k > 0.9 ? 3 : 1); } c.rect(x0, y + 9, x1 - x0, 2, wood); } for (let x = x0; x <= x1; x += 32) c.rect(Math.min(x, x1 - 2), y0, 2, y1 - y0, wood); };
    p.paint(0.3, (c) => { const X = S, w = 16 * S;
      c.rect(X, 0, w, 4 * S, mix(wood, 0.5)); shelves(c, X, 7 * S, 4, 6 * S - 2); shelves(c, 12 * S, X + w, 4, 6 * S - 2);
      c.rect(X, 2 * S + 6, 6 * S, 3, [226, 190, 110]); c.rect(12 * S, 2 * S + 6, 5 * S, 3, [226, 190, 110]); for (let x = X + 2; x < X + w; x += 6) if (x < 7 * S - 2 || x > 12 * S) c.rect(x, 2 * S, 1, 7, [226, 190, 110]); c.rect(X, 2 * S - 1, 6 * S, 2, [226, 190, 110]); c.rect(12 * S, 2 * S - 1, 5 * S, 2, [226, 190, 110]);
      for (const x of [4, 14]) { c.rect(x * S, 2 * S + 9, 2, 4 * S - 12, [200, 170, 120]); c.rect(x * S + 10, 2 * S + 9, 2, 4 * S - 12, [200, 170, 120]); for (let y = 2 * S + 14; y < 6 * S - 4; y += 6) c.rect(x * S, y, 12, 1, [200, 170, 120]); }
      c.rect(X, 6 * S - 3, 6 * S, 3, mix(wood, 0.45)); c.rect(12 * S, 6 * S - 3, 5 * S, 3, mix(wood, 0.45));
      // the arch and crest over the stairs
      c.rect(7 * S, 0, 5 * S, 4 * S, [226, 214, 190]); c.rect(7 * S, 0, 3, 4 * S, [180, 160, 130]); c.rect(12 * S - 3, 0, 3, 4 * S, [180, 160, 130]);
      c.ellipse(9 * S + 8, 2 * S + 12, 30, 34, [96, 140, 200]); c.rect(7 * S + 10, 2 * S + 12, 60, 2 * S - 12, [96, 140, 200]); c.ellipse(9 * S + 8, 2 * S + 12, 30, 34, [226, 190, 110], 3);
      for (let i = 0; i < 5; i++) c.line(9 * S + 8, 2 * S + 14, 9 * S + 8 + Math.cos(-0.4 - i * 0.58) * 28, 2 * S + 14 + Math.sin(-0.4 - i * 0.58) * 30, [150, 180, 226], 1);
      c.box(8 * S + 4, 6, 40, 30, [250, 246, 236], [226, 190, 110]); c.ellipse(8 * S + 15, 22, 8, 8, [240, 150, 50]); c.rect(8 * S + 14, 11, 2, 4, [90, 150, 80]); for (const [dx, dy] of [[0, 0], [6, 0], [-6, 0], [3, 5], [-3, 5], [0, 10]]) c.ellipse(8 * S + 33 + dx, 17 + dy, 3, 3, [130, 80, 190]); c.rect(8 * S + 32, 10, 2, 4, [90, 150, 80]);
      // the stairs
      for (let k = 0; k < 9; k++) { const y = 4 * S + k * 5, col = [236, 228, 210]; c.rect(7 * S + 4, y, 5 * S - 8, 5, col); c.rect(7 * S + 4, y + 4, 5 * S - 8, 1, [170, 160, 140]); c.rect(8 * S + 4, y, 3 * S - 8, 4, [190, 60, 60]); c.rect(8 * S + 4, y + 4, 3 * S - 8, 1, [130, 40, 44]); }
      for (const x of [7 * S, 12 * S - 4]) { c.rect(x, 3 * S + 8, 4, 3 * S + 5, wood); c.rect(x, 3 * S + 8, 1, 3 * S + 5, lite(wood, 0.3)); c.box(x - 2, 6 * S + 9, 8, 8, [226, 190, 110], [130, 100, 50]); }
      c.rect(8 * S + 4, 6 * S + 13, 3 * S - 8, 7 * S + 3, [190, 60, 60]); c.rect(8 * S + 4, 6 * S + 13, 2, 7 * S + 3, [226, 190, 110]); c.rect(11 * S - 6, 6 * S + 13, 2, 7 * S + 3, [226, 190, 110]);
      // the ways on, by the door
      [[1, [50, 60, 120], (g, x, y) => { g.ellipse(x, y, 4, 4, [250, 236, 150]); g.ellipse(x + 2, y - 1, 3, 3, [50, 60, 120]); }], [2, [110, 70, 170], (g, x, y) => g.poly([[x - 3, y + 4], [x - 3, y - 1], [x, y - 5], [x + 3, y - 1], [x + 3, y + 4]], [200, 240, 250])], [3, [80, 150, 90], (g, x, y) => { g.rect(x - 4, y - 3, 9, 5, [250, 250, 240]); g.rect(x - 3, y + 2, 2, 2, INK); g.rect(x + 2, y + 2, 2, 2, INK); }], [4, [70, 110, 220], (g, x, y) => { g.ellipse(x, y + 1, 4, 4, [150, 190, 255]); g.rect(x, y - 5, 2, 2, [90, 170, 90]); }]].forEach(([k, col, icon]) => { const w2 = p.warps[k], x = w2.x * S, y = w2.y * S; c.box(x + 1, y + 1, 14, 14, col, mix(col, 0.6)); frame(c, x + 2, y + 2, 12, 12, lite(col, 0.4)); icon(c, x + 8, y + 8); });
    });
    for (const k of [1, 2, 3, 4]) p.bare(k);
    prop(p, 2, 8, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 62, 3, [0, 0, 0, 50]); c.box(X + 24, Y + 2, 12, 12, [70, 110, 170], [40, 60, 110]); c.box(X, Y + 12, 64, 19, wood, mix(wood, 0.45)); c.rect(X + 1, Y + 13, 62, 4, lite(wood, 0.3)); c.box(X + 6, Y + 5, 12, 9, [200, 200, 214], [60, 60, 80]); c.rect(X + 8, Y + 7, 8, 5, [120, 200, 230]); c.ellipse(X + 46, Y + 13, 4, 3, [226, 190, 110]); c.box(X + 20, Y + 20, 24, 8, [250, 246, 236], [226, 190, 110]); for (let i = 0; i < 4; i++) c.rect(X + 23 + i * 5, Y + 23, 3, 2, [90, 80, 80]); });
    prop(p, 12, 7, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 62, 3, [0, 0, 0, 50]); c.box(X + 24, Y, 16, 16, [120, 50, 50], [70, 30, 30]); c.box(X, Y + 12, 64, 19, mix(wood, 0.8), mix(wood, 0.4)); c.rect(X + 1, Y + 13, 62, 4, wood); c.box(X + 22, Y + 21, 20, 6, [226, 190, 110], [130, 100, 50]); c.box(X + 6, Y + 7, 10, 7, WHITE, [150, 150, 150]); c.box(X + 9, Y + 5, 10, 7, WHITE, [150, 150, 150]); c.rect(X + 50, Y + 4, 2, 9, [90, 80, 80]); c.ellipse(X + 51, Y + 4, 5, 3, [90, 170, 120]); });
    prop(p, 2, 11, 3, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 46, 3, [0, 0, 0, 50]); c.box(X, Y + 10, 48, 20, wood, mix(wood, 0.45)); c.rect(X + 1, Y + 11, 46, 3, lite(wood, 0.3)); for (let k = 0; k < 4; k++) c.box(X + 4 + k * 11, Y + 14 + (k & 1) * 5, 9, 6, spine[k + 1], INK); c.box(X + 18, Y + 3, 4, 8, spine[0], INK); c.box(X + 22, Y + 2, 4, 9, spine[1], INK); c.box(X + 26, Y + 4, 4, 7, spine[3], INK); });
    prop(p, 6, 8, 1, 2, (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 6); c.rect(X + 7, Y + 18, 2, 12, [120, 90, 60]); c.rect(X + 4, Y + 29, 8, 2, [120, 90, 60]); c.ellipse(X + 8, Y + 11, 7, 7, [90, 150, 220]); c.ellipse(X + 6, Y + 9, 3, 2, [110, 190, 110]); c.ellipse(X + 10, Y + 13, 2, 3, [110, 190, 110]); c.ellipse(X + 8, Y + 11, 8, 8, [226, 190, 110], 1); }, 1);
    p.decor("rPlant", 1, 6, { optional: true }); p.decor("rPlant", 16, 6, { optional: true });
  },
};
// The Academy courtyard by night: the school's battle court between hedges, under the lamps.
R.PaldeaAcademyCourtyard = {
  theme: { room: "house", floor: "lawn", wall: null },
  plan(p) {
    p.fill("paving", 2, 5, 15, 12); p.fill("paving", 8, 12, 10, p.bottom);
    p.paint(0.3, (c) => { const X = S, w = 16 * S;
      c.rect(X, 0, w, 4 * S, [226, 206, 170]); for (let y = 2; y < 4 * S; y += 8) for (let x = X + ((y / 8) & 1) * 8; x < X + w; x += 16) c.rect(x, y, 15, 7, [214, 190, 150]); c.rect(X, 0, w, 6, [200, 110, 70]); c.rect(X, 6, w, 2, [150, 80, 50]);
      for (let x = X + 12; x < X + w - 16; x += 30) { if (x > 7 * S && x < 10 * S) continue; c.box(x, 18, 14, 26, [250, 230, 150], [120, 90, 70]); c.rect(x + 6, 19, 2, 24, [120, 90, 70]); c.rect(x + 1, 30, 12, 2, [120, 90, 70]); c.ellipse(x + 7, 18, 7, 6, [250, 230, 150]); }
      c.box(8 * S - 4, 20, 2 * S + 24, 44, [110, 70, 50], [70, 44, 34]); c.ellipse(9 * S + 8, 22, 28, 14, [110, 70, 50]); c.rect(9 * S + 7, 22, 2, 42, [70, 44, 34]); c.ellipse(9 * S + 8, 12, 7, 7, [240, 150, 50]);
    });
    court(p, 3, 6, 14, 11, [150, 190, 226, 120], { r: 18 });
    for (let x = 1; x <= 16; x++) if (x < 7 || x > 11) { p.decor("hedge", x, 4, { optional: true }); }
    for (const y of [6, 8, 10, 12]) { p.decor("hedge", 1, y, { optional: true }); p.decor("hedge", 16, y, { optional: true }); }
    for (const x of [2, 5, 12]) prop(p, x, 13, 2, 1, (c, top, X, Y) => { c.box(X + 2, Y + 4, 28, 6, [170, 120, 80], [90, 60, 40]); c.rect(X + 4, Y + 10, 3, 5, [90, 60, 40]); c.rect(X + 25, Y + 10, 3, 5, [90, 60, 40]); c.rect(X + 2, Y, 28, 3, [170, 120, 80]); });
    const lamps = [[2, 5], [15, 5], [2, 11], [15, 9], [7, 13], [11, 13]];
    for (const [x, y] of lamps) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X + 8, Y + 14, 5); c.rect(X + 7, Y - 14, 2, 28, [60, 60, 76]); c.rect(X + 5, Y + 12, 6, 2, [60, 60, 76]); top.box(X + 4, Y - 22, 8, 9, [255, 240, 170], [60, 60, 76]); });
    p.paint(99, (c, top) => { c.rect(0, 0, p.W * S, p.H * S, [14, 16, 70, 120]); for (let i = 0; i < top.data.length; i += 4) if (top.data[i + 3]) { top.data[i] = top.data[i] * 0.9; top.data[i + 1] = top.data[i + 1] * 0.9; } });
    p.paint(100, (c, top) => { for (const [x, y] of lamps) { c.ellipse(x * S + 8, y * S + 6, 30, 22, [255, 236, 150, 46]); c.ellipse(x * S + 8, y * S + 6, 16, 12, [255, 240, 170, 50]); top.ellipse(x * S + 8, y * S - 18, 9, 9, [255, 240, 170, 80]); }
      for (let x = S + 12; x < 17 * S - 16; x += 30) if (!(x > 7 * S && x < 10 * S)) c.rect(x + 1, 19, 12, 24, [255, 236, 150, 120]);
      for (let i = 0; i < 26; i++) { const x = S + p.hash(i, 1, 5) * 16 * S, y = 4 * S + p.hash(i, 2, 5) * 10 * S; c.rect(x, y, 2, 2, [220, 255, 170, 200]); c.ellipse(x + 1, y + 1, 3, 3, [220, 255, 170, 50]); } });
  },
};

// ---------------------------------------------------------------- the League
// The Pokémon League hall: Rika's interview desk, the Elite Four's court under their four banners,
// and the stairs up to the Top Champion's roof.
R.PaldeaLeagueHall = {
  theme: { room: "arena", floor: "hallFloor", wall: null },
  plan(p) {
    const gold = [240, 200, 100];
    tiles(p, 1, 4, 22, 19, [230, 230, 240], [216, 216, 232]);
    p.block(10, 4, 4, 2);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 0, w, 4 * S, [44, 48, 88]); for (let x = X; x < X + w; x += 16) c.rect(x, 0, 1, 4 * S, [36, 40, 76]); c.rect(X, 4 * S - 4, w, 4, gold); c.rect(X, 0, w, 3, gold);
      [[3, [204, 150, 84]], [6.5, [150, 170, 192]], [17.5, [130, 190, 250]], [21, [96, 84, 206]]].forEach(([x, col], i) => banner(c, x * S, 8, 30, 46, col, (g, cx, cy) => { g.ellipse(cx, cy, 8, 8, WHITE); if (i === 0) g.poly([[cx - 6, cy + 4], [cx, cy - 6], [cx + 6, cy + 4]], col); else if (i === 1) hex(g, cx, cy, 6, col, 1); else if (i === 2) { g.poly([[cx - 7, cy + 2], [cx, cy - 4], [cx, cy + 1]], col); g.poly([[cx + 7, cy + 2], [cx, cy - 4], [cx, cy + 1]], col); } else { g.poly([[cx - 5, cy - 5], [cx + 5, cy], [cx - 5, cy + 5], [cx - 2, cy]], col); } }));
      // the way up to the roof: an arch on the night sky
      c.ellipse(12 * S, 2 * S, 44, 30, gold); c.rect(12 * S - 44, 2 * S, 88, 2 * S - 4, gold); c.ellipse(12 * S, 2 * S, 40, 26, [20, 24, 66]); c.rect(12 * S - 40, 2 * S, 80, 2 * S - 4, [20, 24, 66]);
      for (let i = 0; i < 22; i++) c.rect(12 * S - 36 + p.hash(i, 1, 2) * 72, 10 + p.hash(i, 2, 2) * 34, 1, 1, WHITE); c.ellipse(12 * S + 20, 22, 6, 6, [250, 240, 190]); c.ellipse(12 * S + 23, 20, 5, 5, [20, 24, 66]);
      for (const [x, h] of [[-36, 12], [-26, 20], [-14, 14], [4, 18], [16, 10], [28, 16]]) c.rect(12 * S + x, 60 - h, 9, h, [40, 46, 100]);
      for (let k = 0; k < 8; k++) { c.rect(10 * S + 2, 4 * S - 6 + k * 5, 4 * S - 4, 5, [226, 226, 240]); c.rect(10 * S + 2, 4 * S - 2 + k * 5, 4 * S - 4, 1, [150, 150, 176]); c.rect(11 * S, 4 * S - 6 + k * 5, 2 * S, 4, [190, 60, 60]); }
      for (const x of [10 * S, 14 * S - 3]) c.rect(x, 3 * S + 4, 3, 2 * S + 14, gold);
      c.rect(11 * S, 6 * S + 2, 2 * S, 3 * S - 2, [190, 60, 60]); c.rect(11 * S + 8, 18 * S, S, 2 * S, [190, 60, 60]);
    });
    court(p, 5, 9, 19, 18, [46, 52, 100, 245], { line: [240, 200, 100, 250], r: 24, under: (c, X, Y, w, h) => { for (let j = 0; j * 21 < h - 34; j++) for (let i = 0; i * 26 < w - 44; i++) hex(c, X + 18 + i * 26 + (j & 1) * 13, Y + 14 + j * 21, 11, [58, 66, 124], 0.9); },
      emblem: (c, cx, cy) => { c.ellipse(cx, cy, 10, 10, gold); c.rect(cx - 10, cy - 1, 20, 2, [46, 52, 100]); c.ellipse(cx, cy, 4, 4, [46, 52, 100]); c.ellipse(cx, cy, 2, 2, WHITE); } });
    // Rika's interview desk.
    prop(p, 2, 5, 4, 3, (c, top, X, Y) => { const wd = [120, 76, 56]; c.rect(X + 2, Y + 46, 62, 3, [0, 0, 0, 50]); c.box(X + 24, Y + 2, 16, 14, [60, 50, 70], [30, 26, 40]); c.box(X, Y + 12, 64, 20, wd, mix(wd, 0.45)); c.rect(X + 1, Y + 13, 62, 4, lite(wd, 0.3)); c.box(X + 6, Y + 6, 10, 8, WHITE, [150, 150, 150]); c.rect(X + 50, Y + 2, 2, 11, [90, 80, 80]); c.poly([[X + 44, Y + 4], [X + 58, Y + 4], [X + 55, Y - 2], [X + 47, Y - 2]], gold); c.box(X + 24, Y + 36, 16, 10, [150, 60, 60], [90, 30, 34]); c.rect(X + 26, Y + 34, 12, 3, [190, 80, 80]); }, 2);
    // The trophies.
    prop(p, 18, 5, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 62, 3, [0, 0, 0, 50]); c.box(X, Y + 14, 64, 17, [60, 64, 110], [30, 32, 60]); c.rect(X + 1, Y + 15, 62, 3, gold); for (let k = 0; k < 4; k++) { const x = X + 9 + k * 15; c.rect(x - 1, Y + 9, 3, 5, gold); c.rect(x - 4, Y + 12, 9, 2, gold); c.poly([[x - 5, Y + 1], [x + 6, Y + 1], [x + 3, Y + 9], [x - 2, Y + 9]], k === 3 ? [226, 226, 240] : gold); c.rect(x - 3, Y + 2, 2, 4, WHITE); } });
    for (const x of [3, 20]) for (const y of [10, 14, 18]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, X, Y));
    for (const x of [9, 15]) prop(p, x, 18, 1, 2, (c, top, X, Y) => { brazier(c, X + 8, Y + 30); }, 1);
  },
};
// ---------------------------------------------------------------- Area Zero
// Zero Lab: the time machine's great ring on its dais, banks of consoles, stasis pods, and the lift down.
R.PaldeaZeroLab = {
  theme: { room: "lab", floor: "steel", wall: null },
  plan(p) {
    const vi = [170, 110, 250], cy = [110, 236, 250];
    tiles(p, 1, 4, 22, 19, [86, 94, 116], [78, 86, 108]);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 0, w, 4 * S, [46, 50, 70]); for (let x = X; x < X + w; x += 24) c.rect(x, 0, 1, 4 * S, [34, 38, 56]); c.rect(X, 4 * S - 3, w, 3, [110, 120, 150]); c.rect(X, 20, w, 2, [34, 38, 56]);
      for (const x of [4.5, 6, 16.5, 18]) screen(c, x * S, 2 * S + 4, 20, 20, cy, (g, sx, sy) => { for (let i = 0; i < 18; i++) g.rect(sx + 1 + i, sy + 10 + Math.round(Math.sin(i * 0.9 + x) * 5), 1, 2, lite(cy, 0.5)); });
      // cables on the floor
      for (const [pts, col] of [[[[8 * S, 8 * S + 8], [5 * S, 8 * S + 8], [5 * S, 6 * S]], vi], [[[16 * S, 8 * S + 8], [19 * S, 8 * S + 8], [19 * S, 6 * S]], cy], [[[9 * S, 8 * S + 12], [9 * S, 12 * S], [3 * S, 12 * S]], cy], [[[15 * S, 8 * S + 12], [15 * S, 11 * S], [20 * S, 11 * S]], vi]]) for (let i = 0; i + 1 < pts.length; i++) { c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], [30, 32, 46], 4); c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, 1); }
      // hazard edge of the dais
      for (let x = 8 * S; x < 16 * S; x += 8) c.rect(x, 8 * S, 8, 4, (x / 8) & 1 ? [250, 210, 60] : [40, 40, 50]);
      // the lift
      const lx = 21 * S + 8, ly = 15 * S + 8; c.ellipse(lx, ly, 22, 16, [40, 44, 60]); c.ellipse(lx, ly, 19, 13, [120, 130, 160]); c.ellipse(lx, ly, 15, 10, [60, 66, 90]); c.ellipse(lx, ly, 15, 10, cy, 2); c.poly([[lx - 5, ly - 2], [lx + 5, ly - 2], [lx, ly + 5]], cy); c.ellipse(lx, ly, 26, 19, [110, 236, 250, 30]);
    });
    p.bare(1);
    // The time machine.
    prop(p, 8, 4, 8, 4, (c, top, X, Y) => { const cx = X + 64, cy2 = Y + 18;
      c.ellipse(cx, Y + 60, 62, 6, [0, 0, 0, 70]); c.poly([[X + 6, Y + 62], [X + 18, Y + 44], [X + 110, Y + 44], [X + 122, Y + 62]], [120, 128, 156]); c.poly([[X + 18, Y + 44], [X + 110, Y + 44], [X + 106, Y + 38], [X + 22, Y + 38]], [160, 168, 196]); c.rect(X + 6, Y + 60, 116, 3, [70, 76, 100]); for (let x = X + 30; x < X + 100; x += 12) c.rect(x, Y + 46, 6, 2, cy);
      for (const dx of [8, 108]) { c.box(X + dx, Y - 6, 12, 50, [100, 108, 136], [40, 44, 60]); c.rect(X + dx + 2, Y - 4, 3, 46, [150, 158, 186]); for (let k = 0; k < 5; k++) c.rect(X + dx + 7, Y + k * 8, 3, 3, k & 1 ? vi : cy); c.line(X + dx + 6, Y + 4, cx + (dx < 50 ? -34 : 34), cy2, [40, 44, 60], 3); }
      c.ellipse(cx, cy2, 42, 42, [50, 54, 74]); c.ellipse(cx, cy2, 39, 39, [150, 158, 186]); c.ellipse(cx, cy2, 33, 33, [50, 54, 74]);
      for (let r = 31, k = 0; r > 3; r -= 4, k++) c.ellipse(cx, cy2, r, r, k & 1 ? [70, 40, 150] : [120, 80, 220]); c.ellipse(cx, cy2, 12, 12, [200, 170, 255]); c.ellipse(cx, cy2, 6, 6, WHITE);
      for (let a = 0; a < 6; a++) { const ax = Math.cos(a * 1.047 + 0.5), ay = Math.sin(a * 1.047 + 0.5); c.line(cx + ax * 8, cy2 + ay * 8, cx + ax * 28, cy2 + ay * 28, [220, 200, 255, 150], 1); }
      for (let a = 0; a < 12; a++) c.rect(cx + Math.cos(a * 0.524) * 36 - 1, cy2 + Math.sin(a * 0.524) * 36 - 1, 3, 3, a & 1 ? cy : [250, 210, 60]);
      c.ellipse(cx, cy2, 48, 48, [170, 110, 250, 30]); });
    prop(p, 11, 8, 2, 1, (c, top, X, Y) => { c.box(X + 2, Y + 2, 28, 13, [110, 118, 146], [40, 44, 60]); c.rect(X + 4, Y + 4, 24, 4, [60, 66, 90]); c.ellipse(X + 16, Y + 6, 4, 4, [140, 70, 200]); c.rect(X + 12, Y + 5, 8, 1, INK); c.ellipse(X + 16, Y + 6, 1, 1, WHITE); c.rect(X + 5, Y + 10, 4, 2, cy); c.rect(X + 23, Y + 10, 4, 2, [250, 210, 60]); });
    const pod = (col) => (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 7); c.box(X + 1, Y + 24, 14, 7, [110, 118, 146], [40, 44, 60]); c.box(X + 2, Y + 2, 12, 23, [col[0], col[1], col[2], 150], [40, 44, 60]); c.rect(X + 4, Y + 4, 2, 18, [255, 255, 255, 120]); c.ellipse(X + 8, Y + 15, 3, 4, mix(col, 0.5)); c.box(X + 1, Y - 1, 14, 4, [110, 118, 146], [40, 44, 60]); };
    for (const x of [5, 6, 7]) prop(p, x, 4, 1, 2, pod([120, 230, 170])); for (const x of [16, 17, 18]) prop(p, x, 4, 1, 2, pod([230, 150, 250]));
    const bank = (c, top, X, Y, w) => { c.rect(X + 2, Y + 30, w - 2, 3, [0, 0, 0, 60]); c.box(X, Y + 12, w, 19, [110, 118, 146], [40, 44, 60]); c.rect(X + 1, Y + 13, w - 2, 5, [150, 158, 186]); for (let x = X + 3; x < X + w - 5; x += 5) c.rect(x, Y + 15, 3, 2, [cy, vi, [250, 210, 60]][(x >> 2) % 3]); for (let x = X + 2; x + 20 <= X + w; x += 22) { c.box(x, Y - 6, 20, 17, [30, 32, 46], [12, 12, 20]); c.rect(x + 2, Y - 4, 16, 12, mix(cy, 0.35)); for (let i = 0; i < 14; i++) c.rect(x + 3 + i, Y + 2 + Math.round(Math.sin(i * 0.8 + x) * 3), 1, 2, cy); } };
    prop(p, 1, 4, 3, 2, bank); prop(p, 20, 4, 3, 2, bank); prop(p, 1, 10, 4, 2, bank); prop(p, 18, 10, 4, 2, bank); prop(p, 1, 14, 2, 2, bank);
    for (const [x, y, col, s] of [[1, 18, vi, 0.9], [22, 18, cy, 0.9], [22, 8, vi, 0.7], [6, 18, cy, 0.6], [17, 18, vi, 0.6]]) prop(p, x, y, 1, 2, (c, top, X, Y) => crystal(c, X + 8, Y + 31, s, col), 1);
  },
};
// The chamber of Terapagos, far under Area Zero: a round hall of Tera crystal round a glowing shell of hexagons.
R.PaldeaTerapagosChamber = {
  theme: { room: "house", floor: "caveFloor", wall: null },
  plan(p) {
    const cols = [[250, 150, 170], [250, 200, 120], [250, 240, 140], [150, 230, 160], [130, 210, 250], [170, 150, 250], [240, 160, 240]];
    const out = (x, y) => { const dx = Math.min(x - 1, 22 - x), dy = Math.min(y - 4, 19 - y); return dx + dy < 4; };
    for (let y = 4; y <= 19; y++) for (let x = 1; x <= 22; x++) if (out(x, y)) p.fill("void", x, y, x, y);
    p.paint(0.2, (c) => { for (let y = 4; y <= 19; y++) for (let x = 1; x <= 22; x++) { if (out(x, y)) { c.rect(x * S, y * S, S, S, [16, 16, 24]); const k = p.hash(x, y, 3); if (!out(x + 1, y) || !out(x - 1, y) || !out(x, y + 1) || !out(x, y - 1)) { c.poly([[x * S, y * S + 16], [x * S + 4 + k * 6, y * S + 1], [x * S + 16, y * S + 16]], [60, 120, 170]); c.poly([[x * S + 4, y * S + 16], [x * S + 4 + k * 6, y * S + 1], [x * S + 9, y * S + 16]], [130, 200, 236]); } continue; }
        const f = 0.85 + p.hash(x, y, 1) * 0.3; c.rect(x * S, y * S, S, S, mix([44, 62, 104], f)); c.line(x * S, y * S + 15, x * S + 15, y * S, [70, 100, 150, 90]); if (p.hash(x, y, 2) > 0.8) { c.rect(x * S + 6, y * S + 5, 2, 2, [200, 240, 255]); } } });
    p.paint(0.3, (c) => { const X = S, w = 22 * S; c.rect(X, 0, w, 4 * S, [22, 30, 60]);
      for (let i = 0; i < 40; i++) { const x = X + 4 * S + p.hash(i, 1, 6) * (w - 8 * S), h = 14 + p.hash(i, 2, 6) * 40, ww = 5 + p.hash(i, 3, 6) * 8, col = cols[i % 7]; c.poly([[x - ww, 64], [x, 64 - h], [x + ww, 64]], mix(col, 0.55)); c.poly([[x - ww, 64], [x, 64 - h], [x, 64]], mix(col, 0.8)); }
      c.rect(X, 62, w, 2, [130, 200, 236]); });
    // The shell.
    p.paint(0.5, (c) => { const cx = 12 * S, cy = 12 * S; c.ellipse(cx, cy, 76, 62, [150, 220, 250, 40]); c.ellipse(cx, cy, 66, 54, [200, 240, 255, 50]);
      for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) { if (Math.abs(q + r) > 2) continue; const x = cx + q * 24, y = cy + (r + q / 2) * 22, d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)), col = d === 0 ? WHITE : cols[(((Math.atan2(r + q / 2, q) / 6.283 + 1) * 7 + d * 2) | 0) % 7]; hex(c, x, y, 15, [30, 40, 80]); hex(c, x, y, 13, d === 2 ? mix(col, 0.85) : col); hex(c, x - 1, y - 2, 7, lite(col, 0.45)); }
      star(c, cx, cy, 6, [130, 210, 250]); });
    [[5, 6, 1.1, 0], [18, 6, 1.1, 4], [3, 9, 0.9, 2], [20, 9, 0.9, 5], [2, 13, 1, 6], [21, 12, 0.8, 1], [3, 16, 0.9, 3], [20, 16, 1, 0], [6, 18, 0.9, 4], [17, 18, 0.9, 2], [8, 4, 0.8, 5], [15, 4, 0.8, 1]].forEach(([x, y, s, k]) => prop(p, x, y - 1, 1, 2, (c, top, X, Y) => crystal(c, X + 8, Y + 31, s, cols[k]), 1));
    p.paint(90, (c, top) => { for (const [x, col] of [[7, 4], [12, 2], [17, 6]]) beam(top, x * S, 0, 12 * S + (x - 12) * 6, 12 * S, 30, cols[col]); });
  },
};
// ---------------------------------------------------------------- Kitakami and Blueberry
// Kitakami's community centre: tatami and a low table, the ogre masks on the wall, the caretaker's counter.
R.PaldeaCommunityCenter = {
  theme: { room: "house", wall: null, bottom: 13 },
  plan(p) {
    const wd = [130, 86, 56];
    planks(p, 1, 4, 16, 13, [200, 154, 104]);
    p.block(11, 4, 6, 2);
    p.paint(0.2, (c) => { for (let y = 4; y <= 9; y++) for (let x = 1; x <= 7; x++) { c.rect(x * S, y * S, S, S, [206, 204, 140]); for (let j = 1; j < 16; j += 3) c.rect(x * S, y * S + j, S, 1, [190, 190, 124]); } for (let y = 4; y <= 9; y += 2) for (let x = 1; x <= 7; x += 2) frame(c, x * S, y * S, ((y / 2) & 1 ? 2 : 1) * S + ((y / 2) & 1 ? 0 : S), 2 * S, [70, 110, 70]); c.rect(S, 10 * S, 7 * S, 2, [70, 110, 70]); c.rect(8 * S, 4 * S, 2, 6 * S + 2, [70, 110, 70]);
      for (let x = 7; x <= 11; x++) for (let y = 12; y <= 13; y++) { c.rect(x * S, y * S, S, S, (x + y) & 1 ? [170, 170, 176] : [156, 156, 164]); } c.rect(7 * S, 12 * S, 5 * S, 2, wd); });
    p.paint(0.3, (c) => { const X = S, w = 16 * S;
      c.rect(X, 2 * S, w, 2 * S, [240, 230, 204]); c.rect(X, 2 * S, w, 4, wd); c.rect(X, 4 * S - 3, w, 3, wd); for (const x of [1, 7, 12, 17]) c.rect(x * S - (x === 17 ? 3 : 0), 2 * S, 3, 2 * S, wd);
      for (const x of [2, 4.5]) { c.box(x * S, 2 * S + 6, 30, 22, [250, 250, 244], wd); for (let i = 1; i < 4; i++) c.rect(x * S + i * 7.5, 2 * S + 7, 1, 20, [190, 170, 140]); c.rect(x * S + 1, 2 * S + 13, 28, 1, [190, 170, 140]); c.rect(x * S + 1, 2 * S + 20, 28, 1, [190, 170, 140]); }
      c.box(7 * S + 8, 2 * S + 6, 4 * S, 22, [90, 60, 44], [60, 40, 30]);
      [[90, 200, 170], [240, 110, 60], [80, 150, 240], [150, 150, 160]].forEach((col, i) => { const cx = 8 * S + 4 + i * 15, cyy = 2 * S + 17; c.ellipse(cx, cyy, 6, 7, col); c.poly([[cx - 6, cyy - 4], [cx - 4, cyy - 11], [cx - 1, cyy - 6]], lite(col, 0.4)); c.poly([[cx + 6, cyy - 4], [cx + 4, cyy - 11], [cx + 1, cyy - 6]], lite(col, 0.4)); c.rect(cx - 4, cyy - 2, 3, 2, INK); c.rect(cx + 1, cyy - 2, 3, 2, INK); c.rect(cx - 3, cyy + 3, 6, 1, INK); });
      c.box(13 * S, 2 * S + 7, 3 * S, 20, [90, 130, 90], wd); for (let i = 0; i < 5; i++) c.box(13 * S + 4 + (i % 3) * 14, 2 * S + 10 + ((i / 3) | 0) * 9, 10, 7, [[250, 250, 240], [250, 230, 160], [250, 200, 200]][i % 3], [120, 120, 110]);
      // the counter
      c.rect(11 * S, 4 * S, 6 * S, S, [226, 206, 170]); c.box(11 * S, 5 * S - 2, 6 * S, 17, wd, mix(wd, 0.5)); c.rect(11 * S + 1, 5 * S - 1, 6 * S - 2, 4, lite(wd, 0.3));
      c.box(12 * S, 4 * S + 2, 12, 10, [200, 200, 214], [60, 60, 80]); c.rect(12 * S + 2, 4 * S + 4, 8, 5, [120, 200, 230]); c.box(14 * S, 4 * S + 6, 18, 8, [200, 150, 100], [110, 70, 50]); for (let k = 0; k < 3; k++) c.ellipse(14 * S + 4 + k * 5, 4 * S + 6, 3, 3, [226, 60, 60]); c.ellipse(16 * S, 4 * S + 9, 4, 3, [226, 190, 110]);
    });
    prop(p, 3, 6, 3, 2, (c, top, X, Y) => { for (const [dx, dy] of [[-12, 8], [50, 8], [10, -8], [28, -8], [10, 24], [28, 24]]) { c.box(X + dx, Y + dy + 2, 10, 8, [140, 90, 170], [90, 50, 110]); } c.rect(X + 4, Y + 30, 42, 3, [0, 0, 0, 50]); c.box(X + 2, Y + 6, 44, 22, wd, mix(wd, 0.5)); c.rect(X + 3, Y + 7, 42, 3, lite(wd, 0.3)); c.ellipse(X + 14, Y + 16, 4, 3, [250, 250, 240]); c.ellipse(X + 14, Y + 16, 2, 1, [110, 160, 90]); c.box(X + 26, Y + 12, 10, 8, [60, 60, 70], INK); c.rect(X + 30, Y + 9, 2, 3, [60, 60, 70]); });
    prop(p, 1, 4, 2, 1, (c, top, X, Y) => { c.box(X + 1, Y + 9, 30, 6, [250, 250, 244], [170, 170, 180]); c.box(X + 1, Y + 4, 30, 6, [190, 210, 240], [120, 140, 180]); c.box(X + 1, Y - 1, 30, 6, [250, 200, 200], [190, 130, 130]); });
    for (const y of [8, 9]) prop(p, 16, y, 1, 1, (c, top, X, Y) => { c.box(X + 1, Y + 4, 14, 11, [176, 130, 84], [90, 60, 40]); for (let k = 0; k < 6; k++) c.ellipse(X + 4 + (k % 3) * 4, Y + 5 + ((k / 3) | 0) * 4, 2, 2, [226, 60, 60]); });
    prop(p, 12, 12, 2, 1, (c, top, X, Y) => { c.box(X + 1, Y + 1, 30, 14, wd, mix(wd, 0.5)); c.rect(X + 2, Y + 7, 28, 1, mix(wd, 0.5)); for (let k = 0; k < 4; k++) { c.rect(X + 4 + k * 7, Y + 4, 5, 3, [[200, 60, 60], [60, 90, 170], [240, 240, 240], [70, 70, 80]][k]); c.rect(X + 4 + k * 7, Y + 11, 5, 3, [[70, 70, 80], [240, 240, 240], [200, 60, 60], [110, 160, 90]][k]); } });
    p.decor("rPot", 1, 12, { optional: true }); p.decor("rPlant", 10, 4, { optional: true });
  },
};
// The Blueberry League's champion court, off the League Club room: Kieran's dais under the screen, the club's
// table and lockers, students in the stands.
R.PaldeaKieranArena = {
  theme: { room: "arena", floor: "rLab", wall: null },
  plan(p) {
    const bl = [56, 104, 216], navy = [30, 44, 110];
    tiles(p, 1, 4, 22, 19, [228, 238, 252], [210, 224, 246]);
    p.block(9, 4, 6, 2);
    p.paint(0.3, (c) => { const X = S, w = 22 * S;
      c.rect(X, 0, w, 4 * S, navy); for (let x = X; x < X + w; x += 16) c.rect(x, 0, 1, 4 * S, [24, 36, 94]); c.rect(X, 4 * S - 3, w, 3, [250, 210, 80]); c.rect(X, 0, w, 3, WHITE);
      screen(c, 8 * S, 8, 8 * S, 48, bl, (g, x, y, w2, h2) => { berry(g, x + w2 / 2, y + h2 / 2 + 2, 15); for (const dx of [14, w2 - 30]) for (let k = 0; k < 4; k++) g.rect(x + dx, y + 10 + k * 8, 16 - (k % 2) * 5, 3, WHITE); });
      for (const x of [3, 6, 18, 21]) banner(c, x * S, 8, 26, 44, x === 6 || x === 18 ? WHITE : bl, (g, cx, cyy) => berry(g, cx, cyy, 7));
      // the champion's dais
      for (let k = 0; k < 3; k++) { c.box(9 * S - 8 + k * 6, 4 * S + k * 9, 6 * S + 16 - k * 12, 12, [mix(bl, 0.9), bl, lite(bl, 0.2)][k], navy); }
      c.box(11 * S, 3 * S + 6, 2 * S, 30, [250, 210, 80], [150, 110, 30]); c.box(11 * S + 4, 3 * S + 16, 2 * S - 8, 20, [200, 60, 80], [120, 30, 50]); berry(c, 12 * S, 3 * S + 10, 5);
    });
    court(p, 5, 10, 19, 18, [60, 112, 224, 245], { r: 24, under: (c, X, Y, w, h) => { for (let j = 0; j * 21 < h - 34; j++) for (let i = 0; i * 26 < w - 44; i++) hex(c, X + 18 + i * 26 + (j & 1) * 13, Y + 14 + j * 21, 11, [76, 130, 236], 0.9); }, emblem: (c, cx, cy) => { c.ellipse(cx, cy, 12, 12, WHITE); berry(c, cx, cy, 8); } });
    for (const x of [1, 21]) prop(p, x, 9, 2, 10, (c, top, X, Y, w, h) => { c.rect(X, Y, w, h, navy); for (let y = Y; y < Y + h; y += 18) c.rect(X, y, w, 2, [50, 70, 150]); crowd(c, x === 1 ? X - 2 : X + 3, Y, w, h, x + 5, p); const e = x === 1 ? X + w - 2 : X; c.rect(e, Y, 2, h, WHITE); });
    // the League Club's table and lockers
    prop(p, 3, 5, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 62, 3, [0, 0, 0, 50]); for (const dx of [6, 26, 46]) c.box(X + dx, Y + 1, 12, 9, bl, navy); c.box(X, Y + 8, 64, 22, WHITE, [150, 170, 210]); c.rect(X + 1, Y + 24, 62, 5, [200, 214, 240]); c.box(X + 6, Y + 12, 12, 8, [70, 80, 100], INK); c.rect(X + 8, Y + 13, 8, 5, [150, 220, 250]); c.ellipse(X + 30, Y + 16, 5, 4, [250, 220, 120]); c.box(X + 42, Y + 11, 5, 9, [226, 80, 80], INK); c.box(X + 50, Y + 11, 5, 9, [90, 190, 120], INK); });
    prop(p, 16, 4, 5, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 78, 3, [0, 0, 0, 50]); for (let k = 0; k < 5; k++) { c.box(X + k * 16, Y - 6, 16, 37, k & 1 ? bl : lite(bl, 0.25), navy); for (let j = 0; j < 3; j++) c.rect(X + k * 16 + 4, Y - 2 + j * 3, 8, 1, navy); c.rect(X + k * 16 + 11, Y + 14, 2, 4, [250, 210, 80]); } });
    p.decor("rPlant", 8, 4, { optional: true }); p.decor("rPlant", 15, 4, { optional: true });
    p.paint(90, (c, top) => { beam(top, 4 * S, 0, 8 * S, 13 * S, 32, [200, 230, 255]); beam(top, 20 * S, 0, 17 * S, 13 * S, 32, [200, 230, 255]); });
  },
};

// ---------------------------------------------------------------- caves
const shaft = (p, x, y, r, col = [255, 250, 210]) => p.paint(95, (c, top) => { const t = (y - 8) * S; c.ellipse(x * S + 8, y * S + 10, r * 1.1, r * 0.6, [col[0], col[1], col[2], 60]); top.poly([[x * S - 4, t], [x * S + 24, t], [x * S + 8 + r, y * S + 10], [x * S + 8 - r, y * S + 10]], [col[0], col[1], col[2], 34]); top.poly([[x * S + 4, t], [x * S + 16, t], [x * S + 8 + r * 0.5, y * S + 10], [x * S + 8 - r * 0.5, y * S + 10]], [col[0], col[1], col[2], 30]); top.ellipse(x * S + 10, t, 14, 5, [col[0], col[1], col[2], 90]); });
const spikes = (p, list, col) => list.forEach(([x, y, h]) => prop(p, x, y, 1, 1, (c, top, X, Y) => stalagmite(c, X + 8, Y + 15, (h || 16) + 6, col)));
const gems = (p, list, cols) => list.forEach(([x, y, s], k) => prop(p, x, y - 1, 1, 2, (c, top, X, Y) => crystal(c, X + 8, Y + 31, s || 0.9, cols[k % cols.length]), 1));
function herba(p, list, col) {   // Herba Mystica: glowing sprigs
  p.paint(0.6, (c) => { for (const [x, y] of list) { const cx = x * S + 8, by = y * S + 14; c.ellipse(cx, by - 4, 13, 9, [col[0], col[1], col[2], 50]); for (const [dx, h] of [[-4, 7], [0, 11], [4, 8]]) { c.line(cx + dx * 0.5, by, cx + dx, by - h, [90, 170, 100], 1); c.ellipse(cx + dx, by - h, 2, 2, col); c.rect(cx + dx, by - h - 1, 1, 1, WHITE); } } });
}
// Inlet Grotto: the sea cave under the lighthouse cliff. Sand at the mouth, tide pools, a shaft of daylight.
R.PaldeaInletGrotto = {
  theme: { groves: 0, density: 0 },
  plan(p) {
    const cv = carve(p, [[19, 27, 6, 4], [17, 14, 13, 7.5], [29, 8, 5, 4], [7, 22, 4.5, 4]], [[3, [[19, 24], [19, 19]]], [3, [[26, 11], [28, 9]]], [3, [[8, 19], [9, 17]]]]);
    cv.lay("beach", 19, 28, 5, 3); cv.lay("beach", 19.5, 23.5, 1.6, 3.5); cv.lay("beach", 15, 14, 3.5, 2.5);
    for (const [x, y, rx, ry] of [[25, 15, 4, 3], [8, 13, 2.6, 2.2], [7, 22, 2.6, 2], [30, 8, 2.4, 1.8]]) { cv.lay("beach", x, y, rx + 1.2, ry + 1.2); cv.lay("water", x, y, rx, ry); }
    shaft(p, 15, 13, 26);
    spikes(p, [[6, 16, 18], [12, 9, 20], [22, 9, 16], [28, 18, 18], [13, 19, 14], [24, 20, 16], [31, 11, 18], [4, 20, 14], [10, 24, 16], [15, 25], [23, 25]]);
    p.paint(0.6, (c) => { for (let i = 0; i < 16; i++) { const x = (15 + p.hash(i, 1, 9) * 8) * S, y = (25 + p.hash(i, 2, 9) * 5) * S; if (i % 3 === 0) star(c, x, y, 4, [240, 130, 110]); else { c.ellipse(x, y, 3, 2, [250, 240, 230]); c.rect(x - 2, y, 5, 1, [226, 190, 170]); } }
      for (const [x, y] of [[20, 12], [12, 16], [22, 18], [27, 9]]) { c.ellipse(x * S, y * S, 9, 4, [90, 150, 200, 110]); c.ellipse(x * S - 2, y * S - 1, 4, 1, [200, 230, 250, 150]); } });
    for (const [x, y] of [[20, 9], [11, 17]]) p.decor("boulder", x, y);
  },
};
// The cave on Stony Cliff where the Titan kept its Herba Mystica: boulders, and the herb glowing at the back.
R.PaldeaStonyCave = {
  theme: { groves: 0, density: 0 },
  plan(p) {
    carve(p, [[19, 27, 5.5, 3.5], [21, 18, 8, 4.5], [13, 11, 9, 5.5], [30, 9, 4.5, 4], [6, 21, 4, 3.5]], [[3, [[19, 24], [19, 21]]], [3, [[14, 16], [14, 14]]], [3, [[26, 14], [28, 11]]], [3, [[9, 20], [14, 19]]]], "ground", [160, 120, 84]);
    herba(p, [[12, 9], [16, 9], [11, 12], [17, 12], [13, 14], [10, 10], [15, 8]], [250, 150, 200]);
    p.paint(0.5, (c) => c.ellipse(14 * S + 8, 11 * S, 70, 44, [250, 150, 200, 26]));
    for (const [x, y] of [[7, 9], [19, 12], [24, 15], [15, 17], [27, 19], [31, 6], [4, 20]]) p.decor("boulder", x, y);
    spikes(p, [[9, 14, 18], [20, 8, 16], [23, 21, 14], [17, 20, 14], [33, 11, 18], [28, 12, 14], [8, 23, 16], [22, 26], [16, 26], [5, 23, 12]], [170, 130, 96]);
    shaft(p, 14, 10, 20, [255, 220, 240]);
  },
};
// The Lurking Steel Titan's cave: grey ore-bearing rock, Orthworm's burrows, the herb in the middle.
R.PaldeaSteelCave = {
  theme: { groves: 0, density: 0 },
  plan(p) {
    const rock = [136, 128, 136];
    const cv = carve(p, [[19, 27, 5.5, 3.5], [18, 14, 12, 6.5], [6, 21, 4, 3.5], [31, 21, 4.5, 3.5], [29, 6, 4, 3]], [[3, [[19, 24], [19, 19]]], [3, [[9, 17], [8, 19]]], [3, [[28, 17], [30, 19]]], [3, [[27, 10], [28, 8]]]], "ground", rock);
    p.paint(0.06, (c) => { for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) if (cv.at(x, y)) c.rect(x * S, y * S, S, S, [150, 152, 176, 170]); });
    const hole = (c, top, X, Y) => { c.ellipse(X + 16, Y + 18, 16, 11, [110, 104, 116]); c.ellipse(X + 16, Y + 17, 14, 9, [70, 64, 80]); c.ellipse(X + 16, Y + 18, 12, 7, [26, 22, 34]); c.ellipse(X + 12, Y + 13, 4, 1, [150, 146, 160]); };
    for (const [x, y] of [[9, 11], [25, 10], [23, 16], [5, 20], [31, 20], [28, 5]]) prop(p, x, y, 2, 2, hole);
    herba(p, [[16, 12], [19, 12], [15, 15], [20, 16], [18, 11]], [170, 220, 255]);
    p.paint(0.5, (c) => { c.ellipse(17 * S + 8, 14 * S, 60, 36, [170, 220, 255, 26]); for (let i = 0; i < 90; i++) { const x = 2 + Math.floor(p.hash(i, 1, 14) * 34), y = 2 + Math.floor(p.hash(i, 2, 14) * 28), col = i % 3 ? [200, 206, 220] : [200, 120, 80]; if (!cv.at(x, y)) continue; c.rect(x * S + 3, y * S + 5, 4, 2, col); c.rect(x * S + 6, y * S + 8, 5, 2, col); c.rect(x * S + 4, y * S + 5, 1, 1, WHITE); } });
    gems(p, [[12, 17, 0.8], [26, 13, 0.9], [14, 9, 0.7], [22, 26, 0.7], [33, 23, 0.8], [8, 23, 0.7]], [[190, 196, 214], [160, 170, 200]]);
    spikes(p, [[11, 14, 16], [24, 19, 16], [20, 8, 14], [16, 26], [4, 22, 14], [32, 7, 14], [28, 22, 12]], rock);
    for (const [x, y] of [[13, 17], [21, 11]]) p.decor("boulder", x, y);
  },
};
// The depths of Area Zero: a cavern grown through with Tera crystal, glowing pools, and the Zero Lab's door at the far end.
R.PaldeaAreaZeroDepths = {
  theme: { groves: 0, density: 0 },
  plan(p) {
    const cols = [[130, 210, 250], [170, 150, 250], [240, 160, 240], [150, 230, 190], [250, 220, 150]], rock = [92, 100, 140];
    const cv = carve(p, [[19, 27, 6, 4], [18, 15, 14, 7], [19, 6, 6, 2.6], [5, 24, 3.5, 3], [32, 24, 4, 3.5]], [[3, [[19, 24], [19, 20]]], [3, [[19, 9], [19, 5]]], [3, [[7, 20], [6, 22]]], [3, [[30, 19], [31, 22]]]], "ground", rock);
    p.bare(1);
    for (const [x, y, rx, ry] of [[9, 15, 2.6, 2], [28, 13, 2.6, 2], [32, 24, 2, 1.6]]) cv.lay("water", x, y, rx, ry);
    p.paint(0.2, (c) => { c.rect(0, 0, p.W * S, p.H * S, [40, 60, 150, 70]);
      for (let i = 0; i < 150; i++) { const x = p.hash(i, 1, 21) * p.W * S, y = p.hash(i, 2, 21) * p.H * S, col = cols[i % 5]; if (!cv.at((x / S) | 0, (y / S) | 0) || !cv.at(((x + 8) / S) | 0, (y / S) | 0) || !cv.at(((x - 8) / S) | 0, (y / S) | 0)) continue; hex(c, x, y, 5 + p.hash(i, 3, 21) * 6, [col[0], col[1], col[2], 60], 0.8); }
      // the Zero Lab's front, set into the rock
      const X = 14 * S, w = 11 * S; c.rect(X, S, w, 3 * S, [196, 204, 224]); c.rect(X, S, w, 4, [236, 240, 250]); c.rect(X, 4 * S - 4, w, 4, [110, 120, 150]); for (let x = X + 8; x < X + w - 8; x += 20) c.rect(x, S + 8, 1, 2 * S + 16, [160, 170, 196]);
      hex(c, 19 * S + 8, S + 2, 26, [150, 160, 190], 0.5); hex(c, 19 * S + 8, S + 2, 20, [110, 236, 250], 0.5);
      c.box(18 * S, 2 * S - 4, 3 * S, 2 * S + 4, [70, 76, 100], [40, 44, 60]); c.rect(18 * S + 6, 2 * S + 2, 2 * S + 4, 2 * S - 2, [20, 22, 36]); c.rect(18 * S + 6, 2 * S + 2, 2 * S + 4, 2, [110, 236, 250]);
      for (const x of [15, 22.5]) screen(c, x * S, 2 * S, 22, 14, [110, 236, 250]);
      c.rect(18 * S, 4 * S, 3 * S, 2 * S, [120, 128, 156, 200]); for (let y = 4 * S; y < 6 * S; y += 4) c.rect(18 * S, y, 3 * S, 1, [80, 86, 110, 200]); });
    gems(p, [[8, 11, 1.2], [14, 10, 0.9], [24, 10, 1], [29, 17, 1.2], [6, 17, 1], [12, 19, 0.9], [25, 20, 0.9], [22, 13, 0.8], [13, 14, 0.7], [15, 26, 0.9], [23, 27, 1], [4, 25, 0.8], [34, 22, 0.9], [14, 6, 0.9], [24, 6, 0.9], [21, 17, 0.7], [16, 18, 0.6], [31, 14, 0.8]], cols);
    spikes(p, [[10, 20, 16], [27, 8, 16], [20, 21, 12], [3, 23, 14], [30, 26, 12]], rock);
    p.paint(96, (c, top) => { for (const [x, y, k] of [[9, 15, 0], [28, 13, 2], [32, 25, 3]]) c.ellipse(x * S, y * S, 56, 40, [...cols[k], 30]); });
  },
};
// ---------------------------------------------------------------- the Blueberry Elite Four, each in their biome
const biome = (theme, draw) => ({ theme: { cave: false, closed: true, density: 0, groves: 0, flowers: 0, autoHouses: false, ...theme }, plan: draw });
// Crispin, Savanna Biome: a red-earth court among acacias, with his camp kitchen and fires.
R.PaldeaSavannaTrial = biome({ ground: "autumn", road: "clay", border: "rock", grass: "autumn" }, (p) => {
  p.fill("clay", 3, 9, 20, 19); p.fill("clay", 9, 3, 14, 8);
  p.paint(0.04, (c) => c.rect(S, S, 22 * S, 20 * S, [230, 190, 80, 80]));
  court(p, 4, 10, 20, 18, [226, 110, 60, 200], { r: 24, emblem: (c, cx, cy) => { c.ellipse(cx, cy, 12, 12, WHITE); flame(c, cx, cy + 8, 1); } });
  const acacia = (c, top, X, Y) => { shadow(c, X + 24, Y + 46, 18); c.line(X + 24, Y + 46, X + 22, Y + 22, [120, 84, 54], 4); c.line(X + 22, Y + 28, X + 10, Y + 16, [120, 84, 54], 2); c.line(X + 23, Y + 26, X + 38, Y + 16, [120, 84, 54], 2); top.ellipse(X + 24, Y + 12, 24, 9, [110, 140, 60]); top.ellipse(X + 20, Y + 9, 18, 6, [140, 170, 70]); top.ellipse(X + 12, Y + 14, 9, 4, [140, 170, 70]); };
  for (const [x, y] of [[2, 3], [18, 2], [5, 5]]) prop(p, x, y, 3, 3, acacia, 1);
  prop(p, 10, 4, 4, 2, (c, top, X, Y) => { c.rect(X + 2, Y + 30, 62, 3, [0, 0, 0, 50]); c.box(X, Y + 12, 64, 19, [176, 130, 84], [90, 60, 40]); c.rect(X + 1, Y + 13, 62, 4, [214, 170, 120]); c.box(X + 6, Y + 2, 16, 12, [70, 70, 80], INK); c.ellipse(X + 14, Y + 3, 8, 3, [200, 90, 50]); c.rect(X + 22, Y + 6, 6, 2, INK); for (let k = 0; k < 3; k++) c.ellipse(X + 36 + k * 8, Y + 10, 3, 3, [[226, 60, 60], [250, 200, 80], [130, 200, 90]][k]); c.box(X + 26, Y + 20, 14, 8, [226, 60, 50], [130, 30, 30]); flame(c, X + 33, Y + 28, 0.4); });
  for (const [x, y] of [[8, 7], [15, 7], [3, 9], [20, 9]]) prop(p, x, y, 1, 1, (c, top, X, Y) => brazier(c, X + 8, Y + 15));
  for (const [x, y] of [[16, 4], [2, 15]]) p.decor("boulder", x, y);
  p.paint(0.3, (c) => { for (let i = 0; i < 30; i++) { const x = (2 + p.hash(i, 1, 4) * 19) * S, y = (2 + p.hash(i, 2, 4) * 6) * S; c.rect(x, y, 1, 5, [200, 170, 80]); c.rect(x + 2, y + 1, 1, 4, [220, 190, 100]); c.rect(x - 2, y + 2, 1, 3, [200, 170, 80]); } });
});
// Lacey, Coastal Biome: a pink court on the sand by the water, parasols and shells.
R.PaldeaCoastalTrial = biome({ ground: "beach", road: "sand", border: "palms", grass: "beach", water: "sea" }, (p) => {
  p.fill("water", 2, 2, 21, 5); p.disc("water", 5, 6, 3, 1.6); p.disc("water", 17, 6, 4, 1.6);
  p.fill("deck", 3, 9, 20, 19); p.fill("deck", 11, 4, 12, 8);
  court(p, 4, 10, 20, 18, [250, 170, 206, 220], { r: 24, emblem: (c, cx, cy) => { c.ellipse(cx, cy, 12, 12, WHITE); heart(c, cx, cy, 7, [240, 110, 170]); },
    under: (c, X, Y, w, h) => { for (let y = Y + 12; y < Y + h - 8; y += 24) for (let x = X + 16 + ((y / 24) & 1) * 16; x < X + w - 10; x += 32) star(c, x, y, 4, [255, 214, 232]); } });
  const parasol = (col) => (c, top, X, Y) => { shadow(c, X + 16, Y + 30, 12); c.box(X + 2, Y + 22, 28, 7, [250, 250, 240], [190, 170, 150]); c.rect(X + 2, Y + 22, 9, 7, col); c.rect(X + 15, Y + 2, 2, 26, [150, 130, 110]); top.poly([[X - 2, Y + 8], [X + 16, Y - 6], [X + 34, Y + 8]], col); for (let i = -1; i < 3; i++) top.poly([[X + 2 + i * 12, Y + 8], [X + 16, Y - 6], [X + 8 + i * 12, Y + 8]], WHITE); top.rect(X - 2, Y + 8, 36, 2, mix(col, 0.8)); };
  [[3, 7, [250, 130, 170]], [7, 7, [120, 200, 240]], [15, 7, [250, 210, 110]], [19, 7, [250, 130, 170]]].forEach(([x, y, col]) => prop(p, x, y, 2, 2, parasol(col), 1));
  prop(p, 11, 3, 2, 1, (c, top, X, Y) => { c.box(X + 2, Y + 2, 28, 12, [250, 250, 250], [200, 150, 180]); heart(c, X + 16, Y + 7, 4, [240, 110, 170]); c.rect(X + 4, Y + 14, 2, 4, [150, 130, 110]); c.rect(X + 26, Y + 14, 2, 4, [150, 130, 110]); });
  p.paint(0.6, (c) => { for (let i = 0; i < 18; i++) { const x = (2 + p.hash(i, 1, 6) * 19) * S, y = (6.5 + p.hash(i, 2, 6) * 2.2) * S; if (i % 3 === 0) star(c, x, y, 4, [250, 150, 130]); else { c.ellipse(x, y, 3, 2, [250, 240, 244]); c.rect(x - 2, y, 5, 1, [240, 190, 200]); } } });
});
// Amarys, Canyon Biome: a steel court on the rock, pylons and the flight team's rings.
R.PaldeaCanyonTrial = biome({ ground: "gravel", road: "gravel", border: "rock", grass: "gravel" }, (p) => {
  p.fill("steel", 3, 9, 20, 19); p.fill("steel", 10, 3, 13, 8);
  court(p, 4, 10, 20, 18, [150, 170, 200, 230], { line: [40, 60, 110, 240], r: 24, dot: [40, 60, 110], emblem: (c, cx, cy) => { c.ellipse(cx, cy, 12, 12, WHITE); hex(c, cx, cy, 9, [110, 130, 170], 1); hex(c, cx, cy, 5, WHITE, 1); },
    under: (c, X, Y, w, h) => { for (let x = X + 8; x < X + w; x += 16) c.rect(x, Y, 1, h, [130, 150, 184]); for (let y = Y + 8; y < Y + h; y += 16) c.rect(X, y, w, 1, [130, 150, 184]); } });
  const pylon = (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 7); c.box(X + 4, Y - 10, 8, 40, [150, 160, 184], [50, 56, 76]); c.rect(X + 6, Y - 8, 2, 36, [210, 216, 232]); for (let k = 0; k < 4; k++) c.rect(X + 4, Y - 4 + k * 9, 8, 2, k & 1 ? [250, 210, 60] : [40, 60, 110]); top.ellipse(X + 8, Y - 12, 3, 3, [250, 90, 80]); };
  for (const [x, y] of [[3, 8], [20, 8], [8, 6], [15, 6]]) prop(p, x, y - 1, 1, 2, pylon, 1);
  const ring = (c, top, X, Y) => { shadow(c, X + 16, Y + 30, 10); c.rect(X + 15, Y + 22, 2, 8, [90, 96, 120]); c.ellipse(X + 16, Y + 10, 13, 13, [250, 210, 60], 3); c.ellipse(X + 16, Y + 10, 13, 13, [40, 60, 110], 1); };
  for (const [x, y] of [[4, 4], [18, 4]]) prop(p, x, y, 2, 2, ring, 1);
  prop(p, 11, 3, 2, 2, (c, top, X, Y) => { shadow(c, X + 16, Y + 30, 12); c.box(X + 2, Y + 8, 28, 22, [110, 120, 150], [40, 44, 60]); for (let k = 0; k < 3; k++) { c.rect(X + 5, Y + 11 + k * 6, 22, 3, [60, 66, 90]); c.rect(X + 6 + k * 7, Y + 12 + k * 6, 4, 1, [110, 236, 250]); } c.rect(X + 15, Y - 6, 2, 14, [150, 160, 184]); for (let a = 0; a < 3; a++) c.line(X + 16, Y - 6, X + 16 + Math.cos(a * 2.094 + 0.4) * 11, Y - 6 + Math.sin(a * 2.094 + 0.4) * 11, WHITE, 2); });
  for (const [x, y] of [[2, 14], [6, 2], [15, 3], [20, 5]]) p.decor("boulder", x, y);
});
// Drayton, Polar Biome: an indigo court on the ice between snowbound pines and dragon stones.
R.PaldeaPolarTrial = biome({ ground: "snow", road: "snow", border: "pine", grass: "snow" }, (p) => {
  for (const [x, y, r] of [[5, 5, 3], [18, 6, 3], [11, 4, 2.4]]) p.disc("drift", x, y, r, r * 0.7);
  court(p, 4, 10, 20, 18, [110, 110, 220, 215], { r: 24, emblem: (c, cx, cy) => { c.ellipse(cx, cy, 12, 12, WHITE); c.poly([[cx - 7, cy - 6], [cx + 8, cy], [cx - 7, cy + 6], [cx - 3, cy]], [90, 80, 200]); c.rect(cx + 2, cy - 1, 2, 2, WHITE); },
    under: (c, X, Y, w, h) => { for (let i = 0; i < 9; i++) { const x = X + 10 + i * 30; c.line(x + 12, Y + 6 + (i % 3) * 30, x, Y + 26 + (i % 3) * 30, [255, 255, 255, 110], 2); } } });
  for (const [x, y] of [[3, 3], [20, 3], [2, 8], [21, 8], [8, 3], [15, 3]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pine(c, top, X + 8, Y + 15));
  const dragon = (c, top, X, Y) => { const st = [150, 156, 190]; shadow(c, X + 16, Y + 30, 12); c.box(X + 4, Y + 24, 24, 7, mix(st, 0.8), [70, 74, 100]); c.poly([[X + 8, Y + 24], [X + 10, Y + 8], [X + 16, Y + 2], [X + 24, Y + 6], [X + 26, Y + 12], [X + 20, Y + 12], [X + 22, Y + 24]], st); c.poly([[X + 10, Y + 8], [X + 4, Y - 2], [X + 14, Y + 4]], lite(st, 0.3)); c.poly([[X + 16, Y + 2], [X + 20, Y - 6], [X + 21, Y + 4]], lite(st, 0.3)); c.rect(X + 20, Y + 7, 2, 2, [250, 210, 60]); c.rect(X + 8, Y + 22, 16, 2, WHITE); };
  prop(p, 5, 6, 2, 2, dragon, 1); prop(p, 17, 6, 2, 2, dragon, 1);
  gems(p, [[11, 6, 1], [12, 7, 0.8], [3, 9, 0.7], [20, 10, 0.7]], [[150, 210, 250], [170, 170, 250]]);
  p.paint(8.5, (c) => { for (const [x, y, r] of [[9, 8, 10], [14, 8, 9], [6, 3, 9], [17, 3, 10], [22, 13, 0]]) if (r) mound(c, x * S + 8, y * S + 12, r); });
});

// ---------------------------------------------------------------- Pokémon Centers
// Paldea's Centers are open-air stands: one red canopy over the healing desk, the Poké Mart counter and
// the TM Machine, set down on whatever the town is paved with.
function kiosk(ground, path, snow) {
  return {
    theme: { room: "center", floor: ground, wall: null },
    plan(p) {
      const T = p.top, B = p.bottom, n = p.people[0], dx = Math.max(1, Math.min(p.right - 6, n.x - 3)), mid = (dx + 3.5) * S, red = [226, 70, 60], hedge = [70, 140, 84];
      p.fill(ground, 1, 1, p.right, T - 3);
      p.fill(path, dx, T + 2, dx + 6, B); p.fill(path, 2, T + 2, p.right - 1, T + 3);
      p.block(2, T, dx - 2, 2); p.block(dx + 7, T, p.right - dx - 7, 2);
      p.decor("rDesk", dx, T - 2);
      p.paint(0.3, (c) => { const X = 2 * S, w = (p.right - 2) * S, y = (T - 2) * S;
        // hedges where a room would have walls
        for (const [hx, hy, hw, hh] of [[0, 0, S, p.H * S], [(p.W - 1) * S, 0, S, p.H * S], [0, (B + 1) * S, p.W * S, (p.H - B - 1) * S], [0, 0, p.W * S, S], [S, (T - 2) * S, S, 2 * S], [p.right * S, (T - 2) * S, S, 2 * S]]) { c.rect(hx, hy, hw, hh, hedge); for (let j = hy; j < hy + hh; j += 8) for (let i = hx + ((j / 8) & 1) * 4; i < hx + hw; i += 8) { c.ellipse(i + 3, j + 3, 4, 4, lite(hedge, 0.18)); c.rect(i + 5, j + 6, 2, 2, mix(hedge, 0.7)); } if (snow) for (let j = hy; j < hy + hh; j += 8) for (let i = hx + ((j / 8) & 1) * 4; i < hx + hw; i += 8) c.ellipse(i + 3, j + 2, 3, 2, [244, 248, 255]); }
        // the back of the stand
        c.rect(X, y, w, 2 * S, [236, 232, 224]); c.rect(X, y + 2 * S - 3, w, 3, [150, 150, 160]);
        c.box(X + 2, y + 4, (dx - 2) * S - 4, 24, [70, 120, 200], [40, 70, 130]); for (let j = 0; j < 2; j++) for (let i = X + 6; i < dx * S - 8; i += 8) c.box(i, y + 7 + j * 11, 6, 8, [[250, 210, 80], [226, 80, 80], [250, 250, 250], [120, 200, 120]][((i >> 3) + j) % 4], [40, 70, 130]);
        const rx = (dx + 7) * S; c.box(rx + 2, y + 4, X + w - rx - 4, 24, [250, 214, 90], [150, 110, 30]); c.ellipse(rx + 22, y + 16, 9, 9, [150, 100, 200]); c.ellipse(rx + 22, y + 16, 3, 3, [250, 214, 90]); c.box(rx + 38, y + 8, 26, 16, [30, 32, 46], [12, 12, 20]); for (let i = 0; i < 4; i++) c.rect(rx + 41, y + 11 + i * 3, 12 + ((i * 7) % 9), 1, [150, 230, 170]);
        // the two counters
        for (const [cx0, cx1, col] of [[X, dx * S, [70, 120, 200]], [rx, X + w, [250, 214, 90]]]) { c.rect(cx0, T * S, cx1 - cx0, S, [200, 200, 210]); c.box(cx0, T * S + 12, cx1 - cx0, 19, WHITE, [150, 150, 160]); c.rect(cx0 + 1, T * S + 22, cx1 - cx0 - 2, 4, col); c.rect(cx0 + 1, T * S + 13, cx1 - cx0 - 2, 3, [236, 236, 244]); }
        for (let i = X + 6; i < dx * S - 10; i += 14) { c.box(i, T * S + 4, 10, 9, [176, 130, 84], [90, 60, 40]); c.ellipse(i + 3, T * S + 5, 2, 2, [226, 80, 80]); c.ellipse(i + 7, T * S + 5, 2, 2, [90, 150, 230]); }
        c.box(rx + 8, T * S - 2, 30, 15, [150, 100, 200], [80, 50, 120]); c.ellipse(rx + 23, T * S + 5, 5, 5, [250, 214, 90]); c.ellipse(rx + 23, T * S + 5, 2, 2, [150, 100, 200]); c.box(rx + 46, T * S + 2, 12, 11, [60, 60, 76], INK); c.rect(rx + 48, T * S + 4, 8, 5, [150, 230, 170]);
      });
      // the canopy
      p.paint(T + 2.5, (c, top) => { const X = S + 6, w = (p.right - 1) * S - 12, y = (T - 3) * S - 6;
        for (const px of [X + 4, X + w - 7]) c.rect(px, y + 20, 3, (T + 2) * S - y - 22, [200, 200, 210]);
        c.poly([[X - 4, y + 24], [X + 10, y], [X + w - 10, y], [X + w + 4, y + 24]], red); c.poly([[X - 4, y + 24], [X + 10, y], [X + 26, y], [X + 12, y + 24]], lite(red, 0.2)); c.rect(X - 4, y + 22, w + 8, 4, WHITE); c.rect(X - 4, y + 26, w + 8, 2, mix(red, 0.6));
        if (snow) { c.rect(X + 10, y - 2, w - 20, 5, [244, 248, 255]); for (let i = X + 12; i < X + w - 14; i += 9) c.ellipse(i + 4, y + 3, 5, 3, [244, 248, 255]); }
        c.ellipse(mid, y + 12, 11, 11, WHITE); c.ellipse(mid, y + 12, 9, 9, red); c.rect(mid - 9, y + 12, 18, 9, WHITE); c.ellipse(mid, y + 16, 8, 5, WHITE); c.rect(mid - 9, y + 11, 18, 2, INK); c.ellipse(mid, y + 12, 3, 3, INK); c.ellipse(mid, y + 12, 2, 2, WHITE);
        c.box(X + 22, y + 6, 34, 12, [70, 120, 200], WHITE); for (let i = 0; i < 4; i++) c.rect(X + 26 + i * 7, y + 9, 5, 6, WHITE); c.box(X + w - 56, y + 6, 34, 12, [250, 214, 90], WHITE); c.rect(X + w - 52, y + 9, 10, 2, INK); c.rect(X + w - 48, y + 9, 2, 6, INK); c.rect(X + w - 38, y + 9, 2, 6, INK); c.rect(X + w - 30, y + 9, 2, 6, INK); c.rect(X + w - 36, y + 10, 6, 2, INK);
      });
      const bench = (c, top, X, Y) => { c.rect(X + 3, Y + 14, 28, 2, [0, 0, 0, 50]); c.box(X + 2, Y + 5, 28, 6, [190, 140, 96], [100, 66, 44]); c.rect(X + 2, Y + 1, 28, 3, [190, 140, 96]); c.rect(X + 4, Y + 11, 3, 4, [100, 66, 44]); c.rect(X + 25, Y + 11, 3, 4, [100, 66, 44]); };
      for (const [x, y] of [[2, T + 5], [p.right - 2, T + 5], [2, B - 1], [p.right - 2, B - 1]]) prop(p, x, y, 2, 1, bench);
      for (const [x, y] of [[1, T + 2], [p.right, T + 2], [1, B - 3], [p.right, B - 3]]) p.decor("hedge", x, y, { optional: true });
      for (const x of [dx - 1, dx + 7]) prop(p, x, B - 1, 1, 2, (c, top, X, Y) => { shadow(c, X + 8, Y + 30, 5); c.rect(X + 7, Y + 6, 2, 24, [70, 70, 86]); c.rect(X + 5, Y + 29, 6, 2, [70, 70, 86]); c.box(X + 4, Y - 2, 8, 9, [255, 240, 170], [70, 70, 86]); }, 1);
    },
  };
}
R.PaldeaLosPlatosCenter = kiosk("meadow", "sand");
R.PaldeaMesagozaCenter = kiosk("ornate", "paving");
R.PaldeaArtazonCenter = kiosk("lawn", "sand");
R.PaldeaCascarrafaCenter = kiosk("sand", "paving");
R.PaldeaLevinciaCenter = kiosk("paving", "ornate");
R.PaldeaMedaliCenter = kiosk("brick", "paving");
R.PaldeaMonteneveraCenter = kiosk("snow", "gravel", true);
R.PaldeaAlfornadaCenter = kiosk("gravel", "brick");
R.PaldeaGlaseadoCenter = kiosk("drift", "gravel", true);

// Painted floors cover the builder's doormat: every room gets it back.
for (const name of Object.keys(R)) { const plan = R[name].plan; R[name].plan = (p) => { plan(p); if (!p.room) return; const e = p.warps.find((w) => w.exit); if (e) p.paint(0.9, (c) => { c.box(e.x * S - 8, e.y * S + 2, 32, 13, [200, 60, 56], [110, 30, 34]); c.rect(e.x * S - 5, e.y * S + 5, 26, 7, [232, 96, 84]); }); }; }

module.exports = R;
