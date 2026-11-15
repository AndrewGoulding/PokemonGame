// Galar's routes and the Wild Area, drawn by hand from what Sword and Shield show there. See README.md.
"use strict";
const S = 16;
const mix = (a, f) => a.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
const SNOW = [244, 248, 255];
// Makes tiles solid, leaving any kept tile (gate, person, landing) open.
function blk(p, x0, y0, w = 1, h = 1) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 1 || y < 1 || x >= p.W - 1 || y >= p.H - 1) continue; try { p.block(x, y, 1, 1); } catch (_) { /* kept tile */ } } }
function fenceTile(p, x, y, vert, col) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, py = y * S, dk = mix(col, 0.6);
    if (vert) { c.rect(px + 6, py - 3, 4, 19, dk); c.rect(px + 7, py - 3, 2, 18, col); } else { for (const j of [5, 10]) { c.rect(px, py + j, 16, 3, dk); c.rect(px, py + j, 16, 2, col); } c.rect(px + 6, py + 2, 4, 13, dk); c.rect(px + 7, py + 2, 2, 12, col); } });
}
// A rail fence round a rectangle; gaps are "x,y" strings.
function fence(p, x0, y0, x1, y1, gaps = [], col = [182, 140, 90]) {
  for (let x = x0; x <= x1; x++) for (const y of y0 === y1 ? [y0] : [y0, y1]) if (!gaps.includes(x + "," + y)) fenceTile(p, x, y, false, col);
  for (let y = y0 + 1; y < y1; y++) for (const x of x0 === x1 ? [x0] : [x0, x1]) if (!gaps.includes(x + "," + y)) fenceTile(p, x, y, true, col);
}
// A run of wall blocks (dry stone, brick...).
function wall(p, x0, x1, y, col = [170, 166, 160], hgt = 15) {
  for (let x = x0; x <= x1; x++) { blk(p, x, y); p.paint(y + 1, (c) => { const i = x * S, b = y * S + 16; c.box(i, b - hgt, 16, hgt, col, mix(col, 0.55)); for (let j = b - hgt + 5; j < b - 2; j += 5) c.rect(i + 2 + ((j / 5 | 0) % 2) * 6, j, 6, 1, mix(col, 0.75)); c.rect(i + 1, b - hgt + 1, 14, 2, mix(col, 1.15)); }); }
}
function wooloo(p, x, y) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S + 8, py = y * S + 8, s = p.hash(x, y, 3) < 0.5 ? -1 : 1; c.ellipse(px, py + 6, 7, 2, [0, 0, 0, 50]); c.rect(px - 4, py + 4, 2, 3, [60, 52, 56]); c.rect(px + 2, py + 4, 2, 3, [60, 52, 56]); c.ellipse(px, py, 7, 6, [226, 222, 212]); c.ellipse(px - 1, py - 1, 5, 4, [252, 250, 244]); c.rect(px + s * 5 - 2, py - 2, 4, 5, [60, 52, 56]); c.rect(px + s * 5 - 1, py - 1, 1, 1, [255, 255, 255]); });
}
// A Max Raid den: a ring of red rock on the ground (glowing when lit).
function den(p, x, y, lit = true) { p.paint(0.5, (c) => { const cx = x * S + 8, cy = y * S + 9; c.ellipse(cx, cy, 14, 10, [110, 78, 70]); c.ellipse(cx, cy, 11, 7, [58, 26, 34]); if (lit) c.ellipse(cx, cy, 7, 4, [214, 60, 96, 210]); for (let a = 0; a < 8; a++) c.ellipse(cx + Math.round(Math.cos(a * 0.785) * 13), cy + Math.round(Math.sin(a * 0.785) * 9), 3, 2, [150, 110, 96]); }); }
function tent(p, x, y, col) {
  blk(p, x, y, 2, 2);
  p.paint(y + 2, (c) => { const px = x * S, py = y * S, b = py + 31; c.ellipse(px + 16, b, 17, 3, [0, 0, 0, 50]); c.poly([[px - 1, b], [px + 16, py + 3], [px + 33, b]], mix(col, 0.5)); c.poly([[px + 1, b - 1], [px + 16, py + 6], [px + 31, b - 1]], col); c.poly([[px + 16, py + 6], [px + 31, b - 1], [px + 16, b - 1]], mix(col, 0.8)); c.poly([[px + 10, b - 1], [px + 16, b - 16], [px + 22, b - 1]], [50, 44, 50]); });
}
// A clump of mushrooms; o.glow gives them a halo of light.
function mushrooms(p, x, y, cap = [216, 44, 66], o = {}) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, py = y * S; if (o.glow) { c.ellipse(px + 8, py + 8, 15, 12, [...o.glow, 46]); c.ellipse(px + 8, py + 8, 10, 8, [...o.glow, 70]); }
    for (const [i, j, r] of [[4, 6, 4], [11, 9, 3], [7, 12, 2]]) { c.rect(px + i - 1, py + j, 3, 5, [240, 230, 210]); c.ellipse(px + i, py + j, r + 1, r, mix(cap, 0.6)); c.ellipse(px + i, py + j - 1, r, r - 1, cap); c.rect(px + i - 1, py + j - 2, 1, 1, [255, 240, 240]); } });
}
// A tall glowing toadstool of the Glimwood Tangle.
function toadstool(p, x, y, cap, hgt = 30) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const m = x * S + 8, b = y * S + 15; c.ellipse(m, b - 4, 20, 13, [...cap, 40]); c.ellipse(m, b, 6, 2, [0, 0, 0, 70]); c.rect(m - 2, b - hgt + 4, 5, hgt - 4, [226, 220, 230]); c.rect(m - 2, b - hgt + 4, 1, hgt - 4, [170, 160, 190]);
    for (const g of [c, top]) { g.ellipse(m, b - hgt, 16, 11, [...cap, 50]); g.ellipse(m, b - hgt + 2, 11, 6, mix(cap, 0.6)); g.ellipse(m, b - hgt, 10, 5, cap); g.rect(m - 6, b - hgt - 2, 2, 2, [255, 255, 255]); g.rect(m + 3, b - hgt, 2, 2, [255, 255, 255]); g.rect(m - 1, b - hgt - 4, 2, 1, [255, 255, 255]); } });
}
// A hand-drawn house; with k it stands over warp k (its door), else it is scenery. o: wall, door, snow, sign, chimney.
function house(p, x0, y0, w, h, roof, o = {}, k = null) {
  const dxT = k == null ? x0 + (o.doorAt == null ? (w >> 1) : o.doorAt) : p.warps[k].x; if (k != null) p.bare(k); blk(p, x0, y0, w, h);
  p.paint(y0 + h + 0.5, (c) => { const x = x0 * S, y = y0 * S, W = w * S, b = y + h * S, dx = dxT * S, wl = o.wall || [228, 216, 192], wy = b - 28, r0 = y + 3, dark = mix(roof, 0.62), lite = mix(roof, 1.22), frame = [80, 62, 54];
    c.rect(x + 2, b - 3, W - 2, 4, [0, 0, 0, 50]); c.box(x + 3, wy, W - 6, 28, wl, frame);
    for (let j = wy + 5; j < b - 2; j += 6) for (let i = x + 6 + ((j / 6 | 0) % 2) * 5; i < x + W - 10; i += 11) c.rect(i, j, 5, 2, mix(wl, 0.86));
    if (o.chimney !== false) c.box(x + W - 30, r0 - 6, 9, 14, [168, 104, 84], [70, 50, 44]);
    c.poly([[x - 1, wy + 3], [x + 13, r0 - 1], [x + W - 13, r0 - 1], [x + W + 1, wy + 3]], [60, 44, 40]); c.poly([[x + 1, wy + 1], [x + 14, r0 + 1], [x + W - 14, r0 + 1], [x + W - 1, wy + 1]], roof);
    for (let j = r0 + 5; j < wy; j += 5) { const inset = 14 - 12 * (j - r0) / (wy - r0); c.rect(x + inset + 2, j, W - 2 * inset - 4, 1, dark); }
    c.rect(x + 15, r0 + 1, W - 30, 2, lite);
    if (o.snow) { c.poly([[x + 7, r0 + 17], [x + 14, r0], [x + W - 14, r0], [x + W - 7, r0 + 17]], SNOW); for (let i = x + 9; i < x + W - 12; i += 9) c.ellipse(i + 3, r0 + 17, 5, 3, SNOW); }
    c.box(dx + 2, b - 21, 12, 21, o.door || [120, 78, 48], [52, 36, 30]); c.rect(dx + 11, b - 11, 2, 2, [240, 210, 110]);
    for (const wx of [dx - 22, dx + 27, dx - 44, dx + 49]) if (wx > x + 5 && wx < x + W - 17) { c.box(wx, b - 21, 11, 11, [150, 204, 238], frame); c.rect(wx + 5, b - 20, 1, 9, frame); c.rect(wx + 1, b - 16, 9, 1, frame); }
    if (o.sign) { c.box(dx - 10, wy - 4, 36, 9, [250, 244, 224], [60, 50, 50]); for (let i = 0; i < 7; i++) c.rect(dx - 6 + i * 4, wy - 1, 2, 3, o.sign); } });
}
// A gateway over warp k: two piers and a lintel (o.snow, o.dark inside) the walker passes under.
function gate(p, k, col = [170, 166, 160], o = {}) {
  const d = p.warps[k]; p.bare(k); blk(p, d.x - 1, d.y); blk(p, d.x + 1, d.y);
  p.paint(d.y + 1, (c, top) => { const px = d.x * S, b = d.y * S + 16, dk = mix(col, 0.55); if (o.dark) c.rect(px, b - 16, 16, 16, o.dark);
    for (const i of [px - 14, px + 16]) { c.box(i, b - 30, 14, 30, col, dk); c.rect(i + 2, b - 22, 5, 1, mix(col, 0.75)); c.rect(i + 6, b - 12, 5, 1, mix(col, 0.75)); c.rect(i + 1, b - 29, 12, 2, mix(col, 1.15)); }
    top.box(px - 18, b - 40, 52, 11, o.lintel || mix(col, 0.9), dk); top.rect(px - 16, b - 38, 48, 2, mix(col, 1.2)); if (o.snow) top.rect(px - 18, b - 42, 52, 4, SNOW); });
}
// A factory chimney stack with a plume of smoke.
function chimney(p, x, y, hgt = 60, col = [150, 84, 70]) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const m = x * S + 8, b = y * S + 15, dk = mix(col, 0.6); c.ellipse(m, b, 8, 3, [0, 0, 0, 60]);
    for (const g of [c, top]) { g.poly([[m - 7, b], [m - 5, b - hgt], [m + 5, b - hgt], [m + 7, b]], dk); g.poly([[m - 5, b - 1], [m - 3, b - hgt + 1], [m + 3, b - hgt + 1], [m + 5, b - 1]], col); for (let j = b - 8; j > b - hgt + 4; j -= 9) g.rect(m - 5, j, 10, 1, dk); g.rect(m - 6, b - hgt - 2, 12, 4, mix(col, 0.45)); g.rect(m - 5, b - hgt + 4, 10, 3, [230, 226, 220]); }
    for (const [ox, oy, r] of [[3, -8, 6], [9, -15, 8], [17, -22, 9], [27, -27, 8]]) { top.ellipse(m + ox, b - hgt + oy, r, r * 0.7, [200, 200, 206, 150]); top.ellipse(m + ox - 1, b - hgt + oy - 2, r - 3, r * 0.7 - 2, [232, 232, 236, 170]); } });
}
// Railway track along row y (or column x with vert).
function rails(p, a0, a1, at, vert = false, solid = true) {
  for (let a = a0; a <= a1; a++) { if (solid) blk(p, vert ? at : a, vert ? a : at); }
  p.paint(0.6, (c) => { for (let a = a0; a <= a1; a++) { const px = (vert ? at : a) * S, py = (vert ? a : at) * S; c.rect(px, py, 16, 16, [120, 110, 104]);
    if (vert) { for (let j = 1; j < 16; j += 5) c.rect(px + 1, py + j, 14, 3, [96, 70, 50]); c.rect(px + 3, py, 2, 16, [70, 72, 80]); c.rect(px + 11, py, 2, 16, [70, 72, 80]); c.rect(px + 3, py, 1, 16, [190, 194, 204]); c.rect(px + 11, py, 1, 16, [190, 194, 204]); }
    else { for (let i = 1; i < 16; i += 5) c.rect(px + i, py + 1, 3, 14, [96, 70, 50]); c.rect(px, py + 3, 16, 2, [70, 72, 80]); c.rect(px, py + 11, 16, 2, [70, 72, 80]); c.rect(px, py + 3, 16, 1, [190, 194, 204]); c.rect(px, py + 11, 16, 1, [190, 194, 204]); } } });
}
// A sheet of ice on the ground (walkable).
function ice(p, x, y, rx, ry) { p.paint(0.7, (c) => { const cx = x * S, cy = y * S; c.ellipse(cx, cy, rx * S, ry * S, [150, 190, 226]); c.ellipse(cx, cy - 1, rx * S - 3, ry * S - 3, [196, 226, 246]); c.line(cx - rx * 9, cy - 3, cx - 4, cy - ry * 7, SNOW, 2); c.line(cx + 4, cy + ry * 6, cx + rx * 9, cy + 2, SNOW, 2); }); }
// A standing stone / broken pillar.
function pillar(p, x, y, hgt = 24, col = [176, 172, 160], o = {}) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * S, b = y * S + 15, dk = mix(col, 0.55); c.ellipse(px + 9, b, 8, 2, [0, 0, 0, 60]); c.box(px + 1, b - 5, 14, 5, col, dk);
    for (const g of hgt > 20 ? [c, top] : [c]) { g.box(px + 3, b - hgt, 10, hgt - 4, col, dk); g.rect(px + 5, b - hgt + 1, 2, hgt - 6, mix(col, 1.15)); if (o.cap) g.box(px + 1, b - hgt - 3, 14, 4, mix(col, 1.08), dk); else g.poly([[px + 3, b - hgt], [px + 7, b - hgt - 4], [px + 13, b - hgt]], col); if (o.snow) g.rect(px + 2, b - hgt - 4, 12, 3, SNOW); } });
}
// A length of ruined wall (Route 8's maze), with a carved band.
function ruinWall(p, x0, y0, x1, y1, col = [186, 170, 138]) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { blk(p, x, y); p.paint(y + 1, (c) => { const i = x * S, b = y * S + 16, dk = mix(col, 0.55), hgt = 18 + Math.floor(p.hash(x, y, 9) * 3) * 2; c.box(i, b - hgt, 16, hgt, col, dk); c.rect(i + 1, b - hgt + 1, 14, 2, mix(col, 1.18)); c.rect(i + 1, b - 9, 14, 3, mix(col, 0.8)); c.rect(i + 3 + ((x + y) % 2) * 5, b - 8, 3, 1, [226, 150, 60]); if (p.hash(x, y, 4) < 0.4) c.rect(i + 4, b - hgt + 5, 6, 1, dk); }); }
}
// Painted wheat: rows of gold stalks over a filled field.
function wheat(p, x0, y0, x1, y1, col = [226, 186, 84]) {
  p.fill("sand", x0, y0, x1, y1);
  p.paint(0.6, (c) => { const x = x0 * S, y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S; c.rect(x, y, w, h, col); for (let j = y + 2; j < y + h; j += 4) { c.rect(x, j + 2, w, 1, mix(col, 0.78)); for (let i = x + ((j >> 2) % 2) * 3; i < x + w - 1; i += 6) { c.rect(i, j, 1, 3, mix(col, 1.14)); c.rect(i + 2, j - 1, 1, 2, mix(col, 0.88)); } } c.rect(x, y, w, 1, mix(col, 0.7)); c.rect(x, y + h - 1, w, 1, mix(col, 0.7)); c.rect(x, y, 1, h, mix(col, 0.7)); c.rect(x + w - 1, y, 1, h, mix(col, 0.7)); });
}
// Rows of a green crop on ploughed earth.
function crops(p, x0, y0, x1, y1, col = [70, 150, 70]) {
  p.fill("dirt", x0, y0, x1, y1);
  p.paint(0.6, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x * S, py = y * S; c.rect(px, py + 7, 16, 2, [120, 84, 56, 150]); for (const i of [2, 10]) { c.ellipse(px + i + 2, py + 4, 3, 3, mix(col, 0.7)); c.ellipse(px + i + 2, py + 3, 2, 2, col); c.ellipse(px + i + 2, py + 12, 3, 3, mix(col, 0.7)); c.ellipse(px + i + 2, py + 11, 2, 2, col); } } });
}
// Drifting mist over everything on the ground layer.
function fog(p, n, col = [226, 236, 240], seed = 1) { p.paint(90, (c) => { for (let i = 0; i < n; i++) { const x = p.hash(i, 1, seed) * p.W * S, y = p.hash(i, 2, seed) * p.H * S, r = 26 + p.hash(i, 3, seed) * 40; c.ellipse(x, y, r, r * 0.34, [...col, 34]); c.ellipse(x + 8, y - 2, r * 0.6, r * 0.2, [...col, 44]); } }); }
// Falling snow / blizzard streaks.
function blizzard(p, n, seed = 1) { p.paint(91, (c) => { for (let i = 0; i < n; i++) { const x = p.hash(i, 5, seed) * p.W * S, y = p.hash(i, 6, seed) * p.H * S; c.line(x, y, x - 5, y + 3, [255, 255, 255, 150]); if (i % 3 === 0) c.rect(x, y, 2, 2, [255, 255, 255, 200]); } }); }
// A pitched tent row, a court, a statue... small one-off props.
function court(p, x0, y0, x1, y1, kind = "clay") {
  p.fill(kind, x0, y0, x1, y1);
  p.paint(0.6, (c) => { const x = x0 * S, y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, wh = [250, 250, 244]; c.rect(x + 3, y + 3, w - 6, 2, wh); c.rect(x + 3, y + h - 5, w - 6, 2, wh); c.rect(x + 3, y + 3, 2, h - 6, wh); c.rect(x + w - 5, y + 3, 2, h - 6, wh); c.rect(x + w / 2 - 1, y + 3, 2, h - 6, wh); c.ellipse(x + w / 2, y + h / 2, 10, 10, wh, 2); });
}
// A blue battle court with the red-and-white ball at its centre (Hop's garden, Professor Magnolia's lawn).
function blueCourt(p, x0, y0, x1, y1) {
  p.fill("paving", x0, y0, x1, y1);
  p.paint(0.6, (c) => { const x = x0 * S, y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, wh = [240, 240, 250]; c.rect(x, y, w, h, [60, 92, 170]); c.rect(x + 2, y + 2, w - 4, h - 4, [78, 112, 190]); c.rect(x + 3, y + 3, w - 6, 1, wh); c.rect(x + 3, y + h - 4, w - 6, 1, wh); c.rect(x + 3, y + 3, 1, h - 6, wh); c.rect(x + w - 4, y + 3, 1, h - 6, wh); c.rect(x + w / 2 - 1, y + 3, 2, h - 6, wh); c.ellipse(x + w / 2, y + h / 2, 11, 11, [214, 70, 70]); c.ellipse(x + w / 2, y + h / 2, 11, 11, wh, 2); c.ellipse(x + w / 2, y + h / 2, 4, 4, wh); });
}
// A flat-topped crag six tiles wide standing on rows y, y + 1 (the Giant's Seat, the Giant's Cap).
function crag(p, x0, y) {
  blk(p, x0, y, 6, 2); p.paint(y + 2.5, (c, top) => { const x = x0 * S, b = (y + 2) * S, rk = [150, 130, 110], dk = mix(rk, 0.6); c.ellipse(x + 48, b - 2, 50, 6, [0, 0, 0, 60]);
    for (const g of [c, top]) { g.poly([[x, b], [x + 8, b - 30], [x + 22, b - 44], [x + 70, b - 46], [x + 88, b - 28], [x + 96, b]], dk); g.poly([[x + 3, b - 1], [x + 10, b - 29], [x + 23, b - 41], [x + 69, b - 43], [x + 85, b - 27], [x + 93, b - 1]], rk); g.poly([[x + 14, b - 32], [x + 25, b - 41], [x + 68, b - 43], [x + 80, b - 31]], [120, 160, 96]); for (const i of [20, 40, 62, 78]) g.line(x + i, b - 30, x + i - 4, b - 4, dk); } });
}
function statue(p, x, y, draw, col = [176, 174, 168]) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * S, b = y * S + 15; c.ellipse(px + 8, b, 9, 3, [0, 0, 0, 60]); c.box(px, b - 6, 16, 6, mix(col, 0.85), mix(col, 0.5)); draw(c, top, px, b - 6, col); });
}
// A stone railway viaduct along rows y (deck and rails) and y + 1 (arches); `opens` are the columns walked under.
function viaduct(p, y, x0, x1, opens = [], col = [178, 168, 150]) {
  for (let x = x0; x <= x1; x++) if (!opens.includes(x)) blk(p, x, y, 1, 2);
  p.paint(y + 2, (c, top) => { const dk = mix(col, 0.55), py = y * S;
    for (let x = x0; x <= x1; x++) { const px = x * S, open = opens.includes(x), g = open ? top : c;
      if (open) c.rect(px, py + 8, 16, 14, [0, 0, 0, 70]); else { c.rect(px, py + 16, 16, 16, mix(col, 0.82)); c.ellipse(px + 8, py + 25, 6, 7, [52, 48, 60]); c.rect(px + 2, py + 25, 13, 7, [52, 48, 60]); c.rect(px, py + 16, 16, 2, dk); }
      g.rect(px, py - 6, 16, 22, [124, 114, 108]); for (let i = 1; i < 16; i += 5) g.rect(px + i, py - 2, 3, 14, [96, 70, 50]); for (const j of [0, 8]) { g.rect(px, py + j, 16, 2, [70, 72, 80]); g.rect(px, py + j, 16, 1, [190, 194, 204]); }
      g.rect(px, py - 8, 16, 4, mix(col, 1.12)); g.rect(px, py - 4, 16, 1, dk); g.rect(px, py + 13, 16, 4, col); g.rect(px, py + 16, 16, 1, dk); if (x % 3 === 0) { g.rect(px + 6, py - 10, 4, 6, mix(col, 1.2)); g.rect(px + 6, py + 11, 4, 6, mix(col, 1.2)); } } });
}
// A ladder up a ledge, over open tiles (x, y0..y1).
function ladder(p, x, y0, y1) { p.fill("ground", x, y0, x, y1); p.paint(0.8, (c) => { const px = x * S, a = y0 * S - 3, b = (y1 + 1) * S + 3; c.rect(px + 1, a, 14, b - a, [96, 70, 52, 120]); c.rect(px + 2, a, 2, b - a, [150, 110, 70]); c.rect(px + 12, a, 2, b - a, [150, 110, 70]); for (let j = a + 2; j < b - 1; j += 4) c.rect(px + 2, j, 12, 2, [196, 156, 104]); }); }
// A pit-head frame over a mine shaft.
function headframe(p, x, y) {
  blk(p, x, y, 2, 2);
  p.paint(y + 2, (c, top) => { const px = x * S, b = y * S + 31, w = [150, 110, 70], dk = [90, 62, 44]; c.ellipse(px + 16, b - 2, 17, 5, [0, 0, 0, 60]); c.box(px + 4, b - 14, 24, 14, [60, 54, 58], [40, 36, 40]); c.rect(px + 8, b - 10, 16, 10, [16, 14, 20]);
    for (const g of [c, top]) { g.line(px + 2, b, px + 12, b - 44, dk, 3); g.line(px + 30, b, px + 20, b - 44, dk, 3); g.line(px + 3, b, px + 12, b - 44, w, 1); g.line(px + 29, b, px + 20, b - 44, w, 1); for (const j of [14, 28]) g.rect(px + 5 + j / 5, b - j - 6, 22 - j / 2.5, 2, w); g.box(px + 9, b - 50, 14, 8, w, dk); g.ellipse(px + 16, b - 46, 4, 4, [70, 72, 80], 2); g.rect(px + 15, b - 42, 1, 30, [40, 40, 46]); } });
}
function minecart(p, x, y, load = [120, 110, 120]) { blk(p, x, y); p.paint(y + 1, (c) => { const px = x * S, py = y * S; c.poly([[px + 3, py + 1], [px + 8, py - 4], [px + 13, py + 1]], load); c.box(px + 1, py + 1, 14, 9, [150, 90, 60], [70, 44, 36]); c.rect(px + 2, py + 3, 12, 1, [190, 130, 90]); c.ellipse(px + 4, py + 12, 2, 2, [40, 40, 46]); c.ellipse(px + 12, py + 12, 2, 2, [40, 40, 46]); }); }
function snowman(p, x, y) { blk(p, x, y); p.paint(y + 1, (c) => { const m = x * S + 8, b = y * S + 15; c.ellipse(m, b, 7, 2, [0, 0, 0, 50]); c.ellipse(m, b - 6, 6, 6, [214, 226, 240]); c.ellipse(m - 1, b - 7, 5, 5, SNOW); c.ellipse(m, b - 15, 4, 4, [214, 226, 240]); c.ellipse(m - 1, b - 16, 3, 3, SNOW); c.rect(m - 2, b - 16, 1, 1, [30, 30, 40]); c.rect(m + 1, b - 16, 1, 1, [30, 30, 40]); c.rect(m, b - 14, 3, 1, [240, 140, 60]); c.rect(m - 4, b - 12, 8, 2, [200, 60, 60]); }); }
// A hot spring: a small steaming pool.
function spring(p, x, y, r = 1.6) { p.disc("water", x, y, r, r * 0.7); p.paint(60, (c, top) => { const cx = x * S, cy = y * S; for (let i = 0; i < 5; i++) { const ox = (p.hash(i, x, 7) - 0.5) * r * 22, oy = -6 - p.hash(i, y, 8) * 22, q = 5 + p.hash(i, 3, x) * 5; top.ellipse(cx + ox, cy + oy, q, q * 0.7, [244, 248, 252, 120]); } c.ellipse(cx, cy, r * S + 3, r * S * 0.7 + 3, [230, 240, 250, 110], 3); }); }
function lamp(p, x, y, col = [250, 220, 120]) { blk(p, x, y); p.paint(y + 1, (c, top) => { const m = x * S + 8, b = y * S + 15; c.ellipse(m, b, 4, 2, [0, 0, 0, 60]); c.ellipse(m, b - 2, 15, 9, [...col, 40]); for (const g of [c, top]) { g.rect(m - 1, b - 26, 3, 26, [70, 72, 84]); g.box(m - 4, b - 33, 9, 8, col, [50, 50, 60]); g.ellipse(m, b - 29, 9, 7, [...col, 60]); } }); }
// Opens a passage of radius r through solid fill along the points.
function carve(p, pts, r = 2) { for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1); for (let t = 0; t <= n; t++) p.disc("ground", ax + (bx - ax) * t / n + 0.5, ay + (by - ay) * t / n + 0.5, r); } }
// An ice crystal / icicle spire.
function crystal(p, x, y, hgt = 26, col = [150, 210, 245]) { blk(p, x, y); p.paint(y + 1, (c, top) => { const m = x * S + 8, b = y * S + 15; c.ellipse(m, b, 7, 2, [0, 0, 0, 60]); c.ellipse(m, b - 6, 13, 9, [...col, 44]); for (const g of [c, top]) { g.poly([[m - 6, b], [m - 2, b - hgt], [m + 5, b]], mix(col, 0.7)); g.poly([[m - 4, b], [m - 2, b - hgt + 2], [m, b]], mix(col, 1.15)); g.poly([[m + 1, b], [m + 5, b - hgt * 0.6], [m + 8, b]], col); g.poly([[m - 9, b], [m - 7, b - hgt * 0.45], [m - 4, b]], col); } }); }
const trees = (p, list, stamp = "tree1", tint) => { for (const [x, y] of list) p.decor(stamp, x, y, { canopy: true, tint }); };

module.exports = {
  // Hop's house: the lane out of Postwick, the big farmhouse with its battle court in the garden,
  // a Wooloo paddock across the lane, and the fence and gate that close off the Slumbering Weald.
  GalarHopHouse: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.03, groves: 0, flowers: 0.2, turn: 6, wander: 0 },
    plan(p) {
      p.fill("tree", 1, 1, 6, 4); p.fill("tree", 22, 1, 36, 4); p.fill("tree", 16, 1, 17, 4);
      p.street("dirt", 2, [[19, 30], [19, 24], [16, 21], [16, 15], [19, 12], [19, 1]]);
      p.street("dirt", 1, [[11, 8], [11, 9], [14, 9], [14, 14], [16, 15]]);
      house(p, 8, 4, 8, 4, [176, 74, 60], { doorAt: 3, wall: [236, 226, 204] });
      blueCourt(p, 3, 10, 12, 13);                                                           // the court is blue in the game
      fence(p, 2, 15, 13, 15, ["2,15"]); fence(p, 2, 8, 2, 14); fence(p, 17, 5, 18, 5); fence(p, 21, 5, 22, 5);
      p.fill("meadow", 25, 8, 34, 13); fence(p, 24, 7, 35, 14);
      for (const [x, y] of [[26, 9], [29, 10], [32, 9], [27, 12], [31, 12], [33, 11]]) wooloo(p, x, y);
      p.fill("flowersRed", 4, 6, 6, 7); p.fill("flowersPink", 22, 19, 27, 20); p.fill("flowersBlue", 6, 24, 10, 25);
      trees(p, [[4, 19], [12, 27], [30, 18], [34, 25], [24, 27], [2, 27]]);
      p.decor("bench", 13, 12); p.decor("barrels", 16, 7);
    },
  },
  // The Slumbering Weald: a dim wood where the fog never lifts. The path winds between black
  // thickets and crosses a stream on planks before it climbs on to the depths.
  GalarSlumberingWeald: {
    theme: { density: 0.2, groves: 0.08, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 18, 13, 19); p.fill("water", 12, 19, 22, 20); p.fill("water", 21, 20, 30, 21); p.disc("water", 25, 22, 3.5, 2.2);
      p.street("dirt", 2, [[16, 28], [16, 24], [9, 22], [9, 15], [14, 13], [21, 11], [22, 7], [16, 5], [16, 1]]);
      p.fill("darktree", 2, 2, 12, 4); p.fill("darktree", 2, 5, 6, 10); p.fill("darktree", 19, 2, 29, 4); p.fill("darktree", 25, 5, 29, 9);
      p.fill("darktree", 14, 7, 19, 9); p.fill("darktree", 12, 15, 20, 16); p.fill("darktree", 24, 12, 29, 12);
      p.fill("darktree", 2, 23, 6, 27); p.fill("darktree", 19, 24, 29, 27); p.fill("darktree", 12, 22, 13, 25);
      fence(p, 13, 27, 14, 27, [], [120, 110, 100]); fence(p, 18, 27, 19, 27, [], [120, 110, 100]);
      for (const [x, y] of [[8, 12], [23, 15], [4, 21]]) mushrooms(p, x, y, [150, 120, 200]);
      fog(p, 46, [226, 236, 240], 3);
    },
  },
  // Route 1 (compared with the guidebook map): the lane runs straight up the west side between rail fences,
  // and a side loop swings out east through the patches of tall grass and back. Wooloo wander the verges.
  GalarRoute1: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.04, groves: 0, flowers: 0.25, turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 2, [[17, 30], [17, 27], [8, 25], [8, 7], [17, 5], [17, 1]]);
      p.street("dirt", 1, [[9, 23], [19, 23], [25, 19], [25, 11], [19, 8], [9, 8]]);
      fence(p, 6, 9, 6, 23); fence(p, 11, 10, 11, 21, ["11,15", "11,16"]); fence(p, 28, 10, 28, 20);
      wall(p, 21, 31, 27); wall(p, 21, 31, 4);
      p.fill("flowersPink", 13, 11, 16, 12); p.fill("flowersRed", 2, 27, 5, 28); p.fill("flowersBlue", 20, 18, 22, 19);
      trees(p, [[3, 1], [11, 1], [21, 1], [30, 13], [12, 27], [2, 13], [27, 28], [21, 13]]);
      wooloo(p, 13, 6); wooloo(p, 4, 20); wooloo(p, 21, 25); wooloo(p, 15, 18);
    },
  },
  // Route 2 (compared with the guidebook map): the lake with its islet fills the west of the route and drains
  // away south under the road; Professor Magnolia's house stands above its east shore with a battle court on
  // the lawn, reached by the path round the eastern bank.
  GalarRoute2: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.04, groves: 0, flowers: 0.2, turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 11.5, 10, 8.5, 4); p.disc("grass", 9.5, 9.5, 2, 1.1); p.fill("water", 6, 13, 7, 28);
      p.street("dirt", 2, [[36, 16], [27, 16], [23, 15], [10, 15], [7, 16], [1, 16]]);
      p.street("dirt", 2, [[31, 16], [32, 11], [31, 6], [24, 5], [20, 5]]);
      p.fill("lawn", 21, 5, 29, 6); p.fill("lawn", 24, 7, 30, 11);
      house(p, 17, 2, 7, 3, [120, 90, 170], { wall: [240, 232, 214], door: [150, 90, 60] }, 1);
      blueCourt(p, 25, 8, 29, 10);
      p.fill("flowersPink", 26, 12, 29, 13); p.fill("flowersBlue", 24, 3, 26, 4); p.fill("flowersRed", 10, 20, 14, 21);
      p.paint(0.6, (c) => { for (const [x, y] of [[5, 10], [14, 8], [16, 11], [12, 12], [7, 12]]) { c.ellipse(x * S + 8, y * S + 8, 5, 3, [70, 150, 90]); c.ellipse(x * S + 7, y * S + 7, 3, 2, [110, 190, 110]); } });
      p.decor("tree1", 9, 8, { canopy: true, optional: true });
      p.fill("tree", 2, 2, 9, 4); p.fill("tree", 30, 2, 35, 3); p.fill("tree", 9, 24, 14, 27); p.fill("tree", 29, 24, 35, 27);
      trees(p, [[12, 18], [24, 21], [33, 19], [17, 25], [2, 20]]);
    },
  },
  // The Wild Area, south: the Rolling Fields open below Motostoke's brick wall and great stair. Lake
  // Axewell with its island lies to the west and Lake Miloch to the east; the Dappled Grove and the
  // broken Watchtower stand in the west, the crag of the Giant's Seat in the south-east, dens glow in the grass.
  GalarWildAreaSouth: {
    theme: { ground: "grass", road: "dirt", border: "rock", density: 0.03, groves: 0, flowers: 0.12, turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 8.5, 8.5, 6.6, 4.2); p.disc("grass", 8.5, 8.5, 2.3, 1.5); p.disc("water", 28, 9, 4.4, 3.4);
      p.street("dirt", 2, [[17, 30], [17, 25], [14, 22], [14, 17], [17, 14], [17, 10], [19, 8], [17, 5], [17, 1]]);
      p.street("dirt", 1, [[17, 16], [32, 16]]); p.street("dirt", 1, [[1, 16], [14, 17]]);
      p.fill("paving", 15, 2, 20, 5);
      p.paint(0.6, (c) => { for (let j = 2 * S; j < 6 * S; j += 4) { c.rect(15 * S, j, 6 * S, 3, [206, 200, 190]); c.rect(15 * S, j + 3, 6 * S, 1, [140, 132, 124]); } });
      wall(p, 2, 14, 2, [176, 96, 80], 22); wall(p, 21, 32, 2, [176, 96, 80], 22); wall(p, 14, 14, 3, [176, 96, 80], 22); wall(p, 21, 21, 3, [176, 96, 80], 22);
      p.fill("tree", 2, 23, 10, 24); p.fill("tree", 2, 25, 4, 29); p.fill("tree", 8, 26, 12, 29);
      trees(p, [[11, 21]], "honeyTree");
      // The Watchtower Ruins.
      blk(p, 3, 19, 3, 2); p.paint(21.5, (c, top) => { const x = 3 * S, b = 21 * S, st = [160, 154, 146], dk = mix(st, 0.55); c.ellipse(x + 24, b - 2, 26, 5, [0, 0, 0, 60]);
        for (const g of [c, top]) { g.box(x + 4, b - 62, 40, 62, st, dk); g.poly([[x + 4, b - 62], [x + 4, b - 78], [x + 14, b - 70], [x + 20, b - 84], [x + 28, b - 66], [x + 36, b - 74], [x + 44, b - 62]], st); for (let j = b - 56; j < b - 4; j += 8) for (let i = x + 7 + ((j >> 3) % 2) * 6; i < x + 38; i += 12) g.rect(i, j, 7, 1, dk); g.rect(x + 20, b - 46, 8, 12, [40, 36, 44]); }
        c.box(x + 17, b - 18, 14, 18, [40, 36, 44], dk); });
      crag(p, 26, 22);                                                                       // the Giant's Seat (the Nursery is in Bridge Field, not here)
      tent(p, 23, 12, [230, 120, 60]);
      for (const [x, y] of [[19, 18], [11, 14], [23, 27], [30, 14], [6, 15]]) den(p, x, y, x !== 6);
      p.fill("flowersPink", 21, 20, 23, 21); p.fill("flowersRed", 9, 19, 11, 19);
      trees(p, [[8, 7], [21, 7], [31, 27], [20, 23], [3, 12]]);
      p.decor("boulder", 23, 4); p.decor("boulder", 12, 13);
    },
  },
  // Route 3: the road climbs out of Motostoke in switchbacks past the smoking factory stacks to the
  // mouth of the Galar Mine in the cliff at the top.
  GalarRoute3: {
    theme: { ground: "grass", road: "dirt", border: "rock", density: 0.03, groves: 0, flowers: 0.05, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 2, [[17, 30], [17, 26], [25, 23], [25, 19], [22, 15], [11, 15], [11, 9], [17, 7], [17, 4]]);
      p.fill("rock", 1, 20, 22, 21); p.fill("rock", 14, 11, 32, 12); p.fill("rock", 10, 2, 15, 3); p.fill("rock", 19, 2, 24, 3);
      p.fill("rock", 2, 4, 7, 9);                                                            // crags (the guidebook map shows no works on this side)
      p.decor("brickFlat", 26, 2, { canopy: 5 }); chimney(p, 25, 9, 70); chimney(p, 28, 10, 54); chimney(p, 31, 9, 62);
      p.fill("gravel", 24, 9, 32, 10);
      p.decor("boulder", 4, 12); p.decor("barrels", 30, 15); p.decor("barrel", 23, 9);
      p.fill("flowersRed", 28, 22, 31, 23);
      trees(p, [[3, 26], [8, 24], [29, 26], [20, 17]]);
      p.decor("boulder", 14, 17); p.decor("boulder", 5, 16); p.decor("boulder", 20, 23);
    },
  },
  // Route 4: Turffield's farmland. Golden wheat fields and vegetable plots between dry-stone walls,
  // a parked tractor and hay bales, the lane to the town climbing away to the north.
  GalarRoute4: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.03, groves: 0, flowers: 0.15, turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 2, [[36, 16], [28, 16], [24, 14], [13, 14], [9, 16], [1, 16]]);
      p.street("dirt", 2, [[20, 14], [20, 10], [22, 8], [20, 6], [20, 1]]);
      wheat(p, 3, 3, 12, 7); wheat(p, 3, 9, 9, 12); wheat(p, 25, 20, 34, 25); wheat(p, 26, 3, 34, 6);
      crops(p, 4, 20, 12, 22); crops(p, 4, 24, 12, 26, [150, 110, 190]);
      wall(p, 2, 13, 8); wall(p, 3, 13, 19); wall(p, 24, 35, 19); wall(p, 25, 35, 7);
      wheat(p, 25, 9, 34, 12);                                                               // a third field (the guidebook map shows fields here, no barn)
      // The tractor and a few hay bales.
      blk(p, 14, 10, 2, 1); p.paint(11, (c) => { const x = 14 * S, b = 11 * S - 1; c.ellipse(x + 15, b, 16, 3, [0, 0, 0, 60]); c.box(x + 2, b - 14, 20, 10, [60, 150, 90], [30, 70, 44]); c.box(x + 14, b - 24, 12, 14, [70, 170, 100], [30, 70, 44]); c.rect(x + 16, b - 22, 8, 6, [170, 214, 240]); c.ellipse(x + 22, b - 6, 7, 7, [40, 40, 46]); c.ellipse(x + 22, b - 6, 3, 3, [200, 190, 90]); c.ellipse(x + 6, b - 4, 4, 4, [40, 40, 46]); c.rect(x + 3, b - 20, 2, 6, [60, 60, 66]); });
      for (const [x, y] of [[16, 21], [18, 23], [33, 12], [15, 5]]) { blk(p, x, y); p.paint(y + 1, (c) => { const px = x * S + 8, py = y * S + 8; c.ellipse(px, py + 5, 8, 3, [0, 0, 0, 50]); c.ellipse(px, py, 8, 7, [200, 160, 70]); c.ellipse(px, py, 5, 4, [230, 194, 100]); c.ellipse(px, py, 2, 2, [200, 160, 70]); }); }
      for (const [x, y] of [[22, 22], [21, 25], [17, 10]]) wooloo(p, x, y);
      p.fill("flowersRed", 14, 17, 18, 18); p.fill("flowersPink", 28, 26, 32, 27);
      trees(p, [[2, 1], [15, 1], [35, 9], [22, 2], [15, 26], [35, 26]]);
    },
  },
  // Route 5 (compared with the guidebook map): the Pokemon Nursery beside the road, a side loop round a pond
  // and campsite, then the long stone bridge that strides over the green valley of the Wild Area far below
  // (there is no water under it) on the way to Hulbury.
  GalarRoute5: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.04, groves: 0, flowers: 0.2, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("meadow", 1, 6, 36, 10);
      p.street("dirt", 2, [[36, 16], [30, 16], [26, 15], [10, 15], [6, 16], [1, 16]]);
      p.street("dirt", 2, [[20, 15], [20, 11]]); p.street("cobble", 3, [[20, 11], [20, 5]]); p.street("dirt", 2, [[20, 5], [20, 1]]);
      for (let x = 1; x <= 36; x++) if (x < 19 || x > 21) blk(p, x, 6, 1, 5);
      p.paint(0.6, (c) => { const st = [186, 178, 164], dk = mix(st, 0.55), y0 = 6 * S, h = 5 * S;
        for (const [xa, xb] of [[1, 18], [22, 36]]) { const x = xa * S, w = (xb - xa + 1) * S; c.rect(x, y0, w, h, [74, 132, 96]); c.rect(x, y0, w, 7, [150, 124, 100]); c.rect(x, y0 + 7, w, 3, [104, 84, 70]); c.rect(x, y0 + h - 4, w, 4, [60, 108, 80]);
          for (let i = 0; i < 26; i++) { const tx = x + 8 + p.hash(i, xa, 3) * (w - 16), ty = y0 + 18 + p.hash(i, xa, 4) * (h - 30); c.ellipse(tx, ty, 6, 4, [52, 104, 76]); c.ellipse(tx - 1, ty - 1, 4, 2, [64, 122, 86]); } }
        for (const x of [18 * S + 6, 22 * S]) { c.rect(x, y0 - 6, 10, h + 12, st); c.rect(x, y0 - 6, 2, h + 12, mix(st, 1.15)); c.rect(x + 8, y0 - 6, 2, h + 12, dk); for (let y = y0 - 6; y < y0 + h; y += 26) c.box(x - 1, y, 12, 8, mix(st, 1.1), dk); }
        for (const [x, sx] of [[18 * S - 4, -1], [22 * S + 10, 1]]) for (let y = y0 + 14; y < y0 + h - 8; y += 26) { c.rect(x, y, 10, 12, mix(st, 0.8)); c.rect(x + (sx < 0 ? 0 : 7), y, 3, 12, dk); } });
      house(p, 24, 11, 6, 3, [226, 170, 70], { sign: [226, 120, 150], wall: [244, 236, 220] });   // the Nursery
      p.fill("meadow", 32, 11, 34, 13); fence(p, 31, 10, 35, 14, ["31,12"], [240, 240, 236]);
      for (const [x, y] of [[32, 11], [34, 12], [33, 13]]) wooloo(p, x, y);
      p.disc("water", 10, 22.5, 2.6, 1.4); p.street("dirt", 1, [[14, 16], [14, 26], [6, 26], [6, 17]]); tent(p, 9, 18, [90, 170, 120]);
      p.fill("flowersPink", 24, 18, 29, 19); p.fill("flowersBlue", 2, 12, 5, 13); p.fill("flowersRed", 19, 22, 22, 23);
      p.fill("tree", 1, 1, 6, 4); p.fill("tree", 30, 24, 36, 28); p.fill("tree", 30, 1, 36, 3);
      trees(p, [[24, 2], [33, 19], [24, 25], [2, 20], [16, 11], [10, 2]]);
    },
  },
  // Motostoke Outskirts (compared with the guidebook map): rough grass and pink-grey crags outside the mine,
  // a dirt trail through the tall grass, a couple of ore carts at the mine mouth and the city's stacks behind.
  GalarMotostokeOutskirts: {
    theme: { ground: "grass", road: "dirt", border: "rock", tree: "boulder", density: 0.05, groves: 0, flowers: 0.08, turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 2, [[16, 28], [21, 28], [22, 24], [22, 15], [14, 13], [10, 10], [10, 6], [16, 4], [16, 1]]);
      p.fill("rock", 2, 2, 7, 6); p.fill("rock", 2, 7, 4, 9); p.fill("rock", 25, 20, 29, 22); p.fill("rock", 2, 22, 9, 23); p.fill("rock", 13, 8, 19, 9); p.fill("rock", 10, 25, 14, 26); p.fill("rock", 18, 25, 19, 26);
      rails(p, 10, 15, 27, false, false); minecart(p, 11, 27); minecart(p, 12, 27, [200, 150, 60]);   // a spur of rail at the mine mouth; the rest is rough grass and crags, as on the guidebook map
      trees(p, [[4, 12], [26, 24], [12, 20], [6, 18]]);
      p.decor("brickTall", 25, 1, { canopy: 8 }); chimney(p, 23, 10, 66); chimney(p, 29, 11, 52); p.decor("brickFlat", 20, 3, { canopy: 5 });
      for (const [x, y, col] of [[17, 21, [120, 110, 120]], [8, 26, [200, 150, 60]], [28, 14, [120, 110, 120]], [12, 15, [90, 86, 96]]]) { blk(p, x, y, 2, 1); p.paint(y + 1, (c) => { const px = x * S, b = y * S + 15; c.poly([[px, b], [px + 9, b - 16], [px + 18, b - 12], [px + 26, b - 19], [px + 32, b]], mix(col, 0.65)); c.poly([[px + 2, b - 1], [px + 10, b - 14], [px + 17, b - 9], [px + 25, b - 16], [px + 29, b - 1]], col); c.rect(px + 9, b - 11, 2, 2, mix(col, 1.35)); c.rect(px + 22, b - 9, 2, 2, mix(col, 1.35)); }); }
      p.decor("barrels", 24, 13); p.decor("barrels", 3, 16); p.decor("boulder", 27, 6); p.decor("boulder", 14, 23);
    },
  },
  // The Wild Area, north: Bridge Field under the great railway viaduct and its river, with the Nursery; the
  // Giant's Cap in the west, the sandy Dusty Bowl in the east, the Lake of Outrage with its ring of stones in the
  // north-west, and the stair up through Hammerlocke's grey wall.
  GalarWildAreaNorth: {
    theme: { ground: "grass", road: "dirt", border: "rock", density: 0.03, groves: 0, flowers: 0.1, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 25, 13, 26); p.fill("water", 12, 24, 24, 25); p.fill("water", 23, 25, 32, 26);
      p.disc("water", 6.5, 6.5, 4.6, 2.8);
      p.disc("desert", 27, 9, 5.6, 3.8);
      p.street("dirt", 2, [[17, 30], [17, 23], [15, 22], [15, 18], [17, 14], [19, 10], [17, 6], [17, 1]]);
      p.street("dirt", 1, [[1, 16], [15, 17]]); p.street("dirt", 1, [[17, 16], [32, 16]]);
      viaduct(p, 20, 1, 32, [15, 16, 4, 28]);
      p.fill("paving", 15, 2, 20, 5);
      p.paint(0.6, (c) => { for (let j = 2 * S; j < 6 * S; j += 4) { c.rect(15 * S, j, 6 * S, 3, [206, 200, 190]); c.rect(15 * S, j + 3, 6 * S, 1, [140, 132, 124]); } });
      wall(p, 2, 14, 2, [166, 160, 150], 24); wall(p, 21, 32, 2, [166, 160, 150], 24); wall(p, 14, 14, 3, [166, 160, 150], 24); wall(p, 21, 21, 3, [166, 160, 150], 24);
      for (const [x, y, h] of [[2, 5, 26], [4, 4, 20], [9, 4, 28], [11, 6, 22], [3, 9, 18], [10, 9, 24]]) pillar(p, x, y, h, [150, 150, 160]);
      crag(p, 3, 12);                                                                        // the Giant's Cap
      house(p, 26, 22, 6, 3, [226, 170, 70], { sign: [226, 120, 150], wall: [244, 236, 220] });   // the Pokemon Nursery, east of Bridge Field
      tent(p, 23, 12, [70, 150, 200]);
      for (const [x, y] of [[19, 18], [27, 9], [10, 15], [30, 28], [6, 28], [24, 5]]) den(p, x, y, x !== 10);
      p.decor("boulder", 23, 7); p.decor("boulder", 30, 11); p.decor("boulder", 31, 5);
      p.fill("tree", 22, 3, 26, 4); p.fill("flowersBlue", 20, 28, 24, 29); p.fill("flowersRed", 8, 22, 11, 23);
      trees(p, [[29, 3], [12, 11], [2, 17], [25, 27], [10, 27]]);
    },
  },
  // Route 6: a sun-baked canyon. The trail climbs three orange ledges by ladder, past a fossil
  // hunter's camp, to the great stone Diglett that watches the road into Stow-on-Side.
  GalarRoute6: {
    theme: { ground: "desert", road: "beach", border: "rock", tree: "boulder", density: 0.03, groves: 0, flowers: 0, turn: 6, wander: 0 },
    plan(p) {
      p.street("beach", 2, [[17, 30], [17, 26], [8, 26], [8, 24]]); p.street("beach", 2, [[8, 20], [8, 18], [25, 18], [25, 14]]); p.street("beach", 2, [[25, 9], [12, 9], [12, 8]]); p.street("beach", 2, [[12, 4], [17, 4], [17, 1]]);
      p.fill("rock", 1, 21, 32, 23); p.fill("rock", 1, 11, 32, 13); p.fill("rock", 1, 6, 32, 7);
      for (const x of [8, 9]) ladder(p, x, 21, 23); for (const x of [25, 26]) ladder(p, x, 11, 13); for (const x of [12, 13]) ladder(p, x, 6, 7);
      p.fill("rock", 27, 14, 32, 14); p.fill("rock", 1, 24, 4, 25); p.fill("rock", 28, 8, 32, 9); p.fill("rock", 1, 2, 5, 3);
      // The Diglett statue.
      blk(p, 22, 3, 3, 2); p.paint(5.5, (c, top) => { const m = 23.5 * S, b = 5 * S, st = [176, 124, 90], dk = mix(st, 0.6); c.ellipse(m, b - 2, 26, 6, [0, 0, 0, 70]);
        for (const g of [c, top]) { g.ellipse(m, b - 30, 20, 26, dk); g.rect(m - 20, b - 30, 41, 30, dk); g.ellipse(m, b - 30, 18, 24, st); g.rect(m - 18, b - 30, 37, 29, st); g.ellipse(m - 6, b - 44, 6, 8, mix(st, 1.18)); g.rect(m - 8, b - 34, 3, 7, [50, 40, 40]); g.rect(m + 5, b - 34, 3, 7, [50, 40, 40]); g.ellipse(m, b - 22, 8, 4, [214, 130, 130]); g.line(m - 16, b - 12, m + 16, b - 12, dk); }
        for (const i of [-22, -12, 10, 20]) c.ellipse(m + i, b - 2, 6, 4, mix(st, 0.8)); });
      tent(p, 28, 19, [230, 200, 120]); p.decor("barrels", 30, 18);
      // Fossil bones in the sand.
      p.paint(0.6, (c) => { for (const [x, y] of [[20, 20], [5, 16], [29, 26], [18, 9]]) { const px = x * S, py = y * S; c.line(px + 2, py + 8, px + 13, py + 8, [240, 232, 214], 2); for (const i of [3, 7, 11]) c.line(px + i, py + 3, px + i, py + 13, [240, 232, 214]); c.ellipse(px + 15, py + 8, 3, 3, [240, 232, 214]); } });
      for (const [x, y] of [[4, 27], [22, 26], [19, 14], [1, 8], [30, 3], [12, 19]]) p.decor("boulder", x, y);
    },
  },
  // Glimwood Tangle: a forest so dark that the only light is its mushrooms. A crooked path between
  // black trunks, tall toadstools glowing pink, blue and gold, and a still pool.
  GalarGlimwoodTangle: {
    theme: { density: 0.12, groves: 0.05, turn: 6, wander: 0 },
    plan(p) {
      p.paint(0.4, (c) => c.rect(0, 0, p.W * S, p.H * S, [8, 6, 40, 96]));
      p.disc("water", 24, 9.5, 3.4, 2.2);
      p.street("dirt", 2, [[16, 28], [16, 25], [22, 22], [22, 17], [14, 14], [9, 11], [9, 7], [15, 5], [16, 1]]);
      p.fill("darktree", 2, 2, 6, 9); p.fill("darktree", 7, 2, 13, 3); p.fill("darktree", 19, 2, 29, 5); p.fill("darktree", 28, 6, 29, 12); p.fill("darktree", 12, 8, 18, 11);
      p.fill("darktree", 2, 18, 8, 20); p.fill("darktree", 2, 21, 5, 27); p.fill("darktree", 10, 19, 18, 22); p.fill("darktree", 25, 18, 29, 27); p.fill("darktree", 19, 26, 24, 27);
      const caps = [[255, 110, 190], [90, 220, 250], [250, 220, 110], [170, 130, 255]];
      [[7, 6, 34], [11, 13, 28], [19, 13, 36], [24, 15, 30], [20, 19, 26], [13, 25, 34], [8, 23, 30], [26, 7, 28], [19, 7, 32], [4, 12, 30], [27, 15, 26], [18, 24, 28]].forEach(([x, y, h], i) => toadstool(p, x, y, caps[i % 4], h));
      [[11, 5], [6, 15], [17, 16], [23, 24], [7, 26], [21, 11], [3, 16], [14, 17], [12, 27], [27, 13]].forEach(([x, y], i) => mushrooms(p, x, y, caps[(i + 1) % 4], { glow: caps[(i + 1) % 4] }));
      p.paint(0.7, (c) => { c.ellipse(24 * S, 9.5 * S, 44, 26, [120, 220, 250, 60]); for (let i = 0; i < 40; i++) { const x = p.hash(i, 1, 8) * p.W * S, y = p.hash(i, 2, 8) * p.H * S; c.rect(x, y, 2, 2, [...caps[i % 4], 190]); } });
    },
  },
  // Stow-on-Side Outskirts: the desert crags give out and the trail drops into shadow, where the
  // first glowing mushrooms mark the mouth of the Glimwood Tangle.
  GalarStowOutskirts: {
    theme: { ground: "shade", grass: "shadegrass", road: "dirt", border: "rock", tree: "boulder", density: 0.03, groves: 0, flowers: 0, turn: 6, wander: 0 },
    plan(p) {
      p.fill("desert", 1, 16, 32, 30); for (const [x, y, r] of [[5, 15, 4], [13, 16, 3.5], [21, 15, 4.5], [29, 16, 4], [17, 14.5, 2]]) p.disc("desert", x, y, r, 2.2);
      p.street("beach", 2, [[17, 30], [17, 26], [22, 23], [22, 18], [15, 15]]); p.street("dirt", 2, [[15, 15], [12, 12], [12, 8], [17, 6], [17, 1]]);
      p.fill("darktree", 1, 1, 14, 2); p.fill("darktree", 20, 1, 32, 2); p.fill("darktree", 2, 3, 9, 6); p.fill("darktree", 21, 3, 30, 5); p.fill("darktree", 15, 8, 19, 10); p.fill("darktree", 26, 8, 31, 11); p.fill("darktree", 2, 10, 4, 12);
      p.fill("rock", 2, 20, 9, 22); p.fill("rock", 26, 21, 31, 23); p.fill("rock", 9, 27, 13, 28); p.fill("rock", 2, 26, 4, 28);
      // Sandstone buttes.
      for (const [x, y, w, hgt] of [[11, 22, 3, 40], [26, 26, 4, 34], [28, 18, 2, 30]]) { blk(p, x, y, w, 1); p.paint(y + 1, (c, top) => { const px = x * S, W = w * S, b = y * S + 15, rk = [212, 150, 100], dk = mix(rk, 0.6); c.ellipse(px + W / 2, b, W / 2 + 2, 4, [0, 0, 0, 60]); for (const g of [c, top]) { g.poly([[px, b], [px + 4, b - hgt + 6], [px + 9, b - hgt], [px + W - 8, b - hgt - 2], [px + W - 3, b - hgt + 8], [px + W, b]], dk); g.poly([[px + 2, b - 1], [px + 6, b - hgt + 7], [px + 10, b - hgt + 2], [px + W - 9, b - hgt], [px + W - 5, b - hgt + 9], [px + W - 2, b - 1]], rk); for (let j = b - 8; j > b - hgt + 8; j -= 9) g.rect(px + 4, j, W - 8, 2, mix(rk, 0.82)); g.rect(px + 8, b - hgt + 3, W - 18, 2, mix(rk, 1.15)); } }); }
      const caps = [[255, 110, 190], [90, 220, 250], [250, 220, 110]];
      toadstool(p, 14, 4, caps[0], 32); toadstool(p, 20, 6, caps[1], 28); toadstool(p, 10, 9, caps[2], 26);
      [[15, 6], [19, 4], [7, 8], [23, 9], [14, 11], [22, 12]].forEach(([x, y], i) => mushrooms(p, x, y, caps[i % 3], { glow: caps[i % 3] }));
      for (const [x, y] of [[5, 24], [19, 20], [30, 27], [14, 19], [24, 28]]) p.decor("boulder", x, y);
      p.decor("board", 19, 25);
    },
  },
  // Route 7: green downs below Hammerlocke, crossed by the railway on its long row of stone arches
  // (a train is on it), dry-stone walls and berry trees on the way to the ruins of Route 8 (no brook: the guidebook map shows none).
  GalarRoute7: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.03, groves: 0, flowers: 0.15, turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 2, [[17, 30], [17, 25], [11, 23], [11, 17], [16, 15], [23, 13], [23, 8], [17, 6], [17, 1]]);
      viaduct(p, 10, 1, 32, [23, 24, 5, 6]);
      // The train.
      p.paint(11.9, (c, top) => { for (let k = 0; k < 4; k++) { const x = (8 + k * 3) * S + 2, y = 10 * S - 9, col = k === 3 ? [200, 60, 60] : [236, 236, 240]; for (const g of [c, top]) { g.box(x, y, 44, 18, col, [50, 50, 60]); g.rect(x + 1, y + 1, 42, 3, mix(col, 0.8)); g.rect(x + 1, y + 13, 42, 3, [60, 90, 170]); for (let i = 4; i < 38; i += 9) g.rect(x + i, y + 6, 6, 5, [150, 204, 238]); if (k === 3) g.rect(x + 36, y + 5, 6, 7, [150, 204, 238]); } } });
      wall(p, 2, 9, 14); wall(p, 26, 31, 17); wall(p, 3, 8, 26);
      p.fill("flowersPink", 26, 4, 30, 6); p.fill("flowersRed", 3, 4, 7, 5); p.fill("flowersBlue", 25, 25, 29, 26);
      trees(p, [[13, 2], [30, 14], [20, 26], [4, 28], [28, 28]]); trees(p, [[3, 16], [27, 19], [9, 6], [20, 17]], "honeyTree");
      wooloo(p, 28, 15); wooloo(p, 5, 12);
    },
  },
  // Route 8: a maze of fallen sandstone walls and carved pillars from an older Galar; beyond the
  // last wall the ground turns white on Steamdrift Way, where hot springs steam in the snow.
  GalarRoute8: {
    theme: { ground: "snow", road: "frostpath", border: "rock", density: 0.03, groves: 0, flowers: 0, treeTint: "frost", turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("sand", 1, 13, 32, 30); for (const [x, r] of [[4, 3], [11, 2.5], [24, 3.5], [30, 2.5]]) p.disc("sand", x, 12.5, r, 1.6);
      p.street("beach", 2, [[17, 30], [17, 26], [6, 26], [6, 21], [27, 21], [27, 16], [17, 16], [17, 13]]); p.street("frostpath", 2, [[17, 12], [14, 9], [14, 6], [17, 4], [17, 1]]);
      ruinWall(p, 9, 24, 32, 24); ruinWall(p, 1, 24, 3, 24); ruinWall(p, 1, 19, 24, 19); ruinWall(p, 30, 19, 32, 19); ruinWall(p, 1, 14, 14, 14); ruinWall(p, 20, 14, 32, 14);
      ruinWall(p, 12, 28, 12, 30); ruinWall(p, 22, 27, 22, 30); ruinWall(p, 11, 22, 11, 23); ruinWall(p, 20, 15, 20, 17); ruinWall(p, 9, 16, 9, 18);
      for (const [x, y, h] of [[3, 27, 28], [9, 28, 16], [26, 27, 30], [30, 26, 20], [14, 22, 26], [22, 22, 14], [31, 21, 28], [3, 16, 30], [12, 16, 18], [24, 16, 26], [30, 16, 12]]) pillar(p, x, y, h, [200, 178, 136], { cap: h > 20 });
      statue(p, 6, 16, (c, top, px, y, col) => { for (const g of [c, top]) { g.box(px + 3, y - 20, 10, 20, [226, 186, 84], [130, 96, 40]); g.ellipse(px + 8, y - 24, 5, 5, [226, 186, 84]); g.rect(px + 5, y - 25, 2, 2, [60, 40, 30]); g.rect(px + 9, y - 25, 2, 2, [60, 40, 30]); } }, [200, 178, 136]);
      spring(p, 6, 6, 2.2); spring(p, 25, 8, 2); spring(p, 28, 3.5, 1.4); spring(p, 9, 10, 1.3);
      p.fill("pine", 2, 2, 3, 4); p.fill("pine", 20, 2, 23, 3); p.fill("pine", 30, 9, 32, 11); p.disc("drift", 21, 8, 2.5, 1.6); p.disc("drift", 10, 3, 2.5, 1.4);
      snowman(p, 19, 10); p.decor("boulder", 30, 5); p.decor("boulder", 2, 9);
    },
  },
  // Route 9: Circhester Bay. Snowy shores round a grey sea crowded with ice floes, crossed by
  // boardwalks from islet to islet, and the shuttered steel front of Spikemuth at the far end.
  GalarRoute9: {
    theme: { ground: "snow", road: "frostpath", border: "rock", water: "sea", density: 0.03, groves: 0, flowers: 0, treeTint: "frost", turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 4, 9, 29, 23); p.disc("water", 6, 16, 4, 9); p.disc("water", 27, 16, 4, 9); p.fill("snow", 1, 14, 3, 18); p.fill("snow", 30, 14, 32, 18);
      p.disc("snow", 16.5, 20, 3.4, 2.2); p.disc("snow", 14.5, 14.5, 3.6, 2.4); p.disc("snow", 21, 11.5, 3, 2); p.disc("snow", 8, 19, 2.2, 1.6); p.disc("snow", 26, 18, 2.4, 1.6);
      p.street("frostpath", 2, [[17, 30], [17, 24]]); p.street("deck", 2, [[17, 24], [17, 20], [14, 16], [16, 14], [21, 12], [19, 8]]); p.street("frostpath", 2, [[19, 8], [17, 6], [17, 1]]);
      p.street("deck", 1, [[14, 15], [3, 16]]); p.street("deck", 1, [[21, 12], [26, 17], [30, 16]]);
      // Ice floes.
      p.paint(0.7, (c) => { for (let i = 0; i < 26; i++) { const x = (5 + p.hash(i, 1, 5) * 24) * S, y = (10 + p.hash(i, 2, 5) * 13) * S, r = 5 + p.hash(i, 3, 5) * 9; c.ellipse(x, y, r, r * 0.6, [170, 204, 232]); c.ellipse(x - 1, y - 1, r - 2, r * 0.6 - 1, [230, 242, 252]); } });
      // Spikemuth's shutter.
      p.fill("darkpave", 12, 3, 22, 6); wall(p, 2, 15, 2, [70, 70, 90], 26); wall(p, 19, 32, 2, [70, 70, 90], 26); gate(p, 1, [90, 90, 110], { lintel: [214, 60, 130], dark: [30, 26, 40] });
      p.paint(3.2, (c) => { for (const x of [4, 8, 12, 21, 25, 29]) { c.rect(x * S + 2, 2 * S - 6, 12, 2, [214, 60, 130]); c.rect(x * S + 5, 2 * S - 2, 6, 8, [240, 220, 80]); } });
      lamp(p, 13, 5, [240, 110, 190]); lamp(p, 21, 5, [240, 110, 190]);
      p.fill("pine", 2, 26, 6, 29); p.fill("pine", 27, 26, 32, 29); p.fill("pine", 2, 4, 5, 6); p.fill("pine", 28, 4, 32, 6);
      snowman(p, 13, 27); p.decor("boulder", 22, 26); p.decor("boulder", 8, 6);
    },
  },
  // The Route 9 tunnel: the lamp-lit road bored through the hill from Spikemuth's back gate towards
  // Hammerlocke. The snowy cutting leads up to its portal; inside, only the lamps and the white line.
  GalarRoute9Tunnel: {
    theme: { ground: "snow", road: "asphalt", border: "rock", density: 0.03, groves: 0, flowers: 0, treeTint: "frost", turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 32, 12); p.fill("darkpave", 13, 1, 21, 12);
      p.street("asphalt", 3, [[17, 30], [17, 25], [21, 22], [21, 18], [17, 15], [17, 1]]);
      p.paint(0.6, (c) => { c.rect(13 * S, S, 9 * S, 12 * S, [6, 6, 26, 110]); for (let y = 1; y < 15; y++) c.rect(17 * S + 7, y * S + 3, 2, 9, [240, 236, 200]); for (const [a, b] of [[17, 26], [18, 24], [19, 23], [20, 22], [21, 20], [20, 18], [19, 17], [18, 16]]) c.rect(a * S + 7, b * S + 3, 2, 9, [240, 236, 200]); });
      // The portal and the tunnel lamps.
      blk(p, 11, 12, 2, 1); blk(p, 22, 12, 2, 1);
      p.paint(13.2, (c, top) => { const x = 11 * S, b = 13 * S, st = [150, 150, 160], dk = mix(st, 0.55); for (const i of [x, x + 11 * S]) c.box(i, b - 40, 32, 40, st, dk); top.box(x, b - 54, 13 * S, 16, st, dk); top.rect(x + 2, b - 52, 13 * S - 4, 2, mix(st, 1.2)); top.rect(x + 70, b - 49, 68, 7, [240, 220, 80]); for (let i = 0; i < 8; i++) top.rect(x + 74 + i * 8, b - 47, 4, 3, [40, 40, 50]); top.rect(x, b - 57, 13 * S, 4, SNOW); });
      p.paint(0.9, (c) => { for (let y = 2; y < 12; y += 3) for (const x of [13, 21]) { const m = x * S + 8, q = y * S + 8; c.ellipse(m, q, 20, 14, [250, 220, 120, 46]); c.ellipse(m, q, 10, 7, [250, 220, 120, 80]); c.box(m - 3, q - 3, 6, 6, [255, 240, 170], [90, 80, 60]); } });
      for (const y of [16, 20, 25]) { lamp(p, 14, y); lamp(p, 24, y + 1); }
      fence(p, 2, 13, 9, 13, [], [150, 154, 170]); fence(p, 25, 13, 31, 13, [], [150, 154, 170]);
      p.fill("pine", 2, 24, 8, 29); p.fill("pine", 27, 25, 32, 29); p.disc("drift", 7, 19, 3, 1.8); p.disc("drift", 28, 20, 2.6, 1.6);
      snowman(p, 10, 22); p.decor("boulder", 4, 15); p.decor("boulder", 29, 15); p.decor("barrels", 23, 14);
    },
  },
  // Route 10: the last climb. A zigzag trail up white ledges through a blizzard, snowmen and frozen
  // tarns beside it, to the snowed-up station gate for Wyndon at the top.
  GalarRoute10: {
    theme: { ground: "snow", road: "frostpath", border: "pine", density: 0.04, groves: 0, flowers: 0, treeTint: "frost", turn: 6, wander: 0 },
    plan(p) {
      p.street("frostpath", 2, [[17, 30], [17, 25], [24, 22], [24, 17], [14, 15], [9, 12], [9, 8], [17, 6], [17, 1]]);
      p.fill("rock", 1, 19, 21, 20); p.fill("rock", 28, 19, 32, 20); p.fill("rock", 13, 10, 32, 11); p.fill("rock", 1, 10, 6, 11); p.fill("rock", 1, 25, 8, 25); p.fill("rock", 22, 26, 32, 26);
      p.paint(0.8, (c) => { for (const [x, y] of [[24, 19], [9, 10]]) for (let j = 0; j < 8; j++) c.rect(x * S - 2, y * S + j * 4, 36, 2, [150, 156, 176]); });
      gate(p, 1, [150, 110, 96], { snow: true, lintel: [70, 110, 170] }); wall(p, 12, 15, 3, [150, 110, 96], 20); wall(p, 19, 22, 3, [150, 110, 96], 20);
      rails(p, 2, 11, 2, false, true); rails(p, 23, 31, 2, false, true);
      ice(p, 6, 16, 3, 1.5); ice(p, 28, 14.5, 2.6, 1.3); ice(p, 6, 28, 3, 1.2); ice(p, 21, 8, 2.4, 1.2);
      for (const [x, y] of [[20, 23], [12, 17], [5, 7], [27, 5], [29, 23]]) snowman(p, x, y);
      for (const [x, y, r] of [[4, 22, 2.4], [29, 28, 2.6], [26, 16, 2], [4, 13, 2.2], [20, 13, 2]]) p.disc("drift", x, y, r, r * 0.7);
      p.fill("pine", 2, 4, 3, 8); p.fill("pine", 30, 4, 32, 8); p.fill("pine", 12, 27, 14, 29); p.fill("pine", 30, 13, 32, 14);
      p.decor("boulder", 14, 22); p.decor("boulder", 2, 16); p.decor("boulder", 25, 7);
      blizzard(p, 420, 4);
    },
  },
  // The Slumbering Weald's depths: the fog thickens, the path ends at a still lake, and on a stone
  // dais in the water stands the broken arch of the altar with the rusted sword and shield before it.
  GalarSlumberingDepths: {
    theme: { density: 0.15, groves: 0.06, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 4, 2, 30, 8); p.disc("water", 17, 8, 12, 2.6);
      p.disc("paving", 17.5, 4.6, 4.2, 2.8); p.fill("paving", 16, 1, 18, 3); p.fill("paving", 16, 7, 18, 10);
      p.street("dirt", 2, [[17, 30], [17, 25], [12, 22], [12, 16], [17, 13], [17, 11]]);
      p.bare(1); blk(p, 15, 2); blk(p, 19, 2); blk(p, 15, 5); blk(p, 19, 5);
      p.paint(3.5, (c, top) => { const st = [150, 156, 150], dk = mix(st, 0.5), moss = [90, 130, 90], b = 3 * S;
        for (const x of [15, 19]) { const px = x * S; for (const g of [c, top]) { g.box(px + 1, b - 44, 14, 44, st, dk); g.rect(px + 3, b - 42, 3, 40, mix(st, 1.15)); g.rect(px + 1, b - 20, 14, 3, moss); g.rect(px + 6, b - 34, 8, 2, moss); } }
        top.poly([[15 * S, b - 42], [16 * S + 4, b - 58], [18 * S + 4, b - 60], [19 * S + 6, b - 50], [20 * S, b - 42], [19 * S, b - 40], [18 * S, b - 48], [16 * S + 8, b - 47], [16 * S, b - 40]], dk);
        top.poly([[15 * S + 2, b - 43], [16 * S + 5, b - 56], [18 * S + 3, b - 58], [19 * S + 4, b - 49], [19 * S + 12, b - 43], [18 * S + 2, b - 50], [16 * S + 8, b - 49]], st); top.rect(16 * S + 6, b - 55, 22, 2, moss);
        c.box(16 * S + 2, 3 * S + 3, 44, 11, mix(st, 1.1), dk); c.rect(16 * S + 4, 3 * S + 5, 40, 2, mix(st, 1.25)); });
      // The rusted sword and the rusted shield.
      p.paint(6, (c) => { const st = [150, 156, 150], rust = [150, 104, 70], dk = [90, 60, 44];
        for (const x of [15, 19]) c.box(x * S + 1, 5 * S + 7, 14, 8, st, mix(st, 0.5));
        const sx = 15 * S + 8, sy = 5 * S + 8; c.rect(sx - 1, sy - 22, 3, 22, rust); c.rect(sx - 1, sy - 22, 1, 22, mix(rust, 1.3)); c.rect(sx - 5, sy - 18, 11, 2, dk); c.rect(sx - 1, sy - 26, 3, 4, dk);
        const hx = 19 * S + 8; c.poly([[hx - 7, sy - 20], [hx + 7, sy - 20], [hx + 6, sy - 6], [hx, sy], [hx - 6, sy - 6]], dk); c.poly([[hx - 5, sy - 18], [hx + 5, sy - 18], [hx + 4, sy - 7], [hx, sy - 3], [hx - 4, sy - 7]], rust); c.rect(hx - 1, sy - 17, 2, 12, mix(rust, 1.3)); });
      p.fill("darktree", 2, 12, 8, 14); p.fill("darktree", 22, 12, 31, 13); p.fill("darktree", 2, 19, 8, 23); p.fill("darktree", 15, 18, 22, 21); p.fill("darktree", 25, 18, 31, 24); p.fill("darktree", 2, 27, 12, 29); p.fill("darktree", 21, 27, 31, 29);
      for (const [x, y] of [[10, 12], [22, 15], [14, 24], [24, 26]]) mushrooms(p, x, y, [150, 120, 200]);
      p.paint(0.7, (c) => { for (const [x, y] of [[7, 5], [10, 7], [26, 4], [24, 7], [28, 6]]) { c.ellipse(x * S + 8, y * S + 8, 5, 3, [50, 110, 90]); c.ellipse(x * S + 7, y * S + 7, 3, 2, [90, 150, 110]); } });
      fog(p, 70, [226, 236, 240], 7);
    },
  },
  // The Forest of Focus: tall old trees, a river looping through them under plank bridges, red Max
  // Mushrooms in the shade, and the mouth of Brawlers' Cave at the top of the wood.
  GalarForestFocus: {
    theme: { road: "dirt", border: "tree", density: 0.12, groves: 0.04, flowers: 0.05, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 20, 13, 21); p.fill("water", 12, 21, 21, 22); p.fill("water", 20, 19, 22, 21); p.fill("water", 21, 19, 32, 20); p.fill("water", 27, 6, 28, 19); p.disc("water", 27.5, 5, 2.6, 1.8);
      p.street("dirt", 2, [[17, 30], [17, 25], [10, 23], [10, 17], [17, 15], [24, 13], [24, 8], [17, 6], [17, 4]]);
      p.street("dirt", 1, [[10, 16], [1, 16]]); p.street("dirt", 1, [[24, 14], [32, 16]]); p.street("dirt", 1, [[17, 25], [25, 25], [25, 22]]);
      p.fill("tree", 2, 2, 8, 5); p.fill("tree", 2, 6, 5, 9); p.fill("tree", 11, 9, 15, 12); p.fill("tree", 19, 9, 21, 11); p.fill("tree", 30, 2, 32, 10); p.fill("tree", 20, 2, 24, 4);
      p.fill("tree", 2, 24, 7, 29); p.fill("tree", 12, 17, 13, 18); p.fill("tree", 27, 23, 32, 29); p.fill("tree", 20, 27, 24, 29); p.fill("tree", 2, 12, 6, 13);
      for (const [x, y] of [[8, 8], [14, 14], [22, 16], [19, 24], [29, 13], [5, 18], [13, 27], [11, 4]]) mushrooms(p, x, y);
      trees(p, [[8, 11], [20, 16], [14, 22], [29, 21], [3, 14], [22, 6]], "honeyTree");
      den(p, 6, 22); den(p, 30, 17, false);
      p.fill("flowersBlue", 12, 6, 14, 7); p.fill("flowersPink", 22, 23, 24, 24);
    },
  },
  // The Workout Sea: open water between the Isle of Armor's beaches. Sandbars and islets joined by
  // jetties, Sharpedo fins in the swell, and Honeycalm Island with its great honey tree to the north.
  GalarWorkoutSea: {
    theme: { ground: "beach", road: "sand", border: "rock", water: "sea", tree: "boulder", density: 0.02, groves: 0, flowers: 0, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 1, 1, 32, 23); p.disc("water", 8, 24, 6, 1.6); p.disc("water", 27, 24, 5, 1.6);
      for (const [x, y, r, ry] of [[17.5, 4.5, 6.5, 3.4], [16, 13, 5, 3.4], [25, 17, 3.6, 2.4], [5, 16, 4.6, 2.6], [30.5, 16, 2.6, 2.4], [9, 8, 2.4, 1.6], [27, 10, 2, 1.4]]) p.disc("ground", x, y, r, ry);
      p.disc("grass", 17.5, 4, 4.6, 2.2);
      p.street("deck", 2, [[17, 23], [17, 16]]); p.street("deck", 2, [[17, 10], [17, 7]]); p.street("deck", 1, [[20, 14], [23, 16]]); p.street("deck", 1, [[11, 14], [8, 16]]); p.street("deck", 1, [[28, 17], [29, 16]]);
      p.street("sand", 2, [[17, 30], [17, 24]]);
      p.decor("honeyTree", 20, 2, { canopy: true }); p.decor("honeyTree", 13, 2, { canopy: true }); p.fill("flowersRed", 15, 5, 16, 5);
      p.fill("palms", 3, 15, 4, 16); p.fill("palms", 13, 12, 13, 13); p.fill("palms", 2, 27, 5, 29); p.fill("palms", 28, 27, 31, 29);
      // Rocks in the surf and Sharpedo fins.
      p.paint(0.6, (c) => { for (const [x, y] of [[6, 4], [28, 5], [10, 20], [23, 21], [30, 21], [3, 10], [22, 9]]) { const px = x * S, py = y * S; c.ellipse(px + 8, py + 10, 9, 5, [236, 244, 250, 160]); c.poly([[px + 1, py + 11], [px + 4, py + 2], [px + 10, py], [px + 15, py + 6], [px + 15, py + 11]], [90, 86, 90]); c.poly([[px + 3, py + 10], [px + 5, py + 3], [px + 10, py + 2], [px + 13, py + 7], [px + 13, py + 10]], [140, 134, 136]); }
        for (const [x, y] of [[8, 12], [24, 4], [12, 19], [29, 12], [22, 12]]) { const px = x * S, py = y * S; c.ellipse(px + 8, py + 11, 9, 3, [236, 244, 250, 150]); c.poly([[px + 3, py + 11], [px + 10, py], [px + 13, py + 11]], [40, 60, 110]); c.poly([[px + 7, py + 10], [px + 10, py + 3], [px + 11, py + 10]], [70, 96, 150]); } });
      for (const [x, y, col] of [[10, 26, [214, 70, 70]], [24, 27, [70, 130, 210]]]) { blk(p, x, y); p.paint(y + 1, (c, top) => { const px = x * S, py = y * S; c.rect(px + 12, py + 9, 14, 6, mix(col, 1.1)); c.rect(px + 12, py + 11, 14, 2, [250, 250, 250]); c.rect(px + 7, py - 8, 2, 23, [236, 236, 236]); top.ellipse(px + 8, py - 8, 13, 7, mix(col, 0.7)); top.ellipse(px + 8, py - 9, 12, 6, col); top.ellipse(px + 8, py - 9, 5, 6, [250, 250, 250]); }); }
      p.decor("boulder", 14, 27); p.decor("boulder", 20, 26);
    },
  },
  // The Tunnel to the Top: a passage through the mountain, brown rock and bare earth (as the screenshot shows)
  // with ice only where it nears the summit, and the three coloured stones that hum when the titans stir.
  GalarTunnelTop: {
    theme: { ground: "dirt", grass: "dirt", road: "dirt", border: "rock", tree: "boulder", density: 0.02, groves: 0, flowers: 0, turn: 6, wander: 0 },   // a brown rock cave with an earth floor (screenshot); ice only towards the top
    plan(p) {
      p.fill("rock", 1, 1, 32, 30);
      carve(p, [[17, 30], [17, 26], [24, 23], [25, 17], [16, 15], [9, 12], [8, 7], [16, 5], [17, 1]], 2.6); carve(p, [[1, 16], [32, 16]], 1.8); carve(p, [[14, 14], [14, 14]], 3); carve(p, [[25, 9], [25, 16]], 2); carve(p, [[7, 20], [8, 17]], 2.4);
      p.paint(0.4, (c) => c.rect(0, 0, p.W * S, p.H * S, [70, 40, 20, 46]));
      ice(p, 9, 9, 2.4, 1.6); ice(p, 25, 11, 1.8, 1.4);
      for (const [x, y, h] of [[6, 6, 30], [11, 5, 22], [23, 8, 30], [27, 12, 18]]) crystal(p, x, y, h);
      // The three stones.
      [[12, 12, [150, 210, 245]], [14, 11, [190, 130, 90]], [16, 12, [170, 176, 190]]].forEach(([x, y, col]) => { blk(p, x, y); p.paint(y + 1, (c) => { const m = x * S + 8, b = y * S + 15; c.ellipse(m, b - 6, 12, 9, [...col, 50]); c.ellipse(m, b, 7, 2, [0, 0, 0, 70]); c.poly([[m - 6, b], [m - 5, b - 14], [m, b - 19], [m + 5, b - 14], [m + 6, b]], mix(col, 0.6)); c.poly([[m - 4, b - 1], [m - 3, b - 13], [m, b - 17], [m + 3, b - 13], [m + 4, b - 1]], col); for (const [i, j] of [[-2, -12], [1, -12], [-2, -8], [1, -8], [0, -5]]) c.rect(m + i, b + j, 2, 2, [255, 250, 220]); }); });
      p.decor("boulder", 21, 23); p.decor("boulder", 10, 15);
    },
  },
  // The Crown Shrine: the summit above Snowslide Slope. A stair of old stone between rows of pillars
  // climbs to the shrine's arch; blue flowers glow in the snow and the wind never drops.
  GalarCrownShrine: {
    theme: { ground: "snow", road: "frostpath", border: "rock", tree: "boulder", density: 0.03, groves: 0, flowers: 0, treeTint: "frost", turn: 6, wander: 0 },
    plan(p) {
      p.street("frostpath", 2, [[17, 30], [17, 25], [13, 22], [13, 17], [17, 14], [17, 11]]);
      p.fill("paving", 15, 2, 19, 10); p.fill("paving", 16, 1, 18, 1);
      p.paint(0.6, (c) => { for (let j = 5 * S; j < 11 * S; j += 4) { c.rect(15 * S, j, 5 * S, 3, [200, 204, 214]); c.rect(15 * S, j + 3, 5 * S, 1, [130, 136, 150]); } c.ellipse(17.5 * S, 3.5 * S, 30, 18, [110, 200, 250, 70]); c.ellipse(17.5 * S, 3.5 * S, 16, 10, [170, 230, 255, 90]); });
      gate(p, 1, [176, 180, 192], { snow: true, lintel: [120, 170, 220] });
      for (const [x, y, h] of [[14, 2, 34], [20, 2, 34], [14, 5, 30], [20, 5, 30], [14, 8, 26], [20, 8, 18], [14, 11, 12], [20, 11, 26]]) pillar(p, x, y, h, [176, 180, 192], { cap: h > 20, snow: true });
      p.fill("rock", 1, 12, 9, 13); p.fill("rock", 23, 12, 32, 13); p.fill("rock", 1, 20, 10, 21); p.fill("rock", 21, 23, 32, 24); p.fill("rock", 2, 2, 11, 3); p.fill("rock", 23, 2, 31, 3);
      p.fill("flowersBlue", 9, 6, 12, 8); p.fill("flowersBlue", 22, 6, 25, 8); p.fill("flowersBlue", 21, 15, 23, 16);
      p.paint(0.7, (c) => { for (const [x0, y0, x1, y1] of [[9, 6, 12, 8], [22, 6, 25, 8], [21, 15, 23, 16]]) c.ellipse((x0 + x1 + 1) * 8, (y0 + y1 + 1) * 8, (x1 - x0 + 2) * 9, (y1 - y0 + 2) * 9, [120, 200, 255, 60]); });
      ice(p, 6, 17, 3, 1.5); ice(p, 27, 19, 3, 1.5); ice(p, 26, 28, 2.6, 1.2); ice(p, 7, 26, 2.6, 1.3);
      for (const [x, y, r] of [[4, 9, 2.4], [29, 9, 2.4], [22, 27, 2], [10, 28, 2.2], [29, 16, 2]]) p.disc("drift", x, y, r, r * 0.7);
      crystal(p, 11, 10, 24); crystal(p, 24, 10, 28); crystal(p, 3, 24, 22); crystal(p, 30, 27, 26);
      p.fill("pine", 2, 28, 4, 29); p.fill("pine", 30, 4, 32, 6); p.fill("pine", 2, 4, 3, 6);
      p.decor("boulder", 19, 20); p.decor("boulder", 5, 14); p.decor("boulder", 26, 21);
      blizzard(p, 260, 9);
    },
  },
};
