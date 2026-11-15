// alola routes and wild areas, drawn by hand. See README.md.
"use strict";

// ---- shared hand-drawn pieces (pixels, 16 per tile) ----
// A palm: trunk tile is solid, the fronds are walked behind.
function palm(p, x, y) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => {
    const px = x * 16 + 8, py = y * 16 + 14, lean = p.hash(x, y, 7) < 0.5 ? -3 : 3;
    c.ellipse(px + 2, py, 8, 3, [0, 0, 0, 60]);
    c.line(px, py, px + lean, py - 12, [120, 92, 54], 4); top.line(px + lean, py - 12, px + lean, py - 24, [120, 92, 54], 4);
    c.line(px - 1, py, px + lean - 1, py - 12, [170, 136, 80], 1);
    const tx = px + lean, ty = py - 26;
    for (const [dx, dy] of [[-14, 2], [14, 2], [-11, -8], [11, -8], [-6, 8], [6, 8], [0, -11]]) { top.line(tx, ty, tx + dx, ty + dy, [34, 110, 60], 5); top.line(tx, ty - 1, tx + dx, ty + dy - 1, [80, 170, 84], 2); }
    top.ellipse(tx, ty + 1, 3, 3, [130, 96, 50]);
  });
}
// A hand-drawn building: walls, a hipped roof, rows of windows and (optionally) a door at tile column `door`.
function house(p, x, y, w, h, o = {}) {
  const wall = o.wall || [240, 236, 224], roof = o.roof || [60, 130, 190], edge = o.edge || [60, 56, 64], rh = o.roofH == null ? 22 : o.roofH, win = o.win || [120, 190, 230];
  p.block(x, y, w, h);
  p.paint(y + h, (c) => {
    const px = x * 16, py = y * 16, pw = w * 16, ph = h * 16, dark = roof.map((v) => Math.round(v * 0.7)), lite = roof.map((v) => Math.min(255, Math.round(v * 1.25)));
    c.rect(px + 3, py + ph - 2, pw, 4, [0, 0, 0, 60]);
    c.box(px + 2, py + rh - 2, pw - 4, ph - rh + 2, wall, edge);
    if (o.band) c.rect(px + 3, py + ph - 6, pw - 6, 5, o.band);
    if (o.flat) { c.box(px, py + 2, pw, rh - 2, roof, edge); c.rect(px + 2, py + 4, pw - 4, 3, lite); c.rect(px + 1, py + rh - 4, pw - 2, 3, dark); }
    else if (o.pagoda) { c.poly([[px - 4, py + rh + 2], [px + 8, py + 4], [px + pw - 8, py + 4], [px + pw + 4, py + rh + 2]], edge); c.poly([[px - 2, py + rh], [px + 9, py + 6], [px + pw - 9, py + 6], [px + pw + 2, py + rh]], roof); c.rect(px + 9, py + 3, pw - 18, 4, dark); c.rect(px - 5, py + rh - 1, 5, 3, edge); c.rect(px + pw, py + rh - 1, 5, 3, edge); for (let i = px + 2; i < px + pw - 2; i += 4) c.rect(i, py + rh - 6, 1, 6, dark); }
    else { c.poly([[px - 2, py + rh + 1], [px + 10, py], [px + pw - 10, py], [px + pw + 2, py + rh + 1]], edge); c.poly([[px, py + rh], [px + 11, py + 2], [px + pw - 11, py + 2], [px + pw, py + rh]], roof); c.rect(px + 11, py + 2, pw - 22, 3, lite); c.rect(px + 1, py + rh - 3, pw - 2, 3, dark); }
    const rows = Math.max(1, Math.floor((ph - rh - 12) / 14));
    for (let r = 0; r < rows; r++) for (let i = px + 7; i + 8 <= px + pw - 6; i += 12) { const wy = py + rh + 4 + r * 14; if (o.door != null && r === rows - 1 && Math.abs(i + 4 - (px + o.door * 16 + 8)) < 12) continue; c.box(i, wy, 8, 8, win, edge); c.rect(i + 1, wy + 1, 3, 2, [230, 244, 252]); }
    if (o.door != null) { const dx = px + o.door * 16; c.box(dx + 1, py + ph - 18, 14, 18, o.doorCol || [90, 60, 44], edge); c.rect(dx + 7, py + ph - 17, 2, 16, edge); }
    if (o.sign) { c.box(px + pw / 2 - 14, py + rh + 1, 28, 8, o.sign, edge); }
    if (o.extra) o.extra(c, px, py, pw, ph);
  });
}
// A boat moored at (x, y), about w tiles long.
function boat(p, x, y, hull, w = 3) {
  p.paint(y + 2, (c) => { const px = x * 16, py = y * 16, L = w * 16 - 8; c.poly([[px, py + 6], [px + L, py + 6], [px + L - 7, py + 22], [px + 6, py + 22]], [50, 46, 54]); c.poly([[px + 2, py + 7], [px + L - 2, py + 7], [px + L - 8, py + 20], [px + 7, py + 20]], hull); c.rect(px + 3, py + 8, L - 6, 2, [250, 250, 250]); c.box(px + L / 2 - 8, py - 3, 16, 11, [236, 236, 240], [80, 80, 96]); c.rect(px + L / 2 - 5, py, 10, 3, [120, 180, 230]); });
}
// A wooden rail fence along a row (x0..x1) or a column (y0..y1); solid.
function fence(p, x0, y0, x1, y1, col = [150, 110, 70]) {
  p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => {
    const dk = col.map((v) => Math.round(v * 0.6));
    if (y0 === y1) { const py = y0 * 16; c.rect(x0 * 16, py + 5, (x1 - x0 + 1) * 16, 2, col); c.rect(x0 * 16, py + 10, (x1 - x0 + 1) * 16, 2, col); for (let x = x0; x <= x1; x++) { c.box(x * 16 + 6, py + 2, 4, 13, col, dk); } }
    else { const px = x0 * 16 + 6; c.rect(px - 1, y0 * 16, 2, (y1 - y0 + 1) * 16, col); c.rect(px + 3, y0 * 16, 2, (y1 - y0 + 1) * 16, dk); for (let y = y0; y <= y1; y++) c.box(px - 1, y * 16 + 3, 6, 12, col, dk); }
  });
}
// A lantern on a post (solid); col is the lantern colour.
function lamp(p, x, y, col = [226, 60, 50]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * 16 + 8, py = y * 16; c.rect(px - 1, py - 2, 2, 16, [70, 56, 50]); top.rect(px - 1, py - 12, 2, 10, [70, 56, 50]); top.ellipse(px, py - 12, 5, 6, col); top.rect(px - 3, py - 19, 6, 2, [60, 44, 40]); top.rect(px - 1, py - 14, 2, 4, [255, 230, 150]); });
}
// A string of lanterns across a street from (x0, y) to (x1, y), hung overhead (walked behind).
function lanterns(p, x0, x1, y) {
  p.paint(y + 1, (c, top) => { const a = x0 * 16, b = (x1 + 1) * 16, py = y * 16 + 2; for (let i = a; i < b; i++) top.p(i, py + Math.round(Math.sin((i - a) / (b - a) * Math.PI) * 4), [70, 50, 44]); for (let i = a + 6; i < b - 3; i += 10) { const yy = py + Math.round(Math.sin((i - a) / (b - a) * Math.PI) * 4) + 1; top.ellipse(i, yy + 3, 3, 4, [226, 56, 46]); top.rect(i - 1, yy + 1, 2, 3, [255, 214, 120]); top.rect(i - 2, yy - 1, 4, 1, [230, 190, 80]); } });
}
// A storm-wrecked house: broken walls round a bare floor, fallen beams and rubble (solid).
function ruin(p, x, y, w, h, n = 0) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => {
    const px = x * 16, py = y * 16, pw = w * 16, ph = h * 16, wall = [150, 140, 130], dk = [84, 76, 76];
    c.rect(px + 2, py + 8, pw - 4, ph - 9, [120, 108, 96]); for (let i = 0; i < w * h * 3; i++) c.rect(px + 4 + Math.floor(p.hash(i, n, 3) * (pw - 10)), py + 12 + Math.floor(p.hash(i, n, 4) * (ph - 18)), 2, 2, [[96, 86, 80], [150, 136, 120], [70, 64, 62]][i % 3]);
    const top = (i) => 4 + Math.floor(p.hash(i, n, 5) * 16);
    for (let i = 0; i < pw - 4; i += 4) { const t = top(i >> 2); c.rect(px + 2 + i, py + t, 4, 22 - t, wall); c.rect(px + 2 + i, py + t, 4, 1, dk); } c.rect(px + 2, py + 21, pw - 4, 2, dk);
    c.box(px + 1, py + 8, 5, ph - 14 - (n % 2) * 16, wall, dk); c.box(px + pw - 6, py + 14 + (n % 2) * 14, 5, ph - 16 - (n % 2) * 14, wall, dk);
    c.box(px + 1, py + ph - 8, Math.floor(pw * 0.3), 7, wall, dk); c.box(px + Math.floor(pw * 0.62), py + ph - 8, Math.floor(pw * 0.38) - 1, 7, wall, dk);
    c.line(px + 8, py + ph - 12, px + pw - 14, py + 26, [110, 78, 52], 3); c.line(px + pw - 10, py + ph - 14, px + pw / 2, py + 30, [90, 62, 44], 3);
    c.box(px + 10 + (n % 3) * 6, py + 12, 8, 7, [60, 70, 90], dk);
  });
}
// A houseboat shaped like a Pokemon, afloat (solid). kind: whiscash, steelix, huntail, wailord, magikarp.
function pokeboat(p, x, y, w, h, kind) {
  p.block(x, y, w, h);
  const pal = { whiscash: [[70, 110, 190], [240, 210, 90]], steelix: [[150, 154, 166], [100, 104, 116]], huntail: [[80, 150, 200], [236, 130, 70]], wailord: [[50, 90, 170], [226, 222, 200]], magikarp: [[226, 90, 60], [250, 230, 150]] }[kind];
  p.paint(y + h, (c) => {
    const px = x * 16, py = y * 16, pw = w * 16, ph = h * 16, cx = px + pw / 2, cy = py + ph / 2 + 6, [body, trim] = pal, dk = body.map((v) => Math.round(v * 0.6));
    c.ellipse(cx, cy + 4, pw / 2 - 1, ph / 2 - 6, [20, 50, 90, 90]);
    if (kind === "steelix") { for (let i = 0; i < 4; i++) { const ex = px + 12 + i * (pw - 30) / 3; c.ellipse(ex, cy, 13, ph / 2 - 9, dk); c.ellipse(ex, cy - 1, 11, ph / 2 - 11, i % 2 ? trim : body); } c.box(px + pw - 26, cy - 14, 24, 26, body, dk); c.rect(px + pw - 24, cy + 4, 20, 3, [240, 240, 240]); }
    else { c.poly([[px, cy - 12], [px + 14, cy], [px, cy + 12]], dk); c.poly([[px + 2, cy - 9], [px + 14, cy], [px + 2, cy + 9]], trim); c.ellipse(cx + 4, cy, pw / 2 - 6, ph / 2 - 8, dk); c.ellipse(cx + 4, cy - 1, pw / 2 - 8, ph / 2 - 10, body); c.ellipse(cx + 4, cy + 8, pw / 2 - 16, 5, trim); }
    if (kind === "whiscash") { c.line(px + pw - 12, cy + 2, px + pw + 2, cy - 8, trim, 2); c.line(px + pw - 12, cy + 4, px + pw + 2, cy + 12, trim, 2); c.rect(cx - 8, cy - 14, 3, 6, trim); c.rect(cx - 2, cy - 14, 3, 6, trim); c.rect(cx - 5, cy - 11, 3, 4, trim); }
    if (kind === "magikarp") { c.poly([[cx - 10, cy - ph / 2 + 10], [cx + 2, cy - ph / 2 + 2], [cx + 14, cy - ph / 2 + 10]], trim); c.line(px + pw - 12, cy + 4, px + pw - 4, cy + 14, trim, 2); }
    c.ellipse(px + pw - 18, cy - 5, 4, 4, [250, 250, 250]); c.rect(px + pw - 18, cy - 6, 3, 3, [20, 20, 30]);
    // the cabin on its back
    const hx = cx - 18, hy = py + 2; c.box(hx, hy + 10, 34, 20, [226, 196, 150], [80, 56, 40]); c.poly([[hx - 3, hy + 11], [hx + 6, hy], [hx + 28, hy], [hx + 37, hy + 11]], [80, 56, 40]); c.poly([[hx - 1, hy + 10], [hx + 7, hy + 2], [hx + 27, hy + 2], [hx + 35, hy + 10]], trim); c.box(hx + 13, hy + 17, 8, 13, [100, 66, 44], [60, 40, 30]); c.rect(hx + 4, hy + 15, 6, 6, [130, 196, 230]); c.rect(hx + 24, hy + 15, 6, 6, [130, 196, 230]);
  });
}
// A concrete wall run (row or column), solid, with graffiti when tag is set.
function wall(p, x0, y0, x1, y1, tag) {
  p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => {
    const px = x0 * 16, py = y0 * 16, pw = (x1 - x0 + 1) * 16, ph = (y1 - y0 + 1) * 16;
    c.box(px, py - 6, pw, ph + 6, [124, 126, 136], [50, 50, 60]); c.rect(px + 1, py - 5, pw - 2, 3, [164, 166, 176]); for (let i = px + 15; i < px + pw - 2; i += 16) c.rect(i, py - 2, 1, ph + 1, [96, 98, 108]); for (let j = py + 15; j < py + ph - 2; j += 16) c.rect(px + 1, j, pw - 2, 1, [96, 98, 108]);
    if (tag) for (let i = 0; i < (pw + ph) / 22; i++) { const gx = px + 3 + Math.floor(p.hash(i, x0 + y0, 11) * Math.max(1, pw - 14)), gy = py + Math.floor(p.hash(i, x0 + y0, 12) * Math.max(1, ph - 8)), col = [[236, 70, 150], [90, 220, 230], [240, 220, 70], [150, 230, 90], [240, 240, 240]][Math.floor(p.hash(i, x0, 13) * 5)]; c.line(gx, gy + 5, gx + 4, gy, col, 2); c.line(gx + 4, gy, gx + 8, gy + 5, col, 2); c.rect(gx + 2, gy + 3, 5, 1, col); }
  });
}
// Crop rows on a plot of tilled earth (walkable ground art).
function crops(p, x0, y0, x1, y1, col = [70, 150, 70]) {
  p.fill("dirt", x0, y0, x1, y1);
  p.paint(1, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x * 16, py = y * 16; c.rect(px, py + 13, 16, 2, [120, 86, 56]); for (const dx of [3, 11]) { c.ellipse(px + dx, py + 7, 3, 3, col); c.rect(px + dx - 1, py + 5, 2, 2, col.map((v) => Math.min(255, v + 50))); } } });
}
// A banner on a pole (solid base, the flag is walked behind).
function flag(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * 16, py = y * 16; c.box(px + 6, py - 2, 4, 17, [200, 200, 210], [70, 70, 90]); top.box(px + 6, py - 26, 4, 24, [200, 200, 210], [70, 70, 90]); top.poly([[px + 10, py - 25], [px + 26, py - 21], [px + 10, py - 12]], col); top.rect(px + 5, py - 28, 6, 3, [236, 190, 70]); });
}
// A beach parasol with a towel beside it (ground art, walkable).
function parasol(p, x, y) {
  p.paint(y + 1, (c) => { const px = x * 16, py = y * 16, col = [[230, 80, 80], [250, 200, 70], [80, 150, 220]][(x + y) % 3]; c.box(px + 14, py + 8, 12, 7, [[250, 250, 250], [120, 210, 200], [250, 170, 190]][(x * 3 + y) % 3], [120, 120, 130]); c.line(px + 8, py + 6, px + 8, py + 15, [90, 70, 60]); c.ellipse(px + 8, py + 6, 9, 5, col); c.ellipse(px + 8, py + 6, 3, 2, [250, 250, 250]); });
}
// A walk-on entrance drawn by hand: nothing from the generator, a doormat on the warp tile.
function entry(p, k) {
  const w = p.warps[k]; p.bare(k);
  p.paint(1, (c) => { c.box(w.x * 16 + 1, w.y * 16 + 1, 14, 9, [170, 60, 56], [90, 30, 34]); c.rect(w.x * 16 + 3, w.y * 16 + 3, 10, 1, [236, 190, 70]); c.rect(w.x * 16 + 3, w.y * 16 + 7, 10, 1, [236, 190, 70]); });
}

// ---- route pieces ----
const tilesOf = (x0, y0, x1, y1) => { const o = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) o.push([x, y]); return o; };
// Solid tiles, skipping any the builder keeps (doors, people, landings).
function blockSoft(p, x, y, w = 1, h = 1) { for (const [i, j] of tilesOf(x, y, x + w - 1, y + h - 1)) { try { p.block(i, j, 1, 1); } catch (e) { /* kept tile: stays open */ } } }
// A path cut through cliffs or groves: the ground is cleared first (a street alone does not cut a plan wall).
function cut(p, kind, width, pts) {
  for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1]; p.fill("ground", Math.min(ax, bx) - ((width - 1) >> 1), Math.min(ay, by) - ((width - 1) >> 1), Math.max(ax, bx) + (width >> 1), Math.max(ay, by) + (width >> 1)); }
  p.street(kind, width, pts);
}
// A hand-drawn building standing on warp k's door (door column d of a w x h footprint).
function houseOn(p, k, w, h, d, o = {}) {
  const wp = p.warps[k], x = wp.x - d, y = wp.y - h + 1; p.bare(k);
  const q = Object.create(p); q.block = (bx, by, bw, bh) => { for (const [i, j] of tilesOf(bx, by, bx + bw - 1, by + bh - 1)) if (i !== wp.x || j !== wp.y) p.block(i, j, 1, 1); };
  house(q, x, y, w, h, { ...o, door: d });
}
// The wooden gate of an island trial on warp k: two carved posts, a beam and a row of flags.
function trialGate(p, k, col = [226, 180, 60]) {
  const w = p.warps[k]; p.bare(k); blockSoft(p, w.x - 1, w.y); blockSoft(p, w.x + 1, w.y);
  p.paint(w.y + 1, (c, top) => {
    const px = w.x * 16, py = w.y * 16;
    c.rect(px, py, 16, 16, [60, 50, 44, 120]);
    for (const dx of [-14, 18]) { c.ellipse(px + dx + 6, py + 14, 7, 3, [0, 0, 0, 60]); c.box(px + dx, py - 8, 12, 23, [150, 104, 60], [70, 44, 28]); c.rect(px + dx + 2, py - 6, 3, 19, [190, 144, 90]); c.rect(px + dx + 1, py + 2, 10, 2, col); top.box(px + dx, py - 26, 12, 18, [150, 104, 60], [70, 44, 28]); top.rect(px + dx + 2, py - 24, 3, 16, [190, 144, 90]); top.rect(px + dx + 1, py - 18, 10, 2, col); }
    top.box(px - 20, py - 30, 56, 7, [120, 80, 46], [70, 44, 28]); top.rect(px - 18, py - 29, 52, 2, [176, 130, 80]);
    for (let i = 0; i < 4; i++) top.poly([[px - 10 + i * 10, py - 23], [px - 2 + i * 10, py - 23], [px - 6 + i * 10, py - 15]], i % 2 ? [236, 236, 230] : col);
  });
}
// A cave mouth in a cliff on warp k: rock above and beside it, a dark arch on the warp tile.
function caveOn(p, k, kind = "rock") {
  const w = p.warps[k]; p.bare(k);
  p.fill(kind, w.x - 2, w.y - 2, w.x + 2, w.y - 1); p.fill(kind, w.x - 2, w.y, w.x - 1, w.y); p.fill(kind, w.x + 1, w.y, w.x + 2, w.y);
  p.paint(1, (c) => { const px = w.x * 16, py = w.y * 16; c.ellipse(px + 8, py + 9, 10, 12, [60, 48, 44]); c.ellipse(px + 8, py + 10, 8, 10, [16, 14, 20]); c.rect(px, py + 10, 16, 6, [16, 14, 20]); });
}
// Stone steps across a path, tiles (x..x+w-1, y).
function steps(p, x, y, w = 2, col = [176, 170, 160]) {
  p.paint(1, (c) => { const px = x * 16, py = y * 16, dk = col.map((v) => Math.round(v * 0.62)); for (let s = 0; s < 16; s += 5) { c.rect(px, py + s, w * 16, 4, col); c.rect(px, py + s + 4, w * 16, 1, dk); } });
}
// Rope rails along a north-south bridge spanning columns x0..x1, rows y0..y1 (walked behind).
function rails(p, x0, x1, y0, y1, col = [150, 110, 70]) {
  p.paint(y1 + 1, (c, top) => { const dk = col.map((v) => Math.round(v * 0.55)); for (const x of [x0 * 16 - 2, (x1 + 1) * 16 - 1]) { top.rect(x, y0 * 16 - 4, 2, (y1 - y0 + 1) * 16 + 4, [226, 210, 170]); for (let y = y0 * 16 - 6; y <= (y1 + 1) * 16; y += 16) top.box(x - 1, y - 6, 4, 11, col, dk); } });
}
// Rope rails along an east-west bridge (row y0..y1, columns x0..x1).
function railsEW(p, x0, x1, y0, y1, col = [150, 110, 70]) {
  p.paint(y1 + 1, (c, top) => { const dk = col.map((v) => Math.round(v * 0.55)); for (const [y, cv] of [[y0 * 16 - 5, top], [(y1 + 1) * 16 - 4, top]]) { cv.rect(x0 * 16 - 2, y, (x1 - x0 + 1) * 16 + 4, 2, [226, 210, 170]); for (let x = x0 * 16 - 2; x <= (x1 + 1) * 16; x += 16) cv.box(x - 1, y - 6, 4, 11, col, dk); } });
}
// A gravestone (solid).
function grave(p, x, y, col = [176, 176, 186]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * 16, py = y * 16, dk = col.map((v) => Math.round(v * 0.55)); c.ellipse(px + 9, py + 14, 6, 2, [0, 0, 0, 60]); c.box(px + 2, py + 11, 12, 4, col, dk); c.box(px + 4, py + 1, 8, 11, col, dk); c.rect(px + 5, py + 2, 2, 8, [226, 226, 234]); c.rect(px + 6, py + 5, 4, 1, dk); c.rect(px + 6, py + 8, 4, 1, dk); });
}
// A standing stone / marker (solid); tall ones are walked behind at the top.
function stone(p, x, y, col = [150, 140, 130], tall = 0) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * 16, py = y * 16, dk = col.map((v) => Math.round(v * 0.55)), lt = col.map((v) => Math.min(255, v + 44)); c.ellipse(px + 9, py + 14, 7, 2, [0, 0, 0, 60]); c.poly([[px + 2, py + 15], [px + 4, py], [px + 12, py], [px + 14, py + 15]], dk); c.poly([[px + 3, py + 14], [px + 5, py + 1], [px + 11, py + 1], [px + 13, py + 14]], col); c.rect(px + 5, py + 2, 2, 11, lt); if (tall) { top.poly([[px + 4, py + 1], [px + 5, py - tall], [px + 11, py - tall], [px + 12, py + 1]], dk); top.poly([[px + 5, py + 1], [px + 6, py - tall + 1], [px + 10, py - tall + 1], [px + 11, py + 1]], col); top.rect(px + 6, py - tall + 2, 2, tall - 2, lt); } });
}
// A signpost / bus stop pole (solid).
function post(p, x, y, col = [80, 150, 220]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * 16, py = y * 16; c.rect(px + 7, py - 2, 2, 17, [90, 90, 100]); top.rect(px + 7, py - 12, 2, 10, [90, 90, 100]); top.ellipse(px + 8, py - 14, 6, 6, [250, 250, 250]); top.ellipse(px + 8, py - 14, 4, 4, col); });
}
// A grazing Pokemon (solid).
function cow(p, x, y, body, spot) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.ellipse(px + 9, py + 14, 8, 2, [0, 0, 0, 60]); c.ellipse(px + 8, py + 8, 7, 5, body); c.ellipse(px + 13, py + 5, 4, 4, body); c.rect(px + 5, py + 6, 3, 3, spot); c.rect(px + 9, py + 9, 2, 2, spot); c.rect(px + 4, py + 12, 2, 3, spot); c.rect(px + 11, py + 12, 2, 3, spot); c.p(px + 14, py + 4, [20, 20, 20]); });
}
// A white camper trailer (solid), w tiles long and 2 tall.
function trailer(p, x, y, w = 4, stripe = [80, 170, 200]) {
  p.block(x, y, w, 2);
  p.paint(y + 2, (c) => { const px = x * 16, py = y * 16, pw = w * 16; c.rect(px + 3, py + 29, pw - 2, 4, [0, 0, 0, 60]); c.box(px + 1, py + 2, pw - 2, 25, [240, 240, 236], [70, 70, 80]); c.rect(px + 2, py + 15, pw - 4, 3, stripe); c.box(px + 6, py + 6, 10, 7, [120, 190, 230], [70, 70, 80]); c.box(px + pw - 26, py + 6, 10, 7, [120, 190, 230], [70, 70, 80]); c.box(px + pw / 2 - 5, py + 8, 10, 19, [200, 200, 204], [70, 70, 80]); for (const wx of [px + 8, px + pw - 14]) { c.ellipse(wx + 3, py + 28, 5, 4, [40, 40, 46]); c.ellipse(wx + 3, py + 28, 2, 2, [170, 170, 176]); } });
}
// A jagged run of cliff: rock from row y0 down to a ragged lower edge around y1 (or columns when vertical).
function crag(p, kind, x0, y0, x1, y1, seed = 1) {
  for (let x = x0; x <= x1; x++) p.fill(kind, x, y0, x, y1 - (p.hash(x >> 1, y0, seed) < 0.4 ? 1 : 0));
}
// A scatter of flower tiles of one kind inside a rectangle (keeps some plain ground between).
function blooms(p, kind, x0, y0, x1, y1, amount = 0.6, seed = 3) {
  for (const [x, y] of tilesOf(x0, y0, x1, y1)) if (p.hash(x, y, seed) < amount) p.fill(kind, x, y, x, y);
}

module.exports = {
  // Route 1: the grassy slope from the player's house up to Iki Town. The sandy path zigzags up
  // between two rock ledges with tall grass on every terrace.
  AlolaRoute1: {
    theme: { ground: "grass", road: "sand", border: "palms", density: 0.04, groves: 0, flowers: 0.12, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 9, 14, 22, 15, 2); crag(p, "rock", 1, 8, 15, 9, 4);
      p.street("sand", 2, [[12, 20], [12, 17], [5, 17], [5, 11], [18, 11], [18, 5], [12, 5], [12, 1]]);
      p.street("sand", 2, [[1, 11], [22, 11]]);
      steps(p, 5, 14); steps(p, 18, 8);
      fence(p, 15, 17, 21, 17, [236, 232, 220]); fence(p, 2, 5, 9, 5, [236, 232, 220]);
      p.fill("flowersRed", 16, 18, 20, 19); p.fill("flowersBlue", 3, 3, 8, 4);
      for (const [x, y] of [[9, 19], [3, 19], [21, 3], [15, 3], [2, 13], [21, 13]]) palm(p, x, y);
    },
  },
  // Mahalo Trail: the steep trail above Iki Town. Stone steps climb to the gorge, where the old
  // plank bridge with its rope rails hangs over the river on the way to the Ruins of Conflict.
  AlolaMahaloTrail: {
    theme: { ground: "grass", road: "dirt", border: "tree", water: "water", density: 0.18, groves: 0.1, flowers: 0.06, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 6, 30, 10);
      p.fill("rock", 1, 4, 13, 5); p.fill("rock", 19, 4, 30, 5); p.fill("rock", 1, 11, 13, 12); p.fill("rock", 19, 11, 20, 12); p.fill("rock", 24, 11, 30, 12); p.fill("rock", 21, 11, 23, 11);
      p.street("dirt", 2, [[16, 28], [16, 20], [8, 20], [8, 15], [16, 15]]); p.street("dirt", 2, [[1, 15], [30, 15]]);
      p.street("dirt", 3, [[16, 15], [16, 12]]); p.street("deck", 3, [[16, 11], [16, 5]]); p.street("dirt", 3, [[16, 4], [16, 1]]);
      rails(p, 15, 17, 5, 11);
      steps(p, 16, 24); steps(p, 8, 17); steps(p, 15, 13, 3); steps(p, 15, 3, 3);
      for (const [x, y] of [[14, 13], [18, 13], [14, 3], [18, 3]]) stone(p, x, y, [150, 150, 156], 8);
    },
  },
  // Route 2: the road north out of Hau'oli. The walled cemetery lies in the north-west, the berry
  // farmer's house and fields in the south-east, the motel by the road and Verdant Cavern's
  // mouth in the cliff at the top.
  AlolaRoute2: {
    theme: { ground: "grass", road: "sand", border: "palms", density: 0.05, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 23, 1, 34, 6); crag(p, "rock", 23, 7, 34, 8, 5); caveOn(p, 1);
      p.street("sand", 3, [[1, 14], [34, 14]]); p.street("sand", 2, [[18, 1], [18, 26]]);
      p.street("sand", 1, [[29, 10], [29, 13]]); p.street("sand", 1, [[7, 9], [7, 13]]); p.street("sand", 2, [[20, 24], [29, 24]]);
      // The cemetery: a stone wall round rows of graves, the gate on its south side.
      const w = p.warps[3]; p.bare(3); p.fill("field", 3, 3, 11, 7);
      fence(p, 2, 2, 12, 2, [170, 170, 176]); fence(p, 2, 8, 6, 8, [170, 170, 176]); fence(p, 8, 8, 12, 8, [170, 170, 176]); fence(p, 2, 3, 2, 7, [170, 170, 176]); fence(p, 12, 3, 12, 7, [170, 170, 176]);
      for (const [x, y] of [[4, 4], [6, 4], [8, 4], [10, 4], [4, 6], [5, 6], [9, 6], [10, 6]]) grave(p, x, y);
      p.paint(w.y + 1, (c, top) => { const px = w.x * 16, py = w.y * 16; top.box(px - 4, py - 14, 24, 6, [120, 120, 130], [60, 60, 70]); for (const dx of [-4, 16]) c.box(px + dx, py - 8, 4, 23, [150, 150, 160], [60, 60, 70]); });
      // The berry farm.
      p.building(2, "peak", { tint: p.roof(1.5, 0.8, 0.6) });
      crops(p, 21, 17, 26, 21, [220, 90, 110]); crops(p, 22, 26, 33, 26, [90, 120, 220]);
      fence(p, 20, 16, 27, 16); fence(p, 20, 17, 20, 22);
      // The motel.
      house(p, 4, 18, 9, 4, { wall: [236, 214, 180], roof: [190, 80, 70], roofH: 18, flat: true, sign: [250, 240, 160] });
      p.street("sand", 2, [[8, 22], [8, 16]]);
      for (const [x, y] of [[14, 11], [22, 12], [3, 23], [14, 23], [33, 11], [15, 3], [21, 3], [33, 17]]) palm(p, x, y);
    },
  },
  // Route 4: the wooded dirt track from Heahea up to Paniola Town, doubling back across two
  // ledges with long grass under the trees.
  AlolaRoute4: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.22, groves: 0.1, flowers: 0.08, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 12, 21, 32, 22, 3); crag(p, "rock", 1, 11, 19, 12, 6);
      p.street("dirt", 2, [[17, 30], [17, 25], [9, 25], [9, 16], [24, 16], [24, 8], [17, 8], [17, 1]]);
      p.street("dirt", 2, [[1, 16], [32, 16]]);
      steps(p, 9, 21, 2, [150, 120, 84]); steps(p, 24, 11, 2, [150, 120, 84]);
      fence(p, 12, 27, 15, 27); fence(p, 19, 6, 22, 6);
      p.decor("honeyTree", 28, 4, { canopy: true }); p.decor("honeyTree", 4, 27, { canopy: true });
    },
  },
  // Route 5: the grassy ledges between Paniola Ranch and Brooklet Hill; the path steps down
  // terrace by terrace and the trial gate of Brooklet Hill stands at the top.
  AlolaRoute5: {
    theme: { ground: "meadow", road: "dirt", border: "tree", density: 0.06, groves: 0.04, flowers: 0.12, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 1, 15, 20, 16, 2); crag(p, "rock", 25, 15, 28, 16, 2); crag(p, "rock", 11, 9, 16, 10, 7); crag(p, "rock", 21, 9, 28, 10, 7);
      p.street("dirt", 2, [[15, 22], [15, 18], [22, 18], [22, 12], [8, 12], [8, 6], [15, 6], [15, 1]]);
      p.street("dirt", 2, [[1, 12], [28, 12]]);
      steps(p, 22, 15, 2, [150, 120, 84]); steps(p, 8, 9, 2, [150, 120, 84]);
      trialGate(p, 1, [80, 150, 226]);
      fence(p, 3, 18, 12, 18); fence(p, 18, 4, 26, 4);
      p.fill("flowersBlue", 20, 6, 25, 7);
    },
  },
  // Route 6: the straight paved road from the ranch to Royal Avenue, fenced pasture on the west
  // side and open grass on the east.
  AlolaRoute6: {
    theme: { ground: "grass", road: "paving", border: "tree", density: 0.05, groves: 0.03, flowers: 0.08, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.street("paving", 3, [[17, 1], [17, 30]]); p.street("dirt", 2, [[1, 16], [32, 16]]);
      for (const [x0, y0, x1, y1] of [[3, 4, 13, 13], [3, 20, 13, 28]]) {
        p.fill("field", x0 + 1, y0 + 1, x1 - 1, y1 - 1);
        fence(p, x0, y0, x1, y0); fence(p, x0, y1, x1, y1); fence(p, x0, y0 + 1, x0, y1 - 1); fence(p, x1, y0 + 1, x1, y0 + 3); fence(p, x1, y0 + 5, x1, y1 - 1);
      }
      for (const [x, y] of [[5, 6], [9, 8], [7, 11], [11, 6]]) cow(p, x, y, [250, 190, 200], [40, 40, 40]);
      for (const [x, y] of [[6, 23], [10, 25], [8, 26]]) cow(p, x, y, [150, 100, 60], [90, 60, 40]);
      fence(p, 20, 3, 20, 13, [236, 232, 220]); fence(p, 20, 19, 20, 29, [236, 232, 220]);
      for (const y of [6, 12, 21, 27]) post(p, 15, y, [240, 200, 80]);
      p.decor("honeyTree", 27, 5, { canopy: true }); p.decor("barrels", 4, 5); p.decor("barrels", 4, 21);
    },
  },
  // Route 7: the short shore road under Wela Volcano. Black lava rock rises in the north round
  // the trial gate, the beach and the sea lie south of the road.
  AlolaRoute7: {
    theme: { ground: "grass", road: "sand", border: "ashrock", water: "sea", density: 0.04, groves: 0, flowers: 0.04, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      p.fill("ashrock", 1, 1, 36, 6); crag(p, "ashrock", 1, 7, 15, 9, 3); crag(p, "ashrock", 25, 7, 36, 9, 5);
      p.fill("beach", 1, 18, 36, 21); for (let x = 1; x <= 36; x++) p.fill("water", x, 21 + Math.floor(p.hash(x >> 1, 1, 9) * 2), x, 28);
      p.street("sand", 3, [[1, 15], [36, 15]]); cut(p, "clay", 4, [[19, 13], [19, 1]]); p.street("deck", 3, [[19, 17], [19, 28]]);
      trialGate(p, 1, [230, 90, 50]);
      // Lava glowing in the cracks of the rock.
      p.paint(2, (c) => { for (const [x, y, n] of [[4, 3, 5], [10, 5, 4], [28, 3, 6], [33, 6, 3], [14, 2, 3], [25, 5, 3]]) for (let i = 0; i < n; i++) { const px = (x + i) * 16 + Math.floor(p.hash(x, i, 2) * 8), py = y * 16 + Math.floor(p.hash(i, y, 4) * 14); c.line(px, py, px + 12, py + 5 - Math.floor(p.hash(i, x, 6) * 10), [250, 120, 40], 2); c.line(px + 2, py + 1, px + 9, py + 3, [255, 220, 110], 1); } });
      for (const [x, y] of [[6, 19], [12, 20], [26, 19], [31, 20]]) parasol(p, x, y);
      for (const [x, y] of [[3, 12], [10, 12], [28, 12], [35, 12], [16, 19], [23, 19]]) palm(p, x, y);
      boat(p, 22, 24, [240, 240, 244], 3);
    },
  },
  // Route 8: the west coast of Akala. Sea and beach along the west side, the Aether Foundation's
  // trailer in the bend of the road, the fossil restoration centre and the motel to the east,
  // Diglett's Tunnel in the cliff and Lush Jungle's trial gate at the north end.
  AlolaRoute8: {
    theme: { ground: "grass", road: "sand", border: "palms", water: "sea", density: 0.05, groves: 0, flowers: 0.08, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("beach", 1, 1, 9, 32); for (let y = 1; y <= 32; y++) p.fill("water", 1, y, 5 + Math.floor(p.hash(y >> 1, 2, 3) * 2), y);
      p.fill("rock", 28, 6, 38, 10); crag(p, "rock", 33, 11, 38, 13, 4); caveOn(p, 2);
      p.street("sand", 2, [[20, 32], [20, 25], [13, 25], [13, 17], [20, 17], [20, 9], [25, 9], [25, 4], [20, 4], [20, 1]]);
      p.street("sand", 2, [[21, 17], [38, 17]]); p.street("sand", 1, [[30, 14], [30, 16]]); p.street("deck", 3, [[1, 17], [8, 17]]); p.street("sand", 2, [[9, 17], [12, 17]]);
      trialGate(p, 1, [90, 190, 90]);
      trailer(p, 15, 21, 4);                                                             // the Aether base
      house(p, 28, 20, 6, 4, { wall: [226, 226, 232], roof: [90, 110, 150], roofH: 18, flat: true, door: 2, sign: [240, 200, 90] });  // fossil restoration centre
      house(p, 25, 27, 9, 4, { wall: [236, 214, 180], roof: [190, 80, 70], roofH: 18, flat: true, sign: [250, 240, 160] });           // the motel
      p.street("sand", 1, [[30, 24], [30, 25], [22, 25]]);
      for (const [x, y] of [[8, 5], [9, 12], [8, 22], [9, 29], [16, 12], [23, 13], [36, 20], [36, 28], [16, 29], [14, 5]]) palm(p, x, y);
      parasol(p, 7, 9); parasol(p, 8, 26); boat(p, 2, 14, [240, 200, 90], 3);
    },
  },
  // Lush Jungle: a ring of trails under the canopy linking the clearings where the trial's
  // ingredients grow, the totem's den in the middle and a pool in the south-east.
  AlolaLushJungle: {
    theme: { ground: "shade", road: "dirt", border: "palms", grass: "shadegrass", water: "water", density: 0.5, groves: 0.3, flowers: 0.05, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 34, 28, 4, 3); p.disc("water", 6, 30, 3, 2);
      p.street("dirt", 2, [[21, 33], [21, 26], [12, 26], [12, 8], [30, 8], [30, 21], [21, 21], [21, 26]]);
      p.street("dirt", 2, [[21, 21], [21, 16]]); p.street("dirt", 2, [[21, 12], [21, 1]]); p.street("dirt", 2, [[1, 18], [12, 18]]); p.street("dirt", 2, [[30, 18], [40, 18]]);
      p.disc("dirt", 21.5, 15, 3.6, 3);
      trialGate(p, 0, [90, 190, 90]);
      for (const [x, y] of [[9, 5], [15, 11], [26, 5], [33, 11], [8, 22], [16, 22], [26, 23], [33, 18], [17, 13], [25, 13]]) p.decor("honeyTree", x, y, { canopy: true });
      // Mushrooms and big leaves on the jungle floor.
      p.paint(1, (c) => { for (let i = 0; i < 40; i++) { const x = 3 + Math.floor(p.hash(i, 1, 5) * 36), y = 3 + Math.floor(p.hash(i, 2, 5) * 30), px = x * 16 + 4, py = y * 16 + 6; if (i % 2) { c.rect(px + 3, py + 4, 2, 4, [236, 226, 200]); c.ellipse(px + 4, py + 3, 4, 3, [226, 90, 70]); c.p(px + 3, py + 2, [250, 250, 250]); } else { c.ellipse(px + 4, py + 4, 6, 3, [40, 130, 80]); c.line(px - 1, py + 4, px + 9, py + 4, [90, 180, 110]); } } });
    },
  },
  // Memorial Hill: the graveyard on the hillside above Konikoni. The gravel path winds up between
  // rows of headstones to the cave that leads to the Ruins of Life.
  AlolaMemorialHill: {
    theme: { ground: "field", road: "gravel", border: "rock", density: 0.06, groves: 0, flowers: 0.1, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.street("gravel", 2, [[15, 22], [15, 17], [8, 17], [8, 12], [22, 12], [22, 6], [15, 6], [15, 1]]); p.street("gravel", 2, [[1, 12], [28, 12]]);
      for (const y of [4, 9, 15, 20]) for (let x = 3; x <= 26; x += 2) { if ((y === 4 && x >= 13 && x <= 23) || (y === 9 && (x < 11 || x > 20)) || (y === 15 && (x < 11)) || (y === 20 && x >= 13 && x <= 18)) continue; grave(p, x, y, p.hash(x, y, 2) < 0.3 ? [150, 150, 140] : [176, 176, 186]); }
      fence(p, 10, 10, 20, 10, [120, 120, 130]); fence(p, 11, 16, 26, 16, [120, 120, 130]);
      p.fill("flowersRed", 3, 5, 8, 5); p.fill("flowersBlue", 20, 21, 26, 21);
    },
  },
  // Route 10: the mountain road out of Malie. It climbs past two rock ledges to the lay-by where
  // the Mount Hokulani bus waits at its stop.
  AlolaRoute10: {
    theme: { ground: "grass", road: "asphalt", border: "tree", density: 0.08, groves: 0.05, flowers: 0.06, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 13, 18, 32, 19, 3); crag(p, "rock", 1, 10, 21, 11, 5);
      p.street("asphalt", 3, [[17, 30], [17, 23], [10, 23], [10, 14], [25, 14], [25, 7], [17, 7], [17, 1]]);
      p.street("dirt", 2, [[1, 16], [9, 16]]); p.street("dirt", 2, [[26, 16], [32, 16]]);
      p.fill("asphalt", 19, 3, 24, 5);
      // The bus and its stop.
      p.block(20, 3, 3, 2);
      p.paint(5, (c) => { const px = 20 * 16, py = 3 * 16; c.rect(px + 3, py + 29, 46, 4, [0, 0, 0, 70]); c.box(px + 1, py + 2, 46, 26, [250, 250, 244], [60, 60, 70]); c.rect(px + 2, py + 17, 44, 5, [240, 190, 60]); c.rect(px + 2, py + 22, 44, 2, [70, 150, 200]); for (let i = 0; i < 4; i++) c.box(px + 4 + i * 10, py + 6, 8, 8, [120, 190, 230], [60, 60, 70]); c.box(px + 39, py + 6, 6, 18, [150, 200, 230], [60, 60, 70]); for (const wx of [px + 9, px + 35]) { c.ellipse(wx, py + 29, 5, 4, [40, 40, 46]); c.ellipse(wx, py + 29, 2, 2, [170, 170, 176]); } });
      post(p, 24, 3, [226, 70, 60]); p.decor("bench", 23, 2);
      fence(p, 13, 26, 15, 26, [236, 232, 220]); fence(p, 21, 12, 23, 12, [236, 232, 220]);
      for (const [x, y] of [[8, 20], [8, 26], [13, 12], [27, 10], [15, 5]]) post(p, x, y, [240, 200, 80]);
    },
  },
  // Mount Hokulani: the switchback road up the bare mountainside to the observatory's white dome
  // on the summit; the road on to Route 11 runs along the foot of the slope.
  AlolaMountHokulani: {
    theme: { ground: "field", road: "asphalt", border: "rock", density: 0.07, groves: 0, flowers: 0.02, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 3, 12, 28, 13, 3); crag(p, "rock", 10, 8, 35, 9, 5); p.fill("rock", 1, 2, 4, 9); p.fill("rock", 27, 2, 36, 4);
      p.street("asphalt", 3, [[1, 15], [36, 15]]);
      p.street("asphalt", 2, [[30, 14], [30, 10], [6, 10], [6, 6], [20, 6]]); p.street("asphalt", 1, [[20, 5], [20, 6]]); p.street("gravel", 2, [[19, 17], [19, 28]]);
      // The observatory: a white drum under a ribbed dome with its shutter open.
      const w = p.warps[1]; p.bare(1); for (const [x, y] of tilesOf(17, 2, 23, 4)) if (x !== w.x || y !== w.y) p.block(x, y, 1, 1);
      p.paint(5, (c, top) => { const px = 17 * 16, py = 2 * 16, cx = px + 56; c.rect(px + 4, py + 46, 106, 4, [0, 0, 0, 60]); c.box(px + 2, py + 14, 108, 34, [236, 236, 240], [70, 76, 96]); c.rect(px + 3, py + 40, 106, 7, [190, 194, 206]); for (let i = px + 8; i < px + 44; i += 12) c.box(i, py + 22, 8, 9, [120, 190, 230], [70, 76, 96]); for (let i = px + 70; i < px + 104; i += 12) c.box(i, py + 22, 8, 9, [120, 190, 230], [70, 76, 96]); c.box(w.x * 16 + 1, py + 30, 14, 18, [80, 90, 120], [50, 54, 70]);
        top.ellipse(cx, py + 14, 46, 34, [70, 76, 96]); top.ellipse(cx, py + 14, 44, 32, [226, 228, 236]); top.ellipse(cx - 10, py + 4, 22, 14, [246, 246, 250]); top.rect(cx - 5, py - 18, 10, 32, [60, 66, 90]); top.rect(cx - 3, py - 16, 2, 28, [130, 150, 190]); for (const dx of [-30, -18, 18, 30]) top.rect(cx + dx, py - 8 + Math.abs(dx) / 3, 1, 20 - Math.abs(dx) / 3, [176, 180, 196]); c.rect(px + 2, py + 14, 108, 2, [70, 76, 96]); });
      // Guard rails on the outside of each bend, and the bus down at the stop.
      fence(p, 32, 10, 32, 13, [200, 200, 210]); fence(p, 4, 5, 4, 11, [200, 200, 210]);
      p.block(26, 18, 3, 2);
      p.paint(20, (c) => { const px = 26 * 16, py = 18 * 16; c.rect(px + 3, py + 29, 46, 4, [0, 0, 0, 70]); c.box(px + 1, py + 2, 46, 26, [250, 250, 244], [60, 60, 70]); c.rect(px + 2, py + 17, 44, 5, [240, 190, 60]); for (let i = 0; i < 4; i++) c.box(px + 4 + i * 10, py + 6, 8, 8, [120, 190, 230], [60, 60, 70]); for (const wx of [px + 9, px + 35]) { c.ellipse(wx, py + 29, 5, 4, [40, 40, 46]); c.ellipse(wx, py + 29, 2, 2, [170, 170, 176]); } });
      post(p, 30, 18, [226, 70, 60]);
    },
  },
  // Route 11: a short wooded trail east of Malie Garden, looping round a pond under the trees.
  AlolaRoute11: {
    theme: { ground: "grass", road: "dirt", border: "tree", water: "water", density: 0.3, groves: 0.16, flowers: 0.06, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 26, 8, 4, 3);
      p.street("dirt", 2, [[17, 30], [17, 24], [24, 24], [24, 16], [10, 16], [10, 7], [17, 7], [17, 1]]); p.street("dirt", 2, [[1, 16], [32, 16]]);
      fence(p, 19, 22, 22, 22); fence(p, 12, 9, 15, 9); fence(p, 21, 12, 30, 12);
      p.decor("honeyTree", 5, 4, { canopy: true }); p.decor("honeyTree", 28, 26, { canopy: true }); p.decor("bench", 22, 6);
    },
  },
  // Route 12: the lava-rock badlands. The road dips round black ridges below Blush Mountain,
  // whose geothermal power plant stands at the head of the track.
  AlolaRoute12: {
    theme: { ground: "ash", road: "gravel", border: "ashrock", density: 0.12, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("ashrock", 2, 3, 13, 7); crag(p, "ashrock", 2, 8, 12, 10, 3); p.fill("ashrock", 27, 3, 35, 8); crag(p, "ashrock", 28, 9, 35, 11, 5);
      p.fill("ashrock", 16, 17, 24, 19); crag(p, "ashrock", 3, 21, 9, 24, 7); crag(p, "ashrock", 30, 22, 35, 25, 9);
      p.street("gravel", 2, [[36, 15], [27, 15], [27, 21], [12, 21], [12, 15], [1, 15]]); p.street("gravel", 2, [[13, 15], [26, 15]]);
      p.street("gravel", 2, [[20, 5], [20, 14]]); p.street("gravel", 2, [[19, 22], [19, 28]]);
      // The geothermal plant: a low grey block with pipes and two steaming stacks.
      houseOn(p, 1, 7, 3, 3, { wall: [176, 180, 190], roof: [96, 104, 124], roofH: 16, flat: true, win: [240, 200, 90], extra: (c, px, py, pw) => { c.rect(px + 4, py + 30, pw - 8, 2, [226, 120, 60]); } });
      p.paint(5, (c, top) => { const px = 17 * 16, py = 2 * 16; for (const dx of [10, 86]) { top.box(px + dx, py - 26, 12, 30, [150, 154, 166], [60, 64, 80]); top.rect(px + dx + 1, py - 20, 10, 3, [226, 90, 60]); top.ellipse(px + dx + 8, py - 32, 8, 5, [240, 240, 244, 200]); top.ellipse(px + dx + 14, py - 40, 10, 6, [240, 240, 244, 150]); } });
      p.paint(2, (c) => { for (const [x, y, n] of [[4, 5, 6], [29, 5, 5], [17, 18, 6], [4, 22, 4], [31, 23, 3]]) for (let i = 0; i < n; i++) { const px = (x + i) * 16 + Math.floor(p.hash(x, i, 2) * 8), py = y * 16 + Math.floor(p.hash(i, y, 4) * 14); c.line(px, py, px + 12, py + 5 - Math.floor(p.hash(i, x, 6) * 10), [250, 120, 40], 2); c.line(px + 2, py + 1, px + 9, py + 3, [255, 220, 110], 1); } });
      for (const [x, y] of [[15, 12], [24, 12], [9, 18], [29, 18]]) stone(p, x, y, [70, 60, 60], 6);
    },
  },
  // Route 13: the dusty flat between the badlands and Tapu Village. The motel and the oasis
  // trailer by its palm-ringed pool stand south of the road; the way north leads to the village.
  AlolaRoute13: {
    theme: { ground: "desert", road: "gravel", border: "rock", water: "water", density: 0.06, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 2, 12, 5); crag(p, "rock", 2, 6, 10, 8, 3); p.fill("rock", 27, 2, 35, 6); crag(p, "rock", 29, 7, 35, 9, 5);
      p.street("gravel", 3, [[36, 15], [27, 15], [27, 12], [12, 12], [12, 15], [1, 15]]); p.street("gravel", 2, [[20, 1], [20, 28]]);
      house(p, 4, 19, 9, 4, { wall: [236, 214, 180], roof: [190, 80, 70], roofH: 18, flat: true, door: 4, sign: [250, 240, 160] });   // the motel
      p.street("gravel", 1, [[8, 23], [8, 24], [19, 24]]);
      p.disc("water", 31, 23, 3.4, 2.6); p.disc("grass", 31, 23, 6, 4.6); p.disc("water", 31, 23, 3.4, 2.6);
      trailer(p, 24, 20, 4, [226, 150, 70]);
      for (const [x, y] of [[26, 24], [29, 19], [34, 20], [35, 25], [28, 27], [32, 27]]) palm(p, x, y);
      for (const [x, y] of [[15, 9], [24, 9], [6, 11], [33, 12], [15, 19], [3, 26], [15, 27]]) stone(p, x, y, [176, 150, 110], 5);
    },
  },
  // Route 14: the black-sand beach south-east of Tapu Village. The sea lies to the east, and the
  // wrecked Thrifty Megamart with its cracked car park stands abandoned at the north end.
  AlolaRoute14: {
    theme: { ground: "ash", road: "gravel", border: "rock", water: "sea", density: 0.05, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      for (let y = 1; y <= 30; y++) p.fill("water", (y < 9 ? 28 : 24) + Math.floor(p.hash(y >> 1, 3, 5) * 3), y, 32, y);
      p.fill("asphalt", 7, 4, 26, 8);
      p.street("gravel", 2, [[17, 9], [17, 13], [11, 13], [11, 22], [17, 22], [17, 30]]); p.street("gravel", 3, [[17, 1], [17, 3]]);
      p.street("gravel", 2, [[1, 16], [22, 16]]); p.street("deck", 3, [[23, 16], [32, 16]]);
      p.bare(1); ruin(p, 7, 1, 9, 3, 0); ruin(p, 19, 1, 9, 3, 1);
      p.paint(4, (c, top) => { top.box(15 * 16, 8, 5 * 16, 12, [150, 70, 80], [60, 40, 50]); for (let i = 0; i < 5; i++) top.rect(15 * 16 + 8 + i * 14, 11, 8, 6, i === 3 ? [90, 50, 60] : [226, 210, 190]); c.rect(17 * 16, 3 * 16, 16, 16, [20, 18, 26, 190]); });
      // The car park: faded bays, cracks and an abandoned trolley or two.
      p.paint(1, (c) => { for (let x = 8; x <= 25; x += 2) if (x < 15 || x > 19) { c.rect(x * 16, 5 * 16, 1, 28, [200, 200, 190, 150]); c.rect(x * 16, 7 * 16 + 4, 1, 24, [200, 200, 190, 110]); } for (const [x, y] of [[9, 6], [22, 5], [13, 8], [24, 8]]) { c.line(x * 16, y * 16, x * 16 + 14, y * 16 + 9, [40, 40, 46], 1); c.line(x * 16 + 14, y * 16 + 9, x * 16 + 20, y * 16 + 4, [40, 40, 46], 1); } });
      for (const [x, y] of [[10, 6], [23, 7]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px + 2, py + 3, 11, 8, [190, 190, 200], [80, 80, 96]); c.rect(px + 3, py + 6, 9, 1, [80, 80, 96]); c.rect(px + 12, py + 1, 3, 2, [200, 60, 60]); c.ellipse(px + 4, py + 13, 2, 2, [40, 40, 46]); c.ellipse(px + 11, py + 13, 2, 2, [40, 40, 46]); }); }
      for (const [x, y] of [[20, 12], [22, 20], [21, 27], [6, 12], [5, 24]]) stone(p, x, y, [70, 66, 76], 4);
      boat(p, 27, 20, [150, 110, 90], 3);
    },
  },
  // Route 15: the shore below the Aether House. The white house with its fenced yard stands on
  // the rise, the beach runs along the road and a pier heads out among the sea rocks.
  AlolaRoute15: {
    theme: { ground: "grass", road: "sand", border: "rock", water: "sea", density: 0.04, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("beach", 1, 17, 36, 20); for (let x = 1; x <= 36; x++) p.fill("water", x, 20 + Math.floor(p.hash(x >> 1, 4, 9) * 2), x, 28);
      p.street("sand", 3, [[1, 15], [36, 15]]); p.street("sand", 2, [[20, 5], [20, 13]]); p.street("deck", 3, [[19, 17], [19, 28]]);
      houseOn(p, 1, 9, 3, 4, { wall: [250, 250, 246], roof: [236, 196, 90], roofH: 18, win: [150, 210, 240], band: [236, 196, 90] });
      fence(p, 12, 3, 12, 8, [250, 250, 250]); fence(p, 28, 3, 28, 8, [250, 250, 250]); fence(p, 13, 8, 18, 8, [250, 250, 250]); fence(p, 23, 8, 27, 8, [250, 250, 250]);
      p.fill("flowersPink", 13, 6, 17, 7); p.fill("flowersBlue", 24, 6, 27, 7);
      for (const [x, y] of [[6, 24], [10, 26], [28, 23], [32, 26], [14, 23], [25, 27], [4, 27]]) stone(p, x, y, [130, 124, 130], 3);
      for (const [x, y] of [[4, 12], [9, 12], [31, 12], [35, 12], [15, 18], [24, 18]]) palm(p, x, y);
      parasol(p, 7, 18); parasol(p, 29, 18);
    },
  },
  // Route 16: the coast road north to Ula'ula Meadow, with the Aether Foundation's trailer base
  // in the bend and a pier out over the eastern sea.
  AlolaRoute16: {
    theme: { ground: "grass", road: "sand", border: "tree", water: "sea", density: 0.08, groves: 0.04, flowers: 0.08, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("beach", 23, 1, 32, 30); for (let y = 1; y <= 30; y++) p.fill("water", 26 + Math.floor(p.hash(y >> 1, 5, 3) * 2), y, 32, y);
      p.street("sand", 2, [[17, 30], [17, 22], [10, 22], [10, 12], [17, 12], [17, 1]]); p.street("sand", 2, [[1, 16], [10, 16]]);
      p.street("sand", 2, [[11, 16], [24, 16]]); p.street("deck", 3, [[25, 16], [32, 16]]);
      trailer(p, 12, 19, 4); trailer(p, 19, 19, 3, [236, 196, 90]);
      p.paint(19, (c, top) => { const px = 16 * 16 + 8, py = 18 * 16; c.rect(px, py + 2, 2, 14, [90, 90, 100]); top.ellipse(px + 1, py - 2, 7, 6, [226, 226, 232]); top.ellipse(px + 2, py - 3, 4, 3, [170, 176, 190]); }); p.block(16, 18, 1, 1);
      fence(p, 19, 8, 22, 8, [236, 232, 220]); fence(p, 19, 24, 22, 24, [236, 232, 220]);
      for (const [x, y] of [[24, 5], [23, 11], [24, 21], [23, 27]]) palm(p, x, y);
      parasol(p, 24, 8); boat(p, 28, 12, [240, 240, 244], 3);
    },
  },
  // Ula'ula Meadow: a sea of red flowers round two pools, crossed by a zigzag boardwalk.
  AlolaUlaMeadow: {
    theme: { ground: "meadow", road: "deck", border: "tree", water: "water", density: 0.03, groves: 0, flowers: 0, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      blooms(p, "flowersRed", 2, 2, 31, 29, 0.6, 3);
      p.disc("water", 14, 21, 3.2, 2.4); p.disc("water", 21, 11, 3.4, 2.4); p.disc("water", 28, 24, 2.6, 2);
      p.street("deck", 2, [[17, 30], [17, 25], [8, 25], [8, 16], [26, 16], [26, 7], [17, 7], [17, 1]]); p.street("deck", 2, [[1, 16], [32, 16]]);
      for (const [x, y] of [[10, 18], [24, 18], [10, 23], [24, 14], [15, 9], [19, 5]]) post(p, x, y, [226, 70, 60]);
      p.decor("bench", 12, 14); p.decor("bench", 22, 23);
    },
  },
  // Route 17: the rain-soaked hill below Po Town. The track climbs two ledges to the town's
  // graffitied wall, with the police station beside the gate.
  AlolaRoute17: {
    theme: { ground: "shade", road: "dirt", border: "rock", grass: "shadegrass", density: 0.08, groves: 0.04, flowers: 0, puddles: 0.14, tree: "tree1", treeTint: "dark", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 12, 20, 32, 21, 3); crag(p, "rock", 1, 10, 14, 11, 5); crag(p, "rock", 21, 12, 32, 13, 6);
      p.street("dirt", 2, [[17, 30], [17, 25], [9, 25], [9, 16], [17, 16], [17, 1]]); p.street("dirt", 2, [[1, 16], [32, 16]]);
      wall(p, 2, 2, 15, 3, true); wall(p, 19, 2, 31, 3, true);
      house(p, 21, 6, 6, 4, { wall: [200, 210, 226], roof: [60, 90, 150], roofH: 18, flat: true, door: 2, sign: [240, 210, 80] });   // the police station
      p.street("dirt", 1, [[23, 10], [23, 11], [19, 11]]);
      steps(p, 9, 20, 2, [130, 120, 110]);
      for (const [x, y] of [[15, 5], [19, 5], [20, 9], [27, 10]]) lamp(p, x, y, [236, 226, 150]);
      // Rain.
      p.paint(999, (c, top) => { for (let i = 0; i < 900; i++) { const x = Math.floor(p.hash(i, 1, 11) * p.W * 16), y = Math.floor(p.hash(i, 2, 11) * p.H * 16); top.line(x, y, x - 3, y + 7, [190, 210, 240, 110], 1); } });
    },
  },
  // Haina Desert: featureless sand walled into chambers by rock, the faint track marked only by
  // clusters of standing stones, and a sandstorm blowing across it all.
  AlolaHainaDesert: {
    theme: { ground: "desert", road: "beach", border: "rock", density: 0.1, groves: 0, flowers: 0, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 1, 20, 24, 22, 3); crag(p, "rock", 9, 10, 32, 12, 5);
      p.street("beach", 2, [[17, 30], [17, 25], [28, 25], [28, 16], [5, 16], [5, 7], [17, 7], [17, 1]]); p.street("beach", 2, [[1, 16], [32, 16]]);
      for (const [x, y] of [[20, 27], [26, 23], [27, 23], [7, 18], [8, 18], [9, 18], [3, 9], [4, 9], [12, 5], [13, 5], [14, 5], [15, 5], [30, 14], [20, 14], [21, 14]]) stone(p, x, y, [190, 160, 110], 7);
      // The sandstorm.
      p.paint(999, (c, top) => { for (let i = 0; i < 700; i++) { const x = Math.floor(p.hash(i, 3, 13) * p.W * 16), y = Math.floor(p.hash(i, 4, 13) * p.H * 16), l = 6 + Math.floor(p.hash(i, 5, 13) * 14); top.rect(x, y, l, 1, [250, 236, 190, 120]); } });
    },
  },
  // Aether Paradise: the white upper deck of the artificial island. Walkways cross to the
  // triangular lift in the middle, lawns and hedges soften the plating and the sea shows at
  // every corner.
  AlolaAetherLobby: {
    theme: { ground: "paving", road: "steel", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, lawns: 0, fountain: false, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      for (const [x0, y0, x1, y1] of [[1, 4, 9, 11], [28, 4, 36, 11], [1, 21, 9, 30], [28, 21, 36, 30]]) p.fill("water", x0, y0, x1, y1);
      p.street("steel", 3, [[19, 1], [19, 30]]); p.street("steel", 3, [[1, 16], [36, 16]]);
      p.paint(1, (c) => { const cx = 19 * 16 + 8, cy = 16 * 16 + 8; c.poly([[cx, cy - 46], [cx + 52, cy + 34], [cx - 52, cy + 34]], [236, 196, 90]); c.poly([[cx, cy - 38], [cx + 42, cy + 29], [cx - 42, cy + 29]], [246, 246, 250]); c.poly([[cx, cy - 20], [cx + 20, cy + 16], [cx - 20, cy + 16]], [236, 196, 90]); c.ellipse(cx, cy + 4, 6, 6, [250, 250, 250]); });
      for (const [x0, y0, x1, y1] of [[11, 5, 16, 11], [22, 5, 27, 11], [11, 21, 16, 28], [22, 21, 27, 28]]) { p.fill("lawn", x0, y0, x1, y1); for (let x = x0; x <= x1; x++) { p.decor("hedge", x, y0); p.decor("hedge", x, y1); } p.decor("tree1", x0 + 2, y0 + 2, { canopy: true }); }
      house(p, 11, 1, 6, 3, { wall: [250, 250, 250], roof: [236, 196, 90], roofH: 14, flat: true, win: [150, 210, 240] }); house(p, 22, 1, 6, 3, { wall: [250, 250, 250], roof: [236, 196, 90], roofH: 14, flat: true, win: [150, 210, 240] });
      for (const [x, y] of [[10, 13], [28, 13], [10, 19], [28, 19], [16, 13], [22, 13], [16, 19], [22, 19]]) lamp(p, x, y, [250, 250, 240]);
    },
  },
  // Poni Wilds: an untamed shore. The trail from Seafolk Village runs under rock outcrops to the
  // path north; long grass on the flats, a sand spit out into the surf.
  AlolaPoniWilds: {
    theme: { ground: "grass", road: "sand", border: "rock", water: "sea", density: 0.1, groves: 0, flowers: 0.04, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 2, 13, 6); crag(p, "rock", 2, 7, 11, 9, 3); p.fill("rock", 26, 2, 35, 5); crag(p, "rock", 28, 6, 35, 8, 5);
      p.fill("beach", 1, 19, 36, 22); for (let x = 1; x <= 36; x++) p.fill("water", x, 22 + Math.floor(p.hash(x >> 1, 6, 9) * 2), x, 28);
      p.fill("beach", 18, 22, 21, 28);
      p.street("sand", 2, [[36, 15], [27, 15], [27, 10], [20, 10], [20, 1]]); p.street("sand", 2, [[27, 15], [10, 15], [10, 17], [1, 15]]); p.street("sand", 2, [[19, 16], [19, 20]]);
      for (const [x, y] of [[5, 25], [10, 26], [14, 24], [26, 25], [31, 26], [34, 24]]) stone(p, x, y, [130, 124, 130], 4);
      for (const [x, y] of [[4, 12], [15, 12], [24, 12], [34, 12], [7, 20], [30, 20]]) palm(p, x, y);
    },
  },
  // Poni Breaker Coast: surf pounding a rocky shore. Cliffs along the north hold the cave to the
  // Ruins of Hope; the sea wraps the west and south, full of rocks and foam.
  AlolaPoniBreakers: {
    theme: { ground: "beach", road: "sand", border: "rock", water: "sea", sea: null, density: 0.08, groves: 0, flowers: 0, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 1, 15, 4); crag(p, "rock", 2, 5, 15, 6, 3); p.fill("rock", 23, 1, 36, 4); crag(p, "rock", 23, 5, 36, 6, 5);
      for (let y = 7; y <= 28; y++) p.fill("water", 1, y, 6 + Math.floor(p.hash(y >> 1, 7, 3) * 3), y);
      for (let x = 1; x <= 36; x++) p.fill("water", x, 22 + Math.floor(p.hash(x >> 1, 8, 9) * 2), x, 28);
      p.fill("beach", 1, 14, 9, 16); p.fill("beach", 18, 22, 21, 28);
      p.street("sand", 2, [[36, 15], [26, 15], [26, 9], [20, 9], [20, 5]]); p.street("sand", 2, [[26, 15], [10, 15]]); p.street("sand", 2, [[19, 16], [19, 21]]); p.street("sand", 2, [[17, 1], [17, 8], [20, 9]]);
      for (const [x, y] of [[3, 9], [5, 11], [2, 19], [4, 22], [8, 25], [12, 26], [15, 24], [25, 26], [29, 24], [33, 26], [35, 23], [3, 26]]) stone(p, x, y, [120, 116, 126], 5);
      // Foam where the breakers hit the rocks.
      p.paint(2, (c) => { for (const [x, y] of [[3, 9], [5, 11], [2, 19], [4, 22], [8, 25], [12, 26], [15, 24], [25, 26], [29, 24], [33, 26], [35, 23], [3, 26]]) { c.ellipse(x * 16 + 8, y * 16 + 15, 12, 4, [250, 250, 250, 170], 2); c.rect(x * 16 - 6, y * 16 + 20, 9, 1, [250, 250, 250, 150]); c.rect(x * 16 + 12, y * 16 + 22, 9, 1, [250, 250, 250, 150]); } });
      for (const [x, y] of [[12, 12], [23, 12], [32, 12], [30, 19]]) palm(p, x, y);
    },
  },
  // Poni Plains: wide open grassland. Dirt tracks cross it to the meadow, the grove and the
  // gauntlet, with lone trees, a pond and drifts of flowers in the long grass.
  AlolaPoniPlains: {
    theme: { ground: "meadow", road: "dirt", border: "tree", water: "water", density: 0.04, groves: 0.02, flowers: 0.14, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 29, 23, 3.4, 2.4);
      p.street("dirt", 2, [[36, 15], [27, 15], [27, 18], [11, 18], [11, 15], [1, 15]]); p.street("dirt", 2, [[20, 18], [20, 1]]); p.street("dirt", 2, [[19, 19], [19, 28]]);
      for (const [x, y] of [[6, 5], [14, 9], [26, 6], [32, 10], [6, 22], [13, 24], [24, 25], [33, 4]]) p.decor("tree1", x, y, { canopy: true });
      p.decor("boulder", 9, 11); p.decor("boulder", 30, 18); p.decor("boulder", 15, 21);
      fence(p, 22, 20, 26, 20); fence(p, 13, 13, 17, 13);
    },
  },
  // Poni Meadow: a flooded meadow of purple flowers. Boardwalks cross the water between the
  // flower islands to the cave at the far end.
  AlolaPoniMeadow: {
    theme: { ground: "meadow", road: "deck", border: "tree", water: "water", density: 0.02, groves: 0, flowers: 0, tree: "tree1", turn: 6, wander: 0 },
    plan(p) {
      const isles = [[10, 13, 2.2], [24, 19, 2.4], [11, 20, 1.8], [24, 12, 2]];
      const pond = (x, y) => ((x + 0.5 - 17) / 12) ** 2 + ((y + 0.5 - 16) / 8) ** 2 <= 1, isle = (x, y) => isles.some(([cx, cy, r]) => Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) / 0.8) <= r);
      const walk = (x, y) => ((x === 17 || x === 18) && y >= 5) || y === 16 || y === 17 || (x === 10 && y >= 14) || (x === 24 && y <= 18 && y >= 16);
      const beds = tilesOf(2, 2, 31, 29).filter(([x, y]) => p.hash(x, y, 5) < 0.6 && (!pond(x, y) || isle(x, y)) && !walk(x, y));
      p.disc("water", 17, 16, 12, 8);
      for (const [x, y, r] of isles) p.disc("meadow", x, y, r, r * 0.8);
      for (const [x, y] of beds) p.fill("flowersPink", x, y, x, y);
      p.paint(1, (c) => { for (const [x, y] of beds) c.rect(x * 16, y * 16, 16, 16, [120, 40, 230, 96]); });
      p.street("deck", 2, [[17, 30], [17, 5]]); p.street("deck", 2, [[1, 16], [32, 16]]);
      p.street("deck", 1, [[10, 15], [10, 14]]); p.street("deck", 1, [[24, 17], [24, 18]]);
      rails(p, 17, 18, 9, 14); rails(p, 17, 18, 19, 23);
    },
  },
  // Vast Poni Canyon: bare rock cut by a river gorge. Rope bridges cross the water to the trial
  // gates and the cave that leads on to the altar.
  AlolaVastPoniCanyon: {
    theme: { ground: "gravel", road: "dirt", border: "rock", water: "water", density: 0.1, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 24, 1, 27, 28); p.fill("water", 1, 8, 23, 10);
      p.fill("rock", 28, 1, 29, 12); p.fill("rock", 28, 18, 29, 28); p.fill("rock", 22, 12, 23, 12); p.fill("rock", 22, 18, 23, 28); p.fill("rock", 23, 1, 23, 6);
      p.fill("rock", 1, 7, 17, 7); p.fill("rock", 1, 11, 17, 11); p.fill("rock", 22, 11, 23, 11); p.fill("rock", 22, 7, 23, 7);
      crag(p, "rock", 2, 19, 13, 25, 3); crag(p, "rock", 31, 20, 35, 26, 5); crag(p, "rock", 2, 2, 13, 5, 7); crag(p, "rock", 31, 3, 35, 9, 9);
      p.fill("dirt", 17, 1, 22, 6);
      p.street("dirt", 3, [[36, 15], [28, 15]]); p.street("deck", 3, [[27, 15], [24, 15]]); p.street("dirt", 3, [[23, 15], [1, 15]]);
      p.street("dirt", 3, [[20, 14], [20, 11]]); p.street("deck", 3, [[20, 10], [20, 8]]); p.street("dirt", 3, [[20, 7], [20, 6]]); p.street("dirt", 2, [[19, 17], [19, 28]]);
      rails(p, 19, 21, 8, 10); railsEW(p, 24, 27, 14, 16);
      trialGate(p, 0, [150, 110, 220]); trialGate(p, 1, [80, 110, 226]);
      for (const [x, y] of [[18, 12], [22, 13], [29, 13], [29, 17], [22, 17]]) stone(p, x, y, [150, 130, 110], 8);
    },
  },
  // Poni Gauntlet: one long walled track doubling back between rock ridges, lined with the
  // banners of the trainers who hold it, and a still pool at its foot.
  AlolaPoniGauntlet: {
    theme: { ground: "field", road: "gravel", border: "rock", water: "water", density: 0.05, groves: 0, flowers: 0.03, tree: "boulder", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 1, 21, 26, 23, 3); crag(p, "rock", 7, 11, 32, 13, 5); crag(p, "rock", 1, 5, 25, 6, 7);
      p.disc("water", 8, 27, 3.4, 2);
      p.street("gravel", 2, [[17, 30], [17, 26], [29, 26], [29, 17], [4, 17], [4, 8], [28, 8], [28, 2], [17, 2], [17, 1]]); p.street("gravel", 2, [[1, 16], [32, 16]]);
      const cols = [[226, 70, 60], [70, 110, 226], [240, 200, 70], [90, 190, 110]];
      [[21, 25], [27, 24], [31, 20], [22, 19], [12, 19], [6, 14], [10, 10], [18, 10], [26, 10], [30, 5], [22, 4]].forEach(([x, y], i) => flag(p, x, y, cols[i % 4]));
      steps(p, 29, 21, 2); steps(p, 4, 12, 2);
    },
  },
  // Mount Lanakila, the slopes: a snowbound mountainside. The trail loops down round an icy
  // ledge and back, with the cave mouth above and pines in the drifts.
  AlolaLanakilaSlope: {
    theme: { ground: "drift", road: "frostpath", border: "pine", grass: "snowgrass", density: 0.12, groves: 0.08, grove: "pine", flowers: 0, tree: "tree1", treeTint: "frost", turn: 6, wander: 0 },
    plan(p) {
      crag(p, "rock", 12, 18, 27, 19, 3); crag(p, "rock", 2, 9, 17, 10, 5); crag(p, "rock", 23, 9, 35, 10, 7);
      p.fill("pine", 2, 2, 8, 6); p.fill("pine", 29, 2, 35, 5); p.fill("pine", 2, 25, 9, 27); p.fill("pine", 30, 25, 35, 27);
      p.street("frostpath", 2, [[36, 15], [30, 15], [30, 22], [9, 22], [9, 15], [1, 15]]); p.street("frostpath", 2, [[9, 15], [20, 15], [20, 5]]); p.street("frostpath", 2, [[19, 23], [19, 28]]);
      for (const [x, y] of [[14, 13], [24, 13], [27, 17], [6, 19], [33, 19], [15, 25], [24, 25], [17, 7], [23, 7]]) stone(p, x, y, [170, 210, 240], 7);
    },
  },
  // Mount Lanakila, the summit: the wide stair up to the Pokemon League, its hall standing
  // against the crater rim, banners along the approach.
  AlolaLanakilaSummit: {
    theme: { ground: "snow", road: "frostpath", border: "rock", grass: "snowgrass", density: 0.04, groves: 0, flowers: 0, tree: "tree1", treeTint: "frost", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 8, 7); crag(p, "rock", 1, 8, 7, 11, 3); p.fill("rock", 30, 1, 36, 7); crag(p, "rock", 31, 8, 36, 11, 5);
      crag(p, "rock", 2, 24, 15, 27, 7); crag(p, "rock", 23, 24, 35, 27, 9);
      p.street("frostpath", 3, [[36, 15], [1, 15]]); p.disc("paving", 19.5, 15.5, 5, 4); p.street("paving", 3, [[20, 12], [20, 1]]); p.street("frostpath", 2, [[19, 19], [19, 28]]);
      for (const y of [6, 8, 10]) steps(p, 19, y, 3, [226, 230, 240]);
      p.bare(1);
      house(p, 10, 1, 8, 4, { wall: [226, 232, 244], roof: [70, 100, 170], roofH: 20, win: [250, 230, 150], band: [236, 196, 90] }); house(p, 22, 1, 8, 4, { wall: [226, 232, 244], roof: [70, 100, 170], roofH: 20, win: [250, 230, 150], band: [236, 196, 90] });
      p.paint(5, (c, top) => { const px = 18 * 16, py = 16; top.box(px - 4, py - 12, 56, 12, [70, 100, 170], [40, 50, 90]); top.ellipse(px + 24, py - 6, 5, 5, [250, 250, 250]); top.rect(px + 19, py - 7, 10, 2, [226, 70, 60]); c.rect(px, py + 32, 48, 16, [236, 196, 90, 120]); });
      [[17, 6], [22, 6], [17, 9], [22, 9], [14, 13], [25, 13]].forEach(([x, y], i) => flag(p, x, y, i % 2 ? [226, 70, 60] : [70, 110, 226]));
    },
  },
};
