// Pokémon XD: Gale of Darkness, Orre's second campaign (after Colosseum's story and Hoenn's: ui/game.js's xdCallStep).
// So far its opening at the Pokémon HQ Lab (tools/lib/orre-rooms-xd.js's maps): Prof. Krane's welcome and his Eevee,
// the new Snag Machine, and Cipher's raid, Spy Naps and the Shadow Teddiursa (ui/game.js's xdScene). XD's Trainers
// and Shadow Pokémon are its own, from the disc (data/xd-decks.js), its words its own (assets/text/xd.json, through
// tools/colosseum-say.js --xd) but for the few that tie the hero to Michael's family, and Krane's welcome.
// Depends on: window.Orre, window.XD_DECKS, window.WORLD_MAPS, window.Party.
//
// player.flags.xdStory: 1 Oak's called, 2 flown to Orre (the HQ Lab on Orre's map), 3 Lily's met you in the lobby,
// 4 Krane's welcomed you (his Eevee), 5 the Snag Machine's yours and Cipher's taken Krane, 6 Naps beaten outside.
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

  // The HQ Lab on Orre's map: in the south, from Oak's flight (xdStory 2).
  const PLACE = { map: "PokemonHQLab", name: "Pokémon HQ Lab", x: 150, y: 146, arrive: { x: 13, y: 20, facing: "up" } };
  if (!Orre.PLACES.some((p) => p.map === PLACE.map)) Orre.PLACES.push(PLACE);

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
    return { name: t.cls + " " + t.name, cls: t.cls, female: t.female, pic: (Orre.picFor && Orre.picFor(t.cls, t.female)) || PICS[t.cls] || "cipher_peon",
      team, shadows, defeat: defeat || null };
  }
  const PICS = { "Spy": "cipher_peon", "Thug": "burglar", "Researcher": "scientist", "Cipher Peon": "cipher_peon", "Cipher Admin": "cipher_peon" };

  // The HQ Lab's people: (map, key, x, y, facing, script, sprite, visible).
  const PEOPLE = [
    ["PokemonHQLab_1F", "LILY", 4, 5, "face_down", "PokemonHQLab_1F_EventScript_Lily", "em_woman_2", (f) => story(f) >= 3],
    ["PokemonHQLab_1F", "RECEPTION", 8, 3, "face_down", "PokemonHQLab_1F_EventScript_Reception", "em_woman_3", () => true],
    ["PokemonHQLab_1F", "AIDAN", 11, 4, "face_down", "PokemonHQLab_1F_EventScript_Aidan", "em_scientist_2", () => true],
    ["PokemonHQLab_1F", "KRANE_1F", 12, 4, "face_left", "PokemonHQLab_1F_EventScript_Krane", "em_scientist_1", (f) => story(f) === 4],
    ["PokemonHQLab_2F", "KRANE", 4, 3, "face_down", "PokemonHQLab_2F_EventScript_Krane", "em_scientist_1", (f) => story(f) >= 2 && story(f) < 4],
    ["PokemonHQLab_2F", "COACH", 11, 5, "face_down", "PokemonHQLab_2F_EventScript_Coach", "em_man_4", () => true],
    ["PokemonHQLab", "AFERD", 8, 14, "face_right", "PokemonHQLab_EventScript_Aferd", "em_boy_2", (f) => story(f) >= 2],
    ["PokemonHQLab", "NAPS", 13, 11, "face_up", "PokemonHQLab_EventScript_Naps", "orre_peon_m", () => false],
    ["PokemonHQLab", "THUG", 12, 10, "face_up", "PokemonHQLab_EventScript_Thug", "orre_peon_m", () => false],
    ["PokemonHQLab", "KRANE_OUT", 14, 10, "face_down", "PokemonHQLab_EventScript_KraneOut", "em_scientist_1", () => false],
    ["PokemonHQLab", "STAFF", 16, 10, "face_left", "PokemonHQLab_EventScript_Staff", "em_scientist_2", (f) => story(f) >= 6]
  ];
  for (const [map, key, x, y, facing, script, sprite, vis] of PEOPLE) {
    Orre.EXTRA_VISIBLE[ID(key)] = vis;
    const m = W[map];
    if (!m || m.people.some((p) => p.localId === ID(key))) continue;
    m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x, y, movement: facing, rangeX: 0, rangeY: 0, script, flag: null,
      text: null, localId: ID(key), sprite, width: 16, height: 32, frames: 9 });
  }
  const SCRIPTS = [...new Set(PEOPLE.map((p) => p[5]))].concat(["enter:PokemonHQLab_1F", "enter:PokemonHQLab", "arrive:PokemonHQLab"]);
  // A room's scene as you come in: Lily in the lobby the first time (2), and Cipher outside with Krane (5).
  function sceneDue(script, f) {
    if (script === "enter:PokemonHQLab_1F") return story(f) === 2;
    if (script === "enter:PokemonHQLab" || script === "arrive:PokemonHQLab") return story(f) === 5;
    return false;
  }

  Orre.XD = { PLACE, EEVEE, SCRIPTS, sceneDue, shadowRecord, trainer, ID };
})();
