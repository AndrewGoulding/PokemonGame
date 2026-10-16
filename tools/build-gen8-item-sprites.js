// The item pictures Gen 8's evolutions need that pokesprite (where the other
// item sprites come from) hasn't got: Legends: Arceus's Black Augurite and
// Peat Block, and Kubfu's two scrolls. They're pokeemerald-expansion's 24x24
// bag icons (graphics/items/icons/*.png with icon_palettes/*.pal), centred in
// pokesprite's 32x32, into assets/sprites/items/evo-item/.
//
//   node tools/build-gen8-item-sprites.js <path to pokeemerald-expansion>
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const X = (...p) => path.join(process.argv[2] || process.env.POKEEMERALD_EXPANSION || "", ...p);
if (!fs.existsSync(X("graphics/items/icons"))) {
  console.error("Usage: node tools/build-gen8-item-sprites.js <path to pokeemerald-expansion>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/sprites/items/evo-item");
const ITEMS = ["black-augurite", "peat-block", "scroll-of-darkness", "scroll-of-waters"];
for (const id of ITEMS) {
  const file = id.replace(/-/g, "_");
  const img = readPng(X("graphics/items/icons", file + ".png"));
  const colours = readPal(X("graphics/items/icon_palettes", file + ".pal"));
  const rgba = new Uint8ClampedArray(32 * 32 * 4);
  const ox = (32 - img.width) >> 1, oy = (32 - img.height) >> 1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const v = img.px[y * img.width + x] & 15;
    if (v) rgba.set([...colours[v], 255], ((y + oy) * 32 + x + ox) * 4);
  }
  writePng(path.join(out, id + ".png"), 32, 32, rgba);
}
console.log("wrote " + ITEMS.length + " item sprites to assets/sprites/items/evo-item/");
