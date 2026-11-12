// Galar field geometry. The original Kalos pictures are still temporary art;
// collision must nevertheless form readable streets, paths and interiors rather
// than the independently scattered obstacles of the first Galar prototype.
(function () {
"use strict";
const D = window.GALAR_DATA;
if (!D?.mapNames) return;
const hash = (x, y, seed) => {
  let n = (Math.imul(x + 23, 374761393) + Math.imul(y + 31, 668265263) +
    Math.imul(seed, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
};
const style = name => {
  if (/Stadium|Gym|Tower|Dojo|Lair|Shrine|Arena/.test(name)) return "hall";
  if (/Forest|Weald|Glimwood|Wetlands/.test(name)) return "forest";
  if (/Mine|Cave|Tunnel|EnergyPlant/.test(name)) return "cave";
  if (/City|Town|Village|Wedgehurst|Postwick|Hammerlocke|Hulbury|Turffield|Circhester|Ballonlea|Spikemuth|Wyndon|Station|Center|House|Hotel/.test(name)) return "town";
  if (/Sea|Beach|Coast|Lake|Honeycalm/.test(name)) return "coast";
  if (/Frost|Snow|Crown|Freezington/.test(name)) return "snow";
  return "route";
};
function build(name) {
  const m = D.maps[name];
  if (!m) return false;
  const w = m.width, h = m.height, count = w * h, kind = style(name);
  const seed = [...name].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 31);
  const previousBehavior = m.behavior.slice();
  const collision = Array(count).fill(0), behavior = Array(count).fill(0);
  const elevation = Array(count).fill(0);
  const indoor = /Center|House|Stadium|Gym|Tower|Dojo|Kitchen|Lab|Hotel|Arena|Lair|Station/.test(name);
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  const sparse = kind === "coast" || kind === "town";
  // Group vegetation, rock outcrops and buildings into visible-sized islands.
  // The original per-tile random scatter produced one-tile dead ends everywhere.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    const cluster = hash(Math.floor(x / 4), Math.floor(y / 4), seed) % 100;
    const detail = hash(x, y, seed) % 100;
    const central = Math.abs(x - cx) <= 2 || Math.abs(y - cy) <= 2;
    const aisle = x % 9 <= 1 || y % 9 <= 1;
    let solid = edge;
    if (!edge && indoor) {
      const furniture = y > 2 && y < h - 3 && x > 2 && x < w - 3 &&
        ((x % 9 >= 5 && x % 9 <= 7 && y % 8 >= 3 && y % 8 <= 5) ||
          (y < Math.floor(h / 3) && Math.abs(x - cx) > 3 && cluster < 63));
      solid = !central && furniture;
    } else if (!edge && kind === "town") {
      solid = !central && !aisle && cluster < 68 && detail < 92;
    } else if (!edge) {
      const coverage = { forest: 66, cave: 59, snow: 45, coast: 29, route: 45, hall: 20 }[kind] ?? 45;
      solid = !central && !aisle && cluster < coverage && detail < 92;
    }
    collision[i] = solid ? 1 : 0;
    if (!solid && !indoor && (kind === "forest" || kind === "route" || kind === "snow") &&
        cluster >= 55 && detail < 24) behavior[i] = 2;
  }
  const open = (x, y, radius = 0) => {
    for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++)
      for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) {
        collision[yy * w + xx] = 0;
        behavior[yy * w + xx] = 0;
      }
  };
  // The main plaza/path gives the region a predictable navigational spine.
  for (let x = 1; x < w - 1; x++) open(x, cy, 1);
  for (let y = 1; y < h - 1; y++) open(cx, y, 1);
  open(cx, cy, 2);
  const anchors = [
    ...(m.warps || []),
    ...(m.people || []),
    ...Object.values(window.TOWN_MAP?.galar?.fly || {}).filter(a => a.map === name),
    ...Object.values(window.Player?.CENTERS || {}).filter(a => a.map === name),
    ...(D.start?.map === name ? [D.start] : []),
    ...(D.dlc ? [D.dlc.armorStart, D.dlc.armorReturn,
      D.dlc.crownStart, D.dlc.crownReturn].filter(a => a?.map === name) : [])
  ];
  for (const a of anchors) {
    if (!Number.isInteger(a.x) || !Number.isInteger(a.y) ||
        a.x < 0 || a.y < 0 || a.x >= w || a.y >= h) continue;
    open(a.x, a.y, 1);
    // Connect each entrance and NPC approach to the central path.
    for (let x = Math.min(a.x, cx); x <= Math.max(a.x, cx); x++) open(x, a.y, 1);
    for (let y = Math.min(a.y, cy); y <= Math.max(a.y, cy); y++) open(cx, y, 1);
  }
  // Warp tiles retain any direction-specific behaviors from the source map.
  for (const a of m.warps || []) {
    if (a.x < 0 || a.y < 0 || a.x >= w || a.y >= h) continue;
    const i = a.y * w + a.x;
    collision[i] = 0;
    behavior[i] = previousBehavior[i] || 0;
  }
  // The borrowed Kalos elevation otherwise blocks ostensibly clear corridors.
  m.collision = collision;
  m.behavior = behavior;
  m.elevation = elevation;
  m.galarCustomLayout = { style: kind, seed, connectedAnchors: anchors.length,
    interior: indoor, independent: true, clustered: true };
  return true;
}
for (const name of D.mapNames) build(name);
window.GalarLayouts = { style, hash, rebuild: build };
})();
