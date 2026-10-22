// Builds the pictures for the scene over Sootopolis (ui/rayquaza-scene.js) from pret/pokeemerald's
// graphics/rayquaza_scene/ (src/rayquaza_scene.c's five scenes):
//
//   node tools/build-rayquaza-scene.js <path to pret/pokeemerald>   (or set POKEEMERALD)
//
// Backgrounds are drawn whole from their tile sheets, tilemaps and palettes (text backgrounds 256x256 with colour 0
// clear; the affine ones, Rayquaza over the shoulder and the ring of its roar, from their 8-bit tiles); sprites are cut
// into sheets, one frame under another, each frame its tiles in order (1D mapping). Writes assets/rayquaza-scene/.
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const pret = process.argv[2] || process.env.POKEEMERALD;
if (!pret || !fs.existsSync(path.join(pret, "graphics/rayquaza_scene"))) {
  console.error("Usage: node tools/build-rayquaza-scene.js <path to pret/pokeemerald>  (needs graphics/rayquaza_scene/)");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const out = path.join(root, "assets/rayquaza-scene");
fs.mkdirSync(out, { recursive: true });
const G = (s, f) => path.join(pret, "graphics/rayquaza_scene/scene_" + s, f);
const save = (name, img) => writePng(path.join(out, name + ".png"), img.width, img.height, img.rgba);
const slots = (colours, from) => { const r = []; for (let i = 0; i * 16 < colours.length; i++) r.push([from + i, colours.slice(i * 16, i * 16 + 16)]); return r; };
const pal = (f) => (f.endsWith(".pal") ? readPal(f) : readPng(f).palette);

// A text background (u16 entries) from a sheet whose pixels may carry full palette indices (the low nibble is the colour).
const bg = (name, tiles, map, colours) => save(name, renderBg({ tiles, map, widthTiles: 32, heightTiles: 32, ram: paletteRam(slots(colours, 0)), lowNibble: true }));
// An affine background (u8 entries, 8-bit tiles): `wT` x `hT` tiles.
function affine(name, tiles, map, colours, wT, hT) {
  const png = readPng(tiles), m = fs.readFileSync(map), perRow = png.width / 8, w = wT * 8, h = hT * 8, rgba = new Uint8ClampedArray(w * h * 4);
  for (let ty = 0; ty < hT; ty++) for (let tx = 0; tx < wT; tx++) {
    const t = m[ty * wT + tx], sx = (t % perRow) * 8, sy = Math.floor(t / perRow) * 8;
    if (sy >= png.height) continue;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = png.px[(sy + y) * png.width + sx + x];
      if (!v) continue;
      const c = colours[v] || [0, 0, 0];
      rgba.set([c[0], c[1], c[2], 255], ((ty * 8 + y) * w + tx * 8 + x) * 4);
    }
  }
  save(name, { width: w, height: h, rgba });
}
// A sprite's frame: its tiles from `tile` on, wT x hT of them (1D mapping), in a palette.
function cut(sheetFile, colours, tile, wT, hT) {
  const sheet = readPng(sheetFile), perRow = sheet.width / 8, c = colours || sheet.palette;
  const w = wT * 8, h = hT * 8, rgba = new Uint8ClampedArray(w * h * 4);
  for (let k = 0; k < wT * hT; k++) {
    const t = tile + k, sx = (t % perRow) * 8, sy = Math.floor(t / perRow) * 8, dx = (k % wT) * 8, dy = Math.floor(k / wT) * 8;
    if (sy >= sheet.height) continue;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = sheet.px[(sy + y) * sheet.width + sx + x] & 15;
      if (!v) continue;
      const col = c[v] || [0, 0, 0];
      rgba.set([col[0], col[1], col[2], 255], ((dy + y) * w + dx + x) * 4);
    }
  }
  return { width: w, height: h, rgba };
}
const stack = (frames) => {
  const w = frames[0].width, h = frames.reduce((a, f) => a + f.height, 0), rgba = new Uint8ClampedArray(w * h * 4);
  let y = 0;
  for (const f of frames) { rgba.set(f.rgba, y * w * 4); y += f.height; }
  return { width: w, height: h, rgba };
};
const sheet = (name, file, colours, tiles, wT, hT) => save(name, stack(tiles.map((t) => cut(file, colours, t, wT, hT))));

// ---------- Scene 1: Groudon and Kyogre under the storm (and the shorter telling before Rayquaza's awakening) ----------
{
  const clouds = pal(G(1, "clouds.png"));   // (two palettes: the clouds, and the rain)
  bg("1-clouds-far", G(1, "clouds.png"), G(1, "clouds2.bin"), clouds);    // BG0
  bg("1-clouds-near", G(1, "clouds.png"), G(1, "clouds1.bin"), clouds);   // BG1
  bg("1-rain", G(1, "clouds.png"), G(1, "clouds3.bin"), clouds);          // BG2
  const gp = pal(G(1, "groudon.png")), kp = pal(G(1, "kyogre.png"));
  sheet("1-groudon", G(1, "groudon.png"), gp, [0, 64, 128, 192, 256, 320], 8, 8);   // (head 0-2, body 3-5)
  sheet("1-groudon-shoulder", G(1, "groudon_shoulder.png"), gp, [0], 4, 4);
  sheet("1-groudon-claw", G(1, "groudon_claw.png"), gp, [0], 8, 4);
  sheet("1-kyogre", G(1, "kyogre.png"), kp, Array.from({ length: 15 }, (_, i) => i * 8), 4, 2);   // (32x16 pieces, tile 8n)
  sheet("1-kyogre-pectoral-fin", G(1, "kyogre_pectoral_fin.png"), kp, [0, 2, 4], 2, 1);
  sheet("1-kyogre-dorsal-fin", G(1, "kyogre_dorsal_fin.png"), kp, [0], 4, 4);
  fs.writeFileSync(path.join(out, "backdrops.json"), JSON.stringify({ 1: clouds[0], 2: pal(G(2, "rayquaza.png"))[0], 3: [255, 255, 255], 4: pal(G(4, "bg.pal"))[0], 5: pal(G(5, "bg.pal"))[0] }));
}
// ---------- Scene 2: over Rayquaza's shoulder as it takes flight ----------
{
  const rp = pal(G(2, "rayquaza.png"));
  bg("2-bg", G(2, "bg.png"), G(2, "bg.bin"), rp);
  affine("2-rayquaza", G(2, "rayquaza.png"), G(2, "rayquaza.bin"), rp, 32, 32);
  sheet("2-smoke", G(2, "smoke.png"), null, [0], 4, 2);
}
// ---------- Scene 3: Rayquaza descends through the clouds in a ray of light ----------
{
  const bp = pal(G(3, "bg.pal")), rp = pal(G(2, "rayquaza.png"));
  bg("3-bg", G(3, "bg.png"), G(3, "bg.bin"), bp);
  bg("3-light", G(3, "light.png"), G(3, "light.bin"), bp);
  sheet("3-rayquaza", G(3, "rayquaza.png"), rp, [0, 64], 8, 8);
  sheet("3-rayquaza-tail", G(3, "rayquaza_tail.png"), rp, [0, 8], 2, 4);
}
// ---------- Scene 4: Rayquaza charges ----------
{
  const bp = pal(G(4, "bg.pal"));
  bg("4-bg", G(4, "bg.png"), G(4, "bg.bin"), bp);
  bg("4-streaks", G(4, "streaks.png"), G(4, "streaks.bin"), bp);
  bg("4-orbs", G(4, "streaks.png"), G(4, "orbs.bin"), bp);
  bg("4-rayquaza", G(4, "rayquaza.png"), G(4, "rayquaza.bin"), bp);
}
// ---------- Scene 5: Rayquaza drives the pair apart ----------
{
  const bp = pal(G(5, "bg.pal"));
  bg("5-bg", G(5, "light.png"), G(5, "bg.bin"), bp);
  bg("5-light", G(5, "light.png"), G(5, "light.bin"), bp);
  affine("5-ring", G(5, "ring.png"), G(5, "ring.bin"), bp, 16, 16);
  const gp = pal(G(5, "groudon.png")), kp = pal(G(5, "kyogre.png")), rp = pal(G(5, "rayquaza.png")), sp = pal(G(5, "kyogre_splash.png"));
  sheet("5-groudon", G(5, "groudon.png"), gp, [0, 64, 128], 8, 8);
  sheet("5-groudon-tail", G(5, "groudon_tail.png"), gp, [0], 2, 2);
  sheet("5-kyogre", G(5, "kyogre.png"), kp, [0, 16, 32], 4, 4);
  sheet("5-rayquaza", G(5, "rayquaza.png"), rp, [0, 64, 128, 192], 8, 8);
  sheet("5-rayquaza-tail", G(5, "rayquaza_tail.png"), rp, [0, 16, 32, 48], 4, 4);
  sheet("5-kyogre-splash", G(5, "kyogre_splash.png"), sp, [0, 4, 8, 12, 16, 20], 4, 1);
}
console.log("wrote " + out);
