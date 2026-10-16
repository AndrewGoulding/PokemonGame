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
//   bag-male.png, bag-female.png the bag sprite's 64x64 frames (graphics/
//                                interface/bag_*.png in bag.pal): FireRed's
//                                four (shut, POKé BALLS, ITEMS, KEY ITEMS),
//                                then this game's own for its new pockets, the
//                                bag recoloured: 4 ITEMS' frame in blue
//                                (Power-up), 5 POKé BALLS' in green (Held
//                                Items), 6 KEY ITEMS' in violet (Mega Stones);
//                                7-9 the shut bag in those colours
//   arrows.png                   the red scroll arrows (red_arrow_other.png in
//                                red_arrow.pal): left, then up, 16x16 each
//   return-arrow.png             CANCEL's item icon (graphics/items/icons/
//                                return_to_field_arrow.png), 24x24
//   select-button.png            the SELECT button by the registered item
//                                (graphics/interface/select_button.png, in the
//                                list window's palette, bag_window_pal.pal), 24x16
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
// The bag's body colours (1-4 the yellows, 9 the brown shading) turned to
// another hue, as 5-bit GBA colours.
function recolour([r, g, b], hue) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), v = max / 255, s = max ? 0.8 * (max - min) / max : 0;
  const h = hue / 60, c = v * s, x = c * (1 - Math.abs((h % 2) - 1)), m = v - c;
  const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [r1, g1, b1].map((u) => Math.round((u + m) * 31) * 255 / 31 | 0);
}
const NEW_FRAMES = [[2, 205], [1, 125], [3, 285], [0, 205], [0, 125], [0, 285]];   // (FireRed frame, hue)
function bag(png, file) {
  const img = readPng(P("graphics/interface", png)), colours = readPal(P("graphics/interface/bag.pal"));
  const W = img.width, F = 64 * W, frames = 4 + NEW_FRAMES.length;
  const rgba = new Uint8ClampedArray(W * 64 * frames * 4);
  const put = (src, dst, pal) => {
    for (let i = 0; i < F; i++) { const v = img.px[src * F + i] & 15; if (v) rgba.set([...pal[v], 255], (dst * F + i) * 4); }
  };
  for (let f = 0; f < 4; f++) put(f, f, colours);
  NEW_FRAMES.forEach(([src, hue], k) => put(src, 4 + k, colours.map((c, i) => ([1, 2, 3, 4, 9].includes(i) ? recolour(c, hue) : c))));
  writePng(path.join(out, file), W, 64 * frames, rgba);
}
bag("bag_male.png", "bag-male.png");
bag("bag_female.png", "bag-female.png");
sprite("red_arrow_other.png", "red_arrow.pal", "arrows.png");
{
  const img = readPng(P("graphics/items/icons/return_to_field_arrow.png"));
  const colours = readPal(P("graphics/items/icon_palettes/return_to_field_arrow.pal"));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...colours[v], 255], i * 4); });
  writePng(path.join(out, "return-arrow.png"), img.width, img.height, rgba);
}
{
  const img = readPng(P("graphics/interface/select_button.png"));
  const colours = readPal(P("graphics/item_menu/bag_window_pal.pal"));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...colours[v], 255], i * 4); });
  writePng(path.join(out, "select-button.png"), img.width, img.height, rgba);
}
console.log("wrote assets/bag/");
