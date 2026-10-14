// PNG and palette helpers shared by the converters (tools/build-*.js).
// No dependencies: indexed PNGs in (as pret's graphics are), RGBA PNGs out.
"use strict";

const fs = require("fs");
const zlib = require("zlib");

// An indexed (or 4/8-bit grayscale) PNG -> { width, height, px, palette }.
// px holds one palette index per pixel; grayscale samples are used as indices,
// which is how pret stores graphics whose colours come from a separate .pal.
function readPng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width, height, depth, type, palette = [];
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; }
    if (kind === "PLTE") for (let i = 0; i < len; i += 3) palette.push([data[i], data[i + 1], data[i + 2]]);
    if (kind === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  if (type !== 3 && type !== 0) throw new Error(file + ": expected an indexed or grayscale PNG");
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = Math.ceil((width * depth) / 8);
  const rows = [];
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i > 0 ? line[i - 1] : 0, b = prev[i], c = i > 0 ? prev[i - 1] : 0;
      if (f === 1) line[i] = (line[i] + a) & 255;
      else if (f === 2) line[i] = (line[i] + b) & 255;
      else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    rows.push(line);
    prev = line;
  }
  const px = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      px[y * width + x] = depth === 4 ? (rows[y][x >> 1] >> ((x & 1) ? 0 : 4)) & 15 : rows[y][x];
    }
  }
  return { width, height, px, palette };
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function writePng(file, width, height, rgba) {
  const chunk = (kind, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))
  ]));
}


// A JASC .pal file -> [[r, g, b], ...] (all of its colours; 16 per GBA palette).
function readPal(file) {
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const count = +lines[2];
  const out = [];
  for (let i = 0; i < count; i++) out.push(lines[3 + i].trim().split(/\s+/).map(Number));
  return out;
}

module.exports = { readPng, writePng, readPal };
