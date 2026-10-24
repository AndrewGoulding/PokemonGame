// Builds the Trainer Cards' pictures (ui/game.js's trainerCard) from a pret/pokeemerald checkout: Emerald's own
// card for Hoenn, and FireRed's for Kanto (Emerald has it too, for cards from FireRed and LeafGreen over a link:
// graphics/trainer_card/frlg; src/trainer_card.c draws both).
//
//   node tools/build-trainer-cards.js <path to pokeemerald>   (or set POKEEMERALD)
//
// Each card is its background (BG2, bg.bin) under the card itself (BG0, front.bin or back.bin), 30 by 20 tiles of
// tiles.png, in the card's colours for its stars (0 to 4: Hoenn's green, bronze, copper, silver and gold; Kanto's
// blue, green, bronze, silver and gold), palette 1 swapped for female_bg.pal on a girl's card (LoadCardGfx,
// SetCardBgsAndPals). Writes, into assets/trainer-card/:
//   <kanto|hoenn>-<front|back>-<stars>[-f].png   the card, 240x160
//   <kanto|hoenn>-badges.png                     the eight Badges, 16x16 each in a row (badges.png in its palette)
//   <kanto|hoenn>-star.png                       a star (tile 143 in star.pal: DrawStarsAndBadgesOnCard)
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const EM = process.argv[2] || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "graphics/trainer_card/tiles.png"))) {
  console.error("Usage: node tools/build-trainer-cards.js <path to pokeemerald>");
  process.exit(1);
}
const out = path.join(__dirname, "..", "assets/trainer-card");
fs.mkdirSync(out, { recursive: true });

const readPal = (file) => fs.readFileSync(file, "utf8").trim().split(/\r?\n/).slice(3).map((l) => l.trim().split(/\s+/).map(Number));
const CARDS = {
  hoenn: { dir: "graphics/trainer_card", pals: ["green", "bronze", "copper", "silver", "gold"] },
  kanto: { dir: "graphics/trainer_card/frlg", pals: ["blue", "green", "bronze", "silver", "gold"] }
};
for (const [region, card] of Object.entries(CARDS)) {
  const F = (f) => path.join(EM, card.dir, f);
  const tiles = readPng(F("tiles.png")), cols = tiles.width / 8;
  const map = (f) => { const b = fs.readFileSync(F(f)); return Array.from({ length: 600 }, (_, i) => b.readUInt16LE(i * 2)); };
  const bg = map("bg.bin"), sides = { front: map("front.bin"), back: map("back.bin") };
  const female = readPal(F("female_bg.pal"));
  for (let stars = 0; stars < 5; stars++) for (const girl of [false, true]) {
    const pal = readPal(F(card.pals[stars] + ".pal"));   // (48 colours: palettes 0 to 2)
    const pals = [pal.slice(0, 16), girl ? female : pal.slice(16, 32), pal.slice(32, 48)];
    for (const [side, tm] of Object.entries(sides)) {
      const px = new Uint8ClampedArray(240 * 160 * 4);
      // (The backdrop: palette 0's colour 0.)
      for (let i = 0; i < 240 * 160; i++) px.set(pals[0][0].concat(255), i * 4);
      for (const layer of [bg, tm]) layer.forEach((e, i) => {
        const tx = i % 30, ty = Math.floor(i / 30), t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, p = pals[e >> 12] || pals[0];
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const sx = (t % cols) * 8 + (hf ? 7 - x : x), sy = Math.floor(t / cols) * 8 + (vf ? 7 - y : y);
          if (sy >= tiles.height) continue;
          const v = tiles.px[sy * tiles.width + sx] & 15;   // (the PNG's 64 colours: a 4bpp tile takes the low four bits)
          if (!v) continue;
          px.set(p[v].concat(255), ((ty * 8 + y) * 240 + tx * 8 + x) * 4);
        }
      });
      writePng(path.join(out, region + "-" + side + "-" + stars + (girl ? "-f" : "") + ".png"), 240, 160, px);
    }
  }
  // The Badges, in badges.png's own palette (index 0 clear).
  const badges = readPng(F("badges.png")), bpx = new Uint8ClampedArray(badges.width * badges.height * 4);
  badges.px.forEach((v, i) => { if (v) bpx.set(badges.palette[v].slice(0, 3).concat(255), i * 4); });
  writePng(path.join(out, region + "-badges.png"), badges.width, badges.height, bpx);
  // A star: tile 143 in star.pal.
  const star = readPal(path.join(EM, "graphics/trainer_card/star.pal")), spx = new Uint8ClampedArray(8 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = tiles.px[(Math.floor(143 / cols) * 8 + y) * tiles.width + (143 % cols) * 8 + x] & 15;
    if (v) spx.set(star[v].concat(255), (y * 8 + x) * 4);
  }
  writePng(path.join(out, region + "-star.png"), 8, 8, spx);
}
console.log("wrote the Kanto and Hoenn Trainer Cards to assets/trainer-card/");
