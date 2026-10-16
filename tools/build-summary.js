// Builds what FireRed's Pokémon Summary screen (src/pokemon_summary_screen.c)
// and Move Relearner (src/learn_move.c) are drawn with, from pret/pokefirered:
//
//   node tools/build-summary.js <path to pokefirered> <path to pokeemerald-expansion>
//   (or set POKEFIRERED and POKEEMERALD_EXPANSION)
//
// Writes data/summary-screen.js: window.SUMMARY_SCREEN = {
//   sheets: { <name>: { width, height, px, palette } }: indexed pictures, px
//            base64 of one byte a pixel (the PNG's colour index):
//            bg (graphics/summary_screen/bg.png: the screen's tiles, 8x8, 16 to
//            a row; its palette is the screen's 7 BG palettes), hpBar, expBar,
//            status (the status icons), shinyStar, pokerus, cursorLeft,
//            cursorRight (the move cursor), menuInfo (graphics/interface/
//            menu_info.png: type icons and the like; its "???" icon becomes a
//            Fairy icon, lettered as the expansion's graphics/types/fairy.png,
//            in FireRed's style), learnMove
//            (graphics/interface/learn_move.png), scrollArrows (graphics/
//            learn_move/interface_sprites.png: the list's ▼ and ▲, tiles 4-5 and 6-7),
//            categoryIcons (the expansion's graphics/interface/category_icons.png:
//            Physical, Special and Status, 16x16 each, as in Diamond and Pearl)
//   maps:    { <name>: [tile entries] }: the tilemaps (tile | hflip 0x400 |
//            vflip 0x800 | palette << 12), 32 wide: pageInfo, pageSkills,
//            pageMoves, pageMovesInfo, pageEgg, movesPage, movesInfoPage,
//            learnMove
//   pals:    { <name>: [16 colours] }: textHeader, textMoves, hpBarRed,
//            hpBarYellow, marking, cursor (graphics/summary_screen/*.pal),
//            types (graphics/interface/pokemon_types.pal)
//   moveText, abilityText: { <name>: "description\nin lines" }: FireRed's
//            (src/move_descriptions.c, src/data/text/abilities.h), and for moves
//            and abilities after Gen 3, pokeemerald-expansion's (src/data/
//            moves_info.h, src/data/abilities.h), which are written the same way
// }
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
if (!pret || !fs.existsSync(P("graphics/summary_screen/bg.png")) || !fs.existsSync(P("graphics/interface/learn_move.png"))) {
  console.error("Usage: node tools/build-summary.js <path to pret/pokefirered>  (needs graphics/summary_screen/ and graphics/interface/)");
  process.exit(1);
}
const expansion = process.argv[3] || process.env.POKEEMERALD_EXPANSION;
const X = (...p) => path.join(expansion || "", ...p);
if (!expansion || !fs.existsSync(X("src/data/moves_info.h"))) {
  console.error("...and the path to pokeemerald-expansion (needs src/data/moves_info.h, src/data/abilities.h)");
  process.exit(1);
}
const root = path.join(__dirname, "..");

const sheet = (file) => {
  const img = readPng(P("graphics", file));
  return { width: img.width, height: img.height, px: Buffer.from(img.px).toString("base64"), palette: img.palette };
};
const map = (file) => {
  const b = fs.readFileSync(P("graphics", file));
  return Array.from({ length: b.length / 2 }, (_, i) => b.readUInt16LE(i * 2));
};
const S = (f) => "summary_screen/" + f;

const data = {
  sheets: {
    bg: sheet(S("bg.png")), hpBar: sheet(S("hp_bar.png")), expBar: sheet(S("exp_bar.png")),
    status: sheet(S("status_ailment_icons.png")), shinyStar: sheet(S("shiny_star.png")), pokerus: sheet(S("pokerus_cured.png")),
    cursorLeft: sheet(S("move_selection_cursor_left.png")), cursorRight: sheet(S("move_selection_cursor_right.png")),
    menuInfo: sheet("interface/menu_info.png"), learnMove: sheet("interface/learn_move.png"),
    scrollArrows: sheet("learn_move/interface_sprites.png"),
    categoryIcons: (() => {
      const img = readPng(X("graphics/interface/category_icons.png"));
      return { width: img.width, height: img.height, px: Buffer.from(img.px).toString("base64"), palette: img.palette.slice(0, 16) };
    })()
  },
  maps: {
    pageInfo: map(S("page_info.bin")), pageSkills: map(S("page_skills.bin")), pageMoves: map(S("page_moves.bin")),
    pageMovesInfo: map(S("page_moves_info.bin")), pageEgg: map(S("page_egg.bin")),
    movesPage: map(S("moves_page.bin")), movesInfoPage: map(S("moves_info_page.bin")),
    learnMove: map("interface/learn_move.bin")
  },
  pals: {
    textHeader: readPal(P("graphics", S("text_header.pal"))), textMoves: readPal(P("graphics", S("text_moves.pal"))),
    hpBarRed: readPal(P("graphics", S("hp_bar_red.pal"))), hpBarYellow: readPal(P("graphics", S("hp_bar_yellow.pal"))),
    marking: readPal(P("graphics", S("marking.pal"))), cursor: readPal(P("graphics", S("move_selection_cursor.pal"))),
    types: readPal(P("graphics/interface/pokemon_types.pal"))
  }
};
// ---------- Descriptions ----------

const vm = require("vm");
global.window = global;
for (const f of ["data/moves.js", "data/moves-gen7.js", "data/abilities.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const strings = (body) => [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]).join("").replace(/\\n/g, "\n")
  .replace(/POKéMON/g, "Pokémon").replace(/\{PKMN\}/g, "Pokémon");
const byKey = (names) => Object.fromEntries(names.map((n) => [key(n), n]));
const ourMoves = byKey(Object.keys(window.MOVES)), ourAbilities = byKey(Object.keys(window.ABILITIES).map((k) => window.ABILITIES[k].name || k));
data.moveText = {}; data.abilityText = {};

// FireRed's: gMoveDescription_Pound = _("..."), named after the move.
const frMoves = fs.readFileSync(P("src/move_descriptions.c"), "utf8");
for (const [, name, body] of frMoves.matchAll(/const u8 gMoveDescription_(\w+)\[\] = _\(([\s\S]*?)\);/g)) {
  const ours = ourMoves[key(name)];
  if (ours) data.moveText[ours] = strings(body);
}
const frAbilities = fs.readFileSync(P("src/data/text/abilities.h"), "utf8");
for (const [, name, body] of frAbilities.matchAll(/static const u8 s(\w+)Description\[\] = _\(([\s\S]*?)\);/g)) {
  const ours = ourAbilities[key(name)];
  if (ours) data.abilityText[ours] = strings(body);
}
// The expansion's, for the rest: [MOVE_X] = { .name = ..., .description = COMPOUND_STRING(...) }.
const xMoves = fs.readFileSync(X("src/data/moves_info.h"), "utf8");
for (const block of xMoves.split(/\n    \[MOVE_/).slice(1)) {
  const name = /\.name = (?:COMPOUND_STRING|HANDLE_EXPANDED_MOVE_NAME|_)\("([^"]+)"/.exec(block);
  const desc = /\.description = COMPOUND_STRING\(([\s\S]*?)\),\n/.exec(block);
  const ours = name && ourMoves[key(name[1])];
  if (ours && desc && !data.moveText[ours]) data.moveText[ours] = strings(desc[1]);
}
const xAbilities = fs.readFileSync(X("src/data/abilities.h"), "utf8");
for (const block of xAbilities.split(/\n    \[ABILITY_/).slice(1)) {
  const name = /\.name = _\("([^"]+)"/.exec(block), desc = /\.description = COMPOUND_STRING\(([\s\S]*?)\),\n/.exec(block);
  const ours = name && ourAbilities[key(name[1])];
  if (ours && desc && !data.abilityText[ours]) data.abilityText[ours] = strings(desc[1]);
}

// Fairy, which FireRed hasn't got: its "???" icon (tile 0xA4, 32x12) redrawn in
// pink (pokemon_types.pal colour 12) with white letters and a dark shadow (15,
// 14), the letters from the expansion's 32x16 graphics/types/fairy.png (its
// rows 4-11; there 15 is a letter and 14 its shadow).
{
  const sh = data.sheets.menuInfo, px = Buffer.from(sh.px, "base64");
  const fairy = readPng(X("graphics/types/fairy.png"));
  const sx = (0xA4 % 16) * 8, sy = Math.floor(0xA4 / 16) * 8;
  for (let j = 0; j < 12; j++) for (let i = 0; i < 32; i++) {
    const corner = (j === 0 || j === 11) && (i === 0 || i === 31);
    const src = j >= 2 && j <= 9 ? fairy.px[(j + 2) * fairy.width + i] : 0;
    px[(sy + j) * sh.width + sx + i] = corner ? 0 : 0x10 | (src === 15 ? 15 : src === 14 ? 14 : 12);
  }
  sh.px = px.toString("base64");
}

fs.writeFileSync(path.join(root, "data/summary-screen.js"),
  "// Auto-generated by tools/build-summary.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.SUMMARY_SCREEN = " + JSON.stringify(data) + ";\n");
const noMove = Object.keys(window.MOVES).filter((m) => !data.moveText[m]);
const noAbility = Object.values(window.ABILITIES).map((a) => a.name).filter((a) => !data.abilityText[a]);
console.log("wrote data/summary-screen.js: " + Object.keys(data.sheets).length + " sheets, " + Object.keys(data.maps).length + " tilemaps, " +
  Object.keys(data.moveText).length + " move and " + Object.keys(data.abilityText).length + " ability descriptions" +
  (noMove.length ? "; no description for moves " + noMove.join(", ") : "") + (noAbility.length ? "; abilities " + noAbility.join(", ") : ""));
