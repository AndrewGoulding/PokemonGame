// Builds Hoenn's first maps from Pokémon Emerald (a pret/pokeemerald checkout)
// in this game's map format, drawn with Emerald's own tilesets: Littleroot
// Town, Route 101, Oldale Town, Route 102, Route 103 and Petalburg City, with
// every building in them.
//
//   node tools/build-hoenn.js <path to pret/pokeemerald> [--list] [--only=Map,Map --out=dir]
//   (or set POKEEMERALD=<path>)
//
// The checkout needs data/maps, data/layouts, data/tilesets, src/data,
// src/event_object_movement.c, include/constants and graphics/object_events
// and graphics/trainers. Emerald's maps are made like FireRed's (16x16
// metatiles of 8x8 tiles) but from its own tilesets (tools/lib/emerald-tiles.js
// reads them from the checkout: 512 tiles and metatiles in the primary one,
// 6 primary palettes, 16-bit metatile attributes), so a map is drawn as
// Emerald draws it, the General tileset's animations (flowers, water, the
// edges of sand and land by water) and all.
//
// What's taken from each map (data/maps/<Map>/map.json, scripts.inc): its
// layout, tiles' collision and behaviour, connections and warps, signs, hidden
// items, people (their pictures, from graphics/object_events, in FireRed's
// frame order), what they say (the first message of their script), item balls,
// Poké Mart clerks' stock, trainers (data/trainers.h's and trainer_parties.h's
// parties, their pictures from graphics/trainers) and the wild Pokémon
// (src/data/wild_encounters.json: grass, surfing, Rock Smash, fishing).
// Left out for now: the story's scripts (the truck, Prof. Birch, Wally's
// catching lesson, the rival), step triggers, and Emerald's songs (the maps
// borrow the nearest of this game's).
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png, -anim.png
//   assets/world/sprites/em_<name>.png          Emerald's people (16x32 frames and so on)
//   assets/sprites/trainers/front/em_<name>.png  Emerald's trainers' pictures
//   data/emerald-maps.js (its Hoenn block, between the markers): window.WORLD_MAPS entries and window.WORLD_TRAINERS
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readPng, writePng, readPal } = require("./lib/png");
const { cleanText } = require("./lib/text");

const EM = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "data/tilesets/primary/general"))) {
  console.error("Usage: node tools/build-hoenn.js <path to pret/pokeemerald> [--list]");
  process.exit(1);
}
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const OUT = (process.argv.find((a) => a.startsWith("--out=")) || "").slice(6);
const root = path.join(__dirname, "..");
const P = (...p) => path.join(EM, ...p);
const mapsDir = ONLY.length && OUT ? OUT : path.join(root, "assets/world/maps");
if (ONLY.length && OUT) fs.mkdirSync(OUT, { recursive: true });
const spritesDir = path.join(root, "assets/world/sprites"), trainersDir = path.join(root, "assets/sprites/trainers/front");

global.window = global;
for (const f of ["dex.js", "dex-gen7.js", "dex-gen8.js", "dex-gen9.js", "items.js", "items-gen9.js", "moves.js"]) {
  try { vm.runInThisContext(fs.readFileSync(path.join(root, "data", f), "utf8")); } catch (e) { /* (the later files add to the first's) */ }
}
const E = require("./lib/emerald-tiles")(EM);
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {}, moveByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
for (const k of Object.keys(window.MOVES)) moveByID[toID(k)] = k;

// ---------- Which maps ----------
// The outdoor maps to start with, and every building that leads off them.
const OUTDOOR = ["LittlerootTown", "Route101", "OldaleTown", "Route102", "Route103", "PetalburgCity"];
const INDOOR = /^(LittlerootTown|OldaleTown|PetalburgCity)_/;
const mapJson = (name) => JSON.parse(fs.readFileSync(P("data/maps", name, "map.json"), "utf8"));
const byConst = {};
for (const d of fs.readdirSync(P("data/maps"))) {
  const f = P("data/maps", d, "map.json");
  if (fs.existsSync(f)) byConst[JSON.parse(fs.readFileSync(f, "utf8")).id] = d;
}
const MAPS = [];
{
  const seen = new Set(OUTDOOR), queue = OUTDOOR.slice();
  while (queue.length) {
    const n = queue.shift();
    MAPS.push(n);
    for (const w of mapJson(n).warp_events) {
      const d = byConst[w.dest_map];
      if (d && !seen.has(d) && INDOOR.test(d)) { seen.add(d); queue.push(d); }
    }
  }
}
if (process.argv.includes("--list")) { console.log(MAPS.join("\n")); process.exit(0); }

// ---------- Names, text ----------
const sectionNames = {};
for (const x of JSON.parse(fs.readFileSync(P("src/data/region_map/region_map_sections.json"), "utf8")).map_sections) sectionNames[x.id] = x.name;
const titleCase = (s) => String(s || "").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bPokémon\b/i, "Pokémon").replace(/\bPoké/g, "Poké");
// Everything's .inc text: label (one or two colons) followed by .string lines.
const textFiles = {};
function textsOf(mapName) {
  if (textFiles[mapName]) return textFiles[mapName];
  const out = {}, scripts = {};
  const files = [P("data/maps", mapName, "scripts.inc"), P("data/maps", mapName, "text.inc")];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let label = null, kind = null;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const l = /^(\w+):(:?)/.exec(line);
      if (l) { label = l[1]; out[label] = ""; scripts[label] = []; kind = l[2]; continue; }
      if (!label) continue;
      const s = /^\s*\.string "(.*)"/.exec(line);
      if (s) out[label] += s[1];
      scripts[label].push(line.trim());
    }
  }
  return (textFiles[mapName] = { text: out, scripts });
}
// A shared text label (Common_Text_...) from data/scripts and data/text, for scripts that use them.
const commonText = {};
for (const dir of ["data/scripts", "data/text"]) {
  for (const f of fs.existsSync(P(dir)) ? fs.readdirSync(P(dir)) : []) {
    if (!/\.inc$/.test(f)) continue;
    let label = null;
    for (const line of fs.readFileSync(P(dir, f), "utf8").split("\n")) {
      const l = /^(\w+):{1,2}/.exec(line);
      if (l) { label = l[1]; commonText[label] = ""; continue; }
      const s = /^\s*\.string "(.*)"/.exec(line);
      if (s && label) commonText[label] += s[1];
    }
  }
}
// (Emerald's arrows in a sign, and its "{PLAYER}" and friends, kept as FireRed's are.)
const clean = (raw) => cleanText(raw.replace(/\{(RIGHT|LEFT|UP|DOWN)_ARROW\}/g, "").replace(/\{PLAYER\}/g, "{PLAYER}").replace(/\{RIVAL\}/g, "{RIVAL}")
  .replace(/\{STR_VAR_(\d)\}/g, "{STR_VAR_$1}")).map((p) => p.replace(/ +$/gm, ""));
// A script's first message, following goto/call when it starts by branching.
function scriptText(mapName, script, depth) {
  depth = depth || 0;
  const { text, scripts } = textsOf(mapName);
  const lines = scripts[script];
  if (!lines || depth > 4) return null;
  for (const line of lines) {
    const m = /^(?:msgbox|message)\s+(\w+)/.exec(line);
    if (m && (text[m[1]] || commonText[m[1]])) return clean(text[m[1]] || commonText[m[1]]);
  }
  for (const line of lines) {
    const m = /^(?:goto|call)(?:_if\w*)?\s+(?:[^,]+,\s*)*(\w+)$/.exec(line);
    if (m && scripts[m[1]]) { const t = scriptText(mapName, m[1], depth + 1); if (t) return t; }
  }
  return null;
}
const itemId = (c) => {
  const k = String(c).replace(/^ITEM_/, "").toLowerCase().replace(/_/g, "-");
  if (window.ITEMS[k]) return k;
  const found = Object.keys(window.ITEMS).find((x) => toID(x) === toID(k));
  return found || null;
};

// ---------- Layouts and tilesets ----------
const layouts = {};
for (const l of JSON.parse(fs.readFileSync(P("data/layouts/layouts.json"), "utf8")).layouts) if (l.id) layouts[l.id] = l;
const tsCache = {};
const tileset = (sym) => {
  const isPrimary = !!layoutsPrimary[sym], folder = E.tilesetFolder(sym);
  const kind = fs.existsSync(P("data/tilesets/primary", folder)) ? "primary" : "secondary";
  const key = kind + "/" + folder;
  return tsCache[key] || (tsCache[key] = E.loadTileset(kind, folder, folder === "general" ? E.GENERAL_ANIMS : []));
};
const layoutsPrimary = {};
for (const l of Object.values(layouts)) layoutsPrimary[l.primary_tileset] = true;

// ---------- People's pictures ----------
const gfxPointers = {}, gfxInfo = {}, picFiles = {}, palFiles = {}, palTags = {};
{
  const ptr = fs.readFileSync(P("src/data/object_events/object_event_graphics_info_pointers.h"), "utf8");
  for (const m of ptr.matchAll(/\[(OBJ_EVENT_GFX_\w+)\]\s*=\s*&(gObjectEventGraphicsInfo_\w+)/g)) gfxPointers[m[1]] = m[2];
  const info = fs.readFileSync(P("src/data/object_events/object_event_graphics_info.h"), "utf8");
  for (const m of info.matchAll(/const struct ObjectEventGraphicsInfo (gObjectEventGraphicsInfo_\w+) = \{([\s\S]*?)\n\};/g)) {
    const b = m[2];
    gfxInfo[m[1]] = { palette: (/\.paletteTag = (\w+)/.exec(b) || [])[1], width: +(/\.width = (\d+)/.exec(b) || [])[1], height: +(/\.height = (\d+)/.exec(b) || [])[1],
      images: (/\.images = (\w+)/.exec(b) || [])[1], inanimate: /\.inanimate = TRUE/.test(b) };
  }
  const tables = fs.readFileSync(P("src/data/object_events/object_event_pic_tables.h"), "utf8");
  for (const m of tables.matchAll(/static const struct SpriteFrameImage (sPicTable_\w+)\[\] = \{\s*overworld_frame\((gObjectEventPic_\w+)/g)) picFiles[m[1]] = m[2];
  const gfx = fs.readFileSync(P("src/data/object_events/object_event_graphics.h"), "utf8");
  for (const m of gfx.matchAll(/const u32 (gObjectEventPic_\w+)\[\] = INCGFX_U32\("([^"]+)"/g)) picFiles[m[1]] = m[2];
  for (const m of gfx.matchAll(/const u16 (gObjectEventPal_\w+)\[\] = INCGFX_U16\("([^"]+)"/g)) palFiles[m[1]] = m[2];
  const mv = fs.readFileSync(P("src/event_object_movement.c"), "utf8");
  for (const m of mv.matchAll(/\{(gObjectEventPal_\w+),\s*(OBJ_EVENT_PAL_TAG_\w+)\}/g)) palTags[m[2]] = m[1];
}
const spriteCache = {};
// -> { sprite, width, height, frames, inanimate } for an OBJ_EVENT_GFX_*, converted to assets/world/sprites/em_*.png.
function objectSprite(gfx) {
  if (spriteCache[gfx] !== undefined) return spriteCache[gfx];
  const pointer = gfxPointers[gfx], info = pointer && gfxInfo[pointer];
  if (!info) return (spriteCache[gfx] = null);
  const tableName = info.images, picLabel = picFiles[tableName];
  const file = picLabel && (picFiles[picLabel] || null);
  const palFile = palFiles[palTags[info.palette]];
  if (!file || !palFile || !fs.existsSync(P(file)) || !fs.existsSync(P(palFile))) return (spriteCache[gfx] = null);
  if (gfx === "OBJ_EVENT_GFX_ITEM_BALL") return (spriteCache[gfx] = { sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
  const name = "em_" + path.basename(file, ".png");
  const png = readPng(P(file)), pal = readPal(P(palFile));
  const rgba = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.px.length; i++) {
    const c = png.px[i] & 15;
    if (!c) continue;
    rgba[i * 4] = pal[c][0]; rgba[i * 4 + 1] = pal[c][1]; rgba[i * 4 + 2] = pal[c][2]; rgba[i * 4 + 3] = 255;
  }
  if (!(ONLY.length && OUT)) writePng(path.join(spritesDir, name + ".png"), png.width, png.height, rgba);
  return (spriteCache[gfx] = { sprite: name, width: info.width, height: info.height, frames: Math.max(1, Math.floor(png.width / info.width)), inanimate: info.inanimate || undefined });
}

// ---------- Trainers ----------
const trainerSrc = fs.readFileSync(P("src/data/trainers.h"), "utf8"), partySrc = fs.readFileSync(P("src/data/trainer_parties.h"), "utf8");
const classNames = {};
for (const m of fs.readFileSync(P("src/data/text/trainer_class_names.h"), "utf8").matchAll(/\[(TRAINER_CLASS_\w+)\]\s*=\s*_\("([^"]*)"\)/g)) classNames[m[1]] = m[2];
const picFile = {};
{
  const tbl = fs.readFileSync(P("src/data/trainer_graphics/front_pic_tables.h"), "utf8");
  const gfx = fs.readFileSync(P("src/data/graphics/trainers.h"), "utf8");
  const files = {};
  for (const m of gfx.matchAll(/const u32 (gTrainerFrontPic_\w+)\[\] = INCGFX_U32\("([^"]+)"/g)) files[m[1]] = m[2];
  for (const m of tbl.matchAll(/TRAINER_SPRITE\((\w+),\s*(gTrainerFrontPic_\w+)/g)) picFile["TRAINER_PIC_" + m[1]] = files[m[2]];
}
const trainerPics = {};
function trainerPic(pic) {
  if (trainerPics[pic]) return trainerPics[pic];
  const file = picFile[pic];
  if (!file || !fs.existsSync(P(file))) return (trainerPics[pic] = null);
  const name = "em_" + path.basename(file, ".png");
  if (!(ONLY.length && OUT)) {
    const png = readPng(P(file)), rgba = new Uint8ClampedArray(png.width * png.height * 4);
    for (let i = 0; i < png.px.length; i++) {
      const c = png.px[i] & 15;
      if (!c) continue;
      const rgb = png.palette[c];
      rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = 255;
    }
    writePng(path.join(trainersDir, name + ".png"), png.width, png.height, rgba);
  }
  return (trainerPics[pic] = name);
}
const WORLD_TRAINERS = {};
function trainerData(id) {
  const key = "EM_" + id;
  if (WORLD_TRAINERS[key]) return WORLD_TRAINERS[key];
  const m = new RegExp("\\[" + id + "\\] =\\s*\\{([\\s\\S]*?)\\n    \\},").exec(trainerSrc);
  if (!m) return null;
  const b = m[1], cls = /\.trainerClass = (\w+)/.exec(b)[1];
  const partyName = (/NO_ITEM_DEFAULT_MOVES\((\w+)\)|NO_ITEM_CUSTOM_MOVES\((\w+)\)|ITEM_DEFAULT_MOVES\((\w+)\)|ITEM_CUSTOM_MOVES\((\w+)\)/.exec(b) || []).slice(1).find(Boolean);
  const list = partyName && new RegExp(partyName + "\\[\\] = \\{([\\s\\S]*?)\\n\\};").exec(partySrc);
  if (!list) return null;
  const party = [...list[1].matchAll(/\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g)].map(([, mon]) => {
    const species = dexByID[toID(/\.species = SPECIES_(\w+)/.exec(mon)[1])];
    const moves = /\.moves = \{([^}]*)\}/.exec(mon), item = /\.heldItem = ITEM_(\w+)/.exec(mon);
    return { species, level: +/\.lvl = (\d+)/.exec(mon)[1], iv: +/\.iv = (\d+)/.exec(mon)[1],
      item: item && item[1] !== "NONE" ? itemId("ITEM_" + item[1]) || undefined : undefined,
      moves: moves ? moves[1].split(",").map((x) => x.trim().replace(/^MOVE_/, "")).filter((x) => x && x !== "NONE").map((x) => moveByID[toID(x)]).filter(Boolean) : undefined };
  }).filter((p) => p.species);
  const enc = (/\.encounterMusic_gender = (?:F_TRAINER_FEMALE \| )?TRAINER_ENCOUNTER_MUSIC_(\w+)/.exec(b) || [])[1];
  const music = ["FEMALE", "GIRL", "TWINS"].includes(enc) ? "mus_encounter_girl" : ["AQUA", "MAGMA", "SUSPICIOUS"].includes(enc) ? "mus_encounter_rocket" : "mus_encounter_boy";
  const pic = trainerPic((/\.trainerPic = (\w+)/.exec(b) || [])[1]);
  return (WORLD_TRAINERS[key] = { className: titleCase(classNames[cls] || cls).replace(/\{Pkmn\}/gi, "Pokémon").replace(/Poke(?!mon|dex)/g, "Poké"),
    name: titleCase((/\.trainerName = _\("(.*?)"\)/.exec(b) || [, ""])[1]), pic, party, music, double: /\.doubleBattle = TRUE/.test(b) });
}
// trainerbattle_single TRAINER_X, Intro, Defeat -> { id, intro, defeat }
function trainerScript(mapName, script) {
  const { scripts } = textsOf(mapName), lines = scripts[script] || [];
  for (const line of lines) {
    const m = /^trainerbattle_(?:single|double)\s+(\w+),\s*(\w+),\s*(\w+)/.exec(line);
    if (!m) continue;
    const t = textsOf(mapName).text, data = trainerData(m[1]);
    if (!data) return null;
    const after = ((lines.join("\n").match(/msgbox\s+(\w+PostBattle\w*|\w+After\w*),/) || [])[1]);
    data.intro = clean(t[m[2]] || ""); data.defeat = clean(t[m[3]] || "");
    if (after && t[after]) data.after = clean(t[after]);
    return { id: "EM_" + m[1], intro: data.intro, defeat: data.defeat, after: data.after };
  }
  return null;
}
// pokemart Label -> its stock (Label's .2byte ITEM_X lines).
function martStock(mapName, script) {
  const { scripts } = textsOf(mapName), lines = scripts[script] || [];
  for (const line of lines) {
    const m = /^pokemart\s+(\w+)/.exec(line);
    if (!m || !scripts[m[1]]) continue;
    return scripts[m[1]].map((l) => /^\.2byte ITEM_(\w+)/.exec(l)).filter((x) => x && x[1] !== "NONE").map((x) => itemId("ITEM_" + x[1])).filter(Boolean);
  }
  return undefined;
}
function ballItem(mapName, script) {
  const { scripts } = textsOf(mapName), lines = scripts[script] || [];
  for (const line of lines) { const m = /^finditem\s+(ITEM_\w+)/.exec(line); if (m) return itemId(m[1]); }
  return undefined;
}

// ---------- Wild Pokémon ----------
const wild = JSON.parse(fs.readFileSync(P("src/data/wild_encounters.json"), "utf8")).wild_encounter_groups[0].encounters;
const slotsOf = (enc, kind) => {
  const e = enc && enc[kind];
  if (!e) return undefined;
  return { rate: e.encounter_rate, slots: e.mons.map((m) => ({ species: dexByID[toID(m.species.replace(/^SPECIES_/, ""))], min: m.min_level, max: m.max_level })) };
};

// ---------- Songs: the nearest of this game's ----------
const MUSIC = { MUS_LITTLEROOT: "mus_pallet", MUS_LITTLEROOT_TEST: "mus_pallet", MUS_ROUTE101: "mus_route1", MUS_ROUTE102: "mus_route1", MUS_ROUTE103: "mus_route1", MUS_ROUTE104: "mus_route1",
  MUS_OLDALE: "mus_pewter", MUS_PETALBURG: "mus_celadon", MUS_POKE_CENTER: "mus_poke_center", MUS_GYM: "mus_gym" };
const musicOf = (m) => MUSIC[m] || (/POKE_CENTER/.test(m) ? "mus_poke_center" : "mus_route1");
// Emerald's behaviours as this game's (the General tileset's, and the interiors').
function behavior(b) {
  switch (b) {
    case 0x80: case 0x83: case 0x84: case 0x85: return b;   // a counter, the PC, the region map, a television
    case 0x06: case 0x07: return 0;                          // deep sand, short grass
    default: return E.frBehavior(b);
  }
}

// ---------- Build ----------
const out = {};
for (const name of MAPS) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  const map = mapJson(name), layout = layouts[map.layout], w = layout.width, h = layout.height;
  const primary = tileset(layout.primary_tileset), secondary = tileset(layout.secondary_tileset);
  const bin = fs.readFileSync(P(layout.blockdata_filepath));
  const blocks = Array.from({ length: w * h }, (_, i) => bin.readUInt16LE(i * 2));
  const r = E.render(blocks, w, h, primary, secondary, false);
  writePng(path.join(mapsDir, name + ".png"), w * 16, h * 16, r.below);
  const topFile = path.join(mapsDir, name + "-top.png");
  if (r.anyAbove) writePng(topFile, w * 16, h * 16, r.above); else if (fs.existsSync(topFile)) fs.unlinkSync(topFile);
  const bb = fs.readFileSync(P(layout.border_filepath));
  writePng(path.join(mapsDir, name + "-border.png"), 32, 32, E.render([0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2)), 2, 2, primary, secondary, true).below);
  const anim = E.animCells(blocks, w, h, primary, secondary), animFile = path.join(mapsDir, name + "-anim.png");
  if (anim.pics.length) E.writeAnimSheet(animFile, anim.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);

  const collision = [], elevation = [], behaviors = [], encounter = [];
  for (const b of blocks) {
    const mt = E.metatile(primary, secondary, b & 0x3ff), beh = behavior(mt.behavior);
    collision.push((b >> 10) & 3 ? 1 : 0);
    elevation.push(b >> 12);
    behaviors.push(beh);
    encounter.push(mt.behavior === 0x02 || mt.behavior === 0x0b ? 1 : 0);
  }
  const mapType = map.map_type.replace(/^MAP_TYPE_/, "").toLowerCase();
  const enc = wild.find((e) => e.map === map.id);
  const people = [];
  map.object_events.forEach((o, i) => {
    const sp = objectSprite(o.graphics_id);
    // (Story people, hidden until a flag clears: left out for now; berry trees and the like have no look.)
    if (!sp || (o.flag !== "0" && !/^FLAG_ITEM_/.test(o.flag))) return;
    const item = ballItem(name, o.script), trainer = /^trainerbattle/m.test((textsOf(name).scripts[o.script] || []).join("\n")) ? trainerScript(name, o.script) : null;
    const stock = martStock(name, o.script);
    people.push(Object.assign({ id: i, x: o.x, y: o.y, movement: o.movement_type.replace(/^MOVEMENT_TYPE_/, "").toLowerCase(),
      rangeX: o.movement_range_x, rangeY: o.movement_range_y, script: o.script, flag: o.flag !== "0" ? o.flag : null,
      text: scriptText(name, o.script), item: item || undefined, mart: stock,
      trainer: trainer ? Object.assign({}, trainer, { sight: +o.trainer_sight_or_berry_tree_id || 0 }) : undefined, localId: "LOCALID_" + name.replace(/([a-z])([A-Z0-9])/g, "$1_$2").toUpperCase() + "_" + i }, sp));
  });
  out[name] = {
    name, title: titleCase(sectionNames[map.region_map_section] || name.replace(/([a-z])([A-Z0-9])/g, "$1 $2")),
    width: w, height: h, type: mapType === "city" ? "city" : mapType, music: musicOf(map.music), region: "hoenn",
    cycling: !!map.allow_cycling || undefined, allowEscaping: map.allow_escaping || undefined,
    showName: !!map.show_map_name, pokemonCenter: /_PokemonCenter_1F$/.test(name) || undefined, top: r.anyAbove, borderWidth: 2, borderHeight: 2,
    anim: anim.cells.length ? { cells: anim.cells, anims: primary.anims.map((a) => a.name) } : undefined,
    collision, elevation, behavior: behaviors, encounter,
    connections: (map.connections || []).map((c) => ({ map: byConst[c.map] || null, mapConst: c.map, direction: c.direction, offset: c.offset })),
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] || null, mapConst: byConst[wp.dest_map] ? undefined : wp.dest_map, warp: +wp.dest_warp_id })),
    signs: (map.bg_events || []).filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script, text: scriptText(name, b.script) })),
    triggers: [],
    hidden: (map.bg_events || []).filter((b) => b.type === "hidden_item").map((b) => ({ x: b.x, y: b.y, item: itemId(b.item), flag: b.flag, quantity: b.quantity || 1 })).filter((x) => x.item),
    people,
    wild: enc && enc.land_mons ? slotsOf(enc, "land_mons") : null,
    water: slotsOf(enc, "water_mons"), rockSmash: slotsOf(enc, "rock_smash_mons"), fishing: slotsOf(enc, "fishing_mons")
  };
  console.log(name, w + "x" + h, "people", people.length, "signs", out[name].signs.length, "warps", out[name].warps.length);
}
// (Warps and connections to maps not imported yet are left out, until they are.)
for (const m of Object.values(out)) {
  m.warps = m.warps.filter((w) => w.map && out[w.map]);
  m.connections = m.connections.filter((c) => c.map && out[c.map]);
}
if (ONLY.length && OUT) process.exit(0);

// ---------- The data file ----------
const START = "// Hoenn (tools/build-hoenn.js, from pret/pokeemerald): its first maps and their trainers.\n", END = "// (End of Hoenn.)\n";
const js = START + "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\nObject.assign(window.WORLD_TRAINERS, " + JSON.stringify(WORLD_TRAINERS) + ");\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
const a = text.indexOf(START);
if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log("wrote " + MAPS.length + " Hoenn maps, " + Object.keys(WORLD_TRAINERS).length + " trainers to data/emerald-maps.js and assets/world/");
