// Builds what FireRed's Pokédex screens (src/pokedex_screen.c) are drawn
// with, from pret/pokefirered:
//
//   node tools/build-pokedex-screen.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/pokedex/:
//   wallpaper.png     the menus' and lists' background (tile 14 everywhere), 240x160
//   entry.png         an entry's page: the white panel over the beige one with
//                     the brown divider between (rows 2-17), 240x160
//   area.png          the AREA / SIZE page: the white panel and the SIZE box's border, 240x160
//   habitat.png       a habitat page's beige background, 240x160
//   circle-<n>.png    a habitat page's circle (page_icon_tilemap.bin), 64x64:
//                     0 as it is, 1-4 the selected one's colours as they pulse
//   cat-<name>.png    the table of contents' icons (cat_icon_*.png), 64x48
//   mini-page.png, caught-marker.png   a habitat page's card and its caught mark
//   ball.png          the caught ball in the lists (menu_info.png 0,0 in
//                     dex_caught_pokeball.pal), 12x12
//   map-kanto.png     the area page's map, 96x72
//   marker-<n>.png    the area markers' shapes (area_markers/marker_0..6.png)
//   footprints.png    the first 386 species' footprints, 16x16 each, 32 to a row
// and data/pokedex-screen.js: window.POKEDEX_SCREEN = {
//   habitats: [{ name, icon, pages: [[species, ...], ...] }]  (pokedex_categories.h)
//   sizes:    { <dex number>: [pokemonScale, pokemonOffset, trainerScale, trainerOffset] }
//   markers:  { <MAPSEC>: [shape, x, y] }  (pokedex_area_markers.c, wild_pokemon_area.c)
// }
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const vm = require("vm");
const { readPng, writePng, readPal } = require("./lib/png");

const pret = process.argv[2] || process.env.POKEFIRERED;
const P = (...p) => path.join(pret || "", ...p);
if (!pret || !fs.existsSync(P("graphics/pokedex/kanto_dex_bgtiles.png"))) {
  console.error("Usage: node tools/build-pokedex-screen.js <path to pret/pokefirered>  (needs graphics/pokedex/, graphics/interface/)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const out = path.join(root, "assets/pokedex");
fs.mkdirSync(out, { recursive: true });
const git = (file) => execFileSync("git", ["-C", pret, "show", "HEAD:" + file], { maxBuffer: 1 << 26 });
const src = (file) => git(file).toString("utf8");

global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const ourName = {};
for (const name of Object.keys(window.DEX)) if (window.DEX[name].id < 10000 && !ourName[key(name)]) ourName[key(name)] = name;
const speciesOf = (c) => ourName[key(c.replace(/^SPECIES_/, ""))];

// ---------- Backgrounds (BG3, the dex's 32 tiles and palette 0) ----------

const tiles = readPng(P("graphics/pokedex/kanto_dex_bgtiles.png"));
const pals = readPal(P("graphics/pokedex/kanto_dex_bgpals.pal"));
const pal0 = pals.slice(0, 16);
// A screen of tile entries (tile | 0x400 hflip | 0x800 vflip), rows of 30.
function render(map, pal, opaque) {
  const W = 240, H = 160, rgba = new Uint8ClampedArray(W * H * 4);
  map.forEach((e, i) => {
    if (e == null) return;
    const t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, tx = (i % 30) * 8, ty = Math.floor(i / 30) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = tiles.px[(t * 8 + (vf ? 7 - y : y)) * 8 + (hf ? 7 - x : x)] & 15;
      if (!v && !opaque) continue;
      rgba.set([...pal[v], 255], ((ty + y) * W + tx + x) * 4);
    }
  });
  return rgba;
}
const H_ = 0x400, V_ = 0x800;
const screen = (fill) => new Array(600).fill(fill);
const put = (m, x, y, e) => { m[y * 30 + x] = e; };
writePng(path.join(out, "wallpaper.png"), 240, 160, render(screen(14), pal0, true));
writePng(path.join(out, "habitat.png"), 240, 160, render(screen(2), pal0, true));
{
  // DexScreen_DrawMonDexPage's frame: rows 2-17.
  const m = screen(14);
  for (let x = 0; x < 30; x++) {
    const edge = x === 0 ? 0 : x === 29 ? H_ : null;
    put(m, x, 2, edge == null ? 5 : 4 | edge);
    put(m, x, 11, edge == null ? 8 : 7 | edge);
    put(m, x, 17, edge == null ? 11 : 10 | edge);
    for (let y = 3; y <= 10; y++) put(m, x, y, edge == null ? 1 : 6 | edge);
    for (let y = 12; y <= 16; y++) put(m, x, y, edge == null ? 2 : 9 | edge);
  }
  writePng(path.join(out, "entry.png"), 240, 160, render(m, pal0, true));
}
{
  // DexScreen_DrawMonAreaPage: a white rounded panel, and the SIZE box's border (BG0).
  const m = screen(14);
  for (let x = 0; x < 30; x++) for (let y = 2; y <= 17; y++) {
    const l = x === 0, r = x === 29, t = y === 2, b = y === 17;
    put(m, x, y, (t || b) && (l || r) ? 4 | (r ? H_ : 0) | (b ? V_ : 0) : t ? 5 : b ? 5 | V_ : l ? 6 : r ? 6 | H_ : 1);
  }
  const box = screen(null);
  for (let x = 1; x <= 12; x++) for (let y = 9; y <= 16; y++) {
    const l = x === 1, r = x === 12, t = y === 9, b = y === 16;
    if (!(l || r || t || b)) continue;
    put(box, x, y, (t || b) && (l || r) ? 29 | (r ? H_ : 0) | (b ? V_ : 0) : t ? 30 : b ? 30 | V_ : l ? 31 : 31 | H_);
  }
  // (The box is on BG0, over the panel: its colour 0 shows the panel.)
  const panel = render(m, pal0, true), border = render(box, pal0, false);
  for (let i = 0; i < panel.length; i += 4) if (border[i + 3]) panel.set(border.subarray(i, i + 4), i);
  writePng(path.join(out, "area.png"), 240, 160, panel);
}
{
  // The habitat circle: 8x8 tiles (page_icon_tilemap.bin), in palette 0's colours
  // with 2 and 8 the pulsing pair (5-bit RGB).
  const bin = fs.readFileSync(P("graphics/pokedex/page_icon_tilemap.bin"));
  const PAIRS = [[[24, 22, 17], [26, 24, 20]], [[26, 20, 15], [27, 23, 19]], [[28, 18, 15], [28, 22, 19]],
    [[30, 16, 13], [29, 21, 18]], [[28, 18, 15], [28, 22, 19]]];
  const c5 = (c) => c.map((v) => (v << 3) | (v >> 2));
  PAIRS.forEach(([a, b], n) => {
    const pal = pal0.slice(); pal[2] = c5(a); pal[8] = c5(b);
    const rgba = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < 64; i++) {
      const e = bin.readUInt16LE(i * 2), t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, tx = (i % 8) * 8, ty = Math.floor(i / 8) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = tiles.px[(t * 8 + (vf ? 7 - y : y)) * 8 + (hf ? 7 - x : x)] & 15;
        if (v) rgba.set([...pal[v], 255], ((ty + y) * 64 + tx + x) * 4);
      }
    }
    writePng(path.join(out, "circle-" + n + ".png"), 64, 64, rgba);
  });
}

// ---------- Pictures in their own palettes ----------

function copy(file, dest, palette, w, h) {
  const img = readPng(P(file)), pal = palette || img.palette;
  const W = w || img.width, H = h || img.height, rgba = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = img.px[y * img.width + x] & 15;
    if (v) rgba.set([...pal[v], 255], (y * W + x) * 4);
  }
  writePng(path.join(out, dest), W, H, rgba);
}
const CATS = ["numerical", "grassland", "forest", "waters_edge", "sea", "cave", "mountain", "rough_terrain", "urban", "rare",
  "abc", "type", "lightest", "smallest", "cancel"];
for (const c of CATS) copy("graphics/pokedex/cat_icon_" + c + ".png", "cat-" + c.replace(/_/g, "-") + ".png");
copy("graphics/pokedex/mini_page.png", "mini-page.png");
copy("graphics/pokedex/caught_marker.png", "caught-marker.png");
copy("graphics/pokedex/map_kanto.png", "map-kanto.png");
copy("graphics/interface/menu_info.png", "ball.png", readPal(P("graphics/interface/dex_caught_pokeball.pal")), 12, 12);
for (let i = 0; i <= 6; i++) copy("graphics/pokedex/area_markers/marker_" + i + ".png", "marker-" + i + ".png", readPal(P("graphics/pokedex/area_markers/marker.pal")));

// Footprints (graphics/pokemon/<name>/footprint.png, 1bpp 16x16): black where set.
{
  const dirs = execFileSync("git", ["-C", pret, "ls-tree", "--name-only", "HEAD", "graphics/pokemon/"]).toString().trim().split("\n").map((d) => d.split("/").pop());
  const byKey = Object.fromEntries(dirs.map((d) => [key(d), d]));
  const W = 32 * 16, H = Math.ceil(387 / 32) * 16, rgba = new Uint8ClampedArray(W * H * 4);
  let n = 0;
  for (const [name, d] of Object.entries(window.DEX)) {
    if (d.id > 386 || d.id < 1 || ourName[key(name)] !== name) continue;
    const dir = byKey[key(name)];
    if (!dir) continue;
    let png;
    try { png = git("graphics/pokemon/" + dir + "/footprint.png"); } catch (e) { continue; }
    const tmp = path.join(out, ".fp.png");
    fs.writeFileSync(tmp, png);
    const img = readPng(tmp);
    fs.unlinkSync(tmp);
    const ox = (d.id % 32) * 16, oy = Math.floor(d.id / 32) * 16;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      // (1bpp, black on white: the black is the ink.)
      if (!img.px[y * img.width + x]) rgba.set([0, 0, 0, 255], ((oy + y) * W + ox + x) * 4);
    }
    n++;
  }
  writePng(path.join(out, "footprints.png"), W, H, rgba);
  console.log("footprints: " + n);
}

// ---------- Data ----------

const data = { habitats: [], sizes: {}, markers: {} };
{
  const text = src("src/data/pokemon/pokedex_categories.h");
  const pages = {};
  for (const [, name, , body] of text.matchAll(/static const u16 sDexCategory_(\w+)_Page(\d+)\[\] = \{([\s\S]*?)\};/g)) {
    (pages[name] = pages[name] || []).push([...body.matchAll(/SPECIES_\w+/g)].map((m) => speciesOf(m[0])).filter(Boolean));
  }
  const NAMES = { GrasslandPkmn: "Grassland", ForestPkmn: "Forest", WatersEdgePkmn: "Water's-edge", SeaPkmn: "Sea", CavePkmn: "Cave",
    MountainPkmn: "Mountain", RoughTerrainPkmn: "Rough-terrain", UrbanPkmn: "Urban", RarePkmn: "Rare" };
  for (const [k, name] of Object.entries(NAMES)) {
    data.habitats.push({ name, icon: CATS[1 + Object.keys(NAMES).indexOf(k)].replace(/_/g, "-"), pages: pages[k] || [] });
  }
}
{
  const text = src("src/data/pokemon/pokedex_entries.h"), order = src("include/constants/pokedex.h");
  const dexNum = {};
  let n = 0;
  for (const [, c] of order.matchAll(/^\s*NATIONAL_DEX_(\w+),/gm)) dexNum[c] = n++;
  for (const [, c, body] of text.matchAll(/\[NATIONAL_DEX_(\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
    const v = (f) => +((new RegExp("\\." + f + "\\s*=\\s*(-?\\d+)").exec(body) || [])[1] || 0);
    if (dexNum[c]) data.sizes[dexNum[c]] = [v("pokemonScale"), v("pokemonOffset"), v("trainerScale"), v("trainerOffset")];
  }
}
{
  const markers = src("src/pokedex_area_markers.c"), areas = src("src/wild_pokemon_area.c");
  const SHAPES = ["MARKER_CIRCULAR", "MARKER_SMALL_H", "MARKER_SMALL_V", "MARKER_MED_H", "MARKER_MED_V", "MARKER_LARGE_H", "MARKER_LARGE_V"];
  const byArea = {};
  for (const [, a, s, x, y] of markers.matchAll(/\[(DEX_AREA_\w+)\]\s*=\s*\{\s*(MARKER_\w+),\s*(-?\d+),\s*(-?\d+)\s*\}/g)) byArea[a] = [SHAPES.indexOf(s), +x, +y];
  for (const [, sec, a] of areas.matchAll(/\{\s*MAPSEC_(\w+),\s*(DEX_AREA_\w+)\s*\}/g)) if (byArea[a]) data.markers[sec] = byArea[a];
}
fs.writeFileSync(path.join(root, "data/pokedex-screen.js"),
  "// Auto-generated by tools/build-pokedex-screen.js from pret/pokefirered. Do not edit by hand.\n" +
  "window.POKEDEX_SCREEN = " + JSON.stringify(data) + ";\n");
console.log("wrote assets/pokedex/ and data/pokedex-screen.js: " + data.habitats.map((h) => h.name + " " + h.pages.length).join(", ") +
  "; " + Object.keys(data.sizes).length + " sizes, " + Object.keys(data.markers).length + " markers");
