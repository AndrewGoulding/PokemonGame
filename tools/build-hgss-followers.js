// HeartGold and SoulSilver's walking Pokémon (the follower: your party's
// first Pokémon walking behind you), from a pret/pokeheartgold checkout.
//
//   node tools/build-hgss-followers.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// Writes:
//   assets/world/sprites/follow/<dex no>.png   each species' overworld sheet,
//       in FireRed's frame order (stand down, up, left; walk down x2, up x2,
//       left x2; right is left mirrored, as HGSS's are), 32x32 frames, or
//       64x64 for the big ones (Lugia, Steelix ...). HGSS's own
//       (files/data/mmodel: MMODEL_FOLLOWER_MON_*, every species to Arceus)
//       and their forms: <dex no>-f (a female's own look), 201-b ... (Unown's
//       letters), 386-attack, 412-sandy, 479-heat, 493-fire and the like. For
//       the species and forms HGSS hasn't got, FireRed's look: the party icon
//       (assets/sprites/icons, its two frames as the steps).
//   tools/lib/johto-followers.generated.js   window.JOHTO_FOLLOWERS (appended
//       to data/johto-maps.js by tools/build-johto.js): which sheets are
//       HGSS's, which are 64x64, which are too tall to follow you indoors
//       (files/fielddata/tsurepoke/tp_param.csv's too_tall), Johto's maps'
//       follow modes (src/data/map_headers.h's followMode: 0 none, 1 not the
//       tall ones, 2 all), and the mood lines talking to it shows
//       (files/msgdata/msg/msg_0265.json, the follower's bank: a subset, by
//       mood and place).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readPng, writePng } = require("./lib/png");
const N = require("./lib/nitro");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/data/mmodel"))) {
  console.error("Usage: node tools/build-hgss-followers.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
for (const f of ["dex.js", "dex-forms.js", "dex-gen7.js", "dex-gen8.js", "dex-gen9.js"]) {
  try { vm.runInThisContext(fs.readFileSync(path.join(root, "data", f), "utf8")); } catch (e) { /* (a later file's extras) */ }
}
window.WORLD_MAPS = {}; window.WORLD_TRAINERS = {}; window.ITEMS = {};
// (Johto's maps, as tools/build-johto.js made them: which HGSS map each is.)
vm.runInThisContext(fs.readFileSync(path.join(root, "data/johto-maps.js"), "utf8"));
const J = window.JOHTO_SCRIPTS;

const outDir = path.join(root, "assets/world/sprites/follow");
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (f.endsWith(".png")) fs.unlinkSync(path.join(outDir, f));

// HGSS's frames: up, down, left, right, two each -> FireRed's nine.
const FR_ORDER = [2, 0, 4, 3, 2, 1, 0, 5, 4];
function writeSheet(name, frames) {
  const s = frames[0].w, W = s * FR_ORDER.length, rgba = new Uint8ClampedArray(W * s * 4);
  FR_ORDER.forEach((f, n) => { for (let y = 0; y < s; y++) rgba.set(frames[f].rgba.subarray(y * s * 4, (y + 1) * s * 4), (y * W + n * s) * 4); });
  writePng(path.join(outDir, name + ".png"), W, s, rgba);
}

// ---------- HGSS's own ----------

const species = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/species.h"), "utf8").matchAll(/#define SPECIES_(\w+)\s+(\d+)\b/g)) if (+m[2] >= 1 && +m[2] <= 493) species[m[1]] = +m[2];
const speciesNames = Object.keys(species).sort((a, b) => b.length - a.length);
const mmodel = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/mmodel.h"), "utf8").matchAll(/#define MMODEL_FOLLOWER_MON_(\w+)\s+(\d+)/g)) mmodel[m[1]] = +m[2];
const tooTall = new Set();
for (const line of fs.readFileSync(path.join(ROOT, "files/fielddata/tsurepoke/tp_param.csv"), "utf8").split(/\r?\n/).slice(1)) {
  const c = line.split(",");
  if (c[2] === "true") tooTall.add(c[0].replace(/^TSURE_POKE_/, ""));
}
// A form's name here (the game's: Unown's letters as Party.form has them, Deoxys-Attack's "attack").
const FORM_NAMES = { A: "", NORMAL: "", WEST: "", QMARK: "question", EXCL: "exclamation", ATK: "attack", DEF: "defense", SPD: "speed" };
const hgss = [], big = [], tall = [];
for (const [model, index] of Object.entries(mmodel)) {
  const sp = speciesNames.find((s) => model === s || model.startsWith(s + "_"));
  if (!sp) continue;
  const suffix = model.slice(sp.length + 1);
  const form = suffix in FORM_NAMES ? FORM_NAMES[suffix] : suffix.toLowerCase();
  const name = species[sp] + (form ? "-" + form : "");
  const t = N.parseNsb(fs.readFileSync(path.join(ROOT, "files/data/mmodel/mmodel/mmodel_" + String(index).padStart(8, "0") + ".NSBTX"))).tex;
  const pal = t && Object.keys(t.palettes)[0];
  const names = t ? Object.keys(t.textures).sort((a, b) => +a.split(".").pop() - +b.split(".").pop()) : [];
  if (names.length < 8) { console.warn("skipped " + model + ": " + names.length + " frames"); continue; }
  const frames = names.slice(0, 8).map((k) => N.decodeTexture(t, k, pal));
  writeSheet(name, frames);
  hgss.push(name);
  if (frames[0].w > 32) big.push(name);
  if (tooTall.has(model)) tall.push(name);
}

// The game's forms with HGSS's sheets of their own (Rotom-Heat: 479-heat).
const have = new Set(hgss), byId = {};
for (const [n, d] of Object.entries(window.DEX)) (byId[d.id] = byId[d.id] || []).push(n);
const forms = {};
for (let id = 1; id <= 493; id++) {
  const prefix = (byId[id] || [""])[0].split("-")[0];
  for (const n of Object.keys(window.DEX)) {
    if (!prefix || !n.startsWith(prefix + "-") || window.DEX[n].id === id) continue;
    const sheet = id + "-" + n.slice(prefix.length + 1).toLowerCase();
    if (have.has(sheet)) forms[n] = sheet;
  }
}

// ---------- FireRed's look for the rest: the party icon ----------

const formSheets = new Set(Object.values(forms));
let fallbacks = 0;
for (const id of Object.keys(byId).map(Number).sort((a, b) => a - b)) {
  if (have.has(String(id)) || byId[id].every((n) => forms[n])) continue;
  const icon = path.join(root, "assets/sprites/icons", id + ".png");
  if (!fs.existsSync(icon)) continue;
  const p = readPng(icon);
  if (p.width !== 32 || p.height < 64) continue;
  // (Its two frames: standing, and the step; facing you whichever way it goes.)
  const f = [0, 1].map((k) => ({ w: 32, rgba: p.rgba.subarray(k * 32 * 32 * 4, (k + 1) * 32 * 32 * 4) }));
  writeSheet(String(id), [f[0], f[0], f[0], f[1], f[0], f[1], f[0], f[0]]);
  fallbacks++;
}
void formSheets;

// ---------- Johto's maps: may it follow you there? ----------

const MODES = { MAP_FOLLOWMODE_PREVENT: 0, MAP_FOLLOWMODE_HEIGHT_RESTRICT: 1, MAP_FOLLOWMODE_ALLOW: 2 };
const headers = fs.readFileSync(path.join(ROOT, "src/data/map_headers.h"), "utf8");
const modes = {};
for (const m of headers.matchAll(/\[(MAP_\w+)\]\s*=\s*\{([^}]*)\}/g)) {
  const mode = /\.followMode = (MAP_FOLLOWMODE_\w+)/.exec(m[2]);
  const name = J.mapConsts[m[1]];
  if (mode && name && window.WORLD_MAPS[name]) modes[name] = MODES[mode[1]];
}
// (The Pokémon Centers' upstairs: FireRed's Cable Club floor, as their 1F.)
for (const name of Object.keys(window.WORLD_MAPS)) {
  const below = name.replace(/_2F$/, "_1F");
  if (below !== name && window.WORLD_MAPS[name].region === "johto" && !(name in modes) && below in modes) modes[name] = modes[below];
}

// ---------- What it does when you talk to it (msg_0265) ----------

const bank = JSON.parse(fs.readFileSync(path.join(ROOT, "files/msgdata/msg/msg_0265.json"), "utf8")).messages;
// HGSS text as this game's pages ({MON}: its name, {PLAYER}: yours).
function pages(i) {
  const s = [].concat(bank[i].en_US || []).join("").replace(/\{STRVAR_1 1, \d+, \d+\}/g, "{MON}").replace(/\{STRVAR_1 3, \d+, \d+\}/g, "{PLAYER}")
    .replace(/\{(?!MON\}|PLAYER\})[^}]*\}/g, "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  return s.split(/[\r\f]/).map((p) => p.replace(/\n$/, "").trimEnd()).filter((p) => p.trim());
}
const LINES = {
  // (By its friendship: 200 on, 150, 70, and below.)
  best: [18, 21, 52, 53, 55, 59, 61, 69, 115, 117],
  good: [22, 24, 29, 48, 50, 57, 62, 64, 109, 176, 177, 272, 385],
  fair: [28, 34, 58, 87, 88, 150, 153, 195, 273, 312, 322, 343],
  low: [15, 66, 165, 203, 205, 232],
  // (How it is: poisoned, burned, its HP low.)
  poisoned: [395], burned: [328], weak: [95, 359],
  // (Where you are: tall grass, a cave, indoors, by the water, the time of day.)
  grass: [157, 158, 369, 372, 376], cave: [127, 161, 310], indoor: [228, 384], water: [113, 261],
  night: [348], morning: [81],
  // (Holding something it found: take it?)
  item: [0]
};
const lines = Object.fromEntries(Object.entries(LINES).map(([k, ids]) => [k, ids.map(pages)]));

const out = { hgss, big, tall, forms, modes, lines };
fs.writeFileSync(path.join(__dirname, "lib/johto-followers.generated.js"),
  "// The walking Pokémon (tools/build-hgss-followers.js, from pret/pokeheartgold): its sheets, Johto's follow modes, its lines.\n" +
  "window.JOHTO_FOLLOWERS = " + JSON.stringify(out) + ";\n");
console.log("wrote " + hgss.length + " HGSS sheets (" + big.length + " big, " + tall.length + " too tall indoors), " +
  fallbacks + " from party icons, " + Object.keys(modes).length + " maps' follow modes");
