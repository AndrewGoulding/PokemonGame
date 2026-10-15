// Builds the pictures FireRed's Poké Mart buy screen (src/shop.c) is drawn
// with, from pret/pokefirered:
//
//   node tools/build-shop.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/shop/:
//   shop.png       the frame (graphics/shop_menu/shop_menu.png and
//                  shop_tilemap.bin, the palette's first 16 colours), 240x160:
//                  the list's paper on the right, the blue panel along the
//                  bottom with the icon's box; clear on the left, where the map
//                  shows through
//   shop-dim.png   its rows 14-19 in the palette's other 16 colours (the
//                  panel while you're buying: SetBgTilemapPalette(1, 0, 14, 30, 6, 6)), 240x48
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", "graphics/shop_menu", ...p);
if (!pret || !fs.existsSync(P("shop_menu.png")) || !fs.existsSync(P("shop_tilemap.bin"))) {
  console.error("Usage: node tools/build-shop.js <path to pret/pokefirered>  (needs graphics/shop_menu/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/shop");
fs.mkdirSync(out, { recursive: true });

const sheet = readPng(P("shop_menu.png")), map = fs.readFileSync(P("shop_tilemap.bin"));
const per = sheet.width / 8;
// Rows `top`..`top + rows - 1` of the 32-wide tilemap, in colours `pal`.
function render(top, rows, pal) {
  const W = 240, H = rows * 8, rgba = new Uint8ClampedArray(W * H * 4);
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < 30; tx++) {
    const e = map.readUInt16LE(((top + ty) * 32 + tx) * 2);
    if (!e) continue;   // (entries of 0 are left out: the map shows there)
    const t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800;
    const sx = (t % per) * 8, sy = Math.floor(t / per) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = sheet.px[(sy + (vf ? 7 - y : y)) * sheet.width + sx + (hf ? 7 - x : x)] & 15;
      if (!v) continue;
      rgba.set([...pal[v], 255], ((ty * 8 + y) * W + tx * 8 + x) * 4);
    }
  }
  return { W, H, rgba };
}
const normal = render(0, 20, sheet.palette.slice(0, 16));
writePng(path.join(out, "shop.png"), normal.W, normal.H, normal.rgba);
const dim = render(14, 6, sheet.palette.slice(16, 32));
writePng(path.join(out, "shop-dim.png"), dim.W, dim.H, dim.rgba);
console.log("wrote assets/shop/");
