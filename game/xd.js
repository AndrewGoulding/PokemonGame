// Pokémon XD: Gale of Darkness, Orre's second campaign (after Colosseum's story and Hoenn's: ui/game.js's xdCallStep).
// So far its opening at the Pokémon HQ Lab (tools/lib/orre-rooms-xd.js's maps): Prof. Krane's welcome and his Eevee,
// the new Snag Machine, and Cipher's raid, Spy Naps and the Shadow Teddiursa (ui/game.js's xdScene). XD's Trainers
// and Shadow Pokémon are its own, from the disc (data/xd-decks.js), its words its own (assets/text/xd.json, through
// tools/colosseum-say.js --xd) but for the few that tie the hero to Michael's family, and Krane's welcome.
// Depends on: window.Orre, window.XD_DECKS, window.WORLD_MAPS, window.Party.
//
// player.flags.xdStory: 1 Oak's called, 2 flown to Orre (the HQ Lab on Orre's map), 3 Lily's met you in the lobby,
// 4 Krane's welcomed you (his Eevee), 5 the Snag Machine's yours and Cipher's taken Krane, 6 Naps beaten outside,
// 7 Lily's errand: Jovi with you to Gateon Port for the Machine Part, 8 Zook and Mr. Verich at the port, 9 Perr's sent
// you to Kaminko's (xdChobin: Chobin's let you in), 10 Makan's sent you back to Perr, 11 the Machine Part's yours,
// 12 it's Lily's, and she's sent you to Agate's Eagun (xdChamberDue: the Purify Chamber's finished when you're back;
// xdChamber, it is), 13 Eagun's met you at home and gone ahead to the Relic Stone, 14 he's battled you there and your
// Shadow Pokémon's purified (xdEagun: he's been beaten), 15 he's told you of Vander on Mt. Battle.
// player.flags.xdShadowSnagged: the XD Shadow Pokémon snagged, by their id in XD_DECKS.shadow.
//
//   Orre.XD.PLACE                       // the HQ Lab on Orre's map
//   Orre.XD.SCRIPTS, Orre.XD.sceneDue(script, flags)
//   Orre.XD.shadowRecord(id)            // XD's Shadow Pokémon `id`, to battle (its Shadow moves; its own moves kept for later)
//   Orre.XD.trainer(index, snagged, defeat)  // a story Trainer: { name, cls, pic, team, defeat, shadows: [id] }
//   Orre.XD.EEVEE                       // Krane's Eevee, as XD's hero has it at the start
"use strict";

(function () {
  const Orre = window.Orre, W = window.WORLD_MAPS || {}, ID = (k) => "LOCALID_XD_" + k;
  const D = () => window.XD_DECKS;
  const story = (f) => f.xdStory | 0;

  // The HQ Lab on Orre's map: in the south, from Oak's flight (xdStory 2). Gateon Port, due south of it, from Lily's
  // errand (7); Kaminko's House, south-east, from Perr's word (9). (XD's world map: "GATEON PORT is due south from
  // here. It's not far", "It's a big, weird house southeast of here.")
  const PLACE = { map: "PokemonHQLab", name: "Pokémon HQ Lab", x: 150, y: 146, arrive: { x: 13, y: 20, facing: "up" } };
  const GATEON = { map: "GateonPort", name: "Gateon Port", x: 148, y: 157, arrive: { x: 17, y: 1, facing: "down" } };
  const KAMINKO = { map: "KaminkosHouse", name: "Kaminko's House", x: 176, y: 152, arrive: { x: 13, y: 20, facing: "up" } };
  for (const p of [PLACE, GATEON, KAMINKO]) if (!Orre.PLACES.some((q) => q.map === p.map)) Orre.PLACES.push(p);

  // Krane's Eevee: Lv. 10, as XD's gift Eevee is; its Gen 3 moves at that level, with Bite (XD's hero's has it).
  const EEVEE = { species: "Eevee", level: 10, moves: ["Tackle", "Tail Whip", "Helping Hand", "Bite"] };

  // XD's Shadow Pokémon `id`: while a Shadow Pokémon, only its Shadow moves; its own moves kept for when it's purified
  // (purifyMoves, as Colosseum's are); its heart gauge XD's own size (heartSize, for game/orre-heart.js).
  function shadowRecord(id) {
    const s = D().shadow[id];
    if (!s) throw new Error("No XD Shadow Pokémon " + id);
    const r = window.Party.create(s.species, s.level, { moves: s.shadowMoves.slice(0, 4) });
    r.shadow = true;
    r.xdShadow = id;
    r.heartSize = s.heart;
    r.purifyMoves = s.moves.slice();
    if (s.item) r.item = s.item;
    return r;
  }
  // A story Trainer, deck index `index`: their party as records to battle (a Shadow Pokémon already snagged left
  // out), their name as XD has it ("Spy Naps"), their battle picture; `defeat`, their line on losing (XD's, as the
  // scene gives it).
  function trainer(index, snagged, defeat) {
    const t = D().story[index];
    if (!t) throw new Error("No XD Trainer " + index);
    const got = new Set(snagged || []), team = [], shadows = [];
    for (const p of t.party) {
      if (p.shadow) { if (!got.has(p.shadow)) { team.push(shadowRecord(p.shadow)); shadows.push(p.shadow); } continue; }
      const r = window.Party.create(p.species, p.level, { moves: p.moves });
      if (p.item) r.item = p.item;
      team.push(r);
    }
    return { name: t.cls + " " + t.name, cls: t.cls, female: t.female,
      pic: (t.female && PICS_F[t.cls]) || (Orre.picFor && Orre.picFor(t.cls, t.female)) || PICS[t.cls] || "cipher_peon",
      team, shadows, defeat: defeat || null };
  }
  // (XD's classes' battle pictures, where game/orre-trainers.js's Colosseum ones don't have them: a woman's where
  // there is one.)
  const PICS = { "Spy": "cipher_peon", "Thug": "burglar", "Researcher": "scientist", "Cipher Peon": "cipher_peon", "Cipher Admin": "cipher_peon",
    "Supertrainer": "em_cooltrainer_m", "Matron": "em_expert_f", "Fun Old Man": "em_expert_m", "Myth Trainer": "em_expert_m", "Kaminko Aide": "scientist",
    "Navigator": "gentleman", "Sailor": "em_hiker", "Casual Guy": "juggler", "Casual Dude": "juggler", "Wanderer": "em_ruin_maniac" };
  const PICS_F = { "Supertrainer": "em_cooltrainer_f", "Cooltrainer": "em_cooltrainer_f" };

  // The HQ Lab's people: (map, key, x, y, facing, script, sprite, visible).
  const PEOPLE = [
    ["PokemonHQLab_1F", "LILY", 1, 4, "face_right", "PokemonHQLab_1F_EventScript_Lily", "em_woman_2", (f) => story(f) >= 3],
    ["PokemonHQLab_1F", "JOVI", 2, 4, "face_left", "PokemonHQLab_1F_EventScript_Jovi", "em_little_girl", (f) => story(f) >= 12],
    ["PokemonHQLab_1F", "RECEPTION", 8, 3, "face_down", "PokemonHQLab_1F_EventScript_Reception", "em_woman_3", () => true],
    ["PokemonHQLab_1F", "AIDAN", 11, 4, "face_down", "PokemonHQLab_1F_EventScript_Aidan", "em_scientist_2", () => true],
    ["PokemonHQLab_1F", "KRANE_1F", 12, 4, "face_left", "PokemonHQLab_1F_EventScript_Krane", "em_scientist_1", (f) => story(f) === 4],
    ["PokemonHQLab_2F", "KRANE", 4, 3, "face_down", "PokemonHQLab_2F_EventScript_Krane", "em_scientist_1", (f) => story(f) >= 2 && story(f) < 4],
    ["PokemonHQLab_2F", "COACH", 11, 5, "face_down", "PokemonHQLab_2F_EventScript_Coach", "em_man_4", () => true],
    ["PokemonHQLab", "AFERD", 8, 14, "face_right", "PokemonHQLab_EventScript_Aferd", "em_boy_2", (f) => story(f) >= 2],
    ["PokemonHQLab", "NAPS", 13, 11, "face_up", "PokemonHQLab_EventScript_Naps", "orre_peon_m", () => false],
    ["PokemonHQLab", "THUG", 12, 10, "face_up", "PokemonHQLab_EventScript_Thug", "orre_peon_m", () => false],
    ["PokemonHQLab", "KRANE_OUT", 14, 10, "face_down", "PokemonHQLab_EventScript_KraneOut", "em_scientist_1", () => false],
    ["PokemonHQLab", "STAFF", 16, 10, "face_left", "PokemonHQLab_EventScript_Staff", "em_scientist_2", (f) => story(f) >= 6],
    // (Jovi, travelling with you on Lily's errand, only in its scenes: she's beside you then.)
    ["PokemonHQLab", "JOVI_OUT", 14, 10, "face_down", "PokemonHQLab_EventScript_Jovi", "em_little_girl", () => false],
    // Gateon Port: Perr at the pier, mending its rotating bridge; Emili and Acri at home; the Parts Shop's stand-in
    // keeper, and Perr behind the counter once Makan's sent you back; the Pokémon Center's and the Mart's people.
    ["GateonPort", "PERR", 18, 21, "face_up", "GateonPort_EventScript_Perr", "em_boy_1", (f) => story(f) >= 7 && story(f) < 10],
    ["GateonPort", "ZOOK", 18, 6, "face_up", "GateonPort_EventScript_Zook", "orre_snagem_m", () => false],
    ["GateonPort", "VERICH", 24, 6, "face_left", "GateonPort_EventScript_Verich", "em_gentleman", () => false],
    ["GateonPort", "ARDOS", 24, 5, "face_left", "GateonPort_EventScript_Ardos", "em_man_5", () => false],
    ["GateonPort", "ELDES", 24, 7, "face_left", "GateonPort_EventScript_Eldes", "em_man_4", () => false],
    ["GateonPort", "EMILI", 27, 8, "face_up", "GateonPort_EventScript_Emili", "em_girl_2", () => false],
    ["GateonPort", "JOVI_PORT", 18, 2, "face_down", "GateonPort_EventScript_Jovi", "em_little_girl", () => false],
    ["GateonPort_EmilisHouse", "EMILI_HOME", 5, 4, "face_down", "GateonPort_EventScript_EmiliHome", "em_girl_2", (f) => story(f) >= 8],
    ["GateonPort_EmilisHouse", "ACRI", 7, 4, "face_down", "GateonPort_EventScript_Acri", "em_boy_3", (f) => story(f) >= 8],
    ["GateonPort_PartsShop", "SHOPKEEP", 8, 9, "face_down", "GateonPort_PartsShop_EventScript_Keeper", "em_man_2", (f) => story(f) < 10],
    ["GateonPort_PartsShop", "PERR_SHOP", 8, 9, "face_down", "GateonPort_PartsShop_EventScript_Perr", "em_boy_1", (f) => story(f) >= 10],
    ["GateonPort_Mart", "CLERK", 2, 3, "face_right", "GateonPort_Mart_EventScript_Clerk", "em_man_3", () => true],
    // Kaminko's House: Chobin at the gate till he's let you in, then indoors; Makan and the Doctor inside.
    ["KaminkosHouse", "CHOBIN", 13, 16, "face_down", "KaminkosHouse_EventScript_Chobin", "em_boy_3", (f) => !f.xdChobin],
    ["KaminkosHouse_1F", "CHOBIN_IN", 4, 3, "face_down", "KaminkosHouse_1F_EventScript_Chobin", "em_boy_3", (f) => !!f.xdChobin],
    ["KaminkosHouse_1F", "MAKAN", 7, 3, "face_down", "KaminkosHouse_1F_EventScript_Makan", "em_old_man", (f) => story(f) < 12],
    ["KaminkosHouse_1F", "KAMINKO", 16, 3, "face_left", "KaminkosHouse_1F_EventScript_Kaminko", "em_scientist_1", () => true],
    // Agate (XD's M3): Eagun's four friends in the Relic Cave, there to battle and help open a Shadow Pokémon's heart,
    // from Lily's sending you (12); Eagun himself at the Relic Stone, waiting for you (13).
    ["AgateVillage_RelicCave", "JOLS", 6, 6, "face_down", "AgateVillage_RelicCave_EventScript_XD_JOLS", "em_woman_4", (f) => story(f) >= 12],
    ["AgateVillage_RelicCave", "GORPS", 7, 9, "face_right", "AgateVillage_RelicCave_EventScript_XD_GORPS", "em_man_1", (f) => story(f) >= 12],
    ["AgateVillage_RelicCave", "LADI", 15, 15, "face_left", "AgateVillage_RelicCave_EventScript_XD_LADI", "em_old_woman", (f) => story(f) >= 12],
    ["AgateVillage_RelicCave", "CRON", 12, 5, "face_right", "AgateVillage_RelicCave_EventScript_XD_CRON", "em_old_man", (f) => story(f) >= 12],
    ["RelicForest", "EAGUN", 10, 7, "face_down", "RelicForest_EventScript_XD_EAGUN", "em_old_man", (f) => story(f) === 13]
  ];
  // (Colosseum's Eagun at home is out when you first come in XD's story (he runs in) and at the Relic Stone while he
  // waits for you there: his own rule otherwise, game/orre.js's.)
  Orre.EXTRA_VISIBLE.LOCALID_ORRE_EAGUN = (f) => (story(f) === 12 || story(f) === 13 ? false : (f.orreStory | 0) !== 29);
  for (const [map, key, x, y, facing, script, sprite, vis] of PEOPLE) {
    Orre.EXTRA_VISIBLE[ID(key)] = vis;
    const m = W[map];
    if (!m || m.people.some((p) => p.localId === ID(key))) continue;
    m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x, y, movement: facing, rangeX: 0, rangeY: 0, script, flag: null,
      text: null, localId: ID(key), sprite, width: 16, height: 32, frames: 9 });
  }
  const SCRIPTS = [...new Set(PEOPLE.map((p) => p[5]))].concat(["enter:PokemonHQLab_1F", "enter:PokemonHQLab", "arrive:PokemonHQLab",
    "arrive:GateonPort", "enter:GateonPort", "GateonPort_EventScript_KrabbyClub", "PokemonHQLab_1F_EventScript_PurifyChamber",
    // (Colosseum's own scripts for Eagun's house, XD's while its story's at Agate: ui/game.js's xdScene hands the rest
    // back to Colosseum's.)
    "enter:AgateVillage_EaguansHouse", "AgateVillage_EaguansHouse_EventScript_Eagun", "AgateVillage_EaguansHouse_EventScript_Beluh"]);
  // (Whether XD's story is at Agate: Lily's sent you (12) till Eagun's had your P★DA number (15) and after.)
  const atAgate = (f) => story(f) >= 12;
  // A room's scene as you come in: Lily in the lobby the first time (2); Cipher outside with Krane (5); Jovi and Zook
  // at Gateon Port (7); the Purify Chamber finished as you come back into the lobby from a trip once Lily's had the
  // Machine Part (xdChamberDue, xdChamberAway: ui/game.js's orreWorldMap).
  function sceneDue(script, f) {
    if (script === "enter:PokemonHQLab_1F") return story(f) === 2 || (!!f.xdChamberDue && !!f.xdChamberAway);
    if (script === "enter:PokemonHQLab" || script === "arrive:PokemonHQLab") return story(f) === 5;
    if (script === "enter:GateonPort" || script === "arrive:GateonPort") return story(f) === 7 && !f.xdGateonScene;
    // (Eagun's house: Beluh, then Eagun, as you first come (12); back from the Relic Stone (14).)
    if (script === "enter:AgateVillage_EaguansHouse") return story(f) === 12 || story(f) === 14;
    return false;
  }

  // Gateon Port's Mart (XD's: its first selection, Poké Balls and Poké Snacks among the usual).
  const GATEON_MART = ["poke-ball", "great-ball", "potion", "super-potion", "antidote", "paralyze-heal", "awakening", "burn-heal", "ice-heal", "repel"];
  Orre.XD = { PLACE, GATEON, KAMINKO, EEVEE, SCRIPTS, sceneDue, shadowRecord, trainer, ID, GATEON_MART, atAgate };
})();
