// FireRed text helpers shared by the converters: read .inc text labels and
// turn GBA text into plain pages for the game.
"use strict";

const fs = require("fs");

// label:: followed by .string "..." lines -> { label: "raw text" }.
function parseTextFile(file, out) {
  let label = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const l = /^(\w+)::/.exec(line);
    if (l) { label = l[1]; out[label] = ""; continue; }
    const s = /^\s*\.string "(.*)"/.exec(line);
    if (s && label) out[label] += s[1];
  }
  return out;
}

// FireRed text -> pages of plain text. {PLAYER} and {RIVAL} stay for the game to fill in.
const KEEP_CAPS = new Set(["NES", "TV", "HP", "PP", "PC", "TM", "HM", "OK", "KO", "EXP", "ID", "SS", "HQ"]);
function cleanText(s) {
  s = s.replace(/\$$/, "")
    .replace(/POKéMON/g, "Pokémon").replace(/POKéDEX/g, "Pokédex").replace(/POKé BALLS/g, "Poké Balls").replace(/POKé BALL/g, "Poké Ball")
    .replace(/POKé MART/g, "Poké Mart").replace(/POKé/g, "Poké")
    .replace(/\{(?!PLAYER\}|RIVAL\})[A-Z_0-9 ]+\}/g, "");
  return s.split("\\p").map((page) => page.replace(/\\[nl]/g, "\n").replace(/ +\n/g, "\n").trim()
    // FireRed writes names in capitals (PROF. OAK, VIRIDIAN CITY, GYM); use normal case.
    .replace(/(?<!\{)\b[A-Z][A-Z'.]*[A-Z]\b(?!\})/g, (w) => KEEP_CAPS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).filter(Boolean);
}

module.exports = { parseTextFile, cleanText };
