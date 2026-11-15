// kalos towns, drawn by hand. See README.md.
"use strict";
// ---- small hand-drawn pieces shared by the plans below (pixels; T = 16 per tile) ----
const T = 16;
const STONE = [[226, 220, 204], [196, 188, 170], [150, 142, 128], [96, 90, 84]];
// A stone wall face over the tile rectangle (solid).
function wall(p, x, y, w, h, pal = STONE) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, pal[1]); c.rect(px, py, pw, 3, pal[0]); c.rect(px, py + ph - 2, pw, 2, pal[3]); for (let j = 5; j < ph - 2; j += 6) { c.rect(px, py + j, pw, 1, pal[2]); for (let i = ((j / 6) & 1) * 6; i < pw; i += 12) c.rect(px + i, py + j - 5, 1, 5, pal[2]); } });
}
// A flight of steps over the tile rectangle (walkable).
function steps(p, x, y, w, h, pal = STONE) {
  p.paint(1, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, pal[1]); for (let j = 0; j < ph; j += 4) { c.rect(px, py + j, pw, 2, pal[0]); c.rect(px, py + j + 3, pw, 1, pal[2]); } c.rect(px, py, 2, ph, pal[3]); c.rect(px + pw - 2, py, 2, ph, pal[3]); });
}
// A rock face (cliff) over the tile rectangle (solid).
function cliff(p, x, y, w, h, pal = [[190, 170, 140], [160, 138, 110], [122, 102, 84], [84, 70, 62]]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, pal[1]); c.rect(px, py, pw, 3, pal[0]); c.rect(px, py + ph - 3, pw, 3, pal[3]); for (let i = 0; i < pw; i += 7) { const hh = 4 + Math.floor(p.hash(x * 16 + i, y, 5) * (ph - 8)); c.rect(px + i, py + 3, 1, hh, pal[2]); c.rect(px + i + 3, py + ph - 3 - hh / 2, 1, hh / 2, pal[2]); } });
}
// A gate arch spanning the tiles x0..x1 at row y: two pillars (solid) and a lintel that is walked under.
function arch(p, x0, x1, y, pal = STONE, roof = [150, 70, 60]) {
  p.block(x0, y, 1, 1); p.block(x1, y, 1, 1);
  p.paint(y + 1, (c, top) => { const py = y * T; for (const x of [x0, x1]) { c.box(x * T + 2, py - 14, 12, 30, pal[1], pal[3]); c.rect(x * T + 4, py - 12, 3, 26, pal[0]); c.rect(x * T, py + 12, 16, 4, pal[2]); } const ax = x0 * T, aw = (x1 - x0 + 1) * T; top.box(ax, py - 26, aw, 13, pal[1], pal[3]); top.rect(ax + 2, py - 24, aw - 4, 3, pal[0]); top.poly([[ax - 3, py - 26], [ax + aw / 2, py - 40], [ax + aw + 3, py - 26]], roof); top.poly([[ax + 4, py - 27], [ax + aw / 2, py - 37], [ax + aw - 4, py - 27]], roof.map((v) => Math.min(255, v + 40))); });
}
// A cafe table with a parasol on one tile (solid).
function parasol(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 12, 6, 3, [0, 0, 0, 50]); c.box(px + 3, py + 5, 10, 6, [240, 236, 224], [110, 100, 96]); c.rect(px + 7, py + 10, 2, 5, [110, 100, 96]); top.ellipse(px + 8, py - 3, 11, 6, col); top.ellipse(px + 8, py - 4, 7, 3, [250, 246, 236]); top.rect(px + 7, py - 9, 2, 2, [90, 80, 76]); c.rect(px + 7, py - 1, 2, 7, [90, 80, 76]); });
}
// A street lamp on one tile (solid).
function lamp(p, x, y) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.rect(px + 7, py - 6, 2, 20, [60, 62, 76]); c.rect(px + 5, py + 13, 6, 2, [60, 62, 76]); top.box(px + 4, py - 14, 8, 9, [255, 236, 150], [60, 62, 76]); top.rect(px + 3, py - 16, 10, 2, [60, 62, 76]); });
}
// A statue on a plinth, one tile (solid).
function statue(p, x, y, col = [206, 204, 196]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, py = y * T, d = col.map((v) => Math.round(v * 0.62)); c.box(px + 2, py + 6, 12, 10, STONE[1], STONE[3]); c.rect(px + 3, py + 7, 10, 2, STONE[0]); c.rect(px + 5, py - 4, 6, 11, col); top.rect(px + 5, py - 6, 6, 3, col); top.ellipse(px + 8, py - 9, 3, 3, col); top.rect(px + 3, py - 4, 2, 6, d); c.rect(px + 10, py - 3, 1, 10, d); });
}
// A low clipped hedge over the tile rectangle (solid).
function hedgeRow(p, x, y, w, h) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py + 2, pw, ph - 2, [38, 92, 52]); c.rect(px + 1, py, pw - 2, ph - 4, [70, 142, 74]); for (let j = 1; j < ph - 5; j += 3) for (let i = 2 + (j % 2) * 3; i < pw - 2; i += 6) c.rect(px + i, py + j, 2, 1, [112, 180, 96]); c.rect(px + 1, py + ph - 5, pw - 2, 1, [50, 110, 60]); });
}
// A stone bridge look over a plank street: the tile rectangle keeps walking, parapets drawn on the sides.
function stoneBridge(p, x, y, w, h, vertical = true) {
  p.paint(1, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, STONE[1]); for (let j = 0; j < ph; j += 8) for (let i = ((j / 8) & 1) * 8; i < pw; i += 16) c.box(px + i, py + j, 16, 8, STONE[(Math.floor(p.hash(i, j, 3) * 2))], STONE[2]); if (vertical) { c.rect(px - 3, py - 2, 5, ph + 4, STONE[3]); c.rect(px - 2, py - 2, 3, ph + 4, STONE[0]); c.rect(px + pw - 2, py - 2, 5, ph + 4, STONE[3]); c.rect(px + pw - 1, py - 2, 3, ph + 4, STONE[0]); } else { c.rect(px - 2, py - 3, pw + 4, 5, STONE[3]); c.rect(px - 2, py - 2, pw + 4, 3, STONE[0]); c.rect(px - 2, py + ph - 2, pw + 4, 5, STONE[3]); c.rect(px - 2, py + ph - 1, pw + 4, 3, STONE[0]); } });
}
// A round stone tower with a cone roof, w tiles wide, standing on row y (solid on its bottom two rows), `tall` px high.
function tower(p, x, y, w = 2, tall = 56, roof = [70, 96, 150]) {
  p.block(x, y - 1, w, 2);
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T, pw = w * T, ty = by - tall; for (const cv of [c, top]) { if (cv === c) { cv.rect(px + 1, by - 30, pw - 2, 30, STONE[3]); cv.rect(px + 2, by - 30, pw - 4, 29, STONE[1]); cv.rect(px + 3, by - 30, 4, 29, STONE[0]); cv.rect(px + pw - 7, by - 30, 4, 29, STONE[2]); cv.rect(px + pw / 2 - 2, by - 22, 4, 8, [50, 46, 60]); } else { cv.rect(px + 1, ty, pw - 2, tall - 30, STONE[3]); cv.rect(px + 2, ty, pw - 4, tall - 30, STONE[1]); cv.rect(px + 3, ty, 4, tall - 30, STONE[0]); cv.rect(px + pw - 7, ty, 4, tall - 30, STONE[2]); cv.rect(px + pw / 2 - 2, ty + 8, 4, 8, [50, 46, 60]); cv.poly([[px - 3, ty + 2], [px + pw / 2, ty - 26], [px + pw + 3, ty + 2]], roof.map((v) => Math.round(v * 0.6))); cv.poly([[px, ty], [px + pw / 2, ty - 23], [px + pw / 2 + 2, ty]], roof); cv.poly([[px + pw / 2 + 2, ty], [px + pw / 2, ty - 23], [px + pw, ty]], roof.map((v) => Math.round(v * 0.8))); } } });
}
// A standing stone (menhir) on one tile (solid); `tall` px high.
function menhir(p, x, y, tall = 26, col = [150, 146, 150]) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T, d = col.map((v) => Math.round(v * 0.62)), l = col.map((v) => Math.min(255, v + 44)); c.ellipse(px + 9, by - 2, 8, 3, [0, 0, 0, 60]); for (const cv of [top, c]) { const lo = cv === c ? by - 14 : by - tall, hi = cv === c ? by - 1 : by - 14; cv.poly([[px + 3, hi], [px + 2, Math.max(lo, by - tall + 8)], [px + 6, lo], [px + 11, lo], [px + 14, Math.max(lo, by - tall + 10)], [px + 13, hi]], d); cv.poly([[px + 4, hi], [px + 3, Math.max(lo, by - tall + 9)], [px + 6, lo + 1], [px + 10, lo + 1], [px + 12, Math.max(lo, by - tall + 10)], [px + 11, hi]], col); cv.rect(px + 5, Math.max(lo + 2, by - tall + 9), 2, hi - Math.max(lo + 2, by - tall + 9) - 2, l); } });
}
// A windmill: 3 tiles wide with its foot on row y (solid on the bottom two rows); tower and sails are walked behind.
function windmill(p, x, y, body = [226, 214, 190], cap = [150, 70, 60]) {
  p.block(x, y - 1, 3, 2);
  p.paint(y + 1, (c, top) => { const px = x * T, by = (y + 1) * T, d = body.map((v) => Math.round(v * 0.7)), hub = [px + 24, by - 84];
    c.poly([[px + 3, by], [px + 6, by - 32], [px + 42, by - 32], [px + 45, by]], [70, 60, 60]); c.poly([[px + 4, by - 1], [px + 7, by - 32], [px + 41, by - 32], [px + 44, by - 1]], body); c.poly([[px + 30, by - 1], [px + 32, by - 32], [px + 41, by - 32], [px + 44, by - 1]], d); c.box(px + 18, by - 18, 12, 18, [110, 80, 60], [60, 40, 40]);
    top.poly([[px + 6, by - 32], [px + 11, by - 78], [px + 37, by - 78], [px + 42, by - 32]], [70, 60, 60]); top.poly([[px + 7, by - 32], [px + 12, by - 77], [px + 36, by - 77], [px + 41, by - 32]], body); top.poly([[px + 32, by - 32], [px + 29, by - 77], [px + 36, by - 77], [px + 41, by - 32]], d); top.rect(px + 20, by - 56, 8, 10, [90, 120, 160]);
    top.poly([[px + 8, by - 76], [px + 24, by - 100], [px + 40, by - 76]], cap.map((v) => Math.round(v * 0.6))); top.poly([[px + 11, by - 77], [px + 24, by - 96], [px + 37, by - 77]], cap);
    for (let k = 0; k < 4; k++) { const a = 0.5 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), ex = hub[0] + ca * 50, ey = hub[1] + sa * 50, nx = -sa * 9, ny = ca * 9; top.poly([[hub[0] + ca * 12, hub[1] + sa * 12], [ex, ey], [ex + nx, ey + ny], [hub[0] + ca * 12 + nx, hub[1] + sa * 12 + ny]], [246, 240, 226]); for (let t = 16; t < 50; t += 7) top.line(hub[0] + ca * t, hub[1] + sa * t, hub[0] + ca * t + nx, hub[1] + sa * t + ny, [150, 130, 110]); top.line(hub[0], hub[1], ex, ey, [90, 70, 60], 2); top.line(ex, ey, ex + nx, ey + ny, [150, 130, 110]); top.line(hub[0] + ca * 12 + nx, hub[1] + sa * 12 + ny, ex + nx, ey + ny, [150, 130, 110]); }
    top.ellipse(hub[0], hub[1], 4, 4, [70, 60, 60]); });
}
// A wooden fence along the tile rectangle (solid).
function fence(p, x, y, w, h, col = [150, 110, 76]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T, d = col.map((v) => Math.round(v * 0.6)); if (w >= h) { c.rect(px, py + 5, pw, 2, col); c.rect(px, py + 10, pw, 2, col); for (let i = 2; i < pw; i += 8) c.box(px + i, py + 2, 3, 13, col, d); } else { c.rect(px + 6, py, 4, ph, d); c.rect(px + 7, py, 2, ph, col); for (let j = 2; j < ph; j += 8) c.box(px + 5, py + j, 6, 4, col, d); } });
}
// A railway line along row y from tile x0 to x1 (solid).
function rails(p, x0, x1, y) {
  p.block(x0, y, x1 - x0 + 1, 1);
  p.paint(y + 1, (c) => { const px = x0 * T, py = y * T, pw = (x1 - x0 + 1) * T; c.rect(px, py + 1, pw, 14, [120, 112, 104]); for (let i = 1; i < pw; i += 6) c.rect(px + i, py + 2, 3, 12, [96, 70, 52]); c.rect(px, py + 4, pw, 2, [70, 74, 86]); c.rect(px, py + 10, pw, 2, [70, 74, 86]); c.rect(px, py + 4, pw, 1, [200, 204, 214]); c.rect(px, py + 10, pw, 1, [200, 204, 214]); });
}
// A waterfall down a rock face: the tile rectangle (solid), painted over whatever is there.
function waterfall(p, x, y, w, h) {
  p.block(x, y, w, h);
  p.paint(y + h + 0.5, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, [120, 186, 236]); for (let i = 1; i < pw; i += 3) { const o = Math.floor(p.hash(x * 16 + i, y, 4) * 12); for (let j = -o; j < ph; j += 12) c.rect(px + i, py + Math.max(0, j), 1, 7, [226, 244, 255]); } c.rect(px, py, pw, 2, [240, 250, 255]); for (let i = -2; i < pw + 2; i += 5) c.ellipse(px + i + 2, py + ph - 1, 4, 3, [246, 252, 255]); });
}

module.exports = {
  // Vaniville Town: four houses round a paved circle, hedged gardens, and the stone gate to Route 1 in the north.
  KalosVanivilleTown: {
    theme: { town: true, ground: "grass", road: "cobble", border: "tree", density: 0.05, groves: 0, flowers: 0.08, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("tree", 2, 2, 15, 3); p.fill("tree", 21, 2, 33, 3);                       // the wall of trees either side of the gate
      p.street("cobble", 3, [[18, 3], [18, 10]]);                                        // from the gate down to the circle
      p.disc("ornate", 18, 15.5, 5.6); p.disc("cobble", 18, 15.5, 3.6); p.disc("flowersRed", 18, 15.5, 1.6);
      p.street("cobble", 2, [[13, 15], [10, 15], [10, 13]]);                              // NW house
      p.street("cobble", 2, [[23, 15], [26, 15], [26, 13]]);                              // NE house
      p.street("cobble", 2, [[18, 20], [18, 25]]); p.street("cobble", 2, [[10, 24], [10, 25], [28, 25], [28, 24]]);   // the two southern houses
      p.building(1, "gable", { tint: p.roof(1.5, 0.8, 0.8) });                           // home
      p.decor("gable", 9, 7, { tint: p.roof(0.8, 1, 1.6) }); p.decor("gable", 25, 7, { tint: p.roof(0.7, 1.4, 0.8) }); p.decor("gable", 27, 18, { tint: p.roof(1.9, 1.5, 0.6) });
      arch(p, 16, 20, 3);
      // garden hedges and flower beds by each house
      hedgeRow(p, 5, 13, 3, 1); hedgeRow(p, 14, 9, 1, 3); hedgeRow(p, 21, 9, 1, 3); hedgeRow(p, 30, 13, 3, 1); hedgeRow(p, 4, 24, 4, 1); hedgeRow(p, 31, 24, 2, 1); hedgeRow(p, 14, 22, 1, 2); hedgeRow(p, 22, 22, 1, 2);
      p.fill("flowersPink", 5, 9, 7, 11); p.fill("flowersBlue", 30, 9, 32, 11); p.fill("flowersRed", 5, 20, 7, 22); p.fill("flowersPink", 23, 20, 25, 22);
      lamp(p, 15, 11); lamp(p, 21, 11); lamp(p, 15, 20); lamp(p, 21, 20);
      // Mum's Rhyhorn dozing beside the house
      p.block(13, 23, 2, 1); p.paint(24, (c) => { const px = 13 * T, py = 23 * T; c.ellipse(px + 15, py + 13, 14, 4, [0, 0, 0, 50]); c.ellipse(px + 16, py + 6, 13, 8, [128, 132, 140]); c.ellipse(px + 6, py + 7, 6, 6, [150, 154, 162]); c.poly([[px, py + 4], [px + 3, py - 3], [px + 5, py + 4]], [220, 220, 214]); c.rect(px + 4, py + 6, 2, 2, [40, 30, 30]); for (const i of [10, 16, 22]) c.poly([[px + i, py], [px + i + 3, py - 5], [px + i + 6, py]], [100, 104, 112]); c.rect(px + 8, py + 12, 4, 3, [100, 104, 112]); c.rect(px + 22, py + 12, 4, 3, [100, 104, 112]); });
    },
  },
  // Aquacorde Town: the cafe terrace on the upper square, the steps down to the river and the stone bridge to Route 2.
  KalosAquacordeTown: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", water: "water", density: 0.03, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("grass", 2, 2, 35, 4); p.fill("grass", 9, 8, 35, 9);                          // the river banks
      p.fill("water", 2, 5, 35, 7);                                                      // the river, bending south in the west
      p.street("cobble", 3, [[19, 3], [19, 28]]);                                        // Route 2 - bridge - steps - square - Route 1
      stoneBridge(p, 18, 5, 3, 3);
      wall(p, 9, 10, 8, 2); wall(p, 22, 10, 8, 2); wall(p, 34, 10, 2, 2); steps(p, 17, 10, 5, 2);   // the terrace wall and the steps
      p.fill("ornate", 9, 12, 29, 15);                                                   // the cafe terrace
      for (const [x, col] of [[12, [214, 70, 70]], [16, [240, 200, 80]], [22, [70, 120, 200]], [26, [214, 70, 70]]]) parasol(p, x, 12, col);
      for (const [x, col] of [[11, [70, 120, 200]], [14, [214, 70, 70]], [24, [240, 200, 80]], [27, [70, 120, 200]]]) parasol(p, x, 15, col);
      p.street("cobble", 2, [[10, 17], [34, 17]]);
      p.disc("ornate", 19, 22, 3.3); p.decor("fountain", 18, 21);                        // the fountain square
      p.street("cobble", 2, [[10, 26], [33, 26]]); p.street("cobble", 2, [[30, 25], [30, 26]]);
      p.building(2, "flat"); p.building(3, "gable", { tint: p.roof(0.8, 1, 1.6) });
      p.decor("gable", 30, 10, { tint: p.roof(1.5, 0.8, 0.8) }); p.decor("gable", 13, 19, { tint: p.roof(1.9, 1.5, 0.6) });
      p.decor("gable", 23, 19, { tint: p.roof(0.7, 1.4, 0.8) });
      lamp(p, 16, 20); lamp(p, 22, 20); lamp(p, 16, 4); lamp(p, 22, 4); lamp(p, 16, 28); lamp(p, 22, 28);
      hedgeRow(p, 10, 28, 6, 1); hedgeRow(p, 23, 28, 10, 1);
    },
  },
  // Camphrier Town: Shabboneau Castle behind its moat and drawbridge, and the river bridge west to Route 7.
  KalosCamphrierTown: {
    theme: { town: true, ground: "meadow", road: "cobble", border: "tree", water: "water", density: 0.06, groves: 0, flowers: 0.15, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 5, 2, 6, 29);                                                      // the river on the west side
      p.fill("water", 19, 12, 35, 13); p.fill("water", 35, 2, 35, 13);                   // the castle moat
      p.fill("paving", 20, 2, 34, 11);                                                   // the castle court
      p.street("deck", 3, [[27, 11], [27, 14]]);                                         // drawbridge
      p.street("cobble", 3, [[19, 4], [19, 28]]);                                        // Route 5 down the middle
      p.street("cobble", 2, [[2, 17], [30, 17]]);                                        // Route 7, over the river bridge
      stoneBridge(p, 5, 17, 2, 2, false);
      p.street("cobble", 2, [[19, 15], [27, 15], [27, 14]]);                              // up to the drawbridge
      p.street("cobble", 2, [[10, 27], [10, 28], [19, 28]]);
      p.disc("ornate", 19.5, 18, 3.2);                                                   // the square
      p.building(2, "hall"); p.building(3, "pcSmall");
      tower(p, 20, 10, 2, 76); tower(p, 33, 10, 2, 76); tower(p, 20, 4, 2, 60, [150, 70, 60]); tower(p, 33, 4, 2, 60, [150, 70, 60]);
      wall(p, 20, 11, 6, 1); wall(p, 29, 11, 6, 1);
      p.decor("gable", 9, 9, { tint: p.roof(1.5, 0.8, 0.8) }); p.decor("gable", 14, 9, { tint: p.roof(0.8, 1, 1.6) }); p.decor("peak", 9, 2); p.decor("gable", 13, 20, { tint: p.roof(1.9, 1.5, 0.6) });
      p.decor("gable", 23, 20, { tint: p.roof(0.7, 1.4, 0.8) }); p.decor("flat", 28, 21); p.decor("gable", 13, 2, { tint: p.roof(1.5, 0.8, 0.8) });
      p.fill("field", 8, 19, 11, 21); p.fill("flowersRed", 30, 27, 34, 28);
      statue(p, 17, 16); statue(p, 22, 16); lamp(p, 17, 20); lamp(p, 22, 20);
      hedgeRow(p, 8, 16, 8, 1); hedgeRow(p, 8, 19, 4, 1);
    },
  },
  // Ambrette Town: the town on the cliff top, the Fossil Lab, and steps down to the aquarium and the beach.
  KalosAmbretteTown: {
    theme: { town: true, ground: "brick", road: "cobble", border: "rock", water: "sea", density: 0.03, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("beach", 7, 21, 37, 31); p.fill("water", 7, 30, 37, 31); p.fill("water", 7, 21, 7, 31);   // the shore below
      cliff(p, 8, 19, 11, 2); cliff(p, 22, 19, 16, 2); steps(p, 19, 19, 3, 2);            // the cliff and the steps
      p.street("cobble", 3, [[20, 4], [20, 18]]);                                        // from Route 8
      p.street("cobble", 2, [[10, 17], [36, 17]]);                                       // to Route 9 and Glittering Cave
      p.street("cobble", 2, [[10, 10], [10, 12], [20, 12]]);                              // Fossil Lab
      p.street("paving", 3, [[20, 21], [20, 28]]); p.street("deck", 2, [[9, 28], [35, 28]]);   // the promenade
      p.building(2, "lab"); p.building(3, "whiteHall"); p.building(4, "centerRed");
      p.decor("gable", 24, 5, { tint: p.roof(1.5, 0.8, 0.8) }); p.decor("gable", 29, 5, { tint: p.roof(0.8, 1, 1.6) }); p.decor("flat", 24, 12); p.decor("gable", 32, 10, { tint: p.roof(1.9, 1.5, 0.6) });
      for (const x of [9, 12, 15, 18, 22, 25, 28, 31, 34]) lamp(p, x, 18);
      // an ammonite set in the paving by the lab, and parasols on the beach
      p.paint(1, (c) => { const cx = 16 * T, cy = 8 * T; c.ellipse(cx, cy, 14, 14, [120, 100, 84]); c.ellipse(cx, cy, 12, 12, [214, 196, 160]); for (let a = 0, r = 11; r > 1; a += 0.5, r -= 0.42) c.rect(cx + Math.cos(a) * r - 1, cy + Math.sin(a) * r - 1, 2, 2, [120, 100, 84]); });
      for (const [x, y, col] of [[23, 23, [214, 70, 70]], [26, 25, [70, 120, 200]], [36, 24, [240, 200, 80]], [24, 29, [240, 240, 244]], [31, 29, [214, 70, 70]]]) parasol(p, x, y, col);
    },
  },
  // Geosenge Town: rings of standing stones round the three great menhirs, in a bowl of rock; Team Flare's door in the north cliff.
  KalosGeosengeTown: {
    theme: { town: true, ground: "gravel", road: "dirt", border: "rock", density: 0.04, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0, stones: false },
    plan(p) {
      p.fill("rock", 2, 2, 17, 4); p.fill("rock", 23, 2, 37, 4); p.fill("rock", 2, 5, 16, 5); p.fill("rock", 24, 5, 37, 5);    // the northern cliff
      p.disc("field", 20, 17.5, 11.5, 10.5); p.disc("dirt", 20, 17.5, 6.6, 6); p.disc("clay", 20, 17.5, 3.4, 3);
      p.street("dirt", 3, [[20, 5], [20, 12]]); p.street("dirt", 3, [[20, 23], [20, 30]]); p.street("dirt", 2, [[26, 17], [36, 17]]);
      p.street("dirt", 2, [[10, 28], [10, 29], [20, 29]]); p.street("dirt", 2, [[14, 17], [9, 17]]);
      p.building(2, "pcSmall");
      // the three great stones
      menhir(p, 20, 16, 58, [176, 170, 176]); menhir(p, 18, 17, 44, [160, 156, 166]); menhir(p, 22, 17, 44, [160, 156, 166]);
      // two rings of smaller stones
      const kept = (x, y) => p.warps.some((w) => Math.abs(w.x - x) < 2 && Math.abs(w.y - y) < 3) || p.people.some((q) => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2);
      const seen = new Set();
      for (const [r, n, tall] of [[5.6, 14, 24], [9.6, 22, 30]]) for (let k = 0; k < n; k++) { const a = (k + 0.5) * 2 * Math.PI / n, x = Math.round(20 + Math.cos(a) * r * 1.08), y = Math.round(17.5 + Math.sin(a) * r * 0.95), key = x + "," + y; if (Math.abs(x - 20) < 2 || (Math.abs(y - 17) < 2 && x > 20) || kept(x, y) || seen.has(key) || (x === 20 && y === 20)) continue; seen.add(key); menhir(p, x, y, tall + Math.floor(p.hash(x, y, 9) * 8)); }
      p.decor("peak", 5, 7); p.decor("peak", 31, 7); p.decor("peak", 27, 23); p.decor("flat", 3, 18);
    },
  },
  // Dendemille Town: the windmill above the snowy farm, the frozen stream, and the road north to Frost Cavern.
  KalosDendemilleTown: {
    theme: { town: true, ground: "snow", road: "frostpath", border: "pine", water: "water", density: 0.08, groves: 0.02, flowers: 0, tree: "tree1", treeTint: "frost", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 30, 2, 31, 35);                                                    // the stream
      p.street("frostpath", 3, [[22, 3], [22, 34]]);                                     // Frost Cavern - Route 15
      p.street("frostpath", 2, [[22, 19], [39, 19]]);                                    // east to Route 17 over the plank bridge
      p.street("frostpath", 2, [[10, 28], [10, 29], [22, 29]]); p.street("frostpath", 2, [[22, 12], [12, 12]]); p.street("frostpath", 2, [[31, 29], [36, 29]]);
      p.street("frostpath", 2, [[22, 29], [36, 29]]);
      p.building(0, "snowCenter");
      windmill(p, 9, 10);                                                               // the windmill
      // the farm: fenced paddocks of frosted grass and furrowed fields
      p.fill("frost", 4, 14, 19, 20); p.fill("drift", 12, 15, 18, 19);
      fence(p, 3, 13, 17, 1); fence(p, 3, 21, 7, 1); fence(p, 13, 21, 7, 1); fence(p, 3, 14, 1, 7); fence(p, 19, 14, 1, 3); fence(p, 19, 19, 1, 2); fence(p, 11, 14, 1, 5);
      p.paint(2, (c) => { for (let y = 15; y <= 19; y++) for (let x = 12; x <= 18; x++) { c.rect(x * T, y * T + 4, 16, 2, [176, 190, 214]); c.rect(x * T, y * T + 11, 16, 2, [176, 190, 214]); } });
      for (const [x, y] of [[5, 16], [8, 18], [6, 19]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 7, 3, [0, 0, 0, 40]); c.ellipse(px + 8, py + 8, 7, 6, [214, 180, 96]); c.ellipse(px + 8, py + 8, 4, 3, [236, 210, 130]); c.rect(px + 2, py + 2, 12, 2, [246, 250, 255]); }); }
      p.decor("cabin", 14, 4); p.decor("cabin", 25, 6); p.decor("cabin", 34, 10); p.decor("cabin", 15, 23); p.decor("cabin", 25, 23); p.decor("logHouse", 34, 22);
      lamp(p, 20, 17); lamp(p, 24, 17); lamp(p, 20, 27); lamp(p, 24, 27);
      // a snowman by the square
      p.block(25, 20, 1, 1); p.paint(21, (c) => { const px = 25 * T, py = 20 * T; c.ellipse(px + 8, py + 13, 7, 3, [0, 0, 0, 40]); c.ellipse(px + 8, py + 9, 6, 6, [250, 252, 255]); c.ellipse(px + 8, py + 1, 4, 4, [250, 252, 255]); c.rect(px + 6, py, 1, 1, [30, 30, 40]); c.rect(px + 9, py, 1, 1, [30, 30, 40]); c.rect(px + 8, py + 2, 3, 1, [240, 140, 50]); c.rect(px + 5, py + 4, 7, 2, [200, 60, 60]); });
    },
  },
  // Couriway Town: the station town in the gorge, the great stone bridge and the three waterfalls.
  KalosCouriwayTown: {
    theme: { town: true, ground: "field", road: "paving", border: "rock", water: "water", density: 0.04, groves: 0, flowers: 0.05, tree: "boulder", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 2, 16, 41, 20);                                                    // the river in the gorge
      p.fill("water", 27, 8, 41, 10);                                                    // the upper river
      cliff(p, 27, 11, 15, 5); for (const x of [29, 33, 37]) waterfall(p, x, 10, 3, 6);    // the three falls
      cliff(p, 2, 15, 19, 1); cliff(p, 24, 15, 3, 1);
      p.street("paving", 3, [[22, 3], [22, 34]]); stoneBridge(p, 21, 16, 3, 5);         // Route 19 - bridge - Route 18
      p.fill("paving", 3, 5, 20, 14);                                                    // the station yard
      p.decor("whiteHall", 6, 4); rails(p, 2, 19, 12); rails(p, 2, 19, 13);
      p.paint(13, (c, top) => { const px = 3 * T, py = 11 * T + 6; c.box(px, py, 60, 24, [70, 120, 200], [30, 50, 90]); c.rect(px + 2, py + 2, 56, 4, [140, 190, 240]); for (let i = 6; i < 56; i += 12) c.rect(px + i, py + 8, 8, 7, [220, 240, 255]); c.rect(px + 2, py + 19, 56, 3, [240, 220, 90]); c.box(px + 62, py, 60, 24, [226, 226, 232], [60, 60, 80]); for (let i = 6; i < 56; i += 12) c.rect(px + 62 + i, py + 8, 8, 7, [140, 190, 240]); c.rect(px + 64, py + 19, 56, 3, [70, 120, 200]); });
      p.street("paving", 2, [[10, 28], [10, 29], [36, 29]]); p.street("deck", 2, [[35, 15], [35, 29]]);   // the lower bridge
      p.street("paving", 2, [[22, 6], [26, 6]]);
      p.building(0, "pcSmall");
      p.decor("gable", 15, 22, { tint: p.roof(0.8, 1, 1.6) }); p.decor("gable", 26, 22, { tint: p.roof(1.5, 0.8, 0.8) }); p.decor("flat", 28, 30); p.decor("gable", 38, 23, { tint: p.roof(1.9, 1.5, 0.6) }); p.decor("gable", 4, 30, { tint: p.roof(0.7, 1.4, 0.8) });
      p.decor("gable", 27, 2, { tint: p.roof(1.5, 0.8, 0.8) }); p.decor("gable", 32, 2, { tint: p.roof(0.8, 1, 1.6) });
      lamp(p, 20, 15); lamp(p, 24, 21); lamp(p, 20, 21); lamp(p, 20, 27); lamp(p, 24, 27);
    },
  },
  // Pokémon Village: a flower clearing deep in the woods, the pond and its stream, and the cave in the rocks.
  KalosPokemonVillage: {
    theme: { town: true, ground: "meadow", road: "dirt", border: "darktree", water: "water", density: 0.22, groves: 0.1, flowers: 0.3, tree: "tree1", autoHouses: false, turn: 2, wander: 1.2 },
    plan(p) {
      p.fill("darktree", 2, 2, 37, 2); p.fill("darktree", 2, 28, 37, 31); p.fill("darktree", 34, 12, 37, 27); p.fill("darktree", 2, 26, 6, 27);
      p.fill("rock", 27, 3, 37, 5); p.fill("rock", 34, 6, 37, 11); p.fill("rock", 27, 6, 29, 7);       // the crag with the cave
      p.fill("water", 8, 16, 9, 22); p.fill("water", 8, 22, 26, 23); p.disc("water", 28, 23, 3, 2.4);   // the stream out of the pond
      p.disc("flowersPink", 20, 13, 8, 5.5); p.disc("flowersRed", 15, 12, 3, 2.4); p.disc("flowersBlue", 25, 14, 3.4, 2.6); p.disc("flowersRed", 21, 18, 4, 2.2); p.disc("flowersBlue", 14, 17, 2.5, 2);
      p.street("dirt", 2, [[20, 4], [20, 8]]); p.street("dirt", 2, [[32, 7], [32, 9], [27, 11]]);
      p.street("deck", 2, [[15, 21], [15, 25]]); p.street("deck", 2, [[10, 15], [10, 18], [6, 18]]);
      // tumbledown shelters, bins and crates the Pokémon live among
      p.decor("cabin", 22, 24, { tint: p.roof(0.8, 0.9, 0.8) }); p.decor("barrels", 28, 26); p.decor("barrels", 12, 9); p.decor("barrel", 13, 10); p.decor("boulder", 30, 14); 
      for (const [x, y, col] of [[12, 25, [200, 90, 80]], [17, 27, [90, 130, 190]], [30, 18, [220, 190, 90]]]) { p.block(x, y, 2, 1); p.paint(y + 1, (c, top) => { const px = x * T, py = y * T; c.ellipse(px + 16, py + 14, 15, 3, [0, 0, 0, 50]); c.poly([[px, py + 15], [px + 16, py - 12], [px + 32, py + 15]], col.map((v) => Math.round(v * 0.6))); c.poly([[px + 3, py + 14], [px + 16, py - 9], [px + 29, py + 14]], col); c.poly([[px + 12, py + 14], [px + 16, py + 2], [px + 20, py + 14]], [40, 30, 30]); c.rect(px + 8, py + 4, 4, 3, col.map((v) => Math.min(255, v + 40))); }); }
    },
  },
  // Parfum Palace gardens: the long axis north from the palace terrace, the round pool, clipped parterres, statues and the hedge maze.
  KalosParfumGarden: {
    theme: { town: true, ground: "lawn", road: "cobble", border: "tree", water: "water", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("ornate", 5, 28, 37, 32);                                                   // the palace terrace
      p.street("cobble", 3, [[21, 31], [21, 3]]);                                        // the grand axis
      p.street("cobble", 2, [[3, 19], [38, 19]]); p.street("cobble", 2, [[3, 3], [38, 3], [38, 26], [3, 26], [3, 3]]);
      p.disc("cobble", 21.5, 14.5, 5.2); p.disc("water", 21.5, 14.5, 2.7);             // the round pool
      p.block(21, 14, 1, 1); p.paint(15, (c, top) => { const px = 21 * T, py = 14 * T; c.ellipse(px + 8, py + 8, 9, 6, STONE[2]); c.ellipse(px + 8, py + 7, 7, 4, STONE[0]); c.rect(px + 6, py - 6, 4, 12, STONE[1]); top.ellipse(px + 8, py - 8, 6, 3, STONE[0]); top.rect(px + 7, py - 16, 2, 8, [200, 236, 255]); top.ellipse(px + 8, py - 16, 4, 2, [226, 244, 255]); });
      // four parterres: clipped hedges round flower beds
      const bed = (x0, y0, x1, y1, kind, gapx) => { hedgeRow(p, x0, y0, gapx - x0, 1); hedgeRow(p, gapx + 1, y0, x1 - gapx, 1); hedgeRow(p, x0, y1, gapx - x0, 1); hedgeRow(p, gapx + 1, y1, x1 - gapx, 1); hedgeRow(p, x0, y0 + 1, 1, y1 - y0 - 1); hedgeRow(p, x1, y0 + 1, 1, y1 - y0 - 1); p.fill(kind, x0 + 2, y0 + 2, x1 - 2, y1 - 2); statue(p, (x0 + x1) >> 1, (y0 + y1) >> 1); };
      bed(6, 6, 14, 16, "flowersRed", 10); bed(29, 6, 37, 16, "flowersBlue", 33); bed(25, 21, 36, 25, "flowersPink", 30);
      // the hedge maze in the south-west
      hedgeRow(p, 5, 21, 11, 1); hedgeRow(p, 5, 25, 4, 1); hedgeRow(p, 11, 25, 5, 1); hedgeRow(p, 5, 22, 1, 3); hedgeRow(p, 15, 22, 1, 3); hedgeRow(p, 7, 23, 3, 1); hedgeRow(p, 11, 22, 1, 2); hedgeRow(p, 13, 23, 1, 2);
      for (const y of [6, 9, 22, 25]) { statue(p, 19, y, [226, 196, 96]); statue(p, 23, y, [226, 196, 96]); }
      for (const x of [8, 12, 16, 26, 30, 34]) p.decor("hedge", x, 28);
      // the palace's garden front along the bottom of the map
      p.paint(40, (c) => { const y0 = 32 * T + 6; c.rect(2 * T, y0, 38 * T, 4 * T, [226, 214, 190]); c.rect(2 * T, y0, 38 * T, 3, [250, 240, 210]); c.rect(2 * T, y0 + 14, 38 * T, 50, [70, 86, 120]); for (let x = 3 * T; x < 39 * T; x += 24) { c.poly([[x, y0 + 30], [x + 8, y0 + 18], [x + 16, y0 + 30]], [96, 112, 150]); c.rect(x + 5, y0 + 24, 6, 6, [240, 220, 120]); } c.rect(2 * T, y0 + 12, 38 * T, 3, [226, 196, 96]); for (let x = 2 * T + 4; x < 40 * T; x += 10) c.rect(x, y0 + 3, 4, 9, [250, 240, 210]); });
    },
  },
  // The Pokémon League: the long processional way up tiers of steps to the great cathedral gate.
  KalosLeagueEntrance: {
    theme: { town: true, ground: "ornate", road: "cobble", border: "rock", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("lawn", 2, 14, 13, 31); p.fill("lawn", 27, 14, 37, 31); p.fill("paving", 2, 4, 37, 11);
      p.street("cobble", 5, [[20, 30], [20, 4]]);                                        // the processional way
      wall(p, 2, 12, 15, 2); wall(p, 24, 12, 14, 2); steps(p, 17, 12, 7, 2);             // the upper tier
      wall(p, 2, 21, 15, 1); wall(p, 24, 21, 14, 1); steps(p, 17, 21, 7, 1);
      p.street("cobble", 2, [[9, 28], [9, 29], [20, 29]]); p.street("cobble", 2, [[8, 15], [8, 17], [18, 17]]);
      p.building(2, "hearthCenter");
      for (const y of [6, 9, 15, 18, 23, 26]) { statue(p, 16, y, [226, 196, 96]); statue(p, 24, y, [226, 196, 96]); }
      p.decor("fountain", 28, 15); p.decor("fountain", 33, 23); p.decor("fountain", 10, 15);
      hedgeRow(p, 27, 20, 10, 1); hedgeRow(p, 3, 20, 10, 1); hedgeRow(p, 27, 14, 10, 1);
      // the cathedral front
      p.bare(1);                                                                         // its doorway is part of the painted front
      tower(p, 12, 5, 3, 110, [90, 100, 150]); tower(p, 26, 5, 3, 110, [90, 100, 150]); tower(p, 6, 5, 2, 70, [90, 100, 150]); tower(p, 33, 5, 2, 70, [90, 100, 150]);
      p.block(15, 2, 4, 3); p.block(22, 2, 4, 3); p.block(8, 3, 4, 2); p.block(29, 3, 4, 2); p.block(2, 3, 4, 2); p.block(35, 3, 3, 2);
      p.paint(5, (c, top) => { const x0 = 2 * T, x1 = 38 * T, by = 5 * T; c.rect(x0, by - 44, x1 - x0, 44, STONE[3]); c.rect(x0, by - 43, x1 - x0, 42, STONE[1]); for (let x = x0 + 6; x < x1 - 6; x += 16) { c.rect(x, by - 34, 6, 20, [60, 70, 120]); c.poly([[x, by - 34], [x + 3, by - 40], [x + 6, by - 34]], [60, 70, 120]); c.rect(x + 2, by - 32, 2, 16, [150, 190, 240]); }
        const gx = 15 * T, gw = 11 * T; c.rect(gx, 0, gw, by, STONE[3]); c.rect(gx + 1, 0, gw - 2, by - 1, STONE[0]); c.ellipse(gx + gw / 2, 22, 15, 15, [60, 50, 90]); c.ellipse(gx + gw / 2, 22, 12, 12, [226, 120, 140]); for (let k = 0; k < 8; k++) c.line(gx + gw / 2, 22, gx + gw / 2 + Math.cos(k * Math.PI / 4) * 12, 22 + Math.sin(k * Math.PI / 4) * 12, [250, 230, 150]); c.ellipse(gx + gw / 2, 22, 4, 4, [120, 190, 240]);
        c.poly([[gx + 56, by], [gx + 56, by - 30], [gx + 88, by - 46], [gx + 120, by - 30], [gx + 120, by]], [60, 50, 60]); c.poly([[gx + 62, by], [gx + 62, by - 27], [gx + 88, by - 40], [gx + 114, by - 27], [gx + 114, by]], [226, 196, 96]); c.poly([[gx + 70, by], [gx + 70, by - 22], [gx + 88, by - 32], [gx + 106, by - 22], [gx + 106, by]], [40, 34, 50]);
        for (const x of [gx + 8, gx + 30, gx + 130, gx + 152]) { c.rect(x, by - 40, 10, 34, [60, 70, 120]); c.poly([[x, by - 40], [x + 5, by - 50], [x + 10, by - 40]], [60, 70, 120]); c.rect(x + 3, by - 38, 4, 30, [150, 190, 240]); } });
    },
  },
};
