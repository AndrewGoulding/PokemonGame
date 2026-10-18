// Builds the Ruins of Alph's pictures from pret/pokeheartgold's graphics:
// the stone-panel puzzle (src/alph_puzzle.c, NARC application/annon/puzzle_gra)
// and the words on the chambers' walls (OpenAlphHiddenRoom: demo/legend's
// tablet and the Unown font, graphic/font 3, msg_0198).
//
//   node tools/build-alph.js <path to pret/pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes, background transparent where HGSS's colour 0 is:
//
//   assets/alph/board.png       the puzzle's board (the 6x6 squares the pieces
//                               go on, puzzle_gra 11 laid out by screen 12: 192x192)
//   assets/alph/marks.png       the squares' marks (screen 13): the one the
//                               piece would go to, where it came from, and
//                               where it came from with the piece over it (32x32 each)
//   assets/alph/pieces-<n>.png  each puzzle's 16 pieces (puzzle_gra 4-7: Kabuto,
//                               Aerodactyl, Omanyte, Ho-Oh), 32x32 each, top to
//                               bottom, in the order they go on the board
//   assets/alph/wall-<n>.png    each chamber's wall: "ESCAPE", "LIGHT", "WATER"
//                               and "HO OH" in the Unown font on the tablet
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
const GRA = ROOT && path.join(ROOT, "files/application/annon/puzzle_gra");
if (!GRA || !fs.existsSync(GRA)) {
  console.error("Usage: node tools/build-alph.js <path to pret/pokeheartgold>  (needs files/application/annon/puzzle_gra/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/alph");
fs.mkdirSync(out, { recursive: true });
const gra = (n, ext) => path.join(GRA, "puzzle_gra_" + String(n).padStart(8, "0") + "." + ext);
// (An NSCR's tilemap and its size in pixels.)
const nscr = (buf) => ({ map: buf.subarray(0x24), w: buf.readUInt16LE(0x18), h: buf.readUInt16LE(0x1a) });
// Part of an RGBA picture.
function crop(img, x, y, w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let j = 0; j < h; j++) rgba.set(img.rgba.subarray(((y + j) * img.width + x) * 4, ((y + j) * img.width + x + w) * 4), j * w * 4);
  return { width: w, height: h, rgba };
}
const save = (name, img) => writePng(path.join(out, name), img.width, img.height, img.rgba);

// ---------- The puzzle ----------

// The board: the main screen's BG 3 (AlphPuzzle_LoadBackgroundGraphics), its
// 6x6 squares at x 32-224 (the corners can't be used).
const ram = paletteRam([[0, readPal(gra(10, "pal"))]]);
const bg = (n, opaque) => { const s = nscr(fs.readFileSync(gra(n, "NSCR"))); return renderBg({ tiles: gra(11, "png"), map: s.map, widthTiles: s.w / 8, heightTiles: s.h / 8, ram, opaque, lowNibble: true }); };
const boardImg = crop(bg(12, true), 32, 0, 192, 192);
save("board.png", boardImg);
save("marks.png", crop(bg(13, false), 0, 0, 96, 32));

// The chambers' 3D pieces, as overworld sprites (ui/johto-alph.js puts them
// on the maps): the stone panel over the hole in the floor (SPRITE_BABYBOY1_13:
// the board's middle, the 4x4 the pieces go in, at 24x24 over the hole's
// 32x32 rim), and the wall a word opens (SPRITE_BABYBOY1_12: the map's own
// wall shows, so nothing).
{
  const S = 24, from = 128 / S, img = { width: 32, height: 32, rgba: new Uint8ClampedArray(32 * 32 * 4) };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sum = [0, 0, 0];
    let n = 0;
    for (let j = Math.floor(y * from); j < Math.floor((y + 1) * from); j++) for (let i = Math.floor(x * from); i < Math.floor((x + 1) * from); i++) {
      const o = ((32 + j) * boardImg.width + 32 + i) * 4;
      for (let k = 0; k < 3; k++) sum[k] += boardImg.rgba[o + k];
      n++;
    }
    img.rgba.set(sum.map((v) => Math.round(v / n)).concat(255), ((y + 4) * 32 + x + 4) * 4);
  }
  writePng(path.join(__dirname, "..", "assets/world/sprites/alph_panel.png"), 32, 32, img.rgba);
  writePng(path.join(__dirname, "..", "assets/world/sprites/alph_wall.png"), 16, 32, new Uint8ClampedArray(16 * 32 * 4));
}

// The pieces: sprites in the OBJ palette's third row (sSpriteTemplates' palette 2).
const objPal = readPal(gra(0, "pal"));
for (let n = 0; n < 4; n++) {
  const p = readPng(gra(4 + n, "png"));
  const rgba = new Uint8ClampedArray(p.width * p.height * 4);
  for (let i = 0; i < p.px.length; i++) {
    const v = p.px[i] & 15;
    if (v) rgba.set(objPal[32 + v].concat(255), i * 4);
  }
  save("pieces-" + n + ".png", { width: p.width, height: p.height, rgba });
}

// ---------- The walls ----------

// The tablet (demo/legend 15-17: its palette, tiles and screen), cropped to it.
function nitroBg(dir, pal, chr, scr) {
  const f = (n, ext) => fs.readFileSync(path.join(dir, "legend_" + String(n).padStart(8, "0") + "." + ext));
  const pb = f(pal, "NCLR"), cb = f(chr, "NCGR"), s = nscr(f(scr, "NSCR"));
  const colours = [];
  for (let i = 0, n = pb.readUInt32LE(0x20) / 2, o = 0x18 + pb.readUInt32LE(0x24); i < n; i++) {
    const v = pb.readUInt16LE(o + i * 2);
    colours.push([(v & 31) << 3, ((v >> 5) & 31) << 3, ((v >> 10) & 31) << 3]);
  }
  const tiles = cb.subarray(0x18 + cb.readUInt32LE(0x2c));
  const rgba = new Uint8ClampedArray(s.w * s.h * 4);
  for (let ty = 0; ty < s.h / 8; ty++) for (let tx = 0; tx < s.w / 8; tx++) {
    const e = s.map.readUInt16LE((ty * (s.w / 8) + tx) * 2), t = e & 0x3ff, pl = e >> 12;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = e & 0x400 ? 7 - x : x, sy = e & 0x800 ? 7 - y : y, b = tiles[t * 32 + sy * 4 + (sx >> 1)];
      const v = sx & 1 ? b >> 4 : b & 15;
      if (v) rgba.set(colours[pl * 16 + v].concat(255), ((ty * 8 + y) * s.w + tx * 8 + x) * 4);
    }
  }
  return { width: s.w, height: s.h, rgba };
}
const tabletAll = nitroBg(path.join(ROOT, "files/demo/legend"), 15, 16, 17);
let x0 = tabletAll.width, y0 = tabletAll.height, x1 = 0, y1 = 0;
for (let y = 0; y < tabletAll.height; y++) for (let x = 0; x < tabletAll.width; x++) if (tabletAll.rgba[(y * tabletAll.width + x) * 4 + 3]) {
  x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}

// The Unown font (graphic/font 3: 16x16 glyphs, 2 bits a pixel, four 8x8
// tiles, each row's second byte its left half, the first pixel the top two
// bits: DecompressGlyphTile; 1 the letter, 2 its shadow, 3 the background), HGSS's character
// codes (A is 0x12B, a space 0x1DE).
const font = fs.readFileSync(path.join(ROOT, "files/graphic/font/font_00000003.bin"));
const headerSize = font.readUInt32LE(0), widths = font.readUInt32LE(4);
const glyphOf = (ch) => (ch === " " ? 0x1dd : ch.charCodeAt(0) - 65 + 0x12a);
// The words (msg_0198), in the wall's colours (the text printer's 0x000F0E09).
const words = JSON.parse(fs.readFileSync(path.join(ROOT, "files/msgdata/msg/msg_0198.json"), "utf8")).messages.map((m) => m.en_US);
const INK = [[72, 48, 24], [160, 120, 64]];
words.forEach((word, n) => {
  const img = crop(tabletAll, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  const ids = [...word].map(glyphOf), w = ids.reduce((a, id) => a + font[widths + id], 0);
  let x = (img.width - w) >> 1;
  const y = (img.height - 16) >> 1;
  for (const id of ids) {
    for (let t = 0; t < 4; t++) for (let j = 0; j < 8; j++) for (let k = 0; k < 2; k++) {
      const byte = font[headerSize + id * 64 + t * 16 + j * 2 + 1 - k];
      for (let i = 0; i < 4; i++) {
        const v = (byte >> (6 - 2 * i)) & 3;
        if (v !== 1 && v !== 2) continue;
        const px = x + (t & 1) * 8 + k * 4 + i, py = y + (t >> 1) * 8 + j;
        if (px >= 0 && px < img.width) img.rgba.set(INK[v - 1].concat(255), (py * img.width + px) * 4);
      }
    }
    x += font[widths + id];
  }
  save("wall-" + n + ".png", img);
});
console.log("wrote assets/alph/: board, marks, 4 puzzles' pieces and 4 walls");
