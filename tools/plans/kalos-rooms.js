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
// The photo gallery: bug photographs on the walls and on display boards, and the hole down to the web.
PLANS.KalosGymGallery = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const bugs = [[236, 120, 150], [250, 210, 90], [120, 190, 110], [110, 160, 230], [200, 120, 220], [240, 150, 80]];
    p.bare(1); p.block(2, 2, 20, 2);
    p.paint(0, (c) => {
      wall(c, 2, 0, 21, 3, [236, 230, 214], { panel: [176, 140, 100] });
      for (let k = 0; k < 6; k++) picture(c, 40 + k * 50, 8, 36, 28, { sky: k % 2 ? [190, 226, 200] : [200, 224, 244], ground: [120, 180, 110], wings: bugs[k] });
      for (let k = 0; k < 6; k++) { c.rect(56 + k * 50, 4, 4, 3, [90, 90, 100]); c.poly([[52 + k * 50, 7], [64 + k * 50, 7], [70 + k * 50, 40], [46 + k * 50, 40]], [255, 250, 210, 26]); }
      rug(c, 11, 7, 13, 18, [70, 140, 90], [220, 230, 150]);
      // The way down to the web.
      const X = 12 * T + 8, Y = 5 * T + 8; c.ellipse(X, Y, 15, 11, [110, 84, 60]); c.ellipse(X, Y, 13, 9, [20, 18, 26]); c.ellipse(X, Y + 1, 10, 6, [10, 10, 16]);
      for (let a = 0; a < 6; a++) c.line(X, Y, X + Math.cos(a * Math.PI / 3) * 12, Y + Math.sin(a * Math.PI / 3) * 8, [220, 226, 236, 150]);
      c.ellipse(X, Y, 7, 5, [220, 226, 236, 150], 1);
    });
    p.paint(6, (c, top) => { top.rect(12 * T + 7, 4 * T - 6, 2, 30, [200, 204, 214]); top.rect(12 * T + 6, 4 * T - 8, 4, 3, [120, 124, 140]); });
    [[4, 8], [17, 8], [4, 14], [17, 14]].forEach(([x, y], k) => prop(p, x, y, 3, 1, (c, top, X, Y) => {
      c.ellipse(X + 24, Y + 14, 24, 3, [0, 0, 0, 50]); c.rect(X + 3, Y + 6, 3, 9, [120, 124, 140]); c.rect(X + 42, Y + 6, 3, 9, [120, 124, 140]);
      top.box(X, Y - 16, 48, 24, WHITE, [120, 124, 140]); picture(top, X + 3, Y - 13, 20, 18, { sky: [196, 226, 204], wings: bugs[k] }, [60, 60, 70]); picture(top, X + 25, Y - 13, 20, 18, { sky: [204, 220, 244], blob: bugs[k + 2] }, [60, 60, 70]);
    }));
    for (const [x, y] of [[2, 4], [21, 4], [2, 19], [21, 19]]) prop(p, x, y, 1, 1, (c, top, X, Y) => plant(c, top, X, Y));
    // A camera on its tripod.
    prop(p, 16, 5, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 8, Y, X + 3, Y + 14, INK); c.line(X + 8, Y, X + 13, Y + 14, INK); c.line(X + 8, Y, X + 8, Y + 13, INK); top.box(X + 2, Y - 8, 12, 9, [60, 60, 72], INK); top.ellipse(X + 8, Y - 3, 3, 3, [150, 190, 230]); top.rect(X + 10, Y - 10, 3, 2, [200, 60, 60]); });
  },
};
// The spiderweb: silk strands over the dark, beaded with dew; Viola's canvas at the far side.
PLANS.KalosGymWeb = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const SILK = [232, 236, 246], SH = [150, 162, 190];
    p.paint(0, (c) => {
      voidFill(p, c, [14, 18, 26]);
      for (let k = 0; k < 60; k++) c.ellipse(p.hash(k, 1, 3) * p.W * T, p.hash(k, 2, 3) * p.H * T, 30, 18, [30, 44, 50, 26]);
      // The great web behind everything.
      const cx = 18 * T + 8, cy = 17 * T, N = 16, R = (k, a) => k * (1 + 0.06 * Math.sin(a * 5));
      for (let a = 0; a < N; a++) { const t = a * 2 * Math.PI / N + 0.1; c.line(cx, cy, cx + Math.cos(t) * 330, cy + Math.sin(t) * 330, [150, 166, 196, 110]); }
      for (let r = 34; r < 330; r += 30) for (let a = 0; a < N; a++) { const t0 = a * 2 * Math.PI / N + 0.1, t1 = (a + 1) * 2 * Math.PI / N + 0.1, r0 = R(r, a), mx = cx + Math.cos((t0 + t1) / 2) * r0 * 0.9, my = cy + Math.sin((t0 + t1) / 2) * r0 * 0.9; c.line(cx + Math.cos(t0) * r0, cy + Math.sin(t0) * r0, mx, my, [170, 184, 210, 100]); c.line(mx, my, cx + Math.cos(t1) * r0, cy + Math.sin(t1) * r0, [170, 184, 210, 100]); }
      // The strands that can be walked.
      floors(p, (x, y, X, Y) => {
        c.rect(X, Y, T, T, [14, 18, 26]);
        const n = [p.isFloor(x, y - 1), p.isFloor(x + 1, y), p.isFloor(x, y + 1), p.isFloor(x - 1, y)];
        if (n[0]) { c.rect(X + 4, Y, 8, 8, SH); c.rect(X + 5, Y, 6, 8, SILK); } if (n[2]) { c.rect(X + 4, Y + 8, 8, 8, SH); c.rect(X + 5, Y + 8, 6, 8, SILK); }
        if (n[3]) { c.rect(X, Y + 4, 8, 8, SH); c.rect(X, Y + 5, 8, 6, SILK); } if (n[1]) { c.rect(X + 8, Y + 4, 8, 8, SH); c.rect(X + 8, Y + 5, 8, 6, SILK); }
        c.box(X + 3, Y + 3, 10, 10, SILK, SH); c.rect(X + 6, Y + 6, 4, 4, [250, 252, 255]);
        if (n.filter(Boolean).length <= 2 && p.hash(x, y, 7) < 0.5) { const dx = n[1] || n[3] ? 0 : (p.hash(x, y, 8) < 0.5 ? -7 : 6), dy = n[1] || n[3] ? (p.hash(x, y, 8) < 0.5 ? -6 : 13) : 0; c.ellipse(X + 8 + dx, Y + (n[1] || n[3] ? dy : 8), 2, 2, [150, 220, 250]); c.p(X + 7 + dx, Y + (n[1] || n[3] ? dy : 8) - 1, WHITE); }
      });
      // Viola's stage: a woven mat and her big photograph.
      c.rect(16 * T, 4 * T, 5 * T, 3 * T, [226, 240, 214, 90]); frame(c, 16 * T, 4 * T, 5 * T, 3 * T, [120, 190, 110], 2);
      c.rect(15 * T + 4, T + 2, 7 * T - 8, 3 * T - 6, [60, 50, 44]); picture(c, 15 * T + 8, T + 6, 7 * T - 16, 3 * T - 14, { sky: [190, 230, 240], ground: [110, 180, 110], wings: [240, 130, 170] }, [200, 170, 100]);
      c.line(15 * T + 10, 4 * T - 4, 15 * T + 4, 4 * T + 6, [90, 76, 60], 2); c.line(22 * T - 10, 4 * T - 4, 22 * T - 4, 4 * T + 6, [90, 76, 60], 2);
    });
    // Dew on the web, over everything.
    p.paint(99, (c, top) => speckle(p, c, 70, 1, 1, p.W - 2, p.H - 2, 5, (x, y) => { if (!p.isFloor(x / T | 0, y / T | 0)) { c.ellipse(x, y, 1.5, 1.5, [150, 220, 250, 190]); c.p(x - 1, y - 1, WHITE); } }));
  },
};

// ---------------------------------------------------------------- Cyllage Gym (Grant, Rock)
// A climbing wall: ledges on a cliff face, joined by routes of coloured holds; Grant's pitch at the top.
PLANS.KalosCyllageGym = {
  theme: { room: "arena", floor: "gravel", wall: null },
  plan(p) {
    const routes = [[1, 2, [236, 80, 70]], [3, 4, [90, 150, 236]], [5, 6, [250, 206, 70]], [7, 8, [110, 200, 110]]];
    for (let k = 1; k <= 8; k++) p.bare(k);
    p.fill("lawn", 22, 4, 33, 8);
    p.paint(0, (c) => {
      const W = p.W * T, H = p.H * T;
      behind(p, c, () => {
      for (let y = 0; y < H; y += 4) c.rect(0, y, W, 4, mix([156, 118, 88], [120, 88, 68], (Math.sin(y * 0.05) + 1) / 2 * 0.6 + p.hash(1, y, 2) * 0.3));
      speckle(p, c, 500, 0, 0, p.W - 1, p.H - 1, 4, (x, y, r) => { c.rect(x, y, 10 + r * 30, 1, [96, 70, 56, 150]); if (r > 0.6) c.rect(x + 3, y + 1, 1, 5 + r * 8, [96, 70, 56, 130]); if (r < 0.3) c.rect(x, y + 3, 6 + r * 20, 1, [196, 160, 124, 120]); });
      // Routes of holds between the ledges, and stray holds.
      for (const [a, b, col] of routes) { const A0 = p.warps[a], B0 = p.warps[b], n = Math.round(Math.hypot(A0.x - B0.x, A0.y - B0.y) * T / 11); for (let k = 0; k <= n; k++) { const x = (A0.x + (B0.x - A0.x) * k / n) * T + 8 + (p.hash(k, a, 6) - 0.5) * 14, y = (A0.y + (B0.y - A0.y) * k / n) * T + 8 + (p.hash(k, a, 7) - 0.5) * 8; c.ellipse(x + 1, y + 1, 3, 2, [60, 44, 40, 160]); c.ellipse(x, y, 3, 2, col); c.p(x - 1, y - 1, lt(col, 0.6)); } }
      speckle(p, c, 160, 1, 1, p.W - 2, p.H - 2, 9, (x, y, r, k) => { const col = [[236, 80, 70], [90, 150, 236], [250, 206, 70], [110, 200, 110], [230, 230, 236]][k % 5]; c.ellipse(x + 1, y + 1, 2, 2, [60, 44, 40, 150]); c.ellipse(x, y, 2, 2, col); });
      });
      // The ledges.
      wash(p, c, [236, 222, 190, 90], 0, 9);
      ledge(p, c, [104, 76, 60], [226, 206, 170], 12);
      court(c, 22, 4, 33, 8, [200, 150, 90]);
      for (const [a, b, col] of routes) for (const k of [a, b]) { const w = p.warps[k], X = w.x * T, Y = w.y * T; c.box(X + 1, Y + 1, 14, 14, dk(col, 0.35), dk(col, 0.65)); c.poly([[X + 8, Y + 3], [X + 13, Y + 9], [X + 10, Y + 9], [X + 10, Y + 13], [X + 6, Y + 13], [X + 6, Y + 9], [X + 3, Y + 9]], lt(col, 0.35)); }
      // Ropes hanging down the face.
      for (const x of [3, 20, 36]) for (let y = 2 * T; y < 34 * T; y += 3) if (!p.isFloor(x, y / T | 0)) c.rect(x * T + 6 + Math.round(Math.sin(y * 0.04) * 2), y, 2, 2, (y / 3 | 0) % 2 ? [226, 214, 180] : [176, 150, 110]);
    });
    for (const [x, y] of [[22, 4], [33, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.poly([[X + 1, Y + 14], [X + 3, Y + 2], [X + 9, Y - 4], [X + 14, Y + 4], [X + 15, Y + 14]], [110, 86, 70]); c.poly([[X + 3, Y + 13], [X + 4, Y + 3], [X + 9, Y - 3], [X + 10, Y + 8]], [176, 146, 116]); });
  },
};

// ---------------------------------------------------------------- Shalour Gym (Korrina, Fighting)
// The roller rink: a banked skating floor, the grind rails up the middle, and Korrina's platform beyond them.
PLANS.KalosShalourGym = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const OR = [240, 140, 50], YL = [250, 214, 80];
    p.paint(0, (c) => {
      voidFill(p, c, [34, 38, 62]);
      for (let k = -p.H * T; k < p.W * T; k += 24) c.line(k, 0, k + p.H * T, p.H * T, [46, 52, 84], 6);
      // Seating round the hall.
      for (const [x0, x1] of [[1, 17], [27, 42]]) for (let r = 0; r < 9; r++) { const y = 2 * T + r * 10; c.rect(x0 * T, y, (x1 - x0 + 1) * T, 9, r & 1 ? [70, 74, 104] : [58, 62, 90]); for (let x = x0 * T + 3 + (r & 1) * 3; x < (x1 + 1) * T - 5; x += 7) if (p.hash(x, r, 4) > 0.25) { c.rect(x, y + 3, 4, 5, [OR, YL, WHITE, [90, 150, 230], [230, 90, 90]][Math.floor(p.hash(x, r, 5) * 5)]); c.rect(x + 1, y + 1, 2, 2, SKIN); } }
      // The rink.
      wash(p, c, [255, 244, 226, 130], 4, 23, 39, 34);
      const cx = 22 * T, cy = 29 * T;
      c.ellipse(cx, cy, 270, 88, A(OR, 210), 5); c.ellipse(cx, cy, 200, 62, A(YL, 220), 4); c.ellipse(cx, cy, 120, 36, [90, 150, 230, 200], 3);
      for (let a = 0; a < 24; a++) { const t = a * Math.PI / 12; c.line(cx + Math.cos(t) * 206, cy + Math.sin(t) * 65, cx + Math.cos(t) * 262, cy + Math.sin(t) * 85, [255, 255, 255, 150]); }
      c.ellipse(cx, cy, 30, 20, OR); c.ellipse(cx, cy, 26, 17, WHITE); c.rect(cx - 26, cy - 1, 52, 2, INK); c.ellipse(cx, cy, 6, 6, INK); c.ellipse(cx, cy, 4, 4, WHITE);
      // The run-up and its rails.
      wash(p, c, A(OR, 110), 21, 8, 23, 22);
      for (let y = 8; y <= 22; y++) if (p.isFloor(21, y)) c.poly([[22 * T + 2, y * T + 11], [22 * T + 8, y * T + 4], [22 * T + 14, y * T + 11], [22 * T + 11, y * T + 11], [22 * T + 8, y * T + 8], [22 * T + 5, y * T + 11]], A(WHITE, 190));
      for (const y of [9, 12, 15, 18]) {
        for (const x of [21, 23]) { c.box(x * T, y * T, T, T, [60, 62, 80], INK); for (let k = 0; k < 4; k++) c.poly([[x * T + 1 + k * 4, y * T + 15], [x * T + 5 + k * 4, y * T + 1], [x * T + 7 + k * 4, y * T + 1], [x * T + 3 + k * 4, y * T + 15]], YL); frame(c, x * T, y * T, T, T, INK); }
        c.rect(22 * T, y * T, T, T, [44, 46, 64]); c.rect(22 * T + 5, y * T - 2, 6, T + 4, [120, 124, 144]); c.rect(22 * T + 6, y * T - 2, 2, T + 4, [236, 240, 250]); c.rect(22 * T + 2, y * T + 6, 12, 3, [90, 94, 114]);
      }
      // Korrina's platform.
      wash(p, c, [255, 255, 255, 110], 19, 4, 25, 7); court(c, 19, 4, 25, 7, OR, [90, 150, 230]);
      ledge(p, c, [200, 110, 40], YL, 9);
      wall(c, 18, 1, 26, 3, [236, 236, 244], { stripe: [220, 222, 236], gap: 16, skirt: OR });
      for (const [x, col] of [[18.6, OR], [24.6, [90, 150, 230]]]) banner(c, x * T, T + 8, 14, 26, col, WHITE);
      // Her emblem: a clenched glove.
      c.ellipse(22 * T + 8, 2 * T + 8, 15, 15, YL); c.ellipse(22 * T + 8, 2 * T + 8, 12, 12, OR); c.box(22 * T + 3, 2 * T + 3, 10, 9, WHITE, INK); c.box(22 * T + 5, 2 * T + 11, 6, 4, WHITE, INK); for (let k = 0; k < 3; k++) c.rect(22 * T + 5 + k * 3, 2 * T + 4, 1, 4, INK);
    });
    // Cones on the rink.
    for (const [x, y] of [[6, 24], [37, 24], [6, 33], [37, 33], [14, 29], [30, 30]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.poly([[X + 3, Y + 14], [X + 13, Y + 14], [X + 9, Y + 1], [X + 7, Y + 1]], OR); c.rect(X + 5, Y + 7, 6, 2, WHITE); c.rect(X + 2, Y + 13, 12, 2, dk(OR, 0.3)); });
  },
};


// ---------------------------------------------------------------- Coumarine Gym (Ramos, Grass)
function foliage(p, c, n, cols, seed, x0 = 0, y0 = 0, x1 = p.W - 1, y1 = p.H - 1) { speckle(p, c, n, x0, y0, x1, y1, seed, (x, y, r, k) => { const col = cols[k % cols.length], s = 7 + r * 9; c.ellipse(x, y, s, s * 0.7, dk(col, 0.25)); c.ellipse(x - 1, y - 2, s * 0.8, s * 0.5, col); c.ellipse(x - s * 0.3, y - s * 0.3, s * 0.25, s * 0.15, lt(col, 0.25)); }); }
function bark(c, X, Y, w, h, col = [124, 88, 58]) { c.rect(X, Y, w, h, col); for (let x = X + 3; x < X + w - 2; x += 7) for (let y = Y; y < Y + h; y += 4) c.rect(x + Math.round(Math.sin((y + x) * 0.11) * 2), y, 2, 4, dk(col, 0.3)); c.rect(X, Y, 3, h, dk(col, 0.4)); c.rect(X + w - 3, Y, 3, h, dk(col, 0.4)); c.rect(X + 5, Y, 3, h, lt(col, 0.15)); }
function rope(c, x0, y0, x1, y1, sag = 10, w = 3) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3); let px = x0, py = y0; for (let k = 1; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag; c.line(px, py, x, y, k % 3 ? [214, 180, 120] : [150, 116, 70], w); px = x; py = y; } }
// The foot of the great tree: a mossy hollow, the trunk at the back and the net that climbs into it.
PLANS.KalosCoumarineGym = {
  theme: { room: "arena", floor: "grass", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 20, 3); p.fill("dirt", 11, 5, 13, 19); p.fill("flowersRed", 3, 8, 6, 9); p.fill("flowersPink", 17, 13, 20, 14); p.fill("flowersBlue", 4, 15, 6, 16); p.fill("flowersBlue", 16, 7, 19, 8);
    p.paint(0, (c) => {
      c.rect(2 * T, 0, 20 * T, 5 * T, [30, 70, 50]); foliage(p, c, 130, [[50, 120, 70], [70, 150, 80], [40, 100, 66], [96, 170, 90]], 3, 2, 0, 21, 4);
      bark(c, 8 * T, 0, 9 * T, 5 * T); c.ellipse(12 * T + 8, 5 * T, 5 * T, 10, [100, 70, 46]);
      // The hollow and the climbing net.
      c.ellipse(12 * T + 8, 4 * T + 2, 22, 30, [40, 28, 24]); c.rect(11 * T - 6, 4 * T + 2, 44, 14, [40, 28, 24]);
      for (let k = -18; k <= 18; k += 6) c.line(12 * T + 8 + k, 2 * T + 4, 12 * T + 8 + k, 5 * T, [214, 180, 120]); for (let y = 2 * T + 8; y < 5 * T; y += 6) c.rect(11 * T - 4, y, 40, 1, [214, 180, 120]);
      c.rect(12 * T, 5 * T, T, T, [150, 116, 70]); for (let k = 2; k < 16; k += 4) c.rect(12 * T, 5 * T + k, T, 1, [96, 70, 46]);
      for (const x of [3, 5, 18, 20]) { c.rect(x * T + 6, 4 * T, 4, 12, [110, 80, 54]); }
    });
    for (const [x, y, k] of [[3, 6, 0], [20, 6, 1], [8, 12, 1], [16, 17, 0], [3, 18, 1], [20, 18, 0], [7, 6, 0], [17, 5, 1]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { const col = k ? [236, 110, 110] : [240, 200, 90]; shadow(c, X, Y); c.rect(X + 6, Y + 4, 4, 10, [236, 228, 210]); top.ellipse(X + 8, Y + 2, 8, 6, dk(col, 0.3)); top.ellipse(X + 8, Y + 1, 7, 5, col); top.ellipse(X + 5, Y, 2, 1, WHITE); top.ellipse(X + 11, Y + 2, 1, 1, WHITE); });
    for (const [x, y] of [[2, 11], [21, 10], [9, 16], [15, 9]]) p.decor("hedge", x, y, { optional: true });
  },
};
// The canopy: wooden decks among the leaves, with rope swings between them.
function canopy(level) {
  return {
    theme: { room: "arena", floor: "deck", wall: null },
    plan(p) {
      for (let k = 1; k <= 5; k++) p.bare(k);
      const greens = level ? [[70, 150, 84], [110, 180, 96], [56, 130, 80], [150, 200, 110]] : [[40, 104, 66], [60, 130, 76], [34, 90, 62], [84, 150, 84]];
      p.paint(0, (c) => {
        behind(p, c, () => {
          voidFill(p, c, level ? [120, 190, 226] : [22, 56, 44]);
          if (level) for (let k = 0; k < 9; k++) c.ellipse(p.hash(k, 1, 2) * p.W * T, p.hash(k, 2, 2) * p.H * T, 40, 10, [236, 244, 250, 150]);
          foliage(p, c, level ? 420 : 700, greens, 5 + level);
          // The trunk and its boughs.
          bark(c, 19 * T, 0, 4 * T, p.H * T); for (const [x0, y0, x1, y1] of [[19, 16, 10, 12], [23, 14, 30, 12], [23, 8, 28, 3], [19, 24, 12, 28]]) { c.line(x0 * T, y0 * T, x1 * T, y1 * T, [86, 60, 42], 9); c.line(x0 * T, y0 * T - 2, x1 * T, y1 * T - 2, [136, 98, 64], 4); }
          foliage(p, c, 60, greens, 9 + level);
          // Rope swings between the decks, and the net to the next level.
          for (const [a, b] of [[2, 3], [4, 5]]) { const A0 = p.warps[a], B0 = p.warps[b]; rope(c, A0.x * T + 8, A0.y * T + 8, B0.x * T + 8, B0.y * T + 8, 12); }
        });
        ledge(p, c, [110, 78, 50], [214, 180, 120], 10);
        floors(p, (x, y, X, Y) => { if ((x + y) % 7 === 0) c.rect(X + 3, Y + 5, 2, 2, [110, 78, 50]); });
        for (const k of [2, 3, 4, 5]) { const w = p.warps[k], X = w.x * T, Y = w.y * T; c.ellipse(X + 8, Y + 8, 7, 6, [96, 70, 46]); c.ellipse(X + 8, Y + 8, 5, 4, [226, 196, 130]); c.ellipse(X + 8, Y + 8, 2, 2, [150, 116, 70]); }
        { const w = p.warps[1], X = w.x * T, Y = w.y * T; c.box(X - 2, Y - 2, 20, 20, [150, 116, 70], [80, 56, 40]); for (let k = 1; k < 20; k += 5) { c.rect(X - 1 + k, Y - 1, 1, 18, [226, 196, 130]); c.rect(X - 1, Y - 1 + k, 18, 1, [226, 196, 130]); } }
      });
      for (const k of [2, 3, 4, 5]) { const w = p.warps[k]; p.paint(w.y + 1, (c, top) => { top.rect(w.x * T + 7, w.y * T - 18, 2, 22, [214, 180, 120]); top.rect(w.x * T + 3, w.y * T + 3, 10, 3, [150, 100, 60]); }); }
      for (const [x, y] of [[4, 13], [17, 13], [4, 27], [17, 27], [24, 13], [37, 13], [25, 4], [36, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { c.box(X + 5, Y + 2, 6, 13, [150, 108, 66], [80, 56, 40]); top.ellipse(X + 8, Y - 1, 8, 7, dk(greens[1], 0.2)); top.ellipse(X + 7, Y - 2, 6, 5, greens[3]); });
    },
  };
}
PLANS.KalosCoumarineCanopy1 = canopy(0);
PLANS.KalosCoumarineCanopy2 = canopy(1);
// Ramos's perch: a garden on the crown of the tree, open to the sky.
PLANS.KalosCoumarineSummit = {
  theme: { room: "arena", floor: "lawn", wall: null },
  plan(p) {
    p.block(2, 2, 28, 2);
    for (const [k, x0, y0, x1, y1] of [["flowersRed", 3, 5, 6, 6], ["flowersPink", 25, 5, 28, 6], ["flowersBlue", 3, 17, 6, 18], ["flowersRed", 25, 17, 28, 18], ["flowersPink", 3, 11, 4, 12], ["flowersBlue", 27, 11, 28, 12]]) p.fill(k, x0, y0, x1, y1);
    p.fill("dirt", 15, 15, 17, 21);
    p.paint(0, (c) => {
      c.rect(2 * T, 0, 28 * T, 4 * T, [130, 196, 236]); for (let k = 0; k < 6; k++) c.ellipse((4 + k * 5) * T, 14 + (k % 2) * 12, 34, 9, [240, 246, 252, 200]);
      foliage(p, c, 90, [[70, 150, 84], [110, 180, 96], [56, 130, 80]], 4, 2, 2.6, 29, 3.4); foliage(p, c, 26, [[70, 150, 84], [110, 180, 96]], 6, 2, 0, 4, 3); foliage(p, c, 26, [[70, 150, 84], [110, 180, 96]], 7, 27, 0, 29, 3);
      c.rect(2 * T, 4 * T - 4, 28 * T, 4, [60, 110, 70]);
      // A ring of flowers for the battle.
      const cx = 16 * T + 8, cy = 11 * T; c.ellipse(cx, cy, 120, 62, [255, 255, 255, 40]); for (let a = 0; a < 40; a++) { const t = a * Math.PI / 20, x = cx + Math.cos(t) * 118, y = cy + Math.sin(t) * 60, col = [[240, 110, 130], [250, 220, 100], [250, 250, 250]][a % 3]; c.ellipse(x, y, 3, 3, col); c.p(x, y, [250, 200, 60]); }
      c.ellipse(cx, cy, 22, 14, [255, 255, 255, 170], 2); c.rect(cx - 118, cy, 236, 1, [255, 255, 255, 110]);
    });
    for (let x = 2; x <= 29; x += 3) if (x !== 14 && x !== 17) p.decor("hedge", x, 21, { optional: true });
    for (const [x, y] of [[2, 4], [29, 4], [9, 4], [22, 4]]) p.decor("tree1", x === 29 ? 28 : x, y - 2 < 2 ? 4 : y, { optional: true });
    // Ramos's shears and watering can.
    prop(p, 19, 5, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 3, Y + 5, 9, 9, [110, 170, 220], [50, 80, 120]); c.line(X + 12, Y + 8, X + 15, Y + 3, [50, 80, 120], 2); c.ellipse(X + 7, Y + 4, 4, 2, [50, 80, 120], 1); });
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
// A quiz floor: the question on the big screen, three answer booths with their silhouettes, and the lift up.
function quizFloor(n) {
  const accent = [[250, 220, 70], [90, 220, 240], [240, 120, 220], [130, 236, 130]][n];
  return {
    theme: { room: "arena", floor: "darkpave", wall: null },
    plan(p) {
      p.bare(1); p.block(2, 2, 26, 2);
      p.paint(0, (c) => {
        techWall(c, 2, 0, 27, 3, [44, 48, 76], accent);
        // The question screen.
        glow(c, 15 * T + 8, 28, 60, accent, 14); c.box(10 * T, 6, 11 * T, 40, [20, 24, 40], accent); c.rect(10 * T + 3, 9, 11 * T - 6, 34, [30, 44, 70]);
        const qx = 15 * T + 8; c.ellipse(qx, 20, 9, 9, accent, 3); c.rect(qx - 10, 20, 9, 10, [30, 44, 70]); c.rect(qx - 1, 27, 3, 6, accent); c.rect(qx - 1, 36, 3, 3, accent);
        for (let k = 0; k <= n; k++) c.rect(10 * T + 8 + k * 7, 14, 4, 4, accent); for (const x of [11 * T, 18 * T + 6]) for (let k = 0; k < 4; k++) c.rect(x, 22 + k * 5, 26 - (k * 7) % 11, 2, [110, 150, 200]);
        circuit(p, c, accent, 11 + n, 2, 4, 27, 21, 34);
        // The lift.
        door(c, 15, 3, [70, 76, 110], accent); c.rect(15 * T + 7, 3 * T - 9, 2, 25, [44, 48, 76]); pad(c, 15, 4, accent);
        // Lanes from the entrance to the three booths.
        for (const x of [7, 15, 23]) { c.rect(x * T + 7, 13 * T, 2, 4 * T, A(accent, 200)); c.rect(Math.min(x, 15) * T + 7, 17 * T, Math.abs(x - 15) * T + 2, 2, A(accent, 200)); frame(c, x * T - 14, 12 * T - 6, 44, 30, A(accent, 220), 2); }
        c.rect(15 * T + 7, 17 * T, 2, 2 * T, A(accent, 200));
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
      for (const [x, y] of [[2, 4], [27, 4], [2, 21], [27, 21]]) prop(p, x, y, 1, 1, (c, top, X, Y) => tube(c, top, X, Y, accent));
    },
  };
}
for (let n = 0; n < 4; n++) PLANS["KalosPrismQuiz" + n] = quizFloor(n);
// The top of the tower: Clemont's circuit-board arena, Tesla coils, and Lumiose at night through the glass.
PLANS.KalosPrismSummit = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const YL = [250, 220, 70];
    p.block(2, 2, 22, 2);
    p.paint(0, (c) => {
      // The window: the city below.
      c.rect(2 * T, 0, 22 * T, 4 * T, [20, 24, 56]); speckle(p, c, 40, 2, 0, 23, 1, 3, (x, y) => c.p(x, y, WHITE));
      for (let x = 2 * T; x < 24 * T; x += 9) { const h = 8 + p.hash(x, 1, 5) * 26; c.rect(x, 4 * T - 8 - h, 8, h, [34, 38, 76]); for (let y = 4 * T - 6 - h; y < 4 * T - 10; y += 4) if (p.hash(x, y, 6) < 0.6) c.rect(x + 2 + (y % 3), y, 2, 2, [250, 226, 130]); }
      for (let x = 2 * T; x <= 24 * T; x += 44) c.rect(x - 1, 0, 3, 4 * T, [90, 96, 130]); c.rect(2 * T, 4 * T - 8, 22 * T, 8, [60, 64, 96]); c.rect(2 * T, 4 * T - 8, 22 * T, 2, YL);
      circuit(p, c, YL, 21, 2, 4, 23, 21, 44);
      c.rect(5 * T, 8 * T, 16 * T, 10 * T, [250, 220, 70, 26]); court(c, 5, 8, 20, 17, YL, YL);
      // The lightning bolt at the centre.
      const cx = 13 * T, cy = 13 * T; c.poly([[cx + 3, cy - 20], [cx - 9, cy + 2], [cx - 1, cy + 2], [cx - 5, cy + 20], [cx + 9, cy - 4], [cx + 1, cy - 4]], YL);
    });
    for (const [x, y] of [[4, 5], [21, 5], [4, 19], [21, 19]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { glow(c, X + 8, Y - 10, 26, YL, 22); c.box(X + 2, Y + 8, 12, 7, [90, 96, 130], INK); c.rect(X + 6, Y - 8, 4, 16, [150, 156, 180]); for (let k = 0; k < 4; k++) c.rect(X + 4, Y - 6 + k * 4, 8, 2, [200, 130, 70]); top.ellipse(X + 8, Y - 12, 6, 4, [200, 206, 226]); top.ellipse(X + 7, Y - 13, 3, 1, WHITE); top.line(X + 13, Y - 14, X + 18, Y - 20, YL); top.line(X + 18, Y - 20, X + 16, Y - 24, YL); top.line(X + 3, Y - 14, X - 2, Y - 18, YL); });
    for (const [x, y] of [[8, 4], [17, 4]]) prop(p, x, y, 2, 1, (c, top, X, Y) => machine(c, X, Y, 32, 16, [96, 104, 140], YL));
  },
};

// ---------------------------------------------------------------- Laverre Gym (Valerie, Fairy): the dollhouse
function kimono(c, top, X, Y, col, sash = GOLD) { shadow(c, X, Y); c.rect(X + 7, Y - 6, 2, 20, [90, 66, 50]); c.rect(X + 3, Y + 13, 10, 2, [90, 66, 50]); top.rect(X - 2, Y - 8, 20, 2, [90, 66, 50]); top.poly([[X - 2, Y - 6], [X + 18, Y - 6], [X + 15, Y + 9], [X + 1, Y + 9]], col); top.poly([[X + 5, Y - 6], [X + 11, Y - 6], [X + 8, Y + 1]], lt(col, 0.5)); top.rect(X + 2, Y + 1, 12, 3, sash); for (const [dx, dy] of [[3, 6], [11, 5], [7, -3]]) top.ellipse(X + dx, Y + dy, 1, 1, WHITE); }
function plush(c, top, X, Y, col) { shadow(c, X, Y); c.ellipse(X + 8, Y + 9, 6, 5, col); c.ellipse(X + 8, Y + 10, 3, 3, lt(col, 0.5)); top.ellipse(X + 8, Y + 1, 5, 5, col); top.ellipse(X + 4, Y - 3, 2, 2, col); top.ellipse(X + 12, Y - 3, 2, 2, col); top.p(X + 6, Y + 1, INK); top.p(X + 10, Y + 1, INK); top.rect(X + 7, Y + 3, 2, 1, [226, 90, 110]); }
function clock(c, top, X, Y, col = [150, 100, 70]) { c.box(X + 3, Y - 4, 10, 19, col, dk(col, 0.6)); c.rect(X + 7, Y + 3, 2, 8, GOLD); c.ellipse(X + 8, Y + 11, 2, 2, GOLD); top.box(X + 2, Y - 16, 12, 13, lt(col, 0.15), dk(col, 0.6)); top.ellipse(X + 8, Y - 10, 4, 4, WHITE); top.rect(X + 8, Y - 13, 1, 3, INK); top.rect(X + 8, Y - 10, 3, 1, INK); }
function teaTable(c, X, Y, w, h, cloth) { table(c, X, Y, w, h, cloth); frame(c, X + 3, Y + 4, w - 6, h - 10, lt(cloth, 0.5)); c.ellipse(X + w / 2, Y + h / 2 - 2, 4, 3, WHITE); c.rect(X + w / 2 + 4, Y + h / 2 - 3, 2, 1, WHITE); for (const dx of [-12, 12]) { c.ellipse(X + w / 2 + dx, Y + h / 2 - 1, 3, 2, WHITE); c.ellipse(X + w / 2 + dx, Y + h / 2 - 1, 1, 1, [200, 150, 90]); } }
// The floor of a doll's room: pastel checks. The wall: striped paper with a frieze of bows.
function dollShell(p, c, col, x1, y1) {
  floors(p, (x, y, X, Y) => c.rect(X, Y, T, T, (x + y) & 1 ? A(col, 120) : [255, 255, 255, 120]));
  wall(c, 2, 0, x1, 1, lt(col, 0.45), { stripe: lt(col, 0.15), gap: 8, sw: 3, skirt: WHITE, top: dk(col, 0.15) });
  for (let x = 2 * T + 8; x < (x1 + 1) * T; x += 32) { c.poly([[x - 6, 4], [x, 8], [x - 6, 12]], dk(col, 0.25)); c.poly([[x + 6, 4], [x, 8], [x + 6, 12]], dk(col, 0.25)); c.rect(x - 1, 7, 3, 3, WHITE); }
  frame(c, 2 * T, 2 * T, (x1 - 1) * T, (y1 - 1) * T, A(dk(col, 0.3), 140), 2);
}
const PADS = { on: [250, 130, 190], side: [110, 190, 250], back: [250, 220, 100], out: [150, 236, 170] };
PLANS.KalosLaverreGym = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    p.bare(1); p.bare(2); p.block(2, 2, 24, 2);
    p.paint(0, (c) => {
      const PK = [240, 170, 200];
      c.rect(2 * T, 4 * T, 24 * T, 18 * T, [255, 220, 236, 60]);
      wall(c, 2, 0, 25, 3, [250, 226, 236], { panel: [200, 150, 120], top: [226, 130, 170] });
      // The dollhouse itself, opened up on the back wall.
      const X = 8 * T, W = 12 * T; c.poly([[X - 6, 22], [X + W / 2, 0], [X + W + 6, 22]], [200, 90, 130]); c.box(X, 20, W, 30, [255, 244, 236], [150, 90, 100]);
      for (let k = 0; k < 4; k++) { const col = [[250, 190, 210], [190, 226, 250], [250, 236, 170], [200, 240, 200]][k]; c.box(X + 3 + k * 47, 23, 44, 24, col, [150, 90, 100]); c.rect(X + 8 + k * 47, 38, 10, 9, dk(col, 0.3)); c.box(X + 26 + k * 47, 27, 12, 10, [160, 210, 240], WHITE); }
      // Paper screens to either side.
      for (const x of [2, 4, 21, 23]) { c.box(x * T + 2, 4, 2 * T - 4, 44, [250, 246, 230], [120, 80, 60]); for (let k = 1; k < 3; k++) c.rect(x * T + 2 + k * 9, 5, 1, 42, [120, 80, 60]); for (let k = 1; k < 4; k++) c.rect(x * T + 3, 4 + k * 11, 2 * T - 6, 1, [120, 80, 60]); }
      rug(c, 12, 12, 16, 20, [226, 110, 160], [250, 226, 236]);
      for (const [k, col] of [[1, PADS.on], [2, PADS.out]]) { const w = p.warps[k]; rug(c, w.x - 1, w.y - 1, w.x + 1, w.y + 1, lt(col, 0.3), dk(col, 0.3)); pad(c, w.x, w.y, col); }
    });
    [[4, 10, [236, 110, 150]], [8, 14, [130, 110, 220]], [22, 8, [110, 190, 200]], [22, 17, [240, 190, 90]], [4, 18, [150, 200, 120]], [11, 6, [226, 90, 110]], [16, 6, [190, 120, 220]]].forEach(([x, y, col]) => prop(p, x, y, 1, 1, (c, top, X, Y) => kimono(c, top, X, Y, col)));
    for (const [x, y, k] of [[2, 4, 0], [25, 4, 1], [2, 21, 1], [25, 21, 0]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { glow(c, X + 8, Y, 20, [250, 190, 220], 22); c.rect(X + 6, Y + 2, 4, 12, [236, 228, 220]); top.ellipse(X + 8, Y, 8, 6, k ? [240, 120, 180] : [150, 200, 250]); top.ellipse(X + 5, Y - 2, 2, 1, WHITE); top.ellipse(X + 11, Y + 1, 1, 1, WHITE); });
  },
};
function dollRoom(n) {
  const col = [null, [250, 170, 196], [150, 220, 190], [190, 170, 240], [250, 224, 130], [150, 200, 250], [250, 190, 150], [226, 120, 190], [200, 160, 226]][n], valerie = n === 7;
  return {
    theme: { room: "house", floor: "rCenter", wall: null },
    plan(p) {
      p.warps.forEach((w) => p.bare(w.k));
      p.paint(0, (c) => {
        dollShell(p, c, col, 21, 19);
        for (const x of [5, 14]) windowAt(c, x * T + 2, 6, 24, 20, [170, 216, 244], WHITE);
        picture(c, 10 * T, 6, 26, 20, { sky: lt(col, 0.6), blob: dk(col, 0.2) }, GOLD);
        if (valerie) { rug(c, 8, 6, 16, 12, [150, 80, 170], [250, 190, 230]); const cx = 12 * T + 8, cy = 9 * T + 8; for (const s of [-1, 1]) { c.ellipse(cx + s * 26, cy - 8, 22, 16, [250, 190, 230, 150]); c.ellipse(cx + s * 20, cy + 14, 14, 12, [190, 170, 250, 150]); } }
        else rug(c, 9, 9, 15, 13, lt(col, 0.2), dk(col, 0.2));
        p.warps.forEach((w) => { const kind = w.exit ? "back" : w.to === "KalosLaverreGym" ? "out" : (/[2468]$/.test(w.to) ? "side" : "on"); frame(c, w.x * T - 3, w.y * T - 3, 22, 22, WHITE, 1); pad(c, w.x, w.y, PADS[kind]); });
      });
      const v = n % 3, toy = [[236, 150, 170], [150, 190, 240], [240, 214, 130], [170, 220, 170]];
      // Against the back wall.
      prop(p, 2, 2, 2, 1, (c, top, X, Y) => shelf(c, X, Y, 32, [226, 190, 170], n));
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
  voidFill(p, c, [16, 12, 44]);
  speckle(p, c, 26, 0, 0, p.W - 1, p.H - 1, seed, (x, y, r, k) => { const col = [[110, 60, 190], [50, 90, 200], [190, 70, 170], [40, 150, 190]][k % 4]; for (let j = 3; j >= 1; j--) c.ellipse(x, y, (50 + r * 60) * j / 3, (26 + r * 30) * j / 3, A(col, 20)); });
  speckle(p, c, 420, 0, 0, p.W - 1, p.H - 1, seed + 1, (x, y, r) => { if (r > 0.93) star(c, x, y, WHITE, 2); else if (r > 0.8) star(c, x, y, [200, 210, 255], 1); else c.p(x, y, r > 0.4 ? [220, 226, 255] : [150, 150, 220]); });
}
function planet(c, x, y, r, col, ring) { c.ellipse(x, y, r, r, dk(col, 0.35)); c.ellipse(x - r * 0.12, y - r * 0.12, r * 0.86, r * 0.86, col); c.ellipse(x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.22, lt(col, 0.4)); for (let k = -1; k <= 1; k++) c.rect(x - r * 0.8, y + k * r * 0.4, r * 1.5, 1, A(dk(col, 0.3), 140)); if (ring) { c.ellipse(x, y, r * 1.8, r * 0.45, A(ring, 220), 2); c.ellipse(x, y - r * 0.2, r * 0.98, r * 0.8, col); } }
// The parlour: star charts, a telescope, and the door into the starfield.
PLANS.KalosAnistarGym = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    p.bare(1); p.block(2, 2, 24, 3);
    p.paint(0, (c) => {
      c.rect(2 * T, 5 * T, 24 * T, 17 * T, [60, 30, 110, 120]);
      wall(c, 2, 0, 25, 4, [70, 50, 120], { panel: [50, 34, 84], top: GOLD });
      for (const x of [3.5, 7.5, 18, 22]) { c.box(x * T, 8, 2.5 * T, 44, [24, 20, 60], GOLD); speckle(p, c, 14, x, 0.7, x + 2.2, 3, Math.round(x), (sx, sy, r) => { if (sy < 48) star(c, sx, sy, WHITE, r > 0.7 ? 1 : 0); }); c.line(x * T + 6, 20, x * T + 20, 30, [150, 170, 250]); c.line(x * T + 20, 30, x * T + 30, 18, [150, 170, 250]); c.line(x * T + 20, 30, x * T + 24, 44, [150, 170, 250]); }
      // The portal.
      const cx = 14 * T + 8; glow(c, cx, 44, 56, [170, 130, 250], 22); c.ellipse(cx, 46, 30, 34, GOLD); c.ellipse(cx, 46, 27, 31, [16, 12, 44]); c.rect(cx - 27, 46, 54, 34, [16, 12, 44]); c.rect(cx - 30, 46, 3, 34, GOLD); c.rect(cx + 27, 46, 3, 34, GOLD);
      speckle(p, c, 30, 12.6, 1.2, 15.4, 4.8, 9, (x, y, r) => star(c, x, y, r > 0.5 ? WHITE : [200, 180, 255], r > 0.8 ? 2 : 0)); c.ellipse(cx, 52, 12, 12, [130, 90, 220, 120]); c.ellipse(cx, 52, 6, 6, [220, 200, 255, 160]);
      pad(c, 14, 5, [190, 150, 250]);
      rug(c, 12, 7, 16, 20, [110, 60, 170], GOLD);
      const zx = 14 * T + 8, zy = 13 * T + 8; c.ellipse(zx, zy, 28, 28, A(GOLD, 220), 2); for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; c.line(zx + Math.cos(t) * 20, zy + Math.sin(t) * 20, zx + Math.cos(t) * 27, zy + Math.sin(t) * 27, GOLD); } c.ellipse(zx, zy, 9, 9, GOLD); c.ellipse(zx + 3, zy - 2, 8, 8, [110, 60, 170]);
    });
    // A telescope, an orrery, globes and candles.
    prop(p, 6, 8, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.line(X + 8, Y + 2, X + 3, Y + 14, [90, 70, 50]); c.line(X + 8, Y + 2, X + 13, Y + 14, [90, 70, 50]); top.line(X + 2, Y + 2, X + 16, Y - 10, [200, 160, 80], 4); top.ellipse(X + 16, Y - 10, 3, 3, [150, 200, 240]); });
    prop(p, 21, 9, 2, 2, (c, top, X, Y) => { table(c, X, Y, 32, 30, [110, 70, 60]); top.ellipse(X + 16, Y + 6, 14, 6, A(GOLD, 220), 1); top.ellipse(X + 16, Y + 6, 4, 4, [250, 210, 90]); top.ellipse(X + 5, Y + 4, 2, 2, [110, 170, 240]); top.ellipse(X + 26, Y + 9, 2, 2, [236, 110, 110]); });
    for (const [x, y, col] of [[4, 16, [90, 150, 220]], [23, 16, [200, 130, 90]]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.rect(X + 7, Y + 4, 2, 9, [120, 90, 60]); c.rect(X + 4, Y + 12, 8, 2, [120, 90, 60]); planet(top, X + 8, Y, 6, col); });
    for (const [x, y] of [[2, 5], [25, 5], [2, 21], [25, 21], [10, 5], [18, 5]]) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y, [170, 120, 250], [226, 200, 255]));
  },
};
// The starfield: glass walkways hung in space.
function starfield(n) {
  return {
    theme: { room: "arena", floor: "paving", wall: null },
    plan(p) {
      p.bare(0); if (p.warps[1]) p.bare(1);
      p.paint(0, (c) => {
        behind(p, c, () => {
          cosmos(p, c, 3 + n * 5);
          if (n) { planet(c, 5 * T, 26 * T, 30, [220, 170, 110], [250, 230, 170]); planet(c, 31 * T, 13 * T + 8, 16, [130, 200, 220]); planet(c, 4 * T, 13 * T, 11, [226, 120, 150]); }
          else { planet(c, 31 * T, 25 * T, 28, [110, 150, 230]); planet(c, 4 * T + 8, 13 * T, 15, [236, 200, 120], [250, 240, 200]); planet(c, 33 * T, 3 * T, 9, [200, 130, 220]); }
          // Constellations.
          for (const pts of [[[2, 2], [5, 3], [7, 1.5], [10, 3], [12, 2]], [[24, 13], [26, 15], [29, 14], [28, 12], [24, 13]], [[9, 24], [11, 26], [14, 25], [13, 28]], [[23, 24], [25, 27], [27, 25], [30, 28]]]) { for (let k = 0; k + 1 < pts.length; k++) c.line(pts[k][0] * T, pts[k][1] * T, pts[k + 1][0] * T, pts[k + 1][1] * T, [170, 190, 255, 110]); for (const [x, y] of pts) star(c, x * T, y * T, WHITE, 2); }
        });
        // The walkways.
        floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [60, 50, 150, 215]); c.rect(X, Y, T, 1, [150, 140, 250, 120]); c.rect(X, Y, 1, T, [150, 140, 250, 120]); if (p.hash(x, y, 4) < 0.3) star(c, X + 3 + p.hash(x, y, 5) * 10, Y + 3 + p.hash(x, y, 6) * 10, [220, 220, 255], p.hash(x, y, 7) < 0.3 ? 1 : 0); });
        ledge(p, c, [40, 30, 100], [200, 190, 255], 3);
        const e = (cx, cy, r, col) => { c.ellipse(cx, cy, r, r * 0.62, A(col, 200), 2); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; c.line(cx, cy, cx + Math.cos(t) * r * (a % 2 ? 0.5 : 0.9), cy + Math.sin(t) * r * 0.62 * (a % 2 ? 0.5 : 0.9), A(col, 170)); } };
        e(18 * T + 8, 8 * T, 34, [250, 220, 130]); e(18 * T + 8, 19 * T + 8, 34, [200, 170, 255]);
        const w0 = p.warps[0]; pad(c, w0.x, w0.y, [190, 150, 250]); if (p.warps[1]) pad(c, p.warps[1].x, p.warps[1].y, [250, 220, 130]);
      });
    },
  };
}
PLANS.KalosAnistarStars1 = starfield(0);
PLANS.KalosAnistarStars2 = starfield(1);

// ---------------------------------------------------------------- Snowbelle Gym (Wulfric, Ice)
function iceFloor(p, c) { floors(p, (x, y, X, Y) => { c.rect(X, Y, T, T, [190, 226, 250, 150]); if (p.hash(x, y, 2) < 0.35) c.line(X + 2, Y + 12 - p.hash(x, y, 3) * 8, X + 9 + p.hash(x, y, 4) * 5, Y + 3, [255, 255, 255, 170]); }); exitMat(p, c); }
function iceWall(p, c, x0, y0, x1, y1) { wall(c, x0, y0, x1, y1, [150, 196, 236], { stripe: [176, 214, 244], gap: 11, sw: 4, top: WHITE, skirt: [110, 156, 206] }); for (let x = x0 * T + 2; x < (x1 + 1) * T - 3; x += 7) { const h = 5 + p.hash(x, y0, 5) * 12; c.poly([[x, y0 * T + 3], [x + 5, y0 * T + 3], [x + 2.5, y0 * T + 3 + h]], [236, 246, 255]); } }
function iceBlock(c, top, X, Y) { c.ellipse(X + 8, Y + 14, 8, 3, [60, 100, 150, 80]); c.box(X, Y - 2, 16, 17, [170, 214, 244], [90, 140, 196]); c.rect(X + 1, Y - 1, 14, 3, WHITE); c.line(X + 3, Y + 11, X + 10, Y + 3, [240, 250, 255]); top.poly([[X + 2, Y - 2], [X + 5, Y - 12], [X + 8, Y - 2]], [200, 232, 250]); top.poly([[X + 8, Y - 2], [X + 11, Y - 8], [X + 14, Y - 2]], [226, 244, 255]); }
// A turning platform, drawn into the ice (the floor under it is ordinary floor).
function turntable(c, cx, cy, r, col) { c.ellipse(cx, cy, r, r * 0.8, A(col, 70)); c.ellipse(cx, cy, r, r * 0.8, col, 4); c.ellipse(cx, cy, r - 6, (r - 6) * 0.8, A(WHITE, 200), 1); for (let a = 0; a < 3; a++) { const t = a * Math.PI * 2 / 3 + 0.5; c.line(cx, cy, cx + Math.cos(t) * (r - 5), cy + Math.sin(t) * (r - 5) * 0.8, A(col, 220), 3); c.poly([[cx + Math.cos(t + 0.9) * (r - 12), cy + Math.sin(t + 0.9) * (r - 12) * 0.8], [cx + Math.cos(t + 1.15) * (r - 8), cy + Math.sin(t + 1.15) * (r - 8) * 0.8], [cx + Math.cos(t + 1.15) * (r - 17), cy + Math.sin(t + 1.15) * (r - 17) * 0.8]], WHITE); } c.ellipse(cx, cy, 7, 6, col); c.ellipse(cx, cy, 4, 3, WHITE); }
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
PLANS.KalosSnowbelleIceUpper = iceHall([[250, 220, 100], [130, 220, 150]]);
PLANS.KalosSnowbelleSummit = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    p.block(2, 2, 24, 2);
    p.paint(0, (c) => {
      iceFloor(p, c); iceWall(p, c, 2, 0, 25, 3);
      // A frozen fall behind Wulfric.
      c.rect(11 * T, 0, 6 * T, 4 * T, [200, 232, 250]); for (let x = 11 * T + 2; x < 17 * T; x += 5) { c.rect(x, 0, 2, 4 * T - p.hash(x, 1, 3) * 10, WHITE); c.rect(x + 2, 4, 1, 4 * T - 14, [150, 196, 236]); }
      court(c, 5, 8, 22, 17, [110, 170, 250], [240, 250, 255]);
      // The snowflake.
      const cx = 14 * T, cy = 13 * T; for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3, ex = cx + Math.cos(t) * 44, ey = cy + Math.sin(t) * 44; c.line(cx, cy, ex, ey, [255, 255, 255, 230], 3); for (const s of [-1, 1]) for (const f of [0.5, 0.75]) c.line(cx + Math.cos(t) * 44 * f, cy + Math.sin(t) * 44 * f, cx + Math.cos(t) * 44 * f + Math.cos(t + s * 1) * 10, cy + Math.sin(t) * 44 * f + Math.sin(t + s * 1) * 10, [255, 255, 255, 230], 2); }
    });
    for (const [x, y] of [[3, 5], [24, 5], [3, 20], [24, 20], [8, 4], [19, 4], [2, 12], [25, 12]]) prop(p, x, y, 1, 1, (c, top, X, Y) => iceBlock(c, top, X, Y));
    for (const [x, y] of [[6, 20], [21, 20], [2, 4], [25, 4]]) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); crystal(c, X + 5, Y + 15, [170, 220, 250], 1.4); crystal(c, X + 11, Y + 15, [220, 244, 255], 0.9); });
  },
};

// ---------------------------------------------------------------- The Pokémon League
function lavaPatch(p, c, x0, y0, x1, y1) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X, Y, W, H, [206, 70, 30]); speckle(p, c, W * H / 160, x0, y0, x1, y1, x0 + 3, (x, y, r) => { c.ellipse(x, y, 5 + r * 9, 3 + r * 4, [240, 130, 40]); c.ellipse(x, y, 2 + r * 5, 1 + r * 2, [252, 210, 90]); }); speckle(p, c, W * H / 300, x0, y0, x1, y1, x0 + 9, (x, y, r) => c.rect(x, y, 6 + r * 12, 2, [110, 36, 30])); }
function waterPatch(p, c, x0, y0, x1, y1, col = [60, 130, 214]) { const X = x0 * T, Y = y0 * T, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T; c.rect(X, Y, W, H, col); for (let y = Y + 3; y < Y + H - 2; y += 6) for (let x = X + ((y / 6) & 1) * 7 + 2; x < X + W - 8; x += 15) if (p.hash(x, y, 5) < 0.7) { c.rect(x, y, 7, 1, lt(col, 0.45)); c.rect(x + 2, y + 1, 5, 1, dk(col, 0.2)); } }
// An Elite Four chamber: the walk up the middle to the throne, and the element filling the sides and the far wall.
function chamber(o) {
  return {
    theme: { room: "arena", floor: o.floor, wall: null },
    plan(p) {
      p.block(2, 2, 26, 3); p.block(2, 5, 5, 21); p.block(23, 5, 5, 21);
      p.paint(0, (c) => {
        if (o.wash) c.rect(7 * T, 5 * T, 16 * T, 21 * T, o.wash);
        o.back(p, c); o.side(p, c, 2, 6); o.side(p, c, 23, 27);
        for (const x of [7, 23]) { c.rect(x * T - 3, 5 * T, 6, 21 * T, dk(o.col, 0.45)); c.rect(x * T - 3, 5 * T, 2, 21 * T, lt(o.col, 0.3)); }
        rug(c, 14, 9, 16, 22, o.rug || dk(o.col, 0.2), GOLD);
        // The dais.
        const cx = 15 * T + 8, cy = 7 * T + 8; c.ellipse(cx, cy + 4, 62, 30, dk(o.col, 0.5)); c.ellipse(cx, cy, 60, 28, lt(o.col, 0.25)); c.ellipse(cx, cy, 60, 28, GOLD, 2); c.ellipse(cx, cy, 44, 20, A(o.col, 200)); c.ellipse(cx, cy, 44, 20, A(WHITE, 200), 1);
        court(c, 8, 12, 21, 20, o.col, lt(o.col, 0.6)); exitMat(p, c);
        // The throne.
        c.box(cx - 13, 5 * T - 6, 26, 28, dk(o.col, 0.25), INK); c.rect(cx - 10, 5 * T - 3, 20, 20, o.col); c.ellipse(cx, 5 * T - 6, 13, 8, o.col); c.ellipse(cx, 5 * T - 6, 9, 5, GOLD); c.rect(cx - 15, 5 * T + 12, 30, 10, dk(o.col, 0.35));
      });
      if (o.props) o.props(p);
    },
  };
}
// Malva: the Blazing Chamber. Molten rock to either side and pillars of fire.
PLANS.KalosEliteMalva = chamber({
  floor: "ash", col: [214, 70, 50], wash: [120, 30, 20, 70],
  back(p, c) { wall(c, 2, 0, 27, 4, [70, 26, 30], { brick: [44, 16, 22], top: [150, 50, 40], skirt: [240, 130, 40] }); for (let x = 3; x <= 26; x += 3) if (x < 13 || x > 17) { glow(c, x * T + 8, 3 * T, 30, [250, 150, 50], 18); c.rect(x * T + 2, 6, 12, 4 * T + 4, [250, 120, 40]); c.rect(x * T + 5, 6, 6, 4 * T + 4, [252, 200, 80]); c.rect(x * T + 7, 6, 2, 4 * T + 4, [255, 244, 190]); for (let y = 10; y < 5 * T; y += 9) c.rect(x * T + 1 + (y % 2) * 12, y, 2, 5, [236, 96, 40]); } },
  side(p, c, x0, x1) { lavaPatch(p, c, x0, 5, x1, 25); },
  props(p) {
    for (const x of [7, 22]) for (let y = 6; y <= 24; y += 6) prop(p, x, y, 1, 1, (c, top, X, Y) => torch(c, top, X, Y));
    for (const [x, y] of [[3, 8], [5, 14], [3, 20], [26, 8], [24, 14], [26, 20], [4, 24], [25, 24]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 12; glow(c, X, Y - 12, 30, [250, 150, 50], 20); c.ellipse(X, Y, 10, 4, [110, 36, 30]); top.poly([[X - 8, Y], [X + 8, Y], [X + 5, Y - 22], [X, Y - 44], [X - 5, Y - 22]], [236, 96, 40]); top.poly([[X - 5, Y], [X + 5, Y], [X + 2, Y - 18], [X, Y - 32], [X - 3, Y - 16]], [250, 190, 70]); top.poly([[X - 2, Y], [X + 2, Y], [X, Y - 18]], [255, 244, 190]); });
  },
});
// Siebold: the Flood Chamber. Curtains of water down the walls into pools either side.
PLANS.KalosEliteSiebold = chamber({
  floor: "paving", col: [70, 140, 226], wash: [110, 180, 250, 70],
  back(p, c) { wall(c, 2, 0, 27, 4, [50, 96, 170], { top: WHITE }); for (let x = 2 * T; x < 28 * T; x += 4) { const a = p.hash(x, 1, 3); c.rect(x, 3, 3, 5 * T - 6, a < 0.3 ? [150, 206, 250] : a < 0.7 ? [96, 164, 236] : [70, 130, 214]); if (a > 0.5) c.rect(x, 10 + a * 40, 1, 12, WHITE); } c.rect(2 * T, 5 * T - 6, 26 * T, 6, [236, 246, 255]); for (let x = 2 * T; x < 28 * T; x += 9) c.ellipse(x + 4, 5 * T - 5, 6, 4, [236, 246, 255]); },
  side(p, c, x0, x1) { waterPatch(p, c, x0, 5, x1, 25); c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 5, [236, 246, 255, 190]); },
  props(p) {
    for (const [x, y] of [[4, 9], [4, 16], [4, 23], [25, 9], [25, 16], [25, 23]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 8; c.ellipse(X, Y, 22, 10, [150, 206, 250, 160]); c.ellipse(X, Y, 22, 10, WHITE, 1); c.ellipse(X, Y, 8, 4, [90, 100, 130]); top.rect(X - 1, Y - 34, 3, 34, [200, 232, 255]); for (const s of [-1, 1]) for (let k = 0; k < 12; k++) top.rect(X + s * k, Y - 34 + k * k * 0.22, 2, 3, [220, 240, 255]); top.ellipse(X, Y - 35, 3, 3, WHITE); });
    for (const x of [7, 22]) for (let y = 7; y <= 23; y += 8) prop(p, x, y, 1, 1, (c, top, X, Y) => pillar(c, top, X, Y, [200, 226, 246]));
  },
});
// Wikstrom: the Ironworks Chamber. Giant swords driven into the floor of a steel keep.
PLANS.KalosEliteWikstrom = chamber({
  floor: "steel", col: [150, 160, 186], rug: [90, 70, 130],
  back(p, c) {
    wall(c, 2, 0, 27, 4, [96, 102, 124], { brick: [70, 76, 98], top: [190, 196, 214], skirt: [50, 54, 72] });
    const cx = 15 * T; for (const s of [-1, 1]) { c.line(cx - s * 70, 70, cx + s * 60, 8, [60, 64, 84], 9); c.line(cx - s * 70, 70, cx + s * 60, 8, [214, 220, 236], 5); c.line(cx - s * 70, 69, cx + s * 60, 7, WHITE, 1); c.line(cx - s * 56, 46, cx - s * 40, 70, GOLD, 4); c.ellipse(cx - s * 74, 73, 4, 4, GOLD); }
    c.poly([[cx - 20, 18], [cx + 20, 18], [cx + 20, 46], [cx, 64], [cx - 20, 46]], [60, 64, 84]); c.poly([[cx - 17, 21], [cx + 17, 21], [cx + 17, 45], [cx, 60], [cx - 17, 45]], [150, 70, 80]); c.rect(cx - 2, 24, 4, 30, GOLD); c.rect(cx - 12, 32, 24, 4, GOLD);
    for (const x of [4, 9, 20, 25]) banner(c, x * T + 1, 10, 14, 40, [110, 60, 120], GOLD);
  },
  side(p, c, x0, x1) { c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 21 * T, [44, 48, 66]); for (let y = 5 * T; y < 26 * T; y += 8) c.rect(x0 * T, y, (x1 - x0 + 1) * T, 1, [70, 76, 98]); for (let x = x0 * T; x < (x1 + 1) * T; x += 8) c.rect(x, 5 * T, 1, 21 * T, [70, 76, 98]); },
  props(p) {
    for (const [x, y] of [[4, 8], [3, 15], [5, 22], [25, 8], [26, 15], [24, 22]]) p.paint(y + 1, (c, top) => { const X = x * T + 8, Y = y * T + 10; c.ellipse(X, Y + 2, 12, 5, [24, 26, 40]); top.poly([[X - 6, Y], [X + 6, Y], [X + 6, Y - 54], [X, Y - 60], [X - 6, Y - 54]], [110, 116, 140]); top.poly([[X - 4, Y], [X, Y], [X, Y - 58], [X - 4, Y - 54]], [226, 232, 244]); top.rect(X - 14, Y - 62, 28, 5, GOLD); top.rect(X - 3, Y - 78, 6, 16, [110, 70, 50]); top.ellipse(X, Y - 80, 4, 4, GOLD); });
    for (const x of [7, 22]) for (let y = 7; y <= 23; y += 8) prop(p, x, y, 1, 1, (c, top, X, Y) => { shadow(c, X, Y); c.box(X + 3, Y + 6, 10, 9, [110, 116, 140], INK); top.box(X + 4, Y - 6, 8, 13, [176, 182, 204], INK); top.ellipse(X + 8, Y - 9, 5, 5, [176, 182, 204]); top.rect(X + 5, Y - 9, 6, 2, INK); top.poly([[X + 8, Y - 18], [X + 6, Y - 13], [X + 10, Y - 13]], [200, 60, 70]); top.rect(X + 13, Y - 14, 2, 26, [214, 220, 236]); });
  },
});
// Drasna: the Dragonmark Chamber. A dragon's skull over the throne, its ribs arching in from the dark.
PLANS.KalosEliteDrasna = chamber({
  floor: "ruinFloor", col: [130, 90, 200], wash: [70, 40, 130, 80],
  back(p, c) {
    wall(c, 2, 0, 27, 4, [44, 34, 70], { brick: [30, 22, 52], top: [110, 80, 170], skirt: [24, 18, 40] });
    const cx = 15 * T + 8, B = [226, 220, 200], Bd = [150, 144, 130];
    for (const s of [-1, 1]) { c.poly([[cx + s * 26, 30], [cx + s * 70, 2], [cx + s * 60, 8], [cx + s * 34, 40]], Bd); c.poly([[cx + s * 26, 28], [cx + s * 66, 4], [cx + s * 34, 36]], B); }
    c.ellipse(cx, 36, 34, 26, Bd); c.ellipse(cx, 34, 32, 24, B); c.poly([[cx - 22, 48], [cx + 22, 48], [cx + 12, 76], [cx - 12, 76]], B); c.rect(cx - 12, 74, 24, 3, Bd);
    for (const s of [-1, 1]) { glow(c, cx + s * 14, 36, 14, [190, 110, 250], 40); c.ellipse(cx + s * 14, 36, 8, 6, [30, 20, 50]); c.ellipse(cx + s * 14, 36, 3, 4, [210, 140, 255]); c.ellipse(cx + s * 4, 58, 2, 4, [60, 50, 70]); }
    for (let k = -10; k <= 10; k += 5) c.poly([[cx + k - 2, 76], [cx + k + 2, 76], [cx + k, 84]], WHITE);
    for (const x of [4, 8, 21, 25]) { glow(c, x * T + 8, 50, 24, [170, 110, 250], 22); crystal(c, x * T + 8, 76, [170, 110, 250], 2.2); }
  },
  side(p, c, x0, x1) { c.rect(x0 * T, 5 * T, (x1 - x0 + 1) * T, 21 * T, [28, 22, 46]); speckle(p, c, 60, x0, 5, x1, 25, x0, (x, y, r) => { c.ellipse(x, y, 6 + r * 10, 3 + r * 5, [40, 32, 64]); if (r > 0.7) crystal(c, x, y + 4, [150, 100, 230], 0.7); }); },
  props(p) {
    for (let y = 8; y <= 23; y += 5) for (const s of [-1, 1]) p.paint(y + 1, (c, top) => { const X = s < 0 ? 2 * T : 28 * T, Y = y * T + 12; for (let k = 0; k < 22; k++) { const t = k / 21, x = X + s * (t * 84), yy = Y - Math.sin(t * Math.PI * 0.62) * 46; (t > 0.25 ? top : c).ellipse(x, yy, 4 - t * 2, 4 - t * 2, t > 0.5 ? [240, 234, 214] : [200, 194, 176]); } });
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
