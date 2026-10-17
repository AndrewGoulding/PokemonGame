// Overworld rules: what's at a position, where a step goes, doors, map edges
// and wild encounters. No drawing here (see ui/overworld.js).
// Depends on: window.WORLD_MAPS (data/world-maps.js, built by tools/build-maps.js)
//
//   World.step({ map, x, y }, "up", occupied)   // -> { ok, map, x, y, jump, warp, blocked }
//   World.warpAt("PalletTown", 6, 7)            // the warp on a tile, if any
//   World.wildEncounter("Route1", rng)          // -> { species, level } or null (one roll)
//   World.stepEncounter(state, "MtMoon_1F", x, y, { allow })   // FireRed's check for a step (below)
//   World.step(pos, "left", occupied, { surf: true })   // surfing: water, or { dismount } onto land
//   World.fishingEncounter("Route12", "good-rod")      // -> { species, level, slot } or null
//                                                     (game/fishing.js picks the rod's slots by fishing level)

(function () {
  "use strict";

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  // Metatile behaviours (pret include/constants/metatile_behaviors.h).
  const MB = {
    TALL_GRASS: 0x02,
    // A floor switch a Strength boulder presses (Victory Road).
    STRENGTH_BUTTON: 0x20,
    JUMP_EAST: 0x38, JUMP_WEST: 0x39, JUMP_NORTH: 0x3a, JUMP_SOUTH: 0x3b,
    CAVE_DOOR: 0x60, LADDER: 0x61, EAST_ARROW_WARP: 0x62, WEST_ARROW_WARP: 0x63,
    NORTH_ARROW_WARP: 0x64, SOUTH_ARROW_WARP: 0x65, FALL_WARP: 0x66, REGULAR_WARP: 0x67,
    WARP_DOOR: 0x69, UP_ESCALATOR: 0x6a, DOWN_ESCALATOR: 0x6b,
    UP_RIGHT_STAIR_WARP: 0x6c, UP_LEFT_STAIR_WARP: 0x6d, DOWN_RIGHT_STAIR_WARP: 0x6e, DOWN_LEFT_STAIR_WARP: 0x6f,
    WATERFALL: 0x13,
    // The Rocket Hideout's spinning arrows (MB_SPIN_*) and the tile that stops you.
    SPIN_RIGHT: 0x54, SPIN_LEFT: 0x55, SPIN_UP: 0x56, SPIN_DOWN: 0x57, STOP_SPINNING: 0x58,
    COUNTER: 0x80, PC: 0x83,
    // Cycling Road's slope (MB_CYCLING_ROAD_PULL_DOWN, and its grass).
    CYCLING_ROAD_PULL_DOWN: 0xd0, CYCLING_ROAD_PULL_DOWN_GRASS: 0xd1,
    // The Seafoam Islands' fast currents (MB_*_CURRENT).
    EAST_CURRENT: 0x50, WEST_CURRENT: 0x51, NORTH_CURRENT: 0x52, SOUTH_CURRENT: 0x53,
    // Icefall Cave: ice you slip along (MB_ICE), and the thin ice that cracks
    // under you and the cracked ice that breaks (MB_THIN_ICE, MB_CRACKED_ICE).
    ICE: 0x23, THIN_ICE: 0x26, CRACKED_ICE: 0x27
  };
  const LEDGE = { right: MB.JUMP_EAST, left: MB.JUMP_WEST, up: MB.JUMP_NORTH, down: MB.JUMP_SOUTH };
  // Warps you trigger by stepping onto them (doors, stairs). Others, like the
  // mats inside buildings, trigger by walking off the edge while standing on them.
  const STEP_WARPS = new Set([MB.CAVE_DOOR, MB.LADDER, MB.FALL_WARP, MB.REGULAR_WARP, MB.WARP_DOOR,
    MB.UP_ESCALATOR, MB.DOWN_ESCALATOR]);
  // Stairs aren't stepped on to warp: standing on the bottom step, you press
  // toward them, right or left (FireRed's TryArrowWarp:
  // IsDirectionalStairWarpMetatileBehavior).
  const STAIR_DIR = { [MB.UP_RIGHT_STAIR_WARP]: "right", [MB.DOWN_RIGHT_STAIR_WARP]: "right",
    [MB.UP_LEFT_STAIR_WARP]: "left", [MB.DOWN_LEFT_STAIR_WARP]: "left" };
  const ARROW_DIR = { [MB.EAST_ARROW_WARP]: "right", [MB.WEST_ARROW_WARP]: "left",
    [MB.NORTH_ARROW_WARP]: "up", [MB.SOUTH_ARROW_WARP]: "down" };
  const isWater = (b) => b >= 0x10 && b <= 0x15;
  // What you can Surf on (sBehaviorSurfable: the waters, the waterfall, the
  // currents), and the waterfall, which only Waterfall goes up.
  const SURFABLE = new Set([0x10, 0x11, 0x12, 0x13, 0x15, 0x1a, 0x1b, 0x50, 0x51, 0x52, 0x53]);
  const isSurfable = (b) => SURFABLE.has(b);

  const map = (name) => window.WORLD_MAPS[name];

  // Where a connected map sits relative to `m`, in m's block coordinates.
  function connectionOrigin(m, c) {
    const n = map(c.map);
    if (c.direction === "up") return [c.offset, -n.height];
    if (c.direction === "down") return [c.offset, m.height];
    if (c.direction === "left") return [-n.width, c.offset];
    return [m.width, c.offset];
  }

  // The block at (x, y) of `mapName`, looking into connected maps past the edge.
  // Returns { map, x, y, collision, behavior, encounter } or a solid border block.
  function blockAt(mapName, x, y) {
    const m = map(mapName);
    if (x >= 0 && y >= 0 && x < m.width && y < m.height) {
      const i = y * m.width + x;
      return { map: mapName, x, y, collision: m.collision[i], elevation: m.elevation[i], behavior: m.behavior[i], encounter: m.encounter[i] };
    }
    for (const c of m.connections) {
      if (!c.map || !map(c.map)) continue;
      const [ox, oy] = connectionOrigin(m, c);
      const n = map(c.map), nx = x - ox, ny = y - oy;
      if (nx >= 0 && ny >= 0 && nx < n.width && ny < n.height) return blockAt(c.map, nx, ny);
    }
    return { map: null, x, y, collision: 1, elevation: 0, behavior: 0, encounter: 0, edge: true };
  }

  function warpAt(mapName, x, y) {
    const m = map(mapName);
    return m && m.warps.find((w) => w.x === x && w.y === y) || null;
  }

  // FireRed's dynamic warp (MAP_DYNAMIC: an elevator's way out), set by the
  // game: { map, x, y } — where you came in, or the floor you picked.
  let dynamicWarp = null;
  const setDynamicWarp = (t) => { dynamicWarp = t || null; };
  // Where a warp leads: its destination map and the destination warp's tile.
  function warpTarget(w) {
    if (w && w.mapConst === "MAP_DYNAMIC") {
      const d = dynamicWarp && map(dynamicWarp.map);
      if (!d) return null;
      const b = d.behavior[dynamicWarp.y * d.width + dynamicWarp.x];
      return { map: dynamicWarp.map, x: dynamicWarp.x, y: dynamicWarp.y, door: b === MB.WARP_DOOR || b === MB.CAVE_DOOR };
    }
    const dest = w && w.map && map(w.map);
    if (!dest) return null;
    const to = dest.warps[w.warp] || dest.warps[0];
    // Coming out through a door or a cave's mouth, you step out of it
    // (FireRed's door exit and Task_ExitNonAnimDoor).
    const behavior = dest.behavior[to.y * dest.width + to.x];
    // (Arriving by stairs, you stand on them facing away: ExitStairsMovement.)
    const facing = STAIR_DIR[behavior] ? OPPOSITE[STAIR_DIR[behavior]] : undefined;
    return { map: w.map, x: to.x, y: to.y, door: behavior === MB.WARP_DOOR || behavior === MB.CAVE_DOOR, facing };
  }

  // The map edge you'd walk off of, for a better message than a bump.
  function edgeConnection(mapName, x, y, dir) {
    const m = map(mapName);
    const side = { up: y === 0, down: y === m.height - 1, left: x === 0, right: x === m.width - 1 }[dir];
    if (!side) return null;
    return m.connections.find((c) => c.direction === dir) || null;
  }

  // One step from `pos` in `dir`. `occupied(map, x, y)` says whether a person stands there.
  // Returns { ok: true, map, x, y, jump?, warp? } or { ok: false, warp?, unbuilt? }.
  // Surfing (opts.surf): onto water, or { ok, dismount: true } onto land you
  // can step onto (FireRed's CanStopSurfing); a waterfall ahead is
  // { ok: false, waterfall: true }.
  function step(pos, dir, occupied, opts) {
    if (opts && opts.surf) return surfStep(pos, dir, occupied);
    const [dx, dy] = DIRS[dir];
    const here = blockAt(pos.map, pos.x, pos.y);
    const ahead = blockAt(pos.map, pos.x + dx, pos.y + dy);
    // Gen 3 elevation: you can't step between different heights, except from or
    // onto elevation 0 (transitions) and 15 (anything goes, e.g. bridges).
    const level = (b) => b.elevation;
    const sameHeight = (a, b) => level(a) === 0 || level(b) === 0 || level(a) === 15 || level(b) === 15 || level(a) === level(b);
    const free = (b) => b.map && !b.collision && !isWater(b.behavior) && sameHeight(here, b) && !(occupied && occupied(b.map, b.x, b.y));

    // Standing on a door mat (or another edge warp) and walking out through it:
    // in the mat's arrow direction, down if it has none, into something solid.
    const hereWarp = warpAt(pos.map, pos.x, pos.y);
    // On stairs, pressing toward them takes them.
    if (hereWarp && STAIR_DIR[here.behavior]) {
      if (dir !== STAIR_DIR[here.behavior]) { /* (walking off them) */ }
      else if (!hereWarp.map && hereWarp.mapConst !== "MAP_DYNAMIC") return { ok: false, unbuilt: hereWarp.mapConst };
      else return { ok: false, warp: warpTarget(hereWarp), stairs: true };
    }
    const exitDir = ARROW_DIR[here.behavior] || "down";
    if (hereWarp && !STEP_WARPS.has(here.behavior) && !STAIR_DIR[here.behavior] && dir === exitDir && !free(ahead)) {
      return { ok: false, warp: warpTarget(hereWarp) };
    }

    // Doors are solid: walking up into one opens it and goes inside.
    const aheadWarp = ahead.map && warpAt(ahead.map, ahead.x, ahead.y);
    if (aheadWarp && ahead.behavior === MB.WARP_DOOR && dir === "up") {
      // (A door into a map not built yet, as Johto's houses are: say so.)
      if (!aheadWarp.map && aheadWarp.mapConst && aheadWarp.mapConst !== "MAP_DYNAMIC") return { ok: false, door: true, unbuilt: aheadWarp.mapConst };
      return { ok: false, warp: warpTarget(aheadWarp), door: true };
    }

    // Jumping down a ledge.
    if (ahead.behavior === LEDGE[dir]) {
      const land = blockAt(pos.map, pos.x + dx * 2, pos.y + dy * 2);
      if (free(land)) return { ok: true, map: land.map, x: land.x, y: land.y, jump: true };
      return { ok: false };
    }

    if (!ahead.map) {
      const c = edgeConnection(pos.map, pos.x, pos.y, dir);
      return { ok: false, unbuilt: c && !c.map ? c.mapConst : null };
    }
    if (!free(ahead)) return { ok: false };
    const result = { ok: true, map: ahead.map, x: ahead.x, y: ahead.y };
    const w = warpAt(ahead.map, ahead.x, ahead.y);
    // A cave or doorway into a map that isn't built yet (Diglett's Cave).
    if (w && STEP_WARPS.has(ahead.behavior) && !w.map && w.mapConst !== "MAP_DYNAMIC") return { ok: false, unbuilt: w.mapConst };
    if (w && STEP_WARPS.has(ahead.behavior)) result.warp = warpTarget(w);
    // (A warp pad, MB_REGULAR_WARP: Saffron Gym's and Silph Co.'s teleporters.)
    if (result.warp && ahead.behavior === MB.REGULAR_WARP) result.warp.pad = true;
    return result;
  }

  function surfStep(pos, dir, occupied) {
    const [dx, dy] = DIRS[dir];
    const here = blockAt(pos.map, pos.x, pos.y);
    const ahead = blockAt(pos.map, pos.x + dx, pos.y + dy);
    if (!ahead.map) {
      const c = edgeConnection(pos.map, pos.x, pos.y, dir);
      return { ok: false, unbuilt: c && !c.map ? c.mapConst : null };
    }
    if (ahead.collision || (occupied && occupied(ahead.map, ahead.x, ahead.y))) return { ok: false };
    if (ahead.behavior === MB.WATERFALL) return { ok: false, waterfall: true };
    const sameHeight = here.elevation === ahead.elevation || [0, 15].includes(here.elevation) || [0, 15].includes(ahead.elevation);
    if (isSurfable(ahead.behavior)) return sameHeight ? { ok: true, map: ahead.map, x: ahead.x, y: ahead.y } : { ok: false };
    // Onto the shore: land at the height you walk at (3), or a tile with no height.
    if (ahead.elevation === 3 || ahead.elevation === 0 || ahead.elevation === 15) return { ok: true, map: ahead.map, x: ahead.x, y: ahead.y, dismount: true };
    return { ok: false };
  }
  // The water in front of `pos` you could start surfing on (FireRed's
  // IsPlayerFacingSurfableFishableWater), or false.
  function facingWater(pos, dir, occupied) {
    const [dx, dy] = DIRS[dir];
    const ahead = blockAt(pos.map, pos.x + dx, pos.y + dy);
    return !!ahead.map && !ahead.collision && isSurfable(ahead.behavior) && ahead.behavior !== MB.WATERFALL &&
      !(occupied && occupied(ahead.map, ahead.x, ahead.y));
  }

  // Whether a rod can be cast from `pos` facing `dir` (FireRed's CanFish):
  // never at a waterfall; on foot, at water you could start surfing on;
  // surfing, at open water.
  function canFish(pos, dir, surfing, occupied) {
    const [dx, dy] = DIRS[dir];
    const ahead = blockAt(pos.map, pos.x + dx, pos.y + dy);
    if (!ahead.map || ahead.behavior === MB.WATERFALL) return false;
    if (!surfing) return facingWater(pos, dir, occupied);
    return isSurfable(ahead.behavior) && !ahead.collision;
  }

  // ---------- Cycling Road ----------
  //
  // On the slope on the Bicycle (FireRed's bike.c, BikeInputHandler_Normal and
  // _Slope): you're pulled downhill. Pressing nothing or down, you coast south
  // fast (BikeTransition_Downhill: PlayerWalkFaster); pressing another way you
  // pedal that way at walking pace (BikeTransition_Uphill). Holding B you stay
  // put, or pedal at walking pace whichever way you press.
  // -> { dir, speed (pixels a frame), downhill } or null (stay where you are).
  const isPullDown = (b) => b === MB.CYCLING_ROAD_PULL_DOWN || b === MB.CYCLING_ROAD_PULL_DOWN_GRASS;
  const SLOPE_SPEED = 4, UPHILL_SPEED = 1;   // (MOVE_SPEED_FASTER, MOVE_SPEED_NORMAL)
  function slopeMove(dir, bHeld) {
    if (!bHeld && (!dir || dir === "down")) return { dir: "down", speed: SLOPE_SPEED, downhill: true };
    if (!dir) return null;
    return { dir, speed: UPHILL_SPEED, downhill: false };
  }

  // ---------- Currents ----------
  //
  // Surfing on a current (FireRed's ForcedMovement_Pushed*ByCurrent), you're
  // carried along its way (PlayerRideWaterCurrent, MOVE_SPEED_FAST_2) until
  // something stops you; then you can go where you like.
  const CURRENTS = { [MB.EAST_CURRENT]: "right", [MB.WEST_CURRENT]: "left", [MB.NORTH_CURRENT]: "up", [MB.SOUTH_CURRENT]: "down" };
  const CURRENT_SPEED = 3;
  const currentDir = (b) => CURRENTS[b] || null;
  // -> the step the current carries you from `pos`, or null (not on one, or stopped).
  function currentStep(pos, occupied) {
    const dir = currentDir(blockAt(pos.map, pos.x, pos.y).behavior);
    if (!dir) return null;
    const r = surfStep(pos, dir, occupied);
    return r.ok && !r.dismount ? Object.assign(r, { dir }) : null;
  }

  // ---------- Signs, people, triggers ----------

  const signAt = (mapName, x, y) => (map(mapName).signs || []).find((s) => s.x === x && s.y === y) || null;
  const triggersAt = (mapName, x, y) => (map(mapName).triggers || []).filter((t) => t.x === x && t.y === y);

  // ---------- Wild Pokémon ----------

  // Gen 3 encounter slots: 20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1 percent.
  const LAND_SLOT_WEIGHTS = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];

  function isGrass(b) { return b.behavior === MB.TALL_GRASS || b.behavior === MB.CYCLING_ROAD_PULL_DOWN_GRASS || b.encounter === 1; }

  // After a step onto (x, y): a wild Pokémon, or null. Gen 3: a land
  // encounter happens if Random() % 2880 < rate * 16.
  function wildEncounter(mapName, x, y, rng) {
    rng = rng || Math.random;
    const m = map(mapName);
    const b = blockAt(mapName, x, y);
    if (!m.wild || !isGrass(b)) return null;
    if (Math.floor(rng() * 2880) >= m.wild.rate * 16) return null;
    return pickWild(m, rng);
  }
  // Water and Rock Smash slots: 60, 30, 5, 4, 1 percent.
  const WATER_SLOT_WEIGHTS = [60, 30, 5, 4, 1];
  // A Pokémon from the map's slots (and its level): the grass's, or `table`'s
  // (the water's, the rocks').
  function pickWild(m, rng, table) {
    const t = table || m.wild, weights = table ? WATER_SLOT_WEIGHTS : LAND_SLOT_WEIGHTS;
    let roll = Math.floor(rng() * 100), slot = 0;
    while (slot < weights.length - 1 && roll >= weights[slot]) roll -= weights[slot++];
    const s = t.slots[slot];
    if (!s || !s.species) return null;
    // A slot where LeafGreen differs from FireRed: either version's Pokémon.
    const species = s.alt && rng() < 0.5 ? s.alt : s.species;
    // (`slot`: which one, for Tanoby's Unown, whose letter goes by it.)
    return { species, level: s.min + Math.floor(rng() * (s.max - s.min + 1)), slot };
  }

  // Fishing (FireRed's ChooseWildMonIndex_Fishing): the Old Rod's slots 0-1
  // (70, 30 percent), the Good Rod's 2-4 (60, 20, 20), the Super Rod's 5-9
  // (40, 40, 15, 4, 1). -> { species, level, slot } or null (no fishing here).
  const ROD_SLOTS = {
    "old-rod": [[0, 70], [1, 30]],
    "good-rod": [[2, 60], [3, 20], [4, 20]],
    "super-rod": [[5, 40], [6, 40], [7, 15], [8, 4], [9, 1]]
  };
  // (Johto's maps, from HeartGold and SoulSilver, have Gen 4's rods instead:
  // `rods`, five slots each, 40/40/15/4/1.)
  const GEN4_ROD_WEIGHTS = [40, 40, 15, 4, 1];
  // `weights` (optional) replaces the rod's slot percentages, in order.
  function fishingEncounter(mapName, rodId, rng, weights) {
    rng = rng || Math.random;
    const t = map(mapName).fishing;
    const slots = ROD_SLOTS[rodId] && (weights ? ROD_SLOTS[rodId].map(([slot], i) => [slot, weights[i]]) : ROD_SLOTS[rodId]);
    if (t && t.rods) {
      const r = t.rods[rodId], w = weights || GEN4_ROD_WEIGHTS;
      if (!r) return null;
      let roll = Math.floor(rng() * 100), k = 0;
      while (k < w.length - 1 && roll >= w[k]) roll -= w[k++];
      const s = r.slots[k];
      return s && s.species ? { species: s.species, level: s.min + Math.floor(rng() * (s.max - s.min + 1)), slot: k } : null;
    }
    if (!t || !slots) return null;
    let roll = Math.floor(rng() * 100), k = 0;
    while (k < slots.length - 1 && roll >= slots[k][1]) roll -= slots[k++][1];
    const slot = slots[k][0], s = t.slots[slot];
    if (!s || !s.species) return null;
    const species = s.alt && rng() < 0.5 ? s.alt : s.species;
    return { species, level: s.min + Math.floor(rng() * (s.max - s.min + 1)), slot };
  }

  // FireRed's check for a step (src/wild_encounter.c TryStandardWildEncounter),
  // keeping `state` ({ steps, buff, prev }: steps since the last encounter, the
  // rate built up by steps that didn't find one, and the last tile's
  // behaviour) from step to step:
  //  - a cooldown: until 8 - rate/10 steps (8 under a rate of 10, none from
  //    80) have passed since the last encounter, each step has only a 5%
  //    chance of going on;
  //  - stepping onto a different kind of ground, a 60% chance of going on;
  //  - then Random() % 1600 < rate * 16 + buff * 16 / 200;
  //  - a step that fails that roll, or whose Pokémon `allow` turns away (a
  //    Repel), adds the rate to the buff (or, with a Repel going, clears it);
  //    an encounter clears the buff and the steps.
  // Surfing (opts.surf), it's the map's water Pokémon on water; on the
  // Bicycle (opts.bike), the rate is 80% (DoWildEncounterRateTest).
  const MAX_ENCOUNTER_RATE = 1600;
  function stepEncounter(state, mapName, x, y, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const m = map(mapName), b = blockAt(mapName, x, y);
    const prev = state.prev;
    state.prev = b.behavior;
    const table = opts.surf ? m.water : m.wild;
    if (!table || !(opts.surf ? isSurfable(b.behavior) : isGrass(b))) return null;
    const rate = table.rate;
    // HandleWildEncounterCooldown
    const minSteps = rate >= 80 ? 0 : rate < 10 ? 8 : 8 - Math.floor(rate / 10);
    if ((state.steps | 0) < minSteps) {
      state.steps = (state.steps | 0) + 1;
      if (Math.floor(rng() * 100) >= 5) return null;
    }
    // StandardWildEncounter: a new kind of ground, then the rate test.
    if (prev != null && prev !== b.behavior && Math.floor(rng() * 100) >= 60) return null;
    const buffAdd = () => { state.buff = opts.repel ? 0 : (state.buff | 0) + rate; };
    const base = opts.bike ? Math.floor(rate * 16 * 80 / 100) : rate * 16;
    const chance = Math.min(MAX_ENCOUNTER_RATE, base + Math.floor((state.buff | 0) * 16 / 200));
    if (Math.floor(rng() * MAX_ENCOUNTER_RATE) >= chance) { buffAdd(); return null; }
    const mon = pickWild(m, rng, opts.surf ? m.water : null);
    if (!mon || (opts.allow && !opts.allow(mon))) { buffAdd(); return null; }
    state.buff = 0;
    state.steps = 0;
    return mon;
  }

  // Where someone could walk from `pos` on its own map, at most `maxDist`
  // steps (a breadth-first search over step(): no ledges, warps or other
  // maps; `occupied(map, x, y)` for tiles people stand on). -> a Map of
  // "x,y" -> { x, y, dist, prev ("x,y" of the tile before, or null) }.
  function walkable(pos, occupied, maxDist) {
    const seen = new Map([[pos.x + "," + pos.y, { x: pos.x, y: pos.y, dist: 0, prev: null }]]);
    const queue = [seen.get(pos.x + "," + pos.y)];
    while (queue.length) {
      const t = queue.shift();
      if (t.dist >= maxDist) continue;
      for (const dir of ["up", "down", "left", "right"]) {
        const r = step({ map: pos.map, x: t.x, y: t.y }, dir, occupied);
        if (!r.ok || r.jump || r.warp || r.map !== pos.map) continue;
        const key = r.x + "," + r.y;
        if (seen.has(key)) continue;
        const n = { x: r.x, y: r.y, dist: t.dist + 1, prev: t.x + "," + t.y };
        seen.set(key, n);
        queue.push(n);
      }
    }
    return seen;
  }
  // The steps ("up", "left", ...) along a walkable() tree from tile `key` back to its start.
  function pathBack(tree, key) {
    const dirs = [];
    for (let t = tree.get(key); t && t.prev; t = tree.get(t.prev)) {
      const p = tree.get(t.prev), dx = p.x - t.x, dy = p.y - t.y;
      dirs.push(dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up");
    }
    return dirs;
  }

  window.World = {
    walkable, pathBack,
    DIRS, OPPOSITE, MB, map, connectionOrigin, blockAt, warpAt, warpTarget, setDynamicWarp, step, facingWater, isSurfable,
    isPullDown, slopeMove, currentDir, currentStep, CURRENT_SPEED, signAt, triggersAt, isGrass, wildEncounter, stepEncounter, pickWild, LAND_SLOT_WEIGHTS, WATER_SLOT_WEIGHTS,
    canFish, fishingEncounter, ROD_SLOTS
  };
})();
