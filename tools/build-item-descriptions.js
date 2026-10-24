// Builds data/item-descriptions.js: FireRed's item descriptions
// (src/data/items.json), as its bag, Item PC and Poké Mart show them, three
// lines broken where FireRed breaks them.
//
//   node tools/build-item-descriptions.js <path to pokefirered>   (or set POKEFIRERED)
//
// Names are in this game's mixed case ("POKéMON" -> "Pokémon", "PROF. OAK" ->
// "Prof. Oak"), except HP, PP, TM and HM. Items are keyed by this game's ids
// (data/items.js); TMs and HMs are left out (their descriptions are their
// moves'), and items FireRed doesn't have keep data/items.js's text. This
// game's Exp. Share is a key item you turn on and off, and its Berry Pouch
// picks berries, so they have their own; the Old Sea Map's is Emerald's.
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
const file = path.join(pret || "", "src/data/items.json");
if (!pret || !fs.existsSync(file)) {
  console.error("Usage: node tools/build-item-descriptions.js <path to pret/pokefirered>  (needs src/data/items.json)");
  process.exit(1);
}
global.window = global;
require(path.join(root, "data/items.js"));

const norm = (s) => s.toLowerCase().replace(/é/g, "e").replace(/[^a-z0-9]/g, "");
const byNorm = {};
for (const id of Object.keys(window.ITEMS)) byNorm[norm(id)] = id;
const KEEP = new Set(["HP", "PP", "TM", "HM"]);
const mixedCase = (text) => text.replace(/[A-Zé]{2,}(?:'[A-Z]+)?/g, (w) => (KEEP.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()));

const out = {
  "exp-share": "When it's on, your whole party\ngets Exp. Points from battles.",   // (ui/game.js adds whether it's on)
  // (Emerald's, from Faraway Island.)
  "old-sea-map": "A faded sea chart\nthat shows the way\nto a certain island.",
  // (This game's: the Berry Pouch picks berries, game/berry-picking.js.)
  "berry-pouch": "Use it in a forest to shake a\nberry tree and catch the Berries\nthat fall.",
  // (This game's: after Hoenn's Hall of Fame, for the S.S. Tidal's run to Sinnoh.)
  "sinnoh-ticket": "A ticket for the S.S. Tidal's\nrun to Sinnoh, sailing from\nLilycove City.",
  // (As since Gen 4: a quarter of its HP, not FireRed's 30.)
  "sitrus-berry": "When held by a Pokémon, it will be\nused in battle to restore 1/4\nof its max HP."
};
for (const it of JSON.parse(fs.readFileSync(file, "utf8")).items) {
  if (!/^ITEM_/.test(it.itemId) || /^ITEM_(NONE|TM|HM|0|UNUSED)/.test(it.itemId)) continue;
  const id = it.itemId.slice(5).toLowerCase().replace(/_/g, "-");
  const ours = window.ITEMS[id] ? id : byNorm[norm(it.english)] || byNorm[norm(id)];
  if (!ours || out[ours]) continue;
  out[ours] = mixedCase(it.description_english.replace(/\\n/g, "\n")).replace(/ +\n/g, "\n").trim();
}
const lines = Object.keys(out).sort().map((id) => "  " + JSON.stringify(id) + ": " + JSON.stringify(out[id]));
fs.writeFileSync(path.join(root, "data/item-descriptions.js"),
  "// FireRed's item descriptions (src/data/items.json), from tools/build-item-descriptions.js.\n" +
  "window.ITEM_DESCRIPTIONS = {\n" + lines.join(",\n") + "\n};\n");
console.log("wrote data/item-descriptions.js (" + lines.length + " items)");
