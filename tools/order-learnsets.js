// Puts moves learned at the same level in the order the games list them
// (data/learnsets.js had them alphabetical: Charmander's level 1 moves came
// out "Growl, Scratch" instead of "Scratch, Growl", so a new Charmander knew
// Growl first):
//
//   node tools/order-learnsets.js <path to pokeemerald-expansion>   (or set POKEEMERALD_EXPANSION)
//
// Reads the expansion's Gen 6 level-up learnsets
// (src/data/pokemon/level_up_learnsets/gen_6.h, X and Y's, in the games'
// order) and, within each level of each species' level-up moves, sorts
// them by where they come in there. Levels and moves aren't changed; moves
// it doesn't list keep their place after the ones it does. Rewrites
// data/learnsets.js in place.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const expansion = process.argv[2] || process.env.POKEEMERALD_EXPANSION;
const file = path.join(expansion || "", "src/data/pokemon/level_up_learnsets/gen_6.h");
if (!expansion || !fs.existsSync(file)) {
  console.error("Usage: node tools/order-learnsets.js <path to pokeemerald-expansion>  (needs src/data/pokemon/level_up_learnsets/gen_6.h)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// sCharmanderLevelUpLearnset -> "charmander": ["scratch", "growl", "ember", ...]
const order = {};
for (const [, name, body] of fs.readFileSync(file, "utf8").matchAll(/s(\w+)LevelUpLearnset\[\] = \{([\s\S]*?)\};/g)) {
  order[key(name)] = [...body.matchAll(/LEVEL_UP_MOVE\(\s*\d+,\s*MOVE_(\w+)\)/g)].map((m) => key(m[1]));
}

const out = path.join(root, "data/learnsets.js");
const src = fs.readFileSync(out, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const sets = sandbox.window.LEARNSETS_GEN6;
let changed = 0;
for (const [species, set] of Object.entries(sets)) {
  const list = order[key(species)] || order[key(species.split("-")[0])];
  if (!list || !set.levelup) continue;
  const rank = (m) => { const i = list.indexOf(key(m)); return i < 0 ? Infinity : i; };
  const before = JSON.stringify(set.levelup);
  set.levelup = set.levelup.map((e, i) => [e, i])
    .sort(([a, i], [b, j]) => a[0] - b[0] || (rank(a[1]) - rank(b[1])) || i - j)
    .map(([e]) => e);
  if (JSON.stringify(set.levelup) !== before) changed++;
}
// Keep the header; replace the data line.
const header = src.slice(0, src.indexOf("\nwindow.LEARNSETS_GEN6 =") + 1);
fs.writeFileSync(out, header + "window.LEARNSETS_GEN6 = " + JSON.stringify(sets) + ";\n");
console.log("data/learnsets.js: reordered same-level moves for " + changed + " species");
