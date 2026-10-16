// Builds the Town Map from pret/pokefirered's region map:
//
//   node tools/build-town-map.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes:
//   assets/town-map/kanto.png     the map, 240x160: graphics/region_map's
//                                 background layer with the Kanto map over it
//   assets/town-map/player.png    the player character's head (16x16)
//   assets/town-map/cursor.png    the cursor's two frames (16x16 each)
//   assets/town-map/dungeon-icon.png  the small icon on caves and forests:
//                                 two 8x8 frames, not visited and visited
//   data/town-map.js              window.TOWN_MAP: FireRed's 22 x 15 grid of map
//                                 sections (towns and routes, and the dungeon
//                                 layer: caves and forests), their names, and the
//                                 section each of the game's maps is in. Grid
//                                 cell (x, y) is at pixels (32 + 8x, 32 + 8y),
//                                 8 x 8, as in src/region_map.c. `fly`: where
//                                 Fly lands in each place you can fly to (and
//                                 its Pokémon Center: going in counts as a visit).
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/region_map/kanto.bin"))) {
  console.error("Usage: node tools/build-town-map.js <path to pret/pokefirered>\n" +
    "(needs graphics/region_map/, src/data/region_map/ and data/maps/ checked out)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const P = (...p) => path.join(pret, ...p);
const G = (f) => P("graphics/region_map", f);
const out = path.join(root, "assets/town-map");
fs.mkdirSync(out, { recursive: true });

// ---------- The picture ----------

// BG1 (the sea-and-grid background) under BG0 (Kanto), both with region_map.pal.
const ram = paletteRam([[0, readPal(G("region_map.pal"))]]);
const back = renderBg({ tiles: G("background.png"), map: G("background.bin"), widthTiles: 30, heightTiles: 20, rowWidth: 30, ram, opaque: true });
const kanto = renderBg({ tiles: G("region_map.png"), map: G("kanto.bin"), widthTiles: 30, heightTiles: 20, rowWidth: 30, ram, lowNibble: true });
const rgba = new Uint8ClampedArray(back.rgba);
for (let i = 0; i < rgba.length; i += 4) if (kanto.rgba[i + 3]) rgba.set(kanto.rgba.subarray(i, i + 4), i);
writePng(path.join(out, "kanto.png"), back.width, back.height, rgba);
// The Sevii Islands' maps (sevii_123.bin, sevii_45.bin, sevii_67.bin), drawn
// the same way: the map you switch to on the Town Map once you have its page.
// Navel Rock and Birth Island, FireRed's Mystery Gift islands, aren't built
// here: they stay sea, as FireRed draws them till you've been (src/region_map.c's
// BufferRegionMapBg: FillBgTilemapBufferRect_Palette0(0, 0x003, 13, 11, 3, 2)
// on 4-5, and (21, 16, 3, 3) on 6-7), and their squares aren't on the grid.
const SEA = { "sevii_45.bin": [13, 11, 3, 2, "NAVEL_ROCK"], "sevii_67.bin": [21, 16, 3, 3, "BIRTH_ISLAND"] };
for (const [bin, file] of [["sevii_123.bin", "sevii-123.png"], ["sevii_45.bin", "sevii-45.png"], ["sevii_67.bin", "sevii-67.png"]]) {
  const tilemap = Buffer.from(fs.readFileSync(G(bin)));
  if (SEA[bin]) {
    const [x0, y0, w, h] = SEA[bin];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) tilemap.writeUInt16LE(0x003, (y * 30 + x) * 2);
  }
  const islands = renderBg({ tiles: G("region_map.png"), map: tilemap, widthTiles: 30, heightTiles: 20, rowWidth: 30, ram, lowNibble: true });
  const px = new Uint8ClampedArray(back.rgba);
  for (let i = 0; i < px.length; i += 4) if (islands.rgba[i + 3]) px.set(islands.rgba.subarray(i, i + 4), i);
  writePng(path.join(out, file), back.width, back.height, px);
}

// Sprites: colour 0 is transparent.
function sprite(png, pal, file) {
  const img = readPng(G(png));
  const colours = readPal(G(pal));
  const px = new Uint8ClampedArray(img.width * img.height * 4);
  for (let i = 0; i < img.px.length; i++) {
    if (!img.px[i]) continue;
    const c = colours[img.px[i]];
    px.set([c[0], c[1], c[2], 255], i * 4);
  }
  writePng(path.join(out, file), img.width, img.height, px);
}
sprite("cursor.png", "cursor.pal", "cursor.png");
sprite("dungeon_icon.png", "misc_icon.pal", "dungeon-icon.png");

// The player's icon: the head of the player character's overworld sprite
// (assets/sprites/overworld/player_character_normal.png, facing down), in a
// 16x16 box like FireRed's player_icon_red.png.
{
  const sheet = readPng(path.join(root, "assets/sprites/overworld/player_character_normal.png"));
  const at = (x, y) => sheet.px[y * sheet.width + x];
  let top = 0;
  while (top < 32 && ![...Array(16).keys()].some((x) => at(x, top))) top++;
  const HEAD = 14;   // rows from the top of the hat to the chin
  const icon = new Uint8ClampedArray(16 * 16 * 4);
  for (let y = 0; y < HEAD; y++) for (let x = 0; x < 16; x++) {
    const v = at(x, top + y);
    if (!v) continue;
    const c = sheet.palette[v];
    icon.set([c[0], c[1], c[2], 255], ((y + 1) * 16 + x) * 4);
  }
  writePng(path.join(out, "player.png"), 16, 16, icon);
}

// ---------- The grid and names ----------

const layoutOf = (file) => fs.readFileSync(P("src/data/region_map", file), "utf8");
let layout = layoutOf("region_map_layout_kanto.h");
const layer = (name) => {
  const start = layout.indexOf("[" + name + "]");
  const next = layout.indexOf("[LAYER_", start + 1);
  const body = layout.slice(layout.indexOf("{", start) + 1, next < 0 ? layout.lastIndexOf("};") : next);
  return [...body.matchAll(/\{([^{}]*)\}/g)].map((row) => row[1].split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => (s === "MAPSEC_NONE" ? null : s.replace(/^MAPSEC_/, ""))));
};
const map = layer("LAYER_MAP"), dungeon = layer("LAYER_DUNGEON");
// The Sevii Islands' grids (region_map_layout_sevii_*.h), the same size:
// FireRed's REGIONMAP_SEVII123, _SEVII45 and _SEVII67, and the picture of each.
const sevii = [["SEVII_123", "region_map_layout_sevii_123.h", "sevii-123.png"], ["SEVII_45", "region_map_layout_sevii_45.h", "sevii-45.png"],
  ["SEVII_67", "region_map_layout_sevii_67.h", "sevii-67.png"]].map(([id, file, png]) => {
  layout = layoutOf(file);
  // (Without Navel Rock's and Birth Island's squares: see SEA above.)
  const sea = new Set(Object.values(SEA).map((h) => h[4]));
  const grid = (name) => layer(name).map((row) => row.map((s) => (sea.has(s) ? null : s)));
  return { id, image: "assets/town-map/" + png, map: grid("LAYER_MAP"), dungeon: grid("LAYER_DUNGEON") };
});

// "PALLET TOWN" -> "Pallet Town", "MT. MOON" -> "Mt. Moon", "POKéMON TOWER" -> "Pokémon Tower".
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s.])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const sections = JSON.parse(fs.readFileSync(P("src/data/region_map/region_map_sections.json"), "utf8")).map_sections;
const used = new Set([...map.flat(), ...dungeon.flat(), ...sevii.flatMap((r) => [...r.map.flat(), ...r.dungeon.flat()])].filter(Boolean));
// Which section each of the game's maps is in (its map.json).
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/world-maps.js"), "utf8"));
const mapSections = {};
for (const name of Object.keys(window.WORLD_MAPS)) {
  // (Maps the game adds, like a Mart's 2F, are where the floor below is.)
  let file = P("data/maps", name, "map.json");
  if (!fs.existsSync(file)) file = P("data/maps", name.replace(/_\dF$/, ""), "map.json");
  if (!fs.existsSync(file)) continue;
  const sec = JSON.parse(fs.readFileSync(file, "utf8")).region_map_section;
  if (sec) mapSections[name] = sec.replace(/^MAPSEC_/, "");
}

// Names for the sections on the grid and those the game's maps are in (the
// Underground Path and the S.S. Anne have no square of their own).
for (const id of Object.values(mapSections)) used.add(id);
const names = {};
for (const s of sections) {
  const id = s.id.replace(/^MAPSEC_/, "");
  if (used.has(id) && s.name) names[id] = titleCase(s.name).replace(/^S\.s\. /, "S.S. ");
}

// The towns (src/region_map.c's GetMapsecType: the sections that are visited
// or not, not routes): a dungeon icon on a town's square sits 2 pixels lower
// and to the right (CreateDungeonIconSprite), except on Route 10's Center.
const regionMapC = fs.readFileSync(P("src/region_map.c"), "utf8");
const typeFn = regionMapC.slice(regionMapC.indexOf("static u8 GetMapsecType(u8 mapsec)"), regionMapC.indexOf("static u8 GetDungeonMapsecType(u8 mapsec)"));
const towns = [...typeFn.matchAll(/case MAPSEC_(\w+):/g)].map((m) => m[1]).filter((s) => s !== "NONE" && s !== "ROUTE_10_POKECENTER");

// Where Fly lands in each place you can fly to (src/region_map.c's
// sMapsecToSpawn, FireRed's heal locations: outside the Pokémon Center, or
// your house in Pallet Town), for the places the game has built.
const constOf = {};
for (const name of Object.keys(window.WORLD_MAPS)) {
  const file = P("data/maps", name, "map.json");
  if (fs.existsSync(file)) constOf[JSON.parse(fs.readFileSync(file, "utf8")).id] = name;
}
const heals = {};
for (const h of JSON.parse(fs.readFileSync(P("src/data/heal_locations.json"), "utf8")).heal_locations) heals[h.id] = h;
const fly = {};
for (const m of regionMapC.matchAll(/\[MAPSEC_(\w+)\s*- KANTO_MAPSEC_START\]\s*=\s*\{MAP\((MAP_\w+)\),\s*(HEAL_LOCATION_\w+)\}/g)) {
  const h = heals[m[3]];
  if (h && constOf[h.map]) fly[m[1]] = Object.assign({ map: constOf[h.map], x: h.x, y: h.y }, constOf[h.respawn_map] ? { center: constOf[h.respawn_map] } : {});
}

const data = { width: map[0].length, height: map.length, map, dungeon, names, mapSections, towns, fly, sevii };
fs.writeFileSync(path.join(root, "data/town-map.js"),
  "// Auto-generated by tools/build-town-map.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.TOWN_MAP = " + JSON.stringify(data) + ";\n");
console.log("wrote assets/town-map/ and data/town-map.js: " + data.width + "x" + data.height + " grid, " +
  Object.keys(names).length + " places, " + Object.keys(mapSections).length + " maps placed");
