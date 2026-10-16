// Trainer Tower on Seven Island, as in FireRed (src/trainer_tower.c), with
// the challenges FireRed has built in (data/trainer-tower.js; FireRed's
// e-Reader cards could load others, which this game hasn't got).
// Depends on: window.TRAINER_TOWER, window.Party, window.DEX
//
//   TrainerTower.MODES                    // ["Single", "Double", "Knockout", "Mixed"] (the lobby's menu)
//   TrainerTower.floor(mode, n)           // floor n (1-8) of challenge `mode` (0-3): { type, prize, trainers, looks }
//   TrainerTower.prize(mode)              // the challenge's prize (its first floor's: GiveChallengePrize)
//   TrainerTower.start(flags, mode)       // StartTrainerTowerChallenge: flags.tower = { mode, floorsCleared, frames, ... }
//   TrainerTower.floorCleared(flags, n)   // GetFloorAlreadyCleared: no battle on floor n
//   TrainerTower.team(floor, trainer, cleared, level)   // BuildEnemyParty: that trainer's Pokémon (party records)
//   TrainerTower.partyLevel(party)        // GetPartyMaxLevel: they battle at your best's level
//   TrainerTower.tick(flags, ms)          // the clock, while it's running (the VBlank counter)
//   TrainerTower.time(frames)             // ["01", "23", "45"]: minutes, seconds, hundredths (PRINT_TOWER_TIME)
//   TrainerTower.best(flags, mode)        // the Time Board's record for `mode`, in frames
//   TrainerTower.finalTime(flags)         // CheckFinalTime: 0 a new record, 1 not, 2 already checked
//
// FireRed keeps the challenge in gSaveBlock1Ptr->trainerTower[mode]; here
// player.flags.tower (the challenge going on) and flags.towerRecords
// ({ best: [frames x4], prize: [bool x4] }: each mode's best time, and its
// prize, given once, as FireRed's built-in challenges never change).
(function () {
  "use strict";

  const MODES = ["Single", "Double", "Knockout", "Mixed"];
  const FLOORS = 8;
  const MAX_TIME = 215999;   // TRAINER_TOWER_MAX_TIME: 59:59.99, in frames
  // Which of a trainer's six Pokémon battle, by how many floors you've
  // cleared (sSingleBattleChallengeMonIdxs: two; sDoubleBattleChallengeMonIdxs:
  // one each; sKnockoutChallengeMonIdxs: one each).
  const SINGLE_MONS = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 1], [5, 2], [0, 3], [1, 4]];
  const DOUBLE_MONS = [[0, 1], [1, 3], [2, 0], [3, 4], [4, 2], [5, 2], [0, 3], [1, 5]];
  const KNOCKOUT_MONS = [[0, 2, 4], [1, 3, 5], [2, 3, 1], [3, 4, 0], [4, 1, 2], [5, 0, 3], [0, 5, 2], [1, 4, 5]];

  const data = () => window.TRAINER_TOWER;
  const floor = (mode, n) => data().floors[data().challenges[mode][n - 1]];
  const prize = (mode) => floor(mode, 1).prize;

  function records(flags) {
    return flags.towerRecords || (flags.towerRecords = { best: MODES.map(() => MAX_TIME), prize: MODES.map(() => false) });
  }
  function start(flags, mode) {
    records(flags);
    flags.tower = { mode, floorsCleared: 0, frames: 0, running: true, spokeToOwner: false, checkedFinalTime: false };
    return flags.tower;
  }
  // GetFloorAlreadyCleared: a floor has its battle only while it's the next
  // one to clear.
  const floorCleared = (flags, n) => !flags.tower || flags.tower.floorsCleared !== n - 1;

  // A Trainer Tower Pokémon (CreateBattleTowerMon): its moves, held item,
  // EVs, IVs, nature, ability and friendship, at `level`.
  function mon(m, level) {
    const r = window.Party.create(m.species, level, { moves: m.moves.slice(), ivs: 0 });
    const abilities = (window.DEX[m.species] || {}).abilities || [];
    Object.assign(r, { ivs: Object.assign({}, m.ivs), evs: Object.assign({}, m.evs), nature: m.nature, gender: m.gender,
      happiness: m.happiness, item: m.item || "", ability: abilities[Math.min(m.abilityNum, 1)] || abilities[0] || r.ability });
    if (r.gender === "N" && !/genderless/i.test((window.DEX[m.species] || {}).gender || "")) r.gender = "M";
    r.hp = window.Party.maxHp ? window.Party.maxHp(r) : r.hp;
    delete r.shiny;
    return r;
  }
  // BuildEnemyParty: by the challenge's kind of floor, which of the trainer's
  // (or, in a double battle, both trainers') Pokémon, by floors cleared.
  function team(fl, trainer, cleared, level) {
    const c = Math.max(0, Math.min(FLOORS - 1, cleared | 0));
    if (fl.type === "double") return [mon(fl.trainers[0].mons[DOUBLE_MONS[c][0]], level), mon(fl.trainers[1].mons[DOUBLE_MONS[c][1]], level)];
    if (fl.type === "knockout") return [mon(fl.trainers[trainer].mons[KNOCKOUT_MONS[c][trainer]], level)];
    return SINGLE_MONS[c].map((i) => mon(fl.trainers[0].mons[i], level));
  }
  // GetPartyMaxLevel.
  const partyLevel = (party) => Math.max(1, ...(party || []).filter((r) => !r.egg).map((r) => r.level | 0));

  // The clock: FireRed's VBlank counter, 60 a second, until you reach the owner.
  function tick(flags, ms) {
    const t = flags.tower;
    if (!t || !t.running) return;
    t.ms = (t.ms || 0) + ms;
    t.frames = Math.min(MAX_TIME, Math.floor(t.ms * 60 / 1000));
  }
  function time(frames) {
    frames = Math.min(MAX_TIME, Math.max(0, frames | 0));
    const minutes = Math.floor(frames / 3600), seconds = Math.floor((frames % 3600) / 60), cs = Math.floor((frames % 60) * 168 / 100);
    return [String(minutes).padStart(2, " "), String(seconds).padStart(2, " "), String(cs).padStart(2, "0")];
  }
  const best = (flags, mode) => records(flags).best[mode];
  function finalTime(flags) {
    const t = flags.tower, r = records(flags);
    if (t.checkedFinalTime) return 2;
    t.checkedFinalTime = true;
    if (r.best[t.mode] > t.frames) { r.best[t.mode] = t.frames; return 0; }
    return 1;
  }

  window.TrainerTower = { MODES, FLOORS, MAX_TIME, SINGLE_MONS, DOUBLE_MONS, KNOCKOUT_MONS, floor, prize, records, start, floorCleared,
    mon, team, partyLevel, tick, time, best, finalTime };
})();
