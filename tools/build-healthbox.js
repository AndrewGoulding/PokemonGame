// Builds the pictures FireRed's battle healthboxes (src/battle_interface.c)
// are drawn with, from pret/pokefirered:
//
//   node tools/build-healthbox.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/battle-interface/:
//   healthbox-player.png     the player's box, its two 64x64 sprites side by
//                            side (healthbox_singles_player.png's tiles 0-63 and
//                            64-127, 1D-mapped), in healthbox.pal, 128x64
//   healthbox-opponent.png   the opponent's, 64x32 twice, 128x32
//   healthbox-safari.png     the player's in the Safari Zone (healthbox_safari.png,
//                            tiles 0-63 and 64-127), 128x64
//   healthbox-doubles-player.png / healthbox-doubles-opponent.png
//                            the smaller boxes of a double battle (healthbox_doubles_*.png:
//                            two 64x32 sprites, tiles 0-31 and 32-63), 128x32
//   healthbox-*-frame.png    just the box's colour 6 (its dark frame), in the
//                            level-up flash's colour, RGB(20, 27, 31)
//   healthbar.png            healthbox_elements.png in healthbar.pal (the "HP"
//                            label, the HP bar's tiles, the caught ball), 320x24
//   healthbox-elements.png   the same in healthbox.pal (the EXP bar's tiles)
//   status-icons.png         the status icons, 24x8 each, a row each in
//                            FireRed's order (PSN, PAR, SLP, FRZ, BRN), coloured
//                            as sStatusIconColors: the player's (tiles 21-35,
//                            colour 12) then the opponent's (71-85, colour 13), 24x80
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", "graphics/battle_interface", ...p);
if (!pret || !fs.existsSync(P("healthbox_singles_player.png")) || !fs.existsSync(P("healthbox_elements.png"))) {
  console.error("Usage: node tools/build-healthbox.js <path to pret/pokefirered>  (needs graphics/battle_interface/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/battle-interface");
fs.mkdirSync(out, { recursive: true });

const boxPal = readPal(P("healthbox.pal")), barPal = readPal(P("healthbar.pal"));
const FLASH = [20 * 8 + 4, 27 * 8 + 3, 31 * 8 + 7];   // RGB(20, 27, 31)

// Tile `i` of a sheet PNG (16 or 40 tiles to a row): its 64 colour numbers.
function tileOf(img, i) {
  const per = img.width / 8, sx = (i % per) * 8, sy = Math.floor(i / per) * 8, t = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) t.push(img.px[(sy + y) * img.width + sx + x] & 15);
  return t;
}
// A box: two sprites, `w` tiles wide and `h` high, the second from tile `other`.
function box(file, h, other, name, noFrame) {
  const img = readPng(P(file)), W = 128, H = h * 8;
  const rgba = new Uint8ClampedArray(W * H * 4), frame = new Uint8ClampedArray(W * H * 4);
  for (let half = 0; half < 2; half++) {
    for (let r = 0; r < h; r++) for (let c = 0; c < 8; c++) {
      const t = tileOf(img, (half ? other : 0) + r * 8 + c);
      t.forEach((v, k) => {
        if (!v) return;
        const o = ((r * 8 + Math.floor(k / 8)) * W + half * 64 + c * 8 + (k % 8)) * 4;
        rgba.set([...boxPal[v], 255], o);
        if (v === 6) frame.set([...FLASH, 255], o);
      });
    }
  }
  writePng(path.join(out, "healthbox-" + name + ".png"), W, H, rgba);
  if (!noFrame) writePng(path.join(out, "healthbox-" + name + "-frame.png"), W, H, frame);
}
box("healthbox_singles_player.png", 8, 64, "player");
box("healthbox_singles_opponent.png", 4, 32, "opponent");
box("healthbox_safari.png", 8, 64, "safari", true);
box("healthbox_doubles_player.png", 4, 32, "doubles-player");
box("healthbox_doubles_opponent.png", 4, 32, "doubles-opponent");

// The elements sheet, whole, in each palette (colour 0 clear).
const el = readPng(P("healthbox_elements.png"));
function sheet(pal, file) {
  const rgba = new Uint8ClampedArray(el.width * el.height * 4);
  el.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...pal[v], 255], i * 4); });
  writePng(path.join(out, file), el.width, el.height, rgba);
}
sheet(barPal, "healthbar.png");
sheet(boxPal, "healthbox-elements.png");

// Status icons: 3 tiles each; colour 12 (player) / 13 (opponent) is the
// status's (sStatusIconColors: PSN, PAR, SLP, FRZ, BRN, as RGB5).
const STATUS_RGB5 = [[24, 12, 24], [23, 23, 3], [20, 20, 17], [17, 22, 28], [28, 14, 10]];
{
  const W = 24, H = 80, rgba = new Uint8ClampedArray(W * H * 4);
  for (let side = 0; side < 2; side++) for (let s = 0; s < 5; s++) {
    const pal = boxPal.slice();
    pal[12 + side] = STATUS_RGB5[s].map((c) => (c << 3) | (c >> 2));
    for (let k = 0; k < 3; k++) {
      tileOf(el, (side ? 71 : 21) + s * 3 + k).forEach((v, i) => {
        if (v) rgba.set([...pal[v], 255], (((side * 5 + s) * 8 + Math.floor(i / 8)) * W + k * 8 + (i % 8)) * 4);
      });
    }
  }
  writePng(path.join(out, "status-icons.png"), W, H, rgba);
}
console.log("wrote assets/battle-interface/healthbox-*.png, healthbar.png, status-icons.png");
