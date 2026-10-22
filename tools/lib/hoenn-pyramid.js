// The Battle Pyramid's floors (a pret/pokeemerald checkout's src/battle_pyramid.c, its wild Pokémon headers and the
// BattlePyramidSquare layouts), read into plain data for tools/build-hoenn.js and ui/hoenn-frontier.js:
//
//   const Y = require("./lib/hoenn-pyramid")(<path to pret/pokeemerald>, { species, move, item });
//   Y = { templates: [{ items, trainers, run, offsets: [8] }], options: [[upTo, template]] (35 of them), optionStart: [per floor],
//         pickups50: [20 rounds][10 items], pickupsOpen, slots: [[upTo, index]], slotStart: [per floor],
//         wild50: [20 rounds][{ species, lvl, ability, moves }], wildOpen, prizeShort: [item], prizeLong: [item],
//         squares: [16][64 { m: metatile, c: collision }]   (the plain floor first, then BattlePyramidSquare01..16 as 1..16) }
"use strict";

const fs = require("fs");
const path = require("path");

module.exports = function hoennPyramid(EM, h) {
  const read = (f) => fs.readFileSync(path.join(EM, f), "utf8");
  const c = read("src/battle_pyramid.c");
  const body = (name) => { const at = c.indexOf(name); return c.slice(at, c.indexOf("};", at)); };

  const templates = [];
  for (const m of body("sPyramidFloorTemplates[]").matchAll(/\{\s*\.numItems = (\d+),\s*\.numTrainers = (\d+),[\s\S]*?\.runMultiplier = (\d+),\s*\.layoutOffsets = \{([^}]*)\}/g)) {
    templates.push({ items: +m[1], trainers: +m[2], run: +m[3], offsets: m[4].split(",").map((s) => +s.trim()) });
  }
  const pairs = (name) => [...body(name).matchAll(/\{\s*(\d+),\s*(\d+)\}/g)].map((m) => [+m[1], +m[2]]);
  const nums = (name) => ((/\{([^}]*)\}/.exec(c.slice(c.indexOf(name))) || [])[1] || "").split(",").map((s) => +s.trim()).filter((n) => !isNaN(n));
  const items = (name) => [...body(name).matchAll(/\{([^{}]*ITEM_[^{}]*)\}/g)].map((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean).map(h.item));
  const list = (name) => ((/\{([^}]*)\}/.exec(c.slice(c.indexOf(name))) || [])[1] || "").split(",").map((s) => s.trim()).filter(Boolean).map(h.item);

  function wild(file, prefix) {
    const text = read("src/data/battle_frontier/" + file), rounds = [];
    for (const m of text.matchAll(new RegExp("static const struct PyramidWildMon " + prefix + "_Round(\\d+)\\[\\] =\\s*\\{([\\s\\S]*?)\\n\\};", "g"))) {
      const mons = [];
      for (const e of m[2].matchAll(/\.species = (\w+),\s*\.lvl = (\d+),\s*\.abilityNum = (\w+),\s*\.moves = \{([^}]*)\}/g)) {
        mons.push({ species: h.species(e[1]), lvl: +e[2], ability: e[3] === "ABILITY_RANDOM" ? 2 : +e[3], moves: e[4].split(",").map((s) => s.trim()).filter((s) => s && s !== "MOVE_NONE").map(h.move).filter(Boolean) });
      }
      rounds[+m[1] - 1] = mons;
    }
    return rounds;
  }

  const squares = [];
  const layout = (dir) => {
    const bin = fs.readFileSync(path.join(EM, "data/layouts", dir, "map.bin"));
    return Array.from({ length: 64 }, (_, i) => { const v = bin.readUInt16LE(i * 2); return { m: v & 0x3ff, c: (v >> 10) & 3 ? 1 : 0 }; });
  };
  squares.push(layout("BattleFrontier_BattlePyramidFloor"));
  for (let i = 1; i <= 16; i++) squares.push(layout("BattlePyramidSquare" + String(i).padStart(2, "0")));

  return {
    templates, options: pairs("sPyramidFloorTemplateOptions"), optionStart: nums("sFloorTemplateOffsets"),
    pickups50: items("sPickupItemsLvl50"), pickupsOpen: items("sPickupItemsLvlOpen"),
    slots: pairs("sPickupItemSlots"), slotStart: nums("sPickupItemOffsets"),
    wild50: wild("battle_pyramid_level_50_wild_mons.h", "sLevel50WildMons"), wildOpen: wild("battle_pyramid_open_level_wild_mons.h", "sOpenLevelWildMons"),
    prizeShort: list("sShortStreakRewardItems"), prizeLong: list("sLongStreakRewardItems"), squares
  };
};
