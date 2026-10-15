// Battle engine (Gen 6 singles, headless)
// Depends on (load these first): type-chart.js, natures.js, dex.js, moves.js,
// abilities.js, items.js, stat-calculator.js, damage-calculator.js, conditions.js,
// battle-moves.js. See index.html for the full load order.
//
//   const battle = new Battle({
//     seed: 1234,
//     p1: { name: "Ash",  team: [ { species: "Garchomp", level: 50, nature: "Jolly",
//                                  evs: { atk: 252, spe: 252 }, ability: "Rough Skin",
//                                  item: "Life Orb", moves: ["Earthquake", "Outrage"] }, ... ] },
//     p2: { name: "Gary", team: [ ... ] }
//   });
//   battle.start();
//   battle.getRequest("p1");                     // what p1 may do right now
//   battle.choose("p1", { type: "move", move: 0 });        // slot index or move name
//   battle.choose("p2", { type: "switch", index: 2 });     // team index
//   battle.events                                // Showdown-style event log (arrays)
//   Battle.formatEvent(ev)                       // readable text for an event
//
// Choice formats:
//   { type: "move", move: 0 | "Earthquake", mega: true? }
//   { type: "switch", index: n }
// When a side must switch (fainted, U-turn, ...), getRequest().phase is "switch".
//
// Saved state: a team set may also carry hp, status, pp (array, per move slot),
// exp and happiness, so a Pokémon can enter battle hurt or poisoned.
//
// Progression options (p1 is always the player):
//   exp: true    p1 earns experience, EVs and level-ups when a p2 Pokémon faints
//                (or is caught). Level-ups happen mid-battle with new stats.
//                Events: -exp, -levelup, -learnmove, and -trylearn when a move
//                needs a free slot: answer with battle.replaceMove(...).
//   expShare: true   Gen 6 Exp. Share (with exp): Pokémon that battled get the
//                full amount, the rest of the party (not fainted) half, and all of
//                them get EVs. Events: -expshare, then -exp marked "share".
//   wild: true   p2 is a wild Pokémon: p1 may also choose
//                { type: "ball", ball: "great-ball" } or { type: "run" }.
//                Ends with battle.caught (the Pokémon) or battle.escaped.
//   catchContext: { night, caughtBefore(species) }   for Dusk / Repeat Balls
//
// Items from the bag (needs engine/item-use.js), either side, any battle:
//   { type: "item", item: "potion", target: teamIndex, move: slot (Ether etc.) }
// Used before moves; event: -useitem.

(function () {
  "use strict";

  const tr = Math.trunc;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const toID = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const normItem = (s) => String(s || "").toLowerCase().replace(/[\s_']+/g, "-");
  const E = (effectType, id, name) => ({ effectType, id, name: name || id });
  const newMoveSlot = (key) => ({ id: toID(key), name: key, pp: window.MOVES[key].pp, maxpp: window.MOVES[key].pp });
  const applyChain = (v, chain) => tr((tr(v * chain) + 2047) / 4096);
  const chainMult = (a, b) => (a * b + 2048) >> 12;
  const fp = (m) => tr(m * 4096);

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const WEATHER_NAMES = {
    sunnyday: "SunnyDay", raindance: "RainDance", sandstorm: "Sandstorm", hail: "Hail",
    desolateland: "DesolateLand", primordialsea: "PrimordialSea", deltastream: "DeltaStream"
  };
  const TERRAIN_NAMES = {
    electricterrain: "ElectricTerrain", grassyterrain: "GrassyTerrain", mistyterrain: "MistyTerrain"
  };
  const PRIMAL = ["DesolateLand", "PrimordialSea", "DeltaStream"];
  const WEATHER_ROCKS = { SunnyDay: "heat-rock", RainDance: "damp-rock", Sandstorm: "smooth-rock", Hail: "icy-rock" };
  const DEF_ACC_ABILITIES = new Set(["Sand Veil", "Snow Cloak", "Tangled Feet", "Wonder Skin"]);
  const SILENT_VOLATILES = new Set(["choicelock", "mustrecharge", "lockedmove", "twoturnmove", "flinch",
    "protect", "kingsshield", "spikyshield", "endure", "charge", "roost", "focuspunch", "destinybond", "focusenergy"]);
  const INVULN = {
    fly: "fly", bounce: "fly", dig: "dig", dive: "dive", shadowforce: "shadow", phantomforce: "shadow"
  };
  const INVULN_HITS = {
    fly: ["gust", "twister", "thunder", "skyuppercut", "hurricane", "smackdown", "whirlwind"],
    dig: ["earthquake", "magnitude", "fissure"],
    dive: ["surf", "whirlpool"],
    shadow: []
  };
  const STALL_MOVES = new Set(["protect", "detect", "endure", "kingsshield", "spikyshield", "quickguard", "wideguard", "matblock", "craftyshield"]);

  // Indexes
  let DEX_INDEX = null, MOVE_INDEX = null, ABILITY_CONDITIONS = null, MEGA_MAP = null;
  function buildIndexes() {
    if (DEX_INDEX) return;
    DEX_INDEX = {}; MOVE_INDEX = {}; ABILITY_CONDITIONS = {}; MEGA_MAP = {};
    for (const k of Object.keys(window.DEX)) DEX_INDEX[toID(k)] = k;
    for (const k of Object.keys(window.MOVES)) MOVE_INDEX[toID(k)] = k;
    for (const [k, ab] of Object.entries(window.ABILITIES)) if (ab.condition) ABILITY_CONDITIONS[toID(k)] = ab.condition;
    // Struggle is typeless in Gen 6
    window.MOVES.Struggle = Object.assign({}, window.MOVES.Struggle, { type: "???" });
    // Mega stones: parse "Allows X to Mega Evolve into Mega X (Y)."
    for (const [id, it] of Object.entries(window.ITEMS)) {
      if (it.category !== "mega-stones") continue;
      const m = /into Mega ([^.]+)\./.exec(it.effect || "");
      if (!m) continue;
      let name = m[1].trim();
      let forme = null;
      const xy = /^(.+) ([XY])$/.exec(name);
      if (xy) forme = xy[1] + "-Mega-" + xy[2]; else forme = name + "-Mega";
      if (!window.DEX[forme]) {
        const cand = Object.keys(window.DEX).find((k) => k.indexOf(name.split(" ")[0] + "-Mega") === 0);
        forme = cand || null;
      }
      if (forme) MEGA_MAP[id] = forme;
    }
  }
  const getCondition = (id) => window.CONDITIONS.volatiles[id] || ABILITY_CONDITIONS[id] || null;

  // ---------------------------------------------------------------
  // Pokemon
  // ---------------------------------------------------------------
  class Pokemon {
    constructor(battle, side, set, index) {
      buildIndexes();
      const speciesKey = DEX_INDEX[toID(set.species)];
      if (!speciesKey) throw new Error("Unknown species: " + set.species);
      const dex = window.DEX[speciesKey];
      this.battle = battle;
      this.side = side;
      this.position = index;
      this.species = speciesKey;
      this.baseSpecies = speciesKey;
      this.name = set.name || speciesKey;
      this.level = set.level != null ? set.level : 50;
      this.nature = set.nature || "Hardy";
      this.ivs = Object.assign({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, set.ivs);
      this.evs = Object.assign({}, set.evs);
      this.happiness = set.happiness != null ? set.happiness : 70;
      this.isNFE = !!set.isNFE;
      this.stats = window.Stats.calcAllStats(speciesKey, { level: this.level, nature: this.nature, ivs: this.ivs, evs: this.evs });
      this.maxhp = this.baseMaxhp = this.stats.hp;
      this.hp = this.maxhp;
      this.types = dex.types.slice();
      this.baseTypes = dex.types.slice();
      this.weight = set.weight != null ? set.weight : dex.weight;
      this.ability = set.ability && window.ABILITIES[set.ability] ? set.ability : (dex.abilities && dex.abilities[0]) || "";
      this.baseAbility = this.ability;
      this.item = normItem(set.item);
      this.lastItem = "";
      this.boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
      this.status = "";
      this.statusState = {};
      this.volatiles = {};
      this.abilityState = {};
      this.fainted = false;
      this.isActive = false;
      this.activeTurns = 0;
      this.trapped = false;
      this.switchFlag = false;
      this.lastMove = "";
      this.moveThisTurn = false;
      this.lastDamage = null;
      this.mega = false;
      this.transformed = false;
      this.original = null;
      this.gender = Pokemon.rollGender(battle, set.gender, dex.gender);
      this._hit = { typeMod: 0, crit: false };
      // PP Ups (0-3): one number for every move, or an array per move slot.
      const ppUpsFor = (i) => (Array.isArray(set.ppUps) ? set.ppUps[i] || 0 : set.ppUps || 0);
      this.moves = [];
      for (const [i, n] of (set.moves || []).slice(0, 4).entries()) {
        const key = MOVE_INDEX[toID(n)];
        if (!key) throw new Error("Unknown move: " + n);
        const base = window.MOVES[key].pp;
        const maxpp = Math.floor(base * (5 + clamp(ppUpsFor(i), 0, 3)) / 5);
        this.moves.push({ id: toID(key), name: key, pp: maxpp, maxpp });
      }
      this.teamIndex = index;
      this.leveledUp = false;
      // Saved state carried in from outside the battle.
      if (set.pp) this.moves.forEach((m, i) => { if (set.pp[i] != null) m.pp = clamp(set.pp[i], 0, m.maxpp); });
      if (set.hp != null) {
        this.hp = clamp(set.hp, 0, this.maxhp);
        this.fainted = this.hp === 0;
      }
      if (set.status && !this.fainted) {
        this.status = set.status;
        if (set.status === "slp") this.statusState.time = battle.randInt(1, 3);
        if (set.status === "tox") this.statusState.stage = 0;
      }
      this.exp = set.exp != null ? set.exp
        : window.Experience ? window.Experience.expForLevel(window.Experience.growthRate(speciesKey), this.level) : 0;
    }
    static rollGender(battle, forced, text) {
      if (forced) { const g = String(forced).toUpperCase()[0]; return g === "M" || g === "F" ? g : "N"; }
      if (!text || /genderless/i.test(text)) return "N";
      const m = /([\d.]+)% Male/.exec(text);
      const pct = m ? parseFloat(m[1]) : 0;
      if (pct >= 100) return "M";
      if (pct <= 0) return "F";
      return battle.random() * 100 < pct ? "M" : "F";
    }
    get ident() { return this.side.id + "a: " + this.name; }
    hasType(t) { return this.types.includes(t); }
    getTypes() { return this.types.slice(); }
    setType(t) { this.types = [].concat(t); return true; }
    ignoringAbility() { return !!this.volatiles.gastroacid || this.battle._breakAbilityOf === this; }
    hasAbility(a) {
      if (this.ignoringAbility()) return false;
      return (Array.isArray(a) ? a : [a]).includes(this.ability);
    }
    getAbility() {
      const ab = window.ABILITIES[this.ability] || { name: this.ability };
      return Object.assign({ id: toID(this.ability), flags: {} }, ab, { flags: ab.flags || {} });
    }
    getItem() {
      const it = window.ITEMS[this.item] || { name: this.item };
      return Object.assign({ id: this.item, isBerry: /-berry$/.test(this.item) }, it);
    }
    isGrounded() { return this.battle.isGrounded(this); }
    isAdjacent() { return true; }
    isAlly(o) { return !!o && o.side === this.side; }
    heal(n) { return this.battle.heal(this, n, this); }
    addVolatile(id, source, effect) { return this.battle.addVolatile(this, id, source, effect); }
    removeVolatile(id) { return this.battle.removeVolatile(this, id); }
    trySetStatus(status, source, effect) { return this.battle.trySetStatus(this, status, source, effect); }
    cureStatus() { return this.battle.cureStatus(this); }
    tryTrap() { this.trapped = true; return true; }
    setAbility(ab, source) {
      const name = typeof ab === "string" ? ab : ab.name;
      if (!window.ABILITIES[name]) return false;
      this.ability = name;
      this.abilityState = {};
      this.battle.add("-ability", this, name, "[from] ability: " + (source && source.ability || ""));
      return true;
    }
    getStat(stat) { return this.battle.getBoostedStat(this, stat); }
    getMoveHitData() { return this._hit; }
    get speciesData() { return window.DEX[this.species]; }
    get moveSlots() { return this.moves.map((m) => ({ id: m.id, move: m.name, name: m.name, pp: m.pp, maxpp: m.maxpp })); }
    get hpType() { return window.Damage.hiddenPowerType(this.ivs) || "Dark"; }
    adjacentAllies() { return []; }
    hasItem(i) { return (Array.isArray(i) ? i : [i]).map(normItem).includes(this.item); }
    getUpdatedDetails() { return this.species + ", L" + this.level; }
    runEffectiveness(move) {
      const t = move && move.type;
      const eff = window.Damage.typeEffectiveness(t, this.types);
      return eff === 0 ? -Infinity : eff > 1 ? Math.log2(eff) : eff < 1 ? -Math.log2(1 / eff) : 0;
    }
    runImmunity(x) {
      const type = typeof x === "string" ? x : x && x.type;
      if (!type || type === "???") return true;
      return window.Damage.typeEffectiveness(type, this.types) !== 0;
    }
    runStatusImmunity(id) {
      if (id === "powder") return !this.hasType("Grass");
      if (id === "brn") return !this.hasType("Fire");
      if (id === "par") return !this.hasType("Electric");
      if (id === "frz") return !this.hasType("Ice");
      if (id === "psn" || id === "tox") return !this.hasType("Poison") && !this.hasType("Steel");
      return true;
    }
  }

  // ---------------------------------------------------------------
  // Side
  // ---------------------------------------------------------------
  class Side {
    constructor(battle, id, opts) {
      this.battle = battle;
      this.id = id;
      this.name = opts.name || id;
      this.pokemon = (opts.team || []).slice(0, 6).map((s, i) => new Pokemon(battle, this, s, i));
      if (!this.pokemon.length) throw new Error(id + " has no Pokemon");
      this.active = null;
      this.conditions = {};
      this.choice = null;
      this.foe = null;
      this.megaUsed = false;
      this.faintedLastTurn = false;
      this.faintedThisTurn = false;
    }
    get remaining() { return this.pokemon.filter((p) => !p.fainted).length; }
  }

  // ---------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------
  class Battle {
    constructor(opts) {
      buildIndexes();
      opts = opts || {};
      this.seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9);
      this.prng = mulberry32(this.seed);
      this.debug = !!opts.debug;
      this.events = [];
      this.onEvent = opts.onEvent || null;
      this.turn = 0;
      this.phase = "init";
      this.ended = false;
      this.winner = null;
      this.queue = [];
      this.switchSides = [];
      this.switchCause = null;
      this.pendingSwitch = null;
      this.expEnabled = !!opts.exp;
      this.expShare = !!opts.expShare;
      this.wild = !!opts.wild;
      this.catchContext = opts.catchContext || {};
      this.runAttempts = 0;
      this.caught = null;
      this.escaped = false;
      this.sides = { p1: new Side(this, "p1", opts.p1 || {}), p2: new Side(this, "p2", opts.p2 || {}) };
      this.sides.p1.foe = this.sides.p2;
      this.sides.p2.foe = this.sides.p1;
      this.field = {
        weather: "", weatherTurns: 0, weatherSource: null,
        terrain: "", terrainTurns: 0,
        pseudo: {},
        effectiveWeather: () => this.getWeather()
      };
      this.dexView = {
        moves: { get: (n) => { const key = MOVE_INDEX[toID(n)]; const raw = window.MOVES[key]; return raw && Object.assign({ id: toID(key), name: key, basePower: raw.power, category: raw.cat }, raw); } },
        getEffectiveness: (type, mon) => { const e = window.Damage.typeEffectiveness(type, mon.types); return e > 1 ? Math.log2(e) : e < 1 && e > 0 ? -Math.log2(1 / e) : e === 0 ? -Infinity : 0; },
        items: { get: (id) => { const it = window.ITEMS[normItem(id)] || { name: id }; return Object.assign({ id: normItem(id), isBerry: /-berry$/.test(normItem(id)) }, it); } },
        getImmunity: (type, mon) => !(type === "powder" && mon && mon.hasType("Grass")),
        getActiveMove: (id) => this.getActiveMove(MOVE_INDEX[toID(id)] || id)
      };
    }

    // ---------- RNG ----------
    random() { return this.prng(); }
    randInt(a, b) { return a + Math.floor(this.random() * (b - a + 1)); }
    randomChance(n, d) { return this.random() * d < n; }
    sample(arr) { return arr[Math.floor(this.random() * arr.length)]; }

    // ---------- Log ----------
    add(type, ...args) {
      const out = [type];
      for (const a of args) {
        if (a instanceof Pokemon) out.push(a.ident);
        else if (a && typeof a === "object" && !Array.isArray(a) && a.name !== undefined) out.push(a.name);
        else out.push(a);
      }
      this.events.push(out);
      if (this.onEvent) this.onEvent(out);
    }
    hpStr(mon) { return mon.hp + "/" + mon.maxhp + (mon.status ? " " + mon.status : ""); }

    static formatEvent(ev) {
      const [t, a, b, c, d] = ev;
      const nm = (s) => String(s || "").replace(/^p\da: /, "");
      switch (t) {
        case "turn": return "=== Turn " + a + " ===";
        case "switch": return nm(a) + " was sent out!  (" + b + ")";
        case "drag": return nm(a) + " was dragged out!";
        case "move": return nm(a) + " used " + b + "!";
        case "-damage": return "  " + nm(a) + " -> " + b + (c ? "  " + c : "");
        case "-heal": return "  " + nm(a) + " healed -> " + b + (c ? "  " + c : "");
        case "faint": return nm(a) + " fainted!";
        case "-miss": return "  " + nm(a) + "'s attack missed!";
        case "-crit": return "  A critical hit!";
        case "-supereffective": return "  It's super effective!";
        case "-resisted": return "  It's not very effective...";
        case "-immune": return "  It doesn't affect " + nm(a) + "..." + (b ? " " + b : "");
        case "-fail": return "  But it failed!";
        case "-status": return "  " + nm(a) + " got " + b + "!";
        case "-curestatus": return "  " + nm(a) + " was cured of " + b + "!";
        case "-boost": return "  " + nm(a) + "'s " + b + " rose" + (c > 1 ? " sharply" : "") + "!";
        case "-unboost": return "  " + nm(a) + "'s " + b + " fell" + (c > 1 ? " harshly" : "") + "!";
        case "-weather": return "  Weather: " + a + (b ? " " + b : "");
        case "-fieldstart": return "  Field: " + a;
        case "-sidestart": return "  " + a + " set up " + b;
        case "-sideend": return "  " + a + "'s " + b + " ended";
        case "-ability": return "  [" + nm(a) + "'s " + b + "]";
        case "cant": return nm(a) + " can't move (" + b + ")";
        case "-exp": return "  " + nm(a) + " gained " + b + " Exp. Points!";
        case "-expshare": return "  The rest of your team gained Exp. Points thanks to the Exp. Share!";
        case "-levelup": return "  " + nm(a) + " grew to Lv. " + b + "!";
        case "-learnmove": return "  " + nm(a) + " learned " + b + "!";
        case "-trylearn": return "  " + nm(a) + " wants to learn " + b + ", but already knows four moves.";
        case "-useitem": return "Used " + b + " on " + nm(c) + "  (" + ev[5] + ")";
        case "-ball": return "Threw a " + b + " at " + nm(c) + "... " + d + " shake(s)";
        case "caught": return "*** Gotcha! " + nm(a) + " was caught! ***";
        case "-run": return "Got away safely!";
        case "-runfail": return "Couldn't get away!";
        case "win": return "*** " + a + " wins! ***";
        case "tie": return "*** It's a tie! ***";
        default: return "  " + ev.join(" | ");
      }
    }

    // ---------- Handlers / events ----------
    getBreakAbility(o) { return !!o.breakAbility; }

    getHandlers(mon, name, o) {
      const hs = [];
      const only = o.only;
      if (!only || only === "ability") {
        const ab = window.ABILITIES[mon.ability];
        if (ab && typeof ab[name] === "function" && !mon.volatiles.gastroacid) {
          const breakable = ab.flags && ab.flags.breakable;
          const accOk = !o.accSide || (o.accSide === "defender") === DEF_ACC_ABILITIES.has(ab.name);
          if (accOk && !(o.breakAbility && breakable)) {
            hs.push({ fn: ab[name], thisObj: ab, effect: E("Ability", toID(ab.name), ab.name), state: mon.abilityState });
          }
        }
      }
      if (!only || only === "item") {
        const it = window.ITEM_EFFECTS[mon.item];
        if (it && typeof it[name] === "function" && !mon.volatiles.embargo && !mon.hasAbility("Klutz")
            && (!o.accSide || it.accSide === o.accSide)) {
          hs.push({ fn: it[name], thisObj: it, effect: E("Item", mon.item, mon.item), state: {} });
        }
      }
      if (!only || only === "status") {
        const st = mon.status && window.CONDITIONS.statuses[mon.status];
        if (st && typeof st[name] === "function") {
          hs.push({ fn: st[name], thisObj: st, effect: E("Status", mon.status, st.name), state: mon.statusState });
        }
      }
      if (!only || only === "volatile") {
        for (const id of Object.keys(mon.volatiles)) {
          const c = getCondition(id);
          if (c && typeof c[name] === "function") {
            hs.push({ fn: c[name], thisObj: c, effect: E("Volatile", id, c.name || id), state: mon.volatiles[id] });
          }
        }
        for (const id of Object.keys(mon.side.conditions)) {
          const c = window.CONDITIONS.sides[id];
          if (c && typeof c[name] === "function") {
            hs.push({ fn: c[name], thisObj: c, effect: E("SideCondition", id, c.name), state: mon.side.conditions[id] });
          }
        }
      }
      return hs;
    }

    makeCtx(holder, h, o) {
      const b = this;
      const st = { mult: 4096, touched: false };
      const effect = o.effect || h.effect;
      const ctx = {
        battle: b, pokemon: holder, source: o.source, target: o.target || holder,
        effect, effectState: h.state, move: o.move, field: b.field, dex: b.dexView,
        activePokemon: o.source, activeTarget: o.target, _state: st,
        add: (...a) => b.add(...a),
        boost: (mon, boosts, source, eff) => b.boost(mon, boosts, source, eff && typeof eff === "object" ? eff : h.effect),
        heal: (mon, n, source, eff) => b.heal(mon, n, source, eff || h.effect),
        damage: (mon, n, source, eff) => b.damage(mon, n, source, eff || h.effect),
        cureStatus: (mon, silent) => b.cureStatus(mon, silent),
        trySetStatus: (mon, status, source, eff) => b.trySetStatus(mon, status, source, eff || h.effect),
        setWeather: (w) => b.setWeather(w, holder, h.effect),
        clearWeather: () => b.clearWeather(),
        isWeather: (w) => { const cur = b.getWeather(); return !!cur && (Array.isArray(w) ? w : [w]).includes(cur); },
        isTerrain: (t) => !!b.field.terrain && (Array.isArray(t) ? t : [t]).includes(b.field.terrain),
        randomChance: (n, d) => b.randomChance(n, d),
        sample: (a) => b.sample(a),
        random: (a, c) => (a === undefined ? b.random() : c === undefined ? Math.floor(b.random() * a) : b.randInt(a, c - 1)),
        foes: () => (holder.side.foe.active && !holder.side.foe.active.fainted ? [holder.side.foe.active] : []),
        allies: () => [],
        getAllActive: () => b.getActives(),
        checkMoveMakesContact: (move, attacker, defender) => !!(move && move.flags && move.flags.contact)
          && !(attacker && attacker.item === "protective-pads"),
        setItem: (mon, item) => { mon.item = normItem(item); return true; },
        takeItem: (mon) => b.takeItem(mon),
        setType: (mon, t) => mon.setType(t),
        formeChange: () => false,
        transformInto: (mon, t) => b.transformInto(mon, t),
        singleEvent: () => undefined,
        actions: { useMove: (move, user, opts) => b.execMove(user, move, { target: opts && opts.target, bounced: true }) },
        chainModify: function (a, c) {
          const m = arguments.length === 1 ? a : c;
          st.mult = chainMult(st.mult, fp(Array.isArray(m) ? m[0] / m[1] : m));
          st.touched = true;
          return arguments.length === 1 ? undefined : a;
        },
        modify: (v, m) => tr((tr(v * fp(m)) + 2047) / 4096)
      };
      return ctx;
    }

    // Runs `name` handlers for one Pokemon. Returns the (possibly modified) relay
    // value, or false if a handler blocked the event.
    runEvent(name, holder, o) {
      o = o || {};
      let relay = o.relay;
      const hs = this.getHandlers(holder, name, o);
      for (const h of hs) {
        const ctx = this.makeCtx(holder, h, o);
        const args = (relay !== undefined ? [relay] : []).concat(o.args || []);
        let r;
        try { r = h.fn.apply(h.thisObj, [ctx].concat(args)); }
        catch (e) { if (this.debug) throw e; continue; }
        if (ctx._state.touched) {
          if (typeof relay === "number") relay = applyChain(relay, ctx._state.mult);
        } else if (r === false) return false;
        else if (typeof r === "number" && typeof relay === "number") relay = r;
        if (relay === false) return false;
      }
      return relay;
    }

    // Calls one ability hook directly and returns its raw result.
    callAbility(mon, hookName, o, ...args) {
      const ab = window.ABILITIES[mon.ability];
      if (!ab || typeof ab[hookName] !== "function" || mon.volatiles.gastroacid) return undefined;
      const h = { fn: ab[hookName], thisObj: ab, effect: E("Ability", toID(ab.name), ab.name), state: mon.abilityState };
      const ctx = this.makeCtx(mon, h, o || {});
      try { return ab[hookName].apply(ab, [ctx].concat(args)); }
      catch (e) { if (this.debug) throw e; return undefined; }
    }

    getActives() { return [this.sides.p1.active, this.sides.p2.active].filter((m) => m && !m.fainted); }

    // ---------- Stats ----------
    getBoostedStat(mon, stat) {
      const stage = clamp(mon.boosts[stat] || 0, -6, 6);
      const v = mon.stats[stat];
      return stage >= 0 ? tr((v * (2 + stage)) / 2) : tr((v * 2) / (2 - stage));
    }
    getSpeed(mon) {
      let s = this.getBoostedStat(mon, "spe");
      s = this.runEvent("onModifySpe", mon, { relay: s });
      if (s === false) s = 1;
      return Math.max(1, tr(s));
    }
    isGrounded(mon) {
      if (this.field.pseudo.gravity) return true;
      if (mon.item === "iron-ball") return true;
      if (mon.hasType("Flying")) return false;
      if (mon.hasAbility("Levitate")) return false;
      if (mon.item === "air-balloon") return false;
      if (mon.volatiles.magnetrise) return false;
      return true;
    }

    // ---------- Field helpers ----------
    getWeather() {
      if (!this.field.weather) return "";
      for (const m of this.getActives()) {
        const ab = window.ABILITIES[m.ability];
        if (ab && ab.suppressWeather && !m.volatiles.gastroacid) return "";
      }
      return this.field.weather;
    }
    setWeather(name, source, effect, durationOverride) {
      name = WEATHER_NAMES[toID(name)] || name;
      const f = this.field;
      if (f.weather === name) return false;
      const wobj = { id: name };
      for (const m of this.getActives()) {
        const r = this.callAbility(m, "onAnySetWeather", { source }, wobj);
        if (r === false) return false;
      }
      let dur = 5;
      if (PRIMAL.includes(name)) dur = Infinity;
      else if (source && source.item === WEATHER_ROCKS[name]) dur = 8;
      if (durationOverride) dur = durationOverride;
      f.weather = name; f.weatherTurns = dur; f.weatherSource = source || null;
      const from = effect && effect.effectType === "Ability" ? "[from] ability: " + effect.name + " [of] " + (source ? source.ident : "") : "";
      this.add("-weather", name, from);
      return true;
    }
    clearWeather() {
      if (!this.field.weather) return false;
      this.add("-weather", "none");
      this.field.weather = ""; this.field.weatherTurns = 0; this.field.weatherSource = null;
      return true;
    }
    setTerrain(name) {
      name = TERRAIN_NAMES[toID(name)] || name;
      if (this.field.terrain === name) return false;
      this.field.terrain = name; this.field.terrainTurns = 5;
      this.add("-fieldstart", name);
      return true;
    }
    addSideCondition(side, id, source) {
      const c = window.CONDITIONS.sides[id];
      if (!c) return false;
      let st = side.conditions[id];
      if (c.layers) {
        if (st && st.layers >= c.layers) return false;
        if (st) st.layers++; else st = side.conditions[id] = { layers: 1, source };
      } else {
        if (st) return false;
        let dur = c.duration;
        if (source && source.item === "light-clay" && (id === "reflect" || id === "lightscreen")) dur = 8;
        st = side.conditions[id] = { duration: dur, source };
      }
      this.add("-sidestart", side.id, c.name || id);
      return true;
    }
    removeSideCondition(side, id) {
      if (!side.conditions[id]) return false;
      this.add("-sideend", side.id, (window.CONDITIONS.sides[id] || {}).name || id);
      delete side.conditions[id];
      return true;
    }

    // ---------- HP ----------
    heal(mon, amount, source, effect) {
      if (!mon || mon.fainted || mon.hp <= 0 || mon.hp >= mon.maxhp) return 0;
      amount = Math.max(1, Math.floor(amount));
      const healed = Math.min(amount, mon.maxhp - mon.hp);
      mon.hp += healed;
      this.add("-heal", mon, this.hpStr(mon), effect && effect.name ? "[from] " + effect.name : "");
      return healed;
    }

    damage(mon, amount, source, effect) {
      if (!mon || mon.fainted || mon.hp <= 0) return 0;
      amount = Math.max(1, Math.floor(amount));
      let r = this.runEvent("onDamage", mon, { source, effect, relay: amount, args: [effect || {}] });
      if (r === false) return 0;
      amount = r;
      amount = Math.min(amount, mon.hp);
      if (amount <= 0) return 0;
      mon.hp -= amount;
      if (mon.volatiles.bide && effect && effect.effectType === "Move" && source) {
        mon.volatiles.bide.damage = (mon.volatiles.bide.damage || 0) + amount;
        mon.volatiles.bide.lastSource = source;
      }
      this.add("-damage", mon, this.hpStr(mon), effect && effect.effectType !== "Move" && effect.name ? "[from] " + effect.name : "");
      if (mon.hp <= 0) this.faint(mon, source, effect);
      return amount;
    }

    faint(mon, source, effect) {
      if (mon.fainted) return;
      mon.hp = 0; mon.fainted = true; mon.side.faintedThisTurn = true;
      this.add("faint", mon);
      if (this.expEnabled && mon.side.id === "p2") this.awardExp(mon);
      if (source && source !== mon && !source.fainted && effect && effect.effectType === "Move") {
        if (mon.volatiles.destinybond) {
          this.add("-activate", mon, "move: Destiny Bond");
          this.faint(source, mon, E("Move", "destinybond", "Destiny Bond"));
        }
        this.runEvent("onSourceAfterFaint", source, { source, target: mon, effect, only: "ability" });
      }
      this.runEvent("onEnd", mon, { only: "ability" });
      mon.volatiles = {}; mon.status = ""; mon.statusState = {};
    }

    // ---------- Status / volatiles / boosts ----------
    cureStatus(mon, silent) {
      if (!mon.status) return false;
      const old = mon.status;
      mon.status = ""; mon.statusState = {};
      this.add("-curestatus", mon, old, silent ? "[msg]" : "");
      return true;
    }

    trySetStatus(mon, status, source, effect) {
      const id = typeof status === "string" ? status : status && status.id;
      if (!id || !mon || mon.fainted) return false;
      if (mon.status) return false;
      const isMove = effect && effect.effectType === "Move";
      const types = mon.types;
      const immune =
        (id === "brn" && types.includes("Fire")) ||
        (id === "par" && types.includes("Electric")) ||
        (id === "frz" && (types.includes("Ice") || this.getWeather() === "SunnyDay" || this.getWeather() === "DesolateLand")) ||
        ((id === "psn" || id === "tox") && (types.includes("Poison") || types.includes("Steel")) && !(source && source.hasAbility("Corrosion")));
      if (immune) { if (isMove) this.add("-immune", mon); return false; }
      const grounded = this.isGrounded(mon);
      if (grounded && this.field.terrain === "MistyTerrain") { if (isMove) this.add("-activate", mon, "move: Misty Terrain"); return false; }
      if (grounded && this.field.terrain === "ElectricTerrain" && id === "slp") { if (isMove) this.add("-activate", mon, "move: Electric Terrain"); return false; }
      if (mon.side.conditions.safeguard && source !== mon && !(source && source.hasAbility("Infiltrator"))) {
        if (isMove) this.add("-activate", mon, "move: Safeguard");
        return false;
      }
      const sobj = { id };
      const r = this.runEvent("onSetStatus", mon, { source, effect, relay: sobj, args: [], breakAbility: this._breakFor(mon, effect) });
      if (r === false) return false;
      mon.status = id;
      mon.statusState = { source };
      if (id === "slp") mon.statusState.time = this.randInt(2, 4);
      if (id === "tox") mon.statusState.stage = 0;
      this.add("-status", mon, id, effect && effect.effectType === "Ability" ? "[from] ability: " + effect.name : "");
      this.runEvent("onAfterSetStatus", mon, { source, effect, relay: sobj, only: "ability" });
      return true;
    }

    _breakFor(mon, effect) {
      return !!(effect && effect.effectType === "Move" && effect.ignoreAbility);
    }

    addVolatile(mon, id, source, effect) {
      if (!mon || mon.fainted) return false;
      if (mon.volatiles[id]) return false;
      const cond = getCondition(id) || {};
      const r = this.runEvent("onTryAddVolatile", mon, { source, effect, relay: { id }, breakAbility: this._breakFor(mon, effect) });
      if (r === false) return false;
      const st = { id, source, duration: cond.duration };
      mon.volatiles[id] = st;
      if (typeof cond.onStart === "function") {
        const h = { fn: cond.onStart, thisObj: cond, effect: E("Volatile", id, cond.name || id), state: st };
        try { cond.onStart.call(cond, this.makeCtx(mon, h, { source, effect })); }
        catch (e) { if (this.debug) throw e; }
      }
      if (!SILENT_VOLATILES.has(id)) this.add("-start", mon, cond.name || id);
      return true;
    }

    removeVolatile(mon, id) {
      const st = mon.volatiles[id];
      if (!st) return false;
      const cond = getCondition(id);
      if (cond && typeof cond.onEnd === "function") {
        const h = { fn: cond.onEnd, thisObj: cond, effect: E("Volatile", id, cond.name || id), state: st };
        try { cond.onEnd.call(cond, this.makeCtx(mon, h, {})); } catch (e) { if (this.debug) throw e; }
      }
      delete mon.volatiles[id];
      if (id === "confusion") this.add("-end", mon, "confusion");
      return true;
    }

    boost(mon, boosts, source, effect) {
      if (!mon || mon.fainted || mon.hp <= 0) return false;
      boosts = Object.assign({}, boosts);
      source = source || mon;
      const o = { source, effect, relay: boosts, args: [effect] };
      if (this.runEvent("onChangeBoost", mon, o) === false) return false;
      if (source !== mon && mon.side.conditions.mist) {
        let blocked = false;
        for (const k of Object.keys(boosts)) if (boosts[k] < 0) { delete boosts[k]; blocked = true; }
        if (blocked) this.add("-activate", mon, "move: Mist");
      }
      if (this.runEvent("onTryBoost", mon, o) === false) return false;
      let changed = false;
      for (const k of Object.keys(boosts)) {
        const delta = boosts[k];
        if (!delta) continue;
        const cur = mon.boosts[k] || 0;
        const nv = clamp(cur + delta, -6, 6);
        if (nv === cur) { this.add(delta > 0 ? "-boost" : "-unboost", mon, k, 0); continue; }
        mon.boosts[k] = nv;
        changed = true;
        this.add(delta > 0 ? "-boost" : "-unboost", mon, k, Math.abs(nv - cur));
      }
      if (changed) this.runEvent("onAfterEachBoost", mon, { source, effect, relay: boosts, args: [effect], only: "ability" });
      return changed;
    }

    takeItem(mon) {
      if (!mon.item) return null;
      const it = mon.item;
      mon.item = ""; mon.lastItem = it; mon.usedItemThisTurn = true;
      delete mon.volatiles.choicelock;
      this.runEvent("onTakeItem", mon, { only: "ability" });
      return it;
    }
    consumeItem(mon) {
      if (!mon.item) return;
      mon.lastItem = mon.item; mon.item = ""; mon.usedItemThisTurn = true;
      delete mon.volatiles.choicelock;
      this.runEvent("onAfterUseItem", mon, { only: "ability" });
    }

    restoreTypes(mon) { mon.types = mon.baseTypes.slice(); }

    confusionDamage(mon) {
      const base = tr(tr(tr(tr((2 * mon.level) / 5 + 2) * 40 * this.getBoostedStat(mon, "atk")) / this.getBoostedStat(mon, "def")) / 50) + 2;
      const dmg = Math.max(1, tr((base * this.randInt(85, 100)) / 100));
      this.add("-damage", mon, "", "[from] confusion");
      mon.hp = Math.max(0, mon.hp - Math.min(dmg, mon.hp));
      this.events[this.events.length - 1][2] = this.hpStr(mon);
      if (mon.hp <= 0) this.faint(mon, null, E("Confusion", "confusion", "confusion"));
    }

    // ---------- Move data ----------
    getActiveMove(name) {
      const key = window.MOVES[name] ? name : MOVE_INDEX[toID(name)];
      const raw = window.MOVES[key];
      if (!raw) throw new Error("Unknown move: " + name);
      const m = JSON.parse(JSON.stringify(raw));
      m.name = key; m.id = toID(key); m.category = raw.cat; m.effectType = "Move";
      m.flags = m.flags || {};
      if (!m.secondaries && m.secondary) m.secondaries = [m.secondary];
      return m;
    }

    // ---------- Start ----------
    start() {
      if (this.phase !== "init") return;
      const mons = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        const lead = s.pokemon.findIndex((p) => !p.fainted);
        if (lead < 0) throw new Error(s.id + " has no Pokemon that can battle");
        this.switchIn(s, lead, { deferStart: true, noHazards: true });
        mons.push(s.active);
      }
      this.sortBySpeed(mons).forEach((m) => this.onSwitchInEvents(m));
      this.runUpdates();
      this.checkWin();
      if (!this.ended) this.beginTurn();
    }

    sortBySpeed(mons) {
      const tr_ = this.field.pseudo.trickroom;
      return mons.map((m) => ({ m, s: this.getSpeed(m), r: this.random() }))
        .sort((a, b) => (a.s !== b.s ? (tr_ ? a.s - b.s : b.s - a.s) : a.r - b.r)).map((x) => x.m);
    }

    // ---------- Switching ----------
    switchIn(side, index, o) {
      o = o || {};
      const mon = side.pokemon[index];
      const old = side.active;
      let carried = null;
      if (old && !old.fainted && old.isActive) {
        this.runEvent("onSwitchOut", old, { only: "ability" });
        this.runEvent("onEnd", old, { only: "ability" });
        if (o.copy) carried = { boosts: Object.assign({}, old.boosts), volatiles: {} };
        if (carried) {
          for (const id of ["substitute", "leechseed", "ingrain", "aquaring", "focusenergy", "magnetrise", "taunt", "encore", "disable", "torment", "yawn", "perishsong"]) {
            if (old.volatiles[id]) carried.volatiles[id] = old.volatiles[id];
          }
        }
        this.restoreForme(old);
        old.volatiles = {};
        old.boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
        old.isActive = false;
        old.restoreAbility = true;
        old.ability = old.mega ? old.ability : old.baseAbility;
        old.types = old.baseTypes.slice();
        old.lastMove = "";
        if (old.status === "tox") old.statusState.stage = 0;
      } else if (old) {
        old.isActive = false;
      }
      side.active = mon;
      mon.isActive = true;
      mon.activeTurns = 0;
      mon.lastMove = "";
      mon.trapped = false;
      mon.moveThisTurn = false;
      mon.abilityState = {};
      if (carried) {
        mon.boosts = carried.boosts;
        for (const id of Object.keys(carried.volatiles)) mon.volatiles[id] = carried.volatiles[id];
      }
      this.markParticipants();
      this.add(o.drag ? "drag" : "switch", mon, mon.species + ", L" + mon.level, this.hpStr(mon), this.expProgress(mon), mon.teamIndex);
      if (!o.noHazards) this.applyHazards(mon);
      // A Healing Wish / Lunar Dance waiting for this side: full HP, no status
      // (and full PP for Lunar Dance).
      if (side.healingWish && !mon.fainted) {
        const hw = side.healingWish;
        side.healingWish = null;
        this.cureStatus(mon, true);
        if (hw.lunar) for (const m of mon.moves) m.pp = m.maxpp;
        mon.hp = mon.maxhp;
        this.add("-heal", mon, this.hpStr(mon), "[from] " + hw.name);
      }
      if (!o.deferStart && !mon.fainted) { this.onSwitchInEvents(mon); this.runUpdates(); }
      return mon;
    }

    onSwitchInEvents(mon) {
      if (mon.fainted || !mon.isActive) return;
      // Primal Reversion
      if ((mon.species === "Groudon" && mon.item === "red-orb") || (mon.species === "Kyogre" && mon.item === "blue-orb")) {
        this.formeChange(mon, mon.species + "-Primal");
      }
      if (mon.ability === "Imposter" && !mon.transformed) {
        const foe = mon.side.foe.active;
        if (foe && !foe.fainted) this.transformInto(mon, foe);
      }
      this.runEvent("onStart", mon, { only: "ability" });
      this.runEvent("onSwitchIn", mon, { only: "ability" });
    }

    // Transform / Mimic support
    transformInto(mon, t) {
      if (!t || t.fainted || mon.fainted || mon === t || t.volatiles.substitute || mon.transformed && false) return false;
      if (!mon.original) {
        mon.original = {
          species: mon.species, stats: Object.assign({}, mon.stats), types: mon.types.slice(), weight: mon.weight,
          moves: mon.moves.map((m) => Object.assign({}, m))
        };
      }
      mon.species = t.species;
      mon.stats = Object.assign({}, t.stats, { hp: mon.original.stats.hp });
      mon.types = t.types.slice();
      mon.weight = t.weight;
      mon.ability = t.ability;
      mon.abilityState = {};
      mon.boosts = Object.assign({}, t.boosts);
      mon.moves = t.moves.map((m) => ({ id: m.id, name: m.name, pp: Math.min(5, m.maxpp), maxpp: Math.min(5, m.maxpp) }));
      mon.transformed = true;
      this.add("-transform", mon, t);
      return true;
    }

    restoreForme(mon) {
      for (let i = 0; i < mon.moves.length; i++) if (mon.moves[i].mimicOf) mon.moves[i] = mon.moves[i].mimicOf;
      if (mon.transformed && mon.original) {
        const o = mon.original;
        mon.species = o.species; mon.stats = o.stats; mon.types = o.types.slice(); mon.weight = o.weight;
        mon.moves = o.moves; mon.transformed = false; mon.original = null;
        mon.ability = mon.baseAbility;
      }
    }

    applyHazards(mon) {
      const s = mon.side.conditions;
      if (mon.hasAbility("Magic Guard") && false) return;
      if (s.stealthrock) {
        const eff = window.Damage.typeEffectiveness("Rock", mon.types);
        this.damage(mon, (mon.maxhp * eff) / 8, null, E("SideCondition", "stealthrock", "Stealth Rock"));
      }
      if (mon.fainted) return;
      if (s.spikes && this.isGrounded(mon)) {
        const frac = [0, 8, 6, 4][s.spikes.layers];
        this.damage(mon, mon.maxhp / frac, null, E("SideCondition", "spikes", "Spikes"));
      }
      if (mon.fainted) return;
      if (s.toxicspikes && this.isGrounded(mon)) {
        if (mon.hasType("Poison")) this.removeSideCondition(mon.side, "toxicspikes");
        else this.trySetStatus(mon, s.toxicspikes.layers >= 2 ? "tox" : "psn", null, E("SideCondition", "toxicspikes", "Toxic Spikes"));
      }
      if (mon.fainted) return;
      if (s.stickyweb && this.isGrounded(mon)) {
        this.add("-activate", mon, "move: Sticky Web");
        this.boost(mon, { spe: -1 }, null, E("SideCondition", "stickyweb", "Sticky Web"));
      }
    }

    formeChange(mon, forme) {
      if (!window.DEX[forme]) return false;
      const d = window.DEX[forme];
      const hpRatio = mon.hp / mon.maxhp;
      const stats = window.Stats.calcAllStats(forme, { level: mon.level, nature: mon.nature, ivs: mon.ivs, evs: mon.evs });
      mon.species = forme;
      mon.stats = stats;
      mon.types = d.types.slice(); mon.baseTypes = d.types.slice();
      mon.weight = d.weight;
      if (d.abilities && d.abilities[0]) { mon.ability = d.abilities[0]; mon.baseAbility = mon.baseAbility || mon.ability; }
      mon.maxhp = stats.hp; mon.baseMaxhp = stats.hp;
      mon.hp = Math.min(mon.maxhp, Math.max(1, Math.round(hpRatio * mon.maxhp)));
      mon.mega = true;
      this.add("detailschange", mon, forme);
      return true;
    }

    // ---------- Requests / choices ----------
    // SELECT on the move menu: two of the active Pokémon's moves trade places
    // (and their PP; the party's order follows, as in FireRed).
    swapMoves(sideId, a, b) {
      const mon = this.sides[sideId].active, m = mon.moves;
      if (!m[a] || !m[b] || a === b) return;
      [m[a], m[b]] = [m[b], m[a]];
    }

    getMoveSlots(mon) {
      const slots = mon.moves.map((m, i) => {
        const data = window.MOVES[m.name];
        let disabled = m.pp <= 0;
        if (!disabled && mon.volatiles.disable && mon.volatiles.disable.moveId === m.id) disabled = true;
        if (!disabled && mon.volatiles.taunt && data.cat === "Status") disabled = true;
        if (!disabled && mon.volatiles.torment && mon.lastMove === m.id) disabled = true;
        if (!disabled && mon.volatiles.encore && mon.volatiles.encore.moveId && mon.volatiles.encore.moveId !== m.id) disabled = true;
        if (!disabled && mon.item.indexOf("choice-") === 0 && mon.volatiles.choicelock && mon.volatiles.choicelock.moveId !== m.id) disabled = true;
        if (!disabled && mon.item === "assault-vest" && data.cat === "Status") disabled = true;
        return { index: i, id: m.id, name: m.name, pp: m.pp, maxpp: m.maxpp, disabled, type: data.type, category: data.cat, power: data.power };
      });
      return slots;
    }

    forcedAction(mon) {
      if (mon.volatiles.mustrecharge) return { recharge: true };
      if (mon.volatiles.twoturnmove) return { move: mon.volatiles.twoturnmove.move, secondTurn: true };
      if (mon.volatiles.lockedmove) return { move: mon.volatiles.lockedmove.moveName, locked: true };
      if (mon.volatiles.bide) return { move: "Bide", secondTurn: true, locked: true };
      return null;
    }

    isTrapped(mon) {
      if (mon.hasType("Ghost")) return false;
      if (mon.item === "shed-shell") return false;
      mon.trapped = false;
      const foe = mon.side.foe.active;
      if (foe && !foe.fainted) this.callAbility(foe, "onFoeTrapPokemon", { source: foe }, mon);
      if (mon.volatiles.ingrain) mon.trapped = true;
      const pt = mon.volatiles.partiallytrapped;
      if (pt && pt.source && pt.source.isActive && !pt.source.fainted) mon.trapped = true;
      return mon.trapped;
    }

    getRequest(sideId) {
      const side = this.sides[sideId];
      const base = { phase: "wait", turn: this.turn, ended: this.ended, winner: this.winner };
      if (this.ended) return Object.assign(base, { phase: "ended" });
      const team = side.pokemon.map((p, i) => ({
        index: i, species: p.species, name: p.name, level: p.level, hp: p.hp, maxhp: p.maxhp, status: p.status,
        fainted: p.fainted, active: p.isActive && p === side.active, item: p.item, gender: p.gender
      }));
      base.team = team;
      base.chosen = !!side.choice;
      if (this.phase === "switch") {
        if (!this.switchSides.includes(sideId) || side.choice) return base;
        base.phase = "switch";
        base.switches = side.pokemon.map((p, i) => (!p.fainted && p !== side.active ? i : -1)).filter((i) => i >= 0);
        return base;
      }
      if (this.phase !== "move" || side.choice) return base;
      const mon = side.active;
      base.phase = "move";
      const forced = this.forcedAction(mon);
      const slots = this.getMoveSlots(mon);
      const usable = slots.filter((s) => !s.disabled);
      base.active = {
        species: mon.species, name: mon.name, hp: mon.hp, maxhp: mon.maxhp, status: mon.status, item: mon.item,
        ability: mon.ability, boosts: Object.assign({}, mon.boosts),
        moves: slots, struggle: !forced && !usable.length,
        canMega: !forced && !side.megaUsed && !mon.mega && !!MEGA_MAP[mon.item],
        trapped: false, forced: forced
      };
      if (forced) { base.switches = []; return base; }
      base.active.trapped = this.isTrapped(mon);
      base.active.canCatch = this.wild && sideId === "p1";
      base.active.canRun = this.wild && sideId === "p1" &&
        (!base.active.trapped || mon.item === "smoke-ball" || mon.hasAbility("Run Away"));
      base.switches = base.active.trapped ? [] : side.pokemon.map((p, i) => (!p.fainted && p !== side.active ? i : -1)).filter((i) => i >= 0);
      return base;
    }

    choose(sideId, choice) {
      const side = this.sides[sideId];
      if (!side) return { ok: false, error: "No such side" };
      if (this.ended) return { ok: false, error: "Battle is over" };
      const req = this.getRequest(sideId);
      if (req.phase === "wait") return { ok: false, error: "Not waiting for a choice from " + sideId };
      if (req.phase === "switch") {
        if (!choice || choice.type !== "switch" || !req.switches.includes(choice.index))
          return { ok: false, error: "Invalid switch" };
        side.choice = { type: "switch", index: choice.index };
      } else {
        const mon = side.active;
        const forced = req.active.forced;
        if (forced) {
          side.choice = forced.recharge ? { type: "recharge" } : { type: "move", forced };
        } else if (choice && choice.type === "switch") {
          if (!req.switches.includes(choice.index)) return { ok: false, error: "Invalid switch" };
          side.choice = { type: "switch", index: choice.index };
        } else if (choice && choice.type === "ball") {
          if (!req.active.canCatch) return { ok: false, error: "You can't catch this Pokémon" };
          side.choice = { type: "ball", ball: choice.ball || "poke-ball" };
        } else if (choice && choice.type === "item") {
          const target = side.pokemon[choice.target];
          if (!target || !window.ItemUse || !window.ItemUse.effect(choice.item)) return { ok: false, error: "You can't use that here." };
          if (!window.ItemUse.canUse(this.itemView(target), choice.item, { inBattle: true, move: choice.move })) {
            return { ok: false, error: "It won't have any effect." };
          }
          side.choice = { type: "item", item: choice.item, target: choice.target, move: choice.move };
        } else if (choice && choice.type === "run") {
          if (!req.active.canRun) return { ok: false, error: "You can't escape!" };
          side.choice = { type: "run" };
        } else if (choice && choice.type === "move") {
          let slot = null;
          if (req.active.struggle && (choice.move === "Struggle" || choice.move === 0 || choice.move === "struggle")) {
            side.choice = { type: "move", moveName: "Struggle", slot: -1 };
          } else {
            const slots = req.active.moves;
            slot = typeof choice.move === "number" ? slots[choice.move] : slots.find((s) => s.id === toID(choice.move));
            if (!slot) return { ok: false, error: "Unknown move" };
            if (slot.disabled) return { ok: false, error: slot.name + " is disabled or out of PP" };
            side.choice = { type: "move", moveName: slot.name, slot: slot.index };
          }
          if (choice.mega) {
            if (!req.active.canMega) return { ok: false, error: "Cannot Mega Evolve" };
            side.choice.mega = true;
          }
        } else return { ok: false, error: "Invalid choice" };
      }
      this.maybeCommit();
      return { ok: true };
    }

    // A side that has no real decision (forced) is filled in automatically.
    autoFillForced() {
      if (this.phase !== "move") return;
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.choice) continue;
        const f = this.forcedAction(s.active);
        if (f) s.choice = f.recharge ? { type: "recharge" } : { type: "move", forced: f };
      }
    }

    maybeCommit() {
      if (this.phase === "move") {
        if (this.sides.p1.choice && this.sides.p2.choice) this.commitTurn();
      } else if (this.phase === "switch") {
        if (this.switchSides.every((id) => this.sides[id].choice)) this.commitSwitches();
      }
    }

    randomChoice(sideId) {
      const req = this.getRequest(sideId);
      if (req.phase === "switch") return { type: "switch", index: this.sample(req.switches) };
      if (req.phase !== "move") return null;
      const opts = [];
      if (req.active.forced) return { type: "move", move: 0 };
      if (req.active.struggle) return { type: "move", move: "Struggle" };
      for (const m of req.active.moves) if (!m.disabled) { opts.push({ type: "move", move: m.index }); opts.push({ type: "move", move: m.index }); opts.push({ type: "move", move: m.index }); }
      for (const i of req.switches) opts.push({ type: "switch", index: i });
      const c = this.sample(opts);
      if (c.type === "move" && req.active.canMega && this.random() < 0.7) c.mega = true;
      return c;
    }

    // ---------- Turn flow ----------
    beginTurn() {
      this.turn++;
      this.phase = "move";
      this.sides.p1.choice = null; this.sides.p2.choice = null;
      for (const s of [this.sides.p1, this.sides.p2]) { s.faintedLastTurn = s.faintedThisTurn; s.faintedThisTurn = false; }
      this.add("turn", this.turn);
      this.markParticipants();
      this.autoFillForced();
      this.maybeCommit();
    }

    commitTurn() {
      const actions = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        const c = s.choice, mon = s.active;
        if (c.type === "run" || c.type === "ball" || c.type === "item") {
          actions.push({ order: 0, type: c.type, ball: c.ball, item: c.item, target: c.target, move: c.move,
            mon, side: s, priority: 0, speed: this.getSpeed(mon) });
        }
        else if (c.type === "switch") actions.push({ order: 1, type: "switch", mon, side: s, index: c.index, priority: 0, speed: this.getSpeed(mon) });
        else if (c.type === "recharge") actions.push({ order: 3, type: "move", mon, side: s, recharge: true, priority: 0, speed: this.getSpeed(mon) });
        else {
          if (c.mega) actions.push({ order: 2, type: "mega", mon, side: s, priority: 0, speed: this.getSpeed(mon) });
          const f = c.forced;
          const name = f ? f.move : c.moveName;
          const mv = this.getActiveMove(name);
          let pri = mv.priority;
          const pr = this.runEvent("onModifyPriority", mon, { relay: pri, args: [mv] });
          if (typeof pr === "number") pri = pr;
          let frac = 0;
          if (mon.item === "quick-claw" && this.randomChance(1, 5)) frac = 1;
          actions.push({ order: 3, type: "move", mon, side: s, moveName: name, slot: c.slot, forced: f, priority: pri, frac, speed: this.getSpeed(mon) });
          if (name && toID(name) === "focuspunch" && !f) { mon.volatiles.focuspunch = { duration: 1 }; this.add("-singleturn", mon, "move: Focus Punch"); }
        }
      }
      const tr_ = !!this.field.pseudo.trickroom;
      for (const a of actions) a.rand = this.random();
      actions.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        if (a.order === 3) {
          if (a.priority !== b.priority) return b.priority - a.priority;
          if ((a.frac || 0) !== (b.frac || 0)) return (b.frac || 0) - (a.frac || 0);
          if (a.speed !== b.speed) return tr_ ? a.speed - b.speed : b.speed - a.speed;
          return a.rand - b.rand;
        }
        if (a.speed !== b.speed) return b.speed - a.speed;
        return a.rand - b.rand;
      });
      for (const s of [this.sides.p1, this.sides.p2]) { s.active.moveThisTurn = false; s.active.usedItemThisTurn = false; s.active.lastDamage = null; }
      this.queue = actions;
      this.queue.push({ type: "residual", order: 9 });
      this.phase = "running";
      this.runQueue();
    }

    runQueue() {
      while (this.queue.length && !this.ended) {
        if (this.pendingSwitch) {
          const p = this.pendingSwitch;
          this.pendingSwitch = null;
          const side = p.side;
          if (side.pokemon.some((m) => !m.fainted && m !== side.active)) {
            this.phase = "switch";
            this.switchSides = [side.id];
            this.switchCause = { type: "midturn", copy: p.copy };
            side.choice = null;
            return;
          }
        }
        const a = this.queue.shift();
        this.runAction(a);
        this.checkWin();
        if (this.ended) return;
        this.runUpdates();
      }
      if (this.pendingSwitch) { this.queue.push({ type: "noop" }); return this.runQueue(); }
      if (!this.ended) this.afterTurn();
    }

    afterTurn() {
      const need = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.active.fainted && s.pokemon.some((m) => !m.fainted)) need.push(s.id);
      }
      if (need.length) {
        this.phase = "switch";
        this.switchSides = need;
        this.switchCause = { type: "faint" };
        this.sides.p1.choice = null; this.sides.p2.choice = null;
        return;
      }
      this.beginTurn();
    }

    commitSwitches() {
      const cause = this.switchCause;
      const mons = [];
      const order = this.switchSides.map((id) => this.sides[id]);
      for (const s of order) {
        const idx = s.choice.index;
        s.choice = null;
        const mon = this.switchIn(s, idx, { copy: cause.type === "midturn" && cause.copy, deferStart: true });
        mons.push(mon);
      }
      this.sortBySpeed(mons.filter((m) => !m.fainted)).forEach((m) => this.onSwitchInEvents(m));
      this.runUpdates();
      this.switchSides = [];
      this.checkWin();
      if (this.ended) return;
      if (cause.type === "midturn") { this.phase = "running"; this.runQueue(); }
      else this.afterTurn2();
    }

    afterTurn2() {
      // After faint replacements: a replacement might itself have fainted to hazards
      const need = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.active.fainted && s.pokemon.some((m) => !m.fainted)) need.push(s.id);
      }
      if (need.length) {
        this.phase = "switch"; this.switchSides = need; this.switchCause = { type: "faint" };
        return;
      }
      this.beginTurn();
    }

    runUpdates() {
      for (const m of this.sortBySpeed(this.getActives())) {
        this.runEvent("onUpdate", m, {});
      }
    }

    checkWin() {
      if (this.ended) return;
      const a = this.sides.p1.remaining, b = this.sides.p2.remaining;
      if (a && b) return;
      this.ended = true; this.phase = "ended";
      if (!a && !b) { this.winner = null; this.add("tie"); }
      else { const w = a ? this.sides.p1 : this.sides.p2; this.winner = w.id; this.add("win", w.name); }
    }

    // ---------- Experience ----------
    // Every p1 Pokémon that has faced a p2 Pokémon shares the experience for it.
    markParticipants() {
      if (!this.expEnabled) return;
      const mine = this.sides.p1.active, foe = this.sides.p2.active;
      if (!mine || !foe || mine.fainted || foe.fainted) return;
      (foe.expParticipants || (foe.expParticipants = new Set())).add(mine);
    }

    // Share of the way to the next level, 0-1, for p1's experience bar ("" otherwise).
    expProgress(mon) {
      if (!this.expEnabled || mon.side.id !== "p1") return "";
      const E = window.Experience;
      return E.progress(E.growthRate(mon.baseSpecies), mon.level, mon.exp);
    }

    awardExp(foe) {
      const E = window.Experience;
      const receivers = [...(foe.expParticipants || [])].filter((m) => !m.fainted);
      // Gen 6: without the Exp. Share, Pokémon that battled split it; with it,
      // each gets the full amount and the rest of the party half.
      const give = (mon, divisor, share) => {
        E.addEvs(mon.evs, foe.baseSpecies);
        if (mon.level >= E.MAX_LEVEL) return;
        const amount = E.gain({ species: foe.baseSpecies, level: foe.level, trainer: !this.wild,
          participants: divisor, luckyEgg: mon.item === "lucky-egg" });
        this.gainExp(mon, amount, share);
      };
      for (const mon of receivers) give(mon, this.expShare ? 1 : receivers.length, false);
      if (!this.expShare) return;
      const rest = this.sides.p1.pokemon.filter((m) => !m.fainted && !receivers.includes(m));
      if (!rest.length) return;
      this.add("-expshare");
      for (const mon of rest) give(mon, 2, true);
    }

    gainExp(mon, amount, share) {
      const E = window.Experience;
      const group = E.growthRate(mon.baseSpecies);
      mon.exp += amount;
      const levelsUp = () => mon.level < E.MAX_LEVEL && mon.exp >= E.expForLevel(group, mon.level + 1);
      this.add("-exp", mon, amount, mon.teamIndex, levelsUp() ? 1 : E.progress(group, mon.level, mon.exp), share ? "share" : "");
      while (levelsUp()) {
        mon.level++;
        mon.leveledUp = true;
        mon.happiness = E.friendshipFromLevelUp(mon.happiness);
        this.recalcStats(mon);
        this.add("-levelup", mon, mon.level, this.hpStr(mon), mon.teamIndex, levelsUp() ? 1 : E.progress(group, mon.level, mon.exp));
        this.learnLevelUpMoves(mon);
      }
      if (mon.level >= E.MAX_LEVEL) mon.exp = Math.min(mon.exp, E.expForLevel(group, E.MAX_LEVEL));
    }

    // New stats after a level-up; HP goes up by however much max HP did.
    recalcStats(mon) {
      const real = mon.transformed && mon.original ? mon.original : mon;
      const species = mon.transformed && mon.original ? mon.original.species : mon.species;
      const stats = window.Stats.calcAllStats(species, { level: mon.level, nature: mon.nature, ivs: mon.ivs, evs: mon.evs });
      const oldMax = mon.maxhp;
      real.stats = stats;
      if (real !== mon) mon.stats = Object.assign({}, mon.stats, { hp: stats.hp });
      mon.maxhp = mon.baseMaxhp = stats.hp;
      if (!mon.fainted) mon.hp = Math.min(mon.maxhp, mon.hp + (mon.maxhp - oldMax));
    }

    // The real move list (not a Transform copy).
    ownMoves(mon) { return mon.transformed && mon.original ? mon.original.moves : mon.moves; }

    learnLevelUpMoves(mon) {
      const learnset = window.LEARNSETS_GEN6 && window.LEARNSETS_GEN6[mon.baseSpecies];
      if (!learnset) return;
      for (const [lvl, name] of learnset.levelup) {
        if (lvl !== mon.level) continue;
        const key = MOVE_INDEX[toID(name)];
        const moves = this.ownMoves(mon);
        if (!key || moves.some((m) => m.id === toID(key))) continue;
        if (moves.length < 4) {
          moves.push(newMoveSlot(key));
          this.add("-learnmove", mon, key, mon.teamIndex);
        } else {
          this.add("-trylearn", mon, key, mon.teamIndex);
        }
      }
    }

    // Answer to a -trylearn event: forget the move in `slot` for `moveName`.
    replaceMove(sideId, teamIndex, slot, moveName) {
      const mon = this.sides[sideId].pokemon[teamIndex];
      const key = MOVE_INDEX[toID(moveName)];
      const moves = mon && this.ownMoves(mon);
      if (!moves || !key || slot < 0 || slot >= moves.length) return false;
      moves[slot] = newMoveSlot(key);
      return true;
    }

    // ---------- Items from the bag ----------
    // The shape engine/item-use.js works on. Moves are the real objects, so PP
    // restored lands on the Pokémon.
    itemView(mon) {
      return { hp: mon.hp, maxhp: mon.maxhp, status: mon.status, fainted: mon.fainted,
        confused: !!(mon.isActive && mon.volatiles.confusion), moves: this.ownMoves(mon), evs: mon.evs, level: mon.level };
    }

    useItem(side, item, teamIndex, move) {
      const mon = side.pokemon[teamIndex];
      const view = this.itemView(mon);
      const r = window.ItemUse.apply(view, item, { move });
      mon.hp = view.hp;
      if (r.revived) mon.fainted = false;
      if (r.cured) { mon.status = ""; mon.statusState = {}; }
      if (r.confusionCured) delete mon.volatiles.confusion;
      // [side, item, target, teamIndex, hp, healed, cured status, "confusion", "revive", pp restored]
      this.add("-useitem", side.id, item, mon, teamIndex, this.hpStr(mon), r.healed || 0, r.cured || "",
        r.confusionCured ? "confusion" : "", r.revived ? "revive" : "", r.pp || 0);
    }

    // ---------- Wild battles ----------
    // Escape chance: always if faster, otherwise (speed x 128 / foe speed + 30 x attempts) / 256.
    tryRun(mon) {
      if (mon.fainted) return;
      this.runAttempts++;
      const foe = mon.side.foe.active;
      let escaped = mon.item === "smoke-ball" || mon.hasAbility("Run Away") || !foe || foe.fainted;
      if (!escaped) {
        const a = this.getSpeed(mon), b = this.getSpeed(foe);
        escaped = a >= b || this.randInt(0, 255) < Math.floor((a * 128) / b) + 30 * this.runAttempts;
      }
      if (!escaped) { this.add("-runfail", mon); return; }
      this.add("-run", mon);
      this.escaped = true;
      this.ended = true; this.phase = "ended"; this.winner = null;
    }

    throwBall(mon, ball) {
      const target = mon.side.foe.active;
      if (!target || target.fainted) return;
      const ctx = this.catchContext;
      const result = window.Catching.attempt(
        { species: target.baseSpecies, level: target.level, hp: target.hp, maxhp: target.maxhp, status: target.status, types: target.types },
        ball,
        { turn: this.turn, night: !!ctx.night, caughtBefore: !!(ctx.caughtBefore && ctx.caughtBefore(target.baseSpecies)) },
        () => this.random());
      this.add("-ball", mon.side.id, ball, target, result.shakes, result.caught ? "caught" : "");
      if (!result.caught) return;
      this.add("caught", target, ball);
      if (this.expEnabled) this.awardExp(target); // Gen 6 gives experience for catches
      this.caught = target;
      this.ended = true; this.phase = "ended"; this.winner = mon.side.id;
    }

    // ---------- Actions ----------
    runAction(a) {
      switch (a.type) {
        case "switch": {
          if (a.mon.fainted || a.side.active !== a.mon) return;
          this.switchIn(a.side, a.index);
          break;
        }
        case "mega": {
          if (a.mon.fainted || a.side.megaUsed) return;
          const forme = MEGA_MAP[a.mon.item];
          if (!forme) return;
          a.side.megaUsed = true;
          this.add("-mega", a.mon, a.mon.species, a.mon.item);
          this.formeChange(a.mon, forme);
          this.runEvent("onStart", a.mon, { only: "ability" });
          this.runEvent("onSwitchIn", a.mon, { only: "ability" });
          break;
        }
        case "move": this.runMoveAction(a); break;
        case "residual": this.residual(); break;
        case "run": this.tryRun(a.mon); break;
        case "ball": this.throwBall(a.mon, a.ball); break;
        case "item": this.useItem(a.side, a.item, a.target, a.move); break;
        default: break;
      }
    }

    runMoveAction(a) {
      const mon = a.mon;
      if (mon.fainted || !mon.isActive || mon.side.active !== mon) return;
      if (a.recharge) {
        this.add("cant", mon, "recharge");
        mon.removeVolatile("mustrecharge");
        return;
      }
      const move = this.getActiveMove(a.moveName);
      if (move.id === "focuspunch" && mon.volatiles.focuspunch && mon.volatiles.focuspunch.lostFocus) {
        this.add("cant", mon, "Focus Punch", "Focus Punch");
        return;
      }
      const ok = this.runEvent("onBeforeMove", mon, { relay: move, move });
      if (ok === false) {
        delete mon.volatiles.twoturnmove; delete mon.volatiles.lockedmove;
        return;
      }
      this.execMove(mon, move, { slot: a.slot, forced: a.forced, secondTurn: a.forced && a.forced.secondTurn });
    }

    // ---------- Move execution ----------
    deductPP(user, move, target) {
      if (move.id === "struggle") return;
      const slot = user.moves.find((m) => m.id === move.id);
      if (!slot) return;
      let amount = 1;
      if (target && target !== user) {
        const extra = this.callAbility(target, "onDeductPP", { source: user, target });
        if (typeof extra === "number") amount += extra;
      }
      slot.pp = Math.max(0, slot.pp - amount);
    }

    execMove(user, move, o) {
      o = o || {};
      const foe = user.side.foe.active;
      // Attacker ability tweaks the move
      const ab = window.ABILITIES[user.ability];
      if (ab && !user.volatiles.gastroacid) {
        if (typeof ab.onModifyMove === "function") { try { ab.onModifyMove.call(ab, move, user); } catch (e) { if (this.debug) throw e; } }
        if (typeof ab.onModifyType === "function") this.callAbility(user, "onModifyType", { move }, move);
      }
      const selfTarget = ["self", "allySide", "allyTeam", "adjacentAllyOrSelf", "all", "foeSide"].includes(move.target);
      let target = o.target || (selfTarget && move.target !== "foeSide" ? user : foe);
      if (move.target === "foeSide" || move.target === "all") target = foe;

      if (!o.secondTurn && !o.bounced) this.deductPP(user, move, foe);
      this.add("move", user, move.name, target || user);
      user.lastMove = move.id;
      user.moveThisTurn = true;
      if (user.item.indexOf("choice-") === 0 && !o.bounced && move.id !== "struggle") {
        user.volatiles.choicelock = { moveId: move.id };
      }
      if (o.slot !== undefined && o.slot >= 0 && user.volatiles.encore && !user.volatiles.encore.moveId) user.volatiles.encore.moveId = move.id;
      if (user.volatiles.disable && !user.volatiles.disable.moveId) user.volatiles.disable.moveId = move.id;

      // Snatch: the foe steals a beneficial self-targeting move before it takes effect
      if (move.category === "Status" && move.flags.snatch && !o.snatched && foe && !foe.fainted && foe.volatiles.snatch) {
        this.removeVolatile(foe, "snatch");
        this.add("-activate", foe, "move: Snatch", "[of] " + user.ident);
        this.execMove(foe, this.getActiveMove(move.name), { bounced: true, snatched: true });
        return;
      }

      if (!move.callsMove) this.lastMoveGlobal = move.id;
      if (move.id === "bide") {
        if (!user.volatiles.bide) this.addVolatile(user, "bide", user, E("Move", "bide", "Bide"));
        return;
      }

      // Charging moves
      if (move.flags.charge && !o.secondTurn) {
        const w = this.getWeather();
        const sunSkip = (move.id === "solarbeam") && (w === "SunnyDay" || w === "DesolateLand");
        if (sunSkip) { /* fires immediately */ }
        else if (user.item === "power-herb") { this.consumeItem(user); this.add("-enditem", user, "Power Herb"); }
        else {
          this.add("-prepare", user, move.name);
          user.volatiles.twoturnmove = { id: "twoturnmove", move: move.name, invuln: INVULN[move.id] || null };
          return;
        }
      }
      if (o.secondTurn) delete user.volatiles.twoturnmove;

      if (!target || target.fainted) { this.add("-fail", user); return; }

      // Magnitude rolls its size before anything else (FireRed's
      // magnitudedamagecalculation): 4-10, 5/10/20/30/20/10/5%.
      if (move.id === "magnitude") {
        const r = this.randInt(0, 99);
        this.magnitude = r < 5 ? 4 : r < 15 ? 5 : r < 35 ? 6 : r < 65 ? 7 : r < 85 ? 8 : r < 95 ? 9 : 10;
        this.add("-magnitude", user, this.magnitude);
      }

      const success = this.resolveMove(user, target, move, o);

      // Locked moves (Outrage etc.)
      if (move.self && move.self.volatileStatus === "lockedmove") {
        const lm = user.volatiles.lockedmove;
        if (!lm && success) user.volatiles.lockedmove = { id: "lockedmove", moveName: move.name, time: this.randInt(2, 3), used: 1 };
        else if (lm) {
          lm.used++;
          if (!success) delete user.volatiles.lockedmove;
          else if (lm.used >= lm.time) { delete user.volatiles.lockedmove; if (!user.fainted) this.addVolatile(user, "confusion", user, E("Move", move.id, move.name)); }
        }
      } else if (user.volatiles.lockedmove && user.volatiles.lockedmove.moveName !== move.name) delete user.volatiles.lockedmove;

      // Self-destruct moves
      if (move.selfdestruct === "always" || (move.selfdestruct === "ifHit" && success)) {
        if (!user.fainted) this.faint(user, user, E("Move", move.id, move.name));
      }
      if (success && !user.fainted && move.selfSwitch) {
        this.pendingSwitch = { side: user.side, copy: move.selfSwitch === "copyvolatile" };
      }
      if (!user.fainted) this.runEvent("onAfterMove", user, { only: "ability" });
    }

    isInvulnerable(target, move) {
      const tt = target.volatiles.twoturnmove;
      if (!tt || !tt.invuln) return false;
      if (move.target === "self") return false;
      for (const m of this.getActives()) {
        const r = this.callAbility(m, "onAnyInvulnerability", { source: m }, move);
        if (r === 0) return false;
      }
      return !(INVULN_HITS[tt.invuln] || []).includes(move.id);
    }

    isProtected(target, user, move) {
      const v = target.volatiles;
      if (v.protect || v.kingsshield || v.spikyshield) {
        this.add("-activate", target, "move: Protect");
        if (move.flags.contact) {
          if (v.kingsshield) this.boost(user, { atk: -2 }, target, E("Move", "kingsshield", "King's Shield"));
          if (v.spikyshield) this.damage(user, Math.floor(user.baseMaxhp / 8), target, E("Move", "spikyshield", "Spiky Shield"));
        }
        return true;
      }
      if (target.side.conditions.quickguard && move.priority > 0) { this.add("-activate", target, "move: Quick Guard"); return true; }
      return false;
    }

    accuracyCheck(user, target, move) {
      let acc = move.acc;
      if (acc === null || acc === true || acc === undefined) return true;
      if (move.ohko) {
        if (user.level < target.level) { this.add("-immune", target, "[ohko]"); return false; }
        acc = 30 + (user.level - target.level);
      }
      for (const m of this.getActives()) {
        const r = this.callAbility(m, "onAnyAccuracy", { source: user, target }, acc, move);
        if (r === true) return true;
      }
      const w = this.getWeather();
      if ((move.id === "thunder" || move.id === "hurricane") && (w === "RainDance" || w === "PrimordialSea")) return true;
      if ((move.id === "thunder" || move.id === "hurricane") && (w === "SunnyDay" || w === "DesolateLand")) acc = 50;
      if (move.id === "blizzard" && w === "Hail") return true;
      if (!move.ohko) {
        const evaStage = move.ignoreEvasion ? 0 : target.boosts.evasion;
        const stage = clamp(user.boosts.accuracy - evaStage, -6, 6);
        acc = tr(acc * (stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage)));
      }
      if (this.field.pseudo.gravity) acc = tr((acc * 5) / 3);
      const brk = !!move.ignoreAbility;
      let r = this.runEvent("onModifyAccuracy", user, { relay: acc, args: [move], target, source: user, move, accSide: "attacker" });
      if (typeof r === "number") acc = r;
      r = this.runEvent("onModifyAccuracy", target, { relay: acc, args: [move], target, source: user, move, accSide: "defender", breakAbility: brk });
      if (typeof r === "number") acc = r;
      for (const m of this.getActives()) {
        const rr = this.callAbility(m, "onAnyModifyAccuracy", { source: user, target }, acc);
        if (typeof rr === "number") acc = rr;
      }
      if (move.ohko) return this.randomChance(Math.min(100, acc), 100);
      return this.randomChance(Math.min(100, acc), 100) || acc >= 100;
    }

    // Resolve a move against its target. Returns true if it connected / worked.
    resolveMove(user, target, move, o) {
      const isSelf = target === user;
      const brk = !!move.ignoreAbility && !isSelf;
      this._breakAbilityOf = brk ? target : null;
      try {
        if (!isSelf) {
          if (this.isInvulnerable(target, move)) { this.add("-miss", user, target); return false; }
          if (move.flags.protect && !move.breaksProtect && this.isProtected(target, user, move)) return false;
          if (move.flags.reflectable && target.volatiles.magiccoat && !move.hasBounced) {
            this.add("-activate", target, "move: Magic Coat");
            const nm = this.getActiveMove(move.name);
            nm.hasBounced = true;
            this.execMove(target, nm, { bounced: true, target: user });
            return false;
          }
          if (move.flags.powder && target.hasType("Grass")) { this.add("-immune", target); return false; }
          if (move.id === "thunderwave" && target.hasType("Ground")) { this.add("-immune", target); return false; }
          if (move.category === "Status" && target.volatiles.substitute && !move.flags.bypasssub && !user.hasAbility("Infiltrator")) {
            this.add("-fail", user, "[substitute]");
            return false;
          }
          if (this.runEvent("onTryHit", target, { source: user, target, relay: move, move, breakAbility: brk }) === false) return false;
          if (!this.accuracyCheck(user, target, move)) {
            this.add("-miss", user, target);
            if (move.hasCrashDamage) this.damage(user, Math.floor(user.maxhp / 2), user, E("Move", move.id, move.name));
            return false;
          }
        }
        if (move.category === "Status") return this.statusMove(user, target, move);
        return this.damagingMove(user, target, move, brk, o);
      } finally {
        this._breakAbilityOf = null;
      }
    }

    // ---------- Damaging moves ----------
    damagingMove(user, target, move, brk, o) {
      o = o || {};
      const moveEffect = Object.assign(E("Move", move.id, move.name), { ignoreAbility: move.ignoreAbility, status: move.status });

      // Moves with special preconditions
      if (move.id === "fakeout" && user.activeTurns > 0) { this.add("-fail", user); return false; }
      if (move.id === "suckerpunch") {
        const ta = this.queue.find((x) => x.type === "move" && x.mon === target && !x.recharge);
        if (!ta || !ta.moveName || window.MOVES[ta.moveName].cat === "Status") { this.add("-fail", user); return false; }
      }
      if (move.id === "counter" || move.id === "mirrorcoat" || move.id === "metalburst") {
        const ld = user.lastDamage;
        const want = move.id === "counter" ? "Physical" : move.id === "mirrorcoat" ? "Special" : null;
        if (!ld || (want && ld.category !== want)) { this.add("-fail", user); return false; }
      }
      let stockLayers = 0;
      if (move.id === "spitup") {
        const sp = user.volatiles.stockpile;
        if (!sp || !sp.layers) { this.add("-fail", user); return false; }
        stockLayers = sp.layers;
      }
      if (move.id === "dreameater" && target.status !== "slp") { this.add("-immune", target); return false; }
      if (move.id === "snore" || move.id === "sleeptalk") { if (user.status !== "slp") { this.add("-fail", user); return false; } }
      if (move.id === "endeavor" && target.hp <= user.hp) { this.add("-fail", user); return false; }

      // Number of hits
      let hits = 1;
      if (typeof move.multihit === "number") hits = move.multihit;
      else if (Array.isArray(move.multihit)) {
        const [lo, hi] = move.multihit;
        if (lo === 2 && hi === 5) { const r = this.random(); hits = r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
        else hits = this.randInt(lo, hi);
      }
      const luckyChant = target.side.conditions.luckychant;
      let totalDealt = 0, hitCount = 0, connected = false, lastResult = null;
      const sub = target.volatiles.substitute && !move.flags.bypasssub && !user.hasAbility("Infiltrator");

      for (let i = 0; i < hits; i++) {
        if (target.fainted || user.fainted) break;
        let crit = false;
        if (!luckyChant && !(move.id === "counter")) {
          const chance = window.Damage.critChance(user, move.name, { focusEnergy: !!user.volatiles.focusenergy });
          crit = chance >= 1 || this.random() < chance;
        }
        const field = {
          weather: this.getWeather(), terrain: this.field.terrain, gravity: !!this.field.pseudo.gravity, isDoubles: false,
          reflect: !!target.side.conditions.reflect, lightScreen: !!target.side.conditions.lightscreen
        };
        const opts = {
          crit, hits: 1, charge: !!user.volatiles.charge, stockpile: stockLayers, helpingHand: !!o.meFirst,
          lastDamageTaken: user.lastDamage ? user.lastDamage.amount : 0,
          targetDamagedThisTurn: !!target.lastDamage, hitByTarget: !!(user.lastDamage && user.lastDamage.source === target),
          movesAfterTarget: target.moveThisTurn, allyFainted: user.side.faintedLastTurn, targetSwitching: false,
          magnitude: this.magnitude
        };
        let r;
        try { r = window.Damage.calc(user, target, move.name, field, opts); }
        catch (e) { if (this.debug) throw e; r = { max: 0, damage: [0], notes: ["error"], typeEffectiveness: 1, crit: false }; }
        lastResult = r;
        if (r.max === 0 && r.damage.every((d) => d === 0)) {
          const note = (r.notes && r.notes[0]) || "";
          if (/^Blocked by /.test(note)) this.add("-immune", target, "[from] ability: " + note.slice(11));
          else if (/Fizzles|Evaporates/.test(note)) this.add("-fail", user);
          else this.add("-immune", target);
          if (move.hasCrashDamage) this.damage(user, Math.floor(user.maxhp / 2), user, moveEffect);
          return false;
        }
        let dmg = r.damage[this.randInt(0, 15)];
        if (hits > 1 && i > 0 && user.hasAbility("Parental Bond") && move.multihitType === "parentalbond") dmg = Math.floor(dmg / 2);
        const typeMod = r.typeEffectiveness > 1 ? Math.log2(r.typeEffectiveness) : r.typeEffectiveness < 1 ? -Math.log2(1 / r.typeEffectiveness) : 0;
        target._hit = { typeMod, crit: r.crit };
        if (r.crit) this.add("-crit", target);
        if (i === 0) {
          if (typeMod > 0) this.add("-supereffective", target);
          else if (typeMod < 0) this.add("-resisted", target);
        }
        let dealt = 0;
        if (sub && target.volatiles.substitute) {
          const sv = target.volatiles.substitute;
          dealt = Math.min(dmg, sv.hp);
          sv.hp -= dealt;
          this.add("-activate", target, "Substitute", "[damage]");
          if (sv.hp <= 0) { delete target.volatiles.substitute; this.add("-end", target, "Substitute"); }
        } else {
          dealt = this.damage(target, dmg, user, moveEffect);
          if (target.volatiles.focuspunch) target.volatiles.focuspunch.lostFocus = true;
          if (dealt > 0) {
            target.lastDamage = { amount: dealt, category: move.category, source: user };
            this.runEvent("onDamagingHit", target, { source: user, effect: moveEffect, relay: move, move });
            if (target.hasAbility("Cute Charm") && move.flags.contact && !user.fainted && !user.volatiles.attract
                && user.gender !== "N" && target.gender !== "N" && user.gender !== target.gender && this.randomChance(3, 10)) {
              this.addVolatile(user, "attract", target, E("Ability", "cutecharm", "Cute Charm"));
            }
            if (!user.fainted) this.runEvent("onSourceDamagingHit", user, { source: user, target, effect: moveEffect, relay: move, move, only: "ability" });
            if (r.notes && r.notes.some((n) => /would be consumed/.test(n)) && target.item) this.consumeItem(target);
          }
        }
        hitCount++; totalDealt += dealt; connected = true;
        if (typeMod > 0 || true) { /* hit */ }
      }
      if (hits > 1 && hitCount > 1) this.add("-hitcount", target, hitCount);
      if (!connected) return false;
      if (move.id === "spitup") user.removeVolatile("stockpile");

      // Drain / recoil
      if (move.drain && totalDealt > 0) {
        let amt = Math.max(1, Math.floor((totalDealt * move.drain[0]) / move.drain[1]));
        if (user.item === "big-root") amt = Math.floor(amt * 1.3);
        this.heal(user, amt, target, E("Drain", "drain", "drain"));
      }
      if (move.recoil && totalDealt > 0 && !user.fainted) {
        this.damage(user, Math.max(1, Math.round((totalDealt * move.recoil[0]) / move.recoil[1])), user, E("Recoil", "recoil", "Recoil"));
      }
      if (move.id === "struggle" && !user.fainted) this.damage(user, Math.max(1, Math.floor(user.maxhp / 4)), user, E("Recoil", "recoil", "Recoil"));

      // Move-specific after-effects
      const after = window.BATTLE_MOVE_EFFECTS && window.BATTLE_MOVE_EFFECTS.afterHit[move.id];
      if (after && !target.fainted) after(this, user, target, move, totalDealt);

      // Secondary effects
      if (!target.fainted && move.secondaries && !sub) {
        for (const sec of move.secondaries) {
          const chance = sec.chance == null ? 100 : sec.chance;
          if (target.hasAbility("Shield Dust")) continue;
          if (!this.randomChance(chance, 100)) continue;
          if (sec.status) this.trySetStatus(target, sec.status, user, moveEffect);
          if (sec.volatileStatus) {
            if (sec.volatileStatus !== "flinch" || !target.moveThisTurn) this.addVolatile(target, sec.volatileStatus, user, moveEffect);
          }
          if (sec.boosts) this.boost(target, sec.boosts, user, moveEffect);
          if (sec.self && sec.self.boosts) this.boost(user, sec.self.boosts, user, moveEffect);
        }
      }
      if (move.self && !user.fainted) {
        if (move.self.boosts && !user.hasAbility("Sheer Force")) this.boost(user, move.self.boosts, user, moveEffect);
        if (move.self.volatileStatus === "mustrecharge") this.addVolatile(user, "mustrecharge", user, moveEffect);
      }
      if (move.volatileStatus && !target.fainted && !sub) {
        if (this.addVolatile(target, move.volatileStatus, user, moveEffect) && move.volatileStatus === "partiallytrapped") {
          target.volatiles.partiallytrapped.moveName = move.name;
        }
      }
      if (move.forceSwitch && !target.fainted && !sub) this.forceOut(target, user);
      if (!user.fainted) this.runEvent("onAfterMoveSecondarySelf", user, { relay: move, args: [totalDealt], move });
      if (!target.fainted) this.runEvent("onAfterMoveSecondary", target, { source: user, relay: move, only: "ability" });
      return true;
    }

    forceOut(target, user) {
      const side = target.side;
      const opts = side.pokemon.map((p, i) => (!p.fainted && p !== side.active ? i : -1)).filter((i) => i >= 0);
      if (!opts.length || target.volatiles.ingrain || target.hasAbility("Suction Cups")) return;
      if (this.callAbility(target, "onDragOut", { source: user }) === false) return;
      this.switchIn(side, this.sample(opts), { drag: true });
    }

    // ---------- Status moves ----------
    statusMove(user, target, move) {
      const moveEffect = Object.assign(E("Move", move.id, move.name), { ignoreAbility: move.ignoreAbility, status: move.status });
      const sp = window.BATTLE_MOVE_EFFECTS && window.BATTLE_MOVE_EFFECTS.status[move.id];
      let did = false;
      if (sp) {
        const r = sp(this, user, target, move);
        if (r === false) { this.add("-fail", user); return false; }
        if (r === "done") return true;
        did = true;
      }
      const isSelf = target === user;
      if (move.boosts) {
        const tgt = isSelf || move.target === "self" ? user : target;
        const changed = this.boost(tgt, move.boosts, user, moveEffect);
        if (!changed && !move.volatileStatus && !move.status && !sp) { return this.fail(user); }
        did = true;
      }
      if (move.status) {
        if (!this.trySetStatus(target, move.status, user, moveEffect)) {
          if (!target.status) { /* blocked by an immunity that already logged */ }
          else this.add("-fail", user);
          return false;
        }
        did = true;
      }
      if (move.volatileStatus && !move.self) {
        const vs = move.volatileStatus;
        const tgt = move.target === "self" ? user : target;
        if (vs === "leechseed" && tgt.hasType("Grass")) { this.add("-immune", tgt); return false; }
        if (STALL_MOVES.has(vs)) {
          if (!this.stallSuccess(user)) { this.add("-fail", user); user.stallCount = 0; return false; }
          user.stallCount = (user.stallCount || 0) + 1;
          if (vs === "endure" || vs === "protect" || vs === "kingsshield" || vs === "spikyshield") this.addVolatile(user, vs, user, moveEffect);
          else this.addSideCondition(user.side, vs, user);
          return true;
        }
        if (vs === "substitute") return this.makeSubstitute(user);
        if (vs === "partiallytrapped") { /* binding moves do damage in practice */ }
        if (vs === "encore" && !target.lastMove) { this.add("-fail", user); return false; }
        if (vs === "disable" && !target.lastMove) { this.add("-fail", user); return false; }
        if (vs === "partiallytrapped" || vs === "taunt" || vs === "torment" || vs === "encore" || vs === "disable" ||
            vs === "leechseed" || vs === "yawn" || vs === "confusion" || vs === "ingrain" || vs === "aquaring" || vs === "focusenergy" ||
            vs === "magnetrise" || vs === "destinybond" || vs === "charge" || vs === "perishsong") {
          if (!this.addVolatile(tgt, vs, user, moveEffect)) { this.add("-fail", user); return false; }
          if (vs === "encore") tgt.volatiles.encore.moveId = tgt.lastMove;
          if (vs === "disable") tgt.volatiles.disable.moveId = tgt.lastMove;
        } else if (!this.addVolatile(tgt, vs, user, moveEffect)) {
          this.add("-fail", user); return false;
        }
        did = true;
      }
      if (move.weather) {
        if (!this.setWeather(move.weather, user, moveEffect)) { this.add("-fail", user); return false; }
        did = true;
      }
      if (move.terrain) {
        if (!this.setTerrain(move.terrain)) { this.add("-fail", user); return false; }
        did = true;
      }
      if (move.sideCondition) {
        const targetSide = move.target === "foeSide" ? user.side.foe : user.side;
        if (!this.addSideCondition(targetSide, move.sideCondition, user)) { this.add("-fail", user); return false; }
        did = true;
      }
      if (move.pseudoWeather) {
        const id = move.pseudoWeather;
        if (this.field.pseudo[id]) {
          if (id === "trickroom") { delete this.field.pseudo[id]; this.add("-fieldend", "Trick Room"); return true; }
          this.add("-fail", user); return false;
        }
        this.field.pseudo[id] = { turns: id === "trickroom" ? 5 : id === "gravity" ? 5 : 5 };
        this.add("-fieldstart", id);
        did = true;
      }
      // Healing Wish / Lunar Dance: the user faints and whoever comes in next
      // is healed. Fails with no one left to come in (a wild Pokémon, or the
      // last one standing).
      if (move.slotCondition === "healingwish" || move.slotCondition === "lunardance") {
        if (!user.side.pokemon.some((p) => p !== user && !p.fainted)) { this.add("-fail", user); return false; }
        user.side.healingWish = { lunar: move.slotCondition === "lunardance", name: move.name };
        did = true;
      }
      if (move.slotCondition === "Wish" || move.slotCondition === "wish") {
        if (user.side.wish) { this.add("-fail", user); return false; }
        user.side.wish = { turns: 2, hp: Math.floor(user.maxhp / 2) };
        did = true;
      }
      if (move.forceSwitch) { this.forceOut(target, user); did = true; }
      if (move.selfSwitch || move.selfdestruct) did = true;
      if (!did) { this.add("-fail", user); return false; }
      return true;
    }

    fail(user) { this.add("-fail", user); return false; }

    stallSuccess(user) {
      const n = user.stallCount || 0;
      if (n === 0) return true;
      return this.randomChance(1, Math.pow(3, Math.min(n, 5)));
    }

    makeSubstitute(user) {
      if (user.volatiles.substitute) { this.add("-fail", user, "move: Substitute"); return false; }
      const cost = Math.floor(user.maxhp / 4);
      if (user.hp <= cost) { this.add("-fail", user, "move: Substitute", "[weak]"); return false; }
      user.hp -= cost;
      this.add("-start", user, "Substitute");
      this.add("-damage", user, this.hpStr(user), "[from] Substitute");
      user.volatiles.substitute = { id: "substitute", hp: cost };
      return true;
    }

    // ---------- End of turn ----------
    residual() {
      const f = this.field;
      const w = this.getWeather();
      // Weather
      if (f.weather) {
        if (f.weatherTurns !== Infinity) {
          f.weatherTurns--;
          if (f.weatherTurns <= 0) { this.add("-weather", "none"); f.weather = ""; f.weatherSource = null; }
        }
      }
      const actives = this.sortBySpeed(this.getActives());
      const w2 = this.getWeather();
      if (w2) {
        this.add("-weather", w2, "[upkeep]");
        for (const m of actives) {
          if (m.fainted) continue;
          if (w2 === "Sandstorm" && !m.types.some((t) => ["Rock", "Ground", "Steel"].includes(t))
              && this.runEvent("onImmunity", m, { relay: "sandstorm" }) !== false) {
            this.damage(m, Math.floor(m.maxhp / 16), null, E("Weather", "sandstorm", "Sandstorm"));
          }
          if (w2 === "Hail" && !m.hasType("Ice") && this.runEvent("onImmunity", m, { relay: "hail" }) !== false) {
            this.damage(m, Math.floor(m.maxhp / 16), null, E("Weather", "hail", "Hail"));
          }
          if (!m.fainted) this.runEvent("onWeather", m, { relay: E("Weather", w2.toLowerCase(), w2), only: "ability" });
        }
      }
      // Terrain
      if (f.terrain) {
        if (f.terrain === "GrassyTerrain") {
          for (const m of actives) if (!m.fainted && this.isGrounded(m)) this.heal(m, Math.floor(m.maxhp / 16), m, E("Terrain", "grassyterrain", "Grassy Terrain"));
        }
        f.terrainTurns--;
        if (f.terrainTurns <= 0) { this.add("-fieldend", f.terrain); f.terrain = ""; }
      }
      // Wish
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.wish) {
          s.wish.turns--;
          if (s.wish.turns <= 0) {
            if (s.active && !s.active.fainted) this.heal(s.active, s.wish.hp, s.active, E("Move", "wish", "Wish"));
            s.wish = null;
          }
        }
      }
      // Per-Pokemon residuals
      for (const m of actives) {
        if (m.fainted) continue;
        this.runEvent("onResidual", m, {});
      }
      // Durations
      for (const s of [this.sides.p1, this.sides.p2]) {
        for (const id of Object.keys(s.conditions)) {
          const c = s.conditions[id];
          if (c.duration !== undefined) {
            c.duration--;
            if (c.duration <= 0) this.removeSideCondition(s, id);
          }
        }
      }
      for (const id of Object.keys(f.pseudo)) {
        f.pseudo[id].turns--;
        if (f.pseudo[id].turns <= 0) { delete f.pseudo[id]; this.add("-fieldend", id); }
      }
      for (const m of this.getActives()) {
        for (const id of Object.keys(m.volatiles)) {
          const v = m.volatiles[id];
          if (v.duration !== undefined) {
            v.duration--;
            if (v.duration <= 0) this.removeVolatile(m, id);
          }
        }
        if (!m.volatiles.protect && !m.volatiles.kingsshield && !m.volatiles.spikyshield && !m.volatiles.endure
            && !(m.lastMove && STALL_MOVES.has(m.lastMove))) m.stallCount = 0;
        m.activeTurns++;
        if (m.hp && m.volatiles.roost === undefined && m.types.join() !== m.baseTypes.join() && !m.mega) { /* type changes persist */ }
      }
    }
  }

  Battle.Pokemon = Pokemon;
  Battle.MEGA_MAP = () => { buildIndexes(); return MEGA_MAP; };
  window.Battle = Battle;
})();
