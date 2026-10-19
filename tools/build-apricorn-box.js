// Builds HeartGold's Apricorn Box screen's picture from pret/pokeheartgold's
// graphics (overlay 59's box, NARC a/2/1/8: palette 3, tiles 4, screen 5):
// the box's seven holes for the seven Apricorns on the left, HGSS's blue
// stripes to the right, cropped to a GBA screen (240x160: the DS screen's
// rows 32-191, under the title bar).
//
//   node tools/build-apricorn-box.js <path to pret/pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes assets/apricorn-box/box.png (ui/apricorn-box.js draws on it).
"use strict";

const fs = require("fs");
const path = require("path");
const { writePng } = require("./lib/png");
const { readNarc, lz10, nitroBg } = require("./lib/narc");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
const NARC = ROOT && path.join(ROOT, "files/a/2/1/8");
if (!NARC || !fs.existsSync(NARC)) {
  console.error("Usage: node tools/build-apricorn-box.js <path to pret/pokeheartgold>  (needs files/a/2/1/8)");
  process.exit(1);
}
const gra = readNarc(NARC).map(lz10);
const screen = nitroBg(gra[3], gra[4], gra[5]);
const W = 240, H = 160, Y = 32;
const rgba = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) rgba.set(screen.rgba.subarray(((Y + y) * screen.width) * 4, ((Y + y) * screen.width + W) * 4), y * W * 4);
const out = path.join(__dirname, "..", "assets/apricorn-box");
fs.mkdirSync(out, { recursive: true });
writePng(path.join(out, "box.png"), W, H, rgba);
console.log("wrote assets/apricorn-box/box.png");
