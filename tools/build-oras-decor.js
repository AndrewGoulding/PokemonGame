// The Secret Base decorations Omega Ruby and Alpha Sapphire added to Ruby, Sapphire and Emerald's, redrawn as
// 16px tiles for this game's 2D bases. Run: node tools/build-oras-decor.js   (no source checkout needed)
//
// Writes data/oras-decor.js (the catalogue entries, added after Emerald's 120; where each is sold; and the four
// Emerald dolls no shop or script gave), assets/world/maps/_decor_oras-mt.png (their tiles, 16 to a row) and the
// two new dolls' sprites. The list is ORAS's own; the pictures, sizes and descriptions are this game's.
// See docs/decorations.md.
"use strict";
const fs = require("fs"), path = require("path");
const { canvas } = require("./lib/orre-art");
const root = path.join(__dirname, "..");
const SHAPES = { "1x1": [1, 1], "2x1": [2, 1], "3x1": [3, 1], "2x2": [2, 2], "1x2": [1, 2], "3x3": [3, 3], "3x2": [3, 2] };
const DESK = 0, PLANT = 2, ORNAMENT = 3, MAT = 4, POSTER = 5, DOLL = 6;
const O = [40, 40, 56], W = [248, 248, 248], SH = [0, 0, 0, 60];

// ---- small drawing helpers (x, y: the picture's top-left pixel) ----
const P = {
  shadow: (c, x, y, w) => c.ellipse(x + w / 2, y, w / 2 - 1, 2.5, SH),
  // A box with a dark outline, a lit top edge and a shaded right/bottom edge.
  block: (c, x, y, w, h, [lo, mid, hi]) => { c.rect(x, y, w, h, O); c.rect(x + 1, y + 1, w - 2, h - 2, mid); c.rect(x + 1, y + 1, w - 2, 1, hi); c.rect(x + 1, y + 1, 1, h - 2, hi); c.rect(x + w - 2, y + 2, 1, h - 3, lo); c.rect(x + 2, y + h - 2, w - 3, 1, lo); },
  ball: (c, cx, cy, r, [lo, mid, hi]) => { c.ellipse(cx, cy, r, r, O); c.ellipse(cx, cy, r - 1, r - 1, mid); c.ellipse(cx + 1, cy + 1, r - 2, r - 2, lo); c.ellipse(cx - 0.5, cy - 0.5, r - 2, r - 2, mid); c.rect(cx - r / 2, cy - r / 2, 2, 2, hi); },
  post: (c, x, y, h, col) => { c.rect(x - 1, y, 4, h, O); c.rect(x, y, 2, h, col); },
  // A mat: a bordered square of colour that fills its tiles.
  mat: (c, x, y, w, h, [lo, mid, hi]) => { c.rect(x + 1, y + 1, w - 2, h - 2, O); c.rect(x + 2, y + 2, w - 4, h - 4, hi); c.rect(x + 3, y + 3, w - 6, h - 6, mid); for (let i = x + 4; i < x + w - 4; i += 4) for (let j = y + 4; j < y + h - 4; j += 4) c.p(i, j, lo); },
  frame: (c, x, y, w, h, wood, inner) => { c.rect(x, y, w, h, O); c.rect(x + 1, y + 1, w - 2, h - 2, wood); c.rect(x + 3, y + 3, w - 6, h - 6, O); c.rect(x + 4, y + 4, w - 8, h - 8, inner); },
};
const C = {
  wood: [[104, 72, 40], [160, 112, 64], [208, 160, 104]], steel: [[104, 112, 136], [160, 168, 192], [224, 228, 240]], gold: [[168, 120, 24], [232, 184, 48], [255, 240, 144]],
  red: [[152, 40, 40], [216, 72, 64], [248, 152, 136]], blue: [[40, 72, 160], [72, 120, 224], [160, 200, 255]], green: [[40, 112, 56], [80, 176, 88], [168, 232, 152]],
  stone: [[120, 120, 128], [176, 176, 184], [224, 224, 232]], ice: [[104, 168, 216], [168, 220, 248], [240, 252, 255]], cream: [[176, 152, 112], [232, 216, 176], [255, 248, 224]],
  pink: [[192, 88, 136], [240, 144, 184], [255, 208, 224]], purple: [[96, 64, 152], [144, 104, 208], [208, 184, 248]], dark: [[32, 32, 48], [64, 64, 88], [112, 112, 144]],
};
const panel = (col, glyph) => (c, x, y) => { P.mat(c, x, y, 16, 16, col); glyph(c, x, y); };
const arrow = (c, x, y) => { c.poly([[x + 8, y + 4], [x + 12, y + 9], [x + 4, y + 9]], W); c.rect(x + 7, y + 9, 3, 3, W); };
const swirl = (c, x, y) => { c.ellipse(x + 8, y + 8, 4, 4, W, 1); c.ellipse(x + 8, y + 8, 2, 2, W, 1); };
const monMat = (base, face) => (c, x, y) => { P.mat(c, x, y, 48, 48, base); face(c, x + 24, y + 24); };
const painting = (sky, draw) => (c, x, y) => { P.frame(c, x + 1, y + 1, 30, 14, C.gold[1], sky); draw(c, x + 5, y + 5); };
const diploma = (ribbon) => (c, x, y) => { P.frame(c, x + 2, y + 1, 12, 14, C.wood[1], C.cream[2]); for (const j of [6, 8, 10]) c.rect(x + 7, y + j, 4, 1, C.stone[0]); c.ellipse(x + 8.5, y + 11, 1.5, 1.5, ribbon); };

// ---- the decorations ----
// (The names are ORAS's English ones; the keys are older, from when the list was translated from German, and stay
// as they are: saves hold decorations by key.)
// [key, name, category, permission, shape, price, description lines, draw(c, x, y)]
const LIST = [
  // Gadgets
  ["OLD_LAMP", "Worn-Out Light", ORNAMENT, "behind", "1x2", 3000, ["An old-fashioned lamp", "that gives a base a", "warm, cosy glow."], (c, x, y) => { P.shadow(c, x, y + 29, 12); P.post(c, x + 7, y + 12, 16, C.wood[1]); P.block(c, x + 4, y + 26, 8, 4, C.wood); c.poly([[x + 3, y + 12], [x + 6, y + 3], [x + 10, y + 3], [x + 13, y + 12]], O); c.poly([[x + 4, y + 11], [x + 7, y + 4], [x + 9, y + 4], [x + 12, y + 11]], C.gold[2]); c.rect(x + 5, y + 9, 6, 2, C.gold[1]); }],
  ["MOOD_LIGHTING", "Mood Lighting", ORNAMENT, "behind", "1x2", 6000, ["A lamp whose light", "drifts through every", "colour in turn."], (c, x, y) => { P.shadow(c, x, y + 29, 12); P.post(c, x + 7, y + 10, 18, C.steel[1]); P.block(c, x + 4, y + 26, 8, 4, C.steel); P.ball(c, x + 8, y + 7, 6, C.purple); c.rect(x + 5, y + 5, 2, 2, C.pink[2]); c.rect(x + 9, y + 8, 2, 2, C.blue[2]); c.rect(x + 7, y + 10, 2, 1, C.green[2]); }],
  ["VENDING_MACHINE", "Vending Machine", ORNAMENT, "behind", "1x2", 6000, ["A drinks machine.", "The cans inside are", "only for show."], (c, x, y) => { P.shadow(c, x, y + 30, 16); P.block(c, x + 1, y + 2, 14, 28, C.red); c.rect(x + 3, y + 5, 10, 12, O); c.rect(x + 4, y + 6, 8, 10, C.blue[2]); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.rect(x + 5 + i * 3, y + 7 + j * 5, 2, 3, [C.green[1], C.gold[1], C.red[1]][(i + j) % 3]); c.rect(x + 4, y + 21, 8, 4, O); c.rect(x + 5, y + 22, 6, 2, C.dark[1]); c.rect(x + 12, y + 19, 2, 2, C.gold[2]); }],
  ["JUKEBOX", "Jukebox", ORNAMENT, "behind", "1x2", 8000, ["A jukebox with a", "rounded top and", "glowing tubes."], (c, x, y) => { P.shadow(c, x, y + 30, 16); c.ellipse(x + 8, y + 9, 7, 7, O); c.ellipse(x + 8, y + 9, 6, 6, C.gold[1]); P.block(c, x + 1, y + 9, 14, 21, C.wood); c.ellipse(x + 8, y + 10, 4, 4, O); c.ellipse(x + 8, y + 10, 3, 3, C.blue[2]); c.rect(x + 3, y + 17, 10, 6, O); for (let i = 0; i < 4; i++) c.rect(x + 4 + i * 2, y + 18, 1, 4, i % 2 ? C.pink[1] : C.gold[2]); c.rect(x + 4, y + 25, 8, 2, C.dark[1]); }],
  ["LEVEL_RELEASE", "Level Release", ORNAMENT, "solid", "1x1", 5000, ["A device from the", "Battle Resort that", "hums with power."], (c, x, y) => { P.shadow(c, x, y + 14, 14); P.block(c, x + 2, y + 6, 12, 9, C.steel); P.ball(c, x + 8, y + 5, 4, C.green); c.rect(x + 4, y + 11, 2, 2, C.red[1]); c.rect(x + 10, y + 11, 2, 2, C.gold[2]); }],
  // Tricks
  ["TALL_GRASS", "Tall Grass", ORNAMENT, "pass", "1x1", 1000, ["A patch of tall grass", "to rustle through.", "Nothing lives in it."], (c, x, y) => { c.rect(x + 1, y + 11, 14, 4, C.green[0]); for (let i = 0; i < 5; i++) { const bx = x + 2 + i * 3; c.poly([[bx - 1, y + 14], [bx + 1, y + 3 + (i % 2) * 3], [bx + 3, y + 14]], O); c.poly([[bx, y + 14], [bx + 1, y + 5 + (i % 2) * 3], [bx + 2, y + 14]], i % 2 ? C.green[1] : C.green[2]); } }],
  ["PITFALL_MAT", "Pitfall Mat", MAT, "pass", "1x1", 2000, ["A trick mat painted", "to look like a hole", "in the floor."], (c, x, y) => { P.mat(c, x, y, 16, 16, C.wood); c.ellipse(x + 8, y + 8, 5, 4, O); c.ellipse(x + 8, y + 9, 4, 3, C.dark[0]); }],
  ["RETURN_MAT", "Square-One Mat", MAT, "pass", "1x1", 2000, ["A trick mat marked", "with an arrow that", "points back home."], panel(C.purple, (c, x, y) => { c.poly([[x + 4, y + 8], [x + 9, y + 4], [x + 9, y + 12]], W); c.rect(x + 9, y + 7, 3, 3, W); })],
  ["TOY_PC", "Toy PC", ORNAMENT, "solid", "1x1", 5000, ["A toy computer.", "The screen lights up", "but it stores nothing."], (c, x, y) => { P.shadow(c, x, y + 14, 14); P.block(c, x + 2, y + 2, 12, 9, C.cream); c.rect(x + 4, y + 4, 8, 5, O); c.rect(x + 5, y + 5, 6, 3, C.blue[2]); P.block(c, x + 1, y + 11, 14, 4, C.cream); c.rect(x + 3, y + 12, 8, 1, C.stone[0]); c.rect(x + 12, y + 12, 1, 1, C.red[1]); }],
  ["BLUE_PUSH_PANEL", "Blue Spin Panel", MAT, "pass", "1x1", 2500, ["A blue floor panel", "marked with a bold", "arrow."], panel(C.blue, arrow)],
  ["GREEN_PUSH_PANEL", "Yellow Spin Panel", MAT, "pass", "1x1", 3000, ["A yellow floor panel", "marked with a bold", "arrow."], panel(C.gold, arrow)],
  ["RED_PUSH_PANEL", "Red Spin Panel", MAT, "pass", "1x1", 2000, ["A red floor panel", "marked with a bold", "arrow."], panel(C.red, arrow)],
  ["BLUE_WARP_PANEL", "Blue Warp Panel", MAT, "pass", "1x1", 2500, ["A blue floor panel", "with a swirling", "pattern."], panel(C.blue, swirl)],
  ["GREEN_WARP_PANEL", "Yellow Warp Panel", MAT, "pass", "1x1", 2500, ["A yellow floor panel", "with a swirling", "pattern."], panel(C.gold, swirl)],
  ["RED_WARP_PANEL", "Red Warp Panel", MAT, "pass", "1x1", 2500, ["A red floor panel", "with a swirling", "pattern."], panel(C.red, swirl)],
  // Furniture
  ["ICY_DESK", "Icy Desk", DESK, "solid", "3x2", 5000, ["A huge desk carved", "from clear ice. Holds", "lots of dolls."], (c, x, y) => { P.shadow(c, x, y + 30, 48); P.block(c, x + 1, y + 4, 46, 18, C.ice); for (const lx of [3, 39]) P.block(c, x + lx, y + 21, 6, 9, C.ice); for (let i = 0; i < 5; i++) c.line(x + 6 + i * 8, y + 7, x + 10 + i * 8, y + 17, C.ice[2]); c.rect(x + 4, y + 7, 40, 1, C.ice[2]); }],
  ["BERRY_TREE", "Berry Tree", PLANT, "behind", "1x2", 2000, ["A potted Berry tree", "with a few bright", "Berries on it."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.block(c, x + 4, y + 23, 8, 7, C.wood); P.post(c, x + 7, y + 13, 11, C.wood[0]); c.ellipse(x + 8, y + 9, 7, 8, O); c.ellipse(x + 8, y + 9, 6, 7, C.green[1]); c.ellipse(x + 6, y + 7, 3, 3, C.green[2]); for (const [bx, by] of [[5, 11], [10, 8], [8, 13]]) { c.rect(x + bx, y + by, 3, 3, O); c.rect(x + bx, y + by, 2, 2, C.pink[1]); } }],
  ["COMFY_BED", "Comfortable Bed", ORNAMENT, "solid", "2x2", 6000, ["A soft bed with a", "thick quilt. Just for", "looking at."], (c, x, y) => { P.shadow(c, x, y + 30, 32); P.block(c, x + 2, y + 2, 28, 28, C.wood); P.block(c, x + 4, y + 4, 24, 8, C.cream); P.block(c, x + 4, y + 12, 24, 16, C.blue); for (let i = 0; i < 3; i++) c.rect(x + 6, y + 16 + i * 4, 20, 1, C.blue[2]); c.rect(x + 9, y + 6, 14, 4, W); }],
  ["TRASH_CAN", "Trash Can", ORNAMENT, "solid", "1x1", 500, ["A plain metal bin.", "Somebody has to keep", "the base tidy."], (c, x, y) => { P.shadow(c, x, y + 14, 12); P.block(c, x + 4, y + 4, 8, 11, C.steel); c.rect(x + 3, y + 3, 10, 2, O); c.rect(x + 4, y + 3, 8, 1, C.steel[2]); for (const i of [6, 9]) c.rect(x + i, y + 7, 1, 6, C.steel[0]); }],
  ["CARDBOARD_BOXES", "Cardboard Boxes", ORNAMENT, "solid", "1x1", 200, ["A stack of moving", "boxes that never", "got unpacked."], (c, x, y) => { P.shadow(c, x, y + 14, 14); P.block(c, x + 1, y + 7, 9, 8, C.cream); P.block(c, x + 7, y + 9, 8, 6, C.wood); P.block(c, x + 3, y + 1, 8, 7, C.wood); c.rect(x + 6, y + 2, 2, 5, C.cream[1]); c.rect(x + 4, y + 10, 3, 1, C.wood[0]); }],
  ["GYM_STATUE", "Gym Statue", ORNAMENT, "behind", "1x2", 3000, ["A statue like the", "ones that stand by", "a Gym's doors."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.block(c, x + 2, y + 22, 12, 8, C.stone); P.block(c, x + 4, y + 12, 8, 11, C.stone); P.ball(c, x + 8, y + 7, 5, C.stone); c.rect(x + 3, y + 7, 10, 1, O); c.rect(x + 7, y + 6, 2, 3, O); c.rect(x + 6, y + 25, 4, 2, C.gold[1]); }],
  ["BERRY_BLENDER", "Berry Blender", ORNAMENT, "solid", "1x1", 4000, ["A Berry Blender from", "a Contest Hall. Its", "lid is shut tight."], (c, x, y) => { P.shadow(c, x, y + 14, 14); c.ellipse(x + 8, y + 10, 7, 5, O); c.ellipse(x + 8, y + 10, 6, 4, C.red[1]); c.ellipse(x + 8, y + 7, 6, 4, O); c.ellipse(x + 8, y + 7, 5, 3, C.steel[2]); c.ellipse(x + 8, y + 7, 2, 1, C.blue[1]); }],
  ["GLOBE", "Globe", ORNAMENT, "solid", "1x1", 4000, ["A globe of the whole", "world. Hoenn is the", "worn spot."], (c, x, y) => { P.shadow(c, x, y + 14, 12); P.block(c, x + 5, y + 12, 6, 3, C.wood); P.ball(c, x + 8, y + 7, 6, C.blue); c.rect(x + 5, y + 4, 3, 2, C.green[1]); c.rect(x + 8, y + 7, 4, 3, C.green[1]); c.rect(x + 4, y + 9, 2, 2, C.green[1]); }],
  ["PLEASANT_BALL", "Confetti Ball", ORNAMENT, "solid", "1x1", 8000, ["A big ball from the", "Secret Base Guild,", "packed with confetti."], (c, x, y) => { P.shadow(c, x, y + 14, 12); P.block(c, x + 4, y + 12, 8, 3, C.gold); P.ball(c, x + 8, y + 7, 6, C.pink); c.rect(x + 5, y + 4, 2, 2, W); }],
  ["LUMIOSE_MODEL", "Mini Lumiose", ORNAMENT, "behind", "1x2", 6000, ["A model of the tower", "that lights up a far", "city each night."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.block(c, x + 2, y + 26, 12, 4, C.wood); c.poly([[x + 3, y + 26], [x + 7, y + 4], [x + 9, y + 4], [x + 13, y + 26]], O); c.poly([[x + 5, y + 25], [x + 8, y + 6], [x + 11, y + 25]], C.steel[1]); for (const j of [12, 18]) c.rect(x + 5, y + j, 6, 1, O); c.rect(x + 7, y + 1, 2, 4, O); c.rect(x + 7, y + 1, 1, 1, C.gold[2]); c.rect(x + 7, y + 21, 2, 4, C.gold[2]); }],
  ["CASTELIA_MODEL", "Mini Castelia", ORNAMENT, "behind", "1x2", 6000, ["A model of a far", "city's skyline, piers", "and all."], (c, x, y) => { P.shadow(c, x, y + 30, 16); P.block(c, x + 1, y + 26, 14, 4, C.wood); for (const [bx, top, col] of [[2, 12, C.steel], [6, 4, C.blue], [10, 9, C.stone]]) { P.block(c, x + bx, y + top, 4, 27 - top, col); for (let j = top + 2; j < 25; j += 3) c.rect(x + bx + 1, y + j, 2, 1, C.gold[2]); } }],
  ["CANDLESTICK", "Candlestick", ORNAMENT, "behind", "1x2", 4000, ["A tall brass stand", "holding three lit", "candles."], (c, x, y) => { P.shadow(c, x, y + 30, 12); P.block(c, x + 4, y + 27, 8, 3, C.gold); P.post(c, x + 7, y + 13, 14, C.gold[1]); c.rect(x + 2, y + 12, 12, 2, O); c.rect(x + 3, y + 12, 10, 1, C.gold[2]); for (const i of [3, 7, 11]) { c.rect(x + i, y + 7, 2, 5, W); c.rect(x + i, y + 4, 2, 3, C.gold[2]); c.rect(x + i, y + 3, 1, 1, C.red[1]); } }],
  ["PILLAR_PIECE", "Standing Stone", ORNAMENT, "behind", "1x2", 3000, ["A length of fluted", "stone column from", "some old ruin."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.block(c, x + 2, y + 26, 12, 4, C.stone); P.block(c, x + 4, y + 6, 8, 21, C.stone); P.block(c, x + 2, y + 3, 12, 4, C.stone); for (const i of [6, 9]) c.rect(x + i, y + 8, 1, 17, C.stone[0]); c.line(x + 4, y + 3, x + 7, y + 1, O); c.line(x + 7, y + 1, x + 11, y + 3, O); }],
  ["POKE_FLUTE", "Poké Flute", ORNAMENT, "solid", "1x1", 3000, ["A Poké Flute on a", "little stand. It is", "only an ornament."], (c, x, y) => { P.shadow(c, x, y + 14, 14); P.block(c, x + 3, y + 11, 10, 4, C.wood); c.line(x + 3, y + 9, x + 12, y + 3, O, 3); c.line(x + 3, y + 9, x + 12, y + 3, C.cream[2]); P.ball(c, x + 5, y + 8, 3, C.red); c.rect(x + 9, y + 5, 1, 1, O); c.rect(x + 11, y + 4, 1, 1, O); }],
  ["PROCLAMATION", "Proclamation", ORNAMENT, "behind", "1x2", 2000, ["A signboard for the", "rules of your team's", "Secret Base."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.post(c, x + 3, y + 14, 16, C.wood[0]); P.post(c, x + 11, y + 14, 16, C.wood[0]); P.block(c, x + 1, y + 3, 14, 13, C.wood); c.rect(x + 3, y + 5, 10, 9, C.cream[2]); for (const j of [7, 9, 11]) c.rect(x + 4, y + j, 8, 1, C.stone[0]); }],
  ["BLACKBOARD", "Blackboard", ORNAMENT, "behind", "2x2", 4000, ["A blackboard on legs", "for chalking up your", "team's plans."], (c, x, y) => { P.shadow(c, x, y + 30, 30); P.post(c, x + 5, y + 18, 12, C.wood[0]); P.post(c, x + 25, y + 18, 12, C.wood[0]); P.block(c, x + 1, y + 2, 30, 18, C.wood); c.rect(x + 3, y + 4, 26, 14, [36, 84, 68]); c.line(x + 6, y + 8, x + 14, y + 8, W); c.line(x + 6, y + 11, x + 20, y + 11, W); c.ellipse(x + 22, y + 9, 3, 3, C.gold[2], 1); c.rect(x + 12, y + 19, 6, 1, W); }],
  ["STAR_TROPHY", "Star Light", ORNAMENT, "solid", "1x1", 9000, ["A stand topped with", "a star, for shining", "in Contests."], (c, x, y) => { P.shadow(c, x, y + 14, 12); P.block(c, x + 4, y + 11, 8, 4, C.wood); P.post(c, x + 7, y + 7, 5, C.gold[1]); c.poly([[x + 8, y], [x + 10, y + 4], [x + 14, y + 4], [x + 11, y + 7], [x + 12, y + 11], [x + 8, y + 8], [x + 4, y + 11], [x + 5, y + 7], [x + 2, y + 4], [x + 6, y + 4]], O); c.poly([[x + 8, y + 2], [x + 9, y + 5], [x + 12, y + 5], [x + 10, y + 7], [x + 10, y + 9], [x + 8, y + 7], [x + 6, y + 9], [x + 6, y + 7], [x + 4, y + 5], [x + 7, y + 5]], C.gold[2]); }],
  ["ROLY_POLY_TOY", "Boppoyama", ORNAMENT, "solid", "1x1", 4000, ["A weighted toy that", "always rocks back", "upright."], (c, x, y) => { P.shadow(c, x, y + 14, 12); c.ellipse(x + 8, y + 10, 6, 5, O); c.ellipse(x + 8, y + 10, 5, 4, C.red[1]); P.ball(c, x + 8, y + 5, 4, C.cream); c.rect(x + 6, y + 4, 1, 2, O); c.rect(x + 9, y + 4, 1, 2, O); c.rect(x + 5, y + 10, 6, 1, W); }],
  ["SANDBAG", "Makiwara", ORNAMENT, "behind", "1x2", 1000, ["A straw-bound target", "for practising Cut,", "hung from a frame."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.post(c, x + 2, y + 2, 28, C.steel[1]); c.rect(x + 1, y + 1, 13, 3, O); c.rect(x + 2, y + 2, 11, 1, C.steel[2]); c.rect(x + 9, y + 4, 1, 4, O); P.block(c, x + 6, y + 8, 8, 15, C.wood); c.rect(x + 7, y + 12, 6, 1, C.cream[1]); c.rect(x + 7, y + 18, 6, 1, C.cream[1]); P.block(c, x + 1, y + 28, 8, 2, C.steel); }],
  ["STAIRS", "Stairs", ORNAMENT, "solid", "1x1", 3000, ["A short flight of", "wooden steps going", "nowhere in particular."], (c, x, y) => { P.shadow(c, x, y + 14, 14); for (let i = 0; i < 3; i++) P.block(c, x + 1 + i * 4, y + 10 - i * 4, 14 - i * 4, 5, C.wood); }],
  ["DAYDREAM", "Meditative Seat", ORNAMENT, "behind", "1x2", 100000, ["A puzzling piece by", "Lilycove's unsung", "artist. Look twice."], (c, x, y) => { P.shadow(c, x, y + 30, 14); P.post(c, x + 3, y + 18, 12, C.wood[0]); P.post(c, x + 11, y + 18, 12, C.wood[0]); P.frame(c, x + 1, y + 2, 14, 18, C.gold[1], C.purple[0]); c.ellipse(x + 8, y + 11, 4, 5, C.pink[1], 1); c.ellipse(x + 8, y + 11, 2, 2, C.gold[2]); c.rect(x + 5, y + 6, 1, 1, W); c.rect(x + 10, y + 15, 1, 1, W); }],
  ["SHORTCUT", "Heterarchical Loop", ORNAMENT, "pass", "1x2", 100000, ["A painted doorway by", "Lilycove's unsung", "artist. It fools many."], (c, x, y) => { P.frame(c, x + 1, y + 2, 14, 29, C.stone[1], C.dark[0]); c.poly([[x + 5, y + 30], [x + 7, y + 12], [x + 9, y + 12], [x + 11, y + 30]], C.cream[1]); c.rect(x + 7, y + 8, 2, 3, C.gold[2]); }],
  // Mats
  ["VISITOR_MAT", "Welcome Mat", MAT, "pass", "1x1", 500, ["A mat to welcome", "anyone who comes to", "see your base."], (c, x, y) => { P.mat(c, x, y, 16, 16, C.cream); c.rect(x + 4, y + 7, 8, 2, C.red[1]); c.rect(x + 7, y + 4, 2, 8, C.red[1]); }],
  ["TURTWIG_MAT", "Green Mat", MAT, "pass", "3x3", 3000, ["A big mat with a", "Turtwig's face on a", "leaf-green ground."], monMat(C.green, (c, x, y) => { c.ellipse(x, y + 2, 13, 11, O); c.ellipse(x, y + 2, 12, 10, [168, 216, 120]); c.ellipse(x, y + 8, 9, 5, C.gold[2]); c.rect(x - 6, y - 1, 3, 4, O); c.rect(x + 4, y - 1, 3, 4, O); c.poly([[x, y - 9], [x - 4, y - 18], [x + 2, y - 14], [x + 6, y - 19], [x + 2, y - 9]], O); c.poly([[x, y - 10], [x - 2, y - 15], [x + 2, y - 12], [x + 4, y - 16], [x + 2, y - 10]], C.green[2]); })],
  ["CHIMCHAR_MAT", "Red Mat", MAT, "pass", "3x3", 3000, ["A big mat with a", "Chimchar's face on a", "fire-red ground."], monMat(C.red, (c, x, y) => { c.ellipse(x, y + 1, 12, 11, O); c.ellipse(x, y + 1, 11, 10, [240, 152, 72]); c.ellipse(x, y + 4, 8, 7, C.cream[2]); c.rect(x - 5, y + 1, 3, 4, O); c.rect(x + 3, y + 1, 3, 4, O); c.rect(x - 2, y + 8, 5, 1, O); c.poly([[x - 3, y - 9], [x, y - 19], [x + 3, y - 9]], O); c.poly([[x - 2, y - 9], [x, y - 16], [x + 2, y - 9]], C.gold[2]); })],
  ["PIPLUP_MAT", "Blue Mat", MAT, "pass", "3x3", 3000, ["A big mat with a", "Piplup's face on a", "sea-blue ground."], monMat(C.blue, (c, x, y) => { c.ellipse(x, y, 12, 12, O); c.ellipse(x, y, 11, 11, [88, 152, 224]); c.ellipse(x - 4, y + 2, 5, 6, W); c.ellipse(x + 4, y + 2, 5, 6, W); c.rect(x - 5, y, 3, 4, O); c.rect(x + 3, y, 3, 4, O); c.poly([[x - 3, y + 5], [x, y + 10], [x + 3, y + 5]], C.gold[1]); c.rect(x - 1, y - 11, 3, 5, C.blue[2]); })],
  ["PLAIN_MAT", "Flat Mat", MAT, "pass", "3x3", 3500, ["A big, simple mat in", "a calm colour. Holds", "plenty of dolls."], (c, x, y) => { P.mat(c, x, y, 48, 48, C.cream); c.rect(x + 6, y + 6, 36, 36, C.cream[0]); c.rect(x + 7, y + 7, 34, 34, C.cream[2]); }],
  // Wall pieces
  ["ENDLESS_LOOP", "Paradoxical Popper", POSTER, "wall", "2x1", 100000, ["Staircases that climb", "forever, by Lilycove's", "unsung artist."], painting(C.cream[2], (c, x, y) => { c.poly([[x + 2, y + 4], [x + 11, y], [x + 20, y + 4], [x + 11, y + 7]], C.stone[0]); c.poly([[x + 6, y + 4], [x + 11, y + 2], [x + 16, y + 4], [x + 11, y + 5]], C.cream[2]); for (let i = 0; i < 4; i++) c.rect(x + 4 + i * 4, y + 3 - (i % 2), 2, 1, O); })],
  ["GROUDON_PAINTING", "Red Scroll", POSTER, "wall", "2x1", 4500, ["A scroll showing the", "land's creator under", "a blazing sun."], painting([248, 200, 120], (c, x, y) => { c.ellipse(x + 18, y + 1, 2, 2, C.gold[2]); c.poly([[x + 2, y + 7], [x + 6, y + 1], [x + 12, y + 1], [x + 15, y + 7]], C.red[1]); c.rect(x + 5, y + 3, 8, 1, O); c.rect(x + 7, y + 2, 1, 1, C.gold[2]); for (const i of [4, 8, 12]) c.rect(x + i, y, 1, 2, W); })],
  ["KYOGRE_PAINTING", "Blue Scroll", POSTER, "wall", "2x1", 4500, ["A scroll showing the", "sea's creator in a", "storm-dark ocean."], painting([56, 88, 168], (c, x, y) => { c.ellipse(x + 10, y + 4, 8, 3, C.blue[1]); c.poly([[x + 16, y + 4], [x + 21, y], [x + 20, y + 6]], C.blue[1]); c.rect(x + 5, y + 5, 10, 1, W); c.rect(x + 5, y + 3, 1, 1, C.gold[2]); for (const i of [6, 10, 13]) c.rect(x + i, y + 2, 2, 1, C.red[1]); })],
  ["RAYQUAZA_PAINTING", "Green Scroll", POSTER, "wall", "2x1", 4500, ["A scroll showing the", "sky's guardian coiled", "above the clouds."], painting([120, 184, 232], (c, x, y) => { for (let i = 0; i < 20; i++) c.rect(x + 1 + i, y + 3 + Math.round(Math.sin(i * 0.7) * 2.4), 2, 2, i % 5 ? C.green[1] : C.gold[2]); c.rect(x + 20, y + 1, 2, 3, C.green[0]); c.rect(x + 3, y + 6, 6, 1, W); c.rect(x + 13, y + 7, 5, 1, W); })],
  ["NATIONAL_DIPLOMA", "National Award", POSTER, "wall", "1x1", 12000, ["An award for those", "who know Pokémon the", "whole world over."], diploma(C.gold[1])],
  ["REGIONAL_DIPLOMA", "Regional Award", POSTER, "wall", "1x1", 8000, ["An award for those", "who know every Pokémon", "of Hoenn."], diploma(C.blue[1])],
  ["TIME_TRAVEL_AWARD", "Time Travel Award", POSTER, "wall", "1x1", 8000, ["An award for bringing", "a Pokémon across the", "years from long ago."], diploma(C.purple[1])],
  ["DADS_SCROLL", "Dad's Scroll", POSTER, "wall", "1x1", 4500, ["A hanging scroll with", "a few firm words in", "your dad's brushwork."], (c, x, y) => { c.rect(x + 3, y + 1, 10, 2, O); c.rect(x + 4, y + 1, 8, 1, C.wood[1]); c.rect(x + 4, y + 3, 8, 11, O); c.rect(x + 5, y + 3, 6, 10, C.cream[2]); c.rect(x + 3, y + 13, 10, 2, O); c.rect(x + 4, y + 13, 8, 1, C.wood[1]); c.line(x + 7, y + 5, x + 9, y + 7, O); c.line(x + 9, y + 7, x + 6, y + 9, O); c.rect(x + 7, y + 10, 2, 2, O); }],
];
// Dolls are pictures on the spot that holds them, like Emerald's: [key, name, price, description, draw at (0, 0) in 16x16].
const DOLLS = [
  ["SUBSTITUTE_DOLL", "Substitute Doll", 3000, ["A doll of the little", "stand-in a Pokémon", "hides behind."], (c) => { c.ellipse(8, 10, 6, 5, O); c.ellipse(8, 10, 5, 4, C.green[1]); c.ellipse(8, 5, 5, 4, O); c.ellipse(8, 5, 4, 3, C.green[1]); c.poly([[3, 3], [4, 0], [6, 2]], O); c.poly([[10, 2], [12, 0], [13, 3]], O); c.rect(6, 5, 1, 2, O); c.rect(9, 5, 1, 2, O); c.ellipse(8, 11, 3, 2, C.cream[2]); }],
  ["MIMIC_DOLL", "Invisible Doll", 4000, ["A trick doll said to", "vanish when set down.", "This one stays put."], (c) => { c.ellipse(8, 5, 4, 4, O); c.ellipse(8, 5, 3, 3, C.cream[1]); c.rect(4, 1, 8, 3, O); c.rect(5, 2, 6, 1, C.red[1]); c.rect(4, 9, 8, 6, O); c.rect(5, 9, 6, 5, C.blue[1]); c.rect(7, 9, 2, 5, W); c.rect(6, 5, 1, 1, O); c.rect(9, 5, 1, 1, O); }],
];

// ---- the tile sheet: each decoration's tiles side by side, packed on shelves 16 tiles wide ----
const FIRST = 4096, COLS = 16;
let row = 0, col = 0, shelf = 0;
const placed = LIST.map((d) => {
  const [w, h] = SHAPES[d[4]];
  if (col + w > COLS) { row += shelf; col = 0; shelf = 0; }
  const at = { x: col, y: row, w, h };
  col += w; shelf = Math.max(shelf, h);
  return at;
});
const sheet = canvas(COLS * 16, (row + shelf) * 16);
LIST.forEach((d, i) => d[7](sheet, placed[i].x * 16, placed[i].y * 16));
sheet.save(path.join(root, "assets/world/maps/_decor_oras-mt.png"));
for (const d of DOLLS) { const c = canvas(16, 16); d[4](c); c.save(path.join(root, "assets/world/sprites/oras_" + d[0].toLowerCase() + ".png")); }

const entries = LIST.map((d, i) => {
  const { x, y, w, h } = placed[i], tiles = [];
  for (let r = 0; r < h; r++) for (let k = 0; k < w; k++) tiles.push(512 + FIRST + (y + r) * COLS + x + k);   // (ui/hoenn-decor.js takes 512 off, as for Emerald's)
  return { key: d[0], name: d[1], perm: d[3], shape: d[4], w, h, cat: d[2], price: d[5], desc: d[6], tiles, oras: true };
}).concat(DOLLS.map((d) => ({ key: d[0], name: d[1], perm: "sprite", shape: "1x1", w: 1, h: 1, cat: DOLL, price: d[2], desc: d[3], tiles: [{ sprite: "oras_" + d[0].toLowerCase(), width: 16, height: 16, frames: 1 }], oras: true })));

// ---- where they're sold: added to Emerald's decoration counters ----
const keys = (cat, test) => entries.filter((e) => e.cat === cat && (!test || test(e))).map((e) => "DECOR_" + e.key);
const GADGETS = ["OLD_LAMP", "MOOD_LIGHTING", "VENDING_MACHINE", "JUKEBOX", "LEVEL_RELEASE", "TOY_PC", "TALL_GRASS"].map((k) => "DECOR_" + k);
const SALE = ["BERRY_TREE", "TRASH_CAN", "CARDBOARD_BOXES", "LUMIOSE_MODEL", "CASTELIA_MODEL", "CANDLESTICK", "PILLAR_PIECE", "DAYDREAM", "SHORTCUT"].map((k) => "DECOR_" + k);
const SHOPS = {
  // Fortree's decoration shop (ORAS's Secret Base Guild is in Fortree): the desk clerk takes the gadgets and tricks,
  // the chair clerk the rest of the furnishings.
  FortreeCity_DecorationShop_PokemartDecor_Desks: ["DECOR_ICY_DESK"].concat(GADGETS),
  FortreeCity_DecorationShop_PokemartDecor_Chairs: keys(ORNAMENT, (e) => !GADGETS.includes("DECOR_" + e.key) && !SALE.includes("DECOR_" + e.key)),
  LilycoveCity_DepartmentStore_5F_Pokemart_Mats: keys(MAT),
  LilycoveCity_DepartmentStore_5F_Pokemart_Posters: keys(POSTER),
  // (And the four of Emerald's own that nothing in Emerald gives: the Seedot Doll, Ruby's from Lanette, and the
  // three e-Reader dolls.)
  LilycoveCity_DepartmentStore_5F_Pokemart_Dolls: keys(DOLL).concat(["DECOR_SEEDOT_DOLL", "DECOR_REGIROCK_DOLL", "DECOR_REGICE_DOLL", "DECOR_REGISTEEL_DOLL"]),
  LilycoveCity_DepartmentStoreRooftop_PokemartDecor_ClearOutSale: SALE,
};
const sold = new Set(Object.values(SHOPS).flat());
for (const e of entries) if (!sold.has("DECOR_" + e.key)) throw new Error(e.key + " is sold nowhere");

const out = [
  "// Generated by tools/build-oras-decor.js: Omega Ruby and Alpha Sapphire's own decorations as 2D tiles, and where",
  "// every decoration that had no source is sold. See docs/decorations.md.",
  "(function(){",
  "const H=window.HOENN_SCRIPTS,E=" + JSON.stringify(entries) + ",S=" + JSON.stringify(SHOPS) + ";",
  "for(const e of E)if(!H.decor.some(d=>d.key===e.key))H.decor.push(Object.assign({id:H.decor.length+1},e));",
  "for(const k in S){const t=H.tb[k]||(H.tb[k]=[]);for(const d of S[k])if(!t.some(r=>r[0]===d))t.push([d]);}",
  "// (The rooftop clear-out sale ran only while Lilycove's was on the news; here it is always on.)",
  "H.s.LilycoveCity_DepartmentStoreRooftop_OnTransition=[[\"clearflag\",\"FLAG_HIDE_LILYCOVE_DEPARTMENT_STORE_ROOFTOP_SALE_WOMAN\"],[\"end\"]];",
  "window.ORAS_DECOR=E.map(e=>e.key);",
  "})();", ""].join("\n");
fs.writeFileSync(path.join(root, "data/oras-decor.js"), out);
console.log(entries.length + " ORAS decorations, " + sheet.w / 16 + "x" + sheet.h / 16 + " tiles");
