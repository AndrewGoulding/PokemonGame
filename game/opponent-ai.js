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
//
// Doubles (battle.format "doubles"): OpponentAI.choose(battle, id) answers for
// every slot the controller id ("p1"/"p2", or "p1b"/"p2b" for a tag partner)
// must fill, as an array indexed by slot. Each slot scores its moves against
// each foe and aims single-target attacks at the foe it hurts most (never at
// its ally); spread moves add up what they do to every foe (0.75x each with
// more than one target), and Earthquake-style moves lose what they would do
// to the ally (and a lot more if it would knock the ally out). Replacements
// go by the best average matchup against the foes still standing.

(function () {
  "use strict";

  // Gen 5+ odds for 2-5 hit moves: 2 and 3 hits 35% each, 4 and 5 hits 15% each.
  const AVG_2_TO_5_HITS = 3.1;
  const MAX_STAGE = 6;

  function fieldFor(battle, defender) {
    const conds = defender.side.conditions;
    return {
      weather: battle.getWeather(), terrain: battle.field.terrain, gravity: !!battle.field.pseudo.gravity,
      isDoubles: !!battle.doubles, reflect: !!conds.reflect, lightScreen: !!conds.lightscreen
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
    try { r = window.Damage.calc(attacker, defender, moveName, fieldFor(battle, defender), battle.doubles ? { targets: 1 } : {}); }
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

  const SPREAD = ["allAdjacentFoes", "allAdjacent"];
  const SINGLE = ["normal", "any", "adjacentFoe"];

  // Revival Blessing: back comes the strongest of those that fainted (highest level, then base stat total).
  // When to Terastallize: a trainer with an ace (teraAce) Terastallizes it as
  // soon as it's out, and no one else; otherwise for a damaging move of its
  // Tera Type (or Tera Blast), or with its last Pokémon (`last`).
  function teraNow(battle, side, mon, a, move, last) {
    if (side.pokemon.some((p) => p.teraAce)) return !!mon.teraAce;
    return last || teraFits(battle, a, move);
  }
  // (A damaging move of its Tera Type, or Tera Blast.)
  function teraFits(battle, a, move) {
    if (!move || move.category === "Status") return false;
    return move.name === "Tera Blast" || (window.MOVES[move.name] || {}).type === a.teraType;
  }
  function chooseRevive(battle, req) {
    const team = req.team;
    const score = (i) => { const d = window.DEX[team[i].species] || {}; return team[i].level * 1000 + ((d.hp + d.atk + d.def + d.spa + d.spd + d.spe) || 0); };
    return { type: "revive", index: req.revives.slice().sort((a, b) => score(b) - score(a))[0] };
  }

  function chooseDoubles(battle, id, rng) {
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const req = battle.getRequest(id);
    if (!req) return null;
    if (req.phase === "revive") return chooseRevive(battle, req);
    const side = battle.sides[id.slice(0, 2)];
    const out = [];
    if (req.phase === "switch") {
      const pool = req.switches.slice();
      const foes = side.foe.actives.filter((m) => m && !m.fainted);
      req.forceSwitch.forEach((f, slot) => {
        if (!f || !pool.length) return;
        let best = pool[0], bestScore = -Infinity;
        for (const i of pool) {
          const mon = side.pokemon[i];
          const s = foes.length ? foes.reduce((sum, foe) => sum + matchup(battle, mon, foe), 0) / foes.length : mon.hp / mon.maxhp;
          if (s > bestScore) { best = i; bestScore = s; }
        }
        pool.splice(pool.indexOf(best), 1);
        out[slot] = { type: "switch", index: best };
      });
      return out;
    }
    if (req.phase !== "move") return null;
    let mega = false, zmove = false, tera = !side.tag && (side.partial || []).some((c) => c && c.tera);
    req.actives.forEach((a, slot) => {
      if (!a) return;
      if (a.forced) { out[slot] = { type: "move", move: 0 }; return; }
      if (a.struggle) { out[slot] = { type: "move", move: "Struggle" }; return; }
      const attacker = side.actives[slot];
      const foes = battle.foesOf(attacker);
      const ally = battle.allyOf(attacker);
      const usable = a.moves.filter((m) => !m.disabled);
      let best = null, bestScore = 0, bestTarget = null;
      for (const m of usable) {
        const data = window.MOVES[m.name];
        if (!data || data.cat === "Status" || !foes.length) continue;
        let score = 0, target = null;
        if (SPREAD.includes(data.target)) {
          const hitAlly = data.target === "allAdjacent" && ally && !(ally.ability === "Telepathy");
          const mult = foes.length + (hitAlly ? 1 : 0) > 1 ? 0.75 : 1;
          for (const foe of foes) score += scoreMove(battle, attacker, foe, m.name) * mult;
          if (hitAlly) {
            const dmg = expectedDamage(battle, attacker, ally, m.name) * mult * hitChance(data, attacker, ally);
            if (dmg > 0) score -= Math.min(dmg, ally.hp) * 1.5 + (dmg >= ally.hp ? ally.maxhp : 0);
          }
        } else if (SINGLE.includes(data.target)) {
          for (const foe of foes) {
            const s = scoreMove(battle, attacker, foe, m.name);
            if (s > score) { score = s; target = foe.slot + 1; }
          }
        } else {
          // Random target (Outrage, ...) or the last attacker (Counter, ...).
          for (const foe of foes) score += scoreMove(battle, attacker, foe, m.name) / foes.length;
        }
        if (score > bestScore) { best = m; bestScore = score; bestTarget = target; }
      }
      if (!best) {
        // Nothing does damage: a status move that has someone to work on.
        const status = usable.filter((m) => m.category === "Status" && (m.target !== "adjacentAlly" || ally));
        best = pick(status.length ? status : usable);
        const foeLocs = best.targets.filter((l) => l > 0);
        if (best.targets.length) bestTarget = pick(best.target === "adjacentAllyOrSelf" || !foeLocs.length ? best.targets : foeLocs);
      }
      const choice = { type: "move", move: best.index };
      if (bestTarget) choice.target = bestTarget;
      if (a.canMega && !mega) { choice.mega = true; mega = true; }
      // (Ultra Burst when it can; its Z-Move on the move it picked, once.)
      if (a.canUltraBurst) choice.ultra = true;
      if (a.zMoves && a.zMoves[best.index] && !zmove) { choice.zmove = true; zmove = true; }
      // (Terastallize for a move of its Tera Type, once.)
      if (a.canTera && !tera && !choice.zmove && !choice.ultra && teraNow(battle, side, side.actives[slot], a, best, false)) { choice.tera = true; tera = true; }
      out[slot] = choice;
    });
    return out;
  }

  function choose(battle, sideId, rng) {
    rng = rng || Math.random;
    if (battle.doubles) return chooseDoubles(battle, sideId, rng);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const req = battle.getRequest(sideId);
    const side = battle.sides[sideId];
    if (req.phase === "revive") return chooseRevive(battle, req);

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
    if (req.active.canUltraBurst) choice.ultra = true;
    if (req.active.zMoves && req.active.zMoves[best.index]) choice.zmove = true;
    // (Dynamax with its last Pokémon, if its Trainer can.)
    else if (req.active.canDynamax && side.pokemon.filter((p) => !p.fainted).length === 1 && !choice.mega) choice.dynamax = true;
    // (Terastallize for a move of its Tera Type, with its last Pokémon, or its ace as soon as it's out.)
    if (req.active.canTera && !choice.zmove && !choice.dynamax && !choice.ultra
      && teraNow(battle, side, attacker, req.active, best, side.pokemon.filter((p) => !p.fainted).length === 1)) choice.tera = true;
    return choice;
  }

  window.OpponentAI = { choose, scoreMove, expectedDamage };
})();
