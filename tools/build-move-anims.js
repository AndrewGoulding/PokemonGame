// Move animation pictures from FireRed (graphics/battle_anims/sprites/, each
// in its PNG's own palette, as src/graphics.c loads them):
//
//   node tools/build-move-anims.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/battle-anims/:
//   round-shadow.png  ANIM_TAG_ROUND_SHADOW: Fly's (and Bounce's) ball of
//                     shadow the Pokémon becomes in the air (64x64)
//   impact.png        ANIM_TAG_IMPACT: the basic hit splat (32x32)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const src = process.argv[2] || process.env.POKEFIRERED;
const P = (f) => path.join(src || "", "graphics/battle_anims/sprites", f);
const FILES = { "round_shadow.png": "round-shadow.png", "impact.png": "impact.png" };
if (!src || Object.keys(FILES).some((f) => !fs.existsSync(P(f)))) {
  console.error("Usage: node tools/build-move-anims.js <path to pokefirered>  (needs graphics/battle_anims/sprites/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/battle-anims");
fs.mkdirSync(out, { recursive: true });
// A GBA colour (5 bits a channel) as the screen shows it.
const to8 = (c) => ((c >> 3) << 3) | (c >> 5);
for (const [file, name] of Object.entries(FILES)) {
  const img = readPng(P(file));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...img.palette[v].map(to8), 255], i * 4); });   // (colour 0 clear)
  writePng(path.join(out, name), img.width, img.height, rgba);
}
console.log("wrote assets/battle-anims/" + Object.values(FILES).join(", "));
