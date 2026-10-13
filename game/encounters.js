// Wild Pokémon and trainers, scaled to the player's party
// Depends on: window.DEX, window.EVOLUTIONS, window.LEARNSETS_GEN6, window.Party
//
//   Encounters.wild(partyLevel)       // -> a party record for a wild Pokémon
//   Encounters.trainer(partyLevel)    // -> { name, team: [records] }
//
// A species can appear from its "minimum level": 1 for a base form, its
// evolution level for level-up evolutions, the same as its pre-evolution for
// friendship evolutions (so Pikachu shows up as early as Pichu), and 20 levels
// later for stone, trade and other evolutions. Legendary and mythical Pokémon
// never appear.

(function () {
  "use strict";

  const LEGENDARY_EGG_STEPS = 20480;   // every legendary and mythical has at least this
  const LATE_EVOLUTION_GAP = 20;
  const TRAINER_NAMES = [
    "Youngster Ben", "Lass Amy", "Bug Catcher Rick", "Hiker Doug", "Fisherman Ned",
    "Picnicker Rosa", "Camper Leo", "Ace Trainer Vera", "Swimmer Kai", "Psychic Iris"
  ];

  let minLevels = null;

  function buildMinLevels() {
    const prevo = {};
    for (const [from, list] of Object.entries(window.EVOLUTIONS)) {
      for (const e of list) if (!prevo[e.into]) prevo[e.into] = { from, e };
    }
    const memo = {};
    const minLevel = (species) => {
      if (memo[species] != null) return memo[species];
      const p = prevo[species];
      let lvl = 1;
      if (p) {
        const base = minLevel(p.from);
        if (p.e.method === "level" || p.e.method === "shed") lvl = Math.max(base, p.e.level || 1);
        else if (p.e.method === "friendship") lvl = base;
        else lvl = base + LATE_EVOLUTION_GAP;
      }
      return (memo[species] = lvl);
    };
    const out = {};
    for (const [name, dex] of Object.entries(window.DEX)) {
      if (dex.id >= 10000 || dex.baseEggSteps >= LEGENDARY_EGG_STEPS) continue;
      if (!window.LEARNSETS_GEN6[name]) continue;
      out[name] = minLevel(name);
    }
    return out;
  }

  // Species that can appear at `level`.
  function speciesFor(level) {
    if (!minLevels) minLevels = buildMinLevels();
    return Object.keys(minLevels).filter((s) => minLevels[s] <= level);
  }

  const clampLevel = (n) => Math.max(2, Math.min(100, n));
  const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  // A wild Pokémon a little below the party's level.
  function wild(partyLevel, rng) {
    rng = rng || Math.random;
    const level = clampLevel(partyLevel - randInt(rng, 0, 3));
    return window.Party.create(pick(speciesFor(level), rng), level, { rng });
  }

  // A trainer with 1-3 Pokémon around the party's level.
  function trainer(partyLevel, rng) {
    rng = rng || Math.random;
    const size = randInt(rng, 1, 3);
    const team = [];
    while (team.length < size) {
      const level = clampLevel(partyLevel + randInt(rng, -2, 0));
      const species = pick(speciesFor(level), rng);
      if (team.some((r) => r.species === species)) continue;
      team.push(window.Party.create(species, level, { rng }));
    }
    return { name: pick(TRAINER_NAMES, rng), team };
  }

  window.Encounters = { speciesFor, wild, trainer, minLevel: (s) => (minLevels || (minLevels = buildMinLevels()))[s] };
})();
