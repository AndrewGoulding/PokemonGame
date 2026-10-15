// Builds what FireRed's main menu (CONTINUE / NEW GAME) and Option screen are
// drawn with, from pret/pokefirered:
//
//   node tools/build-menus.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes data/gba-menus.js: window.GBA_MENUS = {
//   fonts:   { normal, small }: each { cellW, cellH, widths[256], glyphs }, the
//            glyphs being one character a pixel per character code (0-255),
//            cell after cell: "1" the letter, "2" its shadow, anything else
//            clear. From graphics/fonts/latin_{normal,small}.png and the width
//            tables in src/text.c.
//   charmap: text character -> character code (charmap.txt)
//   icons:   the button icons the help bar uses ({A_BUTTON} ...), 8x12 in
//            colour numbers of the window's palette (graphics/fonts/keypad_icons.png)
//   frames:  "std" and "type1".."type10": a window frame's 3x3 tiles (24x24,
//            colour numbers) and its palette (graphics/text_window/)
//   helpBar: the Start menu's help strip tiles (graphics/help_system/msg_window.png,
//            80x16: the top row is tile 0, the middle rows tile 5, the bottom tile 14)
//   battle:  the battle screen's bottom panel (graphics/battle_interface/textbox.png
//            and .bin): its tiles (128x128, colour numbers) and, as 30x6 tile
//            entries, the three panels FireRed scrolls between: "message",
//            "action" (What will … do? and FIGHT / BAG / POKéMON / RUN) and
//            "move" (the moves, PP and TYPE); palette 0 (textbox1.pal) and the
//            PP colours by how much is left (graphics/interface/text_pp.pal)
//   palettes: mainMenuBg, mainMenuTextbox (graphics/main_menu/), optionMenu
//            (graphics/misc/option_menu.pal), std0..std4 (text window palettes)
// }
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
for (const need of ["graphics/battle_interface/textbox.bin", "graphics/interface/text_pp.pal", "graphics/help_system/msg_window.png", "graphics/fonts/latin_normal.png", "src/text.c", "charmap.txt", "graphics/main_menu/bg.pal", "graphics/misc/option_menu.pal", "graphics/text_window/type1.png"]) {
  if (!pret || !fs.existsSync(P(need))) {
    console.error("Usage: node tools/build-menus.js <path to pret/pokefirered>  (needs " + need + ")");
    process.exit(1);
  }
}
const root = path.join(__dirname, "..");

// ---------- Fonts ----------

const textC = fs.readFileSync(P("src/text.c"), "utf8");
function widths(name) {
  const m = new RegExp(name + "\\[\\]\\s*=\\s*\\{([^}]*)\\}").exec(textC);
  return m[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number).slice(0, 256);
}
// A sheet of cellW x cellH glyphs, 256 / cellW to a row, glyph n at cell n.
function font(file, cellW, cellH, widthTable) {
  const img = readPng(P("graphics/fonts", file));
  const perRow = img.width / cellW;
  let glyphs = "";
  for (let n = 0; n < 256; n++) {
    const gx = (n % perRow) * cellW, gy = Math.floor(n / perRow) * cellH;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
      const v = gy + y < img.height ? img.px[(gy + y) * img.width + gx + x] : 0;
      glyphs += v === 1 || v === 2 ? v : 0;
    }
  }
  return { cellW, cellH, widths: widths(widthTable), glyphs };
}
const fonts = {
  normal: font("latin_normal.png", 16, 16, "sFontNormalLatinGlyphWidths"),
  small: font("latin_small.png", 8, 16, "sFontSmallLatinGlyphWidths")
};

// ---------- Character map ----------

const charmap = {};
for (const line of fs.readFileSync(P("charmap.txt"), "utf8").split("\n")) {
  const m = /^'(\\?.)'\s*=\s*([0-9A-F]{2})\s*$/.exec(line);
  if (!m) continue;
  const ch = m[1].length === 2 ? m[1][1] : m[1];
  if (!(ch in charmap)) charmap[ch] = parseInt(m[2], 16);
}

// ---------- Button icons (src/text.c sKeypadIcons: first 8x8 tile, 8 wide, 12 tall) ----------

const keypad = readPng(P("graphics/fonts/keypad_icons.png"));
const ICONS = { A_BUTTON: 0x0, B_BUTTON: 0x1, DPAD_UPDOWN: 0x20, DPAD_LEFTRIGHT: 0x21 };
const icons = {};
for (const [name, tile] of Object.entries(ICONS)) {
  const tx = (tile % 16) * 8, ty = Math.floor(tile / 16) * 8;
  let px = "";
  for (let y = 0; y < 12; y++) for (let x = 0; x < 8; x++) px += keypad.px[(ty + y) * keypad.width + tx + x].toString(16);
  icons[name] = { width: 8, height: 12, px };
}

// ---------- Window frames ----------

const frames = {};
for (const name of ["std"].concat([...Array(10).keys()].map((i) => "type" + (i + 1)))) {
  const img = readPng(P("graphics/text_window", name + ".png"));
  frames[name] = { px: Array.from(img.px, (v) => v.toString(16)).join(""), palette: img.palette.slice(0, 16) };
}

const helpImg = readPng(P("graphics/help_system/msg_window.png"));
const helpBar = { width: helpImg.width, px: Array.from(helpImg.px, (v) => v.toString(16)).join(""), palette: helpImg.palette.slice(0, 16) };

// ---------- The battle screen's bottom panel (src/battle_bg.c) ----------

const tbImg = readPng(P("graphics/battle_interface/textbox.png"));
const tbMap = fs.readFileSync(P("graphics/battle_interface/textbox.bin"));
const tbPal = readPal(P("graphics/battle_interface/textbox1.pal"));
const panelRows = (top) => { const out = []; for (let r = top; r < top + 6; r++) for (let c = 0; c < 30; c++) out.push(tbMap.readUInt16LE((r * 32 + c) * 2)); return out; };
const battle = {
  tilesWidth: tbImg.width, tiles: Array.from(tbImg.px, (v) => v.toString(16)).join(""),
  panels: { message: panelRows(14), action: panelRows(34), move: panelRows(54) },
  palette: tbPal, pp: readPal(P("graphics/interface/text_pp.pal")).slice(0, 8)
};
// The message panel as a picture too (it's all palette 0): the battle text box's background.
{
  const W = 240, H = 48, rgba = new Uint8ClampedArray(W * H * 4);
  battle.panels.message.forEach((e, i) => {
    const tile = e & 0x3ff, hf = e & 0x400, vf = e & 0x800;
    const sx = (tile % (tbImg.width / 8)) * 8, sy = Math.floor(tile / (tbImg.width / 8)) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = tbImg.px[(sy + (vf ? 7 - y : y)) * tbImg.width + sx + (hf ? 7 - x : x)];
      const c = tbPal[v], o = (((Math.floor(i / 30) * 8 + y) * W) + (i % 30) * 8 + x) * 4;
      rgba.set([c[0], c[1], c[2], 255], o);
    }
  });
  writePng(path.join(root, "assets/battle-interface/message-box.png"), W, H, rgba);
}

// ---------- Palettes ----------

const palettes = {
  mainMenuBg: readPal(P("graphics/main_menu/bg.pal")),
  mainMenuTextbox: readPal(P("graphics/main_menu/textbox.pal")),
  optionMenu: readPal(P("graphics/misc/option_menu.pal"))
};
for (let i = 0; i < 5; i++) palettes["std" + i] = readPal(P("graphics/text_window/stdpal_" + i + ".pal"));

fs.writeFileSync(path.join(root, "data/gba-menus.js"),
  "// Auto-generated by tools/build-menus.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.GBA_MENUS = " + JSON.stringify({ fonts, charmap, icons, frames, helpBar, battle, palettes }) + ";\n");
console.log("wrote data/gba-menus.js (" + Object.keys(charmap).length + " characters, " + Object.keys(frames).length + " frames)");
