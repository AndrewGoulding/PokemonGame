// Builds Johto's Town Map: HGSS's Pokégear map of Johto (a pret/pokeheartgold
// checkout) drawn again in FireRed's region-map tiles (pret/pokefirered), as
// Kanto's is (tools/build-town-map.js).
//
//   node tools/build-johto-town-map.js <path to pokeheartgold> <path to pokefirered>
//   (or set POKEHEARTGOLD and POKEFIRERED)
//
// Writes:
//   assets/town-map/johto.png     the map, 240x160: FireRed's sea and frame,
//                                 and Johto as HGSS's Pokégear draws it
//                                 (files/application/pokegear/map/pgmap_gra:
//                                 its map, 8 pixels to each square of HGSS's
//                                 world matrix), tile by tile in FireRed's
//                                 region_map.png: each 8x8 square gets the
//                                 FireRed tile (one of those Kanto's and the
//                                 Sevii Islands' maps use) nearest what HGSS
//                                 draws there: sea, land (lighter as it climbs),
//                                 route, sea route, town.
//   tools/lib/johto-town-map.generated.js
//                                 window.JOHTO_TOWN_MAP: the grid (27 x 14
//                                 squares: HGSS's Pokégear columns 2-28, its
//                                 world matrix rows 1-14), its map and dungeon
//                                 layers of map sections (HGSS's sLocationSpecs,
//                                 src/application/pokegear/map/pokegear_map.c:
//                                 the first place listed at a square is the one
//                                 there, as in PokegearMap_GetLocationSpecByCoord),
//                                 their names (msg_0279), the section of each of
//                                 Johto's maps (src/data/map_headers.h's .mapsec,
//                                 its names as tools/build-johto.js gives them),
//                                 the square each map is at, and Fly's landing
//                                 spots (sSpawnMaps, asm/unk_0203BA5C.s).
//                                 tools/build-johto.js puts it at the end of
//                                 data/johto-maps.js. Grid square (x, y) is at
//                                 pixels (x0 + 8x, y0 + 8y).
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { readPng, writePng, readPal } = require("./lib/png");
const { paletteRam, renderBg } = require("./lib/gba");

const HG = process.argv[2] || process.env.POKEHEARTGOLD;
const FR = process.argv[3] || process.env.POKEFIRERED;
if (!HG || !fs.existsSync(path.join(HG, "files/application/pokegear/map/pgmap_gra")) || !FR || !fs.existsSync(path.join(FR, "graphics/region_map/kanto.bin"))) {
  console.error("Usage: node tools/build-johto-town-map.js <path to pret/pokeheartgold> <path to pret/pokefirered>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
const H = (...p) => path.join(HG, ...p);
const G = (f) => path.join(FR, "graphics/region_map", f);
const src = (f) => fs.readFileSync(H(f), "utf8");

// The grid: HGSS's Pokégear squares are its world matrix's (one 32x32-tile
// chunk each), two rows down (FlyMap_InitParam: matrixYCoord + 2). Johto is
// columns 2-28 (Route 47 to Route 26) and matrix rows 1-14 (Lake of Rage to
// Azalea), here at x0, y0 on the 240x160 map.
const COL0 = 2, ROW0 = 1, W = 27, HT = 14, X0 = 16, Y0 = 32;
const cellOf = (pgX, pgY) => [pgX - COL0, pgY - 2 - ROW0];   // (a Pokégear square's)
const onGrid = ([x, y]) => x >= 0 && y >= 0 && x < W && y < HT;

// ---------- HGSS's maps and map sections ----------

const mapIds = {};
for (const m of src("include/constants/maps.h").matchAll(/#define\s+(MAP_\w+)\s+(\d+)/g)) if (!(m[1] in mapIds)) mapIds[m[1]] = +m[2];
const headers = {};
for (const m of src("src/data/map_headers.h").matchAll(/\[(MAP_\w+)\] = \{([^}]*)\}/g)) {
  const get = (k) => { const r = new RegExp("\\." + k + "\\s*=\\s*([^,\\n]+)").exec(m[2]); return r ? r[1].trim() : null; };
  headers[m[1]] = { mapsec: (get("mapsec") || "").replace(/^MAPSEC_/, ""), type: get("mapType"), wx: +get("worldMapX"), wy: +get("worldMapY"),
    ownMatrix: !/map_matrix_0000/.test(get("matrixId") || "map_matrix_0000") };
}
const mapsecNo = {};
for (const m of src("include/constants/map_sections.h").matchAll(/#define MAPSEC_(\w+)\s+(\d+)/g)) mapsecNo[m[1]] = +m[2];
// Names (msg_0279, by map section), Pokémon's names in them as other names
// are (SLOWPOKE Well: Slowpoke Well), as tools/build-johto.js titles maps.
const places = JSON.parse(src("files/msgdata/msg/msg_0279.json")).messages.map((x) => [].concat(x.en_US || "").join("").replace(/’/g, "'"));
const nameOf = (sec) => (places[mapsecNo[sec]] || "").replace(/\b([A-Z])([A-Z]{3,})\b/g, (x, a, b) => a + b.toLowerCase());

// Johto's maps as the game names them: tools/build-johto.js --list (HGSS's
// constant, the game's name, ...), and the second floors the game adds to
// each Pokémon Center (in the same place as the first).
const list = execFileSync(process.execPath, [path.join(__dirname, "build-johto.js"), HG, "--list"], { encoding: "utf8", maxBuffer: 1 << 26 })
  .split("\n").filter(Boolean).map((l) => l.split("  "));
const nameOfConst = Object.fromEntries(list.map(([c, name]) => [c, name]));
const mapSections = {};
for (const [c, name] of list) {
  const sec = headers[c] && headers[c].mapsec;
  if (!sec || sec === "NONE") continue;
  mapSections[name] = sec;
  if (/_PokemonCenter_1F$/.test(name)) mapSections[name.replace(/_1F$/, "_2F")] = sec;
}
const used = new Set(Object.values(mapSections));

// ---------- The grid ----------

// sLocationSpecs: each place's rectangle of Pokégear squares. Caves, forests
// and towers (MAP_TYPE_CAVE) are FireRed's dungeon layer; the rest the map
// layer. Only Johto's places the game has (not Kanto's), and not those HGSS
// keeps off its map (ov101_021EA6C4): Sinjoh Ruins and the S.S. Aqua's open sea.
const pg = src("src/application/pokegear/map/pokegear_map.c");
const specs = [...pg.slice(pg.indexOf("sLocationSpecs[PGMAP_NUM_LOCATIONS] = {")).matchAll(
  /\.mapId = (\w+),\s*\.x = (\d+),\s*\.y = (\d+),\s*\.width = (\d+),\s*\.height = (\d+),\s*\.objXoffset = (\d+),\s*\.objYoffset = (\d+)/g)]
  .map((m) => ({ map: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], ox: +m[6], oy: +m[7], sec: headers[m[1]].mapsec, type: headers[m[1]].type }))
  .filter((s) => used.has(s.sec) && s.map !== "MAP_SS_AQUA_1F" && s.map !== "MAP_SINJOH_RUINS_EXTERIOR");
const blank = () => Array.from({ length: HT }, () => Array(W).fill(null));
const map = blank(), dungeon = blank();
for (const s of specs) {
  const layer = s.type === "MAP_TYPE_CAVE" ? dungeon : map;
  for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
    const [gx, gy] = cellOf(x, y);
    if (onGrid([gx, gy]) && !layer[gy][gx]) layer[gy][gx] = s.sec;
  }
}
const onTheGrid = new Set([...map.flat(), ...dungeon.flat()].filter(Boolean));

// HGSS's fly points (gMapFlypointParams: the place named, and the map Fly takes you to).
const flyParams = [...src("src/application/pokegear/map/overlay_101_021F79B4.c").matchAll(/\{\s*(MAP_\w+),\s*(MAP_\w+),\s*FLYPOINT_\w+,/g)].map((m) => ({ name: m[1], warp: m[2] }));

// Where each map is: HGSS's world matrix (map_matrix_0000) for the maps
// outdoors, their top-left chunk (each 32 tiles a square on); the header's
// worldMapX/Y for the rest (caves, houses: where HGSS's Pokégear puts you).
const mtxDir = H("files/fielddata/mapmatrix/map_matrix");
const mtx = (() => {
  const b = fs.readFileSync(path.join(mtxDir, fs.readdirSync(mtxDir).sort().find((f) => f.startsWith("map_matrix_0000"))));
  let p = 0;
  const w = b[p++], h = b[p++], hasHeaders = b[p++]; p += 1; p += b[p] + 1;
  const hdr = []; for (let i = 0; i < w * h; i++) hdr.push(hasHeaders ? b.readUInt16LE(p + 2 * i) : 0);
  return { w, h, hdr };
})();
const chunkOrigin = (c) => {
  let best = null;
  for (let z = 0; z < mtx.h; z++) for (let x = 0; x < mtx.w; x++) if (mtx.hdr[z * mtx.w + x] === mapIds[c] && (!best || z < best[1] || (z === best[1] && x < best[0]))) best = [x, z];
  return best;
};
const at = {};
for (const [c, name] of list) {
  const h = headers[c];
  if (!h || !mapSections[name]) continue;
  const o = (h.type === "MAP_TYPE_ROUTE" || h.type === "MAP_TYPE_CITY_TOWN") && chunkOrigin(c);
  // ([x, y] on the grid, and 1 for a map outdoors: add a square every 32 tiles.)
  const cell = o ? [o[0] - COL0, o[1] - ROW0, 1] : [h.wx - COL0, h.wy - ROW0];
  if (onGrid(cell)) at[name] = cell;
  if (at[name] && /_PokemonCenter_1F$/.test(name)) at[name.replace(/_1F$/, "_2F")] = cell;
}

// Fly (sSpawnMaps: the fly points' landing spots, in tiles across the whole
// world matrix, or a map's own): outside each town's Pokémon Center, as
// FireRed's are, and its Pokémon Center (or your house in New Bark Town):
// going in counts as a visit. (Only HGSS's fly points: not the Pokéathlon
// Dome's nor Route 26's.)
const fly = {};
for (const m of src("asm/unk_0203BA5C.s").matchAll(/^\s*spawn (\w+), (\d), (\d), (MAP_\w+), \d+, \d+, (MAP_\w+), (0x[0-9A-F]+), (0x[0-9A-F]+),/gm)) {
  const [, , , isFly, center, to, gx, gy] = m;
  const f = flyParams.find((p) => p.warp === to), o = headers[to] && (headers[to].ownMatrix ? [0, 0] : chunkOrigin(to));
  if (isFly !== "1" || !f || !o || !nameOfConst[to] || !onTheGrid.has(headers[f.name].mapsec)) continue;
  fly[headers[f.name].mapsec] = Object.assign({ map: nameOfConst[to], x: parseInt(gx, 16) - 32 * o[0], y: parseInt(gy, 16) - 32 * o[1] },
    nameOfConst[center] && center !== to ? { center: nameOfConst[center] } : {});
}
// The towns (FireRed's GetMapsecType's: the places you visit and fly to), and
// the square with each one's icon: the middle of its rectangle, where HGSS
// puts it (objXoffset, objYoffset).
const towns = Object.keys(fly), townCell = {};
for (const sec of towns) {
  const s = specs.find((sp) => sp.sec === sec && sp.type !== "MAP_TYPE_CAVE");
  townCell[sec] = cellOf(Math.floor((s.x * 8 + s.ox) / 8), Math.floor((s.y * 8 + s.oy) / 8));
}

const names = {};
for (const sec of new Set([...used, ...onTheGrid])) if (nameOf(sec)) names[sec] = nameOf(sec);

// ---------- The picture ----------

// HGSS's map (pgmap_gra 10, an 8bpp tile sheet; 11, its 64x64 screen; 20, the palette).
const nitroBlock = (b) => b.readUInt16LE(12);   // (the first block after the header)
function nscr(file) {
  const b = fs.readFileSync(file), p = nitroBlock(b), w = b.readUInt16LE(p + 8), len = b.readUInt32LE(p + 16);
  const d = []; for (let i = 0; i < len / 2; i++) d.push(b.readUInt16LE(p + 20 + 2 * i));
  return { w: w / 8, d };
}
function nclr(file) {
  const b = fs.readFileSync(file), p = nitroBlock(b), len = b.readUInt32LE(p + 16), c = [];
  for (let i = 0; i < len / 2; i++) { const v = b.readUInt16LE(p + 0x18 + 2 * i); c.push([(v & 31) << 3, ((v >> 5) & 31) << 3, ((v >> 10) & 31) << 3]); }
  return c;
}
const PG = (n, ext) => H("files/application/pokegear/map/pgmap_gra/pgmap_gra_" + String(n).padStart(8, "0") + "." + ext);
const hgss = (() => {
  const sheet = readPng(PG(10, "png")), scr = nscr(PG(11, "NSCR")), pal = nclr(PG(20, "NCLR"));
  const w = scr.w * 8, h = Math.ceil(scr.d.length / scr.w) * 8, px = new Array(w * h).fill(null), per = sheet.width / 8;
  scr.d.forEach((e, i) => {
    const t = e & 0x3ff, tx = (i % scr.w) * 8, ty = Math.floor(i / scr.w) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sx = (t % per) * 8 + (e & 0x400 ? 7 - x : x), sy = Math.floor(t / per) * 8 + (e & 0x800 ? 7 - y : y);
      if (sy < sheet.height) px[(ty + y) * w + tx + x] = pal[sheet.px[sy * sheet.width + sx]];
    }
  });
  return { w, h, at: (x, y) => (x >= 0 && y >= 0 && x < w && y < h && px[y * w + x]) || [0, 0, 0] };
})();
// Our map's pixel (x, y) is HGSS's (x + DX, y + DY).
const DX = 8 * COL0 - X0, DY = 8 * (ROW0 + 2) - Y0;

// What HGSS draws, by colour: sea; land, by how high (its green lowlands
// 0-1, its brown contours 2, its tan hills 3-4); roads (white, outlined);
// sea routes (light blue); towns (red); the rest (trees, mountains, the
// outlines) is the land or sea under it.
const hex = (c) => c.map((v) => v.toString(16).padStart(2, "0")).join("");
const HG_CLASS = {
  "50b8d8": "S", "38a0b8": "S", "40b0c8": "S", "88d8f0": "S", "1878d8": "S",
  "50b080": 0, "60c090": 1, "70c890": 1, "489868": 1, "407858": 1, "e87820": 1, "f09828": 1, "c06828": 1, "f8b830": 1,
  "a08058": 2, "706050": 2, "c09068": 2, "d8a070": 3, "f0b080": 4,
  "f8f8f8": "road", "60b0f8": "water", "f85060": "town", "a03048": "town", "c83848": "town"
};
const MW = 240, MH = 160;
const ground = new Array(MW * MH).fill(null), mark = new Array(MW * MH).fill(null);
for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
  const k = HG_CLASS[hex(hgss.at(x + DX, y + DY))];
  if (k === "S" || typeof k === "number") ground[y * MW + x] = k;
  else if (k) mark[y * MW + x] = k;
}
// (Under the icons: the nearest ground, spreading out a pixel at a time.)
for (let open = true; open;) {
  open = false;
  const next = ground.slice();
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (ground[y * MW + x] != null) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = ground[(y + dy) * MW + x + dx];
      if (x + dx >= 0 && x + dx < MW && y + dy >= 0 && y + dy < MH && v != null) { next[y * MW + x] = v; break; }
    }
    if (next[y * MW + x] == null) open = true;
  }
  for (let i = 0; i < next.length; i++) ground[i] = next[i];
}

// FireRed's tiles: every tile (with its palette and flips) of Kanto's and the
// Sevii Islands' maps, and what each of its pixels is: region_map.pal's
// palette 0 is the sea (0, 14-15), the land from dark to light (1-5), the
// routes over it (6-10), the bridge (11), the sea routes (12-13); palette 1
// the town icon.
const sheet = readPng(G("region_map.png"));
const frPal = readPal(G("region_map.pal"));
const CLASS0 = ["S", "L0", "L1", "L2", "L3", "L4", "R0", "R1", "R2", "R3", "R4", "B", "W", "W", "S", "S"];
const counts = new Map();
for (const bin of ["kanto.bin", "sevii_123.bin", "sevii_45.bin", "sevii_67.bin"]) {
  const d = fs.readFileSync(G(bin));
  for (let i = 0; i < d.length / 2; i++) { const e = d.readUInt16LE(i * 2); counts.set(e, (counts.get(e) || 0) + 1); }
}
const TOWN_TILE = 0x1001;
// (And each of them flipped, as the GBA can, a little less likely.)
const tiles = [], seen = new Set();
for (const [orig, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  if (orig >> 12 !== 0) continue;
  for (const flip of [0, 0x400, 0x800, 0xc00]) {
    const e = orig ^ flip;
    if (seen.has(e)) continue;
    seen.add(e);
    const t = e & 0x3ff, sx = (t % 16) * 8, sy = Math.floor(t / 16) * 8, cls = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) cls.push(CLASS0[sheet.px[(sy + (e & 0x800 ? 7 - y : y)) * sheet.width + sx + (e & 0x400 ? 7 - x : x)] & 15]);
    tiles.push({ e, n: flip ? n / 2 : n, cls });
  }
}
// How unlike two pixels are.
const level = (c) => +c.slice(1);
function cost(want, have) {
  if (want === have) return 0;
  const a = want[0], b = have[0];
  if (a === b && (a === "L" || a === "R")) return (a === "L" ? 0.7 : 0.3) * Math.abs(level(want) - level(have));
  const pair = a + b;
  if (pair === "SW" || pair === "WS") return 3;
  if (pair === "RB" || pair === "BR") return 2;
  return 9;
}

// What each square of the map should be: the ground under it, or a route
// across it (where HGSS draws a road through its middle), a sea route, a town.
const target = new Array(MW * MH).fill("S");
// (HGSS's heights as FireRed's shades: its lowlands FireRed's dark greens, its
// hills its lighter ones, the lightest only on the tops.)
const HEIGHT = [0, 1, 1.8, 2.5, 3.3];
for (let i = 0; i < ground.length; i++) target[i] = ground[i] === "S" ? "S" : "L" + HEIGHT[ground[i]];
const middle = (cx, cy, kind) => {
  let n = 0;
  for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) if (mark[(cy * 8 + y) * MW + cx * 8 + x] === kind) n++;
  return n;
};
const out = Array.from({ length: MH / 8 }, () => Array(MW / 8).fill(0x0003));
const isTown = {};
for (const [sec, [gx, gy]] of Object.entries(townCell)) isTown[((Y0 / 8 + gy) * (MW / 8)) + X0 / 8 + gx] = sec;
for (let cy = 2; cy < MH / 8; cy++) for (let cx = 1; cx < MW / 8 - 1; cx++) {
  if (isTown[cy * (MW / 8) + cx]) { out[cy][cx] = TOWN_TILE; continue; }
  const route = middle(cx, cy, "road") + middle(cx, cy, "town") >= 4, sea = !route && middle(cx, cy, "water") >= 4;
  if (route || sea) {
    // (The route's colour lighter as the land under it climbs, as FireRed's.)
    let sum = 0, n = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const g = ground[(cy * 8 + y) * MW + cx * 8 + x]; if (g !== "S") { sum += HEIGHT[g]; n++; } }
    // (Kanto's routes are its darkest orange in the lowlands: lighter only up the hills.)
    const r = sea || !n ? "W" : "R" + Math.max(0, Math.min(4, Math.round(sum / n - 1)));
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) target[(cy * 8 + y) * MW + cx * 8 + x] = r;
  }
  let best = null, bestCost = Infinity;
  for (const t of tiles) {
    let c = -0.4 * Math.log(t.n);   // (the more Kanto uses a tile, the likelier it fits)
    for (let y = 0; y < 8 && c < bestCost; y++) for (let x = 0; x < 8; x++) c += cost(target[(cy * 8 + y) * MW + cx * 8 + x], t.cls[y * 8 + x]);
    if (c < bestCost) { bestCost = c; best = t; }
  }
  out[cy][cx] = best.e;
}
// The frame: FireRed's black bar along the top and white edges (region_map.png's
// 0x2000 and 0x200e), here at the screen's sides, round the sea (background.png).
const bg = Buffer.alloc(30 * 20 * 2), fg = Buffer.alloc(30 * 20 * 2);
for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
  bg.writeUInt16LE(y < 2 ? 0x2000 : 0x1000, (y * 30 + x) * 2);
  fg.writeUInt16LE(y < 2 ? 0x2000 : x === 0 || x === 29 ? 0x200e : out[y][x], (y * 30 + x) * 2);
}
const ram = paletteRam([[0, frPal]]);
const back = renderBg({ tiles: G("background.png"), map: bg, widthTiles: 30, heightTiles: 20, rowWidth: 30, ram, opaque: true });
const land = renderBg({ tiles: G("region_map.png"), map: fg, widthTiles: 30, heightTiles: 20, rowWidth: 30, ram, lowNibble: true });
const rgba = new Uint8ClampedArray(back.rgba);
for (let i = 0; i < rgba.length; i += 4) if (land.rgba[i + 3]) rgba.set(land.rgba.subarray(i, i + 4), i);
writePng(path.join(root, "assets/town-map/johto.png"), 240, 160, rgba);

// ---------- The data ----------

const data = { id: "JOHTO", label: "Johto", image: "assets/town-map/johto.png", x0: X0, y0: Y0, width: W, height: HT, map, dungeon, names, mapSections, at, towns, fly };
const file = path.join(__dirname, "lib/johto-town-map.generated.js");
fs.writeFileSync(file, "// Johto's Town Map (tools/build-johto-town-map.js, from pret/pokeheartgold's Pokégear map, in pret/pokefirered's region-map tiles).\n" +
  "window.JOHTO_TOWN_MAP = " + JSON.stringify(data) + ";\n");
console.log("wrote assets/town-map/johto.png and " + path.relative(root, file) + ": " + W + "x" + HT + " grid, " + onTheGrid.size + " places on it, " +
  Object.keys(mapSections).length + " maps placed, Fly to " + Object.keys(fly).join(", "));
