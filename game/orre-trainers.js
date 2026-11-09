// Orre's other Trainers, Colosseum's own: the ones without Shadow Pokémon (Chaser Calda, the Pre Gym, Pyrite Cave's,
// the lab's Researchers, Realgam's halls, the rebuilt Snagem Hideout's and so on), each where Colosseum puts them,
// with Colosseum's parties (altissimo1's Colosseum guide) and Colosseum's own words. game/orre-trainers-*.js add them,
// a place at a time, with Orre.addTrainers. Depends on: window.Orre, window.WORLD_MAPS.
//
// A Trainer: script -> { name, cls (prize class), pic (battle picture), sprite (overworld; else by class, SPRITES),
// map, x, y, facing, single (a single battle; else double), until (gone from this orreStory on), when (flags -> bool:
// there only then), stages: [{ from, team: [[species, level]], intro, defeat, after, lost }] }. A stage is theirs from
// orreStory `from` (or while `from(flags)` holds); the latest that's reached is the one they battle with, once. Beaten,
// they say that stage's `after` till the next stage comes. (player.flags.orreColo: script -> the stage beaten last.)
//
// Colosseum's Shadow Pokémon Trainers keep battling till their Shadow Pokémon is snagged (Orre.SHADOW_TRAINERS); after
// that, Orre.addRematches gives them Colosseum's later parties the same way (player.flags.orreColoRematch).
//
//   Orre.COLO_TRAINERS, Orre.addTrainers({ script: trainer })
//   Orre.coloStage(script, flags)       // { stage, index, beaten } for a Trainer now (stage null: none yet)
//   Orre.REMATCHES, Orre.addRematches({ shadowTrainerScript: [stage] }), Orre.rematchStage(script, flags)
//   Orre.SPRITES                        // overworld sprite by Trainer class
"use strict";

(function () {
  const Orre = window.Orre;
  const COLO_TRAINERS = {}, REMATCHES = {};

  // Overworld sprites by class (Colosseum's classes, as the GBA games would draw them), and battle pictures.
  const SPRITES = {
    "Rider": "biker", "Chaser": "em_cycling_triathlete_m", "Hunter": "cooltrainer_m", "Bandana Guy": "rocker", "Roller Boy": "youngster",
    "St. Performer": "em_expert_m", "Fun Old Man": "em_expert_m", "Rich Boy": "em_rich_boy", "Lady": "em_beauty", "Cooltrainer": "cooltrainer_m",
    "Researcher": "scientist", "Bodybuilder": "black_belt", "Athlete": "em_cycling_triathlete_m", "Worker": "worker_m", "Pregymleader": "cooltrainer_m",
    "Team Snagem": "orre_snagem_m", "Cipher Peon": "orre_peon_m", "Miror B. Peon": "orre_peon_m", "Rogue": "man", "Mystery Troop": "orre_peon_m",
    "Shady Guy": "man", "Deep King": "em_expert_m"
  };
  const PICS = {
    "Rider": "biker", "Chaser": "em_cycling_triathlete_m", "Hunter": "cooltrainer_m", "Bandana Guy": "rocker", "Roller Boy": "youngster",
    "St. Performer": "juggler", "Fun Old Man": "em_expert_m", "Rich Boy": "em_rich_boy", "Lady": "em_lady", "Cooltrainer": "cooltrainer_m",
    "Researcher": "scientist", "Bodybuilder": "black_belt", "Athlete": "em_cycling_triathlete_m", "Worker": "dp_worker", "Pregymleader": "cooltrainer_m",
    "Team Snagem": "snagem_grunt", "Cipher Peon": "cipher_peon", "Miror B. Peon": "cipher_peon", "Rogue": "burglar"
  };

  // (A woman's, where the class has one: `female: true`.)
  const SPRITES_F = { "Rider": "em_cycling_triathlete_f", "Chaser": "em_running_triathlete_f", "Hunter": "cooltrainer_f", "St. Performer": "em_expert_f",
    "Cooltrainer": "cooltrainer_f", "Bodybuilder": "cooltrainer_f", "Athlete": "em_running_triathlete_f", "Cipher Peon": "orre_peon_f",
    "Miror B. Peon": "orre_peon_f", "Researcher": "scientist", "Roller Boy": "em_lass", "Bandana Guy": "em_lass" };
  const PICS_F = { "Rider": "em_cycling_triathlete_f", "Chaser": "em_running_triathlete_f", "Hunter": "cooltrainer_f", "St. Performer": "em_expert_f",
    "Cooltrainer": "cooltrainer_f", "Bodybuilder": "em_battle_girl", "Athlete": "em_running_triathlete_f", "Cipher Peon": "cipher_peon_f",
    "Miror B. Peon": "cipher_peon_f", "Lady": "em_lady" };
  const spriteFor = (cls, female) => (female && SPRITES_F[cls]) || SPRITES[cls];
  const picFor = (cls, female) => (female && PICS_F[cls]) || PICS[cls];

  const reached = (from, flags) => (typeof from === "function" ? !!from(flags) : (flags.orreStory | 0) >= from);
  // The stage a Trainer battles with now: the latest reached.
  function stageOf(stages, flags, beatenIndex) {
    let index = -1;
    stages.forEach((s, i) => { if (reached(s.from, flags)) index = i; });
    return { stage: index >= 0 ? stages[index] : null, index, beaten: beatenIndex != null && beatenIndex >= index };
  }
  const coloStage = (script, flags) => {
    const t = COLO_TRAINERS[script];
    return t ? stageOf(t.stages, flags, (flags.orreColo || {})[script]) : null;
  };
  const rematchStage = (script, flags) => {
    const r = REMATCHES[script];
    return r ? stageOf(r, flags, (flags.orreColoRematch || {})[script]) : null;
  };

  const frames = (sprite) => (/^(orre_|em_)/.test(sprite) ? 9 : sprite === "biker" ? 20 : 10);
  // (By map and name: the same Trainer can stand in more than one place.)
  const localIdOf = (script) => "LOCALID_ORRE_COLO_" + script.replace(/_EventScript_(Colo_)?/, "_").toUpperCase();

  // Each Trainer, placed on its map, visible while its first stage is reached (and before `until`, and `when`).
  function addTrainers(list) {
    const W = window.WORLD_MAPS || {};
    for (const [script, t] of Object.entries(list)) {
      if (!t.stages || !t.stages.length) throw new Error("No stages: " + script);
      t.script = script;
      t.sprite = t.sprite || spriteFor(t.cls, t.female) || "cooltrainer_m";
      t.pic = t.pic || picFor(t.cls, t.female) || "cooltrainer_m";
      t.localId = t.localId || localIdOf(script);
      COLO_TRAINERS[script] = t;
      Orre.EXTRA_VISIBLE[t.localId] = (flags) => reached(t.stages[0].from, flags) && !(t.until != null && (flags.orreStory | 0) >= t.until) && (!t.when || !!t.when(flags));
      const m = W[t.map];
      if (!m) continue;
      if (m.people.some((p) => p.localId === t.localId)) continue;
      m.people.push({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x: t.x, y: t.y, movement: t.facing || "face_down", rangeX: 0, rangeY: 0,
        script, flag: null, text: null, localId: t.localId, sprite: t.sprite, width: 16, height: 32, frames: frames(t.sprite) });
    }
  }
  function addRematches(list) { Object.assign(REMATCHES, list); }

  Object.assign(Orre, { COLO_TRAINERS, REMATCHES, SPRITES, PICS, spriteFor, picFor, addTrainers, addRematches, coloStage, rematchStage });
})();
