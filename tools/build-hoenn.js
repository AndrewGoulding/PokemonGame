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
const OUTDOOR = ["InsideOfTruck", "LittlerootTown", "SootopolisCity", "SeafloorCavern_Entrance", "CaveOfOrigin_Entrance", "SealedChamber_OuterRoom", "AquaHideout_1F", "MagmaHideout_1F", "NewMauville_Entrance", "ShoalCave_LowTideEntranceRoom", "ShoalCave_HighTideEntranceRoom", "SSTidalCorridor", "MirageTower_1F",
  // (Maps only a script or Dive goes to: the Trick House's puzzles, the Abandoned Ship's hidden floor, the deep Marine Cave, Dive's last Underwater maps, the Artisan Cave, the high tide in the Shoal Cave.)
  "Route110_TrickHousePuzzle1", "Route110_TrickHousePuzzle2", "Route110_TrickHousePuzzle3", "Route110_TrickHousePuzzle4", "Route110_TrickHousePuzzle5", "Route110_TrickHousePuzzle6", "Route110_TrickHousePuzzle7", "Route110_TrickHousePuzzle8",
  "AbandonedShip_HiddenFloorCorridors", "AbandonedShip_HiddenFloorRooms", "AbandonedShip_Underwater1", "AbandonedShip_Underwater2", "MarineCave_Entrance", "MarineCave_End", "Underwater_Route134", "Underwater_SealedChamber",
  "ArtisanCave_1F", "ArtisanCave_B1F", "ShoalCave_HighTideInnerRoom",
  // (The Secret Bases: your own, in whichever way the spot you made it in has it.)
  ...["RedCave", "BrownCave", "BlueCave", "YellowCave", "Tree", "Shrub"].flatMap((t) => [1, 2, 3, 4].map((n) => "SecretBase_" + t + n)),
  // (The Battle Frontier's island, the three Battle Tents' rooms and the Contest Halls: script warps and the ferry go there.)
  "BattleFrontier_OutsideWest", "BattleFrontier_OutsideEast", "BattleFrontier_ReceptionGate", "SlateportCity_BattleTentBattleRoom", "SlateportCity_BattleTentCorridor", "VerdanturfTown_BattleTentBattleRoom", "VerdanturfTown_BattleTentCorridor",
  "FallarborTown_BattleTentBattleRoom", "FallarborTown_BattleTentCorridor", "ContestHall", "ContestHallBeauty", "ContestHallCool", "ContestHallCute", "ContestHallSmart", "ContestHallTough", "LilycoveCity_ContestHall", "LilycoveCity_ContestLobby"];   // (The rest are reached through the story: Dive, Sootopolis's way in, the hideouts' doors, the tides.)
const EXCLUDE = /^(BattleColosseum|TradeCenter|UnionRoom|RecordCorner|TrainerHill|.*Unused|.*Prototype|Dummy|BirthIsland|NavelRock|FarawayIsland|SouthernIsland|Test)/;
const mapJson = (name) => {
  const j = JSON.parse(fs.readFileSync(P("data/maps", name, "map.json"), "utf8"));
  // (Some maps, the Contest Halls', leave a kind of event out.)
  for (const k of ["object_events", "warp_events", "coord_events", "bg_events"]) j[k] = j[k] || [];
  return j;
};
const byConst = {};
for (const d of fs.readdirSync(P("data/maps"))) {
  const f = P("data/maps", d, "map.json");
  if (fs.existsSync(f)) byConst[JSON.parse(fs.readFileSync(f, "utf8")).id] = d;
}
// (Kanto has Victory Road's floors, and its Safari Zone's areas, under these names already.)
const RENAME = { VictoryRoad_1F: "HoennVictoryRoad_1F", VictoryRoad_B1F: "HoennVictoryRoad_B1F", VictoryRoad_B2F: "HoennVictoryRoad_B2F",
  SafariZone_North: "HoennSafariZone_North", SafariZone_Northeast: "HoennSafariZone_Northeast", SafariZone_Northwest: "HoennSafariZone_Northwest", SafariZone_South: "HoennSafariZone_South",
  SafariZone_Southeast: "HoennSafariZone_Southeast", SafariZone_Southwest: "HoennSafariZone_Southwest", SafariZone_RestHouse: "HoennSafariZone_RestHouse" };
const ren = (d) => RENAME[d] || d;
const MAPS = [];
{
  // (All the Battle Frontier's: its facilities' rooms are gone to by scripts.)
  for (const d of fs.readdirSync(P("data/maps"))) if (/^BattleFrontier_/.test(d) && !OUTDOOR.includes(d)) OUTDOOR.push(d);
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
  if (/^ITEM_(MACH|ACRO)_BIKE$/.test(String(c))) return "bicycle";
  if (c === "ITEM_X_SPECIAL") return "x-sp-atk";
  if (c === "ITEM_X_DEFEND") return "x-defense";
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
  const isPrimary = !!layoutsPrimary[sym];
  // (The secret bases' secondaries are each a folder of secondary/secret_base.)
  const folder = /^gTileset_SecretBase.+/.test(sym) ? "secret_base/" + sym.replace(/^gTileset_SecretBase/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase() : E.tilesetFolder(sym);
  const kind = !folder.includes("/") && fs.existsSync(P("data/tilesets/primary", folder)) ? "primary" : "secondary";
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

objectSprite("OBJ_EVENT_GFX_BRENDAN_UNDERWATER");   // (Diving: em_brendan_underwater.png, for ui/overworld.js)

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
const wildGroups = JSON.parse(fs.readFileSync(P("src/data/wild_encounters.json"), "utf8")).wild_encounter_groups;
const wild = wildGroups[0].encounters;
const pyramid = require("./lib/hoenn-pyramid")(EM, { species: (c) => dexByID[toID(String(c).replace(/^SPECIES_/, ""))], move: (c) => moveByID[toID(String(c).replace(/^MOVE_/, ""))], item: (c) => itemId(c) });
const pikeWild = wildGroups.find((g) => g.label === "gBattlePikeWildMonHeaders").encounters[0];
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
    case 0x14: case 0x18: case 0x1a: return 0x12;                    // Sootopolis' deep water (the ones Dive goes down from)
    case 0x19: case 0x22: case 0x2a: return b;                       // underwater: where you can't surface, seaweed, seaweed you can't surface from
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
const WILD_BEHAVIOR = new Set([0x02, 0x03, 0x05, 0x06, 0x08, 0x0b, 0x0c, 0x21, 0x22, 0x24, 0x25, 0x2a]);   // (0x22 and 0x2a: underwater seaweed)

// ---------- The scripts (compiled first: the maps' metatile changes come from them) ----------
const Scripts = require("./lib/emerald-script")(EM);
const compiled = Scripts.compile(MAPS);
// The metatile labels (METATILE_General_X) and their numbers, and which of them each map's scripts set.
const metatileIds = {};
for (const m of fs.readFileSync(P("include/constants/metatile_labels.h"), "utf8").matchAll(/#define (METATILE_\w+)\s+(0x[0-9A-Fa-f]+)/g)) metatileIds[m[1]] = parseInt(m[2], 16);
// (Metatiles a Gym's special sets besides its scripts' (src/field_specials.c): Petalburg's sliding doors and the
// ones below them (a row of the tileset on), Mauville's beams and switches, Sootopolis' ice.)
const EXTRA_METATILES = { PetalburgCity_Gym: /^METATILE_PetalburgGym_/, MauvilleCity_Gym: /^METATILE_MauvilleGym_/, SootopolisCity_Gym_1F: /^METATILE_SootopolisGym_/, SootopolisCity_Gym_B1F: /^METATILE_SootopolisGym_/ };
// (The maps whose metatiles a special reads: their blocks stay, as metatile numbers.)
const KEEP_BLOCKS = new Set(["MossdeepCity_Gym", "Route110_TrickHousePuzzle6", "Route110_TrickHousePuzzle7", "MauvilleCity_Gym", "SootopolisCity_Gym_1F", "SootopolisCity_Gym_B1F", "PetalburgCity_Gym"]);
const metatilesOf = {};
for (const [mp, re] of Object.entries(EXTRA_METATILES)) for (const l of Object.keys(metatileIds)) if (re.test(l)) (metatilesOf[mp] = metatilesOf[mp] || new Set()).add(l);
for (const [label, cmds] of Object.entries(compiled.s)) {
  const mp = compiled.lm[label];
  if (!mp) continue;
  for (const c of cmds) if (c[0] === "setmetatile" && typeof c[3] === "string" && metatileIds[c[3]] != null) (metatilesOf[mp] = metatilesOf[mp] || new Set()).add(c[3]);
}

// Emerald's metatile behaviours by name and number (the secret bases' floors and walls decide where decorations go).
const MBN = {};
{
  let n = 0;
  const text = fs.readFileSync(P("include/constants/metatile_behaviors.h"), "utf8");
  for (const line of text.slice(text.indexOf("{"), text.indexOf("};")).split("\n")) { const m = /^\s*(MB_\w+)/.exec(line); if (m) MBN[m[1]] = n++; }
}
// Secret base spots: the tile each is made of closed and, once it's somebody's base, open (src/secret_base.c).
const spotOpen = {};
for (const m of fs.readFileSync(P("src/secret_base.c"), "utf8").matchAll(/\.closedMetatileId = (\w+),\s*\.openMetatileId = (\w+)/g)) spotOpen[metatileIds[m[1]]] = metatileIds[m[2]];

// The layouts a map's scripts swap in (setmaplayoutindex: the Mirage Tower gone, Sky Pillar cleaned ...), by map.
const layoutSwaps = {};
for (const [label, cmds] of Object.entries(compiled.s)) {
  const mp = compiled.lm[label];
  if (mp) for (const c of cmds) if (c[0] === "setmaplayoutindex" && typeof c[1] === "string") (layoutSwaps[mp] = layoutSwaps[mp] || new Set()).add(c[1]);
}

// The berry trees' numbers (include/constants/berry.h), which the maps' people name.
const berryTreeIds = {};
for (const m of fs.readFileSync(P("include/constants/berry.h"), "utf8").matchAll(/^#define (BERRY_TREE_\w+)[ \t]+(\d+)/gm)) berryTreeIds[m[1]] = +m[2];

// A weather's name here: WEATHER_RAIN_THUNDERSTORM or COORD_EVENT_WEATHER_RAIN_THUNDERSTORM -> "thunderstorm" (ui/game.js has them by these).
const WEATHER_ALIAS = { rain_thunderstorm: "thunderstorm", underwater_bubbles: "underwater" };
const weatherKind = (w) => {
  const k = String(w || "").replace(/^(COORD_EVENT_)?WEATHER_/, "").toLowerCase();
  return !k || k === "none" ? "" : WEATHER_ALIAS[k] || k;
};

// ---------- Build ----------
const out = {};
for (const name of MAPS) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  // (The Battle Pyramid's floor is a 4 x 4 of its squares, laid out as you come in: the map's the plain floor, 32 x 32.)
  const pyramidFloor = name === "BattleFrontier_BattlePyramidFloor";
  const map = mapJson(name), layout = layouts[map.layout], w = pyramidFloor ? 32 : layout.width, h = pyramidFloor ? 32 : layout.height;
  const primary = tileset(layout.primary_tileset), secondary = tileset(layout.secondary_tileset);
  const bin = fs.readFileSync(P(layout.blockdata_filepath));
  const blocks = pyramidFloor ? Array(w * h).fill(0x28d) : Array.from({ length: w * h }, (_, i) => bin.readUInt16LE(i * 2));
  const r = E.render(blocks, w, h, primary, secondary, false);
  writePng(path.join(mapsDir, ren(name) + ".png"), w * 16, h * 16, r.below);
  const topFile = path.join(mapsDir, ren(name) + "-top.png");
  if (r.anyAbove) writePng(topFile, w * 16, h * 16, r.above); else if (fs.existsSync(topFile)) fs.unlinkSync(topFile);
  const bb = fs.readFileSync(P(layout.border_filepath));
  writePng(path.join(mapsDir, ren(name) + "-border.png"), 32, 32, E.render([0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2)), 2, 2, primary, secondary, true).below);
  const anim = E.animCells(blocks, w, h, primary, secondary), animFile = path.join(mapsDir, ren(name) + "-anim.png");
  if (anim.pics.length) E.writeAnimSheet(animFile, anim.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);

  const collision = [], elevation = [], behaviors = [], encounter = [], feeders = [];
  for (const b of blocks) {
    const mt = E.metatile(primary, secondary, b & 0x3ff), beh = behavior(mt.behavior);
    // (The Safari Zone's Pokéblock feeders are tiles, MB_POKEBLOCK_FEEDER, looked at as a sign: EventScript_PokeBlockFeeder.)
    if (mt.behavior === MBN.MB_POKEBLOCK_FEEDER) feeders.push({ x: collision.length % w, y: Math.floor(collision.length / w), script: "EventScript_PokeBlockFeeder" });
    collision.push((b >> 10) & 3 ? 1 : 0);
    elevation.push(b >> 12);
    behaviors.push(beh);
    // (The Battle Pike's hall of wild Pokémon: any tile, as StandardWildEncounter has it.)
    encounter.push(WILD_BEHAVIOR.has(mt.behavior) || name === "BattleFrontier_BattlePikeRoomWildMons" || pyramidFloor ? 1 : 0);
  }
  // The metatiles this map's scripts put in (setmetatile): a sheet of them, 16 to a row, below and above the people.
  let mt;
  let wanted = [...(metatilesOf[name] || [])].sort();
  if (pyramidFloor) wanted = [...new Set(pyramid.squares.flat().map((t) => t.m))].filter((m) => m !== 0x28d).map((m) => "#" + m);
  // (The tiles each swapped-in layout changes: where, and to what, as setmetatile would.)
  const layoutDiffs = {};
  for (const lid of layoutSwaps[name] || []) {
    const L = layouts[lid];
    if (!L || L.width !== w || L.height !== h || L.primary_tileset !== layout.primary_tileset || L.secondary_tileset !== layout.secondary_tileset) continue;
    const lbin = fs.readFileSync(P(L.blockdata_filepath)), list = [];
    for (let i = 0; i < w * h; i++) {
      const nb = lbin.readUInt16LE(i * 2);
      if ((nb & 0xfff) === (blocks[i] & 0xfff)) continue;
      list.push([i % w, Math.floor(i / w), nb & 0x3ff, (nb >> 10) & 3 ? 1 : 0]);
      wanted.push("#" + (nb & 0x3ff));
    }
    if (list.length) layoutDiffs[lid] = list;
  }
  wanted = [...new Set(wanted)];
  // (A secret base spot opens: its open tile.)
  for (const bg of map.bg_events || []) if (bg.type === "secret_base" && spotOpen[blocks[bg.y * w + bg.x] & 0x3ff]) wanted.push("#" + spotOpen[blocks[bg.y * w + bg.x] & 0x3ff]);
  if (name === "PetalburgCity_Gym") for (let i = 0; i < 5; i++) wanted.push("#" + (metatileIds["METATILE_PetalburgGym_SlidingDoor_Frame" + i] + 8));   // (the half below each frame: METATILE_ROW_WIDTH on)
  const idOf = (l) => (l[0] === "#" ? +l.slice(1) : metatileIds[l]);
  if (wanted.length) {
    const cols = 16, rows = Math.ceil(wanted.length / cols), ids = wanted.map(idOf);
    while (ids.length < cols * rows) ids.push(0);
    const sheet = E.render(ids, cols, rows, primary, secondary, true);
    writePng(path.join(mapsDir, ren(name) + "-mt.png"), cols * 16, rows * 16, sheet.below);
    writePng(path.join(mapsDir, ren(name) + "-mt-top.png"), cols * 16, rows * 16, sheet.above);
    mt = {};
    wanted.forEach((l, i) => { mt[l] = [i, behavior(E.metatile(primary, secondary, idOf(l)).behavior), idOf(l)]; });
  }
  // (Emerald's warps on plain ground are stepped onto: a doorway, as the engine has them.)
  for (const wp of map.warp_events) { const i = wp.y * w + wp.x; if (i >= 0 && i < behaviors.length && behaviors[i] === 0) behaviors[i] = 0x60; }
  const mapType = map.map_type.replace(/^MAP_TYPE_/, "").toLowerCase();
  // (The Battle Pike's wild room has its own table, gBattlePike_1's Pokémon: ui/hoenn-frontier.js sets their levels.)
  const enc = wild.find((e) => e.map === map.id) || (map.id === "MAP_BATTLE_FRONTIER_BATTLE_PIKE_ROOM_WILD_MONS" || pyramidFloor ? pikeWild : undefined);
  // (Secret bases and your room: where decorations can go, by tile: f floor, w the wall's foot, s a spot for something small
  // (a doll or a cushion), l one for something large, c the PC; as src/decoration.c reads the tiles' behaviours.)
  let decorKind;
  if (/^SecretBase_/.test(name) || /^LittlerootTown_(Brendans|Mays)House_2F$/.test(name)) {
    decorKind = blocks.map((bl, i) => {
      const beh = E.metatile(primary, secondary, bl & 0x3ff).behavior;
      return beh === MBN.MB_NORMAL && !((bl >> 10) & 3) ? "f" : beh === MBN.MB_SECRET_BASE_NORTH_WALL ? "w" : beh === MBN.MB_HOLDS_SMALL_DECORATION ? "s" : beh === MBN.MB_HOLDS_LARGE_DECORATION ? "l" : beh === MBN.MB_SECRET_BASE_PC ? "c" : "x";
    }).join("");
    if (!/[fwsl]/.test(decorKind)) decorKind = undefined;
  }
  const decorPc = decorKind && decorKind.indexOf("c") >= 0 ? { x: decorKind.indexOf("c") % w, y: Math.floor(decorKind.indexOf("c") / w) } : null;
  const people = [];
  map.object_events.forEach((o, i) => {
    // (Someone whose look a var holds, the rival's or Wally's: shown once a script has set it: gfxVar.)
    const gfxVar = (/^OBJ_EVENT_GFX_VAR_(\w)$/.exec(o.graphics_id) || [])[1];
    const sp = gfxVar ? objectSprite("OBJ_EVENT_GFX_BOY_1") : objectSprite(o.graphics_id);
    // (A berry tree: a spot on the farm's engine, ui/berry-farm.js, its look decided as the map is drawn.)
    if (/^OBJ_EVENT_GFX_BERRY_TREE/.test(o.graphics_id)) {
      people.push({ id: i, x: o.x, y: o.y, movement: "face_down", rangeX: 0, rangeY: 0, script: "HoennBerry_Tree_" + (berryTreeIds[o.trainer_sight_or_berry_tree_id] || 0), flag: null, text: null,
        sprite: "berry_soil", width: 16, height: 32, frames: 9, localId: "LOCALID_" + name.replace(/([a-z])([A-Z0-9])/g, "$1_$2").toUpperCase() + "_" + i });
      return;
    }
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
    mt, layouts: Object.keys(layoutDiffs).length ? layoutDiffs : undefined, blocks: KEEP_BLOCKS.has(name) ? blocks.map((b) => b & 0x3ff) : undefined, name: ren(name), scriptName: map.shared_scripts_map || (ren(name) !== name ? name : undefined), title: titleCase(sectionNames[map.region_map_section] || name.replace(/([a-z])([A-Z0-9])/g, "$1 $2")),
    width: w, height: h, type: mapType === "city" ? "city" : mapType, music: musicOf(map.music), region: "hoenn",
    cycling: !!map.allow_cycling || undefined, allowEscaping: map.allow_escaping || undefined,
    showName: !!map.show_map_name, pokemonCenter: /_PokemonCenter_1F$/.test(name) || undefined, top: r.anyAbove, borderWidth: 2, borderHeight: 2,
    anim: anim.cells.length ? { cells: anim.cells, anims: primary.anims.map((a) => a.name) } : undefined,
    collision, elevation, behavior: behaviors, encounter,
    connections: (map.connections || []).map((c) => ({ map: byConst[c.map] ? ren(byConst[c.map]) : null, mapConst: c.map, direction: c.direction, offset: c.offset })),
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] ? ren(byConst[wp.dest_map]) : null, mapConst: wp.dest_map, warp: +wp.dest_warp_id })),
    signs: (map.bg_events || []).filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script, text: scriptText(name, b.script),
      facing: ({ BG_EVENT_PLAYER_FACING_NORTH: "up", BG_EVENT_PLAYER_FACING_SOUTH: "down", BG_EVENT_PLAYER_FACING_EAST: "right", BG_EVENT_PLAYER_FACING_WEST: "left" })[b.player_facing_dir] }))
      // (A secret base spot: look at it and the base's scripts take over; once it's yours, it's open and the way in. `spot`: its place.)
      .concat((map.bg_events || []).filter((b) => b.type === "secret_base").map((b) => ({ x: b.x, y: b.y, script: "SecretBase_EventScript_CheckEntrance", spot: b.secret_base_id, closed: blocks[b.y * w + b.x] & 0x3ff, open: spotOpen[blocks[b.y * w + b.x] & 0x3ff] })))
      // (A secret base's PC.)
      .concat(decorPc && /^SecretBase_/.test(name) ? [{ x: decorPc.x, y: decorPc.y, script: "SecretBase_EventScript_PC" }] : [])
      .concat(feeders),
    decorKind, decorSheet: /^SecretBase_/.test(name) ? name.replace(/^SecretBase_/, "").replace(/\d$/, "") : undefined,
    triggers,
    // (Weather: the header's, which the map has as you come in, and the steps that change it: src/coord_event_weather.c.)
    weatherHeader: weatherKind(map.weather) || undefined,
    weatherSteps: (map.coord_events || []).filter((c) => c.type === "weather").map((c) => ({ x: c.x, y: c.y, weather: weatherKind(c.weather) })),
    hidden: (map.bg_events || []).filter((b) => b.type === "hidden_item").map((b) => ({ x: b.x, y: b.y, item: itemId(b.item), flag: b.flag, quantity: b.quantity || 1 })).filter((x) => x.item),
    people,
    // (Underwater, the seaweed has the water's Pokémon, with the water's odds.)
    wild: mapType === "underwater" ? (slotsOf(enc, "water_mons") && Object.assign(slotsOf(enc, "water_mons"), { weights: [60, 30, 5, 4, 1] })) || null : enc && enc.land_mons ? slotsOf(enc, "land_mons") : null,
    water: mapType === "underwater" ? undefined : slotsOf(enc, "water_mons"), rockSmash: slotsOf(enc, "rock_smash_mons"), fishing: slotsOf(enc, "fishing_mons")
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
// The berry trees Emerald's new game starts with (data/scripts/new_game.inc: setberrytree: all fully grown), by tree number.
const berryTrees = {};
{
  const defs = berryTreeIds;
  for (const m of fs.readFileSync(P("data/scripts/new_game.inc"), "utf8").matchAll(/setberrytree (\w+),\s*ITEM_TO_BERRY\((\w+)\),\s*BERRY_STAGE_(\w+)/g)) {
    const berry = itemId(m[2]);
    if (defs[m[1]] != null && berry) berryTrees[defs[m[1]]] = { berry, stage: m[3] === "BERRIES" ? 5 : 1 };
  }
}
// In-game trades (src/data/trade.h): what they ask for and what you get, by their INGAME_TRADE_ names.
const trades = {};
{
  const src = fs.readFileSync(P("src/data/trade.h"), "utf8"), at = src.indexOf("sIngameTrades[]");
  const title = (t) => t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  const spec = (c) => dexByID[toID(String(c).replace(/^SPECIES_/, ""))];
  for (const m of src.slice(at).matchAll(/\[(INGAME_TRADE_\w+)\] =\s*\{([\s\S]*?)\n    \},/g)) {
    const b = m[2], g = (re) => (re.exec(b) || [])[1];
    trades[m[1]] = {
      nickname: title(g(/\.nickname = _\("([^"]*)"\)/)), species: spec(g(/\.species = (\w+)/)), requested: spec(g(/\.requestedSpecies = (\w+)/)),
      ivs: g(/\.ivs = \{([^}]*)\}/).split(",").map((x) => +x.trim()), ability: +g(/\.abilityNum = (\d+)/), otId: +g(/\.otId = (\d+)/),
      personality: parseInt(g(/\.personality = (\w+)/)), item: itemId(g(/\.heldItem = (\w+)/)) || undefined, otName: title(g(/\.otName = _\("([^"]*)"\)/)), otGender: g(/\.otGender = (\w+)/)
    };
  }
}
// The numbers behind the constants the scripts compare and set (include/constants/*.h: #define NAME 5, a few of its expressions).
const numConsts = {};
{
  const defs = {}, dir = P("include/constants");
  for (const f of fs.readdirSync(dir)) if (/\.h$/.test(f)) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/^#define (\w+)[ \t]+(.+?)[ \t]*(?:\/\/.*|\/\*.*)?$/gm)) defs[m[1]] = m[2];
  const val = (e, depth) => {
    e = String(e).trim();
    if (/^-?\d+$/.test(e)) return +e;
    if (/^0x[0-9a-f]+$/i.test(e)) return parseInt(e, 16);
    if ((depth || 0) < 6 && /^\w+$/.test(e) && defs[e] != null) return val(defs[e], (depth || 0) + 1);
    const p = /^\((.*)\)$/.exec(e);
    if (p) return val(p[1], (depth || 0) + 1);
    const b = /^(\w+)\s*([-+*\/])\s*(\w+)$/.exec(e);
    if (b) { const x = val(b[1], (depth || 0) + 1), y = val(b[3], (depth || 0) + 1); return x == null || y == null ? null : b[2] === "+" ? x + y : b[2] === "-" ? x - y : b[2] === "*" ? x * y : Math.floor(x / y); }
    return null;
  };
  const STRINGY = /^(VAR_|FLAG_|LOCALID_|MAP_|ITEM_|SPECIES_|MOVE_|TRAINER_|MOVEMENT_|SE_|MUS_|STR_VAR|MSGBOX_|MULTI_(?!PARTY_SIZE)|CRY_|OBJ_EVENT_GFX|HEAL_LOCATION|WEATHER_|FLDEFF_|SPECIAL|NPC_|ABILITY_|TYPE_)/;
  for (const cmds of Object.values(compiled.s)) for (const c of cmds) for (const a of c.slice(1)) {
    if (typeof a === "string" && /^[A-Z][A-Z0-9_]+$/.test(a) && !STRINGY.test(a) && numConsts[a] == null) { const v = val(a); if (v != null) numConsts[a] = v; }
  }
}
// Where the rotating-tile puzzles' arrows start in their tilesets (src/rotating_tile_puzzle.c): Mossdeep Gym's, and the Trick House's.
const rotStart = { gym: metatileIds.METATILE_MossdeepGym_YellowArrow_Right, trick: metatileIds.METATILE_TrickHousePuzzle_Arrow_YellowOnWhite_Right };
// Decorations (src/data/decoration): the catalogue, and the pictures of their tiles for each kind of secret base.
const decorData = require("./lib/hoenn-decor")(EM, metatileIds, (g) => { const sp = objectSprite(g); return sp ? { sprite: sp.sprite, width: sp.width, height: sp.height, frames: sp.frames } : null; });
for (const type of ["RedCave", "BrownCave", "BlueCave", "YellowCave", "Tree", "Shrub"]) {
  const L = layouts["LAYOUT_SECRET_BASE_" + type.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase() + "1"];
  const primary = tileset(L.primary_tileset), secondary = tileset(L.secondary_tileset), cols = 16, count = 0x341 - 512, rows = Math.ceil(count / cols);
  const ids = Array.from({ length: cols * rows }, (_, i) => 512 + Math.min(i, count - 1));
  const sheet = E.render(ids, cols, rows, primary, secondary, true);
  writePng(path.join(mapsDir, "_decor_" + type + "-mt.png"), cols * 16, rows * 16, sheet.below);
  writePng(path.join(mapsDir, "_decor_" + type + "-mt-top.png"), cols * 16, rows * 16, sheet.above);
}
// The Battle Frontier's trainers, Pokémon and rules.
const frontier = require("./lib/hoenn-frontier")(EM, { species: (c) => dexByID[toID(String(c).replace(/^SPECIES_/, ""))], move: (c) => moveByID[toID(String(c).replace(/^MOVE_/, ""))], item: (c) => itemId(c), trainerPic }).data;
frontier.brainTrainers = ["ANABEL", "TUCKER", "SPENSER", "GRETA", "NOLAND", "LUCY", "BRANDON"].map((n) => { const t = trainerData("TRAINER_" + n); return { cls: t.className, name: t.name, pic: t.pic }; });
for (const g of Object.values(frontier.look).concat(frontier.pike.npcs.map((n) => n.gfx), ["OBJ_EVENT_GFX_LINK_RECEPTIONIST", "OBJ_EVENT_GFX_DUSCLOPS", "OBJ_EVENT_GFX_KIRLIA", "OBJ_EVENT_GFX_GENTLEMAN"]))   if (!gfx[g]) { const sp = objectSprite(g); if (sp) gfx[g] = sp; }
for (const g of Object.values(frontier.look).concat(frontier.brainLook, ["OBJ_EVENT_GFX_BOY_1"])) if (!gfx[g]) { const sp = objectSprite(g); if (sp) gfx[g] = sp; }
// The Contests: the other contestants and the moves' appeal.
const contest = require("./lib/hoenn-contest")(EM, { species: (c) => dexByID[toID(String(c).replace(/^SPECIES_/, ""))], move: (c) => moveByID[toID(String(c).replace(/^MOVE_/, ""))] });
for (const o of contest.opponents) if (o && o.gfx && !gfx[o.gfx]) { const sp = objectSprite(o.gfx); if (sp) gfx[o.gfx] = sp; }
for (const g of ["OBJ_EVENT_GFX_BRENDAN_NORMAL", "OBJ_EVENT_GFX_MAY_NORMAL"]) if (!gfx[g]) { const sp = objectSprite(g); if (sp) gfx[g] = sp; }
const hoennScripts = { songNames, seNames, gfx, s: compiled.s, t: compiled.t, m: compiled.m, tb: compiled.tb, ms: compiled.ms, multi, heal, init, trades, berryTrees, rotStart, decor: decorData.list, decorCategories: decorData.CATEGORIES, numConsts, consts: mapConsts };

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
const js = START + "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\nObject.assign(window.WORLD_TRAINERS, " + JSON.stringify(WORLD_TRAINERS) + ");\nwindow.HOENN_SCRIPTS = " + JSON.stringify(hoennScripts) + ";\nwindow.HOENN_FRONTIER = " + JSON.stringify(frontier) + ";\nwindow.HOENN_CONTEST = " + JSON.stringify(contest) + ";\nwindow.HOENN_PYRAMID = " + JSON.stringify(pyramid) + ";\nwindow.HOENN_TOWN_MAP = " + JSON.stringify(townMapData) + ";\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
// (Whichever block this tool wrote before, its start line worded as it was.)
for (let a = text.indexOf("// Hoenn (tools/build-hoenn.js"); a >= 0; a = text.indexOf("// Hoenn (tools/build-hoenn.js")) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log("wrote " + MAPS.length + " Hoenn maps, " + Object.keys(WORLD_TRAINERS).length + " trainers to data/emerald-maps.js and assets/world/");
