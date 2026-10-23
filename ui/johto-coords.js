// Johto's coordinates: HeartGold and SoulSilver's (which Johto's scripts and events are written in) to the maps'
// (Pokémon Heart & Soul's, which draw them: tools/build-johto.js and tools/lib/hns-johto.js), and back.
//
// Each Johto map built from Heart & Soul's carries `hgss`: for each HGSS map whose events are on it, that map's
// size and a fit from its tiles to this map's: an affine part (x and y scaled and moved) and anchors (HGSS tiles
// known to be where they are here: doors, signs, people matched one to one), whose leftovers are spread out by
// inverse-distance weights. window.JOHTO_COORDS.where[hgssMap] names the map an HGSS map's events went to.
//
//   JohtoCoords.toMap(hgssMap, x, y)  -> { map, x, y } (rounded, onto a tile you can stand on if one is near)
//   JohtoCoords.toHgss(map, x, y)     -> { map, x, y } (the HGSS map and tile that comes here)
//   JohtoCoords.forward(src, x, y)    -> [x, y] (unrounded: src is one of a map's hgss entries)
//   JohtoCoords.retarget(tracks, ctx) -> the tracks, their walks re-planned for the map (below)
(function (root) {
  "use strict";

  // Least squares, each axis: g = s * h + o (s kept between 0.5 and 2; with one anchor, or all in a line, s = 1).
  function fitAxis(hs, gs) {
    const n = hs.length;
    if (!n) return [1, 0];
    const mh = hs.reduce((a, v) => a + v, 0) / n, mg = gs.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (hs[i] - mh) * (gs[i] - mg); sxx += (hs[i] - mh) * (hs[i] - mh); }
    const s = sxx >= 4 && n >= 2 ? Math.max(0.5, Math.min(2, sxy / sxx)) : 1;
    return [s, mg - s * mh];
  }
  function fit(anchors) {
    const ax = fitAxis(anchors.map((a) => a[0]), anchors.map((a) => a[2])), ay = fitAxis(anchors.map((a) => a[1]), anchors.map((a) => a[3]));
    return [ax[0], ax[1], ay[0], ay[1]];
  }
  function forward(src, hx, hy) {
    const f = src.fit, gx = f[0] * hx + f[1], gy = f[2] * hy + f[3];
    const A = src.anchors || [];
    if (!A.length) return [gx, gy];
    let ws = 0, rx = 0, ry = 0;
    for (const a of A) {
      const d2 = (hx - a[0]) * (hx - a[0]) + (hy - a[1]) * (hy - a[1]);
      const ex = a[2] - (f[0] * a[0] + f[1]), ey = a[3] - (f[2] * a[1] + f[3]);
      if (d2 === 0) return [a[2], a[3]];
      const w = 1 / (d2 * d2);
      ws += w; rx += w * ex; ry += w * ey;
    }
    return [gx + rx / ws, gy + ry / ws];
  }

  // The nearest tile to (x, y) that `ok` takes, within `radius` steps (or the tile itself).
  function snap(x, y, w, h, ok, radius) {
    x = Math.max(0, Math.min(w - 1, Math.round(x))); y = Math.max(0, Math.min(h - 1, Math.round(y)));
    if (!ok || ok(x, y)) return [x, y];
    let best = null, bd = Infinity;
    const R = radius || 6;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const u = x + dx, v = y + dy;
      if (u < 0 || v < 0 || u >= w || v >= h || !ok(u, v)) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [u, v]; }
    }
    return best || [x, y];
  }

  const maps = () => root.WORLD_MAPS || {};
  const where = () => (root.JOHTO_COORDS && root.JOHTO_COORDS.where) || {};
  const srcOf = (map, hgss) => ((maps()[map] || {}).hgss || []).find((s) => s.map === hgss);
  // Where you can stand: not solid, on the map.
  const standable = (m) => (x, y) => !m.collision[y * m.width + x];

  function toMap(hgss, x, y) {
    const map = where()[hgss];
    const m = map && maps()[map], src = m && srcOf(map, hgss);
    if (!src) return { map: hgss, x, y };
    const [gx, gy] = forward(src, x, y);
    const [sx, sy] = snap(gx, gy, m.width, m.height, standable(m), 3);
    return { map, x: sx, y: sy };
  }
  // (toMap, onto a tile nobody stands on and no door is on, too: an item ball this game adds.)
  function toMapFree(hgss, x, y) {
    const t = toMap(hgss, x, y), m = maps()[t.map];
    if (!m || t.map === hgss && !m.hgss) return t;
    const busy = (u, v) => m.people.some((p) => p.x === u && p.y === v) || m.warps.some((w) => w.x === u && w.y === v);
    const [sx, sy] = snap(t.x, t.y, m.width, m.height, (u, v) => standable(m)(u, v) && !busy(u, v), 4);
    return { map: t.map, x: sx, y: sy };
  }
  // Back: the HGSS tile (of the map's sources) that comes nearest here (worked out tile by tile, kept).
  const backCache = {};
  // (only: one HGSS map's tiles, when the map has several's.)
  function toHgss(map, x, y, only) {
    const m = maps()[map];
    if (!m || !m.hgss || !m.hgss.length) return { map, x, y };
    const list = m.hgss.filter((s) => !only || s.map === only), key = map + ":" + (only || "") + ":" + x + "," + y;
    if (backCache[key]) return backCache[key];
    let best = null, bd = Infinity;
    for (const src of list.length ? list : m.hgss) for (let hy = 0; hy < src.height; hy++) for (let hx = 0; hx < src.width; hx++) {
      const [gx, gy] = forward(src, hx, hy), d = (gx - x) * (gx - x) + (gy - y) * (gy - y);
      if (d < bd) { bd = d; best = { map: src.map, x: hx, y: hy }; }
    }
    return (backCache[key] = best || { map, x, y });
  }

  // A scene's walks, HGSS's, re-planned for this map. Each track's walks are followed in HGSS's tiles (from where
  // the walker is, taken back there), and each straight run's end brought here; the walker goes there by the
  // shortest way round what's solid (BFS), at the run's pace, and faces the way HGSS's last step did. Jumps that
  // still land a jump's length away stay jumps. Everything else (turns, waits, emotes) is kept as it is.
  //   ctx: { map, at(who) -> { x, y } | null, free(x, y, who) -> bool (no one else is there) }
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const virtual = {};   // (who -> { map, g, h }: where a walker was left, both ways, so runs don't drift)
  function path(m, from, to, ok) {
    const W = m.width, H = m.height, key = (x, y) => y * W + x;
    if (from.x === to.x && from.y === to.y) return [];
    const prev = new Map([[key(from.x, from.y), null]]), q = [[from.x, from.y]];
    let found = false;
    for (let qi = 0; qi < q.length && qi < 6000; qi++) {
      const [x, y] = q[qi];
      if (x === to.x && y === to.y) { found = true; break; }
      for (const d of ["up", "down", "left", "right"]) {
        const u = x + DIRS[d][0], v = y + DIRS[d][1], k = key(u, v);
        if (u < 0 || v < 0 || u >= W || v >= H || prev.has(k)) continue;
        if (!(u === to.x && v === to.y) && !ok(u, v)) continue;
        prev.set(k, [x, y, d]); q.push([u, v]);
      }
    }
    if (!found) {
      // (No way round: straight there, across and then along.)
      const out = [];
      for (let x = from.x; x !== to.x; x += Math.sign(to.x - from.x)) out.push(to.x > from.x ? "right" : "left");
      for (let y = from.y; y !== to.y; y += Math.sign(to.y - from.y)) out.push(to.y > from.y ? "down" : "up");
      return out;
    }
    const steps = [];
    for (let k = key(to.x, to.y); prev.get(k); ) { const [x, y, d] = prev.get(k); steps.unshift(d); k = key(x, y); }
    return steps;
  }
  function retarget(tracks, ctx) {
    const m = maps()[ctx.map];
    if (!m || !m.hgss || !m.hgss.length) return tracks;
    return tracks.map((t) => {
      const at = ctx.at(t.who);
      if (!at) return t;
      const v = virtual[t.who];
      let h = v && v.map === ctx.map && v.g.x === at.x && v.g.y === at.y ? Object.assign({}, v.h) : toHgss(ctx.map, at.x, at.y);
      const src = m.hgss.find((s) => s.map === h.map) || m.hgss[0];
      let g = { x: at.x, y: at.y };
      const out = [];
      let run = null;
      const solid = (x, y) => !!m.collision[y * m.width + x];
      const flush = () => {
        if (!run) return;
        const [fx, fy] = forward(src, h.x, h.y);
        let [tx, ty] = snap(fx, fy, m.width, m.height, (x, y) => !solid(x, y), 2);
        let steps = path(m, g, { x: tx, y: ty }, (x, y) => !solid(x, y));
        // (Not onto someone else: a step short.)
        if (steps.length && !ctx.free(tx, ty, t.who)) {
          const last = steps.pop();
          tx -= DIRS[last][0]; ty -= DIRS[last][1];
        }
        for (const d of steps) out.push(run.pace + "_" + d);
        if (steps.length && steps[steps.length - 1] !== run.last) out.push("face_" + run.last);
        g = { x: tx, y: ty };
        run = null;
      };
      for (const mv of [].concat(t.moves)) {
        let r;
        if ((r = /^(walk(?:_slow|_fast|_faster)?)_(up|down|left|right)$/.exec(mv))) {
          if (run && run.pace !== r[1]) flush();
          run = run || { pace: r[1] };
          run.last = r[2];
          h = { map: h.map, x: h.x + DIRS[r[2]][0], y: h.y + DIRS[r[2]][1] };
        } else if ((r = /^jump(_2)?_(up|down|left|right)$/.exec(mv))) {
          flush();
          const n = r[1] ? 2 : 1, d = DIRS[r[2]];
          h = { map: h.map, x: h.x + d[0] * n, y: h.y + d[1] * n };
          const [fx, fy] = forward(src, h.x, h.y), tx = Math.round(fx), ty = Math.round(fy);
          if (tx === g.x + d[0] * n && ty === g.y + d[1] * n) { out.push(mv); g = { x: tx, y: ty }; }
          else { run = { pace: "walk", last: r[2] }; flush(); }
        } else { flush(); out.push(mv); }
      }
      flush();
      virtual[t.who] = { map: ctx.map, g, h };
      return Object.assign({}, t, { moves: out });
    });
  }

  const api = { fit, forward, snap, toMap, toMapFree, toHgss, retarget, path };
  root.JohtoCoords = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
