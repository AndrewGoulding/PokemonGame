// Builds the overworld from FireRed's map data.
//
//   node tools/build-maps.js <path to a pret/pokefirered checkout>
//   (or set POKEFIRERED=<path>; see README "Overworld maps")
//
// Reads, from the pokefirered checkout: data/layouts (block layouts),
// data/maps/<Map> (doors, signs, people, connections, text),
// src/data/wild_encounters.json, trainers (src/data/trainers.h,
// trainer_parties.h, trainer_class_names.h and their front pictures), and the
// people sprites. Tilesets come from
// this repo's assets/tilesets (FireRed's tiles, palettes and metatiles).
//
// Writes:
//   data/world-maps.js            window.WORLD_MAPS: per map size, blocks
//                                 (collision, behaviour), warps, signs, people,
//                                 connections, hidden items and wild Pokémon
//                                 window.WORLD_TRAINERS: the built maps' trainers
//                                 (class, name, picture, FireRed party)
//                                 window.WORLD_SPRITES: looks for people the
//                                 game's scenes add (Red)
//   assets/world/maps/<Map>.png   the map below sprites
//   assets/world/maps/<Map>-top.png       the parts drawn over sprites
//   assets/world/maps/<Map>-border.png    the 2x2 blocks repeated outside the map
//   assets/world/maps/<Map>-patch-<name>.png   metatiles its scripts swap in (MAP_PATCHES)
//   assets/world/maps/<Map>-anim.png      the map's animated 8x8 cells (water,
//                                 the sand's and land's water edges, flowers) in
//                                 every frame, 64 to a row (WORLD_MAPS[..].anim)
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
  PalletTown_PlayersHouse_1F: "Pallet Town · Red's house",
  PalletTown_PlayersHouse_2F: "Pallet Town · Red's house 2F",
  PalletTown_RivalsHouse: "Pallet Town · Gary's house",
  PalletTown_ProfessorOaksLab: "Pallet Town · Prof. Oak's Lab",
  ViridianCity_House: "Viridian City · Nickname house",
  ViridianCity_School: "Viridian City · Trainer school",
  ViridianCity_Mart: "Viridian City · Poké Mart",
  ViridianCity_PokemonCenter_1F: "Viridian City · Pokémon Center",
  ViridianCity_PokemonCenter_2F: "Viridian City · Pokémon Center 2F",
  Route2_ViridianForest_SouthEntrance: "Route 2 · Viridian Forest gate",
  Route2_ViridianForest_NorthEntrance: "Route 2 · Viridian Forest gate",
  Route2_House: "Route 2 · Trade house",
  Route2_EastBuilding: "Route 2 · Gate",
  Route22_NorthEntrance: "Route 22 · Pokémon League gate",
  PewterCity_Museum_1F: "Pewter City · Museum of Science",
  PewterCity_Museum_2F: "Pewter City · Museum of Science 2F",
  PewterCity_Gym: "Pewter City · Gym",
  PewterCity_Mart: "Pewter City · Poké Mart",
  PewterCity_House1: "Pewter City · House",
  PewterCity_House2: "Pewter City · House",
  PewterCity_PokemonCenter_1F: "Pewter City · Pokémon Center",
  PewterCity_PokemonCenter_2F: "Pewter City · Pokémon Center 2F",
  Route4_PokemonCenter_1F: "Route 4 · Pokémon Center",
  Route4_PokemonCenter_2F: "Route 4 · Pokémon Center 2F",
  MtMoon_1F: "Mt. Moon", MtMoon_B1F: "Mt. Moon · B1F", MtMoon_B2F: "Mt. Moon · B2F",
  CeruleanCity_PokemonCenter_1F: "Cerulean City · Pokémon Center",
  CeruleanCity_PokemonCenter_2F: "Cerulean City · Pokémon Center 2F",
  CeruleanCity_Gym: "Cerulean City · Gym",
  CeruleanCity_Mart: "Cerulean City · Poké Mart",
  CeruleanCity_BikeShop: "Cerulean City · Bike Shop",
  CeruleanCity_House1: "Cerulean City · Badge house",
  CeruleanCity_House2: "Cerulean City · Robbed house",
  CeruleanCity_House3: "Cerulean City · Trade house",
  CeruleanCity_House4: "Cerulean City · House",
  CeruleanCity_House5: "Cerulean City · Berry house",
  Route24: "Route 24 · Nugget Bridge",
  Route25_SeaCottage: "Route 25 · Sea Cottage",
  PokemonLeague_LoreleisRoom: "Pokémon League · Lorelei's room",
  PokemonLeague_BrunosRoom: "Pokémon League · Bruno's room",
  PokemonLeague_AgathasRoom: "Pokémon League · Agatha's room",
  PokemonLeague_LancesRoom: "Pokémon League · Lance's room",
  PokemonLeague_ChampionsRoom: "Pokémon League · Champion's room",
  PokemonLeague_HallOfFame: "Pokémon League · Hall of Fame",
  OneIsland_PokemonCenter_1F: "One Island · Pokémon Net Center",
  OneIsland_PokemonCenter_2F: "One Island · Pokémon Net Center 2F",
  OneIsland_Harbor: "One Island · Harbor", TwoIsland_Harbor: "Two Island · Harbor", ThreeIsland_Harbor: "Three Isle Port · Harbor",
  OneIsland_KindleRoad_EmberSpa: "Kindle Road · Ember Spa",
  TwoIsland_JoyfulGameCorner: "Two Island · Joyful Game Corner", TwoIsland_House: "Two Island · Move Maniac's house",
  TwoIsland_CapeBrink_House: "Cape Brink · House",
  FourIsland_Harbor: "Four Island · Harbor", FourIsland_PokemonCenter_1F: "Four Island · Pokémon Center",
  FourIsland_PokemonCenter_2F: "Four Island · Pokémon Center 2F", FourIsland_Mart: "Four Island · Poké Mart",
  FourIsland_PokemonDayCare: "Four Island · Pokémon Day Care", FourIsland_LoreleisHouse: "Four Island · Lorelei's house",
  FourIsland_House1: "Four Island · House", FourIsland_House2: "Four Island · Sticker house",
  FourIsland_IcefallCave_Entrance: "Icefall Cave", FourIsland_IcefallCave_1F: "Icefall Cave · 1F",
  FourIsland_IcefallCave_B1F: "Icefall Cave · B1F", FourIsland_IcefallCave_Back: "Icefall Cave · Back",
  FiveIsland_Harbor: "Five Island · Harbor", FiveIsland_PokemonCenter_1F: "Five Island · Pokémon Center",
  FiveIsland_PokemonCenter_2F: "Five Island · Pokémon Center 2F", FiveIsland_House1: "Five Island · House",
  FiveIsland_House2: "Five Island · House", FiveIsland_Meadow: "Five Isle Meadow", FiveIsland_RocketWarehouse: "Rocket Warehouse",
  FiveIsland_MemorialPillar: "Memorial Pillar", FiveIsland_WaterLabyrinth: "Water Labyrinth", FiveIsland_ResortGorgeous: "Resort Gorgeous",
  FiveIsland_ResortGorgeous_House: "Resort Gorgeous · Selphy's house", FiveIsland_LostCave_Entrance: "Lost Cave",
  ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => ["FiveIsland_LostCave_Room" + (i + 1), "Lost Cave"])),
  SixIsland_Harbor: "Six Island · Harbor", SixIsland_PokemonCenter_1F: "Six Island · Pokémon Center",
  SixIsland_PokemonCenter_2F: "Six Island · Pokémon Center 2F", SixIsland_Mart: "Six Island · Poké Mart", SixIsland_House: "Six Island · House",
  SixIsland_WaterPath_House1: "Water Path · Heracross house", SixIsland_WaterPath_House2: "Water Path · House",
  SixIsland_DottedHole_1F: "Dotted Hole", SixIsland_DottedHole_B1F: "Dotted Hole", SixIsland_DottedHole_B2F: "Dotted Hole",
  SixIsland_DottedHole_B3F: "Dotted Hole", SixIsland_DottedHole_B4F: "Dotted Hole", SixIsland_DottedHole_SapphireRoom: "Dotted Hole",
  SixIsland_RuinValley: "Ruin Valley", SixIsland_GreenPath: "Green Path", SixIsland_PatternBush: "Pattern Bush",
  SixIsland_OutcastIsland: "Outcast Island", SixIsland_AlteringCave: "Altering Cave", SixIsland_WaterPath: "Water Path",
  SevenIsland_Harbor: "Seven Island · Harbor", SevenIsland_PokemonCenter_1F: "Seven Island · Pokémon Center",
  SevenIsland_PokemonCenter_2F: "Seven Island · Pokémon Center 2F", SevenIsland_Mart: "Seven Island · Poké Mart",
  SevenIsland_House_Room1: "Seven Island · House", SevenIsland_House_Room2: "Seven Island · House",
  SevenIsland_TrainerTower: "Trainer Tower", TrainerTower_Lobby: "Trainer Tower · Lobby", TrainerTower_Roof: "Trainer Tower · Rooftop",
  TrainerTower_Elevator: "Trainer Tower · Elevator",
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => ["TrainerTower_" + (i + 1) + "F", "Trainer Tower · " + (i + 1) + "F"])),
  SevenIsland_SevaultCanyon_Entrance: "Canyon Entrance", SevenIsland_SevaultCanyon: "Sevault Canyon",
  SevenIsland_SevaultCanyon_House: "Sevault Canyon · Chansey house", SevenIsland_SevaultCanyon_TanobyKey: "Tanoby Key",
  SevenIsland_TanobyRuins: "Tanoby Ruins",
  ...Object.fromEntries(["Monean", "Liptoo", "Weepth", "Dilford", "Scufib", "Rixy", "Viapois"].map((c) => ["SevenIsland_TanobyRuins_" + c + "Chamber", c + " Chamber"])),
  CeruleanCave_1F: "Cerulean Cave · 1F", CeruleanCave_2F: "Cerulean Cave · 2F", CeruleanCave_B1F: "Cerulean Cave · B1F"
};

const MAPS = [
  "PalletTown", "PalletTown_PlayersHouse_1F", "PalletTown_PlayersHouse_2F",
  "PalletTown_RivalsHouse", "PalletTown_ProfessorOaksLab", "Route1",
  "ViridianCity", "ViridianCity_House", "ViridianCity_School", "ViridianCity_Mart",
  "ViridianCity_PokemonCenter_1F", "ViridianCity_PokemonCenter_2F",
  "Route2", "Route2_ViridianForest_SouthEntrance", "ViridianForest", "Route2_ViridianForest_NorthEntrance",
  "Route2_House", "Route2_EastBuilding",
  "Route22", "Route22_NorthEntrance",
  "PewterCity", "PewterCity_Museum_1F", "PewterCity_Museum_2F", "PewterCity_Gym", "PewterCity_Mart",
  "PewterCity_House1", "PewterCity_House2", "PewterCity_PokemonCenter_1F", "PewterCity_PokemonCenter_2F",
  "Route3", "Route4", "Route4_PokemonCenter_1F", "Route4_PokemonCenter_2F", "MtMoon_1F", "MtMoon_B1F", "MtMoon_B2F",
  "CeruleanCity", "CeruleanCity_PokemonCenter_1F", "CeruleanCity_PokemonCenter_2F",
  "CeruleanCity_Gym", "CeruleanCity_Mart", "CeruleanCity_BikeShop", "CeruleanCity_House1", "CeruleanCity_House2",
  "CeruleanCity_House3", "CeruleanCity_House4", "CeruleanCity_House5",
  "Route24", "Route25", "Route25_SeaCottage",
  "Route5", "Route5_PokemonDayCare", "Route5_SouthEntrance", "UndergroundPath_NorthEntrance", "Route9",
  "UndergroundPath_NorthSouthTunnel", "UndergroundPath_SouthEntrance", "Route6", "Route6_NorthEntrance",
  "VermilionCity", "VermilionCity_PokemonCenter_1F", "VermilionCity_PokemonCenter_2F", "VermilionCity_Mart",
  "VermilionCity_Gym", "VermilionCity_House1", "VermilionCity_House2", "VermilionCity_House3",
  "VermilionCity_PokemonFanClub", "SSAnne_Exterior",
  "SSAnne_1F_Corridor", "SSAnne_1F_Room1", "SSAnne_1F_Room2", "SSAnne_1F_Room3", "SSAnne_1F_Room4",
  "SSAnne_1F_Room5", "SSAnne_1F_Room6", "SSAnne_1F_Room7", "SSAnne_2F_Corridor", "SSAnne_2F_Room1",
  "SSAnne_2F_Room2", "SSAnne_2F_Room3", "SSAnne_2F_Room4", "SSAnne_2F_Room5", "SSAnne_2F_Room6",
  "SSAnne_3F_Corridor", "SSAnne_Deck", "SSAnne_CaptainsOffice", "SSAnne_B1F_Corridor", "SSAnne_B1F_Room1",
  "SSAnne_B1F_Room2", "SSAnne_B1F_Room3", "SSAnne_B1F_Room4", "SSAnne_B1F_Room5", "SSAnne_Kitchen",
  "Route11", "Route11_EastEntrance_1F", "Route11_EastEntrance_2F",
  "DiglettsCave_NorthEntrance", "DiglettsCave_B1F", "DiglettsCave_SouthEntrance",
  "Route10", "Route10_PokemonCenter_1F", "Route10_PokemonCenter_2F", "RockTunnel_1F", "RockTunnel_B1F",
  "LavenderTown", "LavenderTown_PokemonCenter_1F", "LavenderTown_PokemonCenter_2F", "LavenderTown_Mart",
  "LavenderTown_House1", "LavenderTown_House2", "LavenderTown_VolunteerPokemonHouse",
  "PokemonTower_1F", "PokemonTower_2F", "PokemonTower_3F", "PokemonTower_4F", "PokemonTower_5F",
  "PokemonTower_6F", "PokemonTower_7F",
  "Route8", "Route8_WestEntrance", "UndergroundPath_EastEntrance", "UndergroundPath_EastWestTunnel",
  "UndergroundPath_WestEntrance", "Route7", "Route7_EastEntrance",
  "CeladonCity", "CeladonCity_PokemonCenter_1F", "CeladonCity_PokemonCenter_2F",
  "CeladonCity_DepartmentStore_1F", "CeladonCity_DepartmentStore_2F", "CeladonCity_DepartmentStore_3F",
  "CeladonCity_DepartmentStore_4F", "CeladonCity_DepartmentStore_5F", "CeladonCity_DepartmentStore_Roof",
  "CeladonCity_DepartmentStore_Elevator",
  "CeladonCity_Condominiums_1F", "CeladonCity_Condominiums_2F", "CeladonCity_Condominiums_3F",
  "CeladonCity_Condominiums_Roof", "CeladonCity_Condominiums_RoofRoom",
  "CeladonCity_GameCorner", "CeladonCity_GameCorner_PrizeRoom", "CeladonCity_Gym",
  "CeladonCity_Restaurant", "CeladonCity_Hotel", "CeladonCity_House1",
  "RocketHideout_B1F", "RocketHideout_B2F", "RocketHideout_B3F", "RocketHideout_B4F", "RocketHideout_Elevator",
  "SaffronCity", "SaffronCity_Connection", "SaffronCity_PokemonCenter_1F", "SaffronCity_PokemonCenter_2F", "SaffronCity_Mart",
  "SaffronCity_CopycatsHouse_1F", "SaffronCity_CopycatsHouse_2F", "SaffronCity_MrPsychicsHouse", "SaffronCity_House",
  "SaffronCity_PokemonTrainerFanClub", "SaffronCity_Dojo", "SaffronCity_Gym",
  "SilphCo_1F", "SilphCo_2F", "SilphCo_3F", "SilphCo_4F", "SilphCo_5F", "SilphCo_6F", "SilphCo_7F",
  "SilphCo_8F", "SilphCo_9F", "SilphCo_10F", "SilphCo_11F", "SilphCo_Elevator",
  "Route12", "Route12_NorthEntrance_1F", "Route12_NorthEntrance_2F", "Route12_FishingHouse",
  "Route13", "Route14", "Route15", "Route15_WestEntrance_1F", "Route15_WestEntrance_2F",
  "FuchsiaCity", "FuchsiaCity_PokemonCenter_1F", "FuchsiaCity_PokemonCenter_2F", "FuchsiaCity_Mart",
  "FuchsiaCity_WardensHouse", "FuchsiaCity_House1", "FuchsiaCity_House2", "FuchsiaCity_House3",
  "FuchsiaCity_SafariZone_Entrance", "FuchsiaCity_SafariZone_Office", "FuchsiaCity_Gym",
  "SafariZone_Center", "SafariZone_Center_RestHouse", "SafariZone_East", "SafariZone_East_RestHouse",
  "SafariZone_North", "SafariZone_North_RestHouse", "SafariZone_West", "SafariZone_West_RestHouse",
  "SafariZone_SecretHouse",
  "Route16", "Route16_NorthEntrance_1F", "Route16_NorthEntrance_2F", "Route16_House",
  "Route17", "Route18", "Route18_EastEntrance_1F", "Route18_EastEntrance_2F",
  "Route19", "Route20", "SeafoamIslands_1F", "SeafoamIslands_B1F", "SeafoamIslands_B2F", "SeafoamIslands_B3F", "SeafoamIslands_B4F",
  "CinnabarIsland", "CinnabarIsland_PokemonCenter_1F", "CinnabarIsland_PokemonCenter_2F", "CinnabarIsland_Mart",
  "CinnabarIsland_Gym", "CinnabarIsland_PokemonLab_Entrance", "CinnabarIsland_PokemonLab_Lounge",
  "CinnabarIsland_PokemonLab_ResearchRoom", "CinnabarIsland_PokemonLab_ExperimentRoom",
  "PokemonMansion_1F", "PokemonMansion_2F", "PokemonMansion_3F", "PokemonMansion_B1F",
  "Route21_North", "Route21_South",
  "PowerPlant", "ViridianCity_Gym", "Route23", "VictoryRoad_1F", "VictoryRoad_2F", "VictoryRoad_3F",
  "IndigoPlateau_Exterior", "IndigoPlateau_PokemonCenter_1F", "IndigoPlateau_PokemonCenter_2F",
  "PokemonLeague_LoreleisRoom", "PokemonLeague_BrunosRoom", "PokemonLeague_AgathasRoom", "PokemonLeague_LancesRoom",
  "PokemonLeague_ChampionsRoom", "PokemonLeague_HallOfFame",
  // The Sevii Islands, part 1: One, Two and Three Island (Seagallop harbors).
  "OneIsland", "OneIsland_Harbor", "OneIsland_House1", "OneIsland_House2", "OneIsland_PokemonCenter_1F",
  "OneIsland_PokemonCenter_2F", "OneIsland_KindleRoad", "OneIsland_KindleRoad_EmberSpa", "OneIsland_TreasureBeach",
  "MtEmber_Exterior", "MtEmber_Summit", "MtEmber_SummitPath_1F", "MtEmber_SummitPath_2F", "MtEmber_SummitPath_3F",
  "MtEmber_RubyPath_1F", "MtEmber_RubyPath_B1F", "MtEmber_RubyPath_B1F_Stairs", "MtEmber_RubyPath_B2F",
  "MtEmber_RubyPath_B2F_Stairs", "MtEmber_RubyPath_B3F", "MtEmber_RubyPath_B4F", "MtEmber_RubyPath_B5F",
  "TwoIsland", "TwoIsland_Harbor", "TwoIsland_House", "TwoIsland_JoyfulGameCorner", "TwoIsland_PokemonCenter_1F",
  "TwoIsland_PokemonCenter_2F", "TwoIsland_CapeBrink", "TwoIsland_CapeBrink_House",
  "ThreeIsland", "ThreeIsland_Port", "ThreeIsland_Harbor", "ThreeIsland_House1", "ThreeIsland_House2", "ThreeIsland_House3",
  "ThreeIsland_House4", "ThreeIsland_House5", "ThreeIsland_Mart", "ThreeIsland_PokemonCenter_1F", "ThreeIsland_PokemonCenter_2F",
  "ThreeIsland_BondBridge", "ThreeIsland_BerryForest", "ThreeIsland_DunsparceTunnel",
  // The Sevii Islands, part 2: Four and Five Island.
  "FourIsland", "FourIsland_Harbor", "FourIsland_House1", "FourIsland_House2", "FourIsland_Mart", "FourIsland_PokemonCenter_1F",
  "FourIsland_PokemonCenter_2F", "FourIsland_PokemonDayCare", "FourIsland_LoreleisHouse", "FourIsland_IcefallCave_Entrance",
  "FourIsland_IcefallCave_1F", "FourIsland_IcefallCave_B1F", "FourIsland_IcefallCave_Back",
  "FiveIsland", "FiveIsland_Harbor", "FiveIsland_House1", "FiveIsland_House2", "FiveIsland_PokemonCenter_1F", "FiveIsland_PokemonCenter_2F",
  "FiveIsland_Meadow", "FiveIsland_RocketWarehouse", "FiveIsland_MemorialPillar", "FiveIsland_WaterLabyrinth", "FiveIsland_ResortGorgeous",
  "FiveIsland_ResortGorgeous_House", "FiveIsland_LostCave_Entrance"
].concat(Array.from({ length: 14 }, (_, i) => "FiveIsland_LostCave_Room" + (i + 1)), [
  // The Sevii Islands, part 3: Six and Seven Island.
  "SixIsland", "SixIsland_Harbor", "SixIsland_House", "SixIsland_Mart", "SixIsland_PokemonCenter_1F", "SixIsland_PokemonCenter_2F",
  "SixIsland_WaterPath", "SixIsland_WaterPath_House1", "SixIsland_WaterPath_House2", "SixIsland_RuinValley", "SixIsland_DottedHole_1F",
  "SixIsland_DottedHole_B1F", "SixIsland_DottedHole_B2F", "SixIsland_DottedHole_B3F", "SixIsland_DottedHole_B4F",
  "SixIsland_DottedHole_SapphireRoom", "SixIsland_GreenPath", "SixIsland_PatternBush", "SixIsland_OutcastIsland", "SixIsland_AlteringCave",
  "SevenIsland", "SevenIsland_Harbor", "SevenIsland_House_Room1", "SevenIsland_House_Room2", "SevenIsland_Mart",
  "SevenIsland_PokemonCenter_1F", "SevenIsland_PokemonCenter_2F", "SevenIsland_TrainerTower", "TrainerTower_Lobby",
  "TrainerTower_1F", "TrainerTower_2F", "TrainerTower_3F", "TrainerTower_4F", "TrainerTower_5F", "TrainerTower_6F", "TrainerTower_7F",
  "TrainerTower_8F", "TrainerTower_Roof", "TrainerTower_Elevator", "SevenIsland_SevaultCanyon_Entrance", "SevenIsland_SevaultCanyon",
  "SevenIsland_SevaultCanyon_House", "SevenIsland_SevaultCanyon_TanobyKey", "SevenIsland_TanobyRuins",
  "SevenIsland_TanobyRuins_MoneanChamber", "SevenIsland_TanobyRuins_LiptooChamber", "SevenIsland_TanobyRuins_WeepthChamber",
  "SevenIsland_TanobyRuins_DilfordChamber", "SevenIsland_TanobyRuins_ScufibChamber", "SevenIsland_TanobyRuins_RixyChamber",
  "SevenIsland_TanobyRuins_ViapoisChamber",
  // Cerulean Cave, open once the islands' story is done.
  "CeruleanCave_1F", "CeruleanCave_2F", "CeruleanCave_B1F"
  // (Not FireRed's Mystery Gift islands, Navel Rock and Birth Island: left
  // out on purpose, with Johto and Hoenn to come.)
]);
// People whose look is set by a map script (OBJ_EVENT_GFX_VAR_*), and a second
// look the game can switch to, e.g. the old man lying across Viridian's road.
// (Fuchsia's fossil Pokémon statue is a Kabuto, or an Omanyte once you've
// taken the Dome Fossil: FuchsiaCity_OnTransition.)
const VAR_GFX = { ViridianCity: { OBJ_EVENT_GFX_VAR_0: "OBJ_EVENT_GFX_OLD_MAN_1" }, FuchsiaCity: { OBJ_EVENT_GFX_VAR_0: "OBJ_EVENT_GFX_KABUTO" },
  // (Trainer Tower's trainers look like whoever the floor has: ui/game.js
  // picks their look; the e-Reader trainer upstairs in Seven Island's house
  // never visits here.)
  SevenIsland_House_Room2: { OBJ_EVENT_GFX_VAR_0: "OBJ_EVENT_GFX_YOUNGSTER" } };
for (let n = 1; n <= 8; n++) VAR_GFX["TrainerTower_" + n + "F"] = Object.fromEntries([0, 1, 2, 3].map((k) => ["OBJ_EVENT_GFX_VAR_" + k, "OBJ_EVENT_GFX_YOUNGSTER"]));
const ALT_GFX = {
  ViridianCity_EventScript_TutorialOldMan: "OBJ_EVENT_GFX_OLD_MAN_LYING_DOWN",
  // Leaf stands in for Gary in Oak's lab at the start (the same lab object is
  // Gary again later, when Oak hands out the Pokédexes).
  PalletTown_ProfessorOaksLab_EventScript_Rival: "OBJ_EVENT_GFX_GREEN_NORMAL",
  // (By map and look, for people with no script of their own.)
  "FuchsiaCity:OBJ_EVENT_GFX_VAR_0": "OBJ_EVENT_GFX_OMANYTE"
};
// Looks for people the game's own scenes put on a map (WORLD_SPRITES), e.g.
// Red at the edge of Viridian Forest, Leaf outside Pewter Gym, Jessie and James (as Rocket Grunts) in
// Mt. Moon, or the Tradeback Guy upstairs in every Pokémon Center.
const EXTRA_GFX = { red: "OBJ_EVENT_GFX_RED_NORMAL", leaf: "OBJ_EVENT_GFX_GREEN_NORMAL", jessie: "OBJ_EVENT_GFX_ROCKET_F",
  james: "OBJ_EVENT_GFX_ROCKET_M", tradeback: "OBJ_EVENT_GFX_COOLTRAINER_M" };
// (And every look Trainer Tower's trainers can have, by OBJ_EVENT_GFX_* name:
// src/trainer_tower.c's sSingleBattleTrainerInfo and sDoubleBattleTrainerInfo.)
const TRAINER_TOWER_C = path.join(process.argv[2] || process.env.POKEFIRERED || "", "src/trainer_tower.c");
if (fs.existsSync(TRAINER_TOWER_C)) {
  const src = fs.readFileSync(TRAINER_TOWER_C, "utf8");
  for (const [g] of src.slice(src.indexOf("sSingleBattleTrainerInfo[]"), src.indexOf("sTrainerEncounterMusicLUT")).matchAll(/OBJ_EVENT_GFX_\w+/g)) EXTRA_GFX[g] = g;
}
// Signs that read differently here: the house FireRed gives the player is Red's.
const SIGN_TEXT = { PalletTown_EventScript_PlayersHouseSign: ["Red's house"] };
// Wild Pokémon changed from FireRed's: all 12 grass slots (they keep FireRed's
// weights, 20 20 10 10 10 10 5 5 4 4 1 1 percent), as [species, min, max, alt].
const WILD_SLOTS = {
  // Rattata 40%, Mankey 40%, Spearow 20%.
  Route22: [["Rattata", 2, 5], ["Rattata", 2, 5], ["Mankey", 2, 5], ["Mankey", 2, 5], ["Mankey", 2, 5], ["Mankey", 2, 5],
    ["Spearow", 3, 5], ["Spearow", 3, 5], ["Spearow", 3, 5], ["Spearow", 3, 5], ["Spearow", 3, 5], ["Spearow", 3, 5]],
  // Caterpie 30%, Weedle 30%, Metapod (FireRed) / Kakuna (LeafGreen) 12.5% each,
  // Pikachu 10%, Bulbasaur 5%.
  ViridianForest: [["Caterpie", 3, 5], ["Weedle", 3, 5], ["Caterpie", 3, 5], ["Weedle", 3, 5],
    ["Metapod", 4, 6, "Kakuna"], ["Metapod", 4, 6, "Kakuna"], ["Metapod", 4, 6, "Kakuna"], ["Pikachu", 3, 5],
    ["Pikachu", 3, 5], ["Bulbasaur", 5, 5], ["Pikachu", 3, 5], ["Bulbasaur", 5, 5]]
};
// Single slots changed from FireRed's (both versions'), by slot number: the
// starters out in the wild, 5% each (slots 9 and 11, 4% and 1%, as the
// Bulbasaur in Viridian Forest; Squirtle in Kakuna / Metapod's 8 and 10).
// Charmander takes two of Jigglypuff's slots on Route 3, and Jigglypuff one of
// Spearow's (slot 6, 5%: Spearow 30%, Jigglypuff still 10%); Squirtle takes
// the Kakuna and Metapod on Route 24, at those slots' levels.
const WILD_SLOT_CHANGES = {
  Route3: { 6: ["Jigglypuff", 5, 5], 9: ["Charmander", 5, 5], 11: ["Charmander", 7, 7] },
  Route24: { 8: ["Squirtle", 8, 8], 10: ["Squirtle", 8, 8] },
  // Magnemite on Route 10, as in Red and Blue (two of Voltorb's slots: 10% and 5%).
  Route10: { 5: ["Magnemite", 14, 14], 7: ["Magnemite", 17, 17] }
};
// Metatiles a map's scripts swap in while you're there (FireRed's setmetatile):
// name -> [[x, y, metatile, impassable]]. Each is drawn as its own picture,
// <Map>-patch-<name>.png (and -top), and listed in WORLD_MAPS[..].patches with
// the collision it gives; ui/game.js says which are on.
// Vermilion Gym's electric beams across the way to Lt. Surge: half off after
// the first switch, off after both (VermilionCity_Gym_EventScript_SetOneBeamOff,
// _SetBeamsOff, labels in include/constants/metatile_labels.h).
// Floors FireRed's maps don't number, which this game does (the area name
// popup: "Rock Tunnel B1F").
const FLOOR_NUMBERS = { RockTunnel_1F: 1, RockTunnel_B1F: -1 };

const MAP_PATCHES = {
  VermilionCity_Gym: {
    half: [[3, 6, 0x2BB, 1], [4, 6, 0x2BC, 1], [5, 6, 0x2BD, 1], [6, 6, 0x2BE, 1], [7, 6, 0x2BF, 1],
      [3, 7, 0x2C3, 1], [4, 7, 0x2C4, 1], [5, 7, 0x2C5, 1], [6, 7, 0x2C6, 1], [7, 7, 0x2C7, 1]],
    off: [[3, 6, 0x293, 1], [4, 6, 0x294, 0], [5, 6, 0x281, 0], [6, 6, 0x295, 0], [7, 6, 0x296, 1],
      [3, 7, 0x29B, 1], [4, 7, 0x29C, 0], [5, 7, 0x281, 0], [6, 7, 0x29D, 0], [7, 7, 0x29E, 1]]
  },
  // The Game Corner's stairs down to the Rocket Hideout, behind the poster:
  // floor and wall until you press the switch (CeladonCity_GameCorner_EventScript_HideRocketHideout).
  CeladonCity_GameCorner: {
    hidden: [[15, 2, 0x292, 0], [16, 2, 0x292, 0], [17, 2, 0x292, 0], [16, 3, 0x2CF, 1], [17, 3, 0x2CF, 1]]
  },
  // The Rocket Hideout's barriers (RocketHideout_B1F/B4F_EventScript_SetBarrier),
  // up until the Rockets guarding them are beaten.
  RocketHideout_B1F: {
    barrier: [[20, 19, 0x2CE, 1], [21, 19, 0x2CF, 1], [20, 20, 0x2D6, 1], [21, 20, 0x2D7, 1], [20, 21, 0x282, 0], [21, 21, 0x282, 0]]
  },
  RocketHideout_B4F: {
    barrier: [[17, 12, 0x2CE, 1], [18, 12, 0x2CF, 1], [17, 13, 0x2D6, 1], [18, 13, 0x2D7, 1], [17, 14, 0x282, 0], [18, 14, 0x282, 0]]
  }
};
function renderPatches(name, blocks, w, primary, secondary) {
  const out = {};
  for (const [pname, cells] of Object.entries(MAP_PATCHES[name] || {})) {
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), pw = Math.max(...xs) - x0 + 1, ph = Math.max(...ys) - y0 + 1;
    const sub = [];
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) sub.push(blocks[(y0 + y) * w + x0 + x]);
    for (const [x, y, mt] of cells) sub[(y - y0) * pw + x - x0] = mt;
    const r = renderBlocks(sub, pw, ph, primary, secondary, false);
    writePng(path.join(outMaps, name + "-patch-" + pname + ".png"), pw * 16, ph * 16, r.below);
    if (r.anyAbove) writePng(path.join(outMaps, name + "-patch-" + pname + "-top.png"), pw * 16, ph * 16, r.above);
    // Its animated cells (water), as the map's (<Map>-patch-<name>-anim.png).
    const anim = animCells(sub, pw, ph, primary, secondary), animFile = path.join(outMaps, name + "-patch-" + pname + "-anim.png");
    if (anim.pics.length) writeAnimSheet(animFile, anim.pics);
    else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // (Each cell's collision and behaviour: a staircase swapped for floor no longer warps.)
    out[pname] = { x: x0, y: y0, w: pw, h: ph, top: r.anyAbove || undefined,
      anim: anim.cells.length ? { cells: anim.cells, anims: primary.anims.map((a) => a.name) } : undefined,
      collision: cells.map(([x, y, mt, c]) => [x, y, c, metatile(primary, secondary, mt).behavior]) };
  }
  return Object.keys(out).length ? out : undefined;
}

// Scripts whose text is picked by code the converter can't follow.
const SCRIPT_TEXT = {
  ViridianCity_School_EventScript_PokemonJournal: "PokemonJournal_Text_SpecialFeatureBrock",
  EventScript_CutTree: "Text_TreeCanBeCutDown"
};
// Shared text the game uses for story scenes, besides each built map's own text.
const GAME_TEXT = [
  "Text_WelcomeWantToHealPkmn", "Text_TakeYourPkmnForFewSeconds", "Text_RestoredPkmnToFullHealth",
  "Text_WeHopeToSeeYouAgain", "Text_MayIHelpYou", "Text_PleaseComeAgain", "Text_WirelessClubUndergoingAdjustments",
  "Trade_Text_LookingForMonWannaTradeForMon", "Trade_Text_AwwOhWell", "Trade_Text_WhatThatsNoMon",
  "Trade_Text_HeyThanks", "Trade_Text_IsntMyOldMonGreat",
  "Trade_Text_DoYouHaveMonWouldYouTradeForMon", "Trade_Text_WellIfYouDontWantTo", "Trade_Text_ThisIsntMon",
  "Trade_Text_Thanks", "Trade_Text_HasTradedMonGrownStronger",
  "Trade_Text_DoYouHaveMonWantToTradeForMon", "Trade_Text_ThatsTooBad", "Trade_Text_ThisIsNoMon",
  "Trade_Text_ThanksYoureAPal", "Trade_Text_HowIsMyOldMon", "Text_CutTreeDown", "Text_TreeCanBeCutDown",
  "Aide_Text_HaventCaughtEnoughMonsForItem", "Aide_Text_GetEnoughMonsComeBackForItem",
  // Prof. Oak's Pokédex rating (data/text/pokedex_rating.inc): Kanto's, then the National Pokédex's.
  "PokedexRating_Text_SeenXOwnedY", "PokedexRating_Text_Complete", "PokedexRating_Text_NationalDexSeenXOwnedY",
  "PokedexRating_Text_LookForwardToFilledNationalDex", "PokedexRating_Text_YouveCompletedDex",
  ...Array.from({ length: 15 }, (_, i) => "PokedexRating_Text_LessThan" + (i + 1) * 10),
  "Text_OnlySkilledTrainersAllowedThrough", "Text_CantLetYouPass", "Text_OhThatsBadgeGoRightAhead", "Text_MoveCanOnlyBeLearnedOnce",
  // Route 23's badge guards (data/text/route23.inc).
  "Text_OnlyPassWithBadgeDontHaveYet", "Text_OnlyPassWithBadgeOhGoAhead",
  "Text_WantWhichFloor", "Text_GiveNicknameToThisMon", "Text_PlayerObtainedTheMon", "Text_NoMoreRoomForPokemon",
  // Waking up after blacking out (data/text/white_out.inc).
  "Text_FirstShouldRestoreMonsHealth", "Text_MonsHealedShouldBuyPotions", "Text_MonsHealed",
  "Text_HadQuiteAnExperienceTakeRest", "Text_MomExplainHPGetPotions",
  // The Safari Zone's PA and the RETIRE prompt (data/text/safari_zone.inc).
  "SafariZone_Text_WouldYouLikeToExit", "SafariZone_Text_TimesUp", "SafariZone_Text_OutOfBalls",
  "SafariZone_Text_ExcuseMeYourPCBoxIsFull",
  // Silph Co.'s card-key doors (data/event_scripts.s).
  "Text_CardKeyOpenedDoor", "Text_ItNeedsCardKey", "Text_TheDoorIsOpen",
  // The legendary birds (Articuno in Seafoam Islands: data/event_scripts.s).
  "Text_Gyaoo", "Text_MonFlewAway",
  // The Seagallop ferries (data/text/seagallop.inc).
  "Text_AllAboardSeagallopNum",
  // The Joyful Game Corner's minigames, played over the wireless link (data/scripts/cable_club.inc).
  "Text_WelcomeCanYouWait", "Text_AdapterNotConnectedMinigame",
  // Four Island's Day-Care (data/text/day_care.inc).
  "DayCare_Text_ImDaycareManSpeakToMyWife", "DayCare_Text_YourMonIsDoingFine", "DayCare_Text_YourMonsAreDoingFine",
  "DayCare_Text_WouldYouLikeUsToRaiseMon", "DayCare_Text_WhichMonShouldWeRaise", "DayCare_Text_WellRaiseYourMon",
  "DayCare_Text_WeCanRaiseOneMore", "DayCare_Text_FineThenComeAgain", "DayCare_Text_NotEnoughMoney", "DayCare_Text_TakeOtherOneBackToo",
  "DayCare_Text_ComeAgain", "DayCare_Text_GoodToSeeYou", "DayCare_Text_YourMonHasGrownXLevels", "DayCare_Text_YourPartyIsFull",
  "DayCare_Text_ItWillCostX", "DayCare_Text_HeresYourMon", "DayCare_Text_TookBackMon", "DayCare_Text_YouHaveJustOneMon",
  "DayCare_Text_TakeYourMonBack", "DayCare_Text_WhatWillYouBattleWith",
  // Four Island's sticker man (data/text/trainer_card.inc).
  "FourIsland_House2_Text_WishICouldShowOffStickers", "FourIsland_House2_Text_GiveYouStickerIfYouBrag",
  "FourIsland_House2_Text_BragAboutWhatToday", "FourIsland_House2_Text_BragAboutSomethingForMe",
  "FourIsland_House2_Text_WowHoFLowest", "FourIsland_House2_Text_WowHoFLow", "FourIsland_House2_Text_WowHoFHigh",
  "FourIsland_House2_Text_WowHoFHighest", "FourIsland_House2_Text_ComeBackWithBetterStoryHoF", "FourIsland_House2_Text_LivingLegendHoF",
  "FourIsland_House2_Text_HoFStickerApplied",
  // The Pokémon Journals and the Fame Checker's islanders (data/text/fame_checker.inc).
  "PokemonJournal_Text_SpecialFeatureDaisyOak", "PokemonJournal_Text_SpecialFeatureBlaine", "PokemonJournal_Text_SpecialFeatureLorelei",
  // Rock Tunnel's Rock Slide tutor (in Seafoam Islands B4F's text.inc).
  "Text_RockSlideTeach", "Text_RockSlideDeclined", "Text_RockSlideWhichMon", "Text_RockSlideTaught",
  // Pallet Town's Sign Lady (data/text/sign_lady.inc).
  "PalletTown_Text_OhLookLook", "PalletTown_Text_ReadItReadIt", "PalletTown_Text_SignsAreUsefulArentThey",
  "PalletTown_Text_LookCopiedTrainerTipsSign", "PalletTown_Text_PressStartToOpenMenuCopy"
];
// The player character's overworld sheets (assets/sprites/overworld/<prefix>_normal.png,
// <prefix>_surf_run.png, _bike.png and _surf.png), by look: player_<look>.png,
// player_<look>_run.png, _bike.png and _surf.png.
const PLAYER_SPRITES = { custom: "player_character" };

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
vm.runInThisContext(fs.readFileSync(path.join(root, "data/moves.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/items.js"), "utf8"));

// ---------- Tilesets ----------

const NUM_PRIMARY_TILES = 640, NUM_PRIMARY_METATILES = 640, NUM_PRIMARY_PALS = 7;


function tilesetDir(symbol) {
  const snake = { gTileset_SSAnne: "ss_anne" }[symbol] ||
    symbol.replace(/^gTileset_/, "").replace(/([a-z])([A-Z0-9])/g, "$1_$2").replace(/([0-9])([A-Z])/g, "$1_$2").toLowerCase();
  for (const kind of ["primary", "secondary"]) {
    const dir = path.join(root, "assets/tilesets", kind, snake);
    if (fs.existsSync(dir)) return dir;
  }
  throw new Error("No tileset folder for " + symbol + " (looked for " + snake + ")");
}

// Tilesets drawn with another's tiles and palettes (src/data/tilesets/headers.h:
// gTileset_SilphCo uses gTilesetTiles_Condominiums), by folder.
const SHARED_GRAPHICS = { silph_co: "condominiums" };
function loadTileset(symbol) {
  const dir = tilesetDir(symbol);
  const gfx = SHARED_GRAPHICS[path.basename(dir)] ? path.join(path.dirname(dir), SHARED_GRAPHICS[path.basename(dir)]) : dir;
  const meta = fs.readFileSync(path.join(dir, "metatiles.bin"));
  const attrs = fs.readFileSync(path.join(dir, "metatile_attributes.bin"));
  const palettes = [];
  for (let i = 0; i < 16; i++) {
    const f = path.join(gfx, "palettes", String(i).padStart(2, "0") + ".pal");
    palettes.push(fs.existsSync(f) ? readPal(f) : null);
  }
  const anims = (TILE_ANIMS[path.basename(dir)] || []).map((a) => Object.assign({}, a, {
    frames: Array.from({ length: a.frames }, (_, k) => readPng(path.join(dir, "anim", a.dir, k + ".png")))
  }));
  return { tiles: readPng(path.join(gfx, "tiles.png")), meta, attrs, palettes, anims };
}

// FireRed's tile animations (src/tileset_anims.c) on the General tileset:
// frames of anim/<dir>/<k>.png copied over tiles first.. (VRAM tile numbers),
// as ui/overworld.js times them.
const TILE_ANIMS = {
  general: [
    { name: "water", dir: "water_current_landwatersedge", first: 416, count: 48, frames: 8 },
    { name: "sand", dir: "sandwatersedge", first: 464, count: 18, frames: 8 },
    { name: "flower", dir: "flower", first: 508, count: 4, frames: 5 }
  ]
};
// The animation (index into the primary tileset's anims) a tile entry belongs to, or -1.
function tileAnim(entry, primary) {
  const idx = entry & 0x3ff;
  return idx < NUM_PRIMARY_TILES ? primary.anims.findIndex((a) => idx >= a.first && idx < a.first + a.count) : -1;
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

// Draws one 8x8 tile into an RGBA image. `frames`: an animated tile's frame
// per primary anim (else the tileset's own tile).
function drawTile(img, imgW, x0, y0, entry, primary, secondary, opaqueBackground, frames) {
  const idx = entry & 0x3ff, hflip = entry & 0x400, vflip = entry & 0x800, pal = entry >> 12;
  let sheet = (idx < NUM_PRIMARY_TILES ? primary : secondary).tiles;
  let t = idx < NUM_PRIMARY_TILES ? idx : idx - NUM_PRIMARY_TILES;
  const a = frames ? tileAnim(entry, primary) : -1;
  if (a >= 0) { sheet = primary.anims[a].frames[frames[a]]; t = idx - primary.anims[a].first; }
  const palette = (pal < NUM_PRIMARY_PALS ? primary : secondary).palettes[pal] || primary.palettes[0];
  const perRow = sheet.width / 8;
  const tx = (t % perRow) * 8, ty = Math.floor(t / perRow) * 8;
  if (ty >= sheet.height) return;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sx = tx + (hflip ? 7 - x : x), sy = ty + (vflip ? 7 - y : y);
      const c = sheet.px[sy * sheet.width + sx] & 15;
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

// The animated 8x8 cells of the part under sprites: each cell whose tiles
// (a metatile's bottom ones, and its top ones when they're drawn under
// sprites too) include animated ones, drawn in every combination of its anims'
// frames. -> { cells: [x, y, first, mask, ...] (x, y in 8x8 tiles; first:
// its first picture; mask: which anims, bit n = anim n), pics: the pictures }
function animCells(blocks, w, h, primary, secondary) {
  const cells = [], pics = [];
  if (!primary.anims.length) return { cells, pics };
  for (let by = 0; by < h; by++) for (let bx = 0; bx < w; bx++) {
    const mt = metatile(primary, secondary, blocks[by * w + bx] & 0x3ff);
    for (let q = 0; q < 4; q++) {
      const entries = [mt.tiles[q]].concat(mt.layer === 1 ? [mt.tiles[4 + q]] : []);
      const used = [...new Set(entries.map((e) => tileAnim(e, primary)).filter((a) => a >= 0))].sort();
      if (!used.length) continue;
      const mask = used.reduce((m, a) => m | (1 << a), 0);
      cells.push(bx * 2 + (q & 1), by * 2 + (q >> 1), pics.length, mask);
      // Every combination, the first anim's frame changing fastest.
      const combos = used.reduce((n, a) => n * primary.anims[a].frames.length, 1);
      for (let c = 0; c < combos; c++) {
        const frames = primary.anims.map(() => 0);
        let rest = c;
        for (const a of used) { const n = primary.anims[a].frames.length; frames[a] = rest % n; rest = Math.floor(rest / n); }
        const pic = new Uint8ClampedArray(8 * 8 * 4);
        entries.forEach((e, i) => drawTile(pic, 8, 0, 0, e, primary, secondary, i === 0, frames));
        pics.push(pic);
      }
    }
  }
  return { cells, pics };
}
function writeAnimSheet(file, pics) {
  const perRow = 64, rows = Math.ceil(pics.length / perRow), W = perRow * 8, rgba = new Uint8ClampedArray(W * rows * 8 * 4);
  pics.forEach((pic, i) => {
    const x0 = (i % perRow) * 8, y0 = Math.floor(i / perRow) * 8;
    for (let y = 0; y < 8; y++) rgba.set(pic.subarray(y * 32, y * 32 + 32), ((y0 + y) * W + x0) * 4);
  });
  writePng(file, W, rows * 8, rgba);
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
// FireRed keeps some lines in another map's text.inc: the Rock Slide tutor in
// Rock Tunnel speaks text from Seafoam Islands B4F's, Lil & Ian on Route 21
// North from Route 21 South's. pret's labels are unique across the project, so
// every map can also use any (checked out) map's text, its own first.
const otherMapText = {};
for (const m of fs.existsSync(P("data/maps")) ? fs.readdirSync(P("data/maps")) : []) {
  const file = P("data/maps", m, "text.inc");
  if (fs.existsSync(file)) parseTextFile(file, otherMapText);
}
for (const k of Object.keys(otherMapText)) otherMapText[k] = cleanText(otherMapText[k]);

const textCache = {};
function texts(mapName) {
  if (textCache[mapName]) return textCache[mapName];
  const out = Object.assign({}, sharedText);
  const file = P("data/maps", mapName, "text.inc");
  if (fs.existsSync(file)) parseTextFile(file, out);
  for (const k of Object.keys(out)) out[k] = cleanText(out[k]);
  return (textCache[mapName] = Object.assign({}, otherMapText, out));
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

// What a Poké Mart clerk sells (["poke-ball", "potion", ...]), from the
// script's "pokemart <label>" and that label's ".2byte ITEM_..." list.
function martItems(mapName, script) {
  const scripts = scriptLabels(mapName);
  const lines = scripts[script] || [];
  for (const line of lines) {
    const m = /^pokemart\s+(\w+)/.exec(line);
    if (!m || !scripts[m[1]]) continue;
    const items = [];
    for (const l of scripts[m[1]]) {
      const it = /^\.2byte\s+ITEM_(\w+)/.exec(l);
      if (!it || it[1] === "NONE") continue;
      // (This game's names and machine numbers; Mail, which it hasn't got, is left out.)
      const id = itemId("ITEM_" + it[1]);
      if (window.ITEMS[id]) items.push(id);
    }
    return items;
  }
  return undefined;
}

// FireRed's TMs and HMs are numbered differently from this game's (X and Y's,
// plus the HMs in game/bag.js): a FireRed TM09 is Bullet Seed, here TM09 is
// Venoshock. So a FireRed machine becomes this game's machine for the same move
// (FireRed's sTMHMMoves, src/data/party_menu.h), or keeps its number when no
// machine here teaches that move.
let frMachineMoves = null;
// FireRed's item names this game's items go by differently.
const ITEM_ALIASES = { "x-defend": "x-defense", "x-special": "x-sp-atk", "parlyz-heal": "paralyze-heal" };
function itemId(frItem) {
  const raw = frItem.replace(/^ITEM_/, "").toLowerCase().replace(/_/g, "-");
  const id = ITEM_ALIASES[raw] || raw;
  const m = /^(tm|hm)(\d+)$/.exec(id);
  if (!m) return id;
  if (!frMachineMoves) {
    const src = readHeader("src/data/party_menu.h");
    frMachineMoves = [.../sTMHMMoves\[\]\s*=\s*\{([^}]*)\}/.exec(src)[1].matchAll(/MOVE_(\w+)/g)].map((x) => x[1]);
  }
  const move = frMachineMoves[(m[1] === "hm" ? 50 : 0) + +m[2] - 1];
  const ours = Object.keys(window.ITEMS).find((k) => /^(tm|hm)\d+$/.test(k) &&
    toID((/^Teaches (.+?) to a compatible/.exec(window.ITEMS[k].effect) || [])[1] || "") === toID(move));
  // A FireRed TM whose move this game has no machine for: add one at the end of
  // the list in data/items.js (as TM103 Giga Drain ... TM107 Snatch were), then
  // run tools/build-machine-learners.js and tools/build-item-sprites.js.
  if (!ours) throw new Error("FireRed's " + id.toUpperCase() + " (" + move + ") has no machine in this game: add it to the end of the TM list in data/items.js");
  return ours;
}

// The item an item ball holds ("potion"), from its finditem line.
function itemBall(mapName, script) {
  const lines = scriptLabels(mapName)[script] || [];
  for (const line of lines) {
    const m = /^finditem\s+(ITEM_\w+)/.exec(line);
    if (m) return itemId(m[1]);
  }
  return undefined;
}

// A trainer's script: "trainerbattle_single TRAINER_X, Intro, Defeat" and the
// message after ("msgbox PostBattle"), as { id, intro, defeat, after } text.
// A double battle ("trainerbattle_double TRAINER_X, Intro, Defeat,
// NotEnoughMons", like Route 8's twins Eli & Anne) adds double: true and
// notEnough, what they say when you haven't two Pokémon that can fight.
function trainerScript(mapName, script) {
  const lines = scriptLabels(mapName)[script] || [], t = texts(mapName);
  for (let i = 0; i < lines.length; i++) {
    const m = /^trainerbattle_(single|double)\s+(TRAINER_\w+),\s*(\w+),\s*(\w+)(?:,\s*(\w+))?/.exec(lines[i]);
    if (!m) continue;
    const after = lines.slice(i + 1).map((l) => /^msgbox\s+(\w+)/.exec(l)).find(Boolean);
    usedTrainers.add(m[2]);
    const out = { id: m[2], intro: t[m[3]], defeat: t[m[4]], after: after ? t[after[1]] : null };
    if (m[1] === "double") Object.assign(out, { double: true, notEnough: m[5] ? t[m[5]] : null });
    return out;
  }
  return undefined;
}

// ---------- Trainers ----------

const usedTrainers = new Set();
const constName = (s) => s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
// { TRAINER_X: { className, name, pic, party: [{ species, level, iv, item, moves }] } }
function buildTrainers(ids) {
  const trainers = readHeader("src/data/trainers.h"), parties = readHeader("src/data/trainer_parties.h");
  const classNames = readHeader("src/data/text/trainer_class_names.h");
  const moveByID = {};
  for (const k of Object.keys(window.MOVES)) moveByID[toID(k)] = k;
  const out = {};
  for (const id of ids) {
    const block = new RegExp("\\[" + id + "\\] = \\{([\\s\\S]*?)\\n    \\},").exec(trainers)[1];
    const cls = /\.trainerClass = (\w+)/.exec(block)[1];
    // ("{PKMN} RANGER": Pokémon Ranger.)
    const className = constName(new RegExp("\\[" + cls + "\\]\\s*= _\\(\"(.*?)\"\\)").exec(classNames)[1]).replace(/Poke/g, "Poké").replace(/\{Pkmn\}/g, "Pokémon");
    const pic = /\.trainerPic = TRAINER_PIC_(\w+)/.exec(block)[1].toLowerCase();
    const partyName = /\.party = \w+\((\w+)\)/.exec(block)[1];
    const list = new RegExp(partyName + "\\[\\] = \\{([\\s\\S]*?)\\n\\};").exec(parties)[1];
    const party = [...list.matchAll(/\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g)].map(([, mon]) => {
      const species = dexByID[toID(/\.species = SPECIES_(\w+)/.exec(mon)[1])];
      const moves = /\.moves = \{([^}]*)\}/.exec(mon);
      const item = /\.heldItem = ITEM_(\w+)/.exec(mon);
      return {
        species, level: +/\.lvl = (\d+)/.exec(mon)[1], iv: +/\.iv = (\d+)/.exec(mon)[1],
        item: item && item[1] !== "NONE" ? item[1].toLowerCase().replace(/_/g, "-") : undefined,
        moves: moves ? moves[1].split(",").map((x) => x.trim().replace(/^MOVE_/, "")).filter((x) => x && x !== "NONE")
          .map((x) => moveByID[toID(x)]) : undefined
      };
    });
    // The music when they spot you (FireRed's PlayTrainerEncounterMusic).
    const enc = (/\.encounterMusic_gender = (?:F_TRAINER_FEMALE \| )?TRAINER_ENCOUNTER_MUSIC_(\w+)/.exec(block) || [])[1];
    const music = ["FEMALE", "GIRL", "TWINS"].includes(enc) ? "mus_encounter_girl"
      : ["AQUA", "MAGMA", "SUSPICIOUS"].includes(enc) ? "mus_encounter_rocket" : "mus_encounter_boy";
    out[id] = { className, name: constName(/\.trainerName = _\("(.*?)"\)/.exec(block)[1]), pic: trainerPic(pic), party, music };
  }
  return out;
}

// A trainer's front picture in assets/sprites/trainers/front/<pic>.png,
// converted from graphics/trainers if it isn't there yet.
// (Pictures whose files FireRed names differently from their TRAINER_PIC_*.)
const PIC_FILES = { cooltrainer_f: "cool_trainer_f", cooltrainer_m: "cool_trainer_m" };
function trainerPic(pic) {
  const file = path.join(root, "assets/sprites/trainers/front", pic + ".png");
  if (!fs.existsSync(file)) {
    const name = PIC_FILES[pic] || pic;
    const src = P("graphics/trainers/front_pics", name + "_front_pic.png");
    if (!fs.existsSync(src)) throw new Error("No front picture for " + pic + " (check out graphics/trainers/)");
    const png = readPng(src);
    const pal = P("graphics/trainers/palettes", name + ".pal");
    if (fs.existsSync(pal)) png.palette = readPal(pal);
    writeSprite(png, file);
  }
  return pic;
}

// Two trainers in one picture (a double team like Jessie & James), side by
// side and overlapping a little, the left one in front: <name>.png.
function duoPic(name, left, right, overlap) {
  const [a, b] = [trainerPic(left), trainerPic(right)].map((p) => readPng(path.join(root, "assets/sprites/trainers/front", p + ".png")));
  const width = a.width + b.width - overlap, height = Math.max(a.height, b.height);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (const [png, dx] of [[b, a.width - overlap], [a, 0]]) {
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4, o = ((y + height - png.height) * width + x + dx) * 4;
      if (png.rgba[i + 3]) rgba.set(png.rgba.subarray(i, i + 4), o);
    }
  }
  writePng(path.join(root, "assets/sprites/trainers/front", name + ".png"), width, height, rgba);
  return name;
}

// ---------- People sprites ----------

function readHeader(rel) { return fs.readFileSync(P(rel), "utf8"); }

// Patches from FireRed's setmetatile lists: each label's setmetatile lines
// (until its return) become a patch of `map` named by `name(label)` (or skipped
// when it gives nothing).
const metatileLabels = {};
for (const [, mname, val] of readHeader("include/constants/metatile_labels.h").matchAll(/#define\s+(METATILE_\w+)\s+(0x[0-9A-Fa-f]+)/g)) metatileLabels[mname] = parseInt(val, 16);
function scriptPatches(file, which) {
  let patch = null;
  for (const line of fs.readFileSync(P(file), "utf8").split("\n")) {
    const l = /^(\w+)::/.exec(line);
    if (l) {
      const w = which(l[1]);
      patch = w ? ((MAP_PATCHES[w[0]] || (MAP_PATCHES[w[0]] = {}))[w[1]] = []) : null;
      continue;
    }
    const m = /^\s*setmetatile\s+(\d+),\s*(\d+),\s*(METATILE_\w+),\s*(\d)/.exec(line);
    if (m && patch) {
      if (metatileLabels[m[3]] == null) throw new Error("Unknown metatile " + m[3]);
      patch.push([+m[1], +m[2], metatileLabels[m[3]], +m[4]]);
    } else if (/^\s*return/.test(line)) patch = null;
  }
}
// Silph Co.'s card-key doors (data/scripts/silphco_doors.inc): each floor's
// EventScript_Close<n>FDoor<k> and ..Open.. setmetatile lists become that
// floor's "closed<k>" and "open<k>" patches (SilphCo_<n>F_OnLoad closes the
// doors you haven't opened).
scriptPatches("data/scripts/silphco_doors.inc", (label) => {
  const l = /^EventScript_(Close|Open)(\d+)FDoor(\d*)$/.exec(label);
  return l && ["SilphCo_" + l[2] + "F", l[1].toLowerCase() + (l[3] || "1")];
});
// The Pokémon Mansion's secret switches (data/scripts/pokemon_mansion.inc):
// each floor's PokemonMansion_EventScript_PressSwitch_<floor> is its "pressed"
// patch (the layout as built is the switch's other state).
scriptPatches("data/scripts/pokemon_mansion.inc", (label) => {
  const l = /^PokemonMansion_EventScript_PressSwitch_(\w+)$/.exec(label);
  return l && ["PokemonMansion_" + l[1], "pressed"];
});
// Cinnabar Gym's quiz doors: CinnabarIsland_Gym_EventScript_OpenDoor<k> is "door<k>".
scriptPatches("data/maps/CinnabarIsland_Gym/scripts.inc", (label) => {
  const l = /^CinnabarIsland_Gym_EventScript_OpenDoor(\d)$/.exec(label);
  return l && ["CinnabarIsland_Gym", "door" + l[1]];
});
// Victory Road's rock barriers (VictoryRoad_<floor>_EventScript_SetRockBarrier,
// and 2F's SetRockBarrier1 and 2): up until a boulder's pushed onto the
// floor switch that opens it ("barrier", "barrier1", "barrier2").
for (const floor of ["1F", "2F", "3F"]) {
  scriptPatches("data/maps/VictoryRoad_" + floor + "/scripts.inc", (label) => {
    const l = /^VictoryRoad_\w+_EventScript_SetRockBarrier(\d?)$/.exec(label);
    return l && ["VictoryRoad_" + floor, "barrier" + l[1]];
  });
}
// The Pokémon League's doors (data/scripts/pokemon_league.inc): each Elite
// Four room's way in shut behind you ("closed": PokemonLeague_EventScript_CloseEntry,
// Lance's own SetEntryClosed) and its door ahead open once its trainer's
// beaten ("door": SetDoorOpen, Lance's SetDoorOpenLance).
for (const room of ["Loreleis", "Brunos", "Agathas"]) {
  scriptPatches("data/scripts/pokemon_league.inc", (label) =>
    label === "PokemonLeague_EventScript_CloseEntry" ? ["PokemonLeague_" + room + "Room", "closed"]
      : label === "PokemonLeague_EventScript_SetDoorOpen" && ["PokemonLeague_" + room + "Room", "door"]);
}
scriptPatches("data/scripts/pokemon_league.inc", (label) => label === "PokemonLeague_EventScript_SetDoorOpenLance" && ["PokemonLeague_LancesRoom", "door"]);
scriptPatches("data/maps/PokemonLeague_LancesRoom/scripts.inc", (label) => label === "PokemonLeague_LancesRoom_EventScript_SetEntryClosed" && ["PokemonLeague_LancesRoom", "closed"]);
// Seafoam Islands B4F: calm water by the stairs once both boulders are down
// there (SeafoamIslands_B4F_EventScript_SetCalmWaterNearStairs).
scriptPatches("data/maps/SeafoamIslands_B4F/scripts.inc", (label) => label === "SeafoamIslands_B4F_EventScript_SetCalmWaterNearStairs" && ["SeafoamIslands_B4F", "calm"]);
// Seafoam Islands B3F and B4F with the current stopped (FireRed swaps in
// LAYOUT_SEAFOAM_ISLANDS_B3F/B4F_CURRENT_STOPPED): the blocks that layout
// changes, as a "stopped" patch.
// (And the Dunsparce Tunnel dug out once you're Champion: FireRed's
// LAYOUT_THREE_ISLAND_DUNSPARCE_TUNNEL_DUG_OUT, with the National Pokédex.)
const LAYOUT_PATCHES = { SeafoamIslands_B3F: { stopped: "LAYOUT_SEAFOAM_ISLANDS_B3F_CURRENT_STOPPED" },
  SeafoamIslands_B4F: { stopped: "LAYOUT_SEAFOAM_ISLANDS_B4F_CURRENT_STOPPED" },
  ThreeIsland_DunsparceTunnel: { dugout: "LAYOUT_THREE_ISLAND_DUNSPARCE_TUNNEL_DUG_OUT" } };
// One Island's Pokémon Center: Celio's Network Machine with the Ruby in it
// ("ruby"), the Sapphire ("sapphire") and its screens on ("on")
// (OneIsland_PokemonCenter_1F_EventScript_SetRubyMetatile and the like).
scriptPatches("data/maps/OneIsland_PokemonCenter_1F/scripts.inc", (label) => {
  const l = /^OneIsland_PokemonCenter_1F_EventScript_Set(Ruby|Sapphire|NetworkMachineOn)(?:Metatile)?$/.exec(label);
  return l && ["OneIsland_PokemonCenter_1F", { Ruby: "ruby", Sapphire: "sapphire", NetworkMachineOn: "on" }[l[1]]];
});
// Mt. Ember: the Ruby Path's mouth, rocks until Celio asks for the Ruby
// (MtEmber_Exterior_EventScript_OpenCave: "cave").
scriptPatches("data/maps/MtEmber_Exterior/scripts.inc", (label) => label === "MtEmber_Exterior_EventScript_OpenCave" && ["MtEmber_Exterior", "cave"]);
// Five Isle Meadow: the Rocket Warehouse's door unlocked with both passwords
// (FiveIsland_Meadow_EventScript_SetWarehouseDoorUnlocked: "unlocked"); in the
// Warehouse, the arrows the Admin turns round once she's beaten, so you can
// come back through (FiveIsland_RocketWarehouse_EventScript_SetArrowsForReEntry: "arrows").
scriptPatches("data/maps/FiveIsland_Meadow/scripts.inc", (label) => label === "FiveIsland_Meadow_EventScript_SetWarehouseDoorUnlocked" && ["FiveIsland_Meadow", "unlocked"]);
scriptPatches("data/maps/FiveIsland_RocketWarehouse/scripts.inc", (label) => label === "FiveIsland_RocketWarehouse_EventScript_SetArrowsForReEntry" && ["FiveIsland_RocketWarehouse", "arrows"]);
// Icefall Cave 1F's thin ice (src/field_tasks.c, sIcefallCaveIceCoords): each
// spot cracks the first time you step on it ("crack<i>") and breaks into a
// hole the next ("hole<i>"), dropping you to B1F.
const ICEFALL_ICE = [[8, 3], [10, 5], [15, 5], [8, 9], [9, 9], [16, 9], [8, 10], [9, 10], [8, 14]];
MAP_PATCHES.FourIsland_IcefallCave_1F = {};
ICEFALL_ICE.forEach(([x, y], i) => {
  MAP_PATCHES.FourIsland_IcefallCave_1F["crack" + i] = [[x, y, metatileLabels.METATILE_SeafoamIslands_CrackedIce, 0]];
  MAP_PATCHES.FourIsland_IcefallCave_1F["hole" + i] = [[x, y, metatileLabels.METATILE_SeafoamIslands_IceHole, 0]];
});
// Ruin Valley: the Dotted Hole's door, opened with Cut (SixIsland_RuinValley_EventScript_OpenDottedHoleDoor: "open").
scriptPatches("data/maps/SixIsland_RuinValley/scripts.inc", (label) => label === "SixIsland_RuinValley_EventScript_OpenDottedHoleDoor" && ["SixIsland_RuinValley", "open"]);
// Trainer Tower's lobby: the counter's barrier open as you come out of the
// elevator (TrainerTower_Lobby_OpenCounterBarrier: "counter").
scriptPatches("data/maps/TrainerTower_Lobby/scripts.inc", (label) => label === "TrainerTower_Lobby_OpenCounterBarrier" && ["TrainerTower_Lobby", "counter"]);
// Trainer Tower's floors are laid out for the challenge's battles (FireRed
// swaps in LAYOUT_TRAINER_TOWER_<n>F_DOUBLES / _KNOCKOUT: sFloorLayouts):
// "doubles" and "knockout" patches.
for (let n = 1; n <= 8; n++) {
  LAYOUT_PATCHES["TrainerTower_" + n + "F"] = { doubles: "LAYOUT_TRAINER_TOWER_" + n + "F_DOUBLES", knockout: "LAYOUT_TRAINER_TOWER_" + n + "F_KNOCKOUT" };
}
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
  // Objects (cut trees, item balls, the Town Map) don't turn to face you.
  const inanimate = /\.inanimate = TRUE/.test(block) || undefined;
  return (spriteInfo[gfx] = { sprite: name, width, height, frames: Math.max(1, Math.floor(png.width / width)), inanimate });
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
  for (const [pname, lid] of Object.entries(LAYOUT_PATCHES[name] || {})) {
    const alt = fs.readFileSync(P(layouts[lid].blockdata_filepath));
    const cells = [];
    blocks.forEach((b, i) => { const a = alt.readUInt16LE(i * 2); if (a !== b) cells.push([i % w, Math.floor(i / w), a & 0x3ff, (a >> 10) & 3]); });
    (MAP_PATCHES[name] || (MAP_PATCHES[name] = {}))[pname] = cells;
  }
  const patches = renderPatches(name, blocks, w, primary, secondary);
  const anim = animCells(blocks, w, h, primary, secondary);
  const animFile = path.join(outMaps, name + "-anim.png");
  if (anim.pics.length) writeAnimSheet(animFile, anim.pics);
  else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
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

  // (People with no look, graphics_id 0, are FireRed's post-game gossipers: left out.)
  const people = map.object_events.filter((o) => o.type === "object" && o.graphics_id !== "0").map((o, i) => Object.assign({
    id: i, x: o.x, y: o.y, movement: o.movement_type.replace(/^MOVEMENT_TYPE_/, "").toLowerCase(),
    rangeX: o.movement_range_x, rangeY: o.movement_range_y,
    script: o.script, flag: o.flag !== "0" ? o.flag : null,
    text: scriptText(name, o.script),
    item: itemBall(name, o.script),
    mart: martItems(name, o.script),
    trainer: o.trainer_type && /^TRAINER_TYPE_/.test(o.trainer_type) && o.trainer_type !== "TRAINER_TYPE_NONE" || /trainerbattle/.test((scriptLabels(name)[o.script] || []).join("\n"))
      ? Object.assign(trainerScript(name, o.script) || {}, { sight: +o.trainer_sight_or_berry_tree_id || 0 }) : undefined,
    localId: o.local_id || undefined,
    // A Strength boulder's flag for the boulder that appears on the floor
    // below once it drops through a hole (FireRed keeps it in trainer_type:
    // GetBoulderRevealFlagByLocalIdAndMap).
    reveal: /^FLAG_/.test(o.trainer_type || "") ? o.trainer_type : undefined,
    alt: ALT_GFX[o.script] ? objectSprite(ALT_GFX[o.script])
      : ALT_GFX[name + ":" + o.graphics_id] ? objectSprite(ALT_GFX[name + ":" + o.graphics_id]) : undefined
  }, objectSprite((VAR_GFX[name] || {})[o.graphics_id] || o.graphics_id)));

  const land = wild.find((e) => e.map === map.id && /FireRed/.test(e.base_label));
  const leafGreen = wild.find((e) => e.map === map.id && /LeafGreen/.test(e.base_label));
  out[name] = {
    name, title: TITLES[name] || name.replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2"),
    width: w, height: h, type: map.map_type.replace(/^MAP_TYPE_/, "").toLowerCase(),
    // Its song (assets/audio/music.js), e.g. "mus_pallet".
    music: map.music ? map.music.toLowerCase() : undefined,
    // FireRed's battle scene for the map ("gym", "indoor1", ...), unless normal.
    // Where an Escape Rope works (caves, Viridian Forest).
    allowEscaping: map.allow_escaping || undefined,
    // Where the Bicycle can be ridden (allow_cycling), and a cave too dark to
    // see far without Flash (requires_flash).
    cycling: map.allow_cycling || undefined,
    dark: map.requires_flash || undefined,
    // Its weather, where FireRed draws one ("fog_horizontal", "shade"; not
    // WEATHER_SUNNY, which is just the usual clear sky): ui/overworld.js.
    weather: map.weather && !["WEATHER_NONE", "WEATHER_SUNNY"].includes(map.weather) ? map.weather.replace(/^WEATHER_/, "").toLowerCase() : undefined,
    // Whether the area's name pops up on arriving by a door or warp
    // (show_map_name), and its floor (Silph Co. 2F, Rocket Hideout B1F; and
    // this game's FLOOR_NUMBERS for places FireRed gives none).
    showName: map.show_map_name || undefined,
    floor: map.floor_number || FLOOR_NUMBERS[name] || undefined,
    battleScene: map.battle_scene && map.battle_scene !== "MAP_BATTLE_SCENE_NORMAL"
      ? map.battle_scene.replace(/^MAP_BATTLE_SCENE_/, "").toLowerCase().replace(/_/g, "") : undefined,
    top: anyAbove, borderWidth: bw, borderHeight: bh,
    // Its animated cells (animCells; the pictures in <Map>-anim.png).
    anim: anim.cells.length ? { cells: anim.cells, anims: primary.anims.map((a) => a.name) } : undefined,
    patches,
    collision, elevation, behavior, encounter,
    connections: (map.connections || []).map((c) => ({ map: byConst[c.map] || null, mapConst: c.map, direction: c.direction, offset: c.offset })),
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] || null, mapConst: byConst[wp.dest_map] ? undefined : wp.dest_map, warp: +wp.dest_warp_id })),
    // (Silph Co.'s card-key doors say nothing when you bump into them.)
    signs: map.bg_events.filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script,
      text: /^SilphCo_\w+_EventScript_Door\d*$/.test(b.script) ? undefined : SIGN_TEXT[b.script] || scriptText(name, b.script) })),
    triggers: map.coord_events.map((c) => ({ x: c.x, y: c.y, script: c.script })),
    // (ITEM_NONE: coins on the Game Corner's floor, `quantity` of them.)
    hidden: map.bg_events.filter((b) => b.type === "hidden_item").map((b) => ({
      x: b.x, y: b.y, item: b.item === "ITEM_NONE" ? "coins" : itemId(b.item), flag: b.flag, quantity: b.quantity || 1 })),
    people,
    wild: land && land.land_mons ? {
      rate: land.land_mons.encounter_rate,
      // Both versions: where LeafGreen has a different Pokémon in a slot
      // (Sandshrew for FireRed's Ekans), `alt` is it, and each is as likely.
      slots: WILD_SLOTS[name] ? WILD_SLOTS[name].map(([species, min, max, alt]) => Object.assign({ species, min, max }, alt ? { alt } : {}))
        : land.land_mons.mons.map((m, i) => {
        const lg = leafGreen && leafGreen.land_mons && leafGreen.land_mons.mons[i];
        const species = dexByID[toID(m.species.replace(/^SPECIES_/, ""))];
        const alt = lg && dexByID[toID(lg.species.replace(/^SPECIES_/, ""))];
        const change = (WILD_SLOT_CHANGES[name] || {})[i];
        if (change) return { species: change[0], min: change[1], max: change[2] };
        return Object.assign({ species, min: m.min_level, max: m.max_level }, alt && alt !== species ? { alt } : {});
      })
    } : null,
    // Surfing (water_mons, slots 60/30/5/4/1 percent) and Rock Smash
    // (rock_smash_mons): kept apart from `wild` (the grass), which the
    // Pokédex's area pages and route crowns go by.
    water: slotsOf(land, "water_mons"),
    rockSmash: slotsOf(land, "rock_smash_mons")
  };
}
function slotsOf(enc, kind) {
  const e = enc && enc[kind];
  if (!e) return undefined;
  return { rate: e.encounter_rate, slots: e.mons.map((m) => ({ species: dexByID[toID(m.species.replace(/^SPECIES_/, ""))], min: m.min_level, max: m.max_level })) };
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

// Every trainer a built map battles, however its script starts the battle
// (trainerbattle_single for most, trainerbattle_earlyrival for the rival).
for (const name of MAPS) {
  const file = P("data/maps", name, "scripts.inc");
  if (!fs.existsSync(file)) continue;
  for (const [, id] of fs.readFileSync(file, "utf8").matchAll(/trainerbattle_\w+\s+(TRAINER_\w+)/g)) usedTrainers.add(id);
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

for (const [color, prefix] of Object.entries(PLAYER_SPRITES)) {
  const src = path.join(root, "assets/sprites/overworld", prefix + "_normal.png");
  if (fs.existsSync(src)) writeSprite(readPng(src), path.join(outSprites, "player_" + color + ".png"));
  // Running: frames 3-11 of the surf/run sheet, laid out like the walking
  // sheet's poses (down, two strides, up, two strides, left, two strides).
  const run = path.join(root, "assets/sprites/overworld", prefix + "_surf_run.png");
  if (fs.existsSync(run)) writeSprite(cropFrames(readPng(run), 16, 3, 9), path.join(outSprites, "player_" + color + "_run.png"));
  // On the Bicycle (32x32, the walking sheet's poses) and surfing (32x32:
  // down, up and left, two frames each, the second a bob lower).
  const bike = path.join(root, "assets/sprites/overworld", prefix + "_bike.png");
  if (fs.existsSync(bike)) writeSprite(readPng(bike), path.join(outSprites, "player_" + color + "_bike.png"));
  const surf = path.join(root, "assets/sprites/overworld", prefix + "_surf.png");
  if (fs.existsSync(surf)) writeSprite(cropFrames(readPng(surf), 32, 0, 6), path.join(outSprites, "player_" + color + "_surf.png"));
}

// ---------- The Move Relearner and Move Deleter (not in FireRed) ----------
//
// Upstairs in every Pokémon Center, sitting on the cushions (row 7: the
// Relearner on the left set, the Deleter on the right).
const personLike = (sprite) => Object.values(out).flatMap((m) => m.people).find((p) => p.sprite === sprite);
for (const name of Object.keys(out).filter((n) => /_PokemonCenter_2F$/.test(n))) {
  const m = out[name], next = m.people.length;
  const tutor = (k, x, sprite, script, text) => Object.assign({}, personLike(sprite), {
    id: next + k, x, y: 7, movement: "face_up", rangeX: 1, rangeY: 1, script, flag: null, text, localId: null, trainer: undefined, item: undefined, mart: undefined });
  m.people.push(
    tutor(0, 6, "gentleman", "CenterUpstairs_EventScript_MoveRelearner", ["I'm the Move Relearner."]),
    tutor(1, 10, "old_man_2", "CenterUpstairs_EventScript_MoveDeleter", ["I'm the Move Deleter."]));
}

// Yellow's Jessie & James, from FireRed's Rocket Grunt pictures.
duoPic("jessie_james", "rocket_grunt_f", "rocket_grunt_m", 16);

fs.writeFileSync(path.join(root, "data/world-maps.js"),
  "// Auto-generated by tools/build-maps.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.WORLD_MAPS = " + JSON.stringify(out) + ";\n" +
  "window.WORLD_TEXT = " + JSON.stringify(gameText) + ";\n" +
  "window.WORLD_MOVEMENTS = " + JSON.stringify(gameMovements) + ";\n" +
  "window.WORLD_TRAINERS = " + JSON.stringify(buildTrainers([...usedTrainers].sort())) + ";\n" +
  "window.WORLD_SPRITES = " + JSON.stringify(Object.fromEntries(Object.entries(EXTRA_GFX).map(([k, g]) => [k, objectSprite(g)]))) + ";\n");
console.log("wrote " + MAPS.length + " maps to data/world-maps.js and assets/world/");
