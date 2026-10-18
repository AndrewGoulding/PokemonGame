// The Route 5 Day-Care (FireRed's src/daycare.c, route5DayCareMon): one
// Pokémon left with the Day-Care Man gains 1 Exp. Point for every step you
// take. Taking it back costs ¥100, plus ¥100 a level it grew; it levels up one
// level at a time, learning its new moves, and with four already it forgets its
// first to make room (DeleteFirstMoveAndGiveMoveToMon), as in FireRed.
//
// The Day-Care's state is { mon: party record, steps } (or null).
//
// Four Island's Day-Care (FireRed's two-Pokémon Day-Care, src/daycare.c's
// sDayCare) keeps two of these (player.flags.dayCare2), each growing the same
// way and priced the same. (FireRed's couple there also find Eggs: this game
// has no Eggs, so none turn up.)
(function () {
  "use strict";

  const E = () => window.Experience;
  const group = (record) => E().growthRate(record.species);
  // The level its Exp. Points would make it now (no further than 100, or
  // `cap`, the level caps' Player.levelCap; one already past it stays as it is).
  function levelAfter(dc, cap) {
    const top = Math.min(E().MAX_LEVEL, cap || E().MAX_LEVEL);
    if (!dc || dc.mon.level >= top) return dc ? dc.mon.level : 0;
    return Math.min(top, E().levelForExp(group(dc.mon), dc.mon.exp + dc.steps));
  }
  const levelsGained = (dc, cap) => (dc ? levelAfter(dc, cap) - dc.mon.level : 0);
  const cost = (dc, cap) => 100 + 100 * levelsGained(dc, cap);

  function deposit(record) {
    return { mon: record, steps: 0 };
  }
  // Counts a step (call once a step on the map). A list: each of them.
  function step(dc) {
    if (Array.isArray(dc)) dc.forEach(step);
    else if (dc) dc.steps++;
  }
  // The Pokémon, grown: -> its record.
  function withdraw(dc, cap) {
    const r = dc.mon, top = Math.min(E().MAX_LEVEL, cap || E().MAX_LEVEL);
    if (r.level < top) {
      const target = levelAfter(dc, cap);
      r.exp = Math.min(r.exp + dc.steps, E().expForLevel(group(r), top));
      while (r.level < target) {
        for (const move of window.Bag.levelUp(r, { noFriendship: true })) {
          if (!window.Party.teachMove(r, move)) { r.moves.shift(); window.Party.teachMove(r, move); }
        }
      }
      r.exp = Math.min(r.exp, E().expForLevel(group(r), top));
    }
    return r;
  }

  window.DayCare = { deposit, step, levelsGained, cost, withdraw };
})();
