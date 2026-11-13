// Themed layouts for the rest of Kalos and Unova: every town, route and outdoor
// landmark that still used the generic "cross of paths on a lawn" template.
// Run: node tools/build-region-layouts.js
//
// Unlike tools/build-city-layouts.js (hand-drawn street plans), these are grown
// from each map's own anchors: every door, gate, person, sign and stored landing
// stays on the tile it had, and the ground between them is laid out again with
// winding roads, grass, groves, shores and buildings cut from the Sinnoh
// pictures. Reads the committed base maps; writes data/region-layouts.js and
// each map's picture. See docs/city-layouts.md.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, ".."), out = path.join(root, "assets/world/maps");
const { canvas, hash } = require("./lib/orre-art");
const A = require("./lib/city-stamps")(root);
const ONLY = process.argv[2] ? new RegExp(process.argv[2]) : null, DRY = process.argv.includes("--dry");

const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="(data\/[^"]+)"><\/script>/g))
  if (file !== "data/region-layouts.js") vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
const HOMES = { KALOS_DATA: ctx.KALOS_DATA.maps, UNOVA_DATA: ctx.UNOVA_DATA.maps, UNOVA_BW_DATA: ctx.UNOVA_BW_DATA.maps };
const homeOf = (name) => Object.keys(HOMES).find((k) => HOMES[k][name]);
const typeOf = (name) => { const h = homeOf(name); return h ? HOMES[h][name].type : (ctx.WORLD_MAPS && ctx.WORLD_MAPS[name] || {}).type; };
const DOOR = 0x69, STEP = 0x61, WATER = 0x10;
const isWater = (b) => b === 0x10 || b === 0x11;
const done = new Set(ctx.CITY_LAYOUTS || []);

// Stored landing points (Fly, interior returns, story arrivals, hidden items) per map.
const landings = {};
{
  const seen = new Set();
  (function walk(o) {
    if (!o || typeof o !== "object" || seen.has(o)) return; seen.add(o);
    if (typeof o.map === "string" && Number.isInteger(o.x) && Number.isInteger(o.y) && !("warp" in o)) (landings[o.map] = landings[o.map] || []).push([o.x, o.y]);
    for (const k of Object.keys(o)) { if (Array.isArray(o) && o.length > 4000) return; walk(o[k]); }
  })({ K: ctx.KALOS_DATA, U: ctx.UNOVA_DATA, B: ctx.UNOVA_BW_DATA });
}
// Maps of other regions drawn with one of these maps' old pictures keep it as "...Classic".
const borrowed = {}, aliases = {};
for (const key of Object.keys(ctx)) for (const m of Object.values((ctx[key] && ctx[key].maps) || {}))
  if (m && m.image && m.image !== m.name && homeOf(m.image)) (borrowed[m.image] = borrowed[m.image] || []).push([key, m.name]);
function keepClassic(name) {
  if (!borrowed[name]) return;
  aliases[name] = borrowed[name];
  if (DRY || fs.existsSync(path.join(out, name + "Classic.png"))) return;
  for (const f of fs.readdirSync(out)) if (f === name + ".png" || (f.startsWith(name + "-") && /^-(top|border|anim)\.png$/.test(f.slice(name.length)))) fs.copyFileSync(path.join(out, f), path.join(out, name + "Classic" + f.slice(name.length)));
}

// ---------------------------------------------------------------- noise and search
const vnoise = (x, y, seed) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, s = (t) => t * t * (3 - 2 * t); const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed); return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy); };
const fbm = (x, y, seed) => vnoise(x / 7, y / 7, seed) * 0.6 + vnoise(x / 3, y / 3, seed + 11) * 0.3 + vnoise(x, y, seed + 23) * 0.1;
function heap() { const a = []; return { size: () => a.length, push(v) { a.push(v); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }, pop() { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } }; }
// Cheapest path over the grid; cost(i) is Infinity for a blocked cell.
function route(W, H, from, goal, cost, turn = 0) {
  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1], best = new Float64Array(W * H * 4).fill(Infinity), prev = new Int32Array(W * H * 4).fill(-1), h = heap();
  for (let d = 0; d < 4; d++) { best[from * 4 + d] = 0; h.push([0, from * 4 + d]); }
  while (h.size()) {
    const [c, s] = h.pop(); if (c > best[s]) continue;
    const i = s >> 2, d = s & 3;
    if (goal(i)) { const cells = []; for (let k = s; k >= 0; k = prev[k]) cells.push(k >> 2); return cells.reverse(); }
    const x = i % W, y = (i / W) | 0;
    for (let e = 0; e < 4; e++) {
      const nx = x + DX[e], ny = y + DY[e]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx, w = cost(j); if (!(w < Infinity)) continue;
      const n = c + w + (e === d ? 0 : turn), t = j * 4 + e;
      if (n < best[t]) { best[t] = n; prev[t] = s; h.push([n, t]); }
    }
  }
  return null;
}

// ---------------------------------------------------------------- themes
const KINDS = {
  cobble: { tile: "ornate", tint: [244, 228, 190, 120] }, darkpave: { tile: "paving", tint: [34, 36, 66, 150] }, neon: { tile: "asphalt", tint: [30, 20, 60, 110] },
  ash: { tile: "clay", tint: [70, 50, 50, 90] }, ashrock: { tile: "rock", tint: [150, 60, 40, 90] }, autumn: { tile: "grass", tint: [210, 170, 70, 70] }, autumngrass: { tile: "tallgrass", tint: [220, 140, 40, 90] },
  autumntree: { tile: "tree", tint: [230, 120, 20, 105] }, darktree: { tile: "tree", tint: [10, 30, 50, 90] }, shade: { tile: "grass", tint: [20, 60, 60, 70] }, shadegrass: { tile: "tallgrass", tint: [10, 40, 50, 80] },
  darkgrass: { tile: "tallgrass", tint: [10, 40, 40, 110] }, frost: { tile: "grass", tint: [220, 235, 250, 150] }, rail: { tile: "deck", tint: [40, 40, 50, 130] }, frostpath: { tile: "dirt", tint: [236, 242, 252, 150] }, steel: { tile: "paving", tint: [120, 140, 170, 110] },
  runway: { tile: "asphalt", tint: [20, 20, 30, 70] }, bog: { tile: "sea", tint: [70, 90, 50, 130] }, lawnpath: { tile: "sand", tint: [255, 255, 255, 0] },
};
const tileOf = (kind) => KINDS[kind] || { tile: kind };
const roofTint = (r, g, b) => ([R, G, B]) => (Math.abs(R - G) < 16 && Math.abs(G - B) < 24 && R < 124) ? [Math.min(255, R * r), Math.min(255, G * g), Math.min(255, B * b)] : [R, G, B];
const ROOFS = [null, roofTint(1.5, 0.8, 0.8), roofTint(0.8, 1, 1.6), roofTint(1.9, 1.5, 0.6), roofTint(0.7, 1.4, 0.8)];
const greenTo = (f) => ([r, g, b]) => (g > r * 1.12 && g > b * 1.12 ? f(r, g, b) : [r, g, b]);
const TREE_TINT = { frost: greenTo((r, g, b) => [Math.min(255, g + 70), Math.min(255, g + 85), Math.min(255, g + 110)]), autumn: greenTo((r, g, b) => [Math.min(255, g * 1.3), g * 0.72, b * 0.35]), dark: greenTo((r, g, b) => [r * 0.6, g * 0.72, b * 0.8]) };
const BASE = { ground: "grass", road: "dirt", border: "tree", grass: "tallgrass", tree: "tree1", density: 0.3, groves: 0.1, wander: 1, turn: 1.5, width: 2, flowers: 0.1, rough: true,
  center: ["pcSmall", "hearthCenter"], gym: ["gym", "oreGym"], mart: ["martSmall", "mart"], big: ["hall", "church", "works", "whiteHall", "flat"], house: ["logHouse", "peak", "gable"] };
const THEMES = {
  plains: {},
  meadow: { ground: "meadow", flowers: 0.3, density: 0.2 },
  garden: { ground: "lawn", road: "cobble", flowers: 0.45, density: 0.12, tree: "hedge", groves: 0, turn: 5, wander: 0.2 },
  forest: { ground: "shade", grass: "shadegrass", density: 0.6, groves: 0.3, wander: 1.6, flowers: 0.03 },
  darkforest: { ground: "shade", grass: "darkgrass", border: "darktree", density: 0.65, groves: 0.33, wander: 2, flowers: 0, treeTint: "dark" },
  autumn: { ground: "autumn", grass: "autumngrass", border: "autumntree", tree: "honeyTree", density: 0.5, groves: 0.15, flowers: 0.02 },
  coast: { road: "sand", shore: 2, density: 0.2, groves: 0.05, water: "sea" },
  beach: { ground: "beach", road: "sand", border: "palms", tree: "boulder", density: 0.3, groves: 0.15, grove: "palms", flowers: 0, water: "sea" },
  sea: { ground: "beach", road: "sand", border: "rock", tree: "boulder", density: 0.1, groves: 0, flowers: 0, water: "sea", rough: false },
  desert: { ground: "desert", road: "beach", border: "rock", tree: "boulder", density: 0.55, groves: 0, flowers: 0, grass: "desert", wander: 2 },
  snow: { ground: "drift", road: "frostpath", border: "pine", grass: "snowgrass", density: 0.4, groves: 0.2, flowers: 0, treeTint: "frost", grove: "pine" },
  marsh: { ground: "marsh", road: "dirt", grass: "marshgrass", density: 0.3, groves: 0.1, flowers: 0, puddles: 0.12, water: "bog" },
  mountain: { ground: "field", road: "gravel", border: "rock", tree: "boulder", density: 0.55, groves: 0.12, grove: "tree", flowers: 0.02 },
  crag: { ground: "gravel", road: "dirt", border: "rock", tree: "boulder", density: 0.6, groves: 0, flowers: 0 },
  volcanic: { ground: "ash", road: "clay", border: "ashrock", tree: "boulder", density: 0.6, groves: 0, flowers: 0 },
  road: { road: "asphalt", width: 3, turn: 6, wander: 0.2, density: 0.3 },
  bridge: { bridge: true, road: "deck", ground: "deck", border: "sea", water: "sea", density: 0, groves: 0, flowers: 0, rough: false },
  // towns
  town: { town: true, road: "dirt", density: 0.18, groves: 0, turn: 5, wander: 0.2, flowers: 0.2 },
  village: { town: true, road: "sand", ground: "meadow", density: 0.25, groves: 0.05, turn: 4, wander: 0.4, flowers: 0.3 },
  city: { town: true, ground: "paving", road: "cobble", tree: "hedge", density: 0.3, groves: 0, turn: 6, wander: 0, flowers: 0, lawns: 0.06, fountain: true, center: ["hearthCenter", "pcSmall"], mart: ["mart", "martSmall"], house: ["gable", "flat", "peak"] },
  brick: { town: true, ground: "brick", road: "cobble", tree: "hedge", density: 0.35, groves: 0, turn: 6, wander: 0, flowers: 0.12, lawns: 0.06, fountain: true, center: ["hearthCenter", "pcSmall"], mart: ["mart", "martSmall"], house: ["gable", "peak", "flat"] },
  port: { town: true, ground: "paving", road: "asphalt", tree: "barrels", density: 0.12, groves: 0, turn: 6, wander: 0, flowers: 0, water: "sea", center: ["centerRed", "pcSmall"], mart: ["mart", "martSmall"], house: ["flat", "gable", "peak"], rough: false },
  industrial: { town: true, ground: "gravel", road: "paving", border: "rock", tree: "barrels", density: 0.14, groves: 0, turn: 6, wander: 0, flowers: 0, water: "sea", center: ["centerRed", "pcSmall"], house: ["flat", "peak", "gable"], rough: false },
  mining: { town: true, ground: "gravel", road: "dirt", border: "rock", tree: "boulder", density: 0.35, groves: 0, turn: 5, wander: 0.2, flowers: 0, house: ["peak", "flat", "logHouse"], gym: ["oreGym", "gym"] },
  ashtown: { town: true, ground: "ash", road: "clay", border: "ashrock", tree: "boulder", density: 0.35, groves: 0, turn: 5, wander: 0.2, flowers: 0, house: ["flat", "peak"] },
  beachtown: { town: true, ground: "beach", road: "deck", border: "palms", tree: "barrels", density: 0.08, groves: 0, turn: 5, wander: 0.2, flowers: 0, water: "sea", house: ["flat", "logHouse", "peak"] },
  snowtown: { town: true, ground: "snow", road: "frostpath", border: "pine", tree: "tree1", treeTint: "frost", grove: "pine", density: 0.4, groves: 0.12, turn: 5, wander: 0.2, flowers: 0, center: ["snowCenter", "pcSmall"], gym: ["snowGym"], mart: ["snowMart", "martSmall"], house: ["cabin", "logHouse"], grass: "snowgrass" },
  marshtown: { town: true, ground: "grass", road: "deck", density: 0.2, groves: 0.05, turn: 5, wander: 0.2, flowers: 0, puddles: 0.06, water: "bog", house: ["logHouse", "cabin", "peak"], grass: "marshgrass" },
  darkcity: { town: true, ground: "darkpave", road: "neon", border: "rock", tree: "barrels", density: 0.04, groves: 0, turn: 6, wander: 0, flowers: 0, towers: true, center: ["centerBlue", "pcSmall"], house: ["towerDoor", "towerDoor2", "flat"], big: ["towerDoor", "hall"] },
  foresttown: { town: true, ground: "shade", road: "dirt", density: 0.7, groves: 0.3, turn: 3, wander: 1, flowers: 0.1, house: ["logHouse", "cabin"], grass: "shadegrass" },
  plazatown: { town: true, ground: "ornate", road: "cobble", tree: "hedge", density: 0.3, groves: 0, turn: 6, wander: 0, flowers: 0, lawns: 0, fountain: true, center: ["hearthCenter"], house: ["gable", "flat"] },
  alley: { town: true, ground: "paving", road: "asphalt", border: "brick", tree: "barrels", density: 0.1, groves: 0, turn: 6, wander: 0, flowers: 0, house: ["gable", "flat"] },
};
// Which theme each place gets, from what the games show there. First match wins.
const KALOS = [
  [/VanivilleTown|AquacordeTown/, "brick"], [/CamphrierTown/, "village"], [/AmbretteTown/, "port", { ground: "brick", road: "cobble" }], [/GeosengeTown/, "mining", { stones: true }], [/DendemilleTown/, "snowtown"], [/CouriwayTown/, "mining", { ground: "field" }],
  [/LookerAlley|Arcade/, "alley"], [/ChampionParade|LeagueEntrance/, "plazatown"],
  [/SantaluneForest|VictoryGrove|PokemonVillage/, "forest"], [/Route20|Winding/, "darkforest"],
  [/Route4Entrance|Parfum/, "garden"], [/Route8Coast|AzureBay/, "beach", { border: "rock" }], [/Route12|SkiddoRanch/, "coast"], [/Route13/, "desert"], [/Route14|Route19/, "marsh"], [/Route19Bridge/, "bridge"],
  [/Route15|Route16/, "autumn"], [/FrostExterior|Route17/, "snow"], [/Route8Upper|Route9|Route18|VictoryFalls|Route22/, "mountain"], [/Route10Entrance|Route11/, "mountain", { ground: "grass", stones: true }],
  [/Route7|Route6/, "meadow"], [/Route5|Route21/, "plains", { road: "sand" }], [/./, "plains"],
];
const UNOVA = [
  [/AspertiaCity/, "city", { ground: "brick", fountain: false, lookout: true }], [/FloccesyTown/, "town", { clock: true }], [/VirbankCity/, "industrial", { factory: true }], [/VirbankComplex|ComplexInterior/, "crag", { ground: "gravel", road: "paving", factory: true, tree: "barrels" }],
  [/PokestarStudios|PWT|BigStadium/, "plazatown"], [/NimbasaCity/, "city", { ground: "ornate", wheel: true, lawns: 0 }], [/NimbasaPark/, "garden", { wheel: true }], [/DriftveilCity/, "port", { ground: "brick" }], [/ColdStorage/, "snow", { factory: true }],
  [/MistraltonCity/, "town", { runway: true }], [/LentimasTown/, "ashtown", { runway: true }], [/UndellaTown|HumilauCity/, "beachtown"], [/LacunosaTown/, "brick", { walls: true }], [/OpelucidCity/, "plazatown"],
  [/PokemonLeague/, "plazatown", { ground: "steel" }], [/BlackCity/, "darkcity"], [/WhiteForest/, "foresttown"], [/NacreneCity/, "brick", { house: ["flat", "gable", "peak"] }], [/StriatonCity/, "city", { lawns: 0.2, flowers: 0.15 }],
  [/AccumulaTown/, "town", { ground: "field", road: "cobble" }], [/NuvemaTown/, "village", { shore: 2 }], [/IcirrusCity/, "marshtown"], [/AnvilleTown/, "town", { turntable: true, road: "gravel" }], [/VillageBridge/, "village"],
  [/LibertyGarden|P2Island/, "coast", { shore: 3 }], [/CasteliaGarden|FunfestGarden|FunfestCourt/, "garden"], [/Entralink|EntreeForest|NaturePreserve|PledgeGrove|LostlornForest|PinwheelForest|PinwheelInner/, "forest"],
  [/GiantChasmFrozenForest/, "snow"], [/GiantChasmForest/, "darkforest"], [/Route4|Desert/, "desert"], [/Bridge$|Drawbridge/, "bridge"], [/Route17|Route21|UndellaBay/, "sea"],
  [/Route13|Route14|Route18|Route1$/, "coast"], [/MoorOfIcirrus|Route8/, "marsh"], [/Route5|Route9|Route16/, "road"], [/Route23|VictoryRoad|Route15|Route22|Route10|Route7/, "mountain"],
  [/Dreamyard/, "crag", { ground: "field", tree: "tree1", grove: "tree" }], [/Route6|Route3|PinwheelOutskirts|RanchBack/, "plains", { density: 0.5, groves: 0.2 }], [/Route20|AbundantShrine|Route12/, "meadow"], [/./, "plains"],
];
function themeFor(name) {
  const table = name.startsWith("Kalos") ? KALOS : UNOVA, short = name.replace(/^(Kalos|Unova|BW1)/, "");
  const [, theme, extra] = table.find(([re]) => re.test(short));
  return { ...BASE, ...THEMES[theme], ...(extra || {}), theme };
}

// ---------------------------------------------------------------- one map
const layouts = {}, report = [];
function layout(name) {
  const home = homeOf(name), base = HOMES[home][name], W = base.width, H = base.height, N = W * H, T = themeFor(name);
  const seed = [...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7);
  const X = (i) => i % W, Y = (i) => (i / W) | 0, I = (x, y) => y * W + x, inside = (x, y) => x >= 2 && y >= 2 && x < W - 2 && y < H - 2, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const water0 = new Uint8Array(N), kind = new Array(N), solid = new Uint8Array(N), built = new Uint8Array(N), clear = new Uint8Array(N), keep = new Uint8Array(N), road = new Uint8Array(N), added = new Uint8Array(N), grass = new Uint8Array(N);
  const items = [], obstacles = [], owner = new Int32Array(N).fill(-1);
  const soft = new Uint8Array(N);
  for (let i = 0; i < N; i++) water0[i] = isWater(base.behavior[i]) ? 1 : 0;
  const baseOpen = (i) => !base.collision[i] && !water0[i];
  // What must stay as it is.
  const mark = (x, y, r = 0) => { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) if (on(i, j)) clear[I(i, j)] = 1; };
  const doors = [], steps = [];
  base.warps.forEach((w, k) => { keep[I(w.x, w.y)] = 1; mark(w.x, w.y, 1); if (base.behavior[I(w.x, w.y)] === DOOR) { doors.push(k); if (on(w.x, w.y + 1)) { keep[I(w.x, w.y + 1)] = 1; mark(w.x, w.y + 2, 0); } } else steps.push(k); });
  for (const p of base.people) { keep[I(p.x, p.y)] = 1; mark(p.x, p.y, 1); const f = { face_up: [0, -1], face_left: [-1, 0], face_right: [1, 0] }[p.movement] || [0, 1]; for (let s = 1; s <= (p.trainer ? (p.trainer.sight || 2) + 1 : 1); s++) if (on(p.x + f[0] * s, p.y + f[1] * s) && baseOpen(I(p.x + f[0] * s, p.y + f[1] * s))) { keep[I(p.x + f[0] * s, p.y + f[1] * s)] = 1; clear[I(p.x + f[0] * s, p.y + f[1] * s)] = 1; } }
  for (const s of base.signs || []) { mark(s.x, s.y, 1); for (const dy of [1, -1]) if (on(s.x, s.y + dy) && baseOpen(I(s.x, s.y + dy))) keep[I(s.x, s.y + dy)] = 1; }
  for (const t of [...(base.triggers || []), ...(base.hidden || [])]) if (on(t.x, t.y)) { if (baseOpen(I(t.x, t.y))) keep[I(t.x, t.y)] = 1; mark(t.x, t.y, 1); }
  for (const [x, y] of landings[name] || []) if (on(x, y) && baseOpen(I(x, y))) { keep[I(x, y)] = 1; mark(x, y, 1); }

  // A. ground, water, border.
  const total = water0.reduce((a, b) => a + b, 0), bridgeMap = T.bridge;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = I(x, y);
    if (water0[i]) kind[i] = "water";
    else if (bridgeMap) { if (base.collision[i]) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => on(x + dx, y + dy) && !base.collision[I(x + dx, y + dy)]); kind[i] = near && inside(x, y) ? "rail" : "border"; solid[i] = 1; } else kind[i] = "ground"; }
    else if (!inside(x, y) && base.collision[i]) { kind[i] = "border"; solid[i] = 1; }
    else kind[i] = "ground";
  }
  // Bridges across water keep their planks.
  const plank = new Uint8Array(N);
  if (!bridgeMap && (T.town || T.water !== "sea")) for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = I(x, y); if (!baseOpen(i)) continue;
    const span = (dx, dy) => { for (let s = 1; s <= 3; s++) { const a = x + dx * s, b = y + dy * s; if (!on(a, b)) return false; if (water0[I(a, b)]) return true; if (base.collision[I(a, b)]) return false; } return false; };
    const wet = (dx, dy) => on(x + dx, y + dy) && water0[I(x + dx, y + dy)];
    if ((span(1, 0) && span(-1, 0) && (wet(0, 1) || wet(0, -1) || wet(1, 0) || wet(-1, 0) || (span(0, 1) && false))) || (span(0, 1) && span(0, -1) && (wet(1, 0) || wet(-1, 0) || wet(0, 1) || wet(0, -1)))) plank[i] = 1;
  }
  // Shores are ragged, not ruled.
  if (T.rough && total > 20) for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
    const i = I(x, y); if (water0[i] || clear[i] || keep[i] || plank[i]) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => water0[I(x + dx, y + dy)]).length;
    const guard = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => plank[I(x + dx, y + dy)]);
    if (near && !guard && fbm(x * 2, y * 2, seed + 3) > 0.56) { added[i] = 1; kind[i] = "water"; }
  }

  // B. buildings on their doors.
  const rectFree = (x0, y0, w, h, own) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (x < 1 || y < 0 || x >= W - 1 || y >= H) return false; const i = I(x, y); if (i === own) continue; if (built[i] || keep[i] || water0[i] || plank[i]) return false; if (base.people.some((p) => p.x === x && p.y === y) || (base.signs || []).some((s) => s.x === x && s.y === y)) return false; } return true; };
  const pickStamps = (w, k) => {
    const n = w.map.replace(/^(Kalos|Unova|BW1)/, ""), t = typeOf(w.map), r = Math.floor(hash(w.x * 7 + k * 3, w.y * 13 + k, seed + k) * 9973);
    const rot = (list) => list.map((_, j) => list[(j + r) % list.length]);
    if (/Center|_PC/.test(n)) return T.center;
    if (t === "gym" || /Gym/.test(n)) return T.gym;
    if (/Lighthouse/.test(n)) return ["lighthouse"];
    if (/Factory|PowerPlant|Storage|Complex/.test(n)) return ["works", "factory", ...T.big];
    if (/Mart|Shop|Boutique|Market|Mall|Emporium|Couture|Shoppe/.test(n)) return T.mart;
    if (/Lab/.test(n)) return ["lab", ...T.house];
    if (/Station|Museum|Theater|Hall|Stadium|Court|Studio|Tower|Castle|Chateau|Hotel|Company|Office|HQ|League|Maison|School|Musical|Gate|Lobby|Treehollow|Coaster|Aquarium|Mastery|Restaurant|Cafe|Press|Villa/.test(n)) return rot(T.big);
    return rot(T.house);
  };
  const order = doors.slice().sort((a, b) => { const big = (k) => (/Center|Gym|Station|Lab|Museum|Tower|League|Hall/.test(base.warps[k].map) ? 0 : 1); return big(a) - big(b) || a - b; });
  const placed = [];
  for (const k of order) {
    const w = base.warps[k], own = I(w.x, w.y);
    let ok = null;
    for (const stamp of [...pickStamps(w, k), "gable", "pcSmall", "peak", "cabin"]) {
      const s = A.STAMPS[stamp]; if (!s || s[5] == null) continue;
      const x0 = w.x - s[5], y0 = w.y - s[4] + 1;
      if (y0 < 0 || !rectFree(x0, y0, s[3], s[4], own)) continue;
      ok = { stamp, x0, y0, w: s[3], h: s[4] }; break;
    }
    if (ok) {
      const tint = ok.stamp === "gable" || ok.stamp === "peak" ? ROOFS[Math.floor(hash(w.x, w.y, seed + 2) * ROOFS.length)] : T.towers && /tower/.test(ok.stamp) ? A.trim(0.3 + hash(k, 1, seed), 0.4 + hash(k, 2, seed) * 0.5, 1) : null;
      for (let y = ok.y0; y < ok.y0 + ok.h; y++) for (let x = ok.x0; x < ok.x0 + ok.w; x++) { const i = I(x, y); built[i] = 1; solid[i] = 1; if (kind[i] === "border" && inside(x, y)) kind[i] = "ground"; added[i] = 0; if (kind[i] === "water" && !water0[i]) kind[i] = "ground"; }
      items.push({ z: ok.y0 + ok.h, draw: (c) => A.draw(c, ok.stamp, ok.x0, ok.y0, { tint }) });
      placed.push(ok);
    } else {
      // No room for a house: a porch over the door.
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0]]) { const x = w.x + dx, y = w.y + dy; if (!on(x, y)) continue; const i = I(x, y); if (keep[i] || water0[i] || base.people.some((p) => p.x === x && p.y === y)) continue; built[i] = 1; solid[i] = 1; }
      items.push({ z: w.y + 1, draw: (c) => { const px = w.x * 16, py = w.y * 16; c.box(px - 14, py - 10, 44, 26, [214, 204, 180], [70, 60, 60]); c.poly([[px - 18, py - 10], [px + 8, py - 26], [px + 34, py - 10]], [150, 70, 60]); c.poly([[px - 13, py - 11], [px + 8, py - 23], [px + 29, py - 11]], [196, 96, 80]); c.box(px + 2, py - 2, 12, 18, [70, 50, 40], [40, 30, 30]); c.rect(px - 9, py - 3, 7, 7, [140, 190, 230]); c.rect(px + 18, py - 3, 7, 7, [140, 190, 230]); } });
      report.push(name + ": porch for warp " + k + " (" + w.map + ")");
    }
    solid[own] = 0;
  }

  // C. caves, grottoes, gatehouses and road ends.
  const rockKind = T.grove === "ashrock" ? "ashrock" : "rock";
  for (const k of steps) {
    const w = base.warps[k], t = typeOf(w.map), n = w.map;
    const free = (x, y) => on(x, y) && !keep[I(x, y)] && !built[I(x, y)] && !water0[I(x, y)] && !plank[I(x, y)] && !base.people.some((p) => p.x === x && p.y === y) && !base.warps.some((v) => v.x === x && v.y === y);
    if (/Grotto/.test(n)) {
      for (const dx of [-2, 1]) if ([0, 1].every((e) => free(w.x + dx + e, w.y) && free(w.x + dx + e, w.y - 1))) { for (const e of [0, 1]) for (const dy of [0, -1]) { const i = I(w.x + dx + e, w.y + dy); solid[i] = 1; built[i] = 1; soft[i] = 1; } const x = w.x + dx; items.push({ z: w.y + 1, draw: (c, top) => { A.draw(top, "tree1", x, w.y - 2, { rows: [0] }); A.draw(c, "tree1", x, w.y - 1, { rows: [1, 2] }); } }); }
      items.push({ z: 0, draw: (c) => c.ellipse(w.x * 16 + 8, w.y * 16 + 8, 7, 6, [30, 60, 40, 140]) });
    } else if (t === "cave" || /Cave|Tunnel|Mountain|Chasm|Ruins|Passage|Sewers|Den$|Hotel|Road|Frost|Reflection|Terminus|Castle|Tower/.test(n) && t !== "route" && t !== "city" && t !== "town" && t !== "indoor") {
      for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-2, -1], [2, -1], [0, -2], [-1, -2], [1, -2]]) if (free(w.x + dx, w.y + dy) && inside(w.x + dx, w.y + dy)) { const i = I(w.x + dx, w.y + dy); kind[i] = rockKind; solid[i] = 1; built[i] = 1; soft[i] = 1; added[i] = 0; }
      items.push({ z: 1, draw: (c) => { const px = w.x * 16, py = w.y * 16; c.ellipse(px + 8, py + 9, 9, 11, [60, 48, 44]); c.ellipse(px + 8, py + 10, 7, 9, [16, 14, 20]); c.rect(px + 1, py + 10, 14, 6, [16, 14, 20]); } });
    } else if (t === "indoor" || t === "gym") {
      for (const dx of [-1, 1]) if (free(w.x + dx, w.y)) { const i = I(w.x + dx, w.y); solid[i] = 1; built[i] = 1; soft[i] = 1; }
      items.push({ z: w.y + 1, draw: (c, top) => { const px = w.x * 16, py = w.y * 16; for (const dx of [-16, 16]) { c.box(px + dx + 2, py - 6, 12, 22, [200, 204, 214], [70, 76, 96]); c.rect(px + dx + 4, py - 4, 3, 18, [236, 238, 244]); } top.box(px - 16, py - 16, 48, 11, [176, 62, 62], [80, 30, 36]); top.rect(px - 14, py - 14, 44, 2, [226, 110, 100]); c.rect(px, py, 16, 16, [60, 62, 76, 150]); for (let s = 2; s < 16; s += 4) c.rect(px, py + s, 16, 1, [160, 166, 186]); } });
    } else {
      const d = [[w.x, -1, 0], [W - 1 - w.x, 1, 0], [w.y, 0, -1], [H - 1 - w.y, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      items.push({ z: 2, draw: (c) => { const cx = w.x * 16 + 8, cy = w.y * 16 + 8, dx = d[1], dy = d[2]; c.poly([[cx + dx * 6 - dy * 5, cy + dy * 6 - dx * 5], [cx + dx * 6 + dy * 5, cy + dy * 6 + dx * 5], [cx - dx * 5, cy - dy * 5]].map(([a, b]) => [2 * cx - a, 2 * cy - b]), [255, 250, 220, 230]); } });
    }
  }

  // Landmarks, where there is room.
  const openGround = (i) => kind[i] === "ground" && !solid[i] && !clear[i] && !keep[i] && !road[i] && !plank[i];
  const freeRect = (w, h, cx, cy) => { let best = null; for (let y = 3; y + h <= H - 3; y++) for (let x = 3; x + w <= W - 3; x++) { let ok = true; for (let j = y - 1; j <= y + h && ok; j++) for (let i = x - 1; i <= x + w; i++) if (!openGround(I(i, j))) { ok = false; break; } if (!ok) continue; const d = Math.hypot(x + w / 2 - cx, y + h / 2 - cy); if (!best || d < best[2]) best = [x, y, d]; } return best; };
  const block = (x, y, w, h, kindName) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { solid[I(i, j)] = 1; built[I(i, j)] = 1; if (kindName) kind[I(i, j)] = kindName; } };
  const landmark = (w, h, cx, cy, draw, solidRows = h, kindName) => { const at = freeRect(w, h, cx, cy); if (!at) { report.push(name + ": no room for a landmark"); return null; } block(at[0], at[1] + h - solidRows, w, solidRows, kindName); items.push({ z: at[1] + h, draw: (c, top) => draw(c, top, at[0], at[1]) }); return at; };
  const stampMark = (stamp, cx, cy) => { const s = A.STAMPS[stamp]; return landmark(s[3], s[4], cx, cy, (c, top, x, y) => A.draw(c, stamp, x, y)); };
  if (T.factory) stampMark("factory", W * 0.7, H * 0.3);
  if (T.fountain) stampMark("fountain", W / 2, H / 2);
  if (T.clock) landmark(3, 6, W / 2, H / 2, (c, top, x, y) => { const px = x * 16, py = y * 16; top.box(px + 8, py, 32, 64, [226, 214, 190], [90, 70, 60]); top.poly([[px + 4, py + 2], [px + 24, py - 16], [px + 44, py + 2]], [150, 60, 56]); top.ellipse(px + 24, py + 20, 10, 10, [60, 50, 50]); top.ellipse(px + 24, py + 20, 8, 8, [250, 248, 236]); top.line(px + 24, py + 20, px + 24, py + 14, [40, 40, 40]); top.line(px + 24, py + 20, px + 28, py + 22, [40, 40, 40]); c.box(px + 8, py + 64, 32, 32, [226, 214, 190], [90, 70, 60]); c.box(px + 18, py + 76, 12, 20, [110, 80, 60], [60, 40, 40]); }, 2);
  if (T.lookout) landmark(6, 3, W / 2, 6, (c, top, x, y) => { const px = x * 16, py = y * 16; c.box(px, py + 8, 96, 40, [206, 196, 176], [90, 80, 70]); for (let k = 0; k < 96; k += 8) c.rect(px + k, py + 8, 2, 12, [110, 100, 90]); c.rect(px, py + 8, 96, 3, [120, 110, 100]); c.rect(px + 4, py + 24, 88, 20, [226, 218, 200]); });
  if (T.wheel) landmark(8, 9, W * 0.72, H * 0.3, (c, top, x, y) => { const cx = x * 16 + 64, cy = y * 16 + 62, t = canvas(c.w, c.h); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; t.line(cx, cy, cx + Math.cos(a) * 54, cy + Math.sin(a) * 54, [150, 160, 190]); } t.ellipse(cx, cy, 56, 56, [226, 80, 110], 4); t.ellipse(cx, cy, 44, 44, [250, 220, 90], 2); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26, gx = cx + Math.cos(a) * 55, gy = cy + Math.sin(a) * 55; t.box(gx - 6, gy - 4, 12, 11, [[250, 110, 110], [110, 180, 250], [250, 220, 90], [130, 220, 140]][k % 4], [60, 50, 70]); t.rect(gx - 4, gy - 2, 8, 4, [230, 244, 255]); } t.ellipse(cx, cy, 7, 7, [90, 100, 130]); t.poly([[cx - 4, cy], [cx + 4, cy], [cx + 30, y * 16 + 143], [cx + 20, y * 16 + 143]], [110, 120, 150]); t.poly([[cx - 4, cy], [cx + 4, cy], [cx - 20, y * 16 + 143], [cx - 30, y * 16 + 143]], [110, 120, 150]); t.box(cx - 40, y * 16 + 132, 80, 12, [200, 80, 100], [70, 40, 60]); const split = (y + 7) * 16; for (let i = 0; i < t.data.length; i += 4) if (t.data[i + 3]) { const yy = (i / 4 / t.w) | 0; (yy < split ? top : c).p((i / 4) % t.w, yy, [t.data[i], t.data[i + 1], t.data[i + 2]]); } }, 2);
  if (T.runway) for (const len of [26, 20, 14, 10]) if (len <= W - 10 && freeRect(len, 4, W / 2, H * 0.22) && landmark(len, 4, W / 2, H * 0.22, (c, top, x, y) => { const w = len * 16, px = x * 16, py = y * 16; c.rect(px, py + 2, w, 60, [74, 78, 92]); c.rect(px, py + 2, w, 2, [230, 230, 236]); c.rect(px, py + 60, w, 2, [230, 230, 236]); for (let k = 8; k < w - 8; k += 24) c.rect(px + k, py + 30, 12, 3, [250, 240, 150]); for (let k = 0; k < 5; k++) c.rect(px + 6, py + 10 + k * 10, 14, 4, [236, 236, 240]); }, 4, "runway")) break;
  if (T.turntable) landmark(7, 7, W / 2, H / 2, (c, top, x, y) => { const cx = x * 16 + 56, cy = y * 16 + 56; c.ellipse(cx, cy, 54, 54, [96, 92, 96]); c.ellipse(cx, cy, 50, 50, [146, 140, 132]); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; c.line(cx, cy, cx + Math.cos(a) * 49, cy + Math.sin(a) * 49, [110, 104, 100], 2); } c.rect(cx - 50, cy - 7, 100, 14, [120, 96, 70]); c.rect(cx - 50, cy - 6, 100, 2, [70, 74, 86]); c.rect(cx - 50, cy + 4, 100, 2, [70, 74, 86]); for (let k = -48; k < 50; k += 8) c.rect(cx + k, cy - 7, 2, 14, [90, 70, 52]); c.ellipse(cx, cy, 6, 6, [60, 62, 70]); });
  if (T.walls) for (let x = 4; x < W - 4; x++) for (const y of [4, H - 6]) { const i = I(x, y); if (openGround(i) && hash(x >> 3, y, seed) > 0.25) { solid[i] = 1; built[i] = 1; items.push({ z: y + 1, draw: (c) => { c.box(x * 16, y * 16 - 6, 16, 22, [150, 146, 150], [80, 78, 90]); c.rect(x * 16, y * 16 - 6, 16, 3, [196, 194, 200]); c.rect(x * 16 + 7, y * 16 + 2, 1, 14, [110, 108, 116]); } }); } }

  // D. roads between every door and gate.
  const node = (k) => { const w = base.warps[k]; return doors.includes(k) && on(w.x, w.y + 1) ? I(w.x, w.y + 1) : I(w.x, w.y); };
  const passable = (i) => { const x = X(i), y = Y(i); return x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && !built[i] && !water0[i] && (kind[i] !== "border" || keep[i]) && kind[i] !== "rail"; };
  const stepCost = (i) => (!passable(i) ? Infinity : road[i] || plank[i] ? 0.35 : 1 + (added[i] ? 5 : 0) + T.wander * 4 * fbm(X(i), Y(i), seed + 7) + (inside(X(i), Y(i)) ? 0 : 4));
  const pave = (i) => { const x = X(i), y = Y(i), r = T.width; for (let j = 0; j < r; j++) for (let k = 0; k < r; k++) { const a = x + k - (r > 2 ? 1 : 0), b = y + j - (r > 2 ? 1 : 0); if (!on(a, b)) continue; const q = I(a, b); if ((j || k) && (!passable(q) || !inside(a, b))) continue; if (!passable(q)) continue; road[q] = 1; if (added[q]) { added[q] = 0; kind[q] = "ground"; } } };
  if (!bridgeMap) {
    const nodes = base.warps.map((_, k) => node(k)).filter((i) => passable(i)), inTree = [nodes[0]], rest = nodes.slice(1);
    if (nodes.length) pave(nodes[0]);
    while (rest.length) {
      let bi = 0, bd = Infinity; rest.forEach((r, q) => { for (const t of inTree) { const d = Math.abs(X(r) - X(t)) + Math.abs(Y(r) - Y(t)); if (d < bd) { bd = d; bi = q; } } });
      const from = rest.splice(bi, 1)[0], cells = route(W, H, from, (i) => road[i] === 1, stepCost, T.turn);
      if (cells) for (const i of cells) pave(i); else report.push(name + ": no land road to " + X(from) + "," + Y(from));
      inTree.push(from);
    }
  }
  // Towns get neighbours: houses with no way in, facing the roads.
  if (T.town && !bridgeMap) {
    const wantHouses = Math.max(0, Math.min(7, Math.round(W * H / 230) - placed.length)), pool = T.house.filter((h) => A.STAMPS[h]);
    for (let t = 0, made = 0; t < 500 && made < wantHouses; t++) {
      const stamp = pool[Math.floor(hash(t, 3, seed) * pool.length)], s = A.STAMPS[stamp], x = 3 + Math.floor(hash(t, 5, seed) * (W - 6 - s[3])), y = 3 + Math.floor(hash(t, 7, seed) * (H - 7 - s[4]));
      let ok = true; for (let j = y - 1; j <= y + s[4] + 1 && ok; j++) for (let i = x - 1; i <= x + s[3]; i++) if (!on(i, j) || !openGround(I(i, j))) { ok = false; break; }
      if (!ok) continue;
      let near = false; for (let j = y + s[4] + 1; j <= y + s[4] + 4 && !near; j++) for (let i = x; i < x + s[3]; i++) if (on(i, j) && road[I(i, j)]) { near = true; break; }
      if (!near && t < 350) continue;
      block(x, y, s[3], s[4]); made++;
      const tint = stamp === "gable" || stamp === "peak" ? ROOFS[Math.floor(hash(x, y, seed + 2) * ROOFS.length)] : T.towers && /tower/.test(stamp) ? A.trim(0.3 + hash(t, 1, seed), 0.4 + hash(t, 2, seed) * 0.5, 1) : null;
      items.push({ z: y + s[4], draw: (c) => A.draw(c, stamp, x, y, { tint }) });
    }
  }
  // Shores, lawns and flower beds.
  if (T.shore) for (let i = 0; i < N; i++) if (kind[i] === "ground" && !road[i]) { const x = X(i), y = Y(i); let near = false; for (let j = -T.shore; j <= T.shore && !near; j++) for (let k = -T.shore; k <= T.shore; k++) if (on(x + k, y + j) && kind[I(x + k, y + j)] === "water") { near = true; break; } if (near) kind[i] = "beach"; }

  // E. tall grass, as much as there was.
  const encVals = {}, behVals = {}; let want = 0, landOpen = 0;
  for (let i = 0; i < N; i++) { if (water0[i]) continue; if (!base.collision[i]) landOpen++; if (base.encounter[i]) { want++; encVals[base.encounter[i]] = (encVals[base.encounter[i]] || 0) + 1; behVals[base.behavior[i]] = (behVals[base.behavior[i]] || 0) + 1; } }
  const mode = (o, d) => { const e = Object.entries(o).filter(([k]) => +k !== DOOR && +k !== STEP).sort((a, b) => b[1] - a[1])[0]; return e ? +e[0] : d; };
  const encValue = mode(encVals, 1), grassBeh = mode(behVals, 2), everywhere = want > landOpen * 0.6;
  if (want && !everywhere && !bridgeMap) {
    const cand = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { const i = I(x, y); if ((kind[i] !== "ground" && kind[i] !== "beach") || solid[i] || road[i] || plank[i] || base.warps.some((w) => Math.abs(w.x - x) + Math.abs(w.y - y) <= 1)) continue; cand.push([fbm(x * 1.3, y * 1.3, seed + 5) + (base.encounter[i] ? 0.06 : 0), i]); }
    cand.sort((a, b) => b[0] - a[0]);
    for (const [, i] of cand.slice(0, want)) grass[i] = 1;
    if (cand.length < want) report.push(name + ": only " + cand.length + " of " + want + " grass tiles fit");
  }

  // F. groves, trees, rocks and flower beds.
  const plain = (i) => kind[i] === "ground" && !solid[i] && !clear[i] && !keep[i] && !road[i] && !plank[i] && !grass[i];
  if (T.groves && !bridgeMap) for (let y = 2; y < H - 3; y += 2) for (let x = 2; x < W - 3; x += 2) {
    const cells = [I(x, y), I(x + 1, y), I(x, y + 1), I(x + 1, y + 1)];
    if (cells.every(plain) && fbm(x * 1.1, y * 1.1, seed + 9) > 1 - T.groves * 0.9 - 0.25) { const id = obstacles.length; obstacles.push({ cells, grove: true }); for (const i of cells) { solid[i] = 1; owner[i] = id; kind[i] = "grove"; } }
  }
  if (T.density && !bridgeMap) for (let gy = 3; gy < H - 4; gy += 3) for (let gx = 2; gx < W - 4; gx += 3) {
    const x = gx + Math.floor(hash(gx, gy, seed + 1) * 2), y = gy + Math.floor(hash(gx, gy, seed + 2) * 2);
    if (hash(gx, gy, seed + 4) * 0.6 + fbm(x, y, seed + 13) * 0.4 > T.density * 0.75) continue;
    const s = A.STAMPS[T.tree], w = s[3], h = Math.min(2, s[4]), top = s[4] - h, cells = [];
    for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) cells.push(I(x + k, y + j));
    if (!cells.every((i) => plain(i) && inside(X(i), Y(i)))) continue;
    const id = obstacles.length, ob = { cells, live: true }; obstacles.push(ob);
    for (const i of cells) { solid[i] = 1; owner[i] = id; }
    const tint = T.treeTint && T.tree === "tree1" ? TREE_TINT[T.treeTint] : T.theme === "autumn" && T.tree === "tree1" ? TREE_TINT.autumn : null;
    items.push({ z: y + h, draw: (c, topc) => { if (!ob.live) return; if (top) A.draw(topc, T.tree, x, y - top, { rows: Array.from({ length: top }, (_, r) => r), tint }); A.draw(c, T.tree, x, y, { rows: Array.from({ length: h }, (_, r) => r + top), tint }); } });
  }
  const bed = new Array(N);
  if (!bridgeMap) for (let i = 0; i < N; i++) {
    if (kind[i] !== "ground" || solid[i] || road[i] || grass[i] || plank[i]) continue;
    const x = X(i), y = Y(i), f = fbm(x * 1.7, y * 1.7, seed + 17);
    if (T.lawns && f > 0.8 - T.lawns * 0.4) bed[i] = "lawn";
    else if (T.flowers && f < T.flowers * 0.75 + 0.2 && hash(x, y, seed + 19) < 0.8) bed[i] = ["flowersRed", "flowersBlue", "flowersPink"][Math.floor(vnoise(x / 9, y / 9, seed + 21) * 3) % 3];
    else if (T.puddles && f > 0.5 && fbm(x * 2.3, y * 2.3, seed + 29) > 1 - T.puddles - 0.28) bed[i] = "puddle";
    else if (T.stones && hash(x, y, seed + 31) < 0.02) bed[i] = "stone";
  }

  // H. everything that could be walked to still can be.
  const comp = new Int32Array(N).fill(-1); let comps = 0;
  for (let s = 0; s < N; s++) { if (comp[s] >= 0 || !baseOpen(s)) continue; const q = [s]; comp[s] = comps; for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= N || (Math.abs(d) === 1 && Y(j) !== Y(q[k])) || comp[j] >= 0 || !baseOpen(j)) continue; comp[j] = comps; q.push(j); } comps++; }
  const need = []; for (let i = 0; i < N; i++) if (keep[i] && comp[i] >= 0) need.push(i);
  const walk = (i) => !solid[i] && kind[i] !== "water";
  const flood = (start) => { const seen = new Uint8Array(N); seen[start] = 1; const q = [start]; for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= N || (Math.abs(d) === 1 && Y(j) !== Y(q[k])) || seen[j] || !walk(j)) continue; seen[j] = 1; q.push(j); } return seen; };
  const open = (i) => { if (owner[i] >= 0) { const ob = obstacles[owner[i]]; ob.live = false; for (const c of ob.cells) { solid[c] = 0; owner[c] = -1; if (kind[c] === "grove") kind[c] = "ground"; } } if (added[i]) { added[i] = 0; kind[i] = "ground"; } if (kind[i] === "border" && inside(X(i), Y(i))) kind[i] = "ground"; if (soft[i]) { soft[i] = 0; built[i] = 0; if (kind[i] !== "water") kind[i] = "ground"; } if (!built[i]) solid[i] = 0; };
  for (const i of need) if (!walk(i)) { if ((built[i] && !soft[i]) || water0[i]) throw new Error(name + ": kept tile " + X(i) + "," + Y(i) + " is built over"); open(i); }
  const groups = {}; for (const i of need) (groups[comp[i]] = groups[comp[i]] || []).push(i);
  let cleared = 0;
  for (const list of Object.values(groups)) {
    for (let guard = 0; guard < 400; guard++) {
      const seen = flood(list[0]), lost = list.find((i) => !seen[i]); if (lost == null) break;
      const cells = route(W, H, lost, (i) => seen[i] === 1, (i) => ((built[i] && !soft[i]) || water0[i] || X(i) < 1 || Y(i) < 1 || X(i) >= W - 1 || Y(i) >= H - 1 || (kind[i] === "border" && !baseOpen(i)) ? Infinity : walk(i) ? 1 : 6));
      if (!cells) throw new Error(name + ": cannot reconnect " + X(lost) + "," + Y(lost));
      for (const i of cells) if (!walk(i)) { open(i); cleared++; }
    }
  }
  // Tall grass is no use behind a wall of trees: open a way in to each patch.
  for (const [id, list] of Object.entries(groups)) {
    for (let guard = 0; guard < 300; guard++) {
      const seen = flood(list[0]); let lost = -1;
      for (let i = 0; i < N; i++) if (grass[i] && !seen[i] && comp[i] === +id && !solid[i]) { lost = i; break; }
      if (lost < 0) break;
      const cells = route(W, H, lost, (i) => seen[i] === 1, (i) => ((built[i] && !soft[i]) || water0[i] || X(i) < 2 || Y(i) < 2 || X(i) >= W - 2 || Y(i) >= H - 2 || !baseOpen(i) ? Infinity : walk(i) ? 1 : 6));
      if (!cells) { grass[lost] = 0; continue; }
      for (const i of cells) if (!walk(i)) { open(i); cleared++; }
    }
  }
  // Land that was apart (across water) is still apart.
  const ids = Object.keys(groups);
  for (let a = 0; a < ids.length; a++) { const seen = flood(groups[ids[a]][0]); for (let b = a + 1; b < ids.length; b++) if (seen[groups[ids[b]][0]]) throw new Error(name + ": land areas " + ids[a] + " and " + ids[b] + " joined up"); }
  for (const p of base.people) if (solid[I(p.x, p.y)] && !base.collision[I(p.x, p.y)]) throw new Error(name + ": " + p.script + " is walled in");

  // I. the grids.
  const collision = new Array(N), behavior = new Array(N), encounter = new Array(N);
  const waterEnc = mode(Object.fromEntries(Array.from(new Set(base.encounter.filter((v, i) => water0[i]))).map((v) => [v, base.encounter.filter((e, i) => water0[i] && e === v).length])), 0);
  for (let i = 0; i < N; i++) {
    const wet = kind[i] === "water";
    collision[i] = solid[i] ? 1 : 0;
    behavior[i] = water0[i] ? base.behavior[i] : wet ? WATER : grass[i] ? grassBeh : 0;
    encounter[i] = water0[i] ? base.encounter[i] : wet ? waterEnc : grass[i] ? encValue : everywhere && !solid[i] ? encValue : 0;
    if (everywhere && !solid[i] && !wet && base.encounter[i] && !isWater(base.behavior[i])) behavior[i] = base.behavior[i] === DOOR || base.behavior[i] === STEP ? 0 : base.behavior[i];
  }
  for (const s of base.signs || []) collision[I(s.x, s.y)] = base.collision[I(s.x, s.y)];
  base.warps.forEach((w) => { const i = I(w.x, w.y); collision[i] = 0; behavior[i] = base.behavior[i]; encounter[i] = 0; });
  for (const p of base.people) { const i = I(p.x, p.y); if (!base.collision[i] && !water0[i]) collision[i] = 0; }
  for (const k of doors) { const w = base.warps[k]; if (collision[I(w.x, w.y + 1)]) throw new Error(name + ": door " + k + " opens onto a wall"); }

  // J. the picture.
  if (!DRY) {
    const c = canvas(W * 16, H * 16), top = canvas(W * 16, H * 16);
    const groveKind = T.grove || T.border, waterKind = T.water || "water";
    const shown = (i) => { const k = kind[i]; if (k === "water") return waterKind; if (k === "border") return T.border; if (k === "grove") return groveKind; if (k === "rail") return "rail"; if (k !== "ground") return k; if (plank[i]) return "deck"; if (road[i]) return T.road; if (grass[i]) return T.grass; if (bed[i] && bed[i] !== "puddle" && bed[i] !== "stone") return bed[i]; return T.ground; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = I(x, y), k = tileOf(shown(i));
      A.tile(c, k.tile, x, y);
      if (k.tint && k.tint[3]) c.rect(x * 16, y * 16, 16, 16, k.tint);
      if (bed[i] === "puddle") { c.ellipse(x * 16 + 8, y * 16 + 9, 7, 5, [70, 110, 130, 170]); c.ellipse(x * 16 + 7, y * 16 + 8, 4, 2, [130, 170, 190, 170]); }
      if (bed[i] === "stone") { c.ellipse(x * 16 + 8, y * 16 + 10, 5, 4, [120, 120, 128]); c.ellipse(x * 16 + 7, y * 16 + 9, 3, 2, [170, 170, 180]); }
    }
    // Soft edges where water or road meets the land.
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = I(x, y), wet = kind[i] === "water";
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = I(x + dx, y + dy), px = x * 16 + (dx > 0 ? 14 : 0), py = y * 16 + (dy > 0 ? 14 : 0), w = dx ? 2 : 16, h = dy ? 2 : 16;
        if (wet && kind[j] !== "water") { c.rect(px, py, w, h, [236, 244, 250, 110]); }
        else if (!wet && road[i] && !plank[i] && !road[j] && kind[j] === "ground" && !plank[j] && !solid[j]) c.rect(px, py, w, h, [60, 50, 30, 40]);
        else if (plank[i] && kind[j] === "water") c.rect(px, py, w, h, [70, 50, 36]);
      }
    }
    for (const s of base.signs || []) items.push({ z: s.y + 1, draw: (cc) => A.draw(cc, "board", s.x, s.y) });
    for (const it of items.sort((a, b) => a.z - b.z)) it.draw(c, top);
    c.save(path.join(out, name + ".png")); top.save(path.join(out, name + "-top.png"));
    const b = canvas(32, 32), bk = tileOf(bridgeMap ? waterKind : T.border); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { A.tile(b, bk.tile, x, y); if (bk.tint) b.rect(x * 16, y * 16, 16, 16, bk.tint); } b.save(path.join(out, name + "-border.png"));
    fs.rmSync(path.join(out, name + "-anim.png"), { force: true });
  }
  layouts[name] = { home, c: collision, b: behavior, e: encounter };
  return { cleared, placed: placed.length, doors: doors.length };
}

// ---------------------------------------------------------------- every map
const SKIP = /^UnovaHouse|^BW1House/;
const names = [];
for (const home of Object.keys(HOMES)) for (const m of Object.values(HOMES[home])) if (["route", "city", "town"].includes(m.type) && !done.has(m.name) && !SKIP.test(m.name) && (!m.image || m.image === m.name)) names.push(m.name);
let built = 0;
for (const name of names) { if (ONLY && !ONLY.test(name)) continue; keepClassic(name); layout(name); built++; }
if (report.length) console.log(report.join("\n"));
if (!ONLY && !DRY) {
  const rle = (a) => { const o = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; o.push(a[i], j - i); i = j; } return o; };
  const L = {}; for (const n of Object.keys(layouts)) L[n] = [layouts[n].home, rle(layouts[n].c), rle(layouts[n].b), rle(layouts[n].e)];
  const lines = ["// Generated by tools/build-region-layouts.js. What it does and why: docs/city-layouts.md.",
    "(function(){", "const L=" + JSON.stringify(L) + ",B=" + JSON.stringify(aliases) + ";",
    "const d=r=>{const a=[];for(let i=0;i<r.length;i+=2)for(let k=0;k<r[i+1];k++)a.push(r[i]);return a;};",
    "for(const n in B)for(const[home,map]of B[n])if(window[home].maps[map].image===n)window[home].maps[map].image=n+'Classic';",
    "for(const n in L){const m=window[L[n][0]].maps[n];delete m.anim;m.collision=d(L[n][1]);m.behavior=d(L[n][2]);m.encounter=d(L[n][3]);m.top=true;m.cityLayout=true;m.regionLayout=true;}",
    "window.REGION_LAYOUTS=Object.keys(L);", "})();", ""];
  fs.writeFileSync(path.join(root, "data/region-layouts.js"), lines.join("\n"));
}
console.log("region layouts:", built, "maps");
