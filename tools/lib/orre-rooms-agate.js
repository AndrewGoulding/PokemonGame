// Agate Village's Day-Care: Colosseum's Day-Care Lady (its M3_houseD_1F), in the cottage on the village's south-west
// terrace (its door at 7,22, drawn by tools/build-orre-layouts.js), inside Emerald's Day-Care (Route 117's).
// Its lady is placed by game/orre-daycare.js.
"use strict";

module.exports = function ({ maps, changed, clone, room }) {
  const agate = changed.AgateVillage || clone(maps.AgateVillage), NAME = "AgateVillage_DayCare";
  let index = agate.warps.findIndex((w) => w.map === NAME);
  if (index < 0) { index = agate.warps.length; agate.warps.push({ x: 7, y: 22, map: NAME, warp: 0 }); }
  changed.AgateVillage = agate;
  changed[NAME] = room("Route117_PokemonDayCare", NAME, "Agate Village", agate.music,
    [{ x: 2, y: 8, map: "AgateVillage", warp: index }, { x: 3, y: 8, map: "AgateVillage", warp: index }]);
};
