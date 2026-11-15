// alola towns, drawn by hand. See README.md.
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

module.exports = {
  // Heahea City: the resort port of Akala, a long seafront avenue with the sea all along the south
  // (no beach: Hano Beach lies beyond the east end). The Tide Song Hotel stands in the west above its
  // round drive and fountain, the street to Route 4 runs north beside the Center, shops line the
  // avenue, the Dimensional Research Lab sits up the slope in the east and the ferry terminal on the
  // water in the south-west.
  AlolaHeaheaCity: {
    theme: { town: true, ground: "lawn", road: "paving", border: "palms", water: "sea", density: 0, groves: 0, flowers: 0.05, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 22, 36, 30);
      p.street("asphalt", 3, [[19, 1], [19, 16]]);                                      // the street up to Route 4
      p.street("asphalt", 3, [[1, 17], [36, 17]]);                                      // the seafront avenue
      p.street("paving", 2, [[1, 20], [36, 20]]);                                       // the promenade along the sea wall
      p.street("paving", 2, [[20, 11], [34, 11]]); p.street("paving", 2, [[33, 9], [33, 16]]);
      p.street("deck", 3, [[19, 22], [19, 30]]); p.street("deck", 2, [[14, 22], [14, 27]]);   // piers
      // The hotel's round drive with its fountain.
      p.disc("paving", 14.5, 11.5, 3.6, 3.2); p.street("paving", 2, [[14, 14], [14, 16]]); p.street("paving", 2, [[11, 12], [12, 12]]);
      p.decor("fountain", 13, 9);
      p.building(2, "centerRed");
      // Tide Song Hotel above its entrance.
      entry(p, 1);
      house(p, 2, 9, 9, 8, { wall: [250, 246, 236], roof: [70, 150, 200], door: 2, roofH: 26, band: [70, 150, 200], sign: [240, 200, 90] });
      // Dimensional Research Lab: the tan block up the slope in the east.
      house(p, 31, 3, 6, 6, { flat: true, wall: [214, 190, 150], roof: [176, 150, 112], roofH: 20, door: 2, edge: [90, 70, 56], sign: [236, 236, 240] });
      p.fill("rock", 31, 1, 36, 2); p.fill("rock", 22, 1, 30, 1);
      // Shops along the avenue: tourist information, the boutique, the Aether office.
      const shop = (x, roof, sign) => house(p, x, 12, 5, 4, { flat: true, wall: [250, 244, 232], roof, roofH: 16, door: 2, doorCol: [150, 200, 230], sign });
      shop(21, [236, 150, 170], [250, 240, 200]); shop(27, [90, 170, 200], [250, 250, 250]);
      house(p, 5, 21, 7, 4, { wall: [226, 230, 244], roof: [86, 96, 170], roofH: 20, door: 5, sign: [70, 190, 220], win: [150, 200, 240] });   // ferry terminal on the water
      boat(p, 8, 26, [240, 240, 244], 5); boat(p, 15, 24, [70, 130, 200], 3); boat(p, 23, 26, [220, 80, 70], 3);
      // The sea wall.
      p.paint(22, (c) => { c.rect(16, 22 * 16 - 3, 36 * 16, 4, [226, 222, 210]); c.rect(16, 22 * 16 + 1, 36 * 16, 1, [120, 116, 110]); });
      for (const [x, y] of [[17, 3], [21, 7], [17, 9], [22, 19], [3, 19], [12, 19], [26, 19], [30, 19], [34, 19], [16, 19], [35, 13], [23, 3], [28, 3], [6, 4], [11, 4], [11, 15]]) palm(p, x, y);
    },
  },
  // Paniola Town: the cowboy town. One wide dirt square ringed by grass and trees, every building
  // brown timber: Kiawe's big house and its stable in the north-west, the Center in the north-east,
  // two long stores down the west side, two more with the water tower between them on the east,
  // and the fishing pond in the south-west. (The paddocks belong to Paniola Ranch next door.)
  AlolaPaniolaTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.02, groves: 0, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("dirt", 11, 9, 31, 27); p.disc("dirt", 21, 18, 12.5, 10.5); p.fill("dirt", 9, 9, 17, 10);
      p.street("dirt", 3, [[19, 1], [19, 10]]); p.street("dirt", 3, [[1, 17], [12, 17]]); p.street("dirt", 3, [[30, 16], [36, 16]]); p.street("dirt", 3, [[19, 26], [19, 30]]);
      p.building(2, "hearthCenter");
      const timber = (x, y, w, h, wall, roof, door, o = {}) => house(p, x, y, w, h, Object.assign({ wall, roof, roofH: 22, door, win: [230, 220, 170], edge: [70, 46, 34], extra: (c, px, py, pw, ph) => { for (let i = px + 4; i < px + pw - 2; i += 6) c.rect(i, py + 24, 1, ph - 26, [110, 74, 48]); c.rect(px + 1, py + 32, pw - 2, 2, [90, 60, 40]); } }, o));
      timber(9, 2, 8, 7, [150, 104, 68], [112, 74, 48], 4, { roofH: 34 });                 // Kiawe's house
      timber(4, 5, 5, 4, [132, 92, 60], [96, 64, 42], null, { flat: true, roofH: 18 });     // its stable
      timber(13, 19, 5, 4, [160, 112, 74], [124, 86, 56], 2); timber(13, 23, 5, 4, [146, 100, 66], [108, 72, 48], 2);
      timber(24, 17, 5, 4, [156, 108, 70], [118, 80, 52], 2); timber(24, 24, 5, 4, [150, 102, 66], [110, 74, 48], 2);
      // The pond.
      p.disc("water", 5.5, 23.5, 3.6, 2.8);
      // A grass island with the town sign in the middle of the square.
      p.disc("grass", 21, 13, 1.6, 1);
      const hay = (x, y) => { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px + 1, py + 3, 14, 12, [226, 190, 90], [130, 96, 40]); c.rect(px + 2, py + 6, 12, 1, [170, 130, 50]); c.rect(px + 2, py + 11, 12, 1, [170, 130, 50]); }); };
      for (const [x, y] of [[30, 19], [31, 19], [30, 20], [3, 9], [2, 9], [30, 25], [31, 26]]) hay(x, y);
      // The water tower between the two east stores.
      p.block(25, 22, 2, 1);
      p.paint(23, (c, top) => { const px = 25 * 16, py = 21 * 16; for (const dx of [2, 27]) { c.line(px + dx, py + 30, px + dx + (dx < 10 ? 4 : -4), py - 4, [110, 76, 50], 3); } c.line(px + 3, py + 20, px + 28, py + 6, [110, 76, 50], 1); c.line(px + 28, py + 20, px + 3, py + 6, [110, 76, 50], 1); top.box(px, py - 30, 32, 28, [170, 120, 80], [70, 46, 34]); for (let i = 4; i < 32; i += 5) top.rect(px + i, py - 29, 1, 26, [120, 84, 56]); top.rect(px, py - 20, 32, 2, [90, 90, 96]); top.rect(px, py - 8, 32, 2, [90, 90, 96]); top.poly([[px - 3, py - 30], [px + 16, py - 42], [px + 35, py - 30]], [120, 70, 50]); });
      fence(p, 32, 18, 32, 27); fence(p, 31, 12, 34, 12);
      for (const [x, y] of [[18, 20], [29, 23], [23, 21], [12, 14], [28, 13]]) p.decor("barrels", x, y);
      for (const [x, y] of [[2, 3], [6, 12], [2, 27], [9, 28], [33, 3], [34, 22], [28, 28]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Royal Avenue: an asphalt loop under brown cliffs. The dark steel-and-glass Battle Royal Dome
  // with its red carpet, flags and pools fills the north, the teal-roofed Thrifty Megamart beside it,
  // and to the south a park: the round pink flower garden, the malasada shop and a small fountain.
  AlolaRoyalAvenue: {
    theme: { town: true, ground: "lawn", road: "asphalt", border: "tree", density: 0, groves: 0, flowers: 0.06, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 17, 1); p.fill("rock", 21, 1, 36, 1); p.fill("rock", 35, 2, 36, 13); p.fill("rock", 1, 2, 1, 13);
      p.street("asphalt", 3, [[1, 16], [36, 16]]); p.street("asphalt", 3, [[19, 1], [19, 16]]); p.street("dirt", 2, [[19, 18], [19, 30]]);
      p.fill("paving", 22, 11, 33, 14); p.street("paving", 2, [[7, 10], [7, 15]]);
      // The Battle Royal Dome behind its entrance hall: dark steel ribs, glass, a red carpet to the door.
      p.block(21, 2, 3, 9); p.block(31, 2, 4, 9); p.block(24, 1, 7, 5);
      p.paint(10, (c) => {
        const cx = 27.5 * 16, by = 11 * 16;
        c.rect(cx - 106, by - 96, 212, 96, [34, 38, 52]); c.rect(cx - 104, by - 94, 208, 94, [70, 78, 100]);
        for (let i = -100; i <= 100; i += 14) { c.rect(cx + i - 2, by - 92, 4, 92, [120, 130, 156]); c.rect(cx + i + 2, by - 92, 6, 60, [110, 170, 210]); }
        c.rect(cx - 104, by - 40, 208, 5, [50, 56, 76]); c.rect(cx - 104, by - 6, 208, 6, [40, 44, 60]);
        c.ellipse(cx, by - 94, 108, 62, [34, 38, 52]); c.ellipse(cx, by - 94, 105, 59, [84, 92, 116]);
        for (let k = -3; k <= 3; k++) c.ellipse(cx + k * 30, by - 94, 13 - Math.abs(k) * 2, 58 - Math.abs(k) * 4, k % 2 ? [104, 114, 140] : [70, 78, 100]);
        c.ellipse(cx, by - 94, 105, 59, [150, 160, 186], 3); c.ellipse(cx, by - 118, 34, 18, [50, 56, 76]); c.ellipse(cx, by - 119, 28, 14, [120, 132, 160]);
        c.rect(cx - 104, by - 96, 208, 4, [150, 160, 186]);
      });
      p.building(2, "gym");
      p.paint(1, (c) => { c.rect(27 * 16 + 2, 11 * 16, 12, 4 * 16, [200, 50, 56]); c.rect(27 * 16 + 2, 11 * 16, 1, 4 * 16, [236, 190, 70]); c.rect(27 * 16 + 13, 11 * 16, 1, 4 * 16, [236, 190, 70]); });
      p.fill("water", 22, 12, 25, 13); p.fill("water", 30, 12, 33, 13);
      flag(p, 23, 14, [70, 110, 220]); flag(p, 25, 14, [220, 60, 60]); flag(p, 30, 14, [240, 210, 70]); flag(p, 32, 14, [70, 180, 100]);
      // Thrifty Megamart: long, with a teal glass roof.
      house(p, 3, 3, 9, 7, { wall: [200, 120, 90], roof: [60, 176, 160], roofH: 30, band: [246, 240, 226], door: 4, sign: [246, 240, 226], doorCol: [150, 200, 230], extra: (c, px, py, pw) => { for (let i = px + 14; i < px + pw - 10; i += 14) c.rect(i, py + 3, 2, 26, [226, 246, 240]); } });
      for (const x of [13, 15]) { p.block(x, 8, 1, 2); p.paint(10, (c) => { c.box(x * 16 + 2, 8 * 16 + 2, 12, 26, x === 13 ? [200, 60, 60] : [90, 110, 150], [40, 40, 50]); c.rect(x * 16 + 4, 8 * 16 + 8, 8, 6, [150, 200, 230]); }); }   // parked cars
      p.fill("asphalt", 12, 7, 16, 11); p.street("asphalt", 2, [[12, 12], [17, 12]]);
      // The park: a ring path round the pink flower garden, paths out to the shop and fountain.
      p.disc("dirt", 19.5, 23.5, 6, 5); p.disc("lawn", 19.5, 23.5, 4.2, 3.4); p.disc("flowersPink", 19.5, 23.5, 3, 2.3); p.disc("lawn", 19.5, 23.5, 1, 0.8);
      p.street("dirt", 2, [[19, 18], [19, 19]]); p.street("dirt", 2, [[25, 23], [32, 23]]); p.street("dirt", 2, [[6, 23], [13, 23]]);
      house(p, 25, 18, 5, 4, { wall: [250, 240, 220], roof: [226, 120, 50], roofH: 18, door: 2, sign: [250, 240, 200] });                  // malasada shop
      p.decor("fountain", 32, 24);
      for (const [x, y] of [[13, 19], [26, 28], [9, 20], [9, 27], [33, 19], [35, 28], [3, 20], [3, 27]]) p.decor("tree1", x, y, { canopy: true });
      for (const x of [3, 7, 11, 15, 23, 31, 35]) palm(p, x, 18);
      for (const [x, y] of [[13, 3], [16, 5], [22, 28], [30, 28], [21, 12], [34, 12]]) palm(p, x, y);
      for (const [x, y] of [[13, 25], [26, 25]]) p.decor("bench", x, y);
    },
  },
  // Konikoni City: one cobbled street running north-south between red gates, crossed by a short
  // street that ends at the ferry pier on the west shore. The sea lies west and north; the lighthouse
  // stands on the grassy headland in the north-east and a wooded cliff walls in the east. Orange
  // tiled shops line the southern street, the big green-roofed restaurant sits by the crossing.
  AlolaKonikoniCity: {
    theme: { town: true, ground: "grass", road: "cobble", border: "tree", water: "sea", density: 0, groves: 0, flowers: 0.04, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 1, 9, 23); p.fill("water", 1, 1, 14, 9); p.fill("water", 1, 1, 42, 1); p.fill("water", 37, 1, 42, 3);
      for (let y = 10; y <= 23; y++) p.fill("water", 10, y, 10 + Math.floor(p.hash(y >> 1, 0, 3) * 2), y);
      // The wooded cliff in the east.
      p.fill("rock", 31, 12, 32, 36); p.fill("tree", 33, 11, 39, 36); p.fill("tree", 40, 22, 42, 36); p.fill("rock", 33, 34, 42, 36);
      for (let y = 12; y <= 34; y++) if (p.hash(y >> 1, 1, 3) < 0.5) p.fill("rock", 30, y, 30, y);
      // Streets: the main street, the cross street and pier, the path out to the headland.
      p.fill("paving", 19, 11, 25, 35); p.fill("paving", 14, 17, 29, 21);
      p.street("cobble", 3, [[22, 9], [22, 36]]); p.street("cobble", 3, [[13, 19], [29, 19]]); p.street("deck", 3, [[4, 19], [12, 19]]); p.street("deck", 2, [[4, 15], [4, 23]]);
      p.street("dirt", 2, [[21, 9], [18, 9], [18, 4], [31, 4]]); p.street("dirt", 2, [[25, 9], [28, 9], [28, 5]]); p.street("dirt", 2, [[10, 28], [20, 28]]);
      p.fill("dirt", 26, 11, 29, 16);
      p.street("dirt", 2, [[32, 4], [41, 4], [41, 19], [42, 19]]);                         // the cliff-top trail east toward Diglett's Tunnel
      p.building(2, "pcSmall");
      // Red tiled gates: at the head of the street, at its foot, and over the way out to Route 8.
      const gate = (x0, x1, y) => { p.block(x0, y, 1, 1); p.block(x1, y, 1, 1); p.paint(y + 1, (c, top) => { const a = x0 * 16, b = (x1 + 1) * 16, py = y * 16; for (const x of [a + 3, b - 13]) { c.box(x, py - 2, 10, 18, [206, 50, 44], [90, 24, 24]); top.box(x, py - 22, 10, 20, [206, 50, 44], [90, 24, 24]); } top.box(a, py - 26, b - a, 7, [206, 50, 44], [90, 24, 24]); top.poly([[a - 8, py - 26], [a + 6, py - 40], [b - 6, py - 40], [b + 8, py - 26]], [90, 40, 30]); top.poly([[a - 5, py - 28], [a + 7, py - 38], [b - 7, py - 38], [b + 5, py - 28]], [210, 110, 50]); top.rect(a + 7, py - 40, b - a - 14, 3, [120, 60, 40]); top.box((a + b) / 2 - 8, py - 25, 16, 5, [240, 210, 110], [90, 24, 24]); }); };
      gate(20, 24, 11); gate(20, 24, 33);
      p.bare(0); gate(9, 11, 27); p.fill("dirt", 10, 26, 10, 28);
      const tiled = (x, y, w, h, roof, door) => house(p, x, y, w, h, { pagoda: true, wall: [244, 232, 206], roof, roofH: 22, door, edge: [70, 40, 36], sign: [250, 220, 120] });
      tiled(12, 11, 6, 6, [70, 130, 120], 3);                                            // the restaurant
      [[14, 22, 0], [14, 29, 1], [25, 22, 1], [25, 27, 0]].forEach(([x, y, r]) => tiled(x, y, 5, 5, [[206, 124, 54], [190, 104, 50]][r], 2));
      // The market stall on the dirt lot.
      p.block(27, 14, 2, 1); p.paint(15, (c) => { const px = 27 * 16, py = 14 * 16; c.box(px, py + 2, 32, 13, [196, 150, 96], [90, 60, 40]); c.poly([[px - 3, py + 3], [px + 4, py - 8], [px + 28, py - 8], [px + 35, py + 3]], [246, 240, 226]); c.rect(px + 4, py + 6, 24, 3, [240, 120, 90]); });
      flag(p, 20, 15, [240, 200, 60]); flag(p, 25, 16, [240, 200, 60]); flag(p, 19, 23, [240, 200, 60]);
      for (const y of [21, 26, 31]) lanterns(p, 21, 23, y);
      for (const [x, y] of [[20, 27], [24, 26], [20, 31], [24, 32]]) lamp(p, x, y);
      // The headland: grass, a white rail along the cliff edge and the lighthouse.
      p.decor("lighthouse", 33, 2, { canopy: 3 });
      fence(p, 15, 2, 31, 2, [240, 240, 236]); fence(p, 15, 3, 15, 8, [240, 240, 236]);
      p.decor("bench", 22, 3); p.decor("bench", 25, 3);
      // The ferry: a wooden ship moored at the pier's end.
      p.paint(24, (c) => { const px = 1 * 16 + 4, py = 15 * 16; c.poly([[px + 4, py], [px + 28, py], [px + 34, py + 60], [px + 28, py + 128], [px + 4, py + 128], [px - 2, py + 60]], [70, 46, 34]); c.poly([[px + 7, py + 4], [px + 25, py + 4], [px + 30, py + 60], [px + 25, py + 124], [px + 7, py + 124], [px + 2, py + 60]], [150, 104, 64]); for (const y of [py + 24, py + 86]) { c.box(px + 2, y, 28, 18, [240, 236, 220], [110, 90, 70]); c.rect(px + 3, y + 5, 26, 3, [200, 80, 70]); c.rect(px + 3, y + 11, 26, 3, [80, 150, 120]); } c.rect(px + 15, py + 8, 2, 112, [70, 46, 34]); });
      for (const [x, y] of [[12, 25], [3, 26], [6, 31], [12, 33], [2, 34], [28, 31], [17, 35]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[12, 15], [12, 22], [16, 6], [30, 7], [37, 7], [39, 9], [27, 34]]) palm(p, x, y);
    },
  },
  // Malie City: the old eastern-style city. Blocks of dark-green tiled roofs on grey paving, a wide
  // asphalt main road along the seafront, the walled Malie Garden behind its red gate (here in the
  // west), the library in the north and the big blue-roofed ferry terminal on the water in the east.
  AlolaMalieCity: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "tree", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 24, 36, 30);
      p.fill("lawn", 1, 1, 6, 14); p.fill("lawn", 1, 18, 6, 21); p.disc("water", 3.5, 6, 2.2, 1.6); p.fill("flowersPink", 2, 10, 5, 11); p.fill("flowersPink", 2, 19, 5, 20);
      p.street("asphalt", 3, [[1, 16], [36, 16]]); p.street("cobble", 3, [[19, 1], [19, 15]]); p.street("asphalt", 3, [[19, 17], [19, 22]]); p.street("asphalt", 3, [[8, 22], [35, 22]]);
      p.street("deck", 3, [[19, 25], [19, 30]]); p.street("deck", 2, [[34, 25], [34, 29]]); p.street("cobble", 2, [[27, 11], [27, 15]]); p.street("cobble", 2, [[9, 10], [18, 10]]);
      p.building(2, "temple");
      // The garden wall and its red gate.
      for (const [y0, y1] of [[1, 13], [19, 22]]) { p.block(7, y0, 1, y1 - y0 + 1); p.paint(y1 + 1, (c) => { c.box(7 * 16 + 3, y0 * 16, 10, (y1 - y0 + 1) * 16, [240, 236, 226], [90, 84, 90]); c.rect(7 * 16 + 1, y0 * 16, 14, 3, [70, 74, 90]); for (let y = y0 * 16 + 8; y < (y1 + 1) * 16; y += 8) c.rect(7 * 16 + 1, y, 14, 1, [70, 74, 90]); }); }
      p.block(7, 14, 1, 1); p.block(7, 18, 1, 1);
      p.paint(19, (c, top) => { const px = 7 * 16; for (const y of [14, 18]) { c.box(px + 4, y * 16 - 6, 8, 22, [206, 50, 44], [90, 24, 24]); top.box(px + 4, y * 16 - 14, 8, 10, [206, 50, 44], [90, 24, 24]); } top.box(px + 1, 14 * 16 - 20, 14, 5 * 16 + 14, [206, 50, 44], [90, 24, 24]); top.rect(px - 1, 14 * 16 - 22, 18, 4, [50, 46, 56]); top.rect(px - 1, 19 * 16 - 8, 18, 4, [50, 46, 56]); top.rect(px + 5, 14 * 16 - 16, 6, 5 * 16 + 6, [236, 90, 70]); });
      const pag = (x, y, w, h, roof, door) => house(p, x, y, w, h, { pagoda: true, wall: [244, 240, 228], roof, roofH: 22, door, edge: [50, 46, 56], band: [150, 50, 44] });
      pag(9, 3, 7, 6, [60, 104, 84], 3);                                                // the library
      pag(9, 11, 4, 4, [52, 96, 80], 1); pag(14, 11, 4, 4, [66, 112, 88], 1); pag(22, 18, 4, 4, [60, 104, 84], 1); pag(9, 18, 4, 4, [66, 112, 88], 1); pag(14, 18, 4, 4, [56, 100, 76], 1);
      house(p, 28, 23, 8, 5, { wall: [226, 230, 244], roof: [86, 96, 170], roofH: 30, door: 3, sign: [70, 190, 220], win: [150, 200, 240] });   // ferry terminal, out over the water
      pag(33, 18, 4, 3, [60, 104, 84], 1);
      pag(33, 3, 4, 5, [52, 96, 80], 1);
      boat(p, 30, 28, [240, 240, 244], 3); boat(p, 22, 26, [200, 70, 60], 3); boat(p, 12, 26, [70, 130, 200], 3);
      for (const [x, y] of [[17, 14], [21, 14], [17, 18], [21, 21], [12, 15], [30, 15], [34, 14], [26, 21], [30, 21]]) lamp(p, x, y);
      for (const [x, y] of [[2, 2], [5, 3], [2, 13], [5, 8]]) p.decor("honeyTree", x, y, { canopy: true });
    },
  },
  // Tapu Village: what the storm left. Green grass and a looping dirt road, the lone Pokemon Center
  // on its paved lot in the north, the stone footings of wrecked houses east of it, a patch of tall
  // grass inside the road's bend, wooded cliffs behind and the sea out to the south-west.
  AlolaTapuVillage: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", water: "sea", density: 0.02, groves: 0.03, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 16, 2); p.fill("rock", 22, 1, 36, 2); p.fill("tree", 1, 3, 9, 4); p.fill("tree", 28, 3, 36, 4); p.fill("rock", 23, 3, 27, 3);
      p.fill("water", 1, 26, 8, 30); p.fill("water", 1, 24, 4, 25); p.fill("ash", 5, 24, 9, 25); p.fill("ash", 9, 26, 12, 30); p.fill("rock", 13, 28, 17, 30); p.fill("rock", 21, 28, 36, 30);
      p.street("dirt", 3, [[1, 16], [36, 16]]); p.street("dirt", 2, [[19, 1], [19, 15]]); p.street("dirt", 2, [[19, 17], [19, 30]]);
      p.street("dirt", 2, [[6, 17], [6, 22], [16, 22], [18, 18]]);                      // the bend round the tall grass
      p.fill("meadow", 8, 18, 15, 20);
      p.fill("paving", 23, 9, 31, 12); p.street("dirt", 2, [[27, 13], [27, 15]]);
      p.building(2, "centerRed");
      // Stone footings where houses stood, and the odd wall still upright.
      [[30, 19, 5, 3], [23, 20, 5, 3], [32, 6, 4, 3], [9, 8, 5, 3]].forEach(([x, y, w, h], n) => ruin(p, x, y, w, h, n));
      for (const [x, y] of [[8, 14], [11, 14], [22, 14], [26, 18], [29, 18], [34, 18], [14, 12], [33, 12]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16, t = p.hash(x, y, 9) < 0.5; c.box(px + 4, py + (t ? 6 : 1), 8, t ? 9 : 14, [150, 146, 140], [84, 80, 80]); c.rect(px + 5, py + (t ? 7 : 2), 6, 2, [190, 186, 180]); }); }
      fence(p, 20, 24, 26, 24); p.decor("boulder", 14, 24); p.decor("boulder", 32, 24);
      for (const [x, y] of [[3, 7], [5, 11], [15, 5], [22, 6], [3, 20], [29, 24], [35, 10], [12, 25]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Po Town: Team Skull's town. A concrete wall all round, a cobbled main street running the length
  // of the town to the red-roofed Shady House (here at the west end) with its pool, red-roofed villas
  // behind clipped hedges on both sides, barricades across the street, wrecked cars, graffiti, the
  // Pokemon Center by the entrance end, and rain that never stops.
  AlolaPoTown: {
    theme: { town: true, ground: "shade", road: "cobble", border: "darktree", treeTint: "dark", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, house: ["gable"] },
    plan(p) {
      p.street("cobble", 3, [[19, 1], [19, 15]]); p.street("cobble", 3, [[12, 16], [36, 16]]); p.street("cobble", 2, [[1, 16], [11, 16]]); p.street("cobble", 2, [[19, 18], [19, 30]]); p.street("cobble", 2, [[21, 11], [27, 11]]);
      wall(p, 2, 2, 17, 2, 1); wall(p, 21, 2, 35, 2, 1); wall(p, 2, 29, 17, 29, 1); wall(p, 21, 29, 35, 29, 1);
      wall(p, 2, 3, 2, 14); wall(p, 2, 18, 2, 28); wall(p, 35, 3, 35, 14); wall(p, 35, 18, 35, 28);
      // The Shady House: grey stone under a red tiled roof, a turret over the door.
      entry(p, 1);
      house(p, 3, 8, 9, 9, { wall: [150, 142, 136], roof: [196, 86, 60], roofH: 34, door: 1, win: [70, 70, 90], edge: [50, 40, 44], doorCol: [50, 40, 50], extra: (c, px, py, pw) => { c.box(px + pw / 2 - 12, py - 6, 24, 30, [150, 142, 136], [50, 40, 44]); c.poly([[px + pw / 2 - 15, py - 5], [px + pw / 2, py - 20], [px + pw / 2 + 15, py - 5]], [196, 86, 60]); c.ellipse(px + pw / 2, py + 10, 6, 7, [70, 70, 90]); c.line(px + 20, py + 60, px + 30, py + 52, [236, 70, 150], 2); c.line(px + 30, py + 52, px + 38, py + 62, [236, 70, 150], 2); c.line(px + pw - 40, py + 80, px + pw - 26, py + 72, [90, 220, 230], 2); } });
      p.fill("paving", 3, 4, 8, 7); p.fill("water", 4, 5, 7, 6);                           // the pool beside it
      const red = p.roof(1.6, 0.75, 0.55);
      p.building(2, "gable", { tint: red });
      for (const [x, y] of [[13, 5], [22, 4], [31, 5], [13, 20], [23, 20], [6, 21]]) p.decor("gable", x, y, { tint: red });
      p.decor("pcSmall", 29, 20);
      // Clipped hedges round the villa gardens.
      for (let x = 12; x <= 17; x++) p.decor("hedge", x, 12); for (let x = 21; x <= 24; x++) p.decor("hedge", x, 13); for (let x = 30; x <= 34; x++) p.decor("hedge", x, 13);
      for (let x = 5; x <= 17; x++) if (x !== 11) p.decor("hedge", x, 19); for (let x = 21; x <= 27; x++) p.decor("hedge", x, 19);
      for (let y = 21; y <= 27; y++) p.decor("hedge", 11, y); for (let y = 21; y <= 26; y++) p.decor("hedge", 21, y);
      // Barricades across the main street (one side left open) and wrecked cars.
      const bar = (x, y0, y1) => { p.block(x, y0, 1, y1 - y0 + 1); p.paint(y1 + 1, (c) => { const px = x * 16, py = y0 * 16, ph = (y1 - y0 + 1) * 16; c.box(px + 3, py - 4, 10, ph + 2, [200, 60, 56], [70, 24, 28]); for (let j = py; j < py + ph - 4; j += 8) c.rect(px + 4, j, 8, 3, [246, 240, 230]); c.rect(px + 1, py + ph - 4, 14, 3, [70, 70, 80]); }); };
      bar(14, 15, 16); bar(24, 16, 17); bar(31, 15, 16);
      const car = (x, y, col) => { p.block(x, y, 2, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.ellipse(px + 16, py + 14, 15, 3, [0, 0, 0, 70]); c.box(px + 1, py + 3, 30, 11, col, [40, 36, 40]); c.box(px + 8, py - 3, 15, 8, col.map((v) => Math.round(v * 0.8)), [40, 36, 40]); c.rect(px + 10, py - 1, 11, 4, [90, 110, 130]); c.rect(px + 4, py + 12, 6, 3, [30, 30, 34]); c.rect(px + 22, py + 12, 6, 3, [30, 30, 34]); }); };
      car(27, 14, [190, 70, 60]); car(8, 25, [214, 180, 70]); car(16, 9, [200, 110, 90]);
      for (const [x, y] of [[28, 8], [33, 9], [15, 25], [26, 26], [33, 26], [10, 4], [17, 22]]) palm(p, x, y);
      for (const [x, y] of [[25, 12], [33, 22], [18, 26]]) p.decor("barrels", x, y);
      // Graffiti on the street, puddles, and the rain.
      p.paint(1, (c) => { for (let i = 0; i < 26; i++) { const x = 3 + Math.floor(p.hash(i, 1, 21) * 32), y = 3 + Math.floor(p.hash(i, 2, 22) * 26); c.ellipse(x * 16 + 8, y * 16 + 10, 7 + (i % 3) * 2, 3 + (i % 2), [70, 100, 150, 120]); c.ellipse(x * 16 + 7, y * 16 + 9, 3, 1, [160, 190, 230, 150]); } for (const [x, y, col] of [[18, 10], [20, 24], [12, 16], [28, 16], [22, 15], [17, 17], [33, 17], [19, 6]].map(([x, y], n) => [x, y, [[236, 70, 150], [240, 220, 70], [90, 220, 230], [150, 230, 90], [170, 110, 230]][n % 5]])) { const px = x * 16, py = y * 16; c.ellipse(px + 8, py + 8, 7, 6, col, 2); c.rect(px + 4, py + 6, 3, 2, col); c.rect(px + 10, py + 6, 3, 2, col); c.rect(px + 5, py + 10, 7, 1, col); } });
      p.paint(99, (c, top) => { for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (p.hash(x, y, 31) < 0.3) { const px = x * 16 + Math.floor(p.hash(x, y, 32) * 12), py = y * 16 + Math.floor(p.hash(x, y, 33) * 8); top.line(px + 3, py, px, py + 7, [176, 196, 236, 150]); } });
    },
  },
  // Aether Paradise dock: the white artificial island's lower deck. Steel platforms over open sea,
  // the triangular lift to the lobby, cargo containers, cranes and the ferry berths.
  AlolaAetherDock: {
    theme: { ground: "steel", road: "steel", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 0, 0, 37, 31);
      p.fill("steel", 6, 2, 31, 19); p.fill("steel", 17, 0, 21, 1); p.fill("steel", 17, 20, 21, 31); p.fill("steel", 0, 14, 5, 18); p.fill("steel", 32, 14, 37, 18);
      p.fill("steel", 26, 20, 30, 23); p.fill("steel", 8, 20, 11, 26);
      p.fill("paving", 14, 9, 24, 13);
      const gold = [226, 186, 70], white = [246, 246, 248], grey = [150, 156, 170];
      // Deck edge rails and the lift pad.
      p.paint(1, (c) => {
        c.rect(6 * 16, 2 * 16, 26 * 16, 3, gold); c.rect(6 * 16, 2 * 16, 3, 12 * 16, gold); c.rect(32 * 16 - 3, 2 * 16, 3, 12 * 16, gold);
        for (const [x0, x1] of [[6, 8], [12, 17], [22, 26], [31, 32]]) c.rect(x0 * 16, 20 * 16 - 3, (x1 - x0) * 16, 3, gold);
        const cx = 19.5 * 16; c.poly([[cx, 3 * 16], [cx + 56, 8 * 16 + 8], [cx - 56, 8 * 16 + 8]], gold); c.poly([[cx, 3 * 16 + 8], [cx + 48, 8 * 16 + 4], [cx - 48, 8 * 16 + 4]], white); c.poly([[cx, 5 * 16], [cx + 26, 8 * 16], [cx - 26, 8 * 16]], [210, 214, 226]);
        const dy = 11.5 * 16; c.poly([[cx, dy - 28], [cx + 40, dy], [cx, dy + 28], [cx - 40, dy]], gold); c.poly([[cx, dy - 22], [cx + 32, dy], [cx, dy + 22], [cx - 32, dy]], white); c.poly([[cx, dy - 12], [cx + 16, dy], [cx, dy + 12], [cx - 16, dy]], gold);
        for (let y = 21; y < 31; y += 2) c.rect(19 * 16 + 6, y * 16, 4, 16, gold);
      });
      const box = (x, y, col) => { p.block(x, y, 2, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px, py - 8, 32, 24, white, [90, 96, 110]); c.rect(px + 1, py - 7, 30, 6, [226, 228, 236]); c.rect(px + 1, py + 3, 30, 4, col); for (let i = px + 5; i < px + 30; i += 6) c.rect(i, py + 8, 1, 7, grey); }); };
      for (const [x, y, n] of [[8, 4, 0], [10, 4, 1], [8, 6, 1], [8, 8, 0], [27, 4, 1], [29, 4, 0], [29, 6, 1], [9, 12, 0], [28, 10, 0], [28, 12, 1]]) box(x, y, n ? gold : [90, 150, 210]);
      // Cranes over the berths.
      for (const [x, y] of [[13, 18], [24, 18]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const px = x * 16, py = y * 16; c.box(px + 2, py - 2, 12, 18, grey, [70, 76, 90]); top.box(px + 5, py - 44, 6, 44, white, [90, 96, 110]); top.box(px - 20, py - 48, 60, 6, gold, [120, 96, 30]); top.line(px + 34, py - 42, px + 34, py - 26, [70, 76, 90]); top.box(px + 30, py - 26, 9, 7, grey, [70, 76, 90]); }); }
      // The ferry and a launch.
      p.paint(27, (c) => { const px = 22 * 16 + 8, py = 24 * 16 + 6; c.poly([[px, py + 8], [px + 190, py + 8], [px + 176, py + 44], [px + 14, py + 44]], [60, 66, 84]); c.poly([[px + 3, py + 9], [px + 187, py + 9], [px + 174, py + 41], [px + 16, py + 41]], white); c.rect(px + 6, py + 12, 178, 3, gold); c.box(px + 40, py - 8, 100, 22, white, [90, 96, 110]); for (let i = px + 46; i < px + 134; i += 12) c.rect(i, py - 3, 7, 6, [110, 180, 230]); c.box(px + 70, py - 20, 34, 13, white, [90, 96, 110]); c.rect(px + 74, py - 17, 26, 4, [110, 180, 230]); c.poly([[px + 82, py + 20], [px + 96, py + 30], [px + 82, py + 38], [px + 68, py + 30]], gold); });
      boat(p, 12, 23, white, 4);
    },
  },
  // Seafolk Village: no land to speak of, just boardwalks on the sea and the seafolk's houseboats,
  // each shaped like a Pokemon, moored around them. In the middle floats the big restaurant boat:
  // a broad wooden hull under two yellow thatched roofs with a tree growing between them. The
  // Steelix boat lies east, the whale boat west; the beach to Poni Wilds lies west.
  AlolaSeafolkVillage: {
    theme: { town: true, ground: "beach", road: "deck", border: "palms", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 7, 0, 37, 31); p.fill("water", 5, 1, 6, 12); p.fill("water", 5, 21, 6, 30);
      p.street("deck", 3, [[4, 16], [36, 16]]); p.street("deck", 3, [[19, 1], [19, 30]]);
      p.street("deck", 2, [[10, 8], [29, 8], [29, 24], [10, 24], [10, 8]]);
      p.fill("deck", 30, 18, 32, 19); p.fill("deck", 12, 11, 14, 12); p.fill("deck", 12, 20, 14, 21); p.fill("deck", 25, 20, 27, 21);
      p.street("deck", 2, [[13, 6], [13, 8]]); p.street("deck", 2, [[26, 6], [26, 8]]); p.street("deck", 2, [[13, 25], [13, 26]]); p.street("deck", 2, [[26, 25], [26, 26]]); p.street("deck", 2, [[30, 12], [32, 12]]);
      pokeboat(p, 10, 2, 7, 4, "wailord"); pokeboat(p, 23, 2, 6, 4, "magikarp"); pokeboat(p, 10, 27, 7, 4, "whiscash"); pokeboat(p, 22, 27, 7, 4, "huntail"); pokeboat(p, 29, 9, 8, 3, "steelix");
      // The restaurant boat in the middle: hull deck, two thatched roofs overhead, the tree between.
      p.disc("deck", 19.5, 16.5, 5.5, 6.5);
      p.paint(1, (c) => { const cx = 19.5 * 16, cy = 16.5 * 16; c.ellipse(cx, cy, 5.5 * 16, 6.5 * 16, [96, 64, 40], 4); });
      p.decor("tree1", 21, 14, { canopy: true });
      p.paint(99, (c, top) => { const cx = 19.5 * 16; for (const [y0, dir] of [[9 * 16, 1], [20 * 16 + 8, -1]]) { const a = dir > 0 ? y0 : y0 + 64, b = dir > 0 ? y0 + 64 : y0; top.poly([[cx - 26, a], [cx + 26, a], [cx + 62, b], [cx - 62, b]], [150, 110, 40]); top.poly([[cx - 23, a + dir * 2], [cx + 23, a + dir * 2], [cx + 58, b - dir * 2], [cx - 58, b - dir * 2]], [236, 200, 90]); for (let k = -5; k <= 5; k++) top.line(cx + k * 4, a + dir * 3, cx + k * 11, b - dir * 3, [200, 160, 60]); top.rect(cx - 2, Math.min(a, b), 4, 64, [250, 226, 130]); } });
      // Market stalls on the inner floats.
      for (const [x, y, n] of [[13, 11, 0], [13, 21, 2], [26, 21, 3]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px, py + 4, 16, 12, [196, 150, 96], [90, 60, 40]); c.poly([[px - 3, py + 5], [px + 8, py - 6], [px + 19, py + 5]], [[214, 70, 70], [70, 120, 200], [240, 200, 80], [90, 170, 110]][n]); c.rect(px + 3, py + 8, 10, 3, [240, 236, 220]); }); }
      boat(p, 30, 21, [240, 200, 90], 3); boat(p, 32, 26, [240, 240, 244], 3); boat(p, 6, 26, [220, 80, 70], 3);
      for (const [x, y] of [[2, 3], [3, 8], [2, 13], [2, 21], [3, 26], [1, 29]]) palm(p, x, y);
    },
  },
  // Ancient Poni Path: Hapu's timber farmhouse in the west with its yard, the old well and vegetable
  // plots beside it, a broad dirt track running north into the canyon mouth between rock walls, and
  // the sea along the south shore.
  AlolaAncientPoniPath: {
    theme: { town: true, ground: "field", road: "dirt", border: "rock", water: "sea", density: 0.02, groves: 0, flowers: 0.04, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      for (let y = 1; y <= 5; y++) p.fill("rock", 1, y, 9 + Math.floor(p.hash(y >> 1, 1, 5) * 6), y);
      for (let y = 1; y <= 7; y++) p.fill("rock", 31 - Math.floor(p.hash(y >> 1, 2, 5) * 6), y, 36, y);
      p.fill("water", 1, 27, 36, 30); p.fill("beach", 1, 25, 36, 26);
      p.street("dirt", 3, [[19, 1], [19, 16]]); p.street("dirt", 3, [[1, 16], [36, 16]]); p.street("dirt", 2, [[19, 18], [19, 26]]); p.street("deck", 2, [[19, 27], [19, 30]]);
      p.street("dirt", 2, [[20, 12], [27, 12], [27, 11]]); p.street("dirt", 2, [[10, 13], [10, 15]]);
      p.building(2, "logHouse");
      // Hapu's house and yard.
      house(p, 5, 7, 9, 6, { wall: [160, 112, 74], roof: [112, 74, 48], roofH: 30, door: 5, win: [230, 220, 170], edge: [70, 46, 34], extra: (c, px, py, pw, ph) => { for (let i = px + 4; i < px + pw - 2; i += 6) c.rect(i, py + 32, 1, ph - 34, [110, 74, 48]); for (let i = px + 8; i < px + pw - 8; i += 10) { c.line(i, py + 28, i + 5, py + 4, [140, 96, 60]); c.line(i + 5, py + 4, i + 10, py + 28, [140, 96, 60]); } } });
      fence(p, 3, 6, 14, 6); fence(p, 3, 7, 3, 13); fence(p, 4, 14, 8, 14);
      crops(p, 14, 8, 16, 11); crops(p, 24, 19, 31, 22); crops(p, 6, 19, 13, 22, [150, 170, 60]);
      fence(p, 23, 18, 32, 18); fence(p, 23, 23, 32, 23); fence(p, 32, 19, 32, 22); fence(p, 5, 18, 14, 18); fence(p, 5, 23, 14, 23); fence(p, 5, 19, 5, 22);
      // The well.
      p.block(15, 13, 1, 1); p.paint(14, (c, top) => { const px = 15 * 16, py = 13 * 16; c.ellipse(px + 8, py + 9, 8, 6, [110, 106, 110]); c.ellipse(px + 8, py + 8, 6, 4, [150, 146, 150]); c.ellipse(px + 8, py + 8, 4, 2, [40, 70, 110]); c.rect(px, py - 4, 2, 12, [110, 78, 50]); c.rect(px + 14, py - 4, 2, 12, [110, 78, 50]); top.poly([[px - 3, py - 4], [px + 8, py - 13], [px + 19, py - 4]], [150, 70, 60]); });
      p.decor("honeyTree", 32, 9, { canopy: true }); p.decor("honeyTree", 2, 19, { canopy: true }); p.decor("honeyTree", 34, 19, { canopy: true });
      for (const [x, y] of [[2, 24], [15, 24], [24, 25], [33, 24]]) palm(p, x, y);
      for (const [x, y] of [[13, 13], [22, 20], [16, 21]]) p.decor("barrels", x, y);
    },
  },
  // Poni Grove: a narrow grassy valley: a winding dirt track between big patches of tall grass,
  // palms and leafy trees, rounded rock outcrops, and the rock gateway in the north-east. (No pond
  // or flower beds: the real grove has neither.)
  AlolaPoniGrove: {
    theme: { ground: "grass", road: "dirt", border: "tree", density: 0.06, groves: 0.06, flowers: 0.02, tree: "tree1", autoHouses: false, turn: 6, wander: 0, gym: ["oreGym"] },
    plan(p) {
      p.fill("rock", 22, 1, 36, 5); p.fill("rock", 22, 6, 23, 9); p.fill("rock", 31, 6, 36, 10); p.fill("rock", 33, 11, 36, 12);
      p.street("dirt", 2, [[19, 1], [19, 6], [15, 10], [15, 16]]); p.street("dirt", 3, [[1, 16], [36, 16]]); p.street("dirt", 2, [[27, 11], [27, 15]]); p.street("dirt", 2, [[19, 17], [19, 22], [23, 26], [19, 30]]);
      p.building(2, "oreGym");
      p.disc("meadow", 9, 23, 5, 3.5); p.disc("meadow", 28, 23, 5, 3.5); p.disc("meadow", 8, 8, 4.5, 3); p.fill("meadow", 21, 12, 25, 13); p.fill("meadow", 29, 13, 32, 14);
      p.fill("rock", 1, 1, 4, 2); p.fill("rock", 1, 28, 5, 30); p.fill("rock", 32, 28, 36, 30); p.decor("boulder", 12, 15); p.decor("boulder", 24, 26); p.decor("boulder", 5, 14);
      for (const [x, y] of [[3, 4], [6, 5], [11, 4], [13, 12], [4, 12], [10, 13], [3, 20], [14, 21], [5, 28], [13, 28], [22, 20], [25, 28], [33, 19], [34, 26], [30, 28], [17, 3], [21, 7], [31, 14], [17, 19], [21, 19]]) palm(p, x, y);
      p.decor("honeyTree", 24, 18, { canopy: true }); p.decor("honeyTree", 11, 18, { canopy: true });
    },
  },
  // Mount Lanakila base: a green bowl under dark crater walls (the snow starts higher up): a broad
  // bare-earth clearing, the hazard-striped lift platform on its stone steps in the north, stacked
  // girders beside it, two stone guardians at the way out to the south, and a Pokemon Center in the west.
  AlolaLanakilaBase: {
    theme: { town: true, ground: "grass", road: "dirt", border: "rock", density: 0.01, groves: 0, flowers: 0.02, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 1, 1, 15, 3); p.fill("rock", 23, 1, 36, 3); p.fill("rock", 1, 4, 9, 5); p.fill("rock", 29, 4, 36, 6); p.fill("rock", 33, 7, 36, 9); p.fill("rock", 1, 6, 3, 8);
      p.fill("rock", 1, 24, 6, 30); p.fill("rock", 7, 27, 13, 30); p.fill("rock", 30, 24, 36, 30); p.fill("rock", 24, 27, 29, 30); p.fill("rock", 34, 19, 36, 23); p.fill("rock", 1, 20, 2, 23);
      p.disc("dirt", 19.5, 16, 11.5, 8); p.fill("dirt", 17, 9, 22, 12);
      p.street("dirt", 3, [[1, 16], [36, 16]]); p.street("dirt", 3, [[19, 8], [19, 30]]);
      p.fill("steel", 16, 2, 22, 8);
      // The lift: hazard-striped pad, pylons and cables running up the mountain.
      p.block(16, 2, 1, 3); p.block(22, 2, 1, 3);
      p.paint(5, (c, top) => { const x0 = 16 * 16, y0 = 2 * 16, w = 7 * 16, h = 7 * 16; for (let i = 0; i < w; i += 8) { c.rect(x0 + i, y0 + h - 4, 8, 4, (i >> 3) % 2 ? [40, 40, 44] : [240, 200, 60]); } for (let j = 0; j < h; j += 8) { c.rect(x0, y0 + j, 3, 8, (j >> 3) % 2 ? [40, 40, 44] : [240, 200, 60]); c.rect(x0 + w - 3, y0 + j, 3, 8, (j >> 3) % 2 ? [40, 40, 44] : [240, 200, 60]); } c.box(18 * 16 - 4, 3 * 16 - 6, 56, 46, [200, 206, 220], [70, 76, 96]); c.rect(18 * 16, 3 * 16 - 2, 48, 3, [240, 200, 60]); for (const x of [16, 22]) { c.box(x * 16 + 4, 2 * 16, 8, 48, [150, 156, 170], [60, 64, 80]); top.box(x * 16 + 4, 0, 8, 32, [150, 156, 170], [60, 64, 80]); top.rect(x * 16 + 1, 6, 14, 4, [240, 200, 60]); } top.line(16 * 16 + 8, 8, 19 * 16 + 8, 3 * 16, [50, 50, 60]); top.line(22 * 16 + 8, 8, 19 * 16 + 8, 3 * 16, [50, 50, 60]); });
      entry(p, 1);
      house(p, 2, 10, 7, 7, { wall: [246, 240, 232], roof: [214, 70, 66], roofH: 26, door: 2, sign: [250, 250, 250], extra: (c, px, py, pw) => { c.poly([[px + 12, py + 2], [px + pw - 12, py + 2], [px + pw - 6, py + 12], [px + 6, py + 12]], [250, 252, 255]); c.ellipse(px + pw / 2, py + 26, 5, 5, [250, 250, 250]); c.rect(px + pw / 2 - 5, py + 25, 10, 2, [214, 70, 66]); } });
      // Stacked steel girders left by the lift, and the two stone guardians by the south path.
      for (const [x, y] of [[11, 7], [13, 8], [11, 9]]) { p.block(x, y, 2, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px, py + 2, 32, 12, [110, 112, 120], [50, 52, 60]); c.rect(px + 1, py + 3, 30, 2, [160, 162, 170]); c.rect(px + 1, py + 9, 30, 1, [70, 72, 80]); }); }
      for (const x of [17, 22]) { p.block(x, 24, 1, 1); p.paint(25, (c, top) => { const px = x * 16, py = 24 * 16; c.box(px + 2, py + 6, 12, 10, [130, 130, 136], [60, 60, 70]); top.box(px + 4, py - 8, 8, 14, [150, 150, 156], [60, 60, 70]); top.rect(px + 5, py - 5, 2, 2, [40, 40, 50]); top.rect(px + 9, py - 5, 2, 2, [40, 40, 50]); }); }
      p.decor("boulder", 27, 9); p.decor("boulder", 29, 11); p.decor("boulder", 6, 21);
      for (const [x, y] of [[10, 12], [31, 15], [26, 23], [12, 23]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // The Alola Pokemon League inside Lanakila's summit: a dark rock chamber studded with blue ice
  // crystals. Pale glass walkways run in from the entrance to the round central platform and on to
  // the arched, glowing doors of the Elite chambers.
  AlolaLeagueLobby: {
    theme: { town: true, ground: "ash", road: "steel", border: "ashrock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, big: ["whiteHall"], house: ["whiteHall", "flat"] },
    plan(p) {
      p.fill("ashrock", 1, 1, 14, 2); p.fill("ashrock", 24, 1, 36, 2); p.fill("ashrock", 1, 3, 6, 6); p.fill("ashrock", 1, 26, 8, 30); p.fill("ashrock", 28, 27, 36, 30); p.fill("ashrock", 33, 21, 36, 26); p.fill("ashrock", 9, 28, 16, 30); p.fill("ashrock", 22, 29, 27, 30);
      p.disc("frost", 19.5, 16.5, 6, 5); p.disc("steel", 19.5, 16.5, 3.5, 2.8);
      p.street("frost", 3, [[19, 1], [19, 30]]); p.street("frost", 3, [[1, 16], [36, 16]]); p.street("frost", 2, [[27, 11], [27, 14]]);
      p.building(2, "whiteHall");
      p.paint(1, (c) => { const cx = 19.5 * 16, cy = 16.5 * 16; c.ellipse(cx, cy, 6 * 16, 5 * 16, [236, 210, 90], 3); c.ellipse(cx, cy, 3.5 * 16, 2.8 * 16, [110, 200, 236], 2); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.line(cx + dx * 20, cy + dy * 16, cx + dx * 92, cy + dy * 76, [236, 210, 90], 2); c.ellipse(cx, cy, 12, 10, [236, 210, 90]); c.ellipse(cx, cy, 7, 6, [250, 250, 250]); });
      // The arched door of the Elite chamber in the west.
      entry(p, 1);
      p.block(2, 13, 2, 4); p.block(5, 13, 2, 4); p.block(4, 13, 1, 3);
      p.paint(17, (c) => { const px = 2 * 16, py = 12 * 16; c.ellipse(px + 40, py + 44, 40, 44, [70, 76, 96]); c.rect(px, py + 44, 80, 36, [70, 76, 96]); c.ellipse(px + 40, py + 46, 33, 37, [236, 210, 90]); c.ellipse(px + 40, py + 48, 29, 33, [150, 220, 240]); c.rect(px + 11, py + 48, 58, 32, [150, 220, 240]); c.ellipse(px + 40, py + 52, 18, 20, [40, 90, 150]); c.rect(px + 30, py + 52, 20, 28, [40, 60, 110]); c.ellipse(px + 40, py + 40, 6, 6, [240, 150, 60]); });
      // Blue crystals growing out of the rock.
      const crystal = (x, y, s) => { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const px = x * 16 + 8, py = y * 16 + 14; for (const [dx, h, w] of [[-4, 14 + s * 4, 4], [3, 20 + s * 6, 5], [0, 10, 3]]) { const cv = h > 16 ? top : c; c.poly([[px + dx - w, py], [px + dx, py - Math.min(h, 16)], [px + dx + w, py]], [50, 130, 210]); cv.poly([[px + dx - w, py - 2], [px + dx, py - h], [px + dx + w, py - 2]], [50, 130, 210]); cv.poly([[px + dx - w + 1, py - 2], [px + dx, py - h + 2], [px + dx, py - 2]], [130, 210, 250]); } }); };
      for (const [x, y] of [[9, 5], [12, 8], [15, 4], [23, 7], [31, 14], [34, 12], [8, 21], [11, 25], [14, 22], [25, 23], [29, 21], [31, 25], [24, 27], [9, 11], [34, 18], [12, 13], [26, 19], [15, 27]]) crystal(x, y, p.hash(x, y, 3) < 0.5 ? 1 : 0);
    },
  },
  // Postgame expedition hub: a working harbour square. The Battle Tree spreads over the north gate,
  // Team Rainbow Rocket's castle squats in the west, the beast-research station to the north-east,
  // and the expedition ship waits at the quay.
  AlolaPostgamePort: {
    theme: { town: true, ground: "paving", road: "brick", border: "palms", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 24, 36, 30);
      p.street("brick", 3, [[19, 1], [19, 22]]); p.street("brick", 3, [[1, 16], [36, 16]]); p.street("brick", 2, [[2, 22], [35, 22]]); p.street("brick", 2, [[27, 11], [27, 15]]);
      p.street("deck", 3, [[19, 24], [19, 30]]); p.street("deck", 2, [[9, 24], [9, 28]]); p.street("deck", 2, [[28, 24], [28, 29]]);
      p.disc("ornate", 19.5, 16.5, 4.5, 3.5);
      p.building(2, "lab");
      // The Battle Tree: twin trunks either side of the way in, one vast crown overhead.
      p.block(15, 2, 3, 3); p.block(21, 2, 3, 3);
      p.paint(5, (c, top) => { for (const x of [15, 21]) { const px = x * 16; c.box(px + 4, 8, 40, 72, [120, 86, 56], [60, 40, 30]); for (let i = 10; i < 40; i += 7) c.rect(px + i, 10, 2, 68, [90, 62, 42]); c.ellipse(px + 24, 78, 26, 6, [100, 70, 46]); } for (const [dx, dy, r] of [[-70, 30, 34], [70, 30, 34], [-36, 14, 40], [36, 14, 40], [0, 8, 44], [-96, 44, 22], [96, 44, 22]]) { top.ellipse(19.5 * 16 + dx, dy + 6, r, r * 0.6, [30, 96, 60]); top.ellipse(19.5 * 16 + dx - 3, dy + 3, r - 5, r * 0.6 - 4, [56, 140, 76]); top.ellipse(19.5 * 16 + dx - 8, dy - 1, r - 16, r * 0.6 - 10, [110, 186, 96]); } });
      // Team Rainbow Rocket's castle.
      entry(p, 1);
      house(p, 2, 8, 8, 9, { flat: true, wall: [84, 78, 96], roof: [40, 38, 50], roofH: 30, door: 2, win: [226, 70, 70], edge: [24, 22, 30], doorCol: [30, 28, 36], extra: (c, px, py, pw) => { for (let i = 0; i < pw; i += 16) c.box(px + i + 2, py - 6, 12, 10, [40, 38, 50], [24, 22, 30]); c.box(px + pw / 2 - 10, py + 6, 20, 20, [20, 20, 26], [226, 70, 70]); c.rect(px + pw / 2 - 5, py + 9, 3, 14, [226, 70, 70]); c.rect(px + pw / 2 - 5, py + 9, 9, 3, [226, 70, 70]); c.rect(px + pw / 2 + 2, py + 9, 3, 8, [226, 70, 70]); c.rect(px + pw / 2 - 5, py + 15, 9, 3, [226, 70, 70]); c.line(px + pw / 2 - 1, py + 17, px + pw / 2 + 4, py + 23, [226, 70, 70], 3); } });
      p.decor("flat", 31, 1); p.decor("gable", 11, 5, { tint: p.roof(0.8, 1.1, 1.5) }); p.decor("martSmall", 9, 18); p.decor("gable", 31, 18, { tint: p.roof(1.5, 0.9, 0.6) });
      // The expedition ship and harbour boats.
      p.paint(29, (c) => { const px = 21 * 16 + 4, py = 25 * 16 + 4; c.poly([[px, py + 8], [px + 100, py + 8], [px + 88, py + 40], [px + 12, py + 40]], [40, 40, 54]); c.poly([[px + 3, py + 9], [px + 97, py + 9], [px + 86, py + 37], [px + 14, py + 37]], [60, 90, 150]); c.rect(px + 6, py + 12, 88, 3, [236, 190, 70]); c.box(px + 24, py - 8, 50, 20, [236, 236, 240], [80, 80, 96]); for (let i = px + 29; i < px + 68; i += 11) c.rect(i, py - 3, 6, 6, [110, 180, 230]); c.box(px + 44, py - 22, 10, 15, [214, 60, 60], [80, 30, 36]); });
      boat(p, 11, 26, [240, 240, 244], 3); boat(p, 30, 26, [220, 80, 70], 3); boat(p, 4, 25, [240, 200, 90], 3);
      for (const [x, y] of [[13, 14], [25, 18], [13, 18], [34, 14], [3, 20], [16, 20], [22, 20], [35, 20], [26, 3], [9, 3]]) palm(p, x, y);
      for (const [x, y] of [[6, 20], [7, 20], [24, 20], [33, 20]]) p.decor("barrels", x, y);
    },
  },
  // Hau'oli beachfront: the seaside road between Hau'oli City and Iki Town, a low sea wall, the
  // wide sand with its parasols and surfboards, a pier, and the surf shop on the landward side.
  AlolaHauoliBeach: {
    theme: { ground: "lawn", road: "paving", border: "palms", water: "sea", density: 0, groves: 0, flowers: 0.1, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("beach", 1, 1, 15, 30);
      for (let y = 1; y <= 30; y++) p.fill("water", 1, y, 5 + Math.floor(p.hash(y >> 1, 0, 3) * 3), y);
      p.street("paving", 3, [[17, 1], [17, 30]]); p.street("paving", 3, [[18, 16], [32, 16]]); p.street("deck", 3, [[1, 16], [9, 16]]); p.street("sand", 3, [[10, 16], [15, 16]]);
      // The sea wall along the road.
      for (const [y0, y1] of [[2, 13], [19, 29]]) { p.block(15, y0, 1, y1 - y0 + 1); p.paint(y1 + 1, (c) => { c.box(15 * 16 + 4, y0 * 16, 9, (y1 - y0 + 1) * 16, [226, 222, 210], [120, 116, 110]); for (let y = y0 * 16 + 15; y < (y1 + 1) * 16; y += 16) c.rect(15 * 16 + 5, y, 7, 1, [150, 146, 140]); }); }
      for (const [x, y] of [[9, 4], [12, 6], [10, 9], [13, 11], [9, 12], [11, 20], [8, 22], [13, 23], [10, 26], [12, 28], [9, 29]]) parasol(p, x, y);
      // Surfboards stuck in the sand and a lifeguard chair.
      for (const [x, y, col] of [[12, 3, [240, 120, 60]], [13, 3, [80, 170, 220]], [11, 24, [240, 220, 80]], [13, 19, [230, 90, 150]]]) { p.block(x, y, 1, 1); p.paint(y + 1, (c, top) => { const px = x * 16 + 8, py = y * 16; c.ellipse(px, py + 4, 4, 11, col); top.ellipse(px, py - 6, 4, 9, col); top.rect(px, py - 12, 1, 14, [250, 250, 250]); c.rect(px, py + 2, 1, 12, [250, 250, 250]); }); }
      p.block(10, 14, 1, 1); p.paint(15, (c, top) => { const px = 10 * 16, py = 14 * 16; c.line(px + 2, py + 15, px + 5, py - 4, [240, 240, 240], 2); c.line(px + 14, py + 15, px + 11, py - 4, [240, 240, 240], 2); c.rect(px + 3, py + 6, 10, 2, [240, 240, 240]); top.box(px + 2, py - 12, 12, 9, [226, 70, 60], [120, 30, 30]); top.rect(px + 7, py - 10, 2, 5, [250, 250, 250]); top.rect(px + 5, py - 8, 6, 2, [250, 250, 250]); });
      house(p, 22, 4, 6, 5, { wall: [224, 190, 140], roof: [230, 120, 60], roofH: 20, door: 2, sign: [80, 170, 220] });               // surf shop
      house(p, 23, 20, 5, 4, { wall: [252, 224, 204], roof: [236, 120, 160], roofH: 18, door: 2, sign: [250, 240, 200] });               // malasada stand
      p.decor("gable", 28, 10, { tint: p.roof(0.7, 1.2, 1.5) }); p.decor("gable", 29, 20, { tint: p.roof(1.5, 1.1, 0.6) });
      p.street("paving", 2, [[19, 9], [25, 9]]); p.street("paving", 2, [[19, 24], [31, 24]]);
      for (const [x, y] of [[20, 3], [30, 3], [21, 13], [26, 13], [31, 18], [21, 19], [22, 27], [27, 27], [31, 28], [20, 11], [14, 14], [14, 18]]) palm(p, x, y);
      boat(p, 2, 13, [240, 240, 244], 3); boat(p, 1, 22, [220, 80, 70], 2);
    },
  },
  // Malie Garden: a strolling garden round a great pond. The long red bridge crosses the water to
  // the middle, with the tea house, a five-storey pagoda, stone lanterns and a raked rock garden.
  AlolaMalieGarden: {
    theme: { ground: "lawn", road: "gravel", border: "tree", water: "water", density: 0, groves: 0, flowers: 0.06, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 21, 9.5, 15, 6); p.disc("water", 8, 26, 4, 3); p.disc("lawn", 12.5, 8.5, 2.6, 2);
      p.street("gravel", 3, [[1, 18], [40, 18]]); p.street("gravel", 3, [[21, 15], [21, 34]]); p.street("deck", 3, [[21, 1], [21, 15]]);
      p.street("gravel", 2, [[4, 18], [4, 3], [8, 2], [34, 2], [38, 4], [38, 18]]); p.street("gravel", 2, [[13, 19], [13, 30], [21, 31]]); p.street("gravel", 2, [[22, 26], [36, 26], [36, 19]]);
      // Red rails and posts on the bridge.
      p.paint(16, (c, top) => { for (const x of [20 * 16 - 2, 23 * 16 - 1]) { top.rect(x, 3 * 16 + 8, 3, 12 * 16, [206, 50, 44]); top.rect(x + 1, 3 * 16 + 8, 1, 12 * 16, [246, 120, 100]); for (let y = 3 * 16 + 8; y <= 15 * 16 + 8; y += 24) top.box(x - 1, y - 6, 5, 10, [206, 50, 44], [90, 24, 24]); } });
      const pag = (x, y, w, h, roof, door) => house(p, x, y, w, h, { pagoda: true, wall: [244, 240, 228], roof, roofH: 22, door, edge: [50, 46, 56], band: [150, 50, 44] });
      house(p, 27, 20, 7, 5, { wall: [226, 200, 150], roof: [196, 170, 90], roofH: 26, door: 3, edge: [80, 60, 40], band: [150, 50, 44] });   // the thatched tea house
      // The pagoda.
      p.block(6, 20, 3, 3);
      p.paint(23, (c, top) => { const px = 6 * 16, by = 23 * 16; c.box(px + 6, by - 30, 36, 30, [244, 240, 228], [50, 46, 56]); c.box(px + 18, by - 16, 12, 16, [150, 50, 44], [50, 46, 56]); for (let t = 0; t < 5; t++) { const y = by - 30 - t * 18, w = 56 - t * 7, cv = t ? top : c; cv.poly([[px + 24 - w / 2 - 4, y + 2], [px + 24 - w / 2 + 6, y - 9], [px + 24 + w / 2 - 6, y - 9], [px + 24 + w / 2 + 4, y + 2]], [50, 46, 56]); cv.poly([[px + 24 - w / 2 - 1, y], [px + 24 - w / 2 + 7, y - 7], [px + 24 + w / 2 - 7, y - 7], [px + 24 + w / 2 + 1, y]], [70, 78, 100]); if (t < 4) { top.box(px + 24 - w / 2 + 9, y - 18, w - 18, 10, [244, 240, 228], [50, 46, 56]); top.rect(px + 24 - w / 2 + 10, y - 12, w - 20, 2, [206, 50, 44]); } } top.rect(px + 23, by - 30 - 4 * 18 - 20, 2, 12, [236, 190, 70]); });
      // The rock garden: raked sand and standing stones.
      p.fill("sand", 26, 28, 37, 32);
      p.paint(1, (c) => { for (let y = 28 * 16 + 3; y < 33 * 16; y += 4) c.rect(26 * 16 + 2, y, 12 * 16 - 4, 1, [200, 184, 140]); for (const [x, y] of [[29, 30], [34, 29]]) c.ellipse(x * 16 + 8, y * 16 + 8, 20, 14, [200, 184, 140], 1); });
      p.decor("boulder", 28, 28); p.decor("boulder", 33, 27); p.decor("boulder", 36, 30);
      p.fill("flowersPink", 15, 21, 19, 22); p.fill("flowersPink", 23, 21, 25, 22); p.fill("flowersRed", 15, 27, 19, 28); p.fill("flowersBlue", 2, 21, 4, 22); p.fill("flowersPink", 30, 14, 36, 15);
      for (const [x, y] of [[12, 7], [2, 13], [6, 14], [25, 14], [33, 4], [9, 4], [16, 23], [2, 30], [15, 31], [24, 30], [38, 21], [35, 9]]) p.decor("honeyTree", x, y, { canopy: true });
      for (const [x, y] of [[19, 16], [23, 16], [11, 20], [15, 16], [26, 16], [19, 25], [23, 28], [10, 23]]) lamp(p, x, y, [226, 226, 216]);
    },
  },
  // Paniola Ranch: fenced pastures either side of the dirt track, Miltank and Tauros grazing, the
  // red barn with its silo and the Pokemon Nursery by the road.
  AlolaPaniolaRanch: {
    theme: { ground: "meadow", road: "dirt", border: "tree", density: 0.01, groves: 0, flowers: 0.05, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("dirt", 3, [[1, 15], [36, 15]]); p.street("dirt", 2, [[19, 1], [19, 28]]);
      const cow = (x, y, body, spot) => { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.ellipse(px + 9, py + 14, 8, 2, [0, 0, 0, 60]); c.ellipse(px + 8, py + 8, 7, 5, body); c.ellipse(px + 13, py + 5, 4, 4, body); c.rect(px + 5, py + 6, 3, 3, spot); c.rect(px + 9, py + 9, 2, 2, spot); c.rect(px + 4, py + 12, 2, 3, spot); c.rect(px + 11, py + 12, 2, 3, spot); c.p(px + 14, py + 4, [20, 20, 20]); }); };
      const hay = (x, y) => { p.block(x, y, 1, 1); p.paint(y + 1, (c) => { const px = x * 16, py = y * 16; c.box(px + 1, py + 3, 14, 12, [226, 190, 90], [130, 96, 40]); c.rect(px + 2, py + 6, 12, 1, [170, 130, 50]); c.rect(px + 2, py + 11, 12, 1, [170, 130, 50]); }); };
      for (const [x0, y0, x1, y1, gate] of [[3, 3, 16, 12, 10], [23, 3, 34, 12, 28], [3, 19, 16, 26, 10]]) {
        p.fill("field", x0 + 1, y0 + 1, x1 - 1, y1 - 1);
        const south = y0 < 15; fence(p, x0, south ? y0 : y1, x1, south ? y0 : y1); fence(p, x0, south ? y1 : y0, gate - 1, south ? y1 : y0); fence(p, gate + 1, south ? y1 : y0, x1, south ? y1 : y0); fence(p, x0, y0 + 1, x0, y1 - 1); fence(p, x1, y0 + 1, x1, y1 - 1);
      }
      for (const [x, y] of [[5, 5], [9, 7], [13, 5], [7, 10], [12, 9]]) cow(x, y, [250, 190, 200], [40, 40, 40]);
      for (const [x, y] of [[25, 6], [30, 5], [28, 9], [32, 10]]) cow(x, y, [150, 100, 60], [90, 60, 40]);
      for (const [x, y] of [[6, 22], [12, 23], [9, 24]]) cow(x, y, [176, 140, 100], [110, 70, 50]);
      for (const [x, y] of [[4, 4], [15, 11], [24, 4], [4, 20], [5, 20], [21, 20], [21, 21], [22, 21]]) hay(x, y);
      // The red barn and silo.
      house(p, 23, 18, 7, 5, { wall: [190, 60, 50], roof: [90, 70, 70], roofH: 26, door: 3, win: [250, 240, 220], edge: [70, 30, 30], doorCol: [150, 40, 36], extra: (c, px, py, pw, ph) => { c.box(px + 40, py + ph - 26, 32, 26, [150, 40, 36], [250, 240, 220]); c.line(px + 41, py + ph - 25, px + 70, py + ph - 2, [250, 240, 220]); c.line(px + 70, py + ph - 25, px + 41, py + ph - 2, [250, 240, 220]); } });
      p.block(30, 20, 2, 3); p.paint(23, (c, top) => { const px = 30 * 16 + 4, py = 20 * 16; c.box(px, py - 8, 24, 56, [206, 206, 214], [80, 80, 96]); for (let y = py; y < py + 46; y += 9) c.rect(px + 1, y, 22, 1, [150, 150, 164]); c.rect(px + 3, py - 6, 4, 52, [240, 240, 246]); top.ellipse(px + 12, py - 8, 12, 9, [150, 60, 56]); top.ellipse(px + 10, py - 10, 6, 4, [200, 90, 80]); });
      p.decor("cabin", 31, 23); p.decor("logHouse", 22, 23);
      p.decor("barrels", 17, 20); p.decor("barrels", 21, 12); p.decor("barrels", 35, 18);
    },
  },
  // Hau'oli Outskirts: the player's wooden house on the rise above the bay, the path up to Route 1,
  // and Professor Kukui's patched-up lab (brown timber under a dark roof) down on the sand by the water.
  AlolaHauoliOutskirts: {
    theme: { town: true, ground: "grass", road: "sand", border: "palms", water: "sea", density: 0.02, groves: 0, flowers: 0.12, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("beach", 14, 19, 34, 28); p.fill("beach", 20, 18, 34, 18); p.fill("water", 21, 24, 34, 28); p.fill("water", 27, 23, 34, 23);
      p.street("sand", 2, [[18, 1], [18, 14]]); p.street("sand", 3, [[1, 15], [34, 15]]); p.street("sand", 2, [[18, 16], [18, 28]]); p.street("sand", 2, [[10, 24], [10, 26], [17, 26]]);
      p.street("deck", 2, [[24, 24], [24, 27]]);
      p.building(1, "logHouse");
      fence(p, 3, 17, 16, 17, [236, 232, 220]); fence(p, 3, 18, 3, 26, [236, 232, 220]); fence(p, 4, 27, 8, 27, [236, 232, 220]);
      p.fill("flowersRed", 5, 20, 7, 21); p.fill("flowersBlue", 5, 23, 7, 24);
      // Kukui's lab: a beach house with a patched roof and an aerial.
      house(p, 26, 18, 7, 4, { wall: [156, 112, 74], roof: [74, 66, 70], roofH: 22, door: 2, edge: [60, 44, 36], win: [236, 226, 170], extra: (c, px, py, pw) => { c.box(px + pw - 40, py + 5, 16, 10, [150, 110, 70], [70, 46, 34]); c.box(px + 24, py + 9, 12, 8, [200, 200, 206], [70, 70, 80]); c.rect(px + pw - 14, py - 14, 2, 20, [90, 90, 100]); c.rect(px + pw - 19, py - 12, 12, 1, [90, 90, 100]); c.rect(px + pw - 17, py - 8, 8, 1, [90, 90, 100]); } });
      boat(p, 26, 25, [240, 200, 90], 3);
      parasol(p, 16, 21); parasol(p, 21, 21);
      p.decor("gable", 26, 5, { tint: p.roof(1.4, 1, 0.6) }); p.decor("gable", 6, 5, { tint: p.roof(0.7, 1.2, 1.5) });
      for (const [x, y] of [[15, 3], [21, 4], [3, 12], [13, 12], [22, 12], [32, 12], [15, 20], [33, 19], [20, 22], [13, 28], [2, 28], [31, 4]]) palm(p, x, y);
    },
  },
  // Iki Town: the kahuna's village. The wooden battle platform stands in the middle of an oval of
  // bare earth with torches at its corners, Hala's big orange-thatched house in the north-west, a
  // dirt path leaving north between two great trees toward Mahalo Trail, and smaller thatched huts
  // on the lower ground to the south and east.
  AlolaIkiTown: {
    theme: { town: true, ground: "grass", road: "dirt", border: "palms", density: 0.02, groves: 0, flowers: 0.1, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      for (let x = 1; x <= 36; x++) if ((x < 17 || x > 21) && (x < 29 || x > 31)) p.fill("rock", x, 1, x, 4 + Math.floor(p.hash(x >> 1, 0, 5) * 3));
      p.disc("dirt", 19.5, 16, 10, 6.5); p.street("dirt", 3, [[19, 1], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[9, 13], [9, 15]]); p.street("dirt", 2, [[20, 8], [30, 8], [30, 2]]);
      p.street("dirt", 2, [[10, 26], [10, 27], [30, 27], [30, 25]]);
      // The two great trees either side of the path to Mahalo Trail.
      p.decor("honeyTree", 15, 6, { canopy: true }); p.decor("honeyTree", 22, 6, { canopy: true });
      // The battle platform.
      p.fill("deck", 14, 13, 24, 19);
      p.paint(1, (c) => { const x0 = 14 * 16, y0 = 13 * 16, w = 11 * 16, h = 7 * 16; c.rect(x0 - 3, y0 - 3, w + 6, 3, [100, 66, 40]); c.rect(x0 - 3, y0 + h, w + 6, 6, [100, 66, 40]); c.rect(x0 - 3, y0 - 3, 3, h + 6, [100, 66, 40]); c.rect(x0 + w, y0 - 3, 3, h + 6, [100, 66, 40]); c.rect(x0 + 6, y0 + 6, w - 12, 2, [236, 220, 170]); c.rect(x0 + 6, y0 + h - 8, w - 12, 2, [236, 220, 170]); c.rect(x0 + 6, y0 + 6, 2, h - 12, [236, 220, 170]); c.rect(x0 + w - 8, y0 + 6, 2, h - 12, [236, 220, 170]); c.ellipse(x0 + w / 2, y0 + h / 2, 22, 18, [236, 220, 170], 2); c.rect(x0 + w / 2 - 22, y0 + h / 2 - 1, 44, 2, [236, 220, 170]); });
      for (const [x, y] of [[13, 12], [25, 12], [13, 20], [25, 20]]) lamp(p, x, y, [250, 150, 40]);
      const hut = (x, y, w, h, door) => house(p, x, y, w, h, { wall: [150, 104, 68], roof: [214, 140, 62], roofH: 24, door, win: [250, 236, 180], edge: [80, 54, 36], extra: (c, px, py, pw) => { for (let i = px + 4; i < px + pw - 4; i += 5) c.line(i, py + 22, i + 2, py + 4, [170, 100, 44]); } });
      hut(4, 7, 9, 6, 5);                                                     // Hala's house
      fence(p, 3, 14, 7, 14); fence(p, 11, 14, 13, 14);
      p.building(2, "pcSmall"); p.building(3, "cabin");
      hut(27, 10, 5, 4, 2); hut(22, 21, 5, 4, 2); hut(3, 20, 5, 4, 2);
      for (const [x, y] of [[2, 14], [8, 14], [12, 18], [34, 13], [34, 19], [16, 23], [26, 29], [5, 28], [34, 28], [14, 10], [24, 9]]) palm(p, x, y);
      p.fill("flowersRed", 27, 19, 28, 19); p.fill("flowersPink", 2, 25, 5, 25); p.decor("barrels", 14, 25); p.decor("barrels", 34, 23);
    },
  },
  // Hau'oli City (shopping district): Melemele's seaside city on two asphalt roads. Along the north
  // side of the main road stand the big brown shopping mall, the salon, the blue-roofed boutique and
  // the tall pink tourist bureau under a wooded cliff; between the roads City Hall, the malasada
  // shop, a paved plaza and the police station, with Ilima's house and pool at the west end; the
  // ferry terminal sits out on the water in the south-east and the sea lies south and west.
  AlolaHauoliCity: {
    theme: { ground: "lawn", road: "asphalt", border: "palms", water: "sea", density: 0, groves: 0, flowers: 0.06, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 30, 19, 36); p.fill("water", 26, 30, 42, 36);
      p.fill("rock", 1, 1, 19, 2); p.fill("rock", 25, 1, 42, 2); p.fill("tree", 1, 3, 18, 6); p.fill("tree", 26, 3, 35, 6);
      p.street("asphalt", 3, [[22, 1], [22, 28]]); p.street("asphalt", 3, [[1, 19], [42, 19]]); p.street("asphalt", 2, [[2, 28], [41, 28]]); p.street("paving", 2, [[22, 30], [22, 36]]);
      p.street("paving", 2, [[40, 25], [40, 27]]); p.street("paving", 2, [[2, 17], [41, 17]]); p.street("paving", 2, [[2, 21], [20, 21]]);
      // North side: mall, salon, boutique, tourist bureau.
      house(p, 25, 9, 10, 8, { wall: [206, 160, 110], roof: [150, 104, 64], roofH: 34, door: 5, edge: [80, 54, 36], band: [150, 104, 64], win: [250, 236, 180], sign: [250, 240, 200], extra: (c, px, py, pw) => { c.rect(px + 2, py + 60, pw - 4, 3, [120, 80, 50]); for (let i = px + 12; i < px + pw - 6; i += 18) c.rect(i, py + 4, 2, 28, [176, 128, 84]); } });   // shopping mall
      house(p, 14, 12, 5, 5, { flat: true, wall: [250, 250, 246], roof: [226, 226, 230], roofH: 16, door: 2, doorCol: [150, 200, 230], sign: [70, 70, 80] });   // salon
      house(p, 7, 11, 6, 6, { wall: [236, 244, 250], roof: [60, 130, 210], roofH: 40, door: 3, doorCol: [150, 200, 230], sign: [250, 250, 250] });               // boutique
      house(p, 37, 5, 5, 12, { flat: true, wall: [240, 176, 160], roof: [214, 140, 126], roofH: 14, door: 2, win: [130, 190, 236], band: [250, 240, 230], sign: [250, 250, 250] });   // tourist bureau tower
      // Between the roads: Ilima's house and pool, City Hall, malasada shop, plaza, police station.
      house(p, 2, 22, 5, 3, { wall: [226, 226, 220], roof: [70, 74, 86], roofH: 18, door: 2 });
      p.fill("paving", 2, 25, 6, 26); p.fill("water", 3, 25, 5, 26);
      house(p, 9, 22, 10, 5, { wall: [250, 250, 246], roof: [120, 200, 200], roofH: 26, door: 5, edge: [90, 110, 120], extra: (c, px, py, pw, ph) => { c.box(px + pw / 2 - 26, py + 10, 52, ph - 12, [250, 250, 246], [90, 110, 120]); c.poly([[px + pw / 2 - 30, py + 14], [px + pw / 2, py - 2], [px + pw / 2 + 30, py + 14]], [120, 200, 200]); for (let i = px + pw / 2 - 22; i < px + pw / 2 + 22; i += 12) c.box(i, py + 22, 5, ph - 24, [236, 240, 240], [150, 160, 166]); c.box(px + pw / 2 - 7, py + ph - 18, 14, 18, [90, 60, 44], [60, 56, 64]); c.rect(px + pw / 2 - 1, py - 16, 2, 16, [90, 90, 100]); c.poly([[px + pw / 2 + 1, py - 16], [px + pw / 2 + 13, py - 12], [px + pw / 2 + 1, py - 8]], [70, 150, 210]); } });   // City Hall
      house(p, 24, 22, 5, 4, { wall: [250, 240, 220], roof: [226, 120, 50], roofH: 18, door: 2, sign: [250, 240, 200] });                  // malasada shop
      p.fill("paving", 29, 22, 32, 26);
      house(p, 33, 22, 3, 4, { wall: [236, 240, 250], roof: [50, 90, 190], roofH: 22, door: 1, sign: [240, 210, 80] });                     // police station
      // The Pokemon Center over its entrance.
      entry(p, 2);
      house(p, 38, 21, 5, 3, { wall: [250, 246, 240], roof: [214, 70, 66], roofH: 20, door: 2, extra: (c, px, py, pw) => { c.ellipse(px + pw / 2, py + 11, 6, 6, [250, 250, 250]); c.rect(px + pw / 2 - 6, py + 10, 12, 2, [214, 70, 66]); } });
      // The ferry terminal on the water, its quay and the marina boats.
      p.fill("paving", 27, 30, 41, 30); p.fill("deck", 38, 31, 41, 35);
      house(p, 28, 30, 9, 5, { wall: [226, 230, 244], roof: [86, 150, 214], roofH: 34, door: 4, sign: [70, 190, 220], win: [150, 200, 240] });
      p.street("deck", 2, [[10, 30], [10, 34]]);
      boat(p, 31, 35, [250, 250, 250], 4); boat(p, 3, 31, [250, 250, 250], 3); boat(p, 12, 32, [70, 130, 200], 4); boat(p, 5, 34, [220, 80, 70], 3);
      // The sea wall along the south road.
      p.paint(30, (c) => { for (const [x0, x1] of [[1, 19], [26, 26]]) { c.rect(x0 * 16, 30 * 16 - 3, (x1 - x0 + 1) * 16, 4, [226, 222, 210]); c.rect(x0 * 16, 30 * 16 + 1, (x1 - x0 + 1) * 16, 1, [120, 116, 110]); } });
      for (const [x, y] of [[2, 16], [20, 16], [24, 16], [36, 16], [8, 21], [20, 22], [20, 25], [29, 21], [24, 27], [2, 29], [8, 29], [15, 29], [19, 29], [25, 30], [20, 32], [24, 33], [20, 8], [24, 8], [13, 9], [3, 9], [36, 8]]) palm(p, x, y);
    },
  },
};
