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
    { map: "MtBattle", name: "Mt. Battle", x: 208, y: 30, arrive: { x: 16, y: 30, facing: "up" } },
    { map: "ShadowLab_1F", name: "Shadow Pokémon Lab", x: 40, y: 120, arrive: { x: 7, y: 8, facing: "up" } },
    { map: "RealgamTower_1F", name: "Realgam Tower", x: 222, y: 126, arrive: { map: "RealgamTower_Exterior", x: 19, y: 34, facing: "up" } },
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
  // (Others' rules, by localId: game/orre-trainers.js's Trainers.)
  const EXTRA_VISIBLE = {};
  function visible(person, flags) {
    if (EXTRA_VISIBLE[person.localId]) return EXTRA_VISIBLE[person.localId](flags);
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
      // (Pyrite Town, Colosseum's story from 21: its Trainers with Shadow Pokémon; Nore on the Pyrite Building's
      // stairs till he's beaten (25); Reath, Ferma, Miror B. and Nascour on its top floor, Silva, Duking and Miror B.
      // at his hideout, only in their scenes; Miror B. and Plusle in the hideout till he's beaten (26).)
      case ID("SHADOW_CAIL"): case ID("SHADOW_VANT"): case ID("SHADOW_NOVER"): case ID("SHADOW_DIOGO"): case ID("SHADOW_LEBA"):
      case ID("SHADOW_DIVEL"): case ID("SHADOW_LON"): case ID("SHADOW_DOKEN"): case ID("SHADOW_TWAN"): case ID("SHADOW_SOSH"):
      case ID("SHADOW_ZALO"): return story >= 21;
      case ID("NORE"): return story < 25;
      // (Agate Village, Colosseum's story from 28: Cipher's Peons at the Relic Stone (29); Eagun there with them, and
      // the villager who runs in with the news, Rui at the house, only in their scenes.)
      case ID("SKRUB"): case ID("AGATE_PEON"): return story === 29;
      case ID("SHRINE_EAGUN"): case ID("AGATE_RUNNER"): case ID("EAGUN_RUI"): return false;
      case ID("EAGUN"): return story !== 29;   // (off after the intruders)
      // (Mt. Battle, Colosseum's story 31 to 33: Cipher's Peons on the slopes and Dakim and Skrub at the summit, till
      // Dakim's beaten; Vander there throughout.)
      case ID("TURO"): case ID("BERIN"): case ID("DAKIM"): case ID("SUMMIT_SKRUB"): return story >= 31 && story < 33;
      // (The Under, 33 to 36: Kloak at the studio door till he's beaten, Venus in it till she is; the subway's Trainers.
      // Ein's lab, 36 to 40: its Peons; the Mystery Troop till beaten (37), Ein (38). Realgam Tower, 40 on: Gonzap (41)
      // and Nascour (42) at their doors till beaten, Evice at the top (43); their halls' Trainers.)
      case ID("KLOAK"): return story === 34;
      case ID("VENUS"): return story === 35;
      case ID("SHADOW_FRENA"): case ID("SHADOW_LIAKS"): case ID("SHADOW_LONIA"): case ID("SHADOW_NELIS"): return story >= 34;
      case ID("SHADOW_COLE"): case ID("SHADOW_LARE"): case ID("SHADOW_VANA"): case ID("SHADOW_LESAR"): case ID("SHADOW_REMIL"): return story >= 37;
      // (The Mystery Troop's no longer in the lab: as in Colosseum, you meet them in Phenac City.)
      case ID("VERDE"): case ID("ROSSO"): case ID("BLUNO"): return person.script === "ShadowLab_B1F_EventScript_Troop" ? false : undefined;
      case ID("SHADOW_TANIE"): return story >= 37;
      // (Realgam Tower's domes, as in Colosseum: Cipher's Admins Miror B., Dakim, Venus and Ein once Gonzap's beaten
      // (42); each battles you once, or till their Shadow Pokémon's snagged if it never was.)
      case ID("REALGAM_MIROR_B"): case ID("REALGAM_DAKIM"): case ID("REALGAM_VENUS"): case ID("REALGAM_EIN"):
        return story >= 42 && !REALGAM_ADMINS.find((a) => a.id === person.localId).done(flags);
      // (After the game: the Mystery Troop in the rebuilt hideout, those whose starter you didn't snag in Phenac City;
      // one snagged here stays, with their words for it.)
      case ID("SHADOW_HIDEOUT_VERDE"): case ID("SHADOW_HIDEOUT_ROSSO"): case ID("SHADOW_HIDEOUT_BLUNO"): {
        const name = person.localId.split("_").pop(), who = name.charAt(0) + name.slice(1).toLowerCase();
        const snagged = shadowOf(who).every((s) => (flags.orreShadowSnagged || []).includes(s.species));
        return story >= 44 && (!snagged || (flags.orreShadowDone || []).includes(person.script));
      }
      case ID("EIN"): return story === 38;
      case ID("GONZAP"): return story === 41;
      case ID("REALGAM_NASCOUR"): return story === 42;
      case ID("EVICE"): return story === 43;
      case ID("SHADOW_ARTON"): case ID("SHADOW_BAILA"): case ID("SHADOW_DIOGE"): case ID("SHADOW_JOMAS"): case ID("SHADOW_DELAN"):
      case ID("SHADOW_NELLA"): case ID("SHADOW_STON"): return story >= 41;
      // (After the game, 44 on: Snagem's back in its hideout; Fein and Ancha at the Outskirt Stand; Deep King Agnol
      // once you've won his Deep Colosseum's tournament.)
      case ID("SHADOW_BIDEN"): case ID("SHADOW_AGREV"): case ID("SHADOW_FEIN"): case ID("ANCHA"): return story >= 44;
      case ID("SHADOW_AGNOL"): return story >= 44 && ((flags.orreTourney || {}).deep | 0) > 0;
      case ID("HIDEOUT_MIROR_B"): case ID("HIDEOUT_PLUSLE"): return story === 26;
      case ID("SILVA"): case ID("BUILDING_DUKING"): case ID("MIROR_B"): case ID("NASCOUR"): case ID("REATH"): case ID("FERMA"):
      case ID("BUILDING_SILVA"): case ID("HIDEOUT_DUKING"): return false;   // (only in their scenes)
      case ID("PHENAC_RUI"): case ID("MAYOR_RUI"): case ID("MAYOR_FOLLY"): case ID("MAYOR_TRUDLY"):
      case ID("MAYOR_GRUNT_1"): case ID("MAYOR_GRUNT_2"): case ID("MAYOR_MIROR_B"): case ID("PHENAC_WAKIN"): case ID("PHENAC_GRUNT"):
        return false;   // (only in their scenes)
      // (The Mystery Troop by Phenac's way out, after the Mayor's house, till you've beaten one: player.flags.orreTroop.)
      case ID("PHENAC_VERDE"): case ID("PHENAC_ROSSO"): case ID("PHENAC_BLUNO"): return story === 21 && !flags.orreTroop;
      default: return undefined;
    }
  }
  const patches = (map, flags) => {
    const story = flags.orreStory | 0;
    if (map === "OutskirtStand") return (flags.orre | 0) < 2 || (story === 18 && !flags.orreStandFT) ? ["truck"] : [];
    if (map === "PhenacCity") return story === 19 ? ["truck"] : [];
    if (map === "PyriteCave") return story >= 26 ? ["hideout"] : [];
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

  // Colosseum's Shadow Pokémon, all 48 in its order: { species, level, cls, trainer, place, item, moves }. `moves` are
  // the four it knows (as altissimo1's Colosseum guide gives them): while it's a Shadow Pokémon the first is Shadow
  // Rush, and it gets that first one back when purified. Orre.shadowOf(trainer) gives a Trainer's; this game's own
  // Orre before Colosseum's story (the prologue) keeps clear of these Trainers' names.
  const SHADOW = [
    ["Makuhita", 30, "Miror B. Peon", "Trudly", "Phenac City (the Mayor's house)", "", ["Foresight", "Focus Energy", "Vital Throw", "Cross Chop"]],
    ["Bayleef", 30, "Mystery Troop", "Verde", "Phenac City", "miracle-seed", ["Sunny Day", "Synthesis", "Razor Leaf", "Body Slam"]],
    ["Quilava", 30, "Mystery Troop", "Rosso", "Phenac City", "charcoal", ["Sunny Day", "Smokescreen", "Dig", "Flame Wheel"]],
    ["Croconaw", 30, "Mystery Troop", "Bluno", "Phenac City", "mystic-water", ["Rain Dance", "Scary Face", "Bite", "Surf"]],
    ["Misdreavus", 30, "Rider", "Vant", "Pyrite Town", "spell-tag", ["Psybeam", "Confuse Ray", "Mean Look", "Shadow Ball"]],
    ["Noctowl", 30, "Rider", "Nover", "Pyrite Town", "", ["Steel Wing", "Hypnosis", "Reflect", "Fly"]],
    ["Flaaffy", 30, "St. Performer", "Diogo", "Pyrite Town", "", ["Thunderbolt", "Thunder Wave", "Cotton Spore", "Thunder Shock"]],
    ["Skiploom", 30, "Rider", "Leba", "Pyrite Town", "", ["Synthesis", "Sleep Powder", "Cotton Spore", "Mega Drain"]],
    ["Quagsire", 30, "Bandana Guy", "Divel", "Pyrite Town", "", ["Mud Shot", "Amnesia", "Slam", "Surf"]],
    ["Slugma", 30, "Roller Boy", "Lon", "Pyrite Town", "", ["Sunny Day", "Yawn", "Rock Throw", "Flamethrower"]],
    ["Furret", 33, "Rogue", "Cail", "Pyrite Town", "", ["Iron Tail", "Helping Hand", "Quick Attack", "Strength"]],
    ["Yanma", 33, "Cipher Peon", "Nore", "the Pyrite Building", "", ["Detect", "Supersonic", "Sonic Boom", "Uproar"]],
    ["Remoraid", 20, "Miror B. Peon", "Reath", "the Pyrite Building", "", ["Bubble Beam", "Lock-On", "Psybeam", "Aurora Beam"]],
    ["Mantine", 33, "Miror B. Peon", "Ferma", "the Pyrite Building", "", ["Wing Attack", "Supersonic", "Bubble Beam", "Take Down"]],
    ["Qwilfish", 33, "Hunter", "Doken", "the Pyrite Building", "poison-barb", ["Pin Missile", "Minimize", "Poison Sting", "Surf"]],
    ["Meditite", 33, "Rider", "Twan", "Pyrite Cave", "twisted-spoon", ["Detect", "Calm Mind", "Confusion", "High Jump Kick"]],
    ["Dunsparce", 33, "Rider", "Sosh", "Pyrite Cave", "", ["Spite", "Glare", "Yawn", "Take Down"]],
    ["Swablu", 33, "Hunter", "Zalo", "Pyrite Cave", "", ["Mirror Move", "Sing", "Safeguard", "Fly"]],
    ["Sudowoodo", 35, "Cipher Admin", "Miror B.", "Miror B.'s Hideout", "hard-stone", ["Flail", "Block", "Low Kick", "Rock Slide"]],
    ["Hitmontop", 38, "Cipher Peon", "Skrub", "Agate Village (the Relic Stone)", "black-belt", ["Agility", "Focus Energy", "Triple Kick", "Rapid Spin"]],
    ["Entei", 40, "Cipher Admin", "Dakim", "Mt. Battle", "", ["Sunny Day", "Leer", "Bite", "Fire Blast"]],
    ["Ledian", 40, "Cipher Peon", "Kloak", "The Under", "", ["Baton Pass", "Safeguard", "Supersonic", "Comet Punch"]],
    ["Suicune", 40, "Cipher Admin", "Venus", "The Under", "", ["Rain Dance", "Leer", "Gust", "Surf"]],
    ["Gligar", 43, "Hunter", "Frena", "The Under Subway", "", ["Feint Attack", "Sand Attack", "Poison Sting", "Slash"]],
    ["Stantler", 43, "Chaser", "Liaks", "The Under Subway", "", ["Astonish", "Hypnosis", "Leer", "Take Down"]],
    ["Piloswine", 43, "Bodybuilder", "Lonia", "The Under Subway", "soft-sand", ["Endure", "Odor Sleuth", "Dig", "Blizzard"]],
    ["Sneasel", 43, "Rider", "Nelis", "The Under Subway", "", ["Feint Attack", "Screech", "Fury Swipes", "Icy Wind"]],
    ["Aipom", 43, "Cipher Peon", "Cole", "the Shadow Pokémon Lab", "", ["Baton Pass", "Tickle", "Fury Swipes", "Swift"]],
    ["Murkrow", 43, "Cipher Peon", "Lare", "the Shadow Pokémon Lab", "", ["Feint Attack", "Mean Look", "Night Shade", "Fly"]],
    ["Forretress", 43, "Cipher Peon", "Vana", "the Shadow Pokémon Lab", "", ["Explosion", "Protect", "Bide", "Rapid Spin"]],
    ["Vibrava", 43, "Cipher Peon", "Remil", "the Shadow Pokémon Lab", "dragon-fang", ["Crunch", "Screech", "Sand Tomb", "Dragon Breath"]],
    ["Ariados", 43, "Cipher Peon", "Lesar", "the Shadow Pokémon Lab", "silver-powder", ["Spider Web", "Scary Face", "Leech Life", "Sludge Bomb"]],
    ["Granbull", 43, "Cipher Peon", "Tanie", "the Shadow Pokémon Lab", "", ["Bite", "Scary Face", "Roar", "Strength"]],
    ["Raikou", 40, "Cipher Admin", "Ein", "the Shadow Pokémon Lab", "", ["Rain Dance", "Leer", "Quick Attack", "Thunder"]],
    ["Delibird", 45, "Cipher Peon", "Arton", "Realgam Tower", "never-melt-ice", ["Blizzard", "Attract", "Present", "Fly"]],
    ["Sunflora", 45, "Cipher Peon", "Baila", "Realgam Tower", "", ["Sunny Day", "Growth", "Ingrain", "Solar Beam"]],
    ["Heracross", 45, "Cipher Peon", "Dioge", "Realgam Tower", "", ["Reversal", "Endure", "Counter", "Brick Break"]],
    ["Skarmory", 47, "Snagem Head", "Gonzap", "Realgam Tower", "sharp-beak", ["Drill Peck", "Metal Sound", "Air Cutter", "Steel Wing"]],
    ["Miltank", 48, "Bodybuilder", "Jomas", "Realgam Tower's Colosseum", "", ["Milk Drink", "Defense Curl", "Rollout", "Body Slam"]],
    ["Absol", 48, "Rider", "Delan", "Realgam Tower's Colosseum", "", ["Perish Song", "Swords Dance", "Slash", "Feint Attack"]],
    ["Houndoom", 48, "Cipher Peon", "Nella", "Realgam Tower's Colosseum", "", ["Feint Attack", "Howl", "Smog", "Flamethrower"]],
    ["Tropius", 49, "Cipher Peon", "Ston", "Realgam Tower's Colosseum", "", ["Solar Beam", "Synthesis", "Magical Leaf", "Fly"]],
    ["Metagross", 50, "Cipher Admin", "Nascour", "Realgam Tower's Colosseum", "metal-coat", ["Hyper Beam", "Iron Defense", "Metal Claw", "Psychic"]],
    ["Tyranitar", 55, "Cipher Head", "Evice", "Realgam Tower's Colosseum", "nugget", ["Crunch", "Thunder", "Rock Slide", "Blizzard"]],
    ["Smeargle", 45, "Team Snagem", "Biden", "the Snagem Hideout (after the game)", "", ["Sketch", "Tail Whip", "Double Slap", "Iron Tail"]],
    ["Ursaring", 45, "Team Snagem", "Agrev", "the Snagem Hideout (after the game)", "", ["Feint Attack", "Fake Tears", "Lick", "Slash"]],
    ["Shuckle", 45, "Deep King", "Agnol", "the Deep Colosseum (after the game)", "", ["Safeguard", "Encore", "Rest", "Bide"]],
    ["Togetic", 20, "Cipher Peon", "Fein", "the Outskirt Stand (after the game)", "", ["Metronome", "Charm", "Sweet Kiss", "Yawn"]]
  ].map(([species, level, cls, trainer, place, item, moves]) => ({ species, level, cls, trainer, place, item, moves }));

  // Colosseum's story Trainers' parties, as in Colosseum (altissimo1's guide, from the game's data), each in its own
  // order: [species, level]; the Trainer's Shadow Pokémon (SHADOW) among them. A key with "@" is a later battle of
  // the same Trainer. Orre.team(key, snagged) gives the records to battle (a Shadow Pokémon already snagged left out).
  const TEAMS = {
    // the Outskirt Stand
    "Willie": [["Zigzagoon", 24], ["Zigzagoon", 24]],
    // Phenac City, by the truck
    "Folly": [["Whismur", 24], ["Whismur", 25]],
    // Phenac City
    "Wakin": [["Corphish", 25], ["Koffing", 27]],
    // the Mayor's house
    "Folly@Mayor": [["Whismur", 26], ["Lotad", 25]],
    // the Mayor's house
    "Trudly": [["Duskull", 25], ["Spinarak", 25], ["Makuhita", 30]],
    // Phenac City
    "Verde": [["Bayleef", 30], ["Grimer", 26], ["Spoink", 24]],
    // Phenac City
    "Rosso": [["Quilava", 30], ["Grimer", 26], ["Spoink", 24]],
    // Phenac City
    "Bluno": [["Croconaw", 30], ["Grimer", 26], ["Spoink", 24]],
    // Pyrite Town
    "Cail": [["Furret", 33], ["Ralts", 29], ["Seedot", 29], ["Machop", 29]],
    // Pyrite Town's Duel Square
    "Vant": [["Misdreavus", 30], ["Skitty", 28], ["Zigzagoon", 28]],
    "Nover": [["Noctowl", 30], ["Ledyba", 27], ["Wingull", 27]],
    "Diogo": [["Flaaffy", 30], ["Shroomish", 26]],
    "Leba": [["Skiploom", 30], ["Oddish", 26], ["Dustox", 26]],
    "Divel": [["Quagsire", 30], ["Psyduck", 29]],
    "Lon": [["Slugma", 30], ["Azurill", 27], ["Igglybuff", 28], ["Swablu", 27]],
    // the Pyrite Building
    "Nore": [["Yanma", 33], ["Pineco", 32], ["Nincada", 31], ["Surskit", 32]],
    "Reath": [["Remoraid", 20], ["Spinarak", 33], ["Luvdisc", 32]],
    "Ferma": [["Mantine", 33], ["Aipom", 32], ["Furret", 31], ["Yanma", 33]],
    "Doken": [["Qwilfish", 33], ["Goldeen", 33], ["Linoone", 33]],
    // Pyrite Cave
    "Twan": [["Meditite", 33], ["Bagon", 33], ["Numel", 32]],
    "Sosh": [["Dunsparce", 33], ["Mareep", 34], ["Cacnea", 34]],
    "Zalo": [["Swablu", 33], ["Lotad", 31], ["Beldum", 32], ["Lombre", 32]],
    "Miror B.": [["Sudowoodo", 35], ["Ludicolo", 29], ["Ludicolo", 30], ["Ludicolo", 28], ["Ludicolo", 31]],
    // Agate Village
    "Skrub": [["Hitmontop", 38], ["Clamperl", 36], ["Geodude", 36], ["Wynaut", 37]],
    "Kass": [["Baltoy", 35], ["Ralts", 35], ["Kirlia", 35]],
    // Mt. Battle
    "Turo": [["Trapinch", 35], ["Numel", 34], ["Sandshrew", 35]],
    "Berin": [["Geodude", 36], ["Geodude", 36], ["Sandslash", 38]],
    "Dakim": [["Entei", 40], ["Metang", 37], ["Marshtomp", 36], ["Golem", 38], ["Camerupt", 38]],
    // The Under
    "Kloak": [["Ledian", 40], ["Spinarak", 39], ["Volbeat", 38]],
    "Venus": [["Suicune", 40], ["Delcatty", 45], ["Vileplume", 44], ["Banette", 45], ["Steelix", 45]],
    "Frena": [["Teddiursa", 37], ["Jigglypuff", 36], ["Shroomish", 35], ["Gligar", 43]],
    "Liaks": [["Stantler", 43], ["Gloom", 38], ["Kirlia", 37], ["Roselia", 38]],
    "Lonia": [["Piloswine", 43], ["Dunsparce", 39], ["Octillery", 38], ["Masquerain", 39]],
    "Nelis": [["Sneasel", 43], ["Seviper", 40], ["Corsola", 41], ["Loudred", 41]],
    // the Shadow Pokémon Lab
    "Cole": [["Furret", 37], ["Remoraid", 39], ["Castform", 41], ["Aipom", 43]],
    "Lare": [["Carvanha", 38], ["Nuzleaf", 38], ["Houndour", 38], ["Murkrow", 43]],
    "Vana": [["Forretress", 43], ["Zubat", 40], ["Swablu", 40], ["Pupitar", 40]],
    "Lesar": [["Ariados", 43], ["Rhyhorn", 40], ["Grovyle", 40]],
    "Remil": [["Vibrava", 43], ["Swellow", 43], ["Kecleon", 43], ["Kadabra", 42]],
    "Tanie": [["Granbull", 43], ["Linoone", 38], ["Vigoroth", 39]],
    "Ein": [["Raikou", 40], ["Lanturn", 47], ["Altaria", 46], ["Huntail", 47], ["Golbat", 48]],
    // Realgam Tower (their Shadow Pokémon too, if it wasn't snagged)
    "Miror B.@Realgam": [["Armaldo", 43], ["Ludicolo", 44], ["Ludicolo", 45], ["Golduck", 45], ["Loudred", 46]],
    "Dakim@Realgam": [["Houndoom", 47], ["Flygon", 46], ["Forretress", 45], ["Whiscash", 46], ["Claydol", 46]],
    "Venus@Realgam": [["Milotic", 48], ["Bellossom", 47], ["Raichu", 48], ["Wigglytuff", 48], ["Misdreavus", 47]],
    "Ein@Realgam": [["Manectric", 50], ["Starmie", 49], ["Rhydon", 50], ["Pelipper", 49], ["Crobat", 48]],
    // Realgam Tower
    "Arton": [["Delibird", 45], ["Piloswine", 42], ["Glalie", 42]],
    "Baila": [["Sunflora", 45], ["Gloom", 41], ["Jumpluff", 42]],
    "Dioge": [["Masquerain", 42], ["Ariados", 41], ["Heracross", 45]],
    "Gonzap": [["Skarmory", 47], ["Crawdaunt", 52], ["Pinsir", 52], ["Hariyama", 53], ["Shiftry", 53]],
    // Realgam Tower's Colosseum
    "Jomas": [["Miltank", 48], ["Zangoose", 45], ["Porygon2", 45]],
    "Delan": [["Absol", 48], ["Mightyena", 46], ["Sharpedo", 47]],
    "Nella": [["Houndoom", 48], ["Torkoal", 47], ["Magcargo", 46]],
    "Ston": [["Tropius", 49], ["Vileplume", 48], ["Cradily", 48], ["Cacturne", 49]],
    "Nascour": [["Metagross", 50], ["Gardevoir", 55], ["Xatu", 54], ["Dusclops", 55], ["Walrein", 56], ["Blaziken", 54]],
    "Evice": [["Tyranitar", 55], ["Salamence", 60], ["Machamp", 61], ["Scizor", 60], ["Slaking", 60], ["Slowking", 61]],
    // after the game: the Snagem Hideout
    "Biden": [["Smeargle", 45], ["Smeargle", 50], ["Smeargle", 51], ["Smeargle", 52]],
    "Agrev": [["Machoke", 52], ["Marshtomp", 55], ["Shiftry", 50], ["Ursaring", 45]],
    // (the Mystery Troop's other two, there too)
    "Verde@Hideout": [["Bayleef", 30], ["Muk", 55], ["Grumpig", 54], ["Sharpedo", 53]],
    "Rosso@Hideout": [["Quilava", 30], ["Muk", 55], ["Grumpig", 54], ["Breloom", 53]],
    "Bluno@Hideout": [["Croconaw", 30], ["Muk", 55], ["Grumpig", 54], ["Camerupt", 53]],
    // the Outskirt Stand
    "Fein": [["Togetic", 20], ["Armaldo", 68], ["Milotic", 68], ["Manectric", 68], ["Houndoom", 68], ["Gyarados", 68]],
    // the Deep Colosseum
    "Agnol": [["Shuckle", 45], ["Girafarig", 68], ["Sableye", 69], ["Skarmory", 66], ["Shedinja", 68], ["Kingdra", 70]]
  };

  // A Trainer's Shadow Pokémon (by SHADOW's trainer), and one as a record ready to battle: a Shadow Pokémon
  // (record.shadow) with Colosseum's moves, Shadow Rush in the first one's place (kept in record.purifyMoves for
  // when it's purified), holding Colosseum's item.
  const shadowOf = (trainer) => SHADOW.filter((s) => s.trainer === trainer);
  function shadowMon(s) {
    const moves = s.moves && s.moves.length ? ["Shadow Rush"].concat(s.moves.slice(1)) : null;
    const r = window.Party.create(s.species, s.level, moves ? { moves } : undefined);
    if (!moves) r.moves = [{ name: "Shadow Rush", pp: 5 }].concat(r.moves.filter((m) => m.name !== "Shadow Rush").slice(0, 3));
    r.shadow = true;
    if (s.moves) r.purifyMoves = s.moves.slice();
    if (s.item) r.item = s.item;
    return r;
  }
  // A TEAMS party as records to battle: its Shadow Pokémon (the Trainer's, by the key's name before "@") as Shadow
  // Pokémon, unless already snagged (`snagged`: species, e.g. player.flags.orreShadowSnagged), the rest as themselves.
  // A later battle (a key with "@") brings back the Trainer's Shadow Pokémon if it was never snagged, as Colosseum does.
  function team(key, snagged) {
    const list = TEAMS[key];
    if (!list) throw new Error("No Colosseum team: " + key);
    const trainer = key.split("@")[0], got = new Set(snagged || []), mine = shadowOf(trainer);
    const out = [];
    for (const [species, level] of list) {
      const s = mine.find((x) => x.species === species && x.level === level);
      if (s) { if (!got.has(species)) out.push(shadowMon(s)); }
      else out.push(window.Party.create(species, level));
    }
    if (key.includes("@") && !/@Hideout/.test(key)) for (const s of mine) if (!got.has(s.species) && !list.some(([sp]) => sp === s.species)) out.unshift(shadowMon(s));
    return out.slice(0, 6);
  }
  // The species in a team that may be snagged (its Shadow Pokémon, not yet snagged).
  const snaggable = (key, snagged) => team(key, snagged).filter((r) => r.shadow).map((r) => r.species);

  // Colosseum's story's Trainers with Shadow Pokémon (this game's own words; their Shadow Pokémon Colosseum's, SHADOW),
  // by script: `trainer` (as in SHADOW), their name and class, battle picture, the rest of their team ([species, level]),
  // and what they say: before, beaten (but their Shadow Pokémon not snagged: they'll battle again), and once snagged.
  const T = (trainer, name, cls, pic, intro, kept, after) => ({ trainer, name, cls, pic, intro: [].concat(intro), kept: [].concat(kept), after: [].concat(after) });
  const SHADOW_TRAINERS = {
    // (After the game, as in Colosseum: Team Snagem back in its rebuilt hideout, Biden and Agrev, and the Mystery
    // Troop's other two (those you didn't meet in Phenac City); Fein, the impostor at the Outskirt Stand who's been
    // passing himself off as you, with Ancha the reporter; Deep King Agnol, in The Under's Deep Colosseum. Colosseum's
    // words: S2_building_1F_2, S1_out, and Agnol's battle lines.)
    SnagemHideout_EventScript_Shadow_BIDEN: T("Biden", "Snagem Biden", "Team Rocket", "snagem_grunt",
      ["Yo! If it isn't {PLAYER}! You've got\nguts showing up here after betraying\nTeam Snagem!", "This is where it ends. I know you're\nhere to wreck the Snag Machine like\nbefore."],
      ["We'll paint your loser face next time\nfor sure!"],
      ["I was going to knock you out, then\npaint your loser face with my\nSmeargle…", "But I ended up on the receiving end\nof the paint…"]),
    SnagemHideout_EventScript_Shadow_AGREV: T("Agrev", "Snagem Agrev", "Team Rocket", "snagem_grunt",
      ["So it's {PLAYER}… I'm guessing that\nyou were drawn here by rumors of the\nSnag Machine.", "Did you really think we could fix the\nSnag Machine? Are you that gullible?", "It was all an elaborate trap by\nMaster Gonzap to sucker you into\ncoming!"],
      ["Heh… You obviously haven't mastered\nthe Snag Machine yet.", "Maybe there's a chance for me to beat\nyou still!"],
      ["You know how to work that Snag\nMachine, all right… I don't like\nadmitting it, but you've beaten me", "thoroughly."]),
    SnagemHideout_EventScript_Shadow_VERDE: Object.assign(T("Verde", "Mystery Troop Verde", "Team Rocket", "cipher_peon",
      ["Wha-What, {PLAYER}?! It's been a\nwhile! Not since the Mayor's house in\nPhenac City.", "You quit Team Snagem. There's\nnothing here for you.", "Or did you come out to see me,\nVerde?", "Fufufu… If that's the case,\nI'd better not disappoint you."],
      ["Tch! You win, but just today!", "But remember this! You haven't seen\nBayleef's real power! What you've\nseen is nothing!"],
      ["Enjoy Snagging my Shadow Bayleef\nwhile you can!", "There are still more Shadow Pokémon\ntrainers out there!"]), { key: "Verde@Hideout" }),
    SnagemHideout_EventScript_Shadow_ROSSO: Object.assign(T("Rosso", "Mystery Troop Rosso", "Team Rocket", "cipher_peon",
      ["Wha-What, {PLAYER}?! It's been a\nwhile! Not since the Mayor's house in\nPhenac City.", "You quit Team Snagem. There's\nnothing here for you.", "Or did you come out to see me,\nRosso?", "Fufufu… If that's the case,\nI'd better not disappoint you."],
      ["Tch! You win, but just today!", "But remember this! You haven't seen\nQuilava's real power! What you've\nseen is nothing!"],
      ["Enjoy Snagging my Shadow Quilava\nwhile you can!", "There are still more Shadow Pokémon\ntrainers out there!"]), { key: "Rosso@Hideout" }),
    SnagemHideout_EventScript_Shadow_BLUNO: Object.assign(T("Bluno", "Mystery Troop Bluno", "Team Rocket", "cipher_peon",
      ["Wha-What, {PLAYER}?! It's been a\nwhile! Not since the Mayor's house in\nPhenac City.", "You quit Team Snagem. There's\nnothing here for you.", "Or did you come out to see me,\nBluno?", "Fufufu… If that's the case,\nI'd better not disappoint you."],
      ["Tch! You win, but just today!", "But remember this! You haven't seen\nCroconaw's real power! What you've\nseen is nothing!"],
      ["Enjoy Snagging my Shadow Croconaw\nwhile you can!", "There are still more Shadow Pokémon\ntrainers out there!"]), { key: "Bluno@Hideout" }),
    OutskirtStand_EventScript_Shadow_FEIN: T("Fein", "Shady Guy Fein", "Team Rocket", "cipher_peon",
      ["???: Fufufu! The resemblance is\nuncanny, hey? You are me, and I am\nyou, and we are all together here.", "???: I can see that you don't\nunderstand. But there is one thing\ncertain!", "???: You're going to battle me!"],
      ["Fein: My name is Fein! I am the\nmaster of disguise!", "Fein: How do you like the job I did?\nYour reputation's totally trashed!\nMwahahahah!", "Fein: Since my cover's blown, you\nleave me with no choice! We battle\nnow!"],
      ["Ancha: Oh, my gosh! The perpetrator\nof the attacks wasn't this trainer,\nbut an impostor!", "Ancha: This is a major scoop! It's a\nhuge break in the story!"]),
    TheUnder_DeepColosseum_EventScript_Shadow_AGNOL: T("Agnol", "Deep King Agnol", "Leader", "super_nerd",
      ["Kekeke! Try not to overdo it!"],
      ["I see… You are skilled!"],
      ["You really are strong! Outstandingly\nso!"]),
    PyriteTown_EventScript_Shadow_CAIL: T("Cail", "Rogue Cail", "Rogue", "burglar", ["What are you looking at? I\nhaven't seen your faces around these\nparts. What are you, tourists?", "If you don't want to get hurt,\nyou should get lost, and quick. For\nthe good of your health. Heheh.",
        "Hah? What's that? You're\nwanting to know if I have a weird\nPokémon?", "Hehe. If you want to know that\nmuch, you may as well see it with\nyour own eyes!"],
      "Moan… I've learned how tough\nyou are battling. It's a full-body\nexperience.",
      ["People talk, hey? The word is,\nthere's a lot scarier presence in the\nshadows behind that Miror B.", "It's probably best that you\ndon't stick your nose too deeply in\nthere. For the good of your health."]),
    PyriteTown_EventScript_Shadow_VANT: T("Vant", "Rider Vant", "Rider", "biker", ["Kyahahahah! You're looking to\nbattle with me?", "That's too funny! Come at me as if\nyour life depended on it!\nKyahahahah!"],
      "Next time, I get to win and do the\nlaughing! Kyahahahah!", "Wow. That was easy for you. Losing\nlike that snapped me out of my hyper\nstate."),
    PyriteTown_EventScript_Shadow_NOVER: T("Nover", "Rider Nover", "Rider", "biker", ["This is Duel Square, where even\ncrying kids know they'd better shut\nup. This is where roughnecks gather.", "So, how about it? How would you like\nto battle with me?",
        "Excellent! I like a man who can come\nto a quick decision! Let's have it\nout!"],
      "You're pretty good at this. But I'm\nnot losing the next time!", "Everyone's itching for the chance to\nbattle it out. If you ever get the\nurge, come back."),
    PyriteTown_EventScript_Shadow_DIOGO: T("Diogo", "St. Performer Diogo", "St. Performer", "em_expert_f", ["Hohohoho! Do you feel like sticking\naround for a demonstration of my\nPokémon's moves?", "Good, good. I like your attitude.\nFeast your eyes on these!"],
      "Your Pokémon surpassed my little\ndarlings. But you won't get to win\nnext time!",
      ["You're surprisingly good. I think you\ndeserve to know a little secret about\na certain Pokémon move.", "The move Shadow Rush inflicts damage\non any kind of Pokémon without being\naffected by their types.",
        "The amount of damage doesn't vary\nwith the target Pokémon's type, so\nit's easy to use."]),
    PyriteTown_EventScript_Shadow_LEBA: T("Leba", "Rider Leba", "Rider", "em_cycling_triathlete_f", "If you try talking to anyone in Duel\nSquare, there's only one answer!",
      ["Ooh, that was an incredible battle!\nI simply love strong guys! That's\nL-O-V-E!", "If you ever get the urge to battle\nwith me again, I'll always be here\nfor you, honey!"],
      ["Ooh, that was an incredible battle!\nI simply love strong guys! That's\nL-O-V-E!", "If you ever get the urge to battle\nwith me again, I'll always be here\nfor you, honey!"]),
    PyriteTown_EventScript_Shadow_DIVEL: T("Divel", "Bandana Guy Divel", "Bandana Guy", "rocker", ["Huh? You want to battle me?", "Sure thing! Battling fans are always\nwelcome!"],
      "You're way tough! We've gotta battle\nagain!", "You're way tough! We've gotta battle\nagain!"),
    PyriteTown_EventScript_Shadow_LON: T("Lon", "Roller Boy Lon", "Roller Boy", "youngster", "Check out my Slugma! It's hot-headed\nnow. Like, really hot-headed!", "Wheee! Still mine!", "Aw… My Slugma…"),
    PyriteTown_EventScript_Shadow_DOKEN: T("Doken", "Hunter Doken", "Hunter", "cooltrainer_m", ["That guy earlier was too weak for\nwords. How about you?", "Are you going to keep me amused?"],
      "Battling you was fun, so that's good\nenough for me.", ["Oh, yeah, I love strong guys.", "…Wait. I said \"love,\" but don't get\nany wrong ideas…"]),
    PyriteCave_EventScript_Shadow_TWAN: T("Twan", "Rider Twan", "Rider", "biker", "Hold it! Don't think you're going\nanywhere when you catch my eye.",
      "Are you maybe even stronger than\nMiror B.?", "My Pokémon have won a knockout\nchallenge! You're no average trainer\nfor beating them!"),
    PyriteCave_EventScript_Shadow_SOSH: T("Sosh", "Rider Sosh", "Rider", "em_cycling_triathlete_f", "Kukukuku… Welcome to here!",
      "No way, no way! You're supposed to\ntell me that you're so strong!", "No way, no way! I'm supposed to beat\nsomeone as strong as you? They must\nbe joking!"),
    // (The Under's subway, Colosseum's words.)
    TheUnder_EventScript_Shadow_FRENA: T("Frena", "Hunter Frena", "Hunter", "cooltrainer_f", "If you're mean to me, I'm going to\ncry. Okay?", "But I want to cry… Waaaaah!", "Waaaaaaah!"),
    TheUnder_EventScript_Shadow_LIAKS: T("Liaks", "Chaser Liaks", "Chaser", "em_running_triathlete_f", ["What the…? What're you two doing all\nthe way down here?", "What's Frena doing up top?"],
      "I know why Frena up top let you two\nthrough. Oh, I get it. I got it real\ngood.", "I know why Frena up top let you two\nthrough. Oh, I get it. I got it real\ngood."),
    TheUnder_EventScript_Shadow_LONIA: T("Lonia", "Bodybuilder Lonia", "Bodybuilder", "em_battle_girl", "Well, what do you know. I hardly\nthought that I'd have to get involved\nin this.",
      "I'm a loser… I can't show my face in\nfront of Lady Venus like this…", "I'm a loser… I can't show my face in\nfront of Lady Venus like this…"),
    TheUnder_EventScript_Shadow_NELIS: T("Nelis", "Rider Nelis", "Rider", "em_cycling_triathlete_f", "Forget about getting past me. I'll\nprotect Lady Venus from you!",
      "This makes me feel like going\nsomewhere far away by train…", "This makes me feel like going\nsomewhere far away by train…"),
    // (The Shadow Pokémon Lab's Peons, Tanie with them as in Colosseum, and Realgam Tower's Trainers: Colosseum's
    // words, from the lab's and the tower's own lines and its battle lines, D1_labo_*, D4_dome_*, D4_casino_colo.)
    ShadowLab_1F_EventScript_Shadow_COLE: T("Cole", "Cipher Peon Cole", "Team Rocket", "cipher_peon",
      ["Oh, hey! Intruder alert!"],
      ["Oh? You again! You're not getting off\nscot-free this time!"],
      ["It's off-limits beyond here!"]),
    ShadowLab_1F_EventScript_Shadow_LARE: T("Lare", "Cipher Peon Lare", "Team Rocket", "cipher_peon_f",
      ["Waaaargh! You two! You're not Lab\nstaff!"],
      ["Back for more mischief?!"],
      ["Uh-uh, you're not supposed to be in\nhere!"]),
    ShadowLab_B1F_EventScript_Shadow_VANA: T("Vana", "Cipher Peon Vana", "Team Rocket", "cipher_peon_f",
      ["Uh-oh! Intruder alert!"],
      ["Back again? No welcome for you this\ntime!"],
      ["Stop right there! There's no entry\nbeyond this point!"]),
    ShadowLab_B1F_EventScript_Shadow_LESAR: T("Lesar", "Cipher Peon Lesar", "Team Rocket", "cipher_peon",
      ["Wh-What? What are outsiders doing\nhere? Why isn't security doing their\njob?"],
      ["So long as I have my Shadow Ariados,\nI won't abandon my plans!"],
      ["Sweeties, you've caused enough\nmischief already!"]),
    ShadowLab_B1F_EventScript_Shadow_REMIL: T("Remil", "Cipher Peon Remil", "Team Rocket", "cipher_peon_f",
      ["Waah! How did you sneak up on me like\nthat?", "Huh? Don't I know you from somewhere?\nLike at the Mayor's home in Phenac?", "You've been spoiling Cipher's plans\nall over, haven't you? You're not\ngoing to mess my plan up!"],
      ["I'm going to become a Cipher Admin no\nmatter what! Don't get in my way!"],
      ["What? Quit annoying me. You'd better\nget ready, or Master Ein will… Huh?!"]),
    ShadowLab_B1F_EventScript_Shadow_TANIE: T("Tanie", "Cipher Peon Tanie", "Team Rocket", "cipher_peon_f",
      ["Hi, there! There's no alarm blaring,\nbut here I am anyways!"],
      ["So long as I have my Shadow Granbull,\nI won't abandon my plans!"],
      ["What in the name of… How did you two\navoid the eyes of our security staff?"]),
    RealgamTower_Dome_EventScript_Shadow_ARTON: T("Arton", "Cipher Peon Arton", "Team Rocket", "cipher_peon",
      ["Are you looking to get past this\ndoor?", "Hmm… I'm guessing there's a daredevil\nin you.", "Heh… You'll know right away if that's\npossible by battling me!"],
      ["It's to your doom!"],
      ["That's the right idea. You're about\nten years too young to challenge me."]),
    RealgamTower_Dome_EventScript_Shadow_BAILA: T("Baila", "Cipher Peon Baila", "Team Rocket", "cipher_peon_f",
      ["Oh, yeah? So you're telling me that\nyou'll knock me out of the way?", "Heh… You'll know right away if that's\npossible by battling me!"],
      ["Humph. The way you battle, you'd need\nmore lives than a cat!"],
      ["Oh, having trouble, are we?", "Perhaps you're lost in the expanse of\nthis building?"]),
    RealgamTower_Dome_EventScript_Shadow_DIOGE: T("Dioge", "Cipher Peon Dioge", "Team Rocket", "cipher_peon",
      ["Whoa, stop right there. I can't very\nwell let you go any farther."],
      ["Hohoho. Yes, turn your back on the\nenemy; that's so fundamentally wrong.\nI would say amateurish, even."],
      ["Ah, that is good to hear. Go with\ncare."]),
    RealgamTower_Colosseum_EventScript_Shadow_JOMAS: T("Jomas", "Bodybuilder Jomas", "Bodybuilder", "em_battle_girl",
      ["A big crowd like this… It is a little\nintimidating.", "I don't want to be embarrassed here,\nso I'll battle to win!"],
      ["Okay, that's that, then. My Pokémon\nare all nursed back to perfect health\nand readiness.", "Now we can go full tilt against you\nin battle!"],
      ["I lost this battle, but it made me a\nlittle bit stronger, too."]),
    RealgamTower_Colosseum_EventScript_Shadow_DELAN: T("Delan", "Rider Delan", "Rider", "biker",
      ["My turn next!"],
      ["It's no fun at all to lose!"],
      ["I lost, but I had fun, so that makes\nit okay!"]),
    RealgamTower_Colosseum_EventScript_Shadow_NELLA: T("Nella", "Cipher Peon Nella", "Team Rocket", "cipher_peon_f",
      ["You must be {PLAYER}. I've been\nlooking forward to meeting you.", "Don't you think it's a great honor to\nbattle on this fabulous stage?", "I'm going to beat you and earn my\npromotion to an Admin!"],
      ["You beating me is unthinkable,\nimpossible, and downright unreal!"],
      ["I lost! How improbable is that?"]),
    RealgamTower_Colosseum_EventScript_Shadow_STON: T("Ston", "Cipher Peon Ston", "Team Rocket", "cipher_peon",
      ["I'm the last battler.", "I'll show you exactly why I was\nchosen to anchor our squad!"],
      ["I'm simply not about to lose!"],
      ["This made me a little bit stronger!"]),
    PyriteCave_EventScript_Shadow_ZALO: T("Zalo", "Hunter Zalo", "Hunter", "cooltrainer_m", "I need to score points with Miror B.\nso I can get a promotion!",
      "I'll get you! Next time, I'll run a\nbattle that will knock your socks\noff!", "You ruined all my hopes of getting\na promotion… Sob…")
  };

  // Rider Willie's two Zigzagoon (Lv. 24, as in Colosseum: met at the start of its story proper).
  const willieTeam = () => team("Willie");


  // ---------- Realgam Tower's Admins, and the people this file adds to Orre's maps (Colosseum's) ----------
  //
  // In Colosseum's Realgam Tower, once Gonzap's beaten, Cipher's Admins Miror B., Dakim, Venus and Ein each wait in
  // one of the domes, with a new team (Orre.TEAMS "…@Realgam"; their Shadow Pokémon too, if it was never snagged, and
  // it can be snagged then), and each gives you an ID Badge when beaten; the four open the way on to the tower's
  // Colosseum. Their words are Colosseum's (D4_dome_2, _4, _8, _11, and their battle lines). player.flags
  // .orreRealgamAdmins: those beaten. An Admin stays (battling again with their "again" words) till their Shadow
  // Pokémon's snagged.
  const REALGAM_ADMINS = [
    { trainer: "Miror B.", name: "Cipher Admin Miror B.", pic: "rocker", sprite: "rocker", frames: 10, x: 2, y: 5, facing: "face_right",
      intro: ["Miror B.: Fuhohohoh. You've kept me\nhanging around, {PLAYER}. You ruined\nthings in Pyrite for us.", "Miror B.: But, you know, we're not\nabout to lose over and over to you.", "This time, I'll win. And I mean it\nthis time.", "Miror B.: Let the music play! …Oh,\nnever mind that. We'll battle right\naway!"],
      again: ["Miror B.: Fuhohoho! When will you\nrealize how futile it is for you to\nchallenge me?", "Miror B.: But if that's the way you\nlike it, uh-huh, I'll show you how\nit's done. Let's battle!"],
      defeat: ["Oh, no, no, no! My tempo is off\nagain! This won't do at all!"],
      won: ["Miror B.: This just won't do! But\nI'll admit you've beaten me\nthoroughly.", "Miror B.: Okay, since I'm done, I'll\ngive you this. Here!"],
      badge: "{PLAYER} obtained the Red ID Badge!", after: ["Miror B.: Think of that as a little\ngift from our great leader Nascour.", "Don't leave without it, because\nyou'll get nowhere.", "Miror B.: But, you know, maybe it'd\nbe for your own good if you didn't go\non. Fuhohoho!"],
      lost: ["Miror B.: Fwohohoho! My dancing is\nsheer perfection today!"] },
    { trainer: "Dakim", name: "Cipher Admin Dakim", pic: "black_belt", sprite: "black_belt", frames: 10, x: 10, y: 5, facing: "face_left",
      intro: ["Dakim: Daahahah! Your luck ran out\nwhen you showed up before me!", "Dakim: Your stab at adventure's gone\non long enough!"],
      again: ["Dakim: Back, are you? You won't give\nup even after being pummeled.", "Dakim: That's gutsy! I like that, but\nyou won't live long that way!\nDaahahahah!"],
      defeat: ["This can't be! The mighty Dakim loses\nagain?"],
      won: ["Dakim: In all the time I've been\nbattling, my only losses came at the\nhands of Master Nascour and you.", "Dakim: Now, take this. It's your\npassport to terror and despair!"],
      badge: "{PLAYER} obtained the Green ID Badge!", after: ["Dakim: If you're thinking of turning\nback, now's the time to do it. Go on\nhome to Mommy! Daahahahah!"],
      lost: ["Dakim: Dahaha! You have experienced\nthe real might of the mighty Dakim!"] },
    { trainer: "Venus", name: "Cipher Admin Venus", pic: "beauty", sprite: "beauty", frames: 10, x: 1, y: 10, facing: "face_right",
      intro: ["Venus: Oh, well if it isn't that\ndarling boy and girl. What kept you\nso long? I'm rather tired of waiting.", "Venus: Now, say your good-byes. This\ntime, I really am going to be as\nserious as serious can be!"],
      again: ["Venus: Oh, my darlings, you're back\nagain! Don't you ever get tired of\nthis?", "Or did you want to see me that much?", "Venus: I can understand how you feel,\nbut I have no use for children!\nOhohohoh!"],
      defeat: ["Aiyeeh! How dare you! How dare you!"],
      won: ["Venus: Me, lose again? My pride will\nnot stand for it!", "Venus: Here, take this thing away!\nFor that, I want your silence that\nthis battle never happened!"],
      badge: "{PLAYER} obtained the Blue ID Badge!", after: ["Venus: I shall forget that I ever\nbattled with you. Yes, that's what\nI'll do. Ohohohoh!"],
      lost: ["Venus: Ohohoho! It serves you right!"] },
    { trainer: "Ein", name: "Cipher Admin Ein", pic: "scientist", sprite: "scientist", frames: 10, x: 11, y: 10, facing: "face_left",
      intro: ["Ein: Well, well. So, you have come.\nHand-in-hand like a happy couple on\nan aimless stroll.", "Ein: Well, let me inform you, this is\nno picnic. You will never defeat me\nwith such a frivolous mind!"],
      again: ["Ein: Hmm? Now, what a pleasant\nsurprise.", "Ein: After the thrashing I last\nadministered, you still possess the\nwill to challenge me again!"],
      defeat: ["Urrrgh… What unbelievable power…"],
      won: ["Ein: Grr… It is a shame that you\noppose us, {PLAYER}.", "Ein: Here, use this. Go on, open the\ndoor with it."],
      badge: "{PLAYER} obtained the Yellow ID Badge!", after: ["Ein: Fufufu… What awaits beyond the\ndoor? Why, you should see with your\nown eyes!"],
      lost: ["Ein: Wahahah! Eat your heart out!"] }
  ].map((a) => {
    const tag = a.trainer.replace(/\W/g, "").toUpperCase().replace("MIRORB", "MIROR_B");
    return Object.assign(a, { key: a.trainer + "@Realgam", id: "LOCALID_ORRE_REALGAM_" + tag, script: "RealgamTower_Dome_EventScript_Admin_" + tag,
      beaten: (flags) => (flags.orreRealgamAdmins || []).includes(a.trainer),
      // (Gone once beaten, unless their Shadow Pokémon's still theirs.)
      done: (flags) => a.beaten(flags) && shadowOf(a.trainer).every((s) => (flags.orreShadowSnagged || []).includes(s.species)) });
  });
  const realgamAdmin = (script) => REALGAM_ADMINS.find((a) => a.script === script);
  // All four ID Badges: the way on to the tower's Colosseum.
  const realgamBadges = (flags) => REALGAM_ADMINS.every((a) => a.beaten(flags));

  // People added to Orre's maps here (data/orre-maps.js is built from an Emerald checkout): Cipher Peon Tanie in the
  // Shadow Pokémon Lab, the four Admins in Realgam Tower's domes, the Mystery Troop in the rebuilt Snagem Hideout.
  {
    const W = window.WORLD_MAPS || {};
    const add = (map, localId, x, y, facing, script, sprite, frames) => {
      const m = W[map];
      if (!m || m.people.some((p) => p.localId === localId)) return;
      m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x, y, movement: facing, rangeX: 0, rangeY: 0, script, flag: null, text: null,
        localId, sprite, width: 16, height: 32, frames });
    };
    add("ShadowLab_B1F", "LOCALID_ORRE_SHADOW_TANIE", 11, 3, "face_left", "ShadowLab_B1F_EventScript_Shadow_TANIE", "orre_peon_f", 9);
    for (const a of REALGAM_ADMINS) add("RealgamTower_Dome", a.id, a.x, a.y, a.facing, a.script, a.sprite, a.frames);
    add("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_VERDE", 9, 6, "face_down", "SnagemHideout_EventScript_Shadow_VERDE", "orre_peon_m", 9);
    add("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_ROSSO", 12, 6, "face_down", "SnagemHideout_EventScript_Shadow_ROSSO", "orre_peon_m", 9);
    add("SnagemHideout", "LOCALID_ORRE_SHADOW_HIDEOUT_BLUNO", 16, 6, "face_down", "SnagemHideout_EventScript_Shadow_BLUNO", "orre_peon_m", 9);
  }

  // ---------- The Pyrite Colosseum and Phenac Stadium (Colosseum's tournaments; this game's own entrants) ----------
  //
  // Talk to the receptionist and enter: four double battles in a row against the day's entrants (picked from `pool`,
  // a class, its picture, its name and the Pokémon it might use), healed between rounds; lose one and you're out.
  // Win all four and you're the day's champion: `prize` money and one of `items` (the first time, `first`). The
  // entrants' level is your strongest Pokémon's, held to `min` and to Orre's cap (Phenac's from Lv. 50), and rises a
  // level a round. The Colosseum opens once Colosseum's story has you in Pyrite (orreStory 23, after Cail), the
  // Stadium once Evice is beaten (44), and The Under's Deep Colosseum after the game too, its king Agnol waiting for
  // whoever wins it.
  const TOURNAMENTS = {
    PyriteTown_Colosseum_EventScript_Receptionist: {
      key: "pyrite", name: "Pyrite Colosseum", from: 23, min: 30, size: [2, 2, 3, 3], prize: 3000,
      items: ["rare-candy", "pp-up", "protein", "iron", "calcium", "zinc", "carbos", "hp-up", "nugget", "ultra-ball"], first: "choice-band",
      closed: ["The Colosseum's closed for the\nmoment. Come back later, hon."],
      pool: [
        ["Rocker", "rocker", ["Vince", "Jett", "Rudy"], ["Electabuzz", "Magneton", "Manectric", "Voltorb", "Loudred"]],
        ["Biker", "biker", ["Gav", "Rex", "Zed"], ["Weezing", "Muk", "Mightyena", "Houndour", "Sneasel"]],
        ["Black Belt", "black_belt", ["Doku", "Kaio", "Ryo"], ["Machoke", "Hitmonchan", "Hitmonlee", "Makuhita", "Breloom"]],
        ["Burglar", "burglar", ["Vic", "Lenny", "Dash"], ["Murkrow", "Sableye", "Grimer", "Houndour", "Persian"]],
        ["Psychic", "psychic_f", ["Lumi", "Nessa", "Ora"], ["Kadabra", "Xatu", "Grumpig", "Girafarig", "Kirlia"]],
        ["Hiker", "hiker", ["Bert", "Grom", "Tor"], ["Graveler", "Onix", "Lairon", "Rhyhorn", "Sandslash"]],
        ["Cooltrainer", "cooltrainer_m", ["Kale", "Reed", "Soren"], ["Grovyle", "Marshtomp", "Combusken", "Flaaffy", "Quilava"]],
        ["Cooltrainer", "cooltrainer_f", ["Tia", "Wren", "Ana"], ["Bayleef", "Croconaw", "Kirlia", "Lombre", "Seadra"]],
        ["Ruin Maniac", "ruin_maniac", ["Dez", "Abu"], ["Baltoy", "Claydol", "Vibrava", "Lunatone", "Solrock"]]
      ] },
    TheUnder_DeepColosseum_EventScript_Receptionist: {
      key: "deep", name: "Deep Colosseum", from: 44, min: 52, size: [3, 4, 4, 4], prize: 10000,
      items: ["rare-candy", "pp-max", "nugget", "star-piece", "max-revive", "full-restore", "kings-rock", "scope-lens", "quick-claw"], first: "focus-band",
      closed: ["…This place isn't open to just\nanybody. Come back when you've made\na name for yourself."],
      pool: [
        ["Hunter", "cooltrainer_m", ["Rask", "Vorn"], ["Houndoom", "Absol", "Sharpedo", "Crobat", "Tyranitar", "Skarmory"]],
        ["Chaser", "biker", ["Brakk", "Zett"], ["Weezing", "Muk", "Crawdaunt", "Mightyena", "Cacturne", "Honchkrow"]],
        ["Bodybuilder", "black_belt", ["Hulk", "Grizz"], ["Machamp", "Hariyama", "Ursaring", "Slaking", "Hitmontop", "Rhydon"]],
        ["Bandana Guy", "rocker", ["Jace", "Rook"], ["Electabuzz", "Magmar", "Manectric", "Raichu", "Jolteon", "Flareon"]],
        ["Researcher", "scientist", ["Ovid", "Teller"], ["Porygon2", "Magneton", "Claydol", "Metagross", "Bronzong", "Starmie"]],
        ["Rider", "cue_ball", ["Kaz", "Dex"], ["Dodrio", "Rapidash", "Arcanine", "Tauros", "Kangaskhan", "Granbull"]],
        ["Curmudgeon", "gentleman", ["Mort", "Edgar"], ["Gengar", "Banette", "Dusclops", "Sableye", "Misdreavus", "Shiftry"]]
      ] },
    PhenacCity_Stadium_EventScript_Receptionist: {
      key: "phenac", name: "Phenac Stadium", from: 44, min: 50, size: [3, 3, 4, 4], prize: 8000,
      items: ["rare-candy", "pp-max", "pp-up", "nugget", "star-piece", "max-revive", "full-restore", "protein", "calcium", "carbos"], first: "leftovers",
      closed: ["Welcome to Phenac Stadium.", "Our next tournament is still being\nplanned. Please come again!"],
      pool: [
        ["Cooltrainer", "cooltrainer_m", ["Garet", "Morus", "Lake"], ["Gardevoir", "Salamence", "Swampert", "Blaziken", "Ampharos", "Starmie"]],
        ["Cooltrainer", "cooltrainer_f", ["Rena", "Mima", "Sela"], ["Milotic", "Altaria", "Sceptile", "Espeon", "Lanturn", "Vileplume"]],
        ["Psychic", "psychic_m", ["Elon", "Darian"], ["Alakazam", "Slowking", "Metagross", "Medicham", "Exeggutor"]],
        ["Black Belt", "black_belt", ["Kenzo", "Taku"], ["Hariyama", "Machamp", "Hitmontop", "Heracross", "Breloom"]],
        ["Gentleman", "gentleman", ["Albert", "Reginald"], ["Arcanine", "Kingdra", "Skarmory", "Snorlax", "Tauros"]],
        ["Beauty", "beauty", ["Lola", "Cyra"], ["Ninetales", "Wigglytuff", "Lapras", "Clefable", "Bellossom"]],
        ["Pokémon Ranger", "pokemon_ranger_m", ["Jory", "Ash"], ["Tropius", "Ursaring", "Donphan", "Torkoal", "Dodrio"]],
        ["Pokémon Ranger", "pokemon_ranger_f", ["Kiri", "Fia"], ["Jumpluff", "Meganium", "Absol", "Flygon", "Pelipper"]]
      ] }
  };
  // The day's four entrants for `t`, the player's strongest Pokémon at `top` and Orre's cap `cap`: [{ name, cls, pic,
  // team: [[species, level]] }], none the same twice. (`rand`: Math.random, or a seeded one in the tests.)
  function tournamentDraw(t, top, cap, rand) {
    rand = rand || Math.random;
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const base = Math.max(t.min, Math.min(top, cap || 100)), pool = t.pool.slice(), out = [];
    for (let round = 0; round < 4; round++) {
      const [cls, pic, names, species] = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      const sp = species.slice(), team = [];
      for (let i = 0; i < t.size[round]; i++) team.push([sp.splice(Math.floor(rand() * sp.length), 1)[0], Math.min(100, base - 2 + round)]);
      out.push({ name: cls + " " + pick(names), cls, pic, team });
    }
    return out;
  }


  // ---------- Mt. Battle's 100-Trainer challenge (Colosseum's; this game's own Trainers) ----------
  //
  // Ten areas of ten Trainers, double battles, the tenth each area's Area Leader. Your Pokémon are healed only between
  // areas, where you may stop (and start again later from Area 1, 4 or 7, once you've got that far). Each area's first
  // clear gives `MT_BATTLE.prizes[area]`, and money. Win all 100 from Area 1 in one go, after Colosseum's story (44), and
  // Ho-Oh comes to you, as it does in Colosseum. Levels rise through the areas, 23 to 52 (Area Leaders two more), held
  // to Orre's cap; teams grow from two Pokémon to four.
  const MT_BATTLE = {
    from: 33, starts: [1, 4, 7],
    prizes: [null, "protein", "iron", "calcium", "zinc", "carbos", "hp-up", "pp-up", "rare-candy", "pp-max", "lucky-egg"],
    money: (area) => 1000 * area,
    leaders: [null, ["Black Belt", "black_belt", "Kenta"], ["Hiker", "hiker", "Bolder"], ["Psychic", "psychic_f", "Mysa"],
      ["Pokémon Ranger", "pokemon_ranger_m", "Torin"], ["Bird Keeper", "bird_keeper", "Aero"], ["Swimmer", "swimmer_f", "Marina"],
      ["Cooltrainer", "cooltrainer_f", "Selene"], ["Gentleman", "gentleman", "Harlan"], ["Cooltrainer", "cooltrainer_m", "Drake"],
      ["Ace Trainer", "cooltrainer_m", "Vander"]],
    classes: [["Black Belt", "black_belt", ["Daisuke", "Gen", "Hiro"]], ["Hiker", "hiker", ["Clay", "Rocco", "Brent"]],
      ["Psychic", "psychic_m", ["Ezra", "Milo"]], ["Psychic", "psychic_f", ["Ione", "Sage"]], ["Camper", "camper", ["Skip", "Abe"]],
      ["Picnicker", "picnicker", ["Joy", "Lily"]], ["Bird Keeper", "bird_keeper", ["Hawk", "Robin"]], ["Rocker", "rocker", ["Axel", "Riff"]],
      ["Pokémon Ranger", "pokemon_ranger_f", ["Dawn", "Fern"]], ["Pokémon Ranger", "pokemon_ranger_m", ["Bram", "Cole"]],
      ["Cooltrainer", "cooltrainer_m", ["Rhett", "Lars"]], ["Cooltrainer", "cooltrainer_f", ["Ava", "Kira"]], ["Beauty", "beauty", ["Cleo", "Iris"]],
      ["Ruin Maniac", "ruin_maniac", ["Omar", "Seth"]], ["Engineer", "engineer", ["Gus", "Volt"]], ["Swimmer", "swimmer_m", ["Finn", "Kai"]]],
    // (Their Pokémon: the early areas' half-grown, the later areas' fully evolved.)
    tiers: [
      ["Pidgeotto", "Graveler", "Machoke", "Kadabra", "Haunter", "Ivysaur", "Wartortle", "Charmeleon", "Bayleef", "Quilava", "Croconaw",
        "Grovyle", "Combusken", "Marshtomp", "Lairon", "Lombre", "Nuzleaf", "Vigoroth", "Kirlia", "Flaaffy", "Skiploom", "Seadra", "Loudred", "Vibrava"],
      ["Arcanine", "Ninetales", "Golduck", "Rapidash", "Magneton", "Dodrio", "Electrode", "Hypno", "Kingler", "Marowak", "Hitmonlee", "Hitmonchan",
        "Lanturn", "Ampharos", "Azumarill", "Sudowoodo", "Quagsire", "Girafarig", "Granbull", "Ursaring", "Magcargo", "Piloswine", "Mightyena",
        "Breloom", "Manectric", "Sharpedo", "Camerupt", "Grumpig", "Cacturne", "Altaria", "Crawdaunt", "Claydol", "Banette", "Dusclops"],
      ["Gyarados", "Lapras", "Snorlax", "Dragonite", "Tyranitar", "Salamence", "Metagross", "Gardevoir", "Blaziken", "Swampert", "Sceptile",
        "Typhlosion", "Feraligatr", "Meganium", "Venusaur", "Charizard", "Blastoise", "Alakazam", "Machamp", "Gengar", "Starmie", "Scizor",
        "Heracross", "Skarmory", "Kingdra", "Milotic", "Flygon", "Aggron", "Slaking", "Houndoom", "Espeon", "Umbreon", "Steelix", "Absol"]
    ]
  };
  // Area `area`'s ten Trainers: [{ name, cls, pic, team: [[species, level]], leader }]. (Orre's cap `cap`.)
  function mtBattleArea(area, cap, rand) {
    rand = rand || Math.random;
    const M = MT_BATTLE, pick = (a) => a[Math.floor(rand() * a.length)];
    const tier = M.tiers[area <= 3 ? 0 : area <= 7 ? 1 : 2], size = area <= 3 ? 2 : area <= 6 ? 3 : 4, out = [];
    for (let k = 0; k < 10; k++) {
      const leader = k === 9, [cls, pic, names] = leader ? M.leaders[area].slice(0, 2).concat([[M.leaders[area][2]]]) : pick(M.classes);
      const level = Math.min(cap || 100, 20 + 3 * area + (k >= 5 ? 1 : 0) + (leader ? 2 : 0));
      const sp = tier.slice(), team = [];
      for (let i = 0; i < Math.min(4, size + (leader ? 1 : 0)); i++) team.push([sp.splice(Math.floor(rand() * sp.length), 1)[0], level]);
      out.push({ name: (leader ? "Area Leader " : cls + " ") + pick(names), cls, pic, team, leader });
    }
    return out;
  }

  // Geometry changed, but saved map IDs did not. Rescue an old save inside
  // a newly solid wall or water tile without resetting any story/party data.
  function correctLocation(player) {
    const at = player.location, m = at && (window.WORLD_MAPS || {})[at.map];
    if (!m || !m.colosseumLayout || !m.collision[at.y * m.width + at.x]) return false;
    const blocked = new Set(m.people.map((p) => p.x + "," + p.y));
    const warps = new Set(m.warps.map((w) => w.x + "," + w.y));
    const q = [[at.x, at.y]], seen = new Set();
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i], key = x + "," + y;
      if (x < 0 || y < 0 || x >= m.width || y >= m.height || seen.has(key)) continue;
      seen.add(key);
      if (!m.collision[y * m.width + x] && !blocked.has(key) && !warps.has(key)) {
        player.location = Object.assign({}, at, { x, y }); return true;
      }
      q.push([x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]);
    }
    throw new Error("No safe position in " + at.map);
  }

  window.Orre = { EXTRA_VISIBLE, correctLocation, SHADOW, TEAMS, team, snaggable, TOURNAMENTS, tournamentDraw, MT_BATTLE, mtBattleArea, shadowOf, shadowMon, SHADOW_TRAINERS, FILLERS, PLACES, openPlaces, isOpen, unlock, START, WES_START, PARKED, WES, WES_TEAM, SHOP, inOrre, enter, enterAsWes, leave, visible, patches, willieTeam, wesParty };
  Object.assign(window.Orre, { REALGAM_ADMINS, realgamAdmin, realgamBadges });
})();
