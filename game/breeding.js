// Breeding and Eggs (headless; ui/game.js uses these).
// Depends on: window.BREEDING (data/breeding.js), window.DEX, window.LEARNSETS_GEN6,
//             window.MOVES, window.Party, window.Experience
//
// FireRed's Day-Care (src/daycare.c) decides when an Egg turns up and when
// one hatches; what is in the Egg follows Gen 6's rules, as the battles do.
//
//   Breeding.compatibility(a, b)    0, 20, 50 or 70 (GetDaycareCompatibilityScore)
//   Breeding.compatibilityText(n)   what the Day-Care Man says about it
//   Breeding.makeEgg(a, b, opts)    -> an Egg record (opts: { rng, map })
//   Breeding.dayCareStep(state, list, rng)   once a step: true when an Egg
//                                   turns up (state.eggWaiting is set)
//   Breeding.hatchStep(state, party) once a step: the Egg that hatches now, or null
//   Breeding.hatch(egg, map)        turns the record into the Pokémon
//   Breeding.eggWatch(egg)          the Summary's Egg Watch text
//
// An Egg is a party record with `egg: true` and `eggCycles` (how many
// 255-step cycles until it hatches, from the species' Egg steps); it can't
// battle, use items or learn moves, and isn't in the Pokédex until it hatches.
(function () {
  "use strict";

  const B = () => window.BREEDING;
  const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
  const POWER_ITEMS = { "power-weight": "hp", "power-bracer": "atk", "power-belt": "def",
    "power-lens": "spa", "power-band": "spd", "power-anklet": "spe" };
  const CYCLE_STEPS = 255;   // (FireRed's daycare stepCounter)
  const NO_BALL = ["master-ball", "cherish-ball"];

  const groups = (r) => (B().GROUPS[r.species] || ["Undiscovered"]);
  const isDitto = (r) => r.species === "Ditto";
  const otOf = (r) => (r.ot ? r.ot.name + "#" + r.ot.id : "you");
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  // GetDaycareCompatibilityScore: 0 (no Eggs), 20, 50 or 70 percent a check.
  function compatibility(a, b) {
    if (!a || !b || a.egg || b.egg) return 0;
    if (groups(a).includes("Undiscovered") || groups(b).includes("Undiscovered")) return 0;
    if (isDitto(a) && isDitto(b)) return 0;
    const sameOt = otOf(a) === otOf(b);
    if (isDitto(a) || isDitto(b)) return sameOt ? 20 : 50;
    if (a.gender === b.gender || a.gender === "N" || b.gender === "N") return 0;
    if (!groups(a).some((g) => groups(b).includes(g))) return 0;
    if (a.species === b.species) return sameOt ? 50 : 70;
    return sameOt ? 20 : 50;
  }
  function compatibilityText(n) {
    return n >= 70 ? "The two seem to get along\nvery well." : n >= 50 ? "The two seem to get along."
      : n >= 20 ? "The two don't seem to like\neach other much." : "The two prefer to play with other\nPOKéMON than each other.";
  }

  // The parent whose species the Egg is (the mother, or the one that isn't Ditto).
  function motherOf(a, b) {
    if (isDitto(a)) return b;
    if (isDitto(b)) return a;
    return a.gender === "F" ? a : b;
  }

  function eggSpecies(mother, father, rng) {
    // An Egg always hatches into its family's first form (Gen 9 on: no
    // incense needed for Happiny, Azurill, Munchlax and the other babies).
    const H = B().HATCHES;
    let species = H[mother.species] || mother.species;
    for (let i = 0; i < 4 && H[species] && H[species] !== species; i++) species = H[species];
    // Gen 5 on: Nidoran♀'s and Illumise's Eggs can be either of the pair.
    if (species === "Nidoran-F" && rng() < 0.5) species = "Nidoran-M";
    if (species === "Illumise" && rng() < 0.5) species = "Volbeat";
    if (species === "Manaphy") species = "Phione";
    const baby = B().INCENSE[species] || B().INCENSE[mother.species];
    if (baby) species = baby.baby;
    return species;
  }

  // Up to four moves: its level-up moves at its level, then the Egg moves
  // either parent knows, then level-up moves both parents know (Gen 6; Volt
  // Tackle for a Pichu when a parent holds a Light Ball). The oldest goes
  // when there's no room.
  function eggMoves(species, level, mother, father) {
    const ls = window.LEARNSETS_GEN6[species] || { levelup: [], egg: [] };
    const moves = [];
    const add = (m) => {
      if (!window.MOVES[m] || moves.includes(m)) return;
      if (moves.length >= 4) moves.shift();
      moves.push(m);
    };
    for (const [lvl, m] of ls.levelup) if (lvl <= level) add(m);
    const known = (r) => r.moves.map((m) => m.name);
    for (const r of [father, mother]) for (const m of known(r)) if ((ls.egg || []).includes(m)) add(m);
    const levelup = new Set(ls.levelup.map(([, m]) => m));
    for (const m of known(father)) if (known(mother).includes(m) && levelup.has(m)) add(m);
    if (species === "Pichu" && (mother.item === "light-ball" || father.item === "light-ball")) add("Volt Tackle");
    return moves;
  }

  function makeEgg(a, b, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const mother = motherOf(a, b), father = mother === a ? b : a;
    const species = eggSpecies(mother, father, rng);
    const level = 1;
    const egg = window.Party.create(species, level, { rng, moves: eggMoves(species, level, mother, father) });
    // Nature: an Everstone passes its holder's on (either's, if both hold one).
    const stones = [a, b].filter((r) => r.item === "everstone");
    if (stones.length) egg.nature = pick(stones, rng).nature;
    // IVs: three stats (five with a Destiny Knot) from one parent or the
    // other; a Power item passes on its stat first (one of them, if both do).
    const count = a.item === "destiny-knot" || b.item === "destiny-knot" ? 5 : 3;
    const chosen = [];
    const powered = [a, b].filter((r) => POWER_ITEMS[r.item]);
    if (powered.length) {
      const r = pick(powered, rng), k = POWER_ITEMS[r.item];
      egg.ivs[k] = r.ivs[k] | 0;
      chosen.push(k);
    }
    while (chosen.length < count) {
      const k = pick(STAT_KEYS.filter((s) => !chosen.includes(s)), rng);
      egg.ivs[k] = pick([a, b], rng).ivs[k] | 0;
      chosen.push(k);
    }
    // Ability: the mother's Hidden Ability 60% of the time; otherwise the
    // same slot as hers 80% of the time (Ditto's partner's, but never its
    // Hidden Ability unless it's female).
    const dex = window.DEX[species], abilities = dex.abilities || [];
    const mdex = window.DEX[mother.species] || {};
    const motherHidden = mdex.hiddenAbility && mother.ability === mdex.hiddenAbility && !(abilities.includes(mother.ability));
    if (motherHidden && dex.hiddenAbility && mother.gender === "F" && rng() < 0.6) egg.ability = dex.hiddenAbility;
    else {
      const slot = (mdex.abilities || []).indexOf(mother.ability);
      egg.ability = slot >= 0 && abilities[slot] && rng() < 0.8 ? abilities[slot] : pick(abilities, rng);
    }
    // The Poké Ball: the mother's (a male or genderless Pokémon with Ditto: a Poké Ball).
    egg.ball = mother.gender === "F" && !NO_BALL.includes(mother.ball) && mother.ball ? mother.ball : "poke-ball";
    egg.egg = true;
    egg.eggCycles = Math.max(1, Math.round(((dex.baseEggSteps || 5120)) / 256));
    egg.happiness = 0;
    egg.nickname = null;
    egg.met = { level: 0, map: opts.map || null, egg: true };
    return egg;
  }

  // An Egg someone gives you (FireRed's giveegg): the species' own level-up
  // moves at Lv. 1, nothing inherited. opts: { rng, map, from }
  function giftEgg(species, opts) {
    opts = opts || {};
    const egg = window.Party.create(species, 1, { rng: opts.rng, moves: eggMoves(species, 1, { moves: [] }, { moves: [] }) });
    egg.egg = true;
    egg.eggCycles = Math.max(1, Math.round((window.DEX[species].baseEggSteps || 5120) / 256));
    egg.happiness = 0;
    egg.met = { level: 0, map: opts.map || null, egg: true, from: opts.from };
    return egg;
  }

  // The Day-Care's step (FireRed's DoEggActions): every 256th step with two
  // Pokémon there and no Egg waiting, `compatibility` percent of the time an
  // Egg turns up. state: { steps, eggWaiting } (player.flags.dayCareEggs).
  function dayCareStep(state, list, rng) {
    rng = rng || Math.random;
    state.steps = ((state.steps | 0) + 1) & 0xff;
    if (state.eggWaiting || !list || list.length < 2 || state.steps !== 0xff) return false;
    const c = compatibility(list[0].mon, list[1].mon);
    if (c > Math.floor(rng() * 100)) { state.eggWaiting = true; return true; }
    return false;
  }

  // Hatching (FireRed's _DoEggActions_CheckHatch): every 255 steps each Egg
  // in the party is a cycle nearer (two with a Pokémon whose Ability is Flame
  // Body or Magma Armor in the party); one with none left hatches.
  // state: { hatchSteps }.
  function hatchStep(state, party) {
    if (!party.some((r) => r.egg)) return null;
    state.hatchSteps = (state.hatchSteps | 0) + 1;
    if (state.hatchSteps < CYCLE_STEPS) return null;
    state.hatchSteps = 0;
    // (Flame Body, Magma Armor and, since Sword and Shield, Steam Engine: Eggs hatch twice as fast.)
    const fast = party.some((r) => !r.egg && ["Flame Body", "Magma Armor", "Steam Engine"].includes(r.ability));
    for (const r of party) {
      if (!r.egg) continue;
      if ((r.eggCycles | 0) <= 0) return r;
      r.eggCycles = Math.max(0, (r.eggCycles | 0) - (fast ? 2 : 1));
    }
    return null;
  }

  // The Egg hatches: a Pokémon at Lv. 1 (Gen 4 on), friendship 120 (as
  // FireRed's are when they hatch), met where it hatched.
  function hatch(egg, map) {
    delete egg.egg;
    delete egg.eggCycles;
    egg.happiness = 120;
    egg.met = { level: 1, map: map || null, hatched: true };
    egg.hp = window.Party.maxHp(egg);
    return egg;
  }

  // FireRed's Egg Watch (the Summary screen's EGG page): by cycles left
  // (sEggHatchTimeTexts), and where it came from (the EggOrigin texts).
  function eggWatch(egg) {
    const c = egg.eggCycles | 0;
    if (c <= 5) return "It's making sounds.\nIt's almost ready\nto hatch!";
    if (c <= 10) return "It occasionally\nmoves. It should\nhatch soon.";
    if (c <= 40) return "What will hatch\nfrom this? It will\ntake some time.";
    return "It looks like this\nEgg will take a\nlong time to hatch.";
  }
  function eggOrigin(egg) {
    const from = egg.met && egg.met.from;
    if (from === "traveling-man") return "An odd Pokémon Egg obtained from\nthe traveling man.";
    return "An odd Pokémon Egg found by the\nDAY-CARE couple.";
  }

  window.Breeding = { compatibility, compatibilityText, motherOf, eggSpecies, eggMoves, makeEgg, giftEgg, dayCareStep, hatchStep, hatch, eggWatch, eggOrigin, CYCLE_STEPS };
})();
