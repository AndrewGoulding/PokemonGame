// Colosseum's Shadow Pokémon Lab, its keys and doors, and Realgam Tower's Colosseum in rounds.
// Depends on: window.Orre, window.WORLD_MAPS (the lab's rooms: tools/lib/orre-rooms-lab.js, in data/orre-layouts.js).
//
// The lab (orreStory 36 to 40): Researcher Myron in the garage has the Card Key, for the door through to the main
// wing (player.flags.orreLabCardKey once used); the Down St. Key's on the table in Coren's room, for the door to the
// cells (orreLabDownSt); and Ein's room is past a door that opens only once three DNA Samples have been put through
// the DNA analyzer on B1F (orreLabDNA: { spots, got, done }): as in Colosseum, three of nine spots around the main
// wing have one, chosen for each game. After Ein, his Data ROM and TM26 Earthquake are in his room.
//
//   Orre.LAB.DNA_SPOTS, Orre.LAB.dna(flags)     // the nine spots; this game's three (chosen the first time)
//   Orre.LAB.scripts                            // the lab's objects' scripts (ui/game.js's labObject)
//   Orre.LAB.doorShut(script, flags)            // "enter:" a room behind a locked door, still locked? (labDoor)
//   Orre.REALGAM_ROUNDS, Orre.realgamRoundTeam(trainer, snagged)   // Realgam Tower's Colosseum, its rounds
"use strict";

(function () {
  const Orre = window.Orre, W = window.WORLD_MAPS || {};
  const L = (n) => "ShadowLab_" + n;

  // The DNA Samples' nine spots (altissimo1's guide: one in the south-west room's north-east corner and two in the
  // cells on B1F; one in the room up to Coren's; two in Lesar's room, one east of the elevators and two in the
  // northernmost room on B2F), each a sample of one of Colosseum's nine (its DNA Sample items).
  const DNA_SPOTS = [
    [L("B1F_Rooms"), 7, 11, "Bayleef"], [L("Cells"), 1, 2, "Quilava"], [L("Cells"), 7, 2, "Croconaw"], [L("CorenRoom"), 6, 12, "Sudowoodo"],
    [L("B2F_Rooms"), 1, 6, "Misdreavus"], [L("B2F_Rooms"), 6, 4, "Mightyena"], [L("B2F_Rooms2"), 15, 4, "Raikou"],
    [L("B2F_Rooms"), 11, 6, "Entei"], [L("B2F_Rooms"), 16, 3, "Suicune"]
  ].map(([map, x, y, species], i) => ({ i, map, x, y, species, script: "ShadowLab_EventScript_DNA_" + i, localId: "LOCALID_ORRE_LAB_DNA_" + i }));
  // This game's three, chosen once (and kept in the save).
  function dna(flags) {
    if (!flags.orreLabDNA) {
      const all = DNA_SPOTS.map((s) => s.i);
      for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
      flags.orreLabDNA = { spots: all.slice(0, 3).sort((a, b) => a - b), got: [], done: false };
    }
    return flags.orreLabDNA;
  }
  const inLab = (flags) => { const s = flags.orreStory | 0; return s >= 36 && s < 40; };
  const OBJECTS = {
    ShadowLab_EventScript_DataROM: { map: L("EinsRoom"), x: 7, y: 3, localId: "LOCALID_ORRE_LAB_DATA_ROM", visible: (f) => (f.orreStory | 0) >= 40 && !f.orreLabDataROM },
    ShadowLab_EventScript_TM26: { map: L("EinsRoom"), x: 7, y: 2, localId: "LOCALID_ORRE_LAB_TM26", visible: (f) => (f.orreStory | 0) >= 40 && !f.orreLabTM26 }
  };
  for (const s of DNA_SPOTS) OBJECTS[s.script] = { map: s.map, x: s.x, y: s.y, localId: s.localId,
    visible: (f) => inLab(f) && !dna(f).done && dna(f).spots.includes(s.i) && !dna(f).got.includes(s.i) };
  for (const [script, o] of Object.entries(OBJECTS)) {
    Orre.EXTRA_VISIBLE[o.localId] = o.visible;
    const m = W[o.map];
    if (!m || m.people.some((p) => p.localId === o.localId)) continue;
    m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x: o.x, y: o.y, movement: "face_down", rangeX: 0, rangeY: 0, script, flag: null,
      text: null, localId: o.localId, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true });
  }
  const scripts = new Set(Object.keys(OBJECTS).concat(["ShadowLab_EventScript_Analyzer", "ShadowLab_EventScript_Shutter"]));

  // The locked doors: entering the room behind one, while the story's in the lab and it's not been opened.
  const DOORS = {
    ["enter:" + L("Main1F")]: { flag: "orreLabCardKey", key: "lab-card-key", back: { map: L("GarageB1F"), x: 9, y: 11, facing: "up" } },
    ["enter:" + L("Cells")]: { flag: "orreLabDownSt", key: "down-st-key", back: { map: L("B1F"), x: 1, y: 10, facing: "up" } },
    ["enter:" + L("DNARoom")]: { dna: true, back: { map: L("B2F"), x: 11, y: 6, facing: "up" } }
  };
  const doorShut = (script, flags) => {
    const d = DOORS[script];
    return !!d && inLab(flags) && !(d.dna ? dna(flags).done : flags[d.flag]);
  };

  // ---------- Realgam Tower's Colosseum: its four rounds, then Nascour (healed before him, and before Evice) ----------
  //
  // As in Colosseum: Bodybuilder Jomas, Rider Delan, Cipher Peons Nella and Ston, one after another before the crowd,
  // their Shadow Pokémon to be snagged (Orre.SHADOW_TRAINERS' words). After the game, the same six again as a
  // tournament, any Shadow Pokémon not yet snagged still theirs; one snagged, in its place what Colosseum gives them
  // (altissimo1's guide: Exploud, Sneasel, Ninetales, Sceptile; Nascour's Alakazam, Evice's Aggron).
  const REALGAM_ROUNDS = ["Jomas", "Delan", "Nella", "Ston"].map((t) => "RealgamTower_Colosseum_EventScript_Shadow_" + t.toUpperCase());
  const REPLACES = { Jomas: ["Exploud", 48], Delan: ["Sneasel", 48], Nella: ["Ninetales", 48], Ston: ["Sceptile", 49], Nascour: ["Alakazam", 57], Evice: ["Aggron", 62] };
  function realgamRoundTeam(trainer, snagged) {
    const team = Orre.team(trainer, snagged), rep = REPLACES[trainer];
    if (rep && !team.some((r) => r.shadow)) team.unshift(window.Party.create(rep[0], rep[1]));
    return team.slice(0, 6);
  }

  // (The tournament's host, where Nascour stood, after the game: ui/game.js's realgamTournament.)
  {
    const m = W.RealgamTower_Colosseum, id = "LOCALID_ORRE_REALGAM_HOST";
    Orre.EXTRA_VISIBLE[id] = (f) => (f.orreStory | 0) >= 44;
    if (m && !m.people.some((p) => p.localId === id)) m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x: 6, y: 3, movement: "face_down",
      rangeX: 0, rangeY: 0, script: "RealgamTower_Colosseum_EventScript_Host", flag: null, text: null, localId: id, sprite: "gentleman", width: 16, height: 32, frames: 10 });
  }

  Orre.LAB = { DNA_SPOTS, OBJECTS, DOORS, dna, scripts, doorShut };
  Object.assign(Orre, { REALGAM_ROUNDS, REALGAM_REPLACES: REPLACES, realgamRoundTeam });
})();
