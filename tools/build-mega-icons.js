// Mega Evolution's battle pictures, from pokeemerald-expansion
// (graphics/battle_interface/, each PNG in its own palette, as the expansion
// loads them: src/data/graphics/gimmicks.h):
//
//   node tools/build-mega-icons.js <path to pokeemerald-expansion>   (or set POKEEMERALD_EXPANSION)
//
// Writes assets/battle-interface/:
//   mega-indicator.png   the Mega symbol shown on a Mega Evolved Pokémon's
//                        healthbox in place of "Lv" (mega_indicator.png, 8x16)
//   mega-trigger.png     the trigger beside your healthbox while you choose a
//                        move: off, then on (mega_trigger.png, two 32x32 frames)
// and Terastallizing's (Gen 9):
//   tera-trigger.png     its trigger, the same way (tera_trigger.png)
//   tera-indicators.png  the Tera Type symbol on a Terastallized Pokémon's
//                        healthbox, 8x16 each in a row: Normal, Fighting, Flying,
//                        Poison, Ground, Rock, Bug, Ghost, Steel, Fire, Water,
//                        Grass, Electric, Psychic, Ice, Dragon, Dark, Fairy,
//                        Stellar (<type>_indicator.png, in tera_indicator.pal)
//   tera-crystal.png, tera-symbol.png, tera-shatter.png
//                        its animation's pictures (graphics/battle_anims/sprites/)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const src = process.argv[2] || process.env.POKEEMERALD_EXPANSION;
const P = (...p) => path.join(src || "", "graphics/battle_interface", ...p);
if (!src || !fs.existsSync(P("mega_indicator.png")) || !fs.existsSync(P("mega_trigger.png"))) {
  console.error("Usage: node tools/build-mega-icons.js <path to pokeemerald-expansion>  (needs graphics/battle_interface/)");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/battle-interface");
for (const [file, name] of [["mega_indicator.png", "mega-indicator.png"], ["mega_trigger.png", "mega-trigger.png"]]) {
  const img = readPng(P(file));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...img.palette[v], 255], i * 4); });   // (colour 0 clear)
  writePng(path.join(out, name), img.width, img.height, rgba);
}
const { readPal } = require("./lib/png");
const flat = (img, pal) => {
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...pal[v], 255], i * 4); });
  return rgba;
};
{
  const t = readPng(P("tera_trigger.png"));
  writePng(path.join(out, "tera-trigger.png"), t.width, t.height, flat(t, t.palette));
  const TYPES = ["normal", "fighting", "flying", "poison", "ground", "rock", "bug", "ghost", "steel", "fire", "water", "grass",
    "electric", "psychic", "ice", "dragon", "dark", "fairy", "stellar"];
  const pal = readPal(P("tera_indicator.pal"));
  const sheet = new Uint8ClampedArray(8 * TYPES.length * 16 * 4);
  TYPES.forEach((type, k) => {
    const img = readPng(P(type + "_indicator.png")), px = flat(img, pal);
    for (let y = 0; y < 16; y++) sheet.set(px.subarray(y * 8 * 4, (y + 1) * 8 * 4), (y * 8 * TYPES.length + k * 8) * 4);
  });
  writePng(path.join(out, "tera-indicators.png"), 8 * TYPES.length, 16, sheet);
  for (const name of ["tera_crystal", "tera_symbol", "tera_shatter"]) {
    const img = readPng(path.join(src, "graphics/battle_anims/sprites", name + ".png"));
    writePng(path.join(out, name.replace("_", "-") + ".png"), img.width, img.height, flat(img, img.palette));
  }
}
console.log("wrote assets/battle-interface/mega-indicator.png, mega-trigger.png, tera-trigger.png, tera-indicators.png and the Tera animation's pictures");
