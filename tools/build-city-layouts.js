// Real street plans for the big custom-region cities, replacing the generic
// "houses on a paved field" templates. Run: node tools/build-city-layouts.js
//
// Reads the committed base maps (data/unova.js, data/kalos.js), so no source
// checkout or network is needed, and writes data/city-layouts.js plus each
// map's picture. Map names, sizes, warp indices and actor IDs are unchanged;
// only where things stand moves. See docs/city-layouts.md.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, ".."), out = path.join(root, "assets/world/maps");
const { canvas, hash } = require("./lib/orre-art");
const A = require("./lib/city-stamps")(root);

// The base maps, as the game loads them before this overlay.
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="(data\/[^"]+)"><\/script>/g))
  if (file !== "data/city-layouts.js") vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
const HOMES = { UNOVA_DATA: ctx.UNOVA_DATA.maps, KALOS_DATA: ctx.KALOS_DATA.maps };
const homeOf = (name) => Object.keys(HOMES).find((k) => HOMES[k][name]);
const DOOR = 0x69, STEP = 0x61, WATER = 0x10;
const layouts = {}, points = [];

// One city being laid out: a grid of ground kinds, then buildings and props.
function city(name, ground) {
  const home = homeOf(name), base = HOMES[home][name], W = base.width, H = base.height;
  const m = { name, home, W, H, base, kinds: [], solid: new Uint8Array(W * H), behavior: new Uint8Array(W * H), items: [], doors: {},
    warps: base.warps.map((w) => ({ ...w })), people: base.people.map((p) => ({ ...p })), signs: [], moved: {} };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m.kinds.push(ground(x, y));
  m.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : m.kinds[y * W + x]);
  m.set = (x, y, w, h, kind) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) m.kinds[j * W + i] = kind; };
  m.block = (x, y, w, h, on = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) m.solid[j * W + i] = on; };
  // A building; warp (an index) puts that warp on its door.
  m.build = (stamp, x, y, opts = {}) => {
    const s = A.STAMPS[stamp], rows = opts.rows || Array.from({ length: s[4] }, (_, i) => i), h = rows.length;
    m.block(x, y, s[3], h);
    m.items.push({ z: y + h, draw: (c) => A.draw(c, stamp, x, y, { rows, tint: opts.tint }) });
    if (opts.warp != null) { if (s[5] == null) throw new Error(stamp + " has no door"); m.warp(opts.warp, x + s[5], y + h - 1, DOOR); }
    return { x, y, w: s[3], h };
  };
  m.prop = (stamp, x, y, solid = true) => { const s = A.STAMPS[stamp]; if (solid) m.block(x, y, s[3], s[4]); m.items.push({ z: y + s[4], draw: (c) => A.draw(c, stamp, x, y) }); };
  m.paint = (z, draw) => m.items.push({ z, draw });
  m.warp = (index, x, y, behavior) => { const w = m.warps[index]; if (!w) throw new Error(name + ": no warp " + index); m.moved[index] = [w.x, w.y]; w.x = x; w.y = y; m.doors[index] = behavior; };
  m.person = (script, x, y) => { const p = m.people.find((a) => a.script === script); if (!p) throw new Error(name + ": no actor " + script); p.x = x; p.y = y; };
  m.sign = (x, y, script) => { m.signs.push({ x, y, script }); m.block(x, y, 1, 1); m.items.push({ z: y + 1, draw: (c) => A.draw(c, "board", x, y) }); };
  return m;
}

const GROUND_TILE = { paving: "paving", road: "asphalt", brick: "brick", ornate: "ornate", water: "water", deck: "deck", lawn: "lawn", tree: "tree" };
const WALK = new Set(["paving", "road", "brick", "ornate", "deck", "plaza"]);

function finish(m, extra = {}) {
  const { W, H, base, name } = m, c = canvas(W * 16, H * 16), top = canvas(W * 16, H * 16);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const kind = m.kinds[y * W + x], i = y * W + x;
    if (typeof kind === "object") { A.tile(c, kind.tile, x, y); if (kind.tint) for (let j = 0; j < 16; j++) for (let k = 0; k < 16; k++) c.p(x * 16 + k, y * 16 + j, kind.tint); if (!kind.walk) m.solid[i] = 1; continue; }
    A.tile(c, GROUND_TILE[kind] || "paving", x, y);
    if (kind === "water") m.behavior[i] = WATER; else if (!WALK.has(kind)) m.solid[i] = 1;
  }
  if (extra.ground) extra.ground(c);
  for (const it of m.items.sort((a, b) => a.z - b.z)) it.draw(c, top);
  // Warps and actors stand on open ground, whatever was drawn around them.
  const behavior = Array.from(m.behavior), collision = Array.from(m.solid);
  m.warps.forEach((w, k) => {
    const i = w.y * W + w.x; collision[i] = 0;
    behavior[i] = m.doors[k] != null ? m.doors[k] : base.behavior[base.warps[k].y * W + base.warps[k].x];
  });
  for (const p of m.people) if (collision[p.y * W + p.x]) throw new Error(name + ": " + p.script + " stands on solid ground at " + p.x + "," + p.y);
  // Everything a visitor needs is reachable on foot from the first warp.
  const start = m.warps[extra.start || 0], seen = new Set([start.y * W + start.x]), q = [start.y * W + start.x];
  const taken = new Set(m.people.map((p) => p.y * W + p.x));
  for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) {
    const j = q[k] + d, x = j % W;
    if (j < 0 || j >= W * H || (Math.abs(d) === 1 && Math.abs(x - q[k] % W) !== 1) || seen.has(j)) continue;
    if (collision[j] || behavior[j] === WATER) continue;
    seen.add(j); if (!taken.has(j)) q.push(j);
  }
  m.warps.forEach((w, k) => { if (!seen.has(w.y * W + w.x)) throw new Error(name + ": warp " + k + " (" + w.map + ") is cut off at " + w.x + "," + w.y); });
  for (const p of m.people) if (!seen.has(p.y * W + p.x)) throw new Error(name + ": " + p.script + " is cut off");
  for (const w of m.warps.filter((w, k) => behavior[w.y * W + w.x] === DOOR)) if (collision[(w.y + 1) * W + w.x]) throw new Error(name + ": door at " + w.x + "," + w.y + " opens onto a wall");
  c.save(path.join(out, name + ".png")); top.save(path.join(out, name + "-top.png"));
  if (extra.border) { const b = canvas(32, 32); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) A.tile(b, extra.border, x, y); b.save(path.join(out, name + "-border.png")); }
  for (const stale of ["-anim.png"]) fs.rmSync(path.join(out, name + stale), { force: true });
  layouts[name] = { home: m.home, map: { collision, behavior, encounter: Array(W * H).fill(0), warps: m.warps, people: m.people, signs: m.signs, top: true, cityLayout: true } };
  m.collision = collision; m.walkable = seen;
  return m;
}

// Where someone lands beside a warp: below a door, else the nearest open tile.
function beside(m, index) {
  const w = m.warps[index], W = m.W;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const x = w.x + dx, y = w.y + dy, i = y * W + x;
    if (m.walkable.has(i) && !m.warps.some((v) => v.x === x && v.y === y) && !m.people.some((p) => p.x === x && p.y === y)) return { x, y };
  }
  throw new Error(m.name + ": no landing beside warp " + index);
}
// Stored landing points anywhere in the region's data that aim at a remapped city.
function retarget(m, fixed = {}) {
  const seen = new Set();
  (function walk(o, trail) {
    if (!o || typeof o !== "object" || seen.has(o)) return; seen.add(o);
    if (o.map === m.name && Number.isInteger(o.x) && Number.isInteger(o.y) && !("warp" in o) && trail[1] !== "maps_" + m.name) {
      const key = o.x + "," + o.y;
      let to = fixed[key];
      if (!to) { const k = Object.keys(m.moved).find((k) => { const [x, y] = m.moved[k]; return (x === o.x && y === o.y) || (x === o.x && y + 1 === o.y); }); if (k != null) to = beside(m, +k); }
      if (!to && !m.walkable.has(o.y * m.W + o.x)) throw new Error(m.name + ": stored landing " + trail.join(".") + " " + key + " is now solid");
      if (to) points.push([trail.slice(), to.x, to.y]);
      return;
    }
    for (const k of Object.keys(o)) { if (Array.isArray(o) && o.length > 4000) return; walk(o[k], trail.concat(k)); }
  })({ UNOVA_DATA: ctx.UNOVA_DATA, KALOS_DATA: ctx.KALOS_DATA }, []);
}

// ---------------------------------------------------------------- Castelia City
// Unova's port metropolis: five piers along the southern seawall, a waterfront
// promenade, four streets running north between tower blocks with a back alley
// across them, all converging on the round Central Plaza below the Route 4 gate.
{
  const PIERS = [8, 18, 28, 38, 48], STREETS = [[11, 12], [22, 23], [32, 33], [43, 44]];
  const disc = (x, y) => (x - 27.5) ** 2 + (y - 10) ** 2 <= 6.3 ** 2;
  const m = city("UnovaCasteliaCity", (x, y) => {
    if (y >= 43) return PIERS.some((p) => Math.abs(x - p) <= 1) && y <= 54 ? "deck" : "water";
    if (x < 2 || x > 53 || y < 2) return "water";
    if (disc(x, y)) return "plaza";
    if (y >= 39) return "paving";                                   // promenade
    if (STREETS.some(([a, b]) => x >= a && x <= b) && y >= 4) return "road";
    if ((y === 25 || y === 26)) return "road";                       // back alley
    if ((y >= 9 && y <= 11) && x >= 11 && x <= 44) return "road";    // the cross street into the plaza
    if (x >= 27 && x <= 28 && y < 10) return "road";                 // up to Route 4
    return "paving";
  });
  const blue = A.trim(0.25, 0.5, 1), green = A.trim(0.3, 0.75, 0.35), gold = A.trim(0.95, 0.75, 0.2), violet = A.trim(0.65, 0.35, 0.9);
  const short = (n, drop) => Array.from({ length: n }, (_, i) => i).filter((i) => !drop.includes(i));
  // North wall of towers behind the plaza and the cross street.
  for (const [x, stamp, tint] of [[2, "towerShort", blue], [6, "towerSlim"], [13, "towerShort"], [17, "brickFlat"], [34, "brickFlat"], [39, "towerShort", gold], [45, "towerSlim"], [50, "towerShort", green]]) {
    const h = A.STAMPS[stamp][4]; m.build(stamp, x, 8 - h + (x < 13 || x > 44 ? 0 : 0), { tint });
  }
  // Upper blocks: their doors open onto the back alley.
  m.build("dishTower", 2, 9, { warp: 3 });                                  // Battle Company
  m.build("studio", 13, 15, { warp: 5, tint: A.trim(0.45, 0.8, 0.25) });     // Castelia Gym
  m.build("towerDoor", 24, 16, { warp: 11, tint: blue });                    // GAME FREAK
  m.build("towerDoor2", 34, 16, { warp: 1, tint: gold });                    // Medal Office
  m.build("towerShort", 39, 16, { tint: violet });
  m.build("dishTower", 45, 9, { warp: 2, tint: blue });                      // Passerby Analytics HQ
  // Lower blocks: their doors open onto the waterfront.
  m.build("brickTall", 2, 29);
  m.build("towerDoor", 6, 30, { warp: 12, tint: green });                    // Badge Office
  m.build("towerDoor2", 13, 30, { warp: 14, tint: violet });                 // Fennel's Dream Lab
  m.build("towerSlim", 18, 27, { rows: short(14, [9, 10]) });
  m.build("brickFlat", 24, 27, { rows: short(7, [2]) });
  m.build("academy", 23, 31, { warp: 8 });                                   // Café Sonata
  m.build("towerDoor", 34, 30, { warp: 21 });                                // Street 6 arcade
  m.build("towerShort", 39, 30, { tint: blue });
  m.build("brickFlat", 46, 27, { rows: short(7, [2]) });
  m.build("centerRed", 46, 33, { warp: 0 });                                 // Pokémon Center
  // Central Plaza.
  m.prop("twinFountain", 26, 8);
  for (const [x, y] of [[23, 6], [32, 6], [23, 14], [32, 14]]) m.prop("bush", x, y);
  for (const [x, y] of [[24, 12], [31, 12]]) m.prop("bench", x, y);
  // Street furniture.
  for (const x of [20, 30]) for (const y of [18, 20, 22]) m.prop("bush", x, y);
  for (const x of [41]) for (const y of [34, 36]) m.prop("bush", x, y);
  for (const x of [14, 16, 18, 20, 35, 37, 39, 41]) m.prop("bush", x, 13);
  for (const x of [5, 15, 25, 31, 41, 51]) m.prop("bench", x, 40, false);
  m.sign(3, 39, "bw:city-building-closed"); m.sign(21, 39, "bw:city-building-closed"); m.sign(42, 39, "bw:city-building-closed");
  // Gates, alleys and piers.
  m.warp(6, 28, 3, STEP);       // Route 4 gate
  m.warp(7, 53, 41, STEP);      // Skyarrow Bridge gate
  m.warp(4, 18, 42, STEP);      // Castelia Sewers
  m.warp(9, 8, 51, STEP);       // Liberty Pier
  m.warp(13, 28, 46, STEP);     // Prime Pier: the Virbank ferry
  m.warp(10, 38, 51, STEP);     // Cruise Dock
  m.warp(19, 48, 51, STEP);     // Unity Pier
  m.warp(15, 2, 26, STEP); m.warp(16, 53, 26, STEP);     // back alley, west and east
  m.warp(17, 11, 4, STEP); m.warp(18, 44, 4, STEP);      // the outer streets' far ends
  m.warp(20, 2, 41, STEP);                                // promenade, west end
  m.person("bw:castelia-ferry", 28, 51); m.person("bw:harlequin-hunt", 30, 40); m.person("bw:iris", 19, 40); m.person("bw:next-road", 28, 5);
  // Seawall, pier rails, lamps, the plaza's paving ring and the sewer hatch.
  m.paint(0, (c) => {
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) if (m.at(x, y) === "plaza") {
      A.tile(c, "paving", x, y);
      const d = Math.hypot(x + 0.5 - 28, y + 0.5 - 10.5);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const r = Math.hypot(x * 16 + i - 448, y * 16 + j - 168) / 16; if ((r > 5.4 && r < 5.75) || (r > 3.1 && r < 3.3)) c.p(x * 16 + i, y * 16 + j, [150, 164, 196]); else if (r > 3.3 && r < 5.4 && d > 0) c.p(x * 16 + i, y * 16 + j, [226, 214, 190, 70]); }
    }
    for (let x = 32; x < 54 * 16; x++) { const pier = PIERS.some((p) => Math.abs((x >> 4) - p) <= 1); if (pier) continue; c.rect(x, 43 * 16, 1, 5, [214, 220, 236]); c.rect(x, 43 * 16 + 5, 1, 4, (x >> 3) % 2 ? [150, 160, 186] : [134, 144, 172]); c.rect(x, 43 * 16 + 9, 1, 2, [60, 96, 160]); }
    for (const p of PIERS) for (const side of [-1, 1]) { const x = (p + (side < 0 ? -1 : 2)) * 16 + (side < 0 ? 0 : -3); c.rect(x, 43 * 16 + 8, 3, 12 * 16 - 8, [112, 88, 60]); for (let y = 44; y < 55; y += 2) c.rect(x - 1, y * 16, 5, 5, [84, 66, 48]); }
    for (const p of PIERS) c.rect((p - 1) * 16, 55 * 16 - 4, 48, 4, [84, 66, 48]);
    c.box(18 * 16 + 1, 42 * 16 + 2, 14, 12, [58, 64, 78], [30, 32, 40]); for (let k = 0; k < 4; k++) c.rect(18 * 16 + 3, 42 * 16 + 4 + k * 2, 10, 1, [96, 104, 120]);
  });
  for (const x of [6, 16, 26, 36, 46]) m.paint(41, (c, top) => { const px = x * 16 + 6, py = 39 * 16; top.rect(px, py - 14, 3, 26, [70, 78, 96]); top.rect(px - 3, py - 18, 9, 5, [70, 78, 96]); top.rect(px - 2, py - 17, 7, 3, [255, 240, 170]); c.rect(px - 1, py + 12, 5, 3, [50, 56, 72]); });
  // The ferry moored at Prime Pier.
  m.paint(60, (c) => {
    const x = 30 * 16 + 5, y = 44 * 16 + 6;
    c.poly([[x + 3, y], [x + 37, y], [x + 40, y + 96], [x + 20, y + 132], [x, y + 96]], [38, 52, 92]);
    c.poly([[x + 5, y + 3], [x + 35, y + 3], [x + 37, y + 95], [x + 20, y + 126], [x + 3, y + 95]], [240, 242, 248]);
    c.poly([[x + 8, y + 96], [x + 32, y + 96], [x + 20, y + 118]], [206, 212, 226]);
    c.box(x + 8, y + 10, 24, 62, [214, 220, 234], [118, 128, 156]);
    for (let k = 0; k < 5; k++) { c.rect(x + 11, y + 15 + k * 11, 7, 6, [112, 172, 228]); c.rect(x + 22, y + 15 + k * 11, 7, 6, [112, 172, 228]); }
    c.ellipse(x + 20, y + 84, 6, 6, [150, 44, 44]); c.ellipse(x + 20, y + 84, 4, 4, [204, 74, 66]); c.ellipse(x + 20, y + 84, 2, 2, [40, 36, 44]);
    c.rect(x - 4, y + 30, 6, 3, [112, 88, 60]); c.rect(x - 4, y + 70, 6, 3, [112, 88, 60]);
  });
  finish(m, { border: "water", start: 6 });
  retarget(m, { "28,7": { x: 28, y: 7 }, "9,12": beside(m, 5) });
  m.gymFront = beside(m, 5);
}

// ---------------------------------------------------------------- Lumiose City
// Kalos's capital is one ring boulevard around Prism Tower. Its two maps are the
// ring's halves: South Boulevard curves from the Route 5 gate round to Route 4,
// North Boulevard from Route 13 over Route 14 to Route 16, and Vernal Avenue
// runs straight through both to Centrico Plaza at the tower's foot.
const roof = (r, g, b) => ([R, G, B]) => (Math.abs(R - G) < 16 && Math.abs(G - B) < 24 && R < 124) ? [Math.min(255, R * r), Math.min(255, G * g), Math.min(255, B * b)] : [R, G, B];
const plaza = (m, cx, cy, r, tint) => { for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r && (WALK.has(m.at(x, y)) || (m.at(x, y) || {}).walk)) m.set(x, y, 1, 1, { tile: "ornate", tint, walk: true }); };
const COBBLE = { tile: "ornate", tint: [244, 228, 190, 120], walk: true };
const beds = (m, list) => { for (const [x, y, w, h] of list) { m.set(x, y, w, h, "lawn"); for (let j = y; j < y + h; j += 2) for (let i = x; i < x + w; i += 2) m.prop("hedge", i, j); } };
const hedges = (m, list) => { for (const [x, y] of list) m.prop("hedge", x, y); };
function prismTower(cx, by, split) {
  return (c, top) => {
    const t = canvas(c.w, c.h), steel = [96, 116, 150], light = [186, 206, 232], dark = [52, 62, 92], glow = [255, 234, 128];
    t.poly([[cx - 40, by], [cx - 27, by - 50], [cx + 27, by - 50], [cx + 40, by]], dark);
    t.poly([[cx - 37, by - 1], [cx - 25, by - 48], [cx + 25, by - 48], [cx + 37, by - 1]], steel);
    for (let k = -3; k <= 3; k++) t.line(cx + k * 9, by - 48, cx + k * 12, by - 1, dark);
    for (let y = by - 40; y < by; y += 10) t.line(cx - 36, y, cx + 36, y, dark);
    t.ellipse(cx, by, 15, 30, dark); t.ellipse(cx, by, 12, 27, [28, 30, 46]); t.rect(cx - 7, by - 15, 14, 15, glow); t.rect(cx - 1, by - 15, 2, 15, [196, 150, 60]);
    t.rect(cx - 31, by - 56, 62, 7, light); t.rect(cx - 31, by - 50, 62, 1, dark);
    t.poly([[cx - 24, by - 56], [cx - 12, by - 122], [cx + 12, by - 122], [cx + 24, by - 56]], dark);
    t.poly([[cx - 22, by - 57], [cx - 11, by - 121], [cx + 11, by - 121], [cx + 22, by - 57]], steel);
    for (let y = by - 110; y < by - 56; y += 13) { const w = 11 + (y - (by - 121)) * 11 / 64; t.line(cx - w, y, cx + w, y + 12, light); t.line(cx + w, y, cx - w, y + 12, light); t.line(cx - w, y, cx + w, y, dark); }
    t.rect(cx - 17, by - 128, 34, 7, light); t.rect(cx - 17, by - 122, 34, 1, dark);
    t.poly([[cx - 10, by - 128], [cx - 4, by - 190], [cx + 4, by - 190], [cx + 10, by - 128]], dark);
    t.poly([[cx - 8, by - 129], [cx - 3, by - 189], [cx + 3, by - 189], [cx + 8, by - 129]], steel);
    for (let y = by - 180; y < by - 130; y += 10) t.line(cx - 7, y, cx + 7, y, light);
    t.rect(cx - 1, by - 222, 3, 34, dark); t.ellipse(cx, by - 222, 3, 3, glow);
    for (const [x, y] of [[-31, -53], [31, -53], [-17, -125], [17, -125], [0, -190], [-24, -30], [24, -30]]) t.ellipse(cx + x, by + y, 2, 2, glow);
    for (let i = 0; i < t.data.length; i += 4) if (t.data[i + 3]) { const y = (i / 4 / t.w) | 0; if (y >= by) continue; (y < split ? top : c).p((i / 4) % t.w, y, [t.data[i], t.data[i + 1], t.data[i + 2]]); }
  };
}
{
  // South Boulevard: the ring's lower arc, corners rounded about (12,23) and (35,23).
  const within = (x, y, r) => y >= 4 && x >= 12 - r && x <= 35 + r && y <= 23 + r && !(x < 12 && y > 23 && Math.hypot(x - 12, y - 23) > r) && !(x > 35 && y > 23 && Math.hypot(x - 35, y - 23) > r);
  const m = city("KalosLumioseSouth", (x, y) => {
    if ((x === 24 && (y === 33 || y === 34)) || (x === 2 && y === 25) || (x === 45 && y === 16)) return COBBLE;
    if (!within(x, y, 9.5)) return "tree";
    if (!within(x, y, 4.5) || (x >= 23 && x <= 25)) return COBBLE;
    return "brick";
  });
  m.build("church", 11, 5, { warp: 2 });                                   // Sycamore Pokémon Lab
  m.build("hearthCenter", 28, 6, { warp: 4 });                             // Pokémon Center
  m.build("mart", 9, 15, { warp: 8 });                                     // shopping arcade
  m.build("gable", 18, 14, { warp: 6, tint: roof(0.7, 1.5, 0.8) });        // Herboriste
  m.build("gable", 33, 14, { warp: 3, tint: roof(1.9, 1.5, 0.6) });        // Café Soleil
  m.build("gable", 28, 14, { tint: roof(1.5, 0.8, 0.8) });
  m.build("gable", 2, 30); m.build("gable", 42, 30, { tint: roof(1.5, 0.8, 0.8) });
  beds(m, [[9, 6, 1, 7], [20, 10, 2, 3], [28, 13, 9, 1], [36, 6, 3, 1], [9, 21, 2, 5], [37, 21, 2, 5], [19, 26, 3, 1], [27, 26, 3, 1]]);
  plaza(m, 15.5, 23.5, 3.3, [70, 190, 110, 80]); m.prop("fountain", 14, 21);  // Vert Plaza
  plaza(m, 32.5, 23.5, 3.3, [70, 120, 230, 80]); m.prop("fountain", 31, 21);  // Bleu Plaza
  hedges(m, [[22, 6], [22, 8], [22, 10], [22, 12], [26, 6], [26, 8], [26, 10], [26, 12], [22, 16], [22, 18], [26, 16], [26, 18], [22, 22], [22, 24], [26, 22], [26, 24], [20, 6], [20, 8], [36, 8], [36, 10], [14, 15], [14, 17], [38, 15], [38, 17]]);
  m.warp(0, 24, 34, STEP); m.warp(5, 24, 4, STEP);      // Route 4 gate; Vernal Avenue to the north half
  m.warp(1, 2, 25, STEP);                                // Route 5 gate
  m.warp(7, 45, 16, STEP);                               // Looker's alley
  m.person("xy:lumiose-blackout", 23, 7); m.person("xy:travel", 36, 30);
  finish(m, { border: "tree" });
  retarget(m);
}
{
  // North Boulevard: the upper arc, corners rounded about (12,13) and (35,13).
  const within = (x, y, r) => y <= 37 && x >= 12 - r && x <= 35 + r && y >= 13 - r && !(x < 12 && y < 13 && Math.hypot(x - 12, y - 13) > r) && !(x > 35 && y < 13 && Math.hypot(x - 35, y - 13) > r);
  const m = city("KalosLumioseNorth", (x, y) => {
    if ((x === 24 && y === 3) || (x === 2 && y === 14) || (x === 45 && [12, 19, 25, 34].includes(y))) return COBBLE;
    if (!within(x, y, 9.5)) return "tree";
    if (!within(x, y, 4.5) || (x >= 23 && x <= 25) || (y >= 28 && y <= 30)) return COBBLE;
    return "brick";
  });
  plaza(m, 24.5, 29.5, 6.6, [255, 236, 170, 60]);                          // Centrico Plaza
  m.block(22, 26, 5, 4); m.paint(30, prismTower(24 * 16 + 8, 30 * 16, 26 * 16)); m.warp(5, 24, 29, DOOR);
  m.build("hearthCenter", 9, 11, { warp: 4 });                             // Pokémon Center
  m.build("mart", 17, 11, { warp: 14 });                                   // north arcade
  m.build("church", 9, 19, { warp: 10 });                                  // Lumiose Museum
  m.build("hall", 27, 10, { warp: 7 });                                    // Lumiose Station
  m.build("gym", 32, 22, { warp: 9 });                                     // Hotel Richissime
  m.build("gable", 9, 31, { warp: 2, tint: roof(1.9, 0.6, 0.6) });         // Lysandre Café
  m.build("gable", 14, 31, { warp: 8, tint: roof(0.8, 1, 1.6) });          // Looker Bureau
  m.build("gable", 31, 31, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 36, 31);
  m.build("gable", 2, 1, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 42, 1);
  beds(m, [[27, 18, 1, 1], [38, 10, 1, 8], [15, 27, 3, 1], [37, 27, 2, 1], [19, 36, 3, 1], [27, 31, 3, 1], [8, 9, 1, 1]]);
  plaza(m, 19.5, 21.5, 2.3, [250, 220, 70, 90]); m.prop("fountain", 18, 19);    // Jaune Plaza
  plaza(m, 28.5, 21.5, 2.3, [230, 70, 70, 80]); m.prop("fountain", 27, 19);     // Rouge Plaza
  plaza(m, 28.5, 34.5, 2.3, [220, 80, 200, 80]);                                 // Magenta Plaza
  hedges(m, [[22, 10], [22, 12], [22, 14], [22, 16], [26, 10], [26, 12], [26, 14], [26, 16], [22, 18], [26, 18], [16, 12], [16, 14], [8, 27], [18, 27], [20, 27], [30, 27], [39, 24], [39, 26], [19, 32], [19, 34], [29, 36], [28, 36]]);
  m.warp(1, 24, 37, STEP);                               // Vernal Avenue to the south half
  m.warp(3, 24, 3, STEP);                                // Route 14 gate
  m.warp(0, 2, 14, STEP);                                // Route 13 gate
  m.warp(6, 45, 19, STEP);                               // Route 16 gate
  m.warp(11, 45, 12, STEP); m.warp(12, 45, 25, STEP); m.warp(13, 45, 34, STEP);   // Looker's alleys
  m.person("xy:travel", 38, 29); m.person("xy:prism-lighting", 24, 21); m.person("xy:az", 24, 9);
  finish(m, { border: "tree", start: 1 });
  retarget(m);
}

// ---------------------------------------------------------------- output
const lines = ["// Generated by tools/build-city-layouts.js. Street plans and decisions: docs/city-layouts.md.",
  "(function(){", "const L=" + JSON.stringify(layouts) + ",P=" + JSON.stringify(points) + ";",
  "for(const n in L){const m=window[L[n].home].maps[n];delete m.anim;Object.assign(m,L[n].map);}",
  "for(const[trail,x,y]of P){let o=window;for(const k of trail)o=o[k];o.x=x;o.y=y;}",
  "window.CITY_LAYOUTS=Object.keys(L);", "})();", ""];
fs.writeFileSync(path.join(root, "data/city-layouts.js"), lines.join("\n"));
console.log("city layouts:", Object.keys(layouts).join(", "), "·", points.length, "landing points moved");
