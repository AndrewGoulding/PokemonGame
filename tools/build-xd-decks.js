// Pokémon XD's Trainers and Shadow Pokémon, from your own copy of the game: its
// deck_archive.fsys (every battle's party: the story's, the Orre Colosseum's,
// Mt. Battle's hundred, the Battle Sim's and the rest) and common.fsys (its
// Shadow Pokémon, and common.rel's tables of species, items and Trainer
// classes), from the disc's files folder (extracted with Dolphin: right-click
// the game, Properties, Filesystem, Extract Entire Disc). Written, in this
// game's own names for species, moves and items, to data/xd-decks.js.
//
//   node tools/build-xd-decks.js <the disc's files folder>
//
// (Its names come from assets/text/xd.json, tools/build-colosseum-text.js's.)
//
// A deck (DeckData_*.bin): "DECK", then its sections, each a 16-byte header
// (its tag, its size, its count) and its entries:
//   DTNR, Trainers (56 bytes): 0x04 which party slots are Shadow Pokémon (a bit
//     each), 0x05 the class (common.rel's class table), 0x06 the name (a string
//     of common_rel), 0x18 a battle line (a string of fight), 0x1C the party
//     (six u16: DPKM entries, or DDPK entries where the Shadow bit is set).
//   DPKM, Pokémon (32 bytes): 0x00 species (the GBA games' own numbering:
//     common.rel's species table), 0x02 level, 0x03 friendship, 0x04 held item
//     (the GBA games' numbering: common.rel's item table), 0x14 four moves
//     (common.rel's move table: Gen 3's numbering, then XD's Shadow moves from
//     356), 0x1E nature and gender (kept as they are).
//   DDPK (DeckData_DarkPokemon), Shadow Pokémon (24 bytes): 0x01 catch rate,
//     0x02 level, 0x06 the story deck's DPKM entry it is, 0x08 its heart
//     gauge, 0x0C its Shadow moves.
// (The European disc has each deck twice, the _EU one with women's classes
// their own: a Trainer is a woman there when their class is one of the
// table's second set. The classes themselves are the plain deck's.)
"use strict";

const fs = require("fs");
const path = require("path");

function lzss(src, size) {
  const N = 4096, F = 18, buf = new Uint8Array(N), out = Buffer.alloc(size);
  let r = N - F, i = 0, o = 0, flags = 0;
  while (o < size && i < src.length) {
    flags >>= 1;
    if (!(flags & 0x100)) flags = src[i++] | 0xff00;
    if (flags & 1) { const c = src[i++]; out[o++] = c; buf[r] = c; r = (r + 1) & (N - 1); continue; }
    if (i + 1 >= src.length) break;
    const a = src[i++], b = src[i++], pos = a | ((b & 0xf0) << 4), len = (b & 0x0f) + 3;
    for (let k = 0; k < len && o < size; k++) { const c = buf[(pos + k) & (N - 1)]; out[o++] = c; buf[r] = c; r = (r + 1) & (N - 1); }
  }
  return out;
}
function unpack(file) {
  const d = fs.readFileSync(file);
  if (d.toString("latin1", 0, 4) !== "FSYS") throw new Error(file + " isn't an .fsys archive");
  const files = {}, n = d.readUInt32BE(0x0c);
  for (let k = 0; k < n; k++) {
    const e = d.readUInt32BE(0x60 + 4 * k);
    const start = d.readUInt32BE(e + 4), size = d.readUInt32BE(e + 8), packed = d.readUInt32BE(e + 0x14), nameAt = d.readUInt32BE(e + 0x24);
    const name = d.toString("latin1", nameAt, d.indexOf(0, nameAt));
    const blob = d.subarray(start, start + packed);
    files[name] = blob.toString("latin1", 0, 4) === "LZSS" ? lzss(blob.subarray(16), size) : blob.subarray(0, size);
  }
  return files;
}

// ---------- The game's own names ----------

const root = path.join(__dirname, "..");
global.window = global;
require(path.join(root, "data/dex.js"));
require(path.join(root, "data/moves.js"));
require(path.join(root, "data/items.js"));
const TEXT = JSON.parse(fs.readFileSync(path.join(root, "assets/text/xd.json"), "utf8"));
const NAMES = Object.assign({}, ...Object.values(TEXT));
const norm = (s) => String(s).toLowerCase().replace(/♀/g, "f").replace(/♂/g, "m").replace(/[^a-z0-9]/g, "");
const byNorm = (keys) => { const m = {}; for (const k of keys) m[norm(k)] = k; return m; };
const SPECIES = byNorm(Object.keys(window.DEX)), MOVES = byNorm(Object.keys(window.MOVES)), ITEMS = byNorm(Object.keys(window.ITEMS));
// (Gen 3's names that later games changed.)
const MOVE_RENAMES = { faintattack: "Feint Attack", smellingsalt: "Smelling Salts", hijumpkick: "High Jump Kick", vicegrip: "Vise Grip" };
const SPECIES_RENAMES = { deoxys: "Deoxys-Normal" };
const ITEM_RENAMES = { stick: "stick" };
const missing = new Set();
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s.\-&])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/Pokémon/gi, "Pokémon").replace(/Poké/g, "Poké");
const species = (s) => SPECIES_RENAMES[norm(s)] || SPECIES[norm(s)] || (missing.add("species " + s), titleCase(s));
let moveNames = [];
const move = (id) => {
  if (!id) return null;
  const s = moveNames[id];
  if (!s) { missing.add("move #" + id); return null; }
  return MOVE_RENAMES[norm(s)] || MOVES[norm(s)] || (missing.add("move " + s), titleCase(s));
};

// ---------- common.rel's tables ----------

// (Each found by its entries' names: string ids that run 1001, 1002, 1003 at a fixed stride; and, as other lists
// can run that way too, a known entry checked: `check` [index, name].)
function tableOf(rel, first, size, check) {
  for (let o = 0; o + 3 * size + 4 <= rel.length; o += 2) {
    if (rel.readUInt32BE(o) !== first || rel.readUInt32BE(o + size) !== first + 1 || rel.readUInt32BE(o + 2 * size) !== first + 2) continue;
    const base = o - size, at = base + check[0] * size;
    if (at + 4 <= rel.length && NAMES[rel.readUInt32BE(at)] === check[1]) return base;
  }
  throw new Error("no table of " + first + " at " + size);
}
function names(rel, base, size, count) {
  const out = [];
  for (let i = 0; i < count && base + i * size + 4 <= rel.length; i++) out.push(NAMES[rel.readUInt32BE(base + i * size)] || null);
  return out;
}

// ---------- Decks ----------

function sections(d) {
  const out = {};
  for (let o = 0x10; o + 16 <= d.length;) {
    const tag = d.toString("latin1", o, o + 4), size = d.readUInt32BE(o + 4), count = d.readUInt32BE(o + 8);
    if (!/^D[A-Z]{3}$/.test(tag) || size < 16) break;
    out[tag] = { at: o + 16, size, count };
    o += size;
  }
  return out;
}

(function main() {
  const dir = process.argv[2];
  if (!dir || !fs.existsSync(path.join(dir, "deck_archive.fsys")) || !fs.existsSync(path.join(dir, "common.fsys"))) {
    console.error("Usage: node tools/build-xd-decks.js <XD's files folder, with deck_archive.fsys and common.fsys>");
    process.exit(1);
  }
  const common = unpack(path.join(dir, "common.fsys")), decks = unpack(path.join(dir, "deck_archive.fsys"));
  const rel = common.common_rel;
  const SPECIES_AT = tableOf(rel, 1001, 0x124, [251, "CELEBI"]), ITEMS_AT = tableOf(rel, 5001, 0x28, [200, "LEFTOVERS"]);
  const MOVES_AT = tableOf(rel, 2001, 0x38, [354, "PSYCHO BOOST"]), CLASSES_AT = tableOf(rel, 7004, 12, [0, "CIPHER ADMIN"]) - 6 * 12;   // (7004, Thug, is class 7)
  const speciesNames = names(rel, SPECIES_AT, 0x124, 415), itemNames = names(rel, ITEMS_AT, 0x28, 445);
  moveNames = names(rel, MOVES_AT, 0x38, 375);
  const classes = names(rel, CLASSES_AT, 12, 50).map((c) => (c ? titleCase(c) : null));
  const item = (id) => {
    if (!id) return null;
    const s = itemNames[id];
    return s ? ITEM_RENAMES[norm(s)] || ITEMS[norm(s)] || (missing.add("item " + s), norm(s)) : (missing.add("item #" + id), null);
  };
  // (Classes 40 on are the second set: women's, in the European decks.)
  const SECOND_SET = 40;

  const story = decks["DeckData_Story.bin"];
  const storyPokemon = (i) => {
    const s = sections(story).DPKM, e = story.subarray(s.at + i * 32, s.at + i * 32 + 32);
    const sp = e.readUInt16BE(0);
    if (!sp) return null;
    return { species: species(speciesNames[sp] || "?"), level: e[2], friendship: e[3], item: item(e.readUInt16BE(4)),
      moves: [0, 1, 2, 3].map((k) => move(e.readUInt16BE(0x14 + 2 * k))).filter(Boolean), traits: e.readUInt16BE(0x1e) };
  };

  // The Shadow Pokémon.
  const dark = decks["DeckData_DarkPokemon.bin"] || common["DeckData_DarkPokemon.bin"], dd = sections(dark).DDPK;
  const shadow = [null];
  for (let i = 1; i < dd.count; i++) {
    const e = dark.subarray(dd.at + i * 24, dd.at + i * 24 + 24), entry = e.readUInt16BE(6);
    const mon = entry ? storyPokemon(entry) : null;
    shadow.push(mon && Object.assign({ id: i, entry, catchRate: e[1], heart: e.readUInt16BE(8),
      shadowMoves: [0, 1, 2, 3].map((k) => move(e.readUInt16BE(0x0c + 2 * k))).filter(Boolean) }, mon, { level: e[2] || mon.level }));
  }

  // A deck's Trainers: { index: { name, cls, female, line, party: [Pokémon, or { shadow: id }] } }.
  function trainersOf(file) {
    const d = decks[file], eu = decks[file.replace(/\.bin$/, "_EU.bin")], S = sections(d);
    if (!S.DTNR) return {};
    const out = {};
    for (let i = 1; i < S.DTNR.count; i++) {
      const o = S.DTNR.at + i * 56, e = d.subarray(o, o + 56), nameId = e.readUInt16BE(6);
      if (!nameId) continue;
      const mask = e[4], party = [];
      for (let k = 0; k < 6; k++) {
        const v = e.readUInt16BE(0x1c + 2 * k);
        if (!v) continue;
        if (mask & (1 << k)) party.push({ shadow: v });
        else {
          const at = S.DPKM.at + v * 32, p = d.subarray(at, at + 32), sp = p.readUInt16BE(0);
          if (sp) party.push({ species: species(speciesNames[sp] || "?"), level: p[2], friendship: p[3], item: item(p.readUInt16BE(4)),
            moves: [0, 1, 2, 3].map((m) => move(p.readUInt16BE(0x14 + 2 * m))).filter(Boolean), traits: p.readUInt16BE(0x1e) });
        }
      }
      const female = !!(eu && eu[o + 5] >= SECOND_SET);
      out[i] = { name: titleCase(NAMES[nameId] || "?"), cls: classes[e[5]] || null, female, line: e.readUInt16BE(0x18) || null, party };
    }
    return out;
  }
  const DECKS = { story: "DeckData_Story.bin", colosseum: "DeckData_Colosseum.bin", hundred: "DeckData_Hundred.bin",
    virtual: "DeckData_Virtual.bin", imasugu: "DeckData_Imasugu.bin", bingo: "DeckData_Bingo.bin" };
  const out = { classes, shadow };
  for (const [key, file] of Object.entries(DECKS)) if (decks[file]) out[key] = trainersOf(file);

  const file = path.join(root, "data/xd-decks.js");
  fs.writeFileSync(file, "// Generated by tools/build-xd-decks.js from Pokémon XD's deck_archive.fsys and common.fsys. Do not edit by hand.\n" +
    "// classes: Trainer classes by index; shadow: XD's Shadow Pokémon by id (1 on); story, colosseum, hundred (Mt. Battle),\n" +
    "// virtual (the Battle Sim), imasugu, bingo: each deck's Trainers by index, { name, cls, female, line, party }.\n" +
    "window.XD_DECKS = " + JSON.stringify(out) + ";\n");
  const count = (k) => Object.keys(out[k] || {}).length;
  console.log("wrote " + file + ": " + shadow.filter(Boolean).length + " Shadow Pokémon; trainers: " +
    Object.keys(DECKS).map((k) => k + " " + count(k)).join(", "));
  if (missing.size) console.log("not matched to this game's names: " + [...missing].join("; "));
})();
