// The Route 5 Day-Care (FireRed's src/daycare.c, route5DayCareMon): one
// Pokémon left with the Day-Care Man gains 1 Exp. Point for every step you
// take. Taking it back costs ¥100, plus ¥100 a level it grew; it levels up one
// level at a time, learning its new moves, and with four already it forgets its
// first to make room (DeleteFirstMoveAndGiveMoveToMon), as in FireRed.
//
// The Day-Care's state is { mon: party record, steps } (or null).
(function () {
  "use strict";

  const E = () => window.Experience;
  const group = (record) => E().growthRate(record.species);
  // The level its Exp. Points would make it now (no further than 100).
  function levelAfter(dc) {
    if (!dc || dc.mon.level >= E().MAX_LEVEL) return dc ? dc.mon.level : 0;
    return Math.min(E().MAX_LEVEL, E().levelForExp(group(dc.mon), dc.mon.exp + dc.steps));
  }
  const levelsGained = (dc) => (dc ? levelAfter(dc) - dc.mon.level : 0);
  const cost = (dc) => 100 + 100 * levelsGained(dc);

  function deposit(record) {
    return { mon: record, steps: 0 };
  }
  // Counts a step (call once a step on the map).
  function step(dc) {
    if (dc) dc.steps++;
  }
  // The Pokémon, grown: -> its record.
  function withdraw(dc) {
    const r = dc.mon;
    if (r.level < E().MAX_LEVEL) {
      const target = levelAfter(dc);
      r.exp += dc.steps;
      while (r.level < target) {
        for (const move of window.Bag.levelUp(r, { noFriendship: true })) {
          if (!window.Party.teachMove(r, move)) { r.moves.shift(); window.Party.teachMove(r, move); }
        }
      }
      r.exp = Math.min(r.exp, E().expForLevel(group(r), E().MAX_LEVEL));
    }
    return r;
  }

  window.DayCare = { deposit, step, levelsGained, cost, withdraw };
})();
