// Builds the Pokéathlon's data from a pret/pokeheartgold checkout: what
// ui/pokeathlon.js needs to run HGSS's Pokéathlon Dome.
//
//   node tools/build-pokeathlon.js <path to pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes tools/lib/johto-pokeathlon.generated.js (tools/build-johto.js puts
// it at the end of data/johto-maps.js; this puts it there too, in place of
// the last one, so there's no need to build all of Johto again):
//   window.POKEATHLON = {
//     perf:     { species: "sssssppppp..." }   each species' five Performance
//               stats (files/poketool/personal/performance.narc, through
//               src/pokemon.c's sPokeathlonPerformanceArcIdxs): for Speed,
//               Power, Skill, Stamina and Jump, the base stars and the lowest
//               and highest they go, three digits each
//     natures:  [[power, skill, speed, jump, stamina] x 25]   how each nature
//               moves them (sPokeathlonPerformanceNatureMods), with its name
//     prizes:   [[[item, points], ...] x 7, ... x 7]   the Athlete Shop's prizes
//               each day of the week, Sunday first, without and then with the
//               National Pokédex (src/scrcmd_mart.c's
//               sPokeathlonPrizeExchangePriceOverrides)
//   }
// and adds to window.JOHTO_SCRIPTS the Dome's receptions' script
// (scr_seq_0167, the zone "0167": joining a course, the Supreme Cup and the
// Link Pokéathlon) with its messages, and gives the receptionists in
// PokeathlonDome_Interior_1F their scripts (HGSS's numbers 9850-9852, the
// shared scripts tools/build-johto.js leaves out); and the vending machine's
// drinks there (item numbers in its script) as this game's items.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readNarc } = require("./lib/narc");
const HS = require("./lib/hgss-script");

const HG = process.argv[2] || process.env.POKEHEARTGOLD;
if (!HG || !fs.existsSync(path.join(HG, "files/poketool/personal/performance.narc"))) {
  console.error("Usage: node tools/build-pokeathlon.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const src = (p) => fs.readFileSync(path.join(HG, p), "utf8");
global.window = global;
for (const f of ["data/dex.js", "data/items.js", "data/items-gen9.js", "data/natures.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));

// ---------- Performance (src/pokemon.c: CalcBoxMonPokeathlonPerformance) ----------

// (struct PokeathlonBasePerformance, 20 bytes: base[5] in the archive's order
// POWER, STAMINA, JUMP, SKILL, SPEED (ARCPERF_*), 4 unused, then minmax[5][2].)
const members = readNarc(path.join(HG, "files/poketool/personal/performance.narc"));
const pokemonC = src("src/pokemon.c");
const arcIdx = pokemonC.split("sPokeathlonPerformanceArcIdxs[] = {")[1].split("};")[0].match(/\d+/g).map(Number);
const ARC = { power: 0, stamina: 1, jump: 2, skill: 3, speed: 4 };
const ORDER = ["speed", "power", "skill", "stamina", "jump"];
const nameOfDex = {};
for (const [name, d] of Object.entries(window.DEX)) if (d.id && !(d.id in nameOfDex)) nameOfDex[d.id] = name;
const perf = {};
for (let dex = 1; dex < arcIdx.length; dex++) {
  const b = members[arcIdx[dex]], name = nameOfDex[dex];
  if (!b || !name) continue;
  perf[name] = ORDER.map((k) => "" + b[ARC[k]] + b[9 + ARC[k] * 2] + b[10 + ARC[k] * 2]).join("");
}

// Natures (include/constants/pokemon.h's order), and what each does to them.
const natureNames = [...src("include/constants/pokemon.h").matchAll(/#define NATURE_([A-Z]+)\s+(\d+)/g)].filter((m) => m[1] !== "NUM")
  .sort((a, b) => a[2] - b[2]).map((m) => m[1][0] + m[1].slice(1).toLowerCase());
const mods = pokemonC.split("sPokeathlonPerformanceNatureMods[NATURE_NUM][5] = {")[1].split("};")[0]
  .match(/\{[^}]*\}/g).map((row) => row.match(/-?\d+/g).map(Number));
const natures = natureNames.map((n, i) => [n].concat(mods[i]));
for (const [n] of natures) if (!window.NATURES[n]) throw new Error("no nature " + n);

// ---------- The Athlete Shop (src/scrcmd_mart.c) ----------

const ALIAS = { THUNDERSTONE: "thunder-stone", KINGS_ROCK: "kings-rock", PP_UP: "pp-up" };
const APRICORN = { RED: "red", YLW: "yellow", BLU: "blue", GRN: "green", PNK: "pink", WHT: "white", BLK: "black" };
function item(c) {
  const k = c.replace(/^ITEM_/, "");
  const ap = /^(\w+)_APRICORN$/.exec(k);
  const id = ap ? APRICORN[ap[1]] + "-apricorn" : ALIAS[k] || k.toLowerCase().replace(/_/g, "-");
  if (!ap && !window.ITEMS[id]) throw new Error("no item for " + c);
  return id;
}
const mart = src("src/scrcmd_mart.c");
const lists = {};
for (const m of mart.matchAll(/sPokeathlonPrizeExchangePriceOverrides_(\w+)\[\] = \{([\s\S]*?)\};/g)) {
  lists[m[1]] = [...m[2].matchAll(/\{\s*(ITEM_\w+),\s*(\d+)\s*\}/g)].map((x) => [item(x[1]), +x[2]]);
}
const days = mart.split("sPokeathlonPrizeExchangePriceOverrides[] = {")[1].split("};")[0].match(/sPokeathlonPrizeExchangePriceOverrides_(\w+)/g)
  .map((s) => lists[s.replace(/^sPokeathlonPrizeExchangePriceOverrides_/, "")]);
if (days.length !== 14 || days.some((d) => !d)) throw new Error("expected 14 prize lists");

// ---------- The receptions' script (scr_seq_0167) ----------

const SC = HS.compiler(HG, { item: (c) => { try { return item(c); } catch (e) { return null; } }, species: () => null });
const zone = SC.zone("0167");
if (!zone) throw new Error("no scr_seq_0167");
// (Only its own messages and the standard menus', msg_0191.)
const messages = {}, yesno = {};
for (const [k, v] of Object.entries(SC.messages)) if (/^msg_0312_|^bank:191:/.test(k)) { messages[k] = v; if (SC.yesno[k]) yesno[k] = 1; }
// The receptionists (HGSS's script numbers in files/fielddata/eventdata/zone_event/252_D49R0101.json).
const ev = JSON.parse(src("files/fielddata/eventdata/zone_event/252_D49R0101.json"));
const SHARED = { 9850: "scr_seq_0167_000", 9851: "scr_seq_0167_001", 9852: "scr_seq_0167_002" };
const receptionists = ev.objects.filter((o) => SHARED[o.scriptId]).map((o) => [o.id, "hgss:0167:" + SHARED[o.scriptId]]);
// The vending machine's drinks (ITEM_FRESH_WATER, ITEM_SODA_POP and ITEM_LEMONADE are 30, 31 and 32).
const DRINKS = { 30: "fresh-water", 31: "soda-pop", 32: "lemonade" };

const data = { perf, natures, prizes: days };
const js = "// The Pokéathlon (tools/build-pokeathlon.js, from pret/pokeheartgold; ui/pokeathlon.js runs it).\n" +
  "window.POKEATHLON = " + JSON.stringify(data) + ";\n" +
  "(function (J, M) {\n" +
  "  if (!J || !M) return;\n" +
  "  J.zones[\"0167\"] = " + JSON.stringify(zone) + ";\n" +
  "  Object.assign(J.messages, " + JSON.stringify(messages) + ");\n" +
  "  Object.assign(J.yesno || (J.yesno = {}), " + JSON.stringify(yesno) + ");\n" +
  "  for (const [id, script] of " + JSON.stringify(receptionists) + ") for (const p of M.people) if (p.localId === id) p.script = script;\n" +
  "  const z = J.zones.D49R0101, drinks = " + JSON.stringify(DRINKS) + ";\n" +
  "  if (z) for (const c of z.cmds) if (c[0] === \"SetVar\" && c[1] === \"VAR_SPECIAL_x8001\" && drinks[c[2]]) c[2] = drinks[c[2]];\n" +
  "})(window.JOHTO_SCRIPTS, (window.WORLD_MAPS || {}).PokeathlonDome_Interior_1F);\n" +
  "// (End of the Pokéathlon.)\n";
const file = path.join(__dirname, "lib/johto-pokeathlon.generated.js");
fs.writeFileSync(file, js);

// And into data/johto-maps.js, in place of what an earlier run put there.
const mapsFile = path.join(root, "data/johto-maps.js");
if (fs.existsSync(mapsFile)) {
  let maps = fs.readFileSync(mapsFile, "utf8");
  const a = maps.indexOf("// The Pokéathlon (tools/build-pokeathlon.js"), endMark = "// (End of the Pokéathlon.)\n";
  if (a >= 0) maps = maps.slice(0, a) + maps.slice(maps.indexOf(endMark, a) + endMark.length);
  fs.writeFileSync(mapsFile, maps + js);
}
console.log("wrote " + path.relative(root, file) + ": " + Object.keys(perf).length + " species' Performance, " + natures.length + " natures, " +
  days.length + " prize lists, " + zone.cmds.length + " commands of scr_seq_0167, " + receptionists.length + " receptionists");
