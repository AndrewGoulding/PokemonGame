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
  // Vaniville Town: one terrace of brick-roofed houses with the lane from the Route 1 gate running through its middle,
  // and the pale cobbled street with its two flower beds in front (reference: the houses stand in a single row).
  KalosVanivilleTown: {
    theme: { town: true, ground: "grass", road: "paving", border: "tree", density: 0.1, groves: 0.04, flowers: 0.05, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const brick = p.roof(1.7, 0.95, 0.6);
      p.fill("tree", 2, 2, 15, 3); p.fill("tree", 21, 2, 33, 3);                       // the wall of trees either side of the gate
      p.street("paving", 3, [[18, 3], [18, 26]]);                                        // the lane from the gate, through the terrace
      p.street("paving", 2, [[3, 25], [32, 25]]);                                        // the pale street in front of the houses
      p.fill("paving", 9, 24, 12, 24); p.fill("paving", 4, 24, 7, 24); p.fill("paving", 21, 24, 24, 24); p.fill("paving", 27, 24, 30, 24);
      p.building(1, "gable", { tint: brick });                                           // home
      p.decor("gable", 4, 18, { tint: brick }); p.decor("gable", 21, 18, { tint: brick }); p.decor("gable", 27, 18, { tint: brick });
      arch(p, 16, 20, 3, STONE, [176, 96, 60]);
      // walled front gardens: hedges between the houses, a conifer in each
      hedgeRow(p, 8, 20, 1, 4); hedgeRow(p, 25, 20, 1, 2); hedgeRow(p, 3, 20, 1, 4); hedgeRow(p, 31, 20, 1, 4); hedgeRow(p, 13, 20, 3, 1); hedgeRow(p, 22, 17, 1, 1);
      p.fill("flowersRed", 14, 24, 16, 24); p.fill("flowersPink", 20, 24, 20, 24);       // the two flower beds on the street
      lamp(p, 6, 27); lamp(p, 15, 27); lamp(p, 21, 27); lamp(p, 30, 27);
      // Mum's Rhyhorn dozing in the garden beside the house
      p.block(13, 23, 2, 1); p.paint(24, (c) => { const px = 13 * T, py = 23 * T; c.ellipse(px + 15, py + 13, 14, 4, [0, 0, 0, 50]); c.ellipse(px + 16, py + 6, 13, 8, [128, 132, 140]); c.ellipse(px + 6, py + 7, 6, 6, [150, 154, 162]); c.poly([[px, py + 4], [px + 3, py - 3], [px + 5, py + 4]], [220, 220, 214]); c.rect(px + 4, py + 6, 2, 2, [40, 30, 30]); for (const i of [10, 16, 22]) c.poly([[px + i, py], [px + i + 3, py - 5], [px + i + 6, py]], [100, 104, 112]); c.rect(px + 8, py + 12, 4, 3, [100, 104, 112]); c.rect(px + 22, py + 12, 4, 3, [100, 104, 112]); });
    },
  },
  // Aquacorde Town: the stone bridge over the river to Route 2, the cafe terrace, and the fountain square between the two shops.
  // All four buildings carry the same slate-blue roofs and the whole town is paved in tan stone (reference).
  KalosAquacordeTown: {
    theme: { town: true, ground: "cobble", road: "cobble", border: "tree", water: "water", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const slate = p.roof(0.7, 0.9, 1.7);
      p.fill("grass", 2, 2, 35, 4); p.fill("grass", 9, 8, 35, 9);                          // the river banks
      p.fill("water", 2, 5, 35, 7);                                                      // the river
      p.fill("grass", 31, 10, 35, 29); p.fill("grass", 2, 15, 8, 17); p.fill("grass", 2, 24, 7, 29);   // lawns and trees either side of the town
      p.street("cobble", 3, [[19, 3], [19, 28]]);                                        // Route 2 - bridge - steps - square - Route 1
      stoneBridge(p, 18, 5, 3, 3);
      wall(p, 13, 10, 4, 2); wall(p, 22, 10, 4, 2); steps(p, 17, 10, 5, 2);              // the terrace wall and the steps
      p.fill("ornate", 9, 12, 30, 15);                                                   // the cafe terrace
      p.decor("gable", 9, 8, { tint: slate }); p.decor("gable", 26, 8, { tint: slate });   // the two cafes
      for (const [x, col] of [[16, [240, 236, 224]], [22, [240, 236, 224]]]) parasol(p, x, 13, col);
      for (const [x, col] of [[11, [240, 236, 224]], [14, [240, 236, 224]], [24, [240, 236, 224]], [27, [240, 236, 224]]]) parasol(p, x, 15, col);
      p.disc("ornate", 19, 22, 3.6); p.decor("fountain", 18, 21);                        // the fountain square
      p.fill("lawn", 15, 20, 16, 24); p.fill("lawn", 22, 20, 23, 24);                    // the two lawns beside the fountain
      p.building(2, "gable", { tint: slate }); p.building(3, "gable", { tint: slate });    // the two shops
      lamp(p, 14, 19); lamp(p, 24, 19); lamp(p, 16, 4); lamp(p, 22, 4); lamp(p, 16, 28); lamp(p, 22, 28); lamp(p, 16, 8); lamp(p, 22, 8);
      hedgeRow(p, 10, 28, 6, 1); hedgeRow(p, 23, 28, 8, 1);
      for (const [x, y] of [[32, 12], [33, 16], [33, 26], [3, 26], [6, 27], [33, 2], [11, 2], [27, 2]]) p.decor("tree1", x, y, { canopy: true, optional: true });
    },
  },
  // Camphrier Town: a walled town of green lawns; Shabboneau Castle on its island in a square moat, the drawbridge down to
  // the crossroads with the well, two small houses, the hotel and the Pokémon Center (reference).
  KalosCamphrierTown: {
    theme: { town: true, ground: "grass", road: "cobble", border: "tree", water: "water", density: 0.03, groves: 0, flowers: 0.06, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const brown = p.roof(1.3, 0.85, 0.6), orange = p.roof(1.9, 1.1, 0.5);
      p.fill("water", 21, 2, 35, 13); p.fill("lawn", 22, 3, 33, 11);                     // the square moat round the castle island
      p.street("deck", 3, [[27, 11], [27, 14]]);                                         // drawbridge
      p.street("cobble", 3, [[19, 4], [19, 27]]);                                        // Route 5 down the middle
      p.street("cobble", 2, [[4, 17], [33, 17]]);                                        // the cross street from Route 7
      p.street("cobble", 2, [[27, 14], [27, 17]]);                                       // up to the drawbridge
      p.street("cobble", 2, [[10, 27], [10, 28], [19, 28], [19, 27]]);
      p.street("cobble", 2, [[19, 22], [25, 22]]);
      p.building(2, "hall"); p.building(3, "pcSmall");
      // the town wall
      wall(p, 3, 2, 14, 1); wall(p, 3, 3, 1, 12); wall(p, 3, 20, 1, 9); wall(p, 3, 29, 33, 1); wall(p, 35, 14, 1, 15);
      p.decor("gable", 8, 10, { tint: brown }); p.decor("gable", 13, 10, { tint: brown });   // the two small houses
      p.decor("gable", 24, 20, { tint: orange });                                         // the hotel
      // the well at the crossroads
      p.block(19, 17, 1, 1); p.paint(18, (c) => { const cx = 19 * T + 8, cy = 17 * T + 9; c.ellipse(cx, cy + 2, 9, 6, STONE[3]); c.ellipse(cx, cy, 9, 6, STONE[1]); c.ellipse(cx, cy - 1, 6, 4, [60, 110, 170]); c.ellipse(cx - 1, cy - 2, 2, 1, [170, 210, 240]); });
      lamp(p, 16, 16); lamp(p, 22, 16); lamp(p, 16, 20); lamp(p, 22, 20);
      p.fill("flowersRed", 30, 26, 33, 27);
    },
  },
  // Ambrette Town: a town of tan earth stepped down the cliffs to the beach, with the sea to the west and south (reference);
  // the Fossil Lab, one blue-roofed house, the orange-roofed hotel, the aquarium and the Pokémon Center.
  KalosAmbretteTown: {
    theme: { town: true, ground: "sand", road: "dirt", border: "rock", water: "sea", density: 0.02, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("beach", 7, 21, 37, 31); p.fill("water", 7, 30, 37, 31); p.fill("water", 7, 21, 7, 31);   // the shore below
      cliff(p, 8, 19, 11, 2); cliff(p, 22, 19, 16, 2); steps(p, 19, 19, 3, 2);            // the cliff and the steps
      p.street("dirt", 3, [[20, 4], [20, 18]]);                                          // from Route 8
      p.street("dirt", 2, [[10, 17], [36, 17]]);                                         // to Route 9 and Glittering Cave
      p.street("dirt", 2, [[10, 10], [10, 12], [20, 12]]);                                // Fossil Lab
      p.building(2, "lab"); p.building(3, "whiteHall"); p.building(4, "centerRed");
      p.decor("gable", 25, 6, { tint: p.roof(0.7, 0.9, 1.7) });                           // the blue-roofed house
      p.decor("gable", 29, 10, { tint: p.roof(1.9, 1.1, 0.5) });                          // the hotel
      p.street("dirt", 2, [[20, 13], [30, 13]]);
      p.decor("boulder", 23, 24, { optional: true }); p.decor("boulder", 35, 22, { optional: true });   // rocks on the beach
    },
  },
  // Geosenge Town: a grassy hamlet in the woods. A dirt path loops round the three great stones, thatched huts stand about it
  // inside a ring of small standing stones, and the Pokémon Center and hotel sit by the south road (reference).
  KalosGeosengeTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.08, groves: 0.03, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0, stones: false },
    plan(p) {
      const thatch = p.roof(0.95, 1.05, 0.5);
      p.fill("tree", 2, 2, 14, 3); p.fill("tree", 26, 2, 37, 3);
      p.fill("rock", 16, 2, 18, 5); p.fill("rock", 22, 2, 24, 5); p.fill("rock", 19, 2, 21, 3);   // the crag over Team Flare's door
      p.street("meadow", 2, [[20, 5], [20, 10]]);                                        // the grassy track up to it
      p.disc("dirt", 20, 14.5, 5.4, 4.8); p.disc("grass", 20, 14.5, 3.2, 2.6);         // the loop round the stones
      p.street("dirt", 3, [[20, 19], [20, 30]]);
      p.street("dirt", 2, [[20, 21], [33, 21], [33, 17], [36, 17]]);                      // east to Route 11
      p.street("dirt", 2, [[10, 28], [10, 29], [20, 29]]);
      p.building(2, "pcSmall");
      // the three great stones
      menhir(p, 20, 13, 58, [176, 170, 176]); menhir(p, 19, 15, 44, [160, 156, 166]); menhir(p, 21, 15, 44, [160, 156, 166]);
      // the thatched huts and the hotel
      p.decor("peak", 23, 4, { tint: thatch }); p.decor("peak", 10, 8, { tint: thatch }); p.decor("peak", 9, 15, { tint: thatch }); p.decor("peak", 27, 8, { tint: thatch }); p.decor("peak", 27, 14, { tint: thatch });
      p.decor("gable", 24, 23, { tint: p.roof(1.9, 1.1, 0.5) });
      // the ring of small standing stones round the hamlet
      const kept = (x, y) => p.warps.some((w) => Math.abs(w.x - x) < 2 && Math.abs(w.y - y) < 3) || p.people.some((q) => Math.abs(q.x - x) < 2 && Math.abs(q.y - y) < 2);
      const seen = new Set();
      for (let k = 0, n = 44; k < n; k++) { const a = (k + 0.5) * 2 * Math.PI / n, x = Math.round(20 + Math.cos(a) * 13.4), y = Math.round(15 + Math.sin(a) * 11.4), key = x + "," + y; if (y < 6 || Math.abs(x - 20) < 3 || (x >= 31 && y >= 15 && y <= 23) || (y >= 22 && x < 14) || kept(x, y) || seen.has(key)) continue; seen.add(key); menhir(p, x, y, 14 + Math.floor(p.hash(x, y, 9) * 6)); }
    },
  },
  // Dendemille Town: the windmill on its stone terrace in the north, dark timber houses, the stream that runs down the east
  // side and turns west under the plank bridge, and the ploughed farm plots south of it (reference). Green ground, snow only on the northern ridge.
  KalosDendemilleTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "pine", water: "water", density: 0.05, groves: 0.02, flowers: 0, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("snow", 2, 2, 41, 3);                                                       // the snowy ridge towards Frost Cavern
      p.fill("water", 30, 2, 31, 25); p.fill("water", 14, 24, 31, 25); p.fill("water", 14, 24, 15, 35);   // the stream
      p.fill("paving", 6, 4, 28, 17);                                                    // the stone terrace
      p.street("paving", 3, [[22, 3], [22, 17]]); p.street("dirt", 3, [[22, 17], [22, 34]]);   // Frost Cavern - Route 15
      p.street("dirt", 2, [[22, 19], [39, 19]]);                                         // east to Route 17 over the plank bridge
      p.street("dirt", 2, [[10, 28], [10, 29], [22, 29]]); p.street("dirt", 2, [[22, 29], [24, 29]]);
      p.building(0, "snowCenter");
      p.disc("ornate", 15.5, 11, 4.2, 3); windmill(p, 14, 11, [226, 214, 190], [70, 86, 150]);   // the windmill on its round base
      p.decor("cabin", 7, 4); p.decor("cabin", 24, 4); p.decor("cabin", 7, 12); p.decor("cabin", 24, 12); p.decor("cabin", 16, 19);
      // the farm: ploughed plots between two fences
      p.fill("dirt", 26, 27, 33, 31); fence(p, 25, 26, 10, 1); fence(p, 25, 32, 10, 1);
      p.paint(2, (c) => { for (let y = 27; y <= 31; y++) for (let x = 26; x <= 33; x++) { if (x === 29 || x === 30 || y === 29) continue; c.rect(x * T, y * T + 4, 16, 2, [120, 92, 62]); c.rect(x * T, y * T + 11, 16, 2, [120, 92, 62]); } });
      for (const [x, y] of [[27, 28], [32, 30]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 8, py + 13, 7, 3, [0, 0, 0, 40]); c.ellipse(px + 8, py + 8, 7, 6, [214, 180, 96]); c.ellipse(px + 8, py + 8, 4, 3, [236, 210, 130]); }); }
      lamp(p, 20, 18); lamp(p, 24, 18); lamp(p, 20, 27); lamp(p, 24, 27);
    },
  },
  // Couriway Town: the railway on its viaduct and the glass-roofed station in the north, the waterfalls in the east, the great
  // wooden deck over the river in the middle, and water channels down both sides (reference).
  KalosCouriwayTown: {
    theme: { town: true, ground: "grass", road: "paving", border: "rock", water: "water", density: 0.04, groves: 0, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("water", 2, 16, 18, 20); p.fill("water", 26, 16, 41, 20); p.fill("deck", 19, 16, 25, 20);   // the river and the great deck across it
      p.fill("water", 27, 11, 41, 12);                                                   // the upper river
      cliff(p, 27, 13, 15, 3); for (const x of [29, 33, 37]) waterfall(p, x, 12, 3, 4);    // the three falls
      cliff(p, 2, 15, 17, 1); cliff(p, 26, 15, 1, 1);
      p.fill("water", 38, 21, 40, 33); p.fill("water", 3, 21, 4, 33);                    // the channels either side
      p.street("paving", 3, [[22, 3], [22, 34]]);                                        // Route 19 - deck - Route 18
      p.decor("whiteHall", 25, 2); rails(p, 2, 20, 9); rails(p, 24, 41, 9);              // the station and the line
      p.paint(10, (c, top) => { const py = 9 * T; top.rect(21 * T - 2, py - 2, 3 * T + 4, 18, [96, 90, 84]); top.rect(21 * T - 2, py + 1, 3 * T + 4, 12, [120, 112, 104]); top.rect(21 * T - 2, py + 4, 3 * T + 4, 2, [200, 204, 214]); top.rect(21 * T - 2, py + 10, 3 * T + 4, 2, [200, 204, 214]);
        const px = 5 * T, ty = 8 * T + 6; c.box(px, ty, 60, 24, [70, 120, 200], [30, 50, 90]); c.rect(px + 2, ty + 2, 56, 4, [140, 190, 240]); for (let i = 6; i < 56; i += 12) c.rect(px + i, ty + 8, 8, 7, [220, 240, 255]); c.rect(px + 2, ty + 19, 56, 3, [240, 220, 90]); c.box(px + 62, ty, 60, 24, [226, 226, 232], [60, 60, 80]); for (let i = 6; i < 56; i += 12) c.rect(px + 62 + i, ty + 8, 8, 7, [140, 190, 240]); c.rect(px + 64, ty + 19, 56, 3, [70, 120, 200]); });
      p.street("paving", 2, [[10, 28], [10, 29], [36, 29]]);
      p.fill("paving", 14, 11, 20, 14);                                                  // the yard below the line
      p.building(0, "pcSmall");
      p.decor("gable", 15, 22, { tint: p.roof(1.3, 0.85, 0.6) }); p.decor("gable", 26, 22, { tint: p.roof(1.9, 1.1, 0.5) });   // a house, and the hotel
      p.decor("gable", 8, 10, { tint: p.roof(1.3, 0.85, 0.6), optional: true });
      lamp(p, 20, 14); lamp(p, 24, 21); lamp(p, 20, 21); lamp(p, 20, 27); lamp(p, 24, 27);
    },
  },
  // Pokémon Village: a wide meadow of yellow flowers in a clearing of the dark woods, the stream and its waterfall down the
  // west side, a rock ledge along the north with the cave in it; no houses, only heaps of brush and rubbish (reference).
  KalosPokemonVillage: {
    theme: { town: true, ground: "meadow", road: "meadow", border: "darktree", water: "water", density: 0.1, groves: 0.06, flowers: 0.04, tree: "tree1", autoHouses: false, turn: 2, wander: 1.2 },
    plan(p) {
      p.fill("darktree", 2, 2, 2, 31); p.fill("darktree", 2, 30, 37, 31); p.fill("darktree", 33, 12, 37, 29); p.fill("darktree", 11, 2, 17, 2); p.fill("darktree", 23, 2, 26, 2);
      p.fill("rock", 27, 3, 37, 5); p.fill("rock", 34, 6, 37, 11); p.fill("rock", 27, 6, 29, 7);       // the ledge with the cave
      p.fill("water", 4, 16, 6, 31);                                                     // the stream running south out of the pool
      waterfall(p, 4, 3, 3, 2);                                                          // the fall at its head
      p.disc("autumn", 21, 17, 10.5, 8.5); p.disc("autumn", 27, 11, 4, 3); p.disc("autumn", 15, 24, 4, 3);   // the yellow flower meadow
      p.fill("flowersBlue", 11, 4, 14, 7);                                               // the purple flowers by the fall
      p.street("meadow", 2, [[20, 4], [20, 8]]); p.street("dirt", 2, [[32, 7], [32, 9], [27, 11]]);
      p.decor("barrels", 28, 26); p.decor("barrels", 12, 10); p.decor("barrel", 13, 11);
      // two heaps of dry brush and an old tyre in the flowers
      for (const [x, y] of [[15, 14], [25, 16]]) { p.block(x, y, 2, 1); p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.ellipse(px + 16, py + 13, 16, 4, [0, 0, 0, 50]); c.ellipse(px + 16, py + 5, 15, 10, [120, 110, 50]); c.ellipse(px + 15, py + 3, 12, 8, [176, 164, 76]); for (let i = 0; i < 12; i++) c.rect(px + 5 + Math.floor(p.hash(x + i, y, 3) * 22), py - 3 + Math.floor(p.hash(x, y + i, 4) * 12), 2, 2, [214, 204, 110]); }); }
      p.block(23, 21, 1, 1); p.paint(22, (c) => { const cx = 23 * T + 8, cy = 21 * T + 9; c.ellipse(cx, cy, 8, 5, [50, 50, 56]); c.ellipse(cx, cy - 1, 4, 2, [96, 96, 104]); });
    },
  },
  // Parfum Palace gardens: four square hedge parterres on sand paths round the central fountain, a statue at each end of the
  // axis, and the long pool with its bridge and two golden statues between the garden and the palace (reference).
  KalosParfumGarden: {
    theme: { town: true, ground: "lawn", road: "sand", border: "tree", water: "water", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("sand", 4, 3, 38, 27);                                                      // the sand of the garden
      p.fill("sand", 4, 28, 9, 32); p.fill("sand", 33, 28, 38, 32); p.fill("ornate", 10, 31, 32, 32);   // round the pool to the palace terrace
      p.fill("water", 10, 28, 19, 30); p.fill("water", 23, 28, 32, 30);                  // the pool
      p.street("paving", 3, [[21, 31], [21, 27]]);                                       // the bridge over it
      statue(p, 14, 29, [226, 196, 96]); statue(p, 28, 29, [226, 196, 96]);
      p.disc("water", 21.5, 14.5, 1.6);                                                  // the round fountain at the crossing
      p.block(21, 14, 1, 1); p.paint(15, (c, top) => { const px = 21 * T, py = 14 * T; c.ellipse(px + 8, py + 8, 9, 6, STONE[2]); c.ellipse(px + 8, py + 7, 7, 4, STONE[0]); c.rect(px + 6, py - 6, 4, 12, STONE[1]); top.ellipse(px + 8, py - 8, 6, 3, STONE[0]); top.rect(px + 7, py - 16, 2, 8, [200, 236, 255]); top.ellipse(px + 8, py - 16, 4, 2, [226, 244, 255]); });
      // four parterres: clipped hedge rings with lawn between; `gaps` are the openings [x, y]
      const open = new Set();
      const parterre = (x0, y0, x1, y1, gaps) => { p.fill("lawn", x0, y0, x1, y1); for (const [gx, gy] of gaps) open.add(gx + "," + gy);
        const ring = (a, b, c2, d) => { for (let x = a; x <= c2; x++) for (const y of [b, d]) if (!open.has(x + "," + y)) hedgeRow(p, x, y, 1, 1); for (let y = b + 1; y < d; y++) for (const x of [a, c2]) if (!open.has(x + "," + y)) hedgeRow(p, x, y, 1, 1); };
        ring(x0, y0, x1, y1); if (x1 - x0 >= 8 && y1 - y0 >= 6) ring(x0 + 2, y0 + 2, x1 - 2, y1 - 2); };
      parterre(6, 5, 18, 11, [[12, 5], [12, 11], [6, 8], [18, 8], [8, 8], [16, 8]]);
      parterre(24, 5, 36, 11, [[30, 5], [30, 11], [24, 8], [36, 8], [30, 7], [30, 9]]);
      parterre(6, 17, 18, 25, [[6, 19], [18, 19], [12, 17], [12, 25], [8, 19], [16, 19], [12, 19]]);
      parterre(24, 17, 36, 25, [[24, 21], [36, 21], [30, 17], [30, 25], [30, 19], [30, 23]]);
      p.fill("sand", 6, 19, 18, 19);                                                     // the walk through the south-west maze
      statue(p, 12, 8, [70, 142, 74]); statue(p, 30, 8, [70, 142, 74]); statue(p, 30, 21, [70, 142, 74]);   // topiary
      statue(p, 21, 4, [240, 240, 244]); statue(p, 21, 25, [240, 240, 244]);            // the statues at each end of the axis
      for (const x of [5, 37]) for (const y of [4, 14, 26]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { c.ellipse(x * T + 8, y * T + 9, 6, 5, STONE[3]); c.ellipse(x * T + 8, y * T + 8, 5, 4, STONE[1]); c.ellipse(x * T + 7, y * T + 6, 2, 1, STONE[0]); }); }
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
      tower(p, 12, 5, 3, 110, [190, 60, 50]); tower(p, 26, 5, 3, 110, [190, 60, 50]); tower(p, 6, 5, 2, 70, [190, 60, 50]); tower(p, 33, 5, 2, 70, [190, 60, 50]);
      p.block(15, 2, 4, 3); p.block(22, 2, 4, 3); p.block(8, 3, 4, 2); p.block(29, 3, 4, 2); p.block(2, 3, 4, 2); p.block(35, 3, 3, 2);
      p.paint(5, (c, top) => { const x0 = 2 * T, x1 = 38 * T, by = 5 * T; c.rect(x0, by - 44, x1 - x0, 44, STONE[3]); c.rect(x0, by - 43, x1 - x0, 42, STONE[1]); for (let x = x0 + 6; x < x1 - 6; x += 16) { c.rect(x, by - 34, 6, 20, [60, 70, 120]); c.poly([[x, by - 34], [x + 3, by - 40], [x + 6, by - 34]], [60, 70, 120]); c.rect(x + 2, by - 32, 2, 16, [150, 190, 240]); }
        const gx = 15 * T, gw = 11 * T; c.rect(gx, 0, gw, by, STONE[3]); c.rect(gx + 1, 0, gw - 2, by - 1, STONE[0]); c.ellipse(gx + gw / 2, 22, 15, 15, [60, 50, 90]); c.ellipse(gx + gw / 2, 22, 12, 12, [226, 120, 140]); for (let k = 0; k < 8; k++) c.line(gx + gw / 2, 22, gx + gw / 2 + Math.cos(k * Math.PI / 4) * 12, 22 + Math.sin(k * Math.PI / 4) * 12, [250, 230, 150]); c.ellipse(gx + gw / 2, 22, 4, 4, [120, 190, 240]);
        c.poly([[gx + 56, by], [gx + 56, by - 30], [gx + 88, by - 46], [gx + 120, by - 30], [gx + 120, by]], [60, 50, 60]); c.poly([[gx + 62, by], [gx + 62, by - 27], [gx + 88, by - 40], [gx + 114, by - 27], [gx + 114, by]], [226, 196, 96]); c.poly([[gx + 70, by], [gx + 70, by - 22], [gx + 88, by - 32], [gx + 106, by - 22], [gx + 106, by]], [40, 34, 50]);
        for (const x of [gx + 8, gx + 30, gx + 130, gx + 152]) { c.rect(x, by - 40, 10, 34, [60, 70, 120]); c.poly([[x, by - 40], [x + 5, by - 50], [x + 10, by - 40]], [60, 70, 120]); c.rect(x + 3, by - 38, 4, 30, [150, 190, 240]); } });
    },
  },
};
