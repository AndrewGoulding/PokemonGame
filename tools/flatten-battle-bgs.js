// This game's own: the battle backgrounds without FireRed's band of stripes along their top (on this game's
// 240x192 screen the foe's half sits 16 lines higher and the screen's top 32 lines carry the background on, so
// those stripes ran down a third of the scene). Each background's rows above its ground (the colour its ground is
// made of, from the line where that colour starts) become one colour: white for the light ones, and for the cave,
// the long grass and under the water their own band's colour (white would look wrong there). Space is a starfield
// all the way down and stays as it is. Running it again changes nothing.
//
//   node tools/flatten-battle-bgs.js        (assets/battle/*.png, in place; tools/build-battle-bgs.js runs it too)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

// (Their own band's colour, not white: the cave's, the long grass's, under the water's. Space: left as it is.)
const OWN_COLOUR = ["cave", "longgrass", "underwater"];
const LEAVE = ["space"];

// The colour of a pixel (x, y) as a number.
const at = (img, x, y) => { const i = (y * img.width + x) * 4; return (img.rgba[i] << 16) | (img.rgba[i + 1] << 8) | img.rgba[i + 2]; };

// Flattens an image (RGBA, width x height) in place; -> the number of rows flattened.
function flatten(id, img) {
  if (LEAVE.includes(id)) return 0;
  const W = img.width, x = img.width - 1;   // (the right half has no platforms)
  // Its ground: a colour, and every fourth line a lighter one (both from its bottom four lines); it starts where,
  // going up from the bottom, a line first breaks that pattern.
  const H = img.height, main = at(img, x, H - 1);
  let light = main, phase = -1;
  for (let y = H - 4; y < H; y++) if (at(img, x, y) !== main) { light = at(img, x, y); phase = y & 3; }
  const fits = (y) => at(img, x, y) === (phase >= 0 && (y & 3) === phase ? light : main);
  let top = H;
  while (top > 0 && fits(top - 1)) top--;
  if (top <= 0 || top >= img.height) return 0;
  // Already flat (run before): nothing to do.
  const first = at(img, x, 0);
  let flat = true;
  for (let y = 0; y < top && flat; y++) for (let xx = 0; xx < W && flat; xx++) flat = at(img, xx, y) === first;
  if (flat) return 0;
  // The colour: white, or its band's (the commonest colour in its rows 12 to top).
  let colour = 0xffffff;
  if (OWN_COLOUR.includes(id)) {
    const band = new Map();
    for (let y = 12; y < top; y++) { const c = at(img, x, y); band.set(c, (band.get(c) || 0) + 1); }
    colour = [...band].sort((a, b) => b[1] - a[1])[0][0];
  }
  for (let y = 0; y < top; y++) for (let xx = 0; xx < W; xx++) {
    const i = (y * W + xx) * 4;
    img.rgba[i] = colour >> 16; img.rgba[i + 1] = (colour >> 8) & 255; img.rgba[i + 2] = colour & 255; img.rgba[i + 3] = 255;
  }
  return top;
}

function run(dir) {
  dir = dir || path.join(__dirname, "../assets/battle");
  const done = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort()) {
    const id = f.replace(/\.png$/, ""), file = path.join(dir, f), img = readPng(file);
    const rows = flatten(id, img);
    if (rows) { writePng(file, img.width, img.height, img.rgba); done.push(id + " (" + rows + " rows)"); }
  }
  return done;
}

module.exports = { flatten, run };
if (require.main === module) {
  const done = run(process.argv[2]);
  console.log(done.length ? "Flattened the tops of: " + done.join(", ") : "Nothing to flatten.");
}
