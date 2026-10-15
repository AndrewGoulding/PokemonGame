// Builds the pictures FireRed's Bag screen (src/item_menu.c) is drawn with,
// from pret/pokefirered:
//
//   node tools/build-bag.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/bag/:
//   bg-male.png, bg-female.png   the background (BG1: graphics/item_menu/bg.png
//                                and bg.bin, palettes 0-1; the female bag's
//                                palette 0 is bg_female.pal), 240x160
//   desc-dim.png                 rows 14-19 in palette 2: the description area
//                                while a menu is open (Bag_FillMessageBoxWithPalette)
//   bag-male.png, bag-female.png the bag sprite's four 64x64 frames (graphics/
//                                interface/bag_*.png in bag.pal): shut, POKé
//                                BALLS, ITEMS, KEY ITEMS
//   arrows.png                   the red scroll arrows (red_arrow_other.png in
//                                red_arrow.pal): left, then up, 16x16 each
//   return-arrow.png             CANCEL's item icon (graphics/items/icons/
//                                return_to_field_arrow.png), 24x24
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
if (!pret || !fs.existsSync(P("graphics/item_menu/bg.bin")) || !fs.existsSync(P("graphics/interface/bag_male.png"))) {
  console.error("Usage: node tools/build-bag.js <path to pret/pokefirered>  (needs graphics/item_menu/ and graphics/interface/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/bag");
fs.mkdirSync(out, { recursive: true });

const tiles = P("graphics/item_menu/bg.png"), map = P("graphics/item_menu/bg.bin");
const pal = readPng(tiles).palette.slice(0, 48);
pal[0] = [0, 0, 0];   // (the backdrop: SetBackdropFromPalette, black)
function background(pal0) {
  const ram = paletteRam([[0, pal0], [1, pal.slice(16, 32)], [2, pal.slice(32, 48)]]);
  return renderBg({ tiles, map, widthTiles: 30, heightTiles: 20, ram, lowNibble: true, opaque: true });
}
const male = background(pal.slice(0, 16));
writePng(path.join(out, "bg-male.png"), 240, 160, male.rgba);
const female = readPal(P("graphics/item_menu/bg_female.pal")).slice(0, 16);
female[0] = [0, 0, 0];
writePng(path.join(out, "bg-female.png"), 240, 160, background(female).rgba);

// Rows 14-19 again, every tile in palette 2.
{
  const entries = fs.readFileSync(map), dim = Buffer.alloc(32 * 6 * 2);
  for (let i = 0; i < 32 * 6; i++) dim.writeUInt16LE((entries.readUInt16LE((14 * 32 + i) * 2) & 0x0fff) | (2 << 12), i * 2);
  const tmp = path.join(out, ".dim.bin");
  fs.writeFileSync(tmp, dim);
  const ram = paletteRam([[0, pal.slice(0, 16)], [1, pal.slice(16, 32)], [2, pal.slice(32, 48)]]);
  const r = renderBg({ tiles, map: tmp, widthTiles: 30, heightTiles: 6, rowWidth: 32, ram, lowNibble: true, opaque: true });
  fs.unlinkSync(tmp);
  writePng(path.join(out, "desc-dim.png"), 240, 48, r.rgba);
}

// Sprites, colour 0 clear.
function sprite(png, palFile, file) {
  const img = readPng(P("graphics/interface", png)), colours = readPal(P("graphics/interface", palFile));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...colours[v], 255], i * 4); });
  writePng(path.join(out, file), img.width, img.height, rgba);
}
sprite("bag_male.png", "bag.pal", "bag-male.png");
sprite("bag_female.png", "bag.pal", "bag-female.png");
sprite("red_arrow_other.png", "red_arrow.pal", "arrows.png");
{
  const img = readPng(P("graphics/items/icons/return_to_field_arrow.png"));
  const colours = readPal(P("graphics/items/icon_palettes/return_to_field_arrow.pal"));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...colours[v], 255], i * 4); });
  writePng(path.join(out, "return-arrow.png"), img.width, img.height, rgba);
}
console.log("wrote assets/bag/");
