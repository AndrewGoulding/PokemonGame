// Emerald's tracks in sand (src/data/field_effects/field_effect_objects.h): sand_footprints.png and
// deep_sand_footprints.png (two 16x16 frames: going north, and going west; south and east are those flipped) and
// bike_tire_tracks.png (four: a turn south-east, east-west, north-south, a turn north-east), 16x16 frames side by side
// (the build's -mwidth 2 -mheight 2), as data/field-effects.js has its pictures: one 16x16 frame under another, colour
// numbers a hex digit a pixel, with their palette (general_0.pal, FLDEFF_PAL_TAG_GENERAL_0).
//   const { emeraldTracks } = require("./lib/emerald-tracks");
//   emeraldTracks(<path to pret/pokeemerald>)   // -> { sandFootprints, deepSandFootprints, bikeTireTracks }
"use strict";

const path = require("path");
const { readPng, readPal } = require("./png");

function emeraldTracks(em) {
  const pal = readPal(path.join(em, "graphics/field_effects/palettes/general_0.pal"));
  const frames = (file, n) => {
    const img = readPng(path.join(em, "graphics/field_effects/pics", file)), out = [];
    for (let f = 0; f < n; f++) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      out.push(img.px[y * img.width + f * 16 + x].toString(16));
    }
    return { width: 16, height: 16, frames: n, px: out.join(""), palette: pal };
  };
  return { sandFootprints: frames("sand_footprints.png", 2), deepSandFootprints: frames("deep_sand_footprints.png", 2), bikeTireTracks: frames("bike_tire_tracks.png", 4) };
}

module.exports = { emeraldTracks };
