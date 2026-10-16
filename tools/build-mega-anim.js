// Mega Evolution's animation pictures, from pokeemerald-expansion
// (gBattleAnimGeneral_MegaEvolution in data/battle_anim_scripts.s; the
// sprites in graphics/battle_anims/sprites/, each in its PNG's own palette,
// as src/graphics.c loads them):
//
//   node tools/build-mega-anim.js <path to pokeemerald-expansion>   (or set POKEEMERALD_EXPANSION)
//
// Writes assets/battle-anims/:
//   mega-stone.png       the stone that grows over the Pokémon (64x64)
//   mega-stone-white.png the same, all white (it blends to white: AnimTask_BlendParticle)
//   mega-particles.png   the specks drawn in to it (16x16 frames; the third is used)
//   mega-symbol.png      the Mega symbol that grows and pulses after (32x32)
//   mega-smoke.png       the puffs that swirl up (ANIM_TAG_ELECTRICITY in the
//                        ELECTRIC_ORBS palette, blended 12/16 toward
//                        RGB(29, 0, 29) as the animation's first task does;
//                        four 32x32 frames)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const src = process.argv[2] || process.env.POKEEMERALD_EXPANSION;
const P = (f) => path.join(src || "", "graphics/battle_anims/sprites", f);
const files = ["mega_stone.png", "mega_particles.png", "mega_symbol.png", "electricity.png", "electric_orbs.png"];
if (!src || files.some((f) => !fs.existsSync(P(f)))) {
  console.error("Usage: node tools/build-mega-anim.js <path to pokeemerald-expansion>  (needs graphics/battle_anims/sprites/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/battle-anims");
fs.mkdirSync(out, { recursive: true });

// A GBA colour (5 bits a channel) as the screen shows it.
const to8 = (c) => (c << 3) | (c >> 2);
const to5 = (c) => c >> 3;
function convert(file, name, opts) {
  opts = opts || {};
  const img = readPng(P(file));
  let palette = (opts.palette || img.palette).map((c) => c.map(to5));
  // BlendPalette(…, coeff, colour): each colour moved coeff/16 of the way.
  if (opts.blend) palette = palette.map((c) => c.map((v, k) => v + (((opts.blend.to[k] - v) * opts.blend.coeff) >> 4)));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set(opts.white ? [255, 255, 255, 255] : [...palette[v].map(to8), 255], i * 4); });   // (colour 0 clear)
  writePng(path.join(out, name), img.width, img.height, rgba);
}
convert("mega_stone.png", "mega-stone.png");
convert("mega_stone.png", "mega-stone-white.png", { white: true });
convert("mega_particles.png", "mega-particles.png");
convert("mega_symbol.png", "mega-symbol.png");
convert("electricity.png", "mega-smoke.png", { palette: readPng(P("electric_orbs.png")).palette, blend: { coeff: 12, to: [29, 0, 29] } });
console.log("wrote assets/battle-anims/mega-stone.png, mega-stone-white.png, mega-particles.png, mega-symbol.png, mega-smoke.png");
