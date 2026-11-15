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
function rug(c, x0, y0, x1, y1, col, trim) { c.box(x0 * T + 2, y0 * T + 2, (x1 - x0 + 1) * T - 4, (y1 - y0 + 1) * T - 4, col, trim); c.box(x0 * T + 5, y0 * T + 5, (x1 - x0 + 1) * T - 10, (y1 - y0 + 1) * T - 10, col, mix(col, WHITE, 0.4)); }

// ---------------------------------------------------------------- Gym stadiums
const PLANS = {};

// Motostoke Stadium: Kabu's Fire Gym. A grass pitch with fenced tall-grass pens (the catching mission) and burners.
PLANS.GalarMotostokeStadium = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    p.fill("lawn", 3, 8, 20, 18);
    for (const [x, y] of [[4, 9], [17, 9], [4, 15], [15, 15]]) p.fill("tallgrass", x, y, x + 2, y + 1);
    for (const [x, y] of [[2, 8], [21, 8], [2, 16], [21, 15]]) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[226, 70, 50], [240, 150, 50], WHITE, [200, 50, 60], [250, 210, 90]], 3); boards(c, 1, 22, 6, [[214, 70, 44], [250, 190, 70], [60, 60, 76]]);
      for (let x = 3; x <= 20; x += 2) c.rect(x * T, 8 * T, T, 11 * T, [255, 255, 255, 22]);
      frame(c, 3 * T - 2, 8 * T - 2, 18 * T + 4, 11 * T + 4, [220, 80, 50], 2);
      court(c, 3, 8, 20, 18, [226, 70, 50]);
      for (const [x, y] of [[4, 9], [17, 9], [4, 15], [15, 15]]) { c.rect(x * T - 1, y * T - 1, 3 * T + 2, 1, [250, 220, 90]); c.rect(x * T - 1, (y + 2) * T, 3 * T + 2, 1, [250, 220, 90]); c.rect(x * T - 1, y * T - 1, 1, 2 * T + 2, [250, 220, 90]); c.rect((x + 3) * T, y * T - 1, 1, 2 * T + 2, [250, 220, 90]); }
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, [214, 60, 40], [250, 200, 70]);
    });
    for (const [x, y] of [[2, 8], [21, 8], [2, 16], [21, 15]]) p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T; glow(c, X + 8, Y + 4, 22, [250, 150, 50], 26); c.box(X + 1, Y + 5, 14, 10, [96, 98, 112], INK); c.rect(X + 3, Y + 7, 10, 2, [40, 40, 50]); c.rect(X + 3, Y + 11, 10, 1, [150, 152, 168]); flame(top, X + 8, Y + 6, 1); });
  },
};

// Turffield Stadium: Milo's Grass Gym. The Wooloo-herding course: fenced fields, gates, hay bales, and the pitch at the top.
PLANS.GalarTurffieldStadium = {
  theme: { room: "arena", floor: "grass", wall: null, top: 6, bottom: 31 },
  plan(p) {
    const fences = [[16, 17, 18], [22, 4, 5], [27, 29, 30]], bales = [[9, 18], [9, 19], [24, 20], [24, 21], [13, 23], [13, 24], [20, 25], [20, 26], [28, 23], [6, 29], [6, 30], [12, 29], [12, 30], [25, 28], [25, 29], [30, 30]];
    const sheep = [[5, 19], [21, 18], [30, 20], [8, 25], [17, 24], [26, 25], [9, 30], [22, 30], [28, 29], [15, 29]];
    p.fill("lawn", 7, 8, 28, 14);
    for (const x of [1, 34]) p.fill("flowersRed", x, 7, x, 31);
    p.fill("dirt", 17, 15, 18, 16); p.fill("dirt", 4, 22, 5, 22); p.fill("dirt", 29, 27, 30, 27);
    for (const [y, g0, g1] of fences) { p.block(1, y, g0 - 1, 1); p.block(g1 + 1, y, 34 - g1, 1); }
    for (const [x, y] of [...bales, ...sheep]) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 34, 4, [[90, 180, 90], [240, 220, 120], WHITE, [150, 200, 90], [226, 140, 90]], 5); boards(c, 1, 34, 5, [[70, 150, 70], [236, 206, 110], [120, 90, 60]]);
      for (let x = 7; x <= 28; x += 2) c.rect(x * T, 8 * T, T, 7 * T, [255, 255, 255, 26]);
      court(c, 7, 8, 28, 14, [90, 180, 90]);
      for (const x of [5, 12, 23, 30]) banner(c, x * T + 2, 4, 12, 22, [70, 150, 70], [250, 230, 120]);
    });
    for (const [y, g0, g1] of fences) p.paint(y + 1, (c, top) => {
      fenceH(c, 1, g0 - 1, y); fenceH(c, g1 + 1, 34, y);
      for (const x of [g0 - 1, g1 + 1]) { c.box(x * T + 4, y * T - 12, 8, 28, [196, 150, 90], [86, 58, 36]); top.box(x * T + 2, y * T - 16, 12, 5, [226, 70, 60], [110, 30, 34]); }
      top.rect((g0 - 1) * T + 8, y * T - 15, (g1 - g0 + 2) * T, 3, [226, 70, 60]);
    });
    for (const [x, y] of bales) p.paint(y + 1, (c) => bale(c, x, y));
    for (const [x, y] of sheep) p.paint(y + 1, (c) => wooloo(c, x, y));
  },
};

// Stow-on-Side Stadium: the spinning-cup ride. Big rotating cups on a pinball floor with bumpers.
PLANS.GalarStowStadium = {
  theme: { room: "arena", floor: "clay", wall: null, top: 7 },
  plan(p) {
    const cups = [[5, 10, 0], [18, 10, 1], [12, 14, 0], [5, 16, 1], [19, 17, 0]], bumpers = [[9, 8], [14, 8], [2, 13], [21, 13], [9, 18], [16, 12], [8, 12]];
    for (const [x, y] of cups) { p.disc("ornate", x + 0.5, y + 0.5, 2.6); p.block(x, y, 1, 1); }
    for (const [x, y] of bumpers) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[236, 150, 60], [150, 100, 200], WHITE, [200, 110, 50], [110, 80, 160]], 7); boards(c, 1, 22, 6, [[226, 140, 50], [130, 90, 190], [60, 60, 76]]);
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, x % 2 ? [226, 140, 50] : [130, 90, 190], WHITE);
      // The ball's rails between the cups.
      const P = cups.map(([x, y]) => [x * T + 8, y * T + 8]);
      for (const [a, b] of [[0, 2], [1, 2], [2, 3], [2, 4], [0, 3], [1, 4]]) { c.line(P[a][0], P[a][1], P[b][0], P[b][1], [250, 236, 180, 150], 3); c.line(P[a][0], P[a][1], P[b][0], P[b][1], [150, 110, 70, 160], 1); }
      for (const [x, y, k] of cups) {
        const X = x * T + 8, Y = y * T + 8, col = k ? [140, 100, 200] : [236, 150, 60];
        c.ellipse(X, Y, 42, 42, INK); c.ellipse(X, Y, 40, 40, mix(col, WHITE, 0.55)); c.ellipse(X, Y, 40, 40, col, 6); c.ellipse(X, Y, 26, 26, A(WHITE, 170), 2);
        for (let a = 0; a < 8; a++) { const ang = a * Math.PI / 4 + 0.3; c.poly([[X + Math.cos(ang) * 30, Y + Math.sin(ang) * 30], [X + Math.cos(ang + 0.3) * 37, Y + Math.sin(ang + 0.3) * 37], [X + Math.cos(ang + 0.12) * 24, Y + Math.sin(ang + 0.12) * 24]], WHITE); }
      }
    });
    for (const [x, y, k] of cups) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 8, col = k ? [140, 100, 200] : [236, 150, 60]; c.ellipse(X, Y + 5, 8, 4, [0, 0, 0, 70]); c.box(X - 3, Y - 8, 6, 14, [200, 200, 212], INK); top.ellipse(X, Y - 9, 8, 5, INK); top.ellipse(X, Y - 9, 7, 4, mix(col, [0, 0, 0], 0.2)); top.ellipse(X, Y - 10, 5, 2, [250, 236, 180]); });
    for (const [x, y] of bumpers) p.paint(y + 1, (c) => { const X = x * T + 8, Y = y * T + 8; c.ellipse(X, Y + 5, 8, 3, [0, 0, 0, 70]); c.ellipse(X, Y, 8, 7, INK); c.ellipse(X, Y, 7, 6, [250, 210, 70]); c.ellipse(X, Y - 1, 4, 3, [226, 70, 60]); c.ellipse(X - 1, Y - 2, 1, 1, WHITE); });
  },
};

// Ballonlea Stadium: Opal's Fairy Gym. A dark theatre: curtains, a spot-lit quiz stage, glowing mushrooms.
PLANS.GalarBallonleaStadium = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    const shrooms = [[3, 8, 0, 2], [20, 8, 1, 2], [2, 12, 1, 1], [21, 12, 0, 1], [3, 17, 0, 1], [20, 17, 1, 1], [8, 18, 1, 1], [16, 18, 0, 1], [6, 8, 1, 1], [17, 8, 0, 1]];
    p.fill("deck", 5, 9, 18, 16);
    for (const [x, y] of shrooms) p.block(x, y, 1, 1);
    for (const x of [7, 11, 15]) p.block(x, 9, 2, 1);
    p.paint(0, (c) => {
      // The curtain.
      c.rect(T, T, 22 * T, 6 * T, [60, 20, 70]);
      for (let x = T; x < 23 * T; x += 8) { c.rect(x, T, 4, 6 * T - 6, [150, 50, 130]); c.rect(x + 4, T, 2, 6 * T - 6, [110, 34, 104]); c.rect(x + 6, T, 2, 6 * T - 6, [80, 24, 84]); }
      for (let x = T; x < 23 * T; x += 32) { c.ellipse(x + 16, T, 17, 26, [200, 70, 150]); c.ellipse(x + 16, T, 17, 26, [250, 210, 110], 2); c.ellipse(x + 16, T - 4, 12, 18, [226, 100, 170]); }
      c.rect(T, 7 * T - 8, 22 * T, 3, [250, 210, 110]); for (let x = T + 2; x < 23 * T; x += 6) c.rect(x, 7 * T - 5, 2, 4, [250, 210, 110]);
      c.rect(T, 7 * T - 1, 22 * T, 1, INK);
      // The stage and its spotlights.
      c.rect(5 * T, 9 * T, 14 * T, 8 * T, [60, 20, 90, 150]); frame(c, 5 * T - 2, 9 * T - 2, 14 * T + 4, 8 * T + 4, [250, 210, 110], 2);
      for (let x = 5 * T + 4; x < 19 * T; x += 12) { c.ellipse(x, 9 * T - 1, 2, 2, [255, 244, 190]); c.ellipse(x, 17 * T, 2, 2, [255, 244, 190]); }
      for (const [x, y, col] of [[8.5, 13, [250, 150, 200]], [12.5, 12.5, [250, 240, 170]], [16.5, 13, [130, 220, 220]]]) { c.ellipse(x * T, y * T, 30, 20, A(col, 60)); c.ellipse(x * T, y * T, 20, 13, A(col, 80)); }
      for (let k = 0; k < 26; k++) { const x = (2 + p.hash(k, 1, 9) * 20) * T, y = (8 + p.hash(k, 2, 9) * 11) * T, col = k % 2 ? [250, 170, 220] : [150, 230, 230]; c.rect(x - 2, y, 5, 1, col); c.rect(x, y - 2, 1, 5, col); }
    });
    // The three quiz panels.
    [7, 11, 15].forEach((x, k) => p.paint(10, (c, top) => { const col = [[250, 110, 150], [250, 220, 110], [110, 200, 230]][k]; glow(c, x * T + 16, 9 * T + 6, 22, col, 24); c.box(x * T + 2, 9 * T - 6, 28, 20, [50, 30, 70], INK); c.box(x * T + 5, 9 * T - 3, 22, 11, col, WHITE); c.rect(x * T + 9, 9 * T, 14, 2, WHITE); c.rect(x * T + 9, 9 * T + 4, 9, 2, WHITE); }));
    for (const [x, y, k, big] of shrooms) p.paint(y + 1, (c, top) => mushroom(c, top, x, y, k ? [250, 130, 200] : [110, 230, 220], big === 2 ? 1.6 : 1));
  },
};

// Circhester Stadium: Gordie's sandstorm pitfall field (with Melony's ice round its rim).
PLANS.GalarCirchesterStadium = {
  theme: { room: "arena", floor: "desert", wall: null, top: 7 },
  plan(p) {
    const pits = [[4, 9], [5, 9], [9, 8], [10, 8], [15, 9], [19, 8], [20, 8], [7, 11], [12, 10], [17, 11], [18, 11], [3, 13], [4, 13], [9, 13], [10, 14], [19, 14], [20, 14], [6, 16], [7, 16], [11, 16], [16, 16], [17, 17], [4, 18], [20, 18], [9, 18], [14, 18], [16, 13]];
    const rocks = [[2, 10], [21, 10], [12, 12], [8, 15], [21, 16], [2, 16], [14, 15]];
    p.fill("snow", 1, 7, 22, 7); for (const x of [1, 22]) p.fill("snow", x, 7, x, 19);
    for (const [x, y] of [...pits, ...rocks]) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[150, 200, 236], [200, 170, 120], WHITE, [110, 150, 200], [170, 130, 90]], 11); boards(c, 1, 22, 6, [[110, 170, 220], [190, 150, 100], [60, 60, 76]]);
      for (const x of [4, 9, 14, 19]) banner(c, x * T + 2, 6, 12, 22, x % 2 ? [110, 170, 220] : [170, 130, 90], WHITE);
      frame(c, 2 * T - 2, 8 * T - 2, 20 * T + 4, 12 * T + 4, [150, 110, 70], 2);
      for (const [x, y] of pits) { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 8, 8, 7, [150, 112, 70]); c.ellipse(X + 8, Y + 9, 7, 6, [60, 40, 30]); c.ellipse(X + 8, Y + 10, 5, 4, [24, 16, 16]); }
    });
    for (const [x, y] of rocks) p.paint(y + 1, (c) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.poly([[X + 1, Y + 13], [X + 3, Y + 3], [X + 9, Y], [X + 14, Y + 5], [X + 15, Y + 13]], [110, 86, 70]); c.poly([[X + 3, Y + 12], [X + 4, Y + 4], [X + 9, Y + 1], [X + 10, Y + 8]], [176, 146, 116]); c.rect(X + 5, Y + 2, 5, 2, WHITE); });
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

// Hammerlocke Stadium: Raihan's vault. A round vault door in the back wall, strongboxes, and a double-battle court.
PLANS.GalarHammerlockeStadium = {
  theme: { room: "arena", floor: "cobble", wall: null, top: 7 },
  plan(p) {
    p.fill("steel", 3, 9, 20, 18); p.fill("cobble", 12, 5, 12, 6); p.bare(1);
    for (const x of [1, 4, 19, 21]) p.decor("rShelf", x, 5, { optional: true });
    for (const [x, y] of [[2, 10], [21, 10], [2, 14], [21, 14]]) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      // The vault wall.
      c.rect(T, T, 22 * T, 6 * T, [70, 80, 96]);
      for (let y = T; y < 7 * T; y += 12) { c.rect(T, y, 22 * T, 1, [50, 58, 72]); for (let x = T + ((y / 12) & 1) * 12; x < 23 * T; x += 24) c.rect(x, y, 1, 12, [50, 58, 72]); }
      c.rect(T, 7 * T - 4, 22 * T, 4, [44, 50, 62]); c.rect(T, T, 22 * T, 3, [120, 130, 150]);
      const X = 12.5 * T, Y = 4 * T + 6;
      c.ellipse(X, Y, 50, 46, INK); c.ellipse(X, Y, 48, 44, [200, 160, 70]); c.ellipse(X, Y, 42, 38, [110, 120, 140]); c.ellipse(X, Y, 42, 38, [60, 66, 84], 3); c.ellipse(X, Y, 30, 27, [150, 160, 180], 3);
      for (let a = 0; a < 12; a++) { const g = a * Math.PI / 6; c.ellipse(X + Math.cos(g) * 45, Y + Math.sin(g) * 41, 2, 2, [250, 220, 120]); }
      for (let a = 0; a < 4; a++) { const g = a * Math.PI / 2 + Math.PI / 4; c.line(X + Math.cos(g) * 12, Y + Math.sin(g) * 11, X + Math.cos(g) * 30, Y + Math.sin(g) * 27, [200, 160, 70], 3); }
      // The way through it.
      c.box(12 * T - 2, 4 * T - 4, T + 4, 3 * T + 4, [24, 22, 30], [200, 160, 70]); c.rect(12 * T, 5 * T, T, 2 * T, [96, 100, 116]); for (let y = 5 * T + 3; y < 7 * T; y += 5) c.rect(12 * T, y, T, 1, [150, 156, 172]);
      c.ellipse(X, 4 * T - 4, 10, 8, [200, 160, 70]); c.ellipse(X, 4 * T - 4, 6, 5, [226, 110, 50]);
      for (const x of [7, 17]) banner(c, x * T, T + 6, 16, 44, [40, 60, 110], [236, 130, 50]);
      // The court.
      frame(c, 3 * T - 2, 9 * T - 2, 18 * T + 4, 10 * T + 4, [200, 160, 70], 2);
      court(c, 3, 9, 20, 18, [236, 130, 50], [250, 230, 170], true);
    });
    for (const [x, y] of [[2, 10], [21, 10], [2, 14], [21, 14]]) p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T; c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.box(X + 1, Y - 2, 14, 16, [96, 110, 130], INK); c.rect(X + 3, Y, 10, 2, [150, 164, 184]); c.ellipse(X + 8, Y + 7, 4, 4, [200, 160, 70]); c.ellipse(X + 8, Y + 7, 2, 2, [60, 66, 84]); c.rect(X + 1, Y + 12, 14, 2, [60, 70, 90]); });
  },
};

// Wyndon Stadium: the Champion Cup pitch, under full stands.
PLANS.GalarWyndonStadium = {
  theme: { room: "arena", floor: "lawn", wall: null, top: 7 },
  plan(p) {
    for (const x of [1, 22]) p.fill("paving", x, 7, x, 19); p.fill("paving", 1, 7, 22, 7);
    p.paint(0, (c) => {
      stand(p, c, 1, 1, 22, 5, [[150, 80, 200], [250, 210, 90], WHITE, [226, 70, 70], [70, 130, 220], [90, 180, 110]], 13); boards(c, 1, 22, 6, [[110, 60, 170], [250, 200, 80], [200, 50, 60]]);
      // The big screen.
      c.box(9 * T, T - 4, 6 * T, 3 * T + 2, [24, 30, 60], [200, 200, 212]); c.rect(9 * T + 3, T - 1, 6 * T - 6, 3 * T - 4, [40, 70, 150]); c.ellipse(12 * T, 2 * T + 4, 14, 14, WHITE); c.rect(12 * T - 14, 2 * T + 4, 28, 14, [226, 70, 70]); c.ellipse(12 * T, 2 * T + 4, 14, 14, INK, 2); c.rect(12 * T - 14, 2 * T + 3, 28, 2, INK); c.ellipse(12 * T, 2 * T + 4, 4, 4, WHITE); c.ellipse(12 * T, 2 * T + 4, 4, 4, INK, 1);
      for (const x of [3, 6, 17, 20]) banner(c, x * T + 2, 6, 12, 24, [110, 60, 170], [250, 210, 90]);
      for (let y = 8; y <= 19; y += 2) c.rect(2 * T, y * T, 20 * T, T, [255, 255, 255, 26]);
      court(c, 2, 8, 21, 19, [150, 80, 200]);
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

// Rose Tower: Macro Cosmos's glass lobby, with the lift up to the summit.
PLANS.GalarRoseTower = {
  theme: { room: "arena", floor: "steel", wall: null, top: 7 },
  plan(p) {
    p.fill("steel", 12, 5, 12, 6); p.bare(1);
    const cols = [[4, 10], [19, 10], [4, 15], [19, 15]];
    for (const [x, y] of cols) p.block(x, y, 1, 1);
    p.block(6, 8, 3, 1); p.block(15, 8, 3, 1);
    for (const x of [1, 22]) { p.decor("rPlant", x, 7, { optional: true }); p.decor("rPlant", x, 18, { optional: true }); }
    p.decor("rSeats", 2, 16, { optional: true }); p.decor("rSeats", 19, 12, { optional: true });
    p.paint(0, (c) => {
      c.rect(T, T, 22 * T, 6 * T, [200, 206, 220]); c.rect(T, T, 22 * T, 4, [236, 240, 248]);
      for (const x of [1, 4, 7, 15, 18, 21]) skyline(p, c, x * T + 2, T + 8, 2 * T + 12 - (x === 21 ? 16 : 0), 4 * T, x);
      c.rect(T, 7 * T - 5, 22 * T, 5, [120, 126, 146]); c.rect(T, 7 * T - 6, 22 * T, 1, [226, 70, 70]);
      // The lift shaft.
      c.box(10 * T + 4, T - 4, 4 * T + 8, 6 * T + 4, [226, 232, 244], INK); c.rect(10 * T + 8, T, 4 * T, 3 * T, [150, 200, 230]); c.line(10 * T + 12, 3 * T + 12, 11 * T + 12, T + 2, A(WHITE, 150), 2); c.line(12 * T, 3 * T + 12, 13 * T + 8, T + 2, A(WHITE, 110), 2);
      lift(c, 11 * T + 2, 4 * T + 6, 2 * T + 12, 2 * T + 10, [226, 70, 70]); c.rect(12 * T, 5 * T, T, 2 * T, [70, 76, 96]); c.rect(12 * T + 1, 5 * T, T - 2, 2 * T, [226, 70, 70]);
      // Carpet and the Macro Cosmos mark.
      c.rect(11 * T, 7 * T, 3 * T, 13 * T, [190, 50, 60]); c.rect(11 * T, 7 * T, 2, 13 * T, [250, 210, 110]); c.rect(14 * T - 2, 7 * T, 2, 13 * T, [250, 210, 110]);
      for (const sx of [6.5, 18.5]) { const X = sx * T, Y = 13 * T; c.ellipse(X, Y, 30, 30, [226, 70, 70, 150], 3); c.poly([[X, Y - 22], [X + 19, Y + 11], [X - 19, Y + 11]], [226, 70, 70, 120]); c.poly([[X, Y - 10], [X + 9, Y + 6], [X - 9, Y + 6]], [220, 226, 240]); }
      for (let y = 8; y <= 19; y += 3) { c.rect(T + 4, y * T + 7, 9 * T, 1, [160, 220, 250, 150]); c.rect(14 * T + 4, y * T + 7, 8 * T + 8, 1, [160, 220, 250, 150]); }
    });
    for (const x of [6, 15]) p.paint(9, (c) => { desk(c, x, 8, 3, [226, 230, 240]); c.rect(x * T + 4, 8 * T - 12, 12, 8, [40, 70, 150]); c.rect(x * T + 9, 8 * T - 4, 2, 2, INK); c.rect((x + 2) * T, 8 * T - 4, 8, 3, [226, 70, 70]); });
    for (const [x, y] of cols) p.paint(y + 1, (c, top) => { const X = x * T; glow(c, X + 8, y * T + 8, 20, [226, 70, 70], 22); c.box(X + 2, y * T + 8, 12, 7, [90, 96, 116], INK); top.box(X + 4, y * T - 22, 8, 31, [220, 226, 240], INK); top.rect(X + 6, y * T - 20, 4, 27, [250, 110, 110]); top.rect(X + 7, y * T - 20, 1, 27, [255, 220, 220]); });
  },
};

// Hammerlocke Energy Plant: the reactor hall under the stadium, energy running along the floor to the lift.
PLANS.GalarEnergyPlant = {
  theme: { room: "arena", floor: "darkpave", wall: null, top: 7 },
  plan(p) {
    p.fill("steel", 12, 5, 12, 6); p.bare(1); p.fill("steel", 9, 9, 15, 15);
    const tanks = [[3, 9], [19, 9], [3, 15], [19, 15]], M = [250, 70, 170];
    for (const [x, y] of tanks) p.block(x, y, 2, 2);
    p.paint(0, (c) => {
      // Machinery along the back.
      c.rect(T, T, 22 * T, 6 * T, [50, 54, 70]);
      for (let x = T; x < 23 * T; x += 2 * T) { c.box(x + 2, T + 4, 2 * T - 4, 3 * T, [78, 84, 104], INK); for (let y = T + 8; y < 4 * T; y += 5) c.rect(x + 5, y, 2 * T - 10, 2, [44, 48, 62]); c.ellipse(x + 8, 4 * T + 10, 3, 3, p.hash(x, 1, 2) > 0.5 ? M : [110, 230, 200]); c.ellipse(x + 22, 4 * T + 10, 3, 3, [250, 220, 110]); }
      for (const y of [5 * T + 4, 6 * T]) { c.rect(T, y, 22 * T, 6, [120, 126, 146]); c.rect(T, y + 1, 22 * T, 1, [190, 196, 212]); for (let x = T + 10; x < 23 * T; x += 40) c.rect(x, y - 1, 4, 8, [70, 74, 92]); }
      c.rect(T, 7 * T - 4, 22 * T, 4, [30, 32, 44]);
      // The lift down to the chamber.
      c.box(11 * T - 2, 2 * T + 6, 3 * T + 4, 4 * T + 10, [60, 30, 70], M); glow(c, 12.5 * T, 5 * T, 30, M, 26); c.box(12 * T - 3, 4 * T - 4, T + 6, 3 * T + 4, [24, 16, 30], [250, 160, 220]); c.rect(12 * T, 5 * T, T, 2 * T, [90, 60, 110]); for (let y = 5 * T + 2; y < 7 * T; y += 4) c.rect(12 * T, y, T, 1, [250, 130, 200, 170]);
      // Hazard edging and the conduits.
      for (let x = T; x < 23 * T; x += 8) { c.rect(x, 7 * T, 4, 3, [250, 210, 70]); c.rect(x + 4, 7 * T, 4, 3, INK); }
      const cx = 12.5 * T, cy = 12.5 * T;
      for (const [x, y] of tanks) { const X = (x + 1) * T, Y = (y + 1) * T; for (const [w, col] of [[5, [40, 20, 50]], [3, M], [1, [255, 210, 240]]]) { c.line(X, Y, X, cy, col, w); c.line(X, cy, cx, cy, col, w); } }
      for (const [w, col] of [[5, [40, 20, 50]], [3, M], [1, [255, 210, 240]]]) c.line(cx, cy, cx, 7 * T, col, w);
      glow(c, cx, cy, 58, M, 26); c.ellipse(cx, cy, 50, 50, [40, 20, 50]); c.ellipse(cx, cy, 47, 47, [96, 100, 124]); c.ellipse(cx, cy, 47, 47, M, 3); c.ellipse(cx, cy, 34, 34, [70, 74, 96]); c.ellipse(cx, cy, 34, 34, [250, 160, 220], 2);
      for (let a = 0; a < 6; a++) { const g = a * Math.PI / 3; c.line(cx + Math.cos(g) * 14, cy + Math.sin(g) * 14, cx + Math.cos(g) * 32, cy + Math.sin(g) * 32, M, 2); }
      c.ellipse(cx, cy, 12, 12, M); c.ellipse(cx, cy, 7, 7, [255, 220, 240]);
    });
    for (const [x, y] of tanks) p.paint(y + 2, (c, top) => { const X = x * T, Y = y * T; glow(c, X + 16, Y + 12, 30, M, 22); c.ellipse(X + 16, Y + 27, 15, 5, [0, 0, 0, 80]); c.box(X + 2, Y - 8, 28, 36, [90, 96, 120], INK); c.rect(X + 4, Y - 6, 4, 32, [150, 156, 180]); c.box(X + 9, Y - 2, 14, 22, [60, 20, 60], INK); c.rect(X + 11, Y + 6, 10, 12, M); c.rect(X + 13, Y + 8, 3, 8, [255, 210, 240]); c.rect(X + 2, Y + 22, 28, 3, [250, 210, 70]); top.ellipse(X + 16, Y - 8, 14, 5, [130, 136, 160]); top.ellipse(X + 16, Y - 9, 10, 3, [190, 196, 214]); });
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

// The Towers of Two Fists: the top floor, a wooden dojo hall open to the sky, where Kubfu faces Mustard.
function towerTop(water) {
  const hue = water ? [70, 130, 220] : [150, 50, 70], dark = water ? [40, 70, 130] : [50, 30, 60], sky = water ? [150, 210, 240] : [70, 50, 100];
  return {
    theme: { room: "arena", floor: "deck", wall: null, top: 7 },
    plan(p) {
      const posts = [[4, 9], [19, 9], [4, 17], [19, 17]];
      if (water) { p.fill("water", 1, 8, 2, 19); p.fill("water", 21, 8, 22, 19); } else { p.fill("darkpave", 1, 8, 2, 19); p.fill("darkpave", 21, 8, 22, 19); }
      for (const [x, y] of posts) p.block(x, y, 1, 1);
      p.block(11, 7, 3, 1);
      p.paint(0, (c) => {
        // The open gallery: posts, railings and the sky.
        c.rect(T, T, 22 * T, 6 * T, sky);
        if (water) { for (let k = 0; k < 7; k++) c.ellipse(T + 20 + k * 52, 2 * T + (k % 2) * 8, 22, 7, [236, 244, 252]); c.rect(T, 4 * T + 8, 22 * T, 2 * T, [50, 110, 190]); for (let x = T; x < 23 * T; x += 12) c.rect(x + ((x / 12) & 1) * 4, 5 * T + 4, 6, 1, [200, 230, 250]); }
        else { for (let k = 0; k < 30; k++) c.p(T + p.hash(k, 1, 2) * 22 * T, T + p.hash(k, 2, 2) * 4 * T, [250, 240, 200]); c.ellipse(19 * T, 2 * T + 4, 12, 12, [250, 230, 170]); c.ellipse(19 * T + 5, 2 * T, 10, 10, sky); treeline(p, c, T, 23 * T, 4 * T + 8, 6 * T + 4, [50, 40, 80], 4); }
        c.rect(T, T, 22 * T, 10, [110, 60, 44]); c.rect(T, T + 10, 22 * T, 3, [70, 40, 30]);
        for (let x = 1; x <= 22; x += 3) { c.box(x * T + (x === 22 ? 4 : 0), T, 12, 6 * T, [170, 60, 50], [70, 30, 30]); }
        c.rect(T, 6 * T, 22 * T, 4, [110, 60, 44]); c.rect(T, 6 * T + 8, 22 * T, 3, [110, 60, 44]); for (let x = T + 4; x < 23 * T; x += 8) c.rect(x, 6 * T + 4, 2, 10, [150, 90, 60]); c.rect(T, 7 * T - 2, 22 * T, 2, [60, 36, 30]);
        // The hanging scroll.
        c.box(10 * T + 4, T + 6, 4 * T + 8, 5 * T, [240, 232, 210], INK); c.rect(10 * T + 4, T + 6, 4 * T + 8, 5, [110, 60, 44]); c.rect(10 * T + 4, 6 * T + 1, 4 * T + 8, 5, [110, 60, 44]);
        const X = 12.5 * T, Y = 4 * T;
        if (water) { for (let k = 0; k < 3; k++) { c.ellipse(X - 10 + k * 10, Y - 6 + k * 8, 12, 5, hue, 3); c.rect(X - 22 + k * 10, Y - 6 + k * 8, 12, 6, [240, 232, 210]); } c.ellipse(X, Y - 14, 5, 5, hue); }
        else { for (let k = -1; k <= 1; k++) c.poly([[X + k * 12 - 4, Y - 18], [X + k * 12 + 4, Y - 18], [X + k * 12 + 1, Y + 16]], hue); c.rect(X - 18, Y - 20, 36, 4, dark); }
        // The battle floor.
        c.rect(4 * T, 9 * T, 16 * T, 9 * T, A(hue, 46)); frame(c, 4 * T - 2, 9 * T - 2, 16 * T + 4, 9 * T + 4, dark, 2);
        court(c, 4, 9, 19, 17, hue, [250, 240, 214]);
      });
      p.paint(8, (c) => { c.box(11 * T, 7 * T - 4, 3 * T, 18, [110, 60, 44], INK); c.rect(11 * T + 1, 7 * T - 3, 3 * T - 2, 4, [170, 100, 70]); c.box(12 * T - 2, 7 * T - 12, T + 4, 9, [240, 232, 210], INK); c.rect(12 * T - 4, 7 * T - 13, 3, 11, hue); c.rect(13 * T + 1, 7 * T - 13, 3, 11, hue); });
      for (const [x, y] of posts) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T; glow(c, X, Y - 6, 22, water ? [150, 220, 250] : [200, 90, 220], 26); c.ellipse(X, Y + 13, 7, 3, [0, 0, 0, 70]); c.rect(X - 2, Y - 2, 4, 16, [90, 50, 40]); c.box(X - 5, Y + 10, 10, 5, [110, 60, 44], INK); top.box(X - 6, Y - 16, 12, 15, water ? [200, 236, 250] : [150, 80, 190], INK); top.rect(X - 7, Y - 18, 14, 3, [60, 36, 30]); top.rect(X - 2, Y - 12, 4, 7, water ? WHITE : [250, 200, 250]); });
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

// The Max Lair: the research camp at the mouth of the Dynamax tunnels.
PLANS.GalarMaxLair = {
  theme: { room: "arena", floor: "caveFloor", wall: null, top: 7 },
  plan(p) {
    p.fill("steel", 11, 7, 13, 19); p.fill("steel", 8, 12, 16, 15);
    p.decor("rMachine", 2, 5); p.decor("rMachine", 18, 5); p.decor("rStack", 6, 5, { optional: true }); p.decor("rStack", 15, 5, { optional: true });
    p.decor("rLabTable", 2, 11, { optional: true }); p.decor("rBench", 17, 11, { optional: true }); p.decor("rPC", 22, 6, { optional: true }); p.decor("boulder", 1, 15, { optional: true }); p.decor("boulder", 20, 16, { optional: true });
    const stars = [[5, 16], [18, 14], [3, 9], [20, 9], [7, 18], [17, 18]], M = [250, 70, 150];
    for (const [x, y] of stars) p.block(x, y, 1, 1);
    p.paint(0, (c) => {
      // The rock face and the tunnel mouth.
      c.rect(T, T, 22 * T, 6 * T, [96, 80, 76]);
      for (let k = 0; k < 90; k++) { const x = T + p.hash(k, 1, 8) * 22 * T, y = T + p.hash(k, 2, 8) * 6 * T; c.ellipse(x, y, 5 + p.hash(k, 3, 8) * 9, 3 + p.hash(k, 4, 8) * 4, k % 2 ? [120, 100, 92] : [76, 62, 62]); }
      c.rect(T, 7 * T - 4, 22 * T, 4, [56, 46, 48]);
      const X = 12.5 * T; glow(c, X, 5 * T, 80, M, 20); c.ellipse(X, 5 * T, 52, 62, [60, 46, 50]); c.ellipse(X, 5 * T + 4, 44, 54, [40, 10, 34]); c.ellipse(X, 5 * T + 10, 32, 40, [130, 24, 80]); c.ellipse(X, 5 * T + 16, 20, 26, [250, 90, 160]); c.ellipse(X, 5 * T + 20, 9, 14, [255, 200, 230]);
      c.rect(T, 7 * T, 22 * T, 1, [56, 46, 48]); c.rect(9 * T, 7 * T - 4, 7 * T, 4, [56, 46, 48]); c.rect(11 * T, 7 * T - 4, 3 * T, 4, [200, 206, 220]);
      // Walkway edging and cables.
      for (let y = 7 * T; y < 20 * T; y += 8) { c.rect(11 * T, y, 2, 4, [250, 210, 70]); c.rect(14 * T - 2, y, 2, 4, [250, 210, 70]); }
      frame(c, 8 * T, 12 * T, 9 * T, 4 * T, [250, 210, 70], 2); c.ellipse(X, 14 * T, 26, 26, A(M, 150), 3); c.ellipse(X, 14 * T, 14, 14, A(M, 90));
      for (const [x0, y0, x1, y1] of [[4, 9, 4, 11], [4, 11, 8, 13], [19, 9, 19, 11], [19, 11, 16, 13]]) c.line(x0 * T + 8, y0 * T, x1 * T + 8, y1 * T + 8, [40, 40, 50], 2);
    });
    for (const [x, y] of stars) p.paint(y + 1, (c) => { glow(c, x * T + 8, y * T + 6, 20, M, 26); crystal(c, x * T + 5, y * T + 15, [250, 90, 160], 1); crystal(c, x * T + 11, y * T + 15, [255, 160, 200], 0.7); });
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
