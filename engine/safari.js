// The Safari Game: FireRed's src/safari_zone.c and the Safari Zone's parts of
// battle_main.c (HandleAction_ThrowBait / _ThrowRock / _WatchesCarefully),
// battle_script_commands.c (Cmd_handleballthrow) and battle_ai_script_commands.c
// (Cmd_if_random_safari_flee).
// Depends on: window.DEX (dex.js)
//
//   Safari.ENTRY_FEE, Safari.BALLS, Safari.STEPS      // ₽500, 30 Safari Balls, 600 steps
//   const s = Safari.encounter("Chansey")             // a Safari battle's state
//   Safari.flees(s, rng)        // the wild Pokémon's choice this turn: run (true) or watch
//   Safari.throwBait(s, rng)    // catching harder, fleeing less likely, for 2-6 turns
//   Safari.throwRock(s, rng)    // catching easier, fleeing more likely, for 2-6 turns
//   Safari.watch(s)             // its turn after yours: "watching" | "angry" | "eating"
//   Safari.attempt(s, { hp, maxhp, status }, rng)   // a Safari Ball: { caught, shakes 0-4 }
//
// All the arithmetic is FireRed's, in whole numbers as the GBA does it. A
// species' catch factor is its catch rate x 100 / 1275 (0-20), its escape
// factor its Safari flee rate x 100 / 1275 (at least 2).
//
// Or HeartGold and SoulSilver's (Johto's Safari Zone, ui/johto-safari.js:
// Safari.encounter(species, { hgss: true })): Bait and Mud move two stages,
// 0-12 from 6 (src/battle/battle_controller_player.c's SafariThrowMud and
// SafariRun, as pret names them): Bait makes it less likely to flee and,
// nine times in ten, harder to catch; Mud easier to catch and, nine times in
// ten, likelier to flee. Its catch rate is scaled by its stage
// (sSafariCatchRateStages, 10/40 to 40/10), and each turn it flees if
// Random() % 255 <= its flee rate (HGSS's greatMarshRate:
// window.JOHTO_SAFARI.flee) scaled by the other stage. It watches carefully
// every turn it stays.

(function () {
  "use strict";

  const ENTRY_FEE = 500, BALLS = 30, STEPS = 600;

  // gSpeciesInfo[].safariZoneFleeRate (src/data/pokemon/species_info.h): the
  // Pokémon FireRed gives one (the rest have 0, an escape factor of 2).
  const FLEE_RATES = {
    "Nidoran-F": 50, "Nidorina": 75, "Nidoran-M": 50, "Nidorino": 75, "Paras": 50, "Parasect": 75,
    "Venonat": 50, "Venomoth": 75, "Psyduck": 50, "Poliwag": 50, "Slowpoke": 50, "Doduo": 50,
    "Exeggcute": 75, "Rhyhorn": 75, "Chansey": 125, "Kangaskhan": 125, "Goldeen": 50, "Seaking": 75,
    "Scyther": 125, "Pinsir": 125, "Tauros": 125, "Magikarp": 25, "Dratini": 100, "Dragonair": 125
  };

  const catchRateOf = (species) => (window.DEX[species] ? window.DEX[species].captureRate : 45);
  const baseCatchFactor = (species) => Math.floor(catchRateOf(species) * 100 / 1275);
  // (Random() % 5 + 2: 2 to 6.)
  const turns = (rng) => (Math.floor(rng() * 65536) % 5) + 2;

  // HGSS's stages: [numerator, denominator], 0 to 12.
  const HGSS_STAGES = [[10, 40], [10, 35], [10, 30], [10, 25], [10, 20], [10, 15], [10, 10], [15, 10], [20, 10], [25, 10], [30, 10], [35, 10], [40, 10]];
  const stageOf = (n, k) => Math.floor(HGSS_STAGES[k][0] * n / HGSS_STAGES[k][1]);
  const hgssFleeRate = (species) => (window.JOHTO_SAFARI && window.JOHTO_SAFARI.flee[species]) || 0;

  // A Safari battle starting (BattleStartClearSetData; HGSS's: both stages 6).
  function encounter(species, opts) {
    if (opts && opts.hgss) return { species, hgss: true, catchStage: 6, fleeStage: 6, fleeRate: hgssFleeRate(species) };
    const escape = Math.floor((FLEE_RATES[species] || 0) * 100 / 1275);
    return { species, catchFactor: baseCatchFactor(species), escapeFactor: escape <= 1 ? 2 : escape, bait: 0, rock: 0 };
  }

  // The chance, in percent, that it runs this turn (Cmd_if_random_safari_flee):
  // its escape factor, doubled while it's angry (at most 20), a quarter while
  // it's eating (at least 1), times 5.
  function fleeChance(s) {
    let rate;
    if (s.rock) rate = Math.min(20, s.escapeFactor * 2);
    else if (s.bait) rate = Math.max(1, Math.floor(s.escapeFactor / 4));
    else rate = s.escapeFactor;
    return (rate * 5) & 0xff;
  }
  // (u8)(Random() % 100) < the chance.
  // (HGSS's: Random() % 255 <= its flee rate at its stage.)
  const flees = (s, rng) => (s.hgss ? Math.floor(rng() * 65536) % 255 <= stageOf(s.fleeRate, s.fleeStage)
    : Math.floor(rng() * 65536) % 100 < fleeChance(s));

  // HandleAction_ThrowBait: eating for 2-6 more turns (at most 6), no longer
  // angry, and its catch factor halved (but never under 3).
  // (HGSS's: less likely to flee, and harder to catch unless Random() % 10 is
  // 0, when it's "busy eating" instead: "eating" or "busy".)
  function throwBait(s, rng) {
    if (s.hgss) {
      const busy = Math.floor(rng() * 65536) % 10 === 0;
      if (s.fleeStage > 0) s.fleeStage--;
      if (!busy && s.catchStage > 0) s.catchStage--;
      return busy ? "busy" : "eating";
    }
    s.bait = Math.min(6, s.bait + turns(rng));
    s.rock = 0;
    s.catchFactor >>= 1;
    if (s.catchFactor <= 2) s.catchFactor = 3;
  }
  // HandleAction_ThrowRock: angry for 2-6 more turns (at most 6), no longer
  // eating, and its catch factor doubled (at most 20).
  // (HGSS's Mud: easier to catch, and likelier to flee unless Random() % 10 is
  // 0, when it's "beside itself with anger" instead: "angry" or "furious".)
  function throwRock(s, rng) {
    if (s.hgss) {
      const furious = Math.floor(rng() * 65536) % 10 === 0;
      if (s.catchStage < 12) s.catchStage++;
      if (!furious && s.fleeStage < 12) s.fleeStage++;
      return furious ? "furious" : "angry";
    }
    s.rock = Math.min(6, s.rock + turns(rng));
    s.bait = 0;
    s.catchFactor = Math.min(20, s.catchFactor << 1);
  }
  // HandleAction_WatchesCarefully: a turn of anger or eating wears off. When
  // the anger's gone its catch factor is its own again (the bait's halving
  // isn't undone).
  function watch(s) {
    if (s.hgss) return "watching";
    if (s.rock) {
      if (--s.rock === 0) { s.catchFactor = baseCatchFactor(s.species); return "watching"; }
      return "angry";
    }
    if (s.bait) return --s.bait === 0 ? "watching" : "eating";
    return "watching";
  }

  // Cmd_handleballthrow with a Safari Ball (x1.5): the odds out of 255, from
  // the catch factor, HP and status.
  // (HGSS's: its catch rate at its stage.)
  function odds(s, target) {
    const catchRate = s.hgss ? stageOf(catchRateOf(s.species), s.catchStage) : Math.floor(s.catchFactor * 1275 / 100) & 0xff;
    const m = target.maxhp, h = Math.max(1, target.hp);
    let a = Math.floor(Math.floor(catchRate * 15 / 10) * (m * 3 - h * 2) / (3 * m));
    if (target.status === "slp" || target.status === "frz") a *= 2;
    else if (["psn", "tox", "brn", "par"].includes(target.status)) a = Math.floor(a * 15 / 10);
    return a;
  }
  // Over 254 is caught; otherwise four shakes, each Random() < 1048560 /
  // sqrt(sqrt(16711680 / odds)), and all four is caught.
  function shakeOdds(a) {
    if (a <= 0) return 0;
    return Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  }
  function chance(s, target) {
    const a = odds(s, target);
    return a > 254 ? 1 : Math.pow(Math.min(65536, shakeOdds(a)) / 65536, 4);
  }
  function attempt(s, target, rng) {
    const a = odds(s, target);
    if (a > 254) return { caught: true, shakes: 4 };
    const b = shakeOdds(a);
    let shakes = 0;
    while (shakes < 4 && Math.floor(rng() * 65536) < b) shakes++;
    return { caught: shakes === 4, shakes };
  }

  window.Safari = { ENTRY_FEE, BALLS, STEPS, FLEE_RATES, encounter, baseCatchFactor, fleeChance, flees, throwBait, throwRock, watch,
    odds, shakeOdds, chance, attempt, HGSS_STAGES };
})();
