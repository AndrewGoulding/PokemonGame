// Unova routes of the Black / White campaign (BW1 maps), drawn by hand. See README.md.
// The helpers are a copy of those in unova-routes.js: each plan file stands alone.
"use strict";
// ---------------------------------------------------------------- hand-drawn pieces shared by the routes below
const U = 16;
const sh = (col, k) => col.map((v, i) => (i === 3 ? v : Math.max(0, Math.min(255, Math.round(v * k)))));
// Make the tiles of (x, y, w, h) solid where nothing fixed stands; returns the tiles that were taken.
function take(p, x, y, w, h) {
  const got = [];
  // Column by column, top down: below a kept tile the column stays open, so the tile is never sealed in.
  for (let i = x; i < x + w; i++) for (let j = y; j < y + h; j++) { if (i < 0 || j < 0 || i >= p.W || j >= p.H || (p.kept && p.kept.has(i + "," + j))) continue; try { p.block(i, j, 1, 1); got.push([i, j]); } catch (_) { break; } }
  return got;
}
const has = (list, x, y) => list.some(([a, b]) => a === x && b === y);
// A cliff face / ledge (solid), drawn in earth colours with a grassy lip on top.
function cliff(p, x, y, w, h, col = [156, 124, 88], lip = [120, 176, 96]) {
  const got = take(p, x, y, w, h);
  p.paint(y + h, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; c.rect(X, Y, U, U, col); for (let k = 2; k < U; k += 5) c.rect(X, Y + k, U, 1, sh(col, 0.82)); c.rect(X + ((i * 7 + j * 3) % 11) + 2, Y + 3, 1, 10, sh(col, 0.7)); if (!has(got, i, j - 1)) { c.rect(X, Y, U, 4, lip); c.rect(X, Y + 4, U, 1, sh(lip, 0.6)); } if (!has(got, i, j + 1)) c.rect(X, Y + 13, U, 3, sh(col, 0.55)); if (!has(got, i - 1, j)) c.rect(X, Y, 1, U, sh(col, 0.6)); if (!has(got, i + 1, j)) c.rect(X + 15, Y, 1, U, sh(col, 0.6)); } });
}
// Steps cut into a slope (walkable), on tiles (x, y, w, h). Call before the cliff they climb: take() leaves them open.
function steps(p, x, y, w, h, col = [196, 186, 168]) {
  p.kept = p.kept || new Set(); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) p.kept.add(i + "," + j);
  p.fill("gravel", x, y, x + w - 1, y + h - 1);
  p.paint(0, (c) => { const X = x * U, Y = y * U; c.rect(X, Y, w * U, h * U, col); for (let j = 0; j < h * U; j += 4) { c.rect(X, Y + j, w * U, 1, sh(col, 0.7)); c.rect(X, Y + j + 1, w * U, 1, sh(col, 1.1)); } c.rect(X, Y, 2, h * U, sh(col, 0.6)); c.rect(X + w * U - 2, Y, 2, h * U, sh(col, 0.6)); });
}
// A fence or railing (solid), one tile thick, along tiles (x, y, w, h).
function fence(p, x, y, w, h, col = [176, 132, 86]) {
  const got = take(p, x, y, w, h), flat = w >= h;
  p.paint(y + h, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; if (flat) { c.rect(X, Y + 5, U, 2, col); c.rect(X, Y + 10, U, 2, sh(col, 0.8)); c.box(X + 6, Y + 2, 4, 13, col, sh(col, 0.5)); } else { c.rect(X + 5, Y, 2, U, col); c.rect(X + 9, Y, 2, U, sh(col, 0.8)); c.box(X + 4, Y + 5, 8, 4, col, sh(col, 0.5)); } } });
}
// A waterfall down a cliff (solid) on tiles (x, y, w, h).
function falls(p, x, y, w, h) {
  const got = take(p, x, y, w, h);
  p.paint(y + h, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; c.rect(X, Y, U, U, [96, 150, 220]); for (let k = 1; k < U; k += 4) c.rect(X + k, Y + ((i * 5 + k * 3 + j) % 6), 1, 9, [200, 226, 250]); if (!has(got, i, j + 1)) { c.rect(X, Y + 12, U, 4, [236, 244, 252]); c.rect(X + 2, Y + 10, 4, 2, [236, 244, 252]); c.rect(X + 10, Y + 10, 4, 2, [236, 244, 252]); } if (!has(got, i, j - 1)) c.rect(X, Y, U, 2, [150, 196, 240]); } });
}
// Scattered marks on the ground (fallen leaves, pebbles, sparkles) over tiles x0..x1, y0..y1.
function strew(p, x0, y0, x1, y1, dens, cols, seed = 3) {
  p.paint(0, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let k = 0; k < 2; k++) { if (p.hash(x * 3 + k, y * 5 + k, seed) > dens) continue; const px = x * U + Math.floor(p.hash(x, y, seed + k + 1) * 13), py = y * U + Math.floor(p.hash(y, x, seed + k + 2) * 13), col = cols[Math.floor(p.hash(x + k, y, seed + 9) * cols.length)]; c.rect(px, py + 1, 3, 1, col); c.rect(px + 1, py, 1, 3, col); } });
}
// A shallow puddle (walkable), centre and radii in tiles.
function puddle(p, cx, cy, rx, ry, col = [86, 132, 160, 190]) {
  p.paint(0, (c) => { c.ellipse(cx * U, cy * U, rx * U, ry * U, sh(col, 0.75)); c.ellipse(cx * U, cy * U, rx * U - 2, ry * U - 2, col); c.ellipse(cx * U - rx * 5, cy * U - ry * 5, rx * 5, Math.max(1, ry * 3), [170, 204, 224, 150]); });
}
// A pen that draws on the ground picture below pixel row `cut` and on the walk-behind picture above it.
function pen(c, top, cut) {
  const s = {};
  s.p = (x, y, col) => (y < cut ? top : c).p(x, y, col);
  s.rect = (x, y, w, h, col) => { for (let j = y | 0; j < y + h; j++) for (let i = x | 0; i < x + w; i++) s.p(i, j, col); };
  s.box = (x, y, w, h, fill, edge = [46, 36, 34]) => { s.rect(x, y, w, h, edge); s.rect(x + 1, y + 1, w - 2, h - 2, fill); };
  s.line = (x0, y0, x1, y1, col, width = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) s.rect(Math.round(x0 + (x1 - x0) * i / n) - (width >> 1), Math.round(y0 + (y1 - y0) * i / n) - (width >> 1), width, width, col); };
  s.ellipse = (cx, cy, rx, ry, col) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) s.p(x, y, col); };
  s.poly = (pts, col) => { const ys = pts.map((q) => q[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); } xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) s.rect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1, col); } };
  return s;
}
// A building with no way in on tiles (x, y, w, h); o.up: extra height above (walked behind). o.style: "gable", "flat", "ware", "glass".
function bld(p, x, y, w, h, o = {}) {
  const wall = o.wall || [228, 218, 196], roof = o.roof || [156, 76, 64], edge = o.edge || sh(wall, 0.32), up = o.up || 0, style = o.style || "gable", win = o.win || [150, 196, 232];
  p.block(x, y, w, h);
  p.paint(y + h, (c, top) => {
    const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U;
    s.rect(X + 3, Y + Ht - 3, Wd, 4, [0, 0, 0, 60]);
    if (style === "glass") { s.box(X, Y, Wd, Ht, wall, edge); s.rect(X + 1, Y + 1, Wd - 2, 5, roof); for (let j = Y + 10; j + 7 < Y + Ht - 12; j += 9) for (let i = X + 4; i + 5 < X + Wd - 2; i += 8) s.rect(i, j, 5, 6, win); s.box(X + (Wd >> 1) - 7, Y + Ht - 13, 14, 13, sh(wall, 0.5), edge); return; }
    const wallH = o.wallH != null ? o.wallH : Math.max(16, Math.min(30, Math.round(Ht * 0.4))), rh = Ht - wallH;
    s.box(X, Y + rh - 1, Wd, wallH + 1, wall, edge); s.rect(X + 1, Y + rh, Wd - 2, 3, sh(wall, 0.8));
    for (let i = X + 6; i + 8 <= X + Wd - 5; i += 14) s.box(i, Y + rh + 6, 8, Math.min(9, wallH - 10), win, edge);
    if (o.door != null) s.box(X + o.door * U + 2, Y + Ht - 15, 12, 15, o.doorCol || [110, 76, 56], edge);
    if (style === "flat") { s.box(X - 1, Y, Wd + 2, rh, roof, edge); s.box(X + 3, Y + 3, Wd - 6, rh - 7, sh(roof, 1.12), sh(roof, 0.7)); }
    else if (style === "ware") { s.box(X - 1, Y, Wd + 2, rh, roof, edge); for (let i = X + 3; i < X + Wd - 2; i += 4) s.rect(i, Y + 1, 1, rh - 2, sh(roof, 0.8)); s.rect(X, Y + (rh >> 1) - 1, Wd, 2, sh(roof, 1.2)); }
    else { s.box(X - 2, Y, Wd + 4, rh, roof, edge); for (let j = Y + 4; j < Y + rh - 2; j += 4) s.rect(X - 1, j, Wd + 2, 1, sh(roof, 0.82)); s.rect(X - 1, Y + (rh >> 1) - 1, Wd + 2, 2, sh(roof, 1.25)); }
    if (o.sign) s.box(X + (Wd >> 1) - 10, Y + rh - 8, 20, 8, o.sign, edge);
  });
}
// A caravan / trailer (solid) on tiles (x, y, w, 2).
function trailer(p, x, y, w = 4, col = [236, 232, 220], stripe = [200, 80, 70]) {
  p.block(x, y, w, 2);
  p.paint(y + 2, (c) => { const X = x * U, Y = y * U, Wd = w * U; c.rect(X + 3, Y + 28, Wd - 2, 4, [0, 0, 0, 60]); c.box(X + 1, Y + 2, Wd - 2, 24, col, [60, 56, 60]); c.rect(X + 2, Y + 3, Wd - 4, 3, sh(col, 1.08)); c.rect(X + 2, Y + 15, Wd - 4, 3, stripe); for (let i = X + 6; i + 9 < X + Wd - 14; i += 14) c.box(i, Y + 7, 9, 6, [150, 196, 232], [60, 56, 60]); c.box(X + Wd - 14, Y + 8, 8, 17, sh(col, 0.8), [60, 56, 60]); c.ellipse(X + 9, Y + 27, 4, 4, [40, 40, 46]); c.ellipse(X + Wd - 20, Y + 27, 4, 4, [40, 40, 46]); c.rect(X - 4, Y + 22, 5, 2, [60, 56, 60]); });
}
// A tent (solid) on tiles (x, y, 3, 2).
function tent(p, x, y, col = [214, 150, 70]) {
  p.block(x, y, 3, 2);
  p.paint(y + 2, (c) => { const X = x * U, Y = y * U; c.poly([[X, Y + 31], [X + 24, Y - 2], [X + 48, Y + 31]], sh(col, 0.55)); c.poly([[X + 3, Y + 30], [X + 24, Y + 2], [X + 45, Y + 30]], col); c.poly([[X + 24, Y + 2], [X + 45, Y + 30], [X + 30, Y + 30]], sh(col, 0.8)); c.poly([[X + 18, Y + 30], [X + 24, Y + 14], [X + 30, Y + 30]], [60, 44, 40]); });
}
// A stone wall or ruin (solid) on tiles (x, y, w, h).
function wall(p, x, y, w, h, col = [150, 146, 140]) {
  const got = take(p, x, y, w, h);
  p.paint(y + h, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; c.rect(X, Y, U, U, col); c.rect(X, Y + 7, U, 1, sh(col, 0.7)); c.rect(X, Y + 15, U, 1, sh(col, 0.6)); c.rect(X + ((j & 1) ? 4 : 11), Y, 1, 8, sh(col, 0.7)); c.rect(X + ((j & 1) ? 11 : 4), Y + 8, 1, 8, sh(col, 0.7)); if (!has(got, i, j - 1)) c.rect(X, Y, U, 2, sh(col, 1.2)); if (!has(got, i - 1, j)) c.rect(X, Y, 1, U, sh(col, 0.5)); if (!has(got, i + 1, j)) c.rect(X + 15, Y, 1, U, sh(col, 0.5)); } });
}
// A pipe run (solid), one tile thick.
function pipe(p, x, y, w, h, col = [150, 156, 170]) {
  const got = take(p, x, y, w, h), flat = w >= h;
  p.paint(y + h, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; if (flat) { c.box(X - 1, Y + 3, U + 2, 10, col, sh(col, 0.4)); c.rect(X, Y + 5, U, 2, sh(col, 1.3)); if (i % 2 === 0) c.box(X + 6, Y + 1, 4, 14, sh(col, 0.75), sh(col, 0.4)); } else { c.box(X + 3, Y - 1, 10, U + 2, col, sh(col, 0.4)); c.rect(X + 5, Y, 2, U, sh(col, 1.3)); if (j % 2 === 0) c.box(X + 1, Y + 6, 14, 4, sh(col, 0.75), sh(col, 0.4)); } } });
}
// A round storage tank (solid) on tiles (x, y, w, h).
function tank(p, x, y, w, h, col = [196, 200, 208]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const X = x * U, Y = y * U, Wd = w * U, Ht = h * U; c.ellipse(X + Wd / 2 + 2, Y + Ht - 5, Wd / 2, 6, [0, 0, 0, 70]); c.rect(X + 1, Y + 8, Wd - 2, Ht - 15, sh(col, 0.8)); c.rect(X + 4, Y + 8, Wd / 3, Ht - 15, col); c.ellipse(X + Wd / 2, Y + Ht - 8, Wd / 2 - 1, 6, sh(col, 0.8)); c.ellipse(X + Wd / 2, Y + 8, Wd / 2 - 1, 7, sh(col, 0.55)); c.ellipse(X + Wd / 2, Y + 7, Wd / 2 - 2, 6, sh(col, 1.1)); c.rect(X + 1, Y + Ht / 2, Wd - 2, 2, [200, 80, 60]); });
}
// A shipping container or crate stack (solid) on tiles (x, y, w, 1).
function crate(p, x, y, w, col = [70, 120, 180]) { p.block(x, y, w, 1); p.paint(y + 1, (c) => { const X = x * U, Y = y * U; c.box(X, Y - 4, w * U, 20, col, sh(col, 0.4)); for (let i = 3; i < w * U - 1; i += 4) c.rect(X + i, Y - 2, 1, 16, sh(col, 0.8)); c.rect(X + 1, Y - 3, w * U - 2, 2, sh(col, 1.25)); }); }
// Scaffolding (solid) on tiles (x, y, w, h), rising `up` tiles above (walked behind).
function scaffold(p, x, y, w, h, up = 2, col = [226, 150, 60]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = (y - up) * U, Wd = w * U, Ht = (h + up) * U; for (let j = Y + 6; j < Y + Ht; j += 14) { s.rect(X, j, Wd, 3, [150, 120, 90]); s.rect(X, j + 3, Wd, 1, [90, 70, 56]); } for (let i = X; i <= X + Wd - 3; i += 15) { s.rect(Math.min(i, X + Wd - 3), Y, 3, Ht, col); s.rect(Math.min(i, X + Wd - 3) + 2, Y, 1, Ht, sh(col, 0.6)); } for (let i = X; i + 15 <= X + Wd; i += 30) s.line(i + 1, Y + 6, i + 15, Y + Ht - 2, sh(col, 0.75), 2); });
}
// Road paint: a dashed centre line along a row or column of tiles.
function dashes(p, x0, y0, x1, y1, col = [244, 240, 210]) {
  p.paint(0, (c) => { if (y0 === y1) for (let i = x0 * U + 4; i < (x1 + 1) * U - 8; i += 20) c.rect(i, y0 * U + 7, 10, 2, col); else for (let j = y0 * U + 4; j < (y1 + 1) * U - 8; j += 20) c.rect(x0 * U + 7, j, 2, 10, col); });
}
// A hay bale or a small prop (solid, one tile).
function bale(p, x, y, col = [226, 196, 110]) { if (!take(p, x, y, 1, 1).length) return; p.paint(y + 1, (c) => { const X = x * U, Y = y * U; c.ellipse(X + 8, Y + 9, 7, 6, sh(col, 0.6)); c.ellipse(X + 8, Y + 8, 6, 5, col); c.ellipse(X + 8, Y + 8, 3, 2, sh(col, 0.8)); }); }
// A traffic cone / barrier (solid, w tiles wide).
function barrier(p, x, y, w = 1) { const got = take(p, x, y, w, 1); p.paint(y + 1, (c) => { for (const [i, j] of got) { const X = i * U, Y = j * U; c.box(X, Y + 4, U, 8, [240, 200, 60], [60, 50, 40]); for (let k = 1; k < 15; k += 6) c.poly([[X + k, Y + 11], [X + k + 3, Y + 5], [X + k + 5, Y + 5], [X + k + 2, Y + 11]], [40, 40, 44]); c.rect(X + 2, Y + 12, 2, 4, [90, 90, 96]); c.rect(X + 12, Y + 12, 2, 4, [90, 90, 96]); } }); }
// A broken column (solid, one tile), drawn taller than its tile.
function pillar(p, x, y, col = [206, 186, 140], tall = 14) { if (!take(p, x, y, 1, 1).length) return; p.paint(y + 1, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U; s.ellipse(X + 9, Y + 13, 7, 3, [0, 0, 0, 60]); s.box(X + 3, Y - tall + 6, 10, tall + 6, col, sh(col, 0.45)); s.rect(X + 5, Y - tall + 7, 2, tall + 4, sh(col, 1.15)); s.box(X + 1, Y + 10, 14, 4, sh(col, 0.85), sh(col, 0.45)); s.box(X + 2, Y - tall + 4, 12, 3, sh(col, 1.1), sh(col, 0.45)); }); }
// A guardian statue (solid, one tile).
function statue(p, x, y, col = [110, 130, 170]) { if (!take(p, x, y, 1, 1).length) return; p.paint(y + 1, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U; s.box(X + 1, Y + 8, 14, 7, [170, 160, 140], [80, 70, 60]); s.ellipse(X + 8, Y + 2, 6, 7, sh(col, 0.5)); s.ellipse(X + 8, Y + 2, 5, 6, col); s.rect(X + 4, Y, 3, 2, [230, 220, 200]); s.rect(X + 9, Y, 3, 2, [230, 220, 200]); s.rect(X + 5, Y + 4, 6, 1, sh(col, 0.5)); }); }
// A caravan standing on warp k's door (door at its right end); w tiles wide.
function trailerDoor(p, k, w = 5, col = [236, 232, 220], stripe = [200, 80, 70]) {
  const v = p.warps[k], x = v.x - w + 2, y = v.y - 1; p.bare(k); take(p, x, y, w, 2);
  p.paint(v.y + 0.6, (c) => { const X = x * U, Y = y * U, Wd = w * U; c.rect(X + 3, Y + 28, Wd - 2, 4, [0, 0, 0, 60]); c.box(X + 1, Y - 2, Wd - 2, 30, col, [60, 56, 60]); c.rect(X + 2, Y - 1, Wd - 4, 3, sh(col, 1.08)); c.rect(X + 2, Y + 14, Wd - 4, 3, stripe); for (let i = X + 6; i + 10 < v.x * U - 4; i += 15) c.box(i, Y + 4, 10, 7, [150, 196, 232], [60, 56, 60]); c.box(v.x * U + 2, Y + 12, 12, 20, [96, 70, 56], [50, 40, 40]); c.rect(v.x * U + 10, Y + 22, 2, 2, [230, 200, 90]); c.ellipse(X + 10, Y + 28, 4, 4, [40, 40, 46]); c.ellipse(X + 26, Y + 28, 4, 4, [40, 40, 46]); c.rect(X - 5, Y + 22, 6, 2, [60, 56, 60]); });
}
// Spectator stands (solid) on tiles (x, y, w, h).
function stand(p, x, y, w, h, col = [70, 110, 190]) { p.block(x, y, w, h); p.paint(y + h, (c) => { const X = x * U, Y = y * U; c.box(X, Y, w * U, h * U, [200, 204, 214], [70, 76, 96]); for (let j = 3; j + 5 < h * U; j += 7) { c.rect(X + 2, Y + j, w * U - 4, 4, col); c.rect(X + 2, Y + j + 4, w * U - 4, 1, sh(col, 0.6)); } for (let i = 24; i < w * U - 8; i += 48) c.rect(X + i, Y + 1, 4, h * U - 2, [226, 228, 236]); }); }
// A steel beam painted along pixel row py from tile x0 to x1 (no collision: lay it over water or a solid row).
function beam(p, x0, x1, py, col, h = 7, z = 0, onTop = false) { p.paint(z, (c, top) => { const s = onTop ? top : c, X = x0 * U, Wd = (x1 - x0 + 1) * U; s.box(X, py, Wd, h, col, sh(col, 0.45)); s.rect(X + 1, py + 1, Wd - 2, 1, sh(col, 1.3)); for (let i = 6; i < Wd - 2; i += 12) s.rect(X + i, py + 2, 1, h - 3, sh(col, 0.6)); }); }
// A gantry over a bridge deck: a bar across pixel column px from py0 to py1, walked under.
function gantry(p, px, py0, py1, col, w = 10) { p.paint(99, (c, top) => { top.box(px, py0, w, py1 - py0, col, sh(col, 0.45)); top.rect(px + 1, py0 + 1, 2, py1 - py0 - 2, sh(col, 1.3)); for (let j = py0 + 8; j < py1 - 4; j += 14) top.rect(px + 1, j, w - 2, 1, sh(col, 0.6)); top.box(px - 3, py0 - 6, w + 6, 10, sh(col, 0.85), sh(col, 0.4)); top.box(px - 3, py1 - 4, w + 6, 10, sh(col, 0.85), sh(col, 0.4)); }); }
const DESERT = { ground: "desert", road: "beach", border: "rock", tree: "boulder", density: 0.3, groves: 0, flowers: 0, grass: "desert", house: ["peak", "gable", "flat"] };
// A beach parasol (solid, one tile).
function parasol(p, x, y, col) { if (!take(p, x, y, 1, 1).length) return; p.paint(y + 1, (c, top) => { const X = x * U + 8, Y = y * U; c.rect(X - 1, Y, 2, 14, [120, 100, 80]); c.rect(X - 7, Y + 11, 14, 4, [250, 250, 240]); top.ellipse(X, Y - 2, 12, 7, col); top.ellipse(X, Y - 2, 5, 7, [250, 250, 244]); }); }
// A patch seen through water (shallows, a sunken ruin's shadow): painted only, centre and radii in tiles.
function shoal(p, cx, cy, rx, ry, col = [150, 200, 230, 110]) { p.paint(0, (c) => { c.ellipse(cx * U, cy * U, rx * U, ry * U, col); }); }
const COAST = { road: "sand", shore: 2, density: 0.2, groves: 0.05, water: "sea" };
const MOUNTAIN = { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.3, groves: 0.1, grove: "tree", flowers: 0.02 };
const GREY = [150, 146, 150], GREYLIP = [128, 168, 110];
// Suspension cables beside a bridge deck: from pixel row `py` they rise `hgt` pixels at each tower (dir -1: drawn above the deck, +1: below).
function cables(p, x0, x1, towers, py, hgt, dir, col = [226, 228, 236]) {
  p.paint(1, (c) => { const stops = [x0 * U, ...towers, (x1 + 1) * U]; for (let px = x0 * U; px < (x1 + 1) * U; px++) { let k = 0; while (k + 2 < stops.length && px >= stops[k + 1]) k++; const a = stops[k], b = stops[k + 1], t = (px - a) / (b - a), ha = k === 0 ? 0 : hgt, hb = k + 2 === stops.length ? 0 : hgt, h = ha + (hb - ha) * t - 4 * t * (1 - t) * (ha && hb ? 0.8 : 0.5) * hgt, y = Math.round(py + dir * Math.max(0, h)); c.rect(px, y, 1, 2, col); if (px % 12 === 0) c.rect(px, Math.min(y, py), 1, Math.abs(y - py), sh(col, 0.8)); } });
}
// Vegetable plots: furrowed soil with rows of crops on tiles (x, y, w, h); walkable.
function plots(p, x, y, w, h, crop = [90, 170, 80]) { p.fill("dirt", x, y, x + w - 1, y + h - 1); p.paint(0, (c) => { const X = x * U, Y = y * U; c.box(X, Y, w * U, h * U, [150, 110, 76], [110, 80, 56]); for (let j = 4; j < h * U - 3; j += 8) { c.rect(X + 2, Y + j + 4, w * U - 4, 2, [120, 86, 60]); for (let i = 4; i < w * U - 4; i += 7) { c.rect(X + i, Y + j, 4, 4, crop); c.rect(X + i + 1, Y + j, 2, 2, sh(crop, 1.3)); } } }); }
// White water: streaks of current painted on a stretch of water (tiles x0..x1, y0..y1), flowing along dx, dy.
function rapids(p, x0, y0, x1, y1, dx, dy, seed = 5) { p.paint(0, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (p.hash(x, y, seed) > 0.55) continue; const px = x * U + Math.floor(p.hash(x, y, seed + 1) * 8), py = y * U + Math.floor(p.hash(y, x, seed + 2) * 8); c.line(px, py, px + dx * 7, py + dy * 7, [236, 244, 252, 200]); c.line(px + 3 * Math.abs(dy), py + 3 * Math.abs(dx), px + 3 * Math.abs(dy) + dx * 4, py + 3 * Math.abs(dx) + dy * 4, [200, 226, 248, 180]); } }); }
// An islet seen in open water (painted only): sand with a rock, centre in tiles.
function islet(p, cx, cy, rx = 1.6, ry = 1) { p.paint(0, (c) => { const X = cx * U, Y = cy * U; c.ellipse(X, Y + 2, rx * U + 3, ry * U + 3, [236, 244, 250, 130]); c.ellipse(X, Y, rx * U, ry * U, [226, 208, 160]); c.ellipse(X - 3, Y - 3, rx * 7, ry * 6, [130, 130, 140]); c.ellipse(X - 5, Y - 5, rx * 4, ry * 3, [176, 176, 186]); }); }
// A lattice girder painted along pixel row py from tile x0 to x1 (no collision).
function truss(p, x0, x1, py, h, col) { p.paint(1, (c) => { const X = x0 * U, Wd = (x1 - x0 + 1) * U; c.rect(X, py, Wd, 3, col); c.rect(X, py + h - 3, Wd, 3, col); c.rect(X, py, Wd, 1, sh(col, 1.4)); for (let i = 0; i < Wd; i += h) { c.rect(X + i, py, 2, h, col); c.line(X + i, py + 2, Math.min(X + i + h, X + Wd - 1), py + h - 3, sh(col, 0.8)); c.line(X + i, py + h - 3, Math.min(X + i + h, X + Wd - 1), py + 2, sh(col, 0.8)); } }); }
// A railway line painted along pixel row py from tile x0 to x1 (no collision), with an optional train of `cars` from pixel tx.
function railway(p, x0, x1, py, tx, cars = 0, col = [70, 150, 110]) { p.paint(1, (c) => { const X = x0 * U, Wd = (x1 - x0 + 1) * U; c.rect(X, py - 2, Wd, 18, [86, 84, 92]); for (let i = 0; i < Wd; i += 6) c.rect(X + i, py, 3, 14, [120, 100, 80]); c.rect(X, py + 2, Wd, 2, [190, 194, 204]); c.rect(X, py + 10, Wd, 2, [190, 194, 204]); for (let k = 0; k < cars; k++) { const a = tx + k * 50; c.box(a, py - 3, 47, 20, col, sh(col, 0.4)); c.rect(a + 2, py - 1, 43, 3, sh(col, 1.3)); for (let i = 5; i < 40; i += 9) c.rect(a + i, py + 5, 6, 5, [170, 210, 236]); } }); }
// A battle court (walkable) on tiles (x, y, w, h).
function court(p, x, y, w, h, kind = "clay", L = [244, 244, 236]) { p.fill(kind, x, y, x + w - 1, y + h - 1); p.paint(0, (c) => { const X = x * U + 3, Y = y * U + 3, Wd = w * U - 6, Ht = h * U - 6; c.rect(X, Y, Wd, 2, L); c.rect(X, Y + Ht - 2, Wd, 2, L); c.rect(X, Y, 2, Ht, L); c.rect(X + Wd - 2, Y, 2, Ht, L); c.rect(X + Wd / 2 - 1, Y, 2, Ht, L); c.ellipse(X + Wd / 2, Y + Ht / 2, 16, 16, L, 2); c.ellipse(X + Wd / 2, Y + Ht / 2, 4, 4, L); }); }
// A clipped hedge (soft wall) along tiles x0..x1, y0..y1, drawn with the hedge stamp where it fits.
function hedges(p, x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { try { p.decor("hedge", x, y); } catch (_) { /* a kept tile */ } } }
const MARSH = { ground: "marsh", road: "dirt", grass: "marshgrass", density: 0.2, groves: 0.08, flowers: 0, puddles: 0.1, water: "bog" };
const FOREST = { ground: "shade", grass: "shadegrass", density: 0.55, groves: 0.3, flowers: 0.03 };
const AUTUMN = { ground: "autumn", grass: "autumngrass", border: "autumntree", tree: "tree1", treeTint: "autumn", density: 0.35, groves: 0.12, flowers: 0.02 };
const LEAVES = [[214, 120, 40], [196, 70, 40], [236, 180, 60]];

// A badge-check gate across a path: two stone posts at (x - 1, y) and (x + w, y) with a lintel walked under.
function gate(p, x, y, w = 2, col = [176, 170, 160]) { pillar(p, x - 1, y, col, 16); pillar(p, x + w, y, col, 16); p.paint(99, (c, top) => { top.box((x - 1) * U + 1, y * U - 16, (w + 2) * U - 2, 7, sh(col, 1.1), sh(col, 0.45)); top.box((x + w / 2) * U - 5, y * U - 18, 10, 10, [230, 190, 70], [110, 80, 30]); }); }
// The same plan with x and y swapped for painting: turns the bridge painters (beam, gantry, cables, truss, railway) upright for north-south spans.
function turned(p) {
  const tr = (c) => ({ rect: (x, y, w, h, col) => c.rect(y, x, h, w, col), box: (x, y, w, h, f, e) => c.box(y, x, h, w, f, e), line: (x0, y0, x1, y1, col, w) => c.line(y0, x0, y1, x1, col, w), ellipse: (cx, cy, rx, ry, col, ring) => c.ellipse(cy, cx, ry, rx, col, ring), poly: (pts, col) => c.poly(pts.map(([a, b]) => [b, a]), col), p: (x, y, col) => c.p(y, x, col) });
  return { hash: p.hash, paint: (z, draw) => p.paint(z, (c, top) => draw(tr(c), tr(top))) };
}
// BW1 bridge maps are a cross of decks; the arm a bridge does not use becomes open water.
function northSouth(p) { p.fill("water", 3, 17, 19, 23); p.fill("water", 27, 17, 44, 23); }
function eastWest(p) { p.fill("water", 20, 2, 26, 16); p.fill("water", 20, 24, 26, 37); }
module.exports = {
  // Route 1: the first road north from Nuvema, the sea on one side, ledges to hop on the way back.
  BW1Route1: { theme: { ...COAST, density: 0.25, flowers: 0.15 }, plan(p) {
    p.fill("water", 32, 2, 45, 4); p.fill("water", 42, 5, 45, 11);
    p.street("sand", 2, [[24, 36], [24, 30], [20, 30], [20, 22], [24, 22], [24, 14], [27, 14], [27, 7], [24, 7], [24, 4]]); p.street("sand", 2, [[24, 22], [40, 22], [40, 20], [44, 20]]);
    cliff(p, 4, 15, 14, 1); cliff(p, 28, 26, 12, 1); cliff(p, 6, 31, 12, 1);
    p.fill("tree", 2, 2, 14, 4); p.fill("tree", 36, 32, 45, 37);
  } },
  // Route 2: an easy lane to Striaton between flower banks, stepping round the ledges.
  BW1Route2: { theme: { density: 0.3, groves: 0.12, flowers: 0.2 }, plan(p) {
    p.street("sand", 2, [[24, 36], [24, 31], [28, 31], [28, 23], [20, 23], [20, 15], [24, 15], [24, 4]]);
    cliff(p, 4, 23, 12, 1); cliff(p, 30, 16, 12, 1); cliff(p, 8, 31, 10, 1);
    p.fill("tree", 2, 2, 12, 5); p.fill("tree", 38, 30, 45, 37);
  } },
  // Route 3: the Day-Care with its fenced playground, the brook under the footbridge and the lane to Wellspring Cave.
  BW1Route3: { theme: { density: 0.35, groves: 0.15, flowers: 0.12 }, plan(p) {
    p.disc("water", 35, 28, 5.5, 3.4); p.disc("water", 31, 27, 3, 2.4);                    // the big pond
    p.street("dirt", 2, [[24, 36], [24, 30], [27, 30], [27, 22], [24, 22], [24, 14], [21, 14], [21, 7], [24, 7], [24, 4]]); p.street("dirt", 2, [[27, 22], [44, 22], [44, 20]]); p.street("deck", 2, [[27, 30], [42, 30], [42, 23]]);   // the plank bridge over the pond
    p.decor("gable", 13, 20, { tint: p.roof(1.9, 0.5, 0.45) }); p.street("dirt", 1, [[14, 26], [14, 28], [24, 28]]);
    p.fill("lawn", 14, 15, 18, 16); fence(p, 13, 14, 7, 1, [236, 236, 240]); fence(p, 13, 17, 3, 1, [236, 236, 240]); fence(p, 17, 17, 3, 1, [236, 236, 240]); fence(p, 13, 15, 1, 2, [236, 236, 240]); fence(p, 19, 15, 1, 2, [236, 236, 240]);
    p.paint(0, (c) => { c.box(14 * U + 2, 15 * U + 4, 24, 22, [236, 214, 160], [150, 120, 90]); c.box(16 * U + 6, 15 * U + 8, 34, 9, [226, 90, 80], [90, 40, 40]); c.rect(16 * U + 6, 16 * U + 1, 4, 12, [120, 130, 150]); });
  } },
  // Route 4 (Black / White): the highway still being laid across the desert, with the workers' caravans beside it.
  BW1Route4: { theme: { ...DESERT, density: 0.25 }, plan(p) {
    p.street("asphalt", 3, [[24, 36], [24, 25]]); p.street("asphalt", 3, [[24, 14], [24, 4]]); p.street("beach", 3, [[24, 24], [24, 15]]); p.street("beach", 2, [[25, 20], [44, 20]]);
    dashes(p, 24, 26, 24, 35); dashes(p, 24, 5, 24, 13);
    barrier(p, 21, 24, 2); barrier(p, 26, 24, 2); barrier(p, 21, 15, 2); barrier(p, 26, 15, 2);
    scaffold(p, 28, 14, 4, 2); crate(p, 28, 17, 3, [220, 170, 60]); trailer(p, 14, 15, 5); trailer(p, 14, 22, 5, [226, 222, 204], [70, 130, 190]);
    wall(p, 38, 15, 6, 1, [196, 176, 132]); pillar(p, 40, 23); pillar(p, 43, 23); pillar(p, 5, 30); wall(p, 4, 6, 1, 5, [196, 176, 132]);
  } },
  // Route 5: the performers' paved road and its little square, with the caravan parked beside it.
  BW1Route5: { theme: { road: "asphalt", density: 0.3, groves: 0.12, flowers: 0.12 }, plan(p) {
    p.street("asphalt", 3, [[24, 36], [24, 27], [25, 27], [25, 13], [24, 13], [24, 4]]); p.fill("asphalt", 19, 17, 31, 23);
    trailer(p, 33, 18, 5); p.decor("bench", 18, 18); p.decor("bench", 18, 21); p.decor("bench", 32, 21);
    fence(p, 21, 28, 1, 7, [200, 204, 214]); fence(p, 27, 28, 1, 7, [200, 204, 214]); fence(p, 21, 5, 1, 7, [200, 204, 214]); fence(p, 28, 13, 1, 3, [200, 204, 214]);
    p.fill("tree", 2, 2, 5, 37); p.fill("tree", 42, 13, 45, 37); p.fill("flowersRed", 19, 24, 22, 25); p.fill("flowersBlue", 28, 24, 31, 25);
  } },
  // Route 6: the river and its plank bridge, the Season Research Lab and the Chargestone Cave mouth.
  BW1Route6: { theme: { density: 0.4, groves: 0.18, flowers: 0.1 }, plan(p) {
    p.fill("water", 33, 12, 35, 37);
    p.street("dirt", 2, [[24, 36], [24, 29], [21, 29], [21, 21], [24, 21], [24, 10], [26, 10], [26, 6], [24, 6], [24, 4]]); p.street("dirt", 2, [[24, 21], [44, 21], [44, 20]]);
    p.decor("lab", 8, 11); p.street("dirt", 1, [[11, 16], [11, 18], [21, 18]]);
    p.fill("rock", 14, 2, 21, 3); p.fill("rock", 27, 2, 31, 3); p.fill("tree", 2, 28, 10, 37);
  } },
  // Route 7: raised board walks over the tall grass, Celestial Tower rising to the east.
  BW1Route7: { theme: { ground: "grass", road: "dirt", border: "tree", tree: "tree1", density: 0.2, groves: 0.1, flowers: 0.05 }, plan(p) {
    p.street("dirt", 2, [[24, 36], [24, 30], [28, 30], [28, 22], [24, 22], [24, 12], [22, 12], [22, 6], [24, 6], [24, 4]]); p.street("dirt", 2, [[28, 22], [38, 22], [38, 20], [44, 20]]);
    p.street("deck", 1, [[23, 33], [10, 33], [10, 24], [20, 24]]); p.street("deck", 1, [[10, 24], [10, 14], [21, 14]]); p.street("deck", 1, [[15, 24], [15, 29], [23, 29]]); p.street("deck", 1, [[29, 27], [40, 27], [40, 33], [29, 33], [29, 30]]);
    p.block(42, 15, 3, 3); p.paint(18, (c, top) => { const cx = 43.5 * U, by = 18 * U; c.ellipse(cx + 2, by - 4, 28, 8, [0, 0, 0, 60]); for (let k = 0; k < 7; k++) { const r = 26 - k * 3, y = by - 10 - k * 13, cv = k < 2 ? c : top; cv.ellipse(cx, y, r, 9, [96, 120, 110]); cv.rect(cx - r, y - 12, r * 2, 12, [150, 176, 160]); cv.rect(cx - r, y - 12, 5, 12, [200, 220, 206]); cv.rect(cx + r - 6, y - 12, 6, 12, [110, 136, 124]); cv.ellipse(cx, y - 12, r, 8, [214, 230, 216]); for (let i = -r + 6; i < r - 4; i += 9) cv.rect(cx + i, y - 7, 3, 5, [70, 90, 96]); } top.ellipse(cx, by - 104, 6, 6, [236, 244, 236]); c.box(cx - 6, by - 14, 12, 14, [50, 60, 70], [30, 36, 44]); });   // Celestial Tower: a round, tiered, pale tower
    p.decor("gable", 6, 16, { tint: p.roof(1.9, 0.45, 0.5) }); p.fill("rock", 14, 2, 31, 2); p.fill("rock", 14, 3, 21, 3); p.fill("rock", 27, 3, 31, 4);
  } },
  // Route 8: the wet road out of Icirrus, puddles standing across it, the moor off to the east.
  BW1Route8: { theme: { ground: "grass", grass: "grass", water: "water", road: "dirt", density: 0.25, groves: 0.12, flowers: 0.05, puddles: 0.1 }, plan(p) {
    p.street("dirt", 2, [[24, 36], [24, 28], [20, 28], [20, 20], [24, 20], [24, 12], [26, 12], [26, 6], [24, 6], [24, 4]]); p.street("dirt", 2, [[24, 20], [44, 20]]);
    p.disc("water", 10, 26, 4, 2.5); p.disc("water", 36, 30, 4, 2.5);
    puddle(p, 22, 24, 2.4, 1.3); puddle(p, 32, 20.5, 2.2, 1.1); puddle(p, 12, 17, 3, 1.8); puddle(p, 34, 15, 3, 1.6); puddle(p, 14, 33, 3, 1.5); puddle(p, 25, 9, 1.6, 1); puddle(p, 40, 24, 2, 1.4); puddle(p, 7, 8, 2.4, 1.4);
  } },
  // Route 9: the motorway to Opelucid with Shopping Mall Nine and its car park.
  BW1Route9: { theme: { road: "asphalt", density: 0.3, groves: 0.1, flowers: 0.05 }, plan(p) {
    p.street("asphalt", 4, [[24, 36], [24, 4]]); p.street("dirt", 2, [[26, 20], [44, 20]]);
    p.decor("hall", 8, 12); p.fill("asphalt", 8, 20, 21, 23);
    p.paint(0, (c) => { for (let j = 5 * U; j < 36 * U; j += 20) c.rect(25 * U - 1, j, 2, 10, [244, 240, 210]); for (let i = 8 * U + 8; i < 22 * U; i += 16) c.rect(i, 21 * U, 1, 26, [244, 240, 210]); });
    fence(p, 21, 5, 1, 7, [200, 204, 214]); fence(p, 21, 25, 1, 11, [200, 204, 214]); fence(p, 27, 5, 1, 14, [200, 204, 214]); fence(p, 27, 22, 1, 14, [200, 204, 214]);
  } },
  // Route 10: the climb to Victory Road through the badge gates, cliffs closing in on both sides.
  BW1Route10: { theme: { ...MOUNTAIN, ground: "grass", tree: "tree1", density: 0.3 }, plan(p) {
    p.street("gravel", 2, [[24, 36], [24, 30], [27, 30], [27, 22], [24, 22], [24, 4]]);
    cliff(p, 4, 15, 17, 1); cliff(p, 28, 15, 16, 1); cliff(p, 4, 23, 17, 1); cliff(p, 30, 23, 14, 1);
    gate(p, 24, 8);
    p.fill("rock", 2, 2, 20, 3); p.fill("rock", 28, 2, 31, 4); p.fill("rock", 42, 2, 45, 12);
  } },
  // Route 11: the waterfall and its stream under the footbridge, and the traveller's caravan.
  BW1Route11: { theme: { density: 0.35, groves: 0.15, flowers: 0.08 }, plan(p) {
    p.fill("water", 18, 13, 20, 37); p.fill("water", 16, 13, 22, 15); p.fill("water", 18, 2, 20, 8);
    steps(p, 8, 9, 2, 4); cliff(p, 2, 9, 16, 4); cliff(p, 21, 9, 10, 4); falls(p, 18, 9, 3, 4);
    p.street("asphalt", 3, [[4, 20], [44, 20]]);
    trailer(p, 25, 15, 5, [232, 226, 206], [70, 130, 190]); p.fill("tree", 2, 32, 14, 37);
  } },
  // Route 12: rolling grassy hills between Village Bridge and Lacunosa.
  BW1Route12: { theme: { ground: "meadow", density: 0.15, groves: 0.06, flowers: 0.25 }, plan(p) {
    p.street("dirt", 2, [[4, 20], [12, 20], [12, 24], [22, 24], [22, 17], [32, 17], [32, 21], [44, 21], [44, 20]]);
    cliff(p, 14, 12, 8, 1); cliff(p, 13, 13, 1, 2); cliff(p, 22, 13, 1, 2); cliff(p, 26, 27, 10, 1); cliff(p, 26, 28, 1, 2); cliff(p, 35, 28, 1, 2); cliff(p, 4, 29, 8, 1); cliff(p, 36, 14, 7, 1);
    p.disc("flowersRed", 18, 14.5, 3, 1.5); p.disc("flowersBlue", 31, 30, 3, 1.5); p.disc("flowersPink", 8, 10, 3, 2);
  } },
  // Route 13: the cliff path above the sea, with steps down to the strand and the track off to the Giant Chasm.
  BW1Route13: { theme: { ...COAST, density: 0.25 }, plan(p) {
    p.fill("water", 2, 32, 45, 37);
    steps(p, 20, 27, 2, 1, [176, 140, 96]); cliff(p, 2, 27, 28, 1); cliff(p, 32, 27, 14, 1); cliff(p, 6, 13, 14, 1);
    p.street("sand", 2, [[4, 20], [14, 20], [14, 17], [26, 17], [26, 22], [36, 22], [36, 20], [44, 20]]); p.street("sand", 2, [[40, 20], [40, 22], [44, 22]]); p.street("sand", 1, [[20, 22], [20, 30], [34, 30]]);
    p.fill("rock", 42, 24, 45, 26); p.fill("tree", 2, 2, 16, 4);
  } },
  // Route 14: the river and its waterfall between the cliffs; the roads to the shrine, Black City and White Forest part beyond the bridge.
  BW1Route14: { theme: { density: 0.3, groves: 0.15, flowers: 0.05, shore: 1 }, plan(p) {
    p.fill("water", 38, 12, 40, 37);
    steps(p, 12, 24, 2, 2); cliff(p, 2, 24, 36, 2); falls(p, 38, 24, 3, 2); cliff(p, 41, 24, 5, 2);
    p.street("dirt", 2, [[4, 20], [14, 20], [14, 17], [28, 17], [28, 20], [44, 20]]); p.street("dirt", 2, [[42, 18], [42, 22]]); p.street("dirt", 1, [[42, 18], [44, 18]]); p.street("dirt", 1, [[42, 22], [44, 22]]);
    p.street("dirt", 1, [[12, 21], [12, 30], [36, 30]]); rapids(p, 38, 26, 40, 32, 0, 1);
    p.fill("tree", 2, 2, 14, 5);
  } },
  // Route 15: the rocky shelf with the Poke Transfer Lab on top, stairs down to the road and the lower ledge.
  BW1Route15: { theme: { ...MOUNTAIN, density: 0.3 }, plan(p) {
    steps(p, 20, 14, 2, 2); steps(p, 34, 28, 2, 1); cliff(p, 2, 14, 29, 2); cliff(p, 42, 14, 4, 2); cliff(p, 2, 28, 44, 1);
    p.street("gravel", 2, [[4, 20], [12, 20], [12, 22], [28, 22], [28, 20], [44, 20]]); p.street("gravel", 1, [[4, 22], [12, 22]]); p.street("gravel", 2, [[20, 21], [20, 13]]);
    p.decor("lab", 17, 7); p.fill("rock", 2, 2, 14, 4); p.fill("rock", 26, 2, 30, 3);
  } },
  // Route 16: the straight paved road east of Nimbasa, railed off from the woods, with Lostlorn Forest at its end.
  BW1Route16: { theme: { road: "asphalt", density: 0.4, groves: 0.2, flowers: 0.05 }, plan(p) {
    p.street("asphalt", 3, [[4, 20], [14, 20], [14, 21], [32, 21], [32, 20], [44, 20]]); p.street("asphalt", 1, [[4, 22], [8, 22]]);
    fence(p, 6, 18, 8, 1, [200, 204, 214]); fence(p, 16, 19, 15, 1, [200, 204, 214]); fence(p, 10, 23, 30, 1, [200, 204, 214]); fence(p, 34, 18, 8, 1, [200, 204, 214]);
    p.fill("tree", 2, 2, 28, 4); p.fill("tree", 2, 34, 45, 37);
  } },
  // Route 17: a sandbar between two seas, fast currents and islets to either side.
  BW1Route17: { theme: { ground: "beach", road: "sand", border: "rock", tree: "boulder", density: 0.1, groves: 0, flowers: 0, water: "sea", rough: false }, plan(p) {
    p.fill("water", 2, 26, 45, 37); p.fill("water", 2, 2, 30, 7); p.fill("water", 42, 2, 45, 14); p.disc("water", 18, 23, 3.5, 1.4);
    p.street("sand", 2, [[4, 20], [14, 20], [14, 16], [30, 16], [30, 20], [44, 20]]);
    rapids(p, 4, 29, 20, 31, 1, 0); rapids(p, 24, 33, 42, 35, -1, 0, 9); rapids(p, 6, 3, 26, 5, 1, 0, 13);
    islet(p, 12, 34); islet(p, 30, 29, 2, 1.2); islet(p, 40, 32); islet(p, 16, 4, 1.4, 0.8); shoal(p, 22, 28, 3, 1.4); shoal(p, 37, 9, 3, 1.5);
  } },
  // Route 18: a rocky island of ledges and sand above the surf, the waterfall pool and the lone house.
  BW1Route18: { theme: { ...COAST, shore: 2, density: 0.25 }, plan(p) {
    p.fill("water", 2, 33, 30, 37); p.fill("water", 2, 2, 7, 8); p.fill("water", 13, 8, 17, 9);
    cliff(p, 9, 4, 22, 3); cliff(p, 4, 15, 14, 1); cliff(p, 28, 27, 12, 1);
    p.street("sand", 2, [[4, 20], [14, 20], [14, 23], [28, 23], [28, 20], [44, 20]]); p.street("sand", 1, [[20, 23], [20, 30]]);
    p.decor("cabin", 30, 13); p.street("deck", 1, [[20, 7], [20, 12]]); p.street("sand", 1, [[31, 18], [31, 20]]);
  } },
  // Dreamyard: the roofless shell of the old works - broken walls round weed-grown rooms, deep in the woods.
  BW1Dreamyard: { theme: { ground: "grass", road: "dirt", border: "tree", tree: "tree1", density: 0.2, groves: 0.1, grove: "tree", flowers: 0.03 }, plan(p) {
    const C = [168, 160, 150];
    wall(p, 14, 14, 9, 1, C); wall(p, 27, 14, 14, 1, C); wall(p, 14, 15, 1, 4, C); wall(p, 14, 22, 1, 13, C); wall(p, 40, 15, 1, 8, C); wall(p, 40, 27, 1, 8, C);
    wall(p, 15, 34, 10, 1, C); wall(p, 30, 34, 10, 1, C); wall(p, 18, 24, 13, 1, C); wall(p, 28, 15, 1, 6, C); wall(p, 22, 28, 1, 6, C);
    p.street("dirt", 2, [[4, 20], [16, 20]]); p.street("dirt", 1, [[16, 20], [24, 20], [24, 15], [25, 13], [32, 13]]);
    for (const [x, y] of [[17, 17], [21, 17], [32, 17], [36, 17], [17, 31], [26, 31], [32, 27], [36, 27]]) pillar(p, x, y, [176, 170, 160], 8);
    p.fill("tree", 2, 2, 8, 3); p.fill("tree", 2, 30, 8, 37);
  } },
  // Pinwheel Forest's outside: the lane from Nacrene, a side track through the trees and a brook under a footbridge.
  BW1PinwheelForest: { theme: { road: "asphalt", density: 0.45, groves: 0.2, flowers: 0.08 }, plan(p) {
    p.fill("water", 38, 12, 39, 37);
    p.street("asphalt", 2, [[24, 36], [24, 26], [26, 26], [26, 14], [24, 14], [24, 4]]);
    p.street("dirt", 1, [[23, 31], [14, 31], [14, 15], [23, 15]]); p.street("dirt", 1, [[27, 23], [43, 23], [43, 31]]);
    fence(p, 28, 15, 1, 6); fence(p, 22, 17, 1, 8); p.fill("tree", 2, 2, 8, 37);
  } },
  // Inside Pinwheel Forest: the straight paved road, railed off, and the track winding through the deep wood on either side.
  BW1PinwheelInner: { theme: { ...FOREST, road: "asphalt", density: 0.55 }, plan(p) {
    p.street("asphalt", 3, [[24, 36], [24, 4]]);
    p.street("dirt", 2, [[22, 32], [14, 32], [14, 23], [6, 23], [6, 14], [14, 14], [14, 7], [22, 7]]);
    p.street("dirt", 2, [[26, 31], [30, 31], [30, 23], [42, 23], [42, 15], [30, 15], [30, 13], [26, 13]]); p.street("dirt", 1, [[36, 15], [36, 13]]);
    fence(p, 21, 9, 1, 22, [200, 204, 214]); fence(p, 27, 15, 1, 15, [200, 204, 214]); fence(p, 27, 5, 1, 7, [200, 204, 214]); fence(p, 21, 34, 1, 3, [200, 204, 214]); fence(p, 27, 33, 1, 4, [200, 204, 214]);
  } },
  // Skyarrow Bridge: the long suspension bridge - two towers, sweeping cables and the roadway.
  BW1SkyarrowBridge: { theme: { bridge: true }, plan(p) {
    northSouth(p); p.fill("asphalt", 21, 2, 25, 37); p.fill("steel", 20, 2, 20, 37); p.fill("steel", 26, 2, 26, 37);
    const St = [130, 150, 180], V = turned(p), tw = [11 * U + 5, 28 * U + 5];
    beam(V, 2, 37, 19 * U + 8, St, 8); beam(V, 2, 37, 27 * U, St, 8); dashes(p, 23, 3, 23, 36);
    cables(V, 2, 37, tw, 19 * U + 8, 150, -1); cables(V, 2, 37, tw, 27 * U + 8, 150, 1);
    for (const y of [11, 28]) { V.paint(2, (c) => { c.box(y * U, 9 * U, 10, 10 * U + 8, St, sh(St, 0.45)); c.box(y * U, 27 * U + 8, 10, 10 * U + 8, St, sh(St, 0.45)); }); gantry(V, y * U, 19 * U + 4, 27 * U + 12, St); }
  } },
  // Desert Resort: bare dunes between rock walls, a few guardian statues and broken walls before the Relic Castle.
  BW1DesertResort: { theme: { ...DESERT, density: 0.3 }, plan(p) {
    p.street("beach", 3, [[4, 20], [18, 20], [18, 21], [30, 21], [30, 20], [44, 20]]);
    for (const x of [33, 38]) { statue(p, x, 17); statue(p, x, 24); }
    wall(p, 41, 13, 5, 5, [196, 176, 132]); wall(p, 41, 23, 5, 5, [196, 176, 132]); wall(p, 40, 13, 1, 3, [176, 156, 116]); wall(p, 40, 25, 1, 3, [176, 156, 116]);
    for (const [x, y] of [[8, 8], [14, 12], [22, 8], [8, 30], [16, 33], [26, 29], [34, 32], [26, 13]]) pillar(p, x, y);
    wall(p, 4, 12, 6, 1, [196, 176, 132]); wall(p, 18, 28, 6, 1, [196, 176, 132]); wall(p, 30, 34, 8, 1, [196, 176, 132]);
  } },
  // Lostlorn Forest: looping woodland tracks, the waterfall into the pool and the lone caravan in its clearing.
  BW1LostlornForest: { theme: FOREST, plan(p) {
    cliff(p, 30, 2, 14, 3, GREY, GREYLIP); falls(p, 36, 2, 2, 3);
    p.street("dirt", 2, [[4, 20], [12, 20], [12, 26], [22, 26], [22, 18], [30, 18], [30, 14]]);
    p.street("dirt", 1, [[12, 20], [12, 10], [22, 10], [22, 18]]); p.street("dirt", 1, [[23, 26], [34, 26], [34, 32], [16, 32], [16, 27]]);
    p.fill("grass", 24, 20, 33, 24); trailer(p, 26, 21, 5, [226, 222, 204], [90, 150, 96]);
    p.fill("tree", 2, 2, 8, 6); p.fill("tree", 38, 28, 45, 37);
  } },
  // Driftveil Drawbridge: the red bascule bridge, its two gantries and the seam where the leaves meet.
  BW1DriftveilDrawbridge: { theme: { bridge: true }, plan(p) {
    northSouth(p); p.fill("asphalt", 20, 2, 26, 37);
    const R = [200, 56, 48], V = turned(p);
    beam(V, 2, 37, 19 * U + 8, R, 8); beam(V, 2, 37, 27 * U, R, 8);
    gantry(V, 11 * U, 19 * U + 2, 27 * U + 6, R); gantry(V, 28 * U, 19 * U + 2, 27 * U + 6, R);
    V.paint(0, (c) => { const y = 20 * U; for (let j = 20 * U; j < 27 * U; j += 8) c.rect(y - 2 + (j % 16 ? 3 : 0), j, 3, 8, [40, 40, 46]); for (let i = 3 * U; i < 37 * U; i += 24) if (Math.abs(i - y) > 20) c.rect(i, 23 * U + 7, 12, 2, [244, 240, 210]); c.rect(2 * U, 20 * U + 2, 36 * U, 1, [244, 240, 210]); c.rect(2 * U, 27 * U - 3, 36 * U, 1, [244, 240, 210]); });
    for (const y of [11, 28]) V.paint(0, (c) => { c.box(y * U - 4, 27 * U + 8, 18, 22, [150, 150, 160], [70, 70, 80]); c.box(y * U - 4, 17 * U, 18, 2 * U + 8, [150, 150, 160], [70, 70, 80]); c.box(y * U - 1, 14 * U + 8, 12, 3 * U, R, sh(R, 0.45)); c.box(y * U - 1, 29 * U + 8, 12, 3 * U, R, sh(R, 0.45)); });
  } },
  // Cold Storage (after the game's map): blue-roofed refrigerated warehouses and green container stacks on a grey quay yard.
  BW1ColdStorage: { theme: { ground: "gravel", road: "asphalt", border: "rock", grass: "grass", tree: "barrels", density: 0.02, groves: 0, flowers: 0, water: "sea", factory: false }, plan(p) {
    p.street("asphalt", 3, [[4, 20], [44, 20]]); p.street("asphalt", 2, [[16, 20], [16, 30], [34, 30], [34, 20]]);
    const Wr = { style: "ware", roof: [96, 130, 170], wall: [176, 176, 180], up: 1 };
    bld(p, 12, 13, 9, 4, { ...Wr, door: 4 }); bld(p, 25, 13, 9, 4, { ...Wr, door: 4 }); bld(p, 19, 23, 12, 5, { ...Wr, door: 5 }); bld(p, 36, 23, 8, 5, { ...Wr, door: 3 });
    crate(p, 6, 24, 4, [70, 150, 110]); crate(p, 6, 26, 4, [60, 136, 100]); crate(p, 11, 24, 3, [90, 150, 96]); crate(p, 6, 33, 4, [84, 160, 120]); crate(p, 22, 33, 4, [70, 150, 110]); crate(p, 27, 33, 3, [60, 136, 100]); crate(p, 39, 15, 3, [90, 150, 96]);
  } },
  // Moor of Icirrus: a path through green fen, wide shallow pools on every side.
  BW1MoorOfIcirrus: { theme: { ground: "grass", grass: "grass", water: "water", road: "dirt", density: 0.3, groves: 0.15, flowers: 0.04, puddles: 0.1 }, plan(p) {
    p.street("dirt", 2, [[4, 20], [14, 20], [14, 26], [26, 26], [26, 16], [34, 16], [34, 24], [42, 24]]);
    p.disc("water", 10, 31, 4.5, 2.6); p.disc("water", 38, 31, 4, 2.5); p.disc("water", 18, 6, 4, 2.2);
    puddle(p, 20, 21, 3.5, 2); puddle(p, 30, 21, 2, 2.6); puddle(p, 8, 15, 3, 1.6); puddle(p, 22, 31, 4, 1.8); puddle(p, 40, 17, 3, 1.8); puddle(p, 29, 9, 2, 1.2); puddle(p, 30, 33, 2.4, 1.4); puddle(p, 6, 6, 2.5, 1.5);
  } },
  // Tubeline Bridge: riveted steel lattice girders, with the subway line running alongside below.
  BW1TubelineBridge: { theme: { bridge: true }, plan(p) {
    northSouth(p); p.fill("steel", 20, 2, 26, 37);
    const St = [96, 84, 84], V = turned(p);
    railway(V, 2, 37, 15 * U + 8, 9 * U, 4); railway(V, 2, 37, 29 * U + 8, 20 * U, 0);
    truss(V, 2, 37, 18 * U + 10, 24, St); truss(V, 2, 37, 26 * U + 14, 24, St);
    for (let y = 6; y <= 34; y += 7) gantry(V, y * U - 4, 18 * U + 12, 28 * U + 4, St, 8);
    V.paint(0, (c) => { for (let i = 2 * U; i < 38 * U; i += 16) { c.rect(i, 20 * U, 1, 7 * U, [70, 80, 100]); c.rect(i + 7, 23 * U + 7, 3, 2, [200, 204, 214]); } });
  } },
  // Village Bridge: the old stone bridge on its arches, brown-roofed cottages built along its parapet at both ends, and a fishing jetty.
  BW1VillageBridge: { theme: { bridge: true, road: "deck", ground: "deck", border: "sea", water: "sea", density: 0, groves: 0, flowers: 0, rough: false }, plan(p) {
    p.fill("water", 20, 24, 26, 37); p.fill("water", 20, 2, 26, 8); p.fill("water", 20, 9, 21, 16); p.fill("water", 25, 9, 26, 16);
    p.fill("cobble", 3, 17, 44, 23);
    const Sn = [170, 164, 156];
    for (const x of [4, 12, 17, 28, 33, 38]) bld(p, x, 17, 4, 2, { up: 2, roof: [150, 96, 56], wall: [226, 214, 190] });   // the cottages on the bridge, three at each end
    p.paint(1, (c) => { for (let x = 3; x <= 44; x++) { c.rect(x * U, 24 * U, U, 12, Sn); c.rect(x * U, 24 * U, U, 2, sh(Sn, 1.2)); c.rect(x * U, 24 * U + 12, U, 2, sh(Sn, 0.5)); if (x < 20 || x > 26) { c.rect(x * U, 16 * U + 6, U, 10, Sn); c.rect(x * U, 16 * U + 6, U, 2, sh(Sn, 1.2)); } } for (let x = 4; x <= 42; x += 5) { c.box(x * U, 24 * U + 12, 14, 26, Sn, sh(Sn, 0.5)); c.ellipse(x * U + 47, 24 * U + 30, 26, 16, [30, 50, 100, 150]); c.rect(x * U - 2, 24 * U + 36, 18, 3, [236, 244, 250, 150]); } });
  } },
  // Marvelous Bridge: the white, ringed span with its blue light strips.
  BW1MarvelousBridge: { theme: { bridge: true }, plan(p) {
    eastWest(p); p.fill("paving", 3, 17, 44, 23);
    const Wt = [240, 242, 248], Cy = [90, 210, 240];
    beam(p, 3, 44, 16 * U + 6, Wt, 10); beam(p, 3, 44, 24 * U, Wt, 10);
    for (let x = 6; x <= 42; x += 6) gantry(p, x * U - 5, 15 * U + 8, 25 * U, Wt, 8);
    p.paint(0, (c) => { c.rect(3 * U, 17 * U + 3, 42 * U, 2, Cy); c.rect(3 * U, 24 * U - 5, 42 * U, 2, Cy); for (let i = 3 * U + 6; i < 45 * U; i += 32) c.rect(i, 20 * U + 7, 16, 2, Cy); for (let x = 6; x <= 42; x += 6) { c.ellipse(x * U, 13 * U, 34, 34, Wt, 3); c.ellipse(x * U, 28 * U, 34, 34, Wt, 3); } });
  } },
  // Abundant Shrine: over the brook to the little shrine, past the villagers' vegetable plots.
  BW1AbundantShrine: { theme: { ground: "meadow", density: 0.2, groves: 0.1, flowers: 0.3 }, plan(p) {
    p.fill("water", 28, 12, 29, 37); p.fill("water", 28, 8, 31, 9);
    p.street("dirt", 2, [[4, 20], [14, 20], [14, 23], [36, 23], [36, 20], [40, 20], [40, 17]]);
    bld(p, 38, 13, 4, 3, { roof: [170, 60, 50], wall: [196, 160, 110], door: 1, up: 1 });
    p.fill("flowersPink", 34, 17, 37, 18); p.fill("flowersRed", 42, 17, 44, 18);
    plots(p, 14, 27, 6, 4); plots(p, 21, 27, 5, 4, [220, 150, 60]); plots(p, 14, 32, 6, 3, [200, 80, 80]);
    p.decor("logHouse", 16, 12); p.street("dirt", 1, [[17, 18], [17, 20]]);
  } },
};
