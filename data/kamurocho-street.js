// Kamurocho, side on (ui/street.js): Streets of Kamurocho's own streets (tools/build-kamurocho-sok.py), walked as its
// beat-'em-up's are, along the street and up and down its pavement. Each scene: its picture (480 high, the floor at
// the bottom), the floor you can walk on (a polygon, in the picture's pixels), its ways out (`exits`: walk off an
// edge, or into a door's spot facing up, to the other scene's x and y), its spots (stand in one and press A: its
// script), and its people (each a SoK sprite from assets/kamurocho/people, their scripts and words as ui/game.js
// knows them: Kamurocho_Kiryu and the rest; `face` the way they look). Fights start on the street as you walk
// (REALM_ENCOUNTERS.Kamurocho), never in the alley or the bar.
window.KAMUROCHO_STREET = {
  // Where the Time Machine leaves you: in the alley, before it.
  arrive: { scene: "alley", x: 300, y: 446, facing: "down" },
  scenes: {
    street: {
      title: "Kamurocho", image: "assets/kamurocho/street.png", width: 3103, encounters: true,
      // (the pavement by the Stardust and Poppo, down the corner past the Gyudon place, to the batting cages and
      // Bacchus)
      floor: [[0, 150], [800, 150], [1300, 392], [2900, 394], [3075, 462], [3075, 470], [1000, 470], [460, 220], [0, 220]],
      exits: [{ edge: "right", to: "alley", x: 30, y: 446, facing: "right" },
        { spot: [2960, 3040, 425, 452], to: "bacchus", x: 40, y: 448, facing: "right", text: "Bacchus" }],
      spots: [{ x0: 670, x1: 770, y0: 150, y1: 168, script: "Kamurocho_Clerk", text: "Poppo" }],
      people: [
        { script: "Kamurocho_Tout", sprite: "host", x: 150, y: 172, face: "right",
          text: ["Maharaja's the hottest disco in\nKamurocho!", "The dance floor never sleeps.\nNeither does this town."] },
        { script: "Kamurocho_Hostess", sprite: "host2", x: 330, y: 186, face: "left",
          text: ["Pink Street's lit up all night.", "Every club round here wants a\nregular. Will you be ours?"] },
        { script: "Kamurocho_Thug", sprite: "thug", x: 1110, y: 360, face: "left",
          text: ["Whaddya lookin' at?", "...Hmph. Smile Burger's got the\nbest burgers in town. Don't tell\nanyone I said that."] },
        { script: "Kamurocho_Kiryu", sprite: "kiryu", x: 1520, y: 430, face: "left" },
        { script: "Kamurocho_Bowler", sprite: "punk", x: 2180, y: 410, face: "right",
          text: ["The batting cages are open all\nnight. Step up to the plate!"] },
        { script: "Kamurocho_Salaryman", sprite: "salaryman", x: 2480, y: 450, face: "left",
          text: ["Taihei Boulevard's that way.\nThe last train's long gone.", "Guess it's another night in\nKamurocho..."] },
        { script: "Kamurocho_Drinker", sprite: "drunk", x: 2860, y: 420, face: "right",
          text: ["Champion District... a maze of\nbars no bigger than a closet.", "Get lost in there and you might\nnever find your way out."] }
      ]
    },
    alley: {
      title: "The Empty Lot", image: "assets/kamurocho/alley.png", width: 609,
      floor: [[0, 412], [609, 412], [609, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3050, y: 465, facing: "left" }],
      // (the Time Machine, standing at the back of the lot)
      things: [{ image: "assets/kamurocho/time-machine.png", x: 300, y: 420, scale: 2 }],
      spots: [{ x0: 250, x1: 350, y0: 412, y1: 432, script: "Kamurocho_TimeMachine", text: "Time Machine" }],
      people: [
        { script: "Kamurocho_Lookout", sprite: "grunt", x: 120, y: 452, face: "right",
          text: ["Keep away from that empty lot.", "A man was shot there, and every\nfamily in the Tojo Clan wants\nthe 100 billion yen that's gone."] }
      ]
    },
    bacchus: {
      title: "Bacchus", image: "assets/kamurocho/bacchus.png", width: 1632,
      floor: [[0, 414], [1632, 414], [1632, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3000, y: 450, facing: "down" }],
      people: [{ script: "Kamurocho_Majima", sprite: "majima", x: 1320, y: 450, face: "left" }]
    }
  }
};
