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
  if (file !== "data/city-layouts.js" && file !== "data/region-layouts.js") vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), ctx, { filename: file });
const HOMES = { UNOVA_DATA: ctx.UNOVA_DATA.maps, KALOS_DATA: ctx.KALOS_DATA.maps };
const homeOf = (name) => Object.keys(HOMES).find((k) => HOMES[k][name]);
const DOOR = 0x69, STEP = 0x61, WATER = 0x10;
const layouts = {}, points = [], aliases = {}, borrowed = {};
// Other regions' maps drawn with one of these cities' old pictures (Alola's Hau'oli
// uses Santalune's): the old picture is kept under a "Classic" name for them.
for (const key of Object.keys(ctx)) for (const m of Object.values((ctx[key] && ctx[key].maps) || {}))
  if (m && m.image && m.image !== m.name && homeOf(m.image)) (borrowed[m.image] = borrowed[m.image] || []).push([key, m.name]);
function keepClassic(name) {
  if (!borrowed[name] || fs.existsSync(path.join(out, name + "Classic.png"))) return;
  for (const f of fs.readdirSync(out)) if (f === name + ".png" || f.startsWith(name + "-")) fs.copyFileSync(path.join(out, f), path.join(out, name + "Classic" + f.slice(name.length)));
}

// One city being laid out: a grid of ground kinds, then buildings and props.
function city(name, ground) {
  keepClassic(name);
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

const GROUND_TILE = { paving: "paving", road: "asphalt", brick: "brick", ornate: "ornate", water: "water", deck: "deck", lawn: "lawn", tree: "tree",
  rock: "rock", grass: "grass", meadow: "meadow", flowersRed: "flowersRed", flowersBlue: "flowersBlue", flowersPink: "flowersPink", sand: "sand", snow: "snow", pine: "pine" };
const WALK = new Set(["paving", "road", "brick", "ornate", "deck", "plaza", "grass", "meadow", "sand", "snow", "flowersRed", "flowersBlue", "flowersPink"]);

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
  if (borrowed[name]) aliases[name] = borrowed[name];
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
// Checked against the games' city map (docs/map-references/cities.md). West to
// east the piers are Liberty, Unity, Prime, the Cruise Dock and the short Thumb
// Pier with the sewer hatch; each of the first four stands at the foot of a
// street: Gym Street, Narrow Street, Mode Street and Castelia Street.
{
  const PIERS = [8, 18, 28, 38, 48], STREETS = [[11, 12], [22, 23], [32, 33], [43, 44]];
  const pierEnd = (p) => (p === 48 ? 49 : 54);                      // Thumb Pier is a stub
  const disc = (x, y) => (x - 27.5) ** 2 + (y - 10) ** 2 <= 6.3 ** 2;
  const m = city("UnovaCasteliaCity", (x, y) => {
    if (y >= 43) return PIERS.some((p) => Math.abs(x - p) <= 1 && y <= pierEnd(p)) ? "deck" : "water";
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
  m.build("dishTower", 2, 9, { warp: 1, tint: gold });                       // Medal Office, on Gym Street's west side
  m.build("studio", 13, 15, { warp: 5, tint: A.trim(0.45, 0.8, 0.25) });     // Castelia Gym, between Gym Street and Narrow Street
  m.build("towerDoor", 24, 16, { warp: 8, tint: violet });                   // Café Sonata, off Narrow Street
  m.build("towerDoor2", 34, 16, { warp: 14, tint: gold });                   // Fennel's Dream Lab
  m.build("towerShort", 39, 16, { tint: violet });
  m.build("dishTower", 45, 9, { warp: 11, tint: blue });                     // GAME FREAK, on Castelia Street's east side
  // Lower blocks: their doors open onto the waterfront.
  m.build("brickTall", 2, 29);
  m.build("towerDoor", 6, 30, { warp: 12, tint: green });                    // Badge Office
  m.build("towerDoor2", 13, 30, { warp: 2, tint: violet });                  // Passerby Analytics HQ, at the foot of Gym Street
  m.build("towerSlim", 18, 27, { rows: short(14, [9, 10]) });
  m.build("brickFlat", 24, 27, { rows: short(7, [2]) });
  m.build("academy", 23, 31, { warp: 3 });                                   // Battle Company, facing Prime Pier
  m.build("brickFlat", 36, 27, { rows: short(7, [2]) });
  m.build("centerRed", 35, 33, { warp: 0 });                                 // Pokémon Center, between Mode Street and Castelia Street
  m.build("towerDoor", 45, 30, { warp: 21 });                                // Street 6 arcade
  m.build("brickTall", 50, 29, { tint: blue });
  // Central Plaza.
  m.prop("twinFountain", 26, 8);
  for (const [x, y] of [[23, 6], [32, 6], [23, 14], [32, 14]]) m.prop("bush", x, y);
  for (const [x, y] of [[24, 12], [31, 12]]) m.prop("bench", x, y);
  // Street furniture.
  for (const x of [20, 30]) for (const y of [18, 20, 22]) m.prop("bush", x, y);
  for (const x of [14, 16, 18, 20, 35, 37, 39, 41]) m.prop("bush", x, 13);
  for (const x of [5, 15, 25, 31, 41, 51]) m.prop("bench", x, 40, false);
  m.sign(3, 39, "bw:city-building-closed"); m.sign(21, 39, "bw:city-building-closed"); m.sign(42, 39, "bw:city-building-closed");
  // Gates, alleys and piers.
  m.warp(6, 28, 3, STEP);       // Route 4 gate
  m.warp(7, 53, 41, STEP);      // Skyarrow Bridge gate
  m.warp(9, 8, 51, STEP);       // Liberty Pier
  m.warp(19, 18, 51, STEP);     // Unity Pier
  m.warp(13, 28, 46, STEP);     // Prime Pier: the Virbank ferry
  m.warp(10, 38, 51, STEP);     // Cruise Dock
  m.warp(4, 48, 47, STEP);      // Thumb Pier: the Castelia Sewers
  m.warp(15, 2, 26, STEP); m.warp(16, 53, 26, STEP);     // back alley, west and east
  m.warp(17, 11, 4, STEP); m.warp(18, 44, 4, STEP);      // the outer streets' far ends
  m.warp(20, 2, 41, STEP);                                // promenade, west end
  m.person("bw:castelia-ferry", 28, 51); m.person("bw:harlequin-hunt", 30, 40); m.person("bw:iris", 46, 41); m.person("bw:next-road", 28, 5);
  // Seawall, pier rails, lamps, the plaza's paving ring and the sewer hatch.
  m.paint(0, (c) => {
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) if (m.at(x, y) === "plaza") {
      A.tile(c, "paving", x, y);
      const d = Math.hypot(x + 0.5 - 28, y + 0.5 - 10.5);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const r = Math.hypot(x * 16 + i - 448, y * 16 + j - 168) / 16; if ((r > 5.4 && r < 5.75) || (r > 3.1 && r < 3.3)) c.p(x * 16 + i, y * 16 + j, [150, 164, 196]); else if (r > 3.3 && r < 5.4 && d > 0) c.p(x * 16 + i, y * 16 + j, [226, 214, 190, 70]); }
    }
    for (let x = 32; x < 54 * 16; x++) { const pier = PIERS.some((p) => Math.abs((x >> 4) - p) <= 1); if (pier) continue; c.rect(x, 43 * 16, 1, 5, [214, 220, 236]); c.rect(x, 43 * 16 + 5, 1, 4, (x >> 3) % 2 ? [150, 160, 186] : [134, 144, 172]); c.rect(x, 43 * 16 + 9, 1, 2, [60, 96, 160]); }
    for (const p of PIERS) for (const side of [-1, 1]) { const x = (p + (side < 0 ? -1 : 2)) * 16 + (side < 0 ? 0 : -3); c.rect(x, 43 * 16 + 8, 3, (pierEnd(p) - 42) * 16 - 8, [112, 88, 60]); for (let y = 44; y <= pierEnd(p); y += 2) c.rect(x - 1, y * 16, 5, 5, [84, 66, 48]); }
    for (const p of PIERS) c.rect((p - 1) * 16, (pierEnd(p) + 1) * 16 - 4, 48, 4, [84, 66, 48]);
    c.box(48 * 16 + 1, 47 * 16 + 2, 14, 12, [58, 64, 78], [30, 32, 40]); for (let k = 0; k < 4; k++) c.rect(48 * 16 + 3, 47 * 16 + 4 + k * 2, 10, 1, [96, 104, 120]);
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
// ring's halves, joined by Vernal Avenue, which runs to Centrico Plaza at the
// tower's foot. Checked against the games' city plan (docs/map-references/cities.md):
// Route 5 leaves the south-west and Route 4 the south-east, Route 13 the west,
// Route 14 the north and Route 16 the east; Bleu Plaza is south-west and Vert
// south-east of the tower, Magenta west, Rouge north and Jaune east.
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
    if ((x === 40 && y === 32) || (x === 7 && y === 32) || (x === 45 && y === 16)) return COBBLE;
    if (!within(x, y, 9.5)) return "tree";
    if (!within(x, y, 4.5) || (x >= 23 && x <= 25)) return COBBLE;
    return "brick";
  });
  // On South Boulevard, either side of Vernal Avenue's foot: the Pokémon Center and the lab.
  m.build("hearthCenter", 15, 22, { warp: 4 });                            // Pokémon Center
  m.build("church", 27, 20, { warp: 2 });                                  // Sycamore Pokémon Lab
  m.build("gable", 36, 22, { warp: 3, tint: roof(1.9, 1.5, 0.6) });        // Café Soleil
  m.build("gable", 9, 22, { warp: 6, tint: roof(0.7, 1.5, 0.8) });         // Herboriste
  m.build("mart", 10, 5, { warp: 8 });                                     // shopping arcade
  m.build("gable", 28, 5, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 34, 5); m.build("gable", 17, 5, { tint: roof(0.8, 1, 1.6) });
  m.build("gable", 2, 30); m.build("gable", 43, 30, { tint: roof(1.5, 0.8, 0.8) });
  beds(m, [[9, 12, 1, 7], [38, 12, 1, 7], [20, 12, 2, 3], [27, 12, 2, 3], [19, 19, 3, 1], [27, 18, 3, 1]]);
  plaza(m, 15.5, 15.5, 3.3, [70, 120, 230, 80]); m.prop("fountain", 14, 13);  // Bleu Plaza, south-west of the tower
  plaza(m, 32.5, 15.5, 3.3, [70, 190, 110, 80]); m.prop("fountain", 31, 13);  // Vert Plaza, south-east
  hedges(m, [[22, 6], [22, 8], [22, 10], [22, 12], [26, 6], [26, 8], [26, 10], [26, 12], [22, 16], [22, 18], [26, 16], [26, 18], [22, 22], [22, 24], [26, 22], [26, 24], [15, 10], [23, 30], [25, 30]]);
  m.warp(0, 40, 32, STEP);                               // Route 4 gate, south-east
  m.warp(1, 7, 32, STEP);                                // Route 5 gate, south-west
  m.warp(5, 24, 4, STEP);                                // Vernal Avenue to the north half
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
  // Outer side of North Boulevard, by the Route 14 gate: the station and the Pokémon Center.
  m.build("hall", 11, 0, { warp: 7, rows: [4, 5, 6, 7] });                 // Lumiose Station
  m.build("hearthCenter", 27, 0, { warp: 4, rows: [2, 3, 4, 5] });         // Pokémon Center
  m.build("church", 27, 9, { warp: 10 });                                  // Lumiose Museum, across the boulevard from the Center
  m.build("gable", 17, 10, { warp: 8, tint: roof(0.8, 1, 1.6) });          // Looker Bureau, between the boulevard and Rouge Plaza
  m.build("gable", 11, 13, { warp: 2, tint: roof(1.9, 0.6, 0.6) });        // Lysandre Café, beside Magenta Plaza
  m.build("gym", 31, 32, { warp: 9 });                                     // Hotel Richissime
  m.build("mart", 13, 31, { warp: 14 });                                   // north arcade
  m.build("gable", 2, 1, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 42, 1);
  m.build("gable", 9, 31, { tint: roof(1.5, 0.8, 0.8) });
  beds(m, [[9, 10, 1, 7], [38, 10, 1, 9], [15, 27, 3, 1], [32, 27, 3, 1], [19, 33, 3, 1], [27, 33, 3, 1]]);
  plaza(m, 24.5, 13.5, 3.3, [230, 70, 70, 80]); m.prop("fountain", 23, 11);     // Rouge Plaza, north of the tower
  plaza(m, 12.5, 23.5, 3.3, [220, 80, 200, 80]); m.prop("fountain", 11, 21);    // Magenta Plaza, west
  plaza(m, 35.5, 23.5, 3.3, [250, 220, 70, 90]); m.prop("fountain", 34, 21);    // Jaune Plaza, east
  hedges(m, [[22, 18], [22, 20], [26, 18], [26, 20], [22, 23], [26, 23], [18, 27], [20, 27], [29, 27], [30, 27], [16, 20], [32, 19]]);
  m.warp(1, 24, 37, STEP);                               // Vernal Avenue to the south half
  m.warp(3, 24, 3, STEP);                                // Route 14 gate
  m.warp(0, 2, 14, STEP);                                // Route 13 gate
  m.warp(6, 45, 19, STEP);                               // Route 16 gate
  m.warp(11, 45, 12, STEP); m.warp(12, 45, 25, STEP); m.warp(13, 45, 34, STEP);   // Looker's alleys
  m.person("xy:travel", 38, 29); m.person("xy:prism-lighting", 24, 22); m.person("xy:az", 24, 9);
  finish(m, { border: "tree", start: 1 });
  retarget(m);
}

// ---------------------------------------------------------------- the other Kalos cities
// Each keeps its gates where they were and gets the ground and landmarks it is
// known for. box(x0,y0,x1,y1) is the walkable town; everything else is its border.
const within = (x, y, [x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const gateCells = (m) => m.warps.filter((w, k) => m.base.behavior[w.y * m.W + w.x] === STEP);
// A leafy crown over a building, for the Gyms grown inside great trees.
const crown = (cx, cy, rx, ry) => (c, top) => { for (const [dx, dy, r, col] of [[0, 0.12, 1, [38, 92, 58]], [-0.3, 0, 0.72, [52, 124, 70]], [0.3, 0, 0.72, [52, 124, 70]], [0, -0.22, 0.74, [74, 152, 84]], [-0.18, -0.36, 0.4, [112, 184, 104]]]) top.ellipse(cx + dx * rx, cy + dy * ry, rx * r, ry * r, col); for (let k = 0; k < 46; k++) { const a = hash(k, 7, cx) * 6.28, d = hash(k, 9, cy) * 0.82; top.rect(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d - 3, 3, 2, k % 3 ? [140, 204, 120] : [30, 76, 50]); } };
function simple(name, box, kinds, border, lay) {
  const base = HOMES.KALOS_DATA[name], gates = base.warps.filter((w) => base.behavior[w.y * base.width + w.x] === STEP);
  const m = city(name, (x, y) => {
    const k = kinds(x, y);
    if (k) return k;
    if (gates.some((w) => w.x === x && w.y === y)) return kinds.road;
    return within(x, y, box) ? kinds.ground : border;
  });
  // A road from each gate to the town's edge, so no gate is left in the border.
  for (const w of gates) { let x = w.x, y = w.y; for (let k = 0; k < 8 && !within(x, y, box); k++) { m.set(x, y, 1, 1, kinds.road); x += x < box[0] ? 1 : x > box[2] ? -1 : 0; y += y < box[1] ? 1 : y > box[3] ? -1 : 0; } }
  lay(m);
  finish(m, { border: typeof border === "string" ? border : "tree" });
  retarget(m);
  return m;
}
const road = (kind, rects, ground, extra) => Object.assign((x, y) => (extra && extra(x, y)) || (rects.some((r) => within(x, y, r)) ? kind : null), { road: kind, ground });
const flowerBeds = (m, kind, list) => { for (const [x, y, w, h] of list) m.set(x, y, w, h, kind); };

// The nine below were compared with the games' town pictures (docs/map-references/cities.md);
// where a Gym, Center or landmark stood on the wrong side it was moved.

// Santalune: the fountain plaza where the avenues cross, the Trainers' School north of it,
// the Gym in the north-east corner, the Pokémon Center and boutique to the south-east.
simple("KalosSantaluneCity", [4, 4, 39, 33], road(COBBLE, [[21, 3, 23, 34], [4, 23, 40, 25]], "brick"), "tree", (m) => {
  plaza(m, 22.5, 18.5, 4.6, [244, 228, 190, 120]); m.prop("fountain", 21, 16);
  m.build("church", 24, 5, { warp: 4 });                                 // Trainers' School
  m.build("gym", 33, 5, { warp: 5 });                                    // Santalune Gym
  m.build("hearthCenter", 26, 26, { warp: 3 });
  m.build("mart", 34, 27, { warp: 6 });                                  // boutique, east of the Center
  m.build("gable", 6, 15, { warp: 7, tint: roof(0.8, 1, 1.6) });         // trade house
  m.build("gable", 6, 5, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 6, 26); m.build("gable", 12, 26, { tint: roof(1.5, 0.8, 0.8) });
  m.build("gable", 30, 15, { tint: roof(1.9, 1.5, 0.6) }); m.build("gable", 13, 15, { tint: roof(1.9, 1.5, 0.6) });
  flowerBeds(m, "flowersRed", [[12, 6, 7, 3], [16, 27, 4, 2], [35, 15, 4, 5]]);
  hedges(m, [[20, 6], [20, 10], [20, 28], [20, 31], [24, 28], [24, 31], [14, 22], [17, 22], [28, 22], [31, 22], [34, 22], [11, 22]]);
  m.person("xy:rinka", 35, 11); m.person("xy:alexa", 22, 8); m.person("xy:guide", 23, 29);
});

// Cyllage: sea and beach to the west, the town on its shelf with the Pokémon Center in the
// middle, cliffs to the east and the Gym in them at the south-east.
simple("KalosCyllageCity", [10, 4, 37, 34], road(COBBLE, [[22, 3, 24, 35]], "brick", (x, y) => (y < 2 || y > 37 ? null : x >= 2 && x <= 8 ? "water" : x >= 9 && x <= 12 && y >= 2 ? "sand" : null)), "rock", (m) => {
  m.build("gym", 30, 28, { warp: 2 });                                   // Cyllage Gym
  m.build("mart", 14, 6, { warp: 5 });                                   // boutique, north of the Center
  m.build("hearthCenter", 14, 14, { warp: 4 });
  m.build("gable", 27, 14, { warp: 1, tint: roof(1.9, 1.5, 0.6) });      // bicycle shop, east of the Center
  m.build("gable", 15, 24, { warp: 6, tint: roof(0.8, 1, 1.6) });        // trade house
  m.build("gable", 27, 5); m.build("gable", 32, 5, { tint: roof(1.5, 0.8, 0.8) });   // the hotel and café at the north end
  for (const [x, y, w, h] of [[36, 4, 2, 21], [31, 23, 7, 3], [10, 4, 3, 1], [37, 26, 1, 9]]) m.set(x, y, w, h, "rock");
  for (const [x, y] of [[4, 8], [6, 20], [3, 29], [7, 33]]) m.paint(y + 1, (c) => { c.ellipse(x * 16 + 8, y * 16 + 9, 7, 6, [70, 78, 96]); c.ellipse(x * 16 + 7, y * 16 + 7, 5, 4, [120, 130, 150]); });
  hedges(m, [[21, 8], [21, 14], [21, 20], [21, 26], [25, 8], [25, 20], [25, 30], [20, 31], [19, 22], [13, 22]]);
  m.person("xy:strength", 29, 24);
});

// Shalour: the Tower of Mastery on its islet in the bay to the north, reached over the sand;
// the Gym on the town's west side, the Pokémon Center south of the causeway.
simple("KalosShalourCity", [4, 15, 40, 33], road(COBBLE, [[22, 14, 24, 33], [4, 23, 41, 25]], "paving", (x, y) => (y >= 2 && y <= 14 && x >= 2 && x <= 43 ? (Math.hypot(x - 22.5, (y - 7) * 1.25) <= 6.6 || (x >= 21 && x <= 24 && y >= 9) ? "sand" : "water") : null)), "tree", (m) => {
  m.build("temple", 18, 3, { warp: 1 });                                 // Tower of Mastery
  m.paint(10, (c, top) => { const cx = 23 * 16, by = 3 * 16 + 6; top.poly([[cx - 26, by], [cx - 16, by - 34], [cx + 16, by - 34], [cx + 26, by]], [150, 158, 172]); top.poly([[cx - 22, by], [cx - 13, by - 31], [cx + 13, by - 31], [cx + 22, by]], [196, 202, 212]); for (let k = 0; k < 3; k++) top.rect(cx - 12 + k * 10, by - 22, 4, 9, [84, 96, 124]); top.poly([[cx - 18, by - 34], [cx, by - 46], [cx + 18, by - 34]], [112, 122, 146]); });
  m.build("gym", 6, 17, { warp: 2 });                                    // Shalour Gym
  m.build("hearthCenter", 26, 26, { warp: 4 });
  m.build("gable", 14, 16, { tint: roof(0.8, 1, 1.6) }); m.build("gable", 28, 16, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 34, 16); m.build("gable", 14, 27); m.build("mart", 7, 27);
  hedges(m, [[21, 17], [21, 20], [25, 17], [25, 20], [21, 28], [21, 31], [5, 22], [38, 28], [38, 30]]);
  m.person("xy:intriguing-stone", 23, 16); m.person("xy:surf-gift", 38, 26); m.person("xy:travel", 34, 31);
});

// Coumarine, seaside: the sea to the north and west, the harbour jetties on the west shore,
// the hotel at the north end, the monorail station on the east side, Route 12 in from the west.
simple("KalosCoumarineLower", [10, 11, 39, 31], road(COBBLE, [[10, 24, 39, 26], [20, 11, 22, 26]], "paving", (x, y) => (x < 2 || x > 41 || y < 2 || y > 33 ? null : y <= 9 || (x <= 8 && y <= 21) ? (((y === 13 || y === 14 || y === 18 || y === 19) && x >= 4 && x <= 8) || ((x === 14 || x === 15) && y >= 6) ? "deck" : "water") : null)), "tree", (m) => {
  m.set(22, 4, 1, 7, "water");                                           // the old north gate's road
  m.set(9, 10, 31, 1, "paving"); m.set(9, 10, 1, 12, "paving");          // the quay
  m.set(22, 2, 12, 8, "paving");                                        // the hotel's headland
  m.set(3, 25, 7, 1, COBBLE); m.warp(0, 3, 25, STEP);                    // Route 12 gate
  m.build("hall", 28, 16, { warp: 1 });                                  // Seaside Station
  m.build("church", 24, 2, { rows: [3, 4, 5, 6, 7] });                   // the hotel
  m.build("gable", 11, 12, { tint: roof(0.8, 1, 1.6) }); m.build("gable", 16, 17, { tint: roof(1.9, 1.5, 0.6) }); m.build("mart", 23, 18);
  m.build("gable", 12, 27, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 30, 27);
  for (const [x, y] of [[9, 12], [9, 16], [9, 21], [17, 10], [19, 10]]) m.prop("barrel", x, y);
  hedges(m, [[19, 13], [23, 13], [19, 27], [23, 27], [26, 27], [36, 27]]);
  m.person("xy:good-rod", 12, 20);
});

// Coumarine, hillcrest: the clifftop quarter above the eastern sea, the Gym in the great tree
// at the north end of the path, the station and the Pokémon Center side by side to the east.
simple("KalosCoumarineUpper", [4, 4, 37, 31], road("sand", [[20, 10, 22, 31], [5, 28, 36, 30], [22, 21, 36, 21]], "grass", (x, y) => (x >= 38 && x <= 40 && y >= 2 && y <= 33 ? "water" : null)), "rock", (m) => {
  m.build("gym", 18, 5, { warp: 3, tint: roof(0.6, 1.3, 0.6) }); m.paint(99, crown(21 * 16 + 8, 5 * 16 + 8, 68, 34));   // Coumarine Gym
  m.build("hall", 27, 13, { warp: 0 });                                  // Hillcrest Station
  m.build("hearthCenter", 27, 22, { warp: 2 });
  m.build("gable", 7, 7, { tint: roof(0.8, 1, 1.6) }); m.build("gable", 10, 19, { tint: roof(1.5, 0.8, 0.8) });
  flowerBeds(m, "flowersBlue", [[6, 15, 8, 2], [28, 6, 8, 3], [6, 26, 8, 1]]);
  hedges(m, [[19, 14], [19, 18], [19, 22], [23, 18], [17, 22], [17, 25], [23, 25]]);
  m.person("xy:coumarine-rival", 23, 13);
});

// Laverre: meadow paths through the flowers, the Gym in the old tree at the heart of the town,
// the Pokémon Center to the south-east, the boutique to the south-west, the factory to the north.
simple("KalosLaverreCity", [4, 3, 38, 33], road("sand", [[21, 9, 23, 34], [5, 28, 37, 30], [21, 18, 39, 20], [6, 9, 23, 10]], "meadow"), "tree", (m) => {
  m.build("hall", 18, 1, { warp: 2 });                                   // Poké Ball Factory
  m.build("gym", 25, 11, { warp: 4, tint: roof(0.7, 1.2, 0.6) }); m.paint(99, crown(28 * 16 + 8, 11 * 16 + 8, 72, 36));   // Laverre Gym
  m.build("hearthCenter", 26, 22, { warp: 0 });
  m.build("mart", 9, 22, { warp: 5 });                                   // boutique
  m.build("gable", 9, 12, { tint: roof(1.6, 0.8, 1.4) }); m.build("gable", 13, 12, { tint: roof(1.6, 0.8, 1.4) });   // the fan club
  m.build("gable", 33, 5, { tint: roof(1.6, 0.8, 1.4) }); m.build("gable", 15, 21, { tint: roof(1.9, 1.5, 0.6) });
  flowerBeds(m, "flowersPink", [[5, 4, 12, 3], [25, 31, 12, 2], [5, 31, 14, 2], [33, 12, 5, 4]]);
  flowerBeds(m, "flowersRed", [[34, 22, 4, 5], [5, 19, 3, 6]]);
  hedges(m, [[20, 12], [20, 15], [24, 16], [20, 23], [20, 26], [24, 26]]);
  m.person("xy:travel", 35, 29); m.person("xy:factory-invitation", 22, 22);
});

// Anistar: the town above the sea, its crystal sundial out on a terrace to the north-west,
// the Gym to the north-east, Route 17 in from the west and Route 18 out to the south-east.
simple("KalosAnistarCity", [4, 4, 35, 33], road(COBBLE, [[21, 5, 23, 33], [4, 18, 35, 20], [5, 28, 35, 30]], "paving", (x, y) => (y < 2 || y > 35 ? null : x >= 37 && x <= 41 ? "water" : x >= 2 && x <= 19 && y <= 15 ? (Math.hypot(x - 11, y - 8.5) <= 4.2 || (x >= 10 && x <= 12 && y >= 9) ? "paving" : "water") : null)), "tree", (m) => {
  m.set(22, 3, 1, 1, "tree");                                            // Route 18 no longer leaves from the north
  m.set(30, 34, 1, 1, COBBLE); m.warp(2, 30, 34, STEP);                  // Route 18 gate
  m.build("gym", 27, 6, { warp: 3, tint: roof(1.3, 0.7, 1.5) });         // Anistar Gym
  m.build("mart", 27, 13, { warp: 4 });                                  // boutique
  m.build("hearthCenter", 7, 22, { warp: 0 });
  m.build("gable", 15, 22); m.build("gable", 26, 22, { tint: roof(0.8, 1, 1.6) }); m.build("gable", 31, 22, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 5, 31, { rows: [3, 4, 5] }); m.build("gable", 14, 31, { rows: [3, 4, 5], tint: roof(1.3, 0.7, 1.5) });
  // The sundial: a rose crystal on its dais out over the water.
  m.block(10, 7, 2, 2);
  m.paint(10, (c, top) => { const cx = 11 * 16, by = 9 * 16 - 2; c.ellipse(cx, by - 4, 22, 9, [150, 158, 176]); c.ellipse(cx, by - 6, 19, 7, [206, 212, 224]); const t = canvas(c.w, c.h); t.poly([[cx - 9, by - 6], [cx - 4, by - 58], [cx + 2, by - 70], [cx + 9, by - 50], [cx + 8, by - 6]], [214, 92, 150]); t.poly([[cx - 6, by - 8], [cx - 3, by - 56], [cx + 1, by - 66], [cx + 1, by - 8]], [246, 150, 196]); t.poly([[cx + 2, by - 8], [cx + 2, by - 64], [cx + 7, by - 50], [cx + 6, by - 8]], [176, 58, 122]); t.line(cx - 2, by - 50, cx - 2, by - 14, [255, 222, 238]); for (let i = 0; i < t.data.length; i += 4) if (t.data[i + 3]) { const y = (i / 4 / t.w) | 0; (y < 7 * 16 ? top : c).p((i / 4) % t.w, y, [t.data[i], t.data[i + 1], t.data[i + 2]]); } });
  hedges(m, [[20, 6], [20, 10], [24, 6], [24, 10], [20, 23], [24, 23], [20, 31], [24, 31], [33, 14], [33, 24]]);
  m.person("xy:travel", 34, 29); m.person("xy:anistar-rival", 22, 22); m.person("xy:legend-lore", 9, 11); m.person("xy:mega-upgrade", 29, 11);
});

// Snowbelle: log cabins in the snow, ringed by frosted pines; the Gym in the middle, the
// Pokémon Center to the east, the Route 19 bridge to the west and the Winding Woods south-west.
simple("KalosSnowbelleCity", [4, 4, 39, 33], road("snow", [], "snow"), "pine", (m) => {
  m.set(22, 34, 1, 1, "pine");                                           // the old south gate
  m.set(3, 19, 1, 1, "snow"); m.warp(1, 3, 19, STEP);                    // Route 19 bridge gate
  m.set(6, 34, 1, 1, "snow"); m.warp(2, 6, 34, STEP);                    // Route 20, the Winding Woods
  m.build("snowGym", 19, 9, { warp: 4 });                                // Snowbelle Gym
  m.build("snowMart", 5, 4, { warp: 5 });                                // boutique
  m.build("cabin", 14, 4, { warp: 6 });                                  // trade house
  m.build("snowCenter", 33, 22, { warp: 0 });
  m.build("cabin", 15, 22); m.build("cabin", 27, 22); m.build("cabin", 8, 22); m.build("cabin", 28, 5); m.build("cabin", 34, 6);
  for (const [x, y, w, h] of [[4, 12, 6, 4], [12, 14, 4, 4], [26, 13, 4, 3], [32, 14, 8, 2], [8, 30, 4, 4], [26, 30, 6, 4], [16, 30, 4, 4], [36, 30, 4, 4]]) m.set(x, y, w, h, "pine");
  m.paint(0, (c) => { for (const [x0, y0, x1, y1] of [[22, 14, 22, 33], [4, 19, 39, 20], [35, 21, 35, 27], [7, 9, 18, 10], [6, 28, 6, 33]]) for (let y = y0 * 16; y < y1 * 16 + 16; y++) for (let x = x0 * 16; x < x1 * 16 + 16; x++) if (hash(x >> 1, y >> 1, 5) > 0.55) c.p(x, y, [196, 208, 230, 120]); });
  m.person("xy:travel", 35, 29);
});

// Kiloude: the southern resort, with the Battle Maison at its heart, the station and its
// track on the west side, the Pokémon Center to the south and the Friend Safari north-east.
simple("KalosKiloudeCity", [4, 4, 39, 34], road("sand", [[20, 18, 22, 25], [5, 23, 38, 25], [16, 12, 37, 14], [20, 5, 22, 9]], "grass"), "tree", (m) => {
  m.build("church", 18, 10, { warp: 1 });                                // Battle Maison
  m.build("hall", 4, 15, { warp: 0 });                                   // Kiloude Station
  m.build("gable", 30, 17, { warp: 2, tint: roof(1.9, 1.5, 0.6) });      // the fashion artist's house
  m.build("gym", 33, 8, { warp: 3, tint: roof(0.6, 1.3, 0.6) });         // Friend Safari
  m.build("hearthCenter", 18, 26, { warp: 4 });
  m.build("gable", 35, 17, { tint: roof(1.5, 0.8, 0.8) }); m.build("gable", 9, 27, { tint: roof(0.8, 1, 1.6) }); m.build("gable", 27, 26, { tint: roof(0.8, 1, 1.6) });
  // The track running north out of the station.
  m.block(8, 2, 3, 13); m.paint(3, (c) => { c.rect(8 * 16, 2 * 16, 48, 13 * 16, [150, 138, 118]); for (let y = 2 * 16 + 2; y < 15 * 16; y += 6) c.rect(8 * 16 + 6, y, 36, 2, [98, 76, 54]); for (const x of [8 * 16 + 12, 8 * 16 + 33]) c.rect(x, 2 * 16, 3, 13 * 16, [70, 74, 86]); });
  flowerBeds(m, "flowersBlue", [[15, 16, 2, 5], [26, 16, 3, 5], [5, 30, 12, 3], [26, 31, 12, 2]]);
  flowerBeds(m, "flowersRed", [[14, 6, 5, 3], [27, 5, 4, 2]]);
  hedges(m, [[17, 12], [26, 12], [17, 15], [26, 15], [16, 28], [26, 28]]);
  m.person("xy:kiloude-rival", 22, 7); m.person("xy:travel", 33, 29); m.person("xy:vs-recorder", 23, 23); m.person("xy:activity-fashion-artist", 30, 23);
});

// ---------------------------------------------------------------- output
const lines = ["// Generated by tools/build-city-layouts.js. Street plans and decisions: docs/city-layouts.md.",
  "(function(){", "const L=" + JSON.stringify(layouts) + ",P=" + JSON.stringify(points) + ",B=" + JSON.stringify(aliases) + ";",
  "for(const n in B)for(const[home,map]of B[n])if(window[home].maps[map].image===n)window[home].maps[map].image=n+'Classic';",
  "for(const n in L){const m=window[L[n].home].maps[n];delete m.anim;Object.assign(m,L[n].map);}",
  "for(const[trail,x,y]of P){let o=window;for(const k of trail)o=o[k];o.x=x;o.y=y;}",
  "window.CITY_LAYOUTS=Object.keys(L);", "})();", ""];
fs.writeFileSync(path.join(root, "data/city-layouts.js"), lines.join("\n"));
console.log("city layouts:", Object.keys(layouts).join(", "), "·", points.length, "landing points moved");
