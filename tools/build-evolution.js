// Builds the pictures FireRed's evolution scene (src/evolution_scene.c,
// src/evolution_graphics.c) is drawn with, from pret/pokefirered:
//
//   node tools/build-evolution.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes data/evolution-scene.js (the swirling background's tiles and two
// tilemaps) and assets/evolution/sparkle.png (the sparkle, 8x8).
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", "graphics/evolution_scene", ...p);
if (!pret || !fs.existsSync(P("bg.png")) || !fs.existsSync(P("bg2.bin"))) {
  console.error("Usage: node tools/build-evolution.js <path to pret/pokefirered>  (needs graphics/evolution_scene/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/evolution");
fs.mkdirSync(out, { recursive: true });

// The swirl is drawn from its tiles and tilemaps in the page, so its colours
// can be cycled (and so nothing has to read a picture's pixels back, which a
// page opened from a file can't do).
const sheet = readPng(P("bg.png")), per = sheet.width / 8, tiles = [];
for (let t = 0; t < (sheet.width / 8) * (sheet.height / 8); t++) {
  let hex = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    hex += (sheet.px[(Math.floor(t / per) * 8 + y) * sheet.width + (t % per) * 8 + x] & 15).toString(16);
  }
  tiles.push(hex);
}
const map = (file) => { const b = fs.readFileSync(P(file)); return Array.from({ length: 1024 }, (_, i) => b.readUInt16LE(i * 2) & 0xfff); };
fs.writeFileSync(path.join(__dirname, "..", "data/evolution-scene.js"),
  "// FireRed's evolution scene background (graphics/evolution_scene/bg.png, bg.bin\n" +
  "// and bg2.bin), from tools/build-evolution.js: `tiles` are 8x8 tiles, a hex\n" +
  "// digit (colour number) a pixel; `bg1` and `bg2` are 32x32 tilemaps (tile |\n" +
  "// 0x400 h-flip | 0x800 v-flip). Drawn in palette 10, which the scene cycles.\n" +
  "window.EVOLUTION_SCENE = " + JSON.stringify({ tiles, bg1: map("bg.bin"), bg2: map("bg2.bin") }) + ";\n");

const sp = readPng(P("sparkle.png")), spark = new Uint8ClampedArray(64 * 4);
sp.px.forEach((v, i) => { if (v) spark.set([...sp.palette[v], 255], i * 4); });
writePng(path.join(out, "sparkle.png"), 8, 8, spark);
console.log("wrote data/evolution-scene.js and assets/evolution/");
