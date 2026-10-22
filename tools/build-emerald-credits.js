// Builds the pictures for Emerald's credits (ui/hall-of-fame.js hoennCredits) from
// pret/pokeemerald's graphics:
//
//   node tools/build-emerald-credits.js <path to pret/pokeemerald>   (or set POKEEMERALD)
//
// Needs graphics/intro/, graphics/credits/ and graphics/starter_choose/ checked out. The
// backgrounds the player bikes past (src/intro_credits_graphics.c) are drawn whole, 256x256,
// from their tile sheets, tilemaps and palettes: the sky over the sea by day and at sunset,
// the forest at sunset and the town at night, each twice where Emerald cycles two palette
// colours (the glint on the sea, the town's lit windows), and the grass by day, sunset and
// night; the scenery that drifts past (clouds, small trees, house silhouettes) cut from its
// sprite sheets; Brendan and May on their bicycles (seven 64x64 frames each: four pedalling,
// three looking back) and the bicycle itself (four 64x32 frames); THE END, assembled from
// its letter tiles as DrawTheEnd does; and the grass behind the Pokémon interludes (Prof.
// Birch's bag scene). Writes assets/credits/emerald/.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEEMERALD;
if (!pret || !fs.existsSync(path.join(pret, "graphics/intro/scene_2"))) {
  console.error("Usage: node tools/build-emerald-credits.js <path to pret/pokeemerald>  (needs graphics/intro, credits, starter_choose)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const out = path.join(root, "assets/credits/emerald");
fs.mkdirSync(out, { recursive: true });
const G = (...p) => path.join(pret, "graphics", ...p);
const S2 = (f) => G("intro/scene_2", f);
const save = (name, img) => writePng(path.join(out, name + ".png"), img.width, img.height, img.rgba);
// A .pal (or a PNG's palette) as palette RAM from slot `from`, 16 colours a slot.
const slots = (colours, from) => { const r = []; for (let i = 0; i * 16 < colours.length; i++) r.push([from + i, colours.slice(i * 16, i * 16 + 16)]); return r; };
const pal = (f) => (f.endsWith(".pal") ? readPal(f) : readPng(f).palette);

// GBA 15-bit colour as [r, g, b] (the two colours the town's windows blink between).
const rgb = (r, g, b) => [r * 8 + (r >> 2), g * 8 + (g >> 2), b * 8 + (b >> 2)];

// ---------- The backgrounds (BG3 the scenery, BG1 the grass) ----------
function bg(tiles, map, colours, name, swap) {
  const c = colours.slice();
  if (swap) { const t = c[swap[0]]; c[swap[0]] = c[swap[1]]; c[swap[1]] = t; }
  save(name, renderBg({ tiles, map, widthTiles: 32, heightTiles: 32, ram: paletteRam(slots(c, 0)), opaque: true }));
}
const cloudsBg = pal(S2("clouds_bg.pal")), cloudsBgSunset = pal(S2("clouds_bg_sunset.pal"));
bg(S2("clouds_bg.png"), S2("clouds_bg_map.bin"), cloudsBg, "sky-day-a");
bg(S2("clouds_bg.png"), S2("clouds_bg_map.bin"), cloudsBg, "sky-day-b", [9, 10]);
bg(S2("clouds_bg.png"), S2("clouds_bg_map.bin"), cloudsBgSunset, "sky-sunset-a");
bg(S2("clouds_bg.png"), S2("clouds_bg_map.bin"), cloudsBgSunset, "sky-sunset-b", [9, 10]);
bg(S2("trees.png"), S2("trees_map.bin"), pal(S2("trees_sunset.pal")), "forest-sunset");
{
  // (CycleSceneryPalette(2): colours 12 and 13 of the town's palette swap between RGB(7, 9, 15) and yellow.)
  const houses = pal(S2("houses.pal"));
  const a = houses.slice(), b = houses.slice();
  a[12] = rgb(7, 9, 15); a[13] = rgb(21, 20, 0);
  b[12] = rgb(28, 24, 0); b[13] = rgb(7, 9, 15);
  bg(S2("houses.png"), S2("houses_map.bin"), a, "town-night-a");
  bg(S2("houses.png"), S2("houses_map.bin"), b, "town-night-b");
}
for (const [name, p] of [["grass-day", pal(S2("grass.png"))], ["grass-sunset", pal(S2("grass_sunset.pal"))], ["grass-night", pal(S2("grass_night.pal"))]])
  save(name, renderBg({ tiles: S2("grass.png"), map: S2("grass_map.bin"), widthTiles: 32, heightTiles: 32, ram: paletteRam([[15, p]]) }));

// The grass behind the Pokémon interludes (starter_choose's Birch bag scene; the credits scroll it up 32).
{
  const p = readPng(G("starter_choose/tiles.png")).palette;
  save("birch-grass", renderBg({ tiles: G("starter_choose/tiles.png"), map: G("starter_choose/birch_grass.bin"), widthTiles: 32, heightTiles: 32,
    ram: paletteRam(slots(p, 0)), opaque: true, lowNibble: true }));
}

// ---------- The sprites (1D mapping: a sprite's tiles follow each other on the sheet) ----------
function cut(sheetFile, colours, tile, wT, hT) {
  const sheet = readPng(sheetFile), perRow = sheet.width / 8, c = colours || sheet.palette;
  const w = wT * 8, h = hT * 8, rgba = new Uint8ClampedArray(w * h * 4);
  for (let k = 0; k < wT * hT; k++) {
    const t = tile + k, sx = (t % perRow) * 8, sy = Math.floor(t / perRow) * 8, dx = (k % wT) * 8, dy = Math.floor(k / wT) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = sheet.px[(sy + y) * sheet.width + sx + x];
      if (!v) continue;
      const col = c[v] || [0, 0, 0];
      rgba.set([col[0], col[1], col[2], 255], ((dy + y) * w + dx + x) * 4);
    }
  }
  return { width: w, height: h, rgba };
}
// A sheet of frames, one under the other.
function stack(frames) {
  const w = frames[0].width, h = frames.reduce((a, f) => a + f.height, 0), rgba = new Uint8ClampedArray(w * h * 4);
  let y = 0;
  for (const f of frames) { rgba.set(f.rgba, y * w * 4); y += f.height; }
  return { width: w, height: h, rgba };
}
// The clouds (sAnims_Clouds: tiles 0 32x32, 16 16x16, 20 16x8, 22 16x8), by day and at sunset.
for (const [name, p] of [["clouds-day", null], ["clouds-sunset", pal(S2("clouds_sunset.pal"))]]) {
  save(name + "-0", cut(S2("clouds.png"), p, 0, 4, 4));
  save(name + "-1", cut(S2("clouds.png"), p, 16, 2, 2));
  save(name + "-2", cut(S2("clouds.png"), p, 20, 2, 1));
  save(name + "-3", cut(S2("clouds.png"), p, 22, 2, 1));
}
// The small trees (sAnims_Trees: tiles 0 32x32, 16 16x32, 24 16x32), in the sunset palette the credits give them.
{
  const p = pal(S2("trees_sunset.pal"));
  save("trees-0", cut(S2("trees_small.png"), p, 0, 4, 4));
  save("trees-1", cut(S2("trees_small.png"), p, 16, 2, 4));
  save("trees-2", cut(S2("trees_small.png"), p, 24, 2, 4));
}
save("house", cut(S2("house_silhouette.png"), null, 0, 4, 4));
// The riders: seven 64x64 frames (64 tiles each), the bicycle four 64x32 (32 tiles), in the rider's palette.
for (const who of ["brendan", "may"]) {
  const sheet = S2(who + "_credits.png"), p = pal(sheet);
  save(who, stack([0, 1, 2, 3, 4, 5, 6].map((f) => cut(sheet, p, f * 64, 8, 8))));
  save("bicycle-" + who, stack([0, 1, 2, 3].map((f) => cut(S2("bicycle.png"), p, f * 32, 8, 4))));
}

// ---------- THE END (DrawTheEnd: letters of 3x5 tiles from the_end_copyright's tiles 80 on) ----------
{
  const png = readPng(G("credits/the_end_copyright.png")), p = pal(G("intro/copyright.png"));
  const perRow = png.width / 8;
  const LETTERS = {
    T: [0, 1, 0, 0xFF, 1, 0xFF, 0xFF, 1, 0xFF, 0xFF, 1, 0xFF, 0xFF, 1, 0xFF],
    H: [1, 0xFF, 1, 1, 0xFF, 1, 1, 2, 1, 1, 0xFF, 1, 1, 0xFF, 1],
    E: [1, 0, 0, 1, 0xFF, 0xFF, 1, 2, 2, 1, 0xFF, 0xFF, 1, 0x80, 0x80],
    N: [1, 3, 1, 1, 4, 1, 1, 5, 1, 1, 0xC4, 1, 1, 0xC3, 1],
    D: [1, 6, 7, 1, 8, 9, 1, 0xFF, 1, 1, 0x88, 0x89, 1, 0x86, 0x87]
  };
  const rgba = new Uint8ClampedArray(240 * 160 * 4);
  const tileAt = (tile, hf, vf, tx, ty) => {
    const sx = (tile % perRow) * 8, sy = Math.floor(tile / perRow) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = png.px[(sy + (vf ? 7 - y : y)) * png.width + sx + (hf ? 7 - x : x)], c = p[v] || [0, 0, 0];
      rgba.set([c[0], c[1], c[2], 255], ((ty * 8 + y) * 240 + tx * 8 + x) * 4);
    }
  };
  for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) tileAt(1, 0, 0, tx, ty);
  for (const [letter, bx] of [["T", 3], ["H", 7], ["E", 11], ["E", 16], ["N", 20], ["D", 24]]) {
    LETTERS[letter].forEach((v, i) => {
      if (v === 0xFF) return tileAt(1, 0, 0, bx + i % 3, 7 + Math.floor(i / 3));
      tileAt((v & 0x3f) + 80, v & 0x40, v & 0x80, bx + i % 3, 7 + Math.floor(i / 3));
    });
  }
  writePng(path.join(out, "the-end.png"), 240, 160, rgba);
}
console.log("wrote " + out);
