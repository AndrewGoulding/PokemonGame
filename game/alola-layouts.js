// Independent, connected 2D field geometry for the Ultra Alola campaign.
// The maps formerly inherited Kalos collision and elevation despite having
// different art and landmarks. Do not move any scripted object or warp.
(function () {
"use strict";
const D = window.ALOLA_DATA;
if (!D?.maps) return;
const hash = (x, y, seed) => {
  let n = (Math.imul(x + 13, 374761393) + Math.imul(y + 29, 668265263) +
    Math.imul(seed, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
};
const style = name => {
  if (/Home|House|Hotel|Center|School|Lab|Dome|Station|Lobby|Room|Shop|Observatory|Thrifty|RR|Elite|Champion|HallOfFame/.test(name)) return "interior";
  if (/Cave|Cavern|Ruins|Grotto|Den|Tunnel|UltraSpace|Wela|LanakilaCave/.test(name)) return "cave";
  if (/Beach|Sea|Coast|Seafolk|Dock|Pool|Brooklet|Route7|Route15/.test(name)) return "coast";
  if (/Lanakila|Snow|Summit/.test(name)) return "snow";
  if (/Cemetery|Memorial|Grave|Ruins/.test(name)) return "memorial";
  if (/Meadow|Jungle|Forest|Garden|Grove|Fields|Ranch|Trail|Mahalo|Wilds/.test(name)) return "forest";
  if (/Desert|Haina/.test(name)) return "desert";
  if (/City|Town|Village|Avenue|PoTown|Aether/.test(name)) return "town";
  return "route";
};
function build(name) {
  const m = D.maps[name];
  if (!m) return false;
  const w = m.width, h = m.height, n = w * h, kind = style(name);
  const seed = [...name].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 31);
  const old = m.behavior.slice(), collision = Array(n).fill(0), behavior = Array(n).fill(0);
  const elevation = Array(n).fill(0), indoor = kind === "interior";
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    const cluster = hash(Math.floor(x / 4), Math.floor(y / 4), seed) % 100;
    const detail = hash(x, y, seed) % 100;
    const avenue = Math.abs(x - cx) <= 2 || Math.abs(y - cy) <= 2 ||
      x % 9 < 2 || y % 9 < 2;
    let solid = edge;
    if (!edge && indoor) {
      solid = !avenue && x > 2 && y > 2 && x < w - 3 && y < h - 3 &&
        ((x % 8 >= 5 && y % 7 >= 3 && y % 7 <= 5) ||
         (y < Math.floor(h / 3) && cluster < 60));
    } else if (!edge) {
      const density = { cave: 70, coast: 28, snow: 54, memorial: 48,
        forest: 66, desert: 42, town: 61, route: 50 }[kind];
      solid = !avenue && cluster < density && detail < 92;
    }
    collision[i] = solid ? 1 : 0;
    // Grass is a feature of walkable terrain, not an obstacle.
    if (!solid && !indoor && m.wild && (old[i] === 2 ||
      (kind === "forest" || kind === "route") && cluster > 55 && detail < 24))
      behavior[i] = 2;
  }
  const open = (x, y, radius = 0) => {
    for (let yy = Math.max(0, y - radius); yy <= Math.min(h - 1, y + radius); yy++)
      for (let xx = Math.max(0, x - radius); xx <= Math.min(w - 1, x + radius); xx++) {
        collision[yy * w + xx] = 0;
        behavior[yy * w + xx] = 0;
      }
  };
  for (let x = 1; x < w - 1; x++) open(x, cy, 1);
  for (let y = 1; y < h - 1; y++) open(cx, y, 1);
  open(cx, cy, 2);
  const anchors = [
    ...(m.warps || []), ...(m.people || []),
    ...Object.values(window.Player?.CENTERS || {}).filter(a => a.map === name),
    ...Object.values(window.TOWN_MAP?.alola?.fly || {}).filter(a => a.map === name),
    ...(D.start?.map === name ? [D.start] : [])
  ];
  for (const a of anchors) {
    if (!Number.isInteger(a.x) || !Number.isInteger(a.y) ||
        a.x < 0 || a.y < 0 || a.x >= w || a.y >= h) continue;
    open(a.x, a.y, 1);
    for (let x = Math.min(a.x, cx); x <= Math.max(a.x, cx); x++) open(x, a.y, 1);
    for (let y = Math.min(a.y, cy); y <= Math.max(a.y, cy); y++) open(cx, y, 1);
  }
  for (const warp of m.warps || []) {
    const { x, y } = warp;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    collision[y * w + x] = 0;
    behavior[y * w + x] = old[y * w + x] || 0;
  }
  m.collision = collision;
  m.behavior = behavior;
  m.elevation = elevation;
  // Do not let a borrowed Kalos top-sheet obscure the new Alola pixel art.
  m.top = false;
  m.alolaCustomLayout = { style: kind, seed, connectedAnchors: anchors.length,
    independent: true, interior: indoor };
  return true;
}
let count = 0;
for (const name of Object.keys(D.maps)) if (build(name)) count++;
window.AlolaLayouts = { build, style, count };
})();
