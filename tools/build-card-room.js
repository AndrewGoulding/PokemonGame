// Builds the Celadon Game Corner's card room (this game's own), behind a
// doorway in the Game Corner's north wall: the poker table, the blackjack
// table and the mahjong table, each dealer at their table.
//
//   assets/world/maps/CeladonCity_GameCorner_CardRoom.png (and -border.png)
//       the room: the Game Corner's own wall, floor, mat and plant tiles
//       (from assets/world/maps/CeladonCity_GameCorner.png, as tools/build-maps.js
//       made it), and the tables, chairs and wall pictures drawn here
//   assets/world/maps/CeladonCity_GameCorner-patch-cardroom.png
//       the doorway, drawn into the Game Corner's wall (a patch, always on)
//   data/card-room.js
//       the room's map, and the Game Corner's doorway: the patch and its warp
//
//   node tools/build-card-room.js
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const MAPS = path.join(root, "assets/world/maps");
const GC = "CeladonCity_GameCorner", ROOM = "CeladonCity_GameCorner_CardRoom";
const gc = readPng(path.join(MAPS, GC + ".png"));
global.window = global;
require(path.join(root, "data/world-maps.js"));
const gcMap = window.WORLD_MAPS[GC];
const T = 16, W = 22, H = 13;
const DOOR = { x: 13, y: 1 };   // (the Game Corner's: a bare stretch of wall left of the stairs)

// ---------- Pixels ----------

const img = new Uint8ClampedArray(W * T * H * T * 4);
const put = (x, y, rgba, a) => {
  if (x < 0 || y < 0 || x >= W * T || y >= H * T) return;
  const i = (y * W * T + x) * 4, k = a == null ? rgba[3] / 255 : a;
  for (let c = 0; c < 3; c++) img[i + c] = img[i + c] * (1 - k) + rgba[c] * k;
  img[i + 3] = 255;
};
const hex = (h, a) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a == null ? 255 : a];
// A tile of the Game Corner (sx, sy) at (dx, dy) of the room.
function tile(sx, sy, dx, dy, into, iw) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const s = ((sy * T + y) * gc.width + sx * T + x) * 4;
    const d = into ? ((dy * T + y) * iw + dx * T + x) * 4 : ((dy * T + y) * W * T + dx * T + x) * 4;
    (into || img).set(gc.rgba.slice(s, s + 4), d);
  }
}
function ellipse(cx, cy, rx, ry, colour, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) put(x, y, hex(colour), a);
  }
}
function rect(x0, y0, w, h, colour, a) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, hex(colour), a); }
// A rounded rectangle (r: corner radius).
function rounded(x0, y0, w, h, r, colour, a) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const cx = Math.min(Math.max(x + 0.5, x0 + r), x0 + w - r), cy = Math.min(Math.max(y + 0.5, y0 + r), y0 + h - r);
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(x, y, hex(colour), a);
  }
}

// ---------- The room ----------

// Its tiles, as the Game Corner's: [sx, sy] for each, and the map's data from the same tile.
// (The Game Corner's mat is drawn across three tiles, centred on the middle one; its plant
// stands on the shadowed floor by the wall, which is swapped for plain floor here: UNDER.)
const WALL_TOP = [0, 0], WALL = [0, 1], SHADOW = [4, 2], FLOOR = [11, 3], MAT = [[8, 13], [9, 13], [10, 13]], BOTTOM = [0, 14],
  CHAIR = [4, 6], PLANT = [0, 13];
const UNDER = { "0,13": [0, 12] };
const src = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) src[y * W + x] = y === 0 ? WALL_TOP : y === 1 ? WALL : y === 2 ? SHADOW : y === H - 1 ? BOTTOM : FLOOR;
// The way out, at the bottom (as the Game Corner's own).
MAT.forEach((m, k) => { src[(H - 2) * W + 9 + k] = m; });
for (const [x, y] of [[0, 3], [W - 1, 3], [0, H - 2], [W - 1, H - 2]]) src[y * W + x] = PLANT;
// The seats: chairs.
const SEATS = { poker: [[1, 5], [7, 5], [3, 6], [5, 6]], blackjack: [[9, 6], [10, 6], [11, 6], [12, 6]], mahjong: [[17, 4], [16, 7], [15, 5], [18, 6]] };
for (const list of Object.values(SEATS)) for (const [x, y] of list) src[y * W + x] = CHAIR;
src.forEach(([sx, sy], i) => tile(sx, sy, i % W, Math.floor(i / W)));
// Tiles drawn over the shadowed floor: its pixels become plain floor.
src.forEach(([sx, sy], i) => {
  const under = UNDER[sx + "," + sy];
  if (!under) return;
  const dx = i % W, dy = Math.floor(i / W);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const at = (tx, ty) => ((ty * T + y) * gc.width + tx * T + x) * 4;
    const a = at(sx, sy), b = at(under[0], under[1]);
    if (gc.rgba[a] === gc.rgba[b] && gc.rgba[a + 1] === gc.rgba[b + 1] && gc.rgba[a + 2] === gc.rgba[b + 2]) {
      const f = at(FLOOR[0], FLOOR[1]);
      img.set(gc.rgba.slice(f, f + 4), ((dy * T + y) * W * T + dx * T + x) * 4);
    }
  }
});

const collision = [], elevation = [], behavior = [], encounter = [];
src.forEach(([sx, sy], i) => {
  const j = sy * gcMap.width + sx;
  collision[i] = gcMap.collision[j]; elevation[i] = gcMap.elevation[j]; behavior[i] = gcMap.behavior[j]; encounter[i] = 0;
});

// The tables (blocking, and each tile a "sign": A on it sits you down; the mahjong
// table's only tells you to ask the dealer standing by it).
const TABLES = {
  poker: { x: 2, y: 4, w: 5, h: 2, script: "Game_EventScript_PokerTable" },
  blackjack: { x: 9, y: 4, w: 4, h: 2, script: "Game_EventScript_BlackjackTable" },
  mahjong: { x: 16, y: 5, w: 2, h: 2, script: null, text: ["A game of mahjong is under way.", "Talk to the dealer to sit in."] }
};
const signs = [];
for (const t of Object.values(TABLES)) for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) {
  collision[y * W + x] = 1;
  signs.push({ x, y, script: t.script, text: t.text || null });
}
// Poker: an oval of green felt in a wooden rail, chips and cards on it.
{
  const t = TABLES.poker, cx = (t.x + t.w / 2) * T, cy = (t.y + t.h / 2) * T;
  ellipse(cx + 2, cy + 4, t.w * 8 + 1, t.h * 8 + 1, "#000000", 0.25);
  ellipse(cx, cy, t.w * 8, t.h * 8, "#5a3416");
  ellipse(cx, cy, t.w * 8 - 3, t.h * 8 - 3, "#2f8a4a");
  ellipse(cx, cy - 2, t.w * 8 - 10, t.h * 8 - 9, "#3a9c57");
  for (const [dx, dy, c] of [[-22, 4, "#d93b30"], [-18, 6, "#2b62c9"], [20, 3, "#f2c230"], [16, 6, "#d93b30"]]) { ellipse(cx + dx, cy + dy, 3, 2, "#1d150d"); ellipse(cx + dx, cy + dy - 1, 3, 2, c); }
  for (let k = 0; k < 5; k++) { rect(cx - 13 + k * 6, cy - 4, 5, 7, "#1d150d"); rect(cx - 12 + k * 6, cy - 3, 3, 5, "#fffdf5"); }
}
// Blackjack: a half-moon of felt, the dealer's flat side at the top.
{
  const t = TABLES.blackjack, x0 = t.x * T, y0 = t.y * T, w = t.w * T, h = t.h * T;
  const inside = (x, y, pad) => y >= y0 + pad && ((x + 0.5 - (x0 + w / 2)) / (w / 2 - pad)) ** 2 + ((y + 0.5 - y0) / (h - pad)) ** 2 <= 1;
  for (let y = y0; y < y0 + h + 4; y++) for (let x = x0; x < x0 + w + 2; x++) if (inside(x - 2, y - 3, 0)) put(x, y, hex("#000000"), 0.25);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (inside(x, y, 0)) put(x, y, hex("#5a3416"));
    if (inside(x, y, 3)) put(x, y, hex("#2f8a4a"));
  }
  rect(x0 + 4, y0 + 2, w - 8, 3, "#5a3416");
  // The dealer's chip tray and a few cards out.
  for (let k = 0; k < 6; k++) rect(x0 + w / 2 - 12 + k * 4, y0 + 6, 3, 4, ["#d93b30", "#2b62c9", "#f2c230", "#d93b30", "#2b62c9", "#1d150d"][k]);
  for (const [dx, dy] of [[-16, 16], [-6, 20], [6, 20], [14, 16]]) { rect(x0 + w / 2 + dx - 3, y0 + dy - 1, 7, 9, "#1d150d"); rect(x0 + w / 2 + dx - 2, y0 + dy, 5, 7, "#fffdf5"); }
}
// Mahjong: a square table, its four walls of tiles built up on it.
{
  const t = TABLES.mahjong, x0 = t.x * T, y0 = t.y * T, s = t.w * T;
  rect(x0 + 2, y0 + 3, s, s, "#000000", 0.25);
  rect(x0, y0, s, s, "#5a3416");
  rect(x0 + 2, y0 + 2, s - 4, s - 4, "#2f8a4a");
  for (let k = 0; k < 7; k++) {
    rect(x0 + 6 + k * 3, y0 + 5, 2, 3, "#f5ecd6"); rect(x0 + 6 + k * 3, y0 + s - 8, 2, 3, "#f5ecd6");
    rect(x0 + 5, y0 + 6 + k * 3, 3, 2, "#f5ecd6"); rect(x0 + s - 8, y0 + 6 + k * 3, 3, 2, "#f5ecd6");
  }
  rect(x0 + s / 2 - 2, y0 + s / 2 - 2, 4, 4, "#d93b30");
}
// Pictures on the wall above each table: a spade, two cards, a mahjong tile.
function frame(x0, y0, w, h) { rect(x0, y0, w, h, "#5a3416"); rect(x0 + 1, y0 + 1, w - 2, h - 2, "#fffdf5"); }
{
  const SPADE = ["...#...", "..###..", ".#####.", "#######", "#######", ".##.##.", "...#...", "..###.."];
  frame(4 * T, 6, 14, 14);
  SPADE.forEach((row, j) => [...row].forEach((c, i) => { if (c === "#") put(4 * T + 4 + i, 9 + j, hex("#1d150d")); }));
  frame(10 * T + 6, 6, 18, 14);
  for (const [dx, c] of [[3, "#c8302c"], [9, "#1d150d"]]) { rect(10 * T + 6 + dx, 9, 6, 8, "#5a3416"); rect(10 * T + 7 + dx, 10, 4, 6, "#fffdf5"); rect(10 * T + 8 + dx, 12, 2, 2, c); }
  frame(16 * T + 8, 5, 14, 17);
  const tiles = fs.existsSync(path.join(root, "assets/mahjong/tiles.png")) && readPng(path.join(root, "assets/mahjong/tiles.png"));
  if (tiles) {
    // (The Red Dragon, 60x80 shrunk to 10x13.)
    for (let y = 0; y < 13; y++) for (let x = 0; x < 10; x++) {
      const s = (Math.floor(y * 80 / 13) * tiles.width + 33 * 60 + Math.floor(x * 6)) * 4;
      if (tiles.rgba[s + 3] > 128) put(16 * T + 10 + x, 7 + y, [tiles.rgba[s], tiles.rgba[s + 1], tiles.rgba[s + 2], 255]);
    }
  }
}
writePng(path.join(MAPS, ROOM + ".png"), W * T, H * T, img);
fs.copyFileSync(path.join(MAPS, GC + "-border.png"), path.join(MAPS, ROOM + "-border.png"));

// ---------- The doorway in the Game Corner ----------
{
  const w = T, h = 2 * T, door = new Uint8ClampedArray(w * h * 4);
  tile(DOOR.x, 0, 0, 0, door, w);
  tile(DOOR.x, 1, 0, 1, door, w);
  const px = (x, y, c) => door.set(hex(c), (y * w + x) * 4);
  for (let y = 9; y < h; y++) for (let x = 1; x < w - 1; x++) px(x, y, x === 1 || x === w - 2 || y === 9 ? "#5a3416" : y < 12 ? "#2a1a0e" : "#3d2a18");
  // (A spade over it.)
  for (const [x, y] of [[7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [9, 4], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [7, 6], [8, 6]]) px(x, y, "#1d150d");
  writePng(path.join(MAPS, GC + "-patch-cardroom.png"), w, h, door);
}

// ---------- The data ----------

const MAT_X = 9;
const room = {
  name: ROOM, title: "Celadon City Game Corner", width: W, height: H, type: "indoor", music: gcMap.music, top: false,
  borderWidth: 2, borderHeight: 2, collision, elevation, behavior, encounter, connections: [],
  warps: MAT.map((m, k) => ({ x: MAT_X + k, y: H - 2, map: GC, warp: gcMap.warps.length })),
  signs, triggers: [], hidden: [], patches: {},
  // The dealers, at their tables (the players are seated by ui/game.js).
  people: [
    { id: 0, x: 4, y: 3, movement: "face_down", rangeX: 0, rangeY: 0, script: "Game_EventScript_PokerDealer", flag: null, text: null,
      localId: "LOCALID_POKER_DEALER", sprite: "worker_m", width: 16, height: 32, frames: 10 },
    { id: 1, x: 10, y: 3, movement: "face_down", rangeX: 0, rangeY: 0, script: "Game_EventScript_BlackjackDealer", flag: null, text: null,
      localId: "LOCALID_BLACKJACK_DEALER", sprite: "worker_f", width: 16, height: 32, frames: 10 },
    { id: 2, x: 18, y: 5, movement: "face_down", rangeX: 0, rangeY: 0, script: "Game_EventScript_MahjongDealer", flag: null, text: null,
      localId: "LOCALID_MAHJONG_DEALER", sprite: "worker_m", width: 16, height: 32, frames: 10 }
  ],
  seats: SEATS, wild: null
};
const out = "// Auto-generated by tools/build-card-room.js (the Game Corner's tiles, and pictures drawn there). Do not edit by hand.\n" +
  "// The Celadon Game Corner's card room, behind a doorway in its north wall.\n" +
  "window.WORLD_MAPS[" + JSON.stringify(ROOM) + "] = " + JSON.stringify(room) + ";\n" +
  "(function () {\n" +
  "  const gc = window.WORLD_MAPS[" + JSON.stringify(GC) + "];\n" +
  "  if (!gc) return;\n" +
  "  // The doorway: a patch drawn into the wall (always on), the tile in it a way through (MB_NON_ANIMATED_DOOR).\n" +
  "  gc.patches = Object.assign({}, gc.patches, { cardroom: { x: " + DOOR.x + ", y: 0, w: 1, h: 2, top: false, collision: [[" + DOOR.x + ", " + DOOR.y + ", 0, 0x60]] } });\n" +
  "  if (!gc.warps.some((w) => w.map === " + JSON.stringify(ROOM) + ")) gc.warps.push({ x: " + DOOR.x + ", y: " + DOOR.y + ", map: " + JSON.stringify(ROOM) + ", warp: 1 });\n" +
  "  if (window.TOWN_MAP && window.TOWN_MAP.mapSections) window.TOWN_MAP.mapSections[" + JSON.stringify(ROOM) + "] = window.TOWN_MAP.mapSections[" + JSON.stringify(GC) + "];\n" +
  "})();\n";
fs.writeFileSync(path.join(root, "data/card-room.js"), out);
console.log("wrote the card room (" + W + "x" + H + "), the Game Corner's doorway and data/card-room.js");
