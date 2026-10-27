// Kamurocho, side on (ui/street.js): Streets of Kamurocho's own streets (tools/build-kamurocho-sok.py), and the rest
// of Yakuza 0's put together out of its pieces (tools/build-kamurocho-streets.py; the insides drawn by
// build-kamurocho-insides.py), walked as its beat-'em-up's are, along the street and up and down its pavement.
// Each scene: its picture (480 high, the floor at the bottom), the floor you can walk on (a polygon, in the picture's pixels), its ways out (`exits`: walk off an
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
  scenes: {
    street: {
      title: "Kamurocho", image: "assets/kamurocho/street.png", width: 3103, encounters: true,
      // (the pavement by the Stardust and Poppo, down the corner past the Gyudon place, to the batting cages and
      // Bacchus)
      floor: [[0, 150], [800, 150], [1300, 392], [2900, 394], [3075, 462], [3075, 470], [1000, 470], [460, 220], [0, 220]],
      exits: [{ edge: "right", to: "alley", x: 30, y: 446, facing: "right" },
        { edge: "left", to: "nakamichi", x: 1370, y: 440, facing: "left" },
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
        { script: "Kamurocho_Kiryu", sprite: "kiryu_idle", x: 1520, y: 430, face: "left",
          text: ["Kiryu: ...Name's Kazuma Kiryu.\nDojima family.", "Or I was, till they pinned a\nkilling in that empty lot on me.", "I'll find who set me up.\nWhatever it takes."] },
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
      exits: [{ edge: "left", to: "street", x: 3050, y: 465, facing: "left" }],
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
    // (Serena's backlot, behind the bar, this game's own (tools/build-kamurocho-insides.py): out the way you came, off
    // its left, up the passage to the street; and its manhole cover, the way down to the Time Machine.)
    backlot: {
      title: "Serena's Backlot", image: "assets/kamurocho/backlot.png", width: 640,
      floor: [[0, 414], [640, 414], [640, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 544, y: 172, facing: "down" },
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
    // (tools/build-kamurocho-streets.py), each 480 high, the pavement you walk on at the bottom. Taihei Boulevard along the south, the gate of Tenkaichi
    // Street off it; Tenkaichi north to Theater Square, Nakamichi Street off its corner across to the street above
    // (Streets of Kamurocho's), Pink Street off Nakamichi and back down to Taihei, and the Champion District's lanes
    // between Pink Street and Theater Square. Turnings are spots: stand in one and press A.)
    taihei: {
      title: "Taihei Boulevard", image: "assets/kamurocho/taihei.png", width: 1600, encounters: true,
      floor: [[0, 410], [1600, 410], [1600, 470], [0, 470]],
      exits: [{ spot: [990, 1200, 410, 426], to: "tenkaichi", x: 60, y: 440, facing: "right", text: "Tenkaichi Street" },
        { edge: "right", to: "pink", x: 30, y: 440, facing: "right" }],
      people: [
        { script: "Kamurocho_Gambler", sprite: "loiterer", x: 150, y: 418, face: "right",
          text: ["Lost it all on number 7 again.", "One more go. Just one more..."] },
        { script: "Kamurocho_Commuter", sprite: "salaryman_idle", walk: "salaryman_idle_walk", range: 90, x: 460, y: 446, face: "left",
          text: ["Taihei Boulevard. Taxis all\nnight, if you can catch one.", "The gate up there's Tenkaichi\nStreet. All the food's that way."] },
        { script: "Kamurocho_Tourist", sprite: "tourist", walk: "tourist_walk", range: 80, x: 1150, y: 430, face: "right",
          text: ["So this is Kamurocho!\nThe red gate's even bigger\nthan the postcards."] },
        { script: "Kamurocho_Izakaya", sprite: "drunk_idle", walk: "drunk_idle_walk", range: 50, x: 1450, y: 456, face: "left",
          text: ["Daikichi does the best\nyakitori in town. *hic*", "...Which way's home again?"] }
      ]
    },
    tenkaichi: {
      title: "Tenkaichi Street", image: "assets/kamurocho/tenkaichi.png", width: 1400, encounters: true,
      floor: [[0, 410], [1400, 410], [1400, 470], [0, 470]],
      exits: [{ edge: "left", to: "taihei", x: 1095, y: 440, facing: "down" },
        { spot: [745, 940, 410, 426], to: "nakamichi", x: 30, y: 440, facing: "right", text: "Nakamichi Street" },
        { edge: "right", to: "theater", x: 30, y: 440, facing: "right" }],
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
      exits: [{ edge: "left", to: "tenkaichi", x: 790, y: 440, facing: "down" },
        { edge: "right", to: "street", x: 30, y: 190, facing: "right" },
        { spot: [460, 660, 410, 426], to: "pink", x: 1170, y: 440, facing: "left", text: "Pink Street" }],
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
      title: "Pink Street", image: "assets/kamurocho/pink.png", width: 1200, encounters: true,
      floor: [[0, 410], [1200, 410], [1200, 470], [0, 470]],
      exits: [{ edge: "left", to: "taihei", x: 1570, y: 440, facing: "left" },
        { edge: "right", to: "nakamichi", x: 560, y: 440, facing: "down" },
        { spot: [470, 580, 410, 426], to: "champion", x: 30, y: 444, facing: "right", text: "Champion District" }],
      people: [
        { script: "Kamurocho_PinkTout", sprite: "host_idle", x: 160, y: 418, face: "right",
          text: ["Cabaret Bijin! First drink's\non the house!", "...The second one's 8,000 yen."] },
        { script: "Kamurocho_Host", sprite: "clubgoer", walk: "clubgoer_walk", range: 60, x: 360, y: 440, face: "left",
          text: ["I'm the number one host at\nthe club over there.", "Well. Number three. This week."] },
        { script: "Kamurocho_Moon", sprite: "tourist", walk: "tourist_walk", range: 70, x: 760, y: 452, face: "right",
          text: ["Pink Street never sleeps.\nNeither does my wallet."] },
        { script: "Kamurocho_Bouncer", sprite: "thug_idle", x: 1050, y: 418, face: "left",
          text: ["Club Moon. Members only.", "...You're not a member."] }
      ]
    },
    champion: {
      title: "Champion District", image: "assets/kamurocho/champion.png", width: 900,
      floor: [[0, 414], [900, 414], [900, 466], [0, 466]],
      exits: [{ edge: "left", to: "pink", x: 520, y: 440, facing: "down" },
        { edge: "right", to: "theater", x: 1170, y: 440, facing: "left" }],
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
      title: "Theater Square", image: "assets/kamurocho/theater.png", width: 1200, encounters: true,
      floor: [[0, 410], [1200, 410], [1200, 470], [0, 470]],
      exits: [{ edge: "left", to: "tenkaichi", x: 1370, y: 440, facing: "left" },
        { edge: "right", to: "champion", x: 870, y: 440, facing: "left" }],
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
    bacchus: {
      title: "Bacchus", image: "assets/kamurocho/bacchus.png", width: 816,
      floor: [[0, 414], [816, 414], [816, 470], [0, 470]],
      exits: [{ edge: "left", to: "street", x: 3000, y: 450, facing: "down" }],
      people: [{ script: "Kamurocho_Majima", sprite: "majima_idle", x: 560, y: 450, face: "left",
          text: ["Majima: Heeey! You look like ya\ncan handle yerself!", "Name's Goro Majima.\nThe Mad Dog of Shimano!"] }]
    }
  }
};
