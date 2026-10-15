// The "Ghost" FireRed shows in Pokémon Tower before you have the Silph Scope
// (graphics/pokemon/ghost/front.png, gGhostFrontPic), as
// assets/battle-interface/ghost.png (64x64, colour 0 clear).
//
//   node tools/build-ghost.js <path to pokefirered>   (or set POKEFIRERED)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const src = path.join(pret || "", "graphics/pokemon/ghost/front.png");
if (!pret || !fs.existsSync(src)) {
  console.error("Usage: node tools/build-ghost.js <path to pret/pokefirered>  (needs graphics/pokemon/ghost/)");
  process.exit(1);
}
const png = readPng(src), rgba = new Uint8ClampedArray(png.width * png.height * 4);
png.px.forEach((v, i) => { if (v) rgba.set([...png.palette[v], 255], i * 4); });
writePng(path.join(__dirname, "..", "assets/battle-interface/ghost.png"), png.width, png.height, rgba);
console.log("wrote assets/battle-interface/ghost.png");
