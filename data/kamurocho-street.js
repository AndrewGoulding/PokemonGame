// Kamurocho, side on (ui/street.js): Streets of Kamurocho's own streets (tools/build-kamurocho-sok.py), walked as its
// beat-'em-up's are, along the street and up and down its pavement. Each scene: its picture (480 high, the floor at
// the bottom), the floor you can walk on (a polygon, in the picture's pixels), its ways out (`exits`: walk off an
// edge, or into a door's spot facing up, to the other scene's x and y), its spots (stand in one and press A: its
// script), and its people (each a SoK sprite from assets/kamurocho/people, standing about or walking rather than
// squaring up as in a fight (the "_idle" frames), their scripts and words as ui/game.js
// knows them: Kamurocho_Kiryu and the rest; `face` the way they look). Fights start on the street as you walk
// (REALM_ENCOUNTERS.Kamurocho), never in the alley, the bar or a shop. Every convenience store on the street (Poppo's
// the one) has a door in, and its clerk inside sells the realm's items.
// Kamurocho on the world's list of places (its name, its realm, its music): its streets are walked side on, here, so
// it has no tiles of its own, one square of nothing; and where the Time Machine leaves you (KAMUROCHO_STREET.arrive).
window.WORLD_MAPS.Kamurocho = { name: "Kamurocho", title: "Kamurocho", width: 1, height: 1, type: "city", realm: "yakuza", music: "dp_veilstone_city",
  cycling: false, showName: true, top: false, borderWidth: 1, borderHeight: 1, collision: [1], elevation: [0], behavior: [0], encounter: [0],
  connections: [], warps: [], signs: [], triggers: [], hidden: [], people: [], wild: null };
window.KAMUROCHO = { arrive: { map: "Kamurocho", x: 0, y: 0, facing: "down" } };
window.KAMUROCHO_STREET = {
  // Where the Time Machine leaves you: under the street, beside it.
  arrive: { scene: "sewer", x: 200, y: 446, facing: "right" },
  scenes: {
    street: {
      title: "Kamurocho", image: "assets/kamurocho/street.png", width: 3103, encounters: true,
      // (the pavement by the Stardust and Poppo, down the corner past the Gyudon place, to the batting cages and
      // Bacchus)
      floor: [[0, 150], [800, 150], [1300, 392], [2900, 394], [3075, 462], [3075, 470], [1000, 470], [460, 220], [0, 220]],
      exits: [{ edge: "right", to: "alley", x: 30, y: 446, facing: "right" },
        { spot: [2960, 3040, 425, 452], to: "bacchus", x: 40, y: 448, facing: "right", text: "Bacchus" },
        { spot: [670, 770, 150, 168], to: "poppo", x: 130, y: 440, facing: "right", text: "Poppo" },
        { spot: [520, 576, 184, 206], to: "sewer", x: 90, y: 440, facing: "right", text: "Manhole" }],
      // (the manhole cover on the pavement outside Serena: the way down to the Time Machine)
      things: [{ image: "assets/kamurocho/manhole.png", x: 548, y: 204, scale: 1, floor: true }],
      people: [
        { script: "Kamurocho_Tout", sprite: "host_idle", x: 150, y: 172, face: "right",
          text: ["Maharaja's the hottest disco in\nKamurocho!", "The dance floor never sleeps.\nNeither does this town."] },
        { script: "Kamurocho_Hostess", sprite: "host2_idle", x: 330, y: 186, face: "left",
          text: ["Pink Street's lit up all night.", "Every club round here wants a\nregular. Will you be ours?"] },
        { script: "Kamurocho_Thug", sprite: "thug_idle", x: 1110, y: 360, face: "left",
          text: ["Whaddya lookin' at?", "...Hmph. Smile Burger's got the\nbest burgers in town. Don't tell\nanyone I said that."] },
        { script: "Kamurocho_Kiryu", sprite: "kiryu_idle", x: 1520, y: 430, face: "left",
          text: ["Kiryu: ...Name's Kazuma Kiryu.\nDojima family.", "Or I was, till they pinned a\nkilling in that empty lot on me.", "I'll find who set me up.\nWhatever it takes."] },
        { script: "Kamurocho_Bowler", sprite: "loiterer", x: 2180, y: 410, face: "right",
          text: ["The batting cages are open all\nnight. Step up to the plate!"] },
        { script: "Kamurocho_Salaryman", sprite: "suit_walk", x: 2480, y: 450, face: "left",
          text: ["Taihei Boulevard's that way.\nThe last train's long gone.", "Guess it's another night in\nKamurocho..."] },
        { script: "Kamurocho_Drinker", sprite: "drunk_idle", x: 2860, y: 420, face: "right",
          text: ["Champion District... a maze of\nbars no bigger than a closet.", "Get lost in there and you might\nnever find your way out."] }
      ]
    },
    alley: {
      title: "The Empty Lot", image: "assets/kamurocho/alley.png", width: 609,
      floor: [[0, 412], [609, 412], [609, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3050, y: 465, facing: "left" }],
      people: [
        { script: "Kamurocho_Lookout", sprite: "grunt_idle", x: 120, y: 452, face: "right",
          text: ["Keep away from that empty lot.", "A man was shot there, and every\nfamily in the Tojo Clan wants\nthe 100 billion yen that's gone."] }
      ]
    },
    // (Inside Poppo, the convenience store: this game's own, tools/build-kamurocho-insides.py. Its clerk's behind the
    // counter: stand before it and press A to buy.)
    poppo: {
      title: "Poppo", image: "assets/kamurocho/poppo.png", width: 800,
      floor: [[0, 414], [800, 414], [800, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 720, y: 172, facing: "down" }],
      spots: [{ x0: 548, x1: 790, y0: 414, y1: 470, script: "Kamurocho_Clerk", text: "Clerk" }]
    },
    // (Under the manhole by Serena: the storm drain where the Time Machine stands, tools/build-kamurocho-insides.py.
    // The ladder's the way back up.)
    sewer: {
      title: "Under the Street", image: "assets/kamurocho/sewer.png", width: 640,
      floor: [[0, 414], [640, 414], [640, 470], [0, 470]],
      exits: [{ spot: [40, 124, 414, 446], to: "street", x: 548, y: 214, facing: "down", text: "Ladder up" }],
      spots: [{ x0: 236, x1: 364, y0: 414, y1: 470, script: "Kamurocho_TimeMachine", text: "Time Machine" }]
    },
    bacchus: {
      title: "Bacchus", image: "assets/kamurocho/bacchus.png", width: 816,
      floor: [[0, 414], [816, 414], [816, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3000, y: 450, facing: "down" }],
      people: [{ script: "Kamurocho_Majima", sprite: "majima_idle", x: 560, y: 450, face: "left",
          text: ["Majima: Heeey! You look like ya\ncan handle yerself!", "Name's Goro Majima.\nThe Mad Dog of Shimano!"] }]
    }
  }
};
