// alola interiors and trial sites, drawn by hand. See README.md.
"use strict";

// ---- shared hand-drawn pieces (pixels, 16 per tile) ----
const T = 16;
const sh = (c, f) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
const STONE = [176, 172, 186], EDGE = [70, 70, 86];

// Rock walls of a cavern: every tile isWall() says is wall, with a rock face where floor lies below it.
function cave(p, isWall, face) {
  const wall = new Set();
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (isWall(x, y)) { p.fill("border", x, y, x, y); wall.add(x + "," + y); }
  if (face) p.paint(0, (c) => {
    for (let y = 0; y < p.H - 1; y++) for (let x = 0; x < p.W; x++) if (wall.has(x + "," + y) && !wall.has(x + "," + (y + 1))) {
      const px = x * T, py = y * T; c.rect(px, py, T, T, face); c.rect(px, py, T, 3, sh(face, 1.3)); c.rect(px, py + 13, T, 3, sh(face, 0.6));
      for (let i = 0; i < 3; i++) c.rect(px + 2 + i * 5 + Math.floor(p.hash(x, y, i) * 2), py + 4, 1, 8, sh(face, 0.8));
    }
  });
  return wall;
}
// The way out of a cavern: a cave mouth above the warp (up) or daylight on the floor (down).
function mouth(p, k, up, glow = [250, 240, 200]) {
  const w = p.warps[k]; p.bare(k);
  p.paint(w.y + 1, (c) => {
    const px = w.x * T, py = w.y * T;
    if (up) { c.ellipse(px + 8, py + 2, 14, 17, [86, 74, 70]); c.rect(px - 6, py + 2, 28, 14, [86, 74, 70]); c.ellipse(px + 8, py + 4, 11, 13, [14, 12, 20]); c.rect(px - 3, py + 4, 22, 12, [14, 12, 20]); c.rect(px - 3, py + 13, 22, 3, [50, 44, 52]); }
    else { c.rect(px - 6, py + 2, 28, 16, [14, 12, 20]); c.poly([[px - 4, py + 18], [px + 20, py + 18], [px + 14, py + 3], [px + 2, py + 3]], [glow[0], glow[1], glow[2], 150]); c.rect(px - 8, py, 32, 3, [86, 74, 70]); }
  });
}
// A room's two wall rows as a rough rock face.
function rockWall(p, col) {
  p.paint(0, (c) => {
    const y0 = (p.top - 2) * T, x0 = p.left * T, w = (p.right - p.left + 1) * T;
    c.rect(x0, y0, w, 32, col);
    for (let x = x0; x < x0 + w; x += 4) { c.rect(x, y0, 4, 2 + Math.floor(p.hash(x, 1, 5) * 5), sh(col, 1.25)); const b = 3 + Math.floor(p.hash(x, 2, 5) * 6); c.rect(x, y0 + 32 - b, 4, b, sh(col, 0.6)); }
    for (let i = 0; i < w / 3; i++) { const x = x0 + Math.floor(p.hash(i, 3, 9) * (w - 6)), y = y0 + 6 + Math.floor(p.hash(i, 4, 9) * 18); c.rect(x, y, 5, 1, sh(col, 0.72)); c.rect(x + 1, y + 1, 3, 1, sh(col, 1.15)); }
  });
}
// A room's wall rows as foliage (jungle, hedge).
function leafWall(p, col) {
  p.paint(0, (c) => {
    const y0 = (p.top - 2) * T, x0 = p.left * T, w = (p.right - p.left + 1) * T;
    c.rect(x0, y0, w, 32, sh(col, 0.55));
    for (let i = 0; i < w / 2; i++) { const x = x0 + Math.floor(p.hash(i, 1, 13) * w), y = y0 + 2 + Math.floor(p.hash(i, 2, 13) * 26); c.ellipse(x, y, 4 + p.hash(i, 3, 13) * 3, 3, i % 3 ? col : sh(col, 1.3)); }
    c.rect(x0, y0 + 29, w, 3, sh(col, 0.35));
  });
}
// A waterfall down a wall or cliff, px rect.
function fall(c, x, y, w, h) {
  c.rect(x, y, w, h, [86, 150, 226]);
  for (let i = x + 2; i < x + w - 1; i += 4) c.rect(i, y, 2, h, [170, 214, 250]);
  c.rect(x, y, 1, h, [50, 100, 180]); c.rect(x + w - 1, y, 1, h, [50, 100, 180]);
  for (let i = x - 2; i < x + w + 2; i += 5) c.ellipse(i + 2, y + h, 4, 3, [236, 246, 255]);
}
// A captain's gate on warp k (a doorway in the room's back wall): posts, a lintel, barrier pennants, the trial mark.
function gate(p, k, col) {
  const w = p.warps[k]; p.bare(k);
  p.paint(w.y + 1, (c) => {
    const px = w.x * T, py = w.y * T, wood = [156, 108, 62], dkw = [80, 52, 34];
    c.rect(px - 6, py - 18, 28, 34, [20, 18, 28]); c.rect(px - 6, py + 11, 28, 5, [74, 68, 84]);
    for (const sx of [px - 13, px + 21]) { c.box(sx, py - 26, 8, 42, wood, dkw); c.rect(sx + 2, py - 24, 2, 38, sh(wood, 1.25)); c.box(sx - 1, py + 12, 10, 4, sh(wood, 0.8), dkw); }
    c.box(px - 17, py - 33, 50, 9, wood, dkw); c.rect(px - 15, py - 31, 46, 2, sh(wood, 1.25));
    const cols = [[236, 196, 60], [220, 70, 60], [70, 130, 220], [80, 170, 90]];
    for (let i = 0; i < 4; i++) { const ax = px - 5 + i * 7; c.poly([[ax, py - 24], [ax + 6, py - 24], [ax + 3, py - 16]], cols[i]); }
    c.poly([[px + 8, py - 45], [px + 16, py - 37], [px + 8, py - 29], [px, py - 37]], dkw); c.poly([[px + 8, py - 43], [px + 14, py - 37], [px + 8, py - 31], [px + 2, py - 37]], col); c.poly([[px + 8, py - 40], [px + 11, py - 37], [px + 8, py - 34], [px + 5, py - 37]], sh(col, 1.45));
  });
}
// A rock outcrop / cliff block of w x h tiles (solid): light top, darker face along its bottom row.
function mound(p, x0, y0, w, h, col) {
  p.block(x0, y0, w, h);
  p.paint(y0 + h, (c) => {
    const px = x0 * T, py = y0 * T, pw = w * T, ph = h * T, top = sh(col, 1.15), face = sh(col, 0.7), edge = sh(col, 0.42);
    c.rect(px + 2, py + ph - 2, pw - 2, 4, [0, 0, 0, 50]);
    c.poly([[px + 4, py], [px + pw - 5, py], [px + pw - 1, py + 5], [px + pw - 1, py + ph - 1], [px, py + ph - 1], [px, py + 5]], edge);
    c.poly([[px + 5, py + 1], [px + pw - 6, py + 1], [px + pw - 2, py + 6], [px + pw - 2, py + ph - 13], [px + 1, py + ph - 13], [px + 1, py + 6]], top);
    c.rect(px + 1, py + ph - 13, pw - 2, 11, face); c.rect(px + 1, py + ph - 13, pw - 2, 1, sh(col, 0.9));
    for (let i = px + 3; i < px + pw - 3; i += 5) c.rect(i + Math.floor(p.hash(i, y0, 3) * 3), py + ph - 11, 1, 5 + Math.floor(p.hash(i, y0, 4) * 4), edge);
    for (let i = 0; i < w * h * 2; i++) { const x = px + 5 + Math.floor(p.hash(i, x0, 5) * (pw - 12)), y = py + 4 + Math.floor(p.hash(i, y0, 6) * Math.max(1, ph - 22)); c.rect(x, y, 3, 1, col); c.rect(x + 1, y + 1, 2, 1, sh(col, 1.3)); }
  });
}
// A dark den / tunnel mouth in the face of a mound, on tile (x, y).
function den(p, x, y) {
  p.paint(y + 1.5, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 6, 10, 9, [40, 30, 30]); c.rect(px - 2, py + 6, 20, 9, [40, 30, 30]); c.ellipse(px + 8, py + 7, 8, 7, [10, 8, 14]); c.rect(px, py + 7, 16, 8, [10, 8, 14]); });
}
function rock(p, x, y, col = [150, 140, 130]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); c.poly([[px + 1, py + 14], [px + 3, py + 3], [px + 9, py], [px + 14, py + 5], [px + 15, py + 14]], sh(col, 0.45)); c.poly([[px + 2, py + 13], [px + 4, py + 4], [px + 9, py + 1], [px + 13, py + 6], [px + 14, py + 13]], col); c.poly([[px + 4, py + 5], [px + 9, py + 2], [px + 10, py + 6], [px + 5, py + 8]], sh(col, 1.25)); });
}
// A tall rock spire or stalagmite (solid base, top walked behind).
function spire(p, x, y, col, h = 34) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => {
    const px = x * T, py = y * T + 14;
    c.ellipse(px + 8, py, 8, 3, [0, 0, 0, 60]);
    for (const [cv, a, b] of [[c, 0, 14], [top, 14, h]]) { const wa = 7 * (1 - a / h), wb = 7 * (1 - b / h); cv.poly([[px + 8 - wa - 1, py - a], [px + 8 + wa + 1, py - a], [px + 8 + wb + 1, py - b], [px + 8 - wb - 1, py - b]], sh(col, 0.45)); cv.poly([[px + 8 - wa, py - a], [px + 8 + wa, py - a], [px + 8 + wb, py - b], [px + 8 - wb, py - b]], col); cv.poly([[px + 8 - wa, py - a], [px + 8 - wa / 3, py - a], [px + 8 - wb / 3, py - b], [px + 8 - wb, py - b]], sh(col, 1.25)); }
  });
}
function crystal(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => {
    const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); c.ellipse(px + 8, py + 8, 12, 9, [col[0], col[1], col[2], 40]);
    for (const [dx, hgt, w] of [[3, 12, 3], [12, 14, 3], [8, 24, 4]]) { const cv = hgt > 16 ? top : c; cv.poly([[px + dx - w, py + 13], [px + dx + w, py + 13], [px + dx + w, py + 13 - hgt * 0.7], [px + dx, py + 13 - hgt], [px + dx - w, py + 13 - hgt * 0.7]], sh(col, 0.6)); cv.poly([[px + dx - w + 1, py + 12], [px + dx, py + 12], [px + dx, py + 14 - hgt], [px + dx - w + 1, py + 14 - hgt * 0.7]], sh(col, 1.3)); cv.poly([[px + dx, py + 12], [px + dx + w - 1, py + 12], [px + dx + w - 1, py + 14 - hgt * 0.7], [px + dx, py + 14 - hgt]], col); if (cv === top) c.box(px + dx - w, py + 2, w * 2 + 1, 12, col, sh(col, 0.6)); }
  });
}
function fern(p, x, y, col = [52, 140, 70]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * T + 8, py = y * T + 13; c.ellipse(px, py, 8, 3, [0, 0, 0, 50]); for (const [dx, dy] of [[-7, -3], [7, -3], [-5, -9], [5, -9], [0, -12], [-2, -6], [3, -5]]) { c.line(px, py - 1, px + dx, py + dy, sh(col, 0.6), 3); c.line(px, py - 2, px + dx, py + dy - 1, col, 2); } c.rect(px - 1, py - 8, 2, 2, sh(col, 1.4)); });
}
function torch(p, x, y, flame = [250, 150, 40]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T; c.ellipse(px, py + 9, 14, 8, [flame[0], flame[1], flame[2], 40]); c.ellipse(px, py + 13, 6, 3, [0, 0, 0, 70]); c.box(px - 2, py - 2, 4, 16, [112, 92, 82], [50, 40, 40]); c.box(px - 6, py - 7, 12, 6, [146, 126, 108], [50, 40, 40]); top.ellipse(px, py - 12, 4, 6, flame); top.ellipse(px, py - 10, 2, 4, [255, 240, 170]); });
}
// A stone column (solid).
function column(p, x, y, col = STONE) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 4, [0, 0, 0, 70]); c.box(px + 2, py - 2, 12, 16, col, EDGE); c.rect(px + 4, py, 3, 12, sh(col, 1.25)); c.box(px, py + 10, 16, 5, sh(col, 0.85), EDGE); top.box(px + 2, py - 14, 12, 13, col, EDGE); top.rect(px + 4, py - 12, 3, 11, sh(col, 1.25)); top.box(px, py - 18, 16, 6, sh(col, 1.12), EDGE); });
}
// The pedestal a Z-Crystal rests on (solid).
function pedestal(p, x, y, gem) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 9, 4, [0, 0, 0, 60]); c.box(px + 1, py + 8, 14, 7, [150, 146, 160], EDGE); c.box(px + 3, py - 6, 10, 15, [186, 182, 196], EDGE); c.rect(px + 5, py - 4, 2, 11, [226, 224, 234]); c.box(px + 1, py - 9, 14, 4, [206, 204, 214], EDGE); top.poly([[px + 8, py - 22], [px + 13, py - 15], [px + 8, py - 9], [px + 3, py - 15]], sh(gem, 0.7)); top.poly([[px + 8, py - 20], [px + 11, py - 15], [px + 8, py - 11], [px + 5, py - 15]], sh(gem, 1.4)); });
}
// A ring worn into / laid on the floor (walkable), px centre.
function ring(c, cx, cy, rx, ry, col) {
  c.ellipse(cx, cy, rx, ry, [col[0], col[1], col[2], 70]); c.ellipse(cx, cy, rx, ry, sh(col, 0.6).concat(200), 2); c.ellipse(cx, cy, rx - 5, ry - 4, sh(col, 1.3).concat(170), 1);
}
// Stairs painted on walkable floor (tile rect).
function steps(p, x0, y0, w, h, col, z = 0) {
  p.paint(z, (c) => { const px = x0 * T, py = y0 * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, col); for (let y = py; y < py + ph; y += 8) { c.rect(px, y, pw, 2, sh(col, 1.2)); c.rect(px, y + 6, pw, 2, sh(col, 0.68)); } c.rect(px, py, 2, ph, sh(col, 0.5)); c.rect(px + pw - 2, py, 2, ph, sh(col, 0.5)); });
}
// Lava (solid): the tiles of the rect that pass pred and are not needed for walking.
function lava(p, x0, y0, x1, y1, pred) {
  const cells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!pred || pred(x, y)) { try { p.block(x, y, 1, 1); cells.push([x, y]); } catch (_) { /* a kept tile stays floor */ } }
  const has = new Set(cells.map(([x, y]) => x + "," + y));
  p.paint(0, (c) => {
    for (const [x, y] of cells) {
      const px = x * T, py = y * T; c.rect(px, py, T, T, [214, 74, 28]);
      for (let i = 0; i < 3; i++) c.ellipse(px + 2 + p.hash(x, y, i) * 12, py + 2 + p.hash(y, x, i + 7) * 12, 2 + p.hash(x, y, i + 3) * 3, 1.5 + p.hash(x, y, i + 5) * 1.5, i ? [250, 150, 40] : [255, 222, 96]);
      if (!has.has(x + "," + (y - 1))) c.rect(px, py, T, 3, [84, 38, 36]); if (!has.has(x + "," + (y + 1))) c.rect(px, py + 14, T, 2, [120, 46, 30]);
      if (!has.has((x - 1) + "," + y)) c.rect(px, py, 2, T, [84, 38, 36]); if (!has.has((x + 1) + "," + y)) c.rect(px + 14, py, 2, T, [84, 38, 36]);
    }
  });
}
const inDisc = (cx, cy, rx, ry = rx) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
// A type emblem set in the floor, px centre, radius r.
function emblem(c, cx, cy, r, kind) {
  const base = { steel: [150, 160, 176], rock: [176, 150, 100], ghost: [112, 86, 160], flying: [130, 180, 236], dragon: [96, 90, 200], sun: [240, 180, 60], moon: [90, 100, 190], ball: [220, 70, 60] }[kind], w = [246, 246, 250];
  c.ellipse(cx, cy, r, r, sh(base, 0.5)); c.ellipse(cx, cy, r - 2, r - 2, base); c.ellipse(cx, cy, r - 4, r - 4, sh(base, 1.25), 1);
  const s = r / 20;
  if (kind === "steel") { for (let a = 0; a < 8; a++) { const ax = cx + Math.cos(a * Math.PI / 4) * 11 * s, ay = cy + Math.sin(a * Math.PI / 4) * 11 * s; c.rect(ax - 2 * s, ay - 2 * s, 4 * s + 1, 4 * s + 1, w); } c.ellipse(cx, cy, 10 * s, 10 * s, w); c.ellipse(cx, cy, 5 * s, 5 * s, base); }
  else if (kind === "rock") { c.poly([[cx - 12 * s, cy + 9 * s], [cx - 8 * s, cy - 6 * s], [cx, cy - 12 * s], [cx + 10 * s, cy - 4 * s], [cx + 12 * s, cy + 9 * s]], w); c.poly([[cx - 8 * s, cy - 6 * s], [cx - 2 * s, cy], [cx - 5 * s, cy + 9 * s], [cx - 12 * s, cy + 9 * s]], sh(base, 1.3)); c.line(cx, cy - 12 * s, cx - 2 * s, cy, base, 1); c.line(cx - 2 * s, cy, cx + 12 * s, cy + 9 * s, base, 1); }
  else if (kind === "ghost") { c.ellipse(cx, cy - 2 * s, 10 * s, 10 * s, w); c.rect(cx - 10 * s, cy - 2 * s, 20 * s + 1, 10 * s, w); for (let i = 0; i < 3; i++) c.poly([[cx - 10 * s + i * 7 * s, cy + 8 * s], [cx - 3 * s + i * 7 * s, cy + 8 * s], [cx - 6.5 * s + i * 7 * s, cy + 13 * s]], w); c.ellipse(cx - 4 * s, cy - 2 * s, 2 * s + 1, 3 * s + 1, base); c.ellipse(cx + 4 * s, cy - 2 * s, 2 * s + 1, 3 * s + 1, base); }
  else if (kind === "flying") { for (let i = 0; i < 3; i++) c.poly([[cx - 12 * s, cy + (6 - i * 7) * s], [cx + 12 * s, cy + (-4 - i * 5) * s], [cx + 4 * s, cy + (4 - i * 5) * s], [cx - 10 * s, cy + (10 - i * 7) * s]], w); }
  else if (kind === "dragon") { c.poly([[cx - 12 * s, cy + 2 * s], [cx - 2 * s, cy - 11 * s], [cx + 2 * s, cy - 3 * s], [cx + 12 * s, cy - 8 * s], [cx + 6 * s, cy + 6 * s], [cx - 4 * s, cy + 11 * s]], w); c.ellipse(cx - 2 * s, cy - 1 * s, 2 * s + 1, 2 * s + 1, base); c.poly([[cx + 2 * s, cy + 3 * s], [cx + 8 * s, cy + 1 * s], [cx + 4 * s, cy + 6 * s]], base); }
  else if (kind === "sun") { for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4, ax = Math.cos(an), ay = Math.sin(an); c.poly([[cx + ax * 15 * s, cy + ay * 15 * s], [cx + Math.cos(an + 0.3) * 8 * s, cy + Math.sin(an + 0.3) * 8 * s], [cx + Math.cos(an - 0.3) * 8 * s, cy + Math.sin(an - 0.3) * 8 * s]], w); } c.ellipse(cx, cy, 8 * s, 8 * s, w); c.ellipse(cx, cy, 5 * s, 5 * s, [250, 214, 110]); }
  else if (kind === "moon") { c.ellipse(cx, cy, 12 * s, 12 * s, w); c.ellipse(cx + 5 * s, cy - 3 * s, 10 * s, 10 * s, base); c.ellipse(cx - 9 * s, cy - 9 * s, 1.5, 1.5, w); c.ellipse(cx + 9 * s, cy + 8 * s, 1.5, 1.5, w); }
  else if (kind === "ball") { c.ellipse(cx, cy, 12 * s, 12 * s, w); c.rect(cx - 12 * s, cy - 12 * s, 24 * s + 1, 12 * s, base); c.ellipse(cx, cy, 12 * s, 12 * s, sh(base, 0.4), 1); c.rect(cx - 12 * s, cy - 1, 24 * s + 1, 2, sh(base, 0.4)); c.ellipse(cx, cy, 4 * s, 4 * s, sh(base, 0.4)); c.ellipse(cx, cy, 2.5 * s, 2.5 * s, w); }
}

// ---- room pieces ----
// A room's two wall rows as flat panels in one colour; extra(c, x0, y0, w) draws on them.
function wallPanel(p, col, extra) {
  p.paint(0, (c) => { const y0 = (p.top - 2) * T, x0 = p.left * T, w = (p.right - p.left + 1) * T; c.rect(x0, y0, w, 32, col); c.rect(x0, y0, w, 3, sh(col, 1.3)); c.rect(x0, y0 + 27, w, 5, sh(col, 0.6)); for (let x = x0; x < x0 + w; x += 32) c.rect(x, y0 + 3, 1, 24, sh(col, 0.78)); if (extra) extra(c, x0, y0, w); });
}
function carpet(p, x0, y0, w, h, col, z = 0) {
  p.paint(z, (c) => { const px = x0 * T, py = y0 * T, pw = w * T, ph = h * T, l = sh(col, 1.3); c.rect(px, py, pw, ph, sh(col, 0.6)); c.rect(px + 2, py + 2, pw - 4, ph - 4, col); c.rect(px + 4, py + 4, pw - 8, 1, l); c.rect(px + 4, py + ph - 5, pw - 8, 1, l); c.rect(px + 4, py + 4, 1, ph - 8, l); c.rect(px + pw - 5, py + 4, 1, ph - 8, l); });
}
// A doorway in the back wall on warp k, framed in a colour.
function arch(p, k, col) {
  const w = p.warps[k]; p.bare(k);
  p.paint(w.y + 1, (c) => { const px = w.x * T, py = w.y * T; c.box(px - 7, py - 24, 30, 40, col, sh(col, 0.4)); c.rect(px - 5, py - 22, 26, 2, sh(col, 1.35)); c.rect(px - 2, py - 18, 20, 34, [20, 18, 28]); c.rect(px - 2, py + 11, 20, 5, [74, 68, 84]); c.poly([[px + 8, py - 32], [px + 14, py - 26], [px + 8, py - 20], [px + 2, py - 26]], sh(col, 1.4)); });
}
// A counter / desk of w x h tiles (solid).
function counter(p, x0, y0, w, h, col) {
  p.block(x0, y0, w, h);
  p.paint(y0 + h, (c) => { const px = x0 * T, py = y0 * T, pw = w * T, ph = h * T, e = sh(col, 0.4); c.rect(px + 1, py + ph - 1, pw, 3, [0, 0, 0, 50]); c.box(px, py - 5, pw, ph + 4, sh(col, 0.72), e); c.box(px, py - 5, pw, ph - 5, sh(col, 1.12), e); c.rect(px + 2, py - 3, pw - 4, 1, sh(col, 1.4)); });
}
function crate(p, x, y, col = [170, 130, 80]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.rect(px + 2, py + 14, 14, 2, [0, 0, 0, 60]); c.box(px + 1, py - 2, 14, 17, col, sh(col, 0.45)); c.rect(px + 2, py + 4, 12, 1, sh(col, 0.6)); c.line(px + 3, py + 6, px + 12, py + 13, sh(col, 0.7), 1); c.rect(px + 2, py - 1, 12, 2, sh(col, 1.25)); });
}
function grave(p, x, y, flower) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); c.box(px + 2, py + 10, 12, 5, [130, 128, 140], EDGE); c.ellipse(px + 8, py + 2, 5, 5, EDGE); c.rect(px + 3, py + 2, 11, 9, EDGE); c.ellipse(px + 8, py + 2, 4, 4, [186, 184, 196]); c.rect(px + 4, py + 2, 9, 8, [186, 184, 196]); c.rect(px + 7, py + 1, 2, 7, [120, 118, 130]); c.rect(px + 5, py + 3, 6, 2, [120, 118, 130]); if (flower) { c.rect(px + 1, py + 12, 3, 3, flower); c.rect(px + 12, py + 12, 3, 3, flower); } });
}
function throne(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T, g = [240, 200, 90], ge = [120, 90, 40]; c.ellipse(px + 8, py + 14, 11, 3, [0, 0, 0, 70]); top.box(px + 1, py - 14, 14, 16, col, sh(col, 0.4)); top.rect(px + 3, py - 12, 10, 2, sh(col, 1.35)); top.ellipse(px + 8, py - 15, 4, 4, g); c.box(px + 1, py + 1, 14, 13, sh(col, 0.8), sh(col, 0.4)); c.box(px - 2, py + 2, 4, 12, g, ge); c.box(px + 14, py + 2, 4, 12, g, ge); c.rect(px + 3, py + 3, 10, 6, sh(col, 1.2)); });
}
// A guardian deity's statue against the back wall: tiles (x..x+1, y) are solid, the figure rises up the wall.
function tapu(p, x, y, col, kind) {
  p.block(x, y, 2, 1);
  p.paint(y + 1, (c) => {
    const px = x * T, py = y * T, cx = px + 16, s1 = [166, 162, 176], s2 = [200, 196, 210];
    c.ellipse(cx, py + 13, 20, 4, [0, 0, 0, 70]); c.box(px - 3, py + 6, 38, 10, [150, 146, 160], EDGE); c.box(px + 1, py + 1, 30, 7, STONE, EDGE);
    c.ellipse(cx, py - 13, 14, 17, EDGE); c.ellipse(cx, py - 13, 13, 16, s1); c.ellipse(cx - 4, py - 16, 7, 10, s2); c.rect(cx - 1, py - 29, 2, 31, EDGE);
    c.ellipse(cx, py - 13, 13, 16, col, 2); c.rect(cx - 11, py - 7, 22, 2, col); c.rect(cx - 9, py - 21, 18, 2, col);
    c.ellipse(cx - 5, py - 14, 2, 2, [30, 30, 40]); c.ellipse(cx + 5, py - 14, 2, 2, [30, 30, 40]);
    if (kind === "lele") for (const d of [-1, 1]) { c.line(cx + d * 4, py - 28, cx + d * 11, py - 35, col, 2); c.ellipse(cx + d * 11, py - 35, 3, 3, col); c.ellipse(cx + d * 16, py - 12, 4, 7, col); }
    if (kind === "bulu") { for (const d of [-1, 1]) c.poly([[cx + d * 8, py - 26], [cx + d * 19, py - 35], [cx + d * 14, py - 20]], col); c.ellipse(cx, py + 1, 4, 4, [240, 200, 90]); c.rect(cx - 1, py + 2, 2, 3, [120, 90, 40]); }
    if (kind === "fini") { c.poly([[cx - 5, py - 28], [cx, py - 36], [cx + 5, py - 28]], col); for (const d of [-1, 1]) c.poly([[cx + d * 13, py - 16], [cx + d * 21, py - 8], [cx + d * 12, py - 6]], col); }
  });
}
// A guardian's ruins: the statue on a dais at the back, a runner up to it, columns, braziers and carved walls.
function ruins(p, col, kind) {
  wallPanel(p, [128, 124, 142], (c, x0, y0, w) => { for (let i = 0; i < 9; i++) { const x = x0 + 14 + i * 36 + (i > 4 ? 6 : 0), y = y0 + 9; if (x > 9 * T && x < 13 * T) continue; if (i % 3 === 0) c.ellipse(x + 5, y + 6, 6, 6, col, 2); else if (i % 3 === 1) c.poly([[x, y + 12], [x + 6, y], [x + 12, y + 12]], col); else { c.rect(x, y, 12, 2, col); c.rect(x, y + 5, 12, 2, col); c.rect(x, y + 10, 12, 2, col); } } });
  p.paint(0, (c) => { const px = 6 * T, py = 6 * T, pw = 10 * T, ph = 3 * T; c.rect(px, py, pw, ph, [214, 210, 224, 120]); c.rect(px, py + ph - 4, pw, 4, [90, 86, 104]); c.rect(px, py + ph - 6, pw, 2, [236, 234, 244]); c.rect(px, py, 2, ph, [90, 86, 104]); c.rect(px + pw - 2, py, 2, ph, [90, 86, 104]); c.rect(px + 4, py + 4, pw - 8, 1, col); });
  carpet(p, 10, 9, 2, 6, col);
  tapu(p, 10, 6, col, kind);
  for (const [x, y] of [[3, 8], [18, 8], [3, 12], [18, 12]]) column(p, x, y);
  torch(p, 8, 6, col); torch(p, 13, 6, col);
  for (const [x, y] of [[1, 6], [20, 6], [2, 14], [19, 15], [5, 15]]) rock(p, x, y, [140, 136, 150]);
}
// A chamber of the Pokemon League inside Mount Lanakila: dark rock, a steel walkway from the door to an oval field
// glowing in the member's colour, the round dais at its head and crystals of that colour behind it.
function league(p, col, o = {}) {
  const cx = 12.5, cy = o.cy || 12.5, rx = o.rx || 9.4, ry = o.ry || 4.6, dy = o.dais || 7.2, wy = Math.floor(cy + ry) - 1;
  const plat = inDisc(cx, cy, rx, ry), dais = inDisc(cx, dy, 2, 1.9), pad = o.pad ? inDisc(cx, p.bottom - 0.3, 2.7, 1.7) : () => false;
  const floor = (x, y) => plat(x, y) || dais(x, y) || pad(x, y) || (x >= 11 && x <= 13 && y >= wy && y <= p.bottom);
  for (let y = p.top; y <= p.bottom; y++) for (let x = p.left; x <= p.right; x++) p.fill(floor(x, y) ? "steel" : "void", x, y, x, y);
  arch(p, 1, col);
  const S = [176, 182, 194], SD = [92, 98, 112], W = [250, 252, 255];
  p.paint(0, (c) => {
    const x0 = 0, y0 = (p.top - 2) * T, w = p.W * T, h = (p.bottom - p.top + 4) * T, pcx = cx * T, pcy = cy * T, prx = rx * T, pry = ry * T;
    c.rect(x0, y0, w, h, [46, 42, 48]);
    for (let i = 0; i < 150; i++) { const x = x0 + p.hash(i, 1, 31) * w, y = y0 + p.hash(i, 2, 31) * h, k = p.hash(i, 3, 31); c.ellipse(x, y, 5 + k * 9, 3 + k * 5, k > 0.5 ? [58, 54, 60] : [34, 31, 38]); }
    c.rect(x0, y0, w, 3, [26, 24, 30]);
    // the crystals behind the field
    for (const [bx, d] of [[5.2 * T, 1], [19.8 * T, -1]]) {
      const by = (p.top + 1) * T + 6; c.ellipse(bx, by - 8, 44, 22, [col[0], col[1], col[2], 46]);
      for (const [dx, hh, ww] of [[-22, 16, 9], [-6, 30, 12], [14, 22, 10], [28, 12, 7]]) { const x = bx + dx * d; c.poly([[x - ww, by], [x + ww, by], [x + ww, by - hh * 0.6], [x + d * 3, by - hh], [x - ww, by - hh * 0.7]], sh(col, 0.6)); c.poly([[x - ww + 2, by - 1], [x, by - 1], [x + d * 3, by - hh + 2], [x - ww + 2, by - hh * 0.7 + 1]], sh(col, 1.25)); c.poly([[x, by - 1], [x + ww - 2, by - 1], [x + ww - 2, by - hh * 0.6 + 1], [x + d * 3, by - hh + 2]], col); }
    }
    // the walkway
    const wx = 11 * T, ww = 3 * T, wt = wy * T, wb = (p.bottom + 1) * T;
    if (o.pad) { const py = (p.bottom - 0.3) * T; c.ellipse(pcx, py + 4, 2.7 * T + 4, 1.7 * T + 3, SD); c.ellipse(pcx, py, 2.7 * T + 4, 1.7 * T + 3, S); c.ellipse(pcx, py, 2.7 * T - 6, 1.7 * T - 4, sh(S, 0.8)); c.ellipse(pcx, py, 2.7 * T - 12, 1.7 * T - 8, S); }
    c.rect(wx - 3, wt, ww + 6, wb - wt, SD); c.rect(wx, wt, ww, wb - wt, S);
    for (let y = wt + 2; y < wb; y += 6) c.rect(wx, y, ww, 1, sh(S, 0.72));
    for (let y = wt + 8; y < wb - 4; y += 12) c.rect(pcx - 3, y, 6, 3, sh(col, 1.2));
    // the field in its steel rim
    c.ellipse(pcx, pcy + 7, prx + 6, pry + 6, [28, 26, 34]); c.ellipse(pcx, pcy + 4, prx + 6, pry + 6, SD); c.ellipse(pcx, pcy, prx + 6, pry + 6, S); c.ellipse(pcx, pcy, prx + 2, pry + 2, sh(S, 0.7));
    c.ellipse(pcx, pcy, prx, pry, sh(col, 0.8)); c.ellipse(pcx, pcy, prx - 6, pry - 5, col); c.ellipse(pcx, pcy + 4, prx * 0.62, pry * 0.6, sh(col, 1.12).concat(150));
    c.rect(pcx - prx + 10, pcy - 1, prx * 2 - 20, 2, W.concat(210)); c.ellipse(pcx, pcy, 38, 25, col); c.ellipse(pcx, pcy, 38, 25, W.concat(230), 2); c.ellipse(pcx, pcy, 13, 9, W.concat(230), 2);
    for (const [ax, ay] of [[-0.74, 0.74], [0.74, 0.74], [-1, 0], [1, 0], [-0.5, -0.9], [0.5, -0.9]]) { const x = pcx + ax * (prx + 5), y = pcy + ay * (pry + 5); c.poly([[x - 5, y + 6], [x + 5, y + 6], [x, y - 13]], SD); c.poly([[x - 3, y + 5], [x + 1, y + 5], [x, y - 10]], [226, 230, 238]); }
    // the dais at its head
    const ddy = dy * T; c.ellipse(pcx, ddy + 5, 38, 30, SD); c.ellipse(pcx, ddy, 38, 30, S); c.ellipse(pcx, ddy, 30, 23, [208, 214, 224]); c.ellipse(pcx, ddy, 30, 23, SD, 1); c.ellipse(pcx, ddy, 13, 10, sh(col, 1.1).concat(170));
  });
}

function bed(p, x, y, col) {
  p.block(x, y, 1, 2);
  p.paint(y + 2, (c) => { const px = x * T, py = y * T; c.rect(px + 2, py + 30, 14, 2, [0, 0, 0, 50]); c.box(px + 1, py - 2, 14, 32, [240, 240, 244], [90, 80, 90]); c.box(px + 1, py + 10, 14, 20, col, sh(col, 0.5)); c.rect(px + 3, py + 12, 10, 1, sh(col, 1.3)); c.box(px + 3, py, 10, 7, [255, 255, 255], [170, 170, 190]); c.box(px, py - 6, 16, 5, [150, 104, 60], [80, 52, 34]); });
}
function sofa(p, x, y, col) {
  p.block(x, y, 2, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T, e = sh(col, 0.4); c.rect(px + 1, py + 14, 31, 2, [0, 0, 0, 60]); c.box(px, py - 6, 32, 12, sh(col, 0.8), e); c.box(px, py + 3, 32, 12, col, e); c.rect(px + 15, py + 4, 1, 10, sh(col, 0.6)); c.box(px - 1, py + 1, 5, 14, sh(col, 1.15), e); c.box(px + 28, py + 1, 5, 14, sh(col, 1.15), e); });
}
// A berry tree in its soil (solid).
function berry(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T + 8, py = y * T; c.ellipse(px, py + 13, 7, 3, [70, 50, 40]); c.rect(px - 1, py + 3, 3, 11, [120, 84, 50]); top.ellipse(px, py - 3, 9, 9, [36, 110, 60]); top.ellipse(px - 1, py - 4, 7, 7, [70, 160, 84]); for (const [dx, dy] of [[-4, -6], [3, -8], [0, -2], [-5, 0], [5, -1]]) { top.ellipse(px + dx, py + dy, 2, 2, col); top.rect(px + dx - 1, py + dy - 1, 1, 1, [255, 255, 255]); } });
}
// A glass specimen capsule (solid).
function tank(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T, g = [200, 236, 250]; c.ellipse(px + 8, py + 13, 8, 3, [0, 0, 0, 60]); c.box(px + 1, py + 9, 14, 6, [120, 124, 140], EDGE); c.box(px + 2, py - 1, 12, 11, g, EDGE); top.box(px + 2, py - 16, 12, 16, g, EDGE); top.rect(px + 4, py - 14, 2, 13, [240, 250, 255]); top.ellipse(px + 8, py - 6, 3, 5, col); c.ellipse(px + 8, py + 2, 3, 4, col); top.box(px + 1, py - 19, 14, 4, [120, 124, 140], EDGE); });
}
// A machine drum (2 x 2, solid): generator, turbine.
function drum(p, x, y, col, light) {
  p.block(x, y, 2, 2);
  p.paint(y + 2, (c, top) => { const px = x * T, py = y * T, e = sh(col, 0.4); c.ellipse(px + 16, py + 28, 17, 4, [0, 0, 0, 70]); c.box(px + 1, py + 2, 30, 28, sh(col, 0.8), e); c.ellipse(px + 16, py + 2, 15, 6, e); c.ellipse(px + 16, py + 2, 14, 5, sh(col, 1.2)); c.ellipse(px + 16, py + 2, 6, 2, sh(col, 0.6)); for (let i = 0; i < 4; i++) c.rect(px + 4 + i * 7, py + 10, 3, 14, e); c.rect(px + 3, py + 25, 26, 3, light); top.rect(px + 15, py - 10, 2, 10, e); top.ellipse(px + 16, py - 11, 3, 3, light); });
}
// A lit pad on the floor (walkable), tile (x, y).
function pad(c, x, y, col) { const cx = x * T + 8, cy = y * T + 9; c.ellipse(cx, cy, 11, 8, sh(col, 0.5)); c.ellipse(cx, cy, 9, 6, col); c.ellipse(cx, cy, 5, 3, sh(col, 1.4)); }
// Rainbow Rocket's mark, px top-left, about 20 x 24.
function rrMark(c, x, y) {
  const R = [[226, 60, 60], [240, 150, 50], [240, 220, 70], [90, 190, 90], [70, 130, 230], [150, 90, 210]];
  for (let i = 0; i < 6; i++) { const col = R[i], yy = y + i * 4; c.rect(x, yy, 5, 4, col); if (i < 3) { c.rect(x + 5, yy, i === 0 || i === 2 ? 9 : 0, 4, col); c.rect(x + 13, yy, 5, 4, col); } else c.rect(x + 6 + (i - 3) * 4, yy, 6, 4, col); }
  c.rect(x + 5, y + 4, 8, 4, [40, 36, 50]);
}
// Rainbow Rocket's castle floor: black glass tiles with glowing red seams.
function rrFloor(p) {
  p.paint(0, (c) => {
    const x0 = p.left * T, y0 = p.top * T, w = (p.right - p.left + 1) * T, h = (p.bottom - p.top + 1) * T;
    c.rect(x0, y0, w, h, [20, 18, 26]);
    for (let y = y0; y < y0 + h; y += T) for (let x = x0; x < x0 + w; x += T) { c.rect(x + 2, y + 2, 12, 12, [30, 27, 38]); c.rect(x + 3, y + 3, 5, 1, [64, 58, 76]); }
    for (let x = x0; x <= x0 + w; x += T) c.rect(x - (x > x0 ? 1 : 0), y0, 2, h, [200, 36, 50]);
    for (let y = y0; y <= y0 + h; y += T) c.rect(x0, y - (y > y0 ? 1 : 0), w, 2, [200, 36, 50]);
    c.rect(x0, y0, w, 12, [226, 40, 50, 46]); c.rect(x0, y0 + h - 8, w, 8, [226, 40, 50, 30]);
  });
}
// One of the castle's warp panels: a green-lit square in the floor (walkable), tile (x, y).
function rrPanel(c, x, y) { const px = x * T, py = y * T, g = [70, 230, 160]; c.box(px + 1, py + 1, 14, 14, [16, 40, 36], g); c.box(px + 4, py + 4, 8, 8, [30, 80, 66], g); c.rect(px + 7, py + 7, 2, 2, [200, 255, 230]); }
// A Pokemon Center: the healing desk round the nurse, and the cafe counter on the right.
function center(p) {
  const nurse = p.people.find((q) => /heal/.test(q.script)), others = p.people.filter((q) => q !== nurse), free = (x, y, w, h) => !others.some((q) => q.x >= x - 0 && q.x < x + w && q.y + 1 >= y && q.y < y + h);
  p.decor("rDesk", nurse.x - 3, p.top - 2);
  p.decor("rPC", Math.min(p.right - 4, nurse.x + 4), p.top - 2, { optional: true }); p.decor("rBooks", p.left, p.top - 2, { optional: true }); p.decor("rPlant", p.left, p.top, { optional: true });
  p.decor("rSeats", p.left + 1, p.bottom - 3, { optional: true });
  // the cafe: an L of counter, stools, the menu board on the wall
  const cx = p.right - 3, cy = p.top + 4;
  if (free(cx, cy, 3, 1) && free(p.right, cy + 1, 1, 2)) {
    counter(p, cx, cy, 4, 1, [176, 128, 84]); counter(p, p.right, cy + 1, 1, 2, [176, 128, 84]);
    p.paint(cy + 1.1, (c) => { for (let i = 0; i < 3; i++) { const x = (cx + i) * T + 8, y = cy * T - 3; c.box(x - 3, y - 1, 6, 6, [250, 250, 250], [120, 120, 140]); c.rect(x - 2, y, 4, 2, [150, 96, 60]); } });
    p.paint(cy + 2.2, (c) => { for (let i = 0; i < 3; i++) { const x = (cx + i) * T + 8, y = (cy + 1) * T + 8; c.ellipse(x, y + 4, 5, 2, [0, 0, 0, 60]); c.rect(x - 1, y - 1, 2, 6, [110, 110, 126]); c.ellipse(x, y - 2, 5, 3, [226, 96, 84]); c.ellipse(x, y - 3, 4, 2, [246, 140, 120]); } });
  }
  p.paint(0.1, (c) => { const x = (p.right - 3) * T, y = (p.top - 2) * T + 5; c.box(x, y, 56, 20, [60, 90, 70], [150, 110, 70]); for (let i = 0; i < 3; i++) { c.rect(x + 5, y + 4 + i * 5, 22, 1, [230, 240, 230]); c.rect(x + 36, y + 4 + i * 5, 12, 1, [240, 220, 150]); } });
  p.paint(0.1, (c) => { const e = p.warps.find((w) => w.exit); if (e) { const cx2 = e.x * T + 8, cy2 = (p.top + p.bottom) / 2 * T + 24; c.ellipse(cx2, cy2, 30, 22, [244, 244, 250, 150], 2); c.ellipse(cx2, cy2, 8, 6, [226, 96, 84, 170]); } });
}
const CENTER = { theme: { room: "center" }, plan: center };

// The gloom of a mossy cave over the walkable tiles ok() picks, with glowing moss where the daylight falls (px ellipses).
function gloom(p, ok, glows, tint = [34, 46, 24, 118]) {
  p.paint(0, (c) => {
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (ok(x, y)) c.rect(x * T, y * T, T, T, tint);
    for (const [x, y, rx, ry] of glows) { c.ellipse(x, y, rx, ry, [150, 226, 96, 60]); c.ellipse(x, y, rx * 0.6, ry * 0.6, [196, 246, 130, 80]); }
  });
}
// A chasm in a cave floor (tile rect): the tiles are solid; the rock drops away under its north rim.
function chasm(p, x0, y0, x1, y1, col) {
  p.fill("border", x0, y0, x1, y1);
  p.paint(0, (c) => { const px = x0 * T, py = y0 * T, w = (x1 - x0 + 1) * T, h = (y1 - y0 + 1) * T; c.rect(px, py, w, h, [12, 12, 16]); c.rect(px, py, w, 9, sh(col, 0.55)); c.rect(px, py + 9, w, 5, sh(col, 0.28)); for (let x = px + 3; x < px + w - 2; x += 6) c.rect(x, py + 1, 1, 9, sh(col, 0.36)); c.rect(px, py, 3, h, sh(col, 0.3)); c.rect(px + w - 3, py, 3, h, sh(col, 0.3)); c.rect(px, py + h - 2, w, 2, sh(col, 1.1)); });
}
// The pale and rose bands of Poni's canyon walls over a px rect.
function strataBand(c, x, y, w, h) {
  const B = [[226, 196, 150], [200, 150, 120], [232, 208, 168], [176, 124, 104], [214, 176, 132]];
  for (let i = 0, yy = y; yy < y + h; i++, yy += 3) c.rect(x, yy, w, Math.min(3, y + h - yy), B[i % 5]);
  c.rect(x, y + h - 2, w, 2, [110, 78, 64]);
}
function strata(p, x, y, w, h) { p.paint(0, (c) => { strataBand(c, x, y, w, h); for (let i = x + 9; i < x + w; i += 23) c.rect(i, y + 2, 1, h - 4, [150, 108, 90, 150]); }); }
// Cave shapes: a tile is floor if it lies in one of the discs or near one of the passages.
const nearSeg = (ax, ay, bx, by, w) => (x, y) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= w; };
const anyOf = (fs) => (x, y) => fs.some((f) => f(x, y));

module.exports = {
  // ------------------------------------------------------------ trial sites
  // Verdant Cavern's forecourt: a dim, mossy cave mouth behind the captain's gate.
  AlolaVerdantEntrance: {
    theme: { room: "arena", floor: "caveFloor", wall: null, top: 6 },
    plan(p) {
      rockWall(p, [88, 84, 64]);
      p.disc("grass", 6, 12, 4, 3.5); p.disc("grass", 18.5, 14, 4, 3.5); p.fill("grass", 9, 17, 16, 19); p.fill("grass", 10, 6, 14, 7);
      const dark = [[1, 6], [2, 6], [1, 7], [22, 6], [21, 6], [22, 7], [1, 19], [22, 19]];
      for (const [x, y] of dark) p.fill("void", x, y, x, y);
      gloom(p, (x, y) => x >= p.left && x <= p.right && y >= p.top && y <= p.bottom && !dark.some(([a, b]) => a === x && b === y), [[6 * T, 12 * T, 44, 30], [18.5 * T, 14 * T, 40, 28], [12.5 * T, 18 * T, 40, 14]]);
      p.decor("boulder", 3, 6, { optional: true }); p.decor("boulder", 19, 6, { optional: true }); p.decor("boulder", 2, 15, { optional: true }); p.decor("boulder", 20, 9, { optional: true });
      for (const [x, y] of [[5, 10], [8, 13], [16, 12], [20, 15], [7, 18], [17, 18], [9, 7], [15, 7]]) fern(p, x, y, [44, 122, 58]);
      rock(p, 5, 17, [112, 106, 84]); rock(p, 16, 9, [112, 106, 84]);
      gate(p, 1, [90, 190, 110]);
      p.paint(0.5, (c) => { c.poly([[150, 96], [182, 96], [230, 250], [170, 250]], [255, 250, 200, 40]); c.poly([[236, 96], [252, 96], [330, 220], [296, 220]], [255, 250, 200, 32]); });
    },
  },
  // Verdant Cavern: a dim mossy cave. Two chasms split the floor (a log bridges the first), the dens open in the outcrops,
  // and the Totem waits before its pedestal in the bowl by the way in.
  AlolaVerdantCavern: {
    theme: { density: 0, groves: 0 },
    plan(p) {
      const R = [104, 98, 76], wall = (x, y) => x < 2 || y < 2 || x > 33 || y > 31 || ((x - 17.5) / 15.5) ** 2 + ((y - 17) / 15.5) ** 2 + (p.hash(x >> 1, y >> 1, 3) - 0.5) * 0.12 > 1;
      const pit = (x, y) => (x >= 15 && x <= 19 && y >= 9 && y <= 15 && y !== 12) || (x >= 21 && x <= 26 && y >= 21 && y <= 25);
      for (const [x, y, r] of [[9, 12, 5], [26, 12, 5], [16, 22, 4.5], [29, 26, 3], [8, 25, 3.5], [18, 28, 4], [18, 6, 3]]) p.disc("grass", x, y, r, r * 0.8);
      cave(p, wall, sh(R, 0.85));
      gloom(p, (x, y) => !wall(x, y) && !pit(x, y), [[9 * T, 13 * T, 50, 30], [27 * T, 13 * T, 46, 28], [15 * T, 23 * T, 40, 26], [8 * T, 25 * T, 34, 22], [18.5 * T, 6 * T, 36, 20], [29 * T, 26 * T, 30, 20]]);
      chasm(p, 15, 9, 19, 11, R); chasm(p, 15, 13, 19, 15, R); chasm(p, 21, 21, 26, 25, R);
      // the log across the first chasm
      p.paint(0.1, (c) => { const px = 15 * T - 5, py = 12 * T + 1, w = 5 * T + 10; c.rect(px, py + 12, w, 3, [10, 10, 14]); c.rect(px, py, w, 13, [86, 62, 40]); c.rect(px, py + 1, w, 3, [132, 100, 64]); c.rect(px, py + 10, w, 3, [58, 40, 28]); for (let x = px + 9; x < px + w - 4; x += 13) c.rect(x, py + 4, 4, 1, [58, 40, 28]); c.ellipse(px + 16, py + 3, 7, 2, [70, 150, 80]); c.ellipse(px + 60, py + 2, 6, 2, [70, 150, 80]); });
      mouth(p, 0, false);
      for (const q of p.people.slice(0, 3)) { mound(p, q.x - 2, q.y - 3, q.x === 16 ? 4 : 5, 3, R); den(p, q.x, q.y - 1); }
      mound(p, 4, 17, 5, 2, R); mound(p, 10, 29, 3, 2, R); mound(p, 24, 28, 3, 2, R); mound(p, 21, 19, 6, 2, R);
      // the Totem's bowl: the pedestal at its middle, the Totem before it
      p.paint(0.05, (c) => ring(c, 18 * T + 8, 27 * T + 8, 46, 34, [150, 150, 120]));
      pedestal(p, 18, 26, [200, 200, 210]);
      for (const [x, y] of [[22, 27], [21, 29], [14, 29]]) rock(p, x, y, [150, 112, 84]);
      for (const [x, y] of [[6, 13], [29, 14], [10, 22], [27, 8], [8, 7], [13, 15], [24, 16], [30, 21], [5, 21], [16, 5], [20, 5]]) fern(p, x, y, [44, 122, 58]);
      for (const [x, y] of [[14, 8], [21, 7], [12, 25], [31, 17]]) rock(p, x, y, R);
      spire(p, 21, 15, R, 28); spire(p, 7, 28, R, 26); spire(p, 29, 28, R, 30);
      p.paint(0.5, (c) => { c.poly([[250, 40], [300, 40], [360, 330], [270, 330]], [255, 250, 200, 34]); c.poly([[90, 60], [120, 60], [200, 260], [150, 260]], [255, 250, 200, 28]); c.poly([[280, 60], [304, 60], [320, 150], [276, 150]], [255, 250, 200, 30]); });
    },
  },
  // Brooklet Hill's gate: a boardwalk between two ponds under a dripping cliff.
  AlolaBrookletEntrance: {
    theme: { room: "arena", floor: "grass", wall: null, top: 6 },
    plan(p) {
      rockWall(p, [112, 124, 136]);
      p.fill("water", 2, 8, 8, 16); p.fill("water", 16, 8, 21, 16); p.fill("water", 3, 6, 6, 7); p.fill("water", 18, 6, 20, 7);
      p.fill("deck", 11, 6, 13, 19); p.fill("deck", 9, 17, 15, 18);
      p.paint(1, (c) => { fall(c, 3 * T + 4, 4 * T, 40, 2 * T + 4); fall(c, 18 * T + 4, 4 * T, 26, 2 * T + 4); for (const [x, y] of [[4, 10], [6, 14], [3, 13], [18, 11], [20, 14], [17, 15], [7, 9]]) { c.ellipse(x * T + 8, y * T + 8, 5, 4, [70, 160, 90]); c.rect(x * T + 8, y * T + 6, 4, 2, [86, 150, 226]); if ((x + y) % 2) c.ellipse(x * T + 7, y * T + 7, 2, 2, [250, 200, 220]); } });
      for (const [x, y] of [[1, 9], [9, 8], [9, 15], [15, 9], [15, 15], [22, 12], [1, 18], [22, 18]]) fern(p, x, y, [60, 150, 90]);
      rock(p, 9, 12, [130, 136, 146]); rock(p, 15, 12, [130, 136, 146]);
      gate(p, 1, [70, 140, 230]);
    },
  },
  // Brooklet Hill: three grassy terraces of pools stepping down the hill, a waterfall between each.
  AlolaBrookletHill: {
    theme: { density: 0, groves: 0, ground: "grass", grass: "tallgrass" },
    plan(p) {
      cave(p, (x, y) => x < 2 || x > 35 || y < 3 || y > 30 || (y === 3 && x >= 15 && x <= 23) || ((x === 2 || x === 35) && p.hash(x, y, 4) < 0.4), [104, 116, 110]);
      mouth(p, 1, true); mouth(p, 0, false);
      p.fill("water", 4, 4, 13, 6); p.fill("water", 25, 4, 33, 6);
      p.fill("water", 4, 9, 12, 16); p.fill("water", 6, 17, 8, 18); p.fill("water", 27, 9, 33, 17); p.fill("water", 29, 18, 31, 18);
      p.fill("water", 4, 21, 13, 27); p.fill("water", 25, 21, 33, 27);
      p.street("dirt", 3, [[19, 30], [19, 5]]);
      const R = [120, 130, 122];
      mound(p, 2, 19, 15, 2, R); mound(p, 22, 19, 14, 2, R); mound(p, 2, 7, 15, 2, R); mound(p, 22, 7, 14, 2, R);
      steps(p, 17, 19, 5, 2, [150, 150, 140]); steps(p, 17, 7, 5, 2, [150, 150, 140]);
      p.paint(22, (c) => { fall(c, 6 * T + 2, 19 * T - 4, 44, 2 * T + 2); fall(c, 29 * T + 2, 19 * T - 4, 44, 2 * T + 2); fall(c, 6 * T + 2, 7 * T - 4, 44, 2 * T + 2); fall(c, 29 * T + 2, 7 * T - 4, 44, 2 * T + 2); });
      p.paint(1, (c) => { for (const [x, y] of [[5, 11], [9, 14], [7, 23], [11, 25], [28, 12], [31, 15], [27, 24], [31, 23], [6, 5], [30, 5], [10, 10], [29, 26]]) { c.ellipse(x * T + 8, y * T + 8, 5, 4, [70, 160, 90]); c.rect(x * T + 8, y * T + 6, 4, 2, [86, 150, 226]); if ((x + y) % 2) c.ellipse(x * T + 7, y * T + 7, 2, 2, [250, 200, 220]); } });
      for (const [x, y] of [[15, 11], [22, 11], [15, 23], [22, 23]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[14, 15], [24, 13], [14, 28], [24, 28], [15, 5], [23, 5], [3, 28], [34, 29], [14, 10], [25, 17]]) fern(p, x, y, [60, 150, 90]);
      for (const [x, y] of [[3, 20 + 9], [33, 29], [16, 16], [24, 9]]) rock(p, x, y, R);
    },
  },
  // The Totem's pool: a round pond under the falls, a pier out to the islet where the Totem waits.
  AlolaBrookletPool: {
    theme: { room: "arena", floor: "grass", wall: null, top: 5 },
    plan(p) {
      rockWall(p, [112, 124, 136]);
      p.fill("water", 2, 5, 19, 13); p.disc("water", 10.5, 9.5, 9.5, 5);
      p.disc("sand", 11.5, 9.5, 2.6, 2.2); p.fill("deck", 10, 11, 12, 14);
      p.paint(1, (c) => { fall(c, 8 * T, 3 * T, 6 * T, 2 * T + 6); for (const [x, y] of [[4, 8], [6, 11], [17, 8], [16, 12], [3, 12], [18, 11], [5, 6], [15, 6]]) { c.ellipse(x * T + 8, y * T + 8, 5, 4, [70, 160, 90]); c.rect(x * T + 8, y * T + 6, 4, 2, [86, 150, 226]); } for (const [x, y] of [[7, 8], [15, 10], [6, 13]]) { c.ellipse(x * T + 8, y * T + 9, 7, 5, [90, 96, 110]); c.ellipse(x * T + 7, y * T + 7, 5, 3, [150, 156, 168]); } ring(c, 11 * T + 8, 9 * T + 8, 34, 26, [220, 230, 250]); });
      for (const [x, y] of [[1, 14], [20, 14], [3, 15], [18, 15], [7, 14], [15, 14]]) fern(p, x, y, [60, 150, 90]);
    },
  },
  // Wela Volcano's gate: ash and cooling lava under the crater wall.
  AlolaWelaEntrance: {
    theme: { room: "arena", floor: "ash", wall: null, top: 6 },
    plan(p) {
      rockWall(p, [112, 72, 64]);
      p.fill("clay", 11, 6, 13, 19);
      lava(p, 2, 9, 8, 15, inDisc(5.5, 12.5, 3.4, 3)); lava(p, 16, 11, 21, 17, inDisc(19, 14.5, 3, 3)); lava(p, 1, 6, 3, 8, (x, y) => x + y < 10); lava(p, 19, 6, 22, 8, (x, y) => x - y > 13);
      const A = [116, 84, 78];
      for (const [x, y] of [[9, 9], [15, 8], [6, 17], [14, 15], [9, 14], [16, 18], [3, 18], [21, 9]]) rock(p, x, y, A);
      spire(p, 8, 7, A, 26); spire(p, 16, 7, A, 26); torch(p, 10, 6, [255, 120, 40]); torch(p, 14, 6, [255, 120, 40]);
      gate(p, 1, [230, 80, 50]);
    },
  },
  // Wela Volcano Park's summit: the oval stone dance stage in the glowing crater, steps and torches at both ends,
  // the path up from the two marker posts, lava in the cracks all round.
  AlolaWelaVolcano: {
    theme: { density: 0, groves: 0 },
    plan(p) {
      const wall = (x, y) => x < 2 || y < 2 || x > 33 || y > 31 || ((x - 17.5) / 15.5) ** 2 + ((y - 17) / 15.5) ** 2 + (p.hash(x >> 1, y >> 1, 3) - 0.5) * 0.1 > 1;
      p.fill("ash", 2, 2, 33, 33); cave(p, wall, [104, 64, 58]);
      mouth(p, 0, false, [255, 200, 150]);
      const SX = 17.5, SY = 12.5, RX = 9.4, RY = 4.6;
      p.disc("paving", SX, SY, RX, RY); p.fill("paving", 17, 6, 19, 8); p.street("clay", 3, [[18, 30], [18, 18]]);
      lava(p, 1, 3, 34, 30, (x, y) => !wall(x, y) && (wall(x - 1, y) || wall(x + 1, y) || wall(x, y - 1)) && p.hash(x, y, 9) < 0.7 && Math.abs(x - 18) > 2);
      lava(p, 6, 21, 13, 27, inDisc(10.5, 24.5, 2.8, 2.5)); lava(p, 23, 20, 30, 26, inDisc(26.5, 23.5, 2.8, 2.5)); lava(p, 4, 4, 12, 8, inDisc(9, 6, 2.6, 1.5)); lava(p, 24, 4, 30, 8, inDisc(27, 6, 2.6, 1.5));
      const A = [124, 84, 74], ST = [204, 198, 184];
      p.paint(0, (c) => {
        const cx = SX * T, cy = SY * T, rx = RX * T, ry = RY * T;
        c.ellipse(cx, cy + 4, rx + 46, ry + 38, [214, 70, 30, 46]); c.ellipse(cx, cy + 4, rx + 26, ry + 22, [226, 84, 36, 60]);
        c.rect(17 * T - 2, 6 * T, 3 * T + 4, 3 * T, sh(ST, 0.5)); c.rect(17 * T, 6 * T, 3 * T, 3 * T, ST);
        c.rect(17 * T - 2, 17 * T, 3 * T + 4, T + 4, sh(ST, 0.5));
        c.ellipse(cx, cy + 6, rx + 4, ry + 4, [70, 44, 40]); c.ellipse(cx, cy + 3, rx + 4, ry + 4, sh(ST, 0.62)); c.ellipse(cx, cy, rx + 4, ry + 4, ST); c.ellipse(cx, cy, rx - 2, ry - 2, sh(ST, 0.93));
        for (let i = 0; i < 46; i++) { const a = p.hash(i, 1, 17) * 6.283, r = Math.sqrt(p.hash(i, 2, 17)) * 0.9, x = cx + Math.cos(a) * r * rx, y = cy + Math.sin(a) * r * ry; c.rect(x, y, 7, 1, sh(ST, 0.8)); c.rect(x + 2, y + 1, 4, 1, sh(ST, 1.08)); }
        ring(c, 18 * T + 8, 25 * T + 8, 40, 28, [230, 140, 90]);
      });
      steps(p, 17, 17, 3, 1, sh(ST, 0.9)); steps(p, 17, 8, 3, 1, sh(ST, 0.9));
      for (const [x, y] of [[16, 7], [20, 7], [16, 18], [20, 18]]) torch(p, x, y, [255, 120, 40]);
      for (const [x, y] of [[13, 21], [23, 28], [12, 29], [22, 19], [8, 16], [27, 16], [14, 27], [5, 13], [30, 12]]) rock(p, x, y, A);
      // the two marker posts where the path begins
      for (const x of [16, 20]) { p.block(x, 29, 1, 1); p.paint(30, (c, top) => { const px = x * T, py = 29 * T; c.ellipse(px + 8, py + 13, 9, 3, [0, 0, 0, 70]); c.poly([[px - 1, py + 14], [px + 17, py + 14], [px + 8, py + 2]], x === 16 ? [226, 196, 70] : [120, 100, 200]); c.box(px + 5, py - 4, 6, 18, [176, 150, 110], [80, 60, 44]); top.box(px + 5, py - 20, 6, 16, [176, 150, 110], [80, 60, 44]); top.box(px + 3, py - 16, 10, 4, [214, 80, 50], [80, 60, 44]); top.box(px + 3, py - 8, 10, 3, [240, 200, 90], [80, 60, 44]); }); }
    },
  },
  // Lush Jungle's gate: dirt trails through dense dark jungle, tall grass and ferns either side.
  AlolaLushEntrance: {
    theme: { room: "arena", floor: "shade", wall: null, top: 6 },
    plan(p) {
      leafWall(p, [36, 112, 58]);
      for (const [x0, y0, x1, y1] of [[11, 6, 13, 19], [5, 14, 11, 15], [3, 15, 5, 17], [13, 9, 19, 10], [19, 10, 21, 12]]) p.fill("dirt", x0, y0, x1, y1);
      for (const [x0, y0, x1, y1] of [[2, 9, 6, 11], [16, 12, 19, 15], [15, 17, 20, 18], [3, 18, 8, 19]]) p.fill("meadow", x0, y0, x1, y1);
      p.paint(0.05, (c) => { for (const [x0, y0, x1, y1] of [[2, 9, 6, 11], [16, 12, 19, 15], [15, 17, 20, 18], [3, 18, 8, 19]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x * T, py = y * T; c.rect(px, py, T, T, [30, 104, 52, 150]); for (let i = 0; i < 4; i++) { const bx = px + 1 + i * 4; c.line(bx, py + 14, bx + 1, py + 5 + (i % 2) * 3, [70, 170, 80], 2); c.line(bx + 2, py + 15, bx + 2, py + 8, [24, 84, 44], 1); } } });
      for (const [x, y] of [[1, 4], [4, 5], [7, 4], [16, 4], [19, 5], [21, 4], [1, 12], [21, 14], [8, 16], [15, 6]]) p.decor("tree1", x, y, { optional: true });
      for (const [x, y] of [[8, 12], [9, 8], [15, 11], [14, 16], [10, 18], [22, 17], [8, 7], [10, 6], [14, 7], [1, 16], [20, 19], [22, 8]]) fern(p, x, y, [40, 150, 80]);
      // the cooking pot Mallow tends
      p.block(6, 12, 1, 1); p.paint(13, (c, top) => { const px = 6 * T, py = 12 * T; c.ellipse(px + 8, py + 13, 10, 4, [0, 0, 0, 70]); c.rect(px - 1, py + 10, 3, 5, [110, 70, 40]); c.rect(px + 14, py + 10, 3, 5, [110, 70, 40]); c.ellipse(px + 8, py + 6, 10, 8, [50, 50, 60]); c.ellipse(px + 8, py + 1, 9, 4, [90, 90, 104]); c.ellipse(px + 8, py + 1, 7, 3, [190, 150, 70]); top.ellipse(px + 5, py - 8, 3, 4, [240, 240, 240, 150]); top.ellipse(px + 11, py - 13, 3, 4, [240, 240, 240, 110]); });
      gate(p, 1, [90, 190, 90]);
    },
  },
  // Vast Poni Canyon's gate: banded canyon walls, a sandy floor with thin grass, scree before the last trial.
  AlolaVastPoniEntrance: {
    theme: { room: "arena", floor: "sand", wall: null, top: 6 },
    plan(p) {
      const C = [186, 150, 110]; rockWall(p, C); strata(p, p.left * T, (p.top - 2) * T, (p.right - p.left + 1) * T, 32);
      p.fill("dirt", 11, 6, 13, 19); p.disc("grass", 6, 12, 2.6, 2); p.disc("grass", 17, 16.5, 3, 1.8); p.disc("grass", 9, 18, 2, 1.4);
      mound(p, 1, 6, 4, 4, C); mound(p, 19, 6, 4, 3, C); mound(p, 1, 14, 3, 4, C); mound(p, 18, 12, 5, 3, C); mound(p, 6, 8, 2, 2, C);
      for (const [x, y] of [[7, 14], [16, 10], [8, 17], [15, 18], [5, 19], [20, 18]]) rock(p, x, y, C);
      spire(p, 9, 7, C, 30); spire(p, 15, 7, C, 30); spire(p, 4, 12, C, 26);
      // the dead tree by the trail
      p.block(15, 13, 1, 1); p.paint(14, (c, top) => { const px = 15 * T + 8, py = 13 * T + 14, B = [84, 62, 50]; c.ellipse(px, py, 8, 3, [0, 0, 0, 60]); c.line(px, py, px, py - 12, B, 4); top.line(px, py - 12, px - 1, py - 26, B, 3); top.line(px, py - 16, px - 10, py - 26, B, 2); top.line(px - 1, py - 20, px + 9, py - 30, B, 2); top.line(px - 10, py - 26, px - 14, py - 24, B, 1); top.line(px + 9, py - 30, px + 14, py - 28, B, 1); top.line(px - 1, py - 26, px - 4, py - 34, B, 1); });
      gate(p, 1, [120, 100, 220]);
    },
  },
  // The Dragon trial: a narrow canyon winding from the Totem's round arena past two ambush nooks to the pedestal at its head.
  AlolaDragonTrial: {
    theme: { density: 0, groves: 0 },
    plan(p) {
      const C = [186, 150, 110];
      const open = anyOf([inDisc(18.5, 24.5, 6.2), inDisc(18.5, 15.5, 3.6, 3), inDisc(11.5, 12.5, 3.4, 2.8), inDisc(18.5, 5.5, 4.8, 3.3),
        nearSeg(18, 31, 18, 24, 1.5), nearSeg(18, 24, 18, 15, 1.6), nearSeg(18, 15, 11, 12, 1.5), nearSeg(11, 12, 13, 8, 1.5), nearSeg(13, 8, 18, 6, 1.5)]);
      const wall = (x, y) => x < 2 || y < 2 || x > 33 || y > 31 || !open(x, y);
      p.fill("sand", 2, 2, 33, 33);
      for (const [x, y, r] of [[18.5, 24.5, 4.2], [18.5, 15.5, 2.4], [11.5, 12.5, 2.2], [18.5, 5.5, 3]]) p.disc("grass", x, y, r, r * 0.8);
      p.fill("cobble", 16, 3, 20, 5); p.street("dirt", 1, [[18, 30], [18, 18]]);
      // the canyon's rim, seen from above, and its banded cliffs
      p.paint(0, (c) => {
        for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (wall(x, y)) {
          const px = x * T, py = y * T; c.rect(px, py, T, T, sh(C, 0.84));
          for (let i = 0; i < 2; i++) { const k = p.hash(x, y, 40 + i); c.rect(px + Math.floor(k * 8), py + 3 + i * 7, 6 + Math.floor(p.hash(y, x, 50 + i) * 3), 2, k > 0.5 ? sh(C, 0.95) : sh(C, 0.72)); }
          if (!wall(x, y - 1)) c.rect(px, py, T, 3, sh(C, 1.08));
        }
      });
      cave(p, wall, sh(C, 0.8));
      p.paint(0, (c) => { for (let y = 0; y < p.H - 1; y++) for (let x = 0; x < p.W; x++) if (wall(x, y) && !wall(x, y + 1)) strataBand(c, x * T, y * T, T, T); });
      mouth(p, 0, false);
      pedestal(p, 18, 4, [110, 100, 230]); torch(p, 16, 5, [150, 130, 255]); torch(p, 20, 5, [150, 130, 255]);
      p.paint(0, (c) => { const cx = 18 * T + 8, cy = 24 * T + 8; c.ellipse(cx, cy, 84, 84, [120, 100, 90, 255], 3); c.ellipse(cx, cy, 62, 62, [96, 90, 200, 70]); c.ellipse(cx, cy, 62, 62, [96, 90, 200], 2); c.ellipse(cx, cy, 40, 40, [226, 220, 250, 190], 2); for (let a = 0; a < 6; a++) c.line(cx + Math.cos(a * Math.PI / 3) * 41, cy + Math.sin(a * Math.PI / 3) * 41, cx + Math.cos(a * Math.PI / 3) * 60, cy + Math.sin(a * Math.PI / 3) * 60, [226, 220, 250, 190], 2); });
      for (const [x, y] of [[14, 21], [23, 21], [14, 28], [23, 28], [13, 24], [24, 25]]) spire(p, x, y, sh(C, 0.9), 26);
      for (const [x, y] of [[20, 17], [9, 13], [16, 21], [21, 27], [15, 6], [16, 13]]) rock(p, x, y, C);
    },
  },
  // The Altar of the Sunne and Moone: a great stair between two flute pools up to the emblem platform; the wormhole hangs behind it.
  AlolaAltarSunne: {
    theme: { density: 0, groves: 0, road: "ruinFloor" },
    plan(p) {
      const floor = (x, y) => (x >= 5 && x <= 33 && y >= 6 && y <= 16) || (x >= 17 && x <= 21 && y >= 4 && y <= 5) || (x >= 14 && x <= 24 && y >= 17 && y <= 26) || (((x >= 4 && x <= 13) || (x >= 25 && x <= 34)) && y >= 17 && y <= 25) || (x >= 6 && x <= 32 && y >= 27 && y <= 30);
      cave(p, (x, y) => !floor(x, y), [130, 126, 150]);
      p.fill("ruinFloor", 5, 6, 33, 16); p.fill("ruinFloor", 17, 5, 21, 5); p.fill("ruinFloor", 14, 17, 24, 26); p.fill("paving", 6, 27, 32, 30);
      p.fill("water", 4, 17, 13, 25); p.fill("water", 25, 17, 34, 25);
      p.disc("ruinFloor", 8.5, 21.5, 1.8); p.disc("ruinFloor", 30.5, 21.5, 1.8); p.fill("deck", 10, 21, 13, 21); p.fill("deck", 25, 21, 28, 21);
      mouth(p, 0, false, [200, 210, 255]); p.bare(1); p.street("ruinFloor", 1, [[19, 26], [19, 5]]); p.street("paving", 1, [[19, 30], [19, 27]]);
      steps(p, 14, 17, 11, 10, [190, 186, 204]);
      p.paint(0, (c) => {
        // the wormhole behind the altar
        const wx = 19 * T + 8, wy = 2 * T + 6;
        for (const [rx, ry, col] of [[52, 36, [50, 30, 110]], [44, 30, [90, 60, 200]], [34, 23, [120, 150, 250]], [22, 15, [190, 230, 255]], [10, 7, [250, 252, 255]]]) c.ellipse(wx, wy, rx, ry, col);
        for (let a = 0; a < 10; a++) { const an = a * Math.PI / 5; c.line(wx + Math.cos(an) * 12, wy + Math.sin(an) * 8, wx + Math.cos(an + 0.7) * 42, wy + Math.sin(an + 0.7) * 28, [230, 240, 255, 150], 1); }
        c.rect(19 * T - 4, 4 * T, 24, T, [190, 230, 255, 200]); c.rect(19 * T, 4 * T + 2, 16, 14, [250, 252, 255]);
        // the emblem: sun to the left, moon to the right
        const cx = 20 * T, cy = 11 * T + 8;
        c.ellipse(cx, cy, 76, 70, [226, 222, 236, 150]); c.ellipse(cx, cy, 76, 70, [120, 110, 150], 3); c.ellipse(cx, cy, 68, 62, [240, 200, 110], 2);
        c.rect(cx - 1, cy - 62, 2, 124, [120, 110, 150]);
        emblem(c, cx - 34, cy, 26, "sun"); emblem(c, cx + 34, cy, 26, "moon");
        // rails of the stair
        c.rect(14 * T - 3, 17 * T, 4, 10 * T, [120, 116, 140]); c.rect(25 * T - 1, 17 * T, 4, 10 * T, [120, 116, 140]);
      });
      for (const [x, y] of [[6, 7], [32, 7], [6, 15], [32, 15], [13, 7], [26, 7]]) column(p, x, y, [196, 192, 210]);
      for (const [x, y] of [[13, 27], [25, 27], [16, 6], [22, 6]]) torch(p, x, y, [140, 190, 255]);
      pedestal(p, 8, 21, [240, 190, 70]); pedestal(p, 30, 21, [110, 120, 230]);
    },
  },
  // Ultra Space: a platform of light adrift in the dark, crystals round its rim.
  AlolaUltraSpace: {
    theme: { density: 0, groves: 0 },
    plan(p) {
      const d1 = inDisc(17.5, 13.5, 7.6), isle = (x, y) => inDisc(6.5, 23.5, 2.2)(x, y) || inDisc(30.5, 21.5, 2.6)(x, y) || inDisc(29.5, 6.5, 2.2)(x, y) || inDisc(6, 7, 1.8)(x, y);
      const floor = (x, y) => d1(x, y) || (x >= 18 && x <= 20 && y >= 19 && y <= 30) || isle(x, y);
      cave(p, (x, y) => !floor(x, y), null);
      for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) if (floor(x, y)) p.fill(inDisc(17.5, 13.5, 3.6)(x, y) ? "neon" : "darkpave", x, y, x, y);
      p.bare(0);
      p.paint(0, (c) => {
        for (let i = 0; i < 420; i++) { const x = Math.floor(p.hash(i, 1, 21) * p.W * T), y = Math.floor(p.hash(i, 2, 21) * p.H * T); if (floor(x >> 4, y >> 4)) continue; const k = p.hash(i, 3, 21); c.rect(x, y, k > 0.9 ? 2 : 1, k > 0.9 ? 2 : 1, k > 0.6 ? [250, 250, 255] : k > 0.3 ? [150, 190, 255] : [220, 150, 250]); }
        for (const [x, y, rx, ry, col] of [[90, 120, 60, 22, [90, 40, 150, 50]], [470, 420, 80, 30, [40, 90, 170, 50]], [450, 60, 50, 20, [150, 60, 130, 50]], [120, 470, 70, 24, [60, 60, 170, 50]]]) c.ellipse(x, y, rx, ry, col);
        const cx = 17.5 * T, cy = 13.5 * T;
        c.ellipse(cx, cy, 7.6 * T + 2, 7.6 * T + 2, [140, 220, 255], 2); c.ellipse(cx, cy, 5.6 * T, 5.6 * T, [140, 220, 255, 150], 1); c.ellipse(cx, cy, 3.6 * T, 3.6 * T, [250, 240, 180], 2);
        for (let a = 0; a < 12; a++) { const an = a * Math.PI / 6; c.line(cx + Math.cos(an) * 60, cy + Math.sin(an) * 60, cx + Math.cos(an) * 116, cy + Math.sin(an) * 116, [140, 220, 255, 120], 1); }
        for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4 + 0.39; c.poly([[cx + Math.cos(an) * 50, cy + Math.sin(an) * 50], [cx + Math.cos(an + 0.25) * 14, cy + Math.sin(an + 0.25) * 14], [cx + Math.cos(an - 0.25) * 14, cy + Math.sin(an - 0.25) * 14]], [255, 250, 210, 150]); }
        c.rect(18 * T, 19 * T, 1, 12 * T, [140, 220, 255]); c.rect(21 * T - 1, 19 * T, 1, 12 * T, [140, 220, 255]);
        const ex = 19 * T + 8, ey = 29 * T + 8; c.ellipse(ex, ey, 22, 15, [90, 60, 200, 200]); c.ellipse(ex, ey, 15, 10, [150, 190, 255]); c.ellipse(ex, ey, 7, 5, [250, 252, 255]);
      });
      for (const [x, y, col] of [[11, 10, [150, 230, 255]], [24, 10, [150, 230, 255]], [11, 17, [250, 230, 150]], [24, 17, [250, 230, 150]], [17, 7, [255, 255, 255]], [6, 23, [220, 150, 250]], [30, 21, [150, 230, 255]], [29, 6, [250, 230, 150]], [6, 7, [220, 150, 250]], [31, 22, [220, 150, 250]]]) crystal(p, x, y, col);
    },
  },

  // ------------------------------------------------------------ the Pokemon League
  // The four chambers are alike in the games: a glowing oval field in the dark rock, told apart by colour alone.
  // Molayne (steel): pale steel blue.
  AlolaEliteMolayne: { theme: { room: "arena", floor: "steel", wall: null, top: 6 }, plan(p) { league(p, [156, 184, 214]); } },
  // Olivia (rock): orange.
  AlolaEliteOlivia: { theme: { room: "arena", floor: "steel", wall: null, top: 6 }, plan(p) { league(p, [240, 172, 104]); } },
  // Acerola (ghost): violet.
  AlolaEliteAcerola: { theme: { room: "arena", floor: "steel", wall: null, top: 6 }, plan(p) { league(p, [160, 140, 226]); } },
  // Kahili (flying): green.
  AlolaEliteKahili: { theme: { room: "arena", floor: "steel", wall: null, top: 6 }, plan(p) { league(p, [112, 222, 140]); } },
  // The Champion's chamber: a long walkway from a round pad to the cyan field, the throne on the dais at its head.
  AlolaChampionRoom: {
    theme: { room: "arena", floor: "steel", wall: null, top: 6 },
    plan(p) {
      league(p, [112, 226, 222], { cy: 12, rx: 8, ry: 4.3, dais: 7, pad: true });
      throne(p, 12, 7, [200, 60, 60]);
    },
  },
  // The Hall of Fame: a red runner up to the registration machine and its six lit Ball cradles.
  AlolaHallOfFame: {
    theme: { room: "arena", floor: "hallFloor", wall: null, top: 5 },
    plan(p) {
      const G = [240, 200, 90];
      wallPanel(p, [70, 60, 100], (c, x0, y0, w) => { c.rect(x0, y0 + 13, w, 2, G); const cx = 11 * T; c.box(cx - 44, y0 + 2, 88, 28, [40, 44, 70], G); c.box(cx - 20, y0 + 5, 40, 16, [90, 200, 220], [20, 30, 50]); c.rect(cx - 16, y0 + 8, 20, 2, [220, 250, 255]); for (let i = 0; i < 6; i++) { const bx = cx - 38 + (i < 3 ? i * 7 : 44 + i * 7 - 21 + 14); c.ellipse(bx, y0 + 24, 3, 3, [240, 240, 240]); c.rect(bx - 3, y0 + 21, 7, 3, [220, 70, 60]); } });
      carpet(p, 10, 7, 2, 8, [190, 50, 56]);
      counter(p, 8, 5, 6, 1, [90, 96, 130]);
      p.paint(6.1, (c) => { for (let i = 0; i < 6; i++) { const bx = 8 * T + 8 + i * 16, by = 5 * T - 2; c.ellipse(bx, by, 5, 5, [30, 30, 40]); c.ellipse(bx, by, 4, 4, [244, 244, 250]); c.rect(bx - 4, by - 4, 9, 4, [220, 70, 60]); c.rect(bx - 4, by - 1, 9, 1, [30, 30, 40]); c.ellipse(bx, by, 1.5, 1.5, [30, 30, 40]); } });
      for (const [x, y] of [[3, 7], [18, 7], [3, 11], [18, 11], [6, 9], [15, 9]]) column(p, x, y, [214, 204, 180]);
      p.decor("rStatue", 2, 12, { optional: true }); p.decor("rStatue", 18, 12, { optional: true });
      torch(p, 6, 5, G); torch(p, 15, 5, G);
      p.paint(0.2, (c) => { ring(c, 11 * T, 10 * T + 8, 56, 30, G); });
    },
  },
  // ------------------------------------------------------------ the guardians' ruins
  AlolaRuinsOfLife: { theme: { room: "arena", floor: "ruinFloor", wall: null, top: 6 }, plan(p) { ruins(p, [240, 130, 180], "lele"); } },
  AlolaRuinsAbundance: { theme: { room: "arena", floor: "ruinFloor", wall: null, top: 6 }, plan(p) { ruins(p, [220, 80, 60], "bulu"); } },
  AlolaRuinsHope: { theme: { room: "arena", floor: "ruinFloor", wall: null, top: 6 }, plan(p) { ruins(p, [150, 110, 220], "fini"); } },

  // ------------------------------------------------------------ Melemele
  // The player's home: kitchen along the back, the lounge with its TV, Meowth's cushion by the bed.
  AlolaHome: {
    theme: { room: "house", top: 5 },
    plan(p) {
      p.decor("rKitchen", 1, 3); p.decor("rFridge", 4, 3); p.decor("rWindow", 8, 3); p.decor("rWindow", 11, 3); p.decor("rBooks", 17, 3);
      p.decor("rTV", 14, 4); carpet(p, 13, 6, 4, 2, [90, 170, 190]); sofa(p, 14, 8, [230, 150, 90]);
      p.decor("rTable", 2, 9); carpet(p, 9, 12, 3, 2, [230, 190, 100]);
      bed(p, 18, 11, [90, 150, 220]); p.decor("rPot", 1, 14); p.decor("rPot", 18, 14, { optional: true }); p.decor("rPlant", 5, 5, { optional: true }); p.decor("rPlant", 18, 5, { optional: true });
      p.paint(0.2, (c) => { const x = 16 * T + 8, y = 13 * T + 8; c.ellipse(x, y, 9, 6, [150, 60, 70]); c.ellipse(x, y - 1, 7, 4, [226, 110, 110]); c.ellipse(x, y - 1, 3, 2, [246, 170, 160]); });
    },
  },
  // The Trainers' School classroom: blackboard behind the teacher, two rows of desks.
  AlolaTrainerSchool: {
    theme: { room: "house", top: 4 },
    plan(p) {
      p.paint(0.1, (c) => { const x = 7 * T, y = 2 * T + 4; c.box(x, y, 6 * T, 22, [40, 96, 70], [150, 110, 70]); c.rect(x + 8, y + 5, 30, 1, [230, 240, 230]); c.rect(x + 8, y + 9, 44, 1, [230, 240, 230]); c.rect(x + 8, y + 13, 22, 1, [230, 240, 230]); c.ellipse(x + 74, y + 10, 6, 6, [230, 240, 230], 1); c.rect(x + 68, y + 9, 12, 1, [230, 240, 230]); c.rect(x + 4, y + 19, 12, 2, [250, 250, 250]); });
      p.decor("rShelf", 1, 2); p.decor("rShelf", 15, 2); p.decor("rWindow", 4, 2); p.decor("rWindow", 13, 2, { optional: true });
      counter(p, 12, 5, 2, 1, [170, 120, 76]);
      for (const q of p.people.filter((s) => /student/.test(s.script))) for (const d of [-1, 1]) { counter(p, q.x + d, q.y, 1, 1, [196, 150, 96]); p.paint(q.y + 1.1, (c) => { c.box((q.x + d) * T + 4, q.y * T - 3, 8, 6, [250, 250, 250], [120, 120, 140]); }); }
      p.decor("rPlant", 1, 12); p.decor("rPlant", 16, 12); p.decor("rPot", 16, 7, { optional: true });
      carpet(p, 8, 10, 3, 2, [200, 90, 80]);
    },
  },
  // The Berry Fields: rows of berry trees in tilled soil inside a hedge.
  AlolaBerryFields: {
    theme: { room: "arena", floor: "grass", wall: null, top: 4 },
    plan(p) {
      leafWall(p, [50, 140, 70]);
      const cols = [[230, 70, 80], [90, 130, 240], [240, 200, 70], [240, 140, 190], [150, 90, 210], [250, 150, 60]];
      let n = 0;
      for (const [x0, y0] of [[2, 5], [11, 5], [2, 9], [11, 9]]) { p.fill("dirt", x0, y0, x0 + 4, y0 + 1); for (let x = x0; x <= x0 + 4; x += 2) berry(p, x, y0, cols[n++ % 6]); }
      p.fill("sand", 8, 4, 9, 13); p.fill("flowersRed", 12, 12, 15, 13); p.fill("flowersBlue", 2, 12, 5, 13);
      p.decor("barrels", 16, 11, { optional: true }); p.decor("barrels", 1, 7, { optional: true }); crate(p, 16, 7); crate(p, 7, 12);
      // the watering trough
      p.block(11, 12, 1, 1); p.paint(13, (c) => { const px = 11 * T, py = 12 * T; c.box(px, py + 2, 16, 12, [130, 96, 60], [70, 50, 34]); c.rect(px + 2, py + 4, 12, 6, [90, 160, 230]); c.rect(px + 3, py + 5, 5, 1, [200, 230, 250]); });
    },
  },
  // Hau'oli Cemetery: rows of headstones either side of the path, under dark trees.
  AlolaCemetery: {
    theme: { room: "arena", floor: "grass", wall: null, top: 5 },
    plan(p) {
      leafWall(p, [40, 110, 70]);
      p.fill("dirt", 11, 5, 13, 17); p.fill("flowersPink", 3, 15, 6, 16); p.fill("flowersRed", 17, 15, 20, 16);
      let n = 0;
      for (const y of [7, 10, 13]) for (const x of [2, 5, 8, 15, 18, 21]) grave(p, x, y, [[240, 240, 250], null, [240, 130, 170], null, [250, 220, 90]][n++ % 5]);
      for (const [x, y] of [[1, 3], [20, 3], [6, 4], [16, 4]]) p.decor("tree1", x, y, { optional: true });
      torch(p, 10, 5, [250, 220, 150]); torch(p, 14, 5, [250, 220, 150]);
      for (const [x, y] of [[1, 16], [22, 16], [9, 16], [15, 16]]) fern(p, x, y, [44, 120, 76]);
    },
  },
  // ------------------------------------------------------------ Akala
  // The Tide Song Hotel lobby: reception, sofas, the lifts.
  AlolaHeaheaHotel: {
    theme: { room: "arena", floor: "hallFloor", wall: "wHouse", top: 4 },
    plan(p) {
      p.paint(0.1, (c) => { for (const x of [2, 14]) { c.box(x * T, 2 * T + 4, 30, 28, [176, 180, 196], [80, 84, 100]); c.rect(x * T + 14, 2 * T + 6, 2, 26, [80, 84, 100]); c.rect(x * T + 10, 2 * T, 10, 4, [240, 200, 90]); } const kx = 7 * T + 8; c.box(kx, 2 * T + 6, 4 * T, 18, [120, 84, 56], [70, 48, 34]); for (let i = 0; i < 12; i++) c.rect(kx + 6 + (i % 6) * 9, 2 * T + 10 + Math.floor(i / 6) * 7, 3, 4, [240, 200, 90]); });
      counter(p, 5, 5, 4, 1, [170, 120, 76]); counter(p, 10, 5, 4, 1, [170, 120, 76]);
      carpet(p, 8, 7, 3, 5, [180, 60, 70]);
      p.decor("rSeats", 2, 9); p.decor("rSeats", 13, 9); p.decor("rPlant", 1, 5); p.decor("rPlant", 16, 5); p.decor("rPlant", 5, 12, { optional: true }); p.decor("rPlant", 12, 12, { optional: true });
      crate(p, 16, 12, [150, 90, 70]); crate(p, 15, 12, [70, 110, 160]);
    },
  },
  // The Battle Royal Dome: the roped ring with its four coloured corners, the crowd behind.
  AlolaBattleRoyalDome: {
    theme: { room: "arena", floor: "darkpave", wall: null, top: 4 },
    plan(p) {
      wallPanel(p, [40, 40, 64], (c, x0, y0, w) => { for (let r = 0; r < 3; r++) for (let x = x0 + 4 + (r % 2) * 4; x < x0 + w - 4; x += 8) { const k = p.hash(x, r, 7); c.ellipse(x, y0 + 7 + r * 8, 3, 3, k > 0.66 ? [240, 200, 160] : k > 0.33 ? [200, 150, 110] : [150, 110, 90]); c.rect(x - 3, y0 + 10 + r * 8, 7, 4, [[226, 60, 60], [70, 130, 230], [90, 190, 90], [240, 210, 70]][Math.floor(p.hash(x, r, 9) * 4)]); } });
      const X0 = 4, X1 = 13, Y0 = 5, Y1 = 10, cols = [[226, 60, 60], [70, 130, 230], [240, 210, 70], [90, 190, 90]];
      p.paint(0.1, (c) => {
        const px = X0 * T, py = Y0 * T, pw = (X1 - X0 + 1) * T, ph = (Y1 - Y0 + 1) * T;
        c.rect(px - 2, py + 2, pw + 4, ph + 4, [20, 20, 30]); c.rect(px, py, pw, ph, [226, 228, 236]);
        c.poly([[px, py], [px + 44, py], [px, py + 44]], cols[0]); c.poly([[px + pw, py], [px + pw - 44, py], [px + pw, py + 44]], cols[1]); c.poly([[px, py + ph], [px + 44, py + ph], [px, py + ph - 44]], cols[2]); c.poly([[px + pw, py + ph], [px + pw - 44, py + ph], [px + pw, py + ph - 44]], cols[3]);
        c.ellipse(px + pw / 2, py + ph / 2, 30, 24, [150, 156, 176], 2); c.ellipse(px + pw / 2, py + ph / 2, 10, 8, [226, 60, 60]);
      });
      p.block(X0, Y0, X1 - X0 + 1, 1); p.block(X0, Y0 + 1, 1, Y1 - Y0); p.block(X1, Y0 + 1, 1, Y1 - Y0); p.block(X0 + 1, Y1, 3, 1); p.block(X1 - 3, Y1, 3, 1);
      p.paint(Y1 + 1.2, (c, top) => {
        const ax = X0 * T + 8, bx = X1 * T + 8, ay = Y0 * T + 8, by = Y1 * T + 8;
        for (const o of [0, 4]) { c.line(ax, ay - o, bx, ay - o, [250, 250, 250], 1); c.line(ax, ay - o, ax, by - o, [250, 250, 250], 1); c.line(bx, ay - o, bx, by - o, [250, 250, 250], 1); c.line(ax, by - o, ax + 3 * T + 8, by - o, [250, 250, 250], 1); c.line(bx - 3 * T - 8, by - o, bx, by - o, [250, 250, 250], 1); }
        [[ax, ay], [bx, ay], [ax, by], [bx, by]].forEach(([x, y], i) => { c.ellipse(x, y + 5, 6, 3, [0, 0, 0, 80]); c.box(x - 3, y - 8, 7, 15, cols[i], sh(cols[i], 0.4)); top.box(x - 3, y - 14, 7, 7, sh(cols[i], 1.2), sh(cols[i], 0.4)); });
        for (const x of [ax + 3 * T + 8, bx - 3 * T - 8]) c.box(x - 2, by - 8, 4, 13, [200, 200, 210], [80, 80, 96]);
      });
      p.decor("rBench", 1, 12, { optional: true }); p.decor("rBench", 12, 12, { optional: true });
      for (const [x, y] of [[1, 5], [16, 5], [1, 9], [16, 9]]) torch(p, x, y, [250, 240, 180]);
    },
  },
  // ------------------------------------------------------------ Ula'ula
  // Hokulani Observatory: the great telescope under the dome slit, and the consoles of Sophocles's trial.
  AlolaHokulaniObservatory: {
    theme: { room: "lab", top: 4 },
    plan(p) {
      wallPanel(p, [60, 70, 104], (c, x0, y0, w) => { c.box(x0 + 8, y0 + 2, 6 * T, 26, [14, 16, 40], [150, 160, 190]); for (let i = 0; i < 30; i++) c.rect(x0 + 10 + Math.floor(p.hash(i, 1, 5) * 90), y0 + 4 + Math.floor(p.hash(i, 2, 5) * 22), 1, 1, i % 4 ? [240, 240, 255] : [250, 230, 150]); c.ellipse(x0 + 76, y0 + 12, 5, 5, [240, 240, 220]); c.ellipse(x0 + 78, y0 + 10, 4, 4, [14, 16, 40]); for (let i = 0; i < 2; i++) { const x = x0 + 7 * T + i * 26; c.box(x, y0 + 6, 22, 16, [40, 110, 120], [20, 30, 50]); c.line(x + 2, y0 + 16, x + 8, y0 + 10, [150, 250, 220], 1); c.line(x + 8, y0 + 10, x + 13, y0 + 14, [150, 250, 220], 1); c.line(x + 13, y0 + 14, x + 19, y0 + 8, [150, 250, 220], 1); } });
      // the telescope
      p.block(2, 5, 3, 3);
      p.paint(8, (c, top) => {
        const px = 2 * T, py = 5 * T, G = [200, 204, 216], D = [90, 94, 112];
        c.ellipse(px + 24, py + 42, 24, 6, [0, 0, 0, 70]); c.box(px + 6, py + 34, 36, 10, D, EDGE); c.box(px + 16, py + 14, 16, 22, [140, 144, 160], EDGE);
        for (const cv of [c, top]) { cv.poly([[px + 6, py + 26], [px + 20, py + 34], [px + 50, py - 12], [px + 34, py - 22]], EDGE); cv.poly([[px + 8, py + 26], [px + 19, py + 32], [px + 48, py - 12], [px + 35, py - 20]], G); cv.poly([[px + 8, py + 26], [px + 12, py + 28], [px + 40, py - 17], [px + 35, py - 20]], [240, 242, 250]); cv.ellipse(px + 42, py - 17, 9, 5, D); cv.ellipse(px + 42, py - 17, 6, 3, [110, 190, 240]); cv.box(px + 2, py + 22, 10, 8, D, EDGE); }
      });
      p.decor("rMachine", 11, 2); p.decor("rShelf", 15, 2, { optional: true }); p.decor("rBench", 2, 10, { optional: true }); p.decor("rStack", 1, 11, { optional: true });
      p.paint(0.2, (c) => {
        const Y = [240, 210, 70]; c.rect(12 * T + 7, 6 * T, 2, 3 * T + 8, Y); c.rect(10 * T + 8, 9 * T + 7, 5 * T + 2, 2, Y);
        for (const q of p.people.filter((s) => /power/.test(s.script))) { c.rect(q.x * T + 7, 9 * T + 8, 2, 8, Y); pad(c, q.x, q.y, [110, 220, 240]); }
        ring(c, 15 * T + 8, 6 * T + 10, 20, 14, [250, 230, 110]);
      });
      p.decor("rPlant", 16, 12, { optional: true }); p.decor("rPlant", 6, 4, { optional: true });
    },
  },
  // Blush Mountain's geothermal plant: generators, pipes and hazard paint.
  AlolaBlushMountain: {
    theme: { room: "arena", floor: "steel", wall: null, top: 4 },
    plan(p) {
      wallPanel(p, [110, 116, 130], (c, x0, y0, w) => { for (let x = x0; x < x0 + w; x += 12) c.poly([[x, y0 + 32], [x + 6, y0 + 32], [x + 12, y0 + 26], [x + 6, y0 + 26]], [240, 200, 60]); c.rect(x0, y0 + 8, w, 4, [170, 90, 60]); c.rect(x0, y0 + 16, w, 3, [90, 130, 170]); });
      p.decor("rMachine", 1, 2); p.decor("rMachine", 13, 2); p.decor("rMachine", 7, 2, { optional: true });
      const O = [230, 150, 60];
      drum(p, 3, 8, [150, 156, 170], O); drum(p, 12, 8, [150, 156, 170], O); drum(p, 3, 11, [150, 156, 170], [110, 220, 240]); drum(p, 12, 11, [150, 156, 170], [110, 220, 240]);
      p.paint(0.2, (c) => { c.rect(5 * T, 9 * T, 7 * T, 4, [170, 90, 60]); c.rect(5 * T, 12 * T, 7 * T, 4, [90, 130, 170]); c.rect(8 * T + 6, 6 * T, 4, 6 * T + 4, [130, 136, 150]); for (let x = 7 * T; x < 11 * T; x += 12) c.poly([[x, 7 * T + 6], [x + 6, 7 * T + 6], [x + 12, 7 * T], [x + 6, 7 * T]], [240, 200, 60]); });
      crate(p, 1, 7, [150, 156, 170]); crate(p, 16, 7, [150, 156, 170]); crate(p, 16, 6, [170, 130, 80]); crate(p, 6, 13, [170, 130, 80]);
    },
  },
  // The abandoned Thrifty Megamart: toppled stock, dust and gloom, the taped-off back room.
  AlolaThriftyMegamart: {
    theme: { room: "mart", top: 4 },
    plan(p) {
      p.paint(0.05, (c) => {
        c.rect(p.left * T, (p.top - 2) * T, (p.right - p.left + 1) * T, (p.bottom - p.top + 3) * T, [40, 24, 80, 96]);
        const x0 = p.left * T, y0 = (p.top - 2) * T, w = (p.right - p.left + 1) * T;
        for (const [a, b, s2] of [[x0, y0, 1], [x0 + w, y0, -1]]) for (let i = 1; i < 4; i++) { c.line(a, b + i * 7, a + s2 * i * 7, b, [220, 220, 236, 150], 1); c.line(a, b, a + s2 * 24, b + i * 6, [220, 220, 236, 110], 1); }
        const dx = 14 * T; c.box(dx, y0 + 4, 26, 28, [30, 24, 44], [90, 80, 110]); c.line(dx, y0 + 8, dx + 26, y0 + 28, [240, 210, 70], 2); c.line(dx + 26, y0 + 8, dx, y0 + 28, [240, 210, 70], 2);
        for (let i = 0; i < 26; i++) { const x = (p.left + p.hash(i, 1, 31) * 15.5) * T, y = (p.top + p.hash(i, 2, 31) * 9.4) * T; if (i % 3 === 0) c.box(x, y, 6, 5, [210, 204, 190], [120, 110, 110]); else if (i % 3 === 1) c.line(x, y, x + 6, y + 3, [60, 44, 80], 1); else c.rect(x, y, 3, 2, [150, 130, 170]); }
        for (const [x, y] of [[4, 8], [13, 7], [9, 10], [3, 12], [16, 9]]) { const cx = x * T + 8, cy = y * T + 6; c.ellipse(cx, cy + 3, 8, 6, [150, 110, 250, 50]); c.ellipse(cx, cy, 3, 5, [170, 130, 255]); c.ellipse(cx, cy + 1, 1.5, 3, [236, 226, 255]); }
        ring(c, 15 * T + 8, 7 * T + 10, 20, 14, [170, 130, 255]);
      });
      p.decor("rFridge", 1, 2); p.decor("rGoods", 4, 2); p.decor("rGoods", 9, 2); p.decor("rFridge", 11, 2);
      for (const [x, y] of [[2, 5], [5, 5], [2, 9], [12, 5], [12, 11], [5, 11]]) p.decor("rAisle", x, y, { optional: true });
      const B = [150, 120, 96];
      for (const [x, y] of [[8, 5], [10, 6], [16, 5], [4, 8], [14, 9], [1, 12], [16, 13]]) crate(p, x, y, (x + y) % 2 ? B : sh(B, 0.8));
      counter(p, 6, 13, 2, 1, [110, 96, 120]);
    },
  },
  // Aether House: the children's home, beds along the back and a play rug.
  AlolaAetherHouse: {
    theme: { room: "house", top: 4 },
    plan(p) {
      p.paint(0.1, (c) => { const x = 8 * T + 8, y = 2 * T + 6; c.poly([[x + 16, y], [x + 30, y + 10], [x + 16, y + 20], [x + 2, y + 10]], [240, 200, 90]); c.poly([[x + 16, y + 4], [x + 24, y + 10], [x + 16, y + 16], [x + 8, y + 10]], [250, 250, 250]); });
      p.decor("rBooks", 5, 2); p.decor("rWindow", 12, 2);
      bed(p, 1, 4, [240, 150, 170]); bed(p, 3, 4, [120, 180, 240]); bed(p, 14, 4, [150, 210, 140]); bed(p, 16, 4, [240, 210, 110]);
      carpet(p, 6, 6, 7, 4, [230, 200, 130]);
      p.decor("rTable", 1, 9); p.decor("rTV", 13, 8, { optional: true }); p.decor("rPlant", 16, 12); p.decor("rPot", 16, 8, { optional: true });
      crate(p, 12, 11, [230, 110, 160]); crate(p, 13, 11, [110, 190, 230]); crate(p, 13, 12, [240, 200, 90]);
    },
  },
  // The Shady House: Guzma's room, his throne among crates of loot, Team Skull's mark on the wall.
  AlolaShadyHouse: {
    theme: { room: "arena", floor: "darkpave", wall: null, top: 4 },
    plan(p) {
      wallPanel(p, [72, 62, 88], (c, x0, y0, w) => { const cx = x0 + w / 2, W = [240, 240, 244]; c.ellipse(cx, y0 + 12, 12, 10, W); c.rect(cx - 6, y0 + 18, 12, 7, W); c.ellipse(cx - 5, y0 + 12, 3, 4, [30, 26, 40]); c.ellipse(cx + 5, y0 + 12, 3, 4, [30, 26, 40]); for (let i = 0; i < 3; i++) c.rect(cx - 5 + i * 4, y0 + 20, 1, 5, [30, 26, 40]); c.line(cx - 22, y0 + 4, cx + 22, y0 + 24, W, 2); c.line(cx + 22, y0 + 4, cx - 22, y0 + 24, W, 2); for (const x of [x0 + 28, x0 + w - 60]) { c.box(x, y0 + 5, 30, 20, [26, 30, 56], [110, 100, 120]); c.line(x + 4, y0 + 22, x + 14, y0 + 8, [200, 210, 230], 1); c.line(x + 14, y0 + 8, x + 20, y0 + 18, [200, 210, 230], 1); c.line(x + 20, y0 + 18, x + 27, y0 + 7, [200, 210, 230], 1); } c.line(x0 + 8, y0 + 26, x0 + 22, y0 + 6, [230, 110, 200], 2); c.line(x0 + w - 12, y0 + 24, x0 + w - 22, y0 + 8, [120, 220, 230], 2); });
      carpet(p, 7, 5, 5, 8, [96, 60, 140]);
      p.paint(0.2, (c) => { for (const [x, y, w2, h2] of [[7.4, 9, 12, 5], [10.6, 7, 14, 4], [8.2, 11.6, 9, 6], [11, 10.4, 8, 5]]) c.rect(x * T, y * T, w2, h2, [50, 46, 70]); for (const [x, y] of [[3, 7], [14, 10], [4, 11]]) { c.line(x * T, y * T, x * T + 14, y * T + 12, [230, 110, 200, 200], 2); c.line(x * T + 14, y * T, x * T, y * T + 12, [230, 110, 200, 200], 2); } });
      throne(p, 9, 5, [110, 80, 170]);
      const B = [150, 116, 84], Gd = [220, 180, 70];
      for (const [x, y, col] of [[7, 4, B], [8, 4, Gd], [10, 4, B], [11, 4, B], [7, 5, Gd], [11, 5, B], [12, 4, Gd], [6, 4, B]]) crate(p, x, y, col);
      p.decor("barrels", 1, 4, { optional: true }); p.decor("barrels", 2, 4, { optional: true }); p.decor("barrels", 16, 8, { optional: true });
      for (const [x, y] of [[3, 12], [14, 5], [1, 8], [15, 12], [16, 4]]) rock(p, x, y, [120, 112, 130]);
      bed(p, 15, 6 - 2 + 2, [90, 80, 110]);
    },
  },
  // Aether Paradise's laboratory: Lusamine among her rows of specimen capsules.
  AlolaAetherLab: {
    theme: { room: "lab", top: 4 },
    plan(p) {
      wallPanel(p, [226, 228, 236], (c, x0, y0, w) => { const x = x0 + w / 2; c.poly([[x, y0 + 4], [x + 14, y0 + 14], [x, y0 + 24], [x - 14, y0 + 14]], [240, 200, 90]); c.poly([[x, y0 + 8], [x + 8, y0 + 14], [x, y0 + 20], [x - 8, y0 + 14]], [250, 250, 250]); c.rect(x0, y0 + 27, w, 5, [240, 200, 90]); });
      carpet(p, 8, 5, 3, 7, [240, 232, 200]);
      p.paint(0.2, (c) => ring(c, 9 * T + 8, 7 * T + 10, 30, 20, [240, 200, 90]));
      const cols = [[240, 150, 170], [120, 180, 240], [240, 210, 110], [150, 210, 140], [180, 130, 230], [240, 150, 90]];
      [2, 4, 6, 11, 13, 15].forEach((x, i) => tank(p, x, 4, cols[i]));
      [[1, 8], [16, 8], [1, 11], [16, 11], [4, 8], [13, 8]].forEach(([x, y], i) => tank(p, x, y, cols[(i + 3) % 6]));
      p.decor("rLabTable", 2, 12, { optional: true }); p.decor("rLabTable", 11, 12, { optional: true });
    },
  },
  // ------------------------------------------------------------ the League's rest room, postgame rooms
  AlolaLeagueRest: {
    theme: { room: "center", top: 5 },
    plan(p) {
      p.decor("rDesk", 6, 3); p.decor("rBooks", 1, 3); p.decor("rPC", 15, 3); p.decor("rPlant", 1, 5); p.decor("rPlant", 16, 5); p.decor("rSeats", 2, 10); p.decor("rSeats", 13, 10);
      carpet(p, 8, 9, 3, 3, [70, 110, 190]);
    },
  },
  // The Battle Tree: a hall inside the great trunk, roots at its edges, the reception counter.
  AlolaBattleTree: {
    theme: { room: "arena", floor: "deck", wall: null, top: 4 },
    plan(p) {
      const Bk = [124, 86, 56];
      rockWall(p, Bk);
      p.paint(0.1, (c) => { const y0 = 2 * T, G = [60, 150, 80]; for (let i = 0; i < 40; i++) { const x = T + p.hash(i, 1, 17) * 16 * T, y = y0 + p.hash(i, 2, 17) * 10; c.ellipse(x, y, 5, 3, i % 3 ? G : sh(G, 1.3)); } for (const x of [3, 8, 14]) { c.line(x * T, y0, x * T + 4, y0 + 30, sh(G, 0.7), 2); c.ellipse(x * T + 4, y0 + 26, 3, 2, G); } ring(c, 9 * T + 8, 10 * T, 54, 34, [90, 170, 100]); emblem(c, 9 * T + 8, 10 * T, 16, "ball"); });
      mound(p, 1, 4, 2, 2, Bk); mound(p, 15, 4, 2, 2, Bk); mound(p, 1, 11, 2, 2, Bk); mound(p, 15, 11, 2, 2, Bk);
      counter(p, 6, 5, 6, 1, [160, 116, 70]);
      for (const [x, y] of [[3, 5], [14, 5], [1, 8], [16, 8], [4, 12], [13, 12], [5, 4], [12, 4]]) fern(p, x, y, [60, 150, 80]);
    },
  },
  // Team Rainbow Rocket's castle hall: black glass and red light, the red runner, Archie's sea painting and Maxie's volcano on the wall.
  AlolaRRBase: {
    theme: { room: "arena", floor: "darkpave", wall: null, top: 6 },
    plan(p) {
      rrFloor(p);
      wallPanel(p, [44, 26, 36], (c, x0, y0, w) => {
        for (let y = y0 + 6; y < y0 + 26; y += 6) c.rect(x0, y, w, 1, [30, 16, 24]);
        const R = [[226, 60, 60], [240, 150, 50], [240, 220, 70], [90, 190, 90], [70, 130, 230], [150, 90, 210]]; R.forEach((col, i) => c.rect(x0, y0 + 26 + i, w, 1, col));
        const G = [230, 190, 80], sea = x0 + 3 * T, vol = x0 + 15 * T + 8;
        c.box(sea, y0 + 3, 56, 21, [90, 170, 230], G); c.rect(sea + 1, y0 + 13, 54, 10, [34, 90, 180]); c.ellipse(sea + 16, y0 + 13, 11, 4, [236, 246, 255]); c.ellipse(sea + 40, y0 + 16, 10, 3, [236, 246, 255]); c.rect(sea + 6, y0 + 19, 14, 1, [120, 180, 240]);
        c.box(vol, y0 + 3, 56, 21, [70, 30, 34], G); c.poly([[vol + 6, y0 + 23], [vol + 24, y0 + 9], [vol + 33, y0 + 9], [vol + 51, y0 + 23]], [120, 66, 54]); c.poly([[vol + 23, y0 + 10], [vol + 28, y0 + 5], [vol + 34, y0 + 10]], [255, 190, 70]); c.rect(vol + 27, y0 + 10, 3, 11, [250, 120, 40]); c.rect(vol + 22, y0 + 15, 2, 7, [250, 120, 40]);
        for (const d of [-1, 1]) { const x = 12 * T + 8 + d * 28; c.poly([[x - 8, y0 + 2], [x + 8, y0 + 2], [x + 5 + d * 4, y0 + 26], [x - 5 + d * 4, y0 + 26]], [176, 30, 46]); c.rect(x - 1, y0 + 2, 2, 24, [110, 16, 28]); c.rect(x - 8, y0 + 2, 16, 2, G); }
        rrMark(c, x0 + 1 * T, y0 + 1); rrMark(c, x0 + 20 * T - 4, y0 + 1);
      });
      arch(p, 1, [200, 44, 54]);
      carpet(p, 11, 7, 3, 11, [170, 36, 46], 0.1);
      p.paint(0.2, (c) => { for (const [x, y] of [[4, 9], [19, 9], [4, 16], [19, 17], [7, 12]]) rrPanel(c, x, y); });
      for (const [x, y] of [[9, 7], [15, 7], [9, 16], [15, 16], [1, 7], [22, 7]]) column(p, x, y, [70, 64, 86]);
    },
  },
  // Deeper in the castle (the game's "laboratory"): the same black-and-red hall, its warp panels and the bosses' desks.
  AlolaRRLab: {
    theme: { room: "arena", floor: "darkpave", wall: null, top: 6 },
    plan(p) {
      rrFloor(p);
      wallPanel(p, [38, 30, 44], (c, x0, y0, w) => {
        for (let y = y0 + 6; y < y0 + 26; y += 6) c.rect(x0, y, w, 1, [26, 20, 32]);
        for (const x of [4, 7.5, 15.5, 19]) { const mx = x * T; c.box(mx, y0 + 5, 30, 18, [14, 30, 34], [70, 230, 160]); c.rect(mx + 3, y0 + 8, 14, 1, [150, 250, 220]); c.rect(mx + 3, y0 + 12, 22, 1, [150, 250, 220]); c.rect(mx + 3, y0 + 16, 9, 1, [250, 110, 110]); }
        c.rect(x0, y0 + 27, w, 2, [214, 40, 52]); rrMark(c, x0 + 1 * T, y0 + 1); rrMark(c, x0 + 20 * T - 4, y0 + 1);
      });
      arch(p, 1, [200, 44, 54]);
      carpet(p, 11, 7, 3, 12, [56, 48, 70], 0.1);
      p.paint(0.2, (c) => { for (const [x, y] of [[5, 14], [9, 16], [15, 16], [17, 13], [8, 9], [16, 9], [3, 18], [20, 8]]) rrPanel(c, x, y); });
      counter(p, 3, 10, 3, 1, [64, 56, 78]); counter(p, 18, 11, 3, 1, [64, 56, 78]);
      p.paint(11.1, (c) => { c.box(4 * T, 10 * T - 9, 12, 8, [20, 60, 60], [70, 230, 160]); c.box(19 * T, 11 * T - 9, 12, 8, [20, 60, 60], [70, 230, 160]); });
      for (const [x, y] of [[1, 7], [22, 7], [9, 7], [15, 7]]) column(p, x, y, [70, 64, 86]);
    },
  },
  // Giovanni's office: his desk and chair under the rainbow R, Persian statues either side.
  AlolaRRBoss: {
    theme: { room: "arena", floor: "hallFloor", wall: null, top: 5 },
    plan(p) {
      wallPanel(p, [90, 30, 40], (c, x0, y0, w) => { const cx = x0 + w / 2; c.box(cx - 20, y0 + 1, 40, 28, [30, 26, 40], [240, 200, 90]); rrMark(c, cx - 9, y0 + 3); c.rect(x0, y0 + 27, w, 2, [240, 200, 90]); });
      carpet(p, 9, 7, 4, 7, [150, 30, 44]);
      throne(p, 10, 6, [60, 50, 70]); counter(p, 8, 7, 6, 1, [110, 70, 50]);
      p.paint(8.1, (c) => { c.box(12 * T, 7 * T - 4, 9, 6, [250, 250, 250], [120, 120, 140]); c.box(8 * T + 6, 7 * T - 5, 8, 8, [226, 60, 60], [90, 30, 30]); });
      p.decor("rStatue", 3, 4); p.decor("rStatue", 17, 4); p.decor("rShelf", 1, 3); p.decor("rShelf", 19, 3); p.decor("rShelf", 6, 3, { optional: true }); p.decor("rShelf", 14, 3, { optional: true });
      for (const [x, y] of [[5, 9], [16, 9], [5, 13], [16, 13]]) column(p, x, y, [96, 90, 116]);
      p.decor("rPlant", 1, 13, { optional: true }); p.decor("rPlant", 20, 13, { optional: true });
    },
  },
  // The Ultra Beast research station: a containment pad under each Beast, consoles along the wall.
  AlolaBeastStation: {
    theme: { room: "arena", floor: "steel", wall: null, top: 4 },
    plan(p) {
      wallPanel(p, [70, 80, 110], (c, x0, y0, w) => { for (let i = 0; i < 5; i++) { const mx = x0 + 4 * T + 6 + i * 36; c.box(mx, y0 + 5, 30, 18, [20, 30, 60], [150, 160, 190]); c.ellipse(mx + 15, y0 + 14, 9, 6, [90, 60, 200]); c.ellipse(mx + 15, y0 + 14, 5, 3, [150, 220, 255]); } });
      p.paint(0.2, (c) => { const cols = [[240, 240, 250], [240, 110, 110], [250, 230, 110], [120, 220, 150], [240, 170, 90], [150, 150, 250], [200, 120, 240]]; p.people.filter((q) => /beast-\d/.test(q.script)).forEach((q, i) => { const cx = q.x * T + 8, cy = q.y * T + 9; c.ellipse(cx, cy, 15, 11, [40, 44, 70]); c.ellipse(cx, cy, 13, 9, sh(cols[i % 7], 0.6)); c.ellipse(cx, cy, 13, 9, cols[i % 7], 2); c.ellipse(cx, cy, 6, 4, [240, 250, 255, 150]); }); for (let x = 5; x <= 15; x += 3) c.rect(x * T + 8, 5 * T, 1, 7 * T, [70, 80, 110, 140]); c.rect(4 * T, 8 * T + 8, 11 * T, 1, [70, 80, 110, 140]); });
      p.decor("rMachine", 1, 2); p.decor("rShelf", 15, 2, { optional: true }); p.decor("rLabTable", 2, 8, { optional: true }); p.decor("rStack", 1, 11, { optional: true });
      tank(p, 16, 9, [150, 220, 255]); tank(p, 4, 12, [240, 110, 110]); crate(p, 16, 7, [150, 156, 170]); crate(p, 12, 12, [150, 156, 170]);
    },
  },

  // ------------------------------------------------------------ caves
  // Resolution Cave: a passage winding down from the meadow to a deep chamber with a pool and the drop below.
  AlolaResolutionCave: {
    theme: { density: 0, groves: 0 },
    plan(p) {
      const floor = anyOf([inDisc(19.5, 27, 4.6, 3.6), nearSeg(19.5, 26, 19.5, 17, 1.7), inDisc(19.5, 17.5, 3.2), nearSeg(19, 17, 13, 14, 1.7), inDisc(12.5, 13.5, 5.6, 4.6), nearSeg(20, 17, 27, 12, 1.7), inDisc(28, 10, 6, 5), nearSeg(12, 13, 10, 6, 1.5), inDisc(9.5, 5.5, 3.6, 2.6), nearSeg(28, 14, 29.5, 22, 1.5), inDisc(29.5, 23.5, 3.6, 3)]);
      const R = [118, 102, 96];
      cave(p, (x, y) => x < 2 || y < 2 || x > 35 || y > 30 || !floor(x + 0.5, y + 0.5), R);
      mouth(p, 0, false);
      p.disc("water", 29, 8.5, 3, 1.9); p.disc("gravel", 12.5, 13.5, 3.4, 2.6);
      p.paint(0.2, (c) => {
        const hx = 30 * T, hy = 24 * T; c.ellipse(hx, hy, 22, 14, [60, 50, 50]); c.ellipse(hx, hy + 1, 18, 11, [10, 8, 14]); c.rect(hx - 4, hy - 12, 2, 16, [150, 110, 70]); c.rect(hx + 3, hy - 12, 2, 16, [150, 110, 70]); for (let i = 0; i < 4; i++) c.rect(hx - 4, hy - 10 + i * 4, 9, 1, [150, 110, 70]);
        for (let i = 0; i < 14; i++) { const x = (9 + p.hash(i, 1, 41) * 7) * T, y = (11 + p.hash(i, 2, 41) * 5) * T; c.ellipse(x, y, 2.5, 1.5, i % 2 ? [250, 170, 200] : [255, 210, 225]); }
      });
      p.block(29, 23, 2, 2);
      for (const [x, y, col] of [[24, 8, [150, 230, 255]], [32, 12, [150, 230, 255]], [8, 5, [200, 160, 250]], [11, 4, [200, 160, 250]], [27, 22, [150, 230, 255]], [32, 6, [200, 160, 250]]]) crystal(p, x, y, col);
      for (const [x, y, h] of [[16, 25, 30], [23, 25, 26], [9, 12, 30], [16, 11, 26], [24, 12, 30], [31, 14, 26], [21, 19, 24], [17, 20, 24]]) spire(p, x, y, R, h);
      for (const [x, y] of [[22, 28], [17, 29], [9, 16], [15, 16], [25, 6], [26, 13], [31, 21], [7, 6]]) rock(p, x, y, R);
    },
  },
  // Mount Lanakila's cave: frost on the floor, a frozen pond and ice crystals on the climb to the League.
  AlolaLanakilaCave: {
    theme: { density: 0, groves: 0, ground: "drift", grass: "drift" },
    plan(p) {
      const floor = anyOf([inDisc(19.5, 26.5, 5, 4), nearSeg(19, 25, 15.5, 13, 2.1), inDisc(15, 12.5, 6, 5), nearSeg(15, 12, 26, 8, 1.9), inDisc(27.5, 8, 5.4, 4), nearSeg(28, 9, 29.5, 19, 1.7), inDisc(29.5, 20.5, 4, 3.4), nearSeg(11, 12, 6.5, 20, 1.6), inDisc(6.5, 21.5, 3.4, 3)]);
      const I = [150, 178, 214];
      cave(p, (x, y) => x < 2 || y < 2 || x > 35 || y > 30 || !floor(x + 0.5, y + 0.5), I);
      mouth(p, 0, false, [230, 240, 255]);
      for (const [x, y, r] of [[13, 10, 3], [28, 20.5, 2.6], [20.5, 27, 3], [6.5, 21.5, 2.2], [24, 8, 2]]) p.disc("snow", x, y, r, r * 0.8);
      p.disc("water", 28.5, 7, 2.8, 1.7);
      p.paint(0.2, (c) => { const cx = 28.5 * T, cy = 7 * T; c.ellipse(cx, cy, 2.9 * T, 1.9 * T, [200, 230, 250]); c.ellipse(cx, cy, 2.9 * T, 1.9 * T, [240, 250, 255], 2); for (const [a, b, d] of [[-30, -8, 16], [-4, 4, 20], [14, -10, 12], [-18, 10, 10]]) { c.line(cx + a, cy + b, cx + a + d, cy + b - d / 3, [250, 252, 255], 1); c.line(cx + a + 2, cy + b + 3, cx + a + d - 2, cy + b + 3 - d / 3, [160, 200, 236], 1); } });
      const ICE = [170, 220, 250];
      for (const [x, y] of [[11, 9], [19, 10], [12, 16], [24, 6], [31, 10], [27, 18], [32, 21], [16, 28], [23, 28], [5, 20], [8, 23], [17, 18], [20, 21]]) crystal(p, x, y, ICE);
      for (const [x, y, h] of [[10, 13, 30], [20, 14, 28], [16, 23, 26], [22, 24, 30], [25, 10, 26], [30, 16, 28]]) spire(p, x, y, [200, 224, 246], h);
      for (const [x, y] of [[18, 8], [13, 15], [26, 22], [15, 26]]) rock(p, x, y, [190, 206, 226]);
    },
  },
  // ------------------------------------------------------------ Pokemon Centers (the cafe counter on the right)
  AlolaPokeCenter: CENTER, AlolaHauoliCenter: CENTER, AlolaHeaheaCenter: CENTER, AlolaPaniolaCenter: CENTER, AlolaKonikoniCenter: CENTER, AlolaMalieCenter: CENTER, AlolaTapuCenter: CENTER, AlolaPoniCenter: CENTER, AlolaLanakilaCenter: CENTER,
};
