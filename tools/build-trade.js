// The pictures FireRed's trade sequence is drawn with (src/trade_scene.c,
// DoTradeAnim_Cable), from pret/pokefirered:
//
//   node tools/build-trade.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/trade/:
//   mon-bg.png       BG2 behind the Pokémon (gTradeOrHatchMonShadowTilemap,
//                    shadow_map.bin, 512x256, in gba_pal2.pal at palettes 1-3)
//   gba-cable.png    BG1 the GBAs and the cable between them (gba_map_cable.bin,
//                    256x512)
//   cable-closeup.png BG1 while the two Pokémon pass (cable_closeup_map.bin, 256x256)
//   gba-affine.png   BG2 the GBA that zooms (gba_affine.png, 8bpp, through
//                    gba_affine_map_cable.bin: 128x128)
//   pokeball.png     the trade's Poké Ball: 12 frames of 16x16 spinning (pokeball.png)
//   link-glow.png    the glowing light that travels the cable (32x32)
//   link-shadow.png, link-shadow-white.png  its core: big and small (two
//                    16x32 frames), in each of the colours its colour 4 blinks
//   cable-end.png    the cable's plug (16x32)
//   gba-screen.png   the GBA screen's flash: four 64x32 frames
// Colour 0 is clear, except on the backgrounds' backdrop (the first colour
// of palette 0 is black, as BG0's palette (the battle text box's) has it).
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const src = process.argv[2] || process.env.POKEFIRERED;
const G = (f) => path.join(src || "", "graphics/trade", f);
if (!src || !fs.existsSync(G("gba.png"))) {
  console.error("Usage: node tools/build-trade.js <path to pokefirered>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/trade");
fs.mkdirSync(out, { recursive: true });

const pal2 = readPal(G("gba_pal2.pal"));
const ram = paletteRam([[16, pal2.slice(0, 16)], [32, pal2.slice(16, 32)], [48, pal2.slice(32, 48)]]);
function bg(map, w, h, file) {
  const r = renderBg({ tiles: G("gba.png"), map: G(map), widthTiles: w, heightTiles: h, ram, lowNibble: true });
  writePng(path.join(out, file), r.width, r.height, r.rgba);
}
bg("shadow_map.bin", 64, 32, "mon-bg.png");
bg("gba_map_cable.bin", 32, 64, "gba-cable.png");
bg("cable_closeup_map.bin", 32, 32, "cable-closeup.png");

// The affine GBA: one byte a tile, 8bpp tiles in the PNG's own palette.
{
  const sheet = readPng(G("gba_affine.png"));
  const map = fs.readFileSync(G("gba_affine_map_cable.bin"));
  const per = sheet.width / 8, rgba = new Uint8ClampedArray(128 * 128 * 4);
  for (let t = 0; t < 256; t++) {
    const tile = map[t], sx = (tile % per) * 8, sy = Math.floor(tile / per) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = sheet.px[(sy + y) * sheet.width + sx + x];
      if (!v) continue;
      const c = sheet.palette[v], o = (((t >> 4) * 8 + y) * 128 + (t & 15) * 8 + x) * 4;
      rgba.set([c[0], c[1], c[2], 255], o);
    }
  }
  writePng(path.join(out, "gba-affine.png"), 128, 128, rgba);
}

// Sprites.
function sprite(png, pal, file, crop, colour4) {
  const img = readPng(G(png));
  const colours = (pal ? readPal(G(pal)) : img.palette).slice();
  if (colour4) colours[4] = colour4;
  const h = crop || img.height;
  const rgba = new Uint8ClampedArray(img.width * h * 4);
  for (let i = 0; i < img.width * h; i++) {
    const v = img.px[i] & 15;
    if (v) rgba.set([...colours[v], 255], i * 4);
  }
  writePng(path.join(out, file), img.width, h, rgba);
}
sprite("pokeball.png", null, "pokeball.png");
sprite("link_mon_glow.png", "link_mon.pal", "link-glow.png");
// (Its colour 4 blinks, sLinkMonShadow_Pal: RGB(18, 24, 31) and white.)
sprite("link_mon_shadow.png", "link_mon.pal", "link-shadow.png", null, [148, 198, 255]);
sprite("link_mon_shadow.png", "link_mon.pal", "link-shadow-white.png", null, [255, 255, 255]);
sprite("cable_end.png", "gba.pal", "cable-end.png", 32);
sprite("gba_screen.png", "gba.pal", "gba-screen.png");
console.log("wrote assets/trade/");
