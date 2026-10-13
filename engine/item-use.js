// Effects of items used on a Pokémon from the bag (in or out of battle)
// Depends on: nothing at load time.
//
// Works on any object shaped like { hp, maxhp, status, fainted, confused,
// moves: [{ pp, maxpp }], evs, level }: the battle engine's Pokémon, or a
// view of a party record (see game/bag.js).
//
//   ItemUse.canUse(target, "potion")              // -> true / false
//   ItemUse.apply(target, "potion")               // mutates, returns what changed
//   ItemUse.apply(target, "ether", { move: 2 })   // one-move PP items need a slot

(function () {
  "use strict";

  const ALL = "all";

  // Gen 6 values.
  const EFFECTS = {
    // HP
    "potion": { heal: 20 }, "super-potion": { heal: 50 }, "hyper-potion": { heal: 200 },
    "max-potion": { heal: Infinity }, "full-restore": { heal: Infinity, cure: ALL, confusion: true },
    "fresh-water": { heal: 50 }, "soda-pop": { heal: 60 }, "lemonade": { heal: 80 },
    "moomoo-milk": { heal: 100 }, "berry-juice": { heal: 20 }, "sweet-heart": { heal: 20 },
    "energy-powder": { heal: 50 }, "energy-root": { heal: 200 },
    "oran-berry": { heal: 10 }, "sitrus-berry": { healFraction: 0.25 },
    // Status
    "antidote": { cure: ["psn", "tox"] }, "pecha-berry": { cure: ["psn", "tox"] },
    "paralyze-heal": { cure: ["par"] }, "cheri-berry": { cure: ["par"] },
    "awakening": { cure: ["slp"] }, "chesto-berry": { cure: ["slp"] },
    "burn-heal": { cure: ["brn"] }, "rawst-berry": { cure: ["brn"] },
    "ice-heal": { cure: ["frz"] }, "aspear-berry": { cure: ["frz"] },
    "persim-berry": { confusion: true },
    "full-heal": { cure: ALL, confusion: true }, "lum-berry": { cure: ALL, confusion: true },
    "heal-powder": { cure: ALL, confusion: true }, "lava-cookie": { cure: ALL, confusion: true },
    "old-gateau": { cure: ALL, confusion: true }, "casteliacone": { cure: ALL, confusion: true },
    "lumiose-galette": { cure: ALL, confusion: true }, "shalour-sable": { cure: ALL, confusion: true },
    // Revival
    "revive": { revive: 0.5 }, "max-revive": { revive: 1 }, "revival-herb": { revive: 1 },
    // PP
    "ether": { pp: 10, oneMove: true }, "max-ether": { pp: Infinity, oneMove: true },
    "leppa-berry": { pp: 10, oneMove: true },
    "elixir": { pp: 10 }, "max-elixir": { pp: Infinity },
    // Outside battle only
    "rare-candy": { levelUp: true, outOfBattle: true },
    "hp-up": { ev: "hp", outOfBattle: true }, "protein": { ev: "atk", outOfBattle: true },
    "iron": { ev: "def", outOfBattle: true }, "calcium": { ev: "spa", outOfBattle: true },
    "zinc": { ev: "spd", outOfBattle: true }, "carbos": { ev: "spe", outOfBattle: true }
  };

  // Vitamins add 10 EVs, but only up to 100 in that stat (and 510 in total).
  const VITAMIN_EVS = 10, VITAMIN_CAP = 100, EV_TOTAL = 510;

  const curable = (eff, t) =>
    (t.status && (eff.cure === ALL || (eff.cure && eff.cure.includes(t.status)))) || (eff.confusion && t.confused);
  const evTotal = (evs) => Object.values(evs || {}).reduce((s, v) => s + (v || 0), 0);

  // Would using `item` on `target` do anything? opts: { inBattle, move }
  function canUse(target, item, opts) {
    opts = opts || {};
    const eff = EFFECTS[item];
    if (!eff) return false;
    if (eff.outOfBattle && opts.inBattle) return false;
    if (eff.revive) return !!target.fainted;
    if (target.fainted) return false;
    if (eff.levelUp) return target.level < 100;
    if (eff.ev) return (target.evs[eff.ev] || 0) < VITAMIN_CAP && evTotal(target.evs) < EV_TOTAL;
    let useful = false;
    if ((eff.heal || eff.healFraction) && target.hp < target.maxhp) useful = true;
    if (curable(eff, target)) useful = true;
    if (eff.pp) {
      const moves = eff.oneMove && opts.move != null ? [target.moves[opts.move]] : target.moves;
      if (moves.some((m) => m && m.pp < m.maxpp)) useful = true;
    }
    return useful;
  }

  // Applies the effect. Returns { healed, cured, confusionCured, revived, pp, ev }.
  // Level-ups aren't applied here; the caller handles Rare Candy (it needs
  // growth rates, learnsets and evolutions).
  function apply(target, item, opts) {
    opts = opts || {};
    const eff = EFFECTS[item];
    const out = {};
    if (!eff) return out;
    if (eff.revive) {
      target.fainted = false;
      target.hp = Math.max(1, Math.floor(target.maxhp * eff.revive));
      out.revived = true;
      return out;
    }
    if (eff.heal || eff.healFraction) {
      const amount = eff.heal || Math.floor(target.maxhp * eff.healFraction);
      const before = target.hp;
      target.hp = Math.min(target.maxhp, target.hp + amount);
      out.healed = target.hp - before;
    }
    if (target.status && (eff.cure === ALL || (eff.cure && eff.cure.includes(target.status)))) {
      out.cured = target.status;
      target.status = "";
    }
    if (eff.confusion && target.confused) {
      target.confused = false;
      out.confusionCured = true;
    }
    if (eff.pp) {
      const slots = eff.oneMove ? [opts.move] : target.moves.map((_, i) => i);
      out.pp = 0;
      for (const i of slots) {
        const m = target.moves[i];
        if (!m) continue;
        const add = Math.min(eff.pp, m.maxpp - m.pp);
        m.pp += add;
        out.pp += add;
      }
    }
    if (eff.ev) {
      const room = Math.min(VITAMIN_CAP - (target.evs[eff.ev] || 0), EV_TOTAL - evTotal(target.evs));
      out.ev = Math.max(0, Math.min(VITAMIN_EVS, room));
      target.evs[eff.ev] = (target.evs[eff.ev] || 0) + out.ev;
    }
    return out;
  }

  window.ItemUse = { EFFECTS, canUse, apply, effect: (item) => EFFECTS[item] || null };
})();
