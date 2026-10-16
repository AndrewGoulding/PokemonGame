// The Sevii Islands' story and the Seagallop ferries, as in FireRed.
// Depends on: nothing (works on player.flags).
//
//   Sevii.PORTS / Sevii.port(id)       // the Seagallop's ports: where you land
//   Sevii.built(id)                    // that port's island is in the game yet
//   Sevii.ferryNumber(from, to)        // GetSeagallopNumber: "SEAGALLOP HI-SPEED 7"
//   Sevii.eastbound(from, to)          // the ferry heads east (sTravelDirectionMatrix), for its ride
//   Sevii.menu(flags, from, page)      // a harbor's destinations: { items: [port ids, "MORE",
//                                      //   "EXIT"], labels, page } (EventScript_ChooseDestFrom*)
//   Sevii.capeBrinkMove(record)        // the move Cape Brink's tutor teaches it, or null
//   Sevii.CAPE_BRINK_MOVES             // { species: [move, flag] }
//   Sevii.ICEFALL_ICE                  // Icefall Cave 1F's thin ice: [[x, y], ...]
//   Sevii.icefallPatches(state)        // its patches ("crack3", "hole5") from { "x,y": 1 cracked | 2 broken }
//   Sevii.resortRequest(seen, rng)     // Selphy's wish: { species, reward } (SampleResortGorgeousMonAndReward)
//   Sevii.resortStep(request)          // a step while she waits (IncrementResortGorgeousStepCounter)
//   Sevii.hofBrag(count)               // the sticker man's Hall of Fame tier, 1-4
//   Sevii.leadFriendshipMax(party)     // the Water Labyrinth's test (GetLeadMonFriendship == 6)
//
// FireRed keeps the trip in event variables; here they're player.flags:
//   cinnabarScene      VAR_MAP_SCENE_CINNABAR_ISLAND: 1 Bill waits outside
//                      Blaine's Gym; 2 gone (to One Island, or to wait in
//                      the Pokémon Center: cinnabarBillInCenter); 3 back from
//                      One Island; 4 done (he's gone home)
//   cinnabarExitWithBill VAR_MAP_SCENE_CINNABAR_ISLAND_2 1: out of the Center with him
//   oneHarborScene     VAR_MAP_SCENE_ONE_ISLAND_HARBOR: 1 arriving, 2 on the
//                      island (Bill takes you to the Pokémon Center), 3 done
//   celioScene         VAR_MAP_SCENE_ONE_ISLAND_POKEMON_CENTER_1F: 1 Tri-Pass
//                      (met Celio), 2 the Meteorite delivered (Bill's ready
//                      to go), 3 back to Kanto, 4 Celio asked for the Ruby,
//                      5 the Rainbow Pass, 6/7 the Sapphire (part 3)
//   threeIslandScene   VAR_MAP_SCENE_THREE_ISLAND: 2 the lone biker came,
//                      3 Paxton's here, 4 the bikers are gone
//   gameCornerScene    VAR_MAP_SCENE_TWO_ISLAND_JOYFUL_GAME_CORNER: 1 asked
//                      to find Lostelle, 2 she's back, 3 thanked, 4 games on
//   mtEmberScene       VAR_MAP_SCENE_MT_EMBER_EXTERIOR: 1 the Rockets' password
//                      scene is due, 2 overheard
//   rescuedLostelle (FLAG_RESCUED_LOSTELLE), seviiDetourDone
//   (FLAG_SEVII_DETOUR_FINISHED), pcStorageDisabled (FLAG_SYS_PC_STORAGE_DISABLED),
//   seviiMap123 / seviiMap4567 (FLAG_SYS_SEVII_MAP_123 / _4567: the Town
//   Map's pages), gotRuby (FLAG_GOT_RUBY), recoveredSapphire (FLAG_RECOVERED_SAPPHIRE).
//
// Four and Five Island (part 2):
//   fourIslandScene    VAR_MAP_SCENE_FOUR_ISLAND: 1 Gary's been and gone (his
//                      "I already got my EGG" scene on arriving). Part 3: Six
//                      Island's Pokémon Center scene sets it to 1 too.
//   icefallScene       VAR_MAP_SCENE_ICEFALL_CAVE_BACK: 1 Lorelei and you ran
//                      off the poachers. Lorelei's then at home on Four Island
//                      (FLAG_HIDE_LORELEI_IN_HER_HOUSE cleared) until the
//                      Sapphire's in Celio's machine (canLinkWithRS). Part 3:
//                      it also hides Ruin Valley's scientist (FLAG_HIDE_RUIN_VALLEY_SCIENTIST).
//   talkedToLoreleiAfterWarehouse (FLAG_TALKED_TO_LORELEI_AFTER_WAREHOUSE)
//   learnedYesNahChansey  FLAG_LEARNED_YES_NAH_CHANSEY, the Warehouse's second
//                      password: part 3 sets it, in the Dotted Hole's Sapphire
//                      room (SixIsland_DottedHole_SapphireRoom), when the thief
//                      lets it slip. (The first, "GOLDEEN need log", is
//                      mtEmberScene's; FireRed's door doesn't check for it.)
//   unlockedRocketWarehouse  FLAG_UNLOCKED_ROCKET_WAREHOUSE
//   warehouseScene     VAR_MAP_SCENE_ROCKET_WAREHOUSE: 1 the Admin's turned round
//   defeatedRocketsInWarehouse  FLAG_DEFEATED_ROCKETS_IN_WAREHOUSE (and
//                      FLAG_HIDE_FIVE_ISLAND_ROCKETS: the Meadow's and, part 3,
//                      Outcast Island's grunts are gone)
//   gotTM42AtMemorialPillar / noRoomForTM42 (FLAG_GOT_TM42_AT_MEMORIAL_PILLAR, ..._NO_ROOM_..)
//   gotTogepiEgg / noRoomForTogepiEgg (FLAG_GOT_TOGEPI_EGG, FLAG_NO_ROOM_FOR_TOGEPI_EGG)
//   lostCaveScene      VAR_MAP_SCENE_FIVE_ISLAND_LOST_CAVE_ROOM10: 1 Selphy found
//   resortScene        VAR_MAP_SCENE_FIVE_ISLAND_RESORT_GORGEOUS: 1 taking her
//                      home, 2 she's home (FLAG_HIDE_RESORT_GORGEOUS_INSIDE_SELPHY cleared)
//   resortRequest      { species, reward, steps } (VAR_RESORT_GORGEOUS_REQUESTED_MON,
//                      _REWARD, _STEP_COUNTER); species "expired" after 250 steps (0xFFFF)
//   metStickerMan, hofBragState (FLAG_MET_STICKER_MAN, VAR_HOF_BRAG_STATE)
//   dayCare2           Four Island's Day-Care: [{ mon, steps }, ...] (up to two;
//                      game/daycare.js)
//
// Six and Seven Island (part 3):
//   sixCenterScene     VAR_MAP_SCENE_SIX_ISLAND_POKEMON_CENTER_1F: 1 Gary's been
//                      ("impossible to get all the Pokémon"; it sets
//                      fourIslandScene too, so he's not on Four Island after)
//   usedCutOnRuinValleyBraille  FLAG_USED_CUT_ON_RUIN_VALLEY_BRAILLE: the Dotted
//                      Hole's door open (Cut, facing it from below)
//   learnedYesNahChansey  set in the Dotted Hole's Sapphire room: the thief
//                      (Gideon) takes the Sapphire there, and the Sapphire's
//                      gone (FLAG_HIDE_SAPPHIRE)
//   heracrossRecord    VAR_HERACROSS_SIZE_RECORD (its size hash), and
//   gotNestBallFromWaterPathHouse1 (FLAG_GOT_NEST_BALL_FROM_WATER_PATH_HOUSE_1)
//   unlockedTanobyRuins  FLAG_SYS_UNLOCKED_TANOBY_RUINS: the Tanoby Key's seven
//                      switches pressed; Unown in the chambers from then on
//   tower, towerRecords  Trainer Tower (game/trainer-tower.js); towerScene
//                      VAR_MAP_SCENE_TRAINER_TOWER (1: a challenge on)
//   tutorSwordsDance   FLAG_TUTOR_SWORDS_DANCE
// and from Celio, once the Sapphire's in his machine: canLinkWithRS, which
// in FireRed also sets FLAG_HIDE_CERULEAN_CAVE_GUARD (Sevii.ceruleanCaveOpen).
//
// After the islands (the last part):
//   Sevii.ceruleanCaveOpen(flags)      // Cerulean Cave's guard has stepped aside
//   Sevii.leagueClosed(flags)          // Indigo Plateau's door guard blocks the way:
//                                      //   "Lorelei is absent" (Champion, Sapphire not in yet)
//   Sevii.loreleiDolls(hofCount)       // Lorelei's extra dolls on show (UpdateLoreleiDollCollection)
//   foughtMewtwo        FLAG_FOUGHT_MEWTWO (caught or beaten: gone)
// (FireRed's Mystery Gift islands, Navel Rock and Birth Island, aren't built:
// no event tickets, no ferries there.)
(function () {
  "use strict";

  // SEAGALLOP_* (include/constants/seagallop.h) and where the ferry leaves
  // you (src/seagallop.c's sSeag: the harbor, facing the way out).
  const PORTS = [
    { id: "VERMILION_CITY", label: "Vermilion", map: "VermilionCity", x: 23, y: 32 },
    { id: "ONE_ISLAND", label: "One Island", map: "OneIsland_Harbor", x: 8, y: 5 },
    { id: "TWO_ISLAND", label: "Two Island", map: "TwoIsland_Harbor", x: 8, y: 5 },
    { id: "THREE_ISLAND", label: "Three Island", map: "ThreeIsland_Harbor", x: 8, y: 5 },
    { id: "FOUR_ISLAND", label: "Four Island", map: "FourIsland_Harbor", x: 8, y: 5 },
    { id: "FIVE_ISLAND", label: "Five Island", map: "FiveIsland_Harbor", x: 8, y: 5 },
    { id: "SIX_ISLAND", label: "Six Island", map: "SixIsland_Harbor", x: 8, y: 5 },
    { id: "SEVEN_ISLAND", label: "Seven Island", map: "SevenIsland_Harbor", x: 8, y: 5 },
    { id: "CINNABAR_ISLAND", label: "Cinnabar Island", map: "CinnabarIsland", x: 21, y: 7 }
  ];
  const ids = PORTS.map((p) => p.id);
  const port = (id) => PORTS.find((p) => p.id === id) || null;
  const built = (id, maps) => { const p = port(id); return !!(p && (maps || window.WORLD_MAPS || {})[p.map]); };

  // sTravelDirectionMatrix (src/seagallop.c): bit `to` of the row for `from`
  // (SEAGALLOP_* order, Navel Rock and Birth Island last) is set when the
  // ferry heads east.
  const PORT_ORDER = ids.concat(["NAVEL_ROCK", "BIRTH_ISLAND"]);
  const DIRECTIONS = [0x6fe, 0x6fc, 0x6f8, 0x6f0, 0x6e0, 0x4c0, 0x400, 0x440, 0x7ff, 0x6e0, 0x000];
  function eastbound(from, to) {
    const a = PORT_ORDER.indexOf(from), b = PORT_ORDER.indexOf(to);
    if (a < 0 || b < 0) return true;
    return !!((DIRECTIONS[a] >> b) & 1);
  }

  function ferryNumber(from, to) {
    const either = (...set) => set.includes(from) || set.includes(to);
    const both = (...set) => set.includes(from) && set.includes(to);
    if (either("CINNABAR_ISLAND")) return 1;
    if (either("VERMILION_CITY")) return 7;
    if (both("ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND")) return 2;
    if (both("FOUR_ISLAND", "FIVE_ISLAND")) return 3;
    if (both("SIX_ISLAND", "SEVEN_ISLAND")) return 5;
    return 6;
  }

  // A harbor's menu. With the Rainbow Pass (celioScene 5 and on), FireRed's
  // two pages (DrawSeagallopDestinationMenu): Vermilion to Four Island but
  // where you are, OTHER, EXIT; then Four (or Five) to Seven Island.
  // With the Tri-Pass, the other islands of One, Two and Three (and
  // Vermilion once Bill's taken you back: cinnabarScene 4).
  function menu(flags, from, page) {
    const scene = flags.celioScene || 0;
    let items;
    if (scene >= 5) {
      items = [];
      if (page === 1) {
        let d = ids.indexOf(from) < ids.indexOf("FIVE_ISLAND") ? ids.indexOf("FIVE_ISLAND") : ids.indexOf("FOUR_ISLAND");
        while (items.length < 3) { if (ids[d] !== from) items.push(ids[d]); d = d === ids.indexOf("SEVEN_ISLAND") ? 0 : d + 1; }
      } else {
        let d = 0;
        while (items.length < 4) { if (ids[d] !== from) items.push(ids[d]); d = d === ids.indexOf("SEVEN_ISLAND") ? 0 : d + 1; }
      }
      items.push("MORE", "EXIT");
    } else {
      const islands = ["ONE_ISLAND", "TWO_ISLAND", "THREE_ISLAND"].filter((p) => p !== from);
      const vermilion = from !== "VERMILION_CITY" && (flags.cinnabarScene || 0) >= 4 ? ["VERMILION_CITY"] : [];
      items = vermilion.concat(islands, ["EXIT"]);
    }
    // (FireRed's menu words: VERMILION, ONE ISLAND ... OTHER, EXIT.)
    const labels = items.map((i) => (i === "MORE" ? "Other" : i === "EXIT" ? "Exit" : port(i).label));
    return { items, labels, page: page || 0 };
  }

  // Cape Brink's tutor (CapeBrinkGetMoveToTeachLeadPokemon): the ultimate move
  // of a fully evolved starter in the lead, as close to you as can be
  // (friendship 255), once each.
  const CAPE_BRINK_MOVES = { Venusaur: ["Frenzy Plant", "tutorFrenzyPlant"], Charizard: ["Blast Burn", "tutorBlastBurn"],
    Blastoise: ["Hydro Cannon", "tutorHydroCannon"] };
  function capeBrinkMove(record, flags) {
    const m = record && CAPE_BRINK_MOVES[record.species];
    if (!m || (record.happiness | 0) < 255) return null;
    if (flags && flags[m[1]]) return null;
    return { move: m[0], flag: m[1] };
  }
  const capeBrinkDone = (flags) => Object.values(CAPE_BRINK_MOVES).every(([, f]) => flags[f]);

  // ---------- Four Island ----------

  // Icefall Cave 1F's thin ice (src/field_tasks.c's sIcefallCaveIceCoords):
  // stepping on a spot cracks it (SE_ICE_CRACK), stepping on it again breaks
  // it (SE_ICE_BREAK) and you fall through to B1F. FireRed keeps which have
  // cracked in FLAG_TEMP_1..9, so they're whole again when you come back.
  const ICEFALL_ICE = [[8, 3], [10, 5], [15, 5], [8, 9], [9, 9], [16, 9], [8, 10], [9, 10], [8, 14]];
  function icefallPatches(state) {
    const out = [];
    ICEFALL_ICE.forEach(([x, y], i) => {
      const v = state && state[x + "," + y];
      if (v === 1) out.push("crack" + i); else if (v === 2) out.push("hole" + i);
    });
    return out;
  }

  // The sticker man's Hall of Fame tiers (FourIsland_House2_EventScript_BragHoF):
  // up to 39 entries, 99, 199, then 200 and more.
  const hofBrag = (n) => (n <= 39 ? 1 : n <= 99 ? 2 : n <= 199 ? 3 : 4);

  // ---------- Five Island ----------

  // Resort Gorgeous: Selphy wants to see a Pokémon you've seen (FireRed's
  // SampleResortGorgeousMon: one of the national Pokédex's 386, seen), and
  // her butler thanks you with a Luxury Ball, or 30% of the time one of
  // sResortGorgeousDeluxeRewards. She tires of waiting after 250 steps.
  const RESORT_DELUXE = ["big-pearl", "pearl", "stardust", "star-piece", "nugget", "rare-candy"];
  const RESORT_PATIENCE = 250;
  function resortRequest(seen, rng) {
    rng = rng || Math.random;
    const dex = window.DEX || {};
    const pool = (seen || []).filter((sp) => dex[sp] && dex[sp].id >= 1 && dex[sp].id <= 386);
    const species = pool.length ? pool[Math.floor(rng() * pool.length)] : "Bulbasaur";
    const reward = rng() * 100 >= 30 ? "luxury-ball" : RESORT_DELUXE[Math.floor(rng() * RESORT_DELUXE.length)];
    return { species, reward, steps: 0 };
  }
  // -> true when she's tired of waiting (the request's then expired).
  function resortStep(req) {
    if (!req || req.expired) return false;
    if (++req.steps >= RESORT_PATIENCE) { req.expired = true; req.steps = 0; return true; }
    return false;
  }

  // The Water Labyrinth's gentleman gives his Egg (Togepi) only for a lead
  // Pokémon as fond of you as can be (GetLeadMonFriendship: 255).
  const leadFriendshipMax = (party) => { const lead = (party || [])[0]; return !!lead && (lead.happiness | 0) >= 255; };

  // ---------- Six Island ----------

  // The Dotted Hole's door opens to Cut used on it, standing below it
  // (CutMoveRuinValleyCheck: 24, 25 facing up), until it's open.
  const DOTTED_HOLE_CUT = { map: "SixIsland_RuinValley", x: 24, y: 25, facing: "up" };
  const cutOpensDottedHole = (flags, at) => !flags.usedCutOnRuinValleyBraille && !!at && at.map === DOTTED_HOLE_CUT.map &&
    at.x === DOTTED_HOLE_CUT.x && at.y === DOTTED_HOLE_CUT.y && at.facing === DOTTED_HOLE_CUT.facing;

  // ---------- Seven Island ----------

  // The Tanoby Ruins' chambers (MAP_SEVEN_ISLAND_TANOBY_RUINS_*_CHAMBER, in
  // FireRed's order), and the Unown in each by encounter slot
  // (src/wild_encounter.c's sUnownLetterSlots: 0-25 A to Z, 26 !, 27 ?).
  const TANOBY_CHAMBERS = ["Monean", "Liptoo", "Weepth", "Dilford", "Scufib", "Rixy", "Viapois"].map((c) => "SevenIsland_TanobyRuins_" + c + "Chamber");
  const UNOWN_LETTER_SLOTS = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 27], [2, 2, 2, 3, 3, 3, 7, 7, 7, 20, 20, 14], [13, 13, 13, 13, 18, 18, 18, 18, 8, 8, 4, 4],
    [15, 15, 11, 11, 9, 9, 17, 17, 17, 16, 16, 16], [24, 24, 19, 19, 6, 6, 6, 5, 5, 5, 10, 10], [21, 21, 21, 22, 22, 22, 23, 23, 12, 12, 1, 1],
    [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 26]];
  // An Unown's letter, as Party's form: "a" ... "z", "exclamation", "question".
  const unownForm = (n) => (n === 26 ? "exclamation" : n === 27 ? "question" : String.fromCharCode(97 + n));
  // The letter of the Unown in `slot` of chamber map `map` (GenerateWildMon), or null.
  function unownLetter(map, slot) {
    const c = TANOBY_CHAMBERS.indexOf(map);
    return c < 0 || slot == null ? null : unownForm(UNOWN_LETTER_SLOTS[c][slot]);
  }
  // No wild Pokémon in the chambers until the Tanoby Key's puzzle is solved
  // (UnlockedTanobyOrAreNotInTanoby), and they're dark till then (EventScript_TryDarkenRuins).
  const tanobyLocked = (flags, map) => TANOBY_CHAMBERS.includes(map) && !flags.unlockedTanobyRuins;
  // The Tanoby Key's boulders, once solved (..._EventScript_MoveBouldersToSolvedPos), by local id.
  const TANOBY_BOULDERS_SOLVED = { LOCALID_TANOBY_KEY_BOULDER1: [7, 2], LOCALID_TANOBY_KEY_BOULDER2: [4, 4], LOCALID_TANOBY_KEY_BOULDER3: [10, 4],
    LOCALID_TANOBY_KEY_BOULDER4: [5, 6], LOCALID_TANOBY_KEY_BOULDER5: [9, 6], LOCALID_TANOBY_KEY_BOULDER6: [5, 8], LOCALID_TANOBY_KEY_BOULDER7: [9, 8] };

  // ---------- After the islands ----------

  // FireRed's Cerulean Cave guard steps aside once Celio has the Sapphire
  // (OneIsland_PokemonCenter_1F: FLAG_SYS_CAN_LINK_WITH_RS sets
  // FLAG_HIDE_CERULEAN_CAVE_GUARD), whether or not you're Champion yet.
  const ceruleanCaveOpen = (flags) => !!(flags && flags.canLinkWithRS);

  // Indigo Plateau's door guard (IndigoPlateau_PokemonCenter_1F_EventScript_CheckBlockDoor):
  // with the National Pokédex and the Sapphire not yet in Celio's machine,
  // she stands in the doorway: Lorelei's away. (FireRed only gives the
  // National Pokédex after the Hall of Fame; here you have it from the start,
  // so this asks for that: once you're Champion, as FireRed's players are by
  // then. Asking only for the Pokédex would shut the League before your
  // first challenge until the islands' story is done.)
  const leagueClosed = (flags) => !!(flags && flags.gameClear && !flags.canLinkWithRS);

  // Lorelei's dolls (UpdateLoreleiDollCollection): one more on show every 25
  // times you've entered the Hall of Fame, up to 200. -> how many of
  // LORELEI_DOLL_FLAGS show (the six others are always there).
  const LORELEI_DOLL_FLAGS = ["FLAG_HIDE_LORELEI_HOUSE_MEOWTH_DOLL", "FLAG_HIDE_LORELEI_HOUSE_CHANSEY_DOLL",
    "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_F_DOLL", "FLAG_HIDE_LORELEI_HOUSE_JIGGLYPUFF_DOLL", "FLAG_HIDE_LORELEIS_HOUSE_NIDORAN_M_DOLL",
    "FLAG_HIDE_LORELEIS_HOUSE_FEAROW_DOLL", "FLAG_HIDE_LORELEIS_HOUSE_PIDGEOT_DOLL", "FLAG_HIDE_LORELEIS_HOUSE_LAPRAS_DOLL"];
  const loreleiDolls = (hofCount) => Math.min(8, Math.floor((hofCount | 0) / 25));
  const loreleiDollShown = (flag, hofCount) => { const i = LORELEI_DOLL_FLAGS.indexOf(flag); return i >= 0 && i < loreleiDolls(hofCount); };

  window.Sevii = { DOTTED_HOLE_CUT, cutOpensDottedHole, TANOBY_CHAMBERS, UNOWN_LETTER_SLOTS, unownForm, unownLetter, tanobyLocked,
    TANOBY_BOULDERS_SOLVED, ceruleanCaveOpen, leagueClosed, LORELEI_DOLL_FLAGS, loreleiDolls, loreleiDollShown,
    PORTS, port, built, ferryNumber, eastbound, menu, CAPE_BRINK_MOVES, capeBrinkMove, capeBrinkDone,
    ICEFALL_ICE, icefallPatches, hofBrag, RESORT_DELUXE, RESORT_PATIENCE, resortRequest, resortStep, leadFriendshipMax };
})();
