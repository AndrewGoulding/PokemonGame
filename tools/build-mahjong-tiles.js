// Builds assets/mahjong/tiles.png: the mahjong tiles (game/mahjong.js's 0-33,
// then the back), 60x80 each in a row, from FluffyStuff's riichi-mahjong-tiles
// (github.com/FluffyStuff/riichi-mahjong-tiles; public domain, CC0): each
// face (Export/Regular/*.png, 600x800) over the tile's front, shrunk ten times.
//
//   node tools/build-mahjong-tiles.js <path to riichi-mahjong-tiles>
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const src = process.argv[2];
const dir = src && path.join(src, "Export/Regular");
if (!dir || !fs.existsSync(path.join(dir, "Front.png"))) {
  console.error("Usage: node tools/build-mahjong-tiles.js <path to riichi-mahjong-tiles>");
  process.exit(1);
}
const FACES = [];
for (const suit of ["Man", "Pin", "Sou"]) for (let n = 1; n <= 9; n++) FACES.push(suit + n);
FACES.push("Ton", "Nan", "Shaa", "Pei", "Haku", "Hatsu", "Chun");

const SCALE = 10, W = 60, H = 80;
const front = readPng(path.join(dir, "Front.png"));
// One tile at full size (RGBA floats): the front, the face over it.
function tile(face) {
  const out = new Float64Array(front.width * front.height * 4);
  const layers = face === "Back" ? [readPng(path.join(dir, "Back.png"))] : [front, readPng(path.join(dir, face + ".png"))];
  for (const img of layers) {
    for (let i = 0; i < img.width * img.height; i++) {
      const a = img.rgba[i * 4 + 3] / 255;
      if (!a) continue;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = out[i * 4 + c] * (1 - a) + img.rgba[i * 4 + c] * a;
      out[i * 4 + 3] = out[i * 4 + 3] + (1 - out[i * 4 + 3]) * a;
    }
  }
  return out;
}
const names = FACES.concat(["Back"]);
const sheet = new Uint8ClampedArray(names.length * W * H * 4);
names.forEach((face, k) => {
  const big = tile(face);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // (A box filter, weighting colour by coverage.)
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < SCALE; j++) for (let i = 0; i < SCALE; i++) {
      const p = ((y * SCALE + j) * front.width + x * SCALE + i) * 4, w = big[p + 3];
      r += big[p] * w; g += big[p + 1] * w; b += big[p + 2] * w; a += w;
    }
    const o = (y * names.length * W + k * W + x) * 4;
    if (a > 0) sheet.set([r / a, g / a, b / a, a / (SCALE * SCALE) * 255], o);
  }
});
fs.mkdirSync(path.join(__dirname, "..", "assets/mahjong"), { recursive: true });
writePng(path.join(__dirname, "..", "assets/mahjong/tiles.png"), names.length * W, H, sheet);
console.log("wrote assets/mahjong/tiles.png: " + names.length + " tiles");
