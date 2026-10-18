// HeartGold and SoulSilver's Headbutt trees, from a pret/pokeheartgold checkout.
//
//   node tools/build-johto-headbutt.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// Writes tools/lib/johto-headbutt.generated.js: window.JOHTO_HEADBUTT
// (appended to data/johto-maps.js by tools/build-johto.js), from
// files/arc/headbutt.json: each of Johto's built maps' trees (each tree's
// tiles, on the map: the regular trees, then the secret ones) and its three
// tables of six Pokémon (common, rare and secret: [species, min level, max
// level]; HeartGold's), which species the Headbutt tutor in Ilex Forest
// can teach (files/fielddata/wazaoshie/waza_oshie.json's TUTOR_HEADBUTT), and
// what's said at a tree.
// ui/johto-field.js picks a tree's table as src/field/headbutt.c does (by
// your Trainer ID's last digit) and its slot (50/15/15/10/5/5).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/arc/headbutt.json"))) {
  console.error("Usage: node tools/build-johto-headbutt.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["dex.js", "dex-forms.js", "dex-gen7.js", "dex-gen8.js", "dex-gen9.js"]) {
  try { vm.runInThisContext(fs.readFileSync(path.join(root, "data", f), "utf8")); } catch (e) { /* (a later file's extras) */ }
}
window.WORLD_MAPS = {}; window.WORLD_TRAINERS = {}; window.ITEMS = {};
// (Johto's maps, as tools/build-johto.js made them: their zones and where they sit on HGSS's world.)
vm.runInThisContext(fs.readFileSync(path.join(root, "data/johto-maps.js"), "utf8"));
const J = window.JOHTO_SCRIPTS;

const species = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/species.h"), "utf8").matchAll(/#define SPECIES_(\w+)\s+(\d+)\b/g)) if (+m[2] >= 1 && +m[2] <= 493) species[m[1]] = +m[2];
const byId = {};
for (const [n, d] of Object.entries(window.DEX)) if (!byId[d.id] || !/-/.test(n)) byId[d.id] = byId[d.id] && /-/.test(byId[d.id]) ? n : byId[d.id] || n;
const speciesName = (s) => byId[species[String(s).replace(/^SPECIES_/, "")]] || null;

// ---------- The trees ----------

const tables = JSON.parse(fs.readFileSync(path.join(ROOT, "files/arc/headbutt.json"), "utf8")).tables;
const mapsOfZone = {};
for (const [name, zone] of Object.entries(J.maps)) (mapsOfZone[zone] = mapsOfZone[zone] || []).push(name);
const slots = (list) => list.map((m) => [speciesName(typeof m.species === "object" ? m.species.gold : m.species), m.minLevel, m.maxLevel]).filter((s) => s[0]);
const maps = {};
for (const t of tables) {
  const o = J.origins[t.Map];
  if (!o || !(t.Trees.length || t.SecretTrees.length)) continue;
  for (const name of mapsOfZone[t.Map] || []) {
    const m = window.WORLD_MAPS[name];
    if (!m) continue;
    const tiles = (tree) => tree.map((c) => [c.x - o.x, c.y - o.y]).filter(([x, y]) => x >= 0 && y >= 0 && x < m.width && y < m.height);
    maps[name] = { common: slots(t.CommonMons), rare: slots(t.RareMons), secret: slots(t.SecretMons),
      trees: t.Trees.map(tiles), secretTrees: t.SecretTrees.map(tiles) };
  }
}

// ---------- Who can learn it from the tutor ----------

const LONG = { ATK: "Attack", DEF: "Defense", SPD: "Speed" };
const speciesKeys = Object.keys(species).sort((a, b) => b.length - a.length);
const learners = new Set();
for (const e of JSON.parse(fs.readFileSync(path.join(ROOT, "files/fielddata/wazaoshie/waza_oshie.json"), "utf8")).tutor) {
  if (!e.moves.includes("TUTOR_HEADBUTT")) continue;
  const s = e.mon.replace(/^SPECIES_/, ""), base = speciesKeys.find((k) => s === k || s.startsWith(k + "_"));
  if (!base) continue;
  const name = byId[species[base]];
  if (!name) continue;
  if (s === base) { learners.add(name); continue; }
  // (A form: Rotom-Mow, Deoxys-Attack.)
  const form = s.slice(base.length + 1), full = name.split("-")[0] + "-" + (LONG[form] || form[0] + form.slice(1).toLowerCase());
  if (window.DEX[full]) learners.add(full);
}

// What's said (src/field_move's std script, scr_seq_0146: msg_0211): the
// tree, with someone who knows Headbutt and without, and using it.
const msg = JSON.parse(fs.readFileSync(path.join(ROOT, "files/msgdata/msg/msg_0211.json"), "utf8")).messages;
const pages = (i) => [].concat(msg[i].en_US).join("").replace(/\{STRVAR_1 \d+, \d+, \d+\}/g, "{MON}").replace(/\{(?!MON\})[^}]*\}/g, "")
  .replace(/[’‘]/g, "'").split(/[\r\f]/).map((p) => p.replace(/\n$/, "").trimEnd()).filter((p) => p.trim());
const text = { ask: pages(32), used: pages(33), formidable: pages(34) };

fs.writeFileSync(path.join(__dirname, "lib/johto-headbutt.generated.js"),
  "// Johto's Headbutt trees and who can learn Headbutt (tools/build-johto-headbutt.js, from pret/pokeheartgold).\n" +
  "window.JOHTO_HEADBUTT = " + JSON.stringify({ maps, learners: [...learners], text }) + ";\n");
console.log("wrote " + Object.keys(maps).length + " maps' Headbutt trees (" +
  Object.values(maps).reduce((n, m) => n + m.trees.length + m.secretTrees.length, 0) + " trees), " + learners.size + " learners");
