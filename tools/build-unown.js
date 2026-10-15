// Builds Unown's letter forms (B to Z, ! and ?) from FireRed's pictures, as
// the game's form sprites (ui/screen.js spriteUrl: <dex id>-<form>.png):
//
//   node tools/build-unown.js <path to a pret/pokefirered checkout>
//
// Reads graphics/pokemon/unown/<letter>/front.png, back.png and icon.png,
// graphics/pokemon/unown/normal.pal and shiny.pal and the icon palettes.
// Writes assets/sprites/pokemon/[back/][shiny/]201-<letter>.png (FireRed's
// 64x64 picture in the middle of the game's 96x96, as Unown A's 201.png is)
// and assets/sprites/icons/201-<letter>.png. (Unown A is the plain 201.)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
const dir = pret && path.join(pret, "graphics/pokemon/unown");
if (!dir || !fs.existsSync(path.join(dir, "b/front.png"))) {
  console.error("Usage: node tools/build-unown.js <path to pret/pokefirered> (needs graphics/pokemon/unown/, graphics/pokemon/icon_palettes/)");
  process.exit(1);
}
// The letters (FireRed's folders), and the game's form names.
const LETTERS = "bcdefghijklmnopqrstuvwxyz".split("").map((l) => [l, l]).concat([["exclamation_mark", "exclamation"], ["question_mark", "question"]]);
const normal = readPal(path.join(dir, "normal.pal")), shiny = readPal(path.join(dir, "shiny.pal"));
const iconPal = readPal(path.join(pret, "graphics/pokemon/icon_palettes/icon_palette_0.pal"));   // (gMonIconPaletteIndices: Unown's is 0)

// An indexed picture in `palette`, colour 0 clear, at (dx, dy) on a w x h canvas.
function draw(png, palette, w, h, dx, dy) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = png.px[y * png.width + x] & 15;
    if (!c) continue;
    const o = ((y + dy) * w + x + dx) * 4, rgb = palette[c];
    rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
  }
  return rgba;
}
const out = (...p) => path.join(root, "assets/sprites", ...p);
for (const [folder, form] of LETTERS) {
  const front = readPng(path.join(dir, folder, "front.png")), back = readPng(path.join(dir, folder, "back.png"));
  for (const [pic, sub] of [[front, ""], [back, "back"]]) {
    writePng(out("pokemon", sub, "201-" + form + ".png"), 96, 96, draw(pic, normal, 96, 96, 16, 16));
    writePng(out("pokemon", sub, "shiny", "201-" + form + ".png"), 96, 96, draw(pic, shiny, 96, 96, 16, 16));
  }
  const icon = readPng(path.join(dir, folder, "icon.png"));
  writePng(out("icons", "201-" + form + ".png"), icon.width, icon.height, draw(icon, iconPal, icon.width, icon.height, 0, 0));
}
console.log("wrote Unown's " + LETTERS.length + " letter forms to assets/sprites/pokemon/ and assets/sprites/icons/");
