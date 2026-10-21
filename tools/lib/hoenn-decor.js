// Emerald's decorations (a pret/pokeemerald checkout's src/data/decoration/*.h, include/constants/decorations.h), read into
// plain data for tools/build-hoenn.js and ui/hoenn-decor.js:
//
//   const D = require("./lib/hoenn-decor")(<path to pret/pokeemerald>, metatileIds, objectGfxName);
//   D.list  // [{ id, key: "SMALL_DESK", name, perm, shape, w, h, cat, price, desc: [lines], tiles: [metatile id | picture name] }]
//
// perm: "solid" (a floor decoration you can't walk through), "pass" (a mat, walked over), "behind" (one that stands in front
// of the wall), "wall" (a poster), "sprite" (a doll or cushion: a picture on the spot that holds it). cat: 0 desks, 1 chairs,
// 2 plants, 3 ornaments, 4 mats, 5 posters, 6 dolls, 7 cushions. Tiles are in rows, top row first, as the decoration's shape.
"use strict";

const fs = require("fs");
const path = require("path");

const CATEGORIES = ["DESK", "CHAIR", "PLANT", "ORNAMENT", "MAT", "POSTER", "DOLL", "CUSHION"];
const SHAPES = { "1x1": [1, 1], "2x1": [2, 1], "3x1": [3, 1], "4x2": [4, 2], "2x2": [2, 2], "1x2": [1, 2], "1x3": [1, 3], "2x4": [2, 4], "3x3": [3, 3], "3x2": [3, 2] };
const PERMS = { SOLID_FLOOR: "solid", PASS_FLOOR: "pass", BEHIND_FLOOR: "behind", NA_WALL: "wall", SPRITE: "sprite" };

module.exports = function hoennDecor(EM, metatileIds, gfxName) {
  const P = (...p) => path.join(EM, ...p);
  const title = (s) => String(s).toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bPok[eé]mon\b/i, "Pokémon").replace(/\bPok[eé]\b/g, "Poké");
  const header = fs.readFileSync(P("src/data/decoration/header.h"), "utf8");
  const descs = {};
  for (const m of fs.readFileSync(P("src/data/decoration/description.h"), "utf8").matchAll(/const u8 (DecorDesc_\w+)\[\] = _\(([\s\S]*?)\);/g)) {
    descs[m[1]] = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]).join("").replace(/\\n/g, "\n").split("\n").map((s) => s.replace(/POKé/g, "Poké"));
  }
  const tiles = {};
  for (const m of fs.readFileSync(P("src/data/decoration/tiles.h"), "utf8").matchAll(/const u16 (DecorGfx_\w+)\[\] = \{([\s\S]*?)\};/g)) {
    tiles[m[1]] = m[2].split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const t = /^DECOR_TILE\((\w+)\)$/.exec(s);
      if (t) return metatileIds["METATILE_SecretBase_" + t[1]];
      return gfxName ? gfxName(s) : s;
    });
  }
  const list = [];
  for (const m of header.matchAll(/\[(DECOR_\w+)\] =\s*\{([\s\S]*?)\n    \},?/g)) {
    const key = m[1].replace(/^DECOR_/, ""), b = m[2], g = (re) => (re.exec(b) || [])[1];
    if (key === "NONE") continue;
    const shape = g(/\.shape = DECORSHAPE_(\w+)/), [w, h] = SHAPES[shape] || [1, 1];
    list.push({
      id: list.length + 1, key, name: title((g(/\.name = _\("([^"]*)"\)/) || key).replace(/POKé/g, "Poké")),
      perm: PERMS[g(/\.permission = DECORPERM_(\w+)/)], shape, w, h, cat: CATEGORIES.indexOf(g(/\.category = DECORCAT_(\w+)/)), price: +g(/\.price = (\d+)/),
      desc: descs[g(/\.description = (\w+)/)] || [], tiles: tiles[g(/\.tiles = (\w+)/)] || []
    });
  }
  return { list, CATEGORIES: CATEGORIES.map(title) };
};
