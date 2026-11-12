// The Magnet Train between Goldenrod City and Saffron City, as in HeartGold
// and SoulSilver. tools/build-johto.js builds both stations (Goldenrod's,
// Johto's, and Saffron's, HGSS's Kanto map, region "kanto") and compiles
// their scripts (zones T25R0501-0503 and T11R0601-0603); this gives FireRed's
// Saffron City, which has no station, a door into it, and changes what HGSS's
// stations need:
//   - the north-west house of Saffron's top-left row, which has no door,
//     becomes the station: Goldenrod's station's building (this game's
//     picture of HGSS's), two windows and a strip of its roof narrower to fit
//     the row, as the map's patch "magnettrain", always on (ui/game.js), its
//     door leading in;
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
//   assets/world/maps/SaffronCity-patch-magnettrain.png, -top.png   the station (its roof's top, over people)
//   tools/lib/johto-magnet-train.generated.js   the door's warp and patch, and
//                       the scripts' changes; build-johto.js puts it at the
//                       end of data/johto-maps.js.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const mapsDir = path.join(root, "assets/world/maps");
// (The station: five tiles by five, over the house (four wide) and the
// pavement west of it, its door in the middle, on the row the houses' doors are on.)
const AT = { x: 16, y: 10, w: 5, h: 5 }, DOOR = { x: 18, y: 14 };
const STATION = "SaffronCity_MagnetTrainStation_1F";
// (The trains' doors on the stations' platforms: Heart & Soul's warps onto them, GoldenrodCity_TrainStation's
// and SaffronCity_TrainStation's, as the maps are cut out here: tools/data/hns-johto-maps.json's rects.)
const DOORS = [["GoldenrodCity_MagnetTrainStation_1F", 19, 5], [STATION, 30, 5]];

// The station's picture: Goldenrod's (112 by 91 pixels at (336, 261), its roof's
// top in the map's top layer) less its outer windows (16 pixels each side) and
// 16 rows of its roof, on Saffron's pavement. What's on the patch's top row is
// drawn over people, as the houses' roofs are.
const T = 16, SRC = { x: 336, y: 261, w: 112, h: 91 }, CUT_X = [[344, 360], [424, 440]], CUT_Y = [[280, 296]];
const png = (n) => readPng(path.join(mapsDir, n + ".png"));
const saffron = png("SaffronCity"), gold = png("GoldenrodCity"), goldTop = png("GoldenrodCity-top");
const kept = (from, len, cuts) => Array.from({ length: len }, (_, i) => from + i).filter((v) => !cuts.some(([a, b]) => v >= a && v < b));
const xs = kept(SRC.x, SRC.w, CUT_X), ys = kept(SRC.y, SRC.h, CUT_Y);
const PW = AT.w * T, PH = AT.h * T, img = new Uint8ClampedArray(PW * PH * 4), top = new Uint8ClampedArray(PW * PH * 4);
if (xs.length !== PW || ys.length > PH) throw new Error("the station doesn't fit its patch");
for (let y = 0; y < PH; y++) {
  const i = ((AT.y * T + y) * saffron.width + AT.x * T) * 4;
  img.set(saffron.rgba.slice(i, i + PW * 4), y * PW * 4);
}
const y0 = PH - ys.length;
ys.forEach((sy, j) => xs.forEach((sx, x) => {
  const s = (sy * gold.width + sx) * 4, d = ((y0 + j) * PW + x) * 4;
  // (Above the roof's scalloped edge, Goldenrod's ground: only the roof itself there.)
  const from = goldTop.rgba[s + 3] ? goldTop : sy >= 272 ? gold : null;
  if (!from) return;
  for (let c = 0; c < 3; c++) img[d + c] = from.rgba[s + c];
  img[d + 3] = 255;
  if (y0 + j < T) top.set(img.slice(d, d + 4), d);
}));
writePng(path.join(mapsDir, "SaffronCity-patch-magnettrain.png"), PW, PH, img);
writePng(path.join(mapsDir, "SaffronCity-patch-magnettrain-top.png"), PW, PH, top);
// (Solid all through, the door too, as FireRed's are, walked up into; behind its roof's top, the way round the back.)
const SOLID = [];
for (let y = AT.y + 1; y < AT.y + AT.h; y++) for (let x = AT.x; x < AT.x + AT.w; x++) SOLID.push(x === DOOR.x && y === DOOR.y ? [x, y, 1, 0x69] : [x, y, 1]);

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
  "  saffron.patches = Object.assign({}, saffron.patches, { magnettrain: { x: " + AT.x + ", y: " + AT.y + ", w: " + AT.w + ", h: " + AT.h + ", top: true, collision: " + JSON.stringify(SOLID) + " } });\n" +
  "  // (Its tiles so in the map's own data too, the patch always on: the door's a door wherever the map's read, coming back out of it too.)\n" +
  "  for (const [x, y, c, b] of saffron.patches.magnettrain.collision) { saffron.collision[y * saffron.width + x] = c; if (b != null) saffron.behavior[y * saffron.width + x] = b; }\n" +
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
console.log("wrote", path.relative(root, file), "and assets/world/maps/SaffronCity-patch-magnettrain.png, -top.png");
