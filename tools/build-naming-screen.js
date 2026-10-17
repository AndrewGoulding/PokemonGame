// Builds FireRed's naming screen (src/naming_screen.c: "YOUR NAME?" and its
// keyboard) from a pret/pokefirered checkout into assets/naming-screen/:
//
//   node tools/build-naming-screen.js <path to pokefirered>   (or set POKEFIRERED)
//
// Needs graphics/naming_screen/. The backgrounds are drawn from menu.png's
// tiles and their tilemaps with the palettes LoadPalettes gives them
// (gNamingScreenMenu_Pal: menu, page_swap_upper/lower/others, buttons and
// cursor .pal in BG palettes 0-5; keyboard.pal in 10); the windows the game
// prints into are filled in their PIXEL_FILL colour, so only the text is left
// for ui/naming-screen.js to draw (in FireRed's font). Sprites are cut out with
// colour 0 transparent, in the palettes sSpritePalettes gives them:
//
//   background.png         BG3: gNamingScreenBackground_Tilemap, with the
//                          title box (WIN_TEXT_ENTRY_BOX) and the name's
//                          window (WIN_TEXT_ENTRY) filled white (PIXEL_FILL(1))
//   keyboard-upper.png     BG1/BG2: the keyboard pages' tilemaps (palettes 1-3)
//   keyboard-lower.png     with their key window (WIN_KB_PAGE_1/2, tiles 3,10,
//   keyboard-symbols.png   19x8) filled as sFillValues does (13, 14 or 15)
//   page-swap-frame.png    the frame round the page button (40x32, buttons.pal)
//   page-swap-button.png   the page button in its three colours, 32x16 each,
//                          stacked: upper, lower, others (page_swap_*.pal)
//   page-swap-text.png     its labels (the first three tiles, 24x8 each,
//                          stacked: UPPER, lower, OTHERS; buttons.pal)
//   back-button.png        BACK and OK (40x24, buttons.pal)
//   ok-button.png
//   button-flash.png       colour 14 of the frame, BACK and OK (what
//                          Task_UpdateButtonFlash brightens), in white:
//                          40x32 frame, then 40x24 BACK, then 40x24 OK, stacked
//   cursor.png             the key cursor's three looks, 16x16 side by side:
//                          cursor, cursor_squished, cursor_filled (cursor.pal)
//   cursor-flash.png       their colour 1 (what SpriteCB_Cursor brightens), white
//   input-arrow.png        the arrow and the underscores under the name
//   underscore.png         (8x8, page_swap_others.pal)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/naming_screen/menu.png"))) {
  console.error("usage: node tools/build-naming-screen.js <path to pokefirered>  (needs graphics/naming_screen/)");
  process.exit(1);
}
const N = (f) => path.join(pret, "graphics/naming_screen", f);
const out = path.join(root, "assets/naming-screen");
fs.mkdirSync(out, { recursive: true });
const save = (name, img) => writePng(path.join(out, name + ".png"), img.width, img.height, img.rgba);

const pal = (f) => readPal(N(f + ".pal"));
const menuPals = ["menu", "page_swap_upper", "page_swap_lower", "page_swap_others", "buttons", "cursor"].map(pal);
const keyboardPal = pal("keyboard");
// LoadPalettes: gNamingScreenMenu_Pal into BG palettes 0-5, the keyboard's into 10.
const ram = paletteRam([...menuPals.map((p, i) => [i, p]), [10, keyboardPal]]);

// ---------- Backgrounds ----------

const fillRect = (img, x0, y0, w, h, c) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const o = (y * img.width + x) * 4;
    img.rgba[o] = c[0]; img.rgba[o + 1] = c[1]; img.rgba[o + 2] = c[2]; img.rgba[o + 3] = 255;
  }
};
// 32x20 tilemaps, of which the screen shows 30 columns.
const bg = (map, opaque) => renderBg({ tiles: N("menu.png"), map: N(map), widthTiles: 30, heightTiles: 20, ram, opaque, rowWidth: 32 });

// BG3: everything behind the keyboard (colour 0 is the backdrop, menu.pal's
// first colour). Its top two rows sit under the banner (BG0), drawn in
// ui/naming-screen.js.
const back = bg("background.bin", true);
fillRect(back, 9 * 8, 4 * 8, 16 * 8, 2 * 8, keyboardPal[1]);   // WIN_TEXT_ENTRY_BOX: the title
fillRect(back, 8 * 8, 6 * 8, 14 * 8, 2 * 8, keyboardPal[1]);   // WIN_TEXT_ENTRY: the name
save("background", back);

// The keyboard pages, each with its key window filled (sFillValues).
for (const [name, fill] of [["upper", 13], ["lower", 14], ["symbols", 15]]) {
  const kb = bg("keyboard_" + name + ".bin", false);
  fillRect(kb, 3 * 8, 10 * 8, 19 * 8, 8 * 8, keyboardPal[fill]);
  save("keyboard-" + name, kb);
}

// ---------- Sprites ----------

// Part of an indexed sprite PNG -> RGBA: colour 0 clear; `only` keeps just
// pixels of that colour, drawn white (a layer to tint).
function cut(file, colours, sx, sy, w, h, only) {
  const p = readPng(N(file));
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = p.px[(sy + y) * p.width + sx + x];
    if (!v || (only != null && v !== only)) continue;
    const c = only != null ? [255, 255, 255] : colours[v];
    const o = (y * w + x) * 4;
    rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
  }
  return { width: w, height: h, rgba };
}
// Pictures of the same width stacked top to bottom, or of the same height side by side.
function stack(imgs, across) {
  const width = across ? imgs.reduce((a, i) => a + i.width, 0) : imgs[0].width;
  const height = across ? imgs[0].height : imgs.reduce((a, i) => a + i.height, 0);
  const rgba = new Uint8ClampedArray(width * height * 4);
  let at = 0;
  for (const i of imgs) {
    for (let y = 0; y < i.height; y++) {
      const row = i.rgba.subarray(y * i.width * 4, (y + 1) * i.width * 4);
      rgba.set(row, across ? (y * width + at) * 4 : ((at + y) * width) * 4);
    }
    at += across ? i.width : i.height;
  }
  return { width, height, rgba };
}

const [, pageUpperPal, pageLowerPal, pageOthersPal, buttonsPal, cursorPal] = menuPals;

save("page-swap-frame", cut("page_swap_frame.png", buttonsPal, 0, 0, 40, 32));
save("page-swap-button", stack([pageUpperPal, pageLowerPal, pageOthersPal].map((p) => cut("page_swap_button.png", p, 0, 0, 32, 16))));
// The labels' sheets are 0x60 bytes: three tiles of the 40x8 pictures.
save("page-swap-text", stack(["upper", "lower", "others"].map((n) => cut("page_swap_" + n + ".png", buttonsPal, 0, 0, 24, 8))));
save("back-button", cut("back_button.png", buttonsPal, 0, 0, 40, 24));
save("ok-button", cut("ok_button.png", buttonsPal, 0, 0, 40, 24));
save("button-flash", stack([cut("page_swap_frame.png", null, 0, 0, 40, 32, 14), cut("back_button.png", null, 0, 0, 40, 24, 14), cut("ok_button.png", null, 0, 0, 40, 24, 14)]));
// The cursor's sheets are 0x80 bytes: the top 16x16 of each 16x24 picture.
const cursors = ["cursor", "cursor_squished", "cursor_filled"];
save("cursor", stack(cursors.map((n) => cut(n + ".png", cursorPal, 0, 0, 16, 16)), true));
save("cursor-flash", stack(cursors.map((n) => cut(n + ".png", null, 0, 0, 16, 16, 1)), true));
save("input-arrow", cut("input_arrow.png", pageOthersPal, 0, 0, 8, 8));
save("underscore", cut("underscore.png", pageOthersPal, 0, 0, 8, 8));

console.log("wrote assets/naming-screen/ (" + fs.readdirSync(out).length + " pictures)");
