// Builds HeartGold's Voltorb Flip (Goldenrod's Game Corner: ui/voltorb-flip.js)
// pictures, and the Game Corner's prize menus, from a pret/pokeheartgold checkout:
//
//   node tools/build-voltorb-flip.js <path to pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes assets/voltorb-flip/ (from files/application/voltorb_flip: the NARC's
// tiles as pret keeps them, PNGs, with its NCLR palettes, NSCR screens, NCER
// cells; src/voltorb_flip/voltorb_flip.c says which is which):
//   board.png    the board, 240x160: HGSS's (BG0, voltorb_flip_00000004.NSCR on
//                the _00000002 tiles in palette _00000000) drawn smaller to fit
//                FireRed's screen: its 25 cards face down and its ten totals
//                cards, 26 pixels apart instead of 32, with the coloured lines
//                between them, and the panel on the right left empty (the
//                game's windows go there)
//   tiles.png    the board's tiles (_00000002), 32 to a row as HGSS numbers
//                them: the cards (face down 23; face up 0x14, 0x11, 0x0E, 0x0B
//                for 1, 2, 3 and Voltorb; turning 0x77 ... and 26), the totals'
//                digits (1-10, and 203 / 235 for the Voltorb counts) and the
//                memo marks (0x21-0x24)
//   sprites.png  the sprites (_00000011 tiles, _00000010 palettes, _00000012
//                cells): each cell drawn in a 96x96 square, 8 to a row, its
//                origin at the middle; cell 40 is cell 11 (the cursor) in
//                palette 4, as it's drawn while the Memo is open
// and tools/lib/johto-game-corner.generated.js: the menus HGSS's MenuInit opens
// (the Game Corner's prize counters, and the other maps' that use it), their
// items from the map's own messages (MenuItemAdd's numbers), as
// JOHTO_SCRIPTS.messages["menu:<zone>:<n>"] (ui/johto-script.js reads them).
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
const VF = (n, ext) => path.join(ROOT || "", "files/application/voltorb_flip", "voltorb_flip_" + String(n).padStart(8, "0") + "." + ext);
if (!ROOT || !fs.existsSync(VF(4, "NSCR"))) {
  console.error("Usage: node tools/build-voltorb-flip.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/voltorb-flip");
fs.mkdirSync(out, { recursive: true });
const save = (file, w, h, rgba) => writePng(path.join(out, file), w, h, rgba);

// ---------- Nitro files ----------
// NCLR: BGR555 colours (16 to a palette).
function readNclr(n) {
  const b = fs.readFileSync(VF(n, "NCLR")), s = 16;
  const size = b.readUInt32LE(s + 16), data = s + 8 + b.readUInt32LE(s + 20), cols = [];
  for (let i = 0; i < size / 2 && data + i * 2 + 1 < b.length; i++) {
    const c = b.readUInt16LE(data + i * 2);
    cols.push([c & 31, (c >> 5) & 31, (c >> 10) & 31].map((v) => (v * 255 / 31) | 0));
  }
  return cols;
}
// NSCR: a screen's tilemap (u16 entries, 32 tiles to a row).
function readNscr(n) {
  const b = fs.readFileSync(VF(n, "NSCR")), s = 16, size = b.readUInt32LE(s + 16), e = [];
  for (let i = 0; i < size / 2; i++) e.push(b.readUInt16LE(s + 20 + i * 2));
  return e;
}
// NCER: each cell's OAMs (1D mapping, 32 bytes a tile number).
const OAM_SIZES = [[[8, 8], [16, 16], [32, 32], [64, 64]], [[16, 8], [32, 8], [32, 16], [64, 32]], [[8, 16], [8, 32], [16, 32], [32, 64]]];
function readNcer(n) {
  const b = fs.readFileSync(VF(n, "NCER")), s = 16;
  const count = b.readUInt16LE(s + 8), ext = b.readUInt16LE(s + 10) === 1, data = s + 8 + b.readUInt32LE(s + 12);
  const esz = ext ? 16 : 8, oamBase = data + count * esz, cells = [];
  for (let i = 0; i < count; i++) {
    const e = data + i * esz, oams = [];
    for (let k = 0; k < b.readUInt16LE(e); k++) {
      const o = oamBase + b.readUInt32LE(e + 4) + k * 6, a0 = b.readUInt16LE(o), a1 = b.readUInt16LE(o + 2), a2 = b.readUInt16LE(o + 4);
      const [w, h] = OAM_SIZES[a0 >> 14][a1 >> 14];
      oams.push({ x: ((a1 & 0x1ff) << 23) >> 23, y: ((a0 & 0xff) << 24) >> 24, w, h, hf: (a1 >> 12) & 1, vf: (a1 >> 13) & 1, tile: a2 & 0x3ff, pal: a2 >> 12 });
    }
    cells.push(oams);
  }
  return cells;
}

// An RGBA image to draw into.
function image(w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  return {
    w, h, rgba,
    put(x, y, c) { if (c && x >= 0 && y >= 0 && x < w && y < h) rgba.set([c[0], c[1], c[2], 255], (y * w + x) * 4); },
    get(x, y) { const o = (y * w + x) * 4; return rgba[o + 3] ? [rgba[o], rgba[o + 1], rgba[o + 2]] : null; },
    fill(x0, y0, ww, hh, c) { for (let y = y0; y < y0 + hh; y++) for (let x = x0; x < x0 + ww; x++) this.put(x, y, c); }
  };
}
// One 8x8 tile of an indexed sheet (`per` tiles to a row), drawn at (dx, dy).
function drawTile(img, sheet, per, tile, dx, dy, pal, hf, vf) {
  const sx = (tile % per) * 8, sy = Math.floor(tile / per) * 8;
  if (sy >= sheet.height) return;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = sheet.px[(sy + (vf ? 7 - y : y)) * sheet.width + sx + (hf ? 7 - x : x)] & 15;
    if (v) img.put(dx + x, dy + y, pal[v]);
  }
}
const pals16 = (cols) => Array.from({ length: Math.ceil(cols.length / 16) }, (_, i) => cols.slice(i * 16, i * 16 + 16));

// ---------- The board ----------
const bgSheet = readPng(VF(2, "png")), bgPal = pals16(readNclr(0));
const screen = (entries) => {
  const img = image(256, 192);
  entries.slice(0, 32 * 24).forEach((e, i) => drawTile(img, bgSheet, 32, e & 0x3ff, (i % 32) * 8, Math.floor(i / 32) * 8, bgPal[e >> 12], e & 0x400, e & 0x800));
  return img;
};
const ds = screen(readNscr(4));
// (HGSS's cards are 32 pixels apart, the first at 8; here 26 apart, the first at 2.)
const PITCH = 26, ORIGIN = 2, DS_PITCH = 32, DS_ORIGIN = 8;
const board = image(240, 160);
const backdrop = ds.get(252, 188) || [24, 131, 98], frame = ds.get(DS_ORIGIN - 4, DS_ORIGIN - 4) || backdrop;
board.fill(0, 0, 240, 160, backdrop);
board.fill(0, 0, ORIGIN + 6 * PITCH, ORIGIN + 6 * PITCH, frame);
const copy = (sx, sy, w, h, dx, dy) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) board.put(dx + x, dy + y, ds.get(sx + x, sy + y)); };
for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
  if (r === 5 && c === 5) continue;
  const sx = DS_ORIGIN + c * DS_PITCH, sy = DS_ORIGIN + r * DS_PITCH, dx = ORIGIN + c * PITCH, dy = ORIGIN + r * PITCH;
  copy(sx, sy, 24, 24, dx, dy);
  // The lines between the cards: the middle of HGSS's, 2 pixels across.
  if (c < 5 && r < 5) copy(sx + 24 + 3, sy, PITCH - 24, 24, dx + 24, dy);
  if (r < 5 && c < 5) copy(sx, sy + 24 + 3, 24, PITCH - 24, dx, dy + 24);
}
save("board.png", board.w, board.h, board.rgba);

// The tiles, as a sheet.
const tiles = image(bgSheet.width, bgSheet.height);
for (let t = 0; t < (bgSheet.width / 8) * (bgSheet.height / 8); t++) drawTile(tiles, bgSheet, bgSheet.width / 8, t, (t % 32) * 8, Math.floor(t / 32) * 8, bgPal[0]);
save("tiles.png", tiles.w, tiles.h, tiles.rgba);

// ---------- The sprites ----------
const objSheet = readPng(VF(11, "png")), objPal = pals16(readNclr(10)), cells = readNcer(12);
const SLOT = 96, PER_ROW = 8;
const drawCell = (img, oams, ox, oy, palOverride) => {
  for (const o of oams) {
    const tw = o.w / 8, th = o.h / 8;
    for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
      const tile = o.tile + ty * tw + tx;
      const dx = o.x + (o.hf ? (tw - 1 - tx) : tx) * 8, dy = o.y + (o.vf ? (th - 1 - ty) : ty) * 8;
      // (Only what lands in the cell's square: the Memo's sliding frames, 32-36, run off it.)
      if (Math.abs(dx + 4) > SLOT / 2 || Math.abs(dy + 4) > SLOT / 2) continue;
      drawTile(img, objSheet, 1, tile, ox + dx, oy + dy, objPal[palOverride != null ? palOverride : o.pal], o.hf, o.vf);
    }
  }
};
const list = cells.map((c) => [c, null]).concat([[cells[11], 4]]);
const sprites = image(SLOT * PER_ROW, SLOT * Math.ceil(list.length / PER_ROW));
list.forEach(([oams, pal], i) => drawCell(sprites, oams, (i % PER_ROW) * SLOT + SLOT / 2, Math.floor(i / PER_ROW) * SLOT + SLOT / 2, pal));
save("sprites.png", sprites.w, sprites.h, sprites.rgba);

// ---------- MenuInit's menus ----------
// (Each map's scr_seq whose script opens one: MenuItemAdd's numbers, in the
// map's own messages, msg_NNNN_<zone>.json.)
const SCR = path.join(ROOT, "files/fielddata/script/scr_seq"), MSG = path.join(ROOT, "files/msgdata/msg");
const msgFiles = fs.readdirSync(MSG);
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(-])([a-zé])/g, (m, a, c) => a + c.toUpperCase()).replace(/\bTm\b/g, "TM").replace(/é/g, "é");
// (A menu item: one line; a second line, the price, right-aligned in the small font, as FireRed's prize menus have it.)
function menuText(t) {
  const lines = [].concat(t).join("").replace(/[’‘]/g, "'").split("\n");
  const cursor = /\{CURSOR_X \d+\}/;
  if (lines.length === 1 && cursor.test(lines[0])) {
    const [name, price] = lines[0].split(cursor);
    return titleCase(name) + "{CLEAR_TO 64}{FONT_SMALL}" + price.trim();
  }
  if (lines.length > 1) return titleCase(lines[0]) + "{CLEAR_TO 84}{FONT_SMALL}" + lines.slice(1).join(" ").trim();
  return titleCase(lines[0].replace(/\{[^}]*\}/g, "").trim());
}
const menus = {};
for (const f of fs.readdirSync(SCR).filter((x) => /^scr_seq_\d+_\w+\.s$/.test(x) && !/_hdr\.s$/.test(x)).sort()) {
  const src = fs.readFileSync(path.join(SCR, f), "utf8");
  if (!/^\s*MenuInit\b/m.test(src)) continue;
  const zone = /^scr_seq_\d+_(\w+)\.s$/.exec(f)[1];
  const file = msgFiles.find((m) => new RegExp("^msg_\\d+_" + zone + "\\.json$").test(m));
  if (!file) continue;
  const msgs = JSON.parse(fs.readFileSync(path.join(MSG, file), "utf8")).messages;
  let inMenu = false;
  for (const line of src.split("\n")) {
    const op = line.trim().split(/\s+/)[0];
    if (op === "MenuInit") inMenu = true;
    else if (op === "MenuInitStdGmm" || op === "MenuExec") inMenu = false;
    else if (inMenu && op === "MenuItemAdd") {
      const n = +line.trim().split(/[\s,]+/)[1];
      if (msgs[n] && msgs[n].en_US != null) menus["menu:" + zone + ":" + n] = [menuText(msgs[n].en_US)];
    }
  }
}
fs.writeFileSync(path.join(__dirname, "lib/johto-game-corner.generated.js"),
  "// The menus HGSS's MenuInit opens (tools/build-voltorb-flip.js, from pret/pokeheartgold): the Game Corner's prize counters and the rest.\n" +
  "Object.assign(window.JOHTO_SCRIPTS.messages, " + JSON.stringify(menus) + ");\n");
console.log("assets/voltorb-flip: board.png, tiles.png, sprites.png; tools/lib/johto-game-corner.generated.js: " + Object.keys(menus).length + " menu items");
