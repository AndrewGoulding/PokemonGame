// Builds the Tera Raid dens' pictures and the places made for some of them
// (this game's own; see game/raid-dens.js):
//
//   assets/world/sprites/raid_den.png, raid_den_active.png
//       a den, 16x32 (it stands on its tile like a person): a ring of rocks
//       round a hole with a Tera crystal in it, dull while it sleeps; glowing,
//       with a beam of light up out of it, while a raid is on
//   assets/world/maps/SaffronCity_Dojo_DenRoom.png (and -border.png)
//       the back room, from the Dojo's own tiles (assets/world/maps/SaffronCity_Dojo.png,
//       as tools/build-maps.js made it): its wall, floor, a tatami and the way out
//   assets/world/maps/SaffronCity_Dojo-patch-denroom.png
//       a sliding door drawn into the Dojo's back wall (a patch, on once
//       you've beaten its Karate Master)
//   assets/world/maps/SaffronCity_MrPsychicsHouse_DenRoom.png (and -border.png),
//   assets/world/maps/SaffronCity_MrPsychicsHouse-patch-denroom.png
//       Mr. Psychic's back room, from his house's own tiles, and a door in
//       his house's back wall (on once he's given you his TM)
//   assets/world/maps/CeladonCity-patch-berryfarm.png
//       Celadon's Berry Farm, south of its Gym: tilled plots, and a sign
//   data/raid-den-rooms.js
//       the rooms' maps, the doors (the patches and their warps), the farm's
//       patch and sign
//
//   node tools/build-raid-dens.js
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const MAPS = path.join(root, "assets/world/maps");
const hex = (h, a) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a == null ? 255 : a];

// ---------- The den ----------

function den(active) {
  const W = 16, H = 32, px = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, c, a) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, k = a == null ? 1 : a, rgba = hex(c);
    if (!px[i + 3]) { px.set([rgba[0], rgba[1], rgba[2], Math.round(255 * k)], i); return; }
    const old = px[i + 3] / 255, out = k + old * (1 - k);
    for (let n = 0; n < 3; n++) px[i + n] = (rgba[n] * k + px[i + n] * old * (1 - k)) / out;
    px[i + 3] = Math.round(255 * out);
  };
  const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const CX = 8, CY = 25;
  // The rock ring: outline, rock, a lighter top-left, the dark hole.
  for (let y = 16; y < 32; y++) for (let x = 0; x < W; x++) {
    if (!inEllipse(x, y, CX, CY, 8, 6)) continue;
    const edge = !inEllipse(x, y, CX, CY, 7, 5);
    if (edge) put(x, y, "#3c3028");
    else if (inEllipse(x, y, CX, CY + 0.5, 4.2, 2.6)) put(x, y, y < CY ? "#1c1420" : "#2a2030");
    else put(x, y, (x + y) % 5 === 0 ? "#7a6a58" : y < CY - 1 && x < CX ? "#b4a48c" : y > CY + 2 ? "#6e5e4e" : "#968470");
  }
  // (Pebbles on the rim.)
  for (const [x, y] of [[3, 21], [12, 22], [2, 27], [13, 28], [6, 30]]) put(x, y, "#c8b89c");
  // The crystal: a gem standing in the hole.
  const gem = active ? ["#fff0ff", "#ff8ce0", "#d040b0", "#7a1a70"] : ["#b8b0c8", "#8a7e9c", "#645878", "#3a3048"];
  const shape = [[8, 17, 0], [7, 18, 1], [8, 18, 0], [9, 18, 2], [6, 19, 1], [7, 19, 0], [8, 19, 1], [9, 19, 2], [10, 19, 2],
    [6, 20, 1], [7, 20, 1], [8, 20, 1], [9, 20, 2], [10, 20, 2], [6, 21, 1], [7, 21, 0], [8, 21, 1], [9, 21, 2], [10, 21, 2],
    [6, 22, 1], [7, 22, 1], [8, 22, 2], [9, 22, 2], [10, 22, 2], [7, 23, 1], [8, 23, 2], [9, 23, 2], [7, 24, 2], [8, 24, 2], [9, 24, 2]];
  for (const [x, y, k] of shape) put(x, y, gem[k]);
  for (const [x, y] of [[8, 16], [6, 18], [10, 18], [5, 19], [11, 19], [5, 20], [11, 20], [5, 21], [11, 21], [5, 22], [11, 22], [6, 23], [10, 23], [6, 24], [10, 24]]) put(x, y, gem[3]);
  if (active) {
    // The beam: up from the crystal to the top, white in the middle, pink at its edges, fading as it goes.
    for (let y = 0; y < 17; y++) {
      const fade = 0.35 + 0.65 * (y / 16);
      put(7, y, "#ffffff", 0.85 * fade); put(8, y, "#ffffff", 0.85 * fade);
      put(6, y, "#ff70d0", 0.55 * fade); put(9, y, "#ff70d0", 0.55 * fade);
      put(5, y, "#ff40c0", 0.25 * fade); put(10, y, "#ff40c0", 0.25 * fade);
    }
    // (Sparkles.)
    for (const [x, y] of [[3, 6], [12, 11], [2, 14], [13, 3]]) { put(x, y, "#ffe8ff"); put(x - 1, y, "#ff9ce4", 0.6); put(x + 1, y, "#ff9ce4", 0.6); put(x, y - 1, "#ff9ce4", 0.6); put(x, y + 1, "#ff9ce4", 0.6); }
  }
  return px;
}
writePng(path.join(root, "assets/world/sprites/raid_den.png"), 16, 32, den(false));
writePng(path.join(root, "assets/world/sprites/raid_den_active.png"), 16, 32, den(true));

// ---------- The Dojo's back room ----------

const DOJO = "SaffronCity_Dojo", ROOM = "SaffronCity_Dojo_DenRoom", T = 16;
const dojo = readPng(path.join(MAPS, DOJO + ".png"));
global.window = global;
require(path.join(root, "data/world-maps.js"));
const dojoMap = window.WORLD_MAPS[DOJO];
const W = dojoMap.width, H = 10;   // (as wide as the Dojo)
const DOOR = { x: 3, y: 2 };       // (the Dojo's back wall, left of the pillars)

// Each tile of the room: the Dojo tile it's a copy of.
const src = [];
const MAT_ROW = 8;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let s;
  if (y <= 2) s = [x === 4 ? 3 : x === 8 ? 9 : y === 2 && x === 6 ? 1 : x, y];   // the wall, without the pillars (or the vase's flower)
  else if (y < MAT_ROW) s = [x, 12];                           // plain floor
  else if (y === MAT_ROW) s = [[3, 4].includes(x) ? 2 : [9, 10].includes(x) ? 11 : x, 14];   // the way out (no drums' shadows)
  else s = [x, 15];
  src[y * W + x] = s;
}
// A tatami, 3x3, in the middle: the Dojo's mat's corners, edges and middle.
const TATAMI = { "-1,-1": [4, 7], "0,-1": [5, 7], "1,-1": [8, 7], "-1,0": [4, 8], "0,0": [5, 8], "1,0": [8, 8], "-1,1": [4, 11], "0,1": [5, 11], "1,1": [8, 11] };
const DEN = { x: 6, y: 5 };
for (const [k, s] of Object.entries(TATAMI)) {
  const [dx, dy] = k.split(",").map(Number);
  src[(DEN.y + dy) * W + DEN.x + dx] = s;
}

const img = new Uint8ClampedArray(W * T * H * T * 4);
function tile(sx, sy, dx, dy, into, iw, from) {
  from = from || dojo;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const s = ((sy * T + y) * from.width + sx * T + x) * 4;
    const d = ((dy * T + y) * iw + dx * T + x) * 4;
    into.set(from.rgba.slice(s, s + 4), d);
  }
}
const collision = [], elevation = [], behavior = [], encounter = [];
src.forEach(([sx, sy], i) => {
  tile(sx, sy, i % W, Math.floor(i / W), img, W * T);
  const j = sy * dojoMap.width + sx;
  collision[i] = dojoMap.collision[j]; elevation[i] = dojoMap.elevation[j]; behavior[i] = dojoMap.behavior[j]; encounter[i] = 0;
});
writePng(path.join(MAPS, ROOM + ".png"), W * T, H * T, img);
fs.copyFileSync(path.join(MAPS, DOJO + "-border.png"), path.join(MAPS, ROOM + "-border.png"));

// ---------- The door in the Dojo ----------
{
  const w = T, h = 2 * T, door = new Uint8ClampedArray(w * h * 4);
  tile(DOOR.x, DOOR.y - 1, 0, 0, door, w);
  tile(DOOR.x, DOOR.y, 0, 1, door, w);
  const px = (x, y, c) => door.set(hex(c), (y * w + x) * 4);
  // A shoji: a dark wooden frame, paper panes, the frame's bars across them.
  for (let y = 6; y < h; y++) for (let x = 1; x < w - 1; x++) {
    const frame = x === 1 || x === w - 2 || y === 6 || x === 8;
    const bar = y === 13 || y === 20 || y === 27 || x === 4 || x === 12;
    px(x, y, frame ? "#4a2c14" : bar ? "#7a5232" : y > 28 ? "#d8cca8" : "#f2ead0");
  }
  writePng(path.join(MAPS, DOJO + "-patch-denroom.png"), w, h, door);
}

// ---------- The data ----------

const MAT_XS = [5, 6, 7];
const room = {
  name: ROOM, title: dojoMap.title, width: W, height: H, type: "indoor", music: dojoMap.music, top: false,
  borderWidth: 2, borderHeight: 2, collision, elevation, behavior, encounter, connections: [],
  warps: MAT_XS.map((x) => ({ x, y: MAT_ROW, map: DOJO, warp: dojoMap.warps.length })),
  signs: [], triggers: [], hidden: [], patches: {}, people: [], wild: null
};
let out = "// Auto-generated by tools/build-raid-dens.js (from the maps' own tiles). Do not edit by hand.\n" +
  "// The places made for some of the Tera Raid dens (game/raid-dens.js).\n\n" +
  "// The Fighting Dojo's back room, behind a door in its back wall.\n" +
  "window.WORLD_MAPS[" + JSON.stringify(ROOM) + "] = " + JSON.stringify(room) + ";\n" +
  "(function () {\n" +
  "  const dojo = window.WORLD_MAPS[" + JSON.stringify(DOJO) + "];\n" +
  "  if (!dojo) return;\n" +
  "  // The door: a patch drawn into the wall (on once the Karate Master's beaten), the tile in it a way through.\n" +
  "  dojo.patches = Object.assign({}, dojo.patches, { denroom: { x: " + DOOR.x + ", y: " + (DOOR.y - 1) + ", w: 1, h: 2, top: false, collision: [[" + DOOR.x + ", " + DOOR.y + ", 0, 0x60]] } });\n" +
  "  if (!dojo.warps.some((w) => w.map === " + JSON.stringify(ROOM) + ")) dojo.warps.push({ x: " + DOOR.x + ", y: " + DOOR.y + ", map: " + JSON.stringify(ROOM) + ", warp: 1 });\n" +
  "  if (window.TOWN_MAP && window.TOWN_MAP.mapSections) window.TOWN_MAP.mapSections[" + JSON.stringify(ROOM) + "] = window.TOWN_MAP.mapSections[" + JSON.stringify(DOJO) + "];\n" +
  "})();\n";

// ---------- Mr. Psychic's back room ----------
{
  const HOUSE = "SaffronCity_MrPsychicsHouse", PROOM = HOUSE + "_DenRoom";
  const house = readPng(path.join(MAPS, HOUSE + ".png")), hm = window.WORLD_MAPS[HOUSE];
  const W = hm.width, H = hm.height;
  const PDOOR = { x: 7, y: 1 };       // (the back wall's plain stretch, between the cabinet and the window)
  const MAT = [4, 5, 6], MAT_Y = 7;   // (the way out, his own mat's three tiles)
  const PDEN = { x: 5, y: 4 };
  const src = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s;
    if (y <= 1) s = [6 + (x % 2), y];                            // the wall, plain
    else if (y === 2) s = [6 + (x % 2), 2];                      // the floor in the wall's shadow
    else if (y < MAT_Y) s = x === 0 ? [0, 3 + (y % 2)] : [9 + ((x + 1) % 2), 3 + (y % 2)];
    else if (y === MAT_Y) s = MAT.includes(x) ? [x - 1, MAT_Y] : [1 + (x % 2), MAT_Y];
    else s = MAT.includes(x) ? [x - 1, 8] : [0, 8];               // (the dark below, with the mat's lip)
    src[y * W + x] = s;
  }
  const img = new Uint8ClampedArray(W * T * H * T * 4);
  const collision = [], elevation = [], behavior = [], encounter = [];
  src.forEach(([sx, sy], i) => {
    tile(sx, sy, i % W, Math.floor(i / W), img, W * T, house);
    const j = sy * W + sx;
    collision[i] = hm.collision[j]; elevation[i] = hm.elevation[j]; behavior[i] = hm.behavior[j]; encounter[i] = 0;
  });
  // (The mat's ends are walls in the house; here they're the way out.)
  for (const x of MAT) collision[MAT_Y * W + x] = 0;
  // A rug, 3x3, under the den: his own rug's corners and edges, its middle plain.
  const px = (x, y, c) => img.set(c, (y * W * T + x) * 4);
  const at = (x, y) => Array.from(house.rgba.slice((y * house.width + x) * 4, (y * house.width + x) * 4 + 4));
  const rug = at(4 * T + 8, 3 * T + 15);   // (the rug's orange, from below its top edge's stripes)
  const RUG = { "-1,-1": [3, 3], "0,-1": [4, 3], "1,-1": [8, 3], "-1,0": [3, 4], "1,0": [8, 4], "-1,1": [3, 6], "0,1": [4, 6], "1,1": [8, 6] };
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const k = dx + "," + dy, tx = PDEN.x + dx, ty = PDEN.y + dy;
    if (RUG[k]) tile(RUG[k][0], RUG[k][1], tx, ty, img, W * T, house);
    else for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(tx * T + x, ty * T + y, rug);
  }
  writePng(path.join(MAPS, PROOM + ".png"), W * T, H * T, img);
  fs.copyFileSync(path.join(MAPS, HOUSE + "-border.png"), path.join(MAPS, PROOM + "-border.png"));

  // The door: wooden, with a brass knob, in the wall's plain stretch.
  const w = T, h = 2 * T, door = new Uint8ClampedArray(w * h * 4);
  tile(PDOOR.x, PDOOR.y - 1, 0, 0, door, w, house);
  tile(PDOOR.x, PDOOR.y, 0, 1, door, w, house);
  const dp = (x, y, c) => door.set(hex(c), (y * w + x) * 4);
  for (let y = 8; y < h; y++) for (let x = 2; x < w - 2; x++) {
    const edge = x === 2 || x === w - 3 || y === 8;
    const panel = (y === 12 || y === 21 || y === 22 || y === 29) && x > 4 && x < w - 5 || (x === 5 || x === w - 6) && y > 12 && y < 29 && y !== 21 && y !== 22;
    dp(x, y, edge ? "#4a2c14" : panel ? "#7a4a22" : y > 29 ? "#8a5a2c" : "#a8703a");
  }
  dp(11, 20, "#f8d048"); dp(11, 21, "#b08018");
  writePng(path.join(MAPS, HOUSE + "-patch-denroom.png"), w, h, door);

  const proom = {
    name: PROOM, title: hm.title, width: W, height: H, type: "indoor", music: hm.music, top: false,
    borderWidth: 2, borderHeight: 2, collision, elevation, behavior, encounter, connections: [],
    warps: MAT.map((x) => ({ x, y: MAT_Y, map: HOUSE, warp: hm.warps.length })),
    signs: [], triggers: [], hidden: [], patches: {}, people: [], wild: null
  };
  out += "\n// Mr. Psychic's back room, behind a door in his house's back wall.\n" +
    "window.WORLD_MAPS[" + JSON.stringify(PROOM) + "] = " + JSON.stringify(proom) + ";\n" +
    "(function () {\n" +
    "  const house = window.WORLD_MAPS[" + JSON.stringify(HOUSE) + "];\n" +
    "  if (!house) return;\n" +
    "  // The door: a patch drawn into the wall (on once he's given you his TM), the tile in it a way through.\n" +
    "  house.patches = Object.assign({}, house.patches, { denroom: { x: " + PDOOR.x + ", y: " + (PDOOR.y - 1) + ", w: 1, h: 2, top: false, collision: [[" + PDOOR.x + ", " + PDOOR.y + ", 0, 0x60]] } });\n" +
    "  if (!house.warps.some((w) => w.map === " + JSON.stringify(PROOM) + ")) house.warps.push({ x: " + PDOOR.x + ", y: " + PDOOR.y + ", map: " + JSON.stringify(PROOM) + ", warp: 1 });\n" +
    "  if (window.TOWN_MAP && window.TOWN_MAP.mapSections) window.TOWN_MAP.mapSections[" + JSON.stringify(PROOM) + "] = window.TOWN_MAP.mapSections[" + JSON.stringify(HOUSE) + "];\n" +
    "})();\n";
}

// ---------- Celadon's Berry Farm ----------
{
  const CITY = "CeladonCity", city = readPng(path.join(MAPS, CITY + ".png"));
  const AREA = { x: 4, y: 34, w: 14, h: 4 };      // (the lawn south of the Gym, below its ledges)
  const PLOTS = [{ x: 5, y: 35, w: 4, h: 2 }, { x: 14, y: 35, w: 4, h: 2 }];
  const SIGN = { x: 12, y: 34 };
  const w = AREA.w * T, h = AREA.h * T, img = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < AREA.h; y++) for (let x = 0; x < AREA.w; x++) tile(AREA.x + x, AREA.y + y, x, y, img, w, city);
  const px = (x, y, c) => img.set(hex(c), (y * w + x) * 4);
  // The plots: tilled soil in furrows, a dark edge round each.
  for (const p of PLOTS) {
    const x0 = (p.x - AREA.x) * T, y0 = (p.y - AREA.y) * T, pw = p.w * T, ph = p.h * T;
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const edge = x === 0 || y === 0 || x === pw - 1 || y === ph - 1;
      const inner = x === 1 || y === 1 || x === pw - 2 || y === ph - 2;
      const furrow = (y - 2) % 6, fleck = (x * 7 + y * 13) % 23 === 0;
      px(x0 + x, y0 + y, edge ? "#4a3020" : inner ? "#6a4428" : furrow === 0 ? "#9a6a40" : furrow === 4 || furrow === 5 ? "#5e3c22" : fleck ? "#a87a4c" : "#7c5232");
    }
  }
  // The sign: a board on a post.
  {
    const x0 = (SIGN.x - AREA.x) * T, y0 = (SIGN.y - AREA.y) * T;
    for (let y = 9; y < 15; y++) for (let x = 7; x < 9; x++) px(x0 + x, y0 + y, x === 7 ? "#6a4428" : "#4a3020");
    for (let y = 1; y < 10; y++) for (let x = 1; x < 15; x++) {
      const edge = x === 1 || x === 14 || y === 1 || y === 9;
      px(x0 + x, y0 + y, edge ? "#4a3020" : y === 2 ? "#e0b070" : (y === 4 || y === 6) && x > 3 && x < 12 ? "#6a4428" : "#c48c50");
    }
    for (let x = 2; x < 15; x++) px(x0 + x, y0 + 10, "#3a6a3a");
  }
  writePng(path.join(MAPS, CITY + "-patch-berryfarm.png"), w, h, img);
  const blocked = [[SIGN.x, SIGN.y, 1, 0]];
  for (const p of PLOTS) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) blocked.push([x, y, 1, 0]);
  out += "\n// Celadon's Berry Farm, south of its Gym: its plots (for planting, one day) and its sign.\n" +
    "(function () {\n" +
    "  const city = window.WORLD_MAPS[" + JSON.stringify(CITY) + "];\n" +
    "  if (!city) return;\n" +
    "  city.patches = Object.assign({}, city.patches, { berryfarm: { x: " + AREA.x + ", y: " + AREA.y + ", w: " + AREA.w + ", h: " + AREA.h + ", top: false, collision: " + JSON.stringify(blocked) + " } });\n" +
    "  if (!city.signs.some((s) => s.script === \"CeladonCity_EventScript_BerryFarmSign\")) city.signs.push({ x: " + SIGN.x + ", y: " + SIGN.y + ", script: \"CeladonCity_EventScript_BerryFarmSign\", text: [\"CELADON BERRY FARM\\nThe plots are being readied.\", \"Planting opens soon!\"] });\n" +
    "})();\n";
}

fs.writeFileSync(path.join(root, "data/raid-den-rooms.js"), out);
console.log("wrote the den sprites, the rooms and data/raid-den-rooms.js");
