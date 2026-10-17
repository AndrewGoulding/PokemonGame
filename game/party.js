// Party Pokémon records: the plain data that lives between battles.
// Depends on: window.DEX, window.MOVES, window.NATURES, window.Stats,
//             window.Experience, window.RandomTeam (for level-up movesets)
//
//   const mon = Party.create("Charmander", 5);
//   const set = Party.toBattleSet(mon);          // pass to new Battle({ p1: { team: [set] } })
//   Party.syncFromBattle(mon, battle.sides.p1.pokemon[0]);   // afterwards
//
// A record:
//   { species, nickname, level, exp, nature, ability, gender, personality, ivs, evs,
//     happiness, item, ball, moves: [{ name, pp, ppUps }], hp, status }
// `hyper` (from Bottle Caps: Hyper Training) lists the stats trained to act
// as if their IVs were 31; `ivs` itself stays as it is (what breeding passes on).
// `ppUps` (0-3, from PP Up / PP Max) is left out when 0.
// Max HP and other stats are always worked out from the record, never stored.

(function () {
  "use strict";

  const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  function rollGender(species, rng) {
    const text = window.DEX[species].gender || "";
    if (/genderless/i.test(text)) return "N";
    const m = /([\d.]+)% Male/.exec(text);
    const male = m ? parseFloat(m[1]) : 0;
    return rng() * 100 < male ? "M" : "F";
  }

  // Max PP of a move slot: base PP, +20% of base per PP Up (up to 3).
  const maxPp = (slot) => {
    const base = window.MOVES[typeof slot === "string" ? slot : slot.name].pp;
    return Math.floor(base * (5 + Math.min(3, (slot && slot.ppUps) || 0)) / 5);
  };

  // Burmy's cloak decides which Wormadam it becomes. In the main games it
  // matches where Burmy last battled; with no map yet, each Burmy rolls one.
  const CLOAKS = ["plant", "sandy", "trash"];

  // "Wormadam-Sandy" -> "Wormadam", "Darmanitan-Standard" -> "Darmanitan".
  // Names that really contain a hyphen (Ho-Oh, Porygon-Z) are kept.
  const FORME_SUFFIX = /-(Plant|Sandy|Trash|Shield|Blade|Standard|Zen|Normal|Attack|Defense|Speed|Altered|Origin|Land|Sky|Incarnate|Therian|Ordinary|Resolute|Aria|Pirouette|Confined|Unbound|Average|Small|Large|Super)$/;
  // (And the Nidoran, as the games write them: Nidoran♀ and Nidoran♂.)
  const GENDERED_NAMES = { "Nidoran-F": "Nidoran♀", "Nidoran-M": "Nidoran♂" };
  const speciesName = (species) => GENDERED_NAMES[species] || species.replace(FORME_SUFFIX, "");

  // opts: { rng, moves, ball, nickname, ivs (a number for every stat: a trainer's Pokémon) }
  const SHINY_ODDS = 1000;   // 1 in 1,000 (Gen 6 is 1 in 4,096)

  function create(species, level, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const dex = window.DEX[species];
    if (!dex) throw new Error("Unknown species: " + species);
    const ivs = {};
    for (const k of STAT_KEYS) ivs[k] = opts.ivs != null ? opts.ivs : Math.floor(rng() * 32);
    const moves = opts.moves || window.RandomTeam.levelUpMoves(species, level);
    const record = {
      species,
      nickname: opts.nickname || null,
      level,
      exp: window.Experience.expForLevel(window.Experience.growthRate(species), level),
      nature: pick(Object.keys(window.NATURES), rng),
      ability: pick(dex.abilities, rng),
      gender: rollGender(species, rng),
      personality: Math.floor(rng() * 4294967296),
      ivs,
      evs: {},
      happiness: dex.baseFriendship != null ? dex.baseFriendship : 70,
      item: "",
      ball: opts.ball || "poke-ball",
      moves: moves.map((name) => ({ name, pp: maxPp(name) })),
      hp: 0,
      status: ""
    };
    if (species === "Burmy") record.cloak = opts.cloak || pick(CLOAKS, rng);
    // Unown's letter (FireRed: from its personality; here kept as itself):
    // "a" to "z", "exclamation" or "question" (opts.unown, else A).
    if (species === "Unown" && opts.unown && opts.unown !== "a") record.unown = opts.unown;
    // Shiny: 1 in 4096 (Gen 6), unless opts.shiny says. (Its own roll, so the
    // rest of a record made from a seeded rng stays the same.)
    if (opts.shiny != null ? opts.shiny : Math.random() < 1 / SHINY_ODDS) record.shiny = true;
    record.hp = maxHp(record);
    return record;
  }

  // Its IVs as stats use them: 31 for each Hyper Trained stat.
  function trainedIvs(record) {
    if (!record.hyper || !record.hyper.length) return record.ivs;
    const ivs = Object.assign({}, record.ivs);
    for (const k of record.hyper) ivs[k] = 31;
    return ivs;
  }
  function stats(record) {
    return window.Stats.calcAllStats(record.species,
      { level: record.level, nature: record.nature, ivs: trainedIvs(record), evs: record.evs });
  }
  const maxHp = (record) => stats(record).hp;
  // Sprite variant for Pokémon whose look differs within one Pokédex entry:
  // "sandy" / "trash" for those Burmy (sprites named 412-sandy.png etc.),
  // Unown's letters ("b" ... "z", "exclamation", "question": 201-b.png ...),
  // and Alcremie's cream and Sweet ("ruby-cream-strawberry-sweet": 869-...;
  // the vanilla cream with a Strawberry Sweet is its own picture).
  const form = (record) => (record.cloak && record.cloak !== "plant" ? record.cloak
    : record.species === "Unown" && record.unown ? record.unown
    : record.species === "Alcremie" && record.alcremie && record.alcremie !== "vanilla-cream-strawberry-sweet" ? record.alcremie : "");
  // Alcremie's cream, as Sword and Shield decide it when Milcery spins:
  // which way, for how long, and the time of day (a long spin the other way
  // from 7pm to 8pm, the Rainbow Swirl).
  function alcremieCream(clockwise, long, hour) {
    const night = hour >= 20 || hour < 4;
    if (!clockwise && long && hour === 19) return "rainbow-swirl";
    if (night) return clockwise ? (long ? "lemon-cream" : "matcha-cream") : (long ? "mint-cream" : "salted-cream");
    return clockwise ? (long ? "caramel-swirl" : "vanilla-cream") : (long ? "ruby-swirl" : "ruby-cream");
  }
  const displayName = (record) => record.nickname || speciesName(record.species);
  const isFainted = (record) => record.hp <= 0;
  // An Egg (game/breeding.js): it can't battle or do anything until it hatches.
  const isEgg = (record) => !!(record && record.egg);
  // Could it go into battle: not an Egg, not fainted.
  const canFight = (record) => !!record && !record.egg && record.hp > 0;
  const displayNameOrEgg = (record) => (record.egg ? "EGG" : displayName(record));

  // FireRed's friendship bonuses for a record: its held item, its ball, and
  // whether it was met in the area of `here` (a map name).
  function friendshipOpts(record, here) {
    const secs = (window.TOWN_MAP || {}).mapSections || {};
    const met = record.met && !record.met.traded && record.met.map;
    return { item: record.item, ball: record.ball, metHere: !!(met && here && secs[met] && secs[met] === secs[here]) };
  }
  // Changes its friendship for a FireRed event ("walking", "tm", ...) or an
  // item's [low, mid, high] (engine/experience.js adjustFriendship).
  function adjustFriendship(record, change, here) {
    record.happiness = window.Experience.adjustFriendship(record.happiness, change, friendshipOpts(record, here));
    return record.happiness;
  }

  // (`here`, the map you're on: for the friendship bonus where it was met.)
  function toBattleSet(record, here) {
    return {
      species: record.species,
      name: displayName(record),
      level: record.level,
      exp: record.exp,
      nature: record.nature,
      ability: record.ability,
      gender: record.gender,
      ivs: trainedIvs(record),
      evs: Object.assign({}, record.evs),
      happiness: record.happiness,
      item: record.item,
      moves: record.moves.map((m) => m.name),
      pp: record.moves.map((m) => m.pp),
      hp: record.hp,
      status: record.status,
      form: form(record),   // display only; the engine ignores it
      shiny: !!record.shiny,   // (display only too)
      ball: record.ball,    // the ball it's thrown out in (and a Luxury Ball's friendship)
      metHere: friendshipOpts(record, here).metHere,
      ppUps: record.moves.map((m) => m.ppUps || 0),
      // (Gen 8 evolutions' running totals: Basculin's recoil, Hisuian
      // Qwilfish's Barb Barrages.)
      recoil: record.recoil || 0,
      moveUses: Object.assign({}, record.moveUses)
    };
  }

  // The real moves of an engine Pokémon, undoing Transform and Mimic.
  function battleMoves(mon) {
    const moves = mon.transformed && mon.original ? mon.original.moves : mon.moves;
    return moves.map((m) => m.mimicOf || m);
  }

  // Copies what changed during a battle back onto the record.
  function syncFromBattle(record, mon) {
    record.level = mon.level;
    record.exp = mon.exp;
    record.evs = Object.assign({}, mon.evs);
    record.happiness = mon.happiness;
    record.hp = Math.min(mon.hp, maxHp(record));
    record.status = mon.fainted ? "" : mon.status;
    // PP Ups stay with the move they were used on (a move learned mid-battle has none).
    const ups = {};
    for (const m of record.moves) if (m.ppUps) ups[m.name] = m.ppUps;
    record.moves = battleMoves(mon).map((m) => {
      const slot = { name: m.name, pp: 0 };
      if (ups[m.name]) slot.ppUps = ups[m.name];
      slot.pp = Math.min(m.pp, maxPp(slot));
      return slot;
    });
    record.item = mon.item;
    // (The totals Gen 8's evolutions count, for the moves they name.)
    if (mon.recoilTaken) record.recoil = mon.recoilTaken;
    const counted = Object.keys(mon.moveUses || {}).filter((m) => countedMoves().has(m));
    if (counted.length) record.moveUses = Object.fromEntries(counted.map((m) => [m, mon.moveUses[m]]));
    return record;
  }
  // Moves an evolution counts the uses of (Overqwil's Barb Barrage).
  let counted = null;
  function countedMoves() {
    if (!counted) {
      counted = new Set();
      for (const list of Object.values(window.EVOLUTIONS || {})) for (const e of list) for (const m of Object.keys(e.moveUses || {})) counted.add(m);
    }
    return counted;
  }

  // The wild Pokémon's record becomes yours: its battle state plus the ball.
  function caught(wildRecord, mon, ball) {
    const record = syncFromBattle(JSON.parse(JSON.stringify(wildRecord)), mon);
    record.ball = ball;
    if (ball === "friend-ball") record.happiness = 200;
    if (ball === "heal-ball") heal(record);
    return record;
  }

  // Pokémon Center: full HP and PP, no status.
  function heal(record) {
    record.hp = maxHp(record);
    record.status = "";
    for (const m of record.moves) m.pp = maxPp(m);
    return record;
  }

  // Teaches a move into a free slot, or over `slot` if given.
  function teachMove(record, move, slot) {
    const entry = { name: move, pp: maxPp(move) };
    if (slot == null) {
      if (record.moves.length >= 4) return false;
      record.moves.push(entry);
    } else {
      record.moves[slot] = entry;
    }
    return true;
  }

  // Can this Pokémon learn `move` from a TM or HM? (Gen 6 learnsets, X/Y and ORAS.)
  // X and Y's machine list, plus machines from other generations (data/machine-learners.js).
  function canLearnMachine(record, move) {
    const learnset = window.LEARNSETS_GEN6[record.species];
    if (learnset && (learnset.tm || []).includes(move)) return true;
    return ((window.MACHINE_LEARNERS || {})[move] || []).includes(record.species);
  }
  const knowsMove = (record, move) => record.moves.some((m) => m.name === move);

  // Moves the species learns at exactly this level that the record doesn't know.
  function movesLearnedAt(record, level) {
    const learnset = window.LEARNSETS_GEN6[record.species];
    if (!learnset) return [];
    const out = [];
    for (const [lvl, move] of learnset.levelup) {
      if (lvl === level && window.MOVES[move] && !out.includes(move) &&
          !record.moves.some((m) => m.name === move)) out.push(move);
    }
    return out;
  }

  function expProgress(record) {
    const E = window.Experience;
    return E.progress(E.growthRate(record.species), record.level, record.exp);
  }

  window.Party = { SHINY_ODDS,
    CLOAKS, STAT_KEYS, create, maxPp, trainedIvs, stats, maxHp, speciesName, displayName, form, alcremieCream, isFainted, isEgg, canFight, displayNameOrEgg, toBattleSet, friendshipOpts, adjustFriendship,
    syncFromBattle, caught, heal, teachMove, canLearnMachine, knowsMove, movesLearnedAt, expProgress
  };
})();
