// Orre: Colosseum's other Trainers in the Pyrite Building and Pyrite Cave, and Miror B.'s room after him (game/orre-trainers.js).
// Parties: Colosseum's (altissimo1's guide). Words: Colosseum's, by id (assets/text/colosseum.json). Who says which unnamed
// line: Colosseum numbers each Trainer's lines together, one after another across its tables: before the battle (the
// place's unnamed lines), beaten (fight_common's named line), after (the place's named line); a second run of them is the
// later stage's. The Pyrite Building's 2F Trainers are on its 1F here, its 3F Trainers on the top floor (this game has
// those two floors). Stages: from 24 (the building's open), 26 (Miror B.'s cave), 33 (Dakim beaten), 44 (Evice beaten).
"use strict";

(function () {
  window.Orre.addTrainers({
    // (1F, by the elevator)
    PyriteTown_PyriteBuilding_1F_EventScript_Colo_KAI: { name: "Chaser Kai", cls: "Chaser", map: "PyriteTown_PyriteBuilding_1F", x: 15, y: 3, facing: "face_left",
      stages: [{ from: 24, team: [["Phanpy",31], ["Trapinch",32]], // #20470, 21857 / 23228 / 23230
        intro: ["Too bad for you! This elevator is\noff-limits!", "This guy… He's that {PLAYER} guy that\nMiror B.'d been carrying on about!"],
        defeat: ["This didn't happen!"],
        after: ["No matter what, this elevator is\noff-limits!"] },
        { from: 33, team: [["Phanpy",38], ["Vibrava",38]], // #20470 / 23228 / 23230
        intro: ["Too bad for you! This elevator is\noff-limits!"],
        defeat: ["This didn't happen!"],
        after: ["No matter what, this elevator is\noff-limits!"] }] },
    // (1F)
    PyriteTown_PyriteBuilding_1F_EventScript_Colo_PIKE: { name: "Roller Boy Pike", cls: "Roller Boy", map: "PyriteTown_PyriteBuilding_1F", x: 10, y: 7, facing: "face_down",
      stages: [{ from: 24, team: [["Taillow",33], ["Hoothoot",34]], // #23231 / 23233 / 23236
        intro: ["What do you think you're doing here?!"],
        defeat: ["Too strong for me!"],
        after: ["Urgh… I'm no match… I must level up\nsome more…"] },
        { from: 33, team: [["Taillow",40], ["Noctowl",41]], // #23231 / 23233 / 23236
        intro: ["What do you think you're doing here?!"],
        defeat: ["Too strong for me!"],
        after: ["Urgh… I'm no match… I must level up\nsome more…"] }] },
    // (Colosseum's 2F)
    PyriteTown_PyriteBuilding_2F_EventScript_Colo_GEATS: { name: "Bandana Guy Geats", cls: "Bandana Guy", map: "PyriteTown_PyriteBuilding_2F", x: 5, y: 5, facing: "face_right",
      stages: [{ from: 24, team: [["Barboach",32], ["Larvitar",31], ["Carvanha",32]], // #23125 / 23126 / 23128
        intro: ["Fufufu… My Pokémon are looking for\nthe chance to go wild! Booyah!"],
        defeat: ["I want to go wilder!"],
        after: ["My Pokémon don't look like they've\ngone wild enough, but I'll let you\noff with just this, this time."] },
        { from: 33, team: [["Barboach",39], ["Pupitar",38], ["Carvanha",38]], // #23125 / 23126 / 23128
        intro: ["Fufufu… My Pokémon are looking for\nthe chance to go wild! Booyah!"],
        defeat: ["I want to go wilder!"],
        after: ["My Pokémon don't look like they've\ngone wild enough, but I'll let you\noff with just this, this time."] }] },
    // (Colosseum's 2F)
    PyriteTown_PyriteBuilding_2F_EventScript_Colo_GEARE: { name: "Hunter Geare", cls: "Hunter", map: "PyriteTown_PyriteBuilding_2F", x: 13, y: 5, facing: "face_left",
      stages: [{ from: 24, team: [["Remoraid",33], ["Magnemite",32]], // #23157 / 23159 / 23161
        intro: ["Abnormality detected! Target locked\non!"],
        defeat: ["Emergency! Mayday, mayday!"],
        after: ["Abnormality detected in friendly\nPokémon…"] },
        { from: 33, team: [["Remoraid",39], ["Magnemite",39]], // #23157 / 23159 / 23161
        intro: ["Abnormality detected! Target locked\non!"],
        defeat: ["Emergency! Mayday, mayday!"],
        after: ["Abnormality detected in friendly\nPokémon…"] }] },
    // (Colosseum's 2F)
    PyriteTown_PyriteBuilding_2F_EventScript_Colo_LOBA: { name: "Bandana Guy Loba", cls: "Bandana Guy", map: "PyriteTown_PyriteBuilding_2F", x: 4, y: 8, facing: "face_up",
      stages: [{ from: 24, team: [["Wingull",32], ["Wooper",33]], // #23185 / 23186 / 23187
        intro: ["My beloved Pokémon! See? Giggle…\nFresh prey!"],
        defeat: ["Aiyeeeh! My beloved Pokémon!"],
        after: ["Waaaaaaah! My beloved Pokémon are all\nbeat up!"] },
        { from: 33, team: [["Wingull",41], ["Wooper",40]], // #23185 / 23186 / 23187
        intro: ["My beloved Pokémon! See? Giggle…\nFresh prey!"],
        defeat: ["Aiyeeeh! My beloved Pokémon!"],
        after: ["Waaaaaaah! My beloved Pokémon are all\nbeat up!"] }] },
    // (Colosseum's 2F)
    PyriteTown_PyriteBuilding_2F_EventScript_Colo_AKMEN: { name: "Bodybuilder Akmen", cls: "Bodybuilder", map: "PyriteTown_PyriteBuilding_2F", x: 17, y: 7, facing: "face_left",
      stages: [{ from: 24, team: [["Electrike",31], ["Voltorb",31]], // #23097 / 23099 / 23101
        intro: ["You're like Bug Pokémon drawn to a\ncandle! I'm going with these Pokémon!"],
        defeat: ["This wasn't good enough… This is a\ndilemma…"],
        after: ["No glory for the fallen… I'm crushed…"] },
        { from: 33, team: [["Electrike",40], ["Voltorb",40]], // #23097 / 23099 / 23101
        intro: ["You're like Bug Pokémon drawn to a\ncandle! I'm going with these Pokémon!"],
        defeat: ["This wasn't good enough… This is a\ndilemma…"],
        after: ["No glory for the fallen… I'm crushed…"] }] },
    // (Colosseum's 3F)
    PyriteTown_PyriteBuilding_3F_EventScript_Colo_RALEEN: { name: "Rider Raleen", cls: "Rider", map: "PyriteTown_PyriteBuilding_3F", x: 5, y: 5, facing: "face_right",
      stages: [{ from: 24, team: [["Doduo",32], ["Ledyba",32], ["Swablu",31]], // #23130 / 23131 / 23132
        intro: ["Come and get some! We're gunning our\nengines!"],
        defeat: ["Dropped in the dirt…"],
        after: ["I only lost because I didn't have a\nShadow Pokémon this time."] },
        { from: 33, team: [["Doduo",38], ["Ledian",38], ["Swablu",39]], // #23130 / 23131 / 23132
        intro: ["Come and get some! We're gunning our\nengines!"],
        defeat: ["Dropped in the dirt…"],
        after: ["I only lost because I didn't have a\nShadow Pokémon this time."] }] },
    // (Colosseum's 3F)
    PyriteTown_PyriteBuilding_3F_EventScript_Colo_TURA: { name: "Hunter Tura", cls: "Hunter", map: "PyriteTown_PyriteBuilding_3F", x: 13, y: 5, facing: "face_left",
      stages: [{ from: 24, team: [["Spheal",31], ["Snorunt",32]], // #23092 / 23093 / 23095
        intro: ["My Pokémon are solid troopers! Check\nthem out!"],
        defeat: ["How'd this happen?!"],
        after: ["So, admit it! My Pokémon are decent,\nhuh? …Even though they can't win…"] },
        { from: 33, team: [["Sealeo",39], ["Snorunt",40]], // #23092 / 23093 / 23095
        intro: ["My Pokémon are solid troopers! Check\nthem out!"],
        defeat: ["How'd this happen?!"],
        after: ["So, admit it! My Pokémon are decent,\nhuh? …Even though they can't win…"] }] },
    // (Colosseum's 3F (the guide's "Tori"; the game's own name list has TOTI))
    PyriteTown_PyriteBuilding_3F_EventScript_Colo_TOTI: { name: "Hunter Toti", cls: "Hunter", map: "PyriteTown_PyriteBuilding_3F", x: 1, y: 7, facing: "face_right",
      stages: [{ from: 24, team: [["Horsea",31], ["Oddish",32], ["Sandshrew",32]], // #23222 / 23223 / 23224
        intro: ["My Pokémon can dance with elegance\neven in a dump like this!"],
        defeat: ["Dancing alone doesn't win any\nbattles!"],
        after: ["The end is always so cruelly\npitiless… Oh, woe…"] },
        { from: 33, team: [["Seadra",38], ["Gloom",39], ["Sandslash",39]], // #23222 / 23223 / 23224
        intro: ["My Pokémon can dance with elegance\neven in a dump like this!"],
        defeat: ["Dancing alone doesn't win any\nbattles!"],
        after: ["The end is always so cruelly\npitiless… Oh, woe…"] }] },
    // (Colosseum's 3F)
    PyriteTown_PyriteBuilding_3F_EventScript_Colo_ELIDI: { name: "Bodybuilder Elidi", cls: "Bodybuilder", map: "PyriteTown_PyriteBuilding_3F", x: 17, y: 7, facing: "face_left",
      stages: [{ from: 24, team: [["Cacnea",32], ["Tentacool",33]], // #23144 / 23146 / 23148
        intro: ["Now what compels someone like you to\ncome here just for the sake of\ngetting thrashed by me?"],
        defeat: ["You turned the tables on me!"],
        after: ["Grrr… Done in, but how? What blind\nspot did you exploit?"] },
        { from: 33, team: [["Cacnea",40], ["Tentacool",39]], // #23144 / 23146 / 23148
        intro: ["Now what compels someone like you to\ncome here just for the sake of\ngetting thrashed by me?"],
        defeat: ["You turned the tables on me!"],
        after: ["Grrr… Done in, but how? What blind\nspot did you exploit?"] }] },
    // (the entrance)
    PyriteCave_EventScript_Colo_SIMES: { name: "St. Performer Simes", cls: "St. Performer", map: "PyriteCave", x: 25, y: 33, facing: "face_right",
      stages: [{ from: 26, team: [["Anorith",32], ["Lotad",32]], // #23302 / 23303 / 23304
        intro: ["Yay! You're finally here! This floor\nis my territory! I can't let you\nthrough!"],
        defeat: ["Oopsie! I lost!"],
        after: ["You're a surprise! But I'm not\ntelling you where Miror B.'s waiting."] },
        { from: 33, team: [["Anorith",41], ["Lombre",40]], // #23305 / 23306 / 23308
        intro: ["Yay! You're finally here! I was\nwaiting for you!"],
        defeat: ["Oopsie! I lost!"],
        after: ["You're a surprise! But I'm not\ntelling you where Miror B. has run\naway!"] }] },
    // (Colosseum's 1F)
    PyriteCave_EventScript_Colo_REHAN: { name: "Chaser Rehan", cls: "Chaser", map: "PyriteCave", x: 25, y: 28, facing: "face_right",
      stages: [{ from: 26, team: [["Geodude",32], ["Lotad",31], ["Snorunt",32], ["Slakoth",31]], // #23379 / 23295 / 23296
        intro: ["Whoops! Roadblock! This is a\nno-through street!"],
        defeat: ["Urk! Crashed out!"],
        after: ["Miror B.'s unbeatable! You'll lose!"] },
        { from: 33, team: [["Graveler",37], ["Lotad",38], ["Snorunt",37], ["Slakoth",38]], // #23297 / 23298 / 23299
        intro: ["Whoops! Roadblock! This is a\nno-through street!"],
        defeat: ["Urk! Crashed out!"],
        after: ["You can go through, but it's a\ncul-de-sac, like I said."] }] },
    // (Colosseum's 1F)
    PyriteCave_EventScript_Colo_NOXY: { name: "Bandana Guy Noxy", cls: "Bandana Guy", map: "PyriteCave", x: 27, y: 26, facing: "face_left",
      stages: [{ from: 26, team: [["Lotad",32], ["Lotad",33], ["Lotad",33], ["Lotad",33]], // #23106 / 23107 / 23108
        intro: ["Ha-ha, too bad for you. You're at a\ndead end. Miror B.'s not here!"],
        defeat: ["S-Savaged…"],
        after: ["Yeah, you sure are strong. But you're\nno match for Miror B. Heheh."] },
        { from: 33, team: [["Lotad",33], ["Lombre",35], ["Lombre",34], ["Lombre",36]], // #23109 / 23110 / 23111
        intro: ["Ha-ha, too bad for you. You're at a\ndead end."],
        defeat: ["S-Savaged…"],
        after: ["Yeah, you sure are strong. But you're\nno match for Miror B. Heheh.", "Whaaaaat?! Miror B.'s not around\nanymore?"] }] },
    // (the first B1F)
    PyriteCave_EventScript_Colo_MAIZ: { name: "Chaser Maiz", cls: "Chaser", map: "PyriteCave", x: 24, y: 20, facing: "face_down",
      stages: [{ from: 26, team: [["Koffing",32], ["Ralts",31], ["Shroomish",32]], // #23151 / 23152 / 23153
        intro: ["What's going on here? I heard there\nwas one intruder, but there're\nobviously two of you."],
        defeat: ["Your Pokémon are too strong!"],
        after: ["Raising your Pokémon to those levels\nmust have been a hard struggle. You", "might be our enemy, but you have my\nrespect!"] },
        { from: 33, team: [["Koffing",38], ["Kirlia",38], ["Shroomish",39]], // #23154 / 23155 / 23156
        intro: ["Your Pokémon overwhelmed me the last\ntime. But battles can turn on dumb\nluck!"],
        defeat: ["Your Pokémon are too strong!"],
        after: ["Raising your Pokémon to those levels\nmust have been a hard struggle. You", "might be our enemy, but you have my\nrespect!"] }] },
    // (the first B1F)
    PyriteCave_EventScript_Colo_VALEN: { name: "Hunter Valen", cls: "Hunter", map: "PyriteCave", x: 19, y: 22, facing: "face_right",
      stages: [{ from: 26, team: [["Lotad",32], ["Whismur",33], ["Slakoth",32]], // #23262 / 23263 / 23264
        intro: ["If I drop you here, Miror B.'s sure\nto give me a reward!"],
        defeat: ["No! I'll be punished for this; never\nmind getting a reward!"],
        after: ["I'll pretend that I never saw you\ntwo. Consider yourselves lucky!"] },
        { from: 33, team: [["Lombre",37], ["Loudred",38], ["Slakoth",38]], // #23265 / 23266 / 23268
        intro: ["If I drop you here, my reputation\nwill improve!"],
        defeat: ["No! My reputation's been tarnished!"],
        after: ["I'll pretend that I never saw you\ntwo. Consider yourselves lucky!"] }] },
    // (the second B1F)
    PyriteCave_EventScript_Colo_EVAT: { name: "Roller Boy Evat", cls: "Roller Boy", map: "PyriteCave", x: 18, y: 17, facing: "face_right",
      stages: [{ from: 26, team: [["Lotad",32], ["Lombre",33]], // #23317 / 23318 / 23319
        intro: ["Duking's finished! It's the dawning\nof Miror B.'s time!"],
        defeat: ["What have you done to my Pokémon?!"],
        after: ["Grr… Is Miror B.'s age really going\nto arrive?"] },
        { from: 33, team: [["Lombre",40], ["Lombre",41]], // #23321 / 23322 / 23323
        intro: ["Miror B.'s finished! It's the dawning\nof my time!"],
        defeat: ["What have you done to my Pokémon?!"],
        after: ["Grr… Is my age really going to\narrive?"] }] },
    // (the second B1F)
    PyriteCave_EventScript_Colo_DERID: { name: "Rider Derid", cls: "Rider", map: "PyriteCave", x: 20, y: 8, facing: "face_left",
      stages: [{ from: 26, team: [["Pineco",30], ["Shuppet",33], ["Koffing",30]], // #23362 / 23364 / 23365
        intro: ["I'm under orders to battle with you\nhere. Orders must be followed!"],
        defeat: ["But… This is ridiculous!"],
        after: ["I was under orders to battle with\nyou. Nobody said anything about not\nlosing, so it's okay!"] },
        { from: 33, team: [["Forretress",38], ["Shuppet",39], ["Koffing",40]], // #23367 / 23369 / 23372
        intro: ["Imagine seeing you here again! There\nmust be a bond between us! Here we\ngo!"],
        defeat: ["Who needs a bitter bond like this!"],
        after: ["There must be a nicer encounter\nwaiting to happen for me!"] }] },
    // (the northern sewers)
    PyriteCave_EventScript_Colo_MELI: { name: "Hunter Meli", cls: "Hunter", map: "PyriteCave", x: 25, y: 2, facing: "face_down",
      stages: [{ from: 26, team: [["Zigzagoon",32], ["Zigzagoon",32], ["Linoone",33]], // #23167 / 23168 / 23170
        intro: ["I'm in training here. One day, I'm\ngoing to win at the Colosseum."],
        defeat: ["Waaah! My confidence took a hit!"],
        after: ["Maybe… Is it this place that's bad\nfor my training?"] },
        { from: 33, team: [["Zigzagoon",39], ["Linoone",39], ["Linoone",39]], // #23171 / 23173 / 23175
        intro: ["I'm in training here. One day, I'm\ngoing to win at the Colosseum."],
        defeat: ["Waaah! My confidence took a hit!"],
        after: ["Maybe… Should I be training at the\nPre Gym?"] }] },
    // (the northern sewers)
    PyriteCave_EventScript_Colo_MELA: { name: "Chaser Mela", cls: "Chaser", female: true, map: "PyriteCave", x: 19, y: 4, facing: "face_right",
      stages: [{ from: 26, team: [["Natu",33], ["Tentacool",32], ["Teddiursa",32]], // #23403 / 23406 / 23407
        intro: ["Are you looking for Duking's Pokémon?\nCould it be beyond here, I wonder?"],
        defeat: ["Where's that Pokémon? I'll never tell\nyou!"],
        after: ["Don't you people have any sense of\ndirection? I bet you're having\ntrouble getting around in this cave!"] },
        { from: 33, team: [["Natu",40], ["Tentacool",41], ["Teddiursa",39]], // #23408 / 23409 / 23410
        intro: ["Oh? Oh? What would make you come out\nall this way?"],
        defeat: ["I mean, really! Why are you here?!"],
        after: ["Don't you people have any sense of\ndirection? Do you mean to tell me", "that you were wandering lost this\nwhole time?"] }] },
    // (the northern sewers)
    PyriteCave_EventScript_Colo_SEMA: { name: "Cipher Peon Sema", cls: "Cipher Peon", map: "PyriteCave", x: 27, y: 3, facing: "face_left",
      stages: [{ from: 26, team: [["Spheal",34], ["Lileep",32], ["Dustox",33]], // #23349 / 23352 / 23354
        intro: ["Oh, now isn't this something. This is\nthe edge of the world. Good of you to\ncome!"],
        defeat: ["It was no fluke that you managed to\ncome out here…"],
        after: ["What a wasted effort for you. There's\nnothing here for you.", "While you were all busy wasting time,\nwhat became of that Pokémon you're\nafter? Hohohoho!"] },
        { from: 33, team: [["Lileep",39], ["Sealeo",40], ["Dustox",38]], // #23357 / 23358 / 23359
        intro: ["Oh, now isn't this something. This is\nthe edge of the world. Good of you to\ncome!"],
        defeat: ["It was no fluke that you managed to\ncome out here…"],
        after: ["What a wasted effort for you. Beating\nMiror B. won't change a thing.", "While you are busily wasting time,\nwhat will become of the world?\nHohohoho!"] }] },
    // (after Dakim, till Evice's beaten)
    PyriteCave_MirorBHideout_EventScript_Colo_MIRAKLE_B: { name: "Cipher Peon Mirakle B.", cls: "Cipher Peon", sprite: "rocker", pic: "rocker", map: "PyriteCave_MirorBHideout", x: 7, y: 7, facing: "face_up", until: 44,
      stages: [{ from: 33, team: [["Sudowoodo",39], ["Electrode",39], ["Linoone",39], ["Seaking",39], ["Sandslash",39]], // #17176 /  / 17176
        intro: ["I'm Mirakle B.! I'm Miror B.'s\nrightful successor! Going to get me\nan afro!"],
        after: ["I'm Mirakle B.! I'm Miror B.'s\nrightful successor! Going to get me\nan afro!"] }] },
    // (after Evice)
    PyriteCave_MirorBHideout_EventScript_Colo_REATH: { name: "Miror B. Peon Reath", cls: "Miror B. Peon", female: true, map: "PyriteCave_MirorBHideout", x: 6, y: 7, facing: "face_up",
      stages: [{ from: 44, shadow: "Reath", team: [["Seaking",54], ["Ariados",53], ["Luvdisc",53]], // #23411 / 23421 / 23423
        intro: ["It's okay. After being cooped up in\nthat tiny jail, I need a change of\npace.", "Come on, we'll have a high- intensity\nbattle so I can get some proper\nexercise!"],
        defeat: ["It was good exercise, but…!"],
        after: ["Hey! I didn't ask for a battle that\nintense! We're all exhausted now!"] }] },
    // (after Evice)
    PyriteCave_MirorBHideout_EventScript_Colo_FERMA: { name: "Miror B. Peon Ferma", cls: "Miror B. Peon", female: true, map: "PyriteCave_MirorBHideout", x: 8, y: 7, facing: "face_up",
      stages: [{ from: 44, shadow: "Ferma", team: [["Sharpedo",50], ["Yanma",53], ["Aipom",52], ["Furret",51]], // #23103, 23113 / 23115 / 23116
        intro: ["Y-You?! Wh-What are you doing here?\nYou shouldn't be here!", "I'll show you what real battling is\nabout!"],
        defeat: ["Er… That's an example of how to lose\na battle!"],
        after: ["Sigh… Miror B.'s gone who knows\nwhere… What am I to do with myself?"] }] }
  });
  // The Shadow Pokémon Trainers of the building and the cave, once their Shadow Pokémon's snagged: Colosseum's later parties.
  window.Orre.addRematches({
    PyriteTown_EventScript_Shadow_DOKEN: [{ from: 27, team: [["Corphish",37], ["Goldeen",38], ["Linoone",37]], // #23208 / 23210 / 23211
        intro: ["That battle we had before was a whole\nlot of fun.", "Hey! Did you come back to make me a\nhappy battler again?!"],
        defeat: ["Th-That was fun!"],
        after: ["Oh, yeah, I love strong guys.", "…Wait. I said \"love,\" but don't get\nany wrong ideas…"] }],
    PyriteCave_EventScript_Shadow_TWAN: [{ from: 33, team: [["Machop",38], ["Shelgon",40], ["Camerupt",39]], // #23217 / 23218 / 23219
        intro: ["Hold it! Don't think you're going\nanywhere when you catch my eye."],
        defeat: ["Grrr! My Pokémon were shut down?!"],
        after: ["Are you maybe even stronger than\nMiror B.?"] }],
    PyriteCave_EventScript_Shadow_SOSH: [{ from: 33, team: [["Jigglypuff",38], ["Mareep",39], ["Cacnea",39]], // #23164 / 23165 / 23166
        intro: ["Kukukuku… Welcome to here!"],
        defeat: ["Oh, Sosh doesn't know what to do!"],
        after: ["No way, no way! You're supposed to\ntell me that you're so strong!"] }],
    PyriteCave_EventScript_Shadow_ZALO: [{ from: 33, team: [["Loudred",36], ["Lotad",38], ["Metang",39], ["Lombre",37]], // #23140 / 23141 / 23142
        intro: ["Huh? What would you two come back\nhere for?", "Oh, I get it. You wanted to battle\nwith me that badly?!"],
        defeat: ["No! This is an ugly pattern!"],
        after: ["I'll get you! Next time, I'll run a\nbattle that will knock your socks\noff!"] }]
  });
})();
