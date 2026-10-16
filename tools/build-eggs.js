// Builds the Egg's pictures from a pret/pokefirered checkout:
//   assets/sprites/egg.png    the Egg (64x64, its normal palette)
//   assets/sprites/icons/egg.png      its party icon (32x64, two frames)
//   assets/sprites/egg-hatch.png      the hatching Egg (32x32 frames: whole,
//                                     cracked, more cracked, broken; src/daycare.c)
//   assets/sprites/egg-shard.png      its shards (four 8x8)
//   assets/sprites/egg-hatch-bg.png   the scene's backdrop (240x160: FireRed's
//                                     trade background with the Pokémon's shadow,
//                                     graphics/trade/gba.png, shadow_map.bin)
// Run with: node tools/build-eggs.js <path to pret/pokefirered>
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/pokemon/egg"))) {
  console.error("Usage: node tools/build-eggs.js <path to pret/pokefirered>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const pal = readPal(path.join(pret, "graphics/pokemon/egg/normal.pal"));

// Colour 0 is see-through; `palette` (if given) replaces the PNG's own.
function convert(src, dst, palette) {
  const png = readPng(path.join(pret, src));
  const colors = palette || png.palette;
  const rgba = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.px.length; i++) {
    const c = png.px[i];
    if (!c) continue;
    const rgb = colors[c];
    rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = 255;
  }
  writePng(path.join(root, dst), png.width, png.height, rgba);
}
convert("graphics/pokemon/egg/front.png", "assets/sprites/egg.png", pal);
convert("graphics/pokemon/egg/icon.png", "assets/sprites/icons/egg.png");
convert("graphics/misc/egg_hatch.png", "assets/sprites/egg-hatch.png", pal);
convert("graphics/misc/egg_shard.png", "assets/sprites/egg-shard.png", pal);
// The backdrop: BG1's tilemap (32 wide; tile | hflip 0x400 | vflip 0x800 |
// palette << 12) of gba.png's tiles in gba_pal2's palettes (loaded from palette 1).
{
  const tiles = readPng(path.join(pret, "graphics/trade/gba.png"));
  const pal2 = readPal(path.join(pret, "graphics/trade/gba_pal2.pal"));
  const map = fs.readFileSync(path.join(pret, "graphics/trade/shadow_map.bin"));
  const W = 240, H = 160, perRow = tiles.width / 8;
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let ty = 0; ty < H / 8; ty++) for (let tx = 0; tx < W / 8; tx++) {
    const e = map.readUInt16LE((ty * 32 + tx) * 2);
    const t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, p = (e >> 12) - 1;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = (t % perRow) * 8 + (hf ? 7 - x : x), sy = Math.floor(t / perRow) * 8 + (vf ? 7 - y : y);
      const c = tiles.px[sy * tiles.width + sx];
      const rgb = c && p >= 0 ? pal2[p * 16 + c] : [0, 0, 0];
      const o = ((ty * 8 + y) * W + tx * 8 + x) * 4;
      rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
    }
  }
  writePng(path.join(root, "assets/sprites/egg-hatch-bg.png"), W, H, rgba);
}
console.log("wrote the Egg's pictures");
