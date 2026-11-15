// Unova (Black 2 / White 2) routes, drawn by hand. See README.md.
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
// A small cottage (4x3 tiles) built round warp k's door, for doors with too little room for a stamp.
function cottage(p, k, roof = [70, 150, 150], wall = [240, 238, 228]) {
  const v = p.warps[k], x = v.x - 1, y = v.y - 2; p.bare(k); take(p, x, y, 4, 3);
  p.paint(v.y + 0.6, (c, top) => { const s = pen(c, top, y * U), X = x * U, Y = y * U - 12; s.rect(X + 3, Y + 57, 64, 4, [0, 0, 0, 60]); s.box(X, Y + 30, 64, 30, wall, sh(wall, 0.4)); s.box(X - 2, Y, 68, 32, roof, sh(roof, 0.45)); for (let j = Y + 5; j < Y + 30; j += 5) s.rect(X - 1, j, 66, 1, sh(roof, 0.82)); s.box(v.x * U + 2, v.y * U + 1, 12, 15, [110, 76, 56], sh(wall, 0.4)); s.box(X + 40, Y + 38, 14, 10, [150, 196, 232], sh(wall, 0.4)); });
}
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

module.exports = {
  // Route 19: down the cliff ledges from Aspertia's lookout to Floccesy.
  UnovaRoute19: { theme: { density: 0.25, groves: 0.1, flowers: 0.12 }, plan(p) {
    steps(p, 19, 10, 2, 1); steps(p, 33, 16, 2, 1);
    p.street("dirt", 2, [[4, 15], [11, 15], [11, 20], [22, 20], [22, 12], [35, 12], [35, 16], [47, 16], [47, 15]]);
    cliff(p, 2, 10, 17, 1); cliff(p, 14, 17, 7, 1); cliff(p, 25, 16, 8, 1); cliff(p, 38, 20, 12, 1); cliff(p, 24, 24, 10, 1);
   
    p.fill("tree", 2, 2, 9, 3); p.fill("tree", 44, 22, 49, 27);
    p.fill("flowersRed", 26, 4, 29, 6); p.fill("flowersPink", 12, 23, 15, 25);
  } },
  // Route 20: the river and its plank bridge east of Floccesy, under autumn leaves.
  UnovaRoute20: { theme: AUTUMN, plan(p) {
    steps(p, 20, 16, 2, 1); steps(p, 46, 18, 2, 1);
    p.fill("water", 8, 2, 9, 18); p.fill("water", 9, 16, 10, 30); p.fill("water", 7, 2, 9, 3);
    p.street("dirt", 2, [[4, 26], [14, 26], [14, 23], [32, 23], [32, 26], [55, 26]]);
    p.street("dirt", 2, [[30, 23], [30, 15], [32, 15], [32, 8], [30, 8], [30, 5]]);
    p.street("dirt", 1, [[5, 26], [5, 6]]);
    cliff(p, 12, 16, 15, 1, [150, 110, 76], [206, 170, 80]); cliff(p, 40, 18, 14, 1, [150, 110, 76], [206, 170, 80]);
    p.fill("autumntree", 34, 28, 37, 37); p.fill("autumntree", 34, 2, 36, 6);
    strew(p, 2, 2, 57, 37, 0.16, LEAVES);
  } },
  // Floccesy Ranch: the farmhouse and red barn, a fenced pasture and the lane to the back fields.
  UnovaFloccesyRanch: { theme: { ground: "meadow", density: 0.18, groves: 0.08, flowers: 0.2 }, plan(p) {
    p.street("dirt", 2, [[24, 39], [24, 32], [20, 32], [20, 17], [24, 17], [24, 6]]);
    p.street("dirt", 1, [[20, 17], [12, 17], [12, 15]]);
    p.decor("logHouse", 8, 8);
    bld(p, 30, 7, 8, 5, { style: "ware", roof: [222, 104, 56], wall: [150, 120, 100], door: 4, doorCol: [236, 230, 214], up: 1 });
    // Reference (pokewiki S2W2 render): orange barn roofs, and a stream down the east edge of the ranch.
    p.fill("water", 44, 2, 45, 41);
    p.fill("grass", 28, 17, 41, 30); fence(p, 28, 17, 14, 1); fence(p, 28, 30, 14, 1); fence(p, 28, 18, 1, 5); fence(p, 28, 26, 1, 4); fence(p, 41, 18, 1, 12);
    for (const [x, y] of [[40, 9], [41, 9], [40, 10], [39, 12], [31, 20], [38, 27]]) bale(p, x, y);
    p.fill("tree", 2, 2, 5, 12);
    p.fill("flowersPink", 30, 34, 36, 37);
  } },
  // The ranch's back pastures: three fenced fields one behind the other.
  UnovaRanchBack: { theme: { ground: "meadow", density: 0.2, groves: 0.1, flowers: 0.15 }, plan(p) {
    p.street("dirt", 2, [[20, 37], [20, 31], [32, 31], [32, 17], [11, 17], [11, 8]]);
    fence(p, 3, 12, 6, 1); fence(p, 14, 12, 25, 1); fence(p, 3, 22, 27, 1); fence(p, 35, 22, 4, 1);
    bld(p, 28, 3, 6, 4, { style: "ware", roof: [180, 60, 52], wall: [206, 96, 80], door: 2, doorCol: [236, 230, 214] });
    for (const [x, y] of [[25, 5], [25, 6], [26, 6], [36, 26], [37, 26], [5, 19]]) bale(p, x, y);
    p.fill("water", 34, 34, 38, 37);
  } },
  // Virbank Complex: the paved works road between pipe runs, tanks and scaffolds.
  UnovaVirbankComplex: { theme: { ground: "gravel", road: "darkpave", border: "rock", tree: "barrels", density: 0.1, groves: 0, flowers: 0, factory: false }, plan(p) {
    p.street("darkpave", 3, [[24, 4], [24, 9], [20, 9], [20, 20], [24, 20], [24, 35]]);
    p.street("darkpave", 2, [[20, 16], [8, 16]]); p.street("darkpave", 2, [[24, 28], [40, 28], [40, 16]]);
    pipe(p, 27, 7, 17, 1); pipe(p, 43, 8, 1, 6); pipe(p, 3, 26, 15, 1); pipe(p, 17, 27, 1, 8); pipe(p, 14, 3, 1, 9);
    tank(p, 28, 10, 3, 3); tank(p, 32, 10, 3, 3); tank(p, 36, 10, 3, 3); tank(p, 4, 4, 3, 3, [190, 170, 150]); tank(p, 8, 4, 3, 3, [190, 170, 150]);
    scaffold(p, 28, 21, 6, 3); scaffold(p, 30, 33, 5, 3); scaffold(p, 4, 30, 4, 3);
    crate(p, 36, 22, 3, [70, 120, 180]); crate(p, 36, 24, 3, [190, 80, 60]); crate(p, 40, 34, 4, [90, 150, 96]); crate(p, 10, 34, 3, [220, 170, 60]);
  } },
  // The work yard inside the Complex: a paved cross of lanes around the plant, tank farm and container rows.
  UnovaComplexInterior: { theme: { ground: "gravel", road: "darkpave", border: "rock", tree: "barrels", density: 0.1, groves: 0, flowers: 0, factory: false }, plan(p) {
    p.street("darkpave", 3, [[22, 4], [22, 38]]); p.street("darkpave", 2, [[5, 14], [39, 14]]); p.street("darkpave", 2, [[5, 28], [39, 28]]);
    p.street("darkpave", 2, [[5, 6], [5, 14]]); p.street("darkpave", 2, [[35, 28], [35, 39]]);
    bld(p, 27, 4, 12, 6, { style: "ware", roof: [120, 130, 150], wall: [200, 204, 212], door: 5, up: 1 });
    tank(p, 8, 4, 3, 3); tank(p, 12, 4, 3, 3); tank(p, 16, 4, 3, 3); tank(p, 8, 8, 3, 3); tank(p, 12, 8, 3, 3);
    pipe(p, 3, 20, 15, 1); pipe(p, 26, 20, 15, 1); pipe(p, 12, 31, 1, 9); pipe(p, 28, 31, 1, 8);
    scaffold(p, 26, 22, 6, 3); scaffold(p, 4, 32, 5, 3); scaffold(p, 14, 34, 5, 3);
    crate(p, 8, 23, 4, [70, 120, 180]); crate(p, 8, 25, 4, [190, 80, 60]); crate(p, 14, 23, 3, [90, 150, 96]); crate(p, 34, 23, 4, [220, 170, 60]); crate(p, 34, 25, 4, [70, 120, 180]); crate(p, 38, 34, 3, [190, 80, 60]);
  } },
  // Castelia's secluded garden: a ring walk round a flower bed behind the sewer grate.
  UnovaCasteliaGarden: { theme: { ground: "lawn", road: "cobble", tree: "tree1", density: 0.2, groves: 0, flowers: 0.2 }, plan(p) {
    p.street("cobble", 2, [[15, 24], [15, 19]]); p.street("cobble", 1, [[9, 19], [20, 19], [20, 9], [9, 9], [9, 19]]); p.street("cobble", 1, [[15, 9], [15, 6]]);
    p.fill("flowersPink", 11, 11, 18, 17); p.fill("flowersRed", 13, 13, 16, 15);
    p.fill("tree", 2, 2, 5, 4); p.fill("tree", 24, 2, 27, 4); p.fill("tree", 2, 21, 6, 25); p.fill("tree", 23, 21, 27, 25);
    p.decor("bench", 7, 13); p.decor("bench", 22, 10); for (let x = 9; x <= 20; x += 11) for (const y of [7, 21]) p.decor("hedge", x, y);
  } },
  // Route 4 (B2W2): the half-built highway in the sandstorm, work sites and the new houses.
  UnovaRoute4: { theme: { ...DESERT, house: ["flat"] }, plan(p) {
    // Reference (pokewiki S2 render): in Black 2/White 2 the highway is finished - one unbroken asphalt road with flat-roofed
    // blocks beside it, the sandy work site to the west and the sea in the south-west corner. The gap and its cones are gone.
    p.street("asphalt", 3, [[26, 43], [26, 4]]);
    dashes(p, 26, 5, 26, 42);
    p.street("beach", 2, [[25, 25], [16, 25], [16, 24], [4, 24]]); p.street("beach", 1, [[4, 21], [4, 24]]);
    p.street("beach", 2, [[27, 28], [36, 28], [36, 34], [46, 34]]); p.street("beach", 1, [[38, 26], [38, 28]]); p.street("beach", 1, [[44, 30], [44, 34]]); p.street("beach", 1, [[44, 22], [41, 22], [41, 28]]);
    p.street("beach", 1, [[24, 11], [30, 11]]);
    scaffold(p, 30, 15, 4, 3); scaffold(p, 18, 13, 4, 2); crate(p, 31, 20, 3, [220, 170, 60]); crate(p, 17, 17, 2, [190, 80, 60]);
    wall(p, 33, 38, 6, 1, [190, 170, 130]); wall(p, 18, 30, 1, 6, [190, 170, 130]); wall(p, 34, 5, 8, 1, [190, 170, 130]);
  } },
  // The excavation site off Route 4: diggers' cabins among half-buried walls and columns.
  UnovaRoute4Ruins: { theme: { ...DESERT, house: ["peak", "gable"], density: 0.15 }, plan(p) {
    p.street("beach", 2, [[4, 16], [4, 20], [24, 20]]); p.street("beach", 1, [[18, 18], [18, 20]]); p.street("beach", 1, [[7, 20], [7, 21]]);
    p.street("beach", 2, [[22, 20], [22, 24], [32, 24]]); p.street("beach", 1, [[27, 23], [27, 24]]); p.street("beach", 1, [[28, 16], [24, 16], [24, 20]]);
    p.street("beach", 1, [[19, 8], [19, 10], [14, 10], [14, 20]]);
    wall(p, 3, 4, 7, 1, [196, 176, 132]); wall(p, 3, 5, 1, 3, [196, 176, 132]); wall(p, 8, 26, 9, 1, [196, 176, 132]); wall(p, 31, 26, 2, 3, [196, 176, 132]); wall(p, 31, 3, 2, 2, [196, 176, 132]);
    for (const [x, y] of [[11, 8], [11, 12], [13, 23], [16, 23], [30, 22], [33, 12], [5, 24], [22, 27], [25, 27]]) pillar(p, x, y);
  } },
  // Desert Resort's approach: a track winding between dunes and fallen columns.
  UnovaDesertEntrance: { theme: { ...DESERT, density: 0.35 }, plan(p) {
    p.street("beach", 2, [[35, 23], [28, 23], [28, 17], [18, 17], [18, 11], [9, 11], [9, 8], [5, 8]]);
    for (const [x, y] of [[26, 15], [30, 19], [16, 15], [20, 13], [11, 13], [7, 5]]) pillar(p, x, y);
    wall(p, 22, 22, 4, 1, [196, 176, 132]); wall(p, 30, 8, 5, 1, [196, 176, 132]); wall(p, 6, 18, 1, 4, [196, 176, 132]);
    p.fill("rock", 2, 24, 12, 27); p.fill("rock", 26, 2, 37, 4);
  } },
  // Desert Resort: the avenue of statues and columns up to the Relic Castle.
  UnovaDesertResort: { theme: { ...DESERT, density: 0.3 }, plan(p) {
    // Reference (pokewiki S2W2 render): a sand basin with darker deep-sand patches and the sea along its north rim; the
    // statue avenue is our own arrangement of the Darmanitan statues.
    p.fill("water", 2, 2, 14, 2); p.fill("water", 36, 2, 51, 2);
    for (const [x0, y0, x1, y1] of [[8, 16, 14, 20], [32, 20, 37, 24], [12, 26, 18, 29], [38, 14, 44, 17], [33, 32, 38, 35]]) p.fill("sand", x0, y0, x1, y1);
    p.street("beach", 3, [[27, 40], [27, 31], [25, 31], [25, 9]]);
    wall(p, 17, 4, 6, 3, [196, 176, 132]); wall(p, 28, 4, 6, 3, [196, 176, 132]); wall(p, 17, 3, 17, 1, [176, 156, 116]);
    for (const y of [11, 15, 19, 23, 27]) { statue(p, 22, y); statue(p, 28, y); }
    for (const [x, y] of [[20, 9], [30, 9], [14, 12], [36, 12], [12, 18], [38, 18], [40, 30], [9, 30], [16, 36], [38, 36]]) pillar(p, x, y);
    wall(p, 6, 10, 5, 1, [196, 176, 132]); wall(p, 6, 11, 1, 4, [196, 176, 132]); wall(p, 42, 8, 6, 1, [196, 176, 132]); wall(p, 47, 9, 1, 4, [196, 176, 132]); wall(p, 40, 26, 7, 1, [196, 176, 132]); wall(p, 6, 38, 6, 1, [196, 176, 132]);
  } },
  // Big Stadium's practice pitch: a lined field under the stands.
  UnovaBigStadium: { theme: { ground: "paving", road: "cobble", tree: "hedge", density: 0, groves: 0, flowers: 0 }, plan(p) {
    p.fill("lawn", 3, 6, 32, 22); p.street("cobble", 2, [[18, 25], [18, 23]]);
    stand(p, 3, 2, 14, 2); stand(p, 19, 2, 14, 2, [200, 70, 70]);
    p.paint(0, (c) => { const L = [244, 244, 240], X = 3 * U + 4, Y = 6 * U + 4, Wd = 30 * U - 8, Ht = 17 * U - 8; c.rect(X, Y, Wd, 2, L); c.rect(X, Y + Ht - 2, Wd, 2, L); c.rect(X, Y, 2, Ht, L); c.rect(X + Wd - 2, Y, 2, Ht, L); c.rect(X + Wd / 2 - 1, Y, 2, Ht, L); c.ellipse(X + Wd / 2, Y + Ht / 2, 30, 30, L, 2); c.box(X, Y + Ht / 2 - 40, 44, 80, [0, 0, 0, 0], L); c.box(X + Wd - 44, Y + Ht / 2 - 40, 44, 80, [0, 0, 0, 0], L); });
  } },
  // Route 5: the performers' paved road, its little square and the caravan.
  UnovaRoute5: { theme: { road: "asphalt", density: 0.3, groves: 0.12, flowers: 0.12 }, plan(p) {
    p.street("asphalt", 3, [[36, 16], [27, 16], [27, 17], [11, 17], [11, 16], [3, 16]]);
    p.fill("asphalt", 14, 13, 23, 20); p.street("asphalt", 1, [[28, 23], [28, 18]]);
    trailerDoor(p, 3);
    p.decor("bench", 13, 13); p.decor("bench", 24, 13); p.decor("bench", 13, 19); p.decor("bench", 24, 19);
    p.fill("tree", 2, 2, 37, 3); p.fill("tree", 2, 30, 37, 31);
    // Reference (pokewiki S2W2 render): a broad grey asphalt road and square (not cobbles), woods both sides, and the sea at the west end by the drawbridge.
    p.fill("water", 2, 4, 3, 12); p.fill("water", 2, 20, 3, 29);
  } },
  // Driftveil Drawbridge: the red bascule bridge, its two gantries and the seam where the leaves meet.
  UnovaDriftveilDrawbridge: { theme: { bridge: true }, plan(p) {
    // Reference (pokewiki render): the deck is pale cream planking between the red girders, not asphalt.
    p.fill("paving", 2, 13, 45, 19);
    const R = [200, 56, 48];
    beam(p, 2, 45, 12 * U + 8, R, 8); beam(p, 2, 45, 20 * U, R, 8);
    gantry(p, 15 * U, 12 * U + 2, 20 * U + 6, R); gantry(p, 32 * U, 12 * U + 2, 20 * U + 6, R);
    p.paint(0, (c) => { const x = 24 * U; for (let j = 13 * U; j < 20 * U; j += 8) { c.rect(x - 2 + (j % 16 ? 3 : 0), j, 3, 8, [40, 40, 46]); } for (let i = 3 * U; i < 45 * U; i += 24) if (Math.abs(i - x) > 20) c.rect(i, 16 * U + 7, 12, 2, [200, 180, 140]); c.rect(2 * U, 13 * U + 2, 44 * U, 1, [244, 240, 210]); c.rect(2 * U, 20 * U - 3, 44 * U, 1, [244, 240, 210]); });
    for (const x of [15, 32]) p.paint(0, (c) => { c.box(x * U - 4, 20 * U + 8, 18, 22, [150, 150, 160], [70, 70, 80]); c.box(x * U - 4, 9 * U + 8, 18, 3 * U, [150, 150, 160], [70, 70, 80]); c.box(x * U - 1, 7 * U, 12, 3 * U, R, sh(R, 0.45)); });
  } },
  // Route 6: the river and its wooden bridge, the Season Research Lab and the Chargestone Cave mouth.
  UnovaRoute6: { theme: { density: 0.4, groves: 0.18, flowers: 0.1 }, plan(p) {
    p.street("dirt", 2, [[42, 32], [36, 32], [36, 26], [28, 26], [28, 17], [26, 17]]); p.street("deck", 3, [[17, 17], [25, 17]]);
    p.street("dirt", 2, [[16, 17], [13, 17], [13, 8]]);
    p.street("dirt", 2, [[28, 17], [28, 11], [33, 11], [33, 10]]); p.street("dirt", 2, [[29, 11], [29, 5]]);
    p.fill("rock", 38, 2, 43, 8); p.fill("rock", 31, 2, 37, 3);
    // Reference (pokewiki S2W2 render): the Season Research Lab has a blue roof and the house west of the river an orange one;
    // the whole south-west is unbroken forest.
    p.building(1, "gable", { tint: p.roof(0.35, 0.85, 1.9) }); p.building(6, "gable", { tint: p.roof(1.6, 0.9, 0.5) });
    p.fill("tree", 2, 20, 9, 31); p.fill("tree", 34, 15, 38, 18);
    fence(p, 17, 15, 1, 1); fence(p, 25, 15, 1, 1); fence(p, 17, 19, 1, 1); fence(p, 25, 19, 1, 1);
  } },
  // Route 7: raised board walks over the tall grass, and Celestial Tower above the trees.
  UnovaRoute7: { theme: { ground: "grass", road: "dirt", border: "tree", tree: "tree1", density: 0.2, groves: 0.1, flowers: 0.05, house: ["cabin", "logHouse"] }, plan(p) {
    p.street("dirt", 2, [[21, 40], [21, 33], [27, 33], [27, 21], [21, 21], [21, 12], [18, 12], [18, 10]]);
    p.street("dirt", 2, [[27, 21], [33, 21], [33, 9], [37, 9], [37, 8]]); p.street("dirt", 1, [[24, 15], [22, 15]]);
    p.street("deck", 1, [[20, 37], [10, 37], [10, 28], [5, 28], [5, 27]]); p.street("deck", 1, [[10, 28], [10, 16], [20, 16]]); p.street("deck", 1, [[10, 22], [16, 22], [16, 26], [26, 26]]);
    p.street("deck", 1, [[28, 30], [36, 30], [36, 24], [33, 24]]);
    // Reference (pokewiki S2W2 render): Celestial Tower is a pale stone spiral tower (not a glass block) and both houses have red roofs.
    p.bare(1); for (let y = 6; y <= 9; y++) for (let x = 16; x <= 20; x++) if (!(x === 18 && y === 9)) p.block(x, y, 1, 1);
    p.paint(10.6, (c, top) => { const s = pen(c, top, 6 * U), cx = 18 * U + 8, base = 10 * U; s.ellipse(cx + 3, base - 2, 44, 7, [0, 0, 0, 60]);
      for (let k = 0; k < 7; k++) { const w = 84 - k * 10, y = base - 19 - k * 16; s.box(cx - w / 2, y, w, 19, [222, 218, 204], [128, 122, 116]); s.rect(cx - w / 2 + 1, y + 1, w - 2, 3, [240, 238, 228]); s.rect(cx + w / 2 - 9, y + 4, 8, 14, [190, 186, 174]); for (let i = cx - w / 2 + 8; i < cx + w / 2 - 12; i += 12) if (k) s.rect(i, y + 8, 4, 7, [90, 100, 120]); }
      s.poly([[cx - 12, base - 19 - 6 * 16], [cx, base - 19 - 6 * 16 - 16], [cx + 12, base - 19 - 6 * 16]], [200, 196, 184]);
      s.box(18 * U + 1, 9 * U + 1, 14, 15, [50, 46, 60], [128, 122, 116]); });
    const red = p.roof(1.5, 0.45, 0.5); p.building(4, "gable", { tint: red }); p.building(5, "gable", { tint: red });
    p.fill("rock", 34, 2, 39, 5);
    p.fill("tree", 2, 2, 7, 5); p.fill("tree", 23, 2, 30, 6);
  } },
  // Undella Bay: the strand below the town and the dark shape of the Abyssal Ruins out in the bay.
  UnovaUndellaBay: { theme: { ground: "beach", road: "sand", border: "rock", tree: "boulder", density: 0.08, groves: 0, flowers: 0, water: "sea" }, plan(p) {
    p.street("sand", 2, [[5, 29], [14, 29], [14, 30], [30, 30], [30, 29], [39, 29]]);
    // Reference (pokewiki S2W2 render): open sea crossed by chains of rocks, with a few sandy islets and several dark dive
    // spots; no palms or parasols. (The strand along the south is our walkway between the two fixed exits.)
    p.fill("rock", 36, 26, 41, 27);
    islet(p, 14, 9, 2.4, 1.3); islet(p, 31, 17, 2.6, 1.2); islet(p, 27, 22, 1.6, 1); islet(p, 35, 8, 1.4, 2);
    p.paint(0.2, (c) => { for (let k = 0; k < 26; k++) { const x = (5 + k * 1.3) * U, y = (5.5 + Math.sin(k * 0.5) * 1.6 + (k > 14 ? (k - 14) * 0.9 : 0)) * U; c.ellipse(x, y, 5, 4, [90, 92, 104]); c.ellipse(x - 1, y - 1, 3, 2, [160, 164, 176]); } });
    shoal(p, 22, 12, 6, 4, [20, 40, 90, 130]); shoal(p, 22, 12, 3.5, 2.2, [16, 30, 70, 150]); shoal(p, 9, 20, 4, 2); shoal(p, 34, 21, 4, 2); shoal(p, 33, 7, 3, 1.5);
    shoal(p, 10, 14, 1.6, 1, [16, 30, 70, 150]); shoal(p, 36, 15, 1.6, 1, [16, 30, 70, 150]);
  } },
  // Route 13: the cliff path above the sea, with wooden steps down the ledges and the shore below.
  UnovaRoute13: { theme: { ...COAST, density: 0.25 }, plan(p) {
    steps(p, 10, 27, 2, 1, [176, 140, 96]); steps(p, 12, 11, 2, 1, [176, 140, 96]);
    p.street("sand", 2, [[23, 38], [23, 31], [26, 31], [26, 24], [22, 24], [22, 14], [25, 14], [25, 7], [23, 7], [23, 3]]);
    p.street("sand", 1, [[22, 17], [4, 17], [4, 15]]); p.street("sand", 1, [[15, 23], [15, 24], [22, 24]]);
    cliff(p, 2, 27, 17, 1); cliff(p, 8, 11, 10, 1); cliff(p, 28, 6, 1, 10); cliff(p, 28, 22, 1, 8); cliff(p, 41, 10, 3, 1); cliff(p, 41, 24, 3, 1);
   
    // Reference (pokewiki S2W2 render): the two houses are small white cottages with teal roofs (they were drawn as Pokemon Centers).
    cottage(p, 4); cottage(p, 5);
    p.fill("tree", 2, 2, 12, 4); p.fill("tree", 30, 35, 36, 39);
  } },
  // Route 12: rolling grassy hills between Lacunosa and Village Bridge.
  // Reference (pokewiki S2W2 render): the hills are low green grass terraces (no bare earth banks), with only a sprinkle of
  // pale flowers and a broad band of tall grass; the three bright flower beds were ours and are gone.
  UnovaRoute12: { theme: { ground: "meadow", density: 0.15, groves: 0.1, flowers: 0.05 }, plan(p) {
    const T = [[104, 168, 112], [150, 206, 150]];
    p.street("dirt", 2, [[36, 16], [30, 16], [30, 12], [22, 12], [22, 20], [12, 20], [12, 16], [3, 16]]);
    cliff(p, 13, 8, 8, 1, T[0], T[1]); cliff(p, 12, 9, 1, 2, T[0], T[1]); cliff(p, 21, 9, 1, 2, T[0], T[1]); cliff(p, 24, 24, 10, 1, T[0], T[1]); cliff(p, 24, 25, 1, 2, T[0], T[1]); cliff(p, 33, 25, 1, 2, T[0], T[1]); cliff(p, 4, 23, 7, 1, T[0], T[1]); cliff(p, 28, 5, 6, 1, T[0], T[1]);
  } },
  // Route 11: the waterfall and its stream under the footbridge, and the traveller's caravan.
  UnovaRoute11: { theme: { density: 0.35, groves: 0.15, flowers: 0.08 }, plan(p) {
    p.fill("water", 16, 9, 18, 31); p.fill("water", 14, 9, 20, 12); p.fill("water", 16, 2, 18, 4);
    steps(p, 10, 5, 2, 4); cliff(p, 2, 5, 14, 4); cliff(p, 19, 7, 13, 2); falls(p, 16, 5, 3, 4);
    // Reference (pokewiki S2W2 render): a grey asphalt road carried over the river on a bridge, and brown earth cliffs.
    p.street("asphalt", 3, [[36, 16], [28, 16], [28, 18], [10, 18], [10, 16], [3, 16]]); p.street("dirt", 1, [[25, 14], [25, 17], [28, 17]]);
    trailerDoor(p, 2, 5, [232, 226, 206], [70, 130, 190]);
    p.street("dirt", 1, [[20, 6], [20, 5], [34, 5], [34, 15]]);
    p.fill("tree", 2, 28, 12, 31);
  } },
  // Route 9: the motorway past Shopping Mall Nine and its car park.
  UnovaRoute9: { theme: { road: "asphalt", density: 0.3, groves: 0.1, flowers: 0.05, big: ["hall", "academy", "mart"] }, plan(p) {
    p.street("asphalt", 4, [[36, 16], [4, 16]]); dashes(p, 5, 16, 35, 16);
    p.fill("asphalt", 12, 10, 27, 13); p.building(1, "hall");
    p.paint(0, (c) => { for (let i = 12 * U + 8; i < 28 * U; i += 16) { if (Math.abs(i - 19 * U - 8) < 20) continue; c.rect(i, 11 * U + 4, 1, 22, [244, 240, 210]); } c.rect(12 * U, 14 * U - 1, 16 * U, 1, [244, 240, 210]); });
    fence(p, 5, 19, 12, 1, [200, 204, 214]); fence(p, 22, 19, 13, 1, [200, 204, 214]); fence(p, 5, 13, 6, 1, [200, 204, 214]); fence(p, 29, 13, 6, 1, [200, 204, 214]);
    p.fill("tree", 2, 30, 37, 31);
  } },
  // Route 22: terraced hills climbing west from Humilau to the Giant Chasm.
  UnovaRoute22: { theme: { ...MOUNTAIN, ground: "grass", road: "dirt", border: "tree", tree: "tree1", density: 0.3 }, plan(p) {
    // Reference (pokewiki S2W2 render): brown earth ledges and earth paths in a forest, with Humilau's beach and the sea at the east end.
    p.fill("beach", 40, 8, 43, 36); p.fill("water", 42, 8, 43, 29);
    steps(p, 18, 28, 2, 1); steps(p, 30, 13, 2, 1);
    p.street("dirt", 2, [[42, 32], [34, 32], [34, 24], [24, 24], [24, 17], [14, 17], [14, 9], [6, 9], [6, 6], [4, 6], [4, 5]]);
    cliff(p, 8, 28, 23, 1); cliff(p, 26, 20, 8, 1); cliff(p, 36, 20, 8, 1); cliff(p, 2, 13, 12, 1); cliff(p, 16, 13, 25, 1);
   
    p.fill("rock", 2, 2, 2, 4); p.fill("rock", 8, 2, 16, 3); p.fill("tree", 36, 2, 43, 6);
  } },
  // Route 21: open sea between Humilau's jetty island and the Seaside Cave rock.
  UnovaRoute21: { theme: { ground: "beach", road: "sand", border: "rock", tree: "boulder", density: 0, groves: 0, flowers: 0, water: "sea", rough: false }, plan(p) {
    p.street("sand", 2, [[20, 5], [20, 10]]); p.street("sand", 2, [[20, 37], [20, 32]]);
    shoal(p, 20, 21, 7, 3); shoal(p, 9, 14, 4, 2); shoal(p, 31, 27, 4, 2); shoal(p, 30, 8, 3, 2); shoal(p, 9, 34, 3, 2);
    // Reference (pokewiki S2W2 render): the sea is broken up by brown rock islets (some with palms) and long chains of
    // wave-washed rocks; added both. The two sand spits are our landings for the fixed exits.
    islet(p, 8, 9, 1.4, 2.4); islet(p, 31, 12, 1.4, 2.6); islet(p, 12, 26, 2.2, 1.3); islet(p, 30, 30, 1.6, 1);
    p.paint(0.2, (c) => { const rock = (x, y) => { c.ellipse(x, y + 4, 8, 2, [236, 244, 250, 120]); c.ellipse(x, y, 6, 5, [90, 92, 104]); c.ellipse(x - 1, y - 1, 4, 3, [160, 164, 176]); };
      for (let k = 0; k < 20; k++) rock((6 + k * 1.5) * U, (17 + Math.sin(k * 0.45) * 2.2) * U); for (let k = 0; k < 9; k++) rock((27 + Math.cos(k * 0.5) * 6) * U, (24 + k * 1.2) * U); });
  } },
  // Giant Chasm's crater forest: a winding track through dark woods ringed by the crater wall, with a still pond.
  UnovaGiantChasmForest: { theme: { ground: "shade", grass: "darkgrass", border: "rock", tree: "tree1", treeTint: "dark", density: 0.5, groves: 0.3, grove: "darktree", flowers: 0 }, plan(p) {
    p.street("dirt", 2, [[24, 37], [24, 30], [16, 30], [16, 20], [24, 20], [24, 14], [32, 14], [32, 8], [24, 8], [24, 5]]);
    p.street("dirt", 1, [[25, 31], [40, 31], [40, 35]]);
    for (const [x0, y0, x1, y1] of [[2, 2, 10, 3], [2, 4, 6, 6], [2, 7, 3, 10], [37, 2, 45, 3], [41, 4, 45, 6], [44, 7, 45, 10], [2, 32, 3, 35], [2, 36, 2, 39], [6, 38, 12, 39]]) p.fill("rock", x0, y0, x1, y1);
    // Reference (pokewiki S2W2 crater render): no ponds - the middle of the crater is a wide bare sand hollow ringed by dead
    // trees, with the forest round it.
    p.disc("sand", 24, 21, 8, 5.5);
    for (let k = 0; k < 14; k++) { const a = k * 0.449, x = Math.round(24 + Math.cos(a) * 10), y = Math.round(21 + Math.sin(a) * 7); if (!take(p, x, y, 1, 1).length) continue; p.paint(y + 1, (c, top) => { const X = x * U + 8, Y = y * U + 14; top.line(X, Y - 14, X - 7, Y - 26, [120, 96, 70], 2); top.line(X, Y - 16, X + 8, Y - 28, [120, 96, 70], 2); c.line(X, Y, X, Y - 14, [120, 96, 70], 3); }); }
  } },
  // Route 23: the river gorge below Victory Road: waterfall, bridge and the cabins on the far bank.
  UnovaRoute23: { theme: { ...MOUNTAIN, ground: "grass", border: "tree", tree: "tree1", density: 0.35, groves: 0.2, house: ["cabin"] }, plan(p) {
    // Reference (pokewiki S2W2 render): brown earth cliffs in thick forest (no grey rock rim), the stream in the east with grey
    // gravel banks, dark timber cabins beside it.
    steps(p, 36, 14, 2, 2); steps(p, 9, 24, 2, 1);
    p.fill("water", 30, 2, 32, 41); p.fill("water", 29, 16, 33, 19);
    cliff(p, 26, 14, 4, 2); cliff(p, 33, 14, 13, 2); falls(p, 30, 14, 3, 2);
    p.street("gravel", 2, [[24, 39], [24, 30], [20, 30], [20, 20], [24, 20], [24, 10], [22, 10], [22, 6], [24, 6], [24, 4]]);
    p.street("gravel", 2, [[24, 34], [40, 34]]); p.street("gravel", 2, [[36, 34], [36, 16]]); p.street("gravel", 2, [[36, 13], [40, 13]]);
    cliff(p, 2, 24, 14, 1); cliff(p, 4, 14, 12, 1);
    p.fill("tree", 2, 2, 8, 3); p.fill("tree", 33, 2, 45, 4); p.fill("gravel", 28, 20, 29, 33); p.fill("gravel", 33, 20, 34, 33);
  } },
  // Victory Road's cliffs: four terraces joined by zigzag stone stairs up to the castle ledge.
  UnovaVictoryRoadCliffs: { theme: { ...MOUNTAIN, density: 0.2 }, plan(p) {
    steps(p, 30, 25, 2, 2); steps(p, 10, 17, 2, 2); steps(p, 28, 12, 2, 2); steps(p, 14, 7, 2, 2);
    cliff(p, 2, 25, 38, 2, GREY, GREYLIP); cliff(p, 2, 17, 38, 2, GREY, GREYLIP); cliff(p, 2, 12, 38, 2, GREY, GREYLIP); cliff(p, 2, 7, 38, 2, GREY, GREYLIP);
   
    p.street("gravel", 2, [[21, 31], [21, 29], [30, 29], [30, 27]]); p.street("gravel", 2, [[30, 24], [30, 22], [10, 22], [10, 19]]); p.street("gravel", 2, [[10, 16], [10, 15], [28, 15], [28, 14]]);
    p.street("gravel", 2, [[28, 11], [28, 10], [14, 10], [14, 9]]); p.street("gravel", 2, [[14, 6], [14, 5]]); p.street("gravel", 2, [[6, 5], [35, 5], [35, 4]]); p.street("gravel", 2, [[21, 30], [5, 30], [5, 31]]);
  } },
  // Route 16: the straight paved road east of Nimbasa, with the forest track turning off north.
  UnovaRoute16: { theme: { road: "asphalt", density: 0.35, groves: 0.15, flowers: 0.05 }, plan(p) {
    p.street("asphalt", 3, [[4, 16], [14, 16], [14, 17], [27, 17], [27, 16], [36, 16]]);
    p.street("dirt", 2, [[20, 16], [20, 10], [22, 10], [22, 6], [20, 6], [20, 4]]);
    // Reference (pokewiki S2W2 render): a grey asphalt road with brown lattice fences, dense forest north and south.
    p.fill("tree", 2, 2, 14, 4); p.fill("tree", 26, 2, 37, 4); p.fill("tree", 2, 29, 37, 31);
    fence(p, 6, 14, 8, 1); fence(p, 24, 14, 10, 1); fence(p, 6, 19, 28, 1);
  } },
  // Lostlorn Forest: looping woodland tracks, the waterfall pool and the lone caravan in the clearing.
  UnovaLostlornForest: { theme: { ground: "shade", grass: "shadegrass", density: 0.5, groves: 0.3, flowers: 0.03 }, plan(p) {
    p.street("dirt", 2, [[21, 35], [21, 28], [14, 28], [14, 20], [22, 20], [22, 13], [21, 13], [21, 8]]);
    p.street("dirt", 1, [[14, 20], [9, 20], [9, 12]]); p.street("dirt", 1, [[23, 20], [32, 20], [32, 28], [22, 28]]);
    // Reference (pokewiki S2W2 render): a wide sunlit clearing with tree stumps in the north, the brook with its little fall
    // on the EAST side (it was in the north-west), brown earth bank; the caravan stands in the clearing.
    p.fill("meadow", 8, 5, 30, 11); trailer(p, 15, 4, 5, [226, 222, 204], [90, 150, 96]);
    for (const [x, y] of [[10, 6], [28, 6], [29, 10], [9, 10]]) if (take(p, x, y, 1, 1).length) p.paint(y + 1, (c) => { const X = x * U, Y = y * U; c.ellipse(X + 8, Y + 11, 7, 4, [96, 70, 50]); c.box(X + 2, Y + 3, 12, 8, [140, 100, 70], [80, 56, 40]); c.ellipse(X + 8, Y + 4, 6, 3, [206, 170, 120]); });
    cliff(p, 28, 14, 11, 3); falls(p, 34, 14, 2, 3); p.fill("water", 34, 17, 35, 22); p.disc("water", 34.5, 23, 3, 2);
    p.fill("tree", 2, 2, 7, 12); p.fill("tree", 31, 2, 36, 3);
  } },
  // Route 14: the misty river and its waterfall between the cliffs, with the side path to the shrine.
  UnovaRoute14: { theme: { density: 0.3, groves: 0.15, flowers: 0.05, shore: 1 }, plan(p) {
    steps(p, 18, 16, 2, 2); cliff(p, 2, 16, 26, 2); falls(p, 28, 16, 8, 2); cliff(p, 36, 16, 4, 2);
    p.street("dirt", 2, [[21, 5], [21, 12], [18, 12], [18, 20], [22, 20], [22, 28], [21, 28], [21, 35]]); p.street("dirt", 2, [[22, 26], [5, 26]]);
    // Reference (pokewiki S2W2 render): brown earth cliffs (they were grey stone); river and falls in the east as here.
    rapids(p, 28, 18, 35, 22, 0, 1); p.fill("rock", 2, 2, 12, 4); p.fill("tree", 2, 34, 12, 37);
  } },
  // Abundant Shrine: over the brook to the little shrine, past the pond and the villagers' vegetable plots.
  UnovaAbundantShrine: { theme: { ground: "meadow", density: 0.3, groves: 0.25, flowers: 0.04, house: ["cabin"] }, plan(p) {
    // Reference (pokewiki render): forest terraces on brown earth ledges, dark tilled plots, a small pond up by the shrine and
    // a larger one in the south, and one dark timber house. (The brook right across the map and the bright crops were ours.)
    p.disc("water", 28, 5.5, 3, 1.5); p.disc("water", 13, 30, 4, 2.2);
    p.street("dirt", 2, [[21, 35], [21, 27], [17, 27], [17, 20], [21, 20], [21, 7]]); p.street("dirt", 1, [[25, 31], [22, 31]]);
    steps(p, 21, 10, 2, 1); cliff(p, 4, 10, 17, 1); cliff(p, 23, 10, 14, 1); steps(p, 17, 24, 2, 1); cliff(p, 6, 24, 11, 1); cliff(p, 19, 24, 16, 1);
    bld(p, 19, 2, 4, 3, { roof: [150, 70, 50], wall: [150, 110, 80], door: 1, up: 1 });
    const SOIL = [96, 70, 56]; plots(p, 8, 13, 6, 2, SOIL); plots(p, 26, 13, 6, 2, SOIL); plots(p, 8, 18, 6, 2, SOIL); plots(p, 27, 19, 6, 2, SOIL); plots(p, 29, 27, 6, 2, SOIL);
    p.fill("tree", 2, 2, 8, 6); p.fill("tree", 32, 2, 39, 4); p.fill("tree", 2, 14, 5, 22); p.fill("tree", 36, 8, 39, 16);
  } },
  // Route 15: the rocky shelf with the Poke Transfer Lab on top and stairs down to the road.
  UnovaRoute15: { theme: { ...MOUNTAIN, road: "dirt", density: 0.3 }, plan(p) {
    // Reference (pokewiki S2W2 render): brown earth cliffs; the Poke Transfer Lab is a modern orange-and-glass block on an
    // asphalt platform on top, and the home in the west is a trailer.
    p.fill("asphalt", 16, 5, 25, 10); cottage(p, 2, [232, 150, 56], [110, 150, 180]); trailerDoor(p, 3, 5, [232, 200, 190], [200, 90, 80]);
    steps(p, 20, 11, 2, 2); steps(p, 28, 22, 2, 1); cliff(p, 12, 11, 26, 2); cliff(p, 14, 22, 24, 1);
    p.street("dirt", 2, [[36, 16], [26, 16], [26, 18], [12, 18], [12, 16], [3, 16]]); p.street("dirt", 2, [[20, 17], [20, 9]]); p.street("dirt", 1, [[8, 15], [8, 17]]);
    p.fill("rock", 2, 2, 10, 4); p.fill("rock", 30, 2, 37, 3);
  } },
  // Marvelous Bridge: the white, ringed span with its blue light strips.
  UnovaMarvelousBridge: { theme: { bridge: true }, plan(p) {
    p.fill("paving", 2, 13, 45, 19);
    const Wt = [240, 242, 248], Cy = [90, 210, 240];
    beam(p, 2, 45, 12 * U + 6, Wt, 10); beam(p, 2, 45, 20 * U, Wt, 10);
    for (let x = 6; x <= 42; x += 6) gantry(p, x * U - 5, 11 * U + 8, 21 * U, Wt, 8);
    p.paint(0, (c) => { c.rect(2 * U, 13 * U + 3, 44 * U, 2, Cy); c.rect(2 * U, 20 * U - 5, 44 * U, 2, Cy); for (let i = 2 * U + 6; i < 46 * U; i += 32) c.rect(i, 16 * U + 7, 16, 2, Cy); for (let x = 6; x <= 42; x += 6) { c.ellipse(x * U, 10 * U, 30, 26, Wt, 3); c.ellipse(x * U, 23 * U, 30, 18, Wt, 3); } });
  } },
  // Skyarrow Bridge: the long suspension bridge - two towers, sweeping cables and the roadway.
  UnovaSkyarrowBridge: { theme: { bridge: true }, plan(p) {
    p.fill("asphalt", 2, 14, 45, 18); p.fill("steel", 2, 13, 45, 13); p.fill("steel", 2, 19, 45, 19);
    const St = [130, 150, 180];
    beam(p, 2, 45, 12 * U + 8, St, 8); beam(p, 2, 45, 20 * U, St, 8); dashes(p, 3, 16, 44, 16);
    cables(p, 2, 45, [14 * U + 5, 33 * U + 5], 12 * U + 8, 150, -1); cables(p, 2, 45, [14 * U + 5, 33 * U + 5], 20 * U + 8, 44, 1);
    for (const x of [14, 33]) { p.paint(2, (c) => { c.box(x * U, 2 * U + 8, 10, 10 * U, St, sh(St, 0.45)); c.rect(x * U + 2, 2 * U + 10, 2, 10 * U - 4, sh(St, 1.3)); c.box(x * U, 20 * U + 8, 10, 46, St, sh(St, 0.45)); }); gantry(p, x * U, 12 * U + 4, 20 * U + 4, St); }
  } },
  // Pinwheel Forest: the straight paved road along the edge, and the winding track through the deep wood.
  UnovaPinwheelForest: { theme: { ground: "shade", grass: "shadegrass", road: "asphalt", treeTint: "dark", grove: "darktree", density: 0.55, groves: 0.3, flowers: 0.02 }, plan(p) {
    p.street("asphalt", 3, [[5, 36], [40, 36], [40, 6], [39, 5]]);
    p.street("dirt", 2, [[7, 34], [7, 28], [14, 28], [14, 20], [22, 20], [22, 14], [11, 14], [11, 8], [18, 8], [18, 5], [28, 5], [28, 10], [33, 10], [33, 6], [38, 6]]);
    p.street("dirt", 2, [[22, 20], [30, 20], [30, 27], [38, 27]]);
    // Reference (pokewiki S2W2 render): a dark grey paved road, very dark blue-green woods, and still pools along the stream
    // in the middle of the forest. (In the game the road runs straight north-south; our gates are south-west and north-east.)
    p.disc("water", 34.5, 23, 2.5, 1.4); p.disc("water", 26, 24, 2.6, 1.4); p.disc("water", 18, 24, 2, 1.2);
    fence(p, 10, 34, 28, 1, [200, 204, 214]); fence(p, 38, 9, 1, 17, [200, 204, 214]); fence(p, 38, 29, 1, 5, [200, 204, 214]);
  } },
  // Pinwheel Forest's outskirts: the paved way up to Nacrene past a woodland pool.
  UnovaPinwheelOutskirts: { theme: { road: "dirt", density: 0.5, groves: 0.3, flowers: 0.05 }, plan(p) {
    // Reference (pokewiki S2W2 render): only the stretch by Nacrene is a grey paved road; below it are trodden grass tracks
    // through thick forest past a string of small pools, with rough log fences.
    p.street("dirt", 2, [[5, 29], [14, 29], [14, 22], [24, 22], [24, 12]]); p.street("asphalt", 2, [[24, 12], [35, 12], [35, 5]]);
    p.disc("water", 31, 22, 4.5, 3); p.disc("water", 9, 22, 2.4, 1.5); p.disc("water", 19, 26, 2.2, 1.3); p.disc("water", 18, 16, 2, 1.2); p.disc("water", 29, 28, 2, 1.2);
    p.fill("tree", 2, 2, 28, 3); p.fill("tree", 2, 4, 3, 20);
    fence(p, 16, 20, 7, 1); fence(p, 26, 10, 8, 1, [236, 236, 240]);
  } },
  // Route 3: the Day-Care and its fenced playground, the pond with its footbridge and the lane to Wellspring Cave.
  UnovaRoute3: { theme: { density: 0.35, groves: 0.15, flowers: 0.12 }, plan(p) {
    // Reference (pokewiki S2W2 render): the Day-Care has a red roof; the pond is large; woods all round.
    p.building(1, "gable", { tint: p.roof(1.6, 0.35, 0.35) });
    p.disc("water", 20, 26, 7.5, 3.2);
    p.street("dirt", 2, [[41, 16], [32, 16], [32, 18], [14, 18], [14, 16], [5, 16]]); p.street("dirt", 1, [[22, 10], [22, 17]]);
    p.street("dirt", 1, [[14, 16], [14, 8], [5, 8], [5, 6]]); p.street("deck", 1, [[20, 19], [20, 31]]);
    p.fill("lawn", 27, 5, 32, 9); fence(p, 26, 4, 8, 1, [236, 236, 240]); fence(p, 26, 10, 3, 1, [236, 236, 240]); fence(p, 31, 10, 3, 1, [236, 236, 240]); fence(p, 26, 5, 1, 5, [236, 236, 240]); fence(p, 33, 5, 1, 5, [236, 236, 240]);
    p.paint(0, (c) => { c.box(27 * U + 4, 5 * U + 4, 28, 24, [236, 214, 160], [150, 120, 90]); c.box(30 * U + 4, 7 * U, 36, 10, [226, 90, 80], [90, 40, 40]); c.rect(30 * U + 4, 7 * U + 10, 4, 18, [120, 130, 150]); c.ellipse(28 * U, 9 * U, 7, 7, [90, 150, 220]); });
    p.fill("rock", 2, 2, 12, 2); p.fill("rock", 2, 3, 3, 8); p.fill("rock", 7, 3, 12, 3);
  } },
  // Dreamyard: the roofless shell of the old works - broken walls round weed-grown rooms.
  UnovaDreamyard: { theme: { ground: "grass", road: "dirt", border: "tree", tree: "tree1", density: 0.3, groves: 0.3, grove: "tree", flowers: 0.03 }, plan(p) {
    // Reference (pokewiki S2W2 render): pale concrete ruins with cracked floor slabs in a clearing ringed by dense forest (no rock rim).
    const C = [196, 190, 172];
    for (let y = 9; y <= 27; y++) for (let x = 13; x <= 33; x++) if (y !== 18 && p.hash(x >> 1, y >> 1, 7) < 0.62) p.fill("gravel", x, y, x, y);
    wall(p, 12, 8, 9, 1, C); wall(p, 25, 8, 10, 1, C); wall(p, 12, 9, 1, 6, C); wall(p, 12, 19, 1, 10, C); wall(p, 34, 9, 1, 8, C); wall(p, 34, 22, 1, 7, C);
    wall(p, 13, 28, 9, 1, C); wall(p, 27, 28, 7, 1, C); wall(p, 16, 18, 6, 1, C); wall(p, 25, 18, 5, 1, C); wall(p, 23, 12, 1, 4, C); wall(p, 23, 22, 1, 4, C);
    p.street("dirt", 2, [[4, 31], [10, 31], [10, 16], [13, 16]]); p.street("dirt", 2, [[35, 6], [36, 6], [36, 19], [33, 19]]);
    for (const [x, y] of [[15, 11], [20, 11], [27, 11], [31, 11], [15, 25], [20, 25], [27, 25], [31, 25]]) pillar(p, x, y, [176, 170, 160], 8);
    p.fill("tree", 2, 2, 10, 6); p.fill("tree", 2, 7, 6, 14); p.fill("tree", 14, 31, 34, 33);
  } },
  // Route 2: an easy lane north to Striaton, stepping round one-way ledges.
  UnovaRoute2: { theme: { density: 0.3, groves: 0.12, flowers: 0.15 }, plan(p) {
    p.street("dirt", 2, [[21, 33], [21, 27], [14, 27], [14, 18], [24, 18], [24, 10], [21, 10], [21, 5]]);
    cliff(p, 26, 22, 12, 1); cliff(p, 3, 13, 9, 1); cliff(p, 27, 12, 10, 1); cliff(p, 4, 29, 8, 1);
    p.fill("tree", 2, 2, 12, 4); p.fill("tree", 30, 30, 39, 35); p.fill("flowersRed", 28, 25, 33, 27);
  } },
  // Route 1: the first road north from Nuvema, beside the sea, with the gate out to the western waters.
  UnovaRoute1: { theme: { ...COAST, density: 0.25, flowers: 0.15 }, plan(p) {
    // Reference (pokewiki SW render): the lane runs north-south on the east side and the sea inlets lie to the WEST of it,
    // round the path to the Route 17 gate (the sea was drawn on the east side); the east is forest.
    p.fill("water", 2, 5, 11, 18); p.fill("water", 2, 26, 12, 35); p.fill("tree", 37, 2, 39, 35);
    p.street("sand", 2, [[21, 33], [21, 26], [17, 26], [17, 14], [21, 14], [21, 5]]); p.street("sand", 2, [[17, 22], [4, 22]]);
    cliff(p, 22, 20, 7, 1); cliff(p, 22, 28, 8, 1); cliff(p, 24, 9, 8, 1);
    p.fill("tree", 2, 2, 14, 4);
  } },
  // Route 17: fast currents between sandbars and islets on the way to the P2 Laboratory.
  UnovaRoute17: { theme: { ground: "beach", road: "sand", border: "rock", tree: "boulder", density: 0.1, groves: 0, flowers: 0, water: "sea", rough: false }, plan(p) {
    p.street("sand", 2, [[7, 33], [7, 34], [5, 35]]); p.street("sand", 2, [[35, 6], [35, 9]]);
    rapids(p, 4, 14, 16, 16, 1, 0); rapids(p, 20, 20, 36, 22, 1, 0, 9); rapids(p, 24, 4, 26, 12, 0, 1, 13); rapids(p, 16, 30, 30, 32, -1, 0, 17); rapids(p, 38, 13, 39, 26, 0, -1, 21);
    // Reference (pokewiki SW render): long brown rock bars lie across the currents (not just round sand islets).
    for (const [x0, y0, x1, y1] of [[5, 5, 11, 6], [16, 4, 22, 5], [5, 12, 10, 13], [8, 19, 18, 20], [8, 21, 9, 24], [20, 24, 21, 28], [24, 34, 31, 35], [36, 30, 39, 31]]) p.paint(0.1, (c) => { const cx = (x0 + x1 + 1) * U / 2, cy = (y0 + y1 + 1) * U / 2, rx = (x1 - x0 + 1) * U / 2, ry = (y1 - y0 + 1) * U / 2; c.ellipse(cx, cy + 2, rx + 4, ry + 4, [236, 244, 250, 140]); c.ellipse(cx, cy, rx, ry, [104, 66, 48]); c.ellipse(cx, cy - 2, rx - 2, ry - 3, [156, 102, 70]); c.ellipse(cx - rx * 0.2, cy - 4, rx * 0.6, Math.max(2, ry - 8), [184, 130, 92]); });
    islet(p, 12, 8); islet(p, 22, 17, 2, 1.2); islet(p, 34, 26, 2.2, 1.3); islet(p, 10, 23); islet(p, 30, 33, 1.4, 0.9); shoal(p, 18, 9, 3, 1.5); shoal(p, 28, 27, 3, 1.5);
  } },
  // Route 18: a rocky island of ledges and sand above the surf, with the lone house on the bluff.
  UnovaRoute18: { theme: { ...COAST, shore: 2, border: "rock", density: 0.25, house: ["cabin", "logHouse"] }, plan(p) {
    // Reference (pokewiki SW render): an island - sea and a sand beach on every side - with the teal-roofed house in the middle.
    p.fill("beach", 2, 2, 41, 5); p.fill("beach", 36, 2, 41, 37); p.fill("beach", 2, 33, 41, 37); p.fill("beach", 2, 2, 5, 28);
    p.fill("water", 2, 2, 41, 3); p.fill("water", 40, 2, 41, 37); p.fill("water", 9, 36, 41, 37); p.fill("water", 2, 2, 3, 27);
    p.fill("water", 14, 35, 34, 37); p.fill("water", 2, 2, 8, 9); p.fill("water", 38, 2, 41, 14);
    p.building(2, "gable", { tint: p.roof(0.45, 1.1, 1.05) });
    steps(p, 6, 20, 2, 1); steps(p, 30, 12, 2, 1); cliff(p, 2, 20, 16, 1); cliff(p, 24, 12, 14, 1); cliff(p, 24, 28, 12, 1);
    p.street("sand", 2, [[5, 31], [12, 31], [12, 24], [30, 24], [30, 16], [22, 16]]); p.street("sand", 1, [[20, 23], [20, 24]]); p.street("sand", 2, [[30, 16], [30, 6]]); p.street("sand", 1, [[6, 24], [6, 14], [12, 14]]);
  } },
  // The P2 Laboratory's island: the lab on a rock in the sea and the jetty where the frigate ties up.
  UnovaP2Island: { theme: { ...COAST, shore: 2, density: 0.15 }, plan(p) {
    p.fill("water", 2, 2, 29, 3); p.fill("water", 2, 4, 3, 18); p.fill("water", 27, 4, 29, 25); p.fill("water", 8, 24, 26, 25);
    p.street("sand", 2, [[4, 22], [16, 22], [16, 10]]); p.street("deck", 1, [[23, 21], [23, 25]]);
    p.building(1, "lab"); p.fill("rock", 5, 5, 9, 7); p.fill("rock", 22, 5, 25, 7);
  } },
  // Moor of Icirrus: a causeway through the fen, wide shallow pools on every side.
  UnovaMoorOfIcirrus: { theme: MARSH, plan(p) {
    p.street("dirt", 2, [[21, 33], [21, 26], [14, 26], [14, 16], [24, 16], [24, 8], [18, 8]]);
    p.disc("water", 31, 11, 4.5, 3); p.disc("water", 8, 11, 3, 2); p.disc("water", 34, 27, 2.6, 1.8);
    puddle(p, 9, 22, 3, 2); puddle(p, 28, 20, 3.5, 2); puddle(p, 19, 12, 2.5, 1.4); puddle(p, 36, 21, 1.8, 2.6); puddle(p, 10, 31, 3, 1.6); puddle(p, 27, 29, 2, 1.2); puddle(p, 30, 5, 3, 1.3);
  } },
  // Route 8: the wet road east of Icirrus, puddles standing across it, and the turn north to the moor.
  UnovaRoute8: { theme: { ground: "meadow", road: "dirt", density: 0.3, groves: 0.25, flowers: 0.1 }, plan(p) {
    // Reference (pokewiki S2W2 render): bright green meadow and woods round big clear rain pools (not brown fen); the pools
    // are real water now and the ones lying across the road stay as shallow puddles.
    p.street("dirt", 2, [[5, 16], [13, 16], [13, 18], [28, 18], [28, 16], [37, 16]]); p.street("dirt", 2, [[21, 18], [21, 11], [19, 11], [19, 7], [21, 7], [21, 5]]);
    p.disc("water", 10, 26, 5, 3); p.disc("water", 33, 26, 4.5, 2.6); p.disc("water", 9, 10, 4.5, 2.4); p.disc("water", 31, 10, 5, 2.6); p.disc("water", 21, 27, 3, 1.6);
    puddle(p, 17, 18.5, 2.2, 1.2); puddle(p, 31, 16.5, 2, 1.1); puddle(p, 21, 9, 1.6, 1); puddle(p, 36, 21, 1.6, 2.2); puddle(p, 14, 23, 2, 1);
    p.fill("tree", 2, 31, 39, 33);
  } },
  // Tubeline Bridge: riveted steel lattice girders, with the subway line running underneath.
  UnovaTubelineBridge: { theme: { bridge: true }, plan(p) {
    p.fill("steel", 2, 13, 45, 19);
    const St = [96, 84, 84];
    railway(p, 2, 45, 9 * U + 8, 20 * U, 4); railway(p, 2, 45, 21 * U + 12, 6 * U, 0);
    truss(p, 2, 45, 11 * U + 10, 24, St); truss(p, 2, 45, 19 * U + 14, 24, St);
    for (let x = 8; x <= 40; x += 8) gantry(p, x * U - 4, 11 * U + 12, 21 * U + 4, St, 8);
    p.paint(0, (c) => { for (let i = 2 * U; i < 46 * U; i += 16) { c.rect(i, 13 * U, 1, 7 * U, [70, 80, 100]); c.rect(i + 7, 16 * U + 7, 3, 2, [200, 204, 214]); } });
  } },
  // Nature Preserve: untouched woodland - a brook and its pool, and the sunlit clearing where the shiny dragon waits.
  UnovaNaturePreserve: { theme: { ...FOREST, density: 0.5 }, plan(p) {
    // Reference (pokewiki render): a river rings the central plateau (falls in the north, channels down both sides) and the
    // clearing in the middle has a small pond.
    p.fill("water", 36, 2, 37, 22); p.disc("water", 35, 25, 5, 3.5);
    p.fill("water", 8, 3, 35, 4); p.fill("water", 8, 5, 9, 30); cliff(p, 12, 5, 8, 1); cliff(p, 28, 5, 6, 1); falls(p, 20, 2, 3, 2);
    p.disc("water", 26, 8, 1.6, 1);
    p.street("dirt", 2, [[24, 38], [24, 30], [18, 30], [18, 20], [24, 20], [24, 12]]); p.street("dirt", 1, [[24, 16], [42, 16], [42, 8]]);
    p.disc("meadow", 24, 9.5, 6, 3.5); p.disc("flowersPink", 19.5, 8, 1.5, 1); p.disc("flowersBlue", 29, 11, 1.5, 1);
    p.fill("tree", 2, 34, 14, 39);
  } },
  // Pledge Grove: a hidden track through thick trees to the mossy rock in its clearing.
  UnovaPledgeGrove: { theme: { ...FOREST, density: 0.6 }, plan(p) {
    p.street("dirt", 2, [[18, 25], [18, 19], [13, 19], [13, 12], [18, 12], [18, 8]]);
    p.disc("meadow", 18, 6.5, 6, 3.5); p.decor("boulder", 14, 2); p.decor("boulder", 21, 2);
    p.paint(7, (c) => { const X = 18 * U + 8, Y = 5 * U; c.ellipse(X + 2, Y + 6, 15, 7, [0, 0, 0, 60]); c.ellipse(X, Y, 14, 10, [96, 104, 100]); c.ellipse(X - 2, Y - 3, 11, 6, [120, 160, 110]); c.line(X + 2, Y - 9, X - 2, Y + 9, [50, 54, 60], 2); }); take(p, 18, 4, 1, 1);
    p.fill("tree", 2, 2, 9, 12); p.fill("tree", 26, 2, 33, 12); p.fill("tree", 2, 22, 12, 27);
  } },
  // The Entralink: four pools round a crossroads and the bright ring at its heart.
  UnovaEntralink: { theme: { ground: "lawn", road: "cobble", tree: "tree1", density: 0.12, groves: 0, flowers: 0.2 }, plan(p) {
    for (const [x, y] of [[10, 9], [31, 9], [10, 27], [31, 27]]) p.disc("water", x, y, 5, 3);
    p.street("cobble", 3, [[21, 4], [21, 31]]); p.street("cobble", 3, [[4, 18], [37, 18]]); p.disc("ornate", 21.5, 18.5, 6, 5);
    p.paint(0, (c) => { const X = 21 * U + 8, Y = 18 * U + 8; c.ellipse(X, Y, 44, 36, [130, 230, 250, 120]); c.ellipse(X, Y, 44, 36, [240, 252, 255], 3); c.ellipse(X, Y, 28, 22, [200, 244, 255, 150]); c.ellipse(X, Y, 28, 22, [240, 252, 255], 2); c.ellipse(X, Y, 9, 7, [255, 255, 255]); });
  } },
  // Entree Forest: a track looping from glade to glade where the dream Pokemon wait.
  UnovaEntreeForest: { theme: { ...FOREST, density: 0.6 }, plan(p) {
    for (const q of p.people) p.disc("meadow", q.x + 0.5, q.y + 0.5, 3, 2.4);
    p.street("dirt", 2, [[22, 35], [22, 30], [15, 30], [15, 25]]); p.street("dirt", 1, [[15, 27], [8, 27], [8, 18]]); p.street("dirt", 1, [[8, 20], [36, 20], [36, 18]]);
    p.street("dirt", 1, [[29, 20], [29, 21]]); p.street("dirt", 2, [[25, 20], [25, 10], [22, 10], [22, 4]]);
  } },
  // The forest's deep clearing: one wide sunlit glade ringed by old trees.
  UnovaEntreeForestDepths: { theme: { ...FOREST, density: 0.6 }, plan(p) {
    p.disc("meadow", 22, 19.5, 18, 9); p.disc("flowersPink", 22, 19.5, 4, 1.6);
    p.street("dirt", 2, [[22, 35], [22, 26]]); p.street("dirt", 1, [[8, 25], [36, 25]]); p.street("dirt", 1, [[15, 14], [29, 14]]); p.street("dirt", 2, [[22, 14], [22, 8]]);
    p.fill("tree", 2, 2, 14, 6); p.fill("tree", 30, 2, 41, 6); p.fill("tree", 2, 31, 16, 37); p.fill("tree", 28, 31, 41, 37);
  } },
  // Funfest search garden: clipped hedge rows to hide behind, flower beds and the pond.
  UnovaFunfestGarden: { theme: { ground: "lawn", road: "cobble", tree: "hedge", density: 0, groves: 0, flowers: 0.25 }, plan(p) {
    p.street("cobble", 2, [[39, 18], [22, 18], [22, 4]]); p.street("cobble", 2, [[22, 18], [22, 33]]); p.street("cobble", 1, [[22, 24], [26, 24]]);
    for (const y of [7, 10, 13]) { hedges(p, 5, y, 18, y); hedges(p, 26, y, 38, y); } for (const y of [22, 25, 28, 31]) hedges(p, 5, y, 18, y);
    hedges(p, 4, 7, 4, 31); p.fill("flowersRed", 26, 32, 37, 34); p.fill("flowersBlue", 6, 34, 18, 35);
  } },
  // Funfest courts: four marked battle courts round a paved cross.
  UnovaFunfestCourt: { theme: { ground: "lawn", road: "cobble", tree: "hedge", density: 0.08, groves: 0, flowers: 0.15 }, plan(p) {
    p.street("cobble", 3, [[4, 18], [39, 18]]); p.street("cobble", 3, [[22, 5], [22, 33]]);
    court(p, 7, 6, 12, 8); court(p, 25, 6, 12, 8); court(p, 7, 23, 12, 8); court(p, 25, 23, 12, 8);
    stand(p, 7, 3, 12, 2); stand(p, 25, 3, 12, 2, [200, 70, 70]);
  } },
  // Victory Road's forest shelf: a woodland track over a mountain stream, up to the cave mouths.
  UnovaVictoryRoad18: { theme: { ...FOREST, border: "rock", density: 0.5 }, plan(p) {
    p.fill("water", 24, 2, 25, 33); p.disc("water", 24.5, 26, 3, 2);
    p.street("dirt", 2, [[5, 31], [12, 31], [12, 24], [20, 24], [20, 16], [28, 16], [28, 8], [36, 8], [36, 6]]);
    cliff(p, 2, 20, 16, 1, GREY, GREYLIP); cliff(p, 30, 12, 10, 1, GREY, GREYLIP); p.fill("rock", 2, 2, 10, 4); p.fill("rock", 30, 28, 39, 33);
  } },
  // Victory Road's eastern cliffs: three shelves and their stairs, climbing back and forth to the top ledge.
  UnovaVictoryRoad25: { theme: { ...MOUNTAIN, density: 0.2 }, plan(p) {
    steps(p, 34, 25, 2, 2); steps(p, 6, 16, 2, 2); steps(p, 30, 6, 2, 2);
    cliff(p, 8, 25, 32, 2, GREY, GREYLIP); cliff(p, 2, 16, 34, 2, GREY, GREYLIP); cliff(p, 6, 6, 34, 2, GREY, GREYLIP);
    p.street("gravel", 2, [[5, 30], [34, 30], [34, 27]]); p.street("gravel", 2, [[34, 24], [34, 21], [6, 21], [6, 18]]); p.street("gravel", 2, [[6, 15], [6, 12], [30, 12], [30, 8]]); p.street("gravel", 2, [[30, 5], [30, 4], [12, 4]]);
  } },
  // Giant Chasm's frozen forest: a snowbound track between frosted pines and sheets of ice.
  UnovaGiantChasmFrozenForest: { theme: { ground: "drift", road: "frostpath", border: "rock", grass: "snowgrass", tree: "tree1", treeTint: "frost", grove: "pine", density: 0.4, groves: 0.2, flowers: 0 }, plan(p) {
    p.street("frostpath", 2, [[5, 31], [14, 31], [14, 22], [24, 22], [24, 13], [33, 13], [33, 6], [37, 6], [37, 5]]);
    const ICE = [200, 232, 250, 210]; puddle(p, 10, 12, 5, 3, ICE); puddle(p, 31, 25, 4.5, 2.6, ICE); puddle(p, 19, 17, 2.2, 1.3, ICE);
    p.fill("pine", 2, 2, 14, 4); p.fill("pine", 26, 30, 35, 33); p.fill("pine", 16, 26, 20, 29);
  } },
};
