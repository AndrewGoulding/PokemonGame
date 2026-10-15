// Experience, EVs and friendship (Gen 6 formulas)
// Depends on: window.DEX (dex.js), window.Stats (stat-calculator.js)
//
//   Experience.expForLevel("Medium Slow", 16)      // total exp needed to reach level 16
//   Experience.levelForExp("Medium Slow", 4000)    // level a Pokémon with 4000 exp is at
//   Experience.gain({ species: "Rattata", level: 5, trainer: false, participants: 1 })

(function () {
  "use strict";

  const MAX_LEVEL = 100;
  const MAX_FRIENDSHIP = 255;

  // Total experience needed to reach level n, per growth rate.
  const GROWTH = {
    "Erratic": (n) => {
      if (n < 50) return (n ** 3 * (100 - n)) / 50;
      if (n < 68) return (n ** 3 * (150 - n)) / 100;
      if (n < 98) return (n ** 3 * Math.floor((1911 - 10 * n) / 3)) / 500;
      return (n ** 3 * (160 - n)) / 100;
    },
    "Fast": (n) => (4 * n ** 3) / 5,
    "Medium Fast": (n) => n ** 3,
    "Medium Slow": (n) => (6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140,
    "Slow": (n) => (5 * n ** 3) / 4,
    "Fluctuating": (n) => {
      if (n < 15) return (n ** 3 * (Math.floor((n + 1) / 3) + 24)) / 50;
      if (n < 36) return (n ** 3 * (n + 14)) / 50;
      return (n ** 3 * (Math.floor(n / 2) + 32)) / 50;
    }
  };

  function growthRate(species) {
    const dex = window.DEX[species];
    return (dex && GROWTH[dex.expGroup]) ? dex.expGroup : "Medium Fast";
  }

  function expForLevel(group, level) {
    if (level <= 1) return 0;
    const fn = GROWTH[group] || GROWTH["Medium Fast"];
    return Math.floor(fn(Math.min(level, MAX_LEVEL)));
  }

  function levelForExp(group, exp) {
    let level = 1;
    while (level < MAX_LEVEL && exp >= expForLevel(group, level + 1)) level++;
    return level;
  }

  // How far through the current level `exp` is, from 0 to 1.
  function progress(group, level, exp) {
    if (level >= MAX_LEVEL) return 1;
    const lo = expForLevel(group, level), hi = expForLevel(group, level + 1);
    return Math.max(0, Math.min(1, (exp - lo) / (hi - lo)));
  }

  // Experience for defeating (or catching) a Pokémon, Gen 6 formula without Exp. Share:
  //   base exp x level / 7, split between participants, x1.5 if it belonged to a
  //   trainer, x1.5 for a traded Pokémon, x1.5 with a Lucky Egg.
  // opts: { species, level, trainer, participants, traded, luckyEgg }
  function gain(opts) {
    const dex = window.DEX[opts.species];
    const base = dex ? dex.baseExp || 0 : 0;
    let exp = Math.floor((base * opts.level) / 7);
    exp = Math.floor(exp / Math.max(1, opts.participants || 1));
    if (opts.trainer) exp = Math.floor(exp * 1.5);
    if (opts.traded) exp = Math.floor(exp * 1.5);
    if (opts.luckyEgg) exp = Math.floor(exp * 1.5);
    return Math.max(1, exp);
  }

  // Adds the defeated species' EV yield to `evs` (mutated), respecting the caps.
  function addEvs(evs, species) {
    const dex = window.DEX[species];
    const yieldEvs = (dex && dex.evYield) || {};
    let total = Object.values(evs).reduce((s, v) => s + (v || 0), 0);
    for (const stat of Object.keys(yieldEvs)) {
      const room = Math.min(window.Stats.MAX_EV_PER_STAT - (evs[stat] || 0), window.Stats.MAX_EV_TOTAL - total);
      const add = Math.max(0, Math.min(yieldEvs[stat], room));
      evs[stat] = (evs[stat] || 0) + add;
      total += add;
    }
    return evs;
  }

  // FireRed's friendship changes (src/pokemon.c, AdjustFriendship and
  // sFriendshipEventDeltas): by how friendly it is now (under 100, under
  // 200, 200 and up). A level up (doubled here); a vitamin, PP Up or PP Max; an X item in
  // battle; a battle with a Gym Leader, the Elite Four or the Champion; a TM
  // or HM learned; every 250 steps (FireRed: 128, half the time; doubled here); fainting (worse against a
  // foe 30 levels higher).
  // (Level ups and walking count double here: FireRed's are 5/3/2 and 1.)
  const FRIENDSHIP_EVENTS = {
    levelUp: [10, 6, 4], vitamin: [5, 3, 2], battleItem: [1, 1, 0], leagueBattle: [3, 2, 1], tm: [1, 1, 0],
    walking: [2, 2, 2], massage: [3, 3, 3], faintSmall: [-1, -1, -1], faintOutsideBattle: [-5, -5, -10], faintLarge: [-5, -5, -10]
  };
  // -> the new friendship. `change`: an event above, or an item's own
  // [low, mid, high] (the bitter herbs lower it). opts: { item (held), ball,
  // metHere (it was met in the area you're in) }: a gain is half again with a
  // Soothe Bell, and one more each in a Luxury Ball or where it was met.
  function adjustFriendship(friendship, change, opts) {
    opts = opts || {};
    const table = typeof change === "string" ? FRIENDSHIP_EVENTS[change] : change;
    if (!table) return friendship;
    let delta = table[friendship >= 200 ? 2 : friendship >= 100 ? 1 : 0];
    if (delta > 0 && opts.item === "soothe-bell") delta = Math.floor(150 * delta / 100);
    let f = friendship + delta;
    if (delta > 0) {
      if (opts.ball === "luxury-ball") f++;
      if (opts.metHere) f++;
    }
    return Math.max(0, Math.min(MAX_FRIENDSHIP, f));
  }
  // Friendship gained from a level up.
  const friendshipFromLevelUp = (friendship, opts) => adjustFriendship(friendship, "levelUp", opts);

  window.Experience = {
    MAX_LEVEL, MAX_FRIENDSHIP, GROWTH,
    growthRate, expForLevel, levelForExp, progress, gain, addEvs, friendshipFromLevelUp,
    FRIENDSHIP_EVENTS, adjustFriendship
  };
})();
