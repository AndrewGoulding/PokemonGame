// Unova interiors (Black 2 / White 2): the Gyms, the League, and the story rooms. See README.md, "Rooms".
// These rooms keep the game's own walkable shape, so a plan here re-floors the room, repaints its walls,
// redraws its fixtures, and stands a few props on free floor (never on a kept tile, never across a way through).
"use strict";
const S = 16;
const A = (c, a) => [c[0], c[1], c[2], a];
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));
const dk = (c, t = 0.3) => mix(c, [0, 0, 0], t), lt = (c, t = 0.3) => mix(c, [255, 255, 255], t);
const WHITE = [246, 246, 250], INK = [34, 32, 44], GOLD = [232, 196, 84], WOOD = [156, 108, 66], STEEL = [150, 158, 176], RED = [206, 60, 60];
const hsh = (x, y, s = 1) => { const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const frame = (c, x, y, w, h, col, t = 1) => { c.rect(x, y, w, t, col); c.rect(x, y + h - t, w, t, col); c.rect(x, y + t, t, h - 2 * t, col); c.rect(x + w - t, y + t, t, h - 2 * t, col); };
let TOP_PASS = false;
const glow = (c, cx, cy, r, col, a = 30) => { if (TOP_PASS) return; for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); };
const shade = (c, X, Y, W, H) => c.rect(X + 2, Y + H - 2, W - 2, 3, [0, 0, 0, 56]);

// ---------------------------------------------------------------- floor tiles: (c, X, Y, x, y) paints one tile
const T = {
  check: (a, b, n = 1) => (c, X, Y, x, y) => { const k = ((Math.floor(x / n) + Math.floor(y / n)) & 1) ? b : a; c.rect(X, Y, S, S, k); c.rect(X, Y, S, 1, lt(k, 0.14)); c.rect(X, Y + 15, S, 1, dk(k, 0.1)); },
  plank: (col, n = 8) => (c, X, Y, x, y) => { for (let r = 0; r < S; r += n) { const row = y * (S / n) + r / n, f = 0.9 + hsh(x >> 1, row, 5) * 0.16, k = col.map((v) => Math.min(255, v * f)); c.rect(X, Y + r, S, n, k); c.rect(X, Y + r + n - 1, S, 1, dk(col, 0.28)); if ((x + row * 3) % 5 === 0) c.rect(X + 7, Y + r, 1, n - 1, dk(col, 0.28)); } },
  slab: (col, seed = 2) => (c, X, Y, x, y) => { const k = mix(col, hsh(x, y, seed) > 0.5 ? [255, 255, 255] : [0, 0, 0], hsh(x, y, seed + 1) * 0.09); c.rect(X, Y, S, S, k); c.rect(X, Y, S, 1, lt(k, 0.16)); c.rect(X, Y, 1, S, lt(k, 0.1)); c.rect(X, Y + 15, S, 1, dk(k, 0.22)); c.rect(X + 15, Y, 1, S, dk(k, 0.16)); },
  plate: (col) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); c.rect(X, Y, S, 1, lt(col, 0.22)); c.rect(X, Y + 15, S, 1, dk(col, 0.25)); c.rect(X + 15, Y, 1, S, dk(col, 0.2)); if ((x + y) & 1) { c.p(X + 2, Y + 2, dk(col, 0.35)); c.p(X + 13, Y + 13, dk(col, 0.35)); } else { for (let k = 3; k < 13; k += 3) c.rect(X + k, Y + 6, 2, 1, lt(col, 0.12)); } },
  carpet: (col) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); for (let k = 0; k < 6; k++) c.p(X + Math.floor(hsh(x, y, k) * 16), Y + Math.floor(hsh(y, x, k + 9) * 16), k & 1 ? lt(col, 0.12) : dk(col, 0.12)); },
  dirt: (col, seed = 4) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); for (let k = 0; k < 9; k++) { const px = X + Math.floor(hsh(x, y, seed + k) * 15), py = Y + Math.floor(hsh(y, x, seed + k + 20) * 15); c.rect(px, py, k % 3 === 0 ? 2 : 1, 1, k & 1 ? lt(col, 0.14) : dk(col, 0.2)); } },
  grass: (col = [104, 176, 96]) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, (x + y) & 1 ? col : lt(col, 0.06)); for (let k = 0; k < 4; k++) { const px = X + 1 + Math.floor(hsh(x, y, k) * 13), py = Y + 2 + Math.floor(hsh(y, x, k + 7) * 12); c.rect(px, py, 1, 2, dk(col, 0.2)); c.p(px + 1, py - 1, lt(col, 0.25)); } },
  hex: (col) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); const d = dk(col, 0.22), l = lt(col, 0.3); for (const [ox, oy] of [[0, 0], [8, 8]]) { c.rect(X + ox + 2, Y + oy, 5, 1, d); c.rect(X + ox + 2, Y + oy + 7, 5, 1, d); c.line(X + ox, Y + oy + 4, X + ox + 2, Y + oy, d); c.line(X + ox, Y + oy + 4, X + ox + 2, Y + oy + 7, d); c.line(X + ox + 7, Y + oy, X + ox + 8, Y + oy + 3, d); c.rect(X + ox + 3, Y + oy + 2, 2, 1, l); } },
  water: (col = [60, 132, 206]) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); for (let j = 0; j < S; j += 4) { const o = Math.floor(hsh(x, y * 4 + j, 3) * 12); c.rect(X + o, Y + j + 1, 4, 1, lt(col, 0.3)); if (hsh(x + j, y, 8) > 0.6) c.rect(X + ((o + 8) & 15), Y + j + 3, 3, 1, dk(col, 0.16)); } },
  marble: (col) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, col); c.rect(X, Y, S, 1, lt(col, 0.2)); c.rect(X, Y, 1, S, lt(col, 0.2)); const o = Math.floor(hsh(x, y, 6) * 9); c.line(X + o, Y + 2, X + o + 5, Y + 13, dk(col, 0.1)); },
};

// ---------------------------------------------------------------- props: (c, X, Y, W, H, ...) in pixels, bottom of the box is the base
const BOOKS = [[196, 70, 64], [70, 110, 190], [84, 160, 100], [226, 190, 80], [150, 96, 180], [220, 130, 70], [236, 232, 220]];
const P = {
  bookcase: (c, X, Y, W, H, wood = [124, 84, 54]) => { shade(c, X, Y, W, H); c.box(X, Y, W, H - 1, wood, dk(wood, 0.5)); c.rect(X + 1, Y + 1, W - 2, 2, lt(wood, 0.25)); for (let sy = Y + 4; sy + 9 <= Y + H - 2; sy += 10) { c.rect(X + 2, sy, W - 4, 8, dk(wood, 0.62)); for (let bx = X + 2; bx < X + W - 4;) { const k = hsh(bx, sy, 3), bw = 2 + (k > 0.6 ? 1 : 0), bh = 5 + Math.floor(k * 3); if (k > 0.08) c.rect(bx, sy + 8 - bh, bw, bh, BOOKS[Math.floor(k * 97) % BOOKS.length]); bx += bw + 1; } } },
  table: (c, X, Y, W, H, col = WOOD) => { shade(c, X, Y, W, H); c.rect(X + 2, Y + H - 6, 3, 5, dk(col, 0.45)); c.rect(X + W - 5, Y + H - 6, 3, 5, dk(col, 0.45)); c.box(X + 1, Y + 3, W - 2, H - 8, col, dk(col, 0.5)); c.rect(X + 2, Y + 4, W - 4, 2, lt(col, 0.25)); c.rect(X + 1, Y + H - 7, W - 2, 3, dk(col, 0.25)); },
  cloth: (c, X, Y, W, H, col = WHITE) => { P.table(c, X, Y, W, H, [150, 104, 70]); c.box(X + 2, Y + 3, W - 4, H - 9, col, dk(col, 0.25)); c.ellipse(X + W / 2, Y + H / 2 - 2, 3, 2, [226, 120, 110]); c.ellipse(X + W / 2 - 8, Y + H / 2 - 1, 3, 2, WHITE); c.ellipse(X + W / 2 + 8, Y + H / 2 - 1, 3, 2, WHITE); },
  chair: (c, X, Y, col = WOOD) => { c.box(X + 3, Y + 2, 10, 6, col, dk(col, 0.5)); c.box(X + 3, Y + 8, 10, 5, lt(col, 0.2), dk(col, 0.5)); c.rect(X + 3, Y + 13, 2, 2, dk(col, 0.5)); c.rect(X + 11, Y + 13, 2, 2, dk(col, 0.5)); },
  desk: (c, X, Y, W, H, col = WOOD) => { P.table(c, X, Y, W, H, col); c.box(X + W / 2 - 6, Y - 4, 12, 10, [50, 54, 70], INK); c.rect(X + W / 2 - 4, Y - 2, 8, 6, [110, 190, 236]); c.rect(X + W / 2 - 2, Y + 6, 4, 2, [90, 94, 110]); c.rect(X + 4, Y + 6, 6, 4, WHITE); },
  bed: (c, X, Y, W, H, col = [90, 130, 210]) => { shade(c, X, Y, W, H); c.box(X + 1, Y + 1, W - 2, H - 3, [236, 232, 224], [110, 84, 60]); c.box(X + 3, Y + 3, W - 6, 8, WHITE, [190, 190, 200]); c.box(X + 1, Y + 13, W - 2, H - 15, col, dk(col, 0.4)); c.rect(X + 2, Y + 14, W - 4, 2, lt(col, 0.3)); c.rect(X + 1, Y, W - 2, 2, [110, 84, 60]); },
  sofa: (c, X, Y, W, H, col = [176, 70, 80]) => { shade(c, X, Y, W, H); c.box(X, Y + 2, W, H - 4, col, dk(col, 0.5)); c.rect(X + 1, Y + 3, W - 2, 5, lt(col, 0.18)); c.box(X + 3, Y + 8, W - 6, H - 12, lt(col, 0.08), dk(col, 0.3)); c.box(X, Y + 6, 4, H - 8, dk(col, 0.15), dk(col, 0.5)); c.box(X + W - 4, Y + 6, 4, H - 8, dk(col, 0.15), dk(col, 0.5)); },
  plant: (c, X, Y, W, H, leaf = [70, 150, 84]) => { const cx = X + W / 2, by = Y + H; c.ellipse(cx, by - 2, 6, 2, [0, 0, 0, 60]); c.box(cx - 4, by - 9, 8, 8, [190, 120, 80], [100, 60, 44]); c.rect(cx - 5, by - 10, 10, 2, [214, 150, 104]); for (const [dx, dy, r] of [[-4, -16, 5], [4, -17, 5], [0, -22, 6], [-2, -13, 4], [3, -12, 4]]) { c.ellipse(cx + dx, by + dy, r, r, dk(leaf, 0.2)); c.ellipse(cx + dx - 1, by + dy - 1, r - 1, r - 1, leaf); } c.ellipse(cx - 2, by - 23, 2, 1, lt(leaf, 0.4)); },
  crate: (c, X, Y, W, H, col = [176, 130, 84]) => { shade(c, X, Y, W, H); c.box(X + 1, Y + 1, W - 2, H - 2, col, dk(col, 0.5)); frame(c, X + 3, Y + 3, W - 6, H - 6, dk(col, 0.25)); c.line(X + 4, Y + 4, X + W - 5, Y + H - 5, dk(col, 0.25)); c.line(X + W - 5, Y + 4, X + 4, Y + H - 5, dk(col, 0.25)); c.rect(X + 2, Y + 2, W - 4, 1, lt(col, 0.3)); },
  barrel: (c, X, Y, W, H, col = [150, 100, 66]) => { const cx = X + W / 2; c.ellipse(cx, Y + H - 2, 6, 2, [0, 0, 0, 60]); c.box(cx - 6, Y + H - 16, 12, 15, col, dk(col, 0.5)); c.rect(cx - 6, Y + H - 13, 12, 1, [90, 90, 100]); c.rect(cx - 6, Y + H - 5, 12, 1, [90, 90, 100]); c.ellipse(cx, Y + H - 16, 6, 2, lt(col, 0.2)); },
  console: (c, X, Y, W, H, col = [96, 104, 128], scr = [90, 220, 190]) => { shade(c, X, Y, W, H); c.box(X, Y + 2, W, H - 3, col, dk(col, 0.5)); c.rect(X + 1, Y + 3, W - 2, 2, lt(col, 0.3)); c.box(X + 3, Y + 6, W - 6, Math.max(6, H - 20), INK, dk(col, 0.6)); c.rect(X + 4, Y + 7, W - 8, Math.max(4, H - 22), dk(scr, 0.35)); for (let k = 0; k < W - 10; k += 3) c.rect(X + 5 + k, Y + 8 + Math.floor(hsh(X + k, Y, 2) * Math.max(2, H - 26)), 2, 1, scr); for (let k = 0; k + 4 < W - 4; k += 5) c.rect(X + 3 + k, Y + H - 9, 3, 2, [[240, 90, 80], [250, 220, 90], [110, 220, 130]][(k / 5) % 3]); c.rect(X + 1, Y + H - 5, W - 2, 1, dk(col, 0.3)); },
  tank: (c, X, Y, W, H, liq = [120, 220, 170]) => { const cx = X + W / 2, r = W / 2 - 2; c.ellipse(cx, Y + H - 2, r + 2, 3, [0, 0, 0, 60]); c.box(cx - r - 1, Y + H - 8, r * 2 + 2, 7, [90, 96, 116], INK); c.rect(cx - r, Y + 5, r * 2, H - 13, A(liq, 190)); c.rect(cx - r, Y + 5, 2, H - 13, A(WHITE, 150)); c.rect(cx + r - 2, Y + 5, 1, H - 13, A(dk(liq, 0.4), 200)); frame(c, cx - r - 1, Y + 4, r * 2 + 2, H - 11, [60, 70, 96]); c.box(cx - r - 1, Y, r * 2 + 2, 6, [90, 96, 116], INK); for (let k = 0; k < 4; k++) c.p(cx - r + 3 + Math.floor(hsh(X, Y, k) * (r * 2 - 5)), Y + 8 + Math.floor(hsh(Y, X, k) * (H - 20)), WHITE); },
  pillar: (c, X, Y, W, H, col = [200, 198, 210]) => { c.ellipse(X + W / 2, Y + H - 3, W / 2, 3, [0, 0, 0, 70]); c.box(X + 2, Y + 4, W - 4, H - 8, col, dk(col, 0.55)); c.rect(X + 4, Y + 5, 3, H - 10, lt(col, 0.4)); c.rect(X + W - 5, Y + 5, 2, H - 10, dk(col, 0.2)); c.box(X, Y, W, 6, lt(col, 0.1), dk(col, 0.55)); c.box(X, Y + H - 6, W, 5, dk(col, 0.1), dk(col, 0.55)); },
  torch: (c, X, Y, W, H, fl = [250, 150, 50]) => { const cx = X + W / 2, by = Y + H; glow(c, cx, by - 20, 20, fl, 22); c.ellipse(cx, by - 2, 5, 2, [0, 0, 0, 70]); c.rect(cx - 1, by - 16, 2, 14, [80, 76, 90]); c.box(cx - 4, by - 4, 8, 3, [110, 106, 120], INK); c.box(cx - 5, by - 19, 10, 4, [110, 106, 120], INK); c.poly([[cx - 4, by - 19], [cx + 4, by - 19], [cx + 2, by - 25], [cx, by - 30], [cx - 2, by - 24]], fl); c.poly([[cx - 2, by - 19], [cx + 2, by - 19], [cx, by - 26]], lt(fl, 0.6)); },
  speaker: (c, X, Y, W, H, col = [44, 42, 56]) => { shade(c, X, Y, W, H); c.box(X + 1, Y, W - 2, H - 1, col, [14, 12, 20]); c.rect(X + 2, Y + 1, W - 4, 1, lt(col, 0.3)); const cx = X + W / 2, n = Math.max(1, Math.round((H - 6) / (W - 4))); for (let k = 0; k < n; k++) { const cy = Y + 3 + (H - 6) * (k + 0.5) / n, r = Math.min(W / 2 - 4, (H - 6) / n / 2 - 1); c.ellipse(cx, cy, r, r, [16, 14, 22]); c.ellipse(cx, cy, r - 1, r - 1, [70, 68, 86], 2); c.ellipse(cx, cy, r / 3, r / 3, [110, 108, 130]); c.p(cx - r / 2, cy - r / 2, WHITE); } },
  statue: (c, X, Y, W, H, col = [176, 176, 190]) => { const cx = X + W / 2, by = Y + H; c.ellipse(cx, by - 2, W / 2 - 1, 3, [0, 0, 0, 70]); c.box(X + 2, by - 9, W - 4, 8, dk(col, 0.15), dk(col, 0.6)); c.rect(X + 3, by - 8, W - 6, 1, lt(col, 0.4)); c.box(cx - 4, by - 20, 8, 12, col, dk(col, 0.6)); c.ellipse(cx, by - 23, 5, 5, dk(col, 0.6)); c.ellipse(cx, by - 23, 4, 4, col); c.rect(cx - 3, by - 19, 2, 9, lt(col, 0.4)); c.ellipse(cx - 1, by - 24, 1, 1, lt(col, 0.6)); },
  counter: (c, X, Y, W, H, col = [196, 150, 96], topc = [236, 222, 190]) => { shade(c, X, Y, W, H); c.box(X, Y + 2, W, H - 3, col, dk(col, 0.5)); c.rect(X, Y + 1, W, 5, topc); c.rect(X, Y + 6, W, 1, dk(col, 0.3)); for (let k = 8; k < W - 4; k += 16) c.rect(X + k, Y + 8, 1, H - 11, dk(col, 0.2)); },
  showcase: (c, X, Y, W, H, draw) => { shade(c, X, Y, W, H); c.box(X + 1, Y + H - 10, W - 2, 9, [120, 90, 70], [60, 44, 36]); c.rect(X + 2, Y + H - 9, W - 4, 1, [176, 140, 110]); c.rect(X + 2, Y + 2, W - 4, H - 12, [200, 230, 244, 120]); frame(c, X + 1, Y + 1, W - 2, H - 10, [90, 110, 130]); c.rect(X + 3, Y + 3, 1, H - 15, A(WHITE, 200)); if (draw) draw(c, X + W / 2, Y + H - 11); },
  machine: (c, X, Y, W, H, col = [120, 130, 150], lamp = [110, 230, 250]) => { shade(c, X, Y, W, H); c.box(X + 1, Y + 1, W - 2, H - 2, col, dk(col, 0.55)); c.rect(X + 2, Y + 2, W - 4, 2, lt(col, 0.35)); for (let y = Y + 7; y < Y + H - 6; y += 5) c.rect(X + 3, y, W - 6, 1, dk(col, 0.3)); c.ellipse(X + W / 2, Y + H / 2, Math.min(W, H) / 4, Math.min(W, H) / 4, INK); c.ellipse(X + W / 2, Y + H / 2, Math.min(W, H) / 4 - 1, Math.min(W, H) / 4 - 1, lamp); c.ellipse(X + W / 2 - 1, Y + H / 2 - 1, 1, 1, WHITE); c.rect(X + 3, Y + H - 6, 3, 2, [240, 90, 80]); c.rect(X + W - 6, Y + H - 6, 3, 2, [110, 220, 130]); },
  rock: (c, X, Y, W, H, col = [130, 110, 100]) => { const cx = X + W / 2, by = Y + H; c.ellipse(cx, by - 2, W / 2, 3, [0, 0, 0, 60]); c.poly([[X + 1, by - 2], [X + 3, by - H * 0.55], [cx - 2, Y + 2], [cx + 4, Y + 4], [X + W - 2, by - H * 0.45], [X + W - 1, by - 2]], dk(col, 0.25)); c.poly([[X + 3, by - 3], [X + 4, by - H * 0.5], [cx - 1, Y + 4], [cx + 2, by - H * 0.4], [cx, by - 3]], col); c.line(cx - 1, Y + 5, X + 5, by - H * 0.5, lt(col, 0.3)); },
  sign: (c, X, Y, W, H, col = [214, 196, 150]) => { c.rect(X + W / 2 - 1, Y + H - 8, 2, 7, [96, 76, 50]); c.box(X + 1, Y + 1, W - 2, H - 8, col, [96, 76, 50]); c.rect(X + 3, Y + 4, W - 6, 1, [96, 76, 50]); c.rect(X + 3, Y + 7, W - 8, 1, [96, 76, 50]); },
};
// Things that hang on a wall: (c, X, Y, w, h, ...) with (X, Y) the top-left in pixels.
const Wl = {
  plain: (col, o = {}) => (c, X, Y, W) => { c.rect(X, Y, W, 32, col); c.rect(X, Y, W, 3, lt(col, 0.3)); c.rect(X, Y + 27, W, 5, o.base || dk(col, 0.35)); c.rect(X, Y + 27, W, 1, lt(o.base || dk(col, 0.35), 0.25)); if (o.panel) for (let k = 0; k < W; k += o.panel) c.rect(X + k, Y + 3, 1, 24, dk(col, 0.14)); if (o.rail) c.rect(X, Y + 16, W, 2, o.rail); },
  brick: (col) => (c, X, Y, W) => { c.rect(X, Y, W, 32, col); for (let r = 0; r < 4; r++) { c.rect(X, Y + r * 8 + 7, W, 1, dk(col, 0.3)); for (let k = (r & 1) * 8; k < W; k += 16) c.rect(X + k, Y + r * 8, 1, 7, dk(col, 0.3)); for (let k = 0; k < W; k += 16) if (hsh(k + X, r, 3) > 0.6) c.rect(X + k + 2 + (r & 1) * 8, Y + r * 8 + 1, 12, 5, lt(col, 0.1)); } c.rect(X, Y, W, 2, lt(col, 0.3)); c.rect(X, Y + 29, W, 3, dk(col, 0.45)); },
  rockface: (col) => (c, X, Y, W) => { c.rect(X, Y, W, 32, col); for (let k = 0; k < W; k += 4) { const h = hsh(k + X, Y, 2); c.rect(X + k, Y + Math.floor(h * 26), 3 + Math.floor(h * 4), 2, h > 0.5 ? lt(col, 0.14) : dk(col, 0.22)); } c.rect(X, Y + 28, W, 4, dk(col, 0.45)); },
  window: (c, X, Y, w = 24, h = 18, sky = [150, 206, 244]) => { c.box(X, Y, w, h, sky, [90, 76, 70]); c.rect(X + 1, Y + 1, w - 2, 3, lt(sky, 0.4)); c.rect(X + w / 2 - 1, Y + 1, 1, h - 2, [90, 76, 70]); c.rect(X + 1, Y + h / 2, w - 2, 1, [90, 76, 70]); c.rect(X - 1, Y + h, w + 2, 2, [214, 206, 196]); },
  picture: (c, X, Y, w, h, col, draw) => { c.box(X, Y, w, h, col, [120, 84, 44]); frame(c, X + 1, Y + 1, w - 2, h - 2, GOLD); if (draw) draw(c, X + w / 2, Y + h / 2); },
  curtain: (c, X, Y, w, h, col = [170, 40, 56]) => { c.rect(X, Y, w, h, col); for (let k = 0; k < w; k += 6) { c.rect(X + k, Y, 2, h, dk(col, 0.22)); c.rect(X + k + 3, Y, 1, h, lt(col, 0.16)); } c.rect(X, Y, w, 3, GOLD); c.rect(X, Y + h - 2, w, 2, dk(col, 0.4)); },
  banner: (c, X, Y, w, h, col, mark = WHITE) => { c.rect(X - 1, Y - 1, w + 2, 2, [80, 70, 60]); c.rect(X, Y + 1, w, h - 6, col); c.poly([[X, Y + h - 5], [X + w, Y + h - 5], [X + w / 2, Y + h]], col); c.rect(X, Y + 1, 2, h - 6, dk(col, 0.25)); c.ellipse(X + w / 2, Y + h / 2 - 1, w / 4, w / 4, mark); },
  screen: (c, X, Y, w, h, col = [60, 150, 220], draw) => { c.box(X, Y, w, h, [28, 28, 40], [10, 10, 18]); c.rect(X + 2, Y + 2, w - 4, h - 4, col); c.rect(X + 2, Y + 2, w - 4, 2, lt(col, 0.3)); for (let k = Y + 4; k < Y + h - 3; k += 3) c.rect(X + 2, k, w - 4, 1, A(INK, 30)); if (draw) draw(c, X + w / 2, Y + h / 2); },
  lamp: (c, X, Y, col = [250, 230, 150]) => { glow(c, X, Y + 4, 16, col, 26); c.rect(X - 1, Y - 4, 2, 5, [70, 66, 80]); c.box(X - 4, Y, 8, 8, col, [70, 66, 80]); c.rect(X - 2, Y + 2, 3, 3, WHITE); },
  shelf: (c, X, Y, w, cols = BOOKS) => { c.rect(X, Y + 9, w, 3, [120, 84, 54]); c.rect(X, Y + 12, w, 1, [70, 50, 34]); for (let k = 1; k < w - 3; k += 4) { const h = 5 + Math.floor(hsh(X + k, Y, 2) * 4); c.rect(X + k, Y + 9 - h, 3, h, cols[Math.floor(hsh(X + k, Y, 5) * 97) % cols.length]); } },
};
function bolt(c, cx, cy, s, col) { c.poly([[cx + 2 * s, cy - 8 * s], [cx - 5 * s, cy + 1 * s], [cx - 1 * s, cy + 1 * s], [cx - 3 * s, cy + 8 * s], [cx + 5 * s, cy - 2 * s], [cx + 1 * s, cy - 2 * s]], col); }
function star(c, cx, cy, r, col) { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k & 1 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); } c.poly(pts, col); }
function ball(c, cx, cy, r, topc = RED) { c.ellipse(cx, cy, r, r, INK); c.ellipse(cx, cy, r - 1, r - 1, WHITE); for (let y = -r + 1; y < 0; y++) { const w = Math.floor(Math.sqrt((r - 1) * (r - 1) - y * y)); c.rect(cx - w, cy + y, w * 2, 1, topc); } c.rect(cx - r + 1, cy - 1, r * 2 - 2, 2, INK); c.ellipse(cx, cy, r / 3 + 1, r / 3 + 1, INK); c.ellipse(cx, cy, r / 3, r / 3, WHITE); }
// A lined battle court over tiles x0..x1, y0..y1 (challenger below, leader above).
function court(c, x0, y0, x1, y1, col, line = WHITE, emblem) {
  const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, cx = X + w / 2, cy = Y + h / 2, L = A(line, 220);
  if (col) c.rect(X, Y, w, h, col);
  frame(c, X + 2, Y + 2, w - 4, h - 4, L, 2); c.rect(X + 2, cy - 1, w - 4, 2, L);
  frame(c, cx - 20, Y + 8, 40, 14, L, 2); frame(c, cx - 20, Y + h - 22, 40, 14, L, 2);
  c.ellipse(cx, cy, 20, 20, L, 2); if (emblem) emblem(c, cx, cy); else ball(c, cx, cy, 8);
}
function rug(c, x0, y0, x1, y1, col, trim = GOLD) { const X = x0 * S + 2, Y = y0 * S + 2, w = (x1 - x0 + 1) * S - 4, h = (y1 - y0 + 1) * S - 4; c.box(X, Y, w, h, col, dk(col, 0.45)); frame(c, X + 3, Y + 3, w - 6, h - 6, trim); frame(c, X + 5, Y + 5, w - 10, h - 10, A(lt(col, 0.3), 200)); }
// A light cone on the walk-behind layer.
function beam(top, x, y, x2, y2, r, col, a = 26) { top.poly([[x - 2, y], [x + 2, y], [x2 + r, y2], [x2 - r, y2]], A(col, a)); top.ellipse(x2, y2, r, r / 2.4, A(col, a + 10)); }

// ---------------------------------------------------------------- the kit: helpers bound to one room
function kit(p) {
  const key = (x, y) => x + "," + y, kept = new Set(), used = new Set(), L = p.left, R = p.right, T0 = p.top, B = p.bottom;
  for (const w of p.warps) { kept.add(key(w.x, w.y)); for (const [dx, dy] of w.exit ? [[0, -1], [-1, 0], [1, 0]] : [[0, 1], [0, -1], [1, 0], [-1, 0]]) kept.add(key(w.x + dx, w.y + dy)); }
  for (const q of p.people) { kept.add(key(q.x, q.y)); kept.add(key(q.x, q.y + 1)); }
  kept.add(key(p.W >> 1, p.H >> 1));
  const free = (x, y) => p.isFloor(x, y) && !kept.has(key(x, y)) && !used.has(key(x, y));
  // Rows that are only a doorway through the bottom wall, and the room's own solid fixtures.
  const notch = new Set(); for (let y = T0; y <= B; y++) { let n = 0; for (let x = L; x <= R; x++) if (p.isFloor(x, y)) n++; if (n * 3 < R - L + 1) notch.add(y); }
  const solids = []; { const seen = new Set(); for (let y = T0; y <= B; y++) for (let x = L; x <= R; x++) { if (p.isFloor(x, y) || seen.has(key(x, y)) || notch.has(y)) continue; let a = x, b = x, d = y, n = 0; const q = [[x, y]]; seen.add(key(x, y)); while (q.length) { const [jx, jy] = q.pop(); n++; a = Math.min(a, jx); b = Math.max(b, jx); d = Math.max(d, jy); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = jx + dx, ny = jy + dy; if (nx < L || nx > R || ny < T0 || ny > B || notch.has(ny) || p.isFloor(nx, ny) || seen.has(key(nx, ny))) continue; seen.add(key(nx, ny)); q.push([nx, ny]); } } solids.push({ x: a, y, w: b - a + 1, h: d - y + 1, full: n === (b - a + 1) * (d - y + 1) }); } }
  const k = {
    kept: (x, y) => kept.has(key(x, y)), free, solids, L, R, T: T0, B,
    // The floor: `fn` paints each tile (the room's own solid tiles too, as a base under their fixtures).
    floor(fn, x0 = L, y0 = T0, x1 = R, y1 = B, z = 0.01) { p.paint(z, (c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (p.isFloor(x, y) || (!p.irregular && !notch.has(y) && x >= L && x <= R && y >= T0 && y <= B)) fn(c, x * S, y * S, x, y); }); },
    // The two-row back wall.
    wall(fn, z = 0.03) { p.paint(z, (c) => fn(c, L * S, (T0 - 2) * S, (R - L + 1) * S)); },
    // Flat art on the floor (walked over).
    art(draw, z = 0.2) { p.paint(z, draw); },
    // A solid prop on tiles (x, y, w, h); only its bottom `rows` rows block, the rest is walked behind. Skipped if it does not fit.
    put(x, y, w, h, draw, o = {}) {
      const rows = o.rows == null ? h : o.rows, cells = [];
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (j >= y + h - rows) { if (!free(i, j)) return false; cells.push([i, j]); } else if (kept.has(key(i, j)) && p.people.some((q) => q.x === i && q.y === j)) return false; }
      for (const [i, j] of cells) { used.add(key(i, j)); try { p.block(i, j, 1, 1); } catch (_) { /* a kept tile stays open */ } }
      const X = x * S, Y = y * S, Wp = w * S, Hp = h * S, cut = (y + h - rows) * S;
      p.paint(y + h + (o.z || 0), (c, top) => { draw(c, X, Y, Wp, Hp, top); if (rows < h || o.tall) { const orig = top.p; top.p = (px, py, col) => { if (py < cut) orig(px, py, col); }; TOP_PASS = true; try { draw(top, X, Y, Wp, Hp, top); } finally { top.p = orig; TOP_PASS = false; } } });
      return true;
    },
    // Redraw one of the room's own solid fixtures (the builder's plain cabinet is painted over).
    fixtures(fn) { for (const s of solids) { const d = fn(s); if (d) p.paint(s.y + s.h + 0.02, (c, top) => d(c, s.x * S, s.y * S, s.w * S, s.h * S, top)); } },
    // The ways in and out. styles: { k: "stairs" | "panel" | "arch" | "lift" | "hole" | "none" }, mat colour for the exit.
    doors(styles = {}, mat = RED) {
      for (const w of p.warps) {
        p.bare(w.k); const X = w.x * S, Y = w.y * S, side = (w.x <= L + 2 || w.x >= R - 2) && w.y > T0 + 3 && w.y < B - 1, st = styles[w.k] || (w.exit ? (side ? "side" : "mat") : styles.all || (side ? "side" : "arch"));
        if (st === "none") continue;
        if (st === "mat") p.paint(0.06, (c) => { c.box(X - 8, Y + 2, 32, 13, mat, dk(mat, 0.5)); c.rect(X - 5, Y + 5, 26, 7, lt(mat, 0.25)); });
        else if (st === "side") p.paint(0.06, (c) => { c.box(X + 2, Y - 8, 13, 32, mat, dk(mat, 0.5)); c.rect(X + 5, Y - 5, 7, 26, lt(mat, 0.25)); });
        else if (st === "panel") p.paint(0.06, (c) => { glow(c, X + 8, Y + 8, 14, [120, 230, 250], 30); c.box(X + 1, Y + 1, 14, 14, [40, 60, 90], [20, 26, 44]); c.ellipse(X + 8, Y + 8, 5, 5, [120, 230, 250]); c.ellipse(X + 8, Y + 8, 2, 2, WHITE); });
        else if (st === "stairs") p.paint(0.06, (c) => { c.box(X - 2, Y - 14, 20, 30, [70, 66, 84], INK); for (let s2 = 0; s2 < 28; s2 += 4) { c.rect(X, Y - 13 + s2, 16, 3, mix([120, 116, 136], [214, 210, 226], s2 / 28)); c.rect(X, Y - 10 + s2, 16, 1, [60, 56, 72]); } });
        else if (st === "lift") p.paint(0.06, (c) => { c.box(X - 4, Y - 4, 24, 24, [60, 58, 66], INK); for (let s2 = -3; s2 < 22; s2 += 6) c.poly([[X - 3 + s2, Y - 3], [X + s2, Y - 3], [X - 3 + s2 - 0, Y + 0]], [240, 200, 60]); c.box(X, Y, 16, 16, [150, 150, 160], [50, 50, 60]); for (let s2 = 2; s2 < 15; s2 += 4) c.rect(X + 1, Y + s2, 14, 1, [100, 100, 112]); frame(c, X - 4, Y - 4, 24, 24, [240, 200, 60], 2); });
        else if (st === "hole") p.paint(0.06, (c) => { c.ellipse(X + 8, Y + 8, 10, 8, [60, 50, 50]); c.ellipse(X + 8, Y + 9, 8, 6, [16, 14, 20]); });
        else p.paint(w.y + 0.4, (c) => { c.box(X - 3, Y - 30, 22, 31, styles.frame || [90, 80, 96], INK); c.rect(X, Y - 27, 16, 28, [22, 20, 30]); c.rect(X + 2, Y - 25, 2, 24, A(WHITE, 30)); c.rect(X, Y, 16, 16, [120, 116, 136]); for (let s2 = 3; s2 < 16; s2 += 4) c.rect(X, Y + s2, 16, 1, [170, 166, 186]); });
      }
    },
    // Tidy the doorway row through the bottom wall.
    notches() { for (const y of notch) p.paint(y + 1.02, (c) => { for (let x = L; x <= R; x++) if (!p.isFloor(x, y)) { c.rect(x * S, y * S - 6, S, 22, [16, 16, 24]); c.rect(x * S, y * S - 6, S, 6, [52, 50, 66]); } }); },
  };
  return k;
}
// The usual start of a plan: floor, wall, doors.
function base(p, floorFn, wallFn, doorStyles, mat) { const k = kit(p); k.floor(floorFn); if (wallFn) k.wall(wallFn); k.doors(doorStyles, mat); k.notches(); return k; }
// Props by their base size: k.put(...) wrappers.
const tall = (k, x, y, w, fn, ...a) => k.put(x, y - 1, w, 2, (c, X, Y, W, H) => fn(c, X, Y + 4, W, H - 4, ...a), { rows: 1 });

const R = {};

// ================================================================ the eight Gyms
// Aspertia: Cheren's Gym is the school's bare earth yard: two chalked courts one above the other, Cheren on a stone
// platform at the far end, benches along the fences, floodlights in the corners and trees over the back wall.
R.UnovaAspertiaGym = {
  theme: { room: "arena", floor: "dirt", wall: null },
  plan(p) {
    const clay = [200, 150, 104];
    const k = base(p, T.dirt(clay), (c, X, Y, W) => { c.rect(X, Y, W, 32, [44, 104, 70]); for (let x = 0; x < W; x += 22) { c.ellipse(X + x + 11, Y + 10, 13, 11, [36, 92, 62]); c.ellipse(X + x + 9, Y + 8, 9, 7, [64, 132, 84]); } c.rect(X, Y + 20, W, 12, [196, 192, 180]); c.rect(X, Y + 20, W, 2, [226, 224, 214]); c.rect(X, Y + 29, W, 3, [130, 126, 116]); for (let x = 8; x < W; x += 16) c.rect(X + x, Y + 23, 1, 6, [160, 156, 146]); });
    k.art((c) => {
      for (const [y0, y1] of [[9, 15], [19, 25]]) { court(c, 9, y0, 22, y1, null, WHITE, () => {}); c.rect(16 * S - 1, y0 * S + 2, 2, (y1 - y0 + 1) * S - 4, A(WHITE, 220)); }
      const X = 13 * S, Y = 3 * S + 6; c.box(X, Y, 7 * S, 3 * S + 6, [204, 202, 194], [120, 118, 110]); frame(c, X + 3, Y + 3, 7 * S - 6, 3 * S, [234, 232, 224]); c.rect(X, Y + 3 * S + 6, 7 * S, 4, [130, 126, 116]); for (let x = X + 16; x < X + 7 * S; x += 16) c.rect(x, Y + 4, 1, 3 * S - 2, [176, 174, 166]);
      for (let y = 3; y <= 28; y++) for (const x of [1, 30]) { const X2 = x * S + (x === 1 ? 9 : 2), Y2 = y * S; c.rect(X2 + 1, Y2, 3, S, [150, 108, 62]); c.box(X2, Y2 + 2, 5, 6, [190, 144, 90], [86, 58, 36]); }
    });
    // the climbing frame by the fence
    k.fixtures((s) => s.w === 4 ? (c, X, Y, W, H) => { const o = [232, 120, 40], d = [150, 70, 24]; c.rect(X, Y, W, H, clay); c.rect(X + 4, Y + H - 3, W - 2, 4, [0, 0, 0, 50]); for (let r = Y + 8; r < Y + H - 4; r += 9) { c.rect(X + 3, r, W - 6, 3, o); c.rect(X + 3, r + 3, W - 6, 1, d); } for (let x = X + 15; x < X + W - 8; x += 12) c.rect(x, Y + 6, 2, H - 10, d); for (const x of [X + 2, X + W - 7]) c.box(x, Y + 3, 5, H - 5, o, d); } : null);
    for (const x of [2, 29]) tall(k, x, 3, 1, (c, X, Y, W, H) => { const cx = X + 8; c.ellipse(cx, Y + H - 2, 6, 2, [0, 0, 0, 70]); c.rect(cx - 1, Y + 6, 3, H - 8, [70, 72, 84]); c.box(cx - 5, Y + H - 4, 10, 3, [70, 72, 84], INK); c.box(cx - 7, Y - 4, 14, 11, [50, 52, 64], INK); for (const [dx, dy] of [[-4, -1], [2, -1], [-4, 3], [2, 3]]) c.rect(cx + dx, Y + dy, 3, 2, [250, 244, 200]); });
    for (const [x, y] of [[2, 12], [2, 20], [29, 12], [29, 20]]) k.put(x, y, 1, 2, (c, X, Y) => { c.rect(X + 2, Y + 30, 13, 2, [0, 0, 0, 50]); c.box(X + 2, Y + 4, 12, 24, [190, 144, 90], [86, 58, 36]); for (let r = 9; r < 26; r += 6) c.rect(X + 3, Y + r, 10, 1, [120, 84, 54]); c.rect(X + 3, Y + 28, 2, 3, [86, 58, 36]); c.rect(X + 11, Y + 28, 2, 3, [86, 58, 36]); });
  },
};

// Virbank: Roxie's underground club. A stage along the back with the band's gear, speaker stacks, a stained
// concrete floor under toxic light.
R.UnovaVirbankGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const k = base(p, T.slab([98, 98, 108], 3), (c, X, Y, W) => { Wl.brick([70, 50, 76])(c, X, Y, W); const cx = X + W / 2; glow(c, cx, Y + 14, 30, [190, 110, 250], 30); c.ellipse(cx, Y + 13, 11, 10, [170, 100, 230]); c.ellipse(cx, Y + 13, 9, 8, [214, 160, 250]); c.rect(cx - 5, Y + 11, 3, 3, INK); c.rect(cx + 2, Y + 11, 3, 3, INK); c.rect(cx - 4, Y + 18, 8, 1, INK); for (const d of [-1, 1]) { for (let i = 0; i < 6; i++) c.line(cx + d * (30 + i * 22), Y + (i & 1 ? 8 : 22), cx + d * (52 + i * 22), Y + (i & 1 ? 22 : 8), i % 3 ? [130, 240, 120] : [240, 110, 220], 2); } }, {}, [120, 70, 170]);
    k.floor(T.plank([70, 64, 84]), 9, 2, 22, 7, 0.02);
    k.art((c) => { c.rect(9 * S, 8 * S - 4, 14 * S, 4, [36, 26, 50]); for (let x = 9 * S + 4; x < 23 * S; x += 12) c.rect(x, 8 * S - 3, 5, 2, (x / 12) & 1 ? [130, 240, 120] : [240, 110, 220]); frame(c, 9 * S, 2 * S, 14 * S, 6 * S, [36, 26, 50], 2);
      for (let i = 0; i < 22; i++) { const x = 3 + hsh(i, 1, 7) * 25, y = 9 + hsh(i, 2, 7) * 19; c.ellipse(x * S, y * S, 8 + hsh(i, 3, 7) * 12, 4 + hsh(i, 4, 7) * 6, [40, 36, 48, 46]); }
      for (const [x, y, r, col] of [[16, 17, 50, [150, 90, 220]], [9, 12, 22, [120, 230, 110]], [23, 12, 22, [120, 230, 110]]]) glow(c, x * S + 8, y * S + 8, r, col, 10);
      for (const [x, y] of [[7, 14], [25, 14]]) { c.ellipse(x * S + 8, y * S + 10, 15, 11, [30, 24, 40]); c.ellipse(x * S + 8, y * S + 10, 13, 9, [150, 90, 220], 2); } });
    k.fixtures((s) => s.w === 2 ? (c, X, Y, W, H, top) => { P.speaker(c, X, Y - 10, W, H + 10); top.rect(X + 1, Y - 10, W - 2, 10, [44, 42, 56]); top.rect(X + 1, Y - 10, W - 2, 1, [14, 12, 20]); } : null);
    k.put(18, 3, 2, 2, (c, X, Y) => { c.ellipse(X + 16, Y + 28, 15, 4, [0, 0, 0, 70]); c.ellipse(X + 16, Y + 18, 9, 9, INK); c.ellipse(X + 16, Y + 18, 8, 8, [226, 60, 150]); c.ellipse(X + 16, Y + 18, 5, 5, WHITE); for (const dx of [4, 28]) { c.box(X + dx - 4, Y + 12, 8, 10, [120, 220, 110], INK); c.ellipse(X + dx, Y + 12, 4, 2, WHITE); c.rect(X + dx - 1, Y + 2, 1, 10, [150, 150, 160]); c.ellipse(X + dx, Y + 3, 5, 2, GOLD); } });
    k.put(12, 3, 2, 2, (c, X, Y, W, H) => { P.speaker(c, X, Y + 6, 16, 26, [70, 40, 90]); P.speaker(c, X + 16, Y + 12, 16, 20, [40, 70, 50]); });
    for (const [x, y] of [[2, 3], [29, 3], [2, 28], [29, 28]]) tall(k, x, y, 1, (c, X, Y, W, H) => { const cx = X + 8; glow(c, cx, Y + 6, 16, [130, 240, 120], 26); c.rect(cx - 1, Y + 8, 2, H - 10, [80, 76, 96]); c.box(cx - 4, Y + H - 4, 8, 3, [80, 76, 96], INK); c.box(cx - 4, Y, 8, 9, [130, 240, 120], INK); c.rect(cx - 2, Y + 2, 2, 4, WHITE); });
  },
};

// Castelia: Burgh's Gym. The inside of a silk cocoon, its floor and walls washed in every colour of his paints, silk
// threads strung across, paint cans left about (flat: nothing stands in the way).
const RAIN = [[250, 150, 176], [250, 196, 120], [244, 236, 130], [150, 226, 140], [120, 212, 232], [176, 166, 244]];
const paintFloor = (seed) => (c, X, Y, x, y) => { for (let j = 0; j < S; j += 4) for (let i = 0; i < S; i += 4) { const u = x + i / S, v = y + j / S, t = Math.sin(u * 0.42 + seed) + Math.cos(v * 0.37 - seed * 1.7) + Math.sin((u + v) * 0.21 + seed * 0.6), f = (t + 3) / 6 * (RAIN.length - 1), n = Math.min(RAIN.length - 2, Math.floor(f)); c.rect(X + i, Y + j, 4, 4, mix(RAIN[n], RAIN[n + 1], f - n)); } if (hsh(x, y, seed) > 0.82) c.rect(X + 3, Y + 6, 9, 1, [255, 255, 255, 110]); };
const silkWall = (seed) => (c, X, Y, W) => { for (let x = 0; x < W; x += 16) for (let y = 0; y < 32; y += 16) paintFloor(seed)(c, X + x, Y + y, x / 16, y / 16 - 4); c.rect(X, Y, W, 32, [255, 255, 255, 120]); for (let x = 3; x < W; x += 9) c.line(X + x, Y, X + x + (hsh(x, seed, 3) - 0.5) * 14, Y + 31, [255, 255, 255, 190]); for (let y = 6; y < 30; y += 8) c.rect(X, Y + y, W, 1, [226, 224, 216, 150]); c.rect(X, Y + 29, W, 3, [206, 202, 194]); };
const paintCan = (c, x, y, col) => { const X = x * S, Y = y * S; c.ellipse(X + 11, Y + 12, 5, 3, A(col, 210)); c.ellipse(X + 7, Y + 13, 5, 2, [0, 0, 0, 50]); c.box(X + 3, Y + 5, 8, 8, [196, 196, 206], [90, 90, 104]); c.ellipse(X + 7, Y + 5, 4, 2, col); c.rect(X + 4, Y + 8, 1, 4, WHITE); };
function castelia(seed, cans) {
  return {
    theme: { room: "arena", floor: "sand", wall: null },
    plan(p) {
      const k = base(p, paintFloor(seed), silkWall(seed), { all: "none" }, [250, 240, 200]);
      const up = p.warps.find((w) => !w.exit);
      k.art((c) => { for (let i = 0; i < 9; i++) { const x0 = (3 + hsh(i, seed, 1) * 24) * S, x1 = (3 + hsh(i, seed, 2) * 24) * S; c.line(x0, 2 * S, x1, 26 * S, [255, 255, 255, 96]); } if (up) for (const [tx, ty] of [[2, 6], [27, 8], [4, 25], [25, 25], [2, 16], [27, 18]]) c.line(up.x * S + 8, up.y * S, tx * S + 8, ty * S + 8, [255, 255, 255, 150]);
        cans.forEach(([x, y], i) => paintCan(c, x, y, [[226, 70, 110], [70, 140, 226], [240, 196, 60], [90, 190, 110], [236, 130, 60]][i % 5])); });
      if (up) p.paint(up.y + 0.3, (c) => { const cx = up.x * S + 8, cy = up.y * S - 2; c.ellipse(cx, cy + 14, 22, 6, [0, 0, 0, 50]); c.ellipse(cx, cy, 24, 20, [214, 210, 200]); c.ellipse(cx, cy - 1, 22, 18, [250, 248, 240]); for (let a = -18; a <= 18; a += 6) c.line(cx - 20, cy + a, cx + 20, cy + a * 0.6 - 3, [220, 216, 204]); c.ellipse(cx, cy + 9, 8, 10, [70, 60, 60]); c.ellipse(cx, cy + 10, 6, 8, [30, 26, 30]); });
    },
  };
}
R.UnovaCasteliaGym = castelia(1, [[4, 5], [24, 5], [22, 12], [6, 21], [25, 23]]);
R.UnovaCasteliaCocoon1 = castelia(2, [[5, 6], [23, 4], [7, 13], [21, 22], [3, 23]]);
R.UnovaCasteliaCocoon2 = castelia(3, [[25, 6], [4, 4], [23, 14], [8, 22], [26, 23]]);
// Burgh's cocoon at the heart of the Gym: the same painted silk, his big canvas hung at the back, paint cans round him.
R.UnovaCasteliaBurgh = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    const k = base(p, paintFloor(4.5), (c, X, Y, W) => { silkWall(4.5)(c, X, Y, W); const cx = X + W / 2; c.poly([[cx - 26, Y + 6], [cx + 22, Y + 2], [cx + 26, Y + 26], [cx - 22, Y + 30]], [110, 84, 56]); c.poly([[cx - 23, Y + 8], [cx + 20, Y + 5], [cx + 23, Y + 24], [cx - 20, Y + 27]], [150, 170, 130]); c.line(cx - 12, Y + 20, cx + 2, Y + 10, [226, 60, 70], 3); c.line(cx - 2, Y + 22, cx + 12, Y + 12, [60, 170, 90], 3); c.ellipse(cx - 6, Y + 13, 5, 4, [240, 200, 70], 2); }, {}, [250, 240, 200]);
    k.art((c) => { for (let i = 0; i < 12; i++) { const x0 = (2 + hsh(i, 5, 1) * 20) * S, x1 = (2 + hsh(i, 5, 2) * 20) * S; c.line(x0, 2 * S, x1, 20 * S, [255, 255, 255, 110]); }
      [[9, 6], [15, 6], [8, 8], [16, 8], [3, 12], [4, 13], [20, 11], [20, 13], [19, 12], [7, 17], [9, 18], [16, 17], [15, 18]].forEach(([x, y], i) => paintCan(c, x, y, [[226, 70, 110], [70, 140, 226], [240, 196, 60], [90, 190, 110], [236, 130, 60], [170, 110, 220]][i % 6])); });
  },
};

// Nimbasa: Elesa's fashion-show hall. One straight white catwalk runs up the dark hall between two strips of light to
// her stage under the big screen; the crowd sits either side.
R.UnovaNimbasaGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const pink = [250, 110, 190], yel = [250, 226, 90], teal = [70, 200, 204];
    const k = base(p, T.check([26, 24, 40], [20, 18, 32], 1), (c, X, Y, W) => { Wl.plain([30, 26, 48], { base: [16, 14, 28] })(c, X, Y, W); const cx = X + W / 2; Wl.screen(c, cx - 56, Y + 2, 112, 26, [236, 240, 250], (c2, x, y) => { c2.poly([[x - 44, y + 8], [x - 20, y - 8], [x - 6, y + 2], [x - 30, y + 8]], [110, 170, 240]); c2.poly([[x - 4, y - 8], [x + 30, y - 4], [x + 8, y + 8]], [240, 110, 110]); c2.poly([[x + 16, y + 8], [x + 46, y - 8], [x + 40, y + 8]], [250, 220, 110]); bolt(c2, x, y, 1.2, [250, 200, 60]); }); for (const d of [-1, 1]) for (let i = 0; i < 4; i++) c.ellipse(cx + d * (72 + i * 22), Y + 8, 5, 3, WHITE); }, {}, [200, 40, 50]);
    const walk = (c, X, Y, x, y) => { c.rect(X, Y, S, S, (x + y) & 1 ? [246, 246, 250] : [232, 232, 240]); c.rect(X, Y, S, 1, WHITE); c.rect(X + 15, Y, 1, S, [206, 206, 218]); };
    k.floor(walk, 12, 8, 16, 41, 0.02); k.floor(walk, 8, 3, 20, 7, 0.02);
    k.art((c) => {
      for (const x of [11, 17]) { const X = x === 11 ? x * S + 9 : x * S + 3; c.rect(X - 2, 8 * S, 8, 32 * S, A(teal, 50)); c.rect(X, 8 * S, 4, 32 * S, teal); c.rect(X + 1, 8 * S, 1, 32 * S, lt(teal, 0.5)); }
      c.rect(8 * S, 8 * S, 4 * S, 3, [150, 150, 164]); c.rect(17 * S, 8 * S, 4 * S, 3, [150, 150, 164]);
      for (const y of [8, 9]) c.rect(12 * S, y * S + 4, 5 * S, 2, [196, 196, 210]);
      for (const [x, y] of [[14, 31], [14, 21], [14, 11], [14, 5]]) { c.ellipse(x * S + 8, y * S + 9, 18, 12, A(yel, 70)); c.ellipse(x * S + 8, y * S + 9, 18, 12, pink, 2); star(c, x * S + 8, y * S + 9, 6, A(yel, 220)); }
    });
    const crowd = (seed) => (c, X, Y, W, H) => { c.rect(X, Y, W, H, [18, 16, 30]); for (let y = Y + 2; y + 11 <= Y + H; y += 12) { c.rect(X, y + 10, W, 2, [40, 36, 60]); for (let x = X + 2; x + 8 <= X + W; x += 11) { const h = hsh(x, y, seed), col = dk([[240, 200, 90], [220, 90, 150], [90, 150, 230], [120, 200, 130], [200, 110, 220], [240, 240, 250]][Math.floor(h * 6)], 0.45); c.rect(x, y + 5, 8, 6, col); c.ellipse(x + 4, y + 3, 3, 3, [150, 126, 110]); c.rect(x + 1, y, 6, 2, [[60, 40, 30], [30, 30, 40], [150, 120, 60], [110, 50, 40]][Math.floor(h * 40) % 4]); } } };
    for (const [y0, y1] of [[13, 19], [23, 29], [33, 38]]) { k.put(2, y0, 3, y1 - y0 + 1, crowd(y0)); if (y0 < 33) k.put(23, y0, 3, y1 - y0 + 1, crowd(y0 + 3)); }
    for (const x of [2, 23]) k.put(x, 4, 3, 5, crowd(x + 50));
    p.paint(50, (c, top) => { for (const [x, y, sx, col] of [[14, 31, 3, pink], [14, 21, 24, yel], [14, 11, 3, pink], [14, 5, 22, yel], [14, 5, 5, pink]]) beam(top, sx * S + 8, (y - 7) * S, x * S + 8, y * S + 10, 16, col, 18); });
  },
};

// Driftveil: Clay's mine. A dark cavern studded with green crystal; grey steel platforms under the workers and the
// lifts, joined by the moving tracks you ride between them.
function belt(c, x0, y0, x1, y1, dir) {   // a moving track over tiles; dir "r" "l" "u" "d"
  const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, hz = dir === "r" || dir === "l", body = [126, 136, 130], tie = [84, 92, 90], arrow = [226, 236, 228];
  c.box(X, Y, w, h, body, [40, 44, 48]);
  if (hz) { c.rect(X, Y + 2, w, 2, [196, 206, 198]); c.rect(X, Y + h - 4, w, 2, [196, 206, 198]); for (let x = X + 4; x < X + w - 6; x += 10) { const d = dir === "r" ? 1 : -1, mx = x + (d > 0 ? 0 : 5); c.rect(x + 7, Y + 4, 1, h - 8, tie); c.line(mx, Y + 8, mx + d * 4, Y + h / 2, arrow); c.line(mx + d * 4, Y + h / 2, mx, Y + h - 9, arrow); } }
  else { c.rect(X + 2, Y, 2, h, [196, 206, 198]); c.rect(X + w - 4, Y, 2, h, [196, 206, 198]); for (let y = Y + 4; y < Y + h - 6; y += 10) { const d = dir === "d" ? 1 : -1, my = y + (d > 0 ? 0 : 5); c.rect(X + 4, y + 7, w - 8, 1, tie); c.line(X + 8, my, X + w / 2, my + d * 4, arrow); c.line(X + w / 2, my + d * 4, X + w - 9, my, arrow); } }
}
const mineWall = (c, X, Y, W) => { Wl.rockface([82, 70, 72])(c, X, Y, W); for (let x = 20; x < W - 12; x += 52) { const h = 8 + hsh(x, 1, 6) * 12; c.poly([[X + x, Y + 31], [X + x + 4, Y + 31 - h], [X + x + 9, Y + 31]], [60, 190, 124]); c.poly([[X + x + 2, Y + 31], [X + x + 4, Y + 33 - h], [X + x + 5, Y + 31]], [170, 240, 200]); c.poly([[X + x + 8, Y + 31], [X + x + 12, Y + 36 - h], [X + x + 15, Y + 31]], [40, 150, 100]); } };
// A cluster of green crystal, 2 x 2 tiles (the lower row blocks).
const crystal = (c, X, Y) => { c.ellipse(X + 16, Y + 29, 14, 3, [0, 0, 0, 80]); P.rock(c, X + 2, Y + 16, 28, 15, [76, 64, 66]); for (const [dx, w, h, col] of [[6, 7, 24, [50, 170, 112]], [15, 8, 30, [70, 204, 136]], [23, 6, 18, [40, 150, 100]]]) { c.poly([[X + dx - w / 2, Y + 28], [X + dx - w / 2, Y + 28 - h * 0.6], [X + dx, Y + 28 - h], [X + dx + w / 2, Y + 28 - h * 0.6], [X + dx + w / 2, Y + 28]], col); c.poly([[X + dx - w / 2 + 1, Y + 27], [X + dx - w / 2 + 1, Y + 28 - h * 0.6], [X + dx, Y + 30 - h], [X + dx, Y + 27]], lt(col, 0.45)); } };
// A grey steel platform over tiles x0..x1, y0..y1 with red lamps along its front edge (flat).
const steelPad = (c, x0, y0, x1, y1, col = [168, 170, 176]) => { const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S; c.rect(X + 2, Y + h, w - 4, 4, [20, 18, 24]); c.box(X, Y, w, h, col, [60, 60, 70]); c.rect(X + 1, Y + 1, w - 2, 2, lt(col, 0.3)); for (let x = X + 16; x < X + w - 4; x += 16) c.rect(x, Y + 3, 1, h - 6, dk(col, 0.12)); for (const dx of [8, w - 14]) { c.rect(X + dx, Y + h - 1, 6, 3, [240, 60, 60]); c.rect(X + dx - 1, Y + h + 2, 8, 1, [240, 60, 60, 110]); } };
function mine(belts, crystals) {
  return {
    theme: { room: "arena", floor: "dirt", wall: null },
    plan(p) {
      const k = base(p, T.dirt([74, 62, 64]), mineWall, { all: "lift" }, [200, 160, 60]);
      k.art((c) => { for (const b of belts) belt(c, ...b); for (const q of p.people) { if (/lift/.test(q.script)) { steelPad(c, q.x - 1, q.y - 1, q.x + 1, q.y + 1); for (let s2 = 4; s2 < 44; s2 += 8) c.rect((q.x - 1) * S + s2, (q.y + 2) * S - 5, 4, 3, [240, 200, 60]); } else if (/worker/.test(q.script)) steelPad(c, q.x - 1, q.y - 1, q.x + 1, q.y + 1); } });
      for (const [x, y] of crystals) k.put(x, y, 2, 2, crystal, { rows: 1 });
    },
  };
}
R.UnovaDriftveilGym = mine([[4, 14, 25, 15, "r"], [22, 17, 23, 27, "d"], [11, 5, 12, 10, "u"]], [[26, 4], [2, 27], [26, 27], [13, 1]]);
R.UnovaDriftveilMine1 = mine([[4, 15, 25, 16, "l"], [11, 6, 12, 10, "d"], [23, 10, 24, 14, "u"]], [[26, 3], [2, 22], [26, 23], [13, 1]]);
R.UnovaDriftveilMine2 = mine([[4, 9, 12, 10, "r"], [4, 20, 25, 21, "r"], [12, 14, 13, 19, "d"]], [[2, 23], [26, 22], [2, 13], [15, 1]]);
// Clay's ledge at the bottom of the shaft: an orange steel platform in the dark, crystal all round.
R.UnovaDriftveilClay = {
  theme: { room: "arena", floor: "dirt", wall: null },
  plan(p) {
    const k = base(p, T.dirt([74, 62, 64]), mineWall, {}, [200, 160, 60]);
    k.art((c) => { steelPad(c, 8, 3, 18, 8, [240, 150, 36]); for (let x = 9; x <= 17; x += 2) c.rect(x * S + 4, 6 * S + 6, 8, 3, [255, 220, 150]); const X = 12 * S, Y = 9 * S; c.box(X, Y, 3 * S, 10 * S, [150, 152, 158], [60, 60, 70]); for (let y = Y + 4; y < Y + 10 * S; y += 8) c.rect(X + 3, y, 3 * S - 6, 2, [110, 112, 120]); for (const dx of [0, 3 * S - 3]) c.rect(X + dx, Y, 3, 10 * S, [226, 150, 190]); });
    for (const [x, y] of [[2, 3], [22, 3], [2, 17], [22, 17]]) k.put(x, y, 2, 2, crystal, { rows: 1 });
  },
};

// Mistralton: Skyla's hangar. A grating floor over the parked cargo plane, three great turbines blowing down it, walls
// with a patch of green shelter behind each, and her red platform at the far end.
R.UnovaMistraltonGym = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const mesh = (c, X, Y, x, y) => { c.rect(X, Y, S, S, [62, 66, 74]); c.line(X, Y, X + 15, Y + 15, [112, 118, 128]); c.line(X + 15, Y, X, Y + 15, [112, 118, 128]); c.line(X + 8, Y, X + 15, Y + 7, [90, 96, 106]); c.line(X, Y + 8, X + 7, Y + 15, [90, 96, 106]); c.line(X + 7, Y, X, Y + 7, [90, 96, 106]); c.line(X + 15, Y + 8, X + 8, Y + 15, [90, 96, 106]); };
    const k = base(p, mesh, (c, X, Y, W) => { Wl.plain([96, 100, 108], { panel: 16, base: [60, 64, 72] })(c, X, Y, W); for (let y = 8; y < 26; y += 8) c.rect(X, Y + y, W, 1, [76, 80, 88]); }, {}, [240, 190, 50]);
    const shelters = [[18, 33], [10, 27], [18, 23], [10, 17], [18, 13], [10, 8], [20, 9]];
    k.art((c) => {
      // the cargo plane parked under the grating
      const px = 6 * S, py = 34 * S, olive = [190, 204, 70, 110]; c.poly([[px - 20, py - 60], [px + 20, py - 60], [px + 24, py + 90], [px - 24, py + 90]], olive); c.ellipse(px, py - 60, 20, 26, olive); c.poly([[px + 20, py - 10], [px + 150, py + 20], [px + 150, py + 44], [px + 22, py + 36]], olive); c.poly([[px - 20, py - 10], [px - 70, py + 4], [px - 70, py + 26], [px - 22, py + 36]], olive); c.rect(px + 60, py + 10, 14, 40, [150, 60, 50, 120]);
      // Skyla's red platform
      c.box(8 * S, 3 * S, 15 * S, 4 * S, [168, 44, 48], [70, 74, 84]); frame(c, 8 * S + 3, 3 * S + 3, 15 * S - 6, 4 * S - 6, [200, 204, 210], 2); const cx = 15 * S + 8, cy = 5 * S + 2; c.ellipse(cx, cy - 12, 13, 9, [60, 62, 70], 3); c.poly([[cx - 16, cy - 6], [cx + 16, cy - 10], [cx + 2, cy + 12]], [60, 62, 70]); c.poly([[cx - 9, cy - 4], [cx + 10, cy - 6], [cx + 1, cy + 7]], [200, 204, 210]);
      for (let x = 8; x <= 22; x += 2) c.rect(x * S + 4, 7 * S - 4, 8, 3, [240, 190, 50]);
      // green shelter behind each wall
      for (const [x, y] of shelters) { c.box(x * S, (y + 1) * S, 3 * S, 2 * S, [112, 184, 104], [60, 110, 64]); c.rect(x * S + 2, (y + 1) * S + 2, 3 * S - 4, 3, [150, 214, 140]); }
      for (const q of p.people) if (/fan/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 8; c.ellipse(X, Y, 22, 22, [40, 44, 56]); c.ellipse(X, Y, 20, 20, [240, 150, 40], 2); for (let a = 0; a < 8; a++) c.line(X, Y, X + Math.cos(a * 0.785) * 18, Y + Math.sin(a * 0.785) * 18, [130, 144, 170], 2); }
      for (let i = 0; i < 90; i++) { const x = 3 * S + hsh(i, 1, 4) * 24 * S, y = 8 * S + hsh(i, 2, 4) * 32 * S, l = 10 + hsh(i, 3, 4) * 26; c.rect(x, y, 1, l, [255, 255, 255, 80]); c.rect(x + 1, y + 3, 1, l * 0.5, [255, 255, 255, 44]); } });
    k.put(2, 2, 26, 1, (c, X, Y, W, H) => { c.rect(X, Y - 32, W, 48, [70, 74, 84]); c.rect(X, Y + 12, W, 4, [40, 44, 52]); c.rect(X, Y - 32, W, 2, [150, 156, 170]); for (const fx of [W * 0.18, W * 0.5, W * 0.82]) { const cx = X + fx, cy = Y - 9; c.ellipse(cx, cy, 23, 23, INK); c.ellipse(cx, cy, 22, 22, [130, 134, 140]); c.ellipse(cx, cy, 19, 19, [36, 38, 48]); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3 + 0.3; c.poly([[cx, cy], [cx + Math.cos(t) * 18, cy + Math.sin(t) * 18], [cx + Math.cos(t + 0.55) * 17, cy + Math.sin(t + 0.55) * 17]], [150, 150, 130]); } c.ellipse(cx, cy, 6, 6, [120, 50, 50]); c.ellipse(cx, cy, 2, 2, INK); } }, { tall: true });
    for (const [x, y] of shelters) k.put(x, y - 1, 3, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y + 8, W, H - 9, [170, 174, 170], [70, 74, 72]); c.rect(X + 1, Y + 9, W - 2, 3, [214, 218, 214]); for (let s2 = 4; s2 < W - 6; s2 += 14) c.box(X + s2, Y + 15, 10, 8, [196, 200, 196], [120, 124, 122]); }, { rows: 1 });
  },
};

// A rearing stone dragon head, 3 x 3 tiles (used by the League's dragon room).
function dragonHead(c, X, Y, flip, col = [120, 126, 150]) {
  const m = (dx) => X + (flip ? 48 - dx : dx), L = lt(col, 0.3), D = dk(col, 0.4);
  c.ellipse(X + 24, Y + 44, 22, 5, [0, 0, 0, 80]);
  c.poly([[m(4), Y + 46], [m(6), Y + 22], [m(18), Y + 10], [m(30), Y + 46]], D); c.poly([[m(7), Y + 45], [m(9), Y + 24], [m(18), Y + 14], [m(26), Y + 45]], col);
  for (let r = 0; r < 5; r++) c.line(m(9 + r), Y + 26 + r * 4, m(22 + r), Y + 28 + r * 4, D);
  c.poly([[m(10), Y + 22], [m(16), Y + 6], [m(34), Y + 4], [m(46), Y + 14], [m(46), Y + 22], [m(30), Y + 28], [m(16), Y + 28]], D);
  c.poly([[m(12), Y + 21], [m(17), Y + 8], [m(33), Y + 6], [m(44), Y + 15], [m(44), Y + 20], [m(30), Y + 25], [m(17), Y + 26]], col);
  c.line(m(18), Y + 9, m(33), Y + 7, L, 2); c.poly([[m(14), Y + 8], [m(8), Y - 6], [m(20), Y + 5]], D); c.poly([[m(22), Y + 5], [m(20), Y - 8], [m(28), Y + 4]], L);
  c.rect(m(28) - 2, Y + 12, 5, 3, [250, 80, 70]); c.rect(m(28) - 1, Y + 13, 2, 1, [255, 230, 160]); c.line(m(30), Y + 22, m(44), Y + 19, INK);
  for (const dx of [33, 37, 41]) c.poly([[m(dx) - 1, Y + 21], [m(dx) + 1, Y + 21], [m(dx), Y + 25]], WHITE);
  c.rect(m(43) - 1, Y + 14, 2, 2, INK);
}
// Opelucid: Drayden's dark stone hall. Two dragon statues lie head to tail up the middle, a grey one from the door and
// a white one beyond it; the students stand on their claws and Drayden on the white dragon's head. (All flat.)
R.UnovaOpelucidGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const grey = [112, 116, 124], white = [228, 230, 234];
    const k = base(p, T.slab([50, 52, 62]), (c, X, Y, W) => { Wl.brick([44, 46, 58])(c, X, Y, W); }, {}, [240, 150, 40]);
    const limb = (c, pts, w, col) => { const P2 = pts.map(([x, y]) => [x * S + 8, y * S + 8]); for (const [ww, cc] of [[w + 4, dk(col, 0.6)], [w, dk(col, 0.18)], [w - 6, col]]) for (let s = 0; s + 1 < P2.length; s++) { c.line(P2[s][0], P2[s][1], P2[s + 1][0], P2[s + 1][1], cc, ww); c.ellipse(P2[s + 1][0], P2[s + 1][1], ww / 2, ww / 2, cc); } };
    const claw = (c, x, y, col, dir) => { const X = x * S + 8, Y = y * S + 8; c.ellipse(X, Y, 17, 14, dk(col, 0.6)); c.ellipse(X, Y, 15, 12, col); c.ellipse(X, Y, 15, 12, lt(col, 0.3), 1); for (const d of [-9, 0, 9]) c.poly([[X + d - 3, Y + 10], [X + d + 3, Y + 10], [X + d + dir * 2, Y + 24]], lt(col, 0.2)); };
    k.art((c) => {
      // lamps down both walls
      for (const x of [3, 26]) { c.rect(x * S + 2, 4 * S, 12, 30 * S, [30, 32, 40]); for (let y = 4 * S + 4; y < 34 * S; y += 8) { c.rect(x * S + 4, y, 8, 4, [200, 220, 250]); c.rect(x * S + 5, y + 1, 6, 2, WHITE); } }
      // the grey dragon, from the door up to the middle
      limb(c, [[15, 29], [8, 29]], 14, grey); limb(c, [[15, 29], [21, 29]], 14, grey); claw(c, 8, 29, grey, -1); claw(c, 21, 29, grey, 1);
      limb(c, [[15, 35], [15, 25]], 44, grey); for (let y = 25 * S; y < 36 * S; y += 6) c.rect(15 * S - 8, y, 32, 1, dk(grey, 0.2));
      c.poly([[15 * S - 12, 25 * S], [15 * S + 28, 25 * S], [15 * S + 16, 22 * S], [15 * S, 22 * S]], dk(grey, 0.18)); c.ellipse(15 * S + 8, 23 * S + 6, 12, 16, grey); for (const d of [-1, 1]) { c.line(15 * S + 8 + d * 8, 23 * S, 15 * S + 8 + d * 30, 22 * S - 6, lt(grey, 0.2), 3); c.rect(15 * S + 7 + d * 5, 23 * S + 2, 3, 3, [240, 240, 250]); }
      // the white dragon: tail from the middle, body winding up to the head
      limb(c, [[15, 21], [8, 21]], 12, white); limb(c, [[15, 21], [21, 21]], 12, white); limb(c, [[15, 13], [8, 13]], 14, white); limb(c, [[15, 13], [21, 13]], 14, white);
      for (const [x, y, d] of [[8, 21, -1], [21, 21, 1], [8, 13, -1], [21, 13, 1]]) claw(c, x, y, white, d);
      limb(c, [[15, 21.4], [14, 20], [16.5, 18.5], [17, 17], [15, 15]], 20, white); limb(c, [[15, 15], [15, 8]], 44, white);
      for (let y = 8 * S; y < 16 * S; y += 6) c.rect(15 * S - 6, y, 28, 1, dk(white, 0.16));
      c.poly([[15 * S + 8, 22 * S + 12], [15 * S + 2, 21 * S + 6], [15 * S + 14, 21 * S + 6]], white);
      c.ellipse(15 * S + 8, 5 * S + 10, 28, 30, dk(white, 0.6)); c.ellipse(15 * S + 8, 5 * S + 10, 26, 28, white); c.poly([[15 * S - 4, 7 * S + 8], [15 * S + 20, 7 * S + 8], [15 * S + 8, 9 * S]], dk(white, 0.14));
      for (const d of [-1, 1]) c.poly([[15 * S + 8 + d * 14, 4 * S], [15 * S + 8 + d * 30, 2 * S + 6], [15 * S + 8 + d * 22, 5 * S]], lt(white, 0.4));
      for (const q of p.people) if (/control/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 8; c.ellipse(X, Y, 11, 8, [40, 42, 52]); c.ellipse(X, Y, 9, 6, [240, 150, 40], 2); }
    });
  },
};

// Humilau: Marlon's pool. Plank walkways standing in clear water, joined by chains of lily pads; fountains and green
// islets in the water, hanging vines on the glass wall, and his stone platform at the far end.
R.UnovaHumilauGym = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    const k = kit(p), wat = T.water([60, 150, 214]), plank = T.plank([176, 124, 72]), stone = T.check([206, 210, 214], [190, 196, 202], 1);
    p.fill("water", 1, 1, p.W - 2, p.H - 2);
    p.paint(0.005, (c) => { for (let y = 2; y <= 39; y++) for (let x = 2; x <= 29; x++) if (!p.isFloor(x, y)) wat(c, x * S, y * S, x, y); Wl.plain([150, 204, 226], { base: [90, 150, 190], panel: 24 })(c, 2 * S, 0, 28 * S); for (let x = 2 * S + 5; x < 30 * S - 4; x += 11) { const h = 8 + Math.floor(hsh(x, 2, 9) * 20); c.rect(x, 2, 1, h, [40, 120, 70]); for (let y = 4; y < h; y += 4) c.rect(x - 1 + ((y >> 2) & 1) * 2, y, 2, 2, [70, 160, 90]); } });
    const pad = (c, X, Y, x, y) => { wat(c, X, Y, x, y); c.ellipse(X + 8, Y + 9, 8, 7, [30, 100, 80, 120]); c.ellipse(X + 8, Y + 8, 7, 6, [150, 214, 110]); c.ellipse(X + 8, Y + 8, 7, 6, [90, 170, 80], 1); c.poly([[X + 8, Y + 8], [X + 15, Y + 5], [X + 15, Y + 10]], [60, 150, 214]); c.line(X + 8, Y + 8, X + 3, Y + 5, [190, 236, 150]); c.line(X + 8, Y + 8, X + 4, Y + 12, [190, 236, 150]); if (hsh(x, y, 5) > 0.82) { c.ellipse(X + 5, Y + 6, 2, 2, [250, 170, 200]); c.p(X + 5, Y + 6, GOLD); } };
    k.floor((c, X, Y, x, y) => ((y >= 11 && y <= 15) || (y >= 21 && y <= 25) || (y >= 31 && y <= 35) ? plank : y <= 6 || y >= 39 ? stone : pad)(c, X, Y, x, y));
    k.doors({}, [90, 170, 230]);
    k.art((c) => { for (const [y0, y1, x0, x1, col] of [[11, 15, 5, 26, [110, 74, 44]], [21, 25, 5, 26, [110, 74, 44]], [31, 35, 5, 26, [110, 74, 44]], [3, 6, 14, 18, [130, 136, 144]]]) { c.rect(x0 * S, (y1 + 1) * S, (x1 - x0 + 1) * S, 5, col); c.rect(x0 * S, (y1 + 1) * S + 5, (x1 - x0 + 1) * S, 2, [30, 90, 150, 140]); if (y0 > 6) for (let x = x0 * S + 6; x < (x1 + 1) * S; x += 32) c.rect(x, (y1 + 1) * S, 4, 9, dk(col, 0.3)); }
      { const X = 16 * S + 8, Y = 5 * S + 4; c.poly([[X - 22, Y - 14], [X + 22, Y - 14], [X, Y + 18]], [90, 100, 116]); c.poly([[X - 14, Y - 10], [X + 14, Y - 10], [X, Y + 10]], [206, 210, 214]); c.ellipse(X, Y - 4, 9, 7, [60, 130, 200], 3); }
      // fountains and islets out in the water
      for (const [x, y] of [[8, 8], [23, 8], [8, 18], [23, 28]]) { const X = x * S, Y = y * S; c.ellipse(X + 8, Y + 14, 15, 6, [200, 236, 250, 120]); c.box(X - 4, Y - 2, 24, 16, [214, 220, 226], [120, 136, 150]); c.rect(X - 1, Y + 1, 18, 10, [120, 200, 240]); c.box(X + 4, Y - 8, 8, 12, [226, 232, 238], [120, 136, 150]); c.ellipse(X + 8, Y - 9, 6, 3, [220, 244, 255]); c.rect(X + 7, Y - 14, 2, 6, WHITE); }
      for (const [x, y] of [[23, 18], [8, 28]]) { const X = x * S + 8, Y = y * S + 8; c.ellipse(X, Y + 4, 20, 12, [200, 236, 250, 110]); c.ellipse(X, Y + 2, 17, 10, [150, 120, 80]); c.ellipse(X, Y, 15, 8, [100, 180, 90]); for (let a = 0; a < 7; a++) { const t = a * 0.9; c.line(X, Y - 6, X + Math.cos(t) * 14, Y - 8 + Math.sin(t) * 9, [50, 140, 70], 3); } c.ellipse(X + 6, Y + 2, 3, 2, [240, 110, 60]); c.ellipse(X - 7, Y + 3, 3, 2, [240, 110, 60]); }
      for (const q of p.people) if (/lily-pad/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 8; c.ellipse(X, Y, 20, 14, [120, 80, 46], 2); }
      for (let i = 0; i < 46; i++) { const x = 2 + Math.floor(hsh(i, 3, 1) * 28), y = 2 + Math.floor(hsh(i, 3, 2) * 38); if (p.isFloor(x, y) || p.isFloor(x, y - 1) || p.isFloor(x, y + 1)) continue; const X = x * S + 8, Y = y * S + 8; if (i % 3 === 0) { c.ellipse(X, Y, 6, 5, [130, 204, 100]); c.poly([[X, Y], [X + 6, Y - 2], [X + 6, Y + 3]], [60, 150, 214]); if (i % 2) { c.ellipse(X - 1, Y - 1, 3, 3, [250, 170, 200]); c.ellipse(X - 1, Y - 1, 1, 1, GOLD); } } else if (i % 3 === 1) { c.ellipse(X, Y, 7, 3, [255, 255, 255, 90], 1); } else { c.line(X - 3, Y + 5, X - 5, Y - 6, [50, 150, 80]); c.line(X, Y + 5, X, Y - 8, [70, 170, 90]); c.line(X + 3, Y + 5, X + 5, Y - 5, [50, 150, 80]); } } });
  },
};

// ================================================================ the Pokémon League
const shelves = (k, xs, y, wood) => { for (const x of xs) k.put(x, y, 2, 2, (c, X, Y, W, H) => P.bookcase(c, X, Y - 12, W, H + 12, wood)); };
const sideShelves = (k, xs, ys, wood) => { for (const x of xs) for (const y of ys) k.put(x, y, 2, 2, (c, X, Y, W, H) => P.bookcase(c, X, Y, W, H, wood), { rows: 1 }); };
const bookPile = (c, X, Y) => { c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 60]); for (let i = 0; i < 4; i++) { const col = BOOKS[Math.floor(hsh(X, Y, i) * 7)]; c.box(X + 2 + (i & 1), Y + 11 - i * 3, 12, 4, col, dk(col, 0.5)); c.rect(X + 3 + (i & 1), Y + 13 - i * 3, 10, 1, WHITE); } };
// Shauntal: a ghost writer's library. Shelves to the ceiling, a violet runner, candles with cold flames.
R.UnovaLeagueShauntal = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const k = base(p, T.plank([92, 68, 104]), Wl.plain([70, 50, 92], { panel: 16, base: [40, 30, 56] }), {}, [130, 90, 180]);
    k.floor(T.carpet([112, 72, 156]), 11, 7, 15, 23, 0.02);
    k.art((c) => { for (let y = 7; y <= 23; y++) { c.rect(11 * S, y * S, 2, S, GOLD); c.rect(16 * S - 2, y * S, 2, S, GOLD); } const cx = 13 * S + 8, cy = 13 * S + 8; c.ellipse(cx, cy, 44, 34, [70, 44, 110]); c.ellipse(cx, cy, 44, 34, GOLD, 2); c.poly([[cx - 22, cy - 10], [cx, cy - 5], [cx, cy + 14], [cx - 22, cy + 9]], WHITE); c.poly([[cx + 22, cy - 10], [cx, cy - 5], [cx, cy + 14], [cx + 22, cy + 9]], [226, 222, 236]); for (let r = 0; r < 4; r++) { c.line(cx - 19, cy - 5 + r * 4, cx - 3, cy - 1 + r * 4, [150, 140, 170]); c.line(cx + 19, cy - 5 + r * 4, cx + 3, cy - 1 + r * 4, [150, 140, 170]); } c.ellipse(13 * S + 8, 6 * S + 10, 26, 16, [60, 40, 96, 170]); c.ellipse(13 * S + 8, 6 * S + 10, 26, 16, [170, 130, 230], 2); for (let i = 0; i < 9; i++) glow(c, (3 + hsh(i, 1, 9) * 20) * S, (5 + hsh(i, 2, 9) * 17) * S, 12, [150, 110, 240], 12); });
    shelves(k, [2, 4, 6, 8, 17, 19, 21], 2); sideShelves(k, [2, 22], [7, 11, 15, 19]); sideShelves(k, [6, 18], [9, 17]);
    k.put(16, 5, 2, 1, (c, X, Y, W, H) => { P.table(c, X, Y - 6, W, H + 6, [110, 70, 50]); c.box(X + 5, Y - 4, 12, 8, WHITE, [150, 140, 170]); c.rect(X + 11, Y - 4, 1, 8, [150, 140, 170]); c.line(X + 22, Y + 2, X + 27, Y - 9, [250, 250, 250], 1); c.ellipse(X + 22, Y + 3, 2, 2, INK); }, { tall: true });
    for (const [x, y] of [[9, 5], [5, 13], [20, 13], [9, 20], [17, 21], [10, 10], [20, 6]]) k.put(x, y, 1, 1, bookPile);
    for (const [x, y] of [[10, 7], [16, 8], [10, 16], [16, 16], [10, 22], [16, 22]]) tall(k, x, y, 1, P.torch, [150, 130, 250]);
  },
};
// Grimsley: a gambler's den. Black-and-wine tiles, velvet drapes, card tables and a long sofa.
R.UnovaLeagueGrimsley = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const wine = [150, 36, 50];
    const k = base(p, T.check([70, 30, 40], [34, 30, 38], 1), (c, X, Y, W) => { Wl.plain([40, 34, 44], { base: [24, 20, 28] })(c, X, Y, W); for (let x = 0; x + 40 <= W; x += 56) Wl.curtain(c, X + x + 4, Y + 2, 36, 24, wine); const cx = X + W / 2; c.line(cx - 12, Y + 6, cx + 12, Y + 24, [200, 200, 214], 2); c.line(cx + 12, Y + 6, cx - 12, Y + 24, [200, 200, 214], 2); c.rect(cx - 15, Y + 4, 6, 3, GOLD); c.rect(cx + 9, Y + 4, 6, 3, GOLD); }, {}, wine);
    k.floor(T.carpet(wine), 11, 3, 15, 23, 0.02);
    k.art((c) => { for (let y = 3; y <= 23; y++) { c.rect(11 * S, y * S, 2, S, GOLD); c.rect(16 * S - 2, y * S, 2, S, GOLD); } const cx = 13 * S + 8, cy = 13 * S + 8; c.ellipse(cx, cy, 40, 30, [24, 20, 28]); c.ellipse(cx, cy, 40, 30, GOLD, 2); c.poly([[cx, cy - 20], [cx + 14, cy], [cx, cy + 20], [cx - 14, cy]], wine); c.poly([[cx, cy - 12], [cx + 8, cy], [cx, cy + 12], [cx - 8, cy]], [226, 80, 90]);
      for (let i = 0; i < 12; i++) { const x = (3 + hsh(i, 1, 3) * 20) * S, y = (8 + hsh(i, 2, 3) * 14) * S; if (i % 2) { c.box(x, y, 7, 9, WHITE, [90, 90, 100]); c.rect(x + 2, y + 3, 3, 3, i % 4 === 1 ? RED : INK); } else { c.ellipse(x, y, 3, 3, [[226, 60, 60], [60, 110, 200], GOLD][i % 3]); c.ellipse(x, y, 1, 1, WHITE); } } });
    k.put(11, 3, 5, 2, (c, X, Y, W, H) => P.sofa(c, X, Y - 4, W, H + 4, [110, 30, 46]));
    const cards = (c, X, Y) => { c.ellipse(X + 16, Y + 28, 13, 3, [0, 0, 0, 70]); c.rect(X + 14, Y + 16, 4, 12, [70, 46, 36]); c.ellipse(X + 16, Y + 13, 15, 10, [70, 46, 36]); c.ellipse(X + 16, Y + 12, 13, 8, [40, 120, 80]); for (const [dx, dy] of [[-6, -2], [0, 1], [6, -2]]) c.box(X + 14 + dx, Y + 9 + dy, 5, 6, WHITE, [90, 90, 100]); c.ellipse(X + 9, Y + 15, 2, 2, RED); c.ellipse(X + 23, Y + 15, 2, 2, GOLD); };
    for (const [x, y] of [[5, 9], [18, 9], [5, 17], [18, 17]]) { k.put(x, y, 2, 2, cards, { rows: 1 }); k.art((c) => { P.chair(c, (x - 1) * S, y * S + 12, [110, 30, 46]); P.chair(c, (x + 2) * S, y * S + 12, [110, 30, 46]); }, 0.3); }
    k.put(2, 3, 4, 2, (c, X, Y, W, H) => { P.counter(c, X, Y + 8, W, H - 8, [60, 40, 44], [110, 80, 60]); for (let i = 0; i < 6; i++) { const col = [[90, 160, 110], [200, 150, 70], [150, 70, 90]][i % 3]; c.rect(X + 6 + i * 9, Y - 2, 4, 11, col); c.rect(X + 7 + i * 9, Y - 6, 2, 4, col); } });
    k.put(19, 3, 4, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 6, W, H + 4, [50, 40, 46], INK); for (let i = 0; i < 3; i++) { c.box(X + 4 + i * 20, Y - 2, 16, 26, [24, 20, 28], [90, 70, 60]); c.ellipse(X + 12 + i * 20, Y + 8, 5, 5, [[226, 60, 60], GOLD, [110, 200, 130]][i]); c.rect(X + 6 + i * 20, Y + 17, 12, 4, [110, 100, 110]); } });
    for (const [x, y] of [[9, 4], [17, 4], [2, 13], [23, 13], [2, 22], [23, 22], [9, 22], [17, 22]]) tall(k, x, y, 1, P.torch, [240, 90, 90]);
  },
};
// Caitlin: a bedchamber among the stars. A canopy bed, drapes, flowers, a floor of pale stars.
R.UnovaLeagueCaitlin = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const rose = [240, 150, 196], vio = [170, 130, 220];
    const k = base(p, T.check([252, 232, 244], [244, 216, 236], 1), (c, X, Y, W) => { Wl.plain([240, 206, 230], { base: [200, 150, 196] })(c, X, Y, W); for (let x = 0; x + 30 <= W; x += 48) { if (x % 96 === 0) Wl.curtain(c, X + x + 4, Y + 2, 28, 24, vio); else { Wl.window(c, X + x + 6, Y + 5, 24, 18, [60, 50, 110]); star(c, X + x + 12, Y + 11, 3, [255, 250, 200]); c.ellipse(X + x + 23, Y + 16, 3, 3, [255, 250, 220]); } } }, {}, rose);
    k.floor(T.carpet(rose), 11, 5, 15, 23, 0.02);
    k.art((c) => { for (let y = 5; y <= 23; y++) { c.rect(11 * S, y * S, 2, S, WHITE); c.rect(16 * S - 2, y * S, 2, S, WHITE); } for (let i = 0; i < 40; i++) { const x = (2.5 + hsh(i, 1, 6) * 21) * S, y = (5 + hsh(i, 2, 6) * 18) * S; star(c, x, y, 2 + hsh(i, 3, 6) * 3, i % 3 ? [255, 244, 170, 220] : [200, 170, 250, 220]); } const cx = 13 * S + 8, cy = 14 * S; c.ellipse(cx, cy, 42, 32, [250, 240, 250]); c.ellipse(cx, cy, 42, 32, vio, 2); c.ellipse(cx - 4, cy, 16, 16, [250, 230, 150]); c.ellipse(cx + 3, cy - 2, 13, 13, [250, 240, 250]); star(c, cx + 12, cy - 6, 5, vio); });
    k.put(11, 2, 5, 3, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 4, Y + 4, W - 8, H - 6, WHITE, [170, 130, 150]); c.box(X + 12, Y + 8, 24, 10, [255, 240, 250], [220, 180, 210]); c.box(X + 44, Y + 8, 24, 10, [255, 240, 250], [220, 180, 210]); c.box(X + 4, Y + 20, W - 8, H - 22, rose, dk(rose, 0.3)); c.rect(X + 5, Y + 21, W - 10, 3, lt(rose, 0.5)); for (let i = 10; i < W - 10; i += 12) star(c, X + i, Y + 34, 3, WHITE); for (const dx of [2, W - 6]) c.box(X + dx, Y - 16, 4, H + 14, [226, 190, 110], [150, 110, 60]); c.rect(X, Y - 20, W, 8, vio); for (let i = 0; i < W; i += 10) c.ellipse(X + i + 5, Y - 12, 5, 4, vio); c.rect(X, Y - 20, W, 2, lt(vio, 0.4)); for (const dx of [0, W - 10]) { c.rect(X + dx, Y - 12, 10, 30, A(vio, 200)); c.rect(X + dx + 3, Y - 12, 2, 30, A(lt(vio, 0.3), 200)); } });
    k.put(4, 3, 2, 2, (c, X, Y, W, H) => { P.table(c, X, Y + 8, W, H - 8, [240, 226, 236]); c.ellipse(X + 16, Y - 2, 9, 11, [226, 190, 110]); c.ellipse(X + 16, Y - 2, 7, 9, [200, 230, 250]); c.rect(X + 12, Y - 6, 2, 6, WHITE); c.rect(X + 6, Y + 13, 3, 5, rose); c.rect(X + 22, Y + 12, 4, 6, vio); });
    k.put(19, 3, 2, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 1, Y - 12, W - 2, H + 10, [244, 226, 236], [170, 130, 150]); c.rect(X + 15, Y - 10, 1, H + 6, [170, 130, 150]); c.rect(X + 11, Y + 6, 2, 5, GOLD); c.rect(X + 18, Y + 6, 2, 5, GOLD); c.rect(X + 2, Y - 11, W - 4, 2, WHITE); });
    const vase = (c, X, Y, W, H) => { const cx = X + 8, by = Y + H; c.ellipse(cx, by - 2, 5, 2, [0, 0, 0, 50]); c.box(cx - 4, by - 12, 8, 11, [200, 220, 250], [110, 130, 180]); for (const [dx, dy, col] of [[-4, -17, rose], [4, -18, vio], [0, -22, [250, 250, 250]], [-2, -14, [250, 200, 120]]]) { c.rect(cx + dx, by + dy + 2, 1, 6, [90, 160, 100]); c.ellipse(cx + dx, by + dy, 3, 3, col); } };
    for (const [x, y] of [[2, 3], [23, 3], [8, 4], [17, 4], [2, 12], [23, 12], [2, 22], [23, 22]]) tall(k, x, y, 1, vase);
    for (const [x, y, col] of [[5, 9, rose], [19, 10, vio], [6, 18, [250, 226, 150]], [20, 18, rose]]) k.put(x, y, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 14, 6, 2, [0, 0, 0, 50]); c.ellipse(X + 8, Y + 9, 6, 5, col); c.ellipse(X + 8, Y + 3, 4, 4, col); c.ellipse(X + 4, Y, 2, 2, dk(col, 0.15)); c.ellipse(X + 12, Y, 2, 2, dk(col, 0.15)); c.p(X + 6, Y + 3, INK); c.p(X + 10, Y + 3, INK); });
  },
};
// Marshal: a mountain dojo. Planks, a roped ring, sandbags, boulders to break and iron to lift.
R.UnovaLeagueMarshal = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = base(p, T.plank([200, 152, 98]), (c, X, Y, W) => { Wl.plain([170, 120, 76], { panel: 24, base: [100, 66, 44] })(c, X, Y, W); for (let x = 20; x + 14 < W; x += 56) Wl.banner(c, X + x, Y + 4, 14, 24, x % 112 < 56 ? [200, 60, 50] : [240, 236, 226], x % 112 < 56 ? WHITE : [200, 60, 50]); const cx = X + W / 2; c.box(cx - 20, Y + 4, 40, 20, [240, 232, 210], [100, 66, 44]); c.rect(cx - 8, Y + 9, 16, 10, [200, 60, 50]); c.rect(cx - 10, Y + 7, 5, 8, [200, 60, 50]); }, {}, [200, 60, 50]);
    k.floor(T.check([150, 176, 110], [140, 166, 100], 1), 6, 9, 20, 20, 0.02);
    k.art((c) => { frame(c, 6 * S - 3, 9 * S - 3, 15 * S + 6, 12 * S + 6, [200, 60, 50], 3); frame(c, 6 * S, 9 * S, 15 * S, 12 * S, WHITE, 1); c.rect(6 * S, 15 * S - 1, 15 * S, 2, A(WHITE, 200)); c.ellipse(13 * S + 8, 15 * S, 22, 22, A(WHITE, 220), 2); c.ellipse(13 * S + 8, 15 * S, 9, 9, [200, 60, 50]); c.rect(13 * S + 4, 15 * S - 4, 9, 7, WHITE); rug(c, 11, 4, 15, 7, [200, 60, 50], WHITE); });
    const bag = (c, X, Y, W, H) => { const cx = X + 8; c.ellipse(cx, Y + H - 2, 6, 2, [0, 0, 0, 70]); c.rect(cx, Y - 8, 1, 10, [90, 90, 100]); c.box(cx - 5, Y + 2, 10, H - 6, [176, 70, 60], [90, 30, 30]); c.rect(cx - 5, Y + 8, 10, 2, [240, 236, 226]); c.rect(cx - 3, Y + 4, 2, H - 10, [214, 110, 96]); };
    for (const [x, y] of [[4, 5], [7, 4], [19, 4], [22, 5], [3, 22], [23, 22]]) tall(k, x, y, 1, bag);
    for (const [x, y] of [[2, 9], [22, 9], [2, 18], [22, 18]]) k.put(x, y, 2, 2, (c, X, Y, W, H) => P.rock(c, X, Y + 2, W, H - 2, [150, 136, 124]), { rows: 1 });
    for (const [x, y] of [[2, 14], [22, 14]]) k.put(x, y, 2, 1, (c, X, Y) => { c.rect(X + 4, Y + 13, 26, 2, [0, 0, 0, 60]); c.rect(X + 4, Y + 8, 24, 2, [170, 176, 190]); for (const dx of [2, 7, 22, 27]) c.box(X + dx, Y + 2 + (dx === 7 || dx === 22 ? 2 : 0), 4, 14 - (dx === 7 || dx === 22 ? 4 : 0), [50, 50, 60], INK); });
    for (const [x, y] of [[9, 3], [17, 3]]) tall(k, x, y, 1, (c, X, Y, W, H) => { const cx = X + 8; c.ellipse(cx, Y + H - 2, 6, 2, [0, 0, 0, 70]); c.box(cx - 3, Y + 4, 6, H - 6, [190, 144, 90], [86, 58, 36]); for (const [dy, d] of [[8, -1], [14, 1], [20, -1]]) c.rect(cx + (d < 0 ? -9 : 3), Y + dy, 6, 2, [150, 108, 62]); c.ellipse(cx, Y + 3, 4, 4, [190, 144, 90]); });
  },
};
function dragonWall(col, stone = [120, 126, 150], eye = [250, 80, 70]) {
  return (c, X, Y, W) => { Wl.brick(col)(c, X, Y, W); const cx = X + W / 2; for (const d of [-1, 1]) { c.poly([[cx + d * 14, Y + 20], [cx + d * 70, Y + 2], [cx + d * 96, Y + 8], [cx + d * 76, Y + 12], [cx + d * 90, Y + 18], [cx + d * 64, Y + 18], [cx + d * 70, Y + 26], [cx + d * 40, Y + 22]], stone); c.line(cx + d * 14, Y + 20, cx + d * 70, Y + 3, lt(stone, 0.35)); } c.poly([[cx - 16, Y + 28], [cx - 14, Y + 8], [cx - 8, Y + 2], [cx + 8, Y + 2], [cx + 14, Y + 8], [cx + 16, Y + 28]], stone); c.poly([[cx - 10, Y + 6], [cx - 14, Y], [cx - 5, Y + 4]], lt(stone, 0.35)); c.poly([[cx + 10, Y + 6], [cx + 14, Y], [cx + 5, Y + 4]], lt(stone, 0.35)); c.rect(cx - 8, Y + 11, 4, 3, eye); c.rect(cx + 4, Y + 11, 4, 3, eye); c.poly([[cx - 6, Y + 20], [cx + 6, Y + 20], [cx + 4, Y + 28], [cx - 4, Y + 28]], dk(stone, 0.35)); for (const d of [-3, 0, 3]) c.rect(cx + d, Y + 20, 1, 3, WHITE); };
}
// Iris: the Champion's dragon hall. A starlit floor, golden dragons, and steps up to her dais.
R.UnovaLeagueIris = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const mag = [200, 70, 150], gold = [226, 186, 90];
    const k = base(p, T.slab([56, 50, 110]), dragonWall([70, 56, 120], gold, [250, 110, 200]), {}, mag);
    k.floor(T.slab([96, 84, 160]), 8, 2, 22, 8, 0.02); k.floor(T.carpet(mag), 13, 3, 17, 27, 0.021);
    k.art((c) => { for (let i = 0; i < 80; i++) { const x = (2.2 + hsh(i, 1, 2) * 25.5) * S, y = (9.5 + hsh(i, 2, 2) * 18) * S; if (x > 12.5 * S && x < 18.5 * S) continue; if (i % 5 === 0) star(c, x, y, 3, [255, 240, 170]); else c.rect(x, y, 1 + (i & 1), 1 + (i & 1), i % 3 ? [220, 220, 255] : [255, 220, 150]); }
      for (let r = 0; r < 3; r++) { c.rect(8 * S - r * 3, 9 * S + r * 4, 15 * S + r * 6, 4, mix([150, 140, 210], [90, 80, 150], r / 3)); c.rect(8 * S - r * 3, 9 * S + r * 4 + 3, 15 * S + r * 6, 1, [50, 44, 96]); } c.rect(13 * S, 9 * S, 5 * S, 12, A(mag, 200));
      for (let y = 3; y <= 27; y++) { c.rect(13 * S, y * S, 2, S, gold); c.rect(18 * S - 2, y * S, 2, S, gold); }
      const cx = 15 * S + 8, cy = 17 * S + 8; c.ellipse(cx, cy, 56, 42, [40, 34, 90]); c.ellipse(cx, cy, 56, 42, gold, 2); c.ellipse(cx, cy, 44, 32, gold, 1); ball(c, cx, cy, 12, mag); for (let a = 0; a < 8; a++) star(c, cx + Math.cos(a * 0.785) * 50, cy + Math.sin(a * 0.785) * 37, 3, gold);
      c.ellipse(15 * S + 8, 6 * S + 9, 28, 18, [226, 186, 90, 120]); c.ellipse(15 * S + 8, 6 * S + 9, 28, 18, gold, 2); });
    for (const y of [11, 19]) { k.put(4, y, 3, 3, (c, X, Y) => dragonHead(c, X, Y, false, gold), { rows: 1 }); k.put(23, y, 3, 3, (c, X, Y) => dragonHead(c, X, Y, true, gold), { rows: 1 }); }
    for (const [x, y] of [[9, 4], [21, 4], [9, 8], [21, 8], [3, 25], [26, 25]]) tall(k, x, y, 1, P.pillar, [200, 190, 230]);
    for (const [x, y] of [[11, 5], [19, 5], [11, 12], [19, 12], [11, 24], [19, 24], [2, 4], [27, 4], [2, 16], [27, 16]]) tall(k, x, y, 1, P.torch, [250, 120, 210]);
  },
};

// ================================================================ N's Castle (in ruins)
function plasmaMark(c, cx, cy, s = 1) { c.poly([[cx - 8 * s, cy - 9 * s], [cx + 8 * s, cy - 9 * s], [cx + 8 * s, cy + 2 * s], [cx, cy + 10 * s], [cx - 8 * s, cy + 2 * s]], [30, 30, 40]); c.poly([[cx - 6 * s, cy - 7 * s], [cx, cy - 7 * s], [cx, cy + 7 * s], [cx - 6 * s, cy + 1 * s]], WHITE); c.poly([[cx, cy - 7 * s], [cx + 6 * s, cy - 7 * s], [cx + 6 * s, cy + 1 * s], [cx, cy + 7 * s]], [70, 130, 220]); c.rect(cx - 3 * s, cy - 5 * s, 2 * s, 9 * s, [30, 30, 40]); c.rect(cx - 3 * s, cy - 5 * s, 6 * s, 2 * s, [30, 30, 40]); c.rect(cx + 1 * s, cy - 5 * s, 2 * s, 5 * s, [30, 30, 40]); c.rect(cx - 3 * s, cy - 1 * s, 6 * s, 2 * s, [30, 30, 40]); }
const ruinWall = (c, X, Y, W) => { Wl.brick([150, 146, 170])(c, X, Y, W); for (let x = 30; x + 16 < W; x += 72) { c.rect(X + x - 1, Y + 2, 18, 2, GOLD); c.rect(X + x, Y + 4, 16, 16, [50, 80, 170]); c.poly([[X + x, Y + 20], [X + x + 5, Y + 26], [X + x + 8, Y + 21], [X + x + 12, Y + 28], [X + x + 16, Y + 20]], [50, 80, 170]); plasmaMark(c, X + x + 8, Y + 12, 0.6); } for (let x = 8; x < W; x += 40) { const h = hsh(x, Y, 4); c.line(X + x, Y + 4 + h * 10, X + x + 6, Y + 14 + h * 10, [80, 76, 100]); c.line(X + x + 6, Y + 14 + h * 10, X + x + 3, Y + 26, [80, 76, 100]); } };
const brokenPillar = (c, X, Y, W, H) => { const cut = Math.floor(hsh(X, Y, 3) * 14); c.ellipse(X + 8, Y + H - 3, 8, 3, [0, 0, 0, 70]); c.box(X + 2, Y + 4 + cut, 12, H - 8 - cut, [196, 194, 210], [80, 80, 100]); c.rect(X + 4, Y + 5 + cut, 3, H - 10 - cut, [230, 228, 240]); c.box(X, Y + H - 6, 16, 5, [170, 168, 186], [80, 80, 100]); if (cut < 5) c.box(X, Y, 16, 6, [210, 208, 224], [80, 80, 100]); else c.poly([[X + 2, Y + 5 + cut], [X + 6, Y + cut], [X + 9, Y + 4 + cut], [X + 14, Y + 1 + cut], [X + 14, Y + 6 + cut]], [196, 194, 210]); };
function rubble(k, p, n, seed, col = [150, 148, 166]) { for (let i = 0; i < n; i++) { const x = k.L + Math.floor(hsh(i, seed, 1) * (k.R - k.L + 1)), y = k.T + 1 + Math.floor(hsh(i, seed, 2) * (k.B - k.T - 1)); if (Math.abs(x - (p.W >> 1)) < 3) continue; if (i % 3 === 0) k.put(x, y - 1, 2, 2, (c, X, Y, W, H) => P.rock(c, X, Y + 6, W, H - 6, col), { rows: 1 }); else k.put(x, y, 1, 1, (c, X, Y) => P.rock(c, X, Y + 2, 16, 14, col)); } }
const cracks = (p, n, seed, col = [90, 88, 110, 150]) => (c) => { for (let i = 0; i < n; i++) { let x = (p.left + hsh(i, seed, 5) * (p.right - p.left)) * S, y = (p.top + hsh(i, seed, 6) * (p.bottom - p.top)) * S; for (let s2 = 0; s2 < 4; s2++) { const nx = x + (hsh(i, s2, 7) - 0.5) * 16, ny = y + 3 + hsh(i, s2, 8) * 7; c.line(x, y, nx, ny, col); x = nx; y = ny; } } };
const runner = (k, x0, y0, x1, y1, col, trim = GOLD) => { k.floor(T.carpet(col), x0, y0, x1, y1, 0.02); k.art((c) => { if (x1 - x0 < y1 - y0) for (let y = y0; y <= y1; y++) { c.rect(x0 * S, y * S, 2, S, trim); c.rect((x1 + 1) * S - 2, y * S, 2, S, trim); } else for (let x = x0; x <= x1; x++) { c.rect(x * S, y0 * S, S, 2, trim); c.rect(x * S, (y1 + 1) * S - 2, S, 2, trim); } }, 0.1); };
R.UnovaNCastle = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([160, 158, 180]), ruinWall, { all: "arch" }, [50, 80, 170]);
    runner(k, 16, 3, 20, 26, [50, 80, 170]); runner(k, 21, 5, 32, 7, [50, 80, 170]); runner(k, 4, 24, 15, 26, [50, 80, 170]);
    k.art(cracks(p, 40, 2)); k.art((c) => { plasmaMark(c, 18 * S + 8, 14 * S + 8, 2.4); for (let i = 0; i < 60; i++) c.rect((2.5 + hsh(i, 4, 1) * 31) * S, (4 + hsh(i, 4, 2) * 23) * S, 2, 2, [110, 108, 130]); }, 0.25);
    for (const x of [8, 13, 23, 28]) for (const y of [9, 13, 17, 21]) tall(k, x, y, 1, brokenPillar);
    rubble(k, p, 26, 11);
    for (const [x, y] of [[3, 4], [10, 4], [25, 4], [3, 14], [32, 14], [32, 22]]) tall(k, x, y, 1, P.torch, [110, 170, 250]);
  },
};
R.UnovaNCastleMemory = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([160, 158, 180]), (c, X, Y, W) => { ruinWall(c, X, Y, W); for (let x = 60; x + 20 < W; x += 72) Wl.window(c, X + x, Y + 6, 18, 18, [40, 44, 90]); }, { all: "arch" }, [50, 80, 170]);
    runner(k, 13, 7, 17, 22, [50, 80, 170]); runner(k, 4, 6, 17, 8, [50, 80, 170]);
    k.art(cracks(p, 30, 5)); k.art((c) => { plasmaMark(c, 15 * S + 8, 15 * S, 2); }, 0.25);
    for (const x of [10, 20]) for (const y of [11, 15, 19]) tall(k, x, y, 1, brokenPillar);
    for (const [x, y] of [[22, 4], [24, 12], [5, 14], [5, 20]]) k.put(x, y, 3, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 2, Y + 8, W - 4, H - 10, [120, 100, 120], [60, 50, 70]); c.rect(X + 3, Y + 9, W - 6, 3, [170, 150, 170]); c.box(X + 6, Y - 4, 14, 14, [200, 190, 150], [100, 90, 70]); c.ellipse(X + 13, Y + 2, 4, 4, [110, 170, 220]); c.box(X + 26, Y + 1, 12, 9, [226, 110, 110], [110, 50, 50]); c.rect(X + 30, Y - 2, 4, 3, GOLD); });
    rubble(k, p, 16, 23);
    for (const [x, y] of [[2, 4], [8, 4], [27, 4], [27, 22], [2, 22]]) tall(k, x, y, 1, P.torch, [110, 170, 250]);
  },
};
R.UnovaNCastleThrone = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([170, 168, 190]), (c, X, Y, W) => { ruinWall(c, X, Y, W); const cx = X + W / 2; c.poly([[cx - 46, Y + 32], [cx - 50, Y + 12], [cx - 30, Y + 4], [cx - 18, Y - 0], [cx + 8, Y + 3], [cx + 34, Y], [cx + 52, Y + 14], [cx + 44, Y + 32]], [60, 80, 150]); c.poly([[cx - 40, Y + 32], [cx - 42, Y + 14], [cx - 26, Y + 8], [cx - 14, Y + 4], [cx + 8, Y + 8], [cx + 30, Y + 5], [cx + 44, Y + 16], [cx + 38, Y + 32]], [150, 200, 244]); c.ellipse(cx + 14, Y + 16, 9, 4, WHITE); c.ellipse(cx - 18, Y + 22, 11, 4, WHITE); }, {}, [50, 80, 170]);
    k.floor(T.slab([200, 198, 222]), 9, 2, 22, 8, 0.02); runner(k, 14, 2, 18, 23, [50, 80, 170]);
    k.art((c) => { for (let r = 0; r < 3; r++) { c.rect(9 * S - r * 3, 9 * S + r * 4, 14 * S + r * 6, 4, mix([214, 212, 232], [130, 128, 156], r / 3)); c.rect(9 * S - r * 3, 9 * S + r * 4 + 3, 14 * S + r * 6, 1, [90, 88, 110]); } c.rect(14 * S, 9 * S, 5 * S, 12, [50, 80, 170, 210]); plasmaMark(c, 16 * S + 8, 16 * S, 2.2); for (const x of [4, 5, 26, 27]) for (let y = 10; y <= 22; y++) { c.rect(x * S, y * S, S, S, [90, 150, 220, 150]); c.rect(x * S + 3, y * S + 4 + (y & 1) * 5, 6, 1, [200, 230, 250, 200]); } for (const x of [4, 26]) frame(c, x * S - 1, 10 * S - 1, 2 * S + 2, 13 * S + 2, [120, 118, 146], 2); });
    k.art(cracks(p, 30, 8), 0.3);
    k.put(15, 3, 3, 2, (c, X, Y, W, H) => { c.ellipse(X + 24, Y + 30, 22, 4, [0, 0, 0, 70]); c.box(X + 6, Y - 22, 36, 52, [226, 190, 96], [130, 96, 40]); c.box(X + 10, Y - 18, 28, 30, [50, 80, 170], [30, 40, 100]); c.poly([[X + 6, Y - 22], [X + 24, Y - 34], [X + 42, Y - 22]], [226, 190, 96]); c.ellipse(X + 24, Y - 24, 4, 4, [110, 200, 250]); c.box(X + 8, Y + 12, 32, 14, [70, 100, 190], [30, 40, 100]); c.box(X + 2, Y + 4, 8, 24, [226, 190, 96], [130, 96, 40]); c.box(X + 38, Y + 4, 8, 24, [226, 190, 96], [130, 96, 40]); });
    for (const x of [7, 11, 20, 24]) for (const y of [11, 15, 19]) tall(k, x, y + (x === 7 || x === 24 ? 0 : 1), 1, brokenPillar);
    rubble(k, p, 14, 31);
    for (const [x, y] of [[12, 5], [20, 5], [2, 8], [29, 8]]) tall(k, x, y, 1, P.torch, [110, 170, 250]);
  },
};
// N's playroom: sky wallpaper, a toy train going round, a half-pipe, a hoop, blocks and balls left where they fell.
R.UnovaNCastlePlayroom = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const sky = [150, 204, 244];
    const k = base(p, (c, X, Y, x, y) => { T.check([170, 214, 246], [236, 244, 252], 2)(c, X, Y, x, y); }, (c, X, Y, W) => { Wl.plain(sky, { base: [110, 160, 220] })(c, X, Y, W); for (let x = 10; x + 30 < W; x += 46) { const y = Y + 6 + hsh(x, 1, 2) * 10; c.ellipse(X + x + 10, y + 4, 10, 5, WHITE); c.ellipse(X + x + 20, y + 2, 9, 6, WHITE); c.ellipse(X + x + 28, y + 5, 7, 4, WHITE); } const hx = X + 30 * S; c.box(hx, Y + 3, 28, 20, WHITE, [90, 90, 110]); frame(c, hx + 8, Y + 9, 12, 9, RED); c.ellipse(hx + 14, Y + 26, 8, 3, [240, 120, 50], 2); }, {}, [240, 200, 80]);
    k.art((c) => { // the train's loop
      const cx = 20 * S, cy = 14 * S, rx = 13 * S, ry = 7 * S; for (let a = 0; a < 120; a++) { const t = a * Math.PI / 60, x = cx + Math.cos(t) * rx, y = cy + Math.sin(t) * ry; c.rect(x - 4, y - 1, 9, 3, [150, 108, 62]); } c.ellipse(cx, cy, rx + 3, ry + 3, [110, 116, 136], 2); c.ellipse(cx, cy, rx - 3, ry - 3, [110, 116, 136], 2);
      const bx = 28 * S, by = 22 * S; c.rect(bx, by, 10 * S, 9 * S, [240, 170, 90, 200]); frame(c, bx, by, 10 * S, 9 * S, WHITE, 2); c.ellipse(bx + 5 * S, by, 30, 26, WHITE, 2); c.rect(bx + 3 * S, by, 4 * S, 3 * S, [226, 110, 80, 150]); frame(c, bx + 3 * S, by, 4 * S, 3 * S, WHITE, 2);
      rug(c, 4, 6, 11, 11, [250, 190, 210], WHITE); for (let i = 0; i < 26; i++) { const x = (3 + hsh(i, 6, 1) * 35) * S, y = (5 + hsh(i, 6, 2) * 27) * S, col = [[236, 80, 80], [80, 150, 236], [250, 210, 80], [110, 200, 120]][i % 4]; if (i % 3 === 0) ball(c, x, y, 4, col); else c.box(x, y, 7, 7, col, dk(col, 0.4)); } });
    k.put(8, 13, 3, 2, (c, X, Y) => { c.rect(X + 2, Y + 29, 44, 3, [0, 0, 0, 60]); c.box(X + 2, Y + 10, 20, 18, [60, 150, 110], INK); c.box(X + 4, Y + 2, 10, 10, [60, 150, 110], INK); c.rect(X + 6, Y + 4, 6, 5, [200, 236, 250]); c.box(X + 16, Y + 4, 5, 8, [50, 50, 60], INK); c.ellipse(X + 18, Y, 4, 3, [240, 240, 250]); c.box(X + 26, Y + 12, 18, 16, [226, 90, 80], INK); c.rect(X + 22, Y + 22, 4, 2, INK); for (const dx of [7, 17, 31, 40]) { c.ellipse(X + dx, Y + 28, 4, 4, INK); c.ellipse(X + dx, Y + 28, 2, 2, GOLD); } c.rect(X + 2, Y + 18, 20, 2, GOLD); }, { rows: 1 });
    k.put(30, 5, 6, 3, (c, X, Y, W, H) => { c.rect(X + 3, Y + H - 2, W, 4, [0, 0, 0, 60]); c.box(X, Y + 8, W, H - 8, [150, 160, 180], [70, 76, 96]); c.poly([[X + 2, Y + 10], [X + 20, Y + 10], [X + 30, Y + H - 4], [X + W - 30, Y + H - 4], [X + W - 20, Y + 10], [X + W - 2, Y + 10], [X + W - 2, Y + H - 2], [X + 2, Y + H - 2]], [200, 208, 224]); for (let x = 30; x < W - 30; x += 6) c.rect(X + x, Y + H - 8, 1, 6, [150, 160, 180]); c.rect(X, Y + 8, 20, 3, [240, 200, 80]); c.rect(X + W - 20, Y + 8, 20, 3, [240, 200, 80]); c.box(X + 40, Y + H - 12, 16, 4, [226, 90, 80], INK); c.ellipse(X + 43, Y + H - 7, 2, 2, INK); c.ellipse(X + 53, Y + H - 7, 2, 2, INK); });
    k.put(33, 22, 1, 1, (c, X, Y) => ball(c, X + 8, Y + 8, 6, [240, 130, 50]));
    for (const [x, y, col] of [[3, 3, [236, 80, 80]], [5, 3, [80, 150, 236]], [4, 3, [250, 210, 80]], [14, 28, [110, 200, 120]], [15, 28, [236, 80, 80]], [38, 14, [80, 150, 236]], [38, 13, [250, 210, 80]], [22, 3, [110, 200, 120]], [23, 3, [236, 80, 80]]]) k.put(x, y, 1, 1, (c, X, Y) => { c.rect(X + 2, Y + 14, 13, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 1, 14, 13, col, dk(col, 0.45)); c.rect(X + 2, Y + 2, 12, 2, lt(col, 0.4)); frame(c, X + 5, Y + 5, 6, 6, WHITE); });
    k.put(16, 3, 4, 2, (c, X, Y, W, H) => P.bed(c, X + 4, Y - 4, W - 8, H + 2, [110, 190, 150]));
    for (const [x, y, col] of [[12, 4, [250, 220, 90]], [26, 4, [240, 150, 180]], [3, 20, [150, 110, 80]], [20, 30, [240, 240, 240]]]) k.put(x, y, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 14, 6, 2, [0, 0, 0, 50]); c.ellipse(X + 8, Y + 10, 6, 5, col); c.ellipse(X + 8, Y + 4, 4, 4, col); c.ellipse(X + 4, Y + 1, 2, 2, dk(col, 0.2)); c.ellipse(X + 12, Y + 1, 2, 2, dk(col, 0.2)); c.p(X + 6, Y + 4, INK); c.p(X + 10, Y + 4, INK); });
  },
};

// ================================================================ the Plasma Frigate
const HULL = [124, 134, 156], PBLUE = [70, 130, 220];
const shipWall = (c, X, Y, W) => { Wl.plain([96, 106, 130], { panel: 32, base: [60, 66, 86] })(c, X, Y, W); c.rect(X, Y + 5, W, 3, [150, 90, 60]); c.rect(X, Y + 5, W, 1, [210, 150, 110]); c.rect(X, Y + 21, W, 2, PBLUE); for (let x = 16; x < W; x += 64) { c.ellipse(X + x, Y + 14, 6, 6, [50, 54, 70]); c.ellipse(X + x, Y + 14, 4, 4, [90, 170, 220]); c.p(X + x - 2, Y + 12, WHITE); } for (let x = 48; x < W; x += 64) { c.box(X + x - 3, Y + 2, 6, 9, [150, 90, 60], [80, 50, 36]); c.ellipse(X + x, Y + 13, 4, 4, RED, 2); } };
const deckWall = (c, X, Y, W) => { c.rect(X, Y, W, 20, [150, 206, 244]); for (let x = 20; x < W; x += 90) { c.ellipse(X + x, Y + 7, 12, 4, WHITE); c.ellipse(X + x + 10, Y + 5, 9, 4, WHITE); } c.rect(X, Y + 20, W, 12, [50, 110, 190]); for (let x = 0; x < W; x += 9) c.rect(X + x, Y + 23 + (x % 2) * 3, 4, 1, [150, 200, 240]); c.rect(X, Y + 16, W, 2, WHITE); c.rect(X, Y + 23, W, 1, WHITE); for (let x = 0; x < W; x += 8) c.rect(X + x, Y + 16, 2, 16, WHITE); c.rect(X, Y + 30, W, 2, [90, 70, 50]); };
const crates = (k, list, col0) => { const col = col0 || [176, 130, 84]; for (const [x, y, n = 1] of list) { if (n > 1) k.put(x, y - 1, 2, 2, (c, X, Y) => { P.crate(c, X, Y + 14, 16, 18, col); P.crate(c, X + 16, Y + 14, 16, 18, dk(col, 0.12)); P.crate(c, X + 8, Y, 16, 16, lt(col, 0.1)); }, { rows: 1 }); else k.put(x, y, 1, 1, (c, X, Y) => P.crate(c, X, Y, 16, 16, col)); } };
const bunk = (col) => (c, X, Y, W, H) => { P.bed(c, X + 1, Y, W - 2, H, col); c.rect(X + 1, Y - 12, 2, 14, [70, 76, 96]); c.rect(X + W - 3, Y - 12, 2, 14, [70, 76, 96]); c.box(X + 1, Y - 14, W - 2, 6, col, dk(col, 0.4)); };
function hazard(c, x0, y0, x1, y1) { const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S; for (let i = 0; i < w; i += 8) { c.rect(X + i, Y, 4, 2, [240, 200, 60]); c.rect(X + i + 4, Y + h - 2, 4, 2, [240, 200, 60]); } for (let i = 0; i < h; i += 8) { c.rect(X, Y + i, 2, 4, [240, 200, 60]); c.rect(X + w - 2, Y + i + 4, 2, 4, [240, 200, 60]); } }
function frigate(kind, seed) {
  return {
    theme: { room: "arena", floor: "steel", wall: null },
    plan(p) {
      const k = base(p, T.plate(kind === "nav" ? [110, 122, 150] : HULL), p.irregular ? null : kind === "nav" ? (c, X, Y, W) => { shipWall(c, X, Y, W); c.box(X + 40, Y + 3, W - 80, 22, [150, 206, 244], [50, 54, 70]); c.rect(X + 41, Y + 16, W - 82, 8, [50, 110, 190]); for (let x = 40; x < W - 40; x += 48) c.rect(X + x, Y + 3, 3, 22, [50, 54, 70]); } : shipWall, { all: "panel" }, PBLUE);
      const L = k.L, R2 = k.R, T0 = k.T, B = k.B, mx = (L + R2) >> 1, my = (T0 + B) >> 1, h = (i, s) => hsh(i, seed, s);
      k.art((c) => { if (!p.irregular) { plasmaMark(c, mx * S + 8, my * S + 8, 2.4); hazard(c, L + 1, T0 + 1, R2 - 1, B - 1); } for (const q of p.people) if (/frigate|healer/.test(q.script)) { c.ellipse(q.x * S + 8, q.y * S + 9, 14, 10, [60, 70, 96, 150]); c.ellipse(q.x * S + 8, q.y * S + 9, 14, 10, PBLUE, 2); } });
      const edge = (n, col) => { const list = []; for (let i = 0; i < n; i++) { const side = Math.floor(h(i, 1) * 3), t = h(i, 2); list.push(side === 0 ? [L + (i & 1), T0 + 3 + Math.floor(t * (B - T0 - 5)), 1 + (i % 3 === 0)] : side === 1 ? [R2 - 1 - (i & 1), T0 + 3 + Math.floor(t * (B - T0 - 5)), 1 + (i % 3 === 0)] : [L + 2 + Math.floor(t * (R2 - L - 5)), T0 + 1, 1 + (i % 2)]); } crates(k, list, col); };
      if (kind === "hall") { edge(16); for (const [x, y] of [[L, B], [R2, B], [L, T0 + 1], [R2, T0 + 1]]) tall(k, x, y, 1, P.barrel, [90, 110, 150]); }
      else if (kind === "cargo") { edge(22, [150, 150, 170]); for (let i = 0; i < 6; i++) crates(k, [[L + 6 + i * 6, my - 5 + (i & 1) * 9, 2]], i & 1 ? [110, 150, 190] : null); }
      else if (kind === "crew" || kind === "cabin") { const cols = [[70, 110, 190], [90, 96, 120], [60, 130, 150]]; for (let x = L + 4, i = 0; x < R2 - 3; x += kind === "crew" ? 4 : 7, i++) for (const y of kind === "crew" ? [T0 + 5, my + 1, B - 6] : [T0 + 4]) k.put(x, y, 1, 2, bunk(cols[(i + y) % 3])); for (let x = L; x < L + (kind === "crew" ? 6 : 12); x += 2) k.put(x, T0, 1, 2, (c, X, Y, W, H) => { c.box(X + 1, Y - 12, 14, H + 10, [130, 140, 164], [60, 66, 86]); c.rect(X + 3, Y - 8, 10, 2, [60, 66, 86]); c.rect(X + 3, Y - 4, 10, 2, [60, 66, 86]); c.rect(X + 11, Y + 10, 2, 4, GOLD); }); k.put(R2 - 5, T0 + 1, 3, 2, (c, X, Y, W, H) => P.desk(c, X, Y, W, H, [110, 120, 144])); edge(6); if (kind === "cabin") { k.put(mx - 6, my + 4, 3, 2, (c, X, Y, W, H) => P.table(c, X, Y, W, H, [110, 120, 144])); k.art((c) => rug(c, mx - 3, my - 2, mx + 3, my + 2, [50, 70, 130], PBLUE), 0.15); } }
      else if (kind === "mess") { for (let x = L + 5; x < R2 - 6; x += 8) for (const y of [T0 + 8, my + 3, B - 6]) { if (k.put(x, y, 3, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [150, 156, 176]); c.ellipse(X + 12, Y + 9, 4, 2, WHITE); c.ellipse(X + 34, Y + 10, 4, 2, WHITE); c.rect(X + 22, Y + 6, 3, 5, [226, 110, 80]); })) k.art((c) => { P.chair(c, (x - 1) * S, y * S + 10, [90, 100, 130]); P.chair(c, (x + 3) * S, y * S + 10, [90, 100, 130]); }, 0.3); } k.put(L + 3, T0, 8, 2, (c, X, Y, W, H) => { P.counter(c, X, Y, W, H, [130, 140, 164], [200, 206, 220]); for (let i = 8; i < W - 10; i += 18) { c.box(X + i, Y - 3, 12, 6, [90, 96, 110], INK); c.ellipse(X + i + 6, Y - 3, 5, 2, [226, 150, 90]); } }); edge(6); }
      else if (kind === "service") { for (const [x, y, col] of [[L + 3, T0, [120, 200, 250]], [L + 9, T0, [250, 200, 90]], [R2 - 13, T0, [120, 250, 170]], [R2 - 7, T0, [250, 120, 120]]]) k.put(x, y, 3, 3, (c, X, Y, W, H) => P.machine(c, X, Y - 10, W, H + 10, [110, 120, 144], col)); for (const [x, y] of [[L + 6, my + 2], [R2 - 9, my + 2], [mx - 6, B - 7], [mx + 4, T0 + 8]]) k.put(x, y, 2, 3, (c, X, Y, W, H) => P.tank(c, X, Y, W, H, [110, 200, 240]), { rows: 1 }); k.art((c) => { for (const y of [T0 + 5, my, B - 4]) { c.rect((L + 2) * S, y * S + 6, (R2 - L - 3) * S, 3, [150, 90, 60]); c.rect((L + 2) * S, y * S + 6, (R2 - L - 3) * S, 1, [210, 150, 110]); for (let x = L + 4; x < R2 - 2; x += 5) c.box(x * S, y * S + 4, 4, 7, [110, 116, 136], INK); } }, 0.12); edge(8); }
      else if (kind === "nav") { for (let x = L + 3; x + 3 <= R2 - 3; x += 4) k.put(x, T0, 3, 2, (c, X, Y, W, H) => P.console(c, X, Y - 8, W, H + 8, [90, 100, 130], x % 8 ? [110, 220, 250] : [130, 250, 170])); k.put(mx - 1, my - 5, 3, 2, (c, X, Y, W, H) => { c.ellipse(X + 24, Y + 28, 16, 4, [0, 0, 0, 70]); c.box(X + 18, Y + 12, 12, 16, [110, 76, 50], INK); c.ellipse(X + 24, Y + 8, 13, 13, [150, 104, 60], 3); for (let a = 0; a < 8; a++) c.line(X + 24, Y + 8, X + 24 + Math.cos(a * 0.785) * 15, Y + 8 + Math.sin(a * 0.785) * 15, [110, 76, 50]); c.ellipse(X + 24, Y + 8, 3, 3, GOLD); }, { rows: 1 }); k.put(mx - 8, my + 2, 4, 3, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [110, 120, 144]); c.box(X + 6, Y + 5, W - 12, H - 16, [200, 226, 240], [70, 110, 150]); c.line(X + 12, Y + 22, X + 30, Y + 10, RED); c.line(X + 30, Y + 10, X + 50, Y + 18, RED); c.ellipse(X + 40, Y + 22, 6, 4, [150, 200, 130]); }); edge(6); }
      else if (kind === "pipes") { for (const q of p.people) if (/pipes/.test(q.script)) for (const dx of [-3, 2]) k.put(q.x + dx, q.y - 2, 2, 3, (c, X, Y, W, H) => P.tank(c, X, Y, W, H, dx < 0 ? [130, 220, 250] : [250, 170, 110]), { rows: 1 }); k.art((c) => { for (const q of p.people) if (/pipes/.test(q.script)) { c.rect((q.x - 2) * S, q.y * S - 10, 5 * S, 4, [150, 90, 60]); c.rect((q.x - 2) * S, q.y * S - 10, 5 * S, 1, [210, 150, 110]); } }, 0.15); k.put(mx - 3, T0, 6, 2, (c, X, Y, W, H) => P.console(c, X, Y - 8, W, H + 8, [90, 100, 130])); edge(10); }
      else if (kind === "supply") { edge(20, [110, 150, 190]); k.fixtures((s) => (c, X, Y, W, H) => { P.bed(c, X + 2, Y + 8, W - 4, H - 8, PBLUE); c.box(X + 2, Y - 4, W - 4, 12, [90, 96, 120], INK); }); }
      else if (kind === "panels") { k.art((c) => { for (let y = T0; y <= B; y++) for (let x = L; x <= R2; x++) if (p.isFloor(x, y) && (!p.isFloor(x - 1, y) || !p.isFloor(x + 1, y) || !p.isFloor(x, y + 1))) { const X = x * S, Y = y * S; if (!p.isFloor(x, y + 1)) c.rect(X, Y + 13, S, 3, [240, 200, 60]); if (!p.isFloor(x - 1, y)) c.rect(X, Y, 2, S, [240, 200, 60]); if (!p.isFloor(x + 1, y)) c.rect(X + 14, Y, 2, S, [240, 200, 60]); } for (const [x, y] of [[13, 11], [41, 11], [11, 28], [42, 28], [27, 31]]) plasmaMark(c, x * S, y * S, 2); }, 0.12); for (const [x, y] of [[4, 4], [20, 4], [32, 4], [48, 4], [4, 22], [18, 22], [34, 22], [48, 22], [22, 27], [30, 27]]) tall(k, x, y + 1, 1, (c, X, Y, W, H) => P.console(c, X, Y, W, H, [90, 100, 130])); }
    },
  };
}
for (const [n, kind] of [[5, "hall"], [7, "hall"], [8, "crew"], [9, "crew"], [10, "pipes"], [11, "hall"], [12, "cargo"], [13, "panels"], [14, "service"], [15, "supply"], [16, "service"], [17, "nav"], [18, "cabin"], [19, "cabin"], [20, "cabin"], [21, "cabin"], [22, "mess"]]) R["UnovaPlasmaFrigateRoom" + n] = frigate(kind, n);
// The deck: planks under open sky, black sails with the Plasma shield, cannon ports and cargo.
function frigateDeck(masts, guns, stacks) {
  return {
    theme: { room: "arena", floor: "deck", wall: null },
    plan(p) {
      const k = base(p, T.plank([176, 136, 94]), deckWall, { all: "panel" }, PBLUE);
      k.art((c) => { plasmaMark(c, (p.W >> 1) * S + 8, ((k.T + k.B) >> 1) * S + 24, 3); for (let y = k.T; y <= k.B; y++) for (const x of [k.L, k.R]) c.rect(x * S + (x === k.L ? 0 : 12), y * S, 4, S, [96, 106, 130]); });
      for (const [x, y] of masts) k.put(x, y - 6, 2, 7, (c, X, Y, W, H) => { c.ellipse(X + 16, Y + H - 4, 12, 4, [0, 0, 0, 70]); c.box(X + 12, Y - 8, 8, H + 4, [130, 90, 60], [70, 46, 30]); c.rect(X + 14, Y - 6, 2, H, [176, 130, 90]); c.box(X + 8, Y + H - 12, 16, 8, [96, 106, 130], INK); c.rect(X - 22, Y + 2, 76, 3, [110, 76, 50]); c.poly([[X - 20, Y + 5], [X + 52, Y + 5], [X + 46, Y + 58], [X - 14, Y + 58]], [40, 40, 54]); c.poly([[X - 16, Y + 7], [X + 16, Y + 7], [X + 16, Y + 56], [X - 12, Y + 56]], [56, 56, 72]); plasmaMark(c, X + 16, Y + 32, 1.6); c.rect(X - 14, Y + 58, 62, 2, [110, 76, 50]); }, { rows: 1 });
      for (const [x, y] of guns) k.put(x, y, 2, 1, (c, X, Y) => { const f = x < p.W / 2; c.ellipse(X + 16, Y + 13, 13, 3, [0, 0, 0, 70]); c.box(f ? X + 12 : X + 2, Y + 6, 18, 8, [110, 76, 50], INK); c.box(f ? X : X + 8, Y + 3, 24, 8, [60, 62, 76], INK); c.rect(f ? X + 1 : X + 9, Y + 4, 22, 2, [110, 112, 130]); c.ellipse(f ? X + 20 : X + 12, Y + 12, 4, 4, INK); c.ellipse(f ? X + 20 : X + 12, Y + 12, 2, 2, [110, 76, 50]); });
      crates(k, stacks); for (const [x, y] of stacks) tall(k, x + 2, y, 1, P.barrel);
      for (const [x, y] of [[k.L + 1, k.B - 1], [k.R - 2, k.B - 1]]) k.put(x, y, 2, 1, (c, X, Y) => { c.ellipse(X + 16, Y + 9, 12, 6, [150, 120, 80]); c.ellipse(X + 16, Y + 9, 12, 6, [110, 84, 54], 2); c.ellipse(X + 16, Y + 9, 7, 3, [110, 84, 54], 2); });
    },
  };
}
R.UnovaPlasmaFrigate = frigateDeck([[10, 16], [30, 16]], [[2, 8], [2, 14], [2, 22], [38, 10], [38, 18], [38, 24]], [[5, 4], [14, 4], [30, 27], [12, 27], [28, 5]]);
R.UnovaFrigateDriftveil = frigateDeck([[8, 14], [26, 14]], [[2, 8], [2, 18], [32, 8], [32, 18]], [[5, 4], [26, 4], [8, 23], [26, 23]]);
// The barrier room: laser fences cross the hold between their emitters; four switches bring them down.
R.UnovaPlasmaFrigateHold = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const k = base(p, T.plate([104, 112, 136]), shipWall, { all: "panel" }, PBLUE), beams = [[13, 4, 13, 27, [250, 90, 90]], [24, 4, 24, 27, [90, 170, 250]], [4, 15, 33, 15, [250, 220, 90]]];
    k.art((c) => { hazard(c, 3, 3, 34, 28); for (const [x0, y0, x1, y1, col] of beams) { if (x0 === x1) { c.rect(x0 * S + 5, y0 * S, 6, (y1 - y0 + 1) * S, A(col, 60)); c.rect(x0 * S + 7, y0 * S, 2, (y1 - y0 + 1) * S, A(lt(col, 0.5), 220)); } else { c.rect(x0 * S, y0 * S + 5, (x1 - x0 + 1) * S, 6, A(col, 60)); c.rect(x0 * S, y0 * S + 7, (x1 - x0 + 1) * S, 2, A(lt(col, 0.5), 220)); } }
      for (const q of p.people) { const X = q.x * S, Y = q.y * S; c.box(X - 6, Y - 4, 28, 26, [60, 66, 86], INK); frame(c, X - 4, Y - 2, 24, 22, /engine/.test(q.script) ? [250, 220, 90] : [110, 230, 250]); } });
    for (const [x0, y0, x1, y1, col] of beams) for (const [x, y] of [[x0, y0], [x1, y1]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.box(X + 4, Y + 2, 8, H - 4, [70, 76, 96], INK); c.rect(X + 6, Y + 4, 2, H - 8, [150, 156, 176]); c.ellipse(X + 8, Y + 4, 4, 4, col); c.ellipse(X + 7, Y + 3, 1, 1, WHITE); });
    crates(k, [[3, 4, 2], [16, 4, 2], [20, 4, 2], [3, 25, 2], [26, 27, 2], [9, 27, 2], [27, 4, 1], [17, 10, 1], [20, 22, 1]]);
    for (const [x, y] of [[2, 12], [35, 12], [2, 18], [35, 18]]) tall(k, x, y, 1, P.barrel, [90, 110, 150]);
  },
};
// The power room: four humming generators cabled to a glowing core.
R.UnovaPlasmaFrigateEngine = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const k = base(p, T.plate([96, 104, 128]), shipWall, { all: "panel" }, PBLUE), gens = [[6, 8], [24, 8], [6, 17], [24, 17]];
    k.art((c) => { hazard(c, 3, 3, 30, 26); for (const [x, y] of gens) { c.line((x + 2) * S, (y + 2) * S, 17 * S, 13 * S, [40, 40, 54], 4); c.line((x + 2) * S, (y + 2) * S, 17 * S, 13 * S, [250, 220, 90], 1); } glow(c, 17 * S, 13 * S, 60, [110, 230, 250], 18); });
    for (const [x, y] of gens) k.put(x, y, 4, 4, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y + 4, W, H - 5, [110, 120, 144], INK); c.rect(X + 1, Y + 5, W - 2, 3, [176, 186, 206]); for (let i = 6; i < W - 6; i += 6) c.rect(X + i, Y + 12, 3, H - 22, [70, 76, 96]); c.ellipse(X + W / 2, Y + H / 2 + 2, 14, 14, INK); c.ellipse(X + W / 2, Y + H / 2 + 2, 12, 12, [250, 220, 90]); c.ellipse(X + W / 2, Y + H / 2 + 2, 7, 7, [255, 250, 200]); bolt(c, X + W / 2, Y + H / 2 + 2, 1, [240, 150, 40]); for (const dx of [6, W - 10]) c.box(X + dx, Y - 6, 4, 12, [150, 90, 60], INK); }, { rows: 3 });
    k.put(15, 10, 4, 4, (c, X, Y, W, H) => { c.ellipse(X + 32, Y + H - 4, 28, 6, [0, 0, 0, 70]); c.box(X + 6, Y + H - 14, W - 12, 12, [70, 76, 96], INK); c.rect(X + 14, Y - 6, 36, H - 6, [110, 230, 250, 200]); c.rect(X + 14, Y - 6, 4, H - 6, A(WHITE, 170)); frame(c, X + 13, Y - 7, 38, H - 4, [60, 70, 96]); c.ellipse(X + 32, Y + 20, 10, 16, [200, 250, 255]); c.ellipse(X + 32, Y + 20, 5, 9, WHITE); c.box(X + 6, Y - 12, W - 12, 8, [70, 76, 96], INK); }, { rows: 2 });
    crates(k, [[3, 4, 2], [12, 4, 2], [20, 4, 2], [3, 24, 1], [30, 13, 1], [2, 13, 1], [11, 26, 2], [21, 26, 2]]);
  },
};
// Colress's laboratory: banks of consoles, specimen tanks, and his machine on its dais.
R.UnovaPlasmaFrigateLab = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const k = base(p, T.check([214, 222, 236], [196, 206, 224], 1), (c, X, Y, W) => { shipWall(c, X, Y, W); for (let x = 30; x + 40 < W; x += 70) Wl.screen(c, X + x, Y + 3, 40, 20, [40, 90, 130], (c2, cx, cy) => { for (let i = -16; i < 16; i += 3) c2.rect(cx + i, cy + Math.sin(i * 0.5 + x) * 5, 2, 2, [130, 250, 220]); }); }, { all: "panel" }, PBLUE);
    k.art((c) => { const cx = 15 * S + 8, cy = 14 * S; c.ellipse(cx, cy, 70, 46, [150, 170, 210, 150]); c.ellipse(cx, cy, 70, 46, PBLUE, 2); c.ellipse(cx, cy, 54, 34, [110, 230, 250], 1); plasmaMark(c, cx, cy, 2.2); for (const q of p.people) { c.ellipse(q.x * S + 8, q.y * S + 9, 16, 11, [90, 100, 130]); c.ellipse(q.x * S + 8, q.y * S + 9, 16, 11, [110, 230, 250], 2); } });
    for (const x of [2, 5, 8, 18, 21]) k.put(x, 2, 3, 2, (c, X, Y, W, H) => P.console(c, X, Y - 8, W, H + 8, [90, 100, 130], x % 2 ? [110, 220, 250] : [130, 250, 170]));
    for (const [x, y, col] of [[3, 9, [130, 230, 170]], [6, 9, [240, 170, 220]], [23, 10, [130, 200, 250]], [26, 10, [250, 220, 130]], [3, 18, [130, 200, 250]], [26, 18, [130, 230, 170]]]) k.put(x, y - 1, 2, 3, (c, X, Y, W, H) => P.tank(c, X, Y, W, H, col), { rows: 1 });
    for (const [x, y] of [[7, 15], [20, 16]]) k.put(x, y, 4, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [150, 160, 184]); for (let i = 0; i < 4; i++) { const col = [[130, 230, 170], [240, 130, 130], [130, 170, 250], [250, 220, 130]][i]; c.rect(X + 8 + i * 13, Y, 5, 9, A(col, 220)); c.rect(X + 9 + i * 13, Y - 4, 3, 4, [220, 230, 240]); } });
    k.put(12, 2, 5, 2, (c, X, Y, W, H) => { P.machine(c, X, Y - 12, W, H + 12, [110, 120, 150], [250, 110, 110]); for (const dx of [8, W - 12]) { c.rect(X + dx, Y - 22, 3, 12, [150, 156, 176]); c.ellipse(X + dx + 1, Y - 23, 3, 3, [250, 220, 90]); } });
    crates(k, [[2, 22, 1], [27, 22, 1], [27, 14, 1]]);
  },
};
// The Shadow Triad's chamber: unlit, three pools of cold light.
R.UnovaPlasmaFrigateTriad = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const k = base(p, T.slab([50, 52, 74]), (c, X, Y, W) => { Wl.plain([44, 46, 66], { panel: 32, base: [26, 26, 40] })(c, X, Y, W); for (let x = 24; x + 14 < W; x += 64) { Wl.banner(c, X + x, Y + 3, 16, 26, [30, 30, 44], [70, 130, 220]); } }, { 1: "arch", all: "panel" }, [90, 80, 150]);
    runner(k, 14, 5, 18, 25, [70, 60, 120], [150, 150, 190]);
    k.art((c) => { for (const q of p.people) { const X = q.x * S + 8, Y = q.y * S + 9; glow(c, X, Y, 44, [150, 170, 250], 20); c.ellipse(X, Y, 20, 14, [30, 30, 50]); c.ellipse(X, Y, 20, 14, [150, 170, 250], 2); } plasmaMark(c, 16 * S + 8, 16 * S, 2.6); });
    for (const x of [6, 11, 21, 26]) for (const y of [13, 18, 23]) tall(k, x, y, 1, P.pillar, [90, 94, 124]);
    for (const [x, y] of [[2, 4], [29, 4], [12, 5], [20, 5], [2, 24], [29, 24]]) tall(k, x, y, 1, P.torch, [150, 170, 250]);
  },
};

// ================================================================ labs, homes, offices
function labRoom(o) {
  return {
    theme: { room: "arena", floor: "rLab", wall: null },
    plan(p) {
      const k = base(p, T.check(o.a || [234, 238, 242], o.b || [216, 224, 232], 1), (c, X, Y, W) => { Wl.plain(o.wall || [200, 226, 226], { base: [130, 160, 170] })(c, X, Y, W); for (let x = 16; x + 26 < W; x += 80) Wl.window(c, X + x, Y + 6, 24, 16); for (let x = 54; x + 30 < W; x += 80) Wl.shelf(c, X + x, Y + 8, 30); }, o.doors || {}, o.mat || [90, 170, 200]);
      o.plan(p, k);
    },
  };
}
// Juniper's lab: the starter table, her machines and shelves of research.
R.UnovaJuniperLab = labRoom({ plan(p, k) {
  k.art((c) => { rug(c, 10, 9, 18, 15, [110, 190, 200], WHITE); ball(c, 14 * S + 8, 12 * S + 8, 10); });
  shelves(k, [2, 4, 22, 24], 2, [150, 150, 170]);
  k.put(7, 2, 3, 2, (c, X, Y, W, H) => P.machine(c, X, Y - 12, W, H + 12, [150, 170, 190], [110, 230, 250]));
  k.put(12, 3, 5, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [200, 206, 220]); for (let i = 0; i < 3; i++) ball(c, X + 20 + i * 20, Y + 10, 5); });
  k.put(17, 2, 3, 2, (c, X, Y, W, H) => P.desk(c, X, Y + 4, W, H - 4, [170, 176, 196]));
  for (const [x, y] of [[4, 9], [20, 15]]) k.put(x, y, 4, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [200, 206, 220]); c.box(X + 6, Y + 4, 14, 10, WHITE, [150, 150, 160]); c.rect(X + 30, Y, 5, 10, [130, 230, 170, 220]); c.rect(X + 40, Y + 2, 5, 8, [240, 130, 130, 220]); c.box(X + 50, Y + 2, 9, 9, [50, 54, 70], INK); });
  for (const [x, y] of [[2, 5], [25, 5], [2, 21], [25, 21]]) tall(k, x, y, 1, P.plant);
  crates(k, [[2, 15, 2], [24, 10, 1], [5, 19, 1]]);
} });
// The P2 Laboratory: Genesect's cradle, drive cassettes on the bench, cold steel.
R.UnovaP2Laboratory = labRoom({ a: [176, 186, 204], b: [160, 170, 190], wall: [110, 124, 150], mat: [150, 90, 200], plan(p, k) {
  k.art((c) => { hazard(c, 3, 3, 24, 20); const cx = 14 * S + 8, cy = 6 * S + 9; c.ellipse(cx, cy, 38, 22, [70, 76, 100]); c.ellipse(cx, cy, 38, 22, [190, 110, 240], 2); for (const q of p.people) if (/gene|event/.test(q.script)) { c.ellipse(q.x * S + 8, q.y * S + 9, 13, 9, [70, 76, 100]); c.ellipse(q.x * S + 8, q.y * S + 9, 13, 9, [190, 110, 240], 1); } });
  k.put(12, 2, 5, 2, (c, X, Y, W, H) => { P.machine(c, X, Y - 14, W, H + 14, [110, 110, 140], [190, 110, 240]); c.rect(X + 6, Y - 20, 4, 8, [150, 156, 176]); c.rect(X + W - 10, Y - 20, 4, 8, [150, 156, 176]); });
  for (const x of [3, 6, 20, 23]) k.put(x, 2, 2, 3, (c, X, Y, W, H) => P.tank(c, X, Y - 6, W, H + 6, [190, 130, 240]), { rows: 2 });
  for (const [x, y, col] of [[4, 11, [250, 220, 90]], [10, 11, [250, 110, 90]], [15, 11, [110, 170, 250]], [20, 11, [200, 240, 255]]]) k.put(x, y, 3, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [130, 140, 164]); c.box(X + 14, Y + 2, 20, 10, col, INK); c.rect(X + 18, Y + 5, 12, 3, [40, 40, 54]); });
  for (const [x, y] of [[3, 17], [22, 16]]) k.put(x, y, 3, 2, (c, X, Y, W, H) => P.console(c, X, Y - 6, W, H + 6, [90, 96, 124], [190, 110, 240]));
  crates(k, [[2, 21, 1], [10, 20, 2], [18, 20, 1]], [130, 140, 164]);
} });
R.UnovaSeasonalResearchLab = labRoom({ wall: [214, 226, 200], plan(p, k) {
  k.art((c) => { const cx = 12 * S, cy = 11 * S; for (let q = 0; q < 4; q++) { const col = [[250, 170, 200], [110, 200, 110], [240, 150, 60], [220, 236, 250]][q]; c.rect(cx + (q & 1 ? 0 : -48), cy + (q & 2 ? 0 : -40), 48, 40, A(col, 170)); } frame(c, cx - 48, cy - 40, 96, 80, WHITE, 2); c.rect(cx - 1, cy - 40, 2, 80, WHITE); c.rect(cx - 48, cy - 1, 96, 2, WHITE); });
  shelves(k, [2, 4, 18, 20], 2, [150, 150, 170]); k.put(8, 2, 3, 2, (c, X, Y, W, H) => P.machine(c, X, Y - 10, W, H + 10, [150, 170, 190], [250, 200, 110]));
  for (const [x, y, leaf] of [[3, 7, [240, 150, 190]], [20, 7, [90, 180, 100]], [3, 15, [230, 140, 60]], [20, 15, [220, 236, 250]]]) tall(k, x, y, 1, P.plant, leaf);
  k.put(14, 3, 3, 1, (c, X, Y, W, H) => P.desk(c, X, Y - 4, W, H + 4, [170, 176, 196]), { tall: true });
} });
function homeRoom(o) {
  return {
    theme: { room: "arena", floor: "rHouse", wall: null },
    plan(p) {
      const k = base(p, T.plank(o.floor || [226, 190, 136]), (c, X, Y, W) => { Wl.plain(o.wall || [244, 232, 206], { base: [170, 120, 80], rail: o.rail })(c, X, Y, W); for (const x of o.windows || []) Wl.window(c, X + x * S, Y + 6, 28, 17); for (const [x, col, d] of o.pictures || []) Wl.picture(c, X + x * S, Y + 6, 20, 16, col, d); }, o.doors || {}, o.mat || RED);
      o.plan(p, k);
    },
  };
}
const kitchen = (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 2, W, H + 1, [236, 232, 224], [130, 120, 110]); c.rect(X, Y - 2, W, 6, [200, 206, 214]); c.box(X + 6, Y - 1, 18, 5, [150, 170, 190], [90, 100, 120]); c.rect(X + 14, Y - 8, 2, 7, [150, 156, 170]); c.box(X + 34, Y - 1, 20, 5, [60, 60, 70], INK); c.ellipse(X + 39, Y + 1, 3, 2, [226, 90, 70]); c.ellipse(X + 49, Y + 1, 3, 2, [226, 90, 70]); for (let i = 4; i < W - 8; i += 18) { c.box(X + i, Y + 8, 14, H - 12, [244, 240, 232], [170, 160, 150]); c.rect(X + i + 10, Y + 14, 2, 4, [130, 120, 110]); } };
const fridge = (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 1, Y - 12, W - 2, H + 11, [226, 236, 244], [110, 126, 146]); c.rect(X + 2, Y + 2, W - 4, 1, [110, 126, 146]); c.rect(X + W - 6, Y - 6, 2, 6, [110, 126, 146]); c.rect(X + W - 6, Y + 6, 2, 8, [110, 126, 146]); };
const tv = (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 2, Y + 14, W - 4, H - 15, [130, 96, 66], [70, 50, 36]); c.box(X, Y - 8, W, 22, [40, 42, 54], INK); c.rect(X + 2, Y - 6, W - 4, 17, [90, 170, 230]); c.rect(X + 3, Y - 5, 8, 3, [190, 226, 250]); c.box(X + 6, Y + 18, 10, 5, WHITE, [150, 150, 160]); };
const stairsUp = (c, X, Y, W, H) => { c.box(X, Y - 10, W, H + 10, [150, 110, 76], [80, 56, 40]); for (let s2 = 0; s2 < H + 6; s2 += 5) { c.rect(X + 2, Y - 8 + s2, W - 4, 4, mix([120, 86, 58], [214, 176, 130], s2 / (H + 6))); c.rect(X + 2, Y - 4 + s2, W - 4, 1, [80, 56, 40]); } c.rect(X, Y - 12, 3, H + 12, [110, 76, 50]); c.rect(X + W - 3, Y - 12, 3, H + 12, [110, 76, 50]); };
// The player's home in Aspertia.
R.UnovaHome = homeRoom({ windows: [9.5], pictures: [[13, [150, 200, 240], (c, x, y) => c.ellipse(x, y + 2, 6, 3, [110, 190, 110])]], plan(p, k) {
  k.art((c) => { rug(c, 5, 9, 11, 12, [110, 170, 120], WHITE); rug(c, 12, 5, 15, 7, [226, 130, 110], WHITE); });
  k.fixtures((s) => s.w === 3 ? (c, X, Y, W, H) => P.cloth(c, X, Y, W, H, [250, 244, 230]) : null);
  k.art((c) => { for (const [x, y] of [[6, 10], [10, 10], [6, 11], [10, 11]]) P.chair(c, x * S, y * S, [176, 124, 80]); }, 0.3);
  k.put(2, 2, 4, 2, kitchen); k.put(6, 2, 1, 2, fridge); k.put(12, 2, 2, 2, tv); k.put(16, 2, 2, 3, stairsUp);
  k.put(13, 8, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, [90, 140, 200]));
  for (const [x, y] of [[2, 14], [17, 14], [15, 2]]) tall(k, x, y + (y === 2 ? 1 : 0), 1, P.plant);
  k.put(2, 6, 2, 2, (c, X, Y, W, H) => P.bookcase(c, X, Y, W, H), { rows: 1 });
} });
R.UnovaNuvemaHome = homeRoom({ floor: [214, 180, 130], wall: [226, 236, 226], windows: [5, 14], plan(p, k) {
  k.art((c) => { rug(c, 9, 9, 17, 14, [200, 110, 100], WHITE); });
  k.put(2, 2, 4, 2, kitchen); k.put(6, 2, 1, 2, fridge); k.put(9, 2, 2, 2, tv); k.put(22, 2, 2, 3, stairsUp);
  k.put(14, 10, 3, 3, (c, X, Y, W, H) => P.cloth(c, X, Y, W, H, [250, 244, 230]));
  k.art((c) => { for (const [x, y] of [[13, 11], [17, 11]]) P.chair(c, x * S, y * S, [176, 124, 80]); }, 0.3);
  k.put(3, 12, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, [110, 170, 120]));
  sideShelves(k, [2], [7]); sideShelves(k, [22], [9]);
  for (const [x, y] of [[2, 19], [23, 19], [17, 3]]) tall(k, x, y, 1, P.plant);
} });
// Alder's house in Floccesy: a training hall for his two pupils.
R.UnovaAlderHouse = homeRoom({ floor: [200, 156, 104], wall: [226, 206, 170], rail: [150, 100, 60], windows: [3, 21], pictures: [[9, [240, 232, 210], (c, x, y) => c.rect(x - 1, y - 5, 2, 10, INK)], [17, [240, 232, 210], (c, x, y) => c.rect(x - 4, y - 1, 8, 2, INK)]], plan(p, k) {
  k.art((c) => { court(c, 6, 9, 21, 18, [226, 200, 150, 200], [150, 60, 50]); rug(c, 12, 3, 16, 6, [220, 110, 60]); });
  k.fixtures((s) => s.w === 2 ? (c, X, Y, W, H) => P.table(c, X, Y, W, H, [150, 104, 66]) : null);
  shelves(k, [6, 19], 2); k.put(12, 2, 4, 1, (c, X, Y, W, H) => { c.box(X, Y - 14, W, H + 12, [150, 110, 96], [80, 54, 44]); c.box(X + 12, Y - 6, W - 24, H + 4, [40, 30, 30], [80, 54, 44]); c.poly([[X + 24, Y + 12], [X + 32, Y - 2], [X + 40, Y + 12]], [240, 130, 50]); c.poly([[X + 28, Y + 12], [X + 32, Y + 4], [X + 36, Y + 12]], [250, 220, 100]); c.rect(X, Y - 14, W, 3, [200, 160, 140]); });
  for (const [x, y] of [[2, 9], [24, 9], [2, 15], [24, 15]]) k.put(x, y, 2, 2, (c, X, Y, W, H) => P.rock(c, X, Y + 2, W, H - 2, [150, 136, 124]), { rows: 1 });
  for (const [x, y] of [[2, 4], [25, 4], [2, 22], [25, 22]]) tall(k, x, y, 1, P.plant);
  for (const [x, y] of [[9, 21], [18, 21]]) tall(k, x, y, 1, P.barrel);
} });
// The Battle Company: an open-plan office of desks and screens, and the boss's floor above.
const skyline = (col) => (c, X, Y, W) => { Wl.plain(col, { base: dk(col, 0.4) })(c, X, Y, W); for (let x = 8; x + 40 < W; x += 52) { c.box(X + x, Y + 4, 40, 20, [150, 206, 244], [70, 76, 96]); for (let b = 0; b < 40; b += 7) { const h = 5 + Math.floor(hsh(x + b, 3, 1) * 12); c.rect(X + x + 1 + b, Y + 23 - h, 5, h, [110, 130, 170]); c.p(X + x + 2 + b, Y + 25 - h, [250, 240, 170]); } c.rect(X + x + 19, Y + 4, 1, 20, [70, 76, 96]); } };
function office(o) {
  return {
    theme: { room: "arena", floor: "rLab", wall: null },
    plan(p) { const k = base(p, T.check(o.a || [150, 164, 190], o.b || [140, 154, 180], 1), skyline(o.wall || [200, 206, 220]), o.doors || { all: "stairs" }, o.mat || [70, 110, 190]); o.plan(p, k); },
  };
}
const workDesk = (c, X, Y, W, H) => P.desk(c, X, Y + 2, W, H - 2, [200, 206, 220]);
R.UnovaBattleCompany = office({ plan(p, k) {
  k.art((c) => { rug(c, 9, 15, 15, 18, [70, 110, 190], WHITE); ball(c, 12 * S + 8, 17 * S, 8); });
  for (const x of [3, 8, 14]) for (const y of [4, 9, 13]) if (k.put(x, y, 3, 2, workDesk)) k.art((c) => P.chair(c, (x + 1) * S, (y + 2) * S - 2, [60, 70, 100]), 0.3);
  k.put(2, 2, 2, 2, (c, X, Y, W, H) => P.machine(c, X, Y - 8, W, H + 8, [226, 230, 240], [110, 200, 250]));
  for (const [x, y] of [[21, 3], [2, 19], [21, 19], [16, 3]]) tall(k, x, y, 1, P.plant);
  k.put(20, 9, 1, 2, (c, X, Y, W, H) => { c.box(X + 2, Y + 8, 12, H - 9, [226, 230, 240], [110, 126, 146]); c.box(X + 3, Y - 6, 10, 15, [130, 200, 250, 220], [70, 110, 170]); c.rect(X + 5, Y + 14, 3, 3, RED); });
} });
R.UnovaBattleCompanyUpper = office({ a: [150, 60, 60], b: [140, 54, 54], wall: [226, 214, 190], plan(p, k) {
  k.art((c) => { rug(c, 12, 8, 22, 14, [60, 70, 110], GOLD); });
  k.put(15, 4, 5, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [110, 70, 46]); c.box(X + 30, Y - 6, 16, 12, [50, 54, 70], INK); c.rect(X + 32, Y - 4, 12, 8, [110, 190, 236]); c.box(X + 8, Y + 5, 12, 8, WHITE, [150, 150, 160]); c.ellipse(X + 62, Y + 8, 5, 4, GOLD); });
  shelves(k, [2, 4, 22, 24], 2); k.put(8, 2, 3, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 8, W, H + 6, [130, 90, 60], [70, 46, 30]); c.rect(X + 2, Y - 6, W - 4, 12, [226, 236, 244, 120]); for (let i = 0; i < 3; i++) { c.rect(X + 8 + i * 14, Y - 2, 6, 8, GOLD); c.ellipse(X + 11 + i * 14, Y - 3, 4, 3, GOLD); c.rect(X + 9 + i * 14, Y + 6, 4, 2, [130, 96, 40]); } });
  for (const [x, y] of [[5, 10], [5, 16]]) k.put(x, y, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, [60, 70, 110]));
  k.put(9, 13, 2, 2, (c, X, Y, W, H) => P.table(c, X, Y, W, H, [110, 70, 46]));
  for (const [x, y] of [[2, 5], [25, 5], [2, 21], [25, 21], [13, 3], [21, 3]]) tall(k, x, y, 1, P.plant);
} });

// ================================================================ Nimbasa, Driftveil and the show business
const crowdWall = (cols, seed = 1) => (c, X, Y, W) => { c.rect(X, Y, W, 32, [40, 42, 58]); for (let r = 0; r < 3; r++) { const y = Y + r * 9; c.rect(X, y, W, 9, r & 1 ? [62, 64, 86] : [52, 54, 74]); for (let x = X + 2 + (r & 1) * 3; x < X + W - 5; x += 6) { if (hsh(x, y, seed) < 0.12) continue; c.rect(x, y + 4, 4, 4, cols[Math.floor(hsh(x, y, seed + 1) * cols.length) % cols.length]); c.rect(x + 1, y + 2, 2, 2, [240, 208, 176]); } } c.rect(X, Y + 27, W, 5, [196, 198, 212]); c.rect(X, Y + 27, W, 1, WHITE); };
// Gear Station: the round concourse, its floor a great cog, the seven lines' gates along the wall.
R.UnovaGearStation = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const lines = [[110, 200, 110], [90, 150, 230], [230, 90, 90], [240, 200, 80], [170, 110, 220], [240, 150, 80], [110, 210, 220]];
    const k = base(p, T.check([236, 226, 200], [222, 208, 178], 1), (c, X, Y, W) => { Wl.plain([150, 130, 110], { base: [90, 76, 66] })(c, X, Y, W); lines.forEach((col, i) => { const x = X + 14 + i * (W - 28) / 7 + (i > 2 ? 10 : -6); c.box(x, Y + 6, 30, 26, [40, 36, 44], [90, 76, 66]); c.rect(x + 2, Y + 8, 26, 5, col); c.rect(x + 12, Y + 14, 6, 18, [70, 66, 80]); c.rect(x + 3, Y + 16, 8, 14, [24, 22, 30]); c.rect(x + 19, Y + 16, 8, 14, [24, 22, 30]); }); c.box(X + W / 2 - 22, Y, 44, 9, [30, 30, 40], INK); for (let i = 0; i < 9; i++) c.rect(X + W / 2 - 19 + i * 4, Y + 3, 2, 3, [250, 190, 70]); }, { all: "stairs" }, [150, 110, 70]);
    k.art((c) => { const cx = 14 * S, cy = 12 * S + 8; c.ellipse(cx, cy, 132, 100, [200, 176, 130, 110]); c.ellipse(cx, cy, 132, 100, [150, 110, 70], 3); for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; c.poly([[cx + Math.cos(t - 0.1) * 84, cy + Math.sin(t - 0.1) * 64], [cx + Math.cos(t - 0.07) * 104, cy + Math.sin(t - 0.07) * 80], [cx + Math.cos(t + 0.07) * 104, cy + Math.sin(t + 0.07) * 80], [cx + Math.cos(t + 0.1) * 84, cy + Math.sin(t + 0.1) * 64]], [170, 130, 84]); } c.ellipse(cx, cy, 88, 66, [170, 130, 84]); c.ellipse(cx, cy, 78, 58, [226, 206, 160]); c.ellipse(cx, cy, 78, 58, [120, 90, 60], 2); lines.forEach((col, i) => { const t = -Math.PI / 2 + (i - 3) * 0.42; c.line(cx, cy, cx + Math.cos(t) * 74, cy + Math.sin(t) * 55, col, 3); }); c.ellipse(cx, cy, 26, 20, [120, 90, 60]); c.ellipse(cx, cy, 22, 16, [240, 226, 190]); c.ellipse(cx, cy, 8, 6, [120, 90, 60]); });
    for (const [x, y] of [[10, 4], [11, 4], [17, 4], [18, 4]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.box(X + 2, Y + 8, 12, H - 9, [170, 176, 190], [70, 76, 96]); c.rect(X + 3, Y + 9, 10, 3, [226, 230, 240]); c.rect(X + 4, Y + 14, 8, 3, [110, 230, 130]); c.rect(X - 2, Y + 18, 4, 2, RED); });
    for (const [x, y] of [[4, 11], [22, 11], [4, 19], [20, 20]]) k.put(x, y, 2, 1, (c, X, Y) => { c.rect(X + 2, Y + 13, 29, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 3, 30, 8, [176, 124, 80], [86, 58, 36]); c.rect(X + 2, Y + 4, 28, 2, [214, 170, 120]); c.rect(X + 3, Y + 11, 3, 3, [70, 66, 80]); c.rect(X + 26, Y + 11, 3, 3, [70, 66, 80]); });
    for (const [x, y] of [[2, 4], [25, 4], [2, 21], [25, 21]]) tall(k, x, y, 1, P.pillar, [214, 200, 176]);
    for (const [x, y] of [[4, 4], [23, 4], [10, 20], [18, 20]]) tall(k, x, y, 1, P.plant);
    k.put(23, 9, 1, 2, (c, X, Y, W, H) => { c.box(X + 1, Y - 6, 14, H + 4, [60, 110, 190], [30, 50, 100]); c.rect(X + 3, Y - 4, 10, 12, [200, 226, 250]); for (let i = 0; i < 3; i++) c.rect(X + 4 + i * 3, Y - 2, 2, 8, [[240, 200, 70], RED, [110, 200, 120]][i]); c.rect(X + 3, Y + 16, 10, 5, INK); });
  },
};
// The Musical Theater: a red-carpet lobby, and the stage with its drapes, footlights and stalls.
R.UnovaMusicalTheater = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const red = [176, 40, 56];
    const k = base(p, T.carpet(red), (c, X, Y, W) => { Wl.plain([244, 232, 206], { base: [150, 110, 60], rail: GOLD })(c, X, Y, W); for (let x = 12; x + 22 < W; x += 46) { if (Math.abs(x + 11 - W / 2) < 40) continue; Wl.picture(c, X + x, Y + 4, 22, 22, [[250, 190, 210], [170, 210, 250], [250, 226, 150]][(x / 46 | 0) % 3], (c2, cx, cy) => { star(c2, cx, cy - 2, 6, WHITE); c2.rect(cx - 6, cy + 6, 12, 2, INK); }); } Wl.curtain(c, X + W / 2 - 30, Y + 2, 60, 30, [130, 30, 90]); }, { all: "none" }, GOLD);
    k.art((c) => { for (let y = 3; y <= 21; y++) { c.rect(13 * S, y * S, 2, S, GOLD); c.rect(18 * S - 2, y * S, 2, S, GOLD); } for (let i = 0; i < 30; i++) star(c, (3 + hsh(i, 1, 1) * 9) * S + (i & 1 ? 16 * S : 0), (5 + hsh(i, 2, 1) * 15) * S, 4, A(GOLD, 150)); const cx = 15 * S + 8, cy = 14 * S; c.ellipse(cx, cy, 34, 26, [130, 30, 44]); c.ellipse(cx, cy, 34, 26, GOLD, 2); star(c, cx, cy, 14, GOLD); c.rect(14 * S, 3 * S, 3 * S, S, [130, 30, 90]); });
    for (const x of [10, 17]) k.put(x, 7, 3, 1, (c, X, Y, W, H) => P.counter(c, X, Y - 4, W, H + 4, [130, 84, 50], GOLD), { tall: true });
    for (const [x, y, n] of [[4, 11, 0], [9, 11, 1], [4, 14, 2]]) k.put(x, y - 1, 2, 2, (c, X, Y, W, H) => { c.rect(X + 2, Y + H - 2, W - 2, 2, [0, 0, 0, 50]); c.rect(X + 2, Y + 4, 2, H - 5, [150, 156, 170]); c.rect(X + W - 4, Y + 4, 2, H - 5, [150, 156, 170]); c.rect(X + 2, Y + 4, W - 4, 2, [150, 156, 170]); for (let i = 0; i < 5; i++) { const col = BOOKS[(i + n * 2) % 7]; c.poly([[X + 5 + i * 5, Y + 6], [X + 9 + i * 5, Y + 6], [X + 10 + i * 5, Y + 22], [X + 4 + i * 5, Y + 22]], col); c.rect(X + 6 + i * 5, Y + 5, 2, 2, INK); } }, { rows: 1 });
    for (const [x, y] of [[21, 9], [21, 19], [5, 19]]) k.put(x, y, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, [130, 30, 90]));
    for (const [x, y] of [[2, 4], [27, 4], [2, 21], [27, 21], [12, 4], [18, 4]]) tall(k, x, y, 1, P.plant);
    for (const [x, y] of [[12, 10], [18, 10], [12, 18], [18, 18]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.ellipse(X + 8, Y + H - 2, 4, 2, [0, 0, 0, 60]); c.rect(X + 7, Y + 10, 2, H - 12, GOLD); c.ellipse(X + 8, Y + 9, 3, 3, GOLD); c.box(X + 5, Y + H - 4, 6, 3, GOLD, [130, 96, 40]); });
  },
};
const seats = (col) => (c, X, Y, W, H) => { for (let x = 0; x < W; x += 16) { c.rect(X + x + 2, Y + H - 2, 13, 2, [0, 0, 0, 50]); c.box(X + x + 1, Y + H - 20, 14, 12, col, dk(col, 0.5)); c.rect(X + x + 2, Y + H - 19, 12, 2, lt(col, 0.25)); c.box(X + x + 1, Y + H - 9, 14, 7, lt(col, 0.1), dk(col, 0.5)); c.rect(X + x, Y + H - 12, 2, 9, [70, 60, 60]); c.rect(X + x + 14, Y + H - 12, 2, 9, [70, 60, 60]); } };
R.UnovaMusicalStage = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const red = [176, 40, 56];
    const k = base(p, T.carpet([90, 40, 60]), (c, X, Y, W) => { c.rect(X, Y, W, 32, [50, 60, 110]); for (let i = 0; i < 40; i++) c.rect(X + hsh(i, 1, 5) * W, Y + 6 + hsh(i, 2, 5) * 22, 1, 1, WHITE); c.ellipse(X + W * 0.72, Y + 16, 8, 8, [250, 240, 190]); c.poly([[X + 40, Y + 32], [X + 90, Y + 12], [X + 150, Y + 32]], [70, 110, 100]); c.poly([[X + 130, Y + 32], [X + 200, Y + 6], [X + 280, Y + 32]], [60, 96, 90]); for (let x = 0; x < W; x += 24) { c.ellipse(X + x + 12, Y + 2, 13, 9, red); c.ellipse(X + x + 12, Y + 1, 10, 6, lt(red, 0.15)); } c.rect(X, Y, W, 3, GOLD); }, {}, GOLD);
    k.floor(T.plank([214, 170, 110]), 4, 2, 29, 10, 0.02);
    k.art((c) => { c.rect(4 * S, 11 * S - 5, 26 * S, 5, [110, 70, 46]); for (let x = 4 * S + 6; x < 30 * S; x += 14) { c.ellipse(x, 11 * S - 5, 3, 2, [255, 244, 170]); glow(c, x, 11 * S - 9, 8, [255, 244, 170], 22); } const cx = 17 * S + 8, cy = 6 * S + 9; c.ellipse(cx, cy, 44, 26, [255, 250, 200, 90]); c.ellipse(cx, cy, 44, 26, GOLD, 2); for (const [x, col] of [[8, [250, 150, 190]], [26, [150, 200, 250]]]) { c.ellipse(x * S, 7 * S, 24, 15, A(col, 80)); c.ellipse(x * S, 7 * S, 24, 15, col, 1); } runner(k, 15, 12, 19, 23, red); });
    for (const x of [2, 30]) k.put(x, 2, 2, 9, (c, X, Y, W, H) => { c.rect(X, Y - 32, W, H + 32, red); for (let i = 0; i < W; i += 6) { c.rect(X + i, Y - 32, 2, H + 32, dk(red, 0.25)); c.rect(X + i + 3, Y - 32, 1, H + 32, lt(red, 0.15)); } c.rect(X, Y + H - 4, W, 4, GOLD); c.rect(X + (x === 2 ? W - 3 : 0), Y - 32, 3, H + 32, GOLD); });
    for (const [x, y, d] of [[6, 4, 0], [24, 3, 1], [11, 3, 2], [21, 4, 0]]) k.put(x, y - 1, 2, 2, (c, X, Y, W, H) => { c.rect(X + 4, Y + H - 2, 26, 2, [0, 0, 0, 60]); if (d === 0) { c.rect(X + 14, Y + 16, 4, 14, [130, 90, 60]); c.ellipse(X + 16, Y + 10, 13, 11, [60, 140, 80]); c.ellipse(X + 13, Y + 7, 8, 6, [100, 180, 110]); } else if (d === 1) { c.box(X + 4, Y + 6, 24, 24, [200, 190, 170], [110, 100, 90]); c.poly([[X + 2, Y + 8], [X + 16, Y - 4], [X + 30, Y + 8]], [176, 80, 70]); c.box(X + 13, Y + 16, 7, 14, [110, 76, 50], INK); } else { c.box(X + 2, Y + 14, 28, 16, [150, 150, 170], [80, 80, 100]); for (let i = 0; i < 4; i++) c.box(X + 2 + i * 8, Y + 8, 5, 7, [150, 150, 170], [80, 80, 100]); } }, { rows: 1 });
    for (const y of [14, 16, 18, 20]) { k.put(4, y, 10, 1, seats(red)); k.put(21, y, 10, 1, seats(red)); }
    p.paint(50, (c, top) => { for (const [x, sx, col] of [[17, 6, [255, 250, 200]], [17, 28, [255, 250, 200]], [8, 3, [250, 150, 190]], [26, 31, [150, 200, 250]]]) beam(top, sx * S, 1 * S, x * S + 8, 7 * S, 20, col, 18); });
  },
};
// Small Court: three hard courts side by side under the stands.
R.UnovaSmallCourt = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.check([70, 150, 130], [64, 142, 124], 1), crowdWall([[240, 200, 90], [90, 150, 230], WHITE, [226, 90, 90]], 4), {}, [90, 150, 230]);
    k.art((c) => { for (const [x0, col] of [[3, [60, 120, 200]], [12, [226, 130, 70]], [21, [60, 120, 200]]]) { const X = x0 * S, Y = 6 * S, w = 8 * S, h = 17 * S; c.rect(X, Y, w, h, A(col, 220)); frame(c, X + 2, Y + 2, w - 4, h - 4, WHITE, 2); c.rect(X + 14, Y + 2, 2, h - 4, WHITE); c.rect(X + w - 16, Y + 2, 2, h - 4, WHITE); c.rect(X + 14, Y + 60, w - 28, 2, WHITE); c.rect(X + 14, Y + h - 62, w - 28, 2, WHITE); c.rect(X + w / 2 - 1, Y + 60, 2, h - 120, WHITE); c.rect(X - 4, Y + h / 2 - 2, w + 8, 4, [240, 240, 250]); for (let i = -4; i < w + 4; i += 4) c.rect(X + i, Y + h / 2 - 2, 1, 4, [110, 110, 130]); c.box(X - 6, Y + h / 2 - 5, 4, 10, [90, 90, 110], INK); c.box(X + w + 2, Y + h / 2 - 5, 4, 10, [90, 90, 110], INK); } });
    for (const [x, y] of [[2, 24], [28, 24], [10, 24], [20, 24]]) k.put(x, y, 2, 1, (c, X, Y) => { c.box(X + 1, Y + 3, 30, 8, [176, 124, 80], [86, 58, 36]); c.rect(X + 3, Y + 11, 3, 3, [70, 66, 80]); c.rect(X + 26, Y + 11, 3, 3, [70, 66, 80]); });
    for (const [x, y] of [[2, 4], [29, 4], [11, 4], [20, 4]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.box(X + 2, Y + 12, 12, H - 13, [90, 110, 150], INK); for (let i = 0; i < 5; i++) c.ellipse(X + 4 + (i % 3) * 4, Y + 10 + (i > 2 ? -3 : 0), 2, 2, [220, 240, 90]); });
  },
};
// Nimbasa's old Gym: the roller coaster, its track looping the dark hall between the switches.
R.UnovaNimbasaCoaster = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const yel = [250, 226, 90], cy2 = [110, 220, 250];
    const k = base(p, T.check([40, 44, 86], [34, 38, 76], 1), (c, X, Y, W) => { Wl.plain([44, 40, 90], { base: [26, 24, 56] })(c, X, Y, W); for (let x = 10; x < W - 20; x += 44) { bolt(c, X + x + 8, Y + 14, 1.2, x % 88 ? yel : cy2); c.rect(X + x + 20, Y + 8, 18, 2, x % 88 ? cy2 : yel); c.rect(X + x + 20, Y + 20, 18, 2, x % 88 ? cy2 : yel); } }, {}, yel);
    const track = (c, pts, col) => { for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4; for (let s2 = 0; s2 <= n; s2++) { const x = (ax + (bx - ax) * s2 / n) * S + 8, y = (ay + (by - ay) * s2 / n) * S + 8; if (ax === bx) c.rect(x - 7, y - 1, 14, 2, [90, 96, 130]); else c.rect(x - 1, y - 7, 2, 14, [90, 96, 130]); } if (ax === bx) { c.rect(ax * S + 3, Math.min(ay, by) * S + 8, 2, Math.abs(by - ay) * S, col); c.rect(ax * S + 11, Math.min(ay, by) * S + 8, 2, Math.abs(by - ay) * S, col); } else { c.rect(Math.min(ax, bx) * S + 8, ay * S + 3, Math.abs(bx - ax) * S, 2, col); c.rect(Math.min(ax, bx) * S + 8, ay * S + 11, Math.abs(bx - ax) * S, 2, col); } } };
    k.art((c) => { track(c, [[8, 12], [24, 12], [24, 24], [8, 24], [8, 12]], yel); track(c, [[4, 8], [27, 8], [27, 28], [4, 28], [4, 8]], cy2); track(c, [[16, 12], [16, 24]], [240, 110, 200]);
      for (const q of p.people) { const X = q.x * S + 8, Y = q.y * S + 8; if (/switch/.test(q.script)) { c.ellipse(X, Y, 14, 11, [30, 30, 60]); c.ellipse(X, Y, 14, 11, [240, 110, 200], 2); } else if (/car/.test(q.script)) { c.box(X - 13, Y - 10, 26, 22, [226, 60, 80], INK); c.rect(X - 11, Y - 8, 22, 3, [250, 150, 160]); c.box(X - 8, Y - 2, 16, 10, [40, 40, 60], INK); bolt(c, X, Y - 5, 0.6, yel); } else { c.ellipse(X, Y, 16, 12, A(yel, 80)); c.ellipse(X, Y, 16, 12, yel, 2); } }
      for (let i = 0; i < 50; i++) c.rect((2.5 + hsh(i, 1, 8) * 27) * S, (3 + hsh(i, 2, 8) * 28) * S, 1, 1, i & 1 ? yel : cy2); });
    for (const [x, y] of [[6, 10], [25, 10], [6, 26], [25, 26], [12, 16], [20, 20], [2, 3], [29, 3], [2, 30], [29, 30]]) tall(k, x, y, 1, (c, X, Y, W, H) => { glow(c, X + 8, Y + 6, 14, yel, 22); c.box(X + 5, Y + 6, 6, H - 8, [90, 96, 130], INK); c.box(X + 3, Y + H - 4, 10, 3, [90, 96, 130], INK); bolt(c, X + 8, Y + 4, 0.8, yel); });
    k.put(11, 3, 10, 1, (c, X, Y, W, H) => { c.box(X, Y - 4, W, H + 3, [90, 96, 130], INK); c.rect(X + 1, Y - 3, W - 2, 3, [150, 156, 190]); for (let i = 4; i < W - 4; i += 12) { c.rect(i + X, Y + 4, 6, 6, i % 24 ? yel : cy2); } }, { tall: true });
  },
};
// The PWT stage in Driftveil: a floodlit arena floor under the stands, with the desks of the lobby below.
R.UnovaPWTStage = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const k = base(p, T.check([60, 70, 120], [54, 64, 112], 1), (c, X, Y, W) => { crowdWall([[240, 200, 90], [226, 90, 90], [90, 150, 230], WHITE, [110, 200, 130]], 9)(c, X, Y, W); Wl.screen(c, X + W / 2 - 36, Y + 1, 72, 22, [30, 60, 130], (c2, cx, cy) => { ball(c2, cx, cy, 8); c2.rect(cx - 30, cy - 1, 16, 2, GOLD); c2.rect(cx + 14, cy - 1, 16, 2, GOLD); }); }, {}, GOLD);
    k.art((c) => { court(c, 5, 3, 22, 12, [40, 110, 200, 230], WHITE, (c2, cx, cy) => { c2.ellipse(cx, cy, 16, 16, GOLD); ball(c2, cx, cy, 12); }); frame(c, 5 * S - 3, 3 * S - 3, 18 * S + 6, 10 * S + 6, GOLD, 3); c.rect(2 * S, 14 * S - 3, 24 * S, 3, GOLD); for (let i = 0; i < 60; i++) c.rect((2.3 + hsh(i, 1, 2) * 23.4) * S, (3 + hsh(i, 2, 2) * 10) * S, 2, 2, [[250, 226, 90], [250, 110, 150], [110, 220, 250], WHITE][i % 4]); for (const q of p.people) if (q.y >= 15) { c.box(q.x * S - 8, q.y * S - 3, 32, 22, [110, 76, 50], [60, 40, 30]); c.rect(q.x * S - 6, q.y * S - 1, 28, 18, [176, 40, 56]); frame(c, q.x * S - 6, q.y * S - 1, 28, 18, GOLD); } });
    k.floor(T.carpet([120, 40, 60]), 2, 14, 25, 21, 0.02);
    for (const [x, y] of [[3, 4], [24, 4], [3, 11], [24, 11]]) tall(k, x, y, 1, (c, X, Y, W, H) => { glow(c, X + 8, Y + 4, 16, [255, 250, 200], 24); c.rect(X + 7, Y + 6, 2, H - 8, [110, 116, 136]); c.box(X + 4, Y + H - 4, 8, 3, [110, 116, 136], INK); c.box(X + 2, Y - 2, 12, 9, [60, 60, 76], INK); c.rect(X + 4, Y, 8, 5, [255, 250, 200]); });
    k.put(13, 16, 2, 2, (c, X, Y, W, H) => { c.ellipse(X + 16, Y + H - 2, 12, 3, [0, 0, 0, 60]); c.box(X + 6, Y + 18, 20, 12, [110, 76, 50], [60, 40, 30]); c.rect(X + 13, Y + 10, 6, 8, GOLD); c.poly([[X + 6, Y - 4], [X + 26, Y - 4], [X + 21, Y + 10], [X + 11, Y + 10]], GOLD); c.rect(X + 9, Y - 3, 3, 10, lt(GOLD, 0.5)); c.ellipse(X + 5, Y + 2, 4, 5, GOLD, 2); c.ellipse(X + 27, Y + 2, 4, 5, GOLD, 2); }, { rows: 1 });
    for (const [x, y] of [[2, 21], [25, 21], [2, 15], [25, 15], [17, 19]]) tall(k, x, y, 1, P.plant);
    for (const x of [4, 12, 16, 23]) tall(k, x, 14, 1, (c, X, Y, W, H) => { c.rect(X + 7, Y - 6, 2, H + 4, [150, 156, 170]); Wl.banner(c, X + 9, Y - 5, 10, 18, x % 8 ? [40, 110, 200] : RED, WHITE); c.box(X + 4, Y + H - 4, 8, 3, [110, 116, 136], INK); });
  },
};
// Pokéstar Studios: the cinema with its silver screen, and a soundstage with the green screen up.
R.UnovaPokestarTheater = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const red = [150, 36, 50];
    const k = base(p, T.carpet(red), Wl.plain([50, 30, 44], { base: [30, 20, 30] }), {}, GOLD);
    k.art((c) => { for (let y = 6; y <= 21; y += 2) for (const x of [9, 14, 19]) { c.rect(x * S + 6, y * S + 6, 4, 4, [255, 244, 170, 200]); } for (let i = 0; i < 24; i++) star(c, (2.5 + hsh(i, 1, 4) * 21) * S, (6.5 + hsh(i, 2, 4) * 15) * S, 3, A(GOLD, 110)); });
    k.fixtures((s) => s.w >= 10 ? (c, X, Y, W, H, top) => { c.rect(X, Y - 32, W, H + 32, [30, 20, 30]); c.box(X + 8, Y - 28, W - 16, 58, [226, 230, 240], [20, 16, 24]); c.rect(X + 10, Y - 26, W - 20, 54, [120, 180, 230]); c.poly([[X + 10, Y + 28], [X + 60, Y - 6], [X + 96, Y + 12], [X + 130, Y - 14], [X + W - 10, Y + 28]], [90, 150, 110]); c.ellipse(X + 150, Y - 12, 9, 9, [250, 240, 170]); star(c, X + 44, Y - 14, 6, WHITE); Wl.curtain(c, X, Y - 32, 12, H + 4, red); Wl.curtain(c, X + W - 12, Y - 32, 12, H + 4, red); c.rect(X, Y - 32, W, 5, GOLD); c.rect(X, Y + 32, 5 * S, H - 32, [70, 46, 60]); c.rect(X + 8 * S, Y + 32, 4 * S, H - 32, [70, 46, 60]); P.speaker(c, X + 8, Y + 34, 20, 28); P.speaker(c, X + 50, Y + 34, 20, 28); P.speaker(c, X + 8 * S + 8, Y + 34, 20, 28); P.speaker(c, X + 8 * S + 38, Y + 34, 20, 28); } : (c, X, Y, W, H) => seats(red)(c, X, Y + (H > 16 ? 2 : 0), W, H > 16 ? H - 2 : H));
    for (const [x, y] of [[2, 3], [23, 3]]) k.put(x, y, 1, 2, (c, X, Y, W, H) => { c.box(X + 1, Y - 4, 14, H + 2, [226, 60, 60], [110, 30, 34]); c.rect(X + 1, Y - 4, 14, 3, WHITE); for (let i = 0; i < 6; i++) c.ellipse(X + 4 + (i % 3) * 4, Y - 6 - (i > 2 ? 3 : 0), 2, 2, [250, 240, 200]); for (let i = 3; i < 14; i += 4) c.rect(X + i, Y, 2, H - 4, WHITE); });
    for (const [x, y] of [[2, 21], [23, 21], [21, 10], [21, 17]]) tall(k, x, y, 1, P.plant);
  },
};
R.UnovaPokestarSet = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([110, 112, 128]), Wl.plain([44, 44, 56], { base: [24, 24, 32] }), {}, GOLD);
    k.art((c) => { for (const [x, y] of [[14, 9], [9, 10], [19, 10], [14, 14]]) { c.rect(x * S + 2, y * S + 7, 12, 2, WHITE); c.rect(x * S + 7, y * S + 2, 2, 12, WHITE); } c.line(7 * S, 13 * S, 10 * S, 20 * S, INK, 2); c.line(10 * S, 20 * S, 20 * S, 21 * S, INK, 2); c.line(23 * S, 13 * S, 21 * S, 19 * S, INK, 2); c.rect(3 * S, 5 * S, 22 * S, 5 * S, [70, 190, 90, 110]); });
    k.fixtures((s) => s.w >= 10 ? (c, X, Y, W, H) => { c.rect(X, Y - 32, W, H + 32, [50, 170, 80]); c.rect(X, Y - 32, W, 4, [90, 96, 110]); for (let x = 0; x < W; x += 44) c.rect(X + x, Y - 32, 3, H + 32, [40, 150, 70]); c.rect(X, Y + H - 3, W, 3, [36, 120, 60]); for (let x = 20; x < W; x += 56) { c.box(X + x, Y - 30, 14, 8, [40, 40, 54], INK); c.rect(X + x + 2, Y - 23, 10, 3, [255, 250, 200]); } c.rect(X - 4, Y - 32, 4, H + 32, [90, 96, 110]); c.rect(X + W, Y - 32, 4, H + 32, [90, 96, 110]); } : s.x < 14 ? (c, X, Y, W, H) => { c.ellipse(X + 16, Y + 30, 13, 3, [0, 0, 0, 60]); c.line(X + 16, Y + 12, X + 5, Y + 30, [70, 70, 86], 2); c.line(X + 16, Y + 12, X + 27, Y + 30, [70, 70, 86], 2); c.line(X + 16, Y + 12, X + 16, Y + 30, [70, 70, 86], 2); c.box(X + 6, Y - 2, 20, 14, [50, 50, 66], INK); c.box(X + 24, Y + 1, 7, 8, [30, 30, 40], INK); c.ellipse(X + 30, Y + 5, 2, 3, [110, 190, 236]); c.ellipse(X + 10, Y - 5, 5, 5, [50, 50, 66]); c.ellipse(X + 20, Y - 5, 5, 5, [50, 50, 66]); c.rect(X + 8, Y + 2, 3, 2, RED); } : (c, X, Y, W, H) => { c.ellipse(X + 16, Y + 30, 12, 3, [0, 0, 0, 60]); c.rect(X + 15, Y + 6, 2, 24, [110, 116, 136]); c.line(X + 16, Y + 22, X + 6, Y + 30, [110, 116, 136]); c.line(X + 16, Y + 22, X + 26, Y + 30, [110, 116, 136]); c.box(X + 2, Y - 8, 20, 16, [50, 50, 66], INK); c.rect(X + 1, Y - 6, 4, 12, [255, 250, 200]); glow(c, X, Y, 18, [255, 250, 200], 26); });
    k.put(10, 18, 1, 1, (c, X, Y) => { c.line(X + 2, Y + 14, X + 13, Y + 2, [110, 76, 50], 2); c.line(X + 13, Y + 14, X + 2, Y + 2, [110, 76, 50], 2); c.rect(X + 2, Y + 7, 12, 3, [40, 40, 54]); c.rect(X + 2, Y, 12, 4, [40, 40, 54]); });
    k.put(12, 18, 1, 1, (c, X, Y) => { c.box(X + 1, Y + 6, 14, 9, [40, 40, 54], INK); c.rect(X + 1, Y + 2, 14, 4, WHITE); for (let i = 2; i < 14; i += 5) c.poly([[X + i, Y + 6], [X + i + 3, Y + 6], [X + i + 5, Y + 2], [X + i + 2, Y + 2]], INK); c.rect(X + 3, Y + 9, 10, 1, WHITE); });
    crates(k, [[2, 20, 2], [24, 21, 1], [22, 21, 1], [2, 14, 1]], [90, 96, 110]);
    for (const [x, y] of [[3, 11], [24, 10], [18, 19]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.rect(X + 7, Y + 6, 2, H - 8, [110, 116, 136]); c.box(X + 4, Y + H - 4, 8, 3, [110, 116, 136], INK); c.box(X + 2, Y - 2, 12, 9, [60, 60, 76], INK); c.rect(X + 4, Y, 8, 5, [255, 250, 200]); glow(c, X + 8, Y + 2, 14, [255, 250, 200], 22); });
  },
};
// Nacrene Museum: a dragon's skeleton in the middle of the hall, cases of relics, the meteorite.
R.UnovaNacreneMuseum = {
  theme: { room: "arena", floor: "ornate", wall: null },
  plan(p) {
    const k = base(p, T.marble([230, 226, 214]), (c, X, Y, W) => { Wl.plain([226, 214, 190], { base: [130, 96, 66], rail: [176, 140, 100] })(c, X, Y, W); const pics = [[110, 150, 200], [200, 150, 110], [130, 180, 130], [190, 130, 170], [226, 200, 130], [150, 150, 190]]; pics.forEach((col, i) => { const x = X + 14 + i * 72 + (i > 2 ? 16 : 0); Wl.picture(c, x, Y + 5, 28, 18, col, (c2, cx, cy) => { c2.ellipse(cx - 4, cy + 1, 6, 4, lt(col, 0.4)); c2.rect(cx + 4, cy - 4, 5, 8, dk(col, 0.3)); }); }); }, { all: "arch" }, [130, 40, 50]);
    runner(k, 14, 4, 16, 23, [130, 40, 50]);
    k.art((c) => { c.box(10 * S, 9 * S - 6, 10 * S, 4 * S + 12, [200, 190, 170], [130, 110, 90]); frame(c, 10 * S + 3, 9 * S - 3, 10 * S - 6, 4 * S + 6, [150, 60, 60]); }, 0.25);
    k.put(11, 9, 8, 4, (c, X, Y, W, H) => { const bone = [240, 236, 220], d = [170, 164, 144]; c.ellipse(X + W / 2, Y + H - 4, 56, 6, [0, 0, 0, 50]); for (const dx of [26, 60, 96]) { c.rect(X + dx, Y + 24, 2, H - 28, [90, 90, 100]); c.box(X + dx - 3, Y + H - 6, 8, 3, [90, 90, 100], INK); } for (let i = 0; i <= 20; i++) { const t = i / 20, x = X + 26 + t * 76, y = Y + 22 - Math.sin(t * Math.PI) * 10; c.ellipse(x, y, 3, 3, d); c.ellipse(x, y - 1, 2, 2, bone); if (i > 3 && i < 15) { c.line(x, y, x - 3, y + 16 - Math.abs(i - 9), bone); c.line(x + 1, y, x - 2, y + 16 - Math.abs(i - 9), d); } } c.poly([[X + 102, Y + 22], [X + 122, Y + 34], [X + 126, Y + 30], [X + 104, Y + 18]], bone); c.poly([[X + 4, Y + 6], [X + 22, Y + 2], [X + 30, Y + 12], [X + 26, Y + 24], [X + 6, Y + 20]], d); c.poly([[X + 6, Y + 8], [X + 21, Y + 4], [X + 28, Y + 12], [X + 24, Y + 21], [X + 8, Y + 18]], bone); c.ellipse(X + 18, Y + 10, 3, 3, INK); for (let i = 0; i < 4; i++) c.rect(X + 8 + i * 4, Y + 19, 2, 4, bone); c.poly([[X + 20, Y + 3], [X + 26, Y - 6], [X + 25, Y + 5]], bone); for (const [dx, f] of [[44, 1], [84, 1]]) { c.line(X + dx, Y + 28, X + dx - 4, Y + 44, bone, 2); c.line(X + dx - 4, Y + 44, X + dx + 4, Y + 46, bone, 2); } c.poly([[X + 50, Y + 14], [X + 64, Y - 10], [X + 90, Y - 4], [X + 70, Y + 2], [X + 84, Y + 8], [X + 62, Y + 8]], A(bone, 230)); c.line(X + 50, Y + 14, X + 64, Y - 10, d); c.line(X + 64, Y - 10, X + 90, Y - 4, d); }, { rows: 2 });
    const relic = (n) => (c, X, Y, W, H) => P.showcase(c, X, Y, W, H, (c2, cx, by) => { if (n === 0) { c2.ellipse(cx, by - 6, 7, 6, [90, 80, 100]); c2.ellipse(cx - 2, by - 8, 2, 2, [150, 140, 170]); } else if (n === 1) { c2.poly([[cx - 6, by], [cx - 3, by - 12], [cx + 4, by - 12], [cx + 7, by]], [200, 150, 90]); c2.rect(cx - 3, by - 8, 7, 2, [110, 70, 40]); } else if (n === 2) { c2.rect(cx - 1, by - 14, 2, 14, [200, 200, 214]); c2.rect(cx - 4, by - 4, 8, 2, GOLD); } else if (n === 3) { c2.ellipse(cx, by - 6, 6, 6, [226, 214, 190]); c2.rect(cx - 3, by - 7, 2, 2, INK); c2.rect(cx + 1, by - 7, 2, 2, INK); } else { c2.poly([[cx - 6, by], [cx, by - 13], [cx + 6, by]], [130, 200, 220]); c2.line(cx, by - 12, cx - 2, by - 2, WHITE); } });
    [[4, 9], [4, 14], [24, 9], [24, 14], [6, 19], [21, 20], [6, 4], [22, 3]].forEach(([x, y], i) => k.put(x, y, 2, 2, relic(i % 5), { rows: 1 }));
    for (const [x, y] of [[2, 4], [27, 4], [2, 22], [27, 22], [12, 4], [18, 4]]) tall(k, x, y, 1, P.pillar, [226, 220, 204]);
    for (const [x, y] of [[10, 16], [19, 16], [10, 8], [19, 8]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.rect(X + 7, Y + 12, 2, H - 14, GOLD); c.ellipse(X + 8, Y + 11, 3, 3, GOLD); c.box(X + 5, Y + H - 4, 6, 3, GOLD, [130, 96, 40]); });
  },
};
// Celestial Tower: floors of graves and candles, and the bell under the open sky.
function celestial(n) {
  return {
    theme: { room: "arena", floor: "paving", wall: null },
    plan(p) {
      const bell = n === 5;
      const k = base(p, T.slab(bell ? [150, 146, 180] : [124, 116, 150]), bell ? (c, X, Y, W) => { c.rect(X, Y, W, 32, [30, 30, 70]); for (let i = 0; i < 60; i++) c.rect(X + hsh(i, 1, 3) * W, Y + hsh(i, 2, 3) * 24, 1, 1, i % 5 ? WHITE : [255, 240, 170]); c.ellipse(X + W * 0.8, Y + 10, 6, 6, [250, 244, 200]); c.rect(X, Y + 24, W, 8, [110, 106, 140]); for (let x = 0; x < W; x += 16) { c.rect(X + x + 6, Y + 14, 4, 12, [150, 146, 180]); } c.rect(X, Y + 12, W, 3, [170, 166, 200]); } : (c, X, Y, W) => { Wl.brick([96, 88, 124])(c, X, Y, W); for (let x = 20; x + 14 < W; x += 48) { c.box(X + x, Y + 8, 14, 18, [30, 30, 70], [60, 54, 84]); c.ellipse(X + x + 7, Y + 8, 7, 5, [30, 30, 70]); c.p(X + x + 4, Y + 12, WHITE); c.p(X + x + 9, Y + 18, WHITE); } }, { all: "stairs" }, [110, 80, 150]);
      runner(k, 12, bell ? 8 : 4, 14, 23, [96, 70, 140], [200, 190, 230]);
      k.art((c) => { for (let i = 0; i < 12; i++) glow(c, (3 + hsh(i, n, 1) * 20) * S, (4 + hsh(i, n, 2) * 19) * S, 22, [200, 190, 250], 9); if (bell) { const cx = 13 * S + 8, cy = 6 * S + 8; c.ellipse(cx, cy, 44, 30, [110, 106, 140]); c.ellipse(cx, cy, 40, 26, [190, 186, 214]); c.ellipse(cx, cy, 40, 26, GOLD, 2); } });
      k.fixtures((s) => (c, X, Y, W, H) => { const by = Y + H, flower = [[250, 170, 200], [250, 230, 130], WHITE, [170, 150, 240]][(s.x + s.y) % 4]; c.ellipse(X + 8, by - 2, 8, 3, [0, 0, 0, 70]); c.box(X + 1, by - 7, 14, 6, [150, 146, 166], [70, 66, 90]); if (H > 16) { c.box(X + 3, by - 26, 10, 20, [176, 172, 190], [70, 66, 90]); c.ellipse(X + 8, by - 26, 5, 4, [176, 172, 190]); c.rect(X + 5, by - 26, 2, 16, [214, 210, 226]); c.rect(X + 7, by - 21, 2, 8, [100, 96, 120]); c.rect(X + 5, by - 18, 6, 2, [100, 96, 120]); } else { c.box(X + 3, by - 14, 10, 8, [176, 172, 190], [70, 66, 90]); } c.ellipse(X + 3, by - 3, 2, 2, flower); c.ellipse(X + 12, by - 4, 2, 2, flower); c.p(X + 3, by - 3, GOLD); });
      for (const [x, y] of [[3, 4], [22, 22], [3, 22], [11, 4], [15, 4], [7, 10], [19, 15], [7, 20], [19, 10]]) tall(k, x, y, 1, (c, X, Y, W, H) => { const cx = X + 8; glow(c, cx, Y + 12, 10, [250, 220, 150], 20); c.ellipse(cx, Y + H - 2, 4, 2, [0, 0, 0, 60]); c.box(cx - 3, Y + 16, 6, H - 18, [240, 236, 220], [150, 146, 130]); c.poly([[cx - 2, Y + 16], [cx + 2, Y + 16], [cx, Y + 9]], [250, 180, 80]); c.rect(cx, Y + 13, 1, 3, WHITE); });
      if (bell) for (const x of [11, 15]) tall(k, x, 6, 1, P.pillar, [214, 210, 236]);
      if (bell) p.paint(6.5, (c, top) => { top.box(11 * S - 2, 4 * S - 6, 5 * S + 4, 8, [226, 190, 96], [130, 96, 40]); top.rect(13 * S + 7, 4 * S + 2, 2, 10, [130, 96, 40]); });
    },
  };
}
R.UnovaCelestialTower = celestial(1); R.UnovaCelestialTower2 = celestial(2); R.UnovaCelestialTower3 = celestial(3); R.UnovaCelestialTower4 = celestial(4); R.UnovaCelestialTower5 = celestial(5);
// The Strange House: dust, cobwebs, crooked portraits, and furniture that will not stay put.
function strange(kind, seed) {
  return {
    theme: { room: "arena", floor: "deck", wall: null },
    plan(p) {
      const attic = kind === "attic", wood = attic ? [130, 104, 84] : [112, 92, 96];
      const k = base(p, T.plank(wood), attic ? (c, X, Y, W) => { Wl.plain([110, 84, 66], { panel: 12, base: [60, 44, 36] })(c, X, Y, W); for (let x = 30; x < W; x += 80) { c.poly([[X + x, Y + 32], [X + x + 30, Y + 2], [X + x + 34, Y + 2], [X + x + 4, Y + 32]], [80, 58, 44]); } Wl.window(c, X + W / 2 - 10, Y + 6, 20, 16, [40, 40, 80]); } : (c, X, Y, W) => { Wl.plain([120, 96, 130], { base: [60, 44, 50], rail: [90, 66, 80] })(c, X, Y, W); for (let x = 8; x < W; x += 12) c.rect(X + x, Y + 3, 1, 13, [136, 112, 146]); for (let x = 26; x + 20 < W; x += 70) { const t = hsh(x, seed, 2) > 0.5 ? 2 : -2; c.poly([[X + x, Y + 5 + t], [X + x + 18, Y + 5 - t], [X + x + 18, Y + 23 - t], [X + x, Y + 23 + t]], [90, 60, 40]); c.poly([[X + x + 2, Y + 7 + t], [X + x + 16, Y + 7 - t], [X + x + 16, Y + 21 - t], [X + x + 2, Y + 21 + t]], [60, 60, 80]); c.ellipse(X + x + 9, Y + 12, 3, 3, [200, 190, 180]); c.rect(X + x + 6, Y + 15, 7, 5, [90, 60, 90]); } for (const x of [0, W - 22]) { for (let r = 4; r < 22; r += 5) c.ellipse(X + x + (x ? 22 : 0), Y, r, r, [230, 230, 240, 150], 1); c.line(X + x + (x ? 22 : 0), Y, X + x + (x ? 4 : 18), Y + 16, [230, 230, 240, 150]); c.line(X + x + (x ? 22 : 0), Y, X + x + (x ? 16 : 6), Y + 20, [230, 230, 240, 150]); } }, { all: "arch" }, [110, 60, 90]);
      const L = k.L, R2 = k.R, B = k.B, mx = (L + R2) >> 1;
      k.art((c) => { rug(c, mx - 4, k.T + 7, mx + 4, k.T + 13, [110, 50, 70], [170, 140, 110]); for (const [x, y, w, h] of [[mx - 2, k.T + 8, 14, 9], [mx + 2, k.T + 12, 20, 6], [mx - 3, k.T + 11, 9, 12]]) c.rect(x * S, y * S, w, h, wood); for (let i = 0; i < 26; i++) { const x = (L + 0.5 + hsh(i, seed, 3) * (R2 - L)) * S, y = (k.T + 1 + hsh(i, seed, 4) * (B - k.T - 1)) * S; c.ellipse(x, y, 8 + hsh(i, seed, 5) * 10, 4 + hsh(i, seed, 6) * 4, [60, 44, 60, 50]); } for (let i = 0; i < 8; i++) glow(c, (L + 1 + hsh(i, seed, 7) * (R2 - L - 2)) * S, (k.T + 3 + hsh(i, seed, 8) * (B - k.T - 5)) * S, 20, [170, 130, 230], 10); });
      k.art(cracks(p, Math.floor((R2 - L) * 0.8), seed + 3, [60, 44, 50, 150]), 0.3);
      k.fixtures((s) => { const v = (s.x + s.y + seed) % 4, sheet = [226, 222, 214]; return s.w < 3 ? null : (c, X, Y, W, H) => { if (v === 0) { P.sofa(c, X, Y, W, H, [110, 60, 80]); c.poly([[X + 10, Y + 2], [X + W - 4, Y + 4], [X + W - 2, Y + 20], [X + 16, Y + 24]], A(sheet, 210)); } else if (v === 1) { P.table(c, X, Y, W, H, [90, 64, 54]); c.rect(X + 8, Y + 5, 3, 7, [240, 236, 220]); c.rect(X + 9, Y + 2, 1, 3, [250, 180, 80]); c.box(X + 22, Y + 6, 12, 7, [130, 60, 60], INK); } else if (v === 2) { P.bookcase(c, X, Y - 8, W, H + 8, [84, 60, 54]); } else { shade(c, X, Y, W, H); c.box(X, Y + 4, W, H - 6, [40, 36, 44], INK); c.rect(X + 2, Y + H - 12, W - 4, 6, WHITE); for (let i = 4; i < W - 4; i += 5) c.rect(X + i, Y + H - 12, 2, 4, INK); c.rect(X + 1, Y + 5, W - 2, 3, [80, 74, 90]); } }; });
      const n = Math.floor((R2 - L) * (B - k.T) / 60);
      for (let i = 0; i < n; i++) { const x = L + 1 + Math.floor(hsh(i, seed, 11) * (R2 - L - 2)), y = k.T + 2 + Math.floor(hsh(i, seed, 12) * (B - k.T - 3)), v = i % 5; if (Math.abs(x - mx) < 2) continue; if (v === 0) k.put(x, y, 1, 1, (c, X, Y) => P.crate(c, X, Y, 16, 16, [130, 104, 84])); else if (v === 1) tall(k, x, y, 1, (c, X, Y, W, H) => { c.ellipse(X + 8, Y + H - 2, 6, 2, [0, 0, 0, 60]); c.poly([[X + 2, Y + H - 2], [X + 4, Y + 6], [X + 12, Y + 6], [X + 14, Y + H - 2]], [226, 222, 214]); c.ellipse(X + 8, Y + 6, 4, 3, [226, 222, 214]); c.line(X + 6, Y + 8, X + 5, Y + H - 4, [180, 176, 170]); }); else if (v === 2) k.put(x, y, 1, 1, (c, X, Y) => { P.chair(c, X, Y, [90, 64, 54]); }); else if (v === 3) tall(k, x, y, 1, P.torch, [170, 130, 250]); else k.put(x, y, 1, 1, bookPile); }
      if (kind === "library") { shelves(k, [8, 10, 12, 14, 16], 2, [84, 60, 54]); sideShelves(k, [9, 15], [9, 15], [84, 60, 54]); }
      if (attic) crates(k, [[3, 4, 2], [20, 4, 2], [3, 19, 2], [20, 19, 2], [10, 3, 1], [15, 3, 1]], [130, 104, 84]);
    },
  };
}
R.UnovaStrangeHouse = strange("foyer", 1); R.UnovaStrangeHouseLibrary = strange("library", 2); R.UnovaStrangeHouseAttic = strange("attic", 3);
for (const n of [2, 4, 6, 7, 8, 9, 10]) R["UnovaStrangeHouseRoom" + n] = strange("room", n + 3);

// ================================================================ the Marine Tube, Mall Nine, Join Avenue
function fish(c, x, y, s, col, left) { const d = left ? -1 : 1; c.ellipse(x, y, 5 * s, 3 * s, col); c.poly([[x - d * 4 * s, y], [x - d * 8 * s, y - 3 * s], [x - d * 8 * s, y + 3 * s]], col); c.rect(x + d * 2 * s, y - 1, 1, 1, INK); c.rect(x - s, y - 3 * s, 3 * s, 1, lt(col, 0.4)); }
// The Marine Tube: a glass tunnel along the sea floor between Undella and Humilau.
R.UnovaMarineTube = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const k = kit(p), W = p.W * S;
    p.paint(0.004, (c) => {
      for (let y = S; y < 17 * S; y += 4) c.rect(S, y, W - 2 * S, 4, mix([70, 160, 220], [20, 60, 130], (y - S) / (16 * S)));
      for (let i = 0; i < 9; i++) { const x = S + hsh(i, 1, 1) * (W - 3 * S); c.poly([[x, S], [x + 14, S], [x + 50, 6 * S], [x + 24, 6 * S]], [200, 236, 255, 26]); }
      for (let x = S; x < W - S; x += 3) { const h = 6 + hsh(x, 2, 2) * 12 + Math.sin(x * 0.07) * 5; c.rect(x, 17 * S - h, 3, h, mix([150, 130, 100], [90, 80, 80], hsh(x, 3, 2))); }
      for (let i = 0; i < 18; i++) { const x = 2 * S + hsh(i, 4, 1) * (W - 4 * S), col = [[240, 110, 130], [250, 170, 90], [200, 120, 220], [90, 200, 150]][i % 4]; if (i % 3 === 0) { for (let b = 0; b < 3; b++) { c.rect(x + b * 4, 16 * S - 14 - b * 3, 3, 16 + b * 3, col); c.ellipse(x + b * 4 + 1, 16 * S - 15 - b * 3, 3, 3, lt(col, 0.2)); } } else for (let s2 = 0; s2 < 22; s2 += 3) c.rect(x + Math.sin(s2 * 0.5 + i) * 2, 16 * S - s2, 2, 3, [60, 150, 90]); }
      for (let i = 0; i < 26; i++) { const x = 2 * S + hsh(i, 5, 1) * (W - 4 * S), top = i & 1, y = top ? 1.4 * S + hsh(i, 6, 1) * 3 * S : 12.6 * S + hsh(i, 6, 1) * 2.6 * S; fish(c, x, y, 1 + (i % 3 === 0 ? 1 : 0), [[250, 170, 70], [250, 110, 130], [250, 230, 110], [150, 200, 250], [226, 226, 240]][i % 5], hsh(i, 7, 1) > 0.5); }
      const wx = 24 * S, wy = 2.6 * S; c.ellipse(wx, wy, 46, 14, [40, 70, 150]); c.ellipse(wx, wy + 5, 40, 8, [200, 214, 236]); c.poly([[wx - 42, wy], [wx - 62, wy - 12], [wx - 58, wy + 10]], [40, 70, 150]); c.rect(wx + 30, wy - 4, 2, 2, WHITE); for (let i = 0; i < 4; i++) c.rect(wx - 20 + i * 12, wy + 6, 1, 6, [150, 170, 200]);
      for (let i = 0; i < 30; i++) c.ellipse(2 * S + hsh(i, 8, 1) * (W - 4 * S), S + hsh(i, 9, 1) * 15 * S, 1 + (i & 1), 1 + (i & 1), [220, 244, 255, 140], 1);
    });
    k.floor((c, X, Y, x, y) => { T.check([214, 232, 244], [196, 220, 238], 1)(c, X, Y, x, y); });
    p.paint(0.03, (c) => { const X = 2 * S, w = 36 * S; for (const y of [4 * S, 12 * S]) { c.rect(X, y, w, 2 * S, [190, 230, 250, 70]); c.rect(X, y + (y < 6 * S ? 4 : 22), w, 2, [255, 255, 255, 120]); c.rect(X, y + (y < 6 * S ? 30 : 0), w, 2, [110, 130, 160]); c.rect(X, y + (y < 6 * S ? 0 : 30), w, 2, [110, 130, 160]); } for (let x = 2; x <= 38; x += 6) { c.rect(x * S - 2, 4 * S, 4, 10 * S, [130, 150, 180]); c.rect(x * S - 2, 4 * S, 1, 10 * S, [200, 214, 236]); } c.rect(X, 8 * S + 14, w, 4, [90, 170, 230, 120]); for (let x = 3; x < 37; x += 2) c.poly([[x * S + 4, 8 * S + 12], [x * S + 12, 9 * S], [x * S + 4, 9 * S + 4]], [90, 170, 230, 150]); });
    k.doors({ 0: "side", 1: "side" }, [90, 170, 230]);
    for (const [x, y] of [[10, 6], [22, 6], [30, 6], [14, 11], [26, 11]]) k.put(x, y, 2, 1, (c, X, Y) => { c.rect(X + 2, Y + 13, 29, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 3, 30, 8, [226, 236, 244], [110, 130, 160]); c.rect(X + 3, Y + 11, 3, 3, [110, 130, 160]); c.rect(X + 26, Y + 11, 3, 3, [110, 130, 160]); });
  },
};
const goods = (cols = BOOKS) => (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 6, W, H + 5, [226, 230, 240], [110, 126, 146]); for (let sy = Y - 3; sy + 9 <= Y + H - 2; sy += 10) { c.rect(X + 2, sy, W - 4, 8, [150, 160, 180]); for (let bx = X + 3; bx < X + W - 6; bx += 6) { const col = cols[Math.floor(hsh(bx, sy, 2) * 97) % cols.length]; c.box(bx, sy + 1, 5, 7, col, dk(col, 0.4)); c.rect(bx + 1, sy + 2, 3, 2, lt(col, 0.5)); } } };
R.UnovaShoppingMallNine = {
  theme: { room: "arena", floor: "rMart", wall: null },
  plan(p) {
    const k = base(p, T.check([244, 244, 236], [226, 232, 236], 1), (c, X, Y, W) => { Wl.plain([236, 226, 206], { base: [110, 130, 170] })(c, X, Y, W); const shops = [[226, 90, 90], [90, 150, 230], [110, 190, 110], [240, 190, 70], [190, 110, 210], [240, 140, 80]]; shops.forEach((col, i) => { const x = X + 6 + i * (W - 12) / 6; c.box(x, Y + 3, (W - 12) / 6 - 6, 9, col, dk(col, 0.4)); c.rect(x + 6, Y + 6, (W - 12) / 6 - 18, 3, WHITE); c.box(x + 2, Y + 14, (W - 12) / 6 - 10, 13, [200, 230, 244], [110, 126, 146]); c.rect(x + 4, Y + 20, 6, 7, col); c.rect(x + 14, Y + 18, 6, 9, lt(col, 0.4)); }); c.box(X + W / 2 - 14, Y, 28, 12, WHITE, INK); c.rect(X + W / 2 - 3, Y + 2, 6, 8, RED); }, { all: "stairs" }, [90, 150, 230]);
    k.art((c) => { for (let y = 4; y <= 23; y++) { c.rect(14 * S, y * S, S * 3, S, [200, 220, 240, 110]); } const cx = 15 * S + 8, cy = 13 * S + 8; c.ellipse(cx, cy, 30, 22, [226, 90, 90, 150]); c.ellipse(cx, cy, 30, 22, WHITE, 2); c.rect(cx - 3, cy - 12, 8, 24, WHITE); c.ellipse(cx + 1, cy - 6, 9, 7, WHITE, 3); });
    for (const x of [8, 11, 18, 21]) k.put(x, 2, 3, 2, (c, X, Y, W, H) => goods()(c, X, Y - 6, W, H + 6));
    for (const x of [10, 17]) k.put(x, 6, 4, 1, (c, X, Y, W, H) => { P.counter(c, X, Y - 4, W, H + 4, [90, 150, 230], WHITE); c.box(X + (x === 10 ? 44 : 6), Y - 9, 12, 8, [60, 64, 80], INK); }, { tall: true });
    for (const [x, y, cols] of [[5, 9, [[226, 90, 90], [250, 200, 90]]], [20, 9, [[90, 150, 230], WHITE]], [5, 14, [[110, 190, 110], [240, 190, 70]]], [20, 14, [[190, 110, 210], [240, 140, 80]]], [8, 19, BOOKS], [18, 19, BOOKS]]) k.put(x, y, 5, 2, goods(cols), { rows: 1 });
    for (const [x, y] of [[2, 22], [27, 22], [2, 9], [27, 9], [12, 21], [18, 22]]) tall(k, x, y, 1, P.plant);
    k.put(26, 3, 2, 2, (c, X, Y, W, H) => { for (const dx of [0, 16]) { c.box(X + dx, Y - 10, 16, H + 8, dx ? [60, 110, 190] : [214, 60, 60], INK); c.rect(X + dx + 2, Y - 8, 12, 14, [226, 240, 250]); for (let i = 0; i < 3; i++) c.rect(X + dx + 3 + i * 4, Y - 6, 2, 10, [[240, 200, 70], [90, 170, 230], [110, 200, 120]][i]); c.rect(X + dx + 3, Y + 20, 10, 6, INK); } });
    k.put(2, 13, 2, 2, (c, X, Y, W, H) => { c.ellipse(X + 16, Y + 26, 14, 5, [0, 0, 0, 50]); c.ellipse(X + 16, Y + 20, 15, 9, [170, 176, 190]); c.ellipse(X + 16, Y + 19, 12, 6, [90, 170, 230]); c.rect(X + 15, Y + 4, 2, 14, [200, 230, 250]); c.ellipse(X + 16, Y + 5, 5, 3, [200, 230, 250, 180]); });
  },
};
// Join Avenue: a brick promenade between two rows of stalls.
R.UnovaJoinAvenue = {
  theme: { room: "arena", floor: "brick", wall: null },
  plan(p) {
    const k = base(p, T.check([206, 150, 120], [196, 140, 112], 1), (c, X, Y, W) => { Wl.brick([190, 130, 100])(c, X, Y, W); for (let i = 0; i < W; i += 14) c.poly([[X + i, Y + 2], [X + i + 12, Y + 2], [X + i + 6, Y + 13]], [[226, 90, 90], [250, 210, 90], [90, 150, 230], [110, 190, 110]][(i / 14) % 4]); c.rect(X, Y, W, 2, [90, 70, 60]); }, { all: "arch" }, [250, 210, 90]);
    k.floor(T.check([236, 222, 190], [226, 210, 176], 1), 11, 3, 19, 37, 0.02);
    k.art((c) => { for (let y = 3; y <= 37; y++) { c.rect(11 * S, y * S, 2, S, [150, 110, 80]); c.rect(20 * S - 2, y * S, 2, S, [150, 110, 80]); } const cx = 15 * S + 8; for (const cy of [19 * S + 8, 23 * S + 8]) { c.ellipse(cx, cy, 24, 16, [250, 210, 90, 120]); c.ellipse(cx, cy, 24, 16, [150, 110, 80], 2); } for (const y of [8, 18, 28]) star(c, cx, y * S, 9, [250, 210, 90, 170]); });
    const stall = (col, n) => (c, X, Y, W, H) => { const b = Y + H; c.rect(X + 2, b - 1, W - 2, 3, [0, 0, 0, 50]); c.box(X + 2, b - 30, W - 4, 30, [226, 206, 170], [110, 80, 60]); c.rect(X + 4, b - 26, W - 8, 12, [70, 54, 50]); for (let i = 0; i < 6; i++) { const g = [[226, 90, 90], [250, 210, 90], [110, 190, 110], [90, 150, 230], [240, 150, 190], [240, 240, 240]][(i + n) % 6]; if (n % 3 === 0) c.ellipse(X + 12 + i * 15, b - 18, 4, 4, g); else if (n % 3 === 1) c.box(X + 8 + i * 15, b - 24, 8, 9, g, dk(g, 0.4)); else { c.rect(X + 11 + i * 15, b - 24, 2, 9, [90, 160, 100]); c.ellipse(X + 12 + i * 15, b - 24, 4, 3, g); } } c.box(X + 1, b - 13, W - 2, 13, [176, 130, 84], [90, 60, 40]); c.rect(X + 2, b - 12, W - 4, 3, [226, 190, 140]); c.rect(X + 2, b - 46, 3, 20, [110, 80, 60]); c.rect(X + W - 5, b - 46, 3, 20, [110, 80, 60]); c.rect(X - 2, b - 50, W + 4, 12, col); for (let i = -2; i < W + 2; i += 12) c.rect(X + i, b - 50, 6, 12, WHITE); for (let i = -2; i < W + 2; i += 12) { c.ellipse(X + i + 3, b - 38, 3, 2, WHITE); c.ellipse(X + i + 9, b - 38, 3, 2, col); } };
    [[6, [226, 90, 90]], [16, [90, 150, 230]], [26, [110, 190, 110]], [36, [240, 170, 70]]].forEach(([y, col], i) => { k.put(3, y - 3, 7, 3, stall(col, i), { rows: 2 }); k.put(20, y - 3, 7, 3, stall([col[2], col[0], col[1]], i + 1), { rows: 2 }); });
    for (const y of [10, 14, 24, 32]) for (const x of [11, 19]) tall(k, x, y, 1, (c, X, Y, W, H) => { glow(c, X + 8, Y + 2, 14, [255, 240, 170], 22); c.rect(X + 7, Y + 6, 2, H - 8, [60, 60, 70]); c.box(X + 4, Y + H - 4, 8, 3, [60, 60, 70], INK); c.box(X + 4, Y - 3, 8, 9, [255, 240, 170], [60, 60, 70]); });
    for (const [x, y] of [[9, 11], [20, 11], [9, 21], [20, 21], [9, 31], [20, 31]]) k.put(x, y, 1, 2, (c, X, Y, W, H) => { c.box(X + 1, Y + 6, 14, H - 8, [150, 110, 80], [80, 56, 40]); for (let i = 0; i < 4; i++) { c.ellipse(X + 5 + (i & 1) * 6, Y + 5 + (i >> 1) * 10, 4, 4, [70, 150, 84]); c.ellipse(X + 5 + (i & 1) * 6, Y + 4 + (i >> 1) * 10, 2, 2, [[250, 150, 190], [250, 220, 100], WHITE, [226, 90, 90]][(i + y) % 4]); } });
    k.put(14, 11, 3, 3, (c, X, Y, W, H) => { c.ellipse(X + 24, Y + 40, 24, 7, [0, 0, 0, 50]); c.ellipse(X + 24, Y + 30, 24, 15, [170, 176, 190]); c.ellipse(X + 24, Y + 28, 20, 11, [90, 170, 230]); c.ellipse(X + 24, Y + 28, 20, 11, [200, 230, 250], 1); c.box(X + 20, Y + 10, 8, 18, [190, 196, 210], [90, 96, 116]); c.ellipse(X + 24, Y + 10, 10, 4, [190, 196, 210]); c.rect(X + 23, Y, 2, 10, [200, 230, 250]); c.ellipse(X + 24, Y + 2, 6, 3, [200, 230, 250, 170]); }, { rows: 2 });
  },
};

// ================================================================ the Royal Unova
const cabinWall = (c, X, Y, W) => { Wl.plain([236, 222, 196], { base: [130, 84, 50], rail: GOLD })(c, X, Y, W); for (let x = 22; x < W - 10; x += 48) { c.ellipse(X + x, Y + 10, 7, 7, GOLD); c.ellipse(X + x, Y + 10, 5, 5, [110, 180, 230]); c.rect(X + x - 4, Y + 11, 9, 3, [60, 120, 200]); c.p(X + x - 2, Y + 7, WHITE); } };
R.UnovaRoyalUnova = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = base(p, T.plank([200, 160, 110]), cabinWall, { all: "none" }, [176, 40, 56]);
    runner(k, 3, 10, 60, 12, [176, 40, 56]);
    k.fixtures((s) => s.w === 3 ? (c, X, Y, W, H) => { c.box(X - 4, Y - 20, W + 8, H + 20, [236, 222, 196], [130, 84, 50]); c.rect(X - 4, Y - 20, W + 8, 3, GOLD); c.box(X + 14, Y - 12, 20, 28, [130, 84, 50], [70, 44, 30]); c.rect(X + 16, Y - 10, 16, 10, [176, 124, 80]); c.rect(X + 16, Y + 2, 16, 12, [176, 124, 80]); c.rect(X + 30, Y + 2, 2, 3, GOLD); c.box(X + 19, Y - 19, 10, 6, GOLD, [130, 96, 40]); c.ellipse(X + 5, Y - 4, 4, 4, GOLD); c.ellipse(X + 5, Y - 4, 2, 2, [110, 180, 230]); c.ellipse(X + 43, Y - 4, 4, 4, GOLD); c.ellipse(X + 43, Y - 4, 2, 2, [110, 180, 230]); } : null);
    k.art((c) => { for (const w of p.warps) if (!w.exit) { if (w.x > 56) { c.box(w.x * S + 2, w.y * S - 8, 13, 32, [60, 120, 200], [30, 60, 110]); c.rect(w.x * S + 5, w.y * S - 5, 7, 26, [130, 180, 240]); } else { c.box(w.x * S - 2, w.y * S + 1, 20, 13, [60, 120, 200], [30, 60, 110]); c.rect(w.x * S + 1, w.y * S + 4, 14, 7, [130, 180, 240]); } } });
    for (let x = 8; x < 58; x += 7) { tall(k, x + 1, 5, 1, P.plant); if (x < 50) k.put(x, 17, 2, 1, (c, X, Y) => { c.box(X + 1, Y + 2, 30, 10, [130, 40, 60], [70, 20, 30]); c.rect(X + 2, Y + 3, 28, 3, [176, 70, 90]); c.rect(X + 3, Y + 12, 3, 2, GOLD); c.rect(X + 26, Y + 12, 3, 2, GOLD); }); }
    for (const [x, y] of [[2, 3], [61, 3], [2, 21], [61, 21], [57, 8], [57, 16]]) tall(k, x, y, 1, P.pillar, [236, 222, 196]);
    k.put(52, 18, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, [60, 120, 200]));
  },
};
function cabin(i) {
  const col = [[90, 130, 210], [200, 90, 110], [110, 170, 120], [226, 170, 80], [150, 110, 200]][i % 5];
  return {
    theme: { room: "arena", floor: "deck", wall: null },
    plan(p) {
      const k = base(p, T.plank([206, 166, 116]), cabinWall, {}, col);
      k.art((c) => rug(c, 6, 8, 13, 12, col, WHITE));
      k.fixtures((s) => s.w === 2 ? (s.x < 10) === (i % 2 === 0) ? (c, X, Y, W, H) => P.bed(c, X + 3, Y - 6, W - 6, H + 5, col) : (c, X, Y, W, H) => { P.table(c, X, Y + 4, W, H - 4, [130, 84, 50]); c.rect(X + 14, Y - 2, 3, 9, GOLD); c.poly([[X + 8, Y - 2], [X + 23, Y - 2], [X + 20, Y - 12], [X + 11, Y - 12]], [250, 236, 180]); c.box(X + 22, Y + 8, 7, 5, WHITE, [150, 150, 160]); } : null);
      const suitcase = (c, X, Y) => { c.rect(X + 2, Y + 14, 13, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 4, 14, 10, [150, 96, 60], [70, 44, 30]); c.rect(X + 5, Y + 2, 6, 2, [70, 44, 30]); c.rect(X + 4, Y + 4, 1, 10, GOLD); c.rect(X + 11, Y + 4, 1, 10, GOLD); };
      k.put(i % 2 ? 3 : 15, 9, 1, 1, suitcase); k.put(i % 3 ? 16 : 2, 13, 1, 1, suitcase);
      k.put(8, 2, 2, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 1, Y - 6, W - 2, H + 4, [130, 84, 50], [70, 44, 30]); c.rect(X + 3, Y - 2, W - 6, 8, [176, 124, 80]); c.rect(X + 3, Y + 9, W - 6, 8, [176, 124, 80]); c.rect(X + 14, Y + 2, 4, 2, GOLD); c.rect(X + 14, Y + 13, 4, 2, GOLD); c.ellipse(X + 9, Y - 10, 4, 5, [200, 220, 250]); c.ellipse(X + 9, Y - 13, 3, 3, [[250, 150, 190], [250, 220, 100]][i % 2]); });
      for (const [x, y] of [[2, 3], [17, 3]]) tall(k, x, y, 1, P.plant);
    },
  };
}
for (let i = 0; i < 15; i++) R["UnovaRoyalUnovaCabin" + i] = cabin(i);
// The observation deck: a pool under the evening sky, loungers and parasols.
R.UnovaRoyalUnovaDeck = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = kit(p), wat = T.water([70, 170, 226]);
    p.fill("water", 3, 3, 28, 7);
    k.floor(T.plank([214, 176, 126]));
    k.wall((c, X, Y, W) => { for (let y = 0; y < 22; y += 2) c.rect(X, Y + y, W, 2, mix([90, 110, 200], [250, 170, 110], y / 22)); c.ellipse(X + W * 0.7, Y + 20, 10, 10, [255, 236, 150]); c.rect(X, Y + 22, W, 10, [50, 100, 180]); for (let x = 0; x < W; x += 9) c.rect(X + x, Y + 25 + (x % 2) * 3, 4, 1, [250, 190, 140]); c.rect(X, Y + 17, W, 2, WHITE); c.rect(X, Y + 24, W, 1, WHITE); for (let x = 0; x < W; x += 8) c.rect(X + x, Y + 17, 2, 15, WHITE); c.rect(X, Y + 30, W, 2, [110, 84, 54]); });
    k.doors({ all: "side" }, [60, 120, 200]);
    p.paint(0.05, (c) => { for (let y = 3; y <= 7; y++) for (let x = 3; x <= 28; x++) wat(c, x * S, y * S, x, y); frame(c, 3 * S - 3, 3 * S - 3, 26 * S + 6, 5 * S + 6, [236, 240, 250], 3); frame(c, 3 * S, 3 * S, 26 * S, 5 * S, [110, 190, 230], 1); for (let x = 5; x < 28; x += 4) c.rect(x * S, 3 * S, 1, 5 * S, [255, 255, 255, 70]); for (const x of [5, 26]) { c.rect(x * S, 3 * S - 6, 2, 12, [200, 206, 220]); c.rect(x * S + 8, 3 * S - 6, 2, 12, [200, 206, 220]); c.rect(x * S, 3 * S, 10, 1, [200, 206, 220]); } c.ellipse(15 * S, 5 * S + 8, 7, 5, [250, 110, 130]); c.ellipse(15 * S, 5 * S + 8, 3, 2, [70, 170, 226]); c.ellipse(21 * S, 4 * S + 8, 6, 6, [250, 230, 110]); c.rect(21 * S - 6, 4 * S + 7, 12, 2, WHITE); });
    k.art((c) => { const cx = 16 * S + 8, cy = 12 * S + 8; c.ellipse(cx, cy, 30, 20, [60, 120, 200, 110]); c.ellipse(cx, cy, 30, 20, WHITE, 2); for (let a = 0; a < 8; a++) c.line(cx, cy, cx + Math.cos(a * 0.785) * 28, cy + Math.sin(a * 0.785) * 18, WHITE); c.ellipse(cx, cy, 6, 4, [60, 120, 200]); });
    const lounger = (col) => (c, X, Y, W, H) => { c.rect(X + 3, Y + H - 2, 12, 2, [0, 0, 0, 50]); c.box(X + 2, Y + 8, 12, H - 10, WHITE, [150, 150, 160]); for (let i = 10; i < H - 4; i += 4) c.rect(X + 3, Y + i, 10, 2, col); c.box(X + 2, Y + 2, 12, 8, lt(col, 0.3), [150, 150, 160]); };
    const parasol = (col) => (c, X, Y, W, H) => { c.ellipse(X + 8, Y + H - 2, 4, 2, [0, 0, 0, 60]); c.rect(X + 7, Y + 4, 2, H - 6, [150, 150, 160]); c.ellipse(X + 8, Y + 4, 15, 8, col); for (let a = -12; a <= 12; a += 8) c.poly([[X + 8, Y - 4], [X + 8 + a, Y + 8], [X + 12 + a, Y + 8]], WHITE); c.ellipse(X + 8, Y - 3, 2, 2, WHITE); };
    [[6, 10], [10, 10], [22, 10], [26, 10], [6, 17], [26, 17]].forEach(([x, y], i) => { const col = [[226, 90, 90], [90, 150, 230], [250, 200, 90]][i % 3]; k.put(x, y, 1, 2, lounger(col)); tall(k, x + 1, y + 1, 1, parasol(col)); });
    for (const [x, y] of [[12, 18], [19, 18]]) k.put(x, y, 2, 2, (c, X, Y, W, H) => { P.table(c, X + 4, Y + 6, W - 8, H - 6, WHITE); c.rect(X + 11, Y + 4, 3, 7, [250, 170, 90]); c.rect(X + 18, Y + 5, 3, 6, [130, 220, 170]); }, { rows: 1 });
    for (const [x, y] of [[2, 21], [29, 21], [2, 9], [29, 9]]) tall(k, x, y, 1, P.plant);
    for (const x of [8, 16, 23]) k.put(x, 21, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 8, 7, 7, WHITE); c.ellipse(X + 8, Y + 8, 7, 7, RED, 2); c.ellipse(X + 8, Y + 8, 3, 3, [214, 176, 126]); });
  },
};
R.UnovaRoyalUnovaDock = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = base(p, T.plank([190, 150, 106]), (c, X, Y, W) => { Wl.plain([226, 232, 240], { base: [70, 110, 170] })(c, X, Y, W); for (let x = 10; x + 30 < W; x += 54) { c.box(X + x, Y + 5, 30, 18, [150, 206, 244], [70, 110, 170]); c.rect(X + x + 1, Y + 16, 28, 6, [50, 110, 190]); if (x % 108 < 54) { c.poly([[X + x + 6, Y + 16], [X + x + 24, Y + 16], [X + x + 21, Y + 20], [X + x + 9, Y + 20]], WHITE); c.rect(X + x + 12, Y + 11, 7, 5, WHITE); c.rect(X + x + 14, Y + 8, 2, 3, RED); } } }, { all: "stairs" }, [60, 120, 200]);
    runner(k, 12, 8, 14, 19, [60, 120, 200], WHITE);
    for (const x of [9, 15]) k.put(x, 7, 3, 1, (c, X, Y, W, H) => P.counter(c, X, Y - 4, W, H + 4, [60, 120, 200], WHITE), { tall: true });
    for (const [x, y] of [[4, 15], [4, 18], [18, 12], [18, 15], [18, 18]]) k.put(x, y, 3, 1, (c, X, Y) => { c.rect(X + 2, Y + 13, 45, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 3, 46, 8, [226, 236, 244], [110, 130, 160]); c.rect(X + 3, Y + 11, 3, 3, [110, 130, 160]); c.rect(X + 42, Y + 11, 3, 3, [110, 130, 160]); });
    crates(k, [[2, 4, 2], [5, 4, 1], [16, 4, 2], [2, 9, 1]]);
    for (const [x, y] of [[2, 19], [23, 19], [20, 7]]) tall(k, x, y, 1, P.barrel);
    for (const [x, y] of [[11, 14], [15, 14], [11, 18], [15, 18]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.rect(X + 7, Y + 12, 2, H - 14, GOLD); c.ellipse(X + 8, Y + 11, 3, 3, GOLD); c.box(X + 5, Y + H - 4, 6, 3, GOLD, [130, 96, 40]); });
    k.put(7, 3, 2, 1, (c, X, Y) => { c.ellipse(X + 16, Y + 2, 11, 11, WHITE); c.ellipse(X + 16, Y + 2, 11, 11, RED, 3); c.ellipse(X + 16, Y + 2, 5, 5, [226, 232, 240]); }, { tall: true });
  },
};

// ================================================================ Black Tower and White Treehollow
function towerTheme(white) {
  return white
    ? { floor: T.plank([226, 214, 186]), a: [110, 180, 100], wallc: (c, X, Y, W) => { Wl.plain([150, 110, 76], { panel: 20, base: [96, 66, 44] })(c, X, Y, W); for (let x = 4; x < W; x += 10) { const h = hsh(x, 1, 2); c.ellipse(X + x, Y + 3 + h * 8, 5, 4, [90, 160, 90]); c.ellipse(X + x + 3, Y + 6 + h * 6, 4, 3, [120, 190, 110]); if (h > 0.7) c.rect(X + x, Y + 8, 1, 12, [70, 130, 70]); } }, part: [130, 96, 64], lamp: [190, 250, 170], mat: [110, 180, 100] }
    : { floor: T.check([50, 50, 62], [40, 40, 52], 1), a: [226, 60, 80], wallc: (c, X, Y, W) => { Wl.plain([36, 36, 48], { panel: 32, base: [20, 20, 28] })(c, X, Y, W); c.rect(X, Y + 8, W, 2, [226, 60, 80]); c.rect(X, Y + 20, W, 1, [110, 230, 250]); for (let x = 12; x + 20 < W; x += 64) Wl.screen(c, X + x, Y + 11, 20, 12, [60, 20, 40], (c2, cx, cy) => c2.rect(cx - 6, cy, 12, 1, [250, 110, 130])); }, part: [30, 30, 42], lamp: [250, 110, 130], mat: [226, 60, 80] };
}
function towerLobby(white) {
  return {
    theme: { room: "arena", floor: white ? "deck" : "darkpave", wall: null },
    plan(p) {
      const t = towerTheme(white), k = base(p, t.floor, t.wallc, { all: "none" }, t.mat);
      runner(k, 14, 8, 18, 22, white ? [90, 160, 90] : [120, 30, 50], white ? [226, 240, 200] : [110, 230, 250]);
      k.art((c) => { const cx = 16 * S + 8, cy = 14 * S; c.ellipse(cx, cy, 44, 32, white ? [240, 250, 230] : [20, 20, 30]); c.ellipse(cx, cy, 44, 32, t.a, 2); if (white) { for (let a = 0; a < 6; a++) c.ellipse(cx + Math.cos(a * 1.05) * 20, cy + Math.sin(a * 1.05) * 14, 10, 6, [110, 180, 100]); c.ellipse(cx, cy, 8, 6, [150, 110, 76]); } else { c.poly([[cx - 10, cy + 20], [cx - 6, cy - 22], [cx + 6, cy - 22], [cx + 10, cy + 20]], [60, 60, 76]); for (let y = -18; y < 18; y += 6) c.rect(cx - 4, cy + y, 8, 2, t.a); } let n = 0; for (const w of p.warps) if (!w.exit) { n++; const X = w.x * S, Y = w.y * S; c.box(X - 1, Y - 2, 18, 18, white ? [150, 110, 76] : [20, 20, 30], INK); c.rect(X + 1, Y, 14, 14, mix(t.a, [250, 250, 250], n / 14)); c.rect(X + 6, Y + 3, 4, 8, INK); if (n === 10) c.rect(X + 3, Y + 3, 2, 8, INK); } });
      for (const x of [12, 18]) k.put(x, 7, 3, 1, (c, X, Y, W, H) => P.counter(c, X, Y - 4, W, H + 4, white ? [150, 110, 76] : [50, 50, 66], t.a), { tall: true });
      for (const [x, y] of [[4, 8], [26, 8], [4, 15], [26, 15]]) k.put(x, y, 2, 2, (c, X, Y, W, H) => white ? P.rock(c, X, Y, W, H, [130, 150, 110]) : P.console(c, X, Y, W, H, [50, 50, 66], t.lamp), { rows: 1 });
      for (const [x, y] of [[2, 4], [29, 4], [9, 4], [22, 4], [2, 19], [29, 19], [11, 12], [21, 12]]) tall(k, x, y, 1, white ? P.plant : P.torch, white ? [80, 170, 90] : t.lamp);
      k.put(5, 2, 4, 2, (c, X, Y, W, H) => white ? P.bookcase(c, X, Y - 8, W, H + 8, [150, 110, 76]) : P.console(c, X, Y - 8, W, H + 8, [50, 50, 66], t.lamp));
      k.put(23, 2, 4, 2, (c, X, Y, W, H) => white ? P.bookcase(c, X, Y - 8, W, H + 8, [150, 110, 76]) : P.console(c, X, Y - 8, W, H + 8, [50, 50, 66], [110, 230, 250]));
    },
  };
}
function towerFloor(white, seed) {
  return {
    theme: { room: "arena", floor: white ? "deck" : "darkpave", wall: null },
    plan(p) {
      const t = towerTheme(white), k = base(p, t.floor, t.wallc, { all: white ? "hole" : "panel" }, t.mat);
      k.art((c) => { for (const [x0, x1] of [[2, 14], [16, 29], [31, 43]]) hazardLine(c, x0, 3, x1, 34, white ? [110, 180, 100, 120] : [226, 60, 80, 140]); for (const q of p.people) if (/trainer|nurse|gate/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 9; c.ellipse(X, Y, 16, 11, white ? [200, 230, 180, 170] : [20, 20, 30, 200]); c.ellipse(X, Y, 16, 11, t.a, 2); } for (let i = 0; i < 40; i++) { const x = (2.5 + hsh(i, seed, 1) * 40) * S, y = (3.5 + hsh(i, seed, 2) * 31) * S; if (white) { c.ellipse(x, y, 4, 2, [110, 180, 100, 160]); c.rect(x - 4, y, 8, 1, [70, 130, 70, 160]); } else c.rect(x, y, 6, 1, i & 1 ? [226, 60, 80, 150] : [110, 230, 250, 150]); } });
      k.fixtures((s) => (c, X, Y, W, H) => { if (white) { c.rect(X + 1, Y - 8, 14, H + 8, [130, 96, 64]); c.rect(X + 3, Y - 8, 3, H + 8, [170, 130, 90]); c.rect(X + 1, Y + H - 3, 14, 3, [80, 56, 40]); for (let y = Y - 10; y < Y + H - 8; y += 9) { c.ellipse(X + 3 + hsh(X, y, 1) * 10, y + 2, 6, 4, [80, 150, 84]); c.ellipse(X + 5 + hsh(X, y, 2) * 8, y, 4, 3, [120, 190, 110]); } } else { c.box(X + 2, Y - 8, 12, H + 8, [30, 30, 42], INK); c.rect(X + 7, Y - 6, 2, H + 2, t.a); c.rect(X + 2, Y + H - 3, 12, 3, [16, 16, 24]); for (let y = Y - 4; y < Y + H - 6; y += 12) c.rect(X + 4, y, 8, 1, [110, 230, 250]); } });
      for (let i = 0; i < 26; i++) { const x = 2 + Math.floor(hsh(i, seed, 3) * 42), y = 4 + Math.floor(hsh(i, seed, 4) * 30); if (Math.abs(x - 23) < 3) continue; if (i % 3 === 0) k.put(x, y - 1, 2, 2, (c, X, Y, W, H) => white ? P.rock(c, X, Y + 4, W, H - 4, [130, 150, 110]) : P.console(c, X, Y + 2, W, H - 2, [50, 50, 66], t.lamp), { rows: 1 }); else tall(k, x, y, 1, white ? (i % 3 === 1 ? P.plant : (c, X, Y, W, H) => { const cx = X + 8; glow(c, cx, Y + 14, 12, [190, 250, 170], 20); c.rect(cx - 2, Y + 16, 4, H - 18, [236, 230, 214]); c.ellipse(cx, Y + 15, 7, 5, [226, 90, 90]); c.ellipse(cx - 2, Y + 14, 1, 1, WHITE); c.ellipse(cx + 3, Y + 16, 1, 1, WHITE); }) : (i % 3 === 1 ? P.pillar : P.torch), white ? [80, 170, 90] : i % 3 === 1 ? [70, 70, 90] : t.lamp); }
    },
  };
}
function hazardLine(c, x0, y0, x1, y1, col) { frame(c, x0 * S + 4, y0 * S + 4, (x1 - x0 + 1) * S - 8, (y1 - y0 + 1) * S - 8, col, 2); }
R.UnovaBlackTowerLobby = towerLobby(false); R.UnovaWhiteTreehollowLobby = towerLobby(true);
[[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [6, 2], [7, 1], [7, 2], [7, 3], [8, 1], [8, 2], [9, 1], [9, 2], [9, 3], [10, 1], [10, 2], [10, 3], [10, 4]].forEach(([a, f]) => { R["UnovaBlackTowerA" + a + "F" + f] = towerFloor(false, a * 7 + f); R["UnovaWhiteTreehollowA" + a + "F" + f] = towerFloor(true, a * 7 + f + 50); });

// ================================================================ Liberty Garden, Striaton, the Day-Care, the gates
R.UnovaLibertyLighthouse = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([190, 180, 164]), (c, X, Y, W) => { Wl.brick([214, 206, 196])(c, X, Y, W); c.rect(X, Y + 12, W, 6, [200, 70, 60]); for (let x = 30; x + 14 < W; x += 70) { c.box(X + x, Y + 5, 14, 18, [150, 206, 244], [110, 100, 96]); c.ellipse(X + x + 7, Y + 5, 7, 4, [150, 206, 244]); } const ax = X + W - 60; c.ellipse(ax, Y + 8, 5, 5, [70, 76, 96], 2); c.rect(ax - 1, Y + 10, 2, 16, [70, 76, 96]); c.ellipse(ax, Y + 20, 9, 7, [70, 76, 96], 2); c.rect(ax - 10, Y + 12, 20, 14, [214, 206, 196, 0]); const lx = X + 50; c.ellipse(lx, Y + 16, 9, 9, WHITE); c.ellipse(lx, Y + 16, 9, 9, RED, 3); }, { all: "stairs" }, [200, 70, 60]);
    k.art((c) => { const cx = 14 * S, cy = 13 * S + 8; for (const [r, col] of [[150, [170, 160, 146]], [120, [200, 190, 174]], [84, [170, 160, 146]], [50, [214, 204, 186]]]) c.ellipse(cx, cy, r, r * 0.74, col, 3); for (let a = 0; a < 12; a++) c.line(cx + Math.cos(a * 0.524) * 50, cy + Math.sin(a * 0.524) * 37, cx + Math.cos(a * 0.524) * 150, cy + Math.sin(a * 0.524) * 111, [170, 160, 146]); c.ellipse(cx, cy, 30, 22, [200, 70, 60, 140]); star(c, cx, cy, 14, [250, 236, 170]); });
    k.put(18, 3, 3, 3, (c, X, Y, W, H) => { c.ellipse(X + 24, Y + H - 2, 24, 5, [0, 0, 0, 60]); for (let i = 0; i < 6; i++) { c.box(X + i * 4, Y + H - 10 - i * 7, W - i * 4, 9, mix([150, 140, 126], [226, 216, 200], i / 6), [90, 84, 76]); } c.rect(X + W - 3, Y - 16, 3, H + 12, [110, 76, 50]); c.line(X, Y + H - 12, X + W - 3, Y - 14, [110, 76, 50], 2); }, { rows: 2 });
    crates(k, [[3, 4, 2], [8, 3, 1], [3, 20, 2], [22, 20, 2], [2, 12, 1]]);
    for (const [x, y] of [[6, 4], [24, 12], [2, 16], [25, 16], [12, 3]]) tall(k, x, y, 1, P.barrel);
    for (const [x, y] of [[9, 20], [18, 20]]) k.put(x, y, 2, 1, (c, X, Y) => { c.ellipse(X + 16, Y + 9, 12, 6, [176, 150, 110]); c.ellipse(X + 16, Y + 9, 12, 6, [130, 104, 70], 2); c.ellipse(X + 16, Y + 9, 6, 3, [130, 104, 70], 2); });
    for (const [x, y] of [[2, 4], [25, 4], [2, 22], [25, 22]]) tall(k, x, y, 1, P.torch, [250, 200, 90]);
  },
};
// Victini's room under the lighthouse: a child's bedroom walled into the cellar.
R.UnovaLibertySanctuary = {
  theme: { room: "arena", floor: "paving", wall: null },
  plan(p) {
    const k = base(p, T.slab([150, 144, 136]), (c, X, Y, W) => { Wl.brick([130, 124, 120])(c, X, Y, W); c.rect(X + 7 * S, Y, 12 * S, 32, [250, 226, 190]); c.rect(X + 7 * S, Y + 27, 12 * S, 5, [240, 150, 80]); for (let x = 7 * S + 8; x < 19 * S - 8; x += 20) { star(c, X + x, Y + 9, 4, [250, 190, 90]); c.ellipse(X + x + 10, Y + 19, 3, 3, [250, 150, 150]); } Wl.window(c, X + 12 * S, Y + 5, 32, 18, [250, 220, 150]); }, {}, [240, 150, 80]);
    k.floor(T.carpet([250, 200, 130]), 9, 2, 20, 15, 0.02); k.floor(T.plank([214, 176, 126]), 9, 16, 20, 23, 0.02);
    k.art((c) => { rug(c, 12, 8, 17, 12, [240, 130, 70], [250, 236, 170]); const cx = 15 * S, cy = 10 * S + 8; c.poly([[cx - 12, cy - 10], [cx - 2, cy + 6], [cx - 2, cy - 2]], [250, 236, 170]); c.poly([[cx + 12, cy - 10], [cx + 2, cy + 6], [cx + 2, cy - 2]], [250, 236, 170]); for (let i = 0; i < 12; i++) { const x = (9.5 + hsh(i, 2, 1) * 10.5) * S, y = (5 + hsh(i, 2, 2) * 16) * S, col = [[236, 80, 80], [80, 150, 236], [250, 210, 80], [110, 200, 120]][i % 4]; if (i % 2) ball(c, x, y, 4, col); else c.box(x, y, 7, 7, col, dk(col, 0.4)); } });
    k.fixtures((s) => s.h > 4 ? (c, X, Y, W, H) => { c.rect(X, Y - 10, W, H + 10, [130, 124, 120]); for (let y = Y - 10; y < Y + H; y += 8) { c.rect(X, y + 7, W, 1, [90, 84, 84]); c.rect(X + ((y / 8) & 1 ? 4 : 11), y, 1, 7, [90, 84, 84]); } c.rect(X, Y - 10, W, 3, [176, 170, 166]); c.rect(X, Y + H - 3, W, 3, [80, 76, 76]); } : null);
    k.put(9, 2, 2, 3, (c, X, Y, W, H) => P.bed(c, X + 2, Y - 4, W - 4, H + 2, [240, 130, 70]));
    k.put(18, 2, 2, 2, (c, X, Y, W, H) => P.bookcase(c, X, Y - 10, W, H + 10, [226, 170, 110]));
    k.put(12, 2, 2, 2, (c, X, Y, W, H) => { P.table(c, X, Y + 4, W, H - 4, [226, 170, 110]); c.ellipse(X + 10, Y + 6, 5, 4, [250, 236, 170]); c.rect(X + 20, Y + 2, 5, 9, [250, 150, 150]); });
    for (const [x, y, col] of [[10, 13, [250, 220, 90]], [19, 12, [240, 150, 180]], [10, 19, [150, 110, 80]], [19, 20, [240, 240, 240]]]) k.put(x, y, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 14, 6, 2, [0, 0, 0, 50]); c.ellipse(X + 8, Y + 10, 6, 5, col); c.ellipse(X + 8, Y + 4, 4, 4, col); c.ellipse(X + 4, Y + 1, 2, 2, dk(col, 0.2)); c.ellipse(X + 12, Y + 1, 2, 2, dk(col, 0.2)); c.p(X + 6, Y + 4, INK); c.p(X + 10, Y + 4, INK); });
    crates(k, [[2, 4, 2], [5, 4, 1], [2, 12, 1], [24, 4, 2], [26, 10, 1], [2, 21, 2], [25, 22, 2], [5, 16, 1]], [130, 110, 96]);
    for (const [x, y] of [[4, 9], [25, 14], [6, 22], [23, 5]]) tall(k, x, y, 1, P.barrel);
  },
};
// Striaton's restaurant, where the three brothers once held the Gym: their three curtains still hang at the back.
R.UnovaStriatonRestaurant = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const tri = [[90, 170, 100], [214, 70, 60], [70, 130, 220]];
    const k = base(p, T.plank([190, 140, 96]), (c, X, Y, W) => { Wl.plain([244, 232, 206], { base: [130, 84, 50] })(c, X, Y, W); tri.forEach((col, i) => { const x = X + W / 2 - 110 + i * 78; Wl.curtain(c, x, Y + 1, 64, 28, col); c.ellipse(x + 32, Y + 14, 9, 9, WHITE); if (i === 0) { c.ellipse(x + 32, Y + 14, 4, 6, col); c.rect(x + 32, Y + 9, 1, 11, WHITE); } else if (i === 1) { c.poly([[x + 27, Y + 19], [x + 32, Y + 7], [x + 37, Y + 19]], col); } else { c.poly([[x + 32, Y + 7], [x + 37, Y + 17], [x + 27, Y + 17]], col); c.ellipse(x + 32, Y + 16, 5, 4, col); } }); }, {}, [214, 70, 60]);
    k.floor(T.check([236, 226, 206], [200, 60, 56], 1), 8, 2, 22, 8, 0.02); runner(k, 14, 9, 16, 23, [150, 36, 50]);
    k.art((c) => { c.rect(8 * S, 9 * S - 3, 15 * S, 3, [110, 70, 46]); tri.forEach((col, i) => { const cx = (11 + i * 4) * S + 8, cy = 5 * S; c.ellipse(cx, cy, 20, 13, A(col, 150)); c.ellipse(cx, cy, 20, 13, WHITE, 1); }); });
    const dine = (col) => (c, X, Y, W, H) => { P.cloth(c, X, Y, W, H, col); c.rect(X + W / 2 - 1, Y - 2, 2, 7, [240, 236, 220]); c.rect(X + W / 2 - 1, Y - 4, 2, 2, [250, 180, 80]); };
    for (const [x, y, i] of [[4, 11, 0], [4, 16, 1], [9, 13, 2], [9, 19, 0], [19, 13, 1], [19, 19, 2], [24, 11, 0], [24, 16, 1]]) if (k.put(x, y, 3, 2, dine(lt(tri[i], 0.75)))) k.art((c) => { P.chair(c, (x - 1) * S + 2, y * S + 8, [130, 84, 50]); P.chair(c, (x + 3) * S - 2, y * S + 8, [130, 84, 50]); }, 0.3);
    k.put(2, 3, 4, 2, (c, X, Y, W, H) => { P.counter(c, X, Y, W, H, [130, 84, 50], [226, 200, 160]); for (let i = 0; i < 5; i++) { const col = [[90, 160, 110], [200, 150, 70], [150, 70, 90]][i % 3]; c.rect(X + 6 + i * 11, Y - 10, 4, 11, col); c.rect(X + 7 + i * 11, Y - 14, 2, 4, col); } });
    k.put(24, 3, 4, 2, (c, X, Y, W, H) => { P.counter(c, X, Y, W, H, [130, 84, 50], [226, 200, 160]); for (let i = 0; i < 3; i++) { c.ellipse(X + 12 + i * 20, Y, 7, 3, WHITE); c.ellipse(X + 12 + i * 20, Y - 2, 4, 3, [[226, 150, 90], [250, 220, 150], [200, 90, 90]][i]); } });
    for (const [x, y] of [[2, 8], [27, 8], [2, 22], [27, 22], [7, 4], [23, 5], [12, 22], [18, 22]]) tall(k, x, y, 1, P.plant);
  },
};
R.UnovaDayCare = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = base(p, T.plank([226, 196, 146]), (c, X, Y, W) => { Wl.plain([250, 236, 200], { base: [226, 150, 110] })(c, X, Y, W); for (let x = 12; x + 26 < W; x += 56) Wl.window(c, X + x, Y + 6, 26, 16); for (let x = 44; x + 16 < W; x += 56) { c.ellipse(X + x + 8, Y + 13, 6, 8, WHITE); c.ellipse(X + x + 8, Y + 13, 6, 8, [110, 190, 110], 1); c.rect(X + x + 5, Y + 11, 3, 3, [110, 190, 110]); c.rect(X + x + 10, Y + 15, 2, 2, [110, 190, 110]); } }, {}, [226, 150, 110]);
    k.floor(T.grass([130, 196, 110]), 5, 10, 20, 17, 0.02);
    k.art((c) => { frame(c, 5 * S - 2, 10 * S - 2, 16 * S + 4, 8 * S + 4, [250, 250, 240], 2); for (let i = 0; i < 16; i++) { const x = (5.5 + hsh(i, 1, 1) * 15) * S, y = (10.5 + hsh(i, 1, 2) * 7) * S; if (i % 4 === 0) ball(c, x, y, 4, [[236, 80, 80], [80, 150, 236]][i % 8 ? 0 : 1]); else if (i % 4 === 1) { c.ellipse(x, y, 4, 5, WHITE); c.rect(x - 2, y - 1, 2, 2, [110, 190, 110]); c.rect(x + 1, y + 2, 2, 2, [110, 190, 110]); } else { c.ellipse(x, y, 2, 2, [[250, 150, 190], [250, 220, 100]][i % 2]); c.rect(x, y + 2, 1, 3, [70, 140, 80]); } } });
    for (let x = 5; x <= 20; x += 1) for (const y of [10, 17]) if (x < 11 || x > 14) k.put(x, y, 1, 1, (c, X, Y) => { c.rect(X, Y + 4, S, 2, WHITE); c.rect(X, Y + 9, S, 2, WHITE); c.box(X + 6, Y + 1, 4, 13, WHITE, [170, 170, 180]); });
    for (let y = 11; y <= 16; y++) for (const x of [5, 20]) k.put(x, y, 1, 1, (c, X, Y) => { c.rect(X + 6, Y, 2, S, WHITE); c.box(X + 5, Y + 2, 4, 12, WHITE, [170, 170, 180]); });
    for (const x of [5, 10, 15, 20]) k.put(x, 7, 3, 1, (c, X, Y, W, H) => P.counter(c, X, Y - 4, W, H + 4, [226, 150, 110], WHITE), { tall: true });
    shelves(k, [2, 12], 2, [226, 170, 110]);
    k.put(4, 2, 2, 2, (c, X, Y, W, H) => { P.machine(c, X, Y - 8, W, H + 8, [226, 230, 240], [250, 236, 170]); c.ellipse(X + 16, Y + 8, 5, 7, WHITE); });
    for (const [x, y] of [[2, 19], [23, 19], [2, 9], [23, 9], [15, 3]]) tall(k, x, y, 1, P.plant);
  },
};
// The gatehouses: a tiled hall with the attendant's desk, benches and the bulletin board.
function gate(o = {}) {
  return {
    theme: { room: "arena", floor: "rCenter", wall: null },
    plan(p) {
      const hue = o.hue || [90, 150, 210];
      const k = base(p, T.check([236, 240, 244], [214, 224, 236], 1), (c, X, Y, W) => { Wl.plain([214, 230, 240], { base: dk(hue, 0.2) })(c, X, Y, W); for (let x = 10; x + 26 < W; x += 100) Wl.window(c, X + x, Y + 6, 26, 16); const bx = X + (W > 320 ? 56 : 44); c.box(bx, Y + 4, 64, 16, [20, 22, 30], [70, 76, 96]); for (let i = 0; i < 14; i++) if (hsh(i, 3, p.W) > 0.25) c.rect(bx + 4 + i * 4, Y + 8 + (i % 3), 3, 3 + (i % 2) * 3, [250, 170, 60]); c.rect(bx + 4, Y + 16, 56, 1, [110, 230, 130]); }, { all: o.doors || undefined }, hue);
      const ws = p.warps; k.art((c) => { for (let i = 0; i < ws.length; i++) { const a = ws[i], b = { x: p.W >> 1, y: (k.T + k.B) >> 1 }; if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x); c.rect(x0 * S, a.y * S - 8, (x1 - x0 + 1) * S, 32, A(hue, 70)); c.rect(x0 * S, a.y * S - 8, (x1 - x0 + 1) * S, 2, hue); c.rect(x0 * S, a.y * S + 22, (x1 - x0 + 1) * S, 2, hue); } else { const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y); c.rect(a.x * S - 8, y0 * S, 32, (y1 - y0 + 1) * S, A(hue, 70)); c.rect(a.x * S - 8, y0 * S, 2, (y1 - y0 + 1) * S, hue); c.rect(a.x * S + 22, y0 * S, 2, (y1 - y0 + 1) * S, hue); } } ball(c, (p.W >> 1) * S + 8, ((k.T + k.B) >> 1) * S + 8, 9, hue); });
      k.fixtures((s) => s.w === 2 ? (s.y < (k.T + k.B) / 2 ? (c, X, Y, W, H) => { P.counter(c, X, Y, W, H, hue, WHITE); c.box(X + 8, Y - 6, 12, 9, [50, 54, 70], INK); c.rect(X + 10, Y - 4, 8, 5, [110, 190, 236]); } : (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [200, 206, 220]); c.box(X + 6, Y + 5, 9, 7, WHITE, [150, 150, 160]); c.box(X + 17, Y + 6, 9, 7, [250, 220, 150], [150, 150, 160]); }) : s.w === 1 && s.h === 2 ? (c, X, Y, W, H) => P.plant(c, X, Y, W, H) : null);
      for (const [x, y] of [[k.L, k.B], [k.R, k.B], [k.L, k.T + 1], [k.R, k.T + 1]]) tall(k, x, y, 1, P.plant);
      for (const [x, y] of o.benches || []) k.put(x, y, 2, 1, (c, X, Y) => { c.rect(X + 2, Y + 13, 29, 2, [0, 0, 0, 50]); c.box(X + 1, Y + 3, 30, 8, lt(hue, 0.5), dk(hue, 0.3)); c.rect(X + 3, Y + 11, 3, 3, dk(hue, 0.3)); c.rect(X + 26, Y + 11, 3, 3, dk(hue, 0.3)); });
      if (o.extra) o.extra(p, k);
    },
  };
}
R.UnovaAspertiaGate = gate({ benches: [[3, 9], [14, 6]] });
R.UnovaVirbankGate = gate({ hue: [150, 110, 190], benches: [[9, 4], [9, 13], [14, 5]] });
R.UnovaRoute4Gate = gate({ hue: [214, 160, 80], benches: [[3, 10], [14, 6]] });
R.UnovaNacreneGate = gate({ hue: [110, 170, 120], benches: [[9, 4], [18, 14], [22, 5]] });
R.UnovaVersionGateway = gate({ hue: [110, 110, 130], benches: [[8, 12], [18, 12]], extra(p, k) { k.art((c) => { c.rect(2 * S, 9 * S, 12 * S, 10 * S, [30, 30, 44, 60]); c.rect(14 * S, 9 * S, 12 * S, 10 * S, [255, 255, 255, 90]); }, 0.12); for (const [x, col] of [[10, [40, 40, 54]], [17, [240, 240, 244]]]) k.put(x, 4, 2, 2, (c, X, Y, W, H) => { P.statue(c, X + 4, Y, W - 8, H, col); }, { rows: 1 }); } });
// The Trainers' School in Aspertia (the Gym's yard is through the back door).
R.UnovaAspertiaSchool = homeRoom({ floor: [214, 180, 130], wall: [226, 232, 220], doors: { all: "arch" }, mat: [90, 150, 110], plan(p, k) {
  k.wall((c, X, Y, W) => { for (const x of [3, 14]) { c.box(X + x * S - 16, Y + 5, 80, 20, [50, 100, 76], [130, 96, 60]); for (let i = 0; i < 4; i++) c.rect(X + x * S - 10 + i * 6, Y + 9 + i * 3, 30 - i * 4, 1, [226, 240, 230]); c.rect(X + x * S - 14, Y + 24, 76, 2, [226, 220, 200]); } }, 0.04);
  k.fixtures((s) => s.w === 3 ? (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [200, 160, 110]); c.box(X + 6, Y + 5, 10, 7, WHITE, [150, 150, 160]); c.box(X + 28, Y + 5, 10, 7, WHITE, [150, 150, 160]); c.rect(X + 20, Y + 6, 5, 2, [226, 90, 90]); } : null);
  k.art((c) => { for (const s of k.solids) if (s.w === 3) { P.chair(c, s.x * S + 4, (s.y + 2) * S - 2, [150, 110, 76]); P.chair(c, (s.x + 2) * S - 4, (s.y + 2) * S - 2, [150, 110, 76]); } rug(c, 10, 7, 13, 10, [90, 150, 110], WHITE); }, 0.3);
  shelves(k, [2, 4, 18, 20], 2); sideShelves(k, [2, 20], [9, 16]);
  k.put(15, 8, 3, 2, (c, X, Y, W, H) => P.desk(c, X, Y, W, H, [176, 124, 80]));
  for (const [x, y] of [[9, 3], [15, 3], [2, 19], [21, 19]]) tall(k, x, y, 1, P.plant);
  k.put(7, 18, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 8, 6, 6, [90, 150, 230]); c.ellipse(X + 6, Y + 6, 3, 2, [110, 190, 110]); c.rect(X + 7, Y + 14, 2, 2, [110, 76, 50]); });
} });

// ================================================================ a few more named rooms
const seaWindows = (col) => (c, X, Y, W) => { Wl.plain(col, { base: dk(col, 0.4) })(c, X, Y, W); for (let x = 10; x + 44 < W; x += 60) { c.box(X + x, Y + 4, 44, 20, [150, 206, 244], [226, 226, 230]); c.rect(X + x + 1, Y + 15, 42, 8, [60, 130, 210]); c.rect(X + x + 6, Y + 18, 8, 1, WHITE); c.rect(X + x + 24, Y + 20, 8, 1, WHITE); c.rect(X + x + 21, Y + 4, 2, 20, [226, 226, 230]); } };
const roundTable = (col) => (c, X, Y, W, H) => { c.ellipse(X + W / 2, Y + H - 3, W / 2 - 3, 3, [0, 0, 0, 60]); c.rect(X + W / 2 - 2, Y + H / 2, 4, H / 2 - 3, [90, 64, 50]); c.ellipse(X + W / 2, Y + H / 2 - 2, W / 2 - 2, H / 3, dk(col, 0.4)); c.ellipse(X + W / 2, Y + H / 2 - 3, W / 2 - 3, H / 3 - 1, col); c.ellipse(X + W / 2 - 4, Y + H / 2 - 4, 3, 2, WHITE); c.rect(X + W / 2 + 3, Y + H / 2 - 8, 3, 5, [200, 150, 90]); };
const piano = (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 6, W, H + 4, [40, 36, 44], INK); c.rect(X + 2, Y + H - 14, W - 4, 6, WHITE); for (let i = 4; i < W - 4; i += 5) c.rect(X + i, Y + H - 14, 2, 4, INK); c.rect(X + 1, Y - 5, W - 2, 3, [90, 84, 100]); c.box(X + W / 2 - 8, Y - 2, 16, 8, WHITE, [150, 150, 160]); };
// Café Sonata in Castelia: the bar, the little stage where the guitarist plays, round tables.
R.UnovaCasteliaCafe = homeRoom({ floor: [150, 104, 76], wall: [110, 70, 60], windows: [3, 17], mat: [200, 150, 70], plan(p, k) {
  k.floor(T.plank([200, 160, 110]), 15, 7, 21, 12, 0.02);
  k.art((c) => { frame(c, 15 * S, 7 * S, 7 * S, 6 * S, [90, 60, 44], 2); c.ellipse(18 * S + 8, 10 * S + 9, 22, 14, [255, 240, 170, 80]); rug(c, 5, 11, 11, 15, [150, 50, 60], [226, 190, 110]); for (let i = 0; i < 8; i++) { const x = (16 + hsh(i, 1, 1) * 5) * S, y = (7.5 + hsh(i, 1, 2) * 2) * S; c.rect(x + 3, y - 6, 1, 7, INK); c.ellipse(x + 2, y + 1, 2, 2, INK); } });
  k.put(7, 2, 8, 2, (c, X, Y, W, H) => { P.counter(c, X, Y + 4, W, H - 4, [110, 70, 50], [200, 150, 100]); for (let i = 0; i < 9; i++) { const col = [[90, 160, 110], [200, 150, 70], [150, 70, 90], [226, 226, 240]][i % 4]; c.rect(X + 8 + i * 13, Y - 8, 4, 11, col); c.rect(X + 9 + i * 13, Y - 12, 2, 4, col); } c.box(X + W - 22, Y - 4, 14, 10, [150, 156, 170], INK); });
  k.art((c) => { for (let x = 7; x <= 14; x += 2) { c.ellipse(x * S + 8, 4 * S + 8, 5, 4, [150, 50, 60]); c.rect(x * S + 7, 4 * S + 10, 2, 5, [70, 66, 80]); } }, 0.3);
  for (const [x, y, col] of [[3, 7, [226, 200, 160]], [3, 17, [226, 200, 160]], [10, 17, [226, 200, 160]], [17, 16, [226, 200, 160]], [10, 8, [226, 200, 160]]]) if (k.put(x, y, 2, 2, roundTable(col), { rows: 1 })) k.art((c) => { P.chair(c, (x - 1) * S + 2, y * S + 12, [110, 70, 50]); P.chair(c, (x + 2) * S - 2, y * S + 12, [110, 70, 50]); }, 0.3);
  k.put(19, 7, 2, 2, piano);
  for (const [x, y] of [[15, 8], [21, 12]]) tall(k, x, y, 1, (c, X, Y, W, H) => P.speaker(c, X + 2, Y + 4, 12, H - 4));
  for (const [x, y] of [[2, 3], [21, 3], [2, 21], [21, 21], [5, 3]]) tall(k, x, y, 1, P.plant);
} });
// The villa at Undella where Cynthia spends the warm months.
R.UnovaUndellaVilla = {
  theme: { room: "arena", floor: "deck", wall: null },
  plan(p) {
    const k = base(p, T.plank([236, 214, 170]), seaWindows([250, 244, 230]), {}, [90, 170, 220]);
    k.art((c) => { rug(c, 9, 9, 18, 15, [90, 170, 220], WHITE); for (let i = 0; i < 6; i++) star(c, (10 + i * 1.6) * S, 12 * S + (i & 1) * 12, 4, [255, 255, 255, 170]); });
    for (const [x, y] of [[5, 10], [20, 10]]) k.put(x, y, 2, 3, (c, X, Y, W, H) => { shade(c, X, Y, W, H); const col = [240, 236, 226]; c.box(X, Y, W, H - 2, col, dk(col, 0.4)); c.box(X + (x < 14 ? 0 : W - 8), Y, 8, H - 2, dk(col, 0.1), dk(col, 0.4)); c.box(X + (x < 14 ? 8 : 2), Y + 4, W - 10, 18, [150, 200, 230], dk(col, 0.3)); c.box(X + (x < 14 ? 8 : 2), Y + 24, W - 10, 18, [150, 200, 230], dk(col, 0.3)); });
    k.put(11, 16, 3, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [226, 236, 244]); c.ellipse(X + 12, Y + 8, 5, 3, [250, 190, 110]); c.rect(X + 30, Y + 3, 4, 8, [200, 230, 250]); });
    k.put(4, 2, 4, 2, piano); shelves(k, [9, 21], 2, [226, 200, 160]);
    k.put(16, 2, 3, 2, (c, X, Y, W, H) => P.desk(c, X, Y + 4, W, H - 4, [226, 200, 160]));
    k.put(22, 16, 3, 2, (c, X, Y, W, H) => P.cloth(c, X, Y, W, H, WHITE));
    k.put(3, 17, 2, 2, (c, X, Y, W, H) => { P.showcase(c, X, Y, W, H, (c2, cx, by) => { c2.ellipse(cx, by - 5, 6, 5, [250, 200, 220]); c2.ellipse(cx, by - 5, 3, 2, [250, 240, 230]); }); }, { rows: 1 });
    for (const [x, y] of [[2, 4], [25, 4], [2, 21], [25, 21], [13, 3], [8, 21], [19, 21]]) tall(k, x, y, 1, P.plant);
  },
};
// The shelter in Driftveil that Rood keeps for the Pokémon Team Plasma left behind.
R.UnovaDriftveilShelter = homeRoom({ floor: [200, 170, 130], wall: [226, 232, 240], windows: [3, 19], mat: PBLUE, plan(p, k) {
  k.wall((c, X, Y, W) => { Wl.banner(c, X + W / 2 - 9, Y + 3, 18, 26, [226, 226, 236], PBLUE); }, 0.04);
  k.art((c) => { rug(c, 9, 9, 16, 14, [110, 160, 220], WHITE); for (const [x, y, col] of [[5, 9], [5, 13], [20, 9], [9, 17], [15, 17]].map((q, i) => [...q, [[250, 190, 200], [200, 230, 170], [250, 230, 160]][i % 3]])) { c.ellipse(x * S + 8, y * S + 10, 12, 8, dk(col, 0.25)); c.ellipse(x * S + 8, y * S + 9, 10, 6, col); } for (let i = 0; i < 8; i++) ball(c, (3 + hsh(i, 2, 1) * 19) * S, (8 + hsh(i, 2, 2) * 10) * S, 3, [[236, 80, 80], [80, 150, 236], [250, 210, 80]][i % 3]); });
  k.put(2, 2, 4, 2, kitchen); shelves(k, [8, 16], 2); k.put(20, 2, 2, 2, tv);
  for (const x of [3, 6, 20, 22]) k.put(x, 16, 1, 2, (c, X, Y, W, H) => P.bed(c, X, Y, W, H, PBLUE));
  k.put(10, 4, 3, 1, (c, X, Y) => { for (let i = 0; i < 3; i++) { c.ellipse(X + 8 + i * 16, Y + 10, 6, 4, [150, 156, 170]); c.ellipse(X + 8 + i * 16, Y + 9, 4, 2, [[190, 130, 90], [110, 170, 220], [190, 130, 90]][i]); } });
  for (const [x, y] of [[2, 6], [23, 6], [2, 19], [23, 19]]) tall(k, x, y, 1, P.plant);
} });
R.UnovaGameFreakOffice = office({ a: [176, 190, 200], b: [164, 178, 190], plan(p, k) {
  k.art((c) => { rug(c, 11, 15, 17, 19, [226, 90, 90], WHITE); ball(c, 14 * S + 8, 17 * S + 8, 10); });
  for (const x of [4, 10, 16, 21]) for (const y of [4, 9]) if (k.put(x, y, 3, 2, workDesk)) k.art((c) => P.chair(c, (x + 1) * S, (y + 2) * S - 2, [60, 70, 100]), 0.3);
  k.put(3, 15, 4, 2, (c, X, Y, W, H) => { P.table(c, X, Y, W, H, [200, 206, 220]); for (let i = 0; i < 4; i++) { const col = [[236, 80, 80], [80, 150, 236], [250, 210, 80], [110, 200, 120]][i]; c.box(X + 6 + i * 14, Y + 2, 10, 9, col, dk(col, 0.4)); } });
  k.put(21, 15, 2, 2, (c, X, Y, W, H) => { c.box(X + 2, Y - 10, W - 4, H + 8, [40, 42, 54], INK); c.rect(X + 5, Y - 7, W - 10, 16, [90, 170, 230]); c.rect(X + 8, Y + 14, 6, 6, RED); c.ellipse(X + 21, Y + 17, 3, 3, [110, 200, 120]); });
  for (const [x, y] of [[2, 3], [25, 3], [2, 21], [25, 21], [8, 20], [19, 20]]) tall(k, x, y, 1, P.plant);
} });
function medalOffice(hue) { return office({ a: [200, 180, 140], b: [190, 170, 130], wall: [236, 226, 200], mat: hue, plan(p, k) {
  k.art((c) => { rug(c, 8, 10, 15, 15, hue, GOLD); const cx = 12 * S, cy = 13 * S; c.ellipse(cx, cy, 14, 14, GOLD); c.ellipse(cx, cy, 10, 10, lt(GOLD, 0.4)); star(c, cx, cy, 7, hue); });
  for (const x of [2, 6, 15, 19]) k.put(x, 2, 3, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y - 10, W, H + 8, [130, 90, 60], [70, 46, 30]); c.rect(X + 2, Y - 8, W - 4, 22, [226, 236, 244, 130]); for (let i = 0; i < 6; i++) { const mx2 = X + 9 + (i % 3) * 14, my2 = Y - 3 + (i > 2 ? 11 : 0); c.rect(mx2 - 1, my2 - 5, 3, 4, [[226, 60, 60], [60, 110, 200]][i % 2]); c.ellipse(mx2, my2 + 1, 4, 4, [GOLD, [200, 204, 216], [200, 140, 90]][i % 3]); } });
  k.put(15, 8, 3, 2, workDesk); k.put(3, 15, 3, 2, (c, X, Y, W, H) => P.sofa(c, X, Y, W, H, hue));
  for (const [x, y] of [[2, 19], [21, 19], [11, 3], [21, 8]]) tall(k, x, y, 1, P.plant);
} }); }
R.UnovaMedalOffice = medalOffice([200, 70, 70]); R.UnovaAnalyticsHQ = medalOffice([70, 130, 200]);

// ================================================================ furnished rooms: the houses, gatehouses, shops and offices
// These rooms are plain open boxes with a few people and one-tile fixtures (TV, trash can, vending machine) in them, so
// each is furnished from one kit: a style for its town (floor, wall, wood, fabrics), a role for what the place is
// (home, bedroom, cabin, hotel lobby, office, lab, shop, gatehouse...), and a seed from its name that picks between
// the variants. Furniture goes against the walls and into open corners; a piece is only stood where it leaves every
// person, fixture and door reachable, with the tile in front of each fixture left free.
const seedOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
const rngOf = (s) => { let a = seedOf(s) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// Where the TVs stand (the builder draws each as a bare set; a room plan gives it a cabinet and somewhere to sit).
const TVS = { HouseAbundantShrine2: "11,3", HouseAccumulaTown3: "5,3", HouseAccumulaTown5: "3,4", HouseAspertiaCity4: "18,6", HouseAspertiaCity6: "11,3", HouseAspertiaCity8: "5,3", HouseFloccesyTown3: "16,3", HouseFloccesyTown4: "16,3", HouseHumilauCity2: "3,3", HouseHumilauCity4: "12,3", HouseHumilauCity5: "11,3", HouseHumilauCity6: "5,4", HouseIcirrusCity3: "13,3", HouseIcirrusCity5: "13,3", HouseIcirrusCity6: "12,3", HouseLentimasTown2: "12,3", HouseLentimasTown3: "9,3", HouseMistraltonCity2: "14,3", HouseMistraltonCity3: "5,7", HouseNacreneCity6: "3,9", HouseNacreneCity7: "3,7", HouseNacreneCity8: "3,6", HouseNacreneCity9: "13,3", HouseNuvemaTown4: "15,3", HouseNuvemaTown6: "11,3", HouseNuvemaTown7: "10,3", HouseRoute232: "18,3", HouseRoute233: "16,3", HouseRoute44: "3,4", HouseRoute48: "11,3", HouseRoute63: "16,3", HouseRoute72: "18,3", HouseRoute73: "18,3", HouseStriatonCity6: "3,4", HouseVirbankCity4: "18,3", HouseWhiteForest2: "16,3", HouseCasteliaCity18: "18,3", HouseCasteliaCity23: "16,3", HouseCasteliaCity25: "16,3", HouseRoute410: "11,3", HouseCasteliaCity20: "18,4", HouseCasteliaCity26: "17,3", HouseCasteliaCity28: "18,3" };

// ---------------------------------------------------------------- more floors and walls
T.tatami = (col = [196, 200, 130]) => (c, X, Y, x, y) => { const k = (y & 1) ? col : lt(col, 0.07); c.rect(X, Y, S, S, k); for (let i = 2; i < S; i += 3) c.rect(X, Y + i, S, 1, dk(k, 0.06)); c.rect(X, Y + 15, S, 1, [70, 90, 60]); if (((x + (y >> 1) * 1) & 1) === 0) c.rect(X, Y, 1, S, [70, 90, 60]); };
T.cobble = (col) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, dk(col, 0.13)); const o = (y & 1) * 8; for (const [ox, w] of [[(o + 1) % 16, 14]]) { const k = mix(col, hsh(x + (ox > 8 ? 1 : 0), y, 3) > 0.5 ? [255, 255, 255] : [0, 0, 0], hsh(x, y, 5) * 0.07); c.rect(X, Y + 1, S, 14, k); c.rect(X, Y + 1, S, 1, lt(k, 0.1)); c.rect(X + ox, Y + 1, 1, 14, dk(col, 0.13)); if (hsh(x, y, 9) > 0.7) c.rect(X + 4, Y + 8, 3, 1, dk(k, 0.08)); } };
T.lino = (a, b) => (c, X, Y, x, y) => { c.rect(X, Y, S, S, a); c.rect(X, Y, S, 1, lt(a, 0.2)); c.rect(X, Y, 1, S, lt(a, 0.2)); c.rect(X + 7, Y + 7, 2, 2, b); if ((x + y) & 1) c.rect(X + 2, Y + 2, 12, 12, mix(a, b, 0.12)); };
const paper = (col, o = {}) => (c, X, Y, W) => { Wl.plain(col, o)(c, X, Y, W); const h = o.rail ? 13 : 24; if (o.stripe) for (let x = 4; x < W; x += 8) c.rect(X + x, Y + 3, 3, h, o.stripe); if (o.dots) for (let x = 5; x < W; x += 10) for (let y = 7; y < h; y += 8) c.rect(X + x + ((y >> 3) & 1) * 5, Y + y, 2, 2, o.dots); if (o.wain) { c.rect(X, Y + 17, W, 10, o.wain); c.rect(X, Y + 17, W, 1, lt(o.wain, 0.3)); for (let x = 0; x < W; x += 12) c.rect(X + x, Y + 18, 1, 9, dk(o.wain, 0.2)); } };
const logWall = (col) => (c, X, Y, W) => { for (let r = 0; r < 4; r++) { c.rect(X, Y + r * 8, W, 8, col); c.rect(X, Y + r * 8, W, 2, lt(col, 0.2)); c.rect(X, Y + r * 8 + 7, W, 1, dk(col, 0.42)); for (let x = (r * 37) % 50 + 10; x < W - 8; x += 61) { c.rect(X + x, Y + r * 8 + 3, 6, 1, dk(col, 0.25)); c.rect(X + x + 20, Y + r * 8 + 5, 3, 1, dk(col, 0.2)); } } c.rect(X, Y + 29, W, 3, dk(col, 0.5)); };
const stoneWall = (col, beam) => (c, X, Y, W) => { c.rect(X, Y, W, 32, dk(col, 0.32)); for (let r = 0; r < 4; r++) for (let x = -((r * 7) % 13); x < W;) { const w = 10 + Math.floor(hsh(x, r, 4) * 9), k2 = mix(col, hsh(x, r, 9) > 0.5 ? [255, 255, 255] : [0, 0, 0], hsh(x, r, 7) * 0.14), x0 = Math.max(0, x), x1 = Math.min(W, x + w - 1); if (x1 > x0) { c.rect(X + x0, Y + r * 8, x1 - x0, 7, k2); c.rect(X + x0, Y + r * 8, x1 - x0, 1, lt(k2, 0.2)); } x += w; } c.rect(X, Y + 29, W, 3, dk(col, 0.5)); if (beam) { c.rect(X, Y, W, 4, beam); c.rect(X, Y + 4, W, 1, dk(beam, 0.4)); for (let x = 30; x < W - 8; x += 76) { c.rect(X + x, Y + 5, 5, 24, beam); c.rect(X + x + 5, Y + 5, 1, 24, dk(beam, 0.4)); } } };
const shojiWall = (c, X, Y, W) => { c.rect(X, Y, W, 32, [240, 234, 214]); for (let x = 0; x < W; x += 12) c.rect(X + x, Y + 4, 1, 22, [150, 110, 70]); for (const y of [4, 11, 18, 25]) c.rect(X, Y + y, W, 1, [150, 110, 70]); c.rect(X, Y, W, 4, [110, 76, 50]); c.rect(X, Y + 26, W, 6, [110, 76, 50]); c.rect(X, Y + 26, W, 1, [170, 126, 84]); };
const adobeWall = (col) => (c, X, Y, W) => { c.rect(X, Y, W, 32, col); for (let i = 0; i < W / 3; i++) c.rect(X + Math.floor(hsh(i, 2, 5) * W), Y + 3 + Math.floor(hsh(i, 3, 6) * 24), 2, 1, hsh(i, 1, 1) > 0.5 ? lt(col, 0.16) : dk(col, 0.14)); c.rect(X, Y, W, 3, lt(col, 0.3)); c.rect(X, Y + 27, W, 5, dk(col, 0.3)); for (let x = 3; x < W; x += 9) c.poly([[X + x, Y + 27], [X + x + 4, Y + 23], [X + x + 8, Y + 27]], dk(col, 0.3)); };
const neonWall = (col, neon) => (c, X, Y, W) => { Wl.plain(col, { base: dk(col, 0.4), panel: 24 })(c, X, Y, W); c.rect(X, Y + 5, W, 1, neon); c.rect(X, Y + 4, W, 3, A(neon, 50)); c.rect(X, Y + 25, W, 1, neon); c.rect(X, Y + 24, W, 3, A(neon, 50)); };
const labWall = (col = [200, 226, 226]) => (c, X, Y, W) => Wl.plain(col, { base: dk(col, 0.3), panel: 32 })(c, X, Y, W);

// ---------------------------------------------------------------- furniture (c, X, Y, W): stands on the row at Y (16 px), may rise 16 px above it
const kitchenRun = (c, X, Y, W, col = [236, 232, 224]) => { shade(c, X, Y, W, S); c.box(X, Y - 4, W, 20, col, dk(col, 0.45)); c.rect(X + 1, Y - 3, W - 2, 5, [200, 206, 214]); c.rect(X + 1, Y + 2, W - 2, 1, dk(col, 0.3)); c.box(X + 4, Y - 3, 14, 4, [150, 170, 190], [90, 100, 120]); c.rect(X + 10, Y - 9, 2, 7, [150, 156, 170]); c.rect(X + 10, Y - 9, 5, 2, [150, 156, 170]); c.box(X + W - 22, Y - 3, 18, 4, [60, 60, 70], INK); c.rect(X + W - 19, Y - 2, 5, 2, [226, 90, 70]); c.rect(X + W - 11, Y - 2, 5, 2, [226, 90, 70]); c.box(X + W - 12, Y - 8, 8, 6, [176, 180, 190], [90, 96, 110]); c.rect(X + W - 4, Y - 6, 3, 1, [90, 96, 110]); for (let i = 3; i + 12 <= W - 2; i += 15) { c.box(X + i, Y + 4, 12, 10, lt(col, 0.1), dk(col, 0.25)); c.rect(X + i + 9, Y + 8, 2, 3, dk(col, 0.5)); } if (W > 40) { c.rect(X + 24, Y - 6, 3, 4, [226, 90, 70]); c.rect(X + 29, Y - 7, 3, 5, [110, 190, 110]); } };
const F_ = {
  bookcase: (c, X, Y, W, st) => P.bookcase(c, X, Y - 14, W, 30, st.wood),
  wardrobe: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y - 14, W, 30); c.box(X, Y - 15, W, 30, w, dk(w, 0.5)); c.rect(X + 1, Y - 14, W - 2, 2, lt(w, 0.25)); c.box(X + 2, Y - 10, W / 2 - 3, 20, lt(w, 0.08), dk(w, 0.3)); c.box(X + W / 2 + 1, Y - 10, W / 2 - 3, 20, lt(w, 0.08), dk(w, 0.3)); c.rect(X + W / 2 - 3, Y - 1, 2, 3, GOLD); c.rect(X + W / 2 + 1, Y - 1, 2, 3, GOLD); c.rect(X + 1, Y + 11, W - 2, 1, dk(w, 0.4)); },
  fridge: (c, X, Y, W) => fridge(c, X, Y, W, S),
  tv: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X + 1, Y + 5, W - 2, 10, w, dk(w, 0.5)); c.rect(X + 2, Y + 6, W - 4, 1, lt(w, 0.25)); c.rect(X + W / 2 - 1, Y + 8, 2, 5, dk(w, 0.4)); c.box(X + 3, Y - 12, W - 6, 18, [40, 42, 54], INK); c.rect(X + 5, Y - 10, W - 10, 13, [90, 170, 230]); c.rect(X + 6, Y - 9, 8, 3, [190, 226, 250]); c.rect(X + W - 9, Y + 9, 4, 2, [226, 226, 236]); },
  tvFix: (c, X, Y, W, st) => { const w = st.wood; c.rect(X + 2, Y + 14, 13, 2, [0, 0, 0, 56]); c.box(X, Y + 6, S, 9, w, dk(w, 0.5)); c.rect(X + 1, Y + 7, 14, 1, lt(w, 0.25)); c.rect(X + 7, Y + 9, 2, 4, dk(w, 0.4)); c.box(X + 1, Y - 9, 14, 16, [40, 42, 54], INK); c.rect(X + 3, Y - 7, 10, 11, [90, 170, 230]); c.rect(X + 4, Y - 6, 4, 2, [190, 226, 250]); c.p(X + 12, Y + 5, [110, 230, 130]); },
  desk: (c, X, Y, W, st) => { P.table(c, X, Y - 2, W, 18, st.wood); c.box(X + W / 2 - 7, Y - 12, 14, 11, [50, 54, 70], INK); c.rect(X + W / 2 - 5, Y - 10, 10, 7, [110, 190, 236]); c.rect(X + W / 2 - 2, Y - 1, 4, 2, [90, 94, 110]); c.rect(X + 3, Y + 3, 6, 4, WHITE); c.rect(X + W - 9, Y + 2, 5, 3, st.fab[0]); },
  study: (c, X, Y, W, st) => { P.table(c, X, Y - 2, W, 18, st.wood); c.box(X + 3, Y - 1, 9, 7, WHITE, [150, 150, 160]); c.rect(X + 5, Y + 1, 5, 1, [150, 150, 160]); c.rect(X + 5, Y + 3, 4, 1, [150, 150, 160]); c.rect(X + W - 8, Y - 10, 2, 10, [90, 94, 110]); c.poly([[X + W - 12, Y - 10], [X + W - 3, Y - 10], [X + W - 5, Y - 15], [X + W - 10, Y - 15]], st.fab[1] || GOLD); for (let i = 0; i < 3; i++) c.rect(X + W / 2 - 3 + i * 3, Y - 4, 2, 5, BOOKS[i]); },
  fireplace: (c, X, Y, W, st) => { const s = st.stone || [150, 140, 136], cx = X + W / 2; shade(c, X, Y, W, S); c.box(X + 5, Y - 32, W - 10, 16, dk(s, 0.08), dk(s, 0.5)); c.box(X, Y - 18, W, 33, s, dk(s, 0.5)); for (let r = 0; r < 4; r++) { c.rect(X + 1, Y - 11 + r * 7, W - 2, 1, dk(s, 0.25)); for (let q = (r & 1) * 6 + 4; q < W - 2; q += 12) c.rect(X + q, Y - 17 + r * 7, 1, 6, dk(s, 0.25)); } c.box(X - 1, Y - 20, W + 2, 4, st.wood, dk(st.wood, 0.5)); c.box(X + 9, Y - 7, W - 18, 22, [30, 24, 24], dk(s, 0.6)); glow(c, cx, Y + 8, 14, [250, 150, 50], 26); c.poly([[cx - 8, Y + 13], [cx - 4, Y + 2], [cx, Y + 8], [cx + 4, Y - 1], [cx + 8, Y + 13]], [240, 130, 50]); c.poly([[cx - 4, Y + 13], [cx, Y + 5], [cx + 4, Y + 13]], [250, 220, 100]); c.rect(cx - 9, Y + 12, 18, 2, [90, 60, 40]); c.rect(X + 6, Y - 26, 4, 6, [90, 150, 200]); c.box(X + W - 14, Y - 27, 8, 7, [236, 226, 200], [120, 84, 44]); },
  stove: (c, X, Y, W) => { const cx = X + W / 2; c.rect(cx - 2, Y - 30, 4, 22, [60, 58, 66]); c.rect(cx - 2, Y - 30, 1, 22, [96, 94, 104]); shade(c, X, Y, W, S); c.box(X + 1, Y - 8, W - 2, 23, [56, 54, 62], [20, 18, 26]); c.rect(X + 2, Y - 7, W - 4, 2, [110, 108, 120]); c.box(X + 4, Y, W - 8, 9, [30, 24, 24], [20, 18, 26]); c.rect(X + 6, Y + 4, W - 12, 4, [240, 130, 50]); c.rect(X + 7, Y + 6, W - 14, 2, [250, 220, 100]); c.rect(X + 1, Y + 13, 3, 3, [20, 18, 26]); c.rect(X + W - 4, Y + 13, 3, 3, [20, 18, 26]); c.box(cx - 4, Y - 13, 8, 5, [150, 156, 170], [70, 76, 92]); },
  sink: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X, Y - 3, W, 18, w, dk(w, 0.5)); c.rect(X + 1, Y - 2, W - 2, 4, lt(w, 0.3)); c.box(X + 4, Y - 2, W - 8, 4, [200, 210, 220], [110, 120, 140]); c.rect(X + W / 2 - 1, Y - 8, 2, 6, [150, 156, 170]); c.rect(X + W / 2 - 1, Y - 8, 5, 2, [150, 156, 170]); for (let i = 3; i + 10 <= W; i += 13) c.box(X + i, Y + 4, 10, 9, lt(w, 0.08), dk(w, 0.3)); },
  clock: (c, X, Y, W, st) => { const w = st.wood, cx = X + W / 2; shade(c, X + 2, Y, W - 4, S); c.box(cx - 5, Y - 16, 10, 31, w, dk(w, 0.5)); c.poly([[cx - 6, Y - 16], [cx, Y - 21], [cx + 6, Y - 16]], dk(w, 0.2)); c.ellipse(cx, Y - 10, 4, 4, WHITE); c.rect(cx, Y - 13, 1, 3, INK); c.rect(cx, Y - 10, 2, 1, INK); c.box(cx - 3, Y - 3, 6, 14, dk(w, 0.5), dk(w, 0.6)); c.rect(cx, Y - 2, 1, 8, GOLD); c.ellipse(cx, Y + 7, 2, 2, GOLD); },
  dresser: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X + 1, Y - 3, W - 2, 18, w, dk(w, 0.5)); c.rect(X + 2, Y - 2, W - 4, 2, lt(w, 0.3)); for (const yy of [3, 9]) { c.rect(X + 2, Y + yy, W - 4, 1, dk(w, 0.35)); for (let i = W / 4; i < W; i += W / 2) c.rect(X + i - 2, Y + yy - 3, 4, 1, GOLD); } },
  mirror: (c, X, Y, W, st) => { F_.dresser(c, X, Y, W, st); c.box(X + W / 2 - 6, Y - 17, 12, 14, [200, 230, 244], st.wood); c.line(X + W / 2 - 3, Y - 6, X + W / 2 + 2, Y - 14, WHITE); c.rect(X + 3, Y - 6, 3, 3, st.fab[0]); },
  sideboard: (c, X, Y, W, st) => { F_.dresser(c, X, Y, W, st); c.rect(X + 5, Y - 9, 5, 6, [90, 150, 200]); c.ellipse(X + 7, Y - 11, 3, 3, [240, 130, 150]); c.ellipse(X + 9, Y - 12, 2, 2, [250, 220, 100]); c.box(X + W - 12, Y - 10, 8, 7, [236, 226, 200], [120, 84, 44]); c.rect(X + W - 10, Y - 8, 4, 3, [150, 200, 240]); },
  piano: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X, Y - 13, W, 28, [44, 40, 48], INK); c.rect(X + 1, Y - 12, W - 2, 2, [96, 90, 106]); c.rect(X + 2, Y + 1, W - 4, 5, WHITE); for (let i = 4; i < W - 4; i += 4) c.rect(X + i, Y + 1, 1, 3, INK); c.box(X + W / 2 - 7, Y - 9, 14, 8, WHITE, [150, 150, 160]); for (let i = 0; i < 3; i++) c.rect(X + W / 2 - 5, Y - 7 + i * 2, 10, 1, [150, 150, 160]); },
  goods: (cols) => (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X, Y - 15, W, 30, [226, 230, 240], [110, 126, 146]); for (let sy = Y - 12; sy + 8 <= Y + 14; sy += 9) { c.rect(X + 2, sy + 6, W - 4, 2, [150, 160, 180]); for (let bx = X + 2; bx + 4 <= X + W - 2; bx += 5) { const q = hsh(bx, sy, 6); if (q > 0.12) c.rect(bx, sy + 6 - 3 - Math.floor(q * 3), 4, 3 + Math.floor(q * 3), (cols || BOOKS)[Math.floor(q * 97) % (cols || BOOKS).length]); } } },
  lockers: (c, X, Y, W) => { shade(c, X, Y, W, S); for (let i = 0; i < W; i += 8) { c.box(X + i, Y - 15, 8, 30, [130, 150, 176], [60, 70, 96]); c.rect(X + i + 2, Y - 12, 4, 1, [60, 70, 96]); c.rect(X + i + 2, Y - 10, 4, 1, [60, 70, 96]); c.rect(X + i + 5, Y, 1, 3, [226, 226, 236]); } },
  filing: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X + 1, Y - 10, W - 2, 25, [170, 176, 190], [80, 86, 104]); for (let i = 0; i < 3; i++) { c.rect(X + 2, Y - 3 + i * 6, W - 4, 1, [80, 86, 104]); c.rect(X + W / 2 - 2, Y - 6 + i * 6, 4, 1, [226, 226, 236]); } c.box(X + 3, Y - 15, 9, 5, [176, 130, 84], [100, 70, 44]); },
  cooler: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 6, 2, [0, 0, 0, 60]); c.box(cx - 5, Y - 2, 10, 17, [236, 240, 244], [110, 126, 146]); c.rect(cx - 2, Y + 3, 2, 2, [80, 150, 236]); c.rect(cx + 1, Y + 3, 2, 2, [236, 80, 80]); c.box(cx - 4, Y - 13, 8, 11, [130, 200, 250, 220], [70, 110, 170]); c.rect(cx - 3, Y - 12, 2, 8, [220, 240, 255]); },
  copier: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X + 1, Y - 6, W - 2, 21, [226, 230, 240], [110, 126, 146]); c.box(X + 2, Y - 9, W - 4, 4, [190, 196, 210], [110, 126, 146]); c.rect(X + 3, Y, W - 6, 1, [110, 126, 146]); c.rect(X + 4, Y + 3, W - 8, 4, WHITE); c.rect(X + W - 6, Y - 4, 3, 2, [110, 230, 130]); },
  crate: (c, X, Y, W, st) => { for (let i = 0; i + S <= W; i += S) P.crate(c, X + i, Y, S, S, st.crate); },
  crates: (c, X, Y, W, st) => { for (let i = 0; i + S <= W; i += S) P.crate(c, X + i, Y, S, S, st.crate); P.crate(c, X + (W > S ? 6 : 1), Y - 13, 14, 14, lt(st.crate || [176, 130, 84], 0.1)); },
  barrel: (c, X, Y, W) => { for (let i = 0; i + S <= W; i += S) P.barrel(c, X + i, Y, S, S); },
  sacks: (c, X, Y, W) => { for (let i = 0; i + S <= W; i += S) { c.ellipse(X + i + 8, Y + 14, 7, 2, [0, 0, 0, 60]); c.ellipse(X + i + 8, Y + 7, 7, 8, [150, 124, 84]); c.ellipse(X + i + 7, Y + 6, 5, 6, [206, 180, 130]); c.rect(X + i + 5, Y - 3, 6, 3, [150, 124, 84]); c.rect(X + i + 4, Y + 5, 7, 1, [150, 124, 84]); } },
  firewood: (c, X, Y, W) => { shade(c, X, Y, W, S); for (let r = 0; r < 3; r++) for (let i = 0; i < W / 6 - (r & 1); i++) { const cx = X + 4 + i * 6 + (r & 1) * 3, cy = Y + 11 - r * 5; c.ellipse(cx, cy, 3, 3, [96, 66, 44]); c.ellipse(cx, cy, 2, 2, [206, 166, 110]); c.p(cx, cy, [150, 110, 70]); } },
  plant: (c, X, Y, W, st) => P.plant(c, X, Y - 10, W, 26, st.leaf),
  palm: (c, X, Y, W, st) => { const cx = X + W / 2, lf = st.leaf || [70, 150, 84]; c.ellipse(cx, Y + 14, 6, 2, [0, 0, 0, 60]); c.box(cx - 4, Y + 7, 8, 8, [226, 226, 236], [130, 130, 150]); c.rect(cx - 1, Y - 6, 2, 14, [130, 96, 60]); for (const [dx, dy] of [[-7, -8], [7, -8], [-5, -13], [5, -13], [0, -15], [-8, -3], [8, -3]]) { c.line(cx, Y - 6, cx + dx, Y + dy, dk(lf, 0.2), 2); c.line(cx, Y - 7, cx + dx, Y + dy - 1, lf); } },
  flowers: (c, X, Y, W, st) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.box(cx - 4, Y + 6, 8, 9, [110, 150, 200], [60, 80, 120]); for (const [dx, dy, col] of [[-3, 0, [240, 110, 130]], [3, 1, [250, 220, 100]], [0, -4, [240, 240, 250]], [-4, -5, [250, 160, 90]], [4, -5, [220, 130, 220]]]) { c.rect(cx + dx, Y + dy + 2, 1, 5, [70, 140, 80]); c.ellipse(cx + dx, Y + dy, 2, 2, col); } },
  lamp: (c, X, Y, W, st) => { const cx = X + W / 2, col = [250, 230, 170]; glow(c, cx, Y - 8, 16, col, 22); c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y - 6, 2, 19, [90, 84, 100]); c.box(cx - 4, Y + 12, 8, 3, [90, 84, 100], INK); c.poly([[cx - 6, Y - 5], [cx + 6, Y - 5], [cx + 3, Y - 14], [cx - 3, Y - 14]], st.fab[1] || col); c.rect(cx - 5, Y - 6, 10, 1, dk(st.fab[1] || col, 0.3)); },
  coats: (c, X, Y, W, st) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y - 14, 2, 28, st.wood); c.rect(cx - 5, Y + 12, 10, 2, dk(st.wood, 0.3)); c.rect(cx - 6, Y - 13, 12, 2, st.wood); c.box(cx - 7, Y - 11, 6, 13, st.fab[0], dk(st.fab[0], 0.4)); c.box(cx + 1, Y - 11, 6, 10, st.fab[1] || [90, 110, 160], dk(st.fab[1] || [90, 110, 160], 0.4)); c.ellipse(cx, Y - 15, 4, 2, [200, 170, 110]); },
  umbrellas: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.box(cx - 4, Y + 4, 8, 11, [110, 120, 150], [60, 66, 90]); for (const [dx, col] of [[-2, [226, 80, 80]], [1, [80, 130, 226]], [3, [250, 210, 90]]]) { c.rect(cx + dx, Y - 8, 2, 13, col); c.rect(cx + dx, Y - 10, 1, 2, INK); } },
  shoes: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X + 1, Y + 3, W - 2, 12, w, dk(w, 0.5)); c.rect(X + 2, Y + 9, W - 4, 1, dk(w, 0.4)); for (let i = 4; i + 5 < W; i += 8) { c.rect(X + i, Y + 6, 5, 3, [[200, 70, 70], [70, 110, 190], [240, 240, 244], [90, 70, 50]][(i >> 3) % 4]); c.rect(X + i, Y + 11, 5, 3, [[90, 70, 50], [240, 200, 90], [110, 180, 120]][(i >> 3) % 3]); } },
  toys: (c, X, Y, W, st) => { shade(c, X, Y, W, S); c.box(X + 1, Y + 2, W - 2, 13, st.fab[0], dk(st.fab[0], 0.45)); c.rect(X + 2, Y + 3, W - 4, 2, lt(st.fab[0], 0.3)); star(c, X + W / 2, Y + 10, 4, [250, 230, 120]); ball(c, X + 5, Y, 4); c.box(X + W - 9, Y - 4, 6, 7, [110, 180, 240], [50, 90, 150]); c.ellipse(X + W / 2 + 1, Y - 2, 3, 3, [250, 210, 90]); },
  trophies: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X, Y - 15, W, 30, w, dk(w, 0.5)); c.rect(X + 2, Y - 13, W - 4, 24, [226, 236, 244, 150]); c.rect(X + 2, Y - 2, W - 4, 2, w); for (let i = 0; i * 10 + 12 <= W; i++) for (const yy of [-5, 8]) { const tx = X + 7 + i * 10; c.rect(tx - 2, Y + yy - 5, 5, 4, GOLD); c.rect(tx - 1, Y + yy - 1, 3, 1, dk(GOLD, 0.3)); c.rect(tx - 2, Y + yy, 5, 1, [130, 96, 40]); } },
  aquarium: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X + 1, Y + 5, W - 2, 10, w, dk(w, 0.5)); c.box(X + 1, Y - 12, W - 2, 18, [90, 170, 226], [60, 70, 96]); c.rect(X + 2, Y - 11, W - 4, 2, [190, 226, 250]); c.rect(X + 2, Y + 2, W - 4, 3, [226, 206, 150]); fish(c, X + W / 3, Y - 4, 0.6, [250, 150, 60], false); fish(c, X + 2 * W / 3, Y - 7, 0.6, [250, 230, 110], true); c.rect(X + 5, Y - 3, 1, 5, [70, 150, 84]); c.rect(X + W - 7, Y - 5, 1, 7, [70, 150, 84]); },
  easel: (c, X, Y, W, st, col) => { const cx = X + W / 2; c.line(cx - 6, Y + 14, cx - 2, Y - 14, [130, 96, 60]); c.line(cx + 6, Y + 14, cx + 2, Y - 14, [130, 96, 60]); c.box(cx - 7, Y - 12, 14, 16, WHITE, [130, 96, 60]); c.rect(cx - 5, Y - 10, 10, 12, col || st.fab[0]); c.ellipse(cx - 1, Y - 5, 3, 2, lt(col || st.fab[0], 0.5)); c.rect(cx - 5, Y - 1, 10, 3, dk(col || st.fab[0], 0.3)); c.rect(cx - 7, Y + 4, 14, 2, [130, 96, 60]); },
  counter: (c, X, Y, W, st) => P.counter(c, X, Y - 3, W, 19, st.counter || st.wood, st.counterTop || [236, 222, 190]),
  bench: (c, X, Y, W, st) => { const h = st.fab[0]; c.rect(X + 2, Y + 13, W - 3, 2, [0, 0, 0, 50]); c.box(X + 1, Y - 2, W - 2, 6, lt(h, 0.3), dk(h, 0.3)); c.box(X + 1, Y + 4, W - 2, 7, lt(h, 0.5), dk(h, 0.3)); c.rect(X + 3, Y + 11, 3, 3, dk(h, 0.3)); c.rect(X + W - 6, Y + 11, 3, 3, dk(h, 0.3)); },
  sofa: (c, X, Y, W, st, col) => P.sofa(c, X, Y - 10, W, 26, col || st.fab[0]),
  sofaBack: (c, X, Y, W, st, col) => { const k2 = col || st.fab[0]; shade(c, X, Y, W, S); c.box(X, Y + 1, W, 14, k2, dk(k2, 0.5)); c.rect(X + 1, Y + 2, W - 2, 3, lt(k2, 0.2)); c.box(X, Y - 3, 5, 12, dk(k2, 0.12), dk(k2, 0.5)); c.box(X + W - 5, Y - 3, 5, 12, dk(k2, 0.12), dk(k2, 0.5)); for (let i = S; i < W; i += S) c.rect(X + i, Y + 3, 1, 10, dk(k2, 0.25)); },
  machine: (c, X, Y, W, st) => P.machine(c, X, Y - 14, W, 29, st.metal || [150, 170, 190], st.lamp || [110, 230, 250]),
  console: (c, X, Y, W, st) => P.console(c, X, Y - 10, W, 26, st.metal ? dk(st.metal, 0.3) : [96, 104, 128], st.lamp || [90, 220, 190]),
  tank: (c, X, Y, W, st) => P.tank(c, X, Y - 14, W, 30, st.lamp || [120, 220, 170]),
  labTable: (c, X, Y, W) => { P.table(c, X, Y - 2, W, 18, [200, 206, 220]); c.box(X + 4, Y - 1, 10, 7, WHITE, [150, 150, 160]); c.rect(X + W - 22, Y - 7, 4, 9, [130, 230, 170, 220]); c.rect(X + W - 15, Y - 5, 4, 7, [240, 130, 130, 220]); c.box(X + W - 9, Y - 5, 7, 7, [50, 54, 70], INK); },
  bedside: (c, X, Y, W, st) => { const w = st.wood, cx = X + W / 2; shade(c, X + 2, Y, W - 4, S); c.box(X + 2, Y + 2, W - 4, 13, w, dk(w, 0.5)); c.rect(X + 3, Y + 8, W - 6, 1, dk(w, 0.4)); c.rect(cx - 1, Y + 5, 2, 1, GOLD); glow(c, cx, Y - 5, 10, [250, 230, 170], 22); c.rect(cx - 1, Y - 3, 2, 5, [90, 84, 100]); c.poly([[cx - 5, Y - 3], [cx + 5, Y - 3], [cx + 3, Y - 10], [cx - 3, Y - 10]], [250, 236, 180]); },
  vending: (c, X, Y, W) => { c.box(X, Y - 14, W, 29, [70, 110, 190], [30, 46, 90]); c.rect(X + 2, Y - 12, W - 4, 12, [230, 240, 250]); for (let k2 = 0; k2 < 3; k2++) c.rect(X + 3 + k2 * 4, Y - 10, 2, 8, [[240, 200, 70], [226, 90, 90], [110, 200, 120]][k2]); c.rect(X + 3, Y + 6, W - 6, 5, [30, 36, 50]); },
};
// Beds and tables take two rows: (c, X, Y, W, H).
const bedOf = (col, wood) => (c, X, Y, W, H) => { c.box(X + 1, Y - 5, W - 2, 8, wood, dk(wood, 0.5)); c.rect(X + 2, Y - 4, W - 4, 2, lt(wood, 0.25)); P.bed(c, X, Y, W, H, col); if (W > S) { c.rect(X + W / 2, Y + 4, 1, 7, [190, 190, 200]); c.rect(X + 1, Y + H - 9, W - 2, 2, lt(col, 0.3)); } };
const stairsTo = (c, X, Y0, Y1, wood) => { c.box(X - 3, Y0, 22, Y1 - Y0, dk(wood, 0.45), dk(wood, 0.6)); const n = Math.max(4, Math.round((Y1 - Y0) / 5)); for (let i = 0; i < n; i++) { const y = Y0 + 1 + (Y1 - Y0 - 2) * i / n, h = Math.ceil((Y1 - Y0 - 2) / n), k2 = mix(dk(wood, 0.4), lt(wood, 0.25), i / (n - 1)); c.rect(X - 1, y, 18, h, k2); c.rect(X - 1, y + h - 1, 18, 1, dk(wood, 0.5)); } c.rect(X - 3, Y0, 2, Y1 - Y0, dk(wood, 0.25)); c.rect(X + 17, Y0, 2, Y1 - Y0, dk(wood, 0.25)); c.box(X - 4, Y1 - 12, 4, 12, wood, dk(wood, 0.6)); c.box(X + 16, Y1 - 12, 4, 12, wood, dk(wood, 0.6)); };
const stairsDown = (c, X, Y, wood) => { c.box(X - 4, Y - 6, 24, 22, [24, 20, 24], dk(wood, 0.6)); for (let i = 0; i < 5; i++) { c.rect(X - 2, Y - 4 + i * 4, 20, 3, mix(lt(wood, 0.15), dk(wood, 0.65), i / 4)); c.rect(X - 2, Y - 1 + i * 4, 20, 1, dk(wood, 0.7)); } c.box(X - 6, Y - 12, 4, 14, wood, dk(wood, 0.6)); c.box(X + 18, Y - 12, 4, 14, wood, dk(wood, 0.6)); c.rect(X - 5, Y - 9, 26, 2, lt(wood, 0.15)); c.rect(X - 5, Y - 7, 26, 1, dk(wood, 0.5)); };
// Things on the wall: (c, cx, Y, st, r) with Y the top of the two-row wall.
const WD = {
  window: (c, cx, Y, st) => Wl.window(c, cx - 12, Y + 6, 24, 17, st.sky),
  curtains: (c, cx, Y, st) => { Wl.window(c, cx - 12, Y + 6, 24, 17, st.sky); const k2 = st.fab[0]; c.rect(cx - 15, Y + 4, 30, 2, dk(st.wood, 0.3)); for (const d of [-1, 1]) { c.poly([[cx + d * 14, Y + 6], [cx + d * 6, Y + 6], [cx + d * 11, Y + 15], [cx + d * 12, Y + 24], [cx + d * 14, Y + 24]], k2); c.rect(cx + d * 13 - (d > 0 ? 0 : 1), Y + 6, 1, 18, dk(k2, 0.25)); } },
  picture: (c, cx, Y, st, r) => { const q = Math.floor(r * 5), bg = [[150, 200, 240], [240, 226, 190], [190, 226, 190], [250, 214, 190], [60, 70, 110]][q]; Wl.picture(c, cx - 9, Y + 7, 18, 14, bg, (c2, x, y) => { if (q === 0) { c2.poly([[x - 6, y + 4], [x - 1, y - 3], [x + 3, y + 4]], [110, 150, 110]); c2.ellipse(x + 4, y - 2, 2, 2, [250, 230, 120]); } else if (q === 1) { c2.ellipse(x, y - 1, 3, 3, [226, 170, 130]); c2.rect(x - 3, y + 2, 7, 3, [90, 110, 160]); } else if (q === 2) { c2.ellipse(x - 2, y, 2, 2, [240, 110, 130]); c2.ellipse(x + 2, y - 1, 2, 2, [250, 220, 100]); c2.rect(x - 1, y + 2, 3, 3, [110, 150, 200]); } else if (q === 3) ball(c2, x, y, 4); else for (let i = 0; i < 5; i++) c2.p(x - 5 + i * 3, y - 3 + (i * 7) % 6, WHITE); }); },
  shelf: (c, cx, Y) => Wl.shelf(c, cx - 13, Y + 8, 26),
  lamp: (c, cx, Y) => Wl.lamp(c, cx, Y + 10),
  clock: (c, cx, Y, st) => { c.ellipse(cx, Y + 14, 7, 7, dk(st.wood, 0.3)); c.ellipse(cx, Y + 14, 5, 5, WHITE); c.rect(cx, Y + 10, 1, 4, INK); c.rect(cx, Y + 14, 3, 1, INK); },
  calendar: (c, cx, Y) => { c.box(cx - 6, Y + 6, 12, 16, WHITE, [130, 130, 150]); c.rect(cx - 5, Y + 7, 10, 4, RED); for (let i = 0; i < 9; i++) c.p(cx - 4 + (i % 3) * 3, Y + 13 + Math.floor(i / 3) * 3, [110, 110, 130]); },
  map: (c, cx, Y) => { c.box(cx - 14, Y + 5, 28, 19, [150, 206, 244], [120, 84, 44]); c.poly([[cx - 9, Y + 20], [cx - 10, Y + 12], [cx - 3, Y + 8], [cx + 6, Y + 9], [cx + 10, Y + 14], [cx + 5, Y + 21]], [130, 190, 120]); c.rect(cx - 2, Y + 12, 6, 4, [150, 206, 244]); c.p(cx - 5, Y + 17, RED); c.p(cx + 6, Y + 12, RED); },
  antlers: (c, cx, Y, st) => { c.ellipse(cx, Y + 17, 5, 6, st.wood); for (const d of [-1, 1]) { c.line(cx + d * 2, Y + 12, cx + d * 9, Y + 6, [226, 214, 190], 2); c.line(cx + d * 6, Y + 9, cx + d * 6, Y + 4, [226, 214, 190]); c.line(cx + d * 8, Y + 8, cx + d * 11, Y + 9, [226, 214, 190]); } },
  fishTrophy: (c, cx, Y, st) => { c.ellipse(cx, Y + 14, 13, 7, st.wood); c.ellipse(cx, Y + 14, 12, 6, lt(st.wood, 0.2)); fish(c, cx, Y + 14, 1.3, [110, 160, 210], false); },
  rods: (c, cx, Y) => { c.rect(cx - 12, Y + 22, 24, 2, [110, 76, 50]); for (let i = 0; i < 4; i++) { c.line(cx - 9 + i * 6, Y + 23, cx - 9 + i * 6, Y + 4, [[150, 110, 70], [70, 110, 160], [90, 150, 100], [190, 80, 70]][i]); c.rect(cx - 10 + i * 6, Y + 17, 3, 3, [60, 60, 70]); c.line(cx - 9 + i * 6, Y + 4, cx - 7 + i * 6, Y + 10, [220, 220, 230]); } },
  banner: (c, cx, Y, st) => Wl.banner(c, cx - 7, Y + 4, 14, 22, st.fab[0], st.fab[1] || WHITE),
  poster: (c, cx, Y, st, r) => { const k2 = st.fab[Math.floor(r * st.fab.length)]; c.box(cx - 8, Y + 5, 16, 20, lt(k2, 0.5), [70, 70, 90]); c.ellipse(cx, Y + 13, 4, 4, k2); c.rect(cx - 5, Y + 20, 10, 1, [70, 70, 90]); c.rect(cx - 5, Y + 22, 7, 1, [70, 70, 90]); },
  board: (c, cx, Y) => { c.box(cx - 15, Y + 5, 30, 19, [190, 150, 104], [120, 84, 44]); for (const [dx, dy, col] of [[-12, 2, WHITE], [-3, 3, [250, 240, 150]], [5, 2, [200, 230, 250]], [-10, 10, [250, 200, 200]], [1, 11, WHITE]]) { c.rect(cx + dx, Y + 5 + dy, 7, 6, col); c.p(cx + dx + 3, Y + 5 + dy, RED); } },
  whiteboard: (c, cx, Y) => { c.box(cx - 16, Y + 5, 32, 19, WHITE, [130, 136, 150]); c.line(cx - 12, Y + 19, cx - 4, Y + 11, [226, 80, 80]); c.line(cx - 4, Y + 11, cx + 2, Y + 15, [226, 80, 80]); c.line(cx + 2, Y + 15, cx + 11, Y + 8, [226, 80, 80]); c.rect(cx - 12, Y + 8, 8, 1, [80, 110, 190]); c.rect(cx - 14, Y + 24, 28, 2, [170, 176, 190]); },
  screen: (c, cx, Y, st) => Wl.screen(c, cx - 14, Y + 5, 28, 18, st.lamp || [60, 150, 220], (c2, x, y) => { for (let i = 0; i < 6; i++) c2.rect(x - 10 + i * 4, y + 5 - Math.floor(hsh(i, cx, 3) * 9), 3, 1 + Math.floor(hsh(i, cx, 3) * 9), [220, 250, 255]); }),
  mirror: (c, cx, Y, st) => { c.box(cx - 6, Y + 5, 12, 19, [200, 230, 244], st.wood); c.line(cx - 3, Y + 18, cx + 2, Y + 8, WHITE); },
  hooks: (c, cx, Y, st) => { c.rect(cx - 12, Y + 8, 24, 2, st.wood); for (let i = 0; i < 3; i++) { const k2 = [st.fab[0], [226, 226, 236], st.fab[1] || [90, 110, 160]][i]; c.box(cx - 11 + i * 8, Y + 10, 6, 12 - i * 2, k2, dk(k2, 0.4)); } },
  pans: (c, cx, Y) => { c.rect(cx - 12, Y + 8, 24, 2, [110, 110, 126]); for (let i = 0; i < 3; i++) { c.rect(cx - 8 + i * 8, Y + 10, 1, 3, [110, 110, 126]); c.ellipse(cx - 8 + i * 8, Y + 16 + (i & 1), 3, 3, [[70, 70, 84], [190, 120, 70], [150, 156, 170]][i]); } },
};
const HOME_WALL = ["curtains", "picture", "window", "shelf", "picture", "clock", "curtains", "lamp", "calendar"];

// ---------------------------------------------------------------- the furnisher: placement that keeps everything reachable
function furnish(p, st) {
  const k = kit(p), L = k.L, Rt = k.R, T0 = k.T, B = k.B, key = (x, y) => x + "," + y, rnd = rngOf(p.name);
  const exit = p.warps.find((w) => w.exit) || p.warps[0], resv = new Set(), blocked = new Set(), spans = [], rugs = [];
  const person = (x, y) => p.people.some((q) => q.x === x && q.y === y);
  for (let y = T0; y <= B; y++) for (let x = L; x <= Rt; x++) if (!p.isFloor(x, y)) { resv.add(key(x, y - 1)); resv.add(key(x, y + 1)); }
  for (let d = 1; d <= 2; d++) resv.add(key(exit.x, exit.y - d));
  const reach = () => { const seen = new Set([key(exit.x, exit.y)]), q = [[exit.x, exit.y]]; for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy, kk = key(x, y); if (seen.has(kk) || !p.isFloor(x, y) || blocked.has(kk) || person(x, y)) continue; seen.add(kk); q.push([x, y]); } return seen.size; };
  let open = reach();
  const F = {
    k, p, st, L, R: Rt, T: T0, B, W: Rt - L + 1, H: B - T0 + 1, rnd, exit, person, spans, rugs, tv: null,
    pick: (a) => a[Math.floor(rnd() * a.length)],
    shuffle: (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    isOpen: (x, y) => p.isFloor(x, y) && !blocked.has(key(x, y)),
    ok(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!k.free(i, j) || resv.has(key(i, j))) return false; return true; },
    reserve(x, y) { resv.add(key(x, y)); },
    // A solid thing on tiles (x, y, w, h); only its bottom `rows` rows block. False (and nothing drawn) if it will not go.
    put(x, y, w, h, draw, o = {}) {
      const rows = o.rows == null ? h : o.rows, y0 = y + h - rows, cells = [];
      if (!F.ok(x, y0, w, rows)) return false;
      for (let j = y0; j < y + h; j++) for (let i = x; i < x + w; i++) cells.push(key(i, j));
      for (const kk of cells) blocked.add(kk);
      const n = reach();
      if (n !== open - cells.length || !k.put(x, y, w, h, draw, o)) { for (const kk of cells) blocked.delete(kk); return false; }
      open = n; return true;
    },
    // An item { w, d, h, tall }: one row deep (drawn up to a tile above its base) unless it has `h` rows of its own.
    stand(x, y, it) {
      if (!it) return false;
      const done = it.h ? F.put(x, y, it.w, it.h, (c, X, Y, W, H) => it.d(c, X, Y, W, H, st))
        : y === T0 ? F.put(x, y, it.w, 1, (c, X, Y, W) => it.d(c, X, Y, W, st))
          : F.put(x, y - 1, it.w, 2, (c, X, Y, W) => it.d(c, X, Y + S, W, st), { rows: 1 });
      if (done && y === T0) spans.push({ x0: x * S, x1: (x + it.w) * S, tall: !!it.tall });
      if (done && it.chair && p.isFloor(x + (it.w >> 1), y + 1) && !person(x + (it.w >> 1), y + 1)) F.art((c) => P.chair(c, (x + it.w / 2) * S - 8, (y + 1) * S - 3, it.chair), 0.3);
      return done;
    },
    // Pack items along the back wall from the left (dir 1) or the right (dir -1); null leaves a gap.
    run(list, dir = 1, from) {
      let x = from != null ? from : dir > 0 ? L : Rt, n = 0;
      for (const it of list) { if (!it) { x += dir; continue; } for (let s = 0; s <= 3; s++) { const x0 = dir > 0 ? x + s : x - s - it.w + 1; if (x0 < L || x0 + it.w - 1 > Rt) break; if (F.stand(x0, T0, it)) { x = dir > 0 ? x0 + it.w : x0 - 1; n++; break; } } }
      return n;
    },
    // Pack items down a side wall (side -1 left, 1 right) from row `from`.
    col(list, side, from = T0 + 2) {
      let y = from, n = 0;
      for (const it of list) { if (!it) { y++; continue; } const hh = it.h || 1, x0 = side < 0 ? L : Rt - it.w + 1; for (let s = 0; s <= 3; s++) { if (y + s + hh - 1 > B - 1) break; if (F.stand(x0, y + s, it)) { y += s + hh; n++; break; } } }
      return n;
    },
    // Items along the front wall, out from the corners (never by the door).
    front(list) { const xs = [L, Rt, L + 1, Rt - 1, L + 2, Rt - 2]; let i = 0; for (const it of list) { if (!it) continue; for (; i < xs.length; i++) { const x0 = xs[i] > exit.x ? xs[i] - it.w + 1 : xs[i]; if (Math.abs(xs[i] - exit.x) > 2 && F.stand(x0, B, it)) { i++; break; } } } },
    // The free w x h place nearest `pref` with open floor all round it.
    spot(w, h, pref, o = {}) {
      const m = o.margin == null ? 1 : o.margin, top = o.top == null ? 2 : o.top; let best = null, bs = 1e9;
      for (let y = T0 + top; y + h - 1 <= B - (o.bottom == null ? 2 : o.bottom); y++) for (let x = L + (o.side == null ? 1 : o.side); x + w - 1 <= Rt - (o.side == null ? 1 : o.side); x++) {
        if (!F.ok(x, y, w, h)) continue; let bad = false;
        for (let j = y - m; j < y + h + m && !bad; j++) for (let i = x - m; i < x + w + m; i++) { if (i >= x && i < x + w && j >= y && j < y + h) continue; if (!F.isOpen(i, j) || (o.clear && person(i, j))) { bad = true; break; } }
        if (bad) continue; const s = Math.abs(x + w / 2 - pref[0]) + Math.abs(y + h / 2 - pref[1]) * 1.3; if (s < bs) { bs = s; best = [x, y]; }
      }
      return best;
    },
    art(draw, z = 0.2) { p.paint(z, draw); },
    // A rug over tiles x0..x1, y0..y1 (clipped to the floor's inner part).
    rug(x0, y0, x1, y1, col, o = {}) {
      x0 = Math.max(L, x0); x1 = Math.min(Rt, x1); y0 = Math.max(T0 + 1, y0); y1 = Math.min(B - 1, y1); if (x1 - x0 < 1 || y1 < y0) return false;
      for (const r of rugs) if (x0 <= r[2] && x1 >= r[0] && y0 <= r[3] && y1 >= r[1]) return false;
      rugs.push([x0, y0, x1, y1]); const kind = o.kind || st.rug || "border", trim = o.trim || st.trim || WHITE;
      F.art((c) => {
        const X = x0 * S + 2, Y = y0 * S + 2, w = (x1 - x0 + 1) * S - 4, h = (y1 - y0 + 1) * S - 4;
        if (kind === "round") { c.ellipse(X + w / 2, Y + h / 2, w / 2, h / 2, dk(col, 0.45)); c.ellipse(X + w / 2, Y + h / 2, w / 2 - 1, h / 2 - 1, col); c.ellipse(X + w / 2, Y + h / 2, w / 2 - 4, h / 2 - 4, trim, 1); c.ellipse(X + w / 2, Y + h / 2, w / 4, h / 4, lt(col, 0.18)); }
        else if (kind === "stripe") { c.box(X, Y, w, h, col, dk(col, 0.45)); for (let i = 4; i < w - 4; i += 8) c.rect(X + i, Y + 1, 4, h - 2, i % 16 === 4 ? trim : lt(col, 0.25)); for (let i = 1; i < w; i += 3) { c.p(X + i, Y - 1, trim); c.p(X + i, Y + h, trim); } }
        else if (kind === "check") { c.box(X, Y, w, h, col, dk(col, 0.45)); for (let j = 2; j < h - 2; j += 6) for (let i = 2 + ((j / 6) & 1) * 6; i < w - 4; i += 12) c.rect(X + i, Y + j, 6, Math.min(6, h - 2 - j), lt(col, 0.3)); frame(c, X + 1, Y + 1, w - 2, h - 2, trim); }
        else if (kind === "mat") { c.box(X, Y, w, h, col, dk(col, 0.35)); for (let j = 3; j < h - 1; j += 3) c.rect(X + 1, Y + j, w - 2, 1, dk(col, 0.12)); c.rect(X + 1, Y + 1, 3, h - 2, dk(col, 0.4)); c.rect(X + w - 4, Y + 1, 3, h - 2, dk(col, 0.4)); }
        else { c.box(X, Y, w, h, col, dk(col, 0.45)); frame(c, X + 3, Y + 3, w - 6, h - 6, trim); frame(c, X + 5, Y + 5, w - 10, h - 10, A(lt(col, 0.3), 200)); if (w > 60 && h > 40) { const cx = X + w / 2, cy = Y + h / 2; c.poly([[cx - 10, cy], [cx, cy - 7], [cx + 10, cy], [cx, cy + 7]], lt(col, 0.22)); c.poly([[cx - 5, cy], [cx, cy - 3], [cx + 5, cy], [cx, cy + 3]], trim); } }
      }, 0.12);
      return true;
    },
    // A rug in the biggest open stretch of floor that is left.
    openRug(col, o = {}) {
      let best = null, ba = 0; const maxW = o.maxW || 8, maxH = o.maxH || 5;
      const clear = (x, y) => F.isOpen(x, y) && !rugs.some((r) => x >= r[0] - 1 && x <= r[2] + 1 && y >= r[1] - 1 && y <= r[3] + 1);
      for (let y0 = T0 + 1; y0 <= B - 2; y0++) for (let x0 = L + 1; x0 <= Rt - 1; x0++) { let wmax = Rt - 1 - x0 + 1; for (let h = 1; y0 + h - 1 <= B - 2 && h <= maxH; h++) { let w = 0; while (w < wmax && w < maxW && clear(x0 + w, y0 + h - 1)) w++; wmax = w; if (!w) break; const a = w * h - Math.abs(w - h * 1.6) * 0.3 - (Math.abs(x0 + w / 2 - (L + Rt + 1) / 2) + Math.abs(y0 + h / 2 - (T0 + B + 1) / 2)) * 0.05; if (w >= 3 && h >= 2 && a > ba) { ba = a; best = [x0, y0, x0 + w - 1, y0 + h - 1]; } } }
      return best ? F.rug(best[0], best[1], best[2], best[3], col, o) && best : null;
    },
    // Furnish what is still bare: an island of furniture in each big empty stretch of floor.
    fill(kinds, max = 3, minW = 5, minH = 4) {
      if (!kinds || !kinds.length) return 0;
      const clear = (x, y) => F.isOpen(x, y) && !person(x, y) && !resv.has(key(x, y)) && Math.abs(x - exit.x) > 1 && !rugs.some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
      for (let n = 0; n < max; n++) {
        let best = null, ba = 0;
        for (let y0 = T0 + 2; y0 <= B - 1; y0++) for (let x0 = L + 1; x0 <= Rt - 1; x0++) { let wmax = Rt - x0; for (let h = 1; y0 + h - 1 <= B - 1; h++) { let w = 0; while (w < wmax && clear(x0 + w, y0 + h - 1)) w++; wmax = w; if (!w) break; if (w >= minW && h >= minH && w * h > ba) { ba = w * h; best = [x0, y0, x0 + w - 1, y0 + h - 1]; } } }
        if (!best) return n;
        const kind = kinds[(n + F.num) % kinds.length]; if (ISLANDS[kind]) ISLANDS[kind](F, Math.floor((best[0] + best[2]) / 2), Math.floor((best[1] + best[3]) / 2), best);
        rugs.push(best);
      }
      return max;
    },
    // Things on the back wall wherever no tall furniture stands in front of it.
    decor(list, o = {}) {
      const Y = (T0 - 2) * S, tall = spans.filter((s) => s.tall).concat(o.skip || []).sort((a, b) => a.x0 - b.x0), gaps = []; let x = L * S + 3;
      for (const s of tall) { if (s.x0 - 2 - x >= 20) gaps.push([x, s.x0 - 2]); x = Math.max(x, s.x1 + 2); }
      if ((Rt + 1) * S - 3 - x >= 20) gaps.push([x, (Rt + 1) * S - 3]);
      if (st.glazed) list = list.filter((q) => q !== "window" && q !== "curtains" && q !== "shelf");
      if (!list.length) return;
      let i = o.fixed ? 0 : Math.floor(rnd() * list.length); const step = Math.max(o.step || 38, st.glazed ? 80 : 0);
      p.paint(0.04, (c) => { for (const [a, b] of gaps) { const n = Math.max(1, Math.floor((b - a + 6) / step)); for (let q = 0; q < n; q++) { const name = list[i++ % list.length], cx = Math.round(a + (b - a) * (q + 0.5) / n); if (WD[name]) WD[name](c, cx, Y, st, hsh(cx, T0, i)); } } });
    },
    // The ways in and out: a mat at the street door, stairs to other floors.
    doors(o = {}) {
      for (const w of p.warps) {
        p.bare(w.k); const X = w.x * S, Y = w.y * S, inner = /^UnovaHouse/.test(w.to) && !/Gate/.test(p.name), mat = st.mat || RED, kind = (o[w.k] || (w.exit ? (o.exit || (inner ? "down" : "mat")) : o.other || (w.y - T0 <= 2 ? "up" : "stairs")));
        const side = (w.x <= L + 2 || w.x >= Rt - 2) && w.y > T0 + 3 && w.y < B - 1;
        if (kind === "none") continue;
        if (side) p.paint(0.16, (c) => { c.box(X + 2, Y - 8, 13, 32, mat, dk(mat, 0.5)); c.rect(X + 5, Y - 5, 7, 26, lt(mat, 0.25)); });
        else if (kind === "mat") p.paint(0.16, (c) => { c.box(X - 8, Y + 2, 32, 13, mat, dk(mat, 0.5)); c.rect(X - 5, Y + 5, 26, 7, lt(mat, 0.25)); for (let i = 0; i < 5; i++) c.rect(X - 3 + i * 5, Y + 7, 3, 3, mat); });
        else if (kind === "down") p.paint(w.y + 0.4, (c) => stairsDown(c, X, Y, st.wood));
        else if (kind === "up") { p.paint(w.y + 0.4, (c) => stairsTo(c, X, (T0 - 1) * S - 6, Y + S, st.wood)); spans.push({ x0: X - 6, x1: X + 22, tall: true }); }
        else if (kind === "lift") p.paint(0.16, (c) => { c.box(X - 4, Y - 2, 24, 18, [70, 74, 90], INK); c.box(X - 2, Y, 20, 14, [170, 176, 190], [90, 96, 110]); c.rect(X + 7, Y, 2, 14, [90, 96, 110]); for (let i = 0; i < 3; i++) c.rect(X + 1, Y + 3 + i * 4, 5, 1, [200, 206, 220]); c.poly([[X + 11, Y + 9], [X + 14, Y + 4], [X + 17, Y + 9]], [110, 230, 130]); });
        else if (kind === "pad") p.paint(0.16, (c) => { glow(c, X + 8, Y + 8, 16, [120, 230, 250], 26); c.ellipse(X + 8, Y + 8, 11, 9, [40, 60, 90]); c.ellipse(X + 8, Y + 8, 9, 7, [120, 230, 250], 2); c.ellipse(X + 8, Y + 8, 3, 2, WHITE); });
        else p.paint(0.16, (c) => { c.box(X - 2, Y - 14, 20, 30, [70, 66, 84], INK); for (let s2 = 0; s2 < 28; s2 += 4) { c.rect(X, Y - 13 + s2, 16, 3, mix([120, 116, 136], [214, 210, 226], s2 / 28)); c.rect(X, Y - 10 + s2, 16, 1, [60, 56, 72]); } });
      }
    },
    // A table (w x 2 tiles) with chairs round it, on a rug.
    dining(pref, w = 3, o = {}) {
      const at = F.spot(w, 2, pref, { clear: true, ...o }); if (!at) return null; const [x, y] = at, cloth = o.cloth == null ? rnd() < 0.55 : o.cloth, col = o.col || st.fab[0];
      if (o.rug !== false) F.rug(x - 1, y - 1, x + w, y + 2, o.rugCol || st.fab[st.fab.length - 1], o.rugO);
      if (!F.put(x, y, w, 2, o.draw || ((c, X, Y, W, H) => { if (cloth) P.cloth(c, X, Y, W, H, lt(col, 0.78)); else { P.table(c, X, Y, W, H, st.wood); c.ellipse(X + W / 2, Y + 11, 5, 3, WHITE); c.ellipse(X + W / 2, Y + 10, 3, 2, [240, 150, 90]); c.rect(X + 6, Y + 8, 4, 5, [200, 230, 250]); c.rect(X + W - 10, Y + 9, 4, 5, [200, 230, 250]); } }))) return null;
      F.art((c) => { const cw = o.chair || dk(st.wood, 0.1); for (const [cx, cy] of [[x - 1, y], [x + w, y]]) if (F.isOpen(cx, cy) && !person(cx, cy)) P.chair(c, cx * S + (cx < x ? 3 : -3), cy * S + 8, cw); if (o.below !== false) for (let i = 0; i < w; i += 2) if (F.isOpen(x + i, y + 2) && !person(x + i, y + 2)) P.chair(c, (x + i) * S + (w === 2 ? 8 : 0), (y + 2) * S - 3, cw); }, 0.3);
      return at;
    },
    // Flat clutter on a free tile near `pref`.
    flat(pref, draw) { let best = null, bs = 1e9; for (let y = T0 + 1; y <= B - 1; y++) for (let x = L + 1; x <= Rt - 1; x++) { if (!F.ok(x, y, 1, 1)) continue; const s = Math.abs(x - pref[0]) + Math.abs(y - pref[1]); if (s < bs) { bs = s; best = [x, y]; } } if (best) F.art((c) => draw(c, best[0] * S, best[1] * S), 0.25); return best; },
  };
  F.I = itemsOf(st); F.num = +((p.name.match(/(\d+)$/) || [])[1] || seedOf(p.name) % 97); F.v = F.num % 3;
  const tv = TVS[p.name.replace(/^Unova/, "")]; if (tv) { const [tx, ty] = tv.split(",").map(Number); F.tv = { x: tx, y: ty }; p.paint(ty + 1.02, (c) => F_.tvFix(c, tx * S, ty * S, S, st)); }
  return F;
}
function itemsOf(st) {
  const it = (w, d, o) => ({ w, d, ...o }), f = st.fab, wood = st.wood;
  return {
    kitchen: (n = 3) => it(n, (c, X, Y, W) => kitchenRun(c, X, Y, W, st.kit)), fridge: it(1, F_.fridge, { tall: true }),
    bookcase: it(2, F_.bookcase, { tall: true }), bookcase1: it(1, F_.bookcase, { tall: true }), bookcase3: it(3, F_.bookcase, { tall: true }), wardrobe: it(2, F_.wardrobe, { tall: true }),
    tv: it(2, F_.tv), desk: it(2, F_.desk, { chair: dk(wood, 0.15) }), study: it(2, F_.study, { chair: dk(wood, 0.15) }), fireplace: it(3, F_.fireplace, { tall: true }), stove: it(1, F_.stove, { tall: true }), sink: it(2, F_.sink),
    clock: it(1, F_.clock, { tall: true }), dresser: it(2, F_.dresser), dresser1: it(1, F_.dresser), mirror: it(2, F_.mirror, { tall: true }), sideboard: it(2, F_.sideboard), piano: it(2, F_.piano, { tall: true, chair: [60, 50, 60] }),
    goods: (cols, n = 2) => it(n, F_.goods(cols), { tall: true }), lockers: it(2, F_.lockers, { tall: true }), filing: it(1, F_.filing, { tall: true }), cooler: it(1, F_.cooler), copier: it(1, F_.copier),
    crate: it(1, F_.crate), crate2: it(2, F_.crate), crates: it(1, F_.crates), crates2: it(2, F_.crates), barrel: it(1, F_.barrel), barrel2: it(2, F_.barrel), sacks: it(1, F_.sacks), sacks2: it(2, F_.sacks), firewood: it(1, F_.firewood), firewood2: it(2, F_.firewood),
    plant: it(1, st.palm ? F_.palm : F_.plant), flowers: it(1, F_.flowers), lamp: it(1, F_.lamp), coats: it(1, F_.coats), umbrellas: it(1, F_.umbrellas), shoes: it(2, F_.shoes), toys: it(1, F_.toys), toys2: it(2, F_.toys),
    trophies: it(2, F_.trophies, { tall: true }), aquarium: it(2, F_.aquarium), easel: (col) => it(1, (c, X, Y, W, s2) => F_.easel(c, X, Y, W, s2, col)), counter: (n = 3) => it(n, F_.counter), bench: it(2, F_.bench), bench3: it(3, F_.bench),
    sofa: (n = 3, col) => it(n, (c, X, Y, W, s2) => F_.sofa(c, X, Y, W, s2, col)), armchair: (col) => it(1, (c, X, Y, W, s2) => F_.sofa(c, X, Y, W, s2, col || f[1] || f[0])), sofaBack: (n = 3, col) => it(n, (c, X, Y, W, s2) => F_.sofaBack(c, X, Y, W, s2, col)),
    machine: it(2, F_.machine, { tall: true }), machine3: it(3, F_.machine, { tall: true }), console: it(2, F_.console), tank: it(1, F_.tank, { tall: true }), labTable: it(3, F_.labTable), bedside: it(1, F_.bedside), vending: it(1, F_.vending, { tall: true }),
    bed: (col, n = 1) => it(n, bedOf(col || f[0], wood), { h: 2 }), luggage: it(1, F_.luggage), signpost: it(1, F_.signpost),
    table: (n = 2, draw) => it(n, (c, X, Y, W) => { P.table(c, X, Y - 2, W, 18, wood); if (draw) draw(c, X, Y, W); }),
  };
}

// ---------------------------------------------------------------- styles: what a town's rooms are made of
const jit = (col, r, n = 10) => col.map((v) => Math.max(0, Math.min(255, Math.round(v + (r - 0.5) * 2 * n))));
const FAB = { red: [200, 90, 90], blue: [90, 130, 200], green: [110, 170, 120], gold: [226, 180, 90], teal: [70, 160, 160], plum: [150, 96, 160], orange: [226, 140, 80], navy: [60, 80, 130], rose: [236, 140, 160], sky: [120, 190, 226], olive: [140, 150, 90], wine: [150, 50, 64], cream: [236, 222, 190], grey: [140, 146, 160] };
const fabs = (...n) => n.map((q) => FAB[q]);
const STYLES = {
  aspertia: (r) => ({ floor: T.plank(jit([226, 190, 136], r)), wall: paper(r < 0.5 ? [244, 232, 206] : [236, 236, 214], { base: [170, 120, 80] }), wood: [156, 108, 66], fab: r < 0.5 ? fabs("green", "blue", "orange") : fabs("blue", "gold", "red") }),
  floccesy: (r) => ({ floor: T.plank(jit([206, 160, 104], r)), wall: paper([238, 226, 190], { base: [150, 100, 60], rail: [150, 100, 60] }), wood: [140, 96, 58], fab: r < 0.5 ? fabs("orange", "olive", "red") : fabs("olive", "gold", "wine"), fire: true }),
  virbank: (r) => ({ floor: T.plank(jit([150, 134, 128], r, 8)), wall: paper(r < 0.5 ? [150, 170, 180] : [170, 166, 150], { base: [80, 90, 104], panel: 16 }), wood: [110, 96, 96], fab: fabs("navy", "red", "grey"), crate: [150, 124, 100] }),
  nimbasa: (r) => ({ floor: T.plank(jit([236, 206, 160], r)), wall: paper(r < 0.5 ? [250, 226, 230] : [250, 240, 200], { base: [226, 150, 170], stripe: r < 0.5 ? [250, 206, 216] : [250, 226, 160] }), wood: [190, 140, 100], fab: r < 0.5 ? fabs("rose", "gold", "sky") : fabs("sky", "rose", "gold"), rug: "round" }),
  driftveil: (r) => ({ floor: T.plank(jit([190, 140, 100], r)), wall: paper([236, 222, 196], { base: [110, 70, 46], rail: GOLD }), wood: [110, 70, 46], fab: r < 0.5 ? fabs("wine", "gold", "navy") : fabs("navy", "gold", "wine"), trim: GOLD }),
  mistralton: (r) => ({ floor: T.plank(jit([220, 196, 150], r)), wall: paper(r < 0.5 ? [206, 228, 244] : [226, 236, 226], { base: [110, 140, 170], dots: [236, 244, 250] }), wood: [170, 130, 90], fab: fabs("blue", "cream", "orange"), rug: "stripe" }),
  icirrus: (r) => ({ floor: T.plank(jit([150, 104, 70], r, 8)), wall: logWall(jit([160, 112, 70], r, 8)), wood: [110, 72, 46], fab: r < 0.5 ? fabs("red", "olive", "cream") : fabs("teal", "wine", "cream"), fire: true, sky: [200, 220, 240], stone: [130, 130, 144], rug: "check" }),
  opelucid: (r) => ({ floor: T.slab(jit([150, 150, 160], r, 8), 2), wall: stoneWall(jit([130, 134, 150], r, 8)), wood: [96, 70, 56], fab: r < 0.5 ? fabs("plum", "navy", "gold") : fabs("navy", "wine", "gold"), stone: [120, 120, 136], trim: GOLD, fire: r < 0.4 }),
  lacunosa: (r) => ({ floor: T.plank(jit([180, 140, 100], r)), wall: paper([220, 214, 196], { base: [120, 116, 110], wain: [150, 146, 136] }), wood: [120, 86, 60], fab: r < 0.5 ? fabs("navy", "cream", "teal") : fabs("teal", "gold", "navy"), sky: [60, 70, 120] }),
  beach: (r) => ({ floor: T.plank(jit([236, 214, 170], r)), wall: seaWindows(r < 0.5 ? [250, 244, 230] : [226, 240, 244]), wood: [226, 200, 160], fab: r < 0.5 ? fabs("sky", "orange", "cream") : fabs("teal", "gold", "sky"), palm: true, rug: "stripe", sea: true, glazed: true, kit: [226, 240, 244] }),
  humilau: (r) => ({ floor: T.plank(jit([226, 200, 130], r), 4), wall: seaWindows(r < 0.5 ? [250, 240, 210] : [240, 244, 226]), wood: [200, 160, 100], fab: r < 0.5 ? fabs("teal", "orange", "cream") : fabs("orange", "sky", "green"), palm: true, rug: "mat", sea: true, glazed: true }),
  lentimas: (r) => ({ floor: T.slab(jit([200, 136, 100], r, 8), 5), wall: adobeWall(jit([226, 164, 114], r, 8)), wood: [120, 80, 56], fab: fabs("red", "gold", "teal"), rug: "stripe", stone: [200, 140, 100], sky: [240, 200, 150] }),
  nacrene: (r) => ({ floor: T.plank(jit([150, 106, 80], r, 8)), wall: Wl.brick(jit(r < 0.5 ? [170, 90, 70] : [160, 104, 80], r, 6)), wood: [110, 76, 56], fab: r < 0.5 ? fabs("teal", "gold", "cream") : fabs("olive", "orange", "cream"), crate: [170, 130, 90] }),
  striaton: (r) => ({ floor: T.plank(jit([220, 180, 130], r)), wall: paper([240, 236, 214], { base: [110, 150, 110], rail: [110, 160, 110] }), wood: [160, 116, 76], fab: r < 0.34 ? fabs("green", "cream", "red") : r < 0.67 ? fabs("red", "cream", "blue") : fabs("blue", "cream", "green") }),
  accumula: (r) => ({ floor: T.plank(jit([214, 176, 126], r)), wall: paper(r < 0.5 ? [214, 228, 240] : [240, 230, 214], { base: [120, 130, 160], dots: r < 0.5 ? [236, 244, 250] : null }), wood: [150, 104, 70], fab: r < 0.5 ? fabs("blue", "gold", "red") : fabs("gold", "teal", "plum") }),
  nuvema: (r) => ({ floor: T.plank(jit([214, 180, 130], r)), wall: paper(r < 0.5 ? [226, 236, 226] : [240, 232, 220], { base: [150, 130, 100] }), wood: [166, 120, 80], fab: r < 0.5 ? fabs("red", "green", "cream") : fabs("green", "sky", "gold") }),
  village: (r) => ({ floor: T.cobble(jit([170, 160, 146], r, 8)), wall: stoneWall(jit([156, 146, 132], r, 8), [110, 76, 50]), wood: [130, 90, 60], fab: r < 0.5 ? fabs("wine", "olive", "cream") : fabs("olive", "orange", "cream"), fire: true, stone: [140, 132, 122], rug: "check" }),
  anville: (r) => ({ floor: T.plank(jit([176, 130, 90], r)), wall: paper([226, 214, 190], { base: [110, 50, 40], wain: [150, 70, 56] }), wood: [120, 80, 54], fab: r < 0.5 ? fabs("navy", "red", "gold") : fabs("red", "navy", "cream") }),
  black: (r) => ({ floor: T.slab(jit([62, 62, 78], r, 6), 3), wall: neonWall([40, 40, 58], r < 0.5 ? [110, 230, 250] : [250, 110, 200]), wood: [56, 56, 72], fab: [[200, 60, 90], [110, 230, 250], [90, 90, 120]], metal: [90, 96, 120], sky: [30, 30, 60], kit: [110, 116, 136], leaf: [60, 130, 110], trim: [110, 230, 250], mat: [110, 230, 250], crate: [90, 96, 120] }),
  white: (r) => ({ floor: T.plank(jit([206, 176, 124], r)), wall: logWall([200, 164, 110]), wood: [170, 126, 80], fab: fabs("green", "cream", "gold"), leaf: [90, 170, 90], rug: "round", green: true }),
  desert: (r) => ({ floor: T.check(jit([236, 216, 170], r, 6), jit([226, 204, 156], r, 6), 1), wall: paper([240, 226, 190], { base: [200, 150, 90] }), wood: [176, 130, 84], fab: r < 0.5 ? fabs("orange", "teal", "cream") : fabs("teal", "gold", "red"), sky: [250, 220, 150], rug: "stripe" }),
  cabin: (r) => ({ floor: T.plank(jit([176, 128, 84], r)), wall: logWall(jit([166, 118, 74], r, 8)), wood: [124, 84, 54], fab: r < 0.5 ? fabs("red", "green", "cream") : fabs("green", "gold", "navy"), fire: true, cabin: true, rug: "check" }),
  shrine: () => ({ floor: T.tatami(), wall: shojiWall, wood: [110, 76, 50], fab: fabs("wine", "cream", "olive"), rug: "mat", cabin: true }),
  league: (r) => ({ floor: T.slab(jit([170, 170, 186], r, 6), 4), wall: stoneWall([150, 150, 170]), wood: [110, 80, 70], fab: fabs("wine", "gold", "navy"), trim: GOLD, stone: [150, 150, 170] }),
  office: (r) => ({ floor: r < 0.5 ? T.check(jit([150, 164, 190], r, 14), jit([140, 154, 180], r, 14), 1) : T.carpet(jit([120, 134, 160], r, 16)), wall: skyline(r < 0.5 ? [200, 206, 220] : [226, 220, 204]), wood: [200, 206, 220], fab: r < 0.5 ? fabs("navy", "red", "grey") : fabs("teal", "gold", "grey"), mat: [70, 110, 190], office: true, glazed: true, kit: [200, 206, 220] }),
  lab: (r) => ({ floor: T.check([234, 238, 242], [216, 224, 232], 1), wall: labWall(r < 0.5 ? [200, 226, 226] : [214, 220, 236]), wood: [170, 176, 196], fab: fabs("sky", "teal", "grey"), mat: [90, 170, 200], metal: [150, 170, 190] }),
  marble: () => ({ floor: T.marble([226, 226, 236]), wall: paper([236, 236, 244], { base: [150, 150, 176], panel: 32 }), wood: [150, 150, 176], fab: fabs("blue", "gold", "cream"), trim: GOLD, mat: [70, 110, 190] }),
};
function styleOf(key, name) { const r = rngOf(name + "/style")(), st = (typeof key === "function" ? key : STYLES[key])(r); return { leaf: [70, 150, 84], sky: [150, 206, 244], crate: [176, 130, 84], trim: WHITE, key, ...st }; }
// Start a room: its style's floor and wall, its doors.
function startRoom(p, key, doors) {
  const st = styleOf(key, p.name), F = furnish(p, st); F.k.floor(st.floor); F.k.wall(st.wall); F.doors(doors); F.k.notches();
  // The room's own bigger fixtures, until a role says what they are: a table, a counter, a cabinet.
  F.k.fixtures((s) => s.w === 1 && s.h === 1 ? null : s.w === 1 ? (c, X, Y, W, H) => P.bookcase(c, X, Y - 10, W, H + 9, st.wood) : s.h === 1 ? (c, X, Y, W, H) => P.counter(c, X, Y - 6, W, H + 5, st.counter || st.wood, st.counterTop || [236, 222, 190]) : (c, X, Y, W, H) => { c.rect(X, Y - 6, W, 8, [0, 0, 0, 0]); P.table(c, X, Y - 6, W, H + 6, st.wood); c.box(X + 5, Y + 2, 10, 7, WHITE, [150, 150, 160]); c.ellipse(X + W - 9, Y + 6, 4, 3, st.fab[0]); });
  return F;
}

// ---------------------------------------------------------------- roles
const cushion = (col) => (c, X, Y) => { c.ellipse(X + 8, Y + 10, 6, 4, dk(col, 0.35)); c.ellipse(X + 8, Y + 9, 5, 3, col); c.p(X + 8, Y + 9, dk(col, 0.3)); };
const slippers = (c, X, Y) => { c.box(X + 3, Y + 6, 4, 7, [226, 130, 130], [130, 60, 60]); c.box(X + 9, Y + 6, 4, 7, [226, 130, 130], [130, 60, 60]); };
const petBowl = (c, X, Y) => { c.ellipse(X + 8, Y + 10, 5, 3, [70, 110, 190]); c.ellipse(X + 8, Y + 9, 3, 2, [150, 110, 70]); };
const blocks = (c, X, Y) => { c.box(X + 2, Y + 8, 5, 5, [226, 80, 80], [120, 40, 40]); c.box(X + 7, Y + 8, 5, 5, [80, 130, 226], [40, 60, 120]); c.box(X + 5, Y + 3, 5, 5, [250, 210, 90], [130, 100, 40]); ball(c, X + 13, Y + 4, 2); };
const paperPile = (c, X, Y) => { c.box(X + 3, Y + 5, 9, 7, WHITE, [150, 150, 160]); c.box(X + 5, Y + 7, 9, 7, [250, 244, 220], [150, 150, 160]); c.rect(X + 7, Y + 9, 5, 1, [150, 150, 160]); };
// The lounge: a rug and a sofa before the TV if the room has one; else a sofa where there is room.
function lounge(F, pref) {
  const I = F.I, st = F.st, col = st.fab[0];
  if (F.tv) {
    const { x, y } = F.tv;
    for (const dy of [3, 4]) for (const n of [3, 2]) { const x0 = Math.max(F.L, Math.min(F.R - n + 1, x - (n >> 1))); if (F.stand(x0, y + dy, I.sofaBack(n, col))) { F.rug(x0, y + 1, x0 + n - 1, y + dy - 1, st.fab[1] || col); return true; } }
    F.flat([x, y + 2], cushion(col)); F.flat([x + 1, y + 2], cushion(st.fab[1] || col));
    return false;
  }
  const at = F.spot(3, 1, pref, { clear: true }); if (!at) return false;
  if (!F.stand(at[0], at[1], I.sofa(3, col))) return false;
  F.rug(at[0], at[1] + 1, at[0] + 2, at[1] + 2, st.fab[1] || col); const t = F.spot(1, 1, [at[0] + 1.5, at[1] + 2], { margin: 0 });
  return true;
}
function corners(F, list) { F.front(F.shuffle(list)); }
// A lived-in ground floor: kitchen at one end of the back wall, storage at the other, a table to eat at, somewhere to sit.
function living(F, o = {}) {
  const I = F.I, st = F.st, r = F.rnd, big = F.W >= 22, v = F.v, flip = v === 1, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  const cook = st.cabin ? [I.stove, I.sink, r() < 0.5 ? I.firewood : I.barrel] : r() < 0.5 ? [I.kitchen(big ? 4 : 3), I.fridge] : [I.fridge, I.kitchen(big ? 4 : 3)];
  const store = F.shuffle([I.bookcase, I.sideboard, I.wardrobe, I.clock, I.dresser, I.plant, F.tv ? I.mirror : I.tv]).slice(0, big ? 4 : 3);
  F.run(flip ? store : cook, 1); F.run(flip ? cook : store, -1);
  if (st.fire) F.run([I.fireplace], 1, Math.round(cx - 2 + (r() - 0.5) * 4)) || F.run([I.fireplace], 1, F.L + 5);
  F.run(F.shuffle([I.plant, I.bookcase1, I.coats, I.lamp]).slice(0, 2), 1, Math.round(cx - 3));
  const side = flip ? 0.72 : 0.28;
  F.dining([F.L + F.W * side, cy + (v === 2 ? -1.5 : 1.5)], big || r() < 0.4 ? 3 : 2, o.dining);
  lounge(F, [F.L + F.W * (1 - side), cy + (v === 2 ? 2 : -0.5)]);
  F.col(F.shuffle([I.bookcase1, I.plant, I.armchair(), I.dresser1, I.lamp, I.crate]).slice(0, big ? 4 : 2).flatMap((q) => [q, null, null]), -1, F.T + 3 + Math.floor(r() * 2));
  F.col(F.shuffle([I.bookcase1, I.flowers, I.armchair(st.fab[2]), I.dresser1, I.lamp, I.coats]).slice(0, big ? 4 : 2).flatMap((q) => [q, null, null]), 1, F.T + 3 + Math.floor(r() * 2));
  corners(F, [I.plant, I.shoes, I.umbrellas, I.coats, I.flowers]);
  F.openRug(st.fab[(F.num + 1) % st.fab.length], { kind: ["border", "stripe", "check", "round"][(F.num + (st.rug ? 0 : 1)) % 4], maxW: 6, maxH: 4 });
  F.flat([F.exit.x + (flip ? -3 : 3), F.B - 1], r() < 0.5 ? slippers : petBowl);
  F.decor(o.wall || (st.sea ? ["fishTrophy", "lamp", "clock", "lamp"] : st.cabin ? ["window", "antlers", "shelf", "pans", "picture"] : HOME_WALL));
}
living.isl = ["seat", "play", "green", "read", "desk"];
// Upstairs: beds, a wardrobe, a desk; toys where children sleep.
function bedroom(F, o = {}) {
  const I = F.I, st = F.st, r = F.rnd, flip = F.v === 1, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, two = F.v !== 2;
  const beds = two ? [I.bed(st.fab[0]), I.bedside, I.bed(st.fab[1])] : [I.bed(st.fab[0], 2), I.bedside];
  const rest = F.shuffle([I.wardrobe, I.desk, I.bookcase, I.mirror, I.toys2]).slice(0, 3);
  F.run(flip ? rest : beds, 1); F.run(flip ? beds : rest, -1);
  F.run(F.shuffle([I.plant, I.dresser, I.lamp, I.clock]).slice(0, 2), 1, Math.round(cx - 2));
  F.col([F.pick([I.dresser1, I.bookcase1, I.toys]), null, null, F.pick([I.plant, I.armchair(), I.lamp])], flip ? 1 : -1, F.T + 4);
  F.col([F.pick([I.armchair(st.fab[2]), I.crate, I.flowers]), null, null, null, I.bookcase1], flip ? -1 : 1, F.T + 5);
  if (!lounge(F, [cx + (flip ? 3 : -3), cy + 1]) && !F.tv) { /* no sofa: more floor to play on */ }
  const rc = st.fab[F.num % st.fab.length], rk = ["border", "round", "stripe", "check"][(F.num >> 1) % 4], dx = F.v === 0 ? 0 : flip ? -2 : 2, wide = (F.num & 2) ? 1 : 0;
  F.rug(Math.round(cx - 2 - wide + dx), Math.round(cy - 1), Math.round(cx + 1 + wide + dx), Math.round(cy + 1), rc, { kind: rk }) || F.openRug(rc, { kind: rk, maxW: 5, maxH: 3 });
  const at = F.spot(2, 1, [cx + (flip ? -4 : 4), cy + 2], { clear: true }); if (at && r() < 0.7) F.stand(at[0], at[1], I.table(2, (c, X, Y) => { c.box(X + 5, Y, 10, 6, [250, 244, 220], [150, 150, 160]); c.rect(X + 20, Y - 1, 4, 5, [226, 90, 90]); c.rect(X + 25, Y, 3, 4, [90, 150, 226]); }));
  F.flat([cx - 1, cy], blocks); F.flat([cx + 2, cy + 1], cushion(st.fab[1] || st.fab[0])); F.flat([cx - 3, cy + 2], r() < 0.5 ? slippers : paperPile);
  corners(F, [I.plant, I.toys, I.crate, I.flowers]);
  F.decor(o.wall || ["curtains", "poster", "picture", "shelf", "poster", "clock"]);
}

// ---------------------------------------------------------------- props for the special rooms
Object.assign(F_, {
  luggage: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X + 1, Y + 5, 14, 10, [150, 90, 60], [80, 46, 30]); c.rect(X + 1, Y + 9, 14, 1, [80, 46, 30]); c.rect(X + 6, Y + 3, 4, 2, [80, 46, 30]); c.box(X + 3, Y - 3, 10, 8, [70, 110, 160], [36, 60, 96]); c.rect(X + 7, Y - 5, 3, 2, [36, 60, 96]); c.rect(X + 4, Y, 8, 1, [226, 200, 90]); },
  signpost: (c, X, Y, W, st) => { const cx = X + W / 2, h = st.fab[0]; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y + 2, 2, 12, [110, 116, 136]); c.box(cx - 4, Y + 12, 8, 3, [110, 116, 136], INK); c.box(cx - 7, Y - 12, 14, 15, WHITE, dk(h, 0.2)); c.rect(cx - 6, Y - 11, 12, 4, h); c.rect(cx - 4, Y - 5, 8, 1, [110, 116, 136]); c.rect(cx - 4, Y - 2, 6, 1, [110, 116, 136]); },
  podium: (c, X, Y, W, st, col) => { const k2 = col || st.fab[0]; shade(c, X, Y, W, S); c.box(X + 2, Y - 2, W - 4, 17, k2, dk(k2, 0.5)); c.rect(X + 3, Y - 1, W - 6, 2, lt(k2, 0.3)); c.ellipse(X + W / 2, Y + 7, 3, 3, WHITE); c.ellipse(X + W / 2, Y - 4, 3, 2, RED); },
  musicStand: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx, Y - 2, 1, 16, [70, 70, 84]); c.line(cx - 4, Y + 14, cx, Y + 10, [70, 70, 84]); c.line(cx + 4, Y + 14, cx, Y + 10, [70, 70, 84]); c.box(cx - 6, Y - 10, 12, 9, WHITE, [70, 70, 84]); for (let i = 0; i < 3; i++) c.rect(cx - 4, Y - 8 + i * 2, 8, 1, [150, 150, 160]); },
  guitar: (c, X, Y, W, st) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y - 12, 2, 16, [90, 60, 40]); c.rect(cx - 2, Y - 14, 4, 3, [60, 40, 30]); c.ellipse(cx, Y + 7, 5, 6, dk(st.fab[0], 0.3)); c.ellipse(cx, Y + 7, 4, 5, st.fab[0]); c.ellipse(cx, Y + 6, 1, 1, INK); c.rect(cx - 5, Y + 13, 10, 1, [70, 70, 84]); },
  drums: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 13, W / 2 - 1, 3, [0, 0, 0, 60]); c.ellipse(cx, Y + 5, 9, 9, INK); c.ellipse(cx, Y + 5, 8, 8, [226, 60, 90]); c.ellipse(cx, Y + 5, 5, 5, WHITE); for (const d of [-1, 1]) { c.box(cx + d * 11 - 4, Y - 2, 8, 9, [110, 190, 226], INK); c.ellipse(cx + d * 11, Y - 2, 4, 2, WHITE); c.rect(cx + d * 13, Y - 13, 1, 12, [150, 150, 160]); c.ellipse(cx + d * 13, Y - 13, 5, 2, GOLD); } },
  speaker: (c, X, Y, W) => P.speaker(c, X + 1, Y - 12, W - 2, 27),
  bag: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 6, Y - 15, 12, 2, [90, 90, 104]); c.rect(cx, Y - 13, 1, 4, [150, 150, 160]); c.box(cx - 4, Y - 9, 8, 20, [190, 60, 60], [100, 30, 30]); c.rect(cx - 3, Y - 8, 2, 18, [226, 110, 100]); c.rect(cx - 4, Y - 2, 8, 1, [100, 30, 30]); },
  dummy: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y + 2, 2, 12, [130, 96, 60]); c.rect(cx - 7, Y - 4, 14, 2, [130, 96, 60]); c.box(cx - 4, Y - 6, 8, 10, [226, 206, 150], [130, 104, 60]); c.ellipse(cx, Y - 10, 4, 4, [130, 104, 60]); c.ellipse(cx, Y - 10, 3, 3, [226, 206, 150]); c.ellipse(cx, Y - 1, 2, 2, RED, 1); },
  weights: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X + 1, Y + 4, W - 2, 11, [90, 94, 110], INK); for (let i = 0; i + 12 <= W; i += 14) { c.rect(X + i + 3, Y - 1, 10, 2, [170, 176, 190]); c.box(X + i + 2, Y - 4, 3, 8, [50, 52, 64], INK); c.box(X + i + 11, Y - 4, 3, 8, [50, 52, 64], INK); c.box(X + i + 3, Y + 7, 3, 6, [200, 70, 70], INK); c.box(X + i + 10, Y + 7, 3, 6, [70, 110, 200], INK); } },
  block: (c, X, Y, W) => { const s = [216, 214, 224]; shade(c, X, Y, W, S); c.box(X + 1, Y - 6, W - 2, 21, s, dk(s, 0.5)); c.rect(X + 2, Y - 5, W - 4, 6, lt(s, 0.3)); c.rect(X + 2, Y + 1, W - 4, 1, dk(s, 0.25)); for (let i = 5; i < W - 4; i += 7) c.line(X + i, Y + 4, X + i + 3, Y + 11, dk(s, 0.2)); if (W > S) c.rect(X + W / 2, Y - 5, 1, 19, dk(s, 0.3)); },
  carving: (c, X, Y, W) => { P.statue(c, X + 1, Y - 14, W - 2, 29, [222, 220, 230]); c.rect(X + 2, Y + 12, 3, 2, [150, 146, 138]); c.rect(X + 10, Y + 13, 4, 2, [150, 146, 138]); },
  workbench: (c, X, Y, W, st) => { P.table(c, X, Y - 2, W, 18, st.wood); c.rect(X + 4, Y - 1, 9, 2, [150, 156, 170]); c.rect(X + 11, Y - 3, 3, 6, [110, 76, 50]); c.rect(X + 18, Y + 1, 10, 2, [170, 176, 190]); c.rect(X + 26, Y, 4, 4, [200, 70, 70]); if (W > 40) { c.box(X + 34, Y - 4, 8, 7, [176, 172, 164], [100, 96, 90]); c.rect(X + 44, Y + 2, 2, 5, [110, 76, 50]); } },
  oven: (c, X, Y, W) => { const s = [176, 110, 84], cx = X + W / 2; shade(c, X, Y, W, S); c.box(X + 6, Y - 32, 10, 14, dk(s, 0.15), dk(s, 0.5)); c.box(X, Y - 6, W, 21, s, dk(s, 0.5)); c.ellipse(cx, Y - 5, W / 2, 13, dk(s, 0.5)); c.ellipse(cx, Y - 5, W / 2 - 1, 12, s); for (let r = 0; r < 3; r++) for (let q = (r & 1) * 5 + 3; q < W - 4; q += 10) c.rect(X + q, Y - 12 + r * 9, 6, 1, dk(s, 0.22)); c.ellipse(cx, Y + 4, 10, 9, [30, 22, 22]); c.rect(cx - 10, Y + 4, 20, 9, [30, 22, 22]); glow(c, cx, Y + 6, 12, [250, 150, 50], 26); c.poly([[cx - 7, Y + 12], [cx - 3, Y + 3], [cx, Y + 8], [cx + 4, Y + 1], [cx + 7, Y + 12]], [240, 130, 50]); c.ellipse(cx, Y + 10, 4, 2, [226, 180, 110]); c.rect(X + 1, Y + 13, W - 2, 2, dk(s, 0.4)); },
  breads: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X, Y - 15, W, 30, dk(w, 0.25), dk(w, 0.6)); for (let r = 0; r < 3; r++) { const y = Y - 12 + r * 9; c.rect(X + 1, y + 6, W - 2, 2, lt(w, 0.2)); for (let i = 3; i + 7 <= W; i += 9) { const k2 = [[226, 170, 100], [206, 140, 80], [240, 200, 130]][(i + r) % 3]; if ((i + r) % 4 === 0) { c.rect(i + X, y + 1, 7, 5, k2); c.rect(i + X + 1, y + 2, 5, 1, lt(k2, 0.3)); } else { c.ellipse(X + i + 3, y + 3, 4, 3, dk(k2, 0.3)); c.ellipse(X + i + 3, y + 3, 3, 2, k2); } } } },
  boat: (c, X, Y, W) => { const w = [150, 104, 66]; c.ellipse(X + W / 2, Y + 14, W / 2 - 2, 2, [0, 0, 0, 60]); c.poly([[X + 1, Y + 1], [X + W - 1, Y + 1], [X + W - 7, Y + 13], [X + 7, Y + 13]], dk(w, 0.45)); c.poly([[X + 3, Y + 2], [X + W - 3, Y + 2], [X + W - 8, Y + 11], [X + 8, Y + 11]], w); c.rect(X + 4, Y + 2, W - 8, 2, lt(w, 0.3)); c.rect(X + 6, Y + 6, W - 12, 1, dk(w, 0.3)); c.rect(X + W / 2 - 2, Y + 2, 4, 9, lt(w, 0.15)); c.line(X + 8, Y + 3, X + W - 4, Y - 9, [200, 160, 110], 2); c.box(X + W - 7, Y - 12, 5, 6, [200, 160, 110], dk(w, 0.4)); },
  washer: (c, X, Y, W) => { shade(c, X, Y, W, S); c.box(X + 1, Y - 6, W - 2, 21, [236, 240, 244], [110, 126, 146]); c.rect(X + 2, Y - 5, W - 4, 4, [200, 210, 224]); c.rect(X + 3, Y - 4, 3, 2, [110, 230, 130]); c.ellipse(X + W / 2, Y + 6, 5, 5, [110, 126, 146]); c.ellipse(X + W / 2, Y + 6, 4, 4, [130, 190, 236]); c.ellipse(X + W / 2 - 1, Y + 5, 1, 1, WHITE); },
  fan: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y + 2, 2, 11, [150, 156, 170]); c.box(cx - 5, Y + 12, 10, 3, [150, 156, 170], [70, 76, 92]); c.ellipse(cx, Y - 5, 8, 8, [70, 76, 92]); c.ellipse(cx, Y - 5, 7, 7, [226, 236, 244]); for (const [dx, dy] of [[0, -4], [4, 2], [-4, 2]]) c.ellipse(cx + dx, Y - 5 + dy, 2, 3, [110, 190, 236]); c.ellipse(cx, Y - 5, 1, 1, INK); },
  mower: (c, X, Y, W) => { shade(c, X, Y, W, S); c.line(X + 3, Y - 8, X + 8, Y + 6, [110, 116, 136], 2); c.rect(X + 1, Y - 9, 6, 2, INK); c.box(X + 4, Y + 4, 11, 8, [90, 180, 90], [40, 90, 50]); c.rect(X + 6, Y + 2, 6, 3, [60, 60, 70]); c.ellipse(X + 5, Y + 12, 3, 3, INK); c.ellipse(X + 13, Y + 12, 3, 3, INK); },
  micro: (c, X, Y, W, st) => { F_.dresser(c, X, Y, W, st); c.box(X + 1, Y - 13, W - 2, 10, [226, 230, 240], [80, 86, 104]); c.rect(X + 3, Y - 11, W - 9, 6, [60, 66, 84]); c.rect(X + W - 5, Y - 11, 2, 2, [110, 230, 130]); c.rect(X + W - 5, Y - 7, 2, 2, [240, 90, 80]); },
  sand: (c, X, Y, W) => { const s = [230, 206, 150]; c.ellipse(X + W / 2, Y + 12, W / 2, 4, dk(s, 0.2)); c.poly([[X, Y + 13], [X + W * 0.3, Y + 2], [X + W * 0.55, Y + 6], [X + W * 0.75, Y - 2], [X + W, Y + 13]], dk(s, 0.12)); c.poly([[X + 2, Y + 13], [X + W * 0.3, Y + 4], [X + W * 0.5, Y + 9], [X + W * 0.72, Y + 1], [X + W - 3, Y + 13]], s); for (let i = 0; i < W / 3; i++) c.p(X + 2 + hsh(i, X, 1) * (W - 4), Y + 8 + hsh(i, Y, 2) * 5, lt(s, 0.4)); },
  tire: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 13, 7, 2, [0, 0, 0, 60]); for (const dy of [8, 3]) { c.ellipse(cx, Y + dy, 7, 5, [30, 30, 38]); c.ellipse(cx, Y + dy - 1, 6, 3, [70, 70, 84]); c.ellipse(cx, Y + dy - 1, 3, 1, [20, 20, 26]); } },
  stall: (cols, aw) => (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X, Y - 2, W, 17, w, dk(w, 0.5)); c.rect(X + 1, Y - 1, W - 2, 5, lt(w, 0.3)); for (let i = 3; i + 8 <= W; i += 9) { const k2 = cols[(i / 9 | 0) % cols.length]; c.box(X + i, Y - 5, 8, 7, lt(w, 0.15), dk(w, 0.4)); c.ellipse(X + i + 2, Y - 4, 2, 2, k2); c.ellipse(X + i + 5, Y - 4, 2, 2, lt(k2, 0.2)); c.ellipse(X + i + 4, Y - 6, 2, 2, k2); } c.rect(X + 1, Y - 20, 2, 19, dk(w, 0.3)); c.rect(X + W - 3, Y - 20, 2, 19, dk(w, 0.3)); for (let i = 0; i < W; i += 8) { c.rect(X + i, Y - 28, 8, 10, (i / 8) & 1 ? WHITE : aw); c.poly([[X + i, Y - 18], [X + i + 8, Y - 18], [X + i + 4, Y - 14]], (i / 8) & 1 ? WHITE : aw); } c.rect(X, Y - 29, W, 2, dk(aw, 0.3)); },
  trainTable: (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y + 2, W, H - 4, [110, 76, 50], [60, 40, 28]); c.rect(X + 2, Y + 3, W - 4, H - 10, [110, 170, 110]); c.ellipse(X + W / 2, Y + H / 2 - 3, W / 2 - 6, H / 2 - 9, [90, 76, 70], 2); c.ellipse(X + W / 2, Y + H / 2 - 3, W / 2 - 6, H / 2 - 9, [200, 200, 210], 1); c.box(X + 8, Y + 5, 9, 5, [200, 60, 60], INK); c.rect(X + 10, Y + 3, 2, 2, INK); c.box(X + 18, Y + 6, 7, 4, [70, 110, 190], INK); c.box(X + W - 14, Y + H - 16, 8, 6, [226, 206, 150], [120, 84, 44]); c.poly([[X + W - 15, Y + H - 16], [X + W - 10, Y + H - 20], [X + W - 5, Y + H - 16]], [150, 70, 56]); for (const [dx, dy] of [[W / 2 - 3, H / 2 - 4], [W / 2 + 4, H / 2 - 2]]) { c.rect(X + dx, Y + dy, 1, 3, [110, 76, 50]); c.ellipse(X + dx, Y + dy - 1, 2, 2, [60, 130, 70]); } },
  signal: (c, X, Y, W) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y - 2, 2, 16, [60, 60, 70]); c.box(cx - 4, Y + 12, 8, 3, [60, 60, 70], INK); c.box(cx - 4, Y - 14, 8, 14, [40, 40, 50], INK); c.ellipse(cx, Y - 10, 2, 2, [240, 80, 70]); c.ellipse(cx, Y - 4, 2, 2, [110, 230, 130]); },
  globe: (c, X, Y, W, st) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y + 6, 2, 7, st.wood); c.box(cx - 5, Y + 12, 10, 3, st.wood, dk(st.wood, 0.5)); c.ellipse(cx, Y - 2, 8, 8, [50, 90, 160]); c.ellipse(cx, Y - 2, 7, 7, [90, 150, 230]); c.ellipse(cx - 2, Y - 4, 3, 2, [110, 190, 110]); c.ellipse(cx + 3, Y + 1, 2, 3, [110, 190, 110]); c.ellipse(cx, Y - 2, 9, 9, GOLD, 1); },
  flag: (c, X, Y, W, st, col) => { const cx = X + W / 2; c.ellipse(cx, Y + 14, 4, 2, [0, 0, 0, 60]); c.rect(cx - 1, Y - 15, 2, 29, [200, 190, 150]); c.ellipse(cx, Y - 15, 2, 2, GOLD); c.poly([[cx + 1, Y - 13], [cx + 12, Y - 11], [cx + 10, Y - 6], [cx + 12, Y - 2], [cx + 1, Y - 3]], col || st.fab[0]); c.rect(cx + 2, Y - 9, 8, 2, WHITE); },
  plinth: (draw) => (c, X, Y, W) => { const s = [226, 226, 236]; shade(c, X, Y, W, S); c.box(X + 2, Y + 2, W - 4, 13, s, dk(s, 0.4)); c.rect(X + 1, Y + 1, W - 2, 3, lt(s, 0.3)); draw(c, X + W / 2, Y + 1); },
  bones: (c, X, Y, W) => P.showcase(c, X, Y - 10, W, 25, (c2, cx, by) => { c2.line(cx - 4, by - 2, cx + 4, by - 7, [240, 236, 220], 2); c2.ellipse(cx - 4, by - 2, 2, 2, [240, 236, 220]); c2.ellipse(cx + 4, by - 7, 2, 2, [240, 236, 220]); }),
  files: (c, X, Y, W, st) => { const w = st.wood; shade(c, X, Y, W, S); c.box(X, Y - 15, W, 30, w, dk(w, 0.5)); for (let r = 0; r < 3; r++) { const y = Y - 12 + r * 9; c.rect(X + 2, y, W - 4, 7, dk(w, 0.6)); for (let i = 0; i + 4 <= W - 4; i += 4) c.box(X + 2 + i, y + 1 + ((i + r) % 3 === 0 ? 2 : 0), 4, 6 - ((i + r) % 3 === 0 ? 2 : 0), [[226, 206, 150], [200, 210, 224], [226, 190, 170]][(i / 4 + r) % 3], [110, 96, 70]); } },
  dreamer: (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 1, Y + 2, W - 2, H - 4, [200, 206, 224], [90, 96, 124]); c.box(X + 3, Y + 4, W - 6, 8, WHITE, [190, 190, 200]); c.box(X + 2, Y + 13, W - 4, H - 17, [250, 170, 200], [170, 90, 130]); c.ellipse(X + W / 2, Y + 3, W / 2 - 1, 5, [250, 190, 220, 150]); c.rect(X + W - 5, Y + H - 8, 3, 3, [110, 230, 130]); },
  mattress: (c, X, Y, W, H) => { c.rect(X + 2, Y + H - 2, W - 2, 3, [0, 0, 0, 56]); c.box(X + 1, Y + 3, W - 2, H - 5, [200, 196, 180], [110, 104, 90]); for (let i = 5; i < H - 6; i += 5) c.rect(X + 2, Y + i + 2, W - 4, 1, [150, 170, 200]); c.box(X + 3, Y + 5, W - 6, 6, [226, 226, 230], [150, 150, 160]); c.box(X + 2, Y + H / 2, W - 4, H / 2 - 4, [110, 130, 110], [60, 76, 60]); },
});
Object.assign(WD, {
  led: (c, cx, Y) => { c.box(cx - 32, Y + 4, 64, 16, [20, 22, 30], [70, 76, 96]); for (let i = 0; i < 14; i++) if (hsh(i, 3, cx) > 0.25) c.rect(cx - 28 + i * 4, Y + 8 + (i % 3), 3, 3 + (i % 2) * 3, [250, 170, 60]); c.rect(cx - 28, Y + 16, 56, 1, [110, 230, 130]); },
  keys: (c, cx, Y, st) => { c.box(cx - 14, Y + 5, 28, 18, dk(st.wood, 0.2), dk(st.wood, 0.6)); for (let i = 0; i < 12; i++) { const x = Math.round(cx - 11 + (i % 6) * 4.5), y = Y + 8 + Math.floor(i / 6) * 8; c.p(x, y, GOLD); if (hsh(i, cx, 2) > 0.3) c.rect(x, y + 1, 1, 4, [226, 226, 236]); } },
  bottles: (c, cx, Y) => { for (const y of [12, 23]) { c.rect(cx - 16, Y + y, 32, 2, [110, 76, 50]); for (let i = 0; i < 7; i++) { const col = [[90, 160, 110], [200, 150, 70], [150, 70, 90], [226, 226, 240]][(i + y) % 4], x = Math.round(cx - 14 + i * 4.5); c.rect(x, Y + y - 7, 3, 7, col); c.rect(x + 1, Y + y - 9, 1, 2, col); } } },
  tools: (c, cx, Y, st) => { c.box(cx - 15, Y + 5, 30, 19, lt(st.wood, 0.2), dk(st.wood, 0.5)); c.rect(cx - 11, Y + 8, 2, 12, [130, 96, 60]); c.box(cx - 13, Y + 7, 6, 4, [150, 156, 170], [70, 76, 92]); c.rect(cx - 3, Y + 8, 1, 12, [150, 156, 170]); c.rect(cx - 4, Y + 17, 3, 4, [130, 96, 60]); c.poly([[cx + 3, Y + 9], [cx + 12, Y + 9], [cx + 12, Y + 14], [cx + 3, Y + 12]], [176, 180, 190]); c.rect(cx + 2, Y + 12, 3, 8, [130, 96, 60]); },
  net: (c, cx, Y) => { for (let i = -14; i <= 14; i += 4) { c.line(cx + i, Y + 5, cx + i * 0.5, Y + 24, [200, 190, 150]); } for (let y = 8; y < 24; y += 4) c.line(cx - 14 + (y - 5) * 0.35, Y + y, cx + 14 - (y - 5) * 0.35, Y + y, [200, 190, 150]); c.ellipse(cx - 12, Y + 7, 2, 2, RED); c.ellipse(cx + 12, Y + 7, 2, 2, [250, 220, 100]); },
  lifebuoy: (c, cx, Y) => { c.ellipse(cx, Y + 14, 9, 9, INK); c.ellipse(cx, Y + 14, 8, 8, WHITE); for (const [dx, dy] of [[-6, 0], [6, 0], [0, -6], [0, 6]]) c.rect(cx + dx - 2, Y + 14 + dy - 2, 4, 4, RED); c.ellipse(cx, Y + 14, 4, 4, INK); c.ellipse(cx, Y + 14, 3, 3, [226, 214, 190]); },
  anchor: (c, cx, Y) => { const k2 = [70, 76, 96]; c.ellipse(cx, Y + 7, 3, 3, k2, 1); c.rect(cx - 1, Y + 9, 2, 13, k2); c.rect(cx - 5, Y + 12, 10, 2, k2); c.line(cx - 8, Y + 17, cx, Y + 23, k2, 2); c.line(cx + 8, Y + 17, cx, Y + 23, k2, 2); },
  badges: (c, cx, Y, st) => { c.box(cx - 18, Y + 5, 36, 19, [60, 50, 70], GOLD); for (let i = 0; i < 8; i++) { const x = cx - 13 + (i % 4) * 9, y = Y + 10 + Math.floor(i / 4) * 8, col = [[226, 190, 80], [150, 96, 180], [110, 190, 110], [250, 220, 90], [200, 150, 90], [110, 190, 236], [90, 110, 200], [120, 220, 220]][i]; c.ellipse(x, y, 3, 3, dk(col, 0.4)); c.ellipse(x, y, 2, 2, col); c.p(x - 1, y - 1, WHITE); } },
  graffiti: (c, cx, Y, st, r) => { const cols = [[240, 110, 220], [130, 240, 120], [110, 200, 250], [250, 220, 90]]; for (let i = 0; i < 4; i++) { const x = cx - 14 + i * 8; c.line(x, Y + 22 - (i & 1) * 4, x + 6, Y + 8 + (i & 1) * 5, cols[(i + Math.floor(r * 4)) % 4], 2); } c.ellipse(cx + 8, Y + 12, 4, 4, cols[Math.floor(r * 4)], 1); },
  ox: (c, cx, Y) => { c.box(cx - 17, Y + 5, 16, 18, WHITE, [70, 76, 96]); c.ellipse(cx - 9, Y + 14, 5, 5, [226, 70, 70], 2); c.box(cx + 1, Y + 5, 16, 18, WHITE, [70, 76, 96]); c.line(cx + 5, Y + 9, cx + 13, Y + 19, [70, 110, 220], 2); c.line(cx + 13, Y + 9, cx + 5, Y + 19, [70, 110, 220], 2); },
  rail: (c, cx, Y) => { c.box(cx - 13, Y + 6, 26, 16, [236, 226, 200], [120, 84, 44]); c.box(cx - 9, Y + 11, 12, 6, [60, 60, 70], INK); c.rect(cx - 7, Y + 8, 3, 3, [60, 60, 70]); c.box(cx + 3, Y + 9, 6, 8, [190, 60, 50], INK); c.rect(cx + 4, Y + 10, 3, 3, [190, 226, 250]); c.ellipse(cx - 6, Y + 18, 2, 2, INK); c.ellipse(cx, Y + 18, 2, 2, INK); c.ellipse(cx + 6, Y + 18, 2, 2, INK); c.rect(cx - 11, Y + 20, 22, 1, [110, 96, 80]); },
  film: (c, cx, Y, st, r) => { const k2 = [[226, 80, 100], [90, 130, 220], [250, 200, 80]][Math.floor(r * 3)]; c.box(cx - 9, Y + 4, 18, 22, lt(k2, 0.3), [40, 40, 54]); star(c, cx, Y + 12, 6, WHITE); c.rect(cx - 6, Y + 20, 12, 1, [40, 40, 54]); c.rect(cx - 6, Y + 22, 8, 1, [40, 40, 54]); },
  flags: (c, cx, Y) => { c.line(cx - 18, Y + 6, cx + 18, Y + 6, [110, 110, 126]); for (let i = 0; i < 6; i++) { const x = cx - 17 + i * 6; c.poly([[x, Y + 6], [x + 5, Y + 6], [x + 2.5, Y + 14]], [[226, 80, 80], [250, 220, 90], [90, 150, 226], [110, 200, 120], [236, 140, 200], [240, 240, 250]][i]); } },
  stage: (c, cx, Y, st) => Wl.curtain(c, cx - 30, Y + 1, 60, 27, st.fab[0]),
  timetable: (c, cx, Y) => { c.box(cx - 13, Y + 5, 26, 19, [30, 34, 50], [90, 96, 124]); for (let i = 0; i < 5; i++) { c.rect(cx - 11, Y + 8 + i * 3, 8, 1, [250, 220, 110]); c.rect(cx - 1, Y + 8 + i * 3, 6, 1, WHITE); c.rect(cx + 8, Y + 8 + i * 3, 3, 1, i === 1 ? [240, 90, 80] : [110, 230, 130]); } },
  bridge: (c, cx, Y) => { c.box(cx - 14, Y + 5, 28, 19, [150, 206, 244], [70, 76, 96]); c.rect(cx - 13, Y + 18, 26, 5, [70, 130, 210]); c.rect(cx - 13, Y + 15, 26, 2, [90, 96, 116]); for (const d of [-6, 6]) { c.rect(cx + d - 1, Y + 8, 2, 12, [90, 96, 116]); c.line(cx + d, Y + 8, cx + d - 7, Y + 15, [226, 226, 236]); c.line(cx + d, Y + 8, cx + d + 7, Y + 15, [226, 226, 236]); } },
  tube: (c, cx, Y) => { c.box(cx - 14, Y + 5, 28, 19, [40, 110, 190], [226, 226, 236]); c.ellipse(cx, Y + 15, 11, 5, [150, 220, 250, 160]); c.ellipse(cx, Y + 15, 11, 5, WHITE, 1); fish(c, cx - 6, Y + 9, 0.6, [250, 170, 90], false); fish(c, cx + 7, Y + 21, 0.5, [250, 240, 150], true); },
  mantine: (c, cx, Y) => { c.box(cx - 14, Y + 5, 28, 19, [90, 170, 226], [120, 84, 44]); c.poly([[cx - 11, Y + 12], [cx, Y + 9], [cx + 11, Y + 12], [cx + 3, Y + 18], [cx, Y + 21], [cx - 3, Y + 18]], [50, 70, 130]); c.poly([[cx - 4, Y + 13], [cx + 4, Y + 13], [cx, Y + 18]], [200, 220, 240]); c.p(cx - 3, Y + 12, WHITE); c.p(cx + 3, Y + 12, WHITE); },
  discs: (c, cx, Y, st) => { c.box(cx - 16, Y + 5, 32, 19, dk(st.wood, 0.2), dk(st.wood, 0.6)); for (let i = 0; i < 10; i++) { const x = cx - 12 + (i % 5) * 6, y = Y + 10 + Math.floor(i / 5) * 9, col = [[226, 120, 80], [110, 170, 240], [250, 220, 100], [150, 110, 200], [120, 200, 130], [240, 150, 200], [150, 150, 170], [200, 160, 110], [110, 220, 220], [90, 90, 120]][i]; c.ellipse(x, y, 3, 3, col); c.ellipse(x, y, 1, 1, WHITE); } },
  audino: (c, cx, Y) => { Wl.picture(c, cx - 10, Y + 6, 20, 16, [250, 226, 230], (c2, x, y) => { c2.ellipse(x, y, 4, 4, [250, 190, 200]); c2.ellipse(x - 5, y - 1, 2, 3, [250, 240, 220]); c2.ellipse(x + 5, y - 1, 2, 3, [250, 240, 220]); c2.p(x - 1, y - 1, [70, 130, 200]); c2.p(x + 2, y - 1, [70, 130, 200]); }); },
});

// ---------------------------------------------------------------- more roles
// A gatehouse: the lane between its two doors, the electric bulletin board, benches and plants along the walls.
function gateRoom(F, o = {}) {
  const I = F.I, st = F.st, p = F.p, hue = st.fab[0], r = F.rnd, cy = F.exit.y, mid = (F.L + F.R + 1) / 2 * S;
  F.art((c) => {
    const x0 = F.L * S, x1 = (F.R + 1) * S, Y = cy * S - 8; c.rect(x0, Y, x1 - x0, 32, A(hue, 64)); c.rect(x0, Y, x1 - x0, 2, hue); c.rect(x0, Y + 30, x1 - x0, 2, hue);
    for (let x = x0 + 56; x < x1 - 40; x += 32) { if (Math.abs(x - mid) < 30) continue; const d = x < mid ? -1 : 1; c.poly([[x - d * 5, Y + 9], [x + d * 4, Y + 16], [x - d * 5, Y + 23], [x - d * 5, Y + 19], [x - d, Y + 16], [x - d * 5, Y + 13]], A(WHITE, 210)); }
    c.ellipse(mid, Y + 16, 22, 15, A(WHITE, 120)); c.ellipse(mid, Y + 16, 22, 15, hue, 2); ball(c, mid, Y + 16, 9, hue);
  }, 0.1);
  for (const w of p.warps) { const left = w.x < (F.L + F.R) / 2, X = left ? (F.L - 1) * S + 5 : (F.R + 1) * S; p.paint(0.05, (c) => { c.box(X, w.y * S - 16, 11, 48, o.out || [170, 214, 244], [40, 44, 60]); c.rect(X + 1, w.y * S - 15, 9, 3, WHITE); c.rect(X + (left ? 1 : 8), w.y * S - 12, 2, 43, [226, 240, 250]); const mx = left ? F.L * S : w.x * S + 2; c.box(mx, w.y * S - 8, 30, 32, hue, dk(hue, 0.5)); c.rect(mx + 3, w.y * S - 5, 24, 26, lt(hue, 0.25)); }); }
  F.k.fixtures((s) => s.w === 2 && s.h === 2 ? (s.y < (F.T + F.B) / 2 ? (c, X, Y, W, H) => { P.counter(c, X, Y - 6, W, H + 6, hue, WHITE); c.box(X + 8, Y - 13, 12, 9, [50, 54, 70], INK); c.rect(X + 10, Y - 11, 8, 5, [110, 190, 236]); c.rect(X + 22, Y - 5, 5, 3, WHITE); } : (c, X, Y, W, H) => { P.table(c, X, Y - 6, W, H + 6, [200, 206, 220]); c.box(X + 5, Y, 9, 7, WHITE, [150, 150, 160]); c.box(X + 17, Y + 1, 9, 7, lt(hue, 0.5), [150, 150, 160]); c.rect(X + 8, Y + 11, 5, 5, hue); c.rect(X + 18, Y + 12, 6, 4, WHITE); }) : null);
  const seats = F.shuffle([I.bench3, I.bench, I.lockers, I.signpost, I.bench, I.vending]);
  F.run([I.plant, null, seats[0], null, null, seats[1]], 1); F.run([I.plant, null, seats[2], null, null, null, seats[3]], -1);
  for (const x of F.shuffle([F.L + 3, F.L + 8, F.R - 9, F.R - 4]).slice(0, 3)) F.stand(x, F.B, r() < 0.7 ? I.bench : I.signpost);
  F.front([I.plant, I.plant]);
  F.col([I.signpost, null, I.plant], -1, F.T + 3); F.col([I.plant], 1, cy + 3);
  for (const [fx, fy] of [[[0.3, 0.3], [0.7, 0.75]], [[0.72, 0.28], [0.3, 0.78]], [[0.5, 0.22], [0.2, 0.75], [0.8, 0.78]]][(F.num + (seedOf(p.name) & 1)) % 3]) { const at = F.spot(2, 2, [F.L + F.W * fx, F.T + F.H * fy], { clear: true, margin: 1 }); if (at && Math.abs(at[1] - cy) > 2) { F.rug(at[0] - 1, at[1], at[0] + 2, at[1] + 1, lt(hue, 0.35), { kind: "mat" }); F.stand(at[0], at[1], I.bench); F.stand(at[0], at[1] + 1, I.bench); } }
  if (!F.k.solids.some((q) => q.w === 2 && q.h === 2)) scatter(F, [[{ w: 3, d: (c, X, Y, W) => { F_.counter(c, X, Y, W, st); c.box(X + 6, Y - 10, 12, 9, [50, 54, 70], INK); c.rect(X + 8, Y - 8, 8, 5, [110, 190, 236]); c.rect(X + 26, Y - 4, 6, 3, WHITE); c.rect(X + 36, Y - 6, 5, 5, lt(hue, 0.4)); } }, [F.L + F.W * [0.62, 0.3, 0.5, 0.75][seedOf(p.name) % 4], seedOf(p.name) % 3 === 0 ? F.B - 3.5 : F.T + 4.5]]], { margin: 1 });
  if (o.more2) o.more2(F);
  F.decor(Array.isArray(o.wall) ? o.wall : ["led", "window", "map", "clock", "window", "timetable"], { step: 74, fixed: true });
}
const gateStyle = (hue, o = {}) => (r) => ({ floor: o.floor || (r < 0.5 ? T.check([236, 240, 244], mix([214, 224, 236], hue, 0.12), 1) : T.lino(mix([236, 238, 242], hue, 0.06), mix([200, 206, 220], hue, 0.3))), wall: typeof o.wall === "function" ? o.wall : paper(mix([226, 234, 240], hue, 0.12), { base: dk(hue, 0.25), rail: hue }), wood: [200, 206, 220], fab: [hue, lt(hue, 0.35), dk(hue, 0.25)], mat: hue, counter: hue, counterTop: WHITE, ...o.st });
// A hotel lobby: the desk beside the receptionist, the key rack, a runner from the door, a lounge.
function hotel(F, o = {}) {
  const I = F.I, st = F.st, p = F.p, r = F.rnd, a = p.people.slice().sort((q, s) => q.y - s.y || Math.abs(q.x - 11) - Math.abs(s.x - 11))[0] || { x: 11, y: F.T + 2 }, col = st.fab[0];
  F.art((c) => { const X = F.exit.x * S - 16, y0 = (a.y + 1) * S, y1 = (F.B + 1) * S; c.rect(X, y0, 48, y1 - y0, col); c.rect(X + 2, y0, 2, y1 - y0, GOLD); c.rect(X + 44, y0, 2, y1 - y0, GOLD); const ax = Math.min(a.x, F.exit.x - 1), bx = Math.max(a.x, F.exit.x + 1); c.rect(ax * S, y0, (bx - ax + 1) * S, 32, col); c.rect(ax * S, y0 + 2, (bx - ax + 1) * S, 2, GOLD); if (ax < F.exit.x - 1) c.rect(ax * S, y0 + 28, X - ax * S, 2, GOLD); if (bx > F.exit.x + 1) c.rect(X + 48, y0 + 28, (bx + 1) * S - X - 48, 2, GOLD); }, 0.1);
  for (const [x, n] of [[a.x - 3, 3], [a.x + 1, 3], [a.x - 2, 2], [a.x + 1, 2]]) if (x >= F.L && x + n - 1 <= F.R) F.stand(x, a.y, { w: n, d: (c, X, Y, W) => { F_.counter(c, X, Y, W, st); c.box(X + 5, Y - 8, 5, 6, GOLD, dk(GOLD, 0.4)); c.box(X + W - 13, Y - 6, 9, 5, WHITE, [150, 150, 160]); } });
  if (a.y - 1 > F.T) for (const [x, n] of [[a.x - 1, 3], [a.x, 1]]) if (F.stand(x, F.T, { w: n, tall: true, d: (c, X, Y, W) => { c.box(X, Y - 15, W, 30, dk(st.wood, 0.1), dk(st.wood, 0.6)); for (let i = 0; i < W - 6; i += 5) for (let j = 0; j < 3; j++) { c.box(X + 3 + i, Y - 12 + j * 9, 4, 7, dk(st.wood, 0.5), dk(st.wood, 0.7)); if (hsh(i, j, X) > 0.35) c.rect(X + 4 + i, Y - 10 + j * 9, 1, 4, GOLD); } } })) break;
  F.run([I.plant, I.sofa(2), null, I.sideboard], 1); F.run([I.plant, I.clock, null, I.sofa(2, st.fab[2])], -1);
  const side = r() < 0.5 ? -1 : 1, lx = side < 0 ? F.L + 3 : F.R - 4;
  const at = F.spot(3, 1, [lx + 1, F.T + F.H * 0.55], { clear: true });
  if (at) { F.rug(at[0] - 1, at[1] - 1, at[0] + 3, at[1] + 3, st.fab[2], { trim: GOLD }); F.stand(at[0], at[1], I.sofa(3, st.fab[1])); const t = F.spot(2, 1, [at[0] + 1.5, at[1] + 2.5], { margin: 0, clear: true }); if (t) F.stand(t[0], t[1], I.table(2, (c, X, Y) => { c.ellipse(X + 10, Y + 2, 4, 2, WHITE); c.rect(X + 20, Y - 2, 3, 5, [200, 230, 250]); })); }
  const lg = F.spot(2, 1, [F.exit.x + side * -4, F.B - 2], { clear: true, bottom: 1 }); if (lg) { F.stand(lg[0], lg[1], I.luggage) ; F.stand(lg[0] + 1, lg[1], { w: 1, d: (c, X, Y, W) => { F_.luggage(c, X, Y, W); } }); }
  F.col([I.armchair(st.fab[1]), null, I.lamp, null, null, I.plant], -side, F.T + 4); F.col([I.lamp, null, null, null, null, null, I.plant], side, F.T + 3);
  F.front([I.plant, I.plant, I.umbrellas]);
  F.decor(["picture", "lamp", "curtains", "lamp", "picture", "keys"]);
}
// An office floor: desks with their machines, cabinets, a place to meet.
function officeRoom(F, o = {}) {
  const I = F.I, st = F.st, r = F.rnd, cx = (F.L + F.R + 1) / 2;
  F.run([I.filing, I.filing, I.copier, null, I.desk, null, I.desk], 1); F.run([I.plant, I.cooler, I.bookcase, null, I.desk], -1);
  let n = 0; for (const y of [F.T + 4, F.T + 8, F.T + 12]) for (const x of [F.L + 2, F.L + 6, F.R - 7, F.R - 3]) if (y < F.B - 2 && n < (o.desks || 5) && r() < 0.8 && F.spot(2, 1, [x + 1, y + 0.5], { clear: true, margin: 0 }) && F.stand(x, y, I.desk)) n++;
  F.dining([cx, F.T + F.H * 0.62], 3, { cloth: false, rugCol: st.fab[2] });
  F.col([I.filing, null, null, I.plant], -1, F.T + 6); F.col([I.bookcase1, null, null, null, I.crate], 1, F.T + 5);
  F.front([I.plant, I.plant, I.umbrellas]); F.flat([cx + 3, F.B - 2], paperPile);
  F.openRug(st.fab[0], { kind: "border", maxW: 5, maxH: 3 });
  F.decor(o.wall || ["whiteboard", "clock", "board", "calendar", "screen"], { step: 46 });
}
// A lab: machines along the back, benches, crates.
function lab(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([I.machine3, I.tank, I.tank, null, I.console], 1); F.run([I.bookcase, I.filing, null, I.desk, null, I.machine], -1);
  F.rug(Math.round(cx - 3), Math.round(cy - 1), Math.round(cx + 2), Math.round(cy + 1), st.fab[0], { kind: "round" });
  for (const [fx, fy] of [[0.25, 0.4], [0.75, 0.62], [0.28, 0.8], [0.72, 0.3]]) { const at = F.spot(3, 1, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at) F.stand(at[0], at[1], I.labTable); }
  F.col([I.console, null, null, I.crates], -1, F.T + 4); F.col([I.tank, null, null, I.filing], 1, F.T + 4);
  F.front([I.plant, I.crates, I.plant]); F.flat([cx - 2, F.B - 2], paperPile);
  F.decor(o.wall || ["screen", "whiteboard", "window", "shelf", "clock"], { step: 46 });
}
// A shop: shelving along the back, gondolas on the floor, stock in the corners.
function shop(F, o = {}) {
  const I = F.I, st = F.st, cols = o.cols || BOOKS;
  F.run([I.goods(cols), I.goods(cols), I.goods(cols), null, I.goods(cols), I.goods(cols)], 1); F.run([I.fridge, I.fridge, null, I.goods(cols)], -1);
  for (const fy of [0.42, 0.7]) for (const fx of [0.28, 0.72]) { const at = F.spot(3, 1, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at) F.stand(at[0], at[1], I.goods(cols, 3)); }
  const at = F.spot(3, 1, [F.exit.x - 4, F.B - 3], { clear: true, bottom: 2 }); if (at) F.stand(at[0], at[1], { w: 3, d: (c, X, Y, W) => { F_.counter(c, X, Y, W, st); c.box(X + 4, Y - 9, 10, 8, [60, 64, 80], INK); c.rect(X + 6, Y - 7, 6, 3, [110, 230, 130]); } });
  F.col([I.crates, null, null, I.barrel], -1, F.T + 4); F.col([I.crate, null, null, null, I.sacks], 1, F.T + 3);
  F.front([I.plant, I.crates, I.umbrellas]); F.openRug(st.fab[0], { kind: "mat", maxW: 4, maxH: 2 });
  F.decor(["poster", "clock", "poster", "board"]);
}
// A café: the bar along the back, round tables, a corner to play in.
function cafe(F, o = {}) {
  const I = F.I, st = F.st, r = F.rnd, bar = { w: 4, d: (c, X, Y, W) => { F_.counter(c, X, Y, W, st); for (let i = 0; i < 3; i++) { c.rect(X + 6 + i * 9, Y - 8, 3, 6, [[90, 160, 110], [200, 150, 70], [150, 70, 90]][i]); } c.box(X + W - 16, Y - 11, 11, 9, [150, 156, 170], INK); c.rect(X + W - 13, Y - 6, 5, 3, [60, 40, 30]); } };
  F.run([bar, I.fridge, null, I.barrel2], o.flip ? -1 : 1); F.run([I.plant, o.music === false ? I.bookcase : I.piano, null, { w: 1, d: F_.speaker, tall: true }], o.flip ? 1 : -1);
  let n = 0; for (const [fx, fy] of [[0.25, 0.42], [0.72, 0.45], [0.3, 0.75], [0.7, 0.78], [0.5, 0.58]]) { const at = F.spot(2, 2, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (!at || n >= (o.tables || 4)) continue; if (F.put(at[0], at[1], 2, 2, roundTable(lt(st.fab[n % 3], 0.6)), { rows: 1 })) { n++; F.art((c) => { for (const cxx of [at[0] - 1, at[0] + 2]) if (F.isOpen(cxx, at[1] + 1) && !F.person(cxx, at[1] + 1)) P.chair(c, cxx * S + (cxx < at[0] ? 3 : -3), (at[1] + 1) * S - 3, dk(st.wood, 0.1)); }, 0.3); } }
  F.col([I.barrel, null, null, I.crate], -1, F.T + 5); F.col([{ w: 1, d: F_.guitar }, null, null, I.plant], 1, F.T + 4);
  F.front([I.plant, I.umbrellas, I.plant]); F.openRug(st.fab[0], { maxW: 5, maxH: 3 });
  F.decor(["bottles", "lamp", "picture", "lamp", "board"]);
}
// A reading room: books on every wall, a table to read at.
function study(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([I.bookcase3, I.bookcase, null, I.bookcase, I.study], 1); F.run([I.bookcase3, I.clock, I.bookcase, null, I.bookcase], -1);
  F.col([I.bookcase1, I.bookcase1, null, null, I.bookcase1, I.bookcase1, null, null, { w: 1, d: F_.globe }], -1, F.T + 3); F.col([I.bookcase1, null, null, I.bookcase1, I.bookcase1, null, null, I.lamp], 1, F.T + 4);
  F.dining([cx - 3, cy + 2], 3, { cloth: false, draw: (c, X, Y, W, H) => { P.table(c, X, Y, W, H, st.wood); for (let i = 0; i < 3; i++) c.box(X + 5 + i * 13, Y + 6 + (i & 1) * 3, 9, 7, [WHITE, [250, 244, 220], [200, 230, 250]][i], [150, 150, 160]); } });
  const at = F.spot(1, 1, [cx + 5, cy + 1], { clear: true }); if (at) { F.stand(at[0], at[1], I.armchair()); F.stand(at[0] + 1, at[1], I.lamp); F.rug(at[0] - 1, at[1], at[0] + 2, at[1] + 2, st.fab[1], { kind: "round" }); }
  for (const [dx, dy] of [[2, -2], [-5, 4], [6, 4]]) F.flat([cx + dx, cy + dy], (c, X, Y) => bookPile(c, X, Y));
  F.front([I.plant, I.crate, I.flowers]); F.openRug(st.fab[0]);
  F.decor(["picture", "clock", "map", "lamp"]);
}
// A rest house: beds for worn-out Trainers, a table, something hot to drink.
function rest(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([I.bed(st.fab[0]), I.bedside, I.bed(st.fab[0]), I.bedside, I.bed(st.fab[0])], 1); F.run([I.plant, I.kitchen(3), I.cooler], -1);
  F.art((c) => { const X = F.exit.x * S - 16; c.rect(X, (F.T + 3) * S, 48, (F.B - F.T - 2) * S, st.fab[0]); c.rect(X + 2, (F.T + 3) * S, 2, (F.B - F.T - 2) * S, GOLD); c.rect(X + 44, (F.T + 3) * S, 2, (F.B - F.T - 2) * S, GOLD); }, 0.1);
  F.dining([cx - 5, cy + 2], 2, { rug: false }); F.dining([cx + 5, cy + 2], 2, { rug: false });
  F.col([I.bookcase1, null, null, I.lockers], -1, F.T + 4); F.col([I.vending, null, null, I.bench], 1, F.T + 4);
  F.front([I.plant, I.luggage, I.plant, I.coats]);
  F.decor(["map", "lamp", "window", "badges", "lamp", "clock"]);
}
// A battle house: a court marked out in the middle, benches to watch from.
function arena(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.art((c) => court(c, F.L + 3, F.T + 3, F.R - 3, F.B - 3, A(lt(st.fab[0], 0.5), 150), WHITE), 0.1);
  F.run([I.trophies, null, I.bench3, null, I.lockers], 1); F.run([I.plant, I.console, null, I.bench3], -1);
  F.col([{ w: 1, d: F_.dummy }, null, null, null, I.plant], -1, F.T + 3); F.col([{ w: 1, d: F_.bag }, null, null, null, null, I.crate], 1, F.T + 3);
  F.front([I.plant, I.plant, I.signpost]);
  F.decor(o.wall || ["screen", "banner", "badges", "banner", "clock"], { step: 46 });
}
// A club room: sofas round a big rug, cups and pictures.
function club(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([I.trophies, I.sofa(3), null, I.sideboard], 1); F.run([I.plant, I.trophies, null, I.sofa(2, st.fab[1]), I.clock], -1);
  F.rug(Math.round(cx - 4), Math.round(cy - 1), Math.round(cx + 3), Math.round(cy + 2), st.fab[0], { kind: "round" }); F.art((c) => ball(c, cx * S, (cy + 1) * S, 9), 0.13);
  F.col([I.armchair(), I.armchair(st.fab[2]), null, null, I.flowers], -1, F.T + 5); F.col([I.armchair(st.fab[2]), null, null, I.armchair(), I.lamp], 1, F.T + 4);
  const at = F.spot(2, 1, [cx + 4, F.B - 4], { clear: true }); if (at) F.stand(at[0], at[1], I.table(2, (c, X, Y) => { c.ellipse(X + 8, Y + 2, 4, 2, WHITE); c.ellipse(X + 22, Y + 2, 4, 2, WHITE); c.rect(X + 14, Y - 3, 4, 6, [226, 150, 110]); }));
  F.front([I.plant, I.flowers, I.plant, I.coats]);
  F.decor(["poster", "picture", "banner", "picture", "poster"]);
}
// Draw every one-tile fixture of the room (signs to read) as `draw(c, X, Y, W, st, i, s)`.
function signsAs(F, draw, only) { let i = 0; for (const s of F.k.solids) if (s.w === 1 && s.h === 1 && !(F.tv && F.tv.x === s.x && F.tv.y === s.y) && (!only || only.some(([x, y]) => x === s.x && y === s.y))) { const n = i++, d = draw(s, n); if (d) F.p.paint(s.y + 1.02, (c) => d(c, s.x * S, s.y * S, S, F.st)); } }

// Islands of furniture for open floor: (F, mx, my, [x0, y0, x1, y1]).
const ISLANDS = {
  seat: (F, mx, my) => { const col = F.st.fab[F.num % F.st.fab.length]; F.rug(mx - 2, my - 1, mx + 2, my + 1, F.st.fab[(F.num + 1) % F.st.fab.length]); scatter(F, [[F.I.sofa(3, col), [mx + 0.5, my - 0.5]], [F.I.table(2, (c, X, Y) => { c.box(X + 5, Y, 9, 6, WHITE, [150, 150, 160]); c.ellipse(X + 23, Y + 2, 3, 2, [226, 120, 110]); }), [mx + 0.5, my + 1.5]]], { margin: 0 }); },
  play: (F, mx, my) => { F.rug(mx - 2, my - 1, mx + 2, my + 1, F.st.fab[(F.num + 2) % F.st.fab.length], { kind: "round" }); scatter(F, [[F.I.toys2, [mx + 0.5, my - 0.5]]], { margin: 0 }); F.flat([mx - 1, my + 1], blocks); F.flat([mx + 1, my + 1], cushion(F.st.fab[0])); F.flat([mx + 2, my], cushion(F.st.fab[1] || F.st.fab[0])); },
  green: (F, mx, my) => { F.rug(mx - 1, my, mx + 2, my + 1, F.st.fab[(F.num + 1) % F.st.fab.length], { kind: "round" }); scatter(F, [[F.I.armchair(), [mx, my + 0.5]], [F.I.table(1, (c, X, Y) => { c.rect(X + 5, Y - 4, 4, 5, [90, 150, 200]); c.ellipse(X + 7, Y - 5, 3, 2, [240, 130, 150]); }), [mx + 1, my + 0.5]], [F.I.armchair(F.st.fab[2]), [mx + 2, my + 0.5]], [F.I.plant, [mx + 3.5, my + 0.5]]], { margin: 0 }); },
  read: (F, mx, my) => { scatter(F, [[F.I.bookcase3, [mx + 0.5, my]], [F.I.armchair(), [mx - 0.5, my + 2]], [F.I.lamp, [mx + 1.5, my + 2]]], { margin: 0 }); },
  desk: (F, mx, my) => { scatter(F, [[F.I.desk, [mx, my]], [F.I.filing, [mx + 2.5, my]]], { margin: 0 }); },
  crates: (F, mx, my) => { scatter(F, [[F.I.crates2, [mx, my]], [F.I.crate, [mx + 2.5, my]], [F.I.barrel, [mx, my + 1.5]]], { margin: 0 }); },
  dine: (F, mx, my) => { F.dining([mx + 0.5, my], 3); },
  shelf: (F, mx, my) => { scatter(F, [[F.I.goods(null, 3), [mx + 0.5, my]]], { margin: 0 }); },
  bench: (F, mx, my) => { F.rug(mx - 1, my, mx + 2, my + 1, lt(F.st.fab[0], 0.35), { kind: "mat" }); scatter(F, [[F.I.bench, [mx + 1, my + 0.5]], [F.I.bench, [mx + 1, my + 1.5]], [F.I.plant, [mx - 1.5, my + 0.5]]], { margin: 0 }); },
  lab: (F, mx, my) => { scatter(F, [[F.I.labTable, [mx + 0.5, my]], [F.I.console, [mx, my + 2]]], { margin: 0 }); },
  mats: (F, mx, my, b) => { F.rug(b[0] + 1, b[1] + 1, Math.min(b[2] - 1, b[0] + 6), Math.min(b[3] - 1, b[1] + 4), F.st.fab[F.num % F.st.fab.length], { kind: "mat" }); },
  beds: (F, mx, my) => { scatter(F, [[F.I.bed(F.st.fab[0]), [mx - 0.5, my]], [F.I.bedside, [mx + 0.5, my - 0.5]], [F.I.bed(F.st.fab[1] || F.st.fab[0]), [mx + 1.5, my]]], { margin: 0 }); },
};
bedroom.isl = ["play", "seat", "read", "green"]; gateRoom.isl = []; hotel.isl = ["seat", "green"]; officeRoom.isl = ["desk", "green", "seat"]; lab.isl = ["lab", "crates"]; shop.isl = ["shelf", "crates"]; cafe.isl = ["green"]; study.isl = ["read", "seat"]; rest.isl = ["seat", "green"]; arena.isl = []; club.isl = ["seat", "green", "play"];
music.isl = ["seat", "green"]; railway.isl = living.isl; anglers.isl = ["seat", "crates", "green"]; performer.isl = ["seat", "green", "read"]; badgeOffice.isl = ["seat", "green"]; apartments.isl = ["green", "seat"]; club.isl = ["seat", "green"]; unityTop.isl = []; gallery.isl = []; library.isl = []; parlour.isl = ["green", "seat"]; school.isl = []; market.isl = ["crates"]; dojo.isl = []; hideout.isl = ["crates"]; stockroom.isl = []; stonecutter.isl = ["crates", "seat"]; shipCabin.isl = ["crates", "seat"]; lostFound.isl = ["shelf", "crates"]; dreamLab.isl = ["lab"]; depot.isl = ["crates", "seat"]; atelier.isl = ["seat", "green"]; bakery.isl = ["dine", "green"]; quiz.isl = [];
const ROLES = { living, bedroom, gate: gateRoom, hotel, office: officeRoom, lab, shop, cafe, study, rest, arena, club };
const TOWN_STYLE = [[/Aspertia/, "aspertia"], [/Floccesy/, "floccesy"], [/Virbank/, "virbank"], [/Castelia|Unity/, "office"], [/Nimbasa/, "nimbasa"], [/Driftveil/, "driftveil"], [/Mistralton/, "mistralton"], [/Icirrus/, "icirrus"], [/Opelucid/, "opelucid"], [/Lacunosa/, "lacunosa"], [/Undella|Route13|Route18/, "beach"], [/Humilau/, "humilau"], [/Lentimas/, "lentimas"], [/Nacrene/, "nacrene"], [/Striaton/, "striaton"], [/Accumula/, "accumula"], [/Nuvema/, "nuvema"], [/VillageBridge/, "village"], [/Anville/, "anville"], [/BlackCity/, "black"], [/WhiteForest/, "white"], [/Route4/, "desert"], [/AbundantShrine/, "shrine"], [/League|VictoryRoad/, "league"], [/Lab/, "lab"], [/Route/, "cabin"]];
const styleKeyOf = (name) => (TOWN_STYLE.find(([re]) => re.test(name)) || [0, "aspertia"])[1];
// A furnished room by role: { style, role, doors, more(F) }.
function furnished(name, o = {}) {
  return {
    theme: { room: "arena", floor: "rHouse", wall: null },
    plan(p) { const F = startRoom(p, o.style || styleKeyOf(name), o.doors), role = typeof o.role === "function" ? o.role : ROLES[o.role || "living"]; if (o.before) o.before(F); role(F, o); if (o.more) o.more(F); const big = F.W >= 22; F.fill(o.islands || role.isl || ["green", "seat", "read"], big ? 4 : 2, 5, 4); },
  };
}
// Stand each [item, [x, y]] at the open place nearest that point.
function scatter(F, list, o = {}) { let n = 0; for (const [it, pref] of list) { if (!it) continue; const at = F.spot(it.w, it.h || 1, pref, { clear: true, ...o }); if (at && F.stand(at[0], at[1], it)) n++; } return n; }
const item = (w, d, o) => ({ w, d, ...o });
const X_ = { // one-off items
  block1: item(1, F_.block), block2: item(2, F_.block), carving: item(1, F_.carving, { tall: true }), workbench: item(3, F_.workbench), oven: item(3, F_.oven, { tall: true }), breads: item(2, F_.breads, { tall: true }), boat: item(3, F_.boat),
  washer: item(1, F_.washer), fan: item(1, F_.fan), mower: item(1, F_.mower), micro: item(1, F_.micro, { tall: true }), sand1: item(1, F_.sand), sand2: item(2, F_.sand), tire: item(1, F_.tire), trainTable: item(3, F_.trainTable, { h: 2 }), signal: item(1, F_.signal),
  globe: item(1, F_.globe), luggage: item(1, F_.luggage), signpost: item(1, F_.signpost), musicStand: item(1, F_.musicStand), guitar: item(1, F_.guitar), drums: item(2, F_.drums), speaker: item(1, F_.speaker, { tall: true }), bag: item(1, F_.bag), dummy: item(1, F_.dummy), weights: item(2, F_.weights),
  bones: item(1, F_.bones), files: item(1, F_.files, { tall: true }), files2: item(2, F_.files, { tall: true }), dreamer: item(1, F_.dreamer, { h: 2 }), mattress: item(1, F_.mattress, { h: 2 }),
  flag: (col) => item(1, (c, X, Y, W, st) => F_.flag(c, X, Y, W, st, col)), podium: (col) => item(1, (c, X, Y, W, st) => F_.podium(c, X, Y, W, st, col)), stall: (cols, aw) => item(3, F_.stall(cols, aw)),
  boxes: (n = 2) => item(n, F_.goods([[206, 170, 120], [190, 150, 100], [226, 196, 150], [176, 136, 90]]), { tall: true }),
};
const chips = (F, n, col) => F.art((c) => { for (let i = 0; i < n; i++) { const x = (F.L + 1 + hsh(i, 3, F.W) * (F.W - 2)) * S, y = (F.T + 2 + hsh(i, 5, F.H) * (F.H - 4)) * S; c.rect(x, y, 2 + (i % 3), 2, i & 1 ? lt(col, 0.2) : dk(col, 0.2)); c.p(x + 4, y + 3, lt(col, 0.35)); } }, 0.11);
// The Stonecutter of Village Bridge: blocks waiting to be cut, a half-finished figure, tools on the wall.
function stonecutter(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2;
  F.run([I.fireplace, null, X_.workbench, null, X_.block2, X_.block1], 1); F.run([I.bed(st.fab[0]), I.bedside, I.wardrobe, null, I.barrel2], -1);
  F.art((c) => { c.ellipse(8 * S, 12 * S, 80, 44, [200, 196, 186, 90]); c.ellipse(8 * S, 12 * S, 56, 28, [214, 210, 200, 90]); }, 0.1); chips(F, 60, [176, 172, 164]);
  scatter(F, [[X_.block2, [5, 10]], [X_.carving, [9, 11]], [X_.block1, [11, 14]], [X_.block2, [5, 15]], [X_.block1, [8, 17]], [X_.carving, [17, 10]], [I.table(2, (c, X, Y) => { c.rect(X + 4, Y, 9, 2, [150, 156, 170]); c.box(X + 18, Y - 3, 8, 7, [176, 172, 164], [100, 96, 90]); }), [12, 17]]]);
  F.dining([20, 16], 3); F.col([I.sacks, I.sacks, null, null, I.barrel, null, null, X_.block1], -1, F.T + 4); F.col([I.bookcase1, null, null, I.crates, null, null, null, I.plant], 1, F.T + 4);
  F.front([I.plant, I.crate, I.sacks, I.barrel]); F.decor(["tools", "window", "tools", "antlers", "picture", "window"]);
}
// The Sandwich Restaurant: the bread oven, racks of loaves, tables to eat at.
function bakery(F) {
  const I = F.I, st = F.st;
  F.run([X_.oven, X_.breads, null, X_.breads, null, I.counter(4)], 1); F.run([I.fridge, I.kitchen(3), null, I.sacks2, I.barrel], -1);
  F.art((c) => { for (let x = F.L; x <= F.R; x++) for (let y = F.T + 1; y <= F.T + 3; y++) T.check([236, 226, 206], [200, 110, 90], 1)(c, x * S, y * S, x, y); c.rect(F.L * S, (F.T + 4) * S - 2, F.W * S, 2, dk(st.wood, 0.3)); }, 0.05);
  let n = 0; for (const [fx, fy] of [[0.2, 0.42], [0.5, 0.42], [0.82, 0.42], [0.2, 0.72], [0.5, 0.75], [0.82, 0.72]]) { const at = F.spot(2, 2, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at && F.put(at[0], at[1], 2, 2, (c, X, Y, W, H) => { P.cloth(c, X, Y, W, H, [[250, 236, 200], [226, 240, 226], [250, 226, 226]][n % 3]); c.poly([[X + 10, Y + 14], [X + 22, Y + 14], [X + 16, Y + 8]], [226, 180, 110]); c.rect(X + 11, Y + 13, 10, 1, [110, 170, 90]); })) { n++; F.art((c) => { for (const x of [at[0] - 1, at[0] + 2]) if (F.isOpen(x, at[1]) && !F.person(x, at[1])) P.chair(c, x * S + (x < at[0] ? 3 : -3), at[1] * S + 8, dk(st.wood, 0.1)); }, 0.3); } }
  F.col([I.sacks, null, null, I.crates, null, null, null, I.barrel], -1, F.T + 5); F.col([I.bookcase1, null, null, null, I.flowers, null, null, null, I.crate], 1, F.T + 5);
  F.front([I.plant, I.flowers, I.barrel, I.coats]); F.decor(["pans", "window", "board", "shelf", "curtains", "clock"]);
}
// The Hip Waders Club: a boat hauled in for mending, rods and nets, the day's stories round the table.
function anglers(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([X_.boat, null, I.aquarium, null, I.lockers], 1); F.run([I.barrel2, I.crates2, null, I.aquarium, null, I.coats], -1);
  F.rug(Math.round(cx - 5), Math.round(cy - 2), Math.round(cx + 4), Math.round(cy + 2), [70, 140, 200], { kind: "round" }); F.art((c) => { fish(c, cx * S - 30, cy * S + 4, 2, [250, 170, 90], false); fish(c, cx * S + 34, cy * S + 18, 1.6, [240, 240, 250], true); }, 0.13);
  F.dining([F.L + 5, cy + 4], 3, { cloth: false }); lounge(F, [F.R - 5, cy + 1]);
  scatter(F, [[I.table(2, (c, X, Y) => { c.box(X + 4, Y - 2, 10, 7, [90, 150, 110], [50, 90, 60]); c.rect(X + 18, Y, 8, 2, [200, 70, 70]); c.ellipse(X + 26, Y + 3, 2, 2, [250, 220, 100]); }), [F.R - 6, F.T + 5]], [I.crate, [F.L + 4, F.T + 6]], [I.barrel, [F.L + 6, F.T + 5]]]);
  F.col([I.crates, null, null, I.barrel, null, null, null, I.lockers], -1, F.T + 4); F.col([I.bookcase1, null, null, null, I.plant, null, null, I.crate], 1, F.T + 4);
  F.front([I.umbrellas, I.plant, I.barrel, I.coats]); F.decor(["rods", "fishTrophy", "net", "window", "rods", "fishTrophy"]);
}
// A training house: mats on the floor, bags and dummies to hit, weights to lift.
function dojo(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([X_.weights, X_.bag, null, X_.dummy, null, I.lockers], 1); F.run([I.plant, I.trophies, null, X_.weights, I.cooler], -1);
  F.rug(F.L + 3, F.T + 4, Math.floor(cx) - 2, F.B - 4, [90, 150, 110], { kind: "mat" }); F.rug(Math.ceil(cx) + 1, F.T + 4, F.R - 3, F.B - 4, [200, 110, 90], { kind: "mat" });
  F.col([X_.bag, null, null, X_.dummy, null, null, null, I.bench], -1, F.T + 4); F.col([X_.dummy, null, null, null, X_.bag, null, null, I.crate], 1, F.T + 4);
  scatter(F, [[I.bench, [cx, F.B - 3]], [X_.dummy, [cx, F.T + 5]]]); F.front([I.plant, I.crate, I.plant, I.coats]);
  F.decor(["banner", "badges", "clock", "poster", "banner", "window"]);
}
// The former performer's house: a little stage under a curtain, the piano, old costumes and posters.
function performer(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, x0 = Math.round(cx) - 4;
  F.art((c) => { for (let x = x0; x < x0 + 8; x++) for (let y = F.T; y <= F.T + 3; y++) T.plank([214, 170, 110])(c, x * S, y * S, x, y); frame(c, x0 * S, F.T * S, 8 * S, 4 * S, [110, 70, 46], 2); c.rect(x0 * S, (F.T + 4) * S - 4, 8 * S, 4, [110, 70, 46]); c.ellipse(cx * S, (F.T + 2) * S, 40, 18, [255, 240, 170, 60]); }, 0.05);
  F.spans.push({ x0: x0 * S, x1: (x0 + 8) * S, tall: true }); F.p.paint(0.045, (c) => { Wl.curtain(c, x0 * S, (F.T - 2) * S + 1, 8 * S, 28, st.fab[0]); });
  F.stand(x0 + 5, F.T, I.piano); F.stand(x0, F.T, X_.speaker);
  F.run([I.mirror, I.coats, I.wardrobe, null], 1); F.run([I.kitchen(3), I.fridge, null, I.trophies], -1);
  F.dining([F.L + 5, cy + 3], 3); lounge(F, [F.R - 5, cy + 2]);
  F.col([I.coats, null, null, I.bookcase1, null, null, I.plant], -1, F.T + 4); F.col([X_.guitar, null, null, I.dresser1, null, null, null, I.lamp], 1, F.T + 4);
  for (let i = 0; i < 6; i++) F.flat([x0 + 1 + i * 1.3, F.T + 5 + (i & 1)], cushion(st.fab[i % 3]));
  F.front([I.plant, I.flowers, I.shoes, I.plant]); F.openRug(st.fab[1]); F.decor(["poster", "film", "picture", "poster", "film"]);
}
// A house of music: stands, instruments, chairs for the players.
function music(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.k.fixtures((s) => s.w === 5 ? (s.x < cx ? (c, X, Y, W, H) => { c.rect(X + 3, Y + H - 2, W - 4, 3, [0, 0, 0, 56]); c.poly([[X + 2, Y - 6], [X + W - 2, Y - 6], [X + W - 2, Y + 12], [X + W - 26, Y + 26], [X + 2, Y + 26]], INK); c.poly([[X + 4, Y - 4], [X + W - 4, Y - 4], [X + W - 4, Y + 11], [X + W - 27, Y + 24], [X + 4, Y + 24]], [44, 40, 48]); c.rect(X + 5, Y - 3, W - 10, 2, [96, 90, 106]); c.rect(X + 6, Y + 18, 36, 6, WHITE); for (let i = 8; i < 42; i += 4) c.rect(X + i, Y + 18, 1, 4, INK); c.line(X + W - 30, Y + 2, X + W - 8, Y - 14, [96, 90, 106], 2); c.box(X + 16, Y + 8, 14, 8, WHITE, [150, 150, 160]); }
    : (c, X, Y, W, H) => { c.ellipse(X + W / 2, Y + H - 3, W / 2 - 4, 4, [0, 0, 0, 60]); F_.drums(c, X + 22, Y + 12, 36); for (const [dx, col] of [[8, [110, 190, 226]], [W - 22, [250, 200, 90]]]) { c.box(X + dx, Y + 8, 14, 16, col, INK); c.ellipse(X + dx + 7, Y + 8, 7, 3, WHITE); } c.rect(X + 4, Y - 8, 1, 30, [150, 150, 160]); c.ellipse(X + 5, Y - 8, 7, 2, GOLD); c.rect(X + W - 5, Y - 6, 1, 28, [150, 150, 160]); c.ellipse(X + W - 5, Y - 6, 7, 2, GOLD); }) : null);
  F.run([X_.speaker, null, I.bookcase, null, X_.guitar, X_.guitar], 1); F.run([X_.speaker, null, I.piano, null, I.sideboard], -1);
  F.rug(Math.round(cx - 5), Math.round(cy - 1), Math.round(cx + 4), Math.round(cy + 3), st.fab[0], { kind: "round" });
  scatter(F, [[X_.musicStand, [cx - 4, cy]], [X_.musicStand, [cx + 4, cy]], [X_.musicStand, [cx - 2, cy + 3]], [X_.musicStand, [cx + 2, cy + 3]], [o.drums ? X_.drums : null, [F.R - 5, F.T + 6]], [I.sofa(3), [F.L + 5, F.B - 4]], [I.sofa(3, st.fab[1]), [F.R - 5, F.B - 4]]], { margin: 0 });
  F.art((c) => { for (let i = 0; i < 5; i++) { const x = Math.round(cx - 4 + i * 2), y = Math.round(cy + 1 + (i & 1)); if (F.isOpen(x, y) && !F.person(x, y)) P.chair(c, x * S, y * S, dk(st.wood, 0.1)); } }, 0.3);
  F.col([I.crate, null, null, X_.guitar, null, null, null, I.plant], -1, F.T + 5); F.col([X_.speaker, null, null, null, I.bookcase1, null, null, I.flowers], 1, F.T + 5);
  F.front([I.plant, I.flowers, I.coats, I.plant]); F.decor(["poster", "curtains", "film", "clock", "poster", "curtains"]);
}
// A railway family's house: the model railway takes up the middle of the room.
function railway(F) {
  const st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, at = F.spot(3, 2, [cx - 4, cy + 1], { clear: true });
  if (at) { F.rug(at[0] - 1, at[1] - 1, at[0] + 3, at[1] + 2, [70, 110, 80], { kind: "check" }); F.stand(at[0], at[1], X_.trainTable); }
  scatter(F, [[X_.signal, [F.L + 2, F.T + 5]], [X_.luggage, [F.R - 2, F.B - 3]]], { margin: 0 });
  living(F, { wall: ["rail", "curtains", "timetable", "clock", "rail", "curtains"] });
}
// Anville's Lost and Found: shelves of everything left on the trains.
function lostFound(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, stuff = [[200, 70, 70], [70, 110, 190], [240, 200, 90], [110, 170, 120], [150, 100, 60], [226, 226, 236]];
  F.run([I.goods(stuff), I.goods(stuff), I.lockers, null, I.goods(stuff), null, I.filing, I.desk], 1); F.run([I.goods(stuff), I.goods(stuff), null, I.lockers, I.umbrellas, I.umbrellas], -1);
  const a = F.p.people[0]; if (a) for (const [x, n] of [[a.x + 1, 4], [a.x - 4, 3]]) F.stand(x, a.y, I.counter(n));
  for (const [fx, fy] of [[0.25, 0.55], [0.72, 0.5], [0.3, 0.78], [0.72, 0.76]]) { const at = F.spot(3, 1, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at) F.stand(at[0], at[1], I.goods(stuff, 3)); }
  scatter(F, [[X_.luggage, [cx + 3, cy + 1]], [X_.luggage, [cx + 4, cy + 1]], [I.crate2, [cx - 3, F.B - 3]], [I.bench3, [cx + 5, F.B - 2]]], { margin: 0 });
  F.col([I.umbrellas, I.coats, null, null, X_.luggage, null, null, I.crates], -1, F.T + 4); F.col([I.coats, null, null, I.crates, null, null, null, X_.luggage], 1, F.T + 4);
  F.front([I.plant, I.umbrellas, I.plant, X_.signpost]); F.openRug(st.fab[0], { kind: "mat", maxW: 5, maxH: 2 }); F.decor(["board", "clock", "timetable", "rail", "board"]);
}
// Castelia's Badge Office: the eight Badges under glass, the clerk's desk.
function badgeOffice(F) {
  const I = F.I, st = F.st, a = F.p.people[0], cx = (F.L + F.R + 1) / 2;
  if (a) { for (const [x, n] of [[a.x - 4, 3], [a.x + 2, 3]]) F.stand(x, a.y, I.counter(n)); F.rug(a.x - 2, a.y + 1, a.x + 2, a.y + 4, [150, 50, 64], { trim: GOLD }); }
  F.run([I.trophies, I.trophies, null, I.filing, I.filing], 1); F.run([I.plant, I.trophies, I.trophies, null, I.bookcase], -1);
  F.art((c) => { const X = F.exit.x * S - 16, y0 = (F.T + 10) * S, y1 = (F.B + 1) * S; c.rect(X, y0, 48, y1 - y0, [150, 50, 64]); c.rect(X + 2, y0, 2, y1 - y0, GOLD); c.rect(X + 44, y0, 2, y1 - y0, GOLD); }, 0.1);
  scatter(F, [[I.desk, [F.L + 5, F.T + 11]], [I.desk, [F.R - 5, F.T + 11]], [I.sofa(3), [F.L + 5, F.B - 4]], [I.sofa(3, st.fab[1]), [F.R - 5, F.B - 4]], [X_.flag([200, 60, 60]), [cx - 3, F.T + 3]], [X_.flag([60, 110, 200]), [cx + 3, F.T + 3]]]);
  F.col([I.filing, null, null, I.plant, null, null, null, I.cooler], -1, F.T + 4); F.col([I.bookcase1, null, null, null, I.plant, null, null, I.filing], 1, F.T + 4);
  F.front([I.plant, I.plant, I.umbrellas]); F.decor(["badges", "clock", "badges", "map", "badges"], { step: 60 });
}
// The ferry's cabin: bunks, sea chests, the chart table.
function shipCabin(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.run([I.bed([70, 110, 190]), I.bedside, I.bed([70, 110, 190]), null, I.lockers], 1); F.run([I.barrel2, I.crates2, null, I.sideboard, I.clock], -1);
  F.rug(Math.round(cx - 4), Math.round(cy), Math.round(cx + 3), Math.round(cy + 3), [60, 80, 130], { trim: GOLD }); F.art((c) => { const x = cx * S, y = (cy + 2) * S; c.ellipse(x, y, 14, 14, GOLD, 2); for (let k2 = 0; k2 < 8; k2++) c.line(x, y, x + Math.cos(k2 * Math.PI / 4) * 18, y + Math.sin(k2 * Math.PI / 4) * 18, GOLD); c.ellipse(x, y, 4, 4, [60, 80, 130]); }, 0.13);
  F.dining([F.L + 5, cy - 2], 3, { cloth: false, draw: (c, X, Y, W, H) => { P.table(c, X, Y, W, H, st.wood); c.box(X + 6, Y + 5, 26, 13, [236, 226, 190], [150, 130, 90]); c.line(X + 9, Y + 14, X + 18, Y + 8, RED); c.line(X + 18, Y + 8, X + 28, Y + 12, RED); c.ellipse(X + 38, Y + 10, 3, 3, GOLD); } });
  scatter(F, [[I.sofa(3), [F.R - 5, cy - 2]], [I.crates, [F.L + 3, F.B - 4]], [I.barrel, [F.L + 5, F.B - 3]], [I.crate2, [F.R - 4, F.B - 4]]], { margin: 0 });
  F.col([I.crates, null, null, I.barrel, null, null, null, I.bookcase1], -1, F.T + 4); F.col([I.coats, null, null, null, I.crate, null, null, I.barrel], 1, F.T + 4);
  F.front([I.barrel, I.crate, I.plant]); F.decor(["lifebuoy", "anchor", "map", "lifebuoy"], { step: 90 });
}
// The crew's secret lot under Castelia: crates, a sofa someone threw away, speakers and spray paint.
function hideout(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.art((c) => { for (let i = 0; i < 9; i++) { const x = (F.L + 1 + hsh(i, 1, 7) * (F.W - 2)) * S, y = (F.T + 3 + hsh(i, 2, 7) * (F.H - 5)) * S; c.ellipse(x, y, 10 + hsh(i, 3, 7) * 14, 4 + hsh(i, 4, 7) * 5, [40, 60, 70, 60]); } for (const [x, col] of [[cx - 6, [240, 110, 220]], [cx + 5, [130, 240, 120]]]) { c.ellipse(x * S, (cy + 2) * S, 26, 16, A(col, 40)); c.ellipse(x * S, (cy + 2) * S, 26, 16, col, 2); star(c, x * S, (cy + 2) * S, 9, A(col, 200)); } }, 0.1);
  F.run([X_.speaker, X_.speaker, null, I.crates2, null, I.barrel2, I.barrel], 1); F.run([I.lockers, null, X_.speaker, X_.speaker, null, I.crates2], -1);
  scatter(F, [[I.sofa(3, [110, 130, 110]), [F.L + 5, cy + 4]], [I.table(2, (c, X, Y) => { c.rect(X + 5, Y - 3, 4, 6, [226, 90, 90]); c.rect(X + 11, Y - 2, 4, 5, [90, 150, 226]); c.box(X + 18, Y, 9, 5, [50, 54, 70], INK); }), [F.L + 5, cy + 6]], [X_.tire, [F.R - 4, cy + 4]], [X_.tire, [F.R - 6, cy + 5]], [I.crate2, [cx + 6, F.B - 3]], [X_.mattress, [F.R - 3, F.T + 5]], [X_.mattress, [F.R - 5, F.T + 5]], [I.barrel, [F.L + 4, F.T + 5]]], { margin: 0 });
  F.col([I.crates, I.barrel, null, null, I.crate, null, null, X_.tire], -1, F.T + 4); F.col([I.barrel, null, null, I.crates, null, null, null, I.barrel], 1, F.T + 8);
  F.front([I.barrel, I.crates, I.crate, I.barrel]); F.decor(["graffiti", "graffiti", "lamp", "graffiti", "graffiti"], { step: 50 });
}
// Driftveil Market: a stall behind each seller, crates of stock, bunting overhead.
function market(F) {
  const I = F.I, st = F.st, p = F.p, wares = [[[110, 180, 100], [70, 150, 84], [200, 220, 120]], [[240, 240, 250], [190, 220, 250], [250, 236, 200]], [[190, 130, 220], [240, 160, 200], [150, 110, 200]], [[240, 190, 80], [200, 110, 70], [226, 80, 80]]], awn = [[90, 160, 100], [80, 140, 220], [170, 110, 200], [226, 140, 60]];
  F.art((c) => { const X = F.exit.x * S - 24, y0 = (F.T + 7) * S; for (let y = y0; y < (F.B + 1) * S; y += S) for (let x = X; x < X + 64; x += S) T.cobble([190, 170, 150])(c, x, y, x / S, y / S); c.rect(X - 2, y0, 2, (F.B + 1) * S - y0, [130, 110, 96]); c.rect(X + 64, y0, 2, (F.B + 1) * S - y0, [130, 110, 96]); c.rect(F.L * S, y0 - 2, F.W * S, 2, [130, 110, 96]); }, 0.05);
  p.people.filter((q) => q.y < F.T + 8).sort((a, b) => a.x - b.x).forEach((q, i) => { F.stand(q.x - 1, q.y - 1, X_.stall(wares[i % 4], awn[i % 4])); F.stand(q.x + 2, q.y - 1, i & 1 ? I.crates : I.sacks); F.stand(q.x - 2, q.y, i & 1 ? I.barrel : I.crate); });
  F.run([I.crates2, I.barrel, null, null, null, I.sacks2, null, null, null, I.crate2, null, null, null, I.barrel2, null, null, null, I.crates2], 1);
  scatter(F, [[X_.stall(wares[3], awn[0]), [F.L + 4, F.T + 13]], [X_.stall(wares[0], awn[3]), [F.R - 4, F.T + 13]], [I.bench3, [F.L + 5, F.B - 2]], [I.bench3, [F.R - 5, F.B - 2]], [I.crates2, [F.L + 8, F.T + 11]], [I.barrel2, [F.R - 8, F.T + 11]]], { margin: 0 });
  F.col([I.sacks, I.sacks, null, null, I.crates, null, null, null, I.barrel], -1, F.T + 9); F.col([I.crates, null, null, I.barrel, I.barrel, null, null, null, I.sacks], 1, F.T + 9);
  F.front([I.crate, I.barrel, I.plant, I.sacks]); F.decor(["flags", "flags", "flags"], { step: 44 });
}
// Mall Nine's stockroom: racks of boxed goods, and the appliances a Rotom might like.
function stockroom(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2;
  F.art((c) => { hazard(c, F.L + 1, F.T + 3, F.R - 1, F.B - 2); }, 0.1);
  F.run([I.fridge, X_.washer, X_.micro, X_.fan, X_.mower, null, X_.boxes(2), X_.boxes(2)], 1); F.run([X_.boxes(2), X_.boxes(2), null, I.lockers, null, I.tv], -1);
  for (const fy of [0.38, 0.58, 0.78]) for (const fx of [0.22, 0.5, 0.78]) { const at = F.spot(3, 1, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at) F.stand(at[0], at[1], X_.boxes(3)); }
  F.col([I.crates, I.crates, null, null, I.crate, null, null, null, I.crates], -1, F.T + 4); F.col([I.crate, null, null, I.crates, I.crates, null, null, null, I.barrel], 1, F.T + 4);
  scatter(F, [[I.crate2, [cx - 4, F.B - 2]], [I.crates2, [cx + 5, F.B - 2]]], { margin: 0 }); F.front([I.crates, I.crate, I.crates, I.barrel]);
  F.decor(["board", "clock", "calendar", "lamp"], { step: 70 });
}
// The Pep Quiz House: the quiz master's stage, buzzers, and benches for whoever is watching.
function quiz(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, x0 = F.L + 3, x1 = F.R - 3;
  F.art((c) => { for (let x = x0; x <= x1; x++) for (let y = F.T + 1; y <= F.T + 4; y++) T.check([250, 226, 120], [240, 150, 90], 1)(c, x * S, y * S, x, y); frame(c, x0 * S, (F.T + 1) * S, (x1 - x0 + 1) * S, 4 * S, [150, 80, 50], 2); for (const fx of [0.25, 0.5, 0.75]) { const x = (F.L + F.W * fx) * S; c.ellipse(x, (F.T + 3) * S, 26, 14, [255, 255, 220, 90]); } }, 0.05);
  F.run([I.plant, X_.speaker, null, X_.podium([226, 80, 80]), null, null, X_.podium([250, 210, 90])], 1); F.run([I.plant, X_.speaker, null, X_.podium([80, 130, 226]), null, null, X_.podium([110, 200, 120])], -1);
  for (const y of [cy + 2, cy + 5]) for (const x of [F.L + 3, F.L + 8, F.R - 10, F.R - 5]) F.spot(3, 1, [x + 1.5, y + 0.5], { margin: 0, clear: true }) && F.stand(x, Math.round(y), I.bench3);
  F.col([I.fireplace ? I.bookcase1 : null, null, null, I.trophies ? I.plant : null], -1, F.T + 6); F.col([I.cooler, null, null, null, I.plant], 1, F.T + 6);
  F.front([I.plant, I.flowers, I.plant]); F.decor(["ox", "flags", "screen", "flags", "ox"], { step: 60 });
}
// Fennel's labs: dream machines to lie in, the mist they gather.
function dreamLab(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.art((c) => { for (let i = 0; i < 12; i++) { const x = (F.L + 2 + hsh(i, 2, 3) * (F.W - 4)) * S, y = (F.T + 3 + hsh(i, 4, 3) * (F.H - 6)) * S; c.ellipse(x, y, 18 + hsh(i, 6, 3) * 16, 8 + hsh(i, 8, 3) * 6, [250, 170, 220, 34]); } }, 0.1);
  F.run([I.machine3, X_.dreamer, I.console, X_.dreamer, null, I.tank], 1); F.run([I.bookcase, I.filing, null, I.desk, null, I.tank, I.tank], -1);
  F.rug(Math.round(cx - 3), Math.round(cy), Math.round(cx + 2), Math.round(cy + 2), [250, 170, 200], { kind: "round" });
  for (const [fx, fy] of [[0.25, 0.5], [0.75, 0.55], [0.3, 0.8], [0.72, 0.8]]) { const at = F.spot(3, 1, [F.L + F.W * fx, F.T + F.H * fy], { clear: true }); if (at) F.stand(at[0], at[1], I.labTable); }
  F.col([I.console, null, null, X_.dreamer, null, null, I.crates], -1, F.T + 4); F.col([I.tank, null, null, I.filing, null, null, null, I.plant], 1, F.T + 4);
  F.front([I.plant, I.crates, I.plant]); F.decor(["screen", "whiteboard", "window", "shelf", "clock", "screen"], { step: 50 });
}
// Nimbasa's apartments: two flats side by side off one hallway.
function apartments(F) {
  const I = F.I, st = F.st, p = F.p, cx = F.exit.x, cy = (F.T + F.B + 1) / 2;
  for (let y = F.T; y <= F.T + 6; y++) F.put(cx, y, 1, 1, (c, X, Y) => { c.rect(X + 3, Y - 6, 10, 22, [226, 214, 196]); c.rect(X + 3, Y - 6, 2, 22, WHITE); c.rect(X + 11, Y - 6, 2, 22, [176, 160, 140]); if (y === F.T + 6) { c.rect(X + 3, Y + 10, 10, 6, [150, 110, 90]); c.rect(X + 3, Y + 10, 10, 1, [200, 160, 130]); } });
  F.spans.push({ x0: cx * S - 2, x1: cx * S + 18, tall: true });
  F.art((c) => { const X = cx * S - 16; c.rect(X, (F.T + 8) * S, 48, (F.B - F.T - 7) * S, st.fab[2]); c.rect(X + 2, (F.T + 8) * S, 2, (F.B - F.T - 7) * S, WHITE); c.rect(X + 44, (F.T + 8) * S, 2, (F.B - F.T - 7) * S, WHITE); for (const d of [-1, 1]) { const x0 = d < 0 ? F.L + 1 : cx + 2, x1 = d < 0 ? cx - 2 : F.R - 1; for (let x = x0; x <= x1; x++) for (let y = F.T + 1; y <= F.T + 6; y++) T.carpet(d < 0 ? lt(st.fab[0], 0.45) : lt(st.fab[1], 0.45))(c, x * S, y * S, x, y); } }, 0.05);
  F.run([I.kitchen(3), I.fridge, null, I.bookcase], 1); F.run([I.wardrobe, null, I.kitchen(3), I.fridge], -1);
  F.run([I.tv, I.plant], -1, cx - 1); F.run([I.tv, I.plant], 1, cx + 1);
  scatter(F, [[I.sofaBack(3), [cx - 2.5, F.T + 4.5]], [I.sofaBack(3, st.fab[1]), [cx + 3.5, F.T + 4.5]]], { margin: 0 });
  F.dining([F.L + 5, cy + 3], 3, { rugCol: st.fab[0] }); F.dining([F.R - 5, cy + 3], 3, { rugCol: st.fab[1], col: st.fab[1] });
  F.col([I.bed(st.fab[0]), null, I.dresser1, null, null, null, I.bookcase1, null, null, I.plant], -1, F.T + 3); F.col([I.bed(st.fab[1]), null, I.dresser1, null, null, null, I.lamp, null, null, I.flowers], 1, F.T + 3);
  F.front([I.plant, I.shoes, I.umbrellas, I.plant]); F.decor(HOME_WALL);
}
// A flat-pack depot: cargo waiting for the next plane, the pilots' corner.
function depot(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.art((c) => hazard(c, F.L + 1, F.T + 3, Math.round(cx) - 1, F.T + 9), 0.1);
  F.run([I.crates2, I.crates2, I.crate, null, I.barrel2, null, I.lockers], 1); F.run([I.plant, I.trophies, null, I.desk, null, I.filing, I.cooler], -1);
  scatter(F, [[I.crates2, [F.L + 4, F.T + 5]], [I.crate2, [F.L + 8, F.T + 6]], [I.crates2, [F.L + 5, F.T + 9]], [I.sofa(3), [F.R - 6, cy + 2]], [I.sofa(3, st.fab[1]), [F.R - 6, cy + 6]], [I.table(2), [F.R - 6, cy + 4]], [X_.luggage, [cx, F.B - 3]]], { margin: 0 });
  F.dining([F.L + 6, F.B - 4], 3, { cloth: false });
  F.col([I.crates, I.barrel, null, null, null, null, null, null, I.crate], -1, F.T + 4); F.col([I.bookcase1, null, null, null, I.plant, null, null, null, X_.luggage], 1, F.T + 4);
  F.front([I.plant, I.crates, I.plant, I.umbrellas]); F.openRug(st.fab[0], { maxW: 6, maxH: 3 }); F.decor(["map", "timetable", "clock", "poster", "window", "map"]);
}
// Burgh's old warehouse: easels, canvases, pots of paint.
function atelier(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, paints = [[226, 70, 110], [70, 140, 226], [240, 196, 60], [90, 190, 110], [236, 130, 60]];
  F.run([I.easel(paints[0]), null, I.easel(paints[1]), I.crates2, null, I.bookcase], 1); F.run([I.plant, I.easel(paints[3]), null, I.sideboard, I.crate], -1);
  F.art((c) => { for (let i = 0; i < 7; i++) { const x = Math.round(F.L + 2 + hsh(i, 1, 9) * (F.W - 4)), y = Math.round(F.T + 4 + hsh(i, 2, 9) * (F.H - 7)); if (F.isOpen(x, y) && !F.person(x, y)) paintCan(c, x, y, paints[i % 5]); } for (let i = 0; i < 10; i++) c.ellipse((F.L + 1 + hsh(i, 5, 9) * (F.W - 2)) * S, (F.T + 3 + hsh(i, 6, 9) * (F.H - 5)) * S, 3 + hsh(i, 7, 9) * 5, 2 + hsh(i, 8, 9) * 3, A(paints[i % 5], 120)); }, 0.11);
  scatter(F, [[I.easel(paints[2]), [cx - 4, cy]], [I.easel(paints[4]), [cx + 4, cy + 2]], [I.table(2, (c, X, Y) => { for (let i = 0; i < 4; i++) c.box(X + 3 + i * 6, Y - 3, 5, 6, paints[i], dk(paints[i], 0.4)); }), [cx - 5, cy + 3]]], { margin: 0 });
  lounge(F, [F.R - 5, cy + 3]);
  F.col([I.crates, null, null, I.easel(paints[1]), null, null, I.barrel], -1, F.T + 4); F.col([I.bookcase1, null, null, I.crate, null, null, I.plant], 1, F.T + 4);
  F.front([I.crate, I.plant, I.crates]); F.decor(["picture", "window", "picture", "picture", "window"], { step: 30 });
}
// The museum's library and Lenora's study above it: every fixture is a shelf to read.
function library(F, o = {}) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  signsAs(F, (s, n) => o.upstairs ? (s.y >= F.T + 6 ? (c, X, Y, W, s2) => F_.bones(c, X, Y, W, s2) : (c, X, Y, W, s2) => F_.files(c, X, Y, W, s2)) : (c, X, Y, W, s2) => F_.bookcase(c, X, Y, W, { wood: [[124, 84, 54], [96, 70, 56], [150, 104, 66]][(s.y + n) % 3] }));
  F.rug(F.exit.x - 1, F.T + (o.upstairs ? 6 : 8), F.exit.x + 1, F.B - 1, [150, 50, 64], { trim: GOLD });
  scatter(F, [[I.study, [F.L + 4, F.B - 3]], [I.table(2, (c, X, Y) => { c.box(X + 4, Y - 1, 9, 7, WHITE, [150, 150, 160]); c.box(X + 17, Y, 9, 7, [250, 244, 220], [150, 150, 160]); }), [F.R - 4, F.B - 3]], [I.armchair(), [F.L + 2, F.B - 5]], [X_.globe, [F.R - 2, F.B - 5]], [o.upstairs ? I.desk : null, [cx + 4, F.T + 6]]], { margin: 0 });
  F.col([null, null, null, null, null, null, null, I.plant], -1, F.T + 3); F.front([I.plant, I.flowers, I.crate]);
  for (const [dx, dy] of [[-4, 4], [5, 3]]) F.flat([cx + dx, cy + dy], (c, X, Y) => bookPile(c, X, Y));
  F.decor(o.upstairs ? ["map", "lamp", "picture", "lamp"] : ["picture", "lamp", "clock", "lamp", "picture"], { step: 60 });
}
// A gallery of young artists: paintings on easels, small sculptures on plinths, a bench to sit and look.
function gallery(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, cols = [[226, 70, 110], [70, 140, 226], [240, 196, 60], [90, 190, 110], [150, 96, 180], [236, 130, 60], [40, 40, 54], [240, 240, 244]];
  signsAs(F, (s, n) => s.y <= F.T + 1 ? (c, X, Y, W, s2) => F_.easel(c, X, Y, W, s2, cols[n % 8]) : F_.plinth((c, x, y) => { const k2 = cols[(n * 3) % 8]; if (n & 1) { c.ellipse(x, y - 7, 4, 6, dk(k2, 0.3)); c.ellipse(x - 1, y - 8, 3, 5, k2); } else { c.poly([[x - 5, y], [x, y - 13], [x + 5, y]], dk(k2, 0.2)); c.poly([[x - 3, y], [x, y - 9], [x + 1, y]], lt(k2, 0.3)); } }));
  F.rug(F.exit.x - 1, F.T + 3, F.exit.x + 1, F.B - 1, [150, 50, 64], { trim: GOLD });
  scatter(F, [[I.bench3, [cx - 4, cy - 1]], [I.bench3, [cx + 4, cy + 3]], [X_.signpost, [F.exit.x + 3, F.B - 2]]], { margin: 0 });
  F.run([I.plant], 1); F.run([I.plant], -1); F.front([I.plant, I.plant]);
  F.decor(["picture", "lamp", "picture", "lamp"], { step: 30 });
}
// A fortune-teller's parlour: the round table and its crystal ball, cushions, heavy curtains.
function parlour(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2;
  F.rug(Math.round(cx - 4), Math.round(cy - 2), Math.round(cx + 3), Math.round(cy + 2), st.fab[0], { kind: "round", trim: GOLD });
  const at = F.spot(2, 2, [cx - 2, cy], { clear: true }); if (at) F.put(at[0], at[1], 2, 2, (c, X, Y, W, H) => { roundTable(lt(st.fab[0], 0.3))(c, X, Y, W, H); glow(c, X + 16, Y + 6, 12, [190, 150, 250], 30); c.ellipse(X + 16, Y + 7, 5, 5, [150, 110, 220]); c.ellipse(X + 15, Y + 6, 3, 3, [214, 190, 250]); c.p(X + 14, Y + 5, WHITE); }, { rows: 1 });
  F.run([I.bookcase, I.sofa(2), null, I.sideboard], 1); F.run([I.plant, I.clock, I.mirror], -1);
  for (const [dx, dy, i] of [[-3, 1, 0], [2, 1, 1], [0, 3, 2], [-4, -1, 1], [3, -2, 2]]) F.flat([cx + dx, cy + dy], cushion(st.fab[i]));
  F.col([I.lamp, null, null, I.armchair(), null, null, I.flowers], -1, F.T + 4); F.col([I.bookcase1, null, null, I.lamp, null, null, I.armchair(st.fab[2])], 1, F.T + 5);
  F.front([I.plant, I.flowers, I.plant]); F.decor(["stage", "lamp", "picture", "lamp"], { step: 70 });
}
// The top of Unity Tower: flags of every land round a great map on the floor.
function unityTop(F) {
  const I = F.I, st = F.st, cx = (F.L + F.R + 1) / 2, cy = (F.T + F.B + 1) / 2, cols = [[226, 80, 80], [80, 130, 226], [110, 200, 120], [250, 210, 90], [236, 140, 200], [240, 240, 250], [240, 150, 70], [150, 96, 180]];
  F.art((c) => { const x = cx * S, y = cy * S + 8; c.ellipse(x, y, 76, 50, GOLD); c.ellipse(x, y, 73, 47, [70, 130, 210]); for (const [dx, dy, rx, ry] of [[-34, -12, 20, 13], [-20, 16, 11, 14], [16, -16, 24, 12], [34, 12, 15, 11], [4, 24, 10, 6]]) c.ellipse(x + dx, y + dy, rx, ry, [120, 190, 120]); c.ellipse(x, y, 73, 47, WHITE, 1); for (let a = 0; a < 6; a++) c.line(x, y - 47, x + Math.sin(a) * 0, y + 47, [255, 255, 255, 40]); }, 0.1);
  signsAs(F, () => (c, X, Y, W, s2) => F_.globe(c, X, Y, W, s2), [[6, 3]]);
  let i = 0; for (let x = F.L; x <= F.R; x += 2) F.stand(x, F.T, X_.flag(cols[i++ % 8])); for (const y of [F.T + 4, F.T + 7, F.T + 10]) { F.stand(F.L, y, X_.flag(cols[i++ % 8])); F.stand(F.R, y, X_.flag(cols[i++ % 8])); }
  scatter(F, [[I.bench3, [cx - 6, F.B - 2]], [I.bench3, [cx + 6, F.B - 2]]], { margin: 0 }); F.front([I.plant, I.plant]);
  F.decor(["window", "window", "window"], { step: 40 });
}
// The Trainers' School in Striaton: the blackboard, the desks, shelves of textbooks.
function school(F) {
  const I = F.I, st = F.st;
  F.k.fixtures((s) => s.w === 5 ? (c, X, Y, W, H) => { c.rect(X + 4, Y + H - 2, W - 6, 3, [0, 0, 0, 56]); c.box(X, Y - 10, W, H + 2, [50, 100, 76], [130, 96, 60]); for (let i = 0; i < 4; i++) c.rect(X + 8 + i * 4, Y - 4 + i * 5, 40 - i * 6, 1, [226, 240, 230]); c.ellipse(X + W - 16, Y + 6, 6, 6, [226, 240, 230], 1); c.rect(X, Y + H - 9, W, 3, [226, 220, 200]); c.rect(X + 6, Y + H - 6, 3, 6, [130, 96, 60]); c.rect(X + W - 9, Y + H - 6, 3, 6, [130, 96, 60]); c.rect(X + 10, Y + H - 9, 5, 2, WHITE); }
    : s.w === 3 ? (c, X, Y, W, H) => { c.rect(X, Y, W, H, [0, 0, 0, 0]); P.table(c, X, Y - 2, W, s.full ? H : S + 2, [200, 160, 110]); c.box(X + 6, Y + 2, 10, 7, WHITE, [150, 150, 160]); c.box(X + 28, Y + 3, 10, 7, WHITE, [150, 150, 160]); c.rect(X + 20, Y + 4, 5, 2, [226, 90, 90]); if (!s.full) P.bookcase(c, X, Y + 6, S, H - 6); }
      : s.w === 1 && s.h === 2 ? (c, X, Y, W, H) => P.bookcase(c, X, Y - 10, W, H + 9) : null);
  F.art((c) => { for (const s of F.k.solids) if (s.w === 3) for (const dx of [0, 2]) if (F.isOpen(s.x + dx, s.y + s.h) && !F.person(s.x + dx, s.y + s.h)) P.chair(c, (s.x + dx) * S, (s.y + s.h) * S - 2, [150, 110, 76]); }, 0.3);
  F.run([I.bookcase3, I.bookcase, null, I.study, null, X_.globe], 1); F.run([I.plant], -1);
  F.rug(F.exit.x - 2, F.T + 16, F.exit.x + 2, F.B - 1, [90, 150, 110]);
  scatter(F, [[I.desk, [F.L + 12, F.T + 8]], [I.bookcase, [F.L + 11, F.T + 15]], [I.bench3, [F.R - 4, F.B - 3]], [I.bench3, [F.L + 4, F.B - 3]]], { margin: 0 });
  F.col([null, null, null, null, null, I.plant, null, null, null, null, null, I.bookcase1], -1, F.T + 3); F.col([I.bookcase1, I.bookcase1, null, null, null, I.plant, null, null, null, null, I.crate], 1, F.T + 5);
  F.front([I.plant, I.umbrellas, I.plant, I.coats]); F.decor(["map", "clock", "poster", "calendar", "picture"], { step: 44, skip: [{ x0: 17 * S, x1: 24 * S }] });
}
// Fixtures that are a PC to read: a desk with the machine on it.
const pcFix = (c, X, Y, W, st) => { const w = st.wood; c.rect(X + 2, Y + 14, 13, 2, [0, 0, 0, 56]); c.box(X, Y + 3, S, 12, w, dk(w, 0.5)); c.rect(X + 1, Y + 4, 14, 2, lt(w, 0.25)); c.box(X + 2, Y - 9, 12, 11, [200, 206, 220], [80, 86, 104]); c.rect(X + 4, Y - 7, 8, 6, [70, 160, 220]); c.rect(X + 5, Y - 6, 3, 1, [190, 226, 250]); c.rect(X + 4, Y + 7, 8, 2, [226, 226, 236]); };
const goldBin = (c, X, Y) => { c.ellipse(X + 8, Y + 13, 6, 2, [0, 0, 0, 60]); c.box(X + 3, Y + 1, 10, 13, GOLD, dk(GOLD, 0.5)); c.rect(X + 2, Y, 12, 3, lt(GOLD, 0.4)); c.rect(X + 5, Y + 4, 1, 8, lt(GOLD, 0.5)); star(c, X + 9, Y + 8, 3, WHITE); };
const infoBoard = (hue) => (c, X, Y) => { c.rect(X + 3, Y + 13, 11, 2, [0, 0, 0, 50]); c.rect(X + 3, Y + 4, 2, 11, [110, 116, 136]); c.rect(X + 11, Y + 4, 2, 11, [110, 116, 136]); c.box(X, Y - 12, S, 18, WHITE, dk(hue, 0.3)); c.rect(X + 1, Y - 11, 14, 4, hue); c.ellipse(X + 8, Y - 2, 5, 3, lt(hue, 0.4)); c.rect(X + 3, Y + 3, 10, 1, [110, 116, 136]); };

const hotelStyle = (carpet, wall, fab) => (r) => ({ floor: T.carpet(jit(carpet, r, 8)), wall: paper(wall, { base: [96, 62, 44], rail: GOLD, wain: [130, 86, 60] }), wood: [110, 70, 46], fab, trim: GOLD, counter: [120, 76, 50], counterTop: [236, 214, 170], mat: fab[0] });
STYLES.castelia = (r) => ({ floor: r < 0.5 ? T.plank(jit([176, 156, 136], r, 12)) : T.carpet(jit([150, 140, 150], r, 12)), wall: skyline(r < 0.5 ? [226, 220, 204] : [206, 214, 226]), wood: [130, 100, 80], fab: r < 0.34 ? fabs("navy", "gold", "grey") : r < 0.67 ? fabs("teal", "cream", "red") : fabs("plum", "gold", "cream"), mat: [70, 110, 190], glazed: true });
STYLES.cafe = () => ({ floor: T.plank([150, 104, 76]), wall: paper([110, 70, 60], { base: [70, 44, 36], rail: [200, 150, 70] }), wood: [110, 70, 50], fab: fabs("wine", "gold", "cream"), counter: [110, 70, 50], counterTop: [200, 150, 100], mat: [200, 150, 70], trim: GOLD });
STYLES.ship = () => ({ floor: T.plank([170, 120, 80]), wall: cabinWall, wood: [130, 84, 50], fab: fabs("navy", "red", "cream"), trim: GOLD, mat: [60, 80, 130] });
STYLES.sewer = () => ({ floor: T.slab([98, 100, 110], 3), wall: Wl.brick([84, 80, 98]), wood: [96, 86, 80], fab: [[110, 130, 110], [150, 90, 200], [90, 96, 120]], crate: [150, 124, 96], mat: [120, 70, 170], leaf: [60, 120, 90] });
STYLES.market = () => ({ floor: T.plank([200, 164, 120]), wall: paper([236, 226, 200], { base: [130, 96, 66], wain: [176, 136, 96] }), wood: [150, 104, 66], fab: fabs("orange", "green", "cream") });
STYLES.stock = () => ({ floor: T.slab([170, 172, 180], 6), wall: paper([190, 196, 206], { base: [110, 116, 130], panel: 24 }), wood: [150, 156, 170], fab: fabs("grey", "orange", "navy"), mat: [240, 200, 60] });
STYLES.dream = () => ({ floor: T.check([240, 236, 244], [230, 216, 236], 1), wall: labWall([236, 214, 232]), wood: [190, 176, 200], fab: [[250, 170, 200], [190, 150, 240], [150, 200, 240]], mat: [240, 140, 190], metal: [190, 170, 200], lamp: [250, 170, 220] });
STYLES.museum = () => ({ floor: T.plank([190, 150, 104]), wall: paper([236, 226, 200], { base: [110, 76, 50], wain: [140, 100, 66] }), wood: [124, 84, 54], fab: fabs("wine", "gold", "olive"), trim: GOLD });
STYLES.parlour = () => ({ floor: T.carpet([96, 70, 120]), wall: paper([130, 96, 150], { base: [70, 50, 90], stripe: [150, 116, 170] }), wood: [96, 66, 60], fab: fabs("plum", "gold", "wine"), trim: GOLD, mat: [150, 96, 180] });
STYLES.school = () => ({ floor: T.plank([214, 180, 130]), wall: paper([226, 232, 220], { base: [150, 110, 76] }), wood: [176, 124, 80], fab: fabs("green", "red", "blue"), mat: [90, 150, 110] });
const G = (hue, o = {}) => ({ role: "gate", style: gateStyle(hue, o), ...o });
const SPECS = {
  // gatehouses
  HouseAccumulaGate: G([100, 170, 110]), HouseRouteGateGate: G([110, 180, 100]), HouseNimbasaGateGate: G([240, 180, 70], { wall: ["led", "film", "window", "map", "clock", "flags"] }), HouseNimbasaGateGate2: G([236, 130, 170]),
  HouseBridgeGate2: G([80, 140, 210], { wall: ["led", "bridge", "window", "map", "bridge", "clock"] }), HouseBridgeGateGate: G([90, 130, 200], { wall: ["led", "bridge", "window", "timetable", "bridge", "map"] }),
  HouseBridgeGateGate2: G([180, 120, 80], { wall: ["led", "rail", "window", "bridge", "timetable", "rail"] }), HouseBridgeGateGate3: G([170, 110, 90], { wall: ["led", "bridge", "rail", "window", "clock", "rail"] }),
  HouseBridgeGateGate4: G([130, 150, 100], { floor: T.cobble([200, 196, 186]) }), HouseBridgeGateGate5: G([150, 140, 100], { floor: T.cobble([206, 198, 180]) }),
  HouseBridgeGateGate6: G([160, 120, 210], { wall: ["led", "bridge", "window", "screen", "bridge", "clock"] }), HouseBridgeGateGate7: G([130, 130, 220], { wall: ["led", "bridge", "screen", "window", "bridge", "map"] }),
  HouseBridgeGateGate8: G([50, 170, 200], { wall: ["led", "tube", "window", "tube", "map", "tube"], out: [90, 190, 230], more2: (F) => signsAs(F, () => infoBoard([50, 170, 200]), [[3, 4], [3, 6]]) }),
  HouseBridgeGateGate9: G([60, 160, 220], { wall: ["led", "tube", "tube", "window", "tube", "clock"], out: [90, 190, 230], more2: (F) => signsAs(F, () => infoBoard([60, 160, 220]), [[21, 3], [17, 3]]) }),
  HouseDriftveilCity8: G([210, 70, 70], { wall: ["led", "banner", "screen", "badges", "banner", "screen"] }), HouseOpelucidGate: G([120, 124, 170], { floor: T.slab([200, 200, 212], 3), wall: stoneWall([150, 154, 174]) }), HouseOpelucidGateGate2: G([140, 110, 170], { floor: T.slab([206, 200, 212], 5), wall: stoneWall([156, 150, 170]) }),
  HouseRouteGate: G([214, 160, 80], { floor: T.check([240, 226, 190], [230, 210, 166], 1), out: [250, 226, 160] }), HouseUndellaGate: G([80, 170, 220], { wall: ["led", "window", "fishTrophy", "map", "window", "clock"] }), HouseVirbankGateGate: G([170, 110, 200], { wall: ["led", "film", "film", "screen", "film", "clock"] }),
  // hotels, offices, labs, shops
  HouseDriftveilCity2: { role: "hotel", style: hotelStyle([150, 50, 60], [236, 222, 196], fabs("wine", "gold", "navy")) }, HouseDriftveilCity3: { role: "hotel", style: hotelStyle([60, 76, 130], [226, 226, 214], fabs("navy", "cream", "gold")) },
  HouseDriftveilCity4: { role: "hotel", style: hotelStyle([110, 70, 130], [240, 226, 230], fabs("plum", "gold", "rose")) }, HouseDriftveilCity5: { role: "hotel", style: hotelStyle([50, 120, 120], [230, 236, 220], fabs("teal", "cream", "orange")) },
  HouseCasteliaCity28: { role: "hotel", style: "marble", doors: { exit: "lift" } }, HouseUnityTower2: { role: "hotel", style: "marble", doors: { exit: "lift", other: "pad" } }, HouseUnityTower3: { role: unityTop, style: "marble", doors: { exit: "pad" } },
  HouseCasteliaCity18: { role: "office", style: "office", doors: { exit: "lift" } }, HouseCasteliaCity20: { style: "castelia", doors: { exit: "lift" } }, HouseCasteliaCity23: { style: "castelia", doors: { exit: "lift" } }, HouseCasteliaCity26: { role: "club", style: "castelia", doors: { exit: "lift" } },
  HouseCasteliaCity14: { role: gallery, style: "marble", doors: { exit: "lift" } }, HouseCasteliaCity22: { role: "cafe", style: "cafe", doors: { exit: "lift" } }, HouseCasteliaCity25: { role: parlour, style: "parlour", doors: { exit: "lift" } },
  CasteliaBadgeOffice: { role: badgeOffice, style: "marble" }, CasteliaFerryCabin: { role: shipCabin, style: "ship" }, SewerHideout: { role: hideout, style: "sewer" }, DriftveilMarket: { role: market, style: "market" }, ShoppingMallStockroom: { role: stockroom, style: "stock" },
  HousePokeTransferLab: { role: "lab", style: "lab" }, StriatonFennelLab: { role: dreamLab, style: "dream" }, CasteliaDreamLab: { role: dreamLab, style: "dream" }, HouseIcirrusCity5: { role: "office", style: "icirrus", wall: ["whiteboard", "window", "screen", "antlers", "board"] },
  HouseNacreneCity3: { role: library, style: "museum" }, HouseNacreneCity4: { role: library, style: "museum", upstairs: true }, HouseNacreneCity8: { role: "shop" }, HouseNacreneCity9: { role: atelier }, HouseNacreneCity10: { role: "cafe", music: false },
  // clubs, battle houses, rest houses
  HouseIcirrusCity6: { role: "club" }, HouseBlackCity5: { role: "club" }, HouseNimbasaCity14: { role: "arena" }, HouseOpelucidCity4: { role: "arena" }, HousePokemonLeague11: { role: "rest" }, HouseVictoryRoad27: { role: "rest" }, VillageBridgeHouse7: { role: "rest" },
  HouseMistraltonCity3: { role: depot }, IcirrusQuizHouse: { role: quiz }, StriatonTrainersSchool: { role: school, style: "school" }, AccumulaMusicHouse: { role: music }, NimbasaHouse: { role: apartments },
  // Village Bridge and Anville
  VillageBridgeHouse2: { role: stonecutter }, VillageBridgeHouse3: { role: bakery }, VillageBridgeHouse4: { role: anglers }, VillageBridgeHouse5: { role: dojo }, VillageBridgeHouse6: { role: performer }, VillageBridgeHouse8: { wall: ["rods", "window", "fishTrophy", "curtains", "net", "picture"] }, VillageBridgeHouse9: { role: music, drums: true },
  AnvilleHouse2: { role: railway }, AnvilleHouse3: { role: railway }, AnvilleHouse4: { role: lostFound },
  // homes with something of their own
  LacunosaReadingHouse: { role: "study" }, NuvemaOldBedroom: { role: "bedroom" }, HumilauTradeHouse: { wall: ["mantine", "shelf", "fishTrophy", "mantine", "clock"] }, MistraltonFamilyHouse: { wall: ["discs", "curtains", "discs", "picture", "discs", "clock"] },
  VirbankAudinoHouse: { wall: ["audino", "curtains", "audino", "shelf", "audino"] }, HouseVirbankCity5: { wall: ["anchor", "window", "lifebuoy", "timetable", "anchor"] },
  Route4SandHouse: { more: (F) => { scatter(F, [[X_.sand2, [F.L + 1, F.T + 5]], [X_.sand1, [F.R - 1, F.T + 8]], [X_.sand2, [F.L + 2, F.B - 2]], [X_.sand1, [F.R - 2, F.B - 4]], [X_.sand2, [F.L + 12, F.T + 10]]], { margin: 0, side: 0 }); chips(F, 90, [230, 206, 150]); } },
  HouseHumilauCity6: { before: (F) => signsAs(F, (s) => s.y === 3 ? (c, X, Y, W, st) => F_.tvFix(c, X, Y, W, st) : goldBin, [[3, 3], [6, 3], [9, 3], [18, 11]]) },
  HouseAspertiaCity4: { role: "bedroom", before: (F) => signsAs(F, () => pcFix, [[18, 3]]) }, HouseNuvemaTown7: { role: "bedroom", before: (F) => signsAs(F, () => pcFix, [[11, 4]]) },
  HouseWhiteForest2: { more: (F) => { scatter(F, [[F.I.plant, [F.L + 4, F.T + 5]], [F.I.flowers, [F.R - 4, F.T + 6]], [F.I.plant, [F.L + 5, F.B - 3]], [F.I.plant, [F.R - 5, F.B - 3]], [F.I.flowers, [F.L + 9, F.T + 4]]], { margin: 0 }); } },
};
const UNPLANNED = "NimbasaHouse CasteliaBadgeOffice CasteliaFerryCabin SewerHideout DriftveilMarket ShoppingMallStockroom HumilauTradeHouse LacunosaReadingHouse MistraltonFamilyHouse NuvemaOldBedroom StriatonFennelLab VirbankAudinoHouse Route4FamilyHouse Route4SandHouse VillageBridgeHouse2 VillageBridgeHouse3 VillageBridgeHouse4 VillageBridgeHouse5 VillageBridgeHouse6 VillageBridgeHouse7 VillageBridgeHouse8 VillageBridgeHouse9 AnvilleHouse2 AnvilleHouse3 AnvilleHouse4 CasteliaDreamLab IcirrusQuizHouse StriatonTrainersSchool AccumulaMusicHouse HouseAbundantShrine2 HouseAccumulaGate HouseAccumulaTown2 HouseAccumulaTown3 HouseAccumulaTown4 HouseAccumulaTown5 HouseAccumulaTown6 HouseAccumulaTown7 HouseAspertiaCity3 HouseAspertiaCity4 HouseAspertiaCity5 HouseAspertiaCity6 HouseAspertiaCity7 HouseAspertiaCity8 HouseBlackCity2 HouseBlackCity5 HouseBridgeGate2 HouseBridgeGateGate HouseBridgeGateGate2 HouseBridgeGateGate3 HouseBridgeGateGate4 HouseBridgeGateGate5 HouseBridgeGateGate6 HouseBridgeGateGate7 HouseBridgeGateGate8 HouseBridgeGateGate9 HouseDriftveilCity2 HouseDriftveilCity3 HouseDriftveilCity4 HouseDriftveilCity5 HouseDriftveilCity8 HouseFloccesyTown3 HouseFloccesyTown4 HouseHumilauCity2 HouseHumilauCity4 HouseHumilauCity5 HouseHumilauCity6 HouseIcirrusCity2 HouseIcirrusCity3 HouseIcirrusCity5 HouseIcirrusCity6 HouseLacunosaTown2 HouseLacunosaTown3 HouseLacunosaTown4 HouseLentimasTown2 HouseLentimasTown3 HouseMistraltonCity2 HouseMistraltonCity3 HouseNacreneCity10 HouseNacreneCity3 HouseNacreneCity4 HouseNacreneCity5 HouseNacreneCity6 HouseNacreneCity7 HouseNacreneCity8 HouseNacreneCity9 HouseNimbasaCity12 HouseNimbasaCity14 HouseNimbasaCity15 HouseNimbasaGateGate HouseNimbasaGateGate2 HouseNuvemaTown4 HouseNuvemaTown5 HouseNuvemaTown6 HouseNuvemaTown7 HouseOpelucidCity10 HouseOpelucidCity11 HouseOpelucidCity2 HouseOpelucidCity3 HouseOpelucidCity4 HouseOpelucidCity5 HouseOpelucidCity6 HouseOpelucidCity7 HouseOpelucidCity8 HouseOpelucidCity9 HouseOpelucidGate HouseOpelucidGateGate2 HousePokeTransferLab HousePokemonLeague11 HouseRoute112 HouseRoute132 HouseRoute133 HouseRoute152 HouseRoute182 HouseRoute232 HouseRoute233 HouseRoute411 HouseRoute412 HouseRoute414 HouseRoute415 HouseRoute43 HouseRoute44 HouseRoute45 HouseRoute47 HouseRoute48 HouseRoute49 HouseRoute52 HouseRoute63 HouseRoute72 HouseRoute73 HouseRouteGate HouseRouteGateGate HouseStriatonCity3 HouseStriatonCity5 HouseStriatonCity6 HouseStriatonCity7 HouseStriatonCity8 HouseUndellaGate HouseUnityTower2 HouseUnityTower3 HouseVictoryRoad27 HouseVirbankCity3 HouseVirbankCity4 HouseVirbankCity5 HouseVirbankGateGate HouseWhiteForest2 HouseCasteliaCity14 HouseCasteliaCity18 HouseCasteliaCity22 HouseCasteliaCity23 HouseCasteliaCity25 HouseRoute410 HouseCasteliaCity20 HouseCasteliaCity26 HouseCasteliaCity28".split(" ");
const UPSTAIRS = /^House(AccumulaTown[357]|AspertiaCity[468]|NuvemaTown[57]|OpelucidCity(11|[3579])|StriatonCity[68]|Route48|Route410)$/;
for (const n of UNPLANNED) if (!R["Unova" + n]) R["Unova" + n] = furnished("Unova" + n, SPECS[n] || { role: UPSTAIRS.test(n) ? "bedroom" : "living" });

module.exports = R;
