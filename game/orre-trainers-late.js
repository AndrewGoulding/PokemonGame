// Orre: Colosseum's other Trainers (late). See game/orre-trainers.js.
//
// The Shadow Pokémon Lab's Researchers (and Skrub, there with his Shadow Hitmontop if you never snagged it), Realgam
// Tower's lobby and domes (and the Mystery Troop member you battled in Phenac City, a Cipher Peon now), and after the
// game: the rebuilt Snagem Hideout (Cipher's Peons and the Under's Trainers come there, Team Snagem's own, Gonzap in
// his office), Folly and Trudly back in the Mayor's house, the lab's Peons' later parties once you've met the Mystery
// Troop member in the hideout, and the Deep Colosseum's five rounds (Orre.DEEP_ROUNDS). Parties: altissimo1's Colosseum
// guide. Words: Colosseum's own (assets/text/colosseum.json; the ids by each). A Trainer's lines are those of its own
// place's table that come just before its named battle line (fight_common: "NAME: …", by id), and that named line is
// its `defeat`; a line said after it, its `after`. Where Colosseum gives a Trainer no line of a kind, there is none.
"use strict";

(function () {
  const Orre = window.Orre;
  const snaggedAll = (f, who) => Orre.shadowOf(who).every((s) => (f.orreShadowSnagged || []).includes(s.species));
  // (The Realgam one: his snagged-starter words, or, while it's still his, his starter back and the other words.)
  // (The Mystery Troop: the one you battled in Phenac City, orreTroop; the one in the hideout after the game, as
  // Colosseum has it: Verde if you battled Rosso, Rosso if Bluno, Bluno if Verde; and the third, later, in Ein's lab.)
  const fought = (f, who) => (f.orreStory | 0) >= 41 && (f.orreTroop || "Verde") === who;
  const notSnagged = (f, who) => (f.orreStory | 0) >= 41 && !snaggedAll(f, who);
  const TROOP_HIDEOUT = { Verde: "Bluno", Rosso: "Verde", Bluno: "Rosso" }, TROOP_LAB = { Verde: "Rosso", Rosso: "Bluno", Bluno: "Verde" };
  const troopHideout = (f) => TROOP_HIDEOUT[f.orreTroop || "Verde"], troopLab = (f) => TROOP_LAB[f.orreTroop || "Verde"];
  // (After the game, once the hideout's Mystery Troop member's starter is snagged: the lab's later battles.)
  const labTroopMet = (f) => (f.orreStory | 0) >= 44 && snaggedAll(f, troopHideout(f));
  Object.assign(Orre, { troopHideout, troopLab, labTroopMet });

  Orre.addTrainers({
    ShadowLab_1F_EventScript_Colo_MYRON: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_1F_MYRON", name: "Researcher Myron", cls: "Researcher", map: "ShadowLab_GarageB1F", x: 6, y: 10, facing: "face_down",
      stages: [
      // (intro #21069+#21643, defeat #21094, after #21096)
      // (Beaten, he drops the Card Key: D1_garage_B1 #21076, and Rui's #21097.)
      { from: 37, team: [["Voltorb",38],["Voltorb",38]], item: "lab-card-key", itemText: "{PLAYER} obtained the Card Key!",
        afterItem: ["Rui: Oh! That's the Card Key! Now we\ncan get into the Lab."], intro: ["This is discrimination. Why do\nthey single me out for these extra\nassignments?","There's still packing left for\nthe move out of this Lab… Grumble…","Wha-wha-wha-who are you? You're\nsuspicious! Therefore, you must be\nintruders!"], defeat: ["What did I do to deserve this?"], after: ["Bah! I'll make you regret\nseeing me!"] }] },
    ShadowLab_1F_EventScript_Colo_LETHCO: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_1F_LETHCO", name: "Researcher Lethco", cls: "Researcher", map: "ShadowLab_B1F_Rooms", x: 4, y: 4, facing: "face_down",
      stages: [
      // (intro #21108+#21642, defeat #21109, after #21110)
      { from: 37, team: [["Magnemite",37],["Chinchou",38],["Electrike",39]], intro: ["Okay… We can dump this data…\nLet's see now…","Waaaargh! You two! You're not Lab\nstaff!"], defeat: ["What's this? I don't have\ntime for this!"], after: ["You two! If you don't vacate\nthe premises, Master Ein will do\nterrible things to you!"] }] },
    ShadowLab_1F_EventScript_Colo_COREN: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_1F_COREN", name: "Researcher Coren", cls: "Researcher", map: "ShadowLab_CorenRoom", x: 5, y: 5, facing: "face_down",
      stages: [
      // (intro #21088, defeat #21089, after #21090)
      { from: 37, team: [["Magnemite",39],["Electrode",40],["Magneton",40]], intro: ["So, you're {PLAYER}, aren't you?\nThe word is you've been wreaking\nhavoc with our plans!"], defeat: ["No havoc, please!"], after: ["Fufufu… The Shadow Pokémon\nthat were made here have been\ntransported out already.","Battle all you want. There's\nno stopping our Shadow Pokémon plan\nnow!"] }] },
    ShadowLab_B1F_EventScript_Colo_KOTAN: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_B1F_KOTAN", name: "Researcher Kotan", cls: "Researcher", map: "ShadowLab_B1F_Rooms", x: 11, y: 11, facing: "face_down",
      stages: [
      // (intro #21080, defeat #21081, after #21082)
      { from: 37, team: [["Electrode",42],["Magneton",40],["Ampharos",41]], intro: ["Wh-What? What are outsiders doing\nhere? Why isn't security doing their\njob?"], defeat: ["Aww, crud! There's no way that\nI'm going to let you go!"], after: ["Wahaha! Now you're stuck!\nThere's no escaping the Lab for you!"] }] },
    ShadowLab_B1F_EventScript_Colo_SKRUB: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_B1F_SKRUB", name: "Cipher Peon Skrub", cls: "Cipher Peon", map: "ShadowLab_DNARoom", x: 8, y: 5, facing: "face_down", until: 44,
      stages: [
      // (intro #21068, defeat #21070)
      { from: 37, team: [["Medicham",41],["Clamperl",43],["Graveler",44],["Wobbuffet",42]], shadow: "Skrub", intro: ["Not once, not twice, but three\ntimes we meet?","Do you recall who I am? I\nshall avenge my humiliation at the\nRelic Forest!"], defeat: ["Urrrrrrggggh!"] }] },
    ShadowLab_B1F_EventScript_Colo_ODLOW: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_B1F_ODLOW", name: "Researcher Odlow", cls: "Researcher", map: "ShadowLab_B2F_Room", x: 4, y: 3, facing: "face_down",
      stages: [
      // (intro #21073, defeat #21075, after #21077)
      { from: 37, team: [["Magnemite",38],["Electrode",39],["Magneton",39]], intro: ["Hey, now… You're not supposed to\nbe in the Lab without your lab coat!","…Wait a minute… Your faces aren't\nfamiliar… Intruders?!"], defeat: ["This reeks!"], after: ["You're far too late! There's\nnothing left here. Fufufu…"] }] },
    ShadowLab_B1F_EventScript_Colo_DUBIK: { localId: "LOCALID_ORRE_COLO_SHADOWLAB_B1F_DUBIK", name: "Researcher Dubik", cls: "Researcher", map: "ShadowLab_B2F_Rooms", x: 13, y: 4, facing: "face_down",
      stages: [
      // (intro #21112, defeat #21113, after #21114)
      { from: 37, team: [["Electrode",37],["Electrode",37]], intro: ["What in the name of… How did you\ntwo avoid the eyes of our security\nstaff?"], defeat: ["You didn't duck from security,\nyou walked all over them!"], after: ["Do whatever you want; it's too\nlate now. We're finished with our","research. What you're doing is\nfutile."] }] },
    RealgamTower_1F_EventScript_Colo_KLEST: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_KLEST", name: "Bandana Guy Klest", cls: "Bandana Guy", map: "RealgamTower_1F", x: 3, y: 5, facing: "face_right",
      stages: [
      // (intro #21603, defeat #21606, after #21609)
      { from: 41, team: [["Nuzleaf",39],["Graveler",42],["Hariyama",41],["Lombre",42]], intro: ["Fanfare, please! Congratulations!","You are the thousandth guest to\nenter Realgam Tower since its\nopening!","Yeah, like, as if. We just opened\ntoday. So that's not likely!"], defeat: ["Sorry! You don't need to get\nso steamed over my little white lie!"], after: ["Heheh. I bet I made you happy\nwhen I said you were the thousandth\nguest. Isn't that right?"] }] },
    RealgamTower_1F_EventScript_Colo_ALINE: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_ALINE", name: "Hunter Aline", cls: "Hunter", map: "RealgamTower_1F", x: 16, y: 4, facing: "face_left", female: true,
      stages: [
      // (intro #21617, defeat #21619, after #21620)
      { from: 41, team: [["Mawile",40],["Metang",39],["Lairon",41]], intro: ["Welcome to the just-completed\nRealgam Tower!","Well? How about a battle as an\nevent to commemorate the opening?"], defeat: ["Waaaah! I was supposed to win!"], after: ["Since you bothered to come,\nyou may as well enjoy yourselves.\nHohoho."] }] },
    RealgamTower_1F_EventScript_Colo_LUPER: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_LUPER", name: "St. Performer Luper", cls: "St. Performer", map: "RealgamTower_1F", x: 5, y: 8, facing: "face_right",
      stages: [
      // (intro #21624, defeat #21625, after #21628)
      { from: 41, team: [["Octillery",39],["Qwilfish",40],["Seadra",39],["Feraligatr",40]], intro: ["They told me this place will be\nattracting guests from all over the\nworld.","I can demonstrate my battling to\nall sorts of influential people. I\ncan become famous worldwide!","You're lucky. Before anyone, I'll\nshow you how skilled I am at\nbattling!"], defeat: ["Ohh! You dashed my dream of\nfame!"], after: ["What I'll do… I'll hone my\nskills and position myself as a\ncharismatic trainer!"] }] },
    RealgamTower_1F_EventScript_Colo_GIVERN: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_GIVERN", name: "Bodybuilder Givern", cls: "Bodybuilder", map: "RealgamTower_1F", x: 13, y: 9, facing: "face_left",
      stages: [
      // (intro #21627, defeat #21629, after #21632)
      { from: 41, team: [["Loudred",45],["Wigglytuff",43]], intro: ["Wah!","I gave you a good jolt, eh?\nWahahah!","I've been waiting behind the door\nfor you to come along. Been waiting a\nlooong time!","Next, I'll shock you even more\nwith my Pokémon battle!"], defeat: ["Kwaah! That's a shocker!\nYou're, like, outrageously tough!"], after: ["Do you know how hard it is to\njust wait and wait and wait without\nmoving. Try imagining it.","Now think about it, eh? I\ndoubt very much that you could keep\nat it for long! Wahaha!"] }] },
    RealgamTower_1F_EventScript_Colo_ELOSE: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_ELOSE", name: "Rider Elose", cls: "Rider", map: "RealgamTower_1F", x: 17, y: 9, facing: "face_left", female: true,
      stages: [
      // (intro #21777+#21779, defeat #21780, after #21781)
      { from: 41, team: [["Cradily",40],["Noctowl",39],["Chimecho",40],["Swalot",39]], intro: ["Are you here to dine?","Sorry to disappoint you. We're\nnot ready to serve anyone yet.","Let me make up for it. I'll serve\nup a full-course menu of a Pokémon\nbattle!"], defeat: ["Thanks for dinner!"], after: ["That was too heavy for some\nlight exercise before a meal."] }] },
    RealgamTower_1F_EventScript_Colo_KEVEL: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_KEVEL", name: "Rider Kevel", cls: "Rider", map: "RealgamTower_1F", x: 1, y: 4, facing: "face_right",
      stages: [
      // (intro #21709, defeat #21710, after #21711)
      { from: 41, team: [["Sandslash",40],["Quagsire",41],["Donphan",40]], intro: ["So you're {PLAYER}, ex- member of\nTeam Snagem.","Hehehe. I've been hoping that I'd\nget a shot at battling you.","Let's see this high-level\nbattling that everyone's been talking\nabout!"], defeat: ["Turfed out!"], after: ["You're on the other side, but\nI still have to hand it to you!"] }] },
    RealgamTower_1F_EventScript_Colo_TRUS: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_TRUS", name: "Chaser Trus", cls: "Chaser", map: "RealgamTower_1F", x: 2, y: 9, facing: "face_right",
      stages: [
      // (intro #21759, defeat #21760, after #21762)
      { from: 41, team: [["Machoke",40],["Swellow",40],["Ninetales",40],["Magneton",40]], intro: ["The builder of the Tower has\nplans to raise big money by\nattracting the world's rich folks.","But you need bait to get the\nattention of people like that.\nSomething big and exciting.","Yep, you guessed it. Shadow\nPokémon battles!"], defeat: ["Tch! This isn't like me to\nlose!"], after: ["Do you get it now? Win or lose,\nbattles attract people."] }] },
    RealgamTower_1F_EventScript_Colo_RUGEN: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_RUGEN", name: "Chaser Rugen", cls: "Chaser", map: "RealgamTower_1F", x: 16, y: 2, facing: "face_down",
      stages: [
      // (intro #21732, defeat #21733)
      { from: 41, team: [["Shelgon",40],["Vigoroth",41]], intro: ["Okay, that's that, then. My\nPokémon are all nursed back to\nperfect health and readiness.","Now we can go full tilt against\nyou in battle!"], defeat: ["Darn it! I don't like you!"] }] },
    RealgamTower_Dome_EventScript_Colo_BOPEN: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_DOME_BOPEN", name: "Cipher Peon Bopen", cls: "Cipher Peon", map: "RealgamTower_Dome", x: 10, y: 8, facing: "face_left",
      stages: [
      // (intro #21595, defeat #21596, after #21640, lost #23599)
      { from: 41, team: [["Grimer",39],["Dustox",39],["Seviper",40]], intro: ["It's to your doom!"], defeat: ["Gah! So, this is it!"], after: ["Oh, having trouble, are we?","Perhaps you're lost in the\nexpanse of this building?"], lost: ["Humph. The way you battle, you'd\nneed more lives than a cat!"] }] },
    RealgamTower_1F_EventScript_Colo_VERDE: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_VERDE", name: "Cipher Peon Verde", cls: "Cipher Peon", map: "RealgamTower_1F", x: 7, y: 5, facing: "face_down", when: (f) => fought(f, "Verde"),
      stages: [
      // (intro #22242, defeat #22244, after #22245+#22246)
      { from: 41, team: [["Muk",45],["Grumpig",44]], intro: ["My name is Verde! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","You Snagged my Bayleef back\nthen! Yeah, you remember now!","Well, pal, today's the day!\nIt's payback time!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Bayleef's real power! What\nyou've seen is nothing!"] },
      // (intro #22243, defeat #22244, after #22245+#22246)
      { from: (f) => notSnagged(f, "Verde"), team: [["Muk",45],["Grumpig",44]], shadow: "Verde", intro: ["My name is Verde! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","This time, you're gonna get\nit. I'll give you a thorough display\nof Bayleef's power!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Bayleef's real power! What\nyou've seen is nothing!"] }] },
    RealgamTower_1F_EventScript_Colo_ROSSO: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_ROSSO", name: "Cipher Peon Rosso", cls: "Cipher Peon", map: "RealgamTower_1F", x: 6, y: 5, facing: "face_down", when: (f) => fought(f, "Rosso"),
      stages: [
      // (intro #21755, defeat #22238, after #22239+#22240)
      { from: 41, team: [["Muk",45],["Grumpig",44]], intro: ["My name is Rosso! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","You Snagged my Quilava back\nthen! Yeah, you remember now!","Well, pal, today's the day!\nIt's payback time!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Quilava's real power! What\nyou've seen is nothing!"] },
      // (intro #22237, defeat #22238, after #22239+#22240)
      { from: (f) => notSnagged(f, "Rosso"), team: [["Muk",45],["Grumpig",44]], shadow: "Rosso", intro: ["My name is Rosso! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","This time, you're gonna get\nit. I'll give you a thorough display\nof Quilava's power!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Quilava's real power! What\nyou've seen is nothing!"] }] },
    RealgamTower_1F_EventScript_Colo_BLUNO: { localId: "LOCALID_ORRE_COLO_REALGAMTOWER_1F_BLUNO", name: "Cipher Peon Bluno", cls: "Cipher Peon", map: "RealgamTower_1F", x: 8, y: 5, facing: "face_down", when: (f) => fought(f, "Bluno"),
      stages: [
      // (intro #22248, defeat #22250, after #22251+#22252)
      { from: 41, team: [["Muk",45],["Grumpig",44]], intro: ["My name is Bluno! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","You Snagged my Croconaw back\nthen! Yeah, you remember now!","Well, pal, today's the day!\nIt's payback time!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Croconaw's real power! What\nyou've seen is nothing!"] },
      // (intro #22249, defeat #22250, after #22251+#22252)
      { from: (f) => notSnagged(f, "Bluno"), team: [["Muk",45],["Grumpig",44]], shadow: "Bluno", intro: ["My name is Bluno! You may not\nremember me, but don't worry, I\nhaven't forgotten you!","This time, you're gonna get\nit. I'll give you a thorough display\nof Croconaw's power!"], defeat: ["B-Blast it! I can't lose\nagain!"], after: ["Tch! You win, but just today!","But remember this! You haven't\nseen Croconaw's real power! What\nyou've seen is nothing!"] }] },
    SnagemHideout_EventScript_Colo_NORE: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_NORE", name: "Cipher Peon Nore", cls: "Cipher Peon", map: "SnagemHideout", x: 8, y: 8, facing: "face_down",
      stages: [
      // (intro #23499, defeat #23501)
      { from: 44, team: [["Beautifly",54],["Forretress",51],["Ninjask",55],["Masquerain",52]], shadow: "Nore", intro: ["Well, if it isn't you again! You\nhad your way with my party before,\nbut not this time!"], defeat: ["You lived up to your reputation!"] }] },
    SnagemHideout_EventScript_Colo_SKRUB: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_SKRUB", name: "Cipher Peon Skrub", cls: "Cipher Peon", map: "SnagemHideout", x: 16, y: 8, facing: "face_down",
      stages: [
      // (intro #23534, defeat #23535)
      { from: 44, team: [["Medicham",50],["Huntail",51],["Golem",52],["Wobbuffet",53]], shadow: "Skrub", intro: ["It's that reckless little boy! We\nmeet again!"], defeat: ["Huh? I lost again?! Why? Why?"] }] },
    SnagemHideout_EventScript_Colo_KLOAK: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_KLOAK", name: "Cipher Peon Kloak", cls: "Cipher Peon", map: "SnagemHideout", x: 8, y: 11, facing: "face_right", female: true,
      stages: [
      // (intro #23557, defeat #23559)
      { from: 44, team: [["Ariados",52],["Volbeat",53],["Illumise",53]], shadow: "Kloak", intro: ["There you are, you spies! This\ntime, you're not getting away from\nme!"], defeat: ["Arrgh! You're too strong to be a\nspy!"] }] },
    SnagemHideout_EventScript_Colo_BAILA: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_BAILA", name: "Cipher Peon Baila", cls: "Cipher Peon", map: "SnagemHideout", x: 16, y: 11, facing: "face_left", female: true,
      stages: [
      // (intro #23551, defeat #23552, after #23554)
      { from: 44, team: [["Roselia",52],["Vileplume",51],["Jumpluff",53]], shadow: "Baila", intro: ["{PLAYER}, sounds like you've been\nplaying hero all over the place.","Play time's over. I'll reduce you\nto the same sorry state as this Snag\nMachine Lab!"], defeat: ["Wickedly strong!"], after: ["I didn't think you'd be this\ntough. No wonder you're famous!"] }] },
    SnagemHideout_EventScript_Colo_ARTON: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_ARTON", name: "Cipher Peon Arton", cls: "Cipher Peon", map: "SnagemHideout", x: 15, y: 9, facing: "face_down",
      stages: [
      // (intro #23540, defeat #23542)
      { from: 44, team: [["Sealeo",50],["Piloswine",55],["Glalie",54]], shadow: "Arton", intro: ["Humph… Who would've thought it? I\nget to battle you again!"], defeat: ["Awww, I shouldn't have battled\nafter all!"] }] },
    SnagemHideout_EventScript_Colo_DIOGE: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_DIOGE", name: "Cipher Peon Dioge", cls: "Cipher Peon", map: "SnagemHideout", x: 10, y: 9, facing: "face_down",
      stages: [
      // (intro #23549, defeat #23550, after #23548)
      { from: 44, team: [["Dustox",50],["Masquerain",53],["Forretress",51]], shadow: "Dioge", intro: ["Because of you, my standing in\nCipher is in the dumps!"], defeat: ["My standing is going to take\nanother huge hit!"], after: ["Still not good enough with Shadow\nPokémon…"] }] },
    SnagemHideout_EventScript_Colo_NIVER: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_NIVER", name: "Team Snagem Niver", cls: "Team Snagem", map: "SnagemHideout", x: 3, y: 13, facing: "face_right",
      stages: [
      // (intro #23522, defeat #23523, after #23524)
      { from: 44, team: [["Zangoose",53],["Grovyle",52],["Vigoroth",52],["Rhyhorn",52]], intro: ["I never expected to see you\nagain. Not like this, anyway."], defeat: ["Boooooo!"], after: ["Team Snagem forever!"] }] },
    SnagemHideout_EventScript_Colo_FUSTON: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_FUSTON", name: "Team Snagem Fuston", cls: "Team Snagem", map: "SnagemHideout", x: 21, y: 13, facing: "face_left",
      stages: [
      // (intro #23506, defeat #23509, after #23511)
      { from: 44, team: [["Golbat",53],["Beautifly",53],["Delibird",54],["Swellow",54]], intro: ["Whoopsy, no, no, no! I'm not\nabout to let you through."], defeat: ["Owowowowow!"], after: ["Don't think there'll be a next\ntime!"] }] },
    SnagemHideout_EventScript_Colo_COLAS: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_COLAS", name: "Bodybuilder Colas", cls: "Bodybuilder", map: "SnagemHideout", x: 3, y: 16, facing: "face_right",
      stages: [
      // (intro #23497, defeat #23498, after #23500)
      { from: 44, team: [["Pupitar",54],["Shelgon",54],["Carvanha",51],["Spinda",51]], intro: ["This place's taken a lot of\ndamage. Even I couldn't mess the\nplace up this badly.","Huh? You're telling me you did\nthis? Then, prove it to me! Show me\nwhat you can do!"], defeat: ["You rampage too much!"], after: ["Now I'm steamed! I'll rampage\nmore than you!"] }] },
    SnagemHideout_EventScript_Colo_CRUDO: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_CRUDO", name: "Bandana Guy Crudo", cls: "Bandana Guy", map: "SnagemHideout", x: 21, y: 17, facing: "face_left",
      stages: [
      // (defeat #23510, after #23513)
      { from: 44, team: [["Swalot",51],["Weezing",52],["Sandslash",53],["Linoone",55]], intro: [], defeat: ["What? No fair! You didn't tell me\nthat you turned way tougher than\nbefore."], after: ["No fair, you. Stinking cheat…\n…Mutter…"] }] },
    SnagemHideout_EventScript_Colo_RIONS: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_RIONS", name: "Rider Rions", cls: "Rider", map: "SnagemHideout", x: 6, y: 17, facing: "face_up",
      stages: [
      // (intro #23508, defeat #23512)
      { from: 44, team: [["Linoone",53],["Poochyena",54],["Mightyena",50],["Kadabra",53]], intro: ["I'm on a treasure-hunting\njourney, but seeing you here takes\nall the fun out of it!"], defeat: ["Maybe I'll go ride off farther…"] }] },
    SnagemHideout_EventScript_Colo_DRITON: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_DRITON", name: "Team Snagem Driton", cls: "Team Snagem", map: "SnagemHideout", x: 18, y: 17, facing: "face_up",
      stages: [
      // (intro #23514, defeat #23516, after #23519)
      { from: 44, team: [["Seadra",55],["Lanturn",50],["Pelipper",53],["Starmie",52]], intro: ["There's gotta be some somewhere…\nSome Poké Balls holding awesome\nPokémon. Do you have some?"], defeat: ["I knew you had some! Some awesome\nPokémon!"], after: ["Where did you find those? I want\nsome, too."] }] },
    SnagemHideout_EventScript_Colo_FRENA: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_FRENA", name: "Hunter Frena", cls: "Hunter", map: "SnagemHideout", x: 5, y: 15, facing: "face_right", female: true,
      stages: [
      // (intro #23505+#23525, defeat #23526)
      { from: 44, team: [["Donphan",51],["Jigglypuff",52],["Shroomish",53],["Mawile",53]], shadow: "Frena", intro: ["Oh… Where did that guy take off\nto after Snagging my Shadow Pokémon…","Aak!","You made me cry the last time,\nbut now it's your turn to cry!"], defeat: ["I'm going to cry again! Waaaaaah!"] }] },
    SnagemHideout_EventScript_Colo_LIAKS: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_LIAKS", name: "Chaser Liaks", cls: "Chaser", map: "SnagemHideout", x: 19, y: 15, facing: "face_left", female: true,
      stages: [
      // (intro #23515, defeat #23518)
      { from: 44, team: [["Noctowl",52],["Gloom",53],["Jumpluff",53],["Golduck",54]], shadow: "Liaks", intro: ["For Pete's sake… Did Frena lose\nagain to you?"], defeat: ["Tougher than before!"] }] },
    SnagemHideout_EventScript_Colo_LONIA: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_LONIA", name: "Bodybuilder Lonia", cls: "Bodybuilder", map: "SnagemHideout", x: 8, y: 17, facing: "face_up", female: true,
      stages: [
      // (intro #23517, defeat #23520, after #23521)
      { from: 44, team: [["Walrein",52],["Dunsparce",51],["Octillery",54],["Flaaffy",55]], shadow: "Lonia", intro: ["{PLAYER}! That's enough of your\nantics! Party's over!"], defeat: ["Wasted!"], after: ["I'll show you a painful time one\nday!"] }] },
    SnagemHideout_EventScript_Colo_NELIS: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_NELIS", name: "Rider Nelis", cls: "Rider", map: "SnagemHideout", x: 16, y: 17, facing: "face_up", female: true,
      stages: [
      // (intro #23530, defeat #23532)
      { from: 44, team: [["Sharpedo",50],["Seviper",52],["Corsola",51],["Loudred",54]], shadow: "Nelis", intro: ["Oh, my, my. Tell me it's not you\nagain."], defeat: ["What is it about you that makes\nyou strong?"] }] },
    SnagemHideout_EventScript_Colo_GONZAP: { localId: "LOCALID_ORRE_COLO_SNAGEMHIDEOUT_GONZAP", name: "Snagem Head Gonzap", cls: "Snagem Head", map: "SnagemHideout", x: 20, y: 12, facing: "face_down", pic: "biker", sprite: "biker",
      stages: [
      // (intro #23553, defeat #23555, after #23556)
      { from: 44, team: [["Gyarados",64],["Crawdaunt",64],["Armaldo",64],["Machamp",64],["Breloom",64],["Granbull",64]], shadow: "Gonzap", intro: ["Gwaahahah! Pretty brazen for a\ntraitor to come stumbling back, eh,\n{PLAYER}?!","I got careless back at Realgam\nTower, but this is the Snagem\nHideout.","We might be shattered, but this\nis my home turf. This is where I make\nmy stand. I can't lose!"], defeat: ["G-Gah! You've grown more\npowerful!"], after: ["The way things are, I won't give\nyou the satisfaction of asking why","you blew up the Hideout and abandoned\nTeam Snagem.","But you remember this. So long as\nI breathe, Team Snagem will rise from\nthe shadows again!","And with it will come your\ndownfall! Live in fear! Gwaahahah!"] }] },
    PhenacCity_MayorsHouse_EventScript_Colo_FOLLY: { localId: "LOCALID_ORRE_COLO_PHENACCITY_MAYORSHOUSE_FOLLY", name: "Miror B. Peon Folly", cls: "Miror B. Peon", map: "PhenacCity_MayorsHouse", x: 7, y: 3, facing: "face_down",
      stages: [
      // (intro #22259, defeat #22260, after #22261)
      { from: 44, team: [["Exploud",53],["Ludicolo",55]], intro: ["Waah! Y-You… How did you know\nthat we were here?!","Gwaah! You persistent pests!\nThat's it! We're gonna kick you out\nof here by force!"], defeat: ["I shouldn't have bothered!"], after: ["Hey, please, don't tell anyone\nthat you saw us here."] }] },
    PhenacCity_MayorsHouse_EventScript_Colo_TRUDLY: { localId: "LOCALID_ORRE_COLO_PHENACCITY_MAYORSHOUSE_TRUDLY", name: "Miror B. Peon Trudly", cls: "Miror B. Peon", map: "PhenacCity_MayorsHouse", x: 8, y: 3, facing: "face_down",
      stages: [
      // (intro #22254, defeat #22255, after #22256, lost #22258)
      { from: 44, team: [["Machoke",53],["Dusclops",54],["Ariados",53]], shadow: "Trudly", intro: ["Awww, no! Not again! Not\nafter we finally got our freedom!","Don't think that we're here\nfor you to beat all the time! I'm","putting an end to this once and for\nall!"], defeat: ["Your toughness… It's\ncriminal!"], after: ["Okay, I get it! I know how\nhonkin' strong you are now! I won't\nbattle you again!"], lost: ["Huh? You're saying you'll let\nme taste the flavor of victory again?","How can I say no? It's time\nto chow!"] }] }
  });

  // The lab's Peons, after the game: their later parties (their words: the lab's own lines for them then).
  Orre.addRematches({
    // (intro #17039, defeat #21095)
    ShadowLab_1F_EventScript_Shadow_COLE: [{ from: labTroopMet, team: [["Wigglytuff",56],["Furret",57],["Octillery",56],["Castform",58]], intro: ["Uh-oh! Intruder alert!"], defeat: ["Why am I the loser?"] }],
    // (intro #17022, defeat #21074)
    ShadowLab_1F_EventScript_Shadow_LARE: [{ from: labTroopMet, team: [["Sneasel",57],["Houndour",56],["Nuzleaf",57],["Sharpedo",56]], intro: ["Oh? You again! You're not getting\noff scot-free this time!"], defeat: ["You might be young, but you\nknow what you're doing."] }],
    // (intro #17296, defeat #21120)
    ShadowLab_B1F_EventScript_Shadow_VANA: [{ from: labTroopMet, team: [["Mawile",57],["Golbat",56],["Swablu",58],["Pupitar",56]], intro: ["Stop right there! There's no\nentry beyond this point!"], defeat: ["Yeah, think you're tough!"] }],
    // (intro #17214, defeat #21118)
    ShadowLab_B1F_EventScript_Shadow_REMIL: [{ from: labTroopMet, team: [["Quagsire",58],["Swellow",58],["Kecleon",58],["Kadabra",57]], intro: ["Hi, there! There's no alarm\nblaring, but here I am anyways!"], defeat: ["You're too strong, little boy!"] }],
    // (intro #17127, defeat #21101)
    ShadowLab_B1F_EventScript_Shadow_LESAR: [{ from: labTroopMet, team: [["Masquerain",57],["Rhyhorn",57],["Grovyle",56]], intro: ["Back again? No welcome for you\nthis time!"], defeat: ["Catastrophically strong!"] }],
    // (intro #17031, defeat #21116)
    ShadowLab_B1F_EventScript_Shadow_TANIE: [{ from: labTroopMet, team: [["Delcatty",43],["Linoone",42],["Vigoroth",44]], intro: ["Back for more mischief?!"], defeat: ["Your mischief is going\noverboard!"] }]
  });

  // The Deep Colosseum's five rounds, as Colosseum's: four battles each, the fourth an Admin (their Shadow Pokémon
  // back in the first one's place if you never snagged it), and the fifth round's Deep King Agnol. Each win of the
  // tournament takes you to the next round; the fifth stays.
  Orre.DEEP_ROUNDS = [
      // Round 1
      [// (defeat #16675, lost #16323)
       { name: "Hunter Dewig", cls: "Hunter", pic: "cooltrainer_m", team: [["Zangoose",60],["Nuzleaf",60],["Tropius",61]], defeat: ["You are good! Like, real good!"], lost: ["Huh? Is that it? That's all\nyou've got?"] },
       // (defeat #16305, lost #16571)
       { name: "Bodybuilder Palen", cls: "Bodybuilder", pic: "black_belt", team: [["Typhlosion",61],["Vigoroth",61],["Hariyama",62]], defeat: ["You're the real deal!"], lost: ["Take care on your trip back to\nthe surface!"] },
       // (defeat #16479, lost #16290)
       { name: "Worker Toway", cls: "Worker", pic: "dp_worker", team: [["Houndour",62],["Girafarig",62],["Dodrio",62],["Ledian",63]], defeat: ["Darn! I'm too tired from all\nmy digging!"], lost: ["You know what makes us\ndifferent? Guts!"] },
       // (intro #16647, defeat #16648, lost #16545)
       { name: "Cipher Admin Miror B.", cls: "Cipher Admin", pic: "rocker", team: [["Armaldo",65],["Ludicolo",63],["Ludicolo",64],["Ludicolo",65],["Exploud",64]], shadow: "Miror B.", intro: ["Fwohohoho! So, we meet\nagain! You're not escaping my wrath\nthis time!"], defeat: ["Oh, no, no, no! My tempo is\noff again! This won't do at all!"], lost: ["Fwohohoho! My dancing is\nsheer perfection today!"] }],
      // Round 2
      [// (defeat #16496, lost #16254)
       { name: "St. Performer Regol", cls: "St. Performer", pic: "juggler", team: [["Electrode",60],["Sneasel",60],["Jumpluff",61]], defeat: ["Ooh la la! It's not any wonder\nhow you've come down here!"], lost: ["Ooh la la! It's such a shame\nyou couldn't win!"] },
       // (defeat #16666, lost #16514)
       { name: "Fun Old Man Gorbel", cls: "Fun Old Man", pic: "em_expert_m", team: [["Walrein",61],["Marshtomp",61],["Delibird",62]], defeat: ["Arrrrgh! How exasperating!"], lost: ["This makes coming here all\nthe more worthwhile!"] },
       // (defeat #16291, lost #16229)
       { name: "Bandana Guy Lobert", cls: "Bandana Guy", pic: "rocker", team: [["Xatu",62],["Medicham",62],["Azumarill",62],["Linoone",63]], defeat: ["I'm sorry, my Pokémon…"], lost: ["We did it! I love you, my\nPokémon!"] },
       // (intro #16202, defeat #16467, lost #16493)
       { name: "Cipher Admin Dakim", cls: "Cipher Admin", pic: "black_belt", team: [["Houndoom",65],["Claydol",63],["Solrock",64],["Flygon",64],["Swampert",65]], shadow: "Dakim", intro: ["Dahahaha! You again! I'll\ncrush you!"], defeat: ["This can't be! The mighty\nDakim loses again?"], lost: ["Dahaha! You have experienced\nthe real might of the mighty Dakim!"] }],
      // Round 3
      [// (defeat #16313, lost #16200)
       { name: "Bodybuilder Varug", cls: "Bodybuilder", pic: "black_belt", team: [["Machoke",60],["Machop",60],["Ursaring",61]], defeat: ["I forgot to focus on winning…"], lost: ["How's that? Now, that's power!"] },
       // (defeat #16487, lost #16449)
       { name: "Rider Shatol", cls: "Rider", pic: "biker", team: [["Graveler",61],["Donphan",61],["Wigglytuff",62],["Wailmer",63]], defeat: ["I see you're good enough to\nget down here."], lost: ["Go on, scram! Scurry back to\nthe surface!"] },
       // (defeat #16656, lost #16711)
       { name: "Researcher Zogo", cls: "Researcher", pic: "scientist", team: [["Granbull",62],["Spinda",62],["Delcatty",62]], defeat: ["I won't believe this happened!"], lost: ["It's a foregone conclusion!"] },
       // (intro #16236, defeat #16277, lost #16421)
       { name: "Cipher Admin Venus", cls: "Cipher Admin", pic: "beauty", team: [["Milotic",65],["Raichu",63],["Meganium",64],["Dusclops",64],["Blissey",65]], shadow: "Venus", intro: ["Oh, no, not you again?! You're\nannoyingly persistent!"], defeat: ["Aiyeeh! How dare you! How dare\nyou!"], lost: ["Ohohoho! It serves you right!"] }],
      // Round 4
      [// (defeat #16670, lost #16674)
       { name: "Chaser Drook", cls: "Chaser", pic: "em_cycling_triathlete_m", team: [["Nuzleaf",60],["Beautifly",60],["Jumpluff",61],["Volbeat",60]], defeat: ["What? I lost? This is a major\nproblem!"], lost: ["As long as I win, I don't\ncare!"] },
       // (defeat #16298, lost #16389)
       { name: "Roller Boy Dult", cls: "Roller Boy", pic: "youngster", team: [["Lanturn",60],["Exploud",61],["Octillery",61],["Lairon",60]], defeat: ["I'm surprised I lost!"], lost: ["Were you surprised by how\nstrong I am?"] },
       // (defeat #16473, lost #16641)
       { name: "Hunter Ophel", cls: "Hunter", pic: "cooltrainer_m", team: [["Swellow",62],["Crawdaunt",62],["Marshtomp",63]], defeat: ["I wanted to win!"], lost: ["Yeah! We did it!"] },
       // (intro #16209, defeat #16639, lost #16365)
       { name: "Cipher Admin Ein", cls: "Cipher Admin", pic: "scientist", team: [["Manectric",65],["Rhydon",63],["Mantine",64],["Gyarados",64],["Crobat",65]], shadow: "Ein", intro: ["You don't give up, do you? I'll\nmake you atone for thwarting our\nShadow Pokémon Caper!"], defeat: ["Urrrgh… What unbelievable power…"], lost: ["Wahahah! Eat your heart out!"] }],
      // Round 5
      [// (defeat #16492, lost #16603)
       { name: "Rider Nelon", cls: "Rider", pic: "biker", team: [["Horsea",63],["Nincada",64],["Shuppet",63]], defeat: ["I'll return when I'm ready for\nthis."], lost: ["Looks like you got ahead of\nyourself coming down here!"] },
       // (defeat #16660, lost #16329)
       { name: "Athlete Lorge", cls: "Athlete", pic: "em_cycling_triathlete_m", team: [["Kadabra",64],["Kecleon",65],["Misdreavus",64],["Seadra",65]], defeat: ["My losing is illogical. It's\nincomprehensible!"], lost: ["Everyone knew that I'd win\nbefore we even started!"] },
       // (defeat #16284, lost #16574)
       { name: "Hunter Grons", cls: "Hunter", pic: "cooltrainer_m", team: [["Mawile",66],["Murkrow",66],["Relicanth",67]], defeat: ["Urk! I'm shocked that I lost!"], lost: ["Haha! All show and no go!"] },
       // (intro #16296, defeat #16458, lost #16319)
       { name: "Deep King Agnol", cls: "Deep King", pic: "super_nerd", team: [["Shuckle",45],["Girafarig",68],["Sableye",69],["Skarmory",66],["Shedinja",68],["Kingdra",70]], shadow: "Agnol", intro: ["Kekeke! Try not to overdo it!"], defeat: ["I see… You are skilled!"], lost: ["You don't know the meaning of\nreckless, do you?"] }]
  ];
  const deep = Orre.TOURNAMENTS.TheUnder_DeepColosseum_EventScript_Receptionist;
  if (deep) deep.rounds = Orre.DEEP_ROUNDS;
  // A round's Trainer as records to battle, and what may be snagged: their Shadow Pokémon, unsnagged, in its own place in
  // the party or the first one's; snagged, it's gone.
  Orre.roundTeam = (e, f) => {
    const got = f.orreShadowSnagged || [], team = e.team.map(([sp, lv]) => window.Party.create(sp, lv)), snag = [];
    for (const s of e.shadow ? Orre.shadowOf(e.shadow) : []) {
      const at = team.findIndex((r) => r.species === s.species && r.level === s.level);
      if (got.includes(s.species)) { if (at >= 0) team.splice(at, 1); continue; }
      team.splice(at >= 0 ? at : 0, 1, Orre.shadowMon(s));
      snag.push(s.species);
    }
    return { team, snag };
  };

  // After the game, Rogue Cail and Chaser Gurks each tell you of a Mystery Troop member still out there, as in
  // Colosseum: Cail of the one in the Snagem Hideout (by his Shadow Pokémon: M2_out #17028, #17612, #17613), Gurks of
  // the one who then turns up in Ein's lab (by name: M4_out #17082, #17080, #17086).
  {
    const CAIL_TIP = {
      Verde: ["Cail: That trainer, he used a Shadow\nBayleef. The trainer's name was…", "Cail: Uh… I forgot! He did say\nsomething about the Snagem Hideout,\nthough."],
      Rosso: ["Cail: That trainer, he used a Shadow\nQuilava. The trainer's name was…", "Cail: Uh… I forgot! He did say\nsomething about the Snagem Hideout,\nthough."],
      Bluno: ["Cail: That trainer, he used a Shadow\nCroconaw. The trainer's name was…", "Cail: Uh… I forgot! He did say\nsomething about the Snagem Hideout,\nthough."]
    };
    const GURKS_TIP = {
      Verde: ["All right. I promised that I'd\ntell you about that Shadow Pokémon.", "The trainer was this guy named\nVerde in a flashy green outfit. He\nhad a Shadow Bayleef with him."],
      Rosso: ["All right. I promised that I'd\ntell you about that Shadow Pokémon.", "The trainer was this guy named\nRosso in a flashy red outfit. He had\na Shadow Quilava with him."],
      Bluno: ["All right. I promised that I'd\ntell you about that Shadow Pokémon.", "The trainer was this guy named\nBluno in a flashy blue outfit. He had\na Shadow Croconaw with him."]
    };
    Orre.CAIL_TIP = CAIL_TIP; Orre.GURKS_TIP = GURKS_TIP;
    const cail = (Orre.REMATCHES.PyriteTown_EventScript_Shadow_CAIL || []).find((s) => s.from === 44);
    if (cail) cail.won = (f) => CAIL_TIP[troopHideout(f)];
    const gurks = (Orre.COLO_TRAINERS.TheUnder_EventScript_Colo_GURKS || { stages: [] }).stages.find((s) => s.from === 44);
    if (gurks) gurks.won = (f) => GURKS_TIP[troopLab(f)];
  }
})();
