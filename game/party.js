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
//     happiness, item, ball, moves: [{ name, pp }], hp, status }
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

  const maxPp = (move) => window.MOVES[move].pp;

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
    record.hp = maxHp(record);
    return record;
  }

  function stats(record) {
    return window.Stats.calcAllStats(record.species,
      { level: record.level, nature: record.nature, ivs: record.ivs, evs: record.evs });
  }
  const maxHp = (record) => stats(record).hp;
  const displayName = (record) => record.nickname || record.species;
  const isFainted = (record) => record.hp <= 0;

  function toBattleSet(record) {
    return {
      species: record.species,
      name: displayName(record),
      level: record.level,
      exp: record.exp,
      nature: record.nature,
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
      ppUps: 0
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
    record.moves = battleMoves(mon).map((m) => ({ name: m.name, pp: Math.min(m.pp, maxPp(m.name)) }));
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
    for (const m of record.moves) m.pp = maxPp(m.name);
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
    create, stats, maxHp, displayName, isFainted, toBattleSet, syncFromBattle, caught,
    heal, teachMove, movesLearnedAt, expProgress
  };
})();
