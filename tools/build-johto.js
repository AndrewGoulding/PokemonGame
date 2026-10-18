// Builds the first Johto maps from HeartGold and SoulSilver
// (a pret/pokeheartgold checkout): Cherrygrove City, Route 29, New Bark
// Town; west and north to Violet City, Azalea Town and Goldenrod City
// (Routes 30 to 36 and 46, the Ruins of Alph); and the way to Kanto: Route 27, Tohjo Falls and Route 26, whose gate
// at the top is the Pokémon League's (FireRed's Route22_NorthEntrance, its
// way west into Johto drawn here, and open to the Champion: ui/game.js).
//
//   node tools/build-johto.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// HGSS maps are 3D (each 32x32-tile chunk an NSBMD model, with building
// models placed on it); tools/lib/hgss-map.js draws them as this game's
// 2D maps at 16 px a tile, as FireRed would show them. From the checkout:
// map headers and the overworld matrix, land data (permissions, buildings,
// models), area data and textures (files/a/...), events
// (files/fielddata/eventdata/zone_event), scripts and text (for what people
// and signs say), wild Pokémon (gs_enc_data.json) and people's sprites
// (files/data/mmodel).
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png   the pictures
//   assets/world/sprites/hgss_<name>.png   people, in FireRed's frame order
//                                          (32x32 frames: stand down, up, left;
//                                          walk down x2, up x2, left x2)
//   data/johto-maps.js      window.WORLD_MAPS entries for them (merged into
//                           FireRed's): size, collision, behaviour (HGSS's
//                           numbers turned into FireRed's), warps (to maps not
//                           built yet), signs, everyone on them (people,
//                           trainers, item balls, small trees, breakable
//                           rocks, Apricorn trees), step triggers, hidden
//                           items, wild Pokémon (morning, day and night),
//                           Surf, fishing and Rock Smash; and after them,
//                           window.JOHTO_SCRIPTS (their field scripts, compiled
//                           by tools/lib/hgss-script.js for ui/johto-script.js),
//                           their trainers (window.WORLD_TRAINERS) and the
//                           Apricorns and key items the scripts use.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readPng, writePng } = require("./lib/png");
const { renderMap } = require("./lib/hgss-map");
const HC = require("./lib/hgss-classes");
const Painter = require("./lib/fr-painter");
const { writeAnimSheet } = require("./lib/fr-tiles");
const N = require("./lib/nitro");
const HS = require("./lib/hgss-script");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEHEARTGOLD;
// (Drawn in FireRed's style, as Kanto is (tools/lib/fr-painter.js); with --hgss, as HGSS draws them.)
const HGSS_LOOK = process.argv.includes("--hgss");
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/fielddata"))) {
  console.error("Usage: node tools/build-johto.js <path to pret/pokeheartgold> [--hgss]");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/items.js"), "utf8"));
const F = (p) => path.join(ROOT, "files", p);

// The maps (their places on HGSS's world matrix join them up).
// (Music: FireRed's nearest, until Johto's own is built.)
// (ground: the map isn't flat, so it's drawn from each tile's ground: tools/lib/hgss-map.js.)
const MAPS = [
  { c: "MAP_CHERRYGROVE", name: "CherrygroveCity", title: "Cherrygrove City", type: "city", zone: "T21", music: "mus_pewter" },
  { c: "MAP_ROUTE_29", name: "Route29", title: "Route 29", type: "route", zone: "R29", music: "mus_route1" },
  { c: "MAP_NEW_BARK", name: "NewBarkTown", title: "New Bark Town", type: "town", zone: "T20", music: "mus_pallet" },
  { c: "MAP_ROUTE_27", name: "Route27", title: "Route 27", type: "route", zone: "R27", music: "mus_route3", ground: true },
  { c: "MAP_TOHJO_FALLS", name: "TohjoFalls", title: "Tohjo Falls", type: "underground", zone: "D45R0101", music: "mus_mt_moon", ground: true },
  { c: "MAP_ROUTE_26", name: "Route26", title: "Route 26", type: "route", zone: "R26", music: "mus_route3", ground: true },
  // West and north of Cherrygrove: to Violet City, Azalea Town and Goldenrod City.
  { c: "MAP_ROUTE_30", name: "Route30", title: "Route 30", type: "route", zone: "R30", music: "mus_route1", ground: true },
  { c: "MAP_ROUTE_31", name: "Route31", title: "Route 31", type: "route", zone: "R31", music: "mus_route1", ground: true },
  { c: "MAP_VIOLET", name: "VioletCity", title: "Violet City", type: "city", zone: "T22", music: "mus_vermillion", ground: true },
  { c: "MAP_ROUTE_32", name: "Route32", title: "Route 32", type: "route", zone: "R32", music: "mus_route3", ground: true },
  { c: "MAP_ROUTE_33", name: "Route33", title: "Route 33", type: "route", zone: "R33", music: "mus_route3", ground: true },
  { c: "MAP_AZALEA", name: "AzaleaTown", title: "Azalea Town", type: "town", zone: "T23", music: "mus_fuchsia", ground: true },
  { c: "MAP_ROUTE_34", name: "Route34", title: "Route 34", type: "route", zone: "R34", music: "mus_route11", ground: true },
  { c: "MAP_GOLDENROD", name: "GoldenrodCity", title: "Goldenrod City", type: "city", zone: "T25", music: "mus_celadon", ground: true },
  { c: "MAP_ROUTE_35", name: "Route35", title: "Route 35", type: "route", zone: "R35", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_36", name: "Route36", title: "Route 36", type: "route", zone: "R36", music: "mus_route11", ground: true },
  { c: "MAP_RUINS_OF_ALPH", name: "RuinsOfAlph", title: "Ruins of Alph", type: "route", zone: "D24R0101", music: "mus_sevii_route", ground: true },
  { c: "MAP_ROUTE_46", name: "Route46", title: "Route 46", type: "route", zone: "R46", music: "mus_route24", ground: true },
  // The gatehouses, caves and forest between them (each on its own matrix).
  { c: "MAP_ROUTE_29_ROUTE_46_GATEHOUSE", name: "Route29_Route46_Gatehouse", title: "Route 29", type: "indoor", zone: "R29R0101", music: "mus_route1", ground: true },
  { c: "MAP_ROUTE_31_VIOLET_GATEHOUSE", name: "Route31_VioletGatehouse", title: "Route 31", type: "indoor", zone: "R31R0101", music: "mus_route1", ground: true },
  { c: "MAP_VIOLET_ROUTE_36_GATEHOUSE", name: "VioletCity_Route36_Gatehouse", title: "Violet City", type: "indoor", zone: "T22R0701", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_32_RUINS_OF_ALPH_GATEHOUSE", name: "Route32_RuinsOfAlph_Gatehouse", title: "Route 32", type: "indoor", zone: "R32R0101", music: "mus_route3", ground: true },
  { c: "MAP_ROUTE_36_RUINS_OF_ALPH_GATEHOUSE", name: "Route36_RuinsOfAlph_Gatehouse", title: "Route 36", type: "indoor", zone: "R36R0101", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_35_GOLDENROD_GATEHOUSE", name: "Route35_Goldenrod_Gatehouse", title: "Route 35", type: "indoor", zone: "R35R0101", music: "mus_route11", ground: true },
  { c: "MAP_UNION_CAVE_1F", name: "UnionCave_1F", title: "Union Cave", type: "underground", zone: "D25R0101", music: "mus_mt_moon", ground: true },
  { c: "MAP_AZALEA_ILEX_FOREST_GATEHOUSE", name: "AzaleaTown_IlexForest_Gatehouse", title: "Azalea Town", type: "indoor", zone: "T23R0101", music: "mus_route11", ground: true },
  { c: "MAP_ILEX_FOREST", name: "IlexForest", title: "Ilex Forest", type: "route", zone: "D36R0101", music: "mus_viridian_forest", ground: true },
  { c: "MAP_ROUTE_34_ILEX_FOREST_GATEHOUSE", name: "Route34_IlexForest_Gatehouse", title: "Route 34", type: "indoor", zone: "R34R0201", music: "mus_route11", ground: true },
  // Rooms, as HGSS lays them out (so their scripts' steps and places hold):
  // Elm's Lab, where Johto's story starts, Mr. Pokémon's house, the houses
  // round them; and the Pokémon Centers and Poké Marts as FireRed's own
  // (template: "pc" or "mart", as the gatehouses are FireRed's gates).
  { c: "MAP_NEW_BARK_ELMS_LAB_1F", name: "NewBarkTown_ElmsLab", title: "New Bark Town", type: "indoor", zone: "T20R0101", music: "mus_oak_lab", ground: true },
  { c: "MAP_NEW_BARK_RIVAL_HOUSE_1F", name: "NewBarkTown_LyrasHouse_1F", title: "New Bark Town", type: "indoor", zone: "T20R0401", music: "mus_pallet", ground: true },
  { c: "MAP_NEW_BARK_SOUTHWEST_HOUSE", name: "NewBarkTown_House", title: "New Bark Town", type: "indoor", zone: "T20R0301", music: "mus_pallet", ground: true },
  { c: "MAP_ROUTE_30_MR_POKEMON_HOUSE", name: "Route30_MrPokemonsHouse", title: "Route 30", type: "indoor", zone: "R30R0201", music: "mus_route1", ground: true },
  { c: "MAP_ROUTE_30_APRICORN_HOUSE", name: "Route30_ApricornHouse", title: "Route 30", type: "indoor", zone: "R30R0101", music: "mus_route1", ground: true },
  { c: "MAP_CHERRYGROVE_SOUTHWEST_HOUSE", name: "CherrygroveCity_House1", title: "Cherrygrove City", type: "indoor", zone: "T21R0301", music: "mus_pewter", ground: true },
  { c: "MAP_CHERRYGROVE_GUIDE_GENT_HOUSE", name: "CherrygroveCity_GuideGentsHouse", title: "Cherrygrove City", type: "indoor", zone: "T21R0401", music: "mus_pewter", ground: true },
  { c: "MAP_CHERRYGROVE_SOUTHEAST_HOUSE", name: "CherrygroveCity_House2", title: "Cherrygrove City", type: "indoor", zone: "T21R0501", music: "mus_pewter", ground: true },
  { c: "MAP_CHERRYGROVE_POKECENTER_1F", name: "CherrygroveCity_PokemonCenter_1F", title: "Cherrygrove City", type: "indoor", zone: "T21PC0101", music: "mus_poke_center", ground: true, template: "pc" },
  { c: "MAP_CHERRYGROVE_POKEMART", name: "CherrygroveCity_Mart", title: "Cherrygrove City", type: "indoor", zone: "T21FS0101", music: "mus_poke_center", ground: true, template: "mart" },
  { c: "MAP_VIOLET_POKECENTER_1F", name: "VioletCity_PokemonCenter_1F", title: "Violet City", type: "indoor", zone: "T22PC0101", music: "mus_poke_center", ground: true, template: "pc" },
  { c: "MAP_VIOLET_POKEMART", name: "VioletCity_Mart", title: "Violet City", type: "indoor", zone: "T22FS0101", music: "mus_poke_center", ground: true, template: "mart" },
  { c: "MAP_ROUTE_32_POKECENTER_1F", name: "Route32_PokemonCenter_1F", title: "Route 32", type: "indoor", zone: "R32PC0101", music: "mus_poke_center", ground: true, template: "pc" },
  { c: "MAP_AZALEA_POKECENTER_1F", name: "AzaleaTown_PokemonCenter_1F", title: "Azalea Town", type: "indoor", zone: "T23PC0101", music: "mus_poke_center", ground: true, template: "pc" },
  { c: "MAP_AZALEA_POKEMART", name: "AzaleaTown_Mart", title: "Azalea Town", type: "indoor", zone: "T23FS0101", music: "mus_poke_center", ground: true, template: "mart" },
  { c: "MAP_GOLDENROD_POKECENTER_1F", name: "GoldenrodCity_PokemonCenter_1F", title: "Goldenrod City", type: "indoor", zone: "T25PC0101", music: "mus_poke_center", ground: true, template: "pc" }
];
// The Pokémon League Reception Gate is FireRed's own (Route22_NorthEntrance):
// Route 26's door into it is its new way west (data/johto-maps.js adds it).
const GATE = { name: "Route22_NorthEntrance", x: 0, y: 6 };
const byConst = Object.fromEntries(MAPS.map((m) => [m.c, m.name]));

// HGSS tile behaviours (include/constants/metatile_behavior.h) as FireRed's
// (game/world.js's MB): most kept Gen 3's numbers.
function frBehavior(b) {
  switch (b) {
    case 0x02: case 0x03: return 0x02;            // tall grass, very tall grass
    case 0x10: return 0x10;                       // river: pond water
    case 0x13: return 0x13;                       // waterfall
    case 0x15: return 0x15;                       // sea
    case 0x16: case 0x1d: return 0x16;            // puddles
    case 0x17: return 0x17;                       // shallow water
    case 0x20: return 0x23;                       // ice
    case 0x21: return 0x21;                       // sand
    case 0x38: case 0x39: case 0x3a: case 0x3b: return b;   // ledges
    case 0x62: case 0x63: case 0x64: case 0x65: return b;   // warps you walk off
    case 0x6c: return 0x62; case 0x6d: return 0x63; case 0x6e: return 0x64; case 0x6f: return 0x65;
    case 0x67: return 0x67;                       // warp pad
    case 0x5e: case 0x5f: return 0x61;            // stairs you walk onto (a cave's floors): a ladder's step-on warp
    case 0x69: return 0x69;                       // door
    case 0x83: case 0x85: case 0x86: return b;    // PC, town map, TV
    default: return 0;                            // (headbutt trees and the like: collision does it)
  }
}

const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
const species = (s) => dexByID[toID(String(s).replace(/^SPECIES_/, ""))] || null;

// ---------- Text: what people and signs say ----------

const msgFiles = fs.readdirSync(F("msgdata/msg"));
const messages = {};
function loadMessages(zone) {
  const file = msgFiles.find((f) => new RegExp("^msg_\\d+_" + zone + "\\.json$").test(f));
  if (!file) return;
  for (const m of JSON.parse(fs.readFileSync(F("msgdata/msg/" + file), "utf8")).messages) messages[m.id] = m.en_US;
}
// HGSS text as this game's pages: \r and \f start a new page, \n a new line;
// the player's name ({STRVAR_1 3, 0, 0}) is {PLAYER}.
function pages(text) {
  if (text == null) return null;
  const s = [].concat(text).join("").replace(/\{STRVAR_1 \d+, 0, \d+\}/g, "{PLAYER}").replace(/\{[^}]*\}/g, (m) => (m === "{PLAYER}" ? m : ""))
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  return s.split(/[\r\f]/).map((p) => p.replace(/\n$/, "")).filter((p) => p.trim());
}
const scriptSrc = {};
function scriptText(zone, ref) {
  const m = /scr_seq_(\w+?)_(\d+)/.exec(String(ref || ""));
  if (!m) return null;
  if (!scriptSrc[zone]) {
    const file = fs.readdirSync(F("fielddata/script/scr_seq")).find((f) => new RegExp("^scr_seq_\\d+_" + zone + "\\.s$").test(f));
    scriptSrc[zone] = file ? fs.readFileSync(F("fielddata/script/scr_seq/" + file), "utf8") : "";
  }
  const src = scriptSrc[zone], label = "scr_seq_" + m[1] + "_" + m[2] + ":";
  const at = src.indexOf("\n" + label);
  if (at < 0) return null;
  // The first message after its label, before the next script's.
  const next = src.indexOf("\nscr_seq_", at + label.length + 1);
  const body = src.slice(at, next < 0 ? undefined : next);
  const msg = /\b(msg_\d+_\w+?_\d+)\b/.exec(body);
  const text = msg ? pages(messages[msg[1]]) : null;
  // (A sign naming your friend's house: Lyra's, as for a boy.)
  return text && /BufferFriendsName 0/.test(body) ? text.map((p) => p.replace(/\{PLAYER\}/g, "Lyra")) : text;
}

// ---------- People's sprites ----------

const spriteTable = {};
for (const m of fs.readFileSync(path.join(ROOT, "asm/overlay_01_sprite_data.s"), "utf8").matchAll(/\.short (SPRITE_\w+), (MMODEL_\w+)/g)) spriteTable[m[1]] = m[2];
const mmodelIndex = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/mmodel.h"), "utf8").matchAll(/#define (MMODEL_\w+)\s+(\d+)/g)) mmodelIndex[m[1]] = +m[2];
// HGSS's frames: up, down, left, right, four each (stand, step, stand, step).
// FireRed's: stand down, up, left; walk down, down, up, up, left, left.
const FR_FRAMES = [4, 0, 8, 5, 7, 1, 3, 9, 11];
// In FireRed's style (not --hgss): HGSS's people as FireRed's nearest
// (their size and frames as Kanto's people with that sprite have them).
const FR_PEOPLE = {
  SPRITE_GSBOY1: "boy", SPRITE_GSBOY2: "youngster", SPRITE_GSBOY3: "camper", SPRITE_GSBABYBOY1: "little_boy",
  SPRITE_GSGIRL1: "lass", SPRITE_GSGIRL2: "little_girl", SPRITE_GSGIRL3: "picnicker",
  SPRITE_GSWOMAN1: "woman_1", SPRITE_GSWOMAN2: "woman_2", SPRITE_GSWOMAN3: "woman_3", SPRITE_MIDDLEWOMAN1_2: "mom",
  SPRITE_GSMAN1: "man", SPRITE_GSMAN2: "cooltrainer_m", SPRITE_GSMAN3: "cooltrainer_m", SPRITE_GSBIGMAN: "fat_man", SPRITE_GSMIDDLEMAN1: "balding_man",
  SPRITE_GSOLDMAN1: "old_man_1", SPRITE_GSOLDWOMAN1: "old_woman", SPRITE_JUGGRER: "gentleman", SPRITE_COUNTERM: "clerk",
  SPRITE_ROCKETM: "rocket_m", SPRITE_ROCKETW: "rocket_f", SPRITE_POLICEMAN: "policeman", SPRITE_PICNICGIRL_2: "picnicker",
  SPRITE_CAMPBOY_2: "camper", SPRITE_FISHING_2: "fisher", SPRITE_MOUNT_2: "hiker", SPRITE_DOCTOR: "scientist", SPRITE_GSMAMA: "mom",
  SPRITE_GSFIGHTER: "black_belt", SPRITE_MANIA: "poke_maniac", SPRITE_SUIT: "gentleman",
  SPRITE_FIRE: "man", SPRITE_MYSTERY_2: "boy", SPRITE_OOKIDO: "prof_oak", SPRITE_PCWOMAN1: "nurse", SPRITE_SHOPM1_2: "clerk",
  SPRITE_ASSISTANTM: "scientist", SPRITE_INSTRUCTOR: "man", SPRITE_GSGENTLEMAN: "gentleman", SPRITE_MIDDLEWOMAN1_2: "mom",
  SPRITE_GSDSBOY: "boy", SPRITE_GSBABYGIRL1: "little_girl",
  SPRITE_FOLLOWER_MON_STATIC_SLOWPOKE: "slowpoke", SPRITE_FOLLOWER_MON_STATIC_PIDGEY: "pidgey",
  // (Item balls, small trees and breakable rocks: FireRed's, as the game uses them.)
  SPRITE_MONSTARBALL: "item_ball", SPRITE_TREE: "cut_tree", SPRITE_BREAKROCK: "rock_smash_rock"
};
let krLooks = null, krMaps = null;
// Kanto's maps (data/world-maps.js, as tools/build-maps.js made them).
function kanto() {
  if (!krMaps) {
    vm.runInThisContext(fs.readFileSync(path.join(root, "data/world-maps.js"), "utf8"));
    krMaps = Object.assign({}, window.WORLD_MAPS);
  }
  return krMaps;
}
function frPersonSprite(sprite) {
  if (!krLooks) {
    krLooks = {};
    for (const m of Object.values(kanto())) for (const p of m.people) {
      if (p.sprite && !krLooks[p.sprite]) krLooks[p.sprite] = { sprite: p.sprite, width: p.width, height: p.height, frames: p.frames };
    }
  }
  return krLooks[FR_PEOPLE[sprite]] || null;
}
const spritesDone = new Map();
// (Johto's own characters keep HGSS's sprites: Lyra, or Ethan for a girl,
// whose look HGSS sets by a var (GetFriendSprite), Silver, Prof. Elm and the
// Kimono Girls.)
const HGSS_CHARACTERS = new Set(["SPRITE_GSRIVEL", "SPRITE_DOCTOR", "SPRITE_DANCER"]);
function personSprite(sprite) {
  if (/^SPRITE_VAR_\d+$/.test(sprite)) return Object.assign(modelSprite("MMODEL_HEROINE", "hgss_heroine"), { girlLook: modelSprite("MMODEL_HERO", "hgss_hero") });
  if (!HGSS_LOOK && !HGSS_CHARACTERS.has(sprite)) { const fr = frPersonSprite(sprite); if (fr) return Object.assign({}, fr); }
  if (spritesDone.has(sprite)) return spritesDone.get(sprite);
  const out = modelSprite(spriteTable[sprite], "hgss_" + sprite.replace(/^SPRITE_/, "").toLowerCase(), sprite);
  spritesDone.set(sprite, out);
  return out;
}
// A person's model (MMODEL_*) as one of this game's sprite sheets.
function modelSprite(model, name, sprite) {
  let out = null;
  const i = mmodelIndex[model];
  const file = i != null && F("data/mmodel/mmodel/mmodel_" + String(i).padStart(8, "0") + ".NSBTX");
  if (file && fs.existsSync(file)) {
    const t = N.parseNsb(fs.readFileSync(file)).tex;
    const pal = t && Object.keys(t.palettes)[0];
    const names = t ? Object.keys(t.textures).sort((a, b) => +a.split(".").pop() - +b.split(".").pop()) : [];
    const frames = names.map((k) => N.decodeTexture(t, k, pal));
    // (A Pokémon standing about: 8 frames, two each way, up, down, left,
    // right; an Apricorn tree: just itself.)
    const order = frames.length >= 12 ? FR_FRAMES : frames.length === 8 ? [2, 0, 4, 3, 2, 1, 0, 5, 4] : [0];
    if (frames.length && frames[0].w === 32 && frames[0].h === 32 && (frames.length >= 12 || frames.length === 8 || sprite === "SPRITE_BONGURI")) {
      const W = 32 * order.length, rgba = new Uint8ClampedArray(W * 32 * 4);
      order.forEach((f, n) => { for (let y = 0; y < 32; y++) rgba.set(frames[f].rgba.subarray(y * 128, (y + 1) * 128), (y * W + n * 32) * 4); });
      writePng(path.join(root, "assets/world/sprites", name + ".png"), W, 32, rgba);
      // (32 wide, centred on the tile: offsetX.)
      out = { sprite: name, width: 32, height: 32, frames: order.length, offsetX: -8 };
    }
  }
  return out;
}
// HGSS movement (0 still, 2 looking around, 3 wandering) and facing (0 up,
// 1 down, 2 left, 3 right) as FireRed's movement types.
const FACING = ["up", "down", "left", "right"];
function movement(p) {
  if (p.movement === 3 && (p.rangeX || p.rangeY)) return "wander_around";
  if (p.movement === 2 || p.movement === 3) return "look_around";
  return "face_" + (FACING[p.facing] || "down");
}

// ---------- The maps ----------

const enc = JSON.parse(fs.readFileSync(F("fielddata/encountdata/gs_enc_data.json"), "utf8")).encounters;
const ver = (v) => (v && typeof v === "object" && !Array.isArray(v) && "HEARTGOLD" in v ? v.HEARTGOLD : v);
// (A grass slot's Pokémon by the time of day, as HGSS's: morning 4-10,
// day 10-20, night 20-4; the morning's and night's only where they differ.)
const slot = (s) => {
  const lv = ver(s.level);
  const timed = s.species && s.species.day !== undefined;
  const sp = species(ver(timed ? s.species.day : s.species));
  const out = { species: sp, min: typeof lv === "object" ? lv.min : lv, max: typeof lv === "object" ? lv.max : lv };
  if (timed) {
    const morn = species(ver(s.species.morn)), nite = species(ver(s.species.nite));
    if (morn && morn !== sp) out.morning = morn;
    if (nite && nite !== sp) out.night = nite;
  }
  return out;
};
const table = (t, weights) => (t && t.rate ? Object.assign({ rate: t.rate, slots: t.mons.map(slot) }, weights ? { weights } : {}) : undefined);

// ---------- Scripts (tools/lib/hgss-script.js, run by ui/johto-script.js) ----------

// HGSS's items as this game's (by name; the Apricorns and the Apricorn Box are added below).
const APRICORNS = ["red", "yellow", "blue", "green", "pink", "white", "black"];
const extraItems = Object.fromEntries(APRICORNS.map((c) => [c + "-apricorn", { name: c + "-apricorn", category: "apricorn", effect: "A " + c + " Apricorn. It assails your nostrils." }]));
// (And the key items its scripts give or ask for that the game hasn't got.)
extraItems.squirtbottle = { name: "squirtbottle", category: "key-items", effect: "A watering can shaped like a Squirtle. It helps promote healthy plant growth." };
extraItems["mystery-egg"] = { name: "mystery-egg", category: "key-items", effect: "A mysterious Egg obtained from Mr. Pokémon." };
extraItems["berry-pots"] = { name: "berry-pots", category: "key-items", effect: "Four pots for growing Berries." };
extraItems["vs-recorder"] = { name: "vs-recorder", category: "key-items", effect: "A device that records battles." };
extraItems["apricorn-box"] = { name: "apricorn-box", category: "key-items", effect: "A box for keeping Apricorns. It holds a whole lot of them." };
const itemByKey = {};
for (const id of Object.keys(window.ITEMS).concat(Object.keys(extraItems))) itemByKey[id.replace(/[^a-z0-9]/g, "")] = id;
const APRICORN_ITEM = { RED: "red-apricorn", YLW: "yellow-apricorn", BLU: "blue-apricorn", GRN: "green-apricorn", PNK: "pink-apricorn", WHT: "white-apricorn", BLK: "black-apricorn" };
// (Where HGSS's names for an item aren't this game's.)
const ITEM_ALIAS = { PARLYZ_HEAL: "paralyze-heal", VS__RECORDER: "vs-recorder", POKE_BALL: "poke-ball", X_DEFEND: "x-defense", X_SPECIAL: "x-sp-atk", X_SP_DEF: "x-sp-def",
  ELIXIR: "elixir", HP_UP: "hp-up", PP_UP: "pp-up", KINGS_ROCK: "kings-rock", BLACKGLASSES: "black-glasses", NEVERMELTICE: "never-melt-ice",
  TWISTEDSPOON: "twisted-spoon", SILVERPOWDER: "silver-powder", THUNDERSTONE: "thunder-stone", TINYMUSHROOM: "tiny-mushroom",
  BRIGHTPOWDER: "bright-powder", DEEPSEATOOTH: "deep-sea-tooth", DEEPSEASCALE: "deep-sea-scale", ENERGYPOWDER: "energy-powder" };
const item = (c) => {
  const k = String(c).replace(/^ITEM_/, "");
  if (ITEM_ALIAS[k] && (window.ITEMS[ITEM_ALIAS[k]] || extraItems[ITEM_ALIAS[k]])) return ITEM_ALIAS[k];
  const ap = /^APRICORN_(\w+)$/.exec(k) || /^(\w+)_APRICORN$/.exec(k);
  if (ap && APRICORN_ITEM[ap[1]]) return APRICORN_ITEM[ap[1]];
  return itemByKey[k.toLowerCase().replace(/[^a-z0-9]/g, "")] || null;
};
// Each Apricorn tree's colour (src/apricorn_tree_sys.c's sTreeApricorns), by its number.
const APRICORN_NAMES = { RED: "red", YLW: "yellow", BLU: "blue", GRN: "green", PNK: "pink", WHT: "white", BLK: "black" };
const treeApricorns = [...fs.readFileSync(path.join(ROOT, "src/apricorn_tree_sys.c"), "utf8")
  .split("sTreeApricorns")[1].split("};")[0].matchAll(/APRICORN_(RED|YLW|BLU|GRN|PNK|WHT|BLK)\b/g)].map((m) => APRICORN_NAMES[m[1]]);
const SC = HS.compiler(ROOT, { item, species });
const zones = {}, zoneOfMap = {}, origins = {};

// Trainers: HGSS's (files/poketool/trainer/trainers.json, indexed as
// include/constants/trainers.h numbers them), as window.WORLD_TRAINERS has
// FireRed's; their pictures, FireRed's nearest.
const trainerIds = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/trainers.h"), "utf8").matchAll(/#define (TRAINER_\w+)\s+(\d+)/g)) trainerIds[m[1]] = +m[2];
const HG_TRAINERS = JSON.parse(fs.readFileSync(F("poketool/trainer/trainers.json"), "utf8")).trainers;
const classIds = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/trainer_class.h"), "utf8").matchAll(/#define (TRAINERCLASS_\w+)\s+(\d+)/g)) classIds[m[1]] = +m[2];
const classNames = JSON.parse(fs.readFileSync(F("msgdata/msg/msg_0730.json"), "utf8")).messages.map((m) => [].concat(m.en_US || "").join(""));
const CLASS_PIC = {
  YOUNGSTER: "youngster", LASS: "lass", CAMPER: "camper", PICNICKER: "picnicker", BUG_CATCHER: "bug_catcher", AROMA_LADY: "aroma_lady",
  TWINS: "twins", HIKER: "hiker", BATTLE_GIRL: "crush_girl", FISHERMAN: "fisherman", BLACK_BELT: "black_belt", ACE_TRAINER_M: "cooltrainer_m",
  ACE_TRAINER_F: "cooltrainer_f", ACE_TRAINER_M_GS: "cooltrainer_m", ACE_TRAINER_F_GS: "cooltrainer_f", BIRD_KEEPER: "bird_keeper",
  BIRD_KEEPER_GS: "bird_keeper", JUGGLER: "juggler", LADY: "lady", GENTLEMAN: "gentleman", BEAUTY: "beauty", SCIENTIST: "scientist",
  SCIENTIST_GS: "scientist", SWIMMER_M: "swimmer_m", SWIMMER_F: "swimmer_f", TUBER_M: "tuber_f", TUBER_F: "tuber_f", SAILOR: "sailor",
  RUIN_MANIAC: "ruin_maniac", PSYCHIC_M: "psychic_m", PSYCHIC_F: "psychic_f", TEAM_ROCKET: "rocket_grunt_m", TEAM_ROCKET_F: "rocket_grunt_f",
  BURGLAR: "burglar", BIKER: "biker", POKE_MANIAC: "pokemaniac", SUPER_NERD: "super_nerd", ROUGHNECK: "cue_ball", GUITARIST: "rocker",
  FIREBREATHER: "burglar", POLICEMAN: "gentleman", POKEFAN_M: "gentleman", POKEFAN: "lady", SCHOOL_KID_M: "youngster", SCHOOL_KID_F: "lass",
  KIMONO_GIRL: "lady", SAGE: "channeler", MEDIUM: "channeler", TEACHER: "lady", PKMN_BREEDER_M: "pokemon_breeder", PKMN_BREEDER_F: "pokemon_breeder",
  PKMN_RANGER_M: "pokemon_ranger_m", PKMN_RANGER_F: "pokemon_ranger_f", PASSERBY: "youngster", RIVAL: "rival_early", ENGINEER: "engineer"
};
const GIRL_CLASSES = /^(LASS|PICNICKER|AROMA_LADY|TWINS|BATTLE_GIRL|ACE_TRAINER_F|ACE_TRAINER_F_GS|LADY|BEAUTY|SWIMMER_F|TUBER_F|PSYCHIC_F|POKEFAN|SCHOOL_KID_F|KIMONO_GIRL|MEDIUM|TEACHER|PKMN_BREEDER_F|PKMN_RANGER_F|COWGIRL|SOCIALITE|PARASOL_LADY|IDOL|SKIER|WAITRESS)$/;
const trainers = {};
function trainer(id) {
  const key = String(id).replace(/^HGSS_/, "");
  if (trainers["HGSS_" + key] || !(key in trainerIds)) return trainers["HGSS_" + key] || null;
  const t = HG_TRAINERS[trainerIds[key]];
  const cls = t.class.replace(/^TRAINERCLASS_/, "");
  const msg = (type) => { const m = t.messages.find((x) => x.type === type); return m ? HS.pages(m.message.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\f/g, "\f")) : null; };
  // (Their moves: the last four each learns by its level, as Kanto's trainers' are, not HGSS's sets.)
  const party = t.party.map((mon) => Object.assign({ species: species(mon.species), level: mon.level, iv: mon.difficulty || 0 },
    mon.item && mon.item !== "ITEM_NONE" && item(mon.item) ? { item: item(mon.item) } : {})).filter((m) => m.species);
  trainers["HGSS_" + key] = {
    className: classNames[classIds[t.class]] || cls, name: t.name.replace(/\{[^}]*\}/g, "").trim() || key, pic: CLASS_PIC[cls] || "youngster",
    party, music: cls === "TEAM_ROCKET" || cls === "TEAM_ROCKET_F" ? "mus_encounter_rocket" : GIRL_CLASSES.test(cls) ? "mus_encounter_girl" : "mus_encounter_boy",
    double: !!t.double, intro: msg("TRMSG_INTRO"), defeat: msg("TRMSG_LOSE"), after: msg("TRMSG_AFTER")
  };
  return trainers["HGSS_" + key];
}
// (std_itemball_<map>_<item>, std_hiddenitem_...: the item is the longest ending that's an item.)
function itemFromScript(s, prefix) {
  const parts = String(s).replace(prefix, "").split("_");
  for (let k = 0; k < parts.length; k++) { const id = item(parts.slice(k).join("_")); if (id) return id; }
  return null;
}
// What HGSS's own Day-Care Man says, outside his house on Route 34.
const DAYCARE_MAN = ["I'm the Day-Care Man.", "Do you know about Eggs? My wife and\nI were raising some Pokémon, and\nwhat do you know, we found an Egg!"];

const out = {}, rendered = {};
const mapsDir = path.join(root, "assets/world/maps");
MAPS.forEach((m, i) => {
  loadMessages(m.zone);
  // (Outdoors, drawn by the painter in FireRed's style: from what each tile is.)
  const painted = !HGSS_LOOK && m.type !== "indoor";
  const r = renderMap(ROOT, m.c, { ground: m.ground, labels: painted });   // (ground: not flat, as Johto's first maps are)
  const W = r.width * 16, H = r.height * 16;
  // (Where a map that isn't flat was left with a gap, a folded triangle's, its neighbours' colour.)
  if (m.ground) for (let pass = 0, gaps = true; gaps && pass < 32; pass++) {
    gaps = false;
    const src = r.below.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (src[o + 3] === 255) continue;
      let n = 0; const sum = [0, 0, 0];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= W || v >= H) continue;
        const q = (v * W + u) * 4;
        if (src[q + 3] === 255) { n++; for (let k = 0; k < 3; k++) sum[k] += src[q + k]; }
      }
      if (n) { for (let k = 0; k < 3; k++) r.below[o + k] = Math.round(sum[k] / n); r.below[o + 3] = 255; } else gaps = true;
    }
  }
  // (In a room or cave, a tile nothing's drawn on is outside it: solid.)
  const inside = m.type === "indoor" || m.type === "underground";
  const drawnTiles = r.perm.map((v, i) => { const x = (i % r.width) * 16 + 8, y = Math.floor(i / r.width) * 16 + 8; return r.below[(y * W + x) * 4 + 3] > 0; });
  const drawn = (i) => drawnTiles[i];
  // (A cave's or room's nothing-there is dark.)
  if (inside) for (let i = 3; i < r.below.length; i += 4) if (r.below[i] < 255) {
    const a = r.below[i] / 255;
    for (let k = 1; k <= 3; k++) r.below[i - k] = Math.round(r.below[i - k] * a);
    r.below[i] = 255;
  }
  let anim;
  const animFile = path.join(mapsDir, m.name + "-anim.png");
  if (painted) {
    // What each tile is, its buildings (from their doors) and signs; drawn with
    // FireRed's metatiles and Kanto's buildings.
    const cave = m.type === "underground";
    const classes = HC.classify(r, { cave });
    const evw = (r.events || { warps: [] }).warps.map((w) => ({ x: w.x, y: w.y, mapConst: w.map }));
    const signs = ((r.events || { signs: [] }).signs || []).filter((sg) => sg.type !== 2)
      .map((sg) => [sg.x, sg.y, /TRAINER TIPS/i.test((scriptText(m.zone, sg.script) || []).join(" ")) ? "tips" : "sign"]);
    // (A cave's undrawn outside, solid: rock.)
    if (cave) classes.forEach((c, i) => { if (!drawn(i)) classes[i] = "rock"; });
    // (Nor is floor you can't get to from its ways in: rock, as round Kanto's caves.)
    if (cave) {
      const reach = new Set(), q = (r.events || { warps: [] }).warps.map((w) => w.y * r.width + w.x);
      for (const k of q) reach.add(k);
      while (q.length) {
        const k = q.pop(), x = k % r.width, y = Math.floor(k / r.width);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const u = x + dx, v = y + dy, n = v * r.width + u;
          if (u < 0 || v < 0 || u >= r.width || v >= r.height || reach.has(n) || ((r.perm[n] >> 15) & 1 && (r.perm[n] & 0xff) !== 0x13)) continue;
          reach.add(n); q.push(n);
        }
      }
      classes.forEach((c, i) => { if (!reach.has(i) && c !== "waterrock") classes[i] = "rock"; });
    }
    const pic = Painter.compose(classes, r.width, r.height, { buildings: cave ? [] : HC.buildingsOf(r, classes, evw), signs, style: cave ? "cave" : "outdoor" });
    writePng(path.join(mapsDir, m.name + ".png"), W, H, pic.below);
    writePng(path.join(mapsDir, m.name + "-top.png"), W, H, pic.above);
    if (pic.anim.pics.length) { writeAnimSheet(animFile, pic.anim.pics); anim = { cells: pic.anim.cells, anims: pic.anims }; }
    else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // Outside the map: what most of its edge is (trees, sea, ...), painted.
    const edge = {};
    for (let i = 0; i < r.width * r.height; i++) {
      const x = i % r.width, y = Math.floor(i / r.width);
      if (x && y && x < r.width - 1 && y < r.height - 1) continue;
      edge[pic.classes[i]] = (edge[pic.classes[i]] || 0) + 1;
    }
    const outside = ["tree", "water", "rock"].sort((a, b) => (edge[b] || 0) - (edge[a] || 0))[0];
    const style = cave ? "cave" : "outdoor";
    writePng(path.join(mapsDir, m.name + "-border.png"), 32, 32, Painter.render(Painter.paint(Array(4).fill(outside), 2, 2, style), 2, 2, null, style).below);
  } else {
    writePng(path.join(mapsDir, m.name + ".png"), W, H, r.below);
    writePng(path.join(mapsDir, m.name + "-top.png"), W, H, r.top);
    if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // Outside the map: the forest of its top-left corner (2x2 tiles).
    const border = new Uint8ClampedArray(32 * 32 * 4);
    for (let y = 0; y < 32; y++) border.set(r.below.subarray(y * W * 4, y * W * 4 + 128), y * 128);
    writePng(path.join(mapsDir, m.name + "-border.png"), 32, 32, border);
  }

  // (HGSS's waterfalls are solid, and the water at their tops (34) a tile of
  // its own: FireRed's are waterfalls you go up or down with Waterfall, onto water.)
  const collision = r.perm.map((v, i) => (inside && !drawn(i) ? 1 : (v & 0xff) === 0x13 || (v & 0xff) === 0x22 ? 0 : (v >> 15) & 1));
  const behavior = r.perm.map((v) => ((v & 0xff) === 0x22 ? 0x10 : frBehavior(v & 0xff)));
  const ev = r.events || { warps: [], signs: [], people: [], triggers: [] };
  // (Doors are solid, as FireRed's are: walking up into one goes in.)
  rendered[m.name] = r;
  const e = enc.find((x) => x.map === m.zone);
  // Its scripts, compiled (data/johto-scripts.js).
  const z = SC.zone(m.zone);
  if (z) { zones[m.zone] = z; zoneOfMap[m.name] = m.zone; origins[m.zone] = { x: r.origin.cellX * 32, y: r.origin.cellZ * 32 }; }
  const hgss = (ref) => { const label = SC.scriptRef(ref); return z && label && label in z.labels ? "hgss:" + m.zone + ":" + label : null; };
  const people = [];
  for (const p of ev.people) {
    const look = personSprite(p.sprite);
    if (!look) continue;
    const s = String(p.script);
    // Everyone, each with HGSS's flag that hides them (hgssFlag: the story's),
    // and what they do: their script; or, for trainers, item balls, small
    // trees, breakable rocks and Apricorn trees, the game's own way.
    const def = Object.assign({ id: people.length, localId: p.id, x: p.x, y: p.y, movement: movement(p), rangeX: p.rangeX || 1, rangeY: p.rangeY || 1,
      script: null, flag: null, text: null }, look, p.flag && p.flag !== "FLAG_NOTHING" ? { hgssFlag: p.flag } : {});
    let mt;
    if ((mt = /^std_trainer\((\w+)\)/.exec(s))) {
      const t = trainer(mt[1]);
      if (!t) continue;
      Object.assign(def, { script: "hgss_trainer:HGSS_" + mt[1], text: t.after,
        trainer: { id: "HGSS_" + mt[1], intro: t.intro, defeat: t.defeat, after: t.after, sight: p.param0 || 1, double: t.double } });
    } else if (/^std_itemball_/.test(s)) {
      const it = itemFromScript(s, /^std_itemball_/);
      if (!it) continue;
      Object.assign(def, { script: "Johto_Item_" + p.id, item: it, flag: "JOHTO_" + p.flag, inanimate: true });
    } else if (s === "std_field_cut") Object.assign(def, { script: "EventScript_CutTree", flag: "JOHTO_CUT_" + p.id, text: ["This tree looks like it can be\ncut down!"], inanimate: true });
    else if (s === "std_field_rock_smash") Object.assign(def, { script: "EventScript_RockSmash", flag: "JOHTO_ROCK_" + p.id, inanimate: true });
    else if (s === "std_apricorn_tree") Object.assign(def, { script: "hgss_apricorn:" + (p.param0 | 0) + ":" + (treeApricorns[p.param0 | 0] || "red"), inanimate: true });
    else if (s === "std_daycare_man") Object.assign(def, { text: DAYCARE_MAN });
    else if (/^_EV_/.test(s)) Object.assign(def, { script: hgss(s), text: scriptText(m.zone, p.script) });
    // (Someone kept at the map's edge for a scene, out of sight in HGSS's 3D:
    // offstage until a script brings them on.)
    if (!def.script && !def.hgssFlag && (p.x <= 0 || p.y <= 0 || p.x >= r.width - 1 || p.y >= r.height - 1)) def.offstage = true;
    people.push(def);
  }
  out[m.name] = {
    name: m.name, title: m.title, width: r.width, height: r.height, type: m.type, music: m.music, region: "johto",
    cycling: true, showName: m.type !== "indoor", top: true, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior, encounter: behavior.map((b) => (b === 0x02 ? 1 : 0)),
    connections: [],
    warps: ev.warps.map((w) => (w.map === "MAP_ROUTE_22_POKEMON_LEAGUE_RECEPTION_GATE" ? { x: w.x, y: w.y, map: GATE.name, warp: "johto" }
      : { x: w.x, y: w.y, map: byConst[w.map] || null, mapConst: byConst[w.map] ? undefined : w.map, warp: w.anchor })),
    signs: ev.signs.filter((s) => s.type !== 2).map((s) => ({ x: s.x, y: s.y, script: hgss(s.script) || String(s.script).replace(/^_EV_|\s*\+.*$/g, ""), text: scriptText(m.zone, s.script) })),
    // (A step trigger, on each of its tiles: its script, while its var has its value.)
    triggers: [].concat(...(ev.triggers || []).map((t) => {
      const sc = hgss(t.script), val = typeof t.val === "number" ? t.val : SC.defines[t.val];
      if (!sc || val == null) return [];
      const out = [];
      for (let dy = 0; dy < (t.h || 1); dy++) for (let dx = 0; dx < (t.w || 1); dx++) out.push({ x: t.x + dx, y: t.y + dy, script: sc + "?" + t.var + "=" + val });
      return out;
    })),
    // (std_hiddenitem_<map>_<item>: the item is the longest ending that's an item.)
    hidden: ev.signs.filter((s) => s.type === 2 && s.x >= 0 && s.y >= 0 && s.x < r.width && s.y < r.height).map((s) => {
      const parts = String(s.script).replace(/^std_hiddenitem_/, "").split("_");
      let item = null;
      for (let k = 0; k < parts.length && !item; k++) { const id = parts.slice(k).join("-"); if (window.ITEMS[id]) item = id; }
      return item && { x: s.x, y: s.y, item, flag: "JOHTO_HIDDEN_" + m.zone + "_" + s.x + "_" + s.y, quantity: 1 };
    }).filter(Boolean),
    people,
    wild: e && table(e.land),
    water: e && table(e.surf),
    // (Under Rock Smash rocks: HGSS's two slots, 90 and 10 percent.)
    rockSmash: e && table(e.rock_smash, [90, 10]),
    // (Gen 4's rods: five slots each, 40/40/15/4/1.)
    fishing: e && e.fishing && e.fishing.old_rod.rate ? { rods: { "old-rod": table(e.fishing.old_rod), "good-rod": table(e.fishing.good_rod), "super-rod": table(e.fishing.super_rod) } } : undefined,
    // (Its animated water and flowers, as Kanto's: <Map>-anim.png.)
    anim
  };
  console.log(m.name, r.width + "x" + r.height, "people", people.length, "signs", out[m.name].signs.length, "warps", out[m.name].warps.length);
});

// Each pair of outdoor maps side by side on the matrix, joined where they
// touch (FireRed's connections: the other map's offset along the edge, in tiles).
for (const a of MAPS) for (const b of MAPS) {
  const ra = rendered[a.name], rb = rendered[b.name];
  if (a === b || !ra.main || !rb.main) continue;
  const touch = (dx, dz) => ra.cells.some(([x, z]) => rb.cells.some(([u, v]) => u === x + dx && v === z + dz));
  const ox = (rb.origin.cellX - ra.origin.cellX) * 32, oz = (rb.origin.cellZ - ra.origin.cellZ) * 32;
  const dir = touch(1, 0) ? ["right", oz] : touch(-1, 0) ? ["left", oz] : touch(0, 1) ? ["down", ox] : touch(0, -1) ? ["up", ox] : null;
  if (dir) out[a.name].connections.push({ map: b.name, direction: dir[0], offset: dir[1] });
}
// (The mat: a patch over the gate's left wall, its floor with a red mat on it, as at its door.)
{
  const gate = readPng(path.join(mapsDir, GATE.name + ".png")), T = 16, img = new Uint8ClampedArray(T * 3 * T * 4);
  for (let y = 0; y < 3 * T; y++) for (let x = 0; x < T; x++) {
    const i = ((GATE.y - 1) * T + y) * gate.width + GATE.x * T + x;
    img.set(gate.rgba.slice(i * 4, i * 4 + 4), (y * T + x) * 4);
  }
  const px = (x, y, c) => img.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * T + x) * 4);
  for (let y = T - 4; y < 2 * T + 4; y++) for (let x = 0; x < 12; x++) {
    const edge = y === T - 4 || y === 2 * T + 3 || x === 11, rim = y === T - 3 || y === 2 * T + 2 || x === 10 || x === 0;
    px(x, y, edge ? "#5a6a7a" : rim ? "#f0e8e0" : y === T - 2 || y === 2 * T + 1 || x === 9 || x === 1 ? "#c84838" : "#d85848");
  }
  writePng(path.join(mapsDir, GATE.name + "-patch-johto.png"), T, 3 * T, img);
}
// (And its guard, until you're Champion: ui/game.js hides him once you are.)
const guard = { id: 99, x: GATE.x + 1, y: GATE.y, movement: "face_right", rangeX: 1, rangeY: 1, script: "Route22_NorthEntrance_EventScript_JohtoGuard", flag: null,
  text: ["The Johto region lies to the west.", "I'm sorry, but only the Champion of\nthe Pokémon League may go on to Johto."],
  sprite: "policeman", width: 16, height: 32, frames: 9 };
// FireRed's gate: its way west, a mat at the left wall, to Route 26's door.
const r26 = out.Route26.warps.findIndex((w) => w.map === GATE.name);
out.Route26.warps.forEach((w) => { if (w.map === GATE.name) w.warp = "johto"; });
const gateJs = "(function () {\n" +
  "  const gate = window.WORLD_MAPS[" + JSON.stringify(GATE.name) + "];\n" +
  "  if (!gate || gate.warps.some((w) => w.map === \"Route26\")) return;\n" +
  "  gate.warps.push({ x: " + GATE.x + ", y: " + GATE.y + ", map: \"Route26\", warp: " + r26 + " });\n" +
  "  const at = (x, y) => y * gate.width + x;\n" +
  "  gate.behavior[at(" + GATE.x + ", " + GATE.y + ")] = 0x63;   // (a way out west)\n" +
  "  for (const y of [" + (GATE.y - 1) + ", " + (GATE.y + 1) + "]) gate.collision[at(" + GATE.x + ", y)] = 1;\n" +
  "  gate.patches = Object.assign({}, gate.patches, { johto: { x: " + GATE.x + ", y: " + (GATE.y - 1) + ", w: 1, h: 3, top: false, collision: [] } });\n" +
  "  gate.people.push(" + JSON.stringify(guard) + ");\n" +
  "  const w = gate.warps.length - 1;\n" +
  "  for (const m of " + JSON.stringify(MAPS.map((m) => m.name)) + ") for (const x of window.WORLD_MAPS[m].warps) if (x.warp === \"johto\") x.warp = w;\n" +
  "})();\n";
// ---------- Gatehouses, as FireRed's ----------
//
// In FireRed's style, each gatehouse inside is a copy of FireRed's own gate
// (Saffron's Route 5 gate for one you go through north to south, its Route 7
// gate for west to east): its picture, floor and walls. Its ways out lead
// where the gatehouse's did (each side's first, then the second tile of each
// doorway), and its people stand where FireRed's guard stands and about the room.
const GATE_TEMPLATES = {
  ns: { map: "Route5_SouthEntrance", spots: [[1, 5, "face_right"], [7, 4, "face_left"], [6, 7, "face_left"], [2, 7, "face_right"]] },
  we: { map: "Route7_EastEntrance", spots: [[6, 2, "face_down"], [3, 3, "face_down"], [9, 3, "face_down"], [4, 7, "face_up"]] }
};
if (!HGSS_LOOK) for (const m of MAPS) {
  if (!/Gatehouse/.test(m.name) || m.template) continue;
  const g = out[m.name];
  const [a, b] = g.warps;
  const across = Math.abs(a.x - b.x) > Math.abs(a.y - b.y);
  const tpl = GATE_TEMPLATES[across ? "we" : "ns"], t = kanto()[tpl.map];
  // (Each side's warps in the template: west or north first.)
  const side = (w) => (across ? (w.x < t.width / 2 ? 0 : 1) : (w.y < t.height / 2 ? 0 : 1));
  const mineSide = (w) => (across ? (w.x < (a.x + b.x) / 2 ? 0 : 1) : (w.y < (a.y + b.y) / 2 ? 0 : 1));
  // (Only those on its floor: FireRed's Route 5 gate has a couple in its walls too.)
  const floor = t.warps.filter((w) => !t.collision[w.y * t.width + w.x]);
  const tplBySide = [floor.filter((w) => side(w) === 0), floor.filter((w) => side(w) === 1)];
  const warps = g.warps.map((w) => Object.assign({}, w, { x: tplBySide[mineSide(w)][0].x, y: tplBySide[mineSide(w)][0].y }));
  for (const w of g.warps) for (const extra of tplBySide[mineSide(w)].slice(1)) warps.push(Object.assign({}, w, { x: extra.x, y: extra.y }));
  const people = g.people.map((p, i) => {
    const spot = tpl.spots[i % tpl.spots.length];
    return Object.assign({}, p, { x: spot[0], y: spot[1], movement: spot[2] });
  });
  // (Its step triggers were on HGSS's floor, not this one: none.)
  Object.assign(g, { width: t.width, height: t.height, collision: t.collision.slice(), elevation: t.elevation.slice(), behavior: t.behavior.slice(),
    encounter: t.encounter.slice(), warps, people, triggers: [], top: t.top, borderWidth: t.borderWidth, borderHeight: t.borderHeight });
  for (const part of ["", "-top", "-border"]) {
    const from = path.join(mapsDir, tpl.map + part + ".png"), to = path.join(mapsDir, m.name + part + ".png");
    if (fs.existsSync(from)) fs.copyFileSync(from, to); else if (fs.existsSync(to)) fs.unlinkSync(to);
  }
}

// ---------- Pokémon Centers and Poké Marts, as FireRed's ----------
//
// Each is FireRed's own (Viridian City's: its picture, floor and walls), its
// door leading where HGSS's does. In a Pokémon Center the nurse stands behind
// FireRed's counter and heals as Kanto's nurses do; upstairs (its stairs, where
// HGSS has a basement for the Wi-Fi Club) is FireRed's Cable Club floor, with
// its Move Relearner and Deleter. In a Mart, HGSS's clerks stand behind
// FireRed's counter, still with their own scripts (std_pokemart, its stock by
// Badges, and std_special_mart, the town's own). The rest stand about the room
// with their scripts; the Wi-Fi and Union Room counters (this game has
// neither) aren't there.
const ROOM_TEMPLATES = {
  pc: { map: "ViridianCity_PokemonCenter_1F", spots: [[12, 5, "face_left"], [4, 7, "face_up"], [2, 3, "face_down"], [10, 7, "face_up"], [13, 3, "face_left"]] },
  mart: { map: "ViridianCity_Mart", spots: [[6, 2, "face_down"], [9, 5, "face_left"], [5, 5, "face_right"]], clerks: [[2, 3, "face_right"], [2, 2, "face_right"]] }
};
if (!HGSS_LOOK) for (const m of MAPS) {
  if (!m.template) continue;
  const g = out[m.name], tpl = ROOM_TEMPLATES[m.template], t = kanto()[tpl.map];
  const door = g.warps.find((w) => w.map) || g.warps[0];
  const warps = t.warps.filter((w) => !/_2F$/.test(w.map || "")).map((w) => ({ x: w.x, y: w.y, map: door.map, mapConst: door.mapConst, warp: door.warp }));
  const stairs = t.warps.find((w) => /_2F$/.test(w.map || ""));
  const up = m.name.replace(/_1F$/, "_2F");
  if (stairs) warps.push({ x: stairs.x, y: stairs.y, map: up, warp: 0 });
  let spot = 0, clerk = 0;
  const people = [];
  for (const p of g.people) {
    if (!p.script || /FLAG_HIDE_(COMM|WIFI)/.test(p.hgssFlag || "")) continue;
    if (m.template === "pc" && p.sprite === "nurse") {
      people.push(Object.assign({}, p, { x: 7, y: 2, movement: "face_down", localId: "LOCALID_" + m.name.toUpperCase() + "_NURSE",
        script: m.name + "_EventScript_Nurse", text: null }));
      continue;
    }
    const at = m.template === "mart" && p.sprite === "clerk" && clerk < tpl.clerks.length ? tpl.clerks[clerk++] : tpl.spots[spot++ % tpl.spots.length];
    people.push(Object.assign({}, p, { x: at[0], y: at[1], movement: at[2] }));
  }
  Object.assign(g, { width: t.width, height: t.height, collision: t.collision.slice(), elevation: t.elevation.slice(), behavior: t.behavior.slice(),
    encounter: t.encounter.slice(), warps, people, triggers: [], top: t.top, borderWidth: t.borderWidth, borderHeight: t.borderHeight,
    pokemonCenter: m.template === "pc" || undefined });
  for (const part of ["", "-top", "-border"]) {
    const from = path.join(mapsDir, tpl.map + part + ".png"), to = path.join(mapsDir, m.name + part + ".png");
    if (fs.existsSync(from)) fs.copyFileSync(from, to); else if (fs.existsSync(to)) fs.unlinkSync(to);
  }
  // Upstairs: FireRed's Pokémon Center 2F, its stairs back down here.
  if (m.template === "pc") {
    const t2 = kanto()[tpl.map.replace(/_1F$/, "_2F")];
    out[up] = Object.assign(JSON.parse(JSON.stringify(t2)), { name: up, title: m.title, region: "johto", showName: false,
      warps: t2.warps.map((w) => (/_1F$/.test(w.map || "") ? { x: w.x, y: w.y, map: m.name, warp: warps.length - 1 } : Object.assign({}, w))) });
    for (const part of ["", "-top", "-border"]) {
      const from = path.join(mapsDir, tpl.map.replace(/_1F$/, "_2F") + part + ".png"), to = path.join(mapsDir, up + part + ".png");
      if (fs.existsSync(from)) fs.copyFileSync(from, to); else if (fs.existsSync(to)) fs.unlinkSync(to);
    }
  }
}

// The Poké Marts' stock (src/scrcmd_mart.c): the standard one, each item from
// a tier of Badges (MartBuy), and the special ones (SpecialMartBuy's lists).
const martSrc = fs.readFileSync(path.join(ROOT, "src/scrcmd_mart.c"), "utf8");
const standardMart = [...martSrc.split("ScrCmd_MartBuy")[0].matchAll(/\{\s*(ITEM_\w+),\s*(\d+)\s*\}/g)].map((x) => [item(x[1]), +x[2]]).filter((x) => x[0]);
const martLists = {};
for (const x of martSrc.matchAll(/const u16 (_\w+)\[\] = \{([^}]*)\}/g)) martLists[x[1]] = [...x[2].matchAll(/ITEM_\w+/g)].map((i) => item(i[0])).filter(Boolean);
const specialMarts = [...(/_0210FA3C\[\] = \{([^}]*)\}/.exec(martSrc) || [, ""])[1].matchAll(/_\w+/g)].map((x) => martLists[x[0]] || []);

// The scripts' trainers (TrainerBattle's) as well as those on the maps.
for (const z of Object.values(zones)) for (const c of z.cmds) if (c[0] === "TrainerBattle") trainer(c[1]);
// Where Johto's story starts: HGSS's new game (scr_seq_0149), as if you'd
// just left the house in New Bark Town, which you come to from Kanto, and
// Lyra had said hello (VAR_SCENE_PLAYERS_HOUSE_1F 2). The story goes on from
// Elm's Lab, as in HGSS: until he's given you a Pokémon, New Bark's neighbour
// won't let you go west; with it you've the Pokégear (FLAG_GOT_POKEGEAR, set
// as you choose: ui/johto-script.js), and Elm gives you his number as you go.
const START = [["SetVar", "VAR_SCENE_PLAYERS_HOUSE_1F", 2]];
const scripts = { zones, messages: SC.messages, init: SC.init().concat(START), maps: zoneOfMap, origins, mapConsts: byConst,
  marts: { standard: standardMart, special: specialMarts }, yesno: SC.yesno, version: SC.defines.VERSION_HEARTGOLD || 7 };
// (In data/johto-maps.js, after the maps.)
const scriptsJs = "// Johto's field scripts (tools/lib/hgss-script.js; run by ui/johto-script.js), its trainers, and the Apricorns.\n" +
  "window.JOHTO_SCRIPTS = " + JSON.stringify(scripts) + ";\n" +
  "Object.assign(window.WORLD_TRAINERS, " + JSON.stringify(trainers) + ");\n" +
  "Object.assign(window.ITEMS, " + JSON.stringify(extraItems) + ");\n" +
  "Object.assign(window.ITEM_SPRITES || (window.ITEM_SPRITES = {}), " + JSON.stringify(Object.assign(
    Object.fromEntries(APRICORNS.map((c) => [c + "-apricorn", "assets/sprites/items/apricorn/" + c + ".png"])),
    { "apricorn-box": "assets/sprites/items/apricorn/green.png" })) + ");\n";
console.log("scripts:", Object.keys(zones).length, "zones,", Object.keys(trainers).length, "trainers,", Object.keys(SC.messages).length, "messages");
fs.writeFileSync(path.join(root, "data/johto-maps.js"),
  "// Auto-generated by tools/build-johto.js from pret/pokeheartgold. Do not edit by hand.\n" +
  "// Johto's maps, added to FireRed's (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" + gateJs + scriptsJs);
console.log("wrote " + MAPS.length + " Johto maps to data/johto-maps.js and assets/world/");
