// Faraway Island's Mew (Emerald's src/faraway_island.c), headless.
// Depends on: window.World
//
// Inside the island Mew plays hide and seek in the long grass: each step you
// take, it takes one too, away from you if it can, and it shows itself only
// every 8th step.
//
//   Faraway.mewStep({ mew, prev, cur, steps, isGrass, rng })
//     // mew: { x, y }; prev / cur: where you were and are now (a step: they
//     // differ); steps: VAR_FARAWAY_ISLAND_STEP_COUNTER after this step;
//     // isGrass(x, y): long or tall grass (MetatileBehavior_IsPokeGrass).
//     // -> { dir: "up" | "down" | "left" | "right" | null, visible }
//   Faraway.ROCKS     the four rocks Mew avoids being trapped against
//   Faraway.isGrass(mapName)   -> (x, y) => whether Mew can go there
(function () {
  "use strict";

  // sFarawayIslandRockCoords (map coordinates).
  const ROCKS = [[14, 9], [18, 9], [9, 10], [13, 13]];
  const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function mewStep(o) {
    const { mew, prev, cur } = o;
    const steps = o.steps | 0;
    const rng = o.rng || Math.random;
    // (GetMewMoveDirection: the player's previousCoords against Mew's.)
    const dx = prev.x - mew.x, dy = prev.y - mew.y;
    if (prev.x === cur.x && prev.y === cur.y) return { dir: null, visible: null };   // only turned
    const visible = steps % 8 === 0;
    if (steps % 9 === 0) return { dir: null, visible };   // (a step's pause once it's shown)
    // CanMewMoveToCoords: grass you're not standing on.
    const can = (x, y) => !(cur.x === x && cur.y === y) && o.isGrass(x, y);
    const go = (dir) => ({ dir, visible });
    const candidates = [];
    const random2 = () => go(candidates[Math.floor(rng() * 2)]);

    // Not getting trapped between you and a rock.
    for (const [rx, ry] of ROCKS) {
      if (prev.x === rx) {
        const safe = prev.y < ry ? mew.y <= ry : mew.y >= ry;
        if (!safe) {
          if (dx > 0 && mew.x + 1 === prev.x && can(mew.x + 1, mew.y)) return go("right");
          if (dx < 0 && mew.x - 1 === prev.x && can(mew.x - 1, mew.y)) return go("left");
          if (mew.x === prev.x) {
            if (dy > 0) { if (can(mew.x, mew.y - 1)) return go("up"); }
            else if (can(mew.x, mew.y + 1)) return go("down");
          }
        }
      }
      if (prev.y === ry) {
        const safe = prev.x < rx ? mew.x <= rx : mew.x >= rx;
        if (!safe) {
          if (dy > 0 && mew.y + 1 === prev.y && can(mew.x, mew.y + 1)) return go("down");
          if (dy < 0 && mew.y - 1 === prev.y && can(mew.x, mew.y - 1)) return go("up");
          if (mew.y === prev.y) {
            if (dx > 0) { if (can(mew.x - 1, mew.y)) return go("left"); }
            else if (can(mew.x + 1, mew.y)) return go("right");
          }
        }
      }
    }

    // Away from you, without getting closer (ShouldMewMove*): two ways that
    // both do, one of them at random.
    const north = (i) => dy > 0 && can(mew.x, mew.y - 1) && (candidates[i] = "up");
    const south = (i) => dy < 0 && can(mew.x, mew.y + 1) && (candidates[i] = "down");
    const east = (i) => dx < 0 && can(mew.x + 1, mew.y) && (candidates[i] = "right");
    const west = (i) => dx > 0 && can(mew.x - 1, mew.y) && (candidates[i] = "left");
    if (north(0)) return east(1) || west(1) ? random2() : go("up");
    if (south(0)) return east(1) || west(1) ? random2() : go("down");
    if (east(0)) return north(1) || south(1) ? random2() : go("right");
    if (west(0)) return north(1) || south(1) ? random2() : go("left");

    // Level with you: up or down, away first.
    if (dy === 0) {
      if (cur.y > mew.y && can(mew.x, mew.y - 1)) return go("up");
      if (cur.y < mew.y && can(mew.x, mew.y + 1)) return go("down");
      if (can(mew.x, mew.y - 1)) return go("up");
      if (can(mew.x, mew.y + 1)) return go("down");
    }
    if (dx === 0) {
      if (cur.x > mew.x && can(mew.x - 1, mew.y)) return go("left");
      if (cur.x < mew.x && can(mew.x + 1, mew.y)) return go("right");
      if (can(mew.x + 1, mew.y)) return go("right");
      if (can(mew.x - 1, mew.y)) return go("left");
    }
    // Anywhere it can (GetValidMewMoveDirection: picked by the step count).
    const any = ["up", "right", "down", "left"].filter((d) => can(mew.x + STEP[d][0], mew.y + STEP[d][1]));
    return go(any.length > 1 ? any[steps % any.length] : any[0] || null);
  }

  // Long grass (and tall grass) on a map: FireRed's MB_TALL_GRASS here.
  const isGrass = (mapName) => (x, y) => {
    const b = window.World.blockAt(mapName, x, y);
    return !!b.map && b.behavior === window.World.MB.TALL_GRASS;
  };

  window.Faraway = { ROCKS, mewStep, isGrass };
})();
