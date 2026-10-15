// Damage calculator (Gen 6 mechanics)
// Depends on (load these first): type-chart.js, dex.js, moves.js, abilities.js, stat-calculator.js
//
// Quick start:
//   const a = Damage.makePokemon("Garchomp", { level: 50, nature: "Jolly",
//               evs: { atk: 252, spe: 252, hp: 4 }, item: "choice-band" });
//   const d = Damage.makePokemon("Heatran", { level: 50, evs: { hp: 252, spd: 4 } });
//   const r = Damage.calc(a, d, "Earthquake", { weather: "Sandstorm" });
//   r.damage      // 16 possible rolls (85%..100%)
//   Damage.roll(r) // one random roll
//   Damage.describe(a, d, "Earthquake", r)
//
// Battle Pokemon object shape (what calc() expects; makePokemon() builds one):
//   { species, level, types, stats:{hp,atk,def,spa,spd,spe}, maxhp, hp,
//     boosts:{atk,def,spa,spd,spe}, ability, item (kebab-case, e.g. "life-orb"),
//     status ("brn"|"par"|"psn"|"tox"|"slp"|"frz"|""), weight (kg), happiness,
//     ivs (only needed for Hidden Power type), isNFE (for Eviolite) }
//
// Field: { weather, terrain, gravity, isDoubles, reflect, lightScreen }
//   weather: "SunnyDay" | "RainDance" | "Sandstorm" | "Hail" |
//            "DesolateLand" | "PrimordialSea" | "DeltaStream"
//   terrain: "ElectricTerrain" | "GrassyTerrain" | "MistyTerrain"
//   reflect / lightScreen refer to the DEFENDER's side.
//
// Options: { crit, targets, hits, helpingHand, charge, extraAbilities,
//            lastDamageTaken (Counter/Mirror Coat/Metal Burst),
//            targetDamagedThisTurn (Assurance), hitByTarget (Avalanche/Revenge),
//            movesAfterTarget (Payback), allyFainted (Retaliate),
//            targetSwitching (Pursuit), magnitude, stockpile, ppLeft,
//            beatUpPower (one Beat Up hit), plusMinus (1.5x SpA: an ally with
//            Plus/Minus), friendGuard (0.75x: the defender's ally has Friend Guard),
//            flowerGiftAtk / flowerGiftSpD (1.5x Attack / Sp. Def: Flower Gift
//            in the sun on that side), unnerved (the defender can't eat its
//            resist Berry) }
//   targets: how many Pokémon a spread move is hitting (0.75x when > 1).

(function () {
  "use strict";

  const tr = Math.trunc;
  const pokeRound = (n) => (n % 1 > 0.5 ? Math.ceil(n) : Math.floor(n));

  // 4096-based fixed point helpers (same rounding the games use)
  const modify = (value, mult) => {
    const m = tr(mult * 4096);
    return tr((tr(value * m) + 2047) / 4096);
  };
  const chainMult = (a, b) => (a * b + 2048) >> 12; // both in 4096ths
  const applyChain = (value, chain) => tr((tr(value * chain) + 2047) / 4096);
  const fp = (mult) => tr(mult * 4096);

  const normItem = (s) => String(s || "").toLowerCase().replace(/[\s_']+/g, "-");
  const toID = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  // ---------------------------------------------------------------
  // Type effectiveness
  // ---------------------------------------------------------------
  function typeEffectiveness(moveType, defTypes) {
    const row = window.TYPE_CHART[moveType] || {};
    let m = 1;
    for (const t of defTypes) m *= row[t] != null ? row[t] : 1;
    return m;
  }

  // ---------------------------------------------------------------
  // Item tables
  // ---------------------------------------------------------------
  const TYPE_ITEMS = {
    Normal: ["silk-scarf"],
    Fire: ["charcoal", "flame-plate"],
    Water: ["mystic-water", "splash-plate", "sea-incense", "wave-incense"],
    Electric: ["magnet", "zap-plate"],
    Grass: ["miracle-seed", "meadow-plate", "rose-incense"],
    Ice: ["never-melt-ice", "icicle-plate"],
    Fighting: ["black-belt", "fist-plate"],
    Poison: ["poison-barb", "toxic-plate"],
    Ground: ["soft-sand", "earth-plate"],
    Flying: ["sharp-beak", "sky-plate"],
    Psychic: ["twisted-spoon", "mind-plate", "odd-incense"],
    Bug: ["silver-powder", "insect-plate"],
    Rock: ["hard-stone", "stone-plate", "rock-incense"],
    Ghost: ["spell-tag", "spooky-plate"],
    Dragon: ["dragon-fang", "draco-plate"],
    Dark: ["black-glasses", "dread-plate"],
    Steel: ["metal-coat", "iron-plate"],
    Fairy: ["pixie-plate"]
  };
  const TYPE_ITEM_LOOKUP = {};
  for (const [type, items] of Object.entries(TYPE_ITEMS)) {
    for (const it of items) TYPE_ITEM_LOOKUP[it] = type;
  }

  const RESIST_BERRIES = {
    "occa-berry": "Fire", "passho-berry": "Water", "wacan-berry": "Electric",
    "rindo-berry": "Grass", "yache-berry": "Ice", "chople-berry": "Fighting",
    "kebia-berry": "Poison", "shuca-berry": "Ground", "coba-berry": "Flying",
    "payapa-berry": "Psychic", "tanga-berry": "Bug", "charti-berry": "Rock",
    "kasib-berry": "Ghost", "haban-berry": "Dragon", "colbur-berry": "Dark",
    "babiri-berry": "Steel", "roseli-berry": "Fairy", "chilan-berry": "Normal"
  };

  // ---------------------------------------------------------------
  // Battle view of a Pokemon (what ability hooks see as ctx.pokemon etc.)
  // ---------------------------------------------------------------
  function makeView(p) {
    const dex = window.DEX[p.species] || {};
    const v = Object.assign({}, p);
    v.types = (p.types || dex.types || []).slice();
    v.boosts = Object.assign({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, p.boosts);
    v.maxhp = p.maxhp || p.stats.hp;
    v.baseMaxhp = v.maxhp;
    v.hp = p.hp == null ? v.maxhp : p.hp;
    v.status = p.status || "";
    v.item = normItem(p.item);
    v.abilityState = {};
    v.weight = p.weight != null ? p.weight : dex.weight || 50;
    v.hasType = (t) => v.types.includes(t);
    v.getTypes = () => v.types.slice();
    v.hasAbility = (a) => {
      const list = Array.isArray(a) ? a : [a];
      return list.includes(v.ability);
    };
    v._hit = { typeMod: 0, crit: false };
    v.getMoveHitData = () => v._hit;
    return v;
  }

  function isGrounded(v, field) {
    if (field.gravity) return true;
    if (v.item === "iron-ball") return true;
    if (v.hasType("Flying")) return false;
    if (v.ability === "Levitate") return false;
    if (v.item === "air-balloon") return false;
    return true;
  }

  // ---------------------------------------------------------------
  // Ability hook runner
  // ---------------------------------------------------------------
  // Hooks call ctx.chainModify(value, mult); we collect those multipliers in
  // `state.mult` (4096ths) and apply them once, the way the games do.
  // A hook that instead returns a plain number replaces the value.
  function runHook(abilityName, hookName, env, holder, value, move) {
    const ab = window.ABILITIES[abilityName];
    if (!ab || typeof ab[hookName] !== "function") return { value, mult: 4096 };
    const state = { mult: 4096, touched: false };
    const ctx = {
      pokemon: holder,
      source: env.attacker,
      target: env.defender,
      field: env.field,
      isWeather: (w) => {
        const list = Array.isArray(w) ? w : [w];
        return !!env.weather && list.includes(env.weather);
      },
      isTerrain: (t) => {
        const list = Array.isArray(t) ? t : [t];
        return !!env.field.terrain && list.includes(env.field.terrain);
      },
      chainModify: function (a, b) {
        const mult = arguments.length === 1 ? a : b;
        state.mult = chainMult(state.mult, fp(Array.isArray(mult) ? mult[0] / mult[1] : mult));
        state.touched = true;
        return arguments.length === 1 ? undefined : a;
      },
      modify: (v, m) => modify(v, Array.isArray(m) ? m[0] / m[1] : m),
      add: () => {},
      damage: () => {},
      heal: () => {},
      boost: () => {}
    };
    let ret;
    try {
      ret = ab[hookName](ctx, value, move);
    } catch (e) {
      return { value, mult: 4096 };
    }
    if (state.touched) return { value, mult: state.mult };
    if (typeof ret === "number" && isFinite(ret)) return { value: ret, mult: 4096 };
    return { value, mult: 4096, ret };
  }

  function abilityIsBreakable(name) {
    const ab = window.ABILITIES[name];
    return !!(ab && ab.flags && ab.flags.breakable);
  }

  // ---------------------------------------------------------------
  // Move preparation
  // ---------------------------------------------------------------
  const HP_TYPES = ["Fighting", "Flying", "Poison", "Ground", "Rock", "Bug", "Ghost",
    "Steel", "Fire", "Water", "Grass", "Electric", "Psychic", "Ice", "Dragon", "Dark"];

  function hiddenPowerType(ivs) {
    if (!ivs) return null;
    const g = (k) => ((ivs[k] != null ? ivs[k] : 31) & 1);
    const n = g("hp") + 2 * g("atk") + 4 * g("def") + 8 * g("spe") + 16 * g("spa") + 32 * g("spd");
    return HP_TYPES[tr((n * 15) / 63)];
  }

  function prepMove(name, A, env) {
    const raw = window.MOVES[name];
    if (!raw) throw new Error("Unknown move: " + name);
    const move = Object.assign({}, raw);
    move.name = name;
    move.id = toID(name);
    move.category = raw.cat;
    move.flags = Object.assign({}, raw.flags);
    if (!move.secondaries && move.secondary) move.secondaries = [move.secondary];

    // Moves whose type depends on state
    if (move.id === "weatherball") {
      const w = env.weather;
      if (w === "SunnyDay" || w === "DesolateLand") move.type = "Fire";
      else if (w === "RainDance" || w === "PrimordialSea") move.type = "Water";
      else if (w === "Sandstorm") move.type = "Rock";
      else if (w === "Hail") move.type = "Ice";
      if (move.type !== "Normal") move.power = 100;
    }
    if (move.id === "hiddenpower") {
      const t = hiddenPowerType(A.ivs);
      if (t) move.type = t;
    }

    // Attacker ability can tweak the move (Mold Breaker, Sheer Force, ...)
    const ab = window.ABILITIES[A.ability];
    if (ab && typeof ab.onModifyMove === "function") {
      try { ab.onModifyMove(move); } catch (e) { /* ignore */ }
    }
    if (ab && typeof ab.onModifyType === "function") {
      try { ab.onModifyType({ pokemon: A }, move); } catch (e) { /* ignore */ }
    }
    return move;
  }

  // ---------------------------------------------------------------
  // Base power
  // ---------------------------------------------------------------
  function weightOf(v, env) {
    let w = v.weight;
    const ab = window.ABILITIES[v.ability];
    if (ab && typeof ab.onModifyWeight === "function") {
      const r = runHook(v.ability, "onModifyWeight", env, v, w, null);
      w = applyChain(r.value, r.mult);
    }
    return Math.max(0.1, w);
  }

  function getBasePower(move, A, D, env, opts) {
    let bp = move.power;
    const id = move.id;
    const statusAny = (v) => ["brn", "par", "psn", "tox"].includes(v.status);

    switch (id) {
      case "lowkick": case "grassknot": {
        const w = weightOf(D, env);
        bp = w < 10 ? 20 : w < 25 ? 40 : w < 50 ? 60 : w < 100 ? 80 : w < 200 ? 100 : 120;
        break;
      }
      case "heavyslam": case "heatcrash": {
        const r = weightOf(A, env) / weightOf(D, env);
        bp = r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40;
        break;
      }
      case "gyroball":
        bp = Math.min(150, tr((25 * env.speD) / env.speA) + 1);
        break;
      case "electroball": {
        const r = tr(env.speA / env.speD);
        bp = r >= 4 ? 150 : r === 3 ? 120 : r === 2 ? 80 : r === 1 ? 60 : 40;
        break;
      }
      case "eruption": case "waterspout": case "dragonenergy":
        bp = Math.max(1, tr((150 * A.hp) / A.maxhp));
        break;
      case "flail": case "reversal": {
        const x = tr((A.hp * 48) / A.maxhp);
        bp = x <= 1 ? 200 : x <= 4 ? 150 : x <= 9 ? 100 : x <= 16 ? 80 : x <= 32 ? 40 : 20;
        break;
      }
      case "return": bp = Math.max(1, tr(((A.happiness != null ? A.happiness : 70) * 2) / 5)); break;
      case "frustration": bp = Math.max(1, tr(((255 - (A.happiness != null ? A.happiness : 70)) * 2) / 5)); break;
      case "crushgrip": case "wringout":
        bp = tr(tr((120 * (100 * tr((D.hp * 4096) / D.maxhp)) + 2048 - 1) / 4096) / 100) || 1;
        break;
      case "punishment": {
        let up = 0;
        for (const k of ["atk", "def", "spa", "spd", "spe"]) if (D.boosts[k] > 0) up += D.boosts[k];
        bp = Math.min(200, 60 + 20 * up);
        break;
      }
      case "storedpower": {
        let up = 0;
        for (const k of ["atk", "def", "spa", "spd", "spe"]) if (A.boosts[k] > 0) up += A.boosts[k];
        bp = 20 + 20 * up;
        break;
      }
      case "magnitude": {
        const t = { 4: 10, 5: 30, 6: 50, 7: 70, 8: 90, 9: 110, 10: 150 };
        bp = t[opts.magnitude] || 70;
        break;
      }
      case "spitup": bp = 100 * (opts.stockpile || 1); break;
      case "trumpcard": {
        const pp = opts.ppLeft != null ? opts.ppLeft : 5;
        bp = pp >= 5 ? 40 : pp === 4 ? 50 : pp === 3 ? 60 : pp === 2 ? 80 : 190;
        break;
      }
      case "hex": if (D.status) bp *= 2; break;
      case "venoshock": if (D.status === "psn" || D.status === "tox") bp *= 2; break;
      case "brine": if (D.hp * 2 <= D.maxhp) bp *= 2; break;
      case "facade": if (statusAny(A)) bp *= 2; break;
      case "wakeupslap": if (D.status === "slp") bp *= 2; break;
      case "smellingsalts": if (D.status === "par") bp *= 2; break;
      case "acrobatics": if (!A.item) bp *= 2; break;
      case "knockoff": if (D.item) bp = tr(bp * 1.5); break;
      case "assurance": if (opts.targetDamagedThisTurn) bp *= 2; break;
      case "avalanche": case "revenge": if (opts.hitByTarget) bp *= 2; break;
      case "payback": if (opts.movesAfterTarget) bp *= 2; break;
      case "retaliate": if (opts.allyFainted) bp *= 2; break;
      case "pursuit": if (opts.targetSwitching) bp *= 2; break;
      case "beatup": if (opts.beatUpPower) bp = opts.beatUpPower; break;
      default: break;
    }
    return bp;
  }

  // Damage that ignores the normal formula. Returns a number or null.
  function fixedDamage(move, A, D, opts) {
    if (move.ohko) return D.maxhp;
    switch (move.id) {
      case "seismictoss": case "nightshade": return A.level;
      case "dragonrage": return 40;
      case "sonicboom": return 20;
      case "superfang": case "naturesmadness": return Math.max(1, tr(D.hp / 2));
      case "endeavor": return D.hp > A.hp ? D.hp - A.hp : 0;
      case "finalgambit": return A.hp;
      case "counter": case "mirrorcoat": return (opts.lastDamageTaken || 0) * 2;
      case "metalburst": return tr((opts.lastDamageTaken || 0) * 1.5);
      default: return null;
    }
  }

  // ---------------------------------------------------------------
  // Attack / defense stats
  // ---------------------------------------------------------------
  function applyStage(stat, stage) {
    return stage >= 0 ? tr((stat * (2 + stage)) / 2) : tr((stat * 2) / (2 - stage));
  }

  function simpleDoubled(v, ignoreAbility) {
    return v.ability === "Simple" && !(ignoreAbility && abilityIsBreakable("Simple"));
  }

  // ---------------------------------------------------------------
  // Main calculation
  // ---------------------------------------------------------------
  function calc(attackerIn, defenderIn, moveName, field, opts) {
    field = field || {};
    opts = opts || {};
    const A = makeView(attackerIn);
    const D = makeView(defenderIn);

    // Weather (suppressed by Cloud Nine / Air Lock)
    let weather = field.weather || "";
    const suppressors = [A.ability, D.ability].concat(opts.extraAbilities || []);
    if (suppressors.includes("Cloud Nine") || suppressors.includes("Air Lock")) weather = "";

    const env = { attacker: A, defender: D, field, weather,
      speA: Math.max(1, applyStage(A.stats.spe, A.boosts.spe)),
      speD: Math.max(1, applyStage(D.stats.spe, D.boosts.spe)) };

    const move = prepMove(moveName, A, env);
    const result = {
      move: moveName, type: move.type, category: move.category,
      damage: new Array(16).fill(0), min: 0, max: 0,
      minPercent: 0, maxPercent: 0, typeEffectiveness: 1, crit: false,
      basePower: 0, hits: 1, ko: "", notes: []
    };

    if (move.category === "Status") {
      result.notes.push("Status move: no damage");
      return finish(result, D, move);
    }

    const ignoreAbility = !!move.ignoreAbility;
    const defAbilityActive = !(ignoreAbility && abilityIsBreakable(D.ability));

    // ---- Type effectiveness ----
    let eff;
    if (move.id === "flyingpress") {
      eff = typeEffectiveness("Fighting", D.types) * typeEffectiveness("Flying", D.types);
    } else {
      eff = typeEffectiveness(move.type, D.types);
    }
    // Scrappy: Normal/Fighting hit Ghost
    if (A.ability === "Scrappy" && D.hasType("Ghost") && (move.type === "Normal" || move.type === "Fighting")) {
      const others = D.types.filter((t) => t !== "Ghost");
      eff = typeEffectiveness(move.type, others);
    }
    // Ground moves hit Flying types when grounded by Gravity / Iron Ball
    if (move.type === "Ground" && D.hasType("Flying") && isGrounded(D, field)) {
      const others = D.types.filter((t) => t !== "Flying");
      eff = typeEffectiveness("Ground", others);
    }
    // Delta Stream removes Flying weaknesses
    if (weather === "DeltaStream" && D.hasType("Flying")) {
      const row = window.TYPE_CHART[move.type] || {};
      if ((row.Flying != null ? row.Flying : 1) > 1) {
        eff = eff / row.Flying;
      }
    }
    result.typeEffectiveness = eff;

    if (eff === 0) {
      result.notes.push("No effect (type immunity)");
      return finish(result, D, move);
    }

    // ---- Weather negating moves ----
    if (weather === "DesolateLand" && move.type === "Water") {
      result.notes.push("Fizzles out in harsh sunlight");
      return finish(result, D, move);
    }
    if (weather === "PrimordialSea" && move.type === "Fire") {
      result.notes.push("Evaporates in heavy rain");
      return finish(result, D, move);
    }

    // ---- Ability / item immunities ----
    if (defAbilityActive) {
      const ab = D.ability;
      const imm =
        (ab === "Levitate" && move.type === "Ground" && !field.gravity && D.item !== "iron-ball") ||
        (ab === "Flash Fire" && move.type === "Fire") ||
        ((ab === "Water Absorb" || ab === "Dry Skin" || ab === "Storm Drain") && move.type === "Water") ||
        ((ab === "Volt Absorb" || ab === "Lightning Rod" || ab === "Motor Drive") && move.type === "Electric") ||
        (ab === "Sap Sipper" && move.type === "Grass") ||
        (ab === "Soundproof" && move.flags.sound) ||
        (ab === "Bulletproof" && move.flags.bullet) ||
        (ab === "Wonder Guard" && eff <= 1 && !move.ohko);
      if (imm) {
        result.notes.push("Blocked by " + ab);
        return finish(result, D, move);
      }
    }
    if (D.item === "air-balloon" && move.type === "Ground" && !field.gravity) {
      result.notes.push("Blocked by Air Balloon");
      return finish(result, D, move);
    }

    // ---- Fixed / OHKO damage ----
    const fixed = fixedDamage(move, A, D, opts);
    if (fixed !== null) {
      result.damage = new Array(16).fill(fixed);
      result.notes.push("Fixed damage");
      return finish(result, D, move);
    }

    // ---- Critical hit ----
    let crit = !!opts.crit || !!move.willCrit;
    if (crit && defAbilityActive) {
      const dab = window.ABILITIES[D.ability];
      if (dab && typeof dab.onCriticalHit === "function") {
        try { if (dab.onCriticalHit({ pokemon: D }, move) === false) crit = false; } catch (e) { /* ignore */ }
      }
    }
    result.crit = crit;
    D._hit = { typeMod: eff > 1 ? Math.log2(eff) : eff < 1 ? -Math.log2(1 / eff) : 0, crit };

    // Aura Break flag for Dark/Fairy Aura
    const fieldAbilities = [A.ability, D.ability].concat(opts.extraAbilities || []);
    if (fieldAbilities.includes("Aura Break")) move.hasAuraBreak = true;

    // ---- Base power ----
    let bp = getBasePower(move, A, D, env, opts);
    let bpChain = 4096;
    const push = (mult) => { bpChain = chainMult(bpChain, fp(mult)); };

    const rb = runHook(A.ability, "onBasePower", env, A, bp, move);
    bp = rb.value; bpChain = chainMult(bpChain, rb.mult);

    if (defAbilityActive) {
      const rs = runHook(D.ability, "onSourceBasePower", env, D, bp, move);
      bp = rs.value; bpChain = chainMult(bpChain, rs.mult);
    }
    // Dark Aura / Fairy Aura style abilities on any active Pokemon
    for (const name of fieldAbilities) {
      const ra = runHook(name, "onAnyBasePower", env, name === D.ability ? D : A, bp, move);
      bp = ra.value; bpChain = chainMult(bpChain, ra.mult);
    }

    const aItem = A.item;
    if (aItem === "muscle-band" && move.category === "Physical") push(1.1);
    if (aItem === "wise-glasses" && move.category === "Special") push(1.1);
    if (TYPE_ITEM_LOOKUP[aItem] === move.type) push(1.2);
    if (aItem.endsWith("-gem") && aItem.slice(0, -4) === move.type.toLowerCase()) push(1.3);
    if (aItem === "adamant-orb" && A.species === "Dialga" && ["Dragon", "Steel"].includes(move.type)) push(1.2);
    if (aItem === "lustrous-orb" && A.species === "Palkia" && ["Dragon", "Water"].includes(move.type)) push(1.2);
    if (aItem === "griseous-orb" && A.species.startsWith("Giratina") && ["Dragon", "Ghost"].includes(move.type)) push(1.2);

    if (opts.helpingHand) push(1.5);
    if (opts.charge && move.type === "Electric") push(2);

    const aGrounded = isGrounded(A, field);
    const dGrounded = isGrounded(D, field);
    if (field.terrain === "ElectricTerrain" && move.type === "Electric" && aGrounded) push(1.5);
    if (field.terrain === "GrassyTerrain" && move.type === "Grass" && aGrounded) push(1.5);
    if (field.terrain === "MistyTerrain" && move.type === "Dragon" && dGrounded) push(0.5);
    if (field.terrain === "GrassyTerrain" && ["earthquake", "bulldoze", "magnitude"].includes(move.id) && dGrounded) push(0.5);

    bp = Math.max(1, applyChain(bp, bpChain));
    result.basePower = bp;

    // ---- Attack and defense stats ----
    const offensiveMon = move.overrideOffensivePokemon === "target" ? D : A;
    const offStat = move.overrideOffensiveStat || (move.category === "Physical" ? "atk" : "spa");
    const defStat = move.overrideDefensiveStat || (move.category === "Physical" ? "def" : "spd");

    let atkStage = offensiveMon.boosts[offStat];
    let defStage = D.boosts[defStat];
    if (offensiveMon.ability === "Simple" && simpleDoubled(offensiveMon, false)) atkStage = clampStage(atkStage * 2);
    if (simpleDoubled(D, ignoreAbility)) defStage = clampStage(defStage * 2);
    if (D.ability === "Unaware" && !(ignoreAbility && abilityIsBreakable("Unaware"))) atkStage = 0;
    if (A.ability === "Unaware") defStage = 0;
    if (crit) {
      if (atkStage < 0) atkStage = 0;
      if (defStage > 0) defStage = 0;
    }

    let attack = applyStage(offensiveMon.stats[offStat], atkStage);
    let defense = applyStage(D.stats[defStat], defStage);

    // Attack-side modifier chain
    let atkChain = 4096;
    const atkHook = offStat === "atk" ? "onModifyAtk" : offStat === "spa" ? "onModifySpA" : null;
    if (atkHook) {
      const r = runHook(offensiveMon.ability, atkHook, env, offensiveMon, attack, move);
      attack = r.value; atkChain = chainMult(atkChain, r.mult);
    }
    const oi = offensiveMon.item;
    if (oi === "choice-band" && offStat === "atk") atkChain = chainMult(atkChain, fp(1.5));
    if (oi === "choice-specs" && offStat === "spa") atkChain = chainMult(atkChain, fp(1.5));
    if (oi === "light-ball" && offensiveMon.species === "Pikachu" && (offStat === "atk" || offStat === "spa")) atkChain = chainMult(atkChain, fp(2));
    if (oi === "thick-club" && offStat === "atk" && ["Cubone", "Marowak"].includes(offensiveMon.species)) atkChain = chainMult(atkChain, fp(2));
    if (oi === "deep-sea-tooth" && offStat === "spa" && offensiveMon.species === "Clamperl") atkChain = chainMult(atkChain, fp(2));
    if (oi === "soul-dew" && offStat === "spa" && ["Latios", "Latias"].includes(offensiveMon.species)) atkChain = chainMult(atkChain, fp(1.5));
    if (opts.plusMinus && offStat === "spa") atkChain = chainMult(atkChain, fp(1.5));
    if (opts.flowerGiftAtk && offStat === "atk") atkChain = chainMult(atkChain, fp(1.5));
    attack = Math.max(1, applyChain(attack, atkChain));

    // Defense-side modifier chain
    let defChain = 4096;
    if (defAbilityActive) {
      const defHook = defStat === "def" ? "onModifyDef" : defStat === "spd" ? "onModifySpD" : null;
      if (defHook) {
        const r = runHook(D.ability, defHook, env, D, defense, move);
        defense = r.value; defChain = chainMult(defChain, r.mult);
      }
    }
    const di = D.item;
    if (di === "assault-vest" && defStat === "spd") defChain = chainMult(defChain, fp(1.5));
    if (di === "eviolite" && D.isNFE) defChain = chainMult(defChain, fp(1.5));
    if (di === "metal-powder" && D.species === "Ditto" && defStat === "def") defChain = chainMult(defChain, fp(2));
    if (di === "deep-sea-scale" && D.species === "Clamperl" && defStat === "spd") defChain = chainMult(defChain, fp(2));
    if (di === "soul-dew" && defStat === "spd" && ["Latios", "Latias"].includes(D.species)) defChain = chainMult(defChain, fp(1.5));
    if (weather === "Sandstorm" && D.hasType("Rock") && defStat === "spd") defChain = chainMult(defChain, fp(1.5));
    if (opts.flowerGiftSpD && defStat === "spd") defChain = chainMult(defChain, fp(1.5));
    defense = Math.max(1, applyChain(defense, defChain));

    // ---- Base damage ----
    let base = tr(tr(tr(tr((2 * A.level) / 5 + 2) * bp * attack) / defense) / 50);

    // ---- Final modifier chain (applied after burn) ----
    let finalChain = 4096;
    const pushF = (mult) => { finalChain = chainMult(finalChain, fp(mult)); };

    if (A.item === "life-orb") pushF(1.3);
    if (A.item === "expert-belt" && eff > 1) pushF(1.2);

    const screenUp = !crit && A.ability !== "Infiltrator" &&
      ((move.category === "Physical" && field.reflect) || (move.category === "Special" && field.lightScreen));
    if (screenUp) pushF(field.isDoubles ? 2732 / 4096 : 0.5);

    const berryType = RESIST_BERRIES[D.item];
    if (berryType && !opts.unnerved && berryType === move.type && (eff > 1 || berryType === "Normal")) {
      pushF(0.5);
      result.notes.push(D.item + " would be consumed");
    }

    if (opts.friendGuard) pushF(0.75);

    const ra = runHook(A.ability, "onModifyDamage", env, A, base, move);
    finalChain = chainMult(finalChain, ra.mult);
    if (defAbilityActive) {
      const rd = runHook(D.ability, "onSourceModifyDamage", env, D, base, move);
      finalChain = chainMult(finalChain, rd.mult);
    }

    // ---- Modifiers independent of the roll ----
    const spreadTargets = opts.targets != null ? opts.targets
      : (["allAdjacentFoes", "allAdjacent"].includes(move.target) && field.isDoubles ? 2 : 1);

    let stab = 1;
    if (move.forceSTAB || A.hasType(move.type) || A.ability === "Protean") stab = 1.5;
    const aab = window.ABILITIES[A.ability];
    if (aab && typeof aab.onModifySTAB === "function") {
      try {
        const s = aab.onModifySTAB({ pokemon: A }, stab, move);
        if (typeof s === "number") stab = s;
      } catch (e) { /* ignore */ }
    }

    let weatherMult = 1;
    if (weather === "SunnyDay" || weather === "DesolateLand") {
      if (move.type === "Fire") weatherMult = 1.5; else if (move.type === "Water") weatherMult = 0.5;
    } else if (weather === "RainDance" || weather === "PrimordialSea") {
      if (move.type === "Water") weatherMult = 1.5; else if (move.type === "Fire") weatherMult = 0.5;
    }

    const burned = A.status === "brn" && move.category === "Physical" &&
      A.ability !== "Guts" && move.id !== "facade";

    // ---- The 16 rolls ----
    const rolls = [];
    for (let i = 0; i < 16; i++) {
      let dmg = base + 2;
      if (spreadTargets > 1) dmg = modify(dmg, 0.75);
      if (weatherMult !== 1) dmg = modify(dmg, weatherMult);
      if (crit) dmg = tr(dmg * 1.5);
      dmg = tr((dmg * (85 + i)) / 100);
      if (stab !== 1) dmg = modify(dmg, stab);
      let t = eff;
      while (t >= 2) { dmg *= 2; t /= 2; }
      while (t <= 0.5 && t > 0) { dmg = tr(dmg / 2); t *= 2; }
      if (burned) dmg = modify(dmg, 0.5);
      dmg = applyChain(dmg, finalChain);
      rolls.push(Math.max(1, dmg));
    }
    result.damage = rolls;

    // ---- Multi-hit ----
    if (typeof move.multihit === "number") result.hits = move.multihit;
    else if (Array.isArray(move.multihit)) result.hits = A.ability === "Skill Link" ? move.multihit[1] : move.multihit[0];
    if (opts.hits != null) result.hits = opts.hits;

    return finish(result, D, move);
  }

  const clampStage = (n) => Math.max(-6, Math.min(6, n));

  function finish(result, D, move) {
    const d = result.damage;
    result.min = Math.min.apply(null, d);
    result.max = Math.max.apply(null, d);
    result.minPercent = Math.round((result.min / D.maxhp) * 1000) / 10;
    result.maxPercent = Math.round((result.max / D.maxhp) * 1000) / 10;
    result.totalMin = result.min * result.hits;
    result.totalMax = result.max * result.hits;

    // KO text based on the defender's current HP
    if (result.max > 0) {
      const hp = D.hp;
      const hits = result.hits;
      if (hits === 1) {
        const killing = d.filter((x) => x >= hp).length;
        if (killing === 16) result.ko = "guaranteed OHKO";
        else if (killing > 0) result.ko = "possible OHKO (" + Math.round((killing / 16) * 1000) / 10 + "%)";
        else {
          const guaranteed = Math.ceil(hp / result.min);
          const possible = Math.ceil(hp / result.max);
          result.ko = guaranteed === possible ? "guaranteed " + guaranteed + "HKO"
            : "possible " + possible + "HKO";
        }
      } else {
        result.ko = result.totalMin >= hp ? "guaranteed OHKO" : result.totalMax >= hp ? "possible OHKO" : "";
      }
    }
    return result;
  }

  // ---------------------------------------------------------------
  // Helpers for the battle engine and UI
  // ---------------------------------------------------------------
  // Pick one random roll from a calc() result.
  function roll(result, rng) {
    const r = rng || Math.random;
    return result.damage[Math.floor(r() * 16)];
  }

  // Gen 6 critical hit chance (0..1) for a move.
  function critChance(attackerIn, moveName, opts) {
    opts = opts || {};
    const A = makeView(attackerIn);
    const move = window.MOVES[moveName];
    if (!move) throw new Error("Unknown move: " + moveName);
    if (move.willCrit) return 1;
    // moves.js has no critRatio field, so detect high-crit moves from their text.
    let stage = move.critRatio || (/high critical hit ratio/i.test(move.shortDesc || "") ? 2 : 1);
    const ab = window.ABILITIES[A.ability];
    if (ab && typeof ab.onModifyCritRatio === "function") {
      try {
        const r = ab.onModifyCritRatio({ pokemon: A }, stage);
        if (typeof r === "number") stage = r;
      } catch (e) { /* ignore */ }
    }
    if (opts.focusEnergy) stage += 2;
    if (A.item === "scope-lens" || A.item === "razor-claw") stage += 1;
    if (A.item === "stick" && A.species === "Farfetch'd") stage += 2;
    if (A.item === "lucky-punch" && A.species === "Chansey") stage += 2;
    const table = [16, 16, 8, 2, 1];
    return 1 / table[Math.max(0, Math.min(4, stage))];
  }

  // Build a battle-ready Pokemon from a DEX species.
  // opts: { level, nature, ivs, evs, ability, item, status, hp, boosts, types, weight, happiness }
  function makePokemon(speciesName, opts) {
    opts = opts || {};
    const dex = window.DEX[speciesName];
    if (!dex) throw new Error("Unknown species: " + speciesName);
    if (!window.Stats) throw new Error("stat-calculator.js must be loaded before damage-calculator.js");
    const level = opts.level != null ? opts.level : 50;
    const stats = window.Stats.calcAllStats(speciesName, {
      level, nature: opts.nature, ivs: opts.ivs, evs: opts.evs
    });
    return {
      species: speciesName,
      level,
      types: (opts.types || dex.types).slice(),
      stats,
      maxhp: stats.hp,
      hp: opts.hp != null ? opts.hp : stats.hp,
      boosts: Object.assign({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, opts.boosts),
      ability: opts.ability || (dex.abilities && dex.abilities[0]) || "",
      item: opts.item || "",
      status: opts.status || "",
      ivs: opts.ivs,
      weight: opts.weight != null ? opts.weight : dex.weight,
      happiness: opts.happiness != null ? opts.happiness : 70,
      isNFE: !!opts.isNFE
    };
  }

  // Short readable summary, e.g. "Earthquake: 96-114 (38.2 - 45.4%) -- guaranteed 3HKO"
  function describe(attacker, defender, moveName, result) {
    let s = attacker.species + " " + moveName + " vs. " + defender.species + ": ";
    if (result.max === 0) return s + (result.notes[0] || "no damage");
    s += result.min + "-" + result.max + " (" + result.minPercent + " - " + result.maxPercent + "%)";
    if (result.hits > 1) s += " per hit x" + result.hits;
    if (result.ko) s += " -- " + result.ko;
    if (result.crit) s += " (crit)";
    return s;
  }

  window.Damage = {
    calc,
    roll,
    critChance,
    makePokemon,
    describe,
    typeEffectiveness,
    hiddenPowerType
  };
})();
