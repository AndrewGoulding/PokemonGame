// GBA graphics helpers shared by the converters: palette RAM and backgrounds.
"use strict";

const fs = require("fs");
const { readPng } = require("./png");

// A palette RAM image: 256 colours, filled from .pal files (or PNG palettes)
// at the slots the game loads them to. pals: [[slot, colours], ...]
function paletteRam(pals) {
  const ram = new Array(256).fill(null);
  for (const [slot, colours] of pals) colours.forEach((c, i) => { if (slot * 16 + i < 256) ram[slot * 16 + i] = c; });
  return ram;
}

// Draws a GBA background: `tiles` (indexed PNG of 8x8 tiles, row-major),
// `map` (.bin of u16 entries: tile | hflip 0x400 | vflip 0x800 | palette << 12),
// `widthTiles` x `heightTiles`. 64-wide maps are stored as 32x32 screen blocks.
// Colour 0 of each palette is transparent unless `opaque`.
// `rowWidth` reads the map as plain rows of that many entries instead (window
// tilemaps copied with CopyToBgTilemapBufferRect).
// `invertGray`: grayscale tile sheets that gbagfx inverts (index = 15 - gray).
// `lowNibble`: 4bpp sheets saved with full palette indices (only the low 4
// bits are the colour; the tilemap picks the palette).
function renderBg({ tiles, map, widthTiles, heightTiles, ram, bpp, opaque, tileOffset, rowWidth, invertGray, lowNibble }) {
  const sheet = readPng(tiles);
  if (invertGray) sheet.px = sheet.px.map((v) => 15 - v);
  if (lowNibble) sheet.px = sheet.px.map((v) => v & 15);
  const entries = Buffer.isBuffer(map) ? map : fs.readFileSync(map);   // (a file, or the tilemap itself)
  const tilesPerRow = sheet.width / 8;
  const w = widthTiles * 8, h = heightTiles * 8;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const count = entries.length / 2;
  for (let ty = 0; ty < heightTiles; ty++) {
    for (let tx = 0; tx < widthTiles; tx++) {
      // Screen blocks: each 32x32 block is stored whole, left to right then down.
      const block = Math.floor(tx / 32) + Math.floor(ty / 32) * Math.ceil(widthTiles / 32);
      const i = rowWidth ? ty * rowWidth + tx : block * 1024 + (ty % 32) * 32 + (tx % 32);
      if (i >= count) continue;
      const e = entries.readUInt16LE(i * 2);
      const tile = (e & 0x3ff) - (tileOffset || 0), hflip = e & 0x400, vflip = e & 0x800, pal = e >> 12;
      if (tile < 0) continue;
      const sx = (tile % tilesPerRow) * 8, sy = Math.floor(tile / tilesPerRow) * 8;
      if (sy >= sheet.height) continue;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const v = sheet.px[(sy + (vflip ? 7 - y : y)) * sheet.width + sx + (hflip ? 7 - x : x)];
          if (!v && !opaque) continue;
          const c = ram[bpp === 8 ? v : pal * 16 + v] || sheet.palette[v] || [v * 17, v * 17, v * 17];
          const o = ((ty * 8 + y) * w + tx * 8 + x) * 4;
          rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
        }
      }
    }
  }
  return { width: w, height: h, rgba };
}

module.exports = { paletteRam, renderBg };
