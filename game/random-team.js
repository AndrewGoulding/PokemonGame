// Random team generator
// Depends on: window.DEX, window.MOVES, window.NATURES, window.LEARNSETS_GEN6
//
//   RandomTeam.team(3, { level: 50 })        // array of Battle team sets
//                                             // ({ maxGen: 6 } or { onlyGen: 7 }: from those generations)
//   RandomTeam.pokemon("Pikachu", 25)         // one set for a given species
//
// Pass { rng } (a function returning [0, 1)) to make the result repeatable.

(function () {
  "use strict";

  const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];

  // Base species only (formes like megas have ids above 10000), and only ones
  // with a learnset to pick moves from.
  // (opts.maxGen / opts.onlyGen: only species from those generations.)
  const eligible = {};
  function eligibleSpecies(opts) {
    const key = (opts.maxGen || "") + ":" + (opts.onlyGen || "");
    if (!eligible[key]) {
      eligible[key] = Object.keys(window.DEX).filter((name) => {
        const d = window.DEX[name];
        return d.id < 10000 && window.LEARNSETS_GEN6[name] && (!opts.maxGen || d.gen <= opts.maxGen) && (!opts.onlyGen || d.gen === opts.onlyGen);
      });
    }
    return eligible[key];
  }

  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  // Like the main games: the four most recent level-up moves at or below `level`,
  // swapping one in for the latest damaging move if all four are status moves.
  // `skip(move)`: moves left out, the earlier ones taking their places
  // (a Tera Raid boss's Explosion).
  function levelUpMoves(species, level, skip) {
    const learned = [];
    for (const [lvl, move] of window.LEARNSETS_GEN6[species].levelup) {
      if (lvl > level || !window.MOVES[move] || (skip && skip(move))) continue;
      const i = learned.indexOf(move);
      if (i >= 0) learned.splice(i, 1);
      learned.push(move);
    }
    const moves = learned.slice(-4);
    const isDamaging = (m) => window.MOVES[m].cat !== "Status";
    if (moves.length && !moves.some(isDamaging)) {
      const attack = learned.filter(isDamaging).pop();
      if (attack) moves[0] = attack;
    }
    return moves;
  }

  function pokemon(species, level, opts) {
    const rng = (opts && opts.rng) || Math.random;
    const dex = window.DEX[species];
    if (!dex) throw new Error("Unknown species: " + species);
    const ivs = {};
    for (const k of STAT_KEYS) ivs[k] = Math.floor(rng() * 32);
    return {
      species,
      level,
      nature: pick(Object.keys(window.NATURES), rng),
      ability: pick(dex.abilities, rng),
      ivs,
      moves: levelUpMoves(species, level)
    };
  }

  function team(size, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const level = opts.level || 50;
    const chosen = new Set();
    const out = [];
    while (out.length < size) {
      const species = pick(eligibleSpecies(opts), rng);
      if (chosen.has(species)) continue;
      const set = pokemon(species, level, { rng });
      if (!set.moves.length) continue;
      chosen.add(species);
      out.push(set);
    }
    return out;
  }

  window.RandomTeam = { team, pokemon, levelUpMoves };
})();
