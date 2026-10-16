// Mega Evolution's battle pictures, from pokeemerald-expansion
// (graphics/battle_interface/, each PNG in its own palette, as the expansion
// loads them: src/data/graphics/gimmicks.h):
//
//   node tools/build-mega-icons.js <path to pokeemerald-expansion>   (or set POKEEMERALD_EXPANSION)
//
// Writes assets/battle-interface/:
//   mega-indicator.png   the Mega symbol shown on a Mega Evolved Pokémon's
//                        healthbox in place of "Lv" (mega_indicator.png, 8x16)
//   mega-trigger.png     the trigger beside your healthbox while you choose a
//                        move: off, then on (mega_trigger.png, two 32x32 frames)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const src = process.argv[2] || process.env.POKEEMERALD_EXPANSION;
const P = (...p) => path.join(src || "", "graphics/battle_interface", ...p);
if (!src || !fs.existsSync(P("mega_indicator.png")) || !fs.existsSync(P("mega_trigger.png"))) {
  console.error("Usage: node tools/build-mega-icons.js <path to pokeemerald-expansion>  (needs graphics/battle_interface/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/battle-interface");
for (const [file, name] of [["mega_indicator.png", "mega-indicator.png"], ["mega_trigger.png", "mega-trigger.png"]]) {
  const img = readPng(P(file));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...img.palette[v], 255], i * 4); });   // (colour 0 clear)
  writePng(path.join(out, name), img.width, img.height, rgba);
}
console.log("wrote assets/battle-interface/mega-indicator.png, mega-trigger.png");
