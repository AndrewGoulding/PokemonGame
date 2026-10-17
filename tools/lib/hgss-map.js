// Renders a HeartGold / SoulSilver overworld map (pret/pokeheartgold) to 2D
// layers at 16 px a tile, the way this game's maps are drawn: everything
// (below sprites) and what stands in front of sprites (the "top" layer), plus
// its tile permissions and events. tools/build-johto.js uses it.
//
//   const r = renderMap(pokeheartgoldPath, "MAP_NEW_BARK", { proj: "oblique" })
//   // -> { width, height (tiles), below, top (RGBA, width*16 x height*16),
//   //      perm (u16 a tile: low byte the HGSS behaviour, bit 15 solid),
//   //      events, header, cells, ground (each tile's ground height, with opts.ground) }
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

// A land's BDHC: where you stand. Points (x, z), slopes (normals), heights
// (plane constants), then plates, each a rectangle between two points on the
// plane of a slope and a height (y = -(nx x + nz z + d) / ny), in the chunk's
// own coordinates (-256 to 256). All 20.12 fixed point.
function readBdhc(b) {
  if (!b || b.length < 16 || b.toString("ascii", 0, 4) !== "BDHC") return null;
  let p = 4;
  const [np, ns, nh, npl] = [0, 1, 2, 3].map((k) => b.readUInt16LE(p + 2 * k));
  p += 12;
  const pts = [], sl = [], hs = [], plates = [];
  for (let i = 0; i < np; i++, p += 8) pts.push([b.readInt32LE(p) / 4096, b.readInt32LE(p + 4) / 4096]);
  for (let i = 0; i < ns; i++, p += 12) sl.push([b.readInt32LE(p) / 4096, b.readInt32LE(p + 4) / 4096, b.readInt32LE(p + 8) / 4096]);
  for (let i = 0; i < nh; i++, p += 4) hs.push(b.readInt32LE(p) / 4096);
  for (let i = 0; i < npl; i++, p += 8) plates.push([0, 2, 4, 6].map((k) => b.readUInt16LE(p + k)));
  return {
    heightAt(x, z) {
      let best = null;
      for (const [a, c, si, hi] of plates) {
        const [x1, z1] = pts[a], [x2, z2] = pts[c], [nx, ny, nz] = sl[si];
        if (!ny || x < Math.min(x1, x2) || x > Math.max(x1, x2) || z < Math.min(z1, z2) || z > Math.max(z1, z2)) continue;
        const y = -(nx * x + nz * z + hs[hi]) / ny;
        if (best == null || y > best) best = y;
      }
      return best;
    }
  };
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
  // (The main matrix, or the map's own: a cave's or a building's, all of it the map.)
  const mtxDir = F("fielddata/mapmatrix/map_matrix");
  const own = H.matrixId && H.matrixId.replace(/^NARC_map_matrix_/, "").replace(/_bin$/, ".bin");
  const main = !own || /^map_matrix_0000/.test(own);
  const mtxFile = main ? fs.readdirSync(mtxDir).sort().find((f) => f.startsWith("map_matrix_0000")) : own;
  const MX = readMatrix(path.join(mtxDir, mtxFile));
  const cells = [];
  for (let z = 0; z < MX.h; z++) for (let x = 0; x < MX.w; x++) {
    if (main ? MX.hdr[z * MX.w + x] === mapId : MX.land[z * MX.w + x] !== 0xffff) cells.push([x, z]);
  }
  if (!cells.length) throw new Error(MAPCONST + " has no chunks on its matrix");
  const cx0 = Math.min(...cells.map((c) => c[0])), cx1 = Math.max(...cells.map((c) => c[0]));
  const cz0 = Math.min(...cells.map((c) => c[1])), cz1 = Math.max(...cells.map((c) => c[1]));
  if (opts.verbose) console.log(MAPCONST, "id", mapId, "cells", JSON.stringify(cells), "area", H.areaDataBank);

  // ---------- area data: textures ----------
  const area = readNarc(F("a/0/4/2"))[H.areaDataBank];
  const buildTexSet = area.readUInt16LE(0), mapTexSet = area.readUInt16LE(2), outdoor = area[6];
  const mapTexNarc = readNarc(F("a/0/4/4")), bldTexNarc = readNarc(F("a/0/7/0")), areas = readNarc(F("a/0/4/2"));
  const texSets = new Map();
  // (An interior may have no set of building textures, or an empty one.)
  const texSet = (narc, i) => {
    const k = (narc === mapTexNarc ? "m" : "b") + i;
    if (!texSets.has(k)) texSets.set(k, narc[i] && narc[i].length > 16 ? N.parseNsb(narc[i]).tex : null);
    return texSets.get(k);
  };
  const mapTex = texSet(mapTexNarc, mapTexSet);
  const bldTex = texSet(bldTexNarc, buildTexSet);
  // (A chunk of a neighbouring map, in the ring round this one: its own map's textures.)
  const idToConst = {}; for (const [c, id] of Object.entries(mapIds)) if (!(id in idToConst)) idToConst[id] = c;
  const chunkTex = (x, z) => {
    const id = main && MX.hdr[z * MX.w + x];
    if (!id || id === mapId || !idToConst[id]) return [mapTex, bldTex];
    const h = header(idToConst[id]);
    const a = h && areas[h.areaDataBank];
    if (!a) return [mapTex, bldTex];
    return [texSet(mapTexNarc, a.readUInt16LE(2)), texSet(bldTexNarc, a.readUInt16LE(0))];
  };
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
  const texIds = new Map();
  const texId = (t) => { if (!texIds.has(t)) texIds.set(t, texIds.size); return texIds.get(t); };
  function textureFor(mat, preferTex, secondTex) {
    if (!mat || !mat.texName) return null;
    const key = texId(preferTex) + "/" + texId(secondTex) + ":" + mat.texName + "/" + mat.palName;
    if (texCache.has(key)) return texCache.get(key);
    let t = null;
    for (const tex of [preferTex, secondTex, mapTex, bldTex]) {
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
    const nsb = N.parseNsb(L.model), [cMapTex, cBldTex] = chunkTex(x, z);
    for (const m of nsb.models) for (const t of N.buildTriangles(m, M.trans(wx, wy, wz))) { t.tex = nsb.tex || cMapTex; t.tex2 = cBldTex; tris.push(t); }
    if (flag("nobuildings")) continue;
    for (const b of L.builds) {
      const bm = bldModels[b.id];
      if (!bm) { console.warn("no building model", b.id); continue; }
      if (SKIP_BUILDINGS.has(b.id)) continue;
      const nb = N.parseNsb(bm);
      const group = { tris: [], id: b.id, x: wx + b.pos[0], z: wz + b.pos[2] };
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
        t.tex = nb.tex || cBldTex; t.tex2 = cMapTex; t.building = group; group.tris.push(t); tris.push(t);
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
  // (opts.ground: maps that aren't flat. Each tile's ground is the height the
  // game stands you at there (its BDHC) where you can walk or Surf, and a
  // solid tile's its neighbour's; everything is drawn from the ground
  // it stands on, so raised ground stays on its tiles and a house or tree on
  // it still rises from its base.)
  const TW = (cx1 - cx0 + 1) * 32, TH = (cz1 - cz0 + 1) * 32;
  let G = null, open = null, wet = null;
  if (opts.ground) {
    // (Only where you can walk or Surf: a tree's crown or a rock's top isn't ground.)
    open = new Uint8Array(TW * TH); wet = new Uint8Array(TW * TH);
    for (const [x, z] of cells) {
      const L = readLand(MX.land[z * MX.w + x]);
      for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) {
        const v = L.perm[ty * 32 + tx], i = ((z - cz0) * 32 + ty) * TW + (x - cx0) * 32 + tx;
        open[i] = (v >> 15) & 1 ? 0 : 1;
        wet[i] = [0x10, 0x13, 0x15, 0x22].includes(v & 0xff) ? 1 : 0;
      }
    }
    G = new Float32Array(TW * TH).fill(-Infinity);
    // (From each chunk's BDHC, the heights the game stands you at: flat or
    // sloping rectangles, "plates", each a plane. Where they overlap, a bridge
    // over water, the higher.)
    for (const [x, z] of cells) {
      const B = readBdhc(readLand(MX.land[z * MX.w + x]).bdhc);
      if (!B) continue;
      for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) {
        const i = ((z - cz0) * 32 + ty) * TW + (x - cx0) * 32 + tx;
        if (!open[i]) continue;
        const h = B.heightAt(tx * 16 + 8 - 256, ty * 16 + 8 - 256);
        if (h != null && h > G[i]) G[i] = h;
      }
    }
    // (Tiles with no floor, the solid ones, take a neighbour's.)
    for (let pass = 0, left = true; left && pass < 256; pass++) {
      left = false;
      const next = G.slice();
      for (let i = 0; i < G.length; i++) {
        if (G[i] !== -Infinity) continue;
        const x = i % TW, z = Math.floor(i / TW);
        let best = -Infinity;
        for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const u = x + dx, w = z + dz;
          if (u >= 0 && w >= 0 && u < TW && w < TH && G[w * TW + u] > best) best = G[w * TW + u];
        }
        if (best === -Infinity) left = true; else next[i] = best;
      }
      G = next;
    }
    for (let i = 0; i < G.length; i++) if (G[i] === -Infinity) G[i] = GROUND;
  }
  const groundAt = (x, z) => {
    const tx = Math.min(TW - 1, Math.max(0, Math.floor((x - ox) / 16))), tz = Math.min(TH - 1, Math.max(0, Math.floor((z - oz) / 16)));
    return G[tz * TW + tx];
  };
  // (A vertex stands on the highest ground of the tiles around it that isn't
  // above it, so a corner shared by raised and lower ground is drawn the same
  // for both, and a cliff's foot stays on the low ground.)
  const groundUnder = (x, y, z) => {
    let best = -Infinity, low = Infinity;
    for (const dx of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
      const g = groundAt(x + dx, z + dz);
      if (g <= y + 0.5 && g > best) best = g;
      if (g < low) low = g;
    }
    return best === -Infinity ? low : best;
  };
  // (A building, a tree or a house, stands on one ground, at its foot, so it
  // rises whole; one over two grounds, a waterfall between its pools, is
  // drawn from the ground under each corner, as the land is.)
  if (G) {
    // (Land well below the solid tiles it's under, the sea's plane under a
    // mountain, is hidden in 3D; drawn, it shows through the cracks between
    // the mountain's terraces. Left out.)
    // (Hidden: more than 64 under the highest land surface over a solid tile,
    // under a mountain's top, not a tree's crown.)
    const top = new Float32Array(TW * TH).fill(-Infinity);
    for (const t of tris) {
      if (t.building) continue;
      const P = t.v.map((v) => v.p);
      const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const len = Math.hypot(...n), d = (P[1][0] - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (P[1][2] - P[0][2]);
      if (!len || Math.abs(n[1]) / len < 0.5 || Math.abs(d) < 1e-9) continue;
      const tx0 = Math.max(0, Math.floor((Math.min(P[0][0], P[1][0], P[2][0]) - ox) / 16)), tx1 = Math.min(TW - 1, Math.floor((Math.max(P[0][0], P[1][0], P[2][0]) - ox) / 16));
      const tz0 = Math.max(0, Math.floor((Math.min(P[0][2], P[1][2], P[2][2]) - oz) / 16)), tz1 = Math.min(TH - 1, Math.floor((Math.max(P[0][2], P[1][2], P[2][2]) - oz) / 16));
      for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) {
        const px = ox + tx * 16 + 8, pz = oz + tz * 16 + 8;
        const w1 = ((px - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (pz - P[0][2])) / d;
        const w2 = ((P[1][0] - P[0][0]) * (pz - P[0][2]) - (px - P[0][0]) * (P[1][2] - P[0][2])) / d;
        if (w1 < -1e-6 || w2 < -1e-6 || w1 + w2 > 1 + 1e-6) continue;
        const y = P[0][1] + w1 * (P[1][1] - P[0][1]) + w2 * (P[2][1] - P[0][1]);
        if (y > top[tz * TW + tx]) top[tz * TW + tx] = y;
      }
    }
    const buried = (p) => {
      const tx = Math.floor((p[0] - ox) / 16), tz = Math.floor((p[2] - oz) / 16);
      if (tx < 0 || tz < 0 || tx >= TW || tz >= TH) return false;
      return !open[tz * TW + tx] && p[1] < top[tz * TW + tx] - 64;
    };
    for (const t of tris) if (!t.building && t.v.every((v) => buried(v.p))) t.buried = true;
    for (const t of tris) if (!t.building) t.g = t.v.map((v) => groundUnder(v.p[0], v.p[1], v.p[2]));
    for (const grp of new Set(tris.filter((t) => t.building).map((t) => t.building))) {
      const ps = grp.tris.flatMap((t) => t.v.map((v) => v.p));
      const x0 = Math.min(...ps.map((p) => p[0])), x1 = Math.max(...ps.map((p) => p[0]));
      const z0 = Math.min(...ps.map((p) => p[2])), z1 = Math.max(...ps.map((p) => p[2]));
      const foot = Math.min(...ps.map((p) => p[1]));
      let lo = Infinity, hi = -Infinity;
      // (Two tiles north too: a waterfall is a sheet on the row below its top.)
      for (let tz = Math.floor((z0 - oz) / 16) - 2; tz <= Math.floor((z1 - oz) / 16 - 1e-3); tz++) for (let tx = Math.floor((x0 - ox) / 16); tx <= Math.floor((x1 - ox) / 16 - 1e-3); tx++) {
        if (tx < 0 || tz < 0 || tx >= TW || tz >= TH || !open[tz * TW + tx]) continue;
        lo = Math.min(lo, G[tz * TW + tx]); hi = Math.max(hi, G[tz * TW + tx]);
      }
      grp.spans = hi - lo > 32;
      if (opts.verbose) console.log("building", Math.round(x0 - ox), Math.round(z0 - oz), Math.round(x1 - x0), Math.round(z1 - z0), "foot", Math.round(foot), "ground", lo, hi, grp.spans);
      const g = groundUnder((x0 + x1) / 2, foot, z1 - 1);
      for (const t of grp.tris) t.g = grp.spans ? t.v.map((v) => groundUnder(v.p[0], v.p[1], v.p[2])) : [g, g, g];
    }
  }
  let solidAround = null;
  // (The textures of the water you Surf on and its falls: never in front of you.)
  // (Those mostly on such tiles: a rock standing in the water isn't water.)
  const waterTex = new Set();
  if (G) {
    const count = new Map();
    for (const t of tris) {
      if (!t.mat || !t.mat.texName) continue;
      const tx = Math.floor(((t.v[0].p[0] + t.v[1].p[0] + t.v[2].p[0]) / 3 - ox) / 16), tz = Math.floor(((t.v[0].p[2] + t.v[1].p[2] + t.v[2].p[2]) / 3 - oz) / 16);
      if (tx < 0 || tz < 0 || tx >= TW || tz >= TH) continue;
      const c = count.get(t.mat.texName) || [0, 0];
      c[0] += wet[tz * TW + tx]; c[1]++;
      count.set(t.mat.texName, c);
    }
    for (const [name, [w, n]] of count) if (w > 0.8 * n) waterTex.add(name);
  }
  if (G) {
    solidAround = new Uint8Array(TW * TH);
    for (let z = 0; z < TH; z++) for (let x = 0; x < TW; x++) {
      let all = true;
      for (let dz = -1; dz <= 1 && all; dz++) for (let dx = -1; dx <= 1 && all; dx++) {
        const u = x + dx, w = z + dz;
        if (u >= 0 && w >= 0 && u < TW && w < TH && open[w * TW + u]) all = false;
      }
      solidAround[z * TW + x] = all ? 1 : 0;
    }
  }
  const project = (p, g) => PROJ === "top"
    ? [(p[0] - ox) * SS, (p[2] - oz) * SS, p[1]]
    : g != null ? [(p[0] - ox) * SS, (p[2] - oz - K * Math.max(0, p[1] - g)) * SS, (p[1] - g) + p[2] * K]
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
    const tex = textureFor(mat, tri.tex, tri.tex2);
    const matAlpha = mat ? mat.alpha : 1;
    const translucent = matAlpha < 0.99 || (tex && (tex.fmt === 1 || tex.fmt === 6));
    if (translucent !== translucentPass) return;
    if (tri.buried) return;
    // (The sea inside a mountain: its tile and all round it solid, and not
    // water. Hidden in 3D; drawn, it shows between the mountain's terraces.)
    const inRock = solidAround && mat && /^sea_(on|un)/.test(mat.texName) ? (w0, w1, w2) => {
      const V = tri.v, wx = w0 * V[0].p[0] + w1 * V[1].p[0] + w2 * V[2].p[0], wz = w0 * V[0].p[2] + w1 * V[1].p[2] + w2 * V[2].p[2];
      const tx = Math.floor((wx - ox) / 16), tz = Math.floor((wz - oz) / 16);
      return tx >= 0 && tz >= 0 && tx < TW && tz < TH && solidAround[tz * TW + tx];
    } : null;
    const P = tri.v.map((v, k) => project(v.p, tri.g ? tri.g[k] : null));
    // Back-face culling (the DS culls per material). Screen y down, so CCW in world = ...
    const area2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area2) < 1e-9) return;
    // (A triangle the ground's heights turn over, between two heights, is folded: left out.)
    if (tri.g) {
      const Q = tri.v.map((v) => [v.p[0], v.p[2] - K * v.p[1]]);
      const flat2 = (Q[1][0] - Q[0][0]) * (Q[2][1] - Q[0][1]) - (Q[2][0] - Q[0][0]) * (Q[1][1] - Q[0][1]);
      if (flat2 * area2 < 0) return;
    }
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
      if (inRock && inRock(w0, w1, w2)) continue;
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
        // (Water over something in front of you, a waterfall's spray over a wall: behind you, with it.)
        if (tri.g && mat && (waterTex.has(mat.texName) || (tri.building && tri.building.spans))) isTop[idx] = 0;
        color[idx * 4] = color[idx * 4] * (1 - a) + r * a; color[idx * 4 + 1] = color[idx * 4 + 1] * (1 - a) + g * a;
        color[idx * 4 + 2] = color[idx * 4 + 2] * (1 - a) + b * a; color[idx * 4 + 3] = 255;
      } else {
        color[idx * 4] = r; color[idx * 4 + 1] = g; color[idx * 4 + 2] = b; color[idx * 4 + 3] = 255;
        depth[idx] = d;
        // Top layer: the surface belongs to something standing further south
        // than the tile row it is drawn on (tree crowns, roofs, house fronts).
        const wz = w0 * V[0].p[2] + w1 * V[1].p[2] + w2 * V[2].p[2];
        const wy = w0 * V[0].p[1] + w1 * V[1].p[1] + w2 * V[2].p[1] - (tri.g ? w0 * tri.g[0] + w1 * tri.g[1] + w2 * tri.g[2] - GROUND : 0);
        const screenRow = Math.floor(y / SS / 16), surfRow = Math.floor((wz - oz) / 16 - 1e-3);
        // (Drawn from its ground: not a waterfall drawn from the ground under
        // each corner, which you climb, nor anything on a tile you walk or
        // Surf on, nor water.)
        const wx = w0 * V[0].p[0] + w1 * V[1].p[0] + w2 * V[2].p[0];
        const own = Math.min(TH - 1, Math.max(0, surfRow)) * TW + Math.min(TW - 1, Math.max(0, Math.floor((wx - ox) / 16)));
        const grounded = tri.g && ((tri.building && tri.building.spans) || open[own] || (mat && waterTex.has(mat.texName)));
        isTop[idx] = PROJ !== "top" && !grounded && wy > GROUND + 1.5 && surfRow > screenRow ? 1 : 0;
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
    map: MAPCONST, id: mapId, header: H, cells, main, origin: { cellX: cx0, cellZ: cz0 }, width: tw, height: th,
    // permission u16 per tile: low byte = HGSS tile behaviour (include/constants/metatile_behavior.h), bit 15 = solid
    behavior: perm.map((v) => v & 0xff), collision: perm.map((v) => (v >> 15) & 1), flags: perm.map((v) => (v >> 8) & 0x7f),
    events: ev && {
      warps: (ev.warps || []).map((w) => Object.assign(loc(w), { map: w.header, anchor: w.anchor })),
      signs: (ev.bgs || []).map((s) => Object.assign(loc(s), { script: s.scriptId, type: s.type })),
      people: (ev.objects || []).map((o) => Object.assign(loc(o), { id: o.id, sprite: o.spriteId, movement: o.movement, facing: o.facingDirection, flag: o.eventFlag, script: o.scriptId, rangeX: o.xRange, rangeY: o.yRange })),
      triggers: (ev.coords || []).map((c) => Object.assign(loc(c), { w: c.w, h: c.h, script: c.scriptId, var: c.var, val: c.val }))
    }
  };



  // (opts.labels: what's uppermost on each tile seen from straight above, 4x4
  // samples a tile: its texture's name, and the building model it's part of
  // if any, as { tex: { name: samples }, building: { id: samples } }.)
  let labels = null;
  if (opts.labels) {
    labels = Array.from({ length: tw * th }, () => ({ tex: {}, building: {} }));
    const best = new Float32Array(tw * th * 16).fill(-Infinity), who = new Array(tw * th * 16);
    for (const t of tris) {
      if (t.buried) continue;
      const P = t.v.map((v) => v.p);
      const d = (P[1][0] - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (P[1][2] - P[0][2]);
      if (Math.abs(d) < 1e-9) continue;
      const sx0 = Math.max(0, Math.floor((Math.min(P[0][0], P[1][0], P[2][0]) - ox) / 4)), sx1 = Math.min(tw * 4 - 1, Math.floor((Math.max(P[0][0], P[1][0], P[2][0]) - ox) / 4));
      const sz0 = Math.max(0, Math.floor((Math.min(P[0][2], P[1][2], P[2][2]) - oz) / 4)), sz1 = Math.min(th * 4 - 1, Math.floor((Math.max(P[0][2], P[1][2], P[2][2]) - oz) / 4));
      for (let sz = sz0; sz <= sz1; sz++) for (let sx = sx0; sx <= sx1; sx++) {
        const px = ox + sx * 4 + 2, pz = oz + sz * 4 + 2;
        const w1 = ((px - P[0][0]) * (P[2][2] - P[0][2]) - (P[2][0] - P[0][0]) * (pz - P[0][2])) / d;
        const w2 = ((P[1][0] - P[0][0]) * (pz - P[0][2]) - (px - P[0][0]) * (P[1][2] - P[0][2])) / d;
        if (w1 < -1e-6 || w2 < -1e-6 || w1 + w2 > 1 + 1e-6) continue;
        const y = P[0][1] + w1 * (P[1][1] - P[0][1]) + w2 * (P[2][1] - P[0][1]);
        const tile = (sz >> 2) * tw + (sx >> 2), k = tile * 16 + (sz & 3) * 4 + (sx & 3);
        if (y > best[k]) { best[k] = y; who[k] = t; }
      }
    }
    for (let i = 0; i < tw * th; i++) for (let k = 0; k < 16; k++) {
      const t = who[i * 16 + k];
      if (!t) continue;
      const name = (t.mat && t.mat.texName) || "?";
      labels[i].tex[name] = (labels[i].tex[name] || 0) + 1;
      if (t.building) labels[i].building[t.building.id] = (labels[i].building[t.building.id] || 0) + 1;
    }
  }
  return Object.assign(data, { below: layer(() => true), top: layer((i) => isTop[i]), perm, ground: G, labels });
}

module.exports = { renderMap };
