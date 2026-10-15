// Battle conditions and item effects (Gen 6)
// Depends on nothing at load time. Used by battle.js.
//
// Everything here is written in the same hook style as abilities.js:
//   hook(ctx, relayValue, ...extra)
// where ctx is built by battle.js (ctx.pokemon is the holder, ctx.source the
// attacker or cause, ctx.effectState this condition's own state object, and
// helpers like ctx.damage, ctx.heal, ctx.boost, ctx.add, ctx.randomChance).
// A hook returning false blocks the event; a number replaces the relayed value.

(function () {
  "use strict";

  const E = (effectType, id, name) => ({ effectType, id, name: name || id });
  const hpFrac = (mon, n, d) => Math.max(1, Math.floor((mon.baseMaxhp * n) / d));

  // ---------------------------------------------------------------
  // Major status conditions
  // ---------------------------------------------------------------
  const statuses = {
    brn: {
      name: "burn",
      onResidual(ctx) { ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), null, E("Status", "brn", "burn")); }
    },
    psn: {
      name: "poison",
      onResidual(ctx) { ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), null, E("Status", "psn", "poison")); }
    },
    tox: {
      name: "bad poison",
      onResidual(ctx) {
        const st = ctx.effectState;
        if (st.stage < 15) st.stage++;
        ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, st.stage, 16), null, E("Status", "tox", "bad poison"));
      }
    },
    par: {
      name: "paralysis",
      onModifySpe(ctx, spe) { return ctx.chainModify(spe, 0.25); },
      onBeforeMove(ctx) {
        if (ctx.randomChance(1, 4)) { ctx.add("cant", ctx.pokemon, "par"); return false; }
      }
    },
    slp: {
      name: "sleep",
      onBeforeMove(ctx, move) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) {
          ctx.cureStatus(ctx.pokemon, true);
          return;
        }
        ctx.add("cant", ctx.pokemon, "slp");
        if (move && move.sleepUsable) return;
        return false;
      }
    },
    frz: {
      name: "freeze",
      onBeforeMove(ctx, move) {
        if (move && move.flags && move.flags.defrost) { ctx.cureStatus(ctx.pokemon, true); return; }
        if (ctx.randomChance(1, 5)) { ctx.cureStatus(ctx.pokemon, true); return; }
        ctx.add("cant", ctx.pokemon, "frz");
        return false;
      }
    }
  };

  // ---------------------------------------------------------------
  // Volatile conditions
  // ---------------------------------------------------------------
  const volatiles = {
    confusion: {
      name: "confusion",
      onStart(ctx) { ctx.effectState.time = ctx.battle.randInt(2, 5); },
      onBeforeMove(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) {
          ctx.pokemon.removeVolatile("confusion");
          return;
        }
        ctx.add("-activate", ctx.pokemon, "confusion");
        if (!ctx.randomChance(1, 2)) return;
        ctx.battle.confusionDamage(ctx.pokemon);
        return false;
      }
    },
    flinch: {
      name: "flinch",
      duration: 1,
      onBeforeMove(ctx) { ctx.add("cant", ctx.pokemon, "flinch"); return false; }
    },
    partiallytrapped: {
      name: "partiallytrapped",
      onStart(ctx) { ctx.effectState.time = ctx.battle.randInt(4, 5); },
      onResidual(ctx) {
        const st = ctx.effectState;
        const src = st.source;
        if (!src || !src.isActive || src.fainted) { ctx.pokemon.removeVolatile("partiallytrapped"); return; }
        ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), src, E("Volatile", "partiallytrapped", st.moveName || "trap"));
        st.time--;
        if (st.time <= 0) {
          ctx.add("-end", ctx.pokemon, st.moveName || "trap");
          ctx.pokemon.removeVolatile("partiallytrapped");
        }
      }
    },
    leechseed: {
      name: "Leech Seed",
      onStart(ctx) { if (ctx.source && ctx.source.side) ctx.effectState.sourceSlot = ctx.source.slot; },
      onResidual(ctx) {
        let src = ctx.effectState.source;
        if (ctx.battle.doubles && src && src.side) {
          // Doubles: it saps into whoever now stands in the seeder's slot
          // (nothing at all if that slot is empty).
          src = src.side.actives[ctx.effectState.sourceSlot];
          if (!src || src.fainted || !src.isActive) return;
        }
        const dealt = ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), src, E("Volatile", "leechseed", "Leech Seed"));
        if (dealt && src && src.isActive && !src.fainted) ctx.heal(src, dealt, ctx.pokemon, E("Volatile", "leechseed", "Leech Seed"));
      }
    },
    protect: { name: "Protect", duration: 1 },
    kingsshield: { name: "King's Shield", duration: 1 },
    spikyshield: { name: "Spiky Shield", duration: 1 },
    endure: {
      name: "Endure",
      duration: 1,
      onDamage(ctx, damage, effect) {
        if (effect && effect.effectType === "Move" && damage >= ctx.pokemon.hp) {
          ctx.add("-activate", ctx.pokemon, "move: Endure");
          return ctx.pokemon.hp - 1;
        }
      }
    },
    substitute: { name: "Substitute" },
    taunt: {
      name: "Taunt",
      onStart(ctx) { ctx.effectState.time = 3; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) { ctx.add("-end", ctx.pokemon, "move: Taunt"); ctx.pokemon.removeVolatile("taunt"); }
      }
    },
    encore: {
      name: "Encore",
      onStart(ctx) { ctx.effectState.time = 3; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) { ctx.add("-end", ctx.pokemon, "Encore"); ctx.pokemon.removeVolatile("encore"); }
      }
    },
    disable: {
      name: "Disable",
      onStart(ctx) { ctx.effectState.time = 4; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) { ctx.add("-end", ctx.pokemon, "Disable"); ctx.pokemon.removeVolatile("disable"); }
      }
    },
    torment: { name: "Torment" },
    yawn: {
      name: "Yawn",
      onStart(ctx) { ctx.effectState.time = 2; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) {
          ctx.pokemon.removeVolatile("yawn");
          ctx.trySetStatus(ctx.pokemon, "slp", st.source, E("Volatile", "yawn", "Yawn"));
        }
      }
    },
    ingrain: {
      name: "Ingrain",
      onResidual(ctx) { ctx.heal(ctx.pokemon, hpFrac(ctx.pokemon, 1, 16), ctx.pokemon, E("Volatile", "ingrain", "Ingrain")); }
    },
    aquaring: {
      name: "Aqua Ring",
      onResidual(ctx) { ctx.heal(ctx.pokemon, hpFrac(ctx.pokemon, 1, 16), ctx.pokemon, E("Volatile", "aquaring", "Aqua Ring")); }
    },
    magnetrise: {
      name: "Magnet Rise",
      onStart(ctx) { ctx.effectState.time = 5; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        if (st.time <= 0) { ctx.add("-end", ctx.pokemon, "Magnet Rise"); ctx.pokemon.removeVolatile("magnetrise"); }
      }
    },
    charge: { name: "Charge", duration: 2 },
    focusenergy: { name: "Focus Energy" },
    destinybond: { name: "Destiny Bond" },
    roost: {
      name: "Roost",
      duration: 1,
      onEnd(ctx) { ctx.battle.restoreTypes(ctx.pokemon); }
    },
    perishsong: {
      name: "Perish Song",
      onStart(ctx) { ctx.effectState.time = 4; },
      onResidual(ctx) {
        const st = ctx.effectState;
        st.time--;
        ctx.add("-start", ctx.pokemon, "perish" + st.time);
        if (st.time <= 0) ctx.damage(ctx.pokemon, ctx.pokemon.hp, null, E("Volatile", "perishsong", "Perish Song"));
      }
    },
    focuspunch: { name: "Focus Punch", duration: 1 },
    magiccoat: { name: "Magic Coat", duration: 1 },
    snatch: { name: "Snatch", duration: 1 },
    stockpile: {
      name: "Stockpile",
      onStart(ctx) { Object.assign(ctx.effectState, { layers: 0, def: 0, spd: 0 }); },
      onEnd(ctx) {
        const p = ctx.pokemon, st = ctx.effectState;
        p.boosts.def = Math.max(-6, Math.min(6, p.boosts.def - (st.def || 0)));
        p.boosts.spd = Math.max(-6, Math.min(6, p.boosts.spd - (st.spd || 0)));
        ctx.add("-end", p, "Stockpile");
      }
    },
    bide: {
      name: "Bide",
      duration: 3,
      onBeforeMove(ctx) {
        const p = ctx.pokemon, st = ctx.effectState;
        if (st.duration !== 1) { ctx.add("-activate", p, "move: Bide"); return false; }
        const dealt = (st.damage || 0) * 2;
        const foe = ctx.battle.doubles ? ctx.battle.foesOf(p)[0] : p.side.foe.active;
        const src = st.lastSource && st.lastSource.isActive && !st.lastSource.fainted ? st.lastSource : foe;
        p.removeVolatile("bide");
        ctx.add("-end", p, "move: Bide");
        if (!dealt || !src || src.fainted) { ctx.add("-fail", p); return false; }
        ctx.damage(src, dealt, p, E("Move", "bide", "Bide"));
        return false;
      }
    },
    attract: {
      name: "Attract",
      onBeforeMove(ctx) {
        const p = ctx.pokemon, src = ctx.effectState.source;
        if (!src || !src.isActive || src.fainted) { p.removeVolatile("attract"); return; }
        ctx.add("-activate", p, "move: Attract", "[of] " + src.ident);
        if (ctx.randomChance(1, 2)) { ctx.add("cant", p, "Attract"); return false; }
      }
    },
    mustrecharge: { name: "mustrecharge" },
    lockedmove: { name: "lockedmove" },
    twoturnmove: { name: "twoturnmove" },
    choicelock: { name: "choicelock" }
  };

  // ---------------------------------------------------------------
  // Side conditions
  // ---------------------------------------------------------------
  const sides = {
    reflect: { name: "Reflect", duration: 5 },
    lightscreen: { name: "Light Screen", duration: 5 },
    safeguard: { name: "Safeguard", duration: 5 },
    mist: { name: "Mist", duration: 5 },
    luckychant: { name: "Lucky Chant", duration: 5 },
    tailwind: {
      name: "Tailwind",
      duration: 4,
      onModifySpe(ctx, spe) { return ctx.chainModify(spe, 2); }
    },
    quickguard: { name: "Quick Guard", duration: 1 },
    wideguard: { name: "Wide Guard", duration: 1 },
    craftyshield: { name: "Crafty Shield", duration: 1 },
    matblock: { name: "Mat Block", duration: 1 },
    spikes: { name: "Spikes", layers: 3 },
    toxicspikes: { name: "Toxic Spikes", layers: 2 },
    stealthrock: { name: "Stealth Rock" },
    stickyweb: { name: "Sticky Web" }
  };

  // ---------------------------------------------------------------
  // Item effects (item ids are the kebab-case keys used in items.js)
  // ---------------------------------------------------------------
  const items = {};
  const eat = (ctx) => ctx.battle.consumeItem(ctx.pokemon);

  items["leftovers"] = {
    onResidual(ctx) { ctx.heal(ctx.pokemon, hpFrac(ctx.pokemon, 1, 16), ctx.pokemon, E("Item", "leftovers", "Leftovers")); }
  };
  items["black-sludge"] = {
    onResidual(ctx) {
      if (ctx.pokemon.hasType("Poison")) ctx.heal(ctx.pokemon, hpFrac(ctx.pokemon, 1, 16), ctx.pokemon, E("Item", "black-sludge", "Black Sludge"));
      else ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), null, E("Item", "black-sludge", "Black Sludge"));
    }
  };
  items["sticky-barb"] = {
    onResidual(ctx) { ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 8), null, E("Item", "sticky-barb", "Sticky Barb")); }
  };
  items["flame-orb"] = {
    onResidual(ctx) { ctx.trySetStatus(ctx.pokemon, "brn", ctx.pokemon, E("Item", "flame-orb", "Flame Orb")); }
  };
  items["toxic-orb"] = {
    onResidual(ctx) { ctx.trySetStatus(ctx.pokemon, "tox", ctx.pokemon, E("Item", "toxic-orb", "Toxic Orb")); }
  };
  items["life-orb"] = {
    onAfterMoveSecondarySelf(ctx, move, dealt) {
      if (!dealt || move.hasSheerForce) return;
      ctx.damage(ctx.pokemon, hpFrac(ctx.pokemon, 1, 10), ctx.pokemon, E("Item", "life-orb", "Life Orb"));
    }
  };
  items["shell-bell"] = {
    onAfterMoveSecondarySelf(ctx, move, dealt) {
      if (dealt) ctx.heal(ctx.pokemon, Math.max(1, Math.floor(dealt / 8)), ctx.pokemon, E("Item", "shell-bell", "Shell Bell"));
    }
  };
  items["rocky-helmet"] = {
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon))
        ctx.damage(ctx.source, hpFrac(ctx.source, 1, 6), ctx.pokemon, E("Item", "rocky-helmet", "Rocky Helmet"));
    }
  };
  items["focus-sash"] = {
    onDamage(ctx, damage, effect) {
      const p = ctx.pokemon;
      if (p.hp === p.maxhp && damage >= p.hp && effect && effect.effectType === "Move") {
        eat(ctx);
        ctx.add("-enditem", p, "Focus Sash");
        return p.hp - 1;
      }
    }
  };
  items["focus-band"] = {
    onDamage(ctx, damage, effect) {
      const p = ctx.pokemon;
      if (damage >= p.hp && effect && effect.effectType === "Move" && ctx.randomChance(1, 10)) {
        ctx.add("-activate", p, "item: Focus Band");
        return p.hp - 1;
      }
    }
  };
  items["air-balloon"] = {
    onDamagingHit(ctx) {
      ctx.add("-enditem", ctx.pokemon, "Air Balloon");
      eat(ctx);
    }
  };
  items["weakness-policy"] = {
    onDamagingHit(ctx, move) {
      if (ctx.pokemon.getMoveHitData(move).typeMod > 0 && ctx.pokemon.hp) {
        eat(ctx);
        ctx.boost(ctx.pokemon, { atk: 2, spa: 2 }, ctx.pokemon);
      }
    }
  };
  items["choice-scarf"] = { onModifySpe(ctx, spe) { return ctx.chainModify(spe, 1.5); } };
  items["iron-ball"] = { onModifySpe(ctx, spe) { return ctx.chainModify(spe, 0.5); } };
  items["macho-brace"] = items["iron-ball"];
  for (const n of ["power-anklet", "power-band", "power-belt", "power-bracer", "power-lens", "power-weight"]) {
    items[n] = { onModifySpe(ctx, spe) { return ctx.chainModify(spe, 0.5); } };
  }
  items["wide-lens"] = { accSide: "attacker", onModifyAccuracy(ctx, acc) { if (typeof acc === "number") return ctx.chainModify(acc, 1.1); } };
  items["bright-powder"] = { accSide: "defender", onModifyAccuracy(ctx, acc) { if (typeof acc === "number") return ctx.chainModify(acc, 0.9); } };
  items["lax-incense"] = items["bright-powder"];
  items["safety-goggles"] = { onImmunity(ctx, type) { if (["sandstorm", "hail", "powder"].includes(type)) return false; } };
  items["white-herb"] = {
    onUpdate(ctx) {
      const p = ctx.pokemon;
      let any = false;
      for (const k of Object.keys(p.boosts)) if (p.boosts[k] < 0) { p.boosts[k] = 0; any = true; }
      if (any) { ctx.add("-enditem", p, "White Herb"); eat(ctx); }
    }
  };
  items["leppa-berry"] = {
    onUpdate(ctx) {
      const p = ctx.pokemon;
      const m = p.moves.find((x) => x.pp === 0);
      if (m) { m.pp = Math.min(m.maxpp, 10); ctx.add("-enditem", p, "Leppa Berry", "[eat]"); eat(ctx); }
    }
  };

  // HP-threshold berries
  const healBerry = (name, thresholdNum, thresholdDen, getAmount) => {
    items[name] = {
      onUpdate(ctx) {
        const p = ctx.pokemon;
        if (!p.hp || p.hp * thresholdDen > p.maxhp * thresholdNum) return;
        ctx.add("-enditem", p, name, "[eat]");
        eat(ctx);
        ctx.heal(p, getAmount(p), p, E("Item", name, name));
      }
    };
  };
  healBerry("sitrus-berry", 1, 2, (p) => Math.floor(p.maxhp / 4));
  healBerry("oran-berry", 1, 2, () => 10);
  for (const n of ["figy-berry", "wiki-berry", "mago-berry", "aguav-berry", "iapapa-berry"]) {
    healBerry(n, 1, 2, (p) => Math.max(1, Math.floor(p.maxhp / 8)));
  }

  // Stat-boost pinch berries (<= 1/4 HP)
  const pinchBerry = (name, stat) => {
    items[name] = {
      onUpdate(ctx) {
        const p = ctx.pokemon;
        if (!p.hp || p.hp * 4 > p.maxhp) return;
        ctx.add("-enditem", p, name, "[eat]");
        eat(ctx);
        ctx.boost(p, { [stat]: 1 }, p);
      }
    };
  };
  pinchBerry("liechi-berry", "atk");
  pinchBerry("ganlon-berry", "def");
  pinchBerry("salac-berry", "spe");
  pinchBerry("petaya-berry", "spa");
  pinchBerry("apicot-berry", "spd");

  // Status-curing berries
  const cureBerry = (name, statusList, curesConfusion) => {
    items[name] = {
      onUpdate(ctx) {
        const p = ctx.pokemon;
        if (!p.hp) return;
        const hasStatus = !!p.status && (statusList === "any" || statusList.includes(p.status));
        const hasConf = !!p.volatiles.confusion && curesConfusion;
        if (!hasStatus && !hasConf) return;
        ctx.add("-enditem", p, name, "[eat]");
        eat(ctx);
        if (hasStatus) ctx.cureStatus(p, true);
        if (hasConf) p.removeVolatile("confusion");
      }
    };
  };
  cureBerry("lum-berry", "any", true);
  cureBerry("chesto-berry", ["slp"], false);
  cureBerry("pecha-berry", ["psn", "tox"], false);
  cureBerry("rawst-berry", ["brn"], false);
  cureBerry("aspear-berry", ["frz"], false);
  cureBerry("cheri-berry", ["par"], false);
  cureBerry("persim-berry", [], true);

  window.CONDITIONS = { statuses, volatiles, sides };
  window.ITEM_EFFECTS = items;
})();
