// The pictures FireRed's Berry Crush is drawn with (src/berry_crush.c, and
// src/minigame_countdown.c's "3 2 1 START"), from pret/pokefirered:
//
//   node tools/build-berry-crush.js <path to pokefirered>   (or set POKEFIRERED)
//
// Writes assets/berry-crush/:
//   bg.png             BG3, the room (bg.bin), 240x160
//   container.png      BG2, the crusher's container (container_cap.bin), 240x160
//   lid.png            BG1, the crusher's lid (crusher_top.bin), 256x80; it
//                      drops in from 104 pixels up and is pushed down 32
//   name-frames.png    the five players' name frames (text_windows.bin), 80x16
//                      each, one under the other in seat order
//   crusher-base.png   the crusher's core, 64x64 (crusher_base.png)
//   impact.png         where each player's push lands: 32x32 frames, small
//                      (0-2) and big (3-6) (impact.png)
//   sparkle.png        the powder: 16x16 frames, small (0-5) and big (6-13)
//   timer-digits.png   the timer's 8x16 digits 0-9, then the separator (10)
//   countdown.png      "3", "2", "1" (32x32 each, then) "START" in two 64x32 halves,
//                      one under the other: 3/2/1 at y 0/32/64, START at 96 and 128
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const src = process.argv[2] || process.env.POKEFIRERED;
const G = (f) => path.join(src || "", "graphics/berry_crush", f);
if (!src || !fs.existsSync(G("crusher.png"))) {
  console.error("Usage: node tools/build-berry-crush.js <path to pokefirered>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/berry-crush");
fs.mkdirSync(out, { recursive: true });

const crusher = readPng(G("crusher.png"));
const ram = paletteRam([[0, crusher.palette]]);
function bg(map, w, h, file, opts) {
  const r = renderBg(Object.assign({ tiles: G("crusher.png"), map, widthTiles: w, heightTiles: h, ram, lowNibble: true }, opts || {}));
  writePng(path.join(out, file), r.width, r.height, r.rgba);
  return r;
}
// (The room: its backdrop is BG palette 0's first colour, as the GBA shows it.)
bg(G("bg.bin"), 30, 20, "bg.png", { opaque: true });
bg(fs.readFileSync(G("container_cap.bin")), 30, 20, "container.png", { rowWidth: 32 });
bg(fs.readFileSync(G("crusher_top.bin")), 32, 10, "lid.png", { rowWidth: 32 });
{
  const map = fs.readFileSync(G("text_windows.bin"));
  const frames = [];
  for (let p = 0; p < 5; p++) frames.push(renderBg({ tiles: G("crusher.png"), map: map.subarray(p * 40, p * 40 + 40), widthTiles: 10, heightTiles: 2, ram, lowNibble: true, rowWidth: 10 }));
  const rgba = new Uint8ClampedArray(80 * 80 * 4);
  frames.forEach((f, p) => rgba.set(f.rgba, p * 80 * 16 * 4));
  writePng(path.join(out, "name-frames.png"), 80, 80, rgba);
}

// Sprites, colour 0 clear. `obj`: frames stored as the GBA's 1D tile order
// (8x8 tiles one after another), reassembled `wTiles` x `hTiles` each.
function sprite(file, name) {
  const img = readPng(G(file));
  const rgba = new Uint8ClampedArray(img.width * img.height * 4);
  img.px.forEach((v, i) => { v &= 15; if (v) rgba.set([...img.palette[v], 255], i * 4); });
  writePng(path.join(out, name), img.width, img.height, rgba);
}
sprite("crusher_base.png", "crusher-base.png");
sprite("impact.png", "impact.png");
sprite("sparkle.png", "sparkle.png");
sprite("timer_digits.png", "timer-digits.png");
{
  const img = readPng(path.join(src, "graphics/misc/minigame_countdown.png"));
  const per = img.width / 8;
  const tile = (n, dx, dy, rgba, w) => {
    const sx = (n % per) * 8, sy = Math.floor(n / per) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const v = img.px[(sy + y) * img.width + sx + x] & 15;
      if (v) rgba.set([...img.palette[v], 255], ((dy + y) * w + dx + x) * 4);
    }
  };
  // 3, 2, 1: 32x32 from tiles 0, 16, 32; START: 64x32 halves from 48 and 80.
  const rgba = new Uint8ClampedArray(64 * 160 * 4);
  [0, 16, 32].forEach((t, i) => { for (let k = 0; k < 16; k++) tile(t + k, (k % 4) * 8, i * 32 + Math.floor(k / 4) * 8, rgba, 64); });
  [48, 80].forEach((t, i) => { for (let k = 0; k < 32; k++) tile(t + k, (k % 8) * 8, 96 + i * 32 + Math.floor(k / 8) * 8, rgba, 64); });
  writePng(path.join(out, "countdown.png"), 64, 160, rgba);
}
console.log("wrote assets/berry-crush/");
