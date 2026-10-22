// Emerald's Pokémon Contests (a pret/pokeemerald checkout's src/data/contest_opponents.h, contest_moves.h, include/constants/contest.h),
// read into plain data for tools/build-hoenn.js and ui/hoenn-contest.js:
//
//   const C = require("./lib/hoenn-contest")(<path to pret/pokeemerald>, { species, move });
//   C.opponents  // [{ species, nick, trainer, gfx, rank (0 Normal .. 3 Master), pools: [cool, beauty, cute, smart, tough] (booleans),
//                //    filter ("none" | "no_postgame" | "only_postgame"), moves: [names], stats: { cool, beauty, cute, smart, tough, sheen } }]
//   C.moves      // { "Move": { effect: n, cat: 0-4, starter: n, combos: [n] } }   (the contest side of a move)
//   C.effects    // [{ name, type, appeal, jam }]   by effect number
"use strict";

const fs = require("fs");
const path = require("path");

module.exports = function hoennContest(EM, h) {
  const read = (f) => fs.readFileSync(path.join(EM, f), "utf8");
  const defines = {};
  for (const m of read("include/constants/contest.h").matchAll(/^#define (\w+)[ \t]+(\d+)/gm)) defines[m[1]] = +m[2];

  const text = read("src/data/contest_opponents.h"), enumBody = /enum \{([\s\S]*?)\};/.exec(text)[1];
  const order = [...enumBody.matchAll(/CONTEST_OPPONENT_(\w+)/g)].map((m) => m[1]).filter((n) => n !== "COUNT");
  const nice = (s) => s.toLowerCase().replace(/^./, (c) => c.toUpperCase());
  const opponents = [];
  const at = text.indexOf("gContestOpponents[]"), body = text.slice(at, text.indexOf("\n};", at));
  for (const m of body.matchAll(/\[CONTEST_OPPONENT_(\w+)\] = \{([\s\S]*?)\n    \},/g)) {
    const b = m[2], g = (re) => (re.exec(b) || [])[1];
    const i = order.indexOf(m[1]);
    opponents[i] = {
      species: h.species(g(/\.species = (\w+)/)), nick: nice(g(/\.nickname = _\("([^"]*)"\)/) || ""), trainer: nice(g(/\.trainerName = _\("([^"]*)"\)/) || ""),
      gfx: g(/\.trainerGfxId = (\w+)/), rank: defines[g(/\.whichRank = (\w+)/)] || 0,
      pools: ["Cool", "Beauty", "Cute", "Smart", "Tough"].map((c) => g(new RegExp("\\.aiPool_" + c + " = (\\w+)")) === "TRUE"),
      moves: (g(/\.moves =\s*\{([^}]*)\}/) || "").split(",").map((s) => s.trim()).filter(Boolean).map(h.move),
      stats: Object.fromEntries(["cool", "beauty", "cute", "smart", "tough", "sheen"].map((k) => [k, +g(new RegExp("\\." + k + " = (\\d+)")) || 0]))
    };
  }
  // (Whether they come only before or after the game's cleared.)
  const fat = text.indexOf("gPostgameContestOpponentFilter[]"), fbody = text.slice(fat, text.indexOf("};", fat));
  for (const m of fbody.matchAll(/\[CONTEST_OPPONENT_(\w+)\] = CONTEST_FILTER_(\w+)/g)) { const o = opponents[order.indexOf(m[1])]; if (o) o.filter = m[2].toLowerCase(); }
  for (const o of opponents) if (o && !o.filter) o.filter = "none";

  const mtext = read("src/data/contest_moves.h");
  const effectNames = [...mtext.matchAll(/\[CONTEST_EFFECT_(\w+)\] =\s*\{\s*\.effectType = CONTEST_EFFECT_TYPE_(\w+),\s*\.appeal = (\d+),\s*\.jam = (\d+)/g)];
  const consts = {};
  for (const m of read("include/constants/contest.h").matchAll(/^#define CONTEST_EFFECT_(\w+)\s+(\d+)/gm)) if (!/^TYPE_/.test(m[1])) consts[m[1]] = +m[2];
  const TYPES = ["APPEAL", "AVOID_STARTLE", "STARTLE_MON", "STARTLE_MONS", "WORSEN", "SPECIAL_APPEAL", "TURN_ORDER"];
  const effects = [];
  for (const m of effectNames) effects[consts[m[1]]] = { name: nice(m[1].replace(/_/g, " ")), type: TYPES.indexOf(m[2]), appeal: +m[3], jam: +m[4] };
  const moves = {};
  const mat = mtext.indexOf("gContestMoves[MOVES_COUNT]"), mbody = mtext.slice(mat, mtext.indexOf("const struct ContestEffect gContestEffects"));
  for (const m of mbody.matchAll(/\[MOVE_(\w+)\] =\s*\{\s*\.effect = CONTEST_EFFECT_(\w+),\s*\.contestCategory = CONTEST_CATEGORY_(\w+),\s*\.comboStarterId = (\w+),\s*\.comboMoves = \{([^}]*)\}/g)) {
    const name = h.move("MOVE_" + m[1]);
    if (!name) continue;
    const id = (x) => (/^\d+$/.test(x) ? +x : defines[x] || 0);
    moves[name] = { effect: consts[m[2]], cat: ["COOL", "BEAUTY", "CUTE", "SMART", "TOUGH"].indexOf(m[3]), starter: id(m[4]), combos: m[5].split(",").map((s) => s.trim()).filter(Boolean).map(id).filter(Boolean) };
  }
  return { opponents, moves, effects };
};
