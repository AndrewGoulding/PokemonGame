// Minimal NARC reader: readNarc(buf) -> array of Buffers (members).
// lz10(buf): a member decompressed if it's LZ77-compressed (0x10), else as is.
// nitroBg(nclr, ncgr, nscr): a 4bpp background (NCLR palette, NCGR tiles,
// NSCR screen) as { width, height, rgba }, colour 0 transparent.
"use strict";
const fs = require("fs");
function readNarc(buf) {
  if (typeof buf === "string") buf = fs.readFileSync(buf);
  if (buf.toString("ascii", 0, 4) !== "NARC") throw new Error("not a NARC");
  let pos = buf.readUInt16LE(0x0c); // header size
  const chunks = {};
  for (let i = 0; i < 3; i++) {
    const id = buf.toString("ascii", pos, pos + 4), size = buf.readUInt32LE(pos + 4);
    chunks[id] = pos; pos += size;
  }
  const fat = chunks.BTAF, n = buf.readUInt16LE(fat + 8), img = chunks.GMIF + 8;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = buf.readUInt32LE(fat + 12 + i * 8), e = buf.readUInt32LE(fat + 16 + i * 8);
    out.push(buf.subarray(img + s, img + e));
  }
  return out;
}
function lz10(b) {
  if (b[0] !== 0x10) return b;
  const n = b.readUIntLE(1, 3), out = Buffer.alloc(n);
  let p = 4, q = 0;
  while (q < n) {
    let flags = b[p++];
    for (let i = 0; i < 8 && q < n; i++, flags <<= 1) {
      if (!(flags & 0x80)) { out[q++] = b[p++]; continue; }
      const hi = b[p++], lo = b[p++], len = (hi >> 4) + 3, back = (((hi & 15) << 8) | lo) + 1;
      for (let k = 0; k < len; k++, q++) out[q] = out[q - back];
    }
  }
  return out;
}
function nitroBg(nclr, ncgr, nscr) {
  const colours = [];
  for (let i = 0, n = nclr.readUInt32LE(0x20) / 2, o = 0x18 + nclr.readUInt32LE(0x24); i < n; i++) {
    const v = nclr.readUInt16LE(o + i * 2);
    colours.push([(v & 31) << 3, ((v >> 5) & 31) << 3, ((v >> 10) & 31) << 3]);
  }
  const tiles = ncgr.subarray(0x18 + ncgr.readUInt32LE(0x2c)), map = nscr.subarray(0x24);
  const w = nscr.readUInt16LE(0x18), h = nscr.readUInt16LE(0x1a), rgba = new Uint8ClampedArray(w * h * 4);
  for (let ty = 0; ty < h / 8; ty++) for (let tx = 0; tx < w / 8; tx++) {
    const e = map.readUInt16LE((ty * (w / 8) + tx) * 2), t = e & 0x3ff, pl = e >> 12;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = e & 0x400 ? 7 - x : x, sy = e & 0x800 ? 7 - y : y, byte = tiles[t * 32 + sy * 4 + (sx >> 1)];
      const v = sx & 1 ? byte >> 4 : byte & 15;
      if (v && colours[pl * 16 + v]) rgba.set(colours[pl * 16 + v].concat(255), ((ty * 8 + y) * w + tx * 8 + x) * 4);
    }
  }
  return { width: w, height: h, rgba };
}
module.exports = { readNarc, lz10, nitroBg };
