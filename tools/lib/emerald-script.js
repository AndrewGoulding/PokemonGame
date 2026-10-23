// Pokémon Emerald's event scripts (a pret/pokeemerald checkout's data/maps/*/scripts.inc,
// data/scripts/*.inc and data/text/*.inc), read into plain data for ui/hoenn-script.js:
//
//   const S = require("./lib/emerald-script")(<path to pret/pokeemerald>);
//   const data = S.compile(["LittlerootTown", ...]);
//
// -> {
//   s:  { Label: [["msgbox", "Label", "MSGBOX_NPC"], ["end"], ...] }     scripts: each command and its arguments
//   t:  { Label: ["page", "page"] }                                     text, in pages (see tools/lib/text.js)
//   m:  { Label: ["walk_up", "walk_up", "face_down"] }                  movements, without their step_end
//   tb: { Label: [["VAR_X", "1", "Label"], ...] }                       .2byte tables (map_script_2's, a Mart's list)
//   ms: { Map_MapScripts: { ON_TRANSITION: "Label", ON_FRAME_TABLE: "Label", ...} }   each map's MapScripts table (its
//                                                                      ON_FRAME_TABLE and ON_WARP_INTO_MAP_TABLE labels are tb's:
//                                                                      rows of [var, value, label])
// }
// A map's own labels are all there is to its scripts: Emerald's labels are unique across the game.
"use strict";

const fs = require("fs");
const path = require("path");
const { cleanText } = require("./text");

module.exports = function emeraldScript(EM) {
  const P = (...p) => path.join(EM, ...p);

  // The movement commands (asm/macros/movement.inc): a label whose lines are these is a movement script.
  const MOVEMENTS = new Set();
  for (const m of fs.readFileSync(P("asm/macros/movement.inc"), "utf8").matchAll(/create_movement_action (\w+),/g)) MOVEMENTS.add(m[1]);
  MOVEMENTS.add("step_end");

  // Emerald's text: "\n" and "\l" line breaks, "\p" pages, {PLAYER} and friends. cleanText (FireRed's) keeps
  // {PLAYER}, {RIVAL} and {STR_VAR_n}; here the arrows and the rest of the control codes go too.
  const text = (raw) => cleanText(raw.replace(/\{(RIGHT|LEFT|UP|DOWN)_ARROW\}/g, "").replace(/\\\\/g, "\\")
    .replace(/POKéMON/g, "POKéMON")).map((p) => p.replace(/ +$/gm, ""));

  const strip = (line) => {
    // (A comment starts at an @, or a //, outside a string.)
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === "\\" && q) { i++; continue; }
      if (c === '"') q = !q;
      else if ((c === "@" || (c === "/" && line[i + 1] === "/")) && !q) return line.slice(0, i).trim();
    }
    return line.trim();
  };
  const num = (a) => (/^-?\d+$/.test(a) ? +a : /^0x[0-9a-f]+$/i.test(a) ? parseInt(a, 16) : a === "TRUE" ? 1 : a === "FALSE" ? 0 : a);
  const split = (rest) => {
    // (Commas outside parentheses and quotes.)
    const out = []; let depth = 0, cur = "";
    for (const c of rest) {
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (c === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };

  const out = { s: {}, t: {}, m: {}, tb: {}, ms: {}, lm: {} };   // (lm: which map a script label is from)
  function parseFile(file, mapName) {
    if (!fs.existsSync(file)) return;
    let label = null, lines = [], opened = null;
    // (A file's own constants, .set NAME, value: the Glass Workshop's prices, the Game Corner's.)
    const sets = {};
    const resolve = (a) => {
      for (let k = 0; k < 4 && sets[a] != null; k++) a = sets[a];
      return /^\(.*\)$/.test(a) ? a.replace(/\b[A-Z_][A-Z0-9_]*\b/g, (n) => resolve(n)) : a;   // (and in an expression: (BET_AMOUNT_5 * 2))
    };
    // (A script that runs off its end carries on into the label after it: Emerald's lobbies lean on that.)
    const TERMINAL = new Set(["end", "goto", "return", "returnram", "vgoto", "killscript", "endscript"]);
    const flush = () => {
      if (!label) return;
      const strings = lines.filter((l) => l.str !== undefined), rest = lines.filter((l) => l.str === undefined);
      if (strings.length && !rest.length) out.t[label] = text(strings.map((l) => l.str).join(""));
      else if (rest.length && rest.every((l) => l.cmd === "map_script" || l.cmd === ".byte")) {
        out.ms[label] = {};
        for (const l of rest) if (l.cmd === "map_script") out.ms[label][l.args[0].replace(/^MAP_SCRIPT_/, "")] = l.args[1];
      } else if (rest.length && rest.every((l) => l.cmd === "map_script_2" || l.cmd === ".2byte")) {
        out.tb[label] = rest.filter((l) => l.cmd === "map_script_2").map((l) => l.args.map(num));
      } else if (rest.length && rest.every((l) => l.cmd === ".2byte" || l.cmd === ".byte" || l.cmd === ".4byte")) {
        out.tb[label] = rest.filter((l) => l.cmd === ".2byte").map((l) => l.args.map(num));
      } else if (rest.length && rest.every((l) => MOVEMENTS.has(l.cmd))) {
        out.m[label] = rest.filter((l) => l.cmd !== "step_end").map((l) => l.cmd);
      } else if (rest.length) {
        out.s[label] = rest.filter((l) => !l.cmd.startsWith(".")).map((l) => [l.cmd].concat(l.args.map(num)));
        if (mapName) out.lm[label] = mapName;
        opened = label;
      }
      lines = [];
    };
    for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
      const l = strip(raw);
      if (!l) continue;
      const set = /^\.set\s+(\w+),\s*(\S+)$/.exec(l);
      if (set) { sets[set[1]] = set[2]; continue; }
      const lab = /^(\w+):(:?)$/.exec(l);
      if (lab) {
        flush();
        const prev = opened && out.s[opened];
        if (prev && prev.length && !TERMINAL.has(prev[prev.length - 1][0]) && out.s[opened] !== out.s[lab[1]]) prev.push(["goto", lab[1]]);
        label = lab[1]; opened = null; continue;
      }
      if (!label) continue;
      const s = /^\.string "(.*)"$/.exec(l);
      if (s) { lines.push({ str: s[1] }); continue; }
      const m = /^(\.?\w+)\s*(.*)$/.exec(l);
      if (!m) continue;
      lines.push({ cmd: m[1], args: split(m[2]).map(resolve) });
    }
    flush();
  }

  function compile(maps) {
    for (const m of maps) { parseFile(P("data/maps", m, "scripts.inc"), m); parseFile(P("data/maps", m, "text.inc"), m); }
    parseFile(P("data/event_scripts.s"), null);
    for (const dir of ["data/scripts", "data/text"]) {
      for (const f of fs.readdirSync(P(dir)).sort()) if (/\.inc$/.test(f)) parseFile(P(dir, f), null);
    }
    // (The common scripts with a map's name for a table's: tables keyed "#Label" belong to the map's script.)
    return out;
  }
  return { compile, MOVEMENTS, text };
};
