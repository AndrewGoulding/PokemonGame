// Builds Sinnoh's first maps from a Pokémon Essentials project of Sinnoh (an RPG Maker XP project: Data/*.rxdata,
// Graphics/Tilesets, Graphics/Autotiles, PBS/map_connections.txt and PBS/encounters.txt): Twinleaf Town,
// Route 201, Verity Lakefront, Lake Verity, Sandgem Town (its Pokémon Center, Poké Mart and Prof. Rowan's lab, and
// its beach's pier, where the S.S. Tidal calls), Route 202 and Jubilife City (its Pokémon Center and Poké Mart).
// The insides are the project's: Jubilife's Pokémon Center and Poké Mart, in Sandgem Town too, and Essentials's own
// lab for Rowan's.
//
//   node tools/build-sinnoh.js <path to the project>   (or set SINNOH_ESSENTIALS; needs Ruby, for the .rxdata files)
//
// RPG Maker XP's maps are three layers of 32x32 tiles: tile ids 384 and up are the tileset's picture (8 to a row),
// 48 to 383 its seven autotiles (48 ids each, put together from 16x16 quarters: AUTOTILE), 0 nothing. A tile's
// priority puts it over the people (here: the map's -top picture), its passage bits make it solid (looked at from
// the top layer down, to the first one under the people: Game_Map#passable?) and its terrain tag (Essentials's:
// grass, sand, water, ledges...) is what it is (here: FireRed's behaviours). The Essentials graphics are the DS
// games' at twice the size, so each map is drawn at 32 px a tile and halved. Animated autotiles (the sea, the
// flowers) are the map's -anim cells (ui/overworld.js TILE_ANIMS's s_auto4, s_auto5 and s_auto8).
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png, -anim.png
//   assets/audio/sinnoh/<song>.ogg   the maps' music (the project's Audio/BGM: recordings of DPPt's), played by
//                                    ui/audio.js as "dp_" songs, looping where the files' LOOPSTART and LOOPLENGTH say
//   data/orre-maps.js   window.WORLD_MAPS entries for them, after Orre's (from "// Sinnoh" on: this file's part):
//                       size, collision, behaviour, connections (map_connections.txt), the lake's entrances,
//                       hidden items and wild Pokémon (encounters.txt: grass, Surf and the rods); and
//                       window.SINNOH_MUSIC, the songs' files and loops
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

// The maps: their ids in the project (`id`; an inside, `src`: the project's map it's a copy of, in `parent`, through
// the door at `door` there, or the parent's own door to that map), and their names, music and kind here.
const MAPS = [
  { id: 194, name: "TwinleafTown", title: "Twinleaf Town", type: "town", music: "dp_twinleaf" },
  { id: 193, name: "Route201", title: "Route 201", type: "route", music: "dp_route201" },
  { id: 195, name: "VerityLakefront", title: "Verity Lakefront", type: "route", music: "dp_route201" },
  { id: 196, name: "LakeVerity", title: "Lake Verity", type: "route", music: "dp_lake" },
  { id: 192, name: "SandgemTown", title: "Sandgem Town", type: "town", music: "dp_sandgem" },
  { id: 191, name: "Route202", title: "Route 202", type: "route", music: "dp_route201" },
  { id: 106, name: "JubilifeCity", title: "Jubilife City", type: "city", music: "dp_jubilife" },
  // (Sandgem Town's doors aren't events in the project: where they are on its map.)
  { src: 133, kind: "center", parent: "SandgemTown", door: [17, 9], name: "SandgemTown_PokemonCenter_1F", music: "dp_pokecenter" },
  { src: 134, kind: "mart", parent: "SandgemTown", door: [27, 9], name: "SandgemTown_Mart", music: "dp_mart" },
  { src: 4, kind: "lab", parent: "SandgemTown", door: [9, 9], name: "SandgemTown_RowansLab", music: "dp_sandgem" },
  { src: 133, kind: "center", parent: "JubilifeCity", name: "JubilifeCity_PokemonCenter_1F", music: "dp_pokecenter" },
  { src: 134, kind: "mart", parent: "JubilifeCity", name: "JubilifeCity_Mart", music: "dp_mart" }
];
for (const m of MAPS) if (m.src) Object.assign(m, { title: MAPS.find((p) => p.name === m.parent).title, type: "indoor" });
const byId = Object.fromEntries(MAPS.filter((m) => m.id).map((m) => [m.id, m]));
// Their songs: the project's BGM files.
const SONGS = { dp_twinleaf: "DPPT 006 Twinleaf Town", dp_route201: "DPPT 008 Route 201", dp_lake: "DPPT 009 Lake", dp_sandgem: "DPPT 016 Sandgem Town",
  dp_jubilife: "DPPT 025 Jubilife City", dp_pokecenter: "DPPT 019 Pokemon Center", dp_mart: "DPPT 027 Poke Mart" };
// (Those not built yet: the ways on from Sandgem Town south to Route 219, and from Jubilife City east to Route 203,
// north to Route 204 and west to Route 218's gate.)
const UNBUILT = { 198: "MAP_ROUTE219", 105: "MAP_ROUTE203", 110: "MAP_ROUTE204", 107: "MAP_ROUTE218_GATE" };
// Sandgem Town's beach, where the S.S. Tidal drops anchor: its sailor (ui/game.js sinnohSailor), who rows you out to
// it and back to Lilycove.
const SAILOR = { map: "SandgemTown", x: 25, y: 30 };
// Prof. Rowan, and his aide, in his lab.
const ROWAN = ["Rowan: Hm? So you are the Trainer\nwho came across the sea.", "I am Rowan. I study Pokémon here\nin Sinnoh, and how they evolve.",
  "Nine in ten Pokémon are thought to be\nlinked to evolution in some way.", "Go out and see Sinnoh's Pokémon for\nyourself. Route 202 leads north to\nJubilife City."];
const AIDE = ["The Professor came back to Sinnoh\nfrom Kanto four years ago.", "He's stern, but he cares deeply\nabout Pokémon, and Trainers too."];

const tmp = path.join(require("os").tmpdir(), "sinnoh-" + process.pid + ".json");
execFileSync("ruby", [path.join(__dirname, "lib/rmxp-dump.rb"), PROJ, tmp].concat([...new Set(MAPS.map((m) => String(m.id || m.src)))]));
const RX = JSON.parse(fs.readFileSync(tmp, "utf8"));
fs.unlinkSync(tmp);

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
    if (!connections[from]) return;
    const dest = byId[to];
    if (!dest && !UNBUILT[to]) return;
    // (Along the edge, where the other map's 0 is: Essentials gives the place on each that meets.)
    connections[from].push({ map: dest ? dest.name : null, mapConst: dest ? "MAP_" + dest.name.replace(/([a-z])([A-Z0-9])/g, "$1_$2").toUpperCase() : UNBUILT[to],
      direction: EDGE[edge], offset: offFrom - offTo });
  };
  link(+a, ea, +oa, +b, +ob);
  link(+b, eb, +ob, +a, +oa);
}

// ---------- The maps ----------

const out = {};
const animNames = ["s_auto4", "s_auto5", "s_auto8"];   // (ui/overworld.js TILE_ANIMS: an autotile of four frames, five, eight)
// People in the insides, for Essentials's: the nurse, the clerk, Rowan (Essentials's Prof. Oak) and his aide.
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
    // (The mask's bits in animNames's order; the cell's frames go in that order too.)
    const mask = used.reduce((a, u) => a | (1 << u), 0);
    if (used.length > 1 && used[0] > used[1]) { console.warn("autotile frames out of order"); continue; }
    for (let q = 0; q < 4; q++) {
      cells.push(x * 2 + (q % 2), y * 2 + (q >> 1), animPics.length, mask);
      animPics.push(...quarters[q]);
    }
  }
  // What each tile is: solid (from the top layer down to the first under the people: Game_Map#passable?), its
  // terrain tag (the top layer's first), the lake's entrances.
  const entry = {
    name: def.name, title: def.title, width: W, height: H, type: def.type, music: def.music, region: "sinnoh",
    cycling: !def.src, showName: !def.src, top: true, borderWidth: 2, borderHeight: 2,
    collision: [], elevation: [], behavior: [], encounter: [],
    connections: connections[def.id] || [], warps: [], signs: [], triggers: [], hidden: [], people: [], wild: null
  };
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
    let b = BEHAVIOR[tag] || MB.NORMAL;
    if (tag === TAG.LEDGE) { ledges.push([x, y]); solid = false; }
    entry.collision.push(solid && !WATER.has(b) ? 1 : 0);
    entry.elevation.push(WATER.has(b) ? 1 : 3);
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
  // Events: hidden items (pbItemBall in a HiddenItem event), item balls (in an Item event), the ways between maps
  // (Transfer Player, code 201), and in the insides their people and machines.
  const MB_PC = 0x83, MB_COUNTER = 0x80;
  for (const [, ev] of m.events) {
    const page = ev.pages[0], list = page.list || [];
    const script = list.map((c) => ((c.code === 111 && c.parameters[0] === 12) || c.code === 355 || c.code === 655 ? String(c.code === 111 ? c.parameters[1] : c.parameters[0]) : "")).join(" ");
    const item = /pbItemBall\(:(\w+)/.exec(script) || /pbReceiveItem\(:(\w+)/.exec(script);
    if (item && (/hidden/i.test(ev.name) || /^item/i.test(ev.name))) {
      const id = ITEM[squash(item[1])];
      if (!id) { console.warn("no such item: " + item[1]); continue; }
      const flag = "FLAG_" + (/hidden/i.test(ev.name) ? "HIDDEN_ITEM_" : "ITEM_") + squash(def.name) + "_" + squash(id);
      if (/hidden/i.test(ev.name)) entry.hidden.push({ x: ev.x, y: ev.y, item: id, flag, quantity: 1 });
      else entry.people.push({ id: entry.people.length, x: ev.x, y: ev.y, movement: "face_down", rangeX: 0, rangeY: 0,
        script: def.name + "_EventScript_Item" + squash(id), flag, text: null, item: id, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
      continue;
    }
    const go = list.find((c) => c.code === 201 && c.parameters[0] === 0);
    if (go) { entry.warps.push({ x: ev.x, y: ev.y, to: { id: go.parameters[1], x: go.parameters[2], y: go.parameters[3] } }); continue; }
    if (!def.src) continue;
    const at_ = (x, y) => y * W + x;
    if (def.kind === "center" && ev.name === "Nurse") {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "em_nurse", "face_down", "Nurse", null));
      entry.behavior[at_(ev.x, ev.y + 1)] = MB_COUNTER;   // (the counter in front of her: Essentials's Nursemover)
      entry.center = { x: ev.x, y: ev.y + 2 };              // (where you wake up after blacking out, at the counter)
    } else if (def.kind === "center" && /pbPokeCenterPC/.test(script)) entry.behavior[at_(ev.x, ev.y)] = MB_PC;
    else if (def.kind === "mart" && /pbPokemonMart/.test(script) && page.graphic.character_name) {
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
    } else if (def.kind === "lab" && ev.name === "Professor") {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "dp_rowan", "face_down", "Rowan", ROWAN));
    } else if (def.kind === "lab" && ev.name === "Dex access") {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "em_scientist_1", "face_right", "Aide", AIDE));
    } else if (def.kind === "lab" && /ball$/.test(ev.name)) {
      entry.people.push(person(entry.people.length, def, ev.x, ev.y, "item_ball", "face_down", "Ball" + ev.x,
        ["It's a Poké Ball. A Pokémon the\nProfessor caught is inside."], { width: 16, height: 16, frames: 1, inanimate: true }));
    }
  }
  if (def.kind === "center") entry.pokemonCenter = true;
  if (def.name === SAILOR.map) entry.people.push(person(entry.people.length, def, SAILOR.x, SAILOR.y, "em_sailor", "face_up", "Sailor", null));
  // Wild Pokémon.
  const e = (def.id && encounters[def.id]) || {};
  entry.wild = merged(e, ["LandMorning", "Land", "LandDay", "LandNight"]);
  entry.water = merged(e, ["Water"]);
  const rods = { "old-rod": rodSlots(e.OldRod), "good-rod": rodSlots(e.GoodRod), "super-rod": rodSlots(e.SuperRod) };
  if (Object.values(rods).some(Boolean)) entry.fishing = { rods: Object.fromEntries(Object.entries(rods).filter(([, v]) => v)) };

  const big = halve(below, W * 32, H * 32);
  writePng(path.join(outMaps, def.name + ".png"), W * 16, H * 16, big);
  writePng(path.join(outMaps, def.name + "-top.png"), W * 16, H * 16, halve(above, W * 32, H * 32));
  // (Past the edge where nothing joins on: outside, the map's top-left 2x2 tiles, its trees; inside, black.)
  const border = new Uint8ClampedArray(32 * 32 * 4);
  if (def.src) for (let i = 3; i < border.length; i += 4) border[i] = 255;
  else for (let y = 0; y < 32; y++) border.set(big.subarray((y * W * 16) * 4, (y * W * 16 + 32) * 4), y * 32 * 4);
  writePng(path.join(outMaps, def.name + "-border.png"), 32, 32, border);
  if (animPics.length) {
    writeAnimSheet(path.join(outMaps, def.name + "-anim.png"), animPics);
    entry.anim = { cells, anims: animNames };
  }
  out[def.name] = entry;
}
// The ways between maps. A Transfer Player event outside, to another map outside, is a warp you step onto
// (MB_LADDER: no door, no stairs), to where it puts you, a warp too (one that goes back the way you came, if you walk
// back off it into something). An inside's way out (its exit mat, a warp you walk off downward) goes to its door
// outside (MB_WARP_DOOR: walked into going up), and you come in on the tile in front of the mat.
const MB_WARP_DOOR = 0x69;
const warpAt = (e, x, y) => e.warps.findIndex((w) => w.x === x && w.y === y);
const unbuiltConst = (id, def) => {
  const info = RX.infos.find((i) => i[0] === id);
  // (Named for the map, or, one Essentials left unnamed (Lake Verity's hut, its MAP009), for where it's from.)
  const name = info && !/^MAP\d+$/.test(info[1]) ? info[1] : def.title + " inside";
  return "MAP_" + name.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
};
for (const def of MAPS.filter((d) => d.src)) {
  const inside = out[def.name], outside = out[def.parent];
  // (The parent's own door to it: its Transfer Player event to this map.)
  if (!def.door) {
    const ev = outside.warps.find((w) => w.to && w.to.id === def.src);
    def.door = [ev.x, ev.y];
    outside.warps.splice(outside.warps.indexOf(ev), 1);
  }
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
  for (const w of e.warps.filter((w) => w.to)) {
    const to = w.to, dest = byId[to.id] && out[byId[to.id].name];
    delete w.to;
    e.behavior[w.y * e.width + w.x] = MB.LADDER;
    if (!dest) { w.map = null; w.mapConst = unbuiltConst(to.id, def); continue; }
    let k = warpAt(dest, to.x, to.y);
    if (k < 0) { k = dest.warps.length; dest.warps.push({ x: to.x, y: to.y, map: def.name, warp: e.warps.indexOf(w) }); }
    w.map = dest.name;
    w.warp = k;
  }
}

// The songs: copied, with where each loops (in seconds), from its Vorbis comments and sample rate.
const music = {};
fs.mkdirSync(path.join(root, "assets/audio/sinnoh"), { recursive: true });
for (const [name, file] of Object.entries(SONGS)) {
  const b = fs.readFileSync(path.join(PROJ, "Audio/BGM", file + ".ogg"));
  const id = b.indexOf("\x01vorbis"), rate = b.readUInt32LE(id + 12), text = b.toString("latin1");
  const tag = (k) => { const m = new RegExp(k + "=(\\d+)").exec(text); return m ? +m[1] : null; };
  const start = tag("LOOPSTART"), length = tag("LOOPLENGTH");
  fs.writeFileSync(path.join(root, "assets/audio/sinnoh", name.slice(3) + ".ogg"), b);
  music[name] = { file: "assets/audio/sinnoh/" + name.slice(3) + ".ogg" };
  if (start != null && length) Object.assign(music[name], { loopStart: start / rate, loopEnd: (start + length) / rate });
}

const file = path.join(root, "data/orre-maps.js"), MARK = "\n// Sinnoh";
const before = fs.readFileSync(file, "utf8").split(MARK)[0].replace(/\n*$/, "\n");
fs.writeFileSync(file, before + MARK + "'s maps, from a Pokémon Essentials project of Sinnoh: auto-generated by tools/build-sinnoh.js. Do not edit by hand.\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" +
  "window.SINNOH_MUSIC = " + JSON.stringify(music) + ";\n");
console.log("wrote " + MAPS.map((m) => m.title + " (" + out[m.name].width + "x" + out[m.name].height + ")").join(", ") + " to data/orre-maps.js and assets/world/maps/");
