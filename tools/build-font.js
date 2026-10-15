// Builds a web font from FireRed's text font (its "normal" font), so the
// game's text is in it:
//
//   node tools/build-font.js        (after tools/build-menus.js: it reads data/gba-menus.js)
//
// Writes assets/fonts/firered.otf. Each lit pixel of a glyph
// (graphics/fonts/latin_normal.png, colour 1) is a square, 64 units a pixel,
// 16 pixels to the em: so at a font size of 16 game pixels it's FireRed's text
// exactly, with FireRed's letter widths (src/text.c). The baseline is under
// row 10 of the 16x16 cell (descenders reach row 12). The shadow pixels
// (colour 2) are left out: the CSS draws FireRed's shadow (one pixel right
// and down) with text-shadow. Characters come from FireRed's charmap; ¥, its
// money sign, is the Pokédollar ₽ here too. Needs opentype.js (a devDependency).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const opentype = require("opentype.js");

const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/gba-menus.js"), "utf8"));
const { fonts, charmap } = window.GBA_MENUS;
const font = fonts.normal;

const PX = 64, EM = 16 * PX, BASELINE = 11;   // rows 0-10 above the baseline
const glyphFor = (code, unicode, name) => {
  const p = new opentype.Path();
  for (let y = 0; y < font.cellH; y++) {
    for (let x = 0; x < font.cellW; x++) {
      if (font.glyphs[code * font.cellW * font.cellH + y * font.cellW + x] !== "1") continue;
      // One square per pixel (y up from the baseline).
      const x0 = x * PX, x1 = x0 + PX, y1 = (BASELINE - y) * PX, y0 = y1 - PX;
      p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.close();
    }
  }
  return new opentype.Glyph({ name, unicode, advanceWidth: font.widths[code] * PX, path: p });
};

const glyphs = [new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: 6 * PX, path: new opentype.Path() })];
const done = new Set();
const add = (ch, code) => {
  const u = ch.codePointAt(0);
  if (done.has(u)) return;
  done.add(u);
  glyphs.push(glyphFor(code, u, "u" + u.toString(16).padStart(4, "0")));
};
for (const [ch, code] of Object.entries(charmap)) if ([...ch].length === 1) add(ch, code);
if (charmap["¥"] != null) add("₽", charmap["¥"]);   // the game's money sign

const out = new opentype.Font({
  familyName: "FireRed", styleName: "Regular", unitsPerEm: EM,
  ascender: BASELINE * PX, descender: -(16 - BASELINE) * PX, glyphs
});
fs.mkdirSync(path.join(root, "assets/fonts"), { recursive: true });
fs.writeFileSync(path.join(root, "assets/fonts/firered.otf"), Buffer.from(out.toArrayBuffer()));
console.log("wrote assets/fonts/firered.otf: " + glyphs.length + " glyphs");
