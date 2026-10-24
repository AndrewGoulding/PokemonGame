// Builds Sinnoh from a Pokémon Essentials project of Sinnoh (an RPG Maker XP project: Data/*.rxdata,
// Graphics/Tilesets, Graphics/Autotiles, Audio/BGM, PBS/map_connections.txt, map_metadata.txt and encounters.txt):
// every map of Sinnoh it has, 157 of them (its towns and cities, routes, caves, lakes, gates, Pokémon Centers and
// Poké Marts; not Essentials's own sample maps), joined as it joins them. Sandgem Town, which has no insides in it,
// gets copies of Jubilife's Pokémon Center and Poké Mart and of Essentials's lab, for Prof. Rowan's.
//
//   node tools/build-sinnoh.js <path to the project>   (or set SINNOH_ESSENTIALS; needs Ruby, for the .rxdata files,
//                                                        and uses ffmpeg, if it's there, to make the music smaller)
//
// RPG Maker XP's maps are three layers of 32x32 tiles: tile ids 384 and up are the tileset's picture (8 to a row),
// 48 to 383 its seven autotiles (48 ids each, put together from 16x16 quarters: AUTOTILE), 0 nothing. A tile's
// priority puts it over the people (here: the map's -top picture), its passage bits make it solid (looked at from
// the top layer down, to the first one under the people: Game_Map#passable?) and its terrain tag (Essentials's:
// grass, sand, water, ledges, bridges...) is what it is (here: FireRed's behaviours). The Essentials graphics are the
// DS games' at twice the size, so each map is drawn at 32 px a tile and halved. Animated autotiles (the sea, the
// flowers) are the map's -anim cells (ui/overworld.js TILE_ANIMS's s_auto4, s_auto5 and s_auto8). Every tile the
// maps use is in the project's tilesets: none is borrowed or drawn here.
//
// The maps' events become this game's: Transfer Player events doors and warps (doors into buildings walked into
// going up, the insides' mats walked off, the rest stepped on), Item and HiddenItem events item balls and hidden
// items, CutTree, SmashRock and StrengthBoulder events FireRed's trees, rocks and boulders (their scripts:
// EventScript_CutTree...), BerryPlant events berry trees (Hoenn's engine: ui/berry-farm.js, "SinnohBerry_Tree_n"),
// signs (text with nobody there) signs, and the nurses, PCs, clerks (their stock by Badges), the ferryman to Iron
// Island and the fossil scientist theirs. (Its trainers are placeholders, with no teams: left out.)
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png, -anim.png
//   assets/audio/sinnoh/<song>.ogg   the maps' music (the project's Audio/BGM: recordings of DPPt's), played by
//                                    ui/audio.js as "dp_" songs, looping where the files' LOOPSTART and LOOPLENGTH say
//   assets/world/sprites/dp_rowan.png
//   data/orre-maps.js   window.WORLD_MAPS entries for them, after Orre's (from "// Sinnoh" on: this file's part),
//                       window.SINNOH_MUSIC (the songs' files and loops) and window.SINNOH_BERRY_TREES (the trees'
//                       Berries, all grown at the start)
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { readPng, writePng } = require("./lib/png");
const { writeAnimSheet } = require("./lib/fr-tiles");

const PROJ = process.argv[2] || process.env.SINNOH_ESSENTIALS;
if (!PROJ || !fs.existsSync(path.join(PROJ, "Data/MapInfos.rxdata"))) {
  console.error("Usage: node tools/build-sinnoh.js <path to the Essentials project>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const outMaps = path.join(root, "assets/world/maps");

const tmp = path.join(require("os").tmpdir(), "sinnoh-" + process.pid + ".json");
execFileSync("ruby", [path.join(__dirname, "lib/rmxp-dump.rb"), PROJ, tmp, "all"], { maxBuffer: 1 << 30 });
const RX = JSON.parse(fs.readFileSync(tmp, "utf8"));
fs.unlinkSync(tmp);

// ---------- Which maps, and what they're called ----------

const INFO = Object.fromEntries(RX.infos.map(([id, name, parent]) => [id, { id, name, parent }]));
// (Essentials's own sample maps are all under one: "Default essentials stuff".)
const topOf = (id) => { let i = INFO[id]; while (i && i.parent) i = INFO[i.parent]; return i; };
const SAMPLES = RX.infos.find(([, name]) => /^Default essentials/i.test(name))[0];
// map_metadata.txt: which are outdoors.
const OUTDOOR = new Set();
{
  let id = null;
  for (const raw of fs.readFileSync(path.join(PROJ, "PBS/map_metadata.txt"), "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const head = /^\[(\d+)\]/.exec(raw);
    if (head) id = +head[1];
    else if (id != null && /^\s*Outdoor\s*=\s*true/i.test(raw)) OUTDOOR.add(id);
  }
}
// Names as the games call them (the project's working names, typos and filler maps).
const TITLES = { "Route 205 Eterna side": "Route 205", "Route 205 Floaroma side": "Route 205", "Route 225 more": "Route 225",
  "Stark Mountian": "Stark Mountain", "Victory Road ADD FOG": "Victory Road", "Solaceon Town filler trees": "Solaceon Town",
  "Eterna south tree filler": "Eterna City", "Eterna north tree filler": "Eterna City", "Eterna east rock filler": "Eterna City",
  "Eterna southeast rock filler": "Eterna City", "Route 218 Gate": "Route 218", "Route 208 Gate": "Route 208", "Route 209 Gate": "Route 209",
  "Route 228 Gate": "Route 228", "Route 225 Gate": "Route 225", "Cycling Road South Gate": "Cycling Road", "Cycling Road North Gate": "Cycling Road" };
const camel = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("");
const CAVE = /Cave|Mine|Mt\. Coronet|Mountain|Mountian|Cavern|Tunnel|Ruins|Victory Road|Temple|Spear Pillar|Iron Island|Ravaged Path|Oreburgh Gate|Wayward/;
const MAPS = [];
const usedNames = {};
for (const [id, raw] of RX.infos.slice().sort((a, b) => a[0] - b[0])) {
  if (!RX.maps[id] || (topOf(id) || {}).id === SAMPLES || id === SAMPLES) continue;
  const name0 = raw.trim(), title = TITLES[name0] || name0.replace(/ Poke Center$| Mart$/, "");
  let name = / Poke Center$/.test(name0) ? camel(name0.replace(/ Poke Center$/, "")) + "_PokemonCenter_1F"
    : / Mart$/.test(name0) ? camel(name0.replace(/ Mart$/, "")) + "_Mart" : / Gate$/.test(name0) ? camel(name0.replace(/ Gate$/, "")) + "_Gate" : camel(name0);
  usedNames[name] = (usedNames[name] || 0) + 1;
  if (usedNames[name] > 1) name += "_" + usedNames[name];
  const outdoor = OUTDOOR.has(id);
  const type = outdoor ? (/ Town$/.test(title) ? "town" : / City$/.test(title) ? "city" : "route") : CAVE.test(name0) ? "underground" : "indoor";
  MAPS.push({ id, name, title, type, outdoor });
}
// Sandgem Town's insides (none in the project: copies of Jubilife's and Essentials's lab, `src`), in `parent`, through
// the door at `door` there (Sandgem's doors aren't events in the project: where they are on its map).
MAPS.push({ src: 133, kind: "center", parent: "SandgemTown", door: [17, 9], name: "SandgemTown_PokemonCenter_1F" },
  { src: 134, kind: "mart", parent: "SandgemTown", door: [27, 9], name: "SandgemTown_Mart" },
  { src: 4, kind: "lab", parent: "SandgemTown", door: [9, 9], name: "SandgemTown_RowansLab" });
for (const m of MAPS) if (m.src) Object.assign(m, { title: MAPS.find((p) => p.name === m.parent).title, type: "indoor" });
const byId = Object.fromEntries(MAPS.filter((m) => m.id).map((m) => [m.id, m]));
const mapConst = (name) => "MAP_" + name.replace(/([a-z])([A-Z0-9])/g, "$1_$2").toUpperCase();

// Sandgem Town's beach, where the S.S. Tidal drops anchor: its sailor (ui/game.js sinnohSailor), who rows you out to
// it and back to Lilycove.
const SAILOR = { map: "SandgemTown", x: 25, y: 30 };
// Prof. Rowan, and his aide, in his lab.
const ROWAN = ["Rowan: Hm? So you are the Trainer\nwho came across the sea.", "I am Rowan. I study Pokémon here\nin Sinnoh, and how they evolve.",
  "Nine in ten Pokémon are thought to be\nlinked to evolution in some way.", "Go out and see Sinnoh's Pokémon for\nyourself. Route 202 leads north to\nJubilife City."];
const AIDE = ["The Professor came back to Sinnoh\nfrom Kanto four years ago.", "He's stern, but he cares deeply\nabout Pokémon, and Trainers too."];

// ---------- Music ----------
//
// Each map's song, the project's BGM file it plays (by day: the _n files are night's), as a "dp_" song.
const BGM = path.join(PROJ, "Audio/BGM");
const SONGS = {};
const songOf = (bgm) => {
  const file = bgm && bgm.name && bgm.name.replace(/_n$/, "");
  if (!file || !fs.existsSync(path.join(BGM, file + ".ogg"))) return null;
  const name = "dp_" + file.replace(/^(DPPT|RSE) \d+ /, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  SONGS[name] = file;
  return name;
};

// ---------- Pictures ----------

const pics = {};
function picture(file) {
  if (!(file in pics)) {
    const f = [".png", ".PNG"].map((e) => file + e).find((x) => fs.existsSync(x));
    if (!f) { pics[file] = null; return null; }
    const p = readPng(f);
    // (A palette PNG: its colours, index 0 clear.)
    if (!p.rgba) {
      const rgba = new Uint8ClampedArray(p.width * p.height * 4);
      p.px.forEach((v, i) => { const c = p.palette[v] || [0, 0, 0]; rgba.set([c[0], c[1], c[2], c.length > 3 ? c[3] : 255], i * 4); });
      p.rgba = rgba;
    }
    pics[file] = p;
  }
  return pics[file];
}
// RPG Maker XP's autotiles: for each of the 48 shapes, its four 16x16 quarters (top left, top right, bottom left,
// bottom right), numbered from 1 across the autotile's 96x128 picture, six to a row.
const AUTOTILE = [
  [27, 28, 33, 34], [5, 28, 33, 34], [27, 6, 33, 34], [5, 6, 33, 34], [27, 28, 33, 12], [5, 28, 33, 12], [27, 6, 33, 12], [5, 6, 33, 12],
  [27, 28, 11, 34], [5, 28, 11, 34], [27, 6, 11, 34], [5, 6, 11, 34], [27, 28, 11, 12], [5, 28, 11, 12], [27, 6, 11, 12], [5, 6, 11, 12],
  [25, 26, 31, 32], [25, 6, 31, 32], [25, 26, 31, 12], [25, 6, 31, 12], [15, 16, 21, 22], [15, 16, 21, 12], [15, 16, 11, 22], [15, 16, 11, 12],
  [29, 30, 35, 36], [29, 30, 11, 36], [5, 30, 35, 36], [5, 30, 11, 36], [39, 40, 45, 46], [5, 40, 45, 46], [39, 6, 45, 46], [5, 6, 45, 46],
  [25, 30, 31, 36], [15, 16, 45, 46], [13, 14, 19, 20], [13, 14, 19, 12], [17, 18, 23, 24], [17, 18, 11, 24], [41, 42, 47, 48], [5, 42, 47, 48],
  [37, 38, 43, 44], [37, 6, 43, 44], [13, 18, 19, 24], [13, 14, 43, 44], [37, 42, 43, 48], [17, 18, 47, 48], [13, 18, 43, 48], [1, 2, 7, 8]
];
// A tileset's pictures: the tiles, and its autotiles (each with its number of frames: 96 px a frame, or one 32x32 tile).
function tilesetOf(ts) {
  const autos = ts.autotile_names.map((n) => {
    const p = n ? picture(path.join(PROJ, "Graphics/Autotiles", n)) : null;
    if (!p) return null;
    const small = p.height <= 32;   // (a single tile, its frames across)
    return { pic: p, small, frames: Math.max(1, Math.floor(p.width / (small ? 32 : 96))) };
  });
  return { ts, tiles: picture(path.join(PROJ, "Graphics/Tilesets", ts.tileset_name)), autos };
}
// Draws tile `id` at (dx, dy) of a 32-px-a-tile RGBA picture (frame `frame` of an animated autotile).
function drawTile(T, out, ow, id, dx, dy, frame) {
  const copy = (src, sx, sy, w, h, tx, ty) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = ((sy + y) * src.width + sx + x) * 4;
      if (sx + x >= src.width || sy + y >= src.height || src.rgba[si + 3] < 128) continue;
      const di = ((ty + y) * ow + tx + x) * 4;
      out[di] = src.rgba[si]; out[di + 1] = src.rgba[si + 1]; out[di + 2] = src.rgba[si + 2]; out[di + 3] = 255;
    }
  };
  if (id >= 384) {
    const t = id - 384;
    if (T.tiles) copy(T.tiles, (t % 8) * 32, Math.floor(t / 8) * 32, 32, 32, dx, dy);
    return;
  }
  const a = T.autos[Math.floor(id / 48) - 1];
  if (!a) return;
  const f = (frame || 0) % a.frames;
  if (a.small) { copy(a.pic, f * 32, 0, 32, 32, dx, dy); return; }
  AUTOTILE[id % 48].forEach((q, i) => {
    const n = q - 1;
    copy(a.pic, f * 96 + (n % 6) * 16, Math.floor(n / 6) * 16, 16, 16, dx + (i % 2) * 16, dy + (i >> 1) * 16);
  });
}
const animOf = (T, id) => (id >= 48 && id < 384 && T.autos[Math.floor(id / 48) - 1] && T.autos[Math.floor(id / 48) - 1].frames > 1 ? T.autos[Math.floor(id / 48) - 1].frames : 0);
// Halves a 32-px-a-tile picture (each 2x2 the top left pixel: the DS's pixels, doubled).
function halve(src, w, h) {
  const out = new Uint8ClampedArray((w >> 1) * (h >> 1) * 4);
  for (let y = 0; y < h >> 1; y++) for (let x = 0; x < w >> 1; x++) out.set(src.subarray(((y * 2) * w + x * 2) * 4, ((y * 2) * w + x * 2) * 4 + 4), (y * (w >> 1) + x) * 4);
  return out;
}

// ---------- What the tiles are ----------

// Essentials's terrain tags.
const TAG = { LEDGE: 1, GRASS: 2, SAND: 3, ROCK: 4, DEEP_WATER: 5, STILL_WATER: 6, WATER: 7, WATERFALL: 8, WATERFALL_CREST: 9,
  TALL_GRASS: 10, UNDERWATER_GRASS: 11, ICE: 12, NEUTRAL: 13, SOOT_GRASS: 14, BRIDGE: 15, PUDDLE: 16 };
// FireRed's behaviours for them (game/world.js MB).
const MB = { NORMAL: 0, TALL_GRASS: 0x02, LONG_GRASS: 0x03, POND_WATER: 0x10, DEEP_WATER: 0x11, WATERFALL: 0x13, OCEAN_WATER: 0x15,
  SAND: 0x21, ICE: 0x23, JUMP_EAST: 0x38, JUMP_WEST: 0x39, JUMP_NORTH: 0x3a, JUMP_SOUTH: 0x3b, LADDER: 0x61 };
const BEHAVIOR = { [TAG.GRASS]: MB.TALL_GRASS, [TAG.TALL_GRASS]: MB.LONG_GRASS, [TAG.SOOT_GRASS]: MB.TALL_GRASS, [TAG.SAND]: MB.SAND,
  [TAG.DEEP_WATER]: MB.DEEP_WATER, [TAG.STILL_WATER]: MB.POND_WATER, [TAG.WATER]: MB.POND_WATER, [TAG.WATERFALL]: MB.WATERFALL,
  [TAG.WATERFALL_CREST]: MB.POND_WATER, [TAG.ICE]: MB.ICE };
const WATER = new Set([MB.POND_WATER, MB.DEEP_WATER, MB.OCEAN_WATER]);

// ---------- Wild Pokémon (PBS/encounters.txt) ----------

global.window = global;
require(path.join(root, "data/dex.js"));
require(path.join(root, "data/items.js"));
const squash = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
const SPECIES = Object.fromEntries(Object.keys(window.DEX).map((n) => [squash(n), n]));
const ITEM = Object.fromEntries(Object.keys(window.ITEMS).map((n) => [squash(n), n]));
// (The project's typos: MAXELIXER, SUPEREPEL.)
Object.assign(ITEM, { MAXELIXER: "max-elixir", SUPEREPEL: "super-repel" });
const encounters = {};
{
  let id = null, kind = null;
  for (const raw of fs.readFileSync(path.join(PROJ, "PBS/encounters.txt"), "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const head = /^\[(\d+)\]/.exec(line);
    if (head) { id = +head[1]; encounters[id] = {}; continue; }
    if (id == null) continue;
    const parts = line.split(",").map((s) => s.trim());
    if (/^[A-Za-z]/.test(parts[0])) { kind = parts[0]; encounters[id][kind] = { rate: +parts[1] || 0, list: [] }; continue; }
    // (A form, UNOWN_1 or SHELLOS_1: the species.)
    // (NIDORANfE and NIDORANmA: Nidoran-F and Nidoran-M.)
    const species = SPECIES[squash(parts[1].replace(/_\d+$/, "").replace(/^NIDORAN(f)E$|^NIDORAN(m)A$/, "NIDORAN$1$2"))];
    if (!species) { if (byId[id]) console.warn("no such Pokémon: " + parts[1]); continue; }
    encounters[id][kind].list.push({ weight: +parts[0], species, min: +parts[2], max: +(parts[3] || parts[2]) });
  }
}
// One table from Essentials's morning, day and night lists (this game has no clock for encounters): each Pokémon as
// likely as it is over the three, in percent.
function merged(e, kinds) {
  const lists = kinds.map((k) => e[k]).filter(Boolean);
  if (!lists.length) return null;
  const all = new Map();
  for (const l of lists) {
    const sum = l.list.reduce((a, s) => a + s.weight, 0) || 1;
    for (const s of l.list) {
      const k = s.species + "/" + s.min + "/" + s.max;
      if (!all.has(k)) all.set(k, Object.assign({}, s, { weight: 0 }));
      all.get(k).weight += s.weight / sum / lists.length * 100;
    }
  }
  const slots = [...all.values()].sort((a, b) => b.weight - a.weight);
  const weights = slots.map((s) => Math.round(s.weight));
  weights[0] += 100 - weights.reduce((a, b) => a + b, 0);
  return { rate: Math.max(...lists.map((l) => l.rate)), weights, slots: slots.map(({ species, min, max }) => ({ species, min, max })) };
}
// A rod's table in Gen 4's five slots (40, 40, 15, 4, 1: game/world.js GEN4_ROD_WEIGHTS), each Pokémon in the slots
// that come nearest its share.
function rodSlots(l) {
  if (!l || !l.list.length) return null;
  const W5 = [40, 40, 15, 4, 1], sum = l.list.reduce((a, s) => a + s.weight, 0), want = l.list.map((s) => s.weight / sum * 100);
  let best = null;
  for (let code = 0; code < Math.pow(l.list.length, 5); code++) {
    const pick = [], got = l.list.map(() => 0);
    for (let i = 0, c = code; i < 5; i++, c = Math.floor(c / l.list.length)) { pick.push(c % l.list.length); got[c % l.list.length] += W5[i]; }
    const err = got.reduce((a, g, i) => a + Math.abs(g - want[i]), 0);
    if (!best || err < best.err) best = { err, pick };
  }
  return { slots: best.pick.map((i) => ({ species: l.list[i].species, min: l.list[i].min, max: l.list[i].max })) };
}

// ---------- Connections (PBS/map_connections.txt) ----------

const EDGE = { North: "up", South: "down", East: "right", West: "left" };
const connections = Object.fromEntries(MAPS.filter((m) => m.id).map((m) => [m.id, []]));
for (const raw of fs.readFileSync(path.join(PROJ, "PBS/map_connections.txt"), "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const line = raw.replace(/#.*/, "").trim();
  if (!line) continue;
  const [a, ea, oa, b, eb, ob] = line.split(",").map((s) => s.trim());
  const link = (from, edge, offFrom, to, offTo) => {
    if (!connections[from] || !byId[to]) return;
    // (Along the edge, where the other map's 0 is: Essentials gives the place on each that meets.)
    connections[from].push({ map: byId[to].name, mapConst: mapConst(byId[to].name), direction: EDGE[edge], offset: offFrom - offTo });
  };
  link(+a, ea, +oa, +b, +ob);
  link(+b, eb, +ob, +a, +oa);
}

// ---------- Text ----------

// Essentials's message codes out ({PLAYER} for \PN), and the words wrapped to FireRed's text box: two lines of 34 or so
// letters to a page.
function pages(lines) {
  const text = lines.join(" ").replace(/\\PN/g, "{PLAYER}").replace(/\\[a-z]+\[[^\]]*\]|\\[a-z]+/gi, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const rows = [];
  let row = "";
  for (const w of text.split(" ")) {
    if (row && (row + " " + w).length > 34) { rows.push(row); row = w; } else row = row ? row + " " + w : w;
  }
  if (row) rows.push(row);
  const out = [];
  for (let i = 0; i < rows.length; i += 2) out.push(rows.slice(i, i + 2).join("\n"));
  return out;
}
// An event's messages, page by page of its own (each Show Text, code 101, with its lines, 401).
function messages(list) {
  const out = [];
  for (const c of list) {
    if (c.code === 101) out.push([String(c.parameters[0])]);
    else if (c.code === 401 && out.length) out[out.length - 1].push(String(c.parameters[0]));
  }
  return out.map(pages).filter(Boolean).flat();
}

// ---------- The maps ----------

const out = {};
const animNames = ["s_auto4", "s_auto5", "s_auto8"];   // (ui/overworld.js TILE_ANIMS: an autotile of four frames, five, eight)
const sprites = path.join(root, "assets/world/sprites");
const frames = (sprite) => readPng(path.join(sprites, sprite + ".png")).width / 16;
const person = (id, def, x, y, sprite, movement, script, text, extra) => Object.assign({
  id, x, y, movement, rangeX: 0, rangeY: 0, script: def.name + "_EventScript_" + script, flag: null, text,
  localId: "LOCALID_" + squash(def.name) + "_" + squash(script), sprite, width: 16, height: 32, frames: frames(sprite) }, extra || {});
// Professor Rowan: Prof. Oak's overworld sprite in Rowan's colours: his sandy hair white, his white coat Rowan's dark
// brown one, his red shirt blue.
{
  const oak = readPng(path.join(sprites, "prof_oak.png"));
  const rgba = oak.rgba ? Uint8ClampedArray.from(oak.rgba) : new Uint8ClampedArray(oak.width * oak.height * 4);
  if (!oak.rgba) oak.px.forEach((v, i) => { if (v) { const c = oak.palette[v]; rgba.set([c[0], c[1], c[2], 255], i * 4); } });
  const ROWAN_COLOURS = {
    "205,172,98": [236, 236, 244], "123,115,65": [168, 168, 184], "57,57,24": [88, 88, 104],   // (hair)
    "255,255,255": [120, 92, 72], "197,197,213": [88, 66, 52], "139,139,148": [58, 44, 36],   // (coat)
    "230,106,74": [96, 128, 208], "148,57,41": [56, 80, 152]                                     // (shirt)
  };
  for (let i = 0; i < rgba.length; i += 4) {
    const to = rgba[i + 3] && ROWAN_COLOURS[rgba[i] + "," + rgba[i + 1] + "," + rgba[i + 2]];
    if (to) rgba.set(to, i);
  }
  writePng(path.join(sprites, "dp_rowan.png"), oak.width, oak.height, rgba);
}

// FireRed's trees to Cut, rocks to smash and boulders to push (data/world-maps.js's own, as they are there).
const FR = (() => {
  const W = {};
  const src = fs.readFileSync(path.join(root, "data/world-maps.js"), "utf8");
  const pick = (script) => { const m = new RegExp('\\{[^{}]*"script":"' + script + '"[^{}]*\\}').exec(src); return JSON.parse(m[0]); };
  for (const s of ["EventScript_CutTree", "EventScript_RockSmash", "EventScript_StrengthBoulder"]) W[s] = pick(s);
  return W;
})();
// The berry trees: their Berries (berrytree_ORANBERRY: Oran Berries), by tree number.
const BERRY_TREES = {};
// The people Essentials's characters are, here.
const NPC_SPRITES = { "NPC 16": "em_nurse", "NPC 19": "em_mart_employee", trainer_SCIENTIST: "scientist", trainer_SAILOR: "em_sailor", "NPC 18": "em_old_man" };
const sizeOf = (name) => { const m = /si[zx]e\((\d+)[,x](\d+)\)/.exec(name); return m ? [+m[1], +m[2]] : [1, 1]; };

for (const def of MAPS) {
  const m = RX.maps[def.id || def.src], T = tilesetOf(RX.tilesets[m.tileset_id]);
  const W = m.width, H = m.height, d = m.data.data, at = (x, y, z) => d[(z * H + y) * W + x];
  const pass = T.ts.passages.data, prio = T.ts.priorities.data, tags = T.ts.terrain_tags.data;
  // The pictures, at 32 px a tile: below the people and above them.
  const below = new Uint8ClampedArray(W * 32 * H * 32 * 4), above = new Uint8ClampedArray(W * 32 * H * 32 * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let z = 0; z < 3; z++) {
    const id = at(x, y, z);
    if (id) drawTile(T, prio[id] ? above : below, W * 32, id, x * 32, y * 32, 0);
  }
  // The animated autotiles under the people: each tile with one, drawn in every frame (all its layers below the
  // people), as 8x8 cells for ui/overworld.js drawAnimCells.
  const animPics = [], cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ids = [0, 1, 2].map((z) => at(x, y, z)).filter((id) => id && !prio[id]);
    const counts = [...new Set(ids.map((id) => animOf(T, id)).filter(Boolean))].sort();
    if (!counts.length) continue;
    // (Each frame count is one of animNames: the frames of all of them, the first counting fastest.)
    const used = counts.map((c) => animNames.indexOf("s_auto" + c));
    if (used.includes(-1)) { console.warn("an autotile of " + counts + " frames"); continue; }
    if (used.length > 1 && used[0] > used[1]) { console.warn("autotile frames out of order"); continue; }
    const total = counts.reduce((a, c) => a * c, 1), quarters = [[], [], [], []];
    for (let k = 0; k < total; k++) {
      const frameOf = {};
      for (let i = 0, r = k; i < counts.length; r = Math.floor(r / counts[i]), i++) frameOf[counts[i]] = r % counts[i];
      const t = new Uint8ClampedArray(32 * 32 * 4);
      for (const id of ids) drawTile(T, t, 32, id, 0, 0, frameOf[animOf(T, id)] || 0);
      const s = halve(t, 32, 32);
      for (let q = 0; q < 4; q++) {
        const c = new Uint8ClampedArray(8 * 8 * 4);
        for (let j = 0; j < 8; j++) c.set(s.subarray((((q >> 1) * 8 + j) * 16 + (q % 2) * 8) * 4, (((q >> 1) * 8 + j) * 16 + (q % 2) * 8 + 8) * 4), j * 32);
        quarters[q].push(c);
      }
    }
    const mask = used.reduce((a, u) => a | (1 << u), 0);
    for (let q = 0; q < 4; q++) {
      cells.push(x * 2 + (q % 2), y * 2 + (q >> 1), animPics.length, mask);
      animPics.push(...quarters[q]);
    }
  }
  const entry = {
    name: def.name, title: def.title, width: W, height: H, type: def.type, music: songOf(m.bgm), region: "sinnoh",
    cycling: def.type !== "indoor", showName: !!def.outdoor || def.type === "underground", top: true, borderWidth: 2, borderHeight: 2,
    collision: [], elevation: [], behavior: [], encounter: [],
    connections: connections[def.id] || [], warps: [], signs: [], triggers: [], hidden: [], people: [], wild: null
  };
  // What each tile is: solid (from the top layer down to the first under the people: Game_Map#passable?) and its
  // terrain tag (the top layer's first). A bridge you walk on, at any height (elevation 15).
  const ledges = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let solid = false, tag = 0;
    for (let z = 2; z >= 0; z--) {
      const id = at(x, y, z);
      if (!id) continue;
      if (!tag && tags[id]) tag = tags[id];
      if ((pass[id] & 0x0f) === 0x0f) { solid = true; break; }
      if (!prio[id]) break;
    }
    const b = BEHAVIOR[tag] || MB.NORMAL;
    if (tag === TAG.LEDGE) { ledges.push([x, y]); solid = false; }
    if (tag === TAG.BRIDGE) solid = false;
    entry.collision.push(solid && !WATER.has(b) ? 1 : 0);
    entry.elevation.push(tag === TAG.BRIDGE ? 15 : WATER.has(b) ? 1 : 3);
    entry.behavior.push(b);
    entry.encounter.push(0);
  }
  // Ledges: you jump them the way you'd go down them. Essentials's are tagged, not turned: a run of them across
  // (or a lone one) you jump going south; one up and down, east or west: away from the ledge across that meets
  // its foot (the raised ground's other side), else west.
  const isLedge = (x, y) => ledges.some(([lx, ly]) => lx === x && ly === y);
  for (const [x, y] of ledges) {
    const across = isLedge(x - 1, y) || isLedge(x + 1, y), upDown = isLedge(x, y - 1) || isLedge(x, y + 1);
    let b = MB.JUMP_SOUTH;
    if (upDown && !across) {
      let foot = y;
      while (isLedge(x, foot + 1)) foot++;
      const east = [foot, foot + 1].some((fy) => isLedge(x + 1, fy) && isLedge(x + 2, fy));
      const west = [foot, foot + 1].some((fy) => isLedge(x - 1, fy) && isLedge(x - 2, fy));
      b = west && !east ? MB.JUMP_EAST : MB.JUMP_WEST;
    }
    entry.behavior[y * W + x] = b;
  }
  // The events.
  const MB_PC = 0x83, MB_COUNTER = 0x80, at_ = (x, y) => y * W + x;
  let temp = 0;
  const flagName = (kind, item, x, y) => {
    const f = "FLAG_" + kind + squash(def.name) + "_" + squash(item);
    return [...entry.hidden, ...entry.people].some((p) => p.flag === f) ? f + "_" + x + "_" + y : f;
  };
  for (const [, ev] of m.events) {
    const page = ev.pages[0], list = page.list || [], g = page.graphic.character_name;
    const all = ev.pages.flatMap((p) => p.list || []);
    const script = list.map((c) => ((c.code === 111 && c.parameters[0] === 12) || c.code === 355 || c.code === 655 ? String(c.code === 111 ? c.parameters[1] : c.parameters[0]) : "")).join(" ");
    const item = /pbItemBall\(:(\w+)/.exec(script) || /pbReceiveItem\(:(\w+)/.exec(script);
    const [sw, sh] = sizeOf(ev.name);
    const tiles = [];
    for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) tiles.push([ev.x + i, ev.y - j]);
    // Item balls and hidden items.
    if (item && (/hidden/i.test(ev.name) || /item/i.test(ev.name))) {
      const id = ITEM[squash(item[1])];
      if (!id) { console.warn("no such item: " + item[1]); continue; }
      if (/hidden/i.test(ev.name)) entry.hidden.push({ x: ev.x, y: ev.y, item: id, flag: flagName("HIDDEN_ITEM_", id, ev.x, ev.y), quantity: 1 });
      else entry.people.push({ id: entry.people.length, x: ev.x, y: ev.y, movement: "face_down", rangeX: 0, rangeY: 0,
        script: def.name + "_EventScript_Item" + squash(id) + "_" + ev.x + "_" + ev.y, flag: flagName("ITEM_", id, ev.x, ev.y), text: null, item: id,
        sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
      continue;
    }
    // Trees to Cut, rocks to smash, boulders to push: FireRed's (a temporary flag each, as FireRed's: back when you
    // come back).
    const fr = /pbCut/.test(script) ? "EventScript_CutTree" : /pbRockSmash/.test(script) ? "EventScript_RockSmash" : /pbPushThisBoulder/.test(script) ? "EventScript_StrengthBoulder" : null;
    if (fr) {
      entry.people.push(Object.assign({}, FR[fr], { id: entry.people.length, x: ev.x, y: ev.y, flag: fr === "EventScript_StrengthBoulder" ? null : "FLAG_TEMP_" + (++temp) }));
      continue;
    }
    // Berry trees.
    const berry = /^berrytree_(\w+)$/.exec(g);
    if (/pbPickBerry/.test(script) || berry) {
      const n = Object.keys(BERRY_TREES).length + 1, id = berry && ITEM[squash(berry[1])];
      if (id) BERRY_TREES[n] = { berry: id, stage: 5 };
      entry.people.push({ id: entry.people.length, x: ev.x, y: ev.y, movement: "face_down", rangeX: 0, rangeY: 0, script: "SinnohBerry_Tree_" + n, flag: null, text: null,
        sprite: "berry_soil", width: 16, height: 32, frames: 9, localId: "LOCALID_" + squash(def.name) + "_BERRY_" + n });
      continue;
    }
    const go = all.find((c) => c.code === 201 && c.parameters[0] === 0);
    // Someone who takes you somewhere (Canalave's Eldritch, to Iron Island): a ferry, asked first.
    if (go && g && NPC_SPRITES[g]) {
      // (What he says on the page he sails on: Snowpoint's ferryman's first is Team Galactic's, which this game hasn't.)
      const say = messages(ev.pages.find((p) => (p.list || []).includes(go)).list);
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, NPC_SPRITES[g], ["", "", "face_down", "", "face_left", "", "face_right", "", "face_up"][page.graphic.direction] || "face_down",
        "Ferry" + entry.people.length, say.length ? say : ["Shall we set sail?"], { ferry: { id: go.parameters[1], x: go.parameters[2], y: go.parameters[3] } }));
      continue;
    }
    if (go) {
      for (const [x, y] of tiles) entry.warps.push({ x, y, to: { id: go.parameters[1], x: go.parameters[2], y: go.parameters[3] } });
      continue;
    }
    // The insides' people and machines.
    if (ev.name === "Nurse" && g) {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "em_nurse", "face_down", "Nurse", null));
      entry.behavior[at_(ev.x, ev.y + 1)] = MB_COUNTER;   // (the counter in front of her: Essentials's Nursemover)
      entry.center = { x: ev.x, y: ev.y + 2 };              // (where you wake up after blacking out, at the counter)
      entry.pokemonCenter = true;
      continue;
    }
    if (/pbPokeCenterPC/.test(script)) { entry.behavior[at_(ev.x, ev.y)] = MB_PC; continue; }
    if (/pbPokemonMart/.test(script) && g) {
      // (Its stock grows with your Badges: each pbPokemonMart list after "$player.badge_count >= n", and the last for
      // none. `mart` is that last; `martTiers`, [n, stock] from the most Badges down: ui/game.js picks by yours.)
      const tiers = [];
      let need = 0, items = null;
      for (const c of list) {
        const text = String(c.code === 111 ? c.parameters[1] : c.parameters[0]);
        if (c.code === 111) { const b = /badge_count >= (\d+)/.exec(text); need = b ? +b[1] : 0; }
        else if (c.code === 412 || (c.code === 0 && c.indent === 0)) need = 0;
        if (c.code === 355 && /pbPokemonMart\(\[/.test(text)) items = [];
        if (items && (c.code === 355 || c.code === 655)) for (const y of text.matchAll(/:(\w+)/g)) if (ITEM[squash(y[1])]) items.push(ITEM[squash(y[1])]);
        if (items && /\]\)/.test(text)) { tiers.push([need, items]); items = null; }
      }
      const base = (tiers.find(([n]) => n === 0) || [0, ["poke-ball", "potion"]])[1];
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "em_mart_employee", "face_down", "Clerk", ["Welcome!", "How may I serve you?"],
        { mart: base, martTiers: tiers.filter(([n]) => n > 0) }));
      entry.behavior[at_(ev.x, ev.y + 1)] = MB_COUNTER;
      continue;
    }
    if (/Fossil reviver/i.test(ev.name) && g) {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "scientist", "face_down", "FossilScientist", null));
      continue;
    }
    if (def.kind === "lab" && ev.name === "Professor") { entry.people.push(person(entry.people.length, def, ev.x, ev.y, "dp_rowan", "face_down", "Rowan", ROWAN)); continue; }
    if (def.kind === "lab" && ev.name === "Dex access") { entry.people.push(person(entry.people.length, def, ev.x, ev.y, "em_scientist_1", "face_right", "Aide", AIDE)); continue; }
    if (def.kind === "lab" && /ball$/.test(ev.name)) {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "item_ball", "face_down", "Ball" + ev.x,
        ["It's a Poké Ball. A Pokémon the\nProfessor caught is inside."], { width: 16, height: 16, frames: 1, inanimate: true }));
      continue;
    }
    if (def.src) continue;
    // Signs: something to read with nobody there (A on it: Action Button), and no more to it than its words.
    if (!g && page.trigger === 0 && list.some((c) => c.code === 101) && !list.some((c) => [102, 111, 122, 201, 355].includes(c.code))) {
      const text = messages(list);
      if (text.length) for (const [x, y] of tiles) entry.signs.push({ x, y, script: def.name + "_EventScript_Sign_" + ev.x + "_" + ev.y, text });
    }
  }
  if (def.name === SAILOR.map) entry.people.push(person(entry.people.length, def, SAILOR.x, SAILOR.y, "em_sailor", "face_up", "Sailor", null));
  // Wild Pokémon: the grass's (or, in a cave, the cave's: every step on its floor), the water's, the rods' and the
  // smashed rocks'.
  const e = (def.id && encounters[def.id]) || {};
  entry.wild = merged(e, ["LandMorning", "Land", "LandDay", "LandNight"]);
  const cave = merged(e, ["Cave", "CaveMorning", "CaveDay", "CaveNight"]);
  if (cave) {
    entry.wild = cave;
    for (let i = 0; i < W * H; i++) if (!entry.collision[i] && !WATER.has(entry.behavior[i])) entry.encounter[i] = 1;
  }
  entry.water = merged(e, ["Water"]);
  entry.rockSmash = merged(e, ["RockSmash"]);
  const rods = { "old-rod": rodSlots(e.OldRod), "good-rod": rodSlots(e.GoodRod), "super-rod": rodSlots(e.SuperRod) };
  if (Object.values(rods).some(Boolean)) entry.fishing = { rods: Object.fromEntries(Object.entries(rods).filter(([, v]) => v)) };

  const big = halve(below, W * 32, H * 32);
  writePng(path.join(outMaps, def.name + ".png"), W * 16, H * 16, big);
  writePng(path.join(outMaps, def.name + "-top.png"), W * 16, H * 16, halve(above, W * 32, H * 32));
  // (Past the edge where nothing joins on: outside, the map's top-left 2x2 tiles, its trees; inside, black.)
  const border = new Uint8ClampedArray(32 * 32 * 4);
  if (!def.outdoor) for (let i = 3; i < border.length; i += 4) border[i] = 255;
  else for (let y = 0; y < 32; y++) border.set(big.subarray((y * W * 16) * 4, (y * W * 16 + 32) * 4), y * 32 * 4);
  writePng(path.join(outMaps, def.name + "-border.png"), 32, 32, border);
  const animFile = path.join(outMaps, def.name + "-anim.png");
  if (animPics.length) {
    writeAnimSheet(animFile, animPics);
    entry.anim = { cells, anims: animNames };
  } else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
  out[def.name] = entry;
}
// (A map with no song of its own: the one it's in's, or a route's.)
for (const def of MAPS) {
  const e = out[def.name];
  if (e.music) continue;
  const parent = def.parent || (INFO[def.id] && INFO[def.id].parent && byId[INFO[def.id].parent] && byId[INFO[def.id].parent].name);
  e.music = (parent && out[parent] && out[parent].music) || songOf({ name: def.type === "underground" ? "DPPT 069 Mt. Coronet" : "DPPT 008 Route 201" });
}
// Ferries: where they go, by name.
for (const e of Object.values(out)) for (const p of e.people) if (p.ferry && p.ferry.id) {
  const to = byId[p.ferry.id];
  p.ferry = to ? { map: to.name, x: p.ferry.x, y: p.ferry.y } : null;
  if (!p.ferry) delete p.ferry;
}

// The ways between maps. A Transfer Player event becomes a warp to where it puts you:
// - in a building's wall outside (a solid tile, or one under it), a door, walked into going up (MB_WARP_DOOR);
// - inside a building, at the edge of the room (solid beyond it), its mat, walked off that way (down; or an arrow
//   warp's way: a gate's sides);
// - anything else, a warp you step onto (MB_LADDER: no door, no stairs).
// Where it puts you is a warp too (if it isn't one already), one going nowhere: only to say where you arrive.
const MB_WARP_DOOR = 0x69, ARROW = { right: 0x62, left: 0x63, up: 0x64 };
const warpAt = (e, x, y) => e.warps.findIndex((w) => w.x === x && w.y === y);
const unbuiltConst = (id, def) => {
  const info = INFO[id];
  // (Named for the map, or, one Essentials left unnamed (Lake Verity's hut, its MAP009), for where it's from.)
  const name = info && !/^MAP\d+$/.test(info.name) ? info.name : def.title + " inside";
  return "MAP_" + name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
};
// (Some of the project's warps still go to maps it renumbered since: Lake Verity's hut to MAP009 for Verity Cavern,
// Lake Valor's way in and out to MAP025 and MAP026. Each goes where the warp back from there comes from: a map with a
// warp beside where it puts you, back to beside it; or, both ways broken, two that put you beside each other.)
{
  const near = (a, b) => Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
  const raw = MAPS.filter((d) => d.id).flatMap((d) => out[d.name].warps.filter((w) => w.to).map((w) => ({ d, w })));
  const broken = ({ w }) => !byId[w.to.id];
  for (const a of raw.filter(broken)) {
    const back = raw.find((b) => !broken(b) && b.w.to.id === a.d.id && near(b.w.to, a.w) && near(b.w, a.w.to));
    if (back) { a.w.to.id = back.d.id; continue; }
    const pair = raw.find((b) => b !== a && b.d !== a.d && broken(b) && near(b.w, a.w.to) && near(b.w.to, a.w));
    if (pair) { a.w.to.id = pair.d.id; pair.w.to.id = a.d.id; }
  }
}
for (const def of MAPS.filter((d) => d.src)) {
  const inside = out[def.name], outside = out[def.parent];
  const exits = inside.warps.splice(0);
  const [dx, dy] = def.door;
  const door = outside.warps.length;
  for (const w of exits) {
    inside.warps.push({ x: w.x, y: w.y, map: def.parent, warp: door });
    inside.collision[w.y * inside.width + w.x] = 0;
  }
  // (In: in front of the first mat.)
  inside.warps.push({ x: exits[0].x, y: exits[0].y - 1, map: def.parent, warp: door });
  outside.warps.push({ x: dx, y: dy, map: def.name, warp: inside.warps.length - 1 });
  outside.behavior[dy * outside.width + dx] = MB_WARP_DOOR;
}
for (const def of MAPS.filter((d) => d.id)) {
  const e = out[def.name];
  const solid = (x, y) => x < 0 || y < 0 || x >= e.width || y >= e.height || e.collision[y * e.width + x] === 1;
  for (const w of e.warps.filter((w) => w.to)) {
    const to = w.to, dest = byId[to.id] && out[byId[to.id].name];
    delete w.to;
    const i = w.y * e.width + w.x;
    const edge = def.type === "indoor" && [["down", 0, 1], ["right", 1, 0], ["left", -1, 0], ["up", 0, -1]].find(([, ox, oy]) => solid(w.x + ox, w.y + oy) && !solid(w.x - ox, w.y - oy));
    // (Outside, a door: in a wall (solid itself, or under a solid tile: Essentials's doors are walked onto), open below,
    // not at the map's edge (a way along a route's edge, stepped on).)
    const inner = w.x > 0 && w.y > 0 && w.x < e.width - 1 && w.y < e.height - 1;
    if (def.outdoor && inner && (solid(w.x, w.y) || solid(w.x, w.y - 1)) && !solid(w.x, w.y + 1) && !e.warps.some((v) => v !== w && v.x === w.x && v.y === w.y + 1)) e.behavior[i] = MB_WARP_DOOR;
    else if (edge) { e.collision[i] = 0; if (edge[0] !== "down") e.behavior[i] = ARROW[edge[0]]; }
    else if (!def.outdoor && solid(w.x, w.y) && !solid(w.x, w.y + 1)) e.behavior[i] = MB_WARP_DOOR;
    else { e.behavior[i] = MB.LADDER; e.collision[i] = 0; }
    if (!dest) { w.map = null; w.mapConst = unbuiltConst(to.id, def); continue; }
    let k = warpAt(dest, to.x, to.y);
    if (k < 0) { k = dest.warps.length; dest.warps.push({ x: to.x, y: to.y, map: null }); }
    w.map = dest.name;
    w.warp = k;
  }
}

// The songs: copied (made smaller, if ffmpeg's there), with where each loops (in seconds), from the file's Vorbis
// comments and sample rate.
const music = {};
const songDir = path.join(root, "assets/audio/sinnoh");
fs.mkdirSync(songDir, { recursive: true });
let ffmpeg = true;
try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch (err) { ffmpeg = false; }
for (const f of fs.readdirSync(songDir)) if (!Object.keys(SONGS).some((n) => n.slice(3) + ".ogg" === f)) fs.unlinkSync(path.join(songDir, f));
for (const [name, file] of Object.entries(SONGS)) {
  const src = path.join(BGM, file + ".ogg"), dest = path.join(songDir, name.slice(3) + ".ogg");
  const b = fs.readFileSync(src);
  const id = b.indexOf("\x01vorbis"), rate = b.readUInt32LE(id + 12), text = b.toString("latin1");
  const tag = (k) => { const m = new RegExp(k + "=(\\d+)").exec(text); return m ? +m[1] : null; };
  const start = tag("LOOPSTART"), length = tag("LOOPLENGTH");
  if (!fs.existsSync(dest)) {
    if (ffmpeg) execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-map_metadata", "-1", "-c:a", "libvorbis", "-q:a", "0", dest]);
    else fs.writeFileSync(dest, b);
  }
  music[name] = { file: "assets/audio/sinnoh/" + name.slice(3) + ".ogg" };
  if (start != null && length) Object.assign(music[name], { loopStart: start / rate, loopEnd: (start + length) / rate });
}

const file = path.join(root, "data/orre-maps.js"), MARK = "\n// Sinnoh";
const before = fs.readFileSync(file, "utf8").split(MARK)[0].replace(/\n*$/, "\n");
fs.writeFileSync(file, before + MARK + "'s maps, from a Pokémon Essentials project of Sinnoh: auto-generated by tools/build-sinnoh.js. Do not edit by hand.\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" +
  "window.SINNOH_MUSIC = " + JSON.stringify(music) + ";\n" +
  "window.SINNOH_BERRY_TREES = " + JSON.stringify(BERRY_TREES) + ";\n");
const count = (k) => Object.values(out).reduce((a, e) => a + (k(e) || 0), 0);
console.log("wrote " + MAPS.length + " maps (" + count((e) => e.warps.length) + " warps, " + count((e) => e.people.length) + " people, " +
  count((e) => e.signs.length) + " sign tiles, " + count((e) => e.hidden.length) + " hidden items) and " + Object.keys(music).length + " songs to data/orre-maps.js and assets/");
