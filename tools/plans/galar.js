// Galar's towns, drawn by hand from what Sword and Shield show there. See README.md.
"use strict";
const S = 16;
const mix = (a, f) => a.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
// Makes tiles solid, leaving any kept tile (door, person, landing) open.
function blk(p, x0, y0, w = 1, h = 1) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 0 || y < 0 || x >= p.W || y >= p.H) continue; try { p.block(x, y, 1, 1); } catch (_) { /* kept tile */ } } }
// A hand-drawn building or portal over warp k: blocks the rectangle (so no stamp is put there) and draws on top of it.
// draw(c, top, x, y, w, h, dx) gets the rectangle in pixels and the door tile's left edge.
function built(p, k, x0, y0, w, h, draw, behind = 0) {
  const d = p.warps[k], a = [x0 * S, y0 * S, w * S, h * S, d.x * S]; if (p.bare) p.bare(k); blk(p, x0, y0 + behind, w, h - behind);
  p.paint(y0 + h + 0.5, (c, top) => { draw(c, top, ...a); if (!behind) return; const put = top.p, lim = (y0 + behind) * S; top.p = (x, y, col) => { if (y < lim) put(x, y, col); }; draw(top, top, ...a); top.p = put; });   // the top `behind` rows are walked behind
}
// A stamp standing on a warp that is not a door tile (its door column goes on the warp).
function houseOn(p, k, stamp, opts = {}) { const d = p.warps[k], s = p.stamps[stamp], x0 = d.x - s[5], y0 = d.y - s[4] + 1; if (p.bare) p.bare(k); p.decor(stamp, x0, y0, { ...opts, walk: true }); blk(p, x0, y0, s[3], s[4]); }
function cottage(roof, o = {}) {
  return (c, top, x, y, w, h, dx) => {
    const wall = o.wall || [228, 216, 192], b = y + h, wy = b - 28, r0 = y + 3, dark = mix(roof, 0.62), lite = mix(roof, 1.22), frame = [80, 62, 54];
    c.rect(x + 2, b - 3, w - 2, 4, [0, 0, 0, 50]);
    c.box(x + 3, wy, w - 6, 28, wall, frame);
    for (let j = wy + 5; j < b - 2; j += 6) for (let i = x + 6 + ((j / 6 | 0) % 2) * 5; i < x + w - 10; i += 11) c.rect(i, j, 5, 2, mix(wall, 0.86));
    c.box(x + w - 30, r0 - 6, 9, 14, [168, 104, 84], [70, 50, 44]);
    c.poly([[x - 1, wy + 3], [x + 13, r0 - 1], [x + w - 13, r0 - 1], [x + w + 1, wy + 3]], [60, 44, 40]);
    c.poly([[x + 1, wy + 1], [x + 14, r0 + 1], [x + w - 14, r0 + 1], [x + w - 1, wy + 1]], roof);
    for (let j = r0 + 5; j < wy; j += 5) { const inset = 14 - 12 * (j - r0) / (wy - r0); c.rect(x + inset + 2, j, w - 2 * inset - 4, 1, dark); }
    c.rect(x + 15, r0 + 1, w - 30, 2, lite);
    if (o.snow) { c.poly([[x + 7, r0 + 17], [x + 14, r0], [x + w - 14, r0], [x + w - 7, r0 + 17]], [240, 246, 252]); for (let i = x + 9; i < x + w - 12; i += 9) c.ellipse(i + 3, r0 + 17, 5, 3, [240, 246, 252]); c.rect(x + w - 31, r0 - 8, 11, 3, [240, 246, 252]); }
    c.box(dx + 2, b - 21, 12, 21, o.door || [120, 78, 48], [52, 36, 30]); c.rect(dx + 11, b - 11, 2, 2, [240, 210, 110]);
    for (const wx of [dx - 22, dx + 27, dx - 44, dx + 49]) if (wx > x + 5 && wx < x + w - 17) { c.box(wx, b - 21, 11, 11, [150, 204, 238], frame); c.rect(wx + 5, b - 20, 1, 9, frame); c.rect(wx + 1, b - 16, 9, 1, frame); }
    if (o.sign) { c.box(dx - 10, wy - 4, 36, 9, [250, 244, 224], [60, 50, 50]); for (let i = 0; i < 7; i++) c.rect(dx - 6 + i * 4, wy - 1, 2, 3, o.sign); }
  };
}
// A cave mouth in a rock mound (or, with o.glow, a lair).
function cave(rock, o = {}) {
  return (c, top, x, y, w, h, dx) => {
    const b = y + h, m = dx + 8, dk = mix(rock, 0.6), lt = mix(rock, 1.2), hole = o.glow || [14, 12, 20];
    const shape = (g) => [[x + g, b], [x + 5 + g, y + h * 0.5], [x + w * 0.22, y + 8 + g], [x + w * 0.45, y + 1 + g], [x + w * 0.7, y + 5 + g], [x + w - 6 - g, y + h * 0.45], [x + w - g, b]];
    c.poly(shape(0), dk); c.poly(shape(2), rock);
    c.poly([[x + w * 0.24, y + 11], [x + w * 0.45, y + 4], [x + w * 0.5, y + h * 0.45], [x + w * 0.3, y + h * 0.55]], lt);
    c.line(x + w * 0.7, y + 8, x + w * 0.64, b - 6, dk); c.line(x + 9, y + h * 0.56, x + w * 0.3, y + h * 0.62, dk); c.line(x + w * 0.8, y + h * 0.5, x + w - 9, b - 8, dk);
    if (o.snow) c.poly([[x + w * 0.16, y + 15], [x + w * 0.22, y + 8], [x + w * 0.45, y + 1], [x + w * 0.7, y + 5], [x + w * 0.84, y + 15], [x + w * 0.7, y + 11], [x + w * 0.58, y + 16], [x + w * 0.45, y + 10], [x + w * 0.32, y + 15]], [244, 248, 255]);
    c.ellipse(m, b - 10, 11, 14, dk); c.ellipse(m, b - 9, 8, 11, hole); c.rect(m - 8, b - 9, 17, 9, hole);
    if (o.glow) { c.ellipse(m, b - 7, 5, 8, mix(hole, 0.45)); c.rect(m - 5, b - 7, 11, 7, mix(hole, 0.45)); }
  };
}
// A roofed gateway in a wall (stone lychgate, torii, hollow tree...): o.wall, o.roof, o.post.
function gateway(o = {}) {
  return (c, top, x, y, w, h, dx) => {
    const b = y + h, wall = o.wall || [170, 166, 160], roof = o.roof || [120, 84, 60], post = o.post || [110, 78, 52];
    for (let i = x; i < x + w; i += 16) if (i !== dx) { c.box(i, b - 15, 16, 15, wall, mix(wall, 0.55)); c.rect(i + 2, b - 10, 5, 1, mix(wall, 0.75)); c.rect(i + 9, b - 5, 5, 1, mix(wall, 0.75)); c.rect(i + 1, b - 14, 14, 2, mix(wall, 1.15)); }
    c.box(dx - 17, b - 28, 18, 28, wall, mix(wall, 0.55)); c.box(dx + 15, b - 28, 18, 28, wall, mix(wall, 0.55));
    for (const i of [dx - 14, dx + 18]) { c.rect(i, b - 22, 6, 1, mix(wall, 0.75)); c.rect(i + 5, b - 14, 6, 1, mix(wall, 0.75)); c.rect(i, b - 7, 6, 1, mix(wall, 0.75)); }
    c.rect(dx + 1, b - 28, 14, 28, o.inside || [52, 40, 36]); c.rect(dx + 1, b - 5, 14, 5, o.floor || [150, 124, 92]);
    c.rect(dx - 1, b - 30, 3, 30, post); c.rect(dx + 14, b - 30, 3, 30, post);
    c.poly([[dx - 22, b - 25], [dx + 8, b - 47], [dx + 38, b - 25]], mix(roof, 0.6)); c.poly([[dx - 18, b - 27], [dx + 8, b - 44], [dx + 34, b - 27]], roof);
    c.line(dx + 8, b - 44, dx - 18, b - 27, mix(roof, 1.25)); if (o.snow) c.poly([[dx - 8, b - 35], [dx + 8, b - 46], [dx + 24, b - 35]], [244, 248, 255]);
  };
}
// One of the Towers of Two Fists: four tiers, the upper ones walked behind.
function pagoda(wall, roof) {
  return (c, top, x, y, w, h, dx) => {
    const b = y + h, m = x + w / 2, dk = mix(roof, 0.6), tw = (t) => w - 10 - t * 14, ty = (t) => b - 30 * (t + 1), g = (t) => (ty(t) < y ? top : c);
    c.ellipse(m, b - 2, w / 2, 6, [0, 0, 0, 50]);
    for (let t = 0; t < 4; t++) { g(t).box(m - tw(t) / 2, ty(t), tw(t), 30, wall, mix(wall, 0.5)); if (t) for (const i of [-1, 1]) g(t).rect(m + i * tw(t) / 4 - 2, ty(t) + 13, 5, 8, mix(wall, 0.45)); g(t).rect(m - tw(t) / 2 + 1, ty(t) + 25, tw(t) - 2, 2, mix(wall, 0.75)); }
    for (let t = 0; t < 4; t++) { const q = g(t), a = tw(t) / 2, e = ty(t);
      if (t === 3) { q.poly([[m - a - 9, e + 7], [m, e - 20], [m + a + 9, e + 7]], dk); q.poly([[m - a - 6, e + 5], [m, e - 16], [m + a + 6, e + 5]], roof); q.rect(m - 1, e - 28, 2, 10, [230, 200, 90]); q.ellipse(m, e - 28, 2, 2, [250, 230, 120]); } else { q.poly([[m - a - 9, e + 7], [m - a + 4, e - 4], [m + a - 4, e - 4], [m + a + 9, e + 7]], dk); q.poly([[m - a - 7, e + 5], [m - a + 4, e - 2], [m + a - 4, e - 2], [m + a + 7, e + 5]], roof); }
      q.rect(m - a - 11, e + 3, 3, 3, roof); q.rect(m + a + 8, e + 3, 3, 3, roof); }
    c.box(dx + 1, b - 22, 14, 22, mix(wall, 0.35), mix(roof, 0.5)); c.rect(dx + 7, b - 20, 1, 19, mix(roof, 0.9)); c.rect(dx - 4, b - 2, 24, 2, mix(wall, 0.8));
  };
}
// The sealed front of one of the Regi ruins.
function ruin(p, x0, y0, w, h, o = {}) {
  blk(p, x0, y0, w, h);
  p.paint(y0 + h, (c) => { const x = x0 * S, y = y0 * S, W = w * S, b = y + h * S, st = o.stone || [156, 152, 146];
    c.rect(x + 2, b - 3, W - 2, 4, [0, 0, 0, 50]);
    c.poly([[x, b], [x + 8, y + 10], [x + W - 8, y + 10], [x + W, b]], mix(st, 0.55)); c.poly([[x + 2, b - 1], [x + 9, y + 12], [x + W - 9, y + 12], [x + W - 2, b - 1]], st);
    for (let j = y + 19; j < b - 2; j += 8) { c.rect(x + 6, j, W - 12, 1, mix(st, 0.8)); for (let i = x + 12 + (j % 16); i < x + W - 10; i += 16) c.rect(i, j, 1, 8, mix(st, 0.8)); }
    c.box(x + 5, y + 3, W - 10, 10, mix(st, 1.12), mix(st, 0.5)); if (o.snow) { c.rect(x + 5, y + 1, W - 10, 5, [244, 248, 255]); for (let i = x + 8; i < x + W - 8; i += 10) c.ellipse(i + 3, y + 6, 4, 2, [244, 248, 255]); }
    (o.doors || [[W / 2, [230, 120, 60]]]).forEach(([mx, dots]) => { const m = x + mx; c.box(m - 10, b - 31, 20, 31, mix(st, 0.42), mix(st, 0.3)); c.rect(m - 12, b - 33, 24, 3, mix(st, 1.1)); for (const [ax, ay] of [[-5, -25], [3, -25], [-5, -19], [-1, -19], [3, -19], [-5, -13], [3, -13]]) c.rect(m + ax, b + ay, 3, 3, dots); });
  });
}
// A hand-drawn building with no way in (same draw functions as `built`); dcol is its door column.
function prop(p, x0, y0, w, h, draw, dcol = Math.floor(w / 2)) { blk(p, x0, y0, w, h); p.paint(y0 + h + 0.5, (c, top) => draw(c, top, x0 * S, y0 * S, w * S, h * S, (x0 + dcol) * S)); }
// Bare ploughed earth with furrows (the red-brown fields of Postwick and Turffield).
function ploughed(p, x0, y0, x1, y1) {
  p.fill("clay", x0, y0, x1, y1);
  p.paint(0.6, (c) => { for (let y = y0; y <= y1; y++) for (const j of [3, 9, 14]) c.rect(x0 * S, y * S + j, (x1 - x0 + 1) * S, 1, [150, 92, 62]); });
}
function boat(p, x, y, hull) {
  p.paint(y + 3, (c) => { const px = x * 16, py = y * 16; c.poly([[px, py + 6], [px + 40, py + 6], [px + 34, py + 22], [px + 6, py + 22]], [60, 50, 50]); c.poly([[px + 2, py + 7], [px + 38, py + 7], [px + 33, py + 20], [px + 7, py + 20]], hull); c.box(px + 12, py - 2, 14, 10, [236, 236, 240], [80, 80, 96]); c.rect(px + 15, py + 1, 8, 3, [120, 180, 230]); });
}
function fenceTile(p, x, y, vert, col) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, py = y * S, dk = mix(col, 0.6);
    if (vert) { c.rect(px + 6, py - 3, 4, 19, dk); c.rect(px + 7, py - 3, 2, 18, col); } else { for (const j of [5, 10]) { c.rect(px, py + j, 16, 3, dk); c.rect(px, py + j, 16, 2, col); } c.rect(px + 6, py + 2, 4, 13, dk); c.rect(px + 7, py + 2, 2, 12, col); } });
}
// A rail fence round a rectangle; gaps are "x,y" strings.
function fence(p, x0, y0, x1, y1, gaps = [], col = [182, 140, 90]) {
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (!gaps.includes(x + "," + y)) fenceTile(p, x, y, false, col);
  for (let y = y0 + 1; y < y1; y++) for (const x of [x0, x1]) if (!gaps.includes(x + "," + y)) fenceTile(p, x, y, true, col);
}
function stoneWall(p, x0, x1, y, col = [170, 166, 160]) {
  for (let x = x0; x <= x1; x++) { blk(p, x, y); p.paint(y + 1, (c) => { const i = x * S, b = y * S + 16; c.box(i, b - 15, 16, 15, col, mix(col, 0.55)); c.rect(i + 2, b - 10, 5, 1, mix(col, 0.75)); c.rect(i + 9, b - 5, 5, 1, mix(col, 0.75)); c.rect(i + 1, b - 14, 14, 2, mix(col, 1.15)); }); }
}
function wooloo(p, x, y) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S + 8, py = y * S + 8, s = p.hash(x, y, 3) < 0.5 ? -1 : 1; c.ellipse(px, py + 6, 7, 2, [0, 0, 0, 50]); c.rect(px - 4, py + 4, 2, 3, [60, 52, 56]); c.rect(px + 2, py + 4, 2, 3, [60, 52, 56]); c.ellipse(px, py, 7, 6, [226, 222, 212]); c.ellipse(px - 1, py - 1, 5, 4, [252, 250, 244]); c.rect(px + s * 5 - 2, py - 2, 4, 5, [60, 52, 56]); c.rect(px + s * 5 - 1, py - 1, 1, 1, [255, 255, 255]); });
}
function menhir(p, x, y, hgt = 24, col = [150, 150, 156]) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, b = y * S + 15; c.ellipse(px + 9, b, 7, 2, [0, 0, 0, 60]); c.poly([[px + 2, b], [px + 2, b - hgt * 0.6], [px + 6, b - hgt], [px + 11, b - hgt + 2], [px + 14, b - hgt * 0.5], [px + 14, b]], mix(col, 0.6)); c.poly([[px + 3, b - 1], [px + 3, b - hgt * 0.6], [px + 6, b - hgt + 1], [px + 10, b - hgt + 3], [px + 12, b - hgt * 0.5], [px + 12, b - 1]], col); c.line(px + 5, b - hgt + 3, px + 5, b - 4, mix(col, 1.2)); });
}
// A Pokemon den: a ring of red rock on the ground under whoever stands there.
function den(p, x, y) { p.paint(0.5, (c) => { const cx = x * S + 8, cy = y * S + 9; c.ellipse(cx, cy, 14, 10, [110, 78, 70]); c.ellipse(cx, cy, 11, 7, [58, 26, 34]); c.ellipse(cx, cy, 7, 4, [214, 60, 96, 210]); for (let a = 0; a < 8; a++) c.ellipse(cx + Math.round(Math.cos(a * 0.785) * 13), cy + Math.round(Math.sin(a * 0.785) * 9), 3, 2, [150, 110, 96]); }); }
function tent(p, x, y, col) {
  blk(p, x, y, 2, 2);
  p.paint(y + 2, (c) => { const px = x * S, py = y * S, b = py + 31; c.ellipse(px + 16, b, 17, 3, [0, 0, 0, 50]); c.poly([[px - 1, b], [px + 16, py + 3], [px + 33, b]], mix(col, 0.5)); c.poly([[px + 1, b - 1], [px + 16, py + 6], [px + 31, b - 1]], col); c.poly([[px + 16, py + 6], [px + 31, b - 1], [px + 16, b - 1]], mix(col, 0.8)); c.poly([[px + 10, b - 1], [px + 16, b - 16], [px + 22, b - 1]], [50, 44, 50]); });
}
function umbrella(p, x, y, col) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * S, py = y * S; c.rect(px + 12, py + 9, 14, 6, mix(col, 1.1)); c.rect(px + 12, py + 11, 14, 2, [250, 250, 250]); c.rect(px + 7, py - 8, 2, 23, [236, 236, 236]); top.ellipse(px + 8, py - 8, 13, 7, mix(col, 0.7)); top.ellipse(px + 8, py - 9, 12, 6, col); top.ellipse(px + 8, py - 9, 5, 6, [250, 250, 250]); });
}
function mushrooms(p, x, y, cap = [216, 44, 66]) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, py = y * S; for (const [i, j, r] of [[4, 6, 4], [11, 9, 3], [7, 12, 2]]) { c.rect(px + i - 1, py + j, 3, 5, [240, 230, 210]); c.ellipse(px + i, py + j, r + 1, r, mix(cap, 0.6)); c.ellipse(px + i, py + j - 1, r, r - 1, cap); c.rect(px + i - 1, py + j - 2, 1, 1, [255, 230, 230]); } });
}
function lantern(p, x, y) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, b = y * S + 15, st = [176, 174, 168]; c.rect(px + 6, b - 12, 4, 12, st); c.rect(px + 4, b - 2, 8, 2, mix(st, 0.7)); c.box(px + 3, b - 19, 10, 8, st, mix(st, 0.5)); c.rect(px + 6, b - 17, 4, 4, [250, 220, 120]); c.poly([[px + 1, b - 19], [px + 8, b - 25], [px + 15, b - 19]], mix(st, 0.7)); });
}
function gravestone(p, x, y) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, b = y * S + 15, st = [172, 172, 180]; c.ellipse(px + 8, b, 6, 2, [0, 0, 0, 60]); c.ellipse(px + 8, b - 10, 5, 4, mix(st, 0.55)); c.rect(px + 3, b - 10, 10, 10, mix(st, 0.55)); c.ellipse(px + 8, b - 10, 4, 3, st); c.rect(px + 4, b - 10, 8, 9, st); c.rect(px + 6, b - 8, 4, 1, mix(st, 0.6)); c.rect(px + 6, b - 5, 4, 1, mix(st, 0.6)); });
}
function stall(p, x, y, awning) {
  blk(p, x, y);
  p.paint(y + 1, (c) => { const px = x * S, py = y * S; c.box(px, py + 4, 16, 12, [196, 150, 96], [90, 60, 40]); c.poly([[px - 3, py + 5], [px + 8, py - 6], [px + 19, py + 5]], awning); c.rect(px + 3, py + 8, 10, 3, [240, 236, 220]); });
}
// A ploughed plot with rows of a crop.
function crops(p, x0, y0, x1, y1, col = [70, 150, 70]) {
  p.fill("dirt", x0, y0, x1, y1);
  p.paint(0.6, (c) => { for (let y = y0; y <= y1; y++) { c.rect(x0 * S, y * S + 13, (x1 - x0 + 1) * S, 2, [150, 116, 78]); for (let x = x0; x <= x1; x++) for (const i of [2, 10]) { c.rect(x * S + i, y * S + 6, 5, 6, mix(col, 0.7)); c.rect(x * S + i + 1, y * S + 4, 3, 6, col); c.rect(x * S + i + 2, y * S + 3, 1, 2, mix(col, 1.3)); } } });
}
// A railway line one tile deep; the tiles between open[0] and open[1] stay walkable (a level crossing).
function tracks(p, x0, x1, y, open = [-1, -1]) {
  for (let x = x0; x <= x1; x++) if (x < open[0] || x > open[1]) blk(p, x, y);
  p.paint(0.6, (c) => { const py = y * S, L = (x1 - x0 + 1) * S; c.rect(x0 * S, py + 1, L, 14, [156, 146, 134]); for (let i = x0 * S + 1; i < x0 * S + L; i += 6) c.rect(i, py + 2, 3, 12, [112, 82, 62]); c.rect(x0 * S, py + 4, L, 2, [70, 72, 84]); c.rect(x0 * S, py + 11, L, 2, [70, 72, 84]); });
}
function train(p, x, y, n, col) {
  p.paint(y + 1.2, (c) => { for (let i = 0; i < n; i++) { const px = x * S + i * 34, py = y * S; c.rect(px + 2, py + 12, 28, 3, [40, 40, 48]); c.box(px, py - 12, 32, 25, col, mix(col, 0.5)); c.rect(px + 1, py - 11, 30, 3, mix(col, 1.25)); c.rect(px + 3, py - 6, 26, 7, [170, 214, 240]); for (const j of [9, 16, 22]) c.rect(px + j, py - 6, 1, 7, mix(col, 0.5)); c.rect(px + 1, py + 5, 30, 2, [250, 220, 90]); c.rect(px + 32, py + 4, 2, 3, [40, 40, 48]); } });
}
function bigTree(p, x, y, leaf, o = {}) {
  blk(p, x, y, 2, 1);
  p.paint(y + 1, (c, top) => { const cx = x * S + 16, b = y * S + 15, hgt = o.h || 56, r = o.r || 40, bark = o.bark || [120, 84, 60];
    c.ellipse(cx + 2, b, 20, 4, [0, 0, 0, 60]); c.poly([[cx - 14, b], [cx - 6, b - 14], [cx - 5, b - hgt], [cx + 5, b - hgt], [cx + 6, b - 14], [cx + 14, b]], mix(bark, 0.6)); c.poly([[cx - 11, b - 1], [cx - 4, b - 14], [cx - 3, b - hgt], [cx + 3, b - hgt], [cx + 4, b - 14], [cx + 11, b - 1]], bark);
    for (const [ax, ay, rr] of [[0, 0, 1], [-0.55, 0.25, 0.62], [0.55, 0.25, 0.62], [-0.2, -0.45, 0.7], [0.35, -0.35, 0.6]]) { const ex = cx + ax * r, ey = b - hgt - r * 0.3 + ay * r * 0.7; top.ellipse(ex, ey, rr * r * 0.8, rr * r * 0.56, mix(leaf, 0.62)); top.ellipse(ex - 1, ey - 2, rr * r * 0.8 - 3, rr * r * 0.56 - 3, leaf); top.ellipse(ex - 4, ey - 5, rr * r * 0.45, rr * r * 0.3, mix(leaf, 1.22)); }
    if (o.dots) for (let i = 0; i < 16; i++) top.rect(cx + Math.round((p.hash(i, 1, 9) - 0.5) * r * 1.6), b - hgt - r * 0.3 + Math.round((p.hash(i, 2, 9) - 0.5) * r * 0.9), 2, 2, o.dots); });
}
// A stadium front, wide and low, with a curved roof.
function stadium(wall, trim) {
  return (c, top, x, y, w, h, dx) => { const b = y + h, dk = mix(wall, 0.5);
    c.rect(x + 3, b - 2, w, 4, [0, 0, 0, 50]); c.ellipse(x + w / 2, y + 22, w / 2 + 1, 20, mix(trim, 0.6)); c.ellipse(x + w / 2, y + 22, w / 2 - 2, 17, trim); for (let i = x + 16; i < x + w - 8; i += 16) c.line(i, y + 22, x + w / 2 + (i - x - w / 2) * 0.7, y + 5, mix(trim, 0.8));
    c.box(x, y + 22, w, h - 22, wall, dk); c.rect(x + 1, y + 23, w - 2, 3, mix(trim, 1.15)); c.rect(x + 1, b - 5, w - 2, 4, mix(wall, 0.8));
    for (let i = x + 5; i < x + w - 12; i += 16) if (i < dx - 22 || i > dx + 26) { c.ellipse(i + 6, y + 37, 5, 6, dk); c.rect(i + 1, y + 37, 11, 14, dk); c.rect(i + 3, y + 37, 7, 12, [120, 170, 220]); }
    c.box(dx - 10, b - 30, 36, 30, mix(wall, 1.12), dk); c.box(dx - 2, b - 22, 20, 22, [40, 44, 60], dk); c.rect(dx + 7, b - 20, 2, 20, [120, 170, 220]); c.ellipse(dx + 8, b - 33, 7, 7, [40, 40, 50]); c.ellipse(dx + 8, b - 33, 6, 6, [250, 250, 250]); c.rect(dx + 2, b - 39, 12, 6, [214, 60, 60]); c.rect(dx + 2, b - 34, 12, 2, [40, 40, 50]); c.ellipse(dx + 8, b - 33, 2, 2, [250, 250, 250]); };
}
// A big cog standing in the street: (x, y) is its centre in tiles, r its radius in pixels.
function gear(p, x, y, r, col) {
  const t = Math.ceil(r / S); blk(p, Math.floor(x - r / S), Math.floor(y - r / S), 2 * t, 2 * t);
  p.paint(y + r / S + 0.4, (c) => { const cx = x * S, cy = y * S, dk = mix(col, 0.55); c.ellipse(cx + 3, cy + 4, r, r, [0, 0, 0, 50]); for (let a = 0; a < 10; a++) { const ax = Math.cos(a * Math.PI / 5), ay = Math.sin(a * Math.PI / 5); c.ellipse(cx + ax * r * 0.92, cy + ay * r * 0.92, r * 0.2, r * 0.2, dk); } c.ellipse(cx, cy, r * 0.88, r * 0.88, dk); c.ellipse(cx, cy, r * 0.82, r * 0.82, col); c.ellipse(cx - 1, cy - 1, r * 0.6, r * 0.6, mix(col, 1.18), 2); for (let a = 0; a < 3; a++) c.line(cx - Math.cos(a * 1.047) * r * 0.6, cy - Math.sin(a * 1.047) * r * 0.6, cx + Math.cos(a * 1.047) * r * 0.6, cy + Math.sin(a * 1.047) * r * 0.6, dk, 3); c.ellipse(cx, cy, r * 0.26, r * 0.26, dk); c.ellipse(cx, cy, r * 0.14, r * 0.14, mix(col, 1.3)); });
}
function chimney(p, x, y) {
  blk(p, x, y);
  p.paint(y + 1, (c, top) => { const px = x * S, b = y * S + 16, br = [150, 82, 66]; c.box(px + 2, b - 16, 12, 16, br, mix(br, 0.5)); top.box(px + 3, b - 58, 10, 44, br, mix(br, 0.5)); for (let j = b - 54; j < b - 16; j += 6) top.rect(px + 4, j, 8, 1, mix(br, 0.75)); top.box(px + 1, b - 62, 14, 5, [70, 60, 60], [40, 34, 34]); for (const [ax, ay, r] of [[10, -70, 6], [16, -80, 8], [25, -90, 10]]) top.ellipse(px + ax, b + ay, r, r * 0.8, [236, 236, 240, 170]); });
}
// A crenellated curtain wall one tile deep.
function rampart(p, x0, x1, y, st = [164, 160, 168]) {
  blk(p, x0, y, x1 - x0 + 1, 1);
  p.paint(y + 1, (c) => { const x = x0 * S, w = (x1 - x0 + 1) * S, b = y * S + 16, dk = mix(st, 0.55); c.rect(x, b - 24, w, 24, dk); c.rect(x, b - 22, w, 20, st); for (let j = b - 16; j < b - 2; j += 7) { c.rect(x, j, w, 1, mix(st, 0.8)); for (let i = x + ((j >> 1) % 2) * 8; i < x + w; i += 16) c.rect(i, j, 1, 7, mix(st, 0.8)); } for (let i = x; i < x + w - 4; i += 12) c.box(i, b - 30, 8, 9, mix(st, 1.15), dk); });
}
function turret(p, x, y, st = [164, 160, 168], flag = [60, 110, 200]) {
  blk(p, x, y, 2, 1);
  p.paint(y + 1.1, (c, top) => { const px = x * S, b = y * S + 16, dk = mix(st, 0.55); c.box(px, b - 30, 32, 30, st, dk); top.box(px, b - 50, 32, 22, st, dk); for (let j = b - 44; j < b - 2; j += 8) (j < b - 30 ? top : c).rect(px + 1, j, 30, 1, mix(st, 0.8)); for (let i = px - 2; i < px + 32; i += 9) top.box(i, b - 56, 7, 8, mix(st, 1.15), dk); c.rect(px + 13, b - 22, 6, 10, [40, 40, 56]); top.rect(px + 15, b - 74, 2, 20, [70, 70, 84]); top.poly([[px + 17, b - 74], [px + 30, b - 70], [px + 17, b - 65]], flag); });
}
// A glowing Ballonlea mushroom; drawn late so it shines through the forest's dark.
function glowshroom(p, x, y, r, col) {
  blk(p, x, y);
  p.paint(100 + y, (c, top) => { const cx = x * S + 8, b = y * S + 15, hgt = r * 1.3 + 8, g = r > 8 ? top : c, ry = r * 0.6;
    c.ellipse(cx, b - hgt * 0.5, r * 2.3, r * 1.9, [...col, 26]); c.ellipse(cx, b - hgt * 0.6, r * 1.5, r * 1.2, [...col, 34]); c.ellipse(cx, b, r * 0.9, 3, [...col, 110]);
    c.rect(cx - 3, b - hgt, 6, hgt, [150, 150, 170]); c.rect(cx - 2, b - hgt, 4, hgt, [236, 232, 220]); c.rect(cx - 4, b - 2, 8, 2, [200, 200, 210]);
    g.ellipse(cx, b - hgt + 1, r + 1, ry + 1, mix(col, 0.4)); g.rect(cx - r, b - hgt + 1, 2 * r, 2, mix(col, 0.4)); g.ellipse(cx, b - hgt, r, ry, mix(col, 0.75)); g.ellipse(cx, b - hgt - 1, r - 1, ry - 1, col); g.rect(cx - r + 1, b - hgt, 2 * r - 2, 2, mix(col, 0.6));
    g.ellipse(cx - r * 0.35, b - hgt - ry * 0.4, r * 0.28, ry * 0.25, [255, 255, 255]); g.rect(cx + r * 0.3, b - hgt - 2, 2, 2, [255, 255, 255]); g.rect(cx - r * 0.7, b - hgt - 1, 2, 2, [255, 255, 255]); g.rect(cx + r * 0.6, b - hgt - 1, 2, 2, [255, 255, 255]); });
}
module.exports = {
  // Hulbury: the harbour town (compared with the guidebook map, see docs/map-references/galar.md). The harbour
  // fills the east: the Stadium stands out over the water at the head of its causeway, the long quay runs east to
  // the lighthouse on its headland, boats lie along the south quay. The red-roofed terrace and the Center are on
  // the west side, the seafood restaurant by the main street and the market on its earth square in the south-west.
  GalarHulbury: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", water: "sea", density: 0.03, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0, house: ["flat", "gable"] },
    plan(p) {
      p.fill("water", 22, 1, 36, 13); p.fill("water", 24, 14, 36, 30);                 // the harbour, north-east and east
      p.fill("grass", 32, 13, 36, 19);                                                  // the lighthouse headland
      p.fill("paving", 23, 3, 36, 10);                                                  // the Stadium's platform out in the water
      p.street("cobble", 3, [[19, 1], [19, 30]]);                                       // main street from Route 5
      p.street("cobble", 2, [[1, 16], [23, 16]]);                                       // the cross street past the Center
      p.street("brick", 2, [[23, 16], [33, 16]]);                                       // the long quay out to the lighthouse
      p.street("brick", 3, [[27, 11], [27, 15]]);                                       // the causeway to the Stadium
      p.street("brick", 2, [[22, 14], [22, 30]]);                                       // the south quay
      p.street("deck", 1, [[24, 22], [28, 22]]); p.street("deck", 1, [[24, 27], [28, 27]]);   // jetties
      p.decor("lighthouse", 33, 9, { canopy: 3 });
      p.building(2, "whiteHall", { tint: ([r, g, b]) => (r > 190 && g > 190 && b > 190 ? [r * 0.78, g * 0.82, b] : [r, g, b]) });   // Hulbury Stadium, blue-lilac as in the game
      p.building(1, "pcSmall");
      p.disc("clay", 10, 23.5, 5.2, 3.6);                                               // the market square
      for (const [x, y, col] of [[7, 22, [214, 70, 70]], [9, 22, [90, 170, 110]], [12, 22, [240, 200, 80]], [8, 25, [70, 120, 200]]]) stall(p, x, y, col);
      for (const x of [2, 6, 10]) p.decor("gable", x, 4, { tint: p.roof(1.7, 0.75, 0.6) });   // the terrace
      p.decor("flat", 11, 10);                                                          // the restaurant
      for (const [x, y] of [[12, 25], [13, 25], [21, 19]]) p.decor("barrels", x, y);
      boat(p, 25, 19, [240, 240, 244]); boat(p, 30, 23, [200, 60, 60]); boat(p, 25, 24, [240, 240, 244]); boat(p, 30, 28, [60, 110, 190]);
    },
  },
  // Postwick: a farming hamlet (compared with the guidebook map). Your house and the Slumbering Weald lie on the
  // far side of the walled stream with its stone bridge; this side are the patchwork fields (pasture with Wooloo,
  // ploughed earth, grain), Hop's big red-roofed farmhouse with its battle court, and the lane out to Route 1.
  GalarPostwick: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", density: 0.03, groves: 0, flowers: 0.25, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("darktree", 1, 1, 7, 5); fence(p, 1, 6, 8, 6); for (let y = 1; y <= 5; y++) fenceTile(p, 8, y, true, [182, 140, 90]);   // the Slumbering Weald
      p.fill("water", 1, 8, 24, 9); p.fill("water", 23, 1, 24, 7);                           // the stream
      p.street("dirt", 2, [[19, 5], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[27, 11], [27, 13], [20, 13]]);
      p.fill("cobble", 18, 8, 20, 9);                                                        // the stone bridge
      built(p, 0, 16, 1, 7, 4, cottage([196, 86, 70]), 1);                                  // home
      built(p, 1, 1, 13, 8, 5, cottage([172, 60, 58], { wall: [236, 214, 150] }), 1);       // Hop's house
      p.fill("flowersRed", 10, 2, 11, 5); p.fill("flowersBlue", 12, 2, 15, 4);
      p.fill("meadow", 25, 1, 36, 9); stoneWall(p, 22, 24, 10); stoneWall(p, 30, 36, 10); built(p, 2, 25, 8, 5, 3, gateway({ roof: [120, 84, 60] }));   // the wall and gate to Route 1
      p.fill("meadow", 11, 11, 16, 14); fence(p, 10, 10, 17, 15); for (const [x, y] of [[12, 12], [15, 11], [13, 13], [15, 14]]) wooloo(p, x, y);
      ploughed(p, 2, 10, 8, 11);
      p.fill("meadow", 24, 20, 34, 25); fence(p, 23, 19, 35, 26); for (const [x, y] of [[25, 21], [28, 23], [31, 21], [33, 24], [26, 24], [30, 24]]) wooloo(p, x, y);
      ploughed(p, 3, 23, 15, 25); crops(p, 3, 27, 15, 29, [200, 170, 70]);
      p.fill("paving", 9, 19, 14, 21);                                                       // the battle court beside Hop's house
      p.paint(0.6, (c) => { const x = 9 * S, y = 19 * S, w = 6 * S, h = 3 * S; c.rect(x, y, w, h, [60, 92, 170]); c.rect(x + 2, y + 2, w - 4, h - 4, [78, 112, 190]); c.rect(x + w / 2 - 1, y + 2, 2, h - 4, [240, 240, 250]); c.ellipse(x + w / 2, y + h / 2, 12, 12, [214, 70, 70]); c.ellipse(x + w / 2, y + h / 2, 12, 12, [240, 240, 250], 2); c.ellipse(x + w / 2, y + h / 2, 4, 4, [240, 240, 250]); });
      p.paint(27, (c) => { const px = 9 * S, b = 26 * S; c.rect(px + 7, b - 22, 2, 22, [120, 84, 60]); c.rect(px, b - 16, 16, 2, [120, 84, 60]); c.box(px + 3, b - 18, 10, 9, [196, 86, 70], [90, 40, 40]); c.ellipse(px + 8, b - 23, 4, 4, [236, 210, 150]); c.poly([[px + 1, b - 25], [px + 8, b - 32], [px + 15, b - 25]], [200, 170, 90]); }); blk(p, 9, 25);   // scarecrow
      for (const [x, y] of [[4, 22], [14, 22]]) p.decor("barrels", x, y);
    },
  },
  // Wedgehurst: the railway town (compared with the guidebook map). The river runs round two sides of it and both
  // roads out cross it; the station with its yard and line fills the south-west corner; the purple-roofed
  // research lab, the Center, the berry stalls and red-brick houses stand along the pink cobbled lanes.
  GalarWedgehurst: {
    theme: { town: true, ground: "grass", road: "brick", border: "tree", density: 0.03, groves: 0, flowers: 0.15, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const red = p.roof(1.7, 0.75, 0.6);
      p.fill("water", 1, 1, 36, 2); p.fill("water", 34, 1, 36, 30);                          // the river
      p.street("brick", 3, [[19, 1], [19, 30]]); p.street("brick", 3, [[1, 16], [36, 16]]); p.street("brick", 2, [[27, 11], [27, 15]]);
      p.fill("meadow", 21, 3, 33, 9); stoneWall(p, 21, 24, 10); stoneWall(p, 30, 33, 10);
      built(p, 2, 25, 8, 5, 3, gateway({ wall: [170, 166, 160], roof: [120, 84, 60] }));       // the gate to Route 2
      built(p, 1, 2, 14, 7, 4, cottage([150, 110, 200], { sign: [150, 110, 200], wall: [236, 236, 240] }));   // the research lab
      p.fill("brick", 3, 26, 17, 26); p.fill("brick", 12, 21, 17, 26);                        // the station yard and platform
      prop(p, 3, 21, 9, 5, cottage([156, 74, 58], { wall: [200, 124, 98], sign: [60, 90, 150] }), 4);   // Wedgehurst Station
      tracks(p, 1, 16, 27); train(p, 2, 27, 3, [70, 150, 110]);
      p.decor("pcSmall", 10, 9);
      p.decor("gable", 3, 6, { tint: red }); p.decor("gable", 13, 3, { tint: red }); p.decor("gable", 23, 21, { tint: red }); p.decor("gable", 29, 22, { tint: red });
      for (const [x, y, col] of [[22, 13, [214, 70, 70]], [24, 13, [90, 170, 110]], [15, 19, [70, 120, 200]]]) stall(p, x, y, col);
      p.fill("flowersPink", 22, 19, 26, 20); p.fill("flowersBlue", 9, 19, 13, 20); p.fill("flowersRed", 28, 19, 32, 20);
      for (const [x, y] of [[31, 27], [8, 4], [30, 11]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Turffield: green farmland (compared with the guidebook map). The Stadium at the head of the town with
  // ploughed red-earth fields beside it, standing stones scattered along the lanes, the chalk geoglyph on the
  // south-west hill, and the river down the east side with the bridge towards Route 5.
  GalarTurffield: {
    theme: { town: true, ground: "grass", road: "cobble", border: "tree", density: 0.03, groves: 0, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 33, 12, 35, 30);                                                       // the river
      p.street("cobble", 2, [[19, 5], [19, 30]]); p.street("cobble", 2, [[1, 16], [36, 16]]); p.street("cobble", 2, [[27, 11], [27, 16]]);
      p.building(2, "whiteHall"); p.building(1, "pcSmall");
      ploughed(p, 4, 4, 12, 7); ploughed(p, 4, 9, 12, 12); fence(p, 3, 3, 13, 13, ["8,13", "13,8"]);
      for (const [x, y] of [[2, 2], [16, 3], [22, 13], [15, 14], [24, 18], [8, 14], [21, 6], [30, 13]]) menhir(p, x, y, 20 + (x % 3) * 3);
      // The geoglyph: a chalk giant on the hillside.
      p.disc("meadow", 9.5, 24.5, 7.6, 5.4);
      for (let y = 19; y <= 30; y++) for (let x = 1; x <= 17; x++) if (((x + 0.5 - 9.5) / 7) ** 2 + ((y + 0.5 - 24.5) / 4.8) ** 2 <= 1) blk(p, x, y);
      p.paint(19, (c) => { const cx = 9.5 * S, cy = 24.5 * S, w = [250, 250, 244];
        c.ellipse(cx, cy + 6, 118, 84, [70, 140, 90]); c.ellipse(cx, cy, 116, 80, [132, 204, 124]); c.ellipse(cx - 6, cy - 8, 96, 60, [146, 214, 134]);
        c.ellipse(cx, cy + 6, 30, 36, w, 3); for (const r of [20, 11]) c.ellipse(cx, cy + 10, r, r, w, 2); c.rect(cx - 2, cy + 8, 4, 4, w);
        c.ellipse(cx, cy - 44, 13, 12, w, 3); c.line(cx - 9, cy - 53, cx - 20, cy - 68, w, 3); c.line(cx + 9, cy - 53, cx + 20, cy - 68, w, 3); c.rect(cx - 6, cy - 47, 3, 3, w); c.rect(cx + 3, cy - 47, 3, 3, w);
        c.line(cx - 28, cy - 8, cx - 62, cy - 30, w, 3); c.line(cx - 62, cy - 30, cx - 70, cy - 50, w, 3); c.line(cx + 28, cy - 8, cx + 62, cy - 30, w, 3); c.line(cx + 62, cy - 30, cx + 70, cy - 50, w, 3);
        c.line(cx - 16, cy + 36, cx - 26, cy + 64, w, 3); c.line(cx + 16, cy + 36, cx + 26, cy + 64, w, 3); c.line(cx - 26, cy + 64, cx - 38, cy + 64, w, 3); c.line(cx + 26, cy + 64, cx + 38, cy + 64, w, 3);
        for (const sx of [-1, 1]) { c.ellipse(cx + sx * 88, cy + 10, 9, 9, w, 2); c.line(cx + sx * 88, cy + 19, cx + sx * 88, cy + 40, w, 2); c.line(cx + sx * 78, cy + 28, cx + sx * 98, cy + 28, w, 2); c.line(cx + sx * 50, cy + 30, cx + sx * 58, cy + 22, w, 2); c.line(cx + sx * 58, cy + 22, cx + sx * 64, cy + 32, w, 2); c.line(cx + sx * 64, cy + 32, cx + sx * 72, cy + 22, w, 2); } });
      ploughed(p, 23, 21, 30, 23); crops(p, 23, 25, 30, 27, [200, 170, 70]); fence(p, 22, 20, 31, 28, ["22,24"]);
      p.decor("gable", 14, 7, { tint: p.roof(1.7, 0.75, 0.6) });
      for (const [x, y] of [[15, 2], [22, 9]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Hammerlocke's south gate: the castle wall with its towers and banners across the north, the
  // drawbridge over the moat, a brick forecourt with the Center, and the bastion that leads to Route 9.
  GalarHammerlockeGate: {
    theme: { town: true, ground: "brick", road: "cobble", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 5, 36, 6);
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 2, [[1, 16], [36, 16]]); p.street("cobble", 2, [[27, 11], [27, 16]]);
      p.disc("ornate", 19.5, 12.5, 4.2);
      blk(p, 1, 1, 17, 3); blk(p, 21, 1, 16, 3);
      p.paint(4.5, (c, top) => { const st = [164, 160, 168], dk = mix(st, 0.55), lt = mix(st, 1.15);
        for (const [x0, x1] of [[1, 17], [21, 36]]) { const x = x0 * S, w = (x1 - x0 + 1) * S; c.rect(x, 14, w, 50, dk); c.rect(x, 16, w, 46, st); for (let j = 24; j < 62; j += 8) { c.rect(x, j, w, 1, mix(st, 0.8)); for (let i = x + ((j >> 3) % 2) * 8; i < x + w; i += 16) c.rect(i, j, 1, 8, mix(st, 0.8)); } for (let i = x; i < x + w; i += 12) c.box(i, 6, 8, 10, lt, dk); c.rect(x, 60, w, 4, dk); }
        for (const tx of [15, 21]) { const x = tx * S; top.box(x, -4, 32, 20, st, dk); c.box(x, 4, 32, 60, st, dk); for (let j = 12; j < 60; j += 8) c.rect(x + 1, j, 30, 1, mix(st, 0.8)); for (let i = x - 2; i < x + 32; i += 9) top.box(i, -8, 7, 9, lt, dk); c.rect(x + 13, 22, 6, 12, [40, 40, 56]); c.poly([[x + 8, 38], [x + 24, 38], [x + 24, 56], [x + 16, 62], [x + 8, 56]], [60, 110, 200]); c.ellipse(x + 16, 47, 4, 4, [240, 200, 90]); }
        top.box(17 * S, 4, 64, 14, st, dk); for (let i = 17 * S + 2; i < 21 * S; i += 6) top.rect(i, 18, 2, 6, [70, 70, 84]); });
      p.building(1, "pcSmall");
      built(p, 2, 24, 6, 7, 5, (c, top, x, y, w, h, dx) => { const b = y + h, st = [164, 160, 168], dk = mix(st, 0.55); c.rect(x + 3, b - 2, w, 4, [0, 0, 0, 50]); c.box(x, y + 12, w, h - 12, st, dk); for (let j = y + 20; j < b - 2; j += 8) { c.rect(x + 1, j, w - 2, 1, mix(st, 0.8)); for (let i = x + 4 + ((j >> 3) % 2) * 8; i < x + w - 2; i += 16) c.rect(i, j, 1, 8, mix(st, 0.8)); } for (let i = x; i < x + w - 4; i += 12) c.box(i, y + 3, 8, 10, mix(st, 1.15), dk); c.ellipse(dx + 8, b - 20, 13, 16, dk); c.rect(dx - 5, b - 20, 26, 20, dk); c.ellipse(dx + 8, b - 19, 10, 13, [20, 18, 30]); c.rect(dx - 2, b - 19, 20, 19, [20, 18, 30]); c.rect(dx + 2, b - 4, 12, 4, [70, 64, 70]); for (const i of [x + 10, x + w - 22]) { c.poly([[i, y + 26], [i + 12, y + 26], [i + 12, y + 46], [i + 6, y + 52], [i, y + 46]], [60, 110, 200]); c.ellipse(i + 6, y + 36, 3, 3, [240, 200, 90]); } });
      p.decor("brickFlat", 9, 8); p.decor("brickFlat", 32, 12 - 4); p.decor("brickFlat", 3, 20); p.decor("brickFlat", 10, 20); p.decor("brickFlat", 24, 20); p.decor("brickFlat", 31, 20);
      for (const [x, y] of [[16, 8], [22, 8], [16, 19], [22, 19]]) lantern(p, x, y);
      for (const x of [3, 5, 7, 13]) p.decor("hedge", x, 12);
    },
  },
  // The approach into Wyndon from Route 10: snow giving way to the city, the hotel tower, the great
  // observation wheel in its park, the monorail overhead and the river with its bridge.
  GalarWyndonWest: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "tree", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("snow", 1, 1, 36, 2); p.fill("lawn", 2, 4, 15, 13); p.fill("water", 1, 22, 36, 24);
      p.street("asphalt", 3, [[19, 1], [19, 30]]); p.street("asphalt", 3, [[1, 16], [36, 16]]); p.street("asphalt", 2, [[27, 11], [27, 16]]);
      p.building(2, "towerDoor");
      p.decor("towerSlim", 32, 1, { canopy: 3, tint: p.trim(0.3, 0.6, 1) }); p.decor("towerShort", 21, 5, { canopy: 3 });
      for (const [x, t] of [[3, null], [7, p.trim(0.4, 0.8, 1)], [11, null], [23, p.trim(1, 0.8, 0.3)], [27, null], [31, p.trim(0.4, 0.8, 1)]]) p.decor("apartment", x, 25, { tint: t });
      // The wheel.
      blk(p, 7, 12, 7, 2);
      p.paint(14, (c, top) => { const cx = 10.5 * S, cy = 7.5 * S, R = 62, steel = [226, 228, 236], dk = [96, 100, 120];
        c.ellipse(cx, 14 * S - 3, 54, 5, [0, 0, 0, 50]);
        for (const sx of [-1, 1]) for (let t = 0; t <= 40; t++) { const y = cy + t * 2.4; (y < 12 * S ? top : c).rect(cx + sx * t * 1.1 - 2, y, 4, 3, dk); }
        for (let a = 0; a < 12; a++) { const ax = Math.cos(a * Math.PI / 6), ay = Math.sin(a * Math.PI / 6); top.line(cx, cy, cx + ax * R, cy + ay * R, steel, 1); }
        top.ellipse(cx, cy, R, R, dk, 4); top.ellipse(cx, cy, R - 1, R - 1, steel, 2); top.ellipse(cx, cy, R * 0.55, R * 0.55, steel, 1); top.ellipse(cx, cy, 6, 6, [214, 60, 70]); top.ellipse(cx, cy, 3, 3, [250, 240, 240]);
        for (let a = 0; a < 12; a++) { const gx = cx + Math.cos(a * Math.PI / 6) * R, gy = cy + Math.sin(a * Math.PI / 6) * R, col = [[214, 60, 70], [70, 130, 210], [240, 200, 80], [90, 180, 120]][a % 4]; top.box(gx - 5, gy - 1, 10, 9, col, mix(col, 0.5)); top.rect(gx - 3, gy + 1, 6, 3, [220, 240, 250]); }
        c.box(8 * S, 13 * S - 4, 5 * S, 18, [150, 154, 170], dk); c.box(10 * S - 4, 13 * S - 12, 24, 10, [214, 60, 70], [90, 30, 40]); });
      // The monorail.
      for (const x of [3, 10, 15, 23, 29, 34]) blk(p, x, 20);
      p.paint(21.5, (c, top) => { const y = 19 * S + 4; for (const x of [3, 10, 15, 23, 29, 34]) { c.box(x * S + 4, y + 6, 8, 23, [176, 180, 192], [90, 94, 110]); c.rect(x * S + 2, 21 * S - 4, 12, 4, [120, 124, 140]); } top.rect(S, y + 12, 36 * S, 3, [0, 0, 0, 40]); top.box(S, y, 36 * S, 9, [200, 204, 214], [90, 94, 110]); top.rect(S, y + 2, 36 * S, 2, [236, 238, 244]);
        for (let i = 0; i < 3; i++) { const x = 24 * S + i * 36; top.box(x, y - 13, 34, 15, [240, 240, 244], [70, 70, 90]); top.rect(x + 3, y - 10, 28, 5, [90, 150, 210]); top.rect(x + 1, y - 3, 32, 2, [214, 60, 70]); } });
      p.paint(25.5, (c) => { for (const x of [17, 21]) { const px = x * S, st = [176, 170, 160]; c.box(px + 2, 21 * S + 4, 12, 4 * S - 6, st, mix(st, 0.5)); c.poly([[px, 21 * S + 5], [px + 8, 21 * S - 8], [px + 16, 21 * S + 5]], [70, 110, 170]); c.rect(px + 6, 22 * S, 4, 6, [40, 40, 56]); } });
      for (const [x, y] of [[4, 11], [14, 5], [3, 5]]) p.decor("tree1", x, y, { canopy: true }); for (const x of [5, 6, 13, 14]) p.decor("bench", x, 18 - 4);
    },
  },
  // The top of Rose Tower: a steel roof above the clouds with the battle court in the middle, lift
  // housings down to the tower and the plant, the Battle Tower's spire, a helipad and aerials.
  GalarRoseTowerTop: {
    theme: { town: true, ground: "steel", road: "paving", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const roofAt = (x, y) => (x >= 6 && x <= 31 && y >= 3 && y <= 27) || (y >= 14 && y <= 18 && x >= 1 && x <= 36) || (y >= 15 && y <= 17) || (x >= 17 && x <= 21 && y >= 27 && y <= 30) || (x >= 18 && x <= 20) || (x >= 14 && x <= 31 && y >= 1 && y <= 3);
      for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (!roofAt(x, y)) p.fill("rock", x, y, x, y);
      p.paint(0.2, (c) => { for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (!roofAt(x, y)) { const t = y / p.H; c.rect(x * S, y * S, S, S, [110 + 70 * t, 170 + 50 * t, 236]); }
        for (let i = 0; i < 26; i++) { const x = Math.floor(p.hash(i, 1, 5) * p.W), y = Math.floor(p.hash(i, 2, 5) * p.H); if (roofAt(x, y) || roofAt(x + 2, y) || roofAt(x - 2, y) || roofAt(x, y - 1) || roofAt(x, y + 1)) continue; const px = x * S, py = y * S; c.ellipse(px, py + 4, 22, 7, [236, 244, 252]); c.ellipse(px - 8, py, 12, 7, [250, 252, 255]); c.ellipse(px + 9, py - 1, 10, 6, [250, 252, 255]); }
        for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (roofAt(x, y)) { const px = x * S, py = y * S, rail = [70, 80, 110], lite = [220, 226, 240]; if (!roofAt(x, y - 1)) { c.rect(px, py, S, 3, rail); c.rect(px, py, S, 1, lite); } if (!roofAt(x, y + 1)) { c.rect(px, py + 11, S, 5, rail); c.rect(px, py + 11, S, 1, lite); } if (!roofAt(x - 1, y)) { c.rect(px, py, 3, S, rail); c.rect(px, py, 1, S, lite); } if (!roofAt(x + 1, y)) { c.rect(px + 13, py, 3, S, rail); c.rect(px + 15, py, 1, S, lite); } } });
      p.fill("paving", 18, 5, 20, 26); p.fill("paving", 5, 15, 32, 17);
      p.disc("ornate", 19.5, 19, 5.6);
      p.paint(0.7, (c) => { const cx = 19.5 * S, cy = 19 * S; c.ellipse(cx, cy, 88, 88, [214, 60, 90], 3); c.ellipse(cx, cy, 50, 50, [250, 250, 250], 2); c.line(cx - 88, cy, cx + 88, cy, [250, 250, 250], 2); c.ellipse(cx, cy, 14, 14, [214, 60, 90]); c.ellipse(cx, cy, 9, 9, [250, 250, 250]);
        const hx = 27.5 * S, hy = 23.5 * S; c.ellipse(hx, hy, 30, 30, [60, 70, 96]); c.ellipse(hx, hy, 28, 28, [250, 220, 90], 2); c.rect(hx - 9, hy - 11, 4, 22, [250, 250, 250]); c.rect(hx + 5, hy - 11, 4, 22, [250, 250, 250]); c.rect(hx - 9, hy - 2, 18, 4, [250, 250, 250]); });
      const lift = (c, top, x, y, w, h, dx) => { const b = y + h, st = [196, 202, 216], dk = [70, 80, 110]; c.rect(x + 3, b - 2, w, 4, [0, 0, 0, 50]); c.box(x, y + 8, w, h - 8, st, dk); c.box(x - 2, y + 2, w + 4, 10, [226, 230, 240], dk); c.rect(x + 2, y + 16, w - 4, 4, [214, 60, 90]); c.box(dx - 2, b - 24, 20, 24, [50, 56, 80], dk); c.rect(dx + 7, b - 22, 2, 22, [120, 200, 240]); c.rect(dx, b - 28, 16, 3, [120, 240, 200]); for (const i of [x + 5, x + w - 13]) if (Math.abs(i - dx) > 14) c.box(i, y + 26, 8, 12, [120, 190, 236], dk); };
      built(p, 0, 17, 1, 5, 4, lift, 1); built(p, 1, 2, 14, 5, 4, lift, 1);
      p.building(2, "towerDoor2", { tint: p.trim(1, 0.3, 0.6) });
      for (const [x, y] of [[8, 6], [8, 9], [12, 6], [12, 9]]) { blk(p, x, y, 3, 2); p.paint(y + 2, (c) => { c.box(x * S, y * S + 2, 48, 28, [40, 60, 120], [30, 36, 60]); for (let i = 0; i < 4; i++) c.rect(x * S + 2 + i * 12, y * S + 4, 9, 24, [70, 110, 190]); c.rect(x * S + 1, y * S + 15, 46, 1, [30, 36, 60]); }); }
      for (const [x, y] of [[7, 26], [30, 26], [30, 4]]) { blk(p, x, y); p.paint(y + 1, (c, top) => { const px = x * S + 8, b = y * S + 15; c.box(px - 5, b - 6, 10, 6, [120, 126, 146], [60, 66, 90]); top.rect(px - 1, b - 52, 2, 46, [200, 204, 216]); top.ellipse(px, b - 40, 8, 5, [226, 230, 240]); top.ellipse(px, b - 40, 5, 3, [150, 160, 190]); top.rect(px - 1, b - 55, 3, 3, [240, 60, 60]); }); }
      for (const [x, y] of [[9, 22], [10, 22], [9, 24], [10, 24], [24, 13], [23, 13]]) p.decor("barrel", x, y);
    },
  },
  // Armor Station (compared with a screenshot): the red-brick station with its clock tower on the grass under
  // the cliffs, the flying-taxi stand, sandy paths and the beach and sea to the east and south.
  GalarArmorStation: {
    theme: { town: true, ground: "grass", road: "sand", border: "palms", water: "sea", density: 0.02, groves: 0, flowers: 0.1, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 27, 1, 36, 12); p.fill("water", 27, 20, 36, 30); p.fill("water", 1, 24, 36, 30);
      p.fill("beach", 1, 21, 26, 23); p.fill("beach", 24, 1, 26, 20); p.fill("beach", 27, 13, 36, 19); p.fill("sand", 20, 14, 23, 20);
      p.fill("rock", 1, 1, 12, 3); p.fill("rock", 1, 4, 5, 8);                               // the cliffs behind the station
      p.street("sand", 2, [[19, 1], [19, 23]]); p.street("deck", 2, [[19, 24], [19, 30]]); p.street("sand", 2, [[1, 18], [19, 18]]); p.street("sand", 2, [[20, 16], [36, 16]]);
      built(p, 1, 2, 14, 7, 4, (c, top, x, y, w, h, dx) => { const m = x + w / 2, br = [196, 120, 94], rf = [206, 100, 62];
        cottage(rf, { wall: br, sign: [60, 90, 150] })(c, top, x, y, w, h, dx);
        top.box(m - 8, y - 22, 16, 30, br, [80, 50, 44]); top.poly([[m - 11, y - 21], [m, y - 37], [m + 11, y - 21]], [70, 50, 44]); top.poly([[m - 9, y - 22], [m, y - 35], [m + 9, y - 22]], rf); top.ellipse(m, y - 11, 5, 5, [70, 50, 44]); top.ellipse(m, y - 11, 4, 4, [250, 246, 230]); top.rect(m, y - 14, 1, 4, [40, 40, 50]); top.rect(m, y - 11, 3, 1, [40, 40, 50]); });
      blk(p, 22, 7, 2, 2); p.paint(9, (c) => { const x = 22 * S, y = 7 * S; c.ellipse(x + 16, y + 30, 16, 3, [0, 0, 0, 50]); c.box(x + 2, y + 8, 28, 20, [60, 90, 170], [30, 40, 80]); c.rect(x + 5, y + 11, 22, 8, [170, 214, 240]); c.rect(x + 15, y + 11, 2, 8, [30, 40, 80]); c.rect(x + 2, y + 22, 28, 2, [250, 220, 90]); c.rect(x + 8, y + 2, 16, 6, [40, 44, 60]); c.line(x + 4, y + 2, x + 28, y + 2, [40, 44, 60], 2); });   // the flying taxi
      p.fill("palms", 9, 5, 12, 8); p.fill("palms", 14, 5, 16, 6);
      for (const [x, y] of [[14, 10], [10, 21], [3, 10]]) p.decor("tree1", x, y, { canopy: true });
      umbrella(p, 7, 22, [214, 70, 70]); umbrella(p, 23, 22, [240, 200, 80]); umbrella(p, 30, 14, [90, 180, 120]);
      for (const [x, y] of [[22, 19], [23, 19]]) p.decor("barrel", x, y);
    },
  },
  // The Fields of Honor: open grass sloping to a sandy shore, a stream running down to the sea,
  // a campsite, a den, and the rocky pass that leads on to the Soothing Wetlands.
  GalarFieldsOfHonor: {
    theme: { town: true, ground: "grass", road: "dirt", border: "tree", water: "sea", density: 0.04, groves: 0, flowers: 0.3, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 25, 36, 30); p.fill("beach", 1, 22, 36, 24); p.fill("water", 32, 1, 33, 24);
      p.street("dirt", 2, [[19, 1], [19, 23]]); p.street("deck", 2, [[19, 24], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[27, 11], [27, 16]]);
      p.fill("rock", 22, 5, 31, 10); built(p, 2, 25, 8, 5, 3, cave([150, 140, 128]));
      tent(p, 21, 12, [230, 120, 60]); tent(p, 23, 13, [70, 150, 200]); den(p, 19, 18);
      p.fill("flowersPink", 4, 6, 9, 10); p.fill("flowersBlue", 10, 19, 15, 20); p.fill("flowersRed", 22, 19, 25, 20);
      p.decor("honeyTree", 12, 7, { canopy: true }); for (const [x, y] of [[3, 2], [14, 3], [8, 12], [35, 4], [35, 19], [29, 13]]) p.decor("tree1", x, y, { canopy: true });
      umbrella(p, 8, 23, [214, 70, 70]); umbrella(p, 27, 23, [240, 200, 80]);
    },
  },
  // The Master Dojo: the yellow-roofed hall facing its battle court, Mustard's garden pond and stone
  // lanterns to the west, training posts, and the beach below.
  GalarMasterDojo: {
    theme: { town: true, ground: "grass", road: "sand", border: "tree", water: "sea", density: 0.02, groves: 0, flowers: 0.1, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 1, 26, 36, 30); p.fill("beach", 1, 22, 36, 25);
      p.street("sand", 2, [[19, 1], [19, 23]]); p.street("deck", 2, [[19, 25], [19, 30]]); p.street("sand", 2, [[1, 16], [36, 16]]);
      p.building(2, "temple", { tint: ([r, g, b]) => (b > r * 1.08 && b > 90 ? [Math.min(255, b * 1.25), Math.min(255, b * 1.05), r * 0.45] : [r, g, b]) });
      p.fill("clay", 21, 12, 33, 19);
      p.paint(0.6, (c) => { const x = 21 * S, y = 12 * S, w = 13 * S, h = 8 * S, wh = [250, 250, 244]; c.rect(x + 4, y + 4, w - 8, 2, wh); c.rect(x + 4, y + h - 6, w - 8, 2, wh); c.rect(x + 4, y + 4, 2, h - 8, wh); c.rect(x + w - 6, y + 4, 2, h - 8, wh); c.rect(x + w / 2 - 1, y + 4, 2, h - 8, wh); c.ellipse(x + w / 2, y + h / 2, 20, 20, wh, 2); c.ellipse(x + w / 2, y + h / 2, 6, 6, wh); });
      p.disc("water", 9, 7, 3.4, 2.4); for (const [x, y] of [[5, 5], [13, 5], [5, 10], [13, 10]]) lantern(p, x, y);
      p.paint(0.6, (c) => { for (const [x, y] of [[8, 7], [10, 6]]) { c.ellipse(x * S + 8, y * S + 8, 5, 3, [90, 180, 110]); c.rect(x * S + 7, y * S + 6, 2, 2, [250, 170, 200]); } });
      for (const [x, y] of [[13, 13], [15, 13], [14, 19]]) { blk(p, x, y); p.paint(y + 1, (c) => { const px = x * S, b = y * S + 15; c.ellipse(px + 8, b, 6, 2, [0, 0, 0, 50]); c.rect(px + 6, b - 20, 4, 20, [150, 110, 70]); c.rect(px + 1, b - 16, 14, 3, [150, 110, 70]); c.box(px + 4, b - 22, 8, 7, [230, 210, 150], [110, 80, 50]); c.rect(px + 5, b - 12, 6, 6, [200, 60, 60]); }); }
      p.decor("honeyTree", 3, 2, { canopy: true }); for (const [x, y] of [[15, 2], [34, 12], [2, 11], [35, 2]]) p.decor("tree1", x, y, { canopy: true });
      p.fill("flowersRed", 6, 12, 10, 13); umbrella(p, 9, 24, [70, 130, 210]); umbrella(p, 28, 24, [214, 70, 70]);
    },
  },
  // The Soothing Wetlands: marsh pools with lily pads, plank walks between them, clumps of Max
  // Mushrooms, and the great hollow tree that opens into the Forest of Focus.
  GalarSoothingWetlands: {
    theme: { ground: "grass", road: "deck", border: "tree", water: "bog", density: 0.04, groves: 0, flowers: 0.25, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const pools = [[9, 8, 4.5, 3], [30, 23, 4.6, 3.4], [8, 25, 5, 3], [12, 20, 2.4, 1.6], [31, 13, 3, 1.6], [25, 27, 2.5, 1.6]];
      for (const [x, y, rx, ry] of pools) p.disc("marsh", x, y, rx + 1.6, ry + 1.4);          // bright green wetland: reedy margins round each pool
      for (const [x, y, rx, ry] of pools) p.disc("water", x, y, rx, ry);
      p.street("deck", 2, [[19, 1], [19, 30]]); p.street("deck", 2, [[1, 16], [36, 16]]); p.street("deck", 2, [[27, 11], [27, 16]]); p.street("deck", 1, [[9, 4], [9, 15]]); p.street("deck", 1, [[30, 18], [30, 28]]);
      p.fill("tree", 22, 3, 32, 9);
      built(p, 2, 25, 7, 5, 4, (c, top, x, y, w, h, dx) => { const b = y + h, m = dx + 8, bark = [124, 90, 62], dk = mix(bark, 0.6); c.ellipse(m, b - 2, 40, 6, [0, 0, 0, 60]); c.poly([[m - 40, b], [m - 24, b - 20], [m - 20, y - 6], [m + 20, y - 6], [m + 24, b - 20], [m + 40, b]], dk); c.poly([[m - 36, b - 1], [m - 21, b - 20], [m - 17, y - 6], [m + 17, y - 6], [m + 21, b - 20], [m + 36, b - 1]], bark); for (const i of [-12, -4, 6, 13]) c.line(m + i, y - 2, m + i * 1.5, b - 24, dk); c.ellipse(m, b - 12, 11, 16, dk); c.ellipse(m, b - 11, 8, 13, [20, 16, 18]); c.rect(m - 8, b - 11, 17, 11, [20, 16, 18]);
        for (const [ax, ay, r] of [[0, -22, 34], [-26, -8, 22], [26, -8, 22], [-10, -34, 22], [14, -32, 20]]) { top.ellipse(m + ax, y + ay, r, r * 0.62, [36, 100, 70]); top.ellipse(m + ax - 2, y + ay - 2, r - 4, r * 0.62 - 3, [60, 140, 90]); top.ellipse(m + ax - 6, y + ay - 5, r * 0.5, r * 0.3, [96, 176, 110]); } });
      p.paint(0.6, (c) => { for (const [x, y, rx, ry] of pools) for (let i = 0; i < 5; i++) { const px = (x + (p.hash(i, x, 4) - 0.5) * rx * 1.1) * S, py = (y + (p.hash(i, y, 6) - 0.5) * ry * 1.1) * S; c.ellipse(px, py, 5, 3, [70, 150, 90]); c.ellipse(px - 1, py - 1, 3, 2, [110, 190, 110]); if (i % 2) c.rect(px, py - 2, 2, 2, [250, 180, 210]); } });
      for (const [x, y] of [[14, 11], [16, 11], [22, 20], [5, 20], [34, 8], [24, 23]]) mushrooms(p, x, y); den(p, 19, 18);
      for (const [x, y] of [[3, 2], [14, 3], [3, 11], [15, 22], [34, 18], [23, 13], [33, 27], [14, 26]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Challenge Beach: a wide strand under the cliffs, the Tower of Waters on its islet at the end of a
  // causeway, a sea cave out to the Workout Sea, rocks in the surf.
  GalarChallengeBeach: {
    theme: { ground: "beach", road: "sand", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("grass", 1, 1, 22, 4); p.fill("sand", 11, 5, 36, 21);
      p.fill("water", 1, 8, 10, 30); p.fill("water", 1, 24, 36, 30);
      p.disc("beach", 4.5, 16.5, 3.6, 3.2); p.street("deck", 2, [[4, 18], [4, 20], [12, 20]]); p.street("deck", 2, [[19, 22], [19, 30]]);
      built(p, 1, 2, 13, 5, 5, pagoda([226, 232, 240], [60, 110, 200]));
      p.fill("rock", 23, 3, 36, 10); built(p, 2, 25, 8, 5, 3, cave([150, 140, 128]));
      den(p, 19, 18);
      p.paint(0.6, (c) => { for (const [x, y] of [[6, 26], [13, 27], [25, 27], [31, 26], [34, 28], [8, 11], [3, 23]]) { const px = x * S, py = y * S; c.ellipse(px + 8, py + 10, 9, 5, [236, 244, 250, 160]); c.poly([[px + 1, py + 11], [px + 4, py + 2], [px + 10, py], [px + 15, py + 6], [px + 15, py + 11]], [90, 86, 90]); c.poly([[px + 3, py + 10], [px + 5, py + 3], [px + 10, py + 2], [px + 13, py + 7], [px + 13, py + 10]], [140, 134, 136]); } });
      umbrella(p, 14, 15, [214, 70, 70]); umbrella(p, 22, 19, [70, 130, 210]); umbrella(p, 30, 14, [240, 200, 80]); umbrella(p, 33, 20, [90, 180, 120]);
      p.fill("palms", 12, 6, 15, 8); p.fill("palms", 20, 6, 21, 7);
      p.paint(0.6, (c) => { for (const [x, y, col] of [[16, 20], [25, 14], [29, 21], [13, 12], [34, 12]].map((q, i) => [...q, [[240, 130, 110], [250, 220, 150], [200, 120, 200]][i % 3]])) { const px = x * S + 8, py = y * S + 8; c.line(px - 4, py, px + 4, py, col, 2); c.line(px, py - 4, px, py + 4, col, 2); c.rect(px - 1, py - 1, 3, 3, mix(col, 1.15)); } });
    },
  },
  // The Training Lowlands: riverside meadows below the hill that carries the Tower of Darkness, the
  // mouth of Brawlers' Cave in the western cliff, sandbanks and tall trees.
  GalarTrainingLowlands: {
    theme: { ground: "grass", road: "dirt", border: "tree", water: "water", density: 0.05, groves: 0, flowers: 0.2, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("sand", 1, 21, 18, 26); p.fill("sand", 16, 19, 36, 24); p.fill("water", 1, 22, 18, 24); p.fill("water", 17, 20, 36, 22);
      p.street("dirt", 2, [[19, 1], [19, 30]]); p.street("dirt", 2, [[4, 17], [9, 16], [36, 16]]); p.street("gravel", 2, [[27, 11], [27, 16]]);
      p.fill("rock", 1, 10, 9, 14); p.fill("rock", 1, 15, 8, 16); p.fill("rock", 2, 17, 2, 17); p.fill("rock", 6, 17, 7, 17);
      p.disc("gravel", 27.5, 9, 6, 4.6); p.fill("rock", 21, 4, 23, 9); p.fill("rock", 31, 4, 34, 9); p.fill("rock", 21, 2, 34, 3);
      built(p, 2, 25, 6, 5, 5, pagoda([70, 66, 80], [170, 40, 50]));
      for (const [x, y] of [[13, 11], [15, 11], [12, 13]]) mushrooms(p, x, y);
      p.fill("flowersBlue", 10, 6, 15, 8); p.fill("flowersRed", 28, 26, 33, 28);
      for (const [x, y] of [[3, 3], [7, 4], [12, 2], [16, 4], [34, 12], [31, 26], [5, 27], [11, 27], [24, 26], [14, 18]]) p.decor("tree1", x, y, { canopy: true });
      p.decor("boulder", 30, 12); p.decor("boulder", 22, 12);
    },
  },
  // Freezington: a snowed-in hamlet. Log cabins round the little square with the old stone statue of
  // the King of Bountiful Harvest, the station at the top of the lane, and the frozen carrot fields.
  GalarFreezington: {
    theme: { town: true, ground: "snow", road: "frostpath", border: "pine", density: 0.03, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, treeTint: "frost" },
    plan(p) {
      p.street("frostpath", 2, [[19, 1], [19, 30]]); p.street("frostpath", 2, [[1, 16], [36, 16]]); p.street("frostpath", 2, [[27, 11], [27, 16]]);
      p.disc("gravel", 21.5, 13, 3.6, 2.8);
      built(p, 0, 16, 1, 7, 4, cottage([150, 96, 70], { snow: true, sign: [70, 110, 170], wall: [214, 190, 160] }), 1);   // Crown Tundra station
      const tudor = (c, top, x, y, w, h, dx) => { cottage([150, 96, 70], { snow: true, wall: [232, 196, 132] })(c, top, x, y, w, h, dx); const b = y + h, beam = [104, 70, 50]; c.rect(x + 4, b - 28, w - 8, 2, beam); for (let i = x + 4; i < x + w - 5; i += 12) if (i < dx - 2 || i > dx + 16) c.rect(i, b - 27, 2, 26, beam); };   // half-timbered, as the village is
      built(p, 2, 25, 7, 5, 4, tudor, 1);
      for (const [x, y] of [[8, 9], [2, 9], [9, 19], [23, 20], [30, 21], [31, 6]]) prop(p, x, y, 5, 4, tudor);
      blk(p, 22, 12, 2, 1);
      p.paint(13, (c, top) => { const x = 22 * S, b = 13 * S - 1, st = [170, 172, 180], dk = mix(st, 0.55); c.ellipse(x + 16, b, 17, 3, [0, 0, 0, 50]); c.box(x + 2, b - 10, 28, 10, st, dk); c.box(x + 5, b - 14, 22, 5, mix(st, 1.1), dk);
        for (const g of [c, top]) { g.poly([[x + 8, b - 14], [x + 8, b - 24], [x + 24, b - 24], [x + 24, b - 14]], st); g.rect(x + 8, b - 20, 3, 6, dk); g.rect(x + 21, b - 20, 3, 6, dk); g.box(x + 19, b - 34, 8, 12, st, dk); g.ellipse(x + 23, b - 38, 6, 6, dk); g.ellipse(x + 23, b - 38, 5, 5, mix(st, 1.1)); g.rect(x + 20, b - 46, 2, 5, dk); g.rect(x + 23, b - 48, 2, 6, dk); g.rect(x + 26, b - 46, 2, 5, dk); g.rect(x + 9, b - 26, 14, 3, [244, 248, 255]); g.rect(x + 19, b - 44, 8, 2, [244, 248, 255]); } });
      crops(p, 3, 24, 15, 25, [230, 130, 50]); crops(p, 3, 27, 15, 28, [230, 130, 50]); fence(p, 2, 23, 16, 29, [], [150, 120, 96]);
      p.paint(0.7, (c) => { for (let y = 24; y <= 28; y++) for (let x = 3; x <= 15; x++) if (p.hash(x, y, 2) < 0.5) c.rect(x * S + 2, y * S + 12, 9, 3, [244, 248, 255]);
        const cx = 30 * S, cy = 27 * S; c.ellipse(cx, cy, 52, 26, [150, 190, 226]); c.ellipse(cx, cy - 1, 49, 23, [196, 226, 246]); c.line(cx - 30, cy - 6, cx - 8, cy - 12, [244, 250, 255], 2); c.line(cx + 6, cy + 6, cx + 30, cy + 2, [244, 250, 255], 2); c.line(cx - 12, cy + 10, cx + 2, cy + 8, [244, 250, 255]); });
      p.fill("pine", 2, 2, 6, 5); p.fill("pine", 10, 2, 14, 4); p.fill("pine", 24, 2, 29, 3);
      for (const [x, y] of [[16, 19], [22, 26], [34, 12]]) p.decor("barrels", x, y);
    },
  },
  // Frostpoint Field: snowfield below Freezington. The fallen pillars of the old temple, the red-lit
  // mouth of the Max Lair in the western rock, a frozen tarn, a campsite and the pass to Giant's Bed.
  GalarFrostpointField: {
    theme: { ground: "snow", road: "frostpath", border: "pine", density: 0.04, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, treeTint: "frost" },
    plan(p) {
      p.street("frostpath", 2, [[19, 1], [19, 30]]); p.street("frostpath", 2, [[1, 16], [36, 16]]); p.street("frostpath", 2, [[27, 11], [27, 16]]);
      p.fill("rock", 2, 9, 9, 12); p.fill("rock", 7, 13, 8, 15); built(p, 1, 2, 13, 5, 5, cave([126, 96, 104], { glow: [236, 60, 110], snow: true }));
      p.fill("rock", 22, 4, 32, 10); built(p, 2, 25, 8, 5, 3, cave([150, 146, 150], { snow: true }));
      p.fill("gravel", 12, 9, 21, 13);
      for (const [x, y, hgt] of [[12, 9, 26], [15, 9, 12], [18, 9, 30], [21, 9, 18], [12, 12, 14], [21, 12, 26], [14, 13, 8]]) { blk(p, x, y); p.paint(y + 1, (c, top) => { const px = x * S, b = y * S + 15, st = [186, 186, 196], dk = mix(st, 0.55); c.ellipse(px + 9, b, 8, 2, [0, 0, 0, 50]); c.box(px + 1, b - 5, 14, 5, st, dk); for (const g of [c, top]) { g.box(px + 3, b - hgt, 10, hgt - 4, st, dk); g.rect(px + 5, b - hgt + 1, 2, hgt - 6, mix(st, 1.15)); g.rect(px + 3, b - hgt - 2, 10, 3, [244, 248, 255]); } }); }
      p.paint(0.7, (c) => { const cx = 30 * S, cy = 24 * S; c.ellipse(cx, cy, 70, 44, [150, 190, 226]); c.ellipse(cx, cy - 1, 66, 40, [196, 226, 246]); c.line(cx - 40, cy - 10, cx - 10, cy - 18, [244, 250, 255], 2); c.line(cx + 6, cy + 10, cx + 44, cy + 2, [244, 250, 255], 2); c.line(cx - 20, cy + 20, cx + 4, cy + 16, [244, 250, 255]);
        for (const [x, y] of [[17, 13], [16, 15], [15, 17], [14, 19]]) { c.ellipse(x * S + 8, y * S + 9, 5, 4, [190, 206, 226]); c.ellipse(x * S + 4, y * S + 3, 2, 2, [190, 206, 226]); c.ellipse(x * S + 12, y * S + 3, 2, 2, [190, 206, 226]); } });
      tent(p, 23, 13, [214, 70, 70]); den(p, 19, 18);
      for (const [x, y, r] of [[8, 22, 3], [13, 26, 2.4], [32, 13, 2.2], [7, 5, 2.5]]) p.disc("drift", x, y, r, r * 0.7);
      p.fill("pine", 2, 2, 5, 6); p.fill("pine", 12, 2, 15, 4); p.fill("pine", 2, 26, 5, 29); p.fill("pine", 22, 27, 25, 29);
      p.decor("boulder", 10, 18); p.decor("boulder", 33, 4);
    },
  },
  // Giant's Bed: the green heart of the Crown Tundra. The river, the Old Cemetery behind its wall, a
  // sealed ruin, the snow line and pass up to Snowslide Slope, and the red Dyna Tree on its hill.
  GalarGiantBed: {
    theme: { ground: "grass", road: "dirt", border: "pine", water: "water", density: 0.05, groves: 0, flowers: 0.15, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("frost", 21, 13, 36, 14); p.disc("frost", 21, 6, 2.5, 7); p.fill("snow", 21, 1, 36, 12);
      p.fill("water", 1, 22, 36, 23); p.fill("water", 9, 20, 11, 22); p.fill("water", 1, 20, 9, 21);
      p.street("dirt", 2, [[19, 1], [19, 30]]); p.street("dirt", 2, [[4, 18], [36, 16]].map(([x]) => [x, 16])); p.street("frostpath", 2, [[27, 11], [27, 16]]);
      p.fill("rock", 22, 4, 32, 10); built(p, 2, 25, 8, 5, 3, cave([150, 146, 150], { snow: true }));
      p.fill("shade", 1, 9, 9, 14);
      built(p, 1, 2, 15, 5, 3, gateway({ wall: [150, 150, 160], roof: [76, 76, 92], post: [50, 50, 60], inside: [124, 124, 132], floor: [140, 140, 148] }));   // the Old Cemetery
      for (const [x, y] of [[2, 11], [4, 11], [6, 11], [8, 11], [2, 13], [4, 13], [6, 13], [8, 13]]) gravestone(p, x, y);
      ruin(p, 12, 10, 5, 3, { doors: [[40, [120, 200, 240]]] });
      p.disc("flowersPink", 29, 27.5, 6, 2.6); bigTree(p, 28, 27, [226, 66, 110], { h: 58, r: 48, dots: [255, 226, 240], bark: [110, 70, 80] });
      den(p, 19, 18);
      for (const [x, y] of [[12, 26], [33, 18], [23, 18]]) p.decor("tree1", x, y, { canopy: true });
      p.fill("pine", 2, 2, 5, 5); p.fill("pine", 8, 3, 10, 5); p.fill("pine", 4, 26, 6, 28); p.fill("pine", 13, 18, 14, 19);   // the tundra's firs
      p.decor("boulder", 34, 13); p.fill("pine", 33, 2, 36, 5);
    },
  },
  // Snowslide Slope: the long white climb to the Crown Shrine. Rock ledges step the slope, sheets of
  // ice lie between the drifts, and the shrine stands at the top of its stair.
  GalarSnowslideSlope: {
    theme: { ground: "snow", road: "frostpath", border: "pine", density: 0.03, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, treeTint: "frost", tree: "boulder" },
    plan(p) {
      p.street("frostpath", 2, [[19, 1], [19, 30]]); p.street("frostpath", 2, [[1, 16], [36, 16]]); p.street("gravel", 3, [[27, 11], [27, 15]]);
      p.building(2, "temple");
      p.fill("rock", 1, 21, 14, 21); p.fill("rock", 24, 21, 36, 21); p.fill("rock", 1, 8, 12, 8); p.fill("rock", 30, 13, 36, 13); p.fill("rock", 6, 26, 16, 26); p.fill("rock", 22, 26, 31, 26);
      p.paint(0.7, (c) => { for (const [x, y, rx, ry] of [[8, 12, 3, 1.6], [30, 18, 2.6, 1.3], [9, 23.6, 4, 1.4], [29, 24, 3.4, 1.3], [13, 4, 3, 1.5]]) { const cx = x * S, cy = y * S; c.ellipse(cx, cy, rx * S, ry * S, [150, 190, 226]); c.ellipse(cx, cy - 1, rx * S - 3, ry * S - 3, [196, 226, 246]); c.line(cx - rx * 9, cy - 3, cx - 4, cy - ry * 7, [244, 250, 255], 2); c.line(cx + 4, cy + ry * 6, cx + rx * 9, cy + 2, [244, 250, 255], 2); }
        for (let i = 0; i < 9; i++) c.rect(26 * S + 2, 11 * S + i * 8 + 6, 44, 2, [120, 120, 130]); });
      for (const [x, y, r] of [[5, 14, 2.4], [14, 18, 2], [33, 28, 2.6], [22, 6, 2], [4, 29, 2]]) p.disc("drift", x, y, r, r * 0.7);
      p.fill("pine", 2, 2, 6, 5); p.fill("pine", 33, 2, 36, 9); p.fill("pine", 2, 28, 3, 30);
      for (const [x, y] of [[13, 10], [23, 17], [10, 17], [33, 22]]) p.decor("boulder", x, y);
      for (const x of [25, 29]) lantern(p, x, 12);
    },
  },
  // Giant's Foot: rocky ground at the foot of the range. The Split-Decision Ruins with their two sealed
  // doors, a tarn shaped like the giant's footprint, and caves to the lake and Three-Point Pass.
  GalarGiantFoot: {
    theme: { ground: "grass", road: "dirt", border: "rock", water: "water", density: 0.05, groves: 0, flowers: 0.1, autoHouses: false, turn: 6, wander: 0, tree: "boulder" },
    plan(p) {
      p.street("dirt", 2, [[19, 1], [19, 30]]); p.street("dirt", 2, [[4, 17], [9, 16], [36, 16]]); p.street("dirt", 2, [[27, 11], [27, 16]]);
      p.fill("rock", 1, 10, 9, 14); p.fill("rock", 1, 15, 8, 16); p.fill("rock", 2, 17, 2, 17); p.fill("rock", 6, 17, 7, 17);
      p.fill("rock", 22, 3, 34, 10); built(p, 2, 25, 8, 5, 3, cave([150, 140, 128]));
      p.fill("gravel", 11, 13, 19, 14); ruin(p, 12, 10, 7, 3, { doors: [[30, [240, 220, 80]], [82, [226, 80, 70]]] });
      // The footprint tarn.
      p.disc("sand", 28.5, 24, 5.4, 6.6);
      p.disc("water", 28.5, 27, 2.3, 2.2); p.disc("water", 28.5, 23.5, 2.9, 3.4);
      for (const [x, y] of [[25, 19], [27, 18], [29, 18], [30, 19], [32, 20]]) p.fill("water", x, y, x, y);
      p.disc("frost", 7, 1, 9, 4.5); p.disc("snow", 6, 1, 6, 2.6);
      p.fill("flowersBlue", 5, 21, 10, 23);
      for (const [x, y] of [[12, 6], [4, 6], [14, 20], [8, 26], [34, 13], [22, 27], [12, 27]]) p.decor("boulder", x, y);
      for (const [x, y] of [[15, 26], [3, 25], [35, 27]]) p.decor("tree1", x, y, { canopy: true });
    },
  },
  // Motostoke: the brick engine city. The canal across the north side, cogs turning in the streets,
  // smoking stacks, the lift platform between its two great gears, the Stadium and the arch to Route 3.
  GalarMotostoke: {
    theme: { town: true, ground: "brick", road: "cobble", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const brick = ([r, g, b]) => (Math.abs(r - g) < 22 && Math.abs(g - b) < 26 && r > 60 ? [Math.min(255, r * 1.12), g * 0.7, b * 0.6] : [r, g, b]);
      p.fill("water", 1, 10, 36, 11); p.fill("water", 1, 12, 2, 23);                         // the canal, and the dock down the west side
      p.street("cobble", 3, [[19, 4], [19, 30]]); p.street("cobble", 2, [[1, 16], [36, 16]]); p.street("cobble", 2, [[30, 25], [30, 27], [10, 27], [10, 26]]); p.street("cobble", 2, [[14, 1], [24, 1]]);
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [244, 244, 240], sign: [220, 70, 60] }), 1);   // the Center
      p.building(2, "hall", { tint: brick });
      stoneWall(p, 5, 7, 25, [176, 100, 80]); stoneWall(p, 13, 15, 25, [176, 100, 80]); built(p, 3, 8, 23, 5, 3, gateway({ wall: [176, 100, 80], roof: [80, 70, 76], post: [70, 60, 60] }));
      for (const x of [3, 9, 24, 30]) p.decor("brickFlat", x, 2, { tint: brick }); p.decor("brickFlat", 4, 18, { tint: brick });   // red-brick mills
      p.decor("apartment", 21, 18, { tint: brick });
      for (const [x, y] of [[8, 4], [15, 6], [29, 5], [35, 13]]) chimney(p, x, y);
      // The lift: a steel platform slung between two gears.
      p.fill("steel", 12, 19, 16, 23); blk(p, 12, 19, 5, 1); gear(p, 11.5, 20.5, 26, [176, 150, 90]); gear(p, 17.4, 20.2, 20, [150, 154, 170]);
      p.paint(24.5, (c, top) => { const x = 12 * S, y = 19 * S; c.box(x, y + 2, 80, 14, [90, 96, 116], [40, 44, 60]); for (let i = x + 4; i < x + 78; i += 8) c.rect(i, y + 4, 2, 10, [240, 200, 80]); for (const i of [x, x + 77]) c.box(i, y + 16, 3, 64, [60, 64, 80], [40, 44, 60]); top.rect(x + 39, y - 30, 2, 34, [60, 64, 80]); top.box(x + 30, y - 36, 20, 8, [214, 60, 60], [90, 30, 30]); });
      gear(p, 5, 13, 28, [150, 154, 170]); gear(p, 8.6, 13.6, 16, [176, 150, 90]); gear(p, 32, 13, 22, [176, 150, 90]); gear(p, 28.6, 13.4, 14, [150, 154, 170]); gear(p, 26, 6, 18, [176, 150, 90]);
      for (const [x, y] of [[16, 13], [22, 12], [16, 25], [22, 25]]) lantern(p, x, y);
      for (const [x, y] of [[13, 13], [14, 13], [24, 13], [4, 28], [5, 28], [33, 28]]) p.decor("barrels", x, y);
    },
  },
  // Wyndon: the capital. The avenue from the station gate up to the Center, Rose Tower over the west
  // side, the Stadium on the east, glass towers, a park fountain and the monorail overhead.
  GalarWyndonCity: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "tree", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("asphalt", 3, [[19, 4], [19, 30]]); p.street("asphalt", 3, [[15, 16], [36, 16]]); p.street("asphalt", 2, [[1, 16], [4, 16], [4, 27], [30, 27], [30, 25]]); p.street("asphalt", 2, [[10, 26], [10, 27]]); p.street("asphalt", 2, [[14, 1], [24, 1]]);
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [244, 244, 240], sign: [220, 70, 60] }), 1);   // the Center
      p.building(3, "dishTower", { tint: p.trim(1, 0.35, 0.6) });                                              // Rose Tower
      built(p, 2, 24, 21, 13, 4, stadium([236, 236, 242], [214, 170, 80]));                                    // Wyndon Stadium
      p.decor("towerSlim", 24, 1, { canopy: 3, tint: p.trim(0.3, 0.6, 1) }); p.decor("towerSlim", 32, 1, { canopy: 3 }); p.decor("towerShort", 28, 4, { canopy: 3, tint: p.trim(0.4, 1, 0.7) });
      p.decor("towerShort", 2, 3, { canopy: 3 }); p.decor("towerShort", 7, 1, { canopy: 3, tint: p.trim(0.3, 0.6, 1) }); p.decor("towerShort", 12, 1, { canopy: 3, tint: p.trim(1, 0.8, 0.3) });
      p.fill("lawn", 22, 4, 23, 13); p.fill("lawn", 6, 28, 16, 30); p.fill("lawn", 22, 29, 36, 30); p.fill("lawn", 22, 18, 36, 19); p.fill("lawn", 1, 18, 2, 26);
      p.disc("brick", 19.5, 22, 4.4, 3.6); p.decor("fountain", 18, 20);                                         // the round red plaza inside the south entrance
      // The monorail along the north side of the high street.
      for (const x of [16, 22, 27, 31, 35]) blk(p, x, 14);
      p.paint(15.5, (c, top) => { const y = 13 * S + 2; for (const x of [16, 22, 27, 31, 35]) { c.box(x * S + 4, y + 6, 8, 23, [176, 180, 192], [90, 94, 110]); c.rect(x * S + 2, 15 * S - 4, 12, 4, [120, 124, 140]); } top.rect(15 * S, y + 12, 22 * S, 3, [0, 0, 0, 40]); top.box(15 * S, y, 22 * S, 9, [200, 204, 214], [90, 94, 110]); top.rect(15 * S, y + 2, 22 * S, 2, [236, 238, 244]);
        for (let i = 0; i < 3; i++) { const x = 23 * S + i * 36; top.box(x, y - 13, 34, 15, [240, 240, 244], [70, 70, 90]); top.rect(x + 3, y - 10, 28, 5, [90, 150, 210]); top.rect(x + 1, y - 3, 32, 2, [214, 60, 70]); } });
      for (const [x, y] of [[22, 5], [22, 9], [7, 28], [14, 28], [23, 28], [34, 28]]) p.decor("tree1", x, y, { canopy: true });
      for (const x of [15, 24]) p.decor("bench", x, 21); for (const x of [26, 28, 30, 32]) p.decor("hedge", x, 20);
    },
  },
  // Hammerlocke: the castle city. Curtain walls and turrets, the Stadium keep behind its own moat and
  // drawbridge, the vault with its tapestries on the west side, a stone square and the south gate.
  GalarHammerlocke: {
    theme: { town: true, ground: "gravel", road: "cobble", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("water", 23, 25, 36, 26);
      p.street("cobble", 3, [[19, 1], [19, 30]]); p.street("cobble", 3, [[1, 16], [36, 16]]); p.street("cobble", 2, [[30, 25], [30, 27], [10, 27], [10, 26]]);
      p.disc("ornate", 19.5, 16, 4.6, 3.6);
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [244, 244, 240], sign: [220, 70, 60] }), 1);
      p.building(2, "hall"); turret(p, 23, 24);
      rampart(p, 1, 16, 29); rampart(p, 22, 36, 29); turret(p, 16, 29); turret(p, 21, 29);
      rampart(p, 1, 7, 25); rampart(p, 13, 16, 25); built(p, 3, 8, 23, 5, 3, gateway({ wall: [164, 160, 168], roof: [60, 90, 150], post: [70, 70, 84] }));
      p.decor("church", 3, 4, { tint: ([r, g, b]) => (r > g * 1.3 && r > b * 1.3 ? [b * 0.9, g, Math.min(255, r * 1.1)] : [r, g, b]) });   // the vault
      p.paint(12.5, (c) => { for (const [x, col] of [[2, [200, 60, 60]], [11, [60, 110, 200]]]) { const px = x * S + 3, py = 8 * S; c.box(px, py, 10, 30, col, mix(col, 0.5)); c.ellipse(px + 5, py + 10, 3, 3, [240, 200, 90]); c.rect(px + 4, py + 16, 2, 9, [240, 200, 90]); c.poly([[px, py + 30], [px + 5, py + 36], [px + 10, py + 30]], col); } }); blk(p, 2, 9, 1, 2); blk(p, 11, 9, 1, 2);
      p.decor("brickFlat", 24, 3); p.decor("brickFlat", 30, 3); p.decor("brickFlat", 12, 3); p.decor("apartment", 2, 18); p.decor("apartment", 6, 18); p.decor("apartment", 13, 18);
      p.decor("fountain", 22, 10);
      for (const [x, y] of [[16, 13], [22, 19], [16, 19], [26, 12], [33, 12]]) lantern(p, x, y);
      for (const x of [24, 26, 28, 30, 32, 34]) p.decor("hedge", x, 11);
    },
  },
  // Stow-on-Side: a desert town stepped up a cliff. The ancient mural on the rock face at the head of
  // the long stair, the bargain market's awnings below, sandstone houses and the Stadium.
  GalarStowOnSide: {
    theme: { town: true, ground: "desert", road: "clay", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const sandstone = ([r, g, b]) => (Math.abs(r - g) < 22 && Math.abs(g - b) < 26 && r > 60 ? [Math.min(255, r * 1.16), g * 0.98, b * 0.7] : [r, g, b]);
      p.fill("rock", 1, 1, 15, 7); p.fill("rock", 23, 1, 36, 4); p.fill("rock", 1, 11, 5, 11); p.fill("rock", 10, 11, 16, 11); p.fill("rock", 22, 11, 36, 11);
      p.street("clay", 3, [[19, 4], [19, 30]]); p.street("clay", 2, [[1, 16], [36, 16]]); p.street("clay", 2, [[30, 25], [30, 27], [10, 27], [10, 26]]); p.street("clay", 2, [[14, 1], [24, 1]]);
      p.street("gravel", 4, [[7, 8], [7, 15]]); p.fill("gravel", 3, 8, 13, 10);
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [240, 226, 196], sign: [220, 70, 60] }), 1);
      p.building(2, "hall", { tint: sandstone });
      rampart(p, 5, 7, 25, [206, 170, 120]); rampart(p, 13, 15, 25, [206, 170, 120]); built(p, 3, 8, 23, 5, 3, gateway({ wall: [206, 170, 120], roof: [150, 90, 60], post: [110, 78, 52] }));
      // The mural on the cliff, and the steps up to it.
      p.paint(8.2, (c) => { const x = 3 * S, y = 2 * S + 6, w = 11 * S, h = 5 * S + 6, pl = [228, 204, 156], o = [176, 96, 50], bl = [60, 100, 170], rd = [190, 60, 50];
        c.box(x - 3, y - 3, w + 6, h + 6, [150, 120, 90], [80, 60, 50]); c.rect(x, y, w, h, pl); for (let i = 0; i < 40; i++) c.rect(x + Math.floor(p.hash(i, 1, 7) * (w - 3)), y + Math.floor(p.hash(i, 2, 7) * (h - 2)), 3, 1, mix(pl, 0.9));
        for (let i = x + 4; i < x + w - 6; i += 12) { c.rect(i, y + 3, 6, 2, o); c.rect(i + 6, y + h - 5, 6, 2, o); }
        c.ellipse(x + w / 2, y + 22, 11, 11, [226, 170, 60]); c.ellipse(x + w / 2, y + 22, 6, 6, rd); for (let a = 0; a < 8; a++) c.line(x + w / 2 + Math.cos(a * 0.785) * 14, y + 22 + Math.sin(a * 0.785) * 14, x + w / 2 + Math.cos(a * 0.785) * 19, y + 22 + Math.sin(a * 0.785) * 19, [226, 170, 60], 2);
        for (const [mx, col, sw] of [[38, bl, true], [w - 38, rd, false]]) { const m = x + mx, b = y + h - 8; c.ellipse(m, b - 40, 6, 6, col); c.poly([[m - 8, b - 33], [m + 8, b - 33], [m + 11, b - 8], [m - 11, b - 8]], col); c.rect(m - 7, b - 8, 4, 8, col); c.rect(m + 3, b - 8, 4, 8, col); c.rect(m - 6, b - 49, 3, 5, [226, 170, 60]); c.rect(m - 1, b - 51, 3, 6, [226, 170, 60]); c.rect(m + 4, b - 49, 3, 5, [226, 170, 60]);
          if (sw) { c.line(m + 16, b - 6, m + 16, b - 46, [90, 90, 110], 3); c.rect(m + 11, b - 16, 11, 3, [226, 170, 60]); } else { c.ellipse(m - 18, b - 22, 9, 12, [90, 90, 110]); c.ellipse(m - 18, b - 22, 6, 9, rd); c.rect(m - 19, b - 30, 2, 16, [226, 170, 60]); } }
        for (const mx of [16, w - 16]) { const m = x + mx, b = y + h - 8; c.poly([[m - 9, b], [m - 9, b - 14], [m - 4, b - 22], [m + 2, b - 16], [m + 9, b - 16], [m + 9, b]], o); c.rect(m - 7, b - 26, 3, 6, o); c.rect(m - 2, b - 24, 3, 5, o); } });
      p.paint(0.6, (c) => { for (let y = 8 * S + 4; y < 16 * S; y += 6) c.rect(6 * S, y, 4 * S, 2, [150, 130, 110]); });
      for (const [x, y, col] of [[11, 13, [214, 70, 70]], [13, 13, [70, 120, 200]], [15, 13, [240, 200, 80]], [11, 19, [90, 170, 110]], [13, 19, [214, 70, 70]], [15, 19, [200, 110, 200]], [22, 13, [70, 120, 200]], [24, 13, [240, 200, 80]], [22, 19, [214, 70, 70]]]) stall(p, x, y, col);
      const adobe = ([r, g, b]) => (g > r * 1.05 && g >= b ? [Math.min(255, g * 1.2), g * 0.78, b * 0.62] : sandstone([r, g, b]));   // sandstone houses with terracotta roofs
      p.decor("flat", 25, 5, { tint: adobe }); p.decor("flat", 31, 5, { tint: adobe }); p.decor("flat", 2, 19, { tint: adobe });
      for (const [x, y] of [[26, 13], [3, 13], [34, 13], [16, 22]]) p.decor("barrels", x, y); for (const [x, y] of [[33, 13], [2, 27], [35, 28], [22, 22]]) p.decor("boulder", x, y);
    },
  },
  // Ballonlea: a village in the dark of Glimwood Tangle, lit only by giant glowing mushrooms.
  // Timbered houses under the trees, the Stadium at the back of the glade.
  GalarBallonlea: {
    theme: { town: true, ground: "shade", road: "dirt", border: "darktree", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, treeTint: "dark" },
    plan(p) {
      p.street("dirt", 2, [[19, 4], [19, 30]]); p.street("dirt", 2, [[1, 16], [36, 16]]); p.street("dirt", 2, [[30, 25], [30, 27], [10, 27], [10, 26]]); p.street("dirt", 2, [[14, 1], [24, 1]]);
      p.fill("darktree", 1, 2, 4, 7); p.fill("darktree", 33, 2, 36, 9); p.fill("darktree", 1, 20, 2, 30); p.fill("darktree", 12, 29, 16, 30); p.fill("darktree", 23, 29, 26, 30); p.fill("darktree", 24, 11, 25, 13);
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [244, 244, 240], sign: [220, 70, 60] }), 1);
      p.building(2, "hall", { tint: ([r, g, b]) => (Math.abs(r - g) < 22 && Math.abs(g - b) < 26 && r > 60 ? [Math.min(255, r * 1.12), g * 0.82, Math.min(255, b * 1.12)] : [r, g, b]) });
      p.building(3, "peak", { tint: p.roof(1.2, 0.7, 1.6) });
      p.decor("peak", 7, 5, { tint: p.roof(0.8, 1.4, 1.4) }); p.decor("gable", 12, 5, { tint: p.roof(1.6, 0.7, 1.3) }); p.decor("peak", 26, 4, { tint: p.roof(1.2, 0.7, 1.6) }); p.decor("gable", 4, 18, { tint: p.roof(0.8, 1.4, 1.4) }); p.decor("peak", 14, 19, { tint: p.roof(1.6, 0.7, 1.3) });
      for (const [x, y] of [[5, 12], [30, 5], [34, 12], [22, 20]]) p.decor("tree1", x, y, { canopy: true, tint: ([r, g, b]) => (g > r * 1.1 && g > b * 1.1 ? [r * 0.5, g * 0.6, b * 0.9] : [r, g, b]) });
      p.paint(99, (c, top) => { c.rect(0, 0, p.W * S, p.H * S, [12, 8, 54, 120]); for (let i = 0; i < top.data.length; i += 4) if (top.data[i + 3]) { top.data[i] = top.data[i] * 0.53 + 6; top.data[i + 1] = top.data[i + 1] * 0.53 + 4; top.data[i + 2] = top.data[i + 2] * 0.53 + 25; } });
      const cols = [[250, 110, 200], [110, 230, 250], [150, 250, 150], [250, 230, 120], [190, 140, 255]];
      [[16, 5, 15], [22, 6, 12], [3, 10, 16], [10, 12, 11], [16, 12, 7], [23, 9, 7], [31, 12, 15], [27, 13, 6], [36, 19, 7], [22, 14, 5], [8, 19, 6], [12, 22, 13], [22, 24, 14], [17, 25, 6], [3, 28, 8], [34, 28, 14], [16, 19, 5], [6, 14, 5], [28, 9, 9], [24, 28, 5], [13, 14, 6]].forEach(([x, y, r], i) => glowshroom(p, x, y, r, cols[i % 5]));
      p.paint(140, (c) => { for (let i = 0; i < 70; i++) { const x = Math.floor(p.hash(i, 3, 11) * p.W * S), y = Math.floor(p.hash(i, 4, 11) * p.H * S), col = cols[i % 5]; c.rect(x, y, 2, 2, [...col, 200]); c.ellipse(x + 1, y + 1, 3, 3, [...col, 50]); } });
    },
  },
  // Circhester: a stone spa town under snow. The Hero's Bath steaming inside its ring of columns,
  // the hotel, terraces of stone houses, the Stadium and the gate to Route 9.
  GalarCirchester: {
    theme: { town: true, ground: "snow", road: "frostpath", border: "pine", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0, treeTint: "frost" },
    plan(p) {
      p.street("brick", 3, [[19, 4], [19, 30]]); p.street("brick", 3, [[1, 16], [36, 16]]); p.street("brick", 2, [[30, 25], [30, 27], [10, 27], [10, 26]]); p.street("brick", 2, [[14, 1], [24, 1]]);   // red-brown brick paving under the snow
      p.disc("gravel", 19.5, 22, 4.4, 3.4); p.decor("fountain", 18, 20);                     // the round plaza inside the south gates
      built(p, 1, 17, 1, 5, 3, cottage([220, 70, 60], { wall: [244, 244, 240], sign: [220, 70, 60], snow: true }), 1);
      p.building(2, "hall");
      rampart(p, 5, 7, 25, [186, 186, 196]); rampart(p, 13, 15, 25, [186, 186, 196]); built(p, 3, 8, 23, 5, 3, gateway({ wall: [186, 186, 196], roof: [100, 110, 140], post: [70, 70, 84], snow: true }));
      // The Hero's Bath: a long rectangular pool inside its colonnade, on a brick terrace.
      p.fill("brick", 2, 6, 15, 14); blk(p, 4, 8, 10, 5);
      p.paint(13.5, (c, top) => { const x = 4 * S, y = 8 * S, w = 10 * S, h = 5 * S, st = [190, 190, 198], dk = mix(st, 0.5);
        c.box(x - 2, y - 4, w + 4, h + 4, st, dk); c.rect(x + 5, y + 3, w - 10, h - 12, mix(st, 0.7)); c.rect(x + 7, y + 5, w - 14, h - 16, [70, 170, 180]); c.rect(x + 9, y + 7, w - 18, h - 20, [120, 214, 214]); c.rect(x + 16, y + 11, w - 70, 8, [170, 236, 232]);
        for (const [ax, ay] of [[30, 30], [84, 22], [120, 40], [60, 46]]) c.ellipse(x + ax, y + ay, 10, 3, [220, 250, 248, 180]);
        for (let i = 0; i < 6; i++) for (const [g, b] of [[top, y + 2], [c, y + h]]) { const px = x + 8 + i * (w - 16) / 5; g.box(px - 4, b - 30, 8, 30, [226, 226, 232], [110, 110, 124]); g.box(px - 6, b - 33, 12, 4, [240, 244, 250], [110, 110, 124]); g.rect(px - 6, b - 35, 12, 2, [250, 252, 255]); g.box(px - 6, b - 3, 12, 4, [200, 200, 208], [110, 110, 124]); }
        for (const [ax, ay, r] of [[30, 6, 9], [50, -10, 11], [84, 2, 9], [100, -14, 12], [124, 6, 8], [70, -22, 9]]) top.ellipse(x + ax, y + ay, r, r * 0.7, [250, 252, 255, 120]); });
      p.decor("brickTall", 26, 3, { canopy: 3 }); p.decor("brickFlat", 31, 6);
      p.decor("brickFlat", 2, 18); p.decor("apartment", 13, 19);
      for (const [x, y] of [[16, 13], [22, 13], [16, 19], [22, 19], [8, 28], [12, 28]]) lantern(p, x, y);
      p.fill("pine", 2, 2, 6, 4); p.fill("pine", 31, 1, 36, 3); p.fill("pine", 22, 29, 28, 30); p.fill("pine", 3, 29, 9, 30);
      for (const [x, y, r] of [[33, 20, 2.4], [25, 13, 2], [4, 14, 1.6]]) p.disc("drift", x, y, r, r * 0.7);
    },
  },
  // Spikemuth: one dark arcade street between shuttered shopfronts, neon signs and strings of lights
  // overhead, side alleys to Piers' stage and the tunnel shutter.
  GalarSpikemuth: {
    theme: { town: true, ground: "darkpave", road: "neon", border: "rock", density: 0, groves: 0, flowers: 0, autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const open = (x, y) => (x >= 18 && x <= 20) || (y >= 15 && y <= 17) || (y >= 26 && y <= 27 && x >= 4 && x <= 33) || (y >= 1 && y <= 4 && x >= 14 && x <= 24 && !(y === 1 && (x < 14 || x > 24))) || (x >= 29 && x <= 31 && y === 25) || false;
      const neon = [[250, 80, 190], [80, 230, 250], [150, 250, 120], [250, 220, 90], [180, 120, 255]];
      for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (!open(x, y)) p.fill("rock", x, y, x, y);
      p.street("neon", 3, [[19, 1], [19, 30]]); p.street("neon", 3, [[1, 16], [36, 16]]); p.street("neon", 2, [[4, 26], [33, 26]]);
      p.paint(0.2, (c) => { for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (!open(x, y)) { const px = x * S, py = y * S, h = p.hash(x >> 2, (y + (x >> 2)) >> 2, 3), base = [38 + h * 22, 36 + h * 18, 56 + h * 26];
          c.rect(px, py, S, S, base); for (let j = 3; j < S; j += 5) c.rect(px, py + j, S, 1, mix(base, 0.78)); if ((x & 3) === 0) c.rect(px, py, 1, S, [20, 18, 30]); if (((y + (x >> 2)) & 3) === 0) c.rect(px, py, S, 1, [20, 18, 30]);
          if (y < p.H - 2 && !open(x, y + 1) && open(x, y + 2)) { const col = neon[Math.floor(p.hash(Math.floor(x / 3), y, 9) * 5)]; c.rect(px, py, S, S, [52, 50, 70]); c.rect(px, py, S, 3, [24, 22, 36]); if (x % 3 === 0) { c.box(px + 2, py + 4, 28, 11, [20, 18, 30], col); c.rect(px + 5, py + 7, 22, 5, col); c.rect(px + 9, py + 7, 2, 5, [20, 18, 30]); c.rect(px + 17, py + 7, 3, 5, [20, 18, 30]); c.rect(px, py + 2, 32, 15, [...col, 40]); } }
          if (open(x, y + 1) && y < p.H - 1) { const col = neon[Math.floor(p.hash(x >> 1, y, 5) * 5)]; c.rect(px, py, S, S, [70, 70, 86]); c.box(px + 1, py + 5, 14, 11, [120, 124, 140], [40, 40, 56]); for (let j = 7; j < 15; j += 2) c.rect(px + 2, py + j, 12, 1, [90, 94, 110]); c.rect(px, py, S, 4, [24, 22, 36]); if (x & 1) { c.rect(px - 12, py + 1, 22, 2, col); c.rect(px - 13, py, 24, 4, [...col, 70]); } if (p.hash(x, y, 8) < 0.3) c.line(px + 3, py + 13, px + 11, py + 8, [...neon[(x + y) % 5], 220]); }
          if (y > 0 && y < p.H - 1 && (open(x + 1, y) || open(x - 1, y)) && x > 0 && x < p.W - 1) { const e = open(x + 1, y) ? px + 13 : px, col = neon[Math.floor(p.hash(x, y >> 1, 6) * 5)]; c.rect(e, py, 3, S, [24, 22, 36]); if (y % 3 === 0) { c.box(e - (open(x + 1, y) ? 5 : 0), py + 2, 8, 12, [30, 26, 44], [16, 14, 24]); c.rect(e - (open(x + 1, y) ? 3 : -2), py + 4, 4, 8, col); } } } });
      p.paint(120, (c, top) => { for (let y = 3; y < 30; y += 3) { if (y >= 14 && y <= 18) continue; top.line(17 * S + 12, y * S + 2, 21 * S + 4, y * S + 6, [30, 28, 40], 1); for (let i = 0; i < 6; i++) { const col = neon[(i + y) % 5], px = 17 * S + 14 + i * 9, py = y * S + 3 + i * 0.7; top.rect(px, py, 3, 3, col); top.ellipse(px + 1, py + 1, 5, 5, [...col, 60]); } }
        for (const [x, y, col] of [[18, 8, 0], [20, 12, 1], [18, 21, 2], [20, 23, 3]]) c.ellipse(x * S + 8, y * S + 8, 20, 14, [...neon[col], 40]); });
      const front = (sign, wide) => (c, top, x, y, w, h, dx) => { const b = y + h; c.rect(x, y, w, h, [34, 32, 50]); c.box(x, y + 6, w, h - 6, [58, 56, 76], [20, 18, 30]); for (let j = y + 12; j < b - 2; j += 6) c.rect(x + 1, j, w - 2, 1, [44, 42, 60]); c.rect(x + 3, y + 10, w - 6, 9, [20, 18, 30]); c.rect(x + 5, y + 12, w - 10, 5, sign); c.rect(x + 3, y + 9, w - 6, 11, [...sign, 60]);
        c.box(dx - 2, b - 24, 20, 24, [20, 18, 30], [...sign]); c.rect(dx, b - 22, 16, 22, [14, 12, 22]); if (wide) { for (const i of [x + 4, x + w - 16]) { c.box(i, b - 30, 12, 30, [26, 24, 38], [10, 10, 16]); c.ellipse(i + 6, b - 22, 4, 4, [70, 70, 90]); c.ellipse(i + 6, b - 10, 5, 5, [70, 70, 90]); } c.rect(x + 18, b - 3, w - 36, 3, sign); for (const i of [dx - 20, dx + 30]) c.poly([[i, b - 44], [i + 6, b - 44], [i + 3, b - 34]], sign); } else for (let j = b - 20; j < b - 2; j += 3) c.rect(dx + 1, j, 14, 1, [90, 94, 110]); };
      built(p, 1, 17, 1, 5, 3, cottage([70, 60, 90], { wall: [96, 92, 116], sign: [250, 80, 190], door: [30, 26, 44] }), 1);
      built(p, 3, 6, 21, 9, 5, front([250, 80, 190], true)); built(p, 2, 28, 21, 5, 4, front([250, 220, 90], false));
      for (const [x, y] of [[5, 27], [15, 27], [24, 27], [33, 27]]) p.decor("barrel", x, y);
    },
  },
  // Hulbury Stadium: Nessa's water Gym. A pool court with a walkway round it and across it.
  GalarHulburyStadium: {
    theme: { room: "arena", floor: "rGym" },
    plan(p) {
      p.fill("steel", p.left, p.top, p.right, p.bottom);
      p.fill("water", p.left + 2, p.top + 2, p.right - 2, p.bottom - 4);
      p.fill("deck", p.left + 2, 11, p.right - 2, 12); p.fill("deck", 11, p.top + 2, 12, p.bottom - 4);
      p.paint(1, (c) => { for (let k = 0; k < 6; k++) c.rect((p.left + 3 + k * 3) * 16, (p.top + 2) * 16 + 2, 20, 3, [250, 220, 90]); c.ellipse(12 * 16, 11.5 * 16 + 8, 22, 22, [244, 244, 250, 220], 3); c.ellipse(12 * 16, 11.5 * 16 + 8, 6, 6, [70, 130, 220]); });
      p.decor("rStatue", 8, p.bottom - 3, { optional: true }); p.decor("rStatue", 14, p.bottom - 3, { optional: true });
    },
  },
};
