// Builds what FireRed's main menu (CONTINUE / NEW GAME) and Option screen are
// drawn with, from pret/pokefirered:
//
//   node tools/build-menus.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes data/gba-menus.js: window.GBA_MENUS = {
//   fonts:   { normal, small }: each { cellW, cellH, widths[512], glyphs }, the
//            glyphs being one character a pixel per character code (0-511:
//            0x100 and up are FireRed's extra symbols, like 0x105, the "Lv"),
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
// It also writes assets/battle-interface/message-box.png (the battle's text
// box), assets/text/message-box.png (everywhere else's) and the ▼.
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
  return m[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number).slice(0, 512);
}
// A sheet of cellW x cellH glyphs, 256 / cellW to a row, glyph n at cell n.
// Codes 0x100 and up are the extra symbols ({LV_2}, written F9 05, is 0x105).
function font(file, cellW, cellH, widthTable) {
  const img = readPng(P("graphics/fonts", file));
  const perRow = img.width / cellW;
  let glyphs = "";
  for (let n = 0; n < 512; n++) {
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
const ICONS = { A_BUTTON: 0x0, B_BUTTON: 0x1, DPAD_LEFT: 0xE, DPAD_RIGHT: 0xF, DPAD_UPDOWN: 0x20, DPAD_LEFTRIGHT: 0x21 };
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

// ---------- The party summary bar (src/battle_interface.c, CreatePartyStatusSummarySprites) ----------
//
// In a trainer battle, a bar with a ball for each of a side's six slots:
// assets/battle-interface/party-bar.png (graphics/battle_interface/
// party_summary_bar.png, 128x8, in healthbox.pal) and party-balls.png (the
// four ball tiles, 66-69 of healthbox_elements.png, in healthbar.pal: a
// Pokémon, an empty slot, one with a status problem, a fainted one).
{
  const paint = (img, pal, sx, sy, w, h) => {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = img.px[(sy + y) * img.width + sx + x] & 15;
      if (v) rgba.set([...pal[v], 255], (y * w + x) * 4);
    }
    return rgba;
  };
  const bar = readPng(P("graphics/battle_interface/party_summary_bar.png"));
  writePng(path.join(root, "assets/battle-interface/party-bar.png"), 128, 8,
    paint(bar, readPal(P("graphics/battle_interface/healthbox.pal")), 0, 0, 128, 8));
  const el = readPng(P("graphics/battle_interface/healthbox_elements.png"));
  const perRow = el.width / 8, t = 66;
  const balls = new Uint8ClampedArray(32 * 8 * 4), pal = readPal(P("graphics/battle_interface/healthbar.pal"));
  for (let k = 0; k < 4; k++) {
    const tile = paint(el, pal, ((t + k) % perRow) * 8, Math.floor((t + k) / perRow) * 8, 8, 8);
    for (let y = 0; y < 8; y++) balls.set(tile.subarray(y * 32, y * 32 + 32), (y * 32 + k * 8) * 4);
  }
  writePng(path.join(root, "assets/battle-interface/party-balls.png"), 32, 8, balls);
}

// ---------- The text box's ▼ (src/text.c TextPrinterDrawDownArrow) ----------
//
// assets/text/down-arrow.png: the red arrow's three positions (10x12 each, side
// by side), from graphics/fonts/down_arrows.png at x 0, 16 and 32; FireRed
// shows them in the order 0, 1, 2, 1, eight frames each.
{
  const img = readPng(P("graphics/fonts/down_arrows.png"));
  const W = 30, H = 12, rgba = new Uint8ClampedArray(W * H * 4);
  for (let f = 0; f < 3; f++) for (let y = 0; y < H; y++) for (let x = 0; x < 10; x++) {
    const v = img.px[y * img.width + f * 16 + x];
    if (!v) continue;
    const c = img.palette[v];
    rgba.set([c[0], c[1], c[2], 255], (y * W + f * 10 + x) * 4);
  }
  fs.mkdirSync(path.join(root, "assets/text"), { recursive: true });
  writePng(path.join(root, "assets/text/down-arrow.png"), W, H, rgba);
}

// ---------- The field message box (src/new_menu_helpers.c, WindowFunc_DrawDialogueFrame) ----------
//
// assets/text/message-box.png, 240x48: what people, signs and every other
// message are written in. The window is tiles 2-27 of rows 15-18 (white,
// colour 1), framed with graphics/text_window/menu_message.png's tiles
// (0-13: two columns at each side, a row above and below, the bottom half
// the top's flipped) in text window palette 0. It's rows 14-19 of the screen.
{
  const img = readPng(P("graphics/text_window/menu_message.png"));
  const pal = readPal(P("graphics/text_window/stdpal_0.pal"));
  const W = 240, H = 48, rgba = new Uint8ClampedArray(W * H * 4);
  const tile = (t, tx, ty, vflip) => {
    const sx = (t % (img.width / 8)) * 8, sy = Math.floor(t / (img.width / 8)) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = img.px[(sy + (vflip ? 7 - y : y)) * img.width + sx + x] & 15;
      if (!v) continue;
      rgba.set([...pal[v], 255], ((ty * 8 + y) * W + tx * 8 + x) * 4);
    }
  };
  const left = 2, width = 26;   // (row 0 here is the screen's row 14)
  const row = (y, ts, vflip) => {
    tile(ts[0], left - 2, y, vflip); tile(ts[1], left - 1, y, vflip);
    if (ts[2] != null) for (let i = 0; i < width; i++) tile(ts[2], left + i, y, vflip);
    tile(ts[3], left + width, y, vflip); tile(ts[4], left + width + 1, y, vflip);
  };
  row(0, [0, 1, 2, 3, 4]);
  row(1, [5, 6, null, 8, 9]);
  row(2, [10, 11, null, 12, 13]);
  row(3, [10, 11, null, 12, 13], true);
  row(4, [5, 6, null, 8, 9], true);
  row(5, [0, 1, 2, 3, 4], true);
  for (let y = 8; y < 40; y++) for (let x = left * 8; x < (left + width) * 8; x++) rgba.set([...pal[1], 255], (y * W + x) * 4);
  writePng(path.join(root, "assets/text/message-box.png"), W, H, rgba);
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
