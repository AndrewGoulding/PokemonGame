// Builds the Bug-Catching Contest's data for Johto's National Park from a
// pret/pokeheartgold checkout: the contest's own scripts (scr_seq_0151, the
// std_bug_contest_* scripts the gatehouses' officers call, and the judging),
// compiled by tools/lib/hgss-script.js as the maps' are; its wild Pokémon
// (files/data/mushi/mushi_encount.csv: one set without the National Pokédex,
// one a day with it) and its contestants (mushi_trainer.csv: what each of the
// ten can catch, by day, and the score it's worth), for ui/bug-contest.js.
//
//   node tools/build-bug-contest.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// Writes tools/lib/johto-bug-contest.generated.js, which tools/build-johto.js
// appends to data/johto-maps.js; and puts it at the end of data/johto-maps.js
// now (in place of the copy there), so the game has it without a rebuild.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const HS = require("./lib/hgss-script");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/data/mushi"))) {
  console.error("usage: node tools/build-bug-contest.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const F = (p) => path.join(ROOT, p);

// This game's species and items (as tools/build-johto.js names them).
global.window = global;
for (const f of ["data/dex.js", "data/items.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const name of Object.keys(window.DEX)) dexByID[toID(name)] = name;
const species = (s) => {
  const name = dexByID[toID(String(s).replace(/^SPECIES_/, ""))];
  if (!name) throw new Error("no species " + s);
  return name;
};
const item = (id) => {
  if (!window.ITEMS[id]) throw new Error("no item " + id);
  return id;
};

const csv = (file) => {
  const [head, ...rows] = fs.readFileSync(F("files/data/mushi/" + file), "utf8").trim().split(/\r?\n/);
  const keys = head.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [keys[i], /^\d+$/.test(v) ? +v : v])));
};

// The wild Pokémon (BUGMON: species, levels, rate, score), ten a set: set 0
// without the National Pokédex, then Tuesday's, Thursday's and Saturday's
// (BugContest_InitEncounters: day / 2). `rate`: the slot's when the roll out
// of 100 is at least it (BugContest_GetEncounterSlot).
const BUGMON_COUNT = 10;
const enc = csv("mushi_encount.csv").map((r) => ({ species: species(r.species), min: r.lvlmin, max: r.lvlmax, rate: r.rate, score: r.score }));
const encounters = [];
for (let i = 0; i < enc.length; i += BUGMON_COUNT) encounters.push(enc.slice(i, i + BUGMON_COUNT));

// The contestants (mushi_trainer.csv): eight rows each, of the ten; a row is
// for the National Pokédex only (national), or a day (7: any day), and the
// score its Pokémon is worth, give or take randmod.
const tr = csv("mushi_trainer.csv").map((r) => ({ national: r.national, day: r.day, species: species(r.species), score: r.score, randmod: r.randmod }));
const contestants = [];
for (let i = 0; i < tr.length; i += 8) contestants.push(tr.slice(i, i + 8));

// Their names (msg_0246's 78 on) and classes (src/overlay_bug_contest.c's sBugContestOpponentClasses).
const bank = JSON.parse(fs.readFileSync(F("files/msgdata/msg/msg_0246.json"), "utf8")).messages;
const names = bank.slice(78, 88).map((m) => String(m.en_US).replace(/\{[^}]*\}/g, ""));
const CLASS_NAMES = { BUG_CATCHER: "Bug Catcher", ACE_TRAINER_F: "Ace Trainer", POKEFAN_M: "Pokéfan", CAMPER: "Camper",
  PICNICKER: "Picnicker", YOUNGSTER: "Youngster", SCHOOL_KID_M: "School Kid" };
const src = fs.readFileSync(F("src/overlay_bug_contest.c"), "utf8");
const classes = [...src.split("sBugContestOpponentClasses")[1].split("};")[0].matchAll(/TRAINERCLASS_(\w+)/g)].map((m) => CLASS_NAMES[m[1]]);
if (classes.length !== 10 || classes.some((c) => !c)) throw new Error("contestants' classes");

// The prizes (BugContest_Judge): first a Sun Stone (with the National
// Pokédex, one of ten stones: ITEM_SUN_STONE to ITEM_LEAF_STONE, then
// ITEM_SHINY_STONE to ITEM_OVAL_STONE), second an Everstone, third a Sitrus
// Berry, everyone else a Shed Shell.
const prizes = {
  first: ["sun-stone", "moon-stone", "fire-stone", "thunder-stone", "water-stone", "leaf-stone", "shiny-stone", "dusk-stone", "dawn-stone", "oval-stone"].map(item),
  second: item("everstone"), third: item("sitrus-berry"), other: item("shed-shell")
};

// The contest's scripts: scr_seq_0151 as a zone of its own, BUG_CONTEST, with
// msg_0246 its bank (for NonNPCMsgVar), and each std_bug_contest_* script by
// name (include/constants/std_script.h: 10400 on, its scripts in order).
const SC = HS.compiler(ROOT, { item: () => null, species: () => null });
const zone = SC.compileSource(fs.readFileSync(F("files/fielddata/script/scr_seq/scr_seq_0151.s"), "utf8"));
zone.hdr = { frame: [] };
zone.bank = "msg_0246";
bank.forEach((m, i) => SC.needMsg("msg_0246_" + String(i).padStart(5, "0")));
const std = {};
for (const m of fs.readFileSync(F("include/constants/std_script.h"), "utf8").matchAll(/#define\s+(std_bug_contest_\w+)\s+(\d+)/g)) {
  const label = "scr_seq_0151_" + String(+m[2] - 10400).padStart(3, "0");
  if (!(label in zone.labels)) throw new Error("no " + label);
  std[m[1]] = ["BUG_CONTEST", label];
}
// (And the counter man in the park after it, by number: 10428.)
const STD_BY_NUMBER = (n) => "scr_seq_0151_" + String(n - 10400).padStart(3, "0");
const messages = {}, yesno = {};
for (const [id, pages] of Object.entries(SC.messages)) if (/^msg_0246_/.test(id)) { messages[id] = pages; if (SC.yesno[id]) yesno[id] = 1; }

// The contestants' hide flags by number (SetFlagVar 627 on, in the scripts),
// and every map's number (a script's Warp names its map by number).
const flags = fs.readFileSync(F("include/constants/flags.h"), "utf8");
const flagNames = {};
for (const m of flags.matchAll(/#define\s+(FLAG_HIDE_BUG_CONTESTANT_\w+)\s+(0x[0-9a-fA-F]+)/g)) flagNames[parseInt(m[2], 16)] = m[1];
const mapIds = {};
for (const m of fs.readFileSync(F("include/constants/maps.h"), "utf8").matchAll(/#define\s+(MAP_\w+)\s+(\d+)/g)) if (!(m[2] in mapIds)) mapIds[m[2]] = m[1];

// Who runs which of them: the contestants in the contest's park (D22R0102,
// *_during) and in the park after it (D22R0101, *_after, and the counter man).
const people = {};
for (const [map, file] of [["NationalPark_BugCatchingContest", "440_D22R0102.json"], ["NationalPark", "093_D22R0101.json"]]) {
  const ev = JSON.parse(fs.readFileSync(F("files/fielddata/eventdata/zone_event/" + file), "utf8"));
  for (const o of ev.objects) {
    const s = typeof o.scriptId === "number" && o.scriptId >= 10400 && o.scriptId < 10440 ? STD_BY_NUMBER(o.scriptId) : std[o.scriptId] && std[o.scriptId][1];
    if (s) (people[map] = people[map] || {})[o.id] = "hgss:BUG_CONTEST:" + s;
  }
}

const data = { encounters, contestants, names, classes, prizes, balls: 20, minutes: 20 };
const BEGIN = "// The Bug-Catching Contest (tools/build-bug-contest.js, from pret/pokeheartgold: scr_seq_0151 and files/data/mushi; run by ui/bug-contest.js).\n";
const END = "// (End of the Bug-Catching Contest.)\n";
const js = BEGIN +
  "window.BUG_CONTEST_DATA = " + JSON.stringify(data) + ";\n" +
  "(function (J, maps) {\n" +
  "  J.zones.BUG_CONTEST = " + JSON.stringify(zone) + ";\n" +
  "  Object.assign(J.messages, " + JSON.stringify(messages) + ");\n" +
  "  Object.assign(J.yesno, " + JSON.stringify(yesno) + ");\n" +
  "  J.std = Object.assign(J.std || {}, " + JSON.stringify(std) + ");\n" +
  "  J.flagNames = Object.assign(J.flagNames || {}, " + JSON.stringify(flagNames) + ");\n" +
  "  J.mapIds = Object.assign(J.mapIds || {}, " + JSON.stringify(mapIds) + ");\n" +
  "  const people = " + JSON.stringify(people) + ";\n" +
  "  for (const map in people) for (const p of (maps[map] || { people: [] }).people) if (people[map][p.localId]) p.script = people[map][p.localId];\n" +
  "  // (The Route 36 gatehouse is FireRed's: its contest-day officer stands behind the counter, as FireRed's guard does, talked to across it.)\n" +
  "  const gate = maps.Route36_NationalParkGatehouse, officer = gate && gate.people.find((p) => p.localId === \"obj_R36R0201_counterm_2\");\n" +
  "  if (officer && gate.collision[officer.y * gate.width + officer.x] && !gate.collision[(officer.y - 1) * gate.width + officer.x]) officer.y--;\n" +
  "  // (The park's frame table: the judging, a std script, once the contest's over.)\n" +
  "  if (J.zones.D22R0101) J.zones.D22R0101.hdr.frame = J.zones.D22R0101.hdr.frame.map((f) => (f[0] === \"VAR_UNK_40F7\" ? [f[0], f[1], \"std_bug_contest_judging\"] : f));\n" +
  "})(window.JOHTO_SCRIPTS, window.WORLD_MAPS);\n" + END;

const out = path.join(__dirname, "lib/johto-bug-contest.generated.js");
fs.writeFileSync(out, js);
// (data/johto-maps.js now: this in place of the copy there, or at its end.)
const dataFile = path.join(root, "data/johto-maps.js");
let all = fs.readFileSync(dataFile, "utf8");
const at = all.indexOf(BEGIN);
if (at >= 0) all = all.slice(0, at) + all.slice(all.indexOf(END, at) + END.length);
const town = all.indexOf("// Johto's Town Map");
all = town >= 0 ? all.slice(0, town) + js + all.slice(town) : all + js;
fs.writeFileSync(dataFile, all);
console.log("wrote " + path.relative(root, out) + " (and data/johto-maps.js): " + encounters.length + " encounter sets, " +
  contestants.length + " contestants, " + Object.keys(std).length + " std scripts, " + Object.keys(messages).length + " messages");
