// Pyrite Town's rooms Colosseum has that the base maps don't (tools/build-orre-layouts.js runs this):
// - the windmill (Colosseum's M2_windmill_1F): its machine room, Mt. Chimney's cable car station (its consoles and
//   gears), in at a door on the windmill's west side by the chasm; the gears are signs along its back wall;
// - Fateen's fortune-telling chamber (M2_uranai_1F): Cozmo's house in Fallarbor (a table, shelves of books), behind
//   the domed shop's door in the lower town that was locked.
"use strict";

module.exports = function ({ changed, clone, room }) {
  const P = changed.PyriteTown;
  if (!P) return;
  const add = (x, y, map) => { P.warps.push({ x, y, map, warp: 0 }); return P.warps.length - 1; };
  // (The windmill's door: west of it, at the chasm's lip; its gear room.)
  const windmill = add(8, 10, "PyriteTown_Windmill");
  const W = room("MtChimney_CableCarStation", "PyriteTown_Windmill", "Pyrite Town", P.music, [{ x: 6, y: 11, map: "PyriteTown", warp: windmill }, { x: 7, y: 11, map: "PyriteTown", warp: windmill }]);
  W.signs = [2, 4, 9, 11].map((x) => ({ x, y: 6, script: "PyriteTown_Windmill_EventScript_Gears", text: null }));
  W.people = [];
  changed[W.name] = W;
  // (Fateen's: the locked door of the domed building in the lower town opens.)
  const fateen = add(6, 16, "PyriteTown_FortuneHouse");
  P.signs = P.signs.filter((s) => !(s.x === 6 && s.y === 16));
  const F = room("FallarborTown_CozmosHouse", "PyriteTown_FortuneHouse", "Pyrite Town", P.music, [{ x: 3, y: 8, map: "PyriteTown", warp: fateen }, { x: 4, y: 8, map: "PyriteTown", warp: fateen }]);
  F.signs = [{ x: 3, y: 1, script: "PyriteTown_FortuneHouse_EventScript_Shelves", text: ["The shelves are lined with books on\nfortune-telling."] }];
  F.people = [];
  changed[F.name] = F;
};
