// Wild Pokémon and trainers, scaled to the player's party
// Depends on: window.DEX, window.EVOLUTIONS, window.LEARNSETS_GEN6, window.Party
//
//   Encounters.wild(partyLevel)       // -> a party record for a wild Pokémon
//   Encounters.trainer(partyLevel)    // -> { name, team: [records] }
//   Encounters.withHeldItem(record, lead)   // a wild Pokémon holding what it rolls (data/wild-items.js)
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
      // Alternate formes only when something evolves into them (Wormadam's cloaks).
      if ((dex.id >= 10000 && !prevo[name]) || dex.baseEggSteps >= LEGENDARY_EGG_STEPS) continue;
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

  // What a wild Pokémon is holding (data/wild-items.js: FireRed's, else
  // Emerald's): as SetWildMonHeldItem, 45% nothing, 50% the common item and
  // 5% the rare one; with a lead Pokémon with Compound Eyes (as in Emerald),
  // 20% nothing, 60% common and 20% rare; both the same item, always that.
  // -> an item id, or "".
  function heldItem(species, rng, compoundEyes) {
    const items = (window.WILD_ITEMS || {})[species];
    if (!items) return "";
    const [common, rare] = items;
    if (common === rare) return common || "";
    const r = Math.floor((rng || Math.random)() * 100);
    const none = compoundEyes ? 20 : 45, notRare = compoundEyes ? 80 : 95;
    return (r < none ? "" : r < notRare ? common : rare) || "";
  }
  // A wild Pokémon's record, holding what it rolls (`lead`: your lead Pokémon's record, for Compound Eyes).
  function withHeldItem(record, lead, rng) {
    record.item = heldItem(record.species, rng, !!lead && lead.ability === "Compound Eyes");
    return record;
  }

  window.Encounters = { speciesFor, wild, trainer, heldItem, withHeldItem, minLevel: (s) => (minLevels || (minLevels = buildMinLevels()))[s] };
})();
