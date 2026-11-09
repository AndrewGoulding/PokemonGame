// Pyrite Town's Colosseum story, as Colosseum tells it (ui/game.js's pyriteWindmill, pyriteColosseumDesk and the rest):
// after Duking's friend Silva storms out on him, Silva rips a gear out of the windmill that powers the Colosseum; you
// find it in town (two worn gears are junk) and bring it back, the windmill's Chief puts it in, and Duking asks you to
// enter the Colosseum's knockout challenge. Win it and the "winner's gift" is Nore leading you into the Pyrite
// Building. After Miror B., Fateen, Pyrite's fortune-teller, sends you north to Agate. And Phenac Stadium's first
// visit, before Team Snagem's Wakin comes for you. Depends on: window.Orre, window.WORLD_MAPS.
//
// player.flags.orreGear: 1 the gear stolen (Silva gone from Duking's), 2 found, 3 back in (Duking's asked you to
// enter), 4 the challenge won (Nore's led you in: orreStory 24). orreWindmill: the Chief's asked you to find it.
// orreLobby: the lobby's rumour heard (Rui sends you to Cail). orreStadium: Phenac Stadium seen (Wakin comes after).
"use strict";

(function () {
  const Orre = window.Orre, W = window.WORLD_MAPS || {}, ID = (k) => "LOCALID_ORRE_" + k;
  const gear = (f) => f.orreGear | 0, story = (f) => f.orreStory | 0;
  // (map, key, x, y, facing, script, sprite, frames, visible)
  const PEOPLE = [
    ["PyriteTown", "WINDMILL_MAN", 12, 11, "face_left", "PyriteTown_EventScript_WindmillMan", "em_man_3", 9, (f) => gear(f) === 1],
    ["PyriteTown", "GEAR_REAL", 32, 20, "face_down", "PyriteTown_EventScript_Gear", "item_ball", 1, (f) => gear(f) === 1],
    ["PyriteTown", "GEAR_JUNK_1", 3, 9, "face_down", "PyriteTown_EventScript_JunkGear", "item_ball", 1, (f) => gear(f) >= 1 && gear(f) <= 2],
    ["PyriteTown", "GEAR_JUNK_2", 26, 3, "face_down", "PyriteTown_EventScript_JunkGear", "item_ball", 1, (f) => gear(f) >= 1 && gear(f) <= 2],
    ["PyriteTown", "FATEEN_OUT", 17, 25, "face_down", "PyriteTown_EventScript_FateenOut", "em_hex_maniac", 9, () => false],
    ["PyriteTown_Windmill", "WINDMILL_CHIEF", 5, 7, "face_up", "PyriteTown_Windmill_EventScript_Chief", "em_expert_m", 9, () => true],
    ["PyriteTown_Windmill", "WINDMILL_WORKER", 10, 8, "face_left", "PyriteTown_Windmill_EventScript_Worker", "worker_m", 10, () => true],
    ["PyriteTown_FortuneHouse", "FATEEN", 5, 4, "face_left", "PyriteTown_FortuneHouse_EventScript_Fateen", "em_hex_maniac", 9, (f) => story(f) !== 27],
    ["PyriteTown_FortuneHouse", "FATEEN_CUSTOMER", 7, 6, "face_up", "PyriteTown_FortuneHouse_EventScript_Customer", "em_man_3", 9, () => true],
    ["PyriteTown_FortuneHouse", "FATEEN_HELPER", 1, 3, "face_right", "PyriteTown_FortuneHouse_EventScript_Helper", "em_woman_2", 9, () => true]
  ];
  for (const [map, key, x, y, facing, script, sprite, frames, vis] of PEOPLE) {
    Orre.EXTRA_VISIBLE[ID(key)] = vis;
    const m = W[map];
    if (!m || m.people.some((p) => p.localId === ID(key))) continue;
    const ball = sprite === "item_ball";
    m.people.push(Object.assign({ id: Math.max(-1, ...m.people.map((p) => p.id)) + 1, x, y, movement: facing, rangeX: 0, rangeY: 0, script, flag: null,
      text: null, localId: ID(key), sprite, width: 16, height: ball ? 16 : 32, frames }, ball ? { inanimate: true } : {}));
  }
  // The scripts ui/game.js's pyriteExtra answers (and the scenes as you come in).
  const PYRITE_SCRIPTS = [...new Set(PEOPLE.map((p) => p[5]))].concat(["PyriteTown_Windmill_EventScript_Gears",
    "PyriteTown_Colosseum_EventScript_Fan", "PyriteTown_Colosseum_EventScript_Kid", "PhenacCity_Stadium_EventScript_Fan", "PhenacCity_Stadium_EventScript_Man",
    "enter:PyriteTown_Windmill", "enter:PyriteTown_PyriteBuilding_1F", "enter:PhenacCity_Stadium"]);
  // Whether coming in starts a scene: the windmill (the Chief's plea; the gear brought back), the Pyrite Building
  // (locked till Nore leads you in), Phenac Stadium's first visit (after the Mayor's heard Rui out), Fateen (after
  // Miror B.).
  function pyriteSceneDue(script, f) {
    const at = (name) => script === "arrive:" + name || script === "enter:" + name;
    if (script === "enter:PyriteTown_Windmill") return (gear(f) === 1 && !f.orreWindmill) || gear(f) === 2;
    if (script === "enter:PyriteTown_PyriteBuilding_1F") return story(f) >= 21 && story(f) < 24;
    if (script === "enter:PhenacCity_Stadium") return story(f) === 20 && (f.orreMayor | 0) >= 1 && !f.orreStadium;
    if (at("PyriteTown")) return story(f) === 27;
    return false;
  }
  Object.assign(Orre, { PYRITE_SCRIPTS, pyriteSceneDue });
})();
