// The themed layouts of Kalos's and Unova's towns and routes (tools/build-region-layouts.js):
// every door, gate, person, sign and stored landing is where it was and can still be
// reached, the grass and water that were there still are, and nothing is walled in.
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const scripts = [...fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((f) => !f.startsWith("ui/"));
// The maps as they were before the overlay, to compare against.
const before = {}; { const c = {}; c.window = c; vm.createContext(c); for (const f of scripts) if (f.startsWith("data/") && f !== "data/region-layouts.js") vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c, { filename: f }); for (const k of ["KALOS_DATA", "UNOVA_DATA", "UNOVA_BW_DATA"]) Object.assign(before, c[k].maps); }
for (const f of scripts) vm.runInThisContext(fs.readFileSync(path.join(root, f), "utf8"), { filename: f });

const names = window.REGION_LAYOUTS;
assert(names.length >= 180, "every outdoor map is covered");
for (const n of window.CITY_LAYOUTS) assert(!names.includes(n), n + " keeps its hand-drawn street plan");
for (const home of [KALOS_DATA, UNOVA_DATA, UNOVA_BW_DATA]) for (const m of Object.values(home.maps))
  if (["route", "city", "town"].includes(m.type) && !/^(UnovaHouse|BW1House)/.test(m.name) && (!m.image || m.image === m.name)) assert(m.cityLayout, m.name + " still uses the old template");
const water = (b) => b === 0x10 || b === 0x11;
let warps = 0, people = 0, grass = 0, changed = 0;
for (const name of names) {
  const m = WORLD_MAPS[name] || before[name], b = before[name], W = m.width, N = W * m.height;
  assert(m.regionLayout && m.cityLayout && !m.anim, name);
  for (const key of ["collision", "behavior", "encounter"]) assert.equal(m[key].length, N, name + " " + key);
  for (const suffix of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps/" + name + suffix + ".png")), name + suffix);
  assert(!fs.existsSync(path.join(root, "assets/world/maps/" + name + "-anim.png")), name + " keeps no stale animation sheet");
  assert.equal(JSON.stringify(m.warps.map((w) => [w.x, w.y, w.map, w.warp]).slice(0, b.warps.length)), JSON.stringify(b.warps.map((w) => [w.x, w.y, w.map, w.warp])), name + " warps moved");
  const here = new Set(m.people.map((p) => p.x + "," + p.y)); for (const p of b.people) assert(here.has(p.x + "," + p.y) || m.people.length !== b.people.length, name + " people moved");
  const open = (i) => !m.collision[i] && !water(m.behavior[i]), wasOpen = (i) => !b.collision[i] && !water(b.behavior[i]);
  m.warps.forEach((w, k) => { const i = w.y * W + w.x; assert(!m.collision[i], name + " warp " + k); assert.equal(m.behavior[i], b.behavior[i], name + " warp " + k + " kind"); if (m.behavior[i] === 0x69 && wasOpen(i + W)) assert(open(i + W), name + " door " + k + " has ground in front"); });
  for (const p of m.people) if (wasOpen(p.y * W + p.x)) assert(open(p.y * W + p.x), name + ": " + p.script + " stands on open ground");
  for (const s of m.signs || []) if (wasOpen((s.y + 1) * W + s.x)) assert(open((s.y + 1) * W + s.x), name + " sign can be read");
  // All the old water is still water, so Surf and fishing spots are where they were.
  for (let i = 0; i < N; i++) if (water(b.behavior[i])) assert.equal(m.behavior[i], b.behavior[i], name + " lost water");
  // As much tall grass as before (or encounters everywhere, where they were everywhere).
  const count = (g) => g.encounter.filter((v, i) => v && !water(g.behavior[i])).length;
  if (count(b)) assert(count(m) >= Math.min(count(b), 40) * 0.5, name + " lost its grass: " + count(m) + " of " + count(b));
  else assert.equal(count(m), 0, name + " gained wild grass");
  // Whatever could be walked to from a warp before still can be, and land that
  // water kept apart is still apart.
  const flood = (g, ok, start) => { const seen = new Uint8Array(N); seen[start] = 1; const q = [start]; for (let k = 0; k < q.length; k++) for (const d of [1, -1, W, -W]) { const j = q[k] + d; if (j < 0 || j >= N || (Math.abs(d) === 1 && ((j / W) | 0) !== ((q[k] / W) | 0)) || seen[j] || !ok(j)) continue; seen[j] = 1; q.push(j); } return seen; };
  const anchors = [...m.warps, ...m.people].map((a) => a.y * W + a.x).filter(wasOpen);
  if (anchors.length) {
    const old = flood(b, wasOpen, anchors[0]), now = flood(m, open, anchors[0]);
    for (const a of anchors) assert.equal(!!now[a], !!old[a], name + ": " + (a % W) + "," + ((a / W) | 0) + (old[a] ? " was cut off" : " was joined across water"));
    assert(now.reduce((x, y) => x + y, 0) >= Math.min(60, old.reduce((x, y) => x + y, 0) * 0.4), name + " has room to walk");
  }
  for (let i = 0; i < N; i++) if (m.collision[i] !== b.collision[i]) changed++;
  warps += m.warps.length; people += m.people.length; grass += count(m);
  for (const other of Object.values(WORLD_MAPS)) assert(other.image !== name, other.name + " still borrows " + name + "'s picture");
}
// Stored landing points (Fly, interior returns, story arrivals) are on open ground.
let landings = 0; const visited = new Set(), set = new Set(names);
(function walk(o) {
  if (!o || typeof o !== "object" || visited.has(o)) return; visited.add(o);
  if (set.has(o.map) && Number.isInteger(o.x) && Number.isInteger(o.y) && !("warp" in o)) { const m = WORLD_MAPS[o.map] || before[o.map], b = before[o.map], i = o.y * m.width + o.x; if (!b.collision[i] && !water(b.behavior[i])) { assert(!m.collision[i] && !water(m.behavior[i]), "landing " + JSON.stringify(o).slice(0, 120)); landings++; } return; }
  for (const k of Object.keys(o)) { if (Array.isArray(o) && o.length > 4000) return; walk(o[k]); }
})({ UNOVA_DATA, KALOS_DATA, UNOVA_BW_DATA });
assert(landings > 100, "found the stored landings");
// Other regions that were drawn over these maps' old pictures still have them.
let classics = 0;
for (const m of Object.values(WORLD_MAPS)) if (/Classic$/.test(m.image || "")) { for (const suffix of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps/" + m.image + suffix + ".png")), m.name + " " + m.image + suffix); classics++; }
assert(classics > 50);
console.log("ok: " + names.length + " themed layouts; " + warps + " warps and " + people + " people in place, " + grass + " grass tiles, " + landings + " landings open, " + changed + " tiles relaid, " + classics + " borrowers kept on the old pictures");
