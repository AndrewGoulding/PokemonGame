// Builds maps from Pokémon Emerald (a pret/pokeemerald checkout) in this
// game's map format: Faraway Island (its shore and its grassy interior),
// which the Old Sea Map leads to.
//
//   node tools/build-emerald-maps.js <path to pret/pokeemerald>
//   (or set POKEEMERALD=<path>)
//
// Emerald's maps are made like FireRed's (16x16 metatiles of 8x8 tiles), but
// from Emerald's own tilesets, read straight from the checkout
// (data/tilesets): 512 tiles and metatiles in the primary tileset, 6 primary
// palettes, 16-bit metatile attributes (behaviour, and the layer type in
// bits 12-15). The General tileset's animations are Emerald's
// (src/tileset_anims.c: flowers, water, the sand's and land's water edges,
// waterfalls, each every 16 frames), as e_* anims ui/overworld.js times.
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png, -anim.png
//   assets/world/sprites/mew.png     Emerald's Mew (16x32, FireRed's frame order)
//   assets/sprites/items/key-item/old-sea-map.png   the Old Sea Map's icon
//   data/emerald-maps.js             window.WORLD_MAPS entries for them
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");

const EM = process.argv[2] || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "data/tilesets/primary/general"))) {
  console.error("Usage: node tools/build-emerald-maps.js <path to pret/pokeemerald>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const P = (...p) => path.join(EM, ...p);
const outMaps = path.join(root, "assets/world/maps");

const {
  GENERAL_ANIMS, loadTileset, metatile, render, animCells, writeAnimSheet, frBehavior, tilesetFolder
} = require("./lib/emerald-tiles")(EM);

// ---------- The maps ----------

const layouts = {};
for (const l of JSON.parse(fs.readFileSync(P("data/layouts/layouts.json"), "utf8")).layouts) if (l.id) layouts[l.id] = l;
const general = loadTileset("primary", "general", GENERAL_ANIMS);

const MAPS = [
  { name: "FarawayIsland_Entrance", title: "Faraway Island", music: "mus_sevii_dungeon" },
  { name: "FarawayIsland_Interior", title: "Faraway Island", music: "mus_sevii_dungeon" }
];
const byConst = {};
for (const m of MAPS) byConst[JSON.parse(fs.readFileSync(P("data/maps", m.name, "map.json"), "utf8")).id] = m.name;

// Emerald's text for the signs (data/text/event_ticket_2.inc).
function emeraldText(label) {
  const src = fs.readFileSync(P("data/text/event_ticket_2.inc"), "utf8");
  const at = src.indexOf("\n" + label + ":");
  if (at < 0) return null;
  const body = src.slice(at + 1).split("\n").slice(1);
  let s = "";
  for (const line of body) {
    const m = /^\s*\.string "(.*)"$/.exec(line);
    if (!m) break;
    s += m[1];
    if (m[1].endsWith("$")) break;
  }
  return s.replace(/\$$/, "").replace(/\\l/g, "\n").split("\\p").map((p) => p.replace(/\\n/g, "\n"));
}

// The people (map.json's object events, in FireRed's looks): on the shore
// the Seagallop's sailor and the ferry where the S.S. Tidal docks in Emerald;
// inside, Mew (FarawayIsland_Interior_EventScript_Mew; ui/game.js plays its
// hide and seek).
const person = (id, x, y, sprite, w, h, frames, movement, script, extra) => Object.assign(
  { id, x, y, movement, rangeX: 1, rangeY: 1, script, flag: null, text: null, sprite, width: w, height: h, frames }, extra || {});
const PEOPLE = {
  FarawayIsland_Entrance: [
    person(0, 13, 39, "sailor", 16, 32, 10, "face_up", "FarawayIsland_Entrance_EventScript_Sailor", { localId: "LOCALID_FARAWAY_ISLAND_SAILOR" }),
    person(1, 13, 42, "seagallop", 64, 64, 1, "face_down", "0x0", { inanimate: true })
  ],
  FarawayIsland_Interior: [
    person(0, 13, 17, "mew", 16, 32, 9, "face_down", "FarawayIsland_Interior_EventScript_Mew",
      { localId: "LOCALID_FARAWAY_ISLAND_MEW", flag: "FLAG_HIDE_MEW", text: ["Myuu…"] })
  ]
};

const out = {};
for (const m of MAPS) {
  const map = JSON.parse(fs.readFileSync(P("data/maps", m.name, "map.json"), "utf8"));
  const layout = layouts[map.layout];
  const w = layout.width, h = layout.height;
  const secondary = loadTileset("secondary", tilesetFolder(layout.secondary_tileset));
  const bin = fs.readFileSync(P(layout.blockdata_filepath));
  const blocks = Array.from({ length: w * h }, (_, i) => bin.readUInt16LE(i * 2));
  const r = render(blocks, w, h, general, secondary, false);
  writePng(path.join(outMaps, m.name + ".png"), w * 16, h * 16, r.below);
  if (r.anyAbove) writePng(path.join(outMaps, m.name + "-top.png"), w * 16, h * 16, r.above);
  const bb = fs.readFileSync(P(layout.border_filepath));
  const border = [0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2));
  writePng(path.join(outMaps, m.name + "-border.png"), 32, 32, render(border, 2, 2, general, secondary, true).below);
  const anim = animCells(blocks, w, h, general, secondary);
  if (anim.pics.length) writeAnimSheet(path.join(outMaps, m.name + "-anim.png"), anim.pics);

  const collision = [], elevation = [], behavior = [], encounter = [];
  for (const b of blocks) {
    const mt = metatile(general, secondary, b & 0x3ff);
    collision.push((b >> 10) & 3);
    elevation.push(b >> 12);
    behavior.push(frBehavior(mt.behavior));
    // (No wild Pokémon on Faraway Island: only Mew, in the grass.)
    encounter.push(0);
  }
  out[m.name] = {
    // (MAP_TYPE_INDOOR in Emerald: no Fly, no Escape Rope; Mew's battle in the grass.)
    name: m.name, title: m.title, width: w, height: h, type: "indoor", music: m.music, region: "emerald",
    battleScene: m.name === "FarawayIsland_Interior" ? "grass" : undefined,
    cycling: !!map.allow_cycling, showName: true, top: r.anyAbove, borderWidth: 2, borderHeight: 2,
    anim: anim.cells.length ? { cells: anim.cells, anims: general.anims.map((a) => a.name) } : undefined,
    collision, elevation, behavior, encounter,
    connections: [],
    warps: map.warp_events.map((wp) => ({ x: wp.x, y: wp.y, map: byConst[wp.dest_map] || null, mapConst: byConst[wp.dest_map] ? undefined : wp.dest_map, warp: +wp.dest_warp_id })),
    signs: (map.bg_events || []).filter((b) => b.type === "sign").map((b) => ({ x: b.x, y: b.y, script: b.script,
      text: emeraldText(b.script.replace("EventScript", "Text")) })),
    triggers: [], hidden: [],
    people: PEOPLE[m.name] || [], wild: null
  };
  console.log(m.name, w + "x" + h, "anim cells", anim.cells.length / 4);
}

// Emerald's Mew (graphics/object_events/pics/pokemon/mew.png: 16x32 frames,
// the walking sheet's order, as FireRed's).
{
  const png = readPng(P("graphics/object_events/pics/pokemon/mew.png"));
  const rgba = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.px.length; i++) {
    const c = png.px[i];
    if (!c) continue;
    const rgb = png.palette[c];
    rgba[i * 4] = rgb[0]; rgba[i * 4 + 1] = rgb[1]; rgba[i * 4 + 2] = rgb[2]; rgba[i * 4 + 3] = 255;
  }
  writePng(path.join(root, "assets/world/sprites/mew.png"), png.width, png.height, rgba);
}

// The Old Sea Map's Bag icon (graphics/items/icons/old_sea_map.png, 24x24 in
// its own palette), centred in 32x32 like the other item pictures.
{
  const png = readPng(P("graphics/items/icons/old_sea_map.png"));
  const pal = readPal(P("graphics/items/icon_palettes/old_sea_map.pal"));
  const rgba = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const c = png.px[y * png.width + x];
    if (!c) continue;
    const o = ((y + 4) * 32 + x + 4) * 4;
    rgba[o] = pal[c][0]; rgba[o + 1] = pal[c][1]; rgba[o + 2] = pal[c][2]; rgba[o + 3] = 255;
  }
  writePng(path.join(root, "assets/sprites/items/key-item/old-sea-map.png"), 32, 32, rgba);
}

// (Keeping Celadon's Berry Farm, which tools/build-berry-farm.js puts at its end.)
const emeraldFile = path.join(root, "data/emerald-maps.js"), before = fs.existsSync(emeraldFile) ? fs.readFileSync(emeraldFile, "utf8") : "";
const farmAt = before.indexOf("// Celadon's Berry Farm (tools/build-berry-farm.js");
fs.writeFileSync(emeraldFile,
  "// Auto-generated by tools/build-emerald-maps.js from pret/pokeemerald. Do not edit by hand.\n" +
  "// Faraway Island, added to FireRed's maps (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" + (farmAt >= 0 ? before.slice(farmAt) : ""));
console.log("wrote " + MAPS.length + " Emerald maps to data/emerald-maps.js and assets/world/");
