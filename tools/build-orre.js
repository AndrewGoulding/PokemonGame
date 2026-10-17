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
  Y: "101101010010010", " ": "000000000000000", "!": "010010010000010", "'": "010010000000000"
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
    { map: null, mapConst: "MAP_SNAGEM_HIDEOUT", direction: "down", offset: 0 }],
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

fs.writeFileSync(path.join(root, "data/orre-maps.js"),
  "// Auto-generated by tools/build-orre.js (Emerald's desert tiles, and pictures drawn there). Do not edit by hand.\n" +
  "// Orre's Outskirt Stand, from Pokémon Colosseum, added to FireRed's maps (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify({ OutskirtStand: OUT, OutskirtStand_Diner: IN }) + ");\n");
console.log("wrote the Outskirt Stand (" + W + "x" + H + ") and its diner (" + IN_W + "x" + IN_H + ") to data/orre-maps.js and assets/");
