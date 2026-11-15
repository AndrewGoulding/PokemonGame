// unova towns, drawn by hand. See README.md.
"use strict";
// ---------------------------------------------------------------- hand-drawn pieces shared by the towns below
const U = 16;
const sh = (col, k) => col.map((v) => Math.max(0, Math.min(255, Math.round(v * k))));
// A pen that draws on the ground picture below pixel row `cut` and on the walk-behind picture above it.
function pen(c, top, cut) {
  const s = {};
  s.p = (x, y, col) => (y < cut ? top : c).p(x, y, col);
  s.rect = (x, y, w, h, col) => { for (let j = y | 0; j < y + h; j++) for (let i = x | 0; i < x + w; i++) s.p(i, j, col); };
  s.box = (x, y, w, h, fill, edge = [46, 36, 34]) => { s.rect(x, y, w, h, edge); s.rect(x + 1, y + 1, w - 2, h - 2, fill); };
  s.line = (x0, y0, x1, y1, col, width = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) s.rect(Math.round(x0 + (x1 - x0) * i / n) - (width >> 1), Math.round(y0 + (y1 - y0) * i / n) - (width >> 1), width, width, col); };
  s.ellipse = (cx, cy, rx, ry, col, ring = 0) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1 && (!ring || ((x - cx) / (rx - ring)) ** 2 + ((y - cy) / (ry - ring)) ** 2 >= 1)) s.p(x, y, col); } };
  s.poly = (pts, col) => { const ys = pts.map((q) => q[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) s.rect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, col); } };
  return s;
}
// Make tiles (x, y, w, h) solid, except the listed [x, y] tiles (a door the building is drawn around).
function solidBut(p, x, y, w, h, holes = []) { for (const [a, b] of holes) { const v = p.warps.find((q) => q.x === a && q.y === b); if (v && p.bare) p.bare(v.k); } for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!holes.some(([a, b]) => a === i && b === j)) p.block(i, j, 1, 1); }
// A building on tiles (x, y, w, h), all solid. o.hole: column of a real door in its bottom row (the building is drawn over the builder's porch). o.up: tiles of extra height above it, walked behind.
// o.style: "gable" (shingled roof), "flat" (parapet roof), "ware" (corrugated shed), "glass" (tower face of windows).
function bld(p, x, y, w, h, o = {}) {
  const wall = o.wall || [228, 218, 196], roof = o.roof || [156, 76, 64], edge = o.edge || sh(wall, 0.32), up = o.up || 0, style = o.style || "gable", win = o.win || [150, 196, 232];
  solidBut(p, x, y, w, h, o.hole == null ? [] : [[x + o.hole, y + h - 1]]); if (o.hole != null && o.door == null) o = { ...o, door: o.hole };
  p.paint(y + h + (o.hole == null ? 0 : 0.6), (c, top) => {
    const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U;
    s.rect(X + 3, Y + Ht - 3, Wd, 4, [0, 0, 0, 60]);
    if (style === "glass") {
      s.box(X, Y, Wd, Ht, wall, edge); s.rect(X + 1, Y + 1, Wd - 2, 5, roof); s.rect(X + 1, Y + 6, Wd - 2, 1, edge);
      for (let j = Y + 10; j + 7 < Y + Ht - 12; j += 9) for (let i = X + 4; i + 5 < X + Wd - 2; i += 8) s.rect(i, j, 5, 6, o.lit && p.hash(i, j, 5) < o.lit ? o.glow || [255, 236, 130] : win);
      s.box(X + (Wd >> 1) - 7, Y + Ht - 13, 14, 13, sh(wall, 0.5), edge);
      return;
    }
    const wallH = o.wallH != null ? o.wallH : Math.max(16, Math.min(30, Math.round(Ht * 0.4))), rh = Ht - wallH;
    s.box(X, Y + rh - 1, Wd, wallH + 1, wall, edge);
    s.rect(X + 1, Y + rh, Wd - 2, 3, sh(wall, 0.8));
    for (let i = X + 6; i + 8 <= X + Wd - 5; i += 14) s.box(i, Y + rh + 6, 8, Math.min(9, wallH - 10), win, edge);
    if (o.door != null) s.box(X + o.door * U + 2, Y + Ht - 15, 12, 15, o.doorCol || [110, 76, 56], edge);
    if (style === "flat") { s.box(X - 1, Y, Wd + 2, rh, roof, edge); s.box(X + 3, Y + 3, Wd - 6, rh - 7, sh(roof, 1.12), sh(roof, 0.7)); }
    else if (style === "ware") { s.box(X - 1, Y, Wd + 2, rh, roof, edge); for (let i = X + 3; i < X + Wd - 2; i += 4) s.rect(i, Y + 1, 1, rh - 2, sh(roof, 0.8)); s.rect(X, Y + (rh >> 1) - 1, Wd, 2, sh(roof, 1.2)); }
    else { s.box(X - 2, Y, Wd + 4, rh, roof, edge); for (let j = Y + 4; j < Y + rh - 2; j += 4) s.rect(X - 1, j, Wd + 2, 1, sh(roof, 0.82)); s.rect(X - 1, Y + (rh >> 1) - 1, Wd + 2, 2, sh(roof, 1.25)); }
    if (o.sign) s.box(X + (Wd >> 1) - 10, Y + rh - 8, 20, 8, o.sign, edge);
  });
}
// Steps to walk up, on tiles (x, y, w, h): stays walkable.
function stairs(p, x, y, w, h, col = [206, 198, 184]) {
  p.fill("paving", x, y, x + w - 1, y + h - 1);
  p.paint(0, (c) => { const X = x * U, Y = y * U; c.rect(X, Y, w * U, h * U, col); for (let j = 0; j < h * U; j += 4) { c.rect(X, Y + j, w * U, 1, sh(col, 0.72)); c.rect(X, Y + j + 1, w * U, 1, sh(col, 1.1)); } c.rect(X, Y, 2, h * U, sh(col, 0.6)); c.rect(X + w * U - 2, Y, 2, h * U, sh(col, 0.6)); });
}
// A stone wall (solid) on tiles (x, y, w, h).
function wall(p, x, y, w, h, col = [150, 146, 140]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const X = x * U, Y = y * U; c.box(X, Y, w * U, h * U, col, sh(col, 0.45)); for (let j = 0; j < h * U; j += 8) { c.rect(X + 1, Y + j, w * U - 2, 1, sh(col, 0.7)); for (let i = (j % 16 ? 4 : 10); i < w * U - 1; i += 12) c.rect(X + i, Y + j, 1, 8, sh(col, 0.7)); } c.rect(X + 1, Y + 1, w * U - 2, 2, sh(col, 1.2)); });
}
// A railing or fence (solid), one tile thick.
function rail(p, x, y, w, h, col = [236, 236, 240]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const X = x * U, Y = y * U; if (w >= h) { c.rect(X, Y + 5, w * U, 2, col); c.rect(X, Y + 10, w * U, 2, sh(col, 0.8)); for (let i = 0; i < w * U; i += 8) c.box(X + i, Y + 3, 3, 12, col, sh(col, 0.5)); } else { c.box(X + 6, Y, 4, h * U, col, sh(col, 0.5)); for (let j = 0; j < h * U; j += 8) c.rect(X + 5, Y + j, 6, 2, sh(col, 0.7)); } });
}
// A railway track painted on the ground from tile (x0, y0) to (x1, y1), horizontal or vertical; walkable.
function track(p, x0, y0, x1, y1) {
  p.paint(0, (c) => { const tie = [104, 78, 58], steel = [176, 180, 190]; if (y0 === y1) { const Y = y0 * U; for (let i = x0 * U; i < (x1 + 1) * U; i += 5) c.rect(i, Y + 1, 3, 14, tie); c.rect(x0 * U, Y + 3, (x1 - x0 + 1) * U, 2, steel); c.rect(x0 * U, Y + 11, (x1 - x0 + 1) * U, 2, steel); } else { const X = x0 * U; for (let j = y0 * U; j < (y1 + 1) * U; j += 5) c.rect(X + 1, j, 14, 3, tie); c.rect(X + 3, y0 * U, 2, (y1 - y0 + 1) * U, steel); c.rect(X + 11, y0 * U, 2, (y1 - y0 + 1) * U, steel); } });
}
// A round storage tank (solid) on tiles (x, y, w, h).
function tank(p, x, y, w, h, col = [196, 200, 208]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const X = x * U, Y = y * U, Wd = w * U, Ht = h * U; c.ellipse(X + Wd / 2 + 2, Y + Ht - 5, Wd / 2, 6, [0, 0, 0, 70]); c.rect(X + 1, Y + 8, Wd - 2, Ht - 15, sh(col, 0.8)); c.rect(X + 4, Y + 8, Wd / 3, Ht - 15, col); c.ellipse(X + Wd / 2, Y + Ht - 8, Wd / 2 - 1, 6, sh(col, 0.8)); c.ellipse(X + Wd / 2, Y + 8, Wd / 2 - 1, 7, sh(col, 0.55)); c.ellipse(X + Wd / 2, Y + 7, Wd / 2 - 2, 6, sh(col, 1.1)); c.rect(X + 1, Y + Ht / 2, Wd - 2, 2, [200, 80, 60]); });
}
// A market stall or parasol table, one tile (solid).
function stall(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const X = x * U, Y = y * U; c.box(X, Y + 4, 16, 12, [196, 150, 96], [90, 60, 40]); c.poly([[X - 3, Y + 5], [X + 8, Y - 6], [X + 19, Y + 5]], col); c.rect(X + 3, Y + 8, 10, 3, [240, 236, 220]); });
}
// A boat or ship lying in water, hull w x h tiles from (x, y); not solid (water already is).
function ship(p, x, y, w, h, hull, cabin = [236, 236, 240]) {
  p.paint(y + h, (c) => { const X = x * U, Y = y * U, Wd = w * U, Ht = h * U; c.poly([[X, Y + 4], [X + Wd - 14, Y + 4], [X + Wd, Y + Ht / 2], [X + Wd - 14, Y + Ht - 4], [X, Y + Ht - 4]], [50, 44, 48]); c.poly([[X + 2, Y + 6], [X + Wd - 15, Y + 6], [X + Wd - 3, Y + Ht / 2], [X + Wd - 15, Y + Ht - 6], [X + 2, Y + Ht - 6]], hull); c.rect(X + 4, Y + 8, Wd - 22, Ht - 16, sh(hull, 1.2)); c.box(X + 5, Y + 9, Math.min(22, Wd / 3), Ht - 18, cabin, [70, 70, 90]); c.rect(X + 8, Y + 12, Math.min(16, Wd / 3 - 6), 3, [120, 180, 230]); });
}
const ROOF = { red: [176, 72, 62], blue: [70, 110, 176], green: [84, 142, 96], brown: [140, 100, 70], grey: [120, 124, 136], teal: [60, 150, 150], orange: [214, 130, 60], purple: [120, 90, 160], white: [232, 232, 236], dark: [60, 60, 76] };

// A clock tower: base on tiles (x, y, 3, 2), rising `up` tiles above (walked behind).
function clockTower(p, x, y, up = 5, col = [226, 214, 190], roof = [150, 60, 56], face = true) {
  p.block(x, y, 3, 2);
  p.paint(y + 2, (c, top) => { const s = pen(c, top, y * U), X = x * U + 4, Y = (y - up) * U, Ht = (up + 2) * U; s.rect(X + 4, Y + Ht - 3, 40, 4, [0, 0, 0, 60]); s.box(X, Y + 14, 40, Ht - 14, col, sh(col, 0.35)); s.rect(X + 1, Y + 15, 6, Ht - 16, sh(col, 1.08)); s.rect(X + 33, Y + 15, 6, Ht - 16, sh(col, 0.85)); s.poly([[X - 4, Y + 16], [X + 20, Y - 8], [X + 44, Y + 16]], sh(roof, 0.6)); s.poly([[X - 1, Y + 14], [X + 20, Y - 5], [X + 41, Y + 14]], roof); if (face) { s.ellipse(X + 20, Y + 36, 13, 13, [60, 50, 50]); s.ellipse(X + 20, Y + 36, 11, 11, [250, 248, 236]); s.line(X + 20, Y + 36, X + 20, Y + 28, [40, 40, 40]); s.line(X + 20, Y + 36, X + 26, Y + 39, [40, 40, 40]); } else s.box(X + 15, Y + 34, 10, 10, [130, 170, 210], sh(col, 0.35)); for (let j = Y + 58; j + 10 < Y + Ht - 22; j += 16) s.box(X + 15, j, 10, 10, [130, 170, 210], sh(col, 0.35)); s.box(X + 13, Y + Ht - 20, 14, 20, [110, 80, 60], [60, 40, 40]); });
}
// A coloured rug or marking on the ground (walkable), in pixels relative to tiles.
function decal(p, x, y, w, h, col, edge) { p.paint(0, (c) => { if (edge) c.box(x * U, y * U, w * U, h * U, col, edge); else c.rect(x * U, y * U, w * U, h * U, col); }); }
// A five-pointed star painted on the ground, centre (cx, cy) in tiles, radius r in pixels.
function star(p, cx, cy, r, col) { p.paint(0, (c) => { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.42 : r; pts.push([cx * U + Math.cos(a) * q, cy * U + Math.sin(a) * q]); } for (let k = 0; k < 10; k++) c.poly([[cx * U, cy * U], pts[k], pts[(k + 1) % 10]], col); }); }
// A pipe run (solid) along tiles (x, y, w, h), one tile thick.
function pipe(p, x, y, w, h, col = [150, 156, 170]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const X = x * U, Y = y * U; if (w >= h) { c.box(X, Y + 3, w * U, 10, col, sh(col, 0.4)); c.rect(X + 1, Y + 5, w * U - 2, 2, sh(col, 1.3)); for (let i = 6; i < w * U; i += 24) c.box(X + i, Y + 1, 4, 14, sh(col, 0.75), sh(col, 0.4)); } else { c.box(X + 3, Y, 10, h * U, col, sh(col, 0.4)); c.rect(X + 5, Y + 1, 2, h * U - 2, sh(col, 1.3)); for (let j = 6; j < h * U; j += 24) c.box(X + 1, Y + j, 14, 4, sh(col, 0.75), sh(col, 0.4)); } });
}
// A shipping container or crate stack (solid) on tiles (x, y, w, 1).
function crate(p, x, y, w, col) { p.block(x, y, w, 1); p.paint(y + 1, (c) => { const X = x * U, Y = y * U; c.box(X, Y - 4, w * U, 20, col, sh(col, 0.4)); for (let i = 3; i < w * U - 1; i += 4) c.rect(X + i, Y - 2, 1, 16, sh(col, 0.8)); c.rect(X + 1, Y - 3, w * U - 2, 2, sh(col, 1.25)); }); }
// A stadium seen from above on tiles (x, y, w, h) with its door at column `hole` of the bottom row.
function stadium(p, x, y, w, h, hole, seats, pitch = [96, 176, 96]) {
  solidBut(p, x, y, w, h, [[x + hole, y + h - 1]]);
  p.paint(y + h + 0.6, (c) => { const X = x * U, Y = y * U, Wd = w * U, Ht = h * U, cx = X + Wd / 2, cy = Y + Ht / 2 - 4; c.ellipse(cx + 2, cy + 6, Wd / 2, Ht / 2 - 2, [0, 0, 0, 60]); c.ellipse(cx, cy, Wd / 2, Ht / 2 - 4, [90, 92, 104]); c.ellipse(cx, cy, Wd / 2 - 3, Ht / 2 - 7, [214, 214, 222]); c.ellipse(cx, cy, Wd / 2 - 8, Ht / 2 - 12, seats); c.ellipse(cx, cy, Wd / 2 - 16, Ht / 2 - 19, sh(seats, 0.8)); c.ellipse(cx, cy, Wd / 2 - 24, Ht / 2 - 26, pitch); c.ellipse(cx, cy, Wd / 2 - 24, Ht / 2 - 26, [240, 240, 240], 1); c.rect(cx, cy - Ht / 2 + 27, 1, Ht - 54, [240, 240, 240]); const dx = (x + hole) * U; c.box(dx - 12, Y + Ht - 22, 40, 22, [214, 214, 222], [70, 70, 84]); c.rect(dx - 10, Y + Ht - 20, 36, 4, seats); c.box(dx + 1, Y + Ht - 15, 14, 15, [60, 50, 60], [30, 30, 40]); });
}
// Gear Station: the round, cog-roofed terminal. Body on tiles (x, y, w, h); the door is `hole` columns in, one row below the body.
function gearStation(p, x, y, w, h, hole) {
  solidBut(p, x, y, w, h + 1, [[x + hole, y + h], ...Array.from({ length: w }, (_, i) => [x + i, y + h]).filter(([a]) => Math.abs(a - x - hole) > 1)]);
  p.paint(y + h + 1.6, (c, top) => { const X = x * U, Y = y * U, Wd = w * U, Ht = h * U, cx = X + Wd / 2, cy = Y + Ht / 2 - 6, teal = [70, 150, 160], s = pen(c, top, y * U);
    s.ellipse(cx + 3, cy + 12, Wd / 2, Ht / 2 + 2, [0, 0, 0, 60]);
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; s.rect(cx + Math.cos(a) * (Wd / 2 - 2) - 5, cy + Math.sin(a) * (Ht / 2 + 2) - 5, 10, 10, sh(teal, 0.6)); }
    s.ellipse(cx, cy, Wd / 2 - 3, Ht / 2 + 1, sh(teal, 0.6)); s.ellipse(cx, cy, Wd / 2 - 6, Ht / 2 - 2, teal); s.ellipse(cx, cy, Wd / 2 - 20, Ht / 2 - 14, sh(teal, 1.25)); s.ellipse(cx, cy, Wd / 2 - 36, Ht / 2 - 26, [236, 236, 226]); s.ellipse(cx, cy, Wd / 2 - 44, Ht / 2 - 32, [230, 190, 70]);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; s.line(cx, cy, cx + Math.cos(a) * (Wd / 2 - 8), cy + Math.sin(a) * (Ht / 2 - 4), sh(teal, 0.7)); }
    const dx = (x + hole) * U, by = (y + h + 1) * U; s.box(dx - 30, by - 30, 76, 30, [226, 226, 216], [70, 70, 84]); s.rect(dx - 28, by - 28, 72, 5, [230, 190, 70]); s.box(dx - 1, by - 18, 18, 18, [50, 60, 80], [30, 30, 40]); s.rect(dx - 22, by - 18, 12, 8, [140, 190, 230]); s.rect(dx + 26, by - 18, 12, 8, [140, 190, 230]); });
}
// A Ferris wheel: legs on tiles (x, y, w, 2), the wheel of radius r pixels above them (walked behind).
function ferris(p, x, y, w, r) {
  p.block(x, y, w, 2);
  p.paint(y + 2, (c, top) => { const cx = (x + w / 2) * U, cy = y * U - r + 26, by = (y + 2) * U, s = pen(c, top, y * U);
    s.line(cx, cy, cx - w * 6, by - 4, [120, 130, 160], 5); s.line(cx, cy, cx + w * 6, by - 4, [120, 130, 160], 5); s.box(cx - w * 7, by - 10, w * 14, 10, [200, 204, 214], [70, 76, 96]);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; s.line(cx, cy, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), [150, 160, 190]); }
    s.ellipse(cx, cy, r, r, [226, 80, 110], 4); s.ellipse(cx, cy, r - 12, r - 12, [250, 220, 90], 2); s.ellipse(cx, cy, 9, 9, [226, 80, 110]); s.ellipse(cx, cy, 5, 5, [250, 240, 200]);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26, gx = cx + Math.cos(a) * (r - 1), gy = cy + Math.sin(a) * (r - 1); s.box(gx - 7, gy - 4, 14, 12, [[250, 110, 110], [110, 180, 250], [250, 220, 90], [130, 220, 140]][k % 4], [60, 50, 70]); s.rect(gx - 5, gy - 2, 10, 4, [230, 244, 255]); } });
}
// A domed arena on tiles (x, y, w, h) with its door at column `hole` of the bottom row; the dome rises `up` tiles above.
function arena(p, x, y, w, h, hole, up, col = [80, 120, 200], wallc = [232, 232, 238]) {
  solidBut(p, x, y, w, h, [[x + hole, y + h - 1]]);
  p.paint(y + h + 0.6, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U, cx = X + Wd / 2, wy = Y + Ht - 44;
    s.rect(X + 3, Y + Ht - 3, Wd, 4, [0, 0, 0, 60]);
    for (let j = Y; j < wy + 2; j++) { const t = (wy - j) / (wy - Y), half = Math.sqrt(Math.max(0, 1 - t * t)) * (Wd / 2 - 4); s.rect(cx - half, j, half * 2, 1, sh(col, 0.75 + 0.45 * t)); }
    for (let k = -3; k <= 3; k++) for (let j = Y + 2; j < wy; j++) { const t = (wy - j) / (wy - Y), half = Math.sqrt(Math.max(0, 1 - t * t)) * (Wd / 2 - 4); s.p(cx + half * k / 3.5, j, sh(col, 0.55)); }
    s.box(X, wy, Wd, 44, wallc, [70, 70, 90]); s.rect(X + 1, wy + 1, Wd - 2, 6, [220, 70, 70]); s.rect(X + 1, wy + 7, Wd - 2, 2, [250, 220, 90]);
    for (let i = X + 8; i + 10 < X + Wd - 4; i += 18) s.box(i, wy + 14, 10, 14, [150, 196, 232], [70, 70, 90]);
    const dx = (x + hole) * U; s.box(dx - 14, wy + 10, 44, 34, sh(wallc, 0.9), [70, 70, 90]); s.poly([[dx - 16, wy + 12], [dx + 8, wy - 4], [dx + 32, wy + 12]], [220, 70, 70]); s.box(dx, Y + Ht - 18, 16, 18, [50, 60, 80], [30, 30, 40]); });
}
// An aeroplane parked nose-east with its body on tiles (x, y, w, 1); solid.
function plane(p, x, y, w, body = [240, 240, 244], trim = [70, 120, 200]) {
  p.block(x, y, w, 1);
  p.paint(y + 2, (c) => { const X = x * U, Y = y * U, Wd = w * U; c.ellipse(X + Wd / 2 + 3, Y + 14, Wd / 2, 6, [0, 0, 0, 60]); c.poly([[X + Wd * 0.38, Y + 8], [X + Wd * 0.28, Y - 22], [X + Wd * 0.4, Y - 22], [X + Wd * 0.6, Y + 8]], sh(body, 0.85)); c.poly([[X + Wd * 0.38, Y + 8], [X + Wd * 0.28, Y + 38], [X + Wd * 0.4, Y + 38], [X + Wd * 0.6, Y + 8]], sh(body, 0.85)); c.poly([[X + 2, Y + 6], [X - 2, Y - 8], [X + 8, Y - 8], [X + 16, Y + 6]], trim); c.ellipse(X + Wd / 2, Y + 8, Wd / 2, 7, sh(body, 0.6)); c.ellipse(X + Wd / 2, Y + 7, Wd / 2 - 1, 6, body); c.rect(X + 10, Y + 9, Wd - 24, 2, trim); for (let i = X + 14; i < X + Wd - 16; i += 6) c.rect(i, Y + 4, 3, 2, [90, 140, 200]); c.rect(X + Wd - 12, Y + 4, 6, 3, [60, 90, 140]); });
}
// Runway paint: centre dashes and edge lines over tiles (x0..x1, y0..y1).
function runwayMarks(p, x0, y0, x1, y1) { p.paint(0, (c) => { const X = x0 * U, Y = y0 * U, Wd = (x1 - x0 + 1) * U, Ht = (y1 - y0 + 1) * U; c.rect(X, Y + 1, Wd, 1, [236, 236, 220]); c.rect(X, Y + Ht - 2, Wd, 1, [236, 236, 220]); for (let i = 24; i < Wd - 30; i += 26) c.rect(X + i, Y + Ht / 2 - 1, 14, 2, [244, 244, 230]); for (let k = 0; k < 5; k++) { c.rect(X + 6, Y + 5 + k * ((Ht - 12) / 4), 12, 2, [244, 244, 230]); c.rect(X + Wd - 18, Y + 5 + k * ((Ht - 12) / 4), 12, 2, [244, 244, 230]); } for (let i = 8; i < Wd; i += 32) { c.rect(X + i, Y - 2, 2, 2, [250, 220, 90]); c.rect(X + i, Y + Ht, 2, 2, [250, 220, 90]); } }); }
// A beach parasol (solid, one tile).
function parasol(p, x, y, col) { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const X = x * U + 8, Y = y * U; c.rect(X - 1, Y, 2, 14, [120, 100, 80]); c.rect(X - 7, Y + 11, 14, 4, [250, 250, 240]); top.ellipse(X, Y - 2, 12, 7, col); top.ellipse(X, Y - 2, 5, 7, [250, 250, 244]); top.rect(X - 1, Y - 9, 2, 2, sh(col, 0.6)); }); }
// Vegetable plots: furrowed soil with rows of crops on tiles (x, y, w, h); walkable.
function plots(p, x, y, w, h, crop = [90, 170, 80]) { p.fill("dirt", x, y, x + w - 1, y + h - 1); p.paint(0, (c) => { const X = x * U, Y = y * U; c.box(X, Y, w * U, h * U, [150, 110, 76], [110, 80, 56]); for (let j = 4; j < h * U - 3; j += 8) { c.rect(X + 2, Y + j + 4, w * U - 4, 2, [120, 86, 60]); for (let i = 4; i < w * U - 4; i += 7) { c.rect(X + i, Y + j, 4, 4, crop); c.rect(X + i + 1, Y + j, 2, 2, sh(crop, 1.3)); } } }); }
// A bridge pylon standing on tile (x, y), rising `up` tiles (walked behind).
function pylon(p, x, y, up, col = [170, 80, 60]) { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U; s.box(X + 2, Y, 12, (up + 1) * U, col, sh(col, 0.4)); s.rect(X + 4, Y + 1, 3, (up + 1) * U - 2, sh(col, 1.25)); s.box(X, Y, 16, 6, sh(col, 0.8), sh(col, 0.4)); s.box(X, Y + (up + 1) * U - 6, 16, 6, sh(col, 0.8), sh(col, 0.4)); }); }
// A crenellated stone tower on tiles (x, y, w, h), rising `up` tiles; holes are [x, y] door tiles it arches over.
function turret(p, x, y, w, h, up, col, banner, holes = []) {
  solidBut(p, x, y, w, h, holes);
  p.paint(y + h + 0.6, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U;
    s.rect(X + 3, Y + Ht - 3, Wd, 4, [0, 0, 0, 60]); s.box(X, Y + 6, Wd, Ht - 6, col, sh(col, 0.4)); s.rect(X + 1, Y + 7, 4, Ht - 8, sh(col, 1.12));
    for (let j = Y + 14; j < Y + Ht - 2; j += 8) s.rect(X + 1, j, Wd - 2, 1, sh(col, 0.8));
    for (let i = 0; i + 5 <= Wd; i += 8) s.box(X + i, Y, 6, 8, col, sh(col, 0.4));
    if (banner) { s.box(X + Wd / 2 - 6, Y + 12, 12, 18, banner, sh(banner, 0.5)); s.poly([[X + Wd / 2 - 6, Y + 30], [X + Wd / 2, Y + 36], [X + Wd / 2 + 6, Y + 30]], banner); s.rect(X + Wd / 2 - 2, Y + 16, 4, 4, [250, 240, 200]); }
    for (const [hx, hy] of holes) { const dx = hx * U, dy = hy * U; s.box(dx - 3, dy - 8, 22, 24, sh(col, 0.8), sh(col, 0.4)); s.ellipse(dx + 8, dy + 2, 7, 8, [30, 26, 40]); s.rect(dx + 1, dy + 2, 14, 14, [30, 26, 40]); s.rect(dx + 1, dy + 12, 14, 4, [90, 80, 100]); } });
}
// A tree house: trunk and ladder on tiles (x, y, 3, 2), cabin and crown above (walked behind).
function treeHouse(p, x, y, roof = [150, 100, 70]) {
  p.block(x, y, 3, 2);
  p.paint(y + 2, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U; s.ellipse(X + 26, Y + 30, 22, 5, [0, 0, 0, 60]); s.box(X + 16, Y - 30, 16, 62, [120, 86, 58], [70, 48, 36]); s.rect(X + 19, Y - 28, 3, 58, [150, 110, 76]);
    for (let j = Y - 6; j < Y + 30; j += 5) s.rect(X + 36, j, 8, 2, [170, 130, 90]); s.rect(X + 35, Y - 8, 2, 40, [110, 80, 56]); s.rect(X + 43, Y - 8, 2, 40, [110, 80, 56]);
    for (const [dx, dy, r] of [[24, -62, 26], [4, -50, 18], [44, -50, 18], [24, -80, 18]]) { s.ellipse(X + dx, Y + dy, r, r * 0.75, [40, 110, 60]); s.ellipse(X + dx - 2, Y + dy - 3, r - 4, r * 0.75 - 4, [70, 150, 80]); }
    s.box(X + 2, Y - 14, 46, 6, [170, 130, 90], [90, 64, 44]); s.box(X + 8, Y - 38, 32, 24, [226, 206, 170], [90, 64, 44]); s.poly([[X + 4, Y - 38], [X + 24, Y - 54], [X + 44, Y - 38]], roof); s.box(X + 19, Y - 30, 10, 16, [110, 76, 56], [60, 40, 40]); s.rect(X + 31, Y - 32, 6, 6, [150, 200, 230]); });
}
// A giant hollow tree with its door at tile (dx, dy): trunk on tiles (x, y, w, h), crown above (walked behind).
function hollowTree(p, x, y, w, h, dx, dy) {
  solidBut(p, x, y, w, h, [[dx, dy]]);
  p.paint(dy + 1.6, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U, Wd = w * U, Ht = h * U, cx = X + Wd / 2;
    s.ellipse(cx + 3, Y + Ht - 4, Wd / 2 + 6, 8, [0, 0, 0, 60]); s.poly([[X - 6, Y + Ht], [X + 14, Y - 30], [X + Wd - 14, Y - 30], [X + Wd + 6, Y + Ht]], [96, 70, 50]); s.poly([[X, Y + Ht - 1], [X + 18, Y - 30], [X + Wd - 18, Y - 30], [X + Wd, Y + Ht - 1]], [140, 104, 72]);
    for (let i = X + 16; i < X + Wd - 14; i += 9) s.line(i, Y - 28, i + (i < cx ? -6 : 6), Y + Ht - 4, [110, 80, 56]);
    for (const [ox, oy, r] of [[0, -70, 60], [-52, -50, 36], [52, -50, 36], [-26, -92, 34], [28, -94, 34]]) { s.ellipse(cx + ox, Y + oy, r, r * 0.62, [36, 104, 60]); s.ellipse(cx + ox - 3, Y + oy - 4, r - 6, r * 0.62 - 5, [66, 146, 80]); s.ellipse(cx + ox - 8, Y + oy - 9, r - 18, r * 0.62 - 12, [110, 180, 100]); }
    const px = dx * U, py = dy * U; s.box(px - 6, py - 14, 28, 30, [90, 64, 44], [50, 36, 30]); s.ellipse(px + 8, py + 2, 10, 12, [30, 24, 20]); s.rect(px - 2, py + 2, 20, 14, [30, 24, 20]); s.rect(px - 2, py + 13, 20, 3, [120, 90, 60]); for (const wx of [X + 22, X + Wd - 30]) { s.ellipse(wx + 4, Y + 20, 6, 7, [60, 44, 34]); s.ellipse(wx + 4, Y + 20, 4, 5, [250, 230, 140]); } });
}
// A lighthouse with its door at column `hole` of the bottom row of tiles (x, y, w, h), rising `up` tiles.
function lightTower(p, x, y, w, h, hole, up, stripe = [214, 70, 66], body = [244, 244, 240]) {
  solidBut(p, x, y, w, h, [[x + hole, y + h - 1]]);
  p.paint(y + h + 0.6, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U, cx = X + Wd / 2;
    s.ellipse(cx + 3, Y + Ht - 4, Wd / 2 + 2, 8, [0, 0, 0, 60]); s.box(X, Y + Ht - 26, Wd, 26, [214, 210, 200], [80, 76, 80]); s.rect(X + 1, Y + Ht - 25, Wd - 2, 3, [240, 236, 226]);
    const bands = 6, y0 = Y + 30, y1 = Y + Ht - 26; for (let j = y0; j < y1; j++) { const t = (j - y0) / (y1 - y0), half = 16 + t * (Wd / 2 - 22), band = Math.floor(t * bands) % 2; s.rect(cx - half, j, half * 2, 1, band ? stripe : body); s.rect(cx - half, j, 2, 1, [80, 60, 70]); s.rect(cx + half - 2, j, 2, 1, [80, 60, 70]); s.rect(cx + half - 8, j, 6, 1, band ? sh(stripe, 0.8) : sh(body, 0.85)); }
    s.box(cx - 22, Y + 24, 44, 7, [90, 90, 104], [40, 40, 50]); s.box(cx - 13, Y + 8, 26, 16, [250, 240, 150], [60, 60, 70]); s.rect(cx - 1, Y + 8, 2, 16, [60, 60, 70]); s.poly([[cx - 17, Y + 8], [cx, Y - 6], [cx + 17, Y + 8]], sh(stripe, 0.7)); s.rect(cx - 1, Y - 12, 2, 7, [60, 60, 70]);
    s.poly([[cx + 13, Y + 12], [cx + 70, Y], [cx + 70, Y + 30], [cx + 13, Y + 20]], [255, 250, 190, 70]); s.poly([[cx - 13, Y + 12], [cx - 70, Y], [cx - 70, Y + 30], [cx - 13, Y + 20]], [255, 250, 190, 70]);
    const px = (x + hole) * U; s.box(px - 1, Y + Ht - 20, 18, 20, [70, 90, 130], [40, 40, 60]); s.rect(px + 2, Y + Ht - 17, 12, 5, [150, 200, 230]); });
}
// A windmill: base on tiles (x, y, 2, 2), tower and sails above (walked behind).
function windmill(p, x, y, turn = 0) {
  p.block(x, y, 2, 2);
  p.paint(y + 2, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U, cx = X + 16, hy = Y - 30; s.ellipse(cx + 3, Y + 29, 18, 5, [0, 0, 0, 60]); s.poly([[X + 2, Y + 32], [X + 8, hy - 6], [X + 24, hy - 6], [X + 30, Y + 32]], [120, 100, 90]); s.poly([[X + 4, Y + 31], [X + 10, hy - 4], [X + 22, hy - 4], [X + 28, Y + 31]], [226, 214, 196]); s.poly([[X + 6, hy - 4], [cx, hy - 18], [X + 26, hy - 4]], [150, 70, 64]); s.box(cx - 5, Y + 16, 10, 16, [110, 80, 60], [60, 40, 40]); s.rect(cx - 3, Y - 8, 6, 7, [130, 170, 210]);
    for (let k = 0; k < 4; k++) { const a = turn + k * Math.PI / 2, ex = cx + Math.cos(a) * 38, ey = hy + Math.sin(a) * 38, nx = -Math.sin(a) * 6, ny = Math.cos(a) * 6; s.line(cx, hy, ex, ey, [90, 70, 60], 2); s.poly([[cx + Math.cos(a) * 10, hy + Math.sin(a) * 10], [ex, ey], [ex + nx, ey + ny], [cx + Math.cos(a) * 10 + nx, hy + Math.sin(a) * 10 + ny]], [244, 240, 226]); } s.ellipse(cx, hy, 3, 3, [60, 50, 50]); });
}
// A locomotive or wagon standing on tiles (x, y, w, 1); solid.
function wagon(p, x, y, w, col, loco) { p.block(x, y, w, 1); p.paint(y + 1, (c) => { const X = x * U, Y = y * U, Wd = w * U; c.rect(X + 2, Y + 13, Wd, 3, [0, 0, 0, 70]); c.box(X, Y - 8, Wd, 21, col, sh(col, 0.4)); c.rect(X + 1, Y - 7, Wd - 2, 3, sh(col, 1.3)); for (let i = 6; i + 8 < Wd - (loco ? 20 : 4); i += 12) c.rect(X + i, Y - 2, 8, 5, loco ? [150, 200, 230] : sh(col, 0.75)); if (loco) { c.box(X + Wd - 18, Y - 14, 16, 26, sh(col, 0.85), sh(col, 0.4)); c.rect(X + Wd - 15, Y - 11, 10, 6, [150, 200, 230]); c.rect(X + Wd - 2, Y + 4, 3, 6, [250, 230, 120]); } for (let i = 5; i < Wd - 4; i += 11) c.ellipse(X + i + 2, Y + 13, 3, 3, [40, 40, 46]); }); }
/*HELPERS-END*/
module.exports = {
  // Aspertia: the hill city. The gate to Route 19 is at the top, the long avenue runs down past the Trainers' School
  // and the Pokémon Center to the homes in the south, and the lookout terrace with its stairway stands in the north-west.
  UnovaAspertiaCity: {
    theme: { town: true, ground: "lawn", road: "paving", border: "tree", density: 0.1, groves: 0, flowers: 0.12, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("paving", 3, [[24, 6], [24, 60]]);                                  // the avenue
      p.street("paving", 3, [[3, 34], [44, 34]]);                                  // School - Center cross street
      p.street("paving", 2, [[7, 35], [7, 60]]); p.street("paving", 2, [[7, 52], [11, 52]]); p.street("paving", 2, [[7, 59], [12, 59]]); p.street("paving", 2, [[7, 59], [24, 59]]);
      p.street("paving", 2, [[17, 46], [17, 47], [24, 47]]);
      p.street("paving", 2, [[24, 20], [41, 20]]); p.street("paving", 2, [[40, 19], [40, 20]]);
      // The lookout: a raised terrace, railed on its outer sides, with the stairway down to the avenue.
      p.fill("paving", 4, 4, 19, 14);
      rail(p, 3, 3, 18, 1); rail(p, 3, 4, 1, 11);
      wall(p, 3, 15, 11, 2); wall(p, 17, 15, 4, 2); wall(p, 20, 3, 1, 12);
      stairs(p, 14, 15, 3, 6);
      p.street("paving", 3, [[15, 22], [24, 22]]);
      p.decor("bench", 6, 5); p.decor("bench", 17, 5);
      // Reference (pokewiki S2W2 render): six homes only - flat green-roofed blocks and blue-roofed houses - the
      // orange-roofed School, the player's teal-roofed home in the south, and thick forest closing in on every side.
      p.building(1, "academy", { tint: p.roof(1.6, 0.9, 0.5) }); p.building(3, "centerRed"); p.building(0, "gable", { tint: p.roof(0.5, 1.3, 1.3) }); p.building(6, "flat"); p.building(5, "gable", { tint: p.roof(0.6, 0.9, 1.7) }); p.building(7, "flat");
      p.decor("gable", 28, 24, { tint: p.roof(0.6, 0.9, 1.7) }); p.decor("flat", 30, 39);
      for (const [x0, y0, x1, y1] of [[27, 3, 45, 11], [44, 12, 45, 50], [29, 47, 31, 61], [36, 54, 41, 57], [3, 38, 5, 61], [3, 17, 12, 21]]) p.fill("tree", x0, y0, x1, y1);
      p.fill("flowersRed", 27, 37, 29, 38); p.fill("flowersBlue", 19, 37, 21, 38);
    },
  },
  // Floccesy: the little hill town. One street runs from Route 19 to Route 20, the clock tower stands on the round
  // square in the middle with Alder's house above it, the path to Pledge Grove leaves in the north-west, the pond lies east.
  UnovaFloccesyTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.14, groves: 0, flowers: 0.25, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      // Reference (pokewiki S2W2 render): dark asphalt streets crossing in the town, an earth path only up to
      // Alder's yard and Pledge Grove; the stone clock tower has a purple roof and stands on a brick-edged lawn;
      // every roof is orange, and besides Alder's house there are just two barns and two homes.
      p.street("asphalt", 3, [[3, 25], [41, 25]]); p.street("asphalt", 2, [[3, 26], [5, 26]]); p.street("asphalt", 2, [[39, 26], [41, 26]]);
      p.street("dirt", 2, [[7, 5], [7, 24]]);                                       // to Pledge Grove
      p.street("dirt", 2, [[20, 12], [20, 14]]); p.street("asphalt", 3, [[21, 23], [21, 24]]);
      p.fill("brick", 17, 15, 26, 23); p.fill("lawn", 18, 16, 25, 21);
      clockTower(p, 20, 18, 5, [206, 200, 190], [120, 90, 160]);
      p.street("asphalt", 2, [[30, 27], [30, 40]]); p.street("asphalt", 2, [[30, 36], [35, 36]]); p.street("asphalt", 2, [[27, 39], [30, 39]]);
      const orange = p.roof(1.6, 0.9, 0.5);
      p.building(1, "logHouse"); p.building(3, "pcSmall"); p.building(6, "gable", { tint: orange }); p.building(5, "gable", { tint: orange });
      p.decor("gable", 10, 8, { tint: orange }); p.decor("gable", 14, 8, { tint: orange });
      // Alder's training yard beside his house.
      p.fill("sand", 25, 8, 29, 12); rail(p, 25, 7, 5, 1, [170, 130, 90]);
      p.fill("flowersRed", 16, 17, 16, 21); p.fill("flowersPink", 27, 22, 28, 22); p.fill("flowersBlue", 39, 5, 42, 14);
      p.decor("bench", 25, 21); p.decor("bench", 17, 22);
    },
  },
  // Virbank: the grimy harbour city. Asphalt streets cross at the middle; the Gym club is in the west, the Center in
  // the east, tank farms and pipes fill the corners, tankers lie in the dock and the barred Complex gate is in the south.
  UnovaVirbankCity: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "rock", water: "sea", density: 0.04, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      // Reference (pokewiki render): the open sea lies along the east side, still green canal basins with big pipes
      // sit between the streets, the sheds have blue roofs and the houses dark purple ones, woods close the north.
      p.fill("tree", 2, 2, 8, 2); p.fill("tree", 12, 2, 25, 2); p.fill("tree", 31, 2, 47, 2);
      p.fill("water", 49, 2, 53, 22);                                               // the sea
      p.fill("water", 5, 29, 13, 35); p.fill("water", 16, 36, 25, 39);              // canal basins
      p.street("asphalt", 3, [[4, 25], [52, 25]]); p.street("asphalt", 3, [[28, 4], [28, 49]]);
      p.street("asphalt", 2, [[12, 19], [12, 24]]); p.street("asphalt", 2, [[42, 17], [42, 24]]); p.street("asphalt", 2, [[28, 12], [32, 12]]);
      p.street("asphalt", 2, [[6, 49], [34, 49]]); p.street("asphalt", 2, [[9, 47], [9, 48]]); p.street("asphalt", 2, [[21, 47], [21, 48]]);
      p.street("brick", 2, [[36, 27], [36, 49]]); p.street("brick", 2, [[36, 31], [52, 31]]); p.street("brick", 2, [[51, 31], [51, 49]]); p.street("brick", 2, [[36, 48], [52, 48]]);   // the quays round the dock
      const purple = p.roof(0.75, 0.6, 1.25), SHED = { style: "ware", roof: [62, 110, 196], wall: [190, 190, 196] };
      p.building(1, "gym"); p.building(3, "centerRed"); p.building(5, "gable", { tint: purple }); p.building(6, "gable", { tint: purple }); p.building(8, "gable", { tint: purple }); p.building(7, "gable", { tint: purple });
      // Tank farm and pipes.
      tank(p, 4, 6, 3, 4); tank(p, 8, 6, 3, 4, [214, 196, 150]); pipe(p, 4, 11, 9, 1); pipe(p, 4, 12, 1, 8);
      pipe(p, 9, 28, 1, 8, [196, 200, 170]); pipe(p, 16, 37, 10, 1, [196, 200, 170]);   // the pipes that cross the basins
      bld(p, 15, 5, 9, 5, SHED); bld(p, 35, 4, 8, 4, SHED); bld(p, 15, 29, 9, 5, SHED);
      bld(p, 30, 34, 4, 5, { style: "flat", roof: [70, 70, 84], wall: [150, 150, 160] });
      p.decor("apartment", 18, 16); p.decor("apartment", 22, 16); p.decor("apartment", 34, 16);
      ship(p, 49, 9, 5, 3, [226, 214, 170], [236, 236, 240]);                       // the ferry off the east quay
      // The dock: tankers, containers on the quay.
      ship(p, 39, 34, 11, 4, [176, 60, 56]); ship(p, 43, 40, 7, 3, [60, 90, 150]); ship(p, 39, 44, 10, 3, [70, 70, 80], [230, 200, 90]);
      crate(p, 31, 41, 2, [200, 80, 60]); crate(p, 33, 41, 2, [70, 120, 190]); crate(p, 31, 28, 2, [230, 190, 70]); crate(p, 33, 28, 2, [90, 160, 110]); crate(p, 39, 29, 2, [70, 120, 190]); crate(p, 42, 29, 2, [200, 80, 60]); crate(p, 46, 29, 2, [230, 190, 70]);
      // The Virbank Complex gate: striped posts and a beam over the road.
      p.block(25, 48, 2, 1); p.block(28, 48, 2, 1);
      p.paint(49, (c, top) => { for (const x of [25, 28]) { const X = x * U, Y = 48 * U; c.box(X, Y - 10, 32, 26, [70, 74, 86], [30, 30, 40]); for (let i = 0; i < 32; i += 8) c.poly([[X + i, Y + 14], [X + i + 4, Y + 14], [X + i + 8, Y + 6], [X + i + 4, Y + 6]], [240, 200, 60]); } top.box(25 * U, 46 * U + 2, 80, 12, [90, 96, 110], [30, 30, 40]); top.rect(25 * U + 4, 46 * U + 5, 72, 3, [240, 200, 60]); });
    },
  },
  // Pokéstar Studios: the red carpet from the gate to the star plaza, the theatre on the left, the studio on the
  // right and the big sound stages around them.
  UnovaPokestarStudios: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", density: 0.05, groves: 0, flowers: 0.1, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      // Reference (pokewiki render): a grey cross avenue with gold carpet strips meets at a round planter with a
      // palm; red carpet runs in from the south gate; the south-west lot is brick with blue sheds and trailers, the
      // south-east a cream plaza with the big fountain; a cliff closes the north and the sea lies along the east.
      // (The game has the theatre north-east and the studio north-west; our doors have them the other way round.)
      p.fill("rock", 2, 2, 22, 3); p.fill("rock", 2, 2, 37, 2); p.fill("water", 36, 8, 37, 15); p.fill("water", 36, 20, 37, 27);
      p.fill("brick", 3, 22, 17, 31); p.fill("cobble", 24, 22, 35, 31);
      p.street("asphalt", 4, [[20, 6], [20, 32]]); p.street("asphalt", 3, [[3, 20], [34, 20]]);
      p.street("cobble", 2, [[9, 18], [9, 19]]); p.street("cobble", 2, [[28, 13], [28, 19]]);
      p.paint(0, (c) => { c.ellipse(20.5 * U + 8, 20 * U + 8, 58, 52, [120, 124, 136]); c.ellipse(20.5 * U + 8, 20 * U + 8, 52, 46, [236, 190, 80]); c.ellipse(20.5 * U + 8, 20 * U + 8, 44, 38, [110, 150, 200]); c.ellipse(20.5 * U + 8, 20 * U + 8, 34, 28, [110, 190, 120]); });
      for (const [x, y, w, h] of [[5, 20, 11, 1], [25, 20, 10, 1], [20, 8, 2, 8]]) decal(p, x, y, w, h, [236, 190, 80], [150, 110, 160]);
      decal(p, 19, 24, 3, 9, [190, 40, 50], [240, 200, 80]);                        // the red carpet
      p.block(20, 20, 2, 1);
      p.paint(21, (c, top) => { const X = 21 * U, Y = 21 * U - 4; c.rect(X - 2, Y - 14, 4, 14, [150, 110, 70]); top.rect(X - 2, Y - 30, 4, 18, [150, 110, 70]); for (const [dx, dy] of [[-16, -4], [16, -4], [-12, -14], [12, -14], [0, -18], [-18, 4], [18, 4]]) { top.line(X, Y - 30, X + dx, Y - 30 + dy, [40, 120, 60], 4); top.line(X, Y - 31, X + dx, Y - 31 + dy, [80, 170, 90], 2); } });
      p.building(1, "hall"); p.building(2, "studio");
      const SHED = { style: "ware", roof: [62, 110, 196], wall: [214, 214, 220] };
      bld(p, 3, 23, 5, 3, SHED); bld(p, 3, 27, 5, 3, SHED);
      bld(p, 10, 24, 5, 2, { style: "flat", roof: [226, 226, 214], wall: [200, 200, 190], wallH: 14 }); bld(p, 10, 28, 5, 2, { style: "flat", roof: [226, 226, 214], wall: [200, 200, 190], wallH: 14 });
      bld(p, 13, 5, 5, 5, { style: "glass", roof: [90, 200, 90], wall: [70, 170, 80], win: [120, 220, 120] });   // the green-screen stage
      p.decor("parkFountain", 25, 24);
      p.fill("tree", 3, 32, 16, 33); p.fill("tree", 24, 32, 35, 33);
    },
  },
  // Nimbasa: the city of leisure. Gear Station's round terminal sits in the middle of the south side, the Big Stadium
  // and Small Court in the north-west, the Musical Theater in the north-east, and the avenue east leads to the park.
  UnovaNimbasaCity: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", density: 0.03, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      // Reference (pokewiki S2W2 render): the city is an island of paving ringed by water - the avenue to the park
      // crosses it as a bridge - with only grey apartment blocks for homes and no towers or fountain park.
      p.fill("water", 44, 14, 51, 23); p.fill("water", 44, 29, 51, 47); p.fill("water", 31, 46, 43, 47); p.fill("water", 2, 46, 23, 47);
      p.street("cobble", 3, [[3, 26], [48, 26]]);                                   // Route 5 gate - amusement park
      p.street("cobble", 3, [[28, 13], [28, 27]]); p.street("cobble", 3, [[28, 36], [28, 44]]);
      p.street("cobble", 2, [[5, 12], [45, 12]]); p.street("cobble", 2, [[17, 13], [17, 25]]); p.street("cobble", 2, [[33, 4], [33, 25]]); p.street("cobble", 2, [[33, 4], [40, 4]]); p.street("cobble", 1, [[40, 3], [40, 4]]);
      p.street("cobble", 2, [[17, 36], [36, 36]]); p.street("cobble", 2, [[4, 28], [4, 42]]); p.street("cobble", 2, [[4, 36], [8, 36]]); p.street("cobble", 2, [[4, 42], [28, 42]]); p.street("cobble", 2, [[35, 28], [35, 36]]);
      p.disc("ornate", 28.5, 38.5, 3.4, 2.6);
      stadium(p, 3, 6, 11, 6, 5, [70, 120, 200]); stadium(p, 16, 6, 9, 6, 4, [220, 120, 60], [200, 150, 100]);
      // The Musical Theater: pink walls, a purple hall roof and a marquee.
      bld(p, 37, 6, 10, 6, { hole: 4, roof: [150, 90, 170], wall: [250, 214, 226], style: "flat", sign: [250, 220, 90], doorCol: [120, 50, 90], win: [250, 240, 180] });
      p.paint(13, (c) => { for (let k = 0; k < 9; k++) c.rect(37 * U + 10 + k * 16, 6 * U + 8, 6, 6, [[250, 110, 150], [250, 220, 90], [110, 200, 250]][k % 3]); });
      gearStation(p, 23, 28, 11, 7, 5);
      const slate = p.roof(0.75, 0.85, 1.05), hedgeRow = (x0, y, x1) => { for (let x = x0; x <= x1; x++) p.decor("hedge", x, y); };
      p.building(1, "pcSmall"); p.building(5, "gable", { tint: slate }); p.building(10, "gable", { tint: slate }); p.building(12, "gable", { tint: slate }); p.building(11, "flat");
      p.fill("lawn", 37, 15, 42, 23); hedgeRow(37, 15, 42); hedgeRow(37, 23, 42);
      p.decor("apartment", 30, 15); p.decor("apartment", 23, 15); p.decor("apartment", 6, 16); p.decor("apartment", 10, 16); p.decor("apartment", 39, 38);
      p.fill("lawn", 6, 28, 12, 29); p.fill("flowersRed", 20, 38, 24, 40); p.fill("flowersBlue", 31, 38, 33, 40);
      // The park gate: a striped arch over the avenue's east end.
      p.paint(27, (c, top) => { for (const y of [24, 28]) c.box(47 * U + 2, y * U - 8, 12, 24, [250, 110, 150], [120, 50, 80]); top.box(47 * U, 22 * U, 16, 10, [250, 220, 90], [120, 90, 40]); top.rect(47 * U + 6, 22 * U + 10, 4, 18, [250, 110, 150]); }); p.block(47, 24, 1, 1); p.block(47, 28, 1, 1);
    },
  },
  // Nimbasa's amusement park: the promenade from the city, the Ferris wheel at the far end, the Gym's catwalk hall
  // in the north-west, the roller coaster in the south-west, and stalls, tents and flower beds between.
  UnovaNimbasaPark: {
    // Reference (pokewiki S2W2 render, east half of the Nimbasa picture): the park is lawn, not paving, with one
    // pale paved promenade, hedges and trees, and water along its north and south sides.
    theme: { town: true, ground: "lawn", road: "paving", border: "tree", density: 0.05, groves: 0, flowers: 0.05, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 2, 2, 39, 3); p.fill("water", 14, 37, 39, 37);
      p.street("paving", 3, [[4, 22], [26, 22]]); p.street("paving", 3, [[24, 22], [24, 28], [37, 28]]);
      p.street("paving", 2, [[9, 12], [9, 28]]); p.street("paving", 2, [[3, 23], [3, 34]]); p.street("paving", 2, [[3, 34], [10, 34]]); p.street("paving", 1, [[10, 33], [10, 34]]);
      p.street("paving", 2, [[37, 19], [37, 28]]);
      ferris(p, 28, 23, 7, 104);
      p.building(2, "gym");
      // The roller coaster: station house with the looping track beside it.
      bld(p, 6, 29, 9, 4, { hole: 4, style: "ware", roof: [230, 190, 70], wall: [240, 226, 230], doorCol: [60, 60, 90], sign: [250, 110, 150] });
      p.block(16, 30, 7, 4);
      p.paint(34, (c, top) => { const X = 15 * U, Y = 34 * U, s = pen(c, top, 30 * U); for (let i = 0; i < 8; i++) s.line(X + 8 + i * 16, Y - 2, X + 8 + i * 16, Y - 30 - Math.sin(i * 0.9) * 22, [200, 204, 214], 2); for (let i = 0; i < 124; i++) { const yy = Y - 32 - Math.sin(i / 124 * 6.3) * 24; s.rect(X + 4 + i, yy, 2, 4, [226, 80, 110]); s.rect(X + 4 + i, yy + 4, 2, 1, [120, 40, 60]); } s.ellipse(X + 64, Y - 62, 22, 22, [226, 80, 110], 4); for (let k = 0; k < 3; k++) s.box(X + 20 + k * 11, Y - 70, 10, 8, [[110, 180, 250], [250, 220, 90], [130, 220, 140]][k], [50, 50, 70]); });
      // Carousel tent, stalls and beds.
      p.block(15, 13, 5, 4); p.paint(17, (c, top) => { const X = 15 * U, Y = 13 * U, s = pen(c, top, 13 * U); s.ellipse(X + 40, Y + 52, 40, 10, [0, 0, 0, 60]); s.box(X + 4, Y + 24, 72, 34, [250, 240, 220], [120, 90, 60]); for (let i = 0; i < 6; i++) s.rect(X + 8 + i * 12, Y + 26, 4, 30, [226, 80, 110]); for (let i = 0; i < 6; i++) s.poly([[X + i * 13.3, Y + 26], [X + (i + 1) * 13.3, Y + 26], [X + 40, Y - 14]], i % 2 ? [250, 240, 220] : [226, 80, 110]); s.box(X + 38, Y - 22, 4, 10, [250, 220, 90], [120, 90, 40]); });
      for (const [x, y, k] of [[13, 20, 0], [16, 20, 1], [19, 20, 2], [13, 24, 3], [16, 24, 0], [19, 24, 1], [27, 30, 2], [33, 30, 3]]) stall(p, x, y, [[214, 70, 70], [70, 120, 200], [240, 200, 80], [90, 170, 110]][k]);
      p.fill("flowersPink", 22, 7, 37, 7); p.fill("flowersRed", 22, 9, 37, 9); p.fill("flowersBlue", 25, 33, 36, 34);
      p.decor("twinFountain", 22, 14); p.decor("bench", 12, 14); p.decor("bench", 20, 26); p.decor("bench", 35, 21);
    },
  },
  // Driftveil: the trading port. Route 6 comes in from the west and the street runs east onto the drawbridge over
  // the sea; Clay's Gym stands on the rock terrace up the stairs, the market and its stalls are in the south-west,
  // the Cold Storage sheds by the quay, and the gate south leads to the PWT.
  UnovaDriftveilCity: {
    // Reference (pokewiki S2W2 render): pale peach paving with grey stone streets, teal-domed market halls and
    // hotels, woods along the west and north, and the Gym on a green terrace (not bare rock) in the north.
    theme: { town: true, ground: "cobble", road: "paving", border: "tree", water: "sea", density: 0.03, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 38, 2, 41, 31);
      p.fill("tree", 2, 2, 20, 8); p.fill("tree", 2, 9, 3, 14);
      p.street("paving", 2, [[3, 18], [36, 18]]); p.street("paving", 1, [[3, 16], [3, 18]]);
      p.street("deck", 3, [[36, 16], [41, 16]]); p.street("paving", 2, [[35, 16], [35, 18]]);
      pylon(p, 38, 14, 3); pylon(p, 38, 18, 3); p.paint(19, (c, top) => { top.line(38 * U + 8, 11 * U + 2, 42 * U, 14 * U, [90, 60, 50], 2); top.line(38 * U + 8, 15 * U + 2, 42 * U, 18 * U, [90, 60, 50], 2); });
      p.street("paving", 2, [[21, 19], [21, 36]]);
      p.street("paving", 2, [[6, 33], [31, 33]]); p.street("paving", 2, [[31, 33], [31, 36], [35, 36]]);
      p.street("brick", 2, [[36, 20], [36, 31]]);                                  // the quay
      // The Gym terrace.
      p.fill("lawn", 23, 3, 35, 11); p.fill("rock", 22, 3, 22, 13); p.fill("rock", 22, 12, 25, 13); p.fill("rock", 29, 12, 36, 13); p.fill("rock", 36, 3, 37, 13);
      stairs(p, 26, 11, 3, 4, [196, 170, 130]); p.street("paving", 2, [[27, 15], [27, 17]]);
      const teal = p.roof(0.45, 1.25, 1.15);
      p.building(3, "oreGym"); p.building(0, "pcSmall"); p.building(7, "mart"); p.building(8, "gable", { tint: teal }); p.building(11, "gable", { tint: teal }); p.building(9, "gable", { tint: teal }); p.building(10, "gable", { tint: teal }); p.building(2, "flat");
      for (let k = 0; k < 6; k++) stall(p, 6 + k * 2, 36, [[214, 70, 70], [70, 120, 200], [240, 200, 80], [90, 170, 110]][k % 4]);
      // Cold Storage sheds and the hotels.
      bld(p, 31, 20, 5, 4, { style: "ware", roof: [60, 150, 150], wall: [226, 236, 244] }); bld(p, 24, 21, 5, 4, { style: "ware", roof: [60, 150, 150], wall: [226, 236, 244] });
      crate(p, 33, 25, 2, [70, 120, 190]); crate(p, 26, 26, 2, [200, 80, 60]);
      ship(p, 38, 21, 4, 3, [176, 60, 56]); ship(p, 38, 26, 4, 3, [60, 90, 150]); ship(p, 38, 5, 4, 3, [240, 240, 244], [200, 80, 60]);
    },
  },
  // The Pokémon World Tournament: the domed arena at the top of the stall-lined walk from Driftveil, the quay where
  // the black frigate lies in the south-east, and the Relic Passage mouths in the western rock.
  UnovaPWT: {
    // Reference (pokewiki S2W2 render): a slate-blue plaza standing in the open sea with pale walkways, the brown
    // rock of the Relic Passage on its west side and the fountain east of the dome; no lawns.
    theme: { town: true, ground: "darkpave", road: "paving", border: "rock", water: "sea", density: 0.02, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 27, 27, 39, 31); p.fill("water", 2, 2, 39, 2); p.fill("water", 2, 3, 9, 15); p.fill("water", 38, 3, 39, 21); p.fill("water", 32, 3, 37, 3);
      p.street("paving", 4, [[21, 10], [21, 28]]); p.street("paving", 1, [[21, 28], [21, 30]]); p.disc("paving", 21.5, 13.5, 6.5, 3.4);
      p.street("brick", 2, [[5, 24], [39, 24]]); p.street("brick", 2, [[5, 30], [20, 30]]);
      p.fill("rock", 2, 17, 8, 21); p.fill("rock", 2, 22, 3, 31); p.fill("rock", 6, 26, 8, 27);
      arena(p, 11, 4, 21, 6, 10, 2);
      for (const y of [16, 19, 21]) for (const [x, k] of [[16, 0], [18, 1], [25, 2], [27, 3]]) if (!(y === 21 && x > 30)) stall(p, x, y, [[214, 70, 70], [70, 120, 200], [240, 200, 80], [90, 170, 110]][(k + y) % 4]);
      // The Plasma Frigate at the quay.
      p.paint(31, (c) => { const X = 28 * U, Y = 27 * U + 4; c.poly([[X, Y + 8], [X + 150, Y + 8], [X + 176, Y + 36], [X + 150, Y + 64], [X, Y + 64]], [30, 30, 44]); c.poly([[X + 4, Y + 12], [X + 148, Y + 12], [X + 170, Y + 36], [X + 148, Y + 60], [X + 4, Y + 60]], [70, 70, 96]); c.box(X + 20, Y + 20, 70, 32, [50, 50, 70], [20, 20, 30]); c.rect(X + 24, Y + 24, 62, 4, [120, 200, 230]); c.box(X + 100, Y + 26, 30, 20, [90, 90, 120], [20, 20, 30]); for (const mx of [40, 76, 116]) { c.rect(X + mx, Y - 14, 3, 40, [40, 40, 56]); c.poly([[X + mx + 3, Y - 12], [X + mx + 26, Y + 2], [X + mx + 3, Y + 14]], [150, 190, 230]); } });
      p.decor("bench", 14, 12); p.decor("bench", 28, 12);
      p.disc("paving", 34, 9.5, 3.2, 2.6); p.decor("twinFountain", 32, 8);
    },
  },
  // Mistralton: the cargo airfield. Reference (pokewiki S2 render): the runway runs north-south down the west side
  // with the Gym hangar at its head, a row of greenhouses along the far west and more glass houses to the south, the
  // blue control tower and a parking apron on its east side; the little town east of it has red-roofed houses on
  // earth paths. Route 7 is north, Chargestone Cave south. (In the game the Center stands in the town, not by the strip.)
  UnovaMistraltonCity: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.1, groves: 0.05, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("runway", 6, 10, 11, 25);
      p.paint(0, (c) => { const X = 6 * U, Y = 10 * U, Wd = 6 * U, Ht = 16 * U; c.rect(X + 2, Y, 1, Ht, [236, 236, 220]); c.rect(X + Wd - 3, Y, 1, Ht, [236, 236, 220]); for (let j = 28; j < Ht - 30; j += 22) c.rect(X + Wd / 2 - 1, Y + j, 3, 12, [244, 240, 210]); for (const j of [6, Ht - 22]) for (let i = 10; i < Wd - 10; i += 9) c.rect(X + i, Y + j, 4, 16, [236, 236, 220]); });
      p.fill("asphalt", 12, 19, 19, 22); p.street("runway", 1, [[8, 10], [8, 20], [12, 20]]); p.street("asphalt", 2, [[12, 21], [20, 21]]); plane(p, 13, 19, 6);   // the apron
      p.street("dirt", 2, [[21, 3], [21, 36]]); p.street("dirt", 2, [[20, 20], [36, 20]]); p.street("dirt", 2, [[35, 20], [35, 28]]);
      p.street("dirt", 2, [[21, 11], [31, 11]]); p.street("dirt", 1, [[29, 18], [29, 19]]); p.street("dirt", 2, [[15, 17], [20, 17]]);
      p.street("paving", 2, [[5, 32], [21, 32]]); p.street("dirt", 2, [[26, 32], [26, 37]]); p.street("dirt", 1, [[21, 37], [26, 37]]); p.street("dirt", 2, [[21, 32], [37, 32]]);
      p.fill("rock", 17, 34, 24, 35); p.fill("rock", 38, 4, 41, 18);
      const red = p.roof(1.35, 0.5, 0.6);
      p.building(3, "gym"); p.building(0, "pcSmall"); p.building(5, "gable", { tint: red }); p.building(6, "gable", { tint: red }); p.building(7, "gable", { tint: red });
      clockTower(p, 13, 9, 4, [90, 130, 170], [60, 100, 150], false);
      const GH = { style: "flat", roof: [170, 220, 226], wall: [226, 240, 240], win: [200, 240, 240], wallH: 12 };
      for (const y of [11, 15, 19]) bld(p, 2, y, 3, 3, GH);
      bld(p, 2, 23, 3, 3, GH); bld(p, 12, 26, 4, 3, GH); bld(p, 17, 26, 3, 3, GH); bld(p, 28, 34, 4, 3, GH); bld(p, 33, 34, 4, 3, GH);
      plots(p, 27, 23, 6, 3); plots(p, 28, 28, 6, 3, [214, 80, 80]);
      p.fill("water", 31, 13, 33, 15);                                                // the pond in the town
      p.fill("tree", 23, 4, 28, 8); p.fill("tree", 24, 13, 27, 17);
    },
  },
  // Lentimas: the dry red town under Reversal Mountain. Reference (pokewiki render): red-orange earth walled in by
  // mesa cliffs; the grey dirt airstrip runs north-south down the west half, fenced by rows of dead trees, and only
  // three adobe houses and the Center stand east of it. (The Strange House is outside the town in the game; here
  // its door is on this map, so it keeps its place in the north-west corner.)
  UnovaLentimasTown: {
    theme: { town: true, ground: "clay", road: "dirt", border: "rock", density: 0.06, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const adobe = ([r, g, b]) => [Math.min(255, r * 1.12), g * 0.9, b * 0.72], gloom = ([r, g, b]) => [r * 0.6, g * 0.55, b * 0.75];
      p.fill("gravel", 14, 5, 19, 27); plane(p, 14, 15, 5, [236, 226, 210], [200, 160, 60]);
      p.street("dirt", 2, [[8, 11], [8, 19]]); p.street("dirt", 2, [[8, 19], [13, 19]]); p.street("dirt", 2, [[20, 19], [40, 19]]); p.street("dirt", 2, [[21, 20], [21, 33]]); p.street("dirt", 2, [[9, 33], [26, 33]]);
      p.street("dirt", 1, [[25, 18], [25, 19]]); p.street("dirt", 1, [[9, 32], [9, 33]]);
      p.fill("rock", 31, 2, 41, 8); p.fill("rock", 36, 12, 41, 16); p.fill("rock", 33, 24, 41, 37); p.fill("rock", 2, 35, 18, 37); p.fill("rock", 2, 2, 3, 20);
      p.building(2, "church", { tint: gloom }); p.building(0, "pcSmall"); p.building(3, "flat", { tint: adobe }); p.building(4, "flat", { tint: adobe });
      bld(p, 27, 23, 5, 4, { style: "flat", wall: [222, 150, 100], roof: [206, 110, 70], win: [90, 70, 70] });
      // Dead trees fencing the strip, wind sock at its foot.
      const dead = []; for (let y = 5; y <= 26; y += 3) { dead.push([13, y]); dead.push([20, y + 1]); } for (let x = 13; x <= 20; x += 2) dead.push([x, 29]);
      for (const [x, y] of dead) { if (p.people.some((q) => Math.abs(q.x - x) + Math.abs(q.y - y) < 2) || (y >= 18 && y <= 21)) continue; p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const X = x * U + 8, Y = y * U + 14; top.line(X, Y - 14, X - 7, Y - 26, [110, 70, 60], 2); top.line(X, Y - 16, X + 8, Y - 28, [110, 70, 60], 2); top.line(X, Y - 10, X, Y - 30, [110, 70, 60], 2); c.line(X, Y, X, Y - 14, [110, 70, 60], 3); }); }
      p.block(21, 4, 1, 1); p.paint(5, (c, top) => { top.rect(21 * U + 7, 3 * U, 2, 16, [120, 120, 130]); c.rect(21 * U + 7, 4 * U, 2, 14, [120, 120, 130]); top.poly([[21 * U + 9, 3 * U], [21 * U + 24, 3 * U + 3], [21 * U + 9, 3 * U + 8]], [230, 120, 50]); });
    },
  },
  // Undella: the summer resort. Cliffs and caves in the west, white villas on the sand, the boardwalk east to the bay
  // and parasols along the beach; the Marine Tube gate is in the north-east.
  UnovaUndellaTown: {
    theme: { town: true, ground: "beach", road: "paving", border: "palms", water: "sea", density: 0.02, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      // Reference (pokewiki S2W2 render): the sea fills the whole south-east below the villa promenade, and the
      // villas are all cream-walled with pale teal glass roofs (no red, orange or blue ones).
      p.fill("water", 34, 2, 41, 13); p.fill("water", 35, 18, 41, 20); p.fill("water", 39, 21, 41, 24); p.fill("water", 34, 30, 41, 37); p.fill("water", 24, 35, 33, 37);
      p.fill("rock", 2, 8, 7, 17); p.fill("rock", 2, 31, 6, 34);
      p.street("paving", 2, [[21, 3], [21, 36]]); p.street("paving", 2, [[4, 19], [30, 19]]); p.street("paving", 2, [[30, 9], [30, 26]]);
      p.street("deck", 2, [[30, 25], [40, 25]]); p.street("deck", 1, [[40, 26], [40, 27]]);
      p.street("paving", 2, [[7, 33], [32, 33]]); p.street("paving", 1, [[8, 34], [8, 36], [5, 36]]);
      p.building(0, "pcSmall"); p.building(6, "lab");
      const V = (roof) => ({ style: "flat", wall: [246, 244, 236], roof, win: [120, 190, 230], door: 2 });
      bld(p, 10, 6, 6, 4, V([120, 196, 190])); bld(p, 10, 12, 6, 4, V([150, 206, 200])); bld(p, 13, 23, 6, 4, V([120, 196, 190])); bld(p, 24, 11, 5, 4, V([150, 206, 200])); bld(p, 24, 21, 5, 4, V([120, 196, 190])); bld(p, 14, 28, 6, 4, V([150, 206, 200]));
      for (const [x, y, k] of [[34, 15, 0], [37, 16, 1], [39, 15, 2], [33, 22, 3], [36, 23, 0], [34, 28, 1], [37, 28, 2], [26, 16, 3], [33, 18, 1]]) parasol(p, x, y, [[226, 80, 90], [70, 130, 210], [240, 190, 70], [90, 180, 130]][k]);
      p.fill("lawn", 9, 10, 17, 10); p.fill("flowersRed", 23, 27, 25, 28);
    },
  },
  // Reference (pokewiki S2W2 render): the whole town is pale stone - paved terraces, no lawns or flower beds - with a
  // grey cobbled street on the lowest level and flat-roofed cube houses in cream and pale teal.
  // Lacunosa: the walled town. A stone wall rings it, and two retaining walls split it into three terraces joined by
  // stairways down the middle; Route 12 enters through the west gap, Route 13 through the south one.
  UnovaLacunosaTown: {
    theme: { town: true, ground: "paving", road: "paving", border: "tree", density: 0, groves: 0, flowers: 0, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const PALE = [206, 202, 188];
      p.street("paving", 2, [[7, 12], [36, 12]]); p.street("paving", 2, [[3, 18], [37, 18]]); p.street("paving", 3, [[21, 16], [21, 20]]);
      p.street("darkpave", 3, [[21, 23], [21, 36]]); p.street("darkpave", 2, [[7, 32], [22, 32]]); p.street("darkpave", 1, [[15, 30], [15, 31]]); p.street("darkpave", 2, [[22, 30], [34, 30]]);   // the cobbled lower street
      wall(p, 5, 4, 34, 1, PALE); wall(p, 5, 5, 1, 12, PALE); wall(p, 5, 20, 1, 15, PALE); wall(p, 38, 5, 1, 30, PALE); wall(p, 6, 34, 14, 1, PALE); wall(p, 23, 34, 1, 1, PALE); wall(p, 25, 34, 13, 1, PALE);
      wall(p, 6, 14, 14, 2, PALE); stairs(p, 20, 14, 3, 2); wall(p, 23, 14, 3, 2, PALE); wall(p, 30, 14, 8, 2, PALE);
      wall(p, 6, 21, 14, 2, PALE); stairs(p, 20, 21, 3, 2); wall(p, 23, 21, 15, 2, PALE);
      p.building(0, "pcSmall"); const pale = ([r, g, b]) => [r * 0.6 + 80, g * 0.6 + 95, b * 0.6 + 95], CUBE = { style: "flat", wall: [226, 232, 226], roof: [176, 220, 214], win: [70, 110, 140], wallH: 20 };
      for (const k of [3, 4, 5]) p.building(k, "flat", { tint: pale }); p.building(6, "gable", { tint: pale });
      bld(p, 8, 6, 4, 4, CUBE); bld(p, 33, 6, 4, 4, CUBE); bld(p, 26, 25, 4, 4, CUBE);
      p.decor("bench", 18, 26); p.decor("bench", 24, 26);
    },
  },
  // Village Bridge: the old stone bridge, wide enough to live on. Cottages stand on its deck, the river runs along
  // both sides, and a row of houses lines each bank, with the gates at either end of the bridge.
  UnovaVillageBridge: {
    theme: { town: true, ground: "meadow", road: "sand", border: "tree", density: 0.1, groves: 0, flowers: 0.3, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      // Reference (pokewiki render): the river runs north-south and the bridge spans it east-west, hung from dark
      // timber towers at mid-span; every house has a rounded brown roof. (Our map's two fixed water rows run along
      // the deck instead, so the river is added as a channel crossing under it.)
      p.fill("water", 32, 2, 34, 13); p.fill("water", 32, 23, 34, 33);
      p.fill("cobble", 3, 15, 46, 21);
      p.street("sand", 2, [[4, 9], [45, 9]]); p.street("sand", 2, [[4, 30], [45, 30]]); p.street("sand", 2, [[4, 10], [4, 30]]); p.street("sand", 2, [[44, 10], [44, 30]]);
      p.fill("cobble", 3, 15, 46, 21);
      const roofs = [[150, 100, 60], [166, 110, 64], [140, 92, 56], [166, 110, 64], [150, 100, 60], [140, 92, 56]];
      [[12, 15], [23, 15], [35, 15], [12, 20], [25, 20], [41, 20]].forEach(([x, y], k) => bld(p, x, y, 3, 2, { roof: roofs[k], wall: [236, 226, 204], door: 1, wallH: 14 }));
      // The parapets: stone kerbs along both edges of the deck (drawn only; the river rows already bound it).
      p.paint(0, (c) => { for (const y of [15, 21]) { const Y = y === 15 ? 15 * U : 22 * U - 4; c.rect(7 * U, Y, 36 * U, 4, [150, 146, 140]); c.rect(7 * U, Y, 36 * U, 1, [200, 196, 190]); for (let i = 7 * U; i < 43 * U; i += 12) c.rect(i, Y, 1, 4, [100, 96, 92]); } for (let k = 0; k < 6; k++) c.ellipse(10 * U + k * 6 * U, 22 * U + 8, 20, 9, [40, 60, 90, 120]); });
      const brown = p.roof(1.15, 0.8, 0.5); for (let k = 2; k <= 9; k++) p.building(k, k === 5 || k === 9 ? "flat" : "gable", { tint: brown });
      for (const y of [15, 21]) for (const x of [31, 36]) pylon(p, x, y, 3, [96, 70, 54]);
      p.paint(22, (c, top) => { for (const y of [15, 21]) { const Y = (y - 3) * U + 4; for (let i = 0; i <= 80; i++) { const t = i / 80, yy = Y + Math.sin(t * Math.PI) * 26; top.rect(31 * U + 8 + i, yy, 1, 2, [70, 50, 40]); if (i % 10 === 0) top.rect(31 * U + 8 + i, yy, 1, Y + 44 - yy, [70, 50, 40]); } } });
      p.fill("flowersRed", 10, 4, 14, 5); p.fill("flowersBlue", 30, 4, 34, 5); p.fill("flowersPink", 10, 33, 14, 33); p.fill("flowersRed", 30, 33, 34, 33);
    },
  },
  // Opelucid: the city of two faces. West of the centre line it is the old town of timber houses and earth lanes;
  // east of it, steel plating and glass towers. The Gym stands in the north, on the modern side.
  UnovaOpelucidCity: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.05, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("steel", 22, 2, 41, 37);
      p.street("dirt", 2, [[3, 18], [21, 18]]); p.street("paving", 2, [[22, 18], [40, 18]]);
      p.street("dirt", 1, [[21, 10], [21, 33]]); p.street("paving", 1, [[22, 10], [22, 33]]);
      p.street("dirt", 2, [[6, 10], [21, 10]]); p.street("paving", 2, [[22, 10], [36, 10]]);
      p.street("dirt", 2, [[6, 32], [21, 32]]); p.street("paving", 2, [[22, 32], [38, 32]]);
      p.street("dirt", 1, [[14, 26], [14, 31]]); p.street("paving", 2, [[30, 19], [30, 31]]);
      const blue = p.roof(0.6, 0.9, 1.7);
      p.building(2, "gym"); p.building(0, "pcSmall"); p.building(4, "logHouse"); p.building(7, "peak"); p.building(5, "gable", { tint: blue }); p.building(6, "gable", { tint: blue }); p.building(8, "gable", { tint: blue });
      p.decor("logHouse", 6, 4); p.decor("peak", 8, 12); p.decor("gable", 15, 12, { tint: p.roof(1.4, 1, 0.7) }); p.decor("logHouse", 5, 21); p.decor("peak", 17, 26);
      const G = (lit) => ({ style: "glass", wall: [96, 120, 160], roof: [60, 200, 220], win: [150, 220, 250], lit, glow: [200, 250, 255] });
      bld(p, 36, 4, 4, 4, { ...G(0.3), up: 3 }); bld(p, 36, 22, 4, 4, { ...G(0.25), up: 4 }); bld(p, 24, 24, 5, 4, { ...G(0.3), up: 3 }); bld(p, 33, 26, 5, 3, { ...G(0.2), up: 3 }); bld(p, 24, 34, 6, 3, { ...G(0.2), up: 1 }); bld(p, 35, 12, 4, 4, { ...G(0.3), up: 2 });
      // Light strips on the modern side.
      p.paint(0, (c) => { for (let y = 3; y < 37; y += 4) c.rect(23 * U, y * U + 7, 18 * U, 1, [120, 230, 240, 110]); });
      p.fill("flowersRed", 4, 14, 6, 16); p.fill("field", 4, 34, 12, 36);
    },
  },
  // Humilau: the sea resort. Houses stand out over the shallows on boardwalks, with the Gym among them; the beach
  // and the Center are on the west shore and the Marine Tube gate in the south-west.
  UnovaHumilauCity: {
    theme: { town: true, ground: "beach", road: "deck", border: "palms", water: "sea", density: 0.02, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 10, 2, 41, 16); p.fill("water", 23, 17, 41, 19); p.fill("water", 24, 20, 41, 34);
      p.fill("deck", 24, 26, 40, 28);
      p.street("deck", 2, [[5, 11], [22, 11]]); p.street("deck", 2, [[9, 3], [19, 3]]); p.street("deck", 2, [[18, 3], [18, 11]]); p.street("deck", 2, [[38, 7], [38, 18]]);
      p.street("deck", 1, [[26, 10], [30, 10]]); p.street("deck", 2, [[28, 11], [32, 11]]); p.street("deck", 1, [[34, 11], [39, 11]]);
      p.street("deck", 2, [[21, 18], [39, 18]]); p.street("deck", 2, [[21, 11], [21, 36]]);
      p.street("deck", 2, [[3, 18], [21, 18]]); p.street("deck", 2, [[5, 8], [5, 18]]); p.street("deck", 2, [[6, 33], [22, 33]]); p.street("deck", 2, [[22, 27], [24, 27]]);
      // Reference (pokewiki render): every hut on the boardwalks is thatched brown, and the middle of the island is
      // a lawn ringed by the beach.
      const thatch = p.roof(1.05, 0.8, 0.5);
      p.building(2, "gym"); p.building(0, "pcSmall"); p.building(7, "flat", { tint: thatch }); for (const k of [5, 6, 8, 9]) p.building(k, "gable", { tint: thatch });
      const H = (roof) => ({ roof, wall: [226, 200, 160], door: 1, wallH: 14 });
      bld(p, 28, 26, 3, 2, H([150, 110, 70])); bld(p, 34, 26, 3, 2, H([136, 98, 62])); bld(p, 10, 13, 3, 2, H([150, 110, 70])); bld(p, 30, 13, 3, 2, H([136, 98, 62]));
      p.fill("lawn", 11, 21, 19, 26);
      for (const [x, y, k] of [[13, 29, 2], [16, 29, 3], [8, 26, 1], [18, 15, 0]]) parasol(p, x, y, [[226, 80, 90], [70, 130, 210], [240, 190, 70], [90, 180, 130]][k]);
      // Stilts under the boardwalks: dark posts on the water just below each deck row.
      p.paint(0.5, (c) => { for (const [x0, x1, y] of [[5, 22, 13], [28, 33, 13], [23, 39, 20], [24, 40, 29]]) for (let x = x0; x <= x1; x += 2) c.rect(x * U + 6, y * U, 3, 6, [90, 66, 50]); });
    },
  },
  // The Pokémon League: from Victory Road and the Center the great stairway climbs through the rock to the castle
  // gate; inside, the court with the four towers of the Elite Four and the Champion's stair at the head.
  UnovaPokemonLeague: {
    // Reference (pokewiki, League entrance picture): the yard below the gate is bare yellow earth between rock
    // ledges with one worn path up the middle and the Center beside it - no paving, lawns or hedges.
    theme: { town: true, ground: "sand", road: "dirt", border: "rock", density: 0.04, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const stone = [176, 172, 180];
      p.fill("cobble", 2, 2, 41, 13); p.fill("ornate", 15, 9, 27, 12);
      p.fill("rock", 2, 16, 18, 25); p.fill("rock", 24, 16, 41, 25);
      stairs(p, 19, 14, 5, 12, [214, 208, 196]);
      wall(p, 2, 14, 17, 2, stone); wall(p, 24, 14, 18, 2, stone);
      turret(p, 17, 13, 2, 3, 3, stone, [200, 60, 60]); turret(p, 24, 13, 2, 3, 3, stone, [200, 60, 60]);
      [[8, [130, 90, 170]], [17, [60, 60, 80]], [26, [240, 130, 170]], [35, [220, 130, 60]]].forEach(([x, banner]) => { turret(p, x - 2, 3, 5, 4, 1, stone, banner, [[x, 6]]); p.street("cobble", 1, [[x, 7], [x, 10]]); });
      turret(p, 18, 2, 7, 3, 0, [214, 196, 130], [70, 120, 200], [[21, 4]]);
      stairs(p, 20, 5, 3, 4, [226, 214, 170]);
      p.decor("fountain", 11, 9); p.decor("fountain", 30, 9);
      p.street("dirt", 3, [[21, 26], [21, 32]]); p.street("dirt", 2, [[7, 32], [25, 32]]); p.street("dirt", 2, [[25, 32], [25, 37]]); p.street("dirt", 1, [[21, 37], [25, 37]]);
      p.fill("rock", 17, 34, 24, 35); p.fill("rock", 2, 30, 4, 37); p.fill("rock", 30, 34, 41, 37); p.fill("rock", 38, 26, 41, 33);
      p.building(0, "hearthCenter"); p.building(7, "gable", { tint: p.roof(0.8, 1, 1.6) });
    },
  },
  // Black City: black glass towers under neon. The Black Tower rises at the head of the avenue, lit skyscrapers
  // crowd every block, and coloured light strips run along the streets.
  UnovaBlackCity: {
    theme: { town: true, ground: "darkpave", road: "neon", border: "rock", density: 0, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const K = (lit, glow) => ({ style: "glass", wall: [38, 38, 54], roof: glow, win: [70, 76, 110], lit, glow });
      p.street("neon", 3, [[21, 10], [21, 18]]); p.street("neon", 3, [[5, 18], [38, 18]]); p.street("neon", 2, [[25, 19], [25, 33]]); p.street("neon", 2, [[14, 19], [14, 33]]);
      p.street("neon", 2, [[7, 33], [34, 33]]); p.street("neon", 1, [[21, 34], [21, 35]]); p.street("neon", 1, [[20, 29], [20, 32]]); p.street("neon", 2, [[32, 19], [32, 25]]);
      bld(p, 17, 4, 9, 6, { ...K(0.45, [250, 80, 200]), hole: 4, up: 2 });           // the Black Tower
      bld(p, 30, 27, 5, 5, { ...K(0.35, [80, 230, 250]), hole: 2, up: 1 });
      p.building(0, "centerBlue"); p.building(4, "towerDoor", { tint: ([r, g, b]) => [r * 0.45, g * 0.45, b * 0.6] });
      bld(p, 4, 5, 5, 5, { ...K(0.4, [80, 230, 250]), up: 2 }); bld(p, 10, 7, 5, 5, { ...K(0.3, [250, 220, 90]), up: 4 }); bld(p, 28, 6, 5, 5, { ...K(0.4, [250, 220, 90]), up: 3 }); bld(p, 35, 6, 5, 6, { ...K(0.3, [250, 80, 200]), up: 3 });
      bld(p, 4, 24, 4, 3, { ...K(0.4, [250, 80, 200]), up: 3 }); bld(p, 9, 22, 4, 4, { ...K(0.3, [80, 230, 250]), up: 1 }); bld(p, 27, 21, 4, 4, { ...K(0.35, [250, 220, 90]), up: 1 }); bld(p, 36, 26, 4, 5, { ...K(0.4, [250, 80, 200]), up: 2 }); bld(p, 15, 36, 5, 2, { ...K(0.3, [80, 230, 250]), up: 0 }); bld(p, 27, 35, 6, 3, { ...K(0.3, [250, 220, 90]), up: 0 });
      // Neon strips along the kerbs and signs over the avenue.
      p.paint(0, (c) => { for (const [x, y, w, h, col] of [[5, 17, 34, 0, [250, 80, 200]], [5, 20, 34, 0, [80, 230, 250]], [7, 33, 28, 0, [250, 220, 90]], [7, 35, 28, 0, [250, 80, 200]]]) c.rect(x * U, y * U - 1, w * U, 2, [...col, 200]); for (let y = 10; y < 17; y++) { c.rect(20 * U, y * U + 4, 2, 8, [250, 80, 200, 220]); c.rect(23 * U - 2, y * U + 4, 2, 8, [80, 230, 250, 220]); } });
      for (const [x, y, col] of [[18, 13, [250, 80, 200]], [24, 14, [80, 230, 250]], [11, 16, [250, 220, 90]], [34, 16, [250, 80, 200]]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { c.rect(x * U + 7, y * U, 2, 16, [90, 90, 110]); top.box(x * U - 2, y * U - 14, 20, 14, [20, 20, 30], col); top.rect(x * U + 1, y * U - 10, 14, 2, col); top.rect(x * U + 1, y * U - 6, 9, 2, [250, 250, 250]); }); }
    },
  },
  // White Forest: homes in the trees. The great hollow tree stands at the head of the path, tree houses with ladders
  // are scattered through the wood, and a pond lies in the clearing to the east.
  UnovaWhiteForest: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.3, groves: 0.05, flowers: 0.3, tree: "tree1", autoHouses: false, turn: 3, wander: 1 },
    plan(p) {
      p.disc("water", 31.5, 27, 4.2, 3.2);
      p.street("dirt", 2, [[21, 10], [21, 35]]); p.street("dirt", 2, [[9, 32], [9, 33], [21, 33]]); p.street("dirt", 1, [[14, 31], [14, 33]]);
      p.street("dirt", 2, [[21, 21], [32, 21]]); p.street("dirt", 2, [[9, 17], [21, 17]]);
      hollowTree(p, 18, 6, 7, 4, 21, 9);
      p.building(0, "pcSmall"); p.building(3, "logHouse");
      treeHouse(p, 8, 9, [150, 70, 64]); treeHouse(p, 12, 19, [70, 110, 176]); treeHouse(p, 30, 10); treeHouse(p, 35, 17, [84, 142, 96]); treeHouse(p, 5, 22, [214, 130, 60]); treeHouse(p, 26, 14, [150, 70, 64]); treeHouse(p, 36, 32, [70, 110, 176]); treeHouse(p, 25, 31);
      p.fill("flowersPink", 23, 23, 26, 24); p.fill("flowersBlue", 15, 13, 17, 14); p.fill("flowersRed", 33, 22, 36, 22);
    },
  },
  // Nacrene: the warehouse district turned artists' quarter. Corrugated sheds for houses, the old goods line still
  // laid along the main street with a forgotten wagon on it, and the Museum at the top of the middle street.
  UnovaNacreneCity: {
    theme: { town: true, ground: "cobble", road: "asphalt", border: "tree", density: 0.03, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      // Reference (pokewiki S2W2 render): tan flagstones, one grey asphalt street, every warehouse red brick under a
      // dark charcoal ribbed roof, and the disused goods line along the south edge of town only.
      p.fill("gravel", 2, 36, 41, 36); track(p, 2, 36, 41, 36);
      p.street("asphalt", 2, [[4, 19], [40, 19]]); p.street("asphalt", 2, [[21, 10], [21, 33]]);
      p.street("asphalt", 2, [[12, 11], [21, 11]]); p.street("asphalt", 2, [[21, 12], [33, 12]]);
      p.street("asphalt", 2, [[12, 30], [35, 30]]); p.street("asphalt", 1, [[9, 32], [13, 32]]); p.street("asphalt", 1, [[13, 31], [13, 32]]); p.street("asphalt", 1, [[10, 18], [10, 18]]);
      const DARK = [74, 74, 84], BRICK = [170, 96, 76];
      const Wh = (roof, wall) => ({ style: "ware", roof, wall, hole: 2, doorCol: [70, 60, 60] }), D = (roof, wall) => ({ style: "ware", roof, wall });
      bld(p, 10, 6, 5, 4, Wh(DARK, BRICK)); bld(p, 30, 8, 5, 4, Wh(DARK, BRICK)); bld(p, 8, 14, 5, 4, Wh(DARK, BRICK));
      bld(p, 13, 25, 5, 4, Wh(DARK, BRICK)); bld(p, 23, 25, 5, 4, Wh(DARK, BRICK)); bld(p, 31, 25, 5, 4, Wh(DARK, BRICK));
      p.building(2, "hall"); p.building(0, "pcSmall");
      bld(p, 33, 14, 6, 4, D(DARK, BRICK)); bld(p, 4, 23, 5, 4, D(DARK, BRICK)); bld(p, 15, 14, 4, 4, D(DARK, BRICK)); bld(p, 4, 5, 4, 4, D(DARK, BRICK)); bld(p, 29, 3, 7, 3, D(DARK, BRICK)); bld(p, 24, 14, 3, 4, D(DARK, BRICK));
      wagon(p, 26, 36, 4, [150, 70, 60]); wagon(p, 31, 36, 3, [90, 110, 90]);
      crate(p, 5, 30, 2, [200, 150, 70]); crate(p, 17, 33, 2, [70, 120, 190]); p.decor("barrels", 28, 32); p.decor("barrels", 29, 32); p.decor("barrels", 6, 12);
    },
  },
  // Striaton: the garden city. The hedged garden with its fountain fills the north-west, the restaurant that is the
  // Gym faces it across the street with Fennel's lab and the Trainers' School beside it.
  UnovaStriatonCity: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", density: 0.04, groves: 0, flowers: 0.05, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("cobble", 2, [[4, 19], [40, 19]]); p.street("cobble", 2, [[21, 10], [21, 36]]); p.street("cobble", 2, [[21, 10], [30, 10]]); p.street("cobble", 1, [[32, 17], [32, 18]]);
      p.street("cobble", 2, [[22, 28], [26, 28]]); p.street("cobble", 1, [[28, 26], [32, 26]]); p.street("cobble", 1, [[28, 26], [28, 28]]); p.street("cobble", 2, [[7, 33], [32, 33]]);
      // The garden.
      p.fill("lawn", 5, 5, 19, 16); p.street("cobble", 2, [[12, 6], [12, 18]]); p.street("cobble", 2, [[6, 10], [19, 10]]); p.street("cobble", 1, [[20, 10], [20, 10]]);
      p.disc("cobble", 12.5, 11, 3.6); p.decor("fountain", 11, 9);
      // Reference (pokewiki S2W2 render): the garden's four quarters are ponds, not flower beds; the restaurant has a
      // blue roof; the homes south of the plaza are grey apartment blocks with dark teal roofs.
      for (const [x0, y0, x1, y1] of [[6, 6, 10, 8], [15, 6, 18, 8], [6, 13, 9, 15], [16, 13, 18, 15]]) p.fill("water", x0, y0, x1, y1);
      for (let x = 5; x <= 19; x++) if (x !== 12 && x !== 13) { p.decor("hedge", x, 4); if (x !== 5) p.decor("hedge", x, 17); }
      p.decor("bench", 8, 11); p.decor("bench", 17, 11);
      // The restaurant: striped awning, cream front.
      bld(p, 23, 4, 8, 6, { hole: 4, style: "flat", roof: [70, 110, 176], wall: [246, 238, 214], sign: [200, 60, 60], doorCol: [120, 70, 50], win: [250, 236, 170] });
      p.paint(10.7, (c) => { for (let i = 0; i < 8 * U; i += 8) c.rect(23 * U + i, 7 * U + 4, 4, 6, i % 16 ? [200, 60, 60] : [250, 250, 244]); });
      p.building(0, "pcSmall"); const teal = p.roof(0.45, 0.85, 0.85); p.building(5, "gable", { tint: teal }); p.building(6, "flat"); p.building(7, "flat"); p.building(8, "gable", { tint: teal }); p.building(9, "gable", { tint: teal });
      p.decor("apartment", 13, 22); p.decor("apartment", 17, 22); p.decor("apartment", 5, 22); p.decor("apartment", 36, 28);
      p.fill("tree", 38, 3, 41, 8); p.fill("tree", 2, 22, 3, 37); p.fill("tree", 39, 21, 41, 37);
      p.fill("lawn", 12, 35, 19, 36); p.fill("flowersPink", 13, 35, 18, 35);
    },
  },
  // Accumula: the town on the slopes. A retaining wall and a wide stair split the upper streets from the plaza
  // below, and a walled hilltop with its own steps looks out from the north-east.
  UnovaAccumulaTown: {
    theme: { town: true, ground: "paving", road: "paving", border: "tree", density: 0, groves: 0, flowers: 0, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("paving", 3, [[21, 5], [21, 36]]); p.street("paving", 2, [[13, 18], [37, 18]]); p.street("paving", 1, [[28, 11], [29, 11], [29, 18]]);
      p.street("paving", 2, [[36, 11], [36, 18]]); p.street("paving", 2, [[7, 33], [21, 33]]); p.street("paving", 1, [[14, 30], [14, 32]]);
      wall(p, 2, 20, 18, 2); stairs(p, 20, 20, 3, 2); wall(p, 23, 20, 19, 2);
      // Reference (pokewiki SW render): pale stone paving throughout, only four homes - brown-brick blocks with dark
      // teal roofs - a blue-roofed house up on the walled north-east terrace, a railed lawn terrace with benches in
      // the middle, and thick woods pressing in on the west and south.
      p.fill("lawn", 24, 24, 31, 30); rail(p, 24, 31, 8, 1); p.decor("bench", 26, 26); p.decor("bench", 29, 26);
      p.fill("tree", 2, 6, 9, 17); p.fill("tree", 2, 33, 6, 37); p.fill("tree", 34, 23, 41, 37); p.fill("tree", 24, 34, 33, 37); p.fill("tree", 8, 35, 18, 37);
      // The hilltop.
      p.fill("paving", 33, 2, 41, 8); wall(p, 32, 2, 1, 9); wall(p, 33, 9, 3, 2); wall(p, 38, 9, 4, 2); stairs(p, 36, 9, 2, 2); rail(p, 33, 2, 9, 1);
      const teal = p.roof(0.45, 0.8, 0.85);
      p.building(0, "pcSmall"); for (const k of [3, 4, 5, 6]) p.building(k, "gable", { tint: teal });
      bld(p, 35, 5, 5, 3, { roof: [50, 130, 190], wall: [150, 100, 80], door: 2, wallH: 16 });
    },
  },
  // Nuvema: four buildings and the sea. Route 1 comes down from the north past the lab, the three homes stand along
  // the lane above the shore, and the lookout pier reaches out over the water.
  UnovaNuvemaTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", water: "sea", density: 0.12, groves: 0.08, flowers: 0.04, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("sand", 2, 34, 41, 34); p.fill("water", 2, 35, 41, 37);
      p.street("dirt", 2, [[21, 5], [21, 33]]); p.street("dirt", 2, [[21, 12], [34, 12]]); p.street("dirt", 2, [[7, 32], [35, 32]]);
      p.street("deck", 3, [[21, 34], [21, 36]]); p.street("deck", 2, [[18, 36], [24, 36]]);
      p.paint(38, (c) => { for (const x of [17, 25]) c.box(x * U + (x === 17 ? 12 : 0), 36 * U - 4, 4, 34, [236, 236, 240], [120, 120, 130]); c.rect(17 * U + 12, 38 * U - 6, 8 * U - 8, 3, [236, 236, 240]); for (let i = 18 * U; i < 25 * U; i += 8) c.rect(i, 38 * U - 10, 2, 8, [236, 236, 240]); });
      // Reference (pokewiki SW render): the lab has an orange roof and all three homes bright blue ones; plain grass
      // with hardly a flower, woods down both sides, and a white railing along the whole sea front.
      const blue = p.roof(0.35, 0.85, 1.9);
      p.building(1, "lab", { tint: p.roof(1.6, 0.9, 0.5) }); for (const k of [2, 3, 4, 5]) p.building(k, "gable", { tint: blue });
      rail(p, 3, 34, 15, 1); rail(p, 25, 34, 16, 1);
      p.fill("tree", 2, 2, 4, 30); p.fill("tree", 38, 2, 41, 30);
      p.decor("bench", 19, 33); p.decor("bench", 24, 33);
    },
  },
  // Icirrus: the windmill town on the frozen moor. Bog pools lie between the streets, three windmills turn above
  // the cabins, Twist Mountain's caves open in the west and Dragonspiral Tower's path leaves to the north.
  UnovaIcirrusCity: {
    theme: { town: true, ground: "frost", road: "frostpath", border: "pine", water: "bog", density: 0.06, groves: 0, flowers: 0, tree: "tree1", treeTint: "frost", autoHouses: false, turn: 6, wander: 0, center: ["snowCenter"] },
    plan(p) {
      for (const [x, y, r, ry] of [[13.5, 24.5, 2.6, 1.8], [17, 29, 1.8, 1.4], [34, 23.5, 2.4, 1.6], [13, 36, 2.5, 1.2], [36, 14, 2.2, 1.5], [26, 30.5, 2.2, 1.3], [11, 5, 1.8, 1.2]]) p.disc("water", x, y, r, ry);
      p.street("frostpath", 2, [[4, 19], [40, 19]]); p.street("frostpath", 2, [[21, 5], [21, 34]]);
      p.street("frostpath", 2, [[21, 11], [32, 11]]); p.street("frostpath", 2, [[15, 12], [21, 12]]);
      p.street("frostpath", 1, [[5, 8], [9, 8]]); p.street("frostpath", 2, [[9, 8], [9, 19]]); p.street("frostpath", 1, [[4, 15], [9, 15]]);
      p.street("frostpath", 2, [[6, 34], [33, 34]]); p.street("frostpath", 1, [[9, 32], [9, 33]]); p.street("frostpath", 1, [[8, 36], [5, 36]]);
      // Reference (pokewiki SW winter / S2W2 renders): no paved plaza - just paths, pools and mills - and every house is a timber cabin.
      p.fill("rock", 2, 10, 2, 17); p.fill("rock", 2, 30, 5, 33);
      p.building(0, "snowCenter"); p.building(4, "logHouse"); p.building(6, "cabin"); p.building(7, "cabin"); p.building(9, "cabin"); p.building(8, "cabin");
      windmill(p, 24, 14, 0.3); windmill(p, 36, 28, 0.9); windmill(p, 16, 15, 0.6);
      p.decor("cabin", 28, 13);
    },
  },
  // Liberty Garden: the island park. The ferry pier is on the west shore, paths ring the lawns and flower beds, and
  // the grey stone lighthouse stands at the middle.
  UnovaLibertyGarden: {
    theme: { town: true, ground: "lawn", road: "cobble", water: "sea", density: 0.03, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("deck", 4, 27, 11, 30);
      p.street("cobble", 2, [[12, 28], [16, 28]]);
      p.street("cobble", 2, [[16, 8], [38, 8], [38, 30], [16, 30], [16, 8]]); p.street("cobble", 2, [[29, 14], [29, 30]]); p.street("cobble", 2, [[16, 19], [38, 19]]);
      p.disc("cobble", 29.5, 14.5, 4.5, 3);
      // Reference (serebii Pokearth screenshot): the lighthouse is a grey stone tower on a paved platform, not a red-banded one.
      p.fill("paving", 25, 13, 33, 16);
      lightTower(p, 27, 10, 5, 4, 2, 6, [150, 150, 160], [200, 200, 208]);
      for (const [x0, y0, x1, y1, k] of [[19, 11, 25, 12, "flowersRed"], [19, 15, 25, 16, "flowersBlue"], [32, 22, 35, 27, "flowersPink"], [19, 22, 26, 23, "flowersBlue"], [19, 26, 26, 27, "flowersRed"], [33, 11, 35, 16, "flowersPink"]]) p.fill(k, x0, y0, x1, y1);
      p.decor("twinFountain", 34, 22 - 1); p.decor("bench", 18, 13); p.decor("bench", 31, 23); p.decor("bench", 36, 13);
      for (const x of [14, 13]) for (const y of [8, 12, 16, 22]) p.decor("hedge", x, y);
    },
  },
  // Anville: the railway town. Houses along the top, then the yard: the turntable with its sidings, rolling stock on
  // the two running lines, the footbridge over them, and the swap-meet plaza by the station stairs in the south.
  UnovaAnvilleTown: {
    theme: { town: true, ground: "grass", road: "paving", border: "tree", density: 0.04, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("paving", 2, [[5, 11], [36, 11]]); p.street("paving", 2, [[27, 12], [27, 13]]);
      p.fill("gravel", 2, 15, 41, 21); p.fill("cobble", 3, 24, 38, 36); p.street("paving", 2, [[27, 22], [27, 24]]);
      for (const y of [17, 19]) { track(p, 2, y, 41, y); solidBut(p, 2, y, 25, 1); solidBut(p, 29, y, 13, 1); }
      // The turntable.
      p.block(8, 15, 7, 7);
      p.paint(22, (c) => { const cx = 11.5 * U, cy = 18.5 * U; c.ellipse(cx, cy, 54, 54, [70, 70, 80]); c.ellipse(cx, cy, 50, 50, [150, 150, 156]); c.ellipse(cx, cy, 44, 44, [110, 110, 120]); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.39; c.line(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, cx + Math.cos(a) * 52, cy + Math.sin(a) * 52, [60, 60, 70], 3); } const a = -0.42, dx = Math.cos(a), dy = Math.sin(a); c.line(cx - dx * 44, cy - dy * 44, cx + dx * 44, cy + dy * 44, [120, 90, 64], 16); c.line(cx - dx * 44 - dy * 5, cy - dy * 44 + dx * 5, cx + dx * 44 - dy * 5, cy + dy * 44 + dx * 5, [190, 194, 204], 2); c.line(cx - dx * 44 + dy * 5, cy - dy * 44 - dx * 5, cx + dx * 44 + dy * 5, cy + dy * 44 - dx * 5, [190, 194, 204], 2); c.box(cx - 6, cy - 6, 12, 12, [200, 80, 60], [80, 40, 40]); });
      wagon(p, 16, 17, 5, [200, 80, 60], true); wagon(p, 31, 19, 4, [70, 110, 176]); wagon(p, 35, 19, 4, [214, 170, 70]); wagon(p, 18, 19, 5, [84, 142, 96], true); wagon(p, 33, 17, 5, [120, 124, 136]);
      // The footbridge.
      p.fill("deck", 27, 15, 28, 21); stairs(p, 27, 14, 2, 1); stairs(p, 27, 22, 2, 1);
      p.paint(22.5, (c, top) => { const X = 27 * U, Y = 15 * U, Ht = 7 * U; c.rect(X + 32, Y + 4, 4, Ht, [0, 0, 0, 60]); for (const x of [X - 3, X + 31]) { top.rect(x, Y - 6, 4, Ht + 6, [120, 130, 150]); top.rect(x + 1, Y - 6, 1, Ht + 6, [190, 200, 214]); for (let j = Y - 4; j < Y + Ht - 8; j += 16) top.line(x, j, x + 3, j + 12, [80, 90, 110]); } });
      bld(p, 33, 13, 7, 2, { style: "ware", roof: [112, 130, 150], wall: [200, 204, 214], wallH: 12 }); bld(p, 3, 13, 4, 2, { style: "ware", roof: [150, 110, 90], wall: [200, 190, 180], wallH: 12 });
      // Reference (pokewiki S2W2 render): just three houses, all with slate-purple roofs, and woods round the town.
      // (In the game the roundhouse fills the north and the line runs north-south under the footbridge; the three
      // house doors along our north side leave no room for that, so the yard stays east-west.)
      const slate = p.roof(0.7, 0.62, 1.15); for (const k of [1, 2, 3]) p.building(k, "gable", { tint: slate });
      p.fill("tree", 11, 2, 16, 9); p.fill("tree", 24, 2, 29, 9); p.fill("tree", 37, 2, 41, 9);
      [6, 9, 14, 19, 25, 31, 37].forEach((x, k) => stall(p, x, 25, [[214, 70, 70], [70, 120, 200], [240, 200, 80], [90, 170, 110]][k % 4]));
    },
  },
  /*END*/
};
