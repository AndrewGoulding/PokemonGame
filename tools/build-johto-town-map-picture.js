// Johto's Town Map picture, HGSS's own: the Pokégear's map of Johto as
// HeartGold and SoulSilver draw it (files/application/pokegear/map/pgmap_gra
// in a pret/pokeheartgold checkout: 10, its 8bpp tile sheet; 11, its screen;
// 20, its palette), copied pixel for pixel into assets/town-map/johto.png,
// where tools/build-johto-town-map.js had drawn it again in FireRed's tiles.
// The grid is the same (JOHTO_TOWN_MAP: square (x, y) at pixels (16 + 8x,
// 32 + 8y), HGSS's columns 2-28 and world-matrix rows 1-14), so our pixel
// (x, y) is HGSS's (x, y - 8); the top eight rows, above HGSS's map, are its
// top row's colours again.
//
//   node tools/build-johto-town-map-picture.js <path to pokeheartgold, or to its pgmap_gra folder>
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
let dir = process.argv[2] || process.env.POKEHEARTGOLD;
if (!dir) { console.error("usage: node tools/build-johto-town-map-picture.js <pokeheartgold>"); process.exit(1); }
if (fs.existsSync(path.join(dir, "files/application/pokegear/map/pgmap_gra"))) dir = path.join(dir, "files/application/pokegear/map/pgmap_gra");
const PG = (n, ext) => path.join(dir, "pgmap_gra_" + String(n).padStart(8, "0") + "." + ext);

// HGSS's map (pgmap_gra 10, an 8bpp tile sheet; 11, its 64x64 screen; 20, the palette).
const nitroBlock = (b) => b.readUInt16LE(12);   // (the first block after the header)
function nscr(file) {
  const b = fs.readFileSync(file), p = nitroBlock(b), w = b.readUInt16LE(p + 8), len = b.readUInt32LE(p + 16);
  const d = []; for (let i = 0; i < len / 2; i++) d.push(b.readUInt16LE(p + 20 + 2 * i));
  return { w: w / 8, d };
}
function nclr(file) {
  const b = fs.readFileSync(file), p = nitroBlock(b), len = b.readUInt32LE(p + 16), c = [];
  for (let i = 0; i < len / 2; i++) { const v = b.readUInt16LE(p + 0x18 + 2 * i); c.push([(v & 31) << 3, ((v >> 5) & 31) << 3, ((v >> 10) & 31) << 3]); }
  return c;
}
const sheet = readPng(PG(10, "png")), scr = nscr(PG(11, "NSCR")), pal = nclr(PG(20, "NCLR"));
const w = scr.w * 8, h = Math.ceil(scr.d.length / scr.w) * 8, per = sheet.width / 8, px = new Array(w * h).fill(null);
scr.d.forEach((e, i) => {
  const t = e & 0x3ff, tx = (i % scr.w) * 8, ty = Math.floor(i / scr.w) * 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sx = (t % per) * 8 + (e & 0x400 ? 7 - x : x), sy = Math.floor(t / per) * 8 + (e & 0x800 ? 7 - y : y);
    if (sy < sheet.height) px[(ty + y) * w + tx + x] = pal[sheet.px[sy * sheet.width + sx]];
  }
});
const at = (x, y) => px[Math.max(0, y) * w + x] || [0, 0, 0];

const MW = 240, MH = 160, DY = -8;
const img = new Uint8ClampedArray(MW * MH * 4);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const c = at(x, y + DY), o = (y * MW + x) * 4;
  img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; img[o + 3] = 255;
}
const out = path.join(root, "assets/town-map/johto.png");
writePng(out, MW, MH, img);
console.log("wrote", path.relative(root, out));
