// New Bark Town's Pokémon Center, this game's own: HeartGold and SoulSilver's
// New Bark Town has none (Mom heals you), and this game has no Mom in Johto.
// It's Cherrygrove City's Center, building and rooms: the building's picture
// (5x4 tiles, its door walked up into) is New Bark Town's patch "pokecenter",
// always on (ui/game.js mapPatches), over the open ground south of Elm's lab,
// and its two floors are Cherrygrove's maps cloned at load with their own
// names (their pictures Cherrygrove's, WORLD_MAPS[..].image). Fly lands in
// front of it, as in every other town (JOHTO_TOWN_MAP.fly), and the
// Rejuvenator is upstairs, as in every Pokémon Center (ui/game.js).
//
//   node tools/build-new-bark-center.js [<path to pret/pokeheartgold>]
//   (with the checkout, the building's pixels alone are taken from HGSS's own
//   picture of Cherrygrove's Center (tools/lib/hgss-map.js's buildings layers),
//   none of the ground round it; without, they're cut from Cherrygrove's picture)
//
// Writes:
//   assets/world/maps/NewBarkTown-patch-pokecenter.png (and -top)   the building
//   tools/lib/johto-town-map_new-bark-center.generated.js   the warp, the
//                       floors and the Fly spot; build-johto.js puts it at the
//                       end of data/johto-maps.js (named to sort after the
//                       Town Map's, whose Fly spots it changes)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const mapsDir = path.join(root, "assets/world/maps");
const T = 16;
// Cherrygrove's Center building, in tiles (HGSS's, seen from above: five wide, its roof six rows over its
// door's), and where it goes in New Bark Town: on the open ground south of Elm's lab, its door walked up
// into from the sand by the town's sign.
const FROM = { x: 50, y: 1 }, SIZE = { w: 5, h: 7 }, TO = { x: 11, y: 17 }, DOOR = { x: 2, y: 6 };   // (DOOR: within the building)
const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
const hgss = ROOT && fs.existsSync(path.join(ROOT, "files/fielddata")) ? require("./lib/hgss-map").renderMap(ROOT, "MAP_CHERRYGROVE", {}) : null;

for (const part of ["", "-top"]) {
  const src = hgss ? { width: hgss.width * 16, rgba: part ? hgss.buildingsTop : hgss.buildings } : readPng(path.join(mapsDir, "CherrygroveCity" + part + ".png"));
  const w = SIZE.w * T, h = SIZE.h * T, img = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const i = (FROM.y * T + y) * src.width + FROM.x * T;
    img.set(src.rgba.slice(i * 4, (i + w) * 4), y * w * 4);
  }
  // (Cherrygrove's flat green round the building, in from the edges: see-through, New Bark's ground.)
  if (!part && !hgss) {
    const bg = Array.from(img.slice(0, 4)), at = (x, y) => (y * w + x) * 4, same = (i) => bg.every((v, k) => img[i + k] === v);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push([x, 0], [x, h - 1]);
    for (let y = 0; y < h; y++) stack.push([0, y], [w - 1, y]);
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h || !same(at(x, y))) continue;
      img[at(x, y) + 3] = 0; img[at(x, y)] = img[at(x, y) + 1] = img[at(x, y) + 2] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  writePng(path.join(mapsDir, "NewBarkTown-patch-pokecenter" + part + ".png"), w, h, img);
}

const collision = [];
for (let y = 0; y < SIZE.h; y++) for (let x = 0; x < SIZE.w; x++)
  collision.push([TO.x + x, TO.y + y, 1, x === DOOR.x && y === DOOR.y ? 0x69 : 0]);
const door = { x: TO.x + DOOR.x, y: TO.y + DOOR.y };

const js = "// New Bark Town's Pokémon Center (tools/build-new-bark-center.js): Cherrygrove City's, cloned, where Fly lands.\n" +
  "(function () {\n" +
  "  const W = window.WORLD_MAPS, town = W.NewBarkTown, src1 = W.CherrygroveCity_PokemonCenter_1F, src2 = W.CherrygroveCity_PokemonCenter_2F;\n" +
  "  const F1 = \"NewBarkTown_PokemonCenter_1F\", F2 = \"NewBarkTown_PokemonCenter_2F\";\n" +
  "  if (!town || !src1 || !src2 || W[F1]) return;\n" +
  "  const clone = (src, name) => Object.assign(JSON.parse(JSON.stringify(src)), { name, title: \"New Bark Town\", image: src.image || src.name, townMapSection: \"NEW_BARK_TOWN\" });\n" +
  "  const f1 = clone(src1, F1), f2 = clone(src2, F2);\n" +
  "  // (On New Bark drawn from Pokémon Heart & Soul's, the building's there already, Cherrygrove's copied in by\n" +
  "  // tools/build-johto.js: its door, town.pokecenterDoor. On HGSS's: the building, over the ground south of Elm's\n" +
  "  // lab, a patch; its door, solid, walked up into.)\n" +
  "  const door = town.pokecenterDoor || { x: " + door.x + ", y: " + door.y + " };\n" +
  "  town.warps.push({ x: door.x, y: door.y, map: F1, warp: 0 });\n" +
  "  if (!town.pokecenterDoor) {\n" +
  "    town.patches = Object.assign({}, town.patches, { pokecenter: { x: " + TO.x + ", y: " + TO.y + ", w: " + SIZE.w + ", h: " + SIZE.h + ", top: true, collision: " + JSON.stringify(collision) + " } });\n" +
  "    // (Its tiles solid in the map's own data too, the patch always on: the door's warp works wherever the map's walked, tests/smoke-test.js's ways round Johto too.)\n" +
  "    for (const [x, y, c, b] of town.patches.pokecenter.collision) { town.collision[y * town.width + x] = c; town.behavior[y * town.width + x] = b; }\n" +
  "  }\n" +
  "  const back = town.warps.length - 1;\n" +
  "  f1.warps = f1.warps.map((w) => (w.map === \"CherrygroveCity\" ? Object.assign({}, w, { map: \"NewBarkTown\", warp: back }) : Object.assign({}, w, { map: F2 })));\n" +
  "  f2.warps = f2.warps.map((w) => (w.map === src1.name ? Object.assign({}, w, { map: F1 }) : w));\n" +
  "  // (Its nurse, and the gentleman by the PC; Cherrygrove's others stay there.)\n" +
  "  f1.people = f1.people.filter((p) => /Nurse$/.test(p.script || \"\") || /gentleman/.test(p.localId || \"\"))\n" +
  "    .map((p) => (/Nurse$/.test(p.script) ? Object.assign(p, { script: F1 + \"_EventScript_Nurse\", localId: \"LOCALID_NEWBARKTOWN_POKEMONCENTER_1F_NURSE\" }) : p));\n" +
  "  W[F1] = f1; W[F2] = f2;\n" +
  "  // (In Cherrygrove's Center's script zones, for its nurse and its gentleman: ui/johto-script.js zoneOf.)\n" +
  "  const J = window.JOHTO_SCRIPTS;\n" +
  "  if (J && J.maps) { J.maps[F1] = J.maps[src1.name]; J.maps[F2] = J.maps[src2.name]; }\n" +
  "  // (Fly: in front of its door, as in every other town, instead of your house.)\n" +
  "  const fly = () => { const M = window.JOHTO_TOWN_MAP; if (M && M.fly && M.fly.NEW_BARK_TOWN) M.fly.NEW_BARK_TOWN = { map: \"NewBarkTown\", x: door.x, y: door.y + 1, center: F1 }; if (M && M.mapSections) { M.mapSections[F1] = \"NEW_BARK_TOWN\"; M.mapSections[F2] = \"NEW_BARK_TOWN\"; } };\n" +
  "  fly();\n" +
  "})();\n";
const file = path.join(__dirname, "lib/johto-town-map_new-bark-center.generated.js");
fs.writeFileSync(file, js);
console.log("wrote", path.relative(root, file), "and assets/world/maps/NewBarkTown-patch-pokecenter.png (and -top)");
