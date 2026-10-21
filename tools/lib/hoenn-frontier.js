// The Battle Frontier's trainers and Pokémon (a pret/pokeemerald checkout's src/data/battle_frontier/*.h, the Easy
// Chat words their speeches are made of, include/constants/*), read into plain data for tools/build-hoenn.js and
// ui/hoenn-frontier.js:
//
//   const F = require("./lib/hoenn-frontier")(<path to pret/pokeemerald>, { species, move, item, trainerPic, cleanText });
//   F.data = {
//     heldItems: [item id | null]                 by BATTLE_FRONTIER_ITEM_*
//     mons:      [{ species, moves: [names], item (an index into heldItems), ev: bits, nature }]   by FRONTIER_MON_*
//     trainers:  [{ cls, pic, name, before: "", win: "", lose: "", set: [mon indexes] }]           by FRONTIER_TRAINER_*
//     tents:     { slateport: { mons: [...], trainers: [...] }, verdanturf: ..., fallarbor: ... }  the tents' own
//   }
// `ev` has Emerald's F_EV_SPREAD_* bits (hp 1, attack 2, defense 4, speed 8, sp. atk 16, sp. def 32).
"use strict";

const fs = require("fs");
const path = require("path");

module.exports = function hoennFrontier(EM, h) {
  const P = (...p) => path.join(EM, ...p);
  const read = (f) => fs.readFileSync(P(f), "utf8");

  // ---------- Easy Chat words: a speech is six of them ----------
  const words = {};
  {
    const text = {};
    const dir = P("src/data/easy_chat");
    const all = fs.readdirSync(dir).filter((f) => /^easy_chat_group_.*\.h$/.test(f)).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    for (const m of all.matchAll(/const u8 (gEasyChatWord_\w+)\[\] = _\("((?:[^"\\]|\\.)*)"\)/g)) text[m[1]] = m[2];
    for (const m of all.matchAll(/\[EC_INDEX\((EC_WORD_\w+)\)\]\s*=\s*\{\s*\.text = (\w+)/g)) if (text[m[2]] != null) words[m[1]] = text[m[2]];
  }
  const nice = (s) => String(s).replace(/POKéMON/g, "Pokémon").replace(/POKé/g, "Poké").toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b/g, "I").replace(/\bpokémon\b/g, "Pokémon").replace(/\bpoké/g, "Poké");
  const speech = (list) => {
    const out = [];
    for (const w of list.split(",").map((s) => s.trim()).filter(Boolean)) {
      let m;
      if (w === "-1" || w === "EC_EMPTY_WORD" || w === "0xFFFF") continue;
      if ((m = /^EC_(?:POKEMON2?|MOVE2?)\((\w+)\)$/.exec(w))) out.push(m[1].replace(/_/g, " "));
      else if (words[w] != null) out.push(words[w]);
    }
    // (Words as they are in Emerald, in capitals: "I AM NEVER GOING TO LOSE!" reads better in sentences.)
    return nice(out.join(" ").replace(/\s+([!?.,])/g, "$1").replace(/ELLIPSIS/g, "…")).replace(/ \.\.\./g, "…");
  };

  // ---------- Constants ----------
  const defines = {};
  for (const f of ["battle_frontier_mons.h", "battle_frontier_trainers.h", "battle_tent_mons.h", "battle_tent_trainers.h", "battle_frontier.h"]) {
    for (const m of read("include/constants/" + f).matchAll(/^#define (\w+)[ \t]+(\d+)/gm)) defines[m[1]] = +m[2];
  }
  const ITEMS = {};
  for (const m of read("include/constants/battle_frontier.h").matchAll(/^#define BATTLE_FRONTIER_ITEM_(\w+)[ \t]+(\d+)/gm)) ITEMS[m[1]] = +m[2];

  const heldItems = [];
  {
    const src = read("src/battle_tower.c"), at = src.indexOf("gBattleFrontierHeldItems[]"), body = src.slice(at, src.indexOf("};", at));
    for (const m of body.matchAll(/\[BATTLE_FRONTIER_ITEM_(\w+)\]\s*=\s*(ITEM_\w+)/g)) heldItems[ITEMS[m[1]]] = m[2] === "ITEM_NONE" ? null : h.item(m[2]);
  }

  // Mons: gBattleFrontierMons, and each tent's.
  function monTable(file, name) {
    const src = read(file), at = src.indexOf(name), out = [];
    if (at < 0) return out;
    const body = src.slice(at, src.indexOf("\n};", at));
    for (const m of body.matchAll(/\[(\w+)\] = \{([\s\S]*?)\n    \}/g)) {
      const b = m[2], g = (re) => (re.exec(b) || [])[1];
      const ev = (g(/\.evSpread = ([^,\n]+)/) || "").split("|").reduce((a, s) => a | (({ HP: 1, ATTACK: 2, DEFENSE: 4, SPEED: 8, SP_ATTACK: 16, SP_DEFENSE: 32 })[s.trim().replace(/^F_EV_SPREAD_/, "")] || 0), 0);
      out[defines[m[1]]] = {
        species: h.species(g(/\.species = (\w+)/)), moves: (g(/\.moves = \{([^}]*)\}/) || "").split(",").map((s) => s.trim()).filter((s) => s && s !== "MOVE_NONE").map(h.move).filter(Boolean),
        item: g(/\.itemTableId = BATTLE_FRONTIER_ITEM_(\w+)/) ? ITEMS[g(/\.itemTableId = BATTLE_FRONTIER_ITEM_(\w+)/)] : 0, ev, nature: (g(/\.nature = NATURE_(\w+)/) || "HARDY").toLowerCase().replace(/^./, (c) => c.toUpperCase())
      };
    }
    return out;
  }

  // Trainers: a table of them, with each one's list of Pokémon (some are macros: a run of FRONTIER_MON_* shared by several).
  function trainerTable(file, name, monPrefix, setSrc) {
    const src = read(file), at = src.indexOf(name), body = src.slice(at, src.indexOf("\n};", at));
    const macros = {};
    for (const m of setSrc.matchAll(/#define (FRONTIER_MONS_\w+)\s*\\\n((?:[^\n]*\\\n)*[^\n]*)/g)) macros[m[1]] = m[2].replace(/\\/g, "");
    const sets = {};
    for (const m of setSrc.matchAll(/const u16 (\w+)\[\]\s*=\s*\{([\s\S]*?)\};/g)) sets[m[1]] = m[2];
    const expand = (txt, depth) => {
      const out = [];
      for (const t of txt.split(",").map((s) => s.trim()).filter(Boolean)) {
        if (t === "-1") continue;
        if (macros[t] && depth < 6) out.push(...expand(macros[t], depth + 1));
        else if (defines[t] != null) out.push(defines[t]);
      }
      return out;
    };
    const out = [];
    for (const m of body.matchAll(/\[(\w+)\] = \{([\s\S]*?)\n    \}/g)) {
      const b = m[2], g = (re) => (re.exec(b) || [])[1], sp = (k) => speech((new RegExp("\\." + k + " = \\{([^}]*)\\}").exec(b) || [, ""])[1]);
      const cls = (g(/\.facilityClass = FACILITY_CLASS_(\w+)/) || "").toLowerCase(), set = g(/\.monSet = (\w+)/);
      out[defines[m[1]]] = {
        cls, name: (g(/\.trainerName = _\("([^"]*)"\)/) || "").replace(/^./, (c) => c) .toLowerCase().replace(/^./, (c) => c.toUpperCase()),
        before: sp("speechBefore"), win: sp("speechWin"), lose: sp("speechLose"), set: set && sets[set] ? [...new Set(expand(sets[set], 0))] : []
      };
    }
    return out;
  }

  const frontierMons = read("src/data/battle_frontier/battle_frontier_trainer_mons.h");
  const tentSrc = read("src/data/battle_frontier/battle_tent.h");
  const data = {
    heldItems,
    mons: monTable("src/data/battle_frontier/battle_frontier_mons.h", "gBattleFrontierMons"),
    trainers: trainerTable("src/data/battle_frontier/battle_frontier_trainers.h", "gBattleFrontierTrainers", "FRONTIER_MON_", frontierMons),
    tents: {}
  };
  for (const [key, label] of [["slateport", "Slateport"], ["verdanturf", "Verdanturf"], ["fallarbor", "Fallarbor"]]) {
    data.tents[key] = { mons: monTable("src/data/battle_frontier/battle_tent.h", "g" + label + "BattleTentMons"), trainers: trainerTable("src/data/battle_frontier/battle_tent.h", "g" + label + "BattleTentTrainers", label.toUpperCase() + "_TENT_MON_", tentSrc) };
  }
  // The facility classes' pictures.
  const picOf = {};
  for (const m of read("src/data/pokemon/trainer_class_lookups.h").matchAll(/\[FACILITY_CLASS_(\w+)\] = (TRAINER_PIC_\w+)/g)) picOf[m[1].toLowerCase()] = m[2];
  for (const t of [].concat(data.trainers, ...Object.values(data.tents).map((x) => x.trainers))) if (t) t.pic = h.trainerPic(picOf[t.cls]) || null;
  return { data, words };
};
