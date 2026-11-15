// Unova caves and dungeons, first half (Castelia Sewers to the Cave of Being), drawn by hand. See README.md.
// Each is cut out of solid rock by scene(): the floor is a list of shapes, the walls are painted in the place's own
// stone, and props only go where they leave every exit, person and item reachable.
"use strict";
const T = 16;
// The tiles the builder keeps walkable on each map (exits, people, what they face, items, landings).
const KEEP = {
  "CasteliaSewers":">4C4>5:6B6:7M8O889M9O98:8;8<=<==C>Q>6?8?A?3@6@8@A@C@8A8B7C7D=F8G<G=GAGDGPG8HAHPH5I9J",
  "CasteliaSewers2":"898:8;8<4>Q>",
  "CasteliaSewers3":"C5898:8;8<4>Q>",
  "CasteliaSewers4":"898:8;8<4>Q>",
  "CasteliaSewers5":"898:8;8<4>",
  "RelicPassage":"B5J5B6N6N7N8N9FA;BFB;C;D<DED;E<EEE5G3H5HPH3I5I5JBJ",
  "RelicCastle":"L5565758597H7IAJ",
  "RelicCastleB1":"A4A5565758596<KDKE>FLGLHKILILJ",
  "RelicPassageDepths":"34S43545R5P6R6S657R758R859J9R95:B:J:B;B<:=@=B=G=TCSDTDSEUETFTGIKLKIL5MDMIMIN",
  "RelicCastleSanctum":"?6?75E?G",
  "MistraltonCave":":465:5N6N7N8<9N95:<:5?5@5G5H5IBI5JBJBK",
  "GuidanceChamber":"J3J4?5?66:@<@==@=AGAGB3F?G",
  "ChargestoneCave":"=3E354=4K6T6K7K859K95:E:5;7;5<7<7=Q=7>Q>R>R?:@D@R@:ADARA4H4I=LSL=MSMTM=NINTN=OIOTO<PTPEQ",
  "ChargestoneB1":"55?6?7?8?9;<;=RC5DRD5E@FPIPJPKPLCM",
  "ChargestoneB2":"J4J5L6L758L859L95:5;3?E?3@5A5B5C5DAEAFAGAHAI",
  "SeasideCave":"=3T3=4Q5G6G7G859G95:5;5<E?E@8A5C3D5D3E5E5FKKRKKLRLDMRMRN",
  "SeasideCaveDepths":"N556575859B<@=B=K=@>J>K>J?G@GAJABBBCEDEE4GNG4HNHBINI;JNJ;K",
  "GiantChasm":"N355U5X=X>FO3P",
  "GiantChasmCrater":"D45MDM",
  "GiantChasmSanctum":"A6A7A8A;A<AI",
  "VictoryRoad":"T3T4S5U5?7?8E;E<>CFDEJEKEO",
  "VictoryRoadDepths":"55S5E6E7E8E9DCRCDDRDDEREDFRF5I5JDJ5KDK5LDL5MDM5N6N6O",
  "VictoryRoadSummit":"33O334B4O5A6A7A8C8A9C9B:C:D:B;C;D;;<H=N=N>N?5@N@5AHA5B5C5DMD5EMEMF6GMG6H5I6IBI6J",
  "WellspringCave":"O556P657P758P859P9R:3;R;3<CK",
  "WellspringDepths":"A3A4I495>6>7>8>9B=B>B?B@M@MA?B5C?C5DOD5E5FNGNHPHBINIPINJ",
  "DreamyardBasement":"6364@4P;P<BI4J4K",
  "TwistMountain":"65W5U6FS",
  "TwistDepths":"S3R455:5S5R657R758R859R95:@>7C7DQEQFRFRGQMSMINQNDOIOQOQP",
  "TwistIceRock":"K5A6A7AI",
  "TwistRegigigas":"@6@7L@?ALA3B?B3C5G@G",
  "ClayTunnel":"S556P657L758L859H=H>E@8DMDMETMTNEOTOTP",
  "ClayTunnelDepths":"Q355O5Q5A6K6A7A8A9?>5@5AQA5BQB5C;C6H6IPI3JPJ3KCKPK4LPL4M",
  "UndergroundRuins":"75@5I5A<A=5IAI",
  "RegiRegirock":"@6@77G7H@I",
  "RegiRegice":"@6@77G7H@I",
  "RegiRegisteel":"@6@77G7H@I",
  "DragonspiralTower":"3334O5BK",
  "Dragonspiral2":"M5K9K:AI",
  "Dragonspiral3":"M5AI",
  "Dragonspiral4":"@4M5K;K<===>6G6HAI",
  "Dragonspiral5":"M5F6A<A=AI",
  "Dragonspiral6":"J4I5J5M5I6J6AI",
  "Dragonspiral7":"D4D5M54748<B<CAI",
  "DragonspiralSummit":"N3A6A7AI",
  "CaveOfBeing":"@7@8@G",
};

// ---------------------------------------------------------------- colours and shapes
const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
const sh = (c, f) => [cl(c[0] * f), cl(c[1] * f), cl(c[2] * f)];
const mix = (a, b, t) => [0, 1, 2].map((k) => cl(a[k] + (b[k] - a[k]) * t));
const A = (c, a) => [c[0], c[1], c[2], a];
const WHITE = [246, 246, 252], INK = [34, 32, 44];
const glow = (c, cx, cy, r, col, a = 26) => { for (let k = 4; k >= 1; k--) c.ellipse(cx, cy, r * k / 4, r * k / 4, A(col, a)); };
// Floor shapes, in tiles: a rectangle, an ellipse, a passage along a line of tile centres.
const rc = (x0, y0, x1, y1) => (x, y) => x > x0 - 0.5 && x < x1 + 0.5 && y > y0 - 0.5 && y < y1 + 0.5;   // (exact whatever the scene's roughness)
const dc = (cx, cy, rx, ry = rx) => (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const sg = (ax, ay, bx, by, w = 1.2) => (x, y) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy) <= w; };
const ln = (pts, w = 1.2) => { const fs = []; for (let k = 0; k + 1 < pts.length; k++) fs.push(sg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], w)); return (x, y) => fs.some((f) => f(x, y)); };

// ---------------------------------------------------------------- wall faces (h pixels tall, drawn upward from the foot of the wall)
const FACES = {
  rock(c, p, X, Y, h, col, x, y) {
    c.rect(X, Y, T, h, col); c.rect(X, Y, T, 3, sh(col, 1.28)); c.rect(X, Y + h - 4, T, 4, sh(col, 0.62));
    for (let k = 0; k < 3; k++) { const dx = 1 + Math.floor(p.hash(x, y, k + 1) * 14), dy = 3 + Math.floor(p.hash(x, y, k + 7) * (h - 12)); c.rect(X + dx, Y + dy, 1, 4 + Math.floor(p.hash(x, y, k + 5) * 5), sh(col, 0.74)); c.rect(X + dx + 1, Y + dy + 1, 1, 3, sh(col, 1.12)); }
  },
  brick(c, p, X, Y, h, col, x, y) {
    c.rect(X, Y, T, h, sh(col, 0.58));
    for (let r = 0; r * 4 < h; r++) for (let k = -1; k < 3; k++) { const bx = X + k * 8 + (r & 1) * 4, x0 = Math.max(bx, X), x1 = Math.min(bx + 7, X + T); if (x1 > x0) c.rect(x0, Y + r * 4, x1 - x0, 3, sh(col, 0.88 + p.hash(x * 2 + k + (r & 1), y * 9 + r, 3) * 0.24)); }
    c.rect(X, Y, T, 2, sh(col, 1.3)); c.rect(X, Y + h - 2, T, 2, sh(col, 0.5));
  },
  block(c, p, X, Y, h, col, x, y) {
    c.rect(X, Y, T, h, sh(col, 0.6));
    for (let r = 0; r * 8 < h; r++) { const odd = (r + y) & 1, f = 0.9 + p.hash(x + odd, y * 5 + r, 4) * 0.2; if (odd) { c.rect(X, Y + r * 8, 7, 7, sh(col, f)); c.rect(X + 8, Y + r * 8, 8, 7, sh(col, f * 1.06)); } else c.rect(X + (x & 1 ? 0 : 1), Y + r * 8, 15, 7, sh(col, f)); c.rect(X, Y + r * 8, T, 1, sh(col, 1.22)); }
    c.rect(X, Y, T, 2, sh(col, 1.34)); c.rect(X, Y + h - 2, T, 2, sh(col, 0.5));
  },
  ice(c, p, X, Y, h, col, x, y) {
    c.rect(X, Y, T, h, col); c.rect(X, Y, T, 3, mix(col, WHITE, 0.7)); c.rect(X, Y + h - 4, T, 4, sh(col, 0.72));
    for (let k = 0; k < 3; k++) { const dx = Math.floor(p.hash(x, y, k + 1) * 12), dy = 4 + Math.floor(p.hash(x, y, k + 4) * (h - 12)); c.line(X + dx, Y + dy + 5, X + dx + 4, Y + dy, mix(col, WHITE, 0.75)); c.line(X + dx + 2, Y + dy + 6, X + dx + 5, Y + dy + 3, sh(col, 0.82)); }
  },
};

// ---------------------------------------------------------------- the scene
// Lays a dungeon out of solid rock: `o.floor` is a list of shapes; everything else becomes wall, drawn here in the
// dungeon's own colours (`o.pal`: top, face, style, tall). Every fixed tile stays floor and stays joined on foot.
// Returns the scene, whose put()/pool() refuse anything that would cut a fixed tile off.
function scene(p, o) {
  const W = p.W, H = p.H, N = W * H, g = new Uint8Array(N), res = new Uint8Array(N), occ = new Uint8Array(N), I = (x, y) => y * W + x;
  const inb = (x, y) => x >= 2 && y >= 2 && x < W - 2 && y < H - 2, pal = { style: "rock", tall: 1, ...o.pal };
  const J = o.rough || 0, jit = (x, y, s) => (p.hash(x, y, s) - 0.5) * 2 * J;
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const fx = J ? x + jit(x, y, 71) : x, fy = J ? y + jit(x, y, 72) : y; if (o.floor.some((f) => f(fx, fy)) && !(o.rock || []).some((f) => f(x, y))) g[I(x, y)] = 1; }
  const keep = []; { const s = KEEP[p.name.replace(/^Unova/, "")] || ""; for (let k = 0; k + 1 < s.length; k += 2) keep.push([s.charCodeAt(k) - 48, s.charCodeAt(k + 1) - 48]); }
  for (const a of [...p.warps, ...p.people]) if (!keep.some(([x, y]) => x === a.x && y === a.y)) keep.push([a.x, a.y]);
  // The wall a way out is set in: above the top exits, below the bottom ones (or as the plan says).
  const side = p.warps.map((w, k) => (o.exits && k in o.exits ? o.exits[k] : w.y < H * 0.45 ? "N" : w.y > H * 0.6 ? "S" : "hole"));
  const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  p.warps.forEach((w, k) => { const d = DIR[side[k]]; if (!d) return; for (const e of [-1, 0, 1]) { const x = w.x + d[0] + (d[0] ? 0 : e), y = w.y + d[1] + (d[1] ? 0 : e); if (x >= 0 && y >= 0 && x < W && y < H) g[I(x, y)] = 0; } });
  for (const [x, y] of keep) { g[I(x, y)] = 1; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (inb(x + i, y + j)) res[I(x + i, y + j)] = 1; }
  for (const q of p.people) occ[I(q.x, q.y)] = 1;
  for (const [x0, y0, x1, y1] of o.water || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[I(x, y)] = 2;
  const flood = () => { const seen = new Uint8Array(N), s = keep.find(([x, y]) => !occ[I(x, y)]) || keep[0], q = [I(s[0], s[1])]; seen[q[0]] = 1; for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= N || seen[j] || g[j] !== 1) continue; seen[j] = 1; if (!occ[j]) q.push(j); } return seen; };
  // (Nothing may cut off a fixed tile, nor leave a pocket of floor nobody can reach.)
  const joined = () => { const seen = flood(); for (let i = 0; i < N; i++) if (g[i] === 1 && !seen[i]) return false; return true; };
  // Anything the shapes left apart is joined by a passage two tiles wide.
  for (let guard = 0; guard < 80; guard++) {
    const seen = flood(), lost = keep.find(([x, y]) => !seen[I(x, y)]); if (!lost) break;
    const from = new Int32Array(N).fill(-2), q = [I(lost[0], lost[1])]; from[q[0]] = -1; let end = -1;
    for (let k = 0; k < q.length && end < 0; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d, x = j % W, y = (j / W) | 0; if (!inb(x, y) || from[j] !== -2 || g[j] === 2 || occ[j]) continue; from[j] = q[k]; if (seen[j]) { end = j; break; } q.push(j); }
    if (end < 0) break;
    for (let j = end; j >= 0; j = from[j]) { g[j] = 1; const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [0, 1]]) if (inb(x + dx, y + dy) && g[I(x + dx, y + dy)] === 0 && !p.warps.some((w, k) => DIR[side[k]] && Math.abs(w.x + DIR[side[k]][0] - x - dx) <= 1 && Math.abs(w.y + DIR[side[k]][1] - y - dy) <= 1)) g[I(x + dx, y + dy)] = 1; }
  }
  { const seen = flood(); for (let i = 0; i < N; i++) if (g[i] === 1 && !seen[i]) g[i] = 0; }
  // (The floor is laid as drawn ground, so the builder scatters no rocks of its own over it.)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!g[I(x, y)]) p.fill("border", x, y, x, y); else if (g[I(x, y)] === 1) p.fill(o.ground || "caveFloor", x, y, x, y); }
  const wall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || g[I(x, y)] === 0, open = (x, y) => !wall(x, y);
  const S = { p, W, H, g, res, I, inb, wall, open, pal, side, keep,
    floor: (x, y) => inb(x, y) && g[I(x, y)] === 1, free: (x, y) => inb(x, y) && g[I(x, y)] === 1 && !res[I(x, y)],
    face: (x, y) => wall(x, y) && open(x, y + 1),
    near: (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => wall(x + dx, y + dy)),
    // A solid thing on free floor, drawn by `draw(c, top)`; false (and nothing done) if it does not fit.
    put(x, y, w, h, draw, z) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!S.free(i, j)) return false;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[I(i, j)] = 3;
      if (!joined()) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[I(i, j)] = 1; return false; }
      p.block(x, y, w, h); p.paint(z == null ? y + h : z, draw); return true;
    },
    // Water over every free floor tile of the shape (nothing if it would cut the cave in two).
    // `spans` ([x0, y0, x1, y1] straight runs) are plank bridges across it.
    pool(f, spans = []) {
      const cells = []; for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (S.free(x, y) && f(x, y)) cells.push([x, y]);
      const span = (x, y) => spans.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
      for (const [x, y] of cells) if (!span(x, y)) g[I(x, y)] = 2;
      if (!joined()) { for (const [x, y] of cells) g[I(x, y)] = 1; return false; }
      for (const [x, y] of cells) p.fill("water", x, y, x, y);
      for (const [x0, y0, x1, y1] of spans) p.street("deck", 1, [[x0, y0], [x1, y1]]);
      return true;
    },
    // Every free floor tile of the shape made solid and drawn by `draw(c, top, cells)` (a pit, a mound...).
    area(f, draw, z = -0.6) {
      const cells = []; for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (S.free(x, y) && f(x, y)) cells.push([x, y]);
      for (const [x, y] of cells) g[I(x, y)] = 3;
      if (!cells.length || !joined()) { for (const [x, y] of cells) g[I(x, y)] = 1; return false; }
      for (const [x, y] of cells) p.block(x, y, 1, 1);
      const has = (x, y) => cells.some(([a, b]) => a === x && b === y); p.paint(z, (c, top) => draw(c, top, cells, has)); return true;
    },
    // A stamp from tools/lib/city-stamps.js as furniture.
    stamp(name, x, y) {
      const st = p.stamps[name], w = st[3], h = st[4];
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!S.free(i, j)) return false;
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[I(i, j)] = 3;
      if (!joined()) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[I(i, j)] = 1; return false; }
      p.decor(name, x, y); return true;
    },
    // Floor of another kind under the shape (walkable as before).
    lay(kind, f) { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (g[I(x, y)] === 1 && f(x, y)) p.fill(kind, x, y, x, y); },
    // `n` things scattered over free floor that passes `ok`.
    scatter(n, seed, fn, ok) { let made = 0; for (let t = 0; t < n * 14 && made < n; t++) { const x = 2 + Math.floor(p.hash(t, 1, seed) * (W - 4)), y = 2 + Math.floor(p.hash(t, 2, seed) * (H - 4)); if (S.free(x, y) && (!ok || ok(x, y)) && fn(S, x, y, t) !== false) made++; } },
    // Each tile of the shape that is walkable floor (for painting on it).
    each(f, fn) { for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if ((g[I(x, y)] === 1 || g[I(x, y)] === 3) && (!f || f(x, y))) fn(x, y); },
  };
  // Walls: the top of the rock, then its faces over the floor below.
  p.paint(-2, (c) => {
    const top = pal.top, style = FACES[pal.style];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x * T, Y = y * T;
      if (!wall(x, y)) { if (g[I(x, y)] !== 2) { if (o.tint) c.rect(X, Y, T, T, o.tint); if (o.floorArt) o.floorArt(c, x, y, X, Y); } continue; }
      c.rect(X, Y, T, T, top);
      for (let k = 0; k < 2; k++) c.rect(X + Math.floor(p.hash(x, y, 20 + k) * 13), Y + Math.floor(p.hash(x, y, 30 + k) * 13), 3, 2, sh(top, k ? 1.18 : 0.82));
      if (open(x - 1, y)) c.rect(X, Y, 3, T, sh(pal.face, 0.72)); if (open(x + 1, y)) c.rect(X + 13, Y, 3, T, sh(pal.face, 0.72));
      if (open(x, y - 1)) c.rect(X, Y, T, 3, sh(pal.face, 0.56));
    }
    for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (wall(x, y) && open(x, y + 1)) {
      const rows = pal.tall > 1 && y > 0 && wall(x, y - 1) ? 2 : 1, h = rows * T, X = x * T, Y = (y - rows + 1) * T;
      style(c, p, X, Y, h, pal.face, x, y);
      if (!wall(x - 1, y) || !(wall(x - 1, y) && open(x - 1, y + 1))) c.rect(X, Y, 1, h, sh(pal.face, 0.5));
      if (!(wall(x + 1, y) && open(x + 1, y + 1))) c.rect(X + 15, Y, 1, h, sh(pal.face, 0.5));
      if (g[I(x, y + 1)] !== 2) { c.rect(X, Y + h, T, 3, [0, 0, 0, 70]); c.rect(X, Y + h + 3, T, 3, [0, 0, 0, 30]); }
    }
  });
  // Ways out.
  p.warps.forEach((w, k) => {
    p.bare(k);
    p.paint(-1, (c) => {
      const X = w.x * T, Y = w.y * T, d = side[k], fr = sh(pal.face, 1.25), dk = [14, 12, 20], built = pal.style === "brick" || pal.style === "block";
      const stepsAt = (col) => { for (let s = 0; s < 4; s++) { c.rect(X + 1, Y + s * 4, 14, 3, sh(col, 1.1 - s * 0.12)); c.rect(X + 1, Y + s * 4 + 3, 14, 1, sh(col, 0.5)); } };
      if (d === "N") {
        const h = pal.tall > 1 && wall(w.x, w.y - 2) ? 26 : 15;
        if (built) { c.box(X - 2, Y - h - 2, 20, h + 2, dk, sh(fr, 0.7)); c.rect(X - 2, Y - h - 2, 20, 3, fr); c.rect(X - 2, Y - h, 2, h, fr); c.rect(X + 16, Y - h, 2, h, fr); }
        else { c.ellipse(X + 8, Y - h + 9, 10, 11, sh(pal.face, 0.6)); c.rect(X - 2, Y - h + 9, 20, h - 9, sh(pal.face, 0.6)); c.ellipse(X + 8, Y - h + 10, 8, 9, dk); c.rect(X, Y - h + 10, 16, h - 10, dk); }
        for (let s = 0; s < 3; s++) c.rect(X + 1, Y - 4 - s * 4, 14, 1, [60, 56, 70]);
        c.rect(X, Y, T, T, [0, 0, 0, 40]);
      } else if (d === "S") {
        c.rect(X - 3, Y + T, 22, 12, dk); c.poly([[X - 2, Y + T + 2], [X + 18, Y + T + 2], [X + 14, Y + 4], [X + 2, Y + 4]], [250, 244, 210, 120]); c.poly([[X + 1, Y + T + 4], [X + 15, Y + T + 4], [X + 12, Y + 10], [X + 4, Y + 10]], [255, 250, 226, 120]);
        c.rect(X - 4, Y + T, 2, 12, fr); c.rect(X + 18, Y + T, 2, 12, fr);
      } else if (d === "E" || d === "W") {
        const sx = d === "E" ? X + T : X - 10; c.box(sx, Y - 6, 10, 22, dk, sh(fr, 0.7)); c.rect(sx, Y - 8, 10, 3, fr);
        c.poly(d === "E" ? [[X + T, Y], [X + T, Y + T], [X + 6, Y + 13], [X + 6, Y + 3]] : [[X, Y], [X, Y + T], [X + 10, Y + 13], [X + 10, Y + 3]], [250, 244, 210, 90]);
      } else { c.box(X - 1, Y - 1, 18, 18, dk, sh(pal.face, 0.5)); stepsAt(d === "up" ? mix(pal.face, WHITE, 0.25) : sh(pal.face, 0.7)); if (d !== "up") c.rect(X + 1, Y + 9, 14, 6, [0, 0, 0, 120]); }
    });
  });
  return S;
}
const theme = (ground, extra) => ({ ground, road: ground, grass: ground, density: 0, groves: 0, ...extra });
// A plan: floor tile kind, scene options, then the furnishing.
const mk = (ground, o, more) => ({ theme: theme(ground, o.theme), plan(p) { const S = scene(p, { ground, ...o }); if (more) more(S, p); } });

// ---------------------------------------------------------------- props (each takes the scene and a tile)
const P0 = (x, y) => [x * T, y * T];
function boulder(S, x, y, col = [140, 126, 112]) { return S.put(x, y, 1, 1, (c) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.poly([[X + 1, Y + 14], [X + 3, Y + 4], [X + 9, Y + 1], [X + 14, Y + 5], [X + 15, Y + 14]], sh(col, 0.5)); c.poly([[X + 2, Y + 13], [X + 4, Y + 5], [X + 9, Y + 2], [X + 13, Y + 6], [X + 14, Y + 13]], col); c.poly([[X + 4, Y + 6], [X + 9, Y + 3], [X + 10, Y + 7], [X + 5, Y + 9]], sh(col, 1.25)); }); }
function rubble(S, x, y, col = [150, 146, 150]) { return S.put(x, y, 1, 1, (c) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 60]); for (const [dx, dy, w, h, f] of [[1, 8, 7, 6, 0.9], [7, 6, 8, 8, 1], [4, 3, 6, 5, 1.12], [11, 11, 4, 3, 0.8]]) { c.box(X + dx, Y + dy, w, h, sh(col, f), sh(col, 0.45)); c.rect(X + dx + 1, Y + dy + 1, w - 2, 1, sh(col, f * 1.25)); } }); }
function spike(S, x, y, col = [130, 116, 104], h = 26) { return S.put(x, y, 1, 1, (c, top) => { const X = x * T, Y = y * T + 14; c.ellipse(X + 8, Y, 7, 3, [0, 0, 0, 60]); for (const [cv, a, b] of [[c, 0, 13], [top, 13, h]]) { const wa = 6 * (1 - a / h), wb = 6 * (1 - b / h); cv.poly([[X + 8 - wa - 1, Y - a], [X + 8 + wa + 1, Y - a], [X + 8 + wb + 1, Y - b], [X + 8 - wb - 1, Y - b]], sh(col, 0.45)); cv.poly([[X + 8 - wa, Y - a], [X + 8 + wa, Y - a], [X + 8 + wb, Y - b], [X + 8 - wb, Y - b]], col); cv.poly([[X + 8 - wa, Y - a], [X + 8 - wa / 3, Y - a], [X + 8 - wb / 3, Y - b], [X + 8 - wb, Y - b]], sh(col, 1.3)); } }); }
function shard(cv, x, y, w, h, col) { cv.poly([[x - w, y], [x - w, y - h * 0.55], [x, y - h], [x + w, y - h * 0.65], [x + w, y]], sh(col, 0.55)); cv.poly([[x - w + 1, y], [x - w + 1, y - h * 0.55], [x, y - h + 1], [x, y]], mix(col, WHITE, 0.45)); cv.poly([[x, y], [x, y - h + 1], [x + w - 1, y - h * 0.65], [x + w - 1, y]], col); }
// A cluster of crystals, glowing.
function crystal(S, x, y, col = [90, 190, 255], big) { return S.put(x, y, 1, 1, (c, top) => { const [X, Y] = P0(x, y); glow(c, X + 8, Y + 8, big ? 30 : 22, col, 20); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 60]); shard(c, X + 3, Y + 14, 3, 10, col); shard(c, X + 13, Y + 14, 3, 12, col); shard(c, X + 8, Y + 14, 4, 14, col); shard(top, X + 8, Y, 4, big ? 14 : 8, col); c.rect(X + 4, Y, 9, 1, col); }); }
// A charged stone hanging in the air over its shadow.
function floater(S, x, y, col = [80, 170, 255], lift = 12) { return S.put(x, y, 1, 1, (c, top) => { const X = x * T + 8, Y = y * T; c.ellipse(X, Y + 13, 6, 2, [0, 0, 0, 90]); glow(c, X, Y + 6, 22, col, 22); const cy = Y + 2 - lift; top.poly([[X - 6, cy], [X - 2, cy - 7], [X + 5, cy - 5], [X + 7, cy + 2], [X + 2, cy + 8], [X - 4, cy + 6]], [36, 44, 86]); top.poly([[X - 4, cy], [X - 1, cy - 5], [X + 4, cy - 3], [X + 5, cy + 2], [X + 1, cy + 6], [X - 3, cy + 4]], [62, 78, 140]); top.poly([[X - 3, cy - 1], [X - 1, cy - 4], [X + 2, cy - 3], [X, cy]], [120, 150, 220]); top.line(X - 8, cy + 3, X - 11, cy - 2, mix(col, WHITE, 0.6)); top.line(X + 8, cy - 4, X + 11, cy - 8, mix(col, WHITE, 0.6)); top.line(X + 4, cy + 8, X + 6, cy + 12, mix(col, WHITE, 0.6)); c.line(X, Y + 12, X, Y + 9, A(col, 150)); }); }
// A stone column; `broken` leaves a stump.
function pillar(S, x, y, col = [176, 172, 186], broken) { return S.put(x, y, 1, 1, (c, top) => { const [X, Y] = P0(x, y), E = sh(col, 0.42); c.ellipse(X + 8, Y + 13, 8, 4, [0, 0, 0, 70]); c.box(X, Y + 10, 16, 5, sh(col, 0.85), E); if (broken) { c.box(X + 2, Y + 2, 12, 9, col, E); c.poly([[X + 2, Y + 3], [X + 6, Y - 2], [X + 9, Y + 2], [X + 13, Y - 1], [X + 13, Y + 3]], col); c.rect(X + 4, Y + 3, 3, 7, sh(col, 1.2)); return; } c.box(X + 2, Y - 2, 12, 13, col, E); c.rect(X + 4, Y, 3, 10, sh(col, 1.22)); c.rect(X + 10, Y, 2, 10, sh(col, 0.8)); top.box(X + 2, Y - 16, 12, 15, col, E); top.rect(X + 4, Y - 14, 3, 13, sh(col, 1.22)); top.rect(X + 10, Y - 14, 2, 13, sh(col, 0.8)); top.box(X, Y - 21, 16, 6, sh(col, 1.1), E); }); }
// A guardian statue on a plinth.
function statue(S, x, y, col = [190, 160, 110], eye = [230, 80, 60]) { return S.put(x, y, 1, 1, (c, top) => { const [X, Y] = P0(x, y), E = sh(col, 0.4); c.ellipse(X + 8, Y + 13, 9, 4, [0, 0, 0, 70]); c.box(X, Y + 8, 16, 7, sh(col, 0.8), E); c.rect(X + 1, Y + 9, 14, 1, sh(col, 1.1)); c.box(X + 2, Y - 4, 12, 13, col, E); c.rect(X + 4, Y + 2, 8, 2, sh(col, 0.7)); top.box(X + 1, Y - 15, 14, 12, col, E); top.rect(X + 3, Y - 13, 10, 2, sh(col, 1.25)); top.rect(X + 3, Y - 10, 3, 2, eye); top.rect(X + 10, Y - 10, 3, 2, eye); top.rect(X + 5, Y - 6, 6, 1, E); top.poly([[X + 1, Y - 15], [X + 3, Y - 20], [X + 6, Y - 15]], col); top.poly([[X + 10, Y - 15], [X + 13, Y - 20], [X + 15, Y - 15]], col); }); }
function torch(S, x, y, flame = [250, 150, 40]) { return S.put(x, y, 1, 1, (c, top) => { const X = x * T + 8, Y = y * T; glow(c, X, Y + 8, 26, flame, 18); c.ellipse(X, Y + 13, 6, 3, [0, 0, 0, 70]); c.box(X - 2, Y - 2, 4, 16, [112, 92, 82], [50, 40, 40]); c.box(X - 6, Y - 7, 12, 6, [146, 126, 108], [50, 40, 40]); top.ellipse(X, Y - 12, 4, 6, flame); top.ellipse(X, Y - 10, 2, 4, [255, 240, 170]); }); }
// A miner's lamp on a post.
function lamp(S, x, y) { return S.put(x, y, 1, 1, (c, top) => { const X = x * T + 8, Y = y * T; glow(c, X, Y + 4, 30, [255, 220, 130], 16); c.ellipse(X, Y + 13, 5, 2, [0, 0, 0, 70]); c.box(X - 1, Y - 4, 3, 18, [120, 86, 56], [60, 40, 28]); top.box(X - 4, Y - 16, 9, 11, [70, 66, 76], INK); top.rect(X - 2, Y - 14, 5, 7, [255, 236, 150]); top.rect(X - 1, Y - 13, 2, 4, WHITE); top.rect(X - 2, Y - 19, 5, 3, [70, 66, 76]); }); }
function crate(S, x, y, col = [170, 124, 74]) { return S.put(x, y, 1, 1, (c) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 70]); c.box(X + 1, Y, 14, 14, col, sh(col, 0.4)); c.rect(X + 2, Y + 1, 12, 2, sh(col, 1.25)); c.line(X + 2, Y + 3, X + 13, Y + 12, sh(col, 0.65)); c.line(X + 13, Y + 3, X + 2, Y + 12, sh(col, 0.65)); c.rect(X + 1, Y + 6, 14, 1, sh(col, 0.6)); }); }
function barrel(S, x, y, col = [150, 100, 60]) { return S.put(x, y, 1, 1, (c) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 14, 7, 2, [0, 0, 0, 70]); c.box(X + 2, Y, 12, 14, col, sh(col, 0.4)); c.rect(X + 4, Y + 1, 2, 12, sh(col, 1.25)); c.rect(X + 2, Y + 3, 12, 1, [70, 72, 84]); c.rect(X + 2, Y + 10, 12, 1, [70, 72, 84]); c.ellipse(X + 8, Y + 1, 5, 2, sh(col, 1.3)); }); }
// A mine cart (stands on the rails).
function cart(S, x, y, load = [120, 110, 100]) { return S.put(x, y, 1, 1, (c) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 14, 8, 2, [0, 0, 0, 80]); c.box(X + 1, Y + 3, 14, 9, [110, 80, 60], INK); c.rect(X + 2, Y + 4, 12, 2, [150, 116, 86]); c.ellipse(X + 4, Y + 13, 2, 2, INK); c.ellipse(X + 12, Y + 13, 2, 2, INK); c.ellipse(X + 8, Y + 3, 6, 3, load); c.ellipse(X + 6, Y + 2, 2, 1, mix(load, WHITE, 0.5)); }); }
// Rails along a line of tile centres (walkable).
function rails(S, pts) { S.p.paint(-0.5, (c) => { for (let s = 0; s + 1 < pts.length; s++) { const [ax, ay] = pts[s], [bx, by] = pts[s + 1], hz = ay === by, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4; for (let t = 0; t <= n; t++) { const x = (ax + (bx - ax) * t / n) * T + 8, y = (ay + (by - ay) * t / n) * T + 8; if (hz) c.rect(x - 1, y - 6, 2, 12, [112, 80, 52]); else c.rect(x - 6, y - 1, 12, 2, [112, 80, 52]); } const X0 = Math.min(ax, bx) * T + 8, Y0 = Math.min(ay, by) * T + 8, len = (Math.abs(bx - ax) + Math.abs(by - ay)) * T; for (const d of [-4, 3]) { if (hz) { c.rect(X0, Y0 + d, len, 2, [176, 182, 196]); c.rect(X0, Y0 + d + 1, len, 1, [92, 96, 112]); } else { c.rect(X0 + d, Y0, 2, len, [176, 182, 196]); c.rect(X0 + d + 1, Y0, 1, len, [92, 96, 112]); } } } }); }
// A timber frame across a passage `w` tiles wide (walked under).
function timber(S, x, y, w) { S.p.paint(y + 1, (c, top) => { const X = x * T, Y = y * T; for (const dx of [0, w * T - 5]) c.box(X + dx, Y - 10, 5, 24, [150, 108, 62], [70, 46, 30]); top.box(X - 2, Y - 16, w * T + 4, 7, [170, 124, 74], [70, 46, 30]); top.rect(X - 1, Y - 15, w * T + 2, 2, [204, 160, 104]); }); }
// Steps painted on the floor (walkable), tiles x..x+w-1, y..y+h-1.
function steps(S, x, y, w, h, col, z = -0.5) { S.p.paint(z, (c) => { const X = x * T, Y = y * T, pw = w * T, ph = h * T; c.rect(X, Y, pw, ph, col); for (let j = Y; j < Y + ph; j += 4) { c.rect(X, j, pw, 1, sh(col, 1.22)); c.rect(X, j + 3, pw, 1, sh(col, 0.62)); } c.rect(X, Y, 2, ph, sh(col, 0.5)); c.rect(X + pw - 2, Y, 2, ph, sh(col, 0.5)); }); }
// A raised platform painted on the floor (walkable): an ellipse of `col` with a stepped rim. Pixels.
function dais(S, cx, cy, rx, ry, col, z = -0.6) { S.p.paint(z, (c) => { c.ellipse(cx, cy + 5, rx + 3, ry + 3, [0, 0, 0, 70]); c.ellipse(cx, cy + 3, rx + 2, ry + 2, sh(col, 0.5)); c.ellipse(cx, cy, rx, ry, sh(col, 0.8)); c.ellipse(cx, cy - 1, rx - 3, ry - 3, col); c.ellipse(cx, cy - 1, rx - 3, ry - 3, sh(col, 1.2), 2); c.ellipse(cx, cy - 1, rx * 0.55, ry * 0.55, sh(col, 0.86), 1); }); }
// A rectangular platform (walkable), tiles.
function slab(S, x0, y0, x1, y1, col, z = -0.6) { S.p.paint(z, (c) => { const X = x0 * T, Y = y0 * T, w = (x1 - x0 + 1) * T, h = (y1 - y0 + 1) * T; c.rect(X - 2, Y + h, w + 4, 5, sh(col, 0.45)); c.rect(X - 2, Y - 2, w + 4, h + 2, sh(col, 0.7)); c.rect(X, Y, w, h, col); c.rect(X, Y, w, 2, sh(col, 1.2)); for (let x = X + 16; x < X + w; x += 16) c.rect(x, Y + 2, 1, h - 2, sh(col, 0.86)); for (let y = Y + 16; y < Y + h; y += 16) c.rect(X, y, w, 1, sh(col, 0.86)); }); }
// Braille on a wall face: a panel of raised dots. Tile column x on wall row y.
function braille(S, x, y, w = 1, col = [214, 204, 180]) { S.p.paint(-0.8, (c) => { for (let k = 0; k < w; k++) { if (!S.face(x + k, y)) continue; const X = (x + k) * T, Y = y * T; c.box(X + 1, Y + 2, 14, 11, sh(S.pal.face, 0.7), sh(S.pal.face, 0.4)); for (let i = 0; i < 2; i++) for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 3; cy++) if (S.p.hash(x + k, i * 7 + cx * 3 + cy, 5) < 0.55) c.rect(X + 3 + i * 6 + cx * 2, Y + 4 + cy * 3, 1, 1, col); } }); }
// A sheet of ice on the floor (walkable).
function ice(S, f, col = [190, 226, 250]) { S.p.paint(-0.7, (c) => S.each(f, (x, y) => { const [X, Y] = P0(x, y); c.rect(X, Y, T, T, A(col, 190)); if (!f(x, y - 1)) c.rect(X, Y, T, 2, A(WHITE, 200)); if (S.p.hash(x, y, 9) < 0.5) { const dx = Math.floor(S.p.hash(x, y, 10) * 9); c.line(X + dx, Y + 11, X + dx + 6, Y + 4, A(WHITE, 210)); c.line(X + dx + 3, Y + 12, X + dx + 7, Y + 8, A(WHITE, 140)); } })); }
// Loose sand, moss or the like dusted over the floor (walkable).
function dust(S, f, col, a = 150) { S.p.paint(-0.7, (c) => S.each(f, (x, y) => { const [X, Y] = P0(x, y); c.rect(X, Y, T, T, A(col, a)); for (let k = 0; k < 3; k++) c.rect(X + Math.floor(S.p.hash(x, y, 40 + k) * 14), Y + Math.floor(S.p.hash(x, y, 50 + k) * 14), 2, 1, A(sh(col, k ? 1.15 : 0.8), 200)); })); }
// A pit of quicksand (walkable, as in the games: it only looks dangerous). Tile centre and radius in tiles.
function quicksand(S, cx, cy, r) { S.p.paint(-0.6, (c) => { const X = cx * T + 8, Y = cy * T + 8, R = r * T; c.ellipse(X, Y, R, R * 0.8, [176, 140, 84]); for (let k = 0; k < 4; k++) c.ellipse(X, Y + k, R * (1 - k * 0.22), R * 0.8 * (1 - k * 0.22), k & 1 ? [196, 160, 100] : [150, 116, 70], 2); c.ellipse(X, Y + 3, R * 0.16, R * 0.12, [96, 72, 48]); }); }
// A lit doorway of light on the floor from above.
function shaft(S, x0, x1, y0, y1, col = [255, 250, 210], a = 30) { S.p.paint(60, (c) => c.poly([[x0 * T, y0 * T], [(x0 + 1.6) * T, y0 * T], [(x1 + 2.6) * T, y1 * T], [x1 * T, y1 * T]], A(col, a))); }
// A bottomless drop (solid): the floor's edge showing along its far side.
function pit(S, f, edge = [90, 90, 110]) { return S.area(f, (c, top, cells, has) => { for (const [x, y] of cells) { const [X, Y] = P0(x, y); c.rect(X, Y, T, T, [10, 10, 18]); if (!has(x, y - 1)) { c.rect(X, Y, T, 7, sh(edge, 0.7)); c.rect(X, Y, T, 2, edge); c.rect(X, Y + 7, T, 3, [0, 0, 0, 120]); } if (!has(x - 1, y)) c.rect(X, Y, 2, T, sh(edge, 0.5)); if (!has(x + 1, y)) c.rect(X + 14, Y, 2, T, sh(edge, 0.5)); if (!has(x, y + 1)) c.rect(X, Y + 14, T, 2, sh(edge, 1.1)); } }); }
// Stalagmites and boulders along the walls of a natural cave.
function rocky(S, n, seed, col) { S.scatter(n, seed, (S2, x, y, t) => (t % 3 ? spike(S, x, y, col, 20 + (t % 4) * 4) : boulder(S, x, y, col)), (x, y) => S.near(x, y)); }
// A fallen column lying across `w` tiles (solid).
function fallen(S, x, y, w, col = [176, 172, 186]) { return S.put(x, y, w, 1, (c) => { const [X, Y] = P0(x, y), L = w * T, E = sh(col, 0.42); c.ellipse(X + L / 2, Y + 14, L / 2, 3, [0, 0, 0, 70]); c.box(X + 1, Y + 2, L - 2, 11, col, E); c.rect(X + 2, Y + 3, L - 4, 3, sh(col, 1.22)); c.rect(X + 2, Y + 10, L - 4, 2, sh(col, 0.78)); for (let k = 12; k < L - 6; k += 14) c.rect(X + k, Y + 3, 1, 9, E); c.box(X, Y + 1, 4, 13, sh(col, 1.1), E); c.box(X + L - 4, Y + 1, 4, 13, sh(col, 0.9), E); }); }

const PLANS = {};

// ---------------------------------------------------------------- Castelia Sewers
// Brick tunnels round the two settling tanks: walkways, pipes along the walls, drains and floor grates.
const SEWER = { top: [40, 48, 52], face: [112, 122, 112], style: "brick", tall: 2 };
function pipe(S, x0, x1, y, col = [150, 110, 70]) { S.p.paint(-0.8, (c) => { for (let x = x0; x <= x1; x++) { if (!S.face(x, y)) continue; const X = x * T, Y = y * T - 8; c.rect(X, Y, T, 6, sh(col, 0.5)); c.rect(X, Y + 1, T, 4, col); c.rect(X, Y + 1, T, 1, sh(col, 1.35)); if (x % 3 === 0) { c.rect(X + 6, Y - 1, 3, 8, sh(col, 0.7)); c.rect(X + 7, Y - 1, 1, 8, sh(col, 1.2)); } } }); }
function drain(S, x, y) { S.p.paint(-0.8, (c) => { if (!S.face(x, y)) return; const X = x * T + 8, Y = y * T + 4; c.ellipse(X, Y, 6, 6, [70, 76, 76]); c.ellipse(X, Y, 5, 5, [14, 18, 20]); c.rect(X - 2, Y + 1, 4, 12, [86, 150, 110, 190]); c.rect(X - 1, Y + 1, 1, 12, [170, 220, 180, 200]); c.ellipse(X, Y + 14, 5, 2, [86, 150, 110, 150]); }); }
function grate(S, x, y) { S.p.paint(-0.7, (c) => { if (!S.open(x, y)) return; const [X, Y] = P0(x, y); c.box(X + 1, Y + 2, 14, 12, [30, 34, 40], [84, 90, 96]); for (let k = 0; k < 4; k++) c.rect(X + 3 + k * 3, Y + 3, 1, 10, [120, 128, 134]); }); }
function wallLamp(S, x, y, col = [255, 226, 140]) { S.p.paint(50, (c) => { if (!S.face(x, y)) return; const X = x * T + 8, Y = y * T - 2; glow(c, X, Y + 12, 30, col, 14); c.box(X - 3, Y - 4, 6, 8, col, [60, 56, 50]); c.rect(X - 1, Y - 2, 2, 3, WHITE); c.rect(X - 4, Y - 6, 8, 2, [60, 56, 50]); }); }
const TANKS = [[14, 7, 23, 13], [14, 17, 23, 22]];
function sewer(o) {
  return mk("ruinFloor", { pal: SEWER, water: TANKS, tint: [50, 110, 80, 100], theme: { water: "bog" }, ...o }, (S, p) => {
      for (let x = 3; x < p.W - 3; x++) { if (S.face(x, 3) || S.face(x, 4)) { const y = S.face(x, 3) ? 3 : 4; if (x % 6 === 2) drain(S, x, y); if (x % 6 === 5) wallLamp(S, x, y); } }
      for (const y of [3, 4, 13, 22]) pipe(S, 3, p.W - 4, y);
      // The kerb along the tanks.
      p.paint(-0.6, (c) => { for (const [x0, y0, x1, y1] of TANKS) { c.rect(x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T, [50, 120, 50, 110]); c.rect(x0 * T - 3, y0 * T - 3, (x1 - x0 + 1) * T + 6, 3, [150, 156, 150]); c.rect(x0 * T - 3, y0 * T - 3, 3, (y1 - y0 + 1) * T + 6, [150, 156, 150]); c.rect((x1 + 1) * T, y0 * T - 3, 3, (y1 - y0 + 1) * T + 6, [96, 102, 100]); c.rect(x0 * T - 3, (y1 + 1) * T, (x1 - x0 + 1) * T + 6, 3, [96, 102, 100]); } });
      for (const [x, y] of o.grates || []) grate(S, x, y);
      for (const [x, y, k] of o.junk || []) (k ? crate : barrel)(S, x, y, k ? [120, 130, 110] : [110, 100, 80]);
      if (o.more) o.more(S, p);
  });
}
PLANS.UnovaCasteliaSewers = sewer({
  exits: { 0: "E", 1: "S", 2: "N", 3: "N" },
  floor: [rc(5, 4, 26, 26), rc(27, 14, 33, 16), rc(27, 6, 33, 10), rc(27, 23, 33, 25)], rock: [rc(10, 8, 11, 12), rc(10, 18, 11, 21), rc(5, 11, 6, 12)],
  grates: [[9, 5], [25, 10], [12, 15], [22, 15], [25, 20], [9, 24], [20, 24], [30, 15]], junk: [[26, 4], [25, 4, 1], [33, 6], [33, 7, 1], [27, 10], [5, 4, 1], [27, 25, 1], [26, 25]],
});
PLANS.UnovaCasteliaSewers2 = sewer({
  exits: { 0: "W", 1: "E" },
  floor: [rc(5, 14, 33, 16), rc(5, 7, 9, 13), rc(12, 5, 25, 6), rc(12, 5, 13, 13), rc(24, 5, 25, 13), rc(9, 5, 11, 6), rc(8, 5, 9, 7)],
  grates: [[10, 15], [18, 15], [27, 15], [18, 5]], junk: [[5, 7], [6, 7, 1], [25, 5], [5, 13, 1]],
});
PLANS.UnovaCasteliaSewers3 = sewer({
  exits: { 0: "W", 1: "E", 2: "N" },
  floor: [rc(5, 14, 33, 16), rc(5, 8, 9, 13), rc(12, 5, 25, 6), rc(12, 5, 13, 13), rc(24, 5, 25, 13), rc(12, 17, 13, 24), rc(12, 23, 25, 24), rc(24, 17, 25, 24), rc(27, 8, 32, 13), rc(29, 13, 30, 14)],
  grates: [[7, 15], [19, 15], [29, 15], [15, 5], [23, 5], [18, 24]], junk: [[32, 8], [31, 8, 1], [27, 8], [5, 8, 1], [32, 12]],
});
PLANS.UnovaCasteliaSewers4 = sewer({
  exits: { 0: "W", 1: "E" },
  floor: [rc(5, 14, 33, 16), rc(5, 8, 9, 13), rc(12, 17, 13, 24), rc(12, 23, 25, 24), rc(24, 17, 25, 24), rc(27, 19, 32, 24), rc(25, 21, 27, 22), rc(5, 17, 9, 21)],
  grates: [[8, 15], [20, 15], [30, 15], [18, 23], [29, 21]], junk: [[32, 19], [31, 19, 1], [32, 24], [27, 24, 1], [5, 21], [5, 8, 1], [6, 8]],
});
PLANS.UnovaCasteliaSewers5 = sewer({
  exits: { 0: "W" },
  floor: [rc(5, 14, 26, 16), rc(5, 8, 9, 13), rc(12, 5, 25, 6), rc(12, 5, 13, 13), rc(24, 5, 25, 13), rc(12, 17, 13, 24), rc(12, 23, 25, 24), rc(24, 17, 25, 24), rc(27, 10, 32, 20)],
  grates: [[8, 15], [19, 15], [18, 5], [18, 24]], junk: [[32, 10], [31, 10, 1], [32, 20], [27, 20, 1], [5, 8]],
  more(S) {
    // The valve house at the end of the line: a great outflow pipe and its wheel.
    S.put(29, 11, 2, 2, (c, top) => { const X = 29 * T, Y = 11 * T; c.ellipse(X + 16, Y + 28, 16, 4, [0, 0, 0, 70]); c.box(X + 2, Y - 6, 28, 34, [120, 96, 70], [50, 40, 34]); c.ellipse(X + 16, Y + 10, 11, 11, [70, 60, 50]); c.ellipse(X + 16, Y + 10, 9, 9, [16, 18, 22]); c.rect(X + 12, Y + 12, 8, 16, [86, 150, 110, 200]); top.ellipse(X + 16, Y - 8, 8, 8, [190, 60, 50], 3); top.rect(X + 15, Y - 16, 2, 16, [190, 60, 50]); top.rect(X + 8, Y - 9, 16, 2, [190, 60, 50]); });
    S.pool(rc(28, 14, 31, 18));
  },
});

// ---------------------------------------------------------------- Relic Passage and Relic Castle
// Relic Passage: straight corridors of dressed blue-grey stone, columns, carved panels and drifts of sand.
const RELIC = { top: [46, 52, 70], face: [124, 136, 162], style: "block", tall: 2 };
const SANDC = [214, 190, 130];
// A carved panel on a wall face.
function relief(S, x, y, col) { S.p.paint(-0.8, (c) => { if (!S.face(x, y)) return; const X = x * T, Y = y * T - 6, f = col || S.pal.face; c.box(X + 2, Y, 12, 14, sh(f, 0.74), sh(f, 0.4)); c.ellipse(X + 8, Y + 6, 4, 3, sh(f, 1.3), 1); c.rect(X + 7, Y + 5, 2, 2, sh(f, 1.4)); c.rect(X + 4, Y + 11, 8, 1, sh(f, 1.3)); }); }
function reliefs(S, col) { for (let y = 2; y < S.H - 2; y++) for (let x = 3; x < S.W - 3; x++) if (S.face(x, y) && S.face(x - 1, y) && S.face(x + 1, y) && (x + y * 3) % 5 === 0 && !S.p.warps.some((w) => Math.abs(w.x - x) < 2 && Math.abs(w.y - y) < 3)) relief(S, x, y, col); }
PLANS.UnovaRelicPassage = mk("ruinFloor", {
  pal: RELIC, tint: [70, 96, 150, 46],
  floor: [rc(17, 21, 19, 26), rc(9, 16, 24, 21), rc(3, 22, 10, 26), rc(20, 8, 22, 16), rc(15, 5, 31, 8), rc(29, 6, 31, 10), rc(5, 5, 12, 9), rc(12, 6, 15, 7), rc(6, 9, 7, 16), rc(6, 15, 9, 17)],
}, (S) => {
  dust(S, dc(11, 23.5, 4, 2), SANDC, 170); dust(S, dc(22, 19.5, 3, 2), SANDC, 170); dust(S, dc(8, 6.5, 3, 2), SANDC, 170); dust(S, dc(27, 7, 3, 1.6), SANDC, 150);
  for (const [x, y, b] of [[9, 16, 0], [13, 16, 1], [17, 16, 0], [24, 16, 0], [9, 21, 1], [13, 21, 0], [24, 21, 0], [15, 5, 0], [23, 5, 0], [5, 5, 0], [12, 5, 1], [5, 9, 0], [20, 12, 1], [22, 10, 0]]) pillar(S, x, y, [170, 178, 200], b);
  for (const [x, y] of [[21, 8], [31, 10], [3, 22]]) torch(S, x, y, [120, 200, 250]);
  for (const [x, y] of [[16, 18], [10, 9], [28, 8]]) rubble(S, x, y, [150, 158, 180]);
  reliefs(S);
});
PLANS.UnovaRelicPassageDepths = mk("ruinFloor", {
  pal: RELIC, tint: [70, 96, 150, 46], exits: { 0: "S", 1: "W", 2: "E", 3: "N", 4: "S" },
  floor: [rc(15, 25, 27, 29), rc(22, 30, 27, 30), rc(19, 12, 21, 25), rc(4, 9, 30, 13), rc(3, 4, 7, 9), rc(31, 4, 35, 8), rc(28, 7, 33, 12), rc(33, 18, 37, 23), rc(31, 12, 33, 18), rc(3, 24, 9, 29), rc(5, 12, 7, 24)],
}, (S) => {
  dust(S, dc(20, 27, 5, 2), SANDC, 170); dust(S, dc(12, 10.5, 4, 1.6), SANDC, 170); dust(S, dc(35, 21, 2.6, 2), SANDC, 170); dust(S, dc(6, 27, 2.6, 2), SANDC, 150);
  // The dig: timber shoring, lamps and crates of finds.
  for (const [x, y, w] of [[19, 22, 3], [19, 16, 3], [5, 20, 3], [5, 15, 3], [31, 15, 3]]) timber(S, x, y, w);
  for (const [x, y] of [[15, 25], [27, 25], [9, 9], [24, 12], [33, 23], [3, 29]]) lamp(S, x, y);
  for (const [x, y, k] of [[16, 29, 1], [17, 29, 0], [26, 29, 1], [29, 9, 1], [10, 12, 0], [37, 18, 1], [9, 24, 1]]) (k ? crate : barrel)(S, x, y);
  for (const [x, y, b] of [[13, 9, 0], [22, 9, 1], [30, 12, 0], [4, 9, 1], [8, 12, 0]]) pillar(S, x, y, [170, 178, 200], b);
  for (const [x, y] of [[23, 26], [14, 12], [31, 8], [8, 28]]) rubble(S, x, y, [150, 158, 180]);
  reliefs(S);
});

// Relic Castle: halls of sandstone half-buried in sand, quicksand funnels, guardian statues.
const CASTLE = { top: [112, 88, 56], face: [208, 178, 122], style: "block", tall: 2 };
const sandArt = (S) => (c, x, y, X, Y) => { if (S.p.hash(x, y, 61) < 0.3) { c.rect(X + 2, Y + 5 + Math.floor(S.p.hash(x, y, 62) * 8), 9, 1, [190, 160, 104, 150]); c.rect(X + 6, Y + 2 + Math.floor(S.p.hash(x, y, 63) * 8), 7, 1, [236, 214, 160, 150]); } };
function castle(o, more) { let S0; return mk("desert", { pal: CASTLE, ...o, floorArt: (c, x, y, X, Y) => sandArt(S0)(c, x, y, X, Y) }, (S, p) => { S0 = S; more(S, p); reliefs(S); }); }
PLANS.UnovaRelicCastle = castle({ exits: { 0: "S", 1: "hole" }, floor: [rc(4, 4, 29, 25)], rock: [rc(4, 12, 7, 17), rc(26, 12, 29, 17)] }, (S) => {
  quicksand(S, 17, 15, 3); quicksand(S, 9, 21, 1.6); quicksand(S, 24, 9, 1.6);
  for (const [x, y] of [[14, 23], [20, 23], [14, 6], [20, 6], [4, 4], [29, 25]]) statue(S, x, y);
  for (const [x, y, b] of [[10, 9, 0], [23, 20, 0], [10, 20, 1], [13, 12, 0], [21, 12, 0], [13, 18, 0], [21, 18, 1], [29, 9, 0], [4, 20, 0]]) pillar(S, x, y, [214, 188, 136], b);
  for (const [x, y] of [[15, 25], [19, 25], [26, 4], [8, 4]]) torch(S, x, y);
  for (const [x, y] of [[25, 22], [8, 9], [27, 8]]) rubble(S, x, y, [200, 172, 120]);
  slab(S, 27, 4, 29, 6, [196, 166, 112], -1.5);
});
PLANS.UnovaRelicCastleB1 = castle({ exits: { 0: "up" }, floor: [rc(22, 18, 30, 26), rc(15, 20, 22, 22), rc(7, 16, 15, 25), rc(10, 9, 12, 16), rc(4, 4, 12, 9), rc(12, 3, 22, 7), rc(22, 8, 29, 14), rc(20, 5, 24, 9), rc(25, 14, 27, 18)] }, (S) => {
  quicksand(S, 11, 21, 2.4); quicksand(S, 25, 11, 2); quicksand(S, 7, 7, 1.5); quicksand(S, 24, 23, 1.6);
  for (const [x, y] of [[15, 3], [19, 3], [22, 18], [30, 18], [7, 16], [15, 16]]) statue(S, x, y);
  for (const [x, y, b] of [[4, 4, 0], [12, 9, 1], [22, 8, 0], [29, 14, 0], [7, 25, 0], [15, 25, 1], [29, 8, 1]]) pillar(S, x, y, [214, 188, 136], b);
  for (const [x, y] of [[14, 7], [20, 7], [30, 26], [22, 26]]) torch(S, x, y);
  for (const [x, y] of [[18, 21], [11, 13], [26, 16]]) rubble(S, x, y, [200, 172, 120]);
});
PLANS.UnovaRelicCastleSanctum = castle({ exits: { 0: "S", 1: "W" }, floor: [dc(15, 10.5, 9.5, 7.5), rc(14, 16, 16, 23), rc(5, 20, 14, 22)] }, (S) => {
  // The sun moth's hearth: a rayed disc on the floor, a ring of fire about it.
  S.p.paint(-0.6, (c) => { const X = 15 * T + 8, Y = 8 * T + 8; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, b = a + 0.16; c.poly([[X + Math.cos(a - 0.16) * 30, Y + Math.sin(a - 0.16) * 24], [X + Math.cos(b) * 30, Y + Math.sin(b) * 24], [X + Math.cos(a) * 62, Y + Math.sin(a) * 50]], [230, 150, 60, 170]); } });
  dais(S, 15 * T + 8, 8 * T + 8, 36, 28, [226, 170, 84]);
  for (const [x, y] of [[9, 7], [21, 7], [8, 12], [22, 12], [11, 16], [19, 16], [12, 4], [18, 4]]) torch(S, x, y, [255, 120, 40]);
  for (const [x, y] of [[13, 18], [17, 18], [13, 21], [17, 21]]) statue(S, x, y);
  for (const [x, y, b] of [[7, 10, 0], [23, 10, 0], [9, 19, 1]]) pillar(S, x, y, [214, 188, 136], b);
});

// ---------------------------------------------------------------- Mistralton Cave and the Guidance Chamber
// Mistralton Cave: a lightless cavern of dark slate, boulders in the way.
const SLATE = { top: [26, 28, 42], face: [80, 86, 112], style: "rock" };
PLANS.UnovaMistraltonCave = mk("gravel", {
  pal: SLATE, tint: [16, 22, 60, 120], rough: 0.5,
  floor: [dc(18, 23.5, 4.5, 3.2), ln([[18, 22], [12, 19], [7, 16], [5, 12], [6, 7]], 1.7), dc(6.5, 7, 3.5, 3), dc(11, 5, 3, 2.2), ln([[12, 9], [20, 10], [28, 8]], 1.7), dc(29.5, 7.5, 3.5, 3.2), ln([[5, 16], [5, 24]], 1.6), dc(5.5, 23.5, 2.8, 2.6), ln([[19, 21], [26, 18], [28, 10]], 1.6), dc(25, 19, 3.5, 3), rc(17, 24, 19, 26)],
}, (S, p) => {
  rocky(S, 26, 3, [96, 100, 128]);
  for (const [x, y] of [[9, 17], [25, 17], [27, 20], [20, 9], [8, 5]]) boulder(S, x, y, [104, 108, 134]);
  for (const [x, y] of [[23, 20], [13, 6], [31, 5]]) crystal(S, x, y, [110, 130, 220]);
  // Darkness: only the mouths of the cave are lit.
  p.paint(70, (c) => { c.rect(0, 0, p.W * T, p.H * T, [6, 8, 30, 70]); for (const w of p.warps) glow(c, w.x * T + 8, w.y * T + 8, 46, [255, 244, 200], 14); });
});
// Guidance Chamber: a round hall at the cave's heart, a stepped dais under a shaft of light.
PLANS.UnovaGuidanceChamber = mk("gravel", {
  pal: { top: [30, 34, 50], face: [96, 104, 132], style: "rock", tall: 2 }, tint: [30, 40, 90, 90],
  floor: [dc(15, 9, 10.5, 7), rc(13, 14, 17, 23), dc(22.5, 16.5, 3.2, 2.6), dc(25, 4.5, 2.6, 2.2), rc(17, 15, 21, 17), ln([[13, 21], [8, 21], [4, 22]], 1.2)],
}, (S, p) => {
  slab(S, 11, 3, 19, 7, [128, 136, 160], -1.4); slab(S, 13, 4, 17, 6, [156, 164, 188], -1.3); steps(S, 14, 8, 3, 1, [140, 148, 172], -1.2);
  for (const [x, y] of [[10, 5], [20, 5], [8, 9], [22, 9], [10, 13], [20, 13]]) pillar(S, x, y, [150, 158, 184], false);
  for (const [x, y] of [[12, 8], [18, 8]]) torch(S, x, y, [140, 210, 255]);
  rocky(S, 8, 5, [104, 110, 138]);
  shaft(S, 13, 9, 1, 8, [200, 230, 255], 34); shaft(S, 16, 12, 1, 8, [200, 230, 255], 26);
  p.paint(-0.5, (c) => { c.ellipse(15 * T + 8, 5 * T + 8, 30, 20, [200, 230, 255, 46]); });
});

// ---------------------------------------------------------------- Chargestone Cave
// Deep blue rock veined with light: clusters of glowing crystal and charged stones adrift on every floor.
const CHARGE = { top: [16, 22, 56], face: [54, 80, 150], style: "rock" };
const BLUE = [90, 190, 255];
function chargestone(o, more) {
  return mk("caveFloor", { pal: CHARGE, tint: [14, 40, 130, 150], rough: 0.5, ...o }, (S, p) => {
    if (more) more(S, p);
    S.scatter(o.crystals || 16, 11, (S2, x, y, t) => crystal(S, x, y, t % 4 ? BLUE : [140, 230, 255], t % 3 === 0), (x, y) => S.near(x, y));
    S.scatter(o.stones || 8, 12, (S2, x, y, t) => floater(S, x, y, BLUE, 10 + (t % 3) * 3), (x, y) => !S.near(x, y));
    rocky(S, 10, 13, [70, 96, 160]);
    // Veins of light in the rock and static playing over the floor.
    p.paint(-1.5, (c) => { for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) { if (S.wall(x, y) && !S.face(x, y) && p.hash(x, y, 31) < 0.1) { const X = x * T + 3 + Math.floor(p.hash(x, y, 32) * 6), Y = y * T + 3; c.line(X, Y, X + 4, Y + 5, [70, 150, 255]); c.line(X + 4, Y + 5, X + 2, Y + 10, [70, 150, 255]); c.rect(X + 3, Y + 4, 2, 2, [190, 236, 255]); } } });
    p.paint(-0.5, (c) => S.each(null, (x, y) => { if (p.hash(x, y, 33) < 0.07) { const X = x * T + 3, Y = y * T + 4; c.line(X, Y, X + 5, Y + 3, [150, 220, 255, 170]); c.line(X + 5, Y + 3, X + 3, Y + 7, [150, 220, 255, 170]); c.line(X + 3, Y + 7, X + 9, Y + 9, [150, 220, 255, 170]); } }));
  });
}
PLANS.UnovaChargestoneCave = chargestone({
  exits: { 0: "S", 1: "hole", 2: "N" }, crystals: 22, stones: 10,
  floor: [dc(20.5, 17, 9, 7), ln([[21, 32], [21, 24]], 1.9), ln([[21, 4], [21, 10]], 1.7), dc(7, 10, 4.5, 3.5), ln([[11, 12], [14, 15]], 1.6), dc(9, 17, 3.2, 2.6), ln([[13, 4], [13, 6], [10, 8]], 1.3), dc(5, 24, 3, 3), ln([[8, 19], [5, 23]], 1.5), dc(13, 28, 3.6, 2.6),
    ln([[13, 26], [17, 22]], 1.5), ln([[15, 29], [21, 30]], 1.4), dc(33, 13.5, 4, 3.5), ln([[28, 15], [31, 14]], 1.6), dc(35.5, 6.5, 3, 2.6), ln([[35, 8], [34, 11]], 1.5), dc(27, 6.5, 3.2, 2.6), ln([[24, 7], [21, 8]], 1.4), ln([[29, 6], [33, 6]], 1.3), dc(35, 29, 3.6, 3.6), ln([[32, 29], [26, 30], [22, 30]], 1.5)],
}, (S) => { for (const [x, y] of [[17, 14], [24, 14], [16, 19], [25, 20]]) floater(S, x, y, BLUE, 16); dais(S, 20 * T + 8, 16 * T + 10, 30, 20, [50, 80, 170]); });
PLANS.UnovaChargestoneB1 = chargestone({
  exits: { 0: "up", 1: "hole" },
  floor: [dc(19, 26.5, 5, 3.4), ln([[19, 24], [19, 16]], 1.7), dc(19, 14, 6.5, 4.6), ln([[14, 12], [11, 12], [7, 8], [5, 6]], 1.6), dc(5.5, 6, 2.6, 2.2), dc(15, 6.5, 3, 2.5), ln([[15, 8], [17, 11]], 1.4), dc(5.5, 20, 3, 3), ln([[8, 20], [14, 16]], 1.5), dc(32, 24, 4, 3.5), ln([[24, 15], [30, 21]], 1.6), dc(33.5, 19.5, 2.4, 2.4)],
});
PLANS.UnovaChargestoneB2 = chargestone({
  exits: { 0: "up" }, crystals: 18,
  floor: [dc(17.5, 22, 4.6, 3.6), dc(17, 13, 9.5, 6), dc(5, 16, 3.5, 3.5), ln([[8, 15], [10, 14]], 1.5), dc(5.5, 8, 3, 2.5), ln([[5, 10], [5, 13]], 1.4), ln([[8, 8], [11, 10]], 1.4), dc(27, 5.5, 3.6, 2.8), ln([[25, 8], [23, 10]], 1.5)],
}, (S) => { for (const [x, y] of [[12, 11], [22, 11], [13, 15], [22, 15]]) crystal(S, x, y, [140, 230, 255], true); });

// ---------------------------------------------------------------- Seaside Cave
// A sea cave of wet green-grey rock: sand underfoot, tide pools everywhere, shells and weed left by the water.
const SEA = { top: [34, 58, 66], face: [104, 142, 140], style: "rock" };
function shell(S, x, y, k) { S.p.paint(-0.5, (c) => { if (!S.floor(x, y)) return; const X = x * T + 4 + (k % 3) * 3, Y = y * T + 6 + (k % 2) * 4; if (k % 3 === 0) { for (let a = 0; a < 5; a++) c.line(X + 3, Y + 3, X + 3 + Math.round(Math.cos(a * 1.257 - 1.57) * 4), Y + 3 + Math.round(Math.sin(a * 1.257 - 1.57) * 4), [236, 120, 110], 2); c.rect(X + 3, Y + 3, 1, 1, [255, 200, 180]); } else if (k % 3 === 1) { c.ellipse(X + 3, Y + 3, 4, 3, [250, 236, 220]); c.rect(X + 1, Y + 3, 5, 1, [220, 180, 170]); c.rect(X + 3, Y + 1, 1, 4, [220, 180, 170]); } else { c.line(X, Y + 6, X + 2, Y, [60, 140, 90], 2); c.line(X + 4, Y + 6, X + 6, Y + 1, [80, 170, 110], 2); } }); }
function seaside(o, more) {
  return mk("sand", { pal: SEA, tint: [60, 120, 130, 96], rough: 0.5, ...o }, (S, p) => {
    for (const q of o.pools || []) S.pool(dc(...q));
    if (more) more(S, p);
    rocky(S, o.rocks || 16, 21, [120, 150, 150]);
    for (let t = 0; t < 40; t++) shell(S, 2 + Math.floor(p.hash(t, 1, 22) * (p.W - 4)), 2 + Math.floor(p.hash(t, 2, 22) * (p.H - 4)), t);
    // Wet sand round the pools.
    p.paint(-0.8, (c) => S.each(null, (x, y) => { if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.g[S.I(x + dx, y + dy)] === 2)) c.rect(x * T, y * T, T, T, [40, 90, 110, 70]); }));
  });
}
PLANS.UnovaSeasideCave = seaside({
  pools: [[15.5, 14, 2.6, 1.7], [24.5, 17, 2.2, 1.5], [16.5, 27, 2, 1.3], [24, 25, 1.8, 1.3], [6.5, 21, 1.6, 1.2], [31.5, 28.5, 1.6, 1.2], [26, 5.5, 1.6, 1.1], [7.5, 8, 1.5, 1.1], [20, 20.5, 1.2, 1.6]],
  floor: [dc(20, 26, 7, 4), ln([[20, 24], [20, 17]], 2.2), dc(20, 15, 8.5, 5), ln([[13, 15], [7, 17]], 1.7), dc(5, 18.5, 3.5, 4), ln([[5, 15], [5, 10]], 1.5), dc(6, 9, 3.6, 3), ln([[8, 7], [13, 4]], 1.4), dc(13, 4, 2.2, 1.8), ln([[20, 11], [23, 7]], 1.7), dc(24, 6.5, 4.2, 2.8), ln([[27, 6], [33, 6]], 1.6), dc(33, 6.5, 2.6, 2.2), ln([[26, 26], [34, 27]], 1.7), dc(33, 27, 3.6, 3)],
});
PLANS.UnovaSeasideCaveDepths = seaside({
  rocks: 12, pools: [[13, 16.5, 2, 1.4], [29, 18.5, 1.6, 1.2], [21, 24.5, 1.4, 1], [8, 8.5, 1.4, 1], [24, 9, 1.6, 1.1], [14, 23.5, 1.5, 1]],
  floor: [dc(21, 16, 9.5, 6.6), dc(18, 24, 5, 2.6), rc(16, 6, 20, 12), ln([[18, 7], [24, 5], [30, 6]], 1.7), dc(30, 6.5, 2.6, 2.2), dc(6, 7, 3.6, 3), ln([[8, 9], [13, 13]], 1.5), ln([[4, 23], [9, 22], [13, 20]], 1.4), dc(11, 25.5, 2.6, 1.8), ln([[12, 25], [15, 24]], 1.3), dc(30, 22.5, 3.2, 2.6), ln([[28, 21], [26, 19]], 1.5)],
});

// ---------------------------------------------------------------- Giant Chasm
// The crater's caves: grey-violet rock rimed with frost that thickens towards Kyurem's den.
const CHASM = { top: [42, 44, 62], face: [112, 116, 148], style: "rock" };
const ICEC = [170, 220, 250];
function iceSpire(S, x, y, h = 26) { return spike(S, x, y, [176, 216, 244], h); }
PLANS.UnovaGiantChasm = mk("gravel", {
  pal: CHASM, tint: [50, 60, 110, 70], rough: 0.5,
  floor: [dc(22, 28, 6, 3.6), ln([[22, 26], [22, 19]], 2.2), dc(22, 17, 8.5, 5.2), ln([[15, 15], [9, 10], [6, 6]], 1.9), dc(6, 7, 3.2, 2.6), ln([[29, 15], [35, 9], [37, 6]], 1.9), dc(37, 7, 3.2, 2.6), ln([[36, 10], [40, 13]], 1.5), dc(40, 13.5, 1.9, 2.1), dc(10, 22, 4, 3), ln([[13, 21], [16, 19]], 1.4), ln([[33, 10], [30, 4]], 1.3), ln([[8, 24], [4, 31]], 1.3), dc(4, 31.5, 1.9, 1.6), dc(34, 22, 4, 3), ln([[28, 19], [31, 21]], 1.4)],
}, (S) => {
  S.pool(dc(22, 16.5, 3.4, 2));
  ice(S, dc(22, 16.5, 5.2, 3.4)); ice(S, dc(10, 22, 2.6, 1.8)); ice(S, dc(35, 8, 2.4, 1.6));
  dust(S, dc(34, 22, 3, 2), [236, 244, 252], 150); dust(S, dc(7, 8, 2.4, 1.8), [236, 244, 252], 150); dust(S, dc(22, 28, 4, 2), [236, 244, 252], 110);
  S.scatter(12, 41, (S2, x, y, t) => crystal(S, x, y, ICEC, t % 2 === 0), (x, y) => S.near(x, y));
  rocky(S, 16, 42, [124, 128, 160]);
  for (const [x, y] of [[18, 13], [27, 14], [8, 21], [36, 21]]) iceSpire(S, x, y, 30);
});
PLANS.UnovaGiantChasmCrater = mk("gravel", {
  pal: { top: [56, 72, 104], face: [136, 168, 208], style: "ice" }, tint: [90, 130, 190, 90], rough: 0.5,
  floor: [dc(20, 26, 6.5, 3.6), ln([[20, 24], [20, 7]], 2.3), dc(20, 15, 7.5, 5.2), dc(20, 6.5, 4.4, 2.6), ln([[15, 27], [6, 28]], 1.7), dc(6, 27, 3.6, 2.6), dc(9, 14, 4.2, 3.6), ln([[13, 15], [9, 14]], 1.5), dc(31, 16, 4.6, 4), ln([[26, 15], [30, 16]], 1.5), ln([[9, 17], [7, 25]], 1.4)],
}, (S) => {
  ice(S, dc(20, 15, 5.6, 3.6)); ice(S, dc(31, 16, 3, 2.4)); ice(S, dc(9, 14, 2.6, 2)); ice(S, dc(20, 6.5, 3, 1.4)); ice(S, dc(7, 27, 2.4, 1.4));
  dust(S, dc(20, 26, 5, 2.4), [236, 244, 252], 170); dust(S, dc(20, 10.5, 2.4, 1.6), [236, 244, 252], 150);
  S.scatter(18, 43, (S2, x, y, t) => crystal(S, x, y, t % 3 ? ICEC : [210, 240, 255], t % 2 === 0), (x, y) => S.near(x, y));
  S.scatter(12, 44, (S2, x, y, t) => iceSpire(S, x, y, 22 + (t % 3) * 5), (x, y) => S.near(x, y));
  for (const [x, y] of [[16, 13], [24, 13], [16, 18], [24, 18]]) iceSpire(S, x, y, 34);
});
// Kyurem's chamber: everything is ice: a frozen floor, walls of blue ice, great crystals round the crater.
PLANS.UnovaGiantChasmSanctum = mk("drift", {
  pal: { top: [58, 96, 150], face: [150, 200, 240], style: "ice", tall: 2 }, tint: [130, 180, 230, 80],
  floor: [dc(17, 11, 11.5, 8.6), rc(15, 18, 19, 25)],
}, (S, p) => {
  p.paint(-1.2, (c) => { const X = 17 * T + 8, Y = 8 * T; c.ellipse(X, Y, 86, 58, [120, 170, 220, 120]); c.ellipse(X, Y, 70, 46, [90, 140, 200, 130]); c.ellipse(X, Y, 70, 46, [220, 240, 255, 200], 2); for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.2; c.line(X + Math.cos(a) * 12, Y + Math.sin(a) * 8, X + Math.cos(a) * 66, Y + Math.sin(a) * 43, [230, 244, 255, 150]); } });
  ice(S, (x, y) => dc(17, 12, 9, 6.6)(x, y) || rc(16, 18, 18, 24)(x, y));
  for (const [x, y, b] of [[9, 6, 1], [25, 6, 1], [7, 11, 1], [27, 11, 1], [10, 15, 1], [24, 15, 1], [13, 3, 0], [21, 3, 0], [14, 20, 0], [20, 20, 0], [14, 23, 0], [20, 23, 0], [12, 9, 0], [22, 9, 0]]) crystal(S, x, y, b ? [150, 210, 255] : [200, 236, 255], !!b);
  for (const [x, y] of [[11, 4], [23, 4], [6, 8], [28, 8], [8, 14], [26, 14], [12, 17], [22, 17]]) iceSpire(S, x, y, 36);
  shaft(S, 14, 10, 1, 9, [220, 240, 255], 30); shaft(S, 19, 15, 1, 9, [220, 240, 255], 22);
});

// ---------------------------------------------------------------- Victory Road
// The way in: N's castle lies fallen here: flights of broken stair, toppled columns and rubble between the cliffs.
const RUIN = { top: [64, 64, 78], face: [150, 150, 172], style: "block", tall: 2 };
const CLIFF = { top: [84, 76, 62], face: [164, 140, 104], style: "rock", tall: 2 };
const GOLD = [214, 180, 90];
// A scrap of the castle's carpet (walkable).
function carpet(S, x0, y0, x1, y1, col = [120, 50, 110]) { S.p.paint(-0.9, (c) => S.each(rc(x0, y0, x1, y1), (x, y) => { if (S.p.hash(x, y, 81) < 0.2) return; const [X, Y] = P0(x, y); c.rect(X, Y, T, T, col); if (x === x0) c.rect(X, Y, 2, T, GOLD); if (x === x1) c.rect(X + 14, Y, 2, T, GOLD); if (S.p.hash(x, y, 82) < 0.3) c.rect(X + 4, Y + 6, 7, 3, sh(col, 0.7)); })); }
PLANS.UnovaVictoryRoad = mk("gravel", {
  pal: RUIN, tint: [90, 90, 120, 40], exits: { 0: "S", 1: "N", 2: "N", 3: "N" },
  floor: [rc(18, 24, 24, 31), rc(9, 13, 33, 23), rc(19, 8, 23, 13), rc(11, 8, 39, 10), rc(33, 5, 39, 8), rc(13, 8, 17, 9), rc(5, 16, 9, 21), rc(33, 16, 37, 28), rc(24, 26, 33, 28)],
  rock: [rc(12, 16, 15, 17), rc(27, 16, 30, 17), rc(14, 21, 15, 23), rc(27, 21, 28, 23)],
}, (S) => {
  carpet(S, 20, 9, 22, 30);
  steps(S, 19, 11, 5, 2, [176, 176, 196], -0.85); steps(S, 18, 23, 7, 1, [176, 176, 196], -0.85);
  for (const [x, y, b] of [[18, 25, 0], [24, 25, 1], [18, 28, 1], [24, 28, 0], [17, 14, 1], [25, 14, 0], [17, 19, 0], [25, 19, 1], [11, 13, 0], [31, 13, 1], [12, 8, 0], [18, 8, 1], [24, 8, 0], [30, 8, 1], [33, 13, 0], [9, 13, 1]]) pillar(S, x, y, [186, 186, 204], b);
  for (const [x, y, w] of [[10, 19, 3], [28, 19, 3], [26, 10, 3], [13, 22, 1], [34, 20, 3]]) fallen(S, x, y, w, [186, 186, 204]);
  for (const [x, y] of [[11, 15], [16, 21], [23, 21], [30, 15], [32, 22], [9, 23], [14, 10], [28, 27], [6, 17], [36, 24], [22, 15], [34, 9], [38, 8]]) rubble(S, x, y, [160, 160, 184]);
  for (const [x, y] of [[5, 21], [37, 28], [33, 26]]) boulder(S, x, y, [150, 140, 130]);
  for (const [x, y] of [[19, 24], [23, 24]]) torch(S, x, y, [120, 220, 255]);
  reliefs(S, GOLD);
});
// The caverns: warm brown rock, ledges with steps cut in them, pools of still water.
const BROWN = { top: [56, 42, 38], face: [150, 110, 82], style: "rock" };
PLANS.UnovaVictoryRoadDepths = mk("caveFloor", {
  pal: BROWN, rough: 0.5,
  floor: [dc(20, 26.5, 6.5, 3.6), ln([[20, 24], [20, 19]], 2.1), dc(20, 17, 8.5, 5), ln([[14, 14], [8, 9], [5, 6]], 1.8), dc(5.5, 7, 3.2, 2.6), ln([[26, 14], [32, 9], [35, 6]], 1.8), dc(35, 7, 3.2, 2.6), dc(21, 7, 3.6, 2.6), ln([[21, 9], [21, 12]], 1.6), dc(33.5, 19.5, 3.6, 3), ln([[28, 18], [31, 19]], 1.5), dc(5.5, 27, 3.2, 4.2), ln([[14, 26], [8, 26]], 1.6)],
}, (S) => {
  S.pool(dc(14.5, 17, 2.4, 1.8)); S.pool(dc(26, 19.5, 2.2, 1.4)); S.pool(dc(33, 21.5, 1.8, 1)); S.pool(dc(23.5, 27.5, 1.8, 1.1));
  steps(S, 19, 21, 3, 2, [176, 136, 100]); steps(S, 20, 10, 3, 1, [176, 136, 100]); steps(S, 10, 25, 2, 3, [176, 136, 100]);
  rocky(S, 26, 51, [160, 122, 92]);
  for (const [x, y] of [[17, 14], [24, 15], [16, 20], [7, 9], [32, 10]]) boulder(S, x, y, [170, 132, 100]);
});
// The summit: bare cliffs under the League, a long stair up the middle, terraces to either side.
PLANS.UnovaVictoryRoadSummit = mk("gravel", {
  pal: CLIFF, tint: [150, 130, 90, 50], exits: { 0: "S", 1: "N", 2: "S", 3: "hole", 4: "N" },
  floor: [rc(15, 4, 21, 25), rc(3, 14, 9, 25), rc(9, 18, 15, 20), rc(23, 12, 32, 21), rc(21, 15, 23, 17), rc(29, 3, 33, 8), rc(30, 8, 31, 12), rc(3, 3, 6, 8), rc(4, 8, 5, 14), rc(21, 22, 27, 24), rc(26, 21, 27, 22)],
}, (S, p) => {
  steps(S, 16, 12, 5, 9, [196, 176, 140], -0.85); steps(S, 16, 4, 5, 1, [196, 176, 140], -0.85); steps(S, 10, 18, 4, 3, [186, 166, 130], -0.85); steps(S, 21, 15, 2, 3, [186, 166, 130], -0.85); steps(S, 30, 9, 2, 3, [186, 166, 130], -0.85); steps(S, 4, 9, 2, 4, [186, 166, 130], -0.85);
  for (const [x, y] of [[15, 11], [21, 11], [15, 22], [21, 21]]) pillar(S, x, y, [206, 196, 170], false);
  for (const [x, y] of [[15, 4], [21, 4]]) torch(S, x, y);
  for (const [x, y] of [[3, 14], [9, 25], [23, 12], [32, 21], [33, 3], [6, 3], [27, 24], [9, 14], [32, 12], [23, 21]]) boulder(S, x, y, [170, 150, 116]);
  for (const [x, y] of [[8, 21], [26, 14], [28, 18], [4, 18], [31, 16]]) spike(S, x, y, [170, 150, 116], 22);
  dust(S, dc(27, 16.5, 3, 2), [120, 150, 90], 90); dust(S, dc(6, 21, 2.4, 2), [120, 150, 90], 90);
});

// ---------------------------------------------------------------- Wellspring Cave
// Grey limestone round still, clear water: the spring fills half of each floor.
const LIME = { top: [46, 50, 62], face: [124, 124, 138], style: "rock" };
function wellspring(o, more) { return mk("caveFloor", { pal: LIME, tint: [90, 100, 130, 110], rough: 0.5, ...o }, (S, p) => { for (const q of o.pools) S.pool(dc(...q)); if (more) more(S, p); rocky(S, 22, 61, [134, 134, 150]); p.paint(-0.8, (c) => S.each(null, (x, y) => { if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => S.g[S.I(x + dx, y + dy)] === 2)) c.rect(x * T, y * T, T, T, [50, 90, 150, 60]); })); }); }
PLANS.UnovaWellspringCave = wellspring({
  pools: [[19, 15.5, 6.5, 4], [9, 19, 2.2, 1.5], [28.5, 20, 2.2, 1.4], [25, 9, 2, 1.2], [12.5, 10.5, 1.6, 1.1]],
  floor: [dc(19, 16, 13.5, 9), ln([[19, 26], [19, 22]], 2.1), dc(19, 25, 4, 2.3), dc(31, 7, 4, 3), dc(6, 7, 4, 3), ln([[9, 9], [12, 11]], 1.6), ln([[4, 9], [3, 11]], 1.3), ln([[33, 9], [34, 10]], 1.4)],
}, (S) => { for (const [x, y] of [[11, 14], [27, 13], [14, 22], [25, 22]]) boulder(S, x, y, [140, 140, 156]); });
PLANS.UnovaWellspringDepths = wellspring({
  exits: { 0: "up" }, pools: [[23.5, 12.5, 3.6, 2.4], [12, 14.5, 2.6, 1.8], [20, 18.5, 2, 1.2], [6.5, 21, 1.6, 1], [31, 20.5, 1.6, 1], [13.5, 6, 1.6, 1], [22, 23.5, 1.4, 0.9]],
  floor: [dc(18, 22, 5.5, 3.6), dc(18, 14, 9.5, 6), dc(5.5, 19, 3.2, 3.2), ln([[8, 18], [11, 16]], 1.5), dc(15.5, 5.5, 4.2, 3), ln([[16, 8], [17, 10]], 1.6), dc(30, 22, 3.6, 3.6), ln([[26, 17], [29, 20]], 1.6), dc(29, 16.5, 2.2, 1.9)],
});

// ---------------------------------------------------------------- Dreamyard basement
// The cellar of the ruined laboratory: cracked tile, tumbled brick, dead machines and a drift of Dream Mist.
PLANS.UnovaDreamyardBasement = mk("hallFloor", {
  pal: { top: [58, 58, 64], face: [168, 160, 150], style: "brick", tall: 2 }, tint: [70, 76, 96, 70], exits: { 0: "up" },
  floor: [rc(12, 14, 24, 25), rc(4, 18, 12, 20), rc(3, 22, 8, 27), rc(5, 20, 6, 22), rc(3, 3, 9, 9), rc(5, 9, 6, 18), rc(13, 4, 24, 11), rc(17, 11, 19, 14), rc(27, 8, 33, 14), rc(24, 10, 27, 12), rc(28, 14, 30, 22), rc(24, 20, 30, 22), rc(9, 5, 13, 6)],
  rock: [rc(15, 17, 16, 18), rc(21, 21, 22, 22)],
  floorArt: (c, x, y, X, Y) => { const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; if (h % 7 === 0) { c.line(X + 2, Y + 3, X + 8, Y + 9, [60, 60, 70, 170]); c.line(X + 8, Y + 9, X + 13, Y + 10, [60, 60, 70, 170]); c.line(X + 8, Y + 9, X + 6, Y + 14, [60, 60, 70, 150]); } else if (h % 11 === 0) c.rect(X + 3, Y + 4, 9, 8, [50, 52, 60, 90]); },
}, (S, p) => {
  for (const [n, x, y] of [["rMachine", 14, 4], ["rMachine", 21, 4], ["rLabTable", 16, 8], ["rShelf", 4, 3], ["rStack", 31, 8], ["rBench", 28, 12], ["rShelf", 13, 15], ["rStack", 3, 23], ["rLabTable", 20, 15]]) S.stamp(n, x, y);
  for (const [x, y] of [[12, 14], [24, 25], [9, 9], [3, 9], [24, 4], [33, 14], [28, 22], [12, 20], [22, 18], [14, 23], [8, 27], [27, 10], [19, 6], [7, 18], [30, 17]]) rubble(S, x, y, [170, 160, 150]);
  for (const [x, y, k] of [[23, 14, 1], [24, 15, 1], [8, 22, 0], [33, 8, 1], [9, 3, 0], [12, 25, 1]]) (k ? crate : barrel)(S, x, y, k ? [150, 130, 100] : [110, 110, 120]);
  for (const [x, y, w] of [[15, 21, 3], [5, 12, 1], [29, 19, 1]]) fallen(S, x, y, w, [176, 170, 164]);
  // Dream Mist curling through the rooms.
  p.paint(60, (c) => { for (const [x, y, r] of [[18, 19, 46], [20, 8, 36], [6, 6, 30], [30, 11, 30], [6, 25, 26]]) for (let k = 0; k < 5; k++) c.ellipse(x * T + Math.cos(k * 1.9) * r * 0.5, y * T + Math.sin(k * 2.3) * r * 0.4, r * 0.6, r * 0.42, [250, 150, 210, 22]); });
});

// ---------------------------------------------------------------- Twist Mountain
// The quarry: an open pit worked in rings, plank ramps from ledge to ledge, a winch and ore carts on the pit floor.
const QUARRY = { top: [66, 52, 42], face: [160, 122, 88], style: "rock", tall: 2 };
const ORE = [[120, 110, 100], [176, 150, 90], [110, 150, 190]];
function winch(S, x, y) { return S.put(x, y, 2, 2, (c, top) => { const X = x * T, Y = y * T; c.ellipse(X + 16, Y + 29, 18, 4, [0, 0, 0, 70]); for (const dx of [2, 25]) c.box(X + dx, Y - 6, 5, 36, [150, 108, 62], [70, 46, 30]); c.box(X + 6, Y + 12, 20, 10, [120, 86, 56], [60, 40, 28]); c.ellipse(X + 16, Y + 17, 6, 6, [90, 90, 100]); c.ellipse(X + 16, Y + 17, 3, 3, [40, 40, 50]); top.box(X - 2, Y - 14, 36, 7, [170, 124, 74], [70, 46, 30]); top.line(X + 16, Y - 7, X + 16, Y + 10, [60, 56, 60]); top.poly([[X + 2, Y - 8], [X + 16, Y - 30], [X + 30, Y - 8], [X + 27, Y - 8], [X + 16, Y - 25], [X + 5, Y - 8]], [150, 108, 62]); }); }
PLANS.UnovaTwistMountain = mk("gravel", {
  pal: QUARRY, tint: [150, 104, 60, 70], rough: 0.3, exits: { 0: "S", 1: "hole", 2: "N", 3: "N" },
  floor: [(x, y) => dc(22, 20, 17, 14)(x, y) && !dc(22, 20, 12.6, 9.7)(x, y), dc(22, 20, 8.7, 6.2), rc(21, 26, 23, 30), rc(30, 19, 35, 21), rc(21, 33, 23, 35), ln([[6, 6], [8, 9], [10, 11]], 1.7), dc(38, 6.5, 2.7, 2.3), ln([[36, 8], [34, 10]], 1.7)],
}, (S, p) => {
  S.lay("deck", rc(21, 26, 23, 30)); S.lay("deck", rc(30, 19, 35, 21));
  S.lay("deck", (x, y) => y < 13 && x > 14 && x < 30 && !dc(22, 20, 12.6, 9.7)(x, y));
  rails(S, [[16, 20], [28, 20]]); rails(S, [[22, 16], [22, 24]]);
  cart(S, 17, 20, ORE[0]); cart(S, 27, 20, ORE[1]); cart(S, 22, 23, ORE[2]); winch(S, 24, 16);
  for (const [x, y, k] of [[18, 17, 0], [19, 23, 1], [26, 23, 2], [17, 22, 0], [20, 16, 1]]) boulder(S, x, y, ORE[k]);
  for (const [x, y] of [[20, 26], [24, 26], [20, 30], [24, 30], [30, 18], [35, 18], [12, 8], [32, 8], [6, 20], [38, 20], [12, 31], [32, 31], [20, 7], [24, 7]]) lamp(S, x, y);
  for (const [x, y, k] of [[9, 14, 1], [10, 13, 0], [35, 26, 1], [36, 25, 1], [8, 26, 0], [15, 32, 1], [29, 32, 0], [37, 15, 1]]) (k ? crate : barrel)(S, x, y);
  timber(S, 21, 28, 3); timber(S, 21, 34, 3);
  rocky(S, 14, 71, [170, 132, 98]);
});
// The courtyard in the mountain's heart, open to the snow: drifts, a frozen pond, walkways of timber.
PLANS.UnovaTwistDepths = mk("gravel", {
  pal: QUARRY, tint: [150, 120, 90, 50], rough: 0.4, exits: { 0: "S", 1: "N", 2: "S", 3: "E", 4: "N", 5: "W" },
  floor: [dc(20, 18, 10, 8), ln([[20, 30], [20, 25]], 2.1), rc(19, 29, 21, 31), dc(6, 6.5, 4, 3), ln([[7, 5], [10, 5]], 1.3), ln([[9, 9], [13, 13]], 1.8), ln([[11, 18], [7, 19]], 1.6), dc(33.5, 21.5, 3.2, 2.6), ln([[29, 20], [31, 21]], 1.6), dc(34, 28.5, 3, 2.3), ln([[32, 29], [26, 30], [21, 30]], 1.5), ln([[28, 13], [33, 8]], 1.8), rc(33, 6, 35, 9), rc(34, 3, 35, 6)],
}, (S, p) => {
  S.pool(dc(20, 17, 3.2, 2)); ice(S, dc(20, 17, 4.6, 3.2));
  dust(S, dc(20, 18, 9, 7), [240, 246, 252], 150); dust(S, dc(6, 7, 3, 2), [240, 246, 252], 170); dust(S, dc(33.5, 21.5, 2.4, 2), [240, 246, 252], 150); dust(S, dc(33, 28.5, 2.2, 1.6), [240, 246, 252], 130);
  S.lay("deck", ln([[20, 30], [20, 23]], 0.6)); S.lay("deck", ln([[13, 13], [9, 9]], 0.6)); S.lay("deck", ln([[28, 13], [33, 8]], 0.6));
  for (const [x, y] of [[18, 25], [22, 25], [12, 14], [28, 15], [14, 21], [26, 22]]) lamp(S, x, y);
  for (const [x, y] of [[14, 14], [26, 13], [13, 19], [27, 20], [17, 23], [23, 12]]) iceSpire(S, x, y, 28);
  for (const [x, y, k] of [[3, 7, 1], [9, 7, 0], [36, 21, 1], [31, 27, 1], [17, 11, 0]]) (k ? crate : barrel)(S, x, y);
  rocky(S, 14, 72, [170, 132, 98]);
  S.scatter(6, 73, (S2, x, y) => crystal(S, x, y, ICEC), (x, y) => S.near(x, y));
});
// The Ice Rock: a cavern sheathed in ice, the great frozen boulder at its head.
const FROZEN = { top: [56, 86, 128], face: [146, 190, 230], style: "ice", tall: 2 };
PLANS.UnovaTwistIceRock = mk("drift", {
  pal: FROZEN, tint: [130, 180, 230, 70], rough: 0.3,
  floor: [dc(17, 11.5, 10.5, 8), rc(14, 3, 20, 6), rc(15, 18, 19, 25), dc(27, 6.5, 2.7, 2.3), ln([[25, 8], [23, 9]], 1.5)],
}, (S, p) => {
  ice(S, dc(17, 13, 7.5, 5));
  S.put(16, 3, 3, 2, (c, top) => { const X = 17 * T + 8, Y = 5 * T + 12; c.ellipse(X, Y + 2, 30, 7, [0, 0, 0, 60]); glow(c, X, Y - 16, 52, [160, 220, 255], 18); for (const cv of [c, top]) { cv.poly([[X - 26, Y], [X - 22, Y - 22], [X - 8, Y - 40], [X + 10, Y - 42], [X + 24, Y - 24], [X + 27, Y]], [96, 150, 206]); cv.poly([[X - 23, Y - 1], [X - 19, Y - 21], [X - 7, Y - 37], [X + 9, Y - 39], [X + 21, Y - 23], [X + 24, Y - 1]], [170, 220, 250]); cv.poly([[X - 19, Y - 21], [X - 7, Y - 37], [X + 2, Y - 30], [X - 6, Y - 14]], [226, 246, 255]); cv.poly([[X + 2, Y - 30], [X + 9, Y - 39], [X + 21, Y - 23], [X + 8, Y - 16]], [136, 196, 240]); cv.line(X - 6, Y - 14, X + 8, Y - 16, [240, 250, 255]); cv.line(X - 6, Y - 14, X - 10, Y - 1, [120, 180, 230]); cv.line(X + 8, Y - 16, X + 12, Y - 1, [120, 180, 230]); } }, 5.5);
  for (const [x, y, b] of [[11, 6, 1], [23, 6, 1], [9, 11, 0], [25, 12, 0], [11, 16, 1], [23, 16, 1], [14, 21, 0], [20, 21, 0]]) crystal(S, x, y, b ? [150, 210, 255] : [200, 236, 255], !!b);
  S.scatter(10, 74, (S2, x, y, t) => iceSpire(S, x, y, 22 + (t % 3) * 5), (x, y) => S.near(x, y));
  shaft(S, 14, 10, 1, 8, [220, 240, 255], 26);
});
// Regigigas's hall, sealed under the mountain: a temple of grey blocks, braille round the walls.
const TEMPLE = { top: [44, 44, 56], face: [132, 132, 150], style: "block", tall: 2 };
PLANS.UnovaTwistRegigigas = mk("ruinFloor", {
  pal: TEMPLE, tint: [60, 60, 90, 50], exits: { 0: "S", 1: "S" },
  floor: [rc(8, 4, 24, 15), rc(14, 15, 18, 23), rc(3, 17, 14, 19), rc(4, 19, 6, 23), rc(18, 15, 29, 17)],
}, (S, p) => {
  slab(S, 12, 4, 20, 8, [150, 150, 170], -1.4); slab(S, 14, 4, 18, 7, [176, 176, 196], -1.3); steps(S, 15, 9, 3, 1, [160, 160, 180], -1.2);
  p.paint(-1.1, (c) => { const X = 16 * T + 8, Y = 12 * T + 8; for (const [dx, dy] of [[-20, -8], [0, -8], [20, -8], [-20, 8], [0, 8], [20, 8], [0, 0]]) { c.ellipse(X + dx, Y + dy, 5, 5, [40, 40, 54]); c.ellipse(X + dx, Y + dy, 3, 3, dy ? [230, 200, 90] : [230, 90, 80]); } });
  for (const [x, y] of [[9, 5], [23, 5], [9, 9], [23, 9], [9, 13], [23, 13], [14, 16], [18, 16], [14, 21], [18, 21]]) pillar(S, x, y, [170, 170, 190], false);
  for (const [x, y] of [[12, 9], [20, 9]]) torch(S, x, y, [140, 230, 160]);
  for (let x = 9; x <= 23; x += 2) braille(S, x, 3); for (let x = 20; x <= 28; x += 2) braille(S, x, 14); for (let x = 4; x <= 12; x += 2) braille(S, x, 16);
  for (const [x, y] of [[24, 15], [8, 15], [29, 17]]) rubble(S, x, y, [150, 150, 170]);
});

// ---------------------------------------------------------------- Clay Tunnel
// The miners' road under Driftveil: square-cut galleries of red clay, cart rails, lamps and timber props.
const CLAY = { top: [84, 52, 38], face: [178, 118, 78], style: "rock", tall: 2 };
const clayTint = [176, 96, 52, 80];
PLANS.UnovaClayTunnel = mk("caveFloor", {
  pal: CLAY, tint: clayTint,
  floor: [rc(18, 26, 24, 31), rc(20, 14, 22, 26), rc(5, 13, 36, 16), rc(4, 5, 8, 13), rc(27, 5, 36, 8), rc(30, 8, 32, 13), rc(27, 18, 31, 22), rc(28, 16, 30, 18), rc(33, 27, 37, 32), rc(34, 16, 36, 27), rc(7, 16, 9, 21), rc(12, 5, 16, 13), rc(8, 6, 12, 7)],
}, (S) => {
  rails(S, [[21, 30], [21, 15]]); rails(S, [[6, 15], [35, 15]]); rails(S, [[35, 15], [35, 28]]); rails(S, [[31, 15], [31, 7]]); rails(S, [[14, 15], [14, 6]]);
  cart(S, 11, 15, ORE[0]); cart(S, 26, 15, [200, 120, 70]); cart(S, 35, 22, ORE[1]); cart(S, 14, 8, [200, 120, 70]);
  for (const [x, y, w] of [[20, 24, 3], [20, 19, 3], [34, 20, 3], [34, 25, 3], [30, 11, 3], [12, 10, 5]]) timber(S, x, y, w);
  for (const [x, y] of [[18, 26], [24, 26], [5, 13], [10, 13], [18, 13], [27, 13], [36, 13], [4, 5], [27, 5], [36, 8], [27, 22], [33, 32], [12, 5], [9, 21]]) lamp(S, x, y);
  for (const [x, y, k] of [[18, 31, 1], [19, 31, 0], [8, 5, 1], [8, 12, 0], [16, 5, 1], [31, 22, 1], [37, 27, 0], [27, 18, 1]]) (k ? crate : barrel)(S, x, y);
  for (const [x, y] of [[7, 21], [24, 31], [16, 12], [12, 13], [36, 16]]) boulder(S, x, y, [190, 130, 90]);
});
PLANS.UnovaClayTunnelDepths = mk("caveFloor", {
  pal: CLAY, tint: clayTint, exits: { 0: "S", 1: "N", 2: "N", 3: "E", 4: "N" },
  floor: [rc(16, 23, 22, 27), rc(18, 8, 20, 23), rc(4, 5, 33, 8), rc(33, 3, 33, 5), rc(4, 8, 6, 25), rc(3, 25, 7, 28), rc(6, 15, 18, 17), rc(20, 16, 34, 18), rc(31, 18, 33, 26), rc(10, 17, 13, 22), rc(24, 10, 28, 16)],
}, (S) => {
  rails(S, [[19, 26], [19, 7]]); rails(S, [[5, 7], [30, 7]]); rails(S, [[5, 7], [5, 24]]); rails(S, [[7, 16], [33, 16]]); rails(S, [[32, 16], [32, 24]]);
  cart(S, 12, 7, ORE[0]); cart(S, 23, 7, [200, 120, 70]); cart(S, 26, 16, ORE[2]); cart(S, 5, 12, [200, 120, 70]); cart(S, 19, 12, ORE[1]);
  for (const [x, y, w] of [[18, 21, 3], [18, 11, 3], [4, 11, 3], [4, 20, 3], [31, 21, 3], [24, 13, 5]]) timber(S, x, y, w);
  for (const [x, y] of [[16, 23], [22, 23], [9, 5], [14, 5], [22, 5], [29, 5], [10, 15], [15, 15], [24, 18], [29, 18], [34, 16], [3, 25], [7, 28], [10, 22], [28, 10]]) lamp(S, x, y);
  for (const [x, y, k] of [[16, 27, 1], [22, 27, 0], [13, 17, 1], [13, 22, 0], [24, 10, 1], [25, 10, 1], [33, 26, 0], [4, 5, 1]]) (k ? crate : barrel)(S, x, y);
  for (const [x, y] of [[10, 19], [27, 12], [12, 21], [31, 26]]) boulder(S, x, y, [190, 130, 90]);
});

// ---------------------------------------------------------------- Underground Ruins and the three sealed chambers
// The antechamber: three doors in a wall of braille, each under its golem's stone.
const RUINS = { top: [58, 50, 44], face: [156, 138, 112], style: "block", tall: 2 };
// The dot pattern of a golem's face laid in the floor, pixel centre.
function dots(S, cx, cy, pts, col, z = -1.1) { S.p.paint(z, (c) => { for (const [dx, dy] of pts) { c.ellipse(cx + dx, cy + dy, 6, 6, [36, 34, 44]); c.ellipse(cx + dx, cy + dy, 4, 4, col); c.ellipse(cx + dx - 1, cy + dy - 1, 1.5, 1.5, mix(col, WHITE, 0.6)); } }); }
const FACE = { rock: [[-16, -12], [16, -12], [-16, 0], [0, 0], [16, 0], [-16, 12], [16, 12]], ice: [[0, -14], [-14, 0], [0, 0], [14, 0], [0, 14], [-14, -14], [14, 14]], steel: [[-8, -14], [8, -14], [-16, 0], [0, 0], [16, 0], [-8, 14], [8, 14]] };
const GOLEM = { rock: [214, 130, 70], ice: [130, 210, 250], steel: [170, 180, 200] };
PLANS.UnovaUndergroundRuins = mk("ruinFloor", {
  pal: RUINS, tint: [130, 100, 60, 60], exits: { 0: "S", 1: "N", 2: "N", 3: "N", 4: "S" },
  floor: [rc(4, 6, 29, 15), rc(15, 15, 19, 25), rc(4, 15, 6, 25), rc(6, 20, 15, 22)],
}, (S, p) => {
  for (let x = 4; x <= 29; x++) if (![6, 7, 8, 15, 16, 17, 24, 25, 26].includes(x)) braille(S, x, 5);
  [[7, "rock"], [16, "ice"], [25, "steel"]].forEach(([x, k]) => { p.paint(-0.7, (c) => { const X = x * T + 8, Y = 3 * T; c.box(X - 6, Y - 6, 12, 10, sh(GOLEM[k], 0.6), [40, 34, 30]); c.rect(X - 4, Y - 4, 8, 6, GOLEM[k]); c.rect(X - 3, Y - 3, 3, 2, mix(GOLEM[k], WHITE, 0.6)); }); dots(S, x * T + 8, 9 * T, FACE[k].map(([a, b]) => [a * 0.6, b * 0.6]), GOLEM[k]); });
  slab(S, 14, 11, 20, 14, [176, 158, 130], -1.4);
  for (const [x, y, b] of [[4, 6, 0], [11, 6, 0], [12, 6, 1], [20, 6, 0], [21, 6, 0], [29, 6, 0], [4, 15, 1], [11, 15, 0], [23, 15, 0], [29, 15, 0], [15, 19, 0], [19, 19, 0]]) pillar(S, x, y, [196, 178, 150], b);
  for (const [x, y] of [[13, 12], [21, 12], [15, 24], [19, 24]]) torch(S, x, y);
  for (const [x, y] of [[27, 13], [9, 14], [8, 21], [5, 18]]) rubble(S, x, y, [176, 158, 130]);
});
function regi(kind, ground, pal, tint, more) {
  return mk(ground, { pal, tint, floor: [rc(8, 4, 24, 14), rc(14, 14, 18, 25), rc(6, 21, 14, 24)] }, (S, p) => {
    const col = GOLEM[kind];
    for (let x = 8; x <= 24; x++) braille(S, x, 3, 1, mix(col, WHITE, 0.5));
    for (let x = 6; x <= 13; x += 2) braille(S, x, 20, 1, mix(col, WHITE, 0.5));
    slab(S, 12, 4, 20, 8, sh(pal.face, 0.9), -1.4); slab(S, 14, 4, 18, 7, sh(pal.face, 1.1), -1.3); steps(S, 15, 9, 3, 1, pal.face, -1.2);
    dots(S, 16 * T + 8, 12 * T, FACE[kind], col);
    p.paint(-1.15, (c) => { c.ellipse(16 * T + 8, 12 * T, 34, 26, A(col, 50)); c.ellipse(16 * T + 8, 12 * T, 34, 26, A(col, 160), 2); });
    for (const [x, y] of [[9, 5], [23, 5], [9, 9], [23, 9], [9, 13], [23, 13]]) pillar(S, x, y, mix(pal.face, WHITE, 0.25), false);
    for (const [x, y] of [[13, 9], [19, 9], [14, 18], [18, 18]]) torch(S, x, y, col);
    more(S, p);
  });
}
PLANS.UnovaRegiRegirock = regi("rock", "caveFloor", { top: [70, 50, 36], face: [170, 124, 84], style: "block", tall: 2 }, [170, 110, 60, 50], (S) => {
  dust(S, dc(10, 12, 2.4, 1.8), SANDC, 170); dust(S, dc(22.5, 7, 2, 1.6), SANDC, 170); dust(S, dc(9, 22.5, 3, 1.4), SANDC, 150);
  for (const [x, y] of [[11, 11], [21, 12], [8, 14], [24, 4], [14, 23]]) boulder(S, x, y, [180, 134, 92]);
  for (const [x, y] of [[10, 7], [22, 11]]) rubble(S, x, y, [180, 134, 92]);
});
PLANS.UnovaRegiRegice = regi("ice", "drift", FROZEN, [130, 180, 230, 70], (S) => {
  ice(S, (x, y) => rc(10, 9, 22, 13)(x, y) || rc(15, 14, 17, 22)(x, y));
  for (const [x, y, b] of [[11, 11, 1], [21, 11, 1], [8, 14, 0], [24, 14, 0], [10, 6, 0], [22, 6, 0]]) crystal(S, x, y, b ? [150, 210, 255] : [200, 236, 255], !!b);
  for (const [x, y] of [[8, 4], [24, 4], [14, 16], [18, 16], [6, 21]]) iceSpire(S, x, y, 28);
});
PLANS.UnovaRegiRegisteel = regi("steel", "ruinFloor", { top: [46, 50, 62], face: [150, 160, 180], style: "block", tall: 2 }, [120, 140, 180, 70], (S, p) => {
  // Riveted plates.
  p.paint(-1.45, (c) => S.each(null, (x, y) => { const [X, Y] = P0(x, y); if ((x + y) % 2 === 0) c.rect(X, Y, T, T, [200, 210, 230, 40]); for (const [dx, dy] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.rect(X + dx, Y + dy, 1, 1, [60, 66, 84]); }));
  for (const [x, y] of [[11, 11], [21, 11], [10, 7], [22, 7]]) S.put(x, y, 1, 1, (c, top) => { const [X, Y] = P0(x, y); c.ellipse(X + 8, Y + 13, 8, 3, [0, 0, 0, 70]); c.box(X + 2, Y - 2, 12, 16, [150, 160, 180], [50, 54, 70]); c.rect(X + 4, Y, 2, 12, [220, 228, 240]); top.box(X + 2, Y - 14, 12, 13, [150, 160, 180], [50, 54, 70]); top.rect(X + 4, Y - 12, 2, 11, [220, 228, 240]); top.ellipse(X + 8, Y - 16, 6, 3, [190, 198, 214]); });
  for (const [x, y] of [[8, 14], [24, 14], [6, 24], [13, 21]]) crate(S, x, y, [130, 140, 160]);
});

// ---------------------------------------------------------------- Dragonspiral Tower
// A round tower of weathered blue stone: each floor a ring about the open well, broken and fallen columns, and the
// stair spiralling on up the wall.
const TOWER = { top: [50, 58, 78], face: [136, 150, 178], style: "block", tall: 2 };
const TCOL = [170, 182, 206];
const ring = (cx, cy, rx, ry, a, b, gaps = []) => (x, y) => { const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry), t = Math.atan2(y + 0.5 - cy, x + 0.5 - cx); return d >= a && d <= b && !gaps.some(([g0, g1]) => t >= g0 && t <= g1); };
function tower(o, more) {
  return mk("ruinFloor", { pal: TOWER, tint: [70, 96, 150, 56], exits: { 0: "hole", 1: "up" }, ...o, floor: [dc(17, 15, 14.5, 12), rc(26, 5, 29, 8), rc(16, 24, 18, 26), ...(o.floor || [])] }, (S, p) => {
    steps(S, 26, 5, 3, 1, [160, 172, 198], -1.2); steps(S, 26, 6, 2, 1, [150, 162, 188], -1.2);
    if (more) more(S, p);
    for (const [x, y, b] of o.pillars || []) pillar(S, x, y, TCOL, b);
    for (const [x, y, w] of o.fallen || []) fallen(S, x, y, w, TCOL);
    for (const [x, y] of o.rubble || []) rubble(S, x, y, [150, 162, 188]);
    // Cracks and moss in the old floor.
    p.paint(-1.3, (c) => S.each(null, (x, y) => { const h = p.hash(x, y, 91), [X, Y] = P0(x, y); if (h < 0.1) { c.line(X + 3, Y + 2, X + 8, Y + 8, [40, 46, 66, 170]); c.line(X + 8, Y + 8, X + 6, Y + 14, [40, 46, 66, 170]); } else if (h < 0.16) c.ellipse(X + 8, Y + 8, 6, 4, [70, 130, 90, 80]); }));
    reliefs(S);
  });
}
PLANS.UnovaDragonspiralTower = mk("ruinFloor", {
  pal: TOWER, tint: [70, 96, 150, 56], exits: { 0: "S", 1: "up" },
  floor: [dc(18, 15.5, 15, 12), rc(16, 26, 20, 27), rc(28, 5, 31, 9), ln([[3, 3], [4, 6], [7, 8]], 1.3)],
}, (S, p) => {
  steps(S, 28, 5, 3, 1, [160, 172, 198], -1.2);
  S.pool(ring(18, 15.5, 9, 7, 0.66, 1), [[17, 19, 17, 23], [18, 19, 18, 23], [19, 19, 19, 23], [17, 7, 17, 11], [18, 7, 18, 11], [19, 7, 19, 11]]);
  dais(S, 18 * T + 8, 15 * T + 8, 62, 44, [150, 164, 192]);
  for (const [x, y, b] of [[15, 13, 0], [21, 13, 1], [15, 18, 1], [21, 18, 0], [8, 9, 0], [28, 22, 1], [7, 21, 0], [12, 25, 0], [24, 25, 1], [11, 6, 1], [24, 5, 0]]) pillar(S, x, y, TCOL, b);
  fallen(S, 5, 14, 3, TCOL); fallen(S, 27, 14, 3, TCOL);
  for (const [x, y] of [[9, 23], [29, 11], [6, 17], [22, 26]]) rubble(S, x, y, [150, 162, 188]);
  for (const [x, y] of [[16, 25], [20, 25]]) torch(S, x, y, [120, 200, 255]);
  reliefs(S);
});
PLANS.UnovaDragonspiral2 = tower({ pillars: [[9, 8, 0], [25, 10, 1], [7, 15, 1], [27, 16, 0], [10, 22, 0], [24, 22, 1], [17, 6, 0]], fallen: [[11, 12, 3], [21, 19, 3]], rubble: [[13, 20], [22, 9], [6, 12]] }, (S) => { pit(S, dc(17, 15, 4.6, 3.6), [150, 162, 188]); });
PLANS.UnovaDragonspiral3 = tower({ rock: [ring(17, 15, 14.5, 12, 0.5, 0.64, [[-0.5, 0.2], [2.2, 2.9], [-2.4, -1.9]])], pillars: [[17, 15, 0], [14, 14, 1], [20, 16, 1], [6, 10, 0], [28, 19, 0]], fallen: [[15, 23, 1], [5, 16, 2], [27, 12, 2]], rubble: [[17, 12], [12, 6], [23, 24], [8, 21]] });
PLANS.UnovaDragonspiral4 = tower({ pillars: [[8, 8, 0], [26, 21, 0], [17, 7, 1], [9, 20, 1], [24, 9, 0]], fallen: [[14, 10, 3], [19, 21, 3], [7, 13, 2]], rubble: [[21, 12], [11, 17], [25, 17]] }, (S) => { pit(S, dc(12, 15.5, 2.6, 2), [150, 162, 188]); pit(S, dc(22, 15.5, 2.6, 2), [150, 162, 188]); pit(S, dc(17, 20, 2, 1.5), [150, 162, 188]); });
PLANS.UnovaDragonspiral5 = tower({ rock: [ring(17, 15, 14.5, 12, 0.42, 0.56, [[0.9, 2.2], [-2.2, -1.2]]), ring(17, 15, 14.5, 12, 0.76, 0.86, [[-0.2, 0.7], [2.5, 3.2], [-3.2, -2.6], [-1.3, -0.5]])], pillars: [[17, 15, 1], [15, 14, 0], [19, 16, 0]], fallen: [[16, 21, 3]], rubble: [[17, 17], [12, 5], [22, 25]] });
PLANS.UnovaDragonspiral6 = tower({ pillars: [[7, 12, 0], [8, 19, 1], [12, 24, 0], [22, 24, 0], [27, 18, 1], [11, 6, 0], [20, 4, 1]], fallen: [[21, 8, 3]], rubble: [[23, 5], [28, 9], [9, 16], [25, 21]] }, (S) => { pit(S, ring(17, 15, 9.5, 7.6, 0.45, 1, [[1.3, 1.85], [-1.85, -1.3]]), [150, 162, 188]); pillar(S, 17, 15, TCOL, true); });
PLANS.UnovaDragonspiral7 = tower({ floor: [ln([[4, 7], [6, 9]], 1.2)], pillars: [[9, 9, 1], [25, 9, 0], [8, 21, 0], [26, 21, 1], [17, 9, 0], [17, 21, 1]], fallen: [[13, 13, 3], [19, 17, 3], [22, 13, 2]], rubble: [[15, 19], [21, 6], [10, 15], [24, 18]] }, (S) => { pit(S, dc(9.5, 15, 2, 2.6), [150, 162, 188]); pit(S, dc(24.5, 15, 2, 2.6), [150, 162, 188]); pit(S, dc(17, 15, 2.4, 1.6), [150, 162, 188]); });
// The summit: open to the sky, the dragon's altar ringed by what is left of the colonnade.
PLANS.UnovaDragonspiralSummit = mk("ruinFloor", {
  pal: { top: [124, 170, 226], face: [136, 150, 178], style: "block" }, tint: [70, 96, 150, 40], exits: { 0: "hole" },
  floor: [dc(17, 13, 12.5, 10.6), rc(15, 22, 19, 26)],
}, (S, p) => {
  // Cloud below the parapet.
  p.paint(-1.6, (c) => { for (let t = 0; t < 46; t++) { const x = Math.floor(p.hash(t, 1, 95) * p.W), y = Math.floor(p.hash(t, 2, 95) * p.H); if (!S.wall(x, y) || S.near(x, y) || S.near(x + 1, y) || S.near(x - 1, y)) continue; const X = x * T + 8, Y = y * T + 8; c.ellipse(X, Y + 3, 22, 7, [236, 244, 255, 200]); c.ellipse(X - 8, Y, 10, 7, [250, 252, 255, 220]); c.ellipse(X + 6, Y - 2, 12, 8, [250, 252, 255, 220]); } });
  p.paint(-1.2, (c) => { const X = 17 * T + 8, Y = 13 * T; c.ellipse(X, Y, 150, 124, [200, 214, 240, 40], 6); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; c.line(X + Math.cos(a) * 60, Y + Math.sin(a) * 48, X + Math.cos(a) * 150, Y + Math.sin(a) * 122, [40, 50, 80, 60]); } });
  dais(S, 17 * T + 8, 7 * T + 8, 74, 50, [150, 164, 192], -1.1); dais(S, 17 * T + 8, 7 * T, 46, 30, [186, 198, 222], -1.05); steps(S, 16, 10, 3, 2, [160, 172, 198], -1);
  for (const [x, y, b] of [[11, 5, 0], [23, 5, 0], [8, 9, 1], [26, 9, 0], [6, 14, 0], [28, 14, 1], [8, 19, 0], [26, 19, 0], [12, 22, 1], [22, 22, 0], [13, 9, 0], [21, 9, 0]]) pillar(S, x, y, TCOL, b);
  fallen(S, 10, 16, 3, TCOL); fallen(S, 21, 17, 3, TCOL);
  for (const [x, y] of [[14, 11], [20, 11]]) torch(S, x, y, [120, 200, 255]);
  for (const [x, y] of [[9, 13], [25, 12], [15, 20], [23, 15]]) rubble(S, x, y, [150, 162, 188]);
});

// ---------------------------------------------------------------- Cave of Being
// A small, still cave: a clear pool under a shaft of light, three stones in the lake spirits' colours.
PLANS.UnovaCaveOfBeing = mk("caveFloor", {
  pal: { top: [36, 40, 62], face: [108, 116, 150], style: "rock" }, tint: [60, 80, 150, 110], rough: 0.4,
  floor: [dc(16, 12, 9.6, 7.6), ln([[16, 22], [16, 18]], 1.9), rc(15, 21, 17, 23)],
}, (S, p) => {
  S.pool(dc(16, 13.5, 4.6, 2.6));
  p.paint(-0.8, (c) => { c.ellipse(16 * T, 13 * T + 8, 100, 62, [150, 200, 255, 36]); c.ellipse(16 * T, 13 * T + 8, 100, 62, [200, 230, 255, 90], 2); });
  crystal(S, 10, 9, [250, 220, 90], true); crystal(S, 22, 9, [250, 130, 190], true); crystal(S, 16, 18, [110, 180, 255], true);
  for (const [x, y] of [[13, 6], [19, 6]]) torch(S, x, y, [200, 230, 255]);
  rocky(S, 12, 97, [120, 128, 164]);
  shaft(S, 13, 10, 2, 13, [220, 236, 255], 30); shaft(S, 17, 14, 2, 13, [220, 236, 255], 22);
});

module.exports = PLANS;
