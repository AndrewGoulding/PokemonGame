// The Celadon Boutique, this game's own: Kanto's clothes shop (game/team-fashion.js's
// boutiques.kanto), in a building of its own on Celadon City's main street, where FireRed
// has a row of houses with no doors, west of the Pokémon Center.
//   - the building: Goldenrod's Bike Shop's (this game's picture of HGSS's: an awning over
//     a glass door and a shop window in a brick front), less a row of its windows and a
//     strip of its roof to stand in the row, as Celadon City's patch "boutique", always on
//     (ui/game.js's mapPatches), over the row's first house; its door walked up into, its
//     window read as its sign;
//   - the room: Lavender Town's Poké Mart's (a counter with a clerk's place behind it),
//     its blue floor and counters turned rose, a map of its own, CeladonCity_Boutique; the
//     boutique's clerk stands behind the counter (team-fashion.js's `at`) and sells from
//     FireRed's Mart screen (ui/boutique-mart.js).
//
//   node tools/build-celadon-boutique.js
//
// Writes:
//   assets/world/maps/CeladonCity-patch-boutique.png, -top.png   the building
//   assets/world/maps/CeladonCity_Boutique.png, -top.png, -border.png   the room
//   data/celadon-boutique.js   the room's map, the door's warp, the patch and the sign
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const mapsDir = path.join(root, "assets/world/maps");
const png = (n) => readPng(path.join(mapsDir, n + ".png"));
const T = 16, ROOM = "CeladonCity_Boutique", FROM_ROOM = "LavenderTown_Mart";

// ---- The building ----
// (Four tiles by six over the house at (34, 8)-(37, 11) and the two rows behind its roof,
// walked behind as the row's roofs are; its door under the awning, its window beside it.)
const AT = { x: 34, y: 6, w: 4, h: 6 }, DOOR = { x: 35, y: 11 }, SIGN = { x: 36, y: 11 }, SOLID_FROM = 8;
// (Goldenrod's Bike Shop: 64 by 128 pixels at (688, 496). Cut: 16 rows of its roof's
// shutter, and its lower row of windows.)
const SRC = { x: 688, y: 496, w: 64, h: 128 }, CUT_Y = [[508, 524], [570, 586]];
const celadon = png("CeladonCity"), gold = png("GoldenrodCity"), goldTop = png("GoldenrodCity-top");
const ys = Array.from({ length: SRC.h }, (_, i) => SRC.y + i).filter((v) => !CUT_Y.some(([a, b]) => v >= a && v < b));
const PW = AT.w * T, PH = AT.h * T;
if (SRC.w !== PW || ys.length !== PH) throw new Error("the boutique doesn't fit its patch");
const img = new Uint8ClampedArray(PW * PH * 4), top = new Uint8ClampedArray(PW * PH * 4);
const px = (p, x, y) => { const i = (y * p.width + x) * 4; return p.rgba.slice(i, i + 4); };
// (Goldenrod's building, its top layer over its base.)
const shop = new Uint8ClampedArray(PW * PH * 4);
ys.forEach((sy, y) => { for (let x = 0; x < PW; x++) { const t = px(goldTop, SRC.x + x, sy); shop.set(t[3] ? t : px(gold, SRC.x + x, sy), (y * PW + x) * 4); } });
// (Goldenrod's paving at its cut-off corners: see-through. Its colours: those of the paving below the shop.)
const paving = new Set();
for (let y = SRC.y + SRC.h + 2; y < SRC.y + SRC.h + 8; y++) for (let x = SRC.x + 12; x < SRC.x + 52; x++) paving.add(px(gold, x, y).join());
const clear = new Uint8Array(PW * PH), stack = [];
for (let y = PH - 24; y < PH; y++) stack.push([0, y], [PW - 1, y]);
for (let x = 0; x < PW; x++) stack.push([x, PH - 1]);
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < PH - 24 || x >= PW || y >= PH || clear[y * PW + x] || !paving.has(shop.slice((y * PW + x) * 4, (y * PW + x) * 4 + 4).join())) continue;
  clear[y * PW + x] = 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
// (Under it: Celadon's ground behind the roofs as it is; where the house stood, the grass in front of it.)
for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
  const d = (y * PW + x) * 4, my = AT.y * T + y;
  const under = my < SOLID_FROM * T ? px(celadon, AT.x * T + x, my) : px(celadon, (AT.x - 1) * T + (x % T), (AT.y + AT.h) * T + (y % T));
  img.set(clear[y * PW + x] ? under : shop.slice(d, d + 4), d);
  img[d + 3] = 255;
  if (my < SOLID_FROM * T) top.set(img.slice(d, d + 4), d);
}
writePng(path.join(mapsDir, "CeladonCity-patch-boutique.png"), PW, PH, img);
writePng(path.join(mapsDir, "CeladonCity-patch-boutique-top.png"), PW, PH, top);
const collision = [];
for (let y = SOLID_FROM; y < AT.y + AT.h; y++) for (let x = AT.x; x < AT.x + AT.w; x++)
  collision.push(x === DOOR.x && y === DOOR.y ? [x, y, 1, 0x69] : x === SIGN.x && y === SIGN.y ? [x, y, 1, 0x84] : [x, y, 1, 0]);

// ---- The room ----
// (The Mart's blues, its floor, counters and cases: rose. Hue 190-260 degrees, turned to 335.)
function rose(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn;
  if (!c) return [r, g, b];
  let h = mx === r ? ((g - b) / c + 6) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4;
  h *= 60;
  if (h < 190 || h > 260 || c / mx < 0.12) return [r, g, b];
  const H = 335 / 60, s = (c / mx) * 0.62, v = Math.min(255, mx * 1.04), C = v * s, X = C * (1 - Math.abs(H % 2 - 1)), m = v - C;
  const [R, G, B] = H < 1 ? [C, X, 0] : H < 2 ? [X, C, 0] : H < 3 ? [0, C, X] : H < 4 ? [0, X, C] : H < 5 ? [X, 0, C] : [C, 0, X];
  return [Math.round(R + m), Math.round(G + m), Math.round(B + m)];
}
for (const part of ["", "-top", "-border"]) {
  const src = png(FROM_ROOM + part), out = new Uint8ClampedArray(src.rgba);
  for (let i = 0; i < out.length; i += 4) if (out[i + 3]) out.set(rose(out[i], out[i + 1], out[i + 2]), i);
  writePng(path.join(mapsDir, ROOM + part + ".png"), src.width, src.height, out);
}

const SHOPPERS = [
  { x: 6, y: 2, movement: "look_around", sprite: "beauty", frames: 10, text: ["The Celadon Plaid Skirt goes with\neverything. I own it in… well,\nit only comes in green."] },
  { x: 9, y: 5, movement: "face_left_and_right", sprite: "lass", frames: 10, text: ["She used to have a corner of the\nDepartment Store's second floor.", "Now she has a whole shop!"] }
].map((p, i) => Object.assign({ id: i, rangeX: 1, rangeY: 1, script: ROOM + "_EventScript_Shopper" + (i + 1), flag: null, width: 16, height: 32 }, p));

const js = "// The Celadon Boutique (tools/build-celadon-boutique.js): its room, and its building and door in Celadon City.\n" +
  "(function () {\n" +
  "  const W = window.WORLD_MAPS, city = W && W.CeladonCity, src = W && W[" + JSON.stringify(FROM_ROOM) + "], ROOM = " + JSON.stringify(ROOM) + ";\n" +
  "  if (!city || !src || W[ROOM]) return;\n" +
  "  // (The door: solid, as FireRed's are, walked up into.)\n" +
  "  city.warps.push({ x: " + DOOR.x + ", y: " + DOOR.y + ", map: ROOM, warp: 1 });   // (onto the middle of its mat)\n" +
  "  const out = city.warps.length - 1;\n" +
  "  city.patches = Object.assign({}, city.patches, { boutique: { x: " + AT.x + ", y: " + AT.y + ", w: " + AT.w + ", h: " + AT.h + ", top: true, collision: " + JSON.stringify(collision) + " } });\n" +
  "  // (Its tiles so in the map's own data too, the patch always on: the door's a door wherever the map's read, coming back out of it too.)\n" +
  "  for (const [x, y, c, b] of city.patches.boutique.collision) { city.collision[y * city.width + x] = c; city.behavior[y * city.width + x] = b; }\n" +
  "  // (Its shop window, read as its sign.)\n" +
  "  city.signs.push({ x: " + SIGN.x + ", y: " + SIGN.y + ", script: \"CeladonCity_EventScript_BoutiqueSign\", text: [\"Celadon Boutique\\nClassic Kanto looks, tailored here!\"] });\n" +
  "  // (The room: Lavender Town's Mart's, in its own colours; the boutique's clerk behind its counter: game/team-fashion.js.)\n" +
  "  W[ROOM] = Object.assign(JSON.parse(JSON.stringify(src)), { name: ROOM, title: \"Celadon Boutique\", townMapSection: \"CELADON_CITY\", signs: [], triggers: [], hidden: [],\n" +
  "    warps: src.warps.map((w) => ({ x: w.x, y: w.y, map: \"CeladonCity\", warp: out })), people: " + JSON.stringify(SHOPPERS) + " });\n" +
  "  if (window.TOWN_MAP && window.TOWN_MAP.mapSections) window.TOWN_MAP.mapSections[ROOM] = \"CELADON_CITY\";\n" +
  "})();\n";
fs.writeFileSync(path.join(root, "data/celadon-boutique.js"), js);
console.log("wrote data/celadon-boutique.js, assets/world/maps/CeladonCity-patch-boutique.png (and -top), " + ROOM + ".png (-top, -border)");
