// Builds the first Johto maps from HeartGold and SoulSilver
// (a pret/pokeheartgold checkout): Cherrygrove City, Route 29, New Bark
// Town; west and north to Violet City, Azalea Town and Goldenrod City
// (Routes 30 to 36 and 46, the Ruins of Alph); and the way to Kanto: Route 27, Tohjo Falls and Route 26, whose gate
// at the top is the Pokémon League's (FireRed's Route22_NorthEntrance, its
// way west into Johto drawn here, and open to the Champion: ui/game.js).
//
//   node tools/build-johto.js <path to pret/pokeheartgold> [--list]
//   (or set POKEHEARTGOLD=<path>; --list: just list the maps it would build)
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
vm.runInThisContext(fs.readFileSync(path.join(root, "data/moves.js"), "utf8"));
const F = (p) => path.join(ROOT, "files", p);

// The maps (their places on HGSS's world matrix join them up).
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
  { c: "MAP_ILEX_FOREST", name: "IlexForest", title: "Ilex Forest", type: "route", zone: "D36R0101", music: "mus_viridian_forest", ground: true, dungeon: true },
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
// And the rest of Johto: every other map of HGSS's in Johto (its map headers,
// src/data/map_headers.h), named as FireRed names its maps (EcruteakCity_Gym,
// UnionCave_B1F, ...), titled by its place's name, its music FireRed's nearest.
// (Not the unused ones, the Wi-Fi rooms and Pokémon Centers' Wi-Fi basements
// and the Battle Frontier's halls, which need games of their own; nor
// MAP_SAFARI_ZONE_01-14, HGSS's placeholders: the Safari Zone's Areas go on
// its own matrix, where its layout puts them, as HGSS's PlaceSafariZoneAreas
// does: tools/build-johto-safari.js and ui/johto-safari.js.)
const SKIP = /^MAP_(EVERYWHERE|NOTHING|UNION|UNDERGROUND|UNUSED)$|UNUSED|^MAP_WIFI|_POKECENTER_B1F$|^MAP_FIGHT_AREA|^MAP_BATTLE_PARK|^MAP_BATTLE_TOWER|^MAP_BATTLE_FRONTIER_BATTLE_|^MAP_SAFARI_ZONE_\d+$|^MAP_POKEMON_LEAGUE_ENTRANCE_WIFI_ROOM$|^MAP_GOLDENROD_GAME_CORNER_JP$/;
// (HGSS counts these as Kanto's, but they're on Johto's side: the houses by
// Routes 26 and 27, Tohjo Falls' hidden room, Route 28 to Mt. Silver, and
// Goldenrod's Game Corner, outside Japan.)
const JOHTO_SIDE = new Set(["MAP_ROUTE_26_NORTH_HOUSE", "MAP_ROUTE_26_WEEK_SIBLINGS_HOUSE", "MAP_ROUTE_27_HOUSE", "MAP_TOHJO_FALLS_HIDDEN_ROOM",
  "MAP_ROUTE_28", "MAP_ROUTE_28_HOUSE", "MAP_GOLDENROD_GAME_CORNER"]);
// (And Saffron's Magnet Train station, HGSS's, though it's Kanto's: FireRed's
// Saffron has none, so it's built here, region "kanto", its door into Saffron
// City new: tools/build-magnet-train.js.)
const KANTO_SIDE = new Set(["MAP_SAFFRON_MAGNET_TRAIN_STATION_1F", "MAP_SAFFRON_MAGNET_TRAIN_STATION_2F", "MAP_SAFFRON_MAGNET_TRAIN_STATION_2F_EMPTY"]);
const TOWNS = { NEW_BARK: "NewBarkTown", CHERRYGROVE: "CherrygroveCity", VIOLET: "VioletCity", AZALEA: "AzaleaTown", CIANWOOD: "CianwoodCity",
  GOLDENROD: "GoldenrodCity", OLIVINE: "OlivineCity", ECRUTEAK: "EcruteakCity", MAHOGANY: "MahoganyTown", BLACKTHORN: "BlackthornCity" };
// (And the places with rooms of their own, by their names.)
const PLACES = Object.assign({ MOUNT_SILVER: "MtSilver", MOUNT_SILVER_CAVE: "MtSilverCave", RUINS_OF_ALPH: "RuinsOfAlph", LAKE_OF_RAGE: "LakeOfRage",
  SAFARI_ZONE: "SafariZone", SAFARI_ZONE_GATE: "SafariZoneGate", FRONTIER_ACCESS: "FrontierAccess", BATTLE_FRONTIER: "BattleFrontier",
  POKEATHLON_DOME: "PokeathlonDome", NATIONAL_PARK: "NationalPark", SS_AQUA: "SSAqua", BELL_TOWER: "BellTower", SPROUT_TOWER: "SproutTower",
  BURNED_TOWER: "BurnedTower", SINJOH_RUINS: "SinjohRuins", EMBEDDED_TOWER: "EmbeddedTower", DARK_CAVE: "DarkCave", DRAGONS_DEN: "DragonsDen",
  TEAM_ROCKET_HEADQUARTERS: "TeamRocketHideout", MOUNT_MORTAR: "MtMortar", WHIRL_ISLANDS: "WhirlIslands", ICE_PATH: "IcePath",
  SLOWPOKE_WELL: "SlowpokeWell", UNION_CAVE: "UnionCave", SAFFRON: "SaffronCity" }, TOWNS);
const WORDS = { POKECENTER: "PokemonCenter", POKEMART: "Mart", MOUNT: "Mt", POKEATHALON: "Pokeathlon", SS: "SS" };
// HGSS's map constant as a name: its town (or route) first, then the rest, floors apart (_1F, _B2F).
function mapName(c) {
  const words = c.replace(/^MAP_/, "").split("_");
  const pascal = (ws) => ws.map((w) => WORDS[w] || w[0] + w.slice(1).toLowerCase()).join("");
  let base = [], rest = words;
  for (let n = 4; n >= 1 && !base.length; n--) if (PLACES[words.slice(0, n).join("_")]) { base = [PLACES[words.slice(0, n).join("_")]]; rest = words.slice(n); }
  if (!base.length && words[0] === "ROUTE" && /^\d+$/.test(words[1])) { base = ["Route" + words[1]]; rest = words.slice(2); }
  const parts = base.slice();
  let run = [];
  for (const w of rest) {
    if (/^B?\d+F$/.test(w)) { if (run.length) parts.push(pascal(run)); run = []; parts.push(w); } else run.push(w);
  }
  // (An elevator apart, as FireRed's: GoldenrodCity_DepartmentStore_Elevator.)
  if (run.length > 1 && run[run.length - 1] === "ELEVATOR") { parts.push(pascal(run.slice(0, -1))); run = ["ELEVATOR"]; }
  if (run.length) parts.push(pascal(run));
  return base.length ? parts.join("_") : parts.length > 1 ? parts[0] + "_" + parts.slice(1).join("_") : parts[0];
}
// HGSS's music as FireRed's nearest.
const MUSIC = {
  SEQ_GS_POKESEN: "mus_poke_center", SEQ_GS_FS: "mus_poke_center", SEQ_GS_D_CHIKATSUURO: "mus_mt_moon", SEQ_SILENCE_FIELD: "mus_sevii_dungeon",
  SEQ_GS_TO_YAKETA: "mus_poke_tower", SEQ_GS_D_UNKNOWN_ISEKI: "mus_sevii_dungeon", SEQ_GS_R_1_29: "mus_route1", SEQ_GS_R_1_30: "mus_route1",
  SEQ_GS_R_2_30: "mus_route3", SEQ_GS_R_3_30: "mus_route3", SEQ_GS_R_4_34: "mus_route11", SEQ_GS_R_5_34: "mus_route11", SEQ_GS_R_6_34: "mus_route11",
  SEQ_GS_R_6_38: "mus_route24", SEQ_GS_R_7_42: "mus_sevii_route", SEQ_GS_R_8_34: "mus_route24", SEQ_GS_T_WAKABA: "mus_pallet",
  SEQ_GS_UTSUGI_RABO: "mus_oak_lab", SEQ_GS_C_YOSHINO: "mus_pewter", SEQ_GS_C_KIKYOU: "mus_vermillion", SEQ_GS_T_HIWADA: "mus_fuchsia",
  SEQ_GS_C_TANBA: "mus_cinnabar", SEQ_GS_C_KOGANE: "mus_celadon", SEQ_GS_C_ASAGI: "mus_sevii_123", SEQ_GS_C_ENJU: "mus_lavender",
  SEQ_GS_GYM: "mus_gym", SEQ_GS_KABURENJOU: "mus_route11", SEQ_GS_T_CHOUJI: "mus_pewter", SEQ_GS_C_FUSUBE: "mus_sevii_67",
  SEQ_GS_CHAMPROAD: "mus_victory_road", SEQ_GS_D_KOUEN: "mus_route11", SEQ_GS_TO_MADATSUBOMI1: "mus_poke_tower", SEQ_GS_TO_SUZU: "mus_sevii_dungeon",
  SEQ_GS_TO_TOUDAI: "mus_silph", SEQ_GS_D_KOORINONUKE: "mus_sevii_cave", SEQ_GS_RYUUNOANA: "mus_sevii_cave", SEQ_GS_PT_ENTR: "mus_net_center",
  SEQ_GS_SAFARI_ROAD: "mus_sevii_route", SEQ_GS_SAFARI_HOUSE: "mus_poke_center", SEQ_GS_SAFARI_FIELD: "mus_sevii_route", SEQ_GS_GAME: "mus_game_corner",
  SEQ_GS_WIFITOWER: "mus_net_center", SEQ_GS_D_AJITO: "mus_rocket_hideout", SEQ_GS_BATTLETOWER: "mus_trainer_tower", SEQ_GS_BATTLETOWER2: "mus_trainer_tower",
  SEQ_GS_PT_END_FIELD: "mus_sevii_route", SEQ_GS_KOUSOKUSEN: "mus_ss_anne", SEQ_GS_TAIKAI: "mus_trainer_tower", SEQ_GS_D_SHINTO: "mus_sevii_dungeon"
};
// (The caves drawn as FireRed's caves are; HGSS's other "caves", its towers,
// the Lighthouse, the Rocket hideout, the Ruins' chambers, as rooms are, in
// HGSS's own look, where an Escape Rope still works: dungeon.)
const REAL_CAVES = /^MAPSEC_(UNION_CAVE|SLOWPOKE_WELL|MT_MORTAR|ICE_PATH|WHIRL_ISLANDS|MT_SILVER_CAVE|DARK_CAVE|DRAGONS_DEN|CLIFF_CAVE|CLIFF_EDGE_GATE|TOHJO_FALLS)$/;
{
  const src = fs.readFileSync(path.join(ROOT, "src/data/map_headers.h"), "utf8");
  const places = JSON.parse(fs.readFileSync(F("msgdata/msg/msg_0279.json"), "utf8")).messages.map((x) => [].concat(x.en_US || "").join("").replace(/’/g, "'"));
  const mapsecs = {};
  for (const m of fs.readFileSync(path.join(ROOT, "include/constants/map_sections.h"), "utf8").matchAll(/#define (MAPSEC_\w+)\s+(\d+)/g)) mapsecs[m[1]] = +m[2];
  const have = new Set(MAPS.map((m) => m.c));
  for (const m of src.matchAll(/\[(MAP_\w+)\] = \{([^}]*)\}/g)) {
    const get = (k) => { const r = new RegExp("\\." + k + "\\s*=\\s*([^,\\n]+)").exec(m[2]); return r ? r[1].trim() : null; };
    if ((get("regionNo") !== "MAP_REGION_JOHTO" && !JOHTO_SIDE.has(m[1]) && !KANTO_SIDE.has(m[1])) || have.has(m[1]) || SKIP.test(m[1])) continue;
    const zone = (/zone_event_\d+_(\w+)_bin/.exec(get("eventsBank") || "") || [])[1];
    if (!zone || zone === "EVERYWHERE") continue;
    const kind = get("mapType"), mapsec = get("mapsec");
    // (Pokémon's names in it as other names are: Slowpoke Well.)
    const title = (places[mapsecs[mapsec]] || mapName(m[1])).replace(/\b([A-Z])([A-Z]{3,})\b/g, (x, a, b) => a + b.toLowerCase());
    const outdoors = kind === "MAP_TYPE_ROUTE" || kind === "MAP_TYPE_CITY_TOWN";
    const cave = kind === "MAP_TYPE_CAVE" && REAL_CAVES.test(mapsec);
    MAPS.push(Object.assign({ c: m[1], name: mapName(m[1]), title,
      type: outdoors ? (kind === "MAP_TYPE_ROUTE" ? "route" : /Town$/.test(title) ? "town" : "city") : cave ? "underground" : "indoor",
      zone, music: MUSIC[get("dayMusicId")] || "mus_route1", ground: true },
      kind === "MAP_TYPE_CAVE" && !cave ? { dungeon: true } : {}, KANTO_SIDE.has(m[1]) ? { region: "kanto" } : {},
      /_POKECENTER_1F$/.test(m[1]) ? { template: "pc" } : /_POKEMART$/.test(m[1]) ? { template: "mart" } : {}));
  }
}
// Each map's music: HGSS's own (its header's dayMusicId; tools/build-johto-audio.js
// converted them, tools/lib/hgss-music.json names them), FireRed's nearest where
// HGSS plays none (SEQ_SILENCE_*). (HGSS's night music is the same as its day's.)
{
  const HGSS_MUSIC = JSON.parse(fs.readFileSync(path.join(__dirname, "lib/hgss-music.json"), "utf8"));
  const src = fs.readFileSync(path.join(ROOT, "src/data/map_headers.h"), "utf8");
  for (const m of MAPS) {
    const blk = (new RegExp("\\[" + m.c + "\\] = \\{([^}]*)\\}").exec(src) || [])[1] || "";
    const seq = (/\.dayMusicId\s*=\s*(\w+)/.exec(blk) || [])[1];
    if (HGSS_MUSIC[seq]) m.music = HGSS_MUSIC[seq];
  }
}
// (--list: just the maps, what each is called and is.)
if (process.argv.includes("--list")) {
  for (const m of MAPS) console.log([m.c, m.name, m.title, m.type, m.zone, m.music, m.template || (m.dungeon ? "dungeon" : "")].join("  "));
  process.exit(0);
}
// The Pokémon League Reception Gate is FireRed's own (Route22_NorthEntrance):
// Route 26's door into it is its new way west (data/johto-maps.js adds it).
const GATE = { name: "Route22_NorthEntrance" };
// (HGSS's gate has Route 26's door south and Route 28's west; FireRed's has
// Route 22 south and Route 23 north, so they're at its side walls.)
const GATE_DOORS = [{ to: "Route26", x: 0, y: 6, side: "left", patch: "johto", guardId: 99 },
  { to: "Route28", x: 14, y: 6, side: "right", patch: "johto-east", guardId: 98 }];
const byConst = Object.fromEntries(MAPS.map((m) => [m.c, m.name]));

// HGSS tile behaviours (include/constants/metatile_behavior.h) as FireRed's
// (game/world.js's MB): most kept Gen 3's numbers.
// HGSS's tiles where you meet wild Pokémon on foot (sMetatileBehaviorFlags'
// TILE_BEHAVIOR_FLAG_ENCOUNTER, by behaviour: tall grass, and the floors of
// caves and of the Ruins of Alph's hall), as the maps' encounter tiles.
const LAND_ENCOUNTER = new Set(fs.readFileSync(path.join(ROOT, "src/metatile_behavior.c"), "utf8").split("sMetatileBehaviorFlags[] = {")[1].split("};")[0]
  .split("\n").filter((l) => /\]\s*=/.test(l)).map((l, i) => (/= TILE_BEHAVIOR_FLAG_ENCOUNTER,/.test(l) ? i : -1)).filter((i) => i >= 0));
function frBehavior(b) {
  switch (b) {
    case 0x02: case 0x03: return 0x02;            // tall grass, very tall grass
    case 0x10: return 0x10;                       // river: pond water
    case 0x11: return 0xf0;                       // a whirlpool: only Whirlpool gets you through (game/world.js's MB.WHIRLPOOL)
    case 0x4b: return 0xf1; case 0x4c: return 0xf2;   // rocky walls Rock Climb goes up and down, or along
    case 0x13: return 0x13;                       // waterfall
    case 0x15: return 0x15;                       // sea
    case 0x16: case 0x1d: return 0x16;            // puddles
    case 0x17: return 0x17;                       // shallow water
    case 0x20: case 0x40: case 0x41: case 0x42: case 0x43: return 0x23;   // ice, and the slides (Ice Path's)
    case 0x21: return 0x21;                       // sand
    case 0x38: case 0x39: case 0x3a: case 0x3b: return b;   // ledges
    case 0x62: case 0x63: case 0x64: case 0x65: return b;   // warps you walk off
    case 0x6c: return 0x62; case 0x6d: return 0x63; case 0x6e: return 0x64; case 0x6f: return 0x65;
    case 0x67: return 0x67;                       // warp pad
    case 0x5e: case 0x5f: return 0x61;            // stairs you walk onto (a cave's floors): a ladder's step-on warp
    case 0x3c: case 0x3d: case 0x3e: return 0x61; // ladders, up and down (towers, wells): FireRed's ladder
    case 0x6a: case 0x6b: return b;               // escalators (Goldenrod's Department Store)
    case 0x69: return 0x69;                       // door
    case 0x80: return 0x80;                       // a counter: you talk across it (the Safari Zone's)
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
// FireRed's nearest to HGSS's people (their size and frames as Kanto's people
// with that sprite have them), for those without a sheet of their own.
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
// Johto's people are HGSS's own (Lyra, or Ethan for a girl, whose look HGSS
// sets by a var (GetFriendSprite), Silver, Prof. Elm, everyone); the item balls,
// small trees and breakable rocks are FireRed's, as the game uses them (and so
// is anyone whose HGSS sprite isn't a person's sheet, FireRed's nearest).
const FR_OBJECTS = new Set(["SPRITE_MONSTARBALL", "SPRITE_TREE", "SPRITE_BREAKROCK"]);
function personSprite(sprite) {
  if (/^SPRITE_VAR_\d+$/.test(sprite)) return Object.assign(modelSprite("MMODEL_HEROINE", "hgss_heroine"), { girlLook: modelSprite("MMODEL_HERO", "hgss_hero") });
  if (FR_OBJECTS.has(sprite)) return Object.assign({}, frPersonSprite(sprite));
  if (!spritesDone.has(sprite)) spritesDone.set(sprite, modelSprite(spriteTable[sprite], "hgss_" + sprite.replace(/^SPRITE_/, "").toLowerCase(), sprite));
  const fr = frPersonSprite(sprite);
  return spritesDone.get(sprite) || (fr && Object.assign({}, fr));
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

// ---------- Whirlpools and rocky walls, drawn over the painted map ----------

// Each whirlpool (HGSS's are 3x3 tiles) a swirl over the water: two arms of
// foam round a dark eye, turning a little each of the water's frames (its
// animated cells, which it's drawn into).
function drawWhirlpools(r, pic) {
  const W = r.width, seen = new Set(), PX = r.width * 16;
  const anim = pic.anim, cellAt = new Map();
  for (let k = 0; k < anim.cells.length; k += 4) {
    const n = (k + 4 < anim.cells.length ? anim.cells[k + 6] : anim.pics.length) - anim.cells[k + 2];
    cellAt.set(anim.cells[k] + "," + anim.cells[k + 1], { first: anim.cells[k + 2], n });
  }
  const FOAM = [248, 248, 248], LIGHT = [136, 200, 240], EYE = [40, 96, 176];
  // (The colour at (x, y) from the swirl's middle, turned `phase` of a full turn; or null: the water.)
  const swirl = (x, y, R, phase) => {
    const d = Math.hypot(x, y);
    if (d > R) return null;
    if (d < R * 0.18) return EYE;
    const a = (((Math.atan2(y, x) + phase * 2 * Math.PI) * 2 - (d / R) * 2.4 * Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return a < 0.9 ? FOAM : a < 1.7 ? LIGHT : d < R * 0.4 ? LIGHT : null;
  };
  for (let i = 0; i < r.perm.length; i++) {
    if ((r.perm[i] & 0xff) !== 0x11 || seen.has(i)) continue;
    const group = [i], q = [i];
    seen.add(i);
    while (q.length) {
      const k = q.pop(), x = k % W, y = Math.floor(k / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = (y + dy) * W + x + dx;
        if (x + dx < 0 || x + dx >= W || y + dy < 0 || y + dy >= r.height || seen.has(n) || (r.perm[n] & 0xff) !== 0x11) continue;
        seen.add(n); group.push(n); q.push(n);
      }
    }
    const xs = group.map((k) => k % W), ys = group.map((k) => Math.floor(k / W));
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, y0 = Math.min(...ys), y1 = Math.max(...ys) + 1;
    const cx = (x0 + x1) * 8, cy = (y0 + y1) * 8, R = Math.min(x1 - x0, y1 - y0) * 8 - 1;
    for (let py = y0 * 16; py < y1 * 16; py++) for (let px = x0 * 16; px < x1 * 16; px++) {
      const c = swirl(px + 0.5 - cx, py + 0.5 - cy, R, 0);
      if (c) pic.below.set(c.concat(255), (py * PX + px) * 4);
    }
    for (let cyc = y0 * 2; cyc < y1 * 2; cyc++) for (let cxc = x0 * 2; cxc < x1 * 2; cxc++) {
      const cell = cellAt.get(cxc + "," + cyc);
      if (!cell) continue;
      for (let f = 0; f < cell.n; f++) {
        const p = anim.pics[cell.first + f];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const c = swirl(cxc * 8 + x + 0.5 - cx, cyc * 8 + y + 0.5 - cy, R, f / cell.n);
          if (c) p.set(c.concat(255), (y * 8 + x) * 4);
        }
      }
    }
  }
}
// Each rocky wall's tile, footholds: knobs of the rock's lightest colour with
// its darkest under them, up the wall (or along it, for one going east-west).
function drawRockClimbs(r, pic) {
  const PX = r.width * 16;
  for (let i = 0; i < r.perm.length; i++) {
    const b = r.perm[i] & 0xff;
    if (b !== 0x4b && b !== 0x4c) continue;
    const x0 = (i % r.width) * 16, y0 = Math.floor(i / r.width) * 16;
    let light = null, dark = null;
    const lum = (o) => pic.below[o] * 3 + pic.below[o + 1] * 6 + pic.below[o + 2];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const o = ((y0 + y) * PX + x0 + x) * 4;
      if (light == null || lum(o) > lum(light)) light = o;
      if (dark == null || lum(o) < lum(dark)) dark = o;
    }
    const L = [...pic.below.slice(light, light + 3), 255], D = [...pic.below.slice(dark, dark + 3), 255];
    const knobs = b === 0x4b ? [[3, 1], [9, 6], [4, 11]] : [[1, 4], [6, 10], [11, 3]];
    for (const [kx, ky] of knobs) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      if ((x === 0 || x === 3) && (y === 0 || y === 3)) continue;
      pic.below.set(y === 3 || (y === 2 && (x === 0 || x === 3)) ? D : L, ((y0 + ky + y) * PX + x0 + kx + x) * 4);
    }
  }
}

// Cianwood's Gym with its falls stopped (the winch's doing): drawn again
// without them (build model 173, the falls; its animation, 174, runs them
// dry), the strip they come down kept as the map's "dry" patch.
const CIANWOOD_FALLS = { model: 173, x: 12, y: 0, w: 3, h: 10 };
function cianwoodDry(m, r) {
  const F = CIANWOOD_FALLS, dry = renderMap(ROOT, m.c, { ground: m.ground, skipBuildings: [F.model] }), W = r.width * 16;
  for (const [part, src, base] of [["", dry.below, r.below], ["-top", dry.top, null]]) {
    const img = new Uint8ClampedArray(F.w * 16 * F.h * 16 * 4);
    for (let y = 0; y < F.h * 16; y++) for (let x = 0; x < F.w * 16; x++) {
      const o = ((F.y * 16 + y) * W + F.x * 16 + x) * 4, k = (y * F.w * 16 + x) * 4;
      // (Where nothing's drawn without them, as it was.)
      const from = src[o + 3] || !base ? src : base;
      img.set(from.subarray(o, o + 4), k);
    }
    writePng(path.join(mapsDir, m.name + "-patch-dry" + part + ".png"), F.w * 16, F.h * 16, img);
  }
  return { dry: { x: F.x, y: F.y, w: F.w, h: F.h, top: true, collision: [] } };
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
// (Each with HGSS's words for it, the Apricorn Box's: msg_0021's 40-46.)
const APRICORN_WORDS = JSON.parse(fs.readFileSync(F("msgdata/msg/msg_0021.json"), "utf8")).messages.slice(40, 47).map((m) => [].concat(m.en_US).slice(1).join(" ").replace(/\n/g, "").replace(/’/g, "'"));
const extraItems = Object.fromEntries(APRICORNS.map((c, i) => [c + "-apricorn", { name: c + "-apricorn", category: "apricorn", effect: APRICORN_WORDS[i] }]));
// (And the key items its scripts give or ask for that the game hasn't got.)
extraItems.squirtbottle = { name: "squirtbottle", category: "key-items", effect: "A watering can shaped like a Squirtle. It helps promote healthy plant growth." };
extraItems["mystery-egg"] = { name: "mystery-egg", category: "key-items", effect: "A mysterious Egg obtained from Mr. Pokémon." };
extraItems["berry-pots"] = { name: "berry-pots", category: "key-items", effect: "Four pots for growing Berries." };
extraItems["vs-recorder"] = { name: "vs-recorder", category: "key-items", effect: "A device that records battles." };
extraItems["apricorn-box"] = { name: "apricorn-box", category: "key-items", effect: "A box for keeping Apricorns. It holds a whole lot of them." };
extraItems["unown-report"] = { name: "unown-report", category: "key-items", effect: "A report of all the discovered kinds of Unown." };
const itemByKey = {};
for (const id of Object.keys(window.ITEMS).concat(Object.keys(extraItems))) itemByKey[id.replace(/[^a-z0-9]/g, "")] = id;
const APRICORN_ITEM = { RED: "red-apricorn", YLW: "yellow-apricorn", BLU: "blue-apricorn", GRN: "green-apricorn", PNK: "pink-apricorn", WHT: "white-apricorn", BLK: "black-apricorn" };
// (Where HGSS's names for an item aren't this game's.)
const ITEM_ALIAS = { PARLYZ_HEAL: "paralyze-heal", VS__RECORDER: "vs-recorder", POKE_BALL: "poke-ball", X_DEFEND: "x-defense", X_SPECIAL: "x-sp-atk", X_SP_DEF: "x-sp-def",
  ELIXIR: "elixir", HP_UP: "hp-up", PP_UP: "pp-up", KINGS_ROCK: "kings-rock", BLACKGLASSES: "black-glasses", NEVERMELTICE: "never-melt-ice",
  TWISTEDSPOON: "twisted-spoon", SILVERPOWDER: "silver-powder", THUNDERSTONE: "thunder-stone", TINYMUSHROOM: "tiny-mushroom",
  BRIGHTPOWDER: "bright-powder", DEEPSEATOOTH: "deep-sea-tooth", DEEPSEASCALE: "deep-sea-scale", ENERGYPOWDER: "energy-powder" };
// HGSS's TMs and HMs by the move each teaches (src/item.c), as this game's
// machine for that move (its TM and HM numbers aren't HGSS's: data/items.js).
const MACHINE_MOVES = {};
for (const m of fs.readFileSync(path.join(ROOT, "src/item.c"), "utf8").matchAll(/(MOVE_\w+),\s*\/\/ ((?:TM|HM)\d+)/g)) MACHINE_MOVES[m[2]] = m[1];
const machineFor = (k) => {
  const move = MACHINE_MOVES[k] && toID(MACHINE_MOVES[k].replace(/^MOVE_/, ""));
  return move ? Object.keys(window.ITEMS).find((id) => /^(tm|hm)\d+$/.test(id) && toID((/^Teaches (.+?) to a compatible/.exec(window.ITEMS[id].effect || "") || [])[1] || "") === move) || null : null;
};
// (HGSS's TMs for moves no machine of this game's teaches: new TMs, after
// this game's last, and who can learn each, HGSS's (files/poketool/personal).)
const HGSS_PERSONAL = JSON.parse(fs.readFileSync(F("poketool/personal/personal.json"), "utf8")).baseStats;
const newMachineLearners = {};
const newMachine = (k) => {
  const had = Object.keys(extraItems).find((id) => extraItems[id].hgss === k);
  if (had) return had;
  const move = MACHINE_MOVES[k].replace(/^MOVE_/, "").split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
  // (Numbered from TM108 on, the first free numbers: TM114-TM165 are the older games' TMs in data/items.js.)
  let n = 108;
  while (window.ITEMS["tm" + n] || extraItems["tm" + n]) n++;
  extraItems["tm" + n] = { name: "tm" + n, category: "all-machines", effect: "Teaches " + move + " to a compatible Pokémon." };
  Object.defineProperty(extraItems["tm" + n], "hgss", { value: k });   // (for the build only: HGSS's TM it is)
  const num = +k.slice(2);
  newMachineLearners[move] = HGSS_PERSONAL.filter((b) => (b.tms || []).includes(num)).map((b) => species(b.species)).filter(Boolean);
  return "tm" + n;
};
const item = (c) => {
  const k = String(c).replace(/^ITEM_/, "");
  if (/^TM\d+$/.test(k) && MACHINE_MOVES[k]) return machineFor(k) || newMachine(k);
  if (/^HM\d+$/.test(k) && machineFor(k)) return machineFor(k);
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
// FireRed's.
const trainerIds = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/trainers.h"), "utf8").matchAll(/#define (TRAINER_\w+)\s+(\d+)/g)) trainerIds[m[1]] = +m[2];
const HG_TRAINERS = JSON.parse(fs.readFileSync(F("poketool/trainer/trainers.json"), "utf8")).trainers;
const classIds = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/trainer_class.h"), "utf8").matchAll(/#define (TRAINERCLASS_\w+)\s+(\d+)/g)) classIds[m[1]] = +m[2];
const classNames = JSON.parse(fs.readFileSync(F("msgdata/msg/msg_0730.json"), "utf8")).messages.map((m) => [].concat(m.en_US || "").join(""));
// (Their pictures, HGSS's: tools/build-hgss-trainer-pics.js.)
const CLASS_PIC = JSON.parse(fs.readFileSync(path.join(__dirname, "lib/hgss-trainer-pics.json"), "utf8"));
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
    className: (classNames[classIds[t.class]] || cls).replace("₧₦", "Pokémon"), name: t.name.replace(/\{[^}]*\}/g, "").trim() || key, pic: CLASS_PIC[cls] || "hgss_youngster",
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

{
  const names = new Set();
  for (const m of MAPS) {
    if (names.has(m.name) || kanto()[m.name]) throw new Error("two maps named " + m.name);
    names.add(m.name);
  }
}
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
          // (Through a waterfall, a whirlpool or up a rocky wall too.)
          if (u < 0 || v < 0 || u >= r.width || v >= r.height || reach.has(n) || ((r.perm[n] >> 15) & 1 && ![0x13, 0x11, 0x4b, 0x4c].includes(r.perm[n] & 0xff))) continue;
          reach.add(n); q.push(n);
        }
      }
      classes.forEach((c, i) => { if (!reach.has(i) && c !== "waterrock") classes[i] = "rock"; });
    }
    const pic = Painter.compose(classes, r.width, r.height, { buildings: cave ? [] : HC.buildingsOf(r, classes, evw), signs, style: cave ? "cave" : "outdoor" });
    drawWhirlpools(r, pic);
    drawRockClimbs(r, pic);
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
  // (Cianwood's Gym: its falls stopped, once the winch is turned (ui/johto-gymmicks.js).)
  const patches = m.name === "CianwoodCity_Gym" ? cianwoodDry(m, r) : undefined;

  // (HGSS's waterfalls are solid, and the water at their tops (34) a tile of
  // its own: FireRed's are waterfalls you go up or down with Waterfall, onto
  // water. Whirlpools and rocky walls stay solid: Whirlpool and Rock Climb take you over them.)
  const collision = r.perm.map((v, i) => (inside && !drawn(i) ? 1 : (v & 0xff) === 0x13 || (v & 0xff) === 0x22 ? 0 : (v >> 15) & 1));
  const behavior = r.perm.map((v) => ((v & 0xff) === 0x22 ? 0x10 : frBehavior(v & 0xff)));
  // (Azalea's Gym: HGSS's Spinarak carts ride its webs between the floors;
  // this game has no carts, so you walk the webs.)
  if (m.name === "AzaleaTown_Gym") for (const [xs, y0, y1] of [[[3, 9], 11, 15], [[3, 9, 15], 26, 30]]) {
    for (const x of xs) for (let y = y0; y <= y1; y++) collision[y * r.width + x] = 0;
  }
  const ev = r.events || { warps: [], signs: [], people: [], triggers: [] };
  // (HGSS's warp you walk onto heading its way, in the middle of a cave or a
  // room, open floor beyond it, as Whirl Islands' ways down: FireRed's warp
  // you step onto. At the map's edge, or a wall beyond, it's FireRed's own,
  // walked out through.)
  const ARROW = { 0x62: [1, 0], 0x63: [-1, 0], 0x64: [0, -1], 0x65: [0, 1] };
  for (const w of ev.warps) {
    const i = w.y * r.width + w.x, d = ARROW[behavior[i]];
    if (!d) continue;
    const u = w.x + d[0], v = w.y + d[1];
    if (u >= 0 && v >= 0 && u < r.width && v < r.height && !collision[v * r.width + u] && !ev.warps.some((o) => o.x === u && o.y === v)) behavior[i] = 0x61;
  }
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
    // (Mahogany's Gym's ice blocks, pushed along the ice: ui/overworld.js.)
    else if (p.sprite === "SPRITE_ICE") Object.assign(def, { iceBlock: true, inanimate: true });
    else if (/^_EV_/.test(s)) Object.assign(def, { script: hgss(s), text: scriptText(m.zone, p.script) });
    // (Someone kept at the map's edge for a scene, out of sight in HGSS's 3D:
    // offstage until a script brings them on.)
    // (HGSS's sprite, for the build only: the Pokémon Centers' nurses and the Marts' clerks.)
    Object.defineProperty(def, "hgssSprite", { value: p.sprite });
    if (!def.script && !def.hgssFlag && (p.x <= 0 || p.y <= 0 || p.x >= r.width - 1 || p.y >= r.height - 1)) def.offstage = true;
    people.push(def);
  }
  out[m.name] = {
    name: m.name, title: m.title, width: r.width, height: r.height, type: m.type, music: m.music, region: m.region || "johto",
    allowEscaping: m.type === "underground" || m.dungeon || undefined,   // (an Escape Rope or Dig works: caves and dungeons)
    cycling: true, showName: m.type !== "indoor", top: true, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior,
    encounter: r.perm.map((v, i) => ((behavior[i] === 0x02 || LAND_ENCOUNTER.has(v & 0xff)) && [0, 0x02, 0x21].includes(behavior[i]) ? 1 : 0)),
    connections: [],
    warps: ev.warps.map((w) => (w.map === "MAP_ROUTE_22_POKEMON_LEAGUE_RECEPTION_GATE" ? { x: w.x, y: w.y, map: GATE.name, warp: null }
      // (An elevator's way out, 4095: where you got in, FireRed's MAP_DYNAMIC.)
      : +w.map === 4095 ? { x: w.x, y: w.y, map: null, mapConst: "MAP_DYNAMIC", warp: null }
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
    anim, patches
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
// (The mats: patches over the gate's side walls, its floor with a red mat on it, as at its door.)
for (const door of GATE_DOORS) {
  const gate = readPng(path.join(mapsDir, GATE.name + ".png")), T = 16, img = new Uint8ClampedArray(T * 3 * T * 4);
  for (let y = 0; y < 3 * T; y++) for (let x = 0; x < T; x++) {
    const i = ((door.y - 1) * T + y) * gate.width + door.x * T + x;
    img.set(gate.rgba.slice(i * 4, i * 4 + 4), (y * T + x) * 4);
  }
  // (Drawn for the left wall; on the right, mirrored.)
  const px = (x, y, c) => img.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255],
    (y * T + (door.side === "left" ? x : T - 1 - x)) * 4);
  for (let y = T - 4; y < 2 * T + 4; y++) for (let x = 0; x < 12; x++) {
    const edge = y === T - 4 || y === 2 * T + 3 || x === 11, rim = y === T - 3 || y === 2 * T + 2 || x === 10 || x === 0;
    px(x, y, edge ? "#5a6a7a" : rim ? "#f0e8e0" : y === T - 2 || y === 2 * T + 1 || x === 9 || x === 1 ? "#c84838" : "#d85848");
  }
  writePng(path.join(mapsDir, GATE.name + "-patch-" + door.patch + ".png"), T, 3 * T, img);
}
// FireRed's gate: its ways out, mats at its side walls, to Route 26's door
// (west) and Route 28's (east), each with a guard until you're Champion
// (ui/game.js hides them once you are).
const gateJs = "(function () {\n" +
  "  const gate = window.WORLD_MAPS[" + JSON.stringify(GATE.name) + "];\n" +
  "  if (!gate || gate.warps.some((w) => w.map === \"Route26\")) return;\n" +
  "  const at = (x, y) => y * gate.width + x;\n" +
  GATE_DOORS.map((door) => {
    const back = out[door.to].warps.findIndex((w) => w.map === GATE.name);
    out[door.to].warps.forEach((w) => { if (w.map === GATE.name) w.warp = door.patch; });
    const guard = { id: door.guardId, x: door.x + (door.side === "left" ? 1 : -1), y: door.y, movement: door.side === "left" ? "face_right" : "face_left",
      rangeX: 1, rangeY: 1, script: "Route22_NorthEntrance_EventScript_JohtoGuard", flag: null,
      text: ["The Johto region lies to the west.", "I'm sorry, but only the Champion of\nthe Pokémon League may go on to Johto."],
      sprite: "policeman", width: 16, height: 32, frames: 9 };
    return "  gate.warps.push({ x: " + door.x + ", y: " + door.y + ", map: " + JSON.stringify(door.to) + ", warp: " + back + " });\n" +
      "  gate.behavior[at(" + door.x + ", " + door.y + ")] = " + (door.side === "left" ? "0x63" : "0x62") + ";   // (a way out " + (door.side === "left" ? "west" : "east") + ")\n" +
      "  for (const y of [" + (door.y - 1) + ", " + (door.y + 1) + "]) gate.collision[at(" + door.x + ", y)] = 1;\n" +
      "  gate.patches = Object.assign({}, gate.patches, { " + JSON.stringify(door.patch) + ": { x: " + door.x + ", y: " + (door.y - 1) + ", w: 1, h: 3, top: false, collision: [] } });\n" +
      "  gate.people.push(" + JSON.stringify(guard) + ");\n" +
      "  for (const m of " + JSON.stringify([door.to]) + ") for (const x of window.WORLD_MAPS[m].warps) if (x.warp === " + JSON.stringify(door.patch) + ") x.warp = gate.warps.length - 1;\n";
  }).join("") +
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
  // (Not one with a scene on its floor, as Lyra's in Route 31's, or that isn't a way between two maps, as Route 43's toll gate: HGSS's own.)
  if (g.triggers.length || new Set(g.warps.map((w) => w.map || w.mapConst)).size !== 2) continue;
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
    if (m.template === "pc" && p.hgssSprite === "SPRITE_PCWOMAN1") {
      people.push(Object.assign({}, p, { x: 7, y: 2, movement: "face_down", localId: "LOCALID_" + m.name.toUpperCase() + "_NURSE",
        script: m.name + "_EventScript_Nurse", text: null }));
      continue;
    }
    const at = m.template === "mart" && /^SPRITE_(SHOPM1_2|COUNTERM)$/.test(p.hgssSprite) && clerk < tpl.clerks.length ? tpl.clerks[clerk++] : tpl.spots[spot++ % tpl.spots.length];
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

// Johto's League: HGSS's Elite Four and Champion (the Indigo Plateau's rooms,
// zones T10R0201-0601), who take the Pokémon League's places once you've
// Johto's eight Badges (ui/game.js): each one's party and rematch party (_2,
// once you've Kanto's Badges as well, VAR_UNK_4135, in HGSS), sprite and lines
// (before, and after you've won; Lance's for a boy and for a girl).
const LEAGUE_ROOMS = [["T10R0201", "SPRITE_GSBIGFOUR1", "TRAINER_ELITE_FOUR_WILL_WILL"], ["T10R0301", "SPRITE_GSBIGFOUR2", "TRAINER_ELITE_FOUR_KOGA_KOGA"],
  ["T10R0401", "SPRITE_GSBIGFOUR3", "TRAINER_ELITE_FOUR_BRUNO_BRUNO"], ["T10R0501", "SPRITE_GSBIGFOUR4", "TRAINER_ELITE_FOUR_KAREN_KAREN"],
  ["T10R0601", "SPRITE_WATARU", "TRAINER_CHAMPION_LANCE"]];
const johtoLeague = LEAGUE_ROOMS.map(([zone, sprite, id], k) => {
  loadMessages(zone);
  const msg = (n) => { const key = Object.keys(messages).find((m) => m.endsWith("_" + zone + "_" + String(n).padStart(5, "0"))); return key ? pages(messages[key]) : null; };
  trainer(id); trainer(id + "_2");
  return Object.assign({ trainer: "HGSS_" + id, rematch: "HGSS_" + id + "_2" }, k < 4 ? { intro: msg(0), after: msg(1) } : { intro: msg(0), introGirl: msg(1), after: msg(2), afterGirl: msg(3) },
    { look: personSprite(sprite) });
});
// Where Johto's story starts: HGSS's new game (scr_seq_0149), as if you'd
// just left the house in New Bark Town, which you come to from Kanto, and
// Lyra had said hello (VAR_SCENE_PLAYERS_HOUSE_1F 2). The story goes on from
// Elm's Lab, as in HGSS: until he's given you a Pokémon, New Bark's neighbour
// won't let you go west; with it you've the Pokégear (FLAG_GOT_POKEGEAR, set
// as you choose: ui/johto-script.js), and Elm gives you his number as you go.
const START = [["SetVar", "VAR_SCENE_PLAYERS_HOUSE_1F", 2]];
// (Scripts' warps name maps by HGSS's constants, or, where the compiler gave
// their number (include/constants/maps.h), by that: both lead to the map.)
const mapIdConsts = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/maps.h"), "utf8").matchAll(/#define\s+(MAP_\w+)\s+(\d+)/g)) if (byConst[m[1]] && !(m[2] in mapIdConsts)) mapIdConsts[m[2]] = byConst[m[1]];
const scripts = { zones, messages: SC.messages, init: SC.init().concat(START), maps: zoneOfMap, origins, mapConsts: Object.assign({}, mapIdConsts, byConst),
  marts: { standard: standardMart, special: specialMarts }, yesno: SC.yesno, version: SC.defines.VERSION_HEARTGOLD || 7 };
// (In data/johto-maps.js, after the maps.)
const scriptsJs = "// Johto's field scripts (tools/lib/hgss-script.js; run by ui/johto-script.js), its trainers, and the Apricorns.\n" +
  "window.JOHTO_SCRIPTS = " + JSON.stringify(scripts) + ";\n" +
  "Object.assign(window.WORLD_TRAINERS, " + JSON.stringify(trainers) + ");\n" +
  "window.JOHTO_LEAGUE = " + JSON.stringify(johtoLeague) + ";\n" +
  "Object.assign(window.ITEMS, " + JSON.stringify(extraItems) + ");\n" +
  "Object.assign(window.MACHINE_LEARNERS, " + JSON.stringify(newMachineLearners) + ");\n" +
  "Object.assign(window.ITEM_SPRITES || (window.ITEM_SPRITES = {}), " + JSON.stringify(Object.assign(
    Object.fromEntries(APRICORNS.map((c) => [c + "-apricorn", "assets/sprites/items/apricorn/" + c + ".png"])),
    { "apricorn-box": "assets/sprites/items/apricorn/green.png" },
    // (The new TMs: the disc of their move's type.)
    Object.fromEntries(Object.keys(extraItems).filter((id) => /^tm\d+$/.test(id)).map((id) => {
      const move = /^Teaches (.+?) to/.exec(extraItems[id].effect)[1];
      return [id, "assets/sprites/items/tm/" + String((window.MOVES[move] || {}).type || "normal").toLowerCase() + ".png"];
    })))) + ");\n";
console.log("scripts:", Object.keys(zones).length, "zones,", Object.keys(trainers).length, "trainers,", Object.keys(SC.messages).length, "messages");
fs.writeFileSync(path.join(root, "data/johto-maps.js"),
  "// Auto-generated by tools/build-johto.js from pret/pokeheartgold. Do not edit by hand.\n" +
  "// Johto's maps, added to FireRed's (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" + gateJs + scriptsJs +
  // (And what other builders made for Johto, tools/lib/johto-*.generated.js:
  // its Town Map, tools/build-johto-town-map.js, and the like.)
  fs.readdirSync(path.join(__dirname, "lib")).filter((f) => /^johto-.+\.generated\.js$/.test(f)).sort()
    .map((f) => fs.readFileSync(path.join(__dirname, "lib", f), "utf8")).join(""));
console.log("wrote " + MAPS.length + " Johto maps to data/johto-maps.js and assets/world/");
