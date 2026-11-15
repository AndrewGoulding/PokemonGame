// paldea towns, drawn by hand. See README.md.
// Every Paldea town shares one set of anchors (north step 19,4; west 4,17; door 27,10; steps 24,14/24,15;
// door 10,26; gates in the middle of each edge), so the towns differ in everything drawn around them.
"use strict";
const T = 16, EDGE = [56, 44, 48], WHITE = [246, 242, 232];
const mul = (c, f) => [c[0] * f, c[1] * f, c[2] * f].map((v) => Math.max(0, Math.min(255, Math.round(v))));

// ---------------------------------------------------------------- hand-drawn buildings
// A house front: px,py top-left in pixels, W x H pixels, dx the door tile's left edge (or null).
function facade(c, px, py, W, H, dx, o) {
  const wall = o.wall || [242, 234, 214], roof = o.roof || [200, 98, 70], rh = o.flat ? 9 : Math.round(H * 0.42), glass = o.glass || [150, 200, 232];
  c.box(px, py + rh - 2, W, H - rh + 2, wall, EDGE);
  c.rect(px + 1, py + H - 4, W - 2, 3, mul(wall, 0.82));
  if (o.flat) { c.box(px - 1, py, W + 2, rh, roof, EDGE); c.rect(px, py + rh - 3, W, 2, mul(roof, 0.75)); }
  else {
    c.poly([[px - 3, py + rh], [px + 5, py - 1], [px + W - 5, py - 1], [px + W + 3, py + rh]], EDGE);
    c.poly([[px - 1, py + rh - 1], [px + 6, py + 1], [px + W - 6, py + 1], [px + W + 1, py + rh - 1]], roof);
    for (let y = 4; y < rh - 2; y += 4) { const ins = Math.round(6 - 7 * y / rh); c.rect(px + ins + 1, py + y, W - 2 * ins - 2, 1, mul(roof, 0.8)); }
  }
  const low = H - rh < 44, wy = py + rh + (low ? 4 : 6);
  for (let x = px + 4; x + 9 <= px + W - 3; x += 16) {
    if (dx != null && x + 9 > dx - 6 && x < dx + 22 && (low || o.sign || o.ball)) continue;
    c.box(x, wy, 9, 9, glass, EDGE); c.rect(x + 1, wy + 1, 3, 2, mul(glass, 1.2));
  }
  if (o.columns) for (let x = px + 3; x < px + W - 4; x += 16) { if (dx != null && Math.abs(x - dx) < 12) continue; c.rect(x, py + rh, 4, H - rh - 1, WHITE); c.rect(x + 3, py + rh, 1, H - rh - 1, [190, 186, 176]); c.rect(x - 1, py + rh, 6, 2, [226, 190, 90]); }
  if (o.awning) { for (let x = px + 1; x < px + W - 1; x += 4) c.rect(x, py + H - 24, Math.min(4, px + W - 1 - x), 5, ((x - px) >> 2) % 2 ? o.awning : WHITE); c.rect(px + 1, py + H - 19, W - 2, 1, EDGE); }
  if (dx != null) {
    const dw = o.wide ? 20 : 12, x = dx + 8 - dw / 2;
    c.box(x - 1, py + H - 17, dw + 2, 17, o.door || [104, 70, 48], EDGE);
    if (o.arch) c.rect(x + 1, py + H - 15, dw - 2, 15, [30, 26, 34]);
    else if (o.wide) { c.rect(x + 1, py + H - 15, dw - 2, 14, mul(glass, 0.9)); c.rect(x + dw / 2 - 1, py + H - 15, 1, 14, EDGE); }
  }
  const sx = dx != null ? dx + 8 : px + W / 2, sy = o.flat ? (low ? py + 5 : py + H - 28) : py + rh / 2 + 1, sr = o.flat && low ? 4 : 6;
  if (o.ball) { c.ellipse(sx, sy, sr + 1, sr + 1, EDGE); c.ellipse(sx, sy, sr, sr, WHITE); for (let y = -sr; y < 0; y++) for (let x = -sr; x <= sr; x++) if (x * x + y * y <= sr * sr) c.p(sx + x, sy + y, [220, 60, 60]); c.rect(sx - sr, sy - 1, sr * 2 + 1, 2, EDGE); c.rect(sx - 1, sy - 2, 3, 4, WHITE); }
  else if (o.star) star(c, sx, sy, sr + 2, o.star);
  else if (o.sign) { c.ellipse(sx, sy, sr + 1, sr + 1, EDGE); c.ellipse(sx, sy, sr, sr, o.sign); c.ellipse(sx - 1, sy - 2, 2, 2, mul(o.sign, 1.3)); }
}
// A hand-drawn building on warp k's door: l/r tiles to the left/right of the door, h tiles tall.
function build(p, k, o) {
  const w = p.warps[k], x0 = w.x - o.l, x1 = w.x + o.r, y0 = w.y - o.h + 1;
  if (x0 <= 2) { p.fill("ground", 1, y0 - 1, 1, w.y + 1); p.fill("ground", 2, y0 - 1, 2, y0 - 1); p.fill("ground", 2, w.y + 1, 2, w.y + 1); }   // keep the west gate reachable round the back
  if (p.bare) p.bare(k);                                                              // the front is ours: no generated porch behind it
  for (let y = y0; y <= w.y; y++) for (let x = x0; x <= x1; x++) if (x !== w.x || y !== w.y) p.block(x, y, 1, 1);
  p.paint(w.y + 1.01, (c, top) => (o.draw ? o.draw(c, x0 * T, y0 * T, (x1 - x0 + 1) * T, o.h * T, w.x * T, top) : facade(c, x0 * T, y0 * T, (x1 - x0 + 1) * T, o.h * T, w.x * T, o)));
}
// The same front with no way in (o.dc = column of a painted door).
function shop(p, x, y, w, h, o) { p.block(x, y, w, h); p.paint(y + h, (c) => facade(c, x * T, y * T, w * T, h * T, o.dc == null ? null : (x + o.dc) * T, o)); }
// A gate to a route: a stone (or coloured) arch, three tiles wide.
const gate = (p, k, wall, roof) => build(p, k, { l: 1, r: 1, h: 2, flat: true, arch: true, wide: true, wall: wall || [214, 204, 186], roof: roof || [170, 150, 130] });
const center = (p, k, roof) => build(p, k, { l: 2, r: 3, h: 4, roof: roof || [214, 70, 70], ball: true, wide: true });

// ---------------------------------------------------------------- props
function prop(p, x, y, w, h, draw) { p.block(x, y, w, h); p.paint(y + h, (c, top) => draw(c, x * T, y * T, top)); }
function decal(p, draw, z) { p.paint(z || 0, draw); }
function star(c, cx, cy, r, col) { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * 0.42 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } c.poly(pts, col); }
const flag = (p, x, y, col, mark) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.rect(px + 5, py + 12, 6, 3, [60, 54, 60]); c.rect(px + 7, py, 2, 13, [110, 100, 100]); top.rect(px + 7, py - 28, 2, 28, [110, 100, 100]); top.poly([[px + 9, py - 28], [px + 27, py - 21], [px + 9, py - 13]], col); star(top, px + 14, py - 21, 4, mark || [250, 230, 90]); });
const stall = (p, x, y, col) => prop(p, x, y, 2, 1, (c, px, py) => { c.box(px + 1, py + 4, 30, 12, [196, 150, 96], [90, 60, 40]); for (let k = 0; k < 6; k++) c.rect(px + 3 + k * 5, py + 7, 3, 3, [[226, 80, 70], [240, 200, 80], [110, 170, 90]][k % 3]); c.poly([[px - 3, py + 5], [px + 16, py - 10], [px + 35, py + 5]], EDGE); c.poly([[px - 1, py + 4], [px + 16, py - 8], [px + 33, py + 4]], col); c.poly([[px + 10, py + 4], [px + 16, py - 8], [px + 22, py + 4]], WHITE); });
const olive = (p, x, y, fruit, leaf) => prop(p, x, y, 1, 1, (c, px, py, top) => { const g = leaf || [128, 152, 110]; c.ellipse(px + 8, py + 14, 6, 2, [0, 0, 0, 50]); c.rect(px + 6, py + 5, 4, 10, [112, 86, 60]); top.ellipse(px + 8, py, 10, 9, mul(g, 0.6)); top.ellipse(px + 7, py - 1, 8, 7, g); top.ellipse(px + 5, py - 3, 4, 3, mul(g, 1.2)); if (fruit) for (const [a, b] of [[3, 1], [11, -3], [8, 4], [6, -5]]) top.rect(px + a, py + b, 2, 2, fruit); });
const table = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 2, py + 8, 12, 6, [236, 230, 214], EDGE); c.rect(px + 7, py, 2, 9, [110, 100, 100]); top.ellipse(px + 8, py - 3, 11, 6, EDGE); top.ellipse(px + 8, py - 3, 10, 5, col); top.rect(px + 1, py - 4, 3, 3, WHITE); top.rect(px + 12, py - 4, 3, 3, WHITE); top.rect(px + 7, py - 8, 2, 3, WHITE); });
const lamp = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.rect(px + 5, py + 12, 6, 3, [60, 60, 70]); c.rect(px + 7, py, 2, 13, [80, 80, 92]); top.rect(px + 7, py - 12, 2, 12, [80, 80, 92]); top.ellipse(px + 8, py - 13, 8, 8, [col[0], col[1], col[2], 70]); top.ellipse(px + 8, py - 13, 4, 4, col); top.ellipse(px + 7, py - 14, 2, 2, WHITE); });
const pot = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py) => { c.ellipse(px + 8, py + 14, 6, 2, [0, 0, 0, 50]); c.ellipse(px + 8, py + 8, 6, 7, EDGE); c.ellipse(px + 8, py + 8, 5, 6, col); c.box(px + 4, py - 1, 8, 4, mul(col, 0.8), EDGE); c.rect(px + 3, py + 7, 10, 2, WHITE); c.rect(px + 4, py + 10, 8, 1, mul(col, 0.7)); });
const crate = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py) => { c.box(px + 1, py + 1, 14, 14, col, EDGE); c.line(px + 2, py + 2, px + 13, py + 13, mul(col, 0.75)); c.line(px + 13, py + 2, px + 2, py + 13, mul(col, 0.75)); });
const crystal = (p, x, y, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 7, 2, [0, 0, 0, 50]); for (const t of [c, top]) { t.poly([[px + 8, py - 12], [px + 14, py + 3], [px + 11, py + 14], [px + 5, py + 14], [px + 2, py + 3]], mul(col, 0.7)); t.poly([[px + 8, py - 10], [px + 12, py + 3], [px + 8, py + 13], [px + 4, py + 3]], col); t.poly([[px + 8, py - 10], [px + 8, py + 13], [px + 4, py + 3]], mul(col, 1.25)); } c.poly([[px + 13, py + 4], [px + 16, py + 10], [px + 13, py + 15], [px + 11, py + 10]], mul(col, 1.1)); });
const pillar = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 2, py + 10, 12, 6, [214, 208, 196], EDGE); c.rect(px + 5, py - 4, 6, 15, WHITE); c.rect(px + 9, py - 4, 2, 15, [196, 192, 182]); top.rect(px + 5, py - 16, 6, 12, WHITE); top.rect(px + 9, py - 16, 2, 12, [196, 192, 182]); top.box(px + 3, py - 20, 10, 5, [226, 190, 90], EDGE); });
const stoneLantern = (p, x, y) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 4, py + 10, 8, 6, [150, 150, 146], EDGE); c.rect(px + 6, py + 2, 4, 8, [170, 170, 166]); top.box(px + 3, py - 6, 10, 8, [170, 170, 166], EDGE); top.rect(px + 6, py - 4, 4, 4, [250, 220, 120]); top.poly([[px + 1, py - 6], [px + 8, py - 12], [px + 15, py - 6]], [120, 120, 118]); });
function fence(p, x0, y0, x1, y1, col) {
  const post = col || [150, 116, 80]; p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x * T, py = y * T; if (x1 > x0) { c.rect(px, py + 5, 16, 2, post); c.rect(px, py + 10, 16, 2, mul(post, 0.8)); c.rect(px + 6, py + 2, 3, 13, mul(post, 0.65)); } else { c.rect(px + 6, py, 3, 16, post); c.rect(px + 4, py + 3, 7, 2, mul(post, 0.65)); c.rect(px + 4, py + 11, 7, 2, mul(post, 0.65)); } } });
}
// Flights of steps painted over walkable ground.
const steps = (p, x, y, w, h, col) => decal(p, (c) => { const s = col || [222, 214, 196]; for (let j = 0; j < h * T; j += 4) { c.rect(x * T, y * T + j, w * T, 3, s); c.rect(x * T, y * T + j + 3, w * T, 1, mul(s, 0.7)); } c.rect(x * T, y * T, 1, h * T, mul(s, 0.6)); c.rect((x + w) * T - 1, y * T, 1, h * T, mul(s, 0.6)); });
const court = (p, x, y, w, h, col, line) => decal(p, (c) => { const px = x * T, py = y * T, W = w * T, H = h * T, l = line || WHITE; c.rect(px, py, W, H, col); c.rect(px + 3, py + 3, W - 6, 1, l); c.rect(px + 3, py + H - 4, W - 6, 1, l); c.rect(px + 3, py + 3, 1, H - 6, l); c.rect(px + W - 4, py + 3, 1, H - 6, l); c.rect(px + W / 2, py + 3, 1, H - 6, l); c.ellipse(px + W / 2, py + H / 2, 11, 11, l, 1); });
function sunflowers(p, x0, y0, x1, y1) {
  p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => { c.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T, [84, 132, 66]); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (const [a, b] of [[4, 5], [12, 11]]) { const px = x * T + a, py = y * T + b; c.rect(px, py, 1, 5, [50, 100, 50]); c.ellipse(px, py - 1, 4, 4, [250, 206, 50]); c.ellipse(px, py - 1, 2, 2, [120, 76, 40]); } });
}
function paddy(p, x0, y0, x1, y1) {
  p.block(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  p.paint(y1 + 1, (c) => { const px = x0 * T, py = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.box(px, py, W, H, [150, 122, 84], [96, 76, 56]); c.rect(px + 3, py + 3, W - 6, H - 6, [104, 158, 176]); for (let y = py + 6; y < py + H - 5; y += 5) for (let x = px + 6 + ((y / 5) & 1) * 2; x < px + W - 5; x += 5) { c.rect(x, y, 1, 3, [70, 150, 70]); c.rect(x + 1, y + 1, 1, 2, [130, 200, 100]); } });
}
const boat = (p, x, y, hull) => p.paint(y + 3, (c) => { const px = x * T, py = y * T; c.poly([[px, py + 6], [px + 40, py + 6], [px + 34, py + 22], [px + 6, py + 22]], [60, 50, 50]); c.poly([[px + 2, py + 7], [px + 38, py + 7], [px + 33, py + 20], [px + 7, py + 20]], hull); c.box(px + 12, py - 2, 14, 10, [236, 236, 240], [80, 80, 96]); c.rect(px + 15, py + 1, 8, 3, [120, 180, 230]); });
const falls = (p, x0, x1, y) => decal(p, (c) => { const px = x0 * T, W = (x1 - x0 + 1) * T, py = y * T; c.rect(px, py, W, 16, [150, 200, 236]); for (let x = px + 1; x < px + W; x += 4) c.rect(x, py + 2 + (x % 3), 2, 12, [226, 240, 250]); c.rect(px, py, W, 3, [196, 190, 178]); c.rect(px, py + 13, W, 3, WHITE); }, 0.5);
// The upper half of an ellipse standing on the line y = by.
function arch(c, cx, by, rx, ry, col) { for (let y = -ry; y < 0; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); c.rect(cx - w, by + y, w * 2, 1, col); } }
const cave = (p, x, y, w, h) => decal(p, (c) => { const cx = x * T + w * 8, by = (y + h) * T; arch(c, cx, by, w * 8, h * T, [84, 74, 70]); arch(c, cx, by, w * 8 - 4, h * T - 4, [26, 22, 30]); arch(c, cx, by, w * 8 - 12, h * T - 14, [12, 10, 16]); }, y + h + 0.5);

// Team Star's tents are white tarpaulin boxes sprayed with yellow zigzags; the crew colour is on the star and the door flap.
const boxTent = (p, x, y, col, n) => prop(p, x, y, 3, 2, (c, px, py) => { const w = [236, 238, 240], ylw = [226, 206, 84]; c.rect(px + 2, py + 29, 46, 4, [0, 0, 0, 50]); c.box(px + 1, py + 2, 46, 29, w, EDGE); c.poly([[px, py + 3], [px + 6, py - 6], [px + 42, py - 6], [px + 48, py + 3]], EDGE); c.poly([[px + 2, py + 2], [px + 7, py - 4], [px + 41, py - 4], [px + 46, py + 2]], [250, 250, 252]); for (let k = 0; k < 7; k++) c.line(px + 3 + k * 6, py + (k % 2 ? 12 : 18), px + 9 + k * 6, py + (k % 2 ? 18 : 12), ylw, 2); c.rect(px + 2, py + 24, 44, 2, [200, 204, 210]); if (n % 2) { c.box(px + 18, py + 14, 12, 17, [70, 74, 86], EDGE); c.rect(px + 20, py + 16, 8, 3, col); } else star(c, px + 24, py + 21, 6, col); });
// A wall between two terraces (Cascarrafa's blue ramparts).
function rampart(p, x0, x1, y, col) { p.block(x0, y, x1 - x0 + 1, 1); p.paint(y + 1, (c) => { const px = x0 * T, W = (x1 - x0 + 1) * T, py = y * T; c.box(px, py - 6, W, 22, col, EDGE); c.rect(px + 1, py - 5, W - 2, 3, mul(col, 1.2)); c.rect(px + 1, py + 12, W - 2, 3, mul(col, 0.8)); for (let x = px + 8; x + 8 <= px + W; x += 16) c.poly([[x, py - 1], [x + 4, py + 4], [x, py + 9], [x - 4, py + 4]], mul(col, 1.15)); }); }
// An Area Zero research station: three hexagonal pods of grey panel under blue glass roofs, ivy up the walls.
function station(p, x, y, dark) {
  p.block(x, y, 9, 4);
  p.paint(y + 4, (c) => { const px = x * T, py = y * T, f = dark ? 0.72 : 1, wall = mul([188, 194, 204], f), glass = mul([84, 110, 190], f), ivy = mul([70, 120, 80], f);
    const pod = (ax, top, w) => { c.box(ax, py + top + 12, w, 64 - top - 12, wall, EDGE); c.poly([[ax - 1, py + top + 13], [ax + 8, py + top], [ax + w - 8, py + top], [ax + w + 1, py + top + 13]], EDGE); c.poly([[ax + 1, py + top + 12], [ax + 9, py + top + 2], [ax + w - 9, py + top + 2], [ax + w - 1, py + top + 12]], glass); c.rect(ax + 10, py + top + 5, w - 20, 1, mul(glass, 1.4)); c.rect(ax + 1, py + 60, w - 2, 3, mul(wall, 0.8)); for (let k = 0; k < 4; k++) c.rect(ax + 4 + ((k * 13) % (w - 10)), py + 40 + (k % 2) * 6, 2, 22 - (k % 2) * 6, ivy); };
    pod(px, 16, 46); pod(px + 98, 16, 46); pod(px + 42, 0, 60);
    c.ellipse(px + 72, py + 28, 10, 10, mul([120, 150, 220], f)); c.ellipse(px + 72, py + 28, 6, 6, mul([200, 216, 244], f)); c.box(px + 62, py + 46, 20, 18, [70, 74, 80], EDGE); c.rect(px + 64, py + 44, 16, 2, [120, 240, 150]);
    for (const ax of [px + 12, px + 112]) { c.box(ax, py + 36, 18, 8, [40, 44, 52], EDGE); c.rect(ax + 2, py + 52, 12, 2, [120, 240, 150]); } });
}

// ---------------------------------------------------------------- Team Star bases
// One camp, five crews: barricades, a banner gate, tents round the yard where the Starmobile waits.
function starBase(col, theme, yard, road, tents, extra) {
  return {
    theme: { town: true, density: 0.03, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, ...theme },
    plan(p) {
      p.disc(yard, 19.5, 17, 7.5, 6.5);
      p.street(road, 3, [[19, 1], [19, 30]]); p.street(road, 3, [[1, 16], [36, 16]]);
      const scrap = [120, 110, 110];
      fence(p, 2, 6, 16, 6, scrap); fence(p, 22, 6, 35, 6, scrap); fence(p, 2, 27, 16, 27, scrap); fence(p, 22, 27, 35, 27, scrap);
      fence(p, 2, 7, 2, 12, scrap); fence(p, 2, 19, 2, 26, scrap); fence(p, 35, 7, 35, 13, scrap); fence(p, 35, 19, 35, 26, scrap);
      build(p, 1, { l: 2, r: 3, h: 4, roof: col, wall: [78, 74, 86], door: [40, 36, 44], star: [250, 226, 90], wide: true, arch: true });
      flag(p, 17, 6, col); flag(p, 21, 6, col); flag(p, 17, 27, col); flag(p, 21, 27, col);
      p.paint(7.5, (c, top) => { top.rect(17 * T + 9, 6 * T - 30, 4 * T, 9, EDGE); top.rect(17 * T + 10, 6 * T - 29, 4 * T - 2, 7, col); for (let k = 0; k < 3; k++) star(top, 18 * T + 8 + k * 16, 6 * T - 25, 4, [250, 226, 90]); });
      decal(p, (c) => { c.ellipse(19.5 * T, 17 * T + 8, 62, 52, [col[0], col[1], col[2], 90], 3); star(c, 19.5 * T, 20.5 * T, 26, [col[0], col[1], col[2], 120]); });
      tents.forEach(([x, y], n) => boxTent(p, x, y, col, n));
      // The Starmobile.
      prop(p, 25, 22, 5, 3, (c, px, py) => { c.rect(px + 6, py + 40, 70, 5, [0, 0, 0, 60]); c.box(px + 4, py + 12, 72, 22, col, EDGE); c.box(px + 44, py + 1, 24, 13, [150, 200, 232], EDGE); c.box(px + 6, py + 4, 30, 10, [90, 86, 96], EDGE); for (let k = 0; k < 3; k++) c.rect(px + 10 + k * 8, py - 4, 3, 9, [190, 190, 200]); star(c, px + 30, py + 23, 8, [250, 226, 90]); for (const wx of [18, 62]) { c.ellipse(px + wx, py + 36, 11, 11, [30, 28, 34]); c.ellipse(px + wx, py + 36, 5, 5, [170, 170, 180]); } c.rect(px + 74, py + 18, 4, 6, [250, 240, 160]); });
      if (extra) extra(p);
    },
  };
}

module.exports = {
  // Cabo Poco: the clifftop cape on Paldea's south coast. Home at the top of the lane, the lighthouse on
  // its knoll to the east, Nemona's blue-roofed mansion and its pool on the headland above the beach.
  PaldeaCaboPoco: {
    theme: { town: true, ground: "grass", road: "sand", border: "tree", water: "sea", density: 0.03, groves: 0.1, flowers: 0.5, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 26, 36, 30); p.fill("water", 33, 14, 36, 25);
      p.fill("beach", 1, 23, 32, 25); p.fill("beach", 31, 14, 32, 22);
      p.disc("meadow", 27.5, 8, 5.5, 4.5); p.disc("lawn", 26, 20, 5.5, 3);
      p.street("sand", 3, [[19, 5], [19, 24]]); p.street("sand", 3, [[1, 16], [36, 16]]);
      p.street("sand", 1, [[19, 1], [23, 1], [23, 6], [20, 6]]);                       // round the house to the north gate
      p.street("deck", 3, [[19, 25], [19, 30]]);                                        // the jetty
      p.street("sand", 1, [[27, 11], [27, 15]]); p.street("sand", 1, [[25, 18], [25, 22]]);
      build(p, 0, { l: 2, r: 2, h: 3, roof: [206, 104, 70] });                          // home
      p.building(2, "lighthouse");
      shop(p, 22, 18, 7, 4, { roof: [84, 96, 196], wall: [246, 246, 252], dc: 3, wide: true, columns: true, door: [70, 60, 110] });   // Nemona's house
      prop(p, 29, 20, 2, 2, (c, px, py) => { c.ellipse(px + 16, py + 16, 16, 14, [236, 232, 220]); c.ellipse(px + 16, py + 16, 13, 11, [110, 190, 236]); c.rect(px + 3, py + 15, 26, 2, [236, 232, 220]); c.ellipse(px + 16, py + 16, 4, 4, [236, 232, 220]); c.ellipse(px + 16, py + 16, 2, 2, [110, 190, 236]); });   // the Poké Ball pool
      for (const [x, y] of [[4, 4], [7, 3], [10, 5], [5, 8], [9, 9], [13, 7], [3, 12], [12, 12]]) olive(p, x, y, [240, 150, 50], [70, 140, 70]);   // orange trees
      fence(p, 14, 3, 16, 3); fence(p, 22, 8, 22, 13); fence(p, 2, 21, 17, 21);
      p.fill("flowersRed", 14, 4, 16, 5); p.fill("flowersBlue", 21, 2, 22, 4);
      table(p, 6, 24, [226, 80, 70]); table(p, 12, 24, [70, 130, 200]);
      boat(p, 22, 27, [200, 60, 60]); boat(p, 9, 27, [240, 240, 244]);
    },
  },
  // Mesagoza: the round walled city in its lake. Bridges cross the water west, east and south, the avenue
  // runs up through the central plaza to the great stairway and the Academy with its Poké Ball tower.
  PaldeaMesagoza: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", water: "water", density: 0, groves: 0, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("grass", 2, 2, 35, 29);
      p.disc("water", 19, 20, 18.5, 11.5); p.fill("water", 2, 12, 5, 20); p.fill("water", 32, 12, 35, 20);   // the lake round the west, south and east walls
      p.disc("grass", 19, 16.5, 17.6, 14); p.disc("rock", 19, 16.5, 17, 13.5); p.disc("paving", 19, 16.5, 15.8, 12.3);   // the green rim and the city wall
      p.fill("paving", 2, 15, 35, 17); p.fill("paving", 18, 28, 20, 29); p.fill("paving", 16, 2, 22, 5);
      p.fill("water", 2, 13, 2, 14); p.fill("water", 2, 18, 2, 19); p.fill("water", 35, 13, 35, 14); p.fill("water", 35, 18, 35, 19);
      p.disc("cobble", 19.5, 16.5, 9.5, 7.5); p.disc("paving", 19.5, 16.5, 7.5, 5.5);
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 3, [[1, 16], [36, 16]]); p.street("cobble", 5, [[19, 4], [19, 9]]);
      p.street("cobble", 1, [[10, 26], [10, 27], [17, 27]]); p.street("cobble", 1, [[30, 25], [30, 26], [21, 27]]);
      steps(p, 17, 4, 5, 6, [232, 226, 210]);
      // The plaza: a pale court with a pastel wheel of colour laid into it.
      decal(p, (c) => { const cx = 19.5 * T, cy = 16.5 * T, cols = [[240, 150, 150], [244, 190, 130], [244, 226, 140], [170, 220, 150], [140, 210, 220], [150, 170, 236], [196, 160, 230], [236, 160, 210]];
        c.ellipse(cx, cy, 82, 66, [236, 240, 244]); c.ellipse(cx, cy, 80, 64, [222, 228, 236], 2);
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, b = a + Math.PI / 4, m = (a + b) / 2; c.poly([[cx + Math.cos(a) * 30, cy + Math.sin(a) * 23], [cx + Math.cos(a) * 54, cy + Math.sin(a) * 42], [cx + Math.cos(m) * 57, cy + Math.sin(m) * 44], [cx + Math.cos(b) * 54, cy + Math.sin(b) * 42], [cx + Math.cos(b) * 30, cy + Math.sin(b) * 23], [cx + Math.cos(m) * 32, cy + Math.sin(m) * 24]], cols[k]); }
        c.ellipse(cx, cy, 24, 18, WHITE); c.ellipse(cx, cy, 24, 18, [150, 170, 236], 2); c.ellipse(cx, cy, 8, 6, [244, 226, 140]); }, 0.2);
      // The Academy across the top of the stairs.
      p.block(9, 1, 9, 3); p.block(21, 1, 9, 3); if (p.bare) p.bare(1);
      p.paint(4, (c, top) => { for (const x0 of [9 * T, 21 * T]) { c.box(x0, 20, 9 * T, 44, [244, 236, 214], EDGE); c.poly([[x0 - 3, 24], [x0 + 6, 2], [x0 + 9 * T - 6, 2], [x0 + 9 * T + 3, 24]], EDGE); c.poly([[x0 - 1, 23], [x0 + 7, 4], [x0 + 9 * T - 7, 4], [x0 + 9 * T + 1, 23]], [214, 110, 60]); for (let y = 8; y < 22; y += 4) c.rect(x0 + 6, y, 9 * T - 12, 1, [170, 84, 50]); for (let x = x0 + 6; x < x0 + 9 * T - 10; x += 14) { c.box(x, 30, 9, 12, [150, 200, 232], EDGE); c.rect(x, 48, 9, 12, [226, 216, 190]); } c.rect(x0 + 1, 60, 9 * T - 2, 3, [200, 190, 166]); }
        const tx = 17 * T; top.box(tx, 0, 5 * T, 36, [244, 236, 214], EDGE); top.box(tx - 3, 0, 5 * T + 6, 5, [214, 110, 60], EDGE); top.ellipse(tx + 40, 20, 13, 13, EDGE); top.ellipse(tx + 40, 20, 12, 12, WHITE); for (let y = -12; y < 0; y++) for (let x = -12; x <= 12; x++) if (x * x + y * y <= 144) top.p(tx + 40 + x, 20 + y, [60, 100, 190]); top.rect(tx + 28, 19, 24, 3, EDGE); top.ellipse(tx + 40, 20, 4, 4, EDGE); top.ellipse(tx + 40, 20, 2, 2, WHITE);
        for (const x of [tx, tx + 5 * T - 8]) { top.rect(x, 36, 8, 12, [244, 236, 214]); top.rect(x + 6, 36, 2, 12, [200, 190, 166]); c.rect(x, 48, 8, 16, [244, 236, 214]); c.rect(x + 6, 48, 2, 16, [200, 190, 166]); } });
      center(p, 3); gate(p, 2);
      // Town houses: cream and yellow fronts under terracotta or slate roofs.
      const TERRA = [200, 98, 70], SLATE = [74, 92, 150], CREAM = [244, 232, 200], YELLOW = [240, 214, 140];
      const sh = (x, y, roof, wall, awning) => shop(p, x, y, 4, 3, { roof, wall, awning, dc: 1 });
      sh(11, 6, SLATE, CREAM, [214, 70, 70]); sh(24, 6, SLATE, YELLOW, [70, 130, 200]); sh(5, 11, SLATE, YELLOW, [240, 200, 80]); sh(30, 11, TERRA, CREAM, [90, 170, 110]);
      sh(5, 19, TERRA, CREAM, [90, 170, 110]); sh(30, 19, TERRA, YELLOW, [200, 110, 200]); sh(22, 23, SLATE, CREAM, [214, 70, 70]); sh(15, 23, SLATE, YELLOW, [240, 200, 80]);
      stall(p, 12, 12, [226, 80, 70]); stall(p, 26, 12, [70, 130, 200]); stall(p, 25, 20, [240, 200, 80]); stall(p, 12, 20, [90, 170, 110]);
      for (const [x, y] of [[16, 9], [22, 9], [16, 3], [22, 3]]) pillar(p, x, y);
      for (const [x, y] of [[15, 12], [23, 12], [15, 20], [23, 21], [10, 14], [28, 18]]) lamp(p, x, y, [250, 230, 150]);
      for (const [x, y] of [[14, 14], [25, 18]]) p.decor("bench", x, y);
      for (const [x, y] of [[9, 10], [28, 9], [9, 21]]) table(p, x, y, [214, 70, 70]);
    },
  },
  // Los Platos: a handful of white houses with yellow roofs where a loop of pale road leaves the
  // highway, a pond behind them and palms along the verge.
  PaldeaLosPlatos: {
    theme: { town: true, ground: "grass", road: "paving", border: "tree", water: "water", density: 0.03, groves: 0.1, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.disc("water", 7.5, 7, 2.6, 2);
      p.street("paving", 3, [[19, 1], [19, 30]]); p.street("paving", 3, [[1, 16], [36, 16]]);
      p.street("paving", 2, [[9, 15], [9, 12], [12, 9], [26, 9], [27, 11], [27, 15]]);                    // the loop
      p.building(2, "pcSmall");
      const house = (x, y, w) => shop(p, x, y, w, 3, { roof: [238, 196, 70], wall: [250, 248, 240], dc: 1, door: [120, 150, 190] });
      house(12, 11, 5); house(21, 11, 4); house(11, 4, 5); house(22, 3, 5);
      for (const [x, y] of [[3, 19], [8, 20], [30, 19], [34, 21], [15, 20], [23, 20], [31, 13], [4, 12]]) prop(p, x, y, 1, 1, (c, px, py, top) => { c.ellipse(px + 8, py + 14, 5, 2, [0, 0, 0, 50]); c.rect(px + 7, py - 2, 3, 16, [150, 120, 84]); top.rect(px + 7, py - 14, 3, 12, [150, 120, 84]); for (const [dx, dy] of [[-10, -4], [10, -4], [-7, -11], [7, -11], [0, -13]]) top.line(px + 8, py - 14, px + 8 + dx, py - 14 + dy + 8, [60, 150, 80], 3); top.ellipse(px + 8, py - 14, 3, 3, [90, 180, 100]); });   // palms
      fence(p, 3, 13, 7, 13); fence(p, 29, 20, 33, 20);
      for (const [x, y] of [[14, 14], [25, 18]]) p.decor("bench", x, y);
      p.fill("flowersRed", 11, 7, 15, 7); p.fill("flowersBlue", 22, 6, 26, 6);
    },
  },
  // Cortondo: the farming town strung along one street among tilled fields. Yellow houses under teal
  // roofs, the olive-roll course in its big paddock to the north-west, the patisserie and the Bug gym.
  PaldeaCortondo: {
    theme: { town: true, ground: "grass", road: "cobble", border: "tree", density: 0.02, groves: 0, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      for (const [x0, y0, x1, y1] of [[2, 21, 8, 24], [10, 21, 16, 24], [2, 26, 8, 29], [10, 26, 16, 29], [22, 25, 28, 29], [30, 25, 35, 29], [22, 2, 28, 7], [30, 2, 35, 7]]) p.fill("dirt", x0, y0, x1, y1);   // tilled plots
      p.fill("dirt", 3, 3, 16, 11);
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 3, [[1, 16], [36, 16]]);
      p.street("cobble", 1, [[27, 11], [27, 15]]); p.street("dirt", 1, [[10, 12], [10, 14]]);
      for (const y of [22, 27]) for (const x of [3, 5, 7, 11, 13, 15]) olive(p, x, y, [80, 60, 110]);
      for (const x of [23, 25, 27, 31, 33]) { olive(p, x, 27, [80, 60, 110]); olive(p, x, 4, [80, 60, 110]); }
      build(p, 1, { l: 2, r: 4, h: 4, flat: true, wall: [238, 240, 244], roof: [110, 160, 80], wide: true, sign: [170, 210, 90] });   // the gym
      gate(p, 2); fence(p, 22, 10, 25, 10, [190, 180, 164]); fence(p, 29, 10, 35, 10, [190, 180, 164]);
      // The olive-roll course.
      fence(p, 2, 2, 17, 2); fence(p, 2, 12, 9, 12); fence(p, 11, 12, 17, 12); fence(p, 2, 3, 2, 11); fence(p, 17, 3, 17, 11);
      fence(p, 6, 7, 6, 11); fence(p, 10, 3, 10, 7); fence(p, 13, 7, 13, 11);
      prop(p, 3, 3, 2, 2, (c, px, py) => { c.ellipse(px + 16, py + 28, 13, 4, [0, 0, 0, 60]); c.ellipse(px + 16, py + 14, 15, 15, EDGE); c.ellipse(px + 16, py + 14, 14, 14, [124, 150, 60]); c.ellipse(px + 11, py + 9, 6, 5, [170, 196, 96]); c.ellipse(px + 21, py + 20, 5, 4, [96, 120, 50]); });
      prop(p, 15, 4, 1, 2, (c, px, py) => { c.box(px + 1, py + 6, 14, 24, [196, 150, 96], [90, 60, 40]); for (let k = 0; k < 5; k++) c.rect(px + 2, py + 9 + k * 4, 12, 1, [150, 110, 70]); c.rect(px + 7, py - 12, 2, 18, [110, 100, 100]); c.poly([[px + 9, py - 12], [px + 20, py - 8], [px + 9, py - 4]], [226, 80, 70]); });
      const TEAL = [50, 150, 160], OCHRE = [238, 200, 84];
      shop(p, 22, 11, 4, 4, { roof: TEAL, wall: OCHRE, awning: [236, 130, 160], dc: 1, door: [150, 90, 70] });                  // the patisserie
      for (const x of [22, 27, 32]) shop(p, x, 18, 4, 4, { roof: TEAL, wall: OCHRE, dc: 1 });
      shop(p, 12, 18, 5, 3, { roof: TEAL, wall: OCHRE, dc: 2 }); shop(p, 12, 13, 4, 2, { roof: TEAL, wall: OCHRE, flat: true });
      table(p, 26, 13, [70, 150, 130]);
      for (const [x, y] of [[9, 19], [10, 19]]) p.decor("barrels", x, y);
    },
  },
  // Artazon: the town of art and flowers. A round plaza with fans of red-roofed, half-timbered houses
  // to west and east, the round hedge maze on the north side, the windmill above its sunflowers, a
  // pond to the south-west and the Surrendering Sunflora on their plinths.
  PaldeaArtazon: {
    theme: { town: true, ground: "grass", road: "brick", border: "tree", water: "water", density: 0.02, groves: 0, flowers: 0.6, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.disc("lawn", 10, 6.5, 5.5, 5.5); p.fill("ornate", 12, 12, 16, 13);
      p.disc("brick", 19.5, 16.5, 5.5, 4.5);
      p.disc("water", 8, 26, 2.6, 2); p.disc("water", 12, 27, 2.6, 1.8);
      p.street("brick", 3, [[19, 1], [19, 30]]); p.street("brick", 3, [[1, 16], [36, 16]]);
      p.street("brick", 1, [[27, 11], [27, 15]]); p.street("brick", 1, [[9, 11], [9, 14]]); p.street("brick", 1, [[22, 24], [35, 24]]); p.street("brick", 1, [[33, 8], [33, 14]]);
      sunflowers(p, 22, 2, 30, 4); sunflowers(p, 22, 25, 35, 28);
      decal(p, (c) => { const cx = 19.5 * T, cy = 16.5 * T; c.ellipse(cx, cy, 30, 24, [120, 84, 60]); c.ellipse(cx, cy, 26, 20, [250, 206, 50], 3); c.ellipse(cx, cy, 18, 13, [150, 100, 70]); }, 0.2);
      center(p, 1);
      build(p, 2, { l: 3, r: 3, h: 5, flat: true, wall: [236, 238, 240], roof: [120, 126, 140], glass: [170, 226, 190], wide: true, sign: [120, 200, 90] });
      // The windmill.
      prop(p, 32, 4, 3, 3, (c, px, py, top) => { for (const t of [c, top]) { t.poly([[px + 6, py + 47], [px + 13, py - 28], [px + 35, py - 28], [px + 42, py + 47]], EDGE); t.poly([[px + 8, py + 46], [px + 14, py - 27], [px + 34, py - 27], [px + 40, py + 46]], WHITE); t.poly([[px + 30, py - 27], [px + 34, py - 27], [px + 40, py + 46], [px + 34, py + 46]], [214, 208, 196]); t.poly([[px + 9, py - 27], [px + 24, py - 46], [px + 39, py - 27]], [150, 90, 60]); } c.box(px + 19, py + 30, 10, 17, [104, 70, 48], EDGE); c.box(px + 20, py + 6, 8, 8, [150, 200, 232], EDGE); const cx = px + 24, cy = py - 22; for (let k = 0; k < 4; k++) { const a = 0.5 + k * Math.PI / 2, ex = cx + Math.cos(a) * 36, ey = cy + Math.sin(a) * 36; top.line(cx, cy, ex, ey, [120, 90, 60], 3); top.line(cx + Math.cos(a) * 10 - Math.sin(a) * 4, cy + Math.sin(a) * 10 + Math.cos(a) * 4, ex - Math.sin(a) * 4, ey + Math.cos(a) * 4, [200, 70, 60], 4); } top.ellipse(cx, cy, 3, 3, EDGE); });
      // The Surrendering Sunflora.
      for (const [x, y] of [[13, 13], [14, 12], [15, 13]]) prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 2, py + 10, 12, 6, [200, 196, 186], EDGE); for (const t of [c, top]) { t.rect(px + 6, py - 2, 4, 12, [90, 160, 80]); t.line(px + 6, py + 3, px + 1, py - 6, [110, 180, 90], 2); t.line(px + 10, py + 3, px + 15, py - 6, [110, 180, 90], 2); t.ellipse(px + 8, py - 9, 7, 7, [250, 206, 50]); t.ellipse(px + 8, py - 9, 4, 4, [250, 236, 190]); t.rect(px + 6, py - 10, 1, 2, EDGE); t.rect(px + 9, py - 10, 1, 2, EDGE); } });
      // The round hedge maze: two rings of hedge with offset gaps and a flower bed in the middle.
      for (let y = 1; y <= 11; y++) for (let x = 4; x <= 15; x++) { const d = Math.hypot(x + 0.5 - 10, y + 0.5 - 6.5), k = Math.round(d); if (k !== 2 && k !== 4) continue; if ((x === 9 || x === 10) && (k === 4 ? y > 6 : y < 6)) continue; p.decor("hedge", x, y); }
      p.fill("flowersRed", 9, 6, 10, 6);
      const art = (x, y, k, col) => prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 2, py + 11, 12, 5, [200, 196, 186], EDGE); for (const t of [c, top]) { if (k === 0) { t.poly([[px + 8, py - 12], [px + 15, py - 2], [px + 8, py + 10], [px + 1, py - 2]], EDGE); t.poly([[px + 8, py - 10], [px + 13, py - 2], [px + 8, py + 8], [px + 3, py - 2]], col); } else if (k === 1) { t.ellipse(px + 8, py, 8, 10, col, 3); t.ellipse(px + 8, py, 8, 10, EDGE, 1); } else { t.line(px + 3, py + 10, px + 12, py - 12, col, 4); t.line(px + 12, py + 10, px + 5, py - 6, mul(col, 0.7), 3); } } });
      art(23, 12, 2, [226, 80, 70]); art(31, 12, 0, [70, 170, 150]); art(15, 23, 0, [240, 200, 80]); art(22, 22, 1, [110, 190, 110]); art(16, 9, 1, [70, 130, 200]); art(4, 23, 2, [200, 110, 200]);
      // The two fans of houses: red roofs over white fronts.
      const house = (x, y) => shop(p, x, y, 4, 3, { roof: [196, 62, 62], wall: [246, 240, 228], dc: 1, door: [90, 60, 44] });
      house(3, 19); house(8, 19); house(13, 19); house(22, 18); house(27, 18); house(32, 18);
    },
  },
  // Cascarrafa: the terraced city of water between the Asado Desert (west) and the green hills (east).
  // Blue ramparts step it down from the gym's tier in the north to the market at the bottom, the
  // cascade falls from pool to pool down the west side and a channel runs round the walls.
  PaldeaCascarrafa: {
    theme: { town: true, ground: "paving", road: "cobble", border: "rock", water: "water", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("desert", 2, 2, 7, 29); p.fill("grass", 33, 2, 35, 29);
      p.fill("palms", 2, 2, 4, 5); p.fill("palms", 2, 26, 4, 29); p.fill("tree", 34, 3, 35, 8); p.fill("tree", 34, 22, 35, 28);
      p.fill("water", 8, 2, 9, 29); p.fill("water", 31, 2, 32, 29);                                  // the channel round the walls
      p.fill("water", 13, 2, 14, 11); p.fill("water", 12, 13, 15, 14); p.fill("water", 11, 24, 16, 26);   // the cascade's pools
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 3, [[1, 16], [36, 16]]);
      p.street("cobble", 1, [[27, 11], [27, 15]]);
      const BLUE = [96, 140, 204];
      rampart(p, 10, 11, 12, BLUE); rampart(p, 16, 17, 12, BLUE); rampart(p, 21, 25, 12, BLUE);
      rampart(p, 10, 11, 23, BLUE); rampart(p, 16, 17, 23, BLUE); rampart(p, 21, 30, 23, BLUE);
      p.block(12, 12, 4, 1); p.block(12, 23, 4, 1); falls(p, 12, 15, 12); falls(p, 12, 15, 23);
      steps(p, 18, 12, 3, 1); steps(p, 18, 23, 3, 1); steps(p, 26, 12, 3, 1);
      center(p, 1, [70, 130, 200]);
      build(p, 2, { l: 3, r: 3, h: 5, flat: true, wall: [238, 242, 246], roof: [70, 130, 200], wide: true, sign: [90, 170, 230] });
      // The lift between the terraces.
      prop(p, 29, 11, 2, 2, (c, px, py, top) => { for (const t of [c, top]) { t.box(px + 2, py - 60, 28, 92, [150, 160, 176], EDGE); t.rect(px + 5, py - 57, 22, 86, [196, 220, 236]); for (let y = py - 50; y < py + 20; y += 12) t.rect(px + 5, y, 22, 1, [150, 160, 176]); t.box(px + 7, py - 30, 18, 20, [240, 200, 80], EDGE); t.rect(px + 10, py - 27, 12, 8, [150, 200, 232]); } c.box(px + 9, py + 12, 14, 20, [70, 76, 96], EDGE); });
      p.decor("parkFountain", 21, 18);                                                              // the plaza's fountain
      // Blue-roofed houses along the terraces.
      const house = (x, y, w) => shop(p, x, y, w, 3, { roof: [64, 110, 200], wall: [244, 246, 250], dc: 1, door: [70, 90, 130] });
      house(10, 4, 3); house(15, 6, 3); house(10, 18, 4); house(14, 19, 3); house(10, 27, 4); house(21, 3, 3);
      // The market on the lowest level.
      const awn = [[226, 80, 70], [70, 130, 200], [240, 200, 80], [90, 170, 110]];
      [[22, 25], [25, 25], [28, 25], [22, 28], [25, 28], [28, 28]].forEach(([x, y], n) => stall(p, x, y, awn[n % 4]));
      for (const [x, y] of [[30, 26], [30, 27], [16, 28], [17, 28]]) crate(p, x, y, [196, 150, 96]);
      for (const [x, y] of [[12, 9], [15, 10], [17, 3], [16, 21], [22, 14], [30, 14]]) pot(p, x, y, [70, 130, 200]);
    },
  },
  // Team Star's bases.
  PaldeaSeginBase: starBase([52, 48, 78], { ground: "grass", road: "dirt", border: "rock", density: 0.02 }, "dirt", "dirt", [[5, 8], [10, 9], [25, 8], [30, 9], [6, 21], [11, 23], [30, 19], [31, 23]], (p) => {
    // West Province: a grassy shelf between brown cliff terraces.
    p.fill("rock", 3, 2, 15, 4); p.fill("rock", 23, 2, 34, 3); p.fill("rock", 3, 28, 12, 29); p.fill("rock", 26, 28, 34, 29); p.fill("rock", 8, 13, 12, 13); p.fill("rock", 25, 13, 30, 13);
    for (const [x, y] of [[8, 12], [9, 12], [31, 13], [14, 24], [15, 24], [24, 10]]) prop(p, x, y, 1, 1, (c, px, py) => { for (let k = 0; k < 3; k++) { c.ellipse(px + 8, py + 12 - k * 5, 7, 3, [30, 28, 34]); c.ellipse(px + 8, py + 11 - k * 5, 4, 1, [90, 86, 96]); } });
    lamp(p, 14, 9, [200, 180, 250]); lamp(p, 24, 20, [200, 180, 250]); lamp(p, 13, 19, [200, 180, 250]);
  }),
  PaldeaSchedarBase: starBase([214, 80, 50], { ground: "grass", road: "dirt", border: "rock", density: 0.03 }, "dirt", "dirt", [[26, 8], [31, 10], [5, 9], [10, 8], [7, 22], [12, 20], [31, 20], [30, 24]], (p) => {
    // East Province: green hillside cut by bare brown banks, a few trees, no desert.
    p.fill("rock", 3, 2, 14, 3); p.fill("rock", 24, 2, 34, 4); p.fill("rock", 3, 28, 15, 29); p.fill("rock", 23, 28, 34, 29); p.fill("rock", 4, 13, 9, 13); p.fill("rock", 27, 14, 32, 14);
    p.fill("dirt", 4, 12, 9, 12); p.fill("dirt", 27, 13, 32, 13);
    for (const [x, y] of [[14, 9], [24, 9], [13, 20], [24, 20]]) prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 4, py + 6, 8, 10, [90, 80, 80], EDGE); c.rect(px + 6, py + 2, 4, 5, [60, 50, 50]); top.poly([[px + 3, py + 2], [px + 8, py - 14], [px + 13, py + 2]], [240, 110, 40]); top.poly([[px + 5, py + 2], [px + 8, py - 8], [px + 11, py + 2]], [250, 220, 90]); });
    for (const [x, y] of [[15, 22], [22, 9], [33, 22]]) p.decor("tree1", x, y, { canopy: true });
  }),
  PaldeaNaviBase: starBase([150, 84, 190], { ground: "shade", road: "dirt", border: "darktree", water: "bog", treeTint: "dark", density: 0.05 }, "dirt", "dirt", [[5, 8], [11, 8], [26, 8], [5, 22], [10, 23], [30, 20], [31, 24], [14, 21]], (p) => {
    p.disc("water", 31, 11, 2.6, 1.8); p.disc("water", 9, 12, 1.6, 1.1);
    for (const [x, y] of [[27, 13], [28, 13], [33, 8], [13, 12], [22, 9], [15, 25], [16, 25]]) prop(p, x, y, 1, 1, (c, px, py) => { c.box(px + 3, py + 2, 10, 13, [120, 70, 160], EDGE); c.rect(px + 3, py + 5, 10, 1, EDGE); c.rect(px + 3, py + 11, 10, 1, EDGE); c.rect(px + 6, py + 7, 4, 3, [190, 240, 110]); });
    lamp(p, 14, 9, [190, 120, 240]); lamp(p, 24, 21, [190, 120, 240]);
  }),
  PaldeaRuchbahBase: starBase([236, 130, 180], { ground: "grass", road: "gravel", border: "tree", water: "water", flowers: 0.3, tree: "tree1", density: 0.02 }, "gravel", "gravel", [[6, 8], [11, 9], [25, 9], [30, 8], [5, 21], [10, 23], [31, 19], [30, 23]], (p) => {
    // North Province, on the north coast: the sea behind the camp, a lighthouse on the shore, and the
    // tents pitched round a marsh of pools and grassy islets.
    p.fill("water", 2, 1, 15, 3); p.fill("water", 23, 1, 35, 3); p.fill("beach", 2, 4, 15, 4); p.fill("beach", 23, 4, 35, 4);
    p.fill("water", 4, 12, 8, 13); p.fill("water", 25, 12, 32, 13); p.fill("water", 5, 19, 11, 19); p.fill("water", 23, 25, 32, 26); p.fill("water", 12, 12, 13, 14); p.fill("water", 25, 19, 27, 21);
    for (const [x, y] of [[6, 12], [28, 13], [30, 12], [27, 25], [30, 26], [8, 19], [26, 20]]) p.fill("grass", x, y, x, y);
    prop(p, 22, 4, 1, 1, (c, px, py, top) => { c.box(px + 1, py + 6, 14, 10, [226, 226, 230], EDGE); for (const t of [c, top]) { t.box(px + 3, py - 34, 10, 42, [236, 236, 240], EDGE); t.rect(px + 4, py - 22, 8, 6, [90, 130, 90]); t.rect(px + 4, py - 6, 8, 6, [90, 130, 90]); t.box(px + 1, py - 40, 14, 7, [70, 76, 90], EDGE); t.rect(px + 5, py - 46, 6, 6, [250, 236, 150]); } c.rect(px + 6, py + 8, 4, 8, [90, 70, 60]); });
    for (const [x, y] of [[14, 9], [24, 9], [13, 20], [24, 20]]) lamp(p, x, y, [250, 170, 210]);
    for (const [x, y] of [[15, 24], [23, 10], [33, 14]]) prop(p, x, y, 1, 1, (c, px, py, top) => { c.box(px + 3, py + 8, 10, 8, [236, 130, 180], EDGE); c.rect(px + 7, py + 8, 2, 8, WHITE); top.ellipse(px + 5, py + 5, 4, 3, [250, 170, 210]); top.ellipse(px + 11, py + 5, 4, 3, [250, 170, 210]); });
  }),
  PaldeaCaphBase: starBase([230, 150, 50], { ground: "grass", road: "dirt", border: "rock", water: "sea", tree: "boulder", density: 0.04 }, "dirt", "dirt", [[25, 8], [30, 9], [6, 9], [11, 8], [6, 22], [31, 19], [11, 21], [30, 23]], (p) => {
    // North Province, near the east coast: a tan dirt yard among grey crags, the sea beyond them.
    p.fill("water", 24, 1, 36, 2); p.fill("rock", 24, 3, 34, 4); p.fill("rock", 3, 2, 8, 4); p.fill("rock", 3, 28, 9, 29); p.fill("rock", 27, 28, 34, 29);
    // Training dummies and a roped ring.
    for (const [x, y] of [[13, 10], [15, 10], [24, 11], [13, 24], [15, 24], [33, 13]]) prop(p, x, y, 1, 1, (c, px, py, top) => { c.rect(px + 7, py, 2, 14, [110, 86, 60]); c.rect(px + 4, py + 13, 8, 3, [90, 70, 50]); top.box(px + 3, py - 12, 10, 16, [214, 180, 130], EDGE); top.rect(px + 3, py - 7, 10, 2, [220, 60, 50]); top.rect(px + 3, py - 1, 10, 2, [220, 60, 50]); });
    fence(p, 4, 12, 8, 12, [220, 60, 50]); fence(p, 24, 13, 30, 13, [220, 60, 50]);
  }),
  // Levincia: the neon city on the east coast. Glass towers on the north shore, more blocks to the
  // south, and between them the ring-shaped battle court built out over the bay, with a causeway east
  // to the container harbour. The Electric gym stands on the west landing.
  PaldeaLevincia: {
    theme: { town: true, ground: "darkpave", road: "asphalt", border: "tree", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 35, 2, 36, 30); p.fill("water", 32, 2, 34, 12); p.fill("water", 32, 21, 34, 30);
      p.fill("water", 11, 13, 31, 20); p.fill("water", 27, 21, 31, 30);
      p.fill("steel", 28, 13, 34, 20);                                                              // the harbour platform
      p.disc("steel", 19.5, 16.5, 7, 3.9); p.disc("water", 19.5, 16.5, 5, 2.6); p.disc("steel", 19.5, 16.5, 2.2, 1.6);   // the ring and its hub
      p.fill("brick", 2, 28, 26, 29);
      p.street("asphalt", 3, [[19, 1], [19, 13]]); p.street("steel", 1, [[19, 13], [19, 19]]); p.street("asphalt", 3, [[19, 20], [19, 30]]);
      p.street("asphalt", 3, [[1, 16], [13, 16]]); p.street("steel", 1, [[13, 16], [26, 16]]); p.street("steel", 3, [[26, 16], [34, 16]]); p.street("deck", 3, [[35, 16], [36, 16]]);
      p.street("asphalt", 1, [[27, 11], [27, 12], [21, 12]]);
      build(p, 1, { l: 2, r: 5, h: 5, flat: true, wall: [58, 58, 92], roof: [250, 214, 60], glass: [130, 230, 250], wide: true, sign: [250, 220, 70] });
      p.building(2, "centerRed");
      p.decor("brickTall", 3, 1); p.decor("towerShort", 8, 2, { canopy: true, tint: p.trim(0.3, 0.8, 1) }); p.decor("towerShort", 13, 2, { canopy: true, tint: p.trim(1, 0.9, 0.2) });
      p.decor("apartment", 21, 5); p.decor("apartment", 4, 21); p.decor("apartment", 8, 21); p.decor("towerShort", 12, 20, { canopy: true, tint: p.trim(0.9, 0.3, 0.9) }); p.decor("apartment", 22, 21);
      shop(p, 31, 4, 3, 4, { flat: true, wall: [70, 110, 200], roof: [50, 70, 140], glass: [150, 220, 250] });
      // The court's markings and Iono's screen over the hub.
      decal(p, (c) => { const cx = 19.5 * T + 8, cy = 16.5 * T; c.ellipse(cx, cy, 106, 58, [250, 230, 90], 2); c.ellipse(cx, cy, 84, 44, [90, 230, 250], 2); c.ellipse(cx, cy, 30, 22, [40, 34, 80]); c.ellipse(cx, cy, 30, 22, [250, 230, 90], 2); c.poly([[cx + 2, cy - 14], [cx - 8, cy + 2], [cx - 1, cy + 2], [cx - 5, cy + 14], [cx + 9, cy - 3], [cx + 2, cy - 3], [cx + 8, cy - 14]], [250, 236, 90]); }, 0.3);
      prop(p, 22, 2, 6, 2, (c, px, py, top) => { c.box(px + 8, py + 22, 6, 10, [60, 60, 76], EDGE); c.box(px + 82, py + 22, 6, 10, [60, 60, 76], EDGE); for (const t of [c, top]) { t.box(px, py - 22, 96, 46, [30, 28, 44], [250, 230, 90]); t.rect(px + 3, py - 19, 90, 40, [70, 200, 230]); t.rect(px + 3, py - 19, 90, 12, [236, 130, 200]); t.poly([[px + 50, py - 16], [px + 38, py + 2], [px + 47, py + 2], [px + 42, py + 18], [px + 60, py - 4], [px + 50, py - 4], [px + 58, py - 16]], [250, 236, 90]); t.ellipse(px + 20, py + 4, 9, 9, [250, 250, 255]); t.ellipse(px + 76, py + 4, 9, 9, [250, 250, 255]); t.ellipse(px + 20, py + 4, 4, 4, [70, 110, 220]); t.ellipse(px + 76, py + 4, 4, 4, [236, 90, 160]); } });
      for (const [x, y, col] of [[17, 11], [21, 10], [17, 22], [21, 23], [11, 11], [8, 19], [26, 23], [30, 12], [17, 6]].map(([x, y], n) => [x, y, [[250, 230, 90], [90, 230, 250], [250, 120, 220]][n % 3]])) lamp(p, x, y, col);
      decal(p, (c) => { for (const x of [17 * T + 14, 21 * T + 1]) for (let y = 2 * T; y < 29 * T; y += 12) { if (y > 12 * T && y < 21 * T) continue; c.rect(x, y, 1, 8, [90, 230, 250]); } });
      // Containers on the harbour platform, boats in the bay.
      [[29, 13], [31, 13], [33, 13], [29, 14], [33, 14], [29, 19], [31, 19], [33, 19], [31, 20], [33, 20]].forEach(([x, y], n) => crate(p, x, y, [[60, 120, 210], [70, 140, 220], [210, 80, 70]][n % 3]));
      for (const [x, y, col] of [[3, 28, [200, 70, 60]], [4, 28, [70, 120, 190]], [15, 29, [240, 200, 80]], [24, 28, [70, 120, 190]]]) crate(p, x, y, col);
      boat(p, 28, 25, [240, 220, 70]); boat(p, 32, 24, [60, 110, 190]); boat(p, 32, 8, [240, 240, 244]);
    },
  },
  // Medali: the town of food. Plain grey-blue blocks of flats on tan paving round a half-round plaza,
  // the long yellow-green terrace with its roof garden to the north and the big dark-roofed Treasure
  // Eatery; restaurant parasols stand in front of the blocks.
  PaldeaMedali: {
    theme: { town: true, ground: "sand", road: "cobble", border: "tree", density: 0.02, groves: 0, flowers: 0.2, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("grass", 2, 2, 35, 3); p.fill("grass", 2, 28, 35, 29);
      p.disc("cobble", 19.5, 17, 6.5, 5); p.fill("sand", 12, 11, 27, 14);
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 3, [[1, 16], [36, 16]]); p.street("cobble", 1, [[27, 11], [27, 15]]);
      build(p, 1, { l: 2, r: 5, h: 5, flat: true, wall: [246, 238, 222], roof: [230, 150, 70], wide: true, sign: [240, 170, 80] });
      p.building(2, "centerRed");
      const FLAT = { flat: true, wall: [128, 142, 172], roof: [92, 104, 134], glass: [70, 96, 170] };
      shop(p, 9, 5, 7, 4, { flat: true, wall: [214, 212, 124], roof: [100, 150, 90], glass: [90, 130, 190], awning: [214, 70, 70], dc: 3 }); for (const x of [9, 11, 13]) table(p, x, 10, [200, 70, 60]);   // the terrace with the roof garden
      shop(p, 28, 19, 6, 5, { ...FLAT, awning: [200, 70, 60], dc: 2 }); for (const x of [28, 30, 32]) table(p, x, 25, [200, 70, 60]);
      shop(p, 3, 20, 9, 5, { roof: [120, 100, 76], wall: [96, 100, 116], glass: [150, 170, 200], dc: 4, wide: true, sign: [250, 220, 90] }); for (const x of [3, 5, 9, 11]) table(p, x, 26, [240, 200, 80]);   // the Treasure Eatery
      shop(p, 32, 5, 4, 5, { ...FLAT, dc: 1 }); for (const x of [32, 34]) table(p, x, 11, [200, 70, 60]);
      shop(p, 3, 5, 5, 5, { ...FLAT, dc: 2 }); table(p, 3, 11, [200, 70, 60]); table(p, 6, 11, [200, 70, 60]);
      shop(p, 22, 22, 5, 5, { ...FLAT, dc: 2 }); shop(p, 13, 23, 4, 4, { ...FLAT, dc: 1 });
      for (const [x, y] of [[13, 13], [26, 20], [14, 20]]) p.decor("bench", x, y);
      for (const [x, y] of [[15, 9], [23, 9], [16, 22], [23, 13]]) lamp(p, x, y, [250, 230, 150]);
      for (const [x, y] of [[22, 4], [23, 4], [16, 4], [8, 27]]) p.decor("hedge", x, y);
    },
  },
  // Montenevera: the snowed-in mountain town where the gym is a concert. Ryme's stage with its
  // lights and speaker stacks at the low south-east end of town, the crowd's patch of trodden snow and cabins.
  PaldeaMontenevera: {
    theme: { town: true, ground: "snow", road: "frostpath", border: "pine", density: 0.04, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, center: ["snowCenter"] },
    plan(p) {
      p.fill("frost", 23, 22, 32, 26);
      p.street("frostpath", 3, [[19, 1], [19, 30]]); p.street("frostpath", 3, [[1, 16], [36, 16]]); p.street("frostpath", 1, [[27, 11], [27, 15]]); p.street("frostpath", 2, [[21, 24], [23, 24]]);
      build(p, 1, { l: 2, r: 4, h: 4, roof: [96, 76, 140], wall: [64, 58, 86], glass: [220, 180, 250], sign: [200, 120, 240], wide: true });
      p.building(2, "snowCenter");
      // The stage.
      prop(p, 23, 19, 10, 3, (c, px, py, top) => { for (const t of [c, top]) { t.box(px + 6, py - 26, 148, 46, [50, 40, 76], EDGE); for (let x = px + 8; x < px + 152; x += 8) t.rect(x, py - 24, 4, 42, [86, 60, 130]); t.box(px + 2, py - 32, 156, 8, [90, 90, 104], EDGE); for (let k = 0; k < 8; k++) t.ellipse(px + 14 + k * 19, py - 22, 4, 4, [[250, 120, 220], [120, 230, 250], [250, 230, 90], [170, 120, 250]][k % 4]); } c.box(px, py + 18, 160, 30, [70, 62, 96], EDGE); c.rect(px + 1, py + 40, 158, 7, [50, 44, 70]); for (let x = px + 6; x < px + 156; x += 10) c.rect(x, py + 42, 4, 3, [250, 230, 90]); for (const sx of [px + 4, px + 136]) { c.box(sx, py - 4, 20, 26, [30, 28, 36], EDGE); c.ellipse(sx + 10, py + 4, 6, 6, [80, 80, 92]); c.ellipse(sx + 10, py + 15, 4, 4, [80, 80, 92]); } c.rect(px + 79, py + 4, 2, 18, [200, 200, 210]); c.ellipse(px + 80, py + 3, 3, 3, [200, 200, 210]); });
      fence(p, 23, 27, 32, 27, [150, 130, 170]); fence(p, 33, 22, 33, 26, [150, 130, 170]);
      p.decor("cabin", 8, 5); p.decor("cabin", 30, 2); p.decor("cabin", 5, 21); p.decor("cabin", 12, 22);
      // Bare rock breaking through the snow round the town.
      p.fill("rock", 10, 11, 14, 12); p.fill("rock", 3, 3, 5, 6); p.fill("rock", 33, 9, 35, 12); p.fill("rock", 3, 28, 9, 29);
      for (const [x, y] of [[17, 8], [21, 8], [17, 21], [21, 21], [9, 19], [22, 18], [34, 19], [16, 13], [30, 13]]) lamp(p, x, y, [200, 140, 250]);
    },
  },
  // Alfornada: the tile-and-pottery town on its plateau above the caverns. Salmon paving, tan brick
  // houses trimmed in turquoise tile, the big round court north of the main street and bottle kilns.
  PaldeaAlfornada: {
    theme: { town: true, ground: "clay", road: "brick", border: "rock", density: 0.02, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 25, 16, 28); p.fill("rock", 22, 25, 35, 28); p.fill("sand", 2, 29, 35, 29);
      p.street("brick", 3, [[19, 1], [19, 30]]); p.street("brick", 3, [[1, 16], [36, 16]]); p.street("brick", 1, [[27, 11], [27, 15]]);
      steps(p, 18, 25, 3, 4);
      cave(p, 5, 26, 4, 3); cave(p, 27, 26, 4, 3); cave(p, 12, 27, 3, 2);
      const tiles = [[70, 170, 180], [240, 200, 80], [214, 90, 70], [70, 120, 190], WHITE], TURQ = [70, 176, 180], TAN = [226, 196, 150];
      // The round court.
      decal(p, (c) => { const cx = 11.5 * T, cy = 8.5 * T; c.ellipse(cx, cy, 74, 70, [200, 110, 96]); c.ellipse(cx, cy, 71, 67, [232, 144, 124]); c.ellipse(cx, cy, 56, 52, WHITE, 1); c.rect(cx - 56, cy, 112, 1, WHITE); c.ellipse(cx, cy, 14, 13, WHITE, 1); for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; c.rect(cx + Math.cos(a) * 64 - 2, cy + Math.sin(a) * 60 - 2, 4, 4, tiles[k % 4]); } }, 0.2);
      // Tile borders down the streets.
      decal(p, (c) => { for (let x = 2 * T; x < 36 * T; x += 8) { if (Math.abs(x - 19.5 * T) < 28) continue; c.rect(x, 15 * T - 4, 4, 4, tiles[(x >> 3) % 5]); c.rect(x, 18 * T, 4, 4, tiles[((x >> 3) + 2) % 5]); } for (let y = 2 * T; y < 25 * T; y += 8) { if (Math.abs(y - 16.5 * T) < 28) continue; c.rect(18 * T - 4, y, 4, 4, tiles[(y >> 3) % 5]); c.rect(21 * T, y, 4, 4, tiles[((y >> 3) + 3) % 5]); } });
      build(p, 1, { l: 2, r: 5, h: 5, flat: true, wall: [240, 240, 244], roof: TURQ, glass: [150, 210, 220], wide: true, sign: [240, 120, 200] });
      p.building(2, "pcSmall");
      const house = (x, y, w, h, roof) => shop(p, x, y, w, h, { flat: true, wall: TAN, roof: roof || TURQ, glass: [110, 180, 200], dc: 1, door: [60, 130, 150] });
      house(22, 3, 3, 3); house(31, 5, 4, 3, [236, 160, 70]); house(10, 19, 5, 4, [236, 160, 70]); house(24, 19, 4, 3); house(30, 18, 5, 4, [236, 160, 70]); house(4, 20, 4, 3);
      // Bottle kilns and pots.
      for (const [x, y] of [[32, 11], [34, 11], [15, 21]]) prop(p, x, y, 1, 1, (c, px, py, top) => { for (const t of [c, top]) { t.poly([[px + 1, py + 15], [px + 3, py - 4], [px + 6, py - 20], [px + 10, py - 20], [px + 13, py - 4], [px + 15, py + 15]], EDGE); t.poly([[px + 3, py + 14], [px + 5, py - 4], [px + 7, py - 18], [px + 9, py - 18], [px + 11, py - 4], [px + 13, py + 14]], [150, 120, 100]); } c.rect(px + 6, py + 8, 4, 7, [40, 30, 30]); });
      [[22, 7], [23, 7], [30, 23], [31, 23], [33, 23], [34, 23], [29, 19], [29, 21], [10, 24], [13, 24], [4, 24]].forEach(([x, y], n) => pot(p, x, y, tiles[n % 4]));
    },
  },
  // Glaseado Mountain: the gym on the summit. The snow slope run comes down the east side between
  // its gates, Grusha's ice court lies below the gym and rock breaks through the snow.
  PaldeaGlaseado: {
    theme: { town: true, ground: "snow", road: "frostpath", border: "pine", density: 0.05, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, center: ["snowCenter"] },
    plan(p) {
      p.fill("rock", 3, 3, 8, 6); p.fill("rock", 11, 2, 15, 4); p.fill("rock", 22, 27, 26, 29); p.fill("rock", 3, 26, 6, 29); p.fill("rock", 22, 2, 25, 4);
      p.street("drift", 4, [[32, 3], [32, 13]]); p.street("drift", 4, [[32, 13], [29, 20], [30, 28]]);
      p.street("frostpath", 3, [[19, 1], [19, 30]]); p.street("frostpath", 3, [[1, 16], [36, 16]]); p.street("frostpath", 1, [[27, 11], [27, 15]]);
      decal(p, (c) => { const run = [[32.5, 3], [32.5, 13], [29.5, 20], [30.5, 29]]; for (let s = 0; s < 3; s++) { const [ax, ay] = run[s], [bx, by] = run[s + 1]; if (ay * T < 18 * T && by * T > 14 * T) { c.line(ax * T, ay * T, bx * T, 14.5 * T, [176, 206, 236, 150], 58); continue; } c.line(ax * T, ay * T, bx * T, by * T, [176, 206, 236, 150], 58); } for (let s = 0; s < 3; s++) { const [ax, ay] = run[s], [bx, by] = run[s + 1]; for (const d of [-9, 0, 9]) c.line(ax * T + d, ay * T, bx * T + d, by * T, [236, 244, 252], 2); } }, 0.1);
      build(p, 1, { l: 2, r: 5, h: 5, flat: true, wall: [226, 240, 250], roof: [90, 170, 220], glass: [170, 226, 250], wide: true, sign: [150, 220, 250] });
      p.building(2, "snowCenter");
      [[30, 5], [35, 5], [30, 9], [35, 9], [30, 13], [35, 13], [27, 20], [32, 20], [27, 24], [33, 24]].forEach(([x, y], n) => prop(p, x, y, 1, 1, (c, px, py, top) => { const col = n % 2 ? [70, 120, 220] : [220, 60, 60]; c.rect(px + 7, py, 2, 14, [90, 90, 100]); top.rect(px + 7, py - 14, 2, 14, [90, 90, 100]); top.poly([[px + 9, py - 14], [px + 20, py - 9], [px + 9, py - 4]], col); }));
      // Start arch at the top of the run.
      p.paint(3, (c, top) => { top.rect(30 * T + 4, 2 * T, 3, 22, [90, 90, 100]); top.rect(35 * T + 8, 2 * T, 3, 22, [90, 90, 100]); top.box(30 * T + 2, 2 * T - 4, 5 * T + 12, 9, [220, 60, 60], EDGE); for (let k = 0; k < 6; k++) top.rect(30 * T + 8 + k * 14, 2 * T - 2, 7, 5, WHITE); });
      // Grusha's court.
      court(p, 8, 20, 9, 5, [176, 214, 240], WHITE);
      fence(p, 7, 19, 17, 19, [206, 70, 70]); fence(p, 7, 26, 17, 26, [206, 70, 70]);
      for (const [x, y] of [[9, 10], [14, 9], [23, 20], [12, 28]]) p.decor("boulder", x, y);
      for (const [x, y] of [[17, 13], [21, 13], [17, 18], [21, 18]]) lamp(p, x, y, [180, 230, 250]);
    },
  },
  // The Pokémon League: the white hall with its swept canopy on a grassy shelf among brown cliffs,
  // a dirt path climbing up to it between the rocks.
  PaldeaLeagueGate: {
    theme: { town: true, ground: "grass", road: "dirt", border: "rock", density: 0.02, groves: 0, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 22, 15, 28); p.fill("rock", 23, 22, 35, 28); p.fill("rock", 23, 2, 35, 6); p.fill("rock", 30, 7, 35, 11);
      p.fill("lawn", 3, 3, 15, 9); p.disc("paving", 8, 18.5, 7, 3.2);
      p.street("dirt", 3, [[19, 1], [19, 30]]); p.street("dirt", 3, [[1, 16], [36, 16]]);
      steps(p, 18, 23, 3, 5, [214, 200, 176]);
      build(p, 1, { l: 2, r: 7, h: 6, flat: true, wall: [246, 246, 250], roof: [170, 190, 216], glass: [170, 200, 226], ball: true, wide: true, columns: true });
      p.paint(11.5, (c, top) => { top.poly([[1 * T, 12 * T + 2], [3 * T, 11 * T - 4], [12 * T, 11 * T - 8], [13 * T, 12 * T + 2]], EDGE); top.poly([[1 * T + 3, 12 * T], [3 * T + 2, 11 * T - 2], [12 * T - 2, 11 * T - 6], [13 * T - 4, 12 * T]], [226, 232, 242]); top.rect(3 * T, 12 * T - 3, 9 * T, 2, [240, 214, 120]); });   // the canopy
      for (const x of [4, 6, 8, 10, 12, 14]) p.decor("hedge", x, 10);
      for (const [x, y] of [[4, 4], [8, 4], [12, 4]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[25, 12], [29, 19], [14, 20]]) p.decor("boulder", x, y);
      for (const [x, y] of [[17, 19], [21, 19]]) lamp(p, x, y, [250, 230, 150]);
    },
  },
  // Research Station One: the three-pod station on the green upper shelf of the Great Crater, a
  // waterfall dropping off the crater wall into its pool and the first crystals in the grass.
  PaldeaResearchOne: {
    theme: { town: true, ground: "grass", road: "dirt", border: "rock", water: "water", density: 0.04, groves: 0.1, flowers: 0.4, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 2, 13, 4); p.fill("water", 3, 5, 12, 10); p.fill("water", 6, 11, 7, 14);
      p.fill("rock", 24, 21, 35, 23); p.fill("rock", 28, 24, 35, 28); p.fill("rock", 2, 22, 9, 24); p.fill("rock", 2, 25, 5, 29);
      p.street("dirt", 2, [[19, 1], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[27, 12], [27, 16]]);
      decal(p, (c) => { for (const [x, w] of [[5, 2], [9, 1]]) { c.rect(x * T, 2 * T, w * T, 3 * T + 4, [150, 200, 236]); for (let k = x * T + 1; k < (x + w) * T; k += 4) c.rect(k, 2 * T + (k % 5), 2, 3 * T, [226, 240, 250]); c.rect(x * T - 2, 5 * T, w * T + 4, 5, WHITE); } }, 5.5);
      station(p, 23, 8, false);
      prop(p, 33, 9, 1, 1, (c, px, py, top) => { c.box(px + 4, py + 8, 8, 8, [120, 126, 140], EDGE); for (const t of [c, top]) { t.rect(px + 7, py - 34, 2, 44, [150, 156, 170]); t.line(px + 2, py + 6, px + 8, py - 20, [150, 156, 170]); t.line(px + 14, py + 6, px + 8, py - 20, [150, 156, 170]); t.ellipse(px + 8, py - 35, 3, 3, [240, 80, 80]); } });
      for (const [x, y] of [[22, 13], [23, 13], [32, 13]]) crate(p, x, y, [150, 160, 176]);
      [[15, 8], [16, 21], [11, 19], [30, 19], [22, 26], [14, 27]].forEach(([x, y], n) => crystal(p, x, y, [[120, 220, 240], [240, 150, 220], [250, 230, 120]][n % 3]));
      for (const [x, y] of [[14, 11], [10, 26], [24, 3], [31, 3], [3, 18], [34, 13]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Research Station Two: deeper down, bare rock and shadow, the same station among stands of Tera crystal.
  PaldeaResearchTwo: {
    theme: { town: true, ground: "gravel", road: "dirt", border: "rock", water: "water", density: 0.05, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("shade", 2, 2, 16, 12); p.fill("shade", 22, 19, 35, 29); p.disc("shade", 9, 24, 6, 4);
      p.fill("rock", 22, 2, 35, 5); p.fill("rock", 30, 6, 35, 10); p.fill("rock", 2, 26, 6, 29); p.fill("rock", 12, 27, 16, 29);
      p.disc("water", 29, 24.5, 3.5, 2.5);
      p.street("dirt", 2, [[19, 1], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[11, 11], [11, 16]]);
      station(p, 7, 7, true);
      const cols = [[120, 220, 240], [240, 150, 220], [250, 230, 120], [170, 140, 250], [140, 240, 180]];
      [[23, 7], [24, 8], [26, 7], [28, 9], [27, 12], [33, 12], [32, 13], [23, 20], [25, 21], [33, 20], [34, 22], [24, 27], [33, 27], [5, 21], [6, 22], [9, 20], [13, 23], [14, 24], [4, 4], [5, 5], [15, 3], [16, 5], [3, 12], [22, 12], [16, 20], [22, 22]].forEach(([x, y], n) => crystal(p, x, y, cols[n % 5]));
      for (const [x, y] of [[6, 12], [7, 12], [17, 9]]) crate(p, x, y, [130, 140, 160]);
      for (const [x, y] of [[17, 13], [21, 13], [21, 19], [17, 19]]) lamp(p, x, y, [190, 150, 240]);
    },
  },
  // Mossui Town: the Kitakami village under the mountain. Grey asphalt lanes, the white community
  // centre, teal-tiled houses, the waterfall off the brown cliff behind, the river down the east side,
  // rice paddies to the south, the apple orchard and the peddler's stall.
  PaldeaMossuiTown: {
    theme: { town: true, ground: "grass", road: "asphalt", border: "tree", water: "water", density: 0.03, groves: 0.1, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 2, 13, 5); p.fill("water", 5, 6, 9, 7);                                          // the cliff and the fall's pool
      p.fill("water", 34, 2, 35, 29);                                                                   // the river
      p.disc("water", 14, 20.5, 2.2, 1.8); p.fill("water", 13, 21, 14, 29);
      p.street("asphalt", 3, [[19, 1], [19, 30]]); p.street("asphalt", 3, [[1, 16], [36, 16]]);
      p.street("asphalt", 1, [[27, 11], [27, 15]]); p.street("asphalt", 1, [[10, 27], [10, 28], [18, 28]]); p.street("dirt", 1, [[28, 18], [28, 29]]); p.street("dirt", 1, [[22, 23], [33, 23]]); p.street("asphalt", 1, [[7, 9], [7, 12]]); p.street("asphalt", 1, [[7, 9], [17, 9]]);
      decal(p, (c) => { const px = 6 * T, W = 2 * T; c.rect(px, 2 * T, W, 4 * T + 4, [150, 200, 236]); for (let k = px + 1; k < px + W; k += 4) c.rect(k, 2 * T + (k % 5), 2, 4 * T, [226, 240, 250]); c.rect(px - 2, 6 * T, W + 4, 5, WHITE); }, 6.5);
      paddy(p, 22, 19, 27, 22); paddy(p, 29, 19, 33, 22); paddy(p, 22, 24, 27, 28); paddy(p, 29, 24, 33, 28); paddy(p, 3, 27, 8, 29);
      build(p, 1, { l: 2, r: 6, h: 5, flat: true, wall: [244, 246, 250], roof: [70, 116, 190], glass: [150, 200, 232], door: [96, 66, 46], awning: [150, 80, 70], wide: true, sign: [70, 170, 120] });   // the community centre
      const torii = (c, px, py, W, H) => { const r = [206, 60, 50]; c.rect(px + 6, py - 6, 5, H + 6, r); c.rect(px + W - 11, py - 6, 5, H + 6, r); c.box(px - 4, py - 12, W + 8, 7, r, EDGE); c.rect(px - 6, py - 14, W + 12, 3, [50, 44, 48]); c.rect(px + 2, py + 2, W - 4, 4, r); c.rect(px + 6, py + H - 3, 5, 3, [50, 44, 48]); c.rect(px + W - 11, py + H - 3, 5, 3, [50, 44, 48]); };
      build(p, 2, { l: 1, r: 1, h: 2, draw: torii }); build(p, 3, { l: 1, r: 1, h: 2, draw: torii });
      // The orchard.
      for (const y of [3, 5, 7]) for (const x of [28, 30, 32]) olive(p, x, y, [226, 50, 50], [90, 160, 80]);
      for (const x of [23, 25]) olive(p, x, 13, [226, 50, 50], [90, 160, 80]);
      const TEAL = [64, 132, 140], house = (x, y, w, roof) => shop(p, x, y, w, 3, { roof: roof || TEAL, wall: [226, 222, 208], dc: 1, door: [96, 66, 46], glass: [240, 232, 200] });
      house(22, 3, 4); house(12, 11, 4); house(3, 20, 4); house(29, 10, 4, [214, 130, 70]); house(8, 21, 4, [214, 130, 70]); house(14, 4, 4);
      stall(p, 21, 12, [70, 110, 170]);                                                                                      // the peddler
      prop(p, 15, 2, 2, 1, (c, px, py, top) => { c.box(px + 2, py + 8, 28, 6, [150, 116, 80], EDGE); c.rect(px + 2, py - 6, 2, 16, [110, 100, 100]); c.rect(px + 28, py - 6, 2, 16, [110, 100, 100]); top.box(px, py - 10, 32, 6, [70, 110, 170], EDGE); });
      prop(p, 17, 2, 1, 1, (c, px, py, top) => { c.rect(px + 7, py - 4, 2, 18, [110, 100, 100]); top.ellipse(px + 8, py - 9, 6, 6, EDGE); top.ellipse(px + 8, py - 9, 5, 5, [240, 200, 80]); });
      for (const [x, y] of [[9, 19], [16, 13], [22, 8]]) p.decor("barrels", x, y);
    },
  },
  // The Dreaded Den: the ogre's cave high on Oni Mountain. Bare grey stone under a dark cliff, a small
  // mouth in the rock, boulders and dark shrubs.
  PaldeaDreadedDen: {
    theme: { town: true, ground: "gravel", road: "gravel", border: "rock", water: "water", density: 0.04, groves: 0.15, flowers: 0, treeTint: "dark", autoHouses: false, turn: 3, wander: 0.2 },
    plan(p) {
      p.fill("rock", 22, 2, 35, 12); p.fill("rock", 2, 2, 15, 5); p.fill("rock", 2, 6, 6, 9); p.fill("rock", 24, 22, 35, 29); p.fill("rock", 30, 19, 35, 21);
      p.fill("shade", 7, 6, 17, 13); p.fill("shade", 22, 18, 29, 21); p.fill("shade", 21, 13, 34, 15);
      p.disc("water", 8.5, 24.5, 4, 3); p.fill("water", 2, 24, 5, 25);
      p.street("gravel", 2, [[19, 1], [19, 30]]); p.street("gravel", 2, [[1, 16], [36, 16]]);
      // The den's mouth in the cliff.
      decal(p, (c) => { const cx = 28 * T, by = 13 * T; c.rect(22 * T, 2 * T, 14 * T, 11 * T, [70, 72, 86, 120]); arch(c, cx, by, 30, 40, [60, 58, 66]); arch(c, cx, by, 25, 35, [26, 22, 30]); arch(c, cx, by, 17, 25, [12, 10, 16]); for (let k = 0; k < 6; k++) { const x = cx - 27 + k * 10; c.rect(x, by - 38 + Math.abs(k - 2.5) * 9, 6, 4, [70, 120, 100]); } }, 13);
      for (const [x, y] of [[9, 10], [14, 8], [12, 18], [27, 19], [23, 14], [33, 14]]) p.decor("boulder", x, y);
      for (const [x, y] of [[16, 20], [21, 21], [15, 12], [31, 16], [12, 28], [16, 27], [4, 12]]) p.decor("bush", x, y);
      p.decor("board", 21, 6);
    },
  },
  // Loyalty Plaza: the fenced clearing on the mountain road where the stone Loyal Three stand under
  // their little red-roofed shelter, old trees round it.
  PaldeaLoyaltyPlaza: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.04, groves: 0.2, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("rock", 2, 22, 14, 24); p.fill("rock", 20, 22, 31, 24); p.fill("rock", 2, 2, 12, 4); p.fill("rock", 22, 2, 31, 5);
      p.disc("dirt", 17.5, 12.5, 7, 5.5);
      p.street("dirt", 3, [[17, 1], [17, 30]]); p.street("dirt", 3, [[1, 16], [32, 16]]);
      steps(p, 15, 22, 5, 3, [206, 200, 186]); p.street("dirt", 5, [[17, 22], [17, 24]]); steps(p, 15, 22, 5, 3, [206, 200, 186]);
      // The Loyal Three on their plinth, under the shelter's roof.
      prop(p, 15, 9, 5, 2, (c, px, py, top) => { c.box(px + 2, py + 14, 76, 18, [176, 172, 164], EDGE); c.rect(px + 3, py + 26, 74, 5, [140, 136, 130]); c.box(px + 28, py + 19, 24, 8, [120, 100, 70], EDGE); for (const t of [c, top]) { const st = [168, 164, 158], sd = [128, 124, 120];
        t.ellipse(px + 18, py + 2, 11, 13, EDGE); t.ellipse(px + 18, py + 2, 10, 12, st); t.ellipse(px + 18, py - 13, 7, 6, EDGE); t.ellipse(px + 18, py - 13, 6, 5, st); t.rect(px + 12, py - 19, 3, 4, sd); t.rect(px + 21, py - 19, 3, 4, sd); t.rect(px + 9, py + 1, 18, 3, [150, 110, 150]);            // Okidogi
        t.ellipse(px + 40, py + 4, 7, 10, EDGE); t.ellipse(px + 40, py + 4, 6, 9, st); t.ellipse(px + 40, py - 9, 6, 6, EDGE); t.ellipse(px + 40, py - 9, 5, 5, st); t.line(px + 46, py + 8, px + 52, py - 4, sd, 2); t.rect(px + 36, py - 14, 8, 2, [140, 110, 170]);                              // Munkidori
        t.ellipse(px + 62, py + 4, 8, 10, EDGE); t.ellipse(px + 62, py + 4, 7, 9, st); t.ellipse(px + 62, py - 10, 5, 5, EDGE); t.ellipse(px + 62, py - 10, 4, 4, st); t.poly([[px + 66, py - 10], [px + 72, py - 8], [px + 66, py - 6]], sd); t.line(px + 64, py - 14, px + 70, py - 22, [200, 130, 170], 2); t.poly([[px + 68, py + 2], [px + 78, py - 6], [px + 76, py + 10]], sd); }   // Fezandipiti
        top.rect(px, py - 26, 3, 40, [110, 80, 60]); top.rect(px + 77, py - 26, 3, 40, [110, 80, 60]); top.poly([[px - 8, py - 22], [px + 40, py - 48], [px + 88, py - 22]], EDGE); top.poly([[px - 4, py - 23], [px + 40, py - 45], [px + 84, py - 23]], [176, 56, 56]); top.poly([[px + 6, py - 23], [px + 40, py - 40], [px + 74, py - 23]], [70, 96, 130]); });
      p.decor("board", 20, 12);
      for (const [x, y] of [[13, 10], [21, 10]]) stoneLantern(p, x, y);
      for (const y of [26, 28]) for (const x of [21, 23, 25, 27, 29]) olive(p, x, y, [226, 50, 50], [90, 160, 80]);
      fence(p, 9, 7, 15, 7); fence(p, 19, 7, 25, 7); fence(p, 9, 8, 9, 13); fence(p, 25, 8, 25, 13); fence(p, 4, 21, 14, 21); fence(p, 20, 21, 30, 21);
      for (const [x, y] of [[6, 8], [27, 9], [8, 27]]) p.decor("boulder", x, y);
      for (const [x, y] of [[11, 4], [26, 6], [5, 12], [28, 13]]) p.decor("tree1", x, y, { canopy: true });
      for (const [x, y] of [[11, 18], [23, 18]]) p.decor("bench", x, y);
    },
  },
  // The Terarium: the Central Plaza under the dome, a white deck striped in pastel colour round the
  // core, with a slice of each biome round it. (In the game the Polar Biome is the north-west quarter and
  // the Savanna the south-east; here each biome lies beside its own fixed gate.)
  PaldeaTerariumHub: {
    theme: { town: true, ground: "grass", road: "paving", border: "rock", water: "sea", density: 0.02, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("autumn", 2, 2, 16, 20); p.fill("beach", 22, 2, 35, 13); p.fill("water", 29, 2, 35, 7); p.fill("clay", 2, 21, 16, 29); p.fill("snow", 22, 19, 35, 29);
      p.fill("palms", 22, 2, 24, 4); p.fill("palms", 34, 9, 35, 12); p.fill("pine", 31, 24, 35, 29); p.fill("pine", 23, 26, 26, 29);
      p.fill("rock", 2, 22, 5, 24); p.fill("rock", 13, 23, 15, 25); p.fill("rock", 4, 28, 7, 29);
      p.disc("paving", 19.5, 16.5, 7.5, 7);
      p.street("paving", 3, [[19, 1], [19, 30]]); p.street("paving", 3, [[1, 16], [36, 16]]);
      p.street("paving", 1, [[27, 11], [27, 13], [25, 13]]); p.street("paving", 1, [[10, 27], [10, 28], [13, 28], [13, 22]]);
      decal(p, (c) => { const cx = 19.5 * T, cy = 16.5 * T, pastel = [[244, 170, 200], [190, 170, 236], [250, 232, 150], [170, 226, 210], [244, 190, 150], [170, 210, 244]], hex = (r, col, w) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, b = (k + 1) * Math.PI / 3; c.line(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92, cx + Math.cos(b) * r, cy + Math.sin(b) * r * 0.92, Array.isArray(col[0]) ? col[k] : col, w); } }; c.ellipse(cx, cy, 112, 104, [240, 246, 252]); hex(104, pastel, 5); hex(70, [200, 226, 244], 2); hex(36, pastel.slice().reverse(), 4); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.line(cx + Math.cos(a) * 36, cy + Math.sin(a) * 33, cx + Math.cos(a) * 104, cy + Math.sin(a) * 96, [214, 226, 240]); } });
      // The Terarium Core.
      prop(p, 18, 10, 3, 2, (c, px, py, top) => { c.poly([[px + 2, py + 20], [px + 12, py + 8], [px + 36, py + 8], [px + 46, py + 20], [px + 36, py + 31], [px + 12, py + 31]], EDGE); c.poly([[px + 5, py + 20], [px + 13, py + 10], [px + 35, py + 10], [px + 43, py + 20], [px + 35, py + 29], [px + 13, py + 29]], [120, 130, 156]); for (const t of [c, top]) { t.rect(px + 22, py - 40, 4, 52, [200, 240, 250, 150]); t.ellipse(px + 24, py + 2, 17, 17, [120, 220, 250, 90]); t.ellipse(px + 24, py + 2, 12, 12, [90, 200, 240]); t.ellipse(px + 21, py - 2, 5, 5, [220, 250, 255]); } });
      const steelWall = [176, 186, 204];
      gate(p, 2, steelWall, [70, 150, 220]); gate(p, 3, steelWall, [214, 120, 60]);
      for (const [x, y] of [[4, 5], [9, 3], [13, 8], [6, 11], [10, 13], [14, 3]]) p.decor("honeyTree", x, y, { canopy: true });
      for (const [x, y] of [[8, 23], [15, 27]]) p.decor("boulder", x, y);
      table(p, 25, 6, [226, 80, 70]); table(p, 27, 4, [240, 200, 80]); boat(p, 30, 4, [60, 110, 190]);
      for (const [x, y] of [[12, 12], [27, 21], [12, 21], [26, 12]]) lamp(p, x, y, [150, 230, 250]);
      for (const [x, y] of [[28, 22], [24, 23], [29, 26]]) crystal(p, x, y, [200, 236, 250]);
    },
  },
  // The League Club: Blueberry Academy's deck on the open sea. The club room, the court where the
  // BB League battles, solar arrays, and the arena entrance on the west side.
  PaldeaLeagueClub: {
    theme: { town: true, ground: "steel", road: "paving", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 1, 36, 30);
      p.fill("steel", 6, 4, 32, 27); p.fill("steel", 2, 11, 35, 20);
      p.street("paving", 3, [[19, 4], [19, 27]]); p.street("paving", 3, [[2, 16], [35, 16]]);
      p.street("deck", 3, [[19, 1], [19, 3]]); p.street("deck", 3, [[19, 28], [19, 30]]);
      build(p, 1, { l: 2, r: 6, h: 5, flat: true, wall: [44, 64, 120], roof: [250, 204, 60], glass: [130, 220, 250], wide: true, sign: [90, 170, 250] });
      p.decor("academy", 22, 5);
      court(p, 8, 20, 9, 6, [50, 90, 170], WHITE); court(p, 22, 20, 9, 6, [50, 90, 170], WHITE);
      decal(p, (c) => { for (const cx of [12.5 * T, 26.5 * T]) { c.ellipse(cx, 23 * T, 8, 8, [250, 204, 60]); c.ellipse(cx, 23 * T, 4, 4, [50, 90, 170]); } }, 0.2);
      // Solar arrays.
      for (const y of [5, 7, 9]) for (const x of [7, 10, 13]) prop(p, x, y, 2, 1, (c, px, py) => { c.rect(px + 14, py + 8, 4, 8, [110, 116, 130]); c.poly([[px + 1, py + 10], [px + 5, py - 2], [px + 31, py - 2], [px + 27, py + 10]], EDGE); c.poly([[px + 3, py + 9], [px + 6, py - 1], [px + 29, py - 1], [px + 26, py + 9]], [40, 70, 150]); for (let k = 1; k < 4; k++) c.line(px + 3 + k * 6, py + 9, px + 6 + k * 6, py - 1, [120, 170, 230]); c.rect(px + 4, py + 4, 23, 1, [120, 170, 230]); });
      flag(p, 16, 5, [50, 90, 170], [250, 204, 60]); flag(p, 16, 9, [50, 90, 170], [250, 204, 60]); flag(p, 17, 27, [50, 90, 170], [250, 204, 60]); flag(p, 21, 27, [50, 90, 170], [250, 204, 60]);
      for (const [x, y] of [[17, 13], [21, 13], [17, 19], [21, 19], [6, 19], [32, 19], [32, 13]]) lamp(p, x, y, [150, 230, 250]);
      for (const [x, y] of [[22, 13], [23, 13], [30, 13]]) crate(p, x, y, [226, 190, 80]);
      boat(p, 23, 29, [240, 240, 244]); boat(p, 2, 23, [60, 110, 190]);
    },
  },
};
