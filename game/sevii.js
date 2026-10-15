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
  // (The islands still to come — Four to Seven Island — sail nowhere yet.)
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

  window.Sevii = { PORTS, port, built, ferryNumber, eastbound, menu, CAPE_BRINK_MOVES, capeBrinkMove, capeBrinkDone };
})();
