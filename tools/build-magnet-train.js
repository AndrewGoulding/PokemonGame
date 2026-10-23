// The Magnet Train between Goldenrod City and Saffron City, as in HeartGold
// and SoulSilver. tools/build-johto.js builds both stations (Goldenrod's,
// Johto's, and Saffron's, HGSS's Kanto map, region "kanto") and compiles
// their scripts (zones T25R0501-0503 and T11R0601-0603); this gives FireRed's
// Saffron City, which has no station, a door into it, and changes what HGSS's
// stations need:
//   - the north-west house of Saffron's top-left row, which has no door, gets
//     one (its neighbour's, the Copycat's house's, as the map's patch
//     "magnettrain", always on: ui/game.js), leading into the station;
//   - no Magnet Train Pass: the ticket gates let you through (HasItem
//     ITEM_PASS, always yes; the gates' "Here is your Pass back." left out);
//   - Goldenrod's station always runs (where HGSS waits for Kanto's Power
//     Plant, FLAG_RESTORED_POWER), and Saffron's only once you're the
//     Champion: ui/magnet-train.js sets FLAG_RESTORED_POWER as you go in,
//     and its policeman says so until then;
//   - Heart & Soul's stations have their trains on the platform, past the
//     gate: their doors are walked up into (ui/game.js's magnetTrainBoard);
//   - off the train, the platform's scene goes on after its Warp down to the
//     station's floor (ui/johto-script.js stops a scene at a Warp, unless it
//     "goes on"), so its attendant sees you off ("We have arrived at ...").
// The ride (HGSS's ScrCmd_722) is ui/magnet-train.js's.
//
//   node tools/build-magnet-train.js
//
// Writes:
//   assets/world/maps/SaffronCity-patch-magnettrain.png   the station's door
//   tools/lib/johto-magnet-train.generated.js   the door's warp and patch, and
//                       the scripts' changes; build-johto.js puts it at the
//                       end of data/johto-maps.js.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const mapsDir = path.join(root, "assets/world/maps");
// (The house's door: where the Copycat's house next door has its own, one row
// of houses, four tiles each, so the same tiles one house to the left.)
const DOOR = { x: 18, y: 14 }, FROM = { x: 22, y: 14 };
const STATION = "SaffronCity_MagnetTrainStation_1F";
// (The trains' doors on the stations' platforms: Heart & Soul's warps onto them, GoldenrodCity_TrainStation's
// and SaffronCity_TrainStation's, as the maps are cut out here: tools/data/hns-johto-maps.json's rects.)
const DOORS = [["GoldenrodCity_MagnetTrainStation_1F", 19, 5], [STATION, 30, 5]];

// The door's picture: the Copycat's house's door and the wall round it (2x2 tiles).
const T = 16, saffron = readPng(path.join(mapsDir, "SaffronCity.png"));
const img = new Uint8ClampedArray(2 * T * 2 * T * 4);
for (let y = 0; y < 2 * T; y++) {
  const i = ((FROM.y - 1) * T + y) * saffron.width + (FROM.x - 1) * T;
  img.set(saffron.rgba.slice(i * 4, (i + 2 * T) * 4), y * 2 * T * 4);
}
writePng(path.join(mapsDir, "SaffronCity-patch-magnettrain.png"), 2 * T, 2 * T, img);

// What the stations' people say that's changed: Saffron's policeman until
// you're Champion (HGSS's is about the Power Plant), the gates (no Pass), and
// the Copycat's house, which is still there, next door.
const TEXT = {
  msg_0535_T11R0601_00000: ["I'm sorry, but the Magnet Train to\nJohto isn't running yet.", "It's only for the Champion of the\nPokémon League."],
  msg_0535_T11R0601_00001: ["The Magnet Train is in service!", "Passengers need to go through the\ngate for the automatic ticket check..."],
  msg_0535_T11R0601_00004: ["Ping...fwip!", "This train is about to leave\nfor Goldenrod City."],
  msg_0535_T11R0601_00010: ["A little girl who's called Copycat\nlives in the house next door."],
  msg_0587_T25R0501_00004: ["Ping...fwip!", "This train is about to leave\nfor Saffron City."]
};

const js = "// The Magnet Train (tools/build-magnet-train.js): Saffron City's door into its station, and its stations' scripts as this game has them.\n" +
  "(function () {\n" +
  "  const W = window.WORLD_MAPS, J = window.JOHTO_SCRIPTS, saffron = W.SaffronCity, station = W[" + JSON.stringify(STATION) + "];\n" +
  "  if (!saffron || !station || !J || saffron.warps.some((w) => w.map === station.name)) return;\n" +
  "  // (The door: solid, as FireRed's are, walked up into.)\n" +
  "  saffron.warps.push({ x: " + DOOR.x + ", y: " + DOOR.y + ", map: station.name, warp: 0 });\n" +
  "  saffron.patches = Object.assign({}, saffron.patches, { magnettrain: { x: " + (DOOR.x - 1) + ", y: " + (DOOR.y - 1) + ", w: 2, h: 2, top: false, collision: [[" + DOOR.x + ", " + DOOR.y + ", 1, 0x69]] } });\n" +
  "  for (const w of station.warps) if (w.mapConst === \"MAP_SAFFRON\") { w.map = \"SaffronCity\"; w.warp = saffron.warps.length - 1; delete w.mapConst; }\n" +
  "  // (On Kanto's Town Map, in Saffron City: data/town-map.js, loaded after this, has only FireRed's maps; ui/magnet-train.js adds these.)\n" +
  "  for (const m of [station.name, \"SaffronCity_MagnetTrainStation_2F\", \"SaffronCity_MagnetTrainStation_2F_Empty\"]) if (W[m]) W[m].townMapSection = \"SAFFRON_CITY\";\n" +
  "  // (No Pass: the gates let you through. Goldenrod's always runs.)\n" +
  "  for (const zone of [\"T25R0501\", \"T11R0601\"]) {\n" +
  "    const z = J.zones[zone];\n" +
  "    if (!z) continue;\n" +
  "    z.cmds = z.cmds.map((c) => (c[0] === \"HasItem\" && c[1] === \"ITEM_PASS\" ? [\"SetVar\", c[3], 1]\n" +
  "      : zone === \"T25R0501\" && c[0] === \"GoToIfSet\" && c[1] === \"FLAG_RESTORED_POWER\" ? [\"GoTo\", c[2]] : c));\n" +
  "  }\n" +
  "  // (The trains' doors, Heart & Soul's, walked up into from the platform: ui/game.js's magnetTrainBoard.)\n" +
  "  for (const [name, x, y] of " + JSON.stringify(DOORS) + ") {\n" +
  "    const m = W[name];\n" +
  "    if (!m) continue;\n" +
  "    m.collision[y * m.width + x] = 0;\n" +
  "    m.triggers = (m.triggers || []).concat([{ x, y, script: \"Johto_MagnetTrain\" }]);\n" +
  "  }\n" +
  "  // (Off the train, down to the station's floor, where its attendant sees you off: the scene goes on after its Warp.)\n" +
  "  for (const zone of [\"T25R0502\", \"T11R0602\"]) {\n" +
  "    const z = J.zones[zone];\n" +
  "    if (z) z.cmds = z.cmds.map((c) => (c[0] === \"Warp\" ? c.slice(0, 6).concat([\"goes on\"]) : c));\n" +
  "  }\n" +
  "  Object.assign(J.messages, " + JSON.stringify(TEXT) + ");\n" +
  "})();\n";
const file = path.join(__dirname, "lib/johto-magnet-train.generated.js");
fs.writeFileSync(file, js);
console.log("wrote", path.relative(root, file), "and assets/world/maps/SaffronCity-patch-magnettrain.png");
