// Orre, from Pokémon Colosseum: so far the Orre Air Strip, where Prof. Oak's
// plane sets you down, Team Snagem's hideout, the Outskirt Stand, Phenac City,
// Pyrite Town (and Pyrite Cave) and Agate Village (data/orre-maps.js). As in Colosseum, you go from place to place on the map
// of Orre that comes up as you leave one.
// You're yourself there, with your own Pokémon (an older save made while you
// were Wes, as Orre had you be at first, still swaps back as you leave:
// player.flags.orreStash).
// Depends on: window.WORLD_MAPS, window.Party.
//
//   Orre.inOrre(location)            // an Orre map
//   Orre.enter(player, to)           // off to Orre: the Air Strip (or `to`); where you were is kept
//   Orre.leave(player, location)     // back from Orre, where you were (or `location`)
//   Orre.PLACES, Orre.openPlaces(flags)  // the places on Orre's map; those you can go to
//   Orre.unlock(flags, map)          // a place opens on the map
//   Orre.visible(person, flags)      // ui/game.js's visible() for Orre's people (or undefined)
//   Orre.patches(map, flags)         // the Stand's patches on now (the truck parked)
//   Orre.willieTeam()                // Rider Willie's two Zigzagoon (Lv. 25 and 26)
//   Orre.SHOP                        // what the Stand's bar sells, once Willie's been beaten
//   Orre.SHADOW, Orre.shadowOf(trainer), Orre.shadowMon(entry)  // Colosseum's Shadow Pokémon, by Trainer; one to battle
//   Orre.FILLERS                     // Orre's filler Trainers, by script: { name, cls, pic, team, intro, defeat, after }
//
// The opening's progress is player.flags.orre:
//   0 / undefined  not yet at the Outskirt Stand (Folly and Trudly's truck by it)
//   1              arrived from the Air Strip, and they've come out of the diner
//   2              they've driven off with their sack
//   3              (Willie's battled, in an older save)
// and Colosseum's story proper by player.flags.orreStory: 17 the prologue's tests passed, 18 out of Team Snagem
// (the hideout blown up), 19 Willie battled, 20 Rui out of the sack, 21 the Mayor's house's scene done.
(function () {
  "use strict";

  // Where the plane sets you down: by its door at the Air Strip. (And the south edge of the Stand's clearing, where
  // Wes rode in, and where he parked: an older save's.)
  const START = { map: "OrreAirStrip", x: 17, y: 12, facing: "down" };
  const WES_START = { map: "OutskirtStand", x: 18, y: 23, facing: "up" };
  const PARKED = { x: 17, y: 13 };
  const WES = { name: "Wes", look: "wes", money: 3000, trainerId: 10071 };
  // His partners at the start of Colosseum.
  const WES_TEAM = [
    ["Espeon", 25, ["Confusion", "Return", "Reflect", "Helping Hand"], "Synchronize"],
    ["Umbreon", 26, ["Bite", "Secret Power", "Taunt", "Snatch"], "Synchronize"]
  ];
  // (No Escape Rope: it would take Wes to Kanto.)
  const SHOP = ["poke-ball", "great-ball", "potion", "super-potion", "antidote", "paralyze-heal", "awakening", "repel"];

  const inOrre = (loc) => {
    const m = loc && window.WORLD_MAPS && window.WORLD_MAPS[loc.map];
    return !!(m && m.region === "orre");
  };
  const copy = (x) => JSON.parse(JSON.stringify(x));

  function wesParty() {
    return WES_TEAM.map(([species, level, moves, ability]) => {
      const r = window.Party.create(species, level, { moves });
      r.ability = ability;
      r.gender = "M";
      r.happiness = 255;
      return r;
    });
  }

  function enter(player, to) {
    if (inOrre(player.location)) return;
    player.flags.orreReturn = copy(player.location);
    player.location = Object.assign({}, to || START);
  }
  // (As Wes: an older save's way in, kept for its tests and saves.)
  function enterAsWes(player) {
    if (inOrre(player.location)) return;
    const f = player.flags;
    f.orreStash = copy({ name: player.name, look: player.look, party: player.party, bag: player.bag,
      money: player.money, trainerId: player.trainerId, location: player.location, avatar: f.avatar });
    const wes = f.orreWes || { party: wesParty(), bag: {}, money: WES.money, location: WES_START };
    player.name = WES.name;
    player.look = WES.look;
    player.trainerId = WES.trainerId;
    player.party = copy(wes.party);
    player.bag = copy(wes.bag);
    player.money = wes.money;
    player.location = Object.assign({}, wes.location);
    delete f.avatar;
  }

  function leave(player, location) {
    const f = player.flags, s = f.orreStash;
    if (!s) {
      if (inOrre(player.location) || location) player.location = Object.assign({}, location || f.orreReturn || { map: "PalletTown", x: 16, y: 14, facing: "down" });
      delete f.orreReturn;
      return;
    }
    f.orreWes = copy({ party: player.party, bag: player.bag, money: player.money,
      location: inOrre(player.location) ? player.location : WES_START });
    player.name = s.name;
    player.look = s.look;
    player.trainerId = s.trainerId;
    player.party = s.party;
    player.bag = s.bag;
    player.money = s.money;
    player.location = Object.assign({}, location || s.location);
    if (s.avatar) f.avatar = s.avatar; else delete f.avatar;
    delete f.orreStash;
  }

  // Orre's map (ui/game.js's orreWorldMap): its places, where each is on the map (pixels of
  // assets/town-map/orre.png, 240 by 160) and where you come in (by its way out). At first only
  // the Air Strip and Team Snagem's hideout are open (player.flags.orreMap lists the rest as
  // they open); a save that's been to the Outskirt Stand has that too.
  const PLACES = [
    { map: "SnagemHideout", name: "Snagem Hideout", x: 196, y: 60, arrive: { x: 12, y: 18, facing: "up" } },
    { map: "OutskirtStand", name: "Outskirt Stand", x: 72, y: 110, arrive: { x: 18, y: 22, facing: "up" } },
    { map: "PhenacCity", name: "Phenac City", x: 108, y: 86, arrive: { x: 19, y: 34, facing: "up" } },
    { map: "PyriteTown", name: "Pyrite Town", x: 204, y: 104, arrive: { x: 17, y: 28, facing: "up" } },
    { map: "AgateVillage", name: "Agate Village", x: 180, y: 44, arrive: { x: 17, y: 28, facing: "up" } },
    { map: "OrreAirStrip", name: "Orre Air Strip", x: 96, y: 132, arrive: { x: 21, y: 2, facing: "down" } }
  ];
  const OPEN_AT_FIRST = ["OrreAirStrip", "SnagemHideout"];
  const isOpen = (flags, map) => OPEN_AT_FIRST.includes(map) || (flags.orreMap || []).includes(map) || (map === "OutskirtStand" && (flags.orre | 0) > 0);
  const openPlaces = (flags) => PLACES.filter((p) => isOpen(flags, p.map));
  function unlock(flags, map) {
    if (isOpen(flags, map)) return false;
    (flags.orreMap = flags.orreMap || []).push(map);
    return true;
  }

  const ID = (k) => "LOCALID_ORRE_" + k;
  // (Rider Willie, at the Stand from Colosseum's story proper: player.flags.orreStory 18.)
  const WILLIE_YET = (flags) => (flags.orreStory | 0) >= 18;
  // (Colosseum's story proper, player.flags.orreStory from 18: Team Snagem's hideout wrecked and its people gone;
  // Folly and Trudly's truck back at the Stand (18), then at Phenac City (19); Willie in the diner once they've gone;
  // Rui, the Snagem grunts and Folly and Trudly at the Mayor's house only in its scene. ui/game.js's Orre scenes.)
  function visible(person, flags) {
    const step = flags.orre | 0, story = flags.orreStory | 0;
    switch (person.localId) {
      case ID("TRUCK"): return step < 2 || (story === 18 && !flags.orreStandFT);
      case ID("BIKE"): return false;   // (Wes's, parked: you came on foot, from the Air Strip)
      case ID("FOLLY"): case ID("TRUDLY"): case ID("WILLIE"): return false;   // (only in their scenes)
      case ID("DINER_WILLIE"): return WILLIE_YET(flags) && !!flags.orreStandFT;
      case ID("GUARD_1"): case ID("GUARD_2"): case ID("LOOKOUT"): case ID("ROCCO"): case ID("VIC"): return story < 18 ? undefined : false;
      case ID("PHENAC_TRUCK"): return story === 19;
      case ID("PHENAC_FOLLY"): case ID("PHENAC_TRUDLY"): return story === 19 && !flags.orreFT;
      case ID("MAYOR_ES_CADE"): return !(story === 20 && (flags.orreMayor | 0) >= 1);   // (out on his investigation)
      case ID("PHENAC_RUI"): case ID("MAYOR_RUI"): case ID("MAYOR_FOLLY"): case ID("MAYOR_TRUDLY"):
      case ID("MAYOR_GRUNT_1"): case ID("MAYOR_GRUNT_2"): return false;   // (only in their scenes)
      default: return undefined;
    }
  }
  const patches = (map, flags) => {
    const story = flags.orreStory | 0;
    if (map === "OutskirtStand") return (flags.orre | 0) < 2 || (story === 18 && !flags.orreStandFT) ? ["truck"] : [];
    if (map === "PhenacCity") return story === 19 ? ["truck"] : [];
    return [];
  };

  // Orre's filler Trainers (this game's own; tools/build-orre.js places them): by their script, each battles you
  // once, two on two; `team` as [species, level]. So your Pokémon can grow toward the prologue's cap (Lv. 26).
  const FILLERS = {"SnagemHideout_EventScript_Filler_ROCCO": {"name": "Snagem Grunt Rocco", "cls": "Team Rocket", "pic": "snagem_grunt", "team": [["Poochyena", 6], ["Zubat", 6]], "intro": ["Oi! You lost? This is Snagem turf!"], "defeat": ["Ugh! Not bad, kid."], "after": ["Stick around. Snagem always needs\nTrainers who can fight."]},
    "SnagemHideout_EventScript_Filler_VIC": {"name": "Snagem Grunt Vic", "cls": "Team Rocket", "pic": "snagem_grunt", "team": [["Koffing", 7], ["Poochyena", 7]], "intro": ["Bored, bored, bored. Battle me, kid!"], "defeat": ["Guess I'm not bored now."], "after": ["The boss is getting big ideas lately.\nBig machines, big deals…"]},
    "PhenacCity_EventScript_Filler_BEN": {"name": "Youngster Ben", "cls": "Youngster", "pic": "youngster", "team": [["Lotad", 8], ["Seedot", 8]], "intro": ["I'm the toughest kid in Phenac!\nProbably!"], "defeat": ["Not the toughest, then…"], "after": ["Phenac's water comes from under the\ndesert. Pretty cool, huh?"]},
    "PhenacCity_EventScript_Filler_MIA": {"name": "Lass Mia", "cls": "Lass", "pic": "lass", "team": [["Wingull", 9], ["Marill", 9]], "intro": ["Oh, a new face! Let's battle by the\nfountain!"], "defeat": ["My Pokémon got splashed!"], "after": ["The Mayor says Phenac Stadium will\nopen again soon."]},
    "PhenacCity_EventScript_Filler_ELLIS": {"name": "Gentleman Ellis", "cls": "Gentleman", "pic": "gentleman", "team": [["Spinda", 9], ["Plusle", 10], ["Minun", 10]], "intro": ["A battle, young one? I'd be delighted."], "defeat": ["Splendid! Quite splendid."], "after": ["Orre was a quieter place once.\nLately, I'm not so sure."]},
    "OutskirtStand_EventScript_Filler_PAT": {"name": "Hiker Pat", "cls": "Hiker", "pic": "hiker", "team": [["Sandshrew", 11], ["Trapinch", 11]], "intro": ["Walked all the way out from Pyrite!\nMy legs need a rest, but my Pokémon\ndon't!"], "defeat": ["Oof! Rested enough, I guess."], "after": ["The sand out here hides all sorts.\nI found a whole bottle cap once!"]},
    "OutskirtStand_EventScript_Filler_LOU": {"name": "Biker Lou", "cls": "Biker", "pic": "biker", "team": [["Zigzagoon", 12], ["Taillow", 12], ["Wingull", 12]], "intro": ["Vroom vroom! Let's race… I mean,\nbattle!"], "defeat": ["Out of gas!"], "after": ["Folks say some Pokémon in Orre have\nbeen acting real strange. Mean, like."]},
    "OutskirtStand_EventScript_Filler_JAY": {"name": "Rocker Jay", "cls": "Rocker", "pic": "rocker", "team": [["Numel", 12], ["Baltoy", 13]], "intro": ["The jukebox in there's been stuck on\nthe same song all week! I need to\nblow off steam!"], "defeat": ["Man, that's even worse!"], "after": ["The bartender won't fix the jukebox.\nSays it's \"part of the charm.\""]},
    "PyriteTown_EventScript_Filler_HANK": {"name": "Burglar Hank", "cls": "Burglar", "pic": "burglar", "team": [["Poochyena", 15], ["Houndour", 15], ["Carvanha", 15]], "intro": ["Nice Bag you got there. Mind if I…\nlook inside? After a battle, say?"], "defeat": ["Keep your Bag, then!"], "after": ["Rook thinks he runs this part of town.\nHe doesn't."]},
    "PyriteTown_EventScript_Filler_RYU": {"name": "Black Belt Ryu", "cls": "Black Belt", "pic": "black_belt", "team": [["Machop", 16], ["Makuhita", 16]], "intro": ["In Pyrite, the strong survive! Hyah!"], "defeat": ["My training… isn't over!"], "after": ["Every Trainer in Pyrite wants to fight\nin the Colosseum. When it opens…"]},
    "PyriteTown_EventScript_Filler_DORN": {"name": "Scientist Dorn", "cls": "Scientist", "pic": "scientist", "team": [["Koffing", 16], ["Sableye", 17], ["Grimer", 16]], "intro": ["My research is very important. Too\nimportant for interruptions! Battle!"], "defeat": ["My data… corrupted!"], "after": ["I study Pokémon behaviour. Something\nis making some of them… cold."]},
    "PyriteTown_EventScript_Filler_VINCE": {"name": "Rocker Vince", "cls": "Rocker", "pic": "rocker", "team": [["Mightyena", 18], ["Weezing", 18]], "intro": ["Pyrite's my stage, kid! Let's rock!"], "defeat": ["Feedback! Feedback!"], "after": ["That cave out east? Hikers go in to\ndig. I go in for the echo."]},
    "AgateVillage_EventScript_Filler_KYLE": {"name": "Pokémon Ranger Kyle", "cls": "Pokémon Ranger", "pic": "pokemon_ranger_m", "team": [["Nuzleaf", 19], ["Shroomish", 19], ["Lotad", 19]], "intro": ["Fay and I came to Agate to look into\nsome strange reports. Show me your\nPokémon's strength!"], "defeat": ["You're a strong one."], "after": ["Some Pokémon here have been seen\nattacking people. That's not natural."]},
    "AgateVillage_EventScript_Filler_BO": {"name": "Camper Bo", "cls": "Camper", "pic": "camper", "team": [["Pidgeotto", 20], ["Lombre", 20]], "intro": ["Camping in Agate's the best! Battling\nin Agate's even better!"], "defeat": ["Back to my tent…"], "after": ["Have you seen Mt. Battle? You can see\nit from the top of the village."]},
    "AgateVillage_EventScript_Filler_IVY": {"name": "Picnicker Ivy", "cls": "Picnicker", "pic": "picnicker", "team": [["Swablu", 20], ["Skiploom", 21], ["Marill", 20]], "intro": ["I picked all these flowers myself!\nNow let's battle!"], "defeat": ["My flowers got squashed!"], "after": ["Granny over there makes the best\nberry tarts in Orre."]},
    "AgateVillage_EventScript_Filler_DANA": {"name": "Cooltrainer Dana", "cls": "Cooltrainer", "pic": "cooltrainer_f", "team": [["Breloom", 22], ["Dodrio", 22]], "intro": ["I came to Agate to train under Eagun.\nLet's see if you're worth my time!"], "defeat": ["Hm. You'll do."], "after": ["Eagun trained here as a boy. They say\nhe battled alongside the Relic Stone's\nguardians."]},
    "PyriteCave_EventScript_Filler_GUS": {"name": "Hiker Gus", "cls": "Hiker", "pic": "hiker", "team": [["Graveler", 23], ["Onix", 23], ["Geodude", 22]], "intro": ["Mind your head in here! And mind my\nPokémon!"], "defeat": ["Rocked!"], "after": ["Rowe's been digging this cave longer\nthan anyone. He's at the far end."]},
    "PyriteCave_EventScript_Filler_PIP": {"name": "Ruin Maniac Pip", "cls": "Ruin Maniac", "pic": "ruin_maniac", "team": [["Sandslash", 24], ["Nosepass", 24]], "intro": ["Old carvings, old tunnels, old rocks!\nAnd an old-fashioned battle!"], "defeat": ["My ruins! My poor ruins!"], "after": ["Somebody's been bringing machines down\nhere. Big ones. With a Cipher mark."]},
    "PyriteCave_EventScript_Filler_MOE": {"name": "Engineer Moe", "cls": "Engineer", "pic": "engineer", "team": [["Golbat", 24], ["Lairon", 25], ["Sableye", 24]], "intro": ["I'm surveying this cave. Who're you?\nNever mind. Battle!"], "defeat": ["Survey says: I lost."], "after": ["These tunnels go a long way. Some of\nthem don't show on any map."]},
    "PyriteCave_EventScript_Filler_REX": {"name": "Cooltrainer Rex", "cls": "Cooltrainer", "pic": "cooltrainer_m", "team": [["Machoke", 25], ["Vibrava", 25]], "intro": ["Training in the dark sharpens the mind.\nLet's see how sharp yours is!"], "defeat": ["Sharp indeed!"], "after": ["Push your Pokémon hard, but never\nfurther than they can go."]},
    "PyriteCave_EventScript_Filler_BOULDER": {"name": "Hiker Boulder", "cls": "Hiker", "pic": "hiker", "team": [["Steelix", 26], ["Golem", 26]], "intro": ["Name's Boulder. Hardest Hiker in Orre!\nNobody passes without a battle!"], "defeat": ["Crumbled! Me!"], "after": ["Rowe's just round there. Tough old\nfellow. Tougher Gligar."]}};

  // Colosseum's Shadow Pokémon, in its order: [species, level, Trainer class, Trainer, where you meet them]. Colosseum's
  // story proper gives each Trainer theirs (Orre.shadowOf(trainer): [{ species, level, cls, trainer, place }]), so they
  // match the game; this game's own Orre before it (the prologue) keeps clear of these Trainers' names.
  const SHADOW = [
    ["Makuhita", 30, "Miror B. Peon", "Trudly", "Phenac City (the Mayor's house)"],
    ["Bayleef", 30, "Cipher Peon", "Verde", "Phenac City"],
    ["Quilava", 30, "Cipher Peon", "Rosso", "Phenac City"],
    ["Croconaw", 30, "Cipher Peon", "Bluno", "Phenac City"],
    ["Furret", 33, "Rogue", "Cail", "Pyrite Town"],
    ["Misdreavus", 30, "Rider", "Vant", "Pyrite Town"],
    ["Noctowl", 30, "Rider", "Nover", "Pyrite Town"],
    ["Flaaffy", 30, "St. Performer", "Diogo", "Pyrite Town"],
    ["Skiploom", 30, "Rider", "Leba", "Pyrite Town"],
    ["Quagsire", 30, "Bandana Guy", "Divel", "Pyrite Town"],
    ["Slugma", 30, "Roller Boy", "Lon", "Pyrite Town"],
    ["Yanma", 33, "Cipher Peon", "Nore", "Pyrite Building"],
    ["Remoraid", 20, "Miror B. Peon", "Reath", "Pyrite Building"],
    ["Mantine", 33, "Miror B. Peon", "Ferma", "Pyrite Building"],
    ["Qwilfish", 33, "Hunter", "Doken", "Pyrite Town"],
    ["Meditite", 33, "Rider", "Twan", "Pyrite Cave"],
    ["Dunsparce", 33, "Rider", "Sosh", "Pyrite Cave"],
    ["Swablu", 33, "Hunter", "Zalo", "Pyrite Cave"],
    ["Sudowoodo", 35, "Cipher Admin", "Miror B.", "Miror B.'s Hideout"],
    ["Hitmontop", 38, "Cipher Peon", "Skrub", "Agate Village"],
    ["Entei", 40, "Cipher Admin", "Dakim", "Mt. Battle"],
    ["Ledian", 40, "Cipher Peon", "Kloak", "The Under"],
    ["Suicune", 40, "Cipher Admin", "Venus", "The Under"],
    ["Gligar", 43, "Hunter", "Frena", "The Under Subway"],
    ["Stantler", 43, "Chaser", "Liaks", "The Under Subway"],
    ["Piloswine", 43, "Bodybuilder", "Lonia", "The Under Subway"],
    ["Sneasel", 43, "Rider", "Nelis", "The Under Subway"],
    ["Aipom", 43, "Cipher Peon", "Cole", "the Shadow Pokémon Lab"],
    ["Murkrow", 43, "Cipher Peon", "Lare", "the Shadow Pokémon Lab"],
    ["Forretress", 43, "Cipher Peon", "Vana", "the Shadow Pokémon Lab"],
    ["Ariados", 43, "Cipher Peon", "Lesar", "the Shadow Pokémon Lab"],
    ["Vibrava", 43, "Cipher Peon", "Remil", "the Shadow Pokémon Lab"],
    ["Raikou", 40, "Cipher Peon", "Rosso", "the Shadow Pokémon Lab"],
    ["Delibird", 45, "Cipher Peon", "Arton", "Realgam Tower"],
    ["Sunflora", 45, "Cipher Peon", "Baila", "Realgam Tower"],
    ["Heracross", 45, "Cipher Peon", "Dioge", "Realgam Tower"],
    ["Skarmory", 47, "Snagem Head", "Gonzap", "Realgam Tower"],
    ["Miltank", 48, "Bodybuilder", "Jomas", "Realgam Tower's Colosseum"],
    ["Absol", 48, "Rider", "Delan", "Realgam Tower's Colosseum"],
    ["Houndoom", 48, "Cipher Peon", "Nella", "Realgam Tower's Colosseum"],
    ["Tropius", 49, "Cipher Peon", "Ston", "Realgam Tower's Colosseum"],
    ["Metagross", 50, "Cipher Admin", "Nascour", "Realgam Tower's Colosseum"],
    ["Tyranitar", 55, "Cipher Head", "Evice", "Realgam Tower's Colosseum"],
    ["Smeargle", 45, "Team Snagem", "Biden", "the Snagem Hideout (after the game)"],
    ["Ursaring", 45, "Team Snagem", "Agrev", "the Snagem Hideout (after the game)"],
    ["Shuckle", 45, "Deep King", "Agnol", "the Deep Colosseum (after the game)"],
    ["Togetic", 20, "Fake Hero", "Fein", "the Outskirt Stand (after the game)"]
  ].map(([species, level, cls, trainer, place]) => ({ species, level, cls, trainer, place }));
  // A Trainer's Shadow Pokémon (Rosso has two), and one as a record ready to battle: a Shadow Pokémon (record.shadow)
  // knowing Shadow Rush.
  const shadowOf = (trainer) => SHADOW.filter((s) => s.trainer === trainer);
  function shadowMon(s) {
    const r = window.Party.create(s.species, s.level);
    r.shadow = true;
    r.moves = [{ name: "Shadow Rush", pp: 5 }].concat(r.moves.filter((m) => m.name !== "Shadow Rush").slice(0, 3));
    return r;
  }

  // Rider Willie's two Zigzagoon (Lv. 25 and 26: met at the start of Colosseum's story proper).
  const willieTeam = () => [window.Party.create("Zigzagoon", 25), window.Party.create("Zigzagoon", 26)];

  window.Orre = { SHADOW, shadowOf, shadowMon, FILLERS, PLACES, openPlaces, isOpen, unlock, START, WES_START, PARKED, WES, WES_TEAM, SHOP, inOrre, enter, enterAsWes, leave, visible, patches, willieTeam, wesParty };
})();
