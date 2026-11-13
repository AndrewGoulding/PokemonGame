// Building and ground artwork for the city layouts (tools/build-city-layouts.js).
// Every piece is cut from a committed Sinnoh city picture, so the new cities share
// one hand-drawn style; nothing is fetched and no source checkout is needed.
"use strict";
const path = require("path");
const { readPng } = require("./png");

module.exports = function (root) {
  const dir = path.join(root, "assets/world/maps"), cache = {};
  // A map's picture with its walk-behind layer flattened onto it.
  function picture(name) {
    if (cache[name]) return cache[name];
    const base = readPng(path.join(dir, name + ".png")), rgba = Uint8ClampedArray.from(base.rgba);
    let top = null;
    try { top = readPng(path.join(dir, name + "-top.png")); } catch (_) { /* no upper layer */ }
    if (top) for (let i = 0; i < rgba.length; i += 4) if (top.rgba[i + 3]) for (let k = 0; k < 4; k++) rgba[i + k] = top.rgba[i + k];
    return (cache[name] = { width: base.width, height: base.height, rgba });
  }
  // The ground a source city lays under its buildings, as 2x2-tile patterns
  // anchored on even tiles. Pixels that still show it are cut out of a stamp.
  const GROUND = {
    JubilifeCity: [[30, 8], [12, 20]],
    HearthomeCity: [[24, 42], [36, 40], [16, 16]],
    CanalaveCity: [[10, 8], [10, 16]],
    SnowpointCity: [[10, 30]],
    SandgemTown: [[24, 0], [26, 18], [4, 14], [4, 12]], TwinleafTown: [[14, 0], [12, 14], [16, 2]], SolaceonTown: [[18, 0], [4, 0], [16, 0]],
    OreburghCity: [[26, 14], [8, 14], [48, 12]], SunyshoreCity: [[46, 6], [8, 6], [8, 4]], ValleyWindworks: [[26, 10], [2, 22], [6, 8]],
    FuegoIronworks: [[20, 12], [28, 12], [16, 12], [22, 12]],
  };
  // [source, x, y, w, h, door column (or null)] in 16px tiles.
  const STAMPS = {
    towerDoor: ["JubilifeCity", 11, 42, 5, 9, 2],
    towerDoor2: ["JubilifeCity", 38, 42, 5, 9, 2],
    towerSlim: ["JubilifeCity", 24, 5, 4, 14, null],
    towerShort: ["JubilifeCity", 55, 48, 4, 9, null],
    brickTall: ["JubilifeCity", 59, 47, 4, 10, null],
    brickFlat: ["JubilifeCity", 51, 12, 5, 7, null],
    dishTower: ["JubilifeCity", 33, 0, 9, 16, 4],
    studio: ["JubilifeCity", 12, 5, 9, 10, 4],
    centerRed: ["JubilifeCity", 49, 33, 7, 6, 3],
    centerBlue: ["JubilifeCity", 50, 24, 5, 5, 2],
    academy: ["JubilifeCity", 35, 31, 10, 8, 6],
    twinFountain: ["JubilifeCity", 17, 47, 4, 4, null],
    parkFountain: ["JubilifeCity", 35, 24, 9, 5, null],
    bench: ["JubilifeCity", 23, 53, 1, 2, null],
    bush: ["JubilifeCity", 28, 10, 1, 1, null],
    board: ["JubilifeCity", 14, 18, 1, 1, null],
    hall: ["HearthomeCity", 26, 8, 11, 8, 5],
    hearthCenter: ["HearthomeCity", 13, 18, 7, 6, 3],
    gable: ["HearthomeCity", 20, 18, 4, 6, 1],
    gym: ["HearthomeCity", 49, 19, 7, 5, 3],
    mart: ["HearthomeCity", 28, 30, 5, 5, 2],
    church: ["HearthomeCity", 8, 27, 8, 8, 3],
    fountain: ["HearthomeCity", 19, 40, 3, 4, null],
    hedge: ["HearthomeCity", 24, 20, 1, 1, null],
    barrel: ["HearthomeCity", 24, 12, 1, 1, null],
    temple: ["SnowpointCity", 10, 3, 10, 7, 4],
    cabin: ["SnowpointCity", 0, 16, 5, 5, 1],
    snowGym: ["SnowpointCity", 12, 31, 7, 5, 3],
    snowMart: ["SnowpointCity", 0, 42, 5, 5, 2],
    snowCenter: ["SnowpointCity", 25, 41, 5, 5, 2],
    // Region layouts (tools/build-region-layouts.js).
    lab: ["SandgemTown", 6, 5, 8, 5, 3],
    pcSmall: ["SandgemTown", 15, 6, 5, 4, 2],
    martSmall: ["SandgemTown", 25, 6, 5, 4, 2],
    logHouse: ["TwinleafTown", 10, 6, 6, 6, 1],
    peak: ["TwinleafTown", 21, 6, 4, 6, 1],
    apartment: ["OreburghCity", 19, 3, 3, 6, null],
    oreGym: ["OreburghCity", 28, 13, 7, 5, 3],
    whiteHall: ["OreburghCity", 49, 3, 12, 7, 3],
    works: ["ValleyWindworks", 16, 7, 7, 7, 3],
    factory: ["FuegoIronworks", 3, 4, 13, 13, 6],
    flat: ["SunyshoreCity", 45, 1, 6, 5, 3],
    lighthouse: ["SunyshoreCity", 57, 43, 3, 7, 1],
    tree1: ["SolaceonTown", 39, 0, 2, 3, null],
    honeyTree: ["ValleyWindworks", 21, 14, 2, 3, null],
    boulder: ["SolaceonTown", 9, 21, 2, 3, null],
    barrels: ["CanalaveCity", 19, 11, 1, 2, null],
  };
  const TILES = {
    paving: ["JubilifeCity", 30, 8], asphalt: ["JubilifeCity", 12, 20],
    brick: ["HearthomeCity", 24, 42], ornate: ["HearthomeCity", 36, 40],
    water: ["CanalaveCity", 16, 3], deck: ["CanalaveCity", 22, 15],
    lawn: ["HearthomeCity", 42, 14, 1], tree: ["HearthomeCity", 14, 6],
    rock: ["EternaCity", 40, 44], grass: ["EternaCity", 12, 12], meadow: ["PastoriaCity", 40, 20],
    flowersRed: ["FloaromaTown", 20, 6], flowersBlue: ["FloaromaTown", 14, 6], flowersPink: ["FloaromaTown", 12, 44],
    sand: ["FloaromaTown", 19, 46, 1], snow: ["SnowpointCity", 10, 30], pine: ["SnowpointCity", 22, 10],
    tallgrass: ["Route201", 42, 6, 1], snowgrass: ["Route217", 31, 2, 1], marshgrass: ["GreatMarsh", 18, 6, 1],
    desert: ["Route228", 8, 6], palms: ["Route228", 2, 0], marsh: ["GreatMarsh", 20, 10], beach: ["Route213", 28, 20], sea: ["Route213", 88, 4],
    gravel: ["OreburghCity", 26, 14], clay: ["SunyshoreCity", 46, 6], planks: ["SunyshoreCity", 30, 12],
    dirt: ["TwinleafTown", 18, 7, 1], drift: ["Route216", 20, 0], field: ["Route201", 56, 6],
  };
  // Neighbouring trees, hedges and fences that fall inside a stamp's rectangle.
  const green = ([r, g, b]) => g > r * 1.15 && g > b * 1.15;
  const STRAY = {
    dishTower: (x, y, col) => y < 40 && green(col),
    studio: (x, y, col) => y < 88 && green(col),
    hearthCenter: (x, y, col) => x >= 96 && green(col),
    church: (x, y, col) => x < 24 && y >= 104 && green(col),
    hall: (x, y) => y < 16 && (x < 26 || x >= 150),
    snowCenter: (x, y, [r, g, b]) => y < 14 && g > r,
    cabin: (x, y, [r, g, b]) => y < 20 && g > r * 1.2 && b > r,
    martSmall: (x, y) => x < 16 && y >= 48,
    factory: (x, y, col) => y < 20 && green(col),
    lab: (x, y, col) => x >= 100 && y >= 64 && !(col[0] > 150 && col[1] > 150 && col[2] > 150) && green(col),
  };
  const same = (a, i, b, j) => a[i] === b[j] && a[i + 1] === b[j + 1] && a[i + 2] === b[j + 2];
  // Pixels of a stamp: null where the source shows only its own ground.
  function cut(name) {
    const [src, sx, sy, w, h, door] = STAMPS[name], p = picture(src), refs = GROUND[src] || [];
    const out = new Uint8ClampedArray(w * 16 * h * 16 * 4);
    for (let y = 0; y < h * 16; y++) for (let x = 0; x < w * 16; x++) {
      const px = sx * 16 + x, py = sy * 16 + y;
      if (px < 0 || py < 0 || px >= p.width || py >= p.height) continue;
      const i = (py * p.width + px) * 4;
      const ground = refs.some(([gx, gy]) => same(p.rgba, i, p.rgba, ((gy * 16 + (py & 31)) * p.width + gx * 16 + (px & 31)) * 4));
      if (ground || !p.rgba[i + 3]) continue;
      if (STRAY[name] && STRAY[name](x, y, [p.rgba[i], p.rgba[i + 1], p.rgba[i + 2]])) continue;
      out.set(p.rgba.subarray(i, i + 4), (y * w * 16 + x) * 4);
    }
    return { name, w, h, door, rgba: out };
  }
  // Draw a stamp with its top-left tile at (tx, ty). rows picks source rows
  // (to shorten or stretch a tower); tint recolours its red trim.
  function draw(c, name, tx, ty, opts = {}) {
    const s = cut(name), rows = opts.rows || Array.from({ length: s.h }, (_, i) => i);
    rows.forEach((row, j) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < s.w * 16; x++) {
        const i = ((row * 16 + y) * s.w * 16 + x) * 4;
        if (!s.rgba[i + 3]) continue;
        let col = [s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]];
        if (opts.tint) col = opts.tint(col);
        c.p(tx * 16 + x, (ty + j) * 16 + y, col);
      }
    });
    return { x: tx, y: ty, w: s.w, h: rows.length, door: s.door == null ? null : { x: tx + s.door, y: ty + rows.length - 1 } };
  }
  function tile(c, kind, x, y) {
    const [src, sx, sy, period = 2] = TILES[kind], p = picture(src);
    const ox = (sx + x % period) * 16, oy = (sy + y % period) * 16;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const k = ((oy + j) * p.width + ox + i) * 4; c.p(x * 16 + i, y * 16 + j, [p.rgba[k], p.rgba[k + 1], p.rgba[k + 2]]); }
  }
  // Red trim -> another hue, keeping its shading.
  const trim = (r, g, b) => ([R, G, B]) => (R > 120 && R > G * 1.6 && R > B * 1.6) ? [Math.round(R * r), Math.round(R * g), Math.round(R * b)] : [R, G, B];
  return { STAMPS, TILES, picture, cut, draw, tile, trim };
};
