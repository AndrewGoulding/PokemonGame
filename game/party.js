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
//     happiness, item, ball, moves: [{ name, pp, ppUps }], hp, status, mint? }
// `ppUps` (0-3, from PP Up / PP Max) is left out when 0. `mint` is a nature
// whose stat changes replace the Pokémon's own (its nature itself stays).
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
  // Names that really contain a hyphen (Ho-Oh, Porygon-Z, Nidoran-F) are kept.
  const FORME_SUFFIX = /-(Plant|Sandy|Trash|Shield|Blade|Standard|Zen|Normal|Attack|Defense|Speed|Altered|Origin|Land|Sky|Incarnate|Therian|Ordinary|Resolute|Aria|Pirouette|Confined|Unbound|Average|Small|Large|Super)$/;
  const speciesName = (species) => species.replace(FORME_SUFFIX, "");

  // opts: { rng, moves, ball, nickname }
  function create(species, level, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const dex = window.DEX[species];
    if (!dex) throw new Error("Unknown species: " + species);
    const ivs = {};
    for (const k of STAT_KEYS) ivs[k] = Math.floor(rng() * 32);
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
    record.hp = maxHp(record);
    return record;
  }

  // The nature that sets the stats: a mint's, if one was used.
  const statNature = (record) => record.mint || record.nature;

  function stats(record) {
    return window.Stats.calcAllStats(record.species,
      { level: record.level, nature: statNature(record), ivs: record.ivs, evs: record.evs });
  }
  const maxHp = (record) => stats(record).hp;
  // Sprite variant for Pokémon whose look differs within one Pokédex entry:
  // "sandy" / "trash" for those Burmy (sprites named 412-sandy.png etc.).
  const form = (record) => (record.cloak && record.cloak !== "plant" ? record.cloak : "");
  const displayName = (record) => record.nickname || speciesName(record.species);
  const isFainted = (record) => record.hp <= 0;

  function toBattleSet(record) {
    return {
      species: record.species,
      name: displayName(record),
      level: record.level,
      exp: record.exp,
      nature: statNature(record),
      ability: record.ability,
      gender: record.gender,
      ivs: record.ivs,
      evs: Object.assign({}, record.evs),
      happiness: record.happiness,
      item: record.item,
      moves: record.moves.map((m) => m.name),
      pp: record.moves.map((m) => m.pp),
      hp: record.hp,
      status: record.status,
      form: form(record),   // display only; the engine ignores it
      ppUps: record.moves.map((m) => m.ppUps || 0)
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
    return record;
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
  function canLearnMachine(record, move) {
    const learnset = window.LEARNSETS_GEN6[record.species];
    return !!learnset && (learnset.tm || []).includes(move);
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

  window.Party = {
    CLOAKS, create, maxPp, statNature, stats, maxHp, speciesName, displayName, form, isFainted, toBattleSet,
    syncFromBattle, caught, heal, teachMove, canLearnMachine, knowsMove, movesLearnedAt, expProgress
  };
})();
