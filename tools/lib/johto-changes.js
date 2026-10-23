// This game's own changes to Johto's story and maps, made to what
// tools/build-johto.js compiles from HeartGold and SoulSilver before it writes
// data/johto-maps.js (so a rebuild keeps them):
//   - you come to Johto as Kanto's Champion: Prof. Elm knows it and offers you
//     a Pokémon (no "your friend Lyra", no walking with Pokémon), gives you
//     the Pokégear himself (Johto's new technology; HGSS's Mom gives it), and
//     doesn't send you to your mom; Prof. Oak at Mr. Pokémon's knows you and
//     gives no Pokédex; Route 27's man tells you about the Rejuvenator
//     instead of Kanto; Ace Trainer Reena asks about Pallet Town;
//   - Route 29's catching tutorial (Lyra and her Marill by the gatehouse, the
//     throws, the five Poké Balls) is gone: its triggers and its two people;
//   - Cherrygrove's Guide Gent and his scene are gone (the Pokégear's Map is
//     yours from the start: ui/pokegear.js); Silver is "Rival Silver" from his
//     first battle, with his own picture (HGSS's "Passerby Boy").
//
//   require("./lib/johto-changes").apply({ maps, scripts, trainers })
"use strict";

const ELM_INTRO = ["Professor Elm: {BUF0}!\nI've been waiting for you!", "The Champion of Kanto, right here\nin my lab!", "I followed your matches at the\nPokémon League. What a Trainer!",
  "Do you know anything about\nmy research?", "I study how Pokémon grow\nand evolve.", "And I'd love to see what a Pokémon\nbecomes when a Champion raises it", "from its very first step.",
  "So I'm going to give you a Pokémon!", "The device over there has some Pokémon\nyou could choose from..."];
const ELM_GEAR = ["Professor Elm: Oh, before you go!\nI have something for you.", "It's a Pokégear: the newest technology\nfrom Johto's own labs.",
  "You won't find one in Kanto yet.\nIt's only just come out here.", "It has a Map, a Phone and more.\nTake it with you!"];
const ELM_LATER = ["Professor Elm: {BUF0}!\nI'm truly surprised!", "I knew the Champion of Kanto would\nbe something special,", "but to see it with my own eyes!",
  "{BUF0}, the Pokémon I gave you\nhas taught me so much.", "It is that...", "there is no end to the relationship", "between people and Pokémon!", "Let me thank you once again for\nyour support!"];
const ELM_GYMS = ["...{BUF0}. Challenging the\nGyms scattered around will be", "a long journey.", "Take care out there, Champion!"];
const OAK_HELLO = ["Professor Oak: And with that...", "{BUF0}! Fancy meeting you here!", "I was just visiting my friend\nMr. Pokémon.",
  "I heard you were running an errand\nfor Professor Elm, so I waited here.", "The Champion of Kanto, running\nerrands! Elm's lucky to have you."];
const OAK_DEX = ["Professor Oak: ...Ah!", "You still have the Pokédex I gave\nyou, of course.", "Johto has Pokémon Kanto hasn't got.\nKeep recording them as you go:",
  "every one you see or catch here goes\nin it, just as Kanto's did."];
const R27_MAN = ["Heading into Johto, are you?", "Pokémon raised in Kanto won't listen\nto you here at first.", "They're too strong for Johto's\nBadges, you see.",
  "Go and see the Rejuvenator in\nNew Bark Town's Pokémon Center.", "He's upstairs, and he can make a\nPokémon young again!"];

const MESSAGES = {
  msg_0543_T20R0101_00000: ELM_INTRO, msg_0543_T20R0101_00001: ELM_INTRO,
  msg_0543_T20R0101_00010: ELM_GEAR, msg_0543_T20R0101_pokegear: ["{BUF0} received the Pokégear\nfrom Professor Elm!"],
  msg_0543_T20R0101_00011: ["If your Pokémon gets hurt, you can\nheal it with this machine.", "It's so easy to use.\nJust check the PC on my desk!"],
  msg_0543_T20R0101_00102: ELM_LATER, msg_0543_T20R0101_00103: ELM_LATER,
  msg_0543_T20R0101_00038: ELM_GYMS, msg_0543_T20R0101_00039: ELM_GYMS,
  msg_0377_R30R0201_00008: OAK_HELLO, msg_0377_R30R0201_00009: OAK_HELLO,
  msg_0377_R30R0201_00011: OAK_DEX, msg_0377_R30R0201_00012: ["{BUF0}'s Pokédex is ready for\nJohto's Pokémon!"],
  msg_0369_R27_00001: R27_MAN
};

function apply({ maps, scripts, trainers }) {
  Object.assign(scripts.messages, MESSAGES);
  // Elm's Pokégear: the CloseMsg after his words about it becomes the gift (ui/johto-script.js's ElmPokegear).
  const lab = scripts.zones.T20R0101;
  if (lab) lab.cmds.forEach((c, i) => { if (c[0] === "NPCMsg" && c[1] === "msg_0543_T20R0101_00010" && lab.cmds[i + 1] && lab.cmds[i + 1][0] === "CloseMsg") lab.cmds[i + 1] = ["ElmPokegear"]; });
  // Route 27's man says the same when spoken to.
  const r27 = maps.Route27;
  if (r27) for (const p of r27.people) if (p.localId === "obj_R27_gsbigman") p.text = R27_MAN.slice();
  // Reena: "You came from Pallet Town?"
  const reena = (t) => { if (t && t.intro) t.intro = t.intro.map((l) => l.replace("You came from New Bark Town?", "You came from Pallet Town?")); };
  reena(trainers.HGSS_TRAINER_ACE_TRAINER_F_REENA);
  if (r27) for (const p of r27.people) if (p.trainer && p.trainer.id === "HGSS_TRAINER_ACE_TRAINER_F_REENA") reena(p.trainer);
  // Cherrygrove: no Guide Gent, no tour.
  const c = maps.CherrygroveCity;
  if (c) {
    c.people = c.people.filter((p) => p.localId !== "obj_T21_gsoldman1");
    c.triggers = c.triggers.filter((t) => !/scr_seq_T21_00[12]\?/.test(t.script));
  }
  // Route 29: no catching tutorial (nor Lyra and her Marill who give it).
  const r29 = maps.Route29;
  if (r29) {
    r29.triggers = r29.triggers.filter((t) => !/scr_seq_R29_001\?/.test(t.script));
    r29.people = r29.people.filter((p) => p.localId !== "obj_R29_var_2" && p.localId !== "obj_R29_tsure_poke_static_marill");
  }
  // Route 35's Juggler Irwin: his strongest Voltorb (or Electrode, in his rematches), and three of a kind he juggles
  // with no more: Mr. Mime, Drowzee or Hypno, Magnemite or Magneton.
  for (const [id, keep, more] of [["HGSS_TRAINER_JUGGLER_IRWIN", "Voltorb", [["Mr. Mime", 14], ["Drowzee", 13], ["Magnemite", 13]]],
    ["HGSS_TRAINER_JUGGLER_IRWIN_2", "Voltorb", [["Mr. Mime", 32], ["Hypno", 32], ["Magneton", 32]]],
    ["HGSS_TRAINER_JUGGLER_IRWIN_3", "Electrode", [["Mr. Mime", 40], ["Hypno", 40], ["Magneton", 40]]],
    ["HGSS_TRAINER_JUGGLER_IRWIN_4", "Electrode", [["Mr. Mime", 48], ["Hypno", 48], ["Magneton", 48]]]]) {
    const t = trainers[id];
    if (!t) continue;
    const top = t.party.filter((m) => m.species === keep).sort((a, b) => b.level - a.level)[0];
    if (top) t.party = [top].concat(more.map(([species, level]) => ({ species, level, iv: top.iv })));
  }
  // Silver, from his first battle.
  for (const id of ["HGSS_TRAINER_PASSERBY_BOY", "HGSS_TRAINER_PASSERBY_BOY_2", "HGSS_TRAINER_PASSERBY_BOY_3"]) {
    if (trainers[id]) Object.assign(trainers[id], { className: "Rival", name: "Silver", pic: "hgss_silver" });
  }
}

module.exports = { apply, MESSAGES };
