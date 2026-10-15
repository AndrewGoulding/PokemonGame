// The Seafoam Islands, as in FireRed: Strength boulders that drop through
// holes to the floor below, and the fast currents on B3F and B4F that stop
// for good once two boulders have dropped into each one's way.
// Depends on: nothing (works on player.flags).
//
//   Seafoam.hidden(flags, "FLAG_HIDE_SEAFOAM_B1F_BOULDER_1")   // is that boulder gone?
//   Seafoam.drop(flags, boulder)            // it fell through a hole: the one below appears
//   Seafoam.route20(flags)                  // Route20_OnTransition: the boulders back up top
//   Seafoam.transition(flags, map)          // B3F/B4F_OnTransition: the current stopped?
//   Seafoam.patches(flags, map)             // the map patches on: "stopped", "calm"
//   Seafoam.fallRide(flags, map, x)         // fallen onto the water: the current's ride, or null
//
// FireRed keeps which boulders are where in event flags (FLAG_HIDE_SEAFOAM_*),
// here in flags.seafoam ({ flag: hidden }), and whether each current is
// stopped in FLAG_STOPPED_SEAFOAM_B3F/B4F_CURRENT (flags.stoppedSeafoamB3F/B4F).

(function () {
  "use strict";

  const BOULDER = (floor, n) => "FLAG_HIDE_SEAFOAM_" + floor + "_BOULDER_" + n;
  // Where the boulders start (and are put back each time you come through
  // Route 20 while the currents still run): the two on 1F to push down, and
  // the four on B3F; those on the floors below appear only as they drop.
  const START_SHOWN = [BOULDER("1F", 1), BOULDER("1F", 2), BOULDER("B3F", 3), BOULDER("B3F", 4), BOULDER("B3F", 5), BOULDER("B3F", 6)];
  const isBoulderFlag = (flag) => /^FLAG_HIDE_SEAFOAM_\w+_BOULDER_\d$/.test(flag || "");

  function hidden(flags, flag) {
    const s = flags.seafoam;
    return s && flag in s ? !!s[flag] : !START_SHOWN.includes(flag);
  }
  function set(flags, flag, hide) { (flags.seafoam || (flags.seafoam = {}))[flag] = hide; }

  // A boulder pushed onto a hole falls through (HandleBoulderFallThroughHole):
  // it's gone from here, and the boulder below (its reveal flag) is there.
  function drop(flags, boulder) {
    set(flags, boulder.flag, true);
    if (boulder.reveal) set(flags, boulder.reveal, false);
  }

  const stopped = (flags, floor) => !!flags["stoppedSeafoam" + floor];
  // Both boulders down on B3F (or B4F), in the current's way.
  const blocked = (flags, floor) => !hidden(flags, BOULDER(floor, 1)) && !hidden(flags, BOULDER(floor, 2));

  // Route20_OnTransition: while a current still runs, its boulders go back
  // where they started.
  function route20(flags) {
    if (!stopped(flags, "B3F")) {
      for (const n of [1, 2]) set(flags, BOULDER("1F", n), false);
      for (const fl of ["B1F", "B2F", "B3F"]) for (const n of [1, 2]) set(flags, BOULDER(fl, n), true);
    }
    if (!stopped(flags, "B4F")) {
      for (const n of [3, 4, 5, 6]) set(flags, BOULDER("B3F", n), false);
      for (const n of [1, 2]) set(flags, BOULDER("B4F", n), true);
    }
  }

  // SeafoamIslands_B3F/B4F_OnTransition: with both its boulders down there, the
  // floor's current stops, for good (FLAG_STOPPED_SEAFOAM_*_CURRENT).
  function transition(flags, map) {
    const floor = { SeafoamIslands_B3F: "B3F", SeafoamIslands_B4F: "B4F" }[map];
    if (floor && !stopped(flags, floor) && blocked(flags, floor)) flags["stoppedSeafoam" + floor] = true;
  }

  // The patches on: the current-stopped layout (setmaplayoutindex
  // LAYOUT_SEAFOAM_ISLANDS_B3F/B4F_CURRENT_STOPPED), and on B4F the calm water
  // by the stairs while both its boulders are there (_SetCalmWaterNearStairs).
  function patches(flags, map) {
    if (map === "SeafoamIslands_B3F") return stopped(flags, "B3F") ? ["stopped"] : [];
    if (map === "SeafoamIslands_B4F") return (stopped(flags, "B4F") ? ["stopped"] : []).concat(blocked(flags, "B4F") ? ["calm"] : []);
    return [];
  }

  // Fallen through a hole onto the water of B3F or B4F (FireRed's
  // _EventScript_EnterByFalling): unless both of the floor's boulders are in
  // the way, the current carries you off. On B3F it takes you down to B4F
  // (where you come up the current from below, VAR_MAP_SCENE_SEAFOAM_ISLANDS_B4F);
  // on B4F it leaves you by the shore and you climb out (SeafoamIslandsB4F_CurrentDumpsPlayerOnLand).
  // -> { moves, warp?: { map, x, y }, dismount?: "up" } or null.
  const repeat = (n, cmd) => Array(n).fill(cmd);
  function fallRide(flags, map, x) {
    if (map === "SeafoamIslands_B3F") {
      if (blocked(flags, "B3F")) return null;
      const far = x < 24;
      return { moves: [].concat(repeat(4, "walk_fast_down"), repeat(far ? 3 : 2, "walk_fast_right"), repeat(6, "walk_fast_down")),
        warp: { map: "SeafoamIslands_B4F", x: 27, y: 21 } };
    }
    if (map === "SeafoamIslands_B4F") {
      if (blocked(flags, "B4F")) return null;
      const far = x < 9;
      return { moves: [].concat(repeat(3, "walk_up"), repeat(far ? 4 : 3, "walk_right"), ["walk_up"]), dismount: "up" };
    }
    return null;
  }
  // Coming up B4F's current from B3F (SeafoamIslands_B4F_EventScript_EnterOnCurrent).
  const ENTER_B4F_ON_CURRENT = repeat(3, "walk_fast_up");

  window.Seafoam = { BOULDER, START_SHOWN, isBoulderFlag, hidden, drop, stopped, blocked, route20, transition, patches, fallRide, ENTER_B4F_ON_CURRENT };
})();
