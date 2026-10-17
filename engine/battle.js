// Battle engine (Gen 6 singles and doubles, headless)
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
//
// ---- Double battles ----
//   new Battle({ ..., format: "doubles" })      ("singles" is the default)
// Two active slots a side: side.actives[0..1] (slot a, slot b). side.active is
// still slot a's Pokémon (the only one in singles). Each side leads with its
// first two healthy Pokémon; a side with only one that can fight leaves
// side.actives[1] null and fights with one slot. Events name slots the
// Showdown way: "p1a: Name" / "p1b: Name" (singles stays "p1a: Name"); a
// Pokémon on the bench keeps the letter of the slot it last stood in.
//
// Target locations (relative, as in Showdown): 1 = the foe in slot a, 2 = the
// foe in slot b, -1 = your own slot a, -2 = your own slot b.
//
// getRequest(id) in doubles (id is a controller, see tag battles below):
//   { phase: "move", format: "doubles", slots: [0, 1], open: [slots still to
//     choose], switches: [bench team indexes], team: [... slot, owner, mine],
//     actives: [ per slot, null for an empty / fainted / already chosen slot:
//       { slot, teamIndex, species, hp, ..., moves: [{ ..., target: "normal",
//         targets: [legal target locations] }], struggle, canMega, forced,
//         trapped, switches, canCatch, canRun } ] }
//   { phase: "switch", forceSwitch: [bool per slot], switches: [...] }
// choose(id, [choice0, choice1]): one choice per slot (null for slots that
// need none). A single (non-array) choice fills the first open slot, so slots
// may also be chosen one call at a time. Moves that aim at one Pokémon take a
// target: { type: "move", move: 0, target: 2, mega: true? } (left out: a
// random foe). Spread, self, side, field and random moves need none.
// Switches can't bring in the same Pokémon twice or one already out; one Mega
// Evolution a side per battle; forced slots (recharge, Fly's second turn, ...)
// fill themselves. Fainted slots are refilled at the end of the turn (phase
// "switch" with forceSwitch, both sides at once); U-turn / Baton Pass ask for
// the user's slot mid-turn. With fewer Pokémon left to send in than fainted
// slots, the request has switchCount (how many), forceSwitch marks every
// slot that may take one and open the default (slot a first): choose
// [null, { type: "switch", index }] to fill slot b instead; the rest stay
// empty. Wild doubles (wild: true with two wild Pokémon):
// a ball only while one wild Pokémon is left (canCatch), run as usual.
//
// Targeting follows moves.js `target`: normal/any/adjacentFoe (chosen; a
// fainted foe is replaced by the other foe, a fainted ally by the foe opposite
// the user, as FireRed does),
// adjacentAlly (Helping Hand), adjacentAllyOrSelf, allAdjacentFoes and
// allAdjacent (spread: Earthquake, Surf and Explosion hit the ally too; 0.75x
// each with more than one target), randomNormal (Outrage, Struggle: a random
// foe), scripted (Counter: the last attacker), self/allySide/allyTeam/all
// (the user or the field), foeSide (the foes' side; a reflectable one
// bounces off either foe's Magic Bounce / Magic Coat). Spotlight, Follow Me /
// Rage Powder and Lightning Rod / Storm Drain redirect single-target moves
// (Stalwart ignores all of them, Mold Breaker the abilities). Abilities act
// per target of a spread move (Soundproof, Sap Sipper, ...). Event extras:
// "move" gets a 5th "[spread] p2a: X,p2b: Y" for spread moves; "-notarget"
// (no one left to hit); "swap" (Ally Switch: [old identity, new slot]).
//
// Doubles moves: Mat Block (first turn out; the side is safe from damaging
// moves) and Crafty Shield (from status moves aimed at it), both failing
// when the user moves last; After You (the target moves next; fails if it
// would anyway, so always in singles) and Quash (the target moves last);
// Instruct and Spotlight (Gen 7, added to moves.js; Instruct works in
// singles too); Acupressure / Aromatic Mist / Hold Hands on the ally. Sky
// Drop (both formats): the target is carried up (both semi-invulnerable; it
// can't move or switch) and dropped next turn; fails on 200 kg and up,
// Flying types take no damage, and fainting, switching out, failing to move
// or Gravity ends it ("-prepare" with the target, "-end" Sky Drop
// "[interrupt]"). Side abilities: Flower Veil, Sweet Veil, Aroma Veil (the
// holder and its ally; `onAlly…` hooks via runAllyHooks), Flower Gift,
// Symbiosis, Unnerve.
//
// Tag battles (doubles only): a side may be two trainers, each with up to 3
// Pokémon:  p1: { name: "Red", team: [...], partner: { name: "Leaf", team: [...] } }
// The trainer holds slot a and the partner slot b; the partner's Pokémon come
// after the trainer's in side.pokemon (Pokemon.owner: 0 trainer, 1 partner).
// Each slot is refilled only from its owner's party; a trainer with nothing
// left is out ("-trainerout", side, name, slot) and the slot stays empty; the
// side loses when both are out. Controllers: getRequest/choose("p1") cover the
// trainer's slot only, ("p1b") the partner's (drive it with
// OpponentAI.choose(battle, "p1b") or your own choice). "switch"/"drag" events
// carry the trainer's name as a 7th element, and "-withdraw" [Pokémon,
// trainer] marks a Pokémon called back. Experience goes only to p1's own
// (owner 0) Pokémon. Ally Switch fails in tag battles.

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
    electricterrain: "ElectricTerrain", grassyterrain: "GrassyTerrain", mistyterrain: "MistyTerrain",
    psychicterrain: "PsychicTerrain"
  };
  const PRIMAL = ["DesolateLand", "PrimordialSea", "DeltaStream"];
  const WEATHER_ROCKS = { SunnyDay: "heat-rock", RainDance: "damp-rock", Sandstorm: "smooth-rock", Hail: "icy-rock" };
  const DEF_ACC_ABILITIES = new Set(["Sand Veil", "Snow Cloak", "Tangled Feet", "Wonder Skin"]);
  const SILENT_VOLATILES = new Set(["choicelock", "mustrecharge", "lockedmove", "twoturnmove", "flinch",
    "protect", "kingsshield", "spikyshield", "banefulbunker", "obstruct", "maxguard", "sparklingaria", "endure", "charge", "roost", "focuspunch", "destinybond", "focusenergy"]);
  const INVULN = {
    fly: "fly", bounce: "fly", dig: "dig", dive: "dive", shadowforce: "shadow", phantomforce: "shadow"
  };
  const INVULN_HITS = {
    fly: ["gust", "twister", "thunder", "skyuppercut", "hurricane", "smackdown", "whirlwind"],
    dig: ["earthquake", "magnitude", "fissure"],
    dive: ["surf", "whirlpool"],
    shadow: []
  };
  // Doubles targeting (moves.js `target`): moves aimed at one chosen Pokémon,
  // moves that hit several, and those Follow Me / Lightning Rod can redirect.
  const CHOSEN_TARGETS = new Set(["normal", "any", "adjacentFoe", "adjacentAlly", "adjacentAllyOrSelf"]);
  const SPREAD_TARGETS = new Set(["allAdjacentFoes", "allAdjacent"]);
  const REDIRECTABLE = new Set(["normal", "any", "adjacentFoe", "randomNormal"]);
  // One-turn doubles effects, cleared at the end of each turn.
  const TURN_VOLATILES = ["helpinghand", "followme", "ragepowder", "spotlight"];
  const STALL_MOVES = new Set(["protect", "detect", "endure", "kingsshield", "spikyshield", "banefulbunker", "obstruct", "maxguard", "quickguard", "wideguard", "matblock", "craftyshield"]);

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
      this.slot = 0;          // which active slot it stands in (0, or 1 in doubles)
      this.species = speciesKey;
      this.baseSpecies = speciesKey;
      this.name = set.name || speciesKey;
      this.level = set.level != null ? set.level : 50;
      this.nature = set.nature || "Hardy";
      this.ivs = Object.assign({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, set.ivs);
      this.evs = Object.assign({}, set.evs);
      this.happiness = set.happiness != null ? set.happiness : 70;
      this.ball = set.ball;
      this.metHere = !!set.metHere;
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
      this.owner = 0;         // tag battles: 0 = the side's trainer, 1 = the partner
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
      // (Running totals for Gen 8's evolutions; crits are this battle's.)
      // (Dynamax: its Dynamax Level, 0-10, and the G-Max Factor; a battle
      // set without them is at level 10, as in Showdown.)
      this.dynamaxLevel = set.dynamaxLevel != null ? set.dynamaxLevel : 10;
      this.gmax = !!set.gmax;
      this.dynamaxed = null;
      this.recoilTaken = set.recoil || 0;
      this.moveUses = Object.assign({}, set.moveUses);
      this.critsLanded = 0;
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
    // "p1a: Name" (slot 0) or "p1b: Name" (slot 1, doubles only). A Pokémon
    // on the bench keeps the letter of the slot it last stood in.
    get ident() { return this.side.id + (this.slot === 1 ? "b" : "a") + ": " + this.name; }
    hasType(t) { return this.types.includes(t); }
    getTypes() { return this.types.slice(); }
    setType(t) { this.types = [].concat(t); return true; }
    ignoringAbility() { return !!this.volatiles.gastroacid || this.battle._breakAbilityOf === this; }
    hasAbility(a) {
      if (this.ignoringAbility() || this.battle.neutralized(this)) return false;
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
    adjacentAllies() { const a = this.battle.allyOf(this); return a ? [a] : []; }
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
      // Tag battle (doubles only): a partner trainer with their own party
      // controls slot b. Each party is up to 3; the partner's Pokémon follow
      // the trainer's in `pokemon` (Pokemon.owner 0 = trainer, 1 = partner).
      this.tag = !!(battle.doubles && opts.partner);
      this.trainers = this.tag ? [this.name, opts.partner.name || id + " partner"] : [this.name];
      const sets = this.tag ? (opts.team || []).slice(0, 3).map((s) => [s, 0]).concat((opts.partner.team || []).slice(0, 3).map((s) => [s, 1]))
        : (opts.team || []).slice(0, 6).map((s) => [s, 0]);
      this.pokemon = sets.map(([s, owner], i) => { const p = new Pokemon(battle, this, s, i); p.owner = owner; return p; });
      this.megaUsedBy = [false, false];
      this.partial = [];
      this.switchSlots = [];
      if (!this.pokemon.length) throw new Error(id + " has no Pokemon");
      // The Pokémon in each active slot (one in singles, two in doubles; a slot
      // is null when no one ever stood in it, e.g. a team of one in doubles).
      this.actives = new Array(battle.activePerSide).fill(null);
      this.conditions = {};
      this.choice = null;
      this.foe = null;
      this.megaUsed = false;
      // (Dynamax: only a side whose Trainer has the Dynamax Band, opts.dynamax.)
      this.dynamaxAllowed = !!opts.dynamax;
      this.dynamaxUsed = false;
      this.faintedLastTurn = false;
      this.faintedThisTurn = false;
    }
    get remaining() { return this.pokemon.filter((p) => !p.fainted).length; }
    // Slot 0's Pokémon (the only one in singles).
    get active() { return this.actives[0]; }
    set active(mon) { this.actives[0] = mon; }
    // Team indexes of the Pokémon that could come in (not fainted, not out).
    // In a tag team, `slot` narrows it to that slot's trainer's party.
    bench(slot) {
      const own = (p) => !this.tag || slot == null || p.owner === slot;
      return this.pokemon.map((p, i) => (!p.fainted && !this.actives.includes(p) && own(p) ? i : -1)).filter((i) => i >= 0);
    }
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
      // Pokémon Tower without the Silph Scope (FireRed's BATTLE_TYPE_GHOST):
      // your Pokémon are too scared to move, the Ghost only says "Get out…",
      // balls miss, and running away always works.
      this.ghost = !!opts.ghost;
      this.noCatch = !!opts.noCatch;   // (the Ghost, seen through the Silph Scope: still dodges balls)
      this.catchContext = opts.catchContext || {};
      this.runAttempts = 0;
      this.caught = null;
      this.escaped = false;
      // "singles" (default) or "doubles": two active Pokémon a side.
      this.format = opts.format === "doubles" && !opts.safari && !opts.ghost ? "doubles" : "singles";
      this.doubles = this.format === "doubles";
      this.activePerSide = this.doubles ? 2 : 1;
      this.sides = { p1: new Side(this, "p1", opts.p1 || {}), p2: new Side(this, "p2", opts.p2 || {}) };
      this.sides.p1.foe = this.sides.p2;
      this.sides.p2.foe = this.sides.p1;
      // The Safari Zone (FireRed's BATTLE_TYPE_SAFARI, engine/safari.js): your
      // Pokémon stay in their balls; each turn you throw a Safari Ball, Bait
      // or a Rock, or run, and the wild Pokémon watches you or runs away.
      // opts.safari: { balls } (how many Safari Balls you have).
      this.safari = null;
      if (opts.safari) {
        this.wild = true;
        this.expEnabled = false;
        this.safari = Object.assign(window.Safari.encounter(this.sides.p2.pokemon[0].baseSpecies), { balls: opts.safari.balls | 0 });
        this.safariOut = false;   // (the last Safari Ball missed: "Game over!")
        this.fled = false;
      }
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
      const nm = (s) => String(s || "").replace(/^p\d[ab]?: /, "");
      switch (t) {
        case "turn": return "=== Turn " + a + " ===";
        case "switch": return nm(a) + " was sent out!  (" + b + ")";
        case "drag": return nm(a) + " was dragged out!";
        case "move": return nm(a) + " used " + b + "!";
        case "-damage": return "  " + nm(a) + " -> " + b + (c ? "  " + c : "");
        case "-heal": return "  " + nm(a) + " healed -> " + b + (c ? "  " + c : "");
        case "faint": return nm(a) + " fainted!";
        case "-notarget": return "  But there was no target...";
        case "-withdraw": return b + " withdrew " + nm(a) + "!";
        case "-trainerout": return b + " is out of usable Pokémon!";
        case "swap": return nm(a) + " switched places!";
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
        if (ab && typeof ab[name] === "function" && !mon.volatiles.gastroacid && !this.neutralized(mon)) {
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
            && (!o.accSide || it.accSide === o.accSide) && !(/-berry$/.test(mon.item) && this.isUnnerved(mon))) {
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
        foes: () => (b.doubles ? b.foesOf(holder)
          : holder.side.foe.active && !holder.side.foe.active.fainted ? [holder.side.foe.active] : []),
        allies: () => holder.adjacentAllies(),
        getAllActive: () => b.getActives(),
        checkMoveMakesContact: (move, attacker, defender) => !!(move && move.flags && move.flags.contact)
          && !(attacker && attacker.item === "protective-pads"),
        setItem: (mon, item) => { mon.item = normItem(item); return true; },
        takeItem: (mon) => b.takeItem(mon),
        setType: (mon, t) => mon.setType(t),
        formeChange: () => false,
        abilityForme: (mon, forme, text) => b.abilityForme(mon, forme, text),
        setTerrain: (t) => b.setTerrain(t, holder, h.effect),
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
      if (!ab || typeof ab[hookName] !== "function" || mon.volatiles.gastroacid || this.neutralized(mon)) return undefined;
      const h = { fn: ab[hookName], thisObj: ab, effect: E("Ability", toID(ab.name), ab.name), state: mon.abilityState };
      const ctx = this.makeCtx(mon, h, o || {});
      try { return ab[hookName].apply(ab, [ctx].concat(args)); }
      catch (e) { if (this.debug) throw e; return undefined; }
    }

    // Ability hooks a Pokémon's side shares (Sweet Veil, Aroma Veil, Flower
    // Veil): `onAlly<name>` of the Pokémon itself and of its ally (doubles),
    // with ctx.pokemon the ability's holder and ctx.target `mon`. Mold
    // Breaker (o.breakAbility) skips the breakable ones. Returns false if
    // one of them blocked the event.
    runAllyHooks(name, mon, o) {
      const ally = this.allyOf(mon);
      for (const holder of ally ? [mon, ally] : [mon]) {
        const ab = window.ABILITIES[holder.ability];
        const fn = ab && ab["onAlly" + name];
        if (typeof fn !== "function" || holder.volatiles.gastroacid || this.neutralized(holder)) continue;
        if (o.breakAbility && ab.flags && ab.flags.breakable) continue;
        const h = { fn, thisObj: ab, effect: E("Ability", toID(ab.name), ab.name), state: holder.abilityState };
        const ctx = this.makeCtx(holder, h, Object.assign({}, o, { target: mon }));
        let r;
        try { r = fn.apply(ab, [ctx, o.relay].concat(o.args || [])); }
        catch (e) { if (this.debug) throw e; continue; }
        if (r === false) return false;
      }
      return true;
    }
    // Unnerve: a foe out with it stops a Pokémon from eating its Berry.
    isUnnerved(mon) {
      const foe = mon.side.foe.active;
      const foes = this.doubles ? this.foesOf(mon) : foe && !foe.fainted && foe.isActive ? [foe] : [];
      return foes.some((f) => f.hasAbility(["Unnerve", "As One (Glastrier)", "As One (Spectrier)"]));
    }
    // Neutralizing Gas (Gen 8): while a Pokémon with it is out, every other
    // Pokémon's Ability does nothing (but the ones that can't be suppressed).
    neutralized(mon) {
      if (mon.ability === "Neutralizing Gas") return false;
      let gas = false;
      for (const s of [this.sides.p1, this.sides.p2]) {
        for (const m of s.actives) if (m && m !== mon && !m.fainted && m.isActive && m.ability === "Neutralizing Gas" && !m.volatiles.gastroacid) gas = true;
      }
      if (!gas) return false;
      const ab = window.ABILITIES[mon.ability];
      return !(ab && ab.flags && ab.flags.cantsuppress);
    }
    // Asleep, or always drowsing (Comatose, Gen 7): Sleep Talk, Snore, Dream
    // Eater, Hex and Wake-Up Slap treat it as asleep.
    asleep(mon) { return mon.status === "slp" || mon.hasAbility("Comatose"); }
    // Wimp Out / Emergency Exit (Gen 7): at half HP or less it heads back to
    // its Trainer (a wild Pokémon has nowhere to go).
    emergencyExit(mon) {
      if (mon.fainted || !mon.isActive || (this.wild && mon.side.id === "p2") || !mon.side.bench(mon.slot).length) return false;
      if (!mon.hasAbility(["Wimp Out", "Emergency Exit"])) return false;
      this.add("-activate", mon, "ability: " + mon.ability);
      this.pendingSwitch = { side: mon.side, copy: false, slot: mon.slot };
      return true;
    }
    // Flower Gift on a Pokémon's side (itself or its ally); only Cherrim's works.
    flowerGift(mon) {
      return [mon, this.allyOf(mon)].some((m) => m && !m.fainted && m.hasAbility("Flower Gift") && /^Cherrim/.test(m.baseSpecies));
    }
    // Sweet Veil on a Pokémon's side (itself or its ally): it can't fall asleep.
    sweetVeiled(mon, effect) {
      if (this._breakFor(mon, effect)) return null;
      const ally = this.allyOf(mon);
      return [mon, ally].find((m) => m && m.hasAbility("Sweet Veil")) || null;
    }

    getActives() { return this.sides.p1.actives.concat(this.sides.p2.actives).filter((m) => m && !m.fainted); }
    // Doubles helpers (in singles: the one foe, no ally).
    foesOf(mon) { return mon.side.foe.actives.filter((m) => m && !m.fainted); }
    allyOf(mon) {
      if (!this.doubles || !mon.side) return null;
      const a = mon.side.actives[1 - mon.slot];
      return a && a !== mon && !a.fainted && a.isActive ? a : null;
    }
    // The Pokémon at a relative target location seen from `mon`: 1/2 are the
    // foe's slots a/b, -1/-2 its own side's slots a/b.
    atLoc(mon, loc) {
      if (!loc) return null;
      const side = loc > 0 ? mon.side.foe : mon.side;
      return side.actives[Math.abs(loc) - 1] || null;
    }
    locOf(mon, from) { return (mon.side === from.side ? -1 : 1) * (mon.slot + 1); }

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
    setTerrain(name, source, effect) {
      name = TERRAIN_NAMES[toID(name)] || name;
      if (this.field.terrain === name) return false;
      this.field.terrain = name; this.field.terrainTurns = 5;
      this.add("-fieldstart", name, effect && effect.effectType === "Ability" ? "[from] ability: " + effect.name + " [of] " + (source ? source.ident : "") : "");
      this.mimicry();
      return true;
    }
    // Mimicry (Gen 8): its type is the terrain's (its own again with none).
    mimicry(only) {
      const T = { ElectricTerrain: "Electric", GrassyTerrain: "Grass", MistyTerrain: "Fairy", PsychicTerrain: "Psychic" };
      for (const m of only ? [only] : this.getActives()) {
        if (!m.hasAbility("Mimicry")) continue;
        const t = T[this.field.terrain];
        const types = t ? [t] : m.baseTypes.slice();
        if (types.join() === m.types.join()) continue;
        m.types = types;
        this.add("-start", m, "typechange", types.join("/"), "[from] ability: Mimicry");
      }
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
        if (source && source.item === "light-clay" && (id === "reflect" || id === "lightscreen" || id === "auroraveil")) dur = 8;
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
      // (Wimp Out / Emergency Exit from hazards, weather, recoil and the like;
      // an attack's own damage is the Ability's onDamagingHit.)
      else if ((!effect || effect.effectType !== "Move") && mon.hp <= mon.maxhp / 2 && mon.hp + amount > mon.maxhp / 2) this.emergencyExit(mon);
      return amount;
    }

    // FireRed's AdjustFriendship for your Pokémon (engine/experience.js).
    friendship(mon, change) {
      if (mon.side.id !== "p1") return;
      mon.happiness = window.Experience.adjustFriendship(mon.happiness, change, { item: mon.item, ball: mon.ball, metHere: mon.metHere });
    }

    faint(mon, source, effect) {
      if (mon.fainted) return;
      mon.hp = 0; mon.fainted = true; mon.side.faintedThisTurn = true;
      // Fainting upsets it: more so against a foe 30 levels higher (FireRed's
      // battle_util2.c: the opposing Pokémon's level).
      const foe = this.doubles ? this.foesOf(mon)[0] : mon.side.foe.active;
      this.friendship(mon, foe && foe.level - mon.level > 29 ? "faintLarge" : "faintSmall");
      this.add("faint", mon);
      // A tag-team trainer with nothing left is out; their slot stays empty.
      if (mon.side.tag && !mon.side.pokemon.some((p) => p.owner === mon.owner && !p.fainted)) {
        this.add("-trainerout", mon.side.id, mon.side.trainers[mon.owner], mon.slot);
      }
      if (this.expEnabled && mon.side.id === "p2") this.awardExp(mon);
      if (source && source !== mon && !source.fainted && effect && effect.effectType === "Move") {
        if (mon.volatiles.destinybond) {
          this.add("-activate", mon, "move: Destiny Bond");
          this.faint(source, mon, E("Move", "destinybond", "Destiny Bond"));
        }
        this.runEvent("onSourceAfterFaint", source, { source, target: mon, effect, only: "ability" });
      }
      this.runEvent("onEnd", mon, { only: "ability" });
      this.endSkyDrop(mon);
      this.undynamax(mon, true);
      mon.volatiles = {}; mon.status = ""; mon.statusState = {};
      // Gen 7: Soul-Heart (any other Pokémon fainting), and Receiver / Power
      // of Alchemy (the ally's Ability passes to it).
      for (const m of this.getActives()) {
        if (m === mon || m.volatiles.gastroacid) continue;
        if (m.hasAbility("Soul-Heart")) this.boost(m, { spa: 1 }, m, E("Ability", "soulheart", "Soul-Heart"));
      }
      const heir = this.allyOf(mon) || (this.doubles && mon.side.actives.find((m) => m && m !== mon && !m.fainted));
      const given = window.ABILITIES[mon.ability];
      if (heir && !heir.volatiles.gastroacid && heir.hasAbility(["Receiver", "Power of Alchemy"]) && given
          && !(given.flags && given.flags.noreceiver) && !["Wonder Guard", "Trace", "Imposter", "Illusion", "Zen Mode", "Forecast", "Flower Gift"].includes(mon.ability)) {
        const from = heir.ability;
        heir.ability = mon.ability; heir.abilityState = {};
        this.add("-ability", heir, given.name, "[from] ability: " + from, "[of] " + mon.ident);
        this.runEvent("onStart", heir, { only: "ability" });
      }
    }

    // Sky Drop: the user (fainting, switching out, failing to move on the
    // second turn, or brought down by Gravity) lets go of the Pokémon it
    // carried.
    endSkyDrop(user) {
      const tt = user.volatiles.twoturnmove;
      const t = tt && tt.skyDrop;
      if (!t) return;
      delete user.volatiles.twoturnmove;
      if (t.volatiles.skydrop && t.volatiles.skydrop.source === user) {
        delete t.volatiles.skydrop;
        if (!t.fainted) this.add("-end", t, "Sky Drop", "[interrupt]");
      }
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
      // (Sweet Veil, Flower Veil: the holder's side.)
      if (this.runAllyHooks("SetStatus", mon, { source, effect, relay: sobj, args: [effect], breakAbility: this._breakFor(mon, effect) }) === false) return false;
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
      if (mon.dynamaxed && id === "flinch") return false;
      if (mon.volatiles[id]) return false;
      const cond = getCondition(id) || {};
      const r = this.runEvent("onTryAddVolatile", mon, { source, effect, relay: { id }, breakAbility: this._breakFor(mon, effect) });
      if (r === false) return false;
      // (Aroma Veil, Sweet Veil, Flower Veil: the holder's side.)
      if (this.runAllyHooks("TryAddVolatile", mon, { source, effect, relay: { id }, args: [effect], breakAbility: this._breakFor(mon, effect) }) === false) return false;
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
      // (Flower Veil: Grass types on the holder's side.)
      if (this.runAllyHooks("TryBoost", mon, Object.assign({}, o, { breakAbility: this._breakFor(mon, effect) })) === false) return false;
      let changed = false;
      for (const k of Object.keys(boosts)) {
        const delta = boosts[k];
        if (!delta) continue;
        const cur = mon.boosts[k] || 0;
        const nv = clamp(cur + delta, -6, 6);
        if (nv === cur) { this.add(delta > 0 ? "-boost" : "-unboost", mon, k, 0); continue; }
        mon.boosts[k] = nv;
        changed = true;
        // (For Burning Jealousy and Lash Out.)
        if (nv > cur) mon.statsRaisedThisTurn = true; else mon.statsLoweredThisTurn = true;
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
      // Symbiosis (doubles): the ally hands over its own item.
      const ally = this.allyOf(mon);
      if (ally && !mon.fainted && !mon.item && ally.item && ally.hasAbility("Symbiosis") && !MEGA_MAP[ally.item]) {
        const it = ally.item;
        ally.item = ""; ally.lastItem = it;
        delete ally.volatiles.choicelock;
        mon.item = it;
        this.add("-activate", ally, "ability: Symbiosis", it, "[of] " + mon.ident);
      }
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
      // (Gen 7's Clanging Scales: a self boost once per move, as `self` is here.)
      if (m.selfBoost && !m.self) m.self = m.selfBoost;
      return m;
    }

    // ---------- Start ----------
    start() {
      if (this.phase !== "init") return;
      // (In the Safari Zone no one comes out of a ball and no Ability stirs.)
      if (this.safari) {
        this.switchIn(this.sides.p1, Math.max(0, this.sides.p1.pokemon.findIndex((p) => !p.fainted)), { deferStart: true, noHazards: true });
        this.switchIn(this.sides.p2, 0, { deferStart: true, noHazards: true });
        this.beginTurn();
        return;
      }
      const mons = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.tag) {
          // Tag team: each trainer leads with their first healthy Pokémon.
          for (const slot of [0, 1]) {
            const i = s.pokemon.findIndex((p) => p.owner === slot && !p.fainted);
            if (i >= 0) mons.push(this.switchIn(s, i, { deferStart: true, noHazards: true, slot }));
          }
          if (!mons.some((m) => m.side === s)) throw new Error(s.id + " has no Pokemon that can battle");
          continue;
        }
        const lead = s.pokemon.findIndex((p) => !p.fainted);
        if (lead < 0) throw new Error(s.id + " has no Pokemon that can battle");
        this.switchIn(s, lead, { deferStart: true, noHazards: true });
        mons.push(s.active);
        // Doubles: the next healthy Pokémon leads in slot b (a team with only
        // one that can fight leaves slot b empty).
        const second = this.doubles ? s.pokemon.findIndex((p, i) => i > lead && !p.fainted) : -1;
        if (second >= 0) mons.push(this.switchIn(s, second, { deferStart: true, noHazards: true, slot: 1 }));
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
      const slot = o.slot || 0;
      const old = side.actives[slot];
      let carried = null;
      if (side.tag && old && !old.fainted && old.isActive && !o.drag) this.add("-withdraw", old, side.trainers[old.owner]);
      if (old && !old.fainted && old.isActive) {
        this.endSkyDrop(old);
        this.undynamax(old, true);
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
      side.actives[slot] = mon;
      mon.slot = slot;
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
      if (side.tag) this.add(o.drag ? "drag" : "switch", mon, mon.species + ", L" + mon.level, this.hpStr(mon), this.expProgress(mon), mon.teamIndex, side.trainers[mon.owner]);
      else this.add(o.drag ? "drag" : "switch", mon, mon.species + ", L" + mon.level, this.hpStr(mon), this.expProgress(mon), mon.teamIndex);
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
      // (Gen 7: Silvally with a Memory takes its type's form; Gen 8's Origin
      // Dialga and Palkia with the Adamant Crystal and Lustrous Globe.)
      const memory = /^([a-z]+)-memory$/.exec(mon.item);
      if (memory && /^Silvally/.test(mon.species) && !mon.transformed) {
        const forme = "Silvally-" + memory[1].charAt(0).toUpperCase() + memory[1].slice(1);
        if (mon.species !== forme && window.DEX[forme]) this.abilityForme(mon, forme);
      }
      const origin = { Dialga: "adamant-crystal", Palkia: "lustrous-globe" }[mon.baseSpecies];
      if (origin && mon.item === origin && mon.species === mon.baseSpecies && !mon.transformed) this.abilityForme(mon, mon.baseSpecies + "-Origin");
      // (Gen 8: Zacian with the Rusted Sword, Zamazenta with the Rusted Shield.)
      // (Its Iron Head is Behemoth Blade / Bash in battle, as a Mimic'd move is.)
      const crown = { Zacian: ["rusted-sword", "Behemoth Blade"], Zamazenta: ["rusted-shield", "Behemoth Bash"] }[mon.baseSpecies];
      if (crown && mon.item === crown[0] && !mon.transformed) {
        if (mon.species !== mon.baseSpecies + "-Crowned") this.formeChange(mon, mon.baseSpecies + "-Crowned");
        const i = mon.moves.findIndex((m) => m.name === "Iron Head");
        if (i >= 0) mon.moves[i] = Object.assign({}, mon.moves[i], { name: crown[1], id: toID(crown[1]), mimicOf: mon.moves[i] });
      }
      if (mon.ability === "Imposter" && !mon.transformed) {
        // (Doubles: the foe standing opposite.)
        const foe = this.doubles ? mon.side.foe.actives[1 - mon.slot] : mon.side.foe.active;
        if (foe && !foe.fainted) this.transformInto(mon, foe);
      }
      this.runEvent("onStart", mon, { only: "ability" });
      this.runEvent("onSwitchIn", mon, { only: "ability" });
    }

    // Doubles: the two Pokémon of a side trade slots (Ally Switch).
    swapSlots(side, from) {
      const [a, b] = side.actives;
      const ids = [a.ident, b.ident];
      side.actives = [b, a];
      a.slot = 1; b.slot = 0;
      // ["swap", old identity, new slot], for each of the two
      this.add("swap", ids[0], 1, "[from] " + from);
      this.add("swap", ids[1], 0, "[from] " + from);
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
      // (G-Max Steelsurge: the same, Steel type.)
      if (s.gmaxsteelsurge && !mon.fainted) {
        const eff = window.Damage.typeEffectiveness("Steel", mon.types);
        this.damage(mon, (mon.maxhp * eff) / 8, null, E("SideCondition", "gmaxsteelsurge", "G-Max Steelsurge"));
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

    // The battle formes an Ability brings about (Aegislash's Stance Change;
    // Gen 7's Shields Down, Schooling, Disguise, Battle Bond, Power Construct;
    // Gen 8's): new stats and types, the same Ability. A forme with more HP
    // (Zygarde Complete) adds the difference. `silent`: no message (Aegislash
    // going back to Shield Forme as it leaves the field).
    abilityForme(mon, forme, text, silent) {
      const d = window.DEX[forme];
      if (!d || mon.species === forme || mon.transformed || mon.fainted) return false;
      const stats = window.Stats.calcAllStats(forme, { level: mon.level, nature: mon.nature, ivs: mon.ivs, evs: mon.evs });
      mon.species = forme;
      mon.stats = stats;
      mon.types = d.types.slice(); mon.baseTypes = d.types.slice();
      mon.weight = d.weight;
      if (stats.hp > mon.maxhp) { mon.hp += stats.hp - mon.maxhp; mon.maxhp = mon.baseMaxhp = stats.hp; }
      mon.formeChanged = true;
      if (silent) return true;
      this.add("detailschange", mon, forme);
      if (text) this.add("-formechange", mon, text);
      return true;
    }

    // The Mega Evolution a held Mega Stone allows, if it's that species'
    // stone: Zygardite only from the Complete Forme (Legends: Z-A).
    megaForme(mon) {
      const forme = MEGA_MAP[mon.item];
      if (!forme || mon.transformed) return null;
      if (forme === "Zygarde-Mega") return mon.species === "Zygarde-Complete" ? forme : null;
      const base = forme.replace(/-Mega(-[XY])?$/, "");
      return mon.baseSpecies === base || mon.species === base ? forme : null;
    }

    // ---------- Z-Moves and Ultra Burst (Gen 7) ----------
    // The Z-Move each of `slots` would be with mon's Z-Crystal, or null.
    zMovesFor(mon, slots) {
      if (mon.side.zUsed || !window.Z_MOVES || !window.Z_MOVES.crystals[mon.item]) return null;
      const out = slots.map((s) => {
        const z = s.disabled ? null : this.zMoveFor(mon, this.getActiveMove(s.name));
        return z ? (z.zStatus ? "Z-" + s.name : z.name) : null;
      });
      return out.some(Boolean) ? out : null;
    }
    // The active Z-Move `base` becomes, with mon's Z-Crystal (null: none).
    zMoveFor(mon, base) {
      const Z = window.Z_MOVES, c = Z && Z.crystals[mon.item];
      if (!c) return null;
      if (c.move) {
        if (base.name !== c.from || !c.users.includes(mon.species)) return null;
        const z = this.getActiveMove(c.move);
        z.ppFrom = base.id;
        return z;
      }
      if (base.type !== c.type || base.id === "struggle") return null;
      if (base.category === "Status") {
        base.isZ = true; base.zStatus = Z.status[base.name] || {};
        return base;
      }
      const z = this.getActiveMove(Z.byType[c.type]);
      z.category = base.category; z.zPower = Z.power[base.name] || 100; z.zFrom = base.name; z.ppFrom = base.id;
      return z;
    }
    // A status move's Z-Power bonus, before the move.
    zStatusBonus(mon, z) {
      const eff = E("Move", "zpower", "Z-Power");
      if (z.boost) this.boost(mon, z.boost, mon, eff);
      else if (z.effect === "clearnegativeboost") {
        let any = false;
        for (const k of Object.keys(mon.boosts)) if (mon.boosts[k] < 0) { mon.boosts[k] = 0; any = true; }
        if (any) this.add("-clearnegativeboost", mon, "[zeffect]");
      } else if (z.effect === "crit2") this.addVolatile(mon, "focusenergy", mon, eff);
      else if (z.effect === "heal") this.heal(mon, mon.maxhp, mon, eff);
      else if (z.effect === "curse") { if (mon.hasType("Ghost")) this.heal(mon, mon.maxhp, mon, eff); else this.boost(mon, { atk: 1 }, mon, eff); }
      else if (z.effect === "redirect" && this.doubles) mon.volatiles.followme = { id: "followme" };
      else if (z.effect === "healreplacement") mon.side.healingWish = { lunar: false, name: "Z-Power" };
    }
    canUltraBurst(mon) {
      return !mon.side.ultraUsed && mon.item === "ultranecrozium-z" && !mon.transformed
        && (mon.species === "Necrozma-Dusk-Mane" || mon.species === "Necrozma-Dawn-Wings");
    }

    // ---------- Dynamax and Gigantamax (Gen 8) ----------
    canDynamax(mon) {
      return mon.side.dynamaxAllowed && !mon.side.dynamaxUsed && !mon.dynamaxed && !mon.mega
        && !/^(Zacian|Zamazenta)/.test(mon.species) && !!window.MAX_MOVES;
    }
    // The Max Move (or G-Max Move, or Max Guard) each of `slots` becomes.
    maxMovesFor(mon, slots) {
      return slots.map((s) => this.maxMoveFor(mon, this.getActiveMove(s.name)).name);
    }
    maxMoveFor(mon, base) {
      const M = window.MAX_MOVES;
      if (base.category === "Status") { const g = this.getActiveMove("Max Guard"); g.ppFrom = base.id; return g; }
      const gspecies = mon.species.replace(/-Gmax$/, "");
      const g = (mon.gmax || /-Gmax$/.test(mon.species)) && M.gmax[gspecies];
      const name = g && window.MOVES[g].type === base.type ? g : M.byType[base.type] || M.byType.Normal;
      const m = this.getActiveMove(name);
      m.category = base.category; m.zPower = m.power || M.power[base.name] || 100; m.ppFrom = base.id; m.maxFrom = base.name;
      // (Urshifu's G-Max One Blow and Rapid Flow get through any protection.)
      if (m.id === "gmaxoneblow" || m.id === "gmaxrapidflow") m.breaksProtect = true;
      return m;
    }
    // Dynamax: three turns, its HP ×1.5 + 5% a Dynamax Level (×2 at 10);
    // with the G-Max Factor, its Gigantamax forme. (Eternatus: Eternamax,
    // with that forme's HP instead.)
    dynamax(mon) {
      mon.side.dynamaxUsed = true;
      const snap = { species: mon.species, stats: mon.stats, types: mon.types, baseTypes: mon.baseTypes, weight: mon.weight,
        maxhp: mon.maxhp, baseMaxhp: mon.baseMaxhp };
      mon.dynamaxed = { turns: 3, snap };
      const eternamax = /^Eternatus/.test(mon.species);
      const gmax = !eternamax && mon.gmax && window.DEX[mon.species + "-Gmax"] ? mon.species + "-Gmax" : null;
      this.add("-dynamax", mon, eternamax ? "Eternamax" : gmax ? "Gmax" : "");
      if (eternamax) this.abilityForme(mon, "Eternatus-Eternamax");
      else {
        if (gmax) this.abilityForme(mon, gmax);
        const ratio = 1.5 + 0.05 * Math.max(0, Math.min(10, mon.dynamaxLevel));
        mon.maxhp = mon.baseMaxhp = Math.floor(snap.maxhp * ratio);
        mon.hp = Math.floor(mon.hp * ratio);
      }
      this.add("-dynamaxhp", mon, this.hpStr(mon));
    }
    undynamax(mon, silent) {
      const d = mon.dynamaxed;
      if (!d) return;
      mon.dynamaxed = null;
      const cur = mon.maxhp, changed = mon.species !== d.snap.species;
      Object.assign(mon, d.snap);
      if (mon.hp > 0) mon.hp = Math.max(1, Math.min(mon.maxhp, Math.ceil((mon.hp * d.snap.maxhp) / cur)));
      if (silent) return;
      if (changed) this.add("detailschange", mon, mon.species);
      this.add("-dynamaxend", mon, this.hpStr(mon));
    }

    // ---------- Requests / choices ----------
    // SELECT on the move menu: two of the active Pokémon's moves trade places
    // (and their PP; the party's order follows, as in FireRed).
    swapMoves(sideId, a, b, slot) {
      const mon = this.sides[sideId].actives[slot || 0], m = mon && mon.moves;
      if (!m) return;
      if (!m[a] || !m[b] || a === b) return;
      [m[a], m[b]] = [m[b], m[a]];
    }

    getMoveSlots(mon) {
      const slots = mon.moves.map((m, i) => {
        const data = window.MOVES[m.name];
        let disabled = m.pp <= 0;
        if (!disabled && mon.volatiles.disable && mon.volatiles.disable.moveId === m.id) disabled = true;
        if (!disabled && mon.volatiles.taunt && data.cat === "Status") disabled = true;
        if (!disabled && mon.volatiles.throatchop && data.flags && data.flags.sound) disabled = true;
        if (!disabled && mon.volatiles.torment && mon.lastMove === m.id) disabled = true;
        if (!disabled && mon.volatiles.encore && mon.volatiles.encore.moveId && mon.volatiles.encore.moveId !== m.id) disabled = true;
        if (!disabled && (mon.item.indexOf("choice-") === 0 || mon.hasAbility("Gorilla Tactics")) && mon.volatiles.choicelock && mon.volatiles.choicelock.moveId !== m.id && !mon.dynamaxed) disabled = true;
        if (!disabled && mon.item === "assault-vest" && data.cat === "Status") disabled = true;
        return { index: i, id: m.id, name: m.name, pp: m.pp, maxpp: m.maxpp, disabled, type: data.type, category: data.cat, power: data.power, target: data.target };
      });
      return slots;
    }

    forcedAction(mon) {
      if (mon.volatiles.mustrecharge) return { recharge: true };
      if (mon.volatiles.twoturnmove) {
        const tt = mon.volatiles.twoturnmove;
        return tt.targetLoc ? { move: tt.move, secondTurn: true, targetLoc: tt.targetLoc } : { move: tt.move, secondTurn: true };
      }
      if (mon.volatiles.lockedmove) return { move: mon.volatiles.lockedmove.moveName, locked: true };
      if (mon.volatiles.bide) return { move: "Bide", secondTurn: true, locked: true };
      return null;
    }

    isTrapped(mon) {
      if (mon.hasType("Ghost")) return false;
      if (mon.item === "shed-shell") return false;
      mon.trapped = false;
      if (this.doubles) {
        for (const foe of this.foesOf(mon)) this.callAbility(foe, "onFoeTrapPokemon", { source: foe }, mon);
      } else {
        const foe = mon.side.foe.active;
        if (foe && !foe.fainted) this.callAbility(foe, "onFoeTrapPokemon", { source: foe }, mon);
      }
      if (mon.volatiles.ingrain || mon.volatiles.skydrop) mon.trapped = true;
      const sh = mon.volatiles.shackled || mon.volatiles.octolock;
      if (sh && sh.source && sh.source.isActive && !sh.source.fainted) mon.trapped = true;
      if (mon.volatiles.noretreat) mon.trapped = true;
      const pt = mon.volatiles.partiallytrapped;
      if (pt && pt.source && pt.source.isActive && !pt.source.fainted) mon.trapped = true;
      return mon.trapped;
    }

    getRequest(sideId) {
      if (this.doubles) return this.controller(sideId) ? this.getRequestDoubles(sideId) : null;
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
      if (this.safari) { base.safari = { balls: this.safari.balls }; base.switches = []; return base; }
      const forced = this.forcedAction(mon);
      const slots = this.getMoveSlots(mon);
      const usable = slots.filter((s) => !s.disabled);
      base.active = {
        species: mon.species, name: mon.name, hp: mon.hp, maxhp: mon.maxhp, status: mon.status, item: mon.item,
        ability: mon.ability, boosts: Object.assign({}, mon.boosts),
        moves: slots, struggle: !forced && !usable.length,
        canMega: !forced && !side.megaUsed && !mon.mega && !!this.megaForme(mon),
        zMoves: forced ? null : this.zMovesFor(mon, slots),
        canUltraBurst: !forced && this.canUltraBurst(mon),
        canDynamax: !forced && this.canDynamax(mon), dynamaxed: !!mon.dynamaxed,
        maxMoves: !forced && (mon.dynamaxed || this.canDynamax(mon)) ? this.maxMovesFor(mon, slots) : null,
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
      if (this.doubles && !this.ended) return this.chooseDoubles(sideId, choice);
      const side = this.sides[sideId];
      if (!side) return { ok: false, error: "No such side" };
      if (this.ended) return { ok: false, error: "Battle is over" };
      const req = this.getRequest(sideId);
      if (req.phase === "wait") return { ok: false, error: "Not waiting for a choice from " + sideId };
      if (this.safari) {
        if (!choice || !["ball", "bait", "rock", "run"].includes(choice.type)) return { ok: false, error: "Invalid choice" };
        if (choice.type === "ball" && this.safari.balls <= 0) return { ok: false, error: "You have no Safari Balls left!" };
        side.choice = { type: choice.type };
      } else if (req.phase === "switch") {
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
          if (choice.ultra) {
            if (!req.active.canUltraBurst) return { ok: false, error: "Cannot Ultra Burst" };
            side.choice.ultra = true;
          }
          if (choice.zmove) {
            if (!req.active.zMoves || !req.active.zMoves[side.choice.slot]) return { ok: false, error: "Cannot use a Z-Move" };
            side.choice.zmove = true;
          }
          if (choice.dynamax) {
            if (!req.active.canDynamax || choice.zmove || choice.mega) return { ok: false, error: "Cannot Dynamax" };
            side.choice.dynamax = true;
          }
        } else return { ok: false, error: "Invalid choice" };
      }
      this.maybeCommit();
      return { ok: true };
    }

    // A side that has no real decision (forced) is filled in automatically.
    autoFillForced() {
      if (this.phase !== "move") return;
      // The wild Pokémon in the Safari Zone makes up its mind as the turn
      // starts (FireRed's AI_Safari): run, or watch you.
      if (this.safari) { this.sides.p2.choice = { type: window.Safari.flees(this.safari, () => this.random()) ? "flee" : "watch" }; return; }
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.choice) continue;
        if (this.doubles) {
          // Slots with no real decision (recharging, mid-Fly, ...) choose themselves.
          for (const i of this.neededSlots(s)) {
            const f = s.partial[i] === undefined && this.forcedAction(s.actives[i]);
            if (f) s.partial[i] = this.forcedChoice(s.actives[i], f);
          }
          this.completeSide(s);
          continue;
        }
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
      if (this.doubles) return this.randomChoiceDoubles(sideId);
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
      if (c.type === "move" && req.active.canUltraBurst) c.ultra = true;
      if (c.type === "move" && req.active.zMoves && req.active.zMoves[c.move] && this.random() < 0.5) c.zmove = true;
      if (c.type === "move" && !c.zmove && !c.mega && req.active.canDynamax && this.random() < 0.3) c.dynamax = true;
      return c;
    }

    // ---------- Doubles: requests and choices ----------
    // Target locations a doubles move may be aimed at (see the header comment):
    // 1/2 = the foe in slot a/b, -1/-2 = your own slot a/b. Empty for moves
    // that need no chosen target (spread, self, side, field, random).
    targetLocs(mon, moveTarget) {
      if (!CHOSEN_TARGETS.has(moveTarget)) return [];
      const foes = this.foesOf(mon).map((f) => f.slot + 1);
      const ally = this.allyOf(mon);
      const allyLoc = ally ? [-(ally.slot + 1)] : [];
      switch (moveTarget) {
        case "adjacentFoe": return foes;
        case "adjacentAlly": return allyLoc;
        case "adjacentAllyOrSelf": return [-(mon.slot + 1)].concat(allyLoc);
        default: return foes.concat(allyLoc);
      }
    }

    forcedChoice(mon, f) {
      return f.recharge ? { type: "recharge" } : { type: "move", forced: f, targetLoc: f.targetLoc };
    }

    // Checks a bag item choice; returns an error message or null.
    itemError(side, choice) {
      const target = side.pokemon[choice.target];
      if (!target || !window.ItemUse || !window.ItemUse.effect(choice.item)) return "You can't use that here.";
      if (!window.ItemUse.canUse(this.itemView(target), choice.item, { inBattle: true, move: choice.move })) return "It won't have any effect.";
      return null;
    }

    // A doubles controller: "p1"/"p2" (the side's trainer: both slots, or
    // only slot a when the side is a tag team) or "p1b"/"p2b" (a tag
    // partner: slot b). Returns { side, slots } or null.
    controller(id) {
      const side = this.sides[String(id).slice(0, 2)];
      if (!side) return null;
      if (id.length > 2) return id.slice(2) === "b" && side.tag ? { side, slots: [1] } : null;
      return { side, slots: side.tag ? [0] : side.actives.map((m, i) => i) };
    }

    // Doubles: the slots of a side that need a choice in the current phase.
    neededSlots(side) {
      if (this.phase === "switch") return this.switchSides.includes(side.id) ? (side.switchSlots || []).slice() : [];
      if (this.phase !== "move") return [];
      return side.actives.map((m, i) => (m && !m.fainted ? i : -1)).filter((i) => i >= 0);
    }

    // Doubles: once every needed slot has a choice, the side has chosen.
    // (Replacements: once switchCount slots have one, the rest stay empty.)
    completeSide(side) {
      if (side.choice) return;
      const need = this.neededSlots(side);
      if (!need.length) return;
      if (this.phase === "switch") {
        if (need.filter((i) => side.partial[i]).length < this.switchCountOf(side)) return;
      } else if (!need.every((i) => side.partial[i] !== undefined)) return;
      side.choice = side.actives.map((m, i) => (need.includes(i) ? side.partial[i] || null : null));
      side.partial = [];
    }
    switchCountOf(side) {
      const n = (side.switchSlots || []).length;
      return side.switchCount != null ? Math.min(side.switchCount, n) : n;
    }

    megaUsedFor(side, mon) { return side.tag ? !!side.megaUsedBy[mon.owner] : side.megaUsed; }

    getRequestDoubles(id) {
      const ctl = this.controller(id);
      const side = ctl.side;
      const base = { phase: "wait", format: "doubles", turn: this.turn, ended: this.ended, winner: this.winner, slots: ctl.slots.slice() };
      if (side.tag) base.trainer = side.trainers[ctl.slots[0]];
      if (this.ended) return Object.assign(base, { phase: "ended" });
      const mine = (p) => !side.tag || p.owner === ctl.slots[0];
      base.team = side.pokemon.map((p, i) => ({
        index: i, species: p.species, name: p.name, level: p.level, hp: p.hp, maxhp: p.maxhp, status: p.status,
        fainted: p.fainted, active: p.isActive && side.actives.includes(p), slot: p.isActive ? side.actives.indexOf(p) : -1,
        item: p.item, gender: p.gender, owner: p.owner, mine: mine(p)
      }));
      const partial = side.partial || [];
      const need = this.neededSlots(side).filter((i) => ctl.slots.includes(i));
      let open = side.choice ? [] : need.filter((i) => partial[i] === undefined);
      // Replacements: fewer bench Pokémon than fainted slots leaves
      // `switchCount` to send in; `open` names the default slots (slot a
      // first) and forceSwitch every slot that may take one.
      let cands = open, count = open.length;
      if (this.phase === "switch" && open.length) {
        count = Math.max(0, this.switchCountOf(side) - this.neededSlots(side).filter((i) => partial[i]).length);
        open = open.slice(0, count);
      }
      base.chosen = !!side.choice || (need.length > 0 && !open.length);
      base.open = open;   // slots still waiting for this controller's choice
      if (!open.length) return base;
      if (this.phase === "switch") {
        base.phase = "switch";
        base.forceSwitch = side.actives.map((m, i) => cands.includes(i));
        base.switchCount = count;
        // (Per slot in a tag team: each trainer's own party.)
        base.switches = side.bench(ctl.slots[0]);
        return base;
      }
      base.phase = "move";
      base.switches = side.bench(ctl.slots[0]);
      base.actives = side.actives.map((mon, slot) => {
        if (!mon || mon.fainted || !open.includes(slot)) return null;
        const forced = this.forcedAction(mon);
        const moves = this.getMoveSlots(mon);
        for (const m of moves) m.targets = this.targetLocs(mon, m.target);
        const r = {
          slot, teamIndex: mon.teamIndex, species: mon.species, name: mon.name, hp: mon.hp, maxhp: mon.maxhp,
          status: mon.status, item: mon.item, ability: mon.ability, boosts: Object.assign({}, mon.boosts),
          moves, struggle: !forced && !moves.some((m) => !m.disabled),
          canMega: !forced && !this.megaUsedFor(side, mon) && !mon.mega && !!this.megaForme(mon),
          zMoves: forced ? null : this.zMovesFor(mon, moves),
          canUltraBurst: !forced && this.canUltraBurst(mon),
          canDynamax: !forced && this.canDynamax(mon), dynamaxed: !!mon.dynamaxed,
          maxMoves: !forced && (mon.dynamaxed || this.canDynamax(mon)) ? this.maxMovesFor(mon, moves) : null,
          trapped: false, forced, switches: []
        };
        if (forced) return r;
        r.trapped = this.isTrapped(mon);
        r.switches = r.trapped ? [] : side.bench(slot);
        // (A ball only while one wild Pokémon is left, as in Gen 5+.)
        r.canCatch = this.wild && side.id === "p1" && this.foesOf(mon).length === 1;
        r.canRun = this.wild && side.id === "p1" && (!r.trapped || mon.item === "smoke-ball" || mon.hasAbility("Run Away"));
        return r;
      });
      return base;
    }

    chooseDoubles(id, choice) {
      const ctl = this.controller(id);
      if (!ctl) return { ok: false, error: "No such side" };
      const side = ctl.side;
      const req = this.getRequestDoubles(id);
      if (req.phase !== "move" && req.phase !== "switch") return { ok: false, error: "Not waiting for a choice from " + id };
      // An array is indexed by slot; a single choice goes to the first open slot.
      const pick = (slot) => (Array.isArray(choice) ? choice[slot] : slot === req.open[0] ? choice : undefined);
      const partial = side.partial.slice();
      // Bench Pokémon already picked to come in, and a Mega Evolution already
      // chosen this turn (per trainer in a tag team).
      const used = new Set(partial.filter((c) => c && c.type === "switch").map((c) => c.index));
      const megaBy = new Set(partial.map((c, i) => (c && c.mega ? (side.tag ? i : 0) : -1)).filter((x) => x >= 0));
      let ball = partial.some((c) => c && c.type === "ball");
      let any = false;
      // (Replacements: any slot in forceSwitch may take one, `spare` of them
      // may be left out when there are fewer to send in than slots.)
      const slots = req.phase === "switch" ? req.forceSwitch.map((f, i) => (f ? i : -1)).filter((i) => i >= 0) : req.open;
      const spare = req.phase === "switch" ? slots.length - req.switchCount : 0;
      let skipped = 0, picks = 0;
      for (const slot of slots) {
        const c = pick(slot);
        if (c === undefined && !Array.isArray(choice)) continue;
        const err = (e) => ({ ok: false, error: e + " (slot " + slot + ")" });
        if (req.phase === "switch") {
          if (c == null && skipped < spare) { skipped++; continue; }
          if (!c || c.type !== "switch" || !req.switches.includes(c.index) || used.has(c.index) || picks >= req.switchCount) return err("Invalid switch");
          used.add(c.index);
          partial[slot] = { type: "switch", index: c.index };
          any = true;
          picks++;
          continue;
        }
        const a = req.actives[slot], mon = side.actives[slot];
        if (a.forced) { partial[slot] = this.forcedChoice(mon, a.forced); any = true; continue; }
        if (!c) return err("Missing choice");
        if (c.type === "switch") {
          if (!a.switches.includes(c.index) || used.has(c.index)) return err("Invalid switch");
          used.add(c.index);
          partial[slot] = { type: "switch", index: c.index };
        } else if (c.type === "ball") {
          if (!a.canCatch || ball) return err("You can't catch this Pokémon");
          ball = true;
          partial[slot] = { type: "ball", ball: c.ball || "poke-ball" };
        } else if (c.type === "item") {
          const t = side.pokemon[c.target];
          // (Not the partner's Pokémon, nor one lying fainted in a slot.)
          const e = t && ((side.tag && t.owner !== slot) || (t.fainted && side.actives.includes(t))) ? "You can't use that here."
            : this.itemError(side, c);
          if (e) return err(e);
          partial[slot] = { type: "item", item: c.item, target: c.target, move: c.move };
        } else if (c.type === "run") {
          if (!a.canRun) return err("You can't escape!");
          partial[slot] = { type: "run" };
        } else if (c.type === "move") {
          let picked;
          if (a.struggle && (c.move === "Struggle" || c.move === 0 || c.move === "struggle")) {
            picked = { type: "move", moveName: "Struggle", slot: -1 };
          } else {
            const ms = typeof c.move === "number" ? a.moves[c.move] : a.moves.find((x) => x.id === toID(c.move));
            if (!ms) return err("Unknown move");
            if (ms.disabled) return err(ms.name + " is disabled or out of PP");
            picked = { type: "move", moveName: ms.name, slot: ms.index };
            if (c.target != null && c.target !== 0) {
              if (!ms.targets.includes(c.target)) return err("Invalid target " + c.target + " for " + ms.name);
              picked.targetLoc = c.target;
            }
          }
          if (c.mega) {
            const who = side.tag ? slot : 0;
            if (!a.canMega || megaBy.has(who)) return err("Cannot Mega Evolve");
            megaBy.add(who);
            picked.mega = true;
          }
          if (c.ultra) {
            if (!a.canUltraBurst) return err("Cannot Ultra Burst");
            picked.ultra = true;
          }
          if (c.zmove) {
            if (!a.zMoves || !a.zMoves[picked.slot] || partial.some((x, i) => x && x.zmove && i !== slot)) return err("Cannot use a Z-Move");
            picked.zmove = true;
          }
          if (c.dynamax) {
            if (!a.canDynamax || c.zmove || c.mega || partial.some((x, i) => x && x.dynamax && i !== slot)) return err("Cannot Dynamax");
            picked.dynamax = true;
          }
          partial[slot] = picked;
        } else return err("Invalid choice");
        any = true;
      }
      if (!any) return { ok: false, error: "No choice given" };
      side.partial = partial;
      this.completeSide(side);
      this.maybeCommit();
      return { ok: true };
    }

    randomChoiceDoubles(id) {
      const req = this.getRequestDoubles(id);
      const out = [];
      if (req.phase === "switch") {
        const pool = req.switches.slice();
        req.forceSwitch.forEach((f, i) => { if (f && pool.length) out[i] = { type: "switch", index: pool.splice(Math.floor(this.random() * pool.length), 1)[0] }; });
        return out;
      }
      if (req.phase !== "move") return null;
      const side = this.controller(id).side;
      const used = new Set((side.partial || []).filter((c) => c && c.type === "switch").map((c) => c.index));
      let mega = false, zm = false, dm = false;
      req.actives.forEach((a, slot) => {
        if (!a) return;
        if (a.forced) { out[slot] = { type: "move", move: 0 }; return; }
        if (a.struggle) { out[slot] = { type: "move", move: "Struggle" }; return; }
        const opts = [];
        for (const m of a.moves) if (!m.disabled) for (let k = 0; k < 3; k++) opts.push({ type: "move", move: m.index });
        for (const i of a.switches) if (!used.has(i)) opts.push({ type: "switch", index: i });
        const c = Object.assign({}, this.sample(opts));
        if (c.type === "switch") used.add(c.index);
        if (c.type === "move") {
          const locs = a.moves[c.move].targets;
          const foes = locs.filter((l) => l > 0);
          if (locs.length) c.target = this.sample(foes.length ? foes : locs);
          if (a.canMega && !mega && this.random() < 0.7) { c.mega = true; mega = true; }
          if (a.canUltraBurst) c.ultra = true;
          if (a.zMoves && a.zMoves[c.move] && !zm && this.random() < 0.5) { c.zmove = true; zm = true; }
          if (!c.zmove && !c.mega && a.canDynamax && !dm && this.random() < 0.3) { c.dynamax = true; dm = true; }
        }
        out[slot] = c;
      });
      return out;
    }

    // ---------- Turn flow ----------
    beginTurn() {
      this.turn++;
      this.phase = "move";
      this.sides.p1.choice = null; this.sides.p2.choice = null;
      this.sides.p1.partial = []; this.sides.p2.partial = [];
      for (const s of [this.sides.p1, this.sides.p2]) { s.faintedLastTurn = s.faintedThisTurn; s.faintedThisTurn = false; }
      this.add("turn", this.turn);
      this.markParticipants();
      this.autoFillForced();
      this.maybeCommit();
    }

    commitTurn() {
      if (this.safari) return this.safariTurn();
      const actions = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        // (Doubles: one choice per slot, in slot order.)
        const entries = this.doubles ? s.choice.map((c, i) => [c, s.actives[i]]).filter(([c, m]) => c && m && !m.fainted)
          : [[s.choice, s.active]];
        for (const [c, mon] of entries) {
          if (c.type === "run" || c.type === "ball" || c.type === "item") {
            actions.push({ order: 0, type: c.type, ball: c.ball, item: c.item, target: c.target, move: c.move,
              mon, side: s, priority: 0, speed: this.getSpeed(mon) });
          }
          else if (c.type === "switch") actions.push({ order: 1, type: "switch", mon, side: s, index: c.index, priority: 0, speed: this.getSpeed(mon) });
          else if (c.type === "recharge") actions.push({ order: 3, type: "move", mon, side: s, recharge: true, priority: 0, speed: this.getSpeed(mon) });
          else {
            if (c.mega) actions.push({ order: 2, type: "mega", mon, side: s, priority: 0, speed: this.getSpeed(mon) });
            if (c.ultra) actions.push({ order: 2, type: "ultra", mon, side: s, priority: 0, speed: this.getSpeed(mon) });
            if (c.dynamax) actions.push({ order: 2, type: "dynamax", mon, side: s, priority: 0, speed: this.getSpeed(mon) });
            const f = c.forced;
            const name = f ? f.move : c.moveName;
            const mv = this.getActiveMove(name);
            let pri = mv.priority;
            const pr = this.runEvent("onModifyPriority", mon, { relay: pri, args: [mv] });
            if (typeof pr === "number") pri = pr;
            let frac = 0;
            if (mon.item === "quick-claw" && this.randomChance(1, 5)) frac = 1;
            // (Gen 8: Quick Draw, 30% with a damaging move; Grassy Glide on Grassy Terrain.)
            if (mon.hasAbility("Quick Draw") && mv.category !== "Status" && this.randomChance(3, 10)) { frac = 1; mon.quickDraw = true; }
            if (mv.id === "grassyglide" && this.field.terrain === "GrassyTerrain" && this.isGrounded(mon)) pri += 1;
            const act = { order: 3, type: "move", mon, side: s, moveName: name, slot: c.slot, forced: f, priority: pri, frac, speed: this.getSpeed(mon), zmove: !!c.zmove };
            if (this.doubles) act.targetLoc = c.targetLoc;
            actions.push(act);
            if (name && toID(name) === "focuspunch" && !f) { mon.volatiles.focuspunch = { duration: 1 }; this.add("-singleturn", mon, "move: Focus Punch"); }
            if (name && toID(name) === "beakblast" && !f) { mon.volatiles.beakblast = { id: "beakblast", duration: 1 }; this.add("-singleturn", mon, "move: Beak Blast"); }
            if (name && toID(name) === "shelltrap" && !f) { mon.volatiles.shelltrap = { id: "shelltrap", duration: 1 }; this.add("-singleturn", mon, "move: Shell Trap"); }
          }
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
      for (const s of [this.sides.p1, this.sides.p2]) {
        for (const m of s.actives) if (m) { m.moveThisTurn = false; m.usedItemThisTurn = false; m.lastDamage = null; m.statsRaisedThisTurn = false; m.statsLoweredThisTurn = false; }
      }
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
          if (side.bench(p.slot).length) {
            this.phase = "switch";
            this.switchSides = [side.id];
            this.switchCause = { type: "midturn", copy: p.copy };
            side.switchSlots = [p.slot || 0];
            side.switchCount = 1;
            side.choice = null; side.partial = [];
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

    // Doubles: the slots of each side whose Pokémon fainted and can be
    // replaced, and how many replacements there are (switchCount). With
    // fewer bench Pokémon than fainted slots, the side picks which slots
    // get them (slot a first by default).
    faintedSlots() {
      const need = [];
      for (const s of [this.sides.p1, this.sides.p2]) {
        const bench = s.bench().length;
        s.switchSlots = [];
        s.actives.forEach((m, i) => {
          // (A tag team's slot is refilled only from that trainer's party.)
          if (m && m.fainted && (s.tag ? s.bench(i).length > 0 : bench > 0)) s.switchSlots.push(i);
        });
        s.switchCount = s.tag ? s.switchSlots.length : Math.min(bench, s.switchSlots.length);
        if (s.switchSlots.length) need.push(s.id);
      }
      return need;
    }

    afterTurn() {
      if (this.doubles) {
        const need = this.faintedSlots();
        if (need.length) {
          this.phase = "switch"; this.switchSides = need; this.switchCause = { type: "faint" };
          this.sides.p1.choice = null; this.sides.p2.choice = null;
          this.sides.p1.partial = []; this.sides.p2.partial = [];
          return;
        }
        return this.beginTurn();
      }
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

    // SHIFT (FireRed's battle style): while only the opponent has a fainted
    // Pokémon to replace, you may switch yours first, for free.
    canShift(sideId) {
      if (this.doubles) return false;
      const side = this.sides[sideId], foe = this.sides[sideId === "p1" ? "p2" : "p1"];
      return this.phase === "switch" && !this.wild && this.switchCause && this.switchCause.type === "faint"
        && this.switchSides.length === 1 && this.switchSides[0] === foe.id
        && !side.active.fainted && side.pokemon.some((m) => !m.fainted && m !== side.active);
    }
    shift(sideId, index) {
      if (!this.canShift(sideId)) return false;
      const side = this.sides[sideId], next = side.pokemon[index];
      if (!next || next.fainted || next === side.active) return false;
      const mon = this.switchIn(side, index, { deferStart: true });
      this.onSwitchInEvents(mon);
      this.runUpdates();
      return true;
    }

    commitSwitches() {
      const cause = this.switchCause;
      const mons = [];
      const order = this.switchSides.map((id) => this.sides[id]);
      for (const s of order) {
        if (this.doubles) {
          const ch = s.choice;
          s.choice = null;
          for (const slot of s.switchSlots) {
            if (!ch[slot]) continue;   // (a slot left empty: fewer replacements than fainted slots)
            mons.push(this.switchIn(s, ch[slot].index, { slot, copy: cause.type === "midturn" && cause.copy, deferStart: true }));
          }
          s.switchSlots = [];
          continue;
        }
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
      if (this.doubles) {
        const need = this.faintedSlots();
        if (need.length) {
          this.phase = "switch"; this.switchSides = need; this.switchCause = { type: "faint" };
          this.sides.p1.partial = []; this.sides.p2.partial = [];
          return;
        }
        return this.beginTurn();
      }
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
      if (this.doubles) {
        // Each p2 Pokémon out now has faced every p1 Pokémon out now.
        for (const foe of this.sides.p2.actives) {
          if (!foe || foe.fainted || !foe.isActive) continue;
          for (const mine of this.sides.p1.actives) {
            if (mine && !mine.fainted && mine.isActive && mine.owner === 0) (foe.expParticipants || (foe.expParticipants = new Set())).add(mine);
          }
        }
        return;
      }
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
      const rest = this.sides.p1.pokemon.filter((m) => !m.fainted && !receivers.includes(m) && m.owner === 0);
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
        this.friendship(mon, "levelUp");
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
        confused: !!(mon.isActive && mon.volatiles.confusion), moves: this.ownMoves(mon), evs: mon.evs, level: mon.level,
        isActive: !!mon.isActive, boosts: mon.boosts,
        effects: { focusenergy: !!mon.volatiles.focusenergy, mist: !!mon.side.conditions.mist } };
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
      if (r.boost) this.boost(mon, { [r.boost]: 1 }, mon, null);
      if (r.battleEffect === "focusenergy") this.addVolatile(mon, "focusenergy", mon);
      if (r.battleEffect === "mist") this.addSideCondition(mon.side, "mist", mon);
      if (r.friendship) this.friendship(mon, r.friendship);
    }

    // ---------- Wild battles ----------
    // Escape chance: always if faster, otherwise (speed x 128 / foe speed + 30 x attempts) / 256.
    tryRun(mon) {
      if (mon.fainted) return;
      this.runAttempts++;
      const foe = this.doubles ? this.foesOf(mon)[0] : mon.side.foe.active;
      let escaped = this.ghost || mon.item === "smoke-ball" || mon.hasAbility("Run Away") || !foe || foe.fainted;
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
      const target = this.doubles ? this.foesOf(mon)[0] : mon.side.foe.active;
      if (!target || target.fainted) return;
      if (this.ghost || this.noCatch) { this.add("-ghostdodge", mon.side.id, ball); return; }
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

    // A turn in the Safari Zone: your throw (or running away), then the wild
    // Pokémon's turn: it runs, or it watches (angry, eating, or carefully).
    safariTurn() {
      const s = this.safari, me = this.sides.p1, foe = this.sides.p2.active, rng = () => this.random();
      const c = me.choice;
      this.phase = "running";
      const end = () => { this.ended = true; this.phase = "ended"; this.winner = null; };
      if (c.type === "run") {
        this.add("-run", me.active);
        this.escaped = true;
        return end();
      }
      if (c.type === "ball") {
        s.balls--;
        const r = window.Safari.attempt(s, { hp: foe.hp, maxhp: foe.maxhp, status: foe.status }, rng);
        // [side, ball, target, shakes (0-3), "caught"|"", balls left]
        this.add("-ball", "p1", "safari-ball", foe, Math.min(3, r.shakes), r.caught ? "caught" : "", s.balls);
        if (r.caught) {
          this.add("caught", foe, "safari-ball");
          this.caught = foe;
          end();
          this.winner = "p1";
          return;
        }
        if (s.balls <= 0) {
          this.add("-safariout");
          this.safariOut = true;
          return end();
        }
      } else if (c.type === "bait") {
        window.Safari.throwBait(s, rng);
        this.add("-safaribait", foe);
      } else if (c.type === "rock") {
        window.Safari.throwRock(s, rng);
        this.add("-safarirock", foe);
      }
      if (this.sides.p2.choice && this.sides.p2.choice.type === "flee") {
        this.add("-safarifled", foe);
        this.fled = true;
        return end();
      }
      this.add("-safariwatch", foe, window.Safari.watch(s));
      this.beginTurn();
    }

    // ---------- Actions ----------
    runAction(a) {
      switch (a.type) {
        case "switch": {
          if (this.doubles) {
            const next = a.side.pokemon[a.index];
            if (a.mon.fainted || a.side.actives[a.mon.slot] !== a.mon || next.fainted || a.side.actives.includes(next)) return;
            this.runPursuit(a.mon);
            if (a.mon.fainted || this.ended) return;
            this.switchIn(a.side, a.index, { slot: a.mon.slot });
            break;
          }
          if (a.mon.fainted || a.side.active !== a.mon) return;
          this.switchIn(a.side, a.index);
          break;
        }
        case "mega": {
          if (a.mon.fainted || this.megaUsedFor(a.side, a.mon)) return;
          const forme = this.megaForme(a.mon);
          if (!forme) return;
          if (a.side.tag) a.side.megaUsedBy[a.mon.owner] = true;
          else a.side.megaUsed = true;
          this.add("-mega", a.mon, a.mon.species, a.mon.item);
          this.formeChange(a.mon, forme);
          this.runEvent("onStart", a.mon, { only: "ability" });
          this.runEvent("onSwitchIn", a.mon, { only: "ability" });
          break;
        }
        case "ultra": {
          // Ultra Burst (Ultra Sun and Moon): Dusk Mane or Dawn Wings Necrozma
          // holding Ultranecrozium Z, once a battle.
          if (a.mon.fainted || !this.canUltraBurst(a.mon)) return;
          a.side.ultraUsed = true;
          this.add("-burst", a.mon, "Necrozma-Ultra", a.mon.item);
          this.formeChange(a.mon, "Necrozma-Ultra");
          this.runEvent("onStart", a.mon, { only: "ability" });
          break;
        }
        case "dynamax": if (!a.mon.fainted && this.canDynamax(a.mon)) this.dynamax(a.mon); break;
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
      if (mon.fainted || !mon.isActive || mon.side.actives[mon.slot] !== mon) return;
      if (this.ghost) {
        if (mon.side.id === "p1") this.add("cant", mon, "scared");
        else this.add("-ghostgetout", mon);
        return;
      }
      if (a.recharge) {
        this.add("cant", mon, "recharge");
        mon.removeVolatile("mustrecharge");
        return;
      }
      // (Carried off by a foe's Sky Drop: it can't move.)
      if (mon.volatiles.skydrop) {
        delete mon.volatiles.twoturnmove; delete mon.volatiles.lockedmove;
        return;
      }
      let move = this.getActiveMove(a.moveName);
      // A Z-Move (Sun and Moon): the move becomes its Z-Move (a status move
      // gets its Z-Power bonus first), once a battle.
      if (a.zmove && !mon.side.zUsed) {
        const z = this.zMoveFor(mon, move);
        if (z) {
          mon.side.zUsed = true;
          this.add("-zpower", mon);
          if (z.zStatus) this.zStatusBonus(mon, z.zStatus);
          move = z;
        }
      }
      // Dynamaxed, every move is a Max Move (a status move Max Guard).
      if (mon.dynamaxed && move.id !== "struggle") move = this.maxMoveFor(mon, move);
      if (move.id === "focuspunch" && mon.volatiles.focuspunch && mon.volatiles.focuspunch.lostFocus) {
        this.add("cant", mon, "Focus Punch", "Focus Punch");
        return;
      }
      const ok = this.runEvent("onBeforeMove", mon, { relay: move, move });
      if (ok === false) {
        this.endSkyDrop(mon);
        delete mon.volatiles.twoturnmove; delete mon.volatiles.lockedmove;
        return;
      }
      const o = { slot: a.slot, forced: a.forced, secondTurn: a.forced && a.forced.secondTurn };
      // (Sky Drop's second turn: it drops the Pokémon it carried.)
      const tt = mon.volatiles.twoturnmove;
      if (o.secondTurn && tt && tt.skyDrop) o.target = tt.skyDrop;
      if (this.doubles) {
        o.targetLoc = a.targetLoc;
        if (a.pursuitTarget) { o.target = a.pursuitTarget; o.pursuitSwitch = true; }
      }
      this.execMove(mon, move, o);
    }

    // Doubles: a foe's Pursuit aimed at a Pokémon about to switch out hits it
    // first, at double power.
    runPursuit(mon) {
      for (const q of this.queue.slice()) {
        if (q.type !== "move" || q.recharge || q.forced || toID(q.moveName) !== "pursuit") continue;
        if (q.mon.fainted || !q.mon.isActive || q.mon.side === mon.side) continue;
        if (q.targetLoc && this.atLoc(q.mon, q.targetLoc) !== mon) continue;
        if (!q.targetLoc && this.foesOf(q.mon).length > 1) continue;
        this.queue.splice(this.queue.indexOf(q), 1);
        q.pursuitTarget = mon;
        this.runMoveAction(q);
        this.runUpdates();
        if (mon.fainted || this.ended) return;
      }
    }

    // ---------- Move execution ----------
    deductPP(user, move, target) {
      if (move.id === "struggle") return;
      const slot = user.moves.find((m) => m.id === (move.ppFrom || move.id));
      if (!slot) return;
      let amount = 1;
      if (Array.isArray(target)) {
        // Doubles: one more for each Pressure foe the move is aimed at (every
        // foe for moves that affect their side or the whole field).
        const wide = move.flags.mustpressure || move.target === "all" || move.target === "foeSide";
        for (const t of wide ? this.foesOf(user) : target.filter((m) => m.side !== user.side)) {
          const extra = this.callAbility(t, "onDeductPP", { source: user, target: t });
          if (typeof extra === "number") amount += extra;
        }
        slot.pp = Math.max(0, slot.pp - amount);
        return;
      }
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
      // Gen 7: Revelation Dance and Multi-Attack take the user's (first)
      // type; Plasma Fists' ions turn Normal moves Electric for the turn.
      if ((move.id === "revelationdance" || (move.id === "multiattack" && /^Silvally/.test(user.species))) && user.types[0] && user.types[0] !== "???") {
        move.type = user.types[0]; move.typeOverride = true;
      }
      if (this.field.pseudo.iondeluge && move.type === "Normal") { move.type = "Electric"; move.typeOverride = true; }
      // Gen 8: Terrain Pulse takes the terrain's type (on the ground); Aura
      // Wheel is Dark in Morpeko's Hangry Mode.
      const terrainType = { ElectricTerrain: "Electric", GrassyTerrain: "Grass", MistyTerrain: "Fairy", PsychicTerrain: "Psychic" }[this.field.terrain];
      if (move.id === "terrainpulse" && terrainType && this.isGrounded(user)) { move.type = terrainType; move.typeOverride = true; }
      if (move.id === "aurawheel" && user.species === "Morpeko-Hangry") { move.type = "Dark"; move.typeOverride = true; }
      let target, targets = null;
      // (Gen 8: Expanding Force hits both foes on Psychic Terrain.)
      if (move.id === "expandingforce" && this.field.terrain === "PsychicTerrain" && this.isGrounded(user)) move.target = "allAdjacentFoes";
      if (this.doubles) {
        targets = this.getMoveTargets(user, move, o);
        target = targets[0] || null;
        // (Where it aimed, for Instruct.)
        if (target && target !== user && CHOSEN_TARGETS.has(move.target)) user.lastTargetLoc = this.locOf(target, user);
      } else {
        const selfTarget = ["self", "allySide", "allyTeam", "adjacentAllyOrSelf", "all", "foeSide"].includes(move.target);
        target = o.target || (selfTarget && move.target !== "foeSide" ? user : foe);
        if (move.target === "foeSide" || move.target === "all") target = foe;
      }

      if (!o.secondTurn && !o.bounced) {
        this.deductPP(user, move, this.doubles ? targets : foe);
        user.moveUses[move.name] = (user.moveUses[move.name] || 0) + 1;
      }
      if (this.doubles && targets.length > 1) this.add("move", user, move.name, target, "[spread] " + targets.map((t) => t.ident).join(","));
      else this.add("move", user, move.name, target || user);
      if (this._redirectedBy) {
        this.add("-activate", this._redirectedBy[0], "ability: " + this._redirectedBy[1]);
        this._redirectedBy = null;
      }
      user.lastMove = move.id;
      user.moveThisTurn = true;
      if ((user.item.indexOf("choice-") === 0 || user.hasAbility("Gorilla Tactics")) && !o.bounced && move.id !== "struggle" && !user.dynamaxed) {
        user.volatiles.choicelock = { moveId: move.id };
      }
      if (o.slot !== undefined && o.slot >= 0 && user.volatiles.encore && !user.volatiles.encore.moveId) user.volatiles.encore.moveId = move.id;
      if (user.volatiles.disable && !user.volatiles.disable.moveId) user.volatiles.disable.moveId = move.id;

      // Snatch: the foe steals a beneficial self-targeting move before it takes effect
      const snatcher = this.doubles ? this.getActives().find((m) => m !== user && m.volatiles.snatch)
        : foe && !foe.fainted && foe.volatiles.snatch ? foe : null;
      if (move.category === "Status" && move.flags.snatch && !o.snatched && snatcher) {
        this.removeVolatile(snatcher, "snatch");
        this.add("-activate", snatcher, "move: Snatch", "[of] " + user.ident);
        this.execMove(snatcher, this.getActiveMove(move.name), { bounced: true, snatched: true });
        return;
      }

      if (!move.callsMove) this.lastMoveGlobal = move.id;
      if (move.id === "bide") {
        if (!user.volatiles.bide) this.addVolatile(user, "bide", user, E("Move", "bide", "Bide"));
        return;
      }

      // Sky Drop's first turn: it carries the target up (see skyDropLift).
      if (move.id === "skydrop" && !o.secondTurn) { this.skyDropLift(user, target, move); return; }

      // Charging moves
      if (move.flags.charge && !o.secondTurn) {
        const w = this.getWeather();
        const sunSkip = (move.id === "solarbeam" || move.id === "solarblade") && (w === "SunnyDay" || w === "DesolateLand");
        if (sunSkip) { /* fires immediately */ }
        else if (user.item === "power-herb") { this.consumeItem(user); this.add("-enditem", user, "Power Herb"); }
        else {
          this.add("-prepare", user, move.name);
          if (move.id === "meteorbeam") this.boost(user, { spa: 1 }, user, E("Move", "meteorbeam", "Meteor Beam"));
          user.volatiles.twoturnmove = { id: "twoturnmove", move: move.name, invuln: INVULN[move.id] || null };
          // (Doubles: it strikes the same position next turn.)
          if (this.doubles && target && target !== user) user.volatiles.twoturnmove.targetLoc = this.locOf(target, user);
          return;
        }
      }
      if (o.secondTurn) delete user.volatiles.twoturnmove;

      if (this.doubles && !target) { this.add("-notarget", user); return; }
      if (!target || target.fainted) { this.add("-fail", user); return; }

      // Sky Drop's second turn: the target comes down with the blow (Flying
      // types take none, Gen 6; accuracy is checked now, as in Showdown).
      let dropped = null;
      if (move.id === "skydrop" && o.secondTurn) {
        delete target.volatiles.skydrop;
        if (target.hasType("Flying")) { this.add("-immune", target); this.add("-end", target, "Sky Drop"); return; }
        dropped = target;
      }

      // Magnitude rolls its size before anything else (FireRed's
      // magnitudedamagecalculation): 4-10, 5/10/20/30/20/10/5%.
      if (move.id === "magnitude") {
        const r = this.randInt(0, 99);
        this.magnitude = r < 5 ? 4 : r < 15 ? 5 : r < 35 ? 6 : r < 65 ? 7 : r < 85 ? 8 : r < 95 ? 9 : 10;
        this.add("-magnitude", user, this.magnitude);
      }

      let success;
      if (this.doubles && targets.length > 1) {
        // Spread move: each target in turn (0.75x damage each), then the
        // user's once-per-move effects (recoil, Life Orb, self boosts).
        o.spread = targets.length;
        o.deferSelf = { dealt: 0, hit: false };
        success = false;
        for (const t of targets) {
          if (t.fainted || !t.isActive) continue;
          if (this.resolveMove(user, t, move, o)) success = true;
        }
        this.afterSpread(user, move, o.deferSelf);
      } else if (this.doubles && move.smartTarget && this.dartsTargets(user, move, target).length === 2) {
        // Dragon Darts (Gen 8): one hit at each foe when both can be hit.
        o.spread = 1;
        const [t1, t2] = this.dartsTargets(user, move, target);
        move.multihit = 1;
        const s1 = this.resolveMove(user, t1, move, o);
        const s2 = !t2.fainted && t2.isActive && !user.fainted ? this.resolveMove(user, t2, move, o) : false;
        success = s1 || s2;
      } else {
        if (this.doubles) o.spread = 1;
        // (Dragon Darts at a foe it can't hit, with one it can: both hits go there.)
        if (this.doubles && move.smartTarget) {
          const ok = this.dartsTargets(user, move, target);
          if (ok.length === 1) target = ok[0];
        }
        success = this.resolveMove(user, target, move, o);
      }
      if (dropped && !dropped.fainted) this.add("-end", dropped, "Sky Drop");

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
        this.pendingSwitch = { side: user.side, copy: move.selfSwitch === "copyvolatile", slot: user.slot };
      }
      // Mind Blown: the user loses half its max HP, hit or miss.
      if ((move.id === "mindblown" || move.mindBlownRecoil || move.id === "chloroblast") && !user.fainted && !user.hasAbility("Magic Guard")) {
        this.damage(user, Math.ceil(user.maxhp / 2), user, E("Move", move.id, move.name));
      }
      // (For Stomping Tantrum.)
      user.lastMoveFailed = !success;
      if (!user.fainted) this.runEvent("onAfterMove", user, { only: "ability", relay: move, move });
      if (move.flags.dance && !o.danced) this.dancers(user, move);
    }

    // Dancer (Gen 7): each other Pokémon with it copies a dance move just
    // used, at the Pokémon that danced (if a foe) or its own foe.
    dancers(user, move) {
      const any = this.getActives().filter((m) => m !== user && m.hasAbility("Dancer"));
      if (!any.length) return;
      for (const d of any.length > 1 ? this.sortBySpeed(any) : any) {
        if (d === user || d.fainted || !d.hasAbility("Dancer") || d.volatiles.gastroacid || this.ended) continue;
        const o = { bounced: true, danced: true };
        const aimed = !["self", "allySide", "allyTeam", "all", "foeSide", "allAdjacentFoes", "allAdjacent"].includes(move.target);
        if (aimed && user.side !== d.side && !user.fainted) {
          if (this.doubles) o.targetLoc = this.locOf(user, d); else o.target = user;
        }
        this.add("-activate", d, "ability: Dancer");
        this.execMove(d, this.getActiveMove(move.name), o);
      }
    }

    // Dragon Darts: the foes it can hit, its chosen target first (not one
    // that's fainted, out of reach, protecting itself or immune to Dragon).
    dartsTargets(user, move, target) {
      const v = (f) => f && !f.fainted && f.isActive && !this.isInvulnerable(f, move)
        && !f.volatiles.protect && !f.volatiles.kingsshield && !f.volatiles.spikyshield && !f.volatiles.banefulbunker && !f.volatiles.obstruct
        && window.Damage.typeEffectiveness(move.type, f.types) > 0;
      const foes = this.foesOf(user);
      const order = target && foes.includes(target) ? [target].concat(foes.filter((f) => f !== target)) : foes;
      return order.filter(v);
    }

    // Doubles: who a move hits, from its target type and the chosen target
    // location (o.targetLoc), after retargeting and redirection.
    getMoveTargets(user, move, o) {
      const t = move.target;
      const foes = this.foesOf(user);
      const ally = this.allyOf(user);
      switch (t) {
        case "self": case "allySide": case "allyTeam": case "all": return [user];
        case "foeSide": {
          // (A reflectable side move bounces off whichever foe has Magic
          // Coat up or Magic Bounce: Stealth Rock, Spikes, ...)
          const bouncer = move.flags.reflectable && !move.hasBounced
            ? foes.find((f) => f.volatiles.magiccoat) || (!move.ignoreAbility && foes.find((f) => f.hasAbility("Magic Bounce"))) : null;
          return [bouncer || foes[0] || user];
        }
        case "adjacentAlly": return ally ? [ally] : [];
        case "adjacentAllyOrSelf": return [o.targetLoc && ally && this.atLoc(user, o.targetLoc) === ally ? ally : user];
        case "allAdjacentFoes": return foes;
        case "allAdjacent": return ally ? foes.concat([ally]) : foes;
        case "scripted": {
          const src = user.lastDamage && user.lastDamage.source;
          if (src && src.isActive && !src.fainted && src.side !== user.side) return [src];
          return foes.length ? [foes.length > 1 ? this.sample(foes) : foes[0]] : [];
        }
        default: break;
      }
      let target = null;
      if (o.target) {
        if (o.target.fainted || !o.target.isActive) return [];
        return [o.target];
      }
      if (t !== "randomNormal" && o.targetLoc) {
        const m = this.atLoc(user, o.targetLoc);
        if (m && m !== user && m.isActive && !m.fainted) target = m;
        // (Aimed at an ally that's gone: FireRed's HandleAction_UseMove turns it
        // on the foe opposite the user, or else the other foe.)
        else if (m && m.side === user.side) target = foes.find((f) => f.slot === user.slot) || foes[0] || null;
      }
      if (!target) target = foes.length > 1 ? this.sample(foes) : foes[0] || null;
      target = this.redirectTarget(user, move, target);
      return target ? [target] : [];
    }

    // Spotlight, then Follow Me / Rage Powder on a foe, then Lightning Rod /
    // Storm Drain on anyone else (not against Mold Breaker), draw
    // single-target moves.
    redirectTarget(user, move, target) {
      if (!target || !REDIRECTABLE.has(move.target) || user.hasAbility(["Stalwart", "Propeller Tail"]) || move.id === "snipeshot") return target;
      const foes = this.foesOf(user);
      const lit = foes.find((f) => f.volatiles.spotlight && !f.volatiles.skydrop);
      if (lit) return lit;
      const powderProof = user.hasType("Grass") || user.hasAbility("Overcoat") || user.item === "safety-goggles";
      for (const f of foes) {
        if (!f.volatiles.skydrop && (f.volatiles.followme || (f.volatiles.ragepowder && !powderProof))) return f;
      }
      const ab = move.type === "Electric" ? "Lightning Rod" : move.type === "Water" ? "Storm Drain" : null;
      if (ab && !move.ignoreAbility && !target.hasAbility(ab)) {
        const rod = this.getActives().find((m) => m !== user && m.hasAbility(ab));
        if (rod) { this._redirectedBy = [rod, ab]; return rod; }
      }
      return target;
    }

    // Doubles: the once-per-move effects of a spread move on its user.
    afterSpread(user, move, d) {
      if (user.fainted) return;
      const moveEffect = Object.assign(E("Move", move.id, move.name), { ignoreAbility: move.ignoreAbility, status: move.status });
      if (move.recoil && d.dealt > 0) {
        user.recoilTaken = (user.recoilTaken || 0) + this.damage(user, Math.max(1, Math.round((d.dealt * move.recoil[0]) / move.recoil[1])), user, E("Recoil", "recoil", "Recoil"));
      }
      if (!d.hit || user.fainted) return;
      if (move.self) {
        if (move.self.boosts && !user.hasAbility("Sheer Force")) this.boost(user, move.self.boosts, user, moveEffect);
        if (move.self.volatileStatus === "mustrecharge") this.addVolatile(user, "mustrecharge", user, moveEffect);
      }
      this.runEvent("onAfterMoveSecondarySelf", user, { relay: move, args: [d.dealt], move });
    }

    isInvulnerable(target, move) {
      const tt = target.volatiles.twoturnmove;
      // (Carried up by Sky Drop: in the air, like Fly.)
      const invuln = tt && tt.invuln || (target.volatiles.skydrop ? "fly" : null);
      if (!invuln) return false;
      if (move.target === "self") return false;
      for (const m of this.getActives()) {
        const r = this.callAbility(m, "onAnyInvulnerability", { source: m }, move);
        if (r === 0) return false;
      }
      return !(INVULN_HITS[invuln] || []).includes(move.id);
    }

    // Sky Drop's first turn (Gen 6): it fails on an ally, a substitute, a
    // Pokémon of 200 kg or more and under Gravity; Protect, Mat Block and
    // semi-invulnerability stop it; otherwise the user and the target go up
    // (both semi-invulnerable; the target can't move or switch) and the
    // blow lands next turn (execMove). Like Showdown, it doesn't check
    // accuracy until then.
    skyDropLift(user, target, move) {
      if (this.doubles && !target) { this.add("-notarget", user); return; }
      if (!target || target.fainted || target === user || target.side === user.side
          || target.volatiles.substitute || this.field.pseudo.gravity) { this.add("-fail", user); return; }
      if (this.isInvulnerable(target, move)) { this.add("-miss", user, target); return; }
      if (this.isProtected(target, user, move) || this.sideGuarded(target, user, move)) return;
      const weight = target.weight * (target.hasAbility("Heavy Metal") ? 2 : target.hasAbility("Light Metal") ? 0.5 : 1);
      if (weight >= 200) { this.add("-fail", target, "move: Sky Drop", "[heavy]"); return; }
      this.add("-prepare", user, move.name, target);
      user.volatiles.twoturnmove = { id: "twoturnmove", move: move.name, invuln: "fly", skyDrop: target };
      if (this.doubles) user.volatiles.twoturnmove.targetLoc = this.locOf(target, user);
      target.volatiles.skydrop = { id: "skydrop", source: user };
    }

    // Mat Block (damaging moves) and Crafty Shield (status moves aimed at a
    // Pokémon) on the target's side, against anyone's moves, allies' too.
    sideGuarded(target, user, move) {
      const c = target.side.conditions;
      if (c.matblock && move.flags.protect && move.category !== "Status" && !move.breaksProtect) {
        this.add("-activate", target, "move: Mat Block", move.name);
        return true;
      }
      if (c.craftyshield && move.category === "Status" && !["self", "all", "foeSide", "allySide", "allyTeam"].includes(move.target)) {
        this.add("-activate", target, "move: Crafty Shield");
        return true;
      }
      return false;
    }

    // Gen 7: grounded Pokémon in Psychic Terrain, and a side with Queenly
    // Majesty or Dazzling, can't be hit by the foe's priority moves.
    priorityBlocked(user, target, move, brk) {
      if (target.side === user.side || !(move.priority > 0)) return false;
      if (move.target !== "normal" && move.target !== "any" && move.target !== "adjacentFoe" && !SPREAD_TARGETS.has(move.target)) return false;
      const guard = [target, this.allyOf(target)].find((m) => m && !m.fainted && m.hasAbility(["Queenly Majesty", "Dazzling"]) && !(brk && m === target));
      if (guard) { this.add("-activate", guard, "ability: " + guard.ability, "[of] " + user.ident); return true; }
      if (this.field.terrain === "PsychicTerrain" && this.isGrounded(target)) { this.add("-activate", target, "move: Psychic Terrain"); return true; }
      return false;
    }

    isProtected(target, user, move) {
      const v = target.volatiles;
      if (this.doubles && SPREAD_TARGETS.has(move.target) && target.side.conditions.wideguard) {
        this.add("-activate", target, "move: Wide Guard");
        return true;
      }
      if (v.protect || v.kingsshield || v.spikyshield || v.banefulbunker) {
        this.add("-activate", target, "move: Protect");
        if (move.flags.contact) {
          if (v.banefulbunker) this.trySetStatus(user, "psn", target, E("Move", "banefulbunker", "Baneful Bunker"));
          if (v.kingsshield) this.boost(user, { atk: -2 }, target, E("Move", "kingsshield", "King's Shield"));
          if (v.spikyshield) this.damage(user, Math.floor(user.baseMaxhp / 8), target, E("Move", "spikyshield", "Spiky Shield"));
        }
        return true;
      }
      // (Obstruct: damaging moves only; contact ones lose 2 Defense.)
      if (v.obstruct && move.category !== "Status") {
        this.add("-activate", target, "move: Protect");
        if (move.flags.contact) this.boost(user, { def: -2 }, target, E("Move", "obstruct", "Obstruct"));
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
      if ((move.id === "thunder" || move.id === "hurricane" || /^(bleakwind|wildbolt|sandsear)storm$/.test(move.id)) && (w === "RainDance" || w === "PrimordialSea")) return true;
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
          // (Max Guard stops everything, Max Moves too.)
          if (target.volatiles.maxguard && !move.breaksProtect) {
            this.add("-activate", target, "move: Max Guard");
            return false;
          }
          const unseen = move.flags.contact && user.hasAbility("Unseen Fist");
          if (move.flags.protect && !move.breaksProtect && !unseen && this.isProtected(target, user, move)) return false;
          // (A Z-Move gets through Protect and the like with a quarter of its damage.)
          const v = target.volatiles;
          if (o) o.zBrokeProtect = !!(move.isZ || move.isMax) && move.category !== "Status" && !move.breaksProtect && !!(v.protect || v.kingsshield || v.spikyshield || v.banefulbunker || v.obstruct);
          if (this.sideGuarded(target, user, move)) return false;
          if (this.priorityBlocked(user, target, move, brk)) return false;
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
      if (move.id === "dreameater" && !this.asleep(target)) { this.add("-immune", target); return false; }
      if (move.id === "snore" || move.id === "sleeptalk") { if (!this.asleep(user)) { this.add("-fail", user); return false; } }
      if (move.id === "endeavor" && target.hp <= user.hp) { this.add("-fail", user); return false; }
      // (A Dynamaxed Pokémon: no OHKO moves, no weight-based moves.)
      if (target.dynamaxed && (move.ohko || ["lowkick", "grassknot", "heatcrash", "heavyslam"].includes(move.id))) { this.add("-fail", user); return false; }
      // (Gen 7 moves: First Impression, Burn Up, Shell Trap, Psychic Fangs,
      // Spectral Thief, Pollen Puff on an ally.)
      const before = window.BATTLE_MOVE_EFFECTS && window.BATTLE_MOVE_EFFECTS.beforeHit && window.BATTLE_MOVE_EFFECTS.beforeHit[move.id];
      if (before) {
        const r = before(this, user, target, move);
        if (r === false) { this.add("-fail", user); return false; }
        if (r === "done") return true;
      }

      // Number of hits
      let hits = 1;
      if (typeof move.multihit === "number") hits = move.multihit;
      else if (Array.isArray(move.multihit)) {
        const [lo, hi] = move.multihit;
        if (lo === 2 && hi === 5) { const r = this.random(); hits = r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
        else hits = this.randInt(lo, hi);
      }
      // Beat Up (doubles; Gen 5+): one hit for each party member that can
      // fight and has no status, each with its own base power.
      let beatUp = null;
      if (this.doubles && move.id === "beatup") {
        beatUp = user.side.pokemon.filter((p) => p === user || (!p.fainted && !p.status))
          .map((p) => Math.floor((window.DEX[p.species] || {}).atk / 10) + 5);
        hits = beatUp.length;
      }
      if (move.id === "watershuriken" && user.species === "Greninja-Ash") hits = 3;
      const luckyChant = target.side.conditions.luckychant;
      let totalDealt = 0, hitCount = 0, connected = false, lastResult = null;
      const sub = target.volatiles.substitute && !move.flags.bypasssub && !user.hasAbility("Infiltrator");

      for (let i = 0; i < hits; i++) {
        if (target.fainted || user.fainted) break;
        // (Gen 8's Triple Axel checks accuracy for each hit.)
        if (i > 0 && move.multiaccuracy && move.gen && !this.accuracyCheck(user, target, move)) break;
        let crit = false;
        if (!luckyChant && !(move.id === "counter")) {
          const chance = window.Damage.critChance(user, move.name, { focusEnergy: !!user.volatiles.focusenergy,
            critBoost: (user.volatiles.gmaxchistrike || {}).layers || 0 });
          // (Gen 7: Laser Focus, and Merciless against a poisoned target.)
          const sure = !!user.volatiles.laserfocus || (user.hasAbility("Merciless") && (target.status === "psn" || target.status === "tox"));
          crit = sure || chance >= 1 || this.random() < chance;
        }
        const field = {
          weather: this.getWeather(), terrain: this.field.terrain, gravity: !!this.field.pseudo.gravity, isDoubles: this.doubles,
          reflect: !!target.side.conditions.reflect || !!target.side.conditions.auroraveil,
          lightScreen: !!target.side.conditions.lightscreen || !!target.side.conditions.auroraveil
        };
        const opts = {
          crit, hits: 1, charge: !!user.volatiles.charge, stockpile: stockLayers,
          helpingHand: !!o.meFirst || (this.doubles && !!user.volatiles.helpinghand),
          lastDamageTaken: user.lastDamage ? user.lastDamage.amount : 0,
          targetDamagedThisTurn: !!target.lastDamage, hitByTarget: !!(user.lastDamage && user.lastDamage.source === target),
          movesAfterTarget: target.moveThisTurn, allyFainted: user.side.faintedLastTurn, targetSwitching: !!o.pursuitSwitch,
          magnitude: this.magnitude,
          moveType: move.typeOverride ? move.type : undefined, lastMoveFailed: !!user.lastMoveFailed,
          statsLowered: !!user.statsLoweredThisTurn, hitIndex: i,
          zPower: move.zPower, zCategory: move.zPower ? move.category : undefined, zBrokeProtect: !!o.zBrokeProtect,
          targetDynamaxed: !!target.dynamaxed,
          suppressA: this.neutralized(user), suppressD: this.neutralized(target),
          steelySpirit: [user, this.allyOf(user)].some((m) => m && m.hasAbility("Steely Spirit"))
        };
        // Flower Gift (Cherrim in the sun): 1.5x Attack for the user's side,
        // 1.5x Sp. Def for the target's (Mold Breaker ignores that one).
        if (field.weather === "SunnyDay" || field.weather === "DesolateLand") {
          if (this.flowerGift(user)) opts.flowerGiftAtk = true;
          if (!move.ignoreAbility && this.flowerGift(target)) opts.flowerGiftSpD = true;
        }
        // (Unnerve: no resist Berry either.)
        if (/-berry$/.test(target.item) && this.isUnnerved(target)) opts.unnerved = true;
        if (this.doubles) {
          opts.targets = o.spread || 1;
          if (beatUp) opts.beatUpPower = beatUp[i];
          const uAlly = this.allyOf(user), tAlly = this.allyOf(target);
          opts.plusMinus = user.hasAbility(["Plus", "Minus"]) && !!uAlly && uAlly.hasAbility(["Plus", "Minus"]);
          opts.friendGuard = !!tAlly && tAlly !== user && tAlly.hasAbility("Friend Guard") && !move.ignoreAbility;
          opts.battery = !!uAlly && uAlly.hasAbility("Battery");
          opts.powerSpot = !!uAlly && uAlly.hasAbility("Power Spot");
        }
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
        if (o.zBrokeProtect && i === 0) this.add("-zbroken", target);
        let dmg = r.damage[this.randInt(0, 15)];
        if (hits > 1 && i > 0 && user.hasAbility("Parental Bond") && move.multihitType === "parentalbond") dmg = Math.floor(dmg / 2);
        const typeMod = r.typeEffectiveness > 1 ? Math.log2(r.typeEffectiveness) : r.typeEffectiveness < 1 ? -Math.log2(1 / r.typeEffectiveness) : 0;
        target._hit = { typeMod, crit: r.crit };
        if (r.crit) { this.add("-crit", target); user.critsLanded = (user.critsLanded || 0) + 1; }
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
          // False Swipe (and Hold Back) always leave the target at least 1 HP.
          const holdsOn = move.id === "falseswipe" || move.id === "holdback";
          if (holdsOn) dmg = Math.min(dmg, Math.max(0, target.hp - 1));
          dealt = holdsOn && dmg <= 0 ? 0 : this.damage(target, dmg, user, moveEffect);
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
      const d = o.deferSelf;   // (doubles spread moves: once per move, in afterSpread)
      if (d) { d.dealt += totalDealt; d.hit = true; }
      if (move.recoil && totalDealt > 0 && !user.fainted && !d) {
        user.recoilTaken = (user.recoilTaken || 0) + this.damage(user, Math.max(1, Math.round((totalDealt * move.recoil[0]) / move.recoil[1])), user, E("Recoil", "recoil", "Recoil"));
      }
      if (move.id === "struggle" && !user.fainted) this.damage(user, Math.max(1, Math.floor(user.maxhp / 4)), user, E("Recoil", "recoil", "Recoil"));

      // Move-specific after-effects
      const after = window.BATTLE_MOVE_EFFECTS && window.BATTLE_MOVE_EFFECTS.afterHit[move.id];
      if (after && !target.fainted) after(this, user, target, move, totalDealt);
      const afterSelf = window.BATTLE_MOVE_EFFECTS && window.BATTLE_MOVE_EFFECTS.afterHitSelf && window.BATTLE_MOVE_EFFECTS.afterHitSelf[move.id];
      if (afterSelf && !user.fainted) afterSelf(this, user, target, move, totalDealt);

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
      if (move.self && !user.fainted && !d) {
        if (move.self.boosts && !user.hasAbility("Sheer Force")) this.boost(user, move.self.boosts, user, moveEffect);
        if (move.self.volatileStatus === "mustrecharge") this.addVolatile(user, "mustrecharge", user, moveEffect);
      }
      if (move.volatileStatus && !target.fainted && !sub) {
        if (this.addVolatile(target, move.volatileStatus, user, moveEffect) && move.volatileStatus === "partiallytrapped") {
          target.volatiles.partiallytrapped.moveName = move.name;
        }
      }
      if (move.forceSwitch && !target.fainted && !sub) this.forceOut(target, user);
      if (!user.fainted && !d) this.runEvent("onAfterMoveSecondarySelf", user, { relay: move, args: [totalDealt], move });
      if (!target.fainted) this.runEvent("onAfterMoveSecondary", target, { source: user, relay: move, only: "ability" });
      return true;
    }

    forceOut(target, user) {
      const side = target.side;
      const opts = side.bench(target.slot);
      if (!opts.length || target.volatiles.ingrain || target.hasAbility("Suction Cups")) return;
      if (target.volatiles.skydrop || (target.volatiles.twoturnmove && target.volatiles.twoturnmove.skyDrop)) return;
      if (target.dynamaxed) return;
      if (this.callAbility(target, "onDragOut", { source: user }) === false) return;
      this.switchIn(side, this.sample(opts), { drag: true, slot: target.slot });
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
          if (vs === "endure" || vs === "protect" || vs === "kingsshield" || vs === "spikyshield" || vs === "banefulbunker" || vs === "obstruct" || vs === "maxguard") this.addVolatile(user, vs, user, moveEffect);
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
          if (vs === "disable") {
            tgt.volatiles.disable.moveId = tgt.lastMove;
            // (Name the move in the "-start" just added: "Foe's Tackle was disabled!")
            const ev = [...this.events].reverse().find((e) => e[0] === "-start" && /disable/i.test(e[2]));
            if (ev) ev[3] = MOVE_INDEX[toID(tgt.lastMove)] || tgt.lastMove;
          }
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
        // (Gravity brings down a Sky Drop and the Pokémon it carries.)
        if (id === "gravity") {
          for (const m of this.getActives()) {
            if (m.volatiles.twoturnmove && m.volatiles.twoturnmove.skyDrop) { this.add("-activate", m, "move: Gravity"); this.endSkyDrop(m); }
          }
        }
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
        user.side.wish = { turns: 2, hp: Math.floor(user.maxhp / 2), slot: user.slot };
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
        if (f.terrainTurns <= 0) { this.add("-fieldend", f.terrain); f.terrain = ""; this.mimicry(); }
      }
      // Wish
      for (const s of [this.sides.p1, this.sides.p2]) {
        if (s.wish) {
          s.wish.turns--;
          if (s.wish.turns <= 0) {
            const m = s.actives[s.wish.slot || 0];
            if (m && !m.fainted) this.heal(m, s.wish.hp, m, E("Move", "wish", "Wish"));
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
        if (m.dynamaxed && --m.dynamaxed.turns <= 0) this.undynamax(m);
        if (this.doubles) for (const id of TURN_VOLATILES) delete m.volatiles[id];
        for (const id of Object.keys(m.volatiles)) {
          const v = m.volatiles[id];
          if (v.duration !== undefined) {
            v.duration--;
            if (v.duration <= 0) this.removeVolatile(m, id);
          }
        }
        if (!m.volatiles.protect && !m.volatiles.kingsshield && !m.volatiles.spikyshield && !m.volatiles.banefulbunker && !m.volatiles.obstruct && !m.volatiles.maxguard && !m.volatiles.endure
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
