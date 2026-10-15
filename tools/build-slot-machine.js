// Builds the pictures FireRed's Celadon Game Corner slot machine (src/slot_machine.c)
// is drawn with, from pret/pokefirered (graphics/slot_machine/, the FireRed set):
//
//   node tools/build-slot-machine.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/slot-machine/:
//   bg.png             BG2: the machine (bg.png, bg.bin; sBg_Pal), 240x160, with
//                      the match lines in their normal palette (4) and the payout
//                      lights in palette 1. Colour 0 is clear: the reels (sprites
//                      behind BG2) and the backdrop show through.
//   lines.png          the five match lines (sLineTiles_*: TL-BR, top, middle,
//                      bottom, BL-TR) lit, in match_lines.pal (palettes 5 and 6),
//                      one 240x160 layer each, stacked (240x800)
//   lines-fixed.png    the same, only colours 2 and 4 (Task_FlashWinningLine keeps
//                      those bright while the rest of the line pulses), 240x800
//   lights.png         the payout lights (BG2's palette-1 tiles) in each of
//                      payout_lights.pal's three palettes, stacked (240x480)
//   button-pressed.png a pressed reel button (button_pressed.png, tiles 0xC0-0xC3
//                      in palette 0), 16x16
//   reel-icons.png     7 32x32 icons (7, Rocket, Pikachu, Psyduck, Cherries,
//                      Magnemite, Shellder), each in its sReelIconPaletteTags palette
//   clefairy.png       6 32x32 frames (clefairy.png)
//   digits.png         10 8x16 digits (digits.png)
//   combos.png         BG1: the payout table window (combos_window.*), 256x160
//   dpad-down.png      the {DPAD_DOWN} keypad icon (graphics/fonts/keypad_icons.png
//                      tile 0xD, 8x12) in the text window palette 2 (stdpal_2.pal)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
const S = (...p) => P("graphics/slot_machine", ...p);
if (!pret || !fs.existsSync(S("firered/bg.bin"))) {
  console.error("Usage: node tools/build-slot-machine.js <path to pret/pokefirered>  (needs graphics/slot_machine/, graphics/fonts/, graphics/text_window/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/slot-machine");
fs.mkdirSync(out, { recursive: true });
const save = (file, w, h, rgba) => writePng(path.join(out, file), w, h, rgba);
const pals16 = (colours) => { const r = []; for (let i = 0; i < colours.length; i += 16) r.push(colours.slice(i, i + 16)); return r; };

// Draws `cols` x `rows` tiles of a tilemap (u16 entries, `mapW` wide) from an
// indexed tile sheet (only the low 4 bits of a pixel are its colour).
// colour(pal, v, entryIndex) -> [r, g, b] or null (clear).
function renderMap(sheet, entries, mapW, cols, rows, colour, tileBase) {
  const w = cols * 8, h = rows * 8, rgba = new Uint8ClampedArray(w * h * 4), per = sheet.width / 8;
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const idx = ty * mapW + tx, e = entries[idx];
    if (e == null) continue;
    const tile = (e & 0x3ff) - (tileBase || 0), hf = e & 0x400, vf = e & 0x800, pal = e >> 12;
    if (tile < 0 || Math.floor(tile / per) * 8 >= sheet.height) continue;
    const sx = (tile % per) * 8, sy = Math.floor(tile / per) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = sheet.px[(sy + (vf ? 7 - y : y)) * sheet.width + sx + (hf ? 7 - x : x)] & 15;
      const c = colour(pal, v, idx);
      if (!c) continue;
      rgba.set([c[0], c[1], c[2], 255], ((ty * 8 + y) * w + tx * 8 + x) * 4);
    }
  }
  return { w, h, rgba };
}
const readMap = (file) => { const b = fs.readFileSync(file), a = []; for (let i = 0; i < b.length; i += 2) a.push(b.readUInt16LE(i)); return a; };
function stack(layers) {
  const w = layers[0].w, h = layers.reduce((s, l) => s + l.h, 0), rgba = new Uint8ClampedArray(w * h * 4);
  let y = 0;
  for (const l of layers) { rgba.set(l.rgba, y * w * 4); y += l.h; }
  return { w, h, rgba };
}

// ---------- BG2: the machine ----------
const bgSheet = readPng(S("firered/bg.png"));
const bgPal = pals16(bgSheet.palette);                    // sBg_Pal: palettes 0-4
const matchPal = readPal(S("firered/match_lines.pal"));   // palettes 5 (bet) and 6 (match)
const lightPals = pals16(readPal(S("firered/payout_lights.pal")));
const bgMap = readMap(S("firered/bg.bin"));
const ramColour = (pal, v) => (v ? (pal <= 4 ? bgPal[pal] : matchPal)[v] : null);

const bg = renderMap(bgSheet, bgMap, 32, 30, 20, ramColour);
save("bg.png", bg.w, bg.h, bg.rgba);

// The match lines (sLineStateTileIdxs order: TL-BR, top, middle, bottom, BL-TR).
const LINES = [
  [0x00a4, 0x00a5, 0x00a6, 0x00c4, 0x00c5, 0x00c6, 0x00c7, 0x00e7, 0x012c, 0x014c, 0x0191, 0x01b1, 0x01f6, 0x0216, 0x0217, 0x0218, 0x0219, 0x0237, 0x0238, 0x0239],
  [0x00e4, 0x00e5, 0x00e6, 0x00f7, 0x00f8, 0x00f9, 0x0104, 0x0105, 0x0106, 0x0107, 0x010c, 0x0111, 0x0116, 0x0117, 0x0118, 0x0119, 0x0124, 0x0125, 0x0126, 0x0137, 0x0138, 0x0139],
  [0x0144, 0x0145, 0x0146, 0x0157, 0x0158, 0x0159, 0x0164, 0x0165, 0x0166, 0x0167, 0x016c, 0x0171, 0x0176, 0x0177, 0x0178, 0x0179, 0x0184, 0x0185, 0x0186, 0x0197, 0x0198, 0x0199],
  [0x01a4, 0x01a5, 0x01a6, 0x01b7, 0x01b8, 0x01b9, 0x01c4, 0x01c5, 0x01c6, 0x01c7, 0x01cc, 0x01d1, 0x01d6, 0x01d7, 0x01d8, 0x01d9, 0x01e4, 0x01e5, 0x01e6, 0x01f7, 0x01f8, 0x01f9],
  [0x0204, 0x0205, 0x0206, 0x0224, 0x0225, 0x0226, 0x01e7, 0x0207, 0x018c, 0x01ac, 0x0131, 0x0151, 0x00d6, 0x00f6, 0x00b7, 0x00b8, 0x00b9, 0x00d7, 0x00d8, 0x00d9]
];
const lineLayer = (tiles, onlyFixed) => {
  const m = new Array(bgMap.length).fill(null);
  for (const t of tiles) m[t] = (bgMap[t] & 0x0fff) | (5 << 12);
  return renderMap(bgSheet, m, 32, 30, 20, (pal, v) => (v && (!onlyFixed || v === 2 || v === 4) ? matchPal[v] : null));
};
const lines = stack(LINES.map((t) => lineLayer(t, false)));
save("lines.png", lines.w, lines.h, lines.rgba);
const fixed = stack(LINES.map((t) => lineLayer(t, true)));
save("lines-fixed.png", fixed.w, fixed.h, fixed.rgba);

// The payout lights: BG2's palette-1 tiles, in each payout light palette.
const lightMap = bgMap.map((e) => (e >> 12 === 1 ? e : null));
const lights = stack(lightPals.map((pal) => renderMap(bgSheet, lightMap, 32, 30, 20, (p, v) => (v ? pal[v] : null))));
save("lights.png", lights.w, lights.h, lights.rgba);

// A pressed reel button: tiles 0xC0-0xC3 (button_pressed.png) in palette 0.
const btnSheet = readPng(S("firered/button_pressed.png"));
const btn = renderMap(btnSheet, [0, 1, 2, 3], 2, 2, 2, (p, v) => (v ? bgPal[0][v] : null));
save("button-pressed.png", btn.w, btn.h, btn.rgba);

// ---------- Sprites ----------
function sprite(file, dest, palFor) {
  const img = readPng(file), rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((raw, i) => {
    const v = raw & 15;
    if (!v) return;
    const pal = palFor(Math.floor(i / img.width), raw);
    rgba.set([...pal[v], 255], i * 4);
  });
  save(dest, img.width, img.height, rgba);
}
// sReelIconPaletteTags (FireRed): 7, Rocket, Cherries in 2; Pikachu, Psyduck in 0;
// Magnemite in 4; Shellder in 3.
const ICON_PAL = [2, 2, 0, 0, 2, 4, 3];
const iconPals = pals16(readPng(S("firered/reel_icons.png")).palette);
sprite(S("firered/reel_icons.png"), "reel-icons.png", (y) => iconPals[ICON_PAL[Math.floor(y / 32)]]);
const clef = readPng(S("firered/clefairy.png"));
sprite(S("firered/clefairy.png"), "clefairy.png", () => clef.palette);
const digits = readPng(S("digits.png"));
sprite(S("digits.png"), "digits.png", () => digits.palette);

// ---------- BG1: the combos window (sCombosWindow_Pal at palettes 7-9) ----------
const comboSheet = readPng(S("firered/combos_window.png"));
const comboPal = pals16(comboSheet.palette);
const combos = renderMap(comboSheet, readMap(S("firered/combos_window.bin")), 32, 32, 20,
  (pal, v) => (v && pal >= 7 && pal <= 9 ? comboPal[pal - 7][v] : null));
save("combos.png", combos.w, combos.h, combos.rgba);

// ---------- {DPAD_DOWN} (src/text.c sKeypadIcons: tile 0xD, 8x12) ----------
{
  const keypad = readPng(P("graphics/fonts/keypad_icons.png")), pal = readPal(P("graphics/text_window/stdpal_2.pal"));
  const tx = (0xD % 16) * 8, ty = Math.floor(0xD / 16) * 8, rgba = new Uint8ClampedArray(8 * 12 * 4);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) {
    const v = keypad.px[(ty + y) * keypad.width + tx + x] & 15;
    if (v) rgba.set([...pal[v], 255], (y * 8 + x) * 4);
  }
  save("dpad-down.png", 8, 12, rgba);
}
console.log("wrote assets/slot-machine/");
