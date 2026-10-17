// Effects of items used on a Pokémon from the bag (in or out of battle)
// Depends on: nothing at load time.
//
// Works on any object shaped like { hp, maxhp, status, fainted, confused,
// moves: [{ pp, maxpp, base, ppUps }], evs, level }: the battle engine's
// Pokémon, or a view of a party record (see game/bag.js). `base` and `ppUps`
// are only needed for PP Up / PP Max, which only work outside battle.
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
    // Battle items: one stage up for the Pokémon in battle (Gen 6).
    "x-attack": { boost: "atk" }, "x-defense": { boost: "def" }, "x-sp-atk": { boost: "spa" },
    "x-sp-def": { boost: "spd" }, "x-speed": { boost: "spe" }, "x-accuracy": { boost: "accuracy" },
    // Dire Hit: Focus Energy's critical-hit boost; Guard Spec.: Mist on your side for five turns.
    "dire-hit": { battleEffect: "focusenergy" }, "guard-spec": { battleEffect: "mist" },
    // Outside battle only
    "pp-up": { ppUp: 1, oneMove: true, outOfBattle: true }, "pp-max": { ppUp: 3, oneMove: true, outOfBattle: true },
    "rare-candy": { levelUp: true, outOfBattle: true },
    "hp-up": { ev: "hp", outOfBattle: true }, "protein": { ev: "atk", outOfBattle: true },
    "iron": { ev: "def", outOfBattle: true }, "calcium": { ev: "spa", outOfBattle: true },
    "zinc": { ev: "spd", outOfBattle: true }, "carbos": { ev: "spe", outOfBattle: true },
    // Wings (Gen 5's, Gen 6's numbers): one EV a time, as far as 252 in that stat.
    "health-wing": { ev: "hp", wing: true, outOfBattle: true }, "muscle-wing": { ev: "atk", wing: true, outOfBattle: true },
    "resist-wing": { ev: "def", wing: true, outOfBattle: true }, "genius-wing": { ev: "spa", wing: true, outOfBattle: true },
    "clever-wing": { ev: "spd", wing: true, outOfBattle: true }, "swift-wing": { ev: "spe", wing: true, outOfBattle: true },
    // Exp. Candies (Sword and Shield's): that many Exp. Points (the UI levels it up).
    "exp-candy-xs": { expCandy: 100, outOfBattle: true }, "exp-candy-s": { expCandy: 800, outOfBattle: true },
    "exp-candy-m": { expCandy: 3000, outOfBattle: true }, "exp-candy-l": { expCandy: 10000, outOfBattle: true },
    "exp-candy-xl": { expCandy: 30000, outOfBattle: true },
    // The EV-lowering Berries (Gen 4's, Gen 7's numbers): that stat's EVs down
    // 10, and friendship up; usable while either would change.
    "pomeg-berry": { evDown: "hp", outOfBattle: true }, "kelpsy-berry": { evDown: "atk", outOfBattle: true },
    "qualot-berry": { evDown: "def", outOfBattle: true }, "hondew-berry": { evDown: "spa", outOfBattle: true },
    "grepa-berry": { evDown: "spd", outOfBattle: true }, "tamato-berry": { evDown: "spe", outOfBattle: true }
  };
  // How each changes friendship (FireRed's src/data/pokemon/item_effects.h:
  // [under 100, under 200, 200 and up]): vitamins and PP Ups please it, X
  // items a little, the bitter herbal medicines don't. (Rare Candy's is its
  // level up's.)
  const VITAMIN = [5, 3, 2], BATTLE_ITEM = [1, 1, 0], WING = [3, 2, 1], EV_BERRY = [10, 5, 2];
  const FRIENDSHIP = {
    "hp-up": VITAMIN, "protein": VITAMIN, "iron": VITAMIN, "calcium": VITAMIN, "zinc": VITAMIN, "carbos": VITAMIN,
    "pp-up": VITAMIN, "pp-max": VITAMIN, "health-wing": WING, "muscle-wing": WING, "resist-wing": WING, "genius-wing": WING,
    "clever-wing": WING, "swift-wing": WING,
    "pomeg-berry": EV_BERRY, "kelpsy-berry": EV_BERRY, "qualot-berry": EV_BERRY, "hondew-berry": EV_BERRY, "grepa-berry": EV_BERRY,
    "tamato-berry": EV_BERRY,
    "x-attack": BATTLE_ITEM, "x-defense": BATTLE_ITEM, "x-sp-atk": BATTLE_ITEM, "x-sp-def": BATTLE_ITEM,
    "x-speed": BATTLE_ITEM, "x-accuracy": BATTLE_ITEM, "guard-spec": BATTLE_ITEM, "dire-hit": BATTLE_ITEM,
    "energy-powder": [-5, -5, -10], "heal-powder": [-5, -5, -10], "energy-root": [-10, -10, -15], "revival-herb": [-15, -15, -20]
  };

  // Vitamins add 10 EVs, Wings 1, up to 252 in a stat (as from Sword and
  // Shield: the most any stat can have) and 510 in total.
  const VITAMIN_EVS = 10, VITAMIN_CAP = 252, EV_TOTAL = 510, WING_EVS = 1, WING_CAP = 252, EV_BERRY_DROP = 10;

  const curable = (eff, t) =>
    (t.status && (eff.cure === ALL || (eff.cure && eff.cure.includes(t.status)))) || (eff.confusion && t.confused);
  const MAX_PP_UPS = 3;
  const ppWithUps = (base, ups) => Math.floor(base * (5 + ups) / 5);
  const evTotal = (evs) => Object.values(evs || {}).reduce((s, v) => s + (v || 0), 0);

  // Would using `item` on `target` do anything? opts: { inBattle, move }
  function canUse(target, item, opts) {
    opts = opts || {};
    const eff = EFFECTS[item];
    if (!eff) return false;
    if (eff.outOfBattle && opts.inBattle) return false;
    if (eff.boost) return !!opts.inBattle && !!target.isActive && !target.fainted && ((target.boosts || {})[eff.boost] || 0) < 6;
    if (eff.battleEffect) return !!opts.inBattle && !!target.isActive && !target.fainted && !(target.effects || {})[eff.battleEffect];
    if (eff.revive) return !!target.fainted;
    if (target.fainted) return false;
    if (eff.levelUp || eff.expCandy) return target.level < 100;
    if (eff.ev) return (target.evs[eff.ev] || 0) < (eff.wing ? WING_CAP : VITAMIN_CAP) && evTotal(target.evs) < EV_TOTAL;
    if (eff.evDown) return (target.evs[eff.evDown] || 0) > 0 || (target.happiness != null && target.happiness < 255);
    if (eff.ppUp) {
      const moves = opts.move != null ? [target.moves[opts.move]] : target.moves;
      return moves.some((m) => m && m.base > 1 && (m.ppUps || 0) < MAX_PP_UPS);
    }
    let useful = false;
    if ((eff.heal || eff.healFraction) && target.hp < target.maxhp) useful = true;
    if (curable(eff, target)) useful = true;
    if (eff.pp) {
      const moves = eff.oneMove && opts.move != null ? [target.moves[opts.move]] : target.moves;
      if (moves.some((m) => m && m.pp < m.maxpp)) useful = true;
    }
    return useful;
  }

  // Applies the effect. Returns { healed, cured, confusionCured, revived, pp, ppUp, ev }.
  // Level-ups aren't applied here; the caller handles Rare Candy (it needs
  // growth rates, learnsets and evolutions).
  function apply(target, item, opts) {
    opts = opts || {};
    const eff = EFFECTS[item];
    const out = {};
    if (!eff) return out;
    if (FRIENDSHIP[item]) out.friendship = FRIENDSHIP[item];
    if (eff.boost) { out.boost = eff.boost; return out; }
    if (eff.battleEffect) { out.battleEffect = eff.battleEffect; return out; }
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
    if (eff.ppUp) {
      const m = target.moves[opts.move];
      const before = ppWithUps(m.base, m.ppUps || 0);
      m.ppUps = Math.min(MAX_PP_UPS, (m.ppUps || 0) + eff.ppUp);
      m.maxpp = ppWithUps(m.base, m.ppUps);
      m.pp += m.maxpp - before;
      out.ppUp = m.maxpp - before;
    }
    if (eff.ev) {
      const room = Math.min((eff.wing ? WING_CAP : VITAMIN_CAP) - (target.evs[eff.ev] || 0), EV_TOTAL - evTotal(target.evs));
      out.ev = Math.max(0, Math.min(eff.wing ? WING_EVS : VITAMIN_EVS, room));
      target.evs[eff.ev] = (target.evs[eff.ev] || 0) + out.ev;
    }
    if (eff.evDown) {
      out.evDown = Math.min(EV_BERRY_DROP, target.evs[eff.evDown] || 0);
      out.evStat = eff.evDown;
      target.evs[eff.evDown] = (target.evs[eff.evDown] || 0) - out.evDown;
    }
    return out;
  }

  window.ItemUse = { EFFECTS, canUse, apply, effect: (item) => EFFECTS[item] || null };
})();
