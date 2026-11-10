// Pokémon Colosseum's words (assets/text/colosseum.json) as this game's message pages, for writing Orre's story:
// a string's pages (Colosseum's page breaks) wrapped to the message box (37 characters a line, three lines a page),
// its all-capitals names in ordinary case (MIROR B. as Miror B., POKéMON as Pokémon), its speaker named, Rui for
// {partner} and you for {player}.
//
//   node tools/colosseum-say.js <table> <id> [speaker]   // e.g. M1_houseA_1F/M1_houseA_1F 20246 Folly
//   node tools/colosseum-say.js --find <text>              // where a line is: table, id and the line
//   node tools/colosseum-say.js --xd …                     // the same from Pokémon XD's words (assets/text/xd.json)
//
// In code: require("./colosseum-say").pages(text, speaker) -> ["…\n…", …]
"use strict";

const path = require("path");

const KEEP = new Set(["TV", "OK", "PC", "HP", "PP", "TM", "HM", "PDA", "ID", "EXP", "KO", "SP", "UFO", "DNA", "P★DA"]);
const WORDS = { "POKéMON": "Pokémon", "POKéBALL": "Poké Ball", "POKé": "Poké", "MIROR": "Miror", "ES": "Es", "PRE": "Pre", "B.": "B." };

function caseWord(w) {
  if (w.includes("{")) return w;
  const m = w.match(/^([^A-Za-zé★]*)([A-Za-zé★.\-]+?)((?:'s)?[^A-Za-zé★]*)$/);
  if (!m) return w;
  const [, pre, core, post] = m;
  if (!/[A-Z]/.test(core) || /[a-z]/.test(core.replace(/é/g, "")) || (core.length < 2 && core !== "B.") || KEEP.has(core)) return w;
  let out = WORDS[core] || core.split("-").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join("-");
  out = out.replace(/^Pokémon/i, "Pokémon").replace(/^Poké/i, "Poké");
  return pre + out + post;
}
function fixCase(s) {
  return s.split(/(\s+)/).map(caseWord).join("")
    .replace(/Shadow Pokémon/g, "Shadow Pokémon").replace(/\bPokémon Center\b/g, "Pokémon Center");
}

// A string's pages: [text of each page], speaker named.
function pages(text, speaker) {
  const out = [];
  for (let page of text.split("\f")) {
    page = page.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    if (!page) continue;
    page = page.replace(/\{speaker\}/g, speaker || "???").replace(/\{partner\}/g, "Rui").replace(/\{player\}/g, "{PLAYER}")
      .replace(/\{[0-9a-f]{2}\}/g, "").replace(/\.\.\./g, "…");
    page = fixCase(page);
    // Wrap: 37 characters a line, three lines a page (a longer page goes on to another).
    const words = page.split(" "), lines = [];
    let line = "";
    for (const w of words) {
      if (line && (line + " " + w).length > 37) { lines.push(line); line = w; } else line = line ? line + " " + w : w;
    }
    if (line) lines.push(line);
    // (Lines shared out evenly between the pages, so none is left with a word on its own.)
    const n = Math.ceil(lines.length / 3);
    for (let k = 0, i = 0; k < n; k++) { const take = Math.ceil((lines.length - i) / (n - k)); out.push(lines.slice(i, i + take).join("\n")); i += take; }
  }
  return out;
}

module.exports = { pages, fixCase };

if (require.main === module) {
  const args = process.argv.slice(2), xd = args[0] === "--xd";
  if (xd) args.shift();
  const T = require(path.join(__dirname, "../assets/text/" + (xd ? "xd.json" : "colosseum.json")));
  const [a, b, c] = args;
  if (a === "--find") {
    const q = args.slice(1).join(" ").toLowerCase();
    for (const [t, m] of Object.entries(T)) for (const [id, s] of Object.entries(m)) if (s.toLowerCase().replace(/\s+/g, " ").includes(q)) console.log(t, id, JSON.stringify(s));
  } else {
    const s = (T[a] || {})[b];
    if (s == null) { console.error("No such string: " + a + " " + b); process.exit(1); }
    console.log(JSON.stringify(pages(s, c), null, 1).replace(/\n /g, "\n  "));
  }
}
