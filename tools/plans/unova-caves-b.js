// Unova caves and dungeons, second half: the Hidden Grottoes, the Funfest ore cavern, Mistralton Cave 2F,
// the Relic Passage tunnel to the PWT, Relic Castle's sand chambers, Dragonspiral Tower's upper stair, Twist
// Mountain's icy caverns, the deepest Clay Tunnel workings, Victory Road's ruined-castle caves and the Giant
// Chasm's outer cave. See README.md (caves are planned with the outdoor calls).
"use strict";
const T = 16;
const WHITE = [250, 250, 255], INK = [36, 32, 44];
const A = (col, a) => [col[0], col[1], col[2], a];
const mix = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t));
const sh = (col, f) => [0, 1, 2].map((k) => Math.max(0, Math.min(255, Math.round(col[k] * f))));

// ---------------------------------------------------------------- floor shapes (tile predicates)
const disc = (cx, cy, rx, ry = rx) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const seg = (ax, ay, bx, by, w) => (x, y) => { const px = x + 0.5 - ax, py = y + 0.5 - ay, dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - t * dx, py - t * dy) <= w; };
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const any = (...fs) => (x, y) => fs.some((f) => f(x, y));

// ---------------------------------------------------------------- palettes: wall top, wall face, the dark beyond
const PAL = {
  rock: { top: [108, 86, 72], face: [156, 120, 88], deep: [40, 30, 30], style: "rock" },
  slate: { top: [78, 84, 108], face: [118, 126, 152], deep: [24, 24, 38], style: "rock" },
  ice: { top: [140, 170, 204], face: [196, 220, 242], deep: [38, 52, 78], style: "ice" },
  frostrock: { top: [104, 112, 136], face: [150, 160, 186], deep: [30, 34, 50], style: "rock" },
  sand: { top: [176, 142, 92], face: [222, 190, 128], deep: [62, 46, 34], style: "brick" },
  stone: { top: [122, 114, 104], face: [172, 162, 146], deep: [34, 32, 36], style: "block" },
  tower: { top: [120, 132, 158], face: [178, 190, 212], deep: [18, 22, 38], style: "block" },
  clay: { top: [146, 100, 70], face: [198, 146, 98], deep: [48, 32, 28], style: "rock" },
  chasm: { top: [92, 88, 118], face: [134, 130, 162], deep: [22, 20, 34], style: "rock" },
  victory: { top: [112, 98, 92], face: [160, 140, 124], deep: [34, 28, 30], style: "rock" },
  ore: { top: [96, 82, 96], face: [146, 124, 132], deep: [30, 24, 36], style: "rock" },
};
const th = (ground, more) => ({ ground, road: ground, grass: ground, density: 0, groves: 0, ...(more || {}) });

function glow(c, cx, cy, r, col, a = 30) { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); }

// One wall tile's front face (the tile above open floor).
function face(p, c, x, y, pal, is) {
  const X = x * T, Y = y * T, f = pal.face;
  c.rect(X, Y, T, T, f);
  if (pal.style === "brick") { for (let r = 0; r < 4; r++) { c.rect(X, Y + r * 4 + 3, T, 1, sh(f, 0.7)); const o = ((r + y) & 1) * 4 + ((x & 1) * 8); for (let k = o % 8; k < T; k += 8) c.rect(X + k, Y + r * 4, 1, 3, sh(f, 0.7)); } }
  else if (pal.style === "block") { c.rect(X, Y + 7, T, 1, sh(f, 0.68)); c.rect(X + ((x & 1) ? 3 : 11), Y, 1, 7, sh(f, 0.68)); c.rect(X + ((x & 1) ? 11 : 3), Y + 8, 1, 8, sh(f, 0.68)); c.rect(X, Y + 8, T, 1, sh(f, 1.12)); }
  else if (pal.style === "ice") { for (let k = 0; k < 3; k++) { const dx = Math.floor(p.hash(x, y, k + 3) * 12); c.line(X + dx, Y + 13, X + dx + 4, Y + 3, WHITE, 1); } c.rect(X + Math.floor(p.hash(x, y, 9) * 10), Y + 4, 2, 9, sh(f, 0.82)); }
  else for (let k = 0; k < 3; k++) { const dx = Math.floor(p.hash(x, y, k + 1) * 14); c.rect(X + dx, Y + 3, 1, 5 + Math.floor(p.hash(x, y, k + 5) * 6), sh(f, 0.74)); }
  c.rect(X, Y, T, 3, sh(f, 1.22)); c.rect(X, Y + 13, T, 3, sh(f, 0.58));
  if (!is(x - 1, y + 1)) c.rect(X, Y, 1, T, sh(f, 0.55)); if (!is(x + 1, y + 1)) c.rect(X + 15, Y, 1, T, sh(f, 0.55));
  c.rect(X, Y + T, T, 3, [0, 0, 0, 46]);
}

// Dig the cave: every tile floor() accepts is open, the rest is wall drawn in the palette. Returns the helper
// the plans place their props with (props keep clear of exits, people and each other, so none can block a way).
function start(p, floor, pal, opt = {}) {
  const W = p.W, H = p.H, open = new Uint8Array(W * H), used = new Uint8Array(W * H), anchors = [...p.warps, ...p.people];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (floor(x, y)) open[y * W + x] = 1;
  for (const q of anchors) open[q.y * W + q.x] = 1;
  // Tiles the builder keeps clear (a trainer's line of sight, the tile below a person) cannot be walled: find them
  // (block() refuses a kept tile) and leave those that touch the floor open, so no wall is drawn over a walkable tile.
  const kept = new Uint8Array(W * H);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (!open[y * W + x]) { try { p.block(x, y, 1, 1); } catch (e) { kept[y * W + x] = 1; } }
  for (let again = true; again;) { again = false; for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const i = y * W + x; if (kept[i] && !open[i] && (open[i - 1] || open[i + 1] || open[i - W] || open[i + W])) { open[i] = 1; again = true; } } }
  // A kept tile out in the rock (an arrival point, the map's middle) must be reachable too: dig the shortest way to it.
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const s0 = y * W + x; if (!kept[s0] || open[s0]) continue;
    if (process.env.CAVE_DEBUG) console.log(p.name + ": kept tile outside the plan's floor at " + x + "," + y);
    const prev = new Int32Array(W * H).fill(-1), q = [s0]; prev[s0] = s0; let hit = -1;
    for (let k = 0; k < q.length && hit < 0; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d, jx = j % W, jy = (j / W) | 0; if (jx < 2 || jy < 2 || jx >= W - 2 || jy >= H - 2 || prev[j] >= 0) continue; prev[j] = q[k]; if (open[j]) { hit = q[k]; break; } q.push(j); }
    for (let j = hit; j >= 0; j = prev[j]) { open[j] = 1; if (j === s0) break; }
  }
  p.fill(opt.wall || "border", 0, 0, W - 1, H - 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (open[y * W + x]) p.fill("ground", x, y, x, y);
  const is = (x, y) => x >= 0 && y >= 0 && x < W && y < H && open[y * W + x] === 1;
  const around = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (is(x + dx, y + dy)) return true; return false; };
  if (pal) p.paint(0, (c) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (is(x, y)) continue;
      const X = x * T, Y = y * T;
      if (!around(x, y, 2)) { c.rect(X, Y, T, T, pal.deep); continue; }
      const base = around(x, y, 1) ? pal.top : mix(pal.top, pal.deep, 0.6);
      c.rect(X, Y, T, T, base);
      for (let k = 0; k < 3; k++) c.rect(X + Math.floor(p.hash(x, y, k + 11) * 13), Y + Math.floor(p.hash(x, y, k + 17) * 13), 3, 2, sh(base, k & 1 ? 1.14 : 0.86));
      if (is(x, y + 1)) face(p, c, x, y, pal, is);
      else { if (is(x - 1, y)) c.rect(X, Y, 2, T, sh(pal.top, 0.55)); if (is(x + 1, y)) c.rect(X + 14, Y, 2, T, sh(pal.top, 0.55)); if (is(x, y - 1)) { c.rect(X, Y, T, 2, sh(pal.top, 1.3)); c.rect(X, Y + 2, T, 1, sh(pal.top, 0.6)); } }
    }
  });
  const nearAnchor = (x, y, r) => anchors.some((q) => Math.abs(q.x - x) <= r && Math.abs(q.y - y) <= r);
  const cv = {
    p, is, pal, W, H,
    // A tile a one-tile prop may stand on: open all round, nothing fixed beside it, no other prop within two tiles.
    free(x, y) {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!is(x + dx, y + dy)) return false;
      if (nearAnchor(x, y, 1)) return false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && used[b * W + a]) return false; }
      return true;
    },
    put(x, y, draw, z) { if (!cv.free(x, y)) return false; try { p.block(x, y, 1, 1); } catch (e) { return false; } used[y * W + x] = 1; p.paint(z == null ? y + 1 : z, (c, top) => draw(c, top, x * T, y * T, x, y)); return true; },
    // Up to n props on free tiles picked by hash; `where` narrows the tiles.
    scatter(n, seed, draw, where) {
      let done = 0;
      for (let t = 0; t < n * 40 && done < n; t++) { const x = 2 + Math.floor(p.hash(t, seed, 1) * (W - 4)), y = 2 + Math.floor(p.hash(t, seed, 2) * (H - 4)); if (where && !where(x, y)) continue; if (cv.put(x, y, (c, top, X, Y) => draw(c, top, X, Y, done + t))) done++; }
      return done;
    },
    // A pool: water in the floor, kept clear of props.
    pool(cx, cy, rx, ry = rx) {
      const d = disc(cx, cy, rx, ry);
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (d(x, y) && is(x, y) && !nearAnchor(x, y, 1)) { p.fill("water", x, y, x, y); used[y * W + x] = 1; }
    },
    reserve(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < W && y < H) used[y * W + x] = 1; },
    // Wall faces (the wall tile above open floor), every `step`-th one picked by hash, for things hung on walls.
    onFaces(chance, seed, draw, where) {
      for (let y = 1; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (!is(x, y) && is(x, y + 1) && !is(x, y - 1) && p.hash(x, y, seed) < chance && (!where || where(x, y)) && !p.warps.some((w) => w.x === x && w.y === y + 1)) p.paint(0.4, (c, top) => draw(c, top, x * T, y * T, x, y));
    },
    // Re-tile the open floor a shape covers (never the walls).
    tile(kind, fn) { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (is(x, y) && fn(x, y)) p.fill(kind, x, y, x, y); },
    // Stair treads drawn over the open floor a shape covers.
    treads(fn, across = true) { p.paint(0.25, (c) => { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (is(x, y) && fn(x, y)) { const X = x * T, Y = y * T; for (let k = 0; k < T; k += 4) { if (across) { c.rect(X, Y + k, T, 1, [255, 255, 255, 60]); c.rect(X, Y + k + 3, T, 1, [0, 0, 0, 80]); } else { c.rect(X + k, Y, 1, T, [255, 255, 255, 60]); c.rect(X + k + 3, Y, 1, T, [0, 0, 0, 80]); } } } }); },
    // Paint on the floor only (pixels clipped to open tiles are the caller's business): a helper to test a pixel.
    floorPx: (px, py) => is(Math.floor(px / T), Math.floor(py / T)),
  };
  return cv;
}

// ---------------------------------------------------------------- the way in or out (the warp tile itself stays walkable)
function mark(p, k, type, col = [150, 140, 130]) {
  const w = p.warps[k]; if (!w) return; p.bare(k);
  p.paint(0.5, (c) => {
    const X = w.x * T, Y = w.y * T;
    if (type === "hole") { c.ellipse(X + 8, Y + 8, 8, 7, sh(col, 0.6)); c.ellipse(X + 8, Y + 9, 6, 5, [14, 12, 20]); c.rect(X + 5, Y + 1, 1, 11, [176, 132, 80]); c.rect(X + 10, Y + 1, 1, 11, [176, 132, 80]); for (let r = 0; r < 4; r++) c.rect(X + 5, Y + 2 + r * 3, 6, 1, [176, 132, 80]); }
    else if (type === "down") { c.box(X, Y, T, T, [18, 16, 24], sh(col, 0.5)); for (let r = 0; r < 4; r++) { c.rect(X + 1, Y + 1 + r * 4, 14, 3, sh(col, 1.05 - r * 0.25)); } }
    else if (type === "up") { c.box(X, Y, T, T, sh(col, 0.8), sh(col, 0.45)); for (let r = 0; r < 4; r++) { c.rect(X + 1, Y + 1 + r * 4, 14, 3, sh(col, 1.35 - r * 0.16)); c.rect(X + 1, Y + 4 + r * 4, 14, 1, sh(col, 0.6)); } }
    else if (type === "arch") { c.ellipse(X + 8, Y - 2, 9, 10, sh(col, 0.75)); c.rect(X - 1, Y - 2, 18, 18, sh(col, 0.75)); c.ellipse(X + 8, Y, 7, 8, [14, 12, 20]); c.rect(X + 1, Y, 14, 16, [14, 12, 20]); c.rect(X + 1, Y + 13, 14, 3, [48, 42, 52]); c.rect(X - 1, Y - 2, 2, 18, sh(col, 1.2)); }
    else if (type === "mouth") { c.ellipse(X + 8, Y + 8, 9, 9, sh(col, 0.62)); c.ellipse(X + 8, Y + 9, 7, 7, [16, 14, 20]); c.ellipse(X + 6, Y + 6, 2, 1, sh(col, 1.1)); }
    else if (type === "light") { for (let k2 = 4; k2 >= 1; k2--) c.ellipse(X + 8, Y + 8, 3 * k2 + 2, 2.4 * k2 + 2, [255, 250, 210, 46]); c.ellipse(X + 8, Y + 8, 6, 5, [255, 252, 230, 200]); }
    else if (type === "gap") { c.ellipse(X + 8, Y + 10, 9, 7, [24, 44, 30, 170]); c.ellipse(X + 8, Y + 11, 6, 4, [12, 24, 18, 200]); }
  });
}
const marks = (p, list, col) => list.forEach((t, k) => mark(p, k, t, col));

// ---------------------------------------------------------------- props (X, Y are the pixel corner of the prop's tile)
function rock(c, X, Y, col) { c.ellipse(X + 8, Y + 13, 7, 3, [0, 0, 0, 70]); c.ellipse(X + 8, Y + 8, 7, 6, sh(col, 0.62)); c.ellipse(X + 7, Y + 7, 6, 5, col); c.ellipse(X + 5, Y + 5, 2.5, 1.5, sh(col, 1.3)); }
function spike(c, top, X, Y, col) { c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 70]); c.poly([[X + 2, Y + 15], [X + 7, Y], [X + 12, Y + 15]], sh(col, 0.72)); c.poly([[X + 3, Y + 15], [X + 7, Y + 1], [X + 8, Y + 15]], sh(col, 1.15)); c.poly([[X + 9, Y + 15], [X + 12, Y + 6], [X + 15, Y + 15]], sh(col, 0.6)); top.poly([[X + 5, Y], [X + 7, Y - 7], [X + 9, Y]], sh(col, 0.72)); top.poly([[X + 5, Y], [X + 7, Y - 6], [X + 7, Y]], sh(col, 1.15)); }
function gem(c, top, X, Y, col, s = 1, lit = true) {
  if (lit) glow(c, X + 8, Y + 6, 20 * s, col, 22);
  c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 70]);
  const sp = (t, cx, h, w, f) => { t.poly([[cx - w, Y + 15], [cx - w + 1, Y + 15 - h * 0.6], [cx, Y + 15 - h], [cx + w - 1, Y + 15 - h * 0.55], [cx + w, Y + 15]], sh(col, 0.68 * f)); t.poly([[cx - w + 1, Y + 15], [cx - 1, Y + 15 - h * 0.6], [cx, Y + 15 - h + 1], [cx + 1, Y + 15]], sh(col, f)); t.line(cx - 1, Y + 16 - h, cx - w + 2, Y + 13, mix(col, WHITE, 0.6), 1); };
  sp(c, X + 4, 9 * s, 3, 0.9); sp(c, X + 12, 11 * s, 3, 1.1); sp(c, X + 8, 15 * s, 4, 1);
  if (s > 1) { top.poly([[X + 5, Y], [X + 8, Y + 15 - 15 * s], [X + 11, Y]], sh(col, 0.68)); top.poly([[X + 6, Y], [X + 8, Y + 16 - 15 * s], [X + 8, Y]], col); }
}
function pillar(c, top, X, Y, col, h = 26) {
  c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 80]); c.box(X + 1, Y + 9, 14, 6, sh(col, 0.85), sh(col, 0.42));
  c.rect(X + 3, Y, 10, 10, col); c.rect(X + 3, Y, 3, 10, sh(col, 1.2)); c.rect(X + 11, Y, 2, 10, sh(col, 0.7));
  top.rect(X + 3, Y + 4 - h, 10, h - 4, col); top.rect(X + 3, Y + 4 - h, 3, h - 4, sh(col, 1.2)); top.rect(X + 11, Y + 4 - h, 2, h - 4, sh(col, 0.7)); for (let k = Y - 2; k > Y + 6 - h; k -= 7) top.rect(X + 3, k, 10, 1, sh(col, 0.72));
  top.box(X + 1, Y - h, 14, 5, sh(col, 1.12), sh(col, 0.45));
}
function stump(c, top, X, Y, col, seed = 0) {
  c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 80]); c.box(X + 1, Y + 9, 14, 6, sh(col, 0.85), sh(col, 0.42));
  c.rect(X + 3, Y + 1, 10, 9, col); c.rect(X + 3, Y + 1, 3, 9, sh(col, 1.2)); c.rect(X + 11, Y + 1, 2, 9, sh(col, 0.7));
  c.poly([[X + 3, Y + 2], [X + 5, Y - 4 - (seed & 3)], [X + 8, Y], [X + 10, Y - 5 + (seed & 2)], [X + 13, Y + 2]], col); c.poly([[X + 3, Y + 2], [X + 5, Y - 3 - (seed & 3)], [X + 6, Y + 2]], sh(col, 1.2));
}
function rubble(c, top, X, Y, col, seed = 0) {
  c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]);
  c.box(X + 1, Y + 6, 8, 8, sh(col, 0.9), sh(col, 0.45)); c.rect(X + 2, Y + 7, 6, 2, sh(col, 1.2));
  c.box(X + 8, Y + 9, 7, 6, sh(col, 0.78), sh(col, 0.45)); c.rect(X + 9, Y + 10, 5, 1, sh(col, 1.1));
  c.box(X + 5 + (seed & 3), Y + 2, 6, 5, col, sh(col, 0.45)); c.rect(X + 6 + (seed & 3), Y + 3, 4, 1, sh(col, 1.25));
}
// A weathered guardian statue (Relic Castle).
function statue(c, top, X, Y, col) {
  c.ellipse(X + 8, Y + 14, 8, 3, [0, 0, 0, 80]); c.box(X, Y + 8, 16, 7, sh(col, 0.82), sh(col, 0.4)); c.rect(X + 1, Y + 9, 14, 1, sh(col, 1.15));
  c.box(X + 2, Y - 2, 12, 11, col, sh(col, 0.4)); c.rect(X + 3, Y - 1, 3, 9, sh(col, 1.18));
  top.box(X + 2, Y - 14, 12, 13, col, sh(col, 0.4)); top.rect(X + 3, Y - 13, 3, 11, sh(col, 1.18));
  top.box(X + 3, Y - 22, 10, 9, sh(col, 1.06), sh(col, 0.4)); top.rect(X + 5, Y - 19, 2, 2, [40, 30, 30]); top.rect(X + 9, Y - 19, 2, 2, [40, 30, 30]); top.rect(X + 5, Y - 16, 6, 1, [40, 30, 30]);
  top.rect(X, Y - 12, 3, 8, sh(col, 0.85)); top.rect(X + 13, Y - 12, 3, 8, sh(col, 0.7));
}
function cart(c, top, X, Y, load) { c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 80]); c.box(X + 1, Y + 3, 14, 9, [112, 82, 62], INK); c.rect(X + 2, Y + 4, 12, 2, [154, 118, 88]); c.rect(X + 2, Y + 8, 12, 1, [80, 58, 46]); c.ellipse(X + 4, Y + 13, 2, 2, INK); c.ellipse(X + 12, Y + 13, 2, 2, INK); if (load) { c.ellipse(X + 8, Y + 3, 6, 3, sh(load, 0.8)); c.ellipse(X + 6, Y + 2, 2.5, 1.5, load); c.ellipse(X + 10, Y + 2, 2, 1.5, mix(load, WHITE, 0.4)); } }
function crate(c, top, X, Y) { c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 70]); c.box(X + 1, Y + 1, 14, 13, [176, 132, 80], [78, 52, 34]); c.rect(X + 2, Y + 2, 12, 2, [210, 168, 110]); c.line(X + 2, Y + 3, X + 13, Y + 12, [120, 84, 52], 1); c.line(X + 13, Y + 3, X + 2, Y + 12, [120, 84, 52], 1); }
function mushroom(c, top, X, Y, col) { c.ellipse(X + 8, Y + 14, 5, 2, [0, 0, 0, 60]); c.rect(X + 6, Y + 7, 4, 7, [232, 226, 210]); c.rect(X + 9, Y + 7, 1, 7, [180, 172, 160]); c.ellipse(X + 8, Y + 6, 7, 4.5, sh(col, 0.7)); c.ellipse(X + 8, Y + 5, 6, 3.5, col); c.ellipse(X + 5, Y + 4, 1.5, 1, WHITE); c.ellipse(X + 10, Y + 5, 1, 1, WHITE); }
function treeStump(c, top, X, Y) { c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.box(X + 2, Y + 5, 12, 9, [124, 86, 54], [62, 40, 28]); c.ellipse(X + 8, Y + 5, 6, 3, [62, 40, 28]); c.ellipse(X + 8, Y + 5, 5, 2.2, [206, 170, 116]); c.ellipse(X + 8, Y + 5, 2.5, 1, [170, 130, 84]); c.rect(X + 1, Y + 12, 3, 2, [90, 130, 70]); c.rect(X + 11, Y + 12, 4, 2, [90, 130, 70]); }
function bushy(c, top, X, Y, col) { c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 60]); c.ellipse(X + 8, Y + 8, 8, 7, sh(col, 0.6)); c.ellipse(X + 7, Y + 7, 6.5, 5.5, col); c.ellipse(X + 5, Y + 5, 3, 2, sh(col, 1.25)); c.ellipse(X + 11, Y + 9, 2, 1.5, sh(col, 1.18)); }
function lamp(c, top, X, Y) { glow(c, X + 8, Y + 9, 22, [255, 214, 120], 26); c.rect(X + 7, Y + 2, 2, 4, [70, 60, 56]); c.box(X + 5, Y + 5, 6, 8, [250, 214, 110], [70, 54, 40]); c.rect(X + 7, Y + 7, 2, 4, [255, 248, 200]); c.rect(X + 4, Y + 4, 8, 2, [90, 70, 56]); }
// Mine rails along tile centres through the points (orthogonal runs).
function rails(c, pts, is) {
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], hz = ay === by, n = Math.abs(bx - ax) + Math.abs(by - ay);
    for (let t = 0; t <= n; t++) {
      const x = ax + Math.sign(bx - ax) * t, y = ay + Math.sign(by - ay) * t; if (is && !is(x, y)) continue; const X = x * T, Y = y * T;
      for (let k = 2; k < T; k += 5) { if (hz) c.rect(X + k, Y + 2, 2, 12, [116, 82, 54]); else c.rect(X + 2, Y + k, 12, 2, [116, 82, 54]); }
      for (const o of [4, 10]) { if (hz) { c.rect(X, Y + o, T, 2, [176, 182, 196]); c.rect(X, Y + o + 1, T, 1, [92, 96, 112]); } else { c.rect(X + o, Y, 2, T, [176, 182, 196]); c.rect(X + o + 1, Y, 1, T, [92, 96, 112]); } }
    }
  }
}
// A timber frame across a north-south tunnel: posts in the walls either side, the beam overhead.
function timber(c, top, x0, x1, y) { const X = x0 * T, Y = y * T, w = (x1 - x0 + 1) * T; for (const dx of [-5, w - 1]) { c.box(X + dx, Y - 10, 6, 26, [156, 112, 66], [72, 48, 32]); c.rect(X + dx + 1, Y - 9, 2, 24, [196, 152, 98]); } top.box(X - 7, Y - 15, w + 14, 7, [172, 126, 76], [72, 48, 32]); top.rect(X - 6, Y - 14, w + 12, 2, [206, 162, 106]); }
// Steps drawn across floor tiles x0..x1, y0..y1 (treads run across a north-south stair).
function steps(c, x0, y0, x1, y1, col, across = true) {
  const X = x0 * T, Y = y0 * T, w = (x1 - x0 + 1) * T, h = (y1 - y0 + 1) * T;
  c.rect(X, Y, w, h, col);
  if (across) { for (let k = 0; k < h; k += 4) { c.rect(X, Y + k, w, 1, sh(col, 1.25)); c.rect(X, Y + k + 3, w, 1, sh(col, 0.62)); } c.rect(X, Y, 2, h, sh(col, 0.7)); c.rect(X + w - 2, Y, 2, h, sh(col, 0.7)); }
  else { for (let k = 0; k < w; k += 4) { c.rect(X + k, Y, 1, h, sh(col, 1.25)); c.rect(X + k + 3, Y, 1, h, sh(col, 0.62)); } c.rect(X, Y, w, 2, sh(col, 0.7)); c.rect(X, Y + h - 2, w, 2, sh(col, 0.7)); }
}
// A quicksand pit: a swirl sinking into the sand (drawn only; you walk over it).
function quicksand(c, cx, cy, rx, ry) {
  const S = [226, 196, 132];
  c.ellipse(cx, cy, rx, ry, sh(S, 0.9)); c.ellipse(cx, cy, rx, ry, sh(S, 0.72), 1.5);
  for (let k = 1; k <= 4; k++) c.ellipse(cx + k, cy + k * 0.5, rx * (1 - k * 0.2), ry * (1 - k * 0.2), sh(S, 0.9 - k * 0.07));
  for (let k = 1; k <= 3; k++) c.ellipse(cx + k, cy + k * 0.5, rx * (1 - k * 0.2), ry * (1 - k * 0.2), sh(S, 0.62), 1);
  c.ellipse(cx + 4, cy + 2, Math.max(2, rx * 0.12), Math.max(1.5, ry * 0.12), [96, 70, 44]);
}
// A sheet of ice on the floor.
function iceSheet(p, c, cx, cy, rx, ry) {
  c.ellipse(cx, cy, rx, ry, [206, 232, 250, 215]); c.ellipse(cx, cy, rx, ry, [244, 250, 255], 1.5);
  for (let k = 0; k < 6; k++) { const a = cx + (p.hash(k, cx, 71) - 0.5) * rx * 1.3, b = cy + (p.hash(k, cy, 73) - 0.5) * ry * 1.2, d = 6 + p.hash(k, 3, 75) * 10; c.line(a, b, a + d, b - d / 3, [252, 254, 255], 1); c.line(a + 2, b + 3, a + d - 2, b + 3 - d / 3, [160, 200, 236], 1); }
}

const PLANS = {};

// ---------------------------------------------------------------- Hidden Grottoes
// A small leafy hollow in the trees: a sunlit clearing with the find at its head and flowers round it.
// One design, varied by number: the clearing's shape, the ground, the flowers, a pond, stumps and mushrooms.
function grotto(i) {
  const spec = { 9: ["frost", "pine"], 2: ["shade", "darktree"], 14: ["shade", "darktree"], 15: ["shade", "darktree"], 12: ["meadow", "tree"], 13: ["meadow", "tree"], 3: ["autumn", "autumntree"], 4: ["autumn", "autumntree"] }[i] || [["shade", "grass", "meadow"][i % 3], "tree"];
  const ground = spec[0], wall = spec[1];
  return {
    theme: th(ground, { border: wall, grove: wall, cave: false }),
    plan(p) {
      const v = i % 4;
      const shape = [disc(12, 11, 7.6, 6.2), disc(12, 11.5, 9, 5.2), any(disc(9, 9.5, 5.6, 5), disc(15.5, 12.5, 5.6, 4.8)), any(disc(12, 8, 6.4, 4.4), rect(9, 8, 15, 16), disc(12, 15, 5, 2.6))][v];
      const cv = start(p, any(shape, disc(12.5, 6.5, 3.2, 2.7), seg(12, 11, 6.5, 16, 1.5), disc(6.5, 16.3, 2.5, 2.1), seg(12.5, 12, 12.5, 19.6, 1.3)), null, { wall });
      const flowers = ["flowersRed", "flowersBlue", "flowersPink"][i % 3];
      // The flower ring round the find, the worn path in from the gap in the trees.
      for (let y = 4; y <= 8; y++) for (let x = 9; x <= 15; x++) if (cv.is(x, y) && ((x + 0.5 - 12.5) / 3.2) ** 2 + ((y + 0.5 - 6.5) / 2.2) ** 2 <= 1 && !(x === 12 && y >= 6)) p.fill(flowers, x, y, x, y);
      if (i % 2 === 0) p.street("dirt", 1, [[12, 19], [12, 15]]);
      if (v === 0 || v === 1) { if (i % 5 < 3) cv.pool(17, 12.5, 1.9, 1.3); }
      if (v === 2 && i % 5 < 3) cv.pool(16.5, 14, 1.7, 1.2);
      mark(p, 0, "gap");
      const leaf = ground === "frost" ? [150, 190, 180] : ground === "autumn" ? [206, 130, 50] : [70, 150, 78];
      const caps = [[226, 80, 70], [240, 190, 80], [150, 120, 220], [240, 240, 250]];
      const kinds = [(c, top, X, Y) => treeStump(c, top, X, Y), (c, top, X, Y, k) => mushroom(c, top, X, Y, caps[(k + i) % caps.length]), (c, top, X, Y) => bushy(c, top, X, Y, leaf), (c, top, X, Y) => rock(c, X, Y, [128, 140, 122])];
      for (let k = 0; k < 4; k++) cv.scatter(k === 1 ? 3 : 2, 300 + i * 7 + k, kinds[(k + i) % 4]);
      // Sunlight falling through the canopy onto the find.
      p.paint(0.3, (c) => { const X = 12 * T + 8, Y = 6 * T + 8; c.ellipse(X, Y + 2, 26, 15, [255, 250, 200, 36]); c.ellipse(X, Y + 2, 17, 10, [255, 250, 200, 44]); });
      // Small flowers and tufts in the grass.
      p.paint(0.2, (c) => { for (let t = 0; t < 26; t++) { const x = 2 + Math.floor(p.hash(t, i, 81) * 20), y = 2 + Math.floor(p.hash(t, i, 83) * 18); if (!cv.is(x, y)) continue; const X = x * T + 3 + Math.floor(p.hash(t, 1, 85) * 9), Y = y * T + 4 + Math.floor(p.hash(t, 2, 85) * 9); if (t % 3) { c.rect(X, Y, 1, 3, sh(leaf, 0.7)); c.rect(X + 2, Y - 1, 1, 4, sh(leaf, 0.8)); c.rect(X + 4, Y, 1, 3, sh(leaf, 0.7)); } else { c.rect(X, Y, 3, 3, WHITE); c.rect(X + 1, Y + 1, 1, 1, [250, 210, 80]); } } });
    },
  };
}
for (let i = 0; i < 20; i++) PLANS["UnovaHiddenGrotto" + i] = grotto(i);

// ---------------------------------------------------------------- shared prop closures
const ROCK = (col) => (c, top, X, Y) => rock(c, X, Y, col);
const SPIKE = (col) => (c, top, X, Y) => spike(c, top, X, Y, col);
const GEM = (cols, s = 1) => (c, top, X, Y, k) => gem(c, top, X, Y, cols[k % cols.length], s);
const RUBBLE = (col) => (c, top, X, Y, k) => rubble(c, top, X, Y, col, k);
const ICE = [[170, 222, 250], [200, 236, 255], [150, 200, 244]];
const ORES = [[110, 200, 250], [250, 130, 200], [250, 220, 110], [130, 230, 160], [190, 140, 250], [250, 150, 90]];
const CASTLE = [186, 190, 208];

// ---------------------------------------------------------------- Funfest ore cavern
// A broad glittering cavern: ore crystals of every colour, the miners' rails crossing its floor.
PLANS.UnovaFunfestCavern = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(22.5, 34, 6, 3.4), seg(22.5, 32, 22.5, 24, 2.2), disc(22, 16, 15, 9.5), disc(7.5, 27, 4.2, 4), seg(9, 24, 12, 21, 1.8), disc(36.5, 27, 4.2, 4), seg(35, 24, 32, 21, 1.8)), PAL.ore);
    mark(p, 0, "light");
    p.paint(0.2, (c) => { rails(c, [[10, 16], [34, 16]], cv.is); rails(c, [[22, 8], [22, 30]], cv.is); });
    for (const [x, y, k] of [[14, 15, 0], [30, 17, 2], [21, 11, 4], [23, 21, 1]]) cv.put(x, y, (c, top, X, Y) => cart(c, top, X, Y, ORES[k]));
    for (const [x, y, k] of [[12, 11, 0], [31, 11, 1], [10, 20, 2], [33, 21, 3], [17, 22, 4], [27, 9, 5], [7, 27, 1], [37, 27, 0], [17, 9, 3], [27, 22, 2]]) cv.put(x, y, (c, top, X, Y) => gem(c, top, X, Y, ORES[k], 1.7));
    cv.scatter(22, 11, GEM(ORES)); cv.scatter(8, 12, ROCK([140, 122, 130])); cv.scatter(4, 13, crate);
    cv.onFaces(0.16, 14, lamp);
    cv.onFaces(0.3, 15, (c, top, X, Y, x, y) => { const col = ORES[Math.floor(p.hash(x, y, 16) * ORES.length)]; glow(c, X + 8, Y + 8, 12, col, 26); c.poly([[X + 4, Y + 12], [X + 7, Y + 3], [X + 10, Y + 12]], sh(col, 0.75)); c.poly([[X + 5, Y + 12], [X + 7, Y + 4], [X + 8, Y + 12]], col); c.poly([[X + 9, Y + 13], [X + 12, Y + 7], [X + 14, Y + 13]], mix(col, WHITE, 0.3)); });
  },
};

// ---------------------------------------------------------------- Mistralton Cave 2F
// Dark blue-grey chambers strung on winding passages, Strength boulders in the way, the stair to the Guidance Chamber.
PLANS.UnovaMistraltonCave2 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.6), seg(6, 30.5, 18, 31, 1.7), disc(18.5, 30.5, 4, 2.8), seg(8, 28, 12.5, 27, 1.9), seg(12.5, 27, 18, 21, 1.9), disc(19, 19, 6.2, 4.4), seg(18.5, 28, 19, 23, 1.5), seg(24, 19, 30, 17, 1.8), disc(33.5, 17, 5, 3.8), seg(34.5, 14, 36, 8, 1.8), disc(36, 5.6, 3.6, 3.2), disc(5, 5, 3.4, 2.8), seg(6, 6, 14, 15, 1.6), seg(18.5, 30.5, 25.5, 30.5, 1.5), seg(4.5, 6, 4.5, 11.6, 1.4)), PAL.slate);
    marks(p, ["hole", "up"], [150, 156, 180]);
    // The carved stone threshold of the Guidance Chamber.
    cv.tile("ruinFloor", disc(36.5, 5, 2.6, 2.2));
    cv.scatter(16, 21, SPIKE([120, 126, 150])); cv.scatter(9, 22, ROCK([110, 116, 140])); cv.scatter(6, 23, GEM([[96, 120, 210], [120, 150, 230]]));
    p.paint(0.2, (c) => { for (let t = 0; t < 40; t++) { const x = 2 + Math.floor(p.hash(t, 5, 91) * 38), y = 2 + Math.floor(p.hash(t, 6, 91) * 32); if (cv.is(x, y) && cv.is(x + 1, y)) { c.ellipse(x * T + 8, y * T + 9, 6, 3, [40, 46, 80, 50]); } } });
  },
};

// ---------------------------------------------------------------- Relic Passage (PWT tunnel)
// The ancient carved corridor: squared stone galleries, a pillared hall, drifts of sand and fallen blocks.
PLANS.UnovaRelicPassagePWT = {
  theme: th("ruinFloor"),
  plan(p) {
    const cv = start(p, any(rect(3, 27, 9, 32), rect(9, 28, 36, 31), rect(25, 25, 29, 27), rect(33, 7, 36, 28), rect(31, 2, 39, 7), rect(12, 15, 33, 18), rect(4, 10, 14, 22), rect(6, 22, 8, 27)), PAL.stone);
    marks(p, ["down", "up"], [176, 166, 150]);
    cv.tile("desert", any(disc(4, 31.5, 2.4, 1.6), disc(30, 31.6, 3, 1.2), disc(13.5, 21.5, 2.6, 1.6), disc(35.5, 20, 1.6, 2.6), disc(22, 15.2, 3, 1.1), disc(38.5, 6.5, 1.6, 1.4)));
    for (const [x, y, b] of [[6, 12, 0], [9, 12, 1], [12, 12, 0], [6, 16, 0], [12, 16, 0], [6, 20, 1], [9, 20, 0], [12, 20, 0]]) cv.put(x, y, (c, top, X, Y) => (b ? stump(c, top, X, Y, [182, 172, 156], x) : pillar(c, top, X, Y, [182, 172, 156])));
    cv.scatter(7, 31, RUBBLE([168, 158, 142]));
    // Carved bands and pilasters along the walls.
    cv.onFaces(1, 32, (c, top, X, Y, x) => { if (x % 4 === 0) { c.box(X + 4, Y, 8, 16, [190, 180, 164], [96, 88, 80]); c.rect(X + 5, Y + 1, 2, 14, [214, 204, 188]); c.rect(X + 3, Y, 10, 2, [206, 196, 180]); c.rect(X + 3, Y + 13, 10, 3, [130, 122, 110]); } else if (x % 4 === 2) { c.box(X + 3, Y + 4, 10, 7, [150, 140, 126], [96, 88, 80]); c.rect(X + 5, Y + 6, 2, 3, [96, 88, 80]); c.rect(X + 9, Y + 6, 2, 3, [96, 88, 80]); c.rect(X + 6, Y + 7, 4, 1, [200, 170, 90]); } });
  },
};

// ---------------------------------------------------------------- Relic Castle chambers
// Sand-filled halls of sandstone brick: quicksand pits swirling in the floor, guardian statues, pillars, stairs.
const SANDSTONE = [212, 182, 126];
function relic(p, rooms, o) {
  const cv = start(p, any(...rooms.map((r) => rect(r[0], r[1], r[2], r[3]))), PAL.sand);
  marks(p, o.marks, SANDSTONE);
  // Wind ripples in the sand.
  p.paint(0.1, (c) => { for (let y = 2; y < p.H - 2; y++) for (let x = 2; x < p.W - 2; x++) if (cv.is(x, y) && p.hash(x, y, 41) < 0.3) { const X = x * T + Math.floor(p.hash(x, y, 42) * 6), Y = y * T + 3 + Math.floor(p.hash(x, y, 43) * 9); c.rect(X, Y, 7, 1, [150, 110, 60, 70]); c.rect(X + 2, Y + 1, 7, 1, [255, 240, 200, 70]); } });
  for (const [cx, cy, rx, ry] of o.pits || []) p.paint(0.2, (c) => quicksand(c, cx * T, cy * T, rx * T, ry * T));
  for (const [x, y] of o.statues || []) cv.put(x, y, (c, top, X, Y) => statue(c, top, X, Y, SANDSTONE));
  (o.pillars || []).forEach(([x, y], k) => cv.put(x, y, (c, top, X, Y) => (k % 3 === 2 ? stump(c, top, X, Y, SANDSTONE, k) : pillar(c, top, X, Y, SANDSTONE))));
  cv.scatter(o.rubble == null ? 6 : o.rubble, 44 + rooms.length, RUBBLE([196, 164, 110]));
  // A carved frieze on the walls.
  cv.onFaces(0.4, 45, (c, top, X, Y, x, y) => { const k = Math.floor(p.hash(x, y, 46) * 4), D = [128, 96, 56]; if (k === 0) { c.ellipse(X + 8, Y + 8, 3, 3, D, 1); c.rect(X + 7, Y + 7, 2, 2, D); } else if (k === 1) { c.rect(X + 4, Y + 5, 8, 1, D); c.rect(X + 4, Y + 8, 8, 1, D); c.rect(X + 4, Y + 11, 8, 1, D); } else if (k === 2) { c.poly([[X + 4, Y + 11], [X + 8, Y + 4], [X + 12, Y + 11]], D); c.poly([[X + 6, Y + 10], [X + 8, Y + 7], [X + 10, Y + 10]], PAL.sand.face); } else { c.rect(X + 5, Y + 4, 2, 8, D); c.rect(X + 9, Y + 4, 2, 8, D); c.rect(X + 5, Y + 7, 6, 2, D); } });
  return cv;
}
PLANS.UnovaRelicCastleChamber16 = {
  theme: th("desert"),
  plan(p) { relic(p, [[6, 9, 34, 27], [32, 2, 39, 8], [30, 6, 34, 10], [12, 27, 28, 32]], { marks: ["down", "up"], pits: [[20.5, 18.5, 5.5, 3.4], [15, 30.5, 2.2, 1.2], [26, 30.5, 2.2, 1.2]], statues: [[10, 10], [16, 10], [24, 10], [34, 3]], pillars: [[9, 15], [31, 15], [9, 22], [31, 22], [14, 25], [26, 25], [13, 14], [27, 14]] }); },
};
PLANS.UnovaRelicCastleChamber17 = {
  theme: th("desert"),
  plan(p) { relic(p, [[26, 2, 39, 14], [22, 7, 26, 10], [5, 4, 22, 18], [11, 18, 14, 23], [6, 23, 32, 32]], { marks: ["down", "up"], pits: [[13.5, 11.5, 4.2, 2.6], [19, 28, 5, 2.6], [31, 10, 2.6, 1.7]], statues: [[8, 5], [19, 5], [9, 24], [29, 24]], pillars: [[29, 4], [29, 13], [7, 16], [20, 16], [8, 30], [30, 30], [34, 12]] }); },
};
PLANS.UnovaRelicCastleChamber19 = {
  theme: th("desert"),
  plan(p) {
    const cv = relic(p, [[3, 26, 18, 33], [15, 15, 18, 26], [8, 9, 30, 16], [27, 5, 30, 9], [26, 2, 39, 8]], { marks: ["down"], pits: [[19, 12.5, 5, 2.4], [9.5, 30, 3, 1.8]], statues: [[32, 3], [38, 3], [10, 10], [24, 10]], pillars: [[6, 28], [13, 28], [10, 14], [28, 14]], rubble: 8 });
    // The treasure's stone slab.
    p.paint(0.2, (c) => { c.box(34 * T - 4, 2 * T + 4, 3 * T + 8, 2 * T + 6, [226, 200, 150], [128, 96, 56]); c.rect(34 * T - 2, 2 * T + 6, 3 * T + 4, 2, [246, 226, 180]); c.rect(34 * T, 4 * T + 6, 3 * T, 3, [150, 116, 70]); }); void cv;
  },
};
PLANS.UnovaRelicCastleChamber21 = {
  theme: th("desert"),
  plan(p) { relic(p, [[3, 25, 16, 33], [13, 21, 16, 25], [12, 12, 29, 21], [26, 9, 29, 12], [25, 2, 39, 9]], { marks: ["up", "mouth"], pits: [[20.5, 16.5, 4.6, 2.6], [8.5, 29.5, 3, 1.8], [30, 5.5, 2.4, 1.5]], statues: [[14, 13], [22, 13], [27, 3]], pillars: [[5, 27], [5, 31], [14, 19], [27, 19], [35, 8], [33, 3]] }); },
};
PLANS.UnovaRelicCastleChamber22 = {
  theme: th("desert"),
  plan(p) {
    relic(p, [[3, 26, 10, 33], [8, 11, 34, 27], [32, 5, 39, 12], [17, 27, 25, 32]], { marks: ["down", "up", "arch"], pits: [[21, 19, 6, 3]], pillars: [[11, 14], [15, 14], [19, 14], [23, 14], [27, 14], [31, 14], [11, 24], [15, 24], [19, 24], [23, 24], [27, 24], [31, 24]], statues: [[34, 7], [34, 11]], rubble: 4 });
    // The sanctum door, guardians carved either side of it.
    p.paint(0.6, (c) => { for (const x of [35, 39]) { const X = x * T, Y = 4 * T; c.box(X + 2, Y - 8, 12, 22, SANDSTONE, [106, 78, 46]); c.rect(X + 3, Y - 7, 3, 20, sh(SANDSTONE, 1.15)); c.rect(X + 5, Y - 3, 2, 2, [60, 40, 30]); c.rect(X + 9, Y - 3, 2, 2, [60, 40, 30]); c.rect(X + 5, Y + 2, 6, 1, [60, 40, 30]); } c.rect(36 * T, 4 * T - 12, 3 * T, 3, [236, 196, 90]); });
  },
};

// ---------------------------------------------------------------- Dragonspiral Tower, upper stair
// The round tower floor: a ring of worn flagstones round the open well, broken pillars, the ramp spiralling up.
PLANS.UnovaDragonspiral8 = {
  theme: th("hallFloor"),
  plan(p) {
    const CX = 21, CY = 18, ring = (x, y) => disc(CX, CY, 15, 13)(x, y) && !disc(CX, CY, 5.6, 4.6)(x, y);
    const cv = start(p, any(ring, rect(3, 28, 9, 33), seg(7, 30, 11, 26.5, 1.9), rect(31, 2, 39, 7), seg(35, 6.5, 31, 9.5, 1.9)), PAL.tower);
    marks(p, ["down", "up"], [178, 190, 212]);
    // The well in the middle: the floors below, falling away into the dark.
    p.paint(0.1, (c) => { const X = CX * T, Y = CY * T; c.ellipse(X, Y, 5.3 * T, 4.3 * T, [150, 162, 188]); c.ellipse(X, Y + 3, 4.9 * T, 3.9 * T, [70, 80, 110]); c.ellipse(X, Y + 6, 4.4 * T, 3.4 * T, [44, 52, 80]); c.ellipse(X, Y + 9, 3.6 * T, 2.7 * T, [26, 30, 54]); c.ellipse(X, Y + 11, 2.6 * T, 1.9 * T, [12, 14, 30]); c.ellipse(X, Y + 6, 4.4 * T, 3.4 * T, [96, 108, 140], 1); c.ellipse(X, Y + 9, 3.6 * T, 2.7 * T, [70, 80, 110], 1); });
    // The spiral ramp: treads fanning round the ring.
    p.paint(0.25, (c) => { const X = CX * T, Y = CY * T; for (let a = 100; a <= 215; a += 5) { const r = a * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); c.line(X + cs * 6.4 * T, Y + sn * 5.4 * T, X + cs * 14 * T, Y + sn * 12 * T, [60, 70, 100, 110], 1); c.line(X + cs * 6.4 * T + 1, Y + sn * 5.4 * T + 1, X + cs * 14 * T + 1, Y + sn * 12 * T + 1, [255, 255, 255, 90], 1); } for (let a = 285; a <= 395; a += 5) { const r = a * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); c.line(X + cs * 6.4 * T, Y + sn * 5.4 * T, X + cs * 14 * T, Y + sn * 12 * T, [60, 70, 100, 110], 1); c.line(X + cs * 6.4 * T + 1, Y + sn * 5.4 * T + 1, X + cs * 14 * T + 1, Y + sn * 12 * T + 1, [255, 255, 255, 90], 1); } });
    const COL = [188, 198, 218];
    for (let k = 0; k < 12; k++) { const a = (k * 30 + 15) * Math.PI / 180, x = Math.round(CX - 0.5 + Math.cos(a) * 8.2), y = Math.round(CY - 0.5 + Math.sin(a) * 7); cv.put(x, y, (c, top, X, Y) => (k % 3 === 1 ? stump(c, top, X, Y, COL, k) : pillar(c, top, X, Y, COL))); }
    for (let k = 0; k < 10; k++) { const a = (k * 36) * Math.PI / 180, x = Math.round(CX - 0.5 + Math.cos(a) * 12.6), y = Math.round(CY - 0.5 + Math.sin(a) * 10.6); cv.put(x, y, (c, top, X, Y) => (k % 2 ? stump(c, top, X, Y, COL, k + 1) : pillar(c, top, X, Y, COL))); }
    cv.scatter(8, 51, RUBBLE([168, 178, 200]));
    // Narrow windows and dragon reliefs round the wall.
    cv.onFaces(0.3, 52, (c, top, X, Y, x, y) => { if (p.hash(x, y, 53) < 0.5) { c.box(X + 5, Y + 2, 6, 11, [150, 200, 240], [70, 80, 110]); c.rect(X + 6, Y + 3, 2, 9, [220, 240, 255]); } else { c.ellipse(X + 8, Y + 8, 5, 5, [110, 122, 150], 1); c.poly([[X + 5, Y + 10], [X + 8, Y + 4], [X + 11, Y + 10]], [110, 122, 150]); } });
  },
};

// ---------------------------------------------------------------- Twist Mountain caverns
const FROST = [150, 160, 186];
function iceFloor(p, cv, list) { p.paint(0.2, (c) => { for (const [cx, cy, rx, ry] of list) iceSheet(p, c, cx * T, cy * T, rx * T, ry * T); }); }
// Cavern 1: the miners' gallery, plank walkways under timber frames, frost creeping in.
PLANS.UnovaTwistCavern3 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.8), seg(6, 30.5, 20, 30.5, 1.6), seg(19.5, 30, 19.5, 7, 1.6), disc(18, 7, 5.2, 3.2), seg(19, 6.5, 35, 6.5, 1.6), disc(36.5, 4.8, 3.3, 2.9), seg(19.5, 22.5, 34, 22.5, 1.6), disc(35, 23, 4.6, 3.8), seg(36.5, 20, 36.5, 7, 1.6)), PAL.frostrock);
    marks(p, ["mouth", "hole", "mouth"], FROST);
    p.street("deck", 1, [[9, 30], [19, 30], [19, 9]]); p.street("deck", 1, [[20, 22], [31, 22]]); p.street("deck", 1, [[22, 6], [33, 6]]);
    for (const y of [27, 18, 13]) p.paint(y + 1, (c, top) => timber(c, top, 18, 20, y));
    for (const y of [17, 11]) p.paint(y + 1, (c, top) => timber(c, top, 35, 37, y));
    iceFloor(p, cv, [[5, 32, 2.2, 1], [16, 8, 2, 1], [36, 25.3, 2.4, 1], [38, 5.6, 1.4, 0.8]]);
    cv.scatter(8, 61, GEM(ICE)); cv.scatter(6, 62, ROCK(FROST)); cv.scatter(4, 63, crate); cv.scatter(5, 64, SPIKE([170, 190, 220]));
    cv.onFaces(0.14, 65, lamp);
  },
};
// Cavern 2: the frozen pond in the great hollow, ice walls all round.
PLANS.UnovaTwistCavern4 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(5.5, 30.2, 4, 3.4), seg(5.5, 29, 5.5, 22, 1.7), disc(6.5, 22, 5, 3.4), seg(5.5, 20, 5.5, 7, 1.6), disc(5.5, 5.8, 3.6, 3), seg(6, 6.5, 26, 7, 1.6), disc(26, 7, 4.2, 3), seg(28, 7, 36, 5.5, 1.6), disc(36.5, 5, 3.2, 2.8), disc(20.5, 18.5, 11, 7.5), seg(10, 22.5, 14, 20, 1.8), disc(35, 29, 4.6, 3.4), seg(28, 23, 35, 28, 1.9), seg(24, 9, 22, 12, 1.6)), PAL.ice);
    marks(p, ["hole", "mouth", "mouth"], [170, 196, 226]);
    cv.tile("snow", any(disc(12, 16, 3, 2), disc(29, 21, 3, 2), disc(6, 22, 3.4, 1.6), disc(35.5, 30, 3, 1.6), disc(5.5, 5, 2.4, 1.6), disc(26, 6.5, 3, 1.6)));
    iceFloor(p, cv, [[20.5, 19.5, 6.4, 3.4], [5.5, 13, 1.1, 2.6], [15, 7, 3, 0.9]]);
    for (const [x, y] of [[12, 19], [29, 16], [16, 13], [25, 24], [20, 24]]) cv.put(x, y, (c, top, X, Y) => gem(c, top, X, Y, ICE[0], 1.7));
    cv.scatter(12, 66, GEM(ICE)); cv.scatter(8, 67, SPIKE([190, 214, 240])); cv.scatter(4, 68, ROCK([170, 190, 216]));
  },
};
// Cavern 3: the tunnels under Icirrus, snow blown in from the city gate.
PLANS.UnovaTwistCavern5 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30.2, 4.4, 3.4), seg(6, 30.8, 34, 30.5, 1.6), disc(36, 30, 3.8, 3.4), seg(5.5, 29, 5.5, 7, 1.6), disc(5, 5.5, 3.6, 3), seg(6, 5.8, 32, 5.5, 1.6), disc(35.5, 4.6, 4.2, 2.9), seg(36.5, 7, 36.5, 27, 1.6), disc(20.5, 18, 8, 5.6), seg(5.5, 18, 13, 18, 1.6), seg(28, 18, 36.5, 18, 1.6)), PAL.frostrock);
    marks(p, ["hole", "mouth", "light", "mouth"], FROST);
    cv.tile("snow", any(disc(35.5, 5, 7.5, 4.5), seg(36.5, 7, 36.5, 15, 2.4), disc(27, 5.5, 3, 2)));
    cv.tile("drift", any(disc(20.5, 18, 4, 2.6), disc(36, 22, 2, 3), disc(18, 5.5, 3, 1.6), disc(36, 30, 2.6, 1.6)));
    p.street("deck", 1, [[10, 31], [32, 31]]);
    for (const y of [25, 13]) p.paint(y + 1, (c, top) => timber(c, top, 4, 6, y));
    for (const y of [23, 12]) p.paint(y + 1, (c, top) => timber(c, top, 35, 37, y));
    iceFloor(p, cv, [[20.5, 20.5, 3.4, 1.4], [9, 18, 2, 0.9]]);
    cv.scatter(10, 71, GEM(ICE)); cv.scatter(6, 72, ROCK(FROST)); cv.scatter(4, 73, crate); cv.scatter(5, 74, SPIKE([170, 190, 220]));
    cv.onFaces(0.12, 75, lamp);
  },
};
// Cavern 4: the deep ice cave, great crystals and a meltwater pool, the clay showing through by the tunnel.
PLANS.UnovaTwistCavern6 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.6), seg(6, 30, 16, 22, 2.1), disc(18, 20, 7, 5.4), seg(20, 18, 28, 11.5, 2), disc(29, 11, 5.2, 4), seg(31, 9, 36, 5.5, 1.9), disc(36.5, 4.6, 3.3, 2.9), seg(22, 22, 30, 25.5, 1.7), disc(31, 26, 5.4, 4.2)), PAL.ice);
    marks(p, ["mouth", "mouth", "up"], [170, 196, 226]);
    cv.tile("clay", any(disc(37, 5.5, 3, 2.2), disc(33.5, 8, 2, 1.6)));
    cv.tile("snow", any(disc(17, 20, 4, 2.6), disc(29, 11.5, 3, 2), disc(6, 30.5, 3, 1.8)));
    cv.pool(32, 26.5, 2.7, 1.7);
    iceFloor(p, cv, [[18, 22.5, 4, 1.6], [28, 13.5, 2.6, 1], [27, 26, 1.6, 2]]);
    for (const [x, y] of [[14, 18], [22, 17], [26, 9], [32, 13], [28, 24], [9, 28], [20, 23]]) cv.put(x, y, (c, top, X, Y) => gem(c, top, X, Y, ICE[(x + y) % 3], 1.8));
    cv.scatter(14, 76, GEM(ICE)); cv.scatter(8, 77, SPIKE([190, 214, 240]));
  },
};

// ---------------------------------------------------------------- Clay Tunnel, deepest workings
// Squared mine galleries in red clay: cart rails down every gallery, timber frames, lamps on the walls.
PLANS.UnovaClayTunnelDeepest = {
  theme: th("clay"),
  plan(p) {
    const cv = start(p, any(rect(3, 9, 7, 33), rect(7, 28, 34, 32), rect(32, 9, 36, 28), rect(7, 13, 32, 17), rect(31, 5, 39, 9), rect(18, 17, 22, 28), rect(13, 9, 17, 13)), PAL.clay);
    marks(p, ["mouth", "hole", "arch"], [150, 146, 150]);
    p.paint(0.2, (c) => { rails(c, [[6, 32], [6, 16], [34, 16], [34, 31], [6, 31]], cv.is); rails(c, [[20, 16], [20, 31]], cv.is); });
    for (const [x, y, k] of [[14, 31, 5], [34, 21, 2], [20, 23, 5], [6, 24, 0], [26, 16, 5]]) cv.put(x, y, (c, top, X, Y) => cart(c, top, X, Y, k === 5 ? [196, 120, 80] : ORES[k]));
    for (const y of [12, 21, 27]) p.paint(y + 1, (c, top) => timber(c, top, 3, 7, y));
    for (const y of [20, 25]) p.paint(y + 1, (c, top) => timber(c, top, 18, 22, y));
    for (const y of [12, 19, 25]) p.paint(y + 1, (c, top) => timber(c, top, 32, 36, y));
    cv.scatter(6, 81, crate); cv.scatter(6, 82, ROCK([176, 124, 88])); cv.scatter(4, 83, GEM([[250, 220, 110], [250, 150, 90]]));
    cv.onFaces(0.22, 84, lamp);
  },
};

// ---------------------------------------------------------------- Victory Road (the caves under the fallen castle)
// Brown caverns the castle crashed into: slabs of its floor, broken columns, fallen blocks, stairs up the cliffs.
function castleBits(p, cv, slab, cols, seed, rub = 10) {
  if (slab) cv.tile("hallFloor", slab);
  (cols || []).forEach(([x, y], k) => cv.put(x, y, (c, top, X, Y) => (k % 2 ? stump(c, top, X, Y, CASTLE, k) : pillar(c, top, X, Y, CASTLE))));
  cv.scatter(rub, seed, RUBBLE(CASTLE)); cv.scatter(7, seed + 1, SPIKE([170, 150, 132])); cv.scatter(6, seed + 2, ROCK([150, 130, 116]));
}
PLANS.UnovaVictoryRoad20 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.7), seg(8, 29, 13, 24, 2), disc(21, 18, 13, 8.6), disc(14, 6.2, 5, 3.3), seg(14, 8, 16, 12, 1.8), disc(36.5, 4.6, 3.6, 3.1), seg(34.5, 7, 30, 12.5, 2), disc(35.5, 26.5, 4, 5.6), seg(31, 21, 34, 24, 2), seg(6, 31.5, 11.5, 32.5, 1.3)), PAL.victory);
    marks(p, ["light", "mouth", "mouth", "light"], [160, 140, 124]);
    cv.treads(rect(19, 12, 23, 13)); cv.treads(any(seg(8, 29, 13, 24, 0.9)), false);
    castleBits(p, cv, any(rect(15, 14, 27, 22), rect(19, 11, 23, 14)), [[16, 15], [26, 15], [16, 21], [26, 21], [21, 24], [12, 18], [30, 18]], 91, 14);
  },
};
PLANS.UnovaVictoryRoad21 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.6), seg(6, 29, 14.5, 17, 2), disc(15, 15, 5, 4), seg(18, 14, 30, 10, 2), seg(30, 10, 36, 6.5, 2), disc(36.3, 5.4, 3.5, 3.1), seg(17, 17.5, 32, 30, 1.8), disc(34, 31, 4.2, 2.6), seg(15.5, 17, 15.5, 21.6, 1.5), disc(37.5, 21.5, 2.4, 2.6), seg(35, 30, 37.5, 22, 1.5)), PAL.victory);
    marks(p, ["mouth", "mouth"], [160, 140, 124]);
    cv.treads(any(seg(8, 26, 11, 22, 1.4), seg(22, 12.5, 26, 11.5, 1.6)));
    castleBits(p, cv, disc(15, 15, 3.2, 2.4), [[13, 13], [18, 16]], 94, 9);
  },
};
PLANS.UnovaVictoryRoad23 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.6, 3.6), seg(6, 30, 15, 28, 1.8), disc(16, 27.5, 4.4, 3.2), seg(5.5, 28, 5.5, 8, 1.7), disc(6, 6, 4.4, 3.3), disc(25, 14, 11, 8), seg(9, 7, 15, 11, 1.8), seg(18, 25, 22, 20, 1.8)), PAL.victory);
    marks(p, ["mouth"], [160, 140, 124]);
    cv.treads(rect(23, 10, 27, 11)); cv.treads(seg(5.5, 20, 5.5, 15, 1.7));
    castleBits(p, cv, rect(20, 10, 30, 18), [[21, 11], [29, 11], [21, 17], [29, 17], [25, 20], [17, 14], [33, 14]], 97, 12);
    // What is left of a throne dais.
    p.paint(0.3, (c) => { c.box(24 * T, 13 * T, 3 * T, 2 * T, [206, 210, 226], [96, 100, 120]); c.box(24 * T + 6, 13 * T + 5, 3 * T - 12, 2 * T - 10, [150, 60, 70], [96, 100, 120]); });
  },
};
PLANS.UnovaVictoryRoad24 = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30.6, 4.8, 3.4), seg(8, 29, 18, 24, 2), disc(20, 22, 6, 4.4), seg(23, 20, 30, 12, 2), disc(31, 11, 5, 4), seg(33, 9, 36, 6, 1.9), disc(36.5, 5, 3.2, 2.9)), PAL.victory);
    marks(p, ["mouth", "light", "light"], [160, 140, 124]);
    cv.treads(any(seg(11, 27.5, 14, 26, 1.9), seg(25, 17.5, 27.5, 14.5, 1.9)));
    castleBits(p, cv, disc(20.5, 22, 3, 2), [[17, 20], [23, 24], [29, 9], [33, 13]], 100, 8);
  },
};
// The castle approach: out of the cave onto the castle's own flagstones, up the grand stair to the gate.
PLANS.UnovaVictoryRoad26 = {
  theme: th("caveFloor", { road: "hallFloor" }),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 4.8, 3.8), rect(8, 27, 24, 31), rect(19, 11, 25, 27), rect(19, 5, 39, 11)), PAL.victory);
    mark(p, 0, "mouth", [160, 140, 124]); p.bare(1);
    cv.tile("hallFloor", any(rect(11, 27, 24, 31), rect(19, 5, 39, 26)));
    p.street("hallFloor", 1, [[37, 5], [37, 8], [22, 8], [22, 29], [11, 29]]); p.street("caveFloor", 1, [[10, 29], [6, 29], [5, 31]]);
    p.paint(0.25, (c) => { steps(c, 20, 13, 24, 25, [196, 200, 218]); c.rect(20 * T, 13 * T, 5 * T, 2, [236, 238, 248]); });
    // The castle gate: a dark portal between two turrets, built over the wall above the warp.
    p.paint(0.6, (c) => {
      const X = 37 * T + 8, Y = 5 * T;
      c.box(X - 40, Y - 44, 80, 44, [150, 154, 176], [60, 62, 84]); for (let k = 0; k < 5; k++) c.rect(X - 39, Y - 36 + k * 8, 78, 1, [112, 116, 140]); for (let k = -4; k <= 4; k++) c.box(X + k * 9 - 4, Y - 50, 7, 7, [170, 174, 196], [60, 62, 84]);
      c.ellipse(X, Y - 14, 13, 14, [60, 62, 84]); c.rect(X - 13, Y - 14, 26, 30, [60, 62, 84]); c.ellipse(X, Y - 13, 10, 11, [14, 12, 24]); c.rect(X - 10, Y - 13, 20, 29, [14, 12, 24]); c.rect(X - 10, Y + 12, 20, 4, [70, 72, 96]);
      for (const dx of [-30, 30]) { c.box(X + dx - 5, Y - 36, 10, 18, [40, 44, 70], [20, 20, 36]); c.rect(X + dx - 3, Y - 34, 6, 6, [70, 110, 200]); c.rect(X + dx - 1, Y - 32, 2, 10, WHITE); c.poly([[X + dx - 5, Y - 18], [X + dx, Y - 12], [X + dx + 5, Y - 18]], [40, 44, 70]); }
    });
    [[21, 7], [25, 8], [29, 7], [33, 8], [14, 29], [18, 29]].forEach(([x, y], k) => cv.put(x, y, (c, top, X, Y) => (k % 3 === 1 ? stump(c, top, X, Y, CASTLE, k) : pillar(c, top, X, Y, CASTLE))));
    cv.scatter(8, 103, RUBBLE(CASTLE)); cv.scatter(4, 104, ROCK([150, 130, 116]));
    // Tattered banners along the terrace wall.
    cv.onFaces(1, 105, (c, top, X, Y, x, y) => { if (y === 4 && x % 3 === 0 && x < 34 && x > 19) { c.rect(X + 3, Y + 1, 10, 2, [70, 60, 50]); c.rect(X + 4, Y + 3, 8, 9, [40, 44, 70]); c.poly([[X + 4, Y + 12], [X + 8, Y + 15], [X + 12, Y + 12]], [40, 44, 70]); c.rect(X + 6, Y + 5, 4, 4, [70, 110, 200]); c.rect(X + 7, Y + 5, 2, 6, WHITE); } });
  },
};

// ---------------------------------------------------------------- Giant Chasm, outer cave
// The crater's rim cave: a ring of passages round a still crater pool, frost and ice thickening toward the frozen side.
PLANS.UnovaGiantChasmOuterCave = {
  theme: th("caveFloor"),
  plan(p) {
    const cv = start(p, any(disc(6, 30, 5, 3.8), seg(5.5, 28, 6, 7, 2), disc(8, 5, 4.6, 3.1), seg(9, 5, 34, 4.8, 1.9), disc(36.8, 4.4, 3.4, 3), seg(36, 7, 35.5, 27, 2), disc(34.5, 28, 4.6, 3.4), seg(8, 31, 33, 29.5, 2), disc(20.5, 17, 10, 6.6), seg(6, 17, 11, 17, 1.8), seg(30, 17, 36, 17, 1.8)), PAL.chasm);
    marks(p, ["mouth", "light", "light", "light", "light"], [134, 130, 162]);
    cv.tile("snow", any(disc(36.5, 5, 7, 5), seg(36, 7, 35.8, 16, 2.6), disc(27, 5, 3, 2)));
    cv.tile("drift", any(disc(28, 15, 3, 2), disc(35.5, 21, 2.4, 3), disc(20, 4.8, 3, 1.4)));
    cv.pool(20.5, 15.4, 4.8, 2.1);
    iceFloor(p, cv, [[30, 6.4, 2.4, 0.9], [36, 12, 1.4, 2.6], [27, 19.5, 2.4, 1]]);
    for (const [x, y] of [[32, 3], [39, 7], [34, 11], [29, 14], [37, 19]]) cv.put(x, y, (c, top, X, Y) => gem(c, top, X, Y, ICE[(x + y) % 3], 1.7));
    cv.scatter(8, 111, GEM(ICE), (x, y) => x > 22 && y < 22); cv.scatter(10, 112, GEM([[150, 120, 230], [110, 210, 200]]), (x, y) => x <= 26 || y >= 20);
    cv.scatter(8, 113, SPIKE([134, 130, 162])); cv.scatter(8, 114, ROCK([120, 116, 146]));
  },
};

module.exports = PLANS;
