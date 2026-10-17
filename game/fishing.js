// Fishing levels (this game's own, in place of FireRed's Old, Good and Super
// Rods): there's one Fishing Rod, and your fishing level decides what bites.
//
// Every Pokémon hooked earns fishing XP, and levels go as mining's do
// (game/mining.js: 20 XP a level up to 20, then 40, 60, 80 and 100; level 100
// at 5,980 XP). Each map's fishing Pokémon are still FireRed's three rods'
// slots (Johto's, HeartGold and SoulSilver's); each bite comes from one of
// those rods, picked by your level (TIERS): only the Old Rod's at first, the
// Good Rod's from level 10, the Super Rod's from 25, and the better rods more
// often as you go up. From level 50 the Super Rod's rarer slots come up more
// often too (SUPER_WEIGHTS). Its XP goes by the rod it came from (XP).
//
//   const mon = Fishing.encounter("Route12", Fishing.level(xp));   // -> { species, level, slot, rod, xp } or null
//   Fishing.level(xp), Fishing.toNext(xp), Fishing.progress(xp)
(function () {
  const RODS = ["old-rod", "good-rod", "super-rod"];
  const XP = { "old-rod": 10, "good-rod": 15, "super-rod": 20 };
  // [from level, percent for the Old, Good and Super Rods' slots]
  const TIERS = [[1, [100, 0, 0]], [10, [60, 40, 0]], [25, [30, 40, 30]], [50, [15, 35, 50]], [75, [5, 25, 70]]];
  // The Super Rod's five slots (FireRed's 40, 40, 15, 4, 1), by level.
  const SUPER_WEIGHTS = [[1, [40, 40, 15, 4, 1]], [50, [35, 35, 20, 7, 3]], [75, [30, 30, 25, 10, 5]]];
  const at = (table, lv) => table.filter(([from]) => (lv || 1) >= from).pop()[1];

  // Which rod's slots a bite comes from at level `lv`.
  function pickRod(lv, rng) {
    const w = at(TIERS, lv);
    let roll = Math.floor((rng || Math.random)() * 100), k = 0;
    while (k < RODS.length - 1 && roll >= w[k]) roll -= w[k++];
    return RODS[k];
  }
  // A bite in `mapName` at level `lv` (a rod with nothing there falls back to
  // the one below), or null if nothing can be fished there.
  function encounter(mapName, lv, rng) {
    rng = rng || Math.random;
    for (let i = RODS.indexOf(pickRod(lv, rng)); i >= 0; i--) {
      const rod = RODS[i];
      const mon = window.World.fishingEncounter(mapName, rod, rng, rod === "super-rod" ? at(SUPER_WEIGHTS, lv) : null);
      if (mon) return Object.assign(mon, { rod, xp: XP[rod] });
    }
    return null;
  }

  // Fishing level, 1 to 100, from fishing XP: going from level L to L + 1
  // takes 20 x (1 + floor(L / 20)) XP (20 each up to level 20, then 40, 60,
  // 80 and 100; 5,980 in all for level 100). LEVELS[L - 1] is level L's XP.
  const MAX_LEVEL = 100;
  const LEVELS = [0];
  for (let L = 1; L < MAX_LEVEL; L++) LEVELS.push(LEVELS[L - 1] + 20 * (1 + Math.floor(L / 20)));
  const level = (xp) => LEVELS.filter((n) => (xp | 0) >= n).length;
  const toNext = (xp) => (level(xp) >= MAX_LEVEL ? null : LEVELS[level(xp)] - (xp | 0));
  function progress(xp) {
    const lv = level(xp);
    if (lv >= MAX_LEVEL) return { level: lv, into: 0, need: 0 };
    return { level: lv, into: (xp | 0) - LEVELS[lv - 1], need: LEVELS[lv] - LEVELS[lv - 1] };
  }
  window.Fishing = { RODS, XP, TIERS, SUPER_WEIGHTS, pickRod, encounter, MAX_LEVEL, LEVELS, level, toNext, progress,
    tiers: (lv) => at(TIERS, lv), superWeights: (lv) => at(SUPER_WEIGHTS, lv) };
})();
