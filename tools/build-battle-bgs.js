// Builds FireRed's battle backgrounds (graphics/battle_terrain) from a
// pret/pokefirered checkout into assets/battle/<terrain>.png.
//
//   node tools/build-battle-bgs.js <path to pokefirered>     (or set POKEFIRERED)
//
// Each terrain is a 64x32-tile GBA background (src/battle_bg.c): its palette
// goes to BG palettes 2-4, and the battle scene is the top 14 rows (240x112,
// above the text box) with both platforms drawn in. The left 32 columns are
// the scene; the right 32 are the same ground with no platforms, which shows
// while the two halves slide in at the start of a battle. So each image is
// 512x112, both halves.
"use strict";

const fs = require("fs");
const path = require("path");
const { writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/battle_terrain"))) {
  console.error("usage: node tools/build-battle-bgs.js <path to pokefirered>  (needs graphics/battle_terrain)");
  process.exit(1);
}
const G = (...p) => path.join(pret, "graphics/battle_terrain", ...p);
const out = path.join(root, "assets/battle");
fs.mkdirSync(out, { recursive: true });

// sBattleTerrainTable: [tiles and tilemap folder, palette file]. The building
// tiles are shared by Plain, Link, Gym and Leader; the indoor tiles by the
// Elite Four, the Champion and the two indoor scenes.
const TERRAINS = {
  grass: ["grass", "grass/terrain.pal"],
  longgrass: ["longgrass", "longgrass/terrain.pal"],
  sand: ["sand", "sand/terrain.pal"],
  underwater: ["underwater", "underwater/terrain.pal"],
  water: ["water", "water/terrain.pal"],
  pond: ["pond", "pond/terrain.pal"],
  mountain: ["mountain", "mountain/terrain.pal"],
  cave: ["cave", "cave/terrain.pal"],
  building: ["building", "building/terrain.pal"],
  plain: ["building", "indoor/plain.pal"],
  link: ["building", "indoor/link.pal"],
  gym: ["building", "indoor/gym.pal"],
  leader: ["building", "indoor/leader.pal"],
  indoor1: ["indoor", "indoor/1.pal"],
  indoor2: ["indoor", "indoor/2.pal"],
  lorelei: ["indoor", "indoor/lorelei.pal"],
  bruno: ["indoor", "indoor/bruno.pal"],
  agatha: ["indoor", "indoor/agatha.pal"],
  lance: ["indoor", "indoor/lance.pal"],
  champion: ["indoor", "indoor/champion.pal"]
};

for (const [id, [folder, palFile]] of Object.entries(TERRAINS)) {
  const ram = paletteRam([[2, readPal(G(palFile))]]);
  const img = renderBg({
    tiles: G(folder, "terrain.png"), map: G(folder, "terrain.bin"),
    widthTiles: 64, heightTiles: 14, ram, opaque: true
  });
  writePng(path.join(out, id + ".png"), img.width, img.height, img.rgba);
}
console.log("Wrote " + Object.keys(TERRAINS).length + " battle backgrounds to assets/battle/");
