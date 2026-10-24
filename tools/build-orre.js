// Builds Orre's first place, from Pokémon Colosseum: the Outskirt Stand, a
// diner made from an old locomotive out in the desert, outside and in, and
// the people of the game's opening (Wes, Rider Willie, Folly and Trudly).
//
//   node tools/build-orre.js <path to pret/pokeemerald>   (or set POKEEMERALD)
//
// Colosseum is a 3D game, so nothing of it can be converted. Instead the
// desert is Emerald's (Route 111's sand and cliffs, from the General and
// Mauville tilesets, laid out as the Stand's dusty clearing), and what
// Emerald doesn't have is drawn here, pixel by pixel, in the GBA games'
// style: the locomotive with its shack and orange steps, Folly and Trudly's
// truck, Wes's bike and the inside of the diner (its curved wooden bar,
// green booths, the TV, the jukebox and the copper pipes). Wes is Emerald's
// Brendan recoloured (his white cap reads as Wes's silver hair; a dark coat
// with gold trim), Rider Willie FireRed's Cool Trainer with pink hair (and
// FireRed's Biker, pink-haired, for his battle picture: both from this
// game's own assets).
//
// Writes:
//   assets/world/maps/OutskirtStand*.png        the outside (and -top, -border, -anim, -patch-truck)
//   assets/world/maps/OutskirtStand_Diner*.png  the inside
//   assets/world/sprites/player_wes*.png        Wes walking, running, on his bike, surfing, fishing
//   assets/world/sprites/orre_*.png             Willie, the truck, Wes's parked bike
//   assets/sprites/trainers/back/wes.png        Wes's battle back picture (5 frames)
//   assets/sprites/trainers/front/wes.png, rider_willie.png
//   data/orre-maps.js                           window.WORLD_MAPS entries for them
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const EM = process.argv[2] || process.env.POKEEMERALD;
if (!EM || !fs.existsSync(path.join(EM, "data/tilesets/primary/general"))) {
  console.error("Usage: node tools/build-orre.js <path to pret/pokeemerald>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const outMaps = path.join(root, "assets/world/maps"), outSprites = path.join(root, "assets/world/sprites");
const E = require("./lib/emerald-tiles")(EM);

// ---------- Drawing ----------
//
// An RGBA picture to paint on. Colours are [r, g, b] or [r, g, b, a]; a
// translucent one (a shadow) is blended over what's there.
function canvas(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  const c = { w, h, data };
  c.set = (x, y, col) => {
    x |= 0; y |= 0;
    if (!col || x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4, a = col.length > 3 ? col[3] / 255 : 1;
    if (a >= 1) { data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255; return; }
    if (!data[o + 3]) { data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = Math.round(a * 255); return; }
    for (let k = 0; k < 3; k++) data[o + k] = data[o + k] * (1 - a) + col[k] * a;
  };
  c.get = (x, y) => { const o = (y * w + x) * 4; return [data[o], data[o + 1], data[o + 2], data[o + 3]]; };
  c.rect = (x, y, rw, rh, col) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) c.set(x + i, y + j, col); };
  c.hl = (x0, x1, y, col) => { for (let x = x0; x <= x1; x++) c.set(x, y, col); };
  c.vl = (x, y0, y1, col) => { for (let y = y0; y <= y1; y++) c.set(x, y, col); };
  c.frame = (x, y, rw, rh, col) => { c.hl(x, x + rw - 1, y, col); c.hl(x, x + rw - 1, y + rh - 1, col); c.vl(x, y, y + rh - 1, col); c.vl(x + rw - 1, y, y + rh - 1, col); };
  // A shaded box: fill, a lit top-left edge, a shaded bottom-right edge, an outline.
  c.box = (x, y, rw, rh, s) => {
    c.rect(x, y, rw, rh, s.fill);
    if (s.light) { c.hl(x + 1, x + rw - 2, y + 1, s.light); c.vl(x + 1, y + 1, y + rh - 2, s.light); }
    if (s.dark) { c.hl(x + 1, x + rw - 2, y + rh - 2, s.dark); c.vl(x + rw - 2, y + 1, y + rh - 2, s.dark); }
    if (s.line) c.frame(x, y, rw, rh, s.line);
  };
  c.disc = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) c.set(cx + x, cy + y, col); };
  c.ring = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r + r * 0.6 && d > (r - 1) * (r - 1) + (r - 1) * 0.6) c.set(cx + x, cy + y, col); } };
  // An outline round everything drawn (where a clear pixel touches a painted one).
  c.outline = (col) => {
    const was = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) was[i] = data[i * 4 + 3] > 0 ? 1 : 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (was[y * w + x]) continue;
      if ((x > 0 && was[y * w + x - 1]) || (x < w - 1 && was[y * w + x + 1]) || (y > 0 && was[(y - 1) * w + x]) || (y < h - 1 && was[(y + 1) * w + x])) c.set(x, y, col);
    }
  };
  c.blit = (src, dx, dy, flip) => {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const p = src.get(flip ? src.w - 1 - x : x, y);
      if (p[3]) c.set(dx + x, dy + y, p);
    }
  };
  return c;
}
// A tiny 3x5 font for signs.
const FONT = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", H: "101101111101101", I: "111010010010111", K: "101101110101101", L: "100100100100111",
  M: "101111111101101", N: "111101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101",
  Y: "101101010010010", G: "011100101101011", " ": "000000000000000", "!": "010010010000010", "'": "010010000000000",
  0: "111101101101111", 2: "111001111100111", 7: "111001001001001", 9: "111101111001111"
};
function text(c, s, x, y, col) {
  for (const ch of s) {
    const g = FONT[ch] || FONT[" "];
    for (let i = 0; i < 15; i++) if (g[i] === "1") c.set(x + (i % 3), y + Math.floor(i / 3), col);
    x += 4;
  }
}
// Deterministic speckle (rust, sand, wood grain).
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

// Colours, GBA-style (multiples of 8).
const C = {
  line: [48, 32, 32], black: [32, 32, 40],
  rust: [[248, 168, 96], [224, 120, 56], [176, 80, 40], [120, 48, 24]],
  iron: [[136, 136, 152], [88, 88, 104], [56, 56, 72], [32, 32, 48]],
  wood: [[232, 184, 120], [200, 144, 80], [160, 104, 56], [112, 72, 40]],
  tin: [[200, 192, 176], [160, 152, 136], [120, 112, 104], [80, 72, 72]],
  glass: [[200, 232, 248], [120, 168, 208], [72, 104, 152]],
  green: [[152, 216, 120], [96, 168, 88], [56, 120, 64], [32, 80, 48]],
  copper: [[248, 184, 128], [216, 128, 72], [160, 80, 40]],
  cream: [[248, 240, 208], [232, 216, 168], [200, 176, 128]],
  shadow: [24, 16, 8, 72]
};

// ---------- Recolouring sprites ----------

// An indexed sheet -> canvas, each palette slot mapped (zones by row: the
// head rows above `split(frameTop)` use `head`, the rest `body`).
function recolor(file, opts) {
  const png = readPng(file), w = png.width, h = png.height, fw = opts.frameWidth || w, fh = opts.frameHeight || h;
  const c = canvas(w, h);
  for (let fy = 0; fy < h; fy += fh) for (let fx = 0; fx < w; fx += fw) {
    let top = fh;
    for (let y = 0; y < fh && top === fh; y++) for (let x = 0; x < fw; x++) if (png.px[(fy + y) * w + fx + x]) { top = y; break; }
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const i = png.px[(fy + y) * w + fx + x];
      if (!i) continue;
      const zone = y - top < (opts.headRows || 0) ? opts.head || {} : opts.body || {};
      const col = zone[i] || (opts.all || {})[i] || png.palette[i];
      c.set(fx + x, fy + y, col);
    }
  }
  return c;
}
const save = (c, file) => writePng(file, c.w, c.h, c.data);

// Wes: Brendan's white cap and its band become spiky silver hair; his
// black hair under it silver too; the red shirt black; the navy jacket a
// darker coat; the green bag dark blue (and gold trim on his front picture).
const WES_HEAD = {
  9: [216, 224, 232], 14: [248, 248, 248], 10: [176, 184, 200], 11: [136, 144, 160],
  5: [168, 176, 192], 6: [136, 144, 160], 7: [104, 112, 128], 8: [64, 64, 80]
};
const WES_BODY = {
  12: [72, 72, 96], 13: [48, 48, 64], 10: [104, 112, 152], 11: [72, 80, 120],
  5: [80, 88, 128], 6: [56, 64, 104], 7: [40, 48, 80], 8: [24, 32, 56]
};
// (Brendan's bag strap is Wes's gold trim, on his front picture.)
const WES_FRONT = Object.assign({}, WES_BODY, { 10: [248, 208, 88], 11: [200, 152, 48] });
const BRENDAN = (...p) => path.join(EM, "graphics/object_events/pics/people/brendan", ...p);
const SHEETS = { "": ["walking.png", 16, 10], _run: ["running.png", 16, 10], _bike: ["mach_bike.png", 32, 9], _surf: ["surfing.png", 32, 8], _fish: ["fishing.png", 32, 8] };
for (const [suffix, [file, fw, headRows]] of Object.entries(SHEETS)) {
  save(recolor(BRENDAN(file), { frameWidth: fw, frameHeight: 32, headRows, head: WES_HEAD, body: WES_BODY }), path.join(outSprites, "player_wes" + suffix + ".png"));
}
{
  const front = recolor(path.join(EM, "graphics/trainers/front_pics/brendan.png"), { headRows: 13, head: WES_HEAD, body: WES_FRONT });
  save(front, path.join(root, "assets/sprites/trainers/front/wes.png"));
  // The back picture: Emerald's has 4 frames; this game's have 5 (the last
  // one repeated, as the throw ends).
  const back4 = recolor(path.join(EM, "graphics/trainers/back_pics/brendan.png"), { frameHeight: 64, headRows: 26, head: WES_HEAD, body: WES_BODY });
  const back = canvas(64, 320);
  back.blit(back4, 0, 0);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const p = back4.get(x, 192 + y); if (p[3]) back.set(x, 256 + y, p); }
  save(back, path.join(root, "assets/sprites/trainers/back/wes.png"));
}

// Recolours an RGBA picture: `map` from "r,g,b" to a colour, only above row
// `rows` of each frame `fh` tall.
function recolorRGBA(file, map, rows, fh) {
  const png = readPng(file), c = canvas(png.width, png.height);
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const o = (y * png.width + x) * 4, rgba = png.rgba;
    if (!rgba[o + 3]) continue;
    const key = rgba[o] + "," + rgba[o + 1] + "," + rgba[o + 2];
    c.set(x, y, (y % (fh || png.height)) < rows && map[key] || [rgba[o], rgba[o + 1], rgba[o + 2]]);
  }
  return c;
}
// Rider Willie: FireRed's Cool Trainer with pink hair; his battle picture,
// FireRed's Biker with a pink mohawk.
save(recolorRGBA(path.join(outSprites, "cooltrainer_m.png"),
  { "106,82,189": [232, 104, 168], "65,57,98": [160, 48, 112], "164,139,238": [248, 168, 208] }, 19, 32), path.join(outSprites, "orre_willie.png"));
save(recolorRGBA(path.join(root, "assets/sprites/trainers/front/biker.png"),
  { "123,90,82": [208, 72, 144], "82,57,41": [136, 32, 88] }, 13), path.join(root, "assets/sprites/trainers/front/rider_willie.png"));

// ---------- The Outskirt Stand, outside ----------
//
// Route 111's desert (its blocks from x 2, y 38: 36 by 24), cleared: its
// rocks, pebbles, grass and the Mirage Tower made plain sand. The clearing
// is open north (the road on to Phenac City) and south (the desert Wes
// rides in from).
const layouts = {};
for (const l of JSON.parse(fs.readFileSync(path.join(EM, "data/layouts/layouts.json"), "utf8")).layouts) if (l.id) layouts[l.id] = l;
const general = E.loadTileset("primary", "general", E.GENERAL_ANIMS), mauville = E.loadTileset("secondary", "mauville");
const R111 = layouts.LAYOUT_ROUTE111;
const r111 = fs.readFileSync(path.join(EM, R111.blockdata_filepath));
const SAND = 0x121;
const OX = 2, OY = 38, W = 36, H = 24;
const blocks = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) blocks.push(r111.readUInt16LE(((OY + y) * R111.width + OX + x) * 2));
const at = (x, y) => (y - OY) * W + x - OX;   // (in Route 111's coordinates)
const plain = (x, y) => { blocks[at(x, y)] = SAND; };
const GRASSY = new Set([0x001, 0x0e0, 0x0e2, 0x118, 0x119, 0x11a, 0x120, 0x128, 0x129, 0x12a]);
for (let y = OY; y < OY + H; y++) for (let x = OX; x < OX + W; x++) if (GRASSY.has(blocks[at(x, y)] & 0x3ff)) plain(x, y);
for (const [x, y] of [[18, 42], [12, 51], [29, 46]]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) plain(x + dx, y + dy);
for (let y = 53; y <= 58; y++) for (let x = 18; x <= 20; x++) plain(x, y);   // the Mirage Tower

// The diner: a wooden shack (its door at the top of orange steps), then the
// old locomotive: its cab and its long rusty boiler on the wheels, the
// smokestack and the headlight up front (facing east), "OUTSKIRT STAND"
// painted along its side. 224 by 96: the bottom 80 rows are its footprint
// (14 tiles by 5), the top 16 the stack and cab roof above it.
function drawDiner() {
  const c = canvas(224, 96);
  seed = 11;
  // The shadow on the sand.
  c.rect(4, 90, 218, 6, C.shadow);
  // The shack: a corrugated tin roof and plank walls.
  for (let y = 20; y <= 40; y++) for (let x = 0; x < 64; x++) {
    const k = x % 4;
    let col = k === 0 ? C.tin[0] : k === 3 ? C.tin[2] : C.tin[1];
    if (y >= 38) col = C.tin[3];
    else if (rand() < 0.06) col = C.rust[2];
    c.set(x, y, col);
  }
  c.hl(0, 63, 20, C.line);
  for (let x = 0; x < 64; x += 8) {
    c.rect(x, 41, 8, 47, C.wood[1]);
    c.vl(x, 41, 87, C.wood[3]);
    c.vl(x + 1, 41, 87, C.wood[0]);
    for (let k = 0; k < 6; k++) c.set(x + 2 + Math.floor(rand() * 5), 42 + Math.floor(rand() * 44), C.wood[2]);
  }
  c.hl(0, 63, 41, C.wood[3]);
  c.box(6, 50, 18, 16, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.wood[3] });
  c.vl(15, 51, 64, C.wood[3]); c.hl(7, 22, 57, C.wood[3]);
  c.box(29, 43, 24, 10, { fill: [200, 56, 48], light: [232, 96, 80], dark: [144, 32, 32], line: C.line });
  text(c, "DINER", 31, 45, C.cream[0]);
  c.box(34, 56, 12, 32, { fill: C.wood[2], light: C.wood[1], dark: C.wood[3], line: C.line });
  c.box(37, 60, 6, 6, { fill: C.glass[1], line: C.wood[3] });
  c.set(43, 73, C.cream[0]);
  c.frame(0, 20, 64, 68, C.line);
  // The orange steps up to the door.
  c.box(31, 87, 18, 5, { fill: [232, 128, 48], light: [248, 176, 96], dark: [184, 88, 32], line: C.line });
  c.box(29, 91, 22, 5, { fill: [232, 128, 48], light: [248, 176, 96], dark: [184, 88, 32], line: C.line });
  // The cab: an iron roof over a rusty box with two windows.
  c.box(64, 18, 48, 64, { fill: C.rust[1], light: C.rust[0], dark: C.rust[2], line: C.line });
  c.box(62, 8, 52, 11, { fill: C.iron[1], light: C.iron[0], dark: C.iron[2], line: C.line });
  for (const x of [70, 92]) {
    c.box(x, 25, 16, 18, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.iron[3] });
    c.hl(x + 2, x + 6, 27, [248, 248, 248]);
  }
  for (let x = 68; x < 110; x += 6) { c.set(x, 50, C.rust[3]); c.set(x, 74, C.rust[3]); }
  // The steam dome and the smokestack (behind the boiler's top).
  c.disc(153, 33, 7, C.rust[1]); c.ring(153, 33, 7, C.line); c.set(151, 29, C.rust[0]); c.set(150, 30, C.rust[0]);
  c.rect(185, 0, 20, 6, C.iron[2]); c.hl(185, 204, 1, C.iron[0]); c.frame(185, 0, 20, 6, C.line);
  c.box(188, 5, 14, 32, { fill: C.iron[2], light: C.iron[1], dark: C.iron[3], line: C.line });
  // The boiler.
  for (let y = 34; y <= 78; y++) {
    const col = y <= 36 ? C.rust[0] : y <= 46 ? (y % 2 ? C.rust[0] : C.rust[1]) : y <= 66 ? C.rust[1] : y <= 74 ? C.rust[2] : C.rust[3];
    c.hl(112, 203, y, col);
  }
  for (let k = 0; k < 220; k++) c.set(112 + Math.floor(rand() * 92), 37 + Math.floor(rand() * 40), rand() < 0.5 ? C.rust[2] : C.rust[3]);
  c.hl(112, 203, 33, C.line); c.hl(112, 203, 79, C.line);
  for (const x of [124, 166, 196]) { c.rect(x, 34, 3, 45, C.iron[2]); c.vl(x, 34, 78, C.iron[1]); }
  for (let x = 114; x < 204; x += 5) { c.set(x, 39, C.rust[3]); c.set(x, 75, C.rust[3]); }
  // Its sign.
  c.box(130, 48, 62, 13, { fill: C.cream[0], light: [255, 255, 255], dark: C.cream[2], line: C.line });
  text(c, "OUTSKIRT STAND", 133, 52, [64, 48, 40]);
  // The smokebox at the front, and the headlight on it.
  c.box(204, 32, 12, 48, { fill: C.iron[2], light: C.iron[1], dark: C.iron[3], line: C.line });
  c.disc(210, 28, 5, C.iron[2]); c.disc(210, 28, 3, [248, 232, 152]); c.set(209, 27, [255, 255, 255]); c.ring(210, 28, 5, C.line);
  // The frame, the wheels and the rod between them; the cowcatcher.
  c.box(62, 79, 156, 7, { fill: C.iron[3], light: C.iron[2], line: C.line });
  for (let y = 78; y <= 93; y++) {
    const x1 = 216 + Math.floor((y - 78) / 2);
    c.hl(212, Math.min(x1, 223), y, (y - 78) % 3 === 2 ? C.iron[3] : C.iron[1]);
    c.set(Math.min(x1, 223), y, C.line);
  }
  const wheel = (cx, cy, r) => {
    c.disc(cx, cy, r, C.rust[2]); c.ring(cx, cy, r, C.line); c.ring(cx, cy, r - 1, C.iron[3]);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let t = -r + 2; t <= r - 2; t++) c.set(cx + Math.round(dx * t * (dy ? 0.7 : 1)), cy + Math.round(dy * t * (dx ? 0.7 : 1)), C.rust[3]);
    c.disc(cx, cy, 2, C.iron[0]); c.set(cx, cy, C.line);
  };
  for (const x of [80, 100]) wheel(x, 88, 7);
  for (const x of [130, 152, 174, 196]) wheel(x, 86, 9);
  c.rect(130, 85, 67, 2, C.iron[0]); c.hl(130, 196, 87, C.line);
  return c;
}

// Where it stands: its footprint's top-left tile, the shack's door (a
// tile of the footprint's bottom row) and the truck's spot out front.
const DINER = { x: 11, y: 6, w: 14, h: 5 }, DOOR = { x: DINER.x + 2, y: DINER.y + 4 };
const TRUCK = { x: 19, y: 12, w: 4 };

const outside = E.render(blocks, W, H, general, mauville, false);
{
  // (Pasted over the map: the footprint's bottom row under people, the rest
  // over them, so the stack and roof hide whoever walks behind.)
  const diner = drawDiner(), x0 = DINER.x * 16, y0 = (DINER.y - 1) * 16, split = 16 + 16 * (DINER.h - 1);
  for (let y = 0; y < diner.h; y++) for (let x = 0; x < diner.w; x++) {
    const p = diner.get(x, y);
    if (!p[3]) continue;
    const o = ((y0 + y) * W * 16 + x0 + x) * 4, img = y < split && p[3] === 255 ? outside.above : outside.below;
    const a = p[3] / 255;
    for (let k = 0; k < 3; k++) img[o + k] = img[o + 3] ? img[o + k] * (1 - a) + p[k] * a : p[k];
    img[o + 3] = Math.max(img[o + 3], p[3]);
  }
  outside.anyAbove = true;
}
// Folly and Trudly's truck, a battered blue pickup with a lumpy sack in its
// bed: three 64x48 frames in FireRed's standing order (front, back, side;
// the side faces left, and is mirrored going right).
function drawTruck() {
  const c = canvas(192, 48);
  seed = 23;
  const blue = [[136, 176, 224], [88, 128, 192], [56, 88, 144], [32, 56, 96]];
  const sack = [[240, 224, 176], [208, 184, 128], [160, 136, 88]];
  const tyre = (cx, cy, r) => { c.disc(cx, cy, r, C.black); c.disc(cx, cy, r - 3, C.iron[1]); c.set(cx, cy, C.iron[0]); };
  const sackAt = (x, y, w, h) => {
    c.box(x, y, w, h, { fill: sack[1], light: sack[0], dark: sack[2], line: C.line });
    c.hl(x + 2, x + w - 3, y + 3, sack[2]);
    c.set(x + w / 2 | 0, y - 1, C.line); c.set((x + w / 2 | 0) + 1, y - 2, C.line);
  };
  // Front (64..? no: frame 0 at x 0): the cab's face, headlights, grille.
  {
    const x = 16;
    c.rect(x - 1, 42, 34, 5, C.shadow);
    tyre(x + 4, 40, 5); tyre(x + 28, 40, 5);
    c.box(x, 18, 32, 22, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });
    c.box(x + 3, 8, 26, 12, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });
    c.box(x + 5, 10, 22, 8, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.line });
    c.box(x + 9, 28, 14, 7, { fill: C.iron[2], light: C.iron[1], line: C.line });
    for (let k = 0; k < 3; k++) c.hl(x + 10, x + 21, 30 + k * 2, C.iron[3]);
    c.disc(x + 5, 31, 2, [248, 240, 168]); c.disc(x + 26, 31, 2, [248, 240, 168]);
    c.box(x - 1, 36, 34, 4, { fill: C.iron[1], light: C.iron[0], line: C.line });
  }
  // Back: the tailgate, red lights, and the sack sticking up out of the bed.
  {
    const x = 64 + 16;
    c.rect(x - 1, 42, 34, 5, C.shadow);
    tyre(x + 4, 40, 5); tyre(x + 28, 40, 5);
    c.box(x + 3, 6, 26, 12, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });
    c.box(x + 6, 8, 20, 7, { fill: C.glass[2], light: C.glass[1], line: C.line });
    sackAt(x + 7, 13, 18, 12);
    c.box(x, 22, 32, 16, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });
    c.hl(x + 2, x + 29, 26, blue[3]);
    c.rect(x + 2, 29, 4, 3, [216, 48, 48]); c.rect(x + 26, 29, 4, 3, [216, 48, 48]);
    c.box(x - 1, 36, 34, 4, { fill: C.iron[1], light: C.iron[0], line: C.line });
  }
  // Side, facing left: hood, cab, bed with the sack, two wheels.
  {
    const x = 128;
    c.rect(x + 2, 42, 60, 5, C.shadow);
    c.box(x + 2, 22, 22, 14, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });   // hood
    c.box(x + 18, 8, 18, 28, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });   // cab
    c.box(x + 21, 11, 12, 10, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.line });
    sackAt(x + 39, 10, 20, 14);
    c.box(x + 35, 22, 27, 14, { fill: blue[1], light: blue[0], dark: blue[2], line: C.line });   // bed
    c.hl(x + 37, x + 60, 25, blue[3]);
    c.set(x + 3, 27, [248, 240, 168]); c.set(x + 3, 28, [248, 240, 168]);
    c.box(x, 33, 8, 4, { fill: C.iron[1], line: C.line });
    c.box(x + 58, 33, 6, 4, { fill: C.iron[1], line: C.line });
    for (let k = 0; k < 30; k++) c.set(x + 4 + Math.floor(rand() * 56), 24 + Math.floor(rand() * 11), rand() < 0.5 ? blue[2] : C.rust[2]);
    tyre(x + 13, 38, 7); tyre(x + 50, 38, 7);
  }
  return c;
}
save(drawTruck(), path.join(outSprites, "orre_truck.png"));

// Wes's bike, parked: a dark, low motorbike with orange trim (32x32, one frame).
function drawBike() {
  const c = canvas(32, 32);
  c.rect(3, 29, 27, 3, C.shadow);
  const wheel = (cx) => { c.disc(cx, 25, 5, C.black); c.disc(cx, 25, 3, C.iron[1]); c.set(cx, 25, C.iron[0]); };
  wheel(7); wheel(25);
  c.box(6, 17, 20, 7, { fill: C.iron[2], light: C.iron[1], dark: C.iron[3], line: C.line });
  c.box(9, 14, 10, 4, { fill: [232, 128, 48], light: [248, 176, 96], line: C.line });   // seat trim
  c.box(19, 13, 6, 6, { fill: C.iron[2], light: C.iron[0], line: C.line });            // tank
  c.vl(25, 8, 16, C.line); c.hl(23, 28, 8, C.line); c.set(28, 9, C.iron[0]);           // handlebar
  c.box(26, 15, 4, 3, { fill: [248, 232, 152], line: C.line });                        // headlight
  return c;
}
save(drawBike(), path.join(outSprites, "orre_bike.png"));

// ---------- The Outskirt Stand, inside ----------
//
// 16 by 12 tiles, all drawn: plank walls (three tiles high) with copper
// pipes along them, the bar's bottle shelves, the TV (a Poké Ball on its
// screen) and the jukebox; a yellow checkered floor; the curved wooden bar
// on the left with its stools; three green booths; the doormat.
const IN_W = 16, IN_H = 12;
const BAR = { x: 0, y: 4, w: 7 }, STOOLS = [[1, 5], [5, 5]], JUKEBOX = { x: 12, y: 3 }, TV = { x: 8, y: 2 };
const BOOTHS = [[11, 5], [11, 8], [1, 8]];   // (top-left tiles; each 4 by 2)
const MATS = [[7, 11], [8, 11]];
function drawDinerInside() {
  const c = canvas(IN_W * 16, IN_H * 16);
  seed = 31;
  // The floor.
  for (let y = 48; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const light = ((x >> 3) + (y >> 3)) % 2 === 0;
    c.set(x, y, light ? [248, 232, 160] : [232, 192, 88]);
  }
  // The walls.
  for (let x = 0; x < c.w; x += 8) {
    c.rect(x, 0, 8, 44, C.wood[1]);
    c.vl(x, 0, 43, C.wood[2]);
    c.vl(x + 1, 0, 43, C.wood[0]);
    for (let k = 0; k < 6; k++) c.set(x + 3 + Math.floor(rand() * 4), 4 + Math.floor(rand() * 38), C.wood[2]);
  }
  c.rect(0, 0, c.w, 4, C.wood[3]); c.hl(0, c.w - 1, 4, C.line);
  c.rect(0, 40, c.w, 8, C.wood[3]); c.hl(0, c.w - 1, 40, C.wood[2]); c.hl(0, c.w - 1, 47, C.line);
  c.rect(0, 48, c.w, 3, [40, 24, 16, 80]);   // (the wall's shadow on the floor)
  // Copper pipes along the wall, down the right-hand side, with a valve.
  const pipeH = (x0, x1, y) => { c.hl(x0, x1, y, C.line); c.hl(x0, x1, y + 1, C.copper[0]); c.hl(x0, x1, y + 2, C.copper[1]); c.hl(x0, x1, y + 3, C.copper[2]); c.hl(x0, x1, y + 4, C.line); };
  const pipeV = (x, y0, y1) => { c.vl(x, y0, y1, C.line); c.vl(x + 1, y0, y1, C.copper[0]); c.vl(x + 2, y0, y1, C.copper[1]); c.vl(x + 3, y0, y1, C.copper[2]); c.vl(x + 4, y0, y1, C.line); };
  pipeH(112, 247, 7); pipeV(243, 7, 47); pipeH(168, 247, 30); pipeV(170, 30, 39);
  for (const x of [140, 200, 230]) c.box(x, 6, 4, 7, { fill: C.copper[1], light: C.copper[0], line: C.line });
  c.ring(186, 22, 5, C.line); c.ring(186, 22, 4, [200, 48, 40]); c.ring(186, 22, 3, [200, 48, 40]); c.set(186, 22, C.line);
  c.vl(186, 27, 30, C.line);
  // The bar's shelves and bottles.
  for (const y of [18, 34]) {
    c.box(4, y, 100, 4, { fill: C.wood[2], light: C.wood[1], line: C.line });
    for (let x = 8; x < 100; x += 7 + Math.floor(rand() * 3)) {
      const col = [[96, 168, 88], [184, 72, 56], [232, 184, 72], [104, 136, 200]][Math.floor(rand() * 4)];
      const h = 8 + Math.floor(rand() * 4);
      c.box(x, y - h, 5, h, { fill: col, light: [255, 255, 255, 120], line: C.line });
      c.rect(x + 1, y - h - 2, 3, 2, C.line);
    }
  }
  // The TV, a Poké Ball on its screen.
  {
    const x = TV.x * 16, y = 8;
    c.box(x - 1, y, 34, 26, { fill: C.iron[2], light: C.iron[1], dark: C.iron[3], line: C.line });
    c.box(x + 3, y + 3, 26, 18, { fill: [56, 80, 120], line: C.line });
    c.disc(x + 16, y + 12, 6, [232, 72, 64]); c.rect(x + 9, y + 12, 15, 7, [248, 248, 248]);
    c.rect(x + 10, y + 12, 13, 1, C.line); c.ring(x + 16, y + 12, 6, C.line); c.disc(x + 16, y + 12, 1, [248, 248, 248]); c.ring(x + 16, y + 12, 2, C.line);
    c.rect(x + 4, y + 4, 4, 1, [200, 232, 248]);
    c.set(x + 26, y + 23, [104, 216, 104]); c.vl(x + 16, y + 26, y + 30, C.line);
  }
  // The jukebox: an arched top lit up in colours, a grille, on the floor by the wall.
  {
    const x = JUKEBOX.x * 16 + 2, y = 18, w = 28;
    c.box(x, y + 8, w, 36, { fill: C.wood[2], light: C.wood[1], dark: C.wood[3], line: C.line });
    for (let k = 0; k <= 10; k++) c.hl(x + 10 - k, x + w - 11 + k, y + 8 - Math.round(Math.sqrt(Math.max(0, 100 - (10 - k) * (10 - k))) * 0.8), [0, 0, 0, 0]);
    for (let yy = y; yy < y + 12; yy++) {
      const half = Math.round(Math.sqrt(Math.max(0, 196 - (y + 12 - yy) * (y + 12 - yy))));
      c.hl(x + 14 - half, x + 13 + half, yy, [[232, 72, 64], [248, 168, 64], [248, 232, 104], [104, 200, 104], [104, 152, 232]][Math.floor((yy - y) / 2.4)]);
      c.set(x + 14 - half - 1, yy, C.line); c.set(x + 13 + half + 1, yy, C.line);
    }
    c.hl(x + 7, x + 20, y - 1, C.line);
    c.box(x + 5, y + 14, 18, 10, { fill: C.glass[2], light: C.glass[1], line: C.line });
    for (let k = 0; k < 4; k++) c.hl(x + 7, x + 20, y + 16 + k * 2, C.copper[0]);
    c.box(x + 4, y + 27, 20, 12, { fill: C.copper[2], line: C.line });
    for (let xx = x + 6; xx < x + 23; xx += 3) c.vl(xx, y + 28, y + 37, C.copper[0]);
    c.rect(x, y + 44, w, 2, C.shadow);
  }
  // The bar: its top along the back, curving round at the end up to the wall.
  {
    const x1 = BAR.w * 16, y = BAR.y * 16;
    c.rect(BAR.x, y - 2, x1 - 4, 10, C.wood[0]);
    c.hl(BAR.x, x1 - 4, y - 2, C.line); c.hl(BAR.x, x1 - 4, y - 1, [248, 216, 160]);
    c.rect(BAR.x, y + 8, x1 - 4, 8, C.wood[2]);
    for (let xx = 6; xx < x1; xx += 12) c.vl(xx, y + 9, y + 15, C.wood[3]);
    c.hl(BAR.x, x1 - 4, y + 8, C.wood[3]); c.hl(BAR.x, x1 + 10, y + 16, C.line);
    // (the curve)
    const cx = x1 - 4, cy = y - 2;
    for (let yy = 48; yy < y + 17; yy++) for (let xx = cx; xx < x1 + 12; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (yy < cy) { if (dx < 14) c.set(xx, yy, dx < 10 ? C.wood[0] : C.wood[2]); continue; }
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 10) c.set(xx, yy, C.wood[0]);
      else if (r < 14 && dy < 10) c.set(xx, yy, C.wood[2]);
      else if (r < 15 && dy < 18) c.set(xx, yy + (dy >= 10 ? 0 : 0), r < 14 ? C.wood[2] : C.line);
    }
    c.vl(cx + 14, 48, cy, C.line); c.vl(cx + 10, 48, cy, C.wood[3]);
    c.rect(BAR.x, y + 17, x1 + 10, 3, C.shadow);
  }
  // The stools: a round red seat on a copper post.
  for (const [tx, ty] of STOOLS) {
    const x = tx * 16 + 8, y = ty * 16;
    c.rect(x - 5, y + 13, 11, 2, C.shadow);
    c.box(x - 1, y + 6, 3, 8, { fill: C.copper[1], light: C.copper[0], line: C.line });
    c.box(x - 4, y + 12, 9, 3, { fill: C.copper[2], light: C.copper[1], line: C.line });
    c.box(x - 6, y + 1, 13, 6, { fill: [216, 64, 56], light: [248, 120, 104], dark: [160, 40, 40], line: C.line });
  }
  // The booths: a green bench each side of a table.
  for (const [tx, ty] of BOOTHS) {
    const x = tx * 16, y = ty * 16;
    c.rect(x + 1, y + 28, 62, 4, C.shadow);
    for (const side of [0, 1]) {
      const bx = side ? x + 48 : x, back = side ? bx + 10 : bx + 1;
      c.box(bx + 1, y + 14, 14, 13, { fill: C.green[1], light: C.green[0], dark: C.green[2], line: C.line });
      c.box(back, y - 4, 5, 31, { fill: C.green[2], light: C.green[1], dark: C.green[3], line: C.line });
      c.hl(bx + 2, bx + 13, y + 22, C.green[2]);
    }
    c.box(x + 18, y + 6, 28, 13, { fill: C.cream[1], light: C.cream[0], dark: C.cream[2], line: C.line });
    c.box(x + 20, y + 18, 24, 4, { fill: C.wood[2], light: C.wood[1], line: C.line });
    c.box(x + 29, y + 21, 6, 8, { fill: C.iron[2], light: C.iron[1], line: C.line });
    // (plates and cups)
    c.disc(x + 25, y + 11, 3, [248, 248, 248]); c.ring(x + 25, y + 11, 3, C.iron[1]);
    c.box(x + 36, y + 8, 4, 5, { fill: [232, 184, 72], light: [255, 255, 255, 160], line: C.line });
  }
  // The doormat.
  for (const [tx, ty] of MATS) c.box(tx * 16 + 1, ty * 16 + 3, 14, 12, { fill: [184, 72, 56], light: [216, 112, 88], dark: [136, 48, 40], line: C.line });
  return c;
}
const inside = drawDinerInside();

// ---------- The maps' data ----------

const frames = (sprite) => readPng(path.join(outSprites, sprite + ".png")).width / 16;
const person = (id, localId, x, y, sprite, movement, script, text, extra) => Object.assign({
  id, x, y, movement, rangeX: 0, rangeY: 0, script, flag: null, text, localId: "LOCALID_ORRE_" + localId,
  sprite, width: 16, height: 32, frames: frames(sprite) }, extra || {});

// Outside. (People the story puts there are left out by ui/game.js's
// visible() until it's their scene: Folly, Trudly and Willie; the truck
// until it's gone, the bike once Wes has parked it.)
const OUT = {
  name: "OutskirtStand", title: "Outskirt Stand", width: W, height: H, type: "route", music: "mus_sevii_route",
  region: "orre", battleScene: "sand", cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  collision: [], elevation: [], behavior: [], encounter: [],
  connections: [{ map: null, mapConst: "MAP_PHENAC_CITY", direction: "up", offset: 0 },
    { map: "OrreAirStrip", mapConst: "MAP_ORRE_AIR_STRIP", direction: "down", offset: 0 }],
  warps: [{ x: DOOR.x, y: DOOR.y, map: "OutskirtStand_Diner", warp: 0 }],
  signs: [], triggers: [], hidden: [],
  patches: { truck: { x: TRUCK.x, y: TRUCK.y, w: TRUCK.w, h: 1, top: false,
    collision: Array.from({ length: TRUCK.w }, (_, i) => [TRUCK.x + i, TRUCK.y, 1]) } },
  people: [
    person(0, "TRUCK", TRUCK.x + 1, TRUCK.y, "orre_truck", "face_left", "OutskirtStand_EventScript_Truck",
      ["It's a beat-up old truck.\nThere's a big sack in the back…"], { width: 64, height: 48, frames: 3, offsetX: -16, inanimate: true }),
    person(1, "BIKE", 17, 13, "orre_bike", "face_right", "OutskirtStand_EventScript_Bike",
      ["Your bike. Its tank is running on\nfumes after the ride from the hideout."], { width: 32, height: 32, frames: 1, offsetX: -8, inanimate: true }),
    person(2, "FOLLY", DOOR.x, DOOR.y + 1, "man", "face_down", "OutskirtStand_EventScript_Folly", null),
    person(3, "TRUDLY", DOOR.x, DOOR.y + 1, "fat_man", "face_down", "OutskirtStand_EventScript_Trudly", null),
    person(4, "WILLIE", DOOR.x, DOOR.y + 1, "orre_willie", "face_down", "OutskirtStand_EventScript_Willie", null)
  ],
  wild: null
};
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i], x = i % W, y = Math.floor(i / W);
  const inDiner = x >= DINER.x && x < DINER.x + DINER.w && y >= DINER.y && y < DINER.y + DINER.h;
  OUT.collision.push(inDiner ? 1 : (b >> 10) & 3);
  OUT.elevation.push(b >> 12);
  OUT.behavior.push(x === DOOR.x && y === DOOR.y ? 0x69 : E.frBehavior(E.metatile(general, mauville, b & 0x3ff).behavior));
  OUT.encounter.push(0);
}
writePng(path.join(outMaps, "OutskirtStand.png"), W * 16, H * 16, outside.below);
writePng(path.join(outMaps, "OutskirtStand-top.png"), W * 16, H * 16, outside.above);
{
  const bb = fs.readFileSync(path.join(EM, R111.border_filepath));
  const border = [0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2));
  writePng(path.join(outMaps, "OutskirtStand-border.png"), 32, 32, E.render(border, 2, 2, general, mauville, true).below);
  const anim = E.animCells(blocks, W, H, general, mauville);
  if (anim.pics.length) {
    E.writeAnimSheet(path.join(outMaps, "OutskirtStand-anim.png"), anim.pics);
    OUT.anim = { cells: anim.cells, anims: general.anims.map((a) => a.name) };
  }
  // (The truck's patch is only its footprint's collision: nothing to draw.)
  writePng(path.join(outMaps, "OutskirtStand-patch-truck.png"), TRUCK.w * 16, 16, new Uint8ClampedArray(TRUCK.w * 16 * 16 * 4));
}

// Inside.
const IN = {
  name: "OutskirtStand_Diner", title: "Outskirt Stand", width: IN_W, height: IN_H, type: "indoor", music: "mus_game_corner",
  region: "orre", cycling: false, showName: false, top: false, borderWidth: 2, borderHeight: 2,
  collision: [], elevation: [], behavior: [], encounter: [],
  connections: [],
  warps: MATS.map(([x, y]) => ({ x, y, map: "OutskirtStand", warp: 0 })),
  signs: [
    ...[0, 1].map((k) => ({ x: TV.x + k, y: TV.y, script: "OutskirtStand_Diner_EventScript_TV", text: null })),
    ...[0, 1].map((k) => ({ x: JUKEBOX.x + k, y: JUKEBOX.y, script: "OutskirtStand_Diner_EventScript_Jukebox", text: null }))
  ],
  triggers: [], hidden: [],
  people: [
    person(0, "BARTENDER", 3, 3, "chef", "face_down", "OutskirtStand_Diner_EventScript_Bartender", null),
    person(1, "DINER_WILLIE", 14, 6, "orre_willie", "face_left", "OutskirtStand_Diner_EventScript_Willie", null),
    person(2, "TRAVELLER_1", 11, 6, "worker_m", "face_right", "OutskirtStand_Diner_EventScript_Traveller1",
      ["Eight hours across the desert, and\nthis is the first place with a roof.", "Coffee's not bad, either."]),
    person(3, "TRAVELLER_2", 11, 9, "hiker", "face_right", "OutskirtStand_Diner_EventScript_Traveller2",
      ["Phenac City's up the road, north.\nIt's a real oasis, that town.", "Fountains everywhere. You wouldn't\nthink it, out here."]),
    person(4, "TRAVELLER_3", 14, 9, "woman_2", "face_left", "OutskirtStand_Diner_EventScript_Traveller3",
      ["Did you see the two men who just\nleft? They wolfed down their food…", "They were in an awful hurry to get\nback to that sack in their truck."]),
    person(5, "TRAVELLER_4", 4, 9, "old_man_1", "face_left", "OutskirtStand_Diner_EventScript_Traveller4",
      ["Orre's a dry land, young fella.\nNo wild Pokémon to speak of round here.", "A Trainer has to bring his partners\nwith him."])
  ],
  wild: null
};
const blockedInside = new Set();
for (let y = 0; y < 3; y++) for (let x = 0; x < IN_W; x++) blockedInside.add(x + "," + y);
for (let x = BAR.x; x <= BAR.w; x++) blockedInside.add(x + "," + BAR.y);
blockedInside.add(BAR.w + "," + (BAR.y - 1));
for (const [x, y] of STOOLS) blockedInside.add(x + "," + y);
for (let k = 0; k < 2; k++) blockedInside.add((JUKEBOX.x + k) + "," + JUKEBOX.y);
for (const [bx, by] of BOOTHS) for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) blockedInside.add((bx + x) + "," + (by + y));
for (let y = 0; y < IN_H; y++) for (let x = 0; x < IN_W; x++) {
  IN.collision.push(blockedInside.has(x + "," + y) ? 1 : 0);
  IN.elevation.push(3);
  // (Across the bar you talk to the bartender: FireRed's MB_COUNTER.)
  IN.behavior.push(y === BAR.y && x >= BAR.x && x < BAR.w ? 0x80 : 0);
  IN.encounter.push(0);
}
save(inside, path.join(outMaps, "OutskirtStand_Diner.png"));
{
  const black = canvas(32, 32);
  black.rect(0, 0, 32, 32, [0, 0, 0]);
  save(black, path.join(outMaps, "OutskirtStand_Diner-border.png"));
}

// ---------- The Orre Air Strip (this game's own) ----------
//
// Where Prof. Oak's plane sets you down in Orre: south of the Outskirt Stand, the desert going on from it (its top
// row is Route 111's next, so the cliffs carry on), fenced off below that, the gate in the fence on the road north.
// Inside the fence, drawn here: the runway across the middle (asphalt, its edge lines and centre dashes, the
// threshold stripes and numbers at each end), the concrete apron before the terminal, the terminal with its sign,
// the control tower, the little high-winged plane you came in on, a windsock and fuel drums.
const AW = W, AH = 24, AOY = OY + H;
const ablocks = [];
for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) ablocks.push(y === 0 ? r111.readUInt16LE(((AOY + y) * R111.width + OX + x) * 2) : SAND);
for (let x = 0; x < AW; x++) if (GRASSY.has(ablocks[x] & 0x3ff) || x < 12) ablocks[x] = SAND;   // (and the trees at its west end)
const GATE = { x: 20, w: 4 }, RUNWAY = { y: 15, h: 5 }, APRON = { x: 13, y: 8, w: 12, h: 7 };
const TERMINAL = { x: 5, y: 4, w: 7, h: 4 }, TOWER = { x: 1, y: 5, w: 3, h: 3 }, PLANE = { x: 15, y: 10, w: 6, h: 2 };
const SOCK = { x: 32, y: 5 }, DRUMS = { x: 27, y: 9, w: 2 }, ASIGN = { x: 18, y: 3 };
// A Pokémon Center, by the apron: Emerald's (its General tileset's building, 4 by 4), laid out block for block as
// Mauville City's (its door at the foot of the second column).
const PC = { x: 26, y: 3, w: 4, h: 4 }, PC_DOOR = { x: PC.x + 1, y: PC.y + 3 };
{
  const L = layouts.LAYOUT_MAUVILLE_CITY, mv = fs.readFileSync(path.join(EM, L.blockdata_filepath));
  for (let y = 0; y < PC.h; y++) for (let x = 0; x < PC.w; x++) ablocks[(PC.y + y) * AW + PC.x + x] = mv.readUInt16LE(((2 + y) * L.width + 21 + x) * 2);
}
const airstrip = E.render(ablocks, AW, AH, general, mauville, false);
// (Mauville's grass round the building's corners: sand here, from the tile beside it.)
for (let y = PC.y * 16; y < (PC.y + PC.h) * 16; y++) for (let x = PC.x * 16; x < (PC.x + PC.w) * 16; x++) {
  const o = (x + y * AW * 16) * 4, green = (img) => img[o + 3] && img[o + 1] > img[o] + 24 && img[o + 1] > img[o + 2];
  if (green(airstrip.above)) airstrip.above[o + 3] = 0;
  if (!green(airstrip.below)) continue;
  const so = ((PC.x - 1) * 16 + (x % 16) + y * AW * 16) * 4;
  for (let k = 0; k < 4; k++) airstrip.below[o + k] = airstrip.below[so + k];
}
// (Paste a drawing over the map at pixel (x0, y0): rows above `split` over people (on top), the rest under.)
function paste(pic, x0, y0, split) {
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const p = pic.get(x, y);
    if (!p[3] || x0 + x < 0 || y0 + y < 0 || x0 + x >= AW * 16 || y0 + y >= AH * 16) continue;
    const o = ((y0 + y) * AW * 16 + x0 + x) * 4, img = y < split && p[3] === 255 ? airstrip.above : airstrip.below;
    const a = p[3] / 255;
    for (let k = 0; k < 3; k++) img[o + k] = img[o + 3] ? img[o + k] * (1 - a) + p[k] * a : p[k];
    img[o + 3] = Math.max(img[o + 3], p[3]);
  }
  airstrip.anyAbove = true;
}
const ASPHALT = [[112, 112, 120], [88, 88, 96], [72, 72, 80]], CONCRETE = [[200, 200, 192], [176, 176, 168], [144, 144, 136]], WHITE = [248, 248, 240];
function drawGround() {
  const c = canvas(AW * 16, AH * 16);
  seed = 23;
  // The apron, its slabs' seams.
  const ax = APRON.x * 16, ay = APRON.y * 16, aw = APRON.w * 16, ah = APRON.h * 16;
  c.rect(ax, ay, aw, ah, CONCRETE[1]);
  for (let k = 0; k < 260; k++) c.set(ax + Math.floor(rand() * aw), ay + Math.floor(rand() * ah), rand() < 0.5 ? CONCRETE[0] : CONCRETE[2]);
  for (let x = ax; x < ax + aw; x += 32) c.vl(x, ay, ay + ah - 1, CONCRETE[2]);
  for (let y = ay; y < ay + ah; y += 32) c.hl(ax, ax + aw - 1, y, CONCRETE[2]);
  c.frame(ax, ay, aw, ah, CONCRETE[2]);
  // A taxiway from the terminal's door to the apron.
  c.rect(TERMINAL.x * 16 + 40, (TERMINAL.y + TERMINAL.h) * 16, ax - TERMINAL.x * 16 - 40, 32, CONCRETE[1]);
  c.hl(TERMINAL.x * 16 + 40, ax, (TERMINAL.y + TERMINAL.h) * 16 + 31, CONCRETE[2]);
  // The runway.
  const ry = RUNWAY.y * 16, rh = RUNWAY.h * 16, rx = 16, rw = (AW - 2) * 16;
  c.rect(rx, ry, rw, rh, ASPHALT[1]);
  for (let k = 0; k < 900; k++) c.set(rx + Math.floor(rand() * rw), ry + Math.floor(rand() * rh), rand() < 0.5 ? ASPHALT[0] : ASPHALT[2]);
  c.rect(rx, ry + 3, rw, 2, WHITE); c.rect(rx, ry + rh - 5, rw, 2, WHITE);
  for (let x = rx + 48; x < rx + rw - 48; x += 28) c.rect(x, ry + rh / 2 - 1, 16, 2, WHITE);
  for (const [x0, flip] of [[rx + 6, false], [rx + rw - 36, true]]) {
    for (let k = 0; k < 6; k++) c.rect(x0 + (flip ? 24 : 0), ry + 10 + k * 10, 6, 6, WHITE);
    const num = flip ? "27" : "09";
    for (let i = 0; i < 2; i++) for (let j = 0; j < 15; j++) if (FONT[num[i]][j] === "1") c.rect(x0 + (flip ? 2 : 12) + i * 8 + (j % 3) * 2, ry + 30 + Math.floor(j / 3) * 2, 2, 2, WHITE);
  }
  c.frame(rx, ry, rw, rh, ASPHALT[2]);
  return c;
}
paste(drawGround(), 0, 0, -1);
// The fence: a chain-link fence along row 1 (the gate left open), down both sides and along the bottom.
function drawFence() {
  const c = canvas(AW * 16, AH * 16), STEEL = [[216, 216, 224], [160, 160, 176], [104, 104, 120]];
  const mesh = (x0, y0, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 4 === 0 || (x - y + 64) % 4 === 0) c.set(x0 + x, y0 + y, [176, 176, 192, 200]);
  };
  // Along the top: posts every tile, a rail, the mesh; the gate's posts either side of it.
  const fy = 16 + 2;
  for (let x = 0; x < AW * 16; x++) {
    const inGate = x >= GATE.x * 16 && x < (GATE.x + GATE.w) * 16;
    if (inGate) continue;
    if (x % 16 === 0) { c.rect(x, fy - 2, 3, 16, STEEL[1]); c.vl(x, fy - 2, fy + 13, STEEL[0]); c.vl(x + 2, fy - 2, fy + 13, STEEL[2]); }
  }
  for (const [a, b] of [[0, GATE.x * 16], [(GATE.x + GATE.w) * 16, AW * 16]]) { mesh(a, fy, b - a, 12); c.hl(a, b - 1, fy, STEEL[2]); c.hl(a, b - 1, fy - 1, STEEL[0]); }
  for (const gx of [GATE.x * 16 - 4, (GATE.x + GATE.w) * 16]) c.box(gx, fy - 6, 4, 22, { fill: STEEL[1], light: STEEL[0], dark: STEEL[2] });
  // Down the sides and along the bottom.
  for (const x0 of [4, AW * 16 - 8]) { c.rect(x0, 32, 3, AH * 16 - 32, STEEL[1]); for (let y = 32; y < AH * 16; y += 16) c.rect(x0 - 1, y, 5, 3, STEEL[2]); }
  const by = AH * 16 - 14;
  mesh(4, by, AW * 16 - 8, 12); c.hl(4, AW * 16 - 5, by, STEEL[2]);
  for (let x = 4; x < AW * 16; x += 16) c.rect(x, by - 2, 3, 14, STEEL[1]);
  return c;
}
paste(drawFence(), 0, 0, -1);
// The terminal: a low building, a flat roof with a rail, big windows, glass doors, its sign along the top.
function drawTerminal() {
  const w = TERMINAL.w * 16, h = TERMINAL.h * 16 + 16, c = canvas(w, h);
  seed = 31;
  c.rect(2, h - 6, w - 2, 6, C.shadow);
  c.box(0, 4, w, 14, { fill: C.tin[1], light: C.tin[0], dark: C.tin[2], line: C.line });
  for (let x = 4; x < w - 4; x += 6) c.vl(x, 0, 4, C.iron[1]);
  c.hl(2, w - 3, 0, C.iron[0]);
  c.box(0, 17, w, h - 21, { fill: C.cream[1], light: C.cream[0], dark: C.cream[2], line: C.line });
  for (let k = 0; k < 120; k++) c.set(2 + Math.floor(rand() * (w - 4)), 19 + Math.floor(rand() * (h - 26)), C.cream[2]);
  c.box(10, 21, w - 20, 11, { fill: [48, 88, 168], light: [96, 136, 216], dark: [32, 56, 120], line: C.line });
  text(c, "ORRE AIR STRIP", Math.floor((w - 56) / 2), 24, WHITE);
  for (const x of [6, 26, w - 46, w - 26]) {
    c.box(x, 38, 18, 18, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.iron[3] });
    c.hl(x + 2, x + 7, 40, [248, 248, 248]);
  }
  const dx = Math.floor(w / 2) - 12;
  c.box(dx, 36, 24, h - 40, { fill: C.glass[2], light: C.glass[1], dark: [40, 64, 104], line: C.iron[3] });
  c.vl(dx + 12, 37, h - 6, C.iron[3]);
  c.hl(2, w - 3, h - 5, C.cream[2]);
  return c;
}
paste(drawTerminal(), TERMINAL.x * 16, TERMINAL.y * 16 - 16, 16 + 16 * (TERMINAL.h - 1));
// The control tower: a concrete shaft, the glass cab and its roof, an aerial on top.
function drawTower() {
  const w = TOWER.w * 16, h = TOWER.h * 16 + 64, c = canvas(w, h);
  c.rect(4, h - 6, w - 4, 6, C.shadow);
  c.box(12, 40, w - 24, h - 44, { fill: CONCRETE[1], light: CONCRETE[0], dark: CONCRETE[2], line: C.line });
  for (let y = 52; y < h - 8; y += 12) c.hl(13, w - 14, y, CONCRETE[2]);
  c.box(14, h - 22, w - 28, 18, { fill: C.wood[2], light: C.wood[1], dark: C.wood[3], line: C.line });
  c.box(2, 18, w - 4, 24, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.iron[3] });
  for (let x = 10; x < w - 6; x += 9) c.vl(x, 19, 40, C.iron[2]);
  c.hl(4, 12, 21, [248, 248, 248]);
  c.box(0, 12, w, 7, { fill: C.iron[1], light: C.iron[0], dark: C.iron[2], line: C.line });
  c.box(0, 41, w, 5, { fill: C.iron[1], light: C.iron[0], dark: C.iron[2], line: C.line });
  c.vl(w / 2, 0, 12, C.iron[3]); c.hl(w / 2 - 4, w / 2 + 4, 3, C.iron[3]); c.set(w / 2, 0, [232, 56, 40]);
  return c;
}
paste(drawTower(), TOWER.x * 16, TOWER.y * 16 - 64, 64 + 16 * (TOWER.h - 1));
// The plane: a little high-winged propeller plane, nose to the left, white with a blue stripe, its door open.
function drawPlane() {
  const w = PLANE.w * 16, h = PLANE.h * 16 + 32, c = canvas(w, h), BLUE = [[96, 152, 232], [56, 104, 200], [32, 64, 144]], RED = [[248, 104, 88], [216, 56, 48], [152, 32, 32]];
  c.rect(6, h - 7, w - 12, 6, C.shadow);
  // The tail, the fin and the tailplane.
  c.box(w - 22, 6, 14, 26, { fill: WHITE, light: [255, 255, 255], dark: [200, 200, 208], line: C.line });
  c.rect(w - 20, 8, 10, 4, RED[1]);
  // The fuselage, tapering to the tail.
  for (let y = 20; y <= 44; y++) {
    const x1 = w - 10 - Math.max(0, (y - 32)) * 2;
    c.hl(14, x1, y, y < 24 ? [255, 255, 255] : y < 38 ? WHITE : [208, 208, 216]);
    c.set(x1, y, C.line);
  }
  c.hl(14, w - 10, 19, C.line); c.hl(14, w - 34, 45, C.line);
  c.rect(14, 33, w - 28, 3, BLUE[1]); c.hl(14, w - 26, 33, BLUE[0]);
  // The windows and the open door.
  for (const x of [26, 40]) c.box(x, 23, 11, 8, { fill: C.glass[1], light: C.glass[0], dark: C.glass[2], line: C.iron[3] });
  c.box(54, 22, 12, 21, { fill: [64, 64, 80], line: C.line });
  c.rect(55, 23, 10, 3, [96, 96, 112]);
  // The wing over the top, its strut.
  c.box(16, 12, 60, 8, { fill: WHITE, light: [255, 255, 255], dark: [200, 200, 208], line: C.line });
  c.rect(16, 16, 60, 2, BLUE[1]);
  c.vl(44, 20, 30, C.iron[2]);
  // The nose, the spinner and the propeller.
  c.box(6, 22, 12, 20, { fill: RED[1], light: RED[0], dark: RED[2], line: C.line });
  c.disc(6, 32, 3, C.iron[1]); c.ring(6, 32, 3, C.line);
  c.box(4, 18, 3, 28, { fill: C.iron[2], light: C.iron[1], line: C.line });
  // The wheels.
  for (const x of [24, 62]) { c.disc(x, h - 9, 4, C.iron[3]); c.disc(x, h - 9, 1, C.iron[0]); c.vl(x, 44, h - 13, C.iron[2]); }
  return c;
}
paste(drawPlane(), PLANE.x * 16, PLANE.y * 16 - 32, 32 + 16 * (PLANE.h - 1));
// The windsock on its pole; the fuel drums; the sign by the gate.
{
  const c = canvas(32, 48);
  c.rect(14, 42, 8, 4, C.shadow);
  c.box(15, 4, 3, 42, { fill: C.iron[1], light: C.iron[0], dark: C.iron[2] });
  for (let k = 0; k < 4; k++) c.box(18 + k * 3, 4 + k, 4, 9 - 2 * k, { fill: k % 2 ? WHITE : [248, 128, 48], line: C.line });
  paste(c, SOCK.x * 16 - 8, SOCK.y * 16 - 32, 32);
}
{
  const c = canvas(DRUMS.w * 16, 32);
  for (let k = 0; k < DRUMS.w; k++) {
    const x = k * 16 + 2;
    c.rect(x + 1, 28, 13, 3, C.shadow);
    c.box(x, 6, 12, 22, { fill: [200, 56, 48], light: [232, 104, 88], dark: [144, 32, 32], line: C.line });
    c.hl(x + 1, x + 10, 12, [144, 32, 32]); c.hl(x + 1, x + 10, 21, [144, 32, 32]);
    c.rect(x + 2, 4, 8, 3, C.iron[1]); c.frame(x + 2, 4, 8, 3, C.line);
  }
  paste(c, DRUMS.x * 16, DRUMS.y * 16 - 16, 16);
}
{
  const c = canvas(16, 32);
  c.rect(6, 18, 4, 12, C.wood[2]); c.vl(6, 18, 29, C.wood[3]);
  c.box(0, 6, 16, 13, { fill: C.wood[1], light: C.wood[0], dark: C.wood[2], line: C.line });
  c.rect(3, 9, 10, 1, C.wood[3]); c.rect(3, 12, 10, 1, C.wood[3]); c.rect(3, 15, 7, 1, C.wood[3]);
  paste(c, ASIGN.x * 16, ASIGN.y * 16 - 16, 16);
}
const AIR = {
  name: "OrreAirStrip", title: "Orre Air Strip", width: AW, height: AH, type: "route", music: "mus_sevii_route",
  region: "orre", battleScene: "sand", cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  collision: [], elevation: [], behavior: [], encounter: [],
  connections: [{ map: "OutskirtStand", mapConst: "MAP_OUTSKIRT_STAND", direction: "up", offset: 0 }],
  warps: [{ x: PC_DOOR.x, y: PC_DOOR.y, map: "OrreAirStrip_PokemonCenter_1F", warp: 0 }], triggers: [], hidden: [],
  signs: [{ x: ASIGN.x, y: ASIGN.y, script: "OrreAirStrip_EventScript_Sign", text: ["ORRE AIR STRIP", "North: the Outskirt Stand"] },
    ...[0, 1, 2].map((k) => ({ x: TERMINAL.x + 2 + k, y: TERMINAL.y + TERMINAL.h - 1, script: "OrreAirStrip_EventScript_Terminal",
      text: ["The terminal's doors are locked.\nA notice: \"No flights today.\""] }))],
  people: [
    person(0, "PILOT", PLANE.x + 4, PLANE.y + PLANE.h, "worker_m", "face_left", "OrreAirStrip_EventScript_Pilot",
      ["Here we are: the Orre Air Strip.\nThe road north goes to the Outskirt Stand."]),
    person(1, "MECHANIC", DRUMS.x - 1, DRUMS.y, "hiker", "face_right", "OrreAirStrip_EventScript_Mechanic",
      ["Not many planes come out this way.\nThe sand gets into everything.", "You're a long way from home, kid.\nWatch yourself out in the desert."])
  ],
  wild: null
};
{
  const solid = new Set(), fill = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) solid.add(x + "," + y); };
  for (let x = 0; x < AW; x++) if (x < GATE.x || x >= GATE.x + GATE.w) solid.add(x + ",1");
  fill(0, 1, 1, AH); fill(AW - 1, 1, 1, AH); fill(0, AH - 1, AW, 1);
  fill(TERMINAL.x, TERMINAL.y, TERMINAL.w, TERMINAL.h); fill(TOWER.x, TOWER.y, TOWER.w, TOWER.h); fill(PLANE.x, PLANE.y, PLANE.w, PLANE.h);
  fill(SOCK.x, SOCK.y, 1, 1); fill(DRUMS.x, DRUMS.y, DRUMS.w, 1); fill(ASIGN.x, ASIGN.y, 1, 1); fill(PC.x, PC.y, PC.w, PC.h);
  solid.delete(PC_DOOR.x + "," + PC_DOOR.y);
  for (let i = 0; i < ablocks.length; i++) {
    const b = ablocks[i], x = i % AW, y = Math.floor(i / AW);
    AIR.collision.push(solid.has(x + "," + y) ? 1 : (b >> 10) & 3);
    AIR.elevation.push(b >> 12);
    AIR.behavior.push(x === PC_DOOR.x && y === PC_DOOR.y ? 0x69 : E.frBehavior(E.metatile(general, mauville, b & 0x3ff).behavior));
    AIR.encounter.push(0);
  }
  writePng(path.join(outMaps, "OrreAirStrip.png"), AW * 16, AH * 16, airstrip.below);
  writePng(path.join(outMaps, "OrreAirStrip-top.png"), AW * 16, AH * 16, airstrip.above);
  const bb = fs.readFileSync(path.join(EM, R111.border_filepath));
  writePng(path.join(outMaps, "OrreAirStrip-border.png"), 32, 32, E.render([0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2)), 2, 2, general, mauville, true).below);
}

// ---------- Team Snagem's hideout, outside ----------
//
// As in Colosseum (the intro, and its return to the hideout): at the foot of Eclo Canyon's walls of tan rock, a
// narrow courtyard walled in by the hideout's two weathered concrete wings, heavy rusty pipes snaking over them; at its
// end the hideout's front, rust-streaked concrete blocks pierced with round holes either side of the gate, Team
// Snagem's emblem on it (two red arrows, interlocked), machinery stacked above and yellow-and-black hazard chains
// strung across, the great round dish of a machine up on the right. Dusty dark ground, scrap and a broken girder;
// outside the courtyard, the canyon floor, yellow drums and crates, and the track south out of the canyon. All drawn
// here.
const HW = 26, HH = 20;
const hblocks = new Array(HW * HH).fill(SAND);
const hideout = E.render(hblocks, HW, HH, general, mauville, false);
const LWING = { x: 2, y: 2, w: 6, h: 10 }, RWING = { x: 18, y: 2, w: 6, h: 10 }, FRONT = { x: 8, y: 2, w: 10, h: 4 };
const HDOOR = { x: 12, w: 2 }, YARD = { x: 8, y: 6, w: 10, h: 6 }, ROAD = { x: 10, w: 6 };
const GIRDER = { x: 9, y: 9 }, HDRUMS = [[3, 14], [4, 14], [21, 15]], CRATES = [[22, 13], [23, 13], [22, 14]], HSIGN = { x: 9, y: 16 };
// The canyon's rock: down both sides, across the top, and the bottom row but for the track out.
const rock = new Set();
for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
  if (y < 2 || x < 2 || x >= HW - 2 || (y === HH - 1 && (x < ROAD.x || x >= ROAD.x + ROAD.w))) rock.add(x + "," + y);
}
const isRock = (x, y) => x < 0 || y < 0 || x >= HW || y >= HH || rock.has(x + "," + y);
const inBox = (b, x, y) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
function pasteOn(img, W0, H0, pic, x0, y0, split) {
  for (let y = 0; y < pic.h; y++) for (let x = 0; x < pic.w; x++) {
    const p = pic.get(x, y);
    if (!p[3] || x0 + x < 0 || y0 + y < 0 || x0 + x >= W0 * 16 || y0 + y >= H0 * 16) continue;
    const o = ((y0 + y) * W0 * 16 + x0 + x) * 4, dst = y < split && p[3] === 255 ? img.above : img.below;
    const a = p[3] / 255;
    for (let k = 0; k < 3; k++) dst[o + k] = dst[o + 3] ? dst[o + k] * (1 - a) + p[k] * a : p[k];
    dst[o + 3] = Math.max(dst[o + 3], p[3]);
  }
  img.anyAbove = true;
}
const ROCK = [[208, 168, 112], [176, 136, 88], [144, 104, 64], [112, 80, 48], [72, 52, 36]];
const CONC = [[184, 184, 168], [152, 152, 136], [120, 120, 112], [88, 88, 88], [56, 56, 64]];
const RUST = [[200, 136, 88], [160, 96, 56], [112, 64, 40]], PIPE = [[208, 200, 176], [168, 160, 136], [128, 120, 104], [80, 72, 64]];
const HRED = [[248, 88, 72], [208, 40, 40], [144, 24, 24]], HAZARD = [[248, 208, 48], [40, 40, 40]];
const DIRT = [[176, 160, 112], [144, 128, 88], [120, 104, 72], [96, 80, 56]], FLOOR = [[216, 184, 128], [200, 168, 112], [176, 144, 96]];
// Weathering: speckles and rust streaks running down from a row.
function weather(c, x0, y0, w, h, cols, n) { for (let k = 0; k < n; k++) c.set(x0 + Math.floor(rand() * w), y0 + Math.floor(rand() * h), cols[Math.floor(rand() * cols.length)]); }
function streaks(c, x0, y0, w, h, n) {
  for (let k = 0; k < n; k++) {
    const x = x0 + Math.floor(rand() * w), len = 4 + Math.floor(rand() * h * 0.6);
    for (let y = 0; y < len && y < h; y++) if (rand() < 0.85) c.set(x, y0 + y, [RUST[1][0], RUST[1][1], RUST[1][2], 150 - y * 4]);
  }
}
function drawGroundAndRock() {
  const c = canvas(HW * 16, HH * 16);
  seed = 41;
  // The canyon floor, then the courtyard's darker dust and the track out.
  c.rect(0, 0, HW * 16, HH * 16, FLOOR[1]);
  weather(c, 0, 0, HW * 16, HH * 16, [FLOOR[0], FLOOR[2], DIRT[1]], 1400);
  c.rect(ROAD.x * 16, (YARD.y + YARD.h) * 16, ROAD.w * 16, (HH - YARD.y - YARD.h) * 16, DIRT[0]);
  weather(c, ROAD.x * 16, (YARD.y + YARD.h) * 16, ROAD.w * 16, (HH - YARD.y - YARD.h) * 16, [FLOOR[2], DIRT[1]], 300);
  c.rect(YARD.x * 16, YARD.y * 16, YARD.w * 16, YARD.h * 16, DIRT[1]);
  weather(c, YARD.x * 16, YARD.y * 16, YARD.w * 16, YARD.h * 16, [DIRT[0], DIRT[2], DIRT[3]], 700);
  // (The wings' shade over the courtyard.)
  c.rect(YARD.x * 16, YARD.y * 16, 10, YARD.h * 16, [24, 16, 8, 70]); c.rect((YARD.x + YARD.w) * 16 - 6, YARD.y * 16, 6, YARD.h * 16, [24, 16, 8, 50]);
  c.rect(YARD.x * 16, YARD.y * 16, YARD.w * 16, 8, [24, 16, 8, 80]);
  for (let k = 0; k < 30; k++) { const x = YARD.x * 16 + Math.floor(rand() * YARD.w * 16), y = YARD.y * 16 + Math.floor(rand() * YARD.h * 16); c.rect(x, y, 2, 2, DIRT[3]); c.set(x, y, DIRT[0]); }
  for (let k = 0; k < 40; k++) { const x = Math.floor(rand() * HW * 16), y = (YARD.y + YARD.h) * 16 + Math.floor(rand() * (HH - YARD.y - YARD.h) * 16); c.rect(x, y, 2, 2, FLOOR[2]); c.set(x, y, FLOOR[0]); }
  // The rock: the canyon's broken top, in blotches of light and shade (value noise), cracked; where it drops to open
  // ground, its cliff: a lit lip, then the face, darker and streaked, a shadow at its foot.
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const smooth = (x, y, s) => {
    const gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(gx, gy), b = hash(gx + 1, gy), c0 = hash(gx, gy + 1), d = hash(gx + 1, gy + 1);
    return a + (b - a) * u + (c0 - a) * v + (a - b - c0 + d) * u * v;
  };
  const open = (gx, gy) => !isRock(Math.floor(gx / 16), Math.floor(gy / 16));
  for (let gy = 0; gy < HH * 16; gy++) for (let gx = 0; gx < HW * 16; gx++) {
    if (open(gx, gy)) continue;
    // (How far to open ground below, left and right: the cliff faces.)
    let below = 99, side = 99;
    for (let k = 1; k <= 14; k++) if (open(gx, gy + k)) { below = k; break; }
    for (let k = 1; k <= 6; k++) if (open(gx - k, gy) || open(gx + k, gy)) { side = k; break; }
    const n = smooth(gx, gy, 12) * 0.7 + smooth(gx, gy, 5) * 0.3;
    let col = ROCK[n > 0.62 ? 0 : n > 0.4 ? 1 : 2];
    if (below <= 12) col = below <= 2 ? ROCK[4] : ROCK[(below + Math.floor(smooth(gx, 0, 3) * 3)) % 5 === 0 ? 4 : below > 9 ? 2 : 3];
    else if (side <= 4) col = side === 1 ? ROCK[4] : ROCK[3];
    else if (below <= 14 || side <= 5) col = ROCK[0];
    if (below > 12 && side > 5 && smooth(gx * 3, gy, 4) > 0.86) col = ROCK[3];
    c.set(gx, gy, col);
  }
  for (let x = 0; x < HW; x++) for (let y = 0; y < HH; y++) if (isRock(x, y) && !isRock(x, y + 1)) c.rect(x * 16, y * 16 + 16, 16, 3, C.shadow);
  // Pebbles at the rock's foot.
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(rand() * HW), y = Math.floor(rand() * HH);
    if (isRock(x, y) || !(isRock(x - 1, y) || isRock(x + 1, y) || isRock(x, y + 1))) continue;
    const px = x * 16 + Math.floor(rand() * 12), py = y * 16 + Math.floor(rand() * 12);
    c.rect(px, py, 3, 2, ROCK[2]); c.hl(px, px + 2, py, ROCK[0]); c.hl(px, px + 2, py + 2, [24, 16, 8, 80]);
  }
  return c;
}
pasteOn(hideout, HW, HH, drawGroundAndRock(), 0, 0, -1);
// A pipe along a path of points (thick, round, lit along its top; a flange at each joint).
function pipe(c, pts, r) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n);
      for (let j = -r; j <= r; j++) {
        const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0), shade = j < -r / 2 ? 0 : j < r / 3 ? 1 : j < r ? 2 : 3;
        c.set(horiz ? x : x + j, horiz ? y + j : y, j === -r || j === r ? PIPE[3] : PIPE[shade]);
      }
    }
  }
  for (const [x, y] of pts.slice(1, -1)) { c.disc(x, y, r + 1, PIPE[2]); c.ring(x, y, r + 1, PIPE[3]); c.disc(x - 1, y - 1, 1, PIPE[0]); }
  for (let k = 0; k < (pts.length - 1) * 3; k++) {
    const i = Math.floor(rand() * (pts.length - 1)), t = rand(), [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    c.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), RUST[1]);
  }
}
// A wing: its flat concrete roof with a parapet, vents and a pipe run, and at its foot the front wall (3 tiles):
// dark windows in rows, rust streaks.
function drawWing(b, inner) {
  const w = b.w * 16, h = b.h * 16 + 16, c = canvas(w, h), faceY = h - 52;
  c.rect(4, h - 6, w - 4, 6, C.shadow);
  c.box(0, 0, w, faceY, { fill: CONC[2], light: CONC[1], dark: CONC[3], line: CONC[4] });
  c.frame(3, 3, w - 6, faceY - 6, CONC[3]);
  weather(c, 4, 4, w - 8, faceY - 8, [CONC[1], CONC[3]], 400);
  streaks(c, 4, 4, w - 8, faceY - 8, 10);
  for (const [vx, vy] of [[14, 22], [w - 40, 60], [18, 110]]) {
    c.box(vx, vy, 24, 18, { fill: CONC[1], light: CONC[0], dark: CONC[3], line: CONC[4] });
    for (let k = 0; k < 4; k++) c.hl(vx + 3, vx + 20, vy + 4 + k * 3, CONC[3]);
  }
  // The pipe run along its inner edge, and one dropping down the front.
  const ix = inner === "right" ? w - 14 : 14;
  pipe(c, [[ix, 0], [ix, faceY - 10], [inner === "right" ? w - 30 : 30, faceY - 10], [inner === "right" ? w - 30 : 30, h - 10]], 4);
  // The front wall.
  c.box(0, faceY, w, h - faceY - 4, { fill: CONC[1], light: CONC[0], dark: CONC[2], line: CONC[4] });
  weather(c, 2, faceY + 2, w - 4, h - faceY - 8, [CONC[0], CONC[2]], 200);
  for (const wy of [faceY + 8, faceY + 26]) for (let wx = 8; wx < w - 16; wx += 20) {
    if (Math.abs(wx + 6 - (inner === "right" ? w - 30 : 30)) < 10) continue;
    c.box(wx, wy, 12, 12, { fill: [32, 32, 40], line: CONC[4] });
    c.hl(wx + 1, wx + 10, wy + 1, [72, 80, 96]); c.vl(wx + 6, wy + 1, wy + 10, CONC[3]);
  }
  streaks(c, 2, faceY + 2, w - 4, h - faceY - 8, 8);
  pipe(c, [[inner === "right" ? w - 30 : 30, faceY - 10], [inner === "right" ? w - 30 : 30, h - 10]], 4);
  return c;
}
pasteOn(hideout, HW, HH, drawWing(LWING, "right"), LWING.x * 16, LWING.y * 16 - 16, 16 + 16 * (LWING.h - 1));
pasteOn(hideout, HW, HH, drawWing(RWING, "left"), RWING.x * 16, RWING.y * 16 - 16, 16 + 16 * (RWING.h - 1));
// The hideout's front, at the courtyard's end: machinery stacked up top (corrugated vent housings, the round dish), the
// hazard chains, then concrete blocks with round holes either side of the gate and Team Snagem's emblem on the gate.
function drawFront() {
  const w = FRONT.w * 16, top = 32, h = FRONT.h * 16 + top, c = canvas(w, h), base = h - 40;
  seed = 59;
  // The machinery.
  c.box(0, 0, w, base, { fill: CONC[3], light: CONC[2], dark: CONC[4], line: CONC[4] });
  for (const [mx, mw, mh] of [[30, 34, 40], [64, 36, 46], [104, 28, 38]]) {
    c.box(mx, base - mh, mw, mh, { fill: CONC[1], light: CONC[0], dark: CONC[3], line: CONC[4] });
    for (let x = mx + 3; x < mx + mw - 2; x += 3) c.vl(x, base - mh + 3, base - 3, CONC[2]);
    for (let k = 0; k < 6; k++) c.set(mx + 2 + Math.floor(rand() * (mw - 4)), base - mh + 2 + Math.floor(rand() * (mh - 4)), RUST[1]);
  }
  // The dish, up on the right.
  const dx = w - 18, dy = 18;
  c.disc(dx, dy, 15, CONC[3]); c.ring(dx, dy, 15, CONC[4]); c.disc(dx, dy, 11, CONC[2]); c.ring(dx, dy, 11, CONC[4]);
  for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3; for (let r = 4; r < 11; r++) c.set(Math.round(dx + Math.cos(ang) * r), Math.round(dy + Math.sin(ang) * r), CONC[4]); }
  c.disc(dx, dy, 4, CONC[1]); c.ring(dx, dy, 4, CONC[4]); c.set(dx - 1, dy - 1, CONC[0]);
  // The hazard chains, slung from the corners.
  for (const [x0, x1] of [[0, 34], [w - 40, w - 10]]) for (let x = x0; x <= x1; x++) {
    const y = 4 + Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 6);
    c.rect(x, y, 1, 3, ((x >> 2) & 1) ? HAZARD[0] : HAZARD[1]);
  }
  // The blocks, either side of the gate: rust-stained, with round holes.
  const gx = (HDOOR.x - FRONT.x) * 16 - 12, gw = HDOOR.w * 16 + 24;
  for (const [bx, bw] of [[0, gx], [gx + gw, w - gx - gw]]) {
    c.box(bx, base, bw, h - base - 2, { fill: RUST[0], light: [216, 160, 112], dark: RUST[1], line: CONC[4] });
    weather(c, bx + 2, base + 2, bw - 4, h - base - 6, [RUST[1], CONC[1], [176, 120, 72]], 220);
    streaks(c, bx + 2, base + 2, bw - 4, h - base - 6, 8);
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) {
      const hx = bx + 12 + k * (bw - 24), hy = base + 10 + j * 15;
      c.disc(hx, hy, 4, [24, 16, 16]); c.ring(hx, hy, 4, RUST[2]); c.hl(hx - 2, hx + 2, hy + 4, [216, 160, 112]);
    }
    c.vl(bx + bw / 2, base + 2, h - 6, RUST[1]);
  }
  // The gate: a steel plate in a heavy frame, the emblem on it, a dark gap under it.
  c.box(gx, base - 4, gw, h - base + 2, { fill: CONC[3], light: CONC[2], dark: CONC[4], line: CONC[4] });
  c.box(gx + 4, base, gw - 8, h - base - 10, { fill: [152, 152, 160], light: [200, 200, 208], dark: [104, 104, 112], line: CONC[4] });
  for (let y = base + 3; y < h - 12; y += 4) c.hl(gx + 6, gx + gw - 7, y, [136, 136, 144]);
  c.rect(gx + 4, h - 10, gw - 8, 6, [24, 24, 32]); for (let x = gx + 6; x < gx + gw - 6; x += 4) c.vl(x, h - 10, h - 5, CONC[3]);
  // Team Snagem's emblem: two red arrows, the top one pointing right and the bottom one left, joined by a slant into an
  // S, each outlined in black.
  const ex = gx + gw / 2, ey = base + (h - 10 - base) / 2;
  const band = (x0, x1, y, dir) => {
    c.rect(Math.min(x0, x1) - 1, y - 4, Math.abs(x1 - x0) + 2, 9, [24, 24, 32]);
    c.rect(Math.min(x0, x1), y - 2, Math.abs(x1 - x0), 5, HRED[1]); c.hl(Math.min(x0, x1), Math.max(x0, x1) - 1, y - 2, HRED[0]);
    const tip = Math.max(x0, x1) * (dir > 0) + Math.min(x0, x1) * (dir < 0);
    for (let k = 0; k <= 6; k++) { c.vl(tip + dir * k, y - 6 + k, y + 6 - k, k === 6 ? [24, 24, 32] : HRED[1]); c.set(tip + dir * k, y - 7 + k, [24, 24, 32]); c.set(tip + dir * k, y + 7 - k, [24, 24, 32]); }
  };
  band(ex - 18, ex + 10, ey - 7, 1);
  band(ex - 10, ex + 18, ey + 7, -1);
  for (let k = -7; k <= 7; k++) { c.rect(ex - k - 3, ey + k - 1, 7, 3, [24, 24, 32]); c.rect(ex - k - 2, ey + k, 5, 1, HRED[1]); }
  return c;
}
pasteOn(hideout, HW, HH, drawFront(), FRONT.x * 16, FRONT.y * 16 - 32, 32 + 16 * (FRONT.h - 1));
// A big pipe arching from the front over onto the right wing (over people: the top layer).
{
  const c = canvas(HW * 16, HH * 16);
  pipe(c, [[(FRONT.x + FRONT.w) * 16 - 26, FRONT.y * 16 + 6], [(FRONT.x + FRONT.w) * 16 - 26, FRONT.y * 16 - 6], [RWING.x * 16 + 30, FRONT.y * 16 - 6], [RWING.x * 16 + 30, (RWING.y + 3) * 16]], 5);
  pipe(c, [[LWING.x * 16 + 8, (LWING.y + 4) * 16], [FRONT.x * 16 + 14, (LWING.y + 4) * 16], [FRONT.x * 16 + 14, FRONT.y * 16 + 4]], 4);
  pasteOn(hideout, HW, HH, c, 0, 0, HH * 16);
}
// Scrap in the courtyard: a broken girder, crossed; black ribs of cable along the right wall.
{
  const c = canvas(32, 32);
  c.rect(4, 26, 24, 4, C.shadow);
  for (const [x0, y0, x1, y1] of [[2, 6, 28, 26], [26, 4, 6, 28]]) for (let k = 0; k <= 30; k++) {
    const x = Math.round(x0 + (x1 - x0) * k / 30), y = Math.round(y0 + (y1 - y0) * k / 30);
    c.rect(x - 1, y - 1, 4, 4, RUST[2]); c.rect(x, y, 2, 2, RUST[1]); if (k % 5 === 0) c.set(x, y, [24, 16, 16]);
  }
  pasteOn(hideout, HW, HH, c, GIRDER.x * 16 - 8, GIRDER.y * 16 - 8, 0);
}
{
  const c = canvas(16, 5 * 16);
  for (let k = 0; k < 6; k++) {
    const y = 6 + k * 12;
    for (let t = 0; t <= 10; t++) { const x = 15 - Math.round(Math.sin(t / 10 * Math.PI) * 9); c.rect(x - 1, y + t - 1, 3, 2, [32, 32, 40]); }
  }
  pasteOn(hideout, HW, HH, c, (YARD.x + YARD.w - 1) * 16, (YARD.y + 1) * 16, 0);
}
// Yellow drums and wooden crates, out on the canyon floor; the warning sign.
for (const [x, y] of HDRUMS) {
  const c = canvas(16, 28);
  c.rect(2, 24, 13, 3, C.shadow);
  c.box(2, 6, 12, 19, { fill: [216, 192, 56], light: [248, 232, 112], dark: [160, 136, 32], line: C.line });
  c.hl(3, 12, 12, [160, 136, 32]); c.hl(3, 12, 19, [160, 136, 32]);
  c.box(2, 3, 12, 5, { fill: RUST[1], light: RUST[0], line: C.line }); c.disc(8, 5, 1, RUST[2]);
  pasteOn(hideout, HW, HH, c, x * 16, y * 16 - 12, 12);
}
for (const [x, y] of CRATES) {
  const c = canvas(16, 20);
  c.rect(1, 17, 15, 3, C.shadow);
  c.box(0, 2, 16, 16, { fill: C.wood[1], light: C.wood[0], dark: C.wood[2], line: C.line });
  c.hl(1, 14, 9, C.wood[3]); for (let k = 2; k < 15; k++) c.set(k, 2 + k, C.wood[3]);
  pasteOn(hideout, HW, HH, c, x * 16, y * 16 - 2, 2);
}
{
  const c = canvas(16, 32);
  c.rect(6, 18, 4, 12, C.iron[2]); c.vl(6, 18, 29, C.iron[3]);
  c.box(0, 6, 16, 13, { fill: HAZARD[0], light: [255, 240, 160], dark: [200, 160, 32], line: C.line });
  c.rect(3, 9, 10, 1, HAZARD[1]); c.rect(3, 12, 10, 1, HAZARD[1]); c.rect(3, 15, 7, 1, HAZARD[1]);
  pasteOn(hideout, HW, HH, c, HSIGN.x * 16, HSIGN.y * 16 - 16, 16);
}
// Team Snagem's grunts, as in Colosseum: bald, in sunglasses, red vests over white shirts, purple gloves (FireRed's
// Rocket Grunt redone: his cap his bald head, his black uniform a red vest).
{
  const png = readPng(path.join(outSprites, "rocket_m.png")), c = canvas(png.width, png.height);
  const HEAD = { "74,74,90": [216, 152, 112], "139,139,148": [248, 200, 160], "57,57,24": [216, 152, 112], "123,115,65": [176, 112, 80] };
  const FACE = { "74,74,90": [40, 40, 56], "139,139,148": [40, 40, 56] };
  const BODY = { "74,74,90": [200, 48, 40], "139,139,148": [232, 232, 224], "230,106,74": [200, 48, 40], "148,57,41": [144, 32, 32],
    "197,197,213": [144, 88, 200], "255,255,255": [184, 136, 232], "57,57,24": [56, 56, 72], "123,115,65": [56, 56, 72] };
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const o = (y * png.width + x) * 4, rgba = png.rgba;
    if (!rgba[o + 3]) continue;
    const key = rgba[o] + "," + rgba[o + 1] + "," + rgba[o + 2], fy = y % 32;
    const zone = fy < 18 ? HEAD : fy < 22 ? FACE : BODY;
    c.set(x, y, zone[key] || [rgba[o], rgba[o + 1], rgba[o + 2]]);
  }
  save(c, path.join(outSprites, "orre_snagem_m.png"));
}
// Their battle picture: FireRed's Cue Ball (bald, a fur-collared vest), his vest Snagem's red.
save(recolorRGBA(path.join(root, "assets/sprites/trainers/front/cue_ball.png"),
  { "180,156,156": [216, 56, 48], "205,180,180": [248, 104, 88], "148,115,106": [152, 32, 32] }, 64), path.join(root, "assets/sprites/trainers/front/snagem_grunt.png"));
const HIDE = {
  name: "SnagemHideout", title: "Snagem Hideout", width: HW, height: HH, type: "route", music: "em_aqua_magma_hideout",
  region: "orre", battleScene: "sand", cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
  collision: [], elevation: [], behavior: [], encounter: [],
  connections: [], warps: [], triggers: [], hidden: [],
  signs: [{ x: HSIGN.x, y: HSIGN.y, script: "SnagemHideout_EventScript_Sign", text: ["DANGER! KEEP OUT!", "Private property of Team Snagem.\nTrespassers will be snagged!"] },
    ...[0, 1].map((k) => ({ x: HDOOR.x + k, y: FRONT.y + FRONT.h - 1, script: "SnagemHideout_EventScript_Door", text: ["A heavy steel gate, Team Snagem's\nemblem on it. It's shut tight."] }))],
  people: [
    person(0, "GUARD_1", HDOOR.x - 1, FRONT.y + FRONT.h, "orre_snagem_m", "face_down", "SnagemHideout_EventScript_Guard1", null),
    person(1, "GUARD_2", HDOOR.x + HDOOR.w, FRONT.y + FRONT.h, "orre_snagem_m", "face_down", "SnagemHideout_EventScript_Guard2", null),
    person(2, "LOOKOUT", 17, 15, "orre_snagem_m", "wander_around", "SnagemHideout_EventScript_Lookout",
      ["Grunt: Quit loafing around out here!", "…Huh, you're not one of ours. What're\nyou doing in Eclo Canyon, kid?"], { rangeX: 2, rangeY: 1 })
  ],
  wild: null
};
{
  const solid = new Set(rock), fill = (b) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) solid.add(x + "," + y); };
  fill(LWING); fill(RWING); fill(FRONT); fill({ x: GIRDER.x, y: GIRDER.y, w: 1, h: 1 }); fill({ x: HSIGN.x, y: HSIGN.y, w: 1, h: 1 });
  for (const [x, y] of HDRUMS.concat(CRATES)) solid.add(x + "," + y);
  for (let y = YARD.y + 1; y < YARD.y + YARD.h; y++) solid.add((YARD.x + YARD.w - 1) + "," + y);   // (the cables)
  for (let i = 0; i < hblocks.length; i++) {
    const x = i % HW, y = Math.floor(i / HW);
    HIDE.collision.push(solid.has(x + "," + y) ? 1 : 0);
    HIDE.elevation.push(3);
    HIDE.behavior.push(0);
    HIDE.encounter.push(0);
  }
  writePng(path.join(outMaps, "SnagemHideout.png"), HW * 16, HH * 16, hideout.below);
  writePng(path.join(outMaps, "SnagemHideout-top.png"), HW * 16, HH * 16, hideout.above);
  // (Beyond the edges: more of the canyon's rock.)
  const b = canvas(32, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = Math.sin(x * Math.PI / 8) + Math.sin((y + x) * Math.PI / 16) + Math.sin(y * Math.PI / 8 + 1);
    b.set(x, y, ROCK[n > 1 ? 0 : n > -0.6 ? 1 : 2]);
  }
  save(b, path.join(outMaps, "SnagemHideout-border.png"));
}

// ---------- The Air Strip's Pokémon Center ----------
//
// Inside: Mauville City's Pokémon Center (its picture and its layout, data/emerald-maps.js), the nurse at the counter
// to heal your Pokémon (and where you come to if they all faint in Orre); its stairs lead nowhere yet.
const PCI = (() => {
  const vm = require("vm"), ctx = { window: { WORLD_MAPS: {}, WORLD_TRAINERS: {} } };
  vm.createContext(ctx);
  try { vm.runInContext(fs.readFileSync(path.join(root, "data/emerald-maps.js"), "utf8"), ctx); } catch (e) { /* (only its maps are needed) */ }
  const m = JSON.parse(JSON.stringify(ctx.window.WORLD_MAPS.MauvilleCity_PokemonCenter_1F));
  const stairs = m.warps.find((w) => /_2F$/.test(w.map));
  m.collision[stairs.y * m.width + stairs.x] = 1;
  const nurse = m.people.find((p) => /_EventScript_Nurse$/.test(p.script));
  return Object.assign(m, {
    name: "OrreAirStrip_PokemonCenter_1F", title: "Orre Air Strip", image: "MauvilleCity_PokemonCenter_1F", region: "orre", showName: false,
    warps: m.warps.filter((w) => w !== stairs).map((w) => ({ x: w.x, y: w.y, map: "OrreAirStrip", warp: 0 })),
    signs: [], triggers: [], hidden: [], weatherSteps: undefined,
    people: [
      Object.assign({}, nurse, { id: 0, localId: "LOCALID_ORRE_NURSE", script: "OrreAirStrip_PokemonCenter_1F_EventScript_Nurse" }),
      person(1, "PC_TRAVELLER", 11, 5, "em_woman_5", "face_left", "OrreAirStrip_PokemonCenter_1F_EventScript_Traveller",
        ["There's hardly a Pokémon Center out\nhere in the desert.", "In Orre, a lot of the towns have\nhealing machines of their own instead."]),
      person(2, "PC_MECHANIC", 3, 6, "hiker", "face_right", "OrreAirStrip_PokemonCenter_1F_EventScript_Pilot2",
        ["The planes bring in supplies for this\nPokémon Center from far away.", "Folks who fly in are glad of the rest."])
    ]
  });
})();

// ---------- Leaving a place: Orre's map ----------
//
// As in Colosseum, you don't walk from one place in Orre to the next: step out of a place's way out (its open edge
// tiles: these triggers) and the map of Orre comes up, to pick where to go (ui/game.js's orreWorldMap()).
function edgeExits(m, rows) {
  for (const y of rows) for (let x = 0; x < m.width; x++) if (!m.collision[y * m.width + x]) m.triggers.push({ x, y, script: "Orre_WorldMap" });
}
OUT.connections = []; AIR.connections = [];
edgeExits(OUT, [0, H - 1]); edgeExits(AIR, [0]); edgeExits(HIDE, [HH - 1]);
AIR.signs[0].text = ["ORRE AIR STRIP", "Through the gate: the desert roads\nof Orre."];

// The map of Orre (240 by 160, the town map's size): a desert of dunes, red mesas and canyons, the mountains to the
// north-east, an oasis in the middle, the roads as dotted tracks between the places (game/orre.js's PLACES).
{
  const MW = 240, MH = 160, c = canvas(MW, MH);
  seed = 61;
  const SANDS = [[248, 224, 168], [240, 208, 144], [224, 184, 120], [200, 160, 104]];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const d = Math.sin(x * 0.09 + y * 0.05) + Math.sin(x * 0.031 - y * 0.11) * 0.8 + Math.sin((x + y) * 0.2) * 0.25;
    c.set(x, y, SANDS[d > 1.1 ? 0 : d > 0 ? 1 : d > -1 ? 2 : 3]);
  }
  // Mesas: flat-topped red rocks with a shaded south face.
  const mesa = (cx, cy, rx, ry) => {
    for (let y = -ry - 4; y <= ry + 4; y++) for (let x = -rx; x <= rx; x++) {
      const e = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (e <= 1) c.set(cx + x, cy + y, ROCK[e > 0.7 ? 1 : 0]);
      else { const e2 = (x * x) / (rx * rx) + ((y - 4) * (y - 4)) / (ry * ry); if (e2 <= 1 && y > 0) c.set(cx + x, cy + y, ROCK[3]); }
    }
  };
  for (const [x, y, rx, ry] of [[22, 34, 14, 7], [58, 22, 10, 5], [128, 120, 12, 6], [168, 138, 16, 6], [92, 50, 8, 4], [214, 112, 9, 4], [30, 140, 12, 5], [146, 30, 9, 4]]) mesa(x, y, rx, ry);
  // Mountains to the north-east: Mt. Battle's range.
  for (const [x, y, s] of [[188, 26, 18], [210, 20, 22], [228, 30, 16], [170, 18, 12]]) {
    for (let k = 0; k <= s; k++) for (let i = -k; i <= k; i++) c.set(x + i, y - s + k + 8, i < 0 ? ROCK[3] : i < k / 3 ? C.iron[1] : C.iron[2]);
    for (let k = 0; k < s / 3; k++) for (let i = -k; i <= k; i++) c.set(x + i, y - s + k + 8, [248, 248, 248]);
  }
  // Canyons: one winding across the west, and Eclo Canyon in the north-east, Team Snagem's hideout at its head.
  for (let t = 0; t < 1; t += 0.002) {
    const x = 6 + t * 70 + Math.sin(t * 12) * 6, y = 64 + t * 30 + Math.cos(t * 9) * 5;
    c.disc(Math.round(x), Math.round(y), 2, ROCK[3]); c.set(Math.round(x), Math.round(y) - 3, ROCK[0]);
  }
  for (let t = 0; t < 1; t += 0.002) {
    const x = 236 - t * 40 + Math.sin(t * 10) * 4, y = 84 - t * 24 + Math.cos(t * 7) * 3, r = 2 + Math.round(t * 2);
    c.disc(Math.round(x), Math.round(y), r, ROCK[3]); c.disc(Math.round(x), Math.round(y) + 1, r - 1, ROCK[4]); c.hl(Math.round(x) - r, Math.round(x) + r, Math.round(y) - r - 1, ROCK[0]);
  }
  // The oasis in the middle (Phenac City's).
  c.disc(108, 86, 9, [96, 168, 88]); c.disc(108, 86, 5, [72, 152, 232]); c.disc(106, 84, 2, [152, 208, 248]);
  // The sea along the south-east coast.
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x + y * 1.4 + Math.sin(y * 0.3) * 3 > 400) c.set(x, y, x + y * 1.4 > 410 ? [72, 136, 216] : [152, 200, 240]);
  // The roads: dotted tracks.
  const track = (pts) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) if (k % 4 < 2) c.set(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), [168, 120, 72]);
    }
  };
  track([[72, 112], [96, 132]]); track([[72, 112], [100, 92]]); track([[156, 70], [178, 66], [194, 62]]);
  track([[116, 84], [156, 70]]); track([[156, 70], [180, 44]]); track([[156, 70], [204, 104]]);
  // A frame, and ORRE in the corner.
  c.frame(0, 0, MW, MH, [96, 48, 40]); c.frame(1, 1, MW - 2, MH - 2, [200, 120, 72]);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 15; j++) if (FONT["ORRE"[i]][j] === "1") c.rect(8 + i * 10 + (j % 3) * 2, 146 + Math.floor(j / 3) * 2 - 6, 2, 2, [96, 48, 40]);
  save(c, path.join(root, "assets/town-map/orre.png"));
}

fs.writeFileSync(path.join(root, "data/orre-maps.js"),
  "// Auto-generated by tools/build-orre.js (Emerald's desert tiles, and pictures drawn there). Do not edit by hand.\n" +
  "// Orre's Outskirt Stand and Snagem Hideout, from Pokémon Colosseum, and the Orre Air Strip, added to FireRed's maps (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify({ OutskirtStand: OUT, OutskirtStand_Diner: IN, OrreAirStrip: AIR, OrreAirStrip_PokemonCenter_1F: PCI, SnagemHideout: HIDE }) + ");\n");
console.log("wrote the Outskirt Stand (" + W + "x" + H + "), its diner (" + IN_W + "x" + IN_H + ") and the Air Strip (" + AW + "x" + AH + "), the Snagem Hideout (" + HW + "x" + HH + ") and Orre's map to data/orre-maps.js and assets/");
