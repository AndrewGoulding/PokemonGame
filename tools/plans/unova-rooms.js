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
// Aspertia: Cheren's Gym is the school yard behind the Trainers' School: a clay court on the lawn, fenced, with trees.
R.UnovaAspertiaGym = {
  theme: { room: "arena", floor: "grass", wall: null },
  plan(p) {
    const k = base(p, T.grass(), (c, X, Y, W) => { Wl.plain([236, 226, 200], { base: [150, 110, 80] })(c, X, Y, W); c.rect(X, Y, W, 5, [176, 80, 70]); c.rect(X, Y + 5, W, 1, [110, 44, 40]); for (let x = X + 12; x + 24 < X + W; x += 40) Wl.window(c, x, Y + 8, 24, 16); });
    k.floor(T.dirt([214, 150, 100]), 7, 8, 24, 25, 0.02);
    k.art((c) => { court(c, 7, 8, 24, 25, null); for (const [x, y] of [[16, 5], [7, 17], [25, 17]]) { c.box(x * S - 6, y * S - 2, 28, 22, [196, 190, 176], [120, 114, 100]); frame(c, x * S - 4, y * S, 24, 18, WHITE); } for (let y = 3; y <= 28; y++) for (const x of [1, 30]) { const X = x * S + (x === 1 ? 9 : 2), Y = y * S; c.rect(X + 1, Y, 3, S, [150, 108, 62]); c.box(X, Y + 2, 5, 6, [190, 144, 90], [86, 58, 36]); } });
    k.fixtures((s) => s.w === 4 ? (c, X, Y, W, H) => { c.rect(X + 3, Y + H - 2, W, 4, [0, 0, 0, 60]); c.box(X, Y + 22, W, H - 22, [226, 214, 190], [110, 90, 70]); c.poly([[X - 3, Y + 24], [X + 8, Y - 2], [X + W - 8, Y - 2], [X + W + 3, Y + 24]], [176, 80, 70]); for (let r = 2; r < 24; r += 5) c.rect(X - 1 + (24 - r) * 0.1, Y + r, W + 2 - (24 - r) * 0.2, 1, [120, 50, 46]); c.box(X + 24, Y + 38, 16, 26, [120, 84, 54], [60, 40, 30]); c.rect(X + 36, Y + 50, 2, 2, GOLD); Wl.window(c, X + 5, Y + 34, 14, 12); Wl.window(c, X + 45, Y + 34, 14, 12); } : null);
    for (const [x, y] of [[3, 2], [3, 25], [27, 25], [18, 2], [9, 2]]) k.put(x, y, 2, 3, (c, X, Y) => { c.ellipse(X + 16, Y + 45, 13, 4, [0, 0, 0, 70]); c.rect(X + 13, Y + 30, 6, 16, [120, 84, 54]); for (const [dx, dy, r] of [[16, 20, 14], [8, 26, 9], [24, 26, 9], [16, 10, 10]]) { c.ellipse(X + dx, Y + dy, r, r * 0.8, [50, 120, 70]); c.ellipse(X + dx - 2, Y + dy - 2, r - 3, r * 0.8 - 3, [84, 164, 90]); } }, { rows: 1 });
    for (const [x, y] of [[3, 12], [3, 20], [28, 12], [28, 21]]) k.put(x, y, 1, 2, (c, X, Y) => { c.rect(X + 2, Y + 30, 13, 2, [0, 0, 0, 50]); c.box(X + 2, Y + 4, 12, 24, [190, 144, 90], [86, 58, 36]); for (let r = 9; r < 26; r += 6) c.rect(X + 3, Y + r, 10, 1, [120, 84, 54]); c.rect(X + 3, Y + 28, 2, 3, [86, 58, 36]); c.rect(X + 11, Y + 28, 2, 3, [86, 58, 36]); });
  },
};

// Virbank: Roxie's underground club. A stage along the back with the band's gear, speaker stacks, neon and toxic light.
R.UnovaVirbankGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const k = base(p, T.check([52, 40, 70], [44, 34, 60], 2), (c, X, Y, W) => { Wl.brick([70, 50, 76])(c, X, Y, W); const cx = X + W / 2; glow(c, cx, Y + 14, 30, [190, 110, 250], 30); c.ellipse(cx, Y + 13, 11, 10, [170, 100, 230]); c.ellipse(cx, Y + 13, 9, 8, [214, 160, 250]); c.rect(cx - 5, Y + 11, 3, 3, INK); c.rect(cx + 2, Y + 11, 3, 3, INK); c.rect(cx - 4, Y + 18, 8, 1, INK); for (const d of [-1, 1]) { for (let i = 0; i < 6; i++) c.line(cx + d * (30 + i * 22), Y + (i & 1 ? 8 : 22), cx + d * (52 + i * 22), Y + (i & 1 ? 22 : 8), i % 3 ? [130, 240, 120] : [240, 110, 220], 2); } }, {}, [120, 70, 170]);
    k.floor(T.plank([110, 76, 100]), 9, 2, 22, 7, 0.02);
    k.art((c) => { c.rect(9 * S, 8 * S - 4, 14 * S, 4, [36, 26, 50]); for (let x = 9 * S + 4; x < 23 * S; x += 12) c.rect(x, 8 * S - 3, 5, 2, (x / 12) & 1 ? [130, 240, 120] : [240, 110, 220]); frame(c, 9 * S, 2 * S, 14 * S, 6 * S, [36, 26, 50], 2);
      for (const [x, y, r, col] of [[16, 17, 60, [150, 90, 220]], [9, 12, 26, [120, 230, 110]], [23, 12, 26, [120, 230, 110]], [11, 24, 22, [230, 100, 210]], [21, 24, 22, [230, 100, 210]]]) glow(c, x * S + 8, y * S + 8, r, col, 18);
      for (let i = 0; i < 14; i++) { const x = 3 + Math.floor(hsh(i, 1, 7) * 25), y = 9 + Math.floor(hsh(i, 2, 7) * 19); c.ellipse(x * S + 8, y * S + 8, 5 + hsh(i, 3, 7) * 5, 3 + hsh(i, 4, 7) * 2, [120, 220, 100, 70]); c.ellipse(x * S + 10, y * S + 7, 2, 1, [190, 250, 150, 110]); }
      for (const [x, y] of [[7, 14], [25, 14]]) { c.ellipse(x * S + 8, y * S + 10, 15, 11, [30, 24, 40]); c.ellipse(x * S + 8, y * S + 10, 13, 9, [150, 90, 220], 2); } });
    k.fixtures((s) => s.w === 2 ? (c, X, Y, W, H, top) => { P.speaker(c, X, Y - 10, W, H + 10); top.rect(X + 1, Y - 10, W - 2, 10, [44, 42, 56]); top.rect(X + 1, Y - 10, W - 2, 1, [14, 12, 20]); } : null);
    k.put(18, 3, 2, 2, (c, X, Y) => { c.ellipse(X + 16, Y + 28, 15, 4, [0, 0, 0, 70]); c.ellipse(X + 16, Y + 18, 9, 9, INK); c.ellipse(X + 16, Y + 18, 8, 8, [226, 60, 150]); c.ellipse(X + 16, Y + 18, 5, 5, WHITE); for (const dx of [4, 28]) { c.box(X + dx - 4, Y + 12, 8, 10, [120, 220, 110], INK); c.ellipse(X + dx, Y + 12, 4, 2, WHITE); c.rect(X + dx - 1, Y + 2, 1, 10, [150, 150, 160]); c.ellipse(X + dx, Y + 3, 5, 2, GOLD); } });
    k.put(12, 3, 2, 2, (c, X, Y, W, H) => { P.speaker(c, X, Y + 6, 16, 26, [70, 40, 90]); P.speaker(c, X + 16, Y + 12, 16, 20, [40, 70, 50]); });
    for (const [x, y] of [[3, 3], [28, 3], [3, 27], [28, 27]]) tall(k, x, y, 1, (c, X, Y, W, H) => { const cx = X + 8; glow(c, cx, Y + 6, 16, [130, 240, 120], 26); c.rect(cx - 1, Y + 8, 2, H - 10, [80, 76, 96]); c.box(cx - 4, Y + H - 4, 8, 3, [80, 76, 96], INK); c.box(cx - 4, Y, 8, 9, [130, 240, 120], INK); c.rect(cx - 2, Y + 2, 2, 4, WHITE); });
  },
};

// Castelia: Burgh's Gym. Honey-gold comb rooms hung with silk; walls of honey reach out from the sides, cocoons stand about.
function castelia(seed, bars, cocoons) {
  return {
    theme: { room: "arena", floor: "sand", wall: null },
    plan(p) {
      const honey = [236, 176, 56];
      const k = base(p, T.hex([240, 200, 96]), (c, X, Y, W) => { c.rect(X, Y, W, 32, [200, 140, 50]); for (let x = 0; x < W; x += 16) for (let y = 0; y < 32; y += 16) T.hex([206, 146, 50])(c, X + x, Y + y, x / 16, y / 16); c.rect(X, Y, W, 4, honey); for (let x = 2; x < W - 4; x += 7) { const h = 5 + Math.floor(hsh(x, seed, 2) * 16); c.rect(X + x, Y + 4, 4, h, honey); c.ellipse(X + x + 2, Y + 4 + h, 2, 3, honey); c.rect(X + x + 1, Y + 5, 1, h - 2, lt(honey, 0.5)); } c.rect(X, Y + 29, W, 3, [150, 96, 40]); }, { all: "none" }, [250, 240, 200]);
      const up = p.warps.find((w) => !w.exit);
      k.art((c) => { if (up) for (const [tx, ty] of [[2, 6], [27, 8], [4, 25], [25, 25], [2, 16], [27, 18]]) c.line(up.x * S + 8, up.y * S, tx * S + 8, ty * S + 8, [255, 255, 255, 120]); rug(c, 12, 12, 18, 16, [230, 150, 60], [250, 236, 180]); for (let i = 0; i < 10; i++) { const x = 3 + Math.floor(hsh(i, seed, 1) * 24), y = 6 + Math.floor(hsh(i, seed, 2) * 18); c.ellipse(x * S + 8, y * S + 9, 6, 3, [250, 226, 140, 150]); c.ellipse(x * S + 6, y * S + 8, 2, 1, [255, 250, 220, 200]); } });
      if (up) p.paint(up.y + 0.3, (c) => { const cx = up.x * S + 8, cy = up.y * S - 2; c.ellipse(cx, cy + 14, 22, 6, [0, 0, 0, 50]); c.ellipse(cx, cy, 24, 20, [214, 210, 200]); c.ellipse(cx, cy - 1, 22, 18, [250, 248, 240]); for (let a = -18; a <= 18; a += 6) c.line(cx - 20, cy + a, cx + 20, cy + a * 0.6 - 3, [220, 216, 204]); c.ellipse(cx, cy + 9, 8, 10, [70, 60, 60]); c.ellipse(cx, cy + 10, 6, 8, [30, 26, 30]); });
      for (const [x0, x1, y] of bars) k.put(x0, y - 1, x1 - x0 + 1, 2, (c, X, Y, W, H) => { c.rect(X, Y + H - 2, W, 3, [0, 0, 0, 50]); c.box(X, Y + 6, W, H - 7, honey, [150, 96, 30]); c.rect(X + 1, Y + 7, W - 2, 4, lt(honey, 0.45)); for (let x = 3; x < W - 4; x += 9) { const h = 4 + Math.floor(hsh(x, y, seed) * 9); c.rect(X + x, Y + 12, 3, h, lt(honey, 0.25)); c.ellipse(X + x + 1, Y + 12 + h, 2, 2, lt(honey, 0.25)); } for (let x = 6; x < W - 6; x += 14) c.ellipse(X + x, Y + H - 6, 3, 2, dk(honey, 0.15)); }, { rows: 1 });
      for (const [x, y] of cocoons) tall(k, x, y, 1, (c, X, Y, W, H) => { const cx = X + 8; c.ellipse(cx, Y + H - 2, 6, 2, [0, 0, 0, 60]); c.line(cx, Y - 6, cx, Y + 4, [255, 255, 255, 170]); c.ellipse(cx, Y + H / 2 + 1, 7, 12, [200, 196, 186]); c.ellipse(cx - 1, Y + H / 2, 6, 11, [250, 248, 240]); for (let a = -8; a <= 8; a += 4) c.line(cx - 5, Y + H / 2 + a, cx + 5, Y + H / 2 + a - 2, [214, 210, 198]); });
    },
  };
}
R.UnovaCasteliaGym = castelia(1, [[2, 10, 9], [18, 27, 19]], [[4, 5], [24, 5], [22, 12], [6, 21], [25, 23]]);
R.UnovaCasteliaCocoon1 = castelia(2, [[17, 27, 9], [2, 11, 19]], [[5, 6], [23, 4], [7, 13], [21, 22], [3, 23]]);
R.UnovaCasteliaCocoon2 = castelia(3, [[2, 12, 10], [16, 27, 20]], [[25, 6], [4, 4], [23, 14], [8, 22], [26, 23]]);
// Burgh's studio at the heart of the hive: canvases, easels, paint, and a leaf-green court.
R.UnovaCasteliaBurgh = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    const k = base(p, T.plank([226, 196, 140]), (c, X, Y, W) => { Wl.plain([244, 238, 226], { base: [200, 150, 60] })(c, X, Y, W); const pics = [[[120, 190, 120], (c2, x, y) => { c2.ellipse(x, y, 7, 5, [226, 200, 70]); c2.ellipse(x - 5, y - 3, 4, 3, [250, 250, 250]); c2.ellipse(x + 5, y - 3, 4, 3, [250, 250, 250]); }], [[240, 200, 110], (c2, x, y) => { for (let a = 0; a < 6; a++) c2.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 4, 3, 3, [226, 90, 110]); c2.ellipse(x, y, 3, 3, GOLD); }], [[130, 180, 230], (c2, x, y) => { c2.poly([[x - 9, y + 6], [x - 2, y - 6], [x + 3, y + 1], [x + 6, y - 3], [x + 10, y + 6]], [90, 150, 90]); }], [[230, 150, 170], (c2, x, y) => { c2.ellipse(x, y, 4, 7, [90, 160, 90]); c2.rect(x - 7, y - 1, 14, 1, INK); }]]; pics.forEach(([col, d], i) => Wl.picture(c, X + 20 + i * 76, Y + 5, 34, 20, col, d)); }, {}, [110, 180, 100]);
    k.art((c) => { court(c, 6, 8, 17, 17, [150, 204, 130, 190], WHITE, (c2, cx, cy) => { c2.ellipse(cx, cy, 8, 5, [250, 250, 240]); c2.rect(cx - 8, cy, 16, 1, [200, 196, 186]); }); rug(c, 10, 4, 14, 6, [236, 176, 56]);
      for (let i = 0; i < 16; i++) { const x = 2 + hsh(i, 5, 1) * 19, y = 3 + hsh(i, 5, 2) * 16, col = BOOKS[i % 6]; c.ellipse(x * S, y * S, 3 + hsh(i, 5, 3) * 4, 2 + hsh(i, 5, 4) * 2, A(col, 170)); c.rect(x * S + 5, y * S + 3, 2, 2, A(col, 170)); } });
    const easel = (pic) => (c, X, Y) => { c.ellipse(X + 16, Y + 30, 11, 3, [0, 0, 0, 60]); c.line(X + 6, Y + 31, X + 12, Y + 2, [120, 84, 54], 2); c.line(X + 26, Y + 31, X + 20, Y + 2, [120, 84, 54], 2); c.box(X + 5, Y + 3, 22, 18, [250, 248, 240], [120, 84, 54]); c.ellipse(X + 16, Y + 12, 7, 5, pic); c.ellipse(X + 12, Y + 10, 3, 2, lt(pic, 0.4)); c.rect(X + 4, Y + 21, 24, 2, [150, 108, 62]); };
    [[3, 4, [226, 90, 110]], [18, 4, [90, 150, 226]], [3, 13, [120, 190, 110]], [19, 13, [236, 190, 70]], [7, 3, [170, 110, 210]], [15, 3, [240, 150, 80]]].forEach(([x, y, col]) => k.put(x, y, 2, 2, easel(col), { rows: 1 }));
    for (const [x, y, col] of [[2, 9, [226, 90, 110]], [21, 9, [90, 150, 226]], [2, 18, [236, 190, 70]], [21, 18, [120, 190, 110]]]) k.put(x, y, 1, 1, (c, X, Y) => { c.ellipse(X + 8, Y + 13, 6, 2, [0, 0, 0, 60]); c.box(X + 3, Y + 4, 10, 10, [190, 190, 200], [90, 90, 104]); c.ellipse(X + 8, Y + 5, 5, 2, col); c.rect(X + 2, Y + 8, 2, 5, col); });
  },
};

// Nimbasa: Elesa's fashion-show hall. A lit catwalk runs up the dark hall to her stage; the crowd sits either side.
R.UnovaNimbasaGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const pink = [250, 110, 190], yel = [250, 226, 90];
    const k = base(p, T.check([40, 36, 62], [34, 30, 54], 1), (c, X, Y, W) => { Wl.plain([50, 40, 80], { base: [30, 24, 50] })(c, X, Y, W); const cx = X + W / 2; Wl.screen(c, cx - 56, Y + 2, 112, 26, [250, 210, 80], (c2, x, y) => { bolt(c2, x, y, 1.4, WHITE); bolt(c2, x - 34, y, 1, pink); bolt(c2, x + 34, y, 1, pink); }); for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { c.rect(cx + d * (70 + i * 26) - 8, Y + 6 + (i & 1) * 8, 16, 3, i & 1 ? pink : yel); c.rect(cx + d * (70 + i * 26) - 8, Y + 14 + (i & 1) * 8, 16, 2, i & 1 ? yel : [110, 220, 250]); } }, {}, pink);
    const walk = (c, X, Y, x, y) => { c.rect(X, Y, S, S, (x + y) & 1 ? [244, 240, 250] : [226, 222, 240]); c.rect(X, Y, S, 1, WHITE); };
    k.floor(walk, 12, 8, 16, 39, 0.02); k.floor(walk, 8, 3, 20, 7, 0.02);
    for (const [y, x0, x1] of [[31, 6, 16], [21, 12, 22], [11, 6, 16]]) k.floor(walk, x0, y - 1, x1, y + 1, 0.02);
    k.art((c) => {
      const edge = (x0, y0, x1, y1) => { const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S; for (let x = X + 3; x < X + w - 3; x += 8) { c.rect(x, Y + 1, 3, 2, (x >> 3) & 1 ? pink : yel); c.rect(x, Y + h - 3, 3, 2, (x >> 3) & 1 ? yel : pink); } for (let y = Y + 3; y < Y + h - 3; y += 8) { c.rect(X + 1, y, 2, 3, (y >> 3) & 1 ? pink : yel); c.rect(X + w - 3, y, 2, 3, (y >> 3) & 1 ? yel : pink); } };
      edge(8, 3, 20, 7); for (const [y, x0, x1] of [[31, 6, 11], [21, 17, 22], [11, 6, 11]]) edge(x0, y - 1, x1, y + 1);
      for (let y = 8; y <= 39; y++) for (const x of [12, 16]) { const X = x === 12 ? x * S + 1 : x * S + 13, Y = y * S; if (!((y >= 30 && y <= 32 && x === 12) || (y >= 20 && y <= 22 && x === 16) || (y >= 10 && y <= 12 && x === 12))) { c.rect(X, Y + 2, 2, 3, y & 1 ? pink : yel); c.rect(X, Y + 10, 2, 3, y & 1 ? yel : pink); } }
      for (const [x, y] of [[14, 31], [14, 21], [14, 11], [14, 5]]) { c.ellipse(x * S + 8, y * S + 9, 18, 12, A(yel, 90)); c.ellipse(x * S + 8, y * S + 9, 18, 12, pink, 2); star(c, x * S + 8, y * S + 9, 6, A(yel, 220)); }
    });
    const crowd = (seed) => (c, X, Y, W, H) => { c.rect(X, Y, W, H, [28, 24, 44]); for (let y = Y + 2; y + 11 <= Y + H; y += 12) { c.rect(X, y + 10, W, 2, [60, 54, 90]); for (let x = X + 2; x + 8 <= X + W; x += 11) { const h = hsh(x, y, seed), col = [[240, 200, 90], [220, 90, 150], [90, 150, 230], [120, 200, 130], [200, 110, 220], [240, 240, 250]][Math.floor(h * 6)]; c.rect(x, y + 5, 8, 6, col); c.ellipse(x + 4, y + 3, 3, 3, [244, 208, 176]); c.rect(x + 1, y, 6, 2, [[60, 40, 30], [30, 30, 40], [226, 190, 90], [150, 70, 50]][Math.floor(h * 40) % 4]); if (h > 0.7) c.rect(x + 7, y - 1, 2, 5, [250, 250, 200]); } } };
    for (const [y0, y1] of [[13, 19], [23, 29], [33, 38]]) { k.put(2, y0, 3, y1 - y0 + 1, crowd(y0)); if (y0 < 33) k.put(23, y0, 3, y1 - y0 + 1, crowd(y0 + 3)); }
    for (const x of [2, 23]) k.put(x, 4, 3, 5, crowd(x + 50));
    p.paint(50, (c, top) => { for (const [x, y, sx, col] of [[14, 31, 3, pink], [14, 21, 24, yel], [14, 11, 3, pink], [14, 5, 22, yel], [14, 5, 5, pink]]) beam(top, sx * S + 8, (y - 7) * S, x * S + 8, y * S + 10, 16, col, 22); });
  },
};

// Driftveil: Clay's mine. Bare rock and timber, conveyor belts across the floor, ore carts, and hazard-striped lifts.
function belt(c, x0, y0, x1, y1, dir) {   // a conveyor over tiles; dir "r" "l" "u" "d"
  const X = x0 * S, Y = y0 * S, w = (x1 - x0 + 1) * S, h = (y1 - y0 + 1) * S, hz = dir === "r" || dir === "l";
  c.box(X, Y, w, h, [56, 56, 66], [24, 24, 30]);
  if (hz) { c.rect(X, Y + 2, w, 2, [130, 130, 144]); c.rect(X, Y + h - 4, w, 2, [130, 130, 144]); for (let x = X + 4; x < X + w - 6; x += 10) { const d = dir === "r" ? 1 : -1, mx = x + (d > 0 ? 0 : 5); c.line(mx, Y + 6, mx + d * 5, Y + h / 2, [240, 200, 60], 2); c.line(mx + d * 5, Y + h / 2, mx, Y + h - 7, [240, 200, 60], 2); } }
  else { c.rect(X + 2, Y, 2, h, [130, 130, 144]); c.rect(X + w - 4, Y, 2, h, [130, 130, 144]); for (let y = Y + 4; y < Y + h - 6; y += 10) { const d = dir === "d" ? 1 : -1, my = y + (d > 0 ? 0 : 5); c.line(X + 6, my, X + w / 2, my + d * 5, [240, 200, 60], 2); c.line(X + w / 2, my + d * 5, X + w - 7, my, [240, 200, 60], 2); } }
}
const mineWall = (c, X, Y, W) => { Wl.rockface([110, 84, 70])(c, X, Y, W); for (let x = 24; x < W; x += 64) { c.box(X + x, Y, 8, 32, [150, 104, 60], [80, 54, 34]); c.rect(X + x + 2, Y + 1, 2, 30, [190, 144, 90]); } c.box(X, Y + 2, W, 6, [150, 104, 60], [80, 54, 34]); for (let x = 56; x < W; x += 64) Wl.lamp(c, X + x, Y + 12, [250, 220, 130]); };
const cart = (ore) => (c, X, Y) => { c.ellipse(X + 16, Y + 29, 14, 3, [0, 0, 0, 70]); c.poly([[X + 3, Y + 12], [X + 29, Y + 12], [X + 26, Y + 26], [X + 6, Y + 26]], [90, 96, 110]); frame(c, X + 3, Y + 12, 26, 3, [150, 156, 170]); c.ellipse(X + 16, Y + 11, 11, 5, dk(ore, 0.2)); for (const [dx, dy] of [[-6, -1], [0, -3], [6, -1], [-2, 1], [4, 1]]) c.ellipse(X + 16 + dx, Y + 10 + dy, 3, 3, ore); c.ellipse(X + 14, Y + 6, 1, 1, WHITE); for (const dx of [9, 23]) { c.ellipse(X + dx, Y + 27, 4, 4, INK); c.ellipse(X + dx, Y + 27, 2, 2, [150, 156, 170]); } };
const rails = (c, x0, x1, y) => { const Y = y * S; for (let x = x0 * S; x < (x1 + 1) * S; x += 6) c.rect(x, Y + 3, 3, 12, [110, 76, 50]); c.rect(x0 * S, Y + 5, (x1 - x0 + 1) * S, 2, [150, 156, 170]); c.rect(x0 * S, Y + 11, (x1 - x0 + 1) * S, 2, [150, 156, 170]); };
function mine(belts, railRow, carts, piles, liftAt) {
  return {
    theme: { room: "arena", floor: "dirt", wall: null },
    plan(p) {
      const k = base(p, T.dirt([124, 98, 82]), mineWall, { all: "lift" }, [200, 160, 60]);
      k.art((c) => { for (const b of belts) belt(c, ...b); rails(c, railRow[0], railRow[1], railRow[2]); for (const q of p.people) if (/lift/.test(q.script)) { const X = (q.x - 1) * S, Y = (q.y - 1) * S; c.box(X, Y, 48, 48, [70, 68, 78], INK); for (let s2 = 0; s2 < 48; s2 += 8) { c.rect(X + s2, Y + 1, 4, 3, [240, 200, 60]); c.rect(X + s2 + 4, Y + 44, 4, 3, [240, 200, 60]); c.rect(X + 1, Y + s2, 3, 4, [240, 200, 60]); c.rect(X + 44, Y + s2 + 4, 3, 4, [240, 200, 60]); } c.box(X + 6, Y + 6, 36, 36, [150, 150, 162], [50, 50, 60]); for (let s2 = 10; s2 < 40; s2 += 5) c.rect(X + 8, Y + s2, 32, 1, [110, 110, 124]); } });
      for (const [x, ore] of carts) k.put(x, railRow[2] - 1, 2, 2, cart(ore), { rows: 1 });
      for (const [x, y, col] of piles) k.put(x, y, 2, 2, (c, X, Y, W, H) => { P.rock(c, X, Y + 6, 18, 26, [120, 100, 90]); P.rock(c, X + 12, Y + 12, 18, 20, [136, 112, 98]); for (const [dx, dy] of [[7, 16], [13, 22], [21, 20], [24, 26], [5, 26]]) { c.rect(X + dx, Y + dy, 3, 3, col); c.p(X + dx, Y + dy, WHITE); } }, { rows: 1 });
      for (const [x, y] of liftAt) k.put(x, y, 1, 2, (c, X, Y) => P.crate(c, X, Y + 14, 16, 18) || P.crate(c, X + 1, Y, 14, 15, [150, 110, 70]), { rows: 1 });
      for (const [x, y] of [[2, 3], [27, 3]]) tall(k, x, y, 1, (c, X, Y, W, H) => { c.box(X + 4, Y - 6, 8, H + 5, [150, 104, 60], [80, 54, 34]); c.rect(X + 6, Y - 5, 2, H + 3, [190, 144, 90]); });
    },
  };
}
R.UnovaDriftveilGym = mine([[4, 14, 25, 15, "r"], [22, 17, 23, 27, "d"], [11, 5, 12, 11, "u"]], [3, 13, 24], [[5, [230, 190, 80]], [10, [150, 200, 230]]], [[26, 5, GOLD], [2, 27, [150, 200, 230]], [25, 27, GOLD], [14, 3, GOLD]], [[17, 4], [8, 4]]);
R.UnovaDriftveilMine1 = mine([[4, 15, 25, 16, "l"], [11, 6, 12, 13, "d"], [23, 10, 24, 14, "u"]], [15, 26, 22], [[17, [150, 200, 230]], [22, [230, 190, 80]]], [[26, 4, GOLD], [2, 22, GOLD], [25, 23, [150, 200, 230]], [14, 3, GOLD]], [[17, 4], [8, 4]]);
R.UnovaDriftveilMine2 = mine([[4, 9, 12, 10, "r"], [4, 20, 25, 21, "r"], [12, 12, 13, 19, "d"]], [3, 12, 5], [[4, [230, 190, 80]], [9, [150, 200, 230]]], [[2, 23, GOLD], [26, 22, GOLD], [2, 14, [150, 200, 230]], [16, 3, GOLD]], [[22, 4], [19, 4]]);
// Clay's office at the bottom of the shaft: a boss's desk, a safe, the mine map and gold on the floor.
R.UnovaDriftveilClay = {
  theme: { room: "arena", floor: "dirt", wall: null },
  plan(p) {
    const k = base(p, T.dirt([124, 98, 82]), (c, X, Y, W) => { mineWall(c, X, Y, W); const cx = X + W / 2; Wl.picture(c, cx - 30, Y + 9, 60, 18, [214, 196, 150], (c2, x, y) => { c2.line(x - 24, y + 4, x - 8, y - 4, [150, 90, 60], 2); c2.line(x - 8, y - 4, x + 6, y + 3, [150, 90, 60], 2); c2.line(x + 6, y + 3, x + 24, y - 5, [150, 90, 60], 2); c2.rect(x - 9, y - 5, 3, 3, RED); c2.rect(x + 5, y + 2, 3, 3, RED); }); }, {}, [200, 160, 60]);
    k.floor(T.plank([150, 110, 76]), 7, 3, 19, 8, 0.02);
    k.art((c) => { frame(c, 7 * S, 3 * S, 13 * S, 6 * S, [80, 54, 34], 2); rug(c, 10, 4, 16, 7, [150, 60, 50]); court(c, 6, 10, 20, 18, [150, 116, 90, 150], [240, 220, 170], (c2, cx, cy) => { c2.poly([[cx - 8, cy + 5], [cx - 3, cy - 6], [cx + 4, cy - 4], [cx + 8, cy + 5]], GOLD); c2.line(cx - 2, cy - 5, cx - 5, cy + 2, WHITE); }); });
    k.put(11, 3, 5, 1, (c, X, Y, W, H) => { P.table(c, X, Y - 6, W, H + 6, [130, 84, 50]); c.box(X + 6, Y - 5, 10, 7, WHITE, [150, 150, 160]); c.box(X + W - 20, Y - 8, 12, 9, [50, 54, 70], INK); c.rect(X + W - 18, Y - 6, 8, 5, [110, 190, 236]); c.ellipse(X + W / 2, Y - 3, 4, 2, GOLD); }, { tall: true });
    k.put(8, 3, 2, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X + 2, Y + 2, 28, 28, [90, 96, 110], INK); frame(c, X + 5, Y + 5, 22, 22, [150, 156, 170]); c.ellipse(X + 16, Y + 16, 5, 5, [150, 156, 170]); c.ellipse(X + 16, Y + 16, 2, 2, INK); c.rect(X + 24, Y + 12, 2, 8, GOLD); });
    k.put(17, 3, 2, 2, (c, X, Y, W, H) => P.bookcase(c, X, Y, W, H), { rows: 1 });
    for (const [x, y] of [[3, 4], [21, 4], [3, 17], [21, 17]]) k.put(x, y, 2, 2, (c, X, Y) => { P.rock(c, X, Y + 8, 20, 24, [130, 106, 90]); P.rock(c, X + 12, Y + 14, 18, 18, [150, 120, 96]); for (const [dx, dy] of [[7, 18], [14, 24], [22, 22], [25, 27], [4, 27], [11, 13]]) { c.rect(X + dx, Y + dy, 3, 3, GOLD); c.p(X + dx, Y + dy, WHITE); } }, { rows: 1 });
    for (const [x, y] of [[2, 10], [23, 10]]) tall(k, x, y, 1, P.barrel);
    tall(k, 20, 8, 1, (c, X, Y, W, H) => { c.rect(X + 7, Y + 2, 2, H - 4, [110, 76, 50]); c.box(X + 3, Y + H - 4, 10, 3, [110, 76, 50], INK); c.ellipse(X + 8, Y + 3, 7, 2, [150, 104, 60]); c.ellipse(X + 8, Y, 4, 3, [176, 124, 76]); });
  },
};

// Mistralton: Skyla's hangar. A runway floor under three great turbines; wind streams down it and low walls give shelter.
R.UnovaMistraltonGym = {
  theme: { room: "arena", floor: "steel", wall: null },
  plan(p) {
    const k = base(p, T.plate([170, 184, 204]), (c, X, Y, W) => { Wl.plain([110, 130, 160], { panel: 32, base: [70, 84, 110] })(c, X, Y, W); for (let x = 0; x < W; x += 16) { c.rect(X + x, Y + 27, 8, 5, [240, 200, 60]); c.rect(X + x + 8, Y + 27, 8, 5, INK); } }, {}, [90, 170, 230]);
    k.floor(T.plate([96, 104, 124]), 13, 4, 17, 40, 0.02);
    k.art((c) => { for (let y = 4; y <= 40; y++) { c.rect(13 * S, y * S, 2, S, WHITE); c.rect(18 * S - 2, y * S, 2, S, WHITE); if (y % 3) c.rect(15 * S + 6, y * S + 2, 4, 12, [250, 220, 80]); }
      for (const q of p.people) if (/fan/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 8; c.ellipse(X, Y, 22, 22, [60, 70, 96]); c.ellipse(X, Y, 20, 20, [250, 220, 80], 3); for (let a = 0; a < 8; a++) c.line(X, Y, X + Math.cos(a * 0.785) * 18, Y + Math.sin(a * 0.785) * 18, [130, 144, 170], 2); }
      for (let i = 0; i < 90; i++) { const x = 3 * S + hsh(i, 1, 4) * 24 * S, y = 5 * S + hsh(i, 2, 4) * 35 * S, l = 10 + hsh(i, 3, 4) * 26; c.rect(x, y, 1, l, [255, 255, 255, 90]); c.rect(x + 1, y + 3, 1, l * 0.5, [255, 255, 255, 50]); }
      for (const [x, y] of [[4, 6], [22, 12], [4, 28], [22, 34]]) { const X = x * S, Y = y * S; c.ellipse(X + 32, Y + 16, 30, 14, [250, 220, 80, 60]); c.ellipse(X + 32, Y + 16, 30, 14, [250, 220, 80], 2); c.rect(X + 22, Y + 9, 3, 14, WHITE); c.rect(X + 39, Y + 9, 3, 14, WHITE); c.rect(X + 22, Y + 15, 20, 3, WHITE); } });
    k.put(2, 2, 26, 1, (c, X, Y, W, H) => { c.rect(X, Y - 32, W, 48, [70, 84, 110]); c.rect(X, Y + 12, W, 4, [40, 48, 66]); c.rect(X, Y - 32, W, 2, [150, 170, 200]); for (const fx of [W * 0.18, W * 0.5, W * 0.82]) { const cx = X + fx, cy = Y - 9; c.ellipse(cx, cy, 23, 23, INK); c.ellipse(cx, cy, 22, 22, [150, 164, 190]); c.ellipse(cx, cy, 19, 19, [36, 44, 64]); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3 + 0.3; c.poly([[cx, cy], [cx + Math.cos(t) * 18, cy + Math.sin(t) * 18], [cx + Math.cos(t + 0.55) * 17, cy + Math.sin(t + 0.55) * 17]], [190, 204, 226]); } c.ellipse(cx, cy, 5, 5, [240, 200, 60]); c.ellipse(cx, cy, 2, 2, INK); for (let b = -16; b <= 16; b += 8) c.rect(cx - 21, cy + b, 42, 1, [90, 104, 130, 150]); } for (let x = X + 4; x < X + W; x += 61) c.rect(x, Y + 13, 30, 2, [240, 200, 60]); }, { tall: true });
    for (const [x, y] of [[18, 33], [10, 27], [18, 23], [10, 17], [18, 13], [10, 8], [20, 9]]) k.put(x, y - 1, 3, 2, (c, X, Y, W, H) => { shade(c, X, Y, W, H); c.box(X, Y + 10, W, H - 11, [130, 144, 170], [50, 60, 84]); c.rect(X + 1, Y + 11, W - 2, 3, [200, 210, 230]); for (let s2 = 0; s2 < W - 4; s2 += 10) c.poly([[X + 2 + s2, Y + H - 3], [X + 7 + s2, Y + H - 3], [X + 11 + s2, Y + H - 9], [X + 6 + s2, Y + H - 9]], [240, 200, 60]); }, { rows: 1 });
    k.put(20, 36, 6, 4, (c, X, Y, W, H) => { c.ellipse(X + 50, Y + 36, 44, 22, [0, 0, 0, 50]); c.poly([[X + 2, Y + 26], [X + 46, Y + 18], [X + 94, Y + 26], [X + 94, Y + 34], [X + 46, Y + 38], [X + 2, Y + 34]], [226, 232, 244]); c.poly([[X + 2, Y + 26], [X + 46, Y + 18], [X + 94, Y + 26], [X + 46, Y + 24]], WHITE); c.box(X + 40, Y + 4, 14, 56, [236, 240, 250], [90, 104, 130]); c.ellipse(X + 47, Y + 4, 7, 6, [236, 240, 250]); c.rect(X + 43, Y + 3, 8, 6, [90, 170, 230]); c.rect(X + 40, Y + 30, 14, 3, RED); c.poly([[X + 30, Y + 54], [X + 47, Y + 48], [X + 64, Y + 54], [X + 64, Y + 60], [X + 30, Y + 60]], [226, 232, 244]); c.rect(X + 46, Y + 46, 2, 14, RED); for (const dx of [20, 74]) { c.box(X + dx - 4, Y + 20, 8, 12, [90, 104, 130], INK); c.rect(X + dx - 7, Y + 20, 14, 2, INK); } });
    for (const [x, y] of [[2, 39], [3, 39], [2, 20], [26, 20], [27, 20], [26, 4], [3, 4]]) tall(k, x, y + 1, 1, (c, X, Y, W, H) => P.crate(c, X, Y + H - 16, 16, 16, [(x * 37) % 2 ? 150 : 110, 150, 190]));
  },
};

// Opelucid: Drayden's hall of dragons. Stone dragon heads rear up either side of a long carpet and over the back wall.
function dragonHead(c, X, Y, flip, col = [120, 126, 150]) {   // 3 x 3 tiles
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
R.UnovaOpelucidGym = {
  theme: { room: "arena", floor: "darkpave", wall: null },
  plan(p) {
    const st = [96, 104, 132], pur = [110, 70, 170];
    const k = base(p, T.slab([70, 76, 104]), (c, X, Y, W) => { Wl.brick([60, 64, 92])(c, X, Y, W); const cx = X + W / 2; for (const d of [-1, 1]) { c.poly([[cx + d * 14, Y + 20], [cx + d * 70, Y + 2], [cx + d * 96, Y + 8], [cx + d * 76, Y + 12], [cx + d * 90, Y + 18], [cx + d * 64, Y + 18], [cx + d * 70, Y + 26], [cx + d * 40, Y + 22]], [120, 126, 150]); c.line(cx + d * 14, Y + 20, cx + d * 70, Y + 3, [170, 176, 200]); } c.poly([[cx - 16, Y + 28], [cx - 14, Y + 8], [cx - 8, Y + 2], [cx + 8, Y + 2], [cx + 14, Y + 8], [cx + 16, Y + 28]], [120, 126, 150]); c.poly([[cx - 10, Y + 6], [cx - 14, Y - 0], [cx - 5, Y + 4]], [170, 176, 200]); c.poly([[cx + 10, Y + 6], [cx + 14, Y - 0], [cx + 5, Y + 4]], [170, 176, 200]); c.rect(cx - 8, Y + 11, 4, 3, [250, 80, 70]); c.rect(cx + 4, Y + 11, 4, 3, [250, 80, 70]); c.poly([[cx - 6, Y + 20], [cx + 6, Y + 20], [cx + 4, Y + 28], [cx - 4, Y + 28]], [80, 84, 110]); for (const d of [-3, 0, 3]) c.rect(cx + d, Y + 20, 1, 3, WHITE); }, {}, pur);
    k.floor(T.carpet(pur), 13, 3, 17, 35, 0.02);
    k.art((c) => { for (let y = 3; y <= 35; y++) { c.rect(13 * S, y * S, 2, S, GOLD); c.rect(18 * S - 2, y * S, 2, S, GOLD); }
      for (const [x, y] of [[15, 28], [15, 20], [15, 12], [15, 5]]) { const X = x * S + 8, Y = y * S + 8; c.ellipse(X, Y, 40, 28, [50, 54, 78]); c.ellipse(X, Y, 37, 25, st); c.ellipse(X, Y, 37, 25, [170, 176, 200], 2); c.ellipse(X, Y, 26, 17, dk(st, 0.15), 2); for (let a = 0; a < 8; a++) c.rect(X + Math.cos(a * 0.785) * 31 - 1, Y + Math.sin(a * 0.785) * 21 - 1, 3, 3, [250, 80, 70]); }
      for (const q of p.people) if (/student/.test(q.script)) { c.box(q.x * S - 8, q.y * S - 4, 32, 26, dk(st, 0.1), [40, 44, 64]); frame(c, q.x * S - 6, q.y * S - 2, 28, 22, [170, 176, 200]); } });
    for (const y of [8, 16, 24]) { k.put(3, y, 3, 3, (c, X, Y) => dragonHead(c, X, Y, false), { rows: 1 }); k.put(24, y, 3, 3, (c, X, Y) => dragonHead(c, X, Y, true), { rows: 1 }); }
    for (const [x, y] of [[11, 4], [19, 4], [11, 33], [19, 33], [2, 4], [27, 4], [2, 33], [27, 33], [2, 14], [27, 14], [2, 22], [27, 22]]) tall(k, x, y, 1, P.torch, [110, 170, 250]);
  },
};

// Humilau: Marlon's pool. Round platforms in open water, joined by chains of lily pads.
R.UnovaHumilauGym = {
  theme: { room: "arena", floor: "sand", wall: null },
  plan(p) {
    const k = kit(p), wat = T.water([56, 140, 214]), tile = T.check([214, 238, 244], [190, 224, 236], 1);
    p.fill("water", 1, 1, p.W - 2, p.H - 2);
    p.paint(0.005, (c) => { for (let y = 2; y <= 39; y++) for (let x = 2; x <= 29; x++) if (!p.isFloor(x, y)) wat(c, x * S, y * S, x, y); Wl.plain([120, 190, 226], { base: [60, 120, 180] })(c, 2 * S, 0, 28 * S); for (let x = 2 * S + 4; x < 30 * S - 8; x += 16) { c.line(x, 16, x + 5, 11, WHITE); c.line(x + 5, 11, x + 10, 16, WHITE); c.line(x, 22, x + 5, 17, [200, 236, 250]); c.line(x + 5, 17, x + 10, 22, [200, 236, 250]); } });
    const pad = (c, X, Y, x, y) => { wat(c, X, Y, x, y); c.ellipse(X + 8, Y + 9, 8, 7, [30, 100, 80, 120]); c.ellipse(X + 8, Y + 8, 7, 6, [70, 170, 96]); c.ellipse(X + 8, Y + 8, 7, 6, [44, 130, 76], 1); c.poly([[X + 8, Y + 8], [X + 15, Y + 5], [X + 15, Y + 10]], [56, 140, 214]); c.line(X + 8, Y + 8, X + 3, Y + 5, [120, 204, 130]); c.line(X + 8, Y + 8, X + 4, Y + 12, [120, 204, 130]); if (hsh(x, y, 5) > 0.82) { c.ellipse(X + 5, Y + 6, 2, 2, [250, 170, 200]); c.p(X + 5, Y + 6, GOLD); } };
    k.floor((c, X, Y, x, y) => ((y >= 11 && y <= 15) || (y >= 21 && y <= 25) || (y >= 31 && y <= 35) || y <= 6 || y >= 39 ? tile : pad)(c, X, Y, x, y));
    k.doors({}, [90, 170, 230]);
    k.art((c) => { for (const [y0, y1, x0, x1] of [[11, 15, 5, 26], [21, 25, 5, 26], [31, 35, 5, 26], [3, 6, 14, 18]]) { frame(c, x0 * S, y0 * S, (x1 - x0 + 1) * S, (y1 - y0 + 1) * S, [250, 250, 255], 2); c.rect(x0 * S, (y1 + 1) * S, (x1 - x0 + 1) * S, 5, [130, 170, 196]); c.rect(x0 * S, (y1 + 1) * S + 5, (x1 - x0 + 1) * S, 2, [30, 90, 150, 140]); }
      for (const q of p.people) if (/lily-pad|marlon/.test(q.script)) { const X = q.x * S + 8, Y = q.y * S + 8; c.ellipse(X, Y, 22, 16, [60, 150, 200, 110]); c.ellipse(X, Y, 22, 16, [90, 170, 230], 2); }
      for (let i = 0; i < 46; i++) { const x = 2 + Math.floor(hsh(i, 3, 1) * 28), y = 2 + Math.floor(hsh(i, 3, 2) * 38); if (p.isFloor(x, y) || p.isFloor(x, y - 1) || p.isFloor(x, y + 1)) continue; const X = x * S + 8, Y = y * S + 8; if (i % 3 === 0) { c.ellipse(X, Y, 6, 5, [70, 170, 96]); c.poly([[X, Y], [X + 6, Y - 2], [X + 6, Y + 3]], [56, 140, 214]); if (i % 2) { c.ellipse(X - 1, Y - 1, 3, 3, [250, 170, 200]); c.ellipse(X - 1, Y - 1, 1, 1, GOLD); } } else if (i % 3 === 1) { c.ellipse(X, Y, 7, 3, [255, 255, 255, 90], 1); } else { c.ellipse(X, Y + 2, 6, 3, [30, 80, 150, 90]); c.poly([[X - 5, Y], [X + 2, Y - 3], [X + 5, Y], [X + 2, Y + 3]], [250, 150, 70]); c.poly([[X - 5, Y], [X - 8, Y - 3], [X - 8, Y + 3]], [250, 150, 70]); } } });
    for (const [x, y] of [[5, 11], [26, 15], [5, 25], [26, 21], [26, 31], [5, 31]]) tall(k, x, y, 1, P.plant, [60, 160, 110]);
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

module.exports = R;
