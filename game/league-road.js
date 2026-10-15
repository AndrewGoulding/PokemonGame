// The way to the Pokémon League, as in FireRed: Viridian Gym's locked door,
// the badge guards at Route 22's League gate and along Route 23, and Victory
// Road's rock barriers that Strength boulders open from floor switches.
// Depends on: nothing (works on player.badges and player.flags).
//
//   LeagueRoad.gymOpen(badges)                 // Viridian Gym's door unlocked?
//   LeagueRoad.scene(flags)                    // the last guard you've shown a Badge (0..8)
//   LeagueRoad.guardStops(flags, k)            // does guard k's trigger stop you?
//   LeagueRoad.show(flags, badges, k)          // show guard k your Badge: passed?
//   LeagueRoad.pressSwitch(flags, map, trigger)  // a boulder on a floor switch: pressed now?
//   LeagueRoad.barriers(flags, map, patchNames)  // the rock barriers still up on a floor
//   LeagueRoad.dropBoulder(flags) / reset(flags) // 3F's boulder down the hole / Route 23
//
// FireRed keeps the guards' progress in VAR_MAP_SCENE_ROUTE23 (flags.route23Scene
// here; an older save's flags.route23Guard is the gate's, 1), and Victory Road's
// in VAR_MAP_SCENE_VICTORY_ROAD_1F, .._2F_BOULDER1/2, .._3F and
// FLAG_HIDE_VICTORY_ROAD_2F/3F_BOULDER (flags.victoryRoad: { "1F": true,
// "2F1": true, ..., dropped: true }).

(function () {
  "use strict";

  // The Badges in order: guard k (1 at the League gate, 2..8 on Route 23) checks the k-th.
  const BADGES = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
  const NAMES = ["Boulder", "Cascade", "Thunder", "Rainbow", "Soul", "Marsh", "Volcano", "Earth"];

  // ViridianCity_EventScript_TryUnlockGym: the Cascade to the Volcano Badge
  // (FireRed doesn't check the Boulder Badge).
  const gymOpen = (badges) => BADGES.slice(1, 7).every((b) => badges.includes(b));

  const scene = (flags) => flags.route23Scene || (flags.route23Guard ? 1 : 0);
  // Each guard's trigger runs only while VAR_MAP_SCENE_ROUTE23 is the one before his.
  const guardStops = (flags, k) => scene(flags) === k - 1;
  // Route23_EventScript_Check<Badge>Badge: with the Badge, VAR_MAP_SCENE_ROUTE23
  // becomes his number (copyvar), whatever it was.
  function show(flags, badges, k) {
    if (!badges.includes(BADGES[k - 1])) return false;
    flags.route23Scene = k;
    delete flags.route23Guard;
    return true;
  }

  // Victory Road's floor switches: VictoryRoad_<floor>_EventScript_FloorSwitch<n>.
  function switchKey(trigger) {
    const m = trigger && /^VictoryRoad_(\dF)_EventScript_FloorSwitch(\d?)$/.exec(trigger.script);
    return m ? m[1] + m[2] : null;
  }
  function pressSwitch(flags, map, trigger) {
    const key = switchKey(trigger);
    if (!key || !map.startsWith("VictoryRoad_")) return false;
    const vr = flags.victoryRoad || (flags.victoryRoad = {});
    if (vr[key]) return false;
    vr[key] = true;
    return true;
  }
  // A floor's "barrier" patches (2F's "barrier1" and "barrier2"), less those
  // whose switch is pressed.
  function barriers(flags, map, patchNames) {
    const m = /^VictoryRoad_(\dF)$/.exec(map), vr = flags.victoryRoad || {};
    if (!m) return [];
    return patchNames.filter((p) => /^barrier\d?$/.test(p) && !vr[m[1] + p.replace("barrier", "")]);
  }
  // 3F's boulder through the hole by 2F's stairs: on 2F now.
  function dropBoulder(flags) { (flags.victoryRoad || (flags.victoryRoad = {})).dropped = true; }
  const dropped = (flags) => !!(flags.victoryRoad && flags.victoryRoad.dropped);
  // Route23_OnTransition: the barriers back up, the boulders back.
  function reset(flags) { delete flags.victoryRoad; }

  window.LeagueRoad = { BADGES, NAMES, gymOpen, scene, guardStops, show, switchKey, pressSwitch, barriers, dropBoulder, dropped, reset };
})();
