// What Johto's field scripts (ui/johto-script.js) need besides the scripts
// themselves, from a pret/pokeheartgold checkout:
//
//   node tools/build-johto-script-data.js <path to pokeheartgold>   (or set POKEHEARTGOLD)
//
// Writes tools/lib/johto-script-data.generated.js (tools/build-johto.js puts
// it at the end of data/johto-maps.js), adding to window.JOHTO_SCRIPTS:
//   trades    HGSS's in-game trades and loaned Pokémon (files/a/1/1/2, the
//             NPCTrade structs of include/npc_trade.h, by NpcTradeNum: Rocky
//             the Onix ... Kenya the Spearow, Shuckie the Shuckle), with their
//             nicknames and trainers (msg_0200): the Pokémon given (this
//             game's species), its IVs, ability, nature and gender (from its
//             personality), held item, its trainer's ID and gender, and the
//             species wanted.
//   tutors    who Ilex Forest's tutor can teach Headbutt (HGSS's tutor learnsets,
//             files/fielddata/wazaoshie: ScrCmd_656's), by this game's species.
//   sounds    HGSS's song and jingle numbers (include/constants/sndseq.h) as
//             their songs (tools/lib/hgss-music.json): PlayBGM, PlayFanfare.
//   messages  the standard menu's texts (msg_0191, MenuInitStdGmm's: "bank:191:n"),
//             and each zone's own, for its MenuInit menus ("bank:<file>:n");
//             zones[zone].menuBank says which.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readNarc } = require("./lib/narc");
const HS = require("./lib/hgss-script");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/a/1/1/2"))) {
  console.error("Usage: node tools/build-johto-script-data.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["data/dex.js", "data/items.js", "data/natures.js", "data/abilities.js"]) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"));
const H = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const defines = (file, prefix) => {
  const out = {};
  for (const m of H(file).matchAll(new RegExp("#define (" + prefix + "\\w+)\\s+(\\d+)", "g"))) if (!(m[2] in out)) out[m[2]] = m[1];
  return out;
};
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const byID = (names) => { const o = {}; for (const k of names) o[toID(k)] = k; return o; };
const dexByID = byID(Object.keys(window.DEX).filter((k) => window.DEX[k].id < 10000));
const itemByID = byID(Object.keys(window.ITEMS));
const abilityByID = byID(Object.keys(window.ABILITIES || {}));
const SPECIES = defines("include/constants/species.h", "SPECIES_");
const ITEMS = defines("include/constants/items.h", "ITEM_");
const ABILITIES = defines("include/constants/abilities.h", "ABILITY_");
const species = (n) => dexByID[toID(String(SPECIES[n]).replace(/^SPECIES_/, ""))] || null;
const item = (n) => (n ? itemByID[toID(String(ITEMS[n]).replace(/^ITEM_/, ""))] || null : null);
const ability = (n) => abilityByID[toID(String(ABILITIES[n]).replace(/^ABILITY_/, ""))] || null;
const msgs = (file) => JSON.parse(H("files/msgdata/msg/" + file + ".json")).messages;

// ---------- In-game trades and loans ----------
const names = msgs("msg_0200").map((m) => m.en_US);
const NATURES = Object.keys(window.NATURES);   // (Gen 3's order: a personality's nature is it mod 25)
const trades = readNarc(path.join(ROOT, "files/a/1/1/2")).map((b, i) => {
  const v = [];
  for (let k = 0; k + 4 <= b.length; k += 4) v.push(b.readUInt32LE(k));
  const gives = species(v[0]), pid = v[14] >>> 0;
  // (Its gender: the personality's low byte against the species' share of females, as Gen 4's.)
  const text = window.DEX[gives].gender || "", male = /([\d.]+)% Male/.exec(text);
  const gender = /genderless/i.test(text) ? "N" : !male ? "F" : +male[1] === 100 ? "M"
    : (pid & 0xff) < Math.round(255 * (100 - +male[1]) / 100) ? "F" : "M";
  return { gives, nickname: names[i], ot: { name: names[i + 13], id: v[8] & 0xffff, female: !!v[16] },
    ivs: { hp: v[1], atk: v[2], def: v[3], spe: v[4], spa: v[5], spd: v[6] },
    ability: ability(v[7]), nature: NATURES[pid % 25], gender, personality: pid, item: item(v[15]), heldItem: String(ITEMS[v[15]] || ""),
    wants: species(v[19]) };
});

// ---------- Who Ilex Forest's tutor can teach Headbutt (files/fielddata/wazaoshie) ----------
const headbutt = JSON.parse(H("files/fielddata/wazaoshie/waza_oshie.json")).tutor
  .filter((t) => t.moves.includes("TUTOR_HEADBUTT")).map((t) => dexByID[toID(t.mon.replace(/^SPECIES_/, ""))]).filter(Boolean);

// ---------- Songs and jingles, by number ----------
const music = JSON.parse(fs.readFileSync(path.join(__dirname, "lib/hgss-music.json"), "utf8"));
const sounds = {};
for (const [n, name] of Object.entries(defines("include/constants/sndseq.h", "SEQ_"))) if (music[name]) sounds[n] = music[name];

// ---------- Menus' texts ----------
const messages = {}, menuBanks = {};
const addBank = (file) => {
  const n = +/^msg_(\d+)/.exec(file)[1];
  msgs(file).forEach((m, i) => { if (m.en_US != null) messages["bank:" + n + ":" + i] = HS.pages(m.en_US); });
  return n;
};
addBank("msg_0191");
const SCR = path.join(ROOT, "files/fielddata/script/scr_seq");
const msgFiles = fs.readdirSync(path.join(ROOT, "files/msgdata/msg"));
for (const f of fs.readdirSync(SCR)) {
  const m = /^scr_seq_\d+_(\w+?)\.s$/.exec(f);
  if (!m || /_hdr$/.test(m[1]) || !/^\s+MenuInit\s/m.test(fs.readFileSync(path.join(SCR, f), "utf8"))) continue;
  const bank = msgFiles.find((x) => new RegExp("^msg_\\d+_" + m[1] + "\\.json$").test(x));
  if (bank) menuBanks[m[1]] = addBank(bank.replace(/\.json$/, ""));
}

const out = path.join(__dirname, "lib/johto-script-data.generated.js");
fs.writeFileSync(out, "// Johto's in-game trades, songs by number and menus' texts (tools/build-johto-script-data.js, from pret/pokeheartgold).\n" +
  "(function () {\n" +
  "  const J = window.JOHTO_SCRIPTS;\n" +
  "  if (!J) return;\n" +
  "  J.trades = " + JSON.stringify(trades) + ";\n" +
  "  J.sounds = " + JSON.stringify(sounds) + ";\n" +
  "  J.tutors = " + JSON.stringify({ Headbutt: headbutt }) + ";\n" +
  "  Object.assign(J.messages, " + JSON.stringify(messages) + ");\n" +
  "  const banks = " + JSON.stringify(menuBanks) + ";\n" +
  "  for (const z in banks) if (J.zones[z]) J.zones[z].menuBank = banks[z];\n" +
  "})();\n");
console.log("wrote " + path.relative(root, out) + ": " + trades.length + " trades, " + Object.keys(sounds).length + " songs, " +
  Object.keys(messages).length + " menu texts, " + Object.keys(menuBanks).length + " zones' menus");
trades.forEach((t, i) => console.log(i, t.nickname, t.gives, "for", t.wants, t.ability, t.nature, t.gender, t.item || t.heldItem, t.ot.name, t.ot.id));
