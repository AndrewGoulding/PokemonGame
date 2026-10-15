// Builds the Seagallop ferry ride's pictures from pret/pokefirered
// (graphics/seagallop, as src/seagallop.c draws them):
//
//   node tools/build-seagallop.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes:
//   assets/seagallop/sea-west.png   the sea, 256x256: BG3 with the westbound
//                                   tilemap (wb_tilemap.bin), water.png's colours
//   assets/seagallop/sea-east.png   ... and the eastbound one (eb_tilemap.bin)
//   assets/seagallop/ferry.png      the ferry, 64x40 (facing west; flipped going east)
//   assets/seagallop/wake.png       its wake, four 32x32 frames one above another
//                                   (the ride shows the first three)
// ui/seagallop.js plays the ride.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/seagallop/water.png"))) {
  console.error("Usage: node tools/build-seagallop.js <path to pret/pokefirered>  (needs graphics/seagallop/ checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const G = (f) => path.join(pret, "graphics/seagallop", f);
const out = path.join(root, "assets/seagallop");
fs.mkdirSync(out, { recursive: true });

// The sea: water.png's palette goes in BG palette 4 (LoadPalette(sWaterPal, BG_PLTT_ID(4))).
const water = readPng(G("water.png"));
const ram = paletteRam([[4, water.palette.slice(0, 16)]]);
for (const [dir, map] of [["west", "wb_tilemap.bin"], ["east", "eb_tilemap.bin"]]) {
  const bg = renderBg({ tiles: G("water.png"), map: G(map), widthTiles: 32, heightTiles: 32, ram, opaque: true });
  writePng(path.join(out, "sea-" + dir + ".png"), bg.width, bg.height, bg.rgba);
}

// The sprites: ferry_and_wake.pal, colour 0 transparent.
const pal = readPal(G("ferry_and_wake.pal"));
function sprite(file, name) {
  const img = readPng(G(file));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0; i < img.px.length; i++) {
    const v = img.px[i] & 15;
    if (!v) continue;
    rgba.set([pal[v][0], pal[v][1], pal[v][2], 255], i * 4);
  }
  writePng(path.join(out, name), img.width, img.height, rgba);
}
sprite("ferry_sprite.png", "ferry.png");
sprite("wake.png", "wake.png");
console.log("wrote assets/seagallop/ (sea-west, sea-east, ferry, wake)");
