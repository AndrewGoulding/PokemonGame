// Galar interiors, drawn by hand: Gym stadiums, towers, houses, shrines and caves. See README.md, "Rooms".
"use strict";
const T = 16;
const WHITE = [244, 244, 250], INK = [40, 38, 52], SKIN = [240, 208, 176];
const A = (col, a) => [col[0], col[1], col[2], a];
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));

// ---------------------------------------------------------------- shared pieces (pixels unless said otherwise)
// A tiered stand full of spectators over tiles x0..x1, y0..y1; `cols` are the shirt colours.
function stand(p, c, x0, y0, x1, y1, cols, seed = 1) {
  const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T;
  c.rect(X, Y, W, H, [40, 42, 58]);
  for (let r = 0; r * 8 + 8 <= H - 6; r++) {
    const y = Y + r * 8;
    c.rect(X, y, W, 8, r & 1 ? [62, 64, 86] : [52, 54, 74]); c.rect(X, y + 7, W, 1, [34, 36, 50]);
    for (let x = X + 2 + (r & 1) * 3; x < X + W - 5; x += 6) {
      if (p.hash(x, y, seed) < 0.1) continue;
      c.rect(x, y + 3, 4, 4, cols[Math.floor(p.hash(x, y, seed + 1) * cols.length) % cols.length]); c.rect(x + 1, y + 1, 2, 2, SKIN);
    }
  }
  c.rect(X, Y + H - 6, W, 6, [196, 198, 212]); c.rect(X, Y + H - 6, W, 1, WHITE); c.rect(X, Y + H - 1, W, 1, [96, 98, 118]);
}
// Advertising boards along the foot of a stand (one tile row).
function boards(c, x0, x1, y, cols) {
  for (let x = x0; x <= x1; x += 2) { const col = cols[((x - x0) >> 1) % cols.length]; c.box(x * T, y * T + 4, Math.min(2, x1 - x + 1) * T, 11, col, INK); c.rect(x * T + 5, y * T + 8, Math.min(2, x1 - x + 1) * T - 10, 3, A(WHITE, 200)); }
}
// A lined battle court over tiles x0..x1, y0..y1 with a Poké Ball at its centre.
function court(c, x0, y0, x1, y1, hue, line = WHITE, double = false) {
  const X = x0 * T + 3, Y = y0 * T + 3, W = (x1 - x0 + 1) * T - 6, H = (y1 - y0 + 1) * T - 6, cx = X + W / 2, cy = Y + H / 2, L = A(line, 215);
  c.rect(X, Y, W, 2, L); c.rect(X, Y + H - 2, W, 2, L); c.rect(X, Y, 2, H, L); c.rect(X + W - 2, Y, 2, H, L); c.rect(X, cy - 1, W, 2, L);
  c.ellipse(cx, cy, 24, 24, L, 3); c.ellipse(cx, cy, 9, 9, L); c.ellipse(cx, cy, 5, 5, hue);
  for (const sy of [Y + H * 0.2, Y + H * 0.8]) for (const sx of double ? [cx - W * 0.22, cx + W * 0.22] : [cx]) { c.rect(sx - 12, sy - 6, 24, 2, L); c.rect(sx - 12, sy + 4, 24, 2, L); c.rect(sx - 12, sy - 6, 2, 12, L); c.rect(sx + 10, sy - 6, 2, 12, L); }
}
function frame(c, x, y, w, h, col, t = 1) { c.rect(x, y, w, t, col); c.rect(x, y + h - t, w, t, col); c.rect(x, y + t, t, h - 2 * t, col); c.rect(x + w - t, y + t, t, h - 2 * t, col); }
function glow(c, cx, cy, r, col, a = 34) { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); }
// A hanging pennant.
function banner(c, x, y, w, h, col, mark = WHITE) {
  c.rect(x - 1, y - 2, w + 2, 3, [70, 60, 50]); c.rect(x, y, w, h - 5, col); c.poly([[x, y + h - 5], [x + w, y + h - 5], [x + w / 2, y + h]], col);
  c.rect(x, y, 2, h - 5, mix(col, [0, 0, 0], 0.25)); c.ellipse(x + w / 2, y + (h - 5) / 2, w / 4, w / 4, mark);
}
function flame(c, x, y, s = 1) { c.poly([[x - 5 * s, y], [x + 5 * s, y], [x + 3 * s, y - 7 * s], [x, y - 14 * s], [x - 3 * s, y - 7 * s]], [236, 96, 40]); c.poly([[x - 3 * s, y], [x + 3 * s, y], [x, y - 9 * s]], [250, 200, 70]); c.rect(x - 1, y - 3 * s, 2, 3 * s, [255, 244, 190]); }
// A wooden rail fence along a tile row (x0..x1) or column.
function fenceH(c, x0, x1, y) { const Y = y * T; for (let x = x0; x <= x1; x++) { c.rect(x * T, Y + 5, T, 2, [150, 108, 62]); c.rect(x * T, Y + 10, T, 2, [150, 108, 62]); c.rect(x * T, Y + 7, T, 1, [96, 66, 40]); c.rect(x * T, Y + 12, T, 1, [96, 66, 40]); c.box(x * T + 6, Y + 1, 4, 14, [180, 134, 80], [86, 58, 36]); } }
function fenceV(c, x, y0, y1) { for (let y = y0; y <= y1; y++) { c.rect(x * T + 6, y * T, 4, T, [150, 108, 62]); c.rect(x * T + 10, y * T, 1, T, [96, 66, 40]); c.box(x * T + 5, y * T + 2, 6, 5, [180, 134, 80], [86, 58, 36]); } }
function bale(c, x, y) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 60]); c.box(X + 1, Y + 1, 14, 13, [226, 190, 96], [130, 96, 40]); for (let k = 3; k < 13; k += 3) c.rect(X + 2, Y + k, 12, 1, [190, 150, 66]); c.rect(X + 4, Y + 1, 2, 13, [150, 70, 50]); c.rect(X + 10, Y + 1, 2, 13, [150, 70, 50]); }
function wooloo(c, x, y) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 60]); c.ellipse(X + 8, Y + 8, 7, 6, [120, 120, 130]); c.ellipse(X + 8, Y + 8, 6, 5, [246, 246, 240]); c.ellipse(X + 5, Y + 6, 2, 2, WHITE); c.rect(X + 6, Y + 8, 4, 4, [60, 56, 60]); c.p(X + 6, Y + 9, WHITE); c.p(X + 9, Y + 9, WHITE); c.rect(X + 4, Y + 5, 2, 3, [90, 84, 80]); c.rect(X + 10, Y + 5, 2, 3, [90, 84, 80]); }
// A glowing mushroom, cap drawn on the walk-behind layer.
function mushroom(c, top, x, y, col, big = 1) {
  const X = x * T + 8, Y = y * T + 14; glow(c, X, Y - 6, 20 * big, col, 28);
  c.ellipse(X, Y, 6, 2, [0, 0, 0, 70]); c.rect(X - 2, Y - 10 * big, 4, 10 * big, [226, 220, 236]); c.rect(X + 1, Y - 10 * big, 1, 10 * big, [170, 164, 190]);
  top.ellipse(X, Y - 10 * big, 8 * big, 5 * big, mix(col, [0, 0, 0], 0.3)); top.ellipse(X, Y - 10 * big - 1, 7 * big, 4 * big, col); top.ellipse(X - 3 * big, Y - 11 * big, 2, 1, WHITE); top.ellipse(X + 2 * big, Y - 12 * big, 1, 1, WHITE);
}
function crystal(c, x, y, col, s = 1) { c.poly([[x - 5 * s, y], [x - 3 * s, y - 9 * s], [x, y - 14 * s], [x + 3 * s, y - 8 * s], [x + 5 * s, y]], mix(col, [0, 0, 0], 0.25)); c.poly([[x - 3 * s, y], [x - 1 * s, y - 9 * s], [x, y - 13 * s], [x + 1 * s, y - 4 * s]], col); c.line(x - 1, y - 10 * s, x - 2 * s, y - 2, mix(col, WHITE, 0.6)); }
// A plain stone/wood back wall over tiles x0..x1, rows y0..y1 (used where the room's own wall is replaced).
function backWall(c, x0, y0, x1, y1, col, dark) {
  c.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T, col); c.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, 3, mix(col, WHITE, 0.3)); c.rect(x0 * T, (y1 + 1) * T - 4, (x1 - x0 + 1) * T, 4, dark);
}
// Paint over floor tiles x0..x1 of row y, leaving the exit mat (at the door tile mx, my) showing.
function floorRow(c, x0, x1, y, col, mx = 12, my = 19) { if (y !== my) { c.rect(x0 * T, y * T, (x1 - x0 + 1) * T, T, col); return; } c.rect(x0 * T, y * T, (mx - x0) * T - 8, T, col); c.rect((mx + 1) * T + 8, y * T, (x1 - mx) * T - 8, T, col); }
function rug(c, x0, y0, x1, y1, col, trim) { c.box(x0 * T + 2, y0 * T + 2, (x1 - x0 + 1) * T - 4, (y1 - y0 + 1) * T - 4, col, trim); c.box(x0 * T + 5, y0 * T + 5, (x1 - x0 + 1) * T - 10, (y1 - y0 + 1) * T - 10, col, mix(col, WHITE, 0.4)); }

// ---------------------------------------------------------------- Gym stadiums
const PLANS = {};

// Motostoke Stadium: Kabu's Fire Gym mission arena (compared with Pokéarth's Gym picture). A round of grass inside a
// red running track: the red disc with Kabu's flame mark in the middle, lines of cones, tall grass banked round the
// edges for the catching mission, and the scoreboard at the back.
PLANS.GalarMotostokeStadium = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    const cones = [[6, 9], [6, 11], [6, 13], [6, 15], [7, 17], [17, 9], [17, 11], [17, 13], [17, 15], [16, 17], [9, 9], [14, 9]];
    p.fill("lawn", 2, 8, 21, 18);
    p.fill("tallgrass", 2, 9, 4, 17); p.fill("tallgrass", 19, 9, 21, 16); p.fill("tallgrass", 7, 8, 9, 8); p.fill("tallgrass", 15, 8, 17, 8);
    p.block(11, 7, 3, 1);
    for (const [x, y] of cones) p.block(x, y, 1, 1);
    const RED = [206, 60, 44], OR = [240, 140, 50];
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[226, 70, 50], [240, 150, 50], WHITE, [200, 50, 60], [250, 210, 90]], 3); boards(c, 1, 22, 6, [[214, 70, 44], [250, 190, 70], [60, 60, 76]]);
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, [214, 60, 40], [250, 200, 70]);
      // The running track round the grass.
      for (let y = 7; y <= 19; y++) { if (y === 7 || y === 19) floorRow(c, 1, 22, y, RED); else { c.rect(T, y * T, T, T, RED); c.rect(22 * T, y * T, T, T, RED); } }
      for (let k = 0; k < 8; k++) { c.ellipse((3 + k * 2.6) * T, 7 * T + 8, 14, 5, A(OR, 150), 2); if (k !== 3 && k !== 4) c.ellipse((3 + k * 2.6) * T, 19 * T + 8, 14, 5, A(OR, 150), 2); }
      for (let k = 0; k < 5; k++) for (const x of [1, 22]) c.ellipse(x * T + 8, (9 + k * 2.2) * T, 5, 13, A(OR, 150), 2);
      frame(c, 2 * T - 2, 8 * T - 2, 20 * T + 4, 11 * T + 4, WHITE, 2);
      // Kabu's mark.
      const X = 12 * T, Y = 13 * T + 8;
      c.ellipse(X, Y, 4.6 * T, 3.2 * T, WHITE); c.ellipse(X, Y, 4.6 * T - 3, 3.2 * T - 3, RED);
      for (const s of [-1, 1]) { c.ellipse(X + s * 30, Y - 4, 22, 14, OR, 4); c.ellipse(X + s * 22, Y + 14, 18, 10, OR, 4); c.line(X + s * 8, Y - 26, X + s * 26, Y - 36, OR, 4); c.line(X + s * 46, Y + 18, X + s * 60, Y + 8, OR, 4); }
      c.poly([[X - 9, Y + 22], [X + 9, Y + 22], [X + 6, Y - 4], [X, Y - 30], [X - 6, Y - 4]], OR); c.poly([[X - 4, Y + 20], [X + 4, Y + 20], [X, Y - 12]], RED);
    });
    // The scoreboard.
    p.paint(8, (c, top) => { const X = 11 * T, Y = 7 * T; c.rect(X + 3, Y - 20, 3, 34, [120, 120, 130]); c.rect(X + 3 * T - 6, Y - 20, 3, 34, [120, 120, 130]); c.box(X - 2, Y - 26, 3 * T + 4, 30, [70, 66, 70], INK); c.rect(X, Y - 24, 3 * T, 4, [110, 104, 104]); for (let r = 0; r < 2; r++) for (let k = 0; k < 8; k++) c.rect(X + 3 + k * 5.5, Y - 16 + r * 9, 4, 6, k === 3 || k === 4 ? [70, 66, 70] : [250, 230, 150]); });
    for (const [x, y] of cones) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T; c.ellipse(X, Y + 14, 6, 2, [0, 0, 0, 70]); c.poly([[X - 5, Y + 13], [X + 5, Y + 13], [X + 1, Y + 1], [X - 1, Y + 1]], [236, 96, 40]); c.rect(X - 2, Y + 6, 4, 2, [250, 190, 120]); c.rect(X - 6, Y + 13, 12, 2, [200, 70, 30]); });
  },
};

// Turffield Stadium: Milo's Grass Gym (compared with Pokéarth's Gym picture). The Wooloo-herding course runs straight
// up the middle: three pastures walled in mossy dry stone, a worn earth lane through a gate in each wall, flocks of
// Wooloo on the lane and hay bales to the sides; the pitch is at the top.
PLANS.GalarTurffieldStadium = {
  theme: { room: "arena", floor: "grass", wall: null, top: 6, bottom: 31 },
  plan(p) {
    const walls = [16, 21, 26], bales = [[5, 18], [6, 18], [28, 19], [9, 23], [29, 23], [30, 23], [4, 29], [5, 29], [26, 28], [27, 28], [31, 30]];
    const sheep = [[15, 29], [16, 28], [20, 28], [21, 29], [14, 27], [22, 27], [15, 23], [16, 24], [20, 23], [21, 24], [19, 24], [15, 18], [16, 19], [20, 18], [21, 19], [14, 19]];
    p.fill("lawn", 7, 8, 28, 14);
    p.fill("dirt", 17, 15, 18, 31); p.fill("dirt", 16, 27, 19, 30); p.fill("dirt", 16, 22, 19, 24); p.fill("dirt", 16, 17, 19, 19);
    for (const y of walls) { p.block(1, y, 16, 1); p.block(19, y, 16, 1); }
    p.block(1, 17, 1, 15); p.block(34, 17, 1, 15);
    for (const [x, y] of [...bales, ...sheep]) p.block(x, y, 1, 1);
    const ST = [128, 134, 122], ST2 = [92, 98, 92], MOSS = [96, 150, 84];
    const wall = (c, x0, x1, y) => { for (let x = x0; x <= x1; x++) { const X = x * T, Y = y * T; c.box(X, Y + 1, T, 14, ST2, [60, 64, 62]); for (const [dx, dy, w] of [[1, 3, 6], [8, 3, 7], [1, 9, 4], [6, 9, 5], [12, 9, 3]]) c.rect(X + dx, Y + dy, w, 4, p.hash(x * 7 + dx, y, 2) > 0.5 ? ST : [150, 156, 142]); c.rect(X, Y, T, 3, p.hash(x, y, 4) > 0.35 ? MOSS : [120, 170, 96]); } };
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 34, 4, [[90, 180, 90], [240, 220, 120], WHITE, [150, 200, 90], [226, 140, 90]], 5); boards(c, 1, 34, 5, [[70, 150, 70], [236, 206, 110], [120, 90, 60]]);
      for (let x = 7; x <= 28; x += 2) c.rect(x * T, 8 * T, T, 7 * T, [255, 255, 255, 26]);
      court(c, 7, 8, 28, 14, [90, 180, 90]);
      for (const x of [5, 12, 23, 30]) banner(c, x * T + 2, 4, 12, 22, [70, 150, 70], [250, 230, 120]);
      // Buttercups in the pastures.
      for (let k = 0; k < 90; k++) { const x = (2.5 + p.hash(k, 1, 6) * 31) * T, y = (17 + p.hash(k, 2, 6) * 14.5) * T; if (x > 15.5 * T && x < 20.5 * T) continue; c.p(x, y, [250, 230, 110]); c.p(x + 1, y + 1, WHITE); }
    });
    for (const y of walls) p.paint(y + 1, (c, top) => {
      wall(c, 1, 16, y); wall(c, 19, 34, y);
      // The gate: stone piers and the green arrow board over the lane.
      for (const x of [16, 19]) { c.box(x * T + 2, y * T - 10, 12, 26, ST, [60, 64, 62]); c.rect(x * T + 4, y * T - 8, 3, 22, [170, 176, 160]); top.rect(x * T + 1, y * T - 13, 14, 4, MOSS); }
      top.box(17 * T - 2, y * T - 14, 2 * T + 4, 9, [60, 150, 110], [34, 90, 70]); top.poly([[18 * T - 6, y * T - 7], [18 * T, y * T - 12], [18 * T + 6, y * T - 7], [18 * T + 3, y * T - 7], [18 * T, y * T - 10], [18 * T - 3, y * T - 7]], [200, 240, 200]);
    });
    for (const x of [1, 34]) p.paint(32, (c) => { for (let y = 17; y <= 31; y++) { const X = x * T, Y = y * T; c.box(X + 2, Y, 12, T, ST2, [60, 64, 62]); c.rect(X + 4, Y + 2, 8, 5, ST); c.rect(X + 4, Y + 9, 8, 5, [150, 156, 142]); c.rect(X + (x === 1 ? 11 : 2), Y, 3, T, MOSS); } });
    for (const [x, y] of bales) p.paint(y + 1, (c) => bale(c, x, y));
    for (const [x, y] of sheep) p.paint(y + 1, (c) => wooloo(c, x, y));
  },
};

// Stow-on-Side Stadium: the Gym mission's pinball ride (compared with Pokéarth's Gym picture). A floor of gold tiles
// cut by black stepped walls, hazard chevrons down both sides, red boxing-glove punchers set in the walls and the
// spinning cups you ride between them.
PLANS.GalarStowStadium = {
  theme: { room: "arena", floor: "sand", wall: null, top: 7 },
  plan(p) {
    // Black walls as [row, x0, x1].
    const rows = [[7, 1, 8], [8, 1, 8], [9, 5, 8], [10, 6, 8], [7, 15, 22], [8, 17, 22], [9, 19, 22], [10, 21, 22], [14, 8, 10], [15, 8, 11], [16, 9, 11], [18, 3, 4], [19, 3, 5], [17, 19, 20], [18, 18, 20], [13, 1, 2], [12, 19, 20]];
    const dark = new Set(); for (const [y, x0, x1] of rows) { p.fill("void", x0, y, x1, y); for (let x = x0; x <= x1; x++) dark.add(x + "," + y); }
    const gloves = [[7, 11, 0], [3, 14, 0], [18, 13, 1], [12, 15, 1], [17, 18, 2]], cups = [[11, 9], [6, 17], [16, 10]];
    for (const [x, y] of [...gloves, ...cups]) p.block(x, y, 1, 1);
    const GOLD = [240, 180, 56], GOLD2 = [232, 166, 44], PINK = [250, 190, 200];
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[236, 150, 60], [150, 100, 200], WHITE, [200, 110, 50], [110, 80, 160]], 7); boards(c, 1, 22, 6, [[226, 140, 50], [130, 90, 190], [60, 60, 76]]);
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, x % 2 ? [226, 140, 50] : [130, 90, 190], WHITE);
      // The gold tiles.
      for (let y = 7; y <= 19; y++) for (let x = 1; x <= 22; x++) { if (dark.has(x + "," + y) || (y === 19 && x >= 11 && x <= 13)) continue; const X = x * T, Y = y * T; c.rect(X, Y, T, T, ((x >> 1) + (y >> 1)) & 1 ? GOLD : GOLD2); if (!(x & 1)) c.rect(X, Y, 1, T, [250, 210, 110]); if (!(y & 1)) c.rect(X, Y, T, 1, [250, 210, 110]); }
      for (const x of [11, 13]) c.rect(x === 11 ? 11 * T : 13 * T + 8, 19 * T, 8, T, GOLD2);
      // Hazard chevrons down the sides.
      for (const x of [1, 22]) for (let y = 7; y <= 19; y++) { if (dark.has(x + "," + y)) continue; const X = x * T + (x === 1 ? 0 : 8), Y = y * T; c.rect(X, Y, 8, T, [30, 28, 34]); c.poly([[X, Y + 2], [X + 4, Y + 6], [X + 8, Y + 2], [X + 8, Y + 8], [X + 4, Y + 12], [X, Y + 8]], [250, 210, 60]); }
      // The black walls with their pale rims.
      for (const k of dark) { const [x, y] = k.split(",").map(Number), X = x * T, Y = y * T; c.rect(X, Y, T, T, [34, 30, 38]);
        if (!dark.has(x + "," + (y + 1)) && y < 19) c.rect(X, Y + T - 3, T, 3, PINK); if (!dark.has(x + "," + (y - 1)) && y > 7) c.rect(X, Y, T, 2, PINK);
        if (!dark.has((x - 1) + "," + y) && x > 1) c.rect(X, Y, 2, T, PINK); if (!dark.has((x + 1) + "," + y) && x < 22) c.rect(X + T - 2, Y, 2, T, PINK); }
    });
    // Boxing gloves on their springs: 0 punches down, 1 left, 2 up.
    for (const [x, y, d] of gloves) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T + 8; c.ellipse(X + 1, Y + 7, 8, 3, [0, 0, 0, 70]);
      if (d === 0) c.rect(X - 2, Y - 10, 4, 6, [200, 200, 212]); if (d === 1) c.rect(X + 5, Y - 2, 6, 4, [200, 200, 212]); if (d === 2) c.rect(X - 2, Y + 5, 4, 5, [200, 200, 212]);
      c.ellipse(X, Y, 8, 7, [130, 24, 24]); c.ellipse(X, Y - 1, 7, 6, [230, 60, 50]); c.ellipse(X + (d === 1 ? 4 : -5), Y + (d === 1 ? -5 : 2), 3, 3, [230, 60, 50]); c.ellipse(X - 2, Y - 3, 3, 2, [255, 150, 130]); });
    // The cups.
    for (const [x, y] of cups) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T + 8; c.ellipse(X, Y + 3, 9, 6, [0, 0, 0, 70]); c.ellipse(X, Y, 8, 7, [200, 204, 220]); c.ellipse(X, Y, 7, 6, [40, 44, 90]); c.ellipse(X, Y, 4, 3, [236, 130, 50]); c.ellipse(X, Y, 2, 1, [250, 200, 120]); c.ellipse(X, Y - 1, 7, 5, [236, 240, 250], 1); });
  },
};

// Ballonlea Stadium: Opal's Fairy Gym (compared with Pokéarth's Gym picture). A dark theatre: the stage under three
// spotlights before a painted backdrop of pink and teal toadstools hung between grey piers, a faint battle box marked
// on the boards, and the audition table in the dark stalls.
PLANS.GalarBallonleaStadium = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    p.fill("deck", 3, 8, 20, 14);
    p.block(1, 7, 1, 2); p.block(22, 7, 1, 2); p.block(8, 17, 3, 1); p.block(20, 9, 1, 1);
    const PINK = [236, 130, 170], TEAL = [90, 190, 190], PIER = [120, 114, 130];
    p.paint(0, (c) => {
      // The backdrop: three painted cloths between piers.
      c.rect(T, T, 22 * T, 6 * T, [40, 30, 50]);
      for (const [x0, w, seed] of [[3, 4, 1], [8.5, 8, 2], [18, 4, 3]]) {
        const X = x0 * T, W = w * T; c.rect(X, T, W, 6 * T - 4, [226, 150, 170]);
        for (let k = 0; k < w * 3; k++) { const x = X + 8 + p.hash(k, 1, seed) * (W - 16), y = T + 10 + p.hash(k, 2, seed) * (5 * T - 16), r = 7 + p.hash(k, 3, seed) * 9, col = k % 3 === 0 ? TEAL : k % 3 === 1 ? [246, 200, 214] : PINK; c.ellipse(x, y, r, r * 0.6, col); c.rect(x - 1, y, 3, r, mix(col, WHITE, 0.4)); }
        c.rect(X, T, W, 6, [0, 0, 0, 60]);
      }
      c.ellipse(12.5 * T, 4 * T, 26, 30, [250, 246, 250, 150]);
      for (const x of [1, 2, 7, 7.5, 16.5, 17, 22]) { c.rect(x * T, T, T, 6 * T, PIER); c.rect(x * T, T, 3, 6 * T, mix(PIER, WHITE, 0.3)); c.rect(x * T + 13, T, 3, 6 * T, mix(PIER, [0, 0, 0], 0.3)); }
      c.rect(T, 7 * T - 4, 22 * T, 4, [30, 22, 40]);
      // The spotlights.
      for (const x of [9.5, 12.5, 15.5]) { c.poly([[x * T - 5, T], [x * T + 5, T], [x * T + 26, 7 * T], [x * T - 26, 7 * T]], [220, 190, 255, 60]); c.ellipse(x * T, T + 2, 5, 3, WHITE); }
      // The house: dark stalls, the raised stage.
      for (let y = 7; y <= 19; y++) floorRow(c, 1, 22, y, [30, 24, 44, 150]);
      c.rect(3 * T, 8 * T, 18 * T, 7 * T, [70, 44, 100]); for (let y = 8; y <= 14; y++) c.rect(3 * T, y * T + 15, 18 * T, 1, [52, 32, 78]); for (let x = 3 * T + 20; x < 21 * T; x += 44) c.rect(x, 8 * T, 1, 7 * T, [52, 32, 78]);
      c.rect(3 * T, 15 * T, 18 * T, 10, [96, 90, 120]); c.rect(3 * T, 15 * T, 18 * T, 2, [150, 144, 176]); c.rect(3 * T, 15 * T + 10, 18 * T, 2, [20, 16, 30]);
      for (const x of [9.5, 12.5, 15.5]) { c.ellipse(x * T, 11 * T, 40, 26, [220, 190, 255, 34]); c.ellipse(x * T, 11 * T, 26, 16, [236, 216, 255, 40]); }
      // The battle box marked on the boards.
      const L = [236, 226, 250, 150]; frame(c, 7 * T, 10 * T, 11 * T, 4 * T, L, 1); c.rect(12.5 * T, 10 * T, 1, 4 * T, L); c.rect(9 * T, 13 * T + 8, 7 * T, 2, [236, 130, 170, 170]); c.rect(12.5 * T - 1, 14 * T + 6, 3, 3, WHITE);
    });
    // Props in the wings, the piers at the stage's corners, and the audition table.
    p.paint(10, (c, top) => { const X = 20 * T, Y = 9 * T; c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 70]); c.box(X + 1, Y, 14, 14, [120, 90, 70], INK); c.rect(X + 2, Y + 1, 12, 2, [160, 124, 96]); c.rect(X + 1, Y + 7, 14, 1, [80, 58, 46]); });
    for (const x of [1, 22]) p.paint(9, (c, top) => { c.box(x * T, 7 * T - 2, T, 2 * T, PIER, INK); c.rect(x * T + 1, 7 * T - 1, 3, 2 * T - 2, mix(PIER, WHITE, 0.3)); });
    p.paint(18, (c, top) => { const X = 8 * T, Y = 17 * T; c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 80]); c.rect(X + 3, Y + 4, 3, 10, [90, 60, 44]); c.rect(X + 42, Y + 4, 3, 10, [90, 60, 44]); c.box(X, Y - 2, 3 * T, 8, [170, 120, 80], INK); c.rect(X + 1, Y - 1, 3 * T - 2, 2, [210, 160, 110]); c.ellipse(X + 12, Y, 3, 2, WHITE); c.rect(X + 32, Y - 1, 8, 4, [240, 240, 246]); });
  },
};

// Circhester Stadium: Gordie's sandstorm pitfall field (compared with Pokéarth's Gym picture): sand strewn with
// boulders inside pale stone walls, the start a walk of six-sided slabs between two walls, steps out at the far
// end. Melony's ice (the other version's Gym) is kept as crystals in the corners.
PLANS.GalarCirchesterStadium = {
  theme: { room: "arena", floor: "desert", wall: null, top: 7 },
  plan(p) {
    const pits = [[4, 9], [5, 9], [9, 8], [10, 8], [15, 9], [19, 8], [20, 8], [7, 11], [12, 10], [17, 11], [18, 11], [3, 13], [4, 13], [9, 13], [10, 14], [19, 14], [20, 14], [6, 15], [7, 15], [17, 15], [4, 18], [20, 18], [16, 13]];
    const rocks = [[2, 10], [21, 10], [12, 12], [9, 15], [21, 16], [2, 16], [14, 15], [7, 9], [13, 8], [17, 9], [5, 12], [19, 12], [11, 10]];
    const WALL = [196, 180, 150], WALL2 = [150, 134, 108];
    p.block(6, 17, 5, 1); p.block(10, 18, 1, 2); p.block(14, 17, 5, 1); p.block(14, 18, 1, 2);
    for (const [x, y] of [...pits, ...rocks]) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[150, 200, 236], [200, 170, 120], WHITE, [110, 150, 200], [170, 130, 90]], 11); boards(c, 1, 22, 6, [[110, 170, 220], [190, 150, 100], [60, 60, 76]]);
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, x % 2 ? [110, 170, 220] : [170, 130, 90], WHITE);
      // The stone surround and the steps out at the far end.
      c.rect(T, 7 * T, 22 * T, T, WALL); c.rect(T, 7 * T + 12, 22 * T, 4, WALL2); for (const x of [1, 22]) { c.rect(x * T, 8 * T, T, 12 * T, WALL); c.rect(x === 1 ? 2 * T - 3 : 22 * T, 8 * T, 3, 12 * T, WALL2); }
      c.rect(11 * T, 6 * T, 3 * T, 2 * T, [176, 160, 132]); for (let y = 6 * T + 3; y < 8 * T; y += 5) c.rect(11 * T, y, 3 * T, 1, [124, 110, 90]); c.rect(11 * T, 6 * T, 2, 2 * T, WALL2); c.rect(14 * T - 2, 6 * T, 2, 2 * T, WALL2);
      // The slabs at the start.
      for (let r = 0; r < 5; r++) for (let k = 0; k < 2; k++) { const X = 11 * T + 12 + k * 24 + (r & 1 ? -12 : 0), Y = 17 * T + 6 + r * 9; if (Y > 19 * T - 2) continue; c.poly([[X - 10, Y], [X - 5, Y - 5], [X + 5, Y - 5], [X + 10, Y], [X + 5, Y + 5], [X - 5, Y + 5]], [120, 110, 96]); c.poly([[X - 8, Y], [X - 4, Y - 4], [X + 4, Y - 4], [X + 8, Y], [X + 4, Y + 3], [X - 4, Y + 3]], [214, 206, 190]); }
      for (const [x, y] of pits) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 8, 8, 7, [150, 112, 70]); c.ellipse(X + 8, Y + 9, 7, 6, [60, 40, 30]); c.ellipse(X + 8, Y + 10, 5, 4, [24, 16, 16]); }
    });
    for (const [x, y] of rocks) p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.poly([[X + 1, Y + 13], [X + 3, Y + 3], [X + 9, Y], [X + 14, Y + 5], [X + 15, Y + 13]], [110, 86, 70]); c.poly([[X + 3, Y + 12], [X + 4, Y + 4], [X + 9, Y + 1], [X + 10, Y + 8]], [176, 146, 116]); c.rect(X + 5, Y + 2, 5, 2, WHITE); });
    // The two walls that fence the start.
    p.paint(20, (c, top) => { for (const [x0, w, vx] of [[6, 5, 10], [14, 5, 14]]) { top.box(x0 * T, 17 * T - 8, w * T, 10, WALL, [96, 84, 66]); c.box(x0 * T, 17 * T + 2, w * T, 14, WALL2, [96, 84, 66]); c.box(vx * T, 18 * T, T, 2 * T, WALL2, [96, 84, 66]); c.rect(vx * T + 2, 17 * T - 6, 12, 2 * T + 18, WALL); c.rect(vx * T + 2, 19 * T + 10, 12, 5, WALL2); } });
    for (const [x, y] of [[1, 8], [22, 8], [1, 19], [22, 19]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { crystal(c, x * T + 5, y * T + 15, [170, 220, 250], 1); crystal(c, x * T + 11, y * T + 15, [210, 240, 255], 0.7); }); }
    // The sandstorm, blowing over everything.
    p.paint(99, (c, top) => { for (let k = 0; k < 70; k++) { const x = (2 + p.hash(k, 3, 5) * 19) * T, y = (8 + p.hash(k, 4, 5) * 11.5) * T, w = 10 + p.hash(k, 5, 5) * 22; top.rect(x, y, w, 1, [250, 240, 210, 70]); } });
  },
};

// Spikemuth Gym: Piers's back-alley stage. No pitch: shutters, neon, amps and a spray-painted battle box.
PLANS.GalarSpikemuthGym = {
  theme: { room: "arena", floor: "neon", wall: null, top: 6, bottom: 14 },
  plan(p) {
    p.block(5, 6, 8, 2); p.block(1, 6, 2, 1); p.block(15, 6, 2, 1);
    for (const y of [9, 10, 11]) { p.block(1, y, 1, 1); p.block(16, y, 1, 1); }
    p.paint(0, (c) => {
      // Shuttered shop fronts along the back.
      c.rect(T, T, 16 * T, 5 * T, [38, 34, 50]);
      for (let k = 0; k < 4; k++) { const X = T + k * 4 * T + 3, col = [[110, 110, 124], [96, 104, 120], [120, 110, 116], [100, 100, 116]][k]; c.box(X, 2 * T, 4 * T - 6, 4 * T - 2, col, INK); for (let y = 2 * T + 3; y < 6 * T - 4; y += 4) c.rect(X + 1, y, 4 * T - 8, 1, mix(col, [0, 0, 0], 0.35)); c.rect(X + 22, 6 * T - 8, 12, 3, [200, 200, 210]); }
      // Graffiti and neon.
      for (const [x, y, col] of [[30, 56, [250, 80, 170]], [96, 50, [90, 230, 230]], [158, 58, [250, 230, 90]], [220, 52, [250, 80, 170]]]) { c.line(x, y, x + 10, y + 14, col, 2); c.line(x + 10, y + 14, x + 18, y - 2, col, 2); c.line(x + 18, y - 2, x + 28, y + 12, col, 2); }
      c.rect(T, T + 4, 16 * T, 10, [24, 20, 34]);
      for (const [x, w, col] of [[24, 44, [250, 80, 170]], [84, 52, [90, 230, 230]], [152, 40, [250, 230, 90]], [206, 52, [250, 80, 170]]]) { glow(c, x + w / 2, T + 9, 18, col, 22); c.box(x, T + 5, w, 8, [30, 24, 44], col); c.rect(x + 4, T + 8, w - 8, 2, col); }
      c.rect(T, 6 * T - 2, 16 * T, 2, INK);
      // The spray-painted battle box and puddles.
      const L = [250, 80, 170, 200];
      c.rect(4 * T, 8 * T + 6, 10 * T, 2, L); c.rect(4 * T, 13 * T - 4, 10 * T, 2, L); c.rect(4 * T, 8 * T + 6, 2, 4 * T + 6, L); c.rect(14 * T - 2, 8 * T + 6, 2, 4 * T + 6, L); c.rect(4 * T, 11 * T - 4, 10 * T, 1, [90, 230, 230, 180]);
      c.ellipse(9 * T, 11 * T - 4, 14, 14, [90, 230, 230, 200], 2); c.line(9 * T - 8, 11 * T - 12, 9 * T + 8, 11 * T + 4, L, 2); c.line(9 * T + 8, 11 * T - 12, 9 * T - 8, 11 * T + 4, L, 2);
      for (const [x, y] of [[3, 13.4], [14.5, 8.3], [6, 14.5]]) { c.ellipse(x * T, y * T, 11, 4, [60, 80, 130, 150]); c.ellipse(x * T - 2, y * T - 1, 5, 1, [150, 190, 230, 150]); }
    });
    // The stage: mic, drum kit, amps.
    p.paint(8, (c, top) => {
      c.box(5 * T, 6 * T + 4, 8 * T, 2 * T - 6, [70, 60, 84], INK); c.rect(5 * T + 1, 8 * T - 8, 8 * T - 2, 5, [44, 38, 56]); for (let x = 5 * T + 6; x < 13 * T; x += 16) c.rect(x, 8 * T - 6, 4, 2, [250, 80, 170]);
      for (const x of [5, 11]) { c.box(x * T + 3, 6 * T - 8, 26, 26, [30, 28, 38], [90, 90, 104]); c.ellipse(x * T + 16, 6 * T + 6, 9, 9, [70, 70, 84]); c.ellipse(x * T + 16, 6 * T + 6, 5, 5, [24, 22, 30]); }
      c.ellipse(8 * T + 4, 6 * T + 12, 10, 7, [200, 60, 110]); c.ellipse(8 * T + 4, 6 * T + 10, 10, 6, [240, 236, 240]); c.ellipse(10 * T - 4, 6 * T + 6, 7, 3, [250, 220, 110]); c.rect(10 * T - 5, 6 * T + 7, 1, 12, [200, 200, 210]);
      c.rect(9 * T + 7, 6 * T - 4, 2, 28, [200, 200, 210]); c.ellipse(9 * T + 8, 6 * T - 6, 3, 4, [40, 40, 50]); c.ellipse(9 * T + 8, 6 * T - 7, 2, 2, [150, 150, 164]);
    });
    for (const x of [1, 15]) p.paint(7, (c) => { for (const dx of [0, 1]) { const X = (x + dx) * T; c.box(X + 2, 6 * T - 2, 12, 16, [150, 90, 60], INK); c.rect(X + 2, 6 * T + 2, 12, 2, [90, 90, 104]); c.rect(X + 2, 6 * T + 9, 12, 2, [90, 90, 104]); c.ellipse(X + 8, 6 * T - 2, 6, 2, [190, 120, 80]); } });
    // Chain-link fence panels at the sides.
    for (const x of [1, 16]) p.paint(12, (c) => { c.rect(x * T + 6, 9 * T - 8, 4, 3 * T + 8, [0, 0, 0, 0]); for (let y = 9 * T - 8; y < 12 * T; y += 4) for (let k = 2; k < 14; k += 4) { c.line(x * T + k, y, x * T + k + 3, y + 3, [170, 176, 190]); c.line(x * T + k + 3, y, x * T + k, y + 3, [130, 136, 150]); } c.rect(x * T + 1, 9 * T - 10, 14, 2, [200, 204, 214]); c.rect(x * T + 1, 9 * T - 10, 2, 3 * T + 10, [200, 204, 214]); c.rect(x * T + 13, 9 * T - 10, 2, 3 * T + 10, [200, 204, 214]); });
  },
};

// Hammerlocke Stadium: the vault where Raihan sets his challenge (compared with Pokéarth's Gym picture). A bare
// dark stone hall: the four tapestries of Galar's legend on the back wall, League pennants at the ends, a floor of
// flagstones laid in rings under one shaft of light.
PLANS.GalarHammerlockeStadium = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    p.fill("darkpave", 12, 5, 12, 6); p.bare(1);
    for (const x of [6, 10, 14, 18]) p.block(x, 7, 1, 1);          // the half-pillars between the hangings
    const STONE = [62, 64, 76], STONE2 = [46, 48, 60], CLOTH = [222, 208, 182], RED = [190, 50, 50];
    p.paint(0, (c) => {
      // The wall.
      c.rect(T, T, 22 * T, 6 * T, STONE);
      for (let y = T; y < 7 * T; y += 8) { c.rect(T, y, 22 * T, 1, STONE2); for (let x = T + ((y / 8) & 1) * 8; x < 23 * T; x += 16) c.rect(x, y, 1, 8, STONE2); }
      c.rect(T, T, 22 * T, 2 * T, [0, 0, 0, 70]); c.rect(T, 7 * T - 4, 22 * T, 4, [34, 36, 46]);
      // The four tapestries.
      [3, 7, 15, 19].forEach((x, k) => {
        const X = x * T - 2, Y = T + 4, W = 3 * T + 4, H = 5 * T + 2, mx = X + W / 2;
        c.box(X, Y, W, H, [120, 84, 50], INK); c.rect(X + 3, Y + 3, W - 6, H - 6, CLOTH);
        if (k === 0) { c.line(mx + 12, Y + 6, mx - 4, Y + 40, RED, 4); c.ellipse(mx - 6, Y + 42, 7, 7, RED); c.ellipse(mx + 10, Y + 16, 9, 6, [236, 220, 210]); c.rect(X + 3, Y + H - 16, W - 6, 13, [60, 66, 60]); for (let i = 0; i < 9; i++) c.p(X + 7 + i * 5, Y + H - 12 + (i % 3) * 3, [226, 200, 90]); }
        if (k === 1) { c.rect(X + 3, Y + 3, W - 6, 34, [200, 60, 56]); for (let i = 0; i < 5; i++) c.ellipse(X + 12 + i * 8, Y + 14 + (i % 2) * 10, 9, 6, i % 2 ? [36, 30, 40] : [236, 150, 130]); c.rect(X + 3, Y + H - 14, W - 6, 11, [36, 30, 40]); }
        if (k === 2) { c.rect(X + 3, Y + 3, W - 6, 30, [214, 90, 80]); c.poly([[mx, Y + 8], [mx + 14, Y + 46], [mx - 14, Y + 46]], [244, 240, 236]); c.ellipse(mx - 9, Y + 20, 5, 7, [236, 200, 200]); c.ellipse(mx + 9, Y + 20, 5, 7, [236, 200, 200]); c.rect(mx - 1, Y + 12, 2, 30, [150, 160, 190]); }
        if (k === 3) { c.rect(X + 3, Y + 3, W - 6, 20, [236, 196, 110]); c.ellipse(mx, Y + 8, 12, 9, [240, 130, 50]); for (let i = 0; i < 6; i++) c.p(X + 8 + i * 7, Y + 28 + (i % 2) * 4, [40, 40, 60]); c.rect(X + 3, Y + H - 12, W - 6, 9, [190, 90, 80]); }
        // The two young heroes at the foot of each.
        const fy = Y + H - 26; c.rect(mx - 9, fy, 6, 12, k === 3 ? [50, 60, 110] : [50, 80, 70]); c.ellipse(mx - 6, fy - 3, 3, 3, [240, 210, 120]); c.rect(mx + 3, fy, 6, 12, [170, 50, 50]); c.ellipse(mx + 6, fy - 3, 3, 3, [50, 40, 50]);
        c.rect(X, Y, W, 3, [170, 124, 70]); c.rect(X, Y + H - 3, W, 3, [170, 124, 70]);
      });
      // League pennants at the ends.
      for (const x of [1, 22]) { c.rect(x * T, T + 2, T, 3 * T, [200, 50, 50]); c.poly([[x * T, 4 * T + 2], [x * T + T, 4 * T + 2], [x * T + 8, 5 * T]], [200, 50, 50]); for (let k = 0; k < 3; k++) c.poly([[x * T + 1, T + 8 + k * 14], [x * T + 8, T + 2 + k * 14], [x * T + 15, T + 8 + k * 14], [x * T + 15, T + 14 + k * 14], [x * T + 8, T + 8 + k * 14], [x * T + 1, T + 14 + k * 14]], [240, 190, 60]); }
      // The way on, an arched door between the hangings.
      c.box(11 * T + 2, 3 * T - 2, 3 * T - 4, 4 * T + 2, STONE2, INK); c.ellipse(12.5 * T, 4 * T + 2, 12, 12, [20, 18, 26]); c.rect(12 * T - 4, 4 * T + 2, T + 8, 3 * T - 2, [20, 18, 26]); c.rect(12 * T, 5 * T, T, 2 * T, [84, 86, 100]); for (let y = 5 * T + 3; y < 7 * T; y += 5) c.rect(12 * T, y, T, 1, [124, 126, 140]);
      // The flagstones: rings round the middle of the hall.
      const cx = 12.5 * T, cy = 13 * T;
      for (let y = 7; y <= 19; y++) floorRow(c, 1, 22, y, [104, 104, 114]);
      for (let y = 7; y <= 18; y++) for (let x = 1 + (y & 1); x <= 22; x += 2) c.rect(x * T, y * T, T, T, [96, 96, 106]);
      for (let y = 7; y <= 18; y++) c.rect(T, y * T + 15, 22 * T, 1, [80, 80, 92]);
      c.ellipse(cx, cy, 9 * T, 5.4 * T, [112, 112, 122]); c.ellipse(cx, cy, 9 * T, 5.4 * T, [72, 72, 86], 2);
      c.ellipse(cx, cy, 6.6 * T, 4 * T, [124, 124, 134]); c.ellipse(cx, cy, 6.6 * T, 4 * T, [72, 72, 86], 2);
      c.ellipse(cx, cy, 4 * T, 2.4 * T, [136, 136, 146]); c.ellipse(cx, cy, 4 * T, 2.4 * T, [72, 72, 86], 2); c.ellipse(cx, cy, 1.6 * T, T, [150, 150, 160]); c.ellipse(cx, cy, 1.6 * T, T, [72, 72, 86], 1);
      for (let a = 0; a < 16; a++) { const g = a * Math.PI / 8 + 0.2; c.line(cx + Math.cos(g) * 4 * T, cy + Math.sin(g) * 2.4 * T, cx + Math.cos(g) * 6.6 * T, cy + Math.sin(g) * 4 * T, [72, 72, 86], 1); }
      for (let a = 0; a < 24; a++) { const g = a * Math.PI / 12; c.line(cx + Math.cos(g) * 6.6 * T, cy + Math.sin(g) * 4 * T, cx + Math.cos(g) * 9 * T, cy + Math.sin(g) * 5.4 * T, [72, 72, 86], 1); }
      for (let a = 0; a < 8; a++) { const g = a * Math.PI / 4 + 0.4; c.line(cx + Math.cos(g) * 1.6 * T, cy + Math.sin(g) * T, cx + Math.cos(g) * 4 * T, cy + Math.sin(g) * 2.4 * T, [72, 72, 86], 1); }
      // The shaft of light.
      c.ellipse(cx + T, cy - 8, 5 * T, 3 * T, [255, 250, 230, 22]); c.ellipse(cx + T, cy - 8, 3 * T, 1.8 * T, [255, 250, 230, 26]);
    });
    for (const x of [6, 10, 14, 18]) p.paint(8, (c, top) => { const X = x * T; top.box(X + 1, T, 14, 6 * T, [40, 42, 54], INK); top.rect(X + 3, T + 1, 3, 6 * T - 2, [70, 72, 88]); c.box(X, 7 * T - 2, T, 14, [40, 42, 54], INK); c.rect(X + 1, 7 * T + 8, 14, 3, [70, 72, 88]); });
  },
};

// Wyndon Stadium: the Champion Cup pitch, under full stands (compared with Serebii's Champion Cup pictures: the
// tiers are banded with magenta and teal ribbon boards under a dark-blue crowd).
PLANS.GalarWyndonStadium = {
  theme: { room: "arena", floor: "lawn", wall: null, top: 7 },
  plan(p) {
    for (const x of [1, 22]) p.fill("paving", x, 7, x, 19); p.fill("paving", 1, 7, 22, 7);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[90, 80, 190], [70, 110, 210], [150, 90, 200], [60, 70, 150], [200, 200, 240]], 13); boards(c, 1, 22, 6, [[226, 60, 130], [60, 190, 200]]);
      for (const [y, col] of [[2 * T + 6, [226, 60, 130]], [4 * T + 6, [60, 190, 200]]]) { c.rect(T, y, 22 * T, 3, col); for (let x = T + 20; x < 23 * T; x += 44) c.rect(x, y + 1, 10, 1, WHITE); }
      // The big screen.
      c.box(9 * T, T - 4, 6 * T, 3 * T + 2, [24, 30, 60], [200, 200, 212]); c.rect(9 * T + 3, T - 1, 6 * T - 6, 3 * T - 4, [40, 70, 150]); c.ellipse(12 * T, 2 * T + 4, 14, 14, WHITE); c.rect(12 * T - 14, 2 * T + 4, 28, 14, [226, 70, 70]); c.ellipse(12 * T, 2 * T + 4, 14, 14, INK, 2); c.rect(12 * T - 14, 2 * T + 3, 28, 2, INK); c.ellipse(12 * T, 2 * T + 4, 4, 4, WHITE); c.ellipse(12 * T, 2 * T + 4, 4, 4, INK, 1);
      for (const x of [3, 6, 17, 20]) banner(c, x * T + 2, 6, 12, 24, x % 2 ? [226, 60, 130] : [60, 190, 200], WHITE);
      for (let y = 8; y <= 19; y += 2) c.rect(2 * T, y * T, 20 * T, T, [255, 255, 255, 26]);
      court(c, 2, 8, 21, 19, [226, 60, 130]);
      c.ellipse(12 * T, 14 * T, 44, 44, A(WHITE, 150), 2);
    });
    // Floodlights at the corners of the stand.
    for (const x of [1, 22]) p.paint(8, (c, top) => { const X = x * T + 8; c.rect(X - 1, 5 * T, 3, 2 * T + 8, [150, 152, 168]); top.box(X - 7, 4 * T + 4, 14, 10, [60, 62, 80], INK); for (const dx of [-4, 1]) for (const dy of [0, 4]) top.rect(X + dx, 4 * T + 6 + dy, 3, 2, [255, 250, 200]); glow(top, X, 4 * T + 9, 16, [255, 250, 200], 20); });
  },
};

// ---------------------------------------------------------------- towers and the Energy Plant
// A window on the night city.
function skyline(p, c, x, y, w, h, seed) {
  c.box(x, y, w, h, [24, 30, 70], [150, 156, 176]);
  for (let k = 0; k < 14; k++) { const sx = x + 2 + p.hash(k, 1, seed) * (w - 6), sy = y + 2 + p.hash(k, 2, seed) * (h * 0.4); c.p(sx, sy, [220, 226, 250]); }
  for (let bx = x + 1; bx < x + w - 3;) { const bw = 5 + Math.floor(p.hash(bx, 3, seed) * 6), bh = 6 + Math.floor(p.hash(bx, 4, seed) * (h - 12)), w2 = Math.min(bw, x + w - 1 - bx); c.rect(bx, y + h - 1 - bh, w2, bh, [12, 14, 36]); for (let yy = y + h - bh + 1; yy < y + h - 2; yy += 3) for (let xx = bx + 1; xx < bx + w2 - 1; xx += 2) if (p.hash(xx, yy, seed) > 0.45) c.p(xx, yy, [250, 226, 120]); bx += bw + 1; }
  c.line(x + 2, y + h - 3, x + w * 0.4, y + 2, [255, 255, 255, 40]);
}
function lift(c, x, y, w, h, trim = [200, 160, 70]) { c.box(x, y, w, h, trim, INK); c.box(x + 3, y + 3, w - 6, h - 3, [176, 182, 196], INK); c.rect(x + w / 2, y + 4, 1, h - 4, INK); c.rect(x + 5, y + 5, 2, h - 8, [226, 230, 240]); c.rect(x + w / 2 - 3, y - 5, 6, 4, [250, 220, 120]); }
function desk(c, x, y, w, col = [150, 100, 60]) { const X = x * T, Y = y * T; c.box(X, Y - 6, w * T, 20, col, INK); c.rect(X + 1, Y - 5, w * T - 2, 5, mix(col, WHITE, 0.35)); c.rect(X + 1, Y + 9, w * T - 2, 4, mix(col, [0, 0, 0], 0.3)); }

// Rose Tower, ground floor (compared with Pokéarth's 1F picture): a dark hall lit by white strip lights, the great
// square lift door at the back of a raised walk, the rose bed sunk into the floor before it, reception either side.
PLANS.GalarRoseTower = {
  theme: { room: "arena", floor: "steel", wall: null, top: 7 },
  plan(p) {
    p.fill("steel", 12, 5, 12, 6); p.bare(1);
    p.block(10, 15, 5, 3);                               // the rose bed
    p.block(2, 8, 6, 1); p.block(16, 8, 6, 1);           // reception counters
    const NEON = [236, 244, 255], DARK = [44, 46, 74], FLOOR = [72, 74, 112], FLOOR2 = [64, 66, 102];
    p.paint(0, (c) => {
      // The dark wall, its screens and strip lights.
      c.rect(T, T, 22 * T, 6 * T, DARK); c.rect(T, T, 22 * T, 2 * T, [30, 32, 54]);
      for (const x of [2, 18]) { c.box(x * T, 2 * T + 4, 3 * T, 2 * T, [24, 26, 44], [90, 94, 130]); for (let k = 0; k < 3; k++) c.rect(x * T + 5, 2 * T + 10 + k * 7, 20 + (k % 2) * 12, 2, [120, 150, 210]); }
      c.box(6 * T + 4, 2 * T + 8, T + 4, 2 * T - 6, [150, 70, 60], [90, 94, 130]); for (let k = 0; k < 3; k++) c.rect(6 * T + 8, 2 * T + 13 + k * 6, 12, 1, [240, 220, 200]);
      for (const [x0, x1] of [[1, 9], [15, 22]]) { c.rect(x0 * T + 6, 2 * T - 2, (x1 - x0 + 1) * T - 12, 3, NEON); c.rect(x0 * T, 7 * T - 6, (x1 - x0 + 1) * T, 2, NEON); c.rect(x0 * T, 7 * T - 4, (x1 - x0 + 1) * T, 4, [26, 28, 46]); }
      // The lift: one great square door in a glowing frame.
      glow(c, 12.5 * T, 4 * T, 46, NEON, 12); c.box(10 * T - 2, T + 4, 5 * T + 4, 6 * T - 4, NEON, [150, 160, 200]); c.box(10 * T + 2, T + 8, 5 * T - 4, 6 * T - 8, [176, 182, 200], [120, 126, 150]);
      c.rect(12.5 * T, T + 9, 1, 6 * T - 10, [120, 126, 150]); c.rect(10 * T + 5, T + 11, 3, 5 * T, [214, 220, 236]); c.rect(12 * T, 5 * T, T, 2 * T, [150, 156, 178]); c.rect(12 * T + 7, 5 * T, 2, 2 * T, [110, 116, 140]);
      // The floor: dark tiles, the raised walk to the lift with its light edging.
      for (let y = 7; y <= 19; y++) floorRow(c, 1, 22, y, y & 1 ? FLOOR : FLOOR2);
      for (let x = 1; x <= 22; x += 3) c.rect(x * T, 7 * T, 1, 12 * T, [56, 58, 92]); for (let y = 9; y <= 19; y += 3) { c.rect(T, y * T, 10 * T + 8, 1, [56, 58, 92]); c.rect(13 * T + 8, y * T, 9 * T + 8, 1, [56, 58, 92]); }
      c.rect(10 * T, 7 * T, 5 * T, 7 * T, [96, 98, 144]); c.rect(10 * T, 7 * T, 2, 7 * T + 8, NEON); c.rect(15 * T - 2, 7 * T, 2, 7 * T + 8, NEON);
      c.rect(8 * T, 14 * T + 8, 2 * T, 2, NEON); c.rect(15 * T, 14 * T + 8, 2 * T, 2, NEON); c.rect(8 * T, 14 * T + 8, 2, 5 * T + 8, A(NEON, 150)); c.rect(17 * T - 2, 14 * T + 8, 2, 5 * T + 8, A(NEON, 150));
      glow(c, 12.5 * T, 9 * T, 60, NEON, 8);
    });
    // The rose bed: red and blue roses in dark earth, rimmed with light.
    p.paint(18, (c) => {
      const X = 10 * T, Y = 15 * T, W = 5 * T, H = 3 * T; c.box(X, Y - 2, W, H, [24, 34, 30], NEON); c.rect(X + 2, Y, W - 4, H - 4, [30, 54, 40]);
      for (let k = 0; k < 46; k++) { const x = X + 6 + p.hash(k, 1, 6) * (W - 12), y = Y + 4 + p.hash(k, 2, 6) * (H - 12), col = k % 2 ? [214, 44, 60] : [60, 80, 220]; c.ellipse(x, y, 3, 3, mix(col, [0, 0, 0], 0.35)); c.ellipse(x, y - 1, 2, 2, col); c.p(x - 1, y - 2, mix(col, WHITE, 0.5)); }
    });
    // Reception counters, underlit.
    for (const x of [2, 16]) p.paint(9, (c) => { const X = x * T, Y = 8 * T; c.box(X, Y - 8, 6 * T, 22, [58, 60, 94], INK); c.rect(X + 1, Y - 7, 6 * T - 2, 5, [104, 108, 156]); c.rect(X + 2, Y + 11, 6 * T - 4, 2, NEON); c.rect(X + 2 * T, Y - 18, 14, 10, [30, 32, 54]); c.rect(X + 2 * T + 2, Y - 16, 10, 6, [120, 170, 230]); c.ellipse(X + 4 * T + 8, Y - 9, 4, 3, [236, 190, 70]); });
  },
};

// Hammerlocke Energy Plant (compared with Pokéarth's picture): the dark-red walk out to the round platform where the
// chrysalis sits, ringed by tall glass energy tubes blazing white-gold, the way down behind it.
PLANS.GalarEnergyPlant = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    p.fill("darkpave", 12, 5, 12, 6); p.bare(1);
    const tubes = [[2, 8, 2], [4, 7, 1], [6, 8, 1], [8, 7, 1], [10, 7, 1], [14, 7, 1], [16, 7, 1], [18, 8, 1], [20, 7, 1], [21, 9, 2], [1, 12, 2], [22, 13, 2], [3, 16, 1], [20, 17, 1]];
    const G = [255, 226, 150], M = [236, 90, 150], RED = [104, 34, 52], RED2 = [132, 46, 64];
    for (const [x, y] of tubes) p.block(x, y, 1, 1);
    p.block(12, 9, 1, 1);                                // the chrysalis
    p.paint(0, (c) => {
      // The hall behind: dark, shot through with light from ranks of tubes further back.
      c.rect(T, T, 22 * T, 6 * T, [52, 26, 30]); c.rect(T, T, 22 * T, 2 * T, [34, 18, 24]);
      for (let k = 0; k < 6; k++) { const x = (2 + k * 4) * T; c.poly([[x - 6, T], [x + 6, T], [x + 26, 7 * T], [x - 26, 7 * T]], [255, 226, 150, 18]); }
      for (let k = 0; k < 20; k++) { const x = T + 6 + k * 17.6, h = 26 + p.hash(k, 1, 3) * 34; if (x > 10.6 * T && x < 14.4 * T) continue; glow(c, x + 4, 7 * T - h / 2, 14, G, 16); c.box(x, 7 * T - 4 - h, 9, h, [255, 240, 196], [200, 150, 90]); c.ellipse(x + 4.5, 7 * T - 4 - h, 4.5, 4, [255, 240, 196]); c.rect(x + 3, 7 * T - 2 - h, 2, h - 4, WHITE); }
      c.rect(T, 7 * T - 4, 22 * T, 4, [30, 16, 22]);
      // The way down, behind the platform.
      c.box(11 * T + 4, 3 * T, 2 * T + 8, 4 * T, [40, 18, 30], M); c.box(12 * T - 2, 4 * T, T + 4, 3 * T, [20, 10, 20], [250, 160, 200]); c.rect(12 * T, 5 * T, T, 2 * T, RED); for (let y = 5 * T + 2; y < 7 * T; y += 4) c.rect(12 * T, y, T, 1, A(M, 150));
      // Floor: dark, with the red walk and the round platform.
      for (let y = 7; y <= 19; y++) floorRow(c, 1, 22, y, [44, 26, 36, 200]);
      const cx = 12.5 * T, cy = 11 * T;
      c.rect(10 * T, cy, 5 * T, 20 * T - cy - 1 - T, RED); c.rect(10 * T, 19 * T, 1.5 * T, T, RED); c.rect(13.5 * T, 19 * T, 1.5 * T, T, RED);
      c.rect(10 * T, cy, 3, 20 * T - cy, M); c.rect(15 * T - 3, cy, 3, 20 * T - cy, M); c.rect(10 * T + 3, cy, 1, 20 * T - cy, [255, 200, 224]); c.rect(15 * T - 4, cy, 1, 20 * T - cy, [255, 200, 224]);
      for (let y = 15; y <= 18; y++) c.rect(10 * T + 6, y * T, 5 * T - 12, 1, [84, 26, 42]);
      c.rect(12 * T, 7 * T, T, 2 * T, RED);
      glow(c, cx, cy, 5.4 * T, G, 10); c.ellipse(cx, cy, 5 * T, 3.4 * T, [30, 14, 22]); c.ellipse(cx, cy, 5 * T - 3, 3.4 * T - 3, RED2); c.ellipse(cx, cy, 5 * T - 3, 3.4 * T - 3, [196, 60, 84], 2); c.ellipse(cx, cy, 3.6 * T, 2.4 * T, RED); c.ellipse(cx, cy, 3.6 * T, 2.4 * T, M, 1); c.ellipse(cx, cy - 6, 2 * T, 1.3 * T, [150, 150, 164]); c.ellipse(cx, cy - 6, 2 * T, 1.3 * T, [226, 226, 236], 2); c.ellipse(cx, cy - 6, 1.2 * T, 0.8 * T, [110, 110, 126]);
      for (const a of [0.5, 2.64]) { c.line(cx + Math.cos(a) * 3.7 * T, cy + Math.sin(a) * 2.5 * T, cx + Math.cos(a) * 4.8 * T, cy + Math.sin(a) * 3.2 * T, [196, 60, 84], 3); }
    });
    // The chrysalis in its cradle.
    p.paint(10, (c, top) => { const X = 12.5 * T, Y = 9 * T + 8; c.ellipse(X, Y + 6, 15, 5, [0, 0, 0, 90]); c.poly([[X - 16, Y + 4], [X - 9, Y - 6], [X + 9, Y - 6], [X + 16, Y + 4], [X, Y + 8]], [34, 22, 44]); top.ellipse(X, Y - 6, 8, 9, [24, 16, 34]); top.ellipse(X - 1, Y - 8, 5, 6, [70, 30, 90]); top.ellipse(X - 2, Y - 10, 2, 3, [200, 80, 170]); for (const s of [-1, 1]) top.poly([[X + s * 8, Y - 2], [X + s * 20, Y - 12], [X + s * 13, Y + 2]], [34, 22, 44]); });
    // The glass tubes.
    for (const [x, y, big] of tubes) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T, h = big === 2 ? 46 : 30; glow(c, X, Y, 20, G, 22); c.ellipse(X, Y + 13, 8, 3, [0, 0, 0, 80]); c.box(X - 7, Y + 8, 14, 7, [84, 60, 66], INK); c.rect(X - 6, Y + 9, 12, 2, [150, 120, 120]);
      c.box(X - 5, Y - 2, 10, 11, [255, 244, 206], [214, 170, 110]); top.box(X - 5, Y - h, 10, h - 1, [255, 244, 206], [214, 170, 110]); top.ellipse(X, Y - h, 5, 5, [214, 170, 110]); top.ellipse(X, Y - h, 4, 4, [255, 244, 206]); top.rect(X - 2, Y - h, 3, h - 2, WHITE); c.rect(X - 2, Y - 1, 3, 9, WHITE); for (let k = Y - h + 8; k < Y; k += 9) top.rect(X - 4, k, 8, 1, [236, 200, 130]); });
  },
};

// The Eternatus chamber: the tower's open summit, a round platform under the Darkest Day's storm.
PLANS.GalarEternatusChamber = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 3, bottom: 17 },
  plan(p) {
    p.fill("void", 1, 3, 20, 17); p.disc("darkpave", 11, 10.5, 8.6, 6.9);
    p.paint(0, (c) => {
      const cx = 11 * T, cy = 10.5 * T, M = [250, 60, 130];
      c.rect(0, 0, 22 * T, 20 * T, [40, 10, 34]);
      for (let k = 0; k < 60; k++) { const x = p.hash(k, 1, 4) * 22 * T, y = p.hash(k, 2, 4) * 20 * T, r = 14 + p.hash(k, 3, 4) * 26; c.ellipse(x, y, r, r * 0.45, k % 3 ? [110, 20, 60, 70] : [20, 6, 30, 90]); }
      for (let r = 190; r > 150; r -= 13) c.ellipse(cx, cy, r, r * 0.8, [250, 60, 130, 60], 3);
      for (let k = 0; k < 9; k++) { let x = p.hash(k, 5, 4) * 22 * T, y = 0; for (let s = 0; s < 5; s++) { const nx = x + (p.hash(k, s, 6) - 0.5) * 26, ny = y + 10 + p.hash(k, s, 7) * 10; c.line(x, y, nx, ny, [255, 170, 210, 190]); x = nx; y = ny; } }
      // The platform.
      glow(c, cx, cy, 170, M, 16); c.ellipse(cx, cy + 6, 9 * T, 7.3 * T, [20, 8, 24]); c.ellipse(cx, cy, 9 * T, 7.3 * T, [60, 52, 78]); c.ellipse(cx, cy, 9 * T, 7.3 * T, M, 3); c.ellipse(cx, cy, 9 * T - 6, 7.3 * T - 6, [84, 78, 108]);
      for (let a = 0; a < 16; a++) { const g = a * Math.PI / 8; c.line(cx + Math.cos(g) * 50, cy + Math.sin(g) * 40, cx + Math.cos(g) * 134, cy + Math.sin(g) * 108, [56, 50, 76]); }
      c.ellipse(cx, cy, 100, 80, [56, 50, 76], 2); c.ellipse(cx, cy - 20, 44, 34, [250, 60, 130, 70]); c.ellipse(cx, cy - 20, 44, 34, M, 2); c.ellipse(cx, cy - 20, 30, 23, [255, 190, 220, 160], 1);
      for (let a = 0; a < 5; a++) { const g = a * Math.PI * 2 / 5 - Math.PI / 2, h = g + Math.PI * 4 / 5; c.line(cx + Math.cos(g) * 40, cy - 20 + Math.sin(g) * 31, cx + Math.cos(h) * 40, cy - 20 + Math.sin(h) * 31, [250, 120, 180, 200]); }
    });
    p.paint(99, (c, top) => { for (let k = 0; k < 40; k++) { const x = p.hash(k, 8, 4) * 22 * T, y = p.hash(k, 9, 4) * 19 * T; top.rect(x, y, 1, 3, [255, 150, 200, 150]); } });
  },
};

// Wyndon Battle Tower: the reception floor, with the lifts up to the battle rooms.
PLANS.GalarBattleTower = {
  theme: { room: "arena", floor: "steel", wall: null, top: 5 },
  plan(p) {
    p.block(7, 5, 5, 1); p.block(13, 8, 3, 1);
    p.decor("rMachine", 1, 3, { optional: true }); p.decor("rPC", 15, 4, { optional: true }); p.decor("rPlant", 1, 12, { optional: true }); p.decor("rPlant", 16, 12, { optional: true }); p.decor("rSeats", 2, 9, { optional: true });
    p.paint(0, (c) => {
      c.rect(T, T, 16 * T, 4 * T, [206, 212, 226]); c.rect(T, T, 16 * T, 3, WHITE); c.rect(T, 5 * T - 4, 16 * T, 4, [110, 120, 150]); c.rect(T, 5 * T - 5, 16 * T, 1, [70, 130, 220]);
      c.box(6 * T, T + 4, 6 * T, 2 * T + 6, [24, 30, 60], [200, 160, 70]); c.rect(6 * T + 3, T + 7, 6 * T - 6, 2 * T, [40, 90, 170]); c.rect(6 * T + 3, 2 * T + 6, 6 * T - 6, 1, WHITE); c.ellipse(9 * T, 2 * T + 6, 8, 8, WHITE, 2); c.rect(7 * T, 2 * T - 4, 10, 6, [250, 110, 90]); c.rect(10 * T + 4, 2 * T + 12, 10, 6, [110, 220, 150]);
      lift(c, 4 * T - 6, 2 * T + 8, 2 * T - 4, 2 * T + 4); lift(c, 12 * T + 10, 2 * T + 8, 2 * T - 4, 2 * T + 4);
      c.rect(8 * T, 6 * T, 3 * T, 8 * T, [50, 90, 190]); c.rect(8 * T, 6 * T, 2, 8 * T, [250, 210, 110]); c.rect(11 * T - 2, 6 * T, 2, 8 * T, [250, 210, 110]);
      c.ellipse(9.5 * T, 10 * T, 30, 22, [250, 210, 110, 200], 2);
    });
    p.paint(6, (c) => { desk(c, 7, 5, 5, [70, 110, 190]); c.rect(9 * T, 5 * T - 10, 16, 6, [250, 210, 110]); c.rect(7 * T + 4, 5 * T - 4, 6, 3, WHITE); });
    p.paint(9, (c) => { desk(c, 13, 8, 3, [200, 160, 70]); for (let k = 0; k < 3; k++) c.ellipse(13 * T + 8 + k * T, 8 * T - 5, 3, 3, [[226, 70, 70], [70, 130, 220], [90, 180, 110]][k]); });
  },
};

// ---------------------------------------------------------------- houses, labs, hotel, station
// Postwick, the player's home: kitchen, telly, dining table, sofa, stairs.
PLANS.GalarHome = {
  theme: { room: "house" },
  plan(p) {
    p.decor("rKitchen", 1, 2); p.decor("rFridge", 4, 2); p.decor("rTV", 7, 3); p.decor("rWindow", 10, 2); p.decor("rBooks", 12, 2);
    p.decor("rTable", 2, 8, { optional: true }); p.decor("rSeats", 12, 10, { optional: true }); p.decor("rPot", 1, 12, { optional: true }); p.decor("rPot", 16, 12, { optional: true }); p.decor("rPlant", 13, 4, { optional: true });
    p.block(15, 4, 2, 2);
    p.paint(0, (c) => { rug(c, 6, 5, 9, 6, [110, 170, 110], [60, 110, 70]); rug(c, 8, 12, 10, 12, [226, 190, 110], [150, 110, 60]); c.box(13 * T + 2, 2 * T + 3, 28, 22, [150, 110, 70], INK); c.rect(13 * T + 5, 2 * T + 6, 22, 16, [150, 210, 240]); c.poly([[13 * T + 5, 3 * T + 6], [14 * T, 3 * T - 2], [14 * T + 8, 3 * T + 2], [15 * T - 5, 3 * T - 4], [15 * T - 5, 3 * T + 6]], [110, 180, 100]); });
    // Stairs up to the bedroom.
    p.paint(6, (c) => { c.box(15 * T, 3 * T, 2 * T, 3 * T - 2, [120, 84, 54], INK); for (let k = 0; k < 6; k++) { c.rect(15 * T + 1, 3 * T + 2 + k * 7, 2 * T - 2, 5, [200, 160, 110]); c.rect(15 * T + 1, 3 * T + 7 + k * 7, 2 * T - 2, 2, [150, 108, 70]); } c.rect(15 * T, 3 * T, 2, 3 * T - 2, [90, 60, 40]); });
  },
};

// Sonia's (the Professor's) lab in Wedgehurst: books to the ceiling, a screen, a desk, Yamper's bed.
PLANS.GalarSoniaLab = {
  theme: { room: "lab" },
  plan(p) {
    for (const x of [1, 3, 5]) p.decor("rBooks", x, 2); p.decor("rMachine", 12, 2); p.decor("rShelf", 15, 2);
    p.decor("rLabTable", 2, 7, { optional: true }); p.decor("rBench", 11, 8, { optional: true }); p.decor("rStack", 1, 10, { optional: true }); p.decor("rPlant", 16, 11, { optional: true }); p.decor("rPlant", 7, 4, { optional: true }); p.decor("rBooks", 15, 6, { optional: true });
    p.block(13, 12, 2, 1);
    p.paint(0, (c) => {
      rug(c, 6, 9, 11, 11, [236, 170, 80], [170, 100, 50]);
      c.box(8 * T, 2 * T + 2, 4 * T - 4, 2 * T - 6, [30, 36, 60], [150, 156, 176]); c.rect(8 * T + 3, 2 * T + 5, 4 * T - 10, 2 * T - 12, [50, 110, 150]);
      c.ellipse(9 * T + 4, 3 * T - 2, 7, 7, [250, 110, 150]); c.ellipse(9 * T + 4, 3 * T - 2, 7, 7, WHITE, 1); for (let k = 0; k < 4; k++) c.rect(10 * T + 2, 2 * T + 8 + k * 4, 18 - k * 3, 2, [200, 236, 250]);
    });
    p.paint(13, (c) => { const X = 13 * T, Y = 12 * T; c.ellipse(X + 16, Y + 9, 15, 6, [150, 90, 60]); c.ellipse(X + 16, Y + 8, 12, 4, [250, 220, 110]); c.ellipse(X + 12, Y + 5, 5, 4, [236, 190, 90]); c.ellipse(X + 20, Y + 6, 6, 4, [250, 240, 220]); c.rect(X + 9, Y + 1, 2, 3, [236, 190, 90]); c.p(X + 11, Y + 5, INK); });
  },
};

// Professor Magnolia's house on Route 2: a conservatory of a home, windows and plants everywhere, tea laid out.
PLANS.GalarMagnoliaHouse = {
  theme: { room: "house", floor: "rHouse" },
  plan(p) {
    for (const x of [1, 4, 7]) p.decor("rWindow", x, 2); p.decor("rBooks", 10, 2); p.decor("rBooks", 12, 2); p.decor("rShelf", 15, 2);
    for (const [x, y] of [[1, 4], [1, 7], [1, 10], [16, 6], [16, 9], [3, 4], [6, 4]]) p.decor("rPlant", x, y, { optional: true });
    p.decor("rPot", 9, 4, { optional: true }); p.decor("rPot", 16, 12, { optional: true }); p.decor("rPot", 1, 12, { optional: true });
    p.decor("rTable", 3, 9, { optional: true }); p.decor("rTV", 12, 4, { optional: true });
    const beds = [[11, 11], [13, 11], [11, 13], [14, 13], [4, 13], [6, 13]];
    for (const [x, y] of beds) p.block(x, y, 2, 1);
    p.paint(0, (c) => { rug(c, 7, 6, 12, 9, [150, 110, 190], [90, 60, 130]); c.ellipse(9.5 * T + 8, 8 * T, 22, 14, [250, 220, 150, 150], 2); });
    beds.forEach(([x, y], k) => p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.box(X + 1, Y + 6, 30, 9, [170, 120, 80], INK); c.rect(X + 2, Y + 4, 28, 4, [70, 140, 70]); for (let i = 0; i < 5; i++) { const col = [[250, 110, 130], [250, 220, 110], [200, 130, 230]][(i + k) % 3]; c.rect(X + 4 + i * 6, Y, 1, 5, [60, 120, 60]); c.ellipse(X + 4 + i * 6, Y - 1, 2, 2, col); } }));
    // A telescope by the bookshelves.
    p.block(14, 5, 1, 1); p.paint(6, (c) => { const X = 14 * T, Y = 5 * T; c.line(X + 8, Y + 4, X + 3, Y + 14, [110, 80, 60]); c.line(X + 8, Y + 4, X + 13, Y + 14, [110, 80, 60]); c.line(X + 8, Y + 4, X + 8, Y + 14, [110, 80, 60]); c.line(X + 2, Y + 6, X + 14, Y - 4, [200, 160, 70], 3); c.rect(X + 13, Y - 6, 3, 4, [250, 220, 120]); });
  },
};

// The Rose of the Rondelands, Wyndon: a marble lobby, red carpet up to the hero's statue, lifts and reception.
PLANS.GalarWyndonHotel = {
  theme: { room: "hall", floor: "hallFloor" },
  plan(p) {
    p.block(8, 4, 3, 1); p.block(4, 4, 3, 1); p.block(12, 4, 3, 1);
    for (const [x, y] of [[1, 4], [16, 4], [1, 12], [16, 12]]) p.decor("rPlant", x, y, { optional: true });
    p.decor("rSeats", 5, 10, { optional: true }); p.decor("rSeats", 11, 10, { optional: true });
    p.paint(0, (c) => {
      c.rect(T, 2 * T, 16 * T, 2 * T, [226, 214, 196]); c.rect(T, 2 * T, 16 * T, 3, [250, 244, 232]); c.rect(T, 4 * T - 5, 16 * T, 5, [150, 60, 60]); c.rect(T, 4 * T - 6, 16 * T, 1, [250, 210, 110]);
      lift(c, 2 * T - 2, 2 * T + 4, 2 * T - 6, 2 * T - 9); lift(c, 15 * T - 8, 2 * T + 4, 2 * T - 6, 2 * T - 9);
      for (const x of [5, 12]) { c.box(x * T - 2, 2 * T + 4, 2 * T + 4, 18, [150, 110, 60], [250, 210, 110]); c.rect(x * T + 1, 2 * T + 7, 2 * T - 2, 12, [70, 110, 90]); c.ellipse(x * T + 16, 2 * T + 13, 6, 4, [250, 220, 150]); }
      c.rect(8 * T, 5 * T, 3 * T, 9 * T, [180, 44, 56]); c.rect(8 * T, 5 * T, 2, 9 * T, [250, 210, 110]); c.rect(11 * T - 2, 5 * T, 2, 9 * T, [250, 210, 110]);
      c.ellipse(9.5 * T, 8.5 * T, 34, 26, [180, 44, 56]); c.ellipse(9.5 * T, 8.5 * T, 34, 26, [250, 210, 110], 2);
    });
    // The statue of the hero with sword and shield.
    p.paint(5, (c, top) => {
      const X = 9.5 * T, Y = 5 * T; glow(c, X, Y - 14, 30, [250, 220, 120], 22);
      c.box(8 * T + 2, Y - 10, 3 * T - 4, 10, [190, 184, 176], INK); c.rect(8 * T + 3, Y - 9, 3 * T - 6, 3, WHITE);
      c.rect(X - 4, Y - 26, 8, 16, [226, 180, 80]); c.ellipse(X, Y - 30, 4, 4, [250, 210, 110]); c.rect(X - 6, Y - 24, 2, 9, [226, 180, 80]); c.rect(X + 4, Y - 24, 2, 9, [226, 180, 80]);
      c.rect(X - 8, Y - 40, 2, 20, [250, 240, 190]); c.rect(X - 10, Y - 24, 6, 2, [200, 150, 60]); c.ellipse(X + 9, Y - 19, 5, 6, [200, 150, 60]); c.ellipse(X + 9, Y - 19, 3, 4, [250, 230, 150]);
    });
    for (const x of [4, 12]) p.paint(5, (c) => { desk(c, x, 4, 3, [140, 90, 56]); c.ellipse(x * T + 8, 4 * T - 6, 3, 2, [250, 220, 110]); c.rect((x + 1) * T + 6, 4 * T - 8, 10, 5, WHITE); });
  },
};

// Crown Tundra Station: a snowy platform with the train in, a ticket barrier and benches.
PLANS.GalarCrownStation = {
  theme: { room: "arena", floor: "paving", wall: null, top: 6 },
  plan(p) {
    p.fill("snow", 1, 6, 16, 6);
    p.block(1, 10, 5, 1); p.block(13, 10, 4, 1); for (const x of [6, 8, 10, 12]) p.block(x, 10, 1, 1);
    p.decor("bench", 3, 7, { optional: true }); p.decor("bench", 14, 7, { optional: true }); p.decor("rPlant", 1, 12, { optional: true });
    p.paint(0, (c) => {
      // Snowy hills, the track and the train.
      c.rect(T, T, 16 * T, 5 * T, [170, 200, 230]); for (let k = 0; k < 5; k++) c.ellipse(T + 20 + k * 58, 2 * T + 6, 44, 18, k % 2 ? [236, 242, 250] : [214, 226, 240]);
      c.rect(T, 5 * T + 4, 16 * T, 12, [96, 90, 96]); for (let x = T; x < 17 * T; x += 8) c.rect(x, 5 * T + 6, 3, 8, [130, 100, 76]); c.rect(T, 5 * T + 7, 16 * T, 1, [200, 204, 214]); c.rect(T, 5 * T + 12, 16 * T, 1, [200, 204, 214]);
      c.box(2 * T, 2 * T + 6, 14 * T, 3 * T + 2, [60, 130, 90], INK); c.rect(2 * T + 1, 2 * T + 7, 14 * T - 2, 5, [236, 240, 244]); c.rect(2 * T + 1, 4 * T + 8, 14 * T - 2, 4, [250, 210, 110]); c.rect(2 * T + 1, 5 * T, 14 * T - 2, 7, [44, 80, 60]);
      for (let x = 2 * T + 8; x < 15 * T; x += 28) { c.box(x, 3 * T, 20, 14, [150, 210, 240], INK); c.line(x + 3, 3 * T + 11, x + 10, 3 * T + 2, A(WHITE, 170)); }
      for (const x of [8, 13]) { c.box(x * T, 3 * T - 2, 14, 2 * T + 8, [200, 206, 216], INK); c.rect(x * T + 6, 3 * T, 1, 2 * T + 4, INK); }
      for (const x of [3, 6, 10, 14]) c.ellipse(x * T, 5 * T + 12, 6, 6, [40, 40, 50]);
      for (let x = T; x < 17 * T; x += 8) c.rect(x, 7 * T - 2, 5, 2, [250, 210, 70]);
      for (let k = 0; k < 24; k++) c.ellipse(T + 6 + p.hash(k, 1, 3) * 15.5 * T, 6 * T + 3 + p.hash(k, 2, 3) * 9, 3, 2, WHITE);
      c.rect(T, 10 * T + 4, 16 * T, 8, [120, 126, 146]);
    });
    p.paint(11, (c) => {
      for (const [x0, x1] of [[1, 5], [13, 16]]) { c.box(x0 * T, 10 * T - 8, (x1 - x0 + 1) * T, 22, [176, 182, 198], INK); c.rect(x0 * T + 1, 10 * T - 7, (x1 - x0 + 1) * T - 2, 4, WHITE); for (let x = x0 * T + 6; x < (x1 + 1) * T - 6; x += 14) c.rect(x, 10 * T - 1, 8, 9, [150, 200, 230]); }
      for (const x of [6, 8, 10, 12]) { c.box(x * T + 2, 10 * T - 6, 12, 20, [70, 130, 100], INK); c.rect(x * T + 4, 10 * T - 4, 8, 4, [250, 210, 110]); c.ellipse(x * T + 8, 10 * T + 6, 2, 2, [110, 230, 150]); }
    });
    // The departures board.
    p.paint(7, (c, top) => { top.box(7 * T, 6 * T - 4, 4 * T, 12, [24, 26, 40], [150, 156, 176]); for (let k = 0; k < 2; k++) { top.rect(7 * T + 4, 6 * T - 1 + k * 4, 22, 2, [250, 180, 70]); top.rect(9 * T + 4, 6 * T - 1 + k * 4, 16, 2, [110, 230, 150]); } });
  },
};

// The Master Dojo's kitchen: the Max Soup cauldron on its fire, tatami, stores.
PLANS.GalarMaxSoupKitchen = {
  theme: { room: "house", floor: "deck" },
  plan(p) {
    p.decor("rKitchen", 1, 2); p.decor("rFridge", 4, 2); p.decor("rGoods", 13, 2); p.decor("rGoods", 15, 2);
    p.decor("barrels", 1, 9, { optional: true }); p.decor("barrels", 16, 9, { optional: true }); p.decor("barrel", 2, 10, { optional: true }); p.decor("barrel", 15, 10, { optional: true }); p.decor("rPot", 1, 12, { optional: true }); p.decor("rPot", 16, 12, { optional: true });
    p.block(8, 4, 3, 2); p.block(12, 5, 1, 1); p.block(6, 5, 1, 1);
    p.paint(0, (c) => {
      for (let x = 4; x <= 13; x += 2) for (let y = 9; y <= 11; y++) { const X = x * T, Y = y * T, flip = ((x >> 1) + y) & 1; c.box(X, Y, 2 * T, T, flip ? [176, 196, 120] : [160, 184, 110], [96, 120, 70]); for (let k = 3; k < 30; k += 4) c.rect(X + k, Y + 2, 1, T - 4, [140, 166, 96]); }
      c.box(7 * T, 2 * T + 2, 5 * T, T + 8, [240, 232, 210], [150, 60, 50]); c.rect(8 * T, 2 * T + 8, 3 * T, 3, INK); c.rect(8 * T + 6, 2 * T + 14, 2 * T + 4, 3, INK); c.ellipse(9.5 * T, 3 * T + 2, 3, 3, [200, 50, 50]);
    });
    p.paint(7, (c, top) => {
      const X = 9.5 * T, Y = 5 * T + 4; glow(c, X, Y + 6, 34, [250, 150, 60], 26);
      for (const dx of [-14, -5, 5, 14]) flame(c, X + dx, Y + 14, 0.8);
      c.rect(X - 22, Y + 8, 44, 4, [80, 60, 50]); c.ellipse(X, Y, 24, 15, INK); c.ellipse(X, Y, 22, 13, [70, 70, 84]); c.ellipse(X, Y - 6, 22, 9, INK); c.ellipse(X, Y - 6, 20, 7, [226, 80, 60]); c.ellipse(X - 6, Y - 7, 6, 2, [250, 150, 110]); c.ellipse(X + 8, Y - 5, 3, 2, [250, 220, 110]); c.ellipse(X - 2, Y - 4, 3, 2, [140, 200, 90]);
      for (const [dx, dy] of [[-8, -22], [2, -30], [10, -20]]) { top.ellipse(X + dx, Y + dy, 5, 4, [255, 255, 255, 110]); top.ellipse(X + dx + 3, Y + dy - 6, 3, 3, [255, 255, 255, 80]); }
      for (const x of [6, 12]) { c.box(x * T + 1, 5 * T + 2, 14, 12, [190, 150, 100], INK); for (let k = 0; k < 3; k++) c.ellipse(x * T + 4 + k * 4, 5 * T + 2, 3, 3, x === 6 ? [226, 70, 60] : [250, 200, 80]); }
    });
  },
};

// ---------------------------------------------------------------- shrines, towers and DLC rooms
function fog(p, top, x0, y0, x1, y1, n, seed, col = [236, 240, 250]) { for (let k = 0; k < n; k++) { const x = (x0 + p.hash(k, 1, seed) * (x1 - x0)) * T, y = (y0 + p.hash(k, 2, seed) * (y1 - y0)) * T; top.ellipse(x, y, 22 + p.hash(k, 3, seed) * 26, 5 + p.hash(k, 4, seed) * 5, A(col, 34)); } }
function stone(c, x, y, h = 20, col = [150, 150, 164]) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.box(X + 2, Y + 14 - h, 12, h, col, INK); c.rect(X + 3, Y + 15 - h, 3, h - 2, mix(col, WHITE, 0.4)); c.rect(X + 2, Y + 14 - h, 12, 2, WHITE); }
// A row of dark tree crowns (a forest edge) over pixel rows y0..y1.
function treeline(p, c, x0, x1, y0, y1, col, seed) { c.rect(x0, y0, x1 - x0, y1 - y0, mix(col, [0, 0, 0], 0.55)); for (let x = x0 - 6; x < x1; x += 13) { const r = 11 + p.hash(x, 1, seed) * 6, y = y1 - 8 - p.hash(x, 2, seed) * 10; c.ellipse(x + 8, y, r, r, mix(col, [0, 0, 0], 0.3)); c.ellipse(x + 6, y - 3, r - 4, r - 4, col); c.ellipse(x + 3, y - 6, 3, 2, mix(col, WHITE, 0.25)); c.rect(x + 7, y1 - 6, 3, 6, [70, 50, 40]); } }

// The Slumbering Weald's altar: the misty clearing, the pond, the ruined arch and the rusted sword and shield.
PLANS.GalarWealdShrine = {
  theme: { room: "arena", floor: "shade", wall: null, top: 5, bottom: 18 },
  plan(p) {
    p.fill("water", 1, 5, 5, 9); p.fill("water", 15, 5, 20, 8); p.fill("ruinFloor", 7, 6, 13, 10); p.fill("ruinFloor", 10, 11, 11, 15);
    p.fill("flowersBlue", 2, 11, 4, 12); p.fill("flowersBlue", 15, 15, 16, 16); p.fill("flowersBlue", 5, 16, 7, 17);
    p.block(6, 5, 9, 1); p.block(9, 6, 3, 1);
    for (const [x, y] of [[1, 14], [19, 9], [7, 12]]) p.decor("tree1", x, y, { optional: true });
    p.paint(0, (c) => {
      treeline(p, c, T, 21 * T, T, 5 * T, [40, 90, 80], 3);
      frame(c, 7 * T, 6 * T, 7 * T, 5 * T, [110, 116, 120], 2);
      for (let y = 11; y <= 15; y++) c.rect(10 * T, y * T + 14, 2 * T, 2, [96, 100, 110]);
    });
    p.paint(6, (c, top) => {
      // The three-arched ruin.
      for (const x of [6, 8.5, 11.5, 14]) { c.box(x * T + 2, 3 * T, 12, 3 * T, [150, 156, 150], INK); c.rect(x * T + 4, 3 * T + 2, 3, 3 * T - 4, [196, 200, 192]); c.rect(x * T + 3, 4 * T + 6, 6, 5, [90, 130, 90]); }
      for (const [x0, x1, h] of [[6, 8.5, 0], [8.5, 11.5, -10], [11.5, 14, 0]]) { top.box(x0 * T + 2, 3 * T - 8 + h, (x1 - x0) * T + 12, 10, [160, 166, 160], INK); top.rect(x0 * T + 3, 3 * T - 7 + h, (x1 - x0) * T + 10, 3, [206, 210, 202]); top.rect(x0 * T + 14, 3 * T + 2 + h, (x1 - x0) * T - 12, 2, [90, 130, 90]); }
      // The altar with the rusted sword and shield.
      c.box(9 * T, 6 * T, 3 * T, 12, [140, 146, 150], INK); c.rect(9 * T + 1, 6 * T + 1, 3 * T - 2, 3, [200, 204, 206]);
      c.rect(10 * T - 2, 5 * T + 4, 2, 14, [150, 110, 80]); c.rect(10 * T - 5, 5 * T + 12, 8, 2, [120, 84, 60]); c.ellipse(11 * T + 4, 6 * T, 6, 7, [130, 96, 70]); c.ellipse(11 * T + 4, 6 * T, 3, 4, [170, 130, 96]);
      glow(c, 10.5 * T, 6 * T, 26, [200, 230, 250], 18);
    });
    p.paint(99, (c, top) => fog(p, top, 1, 5, 21, 19, 34, 7));
  },
};

// The Towers of Two Fists: the top floor (compared with Pokéarth's 5F pictures). A closed log hall with paper
// windows, the hanging scroll between two red lanterns, the master's mat, and a grey battle court on painted
// boards: blue-violet in the Tower of Waters, crimson in the Tower of Darkness.
function towerTop(water) {
  const boardA = water ? [98, 96, 164] : [160, 62, 78], boardB = water ? [84, 82, 148] : [142, 52, 68], seam = water ? [60, 58, 112] : [104, 36, 50];
  const LOG = [146, 100, 66], LOG2 = [112, 74, 48], WOOD = [96, 62, 44], PAPER = [244, 236, 222];
  return {
    theme: { room: "arena", floor: "deck", wall: null, top: 7 },
    plan(p) {
      p.block(11, 7, 3, 1); p.block(1, 8, 2, 2); p.block(21, 8, 2, 3);
      p.paint(0, (c) => {
        // The log wall and its paper windows.
        for (let y = T; y < 7 * T; y += 12) { c.rect(T, y, 22 * T, 12, LOG); c.rect(T, y, 22 * T, 2, mix(LOG, WHITE, 0.25)); c.rect(T, y + 9, 22 * T, 3, LOG2); }
        for (const [x0, w] of [[2, 5], [9, 7], [18, 4]]) {
          const X = x0 * T, Y = T + 10, W = w * T, H = 4 * T + 4;
          c.box(X - 3, Y - 3, W + 6, H + 6, WOOD, INK); c.rect(X, Y, W, H, PAPER);
          for (let x = X + 11; x < X + W; x += 12) c.rect(x, Y, 1, H, WOOD); for (let y = Y + 11; y < Y + H; y += 12) c.rect(X, y, W, 1, WOOD);
        }
        c.rect(T, 7 * T - 5, 22 * T, 5, WOOD); c.rect(T, 7 * T - 6, 22 * T, 1, [56, 36, 28]);
        // The scroll and the two lanterns.
        c.rect(11 * T + 2, T + 2, 3 * T - 4, 4, [44, 30, 26]); c.box(11 * T + 6, T + 4, 3 * T - 12, 5 * T - 2, [150, 152, 164], [44, 30, 26]); c.rect(11 * T + 6, T + 4, 3 * T - 12, 5, [60, 40, 36]); c.rect(11 * T + 6, 6 * T - 5, 3 * T - 12, 5, [60, 40, 36]);
        const G = [236, 190, 60], sx = 12.5 * T;
        if (water) { for (let k = 0; k < 4; k++) { c.line(sx - 8, 2 * T + 2 + k * 14, sx + 8, 2 * T - 2 + k * 14, G, 3); c.line(sx + 8, 2 * T - 2 + k * 14, sx - 6, 2 * T + 10 + k * 14, G, 2); } }
        else { for (let k = 0; k < 3; k++) { c.rect(sx - 9, 2 * T + k * 18, 18, 3, G); c.rect(sx - 2, 2 * T + k * 18, 3, 12, G); c.rect(sx - 9, 2 * T + 9 + k * 18, 12, 3, G); } }
        for (const lx of [9.5, 15.5]) { const X = lx * T, Y = 3 * T + 4; c.rect(X, T, 1, Y - T - 14, [60, 56, 60]); glow(c, X, Y, 34, [255, 120, 60], 24); c.ellipse(X, Y, 11, 15, [150, 40, 24]); c.ellipse(X, Y, 10, 14, [244, 100, 40]); for (let k = -10; k <= 10; k += 5) c.rect(X - 9 + Math.abs(k) / 3, Y + k, 18 - Math.abs(k) / 1.5, 1, [250, 160, 80]); c.rect(X - 5, Y - 16, 10, 3, [50, 36, 32]); c.rect(X - 5, Y + 13, 10, 3, [50, 36, 32]); }
        // Painted floorboards.
        for (let y = 7; y <= 19; y++) { floorRow(c, 1, 22, y, y & 1 ? boardA : boardB); if (y < 19) c.rect(T, y * T + 15, 22 * T, 1, seam); for (let x = T + ((y * 7) % 5) * 16; x < 23 * T; x += 80) if (y < 19 || x < 11 * T || x > 14 * T) c.rect(x, y * T, 1, 15, seam); }
        // The battle court.
        c.rect(5 * T, 10 * T, 14 * T, 8 * T, [108, 108, 122]); c.rect(5 * T, 10 * T, 14 * T, 8 * T, [0, 0, 0, 20]);
        court(c, 5, 10, 18, 17, [108, 108, 122]);
      });
      // The master's mat and cushions.
      p.paint(8, (c) => { c.box(10 * T + 4, 7 * T + 2, 5 * T - 8, 12, [226, 180, 80], [120, 86, 40]); c.rect(10 * T + 6, 7 * T + 4, 5 * T - 12, 2, [250, 220, 130]); for (let k = 0; k < 4; k++) c.box(13 * T, 7 * T + 2 - k * 4, 14, 5, k & 1 ? [200, 60, 60] : [60, 70, 170], INK); });
      // The carved cabinet on the left, the wooden screen on the right.
      p.paint(10, (c, top) => { const X = T, Y = 8 * T; c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 70]); c.box(X + 1, Y - 10, 30, 40, [120, 80, 56], INK); c.rect(X + 3, Y - 8, 26, 3, [170, 124, 86]); c.ellipse(X + 16, Y + 10, 10, 10, [84, 54, 40]); c.ellipse(X + 16, Y + 10, 10, 10, [170, 124, 86], 1); c.ellipse(X + 16, Y + 10, 4, 4, [170, 124, 86]); c.rect(X + 1, Y + 25, 30, 4, [84, 54, 40]); });
      p.paint(11, (c, top) => { const X = 21 * T, Y = 8 * T; c.box(X + 2, Y - 8, 2 * T - 4, 3 * T + 6, [150, 108, 76], INK); for (let x = X + 8; x < X + 2 * T - 4; x += 6) c.rect(x, Y - 6, 1, 3 * T + 2, [104, 70, 50]); c.rect(X + 2, Y - 8, 2 * T - 4, 3, [190, 146, 104]); c.rect(X + 2, Y + 18, 2 * T - 4, 2, [104, 70, 50]); });
    },
  };
}
PLANS.GalarTowerWaters = towerTop(true);
PLANS.GalarTowerDarkness = towerTop(false);

// Honeycalm Island: a sandy islet in the Honeycalm Sea with the great honey tree at its heart.
PLANS.GalarHoneycalmIsland = {
  theme: { room: "arena", floor: "beach", wall: null, top: 3, bottom: 18 },
  plan(p) {
    p.fill("sea", 1, 3, 20, 18); p.disc("beach", 11, 12, 9.4, 6.6); p.fill("beach", 9, 15, 20, 18); p.disc("grass", 11.5, 10.5, 6, 4);
    p.fill("flowersRed", 7, 12, 8, 13); p.fill("flowersRed", 15, 9, 16, 10);
    p.block(11, 6, 3, 3);
    for (const [x, y] of [[3, 11], [18, 13]]) p.decor("boulder", x, y, { optional: true });
    p.paint(0, (c) => {
      c.rect(T, T, 20 * T, 2 * T, [150, 210, 240]); for (let k = 0; k < 6; k++) c.ellipse(T + 24 + k * 56, T + 10 + (k % 2) * 6, 22, 6, [240, 246, 252]); c.rect(T, 3 * T - 4, 20 * T, 4, [70, 140, 200]);
    });
    p.paint(9, (c, top) => {
      const X = 12.5 * T, Y = 9 * T;
      c.ellipse(X, Y - 2, 30, 8, [0, 0, 0, 60]); c.poly([[X - 22, Y], [X - 12, Y - 3 * T], [X + 12, Y - 3 * T], [X + 22, Y]], [96, 66, 44]); c.poly([[X - 14, Y], [X - 8, Y - 3 * T], [X, Y - 3 * T], [X - 2, Y]], [140, 100, 66]);
      c.ellipse(X + 5, Y - 18, 6, 9, [60, 40, 30]); c.ellipse(X + 5, Y - 16, 4, 6, [250, 190, 60]); c.rect(X + 4, Y - 10, 2, 8, [250, 200, 80]); c.ellipse(X + 5, Y - 2, 5, 2, [250, 200, 80]);
      for (const [dx, dy, r] of [[0, -70, 46], [-40, -56, 30], [40, -56, 30], [-22, -84, 28], [24, -86, 28], [0, -100, 24]]) { top.ellipse(X + dx, Y + dy + 4, r, r * 0.8, [40, 96, 50]); top.ellipse(X + dx - 2, Y + dy, r - 3, r * 0.8 - 3, [70, 140, 70]); top.ellipse(X + dx - r * 0.3, Y + dy - r * 0.3, r * 0.4, r * 0.25, [110, 176, 90]); }
      for (const [dx, dy] of [[-30, -44], [28, -50], [-6, -40], [12, -92], [-34, -70]]) { top.ellipse(X + dx, Y + dy, 5, 6, [226, 160, 40]); top.ellipse(X + dx - 1, Y + dy - 1, 3, 4, [250, 210, 90]); top.rect(X + dx - 5, Y + dy - 1, 10, 1, [170, 110, 30]); }
    });
  },
};

// The Max Lair (compared with Pokéarth's picture): a bare sandy cavern, the researchers' camp spread along the
// rock wall (crates, cones, the green read-out board, lamps) and the dark tunnel into the den at the back.
PLANS.GalarMaxLair = {
  theme: { room: "arena", floor: "dirt", wall: null, top: 7 },
  plan(p) {
    const crates = [[2, 8], [3, 8], [20, 12], [5, 17]], cones = [[4, 10], [19, 9], [16, 8], [7, 8]], lamps = [[8, 7], [16, 7]];
    p.block(17, 7, 3, 1);
    for (const [x, y] of [...crates, ...cones]) p.block(x, y, 1, 1);
    p.decor("boulder", 1, 14, { optional: true }); p.decor("boulder", 20, 16, { optional: true });
    const ROCK = [150, 96, 60], ROCK2 = [116, 70, 48], SAND = [196, 150, 96];
    p.paint(0, (c) => {
      // The rock face.
      c.rect(T, T, 22 * T, 6 * T, ROCK2);
      for (let k = 0; k < 110; k++) { const rx = 6 + p.hash(k, 3, 8) * 10, x = T + rx + p.hash(k, 1, 8) * (22 * T - 2 * rx), y = T + 8 + p.hash(k, 2, 8) * (6 * T - 16); c.ellipse(x, y, rx, 3 + p.hash(k, 4, 8) * 5, k % 3 ? ROCK : [176, 118, 72]); }
      c.rect(T, T, 22 * T, 10, [70, 44, 36]); for (let x = T; x < 23 * T - 17; x += 18) c.poly([[x, T + 10], [x + 18, T + 10], [x + 6 + p.hash(x, 5, 8) * 6, T + 16 + p.hash(x, 6, 8) * 10]], [70, 44, 36]);
      // The tunnel: a tall dark cleft, faintly purple far inside.
      const X = 12.5 * T; c.poly([[X - 34, 7 * T], [X - 28, 3 * T], [X - 12, T + 8], [X + 10, T + 6], [X + 28, 3 * T - 4], [X + 34, 7 * T]], [84, 52, 44]);
      c.poly([[X - 26, 7 * T], [X - 22, 3 * T + 4], [X - 9, 2 * T], [X + 8, 2 * T - 2], [X + 22, 3 * T], [X + 26, 7 * T]], [58, 42, 62]);
      c.poly([[X - 15, 7 * T], [X - 13, 4 * T], [X - 4, 3 * T], [X + 5, 3 * T], [X + 13, 4 * T], [X + 15, 7 * T]], [38, 28, 48]); c.poly([[X - 7, 7 * T], [X - 6, 5 * T], [X, 4 * T + 4], [X + 6, 5 * T], [X + 7, 7 * T]], [24, 18, 34]);
      c.rect(T, 7 * T - 3, 22 * T, 3, [96, 60, 44]);
      // The cave's orange-brown earth, paler where it is trodden in front of the tunnel.
      for (let y = 7; y <= 19; y++) floorRow(c, 1, 22, y, [168, 104, 52, 120]);
      c.ellipse(X, 12 * T + 8, 8 * T, 4 * T, A(SAND, 50)); c.ellipse(X, 11 * T, 5 * T, 2.5 * T, A([226, 180, 110], 44));
      for (let k = 0; k < 40; k++) { const x = T + 4 + p.hash(k, 1, 4) * 21.5 * T, y = 7.3 * T + p.hash(k, 2, 4) * 12.4 * T; c.rect(x, y, 3 + p.hash(k, 3, 4) * 5, 1, [140, 100, 64, 130]); }
      // The read-out board's cable.
      c.line(18.5 * T, 8 * T, 20 * T + 8, 12 * T, [40, 40, 50], 1);
    });
    p.paint(8, (c, top) => {
      // The green read-out board on its stand.
      const X = 17 * T, Y = 7 * T; c.rect(X + 6, Y - 2, 2, 16, [70, 60, 56]); c.rect(X + 3 * T - 8, Y - 2, 2, 16, [70, 60, 56]);
      glow(c, X + 24, Y - 12, 30, [90, 220, 120], 16); c.box(X + 2, Y - 24, 3 * T - 4, 24, [30, 60, 44], [70, 60, 56]); for (let k = 0; k < 4; k++) c.rect(X + 6, Y - 20 + k * 5, 14 + ((k * 7) % 3) * 8, 2, [110, 230, 140]); c.rect(X + 34, Y - 20, 6, 12, [110, 230, 140]);
    });
    for (const [x, y] of lamps) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T; glow(c, X, Y - 4, 30, [255, 210, 120], 22); c.rect(X - 1, Y - 18, 2, 18, [70, 60, 56]); c.box(X - 4, Y - 26, 8, 9, [255, 236, 170], [70, 60, 56]); });
    for (const [x, y] of crates) p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 70]); c.box(X + 1, Y, 14, 14, [176, 130, 80], [86, 58, 36]); c.rect(X + 2, Y + 1, 12, 2, [214, 170, 110]); c.line(X + 2, Y + 3, X + 13, Y + 12, [120, 84, 50], 1); c.rect(X + 1, Y + 6, 14, 1, [120, 84, 50]); });
    for (const [x, y] of cones) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T; c.ellipse(X, Y + 14, 6, 2, [0, 0, 0, 70]); c.poly([[X - 5, Y + 13], [X + 5, Y + 13], [X + 1, Y + 1], [X - 1, Y + 1]], [236, 96, 40]); c.rect(X - 3, Y + 7, 6, 2, WHITE); c.rect(X - 6, Y + 13, 12, 2, [200, 70, 30]); });
  },
};

// The Old Cemetery of the Crown Tundra: snow, rows of weathered graves, the path to the great memorial.
PLANS.GalarOldCemetery = {
  theme: { room: "arena", floor: "snow", wall: null, top: 4, bottom: 17 },
  plan(p) {
    const graves = []; for (const y of [6, 9, 12, 16]) for (const x of [3, 5, 7, 15, 17, 19]) if (!(x === 17 && y === 12)) graves.push([x, y]);
    p.fill("frostpath", 10, 5, 12, 17); p.fill("frostpath", 2, 14, 19, 14);
    for (const [x, y] of graves) p.block(x, y, 1, 1);
    p.block(10, 4, 3, 1); p.block(1, 4, 2, 1); p.block(19, 4, 2, 1);
    p.paint(0, (c) => {
      c.rect(T, T, 20 * T, 3 * T, [90, 110, 150]); treeline(p, c, T, 21 * T, T + 4, 3 * T + 4, [120, 150, 170], 6);
      c.rect(T, 3 * T + 2, 20 * T, 14, [130, 134, 150]); for (let x = T; x < 21 * T; x += 12) c.rect(x, 3 * T + 2, 1, 14, [96, 100, 118]); c.rect(T, 3 * T, 20 * T, 4, WHITE);
      for (let x = T + 3; x < 21 * T; x += 5) { c.rect(x, 2 * T + 6, 1, 12, [50, 50, 64]); c.p(x, 2 * T + 5, [90, 90, 104]); } c.rect(T, 2 * T + 9, 20 * T, 1, [50, 50, 64]);
    });
    for (const [x, y] of graves) p.paint(y + 1, (c) => { const X = x * T, Y = y * T, kind = Math.floor(p.hash(x, y, 2) * 3); c.ellipse(X + 8, Y + 13, 8, 3, [90, 110, 150, 110]);
      if (kind === 0) { c.box(X + 6, Y - 4, 4, 18, [150, 152, 164], INK); c.box(X + 2, Y, 12, 4, [150, 152, 164], INK); }
      else { c.box(X + 2, Y + 2, 12, 12, [150, 152, 164], INK); c.ellipse(X + 8, Y + 3, 6, 5, INK); c.ellipse(X + 8, Y + 3, 5, 4, [150, 152, 164]); c.rect(X + 5, Y + 5, 6, 1, [96, 98, 112]); c.rect(X + 5, Y + 8, 6, 1, [96, 98, 112]); }
      c.rect(X + 3, Y + (kind ? -2 : -4), kind ? 10 : 4, 2, WHITE); c.rect(X + 1, Y + 13, 14, 2, WHITE); });
    p.paint(5, (c, top) => {
      const X = 11.5 * T, Y = 5 * T; c.box(10 * T, Y - 10, 3 * T, 10, [130, 134, 150], INK); c.rect(10 * T + 1, Y - 12, 3 * T - 2, 3, WHITE);
      c.box(X - 8, Y - 44, 16, 36, [160, 164, 180], INK); c.rect(X - 6, Y - 42, 4, 32, [200, 204, 216]); c.poly([[X - 10, Y - 44], [X + 10, Y - 44], [X, Y - 56]], [130, 134, 150]); c.rect(X - 6, Y - 46, 12, 2, WHITE); c.ellipse(X, Y - 28, 4, 4, [90, 60, 130]); glow(c, X, Y - 28, 22, [150, 110, 220], 22);
      for (const x of [1, 19]) { const tx = x * T + 16; c.rect(tx - 2, 2 * T, 5, 3 * T - 2, [70, 56, 56]); for (const [dx, dy] of [[-12, -4], [10, -8], [-8, -16], [12, -20], [0, -24]]) c.line(tx, 3 * T + dy + 6, tx + dx, 3 * T + dy - 4, [70, 56, 56], 2); c.rect(tx - 12, 2 * T + 4, 6, 1, WHITE); c.rect(tx + 6, 2 * T, 6, 1, WHITE); }
    });
    p.paint(99, (c, top) => fog(p, top, 1, 4, 21, 18, 26, 9, [220, 226, 250]));
  },
};

// Split-Decision Ruins, off Three-Point Pass: the two dot patterns on the floor, electric to the left, dragon to the right.
PLANS.GalarThreePointPass = {
  theme: { room: "arena", floor: "ruinFloor", wall: null, top: 4, bottom: 16 },
  plan(p) {
    const statues = [[2, 5], [19, 5], [2, 15], [19, 15], [9, 5], [14, 5]];
    for (const [x, y] of statues) p.block(x, y, 1, 1);
    const E = [[0, 0], [2, 0], [4, 0], [1, 1.5], [3, 1.5], [0, 3], [2, 3], [4, 3]], D = [[0, 0], [4, 0], [1, 1], [3, 1], [2, 2], [2, 3], [1, 3.6], [3, 3.6]];
    p.paint(0, (c) => {
      // The wall: dotted script and the sealed door.
      for (let k = 0; k < 40; k++) { const x = T + 8 + (k % 20) * 16, y = 2 * T + 8 + Math.floor(k / 20) * 10; if (x > 9.5 * T && x < 13.5 * T) continue; for (let d = 0; d < 6; d++) if (p.hash(k, d, 3) > 0.45) c.rect(x + (d % 2) * 3, y + Math.floor(d / 2) * 3, 2, 2, [70, 70, 86]); }
      c.box(10 * T, 2 * T - 2, 3 * T, 2 * T + 2, [96, 96, 112], INK); c.rect(11.5 * T, 2 * T, 1, 2 * T, INK); c.ellipse(10.8 * T, 3 * T, 4, 4, [250, 220, 90]); c.ellipse(12.2 * T, 3 * T, 4, 4, [226, 70, 70]);
      // The two patterns.
      for (const [dots, x0, col] of [[E, 3, [250, 220, 90]], [D, 14, [226, 70, 70]]]) {
        c.box(x0 * T - 6, 7 * T - 6, 5 * T + 12, 5 * T + 12, [110, 110, 126], [60, 60, 76]); frame(c, x0 * T - 3, 7 * T - 3, 5 * T + 6, 5 * T + 6, A(col, 170), 1);
        for (const [dx, dy] of dots) { const X = (x0 + dx) * T + 8, Y = (7.4 + dy) * T + 8; glow(c, X, Y, 12, col, 30); c.ellipse(X, Y, 6, 6, [50, 50, 64]); c.ellipse(X, Y, 4, 4, col); c.ellipse(X - 1, Y - 1, 1, 1, WHITE); }
      }
      c.ellipse(12.5 * T - 8, 10 * T, 22, 16, [150, 146, 170, 120]); c.ellipse(12.5 * T - 8, 10 * T, 22, 16, [220, 214, 160, 200], 2);
      for (let y = 5; y <= 16; y++) c.rect(11 * T, y * T, 1, T, [130, 128, 146, 120]);
    });
    statues.forEach(([x, y], k) => p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T, col = k > 3 ? [150, 150, 164] : (x < 10 ? [250, 220, 90] : [226, 70, 70]);
      if (k > 3) { stone(c, x, y, 26); for (let d = 0; d < 6; d++) c.rect(X + 5 + (d % 2) * 4, Y - 8 + Math.floor(d / 2) * 4, 2, 2, [70, 70, 86]); }
      else { glow(c, X + 8, Y - 2, 20, col, 26); c.ellipse(X + 8, Y + 13, 7, 3, [0, 0, 0, 70]); c.box(X + 4, Y + 2, 8, 12, [130, 130, 146], INK); c.box(X + 2, Y - 2, 12, 5, [150, 150, 164], INK); flame(top, X + 8, Y - 1, 0.8); } }));
  },
};

// The Crown Shrine's sacred arena: a round stone dais in the snow at the foot of the giant tree, ringed by standing stones.
PLANS.GalarCalyrexArena = {
  theme: { room: "arena", floor: "snow", wall: null, top: 5, bottom: 17 },
  plan(p) {
    const stones = [[4, 7], [18, 7], [2, 11], [20, 11], [4, 15], [18, 15]], G = [110, 230, 200];
    p.disc("ruinFloor", 11.5, 10.5, 6.2, 4.6); p.fill("ruinFloor", 10, 14, 12, 17);
    p.fill("flowersBlue", 1, 16, 3, 17); p.fill("flowersBlue", 18, 16, 20, 17); p.fill("flowersBlue", 6, 5, 7, 5); p.fill("flowersBlue", 15, 5, 16, 5);
    for (const [x, y] of stones) p.block(x, y, 1, 1);
    p.block(9, 5, 5, 1);
    p.paint(0, (c) => {
      // Night sky and aurora behind the tree.
      c.rect(T, T, 20 * T, 4 * T, [30, 40, 90]); for (let k = 0; k < 40; k++) c.p(T + p.hash(k, 1, 5) * 20 * T, T + p.hash(k, 2, 5) * 3 * T, [240, 244, 255]);
      for (let k = 0; k < 5; k++) c.ellipse(T + 30 + k * 64, 2 * T + (k % 2) * 10, 40, 6, [110, 230, 200, 60]);
      for (let k = 0; k < 6; k++) c.ellipse(T + 10 + k * 60, 5 * T, 44, 16, k % 2 ? [236, 242, 250] : [206, 220, 240]);
      // The dais.
      const X = 11.5 * T, Y = 10.5 * T; c.ellipse(X, Y, 6.4 * T, 4.8 * T, [120, 124, 140], 3); c.ellipse(X, Y, 5.2 * T, 3.8 * T, A(G, 150), 2); c.ellipse(X, Y, 3 * T, 2.2 * T, A(G, 90), 1);
      for (let a = 0; a < 8; a++) { const g = a * Math.PI / 4; c.line(X + Math.cos(g) * 3 * T, Y + Math.sin(g) * 2.2 * T, X + Math.cos(g) * 5.2 * T, Y + Math.sin(g) * 3.8 * T, A(G, 110)); }
      glow(c, X, Y - T, 40, G, 16);
    });
    p.paint(6, (c, top) => {
      const X = 11.5 * T, Y = 6 * T;
      c.poly([[X - 40, Y], [X - 20, Y - 2 * T], [X - 16, T], [X + 16, T], [X + 20, Y - 2 * T], [X + 40, Y]], [90, 70, 66]); c.poly([[X - 24, Y], [X - 10, Y - 2 * T], [X - 8, T], [X - 2, T], [X - 2, Y]], [130, 104, 92]); c.ellipse(X + 6, Y - 14, 7, 10, [50, 38, 44]);
      c.rect(X - 40, Y - 3, 80, 3, WHITE);
      for (const [dx, dy, r] of [[-70, -62, 34], [70, -62, 34], [-30, -76, 36], [32, -78, 36], [0, -86, 30], [-110, -50, 24], [110, -50, 24]]) { top.ellipse(X + dx, Y + dy + 4, r, r * 0.6, [30, 80, 90]); top.ellipse(X + dx, Y + dy, r - 3, r * 0.6 - 3, [60, 130, 130]); top.ellipse(X + dx - r * 0.2, Y + dy - r * 0.25, r * 0.5, r * 0.2, [236, 242, 250]); }
    });
    for (const [x, y] of stones) p.paint(y + 1, (c) => { glow(c, x * T + 8, y * T + 2, 18, G, 22); stone(c, x, y, 24, [140, 146, 160]); c.rect(x * T + 7, y * T - 6, 2, 10, G); c.rect(x * T + 5, y * T - 2, 6, 2, G); });
  },
};

// Ballimere Lake: Dyna Tree Hill, the great red-leaved tree above the lake.
PLANS.GalarBallimereLake = {
  theme: { room: "arena", floor: "grass", wall: null, top: 4, bottom: 18 },
  plan(p) {
    p.disc("water", 4.5, 14.5, 3.6, 3.6); p.disc("water", 17.5, 7, 2.6, 2.2); p.disc("meadow", 12.5, 8.5, 5.5, 4);
    p.fill("flowersPink", 8, 13, 9, 14); p.fill("flowersPink", 14, 16, 16, 17); p.fill("flowersRed", 2, 6, 3, 7);
    p.block(11, 5, 3, 3); p.decor("tree1", 1, 8, { optional: true }); p.decor("tree1", 19, 10, { optional: true }); p.decor("boulder", 8, 16, { optional: true });
    p.paint(0, (c) => {
      c.rect(T, T, 20 * T, 3 * T, [160, 214, 240]); for (let k = 0; k < 5; k++) c.poly([[T + k * 70 - 20, 4 * T], [T + k * 70 + 26, T + 10 + (k % 2) * 8], [T + k * 70 + 76, 4 * T]], k % 2 ? [150, 180, 200] : [176, 200, 216]);
      treeline(p, c, T, 21 * T, 3 * T - 4, 4 * T, [70, 150, 80], 5);
      // The den by the shore.
      const X = 19 * T + 8, Y = 17 * T + 8; glow(c, X, Y, 22, [250, 80, 140], 26); c.ellipse(X, Y, 14, 10, [110, 90, 84]); c.ellipse(X, Y, 10, 7, [60, 30, 44]); c.ellipse(X, Y, 6, 4, [250, 90, 150]);
      for (let a = 0; a < 7; a++) { const g = a * 0.9; c.ellipse(X + Math.cos(g) * 14, Y + Math.sin(g) * 10, 3, 2, [150, 130, 120]); }
    });
    p.paint(8, (c, top) => {
      const X = 12.5 * T, Y = 8 * T, R = [226, 60, 110];
      c.ellipse(X, Y - 2, 30, 8, [0, 0, 0, 60]); c.poly([[X - 24, Y], [X - 10, Y - 3 * T], [X + 10, Y - 3 * T], [X + 24, Y]], [110, 76, 70]); c.poly([[X - 14, Y], [X - 6, Y - 3 * T], [X, Y - 3 * T], [X - 2, Y]], [156, 116, 100]);
      top.rect(X - 3, T, 6, 3 * T, [110, 76, 70]);
      for (const [dx, dy, r] of [[0, -74, 44], [-44, -58, 30], [44, -58, 30], [-24, -92, 26], [26, -92, 26], [0, -108, 20]]) { top.ellipse(X + dx, Y + dy + 4, r, r * 0.75, [150, 30, 80]); top.ellipse(X + dx - 2, Y + dy, r - 3, r * 0.75 - 3, R); top.ellipse(X + dx - r * 0.3, Y + dy - r * 0.3, r * 0.4, r * 0.22, [250, 130, 170]); }
      for (const [dx, dy] of [[-30, -46], [26, -52], [-4, -42], [44, -70], [-48, -72]]) { glow(top, X + dx, Y + dy, 9, [255, 220, 120], 40); top.ellipse(X + dx, Y + dy, 3, 4, [250, 220, 110]); }
    });
  },
};

// ---------------------------------------------------------------- caves (outdoor-style cavern maps)
// Carve a cave out of solid rock: `rooms` are [x0, y0, x1, y1] chambers and tunnels.
function carve(p, rooms) {
  p.fill("border", 1, 1, p.W - 2, p.H - 2); for (const [x0, y0, x1, y1] of rooms) p.fill("ground", x0, y0, x1, y1);
  const open = (x, y) => rooms.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  // The rock face above every open tile.
  p.paint(0, (c) => { for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) if (!open(x, y) && open(x, y + 1)) { const X = x * T, Y = y * T; c.rect(X, Y, T, T, [150, 110, 76]); c.rect(X, Y, T, 3, [196, 156, 110]); c.rect(X, Y + 12, T, 4, [100, 70, 52]); for (let k = 0; k < 3; k++) { const dx = Math.floor(p.hash(x, y, k + 1) * 14); c.rect(X + dx, Y + 3, 1, 5 + Math.floor(p.hash(x, y, k + 5) * 5), [116, 82, 58]); } if (!open(x - 1, y + 1)) c.rect(X, Y, 1, T, [100, 70, 52]); if (!open(x + 1, y + 1)) c.rect(X + 15, Y, 1, T, [100, 70, 52]); } });
}
function rails(c, pts) {
  for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4, hz = ay === by;
    for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (hz) c.rect(x - 1, y - 6, 2, 12, [120, 86, 56]); else c.rect(x - 6, y - 1, 12, 2, [120, 86, 56]); }
    const X0 = Math.min(ax, bx) * T + 8, Y0 = Math.min(ay, by) * T + 8, len = (Math.abs(bx - ax) + Math.abs(by - ay)) * T;
    for (const o of [-4, 3]) { if (hz) { c.rect(X0, Y0 + o, len, 2, [170, 176, 190]); c.rect(X0, Y0 + o + 1, len, 1, [96, 100, 116]); } else { c.rect(X0 + o, Y0, 2, len, [170, 176, 190]); c.rect(X0 + o + 1, Y0, 1, len, [96, 100, 116]); } } }
}
function cart(c, x, y, load) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 80]); c.box(X + 1, Y + 3, 14, 9, [110, 80, 60], INK); c.rect(X + 2, Y + 4, 12, 2, [150, 116, 86]); c.ellipse(X + 4, Y + 13, 2, 2, INK); c.ellipse(X + 12, Y + 13, 2, 2, INK); c.ellipse(X + 8, Y + 3, 6, 3, load); c.ellipse(X + 6, Y + 2, 2, 1, mix(load, WHITE, 0.5)); }
function props(c, top, x, y, w) { const X = x * T, Y = y * T; for (const dx of [0, (w - 1) * T + 10]) { c.box(X + dx, Y - 8, 6, 24, [150, 108, 62], [70, 46, 30]); } top.box(X - 2, Y - 14, w * T + 4, 7, [170, 124, 74], [70, 46, 30]); top.rect(X - 1, Y - 13, w * T + 2, 2, [200, 156, 100]); }
const GEMS = [[110, 200, 250], [250, 130, 200], [250, 220, 110], [130, 230, 160], [190, 140, 250]];
function gems(p, list, lamp) { for (const [x, y, k] of list) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const col = GEMS[k % GEMS.length]; glow(c, x * T + 8, y * T + 6, 18, col, 24); crystal(c, x * T + 5, y * T + 15, col, 1); crystal(c, x * T + 11, y * T + 15, mix(col, WHITE, 0.3), 0.7); }); } }

// Galar Mine: timbered galleries, the cart rails running through, gem seams glittering in the walls.
PLANS.GalarGalarMine = {
  theme: { density: 0.03, groves: 0 },
  plan(p) {
    carve(p, [[14, 26, 24, 31], [18, 19, 20, 26], [8, 12, 29, 19], [3, 6, 9, 16], [28, 14, 34, 24], [18, 5, 20, 12], [14, 3, 24, 7], [3, 22, 8, 30], [5, 16, 6, 22], [29, 4, 34, 9], [31, 9, 32, 14], [24, 5, 29, 6], [8, 27, 14, 28]]);
    gems(p, [[3, 6, 0], [9, 7, 1], [4, 12, 2], [3, 23, 3], [8, 24, 4], [4, 30, 0], [29, 4, 1], [34, 5, 2], [33, 9, 3], [34, 15, 4], [28, 22, 0], [33, 24, 1], [9, 12, 2], [28, 12, 3], [14, 3, 4], [24, 3, 0], [14, 31, 1], [24, 31, 2], [12, 19, 3], [25, 19, 4]]);
    p.block(22, 15, 1, 1); p.block(7, 10, 1, 1);
    p.paint(0, (c) => rails(c, [[19, 30], [19, 16], [6, 16], [6, 9]]));
    p.paint(0, (c) => rails(c, [[19, 16], [19, 4]])); p.paint(0, (c) => rails(c, [[19, 16], [31, 16], [31, 21]]));
    p.paint(16, (c) => cart(c, 22, 15, [110, 200, 250])); p.paint(11, (c) => cart(c, 7, 10, [250, 130, 200]));
    for (const [x, y, w] of [[18, 24, 3], [18, 21, 3], [18, 10, 3], [18, 7, 3]]) p.paint(y + 1, (c, top) => props(c, top, x, y, w));
  },
};

// Galar Mine No. 2: the flooded workings, rails skirting two underground pools.
PLANS.GalarGalarMine2 = {
  theme: { density: 0.03, groves: 0 },
  plan(p) {
    carve(p, [[13, 26, 25, 31], [18, 20, 20, 26], [6, 9, 31, 20], [18, 5, 20, 9], [14, 3, 24, 6], [27, 22, 34, 30], [29, 20, 31, 22], [3, 22, 9, 30], [5, 20, 7, 22], [28, 3, 34, 7], [31, 7, 32, 9], [24, 4, 28, 5]]);
    p.fill("water", 8, 14, 15, 18); p.fill("water", 23, 13, 29, 17); p.fill("water", 29, 25, 33, 28); p.fill("water", 4, 26, 7, 29);
    gems(p, [[6, 9, 0], [12, 9, 3], [26, 9, 1], [31, 10, 2], [6, 20, 4], [31, 19, 0], [3, 22, 1], [9, 23, 2], [27, 22, 3], [34, 23, 4], [28, 3, 0], [34, 6, 1], [14, 3, 2], [24, 3, 3], [13, 31, 4], [25, 31, 0], [16, 19, 1], [22, 19, 2]]);
    p.block(21, 11, 1, 1); p.block(10, 12, 1, 1);
    p.paint(0, (c) => rails(c, [[19, 30], [19, 11], [8, 11]])); p.paint(0, (c) => rails(c, [[19, 11], [19, 4]])); p.paint(0, (c) => rails(c, [[19, 11], [30, 11], [30, 9]]));
    p.paint(12, (c) => cart(c, 21, 11, [130, 230, 160])); p.paint(13, (c) => cart(c, 10, 12, [250, 220, 110]));
    for (const [x, y, w] of [[18, 24, 3], [18, 21, 3], [18, 8, 3], [18, 6, 3]]) p.paint(y + 1, (c, top) => props(c, top, x, y, w));
  },
};

// Brawlers' Cave: a damp cavern under the Isle of Armor, an underground stream crossed by a plank bridge.
PLANS.GalarBrawlersCave = {
  theme: { density: 0.04, groves: 0 },
  plan(p) {
    carve(p, [[12, 26, 26, 31], [17, 20, 21, 26], [5, 9, 32, 20], [13, 3, 25, 9], [3, 18, 8, 28], [28, 20, 34, 29], [3, 12, 5, 18], [32, 6, 34, 20], [25, 6, 32, 8]]);
    p.fill("water", 3, 15, 34, 16); p.fill("water", 6, 10, 10, 12); p.fill("water", 29, 24, 33, 28); p.fill("water", 4, 22, 6, 27);
    p.street("caveFloor", 3, [[19, 13], [19, 19]]);
    const spikes = [[5, 9], [11, 9], [27, 9], [12, 13], [26, 12], [8, 19], [15, 19], [23, 19], [30, 18], [13, 3], [25, 3], [12, 31], [26, 31], [8, 20], [28, 20], [16, 6], [22, 6]];
    for (const [x, y] of spikes) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 70]); c.poly([[X + 2, Y + 14], [X + 6, Y - 4], [X + 10, Y + 14]], [130, 100, 80]); c.poly([[X + 3, Y + 14], [X + 6, Y - 2], [X + 7, Y + 14]], [180, 146, 116]); c.poly([[X + 8, Y + 14], [X + 12, Y + 4], [X + 15, Y + 14]], [120, 92, 74]); }); }
    for (const [x, y] of [[7, 18], [30, 21], [22, 28], [28, 11]]) p.decor("boulder", x, y);
  },
};

// ---------------------------------------------------------------- Pokémon Centers
// A Galar Center: one long cafe-style wooden counter (shop tills, the healing machine, the nurse in front),
// the wooden Rotomi terminal, cafe tables and a rug in the town's colour.
function center(hue) {
  return {
    theme: { room: "center", top: 5 },
    plan(p) {
      p.block(2, 5, 16, 2); p.block(17, 8, 1, 1);
      p.decor("rGoods", 2, 3); p.decor("rGoods", 4, 3); p.decor("rBooks", 14, 3, { optional: true }); p.decor("rPlant", 1, 5, { optional: true }); p.decor("rPlant", 18, 5, { optional: true });
      p.decor("rSeats", 2, 12, { optional: true }); p.decor("rSeats", 15, 12, { optional: true }); p.decor("rPlant", 1, 14, { optional: true }); p.decor("rPlant", 18, 14, { optional: true });
      const tables = [[4, 9], [14, 10]]; for (const [x, y] of tables) p.block(x, y, 1, 1);
      p.paint(0, (c) => {
        const X = 10 * T, Y = 11 * T + 8; c.ellipse(X, Y, 44, 30, mix(hue, [0, 0, 0], 0.35)); c.ellipse(X, Y, 42, 28, hue); c.ellipse(X, Y, 34, 22, mix(hue, WHITE, 0.5), 2); c.ellipse(X, Y, 12, 9, WHITE); c.rect(X - 12, Y - 1, 24, 2, INK); c.ellipse(X, Y, 4, 3, INK); c.ellipse(X, Y, 2, 2, WHITE);
        // The striped awning over the counter.
        for (let x = 2 * T; x < 18 * T; x += 8) c.rect(x, 3 * T + 2, 8, 9, ((x / 8) & 1) ? hue : WHITE); c.rect(2 * T, 3 * T + 11, 16 * T, 2, mix(hue, [0, 0, 0], 0.4)); for (let x = 2 * T; x < 18 * T; x += 8) c.ellipse(x + 4, 3 * T + 12, 4, 3, ((x / 8) & 1) ? hue : WHITE);
      });
      p.paint(7, (c, top) => {
        c.box(2 * T, 5 * T, 16 * T, 2 * T - 3, [176, 124, 76], [80, 52, 34]); c.rect(2 * T + 1, 5 * T + 1, 16 * T - 2, 9, [214, 170, 116]); c.rect(2 * T + 1, 5 * T + 10, 16 * T - 2, 1, [130, 88, 54]); for (let x = 2 * T + 8; x < 18 * T; x += 16) c.rect(x, 5 * T + 12, 1, 16, [130, 88, 54]);
        // Tills, the healing machine, cups.
        for (const x of [3, 5]) { c.box(x * T + 2, 5 * T - 6, 12, 10, [70, 110, 190], INK); c.rect(x * T + 4, 5 * T - 4, 8, 4, [200, 236, 250]); }
        c.box(8 * T, 5 * T - 10, 3 * T, 16, [226, 230, 240], INK); c.rect(8 * T + 2, 5 * T - 8, 3 * T - 4, 3, [226, 70, 70]); for (let k = 0; k < 3; k++) { c.ellipse(8 * T + 9 + k * 15, 5 * T, 5, 5, INK); c.ellipse(8 * T + 9 + k * 15, 5 * T, 4, 4, WHITE); c.rect(8 * T + 5 + k * 15, 5 * T - 4, 9, 4, [226, 70, 70]); c.rect(8 * T + 5 + k * 15, 5 * T, 9, 1, INK); }
        for (const x of [12, 13]) { c.box(x * T + 4, 5 * T - 2, 7, 7, WHITE, [120, 120, 130]); c.rect(x * T + 11, 5 * T, 2, 3, [120, 120, 130]); c.rect(x * T + 5, 5 * T - 1, 5, 2, [150, 96, 60]); }
        c.box(15 * T, 5 * T - 8, 2 * T, 13, [40, 40, 50], INK); c.rect(15 * T + 2, 5 * T - 6, 2 * T - 4, 3, hue); c.rect(15 * T + 2, 5 * T - 1, 16, 2, WHITE);
      });
      // Rotomi.
      p.paint(9, (c, top) => { const X = 17 * T, Y = 8 * T; c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 70]); c.box(X + 1, Y - 12, 14, 26, [176, 124, 76], [80, 52, 34]); c.rect(X + 2, Y - 11, 3, 24, [214, 170, 116]); c.box(X + 3, Y - 9, 10, 9, [60, 180, 220], INK); c.rect(X + 5, Y - 6, 2, 2, WHITE); c.rect(X + 9, Y - 6, 2, 2, WHITE); c.rect(X + 6, Y - 3, 4, 1, WHITE); c.rect(X + 3, Y + 3, 10, 2, [130, 88, 54]); c.poly([[X + 6, Y - 12], [X + 8, Y - 18], [X + 10, Y - 12]], [250, 130, 50]); });
      for (const [x, y] of tables) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T; c.ellipse(X, Y + 13, 6, 2, [0, 0, 0, 70]); c.rect(X - 1, Y + 4, 3, 9, [110, 76, 50]); c.ellipse(X, Y + 3, 8, 5, [80, 52, 34]); c.ellipse(X, Y + 2, 7, 4, [214, 170, 116]); c.box(X - 2, Y - 1, 5, 4, WHITE, [120, 120, 130]); });
    },
  };
}
for (const [town, hue] of [["Motostoke", [214, 80, 60]], ["Turffield", [90, 170, 90]], ["Hulbury", [70, 130, 220]], ["Hammerlocke", [226, 140, 60]], ["Stow", [190, 150, 100]], ["Ballonlea", [236, 130, 190]], ["Circhester", [120, 190, 230]], ["Spikemuth", [200, 60, 150]], ["Wyndon", [140, 90, 200]], ["Armor", [240, 200, 80]], ["Crown", [90, 190, 180]]]) PLANS["Galar" + town + "Center"] = center(hue);

module.exports = PLANS;
