// Hoenn's Town Map: Emerald's region map (a pret/pokeemerald checkout's graphics/pokenav/region_map
// and src/data/region_map), drawn as the game's other maps are, for tools/build-hoenn.js:
//
//   const T = require("./lib/hoenn-town-map")(<path to pret/pokeemerald>);
//   const data = T.build({ mapSections: { LittlerootTown: "LITTLEROOT_TOWN", ... }, heal: { ... }, consts: { ... } });
//
// Writes assets/town-map/hoenn.png: the 240x160 map, as Emerald draws it (its 64x64 affine background,
// one byte a tile, in map.pal; and the frame round it), with its cities' icons. Emerald's grid is 28x15
// squares (src/data/region_map/region_map_layout.h), the first at (8, 16). Returns what the game's Town Map
// needs, in the shape Johto's has (data/johto-maps.js): window.HOENN_TOWN_MAP, with Fly's landing spots:
// the heal locations (Emerald's Fly lands you outside each town's Pokémon Center).
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./png");

module.exports = function hoennTownMap(EM) {
  const root = path.join(__dirname, "../..");
  const G = (f) => path.join(EM, "graphics/pokenav/region_map", f);

  function draw() {
    const pal = readPal(G("map.pal")), sheet = readPng(G("map.png")), bin = fs.readFileSync(G("map.bin"));
    const W = 64, per = sheet.width / 8, rgba = new Uint8ClampedArray(240 * 160 * 4);
    // (The map: tile numbers in single bytes, 8 bits a pixel, its colours 112 and up: BG_PLTT_ID(7).)
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
      const t = bin[ty * W + tx], sx = (t % per) * 8, sy = Math.floor(t / per) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const c = pal[sheet.px[(sy + y) * sheet.width + sx + x] - 112] || [0, 0, 0], o = ((ty * 8 + y) * 240 + tx * 8 + x) * 4;
        rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
      }
    }
    // (The frame: a text background of 16-bit entries, 32 to a row.)
    const fr = readPng(G("frame.png")), fb = fs.readFileSync(G("frame.bin")), fper = fr.width / 8;
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
      const e = fb.readUInt16LE((ty * 32 + tx) * 2), t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, sx = (t % fper) * 8, sy = Math.floor(t / fper) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = fr.px[(sy + (vf ? 7 - y : y)) * fr.width + sx + (hf ? 7 - x : x)];
        if (!v) continue;
        const c = fr.palette[v], o = ((ty * 8 + y) * 240 + tx * 8 + x) * 4;
        rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
      }
    }
    fs.mkdirSync(path.join(root, "assets/town-map"), { recursive: true });
    writePng(path.join(root, "assets/town-map/hoenn.png"), 240, 160, rgba);
  }

  function build(info) {
    draw();
    const strip = (s) => String(s).replace(/^MAPSEC_/, "");
    const names = {};
    for (const x of JSON.parse(fs.readFileSync(path.join(EM, "src/data/region_map/region_map_sections.json"), "utf8")).map_sections) {
      names[strip(x.id)] = String(x.name || "").toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\bPokémon\b/i, "Pokémon").replace(/\bPoké/g, "Poké");
    }
    const layout = fs.readFileSync(path.join(EM, "src/data/region_map/region_map_layout.h"), "utf8");
    const grid = [...layout.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1].split(",").map((s) => strip(s.trim())).filter(Boolean).map((s) => (s === "NONE" ? "" : s)));
    const towns = [...new Set(grid.flat().filter((s) => /_(TOWN|CITY)$/.test(s)))];
    // Fly's landing spots: the towns' heal locations (outside the Pokémon Center; Littleroot's, outside your house).
    const fly = {};
    const heal = info.heal || {};
    for (const [id, h] of Object.entries(heal)) {
      const sec = ((id === "HEAL_LOCATION_LITTLEROOT_TOWN_BRENDANS_HOUSE" || id === "HEAL_LOCATION_LITTLEROOT_TOWN_MAYS_HOUSE") ? "LITTLEROOT_TOWN" : id.replace(/^HEAL_LOCATION_/, ""));
      if (!towns.includes(sec) || /_2F$|POKEMON_LEAGUE/.test(id)) continue;
      if (id === "HEAL_LOCATION_LITTLEROOT_TOWN_MAYS_HOUSE") { if (fly[sec]) fly[sec].girl = { x: h.x, y: h.y }; continue; }
      fly[sec] = { map: h.map, x: h.x, y: h.y };
    }
    return {
      id: "HOENN", label: "Hoenn", image: "assets/town-map/hoenn.png", x0: 8, y0: 16, width: grid[0].length, height: grid.length,
      map: grid, dungeon: grid.map((r) => r.map(() => "")), towns, names, mapSections: info.mapSections, fly, at: info.at || {}
    };
  }
  return { build, draw };
};
