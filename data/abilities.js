// abilities.js — Gen 6 (all 191 abilities, num 1–191), Gen 7 (num 192–233) and Gen 8 (num 234–267)
// Auto-curated. See header comment for engine API.

window.ABILITIES = {

  // ==================================================================
  // Gen 1
  // ==================================================================
  "Stench": {
    name: "Stench", num: 1, rating: 0.5,
    effect: "Damaging moves have a 10% chance to make the target flinch.",
    onModifyMove(move) {
      if (move.category === "Status") return;
      if (!move.secondaries) move.secondaries = [];
      for (const s of move.secondaries) if (s.volatileStatus === "flinch") return;
      move.secondaries.push({ chance: 10, volatileStatus: "flinch" });
    },
  },

  "Drizzle": {
    name: "Drizzle", num: 2, rating: 4,
    effect: "On switch-in, summons Rain Dance for 5 turns.",
    onSwitchIn(ctx) { ctx.setWeather("RainDance"); },
  },

  "Speed Boost": {
    name: "Speed Boost", num: 3, rating: 4.5,
    effect: "At the end of each turn, raises Speed by 1 stage.",
    onResidual(ctx) {
      if (ctx.pokemon.activeTurns > 0) ctx.boost(ctx.pokemon, { spe: 1 });
    },
  },

  "Battle Armor": {
    name: "Battle Armor", num: 4, rating: 1,
    effect: "This Pokémon cannot be struck by a critical hit.",
    flags: { breakable: 1 },
    onCriticalHit: () => false,
  },

  "Sturdy": {
    name: "Sturdy", num: 5, rating: 3,
    effect: "OHKO moves fail; survives at 1 HP from full HP.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (move.ohko) { ctx.add("-immune", ctx.pokemon, "[from] ability: Sturdy"); return false; }
    },
    onDamage(ctx, damage, effect) {
      const p = ctx.pokemon;
      if (p.hp === p.maxhp && damage >= p.hp && effect && effect.effectType === "Move") {
        ctx.add("-ability", p, "Sturdy");
        return p.hp - 1;
      }
    },
  },

  "Damp": {
    name: "Damp", num: 6, rating: 0.5,
    effect: "Prevents Explosion, Self-Destruct, and Aftermath.",
    flags: { breakable: 1 },
    onAnyTryMove(ctx, effect) {
      if (["explosion", "selfdestruct", "mindblown", "mistyexplosion"].includes(effect.id)) {
        ctx.add("cant", ctx.pokemon, "ability: Damp", effect);
        return false;
      }
    },
    onAnyDamage(ctx, effect) {
      if (effect && effect.name === "Aftermath") return false;
    },
  },

  "Limber": {
    name: "Limber", num: 7, rating: 2,
    effect: "This Pokémon cannot be paralyzed.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (status.id !== "par") return;
      if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Limber");
      return false;
    },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "par") { ctx.add("-activate", ctx.pokemon, "ability: Limber"); ctx.cureStatus(ctx.pokemon); }
    },
  },

  "Sand Veil": {
    name: "Sand Veil", num: 8, rating: 1.5,
    effect: "In sandstorm, evasiveness is 1.25×; immune to sandstorm damage.",
    flags: { breakable: 1 },
    onImmunity(ctx, type) { if (type === "sandstorm") return false; },
    onModifyAccuracy(ctx, accuracy) {
      if (typeof accuracy !== "number") return;
      if (ctx.isWeather("Sandstorm")) return ctx.chainModify(accuracy, 0.8);
    },
  },

  "Static": {
    name: "Static", num: 9, rating: 2,
    effect: "30% chance to paralyze attackers on contact.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon)) {
        if (ctx.randomChance(3, 10)) ctx.trySetStatus(ctx.source, "par", ctx.pokemon);
      }
    },
  },

  "Volt Absorb": {
    name: "Volt Absorb", num: 10, rating: 3.5,
    effect: "Immune to Electric; heals 1/4 max HP when hit by Electric.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Electric") {
        if (!ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 4))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Volt Absorb");
        return false;
      }
    },
  },

  "Water Absorb": {
    name: "Water Absorb", num: 11, rating: 3.5,
    effect: "Immune to Water; heals 1/4 max HP when hit by Water.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Water") {
        if (!ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 4))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Water Absorb");
        return false;
      }
    },
  },

  "Oblivious": {
    name: "Oblivious", num: 12, rating: 1.5,
    effect: "Immune to infatuation, Taunt, Captivate; blocks Intimidate.",
    flags: { breakable: 1 },
    onImmunity(ctx, type) { if (type === "attract") return false; },
    onTryHit(ctx, move) {
      if (["attract", "captivate", "taunt"].includes(move.id)) {
        ctx.add("-immune", ctx.pokemon, "[from] ability: Oblivious"); return false;
      }
    },
    onTryBoost(ctx, boost, effect) {
      if (effect && effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        ctx.add("-fail", ctx.pokemon, "unboost", "atk", "[from] ability: Oblivious");
      }
    },
    onUpdate(ctx) {
      if (ctx.pokemon.volatiles.attract) {
        ctx.add("-activate", ctx.pokemon, "ability: Oblivious");
        ctx.pokemon.removeVolatile("attract");
      }
      if (ctx.pokemon.volatiles.taunt) {
        ctx.add("-activate", ctx.pokemon, "ability: Oblivious");
        ctx.pokemon.removeVolatile("taunt");
      }
    },
  },

  "Cloud Nine": {
    name: "Cloud Nine", num: 13, rating: 1.5,
    effect: "Suppresses all weather effects on the field.",
    suppressWeather: true,
    onSwitchIn(ctx) { ctx.add("-ability", ctx.pokemon, "Cloud Nine"); ctx.singleEvent("WeatherChange", ctx.pokemon); },
    onEnd(ctx) { ctx.singleEvent("WeatherChange", ctx.pokemon); },
  },

  "Compound Eyes": {
    name: "Compound Eyes", num: 14, rating: 3,
    effect: "This Pokémon's moves have 1.3× accuracy.",
    onModifyAccuracy(ctx, accuracy) {
      if (typeof accuracy !== "number") return;
      return ctx.chainModify(accuracy, 1.3);
    },
  },

  "Insomnia": {
    name: "Insomnia", num: 15, rating: 1.5,
    effect: "This Pokémon cannot fall asleep; Yawn fails.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (status.id !== "slp") return;
      if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Insomnia");
      return false;
    },
    onTryAddVolatile(ctx, status) {
      if (status.id === "yawn") { ctx.add("-immune", ctx.pokemon, "[from] ability: Insomnia"); return false; }
    },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "slp") { ctx.add("-activate", ctx.pokemon, "ability: Insomnia"); ctx.cureStatus(ctx.pokemon); }
    },
  },

  "Color Change": {
    name: "Color Change", num: 16, rating: 0,
    effect: "Changes type to the type of the last move that hit it.",
    onAfterMoveSecondary(ctx, move) {
      if (!ctx.pokemon.hp) return;
      const type = move.type;
      if (ctx.pokemon.isActive && move.effectType === "Move" && move.category !== "Status"
          && type !== "???" && !ctx.pokemon.hasType(type)) {
        if (!ctx.setType(ctx.pokemon, type)) return false;
        ctx.add("-start", ctx.pokemon, "typechange", type, "[from] ability: Color Change");
      }
    },
  },

  "Immunity": {
    name: "Immunity", num: 17, rating: 2,
    effect: "This Pokémon cannot be poisoned.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (status.id !== "psn" && status.id !== "tox") return;
      if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Immunity");
      return false;
    },
    onUpdate(ctx) {
      if (["psn", "tox"].includes(ctx.pokemon.status)) {
        ctx.add("-activate", ctx.pokemon, "ability: Immunity"); ctx.cureStatus(ctx.pokemon);
      }
    },
  },

  "Flash Fire": {
    name: "Flash Fire", num: 18, rating: 3.5,
    effect: "Immune to Fire; Fire moves do 1.5× damage once hit by Fire.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Fire") {
        move.accuracy = true;
        if (!ctx.pokemon.addVolatile("flashfire"))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Flash Fire");
        return false;
      }
    },
    onEnd(ctx) { ctx.pokemon.removeVolatile("flashfire"); },
    condition: {
      noCopy: true,
      onStart(ctx) { ctx.add("-start", ctx.pokemon, "ability: Flash Fire"); },
      onModifyAtk(ctx, atk, move) {
        if (move.type === "Fire" && ctx.pokemon.hasAbility("Flash Fire"))
          return ctx.chainModify(atk, 1.5);
      },
      onModifySpA(ctx, spa, move) {
        if (move.type === "Fire" && ctx.pokemon.hasAbility("Flash Fire"))
          return ctx.chainModify(spa, 1.5);
      },
      onEnd(ctx) { ctx.add("-end", ctx.pokemon, "ability: Flash Fire", "[silent]"); },
    },
  },

  "Shield Dust": {
    name: "Shield Dust", num: 19, rating: 2,
    effect: "Blocks the secondary effects of moves.",
    flags: { breakable: 1 },
    onModifySecondaries(ctx, secondaries) {
      return secondaries.filter(e => !!e.self);
    },
  },

  "Own Tempo": {
    name: "Own Tempo", num: 20, rating: 1.5,
    effect: "This Pokémon cannot be confused.",
    flags: { breakable: 1 },
    onTryAddVolatile(ctx, status) { if (status.id === "confusion") return false; },
    onUpdate(ctx) {
      if (ctx.pokemon.volatiles.confusion) {
        ctx.add("-activate", ctx.pokemon, "ability: Own Tempo");
        ctx.pokemon.removeVolatile("confusion");
      }
    },
    onTryBoost(ctx, boost, effect) {
      if (effect && effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        ctx.add("-fail", ctx.pokemon, "unboost", "atk", "[from] ability: Own Tempo");
      }
    },
  },

  "Suction Cups": {
    name: "Suction Cups", num: 21, rating: 1,
    effect: "Cannot be forced to switch out.",
    flags: { breakable: 1 },
    onDragOut(ctx) { ctx.add("-activate", ctx.pokemon, "ability: Suction Cups"); return false; },
  },

  "Intimidate": {
    name: "Intimidate", num: 22, rating: 3.5,
    effect: "On switch-in, lowers adjacent foes' Attack by 1.",
    onSwitchIn(ctx) {
      let activated = false;
      for (const foe of ctx.foes()) {
        if (!activated) { ctx.add("-ability", ctx.pokemon, "Intimidate", "boost"); activated = true; }
        if (foe.volatiles.substitute) ctx.add("-immune", foe);
        else ctx.boost(foe, { atk: -1 }, ctx.pokemon, true);
      }
    },
  },

  "Shadow Tag": {
    name: "Shadow Tag", num: 23, rating: 5,
    effect: "Traps adjacent foes (except other Shadow Tag users).",
    onFoeTrapPokemon(ctx, foe) {
      if (!foe.hasAbility("Shadow Tag") && foe.isAdjacent(ctx.pokemon)) foe.tryTrap(true);
    },
  },

  "Rough Skin": {
    name: "Rough Skin", num: 24, rating: 2.5,
    effect: "Contact attackers lose 1/8 max HP.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, true))
        ctx.damage(ctx.source, ctx.source.baseMaxhp / 8, ctx.pokemon);
    },
  },

  "Wonder Guard": {
    name: "Wonder Guard", num: 25, rating: 5,
    effect: "Only super-effective damaging moves can hit this Pokémon.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, failskillswap: 1, breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target === ctx.source || move.category === "Status" || move.id === "struggle") return;
      if (ctx.pokemon.runEffectiveness(move) <= 0 || !ctx.pokemon.runImmunity(move)) {
        if (move.smartTarget) move.smartTarget = false;
        else ctx.add("-immune", ctx.pokemon, "[from] ability: Wonder Guard");
        return false;
      }
    },
  },

  "Levitate": {
    name: "Levitate", num: 26, rating: 3.5,
    effect: "Immune to Ground moves and grounded effects (Spikes, Arena Trap…).",
    flags: { breakable: 1 },
    // Airborne-ness implemented in engine: pokemon.isGrounded() should return false.
    airborne: true,
  },

  "Effect Spore": {
    name: "Effect Spore", num: 27, rating: 2,
    effect: "30% chance to poison, paralyze, or sleep on contact.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon) && ctx.source.runStatusImmunity("powder")) {
        const r = ctx.random(100);
        if (r < 11) ctx.source.trySetStatus("slp", ctx.pokemon);
        else if (r < 21) ctx.source.trySetStatus("par", ctx.pokemon);
        else if (r < 30) ctx.source.trySetStatus("psn", ctx.pokemon);
      }
    },
  },

  "Synchronize": {
    name: "Synchronize", num: 28, rating: 2,
    effect: "Passes burn/poison/paralysis back to the Pokemon that inflicted it.",
    onAfterSetStatus(ctx, status) {
      if (!ctx.source || ctx.source === ctx.pokemon) return;
      if (ctx.effect && ctx.effect.id === "toxicspikes") return;
      if (status.id === "slp" || status.id === "frz") return;
      ctx.add("-activate", ctx.pokemon, "ability: Synchronize");
      ctx.source.trySetStatus(status, ctx.pokemon, { status: status.id, id: "synchronize" });
    },
  },

  "Clear Body": {
    name: "Clear Body", num: 29, rating: 2,
    effect: "Prevents other Pokémon from lowering this Pokémon's stats.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost, effect) {
      if (ctx.source && ctx.target === ctx.source) return;
      let showMsg = false;
      for (const k in boost) {
        if (boost[k] < 0) { delete boost[k]; showMsg = true; }
      }
      if (showMsg && !(effect && effect.secondaries) && effect.id !== "octolock")
        ctx.add("-fail", ctx.pokemon, "unboost", "[from] ability: Clear Body");
    },
  },

  "Natural Cure": {
    name: "Natural Cure", num: 30, rating: 2.5,
    effect: "Cures status conditions when switching out.",
    onSwitchOut(ctx) {
      if (!ctx.pokemon.status) return;
      ctx.add("-curestatus", ctx.pokemon, ctx.pokemon.status, "[from] ability: Natural Cure", "[silent]");
      ctx.cureStatus(ctx.pokemon);
    },
  },

  "Lightning Rod": {
    name: "Lightning Rod", num: 31, rating: 3,
    effect: "Draws Electric moves; immune to them; +1 SpA when hit.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Electric") {
        if (!ctx.boost(ctx.pokemon, { spa: 1 }))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Lightning Rod");
        return false;
      }
    },
    onAnyRedirectTarget(ctx, move) {
      if (move.type !== "Electric" || (move.flags && move.flags.pledgecombo)) return;
      return ctx.pokemon;
    },
  },

  "Serene Grace": {
    name: "Serene Grace", num: 32, rating: 3.5,
    effect: "Doubles the chance of secondary effects.",
    onModifyMove(move) {
      if (move.secondaries) for (const s of move.secondaries) if (s.chance) s.chance *= 2;
      if (move.self && move.self.chance) move.self.chance *= 2;
    },
  },

  "Swift Swim": {
    name: "Swift Swim", num: 33, rating: 3,
    effect: "Doubles Speed in rain.",
    onModifySpe(ctx, spe) {
      if (ctx.isWeather(["RainDance", "PrimordialSea"])) return ctx.chainModify(spe, 2);
    },
  },

  "Chlorophyll": {
    name: "Chlorophyll", num: 34, rating: 3,
    effect: "Doubles Speed in sun.",
    onModifySpe(ctx, spe) {
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) return ctx.chainModify(spe, 2);
    },
  },

  "Illuminate": {
    name: "Illuminate", num: 35, rating: 0.5,
    effect: "No in-battle effect (accuracy cannot be lowered).",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost) {
      if (ctx.source && ctx.target === ctx.source) return;
      if (boost.accuracy && boost.accuracy < 0) {
        delete boost.accuracy;
        ctx.add("-fail", ctx.pokemon, "unboost", "accuracy", "[from] ability: Illuminate");
      }
    },
    onModifyMove(move) { move.ignoreEvasion = true; },
  },

  "Trace": {
    name: "Trace", num: 36, rating: 2.5,
    effect: "Copies an opposing Pokémon's ability on switch-in.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
    onSwitchIn(ctx) {
      const targets = ctx.foes().filter(t => !t.getAbility().flags.notrace && t.ability !== "No Ability");
      if (!targets.length) return;
      const target = ctx.sample(targets);
      ctx.pokemon.setAbility(target.getAbility(), target);
    },
  },

  "Huge Power": {
    name: "Huge Power", num: 37, rating: 5,
    effect: "Doubles Attack.",
    onModifyAtk(ctx, atk) { return ctx.chainModify(atk, 2); },
  },

  "Poison Point": {
    name: "Poison Point", num: 38, rating: 1.5,
    effect: "30% chance to poison on contact.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon)) {
        if (ctx.randomChance(3, 10)) ctx.source.trySetStatus("psn", ctx.pokemon);
      }
    },
  },

  "Inner Focus": {
    name: "Inner Focus", num: 39, rating: 1,
    effect: "Cannot flinch. Blocks Intimidate's Attack drop.",
    flags: { breakable: 1 },
    onTryAddVolatile(ctx, status) { if (status.id === "flinch") return false; },
    onTryBoost(ctx, boost, effect) {
      if (effect && effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        ctx.add("-fail", ctx.pokemon, "unboost", "atk", "[from] ability: Inner Focus");
      }
    },
  },

  "Magma Armor": {
    name: "Magma Armor", num: 40, rating: 0.5,
    effect: "Cannot be frozen.",
    flags: { breakable: 1 },
    onImmunity(ctx, type) { if (type === "frz") return false; },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "frz") { ctx.add("-activate", ctx.pokemon, "ability: Magma Armor"); ctx.cureStatus(ctx.pokemon); }
    },
  },

  "Water Veil": {
    name: "Water Veil", num: 41, rating: 2,
    effect: "Cannot be burned.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (status.id !== "brn") return;
      if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Water Veil");
      return false;
    },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "brn") { ctx.add("-activate", ctx.pokemon, "ability: Water Veil"); ctx.cureStatus(ctx.pokemon); }
    },
  },

  "Magnet Pull": {
    name: "Magnet Pull", num: 42, rating: 4,
    effect: "Traps adjacent Steel-type foes.",
    onFoeTrapPokemon(ctx, foe) {
      if (foe.hasType("Steel") && foe.isAdjacent(ctx.pokemon)) foe.tryTrap(true);
    },
  },

  "Soundproof": {
    name: "Soundproof", num: 43, rating: 2,
    effect: "Immune to sound-based moves.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.flags && move.flags.sound) {
        ctx.add("-immune", ctx.pokemon, "[from] ability: Soundproof"); return false;
      }
    },
    onAllyTryHitSide(ctx, move) {
      if (move.flags && move.flags.sound) ctx.add("-immune", ctx.pokemon, "[from] ability: Soundproof");
    },
  },

  "Rain Dish": {
    name: "Rain Dish", num: 44, rating: 1.5,
    effect: "Heals 1/16 max HP per turn in rain.",
    onWeather(ctx, effect) {
      if (!ctx.isWeather(["RainDance", "PrimordialSea"])) return;
      ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 16);
    },
  },

  "Sand Stream": {
    name: "Sand Stream", num: 45, rating: 4,
    effect: "On switch-in, summons Sandstorm.",
    onSwitchIn(ctx) { ctx.setWeather("Sandstorm"); },
  },

  "Pressure": {
    name: "Pressure", num: 46, rating: 2.5,
    effect: "Foes' moves targeting this Pokémon use 2 PP.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Pressure"); },
    onDeductPP(ctx) { if (!ctx.source.isAlly(ctx.pokemon)) return 1; },
  },

  "Thick Fat": {
    name: "Thick Fat", num: 47, rating: 3.5,
    effect: "Halves damage from Fire and Ice moves.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) {
      if (move.type === "Fire" || move.type === "Ice") return ctx.chainModify(damage, 0.5);
    },
  },

  "Early Bird": {
    name: "Early Bird", num: 48, rating: 1.5,
    effect: "Sleep counter decrements twice as fast.",
    sleepMultiplier: 2,
  },

  "Flame Body": {
    name: "Flame Body", num: 49, rating: 2,
    effect: "30% chance to burn on contact.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon)) {
        if (ctx.randomChance(3, 10)) ctx.source.trySetStatus("brn", ctx.pokemon);
      }
    },
  },

  "Run Away": {
    name: "Run Away", num: 50, rating: 0,
    effect: "Always flees from wild battles (no battle effect).",
  },

  "Keen Eye": {
    name: "Keen Eye", num: 51, rating: 0.5,
    effect: "Ignores foes' evasion; accuracy cannot be lowered.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost) {
      if (ctx.source && ctx.target === ctx.source) return;
      if (boost.accuracy && boost.accuracy < 0) {
        delete boost.accuracy;
        ctx.add("-fail", ctx.pokemon, "unboost", "accuracy", "[from] ability: Keen Eye");
      }
    },
    onModifyMove(move) { move.ignoreEvasion = true; },
  },

  "Hyper Cutter": {
    name: "Hyper Cutter", num: 52, rating: 1.5,
    effect: "Attack cannot be lowered by foes.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost) {
      if (ctx.source && ctx.target === ctx.source) return;
      if (boost.atk && boost.atk < 0) {
        delete boost.atk;
        ctx.add("-fail", ctx.pokemon, "unboost", "atk", "[from] ability: Hyper Cutter");
      }
    },
  },

  "Pickup": {
    name: "Pickup", num: 53, rating: 0.5,
    effect: "May pick up a used item at end of turn.",
    onResidual(ctx) {
      if (ctx.pokemon.item) return;
      const targets = ctx.getAllActive().filter(t =>
        t.lastItem && t.usedItemThisTurn && ctx.pokemon.isAdjacent(t));
      if (!targets.length) return;
      const t = ctx.sample(targets);
      const item = t.lastItem;
      t.lastItem = "";
      ctx.add("-item", ctx.pokemon, ctx.dex.items.get(item), "[from] ability: Pickup");
      ctx.setItem(ctx.pokemon, item);
    },
  },

  "Truant": {
    name: "Truant", num: 54, rating: -1,
    effect: "Skips every other turn.",
    onBeforeMove(ctx) {
      if (ctx.pokemon.removeVolatile("truant")) {
        ctx.add("cant", ctx.pokemon, "ability: Truant"); return false;
      }
      ctx.pokemon.addVolatile("truant");
    },
    condition: {},
  },

  "Hustle": {
    name: "Hustle", num: 55, rating: 3.5,
    effect: "1.5× Attack; physical moves have 0.8× accuracy.",
    onModifyAtk(ctx, atk) { return ctx.modify(atk, 1.5); },
    onModifyAccuracy(ctx, accuracy, move) {
      if (move.category === "Physical" && typeof accuracy === "number")
        return ctx.chainModify(accuracy, 0.8);
    },
  },

  "Cute Charm": {
    name: "Cute Charm", num: 56, rating: 0.5,
    effect: "30% chance to infatuate contact attackers.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon)) {
        if (ctx.randomChance(3, 10)) ctx.source.addVolatile("attract", ctx.pokemon);
      }
    },
  },

  "Plus": {
    name: "Plus", num: 57, rating: 0,
    effect: "1.5× SpA if an ally has Plus or Minus.",
    onModifySpA(ctx, spa) {
      for (const ally of ctx.allies()) if (ally.hasAbility(["Plus", "Minus"])) return ctx.chainModify(spa, 1.5);
    },
  },

  "Minus": {
    name: "Minus", num: 58, rating: 0,
    effect: "1.5× SpA if an ally has Plus or Minus.",
    onModifySpA(ctx, spa) {
      for (const ally of ctx.allies()) if (ally.hasAbility(["Plus", "Minus"])) return ctx.chainModify(spa, 1.5);
    },
  },

  "Forecast": {
    name: "Forecast", num: 59, rating: 2,
    effect: "Castform changes form based on the weather.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
    onSwitchIn(ctx) { ctx.singleEvent("WeatherChange", ctx.pokemon); },
    onWeatherChange(ctx) {
      const p = ctx.pokemon;
      if (p.baseSpecies.baseSpecies !== "Castform" || p.transformed) return;
      let forme = null;
      const w = ctx.field.effectiveWeather();
      if (["SunnyDay", "DesolateLand"].includes(w) && p.species.id !== "Castform-Sunny") forme = "Castform-Sunny";
      else if (["RainDance", "PrimordialSea"].includes(w) && p.species.id !== "Castform-Rainy") forme = "Castform-Rainy";
      else if (w === "Hail" && p.species.id !== "Castform-Snowy") forme = "Castform-Snowy";
      else if (!["SunnyDay","DesolateLand","RainDance","PrimordialSea","Hail"].includes(w) && p.species.id !== "Castform") forme = "Castform";
      if (p.isActive && forme) ctx.formeChange(p, forme, this, false, "[msg]");
    },
  },

  "Sticky Hold": {
    name: "Sticky Hold", num: 60, rating: 1.5,
    effect: "Held item cannot be removed by foes.",
    flags: { breakable: 1 },
    onTakeItem(ctx, item, source) {
      if (!ctx.pokemon.hp || ctx.pokemon.item === "stickybarb") return;
      if ((source && source !== ctx.pokemon) || (ctx.move && ctx.move.id === "knockoff")) {
        ctx.add("-activate", ctx.pokemon, "ability: Sticky Hold"); return false;
      }
    },
  },

  "Shed Skin": {
    name: "Shed Skin", num: 61, rating: 3,
    effect: "33% chance to cure status at end of turn.",
    onResidual(ctx) {
      if (ctx.pokemon.hp && ctx.pokemon.status && ctx.randomChance(33, 100)) {
        ctx.add("-activate", ctx.pokemon, "ability: Shed Skin");
        ctx.cureStatus(ctx.pokemon);
      }
    },
  },

  "Guts": {
    name: "Guts", num: 62, rating: 3.5,
    effect: "1.5× Attack when affected by a status condition. Ignores burn halving.",
    onModifyAtk(ctx, atk) { if (ctx.pokemon.status) return ctx.chainModify(atk, 1.5); },
  },

  "Marvel Scale": {
    name: "Marvel Scale", num: 63, rating: 2.5,
    effect: "1.5× Defense when affected by a status condition.",
    flags: { breakable: 1 },
    onModifyDef(ctx, def) { if (ctx.pokemon.status) return ctx.chainModify(def, 1.5); },
  },

  "Liquid Ooze": {
    name: "Liquid Ooze", num: 64, rating: 2.5,
    effect: "Draining moves damage the user instead of healing.",
    onSourceTryHeal(ctx, damage, effect) {
      const canOoze = ["drain", "leechseed", "strengthsap"];
      if (canOoze.includes(effect.id)) { ctx.damage(ctx.source, damage); return 0; }
    },
  },

  "Overgrow": {
    name: "Overgrow", num: 65, rating: 2,
    effect: "1.5× Grass moves at ≤1/3 max HP.",
    onModifyAtk(ctx, atk, move) {
      if (move.type === "Grass" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(atk, 1.5);
    },
    onModifySpA(ctx, spa, move) {
      if (move.type === "Grass" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(spa, 1.5);
    },
  },

  "Blaze": {
    name: "Blaze", num: 66, rating: 2,
    effect: "1.5× Fire moves at ≤1/3 max HP.",
    onModifyAtk(ctx, atk, move) {
      if (move.type === "Fire" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(atk, 1.5);
    },
    onModifySpA(ctx, spa, move) {
      if (move.type === "Fire" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(spa, 1.5);
    },
  },

  "Torrent": {
    name: "Torrent", num: 67, rating: 2,
    effect: "1.5× Water moves at ≤1/3 max HP.",
    onModifyAtk(ctx, atk, move) {
      if (move.type === "Water" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(atk, 1.5);
    },
    onModifySpA(ctx, spa, move) {
      if (move.type === "Water" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(spa, 1.5);
    },
  },

  "Swarm": {
    name: "Swarm", num: 68, rating: 2,
    effect: "1.5× Bug moves at ≤1/3 max HP.",
    onModifyAtk(ctx, atk, move) {
      if (move.type === "Bug" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(atk, 1.5);
    },
    onModifySpA(ctx, spa, move) {
      if (move.type === "Bug" && ctx.pokemon.hp <= ctx.pokemon.maxhp / 3) return ctx.chainModify(spa, 1.5);
    },
  },

  "Rock Head": {
    name: "Rock Head", num: 69, rating: 3,
    effect: "Does not take recoil damage.",
    onDamage(ctx, damage, effect) {
      if (effect.id === "recoil") {
        if (ctx.move && ctx.move.id !== "struggle") return false;
      }
    },
  },

  "Drought": {
    name: "Drought", num: 70, rating: 4,
    effect: "On switch-in, summons Sunny Day.",
    onSwitchIn(ctx) { ctx.setWeather("SunnyDay"); },
  },

  "Arena Trap": {
    name: "Arena Trap", num: 71, rating: 5,
    effect: "Traps adjacent grounded foes (except Flying/Levitate).",
    onFoeTrapPokemon(ctx, foe) {
      if (!foe.isAdjacent(ctx.pokemon)) return;
      if (foe.isGrounded()) foe.tryTrap(true);
    },
  },

  "Vital Spirit": {
    name: "Vital Spirit", num: 72, rating: 1.5,
    effect: "Cannot fall asleep; Yawn fails.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (status.id !== "slp") return;
      if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Vital Spirit");
      return false;
    },
    onTryAddVolatile(ctx, status) {
      if (status.id === "yawn") { ctx.add("-immune", ctx.pokemon, "[from] ability: Vital Spirit"); return false; }
    },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "slp") { ctx.add("-activate", ctx.pokemon, "ability: Vital Spirit"); ctx.cureStatus(ctx.pokemon); }
    },
  },

  "White Smoke": {
    name: "White Smoke", num: 73, rating: 2,
    effect: "Foes cannot lower this Pokémon's stats.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost, effect) {
      if (ctx.source && ctx.target === ctx.source) return;
      let showMsg = false;
      for (const k in boost) if (boost[k] < 0) { delete boost[k]; showMsg = true; }
      if (showMsg && !(effect && effect.secondaries) && effect.id !== "octolock")
        ctx.add("-fail", ctx.pokemon, "unboost", "[from] ability: White Smoke");
    },
  },

  "Pure Power": {
    name: "Pure Power", num: 74, rating: 5,
    effect: "Doubles Attack.",
    onModifyAtk(ctx, atk) { return ctx.chainModify(atk, 2); },
  },

  "Shell Armor": {
    name: "Shell Armor", num: 75, rating: 1,
    effect: "Cannot be struck by a critical hit.",
    flags: { breakable: 1 },
    onCriticalHit: () => false,
  },

  "Air Lock": {
    name: "Air Lock", num: 76, rating: 1.5,
    effect: "Suppresses all weather effects on the field.",
    suppressWeather: true,
    onSwitchIn(ctx) { ctx.add("-ability", ctx.pokemon, "Air Lock"); ctx.singleEvent("WeatherChange", ctx.pokemon); },
    onEnd(ctx) { ctx.singleEvent("WeatherChange", ctx.pokemon); },
  },

  // ==================================================================
  // Gen 3
  // ==================================================================
  "Tangled Feet": {
    name: "Tangled Feet", num: 77, rating: 1,
    effect: "Doubles evasiveness while confused.",
    flags: { breakable: 1 },
    onModifyAccuracy(ctx, accuracy) {
      if (typeof accuracy !== "number") return;
      if (ctx.pokemon.volatiles.confusion) return ctx.chainModify(accuracy, 0.5);
    },
  },

  "Motor Drive": {
    name: "Motor Drive", num: 78, rating: 3,
    effect: "Immune to Electric; +1 Speed when hit by Electric.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Electric") {
        if (!ctx.boost(ctx.pokemon, { spe: 1 }))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Motor Drive");
        return false;
      }
    },
  },

  "Rivalry": {
    name: "Rivalry", num: 79, rating: 0,
    effect: "1.25× damage vs same gender; 0.75× vs opposite gender.",
    onBasePower(ctx, power, move) {
      const atk = ctx.pokemon, def = ctx.target;
      if (!atk.gender || !def.gender) return;
      if (atk.gender === def.gender) return ctx.chainModify(power, 1.25);
      return ctx.chainModify(power, 0.75);
    },
  },

  "Steadfast": {
    name: "Steadfast", num: 80, rating: 1,
    effect: "+1 Speed each time this Pokémon flinches.",
    onFlinch(ctx) { ctx.boost(ctx.pokemon, { spe: 1 }); },
  },

  "Snow Cloak": {
    name: "Snow Cloak", num: 81, rating: 1.5,
    effect: "In hail, evasiveness is 1.25×; immune to hail damage.",
    flags: { breakable: 1 },
    onImmunity(ctx, type) { if (type === "hail") return false; },
    onModifyAccuracy(ctx, accuracy) {
      if (typeof accuracy !== "number") return;
      if (ctx.isWeather("Hail")) return ctx.chainModify(accuracy, 0.8);
    },
  },

  "Gluttony": {
    name: "Gluttony", num: 82, rating: 1.5,
    effect: "Eats berries at 50% HP instead of 25%.",
    onStart(ctx) { ctx.pokemon.abilityState.gluttony = true; },
  },

  "Anger Point": {
    name: "Anger Point", num: 83, rating: 1,
    effect: "Maximizes Attack when struck by a critical hit.",
    onDamagingHit(ctx, move) {
      if (!ctx.pokemon.hp) return;
      if (move.effectType === "Move" && ctx.pokemon.getMoveHitData(move).crit)
        ctx.boost(ctx.pokemon, { atk: 12 }, ctx.pokemon);
    },
  },

  "Unburden": {
    name: "Unburden", num: 84, rating: 3.5,
    effect: "Doubles Speed when its held item is used or lost.",
    onAfterUseItem(ctx) { ctx.pokemon.addVolatile("unburden"); },
    onTakeItem(ctx) { ctx.pokemon.addVolatile("unburden"); },
    onEnd(ctx) { ctx.pokemon.removeVolatile("unburden"); },
    condition: {
      onModifySpe(ctx, spe) {
        if (!ctx.pokemon.item && !ctx.pokemon.ignoringAbility())
          return ctx.chainModify(spe, 2);
      },
    },
  },

  "Heatproof": {
    name: "Heatproof", num: 85, rating: 2,
    effect: "Halves Fire damage; halves burn damage.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) {
      if (move.type === "Fire") return ctx.chainModify(damage, 0.5);
    },
    onDamage(ctx, damage, effect) {
      if (effect && effect.id === "brn") return damage / 2;
    },
  },

  "Simple": {
    name: "Simple", num: 86, rating: 4,
    effect: "Doubles all stat stage changes affecting this Pokémon.",
    flags: { breakable: 1 },
    onChangeBoost(ctx, boost, effect) {
      if (effect && effect.id === "zpower") return;
      for (const k in boost) boost[k] *= 2;
    },
  },

  "Dry Skin": {
    name: "Dry Skin", num: 87, rating: 3,
    effect: "Immune to Water (heals 1/4). Fire does 1.25×. Loses 1/8 HP in sun; heals 1/8 in rain.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Water") {
        if (!ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 4))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Dry Skin");
        return false;
      }
    },
    onSourceModifyDamage(ctx, damage, move) {
      if (move.type === "Fire") return ctx.chainModify(damage, 1.25);
    },
    onWeather(ctx) {
      if (ctx.isWeather(["RainDance", "PrimordialSea"])) ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 8);
      else if (ctx.isWeather(["SunnyDay", "DesolateLand"])) ctx.damage(ctx.pokemon, ctx.pokemon.baseMaxhp / 8, ctx.pokemon);
    },
  },

  "Download": {
    name: "Download", num: 88, rating: 3.5,
    effect: "On switch-in, boosts Attack or SpA based on foe's lower defense.",
    onSwitchIn(ctx) {
      let totaldef = 0, totalspd = 0;
      for (const t of ctx.foes()) {
        totaldef += t.getStat("def", false, true);
        totalspd += t.getStat("spd", false, true);
      }
      if (totaldef && totaldef >= totalspd) ctx.boost(ctx.pokemon, { spa: 1 });
      else if (totalspd) ctx.boost(ctx.pokemon, { atk: 1 });
    },
  },

  "Iron Fist": {
    name: "Iron Fist", num: 89, rating: 3,
    effect: "1.2× power on punching moves.",
    onBasePower(ctx, power, move) {
      if (move.flags && move.flags.punch) return ctx.chainModify(power, 1.2);
    },
  },

  "Poison Heal": {
    name: "Poison Heal", num: 90, rating: 4,
    effect: "Heals 1/8 max HP per turn instead of taking poison damage.",
    onDamage(ctx, damage, effect) {
      if (effect.id === "psn" || effect.id === "tox") {
        ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 8);
        return false;
      }
    },
  },

  "Adaptability": {
    name: "Adaptability", num: 91, rating: 4,
    effect: "STAB multiplier is 2× instead of 1.5×.",
    onModifySTAB(ctx, stab, move) {
      if (move.forceSTAB || ctx.pokemon.hasType(move.type)) {
        return stab === 2 ? 2.25 : 2;
      }
    },
  },

  "Skill Link": {
    name: "Skill Link", num: 92, rating: 3,
    effect: "Multi-hit moves always hit the maximum number of times.",
    onModifyMove(move) {
      if (move.multihit && Array.isArray(move.multihit) && move.multihit.length)
        move.multihit = move.multihit[1];
      if (move.multiaccuracy) delete move.multiaccuracy;
    },
  },

  "Hydration": {
    name: "Hydration", num: 93, rating: 1.5,
    effect: "Cures status at end of turn in rain.",
    onResidual(ctx) {
      if (ctx.pokemon.status && ctx.isWeather(["RainDance", "PrimordialSea"])) {
        ctx.add("-activate", ctx.pokemon, "ability: Hydration");
        ctx.cureStatus(ctx.pokemon);
      }
    },
  },

  "Solar Power": {
    name: "Solar Power", num: 94, rating: 2,
    effect: "1.5× SpA in sun; loses 1/8 max HP per turn in sun.",
    onModifySpA(ctx, spa) {
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) return ctx.chainModify(spa, 1.5);
    },
    onWeather(ctx) {
      if (ctx.isWeather(["SunnyDay", "DesolateLand"]))
        ctx.damage(ctx.pokemon, ctx.pokemon.baseMaxhp / 8, ctx.pokemon);
    },
  },

  "Quick Feet": {
    name: "Quick Feet", num: 95, rating: 2.5,
    effect: "1.5× Speed when affected by a status condition. Ignores paralysis speed drop.",
    onModifySpe(ctx, spe) {
      if (ctx.pokemon.status) return ctx.chainModify(spe, 1.5);
    },
  },

  "Normalize": {
    name: "Normalize", num: 96, rating: 0,
    effect: "All moves become Normal type.",
    onModifyType(ctx, move) {
      const noModifyType = ["hiddenpower","judgment","multiattack","naturalgift","revelationdance","struggle","technoblast","terrainpulse","weatherball"];
      if (!noModifyType.includes(move.id)) {
        move.type = "Normal";
        move.typeChangerBoosted = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.typeChangerBoosted) return ctx.chainModify(power, 1.2);
    },
  },

  "Sniper": {
    name: "Sniper", num: 97, rating: 2,
    effect: "1.5× damage on critical hits.",
    onModifyDamage(ctx, damage, move) {
      if (ctx.target.getMoveHitData(move).crit) return ctx.chainModify(damage, 1.5);
    },
  },

  "Magic Guard": {
    name: "Magic Guard", num: 98, rating: 4,
    effect: "Only takes damage from direct attacks.",
    onDamage(ctx, damage, effect) {
      if (effect.effectType !== "Move") {
        if (effect.effectType === "Ability") ctx.add("-activate", ctx.source, "ability: " + effect.name);
        return false;
      }
    },
  },

  "No Guard": {
    name: "No Guard", num: 99, rating: 4,
    effect: "All moves used by or against this Pokémon never miss.",
    onAnyAccuracy(ctx, accuracy, move) {
      if (move && (ctx.source === ctx.pokemon || ctx.target === ctx.pokemon)) return true;
      return accuracy;
    },
    onAnyInvulnerability(ctx, move) {
      if (move && (ctx.source === ctx.pokemon || ctx.target === ctx.pokemon)) return 0;
    },
  },

  "Stall": {
    name: "Stall", num: 100, rating: -1,
    effect: "Always moves last within its priority bracket.",
    onFractionalPriority: () => -0.1,
  },

  "Technician": {
    name: "Technician", num: 101, rating: 3.5,
    effect: "1.5× power on moves with 60 or less base power.",
    onBasePower(ctx, power, move) {
      if (power <= 60) return ctx.chainModify(power, 1.5);
    },
  },

  "Leaf Guard": {
    name: "Leaf Guard", num: 102, rating: 0.5,
    effect: "Cannot be statused in sun.",
    flags: { breakable: 1 },
    onSetStatus(ctx, status) {
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) {
        if (ctx.effect && ctx.effect.status) ctx.add("-immune", ctx.pokemon, "[from] ability: Leaf Guard");
        return false;
      }
    },
    onTryAddVolatile(ctx, status) {
      if (status.id === "yawn" && ctx.isWeather(["SunnyDay", "DesolateLand"])) {
        ctx.add("-immune", ctx.pokemon, "[from] ability: Leaf Guard"); return false;
      }
    },
  },

  "Klutz": {
    name: "Klutz", num: 103, rating: -1,
    effect: "Held item has no effect.",
    onStart(ctx) { ctx.singleEvent("End", ctx.pokemon.getItem(), ctx.pokemon); },
    // Engine should also ignore item in Pokemon.ignoringItem().
  },

  "Mold Breaker": {
    name: "Mold Breaker", num: 104, rating: 3,
    effect: "Ignores the target's ability when attacking.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Mold Breaker"); },
    onModifyMove(move) { move.ignoreAbility = true; },
  },

  "Super Luck": {
    name: "Super Luck", num: 105, rating: 1.5,
    effect: "+1 critical hit ratio.",
    onModifyCritRatio(ctx, ratio) { return ratio + 1; },
  },

  "Aftermath": {
    name: "Aftermath", num: 106, rating: 2,
    effect: "Contact attackers lose 1/4 max HP when this Pokémon faints.",
    onDamagingHit(ctx, move) {
      if (!ctx.pokemon.hp && ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, true))
        ctx.damage(ctx.source, ctx.source.baseMaxhp / 4, ctx.pokemon);
    },
  },

  "Anticipation": {
    name: "Anticipation", num: 107, rating: 0.5,
    effect: "Alerts if any foe has a super-effective or OHKO move.",
    onSwitchIn(ctx) {
      for (const foe of ctx.foes()) {
        for (const slot of foe.moveSlots) {
          const move = ctx.dex.moves.get(slot.move);
          if (move.category === "Status") continue;
          const mt = move.id === "hiddenpower" ? foe.hpType : move.type;
          if ((ctx.dex.getImmunity(mt, ctx.pokemon) && ctx.dex.getEffectiveness(mt, ctx.pokemon) > 0) || move.ohko) {
            ctx.add("-ability", ctx.pokemon, "Anticipation"); return;
          }
        }
      }
    },
  },

  "Forewarn": {
    name: "Forewarn", num: 108, rating: 0.5,
    effect: "Reveals the foe's strongest move on switch-in.",
    onSwitchIn(ctx) {
      let warnMoves = [], warnBp = 1;
      for (const foe of ctx.foes()) {
        for (const slot of foe.moveSlots) {
          const move = ctx.dex.moves.get(slot.move);
          let bp = move.basePower;
          if (move.ohko) bp = 150;
          if (["counter","metalburst","mirrorcoat"].includes(move.id)) bp = 120;
          if (bp === 1) bp = 80;
          if (!bp && move.category !== "Status") bp = 80;
          if (bp > warnBp) { warnMoves = [[move, foe]]; warnBp = bp; }
          else if (bp === warnBp) warnMoves.push([move, foe]);
        }
      }
      if (!warnMoves.length) return;
      const [mv, tg] = ctx.sample(warnMoves);
      ctx.add("-activate", ctx.pokemon, "ability: Forewarn", mv, "[of] " + tg);
    },
  },

  "Unaware": {
    name: "Unaware", num: 109, rating: 4,
    effect: "Ignores the foe's stat stage changes in damage calc.",
    flags: { breakable: 1 },
    onAnyModifyBoost(ctx, boosts) {
      const u = ctx.pokemon;
      if (u === ctx.target) {
        if (u === ctx.activePokemon && ctx.target === ctx.activeTarget) {
          boosts.def = 0; boosts.spd = 0; boosts.evasion = 0;
        }
      }
      if (u === ctx.source) {
        if (ctx.source === ctx.activePokemon && u === ctx.activeTarget) {
          boosts.atk = 0; boosts.def = 0; boosts.spa = 0; boosts.accuracy = 0;
        }
      }
    },
  },

  "Tinted Lens": {
    name: "Tinted Lens", num: 110, rating: 4,
    effect: "Doubles damage on not-very-effective moves.",
    onModifyDamage(ctx, damage, move) {
      if (ctx.target.getMoveHitData(move).typeMod < 0) return ctx.chainModify(damage, 2);
    },
  },

  "Filter": {
    name: "Filter", num: 111, rating: 3,
    effect: "0.75× damage from super-effective moves.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) {
      if (ctx.target.getMoveHitData(move).typeMod > 0) return ctx.chainModify(damage, 0.75);
    },
  },

  "Slow Start": {
    name: "Slow Start", num: 112, rating: -1,
    effect: "Halves Attack and Speed for the first 5 turns on the field.",
    onStart(ctx) { ctx.add("-start", ctx.pokemon, "ability: Slow Start"); ctx.pokemon.abilityState.counter = 5; },
    onResidual(ctx) {
      const s = ctx.pokemon.abilityState;
      if (ctx.pokemon.activeTurns && s.counter) {
        s.counter--;
        if (!s.counter) { ctx.add("-end", ctx.pokemon, "Slow Start"); delete s.counter; }
      }
    },
    onModifyAtk(ctx, atk) { if (ctx.pokemon.abilityState.counter) return ctx.chainModify(atk, 0.5); },
    onModifySpe(ctx, spe) { if (ctx.pokemon.abilityState.counter) return ctx.chainModify(spe, 0.5); },
  },

  "Scrappy": {
    name: "Scrappy", num: 113, rating: 3,
    effect: "Can hit Ghost types with Normal and Fighting moves. Blocks Intimidate.",
    onModifyMove(move) {
      if (!move.ignoreImmunity) move.ignoreImmunity = {};
      if (move.ignoreImmunity !== true) {
        move.ignoreImmunity["Fighting"] = true;
        move.ignoreImmunity["Normal"] = true;
      }
    },
    onTryBoost(ctx, boost, effect) {
      if (effect && effect.name === "Intimidate" && boost.atk) {
        delete boost.atk;
        ctx.add("-fail", ctx.pokemon, "unboost", "atk", "[from] ability: Scrappy");
      }
    },
  },

  "Storm Drain": {
    name: "Storm Drain", num: 114, rating: 3,
    effect: "Draws Water moves; immune to Water; +1 SpA when hit.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Water") {
        if (!ctx.boost(ctx.pokemon, { spa: 1 }))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Storm Drain");
        return false;
      }
    },
    onAnyRedirectTarget(ctx, move) {
      if (move.type !== "Water" || (move.flags && move.flags.pledgecombo)) return;
      return ctx.pokemon;
    },
  },

  "Ice Body": {
    name: "Ice Body", num: 115, rating: 1,
    effect: "Heals 1/16 max HP per turn in hail; immune to hail damage.",
    onWeather(ctx, effect) { if (ctx.isWeather("Hail")) ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 16); },
    onImmunity(ctx, type) { if (type === "hail") return false; },
  },

  "Solid Rock": {
    name: "Solid Rock", num: 116, rating: 3,
    effect: "0.75× damage from super-effective moves.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) {
      if (ctx.target.getMoveHitData(move).typeMod > 0) return ctx.chainModify(damage, 0.75);
    },
  },

  "Snow Warning": {
    name: "Snow Warning", num: 117, rating: 4,
    effect: "On switch-in, summons Hail.",
    onSwitchIn(ctx) { ctx.setWeather("Hail"); },
  },

  "Honey Gather": {
    name: "Honey Gather", num: 118, rating: 0,
    effect: "May collect Honey after battle (no in-battle effect).",
  },

  "Frisk": {
    name: "Frisk", num: 119, rating: 1.5,
    effect: "Reveals foes' held items on switch-in.",
    onSwitchIn(ctx) {
      for (const foe of ctx.foes()) if (foe.item)
        ctx.add("-item", foe, foe.getItem().name, "[from] ability: Frisk", "[of] " + ctx.pokemon);
    },
  },

  "Reckless": {
    name: "Reckless", num: 120, rating: 3,
    effect: "1.2× power on moves with recoil or crash damage.",
    onBasePower(ctx, power, move) {
      if (move.recoil || move.hasCrashDamage) return ctx.chainModify(power, 1.2);
    },
  },

  "Multitype": {
    name: "Multitype", num: 121, rating: 4,
    effect: "Arceus's type matches its held Plate.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
  },

  "Flower Gift": {
    name: "Flower Gift", num: 122, rating: 1,
    effect: "In sun, boosts self and allies' Attack and SpD by 1.5×.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, breakable: 1 },
    onSwitchIn(ctx) { ctx.singleEvent("WeatherChange", ctx.pokemon); },
    onWeatherChange(ctx) {
      const p = ctx.pokemon;
      if (p.baseSpecies.baseSpecies !== "Cherrim" || p.transformed || !p.hp) return;
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) {
        if (p.species.id !== "Cherrim-Sunshine") ctx.formeChange(p, "Cherrim-Sunshine", this, false, "[msg]");
      } else {
        if (p.species.id === "Cherrim-Sunshine") ctx.formeChange(p, "Cherrim", this, false, "[msg]");
      }
    },
    onAllyModifyAtk(ctx, atk) {
      if (ctx.pokemon.baseSpecies.baseSpecies !== "Cherrim") return;
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) return ctx.chainModify(atk, 1.5);
    },
    onAllyModifySpD(ctx, spd) {
      if (ctx.pokemon.baseSpecies.baseSpecies !== "Cherrim") return;
      if (ctx.isWeather(["SunnyDay", "DesolateLand"])) return ctx.chainModify(spd, 1.5);
    },
  },

  "Bad Dreams": {
    name: "Bad Dreams", num: 123, rating: 1.5,
    effect: "Sleeping foes lose 1/8 max HP per turn.",
    onResidual(ctx) {
      if (!ctx.pokemon.hp) return;
      for (const t of ctx.foes())
        if (t.status === "slp") ctx.damage(t, t.baseMaxhp / 8, ctx.pokemon);
    },
  },

  // ==================================================================
  // Gen 4
  // ==================================================================
  "Pickpocket": {
    name: "Pickpocket", num: 124, rating: 1,
    effect: "Steals the attacker's item on contact.",
    onAfterMoveSecondary(ctx, move) {
      const src = ctx.source;
      if (src && src !== ctx.pokemon && move && move.flags && move.flags.contact) {
        if (ctx.pokemon.item || ctx.pokemon.switchFlag) return;
        const it = ctx.takeItem(src, ctx.pokemon);
        if (!it) return;
        if (!ctx.setItem(ctx.pokemon, it)) { src.item = it.id; return; }
        ctx.add("-item", ctx.pokemon, it, "[from] ability: Pickpocket", "[of] " + src);
      }
    },
  },

  "Sheer Force": {
    name: "Sheer Force", num: 125, rating: 3.5,
    effect: "1.3× power on moves with secondary effects; removes them.",
    onModifyMove(move) {
      if (move.secondaries && !move.hasSheerForceBoost) {
        delete move.secondaries;
        delete move.self;
        move.hasSheerForce = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.hasSheerForce || move.hasSheerForceBoost) return ctx.chainModify(power, 1.3);
    },
  },

  "Contrary": {
    name: "Contrary", num: 126, rating: 4.5,
    effect: "Inverts all stat stage changes.",
    flags: { breakable: 1 },
    onChangeBoost(ctx, boost, effect) {
      if (effect && effect.id === "zpower") return;
      for (const k in boost) boost[k] *= -1;
    },
  },

  "Unnerve": {
    name: "Unnerve", num: 127, rating: 1,
    effect: "Foes cannot eat their held berries.",
    onSwitchIn(ctx) {
      if (ctx.pokemon.abilityState.unnerved) return;
      ctx.add("-ability", ctx.pokemon, "Unnerve");
      ctx.pokemon.abilityState.unnerved = true;
    },
    onEnd(ctx) { ctx.pokemon.abilityState.unnerved = false; },
    onFoeTryEatItem(ctx) { return !ctx.pokemon.abilityState.unnerved; },
  },

  "Defiant": {
    name: "Defiant", num: 128, rating: 3,
    effect: "+2 Attack when any stat is lowered by a foe.",
    onAfterEachBoost(ctx, boost) {
      if (!ctx.source || ctx.target.isAlly(ctx.source)) return;
      let lowered = false;
      for (const k in boost) if (boost[k] < 0) lowered = true;
      if (lowered) ctx.boost(ctx.target, { atk: 2 }, ctx.target, null, false, true);
    },
  },

  "Defeatist": {
    name: "Defeatist", num: 129, rating: -1,
    effect: "0.5× Attack and SpA at ≤1/2 max HP.",
    onModifyAtk(ctx, atk) { if (ctx.pokemon.hp <= ctx.pokemon.maxhp / 2) return ctx.chainModify(atk, 0.5); },
    onModifySpA(ctx, spa) { if (ctx.pokemon.hp <= ctx.pokemon.maxhp / 2) return ctx.chainModify(spa, 0.5); },
  },

  "Cursed Body": {
    name: "Cursed Body", num: 130, rating: 2,
    effect: "30% chance to disable the attacker's move on contact.",
    onDamagingHit(ctx, move) {
      if (ctx.source.volatiles.disable) return;
      if (!move.isMax && !(move.flags && move.flags.futuremove) && move.id !== "struggle") {
        if (ctx.randomChance(3, 10)) ctx.source.addVolatile("disable", ctx.pokemon);
      }
    },
  },

  "Healer": {
    name: "Healer", num: 131, rating: 0,
    effect: "30% chance to cure an adjacent ally's status each turn.",
    onResidual(ctx) {
      for (const ally of ctx.pokemon.adjacentAllies()) {
        if (ally.status && ctx.randomChance(3, 10)) {
          ctx.add("-activate", ctx.pokemon, "ability: Healer");
          ctx.cureStatus(ally);
        }
      }
    },
  },

  "Friend Guard": {
    name: "Friend Guard", num: 132, rating: 0,
    effect: "0.75× damage to allies.",
    flags: { breakable: 1 },
    onAnyModifyDamage(ctx, damage) {
      if (ctx.target !== ctx.pokemon && ctx.target.isAlly(ctx.pokemon)) return ctx.chainModify(damage, 0.75);
    },
  },

  "Weak Armor": {
    name: "Weak Armor", num: 133, rating: 1,
    effect: "On physical hit: −1 Def, +2 Spe.",
    onDamagingHit(ctx, move) {
      if (move.category === "Physical") ctx.boost(ctx.pokemon, { def: -1, spe: 2 }, ctx.pokemon);
    },
  },

  "Heavy Metal": {
    name: "Heavy Metal", num: 134, rating: 0,
    effect: "Doubles weight.",
    flags: { breakable: 1 },
    onModifyWeight(ctx, w) { return w * 2; },
  },

  "Light Metal": {
    name: "Light Metal", num: 135, rating: 1,
    effect: "Halves weight.",
    flags: { breakable: 1 },
    onModifyWeight(ctx, w) { return Math.trunc(w / 2); },
  },

  "Multiscale": {
    name: "Multiscale", num: 136, rating: 3.5,
    effect: "0.5× damage taken at full HP.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage) {
      if (ctx.target.hp >= ctx.target.maxhp) return ctx.chainModify(damage, 0.5);
    },
  },

  "Toxic Boost": {
    name: "Toxic Boost", num: 137, rating: 3,
    effect: "1.5× physical damage when poisoned.",
    onBasePower(ctx, power, move) {
      if ((ctx.pokemon.status === "psn" || ctx.pokemon.status === "tox") && move.category === "Physical")
        return ctx.chainModify(power, 1.5);
    },
  },

  "Flare Boost": {
    name: "Flare Boost", num: 138, rating: 2,
    effect: "1.5× special damage when burned.",
    onBasePower(ctx, power, move) {
      if (ctx.pokemon.status === "brn" && move.category === "Special") return ctx.chainModify(power, 1.5);
    },
  },

  "Harvest": {
    name: "Harvest", num: 139, rating: 2.5,
    effect: "50% chance (100% in sun) to restore its used Berry at end of turn.",
    onResidual(ctx) {
      if (ctx.isWeather(["SunnyDay", "DesolateLand"]) || ctx.randomChance(1, 2)) {
        if (ctx.pokemon.hp && !ctx.pokemon.item && ctx.dex.items.get(ctx.pokemon.lastItem).isBerry) {
          ctx.setItem(ctx.pokemon, ctx.pokemon.lastItem);
          ctx.pokemon.lastItem = "";
          ctx.add("-item", ctx.pokemon, ctx.pokemon.getItem(), "[from] ability: Harvest");
        }
      }
    },
  },

  "Telepathy": {
    name: "Telepathy", num: 140, rating: 0,
    effect: "Immune to allies' damaging moves.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && ctx.target.isAlly(ctx.source) && move.category !== "Status") {
        ctx.add("-activate", ctx.pokemon, "ability: Telepathy"); return false;
      }
    },
  },

  "Moody": {
    name: "Moody", num: 141, rating: 5,
    effect: "+2 to one random stat and −1 to another each turn.",
    onResidual(ctx) {
      const stats = [];
      const boost = {};
      const p = ctx.pokemon;
      for (const k in p.boosts) if (k !== "accuracy" && k !== "evasion" && p.boosts[k] < 6) stats.push(k);
      let r = stats.length ? ctx.sample(stats) : undefined;
      if (r) boost[r] = 2;
      const stats2 = [];
      for (const k in p.boosts) if (k !== "accuracy" && k !== "evasion" && p.boosts[k] > -6 && k !== r) stats2.push(k);
      r = stats2.length ? ctx.sample(stats2) : undefined;
      if (r) boost[r] = -1;
      ctx.boost(p, boost, p);
    },
  },

  "Overcoat": {
    name: "Overcoat", num: 142, rating: 2,
    effect: "Immune to weather damage and powder moves.",
    flags: { breakable: 1 },
    onImmunity(ctx, type) { if (["sandstorm","hail","powder"].includes(type)) return false; },
    onTryHit(ctx, move) {
      if (move.flags && move.flags.powder && ctx.target !== ctx.source
          && ctx.dex.getImmunity("powder", ctx.pokemon)) {
        ctx.add("-immune", ctx.pokemon, "[from] ability: Overcoat"); return false;
      }
    },
  },

  "Poison Touch": {
    name: "Poison Touch", num: 143, rating: 2,
    effect: "30% chance to poison the target on contact with a damaging move.",
    onSourceDamagingHit(ctx, move) {
      if (ctx.target.hasAbility("Shield Dust") || ctx.target.hasItem("covertcloak")) return;
      if (ctx.checkMoveMakesContact(move, ctx.target, ctx.pokemon)) {
        if (ctx.randomChance(3, 10)) ctx.target.trySetStatus("psn", ctx.pokemon);
      }
    },
  },

  "Regenerator": {
    name: "Regenerator", num: 144, rating: 4.5,
    effect: "Heals 1/3 max HP when switching out.",
    onSwitchOut(ctx) { ctx.pokemon.heal(ctx.pokemon.baseMaxhp / 3); },
  },

  "Big Pecks": {
    name: "Big Pecks", num: 145, rating: 0.5,
    effect: "Defense cannot be lowered by foes.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost, effect) {
      if (ctx.source && ctx.target === ctx.source) return;
      if (boost.def && boost.def < 0) {
        delete boost.def;
        if (!(effect && effect.secondaries) && effect.id !== "octolock")
          ctx.add("-fail", ctx.pokemon, "unboost", "def", "[from] ability: Big Pecks");
      }
    },
  },

  "Sand Rush": {
    name: "Sand Rush", num: 146, rating: 3,
    effect: "Doubles Speed in sandstorm; immune to sandstorm damage.",
    onModifySpe(ctx, spe) { if (ctx.isWeather("Sandstorm")) return ctx.chainModify(spe, 2); },
    onImmunity(ctx, type) { if (type === "sandstorm") return false; },
  },

  "Wonder Skin": {
    name: "Wonder Skin", num: 147, rating: 2,
    effect: "Status moves targeting this Pokémon have 50% accuracy.",
    flags: { breakable: 1 },
    onModifyAccuracy(ctx, accuracy, move) {
      if (move.category === "Status" && typeof accuracy === "number") return 50;
    },
  },

  "Analytic": {
    name: "Analytic", num: 148, rating: 2.5,
    effect: "1.3× power if this Pokémon moves last.",
    onBasePower(ctx, power) {
      let boosted = true;
      for (const t of ctx.getAllActive()) {
        if (t === ctx.pokemon) continue;
        if (ctx.queue.willMove(t)) { boosted = false; break; }
      }
      if (boosted) return ctx.chainModify(power, 1.3);
    },
  },

  "Illusion": {
    name: "Illusion", num: 149, rating: 4.5,
    effect: "Disguises itself as the last party Pokémon until hit.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
    onBeforeSwitchIn(ctx) {
      ctx.pokemon.illusion = null;
      const side = ctx.pokemon.side;
      for (let i = side.pokemon.length - 1; i > ctx.pokemon.position; i--) {
        const t = side.pokemon[i];
        if (!t.fainted) { ctx.pokemon.illusion = t; break; }
      }
    },
    onDamagingHit(ctx) {
      if (ctx.pokemon.illusion)
        ctx.singleEvent("End", ctx.dex.abilities.get("Illusion"), ctx.pokemon.abilityState, ctx.pokemon, ctx.source, ctx.move);
    },
    onEnd(ctx) {
      if (ctx.pokemon.illusion && !ctx.pokemon.beingCalledBack) {
        ctx.pokemon.illusion = null;
        ctx.add("replace", ctx.pokemon, ctx.pokemon.getUpdatedDetails());
        ctx.add("-end", ctx.pokemon, "Illusion");
      }
    },
    onFaint(ctx) { ctx.pokemon.illusion = null; },
  },

  "Imposter": {
    name: "Imposter", num: 150, rating: 5,
    effect: "Transforms into the opposing Pokémon on switch-in.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
    onSwitchIn(ctx) {
      const t = ctx.pokemon.side.foe.active[ctx.pokemon.side.foe.active.length - 1 - ctx.pokemon.position];
      if (t) ctx.transformInto(ctx.pokemon, t);
    },
  },

  "Infiltrator": {
    name: "Infiltrator", num: 151, rating: 2.5,
    effect: "Ignores the target's Substitute and screens.",
    onModifyMove(move) { move.infiltrates = true; },
  },

  "Mummy": {
    name: "Mummy", num: 152, rating: 2,
    effect: "Contact attackers' Ability becomes Mummy.",
    onDamagingHit(ctx, move) {
      const sa = ctx.source.getAbility();
      if (sa.flags.cantsuppress || sa.id === "Mummy") return;
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, !ctx.source.isAlly(ctx.pokemon)))
        ctx.source.setAbility("Mummy", ctx.pokemon);
    },
  },

  "Moxie": {
    name: "Moxie", num: 153, rating: 3,
    effect: "+1 Attack when KOing a foe with a move.",
    onSourceAfterFaint(ctx) {
      if (ctx.effect && ctx.effect.effectType === "Move") ctx.boost(ctx.pokemon, { atk: 1 });
    },
  },

  "Justified": {
    name: "Justified", num: 154, rating: 2.5,
    effect: "+1 Attack when hit by a Dark-type move.",
    onDamagingHit(ctx, move) {
      if (move.type === "Dark") ctx.boost(ctx.pokemon, { atk: 1 });
    },
  },

  "Rattled": {
    name: "Rattled", num: 155, rating: 1,
    effect: "+1 Speed when hit by Dark, Bug, or Ghost move, or Intimidate.",
    onDamagingHit(ctx, move) {
      if (["Dark", "Bug", "Ghost"].includes(move.type)) ctx.boost(ctx.pokemon, { spe: 1 });
    },
    onAfterBoost(ctx, boost, effect) {
      if (effect && effect.name === "Intimidate" && boost.atk) ctx.boost(ctx.pokemon, { spe: 1 });
    },
  },

  "Magic Bounce": {
    name: "Magic Bounce", num: 156, rating: 4,
    effect: "Reflects certain status moves back at the user.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target === ctx.source || move.hasBounced || !(move.flags && move.flags.reflectable)) return;
      const nm = ctx.dex.getActiveMove(move.id);
      nm.hasBounced = true;
      nm.pranksterBoosted = false;
      ctx.actions.useMove(nm, ctx.pokemon, { target: ctx.source });
      return false;
    },
    onAllyTryHitSide(ctx, move) {
      if (ctx.target.isAlly(ctx.source) || move.hasBounced || !(move.flags && move.flags.reflectable)) return;
      const nm = ctx.dex.getActiveMove(move.id);
      nm.hasBounced = true;
      nm.pranksterBoosted = false;
      ctx.actions.useMove(nm, ctx.pokemon, { target: ctx.source });
      move.hasBounced = true;
      return false;
    },
  },

  "Sap Sipper": {
    name: "Sap Sipper", num: 157, rating: 3,
    effect: "Immune to Grass; +1 Attack when hit by Grass.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (ctx.target !== ctx.source && move.type === "Grass") {
        if (!ctx.boost(ctx.pokemon, { atk: 1 }))
          ctx.add("-immune", ctx.pokemon, "[from] ability: Sap Sipper");
        return false;
      }
    },
    onAllyTryHitSide(ctx, move) {
      if (ctx.source === ctx.pokemon || !ctx.target.isAlly(ctx.source)) return;
      if (move.type === "Grass") ctx.boost(ctx.pokemon, { atk: 1 });
    },
  },

  "Prankster": {
    name: "Prankster", num: 158, rating: 4,
    effect: "+1 priority to status moves.",
    onModifyPriority(ctx, priority, move) {
      if (move && move.category === "Status") { move.pranksterBoosted = true; return priority + 1; }
    },
  },

  "Sand Force": {
    name: "Sand Force", num: 159, rating: 2,
    effect: "In sandstorm: 1.3× Rock/Ground/Steel damage; immune to sandstorm.",
    onBasePower(ctx, power, move) {
      if (ctx.isWeather("Sandstorm") && ["Rock","Ground","Steel"].includes(move.type))
        return ctx.chainModify(power, 1.3);
    },
    onImmunity(ctx, type) { if (type === "sandstorm") return false; },
  },

  "Iron Barbs": {
    name: "Iron Barbs", num: 160, rating: 2.5,
    effect: "Contact attackers lose 1/8 max HP.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, true))
        ctx.damage(ctx.source, ctx.source.baseMaxhp / 8, ctx.pokemon);
    },
  },

  "Zen Mode": {
    name: "Zen Mode", num: 161, rating: 0,
    effect: "Darmanitan changes to Zen Mode at ≤1/2 max HP.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onResidual(ctx) {
      const p = ctx.pokemon;
      // (Galarian Darmanitan, Gen 8: Zen Mode at half HP or less.)
      if (/^Darmanitan-Galar/.test(p.species) && !p.transformed) {
        ctx.abilityForme(p, p.hp <= p.maxhp / 2 ? "Darmanitan-Galar-Zen" : "Darmanitan-Galar");
        return;
      }
      if (p.baseSpecies.baseSpecies !== "Darmanitan" || p.transformed) return;
      if (p.hp <= p.maxhp / 2 && !["Zen","Galar-Zen"].includes(p.species.forme)) p.addVolatile("zenmode");
      else if (p.hp > p.maxhp / 2 && ["Zen","Galar-Zen"].includes(p.species.forme)) {
        p.addVolatile("zenmode"); p.removeVolatile("zenmode");
      }
    },
    onEnd(ctx) {
      const p = ctx.pokemon;
      if (!p.volatiles.zenmode || !p.hp) return;
      p.transformed = false;
      delete p.volatiles.zenmode;
      if (p.species.baseSpecies === "Darmanitan" && p.species.battleOnly)
        ctx.formeChange(p, p.species.battleOnly, this, false, "[silent]");
    },
    condition: {
      onStart(ctx) {
        const p = ctx.pokemon;
        if (!p.species.name.includes("Galar")) {
          if (p.species.id !== "Darmanitan-Zen") ctx.formeChange(p, "Darmanitan-Zen");
        } else if (p.species.id !== "Darmanitan-Galar-Zen") ctx.formeChange(p, "Darmanitan-Galar-Zen");
      },
      onEnd(ctx) {
        const p = ctx.pokemon;
        if (["Zen","Galar-Zen"].includes(p.species.forme)) ctx.formeChange(p, p.species.battleOnly);
      },
    },
  },

  "Victory Star": {
    name: "Victory Star", num: 162, rating: 2,
    effect: "1.1× accuracy for self and allies.",
    onAnyModifyAccuracy(ctx, accuracy) {
      if (ctx.source.isAlly(ctx.pokemon) && typeof accuracy === "number")
        return ctx.chainModify(accuracy, 1.1);
    },
  },

  "Turboblaze": {
    name: "Turboblaze", num: 163, rating: 3,
    effect: "Ignores target abilities when attacking.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Turboblaze"); },
    onModifyMove(move) { move.ignoreAbility = true; },
  },

  "Teravolt": {
    name: "Teravolt", num: 164, rating: 3,
    effect: "Ignores target abilities when attacking.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Teravolt"); },
    onModifyMove(move) { move.ignoreAbility = true; },
  },

  // ==================================================================
  // Gen 5
  // ==================================================================
  "Aroma Veil": {
    name: "Aroma Veil", num: 165, rating: 2,
    effect: "Self and allies are immune to infatuation, Taunt, Encore, Torment, Disable, Heal Block.",
    flags: { breakable: 1 },
    onAllyTryAddVolatile(ctx, status, effect) {
      if (["attract","disable","encore","healblock","taunt","torment"].includes(status.id)) {
        if (effect && effect.effectType === "Move") ctx.add("-block", ctx.target, "ability: Aroma Veil", "[of] " + ctx.pokemon.ident);
        return false;
      }
    },
  },

  "Flower Veil": {
    name: "Flower Veil", num: 166, rating: 0,
    effect: "Grass-type allies are immune to stat drops and status.",
    flags: { breakable: 1 },
    onAllyTryBoost(ctx, boost, effect) {
      if ((ctx.source && ctx.target === ctx.source) || !ctx.target.hasType("Grass")) return;
      let showMsg = false;
      for (const k in boost) if (boost[k] < 0) { delete boost[k]; showMsg = true; }
      if (showMsg && !(effect && effect.secondaries))
        ctx.add("-block", ctx.target, "ability: Flower Veil", "[of] " + ctx.pokemon.ident);
    },
    onAllySetStatus(ctx, status, effect) {
      if (ctx.target.hasType("Grass") && ctx.source && ctx.target !== ctx.source && effect && effect.id !== "yawn") {
        if (effect.name === "Synchronize" || (effect.effectType === "Move" && !effect.secondaries))
          ctx.add("-block", ctx.target, "ability: Flower Veil", "[of] " + ctx.pokemon.ident);
        return false;
      }
    },
    onAllyTryAddVolatile(ctx, status) {
      if (ctx.target.hasType("Grass") && status.id === "yawn") {
        ctx.add("-block", ctx.target, "ability: Flower Veil", "[of] " + ctx.pokemon.ident);
        return false;
      }
    },
  },

  "Cheek Pouch": {
    name: "Cheek Pouch", num: 167, rating: 2,
    effect: "Restores 1/3 max HP when eating a Berry.",
    onEatItem(ctx) { ctx.heal(ctx.pokemon, ctx.pokemon.baseMaxhp / 3); },
  },

  "Protean": {
    name: "Protean", num: 168, rating: 4,
    effect: "Changes type to match the move it is about to use.",
    onPrepareHit(ctx, move) {
      if (ctx.pokemon.abilityState.protean) return;
      if (move.hasBounced || (move.flags && move.flags.futuremove) || move.sourceEffect === "snatch" || move.callsMove) return;
      const type = move.type;
      if (type && type !== "???" && ctx.pokemon.getTypes().join() !== type) {
        if (!ctx.setType(ctx.pokemon, type)) return;
        ctx.pokemon.abilityState.protean = true;
        ctx.add("-start", ctx.pokemon, "typechange", type, "[from] ability: Protean");
      }
    },
  },

  "Fur Coat": {
    name: "Fur Coat", num: 169, rating: 4,
    effect: "Doubles Defense.",
    flags: { breakable: 1 },
    onModifyDef(ctx, def) { return ctx.chainModify(def, 2); },
  },

  "Magician": {
    name: "Magician", num: 170, rating: 1,
    effect: "Steals the target's item if this Pokémon has none and uses a damaging move.",
    onAfterMoveSecondarySelf(ctx, move) {
      if (!move || ctx.pokemon.switchFlag === true || !move.hitTargets || ctx.pokemon.item || move.id === "fling" || move.category === "Status") return;
      const targets = [...move.hitTargets];
      ctx.speedSort(targets);
      for (const t of targets) {
        if (t !== ctx.pokemon) {
          const it = ctx.takeItem(t, ctx.pokemon);
          if (!it) continue;
          if (!ctx.setItem(ctx.pokemon, it)) { t.item = it.id; continue; }
          ctx.add("-item", ctx.pokemon, it, "[from] ability: Magician", "[of] " + t);
          return;
        }
      }
    },
  },

  "Bulletproof": {
    name: "Bulletproof", num: 171, rating: 3,
    effect: "Immune to ball and bomb moves.",
    flags: { breakable: 1 },
    onTryHit(ctx, move) {
      if (move.flags && move.flags.bullet) {
        ctx.add("-immune", ctx.pokemon, "[from] ability: Bulletproof"); return false;
      }
    },
  },

  "Competitive": {
    name: "Competitive", num: 172, rating: 2.5,
    effect: "+2 SpA when any stat is lowered by a foe.",
    onAfterEachBoost(ctx, boost) {
      if (!ctx.source || ctx.target.isAlly(ctx.source)) return;
      let lowered = false;
      for (const k in boost) if (boost[k] < 0) lowered = true;
      if (lowered) ctx.boost(ctx.target, { spa: 2 }, ctx.target, null, false, true);
    },
  },

  "Strong Jaw": {
    name: "Strong Jaw", num: 173, rating: 3.5,
    effect: "1.5× power on biting moves.",
    onBasePower(ctx, power, move) {
      if (move.flags && move.flags.bite) return ctx.chainModify(power, 1.5);
    },
  },

  "Refrigerate": {
    name: "Refrigerate", num: 174, rating: 4,
    effect: "Normal moves become Ice, 1.3× power.",
    onModifyType(ctx, move) {
      const noModify = ["judgment","multiattack","naturalgift","revelationdance","technoblast","terrainpulse","weatherball"];
      if (move.type === "Normal" && !noModify.includes(move.id)) {
        move.type = "Ice"; move.typeChangerBoosted = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.typeChangerBoosted) return ctx.chainModify(power, 1.3);
    },
  },

  "Sweet Veil": {
    name: "Sweet Veil", num: 175, rating: 2,
    effect: "Self and allies cannot fall asleep.",
    flags: { breakable: 1 },
    onAllySetStatus(ctx, status) {
      if (status.id === "slp") {
        ctx.add("-block", ctx.target, "ability: Sweet Veil", "[of] " + ctx.pokemon.ident); return false;
      }
    },
    onAllyTryAddVolatile(ctx, status) {
      if (status.id === "yawn") { ctx.add("-block", ctx.target, "ability: Sweet Veil", "[of] " + ctx.pokemon.ident); return false; }
    },
  },

  "Stance Change": {
    name: "Stance Change", num: 176, rating: 4,
    effect: "Aegislash changes forme depending on whether it uses a damaging move or King's Shield.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    // (Blade Forme for a damaging move, Shield Forme for King's Shield; the
    // battle engine passes the attacker. The damage calculator, which calls
    // this without one, sees whichever forme the battle has already set.)
    onModifyMove(move, attacker) {
      if (!attacker || !attacker.battle || !/^Aegislash/.test(attacker.species) || attacker.transformed) return;
      if (move.category === "Status" && move.id !== "kingsshield") return;
      const blade = move.id !== "kingsshield";
      const forme = blade ? "Aegislash-Blade" : "Aegislash-Shield";
      if (attacker.species !== forme) attacker.battle.abilityForme(attacker, forme, blade ? "Changed to Blade Forme!" : "Changed to Shield Forme!");
    },
    // Back to Shield Forme when it leaves the field.
    onSwitchOut(ctx) {
      const p = ctx.pokemon;
      if (p.species === "Aegislash-Blade" && !p.transformed) ctx.battle.abilityForme(p, "Aegislash-Shield", null, true);
    },
  },

  "Gale Wings": {
    name: "Gale Wings", num: 177, rating: 1.5,
    effect: "Flying moves have +1 priority while at full HP.",
    onModifyPriority(ctx, priority, move) {
      if (move && move.type === "Flying" && ctx.pokemon.hp === ctx.pokemon.maxhp) return priority + 1;
    },
  },

  "Mega Launcher": {
    name: "Mega Launcher", num: 178, rating: 3,
    effect: "1.5× power on pulse and aura moves.",
    onBasePower(ctx, power, move) {
      if (move.flags && move.flags.pulse) return ctx.chainModify(power, 1.5);
    },
  },

  "Grass Pelt": {
    name: "Grass Pelt", num: 179, rating: 0.5,
    effect: "1.5× Defense in Grassy Terrain.",
    flags: { breakable: 1 },
    onModifyDef(ctx, def) { if (ctx.isTerrain("GrassyTerrain")) return ctx.chainModify(def, 1.5); },
  },

  "Symbiosis": {
    name: "Symbiosis", num: 180, rating: 0,
    effect: "Passes its item to an ally when the ally uses its own item.",
    onAllyAfterUseItem(ctx) {
      const ally = ctx.target;
      if (ally.switchFlag) return;
      const src = ctx.pokemon;
      const it = ctx.takeItem(src);
      if (!it) return;
      if (!ctx.singleEvent("TakeItem", it, src.itemState, ally, src, this, it) || !ctx.setItem(ally, it)) {
        src.item = it.id; return;
      }
      ctx.add("-activate", src, "ability: Symbiosis", it, "[of] " + ally);
    },
  },

  "Tough Claws": {
    name: "Tough Claws", num: 181, rating: 3.5,
    effect: "1.3× power on contact moves.",
    onBasePower(ctx, power, move) {
      if (move.flags && move.flags.contact) return ctx.chainModify(power, 1.3);
    },
  },

  "Pixilate": {
    name: "Pixilate", num: 182, rating: 4,
    effect: "Normal moves become Fairy, 1.3× power.",
    onModifyType(ctx, move) {
      const noModify = ["judgment","multiattack","naturalgift","revelationdance","technoblast","terrainpulse","weatherball"];
      if (move.type === "Normal" && !noModify.includes(move.id)) {
        move.type = "Fairy"; move.typeChangerBoosted = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.typeChangerBoosted) return ctx.chainModify(power, 1.3);
    },
  },

  "Gooey": {
    name: "Gooey", num: 183, rating: 2,
    effect: "Contact attackers have their Speed lowered by 1.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, true)) {
        ctx.add("-ability", ctx.pokemon, "Gooey");
        ctx.boost(ctx.source, { spe: -1 }, ctx.pokemon, true);
      }
    },
  },

  "Aerilate": {
    name: "Aerilate", num: 184, rating: 4,
    effect: "Normal moves become Flying, 1.3× power.",
    onModifyType(ctx, move) {
      const noModify = ["judgment","multiattack","naturalgift","revelationdance","technoblast","terrainpulse","weatherball"];
      if (move.type === "Normal" && !noModify.includes(move.id)) {
        move.type = "Flying"; move.typeChangerBoosted = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.typeChangerBoosted) return ctx.chainModify(power, 1.3);
    },
  },

  "Parental Bond": {
    name: "Parental Bond", num: 185, rating: 4.5,
    effect: "Damaging moves hit twice; second hit is 0.5× power.",
    onPrepareHit(ctx, move) {
      if (move.category === "Status" || move.multihit || (move.flags && (move.flags.noparentalbond || move.flags.charge || move.flags.futuremove)) || move.spreadHit || move.isZ || move.isMax) return;
      move.multihit = 2;
      move.multihitType = "parentalbond";
    },
    onSourceModifySecondaries(ctx, secondaries, move) {
      if (move.multihitType === "parentalbond" && move.id === "secretpower" && move.hit < 2)
        return secondaries.filter(e => e.volatileStatus === "flinch");
    },
  },

  "Dark Aura": {
    name: "Dark Aura", num: 186, rating: 3,
    effect: "1.33× power to all Dark moves.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Dark Aura"); },
    onAnyBasePower(ctx, power, move) {
      if (ctx.target === ctx.source || move.category === "Status" || move.type !== "Dark") return;
      return ctx.chainModify(power, move.hasAuraBreak ? 0.75 : 1.33);
    },
  },

  "Fairy Aura": {
    name: "Fairy Aura", num: 187, rating: 3,
    effect: "1.33× power to all Fairy moves.",
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Fairy Aura"); },
    onAnyBasePower(ctx, power, move) {
      if (ctx.target === ctx.source || move.category === "Status" || move.type !== "Fairy") return;
      return ctx.chainModify(power, move.hasAuraBreak ? 0.75 : 1.33);
    },
  },

  "Aura Break": {
    name: "Aura Break", num: 188, rating: 1,
    effect: "Reverses the effects of Dark Aura and Fairy Aura (0.75×).",
    flags: { breakable: 1 },
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Aura Break"); },
    onAnyTryPrimaryHit(ctx, move) {
      if (ctx.target === ctx.source || move.category === "Status") return;
      move.hasAuraBreak = true;
    },
  },

  "Primordial Sea": {
    name: "Primordial Sea", num: 189, rating: 4.5,
    effect: "On switch-in, summons heavy rain. Only very strong weather can override.",
    onSwitchIn(ctx) { ctx.setWeather("PrimordialSea"); },
    onAnySetWeather(ctx, weather) {
      const strong = ["DesolateLand", "PrimordialSea", "DeltaStream"];
      if (ctx.field.weather === "PrimordialSea" && !strong.includes(weather.id)) return false;
    },
    onEnd(ctx) {
      if (ctx.field.weatherSource !== ctx.pokemon) return;
      for (const t of ctx.getAllActive()) {
        if (t === ctx.pokemon) continue;
        if (t.hasAbility("Primordial Sea")) { ctx.field.weatherSource = t; return; }
      }
      ctx.clearWeather();
    },
  },

  "Desolate Land": {
    name: "Desolate Land", num: 190, rating: 4.5,
    effect: "On switch-in, summons extremely harsh sunlight. Water moves fail.",
    onSwitchIn(ctx) { ctx.setWeather("DesolateLand"); },
    onAnySetWeather(ctx, weather) {
      const strong = ["DesolateLand", "PrimordialSea", "DeltaStream"];
      if (ctx.field.weather === "DesolateLand" && !strong.includes(weather.id)) return false;
    },
    onEnd(ctx) {
      if (ctx.field.weatherSource !== ctx.pokemon) return;
      for (const t of ctx.getAllActive()) {
        if (t === ctx.pokemon) continue;
        if (t.hasAbility("Desolate Land")) { ctx.field.weatherSource = t; return; }
      }
      ctx.clearWeather();
    },
  },

  "Delta Stream": {
    name: "Delta Stream", num: 191, rating: 4,
    effect: "On switch-in, summons strong winds that halve Flying-type weaknesses.",
    onSwitchIn(ctx) { ctx.setWeather("DeltaStream"); },
    onAnySetWeather(ctx, weather) {
      const strong = ["DesolateLand", "PrimordialSea", "DeltaStream"];
      if (ctx.field.weather === "DeltaStream" && !strong.includes(weather.id)) return false;
    },
    onEnd(ctx) {
      if (ctx.field.weatherSource !== ctx.pokemon) return;
      for (const t of ctx.getAllActive()) {
        if (t === ctx.pokemon) continue;
        if (t.hasAbility("Delta Stream")) { ctx.field.weatherSource = t; return; }
      }
      ctx.clearWeather();
    },
  },

  // ==================================================================
  // Gen 7 (num 192–233)
  // ==================================================================
  "Stamina": {
    name: "Stamina", num: 192, rating: 3.5,
    effect: "Raises Defense by 1 stage when hit by an attack.",
    onDamagingHit(ctx) { ctx.boost(ctx.pokemon, { def: 1 }); },
  },

  "Wimp Out": {
    name: "Wimp Out", num: 193, rating: 1,
    effect: "Switches out when an attack drops its HP to half or less.",
    onDamagingHit(ctx) { gen7HalfHpSwitch(ctx, "Wimp Out"); },
  },

  "Emergency Exit": {
    name: "Emergency Exit", num: 194, rating: 1,
    effect: "Switches out when an attack drops its HP to half or less.",
    onDamagingHit(ctx) { gen7HalfHpSwitch(ctx, "Emergency Exit"); },
  },

  "Water Compaction": {
    name: "Water Compaction", num: 195, rating: 1.5,
    effect: "Raises Defense by 2 stages when hit by a Water-type move.",
    onDamagingHit(ctx, move) { if (move.type === "Water") ctx.boost(ctx.pokemon, { def: 2 }); },
  },

  "Merciless": {
    name: "Merciless", num: 196, rating: 1.5,
    effect: "Its attacks are critical hits if the target is poisoned.",
    // (The battle engine checks the target's poison when it rolls for a critical hit.)
  },

  "Shields Down": {
    name: "Shields Down", num: 197, rating: 3,
    effect: "Above half HP, Minior is in its Meteor Form and can't be statused; at half or less, its Core.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onStart(ctx) { gen7ShieldsDown(ctx); },
    onResidual(ctx) { gen7ShieldsDown(ctx); },
    onSetStatus(ctx, status, effect) {
      if (ctx.pokemon.species !== "Minior" || ctx.pokemon.transformed) return;
      if (ctx.effect && ctx.effect.effectType === "Move" && !ctx.effect.secondaries) ctx.add("-immune", ctx.pokemon, "[from] ability: Shields Down");
      return false;
    },
    onTryAddVolatile(ctx, status) {
      if (ctx.pokemon.species === "Minior" && !ctx.pokemon.transformed && status.id === "yawn") return false;
    },
  },

  "Stakeout": {
    name: "Stakeout", num: 198, rating: 4.5,
    effect: "Doubles its attacking stat against a target that switched in this turn.",
    onModifyAtk(ctx, atk) { if (ctx.target && !ctx.target.activeTurns) return ctx.chainModify(atk, 2); },
    onModifySpA(ctx, spa) { if (ctx.target && !ctx.target.activeTurns) return ctx.chainModify(spa, 2); },
  },

  "Water Bubble": {
    name: "Water Bubble", num: 199, rating: 4.5,
    effect: "Doubles Water-type power, halves Fire-type damage taken, and prevents burns.",
    flags: { breakable: 1 },
    onModifyAtk(ctx, atk, move) { if (move.type === "Water" && ctx.pokemon === ctx.source) return ctx.chainModify(atk, 2); },
    onModifySpA(ctx, spa, move) { if (move.type === "Water" && ctx.pokemon === ctx.source) return ctx.chainModify(spa, 2); },
    onSourceModifyDamage(ctx, damage, move) { if (move.type === "Fire") return ctx.chainModify(damage, 0.5); },
    onUpdate(ctx) {
      if (ctx.pokemon.status === "brn") { ctx.add("-activate", ctx.pokemon, "ability: Water Bubble"); ctx.cureStatus(ctx.pokemon); }
    },
    onSetStatus(ctx, status) {
      if (status.id !== "brn") return;
      if (ctx.effect && ctx.effect.effectType === "Move" && !ctx.effect.secondaries) ctx.add("-immune", ctx.pokemon, "[from] ability: Water Bubble");
      return false;
    },
  },

  "Steelworker": {
    name: "Steelworker", num: 200, rating: 3.5,
    effect: "1.5× power on Steel-type moves.",
    onModifyAtk(ctx, atk, move) { if (move.type === "Steel") return ctx.chainModify(atk, 1.5); },
    onModifySpA(ctx, spa, move) { if (move.type === "Steel") return ctx.chainModify(spa, 1.5); },
  },

  "Berserk": {
    name: "Berserk", num: 201, rating: 2,
    effect: "Raises Sp. Atk by 1 stage when an attack drops its HP to half or less.",
    onDamagingHit(ctx) { if (gen7DroppedBelowHalf(ctx.pokemon)) ctx.boost(ctx.pokemon, { spa: 1 }); },
  },

  "Slush Rush": {
    name: "Slush Rush", num: 202, rating: 3,
    effect: "Doubles Speed in hail.",
    onModifySpe(ctx, spe) { if (ctx.isWeather("Hail")) return ctx.chainModify(spe, 2); },
  },

  "Long Reach": {
    name: "Long Reach", num: 203, rating: 1,
    effect: "Its moves don't make contact.",
    onModifyMove(move) { if (move.flags) move.flags = Object.assign({}, move.flags, { contact: 0 }); },
  },

  "Liquid Voice": {
    name: "Liquid Voice", num: 204, rating: 1.5,
    effect: "Its sound-based moves become Water type.",
    onModifyType(ctx, move) {
      if (move.flags && move.flags.sound) move.type = "Water";
    },
  },

  "Triage": {
    name: "Triage", num: 205, rating: 3.5,
    effect: "Its healing moves have +3 priority.",
    onModifyPriority(ctx, priority, move) { if (move && move.flags && move.flags.heal) return priority + 3; },
  },

  "Galvanize": {
    name: "Galvanize", num: 206, rating: 4,
    effect: "Normal moves become Electric, 1.2× power.",
    onModifyType(ctx, move) {
      const noModify = ["judgment", "multiattack", "naturalgift", "revelationdance", "technoblast", "terrainpulse", "weatherball"];
      if (move.type === "Normal" && !noModify.includes(move.id)) {
        move.type = "Electric"; move.typeChangerBoosted = true;
      }
    },
    onBasePower(ctx, power, move) {
      if (move.typeChangerBoosted) return ctx.chainModify(power, [4915, 4096]);
    },
  },

  "Surge Surfer": {
    name: "Surge Surfer", num: 207, rating: 3,
    effect: "Doubles Speed on Electric Terrain.",
    onModifySpe(ctx, spe) { if (ctx.isTerrain("ElectricTerrain")) return ctx.chainModify(spe, 2); },
  },

  "Schooling": {
    name: "Schooling", num: 208, rating: 3,
    effect: "From Lv. 20, Wishiwashi forms a school while its HP is above a quarter.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onStart(ctx) { gen7Schooling(ctx); },
    onResidual(ctx) { gen7Schooling(ctx); },
  },

  "Disguise": {
    name: "Disguise", num: 209, rating: 3.5,
    effect: "The first hit Mimikyu takes only breaks its disguise.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1, breakable: 1 },
    onDamage(ctx, damage, effect) {
      const p = ctx.pokemon;
      if (p.species !== "Mimikyu" || p.transformed || !effect || effect.effectType !== "Move") return;
      ctx.add("-activate", p, "ability: Disguise");
      ctx.abilityForme(p, "Mimikyu-Busted", "{who}'s disguise was busted!");
      return 0;
    },
  },

  "Battle Bond": {
    name: "Battle Bond", num: 210, rating: 4,
    effect: "Greninja becomes Ash-Greninja when it knocks out a Pokémon.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onSourceAfterFaint(ctx) {
      const p = ctx.pokemon;
      if (p.species !== "Greninja-Bond" || p.transformed || p.hp <= 0) return;
      ctx.add("-activate", p, "ability: Battle Bond");
      ctx.abilityForme(p, "Greninja-Ash", "{who} became Ash-Greninja!");
    },
  },

  "Power Construct": {
    name: "Power Construct", num: 211, rating: 5,
    effect: "At half HP or less, Zygarde changes to its Complete Forme.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onResidual(ctx) {
      const p = ctx.pokemon;
      if (!/^Zygarde/.test(p.species) || p.species === "Zygarde-Complete" || p.transformed || p.hp > p.maxhp / 2) return;
      ctx.add("-activate", p, "ability: Power Construct");
      ctx.abilityForme(p, "Zygarde-Complete", "{who} transformed into its Complete Forme!");
    },
  },

  "Corrosion": {
    name: "Corrosion", num: 212, rating: 2.5,
    effect: "It can poison Steel and Poison types.",
    // (The battle engine's poison immunity checks for it.)
  },

  "Comatose": {
    name: "Comatose", num: 213, rating: 4,
    effect: "It is always drowsing: it counts as asleep and can't be statused.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Comatose"); },
    onSetStatus(ctx) {
      if (ctx.effect && ctx.effect.effectType === "Move" && !ctx.effect.secondaries) ctx.add("-immune", ctx.pokemon, "[from] ability: Comatose");
      return false;
    },
    onTryAddVolatile(ctx, status) { if (status.id === "yawn") return false; },
  },

  "Queenly Majesty": {
    name: "Queenly Majesty", num: 214, rating: 2.5,
    effect: "Foes can't use priority moves on it or its ally.",
    flags: { breakable: 1 },
    // (The battle engine checks for it with Psychic Terrain's priority block.)
  },

  "Innards Out": {
    name: "Innards Out", num: 215, rating: 4,
    effect: "When knocked out by an attack, the attacker takes the HP it had left.",
    onDamagingHit(ctx) {
      const p = ctx.pokemon, last = p.lastDamage;
      if (p.hp > 0 || !last || !ctx.source || ctx.source.fainted) return;
      ctx.damage(ctx.source, last.amount, p);
    },
  },

  "Dancer": {
    name: "Dancer", num: 216, rating: 1.5,
    effect: "After another Pokémon uses a dance move, it copies that move.",
    // (The battle engine repeats the dance.)
  },

  "Battery": {
    name: "Battery", num: 217, rating: 0,
    effect: "Its ally's special moves have 1.3× power.",
    // (Doubles: the battle engine passes it to the damage calculator.)
  },

  "Fluffy": {
    name: "Fluffy", num: 218, rating: 3.5,
    effect: "Halves contact damage; doubles Fire-type damage taken.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) {
      let mod = 1;
      if (move.type === "Fire") mod *= 2;
      if (move.flags && move.flags.contact) mod /= 2;
      if (mod !== 1) return ctx.chainModify(damage, mod);
    },
  },

  "Dazzling": {
    name: "Dazzling", num: 219, rating: 2.5,
    effect: "Foes can't use priority moves on it or its ally.",
    flags: { breakable: 1 },
  },

  "Soul-Heart": {
    name: "Soul-Heart", num: 220, rating: 3.5,
    effect: "Raises Sp. Atk by 1 stage when any other Pokémon faints.",
    // (The battle engine raises it when a Pokémon faints.)
  },

  "Tangling Hair": {
    name: "Tangling Hair", num: 221, rating: 2,
    effect: "Contact attackers have their Speed lowered by 1.",
    onDamagingHit(ctx, move) {
      if (ctx.checkMoveMakesContact(move, ctx.source, ctx.pokemon, true)) {
        ctx.add("-ability", ctx.pokemon, "Tangling Hair");
        ctx.boost(ctx.source, { spe: -1 }, ctx.pokemon, true);
      }
    },
  },

  "Receiver": {
    name: "Receiver", num: 222, rating: 0,
    effect: "It takes on the Ability of an ally that faints.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
  },

  "Power of Alchemy": {
    name: "Power of Alchemy", num: 223, rating: 0,
    effect: "It takes on the Ability of an ally that faints.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
  },

  "Beast Boost": {
    name: "Beast Boost", num: 224, rating: 3.5,
    effect: "Raises its highest stat by 1 stage when it knocks out a Pokémon.",
    onSourceAfterFaint(ctx) {
      if (!ctx.effect || ctx.effect.effectType !== "Move") return;
      const s = ctx.pokemon.stats;
      let best = "atk";
      for (const k of ["def", "spa", "spd", "spe"]) if (s[k] > s[best]) best = k;
      ctx.boost(ctx.pokemon, { [best]: 1 });
    },
  },

  "RKS System": {
    name: "RKS System", num: 225, rating: 4,
    effect: "Silvally's type matches its form; Multi-Attack takes that type.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
  },

  "Electric Surge": {
    name: "Electric Surge", num: 226, rating: 4,
    effect: "On switch-in, sets Electric Terrain.",
    onStart(ctx) { ctx.setTerrain("electricterrain"); },
  },

  "Psychic Surge": {
    name: "Psychic Surge", num: 227, rating: 4,
    effect: "On switch-in, sets Psychic Terrain.",
    onStart(ctx) { ctx.setTerrain("psychicterrain"); },
  },

  "Misty Surge": {
    name: "Misty Surge", num: 228, rating: 3.5,
    effect: "On switch-in, sets Misty Terrain.",
    onStart(ctx) { ctx.setTerrain("mistyterrain"); },
  },

  "Grassy Surge": {
    name: "Grassy Surge", num: 229, rating: 4,
    effect: "On switch-in, sets Grassy Terrain.",
    onStart(ctx) { ctx.setTerrain("grassyterrain"); },
  },

  "Full Metal Body": {
    name: "Full Metal Body", num: 230, rating: 2,
    effect: "Other Pokémon can't lower its stats (Mold Breaker can't get past it).",
    onTryBoost(ctx, boost, effect) {
      if (ctx.source && ctx.target === ctx.source) return;
      let showMsg = false;
      for (const k in boost) if (boost[k] < 0) { delete boost[k]; showMsg = true; }
      if (showMsg && !(effect && effect.secondaries)) ctx.add("-fail", ctx.pokemon, "unboost", "[from] ability: Full Metal Body");
    },
  },

  "Shadow Shield": {
    name: "Shadow Shield", num: 231, rating: 3.5,
    effect: "Halves damage taken at full HP (Mold Breaker can't get past it).",
    onSourceModifyDamage(ctx, damage) {
      if (ctx.target.hp >= ctx.target.maxhp) return ctx.chainModify(damage, 0.5);
    },
  },

  "Prism Armor": {
    name: "Prism Armor", num: 232, rating: 3,
    effect: "0.75× damage from super-effective moves (Mold Breaker can't get past it).",
    onSourceModifyDamage(ctx, damage, move) {
      if (ctx.target.getMoveHitData(move).typeMod > 0) return ctx.chainModify(damage, 0.75);
    },
  },

  "Neuroforce": {
    name: "Neuroforce", num: 233, rating: 2.5,
    effect: "1.25× damage with super-effective moves.",
    onModifyDamage(ctx, damage, move) {
      if (move && ctx.target.getMoveHitData(move).typeMod > 0) return ctx.chainModify(damage, 1.25);
    },
  },
  // ==================================================================
  // Gen 8 (num 234-267)
  // ==================================================================
  "Intrepid Sword": {
    name: "Intrepid Sword", num: 234, rating: 4,
    effect: "Raises Attack by 1 stage when it enters battle.",
    onStart(ctx) { ctx.boost(ctx.pokemon, { atk: 1 }); },
  },

  "Dauntless Shield": {
    name: "Dauntless Shield", num: 235, rating: 3.5,
    effect: "Raises Defense by 1 stage when it enters battle.",
    onStart(ctx) { ctx.boost(ctx.pokemon, { def: 1 }); },
  },

  "Libero": {
    name: "Libero", num: 236, rating: 4,
    effect: "Its moves get the same-type bonus whatever their type (as Protean here).",
  },

  "Ball Fetch": {
    name: "Ball Fetch", num: 237, rating: 0,
    effect: "Fetches the first failed Poké Ball (no effect in battle here).",
  },

  "Cotton Down": {
    name: "Cotton Down", num: 238, rating: 2,
    effect: "When hit by an attack, lowers the Speed of every other Pokémon by 1 stage.",
    onDamagingHit(ctx) {
      ctx.add("-ability", ctx.pokemon, "Cotton Down");
      for (const m of ctx.getAllActive()) if (m !== ctx.pokemon) ctx.boost(m, { spe: -1 }, ctx.pokemon);
    },
  },

  "Propeller Tail": {
    name: "Propeller Tail", num: 239, rating: 0,
    effect: "Its moves can't be drawn away (Follow Me, Lightning Rod, ...).",
  },

  "Mirror Armor": {
    name: "Mirror Armor", num: 240, rating: 2,
    effect: "Stat drops other Pokémon cause bounce back to them.",
    flags: { breakable: 1 },
    onTryBoost(ctx, boost, effect) {
      const src = ctx.source;
      if (!src || src === ctx.pokemon || (effect && effect.id === "mirrorarmor")) return;
      const back = {};
      for (const k in boost) if (boost[k] < 0) { back[k] = boost[k]; delete boost[k]; }
      if (!Object.keys(back).length) return;
      ctx.add("-ability", ctx.pokemon, "Mirror Armor");
      if (!src.fainted) ctx.boost(src, back, ctx.pokemon);
    },
  },

  "Gulp Missile": {
    name: "Gulp Missile", num: 241, rating: 2.5,
    effect: "Surf or Dive catches prey; hit while holding it, Cramorant spits it at the attacker.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onAfterMove(ctx, move) {
      const p = ctx.pokemon;
      if (p.species !== "Cramorant" || p.transformed || !move || !["surf", "dive"].includes(move.id)) return;
      ctx.abilityForme(p, p.hp > p.maxhp / 2 ? "Cramorant-Gulping" : "Cramorant-Gorging");
    },
    onDamagingHit(ctx) {
      const p = ctx.pokemon, src = ctx.source;
      if (!/^Cramorant-G/.test(p.species) || !src) return;
      const gorging = p.species === "Cramorant-Gorging";
      ctx.abilityForme(p, "Cramorant");
      if (src.fainted) return;
      ctx.damage(src, src.baseMaxhp / 4, p);
      if (gorging) ctx.trySetStatus(src, "par", p);
      else ctx.boost(src, { def: -1 }, p);
    },
  },

  "Stalwart": {
    name: "Stalwart", num: 242, rating: 0,
    effect: "Its moves can't be drawn away (Follow Me, Lightning Rod, ...).",
  },

  "Steam Engine": {
    name: "Steam Engine", num: 243, rating: 2,
    effect: "Raises Speed by 6 stages when hit by a Fire- or Water-type move.",
    onDamagingHit(ctx, move) { if (move.type === "Fire" || move.type === "Water") ctx.boost(ctx.pokemon, { spe: 6 }); },
  },

  "Punk Rock": {
    name: "Punk Rock", num: 244, rating: 3.5,
    effect: "Sound-based moves: 1.3× power from it, half damage to it.",
    flags: { breakable: 1 },
    onBasePower(ctx, power, move) { if (move.flags && move.flags.sound) return ctx.chainModify(power, [5325, 4096]); },
    onSourceModifyDamage(ctx, damage, move) { if (move.flags && move.flags.sound) return ctx.chainModify(damage, 0.5); },
  },

  "Sand Spit": {
    name: "Sand Spit", num: 245, rating: 1,
    effect: "Whips up a sandstorm when hit by an attack.",
    onDamagingHit(ctx) { ctx.setWeather("Sandstorm"); },
  },

  "Ice Scales": {
    name: "Ice Scales", num: 246, rating: 4,
    effect: "Halves damage from special moves.",
    flags: { breakable: 1 },
    onSourceModifyDamage(ctx, damage, move) { if (move.category === "Special") return ctx.chainModify(damage, 0.5); },
  },

  "Ripen": {
    name: "Ripen", num: 247, rating: 2,
    effect: "Doubles what the Berries it eats do (healing and stat Berries).",
    // (The Berries check for it: data/conditions.js.)
  },

  "Ice Face": {
    name: "Ice Face", num: 248, rating: 3,
    effect: "Eiscue's ice head takes one physical hit; hail makes it again.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1, breakable: 1 },
    onDamage(ctx, damage, effect) {
      const p = ctx.pokemon, m = effect && effect.effectType === "Move" && window.MOVES[effect.name];
      if (p.species !== "Eiscue" || p.transformed || !m || m.cat !== "Physical") return;
      ctx.add("-activate", p, "ability: Ice Face");
      ctx.abilityForme(p, "Eiscue-Noice", "{who}'s Ice Face broke!");
      return 0;
    },
    onStart(ctx) { gen8IceFace(ctx); },
    onResidual(ctx) { gen8IceFace(ctx); },
  },

  "Power Spot": {
    name: "Power Spot", num: 249, rating: 0,
    effect: "Its ally's moves have 1.3× power.",
    // (Doubles: the battle engine passes it to the damage calculator.)
  },

  "Mimicry": {
    name: "Mimicry", num: 250, rating: 0,
    effect: "Its type becomes the terrain's.",
    onStart(ctx) { ctx.battle.mimicry(ctx.pokemon); },
  },

  "Screen Cleaner": {
    name: "Screen Cleaner", num: 251, rating: 2,
    effect: "On switch-in, ends Reflect, Light Screen and Aurora Veil on both sides.",
    onStart(ctx) {
      const b = ctx.battle;
      for (const side of [ctx.pokemon.side, ctx.pokemon.side.foe]) {
        for (const id of ["reflect", "lightscreen", "auroraveil"]) b.removeSideCondition(side, id);
      }
    },
  },

  "Steely Spirit": {
    name: "Steely Spirit", num: 252, rating: 3.5,
    effect: "Its and its ally's Steel-type moves have 1.5× power.",
    // (The battle engine passes it to the damage calculator.)
  },

  "Perish Body": {
    name: "Perish Body", num: 253, rating: 1,
    effect: "When hit by a contact move, both it and the attacker will faint in three turns.",
    onDamagingHit(ctx, move) {
      const src = ctx.source;
      if (!src || src.fainted || !ctx.checkMoveMakesContact(move, src, ctx.pokemon) || src.volatiles.perishsong) return;
      ctx.add("-activate", ctx.pokemon, "ability: Perish Body");
      for (const m of [ctx.pokemon, src]) if (!m.fainted && !m.volatiles.perishsong) m.addVolatile("perishsong", ctx.pokemon);
    },
  },

  "Wandering Spirit": {
    name: "Wandering Spirit", num: 254, rating: 2.5,
    effect: "Swaps Abilities with a Pokémon that hits it with a contact move.",
    onDamagingHit(ctx, move) {
      const src = ctx.source, p = ctx.pokemon;
      const theirs = src && window.ABILITIES[src.ability];
      if (!src || src.fainted || !ctx.checkMoveMakesContact(move, src, p) || !theirs || (theirs.flags && theirs.flags.failskillswap)) return;
      const mine = p.ability;
      p.ability = src.ability; src.ability = mine;
      p.abilityState = {}; src.abilityState = {};
      ctx.add("-activate", p, "ability: Wandering Spirit", "[of] " + src.ident);
    },
  },

  "Gorilla Tactics": {
    name: "Gorilla Tactics", num: 255, rating: 4.5,
    effect: "1.5× Attack, but it's locked into the first move it picks.",
    onModifyAtk(ctx, atk) { return ctx.chainModify(atk, 1.5); },
    // (The battle engine locks its move, as a Choice item does.)
  },

  "Neutralizing Gas": {
    name: "Neutralizing Gas", num: 256, rating: 4,
    effect: "While it's out, every other Pokémon's Ability has no effect.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "Neutralizing Gas"); },
    // (The battle engine switches the other Abilities off.)
  },

  "Pastel Veil": {
    name: "Pastel Veil", num: 257, rating: 2,
    effect: "It and its ally can't be poisoned.",
    flags: { breakable: 1 },
    onStart(ctx) {
      for (const m of [ctx.pokemon].concat(ctx.allies())) {
        if (m && (m.status === "psn" || m.status === "tox")) { ctx.add("-activate", ctx.pokemon, "ability: Pastel Veil"); ctx.cureStatus(m); }
      }
    },
    onAllySetStatus(ctx, status, effect) {
      if (status.id !== "psn" && status.id !== "tox") return;
      if (effect && effect.effectType === "Move" && !effect.secondaries) ctx.add("-block", ctx.target, "ability: Pastel Veil", "[of] " + ctx.pokemon.ident);
      return false;
    },
  },

  "Hunger Switch": {
    name: "Hunger Switch", num: 258, rating: 1,
    effect: "Morpeko switches between Full Belly and Hangry Mode each turn.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
    onResidual(ctx) {
      const p = ctx.pokemon;
      if (!/^Morpeko/.test(p.species) || p.transformed) return;
      ctx.abilityForme(p, p.species === "Morpeko" ? "Morpeko-Hangry" : "Morpeko");
    },
  },

  "Quick Draw": {
    name: "Quick Draw", num: 259, rating: 2.5,
    effect: "30% chance to move first with a damaging move in its priority bracket.",
    // (The battle engine rolls for it when it orders the moves.)
  },

  "Unseen Fist": {
    name: "Unseen Fist", num: 260, rating: 2,
    effect: "Its contact moves get through Protect and the like.",
  },

  "Curious Medicine": {
    name: "Curious Medicine", num: 261, rating: 0,
    effect: "On switch-in, its ally's stat changes are reset.",
    onStart(ctx) {
      for (const m of ctx.allies()) {
        if (!m || m === ctx.pokemon) continue;
        for (const k of Object.keys(m.boosts)) m.boosts[k] = 0;
        ctx.add("-clearboost", m, "[from] ability: Curious Medicine", "[of] " + ctx.pokemon.ident);
      }
    },
  },

  "Transistor": {
    name: "Transistor", num: 262, rating: 3.5,
    effect: "1.5× power on Electric-type moves.",
    onModifyAtk(ctx, atk, move) { if (move.type === "Electric") return ctx.chainModify(atk, 1.5); },
    onModifySpA(ctx, spa, move) { if (move.type === "Electric") return ctx.chainModify(spa, 1.5); },
  },

  "Dragon's Maw": {
    name: "Dragon's Maw", num: 263, rating: 3.5,
    effect: "1.5× power on Dragon-type moves.",
    onModifyAtk(ctx, atk, move) { if (move.type === "Dragon") return ctx.chainModify(atk, 1.5); },
    onModifySpA(ctx, spa, move) { if (move.type === "Dragon") return ctx.chainModify(spa, 1.5); },
  },

  "Chilling Neigh": {
    name: "Chilling Neigh", num: 264, rating: 3,
    effect: "Raises Attack by 1 stage when it knocks out a Pokémon.",
    onSourceAfterFaint(ctx) { if (ctx.effect && ctx.effect.effectType === "Move") ctx.boost(ctx.pokemon, { atk: 1 }); },
  },

  "Grim Neigh": {
    name: "Grim Neigh", num: 265, rating: 3,
    effect: "Raises Sp. Atk by 1 stage when it knocks out a Pokémon.",
    onSourceAfterFaint(ctx) { if (ctx.effect && ctx.effect.effectType === "Move") ctx.boost(ctx.pokemon, { spa: 1 }); },
  },

  "As One (Glastrier)": {
    name: "As One (Glastrier)", num: 266, rating: 3.5,
    effect: "Unnerve and Chilling Neigh: foes can't eat Berries; +1 Attack on a knockout.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "As One"); ctx.add("-ability", ctx.pokemon, "Unnerve"); },
    onSourceAfterFaint(ctx) { if (ctx.effect && ctx.effect.effectType === "Move") ctx.boost(ctx.pokemon, { atk: 1 }); },
  },

  "As One (Spectrier)": {
    name: "As One (Spectrier)", num: 267, rating: 3.5,
    effect: "Unnerve and Grim Neigh: foes can't eat Berries; +1 Sp. Atk on a knockout.",
    flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
    onStart(ctx) { ctx.add("-ability", ctx.pokemon, "As One"); ctx.add("-ability", ctx.pokemon, "Unnerve"); },
    onSourceAfterFaint(ctx) { if (ctx.effect && ctx.effect.effectType === "Move") ctx.boost(ctx.pokemon, { spa: 1 }); },
  },

  // ==================================================================
  // Gen 9: the one Legends: Arceus's Pokémon have (Kleavor, Hisuian Samurott)
  // ==================================================================
  "Sharpness": {
    name: "Sharpness", num: 292, rating: 3.5,
    effect: "1.5× power on slicing moves.",
    onBasePower(ctx, power, move) {
      const SLICING = ["aerialace", "aircutter", "airslash", "behemothblade", "ceaselessedge", "crosspoison", "cut", "furycutter",
        "leafblade", "nightslash", "psychocut", "razorleaf", "razorshell", "sacredsword", "secretsword", "slash", "solarblade",
        "stoneaxe", "xscissor"];
      if (SLICING.includes(move.id)) return ctx.chainModify(power, 1.5);
    },
  },

};

// ---- Gen 7 helpers ----
// An attack that took it from above half its HP to half or less.
function gen7DroppedBelowHalf(p) {
  const last = p.lastDamage;
  return !!last && p.hp > 0 && p.hp <= p.maxhp / 2 && p.hp + last.amount > p.maxhp / 2;
}
// Wimp Out / Emergency Exit: it heads back to its Trainer (a wild Pokémon
// has nowhere to go).
function gen7HalfHpSwitch(ctx, name) {
  const p = ctx.pokemon, b = ctx.battle;
  if (!b || !gen7DroppedBelowHalf(p) || (b.wild && p.side.id === "p2") || !p.side.bench(p.slot).length) return;
  ctx.add("-activate", p, "ability: " + name);
  b.pendingSwitch = { side: p.side, copy: false, slot: p.slot };
}
// Shields Down: Meteor Form above half HP, Core at half or less.
function gen7ShieldsDown(ctx) {
  const p = ctx.pokemon;
  if (!/^Minior/.test(p.species) || p.transformed || p.hp <= 0) return;
  if (p.hp > p.maxhp / 2) {
    if (p.species !== "Minior") ctx.abilityForme(p, "Minior", "{who}'s shell protected it!");
  } else if (p.species !== "Minior-Core") {
    ctx.add("-activate", p, "ability: Shields Down");
    ctx.abilityForme(p, "Minior-Core", "{who}'s shell broke open!");
  }
}
// Ice Face: Eiscue's ice head comes back in hail.
function gen8IceFace(ctx) {
  const p = ctx.pokemon;
  if (p.species === "Eiscue-Noice" && !p.transformed && ctx.isWeather("Hail")) ctx.abilityForme(p, "Eiscue", "{who}'s Ice Face was restored!");
}
// Schooling: from Lv. 20, School Form while its HP is above a quarter.
function gen7Schooling(ctx) {
  const p = ctx.pokemon;
  if (!/^Wishiwashi/.test(p.species) || p.transformed || p.hp <= 0) return;
  if (p.level >= 20 && p.hp > p.maxhp / 4) {
    if (p.species !== "Wishiwashi-School") ctx.abilityForme(p, "Wishiwashi-School", "{who} formed a school!");
  } else if (p.species !== "Wishiwashi") ctx.abilityForme(p, "Wishiwashi", "{who} stopped schooling!");
}
