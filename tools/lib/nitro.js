// Nintendo DS NSBMD / NSBTX reader (models, materials, GPU display lists,
// textures + palettes) in plain Node, no dependencies.
// Based on scurest/nsbmd_docs and scurest/apicula (MIT/CC0 reverse-engineering docs).
//
//   const { parseNsb, decodeTexture, buildTriangles } = require("./nitro");
//   const bmd = parseNsb(buffer)        -> { models: [...], tex: {textures, palettes} | null }
//   const tris = buildTriangles(model, matrix4)  -> [{ v:[{p:[x,y,z], uv:[s,t], c:[r,g,b]}x3], mat }]
//   const img = decodeTexture(tex, texName, palName) -> { w, h, rgba: Uint8Array } | null
"use strict";

const fx = (v, frac) => v / (1 << frac);
const s16 = (v) => (v << 16) >> 16;
const sbits = (v, lo, n) => { const x = (v >>> lo) & ((1 << n) - 1); return x & (1 << (n - 1)) ? x - (1 << n) : x; };
const bits = (v, lo, hi) => (v >>> lo) & ((1 << (hi - lo)) - 1);

// ---------- 4x4 matrices (column-major arrays of 16, like OpenGL) ----------
const M = {
  ident: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  mul(a, b) { // a*b
    const r = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + rr] * b[c * 4 + k]; r[c * 4 + rr] = s;
    }
    return r;
  },
  scale: (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1],
  trans: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  // 3x3 given column-major (c0r0,c0r1,c0r2,c1r0,...)
  from3: (m) => [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1],
  apply(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
  add(a, b) { return a.map((v, i) => v + b[i]); },
  mulS(a, s) { return a.map((v) => v * s); }
};

// ---------- NameList ("info block") ----------
function nameList(buf, off, elemReader) {
  const count = buf[off + 1];
  let p = off + 4 + 8 + 4 * count;      // skip the unknown section
  const elemSize = buf.readUInt16LE(p); p += 4;
  const out = [];
  const namesOff = p + elemSize * count;
  for (let i = 0; i < count; i++) {
    const name = buf.toString("latin1", namesOff + i * 16, namesOff + i * 16 + 16).replace(/\0.*$/s, "");
    out.push({ name, data: elemReader(buf, p + i * elemSize) });
  }
  return out;
}

// ---------- Containers ----------
function parseNsb(buf) {
  const stamp = buf.toString("ascii", 0, 4);
  const n = buf.readUInt16LE(14);
  const res = { stamp, models: [], tex: null };
  for (let i = 0; i < n; i++) {
    const off = buf.readUInt32LE(16 + i * 4);
    const s = buf.toString("ascii", off, off + 4);
    if (s === "MDL0") {
      for (const e of nameList(buf, off + 8, (b, p) => b.readUInt32LE(p))) res.models.push(readModel(buf, off + e.data, e.name));
    } else if (s === "TEX0") res.tex = readTex(buf, off);
  }
  return res;
}

// ---------- Model ----------
function readModel(buf, o, name) {
  const renderOff = o + buf.readUInt32LE(o + 4), matOff = o + buf.readUInt32LE(o + 8), meshOff = o + buf.readUInt32LE(o + 12);
  const upScale = fx(buf.readInt32LE(o + 0x1c), 12), downScale = fx(buf.readInt32LE(o + 0x20), 12);
  const objOff = o + 0x40;
  const objects = nameList(buf, objOff, (b, p) => b.readUInt32LE(p)).map((e) => readObject(buf, objOff + e.data));
  const meshes = nameList(buf, meshOff, (b, p) => b.readUInt32LE(p)).map((e) => {
    const m = meshOff + e.data;
    const co = m + buf.readUInt32LE(m + 8), len = buf.readUInt32LE(m + 12);
    return { name: e.name, cmds: buf.subarray(co, co + len) };
  });
  const materials = readMaterials(buf, matOff);
  const ops = readRenderCmds(buf, renderOff);
  return { name, upScale, downScale, objects, meshes, materials, ops };
}

function readObject(buf, p) {
  const flags = buf.readUInt16LE(p), m0 = s16(buf.readUInt16LE(p + 2)); p += 4;
  const fx16 = (v) => s16(v) / 4096;
  let m = M.ident();
  let T = null, R = null, S = null;
  if (!(flags & 1)) { T = [buf.readInt32LE(p) / 4096, buf.readInt32LE(p + 4) / 4096, buf.readInt32LE(p + 8) / 4096]; p += 12; }
  if (flags & 8) {
    const a = fx16(buf.readUInt16LE(p)), b = fx16(buf.readUInt16LE(p + 2)); p += 4;
    R = pivotMat(bits(flags, 4, 8), bits(flags, 8, 12), a, b);
  } else if (!(flags & 2)) {
    const ms = []; for (let i = 0; i < 8; i++) ms.push(fx16(buf.readUInt16LE(p + i * 2))); p += 16;
    R = [m0 / 4096, ms[0], ms[1], ms[2], ms[3], ms[4], ms[5], ms[6], ms[7]];
  }
  if (!(flags & 4)) { S = [buf.readInt32LE(p) / 4096, buf.readInt32LE(p + 4) / 4096, buf.readInt32LE(p + 8) / 4096]; p += 12; }
  if (S) m = M.scale(...S);
  if (R) m = M.mul(M.from3(R), m);
  if (T) m = M.mul(M.trans(...T), m);
  return m;
}

function pivotMat(select, neg, a, b) {
  const o = neg & 1 ? -1 : 1, c = neg & 2 ? -b : b, d = neg & 4 ? -a : a;
  const t = [
    [o, 0, 0, 0, a, b, 0, c, d], [0, o, 0, a, 0, b, c, 0, d], [0, 0, o, a, b, 0, c, d, 0],
    [0, a, b, o, 0, 0, 0, c, d], [a, 0, b, 0, o, 0, c, 0, d], [a, b, 0, 0, 0, o, c, d, 0],
    [0, a, b, 0, c, d, o, 0, 0], [a, 0, b, c, 0, d, 0, o, 0], [a, b, 0, c, d, 0, 0, 0, o]];
  return t[select] || [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

function readMaterials(buf, o) {
  const texPair = o + buf.readUInt16LE(o), palPair = o + buf.readUInt16LE(o + 2);
  const mats = nameList(buf, o + 4, (b, p) => b.readUInt32LE(p)).map((e) => {
    const m = o + e.data;
    const difAmb = buf.readUInt32LE(m + 4), polyAttr = buf.readUInt32LE(m + 12), polyMask = buf.readUInt32LE(m + 16);
    const texParam = buf.readUInt32LE(m + 20), misc = buf.readUInt16LE(m + 30);
    const width = buf.readUInt16LE(m + 32), height = buf.readUInt16LE(m + 34);
    let texScale = [1, 1];
    if (misc & 1) { // texture matrix present
      let q = m + 44;
      if (!(misc & 2)) { texScale = [buf.readInt32LE(q) / 4096, buf.readInt32LE(q + 4) / 4096]; q += 8; }
    }
    const rgb = (x) => [bits(x, 0, 5) / 31, bits(x, 5, 10) / 31, bits(x, 10, 15) / 31];
    return {
      name: e.name, texName: null, palName: null,
      texParam: texParam & polyMask, width, height, texScale,
      diffuse: rgb(difAmb), diffuseIsVtxColor: !!(difAmb & 0x8000), ambient: rgb(difAmb >>> 16),
      alpha: bits(polyAttr, 16, 21) / 31, polyAttr,
      cullBack: !bits(polyAttr, 6, 7), cullFront: !bits(polyAttr, 7, 8), lights: bits(polyAttr, 0, 4)
    };
  });
  const pair = (off, key) => {
    for (const e of nameList(buf, off, (b, p) => [b.readUInt16LE(p), b[p + 2]])) {
      const [ioff, n] = e.data;
      for (let i = 0; i < n; i++) { const mi = buf[o + ioff + i]; if (mats[mi]) mats[mi][key] = e.name; }
    }
  };
  pair(texPair, "texName"); pair(palPair, "palName");
  return mats;
}

function readRenderCmds(buf, p) {
  const ops = [];
  const LEN = { 0x00: 0, 0x01: 0, 0x02: 2, 0x03: 1, 0x04: 1, 0x05: 1, 0x06: 3, 0x07: 1, 0x08: 1, 0x0b: 0, 0x0c: 2, 0x0d: 2,
    0x24: 1, 0x26: 4, 0x2b: 0, 0x40: 0, 0x44: 1, 0x46: 4, 0x47: 2, 0x66: 5, 0x80: 0 };
  for (let guard = 0; guard < 100000; guard++) {
    const op = buf[p++];
    let n;
    if (op === 0x09) n = 2 + 3 * buf[p + 1];
    else if (op in LEN) n = LEN[op];
    else throw new Error("unknown render cmd 0x" + op.toString(16));
    const a = Array.from(buf.subarray(p, p + n)); p += n;
    if (op === 0x01) break;
    if (op === 0x03) ops.push({ t: "load", i: a[0] });
    else if (op === 0x04 || op === 0x24 || op === 0x44) ops.push({ t: "mat", i: a[0] });
    else if (op === 0x05) ops.push({ t: "draw", i: a[0] });
    else if (op === 0x06 || op === 0x26 || op === 0x46 || op === 0x66) {
      const store = op === 0x26 ? a[3] : op === 0x66 ? a[3] : null;
      const load = op === 0x46 ? a[3] : op === 0x66 ? a[4] : null;
      if (load != null) ops.push({ t: "load", i: load });
      ops.push({ t: "obj", i: a[0] });
      if (store != null) ops.push({ t: "store", i: store });
    } else if (op === 0x09) {
      const terms = []; for (let k = 0; k < a[1]; k++) terms.push({ stack: a[2 + 3 * k], inv: a[3 + 3 * k], w: a[4 + 3 * k] / 256 });
      ops.push({ t: "skin", store: a[0], terms });
    } else if (op === 0x0b) ops.push({ t: "scale", up: true });
    else if (op === 0x2b) ops.push({ t: "scale", up: false });
  }
  return ops;
}

// ---------- GPU display list -> triangles ----------
const NPARAMS = { 0x00: 0, 0x10: 1, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 16, 0x17: 12, 0x18: 16, 0x19: 12, 0x1a: 9,
  0x1b: 3, 0x1c: 3, 0x20: 1, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 1, 0x25: 1, 0x26: 1, 0x27: 1, 0x28: 1, 0x29: 1, 0x2a: 1, 0x2b: 1,
  0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 32, 0x40: 1, 0x41: 0, 0x50: 1, 0x60: 1, 0x70: 3, 0x71: 2, 0x72: 1 };

// Runs a model's render commands. `base` is the model-to-world matrix.
// Returns triangles in world space with texel-space UVs (already divided by
// the texture size: uv in [0,1] repeats) and per-vertex colour.
function buildTriangles(model, base, opts = {}) {
  const tris = [];
  const stack = new Array(32).fill(null).map(() => M.ident());
  let cur = M.ident(), mat = null;
  for (const op of model.ops) {
    if (op.t === "load") cur = stack[op.i] ? stack[op.i].slice() : M.ident();
    else if (op.t === "store") stack[op.i] = cur.slice();
    else if (op.t === "obj") cur = M.mul(cur, model.objects[op.i] || M.ident());
    else if (op.t === "scale") { const s = op.up ? model.upScale : model.downScale; cur = M.mul(cur, M.scale(s, s, s)); }
    else if (op.t === "skin") { cur = M.ident(); stack[op.store] = cur.slice(); } // (no skinned map models)
    else if (op.t === "mat") mat = model.materials[op.i];
    else if (op.t === "draw") runMesh(model.meshes[op.i].cmds, M.mul(base, cur), stack.map((s) => M.mul(base, s)), mat, tris, opts);
  }
  return tris;
}

function runMesh(cmds, startMtx, stackW, mat, tris, opts) {
  let mtx = startMtx;
  let p = 0, vtx = [0, 0, 0], uv = [0, 0], col = mat && mat.diffuseIsVtxColor ? mat.diffuse.slice() : [1, 1, 1];
  let prim = 0, list = [], usedColor = false;
  const tw = mat ? mat.width || 1 : 1, th = mat ? mat.height || 1 : 1;
  const ts = mat ? mat.texScale : [1, 1];
  const emit = () => {
    list.push({ p: M.apply(mtx, vtx), uv: [uv[0] * ts[0] / tw, uv[1] * ts[1] / th], c: col.slice() });
    const n = list.length;
    if (prim === 0 && n % 3 === 0) tris.push({ v: list.slice(n - 3), mat });
    else if (prim === 1 && n % 4 === 0) { const q = list.slice(n - 4); tris.push({ v: [q[0], q[1], q[2]], mat }, { v: [q[0], q[2], q[3]], mat }); }
    else if (prim === 2 && n >= 3) { const a = list[n - 3], b = list[n - 2], c = list[n - 1]; tris.push({ v: (n & 1) ? [a, b, c] : [b, a, c], mat }); }
    else if (prim === 3 && n >= 4 && n % 2 === 0) { const a = list[n - 4], b = list[n - 3], c = list[n - 2], d = list[n - 1]; tris.push({ v: [a, b, d], mat }, { v: [a, d, c], mat }); }
  };
  while (p + 4 <= cmds.length) {
    const opcodes = [cmds[p], cmds[p + 1], cmds[p + 2], cmds[p + 3]]; p += 4;
    for (const op of opcodes) {
      const n = NPARAMS[op];
      if (n === undefined) return; // garbage/padding
      const P = (i) => cmds.readUInt32LE(p + i * 4);
      switch (op) {
        case 0x14: mtx = stackW[P(0) & 31]; break;
        case 0x1b: mtx = M.mul(mtx, M.scale((P(0) | 0) / 4096, (P(1) | 0) / 4096, (P(2) | 0) / 4096)); break;
        case 0x20: { const v = P(0); col = [bits(v, 0, 5) / 31, bits(v, 5, 10) / 31, bits(v, 10, 15) / 31]; usedColor = true; break; }
        // (A normal, with the material's lights on: the DS lights the vertex,
        // replacing its colour. Lit full on, from above: the material's diffuse.)
        case 0x21: if (mat && mat.lights) col = mat.diffuse.slice(); break;
        case 0x22: { const v = P(0); uv = [sbits(v, 0, 16) / 16, sbits(v, 16, 16) / 16]; break; }
        case 0x23: { const a = P(0), b = P(1); vtx = [sbits(a, 0, 16) / 4096, sbits(a, 16, 16) / 4096, sbits(b, 0, 16) / 4096]; emit(); break; }
        case 0x24: { const v = P(0); vtx = [sbits(v, 0, 10) / 64, sbits(v, 10, 10) / 64, sbits(v, 20, 10) / 64]; emit(); break; }
        case 0x25: { const v = P(0); vtx = [sbits(v, 0, 16) / 4096, sbits(v, 16, 16) / 4096, vtx[2]]; emit(); break; }
        case 0x26: { const v = P(0); vtx = [sbits(v, 0, 16) / 4096, vtx[1], sbits(v, 16, 16) / 4096]; emit(); break; }
        case 0x27: { const v = P(0); vtx = [vtx[0], sbits(v, 0, 16) / 4096, sbits(v, 16, 16) / 4096]; emit(); break; }
        case 0x28: { const v = P(0); vtx = [vtx[0] + sbits(v, 0, 10) / 4096, vtx[1] + sbits(v, 10, 10) / 4096, vtx[2] + sbits(v, 20, 10) / 4096]; emit(); break; }
        case 0x40: prim = P(0) & 3; list = []; break;
        case 0x41: break;
      }
      p += n * 4;
    }
  }
}

// ---------- Textures ----------
function readTex(buf, o) {
  const texDataOff = o + buf.readUInt32LE(o + 0x14);
  const texListOff = o + buf.readUInt16LE(o + 0x0e);
  const cmp1 = o + buf.readUInt32LE(o + 0x24), cmp2 = o + buf.readUInt32LE(o + 0x28);
  const palLen = buf.readUInt16LE(o + 0x30) << 3;
  const palListOff = o + buf.readUInt32LE(o + 0x34), palDataOff = o + buf.readUInt32LE(o + 0x38);
  const textures = {}, palettes = {};
  for (const e of nameList(buf, texListOff, (b, p) => b.readUInt32LE(p))) textures[e.name] = { name: e.name, params: e.data };
  for (const e of nameList(buf, palListOff, (b, p) => b.readUInt16LE(p) << 3)) palettes[e.name] = { name: e.name, off: e.data };
  return { buf, texDataOff, cmp1, cmp2, palDataOff, palLen, textures, palettes };
}

const c555 = (v) => [((v & 31) << 3) | ((v & 31) >> 2), (((v >> 5) & 31) << 3) | (((v >> 5) & 31) >> 2), (((v >> 10) & 31) << 3) | (((v >> 10) & 31) >> 2)];

function decodeTexture(tex, texName, palName) {
  const t = tex && tex.textures[texName];
  if (!t) return null;
  const pr = t.params, fmt = bits(pr, 26, 29), w = 8 << bits(pr, 20, 23), h = 8 << bits(pr, 23, 26);
  const off = bits(pr, 0, 16) << 3, c0t = !!bits(pr, 29, 30);
  const b = tex.buf;
  const pal = tex.palettes[palName];
  const palAt = (i) => { const q = tex.palDataOff + (pal ? pal.off : 0) + i * 2; return q + 1 < b.length ? b.readUInt16LE(q) : 0; };
  const rgba = new Uint8Array(w * h * 4);
  const put = (i, rgb, a) => { rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = a; };
  const d = tex.texDataOff + off;
  const N = w * h;
  if (fmt === 1) for (let i = 0; i < N; i++) { const x = b[d + i]; const a3 = x >> 5; put(i, c555(palAt(x & 31)), Math.round(((a3 << 2) | (a3 >> 1)) * 255 / 31)); }
  else if (fmt === 2) for (let i = 0; i < N; i++) { const x = (b[d + (i >> 2)] >> ((i & 3) * 2)) & 3; put(i, c555(palAt(x)), x === 0 && c0t ? 0 : 255); }
  else if (fmt === 3) for (let i = 0; i < N; i++) { const x = (b[d + (i >> 1)] >> ((i & 1) * 4)) & 15; put(i, c555(palAt(x)), x === 0 && c0t ? 0 : 255); }
  else if (fmt === 4) for (let i = 0; i < N; i++) { const x = b[d + i]; put(i, c555(palAt(x)), x === 0 && c0t ? 0 : 255); }
  else if (fmt === 6) for (let i = 0; i < N; i++) { const x = b[d + i]; put(i, c555(palAt(x & 7)), Math.round((x >> 3) * 255 / 31)); }
  else if (fmt === 7) for (let i = 0; i < N; i++) { const v = b.readUInt16LE(d + i * 2); put(i, c555(v), v & 0x8000 ? 255 : 0); }
  else if (fmt === 5) {
    const bw = w / 4;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const bi = (y >> 2) * bw + (x >> 2);
      const blk = b.readUInt32LE(tex.cmp1 + off + bi * 4), ex = b.readUInt16LE(tex.cmp2 + off / 2 + bi * 2);
      const texel = (blk >>> (2 * (4 * (y & 3) + (x & 3)))) & 3, mode = ex >> 14, pa = (ex & 0x3fff) << 1;
      const C = (n) => c555(palAt(pa + n));
      const mix = (a, bb, wa, wb) => a.map((v, k) => Math.floor((v * wa + bb[k] * wb) / (wa + wb)));
      let rgb = null;
      if (texel < 2) rgb = C(texel);
      else if (mode === 0) rgb = texel === 2 ? C(2) : null;
      else if (mode === 1) rgb = texel === 2 ? mix(C(0), C(1), 1, 1) : null;
      else if (mode === 2) rgb = C(texel);
      else rgb = texel === 2 ? mix(C(0), C(1), 5, 3) : mix(C(0), C(1), 3, 5);
      put(y * w + x, rgb || [0, 0, 0], rgb ? 255 : 0);
    }
  }
  return { w, h, rgba, fmt, params: pr };
}

module.exports = { parseNsb, decodeTexture, buildTriangles, M };
