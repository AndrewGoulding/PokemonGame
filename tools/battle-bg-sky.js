// This game's own: FireRed's battle backgrounds on this game's 240x192 screen, where the foe's half sits 16 lines
// higher (FOE_UP) and the screen's top 32 lines (.field-sky) are over the scene. FireRed's band of stripes along the
// top of each background (its rows above the ground) stays where FireRed has it on the screen, at its top, and the
// ground's stripes carry on under it down to the platforms, so the scene looks as FireRed's does, only taller:
//   - assets/battle/sky/<terrain>.png (512x32): the background's top 32 rows, for the screen's top 32 lines;
//   - assets/battle/<terrain>.png: its rows from 16 down moved up 16 (the foe's half shows its top 16 rows at the
//     screen's lines 16 to 31, under the sky's first 16), and the 16 rows that leaves above the ground filled with
//     the ground's own pattern. The rows from the ground's start down are as they were (the platforms, your half).
// Space is a starfield all the way down: its sky is its top rows and the rest is left as it is. Running it again
// changes nothing (the sky's lower 16 rows are then the background's top 16).
//
//   node tools/battle-bg-sky.js        (assets/battle/*.png, in place; tools/build-battle-bgs.js runs it too)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const SKY = 32, UP = 16;
const LEAVE = ["space"];

// The colour of a pixel (x, y) as a number.
const at = (img, x, y) => { const i = (y * img.width + x) * 4; return (img.rgba[i] << 16) | (img.rgba[i + 1] << 8) | img.rgba[i + 2]; };
const rows = (img, y0, n) => img.rgba.slice(y0 * img.width * 4, (y0 + n) * img.width * 4);

// -> the sky (RGBA, width x SKY) and the background changed in place, or null if it's done already.
function split(id, img, sky) {
  const W = img.width, H = img.height, x = W - 1;   // (the right half has no platforms)
  const same = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
  if (sky && (LEAVE.includes(id) ? same(rows(sky, 0, SKY), rows(img, 0, SKY)) : same(rows(sky, UP, SKY - UP), rows(img, 0, SKY - UP)))) return null;
  const out = new Uint8ClampedArray(rows(img, 0, SKY));
  if (LEAVE.includes(id)) return out;
  // Its ground: a colour, and every fourth line a lighter one (both from its bottom four lines); it starts where,
  // going up from the bottom, a line first breaks that pattern.
  const main = at(img, x, H - 1);
  let light = main, phase = -1;
  for (let y = H - 4; y < H; y++) if (at(img, x, y) !== main) { light = at(img, x, y); phase = y & 3; }
  const fits = (y) => at(img, x, y) === (phase >= 0 && (y & 3) === phase ? light : main);
  let top = H;
  while (top > 0 && fits(top - 1)) top--;
  // (Rows top..top+3 are the ground's own, one of each line of its pattern, to copy from.)
  const ground = rows(img, top, 4);
  const moved = rows(img, UP, Math.max(0, top - UP));
  img.rgba.set(moved, 0);
  for (let y = Math.max(0, top - UP); y < top; y++) {
    const k = ((y - top) % 4 + 4) % 4;
    img.rgba.set(ground.subarray(k * W * 4, (k + 1) * W * 4), y * W * 4);
  }
  return out;
}

function run(dir) {
  dir = dir || path.join(__dirname, "../assets/battle");
  fs.mkdirSync(path.join(dir, "sky"), { recursive: true });
  const done = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort()) {
    const id = f.replace(/\.png$/, ""), file = path.join(dir, f), skyFile = path.join(dir, "sky", f);
    const img = readPng(file), sky = fs.existsSync(skyFile) ? readPng(skyFile) : null;
    const top = split(id, img, sky);
    if (!top) continue;
    writePng(skyFile, img.width, SKY, top);
    if (!LEAVE.includes(id)) writePng(file, img.width, img.height, img.rgba);
    done.push(id);
  }
  return done;
}

module.exports = { split, run };
if (require.main === module) {
  const done = run(process.argv[2]);
  console.log(done.length ? "Skies split off: " + done.join(", ") : "Nothing to do.");
}
