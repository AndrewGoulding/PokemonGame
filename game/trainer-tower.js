// Trainer Tower on Seven Island, as in FireRed (src/trainer_tower.c), with
// the challenges FireRed has built in (data/trainer-tower.js; FireRed's
// e-Reader cards could load others, which this game hasn't got).
// Depends on: window.TRAINER_TOWER, window.Party, window.DEX
//
//   TrainerTower.MODES                    // ["Single", "Double", "Knockout", "Mixed"] (the lobby's menu)
//   TrainerTower.floor(mode, n)           // floor n (1-8) of challenge `mode` (0-3): { type, prize, trainers, looks }
//   TrainerTower.prize(mode)              // FireRed's prize for the challenge (its first floor's; not given here)
//   TrainerTower.rewards(mode, frames, rng)   // this game's: the items for finishing it in `frames`
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
// ({ best: [frames x4], prize: [bool x4] }: each mode's best time; `prize`
// is from when FireRed's prizes were given once, and stays for old saves).
//
// Rewards (this game's, in place of FireRed's once-only prizes): every
// challenge finished draws items from one pool, whatever the mode. The
// faster the finish, the better the draw: slow, middling or fast (Single,
// Double and Mixed under 15 and 8 minutes; Knockout, with three battles a
// floor, under 30 and 16). A slow finish draws vitamins, PP Ups, mints and
// everyday held items; a middling one adds Bottle Caps, PP Maxes and the
// stronger held items (Choice items, Life Orb, Focus Sash...); a fast one
// adds Gold Bottle Caps, Ability Capsules and the Ability Patch. One, two or
// three items by pace; a Knockout two more than that.
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

  // The reward pool, by the pace that unlocks each part: [item, weight].
  const VITAMINS = ["hp-up", "protein", "iron", "calcium", "zinc", "carbos"];
  const HELD_EVERYDAY = ["quick-claw", "kings-rock", "scope-lens", "bright-powder", "white-herb", "mental-herb", "metal-coat", "dragon-scale",
    "up-grade", "leftovers", "focus-band", "shell-bell", "black-sludge", "wide-lens", "muscle-band", "wise-glasses", "lum-berry", "sitrus-berry"];
  const HELD_STRONG = ["choice-band", "choice-specs", "choice-scarf", "life-orb", "focus-sash", "assault-vest", "eviolite", "rocky-helmet",
    "expert-belt", "weakness-policy", "air-balloon"];
  const mints = () => Object.keys(window.ITEMS || {}).filter((id) => /-mint$/.test(id));
  const POOLS = [
    () => VITAMINS.map((v) => [v, 3]).concat([["pp-up", 4], ["rare-candy", 3], ["exp-candy-m", 2], ["exp-candy-l", 2]], mints().map((m) => [m, 0.5]), HELD_EVERYDAY.map((h) => [h, 1.5])),
    () => [["bottle-cap", 6], ["pp-max", 3], ["exp-candy-xl", 2]].concat(HELD_STRONG.map((h) => [h, 2])),
    () => [["gold-bottle-cap", 3], ["ability-capsule", 3], ["ability-patch", 1]]
  ];
  // The pace: 1 slow, 2 middling, 3 fast (minutes, by mode: a Knockout has three battles a floor).
  const PACE = (mode) => (mode === 2 ? [16, 30] : [8, 15]);
  function pace(mode, frames) {
    const [fast, mid] = PACE(mode);
    return frames <= fast * 3600 ? 3 : frames <= mid * 3600 ? 2 : 1;
  }
  function rewards(mode, frames, rng) {
    const tier = pace(mode, frames);
    return rewardsAt(tier, tier + (mode === 2 ? 2 : 0), rng);
  }
  // `count` items from the pools up to `tier` (1-3): Crystal's Battle Tower's too (ui/game.js).
  function rewardsAt(tier, count, rng) {
    rng = rng || Math.random;
    const pool = POOLS.slice(0, tier).map((f) => f()).flat().filter(([id]) => !window.ITEMS || window.ITEMS[id]);
    const total = pool.reduce((t, [, w]) => t + w, 0);
    const out = [];
    for (let i = 0; i < count; i++) {
      let r = rng() * total;
      for (const [id, w] of pool) { r -= w; if (r < 0) { out.push(id); break; } }
    }
    return out;
  }
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

  // A Trainer Tower Pokémon (CreateBattleTowerMon): its held item,
  // EVs, IVs, nature, ability and friendship, at `level`.
  function mon(m, level) {
    // (Its moves: FireRed's set for it.)
    const r = window.Party.create(m.species, level, { ivs: 0, moves: (m.moves || []).filter((n) => window.MOVES[n]).length ? m.moves.filter((n) => window.MOVES[n]) : undefined });
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

  window.TrainerTower = { MODES, FLOORS, MAX_TIME, SINGLE_MONS, DOUBLE_MONS, KNOCKOUT_MONS, floor, prize, records, start, floorCleared, rewardsAt,
    mon, team, partyLevel, tick, time, best, finalTime, rewards, pace, PACE };
})();
