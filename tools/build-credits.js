// Builds the pictures for the Hall of Fame and the credits from
// pret/pokefirered's graphics:
//
//   node tools/build-credits.js <path to pret/pokefirered>   (or set POKEFIRERED)
//
// Needs graphics/credits/ and graphics/misc/confetti.png checked out. Writes,
// background transparent where FireRed's colour 0 is:
//
//   assets/credits/the_end.png       the closing screen (240x160, its tiles
//                                    laid out by its tilemap)
//   assets/credits/pokeball_<mon>.png      the Poké Ball behind each credits
//                                    Pokémon, in its palette (240x160)
//   assets/credits/<mon>_1.png, <mon>_2.png   Charizard, Venusaur, Blastoise and
//                                    Pikachu, small and full size
//   assets/credits/rival.png         Gary running (six 64x64 frames, top to bottom)
//   assets/credits/confetti.png      the Hall of Fame's confetti (17 8x8 pieces)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/credits"))) {
  console.error("Usage: node tools/build-credits.js <path to pret/pokefirered>  (needs graphics/credits/ checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const out = path.join(root, "assets/credits");
fs.mkdirSync(out, { recursive: true });
const G = (...p) => path.join(pret, "graphics", ...p);

// An indexed picture as RGBA, colour 0 clear (or `opaque`).
function rgba(png, palette, opaque) {
  const pal = palette || png.palette;
  const px = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.width * png.height; i++) {
    const v = png.px[i];
    if (!v && !opaque) continue;
    const c = pal[v] || [0, 0, 0];
    px.set([c[0], c[1], c[2], 255], i * 4);
  }
  return px;
}
function copy(src, dst) {
  const png = readPng(G(src));
  writePng(path.join(out, dst), png.width, png.height, rgba(png));
}

// A 240x160 screen of 8x8 tiles from `tilesFile` laid out by a GBA tilemap
// (32 entries a row: tile number, flips, palette).
function screen(tilesFile, mapFile, palette, dst) {
  const png = readPng(G(tilesFile)), map = fs.readFileSync(G(mapFile));
  const pal = palette || png.palette, perRow = png.width / 8;
  const px = new Uint8ClampedArray(240 * 160 * 4);
  for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
    const at = (ty * 32 + tx) * 2;
    if (at + 1 >= map.length) continue;
    const e = map.readUInt16LE(at), tile = e & 0x3ff, hf = e & 0x400, vf = e & 0x800;
    const sx = (tile % perRow) * 8, sy = Math.floor(tile / perRow) * 8;
    if (sy >= png.height) continue;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = png.px[(sy + (vf ? 7 - y : y)) * png.width + sx + (hf ? 7 - x : x)];
      const c = pal[v] || [0, 0, 0];
      px.set([c[0], c[1], c[2], 255], ((ty * 8 + y) * 240 + tx * 8 + x) * 4);
    }
  }
  writePng(path.join(out, dst), 240, 160, px);
}

screen("credits/the_end.png", "credits/the_end.bin", null, "the_end.png");
for (const mon of ["charizard", "venusaur", "blastoise", "pikachu"]) {
  screen("credits/pokeball.png", "credits/pokeball.bin", readPal(G("credits/pokeball_" + mon + ".pal")), "pokeball_" + mon + ".png");
  copy("credits/" + mon + "_1.png", mon + "_1.png");
  copy("credits/" + mon + "_2.png", mon + "_2.png");
}
copy("credits/rival.png", "rival.png");
copy("misc/confetti.png", "confetti.png");
console.log("wrote assets/credits/");
