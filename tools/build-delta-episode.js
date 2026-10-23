// The Delta Episode's and Jirachi's pictures (this game's own; ui/game.js has the story):
//
//   assets/battle/space.png
//       a battle background inside the meteoroid: FireRed's cave background's two
//       platforms, recoloured as meteoroid rock, over a field of stars
//   assets/sprites/trainers/front/zinnia.png, assets/world/sprites/em_zinnia.png
//       Zinnia, the Draconids' lorekeeper (Emerald has none: its Hex Maniac's
//       trainer picture and overworld sheet, recoloured: black hair, a dark green
//       robe, a red sash)
//   assets/world/maps/MossdeepCity_SpaceCenter_ObservationDeck.png (-top, -border),
//   -patch-glow.png (and -top), -patch-stars.png
//       the Space Center's sealed observation deck, from its own tiles
//       (assets/world/maps/MossdeepCity_SpaceCenter_2F.png): a wide window on the
//       night sky, the white rock in the middle; the rock aglow, and the stars
//       lined up, as patches
//   assets/world/maps/MossdeepCity_SpaceCenter_2F-patch-sealed.png, -patch-open.png
//       its door, in 2F's window wall: sealed (a red light), and open (green)
//   data/emerald-maps.js (its end, between the markers): the deck's map, and
//       2F's door, its patches and its warp
//
//   node tools/build-delta-episode.js
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");

const root = path.join(__dirname, "..");
const MAPS = path.join(root, "assets/world/maps");
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// (A seeded random, so the stars come out the same each time.)
let seed = 1987;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

// ---------- The battle background ----------
{
  const src = readPng(path.join(root, "assets/battle/cave.png")), W = src.width, H = src.height, out = new Uint8ClampedArray(W * H * 4);
  // (The cave's own sand: the colours of its right-hand side, where no platform is.)
  const sand = new Set();
  for (let y = 0; y < H; y++) for (let x = 400; x < W; x++) { const o = (y * W + x) * 4; sand.add(src.rgba[o] + "," + src.rgba[o + 1] + "," + src.rgba[o + 2]); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, k = src.rgba[o] + "," + src.rgba[o + 1] + "," + src.rgba[o + 2];
    if (sand.has(k)) {
      // Space: deep blue to violet, darker up top.
      const t = y / H;
      out.set([Math.round(8 + 24 * t), Math.round(6 + 10 * t), Math.round(28 + 40 * t), 255], o);
    } else {
      // The rock: the platform's light, by its own light (outline dark, top light).
      const l = (src.rgba[o] * 0.3 + src.rgba[o + 1] * 0.59 + src.rgba[o + 2] * 0.11) / 255;
      const c = l > 0.7 ? hex("#b8b0c8") : l > 0.55 ? hex("#8e86a2") : l > 0.4 ? hex("#665e7a") : hex("#3e3852");
      out.set([c[0], c[1], c[2], 255], o);
    }
  }
  // The stars: over the space only, a few bright with a cross.
  const isSpace = (x, y) => x >= 0 && y >= 0 && x < W && y < H && sand.has(src.rgba[(y * W + x) * 4] + "," + src.rgba[(y * W + x) * 4 + 1] + "," + src.rgba[(y * W + x) * 4 + 2]);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H), b = rnd();
    if (!isSpace(x, y)) continue;
    const c = b > 0.85 ? [255, 255, 255] : b > 0.5 ? [200, 200, 240] : [120, 120, 170];
    out.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
    if (b > 0.93) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isSpace(x + dx, y + dy)) out.set([150, 150, 210, 255], ((y + dy) * W + x + dx) * 4);
  }
  writePng(path.join(root, "assets/battle/space.png"), W, H, out);
}

// ---------- Zinnia ----------
// (The Hex Maniac's purples as a dark green robe, her brown as black hair; the reds a sash.)
function recolour(from, to, map) {
  const p = readPng(from), out = new Uint8ClampedArray(p.rgba);
  for (let i = 0; i < p.width * p.height; i++) {
    const k = out[i * 4] + "," + out[i * 4 + 1] + "," + out[i * 4 + 2], c = map[k];
    if (c && out[i * 4 + 3]) out.set(hex(c), i * 4);
  }
  writePng(to, p.width, p.height, out);
}
{
  const file = path.join(root, "assets/sprites/trainers/front/zinnia.png");
  recolour(path.join(root, "assets/sprites/trainers/front/em_hex_maniac.png"), file, {
    "74,41,74": "#1c3a2a", "106,65,106": "#2c5a3e", "139,90,131": "#3f7a52", "164,123,156": "#62a070", "106,74,74": "#2a2a32",
    "115,41,65": "#26262e", "180,49,74": "#44444e" });
  // No witch's hat: above the brow, a dome of black hair (her bangs down to it), outlined.
  const p = readPng(file), W = p.width, px = new Uint8ClampedArray(p.rgba);
  const CX = 32.5, CY = 20, RX = 10.5, RY = 8.5;
  const inHair = (x, y) => ((x + 0.5 - CX) / RX) ** 2 + ((y + 0.5 - CY) / RY) ** 2 <= 1;
  for (let y = 0; y <= 19; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (inHair(x, y) && y >= 11) {
      const edge = !inHair(x - 1, y) || !inHair(x + 1, y) || !inHair(x, y - 1);
      px.set(edge ? [0, 0, 0, 255] : y <= 13 && Math.abs(x + 0.5 - CX) < 5 ? [74, 74, 88, 255] : [38, 38, 46, 255], o);
    } else if (y < 19 || (y === 19 && !inHair(x, y))) px.set([0, 0, 0, 0], o);
  }
  writePng(file, W, p.height, px);
}
recolour(path.join(root, "assets/world/sprites/em_hex_maniac.png"), path.join(root, "assets/world/sprites/em_zinnia.png"), {
  "82,32,65": "#1c3a2a", "164,65,115": "#2c6a44", "213,115,164": "#58a06a", "65,65,82": "#2a2a34" });

// ---------- The observation deck ----------
const T = 16;
const SC2 = "MossdeepCity_SpaceCenter_2F", SC1 = "MossdeepCity_SpaceCenter_1F", DECK = "MossdeepCity_SpaceCenter_ObservationDeck";
const pic = (name) => { const p = readPng(path.join(MAPS, name + ".png")); return { W: p.width, px: p.rgba }; };
const sc2 = pic(SC2), sc1 = pic(SC1);
// A tile of `from` at (sx, sy) into `into` (iw wide) at (dx, dy).
function tile(from, sx, sy, into, iw, dx, dy) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const o = ((sy * T + y) * from.W + sx * T + x) * 4, d = ((dy * T + y) * iw + dx * T + x) * 4;
    into.set(from.px.subarray(o, o + 4), d);
  }
}
const put = (img, iw, x, y, c, a) => { const o = (y * iw + x) * 4; const k = a == null ? 1 : a; for (let n = 0; n < 3; n++) img[o + n] = Math.round(c[n] * k + img[o + n] * (1 - k)); img[o + 3] = 255; };
const DW = 9, DH = 8, PED = [4, 4], MAT = [4, 7];
// The night sky through the window: deep blue, the stars; `aligned`, a line of bright ones from corner to corner, glowing.
function windowSky(img, iw, x0, y0, w, h, aligned) {
  let s = 77;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = y / h;
    put(img, iw, x0 + x, y0 + y, [Math.round(10 + 20 * t), Math.round(14 + 22 * t), Math.round(40 + 46 * t)]);
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h), b = r();
    put(img, iw, x0 + x, y0 + y, b > 0.8 ? [255, 255, 240] : b > 0.4 ? [190, 200, 240] : [110, 120, 170]);
  }
  if (aligned) {
    // Seven stars in a gentle arc across the glass, each with its glow.
    for (let i = 0; i < 7; i++) {
      const x = Math.round(6 + i * (w - 12) / 6), y = Math.round(h * 0.65 - Math.sin(Math.PI * i / 6) * h * 0.45);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || d > 2) continue;
        put(img, iw, x0 + x + dx, y0 + y + dy, [255, 250, 200], d === 0 ? 1 : d === 1 ? 0.75 : 0.3);
      }
    }
  }
}
// The window's frame: the Space Center's grey, a sill below.
function windowFrame(img, iw, x0, y0, w, h) {
  const F = [82, 90, 106], L = [148, 156, 172];
  for (let x = -2; x < w + 2; x++) { put(img, iw, x0 + x, y0 - 2, F); put(img, iw, x0 + x, y0 - 1, L); put(img, iw, x0 + x, y0 + h, L); put(img, iw, x0 + x, y0 + h + 1, F); }
  for (let y = -2; y < h + 2; y++) { put(img, iw, x0 - 2, y0 + y, F); put(img, iw, x0 - 1, y0 + y, L); put(img, iw, x0 + w, y0 + y, L); put(img, iw, x0 + w + 1, y0 + y, F); }
  // (Mullions every two tiles.)
  for (let x = 2 * T; x < w; x += 2 * T) for (let y = 0; y < h; y++) { put(img, iw, x0 + x - 1, y0 + y, F); put(img, iw, x0 + x, y0 + y, L); }
}
// The white rock: a rounded stone on a low plinth, 16 wide, 24 tall (its top over the tile above); `glow`, aglow.
function rock(img, iw, x0, y0, glow) {
  const inE = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) {
    let c = null;
    if (y >= 18 && x >= 1 && x <= 14) c = y === 18 || x === 1 || x === 14 || y === 23 ? [90, 96, 110] : y < 20 ? [200, 204, 214] : [160, 166, 180];   // the plinth
    else if (inE(x, y, 8, 10, 6.5, 8.5)) {
      const edge = !inE(x - 1, y, 8, 10, 6.5, 8.5) || !inE(x + 1, y, 8, 10, 6.5, 8.5) || !inE(x, y - 1, 8, 10, 6.5, 8.5) || !inE(x, y + 1, 8, 10, 6.5, 8.5);
      c = edge ? [96, 100, 116] : x < 7 && y < 9 ? [255, 255, 255] : y > 13 ? [200, 204, 216] : [232, 234, 240];
      if (glow && !edge) c = [Math.min(255, c[0] + 10), Math.min(255, c[1] + 10), Math.max(120, c[2] - 40)];
    }
    if (c) put(img, iw, x0 + x, y0 + y, c);
  }
  if (glow) for (let y = -4; y < 28; y++) for (let x = -4; x < 20; x++) {
    const d = Math.hypot(x - 7.5, y - 10) - 9;
    if (d > 0 && d < 4 && x0 + x >= 0 && y0 + y >= 0) put(img, iw, x0 + x, y0 + y, [255, 244, 160], 0.45 * (1 - d / 4));
  }
}
{
  const IW = DW * T, below = new Uint8ClampedArray(DW * DH * T * T * 4), above = new Uint8ClampedArray(below.length);
  // Floor: 2F's own plain floor (its rows 5-6), its 2x2 pattern; the walls: 2F's window wall (its top) and its white pillars at the sides.
  for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) {
    if (y <= 1) tile(sc2, 3 + (x % 2), y, below, IW, x, y);
    else tile(sc2, 3 + (x % 2), 5 + (y % 2), below, IW, x, y);
  }
  for (let y = 0; y < DH; y++) { tile(sc2, 0, Math.min(y, 1), below, IW, 0, y); tile(sc2, 0, Math.min(y, 1), below, IW, DW - 1, y); }
  // (1F's mat, two tiles wide, as one: its left end and its right.)
  tile(sc1, 7, 9, below, IW, MAT[0], MAT[1]);
  for (let y = 0; y < T; y++) for (let x = T / 2; x < T; x++) {
    const o = ((9 * T + y) * sc1.W + 8 * T + x) * 4;
    below.set(sc1.px.subarray(o, o + 4), ((MAT[1] * T + y) * IW + MAT[0] * T + x) * 4);
  }
  // The wide window, rows 0-1 between the pillars.
  const WX = T + 4, WY = 6, WW = (DW - 2) * T - 8, WH = 2 * T - 10;
  windowSky(below, IW, WX, WY, WW, WH, false);
  windowFrame(below, IW, WX, WY, WW, WH);
  // The rock on its tile, its top over the one above (in the -top layer, so you pass behind it).
  rock(below, IW, PED[0] * T, PED[1] * T - 8, false);
  for (let y = 0; y < 8; y++) for (let x = 0; x < T; x++) {
    const o = ((PED[1] * T - 8 + y) * IW + PED[0] * T + x) * 4;
    above.set(below.subarray(o, o + 4), o);
  }
  writePng(path.join(MAPS, DECK + ".png"), IW, DH * T, below);
  writePng(path.join(MAPS, DECK + "-top.png"), IW, DH * T, above);
  const border = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) border.set([0, 0, 0, 255], i * 4);
  writePng(path.join(MAPS, DECK + "-border.png"), 32, 32, border);
  // Patches: the rock aglow (with its glow over the tile above it), and the stars in line.
  {
    const w = 1, h = 2, img = new Uint8ClampedArray(w * h * T * T * 4);
    for (let y = 0; y < h * T; y++) for (let x = 0; x < T; x++) {
      const o = (((PED[1] - 1) * T + y) * IW + PED[0] * T + x) * 4;
      img.set(below.subarray(o, o + 4), (y * T + x) * 4);
    }
    // (Back to the floor under the rock, then the rock aglow.)
    tile(sc2, 3 + (PED[0] % 2), 5 + ((PED[1] - 1) % 2), img, T, 0, 0);
    tile(sc2, 3 + (PED[0] % 2), 5 + (PED[1] % 2), img, T, 0, 1);
    rock(img, T, 0, T - 8, true);
    writePng(path.join(MAPS, DECK + "-patch-glow.png"), T, 2 * T, img);
    // (Its top half over the people too, as the rock's is: the -top layer's.)
    const top = new Uint8ClampedArray(img.length);
    top.set(img.subarray(0, T * T * 4));
    writePng(path.join(MAPS, DECK + "-patch-glow-top.png"), T, 2 * T, top);
  }
  {
    const img = new Uint8ClampedArray(IW * 2 * T * 4);
    for (let y = 0; y < 2 * T; y++) img.set(below.subarray(y * IW * 4, (y + 1) * IW * 4), y * IW * 4);
    windowSky(img, IW, WX, WY, WW, WH, true);
    windowFrame(img, IW, WX, WY, WW, WH);
    writePng(path.join(MAPS, DECK + "-patch-stars.png"), IW, 2 * T, img);
  }
}

// ---------- 2F's door ----------
const DOOR = [7, 1];
function door(lit) {
  const img = new Uint8ClampedArray(T * 2 * T * 4);
  tile(sc2, DOOR[0], DOOR[1] - 1, img, T, 0, 0);
  tile(sc2, DOOR[0], DOOR[1], img, T, 0, 1);
  const F = [70, 76, 92], P = [138, 146, 162], S = [104, 112, 128], H = [176, 184, 198];
  for (let y = 5; y < 32; y++) for (let x = 1; x < 15; x++) {
    const edge = x === 1 || x === 14 || y === 5;
    put(img, T, x, y, edge ? F : x === 7 || x === 8 ? S : y === 6 || x === 2 ? H : P);
  }
  // The light over it, and the hazard stripe of a sealed door.
  for (let x = 6; x <= 9; x++) for (let y = 8; y <= 9; y++) put(img, T, x, y, lit);
  for (let x = 2; x < 14; x++) put(img, T, x, 28, (x >> 1) % 2 ? [220, 180, 40] : [40, 40, 48]);
  return img;
}
writePng(path.join(MAPS, SC2 + "-patch-sealed.png"), T, 2 * T, door([224, 48, 48]));
writePng(path.join(MAPS, SC2 + "-patch-open.png"), T, 2 * T, door([64, 208, 96]));

// ---------- The data ----------
{
  const walk = (x, y) => x > 0 && x < DW - 1 && y >= 2 && !(x === PED[0] && y === PED[1]);
  const N = DW * DH, collision = [], elevation = [], behavior = [];
  for (let i = 0; i < N; i++) {
    const x = i % DW, y = Math.floor(i / DW);
    collision.push(walk(x, y) ? 0 : 1);
    elevation.push(walk(x, y) && !(x === MAT[0] && y === MAT[1]) ? 3 : 0);
    behavior.push(x === MAT[0] && y === MAT[1] ? 0x65 : 0);
  }
  const deck = { name: DECK, title: "Mossdeep Space Center", width: DW, height: DH, type: "indoor", music: "em_rustboro", region: "hoenn", showName: false,
    top: true, borderWidth: 2, borderHeight: 2, collision, elevation, behavior, encounter: new Array(N).fill(0), connections: [],
    warps: [{ x: MAT[0], y: MAT[1], map: SC2, warp: 1 }], signs: [{ x: PED[0], y: PED[1], script: "SpaceCenter_EventScript_WishRock", text: null }], triggers: [], hidden: [], people: [],
    patches: { glow: { x: PED[0], y: PED[1] - 1, w: 1, h: 2, top: true, collision: [] }, stars: { x: 0, y: 0, w: DW, h: 2, collision: [] } } };
  const START = "// The Space Center's observation deck (tools/build-delta-episode.js): its map, and 2F's door to it.\n", END = "// (End of the observation deck.)\n";
  const js = START + "window.WORLD_MAPS[" + JSON.stringify(DECK) + "] = " + JSON.stringify(deck) + ";\n" +
    "(function () {\n" +
    "  const m = window.WORLD_MAPS[" + JSON.stringify(SC2) + "];\n" +
    "  if (window.HOENN_TOWN_MAP) window.HOENN_TOWN_MAP.mapSections[" + JSON.stringify(DECK) + "] = \"MOSSDEEP_CITY\";\n" +
    "  if (!m) return;\n" +
    "  if (!m.warps.some((w) => w.map === " + JSON.stringify(DECK) + ")) m.warps.push({ x: " + DOOR[0] + ", y: " + DOOR[1] + ", map: " + JSON.stringify(DECK) + ", warp: 0 });\n" +
    "  m.patches = Object.assign(m.patches || {}, { sealed: { x: " + DOOR[0] + ", y: " + (DOOR[1] - 1) + ", w: 1, h: 2, collision: [[" + DOOR[0] + ", " + DOOR[1] + ", 1, 0]] },\n" +
    "    open: { x: " + DOOR[0] + ", y: " + (DOOR[1] - 1) + ", w: 1, h: 2, collision: [[" + DOOR[0] + ", " + DOOR[1] + ", 1, 0x69]] } });\n" +
    "  if (!m.signs.some((s) => s.script === \"SpaceCenter_EventScript_DeckDoor\")) m.signs.push({ x: " + DOOR[0] + ", y: " + DOOR[1] + ", script: \"SpaceCenter_EventScript_DeckDoor\", text: null });\n" +
    "})();\n" + END;
  const file = path.join(root, "data/emerald-maps.js");
  let text = fs.readFileSync(file, "utf8");
  const a = text.indexOf(START);
  if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
  fs.writeFileSync(file, text + js);
  console.log(DECK, DW + "x" + DH, "and 2F's door at", DOOR.join(","));
}
