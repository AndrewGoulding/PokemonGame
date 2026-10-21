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
// Every map you can walk to from Littleroot Town (by warp or connection),
// but for the Battle Frontier, the link rooms, the Contest halls, the Safari
// Zone, Secret Bases and the islands this game has already (Faraway Island,
// Birth Island, Navel Rock, Southern Island).
const OUTDOOR = ["InsideOfTruck", "LittlerootTown", "SootopolisCity", "SeafloorCavern_Entrance", "CaveOfOrigin_Entrance", "SealedChamber_OuterRoom", "AquaHideout_1F", "MagmaHideout_1F", "NewMauville_Entrance", "ShoalCave_LowTideEntranceRoom", "ShoalCave_HighTideEntranceRoom", "SSTidalCorridor", "MirageTower_1F"];   // (The rest are reached through the story: Dive, Sootopolis's way in, the hideouts' doors, the tides.)
const EXCLUDE = /^(BattleFrontier|BattleColosseum|BattlePyramid|BattleTower|SecretBase|TradeCenter|UnionRoom|RecordCorner|TrainerHill|SafariZone|.*Contest|.*Unused|.*Prototype|Dummy|BirthIsland|NavelRock|FarawayIsland|SouthernIsland|Test)/;
const mapJson = (name) => JSON.parse(fs.readFileSync(P("data/maps", name, "map.json"), "utf8"));
const byConst = {};
for (const d of fs.readdirSync(P("data/maps"))) {
  const f = P("data/maps", d, "map.json");
  if (fs.existsSync(f)) byConst[JSON.parse(fs.readFileSync(f, "utf8")).id] = d;
}
// (Kanto has Victory Road's floors under these names already.)
const RENAME = { VictoryRoad_1F: "HoennVictoryRoad_1F", VictoryRoad_B1F: "HoennVictoryRoad_B1F", VictoryRoad_B2F: "HoennVictoryRoad_B2F" };
const ren = (d) => RENAME[d] || d;
const MAPS = [];
{
  const seen = new Set(OUTDOOR), queue = OUTDOOR.slice();
  while (queue.length) {
    const n = queue.shift();
    MAPS.push(n);
    const m = mapJson(n);
    for (const dest of m.warp_events.map((w) => w.dest_map).concat((m.connections || []).map((c) => c.map))) {
      const d = byConst[dest];
      if (d && !seen.has(d) && !EXCLUDE.test(d)) { seen.add(d); queue.push(d); }
    }
  }
  MAPS.sort();
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
// (Emerald's TMs and HMs are numbered as Gen 3's: this game's, by the move: TM27 Return is whichever machine teaches Return.)
const machineByMove = {};
for (const [id, it] of Object.entries(window.ITEMS)) { const m = it.category === "all-machines" && /^Teaches (.+?) to a compatible/.exec(it.effect || ""); if (m) machineByMove[toID(m[1])] = id; }
const itemId = (c) => {
  const mv = /^ITEM_(?:TM|HM)(?:\d+)?_(\w+)$/.exec(String(c));
  if (mv) return machineByMove[toID(mv[1])] || null;
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
  for (const m of tables.matchAll(/static const struct SpriteFrameImage (sPicTable_\w+)\[\] = \{\s*(?:overworld_frame|obj_frame_tiles)\((gObjectEventPic_\w+)/g)) picFiles[m[1]] = m[2];
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
  if (gfx === "OBJ_EVENT_GFX_ITEM_BALL") return (spriteCache[gfx] = { sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
  const pointer = gfxPointers[gfx], info = pointer && gfxInfo[pointer];
  if (!info) { console.log("no picture for " + gfx); return (spriteCache[gfx] = null); }
  const tableName = info.images, picLabel = picFiles[tableName];
  const file = picLabel && (picFiles[picLabel] || null);
  const palFile = palFiles[palTags[info.palette]];
  if (!file || !palFile || !fs.existsSync(P(file)) || !fs.existsSync(P(palFile))) { console.log("no picture for " + gfx); return (spriteCache[gfx] = null); }
  if (gfx === "OBJ_EVENT_GFX_ITEM_BALL") return (spriteCache[gfx] = { sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
  const parent = path.basename(path.dirname(file)), base = path.basename(file, ".png");
  const name = "em_" + (parent === "people" ? "" : parent + "_") + base;   // (May's walking.png and Brendan's are two pictures)
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
  const music = (enc && songOf("MUS_ENCOUNTER_" + enc)) || "em_encounter_male";
  const pic = trainerPic((/\.trainerPic = (\w+)/.exec(b) || [])[1]);
  return (WORLD_TRAINERS[key] = { className: titleCase(classNames[cls] || cls).replace(/\{Pkmn\}/gi, "Pokémon").replace(/Poke(?!mon|dex)/g, "Poké"),
    name: titleCase((/\.trainerName = _\("(.*?)"\)/.exec(b) || [, ""])[1]), pic, party, music, double: /\.doubleBattle = TRUE/.test(b) });
}
// trainerbattle_single TRAINER_X, Intro, Defeat -> { id, intro, defeat }
function trainerScript(mapName, script) {
  const { scripts } = textsOf(mapName), lines = scripts[script] || [];
  for (const line of lines) {
    const m = /^trainerbattle_(single|double)\s+(\w+),\s*(\w+),\s*(\w+)(?:,\s*(\w+))?(?:,\s*(\w+))?/.exec(line);
    if (!m) continue;
    // (A trainer with a script to go on to after the battle, a Gym Leader's, is run by ui/hoenn-script.js.)
    if (m[1] === "single" ? m[5] && m[5] !== "FALSE" && m[5] !== "NO_MUSIC" : m[6] && m[6] !== "FALSE" && m[6] !== "NO_MUSIC") return null;
    m.splice(1, 1);
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
  // (Emerald's item balls' scripts are all in data/scripts/item_ball_scripts.inc.)
  for (const c of compiled.s[script] || []) if (c[0] === "finditem") return itemId(c[1]) || undefined;
  return undefined;
}

// ---------- Wild Pokémon ----------
const wild = JSON.parse(fs.readFileSync(P("src/data/wild_encounters.json"), "utf8")).wild_encounter_groups[0].encounters;
const slotsOf = (enc, kind) => {
  const e = enc && enc[kind];
  if (!e) return undefined;
  return { rate: e.encounter_rate, slots: e.mons.map((m) => ({ species: dexByID[toID(m.species.replace(/^SPECIES_/, ""))], min: m.min_level, max: m.max_level })) };
};

// ---------- Songs: Emerald's own (tools/build-hoenn-audio.js: em_<name>) ----------
const EM_SONGS = new Set();
for (const m of fs.readFileSync(P("sound/songs/midi/midi.cfg"), "utf8").matchAll(/^mus_(\w+)\.mid:/gm)) if (!/^(rg_|b_|link_|contest|c_|dummy|gsc_|intro_battle)/.test(m[1])) EM_SONGS.add("em_" + m[1]);
const songOf = (c) => { const n = "em_" + String(c).replace(/^MUS_/, "").toLowerCase(); return EM_SONGS.has(n) ? n : null; };
const musicOf = (m) => songOf(m) || (/POKE_CENTER/.test(m) ? "em_poke_center" : null);
// Emerald's metatile behaviours (include/constants/metatile_behaviors.h) as this
// game's (FireRed's numbering, game/world.js's MB).
function behavior(b) {
  switch (b) {
    case 0x02: case 0x03: return b;                                  // tall grass, long grass
    case 0x10: case 0x12: case 0x13: case 0x15: case 0x16: return b;   // pond, deep water, waterfall, ocean, puddle
    case 0x11: return 0x11;                                          // an interior's deep water
    case 0x14: case 0x18: case 0x19: case 0x1a: return 0x12;         // Sootopolis' deep water, water you can't dive from
    case 0x17: return 0x17;                                          // shallow water
    case 0x20: return 0x23;                                          // ice
    case 0x21: return 0x21;                                          // sand
    case 0x26: case 0x27: return b;                                  // thin ice, cracked ice
    case 0x38: case 0x39: case 0x3a: case 0x3b: return b;            // ledges
    case 0x50: case 0x51: case 0x52: case 0x53: return b;            // currents
    case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x69: case 0x6a: case 0x6b: return b;   // doors, ladders, arrow warps, escalators
    case 0x66: case 0x0f: return 0x66;                               // a hole in the floor
    case 0x67: case 0x68: case 0x0e: case 0x29: return 0x67;         // a warp pad (the hideout's, the Gyms')
    case 0x6c: return 0x69;                                          // a door under the water
    case 0x6d: case 0x6e: return 0x65;                               // a way up from the deep
    case 0x80: case 0x83: return b;                                  // a counter, the PC
    case 0x85: return 0x84;                                          // the region map
    case 0x86: return 0x85;                                          // a television
    default: return 0;
  }
}
// Where wild Pokémon are (Emerald's MetatileBehavior_IsLandWildEncounter).
const WILD_BEHAVIOR = new Set([0x02, 0x03, 0x06, 0x08, 0x0b, 0x0c, 0x21, 0x24]);

// ---------- The scripts (compiled first: the maps' metatile changes come from them) ----------
const Scripts = require("./lib/emerald-script")(EM);
const compiled = Scripts.compile(MAPS);
// The metatile labels (METATILE_General_X) and their numbers, and which of them each map's scripts set.
const metatileIds = {};
for (const m of fs.readFileSync(P("include/constants/metatile_labels.h"), "utf8").matchAll(/#define (METATILE_\w+)\s+(0x[0-9A-Fa-f]+)/g)) metatileIds[m[1]] = parseInt(m[2], 16);
const metatilesOf = {};
for (const [label, cmds] of Object.entries(compiled.s)) {
  const mp = compiled.lm[label];
  if (!mp) continue;
  for (const c of cmds) if (c[0] === "setmetatile" && typeof c[3] === "string" && metatileIds[c[3]] != null) (metatilesOf[mp] = metatilesOf[mp] || new Set()).add(c[3]);
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
  writePng(path.join(mapsDir, ren(name) + ".png"), w * 16, h * 16, r.below);
  const topFile = path.join(mapsDir, ren(name) + "-top.png");
  if (r.anyAbove) writePng(topFile, w * 16, h * 16, r.above); else if (fs.existsSync(topFile)) fs.unlinkSync(topFile);
  const bb = fs.readFileSync(P(layout.border_filepath));
  writePng(path.join(mapsDir, ren(name) + "-border.png"), 32, 32, E.render([0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2)), 2, 2, primary, secondary, true).below);
  const anim = E.animCells(blocks, w, h, primary, secondary), animFile = path.join(mapsDir, ren(name) + "-anim.png");
  if (anim.pics.length) E.writeAnimSheet(animFile, anim.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);

  const collision = [], elevation = [], behaviors = [], encounter = [];
  for (const b of blocks) {
    const mt = E.metatile(primary, secondary, b & 0x3ff), beh = behavior(mt.behavior);
    collision.push((b >> 10) & 3 ? 1 : 0);
    elevation.push(b >> 12);
    behaviors.push(beh);
    encounter.push(WILD_BEHAVIOR.has(mt.behavior) ? 1 : 0);
  }
  // The metatiles this map's scripts put in (setmetatile): a sheet of them, 16 to a row, below and above the people.
  let mt;
  const wanted = [...(metatilesOf[name] || [])].sort();
  if (wanted.length) {
    const cols = 16, rows = Math.ceil(wanted.length / cols), ids = wanted.map((l) => metatileIds[l]);
    while (ids.length < cols * rows) ids.push(0);
    const sheet = E.render(ids, cols, rows, primary, secondary, true);
    writePng(path.join(mapsDir, ren(name) + "-mt.png"), cols * 16, rows * 16, sheet.below);
    writePng(path.join(mapsDir, ren(name) + "-mt-top.png"), cols * 16, rows * 16, sheet.above);
    mt = {};
    wanted.forEach((l, i) => { mt[l] = [i, behavior(E.metatile(primary, secondary, metatileIds[l]).behavior)]; });
  }
  // (Emerald's warps on plain ground are stepped onto: a doorway, as the engine has them.)
  for (const wp of map.warp_events) { const i = wp.y * w + wp.x; if (i >= 0 && i < behaviors.length && behaviors[i] === 0) behaviors[i] = 0x60; }
  const mapType = map.map_type.replace(/^MAP_TYPE_/, "").toLowerCase();
  const enc = wild.find((e) => e.map === map.id);
  const people = [];
  map.object_events.forEach((o, i) => {
    // (Someone whose look a var holds, the rival's or Wally's: shown once a script has set it: gfxVar.)
    const gfxVar = (/^OBJ_EVENT_GFX_VAR_(\w)$/.exec(o.graphics_id) || [])[1];
    const sp = gfxVar ? objectSprite("OBJ_EVENT_GFX_BOY_1") : objectSprite(o.graphics_id);
    // (Berry trees and the like have no look yet.)
    if (!sp) return;
    const item = ballItem(name, o.script), trainer = /^trainerbattle/m.test((textsOf(name).scripts[o.script] || []).join("\n")) ? trainerScript(name, o.script) : null;
    const stock = martStock(name, o.script);
    // (An item ball's flag is its own; the others' hide them until the story gets to them: ui/hoenn-script.js.)
    people.push(Object.assign({ id: i, x: o.x, y: o.y, movement: o.movement_type.replace(/^MOVEMENT_TYPE_/, "").toLowerCase(),
      rangeX: o.movement_range_x, rangeY: o.movement_range_y, script: o.script, flag: o.flag !== "0" ? o.flag : null,
      text: scriptText(name, o.script), item: item || undefined, mart: stock,
      trainer: trainer ? Object.assign({}, trainer, { sight: +o.trainer_sight_or_berry_tree_id || 0 }) : undefined,
      gfxVar: gfxVar ? "VAR_OBJ_GFX_ID_" + gfxVar : undefined,
      localId: typeof o.local_id === "string" && o.local_id !== "0" ? o.local_id : "LOCALID_" + name.replace(/([a-z])([A-Z0-9])/g, "$1_$2").toUpperCase() + "_" + i }, sp));
  });
  // (A step that starts a scene: while its var is at its value.)
  const triggers = (map.coord_events || []).filter((c) => c.type === "trigger" && c.script && c.script !== "NULL")
    .map((c) => ({ x: c.x, y: c.y, script: "hoenn:" + c.script, var: c.var, value: +c.var_value }));
  out[ren(name)] = {
    mt, name: ren(name), scriptName: ren(name) !== name ? name : undefined, title: titleCase(sectionNames[map.region_map_section] || name.replace(/([a-z])([A-Z0-9])/g, "$1 $2")),
    width: w, height: h, type: mapType === "city" ? "city" : mapType, music: musicOf(map.music), region: "hoenn",
    cycling: !!map.allow_cycling || undefined, allowEscaping: map.allow_escaping || undefined,
    showName: !!map.show_map_name, pokemonCenter: /_PokemonCenter_1F$/.test(name) || undefined, top: r.anyAbove, borderWidth: 2, borderHeight: 2,
    anim: anim.cells.length ? { cells: anim.cells, anims: primary.anims.map((a) => a.name) } : undefined,
    collision, elevation, behavior: behaviors, encounter,
    connections: (map.connections || []).map((c) => ({ map: byConst[c.map] ? ren(byConst[c.map]) : null, mapConst: c.map, direction: c.direction, offset: c.offset })),
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] ? ren(byConst[wp.dest_map]) : null, mapConst: wp.dest_map, warp: +wp.dest_warp_id })),
    signs: (map.bg_events || []).filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script, text: scriptText(name, b.script),
      facing: ({ BG_EVENT_PLAYER_FACING_NORTH: "up", BG_EVENT_PLAYER_FACING_SOUTH: "down", BG_EVENT_PLAYER_FACING_EAST: "right", BG_EVENT_PLAYER_FACING_WEST: "left" })[b.player_facing_dir] })),
    triggers,
    hidden: (map.bg_events || []).filter((b) => b.type === "hidden_item").map((b) => ({ x: b.x, y: b.y, item: itemId(b.item), flag: b.flag, quantity: b.quantity || 1 })).filter((x) => x.item),
    people,
    wild: enc && enc.land_mons ? slotsOf(enc, "land_mons") : null,
    water: slotsOf(enc, "water_mons"), rockSmash: slotsOf(enc, "rock_smash_mons"), fishing: slotsOf(enc, "fishing_mons")
  };
  console.log(name, w + "x" + h, "people", people.length, "signs", out[ren(name)].signs.length, "warps", out[ren(name)].warps.length);
}
// (Warps and connections to maps that aren't in the game are "unbuilt", as the engine says.)
for (const m of Object.values(out)) {
  for (const x of m.warps.concat(m.connections)) {
    if (x.map && !out[x.map]) x.map = null;
    if (x.map) delete x.mapConst;
  }
}
if (ONLY.length && OUT) process.exit(0);

// ---------- The scripts ----------
// (Every trainer a script battles: the rival's, the Gym Leaders', Wally's ...)
for (const cmds of Object.values(compiled.s)) for (const c of cmds) for (const arg of c.slice(1)) if (typeof arg === "string" && /^TRAINER_[A-Z0-9_]+$/.test(arg) && /^trainerbattle/.test(c[0])) trainerData(arg);
// What the interpreter needs besides them: where each map constant is, the heal locations, the menus' texts, and the flags a new game sets.
const mapConsts = {};
for (const [c, d] of Object.entries(byConst)) if (out[ren(d)]) mapConsts[c] = ren(d);
const heal = {};
for (const h of JSON.parse(fs.readFileSync(P("src/data/heal_locations.json"), "utf8")).heal_locations) if (mapConsts[h.map]) heal[h.id] = { map: mapConsts[h.map], x: h.x, y: h.y };
const strings = {};
for (const f of ["src/strings.c"]) for (const m of fs.readFileSync(P(f), "utf8").matchAll(/const u8 (gText_\w+)\[\]\s*=\s*_\("((?:[^"\\]|\\.)*)"\)/g)) strings[m[1]] = m[2];
const multi = {};
{
  const menu = fs.readFileSync(P("src/data/script_menu.h"), "utf8"), lists = {};
  for (const m of menu.matchAll(/static const struct MenuAction (MultichoiceList_\w+)\[\]\s*=\s*\{([\s\S]*?)\n\};/g)) {
    lists[m[1]] = [...m[2].matchAll(/\{(gText_\w+)/g)].map((x) => Scripts.text(strings[x[1]] || "").join(" ") || x[1]);
  }
  for (const m of menu.matchAll(/\[(MULTI_\w+)\]\s*=\s*MULTICHOICE\((\w+)\)/g)) if (lists[m[2]]) multi[m[1]] = lists[m[2]];
}
const init = [];
for (const c of compiled.s.EventScript_ResetAllMapFlags || []) if (/^(setflag|clearflag|setvar)$/.test(c[0])) init.push([c[0], c[1], c[2]]);
// (The looks a script gives someone: setvar VAR_OBJ_GFX_ID_n, OBJ_EVENT_GFX_X; and a person made by createvobject.)
const gfx = {};
for (const cmds of Object.values(compiled.s)) for (const c of cmds) for (const arg of c.slice(1)) if (typeof arg === "string" && /^OBJ_EVENT_GFX_/.test(arg) && !gfx[arg]) { const sp = objectSprite(arg); if (sp) gfx[arg] = sp; }
// (The songs and sounds a script plays, as this game's: Emerald's own, or FireRed's of that name.)
const songNames = {}, seNames = {};
for (const cmds of Object.values(compiled.s)) for (const c of cmds) for (const arg of c.slice(1)) {
  if (typeof arg !== "string") continue;
  if (/^MUS_[A-Z0-9_]+$/.test(arg) && !songNames[arg]) songNames[arg] = songOf(arg) || "mus_" + arg.slice(4).toLowerCase();
  else if (/^SE_[A-Z0-9_]+$/.test(arg) && !seNames[arg]) seNames[arg] = "se_" + arg.slice(3).toLowerCase();
}
const hoennScripts = { songNames, seNames, gfx, s: compiled.s, t: compiled.t, m: compiled.m, tb: compiled.tb, ms: compiled.ms, multi, heal, init, consts: mapConsts };

// ---------- The Town Map ----------
// Each map's section (its name on the map, and where it is on it); a map whose section has no square (a cave's)
// is where the nearest map that has one is, by its warps and connections.
const sectionOf = {};
for (const name of MAPS) sectionOf[ren(name)] = String(mapJson(name).region_map_section || "").replace(/^MAPSEC_/, "");
const townMapData = require("./lib/hoenn-town-map")(EM).build({ mapSections: sectionOf, heal, at: {} });
{
  const cellOf = {};
  townMapData.map.forEach((row, y) => row.forEach((sec, x) => { if (sec && !cellOf[sec]) cellOf[sec] = [x, y, 0]; }));
  for (const [name, m] of Object.entries(out)) {
    if (cellOf[sectionOf[name]]) continue;
    const seen = new Set([name]), queue = [name];
    while (queue.length) {
      const n = queue.shift();
      if (cellOf[sectionOf[n]]) { townMapData.at[name] = cellOf[sectionOf[n]]; break; }
      for (const x of out[n].warps.concat(out[n].connections)) if (x.map && !seen.has(x.map)) { seen.add(x.map); queue.push(x.map); }
    }
  }
}

// ---------- The data file ----------
const START = "// Hoenn (tools/build-hoenn.js, from pret/pokeemerald): its maps, trainers and scripts.\n", END = "// (End of Hoenn.)\n";
const js = START + "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\nObject.assign(window.WORLD_TRAINERS, " + JSON.stringify(WORLD_TRAINERS) + ");\nwindow.HOENN_SCRIPTS = " + JSON.stringify(hoennScripts) + ";\nwindow.HOENN_TOWN_MAP = " + JSON.stringify(townMapData) + ";\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
// (Whichever block this tool wrote before, its start line worded as it was.)
for (let a = text.indexOf("// Hoenn (tools/build-hoenn.js"); a >= 0; a = text.indexOf("// Hoenn (tools/build-hoenn.js")) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log("wrote " + MAPS.length + " Hoenn maps, " + Object.keys(WORLD_TRAINERS).length + " trainers to data/emerald-maps.js and assets/world/");
