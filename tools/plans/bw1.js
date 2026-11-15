// The Black/White campaign towns, drawn by hand. See README.md.
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
// A railway line along row y from tile x0 to x1 (solid unless told otherwise).
function rails(p, x0, x1, y, solid = true) {
  if (solid) p.block(x0, y, x1 - x0 + 1, 1);
  p.paint(solid ? y + 1 : 1.5, (c) => { const px = x0 * T, py = y * T, pw = (x1 - x0 + 1) * T; c.rect(px, py + 1, pw, 14, [120, 112, 104]); for (let i = 1; i < pw; i += 6) c.rect(px + i, py + 2, 3, 12, [96, 70, 52]); c.rect(px, py + 4, pw, 2, [70, 74, 86]); c.rect(px, py + 10, pw, 2, [70, 74, 86]); c.rect(px, py + 4, pw, 1, [200, 204, 214]); c.rect(px, py + 10, pw, 1, [200, 204, 214]); });
}
// A waterfall down a rock face: the tile rectangle (solid), painted over whatever is there.
function waterfall(p, x, y, w, h) {
  p.block(x, y, w, h);
  p.paint(y + h + 0.5, (c) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.rect(px, py, pw, ph, [120, 186, 236]); for (let i = 1; i < pw; i += 3) { const o = Math.floor(p.hash(x * 16 + i, y, 4) * 12); for (let j = -o; j < ph; j += 12) c.rect(px + i, py + Math.max(0, j), 1, 7, [226, 244, 255]); } c.rect(px, py, pw, 2, [240, 250, 255]); for (let i = -2; i < pw + 2; i += 5) c.ellipse(px + i + 2, py + ph - 1, 4, 3, [246, 252, 255]); });
}

// A warehouse seen from above: brick walls under a long pitched roof, a shutter door at the front (all solid).
function warehouse(p, x, y, w, h, roof) {
  p.block(x, y, w, h);
  p.paint(y + h, (c, top) => { const px = x * T, py = y * T, pw = w * T, ph = h * T, d = roof.map((v) => Math.round(v * 0.72)), l = roof.map((v) => Math.min(255, v + 36)), wy = py + ph - 22;
    c.box(px, wy, pw, 22, [170, 96, 76], [70, 44, 40]); for (let j = 3; j < 20; j += 4) c.rect(px + 1, wy + j, pw - 2, 1, [140, 76, 62]);
    c.box(px + pw / 2 - 10, wy + 4, 20, 18, [200, 204, 210], [60, 60, 70]); for (let j = 7; j < 20; j += 3) c.rect(px + pw / 2 - 9, wy + j, 18, 1, [150, 154, 164]);
    for (const wx of [8, pw - 18]) c.box(px + wx, wy + 6, 10, 8, [150, 200, 230], [60, 60, 70]);
    for (const cv of [c, top]) { cv.rect(px - 2, py - 8, pw + 4, ph - 12, [50, 44, 50]); cv.rect(px - 1, py - 7, pw + 2, (ph - 14) / 2, l); cv.rect(px - 1, py - 7 + (ph - 14) / 2, pw + 2, (ph - 14) / 2, d); cv.rect(px - 1, py - 8 + (ph - 14) / 2, pw + 2, 2, roof); for (let i = 6; i < pw; i += 10) cv.rect(px + i, py - 6, 1, ph - 16, [0, 0, 0, 36]); } });
}
// A moored boat about 3x2 tiles with its top-left at tile (x, y); drawn over water, changes nothing underfoot.
function boat(p, x, y, hull) {
  p.paint(y + 3, (c) => { const px = x * T, py = y * T; c.poly([[px, py + 6], [px + 44, py + 6], [px + 38, py + 24], [px + 6, py + 24]], [50, 44, 50]); c.poly([[px + 2, py + 7], [px + 42, py + 7], [px + 37, py + 22], [px + 7, py + 22]], hull); c.rect(px + 4, py + 8, 36, 2, [250, 250, 250]); c.box(px + 13, py - 3, 16, 12, [236, 236, 240], [80, 80, 96]); c.rect(px + 16, py, 10, 4, [120, 180, 230]); });
}
// A market stall or beach hut on one tile with a striped awning (solid).
function stall(p, x, y, col) {
  p.block(x, y, 1, 1);
  p.paint(y + 1, (c) => { const px = x * T, py = y * T; c.box(px, py + 4, 16, 12, [196, 150, 96], [90, 60, 40]); c.rect(px + 3, py + 8, 10, 3, [240, 236, 220]); c.poly([[px - 3, py + 5], [px + 8, py - 6], [px + 19, py + 5]], col); c.poly([[px + 3, py + 5], [px + 8, py - 6], [px + 13, py + 5]], [250, 246, 236]); });
}
// A domed stadium seen from above, filling the tile rectangle (solid), entrance at the bottom centre.
function dome(p, x, y, w, h, col) {
  p.block(x, y, w, h);
  p.paint(y + h, (c) => { const cx = (x + w / 2) * T, cy = (y + h / 2) * T, rx = w * T / 2, ry = h * T / 2, d = col.map((v) => Math.round(v * 0.6)), l = col.map((v) => Math.min(255, v + 50)); c.ellipse(cx + 2, cy + 5, rx, ry - 2, [0, 0, 0, 60]); c.ellipse(cx, cy + 3, rx, ry - 3, [70, 70, 84]); c.ellipse(cx, cy + 2, rx - 2, ry - 5, [206, 206, 214]); c.ellipse(cx, cy - 3, rx - 4, ry - 8, d); c.ellipse(cx, cy - 4, rx - 6, ry - 10, col); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.line(cx, cy - 4, cx + Math.cos(a) * (rx - 7), cy - 4 + Math.sin(a) * (ry - 11), d); } c.ellipse(cx - rx / 4, cy - 4 - ry / 4, rx / 3, ry / 4, l); c.ellipse(cx, cy - 4, 5, 4, [250, 250, 250]); c.box(cx - 10, cy + ry - 14, 20, 12, [60, 70, 100], [40, 40, 50]); c.rect(cx - 7, cy + ry - 11, 14, 9, [150, 200, 240]); });
}
// A Ferris wheel 8 tiles wide: its legs stand on rows y-1..y (solid, 4 tiles), the wheel is walked behind.
function ferris(p, x, y) {
  p.block(x + 2, y - 1, 4, 2);
  p.paint(y + 1, (c, top) => { const cx = x * T + 64, by = (y + 1) * T, cy = by - 84; c.ellipse(cx, by - 3, 40, 5, [0, 0, 0, 50]); for (const cv of [c, top]) { cv.poly([[cx - 4, cy], [cx + 4, cy], [cx + 30, by - 2], [cx + 20, by - 2]], [110, 120, 150]); cv.poly([[cx - 4, cy], [cx + 4, cy], [cx - 20, by - 2], [cx - 30, by - 2]], [110, 120, 150]); }
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; top.line(cx, cy, cx + Math.cos(a) * 54, cy + Math.sin(a) * 54, [150, 160, 190]); } top.ellipse(cx, cy, 56, 56, [226, 80, 110], 4); top.ellipse(cx, cy, 44, 44, [250, 220, 90], 2);
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26, gx = cx + Math.cos(a) * 55, gy = cy + Math.sin(a) * 55; top.box(gx - 6, gy - 4, 12, 11, [[250, 110, 110], [110, 180, 250], [250, 220, 90], [130, 220, 140]][k % 4], [60, 50, 70]); top.rect(gx - 4, gy - 2, 8, 4, [230, 244, 255]); } top.ellipse(cx, cy, 7, 7, [90, 100, 130]); c.box(cx - 22, by - 12, 44, 12, [226, 80, 110], [90, 40, 60]); c.rect(cx - 20, by - 10, 40, 3, [250, 220, 90]); });
}
// A shipping container, w x 2 tiles (solid).
function container(p, x, y, w, col) {
  p.block(x, y, w, 2);
  p.paint(y + 2, (c) => { const px = x * T, py = y * T, pw = w * T, d = col.map((v) => Math.round(v * 0.66)); c.box(px, py + 2, pw, 30, col, [40, 40, 50]); c.rect(px + 1, py + 3, pw - 2, 5, col.map((v) => Math.min(255, v + 40))); for (let i = 4; i < pw - 2; i += 4) c.rect(px + i, py + 9, 1, 21, d); c.rect(px + 1, py + 28, pw - 2, 3, d); });
}
// A glasshouse, w x h tiles (solid).
function glasshouse(p, x, y, w, h) {
  p.block(x, y, w, h);
  p.paint(y + h, (c, top) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.box(px, py + ph - 16, pw, 16, [190, 226, 236], [70, 90, 100]); for (let i = 6; i < pw; i += 8) c.rect(px + i, py + ph - 15, 1, 14, [240, 250, 255]); c.box(px + pw / 2 - 5, py + ph - 12, 10, 12, [120, 170, 150], [70, 90, 100]); for (const cv of [c, top]) { cv.rect(px - 1, py - 6, pw + 2, ph - 10, [70, 90, 100]); cv.rect(px, py - 5, pw, (ph - 12) / 2, [214, 240, 246]); cv.rect(px, py - 5 + (ph - 12) / 2, pw, (ph - 12) / 2, [160, 208, 220]); for (let i = 7; i < pw; i += 8) cv.rect(px + i, py - 5, 1, ph - 12, [110, 150, 160]); cv.rect(px, py - 6 + (ph - 12) / 2, pw, 2, [250, 255, 255]); for (let i = 3; i < pw - 4; i += 16) cv.rect(px + i, py + 2, 4, 3, [110, 190, 110, 150]); } });
}
// A rounded building of the future: dark shell, glowing bands, w x h tiles (solid).
function pod(p, x, y, w, h, glow = [90, 230, 250]) {
  p.block(x, y, w, h);
  p.paint(y + h, (c, top) => { const px = x * T, py = y * T, pw = w * T, ph = h * T, cx = px + pw / 2; c.ellipse(cx + 2, py + ph - 4, pw / 2, 6, [0, 0, 0, 70]); c.box(px + 2, py + ph - 26, pw - 4, 26, [54, 62, 96], [20, 22, 40]); c.rect(px + 3, py + ph - 14, pw - 6, 2, glow); c.box(cx - 7, py + ph - 14, 14, 14, [20, 22, 40], glow); for (const cv of [c, top]) { cv.ellipse(cx, py + ph / 2 - 8, pw / 2, ph / 2 - 2, [20, 22, 40]); cv.ellipse(cx, py + ph / 2 - 9, pw / 2 - 2, ph / 2 - 4, [70, 80, 124]); cv.ellipse(cx, py + ph / 2 - 9, pw / 2 - 6, ph / 2 - 8, glow, 2); cv.ellipse(cx - pw / 8, py + ph / 2 - 14, pw / 5, ph / 8, [120, 136, 190]); cv.ellipse(cx, py + ph / 2 - 9, 4, 3, glow); } });
}
// One of the Elite Four's towers above its doorway at (x, y): 3 tiles wide, standing on the three rows above the door.
function eliteTower(p, x, y, col) {
  p.block(x - 1, y - 3, 3, 3);
  p.paint(y, (c, top) => { const px = (x - 1) * T, by = y * T, d = col.map((v) => Math.round(v * 0.6)), l = col.map((v) => Math.min(255, v + 60)); c.rect(px + 2, by - 92, 44, 92, [40, 36, 50]); c.rect(px + 3, by - 91, 42, 90, STONE[1]); c.rect(px + 5, by - 91, 6, 90, STONE[0]); c.rect(px + 36, by - 91, 7, 90, STONE[2]); for (let j = 78; j > 14; j -= 20) { c.rect(px + 3, by - j, 42, 3, col); c.rect(px + 20, by - j + 6, 8, 10, d); } c.poly([[px - 3, by - 90], [px + 24, by - 122], [px + 51, by - 90]], d); c.poly([[px + 1, by - 91], [px + 24, by - 118], [px + 24, by - 91]], l); c.poly([[px + 24, by - 91], [px + 24, by - 118], [px + 47, by - 91]], col); c.ellipse(px + 24, by - 100, 4, 4, [250, 240, 180]);
    c.box(px + 14, by - 6, 20, 22, [226, 196, 96], [40, 36, 50]); c.rect(px + 17, by - 2, 14, 18, [24, 22, 34]); c.rect(px + 17, by + 12, 14, 4, d); });
}
// A giant forest tree: trunk on 2x2 tiles at (x, y-1) (solid), a wide crown that is walked behind.
function bigTree(p, x, y) {
  p.block(x, y - 1, 2, 2);
  p.paint(y + 1, (c, top) => { const cx = (x + 1) * T, by = (y + 1) * T; c.ellipse(cx + 2, by - 2, 22, 6, [0, 0, 0, 60]); c.rect(cx - 9, by - 34, 18, 32, [84, 58, 40]); c.rect(cx - 7, by - 34, 5, 32, [126, 92, 62]); c.poly([[cx - 16, by], [cx - 9, by - 12], [cx + 9, by - 12], [cx + 16, by]], [84, 58, 40]); c.box(cx - 3, by - 14, 6, 9, [40, 28, 24], [60, 40, 30]);
    for (const [dx, dy, r, col] of [[0, -62, 40, [30, 84, 50]], [-24, -50, 24, [30, 84, 50]], [24, -50, 24, [30, 84, 50]], [0, -66, 36, [52, 120, 62]], [-22, -54, 20, [52, 120, 62]], [22, -54, 20, [52, 120, 62]], [-8, -74, 22, [86, 156, 80]], [14, -64, 14, [86, 156, 80]], [-26, -60, 10, [86, 156, 80]]]) top.ellipse(cx + dx, by + dy, r, r * 0.8, col);
    for (let k = 0; k < 26; k++) { const a = p.hash(x + k, y, 7) * 6.283, r = p.hash(x, y + k, 8) * 30; top.rect(cx + Math.cos(a) * r, by - 64 + Math.sin(a) * r * 0.7, 2, 2, [120, 190, 100]); } });
}
// A railway carriage standing on the rails: w x 1 tiles from (x, y) (the rails underneath are already solid).
function carriage(p, x, y, w, col) {
  p.paint(y + 1.5, (c) => { const px = x * T, py = y * T, pw = w * T, d = col.map((v) => Math.round(v * 0.6)); c.box(px + 1, py - 8, pw - 2, 22, col, [40, 40, 50]); c.rect(px + 2, py - 7, pw - 4, 4, col.map((v) => Math.min(255, v + 50))); for (let i = 6; i < pw - 10; i += 12) c.rect(px + i, py - 1, 8, 6, [190, 226, 250]); c.rect(px + 2, py + 9, pw - 4, 3, d); for (let i = 6; i < pw - 6; i += 14) c.ellipse(px + i + 3, py + 14, 3, 2, [30, 30, 36]); });
}

module.exports = {
  // Nuvema Town (after the game's map): Juniper's lab in the north-west corner, three blue-roofed houses - one inside the
  // loop of the sand lane, two below it - and the railed sea front along the whole south side.
  BW1NuvemaTown: {
    theme: { town: true, ground: "grass", road: "sand", border: "tree", water: "sea", density: 0.02, groves: 0, flowers: 0.04, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      const BLUE = p.roof(0.35, 0.75, 2.1);
      p.fill("water", 0, 35, 47, 39);                                                    // the sea
      wall(p, 2, 34, 44, 1);                                                             // the sea-front balustrade
      p.street("sand", 3, [[24, 4], [24, 23]]);                                          // the lane from Route 1: the loop's east side
      p.street("sand", 2, [[24, 13], [12, 13], [12, 23], [24, 23]]);                     // the loop round the middle house
      p.street("sand", 2, [[8, 11], [8, 13], [12, 13]]);                                 // the lab
      p.street("sand", 2, [[18, 23], [18, 32]]); p.street("sand", 2, [[10, 32], [37, 32]]);   // down to the lane along the sea front
      p.building(2, "lab"); p.building(1, "gable", { tint: BLUE });
      p.decor("gable", 16, 15, { tint: BLUE }); p.decor("gable", 13, 26, { tint: BLUE });
      p.decor("board", 10, 12); p.decor("board", 22, 25);
      p.decor("hedge", 15, 19); p.decor("hedge", 15, 20); p.decor("hedge", 17, 30); p.decor("hedge", 17, 31); p.decor("hedge", 31, 30); p.decor("hedge", 31, 31);
      p.fill("flowersPink", 3, 17, 4, 20); p.fill("flowersPink", 42, 17, 43, 19); p.fill("flowersPink", 42, 30, 43, 32);
    },
  },
  // Accumula Town (after the game's map): pale stone paving on two levels, three brick apartment blocks with flat roofs, one
  // blue-roofed house up its own flight of steps, and the raised lawn with benches where Ghetsis speaks. The real town's
  // gates are west and south-east; ours are fixed north and south, so the street runs straight through past the lawn.
  BW1AccumulaTown: {
    theme: { town: true, ground: "grass", road: "paving", border: "tree", density: 0.02, groves: 0, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("paving", 5, 11, 42, 34);                                                   // the paved town
      p.street("paving", 3, [[24, 4], [24, 36]]);                                        // Route 2 - Route 1
      p.fill("paving", 30, 3, 41, 10); wall(p, 33, 11, 9, 2); steps(p, 30, 11, 3, 2); wall(p, 29, 3, 1, 10);   // the house on its terrace
      p.decor("gable", 35, 4, { tint: p.roof(0.35, 0.75, 2.1) });
      p.fill("paving", 7, 3, 21, 10); p.decor("brickFlat", 8, 4); p.decor("brickFlat", 15, 4);   // two apartment blocks
      p.fill("lawn", 12, 15, 21, 22);                                                    // the raised lawn
      wall(p, 11, 15, 1, 8); wall(p, 5, 23, 17, 2); wall(p, 27, 23, 16, 2); steps(p, 22, 23, 5, 2);
      p.decor("bench", 14, 16); p.decor("bench", 14, 20); p.decor("tree1", 12, 17); p.decor("tree1", 19, 15);
      p.building(0, "pcSmall");
      p.decor("brickFlat", 31, 26);                                                      // the third block
      p.fill("ornate", 38, 27, 41, 30); p.decor("board", 39, 28);                        // the notice board square
      for (const [x, y] of [[22, 13], [27, 13], [22, 27], [27, 27]]) lamp(p, x, y);
    },
  },
  // Striaton City (after the game's map): the Trainers' School and the Gym side by side on the top row of a pale paved square
  // in the woods, flat-roofed apartment blocks below, and the water garden - ponds, clipped hedges, a pergola and the
  // fountain in the middle. The real garden lies on the Route 3 side; our gates are fixed, so it is the south-east quarter.
  BW1StriatonCity: {
    theme: { town: true, ground: "grass", road: "paving", border: "tree", density: 0.22, groves: 0.1, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("paving", 5, 11, 45, 21); p.fill("paving", 5, 22, 25, 34); p.fill("paving", 11, 3, 45, 10);   // the square
      p.street("paving", 3, [[24, 4], [24, 36]]); p.street("paving", 2, [[26, 20], [44, 20]]);
      p.building(4, "hall"); p.building(0, "pcSmall");
      p.decor("academy", 12, 3);                                                         // the Trainers' School, left of the Gym
      p.decor("brickFlat", 12, 22); p.decor("brickFlat", 18, 22); p.decor("brickFlat", 40, 3); p.decor("brickFlat", 40, 11);   // the apartment blocks
      // the water garden
      p.fill("lawn", 27, 23, 45, 35);
      p.fill("water", 28, 24, 31, 25); p.fill("water", 28, 26, 29, 29); p.fill("water", 40, 24, 44, 26); p.fill("water", 43, 27, 44, 30);
      p.fill("water", 28, 32, 33, 34); p.fill("water", 39, 32, 44, 34); p.fill("water", 34, 33, 38, 34);
      p.disc("ornate", 36.5, 29, 3.2, 2.6); p.decor("fountain", 35, 27);
      p.street("sand", 2, [[36, 22], [36, 25]]); p.street("paving", 2, [[26, 30], [33, 30]]); p.street("paving", 2, [[36, 31], [36, 35]]);
      // the pergola over the garden path
      p.block(35, 23, 1, 1); p.block(38, 23, 1, 1);
      p.paint(24, (c, top) => { const px = 35 * T, py = 22 * T; for (const dx of [2, 52]) for (const dy of [0, 22]) c.rect(px + dx, py + dy, 4, 16, [150, 110, 76]); top.box(px, py - 10, 64, 34, [120, 88, 60], [84, 58, 40]); for (let i = 4; i < 60; i += 8) top.rect(px + i, py - 9, 3, 32, [70, 142, 74]); for (let j = -6; j < 22; j += 8) top.rect(px + 1, py + j, 62, 2, [150, 110, 76]); });
      hedgeRow(p, 30, 28, 2, 1); hedgeRow(p, 31, 23, 3, 1); hedgeRow(p, 40, 28, 2, 1); hedgeRow(p, 39, 30, 3, 1); hedgeRow(p, 30, 31, 3, 1); hedgeRow(p, 39, 23, 5, 1);
      p.fill("flowersPink", 33, 25, 34, 26); p.fill("flowersPink", 41, 31, 42, 31);
      wall(p, 27, 28, 1, 1); wall(p, 27, 32, 1, 1);                                      // the gate pillars between town and garden
      for (const [x, y] of [[22, 12], [26, 12], [22, 19], [26, 23]]) lamp(p, x, y);
    },
  },
  // Nacrene City (after the game's map): pairs of red-brick warehouses under dark slate roofs on tan paving, the asphalt road
  // through the middle with a spur up to the Museum, the cafe terrace beside the north-west pair, and the disused railway
  // along the southern edge.
  BW1NacreneCity: {
    theme: { town: true, ground: "grass", road: "asphalt", border: "tree", density: 0.2, groves: 0.1, flowers: 0.03, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("cobble", 3, 11, 45, 33); p.fill("cobble", 26, 3, 40, 10);                      // the tan paving
      p.street("asphalt", 3, [[24, 4], [24, 36]]); p.street("asphalt", 3, [[3, 20], [44, 20]]); p.street("asphalt", 3, [[33, 11], [33, 20]]);
      p.building(3, "whiteHall"); p.building(0, "pcSmall");                               // the Museum
      const R = [[78, 78, 88], [70, 72, 80], [84, 82, 90]];
      [[4, 4, 6, 5], [10, 4, 6, 5], [4, 13, 6, 5], [10, 13, 6, 5], [36, 13, 5, 5], [41, 13, 5, 5], [14, 23, 6, 5], [27, 23, 6, 5], [33, 23, 6, 5], [40, 23, 6, 5]].forEach(([x, y, w, h], k) => warehouse(p, x, y, w, h, R[k % 3]));
      p.fill("cobble", 3, 9, 22, 10); p.fill("deck", 16, 5, 21, 9);                        // the cafe terrace
      for (const [x, y, col] of [[17, 6, [240, 240, 236]], [20, 6, [240, 240, 236]], [18, 8, [240, 240, 236]]]) parasol(p, x, y, col);
      hedgeRow(p, 16, 4, 6, 1);
      rails(p, 2, 45, 34, false);                                                        // the old railway
      p.paint(35, (c) => { const px = 3 * T, py = 33 * T; c.rect(px + 6, py, 3, 16, [70, 70, 80]); c.poly([[px - 2, py + 2], [px + 16, py - 6], [px + 17, py - 3], [px - 1, py + 5]], [226, 60, 60]); c.poly([[px - 2, py - 6], [px + 16, py + 2], [px + 15, py + 5], [px - 3, py - 3]], [240, 240, 240]); });
      for (const [x, y] of [[22, 18], [26, 18], [22, 23], [31, 11]]) lamp(p, x, y);
      p.fill("flowersPink", 3, 23, 4, 26);
    },
  },
  // Castelia City: the five piers on the harbour, avenues fanning up between the skyscrapers to the fountain plaza, Route 4 beyond.
  BW1CasteliaCity: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0, rough: false, towers: true },
    plan(p) {
      p.fill("water", 0, 34, 47, 39);                                                    // the harbour
      p.street("brick", 2, [[2, 32], [45, 32]]);                                         // the quay
      p.street("deck", 3, [[24, 33], [24, 38]]); for (const x of [5, 14, 34, 43]) p.street("deck", 2, [[x, 34], [x, 37]]);   // the piers
      boat(p, 8, 35, [200, 60, 60]); boat(p, 17, 34, [240, 240, 244]); boat(p, 28, 35, [60, 110, 190]); boat(p, 37, 34, [240, 200, 80]);
      p.disc("ornate", 24.5, 14.5, 6.2, 5); p.decor("parkFountain", 20, 12); hedgeRow(p, 17, 10, 5, 1); hedgeRow(p, 27, 10, 2, 1);            // the central plaza
      p.street("asphalt", 3, [[24, 4], [24, 10]]); p.street("asphalt", 3, [[24, 18], [24, 32]]);
      p.street("asphalt", 3, [[19, 16], [14, 21], [14, 32]]); p.street("asphalt", 3, [[30, 16], [34, 21], [34, 32]]);
      p.street("asphalt", 3, [[19, 14], [6, 14], [6, 32]]); p.street("asphalt", 3, [[30, 14], [43, 14], [43, 32]]);
      p.street("asphalt", 2, [[33, 11], [33, 14]]);
      p.building(3, "gym"); p.building(0, "pcSmall");
      const tw = (stamp, x, y, r, g, b) => p.decor(stamp, x, y, { canopy: true, tint: r ? p.trim(r, g, b) : null });
      tw("studio", 6, 2); tw("towerSlim", 16, 0, 0.4, 0.6, 1); tw("towerShort", 38, 3, 0.4, 0.9, 0.6);
      tw("towerShort", 9, 17, 1, 0.8, 0.3); tw("brickTall", 17, 21); tw("towerShort", 27, 23, 0.4, 0.6, 1); tw("towerDoor", 37, 17, 0.8, 0.5, 1); tw("brickFlat", 36, 25);
      tw("apartment", 2, 16); tw("apartment", 2, 23); 
      for (const [x, y] of [[22, 20], [26, 20], [22, 28], [26, 28], [12, 31], [16, 31], [32, 31], [36, 31]]) lamp(p, x, y);
    },
  },
  // Nimbasa City (after the game's map): the three domes along the north terrace - Big Stadium, Small Court, Musical Theater -
  // Gear Station in the middle of the paved west half with the apartment blocks and the Center beside it, and the amusement
  // park on the lawns of the east half: the Pikachu balloon, Elesa's Gym and the Ferris wheel at the far end, fountains in
  // the moat below.
  BW1NimbasaCity: {
    theme: { town: true, ground: "paving", road: "cobble", border: "tree", density: 0.02, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("lawn", 27, 2, 45, 18); p.fill("lawn", 27, 23, 45, 30);                      // the park lawns
      p.fill("water", 27, 31, 45, 35);                                                   // the moat
      p.paint(36, (c) => { for (const x of [30, 35, 40, 44]) { const px = x * T, py = 33 * T; c.ellipse(px, py, 9, 6, STONE[2]); c.ellipse(px, py - 1, 7, 4, [150, 210, 250]); c.rect(px - 1, py - 9, 2, 8, [236, 248, 255]); c.ellipse(px, py - 9, 3, 2, [236, 248, 255]); } });
      p.street("cobble", 3, [[24, 4], [24, 36]]); p.street("cobble", 3, [[5, 21], [44, 21]]); p.street("cobble", 2, [[6, 33], [25, 33]]);
      p.street("paving", 3, [[24, 13], [44, 13]]);                                       // the park's paved walk
      p.street("cobble", 2, [[5, 13], [24, 13]]);                                        // the stadium terrace
      p.building(5, "gym", { tint: p.trim(0.75, 0.3, 1.2) }); p.building(0, "pcSmall");
      ferris(p, 38, 9);
      // the Pikachu balloon
      p.block(28, 8, 2, 2); p.paint(10, (c, top) => { const cx = 29 * T, by = 10 * T; c.ellipse(cx, by - 3, 14, 4, [0, 0, 0, 50]); for (const cv of [c, top]) { cv.ellipse(cx, by - 22, 17, 19, [150, 120, 30]); cv.ellipse(cx, by - 23, 15, 17, [250, 220, 70]); cv.poly([[cx - 14, by - 34], [cx - 17, by - 50], [cx - 7, by - 38]], [250, 220, 70]); cv.poly([[cx + 14, by - 34], [cx + 17, by - 50], [cx + 7, by - 38]], [250, 220, 70]); cv.rect(cx - 17, by - 50, 3, 4, [40, 36, 40]); cv.rect(cx + 15, by - 50, 3, 4, [40, 36, 40]); cv.rect(cx - 7, by - 27, 3, 3, [40, 36, 40]); cv.rect(cx + 5, by - 27, 3, 3, [40, 36, 40]); cv.ellipse(cx - 10, by - 19, 3, 3, [236, 90, 80]); cv.ellipse(cx + 10, by - 19, 3, 3, [236, 90, 80]); } });
      dome(p, 3, 4, 8, 7, [70, 130, 210]); dome(p, 12, 5, 5, 6, [170, 200, 214]); dome(p, 18, 5, 5, 6, [214, 90, 170]);   // Big Stadium, Small Court, Musical Theater
      p.paint(11.5, (c) => { const cx = 20.5 * T, cy = 8 * T - 4; c.poly([[cx, cy - 9], [cx + 3, cy - 3], [cx + 9, cy - 3], [cx + 4, cy + 1], [cx + 6, cy + 8], [cx, cy + 4], [cx - 6, cy + 8], [cx - 4, cy + 1], [cx - 9, cy - 3], [cx - 3, cy - 3]], [250, 220, 80]); });
      p.decor("hall", 11, 23);                                                           // Gear Station
      p.paint(31.5, (c) => { const px = 14 * T + 8, py = 30 * T - 20; c.box(px, py, 44, 12, [240, 200, 60], [60, 50, 40]); c.rect(px + 4, py + 4, 36, 4, [60, 50, 40]); });
      p.decor("apartment", 3, 14); p.decor("apartment", 7, 14); p.decor("apartment", 3, 23);   // the apartment blocks
      // the park below the walk: a round flower bed, benches, hedges
      p.disc("flowersRed", 31, 16.5, 1.6); p.decor("bench", 34, 15); p.decor("bench", 36, 15); p.decor("tree1", 44, 15); p.decor("tree1", 41, 23); p.decor("tree1", 36, 26);
      hedgeRow(p, 27, 18, 19, 1); hedgeRow(p, 27, 23, 16, 1); hedgeRow(p, 27, 2, 1, 10);
      for (const [x, y] of [[22, 19], [26, 19], [22, 23], [26, 11], [22, 11], [22, 31], [36, 11], [42, 15], [14, 19]]) lamp(p, x, y);
    },
  },
  // Driftveil City (after the game's map): orange-roofed houses on grey gravel between the forest and the sea, the glass-roofed
  // Market hall, Clay's Gym up on the brown rock, one house on the grassy bluff, the stone tower on the shore and the bridge
  // out over the water. The real bridge leaves to the east and Cold Storage to the south; our gates are fixed the other way.
  BW1DriftveilCity: {
    theme: { town: true, ground: "gravel", road: "paving", border: "tree", water: "sea", density: 0.03, groves: 0, flowers: 0, tree: "tree1", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      const ORANGE = p.roof(2.0, 1.15, 0.35);
      p.fill("water", 0, 35, 47, 39);
      p.fill("rock", 26, 2, 41, 4); p.fill("rock", 26, 5, 28, 9); p.fill("rock", 38, 5, 41, 9);   // the hill the Gym is dug into
      p.fill("lawn", 6, 3, 20, 8); cliff(p, 6, 9, 6, 2); cliff(p, 14, 9, 7, 2); steps(p, 12, 9, 2, 2); p.fill("paving", 12, 9, 13, 10);   // the bluff and its house
      p.decor("peak", 11, 2); p.decor("tree1", 17, 4); p.decor("tree1", 7, 5);
      p.street("paving", 3, [[24, 4], [24, 33]]); p.street("paving", 2, [[4, 20], [44, 20]]); p.street("brick", 2, [[3, 33], [44, 33]]);
      p.street("paving", 2, [[33, 11], [33, 12], [24, 12]]); p.street("paving", 2, [[12, 11], [12, 20]]);
      p.street("steel", 3, [[24, 34], [24, 38]]);                                        // the Driftveil Drawbridge
      p.paint(1.2, (c, top) => { const px = 23 * T, py = 35 * T, ph = 4 * T; c.rect(px, py, 48, ph, [120, 124, 136]); for (let j = 0; j < ph; j += 8) c.rect(px, py + j, 48, 1, [90, 94, 106]); for (const dx of [-4, 46]) { c.rect(px + dx, py - 6, 6, ph + 6, [120, 30, 30]); c.rect(px + dx + 1, py - 6, 3, ph + 6, [214, 60, 60]); for (let j = 0; j < ph; j += 16) { c.line(px + dx, py + j, px + dx + 5, py + j + 8, [250, 150, 140]); } } top.box(px - 8, py - 22, 10, 22, [214, 60, 60], [90, 20, 20]); top.box(px + 46, py - 22, 10, 22, [214, 60, 60], [90, 20, 20]); });
      p.block(22, 34, 1, 1); p.block(26, 34, 1, 1);
      p.building(4, "oreGym"); p.building(0, "pcSmall");
      glasshouse(p, 3, 13, 8, 5); p.fill("paving", 3, 18, 10, 19);                        // the Market hall
      p.decor("gable", 15, 13, { tint: ORANGE }); p.decor("gable", 28, 13, { tint: ORANGE }); p.decor("gable", 39, 12, { tint: ORANGE });
      p.decor("gable", 16, 24, { tint: ORANGE }); p.decor("gable", 28, 24, { tint: ORANGE }); p.decor("gable", 34, 24, { tint: ORANGE });
      p.decor("lighthouse", 43, 27);
      for (const x of [4, 13, 20, 36]) p.decor("barrels", x, 31);
      boat(p, 8, 36, [236, 236, 240]); boat(p, 32, 36, [90, 160, 110]);
      p.decor("tree1", 20, 14); p.decor("tree1", 32, 25); p.decor("tree1", 38, 26); p.decor("tree1", 20, 26);
    },
  },
  // Mistralton City (after the game's map, mirrored east-west because the Center and the gates are fixed): the runway runs
  // north-south with Skyla's hangar Gym at its north end, a column of long greenhouses along its outer edge and a block of
  // six below it; the little town beside it has sand lanes, the cargo office, two red-roofed houses and a pond.
  BW1MistraltonCity: {
    theme: { town: true, ground: "grass", road: "sand", border: "tree", density: 0.06, groves: 0.02, flowers: 0.05, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.fill("runway", 28, 11, 40, 28);                                                  // the runway
      p.paint(1, (c) => { const x0 = 28 * T, x1 = 41 * T, mid = 34.5 * T; for (const [bx, by, bw, bh] of [[x0 + 10, 12 * T, x1 - x0 - 20, 2], [x0 + 10, 28 * T - 2, x1 - x0 - 20, 2], [x0 + 10, 12 * T, 2, 16 * T], [x1 - 12, 12 * T, 2, 16 * T]]) c.rect(bx, by, bw, bh, [240, 240, 240]); for (let y = 15 * T; y < 27 * T; y += 28) c.rect(mid - 2, y, 4, 16, [240, 240, 240]); for (const y of [13 * T, 26 * T - 8]) for (let x = x0 + 24; x < x1 - 24; x += 12) if (Math.abs(x + 3 - mid) > 14) c.rect(x, y, 6, 20, [240, 240, 240]); });
      // the cargo plane
      p.block(33, 14, 4, 6); p.paint(20, (c) => { const cx = 35 * T, y0 = 14 * T; c.ellipse(cx + 4, y0 + 52, 16, 46, [0, 0, 0, 50]); c.poly([[cx - 60, y0 + 46], [cx, y0 + 26], [cx + 60, y0 + 46], [cx + 60, y0 + 56], [cx, y0 + 46], [cx - 60, y0 + 56]], [200, 204, 214]); c.poly([[cx - 22, y0 + 88], [cx, y0 + 78], [cx + 22, y0 + 88], [cx + 22, y0 + 94], [cx - 22, y0 + 94]], [200, 204, 214]); c.ellipse(cx, y0 + 48, 9, 46, [70, 76, 96]); c.ellipse(cx, y0 + 48, 8, 45, [240, 242, 248]); c.rect(cx - 2, y0 + 20, 4, 70, [90, 130, 200]); c.ellipse(cx, y0 + 12, 5, 6, [110, 170, 220]); for (const dx of [-36, 36]) c.box(cx + dx - 4, y0 + 36, 8, 14, [110, 116, 130], [50, 54, 70]); });
      p.building(3, "whiteHall"); p.building(0, "pcSmall");
      for (let y = 3; y <= 27; y += 4) glasshouse(p, 42, y, 3, 3);                        // the long greenhouses down the edge
      for (const x of [28, 34]) for (const y of [30, 32, 34]) glasshouse(p, x, y, 5, 2);  // the block of six
      fence(p, 27, 11, 1, 6); fence(p, 27, 23, 1, 6);
      p.street("sand", 3, [[24, 4], [24, 33]]); p.street("sand", 2, [[20, 34], [20, 37], [28, 37], [28, 34]]);
      p.street("sand", 2, [[24, 20], [8, 20]]); p.street("sand", 2, [[8, 32], [8, 33], [24, 33]]); p.street("sand", 2, [[24, 20], [27, 20]]);
      p.fill("rock", 12, 36, 18, 37); p.fill("rock", 30, 36, 36, 37);
      p.decor("flat", 14, 13);                                                           // the cargo office
      p.decor("gable", 8, 12, { tint: p.roof(1.7, 0.55, 0.75) }); p.decor("gable", 15, 24, { tint: p.roof(1.7, 0.55, 0.75) });
      p.disc("water", 14, 31.5, 2.6, 1.6); p.disc("water", 18, 30.5, 2, 1.3);            // the pond by the Center
      cliff(p, 3, 9, 14, 1); cliff(p, 26, 9, 1, 1);
      p.fill("flowersPink", 11, 22, 12, 23); p.decor("board", 21, 18);
    },
  },
  // Icirrus City (after the game's map, in its winter coat): the town on the upper ground - Brycen's Gym, the Fan Club and
  // two more grey-roofed houses along the dirt lane - and below the ledges and their steps the marsh lake, crossed by a
  // plank bridge, with the two stone windmills and the house on its shore. Dragonspiral Tower is not in the town itself.
  BW1IcirrusCity: {
    theme: { town: true, ground: "frost", road: "dirt", border: "pine", water: "bog", density: 0.07, groves: 0.03, flowers: 0, tree: "tree1", treeTint: "frost", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.disc("marsh", 35.5, 27, 10, 4.6);                                                // the moor round the lake
      p.disc("water", 35, 27, 8, 2.4); p.disc("water", 41, 26.5, 3, 2.6); p.disc("water", 29, 27.5, 2.6, 1.8);
      p.street("dirt", 3, [[24, 4], [24, 33]]); p.street("dirt", 2, [[20, 34], [20, 37], [28, 37], [28, 34]]); p.street("dirt", 2, [[6, 33], [36, 33]]);
      p.street("dirt", 2, [[33, 11], [33, 12], [24, 12]]); p.street("dirt", 2, [[12, 12], [24, 12]]); p.street("dirt", 2, [[35, 12], [35, 21]]);
      p.street("dirt", 2, [[24, 21], [44, 21]]); p.street("deck", 2, [[35, 22], [35, 33]]);   // the plank bridge over the lake
      cliff(p, 2, 17, 21, 2); cliff(p, 26, 17, 9, 2); cliff(p, 37, 17, 9, 2); steps(p, 23, 17, 3, 2); steps(p, 35, 17, 2, 2);   // the ledges
      p.fill("rock", 12, 36, 18, 37); p.fill("rock", 30, 36, 36, 37);
      p.building(4, "snowGym"); p.building(0, "snowCenter");
      windmill(p, 40, 24, [176, 168, 150], [96, 84, 70]); windmill(p, 28, 31, [176, 168, 150], [96, 84, 70]);
      p.decor("logHouse", 9, 5); p.decor("cabin", 39, 4); p.decor("cabin", 14, 13); p.decor("cabin", 40, 29);
      for (const [x, y] of [[22, 15], [26, 15]]) lamp(p, x, y);
    },
  },
  // Opelucid City (as Black shows it, after the game's map): pale teal pavements and grey roads, square glass blocks in
  // columns down both edges, long white-domed capsules in the middle, and Drayden's Gym on its tan court.
  BW1OpelucidCity: {
    theme: { town: true, ground: "frost", road: "asphalt", border: "tree", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      p.street("asphalt", 3, [[24, 4], [24, 36]]); p.street("asphalt", 3, [[4, 20], [44, 20]]); p.street("asphalt", 2, [[6, 33], [42, 33]]); p.street("asphalt", 2, [[11, 12], [42, 12]]);
      p.street("asphalt", 2, [[11, 12], [11, 33]]); p.street("asphalt", 2, [[37, 12], [37, 33]]);
      p.fill("cobble", 28, 3, 39, 11);                                                   // the Gym's court
      p.building(4, "gym", { tint: p.trim(0.45, 0.45, 0.5) }); p.building(0, "centerRed");
      const TEAL = [[226, 248, 244], [170, 226, 218], [118, 186, 184], [62, 120, 126]];
      // a square glass block: a lit roof panel inside a rim, a wall with a door
      const cube = (x, y, w, h) => { p.block(x, y, w, h); p.paint(y + h, (c, top) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.box(px, py + ph - 18, pw, 18, TEAL[2], TEAL[3]); for (let i = 5; i < pw - 6; i += 9) c.rect(px + i, py + ph - 13, 5, 6, TEAL[0]); c.box(px + pw / 2 - 5, py + ph - 11, 10, 11, [70, 150, 170], TEAL[3]); for (const cv of [c, top]) { cv.box(px, py - 8, pw, ph - 9, TEAL[1], TEAL[3]); cv.box(px + 5, py - 3, pw - 10, ph - 19, TEAL[0], TEAL[2]); cv.rect(px + 8, py, pw - 16, 2, [255, 255, 255]); } }); };
      // a long capsule under a white dome
      const capsule = (x, y, w, h) => { p.block(x, y, w, h); p.paint(y + h, (c, top) => { const px = x * T, py = y * T, pw = w * T, ph = h * T; c.box(px + 1, py + ph - 16, pw - 2, 16, TEAL[2], TEAL[3]); for (let i = 5; i < pw - 6; i += 8) c.rect(px + i, py + ph - 11, 4, 5, TEAL[3]); for (const cv of [c, top]) { cv.box(px + 1, py + 2, pw - 2, ph - 18, TEAL[3], TEAL[3]); cv.ellipse(px + pw / 2, py + 4, pw / 2 - 1, 12, TEAL[3]); cv.ellipse(px + pw / 2, py + ph - 18, pw / 2 - 1, 8, TEAL[3]); cv.rect(px + 2, py + 3, pw - 4, ph - 20, TEAL[1]); cv.ellipse(px + pw / 2, py + 5, pw / 2 - 2, 11, TEAL[1]); cv.ellipse(px + pw / 2, py + ph - 19, pw / 2 - 2, 7, TEAL[1]); cv.ellipse(px + pw / 2, py + (ph - 16) / 2, pw / 2 - 8, (ph - 16) / 2 - 4, [246, 252, 250]); } }); };
      [[4, 4, 5, 4], [4, 9, 5, 4], [4, 14, 5, 4], [4, 23, 5, 3], [41, 4, 5, 4], [41, 9, 5, 4], [41, 14, 5, 4], [41, 23, 5, 4], [41, 28, 5, 4], [14, 5, 4, 5], [19, 5, 4, 5]].forEach(([x, y, w, h]) => cube(x, y, w, h));
      [[14, 14, 4, 5], [18, 14, 4, 5], [27, 14, 4, 5], [31, 14, 5, 5], [14, 23, 4, 8], [18, 23, 4, 8], [27, 23, 4, 8], [32, 23, 4, 8]].forEach(([x, y, w, h]) => capsule(x, y, w, h));
      for (let x = 13; x <= 37; x += 6) if (x < 22 || x > 27) cube(x, 35, 4, 2);          // the row of blocks along the south side
    },
  },
  // The Pokémon League (forecourt after the game's map: bare tan ground between brown crags, ledges either side of the way in):
  // the round court with its statue, four ways up to the Elite Four's towers, and N's Castle risen behind them.
  BW1PokemonLeague: {
    theme: { town: true, ground: "sand", road: "cobble", border: "rock", density: 0.015, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      cliff(p, 12, 30, 9, 1); cliff(p, 28, 30, 18, 1); p.decor("board", 21, 30); p.decor("board", 27, 30);   // the ledges either side of the way in, and its two signs
      p.disc("ornate", 24.5, 21.5, 7.5, 6.5);                                            // the court
      p.street("cobble", 3, [[24, 15], [24, 5]]);                                        // up to the castle
      p.street("cobble", 2, [[19, 17], [8, 12], [8, 9]]); p.street("cobble", 2, [[22, 15], [18, 12], [18, 9]]); p.street("cobble", 2, [[27, 15], [28, 12], [28, 9]]); p.street("cobble", 2, [[30, 17], [38, 12], [38, 9]]);
      p.street("cobble", 3, [[24, 28], [24, 33]]); p.street("cobble", 2, [[20, 34], [20, 37], [28, 37], [28, 34]]); p.street("cobble", 2, [[8, 32], [8, 33], [24, 33]]);
      p.fill("rock", 10, 36, 18, 37); p.fill("rock", 30, 36, 38, 37);
      p.building(0, "pcSmall");
      eliteTower(p, 8, 8, [150, 110, 200]); eliteTower(p, 18, 8, [70, 70, 110]); eliteTower(p, 28, 8, [240, 150, 190]); eliteTower(p, 38, 8, [226, 140, 60]);
      for (const k of [2, 3, 4, 5, 6]) p.bare(k);                                         // their doorways are drawn with the towers and the castle
      // N's Castle
      p.block(20, 2, 4, 3); p.block(25, 2, 4, 3); p.block(24, 2, 1, 2);
      p.paint(5, (c) => { const px = 20 * T, by = 5 * T, pw = 9 * T; c.rect(px, by - 76, pw, 76, [30, 30, 44]); c.rect(px + 1, by - 75, pw - 2, 74, [84, 88, 120]); for (let i = 0; i < pw; i += 16) c.rect(px + i, by - 80, 10, 6, [84, 88, 120]); for (const dx of [0, pw - 22]) { c.rect(px + dx, 0, 22, by, [30, 30, 44]); c.rect(px + dx + 1, 0, 20, by - 1, [110, 116, 156]); c.rect(px + dx + 8, 14, 6, 14, [240, 220, 120]); c.rect(px + dx + 8, 40, 6, 14, [240, 220, 120]); } c.poly([[px + 52, by], [px + 52, by - 34], [px + 72, by - 50], [px + 92, by - 34], [px + 92, by]], [226, 196, 96]); c.poly([[px + 58, by], [px + 58, by - 30], [px + 72, by - 42], [px + 86, by - 30], [px + 86, by]], [24, 22, 34]); c.ellipse(px + 72, by - 62, 8, 8, [70, 150, 230]); c.ellipse(px + 72, by - 62, 4, 4, [200, 236, 255]); });
      p.block(24, 21, 1, 1); p.paint(22, (c, top) => { const px = 24 * T, py = 21 * T; c.ellipse(px + 8, py + 10, 12, 6, STONE[2]); c.ellipse(px + 8, py + 8, 10, 5, STONE[0]); c.rect(px + 4, py - 10, 8, 18, [226, 196, 96]); top.rect(px + 4, py - 16, 8, 8, [226, 196, 96]); top.ellipse(px + 8, py - 20, 5, 5, [240, 220, 130]); top.poly([[px - 4, py - 8], [px + 4, py - 14], [px + 4, py - 6]], [226, 196, 96]); top.poly([[px + 20, py - 8], [px + 12, py - 14], [px + 12, py - 6]], [226, 196, 96]); });
      for (const y of [7, 10, 13]) { statue(p, 22, y); statue(p, 26, y); }
      for (const [x, y] of [[16, 19], [33, 19], [16, 24], [33, 24]]) lamp(p, x, y);
    },
  },
  // Lacunosa Town (after the game's map): a small town of pale stone terraces joined by flights of steps, flat-roofed houses
  // with roof gardens, clipped trees in rows, and the dark cobbled road along the lowest level. (The real town has parapets,
  // not castle walls or towers.)
  BW1LacunosaTown: {
    theme: { town: true, ground: "paving", road: "asphalt", border: "tree", density: 0, groves: 0, flowers: 0, tree: "hedge", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      wall(p, 3, 2, 43, 1); wall(p, 3, 36, 43, 1);                                         // the parapets north and south
      p.street("asphalt", 3, [[4, 20], [44, 20]]); p.street("asphalt", 3, [[24, 21], [24, 33]]); p.street("asphalt", 2, [[6, 33], [42, 33]]);   // the cobbled road
      wall(p, 3, 14, 19, 2); wall(p, 27, 14, 19, 2); steps(p, 22, 14, 5, 2);              // the middle terrace
      wall(p, 30, 8, 16, 1); steps(p, 27, 8, 3, 1); wall(p, 26, 3, 1, 6);                  // the top terrace in the north-east
      wall(p, 12, 24, 1, 8); wall(p, 3, 26, 3, 1); steps(p, 6, 26, 3, 1); wall(p, 9, 26, 3, 1);   // the Center's corner, a few steps down
      p.building(0, "pcSmall");
      p.decor("flat", 5, 7); p.decor("flat", 14, 7); p.decor("flat", 36, 2); p.decor("flat", 30, 10);
      p.decor("flat", 14, 24); p.decor("flat", 29, 24); p.decor("flat", 37, 24);
      hedgeRow(p, 12, 6, 1, 6); hedgeRow(p, 21, 6, 1, 6); hedgeRow(p, 44, 10, 1, 4); hedgeRow(p, 36, 26, 1, 4); hedgeRow(p, 44, 24, 1, 6); hedgeRow(p, 21, 25, 1, 5);
      p.decor("bench", 16, 34); p.decor("bench", 32, 34); hedgeRow(p, 18, 35, 3, 1); hedgeRow(p, 34, 35, 3, 1);
      for (const [x, y] of [[21, 18], [28, 18], [21, 23], [28, 23]]) lamp(p, x, y);
    },
  },
  // Undella Town (after the game's map): flat-roofed summer villas on a pale stone terrace, steps down to the beach with its
  // cream parasols, and Undella Bay filling the south-east.
  BW1UndellaTown: {
    theme: { town: true, ground: "sand", road: "paving", border: "rock", water: "sea", density: 0, groves: 0, flowers: 0, tree: "boulder", autoHouses: false, turn: 6, wander: 0, rough: false },
    plan(p) {
      p.fill("paving", 3, 3, 45, 22);                                                    // the pale stone terrace the villas stand on
      p.fill("beach", 2, 23, 45, 37);                                                    // the beach
      p.fill("water", 0, 36, 47, 39); p.disc("water", 41, 35, 14, 5.5); p.disc("water", 30, 38, 12, 4);   // Undella Bay
      p.street("paving", 3, [[4, 20], [44, 20]]);                                        // Route 13 - Route 14
      wall(p, 2, 23, 8, 1); wall(p, 13, 23, 9, 1); wall(p, 26, 23, 9, 1); wall(p, 39, 23, 7, 1);   // the sea wall, with steps down
      steps(p, 10, 23, 3, 1); steps(p, 23, 22, 4, 1); steps(p, 35, 23, 4, 1);
      p.street("paving", 2, [[11, 15], [11, 19]]); p.street("paving", 2, [[19, 15], [19, 19]]); p.street("paving", 2, [[32, 15], [32, 19]]); p.street("paving", 2, [[42, 12], [42, 19]]);
      p.building(0, "pcSmall");
      p.decor("flat", 8, 10); p.decor("flat", 16, 10); p.decor("flat", 29, 10); p.decor("flat", 5, 3); p.decor("flat", 39, 7); p.decor("flat", 22, 3);
      for (const [x, y] of [[14, 26], [18, 29], [27, 25], [31, 28], [36, 26], [13, 31]]) parasol(p, x, y, [240, 230, 204]);   // cream beach parasols
      p.fill("palms", 15, 17, 15, 17); p.fill("palms", 22, 17, 22, 17); p.fill("palms", 28, 17, 28, 17); p.fill("palms", 36, 17, 36, 17);   // the potted palms
    },
  },
  // Black City: a wall of dark towers along neon streets.
  BW1BlackCity: {
    theme: { town: true, ground: "darkpave", road: "neon", border: "rock", density: 0, groves: 0, flowers: 0, tree: "barrels", autoHouses: false, turn: 6, wander: 0, towers: true },
    plan(p) {
      p.street("neon", 3, [[4, 20], [44, 20]]); p.street("neon", 3, [[24, 5], [24, 34]]); p.street("neon", 2, [[12, 9], [12, 33]]); p.street("neon", 2, [[36, 9], [36, 33]]);
      p.street("neon", 2, [[3, 9], [44, 9]]); p.street("neon", 2, [[3, 33], [44, 33]]);
      p.building(0, "centerBlue");
      const dark = ([R, G, B]) => [Math.round(R * 0.5), Math.round(G * 0.52), Math.round(B * 0.7)];
      const tw = (stamp, x, y, r, g, b) => { const t = p.trim(r, g, b); p.decor(stamp, x, y, { canopy: true, tint: (col) => { const o = t(col); return o[0] !== col[0] || o[1] !== col[1] || o[2] !== col[2] ? o : dark(col); } }); };
      tw("towerSlim", 3, 5, 0.3, 0.9, 1); tw("towerShort", 7, 10, 1, 0.3, 0.9); tw("brickTall", 14, 9, 1, 0.9, 0.2); tw("towerDoor", 18, 10, 0.3, 0.9, 1); tw("towerDoor2", 26, 10, 1, 0.3, 0.9); tw("towerSlim", 31, 5, 0.4, 1, 0.5); tw("towerShort", 38, 10, 0.3, 0.9, 1); tw("brickTall", 42, 9, 1, 0.9, 0.2);
      tw("brickTall", 14, 22, 1, 0.3, 0.9); tw("towerShort", 18, 23, 0.4, 1, 0.5); tw("towerDoor", 26, 23, 1, 0.9, 0.2); tw("towerShort", 31, 23, 0.3, 0.9, 1); tw("brickFlat", 38, 25, 1, 0.3, 0.9); tw("apartment", 43, 26, 1, 1, 1); 
      tw("brickFlat", 3, 2, 0.3, 0.9, 1); tw("apartment", 9, 2, 1, 1, 1); tw("brickFlat", 15, 2, 1, 0.3, 0.9); tw("brickFlat", 27, 2, 0.4, 1, 0.5); tw("apartment", 33, 2, 1, 1, 1); tw("brickFlat", 39, 2, 1, 0.9, 0.2);
      // neon: kerb lights along the avenues and signs on the towers
      const N = [[250, 80, 200], [80, 230, 250], [250, 230, 80], [120, 250, 140]];
      p.paint(1, (c) => { for (let x = 3 * T; x < 45 * T; x += 10) { c.rect(x, 19 * T, 5, 2, N[0]); c.rect(x, 22 * T - 2, 5, 2, N[1]); } for (let y = 5 * T; y < 35 * T; y += 10) { c.rect(23 * T, y, 2, 5, N[2]); c.rect(26 * T - 2, y, 2, 5, N[2]); } const cx = 24.5 * T, cy = 20.5 * T; c.ellipse(cx, cy, 30, 30, N[0], 2); c.ellipse(cx, cy, 20, 20, N[1], 2); });
      [[4, 14, 0], [15, 13, 1], [19, 14, 2], [27, 15, 3], [32, 12, 0], [39, 14, 1], [43, 13, 2], [15, 26, 3], [19, 27, 0], [27, 27, 1], [32, 27, 2], [39, 27, 3], [8, 14, 3]].forEach(([x, y, k]) => p.paint(y + 6, (c, top) => { const px = x * T, py = y * T; top.box(px, py, 30, 10, [20, 16, 34], N[k]); for (let i = 3; i < 26; i += 6) top.rect(px + i, py + 3, 4, 4, N[(k + (i >> 2)) % 4]); }));
    },
  },
  // White Forest: log houses under giant trees, vegetable plots, and a brook through the clearing.
  BW1WhiteForest: {
    theme: { town: true, ground: "meadow", road: "dirt", border: "tree", water: "water", density: 0.12, groves: 0.06, flowers: 0.25, tree: "tree1", autoHouses: false, turn: 3, wander: 0.6 },
    plan(p) {
      p.fill("water", 34, 2, 35, 27); p.disc("water", 33, 30, 4.5, 3.2);                  // the brook and its pool
      p.street("dirt", 2, [[4, 20], [44, 20]]);                                          // the forest road
      p.street("dirt", 2, [[8, 32], [8, 33], [24, 33], [24, 21]]); p.street("dirt", 2, [[14, 20], [14, 14]]); p.street("dirt", 2, [[24, 20], [24, 12]]); p.street("dirt", 2, [[40, 20], [40, 15]]); p.street("dirt", 2, [[40, 21], [40, 28]]);
      p.building(0, "pcSmall");
      p.decor("logHouse", 13, 8); p.decor("logHouse", 23, 6); p.decor("cabin", 39, 10); p.decor("logHouse", 38, 23); p.decor("cabin", 13, 24);
      for (const [x, y] of [[5, 9], [19, 15], [29, 12], [43, 6], [5, 26], [19, 30], [28, 26], [10, 16], [38, 34], [30, 4]]) bigTree(p, x, y);
      p.fill("field", 16, 35, 22, 36); p.fill("field", 5, 12, 9, 14);
      p.paint(2, (c) => { for (const [x0, y0, x1, y1] of [[16, 35, 22, 36], [5, 12, 9, 14]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { c.rect(x * T, y * T + 3, 16, 2, [120, 90, 60, 120]); c.rect(x * T + 5, y * T + 8, 5, 5, (x + y) % 3 ? [70, 150, 70] : [226, 120, 60]); } });
      fence(p, 15, 34, 9, 1); fence(p, 4, 11, 7, 1);
      p.fill("flowersPink", 27, 15, 31, 17); p.fill("flowersBlue", 17, 22, 20, 23); p.fill("flowersRed", 37, 17, 38, 18);
    },
  },
  // Anville Town (after the game's map): the grey stone roundhouse with its fan of tracks down to the turntable, the stone
  // footbridge below it with steps to the station platform where the train from Nimbasa stands, and three violet-roofed
  // houses on the green to the east.
  BW1AnvilleTown: {
    theme: { town: true, ground: "grass", road: "gravel", border: "tree", density: 0.1, groves: 0.05, flowers: 0.08, tree: "tree1", autoHouses: false, turn: 6, wander: 0 },
    plan(p) {
      const VIOLET = p.roof(0.8, 0.75, 1.9), TX = 15.5, TY = 13.5;
      p.fill("sand", 3, 7, 27, 18);                                                      // the yard
      // the roundhouse and its fan of tracks
      p.block(4, 2, 23, 5); p.paint(7, (c) => { const px = 4 * T, py = 2 * T, pw = 23 * T, ph = 5 * T; c.box(px, py - 12, pw, ph + 12, [120, 118, 122], [50, 50, 56]); c.rect(px + 1, py - 11, pw - 2, 18, [150, 148, 152]); for (let i = 10; i < pw - 20; i += 26) c.box(px + i, py - 6, 14, 8, [96, 96, 104], [50, 50, 56]); for (let k = 0; k < 5; k++) { const dx = px + 28 + k * 72; c.box(dx - 22, py + 30, 44, ph - 30, [40, 38, 44], [50, 50, 56]); c.ellipse(dx, py + 30, 22, 16, [40, 38, 44]); c.ellipse(dx, py + 30, 22, 16, [176, 174, 178], 2); } });
      p.paint(1.5, (c) => { const cx = TX * T, cy = TY * T; for (let k = 0; k < 5; k++) { const dx = 4 * T + 28 + k * 72, dy = 7 * T, n = Math.hypot(cx - dx, cy - dy), ux = (cx - dx) / n, uy = (cy - dy) / n; for (let t = 0; t < n - 60; t += 7) c.line(dx + ux * t - uy * 9, dy + uy * t + ux * 9, dx + ux * t + uy * 9, dy + uy * t - ux * 9, [96, 70, 52], 2); for (const o of [-5, 5]) c.line(dx - uy * o, dy + ux * o, dx + ux * (n - 60) - uy * o, dy + uy * (n - 60) + ux * o, [200, 204, 214], 2); } });
      // the turntable, a train standing on it
      p.block(12, 10, 8, 8); p.paint(18, (c) => { const cx = TX * T + 8, cy = TY * T + 8; c.ellipse(cx, cy, 62, 62, [60, 56, 60]); c.ellipse(cx, cy, 58, 58, [150, 146, 150]); c.ellipse(cx, cy, 52, 52, [96, 92, 96]); c.box(cx - 30, cy - 8, 60, 50, [200, 70, 60], [90, 30, 30]); c.box(cx - 17, cy - 40, 34, 78, [206, 206, 196], [60, 60, 70]); c.rect(cx - 14, cy - 36, 28, 40, [226, 226, 216]); c.rect(cx - 13, cy + 18, 26, 10, [60, 70, 100]); c.rect(cx - 13, cy + 30, 26, 4, [240, 200, 80]); });
      // the stone footbridge, the platform below it and the line to Nimbasa
      p.street("cobble", 3, [[4, 20], [30, 20]]);
      p.paint(1.6, (c) => { const px = 3 * T, pw = 20 * T; c.rect(px, 19 * T - 3, pw, 4, STONE[3]); c.rect(px, 19 * T - 2, pw, 2, STONE[0]); c.rect(px, 22 * T - 1, pw, 4, STONE[3]); c.rect(px, 22 * T, pw, 2, STONE[0]); });
      p.fill("paving", 3, 25, 11, 34); steps(p, 5, 22, 3, 3); p.fill("paving", 5, 22, 7, 24);
      p.block(13, 23, 3, 13); p.paint(36, (c) => { const px = 13 * T, py = 23 * T, ph = 13 * T; c.rect(px + 4, py, 40, ph, [120, 112, 104]); for (let j = 1; j < ph; j += 6) c.rect(px + 6, py + j, 36, 3, [96, 70, 52]); c.rect(px + 12, py, 2, ph, [200, 204, 214]); c.rect(px + 34, py, 2, ph, [200, 204, 214]); c.box(px + 7, py + 30, 34, ph - 44, [206, 206, 196], [60, 60, 70]); c.rect(px + 10, py + 34, 28, ph - 70, [226, 226, 216]); c.rect(px + 10, py + 36, 28, 8, [60, 70, 100]); for (let j = 60; j < ph - 30; j += 26) c.rect(px + 9, py + j, 30, 2, [150, 150, 144]); });
      p.block(12, 26, 1, 8); p.paint(34, (c) => { c.rect(12 * T + 10, 26 * T, 5, 8 * T, [240, 200, 60]); });
      p.decor("bench", 5, 28); p.decor("bench", 5, 31); p.decor("board", 9, 25);
      // the houses
      p.decor("gable", 34, 10, { tint: VIOLET }); p.decor("gable", 30, 24, { tint: VIOLET }); p.decor("gable", 39, 24, { tint: VIOLET });
      p.street("gravel", 2, [[30, 20], [36, 20], [36, 17]]); p.street("gravel", 2, [[24, 21], [24, 31], [41, 31]]);
      p.decor("hedge", 33, 14); p.decor("hedge", 33, 15); p.decor("hedge", 29, 28); p.decor("hedge", 29, 29); p.decor("hedge", 43, 28); p.decor("hedge", 43, 29);
      cliff(p, 20, 34, 26, 2); fence(p, 28, 7, 1, 10); fence(p, 31, 32, 4, 1); fence(p, 37, 32, 4, 1);
    },
  },
};
