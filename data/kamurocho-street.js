// Kamurocho, side on (ui/street.js): Streets of Kamurocho's own streets (tools/build-kamurocho-sok.py), and the rest
// of Yakuza 0's put together out of its pieces (tools/build-kamurocho-streets.py; the insides drawn by
// build-kamurocho-insides.py), walked as its beat-'em-up's are, along the street and up and down its pavement.
// Each scene: its picture (480 high, or its `height`, the floor at the bottom), the floor you can walk on (a polygon, in the picture's pixels), its ways out (`exits`: walk off an
// edge, a door's spot and A, or a spot with `walk`: walking that way out of it, as through Poppo's door; to the
// other scene's x and y), its spots (stand in one and press A: its
// script), its `things` (pictures laid on it: the manhole cover), and its people (each a SoK sprite from
// assets/kamurocho/people, standing at ease rather than squaring up as in a fight (the "_idle" frames), their
// scripts and words as ui/game.js knows them: Kamurocho_Kiryu and the rest; `face` the way they look; and those
// with a `walk`, its frames, amble up and down within `range` of where they stand). Fights are with the gangs that
// walk the streets with `encounters` (REALM_ENCOUNTERS.Kamurocho's groups, ui/street.js), never in the alley, the
// backlot, the drain, the Champion District, the bar or a shop. Every convenience store on the street (Poppo's
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
  // (The foes with walks of their own, people/<street>_walk.png (REALM_FOES' `street`); and what each gang's leader
  // says when they've caught you, by his foe.)
  foeWalks: ["punk", "biker", "shakedown", "grunt", "thug", "drunk", "knife", "host", "majima"],
  barks: {
    punk: ["Hey, you! Got a problem?", "Oi! You lookin' at me?", "Nice face. Shame about it."],
    drunk: ["Whaddya starin' at, huh? *hic*", "You spilled my drink! ...Where's my drink?"],
    thug: ["You bumped me, pal. That'll cost ya.", "Wrong street, buddy."],
    knife: ["Your wallet. Now.", "Don't make me use this."],
    host: ["You're scarin' off my customers.", "This is our corner. Beat it."],
    biker: ["Nice night for a beatin', huh?", "Outta the way, punk!"],
    grunt: ["This is Tojo turf. Pay up.", "The family don't like strangers."],
    shakedown: ["Hand over your cash, kid.", "Everybody pays Mr. Shakedown."]
  },
  // The map (the start menu's MAP, ui/game.js realmMap), Yakuza 0's: the town's blocks in grey, its streets dark
  // between them, West Park in blue at the top, its numbers on it and their names down the side; the street you're
  // on lit, and you a blinking mark along it, as far along as you've walked. Its points are as on Yakuza 0's map
  // (a picture of it 561x434, the town in x 60-392, y 45-400; drawn at 0.43). `outline`: the town's edge; `park`
  // and `buildings` (x0, y0, x1, y1); `legend`: each number, its name, the scene it's of (or none) and where it's
  // written on the map. Each scene: its line (its picture's left end first) and how wide (`w`, on the screen); a
  // place inside one (a shop, a bar) is a spot on the line of the street it's off (`at`: that scene, and how far
  // along it).
  map: {
    outline: [[62, 120], [82, 75], [140, 62], [190, 50], [362, 50], [372, 140], [374, 382], [352, 398], [140, 398], [114, 376], [88, 282], [60, 252]],
    park: [195, 50, 362, 137],
    buildings: [[62, 176, 90, 214], [127, 172, 157, 192], [165, 182, 182, 205], [157, 120, 175, 140], [300, 150, 317, 167],
      [252, 106, 262, 116], [318, 352, 326, 360], [210, 340, 222, 352], [262, 288, 272, 298]],
    legend: [[1, "Tenkaichi St.", "tenkaichi", [133, 332]], [2, "Nakamichi St.", "nakamichi", [202, 340]], [3, "Theater Alley", "theater-alley", [99, 236]],
      [4, "Taihei Blvd.", "taihei", [180, 254]], [5, "Theater Square", "theater", [184, 198]], [6, "Shichifuku E.", "shichifuku", [272, 178]],
      [7, "Shichifuku St.", "shichifuku", [226, 160]], [8, "Shichifuku W.", "shichifuku", [118, 154]], [9, "Hotel District", "hotels", [156, 90]],
      [10, "West Park", null, [272, 86]], [11, "Kamuro Shopping", "street", [256, 250]], [12, "Empty Lot", "alley", [243, 214]],
      [13, "Pink Street", "pink", [330, 312]], [14, "Champion Dist.", "champion", [344, 236]], [15, "Showa Street", "showa", [250, 375]],
      [16, "Senryo Ave.", "senryo", [354, 296]], [17, "Nakamichi Alley", "nakamichi-alley", [160, 344]], [18, "Pink Alley", "pink-alley", [332, 346]]],
    scenes: {
      taihei: { line: [[95, 266], [368, 266]], w: 5 },
      tenkaichi: { line: [[142, 266], [142, 389]], w: 3 },
      nakamichi: { line: [[197, 266], [197, 389]], w: 3 },
      showa: { line: [[142, 389], [368, 389]], w: 3 },
      pink: { line: [[303, 389], [311, 266], [314, 190]], w: 3 },
      senryo: { line: [[368, 389], [368, 190]], w: 4 },
      shichifuku: { line: [[92, 165], [205, 165], [240, 175], [240, 190], [368, 190]], w: 3 },
      hotels: { line: [[145, 165], [145, 68], [185, 68], [185, 165]], w: 2 },
      "theater-alley": { line: [[95, 266], [95, 165]], w: 2 },
      theater: { line: [[168, 262], [168, 178], [228, 178], [228, 222]], w: 2, square: [168, 178, 228, 262] },
      street: { line: [[268, 266], [268, 198], [246, 205], [240, 212]], w: 2 },
      alley: { line: [[240, 212], [228, 222]], w: 2 },
      champion: { line: [[314, 226], [340, 226], [340, 208], [358, 208], [358, 226], [368, 226]], w: 1 },
      "nakamichi-alley": { line: [[142, 338], [170, 338], [170, 322], [197, 322]], w: 1 },
      "pink-alley": { line: [[306, 344], [368, 344]], w: 1 },
      heroine: { at: ["theater", 0.94] }, poppo: { at: ["street", 0.24] }, backlot: { at: ["street", 0.17] }, sewer: { at: ["street", 0.17] }, bacchus: { at: ["street", 0.97] }
    }
  },
  scenes: {
    street: {
      title: "Kamurocho", image: "assets/kamurocho/street.png", width: 3103, encounters: true,
      // (the pavement by the Stardust and Poppo, down the corner past the Gyudon place, to the batting cages and
      // Bacchus)
      floor: [[0, 150], [800, 150], [1300, 392], [2900, 394], [3075, 462], [3075, 470], [1000, 470], [460, 220], [0, 220]],
      exits: [{ edge: "right", to: "alley", x: 30, y: 446, facing: "right" },
        { edge: "left", to: "taihei", x: 1346, y: 440, facing: "down" },
        { spot: [2960, 3040, 425, 452], to: "bacchus", x: 40, y: 448, facing: "right", text: "Bacchus" },
        { spot: [670, 770, 150, 168], to: "poppo", x: 59, y: 420, facing: "down", text: "Poppo" },
        // (down the passage beside Serena's door, to its backlot)
        { spot: [496, 592, 150, 168], to: "backlot", x: 30, y: 440, facing: "right", text: "Serena's Backlot" }],
      people: [
        { script: "Kamurocho_Tout", sprite: "host_idle", x: 150, y: 172, face: "right",
          text: ["Maharaja's the hottest disco in\nKamurocho!", "The dance floor never sleeps.\nNeither does this town."] },
        { script: "Kamurocho_Clubgoer", sprite: "clubgoer", walk: "clubgoer_walk", range: 70, x: 330, y: 186, face: "left",
          text: ["Pink Street's lit up all night.", "Every club round here wants a\nregular. I'm everybody's."] },
        { script: "Kamurocho_Thug", sprite: "thug_idle", walk: "thug_idle_walk", range: 60, x: 1110, y: 360, face: "left",
          text: ["Whaddya lookin' at?", "...Hmph. Smile Burger's got the\nbest burgers in town. Don't tell\nanyone I said that."] },
        { script: "Kamurocho_Bowler", sprite: "loiterer", x: 2180, y: 410, face: "right",
          text: ["The batting cages are open all\nnight. Step up to the plate!"] },
        { script: "Kamurocho_Salaryman", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 80, x: 2480, y: 450, face: "left",
          text: ["Taihei Boulevard's that way.\nThe last train's long gone.", "Guess it's another night in\nKamurocho..."] },
        { script: "Kamurocho_Drinker", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 2860, y: 420, face: "right",
          text: ["Champion District... a maze of\nbars no bigger than a closet.", "Get lost in there and you might\nnever find your way out."] }
      ]
    },
    alley: {
      title: "The Empty Lot", image: "assets/kamurocho/alley.png", width: 609,
      floor: [[0, 412], [609, 412], [609, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3050, y: 465, facing: "left" },
        { edge: "right", to: "theater", x: 1270, y: 440, facing: "left" }],
      people: [
        { script: "Kamurocho_Lookout", sprite: "grunt_idle", walk: "grunt_idle_walk", range: 60, x: 120, y: 452, face: "right",
          text: ["Keep away from that empty lot.", "A man was shot there, and every\nfamily in the Tojo Clan wants\nthe 100 billion yen that's gone."] }
      ]
    },
    // (Inside Poppo, the convenience store: this game's own, tools/build-kamurocho-insides.py. Its clerk's behind the
    // counter: stand before it and press A to buy.)
    poppo: {
      title: "Poppo", image: "assets/kamurocho/poppo.png", width: 800,
      floor: [[16, 414], [800, 414], [800, 470], [16, 470]],
      // (out through the glass door on the left: walk up into it, or press A before it)
      exits: [{ spot: [20, 98, 414, 424], walk: "up", to: "street", x: 720, y: 172, facing: "down", text: "Door" }],
      spots: [{ x0: 548, x1: 790, y0: 414, y1: 470, script: "Kamurocho_Clerk", text: "Clerk" }]
    },
    // (Serena's backlot, behind the bar, this game's own (tools/build-kamurocho-insides.py): out the way you came, up
    // the passage at its left to the street; and its manhole cover, the way down to the Time Machine.)
    backlot: {
      title: "Serena's Backlot", image: "assets/kamurocho/backlot.png", width: 640,
      floor: [[0, 414], [640, 414], [640, 470], [0, 470]],
      // (out up the lit passage at its left, as into Poppo's door: walk up into it, or press A before it)
      exits: [{ spot: [8, 68, 414, 424], walk: "up", to: "street", x: 544, y: 172, facing: "down", text: "To the street" },
        { spot: [394, 450, 436, 466], to: "sewer", x: 90, y: 440, facing: "right", text: "Manhole" }],
      things: [{ image: "assets/kamurocho/manhole.png", x: 422, y: 458, scale: 1, floor: true }]
    },
    // (Under the manhole in Serena's backlot: the storm drain where the Time Machine stands,
    // tools/build-kamurocho-insides.py. The ladder's the way back up.)
    sewer: {
      title: "Under the Street", image: "assets/kamurocho/sewer.png", width: 640,
      floor: [[0, 414], [640, 414], [640, 470], [0, 470]],
      exits: [{ spot: [40, 124, 414, 446], to: "backlot", x: 422, y: 446, facing: "down", text: "Ladder up" }],
      spots: [{ x0: 236, x1: 364, y0: 414, y1: 470, script: "Kamurocho_TimeMachine", text: "Time Machine" }]
    },
    // (Yakuza 0's other streets, this game's own, put together out of Streets of Kamurocho's pieces
    // (tools/build-kamurocho-streets.py), each 480 high, the pavement you walk on at the bottom, laid out as Yakuza
    // 0's map has them: Taihei Boulevard across the middle; Tenkaichi Street, Nakamichi Street and Pink Street south
    // off it to Showa Street along the bottom, Nakamichi Alley between the first two; Theater Square and the Kamuro
    // Shopping Area (Streets of Kamurocho's street) north of it, the Empty Lot between them; Pink Street on north to
    // Shichifuku Street, the Champion District off it; Senryo Avenue up the east, Theater Alley up the west, and
    // Shichifuku Street across the top, the Hotel District above it. Turnings are spots: stand in one and press A.)
    taihei: {
      // (640 high: its road below the pavement, two lanes each way and a zebra crossing at the gate, the far side's
      // guard rail; walk out across it and the street goes up off the top)
      title: "Taihei Boulevard", image: "assets/kamurocho/taihei.png", width: 2100, height: 640, encounters: true,
      floor: [[0, 410], [2100, 410], [2100, 600], [0, 600]],
      // (west to east: the gate of Tenkaichi Street, the passage up into Theater Square, Nakamichi Street, the way up
      // into the Kamuro Shopping Area, Pink Street; Theater Alley off its west end, Senryo Avenue its east)
      exits: [{ spot: [130, 344, 410, 426], to: "tenkaichi", x: 60, y: 440, facing: "right", text: "Tenkaichi Street" },
        { spot: [382, 466, 410, 426], to: "theater", x: 30, y: 440, facing: "right", text: "Theater Square" },
        { spot: [700, 900, 410, 426], to: "nakamichi", x: 30, y: 440, facing: "right", text: "Nakamichi Street" },
        { spot: [1302, 1390, 410, 426], to: "street", x: 30, y: 190, facing: "right", text: "Kamuro Shopping Area" },
        { spot: [1640, 1845, 410, 426], to: "pink", x: 888, y: 440, facing: "right", text: "Pink Street" },
        { edge: "left", to: "theater-alley", x: 30, y: 440, facing: "right" },
        { edge: "right", to: "senryo", x: 864, y: 440, facing: "right" }],
      people: [
        { script: "Kamurocho_Gambler", sprite: "loiterer", x: 560, y: 418, face: "right",
          text: ["Lost it all on number 7 again.", "One more go. Just one more..."] },
        { script: "Kamurocho_Commuter", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 90, x: 460, y: 446, face: "left",
          text: ["Taihei Boulevard. Taxis all\nnight, if you can catch one.", "The red gate's Tenkaichi\nStreet. All the food's that way."] },
        { script: "Kamurocho_Tourist", sprite: "tourist", walk: "tourist_walk", range: 80, x: 240, y: 430, face: "right",
          text: ["So this is Kamurocho!\nThe red gate's even bigger\nthan the postcards."] },
        { script: "Kamurocho_Izakaya", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 1450, y: 456, face: "left",
          text: ["Daikichi does the best\nyakitori in town. *hic*", "...Which way's home again?"] },
        { script: "Kamurocho_Cabbie", sprite: "salaryman_idle", x: 700, y: 560, face: "right",
          text: ["No fares tonight. Everybody's\nwalking.", "Taihei's the widest road in\nKamurocho. Mind the lanes."] }
      ]
    },
    tenkaichi: {
      title: "Tenkaichi Street", image: "assets/kamurocho/tenkaichi.png", width: 1400, encounters: true,
      floor: [[0, 410], [1400, 410], [1400, 470], [0, 470]],
      exits: [{ edge: "left", to: "taihei", x: 237, y: 440, facing: "down" },
        { spot: [745, 940, 410, 426], to: "nakamichi-alley", x: 30, y: 440, facing: "right", text: "Nakamichi Alley" },
        { edge: "right", to: "showa", x: 30, y: 440, facing: "right" }],
      people: [
        { script: "Kamurocho_Foodie", sprite: "clubgoer", walk: "clubgoer_walk", range: 70, x: 330, y: 444, face: "right",
          text: ["Sushi, ramen, burgers...\nTenkaichi's got it all.", "Hungry yet? I always am."] },
        { script: "Kamurocho_Gamer", sprite: "reveller", walk: "reveller_walk", range: 60, x: 590, y: 424, face: "left",
          text: ["The crane game's rigged.\nI've put 5,000 yen in it.", "I'm SO close this time."] },
        { script: "Kamurocho_BurgerFan", sprite: "thug_idle", walk: "thug_idle_walk", range: 50, x: 990, y: 452, face: "left",
          text: ["Smile Burger. Twice a day,\nevery day.", "...What? A man's gotta eat."] },
        { script: "Kamurocho_Robata", sprite: "host_idle", x: 1250, y: 418, face: "left",
          text: ["Robatayaki, fresh off the\ngrill! Come on in!"] }
      ]
    },
    nakamichi: {
      title: "Nakamichi Street", image: "assets/kamurocho/nakamichi.png", width: 1400, encounters: true,
      floor: [[0, 410], [1400, 410], [1400, 470], [0, 470]],
      exits: [{ edge: "left", to: "taihei", x: 800, y: 440, facing: "down" },
        { edge: "right", to: "showa", x: 374, y: 440, facing: "down" },
        { spot: [460, 660, 410, 426], to: "nakamichi-alley", x: 770, y: 440, facing: "left", text: "Nakamichi Alley" }],
      people: [
        { script: "Kamurocho_Regular", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 70, x: 140, y: 440, face: "right",
          text: ["The coffee at Alps is awful.\nI come every night anyway."] },
        { script: "Kamurocho_Charmed", sprite: "reveller", walk: "reveller_walk", range: 60, x: 400, y: 456, face: "right",
          text: ["Club Charles... the girls\nthere know my name.", "And my wallet's."] },
        { script: "Kamurocho_Pawn", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 860, y: 430, face: "left",
          text: ["Pawned my watch. Pawned my\ncoat. Next it's the shoes."] },
        { script: "Kamurocho_Yakuza", sprite: "grunt_idle", walk: "grunt_idle_walk", range: 60, x: 1240, y: 450, face: "left",
          text: ["Keep your head down on\nNakamichi.", "Every bar here pays someone."] }
      ]
    },
    pink: {
      title: "Pink Street", image: "assets/kamurocho/pink.png", width: 1440, encounters: true,
      floor: [[0, 410], [1440, 410], [1440, 470], [0, 470]],
      // (north from Showa Street, across Taihei Boulevard, to Shichifuku Street East)
      exits: [{ edge: "left", to: "showa", x: 1140, y: 440, facing: "down" },
        { edge: "right", to: "shichifuku", x: 1091, y: 440, facing: "down" },
        { spot: [374, 462, 410, 426], to: "pink-alley", x: 30, y: 440, facing: "right", text: "Pink Alley" },
        { spot: [786, 991, 410, 426], to: "taihei", x: 1742, y: 440, facing: "down", text: "Taihei Boulevard" },
        { spot: [1145, 1252, 410, 426], to: "champion", x: 30, y: 444, facing: "right", text: "Champion District" }],
      people: [
        { script: "Kamurocho_PinkTout", sprite: "host_idle", x: 160, y: 418, face: "right",
          text: ["Cabaret Bijin! First drink's\non the house!", "...The second one's 8,000 yen."] },
        { script: "Kamurocho_Host", sprite: "clubgoer", walk: "clubgoer_walk", range: 60, x: 360, y: 440, face: "left",
          text: ["I'm the number one host at\nthe club over there.", "Well. Number three. This week."] },
        { script: "Kamurocho_Moon", sprite: "tourist", walk: "tourist_walk", range: 70, x: 1080, y: 452, face: "right",
          text: ["Pink Street never sleeps.\nNeither does my wallet."] },
        { script: "Kamurocho_Bouncer", sprite: "thug_idle", x: 560, y: 418, face: "left",
          text: ["Club Moon. Members only.", "...You're not a member."] }
      ]
    },
    champion: {
      title: "Champion District", image: "assets/kamurocho/champion.png", width: 900,
      floor: [[0, 414], [900, 414], [900, 466], [0, 466]],
      exits: [{ edge: "left", to: "pink", x: 1198, y: 440, facing: "down" },
        { edge: "right", to: "senryo", x: 1160, y: 440, facing: "down" }],
      people: [
        { script: "Kamurocho_BarHopper", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 60, x: 220, y: 446, face: "right",
          text: ["Fifty bars, three seats each.\nI've sat in every one.", "*hic* ...Twice."] },
        { script: "Kamurocho_MamaSan", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 50, x: 560, y: 430, face: "left",
          text: ["Snack Koi's mama-san pours\na stiff whisky.", "Don't sing karaoke there.\nShe'll make you finish the song."] },
        { script: "Kamurocho_Lanterns", sprite: "loiterer", x: 800, y: 420, face: "left",
          text: ["The Champion District.\nGet lost in here and you\nmight never find your way out."] }
      ]
    },
    theater: {
      title: "Theater Square", image: "assets/kamurocho/theater.png", width: 1300, encounters: true,
      floor: [[0, 410], [1300, 410], [1300, 470], [0, 470]],
      // (round the square from Taihei Boulevard: up its west side, the Kamuro Theater's along its north, Heroine on its
      // east, and out past it to the Empty Lot)
      exits: [{ edge: "left", to: "taihei", x: 424, y: 440, facing: "down" },
        { edge: "right", to: "alley", x: 30, y: 446, facing: "right" },
        // (round the back of the Kamuro Theater, by its stage door, to Theater Alley)
        { spot: [400, 520, 410, 426], to: "theater-alley", x: 536, y: 440, facing: "down", text: "Theater Alley" },
        { spot: [840, 960, 410, 426], to: "shichifuku", x: 500, y: 440, facing: "down", text: "Shichifuku Street" },
        // (Heroine, the karaoke bar, its pink neon over its door)
        { spot: [1160, 1280, 410, 426], to: "heroine", x: 60, y: 432, facing: "right", text: "Heroine" }],
      people: [
        { script: "Kamurocho_Moviegoer", sprite: "tourist", walk: "tourist_walk", range: 80, x: 160, y: 440, face: "right",
          text: ["The late show at Kamuro Cinema\nis a yakuza picture.", "Like we don't get enough\nof that out here."] },
        { script: "Kamurocho_Busker", sprite: "loiterer", x: 470, y: 418, face: "right",
          text: ["Meet me by the fountain, she\nsaid. That was two hours ago."] },
        { script: "Kamurocho_Theatre", sprite: "clubgoer", walk: "clubgoer_walk", range: 70, x: 760, y: 456, face: "left",
          text: ["The Kamuro Theater! Opening\nnight's sold out.", "The square's the heart of\nKamurocho, they say."] },
        { script: "Kamurocho_Square", sprite: "grunt_idle", walk: "grunt_idle_walk", range: 60, x: 1080, y: 430, face: "left",
          text: ["The Tojo Clan's got eyes all\nover this square."] }
      ]
    },
    // (More of Yakuza 0's Kamurocho, put together the same way.)
    showa: {
      title: "Showa Street", image: "assets/kamurocho/showa.png", width: 1560, encounters: true,
      floor: [[0, 410], [1560, 410], [1560, 470], [0, 470]],
      // (along the south, west to east: the foot of Tenkaichi Street, of Nakamichi Street, of Pink Street; Senryo
      // Avenue at its east end)
      exits: [{ edge: "left", to: "tenkaichi", x: 1370, y: 440, facing: "left" },
        { edge: "right", to: "senryo", x: 30, y: 440, facing: "right" },
        { spot: [332, 416, 410, 426], to: "nakamichi", x: 1370, y: 440, facing: "left", text: "Nakamichi Street" },
        { spot: [1037, 1242, 410, 426], to: "pink", x: 30, y: 440, facing: "right", text: "Pink Street" }],
      people: [
        { script: "Kamurocho_Bargain", sprite: "tourist", walk: "tourist_walk", range: 80, x: 320, y: 444, face: "right",
          text: ["The discount store's got\neverything. Everything!", "I came for toothpaste. I'm\nleaving with a massage chair."] },
        { script: "Kamurocho_Mahjong", sprite: "loiterer", x: 900, y: 418, face: "left",
          text: ["The mahjong parlour upstairs\nnever closes.", "Neither do the debts."] },
        { script: "Kamurocho_Realtor", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 70, x: 1300, y: 452, face: "left",
          text: ["Land's the only thing worth\nhaving in this town.", "Every lot in Kamurocho's worth\na fortune. And a funeral."] }
      ]
    },
    senryo: {
      title: "Senryo Avenue", image: "assets/kamurocho/senryo.png", width: 1400, encounters: true,
      floor: [[0, 410], [1400, 410], [1400, 470], [0, 470]],
      // (along the east, south to north: Showa Street's end, Pink Alley, Taihei Boulevard's east end, Shichifuku
      // Street East's)
      exits: [{ edge: "left", to: "showa", x: 1530, y: 440, facing: "left" },
        { edge: "right", to: "shichifuku", x: 1370, y: 440, facing: "left" },
        { spot: [243, 356, 410, 426], to: "pink-alley", x: 770, y: 440, facing: "left", text: "Pink Alley" },
        { spot: [762, 967, 410, 426], to: "taihei", x: 2070, y: 440, facing: "left", text: "Taihei Boulevard" }],
      people: [
        { script: "Kamurocho_Banker", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 80, x: 180, y: 446, face: "right",
          text: ["The banks on Senryo lend to\nanyone with land to sell.", "The whole country's buying.\nIt can't ever stop."] },
        { script: "Kamurocho_Arcade", sprite: "reveller", walk: "reveller_walk", range: 60, x: 470, y: 430, face: "left",
          text: ["The new fighting game's in!\nI've been here since noon."] },
        { script: "Kamurocho_Commuter2", sprite: "loiterer", x: 220, y: 418, face: "right",
          text: ["The bus doesn't come this\nlate. I wait anyway."] },
        { script: "Kamurocho_Patient", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 1060, y: 456, face: "left",
          text: ["The clinic stitched me up\nno questions asked.", "...That's the third time\nthis month."] }
      ]
    },
    hotels: {
      title: "Hotel District", image: "assets/kamurocho/hotels.png", width: 1300, encounters: true,
      floor: [[0, 410], [1300, 410], [1300, 470], [0, 470]],
      // (up from Shichifuku Street West and round, back down to it)
      exits: [{ edge: "left", to: "shichifuku", x: 222, y: 440, facing: "down" },
        { edge: "right", to: "shichifuku", x: 340, y: 440, facing: "down" }],
      people: [
        { script: "Kamurocho_HotelTout", sprite: "host_idle", x: 120, y: 418, face: "right",
          text: ["Hotel Venus! Rooms by the\nhour, no questions asked."] },
        { script: "Kamurocho_Couple", sprite: "clubgoer", walk: "clubgoer_walk", range: 70, x: 520, y: 446, face: "left",
          text: ["We're... just looking for\nthe station. Honest."] },
        { script: "Kamurocho_Valet", sprite: "thug_idle", x: 700, y: 418, face: "left",
          text: ["Parking's full. Has been\nsince 1985."] },
        { script: "Kamurocho_Detective", sprite: "grunt_idle", walk: "grunt_idle_walk", range: 60, x: 1040, y: 452, face: "left",
          text: ["Private eye. I'm waiting\nfor someone's husband.", "...He's been in there\nthree hours."] }
      ]
    },
    shichifuku: {
      title: "Shichifuku Street", image: "assets/kamurocho/shichifuku.png", width: 1400, encounters: true,
      floor: [[0, 410], [1400, 410], [1400, 470], [0, 470]],
      // (across the north, west to east: Theater Alley's top, the Hotel District, Theater Square, Pink Street's top,
      // Senryo Avenue)
      exits: [{ edge: "left", to: "theater-alley", x: 670, y: 440, facing: "left" },
        { edge: "right", to: "senryo", x: 1370, y: 440, facing: "left" },
        { spot: [180, 264, 410, 426], to: "hotels", x: 30, y: 440, facing: "right", text: "Hotel District" },
        { spot: [438, 563, 410, 426], to: "theater", x: 900, y: 440, facing: "down", text: "Theater Square" },
        { spot: [989, 1194, 410, 426], to: "pink", x: 1410, y: 440, facing: "left", text: "Pink Street" }],
      people: [
        { script: "Kamurocho_Oden", sprite: "loiterer", x: 120, y: 418, face: "right",
          text: ["Oden on a cold night.\nNothing better.", "The daikon's been simmering\nsince this morning."] },
        { script: "Kamurocho_Pawned", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 60, x: 420, y: 450, face: "right",
          text: ["The pawn shop gave me 3,000\nyen for my wedding ring.", "...Don't tell my wife."] },
        { script: "Kamurocho_Foreman", sprite: "thug_idle", x: 1300, y: 418, face: "left",
          text: ["Construction site. Keep out.", "Somebody's going to build\nsomething big here, they say."] },
        { script: "Kamurocho_Noodles", sprite: "reveller", walk: "reveller_walk", range: 60, x: 860, y: 440, face: "left",
          text: ["The ramen place on Shichifuku's\nopen till 5 in the morning."] }
      ]
    },
    // (The back alleys: no fights.)
    "nakamichi-alley": {
      title: "Nakamichi Alley", image: "assets/kamurocho/nakamichi-alley.png", width: 800,
      floor: [[0, 414], [800, 414], [800, 468], [0, 468]],
      // (between Tenkaichi Street and Nakamichi Street)
      exits: [{ edge: "left", to: "tenkaichi", x: 843, y: 440, facing: "down" },
        { edge: "right", to: "nakamichi", x: 558, y: 440, facing: "down" }],
      people: [
        { script: "Kamurocho_Loanshark", sprite: "grunt_idle", x: 300, y: 420, face: "left",
          text: ["You need money? Everybody\nneeds money.", "Ten percent. Every ten days.\nFair's fair."] },
        { script: "Kamurocho_Smoker", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 600, y: 452, face: "right",
          text: ["Back here's the only place\nthe manager can't find me."] }
      ]
    },
    "pink-alley": {
      title: "Pink Alley", image: "assets/kamurocho/pink-alley.png", width: 800,
      floor: [[0, 414], [800, 414], [800, 468], [0, 468]],
      exits: [{ edge: "left", to: "pink", x: 418, y: 440, facing: "down" },
        { edge: "right", to: "senryo", x: 300, y: 440, facing: "down" }],
      people: [
        { script: "Kamurocho_Mimi", sprite: "host_idle", x: 520, y: 418, face: "left",
          text: ["Bar Mimi's got three stools\nand one rule: no fighting.", "...Outside's a different\nmatter."] },
        { script: "Kamurocho_Lost", sprite: "tourist", walk: "tourist_walk", range: 60, x: 220, y: 450, face: "right",
          text: ["Is this Senryo Avenue?\nIt's all alleys back here."] }
      ]
    },
    "theater-alley": {
      title: "Theater Alley", image: "assets/kamurocho/theater-alley.png", width: 700,
      floor: [[0, 414], [700, 414], [700, 468], [0, 468]],
      // (up the west side, from Taihei Boulevard's west end to Shichifuku Street West's; the Kamuro Theater's
      // stage door to the square)
      exits: [{ edge: "left", to: "taihei", x: 30, y: 440, facing: "right" },
        { edge: "right", to: "shichifuku", x: 30, y: 440, facing: "right" },
        { spot: [495, 577, 414, 428], to: "theater", x: 460, y: 440, facing: "down", text: "Stage door" }],
      people: [
        { script: "Kamurocho_Actor", sprite: "clubgoer", walk: "clubgoer_walk", range: 60, x: 280, y: 446, face: "right",
          text: ["The stage door's this way.\nI've got the lead tonight!", "...I'm the third guard from\nthe left. It's a start."] },
        { script: "Kamurocho_Fan", sprite: "reveller", x: 380, y: 420, face: "right",
          text: ["I'm waiting for an autograph.\nThe star always leaves this way."] }
      ]
    },
    // (Heroine, the karaoke bar off Theater Square, this game's own (tools/build-kamurocho-insides.py): where Kiryu
    // and Nishiki go drinking as Yakuza 0 begins. Out through its door on the left; its stage, A, to sing.)
    heroine: {
      title: "Heroine", image: "assets/kamurocho/heroine.png", width: 760,
      floor: [[0, 414], [760, 414], [760, 470], [0, 470]],
      exits: [{ spot: [12, 92, 414, 424], walk: "up", to: "theater", x: 1210, y: 420, facing: "down", text: "Door" }],
      spots: [{ x0: 560, x1: 740, y0: 414, y1: 440, script: "Kamurocho_Karaoke", text: "Karaoke" }],
      people: [
        { script: "Kamurocho_Kiryu", sprite: "kiryu_idle", x: 300, y: 446, face: "right",
          text: ["Kiryu: ...Name's Kazuma Kiryu.\nDojima family.", "Nishiki and I grew up together.\nSworn brothers, the both of us."] },
        { script: "Kamurocho_Nishiki", sprite: "nishiki", x: 400, y: 446, face: "left",
          text: ["Nishiki: Akira Nishikiyama! Kiryu's\nsworn brother.", "Grab a mic! Nobody leaves\nHeroine without a song."] }
      ]
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
