// Stadium Island, this game's own: a Sevii island with the Pokémon Stadium
// (Pokémon Stadium's Cups and Gym Leader Castle: ui/game.js, game/trainer-tower.js).
// Its outside is painted by the painter all of Johto is (tools/lib/fr-painter.js:
// FireRed's tiles, a stretched Kanto building for the Stadium), from a layout
// drawn here: a beach island, a plaza from the Seagallop's pier to the
// Stadium's door, flowers and trees. Its inside is the Trainer Tower's lobby,
// cloned at load (ui/game.js).
//
//   node tools/build-stadium-island.js
//
// Writes:
//   assets/world/maps/StadiumIsland.png, -top, -border, -anim
//   data/emerald-maps.js (its end, between the markers): the island's map
"use strict";

const fs = require("fs");
const path = require("path");
const { writePng } = require("./lib/png");
const { writeAnimSheet } = require("./lib/fr-tiles");
const Painter = require("./lib/fr-painter");

const root = path.join(__dirname, "..");
const mapsDir = path.join(root, "assets/world/maps");
const NAME = "StadiumIsland";
const W = 34, H = 28;

// ---------- The layout ----------
const classes = new Array(W * H).fill("water");
const at = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const land = (x, y) => {
  // (A rounded rectangle.)
  const x0 = 4, x1 = 29, y0 = 3, y1 = 22;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(x - x0, x1 - x), cy = Math.min(y - y0, y1 - y);
  return !(cx < 3 && cy < 3 && cx + cy < 3);
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (land(x, y)) classes[at(x, y)] = "grass";
// The beach: land beside water.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (classes[at(x, y)] !== "grass") continue;
  if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && classes[at(x + dx, y + dy)] === "water")) classes[at(x, y)] = "sand";
}
// The plaza and the way down to the pier.
const DOOR = [17, 10];
for (let y = 11; y <= 13; y++) for (let x = 9; x <= 25; x++) classes[at(x, y)] = "pavement";
for (let y = 11; y <= 22; y++) for (let x = 16; x <= 18; x++) classes[at(x, y)] = "pavement";
// The pier, out into the sea.
for (let y = 23; y <= 26; y++) for (let x = 17; x <= 17; x++) classes[at(x, y)] = "bridge";
// A garden each side of the way: flowers, trees round the island's back.
for (let y = 15; y <= 20; y++) for (let x = 7; x <= 14; x++) if (classes[at(x, y)] === "grass") classes[at(x, y)] = (x + y) % 3 === 0 ? "flowers" : "grass";
for (let y = 15; y <= 20; y++) for (let x = 20; x <= 27; x++) if (classes[at(x, y)] === "grass") classes[at(x, y)] = (x + y) % 3 === 0 ? "flowers" : "grass";
for (let y = 4; y <= 9; y++) for (let x = 5; x <= 28; x++) {
  if (classes[at(x, y)] !== "grass") continue;
  if (x <= 7 || x >= 26 || y === 4) classes[at(x, y)] = "tree";
}
// A tree or two on the lawns.
for (const [x, y] of [[6, 14], [27, 14], [6, 21], [27, 21], [13, 17], [21, 17]]) if (classes[at(x, y)] === "grass") classes[at(x, y)] = "tree";
// The Stadium: 14 wide, 6 tall, its door in the middle of its foot.
const STADIUM = { x0: 10, y0: 4, w: 15, h: 7 };
const tiles = [];
for (let y = STADIUM.y0 + 1; y < STADIUM.y0 + STADIUM.h; y++) for (let x = STADIUM.x0; x < STADIUM.x0 + STADIUM.w; x++) { classes[at(x, y)] = "building"; tiles.push([x, y]); }
classes[at(DOOR[0], DOOR[1])] = "building";
for (let y = 4; y <= 10; y++) for (let x = 8; x <= 9; x++) if (classes[at(x, y)] === "tree") classes[at(x, y)] = "grass";
// Signs by the door and the pier.
const SIGNS = [[15, 11, "sign"], [15, 21, "sign"]];
for (const [x, y] of SIGNS) classes[at(x, y)] = "object";

const buildings = [{ door: DOOR, tiles, kind: "dept", dest: "MAP_STADIUM" }];
const pic = Painter.compose(classes, W, H, { buildings, signs: SIGNS, style: "outdoor", stretch: true, noFill: true });

// ---------- The pictures ----------
writePng(path.join(mapsDir, NAME + ".png"), W * 16, H * 16, pic.below);
writePng(path.join(mapsDir, NAME + "-top.png"), W * 16, H * 16, pic.above);
const animFile = path.join(mapsDir, NAME + "-anim.png");
if (pic.anim.pics.length) writeAnimSheet(animFile, pic.anim.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
writePng(path.join(mapsDir, NAME + "-border.png"), 32, 32, Painter.render(Painter.paint(Array(4).fill("water"), 2, 2, "outdoor"), 2, 2, null, "outdoor").below);

// ---------- The map's data ----------
const final = pic.classes;
const SOLID = new Set(["tree", "rock", "fence", "building", "object", "waterrock"]);
const collision = final.map((c, i) => (SOLID.has(c) ? 1 : 0));
// (The Stadium's door: walked up into.)
collision[at(DOOR[0], DOOR[1])] = 0;
const behavior = final.map((c) => (c === "water" ? 0x15 : c === "sand" ? 0x21 : 0));
behavior[at(DOOR[0], DOOR[1])] = 0x69;
const person = (id, x, y, sprite, w, h, frames, movement, script, extra) => Object.assign(
  { id, x, y, movement, rangeX: 1, rangeY: 1, script, flag: null, text: null, sprite, width: w, height: h, frames }, extra || {});
const map = {
  name: NAME, title: "Stadium Island", width: W, height: H, type: "town", music: "mus_sevii_route",
  townMapSection: "SEVEN_ISLAND",   // (on the Town Map beside Seven Island)
  cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  anim: pic.anim.cells.length ? { cells: pic.anim.cells, anims: pic.anims } : undefined,
  collision, elevation: collision.map(() => 0), behavior, encounter: collision.map(() => 0),
  connections: [],
  warps: [{ x: DOOR[0], y: DOOR[1], map: "StadiumIsland_Stadium", warp: 0 }],
  signs: [{ x: 15, y: 11, script: "StadiumIsland_EventScript_StadiumSign", text: null }, { x: 15, y: 21, script: "StadiumIsland_EventScript_PierSign", text: null }],
  triggers: [], hidden: [],
  people: [
    person(0, 17, 26, "sailor", 16, 32, 10, "face_up", "StadiumIsland_EventScript_Sailor", { localId: "LOCALID_STADIUM_ISLAND_SAILOR", rangeX: 0, rangeY: 0 }),
    person(1, 13, 14, "cooltrainer_m", 16, 32, 10, "face_down", "StadiumIsland_EventScript_Spectator", { localId: "LOCALID_STADIUM_ISLAND_SPECTATOR_1" }),
    person(2, 21, 14, "lass", 16, 32, 10, "face_down", "StadiumIsland_EventScript_Spectator", { localId: "LOCALID_STADIUM_ISLAND_SPECTATOR_2" }),
    person(3, 22, 19, "boy", 16, 32, 10, "face_left", "StadiumIsland_EventScript_Spectator", { localId: "LOCALID_STADIUM_ISLAND_SPECTATOR_3" })
  ],
  wild: null
};
const START = "// Stadium Island (tools/build-stadium-island.js): its map.\n", END = "// (End of Stadium Island.)\n";
const js = START + "window.WORLD_MAPS[" + JSON.stringify(NAME) + "] = " + JSON.stringify(map) + ";\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
const a = text.indexOf(START);
if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log(NAME, W + "x" + H, "buildings placed", pic.placed.length);
