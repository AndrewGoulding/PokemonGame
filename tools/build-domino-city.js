// Domino City, this game's own: the first map of the Yu-Gi-Oh! realm, laid
// out after the original anime's city. Through the Realm Hub's golden portal
// you come out in Domino Square, under its clock tower; round it Kaiba
// Corporation's tower to the north, Domino High School and the Kame Game shop
// to the west, the Domino Museum, Burger World and the apartments to the east,
// and Domino Pier on the sea to the south.
//
// Drawn by the painter all of Johto is (tools/lib/fr-painter.js: FireRed's
// tiles, Kanto's buildings stamped on), from the layout here; the clock tower
// and the portal home are drawn by tools/lib/realm-art.js. Its buildings'
// doors are shut for now: their insides come later.
//
//   node tools/build-domino-city.js
//
// Writes:
//   assets/world/maps/DominoCity.png, -top, -border, -anim
//   data/emerald-maps.js (its end, between the markers): the city's map
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { writePng } = require("./lib/png");
const { writeAnimSheet } = require("./lib/fr-tiles");
const Painter = require("./lib/fr-painter");
const { canvas, fromRgba, portal, clockTower } = require("./lib/realm-art");

const root = path.join(__dirname, "..");
const MAPS = path.join(root, "assets/world/maps");
const NAME = "DominoCity", W = 56, H = 44, TILE = 16;

// ---------- The layout ----------
const classes = new Array(W * H).fill("pavement");
const at = (x, y) => y * W + x;
const area = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) classes[at(x, y)] = c; };
// The city's edge: trees west, north and east; the sea to the south.
area(0, 0, W - 1, 1, "tree"); area(0, 0, 1, H - 1, "tree"); area(W - 2, 0, W - 1, H - 1, "tree");
area(0, 38, W - 1, H - 1, "water");
// The waterfront's railing, open for the pier; the pier out to sea.
area(2, 37, W - 3, 37, "fence"); area(26, 37, 29, 37, "pavement");
area(27, 38, 28, 42, "bridge");
// Groves either side of Kaiba Corporation, and round the edge.
area(12, 2, 19, 7, "tree"); area(31, 2, 35, 9, "tree"); area(46, 2, 53, 9, "tree");
// Domino High's schoolyard.
area(4, 12, 16, 16, "grass");
for (const [x, y] of [[4, 12], [16, 12], [4, 16], [16, 16]]) classes[at(x, y)] = "tree";
// The park round Domino Square, flowers in its lawns, trees at its corners.
area(18, 20, 35, 31, "grass");
area(22, 20, 32, 29, "pavement");                        // (the square)
area(25, 30, 29, 31, "pavement");                        // (the way south from it)
for (let y = 21; y <= 30; y += 3) { classes[at(19, y)] = "flowers"; classes[at(34, y)] = "flowers"; }
for (const [x, y] of [[18, 20], [20, 20], [33, 20], [35, 20], [18, 31], [19, 31], [34, 31], [35, 31]]) classes[at(x, y)] = "tree";
// Lawns by the apartments and the houses south of town.
area(44, 24, 53, 27, "grass");
area(2, 26, 3, 29, "tree");

// ---------- The buildings ----------
// Each Kanto's own size (tools/data/fr-style.json's stamps), so the painter stamps it whole.
const BUILDINGS = [
  { id: "KaibaCorp", x: 21, y: 2, w: 9, h: 16, door: [25, 17], kind: "tower", title: "KAIBA CORPORATION",
    locked: ["The doors are locked tight.", "A guard's voice crackles over the\nspeaker: \"No appointment, no entry!\""] },
  { id: "DominoHigh", x: 4, y: 3, w: 7, h: 8, door: [7, 10], kind: "dept", title: "DOMINO HIGH SCHOOL",
    locked: ["Classes are over for the day.\nThe school's doors are locked."] },
  { id: "Museum", x: 37, y: 4, w: 7, h: 5, door: [40, 8], kind: "lab", title: "DOMINO MUSEUM\nNow showing: treasures of\nancient Egypt!",
    locked: ["The museum's closed for now.", "A poster on the door shows a golden\npuzzle shaped like a pyramid."] },
  { id: "KameGame", x: 5, y: 20, w: 5, h: 4, door: [7, 23], kind: "house", title: "KAME GAME\nGames of every kind!",
    locked: ["The shop's shutters are down.\nIt's closed for now."] },
  { id: "House1", x: 11, y: 19, w: 5, h: 5, door: [12, 23], kind: "house", locked: ["It's locked. Nobody's home."] },
  { id: "BurgerWorld", x: 38, y: 19, w: 6, h: 4, door: [40, 22], kind: "house", title: "BURGER WORLD\nThe best burgers in Domino City!",
    locked: ["A sign on the door says it opens\nsoon."] },
  { id: "Apartments", x: 45, y: 12, w: 9, h: 11, door: [47, 22], kind: "tower", title: "DOMINO APARTMENTS",
    locked: ["The front door's locked. You need\na key to get in."] },
  { id: "House2", x: 13, y: 31, w: 5, h: 5, door: [14, 35], kind: "house", locked: ["It's locked. Nobody's home."] },
  { id: "House3", x: 36, y: 32, w: 5, h: 4, door: [37, 35], kind: "house", locked: ["It's locked. Nobody's home."] },
  { id: "Warehouse1", x: 4, y: 31, w: 7, h: 4, door: [6, 34], kind: "house", locked: ["A warehouse by the pier. Its\nshutters are locked."] },
  { id: "Warehouse2", x: 44, y: 30, w: 6, h: 5, door: [47, 34], kind: "dept", locked: ["A warehouse by the pier. Its\nshutters are locked."] }
];
const buildings = BUILDINGS.map((b) => {
  const tiles = [];
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { classes[at(x, y)] = "building"; tiles.push([x, y]); }
  return { door: b.door, tiles, kind: b.kind, dest: b.id };
});

// The square: the clock tower, the portal back to the Realm Hub.
const TOWER = { x: 27, y: 21 };     // (3 x 5: walked behind but for its base, its foot's two rows)
const PORTAL = { x: 23, y: 21 };    // (2 x 3)
const ARRIVE = { x: PORTAL.x + 1, y: PORTAL.y + 3 };

// Signs: [x, y, text].
const SIGNS = [
  [11, 10, "DOMINO HIGH SCHOOL"],
  [24, 18, "KAIBA CORPORATION"],
  [41, 9, "DOMINO MUSEUM\nNow showing: treasures of\nancient Egypt!"],
  [10, 23, "KAME GAME\nGames of every kind!"],
  [37, 22, "BURGER WORLD\nThe best burgers in Domino City!"],
  [44, 22, "DOMINO APARTMENTS"],
  [31, 28, ["DOMINO CITY", "Domino Square: the clock tower's\nhere, in the middle of town."]],
  [25, 36, "DOMINO PIER\nShips sail from here."]
];
for (const [x, y] of SIGNS) classes[at(x, y)] = "object";

const pic = Painter.compose(classes, W, H, { buildings, signs: SIGNS.map(([x, y]) => [x, y, "sign"]), style: "outdoor" });
for (const p of pic.placed) if (p.stamp.stretched) console.warn("stretched a building at", p.x, p.y);

// ---------- The pictures ----------
const below = fromRgba(W * TILE, H * TILE, pic.below), above = fromRgba(W * TILE, H * TILE, pic.above);
below.draw(portal("yugioh"), PORTAL.x * TILE, PORTAL.y * TILE);
// (The clock tower: its foot below the people, the rest over them.)
const tower = clockTower(), foot = canvas(48, 32), top = canvas(48, 48);
for (let y = 0; y < 80; y++) for (let x = 0; x < 48; x++) { const p = tower.get(x, y); if (p[3]) (y < 48 ? top : foot).set(x, y - (y < 48 ? 0 : 48), p); }
below.draw(foot, TOWER.x * TILE, (TOWER.y + 3) * TILE);
above.draw(top, TOWER.x * TILE, TOWER.y * TILE);
writePng(path.join(MAPS, NAME + ".png"), W * TILE, H * TILE, below.rgba);
writePng(path.join(MAPS, NAME + "-top.png"), W * TILE, H * TILE, above.rgba);
const animFile = path.join(MAPS, NAME + "-anim.png");
if (pic.anim.pics.length) writeAnimSheet(animFile, pic.anim.pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
writePng(path.join(MAPS, NAME + "-border.png"), 32, 32, Painter.render(Painter.paint(Array(4).fill("tree"), 2, 2, "outdoor"), 2, 2, null, "outdoor").below);

// ---------- The map's data ----------
const final = pic.classes;
const SOLID = new Set(["tree", "rock", "fence", "building", "object", "waterrock"]);
const collision = final.map((c) => (SOLID.has(c) ? 1 : 0));
for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) collision[at(PORTAL.x + x, PORTAL.y + y)] = 1;
for (let y = 3; y < 5; y++) for (let x = 0; x < 3; x++) collision[at(TOWER.x + x, TOWER.y + y)] = 1;
const behavior = final.map((c) => (c === "water" ? 0x15 : 0));

// People: their sprites as FireRed's maps have them.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "data/world-maps.js"), "utf8"), sandbox);
const looks = {};
for (const m of Object.values(sandbox.window.WORLD_MAPS)) for (const p of m.people) if (!looks[p.sprite]) looks[p.sprite] = { width: p.width, height: p.height, frames: p.frames };
const PEOPLE = [
  ["gba_kid", 14, 27, "wander_around", ["Everyone in Domino City plays Duel\nMonsters!", "I keep my deck with me wherever\nI go."]],
  ["boy", 10, 14, "wander_around", ["That's Domino High School.", "Classes are out, so everyone's gone\nto the game shop."]],
  ["man", 26, 19, "face_down", ["That's Kaiba Corporation.", "Its president's a high-school kid,\nand the best Duel Monsters player\nin the world. Or so he says."]],
  ["old_man_1", 8, 25, "face_up", ["The Kame Game shop sells every game\nyou can think of.", "The old man who runs it knows them\nall!"]],
  ["lass", 36, 26, "wander_around", ["Burger World has the best burgers\nin Domino City!", "A girl from Domino High works there."]],
  ["fisher", 31, 36, "face_down", ["Ships leave Domino Pier for all\nkinds of places.", "They say there's an island out\nthere where duelists gather…"]],
  ["cooltrainer_f", 41, 11, "face_up", ["The museum's new exhibit is from\nancient Egypt.", "Stone tablets with monsters carved\non them… Just like Duel Monsters!"]]
];
const people = PEOPLE.map(([sprite, x, y, movement, text], i) => Object.assign({
  id: i, x, y, movement, rangeX: 1, rangeY: 1, script: "DominoCity_EventScript_Person" + i, flag: null, text, sprite,
  localId: "LOCALID_DOMINO_PERSON_" + i
}, looks[sprite] || { width: 16, height: 32, frames: 10 }));
for (const p of people) if (collision[at(p.x, p.y)]) throw new Error("someone stands in a wall at " + p.x + "," + p.y);

const signs = SIGNS.map(([x, y, text], i) => ({ x, y, script: "DominoCity_EventScript_Sign" + i, text: [].concat(text) }))
  // (Each building's door: shut, for now.)
  .concat(BUILDINGS.map((b) => ({ x: b.door[0], y: b.door[1], script: "DominoCity_EventScript_" + b.id + "Door", text: b.locked })))
  .concat([0, 1].map((k) => ({ x: PORTAL.x + k, y: PORTAL.y + 2, script: "DominoCity_EventScript_Portal", text: null })))
  .concat([0, 1, 2].map((k) => ({ x: TOWER.x + k, y: TOWER.y + 4, script: "DominoCity_EventScript_ClockTower",
    text: ["Domino City's clock tower.", "It stands over Domino Square, in\nthe middle of town."] })));
for (const b of BUILDINGS) collision[at(b.door[0], b.door[1])] = 1;

const map = {
  name: NAME, title: "Domino City", width: W, height: H, type: "city", realm: "yugioh", music: "mus_celadon",
  cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  anim: pic.anim.cells.length ? { cells: pic.anim.cells, anims: pic.anims } : undefined,
  collision, elevation: collision.map(() => 0), behavior, encounter: collision.map(() => 0),
  connections: [], warps: [], signs, triggers: [], hidden: [], people, wild: null
};
const START = "// Domino City (tools/build-domino-city.js): the Yu-Gi-Oh! realm's first map.\n", END = "// (End of Domino City.)\n";
const js = START + "window.WORLD_MAPS[" + JSON.stringify(NAME) + "] = " + JSON.stringify(map) + ";\n" +
  "window.DOMINO_CITY = " + JSON.stringify({ arrive: { map: NAME, x: ARRIVE.x, y: ARRIVE.y, facing: "down" } }) + ";\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
const a = text.indexOf(START);
if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log(NAME, W + "x" + H + ",", pic.placed.length, "buildings");
