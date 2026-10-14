// Builds the overworld from FireRed's map data.
//
//   node tools/build-maps.js <path to a pret/pokefirered checkout>
//   (or set POKEFIRERED=<path>; see README "Overworld maps")
//
// Reads, from the pokefirered checkout: data/layouts (block layouts),
// data/maps/<Map> (doors, signs, people, connections, text),
// src/data/wild_encounters.json, and the people sprites. Tilesets come from
// this repo's assets/tilesets (FireRed's tiles, palettes and metatiles).
//
// Writes:
//   data/world-maps.js            window.WORLD_MAPS: per map size, blocks
//                                 (collision, behaviour), warps, signs, people,
//                                 connections and wild Pokémon
//   assets/world/maps/<Map>.png   the map below sprites
//   assets/world/maps/<Map>-top.png       the parts drawn over sprites
//   assets/world/maps/<Map>-border.png    the 2x2 blocks repeated outside the map
//   assets/world/sprites/<name>.png       people and the player, background transparent
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const vm = require("vm");
const { readPng, writePng, readPal } = require("./lib/png");
const { parseTextFile, cleanText } = require("./lib/text");

// Names shown on entering a map; the rest come from the map name.
const TITLES = {
  PalletTown_PlayersHouse_1F: "Pallet Town · Home",
  PalletTown_PlayersHouse_2F: "Pallet Town · Your room",
  PalletTown_RivalsHouse: "Pallet Town · Rival's house",
  PalletTown_ProfessorOaksLab: "Pallet Town · Prof. Oak's Lab",
  ViridianCity_House: "Viridian City · Nickname house",
  ViridianCity_School: "Viridian City · Trainer school",
  ViridianCity_Mart: "Viridian City · Poké Mart",
  ViridianCity_PokemonCenter_1F: "Viridian City · Pokémon Center",
  ViridianCity_PokemonCenter_2F: "Viridian City · Pokémon Center 2F"
};

const MAPS = [
  "PalletTown", "PalletTown_PlayersHouse_1F", "PalletTown_PlayersHouse_2F",
  "PalletTown_RivalsHouse", "PalletTown_ProfessorOaksLab", "Route1",
  "ViridianCity", "ViridianCity_House", "ViridianCity_School", "ViridianCity_Mart",
  "ViridianCity_PokemonCenter_1F", "ViridianCity_PokemonCenter_2F"
];
// People whose look is set by a map script (OBJ_EVENT_GFX_VAR_*), and a second
// look the game can switch to, e.g. the old man lying across Viridian's road.
const VAR_GFX = { ViridianCity: { OBJ_EVENT_GFX_VAR_0: "OBJ_EVENT_GFX_OLD_MAN_1" } };
const ALT_GFX = { ViridianCity_EventScript_TutorialOldMan: "OBJ_EVENT_GFX_OLD_MAN_LYING_DOWN" };
// Scripts whose text is picked by code the converter can't follow.
const SCRIPT_TEXT = {
  ViridianCity_School_EventScript_PokemonJournal: "PokemonJournal_Text_SpecialFeatureBrock",
  EventScript_CutTree: "Text_TreeCanBeCutDown"
};
// Shared text the game uses for story scenes, besides each built map's own text.
const GAME_TEXT = [
  "Text_WelcomeWantToHealPkmn", "Text_TakeYourPkmnForFewSeconds", "Text_RestoredPkmnToFullHealth",
  "Text_WeHopeToSeeYouAgain", "Text_MayIHelpYou", "Text_PleaseComeAgain", "Text_WirelessClubUndergoingAdjustments"
];
const PLAYER_SPRITES = { red: "red_normal.png", green: "green_normal.png" };

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "data/layouts/layouts.json"))) {
  console.error("Usage: node tools/build-maps.js <path to pret/pokefirered>\n" +
    "Only data/layouts, data/maps, src/data and graphics/object_events are needed (see README).");
  process.exit(1);
}
const P = (...p) => path.join(pret, ...p);
const outMaps = path.join(root, "assets/world/maps");
const outSprites = path.join(root, "assets/world/sprites");
fs.mkdirSync(outMaps, { recursive: true });
fs.mkdirSync(outSprites, { recursive: true });

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));

// ---------- Tilesets ----------

const NUM_PRIMARY_TILES = 640, NUM_PRIMARY_METATILES = 640, NUM_PRIMARY_PALS = 7;


function tilesetDir(symbol) {
  const snake = symbol.replace(/^gTileset_/, "").replace(/([a-z])([A-Z0-9])/g, "$1_$2").replace(/([0-9])([A-Z])/g, "$1_$2").toLowerCase();
  for (const kind of ["primary", "secondary"]) {
    const dir = path.join(root, "assets/tilesets", kind, snake);
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error("No tileset folder for " + symbol + " (looked for " + snake + ")");
}

function loadTileset(symbol) {
  const dir = tilesetDir(symbol);
  const meta = fs.readFileSync(path.join(dir, "metatiles.bin"));
  const attrs = fs.readFileSync(path.join(dir, "metatile_attributes.bin"));
  const palettes = [];
  for (let i = 0; i < 16; i++) {
    const f = path.join(dir, "palettes", String(i).padStart(2, "0") + ".pal");
    palettes.push(fs.existsSync(f) ? readPal(f) : null);
  }
  return { tiles: readPng(path.join(dir, "tiles.png")), meta, attrs, palettes };
}

// A metatile's 8 tiles (4 below, 4 above), behaviour and layer type.
function metatile(primary, secondary, id) {
  const ts = id < NUM_PRIMARY_METATILES ? primary : secondary;
  const i = id < NUM_PRIMARY_METATILES ? id : id - NUM_PRIMARY_METATILES;
  const tiles = [];
  for (let k = 0; k < 8; k++) tiles.push(i * 16 + k * 2 + 1 < ts.meta.length ? ts.meta.readUInt16LE(i * 16 + k * 2) : 0);
  const attr = i * 4 + 3 < ts.attrs.length ? ts.attrs.readUInt32LE(i * 4) : 0;
  return { tiles, behavior: attr & 0x1ff, encounter: (attr >> 24) & 7, layer: (attr >>> 29) & 3 };
}

// Draws one 8x8 tile into an RGBA image.
function drawTile(img, imgW, x0, y0, entry, primary, secondary, opaqueBackground) {
  const idx = entry & 0x3ff, hflip = entry & 0x400, vflip = entry & 0x800, pal = entry >> 12;
  const ts = idx < NUM_PRIMARY_TILES ? primary : secondary;
  const t = idx < NUM_PRIMARY_TILES ? idx : idx - NUM_PRIMARY_TILES;
  const palette = (pal < NUM_PRIMARY_PALS ? primary : secondary).palettes[pal] || primary.palettes[0];
  const perRow = ts.tiles.width / 8;
  const tx = (t % perRow) * 8, ty = Math.floor(t / perRow) * 8;
  if (ty >= ts.tiles.height) return;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sx = tx + (hflip ? 7 - x : x), sy = ty + (vflip ? 7 - y : y);
      const c = ts.tiles.px[sy * ts.tiles.width + sx];
      const o = ((y0 + y) * imgW + x0 + x) * 4;
      if (c === 0 && !opaqueBackground) continue;
      const rgb = c === 0 ? primary.palettes[0][0] : palette[c];
      img[o] = rgb[0]; img[o + 1] = rgb[1]; img[o + 2] = rgb[2]; img[o + 3] = 255;
    }
  }
}

// Layer types: 0 normal (top tiles over sprites), 1 covered (all under), 2 split.
function renderBlocks(blocks, w, h, primary, secondary, flatten) {
  const below = new Uint8ClampedArray(w * 16 * h * 16 * 4);
  const above = new Uint8ClampedArray(w * 16 * h * 16 * 4);
  let anyAbove = false;
  for (let by = 0; by < h; by++) {
    for (let bx = 0; bx < w; bx++) {
      const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
      for (let k = 0; k < 4; k++) {
        drawTile(below, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[k], primary, secondary, true);
      }
      const topGoesBelow = flatten || mt.layer === 1;
      for (let k = 0; k < 4; k++) {
        const target = topGoesBelow ? below : above;
        if (!topGoesBelow && (mt.tiles[4 + k] & 0x3ff)) anyAbove = true;
        drawTile(target, w * 16, bx * 16 + (k & 1) * 8, by * 16 + (k >> 1) * 8, mt.tiles[4 + k], primary, secondary, false);
      }
    }
  }
  return { below, above, anyAbove };
}

// ---------- Text and scripts ----------


const sharedText = {};
// Text shared between maps (data/text/*.inc, data/scripts/*.inc, data/event_scripts.s),
// for whichever of those were checked out.
const sharedFiles = [];
for (const dir of ["data/text", "data/scripts"]) {
  if (fs.existsSync(P(dir))) for (const f of fs.readdirSync(P(dir))) if (f.endsWith(".inc")) sharedFiles.push(P(dir, f));
}
if (fs.existsSync(P("data/event_scripts.s"))) sharedFiles.push(P("data/event_scripts.s"));
for (const f of sharedFiles) parseTextFile(f, sharedText);

const textCache = {};
function texts(mapName) {
  if (textCache[mapName]) return textCache[mapName];
  const out = Object.assign({}, sharedText);
  const file = P("data/maps", mapName, "text.inc");
  if (fs.existsSync(file)) parseTextFile(file, out);
  for (const k of Object.keys(out)) out[k] = cleanText(out[k]);
  return (textCache[mapName] = out);
}

let sharedScriptCache = null;
function sharedScripts() {
  if (sharedScriptCache) return sharedScriptCache;
  sharedScriptCache = {};
  for (const f of sharedFiles) {
    let label = null;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const l = /^(\w+)::/.exec(line);
      if (l) { label = l[1]; sharedScriptCache[label] = []; continue; }
      if (label) sharedScriptCache[label].push(line.trim());
    }
  }
  return sharedScriptCache;
}

function scriptLabels(mapName) {
  const file = P("data/maps", mapName, "scripts.inc");
  const out = Object.assign({}, sharedScripts());
  if (!fs.existsSync(file)) return out;
  let label = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const l = /^(\w+)::/.exec(line);
    if (l) { label = l[1]; out[label] = []; continue; }
    if (label) out[label].push(line.trim());
  }
  return out;
}

// A script's first message, following goto/call when the script starts by branching.
function scriptText(mapName, script, depth) {
  depth = depth || 0;
  const scripts = scriptLabels(mapName), t = texts(mapName);
  if (SCRIPT_TEXT[script]) return t[SCRIPT_TEXT[script]] || null;
  const lines = scripts[script];
  if (!lines || depth > 4) return null;
  for (const line of lines) {
    const m = /^(?:msgbox|message)\s+(\w+)/.exec(line);
    if (m && t[m[1]]) return t[m[1]];
  }
  for (const line of lines) {
    const m = /^(?:goto|call)(?:_if\w*)?\s+(?:[^,]+,\s*)*(\w+)$/.exec(line);
    if (m && scripts[m[1]]) {
      const found = scriptText(mapName, m[1], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// The item an item ball holds ("potion"), from its finditem line.
function itemBall(mapName, script) {
  const lines = scriptLabels(mapName)[script] || [];
  for (const line of lines) {
    const m = /^finditem\s+ITEM_(\w+)/.exec(line);
    if (m) return m[1].toLowerCase().replace(/_/g, "-").replace(/^poke-/, "poke-");
  }
  return undefined;
}

// ---------- People sprites ----------

function readHeader(rel) { return fs.readFileSync(P(rel), "utf8"); }
const pointers = readHeader("src/data/object_events/object_event_graphics_info_pointers.h");
const infos = readHeader("src/data/object_events/object_event_graphics_info.h");
const picTables = readHeader("src/data/object_events/object_event_pic_tables.h");
const pics = readHeader("src/data/object_events/object_event_graphics.h");

const spriteInfo = {};
function objectSprite(gfx) {
  if (spriteInfo[gfx]) return spriteInfo[gfx];
  const info = new RegExp("\\[" + gfx + "\\]\\s*=\\s*&(\\w+)").exec(pointers);
  if (!info) throw new Error("No graphics info for " + gfx);
  const block = new RegExp("struct ObjectEventGraphicsInfo " + info[1] + " = \\{([\\s\\S]*?)\\};").exec(infos)[1];
  const width = +/\.width = (\d+)/.exec(block)[1], height = +/\.height = (\d+)/.exec(block)[1];
  const table = /\.images = (\w+)/.exec(block)[1];
  const picName = new RegExp(table + "\\[\\] = \\{[\\s\\S]*?(gObjectEventPic_\\w+)").exec(picTables)[1];
  const file = new RegExp(picName + "\\[\\] = INCBIN_U16\\(\"(.+?)\\.4bpp\"").exec(pics)[1] + ".png";
  const name = path.basename(file, ".png");
  const png = readPng(P(file));
  writeSprite(png, path.join(outSprites, name + ".png"));
  return (spriteInfo[gfx] = { sprite: name, width, height, frames: Math.max(1, Math.floor(png.width / width)) });
}

// `count` frames of `frameWidth` pixels from an indexed sheet, starting at frame `first`.
function cropFrames(png, frameWidth, first, count) {
  const width = frameWidth * count, px = new Uint8Array(width * png.height);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < width; x++) px[y * width + x] = png.px[y * png.width + first * frameWidth + x];
  }
  return { width, height: png.height, px, palette: png.palette };
}

// Indexed sprite -> RGBA with colour 0 transparent.
function writeSprite(png, file) {
  const rgba = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.px.length; i++) {
    const c = png.px[i];
    if (c === 0) continue;
    const rgb = png.palette[c];
    rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = 255;
  }
  writePng(file, png.width, png.height, rgba);
}

// ---------- Maps ----------

const layouts = {};
for (const l of JSON.parse(fs.readFileSync(P("data/layouts/layouts.json"), "utf8")).layouts) if (l.id) layouts[l.id] = l;
const wild = JSON.parse(fs.readFileSync(P("src/data/wild_encounters.json"), "utf8")).wild_encounter_groups[0].encounters;
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
const byConst = {};   // "MAP_PALLET_TOWN" -> "PalletTown", for the maps being built
for (const m of MAPS) byConst[JSON.parse(fs.readFileSync(P("data/maps", m, "map.json"), "utf8")).id] = m;

const out = {};
for (const name of MAPS) {
  const map = JSON.parse(fs.readFileSync(P("data/maps", name, "map.json"), "utf8"));
  const layout = layouts[map.layout];
  const w = layout.width, h = layout.height;
  const primary = loadTileset(layout.primary_tileset), secondary = loadTileset(layout.secondary_tileset);
  const bin = fs.readFileSync(P(layout.blockdata_filepath));
  const blocks = Array.from({ length: w * h }, (_, i) => bin.readUInt16LE(i * 2));

  const { below, above, anyAbove } = renderBlocks(blocks, w, h, primary, secondary, false);
  writePng(path.join(outMaps, name + ".png"), w * 16, h * 16, below);
  if (anyAbove) writePng(path.join(outMaps, name + "-top.png"), w * 16, h * 16, above);
  const borderBin = fs.readFileSync(P(layout.border_filepath));
  const bw = layout.border_width || 2, bh = layout.border_height || 2;
  const border = Array.from({ length: bw * bh }, (_, i) => borderBin.readUInt16LE(i * 2));
  writePng(path.join(outMaps, name + "-border.png"), bw * 16, bh * 16, renderBlocks(border, bw, bh, primary, secondary, true).below);

  // Per block: collision (0 = walkable), elevation, behaviour, encounter type.
  const collision = [], elevation = [], behavior = [], encounter = [];
  for (const b of blocks) {
    const mt = metatile(primary, secondary, b & 0x3ff);
    collision.push((b >> 10) & 3);
    elevation.push(b >> 12);
    behavior.push(mt.behavior);
    encounter.push(mt.encounter);
  }

  const people = map.object_events.filter((o) => o.type === "object").map((o, i) => Object.assign({
    id: i, x: o.x, y: o.y, movement: o.movement_type.replace(/^MOVEMENT_TYPE_/, "").toLowerCase(),
    rangeX: o.movement_range_x, rangeY: o.movement_range_y,
    script: o.script, flag: o.flag !== "0" ? o.flag : null,
    text: scriptText(name, o.script),
    item: itemBall(name, o.script),
    localId: o.local_id || undefined,
    alt: ALT_GFX[o.script] ? objectSprite(ALT_GFX[o.script]) : undefined
  }, objectSprite((VAR_GFX[name] || {})[o.graphics_id] || o.graphics_id)));

  const land = wild.find((e) => e.map === map.id && /FireRed/.test(e.base_label));
  out[name] = {
    name, title: TITLES[name] || name.replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2"),
    width: w, height: h, type: map.map_type.replace(/^MAP_TYPE_/, "").toLowerCase(),
    top: anyAbove, borderWidth: bw, borderHeight: bh,
    collision, elevation, behavior, encounter,
    connections: (map.connections || []).map((c) => ({ map: byConst[c.map] || null, mapConst: c.map, direction: c.direction, offset: c.offset })),
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] || null, warp: +wp.dest_warp_id })),
    signs: map.bg_events.filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script, text: scriptText(name, b.script) })),
    triggers: map.coord_events.map((c) => ({ x: c.x, y: c.y, script: c.script })),
    people,
    wild: land && land.land_mons ? {
      rate: land.land_mons.encounter_rate,
      slots: land.land_mons.mons.map((m) => ({ species: dexByID[toID(m.species.replace(/^SPECIES_/, ""))], min: m.min_level, max: m.max_level }))
    } : null
  };
}

// Movement scripts (walk_up, walk_in_place_faster_down, ...) by label, for the
// cutscenes the game plays: the built maps' own plus FireRed's common ones.
// Macros (.macro walk_to_lab ... .endm) are expanded.
function movements(file, out) {
  const lines = fs.readFileSync(file, "utf8").split("\n").map((l) => l.trim());
  const macros = {};
  for (let i = 0; i < lines.length; i++) {
    const m = /^\.macro\s+(\w+)/.exec(lines[i]);
    if (!m) continue;
    const body = [];
    while (++i < lines.length && lines[i] !== ".endm") if (lines[i]) body.push(lines[i]);
    macros[m[1]] = body;
  }
  let label = null, cmds = [];
  for (const line of lines) {
    const l = /^(\w+)::/.exec(line);
    if (l) { label = /Movement/.test(l[1]) ? l[1] : null; cmds = []; continue; }
    if (!label || !line || line.startsWith("@")) continue;
    const cmd = line.split(/\s|@/)[0];
    if (cmd === "step_end") { out[label] = cmds; label = null; continue; }
    cmds.push(...(macros[cmd] || [cmd]));
  }
  return out;
}
const gameMovements = {};
for (const name of MAPS) {
  const file = P("data/maps", name, "scripts.inc");
  if (fs.existsSync(file)) movements(file, gameMovements);
}
if (fs.existsSync(P("data/scripts/movement.inc"))) {
  const common = movements(P("data/scripts/movement.inc"), {});
  for (const k of Object.keys(common)) if (k.startsWith("Common_Movement_")) gameMovements[k] = common[k];
}

// Text by label for story scenes: each built map's own text plus GAME_TEXT.
const gameText = {};
for (const name of MAPS) {
  const own = {};
  const file = P("data/maps", name, "text.inc");
  if (fs.existsSync(file)) parseTextFile(file, own);
  for (const k of Object.keys(own)) gameText[k] = texts(name)[k];
}
for (const k of GAME_TEXT) {
  if (!texts(MAPS[0])[k]) throw new Error("Missing shared text " + k);
  gameText[k] = texts(MAPS[0])[k];
}

for (const [color, file] of Object.entries(PLAYER_SPRITES)) {
  const src = path.join(root, "assets/sprites/overworld", file);
  if (fs.existsSync(src)) writeSprite(readPng(src), path.join(outSprites, "player_" + color + ".png"));
  // Running: frames 3-11 of the surf/run sheet, laid out like the walking
  // sheet's poses (down, two strides, up, two strides, left, two strides).
  const run = path.join(root, "assets/sprites/overworld", color + "_surf_run.png");
  if (fs.existsSync(run)) writeSprite(cropFrames(readPng(run), 16, 3, 9), path.join(outSprites, "player_" + color + "_run.png"));
}

fs.writeFileSync(path.join(root, "data/world-maps.js"),
  "// Auto-generated by tools/build-maps.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.WORLD_MAPS = " + JSON.stringify(out) + ";\n" +
  "window.WORLD_TEXT = " + JSON.stringify(gameText) + ";\n" +
  "window.WORLD_MOVEMENTS = " + JSON.stringify(gameMovements) + ";\n");
console.log("wrote " + MAPS.length + " maps to data/world-maps.js and assets/world/");
