// Builds Trainer Tower's challenges from FireRed's (src/trainer_tower_sets.c,
// the sets the game has built in when no e-Reader card's been scanned).
//
//   node tools/build-trainer-tower.js <path to a pret/pokefirered checkout>
//
// Reads src/trainer_tower_sets.c (each floor of each challenge: its trainers,
// what they say in Easy Chat words, their six Pokémon each, the prize),
// include/constants/easy_chat.h and src/data/easy_chat/*.h (the words),
// src/data/pokemon/trainer_class_lookups.h and src/data/text/trainer_class_names.h
// (each facility class's trainer class and picture) and src/trainer_tower.c
// (the floors' prize list and how each looks on the map).
//
// Writes data/trainer-tower.js: window.TRAINER_TOWER = { challenges: [single,
// double, knockout, mixed: 8 floors each], prizes, ... } (game/trainer-tower.js
// runs the challenge).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "src/trainer_tower_sets.c"))) {
  console.error("Usage: node tools/build-trainer-tower.js <path to pret/pokefirered> (needs src/trainer_tower_sets.c, src/data/easy_chat)");
  process.exit(1);
}
const P = (...p) => path.join(pret, ...p);
const read = (rel) => fs.readFileSync(P(rel), "utf8");

global.window = global;
for (const f of ["data/dex.js", "data/moves.js", "data/items.js", "data/natures.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {}, moveByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
for (const k of Object.keys(window.MOVES)) moveByID[toID(k)] = k;
// (FireRed's names the game spells differently.)
const MOVE_ALIASES = { selfdestruct: "Self-Destruct", hijumpkick: "High Jump Kick", softboiled: "Soft-Boiled", smellingsalt: "Smelling Salts",
  ancientpower: "Ancient Power", extremespeed: "Extreme Speed", dynamicpunch: "Dynamic Punch", sonicboom: "Sonic Boom", thunderpunch: "Thunder Punch",
  doubleslap: "Double Slap", vicegrip: "Vise Grip", poisonpowder: "Poison Powder", solarbeam: "Solar Beam", bubblebeam: "Bubble Beam",
  dragonbreath: "Dragon Breath", faintattack: "Feint Attack", featherdance: "Feather Dance", grasswhistle: "Grass Whistle" };
const moveName = (c) => moveByID[toID(c)] || MOVE_ALIASES[toID(c)] || (() => { throw new Error("Unknown move " + c); })();
const ITEM_ALIASES = {};
const itemName = (c) => { const id = c.toLowerCase().replace(/_/g, "-"); return window.ITEMS[ITEM_ALIASES[id] || id] ? ITEM_ALIASES[id] || id : null; };

// ---------- Easy Chat words ----------

// EC_WORD_X -> (group << 9) | index; each group's words in order, by symbol.
const ecConst = {};
for (const [, name, group, idx] of read("include/constants/easy_chat.h").matchAll(/#define\s+(EC_WORD_\w+)\s+\(EC_GROUP_(\w+)\s*<<\s*9\)\s*\|\s*(0x[0-9a-fA-F]+|\d+)/g)) {
  ecConst[name] = { group, idx: parseInt(idx) };
}
const groupWords = {};
for (const f of fs.readdirSync(P("src/data/easy_chat")).filter((n) => /^easy_chat_group_\w+\.h$/.test(n))) {
  const src = read("src/data/easy_chat/" + f);
  const strings = {};
  for (const [, sym, text] of src.matchAll(/static const u8 (sEasyChatWord_\w+)\[\]\s*=\s*_\("(.*?)"\)/g)) strings[sym] = text;
  for (const [, grp, body] of src.matchAll(/sEasyChatGroup_(\w+)\[\]\s*=\s*\{([\s\S]*?)\n\};/g)) {
    const list = [...body.matchAll(/\.text = (sEasyChatWord_\w+)/g)].map((m) => strings[m[1]]);
    if (list.length) groupWords[grp.toUpperCase()] = list;
  }
}
const GROUP_NAMES = { TRENDY_SAYING: "TRENDYSAYING" };
function ecWord(tok) {
  tok = tok.trim();
  if (tok === "0xFFFF" || tok === "EC_EMPTY_WORD") return null;
  let m = /^EC_MOVE2?\((\w+)\)$/.exec(tok);
  if (m) return "\u0001" + moveName(m[1]) + "\u0002";
  m = /^EC_POKEMON(?:_NATIONAL)?\((\w+)\)$/.exec(tok);
  if (m) return "\u0001" + dexByID[toID(m[1])] + "\u0002";
  const c = ecConst[tok];
  if (!c) throw new Error("Unknown Easy Chat word " + tok);
  const words = groupWords[GROUP_NAMES[c.group] || c.group.replace(/_/g, "")];
  if (!words || words[c.idx] == null) throw new Error("No text for " + tok);
  return words[c.idx];
}
// Six words, three to a line (ConvertEasyChatWordsToString, 3x2), as the
// game writes its text: sentence case (FireRed's words are in capitals), the
// punctuation words (! ?! …) after the word before them.
const PUNCT = /^[!?.…\-]+$/;
function speech(tokens) {
  // (Words, the punctuation joined to the word before; then three to a line.)
  const words = tokens.map(ecWord).filter((w) => w != null).reduce((list, w) => {
    if (PUNCT.test(w) && list.length) list[list.length - 1] += w; else list.push(w);
    return list;
  }, []);
  const text = [words.slice(0, 3), words.slice(3)].filter((l) => l.length).map((l) => l.join(" ")).join("\n");
  // Lower case, but Pokémon and moves (\u0001...\u0002), "I", and the start of each sentence.
  let out = text.split(/(\u0001[^\u0002]*\u0002|\s+)/).map((w) => {
    if (w.startsWith("\u0001")) return w.slice(1, -1);
    const lower = w.toLowerCase();
    return /^i('|$|[!?.…])/.test(lower) ? "I" + lower.slice(1) : lower.replace(/pokémon|pokemon/g, "Pokémon");
  }).join("");
  out = out.replace(/(^|[.!?…]\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
  return out.replace(/POKé/g, "Poké");
}

// ---------- Trainer classes and pictures ----------

const lookups = read("src/data/pokemon/trainer_class_lookups.h");
const classNames = read("src/data/text/trainer_class_names.h");
const constName = (s) => s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
function facility(fc) {
  const pic = new RegExp("\\[" + fc + "\\]\\s*=\\s*TRAINER_PIC_(\\w+)").exec(lookups)[1].toLowerCase();
  const cls = new RegExp("\\[" + fc + "\\]\\s*=\\s*(TRAINER_CLASS_\\w+)").exec(lookups.slice(lookups.indexOf("gFacilityClassToTrainerClass")))[1];
  const className = constName(new RegExp("\\[" + cls + "\\]\\s*= _\\(\"(.*?)\"\\)").exec(classNames)[1])
    .replace(/Poke/g, "Poké").replace(/\{Pkmn\}/g, "Pokémon");
  if (!fs.existsSync(path.join(root, "assets/sprites/trainers/front", pic + ".png"))) throw new Error("No trainer picture " + pic + " (run tools/build-maps.js first?)");
  return { className, pic };
}
// How each looks on the map (sSingleBattleTrainerInfo, sDoubleBattleTrainerInfo):
// OBJ_EVENT_GFX_* (tools/build-maps.js puts these in WORLD_SPRITES).
const towerC = read("src/trainer_tower.c");
const singleInfo = {}, doubleInfo = {};
for (const [, gfx, fc, g] of towerC.slice(towerC.indexOf("sSingleBattleTrainerInfo[]"), towerC.indexOf("sDoubleBattleTrainerInfo[]"))
  .matchAll(/\{(OBJ_EVENT_GFX_\w+),\s*(FACILITY_CLASS_\w+),\s*(MALE|FEMALE)\}/g)) if (!singleInfo[fc]) singleInfo[fc] = { gfx, female: g === "FEMALE" };
for (const [, g1, g2, fc, a, b] of towerC.slice(towerC.indexOf("sDoubleBattleTrainerInfo[]"), towerC.indexOf("sTrainerEncounterMusicLUT"))
  .matchAll(/\{(OBJ_EVENT_GFX_\w+),\s*(OBJ_EVENT_GFX_\w+),\s*(FACILITY_CLASS_\w+),\s*(MALE|FEMALE),\s*(MALE|FEMALE)\}/g)) doubleInfo[fc] = { gfx: [g1, g2], female: [a === "FEMALE", b === "FEMALE"] };
// The prizes (sPrizeList, by TTPRIZE_*), and the music when a trainer spots
// you (sTrainerEncounterMusicLUT by their trainer class; boy, girl or Rocket).
const prizes = [.../sPrizeList\[\]\s*=\s*\{([^}]*)\}/.exec(towerC)[1].matchAll(/ITEM_(\w+)/g)].map((m) => m[1].toLowerCase().replace(/_/g, "-"));
const musicIdx = {};
for (const [, fc, mus] of towerC.matchAll(/\{(FACILITY_CLASS_\w+),\s*TRAINER_ENCOUNTER_MUSIC_(\w+)\}/g)) musicIdx[fc] = mus;
// (PlayTrainerTowerEncounterMusic looks the trainer class up among facility
// classes, so it finds the entry whose facility class has the same number as
// the trainer's class: FireRed's quirk, kept.)
const fcNumbers = {}, tcNumbers = {};
for (const [, n, v] of read("include/constants/trainers.h").matchAll(/#define\s+(FACILITY_CLASS_\w+)\s+(0x[0-9a-fA-F]+|\d+)/g)) fcNumbers[n] = parseInt(v);
for (const [, n, v] of read("include/constants/trainers.h").matchAll(/#define\s+(TRAINER_CLASS_\w+)\s+(0x[0-9a-fA-F]+|\d+)/g)) tcNumbers[n] = parseInt(v);
const SONGS = { MALE: "mus_encounter_boy", FEMALE: "mus_encounter_girl", GIRL: "mus_encounter_girl", SUSPICIOUS: "mus_encounter_rocket",
  INTENSE: "mus_encounter_boy", COOL: "mus_encounter_boy", AQUA: "mus_encounter_rocket", MAGMA: "mus_encounter_rocket", SWIMMER: "mus_encounter_boy",
  TWINS: "mus_encounter_girl", ELITE_FOUR: "mus_encounter_boy", HIKER: "mus_encounter_boy", INTERVIEWER: "mus_encounter_boy", RICH: "mus_encounter_boy" };
function encounterMusic(fc) {
  const cls = new RegExp("\\[" + fc + "\\]\\s*=\\s*(TRAINER_CLASS_\\w+)").exec(lookups.slice(lookups.indexOf("gFacilityClassToTrainerClass")))[1];
  const n = tcNumbers[cls];
  const asFc = Object.keys(fcNumbers).find((k) => fcNumbers[k] === n && musicIdx[k]);
  return SONGS[asFc ? musicIdx[asFc] : "MALE"];
}

// ---------- Floors ----------

const NATURE_ORDER = ["Hardy", "Lonely", "Brave", "Adamant", "Naughty", "Bold", "Docile", "Relaxed", "Impish", "Lax", "Timid", "Hasty",
  "Serious", "Jolly", "Naive", "Modest", "Mild", "Quiet", "Bashful", "Rash", "Calm", "Gentle", "Sassy", "Careful", "Quirky"];
const sets = read("src/trainer_tower_sets.c");
const floors = {};
for (const [, name, body] of sets.matchAll(/static const struct TrainerTowerFloor (sTrainerTowerFloor_\w+) = \{([\s\S]*?)\n\};/g)) {
  const type = /\.challengeType = CHALLENGE_TYPE_(\w+)/.exec(body)[1].toLowerCase();
  const prize = /\.prize = TTPRIZE_(\w+)/.exec(body)[1].toLowerCase().replace(/_/g, "-");
  const trainers = [];
  // Each trainer: { .name = ..., .mons = { {...}, ... } }.
  for (const t of body.split(/\n\t    \{|\n\t\t\{\n\t\t\t\.name/).slice(1)) {
    const tname = /\.name = _\("(.*?)"\)/.exec(".name" + t) || /\.name = _\("(.*?)"\)/.exec(t);
    if (!tname || !tname[1]) continue;
    const fc = /\.facilityClass = (FACILITY_CLASS_\w+)/.exec(t)[1];
    const ec = (k) => /\{([^}]*)\}/.exec(new RegExp("\\." + k + " = (\\{[^}]*\\})").exec(t)[1])[1].split(",");
    const mons = [...t.matchAll(/\.species = SPECIES_(\w+),([\s\S]*?)\.friendship = (\d+)/g)].map(([, sp, m, fr]) => {
      const get = (k) => +(new RegExp("\\." + k + " = (\\d+)").exec(m) || [, 0])[1];
      const pers = /\.personality = (0x[0-9a-fA-F]+),\s*\/\/\s*(MALE|FEMALE|GENDERLESS)/.exec(m);
      const item = /\.heldItem = ITEM_(\w+)/.exec(m)[1];
      return {
        species: dexByID[toID(sp)] || (() => { throw new Error("Unknown species " + sp); })(),
        item: item !== "NONE" ? itemName(item) || undefined : undefined,
        moves: /\.moves = \{([^}]*)\}/.exec(m)[1].split(",").map((x) => x.trim().replace(/^MOVE_/, "")).filter((x) => x && x !== "NONE").map(moveName),
        evs: { hp: get("hpEV"), atk: get("attackEV"), def: get("defenseEV"), spe: get("speedEV"), spa: get("spAttackEV"), spd: get("spDefenseEV") },
        ivs: { hp: get("hpIV"), atk: get("attackIV"), def: get("defenseIV"), spe: get("speedIV"), spa: get("spAttackIV"), spd: get("spDefenseIV") },
        abilityNum: get("abilityNum"),
        nature: NATURE_ORDER[parseInt(pers[1]) % 25],
        gender: pers[2] === "MALE" ? "M" : pers[2] === "FEMALE" ? "F" : "N",
        happiness: +fr
      };
    });
    const f = facility(fc);
    trainers.push({ name: tname[1].toLowerCase().replace(/(^|[\s&])([a-z])/g, (m, a, b) => a + b.toUpperCase()), className: f.className, pic: f.pic, facility: fc,
      music: encounterMusic(fc), female: (singleInfo[fc] || { female: false }).female,
      intro: speech(ec("speechBefore")), win: speech(ec("speechWin")), lose: speech(ec("speechLose")), after: speech(ec("speechAfter")), mons });
  }
  // How they look: one trainer (singles), each of three (knockout), or the pair (doubles).
  const looks = type === "double" ? (doubleInfo[trainers[0].facility] || { gfx: ["OBJ_EVENT_GFX_YOUNGSTER", "OBJ_EVENT_GFX_YOUNGSTER"] }).gfx
    : trainers.map((t) => (singleInfo[t.facility] || { gfx: "OBJ_EVENT_GFX_YOUNGSTER" }).gfx);
  if (type === "double") (doubleInfo[trainers[0].facility] || { female: [false, false] }).female.forEach((g, i) => { if (trainers[i]) trainers[i].female = g; });
  trainers.forEach((t) => delete t.facility);
  floors[name] = { type, prize, trainers, looks };
}
// gTrainerTowerFloors: each challenge's eight floors (the Mixed one borrows
// floors from the others).
const table = /gTrainerTowerFloors\[[^\]]*\]\[[^\]]*\]\s*=\s*\{([\s\S]*?)\n\};/.exec(sets)[1];
const challenges = ["SINGLE", "DOUBLE", "KNOCKOUT", "MIXED"].map((t) =>
  [...new RegExp("\\[CHALLENGE_TYPE_" + t + "\\]\\s*=\\s*\\{([^}]*)\\}").exec(table)[1].matchAll(/&(sTrainerTowerFloor_\w+)/g)].map((m) => {
    if (!floors[m[1]]) throw new Error("No floor " + m[1]);
    return m[1];
  }));
const used = [...new Set(challenges.flat())];
const out = {
  // The floors by name, and each challenge's eight (Single, Double, Knockout, Mixed).
  floors: Object.fromEntries(used.map((n) => [n.replace(/^sTrainerTowerFloor_/, ""), floors[n]])),
  challenges: challenges.map((c) => c.map((n) => n.replace(/^sTrainerTowerFloor_/, ""))),
  // (TTPRIZE_* names, as this game's items.)
  prizes: prizes.map((p) => (window.ITEMS[p] ? p : null)),
  // Every look a trainer here can have (for tools/build-maps.js).
  looks: [...new Set(used.flatMap((n) => floors[n].looks))].sort()
};
for (const n of used) if (!window.ITEMS[floors[n].prize]) throw new Error("No item " + floors[n].prize);
fs.writeFileSync(path.join(root, "data/trainer-tower.js"),
  "// Auto-generated by tools/build-trainer-tower.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.TRAINER_TOWER = " + JSON.stringify(out) + ";\n");
console.log("wrote data/trainer-tower.js: " + used.length + " floors, " + out.looks.length + " looks");
