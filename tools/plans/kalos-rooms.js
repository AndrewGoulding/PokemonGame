// Kalos interiors, drawn by hand: the eight Gyms, the League, and the story rooms. See README.md, "Rooms".
// These rooms keep the game's own walkable shape: every plan here only re-tiles the floor, stands props on free
// floor, and paints the set-piece over the solid parts and around the paths.
"use strict";
const T = 16;
const WHITE = [244, 244, 250], INK = [40, 38, 52], GOLD = [236, 196, 90], SKIN = [240, 208, 176];
const A = (col, a) => [col[0], col[1], col[2], a];
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));
const dk = (col, t = 0.3) => mix(col, [0, 0, 0], t), lt = (col, t = 0.4) => mix(col, [255, 255, 255], t);

// ---------------------------------------------------------------- shared pieces
function each(p, f) { for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) f(x, y, p.isFloor(x, y)); }
// Every solid tile (the backdrop behind the paths) / every walkable tile.
function solids(p, f) { each(p, (x, y, fl) => { if (!fl) f(x, y, x * T, y * T); }); }
function floors(p, f) { each(p, (x, y, fl) => { if (fl) f(x, y, x * T, y * T); }); }
// Run `f` with the canvas masked to the solid tiles (behind the paths) or to the walkable ones.
function masked(p, c, want, f) { const orig = c.p; c.p = (x, y, col) => { if (p.isFloor(x >> 4, y >> 4) === want) orig(x, y, col); }; try { f(); } finally { c.p = orig; } }
const behind = (p, c, f) => masked(p, c, false, f), onFloor = (p, c, f) => masked(p, c, true, f);
// A flat colour over every solid tile.
function voidFill(p, c, col) { c.rect(0, 0, p.W * T, p.H * T, col); }
// Platforms: a lit rim round the walkable area and a drop face under it.
function ledge(p, c, face, rim, h = 10) {
  each(p, (x, y, fl) => {
    const X = x * T, Y = y * T;
    if (fl) { if (!p.isFloor(x, y - 1)) c.rect(X, Y, T, 2, rim); if (!p.isFloor(x - 1, y)) c.rect(X, Y, 2, T, rim); if (!p.isFloor(x + 1, y)) c.rect(X + 14, Y, 2, T, rim); if (!p.isFloor(x, y + 1)) c.rect(X, Y + 14, T, 2, rim); }
    else if (p.isFloor(x, y - 1)) { c.rect(X, Y, T, h, face); c.rect(X, Y + h, T, 2, dk(face, 0.4)); c.rect(X, Y, T, 1, dk(face, 0.2)); }
  });
}
// A colour wash over the walkable tiles inside x0..x1, y0..y1 (all of them by default).
function wash(p, c, col, x0 = 0, y0 = 0, x1 = 99, y1 = 99) { floors(p, (x, y, X, Y) => { if (x >= x0 && x <= x1 && y >= y0 && y <= y1) c.rect(X, Y, T, T, col); }); }
// The way out's doormat again (after a wash has dulled it).
function exitMat(p, c) { const w = p.warps.find((q) => q.exit); if (!w) return; c.box(w.x * T - 8, w.y * T + 2, 32, 13, [200, 60, 56], [110, 30, 34]); c.rect(w.x * T - 5, w.y * T + 5, 26, 7, [232, 96, 84]); }
function frame(c, x, y, w, h, col, t = 1) { c.rect(x, y, w, t, col); c.rect(x, y + h - t, w, t, col); c.rect(x, y + t, t, h - 2 * t, col); c.rect(x + w - t, y + t, t, h - 2 * t, col); }
function glow(c, cx, cy, r, col, a = 34) { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); }
// A back wall over tiles x0..x1, rows y0..y1. opts: stripe (colour), gap, panel (colour of wainscot), brick.
function wall(c, x0, y0, x1, y1, col, o = {}) {
  const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T;
  c.rect(X, Y, W, H, col);
  if (o.stripe) for (let x = X + 3; x < X + W; x += o.gap || 8) c.rect(x, Y, o.sw || 2, H, o.stripe);
  if (o.brick) for (let y = Y; y < Y + H; y += 6) { c.rect(X, y + 5, W, 1, o.brick); for (let x = X + ((y / 6) & 1 ? 6 : 0); x < X + W; x += 12) c.rect(x, y, 1, 5, o.brick); }
  if (o.panel) { c.rect(X, Y + H - 14, W, 14, o.panel); c.rect(X, Y + H - 15, W, 1, lt(o.panel, 0.4)); for (let x = X + 2; x + 10 <= X + W; x += 16) frame(c, x, Y + H - 12, 12, 9, dk(o.panel, 0.25)); }
  c.rect(X, Y, W, 3, o.top || lt(col, 0.35)); c.rect(X, Y + H - 3, W, 3, o.skirt || dk(col, 0.4));
}
// A doorway in a back wall, standing on tile (x, y) and rising above it.
function door(c, x, y, col = [60, 44, 40], lit = null) {
  const X = x * T, Y = y * T; c.box(X - 3, Y - 12, 22, 28, lt(col, 0.3), dk(col, 0.5)); c.rect(X, Y - 9, 16, 25, lit || dk(col, 0.6)); if (lit) c.rect(X + 2, Y - 7, 12, 23, lt(lit, 0.4));
}
// A flight of steps on tile (x, y) (up: lighter at the top).
function steps(c, x, y, col = [190, 186, 200]) { const X = x * T, Y = y * T; c.box(X - 1, Y - 2, 18, 19, dk(col, 0.3), dk(col, 0.6)); for (let k = 0; k < 4; k++) { c.rect(X, Y - 1 + k * 4, 16, 3, mix(col, WHITE, 0.4 - k * 0.12)); c.rect(X, Y + 2 + k * 4, 16, 1, dk(col, 0.45)); } }
// A glowing warp / lift panel on tile (x, y).
function pad(c, x, y, col) { const X = x * T, Y = y * T; glow(c, X + 8, Y + 8, 16, col, 30); c.box(X + 1, Y + 2, 14, 12, dk(col, 0.45), dk(col, 0.7)); c.ellipse(X + 8, Y + 8, 6, 5, col); c.ellipse(X + 8, Y + 8, 4, 3, lt(col, 0.6)); c.ellipse(X + 8, Y + 8, 2, 1, WHITE); }
function rug(c, x0, y0, x1, y1, col, trim = GOLD) { c.box(x0 * T + 2, y0 * T + 2, (x1 - x0 + 1) * T - 4, (y1 - y0 + 1) * T - 4, col, trim); frame(c, x0 * T + 5, y0 * T + 5, (x1 - x0 + 1) * T - 10, (y1 - y0 + 1) * T - 10, lt(col, 0.3)); }
// A lined battle court over tiles x0..x1, y0..y1 with a Poké Ball at its centre.
function court(c, x0, y0, x1, y1, hue, line = WHITE) {
  const X = x0 * T + 3, Y = y0 * T + 3, W = (x1 - x0 + 1) * T - 6, H = (y1 - y0 + 1) * T - 6, cx = X + W / 2, cy = Y + H / 2, L = A(line, 215);
  c.rect(X, Y, W, 2, L); c.rect(X, Y + H - 2, W, 2, L); c.rect(X, Y, 2, H, L); c.rect(X + W - 2, Y, 2, H, L); c.rect(X, cy - 1, W, 2, L);
  c.ellipse(cx, cy, 22, 22, L, 3); c.ellipse(cx, cy, 8, 8, L); c.ellipse(cx, cy, 4, 4, hue);
}
function banner(c, x, y, w, h, col, mark = WHITE) {
  c.rect(x - 1, y - 2, w + 2, 3, [70, 60, 50]); c.rect(x, y, w, h - 5, col); c.poly([[x, y + h - 5], [x + w, y + h - 5], [x + w / 2, y + h]], col);
  c.rect(x, y, 2, h - 5, dk(col, 0.25)); c.ellipse(x + w / 2, y + (h - 5) / 2, w / 4, w / 4, mark);
}
function flame(c, x, y, s = 1, hot = [236, 96, 40], core = [250, 200, 70]) { c.poly([[x - 5 * s, y], [x + 5 * s, y], [x + 3 * s, y - 7 * s], [x, y - 14 * s], [x - 3 * s, y - 7 * s]], hot); c.poly([[x - 3 * s, y], [x + 3 * s, y], [x, y - 9 * s]], core); c.rect(x - 1, y - 3 * s, 2, 3 * s, [255, 244, 190]); }
function crystal(c, x, y, col, s = 1) { c.poly([[x - 5 * s, y], [x - 3 * s, y - 9 * s], [x, y - 14 * s], [x + 3 * s, y - 8 * s], [x + 5 * s, y]], dk(col, 0.25)); c.poly([[x - 3 * s, y], [x - 1 * s, y - 9 * s], [x, y - 13 * s], [x + 1 * s, y - 4 * s]], col); c.line(x - 1, y - 10 * s, x - 2 * s, y - 2, lt(col, 0.6)); }
// A framed picture at pixel (x, y); `art` picks what it shows.
function picture(c, x, y, w, h, art, edge = [150, 110, 60]) {
  c.box(x, y, w, h, lt(edge, 0.25), dk(edge, 0.45)); c.rect(x + 2, y + 2, w - 4, h - 4, art.sky || [200, 226, 240]);
  if (art.ground) c.rect(x + 2, y + h - 2 - Math.floor((h - 4) * 0.4), w - 4, Math.floor((h - 4) * 0.4), art.ground);
  if (art.blob) { c.ellipse(x + w / 2, y + h / 2, (w - 8) / 3, (h - 8) / 3, art.blob); c.ellipse(x + w / 2 - 1, y + h / 2 - 1, (w - 8) / 6, (h - 8) / 6, lt(art.blob, 0.4)); }
  if (art.wings) { c.ellipse(x + w / 2 - w / 5, y + h / 2 - 1, w / 5, h / 3.2, art.wings); c.ellipse(x + w / 2 + w / 5, y + h / 2 - 1, w / 5, h / 3.2, art.wings); c.rect(x + w / 2 - 1, y + h / 2 - h / 4, 2, h / 2, INK); }
}
// Something standing on free floor: blocks its tiles and draws at pixel (X, Y) of its top-left tile.
function prop(p, x, y, w, h, draw) { p.block(x, y, w, h); p.paint(y + h + 0.5, (c, top) => draw(c, top, x * T, y * T)); }
function shadow(c, X, Y, w = T) { c.ellipse(X + w / 2, Y + 14, w / 2, 3, [0, 0, 0, 60]); }
function pillar(c, top, X, Y, col = [200, 198, 206]) { shadow(c, X, Y); c.box(X + 2, Y - 12, 12, 26, dk(col, 0.12), dk(col, 0.6)); c.rect(X + 4, Y - 10, 3, 22, lt(col, 0.4)); c.box(X, Y + 10, 16, 5, dk(col, 0.25), dk(col, 0.6)); top.box(X, Y - 16, 16, 6, col, dk(col, 0.6)); }
function plant(c, top, X, Y, leaf = [70, 150, 80]) { shadow(c, X, Y); c.box(X + 4, Y + 7, 8, 8, [170, 110, 70], [90, 56, 40]); top.ellipse(X + 8, Y - 2, 7, 9, dk(leaf, 0.25)); top.ellipse(X + 7, Y - 3, 5, 7, leaf); top.ellipse(X + 5, Y - 5, 2, 3, lt(leaf, 0.35)); c.rect(X + 7, Y + 3, 2, 5, [90, 70, 50]); }
function torch(c, top, X, Y, hot, core) { glow(c, X + 8, Y, 22, hot || [250, 150, 50], 26); c.box(X + 5, Y + 2, 6, 13, [96, 98, 112], INK); c.box(X + 2, Y - 2, 12, 5, [130, 132, 150], INK); flame(top, X + 8, Y - 1, 1, hot, core); }
function statue(c, top, X, Y, col = [176, 176, 190]) { shadow(c, X, Y); c.box(X + 1, Y + 6, 14, 9, dk(col, 0.25), dk(col, 0.6)); c.rect(X + 2, Y + 7, 12, 2, lt(col, 0.3)); top.ellipse(X + 8, Y - 2, 5, 7, dk(col, 0.1)); top.ellipse(X + 8, Y - 9, 4, 4, col); top.rect(X + 4, Y + 2, 8, 5, dk(col, 0.1)); top.ellipse(X + 6, Y - 10, 1, 1, WHITE); }
function table(c, X, Y, w, h, col = [176, 128, 80]) { c.ellipse(X + w / 2, Y + h, w / 2, 3, [0, 0, 0, 50]); c.box(X + 1, Y + 2, w - 2, h - 5, col, dk(col, 0.55)); c.rect(X + 2, Y + 3, w - 4, 2, lt(col, 0.3)); c.rect(X + 1, Y + h - 4, w - 2, 3, dk(col, 0.35)); }
// Shelves of books / goods, `w` pixels wide, standing on the tile row at Y (rises 12px above it).
function shelf(c, X, Y, w, col = [150, 108, 70], seed = 1) {
  c.box(X, Y - 12, w, 27, col, dk(col, 0.6)); const cols = [[196, 70, 60], [70, 120, 200], [90, 170, 100], [230, 190, 80], [150, 100, 190], [230, 230, 236]];
  for (let r = 0; r < 3; r++) { const y = Y - 10 + r * 8; c.rect(X + 2, y, w - 4, 6, dk(col, 0.5)); for (let x = X + 2; x < X + w - 3; x += 2) c.rect(x, y + 1 + ((x * 7 + r * 3 + seed) % 3 === 0 ? 1 : 0), 2, 5, cols[(x * 5 + r * 7 + seed * 3) % cols.length]); }
}
// A machine cabinet with lights and a screen.
function machine(c, X, Y, w, h, col = [150, 156, 176], lamp = [110, 230, 200]) {
  c.box(X, Y - 10, w, h + 9, col, dk(col, 0.6)); c.rect(X + 1, Y - 9, w - 2, 2, lt(col, 0.4)); c.box(X + 3, Y - 5, w - 6, 9, [30, 40, 56], dk(col, 0.6)); c.rect(X + 4, Y - 4, w - 8, 3, A(lamp, 200)); c.rect(X + 4, Y + 1, Math.max(2, (w - 8) / 2), 1, lamp);
  for (let x = X + 3; x < X + w - 4; x += 5) c.rect(x, Y + 7, 3, 2, (x / 5 | 0) % 2 ? lamp : [236, 96, 80]); c.rect(X + 1, Y + h - 4, w - 2, 2, dk(col, 0.35));
}
// A glass tube / tank (1 tile wide) with something glowing inside.
function tube(c, top, X, Y, col = [110, 220, 230]) { glow(c, X + 8, Y, 18, col, 22); c.box(X + 1, Y + 8, 14, 7, [110, 114, 134], INK); top.box(X + 2, Y - 16, 12, 5, [130, 134, 154], INK); c.rect(X + 3, Y - 11, 10, 19, A(col, 150)); c.rect(X + 3, Y - 11, 1, 19, INK); c.rect(X + 12, Y - 11, 1, 19, INK); c.rect(X + 5, Y - 9, 2, 14, A(WHITE, 170)); c.ellipse(X + 8, Y, 3, 4, lt(col, 0.5)); }
function crate(c, X, Y, col = [190, 150, 96]) { shadow(c, X, Y); c.box(X + 1, Y, 14, 14, col, dk(col, 0.55)); c.rect(X + 2, Y + 1, 12, 2, lt(col, 0.3)); c.line(X + 2, Y + 3, X + 13, Y + 12, dk(col, 0.3)); c.rect(X + 1, Y + 7, 14, 1, dk(col, 0.4)); }
function ball(c, x, y, r = 4, topc = [226, 60, 56]) { c.ellipse(x, y, r + 1, r + 1, INK); c.ellipse(x, y, r, r, WHITE); c.poly([[x - r, y], [x + r, y], [x + r * 0.7, y - r * 0.8], [x, y - r], [x - r * 0.7, y - r * 0.8]], topc); c.rect(x - r, y - 0.5, r * 2, 1, INK); c.ellipse(x, y, 1.5, 1.5, WHITE); }
function sofa(c, X, Y, w, col = [180, 60, 70]) { c.ellipse(X + w / 2, Y + 14, w / 2, 3, [0, 0, 0, 50]); c.box(X, Y - 4, w, 12, dk(col, 0.2), dk(col, 0.6)); c.box(X, Y + 5, w, 9, col, dk(col, 0.6)); c.rect(X + 2, Y + 6, w - 4, 2, lt(col, 0.3)); c.box(X - 1, Y + 1, 4, 13, dk(col, 0.1), dk(col, 0.6)); c.box(X + w - 3, Y + 1, 4, 13, dk(col, 0.1), dk(col, 0.6)); }
function bed(c, X, Y, col = [200, 90, 110]) { c.box(X + 1, Y - 6, 14, 37, [236, 236, 240], [90, 70, 60]); c.box(X + 1, Y - 8, 14, 5, [150, 108, 70], [80, 56, 40]); c.box(X + 3, Y - 2, 10, 6, WHITE, [170, 170, 190]); c.box(X + 1, Y + 8, 14, 23, col, dk(col, 0.5)); c.rect(X + 2, Y + 9, 12, 2, lt(col, 0.4)); }
// A tall arched window on a wall at pixel (x, y).
function windowAt(c, x, y, w, h, sky = [150, 200, 240], edge = [224, 214, 190]) { c.box(x, y, w, h, sky, dk(edge, 0.5)); c.ellipse(x + w / 2, y, w / 2, w / 3, dk(edge, 0.5)); c.ellipse(x + w / 2, y + 1, w / 2 - 1, w / 3 - 1, sky); c.rect(x + 1, y + 1, w - 2, h - 2, sky); c.rect(x + w / 2, y - w / 3 + 1, 1, h + w / 3 - 2, edge); c.rect(x + 1, y + h / 2, w - 2, 1, edge); c.rect(x + 2, y + 2, 2, h / 3, A(WHITE, 150)); }
// Speckle: `n` small marks scattered over tiles x0..x1, y0..y1.
function speckle(p, c, n, x0, y0, x1, y1, seed, draw) { for (let k = 0; k < n; k++) draw((x0 + p.hash(k, 1, seed) * (x1 - x0 + 1)) * T, (y0 + p.hash(k, 2, seed) * (y1 - y0 + 1)) * T, p.hash(k, 3, seed), k); }
function star(c, x, y, col, s = 2) { c.rect(x - s, y, 2 * s + 1, 1, col); c.rect(x, y - s, 1, 2 * s + 1, col); }

const PLANS = {};
module.exports = PLANS;

// ---------------------------------------------------------------- Santalune Gym (Viola, Bug)
// The photo gallery: a dark floor under pale walls hung with photographs, two Gym statues, and the pole down to the web.
PLANS.KalosGymGallery = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const bugs = [[236, 120, 150], [250, 210, 90], [120, 190, 110], [110, 160, 230], [200, 120, 220], [240, 150, 80]];
    p.bare(1); p.block(2, 2, 20, 2);
    p.paint(0, (c) => {
      wash(p, c, [20, 20, 26, 150]); exitMat(p, c);
      wall(c, 2, 0, 21, 3, [226, 228, 232], { top: [250, 250, 252], skirt: [60, 62, 70] });
      // Two big prints behind the pole, smaller frames to either side.
      c.box(9 * T, 4, 3 * T - 4, 46, [24, 30, 24], [70, 72, 80]); c.ellipse(10 * T + 6, 28, 16, 12, [70, 150, 60]); c.ellipse(10 * T + 2, 24, 8, 5, [120, 190, 90]);
      c.box(12 * T + 4, 4, 3 * T - 4, 46, [30, 28, 20], [70, 72, 80]); c.ellipse(13 * T + 10, 28, 13, 13, [240, 190, 50]); c.ellipse(13 * T + 10, 28, 5, 5, [200, 120, 40]);
      for (const k of [0, 1, 2, 3, 4, 5]) picture(c, 38 + (k % 3) * 34 + (k > 2 ? 13 * T : 0), 12, 22, 28, { sky: k % 2 ? [190, 226, 200] : [236, 236, 240], ground: [120, 180, 110], wings: bugs[k] }, [250, 250, 252]);
      for (const x of [5, 18]) { c.rect(x * T + 6, 2, 4, 3, [40, 40, 50]); c.poly([[x * T + 4, 5], [x * T + 12, 5], [x * T + 24, 44], [x * T - 8, 44]], [255, 250, 220, 30]); }
      // The light falling in at the door.
      for (let k = 3; k >= 1; k--) c.ellipse(12 * T + 8, 19 * T + 8, 20 * k, 9 * k, [255, 255, 255, 16]);
      // The way down to the web.
      const X = 12 * T + 8, Y = 5 * T + 8; c.box(X - 17, Y - 12, 34, 24, [70, 72, 82], [150, 152, 162]); c.rect(X - 14, Y - 9, 28, 18, [8, 8, 12]);
      for (let a = 0; a < 6; a++) c.line(X, Y, X + Math.cos(a * Math.PI / 3) * 12, Y + Math.sin(a * Math.PI / 3) * 8, [220, 226, 236, 90]);
    });
    p.paint(6, (c, top) => { top.rect(12 * T + 7, 2 * T, 2, 3 * T + 10, [214, 218, 226]); top.rect(12 * T + 6, 2 * T - 2, 4, 3, [120, 124, 140]); });
    // Photographs on stands down the hall.
    [[4, 8], [17, 8], [4, 14], [17, 14]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => {
      c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 90]); c.rect(X + 3, Y + 6, 3, 9, [150, 154, 170]); c.rect(X + 42, Y + 6, 3, 9, [150, 154, 170]);
      top.box(X, Y - 16, 48, 24, [240, 240, 244], [150, 154, 170]); picture(top, X + 3, Y - 13, 20, 18, { sky: [196, 226, 204], wings: bugs[k] }, [60, 60, 70]); picture(top, X + 25, Y - 13, 20, 18, { sky: [204, 220, 244], blob: bugs[k + 2] }, [60, 60, 70]);
    }));
    // The two Gym statues either side of the pole.
    for (const x of [10, 14]) prop(p, x, 6, 1, 1, (c, top, X, Y) => statue(c, top, X, Y, [200, 204, 214]));
  },
};
// The spiderweb: silk strands over the dark among great leaves, beaded with dew; wooden stands for the Trainers
// and Viola's tent on its deck at the far side.
PLANS.KalosGymWeb = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const SILK = [232, 240, 246], SH = [130, 190, 200], WOOD = [150, 100, 60];
    const deck = (c, x0, y0, x1, y1) => { c.rect(x0 * T - 3, y0 * T - 3, (x1 - x0 + 1) * T + 6, (y1 - y0 + 1) * T + 6, dk(WOOD, 0.45)); c.rect(x0 * T - 2, (y1 + 1) * T, (x1 - x0 + 1) * T + 4, 6, dk(WOOD, 0.6)); for (let y = y0 * T - 2; y < (y1 + 1) * T + 1; y += 5) { c.rect(x0 * T - 2, y, (x1 - x0 + 1) * T + 4, 4, (y / 5 | 0) % 2 ? WOOD : lt(WOOD, 0.12)); c.rect(x0 * T - 2, y + 4, (x1 - x0 + 1) * T + 4, 1, dk(WOOD, 0.4)); } for (let x = x0 * T - 2; x <= (x1 + 1) * T; x += 12) c.ellipse(x + 2, (y1 + 1) * T + 3, 3, 3, lt(WOOD, 0.2)); };
    const leaf = (c, x, y, s, t, col) => { const dx = Math.cos(t), dy = Math.sin(t); c.poly([[x, y], [x + dx * s * 0.5 - dy * s * 0.32, y + dy * s * 0.5 + dx * s * 0.32], [x + dx * s, y + dy * s], [x + dx * s * 0.5 + dy * s * 0.32, y + dy * s * 0.5 - dx * s * 0.32]], col); c.line(x, y, x + dx * s, y + dy * s, lt(col, 0.25)); };
    p.paint(0, (c) => {
      voidFill(p, c, [6, 8, 8]);
      // Great leaves in the dark below.
      speckle(p, c, 90, 0, 0, p.W - 1, p.H - 1, 3, (x, y, r, k) => leaf(c, x, y, 34 + r * 44, p.hash(k, 4, 3) * 6.28, [[14, 60, 26], [20, 84, 34], [10, 44, 22], [30, 100, 40]][k % 4]));
      // The great web behind everything.
      const cx = 18 * T + 8, cy = 17 * T, N = 16, R = (k, a) => k * (1 + 0.06 * Math.sin(a * 5));
      for (let a = 0; a < N; a++) { const t = a * 2 * Math.PI / N + 0.1; c.line(cx, cy, cx + Math.cos(t) * 330, cy + Math.sin(t) * 330, [200, 230, 236, 120]); }
      for (let r = 34; r < 330; r += 30) for (let a = 0; a < N; a++) { const t0 = a * 2 * Math.PI / N + 0.1, t1 = (a + 1) * 2 * Math.PI / N + 0.1, r0 = R(r, a), mx = cx + Math.cos((t0 + t1) / 2) * r0 * 0.9, my = cy + Math.sin((t0 + t1) / 2) * r0 * 0.9; c.line(cx + Math.cos(t0) * r0, cy + Math.sin(t0) * r0, mx, my, [200, 230, 236, 105]); c.line(mx, my, cx + Math.cos(t1) * r0, cy + Math.sin(t1) * r0, [200, 230, 236, 105]); }
      // The strands that can be walked.
      floors(p, (x, y, X, Y) => {
        c.rect(X, Y, T, T, [6, 8, 8]);
        const n = [p.isFloor(x, y - 1), p.isFloor(x + 1, y), p.isFloor(x, y + 1), p.isFloor(x - 1, y)];
        if (n[0]) { c.rect(X + 4, Y, 8, 8, SH); c.rect(X + 5, Y, 6, 8, SILK); } if (n[2]) { c.rect(X + 4, Y + 8, 8, 8, SH); c.rect(X + 5, Y + 8, 6, 8, SILK); }
        if (n[3]) { c.rect(X, Y + 4, 8, 8, SH); c.rect(X, Y + 5, 8, 6, SILK); } if (n[1]) { c.rect(X + 8, Y + 4, 8, 8, SH); c.rect(X + 8, Y + 5, 8, 6, SILK); }
        c.box(X + 3, Y + 3, 10, 10, SILK, SH); c.rect(X + 6, Y + 6, 4, 4, [250, 252, 255]);
        if (n.filter(Boolean).length <= 2 && p.hash(x, y, 7) < 0.5) { const dx = n[1] || n[3] ? 0 : (p.hash(x, y, 8) < 0.5 ? -7 : 6), dy = n[1] || n[3] ? (p.hash(x, y, 8) < 0.5 ? -6 : 13) : 0; c.ellipse(X + 8 + dx, Y + (n[1] || n[3] ? dy : 8), 2, 2, [150, 220, 250]); c.p(X + 7 + dx, Y + (n[1] || n[3] ? dy : 8) - 1, WHITE); }
      });
      // Wooden stands where the Trainers wait, and Viola's deck.
      deck(c, 27, 21, 29, 23); for (const q of p.people) if (!(q.y <= 6) && !(q.x >= 27 && q.x <= 29)) deck(c, q.x, q.y, q.x, q.y);
      deck(c, 15, 3, 21, 5);
      // Her cases and camera on the deck's edges.
      c.box(15 * T + 2, 3 * T + 2, 11, 9, [230, 120, 50], [120, 60, 30]); c.box(21 * T + 2, 4 * T + 4, 12, 9, [226, 190, 70], [120, 96, 40]);
      c.line(21 * T + 8, 3 * T + 2, 21 * T + 4, 3 * T + 14, INK); c.line(21 * T + 8, 3 * T + 2, 21 * T + 12, 3 * T + 14, INK); c.box(21 * T + 3, 3 * T - 6, 11, 8, [50, 50, 60], INK); c.ellipse(21 * T + 8, 3 * T - 2, 2, 2, [150, 190, 230]);
    });
    // The tent over the deck: an orange canopy on white poles.
    p.paint(99, (c, top) => {
      for (const x of [15 * T, 22 * T - 3]) top.rect(x, T + 6, 3, 3 * T, [226, 228, 236]);
      top.poly([[14 * T + 6, 2 * T + 8], [16 * T, 6], [21 * T, 6], [22 * T + 10, 2 * T + 8]], [236, 120, 40]); top.poly([[16 * T, 6], [21 * T, 6], [20 * T, 2 * T + 8], [17 * T, 2 * T + 8]], [250, 160, 50]);
      top.poly([[18 * T, 6], [19 * T, 6], [19 * T + 4, 2 * T + 8], [17 * T + 12, 2 * T + 8]], [250, 220, 90]); top.rect(14 * T + 6, 2 * T + 8, 8 * T + 4, 3, [190, 86, 30]);
      // Dew on the web, over everything.
      speckle(p, c, 70, 1, 1, p.W - 2, p.H - 2, 5, (x, y) => { if (!p.isFloor(x / T | 0, y / T | 0)) { c.ellipse(x, y, 2, 2, [200, 240, 250, 150], 1); c.p(x - 1, y - 1, WHITE); } });
    });
  },
};
// ---------------------------------------------------------------- Cyllage Gym (Grant, Rock)
// A climbing hall in a teal cavern: pale climbing walls studded with coloured holds join the rock ledges, and
// Grant waits on the tan crag at the top with a waterfall behind him.
PLANS.KalosCyllageGym = {
  theme: { room: "arena", floor: "gravel", wall: null },
  plan(p) {
    const routes = [[1, 2, [236, 80, 70]], [3, 4, [90, 150, 236]], [5, 6, [250, 206, 70]], [7, 8, [110, 200, 110]]];
    const HOLDS = [[80, 150, 200], [230, 140, 60], [110, 180, 110], [150, 150, 160], [90, 120, 190]], PANEL = [226, 218, 190];
    for (let k = 1; k <= 8; k++) p.bare(k);
    p.paint(0, (c) => {
      const W = p.W * T, H = p.H * T;
      behind(p, c, () => {
        // The cavern rock: dark teal, faceted.
        c.rect(0, 0, W, H, [34, 70, 72]);
        speckle(p, c, 420, 0, 0, p.W - 1, p.H - 1, 4, (x, y, r, k) => { const s = 14 + r * 26, col = [[44, 92, 90], [28, 58, 62], [56, 110, 104], [38, 80, 80]][k % 4]; c.poly([[x, y - s * 0.5], [x + s * 0.7, y - s * 0.1], [x + s * 0.4, y + s * 0.5], [x - s * 0.5, y + s * 0.4], [x - s * 0.7, y - s * 0.1]], col); c.line(x - s * 0.7, y - s * 0.1, x, y - s * 0.5, [80, 140, 130, 150]); });
        // The fall behind Grant's crag.
        for (let x = 25 * T; x < 31 * T; x += 3) { const a = p.hash(x, 2, 5); c.rect(x, 0, 3, 4 * T, a < 0.4 ? [226, 240, 252] : a < 0.75 ? [170, 210, 244] : [130, 180, 232]); } for (let k = 3; k >= 1; k--) c.ellipse(28 * T, 4 * T, 26 * k, 5 * k, [240, 248, 255, 60]);
        // The climbing walls between the ledges: pale panels dotted with holds.
        for (const [a, b] of routes) {
          const A0 = p.warps[a], B0 = p.warps[b], x0 = A0.x * T + 8, y0 = A0.y * T + 8, x1 = B0.x * T + 8, y1 = B0.y * T + 8;
          c.line(x0, y0, x1, y1, dk(PANEL, 0.35), 52); c.line(x0, y0, x1, y1, PANEL, 46);
          const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 5), nx = -(y1 - y0) / Math.hypot(x1 - x0, y1 - y0), ny = (x1 - x0) / Math.hypot(x1 - x0, y1 - y0);
          for (let k = 0; k <= n; k++) { const t = k / n, o = (p.hash(k, a, 6) - 0.5) * 40, x = x0 + (x1 - x0) * t + nx * o, y = y0 + (y1 - y0) * t + ny * o, col = HOLDS[Math.floor(p.hash(k, a, 7) * HOLDS.length)]; c.ellipse(x + 1, y + 1, 3, 2, [120, 110, 90, 170]); c.ellipse(x, y, 3, 2, col); c.p(x - 1, y - 1, lt(col, 0.6)); }
        }
      });
      // The ledges: tan rock.
      wash(p, c, [226, 200, 150, 120]); exitMat(p, c);
      ledge(p, c, [150, 106, 66], [240, 222, 180], 12);
      // Grant's crag: the Gym's mark worn into the stone.
      const gx = 28 * T, gy = 6 * T + 8; c.ellipse(gx, gy, 54, 22, [255, 244, 214, 90]); c.ellipse(gx, gy, 54, 22, [170, 130, 90, 170], 2); c.poly([[gx - 16, gy - 8], [gx + 16, gy - 8], [gx, gy + 12]], [170, 130, 90, 150]); c.poly([[gx - 9, gy - 5], [gx + 9, gy - 5], [gx, gy + 7]], [240, 222, 180, 200]);
      for (const [a, b, col] of routes) for (const k of [a, b]) { const w = p.warps[k], X = w.x * T, Y = w.y * T; c.box(X + 1, Y + 1, 14, 14, PANEL, dk(PANEL, 0.45)); c.poly([[X + 8, Y + 3], [X + 13, Y + 9], [X + 10, Y + 9], [X + 10, Y + 13], [X + 6, Y + 13], [X + 6, Y + 9], [X + 3, Y + 9]], col); }
    });
    for (const [x, y] of [[22, 4], [33, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.poly([[X + 1, Y + 14], [X + 3, Y + 2], [X + 9, Y - 4], [X + 14, Y + 4], [X + 15, Y + 14]], [130, 96, 66]); c.poly([[X + 3, Y + 13], [X + 4, Y + 3], [X + 9, Y - 3], [X + 10, Y + 8]], [200, 166, 120]); });
  },
};

// ---------------------------------------------------------------- Shalour Gym (Korrina, Fighting)
// The skate park: a grey rink inside orange banked walls edged with blue rails, the grind rails up the middle,
// and Korrina's Poké Ball platform beyond them.
PLANS.KalosShalourGym = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const OR = [240, 140, 40], YL = [250, 214, 60], BL = [40, 150, 240], RD = [226, 70, 40];
    p.paint(0, (c) => {
      // The hall: white and steel.
      voidFill(p, c, [150, 156, 170]);
      for (let x = 0; x < p.W * T; x += 32) c.rect(x, 0, 2, p.H * T, [120, 126, 142]); for (let y = 0; y < p.H * T; y += 32) c.rect(0, y, p.W * T, 2, [176, 182, 196]);
      behind(p, c, () => {
        // The banked walls round the rink and up the run, each topped by a blue rail.
        const bank = (x0, y0, x1, y1) => { c.rect(x0 * T - 22, y0 * T - 22, (x1 - x0 + 1) * T + 44, (y1 - y0 + 1) * T + 44, [60, 64, 80]); c.rect(x0 * T - 20, y0 * T - 20, (x1 - x0 + 1) * T + 40, (y1 - y0 + 1) * T + 40, BL); c.rect(x0 * T - 17, y0 * T - 17, (x1 - x0 + 1) * T + 34, (y1 - y0 + 1) * T + 34, [170, 220, 255]); c.rect(x0 * T - 15, y0 * T - 15, (x1 - x0 + 1) * T + 30, (y1 - y0 + 1) * T + 30, dk(OR, 0.25)); c.rect(x0 * T - 13, y0 * T - 13, (x1 - x0 + 1) * T + 26, (y1 - y0 + 1) * T + 26, OR); c.rect(x0 * T - 13, y0 * T - 13, (x1 - x0 + 1) * T + 26, 6, lt(OR, 0.35)); };
        bank(4, 23, 39, 34); bank(21, 8, 23, 22); bank(19, 4, 25, 7);
        c.rect(21 * T - 13, 22 * T, 3 * T + 26, T, OR);
      });
      // The rink: plain grey, a blue line round it.
      wash(p, c, [150, 154, 164, 110], 4, 23, 39, 34); exitMat(p, c);
      frame(c, 5 * T, 24 * T, 34 * T, 10 * T, A(BL, 200), 2); c.rect(22 * T + 7, 24 * T, 2, 10 * T, A(BL, 120));
      // The run-up and its rails.
      wash(p, c, [110, 114, 126, 150], 21, 8, 23, 22);
      for (let y = 8; y <= 22; y++) if (p.isFloor(21, y)) c.poly([[22 * T + 2, y * T + 11], [22 * T + 8, y * T + 4], [22 * T + 14, y * T + 11], [22 * T + 11, y * T + 11], [22 * T + 8, y * T + 8], [22 * T + 5, y * T + 11]], A(YL, 210));
      for (const y of [9, 12, 15, 18]) {
        for (const x of [21, 23]) { c.box(x * T, y * T, T, T, [60, 62, 80], INK); for (let k = 0; k < 4; k++) c.poly([[x * T + 1 + k * 4, y * T + 15], [x * T + 5 + k * 4, y * T + 1], [x * T + 7 + k * 4, y * T + 1], [x * T + 3 + k * 4, y * T + 15]], YL); frame(c, x * T, y * T, T, T, INK); }
        c.rect(22 * T, y * T, T, T, [44, 46, 64]); c.rect(22 * T + 5, y * T - 2, 6, T + 4, dk(BL, 0.3)); c.rect(22 * T + 6, y * T - 2, 2, T + 4, [170, 220, 255]); c.rect(22 * T + 2, y * T + 6, 12, 3, [90, 94, 114]);
      }
      // Korrina's platform: a great Poké Ball, red over yellow.
      const kx = 22 * T + 8, ky = 6 * T;
      onFloor(p, c, () => { c.rect(19 * T, 4 * T, 7 * T, 4 * T, [60, 62, 76]); c.ellipse(kx, ky, 58, 34, INK); c.ellipse(kx, ky, 55, 31, YL); for (let y = ky - 31; y < ky - 2; y++) { const hw = Math.sqrt(Math.max(0, 1 - ((y - ky) / 31) ** 2)) * 55; c.rect(kx - hw, y, 2 * hw, 1, mix(RD, OR, (y - ky + 31) / 30)); } c.rect(kx - 56, ky - 3, 112, 6, INK); c.ellipse(kx, ky, 17, 12, INK); c.ellipse(kx, ky, 13, 9, YL); c.ellipse(kx, ky, 7, 5, lt(YL, 0.5)); });
      ledge(p, c, [190, 100, 30], [170, 220, 255], 9);
    });
    // Cones on the rink.
    for (const [x, y] of [[6, 24], [37, 24], [6, 33], [37, 33], [14, 29], [30, 30]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.poly([[X + 3, Y + 14], [X + 13, Y + 14], [X + 9, Y + 1], [X + 7, Y + 1]], [236, 80, 50]); c.rect(X + 5, Y + 7, 6, 2, WHITE); c.rect(X + 2, Y + 13, 12, 2, [170, 50, 30]); });
  },
};
// ---------------------------------------------------------------- Coumarine Gym (Ramos, Grass)
function foliage(p, c, n, cols, seed, x0 = 0, y0 = 0, x1 = p.W - 1, y1 = p.H - 1) { speckle(p, c, n, x0, y0, x1, y1, seed, (x, y, r, k) => { const col = cols[k % cols.length], s = 7 + r * 9; c.ellipse(x, y, s, s * 0.7, dk(col, 0.25)); c.ellipse(x - 1, y - 2, s * 0.8, s * 0.5, col); c.ellipse(x - s * 0.3, y - s * 0.3, s * 0.25, s * 0.15, lt(col, 0.25)); }); }
function bark(c, X, Y, w, h, col = [124, 88, 58]) { c.rect(X, Y, w, h, col); for (let x = X + 3; x < X + w - 2; x += 7) for (let y = Y; y < Y + h; y += 4) c.rect(x + Math.round(Math.sin((y + x) * 0.11) * 2), y, 2, 4, dk(col, 0.3)); c.rect(X, Y, 3, h, dk(col, 0.4)); c.rect(X + w - 3, Y, 3, h, dk(col, 0.4)); c.rect(X + 5, Y, 3, h, lt(col, 0.15)); }
function rope(c, x0, y0, x1, y1, sag = 10, w = 3) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3); let px = x0, py = y0; for (let k = 1; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag; c.line(px, py, x, y, k % 3 ? [214, 180, 120] : [150, 116, 70], w); px = x; py = y; } }
// The pale stone tower the Gym is built round: white, weathered, streaked with moss.
const STONE = [232, 236, 226], MOSS = [120, 180, 110];
function tower(p, c, X, Y, w, h, seed = 1) {
  c.rect(X, Y, w, h, STONE); c.rect(X, Y, 5, h, dk(STONE, 0.22)); c.rect(X + 5, Y, 4, h, dk(STONE, 0.1)); c.rect(X + w - 5, Y, 5, h, dk(STONE, 0.22)); c.rect(X + w * 0.35, Y, w * 0.18, h, lt(STONE, 0.5));
  for (let y = Y + 14; y < Y + h; y += 26) c.rect(X, y, w, 1, dk(STONE, 0.14));
  for (let k = 0; k < w * h / 900; k++) { const x = X + 4 + p.hash(k, 1, seed) * (w - 8), y = Y + p.hash(k, 2, seed) * h, s = 5 + p.hash(k, 3, seed) * 9; c.ellipse(x, y, s, s * 0.6, A(MOSS, 150)); c.ellipse(x - 1, y + s * 0.5, s * 0.3, s * 0.9, A(MOSS, 120)); }
}
function mist(p, c, base, seed) { voidFill(p, c, base); speckle(p, c, 40, 0, 0, p.W - 1, p.H - 1, seed, (x, y, r) => c.ellipse(x, y, 40 + r * 50, 14 + r * 16, [240, 252, 240, 40])); }
// The foot of the tower: a grassy terrace with a white balustrade, the nets to either side and the rope up.
PLANS.KalosCoumarineGym = {
  theme: { room: "arena", floor: "lawn", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 20, 3); p.fill("flowersPink", 3, 8, 6, 9); p.fill("flowersPink", 17, 13, 20, 14); p.fill("flowersBlue", 4, 15, 6, 16); p.fill("flowersBlue", 16, 7, 19, 8);
    p.paint(0, (c) => {
      c.rect(2 * T, 0, 20 * T, 5 * T, [176, 224, 190]); for (let k = 0; k < 8; k++) c.ellipse((4.5 + k * 2.2) * T, 20 + (k % 3) * 14, 34, 10, [236, 250, 236, 110]);
      foliage(p, c, 40, [[110, 190, 110], [140, 206, 120], [90, 170, 100]], 3, 3, 0.4, 20, 1.2);
      tower(p, c, 7 * T, 0, 10 * T, 5 * T, 4);
      // The recess the rope hangs in, between two pillars.
      c.rect(10 * T, 14, 5 * T, 5 * T - 14, dk(STONE, 0.3)); c.ellipse(12 * T + 8, 16, 2.5 * T, 12, dk(STONE, 0.3)); c.rect(10 * T + 4, 22, 5 * T - 8, 5 * T - 22, [150, 176, 150]);
      for (const x of [10, 14]) { c.rect(x * T + 3, 12, 10, 5 * T - 12, STONE); c.rect(x * T + 3, 12, 3, 5 * T - 12, dk(STONE, 0.2)); c.rect(x * T + 1, 10, 14, 4, lt(STONE, 0.5)); }
      c.rect(12 * T + 7, 4, 3, 5 * T + 6, [200, 160, 100]); for (let y = 8; y < 5 * T + 6; y += 5) c.rect(12 * T + 7, y, 3, 1, [130, 96, 56]); c.box(12 * T + 3, 5 * T + 4, 10, 4, [150, 110, 66], [90, 60, 40]);
      // Rope nets slung out to the side terraces.
      for (const [x0, x1] of [[2, 7], [17, 22]]) { for (let x = x0 * T; x <= x1 * T; x += 8) c.line(x, 2 * T + 10, x + 4, 5 * T - 4, [190, 160, 110]); for (let y = 2 * T + 12; y < 5 * T - 4; y += 7) c.rect(x0 * T, y, (x1 - x0) * T, 1, [190, 160, 110]); }
      // The balustrade along the back of the terrace.
      c.rect(2 * T, 5 * T - 8, 20 * T, 8, lt(STONE, 0.4)); c.rect(2 * T, 5 * T - 2, 20 * T, 2, dk(STONE, 0.3)); for (let x = 2 * T + 4; x < 22 * T; x += 10) if (x < 11 * T + 8 || x > 13 * T + 8) c.rect(x, 5 * T - 14, 4, 7, STONE);
      frame(c, 2 * T, 5 * T, 20 * T, 15 * T, [236, 240, 230], 3);
    });
    // White blossom and clipped bushes on the lawn.
    for (const [x, y] of [[3, 6], [20, 6], [8, 12], [16, 17], [3, 18], [20, 18], [7, 6], [17, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.ellipse(X + 8, Y + 8, 7, 6, [70, 150, 80]); c.ellipse(X + 7, Y + 6, 5, 4, [110, 190, 110]); for (const [dx, dy] of [[4, 4], [11, 6], [7, 10]]) { c.ellipse(X + dx, Y + dy, 2, 2, WHITE); c.p(X + dx, Y + dy, [250, 220, 100]); } });
    for (const [x, y] of [[2, 11], [21, 10], [9, 16], [15, 9]]) p.decor("hedge", x, y, { optional: true });
  },
};
// The climb: grass-topped stone terraces round the tower in a green haze, rope swings between them.
function canopy(level) {
  return {
    theme: { room: "arena", floor: "lawn", wall: null },
    plan(p) {
      for (let k = 1; k <= 5; k++) p.bare(k);
      const greens = [[110, 190, 110], [140, 206, 120], [90, 170, 100], [170, 220, 140]];
      p.paint(0, (c) => {
        behind(p, c, () => {
          mist(p, c, level ? [196, 234, 206] : [164, 214, 178], 2 + level);
          foliage(p, c, level ? 70 : 130, greens, 5 + level);
          // The tower, and the stone arms that carry the terraces.
          for (const [x0, y0, x1, y1] of [[19, 16, 10, 13], [23, 14, 30, 12], [23, 8, 28, 5], [19, 24, 12, 27]]) { c.line(x0 * T, y0 * T, x1 * T, y1 * T, dk(STONE, 0.3), 11); c.line(x0 * T, y0 * T - 2, x1 * T, y1 * T - 2, STONE, 6); }
          tower(p, c, 18 * T, 0, 6 * T, p.H * T, 7 + level);
          foliage(p, c, 26, greens, 9 + level);
          // Rope swings between the terraces.
          for (const [a, b] of [[2, 3], [4, 5]]) { const A0 = p.warps[a], B0 = p.warps[b]; rope(c, A0.x * T + 8, A0.y * T + 8, B0.x * T + 8, B0.y * T + 8, 12); }
        });
        ledge(p, c, dk(STONE, 0.25), lt(STONE, 0.6), 12);
        // Moss hanging over the terrace fronts.
        each(p, (x, y, fl) => { if (!fl && p.isFloor(x, y - 1) && p.hash(x, y, 3) < 0.45) { c.ellipse(x * T + 8, y * T + 2, 6, 4, MOSS); c.rect(x * T + 6, y * T + 3, 2, 5 + p.hash(x, y, 4) * 5, [90, 160, 96]); } });
        exitMat(p, c);
        for (const k of [2, 3, 4, 5]) { const w = p.warps[k], X = w.x * T, Y = w.y * T; c.ellipse(X + 8, Y + 8, 7, 6, [96, 70, 46]); c.ellipse(X + 8, Y + 8, 5, 4, [226, 196, 130]); c.ellipse(X + 8, Y + 8, 2, 2, [150, 116, 70]); }
        { const w = p.warps[1], X = w.x * T, Y = w.y * T; c.box(X - 2, Y - 2, 20, 20, [150, 116, 70], [80, 56, 40]); for (let k = 1; k < 20; k += 5) { c.rect(X - 1 + k, Y - 1, 1, 18, [226, 196, 130]); c.rect(X - 1, Y - 1 + k, 18, 1, [226, 196, 130]); } }
      });
      for (const k of [2, 3, 4, 5]) { const w = p.warps[k]; p.paint(w.y + 1, (c, top) => { top.rect(w.x * T + 7, w.y * T - 18, 2, 22, [214, 180, 120]); top.rect(w.x * T + 3, w.y * T + 3, 10, 3, [150, 100, 60]); }); }
      // White posts with a tuft of green at the terrace corners.
      for (const [x, y] of [[4, 13], [17, 13], [4, 27], [17, 27], [24, 13], [37, 13], [25, 4], [36, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { c.box(X + 4, Y + 2, 8, 13, STONE, dk(STONE, 0.4)); top.ellipse(X + 8, Y - 1, 8, 7, dk(greens[1], 0.2)); top.ellipse(X + 7, Y - 2, 6, 5, greens[3]); top.ellipse(X + 5, Y - 3, 2, 2, WHITE); });
    },
  };
}
PLANS.KalosCoumarineCanopy1 = canopy(0);
PLANS.KalosCoumarineCanopy2 = canopy(1);
// Ramos's perch: his study at the top of the tower, bookshelves between green curtains, opening on to the lawn.
PLANS.KalosCoumarineSummit = {
  theme: { room: "arena", floor: "lawn", wall: null },
  plan(p) {
    p.block(2, 2, 28, 2);
    for (const [k, x0, y0, x1, y1] of [["flowersRed", 3, 6, 6, 7], ["flowersPink", 25, 6, 28, 7], ["flowersBlue", 3, 17, 6, 18], ["flowersRed", 25, 17, 28, 18], ["flowersPink", 3, 11, 4, 12], ["flowersBlue", 27, 11, 28, 12]]) p.fill(k, x0, y0, x1, y1);
    p.paint(0, (c) => {
      // The garden beyond the columns at either end, the panelled study between.
      c.rect(2 * T, 0, 28 * T, 4 * T, [176, 224, 190]); foliage(p, c, 30, [[110, 190, 110], [140, 206, 120], [90, 170, 100]], 6, 2, 0.5, 6, 3.4); foliage(p, c, 30, [[110, 190, 110], [140, 206, 120]], 7, 25, 0.5, 29, 3.4);
      wall(c, 7, 0, 24, 3, [120, 84, 56], { panel: [96, 66, 44], top: [170, 130, 90] });
      for (const x of [9, 13, 17, 21]) shelf(c, x * T - 8, 22, 46, [110, 76, 50], x);
      for (const x of [9, 13, 17, 21]) shelf(c, x * T - 8, 44, 46, [110, 76, 50], x + 3);
      for (const x of [6, 24]) { c.rect(x * T + 2, 0, 12, 4 * T, STONE); c.rect(x * T + 2, 0, 3, 4 * T, dk(STONE, 0.2)); c.rect(x * T, 4 * T - 6, 16, 6, lt(STONE, 0.4)); c.rect(x * T, 0, 16, 5, lt(STONE, 0.4)); }
      for (const [x, s] of [[7, 1], [23, -1]]) { c.poly([[x * T + (s > 0 ? 0 : T), 0], [x * T + (s > 0 ? 28 : -12), 0], [x * T + (s > 0 ? 12 : 4), 4 * T - 4], [x * T + (s > 0 ? 0 : T), 4 * T - 4]], [40, 120, 70]); c.poly([[x * T + (s > 0 ? 3 : 13), 0], [x * T + (s > 0 ? 14 : 2), 0], [x * T + (s > 0 ? 6 : 10), 4 * T - 6]], [70, 160, 96]); c.rect(x * T + (s > 0 ? 2 : 6), 34, 8, 3, GOLD); }
      c.rect(2 * T, 4 * T - 3, 28 * T, 3, [70, 110, 70]);
      // A round rug before his desk.
      const cx = 16 * T + 8, cy = 11 * T + 8; c.ellipse(cx, cy, 78, 44, [40, 110, 66, 190]); c.ellipse(cx, cy, 78, 44, [226, 214, 150], 2); c.ellipse(cx, cy, 60, 32, [226, 214, 150, 170], 1); c.ellipse(cx, cy, 18, 11, [226, 214, 150, 200], 2);
      exitMat(p, c);
    });
    // His curved desk, papers and a lamp on it.
    prop(p, 13, 4, 7, 1, (c, top, X, Y) => { c.ellipse(X + 56, Y + 15, 58, 4, [0, 0, 0, 60]); c.box(X, Y - 2, 112, 17, [110, 76, 50], [60, 40, 28]); c.rect(X + 1, Y - 1, 110, 4, [150, 110, 74]); for (let x = X + 8; x < X + 108; x += 26) frame(c, x, Y + 5, 20, 8, [80, 54, 36]); c.box(X + 20, Y - 4, 14, 6, WHITE, [170, 170, 180]); c.box(X + 84, Y - 5, 12, 7, [60, 100, 170], [30, 50, 90]); top.rect(X + 60, Y - 12, 2, 10, [90, 70, 50]); top.ellipse(X + 61, Y - 13, 6, 3, [250, 226, 130]); });
    for (let x = 2; x <= 29; x += 3) if (x !== 14 && x !== 17) p.decor("hedge", x, 21, { optional: true });
    for (const x of [2, 28]) p.decor("tree1", x, 4, { optional: true });
    // Two waste bins and his watering can.
    for (const x of [10, 11]) prop(p, x, 4, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 3, Y + 3, 10, 12, [60, 150, 80], [30, 80, 44]); c.rect(X + 2, Y + 2, 12, 3, [90, 180, 106]); });
    prop(p, 21, 5, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 3, Y + 5, 9, 9, [110, 170, 220], [50, 80, 120]); c.line(X + 12, Y + 8, X + 15, Y + 3, [50, 80, 120], 2); c.ellipse(X + 7, Y + 4, 4, 2, [50, 80, 120], 1); });
  },
};
// ---------------------------------------------------------------- Lumiose Gym (Clemont, Electric): Prism Tower
function circuit(p, c, col, seed, x0, y0, x1, y1, n = 26) {
  for (let k = 0; k < n; k++) {
    const x = x0 + Math.floor(p.hash(k, 1, seed) * (x1 - x0 + 1)), y = y0 + Math.floor(p.hash(k, 2, seed) * (y1 - y0 + 1)), len = 2 + Math.floor(p.hash(k, 3, seed) * 5), hor = p.hash(k, 4, seed) < 0.5;
    const X = x * T, Y = y * T, X2 = hor ? Math.min((x1 + 1) * T, X + len * T) : X, Y2 = hor ? Y : Math.min((y1 + 1) * T, Y + len * T);
    c.rect(X, Y, hor ? X2 - X : 1, hor ? 1 : Y2 - Y, A(col, 150)); c.rect(X - 1, Y - 1, 3, 3, col); c.rect(X2 - 1, Y2 - 1, 3, 3, col);
  }
}
function techWall(c, x0, y0, x1, y1, col, lamp) { wall(c, x0, y0, x1, y1, col, { stripe: dk(col, 0.2), gap: 16, top: lt(col, 0.3), skirt: dk(col, 0.5) }); c.rect(x0 * T, (y1 + 1) * T - 7, (x1 - x0 + 1) * T, 2, lamp); for (let x = x0 * T + 6; x < (x1 + 1) * T; x += 16) c.rect(x, y0 * T + 6, 4, 2, A(lamp, 200)); }
// The tower's light panels: tall cyan and green bars on a dark wall.
function lightWall(c, x0, x1, rows, skip0 = 99, skip1 = -1) {
  c.rect(x0 * T, 0, (x1 - x0 + 1) * T, rows * T, [14, 18, 26]);
  for (let x = x0; x <= x1; x++) if (x < skip0 || x > skip1) { const col = x % 3 === 0 ? [60, 230, 170] : [70, 226, 240]; c.rect(x * T + 2, 4, 12, rows * T - 12, dk(col, 0.25)); c.rect(x * T + 3, 4, 10, rows * T - 14, col); c.rect(x * T + 4, 5, 3, rows * T - 18, lt(col, 0.5)); }
  c.rect(x0 * T, rows * T - 5, (x1 - x0 + 1) * T, 5, [40, 46, 60]); c.rect(x0 * T, rows * T - 6, (x1 - x0 + 1) * T, 1, [150, 240, 250]);
}
// The Gym statue: yellow, on a banded drum.
function gymStatue(c, top, X, Y) { shadow(c, X, Y); c.box(X + 2, Y + 4, 12, 11, [240, 206, 70], [120, 96, 30]); for (let k = 0; k < 3; k++) c.rect(X + 3, Y + 6 + k * 3, 10, 1, [150, 120, 40]); top.poly([[X + 8, Y + 4], [X + 2, Y - 8], [X + 6, Y - 14], [X + 14, Y - 12], [X + 13, Y - 4]], [240, 206, 70]); top.poly([[X + 7, Y], [X + 5, Y - 8], [X + 8, Y - 11], [X + 11, Y - 6]], [255, 240, 150]); top.ellipse(X + 9, Y - 8, 2, 2, [120, 96, 30]); }
// A quiz floor: lit white tiles on a dark deck, the question on the big screen in the dark column, three answer
// booths with their silhouettes, and the lift up.
function quizFloor(n) {
  const accent = [[250, 220, 70], [90, 220, 240], [240, 120, 220], [130, 236, 130]][n];
  return {
    theme: { room: "arena", floor: "darkpave", wall: null },
    plan(p) {
      p.bare(1); p.block(2, 2, 26, 2);
      p.paint(0, (c) => {
        // The floor: white light tiles in a dark grid.
        floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [20, 22, 30]); c.rect(X + 1, Y + 1, 14, 14, (x + y) % 5 === 0 ? [214, 222, 232] : [240, 244, 250]); c.rect(X + 1, Y + 12, 14, 3, [200, 210, 224]); });
        exitMat(p, c);
        lightWall(c, 2, 27, 4, 9, 21);
        // The dark column and its question screen.
        c.box(9 * T, 0, 13 * T, 4 * T, [22, 26, 34], [60, 66, 80]); for (let k = 0; k < 40; k++) c.p(9 * T + 4 + (k * 37) % (13 * T - 8), 3 + (k * 11) % 58, k % 3 ? [60, 230, 170] : [70, 226, 240]);
        glow(c, 15 * T + 8, 28, 60, accent, 10); c.box(10 * T, 6, 11 * T, 40, [20, 24, 40], accent); c.rect(10 * T + 3, 9, 11 * T - 6, 34, [70, 90, 150]);
        const qx = 15 * T + 8; c.ellipse(qx, 20, 9, 9, accent, 3); c.rect(qx - 10, 20, 9, 10, [70, 90, 150]); c.rect(qx - 1, 27, 3, 6, accent); c.rect(qx - 1, 36, 3, 3, accent);
        for (let k = 0; k <= n; k++) c.rect(10 * T + 8 + k * 7, 14, 4, 4, accent); for (const x of [11 * T, 18 * T + 6]) for (let k = 0; k < 4; k++) c.rect(x, 22 + k * 5, 26 - (k * 7) % 11, 2, [190, 210, 250]);
        // The lift.
        door(c, 15, 3, [70, 76, 110], accent); c.rect(15 * T + 7, 3 * T - 9, 2, 25, [44, 48, 76]); pad(c, 15, 4, accent);
        // Lanes from the entrance to the three booths.
        const lane = dk(accent, 0.3);
        for (const x of [7, 15, 23]) { c.rect(x * T + 7, 13 * T, 2, 4 * T, lane); c.rect(Math.min(x, 15) * T + 7, 17 * T, Math.abs(x - 15) * T + 2, 2, lane); frame(c, x * T - 14, 12 * T - 6, 44, 30, lane, 2); }
        c.rect(15 * T + 7, 17 * T, 2, 2 * T, lane);
      });
      // The booths' screens, each with a silhouette.
      [7, 15, 23].forEach((x, k) => prop(p, x - 1, 10, 3, 1, (c, top, X, Y) => {
        const col = [[236, 110, 110], [110, 170, 240], [130, 220, 130]][k];
        c.box(X + 2, Y + 6, 44, 9, [60, 64, 92], INK); top.box(X + 2, Y - 20, 44, 28, [24, 28, 46], accent); top.rect(X + 5, Y - 17, 38, 22, dk(col, 0.45));
        const s = (n * 3 + k) % 4, mx = X + 24, my = Y - 5;
        if (s === 0) { top.ellipse(mx, my, 8, 7, INK); top.poly([[mx - 8, my - 4], [mx - 12, my - 13], [mx - 3, my - 6]], INK); top.poly([[mx + 8, my - 4], [mx + 12, my - 13], [mx + 3, my - 6]], INK); }
        else if (s === 1) { top.ellipse(mx, my + 1, 6, 8, INK); top.ellipse(mx - 9, my - 2, 6, 4, INK); top.ellipse(mx + 9, my - 2, 6, 4, INK); }
        else if (s === 2) { top.ellipse(mx - 2, my + 2, 10, 6, INK); top.ellipse(mx + 8, my - 4, 5, 4, INK); top.poly([[mx - 10, my], [mx - 16, my - 8], [mx - 6, my - 2]], INK); }
        else { top.ellipse(mx, my - 2, 7, 6, INK); top.rect(mx - 5, my + 2, 10, 7, INK); top.rect(mx - 1, my - 13, 2, 6, INK); top.ellipse(mx, my - 13, 2, 2, INK); }
        top.box(X + 18, Y - 26, 12, 8, col, INK); top.rect(X + 22, Y - 24, 4, 4, WHITE);
      }));
      for (const [x, y] of [[2, 4], [27, 4], [2, 21], [27, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => gymStatue(c, top, X, Y));
    },
  };
}
for (let n = 0; n < 4; n++) PLANS["KalosPrismQuiz" + n] = quizFloor(n);
// The top of the tower: Clemont's stage. A dark deck ruled in green light inside a border of pink and cyan
// light tiles, white pillars at the corners, a dotted dark wall under a row of stage lamps.
PLANS.KalosPrismSummit = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const GR = [70, 240, 130], CY = [70, 226, 240], PK = [250, 110, 220];
    p.block(2, 2, 22, 2);
    p.paint(0, (c) => {
      // The wall: dots of teal light, and the lamps above.
      c.rect(2 * T, 0, 22 * T, 4 * T, [10, 14, 18]); for (let y = 16; y < 4 * T - 8; y += 5) for (let x = 2 * T + 3; x < 24 * T - 2; x += 5) if ((x * 7 + y * 3) % 11 < 7) c.rect(x, y, 2, 2, (x + y) % 4 ? [30, 110, 110] : [60, 190, 180]);
      c.rect(2 * T, 8, 22 * T, 3, [50, 56, 70]); for (let k = 0; k < 9; k++) { const col = [GR, CY, [90, 130, 250]][k % 3], x = 3 * T + k * 40; c.box(x - 4, 9, 8, 6, [40, 44, 56], INK); c.ellipse(x, 16, 4, 3, col); c.poly([[x - 3, 18], [x + 3, 18], [x + 12, 60], [x - 12, 60]], A(col, 22)); }
      c.rect(2 * T, 4 * T - 6, 22 * T, 6, [40, 46, 60]); c.rect(2 * T, 4 * T - 7, 22 * T, 1, GR);
      // The deck: dark mesh ruled with green light, cyan rings where the two Trainers stand.
      wash(p, c, [8, 10, 14, 150]);
      floors(p, (x, y, X, Y) => { const edge = x <= 3 || x >= 22 || y <= 5 || y >= 20; if (edge && (x + y) % 3 !== 2) { const col = (x + y) % 3 ? PK : CY; c.rect(X + 1, Y + 1, 14, 14, dk(col, 0.2)); c.rect(X + 2, Y + 2, 12, 10, lt(col, 0.25)); } else if (edge) { c.rect(X + 1, Y + 1, 14, 14, [226, 232, 240]); } });
      for (let x = 4; x <= 22; x += 3) c.rect(x * T - 1, 6 * T, 2, 14 * T, A(GR, 220)); for (let y = 6; y <= 20; y += 3.5) c.rect(4 * T, y * T - 1, 18 * T, 2, A(GR, 220));
      frame(c, 4 * T, 6 * T, 18 * T, 14 * T, GR, 2);
      for (const [x, y] of [[13.5, 7], [13.5, 17.5]]) { c.ellipse(x * T, y * T, 24, 13, [8, 10, 14]); c.ellipse(x * T, y * T, 24, 13, CY, 2); c.ellipse(x * T, y * T, 14, 7, A(CY, 200), 2); c.ellipse(x * T, y * T, 5, 3, lt(CY, 0.5)); }
      exitMat(p, c);
    });
    // White pillars at the corners.
    for (const [x, y] of [[4, 5], [21, 5], [4, 19], [21, 19]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [240, 240, 236]));
    // The lamp stands either side of Clemont.
    for (const [x, y] of [[8, 4], [17, 4]]) prop(p, x, y, 2, 1, (c, top, X, Y) => { c.box(X + 6, Y + 6, 20, 9, [30, 34, 44], INK); c.rect(X + 14, Y - 6, 4, 13, [90, 96, 110]); glow(c, X + 16, Y - 8, 16, [250, 226, 130], 26); top.ellipse(X + 16, Y - 8, 4, 5, [250, 226, 130]); top.ellipse(X + 15, Y - 9, 2, 2, WHITE); });
  },
};
// ---------------------------------------------------------------- Laverre Gym (Valerie, Fairy): the dollhouse
function kimono(c, top, X, Y, col, sash = GOLD) { shadow(c, X, Y); c.rect(X + 7, Y - 6, 2, 20, [90, 66, 50]); c.rect(X + 3, Y + 13, 10, 2, [90, 66, 50]); top.rect(X - 2, Y - 8, 20, 2, [90, 66, 50]); top.poly([[X - 2, Y - 6], [X + 18, Y - 6], [X + 15, Y + 9], [X + 1, Y + 9]], col); top.poly([[X + 5, Y - 6], [X + 11, Y - 6], [X + 8, Y + 1]], lt(col, 0.5)); top.rect(X + 2, Y + 1, 12, 3, sash); for (const [dx, dy] of [[3, 6], [11, 5], [7, -3]]) top.ellipse(X + dx, Y + dy, 1, 1, WHITE); }
function plush(c, top, X, Y, col) { shadow(c, X, Y); c.ellipse(X + 8, Y + 9, 6, 5, col); c.ellipse(X + 8, Y + 10, 3, 3, lt(col, 0.5)); top.ellipse(X + 8, Y + 1, 5, 5, col); top.ellipse(X + 4, Y - 3, 2, 2, col); top.ellipse(X + 12, Y - 3, 2, 2, col); top.p(X + 6, Y + 1, INK); top.p(X + 10, Y + 1, INK); top.rect(X + 7, Y + 3, 2, 1, [226, 90, 110]); }
function clock(c, top, X, Y, col = [150, 100, 70]) { c.box(X + 3, Y - 4, 10, 19, col, dk(col, 0.6)); c.rect(X + 7, Y + 3, 2, 8, GOLD); c.ellipse(X + 8, Y + 11, 2, 2, GOLD); top.box(X + 2, Y - 16, 12, 13, lt(col, 0.15), dk(col, 0.6)); top.ellipse(X + 8, Y - 10, 4, 4, WHITE); top.rect(X + 8, Y - 13, 1, 3, INK); top.rect(X + 8, Y - 10, 3, 1, INK); }
function teaTable(c, X, Y, w, h, cloth) { table(c, X, Y, w, h, cloth); frame(c, X + 3, Y + 4, w - 6, h - 10, lt(cloth, 0.5)); c.ellipse(X + w / 2, Y + h / 2 - 2, 4, 3, WHITE); c.rect(X + w / 2 + 4, Y + h / 2 - 3, 2, 1, WHITE); for (const dx of [-12, 12]) { c.ellipse(X + w / 2 + dx, Y + h / 2 - 1, 3, 2, WHITE); c.ellipse(X + w / 2 + dx, Y + h / 2 - 1, 1, 1, [200, 150, 90]); } }
// The rooms of the house, each in its own colours: floor, wall, carpet; `plank` for a wooden floor.
const DOLL = [null,
  { f: [120, 78, 52], w: [104, 66, 46], rug: [190, 50, 56], plank: true },
  { f: [214, 232, 244], w: [186, 216, 238], rug: [140, 184, 228] },
  { f: [244, 216, 228], w: [236, 176, 204], rug: [222, 124, 166] },
  { f: [240, 230, 202], w: [224, 204, 150], rug: [198, 158, 78] },
  { f: [204, 234, 228], w: [150, 204, 194], rug: [86, 166, 156] },
  { f: [134, 88, 58], w: [150, 98, 62], rug: [224, 138, 58], plank: true },
  { f: [150, 112, 192], w: [104, 66, 146], rug: [112, 62, 152] },
  { f: [232, 226, 244], w: [198, 178, 228], rug: [168, 138, 218] }];
// The floor and back wall of one room: a plain coloured floor (boards or stone) inside a gilt border, papered wall.
function dollShell(p, c, st, x1, y1) {
  floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, st.f); if (st.plank) { c.rect(X, Y + 7, T, 1, dk(st.f, 0.25)); c.rect(X, Y + 15, T, 1, dk(st.f, 0.25)); c.rect(X + ((x * 5 + y) % 2 ? 4 : 11), Y, 1, 7, dk(st.f, 0.2)); } else { c.rect(X, Y, T, 1, lt(st.f, 0.35)); c.rect(X, Y, 1, T, lt(st.f, 0.35)); } });
  wall(c, 2, 0, x1, 1, st.w, { stripe: st.plank ? dk(st.w, 0.18) : lt(st.w, 0.3), gap: 8, sw: 3, skirt: st.plank ? dk(st.w, 0.4) : WHITE, top: GOLD });
  frame(c, 2 * T, 2 * T, (x1 - 1) * T, (y1 - 1) * T, A(GOLD, 200), 2);
}
// A warp disc: gold, as in every room of the house, with a jewel that tells the ways apart.
function goldPad(c, x, y, gem) { const X = x * T + 8, Y = y * T + 8; glow(c, X, Y, 15, [250, 220, 110], 26); c.ellipse(X, Y + 2, 9, 6, [150, 110, 30]); c.ellipse(X, Y, 9, 6, [250, 206, 70]); c.ellipse(X, Y, 9, 6, [255, 240, 170], 1); c.ellipse(X, Y, 6, 4, [226, 170, 40], 1); c.ellipse(X, Y, 3, 2, gem); c.p(X - 1, Y - 1, WHITE); }
const PADS = { on: [250, 130, 190], side: [110, 190, 250], back: [255, 244, 190], out: [150, 236, 170] };
// The first room: a panelled parlour with a fireplace between red curtains, a red and gold carpet on dark boards.
PLANS.KalosLaverreGym = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    p.bare(1); p.bare(2); p.block(2, 2, 24, 2);
    p.paint(0, (c) => {
      const WD = [110, 70, 46];
      floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [128, 84, 54]); c.rect(X, Y + 7, T, 1, [96, 60, 40]); c.rect(X, Y + 15, T, 1, [96, 60, 40]); c.rect(X + ((x * 5 + y) % 2 ? 4 : 11), Y, 1, 7, [104, 66, 44]); });
      wall(c, 2, 0, 25, 3, WD, { panel: [86, 54, 36], top: GOLD, stripe: dk(WD, 0.15), gap: 16 });
      // The fireplace and the mirror over it.
      const X = 12 * T; c.box(X, 22, 4 * T, 42, [150, 104, 66], [60, 38, 26]); c.rect(X - 4, 18, 4 * T + 8, 6, [176, 128, 84]); c.box(X + 12, 36, 40, 28, [30, 22, 20], [60, 38, 26]); flame(c, X + 32, 62, 1.1); flame(c, X + 24, 62, 0.7); flame(c, X + 40, 62, 0.7);
      c.box(X + 16, 2, 32, 14, [200, 226, 236], GOLD);
      // Red curtains and gilt-latticed windows to either side.
      for (const x of [4, 8, 17, 21]) { c.box(x * T, 6, 2 * T, 40, [250, 236, 180], GOLD); for (let k = 0; k <= 32; k += 8) { c.line(x * T + k, 6, x * T + 32, 6 + (32 - k) * 1.25, A(GOLD, 220)); c.line(x * T + k, 46, x * T + 32, 46 - (32 - k) * 1.25, A(GOLD, 220)); c.line(x * T + k, 6, x * T, 6 + k * 1.25, A(GOLD, 220)); c.line(x * T + k, 46, x * T, 46 - k * 1.25, A(GOLD, 220)); } }
      for (const [x, s] of [[3, 1], [10, -1], [16, 1], [23, -1]]) { c.poly([[x * T, 2], [x * T + 14, 2], [x * T + (s > 0 ? 4 : 10), 50], [x * T + (s > 0 ? 0 : 14), 50]], [176, 40, 50]); c.rect(x * T + (s > 0 ? 1 : 9), 2, 3, 46, [214, 70, 76]); c.rect(x * T + 2, 30, 10, 3, GOLD); }
      rug(c, 10, 9, 17, 20, [186, 46, 54], GOLD); c.ellipse(13 * T + 16, 14 * T + 8, 34, 50, A(GOLD, 200), 2); c.ellipse(13 * T + 16, 14 * T + 8, 14, 22, A(GOLD, 200), 1);
      exitMat(p, c);
      for (const [k, col] of [[1, PADS.on], [2, PADS.out]]) { const w = p.warps[k]; goldPad(c, w.x, w.y, col); }
    });
    [[4, 10, [236, 110, 150]], [8, 14, [130, 110, 220]], [22, 8, [110, 190, 200]], [22, 17, [240, 190, 90]], [4, 18, [150, 200, 120]], [11, 6, [226, 90, 110]], [16, 6, [190, 120, 220]]].forEach(([x, y, col]) => prop(p, x, y, 1, 1, (c, top, X, Y) => kimono(c, top, X, Y, col)));
    for (const [x, y] of [[2, 4], [25, 4], [2, 21], [25, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { glow(c, X + 8, Y, 20, [250, 220, 150], 22); c.rect(X + 7, Y + 2, 2, 12, GOLD); c.rect(X + 4, Y + 13, 8, 2, dk(GOLD, 0.3)); top.poly([[X + 2, Y + 3], [X + 14, Y + 3], [X + 11, Y - 6], [X + 5, Y - 6]], [250, 226, 150]); top.rect(X + 2, Y + 2, 12, 1, GOLD); });
  },
};
function dollRoom(n) {
  const st = DOLL[n], col = st.rug, valerie = n === 7;
  return {
    theme: { room: "house", floor: "rCenter", wall: null },
    plan(p) {
      p.warps.forEach((w) => p.bare(w.k));
      p.paint(0, (c) => {
        dollShell(p, c, st, 21, 19);
        if (valerie) {
          // Valerie's room: gold swirls across a violet floor, gilt lattice windows and the purple drape with her mark.
          onFloor(p, c, () => { for (const [x, y, rx, ry] of [[4, 8, 70, 30], [20, 6, 80, 36], [12, 14, 150, 40], [5, 18, 90, 30], [20, 18, 70, 26], [12, 10, 60, 60]]) { c.ellipse(x * T, y * T, rx, ry, [236, 200, 100, 150], 3); c.ellipse(x * T, y * T, rx - 8, ry - 6, [250, 226, 170, 90], 1); } c.rect(2 * T, 2 * T, 20 * T, 6, [226, 190, 240, 120]); });
          for (const x of [2, 4, 17, 19]) { c.box(x * T + 2, 2, 2 * T - 4, 28, [250, 236, 180], GOLD); for (let k = 0; k <= 28; k += 7) { c.line(x * T + 2 + k, 2, x * T + 30, 2 + (28 - k), A(GOLD, 230)); c.line(x * T + 2 + k, 30, x * T + 30, 30 - (28 - k), A(GOLD, 230)); c.line(x * T + 2 + k, 2, x * T + 2, 2 + k, A(GOLD, 230)); c.line(x * T + 2 + k, 30, x * T + 2, 30 - k, A(GOLD, 230)); } }
          c.poly([[7 * T, 0], [17 * T, 0], [17 * T, 22], [15 * T, 30], [12 * T, 24], [9 * T, 30], [7 * T, 22]], [112, 62, 152]); c.poly([[7 * T, 0], [17 * T, 0], [17 * T, 6], [7 * T, 6]], [150, 96, 190]); c.ellipse(12 * T, 13, 9, 9, [226, 190, 240], 2); c.ellipse(12 * T, 13, 4, 4, [226, 190, 240]);
          for (const x of [8, 10, 14, 16]) { c.ellipse(x * T, 24, 9, 5, [40, 34, 50]); c.ellipse(x * T, 23, 7, 3, GOLD, 1); }
        } else {
          for (const x of [5, 14]) windowAt(c, x * T + 2, 6, 24, 20, [170, 216, 244], st.plank ? [176, 128, 84] : WHITE);
          picture(c, 10 * T, 6, 26, 20, { sky: lt(col, 0.6), blob: dk(col, 0.2) }, GOLD);
          rug(c, 9, 9, 15, 13, col, GOLD);
        }
        p.warps.forEach((w) => { const kind = w.exit ? "back" : w.to === "KalosLaverreGym" ? "out" : (/[2468]$/.test(w.to) ? "side" : "on"); goldPad(c, w.x, w.y, PADS[kind]); });
      });
      const v = n % 3, toy = [[236, 150, 170], [150, 190, 240], [240, 214, 130], [170, 220, 170]];
      // Against the back wall.
      prop(p, 2, 2, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, st.plank ? [110, 76, 50] : [226, 190, 170], n));
      if (v === 0) { prop(p, 8, 2, 1, 2, (c, top, X, Y) => bed(c, X, Y, dk(col, 0.1))); prop(p, 10, 2, 1, 2, (c, top, X, Y) => bed(c, X, Y, lt(col, 0.2))); }
      else if (v === 1) prop(p, 7, 2, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, dk(col, 0.15)));
      else prop(p, 8, 2, 3, 1, (c, top, X, Y) => { c.box(X, Y - 8, 48, 22, [60, 50, 60], INK); c.rect(X + 2, Y + 2, 44, 6, WHITE); for (let k = 3; k < 46; k += 4) c.rect(X + k, Y + 2, 1, 6, INK); for (let k = 5; k < 44; k += 8) c.rect(X + k, Y + 2, 3, 4, INK); c.rect(X + 2, Y - 6, 44, 3, [90, 76, 90]); });
      prop(p, 13, 2, 1, 1, (c, top, X, Y) => clock(c, top, X, Y));
      prop(p, 21, 2, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [226, 130, 170]));
      // Tea for the dolls.
      if (!valerie) prop(p, 3 + v * 2, 12, 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, lt(col, 0.5)));
      prop(p, 13 + v, 16, 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, WHITE));
      [[2, 19], [21, 19], [2, 8 + v], [21, 9 - v], [10 - v, 19], [16, 8 + v * 3]].forEach(([x, y], k) => { if (valerie && k === 5) return; prop(p, x, y, 1, 1, (c, top, X, Y) => plush(c, top, X, Y, toy[(k + n) % 4])); });
      // A rocking horse.
      prop(p, 4 + v * 3, 6, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.ellipse(X + 8, Y + 13, 8, 3, [150, 100, 70], 2); c.ellipse(X + 8, Y + 6, 6, 4, [236, 226, 210]); c.rect(X + 4, Y + 8, 2, 5, [236, 226, 210]); c.rect(X + 10, Y + 8, 2, 5, [236, 226, 210]); top.ellipse(X + 13, Y, 3, 4, [236, 226, 210]); top.rect(X + 10, Y - 2, 3, 6, dk(col, 0.2)); c.rect(X + 6, Y + 3, 5, 3, dk(col, 0.1)); });
    },
  };
}
for (let n = 1; n <= 8; n++) PLANS["KalosDollRoom" + n] = dollRoom(n);
// ---------------------------------------------------------------- Anistar Gym (Olympia, Psychic)
function cosmos(p, c, seed) {
  voidFill(p, c, [10, 12, 40]);
  speckle(p, c, 26, 0, 0, p.W - 1, p.H - 1, seed, (x, y, r, k) => { const col = [[70, 60, 190], [40, 90, 200], [120, 70, 180], [30, 150, 190]][k % 4]; for (let j = 3; j >= 1; j--) c.ellipse(x, y, (50 + r * 60) * j / 3, (26 + r * 30) * j / 3, A(col, 20)); });
  speckle(p, c, 420, 0, 0, p.W - 1, p.H - 1, seed + 1, (x, y, r) => { if (r > 0.93) star(c, x, y, WHITE, 2); else if (r > 0.8) star(c, x, y, [200, 210, 255], 1); else c.p(x, y, r > 0.4 ? [220, 226, 255] : [150, 150, 220]); });
}
function planet(c, x, y, r, col, ring) { c.ellipse(x, y, r, r, dk(col, 0.35)); c.ellipse(x - r * 0.12, y - r * 0.12, r * 0.86, r * 0.86, col); c.ellipse(x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.22, lt(col, 0.4)); for (let k = -1; k <= 1; k++) c.rect(x - r * 0.8, y + k * r * 0.4, r * 1.5, 1, A(dk(col, 0.3), 140)); if (ring) { c.ellipse(x, y, r * 1.8, r * 0.45, A(ring, 220), 2); c.ellipse(x, y - r * 0.2, r * 0.98, r * 0.8, col); } }
// The parlour: pale tiles under yellow walls and purple curtains, a midnight rug with a gold star chart,
// and the door into the starfield.
PLANS.KalosAnistarGym = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const NAVY = [44, 50, 104], PUR = [140, 80, 180];
    p.bare(1); p.block(2, 2, 24, 3);
    p.paint(0, (c) => {
      floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [206, 216, 226]); c.rect(X, Y, T, 1, [236, 242, 248]); c.rect(X, Y, 1, T, [236, 242, 248]); c.rect(X + 15, Y, 1, T, [176, 188, 204]); c.rect(X, Y + 15, T, 1, [176, 188, 204]); });
      exitMat(p, c);
      wall(c, 2, 0, 25, 4, [236, 200, 96], { panel: [206, 164, 70], top: [255, 236, 170] });
      // Cabinets along the wall, purple curtains between.
      for (const x of [5, 19]) { c.box(x * T, 30, 4 * T, 36, [150, 104, 66], [70, 46, 30]); c.rect(x * T + 2, 32, 4 * T - 4, 4, [190, 140, 90]); for (let k = 0; k < 4; k++) frame(c, x * T + 3 + k * 15, 40, 13, 22, [96, 62, 40]); }
      for (const [x, s] of [[3, 1], [10, -1], [17, 1], [24, -1]]) { c.poly([[x * T - 4, 2], [x * T + 20, 2], [x * T + (s > 0 ? 2 : 14), 60], [x * T + (s > 0 ? -4 : 20), 60]], PUR); c.poly([[x * T + 2, 2], [x * T + 12, 2], [x * T + (s > 0 ? 4 : 10), 56]], lt(PUR, 0.25)); c.rect(x * T + (s > 0 ? -3 : 9), 38, 12, 3, GOLD); }
      // The portal.
      const cx = 14 * T + 8; glow(c, cx, 44, 56, [170, 130, 250], 22); c.ellipse(cx, 46, 30, 34, GOLD); c.ellipse(cx, 46, 27, 31, [16, 12, 44]); c.rect(cx - 27, 46, 54, 34, [16, 12, 44]); c.rect(cx - 30, 46, 3, 34, GOLD); c.rect(cx + 27, 46, 3, 34, GOLD);
      speckle(p, c, 30, 12.6, 1.2, 15.4, 4.8, 9, (x, y, r) => star(c, x, y, r > 0.5 ? WHITE : [200, 180, 255], r > 0.8 ? 2 : 0)); c.ellipse(cx, 52, 12, 12, [130, 90, 220, 120]); c.ellipse(cx, 52, 6, 6, [220, 200, 255, 160]);
      pad(c, 14, 5, [190, 150, 250]);
      // The rug: midnight blue, a gold chart of the heavens at its centre.
      rug(c, 8, 9, 20, 18, NAVY, [120, 130, 180]);
      const zx = 14 * T + 8, zy = 14 * T; c.ellipse(zx, zy, 34, 34, A(GOLD, 230), 2); c.ellipse(zx, zy, 24, 24, A(GOLD, 200), 1); for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; c.line(zx + Math.cos(t) * 24, zy + Math.sin(t) * 24, zx + Math.cos(t) * 33, zy + Math.sin(t) * 33, GOLD); } for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4, r = a % 2 ? 10 : 20; c.line(zx, zy, zx + Math.cos(t) * r, zy + Math.sin(t) * r, GOLD, 2); } c.ellipse(zx, zy, 5, 5, GOLD);
    });
    // Two chairs on the rug, a telescope, an orrery and globes.
    for (const x of [10, 18]) prop(p, x, 11, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 2, Y + 5, 12, 9, [226, 210, 226], [120, 96, 130]); top.box(X + 3, Y - 6, 10, 12, PUR, [80, 44, 110]); top.rect(X + 5, Y - 4, 6, 2, lt(PUR, 0.4)); });
    prop(p, 6, 8, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 8, Y + 2, X + 3, Y + 14, [90, 70, 50]); c.line(X + 8, Y + 2, X + 13, Y + 14, [90, 70, 50]); top.line(X + 2, Y + 2, X + 16, Y - 10, [200, 160, 80], 4); top.ellipse(X + 16, Y - 10, 3, 3, [150, 200, 240]); });
    prop(p, 22, 7, 2, 2, (c, top, X, Y) => { table(c, X, Y, 32, 30, [110, 70, 60]); top.ellipse(X + 16, Y + 6, 14, 6, A(GOLD, 220), 1); top.ellipse(X + 16, Y + 6, 4, 4, [250, 210, 90]); top.ellipse(X + 5, Y + 4, 2, 2, [110, 170, 240]); top.ellipse(X + 26, Y + 9, 2, 2, [236, 110, 110]); });
    for (const [x, y, col] of [[4, 16, [90, 150, 220]], [23, 16, [200, 130, 90]]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 4, 2, 9, [120, 90, 60]); c.rect(X + 4, Y + 12, 8, 2, [120, 90, 60]); planet(top, X + 8, Y, 6, col); });
    for (const [x, y] of [[2, 5], [25, 5], [2, 21], [25, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [110, 170, 120]));
  },
};
// The starfield: walkways of blue-green light hung in space among the constellations.
function starfield(n) {
  return {
    theme: { room: "arena", floor: "paving", wall: null },
    plan(p) {
      const CY = [60, 210, 226], EDGE = [170, 250, 255];
      p.bare(0); if (p.warps[1]) p.bare(1);
      p.paint(0, (c) => {
        behind(p, c, () => {
          cosmos(p, c, 3 + n * 5);
          // A far galaxy, and one small world.
          const gx = (n ? 29 : 6) * T, gy = 3 * T; for (let k = 5; k >= 1; k--) c.ellipse(gx, gy, 12 * k, 4 * k, [200, 190, 255, 26]); c.ellipse(gx, gy, 6, 3, [250, 244, 255, 200]);
          if (n) planet(c, 4 * T, 13 * T, 11, [226, 120, 150]); else planet(c, 33 * T, 13 * T, 10, [200, 130, 220]);
          // Constellations.
          for (const pts of [[[2, 2], [5, 3], [7, 1.5], [10, 3], [12, 2]], [[24, 13], [26, 15], [29, 14], [28, 12], [24, 13]], [[9, 24], [11, 26], [14, 25], [13, 28]], [[23, 24], [25, 27], [27, 25], [30, 28]], [[2, 14], [4, 15.5], [3, 12.5], [5, 13]], [[30, 24], [33, 22], [32, 27]]]) { for (let k = 0; k + 1 < pts.length; k++) c.line(pts[k][0] * T, pts[k][1] * T, pts[k + 1][0] * T, pts[k + 1][1] * T, [200, 220, 255, 150]); for (const [x, y] of pts) star(c, x * T, y * T, WHITE, 2); }
        });
        // The walkways: translucent, bright at the edges.
        floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [10, 12, 40]); c.rect(X, Y, T, T, A(mix(CY, [50, 150, 220], ((x + y) % 6) / 6), 190)); if (p.hash(x, y, 4) < 0.25) star(c, X + 3 + p.hash(x, y, 5) * 10, Y + 3 + p.hash(x, y, 6) * 10, [220, 255, 255], 0); });
        each(p, (x, y, fl) => { if (!fl) return; const X = x * T, Y = y * T; if (!p.isFloor(x, y - 1)) { c.rect(X, Y, T, 3, EDGE); c.rect(X, Y + 3, T, 2, A(EDGE, 110)); } if (!p.isFloor(x, y + 1)) { c.rect(X, Y + 13, T, 3, EDGE); c.rect(X, Y + 11, T, 2, A(EDGE, 110)); } if (!p.isFloor(x - 1, y)) { c.rect(X, Y, 3, T, EDGE); c.rect(X + 3, Y, 2, T, A(EDGE, 110)); } if (!p.isFloor(x + 1, y)) { c.rect(X + 13, Y, 3, T, EDGE); c.rect(X + 11, Y, 2, T, A(EDGE, 110)); } });
        solids(p, (x, y, X, Y) => { if (p.isFloor(x, y - 1)) c.rect(X, Y, T, 4, [30, 110, 150, 150]); });
        // Olympia's ring: a whirl of rose light. On the first field, a paler one marks the crossing.
        const whirl = (cx, cy, col) => { for (let k = 6; k >= 1; k--) c.ellipse(cx, cy, 7 * k, 4.4 * k, k % 2 ? col : lt(col, 0.55)); c.ellipse(cx, cy, 44, 28, lt(col, 0.7), 2); for (let a = 0; a < 40; a++) { const t = a * 0.5, r = a * 1.05; c.ellipse(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.62, 2, 1, WHITE); } };
        if (n) whirl(18 * T + 8, 7 * T + 8, [236, 90, 220]); else { c.ellipse(18 * T + 8, 8 * T, 34, 21, A(EDGE, 200), 2); c.ellipse(18 * T + 8, 8 * T, 20, 12, A(EDGE, 140), 1); }
        c.ellipse(18 * T + 8, 19 * T + 8, 34, 21, A(EDGE, 200), 2); c.ellipse(18 * T + 8, 19 * T + 8, 20, 12, A(EDGE, 140), 1);
        const w0 = p.warps[0]; pad(c, w0.x, w0.y, [190, 150, 250]); if (p.warps[1]) pad(c, p.warps[1].x, p.warps[1].y, [250, 150, 230]);
      });
    },
  };
}
PLANS.KalosAnistarStars1 = starfield(0);
PLANS.KalosAnistarStars2 = starfield(1);

// ---------------------------------------------------------------- Snowbelle Gym (Wulfric, Ice)
function iceFloor(p, c) { floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [232, 242, 252, 215]); c.rect(X, Y, T, 1, [255, 255, 255, 200]); c.rect(X, Y + 15, T, 1, [190, 212, 236, 160]); if (p.hash(x, y, 2) < 0.3) c.line(X + 2, Y + 12 - p.hash(x, y, 3) * 8, X + 9 + p.hash(x, y, 4) * 5, Y + 3, [255, 255, 255, 220]); }); exitMat(p, c); }
// The wall: blocks of white ice, hung with icicles.
function iceWall(p, c, x0, y0, x1, y1) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X, Y, W, H, [226, 238, 250]); for (let y = Y; y < Y + H; y += 8) for (let x = X; x < X + W; x += 8) { c.rect(x, y, 7, 7, p.hash(x, y, 6) < 0.3 ? [206, 226, 246] : [240, 247, 255]); c.rect(x, y, 7, 1, WHITE); } c.rect(X, Y + H - 3, W, 3, [150, 186, 226]); for (let x = X + 2; x < X + W - 3; x += 7) { const h = 5 + p.hash(x, y0, 5) * 12; c.poly([[x, Y + 3], [x + 5, Y + 3], [x + 2.5, Y + 3 + h]], WHITE); c.line(x + 2.5, Y + 3, x + 2.5, Y + 3 + h, [190, 216, 244]); } }
function iceBlock(c, top, X, Y) { c.ellipse(X + 8, Y + 14, 8, 3, [60, 100, 150, 80]); c.box(X, Y - 2, 16, 17, [170, 214, 244], [90, 140, 196]); c.rect(X + 1, Y - 1, 14, 3, WHITE); c.line(X + 3, Y + 11, X + 10, Y + 3, [240, 250, 255]); top.poly([[X + 2, Y - 2], [X + 5, Y - 12], [X + 8, Y - 2]], [200, 232, 250]); top.poly([[X + 8, Y - 2], [X + 11, Y - 8], [X + 14, Y - 2]], [226, 244, 255]); }
// A turning platform: a slab of coloured light tiles set into the ice (the floor under it is ordinary floor).
function turntable(c, cx, cy, r, col) {
  const ry = r * 0.8, x0 = Math.floor((cx - r) / 8) * 8, y0 = Math.floor((cy - ry) / 8) * 8;
  c.ellipse(cx, cy + 3, r + 2, ry + 2, [120, 150, 190]); c.ellipse(cx, cy, r + 2, ry + 2, WHITE);
  for (let y = y0; y < cy + ry; y += 8) for (let x = x0; x < cx + r; x += 8) { const dx = (x + 4 - cx) / (r - 3), dy = (y + 4 - cy) / (ry - 3); if (dx * dx + dy * dy > 1) continue; const a = ((x / 8) * 3 + (y / 8) * 5) % 4; c.rect(x, y, 7, 7, a === 0 ? lt(col, 0.45) : a === 1 ? dk(col, 0.12) : col); c.rect(x, y, 7, 1, lt(col, 0.6)); }
  c.ellipse(cx, cy, r, ry, dk(col, 0.3), 2);
  for (let a = 0; a < 3; a++) { const t = a * Math.PI * 2 / 3 + 0.5; c.poly([[cx + Math.cos(t + 0.9) * (r - 12), cy + Math.sin(t + 0.9) * (r - 12) * 0.8], [cx + Math.cos(t + 1.15) * (r - 8), cy + Math.sin(t + 1.15) * (r - 8) * 0.8], [cx + Math.cos(t + 1.15) * (r - 17), cy + Math.sin(t + 1.15) * (r - 17) * 0.8]], WHITE); }
  c.ellipse(cx, cy, 7, 6, dk(col, 0.3)); c.ellipse(cx, cy, 4, 3, WHITE);
}
function iceHall(cols) {
  return {
    theme: { room: "arena", floor: "paving", wall: null },
    plan(p) {
      p.bare(1); p.block(2, 2, 32, 2);
      p.paint(0, (c) => {
        iceFloor(p, c); iceWall(p, c, 2, 0, 33, 3);
        door(c, 18, 4, [110, 156, 206], [220, 240, 255]); steps(c, 18, 5, [200, 226, 246]);
        turntable(c, 8 * T + 8, 20 * T + 8, 84, cols[0]); turntable(c, 26 * T + 8, 20 * T + 8, 84, cols[1]);
        turntable(c, 12 * T, 8 * T + 8, 58, cols[1]); turntable(c, 25 * T, 8 * T + 8, 58, cols[0]);
        // The switches.
        [[8, 22], [26, 22]].forEach(([x, y], k) => { c.box(x * T - 2, y * T - 2, 20, 20, dk(cols[k], 0.3), INK); c.ellipse(x * T + 8, y * T + 8, 6, 6, cols[k]); c.ellipse(x * T + 7, y * T + 6, 3, 2, lt(cols[k], 0.6)); });
        rug(c, 17, 24, 19, 28, [110, 170, 226], WHITE);
      });
      // The frozen barrier across the hall.
      p.paint(14.5, (c, top) => { for (let x = 2; x <= 33; x++) if (x !== 18) { c.rect(x * T, 13 * T - 6, T, 22, [150, 196, 236]); iceBlock(c, top, x * T, 13 * T); } for (const x of [17, 19]) top.box(x * T + (x === 17 ? 10 : 0), 13 * T - 20, 6, 36, [110, 156, 206], [70, 110, 160]); });
      for (const [x, y] of [[2, 4], [33, 4], [2, 12], [33, 12], [2, 14], [33, 14], [2, 29], [33, 29], [14, 29], [22, 29]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); crystal(c, X + 5, Y + 15, [170, 220, 250], 1.3); crystal(c, X + 11, Y + 15, [220, 244, 255], 0.8); });
    },
  };
}
PLANS.KalosSnowbelleGym = iceHall([[250, 150, 200], [110, 170, 250]]);
PLANS.KalosSnowbelleIceUpper = iceHall([[250, 200, 90], [130, 220, 150]]);
// Wulfric's hall: a wall of frosted glass blocks in soft colours behind him, glowing cubes along its foot.
PLANS.KalosSnowbelleSummit = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    p.block(2, 2, 24, 2);
    p.paint(0, (c) => {
      iceFloor(p, c);
      // The glass wall.
      const PAST = [[236, 246, 250], [206, 240, 226], [250, 232, 206], [250, 214, 226], [222, 214, 246], [206, 230, 250]];
      c.rect(2 * T, 0, 24 * T, 4 * T, [226, 238, 246]);
      for (let y = 0; y < 4 * T - 8; y += 8) for (let x = 2 * T; x < 26 * T; x += 8) { const zone = Math.floor((x / 8 + Math.floor(y / 16) * 3) / 5), col = PAST[(zone * 7 + Math.floor(y / 24)) % PAST.length]; c.rect(x, y, 7, 7, p.hash(x, y, 4) < 0.25 ? lt(col, 0.5) : col); c.rect(x, y, 7, 1, [255, 255, 255, 190]); c.rect(x, y, 1, 7, [255, 255, 255, 150]); }
      c.rect(2 * T, 4 * T - 8, 24 * T, 8, [244, 250, 255]); c.rect(2 * T, 4 * T - 2, 24 * T, 2, [170, 200, 230]);
      for (let x = 4; x <= 23; x += 3) { glow(c, x * T + 8, 4 * T - 12, 16, WHITE, 40); c.box(x * T + 1, 4 * T - 20, 14, 14, [250, 254, 255], [190, 216, 240]); c.rect(x * T + 3, 4 * T - 18, 10, 3, WHITE); }
      court(c, 5, 8, 22, 17, [110, 170, 250], [150, 190, 236]);
      // The snowflake.
      const cx = 14 * T, cy = 13 * T, SN = [130, 180, 236, 230]; for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3, ex = cx + Math.cos(t) * 44, ey = cy + Math.sin(t) * 44; c.line(cx, cy, ex, ey, SN, 3); for (const s of [-1, 1]) for (const f of [0.5, 0.75]) c.line(cx + Math.cos(t) * 44 * f, cy + Math.sin(t) * 44 * f, cx + Math.cos(t) * 44 * f + Math.cos(t + s * 1) * 10, cy + Math.sin(t) * 44 * f + Math.sin(t + s * 1) * 10, SN, 2); }
    });
    for (const [x, y] of [[3, 5], [24, 5], [3, 20], [24, 20], [8, 4], [19, 4], [2, 12], [25, 12]]) prop(p, x, y, 1, 1, (c, top, X, Y) => iceBlock(c, top, X, Y));
    for (const [x, y] of [[6, 20], [21, 20], [2, 4], [25, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); crystal(c, X + 5, Y + 15, [170, 220, 250], 1.4); crystal(c, X + 11, Y + 15, [220, 244, 255], 0.9); });
  },
};
// ---------------------------------------------------------------- The Pokémon League
function lavaPatch(p, c, x0, y0, x1, y1) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X, Y, W, H, [206, 70, 30]); speckle(p, c, W * H / 160, x0, y0, x1, y1, x0 + 3, (x, y, r) => { c.ellipse(x, y, 5 + r * 9, 3 + r * 4, [240, 130, 40]); c.ellipse(x, y, 2 + r * 5, 1 + r * 2, [252, 210, 90]); }); speckle(p, c, W * H / 300, x0, y0, x1, y1, x0 + 9, (x, y, r) => c.rect(x, y, 6 + r * 12, 2, [110, 36, 30])); }
function waterPatch(p, c, x0, y0, x1, y1, col = [60, 130, 214]) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X, Y, W, H, col); for (let y = Y + 3; y < Y + H - 2; y += 6) for (let x = X + ((y / 6) & 1) * 7 + 2; x < X + W - 8; x += 15) if (p.hash(x, y, 5) < 0.7) { c.rect(x, y, 7, 1, lt(col, 0.45)); c.rect(x + 2, y + 1, 5, 1, dk(col, 0.2)); } }
// The tall stained-glass window behind a throne: a leaded grid of panes in the chamber's colours.
function glassWindow(c, x0, x1, rows, cols) {
  const X = x0 * T + 4, W = (x1 - x0 + 1) * T - 8, H = rows * T - 6; c.box(X - 3, 0, W + 6, H + 3, [30, 26, 34], [90, 80, 70]);
  for (let y = 3; y < H - 4; y += 9) for (let x = X; x < X + W - 4; x += 9) { const col = cols[((x - X) / 9 + (y / 9) * 2) % cols.length | 0]; c.rect(x, y, 8, 8, dk(col, 0.25)); c.ellipse(x + 4, y + 4, 3, 3, col); c.p(x + 3, y + 3, lt(col, 0.6)); }
}
// The round stained-glass floor at the heart of a chamber: a stone rim, a ring of glass roundels, a pale boss.
function medallion(p, c, cx, cy, rx, ry, cols, stone) {
  onFloor(p, c, () => {
    c.ellipse(cx, cy + 3, rx + 2, ry + 2, dk(stone, 0.5)); c.ellipse(cx, cy, rx, ry, stone); c.ellipse(cx, cy, rx - 5, ry - 4, dk(stone, 0.3), 2); c.ellipse(cx, cy, rx - 14, ry - 12, [24, 22, 30]);
    c.ellipse(cx, cy, rx - 17, ry - 15, dk(cols[0], 0.35));
    for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4 + Math.PI / 8, x = cx + Math.cos(t) * (rx - 42), y = cy + Math.sin(t) * (ry - 36), col = cols[a % cols.length]; c.ellipse(x, y, 23, 19, [24, 22, 30]); c.ellipse(x, y, 20, 16, col); c.ellipse(x - 4, y - 4, 9, 6, lt(col, 0.4)); c.ellipse(x, y, 20, 16, lt(col, 0.3), 1); }
    for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4, x = cx + Math.cos(t) * (rx - 28), y = cy + Math.sin(t) * (ry - 24), col = cols[(a + 2) % cols.length]; c.ellipse(x, y, 8, 7, [24, 22, 30]); c.ellipse(x, y, 6, 5, lt(col, 0.2)); }
    c.ellipse(cx, cy, 30, 25, [24, 22, 30]); c.ellipse(cx, cy, 27, 22, lt(stone, 0.5)); c.ellipse(cx, cy, 27, 22, GOLD, 1); c.ellipse(cx, cy, 16, 13, stone); c.ellipse(cx, cy, 16, 13, dk(stone, 0.4), 1); c.ellipse(cx, cy, 5, 4, cols[0]);
  });
}
// An Elite Four chamber: the round glass floor, the element's two great fixtures either side of it, carpeted
// steps to the throne under its window, and the element filling the sides and the far wall.
function chamber(o) {
  return {
    theme: { room: "arena", floor: o.floor, wall: null },
    plan(p) {
      p.block(2, 2, 26, 3); p.block(2, 5, 5, 21); p.block(23, 5, 5, 21);
      p.paint(0, (c) => {
        if (o.wash) c.rect(7 * T, 5 * T, 16 * T, 21 * T, o.wash);
        o.back(p, c); glassWindow(c, 13, 17, 4, o.glass); o.side(p, c, 2, 6); o.side(p, c, 23, 27);
        for (const x of [7, 23]) { c.rect(x * T - 3, 5 * T, 6, 21 * T, dk(o.col, 0.45)); c.rect(x * T - 3, 5 * T, 2, 21 * T, lt(o.col, 0.3)); }
        const cx = 15 * T + 8, cy = 7 * T + 8;
        medallion(p, c, cx, 16 * T + 8, 112, 92, o.glass, o.stone || [200, 196, 204]);
        // The carpeted steps and the dais.
        c.box(14 * T - 2, 8 * T, 3 * T + 4, 3 * T - 6, o.rug || dk(o.col, 0.2), GOLD); for (let y = 8 * T + 9; y < 11 * T - 8; y += 9) c.rect(14 * T, y, 3 * T, 2, dk(o.rug || o.col, 0.45));
        c.ellipse(cx, cy + 4, 62, 30, dk(o.col, 0.5)); c.ellipse(cx, cy, 60, 28, lt(o.col, 0.25)); c.ellipse(cx, cy, 60, 28, GOLD, 2); c.ellipse(cx, cy, 44, 20, A(o.col, 200)); c.ellipse(cx, cy, 44, 20, A(WHITE, 200), 1);
        exitMat(p, c);
        // The throne.
        c.box(cx - 13, 5 * T - 6, 26, 28, dk(o.col, 0.25), INK); c.rect(cx - 10, 5 * T - 3, 20, 20, o.col); c.ellipse(cx, 5 * T - 6, 13, 8, o.col); c.ellipse(cx, 5 * T - 6, 9, 5, GOLD); c.rect(cx - 15, 5 * T + 12, 30, 10, dk(o.col, 0.35));
      });
      // The two fixtures on the glass, left and right of the centre.
      if (o.fixture) for (const x of [10, 19]) prop(p, x, 15, 2, 2, (c, top, X, Y) => o.fixture(c, top, X, Y));
      if (o.props) o.props(p);
    },
  };
}
// Malva: the Blazing Chamber. Two columns of fire on the glass, molten light down either side.
PLANS.KalosEliteMalva = chamber({
  floor: "ash", col: [214, 70, 50], wash: [120, 30, 20, 70], glass: [[226, 60, 40], [250, 170, 40], [250, 226, 80], [90, 170, 70]], stone: [206, 170, 110],
  back(p, c) { wall(c, 2, 0, 27, 4, [150, 70, 30], { brick: [110, 44, 22], top: [240, 150, 60], skirt: [240, 130, 40] }); for (let x = 3; x <= 26; x += 3) if (x < 12 || x > 18) { glow(c, x * T + 8, 3 * T, 30, [250, 150, 50], 18); c.rect(x * T + 2, 6, 12, 4 * T + 4, [250, 120, 40]); c.rect(x * T + 5, 6, 6, 4 * T + 4, [252, 200, 80]); c.rect(x * T + 7, 6, 2, 4 * T + 4, [255, 244, 190]); for (let y = 10; y < 5 * T; y += 9) c.rect(x * T + 1 + (y % 2) * 12, y, 2, 5, [236, 96, 40]); } },
  side(p, c, x0, x1) { lavaPatch(p, c, x0, 5, x1, 25); },
  fixture(c, top, X, Y) {
    glow(c, X + 16, Y + 8, 46, [250, 150, 50], 24); c.ellipse(X + 16, Y + 22, 18, 9, [60, 30, 24]); c.ellipse(X + 16, Y + 21, 15, 7, [250, 200, 80]);
    top.poly([[X + 1, Y + 22], [X + 31, Y + 22], [X + 27, Y - 20], [X + 21, Y - 44], [X + 16, Y - 66], [X + 10, Y - 40], [X + 4, Y - 16]], [236, 96, 40]); top.poly([[X + 6, Y + 22], [X + 26, Y + 22], [X + 22, Y - 14], [X + 16, Y - 48], [X + 10, Y - 10]], [250, 170, 50]); top.poly([[X + 10, Y + 22], [X + 22, Y + 22], [X + 18, Y - 4], [X + 16, Y - 26], [X + 13, Y - 2]], [255, 236, 150]);
  },
  props(p) {
    for (const x of [7, 22]) for (let y = 6; y <= 24; y += 6) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y));
    for (const [x, y] of [[3, 8], [5, 14], [3, 20], [26, 8], [24, 14], [26, 20], [4, 24], [25, 24]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 12; glow(c, X, Y - 12, 30, [250, 150, 50], 20); c.ellipse(X, Y, 10, 4, [110, 36, 30]); top.poly([[X - 8, Y], [X + 8, Y], [X + 5, Y - 22], [X, Y - 44], [X - 5, Y - 22]], [236, 96, 40]); top.poly([[X - 5, Y], [X + 5, Y], [X + 2, Y - 18], [X, Y - 32], [X - 3, Y - 16]], [250, 190, 70]); top.poly([[X - 2, Y], [X + 2, Y], [X, Y - 18]], [255, 244, 190]); });
  },
});
// Siebold: the Flood Chamber. Curtains of water down the walls into pools either side; two spiked wheels hang on
// chains over the glass, water pouring from them.
PLANS.KalosEliteSiebold = chamber({
  floor: "paving", col: [70, 140, 226], wash: [40, 90, 200, 90], glass: [[60, 130, 236], [90, 220, 240], [150, 110, 230], [200, 236, 250]], stone: [214, 226, 236],
  back(p, c) { wall(c, 2, 0, 27, 4, [50, 96, 170], { top: WHITE }); for (let x = 2 * T; x < 28 * T; x += 4) { const a = p.hash(x, 1, 3); c.rect(x, 3, 3, 5 * T - 6, a < 0.3 ? [150, 206, 250] : a < 0.7 ? [96, 164, 236] : [70, 130, 214]); if (a > 0.5) c.rect(x, 10 + a * 40, 1, 12, WHITE); } c.rect(2 * T, 5 * T - 6, 26 * T, 6, [236, 246, 255]); for (let x = 2 * T; x < 28 * T; x += 9) c.ellipse(x + 4, 5 * T - 5, 6, 4, [236, 246, 255]); c.rect(12 * T, 0, 7 * T, 4 * T, [30, 40, 80]); c.rect(12 * T, 0, 3, 4 * T, GOLD); c.rect(19 * T - 3, 0, 3, 4 * T, GOLD); },
  side(p, c, x0, x1) { waterPatch(p, c, x0, 5, x1, 25); c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 5, [236, 246, 255, 190]); },
  fixture(c, top, X, Y) {
    glow(c, X + 16, Y + 14, 40, [120, 220, 255], 26); c.ellipse(X + 16, Y + 20, 20, 10, [170, 236, 255, 200]); c.ellipse(X + 16, Y + 20, 20, 10, WHITE, 1);
    for (let y = Y - 70; y < Y - 6; y += 6) { top.ellipse(X + 16, y, 2, 3, [150, 156, 176], 1); }
    for (let a = 0; a < 10; a++) { const t = a * Math.PI / 5; top.poly([[X + 16 + Math.cos(t) * 12, Y + 2 + Math.sin(t) * 8], [X + 16 + Math.cos(t + 0.3) * 12, Y + 2 + Math.sin(t + 0.3) * 8], [X + 16 + Math.cos(t + 0.15) * 20, Y + 2 + Math.sin(t + 0.15) * 13]], [226, 232, 244]); }
    top.ellipse(X + 16, Y + 2, 14, 9, [150, 160, 186]); top.ellipse(X + 16, Y + 1, 12, 7, [214, 222, 236]); top.ellipse(X + 16, Y + 1, 5, 3, [90, 200, 250]); for (const s of [-1, 1]) top.rect(X + 16 + s * 8, Y + 8, 2, 12, [200, 236, 255, 200]);
  },
  props(p) {
    for (const [x, y] of [[4, 9], [4, 16], [4, 23], [25, 9], [25, 16], [25, 23]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 8; c.ellipse(X, Y, 22, 10, [150, 206, 250, 160]); c.ellipse(X, Y, 22, 10, WHITE, 1); c.ellipse(X, Y, 8, 4, [90, 100, 130]); top.rect(X - 1, Y - 34, 3, 34, [200, 232, 255]); for (const s of [-1, 1]) for (let k = 0; k < 12; k++) top.rect(X + s * k, Y - 34 + k * k * 0.22, 2, 3, [220, 240, 255]); top.ellipse(X, Y - 35, 3, 3, WHITE); });
    for (const x of [7, 22]) for (let y = 7; y <= 23; y += 8) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [226, 214, 150]));
  },
});
// Wikstrom: the Ironworks Chamber. A dark steel keep; two great shields, each with a blue orb and a blade behind
// it, stand on the glass, and giant swords are driven into the floor either side.
PLANS.KalosEliteWikstrom = chamber({
  floor: "steel", col: [110, 120, 150], rug: [60, 70, 110], wash: [20, 24, 40, 110], glass: [[130, 80, 220], [70, 200, 210], [80, 110, 190], [226, 230, 244]], stone: [190, 196, 210],
  back(p, c) {
    wall(c, 2, 0, 27, 4, [58, 62, 84], { brick: [40, 44, 62], top: [150, 156, 180], skirt: [30, 34, 50] });
    for (const [x0, s] of [[7, 1], [23, -1]]) { const cx = x0 * T; c.line(cx - s * 50, 70, cx + s * 50, 10, [30, 34, 50], 9); c.line(cx - s * 50, 70, cx + s * 50, 10, [214, 220, 236], 5); c.line(cx - s * 50, 69, cx + s * 50, 9, WHITE, 1); c.line(cx - s * 40, 50, cx - s * 26, 70, GOLD, 4); }
    for (const x of [3, 10, 19, 26]) banner(c, x * T + 1, 10, 14, 40, [70, 60, 130], GOLD);
  },
  side(p, c, x0, x1) { c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 21 * T, [34, 38, 56]); for (let y = 5 * T; y < 26 * T; y += 8) c.rect(x0 * T, y, (x1 - x0 + 1) * T, 1, [58, 64, 86]); for (let x = x0 * T; x < (x1 + 1) * T; x += 8) c.rect(x, 5 * T, 1, 21 * T, [58, 64, 86]); },
  fixture(c, top, X, Y) {
    c.ellipse(X + 16, Y + 26, 18, 6, [0, 0, 0, 90]); c.box(X + 4, Y + 16, 24, 12, [70, 76, 100], INK);
    top.rect(X + 14, Y - 62, 4, 60, [214, 220, 236]); top.poly([[X + 14, Y - 62], [X + 18, Y - 62], [X + 16, Y - 70]], [214, 220, 236]); top.rect(X + 9, Y - 6, 14, 3, GOLD);
    top.poly([[X + 2, Y - 34], [X + 30, Y - 34], [X + 30, Y], [X + 16, Y + 20], [X + 2, Y]], [40, 44, 62]); top.poly([[X + 5, Y - 31], [X + 27, Y - 31], [X + 27, Y - 1], [X + 16, Y + 15], [X + 5, Y - 1]], [96, 104, 136]); top.poly([[X + 5, Y - 31], [X + 16, Y - 31], [X + 16, Y + 15], [X + 5, Y - 1]], [130, 138, 170]);
    glow(top, X + 16, Y - 12, 18, [90, 150, 255], 40); top.ellipse(X + 16, Y - 12, 8, 8, [20, 30, 80]); top.ellipse(X + 16, Y - 12, 6, 6, [60, 120, 250]); top.ellipse(X + 14, Y - 14, 2, 2, [200, 226, 255]);
  },
  props(p) {
    for (const [x, y] of [[4, 8], [3, 15], [5, 22], [25, 8], [26, 15], [24, 22]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 10; c.ellipse(X, Y + 2, 12, 5, [24, 26, 40]); top.poly([[X - 6, Y], [X + 6, Y], [X + 6, Y - 54], [X, Y - 60], [X - 6, Y - 54]], [110, 116, 140]); top.poly([[X - 4, Y], [X, Y], [X, Y - 58], [X - 4, Y - 54]], [226, 232, 244]); top.rect(X - 14, Y - 62, 28, 5, GOLD); top.rect(X - 3, Y - 78, 6, 16, [110, 70, 50]); top.ellipse(X, Y - 80, 4, 4, GOLD); });
    for (const x of [7, 22]) for (let y = 7; y <= 23; y += 8) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 3, Y + 6, 10, 9, [110, 116, 140], INK); top.box(X + 4, Y - 6, 8, 13, [176, 182, 204], INK); top.ellipse(X + 8, Y - 9, 5, 5, [176, 182, 204]); top.rect(X + 5, Y - 9, 6, 2, INK); top.poly([[X + 8, Y - 18], [X + 6, Y - 13], [X + 10, Y - 13]], [200, 60, 70]); top.rect(X + 13, Y - 14, 2, 26, [214, 220, 236]); });
  },
});
// Drasna: the Dragonmark Chamber. A dragon's head carved over the window, its violet wings sweeping in from the
// dark either side, and two smoking censers on the glass.
PLANS.KalosEliteDrasna = chamber({
  floor: "ruinFloor", col: [130, 90, 200], wash: [70, 40, 130, 80], glass: [[70, 90, 236], [150, 80, 226], [226, 90, 220], [70, 200, 210]], stone: [190, 170, 220],
  back(p, c) {
    wall(c, 2, 0, 27, 4, [44, 34, 70], { brick: [30, 22, 52], top: [110, 80, 170], skirt: [24, 18, 40] });
    for (const x of [4, 8, 21, 25]) { glow(c, x * T + 8, 50, 24, [170, 110, 250], 22); crystal(c, x * T + 8, 76, [170, 110, 250], 2.2); }
  },
  side(p, c, x0, x1) { c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 21 * T, [28, 22, 46]); speckle(p, c, 60, x0, 5, x1, 25, x0, (x, y, r) => { c.ellipse(x, y, 6 + r * 10, 3 + r * 5, [40, 32, 64]); if (r > 0.7) crystal(c, x, y + 4, [150, 100, 230], 0.7); }); },
  fixture(c, top, X, Y) {
    c.ellipse(X + 16, Y + 26, 14, 5, [0, 0, 0, 90]); c.box(X + 9, Y + 12, 14, 14, [70, 60, 100], INK); c.ellipse(X + 16, Y + 10, 12, 6, [110, 96, 150]); c.ellipse(X + 16, Y + 9, 9, 4, [40, 30, 60]);
    glow(top, X + 16, Y - 6, 18, [200, 150, 255], 30); for (let k = 0; k < 6; k++) top.ellipse(X + 16 + Math.sin(k * 1.3) * 4, Y + 4 - k * 8, 5 - k * 0.5, 4, [220, 190, 255, 150 - k * 20]);
  },
  props(p) {
    // The carved head over the window.
    p.paint(4.5, (c, top) => { const cx = 15 * T + 8, B = [150, 124, 190], Bd = [96, 76, 136]; for (const s of [-1, 1]) { top.poly([[cx + s * 20, 22], [cx + s * 58, -2], [cx + s * 50, 8], [cx + s * 28, 34]], Bd); top.poly([[cx + s * 20, 20], [cx + s * 54, 0], [cx + s * 28, 30]], B); } top.ellipse(cx, 22, 28, 20, Bd); top.ellipse(cx, 20, 26, 18, B); top.poly([[cx - 18, 30], [cx + 18, 30], [cx + 9, 56], [cx - 9, 56]], B); top.poly([[cx - 4, 22], [cx + 4, 22], [cx, 52]], lt(B, 0.25)); for (const s of [-1, 1]) { glow(top, cx + s * 12, 24, 10, [220, 150, 255], 40); top.ellipse(cx + s * 12, 24, 6, 4, [30, 20, 50]); top.ellipse(cx + s * 12, 24, 2, 3, [236, 170, 255]); top.ellipse(cx + s * 4, 50, 1, 2, [40, 30, 60]); } for (let k = -6; k <= 6; k += 4) top.poly([[cx + k - 2, 56], [cx + k + 2, 56], [cx + k, 62]], WHITE); });
    // The wings: bone struts with violet membrane between them.
    for (const s of [-1, 1]) p.paint(26, (c, top) => { const X = s < 0 ? 2 * T : 28 * T, tip = (y, len, rise) => [X - s * len, y * T - rise]; const pts = [tip(8, 70, 60), tip(13, 84, 40), tip(18, 76, 26), tip(23, 60, 16)]; for (let k = 0; k + 1 < pts.length; k++) top.poly([[X, (8 + k * 5) * T + 8], pts[k], pts[k + 1], [X, (13 + k * 5) * T + 8]], [110, 70, 170, 200]); pts.forEach((q, k) => { top.line(X, (8 + k * 5) * T + 8, q[0], q[1], [190, 170, 220], 3); top.ellipse(q[0], q[1], 3, 3, [226, 214, 240]); }); });
    for (const x of [7, 22]) for (const y of [6, 24]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [170, 110, 250], [226, 200, 255]));
  },
});
// The great hall: the four chambers' gates round a seal, and the golden door to the Champion beyond.
PLANS.KalosLeagueHall = {
  theme: { room: "arena", floor: "hallFloor", wall: null },
  plan(p) {
    const gates = [[1, [226, 80, 50]], [2, [70, 140, 226]], [3, [160, 170, 196]], [4, [140, 96, 214]]];
    for (let k = 1; k <= 5; k++) p.bare(k); p.block(2, 2, 36, 2);
    p.paint(0, (c) => {
      wall(c, 2, 0, 37, 3, [176, 170, 186], { brick: [140, 134, 154], top: GOLD, skirt: [96, 90, 110] });
      for (const x of [5, 10, 15, 24, 29, 34]) windowAt(c, x * T, 14, 20, 36, [170, 210, 244], [226, 220, 236]);
      c.box(19 * T - 8, 6, 3 * T, 58, GOLD, [120, 90, 30]); c.rect(19 * T - 4, 10, 3 * T - 8, 54, [250, 230, 150]); c.rect(20 * T + 7, 10, 2, 54, [120, 90, 30]); c.ellipse(20 * T + 8, 8, 22, 10, GOLD); glow(c, 20 * T + 8, 40, 40, [255, 240, 170], 18);
      // Carpets to each gate, and the seal.
      const R = [150, 40, 50]; rug(c, 19, 5, 21, 29, R); for (const [k] of gates) { const w = p.warps[k]; rug(c, Math.min(w.x, 20), w.y + 1, Math.max(w.x, 20), w.y + 2, R); }
      const cx = 20 * T + 8, cy = 17 * T + 8; c.ellipse(cx, cy, 70, 56, [96, 90, 110]); c.ellipse(cx, cy, 67, 53, [226, 220, 236]); c.ellipse(cx, cy, 67, 53, GOLD, 3);
      gates.forEach(([k, col], n) => { const t = [Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.75, Math.PI * 0.25][n]; c.poly([[cx, cy], [cx + Math.cos(t - 0.75) * 60, cy + Math.sin(t - 0.75) * 47], [cx + Math.cos(t) * 64, cy + Math.sin(t) * 50], [cx + Math.cos(t + 0.75) * 60, cy + Math.sin(t + 0.75) * 47]], A(col, 170)); });
      c.ellipse(cx, cy, 20, 16, GOLD); ball(c, cx, cy, 10); c.rect(cx - 66, cy - 1, 132, 2, GOLD); c.rect(cx - 1, cy - 52, 2, 104, GOLD);
      steps(c, 20, 4, [226, 214, 170]);
    });
    gates.forEach(([k, col], n) => {
      const w = p.warps[k]; p.block(w.x - 1, w.y - 1, 3, 1); p.block(w.x - 1, w.y, 1, 1); p.block(w.x + 1, w.y, 1, 1);
      p.paint(w.y + 1.5, (c, top) => {
        const X = w.x * T, Y = w.y * T; glow(c, X + 8, Y, 44, col, 16);
        c.box(X - 18, Y - 26, 52, 42, [150, 146, 160], INK); c.rect(X - 2, Y - 14, 20, 30, [20, 18, 28]); c.rect(X, Y - 12, 16, 28, dk(col, 0.4)); c.rect(X + 3, Y - 8, 10, 24, A(col, 200)); c.rect(X + 6, Y - 4, 4, 20, lt(col, 0.5));
        for (const dx of [-17, 19]) { c.box(X + dx, Y - 22, 14, 38, [200, 198, 206], INK); c.rect(X + dx + 3, Y - 20, 3, 34, WHITE); }
        top.box(X - 20, Y - 34, 56, 12, [176, 172, 186], INK); top.poly([[X - 20, Y - 34], [X + 8, Y - 50], [X + 36, Y - 34]], dk(col, 0.1)); top.ellipse(X + 8, Y - 37, 6, 6, GOLD); top.ellipse(X + 8, Y - 37, 4, 4, col);
        if (n === 0) flame(top, X + 8, Y - 33, 0.5); else if (n === 1) top.ellipse(X + 8, Y - 36, 2, 3, WHITE); else if (n === 2) top.rect(X + 7, Y - 41, 2, 8, WHITE); else top.poly([[X + 5, Y - 34], [X + 8, Y - 41], [X + 11, Y - 34]], WHITE);
      });
    });
    for (const [x, y] of [[13, 12], [27, 12], [13, 22], [27, 22], [4, 16], [35, 16], [16, 28], [24, 28], [4, 30], [35, 30], [4, 5], [35, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [214, 210, 222]));
    for (const [x, y] of [[17, 5], [23, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [250, 220, 110], WHITE));
  },
};
// Diantha's Radiant Chamber: white marble, a rose window, drapes like wings.
PLANS.KalosRadiantChamber = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 28, 2); p.block(2, 4, 1, 24); p.block(29, 4, 1, 24);
    p.paint(0, (c) => {
      c.rect(2 * T, 4 * T, 28 * T, 24 * T, [255, 255, 255, 150]);
      wall(c, 2, 0, 29, 3, [244, 240, 250], { stripe: [226, 222, 240], gap: 12, sw: 3, top: GOLD, skirt: [200, 190, 220] });
      // Stained glass.
      const cx = 16 * T + 8;
      for (const [x, cols] of [[6, [[250, 150, 180], [250, 220, 130]]], [11, [[150, 200, 250], [190, 240, 200]]], [20, [[190, 240, 200], [150, 200, 250]]], [25, [[250, 220, 130], [250, 150, 180]]]]) { windowAt(c, x * T, 16, 22, 40, cols[0], GOLD); c.poly([[x * T + 2, 36], [x * T + 11, 22], [x * T + 20, 36], [x * T + 11, 52]], cols[1]); c.ellipse(x * T + 11, 36, 4, 4, WHITE); }
      c.ellipse(cx, 26, 30, 24, GOLD); for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; c.poly([[cx, 26], [cx + Math.cos(t) * 27, 26 + Math.sin(t) * 21], [cx + Math.cos(t + 0.52) * 27, 26 + Math.sin(t + 0.52) * 21]], [[250, 150, 180], [250, 220, 130], [150, 200, 250], [190, 240, 200]][a % 4]); c.line(cx, 26, cx + Math.cos(t) * 27, 26 + Math.sin(t) * 21, GOLD); } c.ellipse(cx, 26, 8, 6, WHITE);
      door(c, 16, 3, GOLD, [255, 250, 220]); pad(c, 16, 4, [255, 240, 170]);
      // Light falling from the window.
      c.poly([[cx - 30, 4 * T], [cx + 30, 4 * T], [cx + 120, 26 * T], [cx - 120, 26 * T]], [255, 250, 210, 40]); c.poly([[cx - 12, 4 * T], [cx + 12, 4 * T], [cx + 50, 26 * T], [cx - 50, 26 * T]], [255, 250, 210, 40]);
      rug(c, 15, 10, 17, 24, [250, 240, 226], GOLD); court(c, 6, 11, 26, 21, [250, 150, 180], GOLD); exitMat(p, c);
      const dy = 8 * T + 8; c.ellipse(cx, dy, 56, 26, [255, 255, 255, 200]); c.ellipse(cx, dy, 56, 26, GOLD, 2); for (const s of [-1, 1]) for (let k = 0; k < 5; k++) c.ellipse(cx + s * (26 + k * 9), dy - 4 - k * 4, 12, 5, [255, 244, 250, 200]);
      // The drapes at the sides.
      for (const x of [2, 29]) for (let y = 4 * T; y < 28 * T; y += 2) c.rect(x * T, y, T, 2, mix([244, 236, 250], [200, 180, 226], (Math.sin(y * 0.2) + 1) / 2));
    });
    for (const x of [5, 26]) for (let y = 7; y <= 23; y += 4) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [250, 248, 255]));
    for (const [x, y] of [[13, 4], [19, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { plant(c, top, X, Y, [250, 170, 200]); });
  },
};
// The Hall of Fame: the registry machine under a vault of lights.
PLANS.KalosKalosHallOfFame = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    p.block(2, 2, 28, 4);
    p.paint(0, (c) => {
      c.rect(2 * T, 6 * T, 28 * T, 20 * T, [20, 30, 90, 110]);
      wall(c, 2, 0, 29, 5, [30, 36, 80], { stripe: [40, 48, 100], gap: 16, top: GOLD, skirt: [16, 20, 50] });
      const cx = 16 * T + 8; glow(c, cx, 50, 80, [130, 190, 255], 16);
      // The machine.
      c.ellipse(cx, 30, 56, 26, GOLD); c.ellipse(cx, 32, 52, 24, [16, 20, 50]); c.box(cx - 56, 30, 112, 62, [70, 80, 130], GOLD); c.rect(cx - 50, 36, 100, 34, [20, 40, 80]); c.rect(cx - 48, 38, 96, 30, [60, 130, 200]);
      for (let k = 0; k < 6; k++) ball(c, cx - 40 + k * 16, 52, 5); c.rect(cx - 44, 62, 88, 2, [190, 230, 255]);
      for (let k = 0; k < 6; k++) { c.ellipse(cx - 40 + k * 16, 82, 6, 4, [30, 36, 80]); c.ellipse(cx - 40 + k * 16, 81, 4, 2, k % 2 ? [130, 190, 255] : GOLD); }
      for (const x of [4, 8, 23, 27]) { banner(c, x * T, 10, 16, 56, [150, 40, 60], GOLD); }
      rug(c, 15, 9, 17, 22, [150, 40, 60], GOLD);
      for (let y = 8; y <= 24; y += 4) for (const x of [6, 11, 21, 26]) { c.ellipse(x * T, y * T, 20, 9, [130, 190, 255, 50]); c.ellipse(x * T, y * T, 10, 4, [220, 240, 255, 110]); }
      const cy = 15 * T; c.ellipse(cx, cy, 44, 30, A(GOLD, 230), 2); exitMat(p, c);
    });
    for (const x of [4, 13, 19, 28]) for (let y = 8; y <= 24; y += 4) prop(p, x, y, 1, 1, (c, top, X, Y) => { pillar(c, top, X, Y, [110, 120, 180]); top.ellipse(X + 8, Y - 17, 4, 3, [220, 240, 255]); });
  },
};

// ---------------------------------------------------------------- story rooms: shared furniture
// Block `rows` floor rows at the back of a rectangular room (the wall is then painted over rows 0..result).
function back(p, rows) { if (rows) p.block(p.left, p.top, p.right - p.left + 1, rows); return p.top + rows - 1; }
function checker(p, c, a, b, x0 = 0, y0 = 0, x1 = 99, y1 = 99) { floors(p, (x, y, X, Y) => { if (x >= x0 && x <= x1 && y >= y0 && y <= y1) c.rect(X, Y, T, T, (x + y) & 1 ? a : b); }); }
// A desk with a computer on it, `w` pixels wide.
function desk(c, top, X, Y, w, col = [190, 196, 214], lamp = [110, 200, 240]) { table(c, X, Y - 2, w, 18, col); top.box(X + w / 2 - 8, Y - 14, 16, 12, [50, 54, 70], INK); top.rect(X + w / 2 - 6, Y - 12, 12, 8, lamp); top.rect(X + w / 2 - 5, Y - 11, 5, 2, lt(lamp, 0.6)); c.rect(X + w / 2 - 6, Y + 2, 12, 3, [70, 74, 92]); if (w > 40) { c.box(X + 4, Y, 9, 6, WHITE, [150, 150, 170]); c.rect(X + w - 12, Y + 1, 6, 4, [226, 190, 90]); } }
function counter(c, X, Y, w, col = [176, 128, 80], topc) { c.ellipse(X + w / 2, Y + 15, w / 2, 3, [0, 0, 0, 50]); c.box(X, Y - 3, w, 18, col, dk(col, 0.55)); c.rect(X, Y - 3, w, 5, topc || lt(col, 0.45)); c.rect(X, Y + 2, w, 1, dk(col, 0.4)); for (let x = X + 6; x < X + w - 4; x += 12) c.rect(x, Y + 5, 1, 8, dk(col, 0.3)); }
function bench(c, X, Y, w, col = [150, 108, 70]) { c.ellipse(X + w / 2, Y + 14, w / 2, 3, [0, 0, 0, 50]); c.box(X + 1, Y + 3, w - 2, 8, col, dk(col, 0.55)); c.rect(X + 2, Y + 4, w - 4, 2, lt(col, 0.3)); c.rect(X + 3, Y + 11, 2, 3, dk(col, 0.5)); c.rect(X + w - 5, Y + 11, 2, 3, dk(col, 0.5)); }
// A glass display case, `w` pixels wide; `item(c, cx, cy)` draws what is inside.
function showcase(c, top, X, Y, w, item, base = [110, 80, 60]) { c.ellipse(X + w / 2, Y + 15, w / 2, 3, [0, 0, 0, 50]); c.box(X, Y + 3, w, 12, base, dk(base, 0.55)); c.rect(X + 1, Y + 4, w - 2, 2, lt(base, 0.3)); top.box(X + 1, Y - 12, w - 2, 16, [200, 230, 244, 120], [120, 150, 170]); item(top, X + w / 2, Y - 3); top.rect(X + 3, Y - 10, 2, 8, [255, 255, 255, 170]); }
function chandelier(top, x, y, col = GOLD) { top.rect(x, y - 16, 1, 12, dk(col, 0.3)); top.ellipse(x, y, 12, 4, col, 2); for (const dx of [-10, -4, 4, 10]) { top.rect(x + dx, y - 5, 2, 4, WHITE); top.p(x + dx, y - 6, [255, 220, 110]); } top.ellipse(x, y + 3, 2, 3, [220, 240, 255]); }
function fish(c, x, y, col, s = 1, dir = 1) { c.ellipse(x, y, 5 * s, 3 * s, col); c.poly([[x - dir * 4 * s, y], [x - dir * 8 * s, y - 3 * s], [x - dir * 8 * s, y + 3 * s]], col); c.p(x + dir * 3 * s, y - 1, INK); c.rect(x - 1, y - 1, 2, 1, lt(col, 0.5)); }
// A tank wall: water behind glass over tiles x0..x1, rows y0..y1.
function tankWall(p, c, x0, y0, x1, y1, seed = 3) {
  const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T;
  for (let y = 0; y < H; y += 2) c.rect(X, Y + y, W, 2, mix([70, 170, 226], [20, 60, 140], y / H));
  for (let x = X + 6; x < X + W - 4; x += 13) { const h = 10 + p.hash(x, 1, seed) * 26; for (let y = 0; y < h; y += 2) c.rect(x + Math.round(Math.sin(y * 0.4 + x) * 2), Y + H - 8 - y, 3, 2, y % 4 ? [50, 150, 110] : [40, 120, 96]); }
  speckle(p, c, W / 14, x0, y0 + 0.4, x1 + 0.6, y1 + 0.3, seed, (x, y, r, k) => fish(c, x, y, [[250, 150, 70], [250, 220, 100], [236, 110, 130], [200, 220, 240], [130, 220, 170]][k % 5], r > 0.8 ? 2 : 1, k % 2 ? 1 : -1));
  speckle(p, c, W / 10, x0, y0, x1 + 0.9, y1 + 0.5, seed + 1, (x, y) => c.ellipse(x, y, 1.5, 1.5, [220, 240, 255, 170], 1));
  c.rect(X, Y + H - 8, W, 8, [200, 180, 130]); c.rect(X, Y, W, 4, [90, 96, 120]); c.rect(X, Y + H - 3, W, 3, [60, 64, 86]);
  for (let x = X; x <= X + W; x += 80) c.rect(Math.min(x, X + W - 4), Y, 4, H, [90, 96, 120]);
  for (let x = X + 10; x < X + W; x += 80) c.line(x, Y + 6, x + 18, Y + H - 12, [255, 255, 255, 50], 4);
}
// A stone statue of Mega Lucario, feet at pixel (x, y).
function lucario(c, top, x, y, s = 1, col = [170, 172, 186]) {
  const D = dk(col, 0.3), L = lt(col, 0.35), r = (dx, dy, w, h, k = col) => top.rect(x + dx * s, y + dy * s, w * s, h * s, k);
  r(-7, -22, 5, 22, D); r(2, -22, 5, 22, D); r(-6, -22, 2, 20, col); r(3, -22, 2, 20, col); r(-9, -3, 7, 3); r(2, -3, 7, 3);
  r(-8, -42, 16, 22); r(-8, -42, 4, 22, L); r(4, -42, 4, 22, D); top.poly([[x - 3 * s, y - 36 * s], [x + 3 * s, y - 36 * s], [x, y - 28 * s]], L);
  r(-16, -41, 8, 5); r(8, -41, 8, 5); r(-17, -40, 4, 16, D); r(13, -40, 4, 16, D); top.poly([[x - 17 * s, y - 28 * s], [x - 22 * s, y - 24 * s], [x - 15 * s, y - 24 * s]], L); top.poly([[x + 17 * s, y - 28 * s], [x + 22 * s, y - 24 * s], [x + 15 * s, y - 24 * s]], L);
  top.ellipse(x, y - 49 * s, 7 * s, 7 * s, col); top.poly([[x - 6 * s, y - 53 * s], [x - 9 * s, y - 64 * s], [x - 2 * s, y - 55 * s]], col); top.poly([[x + 6 * s, y - 53 * s], [x + 9 * s, y - 64 * s], [x + 2 * s, y - 55 * s]], D); r(-2, -48, 7, 4, L); r(-9, -48, 3, 9, D); r(7, -48, 3, 9, D); r(-4, -51, 2, 1, INK); r(2, -51, 2, 1, INK);
}

// ---------------------------------------------------------------- Vaniville: the player's home
PLANS.KalosHome = {
  theme: { room: "house", floor: "rHouse", wall: "wHouse" },
  plan(p) {
    p.decor("rKitchen", 6, 0); p.decor("rTV", 10, 1); p.decor("rWindow", 15, 0); p.decor("rBooks", 2, 1); p.decor("rTable", 3, 10); p.decor("rPot", 2, 14, { optional: true }); p.decor("rPot", 17, 14, { optional: true });
    p.paint(0, (c) => { rug(c, 9, 9, 14, 12, [110, 160, 210], WHITE); rug(c, 14, 11, 16, 13, [226, 150, 170], WHITE); frame(c, 3 * T + 2, 3 * T + 8, 3 * T - 4, 2 * T, [150, 108, 70], 2); });
    // The stairs up to the bedroom, where the cabinet stood.
    p.paint(7.5, (c, top) => { const X = 13 * T, Y = 4 * T; c.box(X, Y - 6, 2 * T, 3 * T + 6, [150, 108, 70], [80, 56, 40]); for (let k = 0; k < 9; k++) { c.rect(X + 2, Y - 4 + k * 6, 2 * T - 4, 5, mix([236, 214, 170], [176, 134, 90], k / 9)); c.rect(X + 2, Y + 1 + k * 6, 2 * T - 4, 1, [96, 66, 44]); } top.rect(X, Y - 14, 3, 3 * T + 12, [110, 76, 50]); top.rect(X + 2 * T - 3, Y - 14, 3, 3 * T + 12, [110, 76, 50]); top.rect(X, Y - 16, 2 * T, 3, [150, 108, 70]); });
    prop(p, 17, 2, 1, 2, (c, top, X, Y) => bed(c, X, Y, [110, 160, 220]));
    prop(p, 16, 9, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
  },
};

// ---------------------------------------------------------------- Parfum Palace
PLANS.KalosParfumHall = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    p.bare(1); p.bare(2); const yb = back(p, 2); p.block(5, 4, 3, 3);
    p.paint(0, (c) => {
      checker(p, c, [255, 255, 255, 170], [236, 200, 120, 130]);
      wall(c, 2, 0, 23, yb, [250, 240, 214], { panel: [236, 214, 150], top: GOLD, skirt: GOLD });
      for (const x of [3, 9, 16, 19, 22]) { c.box(x * T - 2, 6, 20, 40, GOLD, dk(GOLD, 0.5)); c.rect(x * T + 1, 9, 14, 34, [200, 226, 240]); c.line(x * T + 3, 36, x * T + 12, 12, WHITE, 2); c.ellipse(x * T + 8, 6, 6, 4, GOLD); }
      c.box(12 * T - 8, 4, 3 * T, 60, GOLD, dk(GOLD, 0.5)); c.rect(12 * T - 4, 8, 3 * T - 8, 56, [130, 190, 130]); c.rect(12 * T - 4, 8, 3 * T - 8, 20, [150, 206, 244]); c.rect(13 * T + 7, 8, 2, 56, GOLD); c.ellipse(13 * T + 8, 5, 20, 8, GOLD);
      rug(c, 12, 4, 14, 20, [170, 40, 60]); for (const [x, y] of [[13 * T + 8, 10 * T], [7 * T, 17 * T], [20 * T, 17 * T], [19 * T, 9 * T]]) glow(c, x, y + 20, 34, [255, 240, 180], 16);
      // The stair up to the balcony.
      const X = 5 * T, Y = 4 * T; c.box(X - 2, Y, 3 * T + 4, 4 * T, [226, 220, 230], [120, 110, 130]); for (let k = 0; k < 8; k++) { c.rect(X, Y + 2 + k * 8, 3 * T, 6, mix(WHITE, [200, 196, 214], k / 8)); c.rect(X, Y + 8 + k * 8, 3 * T, 2, [150, 146, 166]); } c.rect(X + 12, Y + 2, 24, 4 * T - 4, [170, 40, 60, 200]);
    });
    p.paint(8, (c, top) => { for (const x of [5 * T - 3, 8 * T]) { top.rect(x, 4 * T - 10, 3, 4 * T + 6, GOLD); top.ellipse(x + 1, 4 * T - 12, 3, 3, GOLD); top.ellipse(x + 1, 8 * T - 4, 3, 3, GOLD); } for (const [x, y] of [[13 * T + 8, 10 * T], [7 * T, 17 * T], [20 * T, 17 * T], [19 * T, 9 * T]]) chandelier(top, x, y); });
    for (const [x, y] of [[10, 6], [16, 6]]) prop(p, x, y, 1, 1, (c, top, X, Y) => statue(c, top, X, Y, GOLD));
    for (const [x, y] of [[4, 10], [21, 10], [4, 18], [21, 18], [10, 13], [16, 13]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [250, 244, 230]));
    prop(p, 18, 13, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [170, 40, 60])); prop(p, 3, 20, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 70, 150]));
    for (const [x, y] of [[2, 4], [23, 4], [2, 21], [23, 21], [9, 4], [17, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [226, 110, 150]));
  },
};
function firework(c, x, y, r, col) { for (let a = 0; a < 14; a++) { const t = a * Math.PI / 7; c.line(x + Math.cos(t) * r * 0.3, y + Math.sin(t) * r * 0.3, x + Math.cos(t) * r, y + Math.sin(t) * r, col); c.p(x + Math.cos(t) * (r + 2), y + Math.sin(t) * (r + 2), WHITE); } c.ellipse(x, y, 2, 2, WHITE); }
PLANS.KalosParfumBalcony = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const yb = back(p, 3);
    p.paint(0, (c) => {
      checker(p, c, [255, 250, 236, 150], [226, 214, 190, 150]);
      for (let y = 0; y < 5 * T; y += 2) c.rect(2 * T, y, 20 * T, 2, mix([14, 16, 50], [60, 50, 110], y / (5 * T)));
      speckle(p, c, 60, 2, 0, 21, 3, 4, (x, y, r) => c.p(x, y, r > 0.5 ? WHITE : [170, 180, 240]));
      firework(c, 6 * T, 22, 16, [250, 130, 170]); firework(c, 12 * T + 8, 30, 22, [250, 220, 110]); firework(c, 18 * T, 18, 14, [130, 220, 250]); firework(c, 9 * T, 46, 9, [150, 240, 170]); firework(c, 16 * T, 48, 10, [226, 150, 250]);
      // The gardens below, and the balustrade.
      for (let x = 2 * T; x < 22 * T; x += 10) c.ellipse(x + 5, 5 * T - 14, 8, 6 + p.hash(x, 1, 2) * 5, [24, 60, 56]); c.rect(2 * T, 5 * T - 12, 20 * T, 12, [24, 60, 56]);
      c.rect(2 * T, 5 * T - 14, 20 * T, 4, [236, 230, 240]); for (let x = 2 * T + 3; x < 22 * T; x += 8) { c.rect(x, 5 * T - 10, 3, 9, [214, 208, 224]); c.rect(x + 3, 5 * T - 10, 5, 9, [40, 60, 80]); } c.rect(2 * T, 5 * T - 2, 20 * T, 3, [176, 170, 190]);
      rug(c, 10, 6, 14, 12, [170, 40, 60]);
    });
    for (const x of [2, 7, 16, 21]) prop(p, x, 5, 1, 1, (c, top, X, Y) => { c.box(X + 1, Y + 4, 14, 11, [226, 220, 230], [120, 110, 130]); top.ellipse(X + 8, Y, 8, 6, [50, 120, 70]); for (const [dx, dy] of [[4, -2], [10, 0], [7, 3]]) top.ellipse(X + dx, Y + dy, 2, 2, [240, 120, 150]); });
    for (const [x, y] of [[2, 15], [21, 15]]) prop(p, x, y, 1, 1, (c, top, X, Y) => statue(c, top, X, Y, GOLD));
    prop(p, 5, 10, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [226, 220, 230])); prop(p, 17, 10, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [226, 220, 230]));
  },
};

// ---------------------------------------------------------------- Professor Sycamore's lab
function labWall(c, x0, x1, yb) { wall(c, x0, 0, x1, yb, [226, 232, 244], { panel: [150, 170, 206], top: [110, 150, 210] }); }
function lift(c, x, y, lamp = [130, 200, 250]) { const X = x * T, Y = y * T; c.box(X - 6, Y - 20, 28, 36, [150, 156, 176], INK); c.rect(X - 3, Y - 16, 22, 32, [200, 206, 222]); c.rect(X + 7, Y - 16, 2, 32, [110, 116, 140]); c.rect(X + 4, Y - 26, 8, 4, lamp); c.rect(X + 22, Y - 4, 3, 5, lamp); }
PLANS.KalosSycamoreLab = {
  theme: { room: "lab", floor: "rLab", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 3);
    p.paint(0, (c) => {
      labWall(c, 2, 21, yb); lift(c, 5, 4); pad(c, 5, 5, [130, 200, 250]);
      for (const [x, col] of [[9, [236, 120, 100]], [12, [110, 190, 120]], [15, [110, 160, 236]]]) picture(c, x * T, 12, 28, 30, { sky: lt(col, 0.6), blob: col }, [90, 100, 130]);
      windowAt(c, 19 * T, 18, 24, 30);
      rug(c, 10, 10, 14, 16, [110, 150, 210], WHITE);
    });
    prop(p, 14, 7, 5, 1, (c, top, X, Y) => { counter(c, X, Y, 80, [150, 170, 206], WHITE); top.box(X + 60, Y - 10, 12, 9, [50, 54, 70], INK); top.rect(X + 62, Y - 8, 8, 5, [110, 200, 240]); c.ellipse(X + 12, Y - 1, 4, 2, [236, 120, 150]); });
    prop(p, 8, 5, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [120, 130, 160], 1)); prop(p, 11, 5, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [120, 130, 160], 4)); prop(p, 20, 5, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16));
    prop(p, 3, 12, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 130, 200])); prop(p, 18, 13, 3, 2, (c, top, X, Y) => { table(c, X, Y, 48, 30, [200, 206, 222]); ball(c, X + 14, Y + 12); ball(c, X + 34, Y + 12, 4, [70, 120, 220]); });
    for (const [x, y] of [[2, 17], [21, 17], [2, 5], [7, 12]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
  },
};
PLANS.KalosSycamoreLab2F = {
  theme: { room: "lab", floor: "rLab", wall: null },
  plan(p) {
    p.bare(0); p.bare(1); const yb = back(p, 3);
    p.paint(0, (c) => {
      labWall(c, 2, 21, yb); lift(c, 18, 4); pad(c, 18, 5, [130, 200, 250]); frame(c, 5 * T - 4, 15 * T - 4, 24, 24, [150, 170, 206], 2); pad(c, 5, 15, [250, 220, 110]);
      for (const x of [4, 8, 12]) { c.box(x * T, 10, 3 * T - 6, 36, [30, 40, 60], [90, 100, 130]); for (let k = 0; k < 5; k++) c.rect(x * T + 4, 16 + k * 6, 10 + (k * 11 + x * 3) % 22, 2, k % 2 ? [110, 220, 200] : [110, 170, 240]); }
      for (let y = 6; y <= 16; y += 5) c.rect(2 * T, y * T + 7, 20 * T, 2, [110, 150, 210, 90]);
    });
    for (const [x, y] of [[3, 8], [15, 8], [3, 12], [15, 12], [9, 15]]) prop(p, x, y, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48));
    for (const x of [3, 6, 9, 13]) prop(p, x, 5, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [120, 130, 160], x));
    prop(p, 20, 5, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16));
    for (const [x, y, col] of [[21, 9, [110, 220, 230]], [21, 11, [236, 150, 110]], [21, 13, [150, 230, 130]], [2, 16, [200, 150, 240]]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, col));
  },
};
PLANS.KalosSycamoreLab3F = {
  theme: { room: "lab", floor: "rLab", wall: null },
  plan(p) {
    p.bare(0); const yb = back(p, 2);
    p.paint(0, (c) => {
      labWall(c, 2, 21, yb);
      // The window onto the garden.
      c.box(8 * T, 6, 8 * T, 42, [150, 206, 244], [90, 100, 130]); c.rect(8 * T + 1, 30, 8 * T - 2, 17, [110, 180, 110]); for (let x = 8 * T + 6; x < 16 * T - 6; x += 14) { c.ellipse(x, 28, 8, 9, [60, 140, 80]); c.ellipse(x - 2, 26, 4, 4, [110, 190, 110]); } for (const x of [10, 12, 14]) c.rect(x * T, 6, 2, 42, [90, 100, 130]);
      rug(c, 8, 8, 16, 14, [200, 80, 80], GOLD);
      frame(c, 18 * T - 4, 17 * T - 4, 24, 24, [150, 170, 206], 2); pad(c, 18, 17, [250, 220, 110]);
    });
    prop(p, 10, 4, 5, 1, (c, top, X, Y) => { desk(c, top, X, Y, 80, [176, 128, 80]); });
    // The three Poké Balls.
    prop(p, 11, 10, 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [226, 220, 230]); ball(c, X + 10, Y + 5); ball(c, X + 24, Y + 5, 4, [70, 120, 220]); ball(c, X + 38, Y + 5, 4, [90, 180, 100]); });
    for (const x of [2, 4, 17, 19]) prop(p, x, 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [150, 108, 70], x));
    prop(p, 3, 15, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 130, 200])); prop(p, 9, 17, 3, 2, (c, top, X, Y) => table(c, X, Y, 48, 30));
    prop(p, 21, 9, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 4, 2, 9, [120, 90, 60]); c.rect(X + 4, Y + 12, 8, 2, [120, 90, 60]); planet(top, X + 8, Y, 6, [90, 150, 220]); });
    for (const [x, y] of [[2, 19], [21, 19], [2, 8], [21, 13]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
  },
};

// ---------------------------------------------------------------- Ambrette: fossil lab and aquarium
function ammonite(c, x, y, r = 5, col = [214, 190, 140]) { c.ellipse(x, y, r, r, dk(col, 0.3)); c.ellipse(x, y, r - 1, r - 1, col); c.ellipse(x + 1, y, r - 3, r - 3, dk(col, 0.3), 1); c.p(x + 1, y, dk(col, 0.4)); }
function bones(c, x, y, s = 1, col = [236, 230, 210]) { c.ellipse(x, y, 9 * s, 6 * s, col); c.poly([[x + 4 * s, y - 3 * s], [x + 18 * s, y - 1 * s], [x + 18 * s, y + 3 * s], [x + 5 * s, y + 5 * s]], col); for (let k = 0; k < 5; k++) c.poly([[x + (6 + k * 2.4) * s, y + 3 * s], [x + (8 + k * 2.4) * s, y + 3 * s], [x + (7 + k * 2.4) * s, y + 7 * s]], WHITE); c.ellipse(x + 2 * s, y - 1 * s, 2 * s, 2 * s, INK); for (let k = 1; k <= 5; k++) { c.ellipse(x - (8 + k * 6) * s, y + 2 * s, 2 * s, 2 * s, col); c.rect(x - (9 + k * 6) * s, y + 3 * s, 2 * s, (9 - k) * s, col); } }
PLANS.KalosFossilLab = {
  theme: { room: "lab", floor: "rLab", wall: null },
  plan(p) {
    const yb = back(p, 3);
    p.paint(0, (c) => {
      wall(c, 2, 0, 21, yb, [214, 200, 170], { brick: [190, 174, 144], top: [150, 120, 90], skirt: [110, 86, 66] });
      c.box(3 * T, 8, 7 * T, 50, [60, 50, 50], [150, 120, 90]); bones(c, 8 * T, 30, 1.6); c.box(14 * T, 8, 7 * T, 50, [60, 50, 50], [150, 120, 90]); bones(c, 19 * T, 34, 1.4, [214, 200, 170]); ammonite(c, 15 * T + 4, 18, 7);
      wash(p, c, [226, 206, 160, 60]); rug(c, 10, 9, 14, 16, [150, 110, 80], [226, 206, 160]);
    });
    // The restoration machine.
    prop(p, 11, 5, 3, 1, (c, top, X, Y) => { machine(c, X, Y, 48, 16, [130, 140, 170], [250, 200, 90]); top.box(X + 14, Y - 26, 20, 18, [200, 230, 244, 150], [90, 100, 130]); ammonite(top, X + 24, Y - 16, 6); });
    const items = [(c, x, y) => ammonite(c, x, y, 6), (c, x, y) => { c.poly([[x - 8, y + 4], [x - 2, y - 7], [x + 2, y + 1], [x + 8, y - 6], [x + 8, y + 4]], [226, 214, 190]); }, (c, x, y) => { c.ellipse(x, y, 7, 5, [240, 180, 70]); c.ellipse(x - 1, y - 1, 3, 2, [250, 226, 150]); c.p(x + 2, y + 1, INK); }, (c, x, y) => { c.ellipse(x, y + 2, 8, 3, [176, 170, 160]); c.poly([[x - 6, y + 1], [x, y - 8], [x + 6, y + 1]], [200, 194, 180]); }];
    [[4, 9], [18, 9], [4, 14], [18, 14]].forEach(([x, y], k) => prop(p, x, y, 2, 1, (c, top, X, Y) => showcase(c, top, X, Y, 32, items[k])));
    for (const x of [3, 6, 16, 19]) prop(p, x, 5, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [150, 120, 90], x));
    for (const [x, y] of [[2, 17], [21, 17], [9, 5], [15, 5]]) p.decor("boulder", x === 2 ? 2 : x === 21 ? 20 : x, y - 2, { optional: true });
  },
};
PLANS.KalosAquarium = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 4);
    p.paint(0, (c) => {
      c.rect(2 * T, 6 * T, 20 * T, 12 * T, [30, 80, 160, 90]);
      tankWall(p, c, 2, 0, 21, yb); door(c, 18, 5, [90, 96, 120], [200, 230, 250]);
      for (let k = 0; k < 5; k++) c.ellipse((4 + k * 4) * T, (8 + (k % 2) * 6) * T, 30, 12, [150, 220, 250, 26]);
      rug(c, 11, 12, 13, 16, [40, 110, 170], [150, 220, 250]);
    });
    // Column tanks.
    [[5, 11, [250, 150, 70]], [16, 11, [236, 110, 130]], [10, 8, [250, 220, 100]]].forEach(([x, y, col]) => prop(p, x, y, 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 26, 16, 6, [0, 0, 0, 60]); c.box(X + 1, Y + 16, 30, 14, [90, 96, 120], INK); c.rect(X + 2, Y - 16, 28, 34, [60, 150, 220, 220]); top.box(X + 1, Y - 22, 30, 7, [90, 96, 120], INK); top.rect(X + 2, Y - 15, 28, 24, [60, 150, 220, 200]); fish(top, X + 11, Y - 6, col, 1, 1); fish(top, X + 21, Y + 2, WHITE, 1, -1); top.rect(X + 5, Y - 13, 3, 20, [255, 255, 255, 110]); top.rect(X + 2, Y - 15, 1, 24, INK); top.rect(X + 29, Y - 15, 1, 24, INK); }));
    prop(p, 3, 16, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [90, 110, 150])); prop(p, 19, 16, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [90, 110, 150]));
    for (const [x, y] of [[2, 6], [21, 6], [14, 6]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [60, 160, 130]));
  },
};

// ---------------------------------------------------------------- Shalour: the Tower of Mastery
function stoneWall(c, x0, x1, yb, tint = [176, 170, 160]) { wall(c, x0, 0, x1, yb, tint, { brick: dk(tint, 0.2), top: lt(tint, 0.4), skirt: dk(tint, 0.45) }); }
PLANS.KalosMastery1F = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 2); p.block(12, 14, 4, 3);
    p.paint(0, (c) => {
      stoneWall(c, 2, 25, yb); for (const x of [4, 8, 19, 23]) windowAt(c, x * T, 16, 18, 34, [150, 206, 244], [200, 194, 180]);
      door(c, 14, 3, [120, 110, 100]); steps(c, 14, 3); steps(c, 14, 4);
      const cx = 14 * T, cy = 14 * T; for (const r of [150, 110, 70]) c.ellipse(cx, cy, r, r * 0.72, [255, 255, 255, 34]); for (const r of [150, 110]) c.ellipse(cx, cy, r, r * 0.72, [110, 104, 120, 160], 2);
      rug(c, 13, 18, 15, 20, [60, 90, 150], GOLD);
      for (const x of [3, 11, 16, 24]) banner(c, x * T + 1, 8, 14, 44, [60, 90, 150], GOLD);
    });
    // The statue of Mega Lucario.
    p.paint(17.5, (c, top) => { const X = 12 * T, Y = 14 * T; c.ellipse(X + 32, Y + 44, 40, 10, [0, 0, 0, 70]); c.box(X, Y + 8, 64, 38, [150, 146, 160], [70, 70, 86]); c.rect(X + 2, Y + 10, 60, 4, [214, 210, 222]); c.box(X + 6, Y - 2, 52, 14, [176, 172, 186], [70, 70, 86]); c.rect(X + 22, Y + 24, 20, 10, [110, 104, 120]); lucario(c, top, X + 32, Y + 4, 1.5); });
    for (const [x, y] of [[5, 7], [22, 7], [5, 13], [22, 13], [5, 19], [22, 19]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [200, 194, 184]));
    for (const [x, y] of [[11, 4], [17, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [110, 190, 250], WHITE));
  },
};
// The floors above: the walkway round the statue's well.
function masteryFloor(n) {
  return {
    theme: { room: "arena", floor: "ruinFloor", wall: null },
    plan(p) {
      p.bare(0); p.bare(1); const yb = back(p, 2); p.block(9, 6, 6, 4);
      p.paint(0, (c) => {
        stoneWall(c, 2, 21, yb); for (const x of [4, 7, 15, 18].slice(0, 2 + (n % 2) * 2)) windowAt(c, x * T, 16, 18, 34, [150, 206, 244], [200, 194, 180]);
        for (let k = 0; k < n; k++) c.rect((19 + (k % 3)) * T + 4, 10 + ((k / 3) | 0) * 10, 8, 6, GOLD);
        door(c, 12, 3, [120, 110, 100]); steps(c, 12, 3); steps(c, 12, 4);
        steps(c, 12, 15, [130, 126, 140]); frame(c, 12 * T - 3, 15 * T - 4, 22, 22, [70, 70, 86], 2);
        const cx = 12 * T, cy = 8 * T; c.ellipse(cx, cy, 130, 86, [255, 255, 255, 30]); c.ellipse(cx, cy, 130, 86, [110, 104, 120, 160], 2);
      });
      p.paint(10.5, (c, top) => {
        const cx = 12 * T, cy = 8 * T, S = [170, 172, 186];
        c.ellipse(cx, cy + 3, 50, 34, [70, 70, 86]); c.ellipse(cx, cy, 50, 32, [200, 196, 210]); c.ellipse(cx, cy, 42, 26, [24, 22, 34]);
        // The part of the statue that passes this floor.
        if (n === 2) for (const s of [-1, 1]) { c.ellipse(cx + s * 14, cy + 6, 10, 7, dk(S, 0.2)); top.box(cx + s * 14 - 8, cy - 30, 16, 36, S, dk(S, 0.5)); top.rect(cx + s * 14 - 6, cy - 28, 4, 32, lt(S, 0.3)); }
        else if (n === 3) { top.box(cx - 20, cy - 34, 40, 42, S, dk(S, 0.5)); top.rect(cx - 17, cy - 32, 8, 38, lt(S, 0.3)); top.poly([[cx - 6, cy - 20], [cx + 6, cy - 20], [cx, cy - 2]], lt(S, 0.4)); }
        else if (n === 4) { top.box(cx - 22, cy - 30, 44, 38, S, dk(S, 0.5)); top.box(cx - 44, cy - 30, 24, 14, S, dk(S, 0.5)); top.box(cx + 20, cy - 30, 24, 14, S, dk(S, 0.5)); top.poly([[cx - 6, cy - 22], [cx + 6, cy - 22], [cx, cy - 6]], lt(S, 0.4)); top.rect(cx - 19, cy - 28, 8, 34, lt(S, 0.3)); }
        else { top.ellipse(cx, cy - 12, 20, 20, S); top.ellipse(cx - 5, cy - 16, 10, 10, lt(S, 0.2)); top.poly([[cx - 16, cy - 22], [cx - 24, cy - 52], [cx - 4, cy - 28]], S); top.poly([[cx + 16, cy - 22], [cx + 24, cy - 52], [cx + 4, cy - 28]], dk(S, 0.2)); top.rect(cx - 6, cy - 8, 18, 10, lt(S, 0.3)); top.rect(cx - 10, cy - 16, 5, 3, INK); top.rect(cx + 5, cy - 16, 5, 3, INK); top.box(cx - 28, cy - 10, 8, 22, dk(S, 0.2), dk(S, 0.5)); top.box(cx + 20, cy - 10, 8, 22, dk(S, 0.2), dk(S, 0.5)); }
        c.ellipse(cx, cy, 50, 32, [120, 116, 132], 3);
      });
      for (const [x, y] of [[3, 6], [20, 6], [3, 15], [20, 15]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [200, 194, 184]));
      for (const [x, y] of [[10, 4], [14, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [110, 190, 250], WHITE));
      if (n % 2) for (const [x, y] of [[2, 10], [21, 10]]) prop(p, x, y, 1, 1, (c, top, X, Y) => statue(c, top, X, Y));
    },
  };
}
for (let n = 2; n <= 5; n++) PLANS["KalosMastery" + n + "F"] = masteryFloor(n);
// The summit: open sky, the sea far below, and the ring where Mega Evolution is taught.
PLANS.KalosMasteryRoof = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    const yb = back(p, 2); p.block(2, 4, 1, 18); p.block(25, 4, 1, 18);
    p.paint(0, (c) => {
      for (let y = 0; y < 4 * T; y += 2) c.rect(0, y, p.W * T, 2, mix([110, 170, 236], [200, 230, 250], y / (4 * T))); for (const [x, y] of [[5, 14], [13, 26], [21, 10], [25, 30]]) { c.ellipse(x * T, y, 30, 7, WHITE); c.ellipse(x * T + 12, y - 5, 16, 6, WHITE); }
      c.rect(2 * T, 4 * T - 16, 24 * T, 10, [60, 130, 200]); for (let x = 2 * T; x < 26 * T; x += 11) c.rect(x, 4 * T - 12 + (x % 3), 6, 1, [170, 220, 250]);
      // Battlements.
      c.rect(2 * T, 4 * T - 6, 24 * T, 6, [150, 146, 160]); for (let x = 2 * T; x < 26 * T; x += 16) c.box(x, 4 * T - 14, 9, 9, [176, 172, 186], [84, 80, 98]);
      for (const x of [2, 25]) { for (let y = 0; y < p.H * T; y += 2) c.rect(x * T + (x === 2 ? -T : 0), y, 2 * T, 2, mix([110, 170, 236], [200, 230, 250], Math.min(1, y / (4 * T)))); c.rect(x * T + (x === 2 ? 10 : 0), 4 * T - 6, 6, 18 * T + 6, [150, 146, 160]); for (let y = 4 * T; y < 22 * T; y += 16) c.box(x * T + (x === 2 ? 8 : -2), y, 10, 9, [176, 172, 186], [84, 80, 98]); }
      const cx = 14 * T, cy = 12 * T + 8; c.ellipse(cx, cy, 150, 104, [255, 255, 255, 40]); c.ellipse(cx, cy, 150, 104, [110, 104, 120, 180], 3); c.ellipse(cx, cy, 96, 66, [90, 150, 230, 60]); c.ellipse(cx, cy, 96, 66, [90, 150, 230, 200], 2);
      // The Mega Evolution mark.
      c.ellipse(cx, cy, 26, 26, [250, 200, 110, 200]); for (const [t, col] of [[0.3, [236, 90, 110]], [2.4, [90, 170, 240]], [4.5, [130, 220, 130]]]) c.poly([[cx, cy], [cx + Math.cos(t) * 30, cy + Math.sin(t) * 30], [cx + Math.cos(t + 1.3) * 22, cy + Math.sin(t + 1.3) * 22]], col); c.ellipse(cx, cy, 8, 8, WHITE);
      exitMat(p, c);
    });
    for (const [x, y] of [[4, 5], [23, 5], [4, 20], [23, 20]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y - 20, 2, 34, [120, 110, 100]); top.poly([[X + 9, Y - 22], [X + 26, Y - 17], [X + 9, Y - 10]], [60, 90, 150]); top.ellipse(X + 8, Y - 23, 2, 2, GOLD); });
    for (const [x, y] of [[9, 4], [18, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [110, 190, 250], WHITE));
  },
};

// ---------------------------------------------------------------- stations
// A platform with the train standing at it; the door of the car is the way aboard.
function station(o) {
  return {
    theme: { room: "arena", floor: "paving", wall: null },
    plan(p) {
      p.bare(1); const yb = back(p, 2), L = p.left, R = p.right, w1 = p.warps[1], ex = p.warps[0];
      p.paint(0, (c) => {
        if (o.wash) wash(p, c, o.wash);
        const X = L * T, W = (R - L + 1) * T, B = (yb + 1) * T;
        o.view(p, c, X, W, B); c.rect(0, 0, X, B, [16, 16, 24]); c.rect(X + W, 0, p.W * T - X - W, B, [16, 16, 24]);
        // The roof's ironwork.
        c.rect(X, 0, W, 4, o.iron); for (let x = X; x < X + W; x += 32) { c.rect(x, 0, 3, B - 16, o.iron); c.line(x, 4, x + 32, 16, A(o.iron, 200)); c.line(x + 32, 4, x, 16, A(o.iron, 200)); }
        // The car.
        const cy = 20, cw = W - (o.nose ? 28 : 12), cx = X + 6;
        c.rect(X, B - 8, W, 8, [60, 60, 72]); c.rect(X, B - 10, W, 2, [150, 150, 166]); for (let x = X + 4; x < X + W; x += 10) c.rect(x, B - 6, 5, 3, [96, 96, 110]);
        c.box(cx, cy, cw, 34, o.body, INK); if (o.nose) { c.poly([[cx + cw - 1, cy], [cx + cw + 20, cy + 22], [cx + cw + 20, cy + 33], [cx + cw - 1, cy + 33]], o.body); c.poly([[cx + cw + 2, cy + 6], [cx + cw + 13, cy + 18], [cx + cw + 2, cy + 18]], [40, 60, 90]); }
        c.rect(cx + 1, cy + 1, cw - 2, 3, lt(o.body, 0.5)); c.rect(cx + 1, cy + 22, cw - 2, 5, o.stripe); c.rect(cx + 1, cy + 28, cw - 2, 1, dk(o.body, 0.3));
        for (let x = cx + 8; x + 16 < cx + cw; x += 22) if (Math.abs(x + 8 - (w1.x * T + 8)) > 22) { c.box(x, cy + 6, 16, 12, [150, 206, 240], dk(o.body, 0.5)); c.rect(x + 2, cy + 8, 4, 8, [220, 240, 252]); }
        c.box(w1.x * T - 4, cy + 4, 24, B - cy - 12, [40, 44, 60], INK); c.rect(w1.x * T, cy + 7, 16, B - cy - 15, [250, 240, 200]); c.rect(w1.x * T - 2, cy + 7, 2, B - cy - 15, lt(o.body, 0.3)); c.rect(w1.x * T + 16, cy + 7, 2, B - cy - 15, lt(o.body, 0.3));
        c.rect(w1.x * T, w1.y * T, T, T, [250, 220, 90, 150]); c.poly([[w1.x * T + 8, w1.y * T + 2], [w1.x * T + 14, w1.y * T + 9], [w1.x * T + 10, w1.y * T + 9], [w1.x * T + 10, w1.y * T + 14], [w1.x * T + 6, w1.y * T + 14], [w1.x * T + 6, w1.y * T + 9], [w1.x * T + 2, w1.y * T + 9]], WHITE);
        // The platform's edge.
        c.rect(X, B, W, 3, [236, 236, 244]); for (let x = X; x < X + W; x += 12) c.rect(x, B + 4, 8, 3, [250, 210, 70]);
        rug(c, ex.x - 1, ex.y - 6, ex.x + 1, ex.y - 1, o.rug, WHITE);
        // The sign.
        c.box((L + 1) * T, B + 12, 4 * T, 0, o.iron, o.iron);
      });
      p.paint(1, (c, top) => { const x = (R - 5) * T; c.box(x, 6, 4 * T, 12, o.sign, INK); for (let k = 0; k < 5; k++) c.rect(x + 5 + k * 11, 10, 7 - (k % 2) * 2, 4, WHITE); c.ellipse((L + 2) * T, 14, 8, 8, INK); c.ellipse((L + 2) * T, 14, 6, 6, WHITE); c.rect((L + 2) * T, 9, 1, 5, INK); c.rect((L + 2) * T, 14, 4, 1, INK); });
      for (const x of [L + 2, R - 3]) prop(p, x, 8, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, o.bench || [150, 108, 70]));
      for (const x of [L + 2, R - 3]) prop(p, x, 13, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, o.bench || [150, 108, 70]));
      // Ticket gates either side of the way out.
      for (const s of [-1, 1]) prop(p, ex.x + (s < 0 ? -3 : 2), ex.y - 3, 2, 1, (c, top, X, Y) => { c.box(X + 1, Y + 2, 30, 13, [176, 180, 196], INK); c.rect(X + 2, Y + 3, 28, 3, WHITE); c.rect(X + (s < 0 ? 24 : 4), Y + 7, 4, 4, [110, 220, 130]); top.box(X + (s < 0 ? 22 : 2), Y - 6, 8, 9, [96, 100, 120], INK); });
      for (const [x, y] of [[L, 4], [R, 4], [L, p.bottom], [R, p.bottom]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
      prop(p, R - 1, 5, 1, 1, (c, top, X, Y) => { c.box(X, Y - 14, 16, 29, o.sign, INK); c.rect(X + 2, Y - 12, 12, 10, [230, 240, 250]); for (let k = 0; k < 3; k++) c.rect(X + 3 + k * 4, Y - 10, 2, 6, [[240, 200, 70], [236, 110, 110], [110, 200, 120]][k]); c.rect(X + 3, Y + 6, 10, 5, [40, 30, 36]); });
    },
  };
}
const seaView = (p, c, X, W, B) => { for (let y = 0; y < B; y += 2) c.rect(X, y, W, 2, y < 22 ? mix([130, 196, 240], [210, 236, 250], y / 22) : mix([70, 150, 220], [40, 110, 190], (y - 22) / (B - 22))); for (let x = X; x < X + W; x += 13) c.rect(x + 3, 26 + (x % 5) * 4, 7, 1, [190, 230, 250]); c.ellipse(X + W * 0.75, 22, 30, 5, [110, 170, 110]); };
const hillView = (p, c, X, W, B) => { for (let y = 0; y < B; y += 2) c.rect(X, y, W, 2, mix([130, 196, 240], [226, 240, 250], y / B)); for (let x = 0; x < W; x += 2) { const h = 22 + Math.sin(x * 0.045) * 10 + Math.sin(x * 0.11 + 1) * 5; c.rect(X + x, B - h - 8, 2, h + 8, [110, 180, 120]); c.rect(X + x, B - h * 0.6, 2, h * 0.6, [70, 150, 90]); } };
const cityView = (p, c, X, W, B) => { for (let y = 0; y < B; y += 2) c.rect(X, y, W, 2, mix([200, 190, 220], [250, 226, 200], y / B)); for (let x = X; x < X + W; x += 11) { const h = 14 + p.hash(x, 2, 8) * 26; c.rect(x, B - 12 - h, 10, h, [150, 140, 170]); c.rect(x + 2, B - 10 - h, 2, 2, [250, 240, 200]); } c.poly([[X + W / 2 - 14, B - 12], [X + W / 2, 2], [X + W / 2 + 14, B - 12]], [110, 104, 140]); };
PLANS.KalosSeasideStation = station({ view: seaView, iron: [90, 110, 150], body: [240, 244, 250], stripe: [70, 150, 220], sign: [70, 130, 200], rug: [70, 130, 200], wash: [200, 230, 250, 60] });
PLANS.KalosHillcrestStation = station({ view: hillView, iron: [110, 96, 80], body: [240, 244, 250], stripe: [90, 170, 100], sign: [80, 150, 96], rug: [80, 150, 96], wash: [226, 240, 200, 60] });
PLANS.KalosLumioseStation = station({ view: cityView, iron: [70, 66, 90], body: [226, 60, 60], stripe: [244, 244, 250], sign: [60, 70, 130], rug: [150, 40, 60], nose: true, wash: [250, 236, 210, 70], bench: [110, 80, 70] });
PLANS.KalosKiloudeStation = station({ view: hillView, iron: [150, 110, 70], body: [226, 60, 60], stripe: [244, 244, 250], sign: [200, 120, 50], rug: [200, 120, 50], nose: true, wash: [250, 226, 170, 80] });

// ---------------------------------------------------------------- Kalos Power Plant
function steelWall(p, c, x0, x1, yb, col = [110, 116, 136], lamp = [250, 210, 70]) {
  wall(c, x0, 0, x1, yb, col, { stripe: dk(col, 0.15), gap: 24, sw: 2, top: lt(col, 0.3), skirt: dk(col, 0.5) });
  for (const y of [8, 16]) { c.rect(x0 * T, y, (x1 - x0 + 1) * T, 5, [170, 130, 80]); c.rect(x0 * T, y, (x1 - x0 + 1) * T, 1, [226, 190, 130]); c.rect(x0 * T, y + 4, (x1 - x0 + 1) * T, 1, [100, 70, 50]); for (let x = x0 * T + 20; x < (x1 + 1) * T; x += 48) c.rect(x, y - 1, 4, 7, [90, 96, 116]); }
  for (let x = x0 * T + 34; x < (x1 + 1) * T - 12; x += 64) { c.ellipse(x, (yb + 1) * T - 18, 7, 7, INK); c.ellipse(x, (yb + 1) * T - 18, 5, 5, WHITE); c.line(x, (yb + 1) * T - 18, x + 3, (yb + 1) * T - 21, [226, 60, 60]); }
  for (let x = x0 * T; x < (x1 + 1) * T; x += 8) c.poly([[x, (yb + 1) * T - 3], [x + 4, (yb + 1) * T - 8], [x + 8, (yb + 1) * T - 8], [x + 4, (yb + 1) * T - 3]], lamp);
}
function hazard(c, X, Y, w, h) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.p(X + x, Y + y, ((x + y) >> 2) & 1 ? INK : [250, 210, 70]); }
function generator(c, top, X, Y, lamp = [250, 210, 70]) {
  c.ellipse(X + 16, Y + 29, 16, 4, [0, 0, 0, 70]); c.box(X + 1, Y + 8, 30, 22, [96, 104, 130], INK); c.rect(X + 2, Y + 9, 28, 3, [150, 158, 184]); for (let k = 0; k < 4; k++) c.rect(X + 5 + k * 6, Y + 16, 3, 10, [50, 54, 72]); c.rect(X + 4, Y + 27, 5, 2, lamp);
  top.box(X + 5, Y - 14, 22, 24, [200, 130, 70], INK); for (let k = 0; k < 5; k++) top.rect(X + 6, Y - 11 + k * 4, 20, 2, [240, 180, 110]); top.ellipse(X + 16, Y - 14, 11, 4, [150, 158, 184]); top.ellipse(X + 16, Y - 15, 7, 2, lt(lamp, 0.3)); top.poly([[X + 17, Y - 9], [X + 12, Y - 1], [X + 16, Y - 1], [X + 14, Y + 6], [X + 21, Y - 3], [X + 17, Y - 3]], lamp);
}
function turbine(c, top, X, Y, lamp = [250, 210, 70]) {
  const cx = X + 24, cy = Y + 22; c.ellipse(cx, Y + 44, 24, 5, [0, 0, 0, 70]); c.box(X + 2, Y + 26, 44, 20, [86, 92, 116], INK); c.rect(X + 3, Y + 27, 42, 3, [150, 158, 184]); c.rect(X + 6, Y + 38, 8, 3, lamp); c.rect(X + 34, Y + 38, 8, 3, [236, 96, 80]);
  top.ellipse(cx, cy, 24, 24, INK); top.ellipse(cx, cy, 22, 22, [130, 138, 164]); top.ellipse(cx, cy, 18, 18, [40, 44, 62]); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3 + 0.3; top.poly([[cx, cy], [cx + Math.cos(t) * 17, cy + Math.sin(t) * 17], [cx + Math.cos(t + 0.5) * 17, cy + Math.sin(t + 0.5) * 17]], [190, 196, 214]); } top.ellipse(cx, cy, 5, 5, lamp); top.ellipse(cx, cy, 22, 22, [200, 206, 226], 2);
}
PLANS.KalosPowerPlantHall = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 2);
    p.paint(0, (c) => {
      steelWall(p, c, 2, 27, yb); hazard(c, 14 * T - 6, 6, 3 * T + 12, 6); door(c, 15, 3, [90, 96, 116], [250, 230, 150]); steps(c, 15, 4, [150, 156, 176]);
      // The marked walkway and the cables under the grating.
      for (const x of [14 * T - 2, 17 * T]) for (let y = 5 * T; y < 27 * T; y += 12) c.rect(x, y, 2, 8, [250, 210, 70]);
      for (const y of [12, 19, 24]) { c.rect(2 * T, y * T - 3, 26 * T, 6, [40, 44, 62, 150]); c.rect(2 * T, y * T - 1, 26 * T, 2, [250, 210, 70, 170]); for (let x = 2 * T; x < 28 * T; x += 16) c.rect(x, y * T - 3, 1, 6, [150, 158, 184]); }
    });
    for (const [x, y] of [[3, 12], [3, 24], [10, 12], [19, 12], [24, 12], [19, 19], [24, 19], [10, 23], [19, 24], [24, 24], [3, 5], [25, 5]]) prop(p, x, y, 2, 2, (c, top, X, Y) => generator(c, top, X, Y));
    for (const [x, y] of [[11, 5], [19, 5]]) prop(p, x, y, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [110, 116, 136], [250, 210, 70]));
    for (const [x, y] of [[2, 27], [3, 27], [27, 27], [26, 27], [27, 9], [2, 9], [12, 17], [13, 17]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 156, 176]));
  },
};
PLANS.KalosPowerPlantCore = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const yb = back(p, 3), YL = [250, 210, 70];
    p.paint(0, (c) => {
      steelWall(p, c, 2, 41, yb, [96, 102, 124]);
      // The generator itself.
      const cx = 22 * T, cy = 40; glow(c, cx, cy, 110, YL, 16); c.box(cx - 104, 6, 208, 70, [70, 76, 100], INK);
      for (const s of [-1, 1]) { c.ellipse(cx + s * 64, cy, 30, 30, INK); c.ellipse(cx + s * 64, cy, 28, 28, [150, 158, 184]); c.ellipse(cx + s * 64, cy, 22, 22, [40, 44, 62]); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; c.poly([[cx + s * 64, cy], [cx + s * 64 + Math.cos(t) * 21, cy + Math.sin(t) * 21], [cx + s * 64 + Math.cos(t + 0.4) * 21, cy + Math.sin(t + 0.4) * 21]], [190, 196, 214]); } c.ellipse(cx + s * 64, cy, 6, 6, YL); }
      c.box(cx - 26, 10, 52, 62, [50, 54, 76], INK); for (let k = 0; k < 7; k++) c.rect(cx - 22, 14 + k * 8, 44, 5, k % 2 ? [250, 226, 130] : YL); c.ellipse(cx, 12, 26, 6, [200, 206, 226]); c.poly([[cx + 4, 22], [cx - 10, 44], [cx - 1, 44], [cx - 6, 64], [cx + 10, 38], [cx + 1, 38]], WHITE);
      // Cables from every turbine to it.
      for (const y of [18, 29]) { c.rect(4 * T, y * T + 6, 35 * T, 4, [40, 44, 62, 190]); c.rect(4 * T, y * T + 7, 35 * T, 2, A(YL, 200)); }
      for (const x of [10, 33]) { c.rect(x * T + 6, 5 * T, 4, 25 * T, [40, 44, 62, 190]); c.rect(x * T + 7, 5 * T, 2, 25 * T, A(YL, 200)); }
      for (let y = 9; y < 32; y += 2) for (const x of [20 * T + 6, 24 * T - 8]) c.rect(x, y * T, 2, 20, A(YL, 220));
      c.ellipse(22 * T, 9 * T + 8, 70, 30, [250, 210, 70, 40]); c.ellipse(22 * T, 9 * T + 8, 70, 30, A(YL, 220), 2);
    });
    for (const [x, y] of [[4, 16], [13, 16], [27, 16], [36, 16], [4, 27], [13, 27], [27, 27], [36, 27], [4, 6], [36, 6]]) prop(p, x, y, 3, 3, (c, top, X, Y) => turbine(c, top, X, Y));
    for (const [x, y] of [[12, 6], [28, 6]]) prop(p, x, y, 3, 1, (c, top, X, Y) => machine(c, X, Y, 48, 16, [96, 102, 124], YL));
    for (const [x, y] of [[2, 35], [3, 35], [41, 35], [40, 35], [2, 22], [41, 22], [18, 35], [26, 35]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 156, 176]));
  },
};

// ---------------------------------------------------------------- Lumiose: Lysandre Café and the Prism Tower lobby
PLANS.KalosLysandreCafe = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const RED = [190, 40, 46];
    p.bare(1); const yb = back(p, 3);
    p.paint(0, (c) => {
      c.rect(2 * T, 5 * T, 20 * T, 13 * T, [200, 30, 40, 130]);
      wall(c, 2, 0, 21, yb, [120, 20, 30], { panel: [80, 14, 22], top: GOLD, stripe: [136, 26, 36], gap: 12 });
      // Bottles behind the bar.
      c.box(3 * T, 8, 8 * T, 44, [60, 12, 20], GOLD); for (let r = 0; r < 3; r++) { c.rect(3 * T + 2, 20 + r * 13, 8 * T - 4, 2, GOLD); for (let x = 3 * T + 5; x < 11 * T - 6; x += 7) { const col = [[236, 200, 110], [110, 190, 130], [226, 110, 110], [200, 210, 240], [150, 100, 60]][(x + r * 3) % 5]; c.rect(x, 12 + r * 13, 4, 8, col); c.rect(x + 1, 9 + r * 13, 2, 3, col); } }
      c.box(12 * T, 10, 4 * T, 36, [226, 60, 60], GOLD); c.ellipse(14 * T, 28, 14, 14, [250, 210, 90]); flame(c, 14 * T, 38, 1.3, [226, 60, 60], [250, 160, 60]);
      // The cupboard that is really a door.
      c.box(17 * T - 2, 12, 3 * T + 4, 4 * T + 4 - 12, [90, 16, 26], GOLD); c.rect(18 * T, 20, T, 60, [30, 8, 14]); c.rect(18 * T + 11, 20, 5, 60, [120, 30, 40]); for (const x of [17 * T + 2, 19 * T + 4]) for (let k = 0; k < 4; k++) c.rect(x, 20 + k * 14, 10, 2, GOLD);
      c.rect(18 * T, 5 * T, T, T, [250, 150, 60, 110]);
      rug(c, 11, 8, 13, 16, [120, 20, 30], GOLD);
    });
    prop(p, 3, 6, 7, 1, (c, top, X, Y) => { counter(c, X, Y, 112, [110, 30, 36], [226, 190, 150]); for (const dx of [14, 50, 86]) { c.rect(X + dx, Y - 5, 5, 6, WHITE); c.rect(X + dx + 5, Y - 3, 2, 2, WHITE); } });
    for (const [x, y] of [[3, 9], [15, 9], [18, 13], [3, 15], [8, 14], [15, 15]]) prop(p, x, y, 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 28, 14, 4, [0, 0, 0, 60]); for (const [dx, dy] of [[1, 12], [23, 12]]) c.box(X + dx, Y + dy, 8, 9, RED, dk(RED, 0.5)); c.ellipse(X + 16, Y + 12, 11, 9, dk(RED, 0.4)); c.ellipse(X + 16, Y + 10, 11, 8, [236, 70, 70]); c.ellipse(X + 16, Y + 10, 7, 5, [250, 110, 100]); c.rect(X + 14, Y + 6, 4, 5, WHITE); c.rect(X + 14, Y + 18, 4, 9, dk(RED, 0.5)); });
    for (const [x, y] of [[2, 17], [21, 17], [21, 6], [11, 5], [16, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [200, 60, 60]));
  },
};
PLANS.KalosPrismLobby = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const YL = [250, 220, 70];
    p.bare(1); const yb = back(p, 2);
    p.paint(0, (c) => {
      c.rect(2 * T, 0, 22 * T, 4 * T, [24, 30, 60]);
      // The tower's lattice.
      for (let x = 2 * T; x < 24 * T; x += 32) { c.line(x, 0, x + 32, 4 * T - 8, [110, 120, 160], 2); c.line(x + 32, 0, x, 4 * T - 8, [110, 120, 160], 2); c.rect(x, 0, 3, 4 * T, [140, 150, 190]); c.ellipse(x + 16, 28, 2, 2, YL); }
      c.rect(2 * T, 0, 22 * T, 3, [140, 150, 190]); c.rect(2 * T, 4 * T - 8, 22 * T, 8, [60, 66, 100]); c.rect(2 * T, 4 * T - 8, 22 * T, 2, YL);
      lift(c, 13, 3, YL); pad(c, 13, 4, YL); circuit(p, c, YL, 31, 2, 5, 23, 19, 26);
      const cx = 13 * T + 8, cy = 12 * T; c.ellipse(cx, cy, 60, 40, [250, 220, 70, 36]); c.ellipse(cx, cy, 60, 40, A(YL, 220), 2); c.poly([[cx, cy - 30], [cx - 12, cy + 22], [cx + 12, cy + 22]], [140, 150, 190]); c.poly([[cx, cy - 26], [cx - 5, cy + 22], [cx + 5, cy + 22]], [24, 30, 60]); c.rect(cx - 9, cy + 6, 18, 2, [140, 150, 190]); c.ellipse(cx, cy - 31, 3, 3, YL);
      rug(c, 12, 16, 14, 18, [60, 70, 130], YL);
    });
    prop(p, 16, 8, 5, 1, (c, top, X, Y) => { counter(c, X, Y, 80, [70, 76, 110], YL); top.box(X + 30, Y - 12, 20, 10, [24, 30, 60], YL); top.rect(X + 33, Y - 9, 14, 2, YL); });
    for (const [x, y] of [[4, 5], [8, 5], [18, 5], [21, 5]]) prop(p, x, y, 2, 1, (c, top, X, Y) => { c.rect(X + 14, Y, 4, 14, [90, 96, 130]); top.box(X, Y - 18, 32, 20, [24, 30, 60], [140, 150, 190]); top.rect(X + 3, Y - 15, 26, 9, [[236, 110, 110], [110, 170, 240], [130, 220, 130], YL][(x >> 1) % 4]); top.rect(X + 3, Y - 4, 18, 2, WHITE); });
    for (const [x, y] of [[2, 19], [23, 19], [2, 5], [23, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, YL));
    for (const [x, y] of [[9, 14], [17, 14], [9, 10], [17, 12]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 2, 2, 12, GOLD); c.ellipse(X + 8, Y + 2, 2, 2, GOLD); c.rect(X + 4, Y + 13, 8, 2, dk(GOLD, 0.3)); });
  },
};

// ---------------------------------------------------------------- Poké Ball Factory
function belt(p, x, y, w, col) {
  prop(p, x, y, w, 1, (c, top, X, Y) => {
    c.ellipse(X + w * 8, Y + 15, w * 8, 3, [0, 0, 0, 60]); c.box(X, Y + 1, w * T, 14, [50, 52, 66], INK); c.rect(X + 1, Y + 2, w * T - 2, 2, [150, 156, 176]); c.rect(X + 1, Y + 12, w * T - 2, 2, [96, 100, 120]);
    for (let k = 4; k < w * T - 4; k += 6) c.rect(X + k, Y + 5, 2, 6, [76, 80, 98]);
    for (let k = 1; k < w - 1; k += 2) ball(c, X + k * T + 8, Y + 7, 4, col);
    top.box(X - 1, Y - 12, 18, 16, [150, 156, 176], INK); top.rect(X + 2, Y - 9, 12, 5, [40, 44, 62]); top.rect(X + 3, Y - 8, 4, 2, [110, 230, 200]); top.box(X + w * T - 17, Y - 12, 18, 16, [200, 130, 70], INK); top.rect(X + w * T - 13, Y - 2, 10, 4, [40, 44, 62]);
  });
}
PLANS.KalosBallFactory = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 2); p.block(35, 4, 3, 2);
    p.paint(0, (c) => {
      steelWall(p, c, 2, 41, yb, [120, 126, 150], [226, 60, 56]);
      c.box(18 * T, 4, 8 * T, 40, [236, 236, 244], INK); ball(c, 19 * T + 6, 24, 12); ball(c, 25 * T - 6, 24, 12, [70, 120, 220]); for (let k = 0; k < 4; k++) c.rect(20 * T + 12 + k * 14, 16, 10, 16, [60, 60, 76]);
      door(c, 36, 3, [90, 96, 116], [250, 230, 150]); c.box(35 * T, 4 * T, 3 * T, 2 * T, [150, 156, 176], INK); for (let k = 0; k < 6; k++) { c.rect(35 * T + 2, 4 * T + 1 + k * 5, 3 * T - 4, 4, mix(WHITE, [150, 156, 176], k / 6)); } steps(c, 36, 6, [176, 180, 200]);
      // Lanes painted on the floor.
      for (const y of [8, 12, 19, 23, 28]) for (let x = 2 * T; x < 42 * T; x += 14) c.rect(x, y * T + 7, 8, 2, [250, 210, 70, 150]);
    });
    p.paint(8, (c, top) => { for (const x of [35 * T - 2, 38 * T - 1]) top.rect(x, 4 * T - 8, 3, 2 * T + 8, [226, 60, 56]); });
    // The dividing wall of presses, with its gate.
    p.paint(15.5, (c, top) => {
      for (let x = 2; x <= 41; x++) if (x !== 22) { const X = x * T, Y = 14 * T; c.rect(X, Y - 14, T, 30, [96, 102, 124]); c.rect(X, Y - 14, T, 3, [176, 180, 200]); c.rect(X, Y + 13, T, 3, [50, 54, 72]); if (x % 4 === 0) { c.box(X + 2, Y - 8, 12, 12, [40, 44, 62], INK); c.rect(X + 4, Y - 6, 8, 3, [110, 230, 200]); } else if (x % 4 === 2) { c.ellipse(X + 8, Y, 6, 6, INK); c.ellipse(X + 8, Y, 4, 4, [200, 206, 226]); } else c.rect(X, Y - 2, T, 4, [170, 130, 80]); }
      for (const x of [21, 23]) hazard(top, x * T + (x === 21 ? 10 : 0), 14 * T - 18, 6, 34);
    });
    belt(p, 4, 6, 14, [226, 60, 56]); belt(p, 4, 10, 14, [70, 120, 220]); belt(p, 24, 10, 10, [250, 210, 70]);
    belt(p, 4, 17, 16, [226, 60, 56]); belt(p, 26, 17, 14, [70, 120, 220]); belt(p, 14, 25, 13, [250, 210, 70]); belt(p, 4, 30, 13, [60, 60, 70]); belt(p, 27, 30, 13, [226, 60, 56]);
    for (const [x, y] of [[20, 5], [20, 9], [28, 5], [36, 21], [36, 26], [3, 22]]) prop(p, x, y, 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 16, 4, [0, 0, 0, 70]); c.box(X + 1, Y + 6, 30, 24, [110, 116, 140], INK); c.rect(X + 2, Y + 7, 28, 3, [176, 180, 200]); c.box(X + 6, Y + 14, 20, 10, [30, 34, 50], INK); ball(c, X + 16, Y + 19, 3); top.box(X + 3, Y - 12, 26, 20, [150, 156, 176], INK); top.rect(X + 12, Y - 10, 8, 16, [200, 206, 226]); top.rect(X + 5, Y - 9, 4, 3, [110, 230, 200]); top.rect(X + 23, Y - 9, 4, 3, [236, 96, 80]); });
    for (const [x, y] of [[2, 12], [3, 12], [40, 12], [41, 12], [2, 33], [3, 33], [41, 33], [40, 33], [41, 16], [18, 21], [19, 21], [24, 5], [25, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { crate(c, X, Y); ball(c, X + 8, Y + 8, 3); });
  },
};
PLANS.KalosFactoryOffice = {
  theme: { room: "arena", floor: "hallFloor", wall: null },
  plan(p) {
    const yb = back(p, 2);
    p.paint(0, (c) => {
      wall(c, 2, 0, 25, yb, [176, 136, 96], { panel: [130, 92, 60], top: GOLD });
      // The window over the factory floor.
      c.box(9 * T, 8, 10 * T, 38, [70, 80, 110], [80, 56, 40]); for (let k = 0; k < 3; k++) { c.rect(9 * T + 4, 18 + k * 9, 10 * T - 8, 4, [40, 44, 62]); for (let x = 9 * T + 10; x < 19 * T - 8; x += 14) ball(c, x + k * 4, 20 + k * 9, 3, [[226, 60, 56], [70, 120, 220], [250, 210, 70]][k]); } for (const x of [12, 16]) c.rect(x * T, 8, 2, 38, [80, 56, 40]);
      for (const [x, col] of [[4, [226, 60, 56]], [22, [150, 80, 190]]]) { c.box(x * T - 4, 10, 40, 34, [250, 244, 230], GOLD); ball(c, x * T + 16, 27, 11, col); }
      rug(c, 10, 8, 18, 17, [150, 40, 50], GOLD);
    });
    prop(p, 11, 4, 6, 1, (c, top, X, Y) => { desk(c, top, X, Y, 96, [150, 100, 60]); ball(c, X + 20, Y + 3, 3, [150, 80, 190]); });
    const cups = [[226, 60, 56], [70, 120, 220], [250, 210, 70], [150, 80, 190]];
    [[3, 4], [6, 4], [20, 4], [23, 4]].forEach(([x, y], k) => prop(p, x, y, 2, 1, (c, top, X, Y) => showcase(c, top, X, Y, 32, (cc, cx, cy) => ball(cc, cx, cy, 5, cups[k]))));
    prop(p, 19, 11, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 110, 160])); prop(p, 19, 15, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 110, 160])); prop(p, 19, 13, 3, 1, (c, top, X, Y) => table(c, X, Y, 48, 16));
    prop(p, 3, 16, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32)); prop(p, 3, 8, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [150, 108, 70], 5));
    for (const [x, y] of [[2, 21], [25, 21], [9, 4], [18, 4], [25, 9]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
  },
};

// ---------------------------------------------------------------- Team Flare: Lysandre Labs and the Geosenge HQ
const FL = [226, 70, 40], FD = [44, 42, 56];
function flareMark(c, cx, cy, r) { c.ellipse(cx, cy, r, r, INK); c.ellipse(cx, cy, r - 1, r - 1, FL); c.ellipse(cx, cy, r - 3, r - 3, WHITE, Math.max(1, r / 7)); const s = r / 10; c.poly([[cx - 3 * s, cy + 6 * s], [cx - 3 * s, cy - 5 * s], [cx + 4 * s, cy - 5 * s], [cx + 4 * s, cy - 2 * s], [cx, cy - 2 * s], [cx, cy], [cx + 3 * s, cy], [cx + 3 * s, cy + 3 * s], [cx, cy + 3 * s], [cx, cy + 6 * s]], WHITE); }
function flareWall(c, x0, x1, yb) { wall(c, x0, 0, x1, yb, [58, 56, 72], { stripe: [48, 46, 62], gap: 20, sw: 2, top: FL, skirt: [30, 28, 40] }); c.rect(x0 * T, (yb + 1) * T - 8, (x1 - x0 + 1) * T, 2, FL); for (let x = x0 * T + 8; x < (x1 + 1) * T - 4; x += 20) c.rect(x, 6, 6, 3, [250, 150, 90]); }
function flareFloor(p, c, y0 = 0) { floors(p, (x, y, X, Y) => { if (y < y0) return; c.rect(X, Y, T, T, [30, 26, 40, 120]); if (x % 4 === 0) c.rect(X, Y, 1, T, [226, 70, 40, 90]); if (y % 4 === 0) c.rect(X, Y, T, 1, [226, 70, 40, 90]); }); }
// A steel bulkhead over a row of solid tiles, with a gate at column `gx`.
function bulkhead(p, y, x0, x1, gx, lamp = FL) {
  p.paint(y + 1.5, (c, top) => {
    for (let x = x0; x <= x1; x++) if (x !== gx) { const X = x * T, Y = y * T; c.rect(X, Y - 14, T, 30, [70, 68, 86]); c.rect(X, Y - 14, T, 3, [130, 128, 150]); c.rect(X, Y + 13, T, 3, [30, 28, 40]); c.rect(X, Y + 2, T, 2, lamp); if (x % 3 === 0) { c.box(X + 3, Y - 9, 10, 8, [30, 28, 40], INK); c.rect(X + 5, Y - 7, 6, 2, lamp); } else c.rect(X + 7, Y - 10, 1, 10, [50, 48, 64]); }
    for (const x of [gx - 1, gx + 1]) top.box(x * T + (x < gx ? 10 : 0), y * T - 22, 6, 38, lamp, INK);
    top.box((gx - 1) * T + 10, y * T - 26, 2 * T + 12 - 16 + T, 6, [70, 68, 86], INK);
  });
}
function columnTank(c, top, X, Y, col, inside) { c.ellipse(X + 16, Y + 26, 16, 6, [0, 0, 0, 60]); c.box(X + 1, Y + 16, 30, 14, [90, 96, 120], INK); c.rect(X + 2, Y - 16, 28, 34, A(col, 220)); top.box(X + 1, Y - 22, 30, 7, [90, 96, 120], INK); top.rect(X + 2, Y - 15, 28, 24, A(col, 200)); if (inside) inside(top, X + 16, Y - 2); top.rect(X + 5, Y - 13, 3, 20, [255, 255, 255, 110]); top.rect(X + 2, Y - 15, 1, 24, INK); top.rect(X + 29, Y - 15, 1, 24, INK); c.rect(X + 5, Y + 22, 4, 3, lt(col, 0.4)); }
const megaStone = (col) => (c, x, y) => { c.ellipse(x, y, 5, 5, col); c.ellipse(x - 1, y - 1, 2, 2, lt(col, 0.6)); c.line(x - 3, y + 2, x + 3, y - 2, dk(col, 0.4)); };
PLANS.KalosLysandreLabs = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    p.bare(1); p.bare(2); p.block(2, 2, 32, 1);
    p.paint(0, (c) => {
      flareFloor(p, c); flareWall(c, 2, 33, 2); door(c, 18, 2, [90, 88, 110], [250, 150, 90]); pad(c, 18, 3, FL); frame(c, 28 * T - 4, 5 * T - 4, 24, 24, [130, 220, 170], 2); pad(c, 28, 5, [130, 220, 170]);
      flareMark(c, 18 * T + 8, 17 * T + 8, 34); c.ellipse(18 * T + 8, 17 * T + 8, 56, 56, A(FL, 200), 2);
      rug(c, 17, 21, 19, 26, [150, 40, 30], WHITE);
    });
    bulkhead(p, 7, 2, 33, 18);
    for (const [x, y, col] of [[4, 11, [110, 220, 230]], [4, 15, [236, 150, 110]], [4, 19, [150, 230, 130]], [31, 11, [200, 150, 240]], [31, 15, [110, 220, 230]], [31, 19, [250, 220, 110]]]) prop(p, x, y, 2, 2, (c, top, X, Y) => columnTank(c, top, X, Y, col, megaStone(lt(col, 0.3))));
    for (const [x, y] of [[9, 13], [24, 13], [9, 20], [24, 20]]) prop(p, x, y, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48, [110, 108, 130], [250, 150, 90]));
    for (const x of [4, 8, 22, 31]) prop(p, x, 4, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [90, 88, 110], [250, 150, 90]));
    prop(p, 6, 22, 1, 2, (c, top, X, Y) => bed(c, X, Y, [226, 70, 40]));
    for (const [x, y] of [[2, 29], [3, 29], [33, 29], [32, 29], [2, 9], [33, 9], [12, 29], [24, 29]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
  },
};
// The spin-pad hall: floor arrows that fling you between rooms.
PLANS.KalosLabsSpinHall = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const pairs = [[3, 4], [5, 6], [7, 8]], OR = [250, 150, 60];
    p.warps.forEach((w) => p.bare(w.k));
    p.paint(0, (c) => {
      behind(p, c, () => {
        voidFill(p, c, [30, 28, 40]); for (let y = 0; y < p.H * T; y += 16) c.rect(0, y, p.W * T, 1, [44, 42, 58]); for (let x = 0; x < p.W * T; x += 32) c.rect(x, 0, 1, p.H * T, [44, 42, 58]);
        // The tracks the pads throw you along.
        for (const [a, b] of pairs) { const A0 = p.warps[a], B0 = p.warps[b], x0 = A0.x * T + 8, y0 = A0.y * T + 8, x1 = B0.x * T + 8, y1 = B0.y * T + 8; c.line(x0, y0, x0, y1, [70, 60, 70], 8); c.line(x0, y1, x1, y1, [70, 60, 70], 8); for (let y = Math.min(y0, y1); y < Math.max(y0, y1); y += 10) c.poly([[x0 - 3, y + 5], [x0, y], [x0 + 3, y + 5]], OR); for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x += 10) c.poly([[x, y1 - 3], [x + 5, y1], [x, y1 + 3]], OR); }
      });
      flareFloor(p, c); ledge(p, c, [20, 18, 28], FL, 6);
      // Arrow tiles.
      floors(p, (x, y, X, Y) => { const h = p.hash(x, y, 9); if (h > 0.1 || p.warps.some((w) => Math.abs(w.x - x) + Math.abs(w.y - y) < 2)) return; const d = Math.floor(p.hash(x, y, 10) * 4); c.box(X + 1, Y + 1, 14, 14, [60, 50, 60], [110, 60, 50]); const P = [[8, 3], [13, 9], [10, 9], [10, 13], [6, 13], [6, 9], [3, 9]].map(([px, py]) => d === 0 ? [px, py] : d === 1 ? [16 - py, px] : d === 2 ? [16 - px, 16 - py] : [py, 16 - px]); c.poly(P.map(([px, py]) => [X + px, Y + py]), OR); });
      for (const [a, b] of pairs) for (const k of [a, b]) { const w = p.warps[k], X = w.x * T + 8, Y = w.y * T + 8; c.ellipse(X, Y, 9, 9, INK); c.ellipse(X, Y, 8, 8, OR); c.ellipse(X, Y, 5, 5, [60, 50, 60]); for (let t = 0; t < 4; t++) { const an = t * Math.PI / 2 + 0.4; c.poly([[X + Math.cos(an) * 7, Y + Math.sin(an) * 7], [X + Math.cos(an + 0.9) * 7, Y + Math.sin(an + 0.9) * 7], [X + Math.cos(an + 0.5) * 3, Y + Math.sin(an + 0.5) * 3]], WHITE); } }
      for (const k of [1, 2]) { const w = p.warps[k]; door(c, w.x, w.y - 1, [90, 88, 110], [250, 150, 90]); pad(c, w.x, w.y, FL); }
      pad(c, p.warps[0].x, p.warps[0].y, [250, 220, 110]);
      flareMark(c, 20 * T, 3 * T + 8, 14);
    });
    for (const [x, y] of [[2, 2], [37, 2], [2, 11], [37, 11], [2, 21], [37, 21], [2, 31], [37, 31], [12, 5], [27, 5], [10, 27], [29, 27]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, [250, 150, 90]));
  },
};
function labWing(east) {
  return {
    theme: { room: "arena", floor: "steel", wall: null },
    plan(p) {
      if (east) p.bare(1); const yb = back(p, 3), cols = [[110, 220, 230], [236, 150, 110], [150, 230, 130], [200, 150, 240], [250, 220, 110]];
      p.paint(0, (c) => {
        flareFloor(p, c); flareWall(c, 2, 37, yb);
        for (const x of [5, 12, 26, 33]) { c.box(x * T - 8, 12, 3 * T, 48, [24, 26, 40], FL); for (let k = 0; k < 6; k++) c.rect(x * T - 4, 18 + k * 7, 8 + (k * 13 + x * 5) % 30, 2, k % 2 ? [250, 150, 90] : [110, 220, 200]); }
        if (east) { door(c, 20, 4, [90, 88, 110], [250, 150, 90]); steps(c, 20, 5, [130, 128, 150]); } else flareMark(c, 20 * T, 2 * T + 8, 26);
        c.ellipse(20 * T, 13 * T + 8, 90, 44, A(FL, 40)); c.ellipse(20 * T, 13 * T + 8, 90, 44, A(FL, 220), 2);
        const w = p.warps[0]; rug(c, Math.min(w.x, 20), 16, Math.max(w.x, 20), 18, [150, 40, 30], WHITE); exitMat(p, c);
      });
      // The great machine in the middle of the wing.
      prop(p, 17, 11, 6, 3, (c, top, X, Y) => { c.ellipse(X + 48, Y + 44, 50, 8, [0, 0, 0, 70]); c.box(X, Y + 10, 96, 36, [90, 88, 110], INK); c.rect(X + 2, Y + 12, 92, 4, [150, 148, 170]); for (let k = 0; k < 8; k++) c.rect(X + 6 + k * 11, Y + 36, 7, 4, k % 2 ? FL : [110, 220, 200]); top.box(X + 28, Y - 30, 40, 44, east ? [130, 220, 170, 210] : [250, 170, 110, 210], INK); (east ? megaStone([130, 240, 190]) : megaStone([250, 120, 90]))(top, X + 48, Y - 8); top.ellipse(X + 48, Y - 8, 12, 12, WHITE, 1); top.box(X + 24, Y - 36, 48, 8, [90, 88, 110], INK); for (const dx of [6, 76]) { top.box(X + dx, Y - 12, 14, 24, [70, 68, 86], INK); top.rect(X + dx + 3, Y - 8, 8, 4, [250, 150, 90]); } });
      [[5, 6], [12, 6], [25, 6], [32, 6]].forEach(([x, y], k) => prop(p, x, y, 2, 2, (c, top, X, Y) => columnTank(c, top, X, Y, cols[(k + (east ? 2 : 0)) % 5], megaStone(WHITE))));
      for (const [x, y] of [[4, 12], [10, 12], [27, 12], [33, 12]]) prop(p, x, y, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48, [110, 108, 130], [250, 150, 90]));
      [4, 8, 12, 16, 23, 27, 31, 35].forEach((x, k) => prop(p, x, 20, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, cols[k % 5])));
      for (const [x, y] of [[2, 31], [3, 31], [37, 31], [36, 31], [2, 5], [37, 5], [14, 27], [15, 27], [24, 28]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
    },
  };
}
PLANS.KalosLabsWest = labWing(false);
PLANS.KalosLabsEast = labWing(true);
// AZ's cell.
PLANS.KalosLabsB2F = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 2);
    p.paint(0, (c) => {
      c.rect(2 * T, 4 * T, 24 * T, 18 * T, [20, 20, 40, 120]);
      wall(c, 2, 0, 25, yb, [70, 68, 86], { brick: [50, 48, 64], top: [110, 108, 130], skirt: [30, 28, 40] });
      for (const x of [6, 21]) { c.box(x * T, 14, 14, 18, [20, 24, 50], [110, 108, 130]); for (let k = 3; k < 14; k += 4) c.rect(x * T + k, 14, 1, 18, [110, 108, 130]); }
      c.box(14 * T - 2, 5 * T - 2, 20, 20, [30, 28, 40], [110, 108, 130]); for (let k = 0; k < 4; k++) c.rect(14 * T + 1, 5 * T + 1 + k * 4, 14, 2, [90, 88, 110]);
      c.ellipse(14 * T + 8, 7 * T + 12, 44, 22, [250, 230, 170, 30]);
      for (const [x, y] of [[5, 6], [9, 8], [20, 7], [22, 5]]) { c.rect(x * T, y * T + 6, 9, 1, [50, 48, 64]); c.rect(x * T + 4, y * T + 3, 1, 8, [50, 48, 64]); }
    });
    // The bars.
    for (const [x0, w] of [[2, 11], [16, 10]]) prop(p, x0, 10, w, 1, (c, top, X, Y) => { c.rect(X, Y + 10, w * T, 5, [70, 68, 86]); c.rect(X, Y + 10, w * T, 1, [130, 128, 150]); for (let x = X + 2; x < X + w * T; x += 6) { c.rect(x, Y - 4, 2, 15, [150, 152, 170]); top.rect(x, Y - 22, 2, 18, [150, 152, 170]); top.p(x, Y - 22, WHITE); } top.rect(X, Y - 24, w * T, 3, [96, 96, 116]); });
    p.paint(11.5, (c, top) => { for (const x of [13 * T - 3, 16 * T]) top.box(x, 10 * T - 26, 4, 42, [96, 96, 116], INK); });
    prop(p, 4, 5, 1, 2, (c, top, X, Y) => bed(c, X, Y, [110, 110, 130]));
    prop(p, 23, 5, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 4, Y + 5, 8, 9, [110, 110, 130], INK); c.ellipse(X + 8, Y + 5, 4, 2, [70, 68, 86]); });
    prop(p, 20, 15, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48, [110, 108, 130], [250, 150, 90]));
    for (const [x, y] of [[2, 12], [25, 12], [2, 21], [25, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y));
    for (const [x, y] of [[4, 17], [5, 17], [4, 18]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
  },
};
// The crystal flower of the ultimate weapon, at pixel (cx, base).
function weapon(c, cx, base, s = 1) {
  const P = [250, 190, 220], W = [255, 240, 250];
  for (const [dx, lean, h] of [[-1, -0.55, 0.8], [1, 0.55, 0.8], [0, 0, 1]]) { const tx = cx + lean * 60 * s, ty = base - h * 70 * s, bx = cx + dx * 10 * s; c.poly([[bx - 9 * s, base], [bx + 9 * s, base], [tx + 5 * s, ty + 18 * s], [tx, ty], [tx - 5 * s, ty + 18 * s]], dk(P, 0.15)); c.poly([[bx - 4 * s, base], [bx + 2 * s, base], [tx, ty + 4 * s]], W); }
  c.ellipse(cx, base, 22 * s, 7 * s, [110, 108, 130]); c.ellipse(cx, base - 2, 18 * s, 5 * s, [70, 68, 86]);
}
PLANS.KalosLabsB3F = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const yb = back(p, 3), RD = [236, 70, 70], BL = [80, 140, 240];
    p.paint(0, (c) => {
      flareFloor(p, c); flareWall(c, 2, 25, yb);
      // The screen: the weapon under Geosenge.
      glow(c, 14 * T, 40, 80, [250, 150, 200], 12); c.box(7 * T, 4, 14 * T, 68, [20, 22, 36], FL); c.rect(7 * T + 3, 7, 14 * T - 6, 62, [40, 30, 60]); c.rect(7 * T + 3, 56, 14 * T - 6, 13, [70, 60, 50]); weapon(c, 14 * T, 58, 0.7);
      for (let k = 0; k < 5; k++) { c.rect(7 * T + 8, 12 + k * 6, 20 + (k * 7) % 14, 2, [250, 150, 90]); c.rect(21 * T - 36, 12 + k * 6, 14 + (k * 5) % 16, 2, [110, 220, 200]); }
      // Cables from the two switches.
      for (const [x, col] of [[8, RD], [20, BL]]) { c.rect(x * T + 7, 5 * T, 2, 6 * T, A(col, 220)); c.ellipse(x * T + 8, 12 * T + 8, 22, 14, A(col, 60)); c.ellipse(x * T + 8, 12 * T + 8, 22, 14, A(col, 230), 2); }
      rug(c, 13, 9, 15, 18, [150, 40, 30], WHITE);
    });
    for (const [x, col] of [[8, RD], [20, BL]]) prop(p, x - 1, 10, 3, 1, (c, top, X, Y) => { c.box(X, Y - 2, 48, 17, [90, 88, 110], INK); c.rect(X + 1, Y - 1, 46, 3, [150, 148, 170]); top.box(X + 14, Y - 14, 20, 13, [30, 28, 40], INK); top.ellipse(X + 24, Y - 8, 7, 5, col); top.ellipse(X + 23, Y - 9, 3, 2, lt(col, 0.6)); for (const dx of [4, 38]) c.rect(X + dx, Y + 6, 6, 3, col); });
    for (const [x, y] of [[3, 5], [23, 5]]) prop(p, x, y, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [90, 88, 110], [250, 150, 90]));
    for (const [x, y] of [[4, 15], [21, 15]]) prop(p, x, y, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48, [110, 108, 130], [250, 150, 90]));
    for (const [x, y] of [[2, 21], [25, 21], [2, 9], [25, 9]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, [250, 150, 200]));
  },
};
PLANS.KalosFlareHQ = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 36, 1);
    p.paint(0, (c) => {
      flareFloor(p, c); flareWall(c, 2, 37, 2); door(c, 20, 2, [90, 88, 110], [250, 150, 90]); pad(c, 20, 3, FL);
      const cx = 20 * T + 8, cy = 18 * T; c.ellipse(cx, cy, 110, 80, A(FL, 36)); c.ellipse(cx, cy, 110, 80, A(FL, 220), 3); flareMark(c, cx, cy, 44);
      rug(c, 19, 24, 21, 28, [150, 40, 30], WHITE); rug(c, 19, 10, 21, 13, [150, 40, 30], WHITE);
      for (const x of [6, 12, 27, 33]) banner(c, x * T, 7 * T + 2, 16, 0, FL);
    });
    bulkhead(p, 6, 2, 37, 20);
    for (const x of [6, 12, 28, 34]) for (const y of [10, 16, 22, 28]) prop(p, x, y, 1, 1, (c, top, X, Y) => { pillar(c, top, X, Y, [110, 108, 130]); c.rect(X + 5, Y - 4, 6, 3, FL); });
    for (const [x, y] of [[8, 8], [30, 8]]) prop(p, x, y, 3, 1, (c, top, X, Y) => machine(c, X, Y, 48, 16, [90, 88, 110], [250, 150, 90]));
    for (const [x, y] of [[3, 13], [3, 19], [3, 25], [36, 13], [36, 19], [36, 25]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, [250, 150, 90]));
    for (const [x, y] of [[2, 31], [3, 31], [2, 30], [37, 31], [36, 31], [37, 30], [9, 4], [10, 4], [30, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
  },
};
PLANS.KalosFlareHall = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 40, 1);
    p.paint(0, (c) => {
      flareFloor(p, c); flareWall(c, 2, 41, 2); door(c, 22, 2, [90, 88, 110], [250, 150, 90]); pad(c, 22, 3, FL);
      rug(c, 21, 4, 23, 33, [150, 40, 30], WHITE); for (const y of [18, 28]) rug(c, 4, y, 39, y, [110, 30, 26], [200, 190, 190]);
      flareMark(c, 22 * T + 8, 18 * T + 8, 30);
    });
    // The numbered cells of the hall.
    [[10, 9], [14, 9], [28, 9], [32, 9], [10, 20], [14, 20], [28, 20], [32, 20], [10, 30], [32, 30]].forEach(([x, y], k) => prop(p, x, y, 3, 2, (c, top, X, Y) => {
      c.ellipse(X + 24, Y + 30, 24, 4, [0, 0, 0, 70]); c.box(X, Y - 2, 48, 32, [70, 68, 86], INK); c.rect(X + 1, Y - 1, 46, 3, [130, 128, 150]); c.box(X + 14, Y + 6, 20, 24, [30, 28, 40], INK); c.rect(X + 16, Y + 8, 16, 22, k % 3 ? [110, 30, 26] : [40, 110, 90]); c.rect(X + 23, Y + 8, 2, 22, INK);
      top.box(X - 1, Y - 16, 50, 16, [90, 88, 110], INK); for (let n = 0; n <= k % 5; n++) top.rect(X + 6 + n * 8, Y - 11, 5, 5, k % 3 ? FL : [110, 230, 200]); c.rect(X + 38, Y + 14, 5, 6, k % 3 ? FL : [110, 230, 200]);
    }));
    for (const [x, y] of [[4, 6], [39, 6], [4, 34], [39, 34], [18, 6], [26, 6]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, [250, 150, 90]));
    for (const [x, y] of [[2, 16], [41, 16], [2, 26], [41, 26], [2, 35], [3, 35], [41, 35]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
  },
};
// The chamber of the ultimate weapon: the crystal flower drinking from the sleeping legend.
PLANS.KalosFlareChamber = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const yb = back(p, 4), PK = [250, 170, 210];
    p.paint(0, (c) => {
      flareFloor(p, c); wall(c, 2, 0, 37, yb, [40, 34, 56], { stripe: [52, 44, 72], gap: 24, sw: 3, top: FL, skirt: [24, 20, 36] });
      const cx = 20 * T + 8; glow(c, cx, 56, 120, PK, 14); for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { c.line(cx + s * 30, 84, cx + s * (90 + k * 50), 20 + k * 14, [90, 88, 110], 5); c.line(cx + s * 30, 84, cx + s * (90 + k * 50), 20 + k * 14, A(PK, 200), 1); }
      weapon(c, cx, 90, 1.2);
      // Conduits across the floor to the legend's dais.
      const dy = 8 * T + 8; for (const s of [-1, 1]) { c.rect(cx + s * 40 - (s > 0 ? 0 : 8 * T), dy - 2, 8 * T, 4, [30, 28, 40]); c.rect(cx + s * 40 - (s > 0 ? 0 : 8 * T), dy - 1, 8 * T, 2, A(PK, 230)); }
      c.rect(cx - 2, 6 * T, 4, 2 * T, A(PK, 230)); for (const r of [56, 40]) c.ellipse(cx, dy, r, r * 0.55, A(PK, 50)); c.ellipse(cx, dy, 56, 31, A(PK, 230), 2); c.ellipse(cx, dy, 40, 22, WHITE, 1);
      for (let a = 0; a < 10; a++) { const t = a * Math.PI / 5; c.line(cx + Math.cos(t) * 40, dy + Math.sin(t) * 22, cx + Math.cos(t) * 55, dy + Math.sin(t) * 30, A(PK, 230)); }
      rug(c, 19, 12, 21, 29, [150, 40, 30], WHITE); flareMark(c, cx, 20 * T, 26); exitMat(p, c);
    });
    for (const [x, y] of [[9, 7], [29, 7]]) prop(p, x, y, 2, 2, (c, top, X, Y) => columnTank(c, top, X, Y, PK, megaStone(WHITE)));
    for (const [x, y] of [[4, 6], [14, 6], [24, 6], [34, 6]]) prop(p, x, y, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [90, 88, 110], PK));
    for (const x of [10, 15, 25, 30]) for (const y of [16, 26]) prop(p, x, y, 1, 1, (c, top, X, Y) => { pillar(c, top, X, Y, [110, 108, 130]); c.rect(X + 5, Y - 4, 6, 3, PK); });
    prop(p, 6, 21, 1, 2, (c, top, X, Y) => bed(c, X, Y, FL));
    for (const [x, y] of [[2, 31], [3, 31], [37, 31], [36, 31], [37, 30], [2, 10], [37, 10]]) prop(p, x, y, 1, 1, (c, top, X, Y) => crate(c, X, Y, [150, 80, 60]));
  },
};
// The hidden floor: Xerosic's Expansion Suit project.
function suitPod(c, top, X, Y, lit) { const G = [130, 230, 150]; columnTank(c, top, X, Y, lit ? [90, 60, 150] : [50, 60, 80], (t, x, y) => { t.ellipse(x, y - 6, 4, 4, lit ? [226, 70, 40] : [110, 110, 130]); t.rect(x - 4, y - 2, 8, 10, lit ? [40, 40, 50] : [90, 90, 110]); t.rect(x - 3, y - 7, 6, 2, lit ? G : [150, 150, 170]); }); }
PLANS.KalosExpansionLab = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const G = [130, 230, 150], V = [150, 100, 230];
    p.bare(1); p.block(2, 2, 38, 1);
    p.paint(0, (c) => {
      floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [30, 20, 60, 120]); if (x % 4 === 0) c.rect(X, Y, 1, T, A(G, 80)); if (y % 4 === 0) c.rect(X, Y, T, 1, A(G, 80)); });
      wall(c, 2, 0, 39, 2, [50, 44, 80], { stripe: [40, 34, 66], gap: 20, top: G, skirt: [24, 20, 44] }); door(c, 21, 2, [80, 70, 120], G); pad(c, 21, 3, G);
      // Laser fences.
      for (const y of [8, 17, 26]) for (const [x0, x1] of [[4, 17], [25, 38]]) { c.rect(x0 * T, y * T + 7, (x1 - x0) * T, 2, A(V, 230)); c.rect(x0 * T, y * T + 5, (x1 - x0) * T, 6, A(V, 50)); }
      rug(c, 20, 4, 22, 30, [60, 40, 110], G);
    });
    for (const y of [8, 17, 26]) for (const x of [3, 17, 25, 38]) prop(p, x, y, 1, 1, (c, top, X, Y) => { c.box(X + 4, Y + 2, 8, 13, [90, 88, 110], INK); top.box(X + 3, Y - 6, 10, 9, [70, 68, 86], INK); top.ellipse(X + 8, Y - 2, 3, 3, V); });
    [[6, 4], [10, 4], [14, 4], [27, 4], [31, 4], [35, 4]].forEach(([x, y], k) => prop(p, x, y, 2, 2, (c, top, X, Y) => suitPod(c, top, X, Y, k % 2 === 0)));
    for (const [x, y] of [[9, 14], [28, 14], [9, 23], [28, 23], [12, 30], [27, 30]]) prop(p, x, y, 3, 1, (c, top, X, Y) => desk(c, top, X, Y, 48, [90, 88, 120], G));
    for (const [x, y] of [[2, 33], [3, 33], [39, 33], [38, 33], [2, 12], [39, 12], [2, 21], [39, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, G));
  },
};
PLANS.KalosExpansionNotes = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const G = [130, 230, 150], yb = back(p, 3);
    p.paint(0, (c) => {
      floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [30, 20, 60, 120]); if (x % 4 === 0) c.rect(X, Y, 1, T, A(G, 80)); if (y % 4 === 0) c.rect(X, Y, T, 1, A(G, 80)); });
      wall(c, 2, 0, 29, yb, [50, 44, 80], { stripe: [40, 34, 66], gap: 20, top: G, skirt: [24, 20, 44] });
      c.box(10 * T, 6, 12 * T, 60, [16, 20, 36], G); c.rect(10 * T + 3, 9, 12 * T - 6, 54, [24, 40, 50]);
      // The suit's blueprint.
      const cx = 16 * T; c.ellipse(cx, 22, 8, 8, G, 1); c.box(cx - 9, 30, 18, 24, [24, 40, 50], G); c.line(cx - 9, 32, cx - 22, 50, G); c.line(cx + 9, 32, cx + 22, 50, G); for (let k = 0; k < 6; k++) { c.rect(10 * T + 8, 14 + k * 8, 26 + (k * 9) % 20, 2, A(G, 200)); c.rect(22 * T - 50, 14 + k * 8, 20 + (k * 7) % 22, 2, A(G, 200)); }
      rug(c, 15, 10, 17, 21, [60, 40, 110], G);
    });
    [5, 10, 15, 20, 25].forEach((x, k) => prop(p, x - 1, 15, 3, 1, (c, top, X, Y) => { table(c, X, Y - 2, 48, 18, [90, 88, 120]); for (const [dx, dy] of [[5, 2], [17, 4], [30, 1]]) { c.box(X + dx, Y + dy, 10, 8, WHITE, [150, 150, 170]); c.rect(X + dx + 2, Y + dy + 2, 6, 1, [110, 110, 130]); c.rect(X + dx + 2, Y + dy + 4, 4, 1, [110, 110, 130]); } top.box(X + 16, Y - 12, 16, 10, [16, 20, 36], G); top.rect(X + 18, Y - 10, 3 + k * 2, 2, G); }));
    for (const [x, y] of [[4, 5], [26, 5]]) prop(p, x, y, 2, 2, (c, top, X, Y) => suitPod(c, top, X, Y, x === 4));
    for (const [x, y] of [[7, 5], [23, 5]]) prop(p, x, y, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [80, 70, 120], G));
    for (const [x, y] of [[2, 23], [29, 23], [2, 10], [29, 10]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, G));
  },
};

// ---------------------------------------------------------------- Lumiose Museum
const ARTS = [{ sky: [150, 200, 240], ground: [110, 170, 100] }, { sky: [250, 210, 150], ground: [200, 110, 80], blob: [250, 240, 200] }, { sky: [40, 50, 100], blob: [250, 240, 190] }, { sky: [226, 220, 200], blob: [200, 80, 80] }, { sky: [170, 220, 200], ground: [60, 120, 150] }, { sky: [240, 230, 250], wings: [230, 130, 170] }, { sky: [60, 80, 60], blob: [240, 200, 90] }, { sky: [200, 226, 250], ground: [236, 236, 244], blob: [110, 150, 220] }];
function museum(n) {
  const tone = [null, [236, 228, 208], [196, 214, 196], [120, 50, 60]][n], carpet = [null, [150, 40, 50], [60, 100, 80], [70, 60, 120]][n];
  return {
    theme: { room: "arena", floor: "hallFloor", wall: null },
    plan(p) {
      p.warps.forEach((w) => { if (!w.exit) p.bare(w.k); }); p.block(2, 2, 28, 1);
      const up = p.warps[1];
      p.paint(0, (c) => {
        wall(c, 2, 0, 29, 2, tone, { panel: dk(tone, 0.25), top: GOLD });
        const xs = n === 3 ? [3, 7, 23, 27] : up ? [3, 7, 11, 20, 24, 28] : [3, 7, 11, 15, 20, 24, 28];
        xs.forEach((x, k) => picture(c, x * T - 6, 6, 30, 26, ARTS[(k + n * 3) % ARTS.length], GOLD));
        if (up) { door(c, 16, 2, [110, 96, 80]); steps(c, 16, 2); steps(c, 16, 3); }
        if (n === 3) { c.box(12 * T, 2, 8 * T + 8, 40, GOLD, dk(GOLD, 0.5)); c.rect(12 * T + 4, 6, 8 * T, 32, [60, 80, 110]); c.rect(12 * T + 4, 26, 8 * T, 12, [70, 110, 80]); c.ellipse(16 * T + 4, 20, 20, 10, [226, 220, 200]); c.poly([[14 * T, 6], [15 * T, 22], [14 * T + 8, 38], [15 * T + 4, 38], [16 * T - 6, 22], [14 * T + 10, 6]], tone); c.line(18 * T, 8, 19 * T, 34, dk(tone, 0.3), 2); }
        rug(c, 15, 4, 17, 23, carpet, GOLD); for (const y of [11, 17]) rug(c, 4, y, 27, y, carpet, GOLD);
      });
      // Standing gallery walls.
      [[7, 8], [21, 8], [6, 14], [22, 14], [8, 20], [20, 20]].forEach(([x, y], k) => prop(p, x, y, 4, 1, (c, top, X, Y) => {
        c.ellipse(X + 32, Y + 14, 32, 3, [0, 0, 0, 50]); c.box(X, Y + 2, 64, 13, dk(tone, 0.2), dk(tone, 0.6)); top.box(X, Y - 20, 64, 23, lt(tone, 0.2), dk(tone, 0.6));
        picture(top, X + 4, Y - 17, 26, 18, ARTS[(k * 2 + n) % ARTS.length], GOLD); picture(top, X + 34, Y - 17, 26, 18, ARTS[(k * 2 + n + 5) % ARTS.length], GOLD);
      }));
      const things = [(c, x, y) => crystal(c, x, y + 6, [130, 200, 240], 0.8), (c, x, y) => { c.ellipse(x, y, 5, 6, [226, 200, 150]); c.rect(x - 3, y - 8, 6, 3, [150, 110, 70]); }, (c, x, y) => megaStone([240, 130, 110])(c, x, y), (c, x, y) => ammonite(c, x, y, 6)];
      [[13, 9], [18, 9], [13, 21], [18, 21]].forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => (n === 2 ? showcase(c, top, X, Y, 16, things[k]) : statue(c, top, X, Y, n === 3 ? GOLD : [200, 198, 210]))));
      prop(p, 3, 23, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32)); prop(p, 27, 23, 2, 1, (c, top, X, Y) => bench(c, X, Y, 32));
      for (const [x, y] of [[2, 3], [29, 3], [2, 25], [29, 25]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
      // Rope posts.
      for (const [x, y] of n === 3 ? [[13, 5], [15, 5], [17, 5], [19, 5]] : [[12, 12], [19, 12], [12, 16], [19, 16]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 2, 2, 12, GOLD); c.ellipse(X + 8, Y + 2, 2, 2, GOLD); c.rect(X + 4, Y + 13, 8, 2, dk(GOLD, 0.3)); if (n === 3) c.rect(X + 9, Y + 5, 23, 2, [150, 40, 50]); });
    },
  };
}
for (let n = 1; n <= 3; n++) PLANS["KalosMuseum" + n + "F"] = museum(n);

// ---------------------------------------------------------------- Hotel Richissime
function nightWindow(p, c, x, y, w, h) { c.box(x, y, w, h, [24, 28, 66], GOLD); for (let k = x + 2; k < x + w - 4; k += 6) { const hh = 6 + p.hash(k, y, 3) * (h - 16); c.rect(k, y + h - 2 - hh, 5, hh, [44, 48, 90]); if (p.hash(k, y, 4) < 0.7) c.rect(k + 1, y + h - hh, 2, 2, [250, 226, 130]); } c.rect(x + w / 2, y, 1, h, GOLD); }
PLANS.KalosRichissimeLobby = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    p.bare(1); p.bare(2); p.block(2, 2, 28, 1); p.block(23, 3, 3, 2);
    p.paint(0, (c) => {
      checker(p, c, [255, 250, 236, 170], [226, 196, 150, 150]);
      wall(c, 2, 0, 29, 2, [250, 240, 214], { panel: [176, 128, 80], top: GOLD });
      lift(c, 16, 2, GOLD); pad(c, 16, 3, GOLD); for (const x of [12, 19]) lift(c, x, 2, GOLD);
      // The key rack behind the desk.
      c.box(5 * T, 6, 7 * T, 28, [120, 80, 56], GOLD); for (let r = 0; r < 3; r++) for (let x = 5 * T + 5; x < 12 * T - 6; x += 9) { c.rect(x, 10 + r * 8, 5, 5, [80, 50, 36]); if ((x + r) % 3) c.rect(x + 2, 11 + r * 8, 1, 3, GOLD); }
      for (const x of [24, 27]) picture(c, x * T - 8, 6, 28, 24, ARTS[x % 8], GOLD);
      rug(c, 15, 4, 17, 24, [150, 40, 50], GOLD); c.ellipse(16 * T + 8, 14 * T + 8, 70, 44, [150, 40, 50, 200]); c.ellipse(16 * T + 8, 14 * T + 8, 70, 44, GOLD, 2); c.ellipse(16 * T + 8, 14 * T + 8, 40, 24, A(GOLD, 200), 1); exitMat(p, c);
      for (const [x, y] of [[9 * T, 13 * T], [24 * T, 13 * T], [16 * T + 8, 20 * T]]) glow(c, x, y + 16, 34, [255, 240, 180], 14);
    });
    // The staff door.
    p.paint(5.5, (c, top) => { c.box(23 * T, 3 * T - 14, 3 * T, 2 * T + 14, [236, 224, 196], [120, 80, 56]); c.rect(23 * T + 1, 3 * T - 13, 3 * T - 2, 3, GOLD); door(c, 24, 4, [120, 80, 56]); c.rect(24 * T + 3, 4 * T - 4, 10, 3, GOLD); });
    p.paint(30, (c, top) => { for (const [x, y] of [[9 * T, 13 * T], [24 * T, 13 * T], [16 * T + 8, 20 * T]]) chandelier(top, x, y); });
    prop(p, 5, 6, 6, 1, (c, top, X, Y) => { counter(c, X, Y, 96, [150, 100, 60], [250, 240, 214]); c.ellipse(X + 80, Y - 2, 4, 2, GOLD); c.rect(X + 79, Y - 6, 2, 3, GOLD); c.box(X + 8, Y - 3, 12, 5, WHITE, [150, 150, 170]); });
    for (const [x, y] of [[9, 16], [21, 16]]) { prop(p, x, y, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [170, 40, 60])); prop(p, x, y + 2, 3, 1, (c, top, X, Y) => table(c, X, Y, 48, 16, [110, 76, 50])); }
    for (const [x, y] of [[5, 13], [27, 13], [5, 21], [27, 21], [12, 9], [20, 9]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [250, 244, 230]));
    for (const [x, y] of [[2, 3], [29, 3], [2, 25], [29, 25], [14, 3], [18, 3]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
    // A luggage trolley.
    prop(p, 12, 23, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 1, Y + 9, 14, 4, GOLD, dk(GOLD, 0.5)); c.box(X + 3, Y + 3, 10, 6, [110, 76, 50], INK); top.box(X + 4, Y - 3, 8, 6, [170, 40, 60], INK); top.rect(X + 1, Y - 10, 1, 20, GOLD); top.rect(X + 14, Y - 10, 1, 20, GOLD); top.rect(X + 1, Y - 10, 14, 1, GOLD); });
  },
};
PLANS.KalosRichissimeSuite = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const yb = back(p, 2);
    p.paint(0, (c) => {
      c.rect(2 * T, 4 * T, 28 * T, 22 * T, [250, 230, 200, 60]);
      wall(c, 2, 0, 29, yb, [120, 40, 60], { panel: [90, 56, 44], top: GOLD, stripe: [136, 50, 70], gap: 12 });
      for (const x of [9, 14, 19]) nightWindow(p, c, x * T, 8, 4 * T - 8, 40); for (const x of [4, 26]) picture(c, x * T - 8, 12, 34, 28, ARTS[x % 8], GOLD);
      rug(c, 12, 7, 20, 13, [90, 40, 110], GOLD); rug(c, 15, 15, 17, 23, [150, 40, 50], GOLD); exitMat(p, c);
    });
    // The canopy bed.
    prop(p, 4, 5, 3, 3, (c, top, X, Y) => { c.ellipse(X + 24, Y + 46, 26, 4, [0, 0, 0, 60]); c.box(X, Y - 2, 48, 48, [236, 236, 240], [90, 70, 60]); c.box(X + 5, Y + 2, 16, 8, WHITE, [170, 170, 190]); c.box(X + 27, Y + 2, 16, 8, WHITE, [170, 170, 190]); c.box(X, Y + 14, 48, 32, [150, 40, 70], [90, 20, 40]); frame(c, X + 4, Y + 18, 40, 24, GOLD); for (const dx of [0, 44]) { c.rect(X + dx, Y + 30, 4, 18, GOLD); top.rect(X + dx, Y - 26, 4, 56, GOLD); } top.box(X - 2, Y - 30, 52, 8, [150, 40, 70], GOLD); for (let k = 0; k < 48; k += 6) top.poly([[X + k, Y - 22], [X + k + 6, Y - 22], [X + k + 3, Y - 16]], [150, 40, 70]); });
    // The piano.
    prop(p, 24, 5, 3, 2, (c, top, X, Y) => { c.ellipse(X + 24, Y + 30, 24, 4, [0, 0, 0, 60]); c.box(X, Y - 6, 48, 30, [30, 28, 36], INK); c.poly([[X + 2, Y - 4], [X + 46, Y - 4], [X + 46, Y + 8], [X + 20, Y + 14], [X + 2, Y + 10]], [60, 56, 70]); c.rect(X + 2, Y + 16, 44, 6, WHITE); for (let k = 4; k < 46; k += 4) c.rect(X + k, Y + 16, 1, 6, INK); for (let k = 5; k < 44; k += 8) c.rect(X + k, Y + 16, 3, 3, INK); c.box(X + 16, Y + 26, 16, 5, [110, 40, 50], INK); });
    prop(p, 21, 14, 5, 2, (c, top, X, Y) => { teaTable(c, X, Y, 80, 30, WHITE); for (const dx of [20, 58]) { top.rect(X + dx, Y - 4, 2, 10, GOLD); flame(top, X + dx + 1, Y - 4, 0.4); } });
    prop(p, 5, 14, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 40, 110])); prop(p, 5, 18, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 40, 110])); prop(p, 5, 16, 3, 1, (c, top, X, Y) => table(c, X, Y, 48, 16, [110, 76, 50]));
    prop(p, 9, 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [110, 76, 50], 3)); prop(p, 19, 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [110, 76, 50], 6));
    for (const [x, y] of [[2, 4], [29, 4], [2, 25], [29, 25], [12, 4], [22, 22]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [226, 110, 150]));
    for (const [x, y] of [[13, 16], [19, 16]]) prop(p, x, y, 1, 1, (c, top, X, Y) => statue(c, top, X, Y, GOLD));
  },
};

// ---------------------------------------------------------------- Kiloude: the Battle Maison
PLANS.KalosBattleMaison = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const yb = back(p, 3), kinds = [[6, [226, 70, 70]], [12, [80, 140, 236]], [18, [110, 200, 120]], [24, [250, 210, 80]], [30, [170, 110, 226]]];
    p.paint(0, (c) => {
      checker(p, c, [255, 255, 255, 150], [190, 214, 244, 150]);
      wall(c, 2, 0, 33, yb, [236, 240, 250], { panel: [170, 190, 226], top: GOLD, skirt: [110, 130, 180] });
      // The five battle halls' doors.
      kinds.forEach(([x, col], k) => { const X = x * T; c.box(X - 12, 14, 40, 5 * T - 14, GOLD, dk(GOLD, 0.5)); c.rect(X - 9, 18, 34, 5 * T - 18, dk(col, 0.25)); c.rect(X - 6, 22, 13, 5 * T - 22, col); c.rect(X + 9, 22, 13, 5 * T - 22, col); c.ellipse(X + 8, 12, 14, 9, GOLD); c.ellipse(X + 8, 12, 10, 6, col); for (let n = 0; n <= Math.min(k, 2); n++) ball(c, X + 8 + (n - Math.min(k, 2) / 2) * 8, 40, 3, k === 3 ? [250, 250, 250] : [226, 60, 56]); rug(c, x - 1, 5, x + 1, 8, dk(col, 0.15), GOLD); });
      for (const x of [3, 9, 15, 21, 27, 33]) c.box(x * T - 2, 30, 6, 5 * T - 30, [250, 250, 255], [150, 160, 200]);
      // Plinth marks for the monuments.
      kinds.forEach(([x, col]) => { c.ellipse(x * T + 8, 20 * T + 10, 20, 11, [150, 160, 200]); c.ellipse(x * T + 8, 20 * T + 8, 20, 11, [236, 240, 250]); c.ellipse(x * T + 8, 20 * T + 8, 20, 11, col, 2); });
      rug(c, 14, 12, 22, 17, [70, 110, 190], GOLD); rug(c, 17, 22, 19, 24, [70, 110, 190], GOLD); exitMat(p, c);
      for (const [x, y] of [[9 * T, 14 * T], [27 * T + 8, 14 * T]]) glow(c, x, y + 16, 34, [255, 240, 180], 14);
    });
    p.paint(30, (c, top) => { for (const [x, y] of [[9 * T, 14 * T], [27 * T + 8, 14 * T], [18 * T + 8, 13 * T]]) chandelier(top, x, y); });
    // Podiums between the receptionists, and the exchange counters.
    for (const x of [3, 9, 15, 21, 27, 33]) prop(p, x, 7, 1, 1, (c, top, X, Y) => { counter(c, X, Y, 16, [150, 170, 210], WHITE); top.ellipse(X + 8, Y - 6, 4, 4, [236, 120, 150]); top.rect(X + 7, Y - 3, 2, 4, [70, 150, 80]); });
    for (const x of [8, 28]) prop(p, x - 1, 10, 3, 1, (c, top, X, Y) => (x === 8 ? shelf(c, X, Y, 48, [120, 140, 190], 2) : machine(c, X, Y, 48, 16, [150, 170, 210], [110, 200, 240])));
    for (const [x, y] of [[4, 15], [31, 15], [4, 23], [31, 23]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [250, 250, 255]));
    for (const [x, y] of [[9, 23], [24, 23]]) prop(p, x, y, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [70, 110, 190]));
    for (const [x, y] of [[2, 25], [33, 25], [2, 12], [33, 12], [15, 25], [21, 25]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
  },
};

// ---------------------------------------------------------------- Route 7: the Battle Chateau
function armour(c, top, X, Y) { shadow(c, X, Y); c.box(X + 3, Y + 8, 10, 7, [110, 104, 120], INK); c.rect(X + 5, Y + 2, 2, 7, [150, 156, 176]); c.rect(X + 9, Y + 2, 2, 7, [150, 156, 176]); top.box(X + 3, Y - 10, 10, 13, [176, 182, 204], INK); top.rect(X + 5, Y - 8, 2, 9, WHITE); top.ellipse(X + 8, Y - 13, 4, 5, [176, 182, 204]); top.rect(X + 5, Y - 13, 6, 1, INK); top.poly([[X + 8, Y - 22], [X + 6, Y - 17], [X + 10, Y - 17]], [200, 60, 70]); top.rect(X + 14, Y - 18, 1, 30, [214, 220, 236]); top.poly([[X + 12, Y - 18], [X + 17, Y - 18], [X + 14, Y - 23]], [214, 220, 236]); }
function manorWall(p, c, x0, x1, yb, seed) {
  wall(c, x0, 0, x1, yb, [150, 60, 70], { panel: [110, 76, 50], top: GOLD, stripe: [164, 72, 82], gap: 10, sw: 3 });
  const H = (yb + 1) * T; for (let x = x0 + 2, k = seed; x + 2 <= x1 - 1; x += 5, k++) { if (k % 3 === 2) windowAt(c, x * T, H > 40 ? 16 : 8, 22, H - (H > 40 ? 32 : 18), [150, 200, 240], GOLD); else { c.box(x * T - 2, 6, 26, H - 22, GOLD, dk(GOLD, 0.5)); c.rect(x * T + 1, 9, 20, H - 28, [[60, 70, 100], [90, 60, 50], [50, 80, 70]][k % 3]); c.ellipse(x * T + 11, 9 + (H - 28) * 0.38, 5, 5, SKIN); c.rect(x * T + 5, 9 + (H - 28) * 0.55, 12, (H - 28) * 0.45, [[150, 40, 50], [40, 60, 120], [90, 50, 110]][(k + seed) % 3]); } }
}
PLANS.KalosBattleChateau = {
  theme: { room: "arena", floor: "hallFloor", wall: null },
  plan(p) {
    p.bare(1); const yb = back(p, 2);
    p.paint(0, (c) => {
      manorWall(p, c, 2, 35, yb, 0);
      // The stair to the salon.
      c.box(17 * T, 4, 5 * T, 4 * T - 4, [110, 76, 50], GOLD); c.rect(18 * T, 14, 3 * T, 4 * T - 14, [40, 28, 30]); for (let k = 0; k < 6; k++) { c.rect(18 * T, 20 + k * 7, 3 * T, 5, mix([226, 214, 190], [150, 130, 110], 1 - k / 6)); c.rect(18 * T + 14, 20 + k * 7, 20, 5, [170, 40, 60]); } steps(c, 19, 4, [226, 214, 190]); c.rect(19 * T + 2, 4 * T, 12, T, [170, 40, 60, 200]);
      rug(c, 18, 5, 20, 26, [170, 40, 60], GOLD); rug(c, 7, 18, 31, 19, [170, 40, 60], GOLD); exitMat(p, c);
      for (const [x, y] of [[9 * T, 11 * T], [29 * T, 11 * T], [19 * T + 8, 15 * T], [9 * T, 23 * T], [29 * T, 23 * T]]) glow(c, x, y + 16, 34, [255, 240, 180], 14);
    });
    p.paint(40, (c, top) => { for (const [x, y] of [[9 * T, 11 * T], [29 * T, 11 * T], [19 * T + 8, 15 * T], [9 * T, 23 * T], [29 * T, 23 * T]]) chandelier(top, x, y); });
    // Where the cabinets stood: marble columns.
    p.paint(6.5, (c, top) => { for (const x of [4, 32]) { c.rect(x * T, 4 * T, T, 2 * T, [200, 176, 140]); c.box(x * T + 1, 4 * T - 8, 14, 2 * T + 6, [236, 230, 240], [120, 110, 130]); c.rect(x * T + 4, 4 * T - 6, 3, 2 * T + 2, WHITE); c.box(x * T - 1, 5 * T + 10, 18, 6, [214, 208, 224], [120, 110, 130]); top.box(x * T - 1, 4 * T - 14, 18, 7, [236, 230, 240], [120, 110, 130]); } });
    for (const x of [8, 28]) prop(p, x, 15, 3, 1, (c, top, X, Y) => { counter(c, X, Y, 48, [110, 76, 50], [226, 200, 150]); top.box(X + 30, Y - 10, 12, 9, [236, 226, 200], [120, 90, 60]); top.rect(X + 32, Y - 8, 8, 1, [120, 90, 60]); top.rect(X + 32, Y - 5, 6, 1, [120, 90, 60]); c.ellipse(X + 10, Y - 1, 3, 2, GOLD); });
    prop(p, 17, 10, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 5, Y + 2, 6, 13, [110, 76, 50], INK); top.box(X + 1, Y - 6, 14, 9, [150, 108, 70], INK); top.rect(X + 3, Y - 4, 10, 5, WHITE); });
    for (const [x, y] of [[7, 5], [12, 5], [26, 5], [31, 5], [3, 12], [34, 12], [3, 22], [34, 22]]) prop(p, x, y, 1, 1, (c, top, X, Y) => armour(c, top, X, Y));
    for (const [x, y] of [[11, 22], [24, 22]]) { prop(p, x, y, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 60, 130])); prop(p, x, y + 2, 3, 1, (c, top, X, Y) => table(c, X, Y, 48, 16, [110, 76, 50])); }
    for (const [x, y] of [[2, 27], [35, 27], [15, 5], [23, 5], [2, 6], [35, 6]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [226, 110, 150]));
  },
};
PLANS.KalosChateauSalon = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    p.paint(0, (c) => {
      c.rect(2 * T, 2 * T, 40 * T, 32 * T, [250, 226, 180, 70]);
      manorWall(p, c, 2, 41, 1, 1);
      for (const [y0, y1, col] of [[11, 16, [150, 40, 60]], [20, 25, [60, 60, 130]]]) { rug(c, 10, y0, 33, y1, col, GOLD); court(c, 11, y0, 32, y1, GOLD, GOLD); }
      rug(c, 21, 27, 23, 30, [150, 40, 60], GOLD);
      for (const [x, y] of [[12, 13], [32, 13], [22, 18], [12, 23], [32, 23]]) glow(c, x * T, y * T + 16, 36, [255, 240, 180], 14);
    });
    p.paint(40, (c, top) => { for (const [x, y] of [[12, 13], [32, 13], [22, 18], [12, 23], [32, 23], [22, 7]]) chandelier(top, x * T, y * T); });
    // Where the cabinets stood: the buffet and the trophy case.
    p.paint(5.5, (c, top) => { const X = 4 * T, Y = 3 * T; c.rect(X, Y - 6, 5 * T, 2 * T + 6, [176, 128, 80]); c.box(X, Y - 4, 5 * T, 2 * T + 3, WHITE, [150, 150, 170]); frame(c, X + 3, Y - 1, 5 * T - 6, 2 * T - 4, GOLD); for (let k = 0; k < 5; k++) { const x = X + 9 + k * 15; c.ellipse(x, Y + 10, 6, 4, [226, 226, 236]); c.ellipse(x, Y + 9, 4, 2, [[226, 110, 90], [250, 210, 110], [130, 190, 110], [240, 170, 190], [170, 110, 70]][k]); } for (const dx of [20, 58]) { top.rect(X + dx, Y - 12, 2, 10, GOLD); flame(top, X + dx + 1, Y - 12, 0.4); } });
    p.paint(7.5, (c, top) => { const X = 35 * T, Y = 4 * T; c.rect(X, Y - 6, 2 * T, 3 * T + 6, [176, 128, 80]); c.box(X, Y - 14, 2 * T, 3 * T + 13, [110, 76, 50], [60, 40, 30]); for (let r = 0; r < 3; r++) { c.rect(X + 3, Y - 10 + r * 19, 2 * T - 6, 15, [200, 226, 240]); c.ellipse(X + 10, Y - 1 + r * 19, 3, 4, GOLD); c.ellipse(X + 22, Y - 1 + r * 19, 3, 4, r % 2 ? [200, 206, 226] : GOLD); c.rect(X + 3, Y + 4 + r * 19, 2 * T - 6, 1, [60, 40, 30]); } });
    for (const x of [4, 39]) for (const y of [8, 15, 22, 29]) prop(p, x, y, 1, 1, (c, top, X, Y) => (y % 2 ? armour(c, top, X, Y) : pillar(c, top, X, Y, [236, 230, 240])));
    for (const [x, y] of [[10, 31], [15, 31], [26, 31], [31, 31]]) prop(p, x, y, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [150, 40, 60]));
    for (const [x, y] of [[12, 4], [20, 4], [28, 4]]) prop(p, x, y, 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, WHITE));
    for (const [x, y] of [[2, 2], [41, 2], [2, 33], [41, 33], [9, 6], [38, 4], [19, 33], [25, 33]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y, [226, 110, 150]));
  },
};

// ---------------------------------------------------------------- Camphrier: Shabboneau Castle, and the Scary House
PLANS.KalosShabboneauCastle = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 20, 1);
    p.paint(0, (c) => {
      stoneWall(c, 2, 21, 2, [160, 156, 150]); for (const x of [4, 8, 15, 19]) banner(c, x * T + 1, 6, 14, 34, x % 2 ? [150, 40, 50] : [60, 80, 140], GOLD);
      door(c, 12, 2, [110, 96, 80]); steps(c, 12, 2); steps(c, 12, 3);
      rug(c, 11, 4, 13, 16, [130, 50, 56], [200, 180, 130]);
      // Pale patches where the furniture used to be.
      for (const [x, y, w, h] of [[4, 8, 3, 2], [17, 8, 3, 2], [4, 13, 2, 3], [18, 13, 2, 2]]) frame(c, x * T + 2, y * T + 2, w * T - 4, h * T - 4, [255, 255, 255, 90], 2);
    });
    for (const [x, y] of [[5, 5], [18, 5], [5, 15], [18, 15]]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [190, 186, 180]));
    for (const [x, y] of [[9, 4], [15, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y));
    prop(p, 3, 4, 1, 1, (c, top, X, Y) => armour(c, top, X, Y)); p.decor("barrels", 21, 3, { optional: true }); p.decor("barrel", 2, 17, { optional: true });
  },
};
PLANS.KalosShabboneau2F = {
  theme: { room: "arena", floor: "ruinFloor", wall: null },
  plan(p) {
    const yb = back(p, 2);
    p.paint(0, (c) => {
      stoneWall(c, 2, 29, yb, [160, 156, 150]); for (const x of [5, 10, 20, 25]) windowAt(c, x * T, 16, 20, 34, [150, 200, 240], [200, 194, 180]); c.box(14 * T, 6, 4 * T, 44, GOLD, dk(GOLD, 0.5)); c.rect(14 * T + 3, 9, 4 * T - 6, 38, [60, 70, 100]); c.ellipse(16 * T, 24, 8, 8, SKIN); c.rect(15 * T + 4, 32, 24, 15, [150, 40, 50]);
      rug(c, 13, 6, 19, 22, [130, 50, 56], [200, 180, 130]); for (const [x, y, w, h] of [[4, 10, 4, 2], [24, 10, 4, 2], [4, 18, 3, 3], [25, 18, 3, 3]]) frame(c, x * T + 2, y * T + 2, w * T - 4, h * T - 4, [255, 255, 255, 90], 2);
      exitMat(p, c);
    });
    // The empty pedestal.
    prop(p, 15, 8, 2, 1, (c, top, X, Y) => { c.ellipse(X + 16, Y + 14, 16, 3, [0, 0, 0, 60]); c.box(X + 4, Y - 2, 24, 16, [200, 196, 190], [90, 86, 100]); c.rect(X + 2, Y - 4, 28, 4, [226, 222, 216]); c.rect(X + 10, Y - 5, 12, 1, [150, 40, 50]); });
    for (const x of [6, 25]) for (const y of [7, 14, 21]) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [190, 186, 180]));
    for (const [x, y] of [[3, 4], [28, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => armour(c, top, X, Y));
    for (const [x, y] of [[12, 4], [19, 4], [2, 25], [29, 25]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y));
  },
};
PLANS.KalosScaryHouse = {
  theme: { room: "house", floor: "deck", wall: null },
  plan(p) {
    const yb = back(p, 2);
    p.paint(0, (c) => {
      wall(c, 2, 0, 25, yb, [50, 44, 60], { panel: [36, 30, 44], stripe: [58, 50, 70], gap: 12 });
      for (const x of [5, 20]) { c.box(x * T, 10, 26, 30, [16, 18, 40], [80, 70, 90]); c.rect(x * T + 12, 10, 2, 30, [80, 70, 90]); c.rect(x * T, 24, 26, 2, [80, 70, 90]); c.ellipse(x * T + 19, 17, 4, 4, [226, 226, 200]); }
      picture(c, 12 * T, 8, 4 * T, 36, { sky: [40, 36, 50], blob: [110, 100, 120] }, [80, 70, 90]);
      // Cobwebs in the corners.
      for (const [x, y, sx, sy] of [[2 * T, 0, 1, 1], [26 * T, 0, -1, 1]]) for (let k = 1; k <= 4; k++) { c.line(x, y + k * 9, x + sx * k * 9, y, [200, 200, 220, 150]); c.line(x, y, x + sx * 36, y + sy * (40 - k * 9), [200, 200, 220, 110]); }
      rug(c, 10, 8, 18, 14, [70, 30, 50], [110, 100, 120]);
    });
    prop(p, 14, 5, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 2, Y + 4, 12, 11, [70, 50, 44], INK); top.rect(X + 7, Y - 5, 2, 9, [236, 230, 210]); flame(top, X + 8, Y - 5, 0.5); });
    prop(p, 4, 9, 3, 2, (c, top, X, Y) => { table(c, X, Y, 48, 30, [80, 60, 50]); c.line(X + 6, Y + 6, X + 30, Y + 14, [40, 30, 30]); });
    prop(p, 20, 12, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [70, 50, 80])); prop(p, 21, 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [70, 50, 44], 4)); prop(p, 3, 4, 1, 1, (c, top, X, Y) => clock(c, top, X, Y, [70, 50, 44]));
    prop(p, 5, 18, 1, 1, (c, top, X, Y) => crate(c, X, Y, [90, 70, 56])); prop(p, 22, 19, 1, 1, (c, top, X, Y) => crate(c, X, Y, [90, 70, 56])); prop(p, 23, 19, 1, 1, (c, top, X, Y) => crate(c, X, Y, [90, 70, 56]));
    // The dark, with the candle's pool of light.
    p.paint(98, (c, top) => { for (let y = 4; y <= 21; y++) for (let x = 2; x <= 25; x++) { const d = Math.hypot(x - 14, (y - 7) * 1.2); c.rect(x * T, y * T, T, T, [10, 8, 24, Math.min(170, Math.max(0, (d - 2) * 26))]); } });
  },
};

// ================================================================ shops, cafés, restaurants, offices and houses
// Plain rectangular rooms. Each plan repaints the whole floor and back wall (`ground`, painted again over the old
// cabinets so they vanish) and then stands its own furniture on free floor (`fit`).
const roomRect = (p) => [p.left * T, p.top * T, (p.right - p.left + 1) * T, (p.bottom - p.top + 1) * T];
function clip(c, x, y, w, h, f) { const o = c.p; c.p = (px, py, col) => { if (px >= x && px < x + w && py >= y && py < y + h) o(px, py, col); }; try { f(); } finally { c.p = o; } }
function shop(o) {
  return {
    theme: { room: "hall", floor: "hallFloor", wall: null },
    plan(p) {
      p.warps.forEach((w) => { if (!w.exit) p.bare(w.k); });
      const yb = back(p, o.rows == null ? 2 : o.rows), ground = (c) => { o.ground(p, c, yb); exitMat(p, c); };
      p.paint(0, ground);
      each(p, (x, y, fl) => { if (fl || x < p.left || x > p.right || y < p.top || y > p.bottom || (o.keep || []).some(([a, b]) => a === x && b === y)) return; p.paint(y + 1.05, (c) => clip(c, x * T, y * T - 6, T, T + 6, () => ground(c))); });
      o.fit(p, yb);
    },
  };
}
// ---- floors (over the whole room)
function planks(p, c, col, bh = 8) {
  const [X, Y, W, H] = roomRect(p); c.rect(X, Y, W, H, col);
  for (let y = Y, r = 0; y < Y + H; y += bh, r++) { if (r % 3 === 1) c.rect(X, y, W, bh, lt(col, 0.08)); if (r % 4 === 2) c.rect(X, y, W, bh, dk(col, 0.06)); c.rect(X, y + bh - 1, W, 1, dk(col, 0.25)); for (let x = X + (r * 29) % 56; x < X + W; x += 56) c.rect(x, y, 1, bh - 1, dk(col, 0.25)); }
}
function tiled(p, c, a, b, s = 16) {
  const [X, Y, W, H] = roomRect(p);
  clip(c, X, Y, W, H, () => { for (let y = Y, j = 0; y < Y + H; y += s, j++) for (let x = X, i = 0; x < X + W; x += s, i++) { const col = (i + j) & 1 ? a : b; c.rect(x, y, s, s, col); c.rect(x, y, s, 1, lt(col, 0.3)); c.rect(x, y + s - 1, s, 1, dk(col, 0.14)); c.rect(x + s - 1, y, 1, s, dk(col, 0.14)); } });
}
function carpet(p, c, col) { const [X, Y, W, H] = roomRect(p); c.rect(X, Y, W, H, col); for (let y = Y; y < Y + H; y += 2) for (let x = X + (y & 2); x < X + W; x += 4) c.p(x, y, dk(col, 0.08)); }
function parquet(p, c, col) {
  const [X, Y, W, H] = roomRect(p), a = col, b = dk(col, 0.1), e = dk(col, 0.3);
  for (let y = Y, j = 0; y < Y + H; y += T, j++) for (let x = X, i = 0; x < X + W; x += T, i++) {
    if ((i + j) & 1) { c.rect(x, y, T, 8, a); c.rect(x, y + 8, T, 8, b); c.rect(x, y + 7, T, 1, e); c.rect(x, y + 15, T, 1, e); } else { c.rect(x, y, 8, T, b); c.rect(x + 8, y, 8, T, a); c.rect(x + 7, y, 1, T, e); c.rect(x + 15, y, 1, T, e); }
  }
}
// ---- on the wall
const shopWall = (p, c, yb, col, o) => wall(c, p.left, 0, p.right, yb, col, o);
function bottleRack(c, x, y, w, h, wood = [110, 70, 44], trim = GOLD, cols = [[236, 200, 110], [110, 190, 130], [226, 110, 110], [200, 210, 240], [150, 100, 60]]) {
  c.box(x, y, w, h, dk(wood, 0.35), trim); const n = Math.max(1, Math.floor((h - 4) / 13));
  for (let r = 0; r < n; r++) { c.rect(x + 2, y + 12 + r * 13, w - 4, 2, wood); for (let k = x + 5, i = 0; k < x + w - 6; k += 7, i++) { const col = cols[(i * 3 + r * 2) % cols.length]; c.rect(k, y + 4 + r * 13, 4, 8, col); c.rect(k + 1, y + 1 + r * 13, 2, 3, col); c.p(k + 1, y + 6 + r * 13, lt(col, 0.6)); } }
}
function mirror(c, x, y, w, h, edge = GOLD) { c.box(x, y, w, h, [190, 222, 238], dk(edge, 0.45)); frame(c, x + 1, y + 1, w - 2, h - 2, edge); c.rect(x + 2, y + 2, w - 4, (h - 4) / 2, [214, 236, 246]); c.line(x + 4, y + h - 5, x + w / 2, y + 4, [255, 255, 255, 170], 2); c.line(x + w / 2 + 2, y + h - 5, x + w - 4, y + h / 2, [255, 255, 255, 110]); }
function chalkboard(c, x, y, w, h, col = [44, 70, 60], edge = [150, 108, 70]) {
  c.box(x, y, w, h, col, dk(edge, 0.4)); frame(c, x + 1, y + 1, w - 2, h - 2, edge);
  for (let r = 0; r * 6 + 9 < h; r++) { const len = 6 + ((r * 7 + w) % (w - 12)); c.rect(x + 4, y + 5 + r * 6, len, 1, r === 0 ? [250, 230, 150] : [226, 232, 226]); if (r % 2) c.rect(x + w - 8, y + 5 + r * 6, 4, 1, [250, 160, 150]); }
}
function signboard(c, x, y, w, h, col, edge = GOLD, ink = WHITE) { c.box(x, y, w, h, col, dk(edge, 0.4)); frame(c, x + 1, y + 1, w - 2, h - 2, edge); for (let k = x + 6; k + 5 <= x + w - 5; k += 8) c.rect(k, y + h / 2 - 2, 5, 4, ink); }
function curtain(c, x, y, w, h, col) { c.rect(x, y, w, h, col); for (let k = x; k < x + w; k += 4) { c.rect(k, y, 1, h, dk(col, 0.25)); c.rect(k + 2, y, 1, h, lt(col, 0.25)); } c.rect(x, y + h - 2, w, 2, dk(col, 0.35)); }
function blinds(c, x, y, w, h, sky = [170, 206, 236], edge = [120, 116, 110]) { c.box(x, y, w, h, sky, edge); for (let k = y + 2; k < y + h - 2; k += 4) c.rect(x + 1, k, w - 2, 2, [232, 228, 214]); c.rect(x + w - 4, y + 1, 1, h - 2, [150, 146, 140]); }
function cork(c, x, y, w, h, seed = 1) {
  c.box(x, y, w, h, [196, 150, 96], [96, 66, 44]);
  for (let k = 0; k < (w * h) / 150; k++) { const px = x + 3 + ((k * 37 + seed * 11) % (w - 13)), py = y + 3 + ((k * 23 + seed * 5) % (h - 13)), col = [WHITE, [250, 236, 150], [200, 226, 250], [250, 200, 200]][(k + seed) % 4]; c.rect(px, py, 8, 7, col); c.rect(px + 1, py + 2, 5, 1, [120, 116, 130]); c.rect(px + 1, py + 4, 4, 1, [120, 116, 130]); c.p(px + 4, py, [220, 50, 50]); }
}
function shoji(c, x, y, w, h, wood = [60, 40, 30]) { c.box(x, y, w, h, [244, 236, 208], wood); for (let k = x + 8; k < x + w - 2; k += 8) c.rect(k, y + 1, 1, h - 2, wood); for (let k = y + 10; k < y + h - 2; k += 10) c.rect(x + 1, k, w - 2, 1, wood); }
function fireplace(c, x, y, w, h, stone = [150, 140, 136]) {
  c.box(x, y, w, h, stone, dk(stone, 0.5)); for (let k = y + 6; k < y + h; k += 6) c.rect(x + 1, k, w - 2, 1, dk(stone, 0.2)); c.rect(x - 2, y - 3, w + 4, 4, lt(stone, 0.3)); c.rect(x - 2, y, w + 4, 1, dk(stone, 0.4));
  c.rect(x + 6, y + h - 22, w - 12, 22, [30, 22, 24]); glow(c, x + w / 2, y + h - 6, 18, [250, 150, 50], 30); flame(c, x + w / 2 - 4, y + h - 2, 0.9); flame(c, x + w / 2 + 4, y + h - 2, 0.7); c.rect(x + 8, y + h - 3, w - 16, 2, [90, 60, 40]);
}
// ---- furniture
function stool(c, top, X, Y, col = [180, 60, 60]) { c.ellipse(X + 8, Y + 13, 5, 2, [0, 0, 0, 60]); c.rect(X + 7, Y + 5, 2, 8, [150, 154, 170]); c.rect(X + 5, Y + 12, 6, 1, [110, 114, 130]); c.ellipse(X + 8, Y + 5, 5, 3, dk(col, 0.4)); c.ellipse(X + 8, Y + 4, 5, 3, col); c.ellipse(X + 7, Y + 3, 2, 1, lt(col, 0.4)); }
function sideChair(c, x, Y, col, s) { c.ellipse(x + 6, Y + 14, 6, 2, [0, 0, 0, 50]); c.box(x + (s > 0 ? 0 : 9), Y - 5, 3, 16, dk(col, 0.2), dk(col, 0.6)); c.box(x, Y + 5, 12, 5, col, dk(col, 0.6)); c.rect(x + 1, Y + 6, 10, 1, lt(col, 0.35)); c.rect(x + 1, Y + 10, 2, 4, dk(col, 0.6)); c.rect(x + 9, Y + 10, 2, 4, dk(col, 0.6)); }
function roundTable(c, cx, cy, r, col, cloth) { const k = cloth || col; c.ellipse(cx, cy + 10, r, 3, [0, 0, 0, 55]); c.rect(cx - 1, cy + 2, 3, 8, dk(col, 0.5)); c.rect(cx - 4, cy + 9, 9, 2, dk(col, 0.5)); c.ellipse(cx, cy + 2, r, r * 0.55, dk(k, 0.35)); c.ellipse(cx, cy, r, r * 0.55, k); c.ellipse(cx - r * 0.3, cy - r * 0.15, r * 0.4, r * 0.16, lt(k, 0.35)); }
function cup(c, x, y, col = WHITE) { c.rect(x - 2, y - 3, 4, 4, col); c.rect(x - 2, y - 3, 4, 1, [150, 100, 70]); c.p(x + 2, y - 2, col); c.rect(x - 3, y + 1, 6, 1, dk(col, 0.2)); }
function plate(c, x, y, food) { c.ellipse(x, y, 4, 2, [250, 250, 252]); c.ellipse(x, y, 4, 2, [190, 190, 204], 1); if (food) c.ellipse(x, y - 1, 2, 1, food); }
// A café table for two (3 tiles wide, 1 deep): a round table between two chairs.
function cafeSet(c, top, X, Y, o = {}) { const tc = o.table || [176, 128, 80], cc = o.chair || [150, 100, 60]; sideChair(c, X + 2, Y, cc, 1); sideChair(c, X + 34, Y, cc, -1); roundTable(c, X + 24, Y + 4, 10, tc, o.cloth); (o.on || ((cc2, x, y) => { cup(cc2, x - 4, y); cup(cc2, x + 4, y + 1); }))(c, X + 24, Y + 3); }
// A dining table (3 tiles wide, 2 deep): a laid table with chairs round it.
function dineSet(c, top, X, Y, o = {}) {
  const tc = o.table || [150, 100, 60], cc = o.chair || [150, 60, 60], cx = X + 24, cy = Y + 14;
  c.box(cx - 5, Y - 6, 10, 10, dk(cc, 0.15), dk(cc, 0.6)); sideChair(c, X + 1, Y + 8, cc, 1); sideChair(c, X + 35, Y + 8, cc, -1);
  if (o.square) { c.ellipse(cx, cy + 13, 15, 3, [0, 0, 0, 55]); c.box(cx - 14, cy - 9, 28, 20, o.cloth || tc, dk(o.cloth || tc, 0.5)); if (o.check) for (let y = cy - 8; y < cy + 10; y += 4) for (let x = cx - 13 + ((y - cy + 8) & 4); x < cx + 13; x += 8) c.rect(x, y, 4, 4, o.check); c.rect(cx - 14, cy + 8, 28, 3, dk(o.cloth || tc, 0.3)); }
  else roundTable(c, cx, cy, 14, tc, o.cloth);
  plate(c, cx - 7, cy - 1, o.food || [226, 150, 90]); plate(c, cx + 7, cy - 1, o.food2 || [130, 190, 110]);
  if (o.candle) { top.rect(cx - 1, cy - 12, 2, 9, o.candle); flame(top, cx, cy - 12, 0.4); c.ellipse(cx, cy - 2, 3, 1, o.candle); } else { c.rect(cx - 1, cy - 6, 3, 5, [200, 220, 240]); c.ellipse(cx, cy - 7, 2, 2, o.flower || [236, 110, 130]); }
  c.box(cx - 5, cy + 12, 10, 6, cc, dk(cc, 0.6)); c.box(cx - 5, cy + 6, 10, 7, dk(cc, 0.15), dk(cc, 0.6)); c.rect(cx - 4, cy + 7, 8, 1, lt(cc, 0.3));
}
function tillBox(top, x, y, col = [70, 74, 92]) { top.box(x, y - 9, 11, 10, col, INK); top.rect(x + 2, y - 7, 7, 3, [130, 220, 200]); top.rect(x + 2, y - 3, 7, 1, lt(col, 0.4)); top.rect(x - 1, y, 13, 2, dk(col, 0.3)); }
// A counter along row y from x0 to x1, broken at the tiles in `gaps` (where the clerk stands).
function tillRow(p, x0, x1, y, gaps, col, topc, deco) {
  let a = x0, n = 0;
  for (let x = x0; x <= x1 + 1; x++) if (x > x1 || gaps.includes(x)) { if (x > a) { const k = n++, w = (x - a) * T; prop(p, a, y, x - a, 1, (c, top, X, Y) => { counter(c, X, Y, w, col, topc); if (deco) deco(c, top, X, Y, w, k); }); } a = x + 1; }
}
const one = (p, list, f) => { for (const [x, y, a, b] of list) prop(p, x, y, 1, 1, (c, top, X, Y) => f(c, top, X, Y, a, b)); };
const wide = (p, list, w, h, f) => { for (const [x, y, a, b] of list) prop(p, x, y, w, h, (c, top, X, Y) => f(c, top, X, Y, a, b)); };
function rail(c, top, X, Y, w, cols, seed = 0, metal = [190, 194, 210]) {
  c.ellipse(X + w / 2, Y + 14, w / 2, 3, [0, 0, 0, 50]);
  for (const x of [X + 1, X + w - 3]) { c.rect(x, Y - 12, 2, 26, dk(metal, 0.2)); c.rect(x - 2, Y + 13, 6, 2, dk(metal, 0.4)); }
  for (let x = X + 5, k = seed; x + 6 <= X + w - 3; x += 7, k++) { const col = cols[k % cols.length], len = 15 + ((k * 5) % 3) * 3; c.rect(x + 2, Y - 12, 1, 3, INK); c.poly([[x, Y - 8], [x + 3, Y - 10], [x + 6, Y - 8], [x + 6, Y - 10 + len], [x, Y - 10 + len]], col); c.rect(x, Y - 8, 1, len - 2, dk(col, 0.3)); c.rect(x + 4, Y - 7, 1, len - 4, lt(col, 0.3)); }
  top.rect(X + 1, Y - 14, w - 2, 2, metal);
}
function mannequin(c, top, X, Y, col, base = [226, 222, 230], skin = [226, 214, 200]) {
  shadow(c, X, Y); c.box(X + 2, Y + 10, 12, 5, base, dk(base, 0.5)); c.rect(X + 7, Y + 5, 2, 6, [150, 154, 170]);
  top.ellipse(X + 8, Y - 13, 3, 3, skin); top.rect(X + 7, Y - 10, 2, 2, skin);
  top.poly([[X + 3, Y - 8], [X + 13, Y - 8], [X + 12, Y - 1], [X + 14, Y + 6], [X + 2, Y + 6], [X + 4, Y - 1]], col); top.rect(X + 4, Y - 2, 8, 1, dk(col, 0.3)); top.rect(X + 5, Y - 7, 1, 5, lt(col, 0.4));
}
function salonChair(c, top, X, Y, col) { shadow(c, X, Y); c.rect(X + 7, Y + 9, 2, 4, [170, 174, 190]); c.ellipse(X + 8, Y + 13, 5, 2, [130, 134, 150]); c.box(X + 2, Y + 3, 12, 7, col, dk(col, 0.6)); c.box(X + 3, Y - 8, 10, 12, dk(col, 0.12), dk(col, 0.6)); c.rect(X + 4, Y - 7, 8, 2, lt(col, 0.3)); c.rect(X + 1, Y + 1, 2, 6, [190, 194, 210]); c.rect(X + 13, Y + 1, 2, 6, [190, 194, 210]); }
// A curtained booth, `w` x `h` pixels, standing against the wall.
function booth(c, top, X, Y, w, h, col, wood = [150, 108, 70]) { c.box(X, Y - 16, w, h + 16, wood, dk(wood, 0.6)); c.rect(X + 1, Y - 15, w - 2, 3, lt(wood, 0.3)); c.rect(X + 3, Y - 10, w - 6, h + 8, [40, 34, 40]); curtain(c, X + 3, Y - 8, w - 6, h + 3, col); c.rect(X + 2, Y - 10, w - 4, 2, [190, 194, 210]); c.rect(X + 1, Y + h - 3, w - 2, 2, dk(wood, 0.35)); }
function gem(c, x, y, col, s = 1) { c.poly([[x - 4 * s, y - 1 * s], [x - 2 * s, y - 4 * s], [x + 2 * s, y - 4 * s], [x + 4 * s, y - 1 * s], [x, y + 4 * s]], col); c.poly([[x - 2 * s, y - 4 * s], [x + 2 * s, y - 4 * s], [x + 1 * s, y - 1 * s], [x - 1 * s, y - 1 * s]], lt(col, 0.5)); c.poly([[x + 4 * s, y - 1 * s], [x, y + 4 * s], [x + 1 * s, y - 1 * s]], dk(col, 0.3)); c.p(x - 2 * s, y - 3 * s, WHITE); }
// A long glass case holding several things.
function caseOf(c, top, X, Y, w, items, base) { showcase(c, top, X, Y, w, (cc, cx, cy) => items.forEach((f, k) => f(cc, cx - w / 2 + (k + 0.5) * w / items.length, cy)), base); }
// A rack of small goods: `item(c, x, y, k)` draws one in a 4x6 slot.
function rack(c, X, Y, w, col, item, seed = 0) { c.box(X, Y - 12, w, 27, col, dk(col, 0.6)); for (let r = 0; r < 3; r++) { const y = Y - 10 + r * 8; c.rect(X + 2, y, w - 4, 6, dk(col, 0.5)); for (let x = X + 3, k = seed + r * 5; x + 4 <= X + w - 2; x += 6, k++) item(c, x, y, k); c.rect(X + 1, y + 6, w - 2, 1, lt(col, 0.2)); } }
const jarItem = (cols) => (c, x, y, k) => { const j = cols[(k * 3) % cols.length]; c.rect(x, y + 1, 4, 5, j); c.rect(x, y + 1, 4, 1, [240, 240, 244]); c.p(x + 1, y + 3, lt(j, 0.5)); };
const ballItem = (cols) => (c, x, y, k) => { const j = cols[k % cols.length]; c.ellipse(x + 2, y + 3, 2.5, 2.5, WHITE); c.rect(x, y + 1, 5, 2, j); c.rect(x, y + 3, 5, 1, INK); };
function cabinet(c, X, Y, col = [150, 156, 170], open = false) { c.ellipse(X + 8, Y + 15, 8, 2, [0, 0, 0, 50]); c.box(X + 1, Y - 10, 14, 25, col, dk(col, 0.6)); for (let k = 0; k < 3; k++) { c.box(X + 2, Y - 8 + k * 8, 12, 7, lt(col, 0.12), dk(col, 0.4)); c.rect(X + 6, Y - 5 + k * 8, 4, 1, dk(col, 0.6)); } if (open) { c.box(X + 2, Y + 8, 12, 8, lt(col, 0.2), dk(col, 0.6)); c.rect(X + 4, Y + 9, 8, 2, [236, 226, 200]); } }
function papers(c, x, y, n = 3) { for (let k = 0; k < n; k++) c.box(x - k, y - k * 2, 9, 6, k % 2 ? [236, 230, 214] : WHITE, [150, 150, 170]); }
function camera(c, top, X, Y) { shadow(c, X, Y); c.line(X + 8, Y + 1, X + 3, Y + 14, INK); c.line(X + 8, Y + 1, X + 13, Y + 14, INK); c.rect(X + 8, Y + 1, 1, 12, INK); top.box(X + 2, Y - 10, 11, 10, [50, 52, 64], INK); top.box(X + 5, Y - 14, 6, 4, [80, 84, 100], INK); top.ellipse(X + 7, Y - 5, 3, 3, [90, 96, 120]); top.ellipse(X + 7, Y - 5, 2, 2, [150, 200, 240]); top.p(X + 11, Y - 8, [240, 70, 60]); }
function spotlight(c, top, X, Y, col = [255, 244, 190]) { shadow(c, X, Y); c.line(X + 8, Y + 2, X + 3, Y + 14, INK); c.line(X + 8, Y + 2, X + 13, Y + 14, INK); c.rect(X + 8, Y - 8, 1, 21, [90, 94, 110]); top.box(X + 2, Y - 18, 12, 10, [60, 62, 76], INK); top.rect(X + 4, Y - 16, 8, 6, col); top.rect(X + 1, Y - 19, 2, 12, INK); top.rect(X + 13, Y - 19, 2, 12, INK); }
function bike(c, X, Y, col) { c.ellipse(X + 16, Y + 15, 15, 2, [0, 0, 0, 50]); for (const x of [X + 7, X + 25]) { c.ellipse(x, Y + 8, 6.5, 6.5, INK, 2); c.ellipse(x, Y + 8, 1.5, 1.5, [170, 174, 190]); } c.line(X + 7, Y + 8, X + 12, Y, col, 2); c.line(X + 12, Y, X + 22, Y, col, 2); c.line(X + 22, Y - 4, X + 25, Y + 8, col, 2); c.line(X + 12, Y, X + 16, Y + 8, col, 2); c.line(X + 16, Y + 8, X + 22, Y, col, 2); c.rect(X + 9, Y - 3, 6, 2, INK); c.rect(X + 19, Y - 6, 5, 2, INK); c.ellipse(X + 16, Y + 8, 2, 2, [170, 174, 190]); }
function lantern(top, x, y, col = [226, 60, 50]) { top.rect(x, y - 12, 1, 6, INK); top.ellipse(x, y, 5, 6, col); top.ellipse(x - 1, y - 1, 2, 4, lt(col, 0.35)); top.rect(x - 3, y - 6, 7, 2, INK); top.rect(x - 3, y + 5, 7, 2, INK); top.rect(x, y + 7, 1, 3, GOLD); }
function bonsai(c, top, X, Y, leaf = [60, 130, 80]) { shadow(c, X, Y); c.box(X + 3, Y + 9, 10, 6, [70, 90, 130], INK); c.line(X + 8, Y + 9, X + 6, Y + 2, [110, 76, 50], 2); c.line(X + 6, Y + 2, X + 10, Y - 3, [110, 76, 50], 2); top.ellipse(X + 5, Y, 5, 3, dk(leaf, 0.2)); top.ellipse(X + 11, Y - 5, 6, 4, leaf); top.ellipse(X + 4, Y - 2, 4, 2, leaf); top.ellipse(X + 11, Y - 6, 3, 2, lt(leaf, 0.3)); }
function piano(c, top, X, Y) { c.ellipse(X + 24, Y + 30, 24, 4, [0, 0, 0, 60]); c.box(X, Y - 6, 48, 30, [30, 28, 36], INK); c.poly([[X + 2, Y - 4], [X + 46, Y - 4], [X + 46, Y + 8], [X + 20, Y + 14], [X + 2, Y + 10]], [60, 56, 70]); c.rect(X + 2, Y + 16, 44, 6, WHITE); for (let k = 4; k < 46; k += 4) c.rect(X + k, Y + 16, 1, 6, INK); for (let k = 5; k < 44; k += 8) c.rect(X + k, Y + 16, 3, 3, INK); c.box(X + 16, Y + 26, 16, 5, [110, 40, 50], INK); }
function urn(c, top, X, Y, col = GOLD, bloom = [236, 110, 150]) { shadow(c, X, Y); c.box(X + 3, Y + 9, 10, 6, lt(col, 0.2), dk(col, 0.5)); c.poly([[X + 4, Y + 9], [X + 12, Y + 9], [X + 13, Y + 1], [X + 3, Y + 1]], col); c.rect(X + 4, Y + 2, 2, 6, lt(col, 0.5)); top.ellipse(X + 8, Y - 5, 8, 7, [60, 130, 80]); for (const [dx, dy] of [[4, -7], [11, -8], [8, -2], [3, -2], [13, -3], [8, -10]]) top.ellipse(X + dx, Y + dy, 2, 2, bloom); }

// ---------------------------------------------------------------- Lumiose: the cafés
// Café Soleil: honey boards and sunny walls, the bar under its cup rack, a sun worked into the floor.
PLANS.KalosCafeSoleil = shop({
  ground(p, c, yb) {
    const SUN = [250, 206, 80];
    planks(p, c, [214, 164, 100]);
    shopWall(p, c, yb, [252, 226, 140], { stripe: [255, 238, 176], gap: 14, sw: 6, panel: [176, 120, 70], top: [255, 246, 210] });
    for (const x of [3, 18]) { windowAt(c, x * T + 6, 16, 36, 30, [176, 220, 250], [255, 250, 230]); c.ellipse(x * T + 32, 22, 5, 5, [255, 240, 150]); }
    bottleRack(c, 8 * T + 4, 6, 9 * T - 8, 42, [150, 96, 56], GOLD, [WHITE, [236, 200, 110], [226, 130, 90], [200, 226, 240], [150, 100, 60]]); chalkboard(c, 6 * T + 4, 10, 26, 32);
    const cx = 12 * T + 8, cy = 12 * T + 8; for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; c.poly([[cx + Math.cos(t - 0.12) * 30, cy + Math.sin(t - 0.12) * 20], [cx + Math.cos(t) * 48, cy + Math.sin(t) * 32], [cx + Math.cos(t + 0.12) * 30, cy + Math.sin(t + 0.12) * 20]], A(SUN, 210)); }
    c.ellipse(cx, cy, 28, 19, [226, 150, 60]); c.ellipse(cx, cy, 26, 17, SUN); c.ellipse(cx, cy, 16, 10, lt(SUN, 0.35));
  },
  fit(p) {
    const o = { table: [226, 190, 130], chair: [226, 130, 60], cloth: [255, 244, 214] };
    tillRow(p, 8, 16, 7, [12], [176, 120, 70], [255, 240, 206], (c, top, X, Y, w, k) => { if (k === 0) { top.box(X + 6, Y - 12, 18, 12, [190, 60, 50], INK); top.rect(X + 9, Y - 9, 12, 3, [240, 240, 244]); top.rect(X + 9, Y - 3, 3, 3, INK); top.rect(X + 17, Y - 3, 3, 3, INK); cup(c, X + 40, Y); cup(c, X + 50, Y); } else { tillBox(top, X + 6, Y); for (const dx of [28, 40, 52]) { c.ellipse(X + dx, Y - 1, 4, 2, WHITE); c.ellipse(X + dx, Y - 2, 3, 2, [[236, 190, 110], [240, 150, 170], [150, 100, 70]][dx % 3]); } } });
    wide(p, [[3, 7], [3, 11], [3, 14], [18, 11], [18, 14], [7, 14], [15, 14]], 3, 1, (c, top, X, Y) => cafeSet(c, top, X, Y, o));
    wide(p, [[18, 6]], 3, 1, (c, top, X, Y) => caseOf(c, top, X, Y, 48, [[236, 190, 110], [240, 150, 170], [150, 100, 70], [250, 230, 150]].map((col) => (cc, x, y) => { cc.ellipse(x, y + 2, 4, 2, WHITE); cc.rect(x - 3, y - 2, 6, 4, col); cc.ellipse(x, y - 3, 1, 1, [226, 60, 60]); }), [176, 120, 70]));
    one(p, [[2, 4], [21, 4], [2, 17], [21, 17], [17, 4]], (c, top, X, Y) => plant(c, top, X, Y, [110, 170, 80]));
  },
});
// Café Rouleau: the skaters' café. A polished mint floor with a practice ring, a long bar, skates to borrow.
PLANS.KalosCafeRouleau = shop({
  ground(p, c, yb) {
    const TEAL = [70, 190, 180], PINK = [244, 130, 170];
    tiled(p, c, [214, 240, 234], [232, 248, 244], 32);
    shopWall(p, c, yb, [60, 170, 166], { stripe: [80, 190, 184], gap: 16, sw: 8, panel: [240, 244, 240], top: PINK, skirt: [40, 110, 110] });
    bottleRack(c, 4 * T, 8, 8 * T, 38, [40, 110, 110], PINK, [WHITE, PINK, [250, 220, 110], [150, 220, 240]]);
    // The neon skate.
    const X = 15 * T, Y = 12; glow(c, X + 24, Y + 18, 30, PINK, 26); c.box(X, Y, 48, 34, [30, 60, 70], PINK); c.poly([[X + 10, Y + 6], [X + 20, Y + 6], [X + 22, Y + 16], [X + 38, Y + 19], [X + 38, Y + 24], [X + 10, Y + 24]], WHITE); c.rect(X + 10, Y + 22, 28, 2, PINK); for (const dx of [14, 22, 30, 36]) c.ellipse(X + dx, Y + 28, 3, 3, [250, 220, 110]);
    for (const x of [23, 26]) picture(c, x * T - 4, 12, 30, 30, { sky: lt(x === 23 ? PINK : TEAL, 0.5), blob: x === 23 ? TEAL : PINK }, WHITE);
    // The practice ring.
    const cx = 16 * T + 8, cy = 15 * T + 8; c.ellipse(cx, cy, 150, 78, A(TEAL, 70)); c.ellipse(cx, cy, 150, 78, A(TEAL, 230), 3); c.ellipse(cx, cy, 96, 42, [232, 248, 244]); c.ellipse(cx, cy, 96, 42, A(PINK, 230), 2);
    for (let a = 0; a < 24; a++) { const t = a * Math.PI / 12; c.ellipse(cx + Math.cos(t) * 123, cy + Math.sin(t) * 60, 3, 2, A(WHITE, 220)); }
    for (const s of [-1, 1]) c.poly([[cx + s * 8, cy - 64], [cx - s * 2, cy - 60], [cx + s * 8, cy - 56]], A(PINK, 230));
  },
  fit(p) {
    const TEAL = [70, 190, 180], PINK = [244, 130, 170], o = (k) => ({ table: WHITE, chair: k % 2 ? PINK : TEAL, cloth: k % 2 ? [255, 230, 240] : [226, 248, 244] });
    wide(p, [[4, 5]], 8, 1, (c, top, X, Y) => { counter(c, X, Y, 128, [40, 120, 120], WHITE); top.box(X + 6, Y - 12, 18, 12, [226, 226, 236], INK); top.rect(X + 9, Y - 9, 12, 3, PINK); for (const dx of [40, 54, 68]) { top.rect(X + dx, Y - 9, 5, 9, [[250, 200, 90], PINK, [150, 220, 240]][dx % 3]); top.rect(X + dx, Y - 10, 5, 2, WHITE); } tillBox(top, X + 104, Y, TEAL); });
    one(p, [[5, 6], [7, 6], [9, 6], [11, 6]], (c, top, X, Y) => stool(c, top, X, Y, PINK));
    // Skates to borrow.
    wide(p, [[21, 4], [23, 4], [25, 4], [27, 4]], 2, 1, (c, top, X, Y, k) => rack(c, X, Y, 32, [240, 244, 240], (cc, x, y, n) => { const col = [PINK, TEAL, [250, 220, 110], [150, 150, 230]][n % 4]; cc.rect(x, y, 3, 4, WHITE); cc.rect(x, y + 3, 5, 2, col); cc.p(x + 1, y + 5, INK); cc.p(x + 4, y + 5, INK); }, X));
    [[3, 10], [3, 14], [3, 18], [26, 10], [26, 14], [26, 18], [8, 21], [21, 21]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => cafeSet(c, top, X, Y, o(k))));
    // The jukebox.
    wide(p, [[13, 4]], 2, 1, (c, top, X, Y) => { c.box(X + 2, Y - 14, 28, 29, [200, 60, 110], INK); c.ellipse(X + 16, Y - 14, 14, 8, [200, 60, 110]); c.ellipse(X + 16, Y - 12, 10, 5, [250, 220, 110]); c.rect(X + 6, Y - 4, 20, 8, [30, 60, 70]); for (let k = 0; k < 5; k++) c.rect(X + 8 + k * 4, Y - 2 + (k % 2), 2, 5 - (k % 2) * 2, [[250, 220, 110], PINK, TEAL][k % 3]); c.rect(X + 6, Y + 7, 20, 5, [250, 220, 110]); });
    one(p, [[2, 4], [29, 5], [2, 23], [29, 23]], (c, top, X, Y) => plant(c, top, X, Y, [70, 170, 130]));
    one(p, [[12, 11], [20, 11], [12, 20], [20, 20]], (c, top, X, Y) => { shadow(c, X, Y); c.poly([[X + 3, Y + 14], [X + 13, Y + 14], [X + 9, Y + 1], [X + 7, Y + 1]], PINK); c.rect(X + 5, Y + 7, 6, 2, WHITE); c.rect(X + 2, Y + 13, 12, 2, dk(PINK, 0.3)); });
  },
});

// ---------------------------------------------------------------- Lumiose: the four restaurants
// The same hall four ways: where the two sideboards stand (4,11 and 25,11) each has its own piece.
const DINERS = [[7, 8], [22, 8], [4, 14], [9, 14], [21, 14], [26, 14], [4, 18], [9, 18], [21, 18], [26, 18]];
// Le Nah, the one-star bistro: red and cream tiles, brick, checked cloths, wine in the barrel.
PLANS.KalosLeNah = shop({
  ground(p, c, yb) {
    tiled(p, c, [196, 70, 60], [244, 232, 206]);
    shopWall(p, c, yb, [176, 100, 74], { brick: [140, 74, 54], top: [244, 232, 206], skirt: [96, 56, 44] });
    chalkboard(c, 13 * T, 6, 6 * T, 44); bottleRack(c, 4 * T, 10, 7 * T, 42, [110, 70, 44], [200, 160, 100], [[90, 30, 50], [60, 100, 60], [200, 170, 90], [120, 40, 40]]);
    // Copper pans over the kitchen hatch.
    c.box(21 * T, 14, 7 * T, 36, [60, 40, 36], [200, 160, 100]); c.rect(21 * T + 2, 18, 7 * T - 4, 2, [90, 90, 100]); for (let k = 0; k < 6; k++) { const x = 21 * T + 12 + k * 17; c.rect(x, 20, 1, 5, [90, 90, 100]); c.ellipse(x, 30 + (k % 2) * 3, 6 - (k % 3), 6 - (k % 3), [200, 120, 70]); c.ellipse(x - 1, 29 + (k % 2) * 3, 3, 3, [236, 170, 110]); }
  },
  fit(p) {
    const WOOD = [150, 100, 60];
    wide(p, [[10, 5]], 13, 1, (c, top, X, Y) => { counter(c, X, Y, 13 * T, WOOD, [226, 200, 150]); for (let k = 0; k < 6; k++) plate(c, X + 20 + k * 34, Y - 1, [[226, 150, 90], [130, 190, 110], [240, 220, 150]][k % 3]); top.box(X + 96, Y - 12, 14, 10, [200, 120, 70], INK); top.rect(X + 110, Y - 8, 6, 2, INK); });
    wide(p, DINERS, 3, 2, (c, top, X, Y) => dineSet(c, top, X, Y, { square: true, cloth: WHITE, check: [226, 70, 70], chair: WOOD, table: WOOD }));
    // The barrels.
    wide(p, [[4, 11], [25, 11]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 16, 4, [0, 0, 0, 60]); c.box(X + 2, Y + 22, 28, 8, [110, 70, 44], INK); c.ellipse(X + 16, Y + 10, 15, 16, [80, 50, 34]); c.ellipse(X + 16, Y + 10, 14, 15, [176, 124, 76]); for (let k = -10; k <= 10; k += 5) c.rect(X + 16 + k, Y - 3 + Math.abs(k) / 2, 1, 27 - Math.abs(k), [130, 88, 54]); c.ellipse(X + 16, Y + 10, 14, 15, [90, 90, 100], 2); c.ellipse(X + 16, Y + 10, 9, 10, [90, 90, 100], 1); c.rect(X + 14, Y + 16, 4, 5, [200, 160, 100]); });
    wide(p, [[13, 21], [19, 21]], 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 3, Y + 14, X + 6, Y - 6, WOOD); c.line(X + 13, Y + 14, X + 10, Y - 6, WOOD); chalkboard(top, X + 2, Y - 10, 12, 16, [44, 70, 60], WOOD); });
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23], [8, 5], [24, 5]], (c, top, X, Y) => plant(c, top, X, Y, [90, 150, 80]));
  },
});
// Le Yeah, two stars: blue carpet under white cloths, a bar and the cellar's best on show.
PLANS.KalosLeYeah = shop({
  ground(p, c, yb) {
    const [X, Y, W, H] = roomRect(p);
    carpet(p, c, [56, 80, 136]); for (let y = Y + 8; y < Y + H; y += 16) for (let x = X + 8 + ((y >> 4) & 1) * 16; x < X + W; x += 32) { c.poly([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], [84, 110, 170]); c.p(x, y, GOLD); }
    shopWall(p, c, yb, [240, 232, 214], { panel: [130, 92, 60], top: GOLD });
    bottleRack(c, 4 * T, 8, 7 * T, 40, [110, 76, 50], GOLD); for (const x of [12, 19]) windowAt(c, x * T, 18, 26, 30, [150, 200, 240], GOLD); picture(c, 15 * T - 2, 10, 36, 32, ARTS[4], GOLD); for (const x of [23, 26]) picture(c, x * T - 4, 12, 30, 28, ARTS[x % 8], GOLD);
    rug(c, 14, 10, 18, 22, [96, 124, 184], GOLD);
  },
  fit(p) {
    const BLUE = [70, 100, 170], WOOD = [130, 92, 60];
    wide(p, [[4, 5]], 7, 1, (c, top, X, Y) => { counter(c, X, Y, 7 * T, WOOD, [226, 214, 190]); for (const dx of [12, 30, 48]) { top.rect(X + dx, Y - 8, 3, 8, [200, 226, 240]); top.rect(X + dx - 1, Y - 9, 5, 2, [200, 226, 240]); } tillBox(top, X + 90, Y); });
    one(p, [[5, 6], [7, 6], [9, 6]], (c, top, X, Y) => stool(c, top, X, Y, BLUE));
    wide(p, [[22, 4], [24, 4], [26, 4]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, WOOD, jarItem([[90, 30, 50], [60, 100, 60], [200, 170, 90], [226, 226, 236]]), X));
    wide(p, DINERS, 3, 2, (c, top, X, Y) => dineSet(c, top, X, Y, { cloth: WHITE, chair: BLUE, table: WOOD, flower: [250, 210, 90] }));
    // The sideboards.
    wide(p, [[4, 11], [25, 11]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 60]); c.box(X, Y - 8, 32, 39, WOOD, dk(WOOD, 0.6)); c.rect(X + 2, Y - 6, 28, 13, dk(WOOD, 0.45)); for (const dx of [5, 13, 21]) { c.ellipse(X + dx + 3, Y + 1, 3, 4, WHITE); c.ellipse(X + dx + 3, Y + 1, 3, 4, [150, 170, 220], 1); } c.rect(X, Y + 8, 32, 3, lt(WOOD, 0.35)); for (const dx of [2, 17]) { c.box(X + dx, Y + 13, 13, 15, lt(WOOD, 0.1), dk(WOOD, 0.5)); c.rect(X + dx + (dx < 10 ? 9 : 2), Y + 19, 2, 3, GOLD); } top.ellipse(X + 16, Y - 10, 7, 4, WHITE); top.rect(X + 14, Y - 15, 4, 2, GOLD); });
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23], [12, 4], [20, 4]], (c, top, X, Y) => plant(c, top, X, Y, [80, 150, 110]));
    one(p, [[13, 12], [19, 12]], (c, top, X, Y) => statue(c, top, X, Y, [226, 226, 236]));
  },
});
// Le Wow, three stars: marble and gold under chandeliers, a piano, candlelight on every table.
PLANS.KalosLeWow = shop({
  ground(p, c, yb) {
    const PUR = [104, 50, 124];
    tiled(p, c, [250, 244, 230], [236, 224, 200], 32); const [X, Y, W, H] = roomRect(p); for (let y = Y + 32; y < Y + H; y += 32) for (let x = X + 32; x < X + W; x += 32) c.poly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], GOLD);
    shopWall(p, c, yb, [84, 40, 100], { stripe: [100, 52, 118], gap: 12, sw: 3, panel: [60, 30, 74], top: GOLD, skirt: GOLD });
    for (const x of [6, 14, 22]) nightWindow(p, c, x * T, 8, 4 * T, 40); for (const x of [3, 11, 19, 27]) { c.rect(x * T + 6, 8, 4, 40, GOLD); c.ellipse(x * T + 8, 10, 5, 3, GOLD); }
    rug(c, 13, 6, 19, 22, PUR, GOLD); c.ellipse(16 * T + 8, 15 * T, 64, 40, PUR); c.ellipse(16 * T + 8, 15 * T, 64, 40, GOLD, 2); c.ellipse(16 * T + 8, 15 * T, 44, 26, A(GOLD, 200), 1);
    for (const [x, y] of [[8, 12.5], [23, 12.5], [8, 21.5], [23, 21.5], [16, 15]]) glow(c, x * T + 8, y * T, 40, [255, 240, 180], 14);
  },
  fit(p) {
    const PUR = [130, 60, 150];
    p.paint(40, (c, top) => { for (const [x, y] of [[8, 12.5], [23, 12.5], [8, 21.5], [23, 21.5], [16, 15]]) chandelier(top, x * T + 8, y * T - 8); });
    wide(p, [[3, 5]], 3, 2, (c, top, X, Y) => piano(c, top, X, Y));
    wide(p, DINERS.filter(([x, y]) => !(x === 7 && y === 8)), 3, 2, (c, top, X, Y) => dineSet(c, top, X, Y, { cloth: WHITE, chair: PUR, table: [110, 76, 50], candle: GOLD, food: [236, 120, 110], food2: [250, 220, 130] }));
    wide(p, [[8, 9]], 3, 2, (c, top, X, Y) => dineSet(c, top, X, Y, { cloth: WHITE, chair: PUR, table: [110, 76, 50], candle: GOLD }));
    // Great urns of flowers where the sideboards were.
    wide(p, [[4, 11], [25, 11]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 15, 4, [0, 0, 0, 60]); c.box(X + 4, Y + 20, 24, 10, [250, 244, 230], [150, 140, 120]); c.poly([[X + 8, Y + 20], [X + 24, Y + 20], [X + 27, Y + 4], [X + 5, Y + 4]], GOLD); c.rect(X + 8, Y + 6, 3, 12, lt(GOLD, 0.5)); c.rect(X + 4, Y + 2, 24, 3, dk(GOLD, 0.2)); top.ellipse(X + 16, Y - 8, 16, 12, [50, 120, 76]); for (let k = 0; k < 11; k++) top.ellipse(X + 4 + (k * 7) % 25, Y - 16 + (k * 5) % 15, 3, 3, [[240, 130, 170], WHITE, [200, 130, 230]][k % 3]); });
    one(p, [[11, 5], [21, 5], [28, 5]], (c, top, X, Y) => statue(c, top, X, Y, GOLD));
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23]], (c, top, X, Y) => urn(c, top, X, Y));
    // The maître d's stand, and rope posts by the door.
    wide(p, [[18, 8]], 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 4, Y, 8, 15, [110, 76, 50], INK); top.box(X + 1, Y - 6, 14, 7, [130, 92, 60], INK); top.rect(X + 3, Y - 4, 10, 3, WHITE); });
    one(p, [[14, 21], [18, 21]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 2, 2, 12, GOLD); c.ellipse(X + 8, Y + 2, 2, 2, GOLD); c.rect(X + 4, Y + 13, 8, 2, dk(GOLD, 0.3)); });
  },
});
// Sushi High Roller: black lacquer and gold. The chef's counter runs the width of the room, with tatami below.
function tatami(c, x0, y0, x1, y1) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X - 2, Y - 2, W + 4, H + 4, [30, 44, 34]); for (let x = X, k = 0; x < X + W; x += 32, k++) for (let y = Y; y < Y + H; y += 16) { const w = Math.min(32, X + W - x), col = (k + (y >> 4)) & 1 ? [200, 196, 130] : [186, 184, 116]; c.rect(x, y, w, 16, col); for (let l = y + 2; l < y + 15; l += 3) c.rect(x + 1, l, w - 2, 1, dk(col, 0.08)); c.rect(x, y + 15, w, 1, [50, 70, 50]); c.rect(x + w - 1, y, 1, 16, [50, 70, 50]); } }
PLANS.KalosSushiHighRoller = shop({
  ground(p, c, yb) {
    const LAC = [50, 38, 44], RED = [150, 30, 36];
    planks(p, c, LAC); const [X, Y, W, H] = roomRect(p); for (let y = Y + 5 * T + 7; y < Y + H; y += 6 * T) c.rect(X, y, W, 1, A(GOLD, 150));
    shopWall(p, c, yb, [36, 26, 32], { top: GOLD, skirt: RED }); c.rect(X, 50, W, 2, GOLD);
    for (const x of [3, 9, 20, 26]) shoji(c, x * T, 8, 3 * T, 40);
    // The gold fan.
    const cx = 16 * T + 8; c.box(13 * T, 6, 7 * T, 44, RED, GOLD); for (let a = 0; a <= 8; a++) { const t = Math.PI * (1.1 + a * 0.1); c.poly([[cx, 46], [cx + Math.cos(t) * 40, 46 + Math.sin(t) * 36], [cx + Math.cos(t + 0.1) * 40, 46 + Math.sin(t + 0.1) * 36]], a % 2 ? GOLD : lt(GOLD, 0.4)); } c.ellipse(cx, 46, 4, 4, INK); c.ellipse(cx, 22, 5, 5, [226, 60, 50]);
    for (const x of [7, 13, 20, 26]) { const lx = x * T - 8; c.rect(lx, 3, 1, 5, GOLD); c.ellipse(lx, 14, 5, 6, [226, 60, 50]); c.ellipse(lx - 1, 13, 2, 4, [250, 130, 100]); c.rect(lx - 3, 8, 7, 2, INK); c.rect(lx - 3, 19, 7, 2, INK); }
    tatami(c, 3, 15, 11, 21); tatami(c, 21, 15, 29, 21);
    rug(c, 15, 10, 17, 22, RED, GOLD);
  },
  fit(p) {
    const LAC = [44, 32, 38], RED = [190, 44, 48], HINOKI = [232, 204, 150];
    tillRow(p, 5, 27, 8, [16], LAC, HINOKI, (c, top, X, Y, w, k) => {
      c.rect(X, Y + 12, w, 1, GOLD);
      for (let x = X + 8, n = k * 2; x < X + w - 60; x += 16, n++) { c.rect(x - 4, Y - 1, 9, 2, INK); c.rect(x - 3, Y - 3, 3, 2, WHITE); c.rect(x - 3, Y - 4, 3, 1, [[240, 120, 90], [250, 190, 80], [226, 80, 80]][n % 3]); c.rect(x + 1, Y - 3, 3, 2, WHITE); c.rect(x + 1, Y - 4, 3, 1, [[226, 80, 80], [240, 240, 244], [250, 150, 110]][n % 3]); }
      const gx = k ? X + 8 : X + w - 56; top.box(gx, Y - 11, 48, 10, [200, 230, 244, 120], [120, 150, 170]); for (let n = 0; n < 5; n++) fish(top, gx + 7 + n * 9, Y - 5, [[240, 120, 90], [226, 80, 80], [200, 220, 240], [250, 190, 80]][(n + k) % 4], 0.7, n % 2 ? 1 : -1);
    });
    one(p, [[6, 9], [8, 9], [10, 9], [12, 9], [14, 9], [18, 9], [20, 9], [22, 9], [24, 9], [26, 9]], (c, top, X, Y) => stool(c, top, X, Y, RED));
    // Behind the counter: sake, knives and the rice.
    wide(p, [[6, 4], [8, 4], [23, 4], [25, 4]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, LAC, jarItem([WHITE, [226, 226, 200], [90, 130, 170], [60, 100, 60]]), X));
    wide(p, [[11, 5], [19, 5]], 3, 1, (c, top, X, Y) => { counter(c, X, Y, 48, LAC, [150, 156, 176]); top.box(X + 4, Y - 10, 14, 10, WHITE, INK); top.rect(X + 6, Y - 12, 10, 3, [60, 60, 70]); c.rect(X + 26, Y - 2, 14, 3, HINOKI); c.rect(X + 30, Y - 4, 8, 1, [200, 206, 226]); });
    // Low tables on the tatami.
    wide(p, [[5, 16], [5, 19], [23, 16], [23, 19]], 4, 1, (c, top, X, Y) => { for (const dx of [2, 50]) { c.box(dx + X, Y + 3, 12, 10, RED, dk(RED, 0.5)); c.rect(dx + X + 2, Y + 5, 8, 6, lt(RED, 0.2)); } table(c, X + 15, Y + 1, 34, 15, LAC); c.rect(X + 17, Y + 3, 30, 1, GOLD); plate(c, X + 25, Y + 6, [240, 120, 90]); plate(c, X + 39, Y + 6, [250, 190, 80]); c.rect(X + 31, Y + 3, 3, 4, [90, 130, 170]); });
    // Bonsai on their stands.
    wide(p, [[4, 11], [25, 11]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 15, 4, [0, 0, 0, 60]); c.box(X + 2, Y + 14, 28, 16, LAC, INK); c.rect(X + 3, Y + 15, 26, 2, GOLD); frame(c, X + 6, Y + 20, 20, 7, GOLD); c.box(X + 6, Y + 8, 20, 7, [70, 90, 130], INK); c.line(X + 16, Y + 8, X + 12, Y - 2, [110, 76, 50], 3); c.line(X + 12, Y - 2, X + 20, Y - 10, [110, 76, 50], 3); top.ellipse(X + 8, Y - 2, 9, 5, [40, 100, 60]); top.ellipse(X + 22, Y - 12, 10, 6, [60, 130, 80]); top.ellipse(X + 9, Y - 4, 6, 3, [60, 130, 80]); top.ellipse(X + 20, Y - 14, 5, 3, [100, 170, 100]); top.ellipse(X + 14, Y - 18, 6, 4, [60, 130, 80]); });
    // Gold screens by the door.
    wide(p, [[11, 23], [19, 23]], 3, 1, (c, top, X, Y) => { c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 60]); for (let k = 0; k < 4; k++) { const x = X + k * 12, up = k % 2 ? 2 : 0; c.box(x, Y - 14 + up, 12, 28, k % 2 ? GOLD : lt(GOLD, 0.25), INK); c.line(x + 3, Y + 10 + up, x + 8, Y - 4 + up, [60, 100, 60], 2); c.ellipse(x + 8, Y - 6 + up, 3, 2, [40, 100, 60]); } });
    one(p, [[2, 4], [29, 4]], (c, top, X, Y) => bonsai(c, top, X, Y));
    one(p, [[2, 23], [29, 23], [13, 12], [19, 12]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 4, Y + 9, 8, 6, [150, 150, 156], INK); c.rect(X + 6, Y + 3, 4, 6, [170, 170, 176]); top.box(X + 2, Y - 6, 12, 9, [190, 190, 196], INK); top.rect(X + 5, Y - 4, 6, 5, [250, 220, 130]); top.poly([[X, Y - 6], [X + 16, Y - 6], [X + 8, Y - 13]], [130, 130, 140]); });
  },
});

// ---------------------------------------------------------------- Lumiose: the specialist shops
const EVO = [[240, 110, 60], [80, 150, 240], [250, 220, 80], [110, 200, 110], [100, 100, 150], [250, 170, 70], [240, 240, 200], [120, 70, 160], [130, 220, 210], [170, 230, 250]];
const BALLS = [[226, 60, 56], [70, 120, 220], [250, 210, 70], [240, 240, 244], [244, 150, 190], [80, 200, 190], [60, 110, 70], [50, 50, 60], [250, 160, 60], [150, 90, 200]];
function crystals(c, top, X, Y, cols, w = 16) { c.ellipse(X + w / 2, Y + 14, w / 2, 3, [0, 0, 0, 60]); c.ellipse(X + w / 2, Y + 11, w / 2 - 1, 4, [96, 92, 110]); c.ellipse(X + w / 2, Y + 10, w / 2 - 2, 3, [130, 126, 146]); for (let k = 0; k * 6 + 4 < w; k++) crystal(k % 2 ? c : top, X + 4 + k * 6 + (k % 2), Y + 11 - (k % 2) * 2, cols[k % cols.length], k % 2 ? 0.6 : w > 16 && k === 2 ? 1.4 : 0.95); }
// Stone Emporium: slate carpet and stone walls, every evolution stone under glass, geodes down the middle.
PLANS.KalosStoneEmporium = shop({
  ground(p, c, yb) {
    carpet(p, c, [48, 62, 100]);
    shopWall(p, c, yb, [150, 150, 166], { brick: [124, 124, 142], top: [200, 206, 226], skirt: [70, 74, 100] });
    // Lit niches, a great stone in each.
    [3, 6, 9, 20, 23, 26].forEach((x, k) => { const X = x * T + 4; c.box(X, 12, 34, 40, [30, 34, 56], [200, 206, 226]); glow(c, X + 17, 36, 16, EVO[k], 40); crystal(c, X + 17, 48, EVO[k], 1.7); c.rect(X + 2, 48, 30, 3, [90, 94, 120]); });
    c.box(13 * T, 8, 6 * T, 44, [36, 44, 76], GOLD); gem(c, 16 * T, 30, [130, 220, 210], 4); gem(c, 14 * T + 4, 40, EVO[0], 1.5); gem(c, 18 * T - 4, 40, EVO[2], 1.5); star(c, 14 * T + 6, 18, WHITE); star(c, 18 * T - 8, 20, WHITE, 1);
    rug(c, 15, 10, 17, 22, [76, 96, 150], [200, 206, 226]);
  },
  fit(p) {
    const BASE = [62, 66, 96];
    tillRow(p, 12, 20, 8, [16], BASE, [200, 206, 226], (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 44, Y); else c.box(X + 6, Y - 3, 14, 4, [150, 40, 50], GOLD); for (let n = 0; n < 3; n++) gem(top, X + (k ? 8 : 28) + n * 10, Y - 4, EVO[(n + k * 3 + 4) % 10], 0.8); });
    [[3, 4], [5, 4], [7, 4], [9, 4], [21, 4], [23, 4], [25, 4], [27, 4]].forEach(([x, y]) => prop(p, x, y, 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, BASE, (cc, px, py, k) => { const col = EVO[(k + x) % 10]; cc.ellipse(px + 2, py + 3, 2.5, 2.5, dk(col, 0.2)); cc.rect(px + 1, py + 1, 2, 2, lt(col, 0.4)); })));
    [[4, 12], [24, 12], [4, 17], [24, 17]].forEach(([x, y], k) => prop(p, x, y, 4, 1, (c, top, X, Y) => caseOf(c, top, X, Y, 64, [0, 1, 2, 3].map((n) => (cc, gx, gy) => gem(cc, gx, gy, EVO[(k * 2 + n) % 10], 1.1)), BASE)));
    [[10, 11], [22, 11], [10, 20], [22, 20], [4, 21], [28, 21]].forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => showcase(c, top, X, Y, 16, (cc, gx, gy) => megaStone(EVO[(k + 6) % 10])(cc, gx, gy), BASE)));
    // The geodes.
    wide(p, [[10, 14], [21, 14]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 28, 16, 4, [0, 0, 0, 70]); c.ellipse(X + 16, Y + 18, 15, 12, [90, 86, 104]); c.ellipse(X + 16, Y + 17, 12, 9, [70, 40, 110]); c.ellipse(X + 16, Y + 17, 9, 6, [150, 100, 210]); for (const [dx, s] of [[8, 0.8], [14, 1.3], [20, 1], [25, 0.7]]) crystal(top, X + dx, Y + 20, dx === 14 ? [200, 150, 250] : [170, 120, 230], s); c.rect(X + 4, Y + 27, 24, 2, [70, 66, 84]); });
    one(p, [[2, 5], [29, 5], [2, 23], [29, 23], [12, 4], [20, 4]], (c, top, X, Y, a) => crystals(c, top, X, Y, [[130, 220, 210], [200, 150, 250], [250, 220, 80]]));
    // The cutter's bench, and crates of rough stone.
    wide(p, [[24, 21]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [110, 96, 90]); c.ellipse(X + 12, Y + 5, 5, 5, [170, 174, 190]); c.ellipse(X + 12, Y + 5, 2, 2, INK); gem(c, X + 28, Y + 6, EVO[1]); c.rect(X + 36, Y + 3, 8, 2, [200, 206, 226]); });
    one(p, [[6, 21], [7, 21], [7, 22]], (c, top, X, Y) => { crate(c, X, Y, [150, 130, 110]); c.ellipse(X + 6, Y + 2, 3, 2, [120, 116, 130]); c.ellipse(X + 11, Y + 3, 2, 2, [150, 100, 210]); });
  },
});
// Poké Ball Boutique: white and red, a ball worked into the floor, every kind of ball on show.
PLANS.KalosPokeBallBoutique = shop({
  ground(p, c, yb) {
    const RED = [214, 60, 56];
    tiled(p, c, [246, 246, 250], [234, 236, 244]);
    shopWall(p, c, yb, [244, 244, 250], { panel: RED, top: RED, skirt: [130, 30, 34] });
    [3, 5.5, 8, 10.5, 20, 22.5, 25, 27.5].forEach((x, k) => { const X = x * T + 8; c.ellipse(X, 26, 15, 15, [200, 204, 220]); c.ellipse(X, 26, 13, 13, [60, 64, 84]); ball(c, X, 27, 8, BALLS[(k + 1) % 10]); });
    c.box(13 * T + 4, 4, 6 * T - 8, 44, RED, [130, 30, 34]); ball(c, 16 * T, 26, 16);
    // The ball in the floor.
    const cx = 16 * T + 8, cy = 16 * T; c.ellipse(cx, cy, 70, 44, INK); c.ellipse(cx, cy, 67, 41, [250, 250, 252]); clip(c, 0, 0, 9999, cy, () => c.ellipse(cx, cy, 67, 41, RED)); clip(c, 0, 0, 9999, cy - 20, () => c.ellipse(cx - 6, cy - 4, 52, 30, lt(RED, 0.18))); c.rect(cx - 68, cy - 3, 136, 6, INK); c.ellipse(cx, cy, 18, 12, INK); c.ellipse(cx, cy, 14, 9, [250, 250, 252]); c.ellipse(cx, cy, 8, 5, [220, 222, 232]);
  },
  fit(p) {
    const RED = [214, 60, 56];
    tillRow(p, 12, 20, 8, [16], RED, WHITE, (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 44, Y); for (let n = 0; n < 3; n++) ball(top, X + (k ? 8 : 12) + n * 13, Y - 4, 4, BALLS[(n + k * 3) % 10]); });
    [[3, 4], [5, 4], [7, 4], [9, 4], [21, 4], [23, 4], [25, 4], [27, 4]].forEach(([x, y], k) => prop(p, x, y, 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 228, 238], ballItem([BALLS[k], BALLS[k], BALLS[(k + 5) % 10]]), k)));
    [[11, 12], [21, 12], [8, 14], [24, 14], [8, 18], [24, 18], [11, 20], [21, 20]].forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => showcase(c, top, X, Y, 16, (cc, gx, gy) => ball(cc, gx, gy - 1, 5, BALLS[(k + 2) % 10]), RED)));
    [[3, 11], [26, 11], [3, 21], [26, 21]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => caseOf(c, top, X, Y, 48, [0, 1, 2].map((n) => (cc, gx, gy) => ball(cc, gx, gy - 1, 4, BALLS[(k * 3 + n) % 10])), [70, 74, 96])));
    // Capsule machines, and stock in crates.
    wide(p, [[3, 15], [27, 15]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 15, 4, [0, 0, 0, 60]); c.box(X + 3, Y + 8, 26, 22, RED, [130, 30, 34]); c.rect(X + 10, Y + 20, 12, 7, INK); c.ellipse(X + 23, Y + 14, 2, 2, WHITE); top.box(X + 3, Y - 14, 26, 23, [200, 230, 244, 150], [120, 150, 170]); for (let k = 0; k < 9; k++) ball(top, X + 9 + (k % 3) * 7, Y - 8 + ((k / 3) | 0) * 7, 3, BALLS[(k * 3 + X) % 10]); });
    one(p, [[2, 23], [3, 23], [29, 23], [28, 23], [12, 4], [20, 4]], (c, top, X, Y) => { crate(c, X, Y, [226, 200, 150]); ball(c, X + 8, Y + 8, 3); });
    one(p, [[2, 5], [29, 5]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
// Juice Shoppe: a bright juice bar. Dispensers behind the counter, crates of Berries, tables on the fruit-slice rugs.
function slice(c, cx, cy, r, rind, flesh) { c.ellipse(cx, cy, r, r * 0.62, rind); c.ellipse(cx, cy, r - 3, r * 0.62 - 2, [255, 250, 230]); c.ellipse(cx, cy, r - 5, r * 0.62 - 3, flesh); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; c.line(cx, cy, cx + Math.cos(t) * (r - 5), cy + Math.sin(t) * (r * 0.62 - 3), [255, 250, 230], 1); } c.ellipse(cx, cy, 3, 2, [255, 250, 230]); }
function berryCrate(c, top, X, Y, col) { crate(c, X, Y, [200, 160, 100]); for (const [dx, dy] of [[4, 1], [8, 0], [12, 2], [6, 4], [10, 4]]) { c.ellipse(X + dx, Y + dy, 2.5, 2.5, col); c.p(X + dx - 1, Y + dy - 1, lt(col, 0.6)); } }
PLANS.KalosJuiceShoppe = shop({
  ground(p, c, yb) {
    const OR = [250, 160, 70], LIME = [170, 220, 90];
    planks(p, c, [240, 214, 160]);
    shopWall(p, c, yb, OR, { stripe: [252, 184, 100], gap: 16, sw: 8, panel: [255, 250, 236], top: LIME, skirt: [200, 110, 40] });
    for (const [x, col] of [[3, [236, 80, 90]], [6, [250, 200, 70]], [24, [150, 100, 200]], [27, [110, 190, 110]]]) { c.ellipse(x * T + 8, 28, 17, 17, WHITE); c.ellipse(x * T + 8, 28, 15, 15, lt(col, 0.6)); c.ellipse(x * T + 8, 30, 9, 9, col); c.ellipse(x * T + 5, 27, 3, 3, lt(col, 0.5)); c.poly([[x * T + 8, 21], [x * T + 14, 16], [x * T + 10, 22]], [90, 170, 90]); }
    chalkboard(c, 9 * T, 8, 5 * T, 40, [60, 50, 70], WHITE); chalkboard(c, 18 * T, 8, 5 * T, 40, [60, 50, 70], WHITE);
    c.box(14 * T + 4, 6, 3 * T + 8, 44, WHITE, LIME); c.rect(15 * T + 4, 14, 24, 28, [200, 226, 240]); c.rect(15 * T + 6, 22, 20, 20, OR); c.rect(15 * T + 22, 8, 2, 16, [226, 60, 60]); c.ellipse(15 * T + 8, 14, 5, 3, LIME);
    slice(c, 7 * T + 8, 15 * T + 8, 50, OR, [252, 196, 110]); slice(c, 25 * T + 8, 15 * T + 8, 50, [130, 190, 70], [200, 236, 130]); slice(c, 16 * T + 8, 20 * T, 34, [236, 100, 110], [250, 170, 170]);
  },
  fit(p) {
    const OR = [250, 160, 70], LIME = [170, 220, 90], JU = [[250, 160, 70], [236, 80, 110], [150, 100, 200], [110, 190, 110], [250, 220, 90], [110, 170, 240]];
    tillRow(p, 10, 22, 8, [16], [252, 250, 240], LIME, (c, top, X, Y, w, k) => { for (let n = 0; n < 3; n++) { const x = X + 8 + n * 14 + (k ? 40 : 0); top.box(x, Y - 12, 8, 9, [220, 240, 250, 170], [120, 150, 170]); top.rect(x + 1, Y - 8, 6, 5, JU[(n + k * 3) % 6]); top.box(x - 1, Y - 3, 10, 4, [70, 74, 92], INK); } if (k) tillBox(top, X + 6, Y, [226, 110, 60]); else { c.ellipse(X + 70, Y - 1, 9, 3, [176, 128, 80]); for (const [dx, col] of [[65, OR], [70, [236, 80, 110]], [75, LIME]]) top.ellipse(X + dx, Y - 4, 3, 3, col); } });
    one(p, [[11, 9], [13, 9], [19, 9], [21, 9]], (c, top, X, Y) => stool(c, top, X, Y, (X >> 5) & 1 ? OR : LIME));
    JU.forEach((col, k) => prop(p, 11 + k * 2, 4, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, col)));
    wide(p, [[24, 4]], 2, 1, (c, top, X, Y) => { c.box(X + 2, Y - 14, 28, 29, [236, 240, 246], [120, 126, 146]); c.rect(X + 15, Y - 13, 1, 27, [120, 126, 146]); c.rect(X + 12, Y - 4, 2, 8, [150, 156, 176]); c.rect(X + 18, Y - 4, 2, 8, [150, 156, 176]); c.rect(X + 4, Y - 12, 9, 2, WHITE); });
    [[3, 5, 0], [4, 5, 1], [5, 5, 3], [3, 6, 2], [27, 5, 4], [28, 5, 5], [28, 6, 1], [2, 22, 3], [3, 22, 0], [2, 21, 2], [29, 22, 2], [28, 22, 5]].forEach(([x, y, k]) => prop(p, x, y, 1, 1, (c, top, X, Y) => berryCrate(c, top, X, Y, JU[k])));
    [[6, 15, 0], [24, 15, 3], [3, 10, 1], [26, 10, 4], [10, 21, 2], [20, 21, 5]].forEach(([x, y, k]) => prop(p, x, y, 3, 1, (c, top, X, Y) => cafeSet(c, top, X, Y, { table: WHITE, chair: k % 2 ? LIME : OR, on: (cc, gx, gy) => { for (const dx of [-4, 4]) { cc.rect(gx + dx - 2, gy - 5, 4, 6, JU[(k + (dx > 0)) % 6]); cc.rect(gx + dx - 2, gy - 5, 4, 1, WHITE); cc.rect(gx + dx + 1, gy - 8, 1, 3, [226, 60, 60]); } } })));
    one(p, [[8, 4], [29, 13], [2, 13]], (c, top, X, Y) => plant(c, top, X, Y, [110, 190, 90]));
  },
});
// Loto-ID Center: the draw board over the counter, two drums of numbered balls, a roped queue, prizes under glass.
PLANS.KalosLumioseLoto = shop({
  ground(p, c, yb) {
    const NAVY = [36, 56, 124], RED = [200, 50, 60];
    carpet(p, c, NAVY); speckle(p, c, 70, p.left, p.top + 2, p.right, p.bottom, 8, (x, y, r) => star(c, x, y, r > 0.6 ? GOLD : [120, 150, 220], r > 0.8 ? 2 : 1));
    shopWall(p, c, yb, [28, 36, 92], { stripe: [40, 50, 112], gap: 12, sw: 4, top: GOLD, skirt: GOLD });
    for (let x = p.left * T + 6; x < (p.right + 1) * T; x += 12) c.ellipse(x, 8, 2, 2, (x / 12 | 0) % 2 ? [255, 240, 150] : WHITE);
    // The draw board.
    const X = 10 * T + 8, Y = 14; c.box(X, Y, 12 * T, 40, [16, 18, 40], GOLD); c.rect(X + 4, Y + 4, 12 * T - 8, 7, RED); for (let k = X + 10; k < X + 12 * T - 12; k += 9) c.rect(k, Y + 6, 5, 3, GOLD);
    for (let k = 0; k < 5; k++) { const x = X + 14 + k * 34; c.box(x, Y + 15, 26, 20, WHITE, [120, 126, 146]); const col = BALLS[(k * 3 + 1) % 10]; c.rect(x + 9, Y + 18, 8, 2, col); c.rect(x + (k % 2 ? 9 : 15), Y + 18, 2, 14, col); c.rect(x + 9, Y + 24, 8, 2, col); c.rect(x + 9, Y + 30, 8, 2, col); if (k % 3 === 0) c.rect(x + (k % 2 ? 15 : 9), Y + 24, 2, 8, col); }
    for (const x of [4, 25]) { c.box(x * T, 16, 3 * T, 36, [250, 244, 220], GOLD); ball(c, x * T + 24, 30, 8, x === 4 ? BALLS[9] : BALLS[2]); c.rect(x * T + 8, 44, 32, 2, RED); star(c, x * T + 8, 22, GOLD); star(c, x * T + 40, 24, GOLD); }
    rug(c, 15, 10, 17, 22, RED, GOLD);
  },
  fit(p) {
    const RED = [200, 50, 60];
    tillRow(p, 11, 21, 8, [16], RED, GOLD, (c, top, X, Y, w, k) => { tillBox(top, X + (k ? 60 : 8), Y); papers(c, X + (k ? 12 : 56), Y - 1, 4); papers(c, X + (k ? 30 : 38), Y - 1, 2); });
    // The drums.
    wide(p, [[5, 5], [25, 5]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 15, 4, [0, 0, 0, 60]); c.box(X + 5, Y + 14, 22, 16, RED, [110, 20, 30]); c.rect(X + 6, Y + 15, 20, 2, GOLD); c.rect(X + 12, Y + 22, 8, 5, INK); c.rect(X + 27, Y + 4, 4, 2, GOLD); c.rect(X + 30, Y + 4, 2, 8, GOLD); top.ellipse(X + 16, Y, 15, 15, [200, 230, 244, 140]); top.ellipse(X + 16, Y, 15, 15, [120, 150, 170], 1); for (let k = 0; k < 12; k++) { const a = k * 1.9, r = 3 + (k * 5) % 9; top.ellipse(X + 16 + Math.cos(a) * r, Y + 3 + Math.sin(a) * r * 0.8, 2.5, 2.5, BALLS[(k * 3) % 10]); } top.line(X + 7, Y - 8, X + 12, Y - 11, [255, 255, 255, 200]); });
    // The roped queue.
    for (const x of [14, 18]) prop(p, x, 11, 1, 10, (c, top, X, Y) => { c.rect(X + 7, Y + 6, 2, 9 * T, [150, 30, 40]); c.rect(X + 8, Y + 6, 1, 9 * T, [226, 90, 90]); for (let k = 0; k <= 9; k += 3) { const y = Y + k * T; c.ellipse(X + 8, y + 14, 5, 2, [0, 0, 0, 60]); c.rect(X + 7, y + 2, 2, 12, GOLD); c.ellipse(X + 8, y + 2, 2, 2, lt(GOLD, 0.4)); c.rect(X + 4, y + 13, 8, 2, dk(GOLD, 0.3)); } });
    [[4, 11], [26, 11], [4, 15], [26, 15]].forEach(([x, y], k) => prop(p, x, y, 2, 1, (c, top, X, Y) => caseOf(c, top, X, Y, 32, [(cc, gx, gy) => ball(cc, gx, gy - 1, 4, BALLS[(k * 2 + 9) % 10]), (cc, gx, gy) => (k % 2 ? gem(cc, gx, gy, EVO[k]) : (cc.ellipse(gx, gy, 4, 3, GOLD), cc.ellipse(gx - 1, gy - 1, 2, 1, lt(GOLD, 0.5))))], [150, 110, 40])));
    wide(p, [[8, 19], [22, 19]], 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [200, 60, 70], [250, 220, 110]));
    wide(p, [[8, 11], [22, 11]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [150, 110, 40]));
    wide(p, [[4, 21], [25, 21]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [200, 50, 60])); one(p, [[8, 22], [23, 22]], (c, top, X, Y) => plant(c, top, X, Y));
    // Balloons in the corners.
    one(p, [[2, 5], [29, 5], [2, 23], [29, 23], [10, 4], [22, 4]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 5, Y + 10, 6, 5, [90, 96, 130], INK); for (const [dx, dy, k] of [[3, -10, 0], [12, -12, 1], [8, -18, 2]]) { top.line(X + 8, Y + 10, X + dx, Y + dy + 5, [226, 226, 236]); top.ellipse(X + dx, Y + dy, 4, 5, [RED, GOLD, [110, 170, 240]][(k + (X >> 4)) % 3]); top.p(X + dx - 1, Y + dy - 2, WHITE); } });
  },
});
// The Museum's annex gallery: parquet, white walls close-hung with pictures, sculpture and a postcard stand.
function galleryWall(c, top, X, Y, tone, a, b) { c.ellipse(X + 32, Y + 14, 32, 3, [0, 0, 0, 50]); c.box(X, Y + 2, 64, 13, dk(tone, 0.2), dk(tone, 0.6)); top.box(X, Y - 20, 64, 23, lt(tone, 0.2), dk(tone, 0.6)); picture(top, X + 4, Y - 17, 26, 18, a, GOLD); picture(top, X + 34, Y - 17, 26, 18, b, GOLD); }
PLANS.KalosLumioseMuseumShop = shop({
  ground(p, c, yb) {
    parquet(p, c, [206, 166, 112]);
    shopWall(p, c, yb, [242, 240, 234], { panel: [196, 200, 210], top: [150, 156, 176], skirt: [110, 116, 136] });
    c.box(12 * T, 4, 9 * T, 46, GOLD, dk(GOLD, 0.5)); c.rect(12 * T + 4, 8, 9 * T - 8, 38, [70, 100, 150]); c.rect(12 * T + 4, 30, 9 * T - 8, 16, [80, 130, 100]); c.ellipse(14 * T, 18, 7, 7, [250, 230, 150]); c.poly([[16 * T, 46], [17 * T, 14], [17 * T + 4, 14], [18 * T + 4, 46]], [200, 206, 226]); c.rect(17 * T, 8, 4, 8, [200, 206, 226]); for (let k = 0; k < 5; k++) c.rect(16 * T + 8 + k * 2, 22 + k * 5, 14 - k * 2 + k * 3, 1, [110, 116, 150]);
    [3, 6, 9, 22, 25, 28].forEach((x, k) => picture(c, x * T - 6, k % 2 ? 8 : 14, 30, k % 2 ? 34 : 26, ARTS[(k * 3 + 1) % 8], k % 3 ? GOLD : [60, 50, 50]));
    rug(c, 14, 6, 18, 22, [60, 120, 120], [226, 226, 236]);
    for (const [x, y] of [[11, 13], [21, 13]]) { c.ellipse(x * T + 8, y * T + 12, 26, 14, [150, 156, 176, 90]); }
  },
  fit(p) {
    const TONE = [226, 224, 216];
    [[4, 10], [24, 10], [4, 16], [24, 16]].forEach(([x, y], k) => prop(p, x, y, 4, 1, (c, top, X, Y) => galleryWall(c, top, X, Y, TONE, ARTS[(k * 2 + 2) % 8], ARTS[(k * 2 + 5) % 8])));
    // Sculpture.
    wide(p, [[11, 13], [21, 13]], 1, 1, (c, top, X, Y, a) => { shadow(c, X, Y); c.box(X + 1, Y + 6, 14, 9, [236, 236, 240], [120, 116, 136]); const col = X < 200 ? [226, 90, 80] : [80, 130, 220]; top.ellipse(X + 8, Y - 4, 6, 10, col); top.ellipse(X + 8, Y - 4, 3, 6, [236, 236, 240]); top.ellipse(X + 11, Y - 14, 4, 4, GOLD); top.rect(X + 6, Y + 4, 4, 3, dk(col, 0.3)); });
    one(p, [[11, 7], [21, 7], [3, 21], [28, 21]], (c, top, X, Y) => statue(c, top, X, Y, [214, 212, 220]));
    [[8, 20], [22, 20]].forEach(([x, y], k) => prop(p, x, y, 2, 1, (c, top, X, Y) => caseOf(c, top, X, Y, 32, k ? [(cc, gx, gy) => ammonite(cc, gx, gy, 5), (cc, gx, gy) => crystal(cc, gx, gy + 5, [130, 200, 240], 0.7)] : [(cc, gx, gy) => { cc.ellipse(gx, gy, 4, 5, [226, 200, 150]); cc.rect(gx - 2, gy - 7, 4, 3, [150, 110, 70]); }, (cc, gx, gy) => megaStone([240, 130, 110])(cc, gx, gy)], [110, 96, 90])));
    wide(p, [[11, 22], [20, 22]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [110, 76, 50]));
    one(p, [[13, 5], [15, 5], [17, 5], [19, 5]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 2, 2, 12, GOLD); c.ellipse(X + 8, Y + 2, 2, 2, GOLD); c.rect(X + 4, Y + 13, 8, 2, dk(GOLD, 0.3)); if (X < 19 * T) c.rect(X + 9, Y + 5, 23, 2, [150, 40, 50]); });
    // Postcards and catalogues.
    wide(p, [[26, 5]], 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y - 10, 2, 24, [120, 124, 140]); c.rect(X + 3, Y + 13, 10, 2, [90, 94, 110]); for (let r = 0; r < 3; r++) for (const dx of [1, 9]) top.box(X + dx, Y - 14 + r * 7, 6, 6, ARTS[(r * 2 + dx) % 8].sky, [90, 94, 110]); });
    wide(p, [[4, 5]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [110, 76, 50]); for (let k = 0; k < 4; k++) c.box(X + 5 + k * 10, Y + 3, 8, 7, ARTS[(k * 3) % 8].sky, [90, 70, 60]); });
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
// PR Video Studio: the set fills the back of the room (a backdrop of the city on its stage); cameras, lamps, a mixing
// desk, a make-up table and a rail of costumes stand round the floor.
PLANS.KalosPRVideoStudio = shop({
  rows: 1,
  ground(p, c, yb) {
    tiled(p, c, [72, 74, 88], [78, 80, 94]);
    wall(c, p.left, 0, p.right, 2, [40, 42, 58], { stripe: [48, 50, 68], gap: 16, sw: 2, top: [90, 94, 116], skirt: [24, 24, 34] });
    // The lighting rig.
    c.rect(p.left * T, 4, 28 * T, 2, [130, 134, 154]); for (let x = 3 * T; x < 29 * T; x += 28) { c.box(x, 6, 10, 7, [60, 62, 76], INK); c.rect(x + 2, 11, 6, 2, (x / 28 | 0) % 3 ? [255, 244, 190] : [250, 150, 190]); }
    // The backdrop: Lumiose at dusk.
    const X = 5 * T, W = 22 * T; c.box(X - 3, 14, W + 6, 68, [30, 30, 40], [130, 134, 154]);
    for (let y = 0; y < 62; y += 2) c.rect(X, 17 + y, W, 2, mix([70, 60, 130], [250, 170, 130], y / 62));
    for (let x = X; x < X + W; x += 9) { const h = 10 + p.hash(x, 3, 5) * 26; c.rect(x, 79 - h, 8, h, [50, 44, 86]); if (p.hash(x, 4, 5) < 0.7) c.rect(x + 2, 83 - h, 2, 2, [255, 230, 140]); if (p.hash(x, 5, 5) < 0.5) c.rect(x + 5, 89 - h, 2, 2, [255, 230, 140]); }
    const tx = 16 * T; c.poly([[tx - 14, 79], [tx - 3, 30], [tx + 3, 30], [tx + 14, 79]], [40, 36, 76]); c.poly([[tx - 7, 79], [tx - 1, 40], [tx + 1, 40], [tx + 7, 79]], [90, 80, 140]); c.rect(tx - 1, 20, 2, 12, [40, 36, 76]); glow(c, tx, 22, 10, [255, 240, 150], 50); c.rect(tx - 8, 54, 16, 2, [40, 36, 76]);
    for (const x of [X - 3, X + W - 2]) c.rect(x, 14, 5, 68, [130, 134, 154]);
    // The stage.
    c.rect(X - 6, 80, W + 12, 12, [176, 128, 80]); for (let x = X - 6; x < X + W + 6; x += 14) c.rect(x, 80, 1, 12, [130, 88, 54]); c.rect(X - 6, 80, W + 12, 2, [214, 170, 120]); c.rect(X - 6, 91, W + 12, 5, [60, 44, 40]); for (let x = X + 6; x < X + W; x += 24) { c.rect(x, 88, 6, 4, INK); c.rect(x + 1, 87, 4, 2, [255, 244, 190]); }
    // Marks and cables on the floor.
    for (const [x, y] of [[16, 10], [12, 11], [20, 11]]) { c.rect(x * T + 3, y * T + 7, 10, 2, [250, 220, 70]); c.rect(x * T + 7, y * T + 3, 2, 10, [250, 220, 70]); }
    c.line(12 * T + 8, 11 * T, 14 * T, 14 * T, [30, 30, 40], 1); c.line(14 * T, 14 * T, 25 * T, 13 * T + 8, [30, 30, 40], 1); c.line(20 * T + 8, 11 * T, 25 * T, 12 * T + 8, [30, 30, 40], 1);
  },
  fit(p) {
    one(p, [[12, 10], [20, 10]], (c, top, X, Y) => camera(c, top, X, Y));
    one(p, [[3, 5], [28, 5], [8, 8], [24, 8]], (c, top, X, Y) => spotlight(c, top, X, Y));
    one(p, [[2, 3], [3, 3], [29, 3], [28, 3], [29, 4]], (c, top, X, Y) => crate(c, X, Y, [70, 74, 92]));
    // The mixing desk.
    wide(p, [[25, 12]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 60]); c.box(X, Y + 2, 32, 28, [90, 94, 116], INK); c.rect(X + 2, Y + 4, 28, 12, [40, 42, 58]); for (let k = 0; k < 6; k++) { c.rect(X + 4 + k * 4, Y + 6, 1, 8, [130, 134, 154]); c.rect(X + 3 + k * 4, Y + 7 + (k * 3) % 5, 3, 2, [[250, 220, 70], [240, 90, 90], [110, 220, 200]][k % 3]); } c.rect(X + 2, Y + 18, 28, 2, [150, 154, 170]); for (const dx of [1, 17]) { top.box(X + dx, Y - 12, 14, 12, [40, 42, 58], INK); top.rect(X + dx + 2, Y - 10, 10, 7, dx === 1 ? [250, 170, 130] : [110, 170, 240]); } });
    one(p, [[25, 14]], (c, top, X, Y) => salonChair(c, top, X, Y, [50, 52, 64]));
    // Make-up.
    wide(p, [[3, 10]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [236, 226, 230]); for (const [dx, col] of [[8, [240, 120, 150]], [16, [250, 220, 180]], [38, [200, 80, 90]]]) c.rect(X + dx, Y + 2, 3, 5, col); top.box(X + 6, Y - 24, 36, 24, [250, 240, 214], [150, 110, 60]); mirror(top, X + 10, Y - 21, 28, 18, [226, 226, 236]); for (let k = 0; k < 5; k++) { top.ellipse(X + 9 + k * 7.5, Y - 22, 1.5, 1.5, [255, 240, 150]); } });
    one(p, [[4, 11]], (c, top, X, Y) => stool(c, top, X, Y, [240, 120, 150]));
    wide(p, [[3, 15]], 4, 1, (c, top, X, Y) => rail(c, top, X, Y, 64, [[236, 90, 110], [250, 210, 70], [90, 150, 236], [240, 240, 244], [150, 90, 200], [60, 60, 70]]));
    // Rolls of backdrop paper, and the green-room sofa.
    wide(p, [[3, 20]], 2, 1, (c, top, X, Y) => { c.ellipse(X + 16, Y + 14, 15, 3, [0, 0, 0, 60]); [[110, 200, 120], [240, 130, 170], [240, 240, 244], [90, 150, 236]].forEach((col, k) => { c.box(X + 1 + k * 7, Y - 14 + k * 2, 8, 29 - k * 2, col, dk(col, 0.5)); c.ellipse(X + 5 + k * 7, Y - 14 + k * 2, 4, 2, lt(col, 0.4)); }); });
    wide(p, [[23, 19]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [150, 60, 110]));
    wide(p, [[23, 21]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [60, 62, 76]); c.box(X + 8, Y + 2, 14, 9, INK, WHITE); for (let k = 0; k < 3; k++) c.poly([[X + 9 + k * 4, Y + 2], [X + 12 + k * 4, Y + 2], [X + 10 + k * 4, Y + 5]], WHITE); cup(c, X + 34, Y + 7); });
    wide(p, [[27, 17]], 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [60, 62, 76], [250, 170, 130]));
    one(p, [[13, 14], [19, 14]], (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 3, Y + 14, X + 12, Y + 2, [90, 66, 50]); c.line(X + 13, Y + 14, X + 4, Y + 2, [90, 66, 50]); c.rect(X + 3, Y + 6, 10, 3, [226, 60, 60]); top.rect(X + 3, Y - 6, 10, 6, [226, 60, 60]); top.rect(X + 3, Y - 6, 1, 12, [90, 66, 50]); top.rect(X + 12, Y - 6, 1, 12, [90, 66, 50]); });
    one(p, [[2, 23], [29, 23], [29, 9]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
// Lumiose Press: the newsroom. Rows of reporters' desks, the editor's desk at the back, the press and its bundles.
function frontPage(c, x, y, w, h) { c.box(x, y, w, h, [244, 240, 226], [70, 66, 60]); c.rect(x + 3, y + 3, w - 6, 4, INK); c.rect(x + 3, y + 9, (w - 6) / 2 - 1, h / 3, [150, 156, 170]); for (let k = y + 9; k < y + h - 3; k += 3) c.rect(x + w / 2 + 1, k, w / 2 - 4, 1, [110, 110, 120]); for (let k = y + 11 + h / 3; k < y + h - 3; k += 3) c.rect(x + 3, k, w / 2 - 4, 1, [110, 110, 120]); }
function bundle(c, top, X, Y) { shadow(c, X, Y); for (let k = 0; k < 4; k++) c.box(X + 2, Y + 10 - k * 4, 12, 5, k % 2 ? [236, 230, 214] : [244, 240, 230], [130, 126, 120]); c.rect(X + 7, Y - 2, 2, 17, [200, 90, 60]); c.rect(X + 4, Y, 8, 1, INK); }
PLANS.KalosLumiosePress = shop({
  ground(p, c, yb) {
    tiled(p, c, [124, 138, 162], [132, 146, 170]);
    shopWall(p, c, yb, [232, 230, 222], { panel: [150, 156, 170], top: [90, 96, 116], skirt: [90, 96, 116] });
    for (const x of [3, 25]) blinds(c, x * T, 10, 4 * T, 36);
    cork(c, 8 * T, 8, 5 * T, 40, 3); for (const [x, y] of [[14, 8], [16.5, 12], [19, 8]]) frontPage(c, x * T, y, 30, 36);
    c.ellipse(23 * T, 24, 9, 9, INK); c.ellipse(23 * T, 24, 8, 8, WHITE); c.rect(23 * T, 18, 1, 6, INK); c.rect(23 * T, 24, 4, 1, INK);
    rug(c, 15, 9, 17, 22, [90, 100, 130], [200, 206, 226]);
  },
  fit(p) {
    const WOOD = [150, 108, 70], DESK = [200, 204, 216];
    wide(p, [[14, 5]], 5, 1, (c, top, X, Y) => { desk(c, top, X, Y, 80, WOOD); papers(c, X + 60, Y + 3, 4); c.rect(X + 22, Y + 9, 12, 3, GOLD); });
    [[4, 9], [9, 9], [21, 9], [26, 9], [4, 13], [9, 13], [21, 13], [26, 13]].forEach(([x, y], k) => { prop(p, x, y, 3, 1, (c, top, X, Y) => { desk(c, top, X, Y, 48, DESK, k % 3 ? [110, 200, 240] : [236, 236, 244]); papers(c, X + 36, Y + 4, 1 + k % 3); if (k % 2) cup(c, X + 6, Y + 6); }); prop(p, x + 1, y + 1, 1, 1, (c, top, X, Y) => salonChair(c, top, X, Y, [70, 80, 110])); });
    one(p, [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [24, 4], [25, 4], [26, 4], [27, 4], [28, 4]], (c, top, X, Y) => cabinet(c, X, Y, [150, 156, 170], (X >> 4) % 4 === 1));
    // The press.
    wide(p, [[21, 18]], 7, 3, (c, top, X, Y) => {
      c.ellipse(X + 56, Y + 46, 56, 4, [0, 0, 0, 60]); c.box(X, Y - 8, 112, 54, [96, 104, 124], INK); c.rect(X + 1, Y - 7, 110, 3, [150, 156, 176]);
      for (let k = 0; k < 4; k++) { const x = X + 16 + k * 20; c.ellipse(x, Y + 14, 9, 9, INK); c.ellipse(x, Y + 14, 7, 7, [170, 174, 190]); c.ellipse(x, Y + 14, 3, 3, [60, 62, 76]); c.rect(x - 7, Y + 12, 14, 1, [230, 230, 236]); }
      c.rect(X + 6, Y + 4, 84, 3, [244, 240, 230]); c.rect(X + 6, Y + 24, 84, 3, [244, 240, 230]); c.box(X + 90, Y + 2, 18, 28, [60, 62, 76], INK); c.rect(X + 93, Y + 5, 12, 6, [110, 230, 200]); for (let k = 0; k < 3; k++) c.rect(X + 93 + k * 4, Y + 15, 3, 3, [[240, 90, 90], [250, 220, 70], [110, 220, 200]][k]);
      c.rect(X + 4, Y + 34, 104, 2, [250, 210, 70]); for (let x = X + 4; x < X + 108; x += 8) c.rect(x, Y + 34, 4, 2, INK); for (let k = 0; k < 4; k++) c.box(X + 8 + k * 14, Y + 38, 12, 6, [244, 240, 230], [130, 126, 120]);
    });
    one(p, [[3, 19], [4, 19], [3, 20], [5, 20], [3, 22], [4, 22], [19, 20], [19, 21]], (c, top, X, Y) => bundle(c, top, X, Y));
    wide(p, [[8, 19]], 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [226, 226, 236], [110, 200, 240]));
    wide(p, [[8, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [90, 100, 130]));
    // The water cooler.
    one(p, [[11, 4], [21, 4]], (c, top, X, Y) => { c.box(X + 3, Y, 10, 15, [226, 226, 236], [120, 126, 146]); c.rect(X + 6, Y + 5, 2, 2, [240, 90, 90]); c.rect(X + 9, Y + 5, 2, 2, [110, 170, 240]); top.box(X + 4, Y - 12, 8, 12, [150, 206, 244, 200], [90, 130, 170]); top.rect(X + 6, Y - 10, 1, 8, [230, 244, 255]); });
    one(p, [[2, 4], [29, 4], [2, 23], [12, 22]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});

// ---------------------------------------------------------------- Lumiose: the salons
// A styling station against the back wall (2 tiles wide, 2 deep): the shelf under its mirror, and the chair.
function stylingStation(c, top, X, Y, col) { table(c, X + 2, Y - 2, 28, 14, [236, 232, 240]); for (const [dx, k] of [[6, [240, 120, 150]], [11, [130, 200, 220]], [22, [250, 220, 130]]]) { c.rect(X + dx, Y - 3, 3, 5, k); c.rect(X + dx + 1, Y - 5, 1, 2, INK); } salonChair(c, top, X + 8, Y + 16, col); }
function bulbMirror(c, x, y, w, h, edge = WHITE) { mirror(c, x, y, w, h, edge); for (let k = x + 3; k < x + w - 1; k += 6) { c.ellipse(k, y - 2, 1.5, 1.5, [255, 240, 150]); c.ellipse(k, y + h + 1, 1.5, 1.5, [255, 240, 150]); } }
// Two chairs under hood dryers (2 x 2 tiles).
function dryers(c, top, X, Y, col) { for (const dx of [0, 16]) { salonChair(c, top, X + dx, Y + 16, col); c.rect(X + dx + 7, Y - 4, 2, 12, [170, 174, 190]); top.ellipse(X + dx + 8, Y + 3, 7, 6, [226, 228, 238]); top.ellipse(X + dx + 8, Y + 5, 5, 3, [150, 156, 176]); top.rect(X + dx + 6, Y - 10, 4, 8, [190, 194, 210]); } }
// Coiffure Clips: black and white tiles, pink walls, a row of mirrors with their chairs.
PLANS.KalosCoiffureClips = shop({
  ground(p, c, yb) {
    const PINK = [226, 110, 150];
    tiled(p, c, [52, 50, 60], [240, 240, 244]);
    shopWall(p, c, yb, [246, 204, 216], { panel: [252, 246, 248], top: PINK, skirt: [150, 60, 90] });
    for (const x of [4, 8, 12, 19, 22]) bulbMirror(c, x * T + 2, 12, 28, 32);
    // The scissors over the desk.
    const X = 15 * T + 4, Y = 10; c.box(X, Y, 40, 36, PINK, [150, 60, 90]); c.line(X + 10, Y + 6, X + 26, Y + 26, WHITE, 2); c.line(X + 30, Y + 6, X + 14, Y + 26, WHITE, 2); c.ellipse(X + 12, Y + 28, 4, 4, WHITE, 2); c.ellipse(X + 28, Y + 28, 4, 4, WHITE, 2); c.p(X + 20, Y + 16, INK);
    rug(c, 14, 10, 18, 22, [236, 150, 180], WHITE);
  },
  fit(p) {
    const PINK = [226, 110, 150], BLK = [50, 48, 58];
    wide(p, [[4, 4], [8, 4], [12, 4], [19, 4], [22, 4]], 2, 2, (c, top, X, Y) => stylingStation(c, top, X, Y, PINK));
    // Where the cabinets stood: shelves of lotions, and the hood dryers.
    wide(p, [[25, 4]], 2, 3, (c, top, X, Y) => { c.ellipse(X + 16, Y + 46, 16, 3, [0, 0, 0, 60]); rack(c, X, Y, 32, [240, 232, 240], jarItem([[240, 120, 150], [130, 200, 220], [250, 220, 130], [170, 130, 220]]), 2); c.box(X, Y + 15, 32, 32, [240, 232, 240], [140, 120, 140]); for (let r = 0; r < 2; r++) for (const dx of [2, 17]) { c.box(X + dx, Y + 18 + r * 14, 13, 12, WHITE, [170, 150, 170]); c.rect(X + dx + 4, Y + 23 + r * 14, 5, 1, PINK); } });
    wide(p, [[5, 12], [25, 12]], 2, 2, (c, top, X, Y) => dryers(c, top, X, Y, BLK));
    wide(p, [[18, 8]], 3, 1, (c, top, X, Y) => { counter(c, X, Y, 48, BLK, PINK); tillBox(top, X + 30, Y); top.rect(X + 10, Y - 8, 3, 7, [200, 226, 240]); top.ellipse(X + 11, Y - 10, 3, 3, PINK); });
    // The basins.
    wide(p, [[26, 17], [26, 20]], 3, 1, (c, top, X, Y) => { c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 55]); c.box(X + 30, Y - 4, 18, 19, [240, 240, 244], [130, 134, 150]); c.ellipse(X + 39, Y + 3, 6, 4, [150, 200, 230]); c.rect(X + 38, Y - 6, 2, 5, [170, 174, 190]); c.box(X, Y + 4, 30, 9, BLK, INK); c.box(X, Y - 3, 8, 9, lt(BLK, 0.15), INK); c.rect(X + 2, Y + 5, 26, 2, lt(BLK, 0.3)); });
    // Waiting: a sofa, magazines.
    wide(p, [[3, 18]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, PINK)); wide(p, [[3, 20]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [240, 240, 244]); for (let k = 0; k < 3; k++) c.box(X + 6 + k * 13, Y + 3, 9, 7, [[240, 120, 150], [130, 200, 220], [250, 220, 130]][k], INK); });
    wide(p, [[7, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, PINK));
    // The towel trolley and the pole.
    one(p, [[10, 9], [22, 9]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 2, Y, 12, 13, [190, 194, 210], [110, 114, 130]); c.rect(X + 3, Y + 6, 10, 1, [110, 114, 130]); for (let k = 0; k < 3; k++) c.rect(X + 3 + k * 3, Y + 1, 3, 4, k % 2 ? WHITE : [246, 204, 216]); c.rect(X + 3, Y + 13, 2, 2, INK); c.rect(X + 11, Y + 13, 2, 2, INK); });
    one(p, [[13, 21], [19, 21]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 4, Y + 11, 8, 4, [190, 194, 210], INK); top.box(X + 5, Y - 12, 6, 24, WHITE, INK); for (let k = 0; k < 6; k++) top.line(X + 6, Y - 10 + k * 4, X + 9, Y - 8 + k * 4, k % 2 ? [226, 60, 60] : [70, 120, 220]); top.ellipse(X + 8, Y - 13, 4, 2, [190, 194, 210]); });
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23], [16, 4]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
// Friseur Furfrou: the Pokémon groomer. Grooming tables with a Furfrou on each, tubs, ribbons, the trims framed on the wall.
function furfrou(c, x, y, trim, s = 1) {
  const W = [250, 250, 252], D = [214, 216, 228]; for (const dx of [-5, -2, 3, 6]) c.rect(x + dx * s, y, 2 * s, 5 * s, D);
  c.ellipse(x, y - 2 * s, 8 * s, 4.5 * s, W); c.ellipse(x - 8 * s, y - 5 * s, 2.5 * s, 2.5 * s, trim || W); c.ellipse(x + 7 * s, y - 7 * s, 4 * s, 4 * s, W); c.ellipse(x + 7 * s, y - 11 * s, 3 * s, 2.5 * s, trim || W); c.rect(x + 10 * s, y - 7 * s, 3 * s, 2 * s, W); c.p(x + 12 * s, y - 7 * s, INK); c.p(x + 8 * s, y - 8 * s, INK);
  if (trim) for (const dx of [-5, -2, 3, 6]) c.rect(x + dx * s, y + 3 * s, 2 * s, 2 * s, trim);
}
PLANS.KalosFriseurFurfrou = shop({
  ground(p, c, yb) {
    const PINK = [240, 150, 180];
    carpet(p, c, [248, 222, 230]); speckle(p, c, 46, p.left, p.top + 2, p.right, p.bottom, 5, (x, y) => { c.ellipse(x, y + 2, 3, 2.5, [255, 255, 255, 190]); for (const dx of [-3, 0, 3]) c.ellipse(x + dx, y - 2 - (dx ? 0 : 1), 1.2, 1.2, [255, 255, 255, 190]); });
    shopWall(p, c, yb, [252, 240, 230], { stripe: [248, 208, 220], gap: 12, sw: 4, panel: WHITE, top: PINK, skirt: [200, 110, 140] });
    const TR = [[240, 130, 170], [110, 170, 240], [250, 210, 90], [150, 110, 220], [110, 200, 150], [240, 110, 90]];
    [3, 6, 9, 21, 24, 27].forEach((x, k) => { c.box(x * T - 2, 10, 36, 34, lt(TR[k], 0.6), GOLD); furfrou(c, x * T + 13, 34, TR[k], 1); });
    c.box(13 * T, 6, 6 * T, 44, PINK, [200, 110, 140]); furfrou(c, 15 * T + 4, 40, null, 1.6); c.ellipse(18 * T - 4, 18, 5, 4, WHITE); c.ellipse(18 * T + 4, 18, 5, 4, WHITE); c.rect(18 * T - 2, 16, 4, 4, [250, 220, 90]);
    rug(c, 14, 10, 18, 22, [244, 176, 200], WHITE);
  },
  fit(p) {
    const PINK = [240, 150, 180], TR = [[240, 130, 170], [110, 170, 240], [250, 210, 90], [150, 110, 220]];
    tillRow(p, 12, 20, 8, [16], [252, 250, 252], PINK, (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 44, Y, [200, 110, 140]); for (let n = 0; n < 3; n++) { const x = X + (k ? 6 : 14) + n * 12; top.rect(x, Y - 6, 2, 6, [150, 108, 70]); top.rect(x - 2, Y - 9, 6, 3, TR[(n + k) % 4]); } });
    // Grooming tables.
    [[4, 11], [25, 11], [4, 15], [25, 15]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => { table(c, X + 2, Y, 44, 16, [200, 206, 226]); c.rect(X + 4, Y + 2, 40, 5, [226, 110, 150]); top.rect(X + 42, Y - 16, 2, 18, [150, 154, 170]); top.rect(X + 30, Y - 16, 13, 2, [150, 154, 170]); furfrou(top, X + 20, Y + 1, TR[k], 1.2); }));
    // The tubs.
    wide(p, [[4, 20], [8, 20]], 3, 2, (c, top, X, Y) => { c.ellipse(X + 24, Y + 29, 23, 4, [0, 0, 0, 55]); c.box(X + 2, Y + 6, 44, 23, WHITE, [150, 156, 176]); c.ellipse(X + 24, Y + 12, 19, 6, [150, 206, 240]); for (const [dx, dy, r] of [[12, 10, 4], [20, 8, 5], [30, 10, 4], [36, 12, 3], [25, 13, 3]]) c.ellipse(X + dx, Y + dy, r, r, [255, 255, 255, 220]); c.rect(X + 4, Y + 20, 40, 2, [214, 216, 228]); top.rect(X + 42, Y - 10, 2, 18, [170, 174, 190]); top.rect(X + 34, Y - 10, 9, 2, [170, 174, 190]); top.rect(X + 33, Y - 9, 3, 4, [170, 174, 190]); });
    wide(p, [[24, 20]], 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [244, 200, 216], [130, 200, 240]));
    [[3, 4], [5, 4], [7, 4], [9, 4], [21, 4], [23, 4], [25, 4], [27, 4]].forEach(([x, y]) => prop(p, x, y, 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [252, 240, 244], jarItem([[240, 130, 170], [110, 170, 240], [250, 210, 90], [150, 110, 220], WHITE]), x)));
    // Ribbons, and beds for those waiting.
    wide(p, [[27, 20]], 2, 1, (c, top, X, Y) => rail(c, top, X, Y, 32, TR, 1, GOLD));
    [[10, 12, 0], [22, 12, 1], [11, 18, 2], [21, 18, 3]].forEach(([x, y, k]) => prop(p, x, y, 2, 1, (c, top, X, Y) => { c.ellipse(X + 16, Y + 13, 15, 3, [0, 0, 0, 50]); c.ellipse(X + 16, Y + 9, 15, 6, dk(TR[k], 0.2)); c.ellipse(X + 16, Y + 8, 12, 4, lt(TR[k], 0.5)); if (k % 2 === 0) furfrou(c, X + 13, Y + 6, null, 0.7); }));
    one(p, [[2, 5], [29, 5], [2, 23], [29, 23], [12, 4], [20, 4]], (c, top, X, Y) => plant(c, top, X, Y, [240, 150, 180]));
  },
});

// ---------------------------------------------------------------- the boutiques
const hatStand = (c, top, X, Y, cols) => { shadow(c, X, Y); c.rect(X + 7, Y - 8, 2, 22, [110, 76, 50]); c.rect(X + 4, Y + 13, 8, 2, [90, 60, 40]); cols.forEach((col, k) => { const y = Y - 10 + k * 8, x = X + 8 + (k % 2 ? 3 : -3); top.ellipse(x, y + 2, 6, 2, dk(col, 0.2)); top.ellipse(x, y, 4, 3, col); top.rect(x - 4, y, 8, 1, lt(col, 0.4)); }); };
const cheval = (c, top, X, Y, edge = GOLD) => { shadow(c, X, Y); c.rect(X + 2, Y + 8, 2, 7, dk(edge, 0.3)); c.rect(X + 12, Y + 8, 2, 7, dk(edge, 0.3)); c.rect(X + 1, Y + 14, 14, 1, dk(edge, 0.4)); mirror(top, X + 2, Y - 16, 12, 26, edge); };
// Folded clothes on a table, `w` pixels wide.
function foldTable(c, X, Y, w, cols, wood = [176, 128, 80]) { table(c, X, Y, w, 16, wood); for (let x = X + 4, k = 0; x + 9 <= X + w - 3; x += 11, k++) { const col = cols[k % cols.length]; c.box(x, Y + 2, 9, 8, col, dk(col, 0.45)); c.rect(x + 1, Y + 5, 7, 1, dk(col, 0.2)); c.rect(x + 3, Y + 3, 3, 1, lt(col, 0.5)); } }
// A tall cupboard of folded clothes (2 tiles wide, 2 deep).
function wardrobe(c, top, X, Y, cols, wood) { c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 55]); c.box(X, Y - 14, 32, 45, wood, dk(wood, 0.6)); for (let r = 0; r < 4; r++) { const y = Y - 11 + r * 10; c.rect(X + 2, y, 28, 8, dk(wood, 0.5)); for (let k = 0; k < 3; k++) { const col = cols[(r * 3 + k) % cols.length]; c.rect(X + 3 + k * 9, y + 3, 8, 5, col); c.rect(X + 3 + k * 9, y + 5, 8, 1, dk(col, 0.25)); } } c.rect(X + 1, Y - 13, 30, 2, lt(wood, 0.3)); }
// Boutique Couture: black walls, ivory carpet, gold. The season's looks on plinths, the rest on gold rails.
PLANS.KalosBoutiqueCouture = shop({
  ground(p, c, yb) {
    carpet(p, c, [240, 234, 222]);
    shopWall(p, c, yb, [36, 32, 44], { stripe: [48, 44, 58], gap: 24, sw: 2, panel: [24, 22, 30], top: GOLD, skirt: GOLD });
    for (const x of [8, 20]) mirror(c, x * T, 8, 4 * T, 40, GOLD);
    c.box(14 * T, 6, 4 * T, 44, [24, 22, 30], GOLD); c.poly([[16 * T, 12], [17 * T + 4, 28], [16 * T, 44], [15 * T - 4, 28]], GOLD); c.poly([[16 * T, 18], [17 * T - 4, 28], [16 * T, 38], [15 * T + 4, 28]], [24, 22, 30]); gem(c, 16 * T, 28, WHITE, 1.2);
    for (const x of [4.5, 6.5, 24.6, 27.6]) { c.rect(x * T + 6, 14, 4, 30, GOLD); c.ellipse(x * T + 8, 14, 5, 3, lt(GOLD, 0.4)); glow(c, x * T + 8, 12, 12, [255, 240, 180], 40); }
    rug(c, 14, 10, 18, 22, [40, 36, 48], GOLD);
    for (const x of [4, 7, 10, 21]) c.ellipse(x * T + 8, 5 * T + 12, 14, 7, [255, 244, 200, 110]);
  },
  fit(p) {
    const BLK = [40, 36, 48], LOOKS = [[40, 36, 48], [190, 40, 60], WHITE, [110, 60, 150], GOLD, [60, 80, 130]];
    tillRow(p, 12, 20, 8, [16], BLK, [244, 240, 232], (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 44, Y, GOLD); else { top.box(X + 8, Y - 8, 14, 8, [190, 40, 60], GOLD); top.rect(X + 8, Y - 5, 14, 1, GOLD); } c.box(X + (k ? 8 : 36), Y - 2, 12, 4, WHITE, [150, 150, 170]); });
    [[4, 5], [7, 5], [10, 5], [21, 5], [10, 14], [22, 14]].forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => mannequin(c, top, X, Y, LOOKS[k], GOLD)));
    wide(p, [[25, 4]], 2, 3, (c, top, X, Y) => booth(c, top, X, Y, 32, 48, [110, 60, 150], [30, 28, 36]));
    // Bags and shoes.
    wide(p, [[5, 12], [25, 12]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 55]); c.box(X, Y + 4, 32, 27, BLK, INK); c.rect(X + 1, Y + 5, 30, 3, GOLD); c.rect(X + 2, Y + 18, 28, 1, GOLD); for (const [dx, col] of [[4, [190, 40, 60]], [18, [240, 234, 222]]]) { top.box(X + dx, Y - 6, 10, 10, col, dk(col, 0.5)); top.ellipse(X + dx + 5, Y - 7, 3, 3, dk(col, 0.5), 1); top.rect(X + dx + 4, Y - 3, 2, 2, GOLD); } for (const dx of [4, 13, 22]) { c.poly([[X + dx, Y + 16], [X + dx + 7, Y + 16], [X + dx + 7, Y + 13], [X + dx + 3, Y + 12], [X + dx, Y + 9]], LOOKS[(dx + 1) % 4]); } });
    [[3, 16], [3, 20], [25, 16], [25, 20]].forEach(([x, y], k) => prop(p, x, y, 4, 1, (c, top, X, Y) => rail(c, top, X, Y, 64, [BLK, [190, 40, 60], WHITE, [110, 60, 150], [60, 80, 130], [226, 200, 150]], k * 2, GOLD)));
    wide(p, [[9, 22], [20, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, BLK));
    one(p, [[8, 16], [23, 20]], (c, top, X, Y) => hatStand(c, top, X, Y, [BLK, [190, 40, 60], WHITE]));
    one(p, [[13, 12], [19, 12]], (c, top, X, Y) => cheval(c, top, X, Y));
    one(p, [[2, 4], [29, 5], [2, 23], [29, 23], [13, 5], [19, 5]], (c, top, X, Y) => urn(c, top, X, Y, GOLD, WHITE));
  },
});
// The fitting rooms: a row of curtained booths, mirrors to turn in front of, somewhere to sit.
PLANS.KalosLumioseFittingRoom = shop({
  ground(p, c, yb) {
    carpet(p, c, [210, 196, 230]);
    shopWall(p, c, yb, [150, 122, 174], { stripe: [164, 136, 188], gap: 12, sw: 4, panel: [244, 240, 248], top: WHITE, skirt: [100, 80, 124] });
    for (const dx of [0, 1, 2]) mirror(c, 14 * T - 4 + dx * 20, 8 + (dx === 1 ? 0 : 4), 18, 40 - (dx === 1 ? 0 : 4), GOLD);
    c.ellipse(16 * T + 8, 9 * T, 60, 34, [244, 236, 250]); c.ellipse(16 * T + 8, 9 * T, 60, 34, [170, 140, 200], 2); c.ellipse(16 * T + 8, 9 * T, 46, 24, [226, 214, 240], 1);
    for (const x of [11.5, 20.5]) c.ellipse(x * T + 8, 14 * T, 30, 18, [190, 170, 216]);
  },
  fit(p) {
    const CUR = [[226, 110, 150], [110, 170, 230], [250, 210, 110], [130, 200, 150], [240, 150, 90], [170, 130, 220]];
    [3, 6, 9, 21, 24, 27].forEach((x, k) => prop(p, x, 4, 2, 2, (c, top, X, Y) => { booth(c, top, X, Y, 32, 32, CUR[k], [236, 230, 240]); c.box(X + 12, Y - 15, 8, 6, WHITE, [150, 122, 174]); c.rect(X + 15, Y - 13, 2, 1 + (k % 3), [100, 80, 124]); }));
    // Ottomans.
    wide(p, [[11, 13], [20, 13]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 22, 16, 8, [0, 0, 0, 50]); c.ellipse(X + 16, Y + 18, 15, 10, [130, 100, 160]); c.ellipse(X + 16, Y + 13, 15, 9, [226, 130, 170]); c.ellipse(X + 16, Y + 13, 15, 9, [150, 70, 110], 1); c.ellipse(X + 16, Y + 13, 2, 1.5, [150, 70, 110]); for (let a = 0; a < 8; a++) c.line(X + 16, Y + 13, X + 16 + Math.cos(a * 0.785) * 13, Y + 13 + Math.sin(a * 0.785) * 8, [200, 100, 140]); });
    one(p, [[5, 8], [8, 8], [23, 8], [26, 8], [13, 19], [19, 19]], (c, top, X, Y) => cheval(c, top, X, Y, [226, 226, 236]));
    wide(p, [[3, 12], [3, 16], [25, 12], [25, 16]], 4, 1, (c, top, X, Y) => rail(c, top, X, Y, 64, CUR.concat([WHITE, [60, 60, 70]]), (X + Y) >> 4));
    wide(p, [[3, 21], [26, 21]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, [236, 230, 240]));
    wide(p, [[8, 21], [22, 21]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [236, 230, 240], (cc, x, y, k) => { const col = CUR[k % 6]; cc.rect(x, y + 3, 5, 3, col); cc.rect(x, y + 1, 2, 2, col); }, X));
    one(p, [[12, 4], [19, 4]], (c, top, X, Y) => hatStand(c, top, X, Y, [CUR[0], CUR[1], CUR[2]]));
    one(p, [[2, 4], [29, 4], [2, 23], [29, 23]], (c, top, X, Y) => plant(c, top, X, Y, [226, 110, 150]));
  },
});
// The town boutiques share a room: the fitting booth and the cupboard stand where the old cabinets did, the counter
// under the sign; what hangs on the rails, and everything else, is the town's own.
function boutique(o) {
  return shop({
    ground(p, c, yb) { o.floor(p, c); shopWall(p, c, yb, o.wall, o.wallOpts); o.art(p, c); if (o.rug) rug(c, 14, 10, 18, 22, o.rug, o.trim || WHITE); },
    fit(p) {
      tillRow(p, 13, 19, 8, [16], o.wood, o.top, (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 30, Y, dk(o.accent, 0.2)); for (let n = 0; n < 2; n++) { const col = o.cloth[(n + k * 2) % o.cloth.length]; c.box(X + (k ? 4 : 8) + n * 13, Y - 3, 10, 5, col, dk(col, 0.45)); } });
      prop(p, 25, 4, 2, 3, (c, top, X, Y) => booth(c, top, X, Y, 32, 48, o.accent, o.wood));
      prop(p, 5, 5, 2, 2, (c, top, X, Y) => wardrobe(c, top, X, Y, o.cloth, o.wood));
      // Where the wardrobe assistant waits: a rail to choose from and the long mirror.
      prop(p, 4, 12, 3, 1, (c, top, X, Y) => rail(c, top, X, Y, 48, o.cloth, 3, o.metal)); prop(p, 9, 12, 1, 1, (c, top, X, Y) => cheval(c, top, X, Y, o.metal || GOLD));
      (o.rails || []).forEach(([x, y, w], k) => prop(p, x, y, w || 4, 1, (c, top, X, Y) => rail(c, top, X, Y, (w || 4) * T, o.cloth, k * 3 + 1, o.metal)));
      (o.models || []).forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => mannequin(c, top, X, Y, o.cloth[(k * 2 + 1) % o.cloth.length], o.plinth)));
      (o.tables || []).forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => foldTable(c, X, Y, 48, o.cloth.slice(k).concat(o.cloth), o.wood)));
      (o.hats || []).forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => hatStand(c, top, X, Y, [o.cloth[k % o.cloth.length], o.cloth[(k + 2) % o.cloth.length], o.cloth[(k + 3) % o.cloth.length]])));
      one(p, o.plants || [[2, 4], [29, 4], [2, 23], [29, 23]], (c, top, X, Y) => plant(c, top, X, Y, o.leaf));
      if (o.more) o.more(p);
    },
  });
}
// Santalune: boards and sage green, everyday clothes.
PLANS.KalosSantaluneBoutique = boutique({
  floor: (p, c) => planks(p, c, [222, 184, 126]), wall: [176, 200, 152], wallOpts: { panel: [240, 232, 206], top: [250, 246, 226], skirt: [110, 130, 96] }, wood: [176, 128, 80], top: [240, 232, 206], accent: [120, 170, 110], rug: [130, 170, 120],
  cloth: [[120, 170, 110], [250, 220, 110], [244, 244, 240], [90, 130, 190], [226, 130, 90], [150, 110, 80]],
  art(p, c) { windowAt(c, 9 * T, 18, 30, 30, [170, 214, 244], [250, 246, 226]); windowAt(c, 21 * T, 18, 30, 30, [170, 214, 244], [250, 246, 226]); signboard(c, 13 * T, 12, 6 * T, 26, [250, 246, 226], [120, 150, 100], [120, 170, 110]); },
  rails: [[3, 16], [3, 20], [25, 12], [25, 16]], models: [[10, 5], [21, 5], [12, 12], [20, 12]], tables: [[9, 18], [20, 18], [25, 20]], hats: [[23, 5], [8, 22]],
  more(p) { one(p, [[12, 5], [19, 5]], (c, top, X, Y) => urn(c, top, X, Y, [200, 150, 110], [250, 220, 110])); wide(p, [[20, 22]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, [176, 128, 80])); },
});
// Cyllage: white and sea blue, stripes and surfboards.
PLANS.KalosCyllageBoutique = boutique({
  floor: (p, c) => tiled(p, c, [238, 244, 250], [210, 228, 244]), wall: [244, 246, 250], wallOpts: { stripe: [100, 160, 226], gap: 12, sw: 6, panel: [50, 80, 140], top: [50, 80, 140], skirt: [30, 50, 100] }, wood: [236, 240, 246], top: [100, 160, 226], accent: [226, 70, 70], metal: [200, 206, 226], plinth: [100, 160, 226], rug: [70, 120, 200],
  cloth: [[70, 120, 200], WHITE, [226, 70, 70], [250, 220, 110], [60, 190, 190], [40, 60, 110]],
  art(p, c) {
    for (const x of [10, 21]) { c.ellipse(x * T + 8, 28, 15, 15, [226, 70, 70]); c.ellipse(x * T + 8, 28, 8, 8, [244, 246, 250]); c.rect(x * T + 6, 13, 4, 7, WHITE); c.rect(x * T + 6, 36, 4, 7, WHITE); c.rect(x * T - 7, 26, 7, 4, WHITE); c.rect(x * T + 16, 26, 7, 4, WHITE); }
    c.box(13 * T + 8, 8, 5 * T, 36, [50, 80, 140], WHITE); const ax = 16 * T; c.rect(ax - 1, 14, 3, 22, WHITE); c.ellipse(ax, 13, 3, 3, WHITE, 1); c.rect(ax - 6, 19, 13, 2, WHITE); c.ellipse(ax, 30, 9, 7, WHITE, 2); c.rect(ax - 10, 22, 21, 8, [50, 80, 140]); c.rect(ax - 1, 22, 3, 14, WHITE);
  },
  rails: [[3, 16], [25, 12], [25, 16], [3, 20, 3]], models: [[10, 5], [12, 5], [21, 5], [12, 13], [20, 13]], tables: [[9, 19], [20, 19]], hats: [[8, 16], [23, 20]],
  more(p) {
    // Surfboards, and a paddling pool of beach balls.
    [[19, 4, [250, 220, 110]], [20, 4, [60, 190, 190]], [23, 4, [226, 70, 70]]].forEach(([x, y, col]) => prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); top.ellipse(X + 8, Y - 6, 5, 20, dk(col, 0.3)); top.ellipse(X + 8, Y - 6, 4, 19, col); top.rect(X + 7, Y - 22, 2, 32, WHITE); }));
    wide(p, [[25, 20]], 3, 2, (c, top, X, Y) => { c.ellipse(X + 24, Y + 18, 23, 12, [50, 80, 140]); c.ellipse(X + 24, Y + 16, 23, 12, [100, 160, 226]); c.ellipse(X + 24, Y + 16, 19, 9, [150, 210, 244]); for (const [dx, dy, col] of [[14, 14, [226, 70, 70]], [26, 18, [250, 220, 110]], [34, 13, [60, 190, 190]]]) { c.ellipse(X + dx, Y + dy, 5, 5, WHITE); c.poly([[X + dx, Y + dy], [X + dx + 5, Y + dy - 2], [X + dx + 3, Y + dy - 5]], col); c.poly([[X + dx, Y + dy], [X + dx - 5, Y + dy + 2], [X + dx - 3, Y + dy + 5]], col); } });
    wide(p, [[20, 22]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, [236, 240, 246]));
  },
});
// Laverre: pinks and lilac, kimono and frills.
PLANS.KalosLaverreBoutique = boutique({
  floor: (p, c) => carpet(p, c, [246, 214, 226]), wall: [204, 176, 224], wallOpts: { stripe: [216, 190, 232], gap: 10, sw: 3, panel: [250, 238, 246], top: [250, 238, 246], skirt: [140, 100, 160] }, wood: [200, 150, 170], top: [250, 238, 246], accent: [240, 130, 170], plinth: [250, 238, 246], rug: [226, 150, 190], trim: GOLD, leaf: [240, 150, 190],
  cloth: [[240, 130, 170], [200, 150, 230], WHITE, [250, 200, 110], [150, 220, 210], [226, 90, 120]],
  art(p, c) {
    for (const x of [9, 12, 19, 22]) { const X = x * T + 8; c.box(X - 13, 10, 26, 34, [250, 238, 246], GOLD); c.poly([[X, 26], [X - 9, 18], [X - 9, 34]], [240, 130, 170]); c.poly([[X, 26], [X + 9, 18], [X + 9, 34]], [240, 130, 170]); c.ellipse(X, 26, 3, 3, [226, 90, 120]); c.line(X - 2, 28, X - 6, 40, [240, 130, 170], 2); c.line(X + 2, 28, X + 6, 40, [240, 130, 170], 2); }
    c.box(15 * T - 8, 8, 3 * T, 38, [240, 130, 170], GOLD); c.ellipse(16 * T, 24, 8, 8, [250, 238, 246]); for (let a = 0; a < 6; a++) c.ellipse(16 * T + Math.cos(a * 1.047) * 10, 24 + Math.sin(a * 1.047) * 10, 4, 4, [250, 200, 220]); c.ellipse(16 * T, 24, 4, 4, [250, 220, 110]);
  },
  rails: [[3, 16], [25, 12], [25, 16]], models: [[10, 5], [21, 5], [23, 5]], tables: [[9, 19], [20, 19]], hats: [[8, 16]],
  more(p) {
    [[12, 5, [240, 130, 170]], [19, 5, [200, 150, 230]], [12, 13, [250, 200, 110]], [20, 13, [150, 220, 210]], [4, 20, [226, 90, 120]], [6, 20, [240, 130, 170]], [26, 20, [200, 150, 230]], [28, 20, WHITE]].forEach(([x, y, col]) => prop(p, x, y, 1, 1, (c, top, X, Y) => kimono(c, top, X, Y, col)));
    one(p, [[3, 22], [28, 22], [13, 22], [19, 22]], (c, top, X, Y, a) => plush(c, top, X, Y, [[240, 150, 190], [200, 170, 240], [250, 220, 150]][(X >> 4) % 3]));
    wide(p, [[22, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [240, 130, 170]));
  },
});
// Anistar: dusk purples and gold, stars underfoot.
PLANS.KalosAnistarBoutique = boutique({
  floor: (p, c) => { carpet(p, c, [72, 62, 124]); speckle(p, c, 60, p.left, p.top + 2, p.right, p.bottom, 12, (x, y, r) => star(c, x, y, r > 0.5 ? [250, 226, 150] : [170, 160, 230], r > 0.85 ? 2 : 1)); },
  wall: [112, 84, 152], wallOpts: { panel: [72, 52, 104], top: GOLD, skirt: GOLD }, wood: [72, 52, 104], top: GOLD, accent: [226, 170, 70], metal: GOLD, plinth: GOLD, rug: [110, 84, 170], trim: GOLD, leaf: [130, 110, 200],
  cloth: [[130, 90, 190], GOLD, [50, 46, 70], [90, 190, 200], [226, 226, 240], [200, 90, 150]],
  art(p, c) {
    // The sundial, and the evening sky in the windows.
    const cx = 16 * T; c.box(13 * T + 4, 4, 5 * T + 8, 46, [50, 40, 90], GOLD); c.ellipse(cx, 28, 18, 18, GOLD, 2); c.ellipse(cx, 28, 12, 12, [240, 150, 190], 1); c.poly([[cx, 8], [cx + 5, 28], [cx, 46], [cx - 5, 28]], [250, 190, 220]); c.poly([[cx, 12], [cx + 2, 28], [cx, 42], [cx - 2, 28]], WHITE); for (let a = 0; a < 8; a++) c.ellipse(cx + Math.cos(a * 0.785) * 18, 28 + Math.sin(a * 0.785) * 18, 2, 2, GOLD);
    for (const x of [9, 21]) { c.box(x * T, 12, 34, 32, [50, 40, 100], GOLD); for (let y = 0; y < 28; y += 2) c.rect(x * T + 2, 14 + y, 30, 2, mix([50, 40, 110], [240, 150, 150], y / 28)); star(c, x * T + 8, 20, WHITE); star(c, x * T + 24, 18, WHITE, 1); c.rect(x * T + 16, 12, 2, 32, GOLD); }
  },
  rails: [[3, 16], [3, 20], [25, 12], [25, 16], [25, 20]], models: [[10, 5], [12, 5], [19, 5], [21, 5]], tables: [[9, 18], [20, 18]], hats: [[23, 5]],
  more(p) {
    one(p, [[12, 12], [20, 12], [12, 22], [20, 22]], (c, top, X, Y) => crystals(c, top, X, Y, [[240, 150, 190], [170, 160, 240], [250, 226, 150]]));
    wide(p, [[8, 22], [21, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [110, 84, 170]));
  },
});
// Snowbelle: a log cabin with the fire lit, coats and scarves and boots.
function logWall(p, c, yb, col = [150, 104, 70]) { shopWall(p, c, yb, col, { top: lt(col, 0.3), skirt: dk(col, 0.5) }); const X = p.left * T, W = (p.right - p.left + 1) * T; for (let y = 3; y < (yb + 1) * T - 3; y += 10) { c.rect(X, y, W, 2, lt(col, 0.2)); c.rect(X, y + 8, W, 2, dk(col, 0.35)); for (let x = X + ((y * 7) % 60); x < X + W; x += 60) c.ellipse(x, y + 4, 3, 2, dk(col, 0.25)); } }
function snowWindow(c, x, y, w, h, edge = [110, 76, 50]) { c.box(x, y, w, h, [190, 214, 240], edge); c.rect(x + 1, y + h - 9, w - 2, 8, WHITE); c.poly([[x + 4, y + h - 8], [x + 10, y + 8], [x + 16, y + h - 8]], [60, 110, 90]); c.poly([[x + 6, y + 14], [x + 10, y + 7], [x + 14, y + 14]], WHITE); for (let k = 0; k < 8; k++) c.p(x + 3 + (k * 11) % (w - 6), y + 3 + (k * 7) % (h - 12), WHITE); c.rect(x + w / 2, y, 1, h, edge); c.rect(x, y + h / 2, w, 1, edge); c.rect(x - 1, y + h - 1, w + 2, 2, WHITE); }
PLANS.KalosSnowbelleBoutique = boutique({
  floor: (p, c) => planks(p, c, [170, 122, 84]), wall: [150, 104, 70], wallOpts: {}, wood: [120, 82, 56], top: [226, 200, 160], accent: [190, 50, 60], metal: [110, 76, 50], plinth: [120, 82, 56], rug: [170, 50, 60], trim: WHITE, leaf: [60, 120, 90],
  cloth: [[190, 50, 60], [244, 244, 248], [60, 130, 140], [50, 70, 120], [226, 190, 110], [90, 130, 90]],
  art(p, c) { logWall(p, c, 3); fireplace(c, 14 * T, 16, 4 * T, 48); for (const x of [9, 21]) snowWindow(c, x * T, 12, 34, 32); for (const [x, col] of [[12, [190, 50, 60]], [19, [60, 130, 140]]]) { c.rect(x * T + 2, 18, 12, 3, [110, 76, 50]); c.rect(x * T + 4, 21, 8, 22, col); for (let k = 23; k < 42; k += 6) c.rect(x * T + 4, k, 8, 2, WHITE); c.rect(x * T + 4, 43, 8, 3, lt(col, 0.4)); } },
  rails: [[3, 16], [3, 20], [25, 12], [25, 16]], models: [[10, 5], [21, 5], [23, 5]], tables: [[9, 19], [20, 19]], hats: [[8, 16], [23, 20]],
  more(p) {
    // Boots, skis, and baskets of wool.
    wide(p, [[25, 20]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [120, 82, 56], (cc, x, y, k) => { const col = [[110, 76, 50], [50, 50, 60], [190, 50, 60]][k % 3]; cc.rect(x + 1, y, 3, 5, col); cc.rect(x + 1, y + 4, 5, 2, col); }, 0));
    one(p, [[12, 5], [19, 5]], (c, top, X, Y) => { shadow(c, X, Y); for (const [dx, col] of [[4, [60, 130, 140]], [9, [190, 50, 60]]]) { top.rect(X + dx, Y - 20, 3, 34, col); top.rect(X + dx, Y - 22, 3, 3, lt(col, 0.4)); top.rect(X + dx, Y - 6, 3, 4, INK); } c.rect(X + 14, Y - 6, 1, 20, [150, 154, 170]); });
    one(p, [[28, 21], [12, 12], [20, 12]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 1, Y + 5, 14, 10, [200, 160, 100], [110, 76, 50]); for (let k = 3; k < 14; k += 3) c.rect(X + k, Y + 6, 1, 8, [150, 110, 70]); for (const [dx, col] of [[4, [190, 50, 60]], [9, [244, 244, 248]], [12, [60, 130, 140]]]) { c.ellipse(X + dx, Y + 4, 3, 3, col); c.line(X + dx - 2, Y + 3, X + dx + 2, Y + 5, dk(col, 0.25)); } });
    wide(p, [[13, 22], [20, 22]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [190, 50, 60]));
  },
});

// ---------------------------------------------------------------- houses
// Kitchen units `w` pixels wide against the wall: a hob, a sink, cupboards over.
function kitchen(c, top, X, Y, w, col = [236, 232, 224], topc = [150, 156, 170]) {
  c.ellipse(X + w / 2, Y + 15, w / 2, 2, [0, 0, 0, 50]); c.box(X, Y - 4, w, 19, col, dk(col, 0.5)); c.rect(X, Y - 4, w, 5, topc); c.rect(X, Y + 1, w, 1, dk(topc, 0.4));
  for (let x = X + 1; x + 14 <= X + w; x += 16) { c.box(x, Y + 3, 14, 11, lt(col, 0.2), dk(col, 0.35)); c.rect(x + 6, Y + 5, 3, 1, dk(col, 0.6)); }
  c.box(X + 3, Y - 3, 11, 3, [50, 50, 60], INK); c.rect(X + 4, Y - 2, 3, 1, [240, 110, 80]); c.rect(X + 9, Y - 2, 3, 1, [240, 110, 80]); top.box(X + 4, Y - 8, 8, 5, [190, 194, 210], INK); top.rect(X + 12, Y - 6, 3, 1, INK);
  if (w >= 48) { c.box(X + 20, Y - 3, 11, 3, [190, 220, 240], [110, 116, 136]); top.rect(X + 25, Y - 9, 2, 6, [170, 174, 190]); top.rect(X + 25, Y - 9, 4, 2, [170, 174, 190]); }
  for (let x = X + 36; x + 6 <= X + w - 2; x += 9) top.rect(x, Y - 9, 4, 6, [[226, 110, 90], [250, 220, 130], [130, 190, 110]][(x >> 3) % 3]);
}
function fridge(c, top, X, Y, col = [236, 240, 246]) { c.ellipse(X + 8, Y + 15, 8, 2, [0, 0, 0, 50]); c.box(X + 1, Y - 14, 14, 29, col, [120, 126, 146]); c.rect(X + 2, Y - 3, 12, 1, [120, 126, 146]); c.rect(X + 11, Y - 10, 2, 5, [150, 156, 176]); c.rect(X + 11, Y, 2, 7, [150, 156, 176]); c.rect(X + 3, Y - 12, 2, 8, WHITE); }
function tvSet(c, top, X, Y, wood = [110, 76, 50]) { table(c, X, Y, 32, 16, wood); top.box(X + 4, Y - 14, 24, 17, [40, 44, 56], INK); top.rect(X + 6, Y - 12, 20, 12, [96, 170, 230]); top.rect(X + 7, Y - 11, 8, 3, [190, 226, 250]); c.rect(X + 13, Y + 3, 6, 2, [40, 44, 56]); }
function bigBed(c, top, X, Y, col, wood = [150, 108, 70]) { c.ellipse(X + 16, Y + 31, 16, 3, [0, 0, 0, 55]); c.box(X, Y - 8, 32, 8, wood, dk(wood, 0.5)); c.box(X, Y - 2, 32, 33, [240, 240, 244], dk(wood, 0.5)); c.box(X + 3, Y + 1, 11, 7, WHITE, [170, 170, 190]); c.box(X + 18, Y + 1, 11, 7, WHITE, [170, 170, 190]); c.box(X, Y + 11, 32, 20, col, dk(col, 0.5)); c.rect(X + 1, Y + 12, 30, 3, lt(col, 0.45)); frame(c, X + 4, Y + 17, 24, 10, lt(col, 0.25)); }
function nightstand(c, top, X, Y, wood = [150, 108, 70]) { shadow(c, X, Y); c.box(X + 2, Y + 3, 12, 12, wood, dk(wood, 0.55)); c.rect(X + 6, Y + 8, 4, 1, dk(wood, 0.6)); top.rect(X + 7, Y - 3, 2, 6, GOLD); top.poly([[X + 3, Y - 3], [X + 13, Y - 3], [X + 11, Y - 10], [X + 5, Y - 10]], [255, 236, 170]); }
function house(o) {
  return shop({
    ground(p, c, yb) { o.floor(p, c); if (o.log) logWall(p, c, yb, o.wall); else shopWall(p, c, yb, o.wall, o.wallOpts); o.art(p, c); for (const [x0, y0, x1, y1, col, trim] of o.rugs) rug(c, x0, y0, x1, y1, col, trim || WHITE); },
    fit(p) {
      const m = (x, w = 1) => (o.flip ? 31 - x - (w - 1) : x), W = o.wood;
      prop(p, m(3, 5), 4, 5, 1, (c, top, X, Y) => kitchen(c, top, X, Y, 80, o.units, o.worktop)); prop(p, m(8), 4, 1, 1, (c, top, X, Y) => fridge(c, top, X, Y));
      prop(p, m(4, 3), 9, 3, 2, (c, top, X, Y) => dineSet(c, top, X, Y, { square: true, cloth: o.cloth, check: o.check, chair: W, table: W }));
      for (const x of [20, 22]) prop(p, m(x, 2), 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, W, x));
      prop(p, m(25, 2), 4, 2, 1, (c, top, X, Y) => tvSet(c, top, X, Y, W)); prop(p, m(24, 3), 8, 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, o.sofa)); prop(p, m(28), 7, 1, 1, (c, top, X, Y) => sofa(c, X, Y, 16, o.sofa));
      prop(p, m(26, 2), 17, 2, 2, (c, top, X, Y) => bigBed(c, top, X, Y, o.bed, W)); prop(p, m(28), 17, 1, 1, (c, top, X, Y) => nightstand(c, top, X, Y, W)); prop(p, m(24, 2), 20, 2, 2, (c, top, X, Y) => wardrobe(c, top, X, Y, [o.bed, o.sofa, WHITE, o.check || o.cloth], W));
      prop(p, m(4, 3), 18, 3, 1, (c, top, X, Y) => { desk(c, top, X, Y, 48, W); papers(c, X + 36, Y + 4, 2); }); prop(p, m(5), 19, 1, 1, (c, top, X, Y) => stool(c, top, X, Y, o.sofa));
      one(p, [[m(2), 4], [m(29), 4], [m(2), 23], [m(29), 23], [m(12), 22], [m(19), 4]], (c, top, X, Y) => plant(c, top, X, Y, o.leaf));
      prop(p, m(3, 2), 14, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, W, 7)); prop(p, m(27, 2), 12, 2, 1, (c, top, X, Y) => foldTable(c, X, Y, 32, [o.bed, o.sofa, WHITE], W));
      o.more(p, m);
    },
  });
}
// Santalune's trade house: a country kitchen, and Bunnelby everywhere you look.
PLANS.KalosSantaluneTrade = house({
  floor: (p, c) => planks(p, c, [216, 172, 112]), wall: [244, 230, 196], wallOpts: { stripe: [236, 218, 176], gap: 12, sw: 4, panel: [176, 128, 80], top: [255, 246, 220] }, wood: [176, 128, 80], units: [240, 232, 214], worktop: [176, 128, 80],
  cloth: WHITE, check: [250, 210, 90], sofa: [110, 160, 110], bed: [226, 150, 90], rugs: [[13, 7, 19, 11, [120, 170, 120]], [23, 9, 27, 11, [226, 190, 120]], [3, 12, 7, 12, [226, 190, 120]]],
  art(p, c) {
    for (const x of [10, 17]) windowAt(c, x * T, 18, 28, 30, [170, 214, 244], [255, 246, 220]);
    // Bunnelby, framed.
    const X = 13 * T + 4, Y = 8; c.box(X, Y, 40, 38, [200, 226, 180], [150, 108, 70]); c.rect(X + 2, Y + 26, 36, 10, [130, 180, 110]); c.ellipse(X + 20, Y + 24, 9, 8, [170, 160, 150]); c.ellipse(X + 20, Y + 27, 5, 4, [226, 220, 210]); c.ellipse(X + 14, Y + 12, 4, 8, [170, 160, 150]); c.ellipse(X + 26, Y + 12, 4, 8, [170, 160, 150]); c.ellipse(X + 14, Y + 8, 3, 4, [130, 100, 80]); c.ellipse(X + 26, Y + 8, 3, 4, [130, 100, 80]); c.p(X + 17, Y + 22, INK); c.p(X + 23, Y + 22, INK); c.rect(X + 19, Y + 25, 3, 2, WHITE);
    picture(c, 4 * T, 12, 26, 26, ARTS[0]); picture(c, 23 * T, 14, 30, 24, ARTS[4]);
  },
  more(p, m) {
    one(p, [[12, 5], [14, 13], [27, 22]], (c, top, X, Y) => plush(c, top, X, Y, [170, 160, 150]));
    // Carrots from the garden, and the basket by the door.
    one(p, [[10, 4], [11, 4], [10, 5]], (c, top, X, Y) => { crate(c, X, Y, [200, 160, 100]); for (const dx of [3, 7, 11]) { c.poly([[X + dx, Y + 1], [X + dx + 3, Y + 1], [X + dx + 1, Y + 8]], [240, 140, 60]); c.rect(X + dx + 1, Y - 2, 1, 3, [90, 170, 90]); } });
    wide(p, [[9, 21]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [176, 128, 80])); wide(p, [[19, 15]], 1, 1, (c, top, X, Y) => clock(c, top, X, Y));
    wide(p, [[10, 15]], 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, [250, 240, 214]));
  },
});
// Cyllage's: a seaside house turned the other way round, Luvdisc in the tank.
PLANS.KalosCyllageTrade = house({
  flip: true, floor: (p, c) => planks(p, c, [232, 216, 182]), wall: [190, 220, 240], wallOpts: { panel: [244, 246, 250], top: WHITE, skirt: [90, 130, 180] }, wood: [226, 214, 196], units: [244, 246, 250], worktop: [100, 160, 220],
  cloth: [100, 160, 226], check: WHITE, sofa: [80, 140, 210], bed: [80, 190, 200], leaf: [80, 170, 130], rugs: [[13, 7, 19, 11, [90, 150, 220]], [4, 9, 8, 11, [240, 200, 140]], [24, 12, 28, 12, [240, 200, 140]]],
  art(p, c) {
    tankWall(p, c, 13, 1, 18, 2, 6); for (const [dx, dy] of [[20, 14], [50, 22], [78, 12]]) { const x = 13 * T + dx, y = T + dy; c.ellipse(x - 3, y, 4, 4, [250, 140, 180]); c.ellipse(x + 3, y, 4, 4, [250, 140, 180]); c.poly([[x - 7, y + 1], [x + 7, y + 1], [x, y + 9]], [250, 140, 180]); c.p(x - 3, y, INK); c.ellipse(x, y + 3, 2, 1, [255, 200, 220]); }
    for (const x of [9, 21]) { c.ellipse(x * T + 8, 28, 13, 13, [240, 244, 250]); c.ellipse(x * T + 8, 28, 10, 10, [150, 206, 244]); c.rect(x * T + 7, 16, 2, 24, [240, 244, 250]); c.rect(x * T - 4, 27, 24, 2, [240, 244, 250]); c.rect(x * T - 1, 34, 18, 3, [70, 130, 200]); }
    picture(c, 4 * T, 12, 28, 26, ARTS[4], WHITE); picture(c, 26 * T, 12, 28, 26, ARTS[7], WHITE);
  },
  more(p, m) {
    // Shells and floats, and heart cushions.
    one(p, [[12, 5], [19, 13], [8, 22]], (c, top, X, Y) => { shadow(c, X, Y); c.ellipse(X + 5, Y + 8, 4, 4, [250, 140, 180]); c.ellipse(X + 11, Y + 8, 4, 4, [250, 140, 180]); c.poly([[X + 1, Y + 9], [X + 15, Y + 9], [X + 8, Y + 15]], [250, 140, 180]); c.ellipse(X + 5, Y + 7, 1, 1, WHITE); });
    one(p, [[20, 4], [21, 4]], (c, top, X, Y) => { crate(c, X, Y, [200, 180, 140]); c.ellipse(X + 5, Y + 3, 3, 2, [250, 230, 220]); c.ellipse(X + 11, Y + 4, 2, 2, [250, 180, 160]); });
    wide(p, [[20, 21]], 1, 1, (c, top, X, Y) => { shadow(c, X, Y); top.ellipse(X + 8, Y - 6, 5, 20, [60, 130, 190]); top.ellipse(X + 8, Y - 6, 4, 19, [250, 220, 110]); top.rect(X + 7, Y - 22, 2, 32, WHITE); });
    wide(p, [[19, 15]], 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, [240, 244, 250])); wide(p, [[11, 21]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [226, 214, 196]));
  },
});
// Snowbelle's: a log cabin with the fire going, a piano for Jigglypuff to sing to.
PLANS.KalosSnowbelleTrade = house({
  log: true, floor: (p, c) => planks(p, c, [168, 120, 82]), wall: [150, 104, 70], wood: [120, 82, 56], units: [200, 170, 130], worktop: [110, 76, 50],
  cloth: [190, 50, 60], check: WHITE, sofa: [190, 60, 70], bed: [60, 130, 140], leaf: [60, 120, 90], rugs: [[13, 6, 19, 11, [170, 50, 60]], [23, 9, 27, 11, [226, 200, 160]], [9, 15, 14, 18, [226, 150, 170]]],
  art(p, c) { fireplace(c, 14 * T, 16, 4 * T, 48); for (const x of [10, 19, 27]) snowWindow(c, x * T + 2, 12, 30, 30); c.box(4 * T, 10, 30, 30, [250, 220, 230], [110, 76, 50]); c.ellipse(4 * T + 15, 27, 9, 9, [250, 170, 200]); c.poly([[4 * T + 8, 22], [4 * T + 9, 14], [4 * T + 14, 19]], [250, 170, 200]); c.poly([[4 * T + 22, 22], [4 * T + 21, 14], [4 * T + 16, 19]], [250, 170, 200]); c.ellipse(4 * T + 12, 26, 2, 2, [90, 190, 200]); c.ellipse(4 * T + 18, 26, 2, 2, [90, 190, 200]); c.ellipse(4 * T + 15, 21, 3, 2, [250, 200, 220]); },
  more(p, m) {
    wide(p, [[10, 15]], 3, 2, (c, top, X, Y) => piano(c, top, X, Y)); one(p, [[11, 17]], (c, top, X, Y) => stool(c, top, X, Y, [110, 40, 50]));
    one(p, [[13, 15], [21, 22], [12, 5]], (c, top, X, Y) => plush(c, top, X, Y, [250, 170, 200]));
    // Firewood, and boots drying.
    one(p, [[10, 4], [11, 4], [19, 5]], (c, top, X, Y) => { shadow(c, X, Y); for (let r = 0; r < 3; r++) for (let k = 0; k < 3 - (r > 1); k++) { c.ellipse(X + 4 + k * 4 + (r % 2) * 2, Y + 12 - r * 4, 2.5, 2.5, [110, 76, 50]); c.ellipse(X + 4 + k * 4 + (r % 2) * 2, Y + 12 - r * 4, 1.5, 1.5, [214, 180, 130]); } });
    wide(p, [[19, 15]], 3, 2, (c, top, X, Y) => teaTable(c, X, Y, 48, 30, [226, 200, 160])); wide(p, [[19, 21]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [120, 82, 56]));
  },
});
// Aquacorde's rest house: two beds, a sofa and the kettle on.
PLANS.KalosAquacordeRestHouse = shop({
  keep: [[4, 4]],
  ground(p, c, yb) {
    planks(p, c, [222, 184, 132]); shopWall(p, c, yb, [244, 230, 200], { panel: [176, 128, 80], top: [255, 246, 220] });
    windowAt(c, 9 * T - 4, 18, 26, 28, [170, 214, 244], [255, 246, 220]); picture(c, 6 * T - 2, 12, 26, 24, ARTS[0]); picture(c, 12 * T, 14, 28, 22, ARTS[4]);
    c.ellipse(9 * T + 8, 9 * T, 46, 26, [90, 140, 200]); c.ellipse(9 * T + 8, 9 * T, 46, 26, WHITE, 2); c.ellipse(9 * T + 8, 9 * T, 30, 15, [120, 170, 226]);
  },
  fit(p) {
    const W = [176, 128, 80];
    prop(p, 13, 4, 1, 2, (c, top, X, Y) => bed(c, X, Y + 6, [90, 150, 220])); prop(p, 15, 4, 1, 2, (c, top, X, Y) => bed(c, X, Y + 6, [226, 110, 110])); prop(p, 14, 4, 1, 1, (c, top, X, Y) => nightstand(c, top, X, Y, W));
    wide(p, [[6, 4]], 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, W, 2)); wide(p, [[10, 4]], 2, 1, (c, top, X, Y) => kitchen(c, top, X, Y, 32, [240, 232, 214], W));
    wide(p, [[3, 9]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [110, 160, 110])); wide(p, [[3, 11]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, W); cup(c, X + 14, Y + 7); cup(c, X + 30, Y + 7); c.ellipse(X + 22, Y + 5, 3, 2, WHITE); });
    wide(p, [[12, 10]], 3, 1, (c, top, X, Y) => cafeSet(c, top, X, Y, { table: W, chair: [150, 100, 60], cloth: [255, 246, 220] }));
    one(p, [[2, 4], [2, 13], [15, 13], [12, 13]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
// Aquacorde's supplies shop: a village store, Potions and Poké Balls on the shelves.
PLANS.KalosAquacordeShop = shop({
  ground(p, c, yb) {
    const BLUE = [70, 120, 200];
    tiled(p, c, [230, 238, 248], [212, 226, 242]); shopWall(p, c, yb, [244, 246, 250], { panel: BLUE, top: BLUE, skirt: [40, 70, 130] });
    c.box(6 * T, 8, 6 * T, 34, BLUE, [40, 70, 130]); ball(c, 9 * T, 25, 11); for (const x of [3, 13]) { c.box(x * T, 12, 34, 28, WHITE, BLUE); c.rect(x * T + 6, 18, 8, 16, [150, 100, 200]); c.rect(x * T + 8, 15, 4, 4, [200, 206, 226]); c.rect(x * T + 20, 22, 9, 3, BLUE); c.rect(x * T + 20, 28, 6, 3, BLUE); }
  },
  fit(p) {
    const BLUE = [70, 120, 200], POT = [[150, 100, 200], [240, 150, 60], [250, 220, 90], [110, 200, 150], [240, 110, 130]];
    tillRow(p, 5, 11, 6, [8], BLUE, WHITE, (c, top, X, Y, w, k) => { if (k) tillBox(top, X + 30, Y); else for (const dx of [8, 20, 32]) { top.rect(X + dx, Y - 7, 5, 7, POT[dx % 5]); top.rect(X + dx + 1, Y - 9, 3, 2, [200, 206, 226]); } });
    wide(p, [[5, 4], [7, 4]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 232, 244], jarItem(POT), X)); wide(p, [[10, 4], [12, 4]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 232, 244], ballItem([BALLS[0], BALLS[0], BALLS[1]]), X));
    wide(p, [[3, 9], [13, 9], [13, 12]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 232, 244], jarItem(POT), X + Y));
    one(p, [[2, 4], [3, 4], [2, 5], [15, 4], [3, 12]], (c, top, X, Y) => { crate(c, X, Y, [214, 190, 140]); c.rect(X + 4, Y + 4, 8, 6, WHITE); c.rect(X + 6, Y + 6, 4, 2, BLUE); });
    one(p, [[2, 13], [15, 13]], (c, top, X, Y) => plant(c, top, X, Y));
    wide(p, [[5, 12]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, [176, 128, 80]));
  },
});

// ---------------------------------------------------------------- Santalune's Trainers' School, Cyllage's Cycle Shop
PLANS.KalosSantaluneSchool = shop({
  rows: 1,
  ground(p, c, yb) {
    planks(p, c, [228, 198, 144]); shopWall(p, c, yb, [214, 232, 216], { panel: [176, 128, 80], top: WHITE, skirt: [110, 76, 50] });
    // The blackboard: today, type match-ups.
    const X = 7 * T, Y = 4; c.box(X, Y, 10 * T, 30, [40, 70, 58], [110, 76, 50]); frame(c, X + 1, Y + 1, 10 * T - 2, 28, [176, 128, 80]); ball(c, X + 22, Y + 15, 8, [226, 226, 226]);
    for (const [dx, col] of [[52, [240, 130, 110]], [84, [130, 200, 130]], [116, [130, 170, 240]]]) { c.ellipse(X + dx, Y + 13, 6, 6, col, 2); c.line(X + dx + 9, Y + 13, X + dx + 22, Y + 13, WHITE); c.poly([[X + dx + 22, Y + 10], [X + dx + 26, Y + 13], [X + dx + 22, Y + 16]], WHITE); } c.ellipse(X + 148, Y + 13, 6, 6, [240, 130, 110], 2);
    for (let k = 0; k < 5; k++) c.rect(X + 46 + k * 20, Y + 23, 12, 1, [226, 232, 226]); c.rect(X + 4, Y + 30, 10 * T - 8, 3, [176, 128, 80]); c.rect(X + 20, Y + 29, 6, 2, WHITE); c.rect(X + 30, Y + 29, 5, 2, [250, 220, 130]);
    cork(c, 3 * T, 8, 3 * T + 8, 24, 2); picture(c, 18 * T, 6, 3 * T, 26, { sky: [170, 214, 244], ground: [130, 190, 120], blob: [200, 170, 110] });
    rug(c, 9, 8, 14, 11, [90, 150, 110], [250, 240, 200]);
  },
  fit(p) {
    const W = [200, 156, 100];
    // The pupils' desks, three to a row.
    wide(p, [[5, 5], [16, 5], [5, 13], [16, 13], [5, 9]], 3, 2, (c, top, X, Y) => { for (let k = 0; k < 3; k++) { const x = X + k * 16; c.ellipse(x + 8, Y + 30, 7, 2, [0, 0, 0, 50]); c.box(x + 1, Y + 1, 14, 12, W, dk(W, 0.5)); c.rect(x + 2, Y + 2, 12, 2, lt(W, 0.3)); c.box(x + 3, Y + 4, 6, 5, [[236, 110, 110], [110, 160, 236], [250, 220, 110]][(k + (X >> 4) + (Y >> 4)) % 3], INK); c.rect(x + 11, Y + 4, 1, 6, [226, 190, 60]); c.rect(x + 2, Y + 13, 2, 5, dk(W, 0.5)); c.rect(x + 12, Y + 13, 2, 5, dk(W, 0.5)); c.box(x + 3, Y + 17, 10, 8, [110, 150, 110], [50, 80, 60]); c.box(x + 3, Y + 24, 10, 5, [130, 170, 130], [50, 80, 60]); } });
    wide(p, [[10, 4]], 4, 1, (c, top, X, Y) => { table(c, X, Y, 64, 16, [150, 108, 70]); papers(c, X + 8, Y + 5, 3); c.ellipse(X + 34, Y + 6, 3, 3, [226, 60, 60]); c.rect(X + 34, Y + 2, 1, 2, [90, 150, 80]); c.box(X + 46, Y + 3, 10, 7, [110, 160, 236], INK); });
    wide(p, [[2, 3], [20, 3]], 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [150, 108, 70], X >> 4));
    // The globe, satchels, and the practice balls.
    one(p, [[15, 4]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 4, 2, 9, [120, 90, 60]); c.rect(X + 4, Y + 12, 8, 2, [120, 90, 60]); planet(top, X + 8, Y, 6, [90, 150, 220]); });
    one(p, [[2, 16], [3, 16], [2, 15], [21, 16], [20, 16]], (c, top, X, Y) => { shadow(c, X, Y); const col = [[200, 90, 80], [90, 130, 200], [226, 180, 80]][((X >> 4) + (Y >> 4)) % 3]; c.box(X + 2, Y + 4, 12, 10, col, dk(col, 0.5)); c.rect(X + 2, Y + 4, 12, 4, lt(col, 0.2)); c.rect(X + 7, Y + 7, 2, 2, GOLD); c.ellipse(X + 8, Y + 3, 4, 2, dk(col, 0.5), 1); });
    wide(p, [[19, 12]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [150, 108, 70]); ball(c, X + 10, Y + 5); ball(c, X + 24, Y + 5, 4, BALLS[1]); ball(c, X + 38, Y + 5, 4, BALLS[2]); });
    one(p, [[2, 8], [21, 8], [9, 17], [15, 17]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});
PLANS.KalosCycleShop = shop({
  ground(p, c, yb) {
    const GRN = [110, 190, 110], YL = [250, 214, 70];
    tiled(p, c, [180, 184, 194], [190, 194, 204]); shopWall(p, c, yb, [240, 240, 244], { panel: [150, 156, 170], top: GRN, skirt: [90, 96, 116] }); c.rect(p.left * T, 40, 18 * T, 4, YL); c.rect(p.left * T, 44, 18 * T, 2, GRN);
    for (const x of [3, 5]) { c.ellipse(x * T + 8, 22, 12, 12, INK, 3); for (let a = 0; a < 6; a++) c.line(x * T + 8, 22, x * T + 8 + Math.cos(a * 1.047) * 10, 22 + Math.sin(a * 1.047) * 10, [170, 174, 190]); c.ellipse(x * T + 8, 22, 2, 2, [170, 174, 190]); c.rect(x * T + 7, 6, 2, 5, [110, 114, 130]); }
    c.box(8 * T, 6, 6 * T, 32, [250, 250, 244], GRN); bike(c, 9 * T, 18, YL); bike(c, 11 * T + 8, 18, GRN);
    // The pegboard of tools.
    c.box(15 * T, 8, 4 * T + 8, 30, [214, 190, 140], [110, 76, 50]); for (let k = 0; k < 5; k++) { const x = 15 * T + 8 + k * 13; c.rect(x, 13, 2, 14 + (k % 2) * 4, [150, 154, 170]); c.rect(x - 2, 12, 6, 4, [[226, 70, 70], [150, 154, 170], [70, 120, 200]][k % 3]); }
    // Lanes on the floor.
    for (let y = 9; y <= 14; y++) { c.rect(10 * T + 12, y * T + 4, 2, 8, A(YL, 220)); c.rect(12 * T + 2, y * T + 4, 2, 8, A(YL, 220)); }
    for (const [x, y] of [[7, 11], [13, 11]]) { c.ellipse(x * T + 16, y * T + 12, 26, 13, [70, 74, 92]); c.ellipse(x * T + 16, y * T + 12, 26, 13, YL, 2); }
  },
  fit(p) {
    const GRN = [110, 190, 110], YL = [250, 214, 70], ST = [150, 156, 176];
    wide(p, [[11, 7]], 4, 1, (c, top, X, Y) => { counter(c, X, Y, 64, [90, 96, 116], GRN); tillBox(top, X + 44, Y); top.ellipse(X + 14, Y - 5, 6, 5, YL); top.rect(X + 9, Y - 4, 10, 2, INK); top.ellipse(X + 28, Y - 5, 6, 5, GRN); top.rect(X + 23, Y - 4, 10, 2, INK); });
    [[3, 6, YL], [3, 9, GRN], [3, 12, YL], [17, 9, GRN], [17, 12, YL], [7, 11, GRN], [13, 11, YL]].forEach(([x, y, col]) => prop(p, x, y, 2, 1, (c, top, X, Y) => { c.rect(X + 2, Y + 13, 28, 2, ST); c.rect(X + 15, Y + 6, 2, 8, ST); bike(c, X, Y, col); }));
    wide(p, [[15, 4]], 4, 1, (c, top, X, Y) => { table(c, X, Y, 64, 16, ST); c.ellipse(X + 14, Y + 5, 7, 5, INK, 2); c.rect(X + 28, Y + 3, 12, 2, [226, 70, 70]); c.rect(X + 44, Y + 2, 4, 7, [70, 120, 200]); c.rect(X + 52, Y + 4, 8, 3, [150, 154, 170]); top.box(X + 50, Y - 8, 8, 9, [226, 70, 70], INK); });
    wide(p, [[8, 4], [12, 4]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 228, 238], (cc, x, y, k) => { const col = [YL, GRN, [226, 70, 70], [70, 120, 200]][k % 4]; cc.ellipse(x + 2, y + 3, 2.5, 2.5, col); cc.rect(x, y + 4, 5, 1, INK); }, X));
    // Tyres, and a pump.
    one(p, [[6, 4], [7, 5], [18, 6], [2, 15]], (c, top, X, Y) => { shadow(c, X, Y); for (let k = 0; k < 3; k++) { c.ellipse(X + 8, Y + 11 - k * 4, 7, 3, INK); c.ellipse(X + 8, Y + 10 - k * 4, 7, 3, [60, 60, 70]); c.ellipse(X + 8, Y + 10 - k * 4, 3, 1, [150, 154, 170]); } });
    one(p, [[19, 15], [10, 4]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 6, Y - 2, 4, 15, [226, 70, 70], INK); c.rect(X + 3, Y + 13, 10, 2, INK); top.rect(X + 7, Y - 10, 2, 8, ST); top.rect(X + 4, Y - 11, 8, 2, INK); c.line(X + 10, Y + 10, X + 14, Y + 14, INK); });
    one(p, [[2, 4], [19, 4]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});

// ---------------------------------------------------------------- Lumiose: Herboriste and the Looker Bureau
const HERBS = [[110, 170, 90], [150, 110, 190], [226, 200, 100], [90, 140, 110], [200, 120, 110], [170, 200, 120]];
function sack(c, top, X, Y, col) { shadow(c, X, Y); c.ellipse(X + 8, Y + 9, 7, 6, [214, 196, 150]); c.ellipse(X + 8, Y + 9, 7, 6, [150, 130, 96], 1); c.ellipse(X + 8, Y + 4, 5, 3, [150, 130, 96]); c.ellipse(X + 8, Y + 3, 4, 2, col); c.p(X + 7, Y + 2, lt(col, 0.5)); c.rect(X + 5, Y + 10, 6, 1, [176, 156, 116]); }
function barrel(c, top, X, Y, col = [150, 104, 66]) { shadow(c, X, Y); c.box(X + 2, Y - 2, 12, 17, col, dk(col, 0.6)); c.rect(X + 4, Y - 1, 2, 15, lt(col, 0.25)); c.rect(X + 2, Y + 2, 12, 2, [90, 90, 100]); c.rect(X + 2, Y + 10, 12, 2, [90, 90, 100]); c.ellipse(X + 8, Y - 2, 6, 2, lt(col, 0.3)); }
function bundles(c, x, y, w, seed = 0) { for (let k = x + 4, n = seed; k < x + w - 3; k += 9, n++) { const col = HERBS[n % 6]; c.rect(k, y, 1, 4, [150, 130, 96]); c.poly([[k - 1, y + 3], [k + 2, y + 3], [k + 4, y + 12], [k - 3, y + 12]], col); c.rect(k - 1, y + 4, 3, 1, [226, 200, 150]); c.rect(k, y + 6, 1, 5, lt(col, 0.3)); } }
// Herboriste: a herbalist's. Drawers and jars to the ceiling, bunches drying over the counter, sacks and seedlings.
PLANS.KalosHerboriste = shop({
  ground(p, c, yb) {
    const WOOD = [110, 76, 50], CREAM = [226, 206, 150];
    planks(p, c, [160, 120, 82]);
    shopWall(p, c, yb, [64, 104, 76], { panel: WOOD, top: CREAM, skirt: [60, 40, 30] });
    for (const x of [3, 21]) bottleRack(c, x * T, 6, 8 * T, 42, WOOD, CREAM, HERBS.concat([[240, 236, 220]]));
    c.box(12 * T, 6, 8 * T, 42, [240, 232, 200], WOOD); const cx = 16 * T; c.poly([[cx, 12], [cx + 16, 24], [cx + 10, 40], [cx, 44], [cx - 10, 40], [cx - 16, 24]], [90, 150, 90]); c.poly([[cx, 12], [cx + 16, 24], [cx + 10, 40], [cx, 44]], [70, 126, 76]); c.line(cx, 14, cx, 44, [226, 240, 200]); for (const dy of [22, 30]) { c.line(cx, dy + 6, cx - 9, dy, [226, 240, 200]); c.line(cx, dy + 6, cx + 9, dy, [226, 240, 200]); }
    rug(c, 14, 10, 18, 24, [84, 124, 88], CREAM);
  },
  fit(p) {
    const WOOD = [130, 92, 60];
    [3, 5, 7, 9, 11, 19, 21, 23, 25, 27].forEach((x, k) => prop(p, x, 4, 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, WOOD, k % 2 ? jarItem(HERBS) : (cc, px, py) => { cc.box(px - 1, py + 1, 6, 5, lt(WOOD, 0.3), dk(WOOD, 0.4)); cc.p(px + 2, py + 3, GOLD); }, k)));
    wide(p, [[11, 8]], 11, 1, (c, top, X, Y) => {
      counter(c, X, Y, 11 * T, WOOD, [226, 200, 150]); tillBox(top, X + 150, Y, [110, 76, 50]);
      // Scales, mortar, jars.
      top.rect(X + 23, Y - 12, 2, 12, GOLD); top.rect(X + 14, Y - 11, 20, 1, GOLD); for (const dx of [14, 33]) { top.rect(X + dx, Y - 10, 1, 4, GOLD); top.ellipse(X + dx, Y - 5, 4, 2, GOLD); } c.ellipse(X + 52, Y - 1, 6, 3, [200, 200, 206]); c.line(X + 52, Y - 2, X + 58, Y - 8, [150, 150, 160], 2);
      for (let k = 0; k < 5; k++) { top.box(X + 72 + k * 11, Y - 9, 8, 9, [220, 240, 250, 150], [120, 150, 170]); top.rect(X + 73 + k * 11, Y - 5, 6, 4, HERBS[k]); top.rect(X + 72 + k * 11, Y - 10, 8, 2, [150, 108, 70]); }
    });
    // The drying beam over the counter.
    p.paint(9.6, (c, top) => { for (const x of [11 * T, 22 * T - 3]) { top.rect(x, 6 * T + 2, 3, 2 * T - 2, dk(WOOD, 0.3)); } top.rect(11 * T, 6 * T + 2, 11 * T, 3, dk(WOOD, 0.2)); bundles(top, 11 * T + 2, 6 * T + 5, 11 * T - 4, 2); });
    [[3, 6, 0], [4, 6, 1], [3, 7, 2], [28, 6, 3], [29, 6, 4], [29, 7, 5], [10, 23, 2], [22, 23, 0]].forEach(([x, y, k]) => prop(p, x, y, 1, 1, (c, top, X, Y) => sack(c, top, X, Y, HERBS[k])));
    // Seedlings on the benches, baskets on the tables.
    [[3, 13], [3, 17], [26, 13], [26, 17]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, WOOD); for (let n = 0; n < 4; n++) { c.box(X + 4 + n * 11, Y + 2, 8, 7, [190, 110, 70], [110, 60, 40]); top.ellipse(X + 8 + n * 11, Y - 2, 4, 5, HERBS[(n + k) % 6]); top.ellipse(X + 7 + n * 11, Y - 4, 2, 2, lt(HERBS[(n + k) % 6], 0.35)); } }));
    [[9, 13], [20, 13], [9, 18], [20, 18]].forEach(([x, y], k) => prop(p, x, y, 3, 2, (c, top, X, Y) => { table(c, X, Y, 48, 30, [150, 108, 70]); for (let n = 0; n < 4; n++) { const bx = X + 13 + (n % 2) * 22, by = Y + 9 + (n >> 1) * 11; c.ellipse(bx, by, 9, 5, [176, 140, 90]); c.ellipse(bx, by - 1, 7, 3, HERBS[(n * 2 + k) % 6]); c.ellipse(bx - 2, by - 2, 2, 1, lt(HERBS[(n * 2 + k) % 6], 0.4)); } }));
    // Racks of bunches, barrels, and the still.
    wide(p, [[3, 21], [26, 21]], 3, 1, (c, top, X, Y) => { c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 55]); for (const x of [X + 1, X + 45]) c.rect(x, Y - 12, 2, 26, dk(WOOD, 0.3)); c.rect(X + 1, Y + 6, 46, 2, dk(WOOD, 0.3)); top.rect(X + 1, Y - 14, 46, 2, WOOD); bundles(c, X + 2, Y - 12, 44, X >> 4); });
    one(p, [[2, 24], [3, 24], [29, 24], [28, 24], [13, 5], [18, 5]], (c, top, X, Y) => barrel(c, top, X, Y));
    wide(p, [[24, 8]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 14, 4, [0, 0, 0, 60]); c.box(X + 4, Y + 22, 24, 8, [90, 86, 100], INK); flame(c, X + 16, Y + 22, 0.6); c.ellipse(X + 16, Y + 12, 11, 10, [150, 80, 50]); c.ellipse(X + 16, Y + 12, 10, 9, [214, 130, 80]); c.ellipse(X + 12, Y + 8, 3, 4, [250, 190, 140]); top.rect(X + 14, Y - 8, 4, 12, [214, 130, 80]); top.line(X + 16, Y - 8, X + 28, Y - 2, [214, 130, 80], 2); top.line(X + 28, Y - 2, X + 28, Y + 10, [214, 130, 80], 2); c.box(X + 25, Y + 12, 6, 8, [220, 240, 250], [120, 150, 170]); c.rect(X + 26, Y + 16, 4, 3, HERBS[0]); });
    wide(p, [[2, 8]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, WOOD));
    one(p, [[2, 4], [29, 4], [2, 11], [29, 11], [7, 10], [13, 23], [19, 23]], (c, top, X, Y) => plant(c, top, X, Y, HERBS[((X >> 4) + (Y >> 4)) % 2 ? 0 : 3]));
  },
});
// The Looker Bureau: a shabby one-room office. A desk under the blinds, files, boxes never unpacked, a sofa to sleep on.
PLANS.KalosLookerBureau = shop({
  ground(p, c, yb) {
    const [X, Y, W, H] = roomRect(p);
    planks(p, c, [146, 126, 104]); speckle(p, c, 26, p.left, p.top + 2, p.right, p.bottom, 9, (x, y, r) => c.ellipse(x, y, 6 + r * 12, 3 + r * 6, [60, 44, 36, 34]));
    shopWall(p, c, yb, [176, 166, 134], { stripe: [166, 156, 124], gap: 10, sw: 4, panel: [110, 90, 70], top: [200, 190, 160], skirt: [70, 56, 46] });
    for (const [x, y, r] of [[5, 6, 20], [22, 30, 16], [28, 4, 14]]) c.ellipse(x * T, y, r, r * 0.6, [120, 110, 80, 60]);
    for (const x of [13, 17]) blinds(c, x * T - 6, 8, 44, 38, [200, 190, 150], [90, 76, 60]); c.line(17 * T - 2, 30, 17 * T + 34, 34, [232, 228, 214], 2);
    // The case board: clippings joined with red thread.
    cork(c, 4 * T, 8, 7 * T, 40, 7); for (const [a, b, d, e] of [[10, 12, 40, 30], [40, 30, 78, 14], [40, 30, 92, 34], [22, 34, 40, 30]]) c.line(4 * T + a, 8 + b, 4 * T + d, 8 + e, [200, 40, 40]);
    // A map of the city, a hat and coat on the hook.
    c.box(21 * T, 8, 4 * T + 8, 40, [226, 216, 180], [90, 76, 60]); const mx = 23 * T + 4; c.ellipse(mx, 28, 28, 17, [150, 140, 110], 1); c.ellipse(mx, 28, 12, 7, [150, 140, 110], 1); for (let a = 0; a < 6; a++) c.line(mx, 28, mx + Math.cos(a * 1.047) * 28, 28 + Math.sin(a * 1.047) * 17, [150, 140, 110]); c.ellipse(mx, 28, 2, 2, [200, 40, 40]); c.ellipse(mx + 16, 20, 2, 2, [200, 40, 40]);
    c.rect(27 * T + 6, 12, 14, 2, [70, 56, 46]); c.poly([[27 * T + 8, 14], [27 * T + 18, 14], [27 * T + 22, 46], [27 * T + 4, 46]], [176, 150, 100]); c.rect(27 * T + 12, 14, 2, 32, [130, 108, 70]); c.ellipse(28 * T + 12, 12, 7, 2, [110, 90, 60]); c.ellipse(28 * T + 12, 10, 4, 3, [110, 90, 60]);
    // A worn rug, and yesterday's papers on the floor.
    c.box(12 * T, 9 * T, 9 * T, 8 * T, [124, 76, 70], [90, 56, 52]); frame(c, 12 * T + 4, 9 * T + 4, 9 * T - 8, 8 * T - 8, [150, 110, 96]); for (const [x, y, w, h] of [[13, 10, 30, 12], [17, 14, 40, 14], [14, 15, 18, 8]]) c.rect(x * T, y * T, w, h, [140, 100, 90, 150]);
    for (const [x, y] of [[9, 20], [22, 19], [20, 22], [7, 23]]) { c.poly([[x * T, y * T + 3], [x * T + 11, y * T], [x * T + 14, y * T + 8], [x * T + 3, y * T + 11]], [232, 226, 206]); c.line(x * T + 3, y * T + 4, x * T + 10, y * T + 2, [130, 126, 120]); c.line(x * T + 4, y * T + 7, x * T + 11, y * T + 5, [130, 126, 120]); }
  },
  fit(p) {
    const WOOD = [130, 96, 66], GREY = [140, 146, 150], BOX = [196, 160, 110];
    // Looker's desk, behind him.
    one(p, [[16, 4]], (c, top, X, Y) => salonChair(c, top, X, Y, [90, 70, 56]));
    wide(p, [[14, 5]], 5, 1, (c, top, X, Y) => { table(c, X, Y - 2, 80, 18, WOOD); papers(c, X + 10, Y + 3, 5); papers(c, X + 60, Y + 4, 2); c.box(X + 30, Y + 2, 16, 8, [60, 60, 66], INK); c.rect(X + 32, Y + 4, 12, 1, [200, 200, 206]); c.rect(X + 32, Y + 6, 12, 1, [200, 200, 206]); top.rect(X + 72, Y - 10, 2, 10, [70, 90, 70]); top.poly([[X + 62, Y - 8], [X + 74, Y - 14], [X + 76, Y - 9]], [70, 110, 80]); cup(c, X + 52, Y + 6); });
    one(p, [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [24, 4], [25, 4]], (c, top, X, Y) => cabinet(c, X, Y, GREY, (X >> 4) % 3 === 1));
    wide(p, [[26, 4]], 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, WOOD, 5));
    // Boxes.
    [[9, 4], [10, 4], [9, 5], [22, 4], [28, 5], [29, 5], [29, 6], [2, 22], [3, 22], [2, 21], [28, 24]].forEach(([x, y]) => prop(p, x, y, 1, 1, (c, top, X, Y) => { crate(c, X, Y, BOX); c.rect(X + 3, Y + 6, 10, 2, [226, 216, 180]); if ((x + y) % 3 === 0) { top.box(X + 2, Y - 9, 12, 10, lt(BOX, 0.1), dk(BOX, 0.5)); top.rect(X + 2, Y - 5, 12, 1, [226, 216, 180]); } }));
    // The sofa and its table; a table of case files; the second desk.
    wide(p, [[3, 16]], 3, 1, (c, top, X, Y) => { sofa(c, X, Y, 48, [96, 116, 90]); c.box(X + 30, Y + 4, 12, 8, [176, 150, 100], [110, 90, 60]); }); wide(p, [[3, 18]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, WOOD); cup(c, X + 10, Y + 7); c.ellipse(X + 26, Y + 6, 5, 3, WHITE); c.ellipse(X + 26, Y + 5, 3, 2, [226, 180, 110]); c.box(X + 34, Y + 3, 9, 7, [232, 226, 206], [130, 126, 120]); });
    wide(p, [[4, 10]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, WOOD); papers(c, X + 8, Y + 6, 4); papers(c, X + 22, Y + 5, 2); c.ellipse(X + 38, Y + 5, 4, 4, [150, 200, 230], 1); c.line(X + 41, Y + 8, X + 44, Y + 11, INK, 2); });
    wide(p, [[23, 9]], 4, 1, (c, top, X, Y) => { desk(c, top, X, Y, 64, WOOD, [150, 220, 170]); papers(c, X + 50, Y + 4, 3); }); one(p, [[25, 10]], (c, top, X, Y) => stool(c, top, X, Y, [90, 70, 56]));
    // A cot in the corner, a fan, a bin, and plants that need water.
    prop(p, 28, 17, 1, 2, (c, top, X, Y) => bed(c, X, Y + 6, [110, 120, 100])); one(p, [[27, 17]], (c, top, X, Y) => nightstand(c, top, X, Y, WOOD));
    one(p, [[12, 4], [21, 16]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y, 2, 13, GREY); c.rect(X + 4, Y + 13, 8, 2, dk(GREY, 0.3)); top.ellipse(X + 8, Y - 6, 7, 7, dk(GREY, 0.3), 1); for (let a = 0; a < 3; a++) top.line(X + 8, Y - 6, X + 8 + Math.cos(a * 2.09 + 0.4) * 5, Y - 6 + Math.sin(a * 2.09 + 0.4) * 5, [90, 110, 130], 2); top.ellipse(X + 8, Y - 6, 1, 1, INK); });
    one(p, [[19, 5], [8, 16]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 4, Y + 3, 8, 11, GREY, dk(GREY, 0.5)); c.ellipse(X + 8, Y + 3, 4, 2, [232, 226, 206]); c.ellipse(X + 12, Y + 13, 2, 2, [232, 226, 206]); });
    one(p, [[2, 4], [29, 23], [2, 13]], (c, top, X, Y) => plant(c, top, X, Y, [150, 140, 80]));
    wide(p, [[11, 22], [19, 23]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, WOOD));
  },
});

// ---------------------------------------------------------------- Kiloude: the Strategy House and the Friend Safari
PLANS.KalosKiloudeHouse = shop({
  ground(p, c, yb) {
    carpet(p, c, [72, 112, 88]);
    shopWall(p, c, yb, [240, 230, 204], { panel: [130, 92, 60], top: GOLD, skirt: [80, 56, 40] });
    // Battle plans chalked up.
    for (const x of [4, 21]) { const X = x * T; c.box(X, 6, 7 * T, 42, [40, 70, 58], [130, 92, 60]); frame(c, X + 8, 12, 60, 30, [226, 232, 226]); c.rect(X + 8, 26, 60, 1, [226, 232, 226]); c.ellipse(X + 38, 27, 6, 6, [226, 232, 226], 1); for (const [dx, dy, col] of [[18, 18, [240, 130, 110]], [56, 20, [240, 130, 110]], [22, 36, [130, 170, 240]], [52, 34, [130, 170, 240]]]) { c.ellipse(X + dx, dy, 3, 3, col, 1); } c.line(X + 22, 33, X + 50, 22, [250, 230, 150]); c.poly([[X + 50, 22], [X + 46, 21], [X + 48, 26]], [250, 230, 150]); for (let k = 0; k < 4; k++) c.rect(X + 76, 12 + k * 8, 26 - (k % 2) * 8, 1, [226, 232, 226]); }
    // Trophies.
    c.box(13 * T, 10, 6 * T, 36, [110, 76, 50], GOLD); c.rect(13 * T + 2, 28, 6 * T - 4, 2, [150, 108, 70]); for (let k = 0; k < 5; k++) { const x = 13 * T + 14 + k * 17, y = k % 2 ? 44 : 26; c.rect(x - 1, y - 6, 3, 5, GOLD); c.ellipse(x, y - 9, 4, 4, k === 2 ? [226, 226, 236] : GOLD); c.rect(x - 3, y - 2, 7, 2, dk(GOLD, 0.3)); }
    rug(c, 12, 7, 20, 10, [150, 50, 56], GOLD); rug(c, 15, 11, 17, 24, [150, 50, 56], GOLD);
    for (const x of [4, 22]) rug(c, x, 12, x + 5, 16, [56, 90, 70], [200, 180, 130]);
  },
  fit(p) {
    const WOOD = [130, 92, 60];
    [3, 5, 7, 9, 11, 19, 21, 23, 25, 27].forEach((x) => prop(p, x, 4, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, WOOD, x)));
    wide(p, [[14, 5]], 5, 1, (c, top, X, Y) => { table(c, X, Y - 2, 80, 18, WOOD); papers(c, X + 8, Y + 3, 4); c.box(X + 30, Y + 1, 22, 10, [240, 236, 220], [130, 126, 120]); c.rect(X + 33, Y + 4, 16, 1, [200, 60, 60]); c.rect(X + 33, Y + 7, 10, 1, [70, 110, 200]); top.rect(X + 64, Y - 9, 3, 8, GOLD); top.ellipse(X + 65, Y - 11, 5, 4, GOLD); top.rect(X + 61, Y - 1, 9, 2, dk(GOLD, 0.3)); });
    // The planning tables: a court in miniature, counters for each side.
    [[5, 13], [23, 13]].forEach(([x, y], k) => prop(p, x, y, 4, 2, (c, top, X, Y) => { table(c, X, Y, 64, 30, WOOD); c.box(X + 6, Y + 4, 52, 19, [90, 150, 110], [50, 90, 66]); frame(c, X + 9, Y + 6, 46, 15, WHITE); c.rect(X + 32, Y + 6, 1, 15, WHITE); c.ellipse(X + 32, Y + 13, 5, 4, WHITE, 1); for (const [dx, dy, n] of [[16, 10, 0], [20, 17, 1], [44, 9, 2], [48, 16, 3]]) ball(c, X + dx, Y + dy, 2.5, n < 2 ? BALLS[0] : BALLS[1]); if (k) c.line(X + 22, Y + 12, X + 42, Y + 15, [250, 230, 150]); }));
    one(p, [[4, 12], [9, 12], [4, 16], [9, 16], [22, 12], [27, 12], [22, 16], [27, 16]], (c, top, X, Y) => stool(c, top, X, Y, [150, 50, 56]));
    // Reading corner, trophies under glass, a practice dummy.
    wide(p, [[3, 20], [26, 20]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [150, 50, 56])); wide(p, [[3, 22], [26, 22]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, WOOD); for (let k = 0; k < 3; k++) c.box(X + 6 + k * 13, Y + 3, 10, 7, [[200, 60, 60], [70, 110, 200], [250, 220, 110]][k], INK); });
    [[10, 20], [21, 20], [12, 12], [20, 12]].forEach(([x, y], k) => prop(p, x, y, 1, 1, (c, top, X, Y) => showcase(c, top, X, Y, 16, (cc, gx, gy) => { cc.rect(gx - 1, gy, 3, 4, GOLD); cc.ellipse(gx, gy - 3, 4, 4, k % 2 ? [226, 226, 236] : GOLD); cc.rect(gx - 3, gy + 4, 7, 1, dk(GOLD, 0.3)); }, WOOD)));
    one(p, [[12, 20], [19, 20]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 2, 2, 12, WOOD); c.rect(X + 4, Y + 13, 8, 2, dk(WOOD, 0.4)); top.ellipse(X + 8, Y - 10, 4, 4, [226, 200, 150]); top.box(X + 3, Y - 6, 10, 12, [226, 200, 150], [130, 100, 70]); top.rect(X, Y - 4, 16, 3, [226, 200, 150]); top.ellipse(X + 8, Y, 2, 2, [200, 60, 60]); });
    one(p, [[13, 5], [19, 5]], (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 4, 2, 9, [120, 90, 60]); c.rect(X + 4, Y + 12, 8, 2, [120, 90, 60]); planet(top, X + 8, Y, 6, [90, 150, 220]); });
    one(p, [[2, 4], [29, 4], [2, 25], [29, 25], [2, 18], [29, 18]], (c, top, X, Y) => plant(c, top, X, Y));
    wide(p, [[11, 24], [19, 24]], 2, 1, (c, top, X, Y) => bench(c, X, Y, 32, WOOD));
  },
});
function palm(c, top, X, Y) { shadow(c, X, Y); c.box(X + 3, Y + 8, 10, 7, [190, 110, 70], [110, 60, 40]); c.rect(X + 7, Y - 8, 3, 17, [150, 110, 70]); for (let k = Y - 6; k < Y + 8; k += 4) c.rect(X + 7, k, 3, 1, [110, 76, 50]); for (const [dx, dy] of [[-10, -6], [10, -6], [-8, -16], [8, -16], [0, -20], [-11, -11], [11, -11]]) { top.line(X + 8, Y - 9, X + 8 + dx, Y - 9 + dy + 6, [50, 120, 70], 3); top.line(X + 8, Y - 10, X + 8 + dx, Y - 10 + dy + 6, [90, 170, 90], 1); } top.ellipse(X + 8, Y - 9, 3, 2, [110, 76, 50]); }
PLANS.KalosFriendSafariLobby = shop({
  ground(p, c, yb) {
    const X = p.left * T, W = (p.right - p.left + 1) * T, BAM = [200, 164, 96];
    tiled(p, c, [228, 208, 162], [216, 194, 148]);
    // The mural: savannah under a wide sky, and the gate through it.
    for (let y = 0; y < 64; y += 2) c.rect(X, y, W, 2, y < 34 ? mix([120, 196, 240], [226, 240, 220], y / 34) : mix([170, 200, 110], [130, 170, 90], (y - 34) / 30));
    c.ellipse(6 * T, 16, 9, 9, [255, 240, 170]); for (const [x, s] of [[4, 1], [9, 0.7], [23, 0.8], [27, 1.1]]) { c.rect(x * T, 36 - 14 * s, 3, 20 * s, [110, 80, 50]); c.ellipse(x * T + 1, 36 - 16 * s, 16 * s, 6 * s, [60, 130, 70]); c.ellipse(x * T - 2, 34 - 18 * s, 9 * s, 3 * s, [90, 160, 90]); }
    for (let x = X + 4; x < X + W; x += 7) c.rect(x, 58 - p.hash(x, 1, 4) * 8, 2, 6 + p.hash(x, 1, 4) * 8, p.hash(x, 2, 4) < 0.5 ? [90, 150, 80] : [190, 190, 110]);
    for (const [x, y, col] of [[11 * T, 44, [200, 150, 90]], [21 * T + 8, 46, [150, 130, 170]], [7 * T, 50, [226, 200, 120]]]) { c.ellipse(x, y, 6, 4, col); c.ellipse(x + 5, y - 4, 3, 3, col); c.rect(x - 4, y + 3, 2, 4, dk(col, 0.2)); c.rect(x + 3, y + 3, 2, 4, dk(col, 0.2)); }
    c.rect(X, 0, W, 3, BAM); c.rect(X, 61, W, 3, dk(BAM, 0.4));
    c.box(13 * T + 4, 4, 6 * T + 8, 60, BAM, dk(BAM, 0.5)); for (let x = 13 * T + 8; x < 20 * T; x += 6) c.rect(x, 5, 1, 58, dk(BAM, 0.2)); c.box(14 * T + 4, 20, 4 * T + 8, 44, [60, 110, 70], dk(BAM, 0.5)); c.rect(16 * T + 7, 20, 2, 44, dk(BAM, 0.5)); for (const x of [15 * T, 17 * T + 4]) { c.ellipse(x + 6, 40, 9, 12, [80, 140, 84]); c.ellipse(x + 4, 36, 4, 5, [120, 180, 110]); }
    c.box(14 * T, 7, 5 * T, 11, [250, 240, 200], [110, 76, 50]); for (let k = 0; k < 6; k++) c.rect(14 * T + 9 + k * 11, 10, 7, 5, [60, 110, 70]);
    rug(c, 15, 10, 17, 24, [90, 140, 90], [240, 226, 180]); c.rect(15 * T, 4 * T, 3 * T, 4 * T, [200, 176, 126, 160]);
  },
  fit(p) {
    const BAM = [200, 164, 96], GRN = [90, 140, 90];
    tillRow(p, 11, 21, 8, [16], BAM, [110, 160, 100], (c, top, X, Y, w, k) => { for (let x = X + 4; x < X + w; x += 8) c.rect(x, Y + 3, 1, 11, dk(BAM, 0.3)); if (k) { tillBox(top, X + 56, Y, [110, 76, 50]); papers(c, X + 14, Y - 1, 3); } else { top.box(X + 10, Y - 7, 6, 7, [50, 52, 64], INK); top.box(X + 18, Y - 7, 6, 7, [50, 52, 64], INK); top.rect(X + 15, Y - 5, 4, 2, [50, 52, 64]); c.box(X + 44, Y - 3, 14, 5, [250, 240, 200], [110, 76, 50]); } });
    one(p, [[2, 4], [29, 4], [12, 4], [20, 4], [2, 25], [29, 25], [2, 14], [29, 14]], (c, top, X, Y) => palm(c, top, X, Y));
    // What lives where: three boards.
    [[4, 5, [110, 180, 110]], [7, 5, [110, 170, 230]], [22, 5, [226, 190, 120]], [25, 5, [200, 150, 220]]].forEach(([x, y, col]) => prop(p, x, y, 2, 1, (c, top, X, Y) => { c.rect(X + 14, Y, 4, 14, [110, 76, 50]); top.box(X, Y - 18, 32, 20, [250, 240, 200], [110, 76, 50]); top.rect(X + 3, Y - 15, 26, 9, lt(col, 0.4)); for (const dx of [8, 16, 24]) { top.ellipse(X + dx, Y - 10, 3, 3, col); top.p(X + dx - 1, Y - 11, INK); } top.rect(X + 3, Y - 4, 18, 2, [110, 76, 50]); }));
    // The model of the Safari on its table, benches, hats to borrow.
    wide(p, [[5, 12], [23, 12]], 4, 2, (c, top, X, Y) => { table(c, X, Y, 64, 30, [150, 108, 70]); c.box(X + 5, Y + 4, 54, 19, [130, 180, 100], [70, 110, 60]); c.ellipse(X + 20, Y + 13, 9, 5, [110, 170, 230]); c.ellipse(X + 44, Y + 11, 8, 4, [200, 170, 110]); for (const [dx, dy] of [[10, 8], [34, 18], [52, 18], [30, 8]]) { c.ellipse(X + dx, Y + dy, 3, 3, [50, 120, 70]); c.p(X + dx - 1, Y + dy - 1, [120, 190, 120]); } c.ellipse(X + 45, Y + 9, 3, 2, [150, 130, 110]); });
    wide(p, [[4, 17], [25, 17], [4, 21], [25, 21]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, [176, 128, 80]));
    one(p, [[10, 10], [22, 10]], (c, top, X, Y) => hatStand(c, top, X, Y, [[214, 190, 140], GRN, [176, 128, 80]]));
    one(p, [[10, 20], [21, 20]], (c, top, X, Y) => statue(c, top, X, Y, [176, 140, 96]));
    // Crates of supplies and a telescope.
    one(p, [[3, 8], [4, 8], [3, 9], [28, 8], [28, 9]], (c, top, X, Y) => { crate(c, X, Y, [176, 150, 100]); c.rect(X + 4, Y + 5, 8, 4, GRN); });
    one(p, [[26, 9], [12, 22], [20, 22]], (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 8, Y + 2, X + 3, Y + 14, [110, 76, 50]); c.line(X + 8, Y + 2, X + 13, Y + 14, [110, 76, 50]); c.rect(X + 8, Y + 2, 1, 11, [110, 76, 50]); top.line(X + 2, Y - 2, X + 14, Y - 9, [60, 62, 76], 4); top.ellipse(X + 14, Y - 9, 3, 3, [150, 200, 240]); top.rect(X + 1, Y - 3, 3, 3, GOLD); });
  },
});

// ---------------------------------------------------------------- Hotel Richissime: the work floor
// Room service at the back; four guest rooms to make up, and four more to search, in two rows of bays.
function luggage(c, top, X, Y, col) { shadow(c, X, Y); c.box(X + 2, Y + 3, 12, 11, col, dk(col, 0.55)); c.rect(X + 2, Y + 7, 12, 1, dk(col, 0.3)); c.rect(X + 4, Y + 3, 1, 11, GOLD); c.rect(X + 11, Y + 3, 1, 11, GOLD); c.ellipse(X + 8, Y + 2, 3, 2, dk(col, 0.55), 1); }
function trolley(c, top, X, Y) { shadow(c, X, Y); c.box(X + 1, Y + 4, 14, 3, [200, 206, 226], [110, 114, 130]); c.box(X + 1, Y + 10, 14, 3, [200, 206, 226], [110, 114, 130]); c.rect(X + 2, Y + 4, 1, 10, [110, 114, 130]); c.rect(X + 13, Y + 4, 1, 10, [110, 114, 130]); c.rect(X + 2, Y + 13, 2, 2, INK); c.rect(X + 12, Y + 13, 2, 2, INK); top.ellipse(X + 8, Y + 2, 6, 5, [226, 228, 238]); top.ellipse(X + 6, Y, 2, 2, WHITE); top.rect(X + 7, Y - 5, 2, 2, [150, 154, 170]); c.rect(X + 2, Y + 3, 12, 1, WHITE); }
PLANS.KalosRichissimeWork = shop({
  ground(p, c, yb) {
    const RED = [150, 40, 50];
    carpet(p, c, [238, 228, 206]);
    wall(c, 2, 0, 39, yb, [250, 240, 214], { panel: [176, 128, 80], top: GOLD });
    // The pass from the kitchens, the key rack, the rota.
    c.box(15 * T, 8, 13 * T, 38, [90, 96, 116], [50, 54, 70]); c.rect(15 * T + 2, 10, 13 * T - 4, 20, [200, 206, 226]); for (let x = 15 * T + 8; x < 28 * T - 8; x += 13) { c.ellipse(x + 4, 26, 5, 3, WHITE); c.ellipse(x + 4, 22, 4, 4, [226, 228, 238]); c.rect(x + 3, 16, 2, 2, [150, 154, 170]); } c.rect(15 * T + 2, 30, 13 * T - 4, 3, [150, 154, 170]); for (let x = 15 * T + 6; x < 28 * T - 6; x += 9) c.rect(x, 35, 6, 8, (x / 9 | 0) % 3 ? [236, 236, 244] : [250, 220, 150]);
    c.box(4 * T, 8, 7 * T, 30, [120, 80, 56], GOLD); for (let r = 0; r < 3; r++) for (let x = 4 * T + 5; x < 11 * T - 6; x += 9) { c.rect(x, 12 + r * 8, 5, 5, [80, 50, 36]); if ((x + r) % 3) c.rect(x + 2, 13 + r * 8, 1, 3, GOLD); }
    cork(c, 31 * T, 8, 5 * T, 32, 4); c.ellipse(37 * T + 8, 22, 9, 9, GOLD); c.ellipse(37 * T + 8, 22, 7, 7, WHITE); c.rect(37 * T + 8, 17, 1, 5, INK); c.rect(37 * T + 8, 22, 4, 1, INK);
    // Corridors, and a rug to each room.
    rug(c, 3, 10, 38, 12, RED, GOLD); rug(c, 3, 20, 38, 21, RED, GOLD);
    for (let k = 0; k < 4; k++) { rug(c, 5 + 8 * k, 15, 10 + 8 * k, 19, [[226, 190, 190], [190, 206, 230], [200, 226, 190], [230, 214, 170]][k], WHITE); rug(c, 5 + 8 * k, 23, 10 + 8 * k, 27, [[190, 206, 230], [230, 214, 170], [226, 190, 190], [200, 226, 190]][k], WHITE); }
    rug(c, 20, 28, 22, 30, RED, GOLD);
  },
  fit(p) {
    const WOOD = [150, 100, 60], BEDS = [[170, 60, 80], [70, 110, 180], [90, 150, 110], [200, 150, 70]], CASES = [[150, 90, 60], [70, 100, 150], [170, 50, 60], [90, 130, 90]];
    // Room service.
    wide(p, [[14, 4], [24, 4]], 5, 1, (c, top, X, Y) => kitchen(c, top, X, Y, 80, [226, 228, 238], [150, 154, 170])); one(p, [[19, 4], [23, 4]], (c, top, X, Y) => fridge(c, top, X, Y, [226, 228, 238]));
    tillRow(p, 16, 26, 7, [21], WOOD, [250, 240, 214], (c, top, X, Y, w, k) => { for (let n = 0; n < 3; n++) { const x = X + 12 + n * 26; c.ellipse(x, Y - 1, 8, 3, WHITE); top.ellipse(x, Y - 4, 6, 5, [226, 228, 238]); top.ellipse(x - 2, Y - 6, 2, 2, WHITE); top.rect(x - 1, Y - 11, 2, 2, [150, 154, 170]); } });
    one(p, [[14, 8], [28, 8], [19, 9], [23, 9]], (c, top, X, Y) => trolley(c, top, X, Y));
    // The staff room, and the linen store.
    one(p, [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4]], (c, top, X, Y) => cabinet(c, X, Y, [150, 160, 190], (X >> 4) % 4 === 2));
    wide(p, [[5, 7]], 3, 1, (c, top, X, Y) => cafeSet(c, top, X, Y, { table: WOOD, chair: [150, 40, 50] })); wide(p, [[9, 7]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [150, 40, 50]));
    [30, 32, 34, 36].forEach((x) => prop(p, x, 4, 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 214, 196], (cc, px, py, k) => { cc.rect(px, py + 2, 5, 4, k % 3 ? WHITE : [190, 214, 240]); cc.rect(px, py + 3, 5, 1, [200, 200, 214]); }, x)));
    wide(p, [[31, 7], [35, 7]], 2, 1, (c, top, X, Y) => { c.box(X + 1, Y - 10, 30, 25, [236, 240, 246], [120, 126, 146]); for (const dx of [8, 23]) { c.ellipse(X + dx, Y + 5, 6, 6, [120, 126, 146]); c.ellipse(X + dx, Y + 5, 4, 4, [150, 200, 236]); c.ellipse(X + dx - 1, Y + 4, 2, 1, WHITE); } c.rect(X + 3, Y - 8, 26, 3, [200, 206, 226]); c.rect(X + 5, Y - 7, 3, 1, [110, 220, 200]); c.rect(X + 20, Y - 7, 3, 1, [240, 90, 90]); });
    one(p, [[38, 5], [38, 8], [34, 8]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 2, Y + 5, 12, 10, [214, 196, 150], [130, 110, 80]); for (let k = 4; k < 13; k += 3) c.rect(X + k, Y + 6, 1, 8, [176, 156, 116]); c.ellipse(X + 8, Y + 4, 6, 3, WHITE); c.ellipse(X + 6, Y + 2, 3, 2, [190, 214, 240]); });
    // The bays.
    for (const x of [3, 11, 19, 27, 35]) for (const [y, h] of [[14, 6], [23, 5]]) prop(p, x, y, 1, h, (c, top, X, Y) => { c.rect(X + 2, Y + 6, 12, h * T - 6, [0, 0, 0, 40]); c.box(X + 4, Y - 12, 8, h * T + 10, [240, 230, 204], [130, 100, 70]); c.rect(X + 5, Y - 11, 2, h * T + 8, [255, 250, 236]); c.box(X + 3, Y + h * T - 6, 10, 5, [176, 128, 80], [110, 76, 50]); top.box(X + 3, Y - 16, 10, 5, [176, 128, 80], [110, 76, 50]); });
    for (let k = 0; k < 4; k++) {
      const x = 8 * k;
      // A room to make up: the bed half done, clean sheets on the cart.
      prop(p, x + 8, 17, 2, 2, (c, top, X, Y) => { bigBed(c, top, X, Y, BEDS[k], WOOD); if (k % 2) { c.poly([[X + 1, Y + 12], [X + 31, Y + 12], [X + 31, Y + 20], [X + 14, Y + 24], [X + 1, Y + 17]], [244, 244, 248]); c.line(X + 1, Y + 17, X + 14, Y + 24, [200, 200, 214]); } });
      prop(p, x + 10, 17, 1, 1, (c, top, X, Y) => nightstand(c, top, X, Y, WOOD));
      prop(p, x + 4, 18, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 1, Y + 4, 14, 10, [200, 206, 226], [110, 114, 130]); c.rect(X + 2, Y + 14, 2, 2, INK); c.rect(X + 12, Y + 14, 2, 2, INK); for (let n = 0; n < 3; n++) top.box(X + 2, Y - 4 + n * 3, 12, 4, n % 2 ? [190, 214, 240] : WHITE, [170, 170, 190]); });
      prop(p, x + 5, 15, 2, 1, (c, top, X, Y) => { table(c, X, Y, 32, 16, WOOD); c.box(X + 5, Y + 2, 9, 7, WHITE, [170, 170, 190]); top.rect(X + 22, Y - 6, 3, 8, [200, 226, 240]); top.ellipse(X + 23, Y - 8, 3, 3, [240, 130, 150]); });
      // A room to search: wardrobe, cases, things left behind.
      prop(p, x + 4, 23, 2, 2, (c, top, X, Y) => wardrobe(c, top, X, Y, [BEDS[k], WHITE, BEDS[(k + 1) % 4], [226, 214, 196]], WOOD));
      [[9, 23, 0], [10, 23, 1], [10, 24, 2]].forEach(([dx, y, n]) => prop(p, x + dx, y, 1, 1, (c, top, X, Y) => luggage(c, top, X, Y, CASES[(k + n) % 4])));
      prop(p, x + 9, 26, 2, 1, (c, top, X, Y) => { table(c, X, Y, 32, 16, WOOD); c.ellipse(X + 9, Y + 6, 5, 2, CASES[(k + 2) % 4]); c.ellipse(X + 9, Y + 4, 3, 2, CASES[(k + 2) % 4]); if (k % 2) ball(c, X + 23, Y + 5, 3); else c.box(X + 19, Y + 3, 8, 6, [110, 160, 236], INK); });
      prop(p, x + 5, 26, 1, 1, (c, top, X, Y) => sofa(c, X, Y, 16, BEDS[(k + 2) % 4]));
    }
    // The laundry end, and the way back down.
    wide(p, [[36, 14], [38, 14]], 2, 1, (c, top, X, Y) => rack(c, X, Y, 32, [226, 214, 196], (cc, px, py, k) => { cc.rect(px, py + 2, 5, 4, k % 2 ? WHITE : [240, 200, 200]); cc.rect(px, py + 3, 5, 1, [200, 200, 214]); }, X));
    wide(p, [[36, 17]], 3, 1, (c, top, X, Y) => { table(c, X, Y, 48, 16, [236, 240, 246]); c.poly([[X + 30, Y + 3], [X + 42, Y + 5], [X + 30, Y + 9]], [150, 154, 170]); c.rect(X + 32, Y + 2, 6, 2, INK); c.box(X + 6, Y + 3, 14, 7, [190, 214, 240], [150, 150, 170]); });
    one(p, [[37, 24], [38, 24], [38, 25]], (c, top, X, Y) => luggage(c, top, X, Y, CASES[(X >> 4) % 4]));
    wide(p, [[36, 27]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, WOOD));
    one(p, [[18, 30], [24, 30]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 1, Y + 9, 14, 4, GOLD, dk(GOLD, 0.5)); c.box(X + 3, Y + 3, 10, 6, [110, 76, 50], INK); top.box(X + 4, Y - 3, 8, 6, [170, 40, 60], INK); top.rect(X + 1, Y - 10, 1, 20, GOLD); top.rect(X + 14, Y - 10, 1, 20, GOLD); top.rect(X + 1, Y - 10, 14, 1, GOLD); });
    wide(p, [[6, 30], [12, 30], [27, 30], [33, 30]], 3, 1, (c, top, X, Y) => sofa(c, X, Y, 48, [150, 40, 50]));
    one(p, [[2, 4], [39, 4], [2, 31], [39, 31], [2, 13], [2, 22], [12, 4], [29, 4], [16, 30], [26, 30]], (c, top, X, Y) => plant(c, top, X, Y));
  },
});

// ---------------------------------------------------------------- Route 22: the gate to Victory Road
PLANS.KalosRoute22LeagueGate = shop({
  ground(p, c, yb) {
    const BADGES = [[150, 190, 90], [200, 170, 120], [240, 150, 60], [110, 200, 110], [250, 220, 80], [240, 150, 200], [170, 120, 220], [150, 220, 240]];
    tiled(p, c, [158, 164, 186], [168, 174, 196]);
    stoneWall(c, p.left, p.right, yb, [136, 140, 164]);
    BADGES.forEach((col, k) => { const x = (k < 4 ? 3 + k * 2 : 7 + k * 2) * T + 1; banner(c, x, 8, 14, 38, dk(col, 0.25), col); c.ellipse(x + 7, 24, 2, 2, WHITE); });
    // The arch, and the dark of Victory Road beyond it.
    const ax = 12 * T + 8; c.box(ax - 26, 6, 52, 58, [206, 202, 216], [90, 86, 110]); c.ellipse(ax, 8, 26, 8, [90, 86, 110]); c.ellipse(ax, 9, 24, 7, [226, 222, 236]); for (const dx of [-24, 16]) { c.rect(ax + dx, 14, 8, 50, [180, 176, 194]); c.rect(ax + dx + 1, 14, 2, 50, [236, 232, 244]); for (let y = 22; y < 64; y += 12) c.rect(ax + dx, y, 8, 1, [120, 116, 140]); }
    c.rect(ax - 14, 22, 28, 42, [12, 10, 20]); c.ellipse(ax, 22, 14, 8, [12, 10, 20]); for (let k = 3; k >= 1; k--) c.ellipse(ax, 58, 5 * k, 9 * k, [90, 110, 190, 22]); ball(c, ax, 9, 5, [226, 190, 60]);
    c.rect(12 * T, 4 * T, T, T, [12, 10, 20]); steps(c, 12, 4, [190, 186, 204]);
    // The way through, and the League's seal where the guard stands.
    c.rect(12 * T - 2, 5 * T, T + 4, 12 * T, [206, 202, 216, 150]); c.rect(12 * T - 3, 5 * T, 1, 12 * T, GOLD); c.rect(13 * T + 2, 5 * T, 1, 12 * T, GOLD);
    const cy = 9 * T + 8; c.ellipse(ax, cy, 50, 30, [206, 202, 216]); c.ellipse(ax, cy, 50, 30, GOLD, 2); c.ellipse(ax, cy, 38, 22, [150, 40, 50]); c.ellipse(ax, cy, 38, 22, GOLD, 1); c.rect(ax - 37, cy - 1, 74, 3, GOLD); c.ellipse(ax, cy, 12, 8, GOLD); c.ellipse(ax, cy, 9, 5, [206, 202, 216]);
    for (const x of [10, 13]) glow(c, x * T + 16, 12 * T + 10, 30, [250, 150, 50], 18);
  },
  fit(p) {
    const ST = [190, 186, 204];
    // Champions' statues, and the braziers either side of the way.
    wide(p, [[5, 5], [17, 5]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 30, 16, 3, [0, 0, 0, 60]); c.box(X + 1, Y + 14, 30, 17, ST, [90, 86, 110]); c.rect(X + 2, Y + 15, 28, 3, lt(ST, 0.4)); c.rect(X + 8, Y + 22, 16, 5, GOLD); lucario(c, top, X + 16, Y + 16, 0.55, [176, 180, 200]); });
    wide(p, [[10, 12], [13, 12]], 2, 2, (c, top, X, Y) => { c.ellipse(X + 16, Y + 29, 14, 4, [0, 0, 0, 60]); c.box(X + 9, Y + 12, 14, 18, ST, [90, 86, 110]); c.rect(X + 11, Y + 13, 3, 16, lt(ST, 0.4)); c.box(X + 5, Y + 26, 22, 5, dk(ST, 0.15), [90, 86, 110]); c.poly([[X + 2, Y + 4], [X + 30, Y + 4], [X + 24, Y + 13], [X + 8, Y + 13]], [96, 98, 112]); c.rect(X + 2, Y + 3, 28, 3, [130, 132, 150]); flame(top, X + 16, Y + 4, 1.5); flame(top, X + 9, Y + 4, 0.8); flame(top, X + 23, Y + 4, 0.8); });
    one(p, [[3, 9], [20, 9], [3, 14], [20, 14], [8, 6], [15, 6]], (c, top, X, Y) => pillar(c, top, X, Y, [206, 202, 216]));
    one(p, [[9, 4], [15, 4]], (c, top, X, Y) => torch(c, top, X, Y));
    one(p, [[2, 4], [21, 4], [2, 17], [21, 17]], (c, top, X, Y) => armour(c, top, X, Y));
    // The register every challenger signs.
    one(p, [[14, 9]], (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 5, Y + 2, 6, 13, [110, 76, 50], INK); top.box(X + 1, Y - 6, 14, 9, [150, 108, 70], INK); top.rect(X + 3, Y - 4, 10, 5, WHITE); top.rect(X + 8, Y - 4, 1, 5, [170, 170, 190]); });
    wide(p, [[4, 11], [17, 11]], 3, 1, (c, top, X, Y) => bench(c, X, Y, 48, [130, 126, 150]));
  },
});
