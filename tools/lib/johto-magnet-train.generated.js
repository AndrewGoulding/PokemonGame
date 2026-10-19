// The Magnet Train (tools/build-magnet-train.js): Saffron City's door into its station, and its stations' scripts as this game has them.
(function () {
  const W = window.WORLD_MAPS, J = window.JOHTO_SCRIPTS, saffron = W.SaffronCity, station = W["SaffronCity_MagnetTrainStation_1F"];
  if (!saffron || !station || !J || saffron.warps.some((w) => w.map === station.name)) return;
  // (The door: solid, as FireRed's are, walked up into.)
  saffron.warps.push({ x: 18, y: 14, map: station.name, warp: 0 });
  saffron.patches = Object.assign({}, saffron.patches, { magnettrain: { x: 17, y: 13, w: 2, h: 2, top: false, collision: [[18, 14, 1, 0x69]] } });
  for (const w of station.warps) if (w.mapConst === "MAP_SAFFRON") { w.map = "SaffronCity"; w.warp = saffron.warps.length - 1; delete w.mapConst; }
  // (On Kanto's Town Map, in Saffron City: data/town-map.js, loaded after this, has only FireRed's maps; ui/magnet-train.js adds these.)
  for (const m of [station.name, "SaffronCity_MagnetTrainStation_2F", "SaffronCity_MagnetTrainStation_2F_Empty"]) if (W[m]) W[m].townMapSection = "SAFFRON_CITY";
  // (No Pass: the gates let you through. Goldenrod's always runs.)
  for (const zone of ["T25R0501", "T11R0601"]) {
    const z = J.zones[zone];
    if (!z) continue;
    z.cmds = z.cmds.map((c) => (c[0] === "HasItem" && c[1] === "ITEM_PASS" ? ["SetVar", c[3], 1]
      : zone === "T25R0501" && c[0] === "GoToIfSet" && c[1] === "FLAG_RESTORED_POWER" ? ["GoTo", c[2]] : c));
  }
  // (Off the train, down to the station's floor, where its attendant sees you off: the scene goes on after its Warp.)
  for (const zone of ["T25R0502", "T11R0602"]) {
    const z = J.zones[zone];
    if (z) z.cmds = z.cmds.map((c) => (c[0] === "Warp" ? c.slice(0, 6).concat(["goes on"]) : c));
  }
  Object.assign(J.messages, {"msg_0535_T11R0601_00000":["I'm sorry, but the Magnet Train to\nJohto isn't running yet.","It's only for the Champion of the\nPokémon League."],"msg_0535_T11R0601_00001":["The Magnet Train is in service!","Passengers need to go through the\ngate for the automatic ticket check..."],"msg_0535_T11R0601_00004":["Ping...fwip!","This train is about to leave\nfor Goldenrod City."],"msg_0535_T11R0601_00010":["A little girl who's called Copycat\nlives in the house next door."],"msg_0587_T25R0501_00004":["Ping...fwip!","This train is about to leave\nfor Saffron City."]});
})();
