// Renders a HeartGold / SoulSilver overworld map (pret/pokeheartgold) to 2D
// layers at 16 px a tile, the way this game's maps are drawn: everything
// (below sprites) and what stands in front of sprites (the "top" layer), plus
// its tile permissions and events. tools/build-johto.js uses it.
//
//   const r = renderMap(pokeheartgoldPath, "MAP_NEW_BARK", { proj: "oblique" })
//   // -> { width, height (tiles), below, top (RGBA, width*16 x height*16),
//   //      perm (u16 a tile: low byte the HGSS behaviour, bit 15 solid),
//   //      events, header, cells }
//
// How: the map header (src/data/map_headers.h) gives its area data and the
// main matrix (files/fielddata/mapmatrix) its chunks (land data, a/0/6/5:
// 32x32 permissions, building placements, an NSBMD terrain model). Every
// terrain model and building of the map's chunks (and the ring around them,
// for overhanging trees and roofs) is rasterised orthographically in
// software, 1 world unit a pixel (a tile is 16), with FireRed's look
// ("oblique": house fronts and tree trunks drawn upward from their tiles;
// "top" is straight down). Supersampled 2x. Parsing: tools/lib/nitro.js.
"use strict";
const fs = require("fs");
const path = require("path");
const { readNarc } = require("./narc");
const N = require("./nitro");
const M = N.M;

// Building models that aren't drawn: the windmills' turning blades (an
// animated model whose rest pose is long thin slivers across the map).
const SKIP_BUILDINGS = new Set([]);   // (none so far)

// A triangle at least 24 units long and under 2.5 across, not upright.
function sliver(t) {
  const P = t.v.map((v) => v.p);
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (v) => Math.hypot(v[0], v[1], v[2]);
  const e = [sub(P[1], P[0]), sub(P[2], P[1]), sub(P[0], P[2])];
  const longest = Math.max(...e.map(len));
  // (Upright ones are poles, and stay.)
  const long = e.find((v) => len(v) === longest);
  if (Math.abs(long[1]) > 0.9 * longest) return false;
  const c = [e[0][1] * e[1][2] - e[0][2] * e[1][1], e[0][2] * e[1][0] - e[0][0] * e[1][2], e[0][0] * e[1][1] - e[0][1] * e[1][0]];
  return longest > 24 && len(c) / longest < 2.5;
}

function renderMap(ROOT, MAPCONST, opts) {
  opts = opts || {};
  const PROJ = opts.proj || "oblique", K = opts.k || 1, SS = opts.ss || 2, GROUND = 16;
  const flag = (k) => !!opts[k];
  const F = (p) => path.join(ROOT, "files", p);
  // ---------- map header / matrix ----------
  const mapsH = fs.readFileSync(path.join(ROOT, "include/constants/maps.h"), "utf8");
  const mapIds = {}; for (const m of mapsH.matchAll(/#define\s+(MAP_\w+)\s+(\d+)/g)) mapIds[m[1]] = +m[2];
  const headersSrc = fs.readFileSync(path.join(ROOT, "src/data/map_headers.h"), "utf8");
  function header(c) {
    const i = headersSrc.indexOf("[" + c + "] = {");
    const blk = headersSrc.slice(i, headersSrc.indexOf("},", i));
    const get = (k) => { const m = blk.match(new RegExp("\\." + k + "\\s*=\\s*([\\w]+)")); return m && m[1]; };
    return { areaDataBank: +get("areaDataBank"), matrixId: get("matrixId"), eventsBank: get("eventsBank"), mapType: get("mapType"),
      wild: get("wildEncounterBank"), dayMusic: get("dayMusicId"), weather: +get("weather") };
  }
  function readMatrix(file) {
    const b = fs.readFileSync(file); let p = 0;
    const w = b[p++], h = b[p++], hh = b[p++], ha = b[p++], nl = b[p++]; p += nl;
    const hdr = [], alt = [], land = [];
    for (let i = 0; i < w * h; i++) hdr.push(hh ? b.readUInt16LE(p + 2 * i) : 0); if (hh) p += 2 * w * h;
    for (let i = 0; i < w * h; i++) alt.push(ha ? b[p + i] : 0); if (ha) p += w * h;
    for (let i = 0; i < w * h; i++) land.push(b.readUInt16LE(p + 2 * i));
    return { w, h, hdr, alt, land };
  }
  const mapId = mapIds[MAPCONST];
  const H = header(MAPCONST);
  const mtxDir = F("fielddata/mapmatrix/map_matrix");
  const mtxFile = fs.readdirSync(mtxDir).sort().find((f) => f.startsWith("map_matrix_0000"));
  const MX = readMatrix(path.join(mtxDir, mtxFile));
  const cells = [];
  for (let z = 0; z < MX.h; z++) for (let x = 0; x < MX.w; x++) if (MX.hdr[z * MX.w + x] === mapId) cells.push([x, z]);
  if (!cells.length) throw new Error(MAPCONST + " is not on the main matrix");
  const cx0 = Math.min(...cells.map((c) => c[0])), cx1 = Math.max(...cells.map((c) => c[0]));
  const cz0 = Math.min(...cells.map((c) => c[1])), cz1 = Math.max(...cells.map((c) => c[1]));
  if (opts.verbose) console.log(MAPCONST, "id", mapId, "cells", JSON.stringify(cells), "area", H.areaDataBank);

  // ---------- area data: textures ----------
  const area = readNarc(F("a/0/4/2"))[H.areaDataBank];
  const buildTexSet = area.readUInt16LE(0), mapTexSet = area.readUInt16LE(2), outdoor = area[6];
  const mapTex = N.parseNsb(readNarc(F("a/0/4/4"))[mapTexSet]).tex;
  const bldTex = N.parseNsb(readNarc(F("a/0/7/0"))[buildTexSet]).tex;
  const bldModels = readNarc(F(outdoor ? "a/0/4/0" : "a/1/4/8"));
  const lands = readNarc(F("a/0/6/5"));

  // ---------- land data ----------
  function readLand(id) {
    const b = lands[id];
    const permSize = b.readUInt32LE(0), bldSize = b.readUInt32LE(4), mdlSize = b.readUInt32LE(8), bdhcSize = b.readUInt32LE(12);
    const ex = b.readUInt16LE(0x12), p0 = 0x14 + ex;
    const perm = []; for (let i = 0; i < 1024; i++) perm.push(b.readUInt16LE(p0 + 2 * i));
    const builds = [];
    for (let i = 0; i < bldSize / 48; i++) {
      const o = p0 + permSize + i * 48, r = (k) => b.readInt32LE(o + k * 4);
      builds.push({ id: b.readUInt32LE(o), pos: [r(1) / 4096, r(2) / 4096, r(3) / 4096], rot: [r(4), r(5), r(6)], scale: [r(7) / 4096, r(8) / 4096, r(9) / 4096] });
    }
    const mo = p0 + permSize + bldSize;
    return { perm, builds, model: b.subarray(mo, mo + mdlSize), bdhc: b.subarray(mo + mdlSize, mo + mdlSize + bdhcSize) };
  }

  // ---------- textures (cached RGBA) ----------
  const texCache = new Map();
  function textureFor(mat, preferTex) {
    if (!mat || !mat.texName) return null;
    const key = (preferTex === bldTex ? "b:" : "m:") + mat.texName + "/" + mat.palName;
    if (texCache.has(key)) return texCache.get(key);
    let t = null;
    for (const tex of [preferTex, mapTex, bldTex]) {
      if (tex && tex.textures[mat.texName]) { t = N.decodeTexture(tex, mat.texName, mat.palName); if (t) break; }
    }
    if (!t) console.warn("missing texture", mat.texName, mat.palName);
    texCache.set(key, t);
    return t;
  }

  // ---------- gather triangles ----------
  const tris = [];
  let bldCount = 0;
  for (let z = cz0 - 1; z <= cz1 + 1; z++) for (let x = cx0 - 1; x <= cx1 + 1; x++) {
    if (x < 0 || z < 0 || x >= MX.w || z >= MX.h) continue;
    const lid = MX.land[z * MX.w + x];
    if (lid === 0xffff || lid >= lands.length) continue;
    const L = readLand(lid);
    const wx = x * 512 + 256, wz = z * 512 + 256, wy = MX.alt[z * MX.w + x] * 16 * 0; // (altitude unused: flat Johto start)
    const nsb = N.parseNsb(L.model);
    for (const m of nsb.models) for (const t of N.buildTriangles(m, M.trans(wx, wy, wz))) { t.tex = nsb.tex || mapTex; tris.push(t); }
    if (flag("nobuildings")) continue;
    for (const b of L.builds) {
      const bm = bldModels[b.id];
      if (!bm) { console.warn("no building model", b.id); continue; }
      if (SKIP_BUILDINGS.has(b.id)) continue;
      const nb = N.parseNsb(bm);
      const ang = (v) => (v / 65536) * 2 * Math.PI; // rotations are u16 angles
      let mtx = M.trans(wx + b.pos[0], wy + b.pos[1], wz + b.pos[2]);
      if (b.rot[1]) mtx = M.mul(mtx, M.rotY(ang(b.rot[1])));
      if (b.rot[0]) mtx = M.mul(mtx, M.rotX(ang(b.rot[0])));
      if (b.rot[2]) mtx = M.mul(mtx, M.rotZ(ang(b.rot[2])));
      mtx = M.mul(mtx, M.scale(...b.scale));
      for (const m of nb.models) for (const t of N.buildTriangles(m, mtx)) {
        // (Slivers, long and next to no width: the windmills' blades in
        // their rest pose, which draw as lines across the map.)
        if (sliver(t)) continue;
        t.tex = nb.tex || bldTex; t.building = true; tris.push(t);
      }
      bldCount++;
    }
  }
  if (opts.verbose) console.log("triangles", tris.length, "buildings", bldCount);

  // ---------- rasterise ----------
  // (Surfaces below the ground, sunken water, are not shifted, so they stay on their tiles.)
  const W = (cx1 - cx0 + 1) * 32 * 16, Hh = (cz1 - cz0 + 1) * 32 * 16;
  const ox = cx0 * 512, oz = cz0 * 512;
  const SW = W * SS, SH = Hh * SS;
  // Two layers: below sprites, above sprites (the "top" layer).
  const color = new Float32Array(SW * SH * 4), depth = new Float32Array(SW * SH).fill(-1e9);
  const isTop = new Uint8Array(SW * SH);
  const project = (p) => PROJ === "top"
    ? [(p[0] - ox) * SS, (p[2] - oz) * SS, p[1]]
    : [(p[0] - ox) * SS, (p[2] - oz - K * Math.max(0, p[1] - GROUND)) * SS, p[1] * 1 + p[2] * K];

  function sample(t, mat, u, v) {
    const tp = (mat.texParam | t.params) >>> 0;
    const wrap = (c, n, rep, mir) => {
      let i = Math.floor(c * n);
      if (!rep) return Math.min(n - 1, Math.max(0, i));
      if (mir) { const per = Math.floor(i / n); i = ((i % n) + n) % n; return per & 1 ? n - 1 - i : i; }
      return ((i % n) + n) % n;
    };
    const x = wrap(u, t.w, tp & (1 << 16), tp & (1 << 18)), y = wrap(v, t.h, tp & (1 << 17), tp & (1 << 19));
    const i = (y * t.w + x) * 4;
    return [t.rgba[i], t.rgba[i + 1], t.rgba[i + 2], t.rgba[i + 3]];
  }

  function raster(tri, translucentPass) {
    const mat = tri.mat;
    const tex = textureFor(mat, tri.tex);
    const matAlpha = mat ? mat.alpha : 1;
    const translucent = matAlpha < 0.99 || (tex && (tex.fmt === 1 || tex.fmt === 6));
    if (translucent !== translucentPass) return;
    const P = tri.v.map((v) => project(v.p));
    // Back-face culling (the DS culls per material). Screen y down, so CCW in world = ...
    const area2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area2) < 1e-9) return;
    if (mat && mat.cullBack && area2 > 0 && !flag("nocull")) return;
    if (mat && mat.cullFront && area2 < 0 && !flag("nocull")) return;
    const minX = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), maxX = Math.min(SW - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), maxY = Math.min(SH - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area2;
      const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area2;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const d = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2];
      const idx = y * SW + x;
      if (d < depth[idx] - 0.01) continue;
      const V = tri.v;
      const c = [0, 1, 2].map((k) => w0 * V[0].c[k] + w1 * V[1].c[k] + w2 * V[2].c[k]);
      let rgba;
      if (tex) {
        const u = w0 * V[0].uv[0] + w1 * V[1].uv[0] + w2 * V[2].uv[0], v = w0 * V[0].uv[1] + w1 * V[1].uv[1] + w2 * V[2].uv[1];
        rgba = sample(tex, mat, u, v);
      } else rgba = [255 * 0.35, 255 * 0.6, 255 * 0.95, 255]; // untextured (animated water surfaces): water blue
      let a = (rgba[3] / 255) * matAlpha;
      if (!translucentPass && a < 0.5) continue;  // alpha test
      const lit = flag("nolight") ? [1, 1, 1] : c.map((v) => Math.min(1, v / 0.81)); // vertex colours are ~0.81 = full brightness
      const r = rgba[0] * lit[0], g = rgba[1] * lit[1], b = rgba[2] * lit[2];
      if (translucentPass) {
        color[idx * 4] = color[idx * 4] * (1 - a) + r * a; color[idx * 4 + 1] = color[idx * 4 + 1] * (1 - a) + g * a;
        color[idx * 4 + 2] = color[idx * 4 + 2] * (1 - a) + b * a; color[idx * 4 + 3] = 255;
      } else {
        color[idx * 4] = r; color[idx * 4 + 1] = g; color[idx * 4 + 2] = b; color[idx * 4 + 3] = 255;
        depth[idx] = d;
        // Top layer: the surface belongs to something standing further south
        // than the tile row it is drawn on (tree crowns, roofs, house fronts).
        const wz = w0 * V[0].p[2] + w1 * V[1].p[2] + w2 * V[2].p[2];
        const wy = w0 * V[0].p[1] + w1 * V[1].p[1] + w2 * V[2].p[1];
        const screenRow = Math.floor(y / SS / 16), surfRow = Math.floor((wz - oz) / 16 - 1e-3);
        isTop[idx] = PROJ !== "top" && wy > GROUND + 1.5 && surfRow > screenRow ? 1 : 0;
      }
    }
  }
  for (const t of tris) raster(t, false);
  const transl = tris.filter((t) => true).sort((a, b) => (a.v[0].p[1] + a.v[0].p[2]) - (b.v[0].p[1] + b.v[0].p[2]));
  for (const t of transl) raster(t, true);

  function layer(sel) {
    const out = new Uint8Array(W * Hh * 4);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const i = (y * SS + sy) * SW + x * SS + sx;
        if (!sel(i)) continue;
        r += color[i * 4]; g += color[i * 4 + 1]; b += color[i * 4 + 2]; a += color[i * 4 + 3] ? 1 : 0;
      }
      const o = (y * W + x) * 4;
      if (a) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; out[o + 3] = Math.round(255 * a / (SS * SS)); }
    }
    return out;
  }
  // ---------- collision / behaviour / events ----------
  const tw = (cx1 - cx0 + 1) * 32, th = (cz1 - cz0 + 1) * 32;
  const perm = new Array(tw * th).fill(0x80ff);
  for (const [x, z] of cells) {
    const L = readLand(MX.land[z * MX.w + x]);
    for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) perm[((z - cz0) * 32 + ty) * tw + (x - cx0) * 32 + tx] = L.perm[ty * 32 + tx];
  }
  const evFile = fs.readdirSync(F("fielddata/eventdata/zone_event")).find((f) => H.eventsBank && f.replace(/\.json$/, "") === H.eventsBank.replace(/^NARC_zone_event_/, "").replace(/_bin$/, ""));
  const ev = evFile ? JSON.parse(fs.readFileSync(F("fielddata/eventdata/zone_event/" + evFile), "utf8")) : null;
  const loc = (o) => ({ x: o.x - cx0 * 32, y: o.z - cz0 * 32 });
  const data = {
    map: MAPCONST, id: mapId, header: H, cells, origin: { cellX: cx0, cellZ: cz0 }, width: tw, height: th,
    // permission u16 per tile: low byte = HGSS tile behaviour (include/constants/metatile_behavior.h), bit 15 = solid
    behavior: perm.map((v) => v & 0xff), collision: perm.map((v) => (v >> 15) & 1), flags: perm.map((v) => (v >> 8) & 0x7f),
    events: ev && {
      warps: ev.warps.map((w) => Object.assign(loc(w), { map: w.header, anchor: w.anchor })),
      signs: ev.bgs.map((s) => Object.assign(loc(s), { script: s.scriptId, type: s.type })),
      people: ev.objects.map((o) => Object.assign(loc(o), { id: o.id, sprite: o.spriteId, movement: o.movement, facing: o.facingDirection, flag: o.eventFlag, script: o.scriptId, rangeX: o.xRange, rangeY: o.yRange })),
      triggers: ev.coords.map((c) => Object.assign(loc(c), { w: c.w, h: c.h, script: c.scriptId, var: c.var, val: c.val }))
    }
  };



  return Object.assign(data, { below: layer(() => true), top: layer((i) => isTop[i]), perm });
}

module.exports = { renderMap };
