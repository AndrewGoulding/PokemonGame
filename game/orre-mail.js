// Orre's e-mail, Colosseum's: the P★DA's e-mail (pda_menu), each arriving where Colosseum has it come, and kept to read
// again (the Start menu's E-MAIL, while in Orre). Colosseum's words for every e-mail: its subject, its sender and its
// body (ids in the comments; tools/colosseum-say.js lays them out). Depends on: window.Orre (and game/orre-trainers*.js
// for the Mystery Troop and Cail's later battles).
//
//   Orre.MAIL                      // key -> { subject, from, body: [page], after?: [page] }
//   Orre.mailDue(flags, map)       // keys of e-mails due to arrive now (on coming into an Orre map), in order
//   Orre.mailReceive(flags, key)   // it's arrived (player.flags.orreMail.got: keys, oldest first)
//   Orre.mailRead(flags, key)      // it's been read (player.flags.orreMail.read)
//   Orre.mailList(flags)           // the e-mails received, newest first: [{ key, subject, from, read }]
//
// Two arrive in the story's scenes (ui/game.js): Duking's EMERGENCY!!! at Eagun's house (agateShrine), and TROUBLE IN
// UNDER? after Mt. Battle (mtBattleSummit). The rest arrive by `when` as you come into an Orre map.
"use strict";

(function () {
  const Orre = window.Orre;
  const MAIL = {
    EMERGENCY: { subject: "Emergency!!!", from: "Duking of Pyrite Town",   // (#20859, #20860, #20861)
      body: ["{PLAYER}, we've got big trouble! I\njust got word from our people that\nMt. Battle's under attack by a","mysterious group of thugs. Please,\ncan you go help? We think it's the","same group as the one Miror B.\nbelonged to. We're counting on you!"] },
    TROUBLE_IN_UNDER: { subject: "Trouble in Under?", from: "Secc in Pyrite Town",   // (#16023, #16130, #16040)
      body: ["Hi, big guy. We've been hearing about\nShadow Pokémon from people visiting\nThe Under from Pyrite. A lot of the","visitors have seen the Shadow\nPokémon. Nett in The Under should\nhave more information for you."] },
    MIROR_PEON_NABBED: { subject: "Miror Peon Nabbed!", from: "Chief Sherles",   // (#17425, #16069, #17422)
      body: ["{PLAYER}, it's Sherles. We've just\napprehended a pair of thugs we\nbelieve to be Miror B.'s underlings.","We may be able to lean on them for\ninformation. We have them locked up,\nso hurry over to Pyrite."] },
    LAB_DATA: { subject: "Lab Data?", from: "Nett from The Under",   // (#21079, #16143, #16031)
      body: ["Hi, this is Nett. If you find any\ndata at the Shadow Pokémon Lab,","please bring it to me in The Under.\nI'll be waiting."] },
    SHADOW_LIST: { subject: "Shadow Pokémon List!", from: "Nett from The Under",   // (#16149, #16143, #16108)
      body: ["{PLAYER}, I did it! I analyzed the\ndata ROM and managed to extract a\npartial list of Shadow Pokémon. For","the time being, I've identified 29\nShadow Pokémon. There appear to be","more, so I'll send updates when I\nfind them."] },
    NEW_SYSTEM: { subject: "New System Done!", from: "Nett from The Under",   // (#21752, #21753, #21754)
      body: ["We, that's me and Secc in Pyrite,\ndeveloped a new system of downloading\ndata automatically to your P★DA. From","now on, information about Shadow\nPokémon should arrive directly from","people connected to the network.\nCheck it out!"] },
    GREETINGS: { subject: "Greetings", from: "Eagun of Agate Village",   // (#21767, #21768, #21778)
      body: ["Dear {PLAYER}, This is Eagun of Agate\nVillage. I just wanted to let you\nknow this is my first electronic","mail. I am not familiar with\nhigh-tech things, so I have only","learned how to type in words.\nIncidentally, if you are ever in"] },
    WHO_IS_THIS: { subject: "Who Is This?", from: "Bitt from The Under",   // (#16060, #16121, #16181)
      body: ["Hi, it's Bitt in The Under. I was\ntaking photos the other day when I\nsaw this guy with this amazing head,","so I snapped him. He was singing this\nweird song. Something about the\nColosseum being his new place."] },
    KID_NETWORK: { subject: "Shadow Pokémon?", from: "Secc in Pyrite Town",   // (#16061, #16130, #16136)
      body: ["Big guy, there's trouble! The Kid\nNetwork got word that a\nsuspicious-looking Pokémon was","spotted in Pyrite. I'd like to give\nyou the full story in person, so can\nyou come visit me?"] },
    LIST_1: { subject: "List Analysis!", from: "Nett from The Under",   // (#17424, #16143, #16110)
      body: ["Hi, it's Nett. I analyzed the Shadow\nPokémon List again and discovered six\nmore. The additions are Tyranitar,","Misdreavus, Slugma, Smeargle, Absol,\nand Heracross. I'll send another\nupdate if I can find any more."] },
    LIST_2: { subject: "List Analysis!", from: "Nett from The Under",   // (#17424, #16143, #16112)
      body: ["Hi, it's Nett. I analyzed the Shadow\nPokémon List again and discovered six\nmore. The additions are Ursaring,","Skiploom, Quagsire, Tropius,\nSkarmory, and Sunflora. Look for more\nupdates!"] },
    LIST_3: { subject: "List Analysis!", from: "Nett from The Under",   // (#17424, #16143, #16114)
      body: ["Hi, it's Nett. I analyzed the Shadow\nPokémon List again and discovered six\nmore. The additions are Noctowl,","Flaaffy, Houndoom, Shuckle, Miltank,\nand Delibird. I'll be in contact."] },
    LIST_DONE: { subject: "List Completed!", from: "Nett from The Under",   // (#16122, #16143, #16116)
      body: ["Hi, it's Nett. I analyzed the Shadow\nPokémon List some more and discovered\nthe very last one. The last Shadow","Pokémon was Togetic! That completes\nthe analysis of the data ROM you\nprovided!"] },
    RECEIVE_PHOTOS: { subject: "Receive Photos", from: "Bitt from The Under",   // (#16124, #16121, #16137)
      body: ["{PLAYER}, did you know? Your P★DA can\nreceive not only e-mail, it can also","accept digital photos. I'll send one\nas a test. I hope it reaches you."] },
    BIG_SNAG_MACHINE: { subject: "Big Snag Machine?", from: "Bitt from The Under",   // (#16037, #16121, #16057)
      body: ["Hi, this is Bitt in The Under.\nThere's this freaky rumor going\naround that Snagem holdouts fixed a","big Snag Machine. Do you think it's\ntrue? Can you look into it, too,\n{PLAYER}?"] },
    SNAGEM_RUMOR: { subject: "Shadow Pokémon?", from: "Bitt from The Under",   // (#16123, #16121, #16073)
      body: ["Hi, this is Bitt in The Under. Got\nsome more news about those Snagem\nholdouts. There's a rumor now about a","creepy Smeargle and Ursaring. I think\nit's worth checking out."] },
    TRAINER_VERDE: { subject: "Bayleef Trainer", from: "Secc in Pyrite Town",   // (#16125, #16130, #16138)
      body: ["Hi, big guy! Cail wanted me to tell\nyou that the Shadow Bayleef's trainer\nis named Verde. Please take care!"] },
    TRAINER_ROSSO: { subject: "Quilava Trainer", from: "Secc in Pyrite Town",   // (#16172, #16130, #16177)
      body: ["Hi, big guy! Cail wanted me to tell\nyou that the Shadow Quilava's trainer\nis named Rosso. Please take care!"] },
    TRAINER_BLUNO: { subject: "Croconaw Trainer", from: "Secc in Pyrite Town",   // (#16173, #16130, #16178)
      body: ["Hi, big guy! Cail wanted me to tell\nyou that the Shadow Croconaw's","trainer is named Bluno. Please take\ncare!"] },
    LAB_VERDE: { subject: "Shadow Pokémon Lab", from: "Marcia of Pyrite Town",   // (#16024, #16098, #16042)
      body: ["It appears as if criminals are\ngathering at the Shadow Pokémon Lab\nagain. There's more. People have seen","a Cipher Peon in a gaudy green outfit\nwith a Shadow Bayleef. I wonder\nwhat's up?"] },
    LAB_ROSSO: { subject: "Shadow Pokémon Lab", from: "Marcia of Pyrite Town",   // (#16174, #16098, #16179)
      body: ["It appears as if criminals are\ngathering at the Shadow Pokémon Lab\nagain. There's more. People have seen","a Cipher Peon in a gaudy red outfit\nwith a Shadow Quilava. I wonder\nwhat's up?"] },
    LAB_BLUNO: { subject: "Shadow Pokémon Lab", from: "Marcia of Pyrite Town",   // (#16175, #16098, #16180)
      body: ["It appears as if criminals are\ngathering at the Shadow Pokémon Lab\nagain. There's more. People have seen","a Cipher Peon in a gaudy blue outfit\nwith a Shadow Croconaw. I wonder\nwhat's up?"] },
    WATCH_TV: { subject: "Watch TV!", from: "Nett from The Under",   // (#16077, #16143, #16131)
      body: ["It's me, Nett! Please watch TV now!"] },
    WHATS_WITH_YOU: { subject: "What's with You?", from: "Dash the Athlete",   // (#16059, #16087, #16113)
      body: ["I'm Dash from Phenac. I'm just an\nordinary citizen who happens to run\naround the town's fountain. So what","gives you the right to have your\nPokémon attack me? You don't deserve","any respect as a trainer. Shame on\nyou!"] },
    TOGETIC: { subject: "Who Is This?", from: "Bitt from The Under",   // (#16176, #16121, #16115)
      body: ["It's Bitt in The Under. {PLAYER}, I\ncaught you on film in an unbelievable\nscene that's terrible and shocking.","What's your problem? Why are you\nattacking people with a Shadow\nTogetic?"] },
    DEEP_KING_1: { subject: "Deep King?", from: "Nett from The Under",   // (#16062, #16143, #16074)
      body: ["This is Nett. I heard you've gone to\nthe Deep Colosseum. I heard a rumor\nabout it. There's supposed to be a","seriously tough trainer who goes by\nthe name of Deep King. I wonder what\nPokémon he uses?"] },
    DEEP_KING_2: { subject: "Deep King!", from: "Nett from The Under",   // (#16063, #16143, #16075)
      body: ["This is Nett. I'm getting information\nabout Deep King, but slowly. He does\nsound like an expert trainer, though.","I wonder what kind of Pokémon he\nuses?"] },
    DEEP_KING_3: { subject: "Deep King!", from: "Nett from The Under",   // (#16064, #16143, #16076)
      body: ["This is Nett. I've been slowly\ngetting more information on the\ntrainer Deep King. He apparently uses","a Shadow Shuckle. He could be very\ntenacious."] },
    DEEP_KING_4: { subject: "Deep King!", from: "Nett from The Under",   // (#16065, #16143, #16078)
      body: ["This is Nett. There's a rumor that\nDeep King is entered in the knockout\ntourney at the Deep Colosseum.","{PLAYER}, you've got to enter, too,\nand show up his highness!"] },
    DEEP_KING_5: { subject: "I Am Deep King!", from: "Agnol the Deep King",   // (#16066, #16089, #16080)
      body: ["Kukuku… I'm Agnol, also called Deep\nKing! I enjoyed battling you. But\nyou're still a greenhorn! So long as","I have my Shadow Shuckle, I'll take\non your challenge at the Deep\nColosseum anytime!"] }
  };
  // (Eagun's first e-mail is cut short: Rui's words on reading it, D4_dome_11 #21774.)
  MAIL.GREETINGS.after = ["Rui: Oh, Grandpa… The e-mail's cut\noff before he finally gets to the\npoint.",
    "Rui: What should we do, {PLAYER}?\nShould we go back to Agate Village?\nOr should we keep going?"];

  // When each arrives (flags, the map you've come into). Colosseum's order: Sherles's after Miror B.'s fall; Nett's
  // as you reach the lab, and his list once you've the lab's data (Ein beaten); Nett's new system at Realgam Tower and
  // Eagun's in its dome; then the Kid Network's: Bitt's, Secc's (Cail's word on the Mystery Troop member in the Snagem
  // Hideout), Marcia's (the one then at the lab), Nett's list updates as Shadow Pokémon are snagged, and Fein's doings
  // (once all but his Togetic are snagged); Nett's and Agnol's about the Deep Colosseum's king.
  const story = (f) => f.orreStory | 0;
  const got = (f, k) => ((f.orreMail || {}).got || []).includes(k);
  const snaggedCount = (f) => new Set(f.orreShadowSnagged || []).size;
  const snaggedAll = (f, who) => Orre.shadowOf(who).every((s) => (f.orreShadowSnagged || []).includes(s.species));
  const deepWins = (f) => ((f.orreTourney || {}).deep | 0);
  const cailTold = (f) => { const r = Orre.rematchStage && Orre.rematchStage("PyriteTown_EventScript_Shadow_CAIL", f); return !!(r && r.stage && r.stage.from === 44 && r.beaten); };
  const troop = (who, side) => (f) => story(f) >= 44 && !snaggedAll(f, who) && (side === "hideout"
    ? cailTold(f) && Orre.troopHideout && Orre.troopHideout(f) === who
    : Orre.labTroopMet && Orre.labTroopMet(f) && Orre.troopLab(f) === who);
  const fein = (f) => story(f) >= 44 && snaggedCount(f) >= 47 && !(f.orreShadowSnagged || []).includes("Togetic");
  const WHEN = {
    MIROR_PEON_NABBED: (f) => story(f) >= 27,
    LAB_DATA: (f, map) => story(f) >= 36 && /^ShadowLab/.test(map),
    SHADOW_LIST: (f) => story(f) >= 40 && !!f.orreDataRom,   // (once Nett has the Data ROM from Ein's room)
    NEW_SYSTEM: (f, map) => story(f) >= 41 && /^RealgamTower/.test(map),
    GREETINGS: (f, map) => story(f) >= 42 && map === "RealgamTower_Dome",
    WHO_IS_THIS: (f) => story(f) >= 41 && got(f, "NEW_SYSTEM"),
    KID_NETWORK: (f) => story(f) >= 41 && got(f, "WHO_IS_THIS"),
    LIST_1: (f) => got(f, "SHADOW_LIST") && snaggedCount(f) >= 30,
    LIST_2: (f) => got(f, "LIST_1") && snaggedCount(f) >= 36,
    LIST_3: (f) => got(f, "LIST_2") && snaggedCount(f) >= 42,
    LIST_DONE: (f) => got(f, "LIST_3") && snaggedCount(f) >= 47,
    RECEIVE_PHOTOS: (f) => story(f) >= 44,
    BIG_SNAG_MACHINE: (f) => story(f) >= 44 && got(f, "RECEIVE_PHOTOS"),
    SNAGEM_RUMOR: (f) => story(f) >= 44 && got(f, "BIG_SNAG_MACHINE"),
    TRAINER_VERDE: troop("Verde", "hideout"), TRAINER_ROSSO: troop("Rosso", "hideout"), TRAINER_BLUNO: troop("Bluno", "hideout"),
    LAB_VERDE: troop("Verde", "lab"), LAB_ROSSO: troop("Rosso", "lab"), LAB_BLUNO: troop("Bluno", "lab"),
    WATCH_TV: fein, WHATS_WITH_YOU: (f) => fein(f) && got(f, "WATCH_TV"), TOGETIC: (f) => fein(f) && got(f, "WHATS_WITH_YOU"),
    DEEP_KING_1: (f, map) => story(f) >= 44 && map === "TheUnder_DeepColosseum",
    DEEP_KING_2: (f) => got(f, "DEEP_KING_1") && deepWins(f) >= 1,
    DEEP_KING_3: (f) => got(f, "DEEP_KING_2") && deepWins(f) >= 2,
    DEEP_KING_4: (f) => got(f, "DEEP_KING_3") && deepWins(f) >= 4,
    DEEP_KING_5: (f) => got(f, "DEEP_KING_4") && deepWins(f) >= 5 && !(f.orreShadowSnagged || []).includes("Shuckle")
  };

  const box = (f) => { const m = (f.orreMail = f.orreMail || {}); m.got = m.got || []; m.read = m.read || []; return m; };
  function mailDue(flags, map) {
    const out = [];
    for (const [k, when] of Object.entries(WHEN)) {
      if (got(flags, k)) continue;
      // (Each one's condition sees the ones before it as arrived: a run of them arrives together, in order.)
      try { if (when(flags, map || "")) { out.push(k); box(flags).got.push(k); } } catch (e) { /* (a condition on something not there yet) */ }
    }
    for (const k of out) box(flags).got.splice(box(flags).got.indexOf(k), 1);
    return out;
  }
  const mailReceive = (flags, key) => { const m = box(flags); if (!m.got.includes(key)) m.got.push(key); };
  const mailRead = (flags, key) => { const m = box(flags); if (!m.read.includes(key)) m.read.push(key); };
  const mailList = (flags) => box(flags).got.slice().reverse().filter((k) => MAIL[k])
    .map((key) => ({ key, subject: MAIL[key].subject, from: MAIL[key].from, read: box(flags).read.includes(key) }));

  Object.assign(Orre, { MAIL, MAIL_WHEN: WHEN, mailDue, mailReceive, mailRead, mailList });
})();
