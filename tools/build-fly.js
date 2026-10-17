// Builds the pictures for Fly out of battle (FireRed's FLDEFF_FLY_OUT and
// FLDEFF_FLY_IN, with FLDEFF_FIELD_MOVE_SHOW_MON before it; src/field_effect.c):
//
//   assets/world/sprites/fly_bird.png              the bird you ride (graphics/field_effects/pics/bird.png,
//                                                  its first frame, 64x64, without a rider: yours is drawn on it)
//   assets/world/sprites/field_move_streaks.png    the band the Pokémon slides across (the outdoor streaks'
//                                                  tilemap, rows 5-14 of the screen: 256x80)
//   assets/world/sprites/player_<look>_item.png    the field-move pose (FireRed's <prefix>_item.png, 9 frames of 16x32)
//   assets/world/sprites/player_<look>_ride.png    sitting on the Pokémon (the surfing sheet's last three
//                                                  frames, 32x32: down, up, left)
//
//   node tools/build-fly.js <path to pokefirered>   (or set POKEFIRERED)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const pret = process.argv[2] || process.env.POKEFIRERED;
if (!pret || !fs.existsSync(path.join(pret, "graphics/field_effects/pics/bird.png"))) {
  console.error("Usage: node tools/build-fly.js <path to pret/pokefirered>");
  process.exit(1);
}
const P = (...p) => path.join(pret, ...p);
const out = path.join(root, "assets/world/sprites");
// (As tools/build-maps.js: the player's overworld sheets by look.)
const PLAYER_SPRITES = { custom: "player_character" };

// Part of an indexed picture -> RGBA, colour 0 transparent.
function crop(png, x0, y0, w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = png.px[(y0 + y) * png.width + x0 + x];
    if (!c) continue;
    rgba.set([...png.palette[c], 255], (y * w + x) * 4);
  }
  return rgba;
}

// The bird: its first frame (sAnim_Bird_WithoutPlayer).
writePng(path.join(out, "fly_bird.png"), 64, 64, crop(readPng(P("graphics/field_effects/pics/bird.png")), 0, 0, 64, 64));

// The streaks: the tilemap (32 tiles across, 10 rows) over the tiles, in
// their palette (colour 0 clear, as BG0's is).
{
  const tiles = readPng(P("graphics/field_effects/pics/field_move_streaks_outdoors.png"));
  const map = fs.readFileSync(P("graphics/field_effects/pics/field_move_streaks_outdoors.bin"));
  const W = 256, H = 80, rgba = new Uint8ClampedArray(W * H * 4), across = tiles.width / 8;
  for (let ty = 0; ty < 10; ty++) for (let tx = 0; tx < 32; tx++) {
    const e = map.readUInt16LE((ty * 32 + tx) * 2), tile = e & 0x3ff, hflip = e & 0x400, vflip = e & 0x800;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = (tile % across) * 8 + (hflip ? 7 - x : x), sy = Math.floor(tile / across) * 8 + (vflip ? 7 - y : y);
      const c = tiles.px[sy * tiles.width + sx];
      if (c) rgba.set([...tiles.palette[c], 255], ((ty * 8 + y) * W + tx * 8 + x) * 4);
    }
  }
  writePng(path.join(out, "field_move_streaks.png"), W, H, rgba);
}

for (const [look, prefix] of Object.entries(PLAYER_SPRITES)) {
  const sheet = (k) => path.join(root, "assets/sprites/overworld", prefix + k + ".png");
  const item = readPng(sheet("_item"));
  writePng(path.join(out, "player_" + look + "_item.png"), item.width, item.height, crop(item, 0, 0, item.width, item.height));
  const surf = readPng(sheet("_surf"));
  writePng(path.join(out, "player_" + look + "_ride.png"), 96, 32, crop(surf, surf.width - 96, 0, 96, 32));
}
console.log("wrote the bird, the streaks and " + Object.keys(PLAYER_SPRITES).length + " player's pose and ride sheets");
