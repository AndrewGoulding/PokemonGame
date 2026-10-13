// Opponent AI: picks the move that is expected to deal the most damage.
// Depends on: window.MOVES, window.Damage, window.Battle
//
//   const choice = OpponentAI.choose(battle, "p2");
//   battle.choose("p2", choice);
//
// Move choice: every usable move is scored with the damage calculator (average
// roll x expected hits x accuracy), capped at the target's remaining HP so a
// sure KO beats a stronger move that might miss. Moves that would fail or cost
// a turn are marked down. If nothing does damage, it uses a random status move.
// Switch choice (after a faint): the Pokémon with the best matchup against the
// current foe. The AI never switches by choice.

(function () {
  "use strict";

  // Gen 5+ odds for 2-5 hit moves: 2 and 3 hits 35% each, 4 and 5 hits 15% each.
  const AVG_2_TO_5_HITS = 3.1;
  const MAX_STAGE = 6;

  function fieldFor(battle, defender) {
    const conds = defender.side.conditions;
    return {
      weather: battle.getWeather(), terrain: battle.field.terrain, gravity: !!battle.field.pseudo.gravity,
      isDoubles: false, reflect: !!conds.reflect, lightScreen: !!conds.lightscreen
    };
  }

  function expectedHits(data, attacker) {
    if (typeof data.multihit === "number") return data.multihit;
    if (Array.isArray(data.multihit)) return attacker.ability === "Skill Link" ? data.multihit[1] : AVG_2_TO_5_HITS;
    return 1;
  }

  // Average damage of one use of the move, before accuracy. 0 for status moves
  // and for anything the calculator can't handle.
  function expectedDamage(battle, attacker, defender, moveName) {
    const data = window.MOVES[moveName];
    if (!data || data.cat === "Status") return 0;
    let r;
    try { r = window.Damage.calc(attacker, defender, moveName, fieldFor(battle, defender), {}); }
    catch (e) { return 0; }
    const perHit = r.damage.reduce((sum, d) => sum + d, 0) / r.damage.length;
    return perHit * expectedHits(data, attacker);
  }

  function hitChance(data, attacker, defender) {
    if (data.acc == null) return 1; // never misses
    if (attacker.ability === "No Guard" || defender.ability === "No Guard") return 1;
    const stage = Math.max(-MAX_STAGE, Math.min(MAX_STAGE,
      (attacker.boosts.accuracy || 0) - (defender.boosts.evasion || 0)));
    const mult = stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
    return Math.min(1, (data.acc / 100) * mult);
  }

  // How good is this move right now? Roughly "expected HP removed from the foe".
  function scoreMove(battle, attacker, defender, moveName) {
    const data = window.MOVES[moveName];
    const id = moveName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Moves that would simply fail.
    if (id === "fakeout" && attacker.activeTurns > 0) return 0;
    if (id === "dreameater" && defender.status !== "slp") return 0;
    if ((id === "snore" || id === "sleeptalk") && attacker.status !== "slp") return 0;

    const damage = expectedDamage(battle, attacker, defender, moveName);
    if (damage <= 0) return 0;
    const kos = damage >= defender.hp;
    let score = Math.min(damage, defender.hp) * hitChance(data, attacker, defender);

    // Moves that cost an extra turn or put the user at risk.
    const sunny = /SunnyDay|DesolateLand/.test(battle.getWeather());
    if (data.flags.charge && !(id === "solarbeam" && sunny) && attacker.item !== "power-herb") score *= 0.5;
    if (data.flags.recharge && !kos) score *= 0.5;
    if (id === "focuspunch") score *= 0.5;
    if (data.selfdestruct === "always") {
      if (attacker.side.remaining === 1) return 0;           // exploding would lose the battle
      if (attacker.hp / attacker.maxhp > 0.25) score *= 0.3; // save it for when the user is nearly out
    }
    return score;
  }

  function bestDamage(battle, attacker, defender) {
    let best = 0;
    for (const m of attacker.moves) {
      if (m.pp > 0) best = Math.max(best, expectedDamage(battle, attacker, defender, m.name));
    }
    return best;
  }

  // Positive when `mon` hurts the foe more (as a share of HP) than the foe hurts it.
  function matchup(battle, mon, foe) {
    if (!foe || foe.fainted) return mon.hp / mon.maxhp;
    const dealt = Math.min(1, bestDamage(battle, mon, foe) / foe.hp);
    const taken = Math.min(1, bestDamage(battle, foe, mon) / mon.hp);
    return dealt - taken / 2;
  }

  function choose(battle, sideId, rng) {
    rng = rng || Math.random;
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const req = battle.getRequest(sideId);
    const side = battle.sides[sideId];

    if (req.phase === "switch") {
      let best = req.switches[0], bestScore = -Infinity;
      for (const i of req.switches) {
        const s = matchup(battle, side.pokemon[i], side.foe.active);
        if (s > bestScore) { best = i; bestScore = s; }
      }
      return { type: "switch", index: best };
    }
    if (req.phase !== "move") return null;
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };

    const usable = req.active.moves.filter((m) => !m.disabled);
    const attacker = side.active;
    const defender = side.foe.active;
    let best = null, bestScore = 0;
    for (const m of usable) {
      const s = scoreMove(battle, attacker, defender, m.name);
      if (s > bestScore) { best = m; bestScore = s; }
    }
    if (!best) {
      const status = usable.filter((m) => m.category === "Status");
      best = pick(status.length ? status : usable);
    }
    const choice = { type: "move", move: best.index };
    if (req.active.canMega) choice.mega = true;
    return choice;
  }

  window.OpponentAI = { choose, scoreMove, expectedDamage };
})();
