// Colosseum's locations projected into the game's 16px, north-up 2D world.
// Run after build-orre.js, or independently with committed base maps/assets.
// This overlay deliberately keeps story IDs and reciprocal warp indices stable.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const A = require("./lib/orre-art");
const { text, canvas, hash, C, texture, water, stairs, bridge, door, palm, cylinder, hut, rockface, tree } = A;
const root = path.join(__dirname, ".."), out = path.join(root, "assets/world/maps");
const context = { window: { WORLD_MAPS: {} } }; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "data/orre-maps.js"), "utf8"), context);
const maps = context.window.WORLD_MAPS, changed = {}, drawings = {};
const clone = (value) => JSON.parse(JSON.stringify(value));
const ellipse = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
function project(name, ground, background = C.sand) {
  const m = clone(maps[name]);
  delete m.image; delete m.anim; delete m.mt;
  m.colosseumLayout = true;
  m.top = true; m.collision = []; m.behavior = []; m.elevation = []; m.encounter = [];
  const c = canvas(m.width * 16, m.height * 16), z = canvas(c.w, c.h);
  texture(c, [0, 0, c.w, c.h], background, 7, 4);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) { m.collision.push(ground(x, y) ? 0 : 1); m.behavior.push(0); m.elevation.push(3); m.encounter.push(0); }
  changed[name] = m; drawings[name] = { c, z };
  return { m, c, z };
}
function block(m, x, y, w, h, solid = true) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < m.width && j < m.height) m.collision[j * m.width + i] = solid ? 1 : 0; }
function actor(m, suffix, x, y) { const p = m.people.find((p) => p.localId === "LOCALID_ORRE_" + suffix); if (!p) throw new Error("Missing actor " + suffix); p.x = x; p.y = y; return p; }
function moveWarp(m, index, x, y) { Object.assign(m.warps[index], { x, y }); }
function building(m, c, b, style = "tin") { const { x, y, w, h } = b; block(m, x, y, w, h); hut(c, x * 16, y * 16 - 12, w * 16, h * 16 + 12, style); }
function finish(m) {
  const { c, z } = drawings[m.name];
  for (const t of m.triggers || []) if (t.script === "Orre_WorldMap") block(m, t.x, t.y, 1, 1, false);
  for (const w of m.warps) { block(m, w.x, w.y, 1, 1, false); m.behavior[w.y * m.width + w.x] = m.name === "PhenacCity_PreGym" ? 0x65 : m.name === "AgateVillage" && w.map === "RelicForest" ? 0x63 : m.name === "RelicForest" ? 0x62 : w.map === "PyriteCave" ? 0x62 : w.map === "PyriteTown" ? 0x65 : 0x69; }
  c.save(path.join(out, m.name + ".png")); z.save(path.join(out, m.name + "-top.png"));
  const border = canvas(32, 32); texture(border, [0, 0, 32, 32], m.name === "AgateVillage" || m.name === "RelicForest" ? C.grass : m.name === "TheUnder" ? [[33, 34, 39], [40, 41, 45]] : C.sand, 9); border.save(path.join(out, m.name + "-border.png"));
}
function pave(c, x, y, w, h, palette = C.stone) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const grout = (j % 12 === 0) || ((i + ((j / 12 | 0) % 2) * 8) % 19 === 0); c.p(i, j, grout ? palette[2] : hash(i, j, 6) > .94 ? palette[2] : palette[1 - ((i / 19 | 0) % 2)]); } }
function fountain(c, cx, cy, rx, ry) { c.ellipse(cx, cy + 5, rx + 5, ry + 4, C.stone[3]); c.ellipse(cx, cy + 2, rx + 5, ry + 4, C.stone[0]); c.ellipse(cx, cy, rx, ry, C.blue[0]); c.ellipse(cx, cy - 1, rx - 3, ry - 3, C.blue[1]); for (let k = 0; k < 6; k++) c.ellipse(cx, cy, rx - 5 - k * 4, (ry - 4 - k * 2), C.blue[2], 1); c.ellipse(cx, cy + 1, 9, 4, C.cream); c.rect(cx - 3, cy - 26, 6, 25, C.stone[1]); c.ellipse(cx, cy - 26, 11, 4, C.stone[0]); for (let dx = -8; dx <= 8; dx += 4) c.line(cx, cy - 29, cx + dx, cy - 2, C.blue[3], 1); }
function dome(c, cx, cy, rx, ry, colors = C.metal) { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const d = x * x / (rx * rx) + y * y / (ry * ry); if (d > 1) continue; const rows = Math.floor((y + ry) / 8), seam = (y + ry) % 8 === 0 || (x + rows * 7) % 17 === 0; c.p(cx + x, cy + y, seam ? colors[0] : d > .8 ? colors[1] : x < 0 ? colors[3] : colors[2]); } }
function wheel(c, x, y, r, colors = C.rust) { c.ellipse(x, y, r, r, colors[0], 2); for (let i = 0; i < 8; i++) c.line(x, y, x + Math.cos(i * Math.PI / 4) * r, y + Math.sin(i * Math.PI / 4) * r, colors[1], 2); c.ellipse(x, y, 3, 3, colors[2]); }

// Phenac: a circular oasis, lower fountain plaza, raised central Pre Gym and
// waterfall-ringed Stadium. Its services occupy the same sides as the model.
{
  const { m, c, z } = project("PhenacCity", (x, y) => ellipse(x, y, 19.5, 27, 18.7, 8.5) || ellipse(x, y, 19.5, 17, 18.5, 8) || ellipse(x, y, 19.5, 6, 18, 6) || (x >= 18 && x <= 21 && y >= 32));
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (!m.collision[(y >> 4) * m.width + (x >> 4)]) { const n = (Math.floor(x / 11) + Math.floor(y / 8)) % 3; c.p(x, y, n === 0 ? [223, 198, 142] : n === 1 ? [231, 207, 155] : [209, 182, 125]); if (x % 11 === 0 || y % 8 === 0) c.p(x, y, [195, 171, 119]); }
  for (const [cy, rx, ry] of [[27, 18.6, 8.2], [17, 18.4, 7.8], [6, 17.8, 5.8]]) {
    c.ellipse(320, cy * 16 + 8, rx * 16, ry * 16, C.stone[3], 7);
    c.ellipse(320, cy * 16 + 4, rx * 16, ry * 16, C.stone[0], 5);
    c.ellipse(320, cy * 16, rx * 16 - 5, ry * 16 - 5, C.blue[0], 7);
    c.ellipse(320, cy * 16 - 1, rx * 16 - 7, ry * 16 - 7, C.blue[2], 3);
  }
  for (const row of [12, 25]) {
    block(m, 2, row, 36, 1); block(m, 18, row, 4, 1, false);
    stairs(c, 18 * 16, row * 16 - 3, 64, 24);
    for (const sx of [3, 35]) { water(c, sx * 16, row * 16 - 7, 24, 25); for (let x = sx * 16 + 2; x < sx * 16 + 23; x += 5) c.line(x, row * 16 - 7, x, row * 16 + 16, C.blue[3], 2); }
  }
  // Stadium's broad, water-covered circular roof and central stairway.
  block(m, 10, 1, 20, 9);
  c.ellipse(320, 129, 158, 26, C.stone[2]); c.ellipse(320, 79, 157, 67, C.stone[3]); c.rect(166, 74, 308, 57, C.blue[0]);
  dome(c, 320, 72, 152, 59, [C.blue[0], C.blue[1], C.blue[2], C.blue[3]]);
  c.ellipse(320, 40, 96, 24, C.stone[0]);
  for (let x = 176; x <= 464; x += 6) c.line(x, 83 + Math.abs(x - 320) * .05, x, 132, x % 12 ? C.blue[2] : C.blue[3]);
  c.ellipse(320, 128, 154, 10, C.blue[3], 3); c.box(303, 94, 34, 50, C.dark, C.stone[0]); stairs(c, 304, 133, 32, 30); block(m, 19, 8, 2, 3, false);
  // Mayor to the north-west; houses north-east and south-east; west-side services.
  for (const b of [{ x: 2, y: 3, w: 7, h: 5 }, { x: 31, y: 3, w: 7, h: 5 }, { x: 29, y: 26, w: 7, h: 5 }]) { block(m, b.x, b.y, b.w, b.h); cylinder(c, b.x * 16, b.y * 16 - 8, b.w * 16, b.h * 16 + 8); const d = b.x + (b.w >> 1); door(c, d * 16 + 8, (b.y + b.h) * 16 - 1); if (b.x === 2) c.ellipse(80, 52, 30, 15, C.blue[0]); }
  block(m, 3, 13, 6, 5); block(m, 6, 11, 3, 2); cylinder(c, 48, 203, 95, 84); cylinder(c, 96, 179, 39, 70); c.ellipse(116, 176, 19, 15, [193, 63, 43]); door(c, 6 * 16 + 8, 18 * 16 - 1, 14);
  c.rect(104, 232, 24, 8, [66, 135, 109]);
  moveWarp(m, 0, 6, 17);
  // Pre Gym, previously missing: a low circular building on the middle terrace.
  block(m, 17, 18, 7, 4); cylinder(c, 17 * 16, 18 * 16 - 8, 112, 72); cylinder(c, 19 * 16, 18 * 16 - 19, 48, 18); door(c, 20 * 16 + 8, 22 * 16 - 1, 18, C.dark);
  const preIndex = m.warps.length; m.warps.push({ x: 20, y: 21, map: "PhenacCity_PreGym", warp: 0 });
  const pre = { name: "PhenacCity_PreGym", title: "Phenac City · Pre Gym", region: "orre", type: "indoor", music: "mus_gym", width: 15, height: 13, top: false, borderWidth: 2, borderHeight: 2, collision: [], elevation: [], behavior: [], encounter: [], connections: [], signs: [], triggers: [], hidden: [],
    warps: [{ x: 7, y: 11, map: "PhenacCity", warp: preIndex }], people: [{ id: 0, localId: "LOCALID_ORRE_JUSTY", x: 7, y: 3, sprite: "cooltrainer_m", width: 16, height: 32, frames: 9, movement: "face_down", script: "PhenacCity_PreGym_EventScript_Justy", text: ["Justy: Welcome to the Pre Gym!", "This is Phenac's training facility.\nThe Stadium is up the northern stairs."] }] };
  changed[pre.name] = pre; const pc = canvas(240, 208), pz = canvas(240, 208); drawings[pre.name] = { c: pc, z: pz };
  pave(pc, 0, 0, pc.w, pc.h); pc.ellipse(120, 112, 75, 46, C.blue[0]); pc.ellipse(120, 112, 69, 41, C.stone[1]); pc.ellipse(120, 112, 15, 10, C.stone[0], 2); pc.line(51, 112, 189, 112, C.stone[0], 2);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 15; x++) { pre.collision.push(x === 0 || x === 14 || y < 2 || y === 12 ? 1 : 0); pre.behavior.push(0); pre.elevation.push(3); pre.encounter.push(0); }
  block(pre, 7, 11, 1, 1, false); pc.rect(104, 176, 32, 16, C.blue[0]);
  // Lower plaza and fountain; keep the truck rescue to its west.
  fountain(c, 320, 28 * 16, 39, 23); block(m, 18, 27, 4, 3);
  actor(m, "PHENAC_MAN", 26, 29); actor(m, "PHENAC_BOY", 25, 17);
  actor(m, "PHENAC_TRUCK", 10, 30); actor(m, "PHENAC_FOLLY", 14, 30); actor(m, "PHENAC_TRUDLY", 13, 30); actor(m, "PHENAC_RUI", 10, 31);
  // Filler IDs don't have the PHENAC prefix in the base data.
  for (const [id, x, y] of [["ELLIS", 29, 32], ["MIA", 31, 22], ["BEN", 8, 10]]) actor(m, id, x, y);
  m.patches.truck.x = 9; m.patches.truck.collision = [9, 10, 11, 12].map((x) => [x, 30, 1]);
  m.signs = m.signs.filter((s) => !/LockedDoor/.test(s.script));
  for (const [x, y] of [[12, 23], [28, 23], [12, 32], [28, 32], [7, 10], [31, 10]]) { palm(z, x * 16 + 8, y * 16 + 12); block(m, x, y, 1, 1); }
  // Southern bridge crosses the enclosing water ring.
  stairs(c, 18 * 16, 33 * 16, 64, 48);
  block(m, 18, 30, 4, 6, false);
}

// Pyrite: lower Duel Square, crooked industrial street, wind-powered station,
// chasm and bridge before the white, plated Colosseum dome.
{
  const { m, c, z } = project("PyriteTown", (x, y) => x >= 2 && x < 34 && y >= 2 && (y < 29 || (x >= 16 && x <= 19)), [[120, 84, 57], [139, 96, 61], [157, 109, 65]]);
  for (let y = 2; y < 29; y++) for (let x = 2; x < 34; x++) { if (x < 11 || x > 27 || y < 14) continue; pave(c, x * 16, y * 16, 16, 16, [[140, 140, 119], [122, 126, 111], [99, 106, 93], [69, 78, 72]]); }
  // Jagged canyon walls instead of a rectangular ring of identical tiles.
  for (let y = 0; y < m.height; y++) { const left = 2 + (y < 8 ? 0 : y > 21 ? 1 : 0); rockface(c, 0, y * 16, left * 16, 16); rockface(c, 34 * 16, y * 16, 32, 16); }
  rockface(c, 0, 0, c.w, 32);
  // Cross-town chasm. The one main bridge is in front of the arena.
  block(m, 2, 12, 32, 2); c.poly([[32, 188], [164, 181], [222, 191], [315, 181], [412, 193], [544, 183], [544, 225], [435, 215], [318, 226], [212, 216], [128, 225], [32, 216]], C.dark);
  for (let x = 32; x < 544; x += 15) c.line(x, 190, x + 4, 211, C.rock[2], 4);
  bridge(c, 16 * 16, 11 * 16, 64, 64); block(m, 16, 11, 4, 4, false);
  block(m, 11, 1, 14, 8); dome(c, 18 * 16, 68, 118, 65, [[83, 99, 99], [145, 163, 156], [201, 212, 193], [228, 232, 211]]); c.rect(174, 96, 228, 37, [141, 157, 146]);
  for (let x = 180; x < 400; x += 17) c.line(x, 96, x, 132, [80, 100, 96]); c.box(17 * 16, 103, 32, 41, C.dark, C.stone[2]);
  // Duking's and the Pyrite Building retain their established door coordinates.
  building(m, c, { x: 3, y: 3, w: 6, h: 4 }); door(c, 6 * 16 + 8, 7 * 16 - 1, 14, C.rust[0]);
  building(m, c, { x: 27, y: 1, w: 6, h: 6 }); c.box(27 * 16, 32, 96, 64, C.rust[0]);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) c.box(437 + col * 17, 36 + row * 19, 10, 10, [53, 67, 62], C.rust[2]); door(c, 30 * 16 + 8, 7 * 16 - 1);
  // Windmill at the south-west lip of the chasm, not a generic house.
  block(m, 9, 10, 3, 2); cylinder(c, 145, 145, 43, 38, C.metal, C.rust[1]);
  const wx = 167, wy = 110; z.line(wx, wy, wx - 9, 169, C.metal[0], 5); z.line(wx, wy, wx + 10, 169, C.metal[0], 5);
  wheel(z, wx, wy, 8, C.metal);
  for (const [dx, dy] of [[0, -41], [41, 0], [0, 41], [-41, 0]]) { z.line(wx, wy, wx + dx, wy + dy, C.metal[1], 4); z.poly([[wx + dx, wy + dy], [wx + dx + (dy ? 12 : -8), wy + dy + (dx ? 12 : -8)], [wx + dx * .4 + (dy ? 8 : 0), wy + dy * .4 + (dx ? 8 : 0)]], C.metal[2]); }
  // Lower town's mismatched dome, barrel-shaped shops and machinery.
  block(m, 3, 14, 6, 3); cylinder(c, 3 * 16, 14 * 16, 96, 47, C.rust, C.gold); dome(c, 6 * 16, 14 * 16, 48, 26, C.rust); door(c, 6 * 16 + 8, 17 * 16 - 1, 12, C.gold);
  block(m, 27, 13, 5, 4); cylinder(c, 27 * 16, 13 * 16, 80, 64, [[47, 74, 65], [71, 109, 80], [112, 143, 88], [164, 170, 114]], C.rust[1]); door(c, 28 * 16 + 8, 17 * 16 - 1);
  building(m, c, { x: 4, y: 22, w: 6, h: 4 }); door(c, 7 * 16 + 8, 26 * 16 - 1);
  building(m, c, { x: 26, y: 22, w: 6, h: 4 }); door(c, 29 * 16 + 8, 26 * 16 - 1);
  // Duel Square's conspicuous painted Poké Ball is the centre of the lower street.
  c.ellipse(18 * 16, 23 * 16, 57, 29, [68, 82, 72]); c.ellipse(18 * 16, 23 * 16, 53, 26, [182, 168, 93], 3); c.line(236, 368, 340, 368, [182, 168, 93], 3); c.ellipse(288, 368, 13, 9, [182, 168, 93], 3);
  // The source street's utility pipes connect the upper building and station.
  for (const [x0, y0, x1, y1] of [[468, 150, 468, 180], [468, 180, 535, 180], [152, 177, 204, 177]]) { c.line(x0, y0, x1, y1, C.rust[0], 10); c.line(x0 - 1, y0 - 2, x1 - 1, y1 - 2, C.rust[2], 5); }
  actor(m, "PYRITE_ZEKE", 7, 10); actor(m, "SHADOW_VANT", 13, 10); actor(m, "SHADOW_NOVER", 21, 10); actor(m, "HANK", 30, 10); actor(m, "RYU", 4, 10);
  // Cave entrance remains in the east canyon wall.
  c.ellipse(34 * 16 + 6, 19 * 16, 19, 25, C.rock[2]); c.box(34 * 16 - 5, 19 * 16 - 5, 26, 24, C.dark, C.wood[0]);
}

// Agate's root-built houses rise on grassy ledges above water. Eagun's giant
// hollow tree is north-central; the Relic path leaves on the lower west side.
{
  const { m, c, z } = project("AgateVillage", (x, y) => (x >= (y >= 12 && y <= 18 ? 7 : 2) && x <= 33 && y >= 2 && y <= 26) || (x >= 16 && x <= 19 && y >= 26) || (x === 1 && (y === 9 || y === 10)), [[34, 78, 88], [44, 91, 98], [56, 102, 105]]);
  water(c, 0, 0, c.w, c.h, true);
  for (let y = 2; y <= 26; y++) for (let x = 2; x <= 33; x++) { if (m.collision[y * m.width + x]) continue; c.rect(x * 16, y * 16, 16, 16, C.grass[1]); for (let k = 0; k < 9; k++) c.p(x * 16 + (hash(k, x) * 16 | 0), y * 16 + (hash(k, y) * 16 | 0), C.grass[k % 3]); }
  for (const row of [11, 19, 26]) { block(m, 2, row, 32, 1); rockface(c, 32, row * 16, 512, 18, [[119, 120, 72], [91, 96, 57], [67, 75, 47], [47, 59, 40]]); c.rect(32, row * 16 - 2, 512, 4, C.grass[2]); }
  for (const [row, x] of [[11, 17], [19, 24], [26, 16]]) { block(m, x, row, 3, 1, false); stairs(c, x * 16, row * 16, 48, 20, C.wood); }
  // Cascade at the eastern cliff, with small streams crossing the ledges.
  water(c, 32 * 16, 0, 48, 426); block(m, 32, 0, 3, 26);
  for (let y = 0; y < 420; y++) { c.p(519 + (y % 3), y, C.blue[3]); c.p(550, y, C.blue[2]); }
  water(c, 26 * 16, 10 * 16, 96, 24); water(c, 23 * 16, 18 * 16, 144, 24);
  block(m, 26, 10, 6, 1); block(m, 23, 18, 9, 1); bridge(c, 26 * 16, 9 * 16, 40, 48); block(m, 26, 9, 3, 3, false); bridge(c, 24 * 16, 17 * 16, 48, 48); block(m, 24, 17, 3, 3, false);
  // Root-framed stone cottages, not FireRed-style red-roof cabins.
  for (const b of [{ x: 4, y: 4, w: 6, h: 4 }, { x: 4, y: 19, w: 6, h: 4 }, { x: 27, y: 19, w: 5, h: 4 }]) { building(m, c, b, "root"); door(c, (b.x + 3) * 16 + 8, (b.y + b.h) * 16 - 1, 12, C.grass[0]); for (let i = 0; i < 3; i++) c.line(b.x * 16 + i * 10 - 8, b.y * 16 - 15, b.x * 16 + i * 6 - 6, (b.y + b.h) * 16 - 1, [159, 161, 126], 7); }
  // Eagun's house grows inside the great dead tree above the village.
  block(m, 14, 2, 8, 5); c.poly([[240, 112], [234, 68], [243, 35], [253, 9], [271, 5], [276, 58], [292, 101], [322, 113], [302, 126], [275, 111], [259, 118], [232, 126], [220, 119]], [133, 141, 119]);
  for (const [x, dx] of [[247, -29], [264, 19], [276, 37]]) { z.line(x, 58, x + dx, 12, [135, 144, 121], 11); z.line(x - 2, 58, x + dx - 2, 13, [182, 185, 151], 3); }
  for (let y = 0; y < 128; y++) for (let x = 220; x < 324; x++) {
    const i = (y * c.w + x) * 4;
    if (c.data[i] === 133 && c.data[i + 1] === 141 && c.data[i + 2] === 119) {
      const n = Math.sin(x * .31 + Math.sin(y * .035) * 2) + Math.sin(x * .09 + y * .025);
      c.p(x, y, n > .6 ? [178, 179, 141] : n > -.7 ? [138, 148, 116] : [87, 105, 83]);
    }
  }
  c.line(253, 29, 247, 93, [186, 188, 152], 4); c.line(273, 47, 283, 101, [88, 103, 83], 4); door(c, 17 * 16 + 8, 7 * 16 - 1, 18, C.grass[0]); moveWarp(m, 3, 17, 6);
  // In the reference model the Pokémon Center is the root-framed north-west
  // house; the small cylindrical building on the south-east ledge is the Mart.
  moveWarp(m, 0, 7, 7);
  c.ellipse(7 * 16, 4 * 16 - 7, 10, 9, [180, 63, 44]);
  c.rect(7 * 16 - 9, 4 * 16 - 8, 18, 2, C.stone[0]);
  m.signs = m.signs.filter((s) => !(s.x === 7 && s.y === 7));
  actor(m, "KYLE", 5, 10);
  // The Mart stands on the south-eastern ledge.
  block(m, 21, 20, 5, 4); cylinder(c, 21 * 16, 20 * 16 - 2, 80, 66, C.stone, C.grass[0]); door(c, 23 * 16 + 8, 24 * 16 - 1); c.ellipse(23 * 16 + 8, 20 * 16 - 3, 13, 11, C.gold);
  // Original exit bridge descends from the southern ledge over the river.
  bridge(c, 16 * 16, 26 * 16, 64, 64); block(m, 16, 26, 4, 4, false);
  // Shadow-Pokémon story participants belong at the Relic, not in the village square.
  const relicActors = m.people.filter((p) => ["LOCALID_ORRE_SKRUB", "LOCALID_ORRE_AGATE_PEON", "LOCALID_ORRE_SHRINE_EAGUN"].includes(p.localId));
  m.people = m.people.filter((p) => !relicActors.includes(p));
  m.signs = m.signs.filter((s) => !/RelicStone/.test(s.script));
  actor(m, "AGATE_FAY", 28, 12); actor(m, "AGATE_GRANNY", 30, 16); actor(m, "BO", 29, 3); actor(m, "DANA", 11, 5);
  // Keep the forest's existing warp IDs stable for saved games.
  bridge(c, 16, 9 * 16, 48, 32, false); block(m, 1, 9, 3, 2, false);
  for (const [x, y] of [[3, 3], [11, 8], [31, 5], [3, 17], [13, 22], [31, 25]]) tree(z, x * 16, y * 16, 1.2);
  const r = project("RelicForest", (x, y) => x >= 2 && x <= 19 && y >= 2 && y <= 15 || (x === 20 && (y === 9 || y === 10)), C.grass);
  texture(r.c, [32, 32, 288, 224], C.grass, 20);
  for (let y = 0; y < 18; y += 3) for (const x of [1, 20]) tree(r.z, x * 16, y * 16 + 32, 1.5);
  for (const x of [4, 8, 13, 17]) tree(r.z, x * 16, 63, 1.3);
  // Mossy round sanctuary and the inscribed Relic Stone under its ancient arch.
  r.c.ellipse(176, 110, 84, 49, C.stone[3]); r.c.ellipse(176, 105, 82, 47, [169, 175, 124]); r.c.ellipse(176, 105, 64, 36, [137, 153, 97]);
  r.c.box(160, 64, 32, 34, [153, 172, 130], [64, 87, 65]); r.c.ellipse(176, 65, 16, 8, [192, 198, 150]);
  for (let y = 73; y < 90; y += 5) for (let x = 166; x < 190; x += 5) r.c.line(x, y, x + (y % 3), y + 3, [66, 104, 78]);
  block(r.m, 10, 4, 2, 2);
  r.m.people.push(...relicActors.map((p, i) => Object.assign(p, { x: [11, 12, 9][i], y: [8, 9, 9][i] })));
  r.m.signs = [10, 11].map((x) => ({ x, y: 5, script: "RelicForest_EventScript_Shrine", text: ["The Relic Stone rests within an\nancient, root-covered sanctuary."] }));
  // Story escape paths run down and east from the Relic clearing.
  block(r.m, 8, 6, 8, 8, false);
}

// The Under: upper Colosseum, deep chasm, suspended disk and bridges, lower
// industrial town, TV studio and a subway on the eastern side.
{
  const { m, c, z } = project("TheUnder", (x, y) => x >= 2 && x <= 31 && y >= 2 && y <= 26, [[45, 48, 50], [57, 60, 61], [65, 65, 62]]);
  pave(c, 32, 32, 480, 384, [[104, 111, 107], [86, 94, 92], [67, 76, 76], [43, 53, 56]]);
  // The chasm is the organising feature of the original town, not decoration.
  block(m, 2, 10, 30, 2); c.rect(32, 10 * 16, 480, 32, [12, 15, 21]); rockface(c, 32, 10 * 16 - 12, 480, 12, [[102, 110, 108], [83, 90, 91], [60, 66, 70], [31, 38, 43]]);
  bridge(c, 21 * 16, 9 * 16, 48, 64); block(m, 21, 9, 3, 4, false); bridge(c, 8 * 16, 9 * 16, 32, 64); block(m, 8, 9, 2, 4, false);
  // Colosseum north of the chasm, a distinct great stone dome.
  block(m, 11, 1, 12, 6); dome(c, 17 * 16, 68, 96, 51, [[45, 49, 52], [69, 76, 77], [93, 102, 101], [119, 127, 122]]); door(c, 16 * 16 + 8, 7 * 16 - 1, 22, C.dark);
  // Venus's studio occupies the lower town, reached from the western walkway.
  block(m, 3, 17, 7, 5); building(m, c, { x: 3, y: 17, w: 7, h: 5 }); door(c, 6 * 16 + 8, 22 * 16 - 1); c.box(55, 280, 88, 15, [87, 40, 83], C.metal[0]);
  for (let x = 61; x < 139; x += 9) c.rect(x, 286, 5, 4, [228, 129, 178]);
  moveWarp(m, 3, 6, 21); actor(m, "KLOAK", 6, 22);
  // Healing service and shops are repurposed industrial huts, not Hoenn houses.
  block(m, 3, 7, 4, 6); cylinder(c, 48, 105, 64, 101, C.metal, [104, 172, 158]); door(c, 4 * 16 + 8, 13 * 16 - 1);
  block(m, 13, 15, 6, 4); hut(c, 208, 232, 96, 72); door(c, 16 * 16 + 8, 19 * 16 - 1, 15, [86, 50, 91]);
  // The UFO disk hangs above the darkness between its two docks.
  z.ellipse(17 * 16, 10 * 16 + 11, 24, 11, C.metal[0]); z.ellipse(17 * 16, 10 * 16 + 8, 22, 9, C.metal[2]); z.ellipse(17 * 16, 10 * 16 + 4, 13, 6, [69, 121, 140]);
  for (const x of [250, 280]) z.rect(x, 162, 4, 5, [218, 71, 53]);
  // Eastern rail platform and dark subway rails.
  block(m, 28, 3, 3, 22); c.rect(448, 48, 48, 352, [28, 29, 34]);
  for (let y = 48; y < 400; y += 7) c.rect(449, y, 46, 3, C.wood[0]); for (const x of [455, 486]) c.line(x, 48, x, 400, C.metal[2], 2);
  for (const [x, y] of [[10, 5], [30, 3], [12, 23]]) { cylinder(z, x * 16, y * 16 - 90, 20, 105, C.rust, C.metal[0]); }
  actor(m, "SHADOW_LIAKS", 26, 13);
  for (const p of m.people) if (p.x >= 24 && p.x <= 27) block(m, p.x, p.y, 1, 1, false);
  // Cyan machinery provides the lower town's characteristic light source.
  cylinder(c, 20 * 16, 23 * 16, 31, 36, C.metal); c.ellipse(20 * 16 + 15, 23 * 16, 12, 12, [114, 236, 215]); block(m, 20, 23, 2, 2);
}

// Mt. Battle's lava-filled caldera and linked metal arenas. Existing story
// battles stay on the same numbered landings, now connected by gantries.
{
  const { m, c, z } = project("MtBattle", () => false, [[71, 47, 39], [93, 54, 39], [113, 60, 38]]);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const river = c.w * .5 + Math.sin(y * .013) * 120 + Math.cos(y * .031) * 20;
    const distance = Math.abs(x - river), width = 75 + Math.sin(y * .023) * 19;
    if (distance < width) {
      const crust = Math.sin(x * .075 + y * .031) + Math.cos(x * .024 - y * .048);
      const col = crust > 1.3 ? [80, 46, 37] : distance > width - 4 ? [250, 184, 58] : crust < -.7 ? [245, 140, 38] : crust > .45 ? [154, 57, 32] : [213, 86, 32];
      c.p(x, y, col);
    }
  }
  const landings = [[4, 23, 10, 5], [9, 13, 16, 6], [8, 3, 18, 6], [13, 27, 17, 4]];
  for (const [x, y, w, h] of landings) { block(m, x, y, w, h, false); c.ellipse((x + w / 2) * 16, (y + h) * 16 + 3, w * 8 + 6, 10, [38, 35, 32]); pave(c, x * 16, y * 16, w * 16, h * 16, C.metal); c.box(x * 16 + 2, y * 16 + 2, w * 16 - 4, h * 16 - 4, [109, 117, 106], [191, 185, 137]); c.ellipse((x + w / 2) * 16, (y + h / 2) * 16, 20, 12, C.stone[0], 2); c.line(x * 16 + 6, (y + h / 2) * 16, (x + w) * 16 - 7, (y + h / 2) * 16, C.stone[0]); }
  // Zig-zagging steel walkways rise toward the summit arena.
  for (const [x, y, w, h] of [[13, 24, 4, 4], [15, 18, 3, 7], [24, 9, 3, 10], [17, 8, 10, 3], [15, 29, 4, 3], [24, 25, 3, 3]]) { bridge(c, x * 16, y * 16, w * 16, h * 16); block(m, x, y, w, h, false); }
  // Former healing building becomes the caldera's sheltered entrance service.
  block(m, 25, 23, 4, 4); cylinder(c, 400, 360, 64, 72, C.metal, C.rust[2]); door(c, 26 * 16 + 8, 27 * 16 - 1);
  // Safety rails are drawn over actors only at the edges, never across walkways.
  for (const [x, y, w] of [[4, 23, 10], [9, 13, 16], [8, 3, 18]]) { z.line(x * 16, y * 16 - 6, (x + w) * 16, y * 16 - 6, C.metal[2], 2); for (let k = x; k <= x + w; k += 2) z.line(k * 16, y * 16 - 9, k * 16, y * 16 + 2, C.metal[0], 2); }
  for (const p of m.people) block(m, p.x, p.y, 1, 1, false);
}

// The Outskirt Stand is an isolated locomotive and salvage yard on an open
// desert plain. It has no canyon walls; the scene's train and door stay fixed.
{
  const { m, c, z } = project("OutskirtStand", (x, y) => x > 0 && x < 35 && y > 0 || (x >= 14 && x <= 22), C.sand);
  // Copper boiler, cab and chimney cluster follow the original train model.
  c.box(176, 103, 66, 66, C.rust[1], C.rust[0]);
  c.box(185, 109, 19, 22, C.dark, C.rust[2]); c.rect(173, 99, 73, 6, C.rust[2]);
  c.ellipse(313, 132, 81, 22, C.rust[0]); c.rect(236, 119, 151, 39, C.rust[1]);
  c.ellipse(385, 139, 13, 20, C.rust[0]);
  for (let y = 122; y < 154; y++) c.rect(241, y, 142, 1, y < 128 ? C.rust[2] : y > 146 ? C.rust[0] : C.rust[1]);
  for (const x of [249, 274, 349, 378]) { c.rect(x, 119, 4, 37, C.rust[0]); c.rect(x + 1, 119, 1, 35, C.rust[3]); }
  c.box(281, 123, 54, 18, [51, 45, 28], C.gold); c.rect(289, 127, 38, 3, [122, 130, 68]);
  c.ellipse(393, 132, 7, 9, C.gold); c.rect(224, 160, 173, 6, C.rust[0]);
  block(m, 11, 6, 14, 5);
  // Lower doorway and wheels are below the old roof's split plane.
  door(c, 13 * 16 + 8, 11 * 16 - 1, 16, C.wood[0]);
  for (const x of [17, 19, 21]) { z.rect(x * 16, 67 - (x % 3) * 6, 6, 39 + (x % 3) * 6, C.rust[0]); z.rect(x * 16 + 1, 67 - (x % 3) * 6, 2, 38, C.rust[2]); }
  for (let x = 228; x < 394; x += 25) wheel(c, x, 172, 11);
  for (const [x, y, w] of [[2, 8, 6], [28, 8, 5]]) { block(m, x, y, w, 3); c.box(x * 16, y * 16, w * 16, 48, [115, 111, 103], [62, 61, 57]);
    c.poly([[x * 16, y * 16], [x * 16 + 8, y * 16 - 8], [(x + w) * 16 + 8, y * 16 - 8], [(x + w) * 16, y * 16]], [147, 141, 128]);
    for (let xx = x * 16 + 4; xx < (x + w) * 16; xx += 5) c.line(xx, y * 16 + 2, xx, y * 16 + 46, xx % 3 ? [82, 86, 83] : [166, 118, 80]); }
  for (const [x, y] of [[6, 15], [9, 17], [26, 15], [29, 17], [31, 14], [24, 18]]) wheel(c, x * 16, y * 16, 12);
  // Leaning scrap fence behind the locomotive.
  for (let x = 24; x < c.w - 24; x += 23) { z.line(x, 145, x + (x % 7) - 3, 105, C.wood[0], 3); z.line(x, 132, x + 27, 127, C.wood[2], 1); }
  block(m, 13, 10, 1, 1, false);
}

// Realgam's spired, suspended domes finally have an exterior. Region-map unlock
// keys still use the existing lobby; only its arrival map changes.
{
  const name = "RealgamTower_Exterior";
  maps[name] = { name, title: "Realgam Tower", width: 40, height: 36, region: "orre", orrePlace: "RealgamTower_1F", type: "city", music: "em_sootopolis", top: true, collision: [], elevation: [], behavior: [], encounter: [], connections: [], signs: [], triggers: [], hidden: [], people: [], warps: [{ x: 19, y: 23, map: "RealgamTower_1F", warp: 2 }] };
  maps[name].triggers = [17, 18, 19, 20, 21, 22].map((x) => ({ x, y: 35, script: "Orre_WorldMap" }));
  const { m, c, z } = project(name, (x, y) => (x >= 17 && x <= 22 && y >= 22) || ellipse(x, y, 19.5, 26, 16, 5));
  water(c, 24, 330, 592, 160); pave(c, 17 * 16, 23 * 16, 96, 208); c.ellipse(320, 418, 248, 56, C.stone[0], 6);
  cylinder(c, 292, 115, 56, 270, C.stone, C.gold); c.poly([[304, 88], [320, 0], [336, 88]], C.stone[0]);
  for (const [cx, cy, rx, ry] of [[320, 120, 126, 58], [177, 170, 72, 38], [463, 170, 72, 38]]) { cylinder(z, cx - 10, cy - 18, 20, 180, C.stone, C.gold); dome(z, cx, cy, rx, ry, [C.stone[3], C.stone[2], C.stone[1], C.stone[0]]); z.ellipse(cx, cy + 12, rx, ry / 2, C.gold, 3); z.line(cx, cy - ry - 30, cx, cy - ry + 4, C.gold, 3); }
  door(c, 19 * 16 + 8, 24 * 16 - 1, 26, C.dark);
  const lobby = clone(maps.RealgamTower_1F); lobby.warps.push({ x: 9, y: 11, map: name, warp: 0 });
  lobby.triggers = lobby.triggers.filter((t) => t.script !== "Orre_WorldMap");
  lobby.behavior[11 * lobby.width + 9] = 0x65; lobby.collision[11 * lobby.width + 9] = 0;
  lobby.collision[11 * lobby.width + 10] = 1; changed[lobby.name] = lobby;
}

// Persist exact adaptation choices and references alongside the generated maps.
const sources = [
  ["PhenacCity", "https://bulbapedia.bulbagarden.net/wiki/Phenac_City", "https://archives.bulbagarden.net/media/upload/2/2a/Phenac_City.png"],
  ["PyriteTown", "https://bulbapedia.bulbagarden.net/wiki/Pyrite_Town", "https://archives.bulbagarden.net/media/upload/e/ef/Pyrite_Town_Colo.png"],
  ["AgateVillage", "https://bulbapedia.bulbagarden.net/wiki/Agate_Village", "https://archives.bulbagarden.net/media/upload/8/8e/Agate_Village.png"],
  ["TheUnder", "https://bulbapedia.bulbagarden.net/wiki/The_Under", "https://archives.bulbagarden.net/media/upload/b/bf/The_Under_Colo.png"],
  ["MtBattle", "https://bulbapedia.bulbagarden.net/wiki/Mt._Battle", "https://archives.bulbagarden.net/media/upload/6/60/Mt_Battle.png"],
  ["OutskirtStand", "https://bulbapedia.bulbagarden.net/wiki/Outskirt_Stand", "https://archives.bulbagarden.net/media/upload/0/07/Outskirt_Stand.png"],
  ["RealgamTower_Exterior", "https://bulbapedia.bulbagarden.net/wiki/Realgam_Tower", "https://archives.bulbagarden.net/media/upload/d/da/Realgam_Tower.png"]
];
// Restrained lettering and facade details stay readable at native GBA scale.
for (const [name, label, x, y] of [
  ["PhenacCity", "PRE GYM", 315, 315], ["PhenacCity", "PC", 110, 238], ["PhenacCity", "SHOP", 511, 452],
  ["PyriteTown", "PYRITE", 278, 97], ["PyriteTown", "DUKING", 75, 85], ["PyriteTown", "SHOP", 455, 238],
  ["AgateVillage", "SHOP", 364, 355], ["AgateVillage", "PC", 109, 94],
  ["TheUnder", "STUDIO", 89, 286], ["OutskirtStand", "OUTSKIRT STAND", 281, 131],
  ["MtBattle", "01", 138, 417], ["MtBattle", "02", 265, 272], ["MtBattle", "03", 270, 113]
]) text(drawings[name].c, label, x, y, name === "PhenacCity" || name === "AgateVillage" ? C.blue[0] : C.cream);
for (const [name, x, y, w, rows] of [["PhenacCity", 44, 66, 86, 1], ["PhenacCity", 510, 68, 78, 1], ["PhenacCity", 467, 444, 76, 1]]) {
  const c = drawings[name].c;
  for (let j = 0; j < rows; j++) for (let i = 0; i < 3; i++) { c.box(x + i * 22, y + j * 17, 9, 10, C.blue[0], C.stone[2]); c.rect(x + i * 22 + 1, y + j * 17 + 1, 2, 8, C.blue[2]); }
}
for (const m of Object.values(changed)) if (drawings[m.name]) finish(m);
fs.writeFileSync(path.join(root, "data/orre-layouts.js"), "// Generated by tools/build-orre-layouts.js. References and 3D-to-2D decisions: docs/orre-maps.md.\nObject.assign(window.WORLD_MAPS," + JSON.stringify(changed) + ");\nwindow.ORRE_MAP_REFERENCES=" + JSON.stringify(sources) + ";\n");
console.log("Recreated " + Object.keys(changed).length + " Orre maps/entrances from Colosseum references");

// Contact sheet from the same pixels written to the playable map layers.
const preview = canvas(960, 810);
preview.rect(0, 0, preview.w, preview.h, C.dark);
Object.entries(drawings).forEach(([name, { c, z }], index) => {
  const ox = (index % 3) * 320, oy = Math.floor(index / 3) * 270;
  text(preview, name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toUpperCase(), ox + 8, oy + 8, C.cream);
  const scale = Math.min(304 / c.w, 244 / c.h), w = Math.floor(c.w * scale), h = Math.floor(c.h * scale);
  const left = ox + Math.floor((320 - w) / 2), top = oy + 22;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.floor(y / scale) * c.w + Math.floor(x / scale)) * 4;
    preview.p(left + x, top + y, Array.from(c.data.slice(i, i + 4)));
    if (z.data[i + 3]) preview.p(left + x, top + y, Array.from(z.data.slice(i, i + 4)));
  }
});
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
preview.save(path.join(root, "docs/orre-map-preview.png"));
