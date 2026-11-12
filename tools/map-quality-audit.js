// Audits all custom-region maps for remaining placeholder art and traversal risks.
// Run: node tools/map-quality-audit.js [--details]
// Advisory only: known legacy gaps are reported, not silently rewritten.
"use strict";
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [, file] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/"))
    vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
const REGIONS = ["orre", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];
const maps = Object.values(WORLD_MAPS);
const inBounds = (m, a) => Number.isInteger(a.x) && Number.isInteger(a.y) &&
  a.x >= 0 && a.y >= 0 && a.x < m.width && a.y < m.height;
function inspect(m) {
  const n = m.width * m.height;
  const positions = [...(m.warps || []), ...(m.people || [])]
    .filter(a => Number.isInteger(a?.x) && Number.isInteger(a?.y));
  const badShape = !Array.isArray(m.collision) || m.collision.length !== n;
  if (badShape) return { map: m.name, problem: "collision-size", blocked: 0, unreachable: 0,
    invalid: positions.length, anchors: positions.length };
  const invalid = positions.filter(a => !inBounds(m, a));
  const valid = positions.filter(a => inBounds(m, a));
  const blocked = valid.filter(a => m.collision[a.y * m.width + a.x]);
  const start = valid.find(a => !m.collision[a.y * m.width + a.x]) ||
    m.collision.map((value, index) => value ? -1 : index).find(i => i >= 0);
  const first = typeof start === "number" ? start :
    start ? start.y * m.width + start.x : -1;
  const seen = new Set(), queue = [];
  if (first >= 0) { seen.add(first); queue.push(first); }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % m.width, y = (i / m.width) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, k = yy * m.width + xx;
      if (xx < 0 || yy < 0 || xx >= m.width || yy >= m.height ||
        m.collision[k] || seen.has(k)) continue;
      seen.add(k); queue.push(k);
    }
  }
  const unreachable = valid.filter(a => !seen.has(a.y * m.width + a.x)).length;
  return { map: m.name, anchors: positions.length, blocked: blocked.length,
    invalid: invalid.length, unreachable, walkable: seen.size,
    image: m.image || m.name, hasImage: fs.existsSync(path.join(root, "assets/world/maps",
      (m.image || m.name) + ".png")) };
}
const all = {};
for (const region of REGIONS) {
  const regionMaps = maps.filter(m => m.region === region);
  const results = regionMaps.map(inspect), reused = results.filter(r => r.image !== r.map);
  const missing = results.filter(r => r.hasImage === false);
  all[region] = {
    maps: results.length,
    imageAliases: reused.length, // not proof of inferior art, but review candidates
    missingImages: missing.length,
    invalidAnchors: results.reduce((s, r) => s + r.invalid, 0),
    blockedAnchors: results.reduce((s, r) => s + r.blocked, 0),
    disconnectedAnchors: results.reduce((s, r) => s + r.unreachable, 0),
    ...(process.argv.includes("--details") ? {
      issues: results.filter(r => r.problem || r.invalid || r.blocked || r.unreachable ||
        r.hasImage === false || r.image !== r.map)
    } : {})
  };
}
console.log(JSON.stringify(all, null, 2));
// Do not treat inherited map structure as an automatic permission to move an
// NPC or door: many special scripts depend on exact coordinates.
