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

  const M = () => window.Mining;
  window.Fishing = { RODS, XP, TIERS, SUPER_WEIGHTS, pickRod, encounter,
    get MAX_LEVEL() { return M().MAX_LEVEL; },
    level: (xp) => M().level(xp), toNext: (xp) => M().toNext(xp), progress: (xp) => M().progress(xp),
    tiers: (lv) => at(TIERS, lv), superWeights: (lv) => at(SUPER_WEIGHTS, lv) };
})();
