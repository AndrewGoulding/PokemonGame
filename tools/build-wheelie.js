// Builds the Bicycle's wheelie frames, for its Acro Bike-style hopping (ui/overworld.js):
//
//   assets/world/sprites/player_<look>_wheelie.png    32x32 frames: facing down rising, up on the
//                                                    back wheel; facing up rising, up; facing left
//                                                    rising, up (right is left mirrored)
//
// FireRed's Bicycle sheets have no wheelie, so these are drawn from each
// look's own standing bike frames (player_<look>_bike.png, frames 0-2), the way
// Emerald's Acro Bike frames differ from its standing ones (graphics/
// object_events/pics/people/brendan/acro_bike.png, frames 9-10, 13-14 and 17-18):
//   down:  the rider rises (the bike tips back toward you), its front wheel
//          showing shorter under them;
//   up:    the rider rises over the back wheel, which stays on the ground;
//   left:  the bike tips back on its back wheel, the front wheel up in the air.
//
//   node tools/build-wheelie.js
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const dir = path.join(__dirname, "..", "assets/world/sprites");
const F = 32;

// An RGBA frame as a function of (x, y) -> [r, g, b, a] (clear outside).
function frameOf(png, n) {
  return (x, y) => (x < 0 || y < 0 || x >= F || y >= F ? [0, 0, 0, 0] : [...png.rgba.slice(((y * png.width) + n * F + x) * 4, ((y * png.width) + n * F + x) * 4 + 4)]);
}
function bounds(get) {
  let x0 = F, y0 = F, x1 = -1, y1 = -1;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (get(x, y)[3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}
// A new frame where each pixel comes from `from(x, y)` -> [sx, sy] of the source (or null).
const remap = (get, from) => (x, y) => { const s = from(x, y); return s ? get(s[0], s[1]) : [0, 0, 0, 0]; };

// Facing down: everything above the front wheel up `lift`, the wheel up `lift - 1`
// (so it shows a row shorter), the rows in between filled from the wheel's top.
function down(get, lift) {
  const b = bounds(get), wheelTop = b.y1 - 5;
  return remap(get, (x, y) => {
    if (y + lift < wheelTop) return [x, y + lift];
    const wy = y + lift - 1;
    return [x, Math.max(wheelTop, wy)];
  });
}
// Facing up: the rider up `lift` over the back wheel, which stays where it is.
function up(get, lift) {
  const b = bounds(get), wheelTop = b.y1 - 5;
  return remap(get, (x, y) => (y >= wheelTop ? [x, y] : y + lift < wheelTop ? [x, y + lift] : [x, wheelTop]));
}
// Facing left: tipped back on the back wheel (at the right): the bike's
// columns up in proportion to how far they are in front of the back wheel,
// `lift` at the front; the rider above it (head and shoulders) up as one, as
// much as the middle of the bike.
function left(get, lift) {
  const b = bounds(get), pivot = b.x1 - 4, span = pivot - b.x0, waist = b.y1 - 9;
  const tilt = (x) => (x < pivot ? Math.round(lift * (pivot - x) / span) : 0);
  const mid = tilt(Math.round((b.x0 + b.x1) / 2));
  return remap(get, (x, y) => {
    const below = y + tilt(x);
    return below >= waist ? [x, below] : [x, Math.min(waist - 1, y + mid)];
  });
}

let n = 0;
for (const file of fs.readdirSync(dir).filter((f) => /^player_\w+_bike\.png$/.test(f))) {
  const png = readPng(path.join(dir, file));
  const frames = [down(frameOf(png, 0), 2), down(frameOf(png, 0), 4), up(frameOf(png, 1), 1), up(frameOf(png, 1), 2),
    left(frameOf(png, 2), 2), left(frameOf(png, 2), 5)];
  const rgba = new Uint8ClampedArray(frames.length * F * F * 4);
  frames.forEach((get, i) => {
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) rgba.set(get(x, y), (y * frames.length * F + i * F + x) * 4);
  });
  writePng(path.join(dir, file.replace(/_bike\.png$/, "_wheelie.png")), frames.length * F, F, rgba);
  n++;
}
console.log("wrote " + n + " wheelie sheets");
