// The street plans of Castelia and Lumiose (tools/build-city-layouts.js): every
// door, gate and person is reachable on foot, warps still pair up with the rooms
// they led to before, stored landing points are on open ground, and a save left
// on a tile that is now a wall is moved, not lost.
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g))
  if (!file.startsWith("ui/")) vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });

const CITIES = { UnovaCasteliaCity: 22, KalosLumioseSouth: 9, KalosLumioseNorth: 15, KalosSantaluneCity: 8, KalosCyllageCity: 7, KalosShalourCity: 5,
  KalosCoumarineLower: 2, KalosCoumarineUpper: 4, KalosLaverreCity: 6, KalosAnistarCity: 5, KalosSnowbelleCity: 7, KalosKiloudeCity: 5 };
assert.deepEqual(window.CITY_LAYOUTS, Object.keys(CITIES));
const open = (m, x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && !m.collision[y * m.width + x] && m.behavior[y * m.width + x] !== 0x10;
let checks = 0;
for (const [name, warps] of Object.entries(CITIES)) {
  const m = WORLD_MAPS[name];
  assert(m.cityLayout, name);
  for (const key of ["collision", "behavior", "elevation", "encounter"]) assert.equal(m[key].length, m.width * m.height, name + " " + key);
  for (const suffix of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps/" + name + suffix + ".png")), name + suffix);
  assert(!m.anim && !fs.existsSync(path.join(root, "assets/world/maps/" + name + "-anim.png")), name + " keeps no stale animation sheet");
  assert.equal(m.warps.length, warps, name + " warps");
  // Each warp still leads to a room whose own warp leads straight back to it.
  m.warps.forEach((w, k) => {
    const back = WORLD_MAPS[w.map].warps[w.warp];
    assert(back && back.map === name && back.warp === k, name + " warp " + k + " and " + w.map + " pair up");
    assert(open(m, w.x, w.y), name + " warp " + k + " is open");
    if (m.behavior[w.y * m.width + w.x] === 0x69) assert(open(m, w.x, w.y + 1), name + " door " + k + " has ground in front");
  });
  // No two things share a tile.
  const spots = [...m.warps, ...m.people, ...m.signs].map((a) => a.x + "," + a.y);
  assert.equal(new Set(spots).size, spots.length, name + " overlapping anchors");
  // On foot from the first warp: every other warp, and a tile beside every person and sign.
  const people = new Set(m.people.map((p) => p.x + "," + p.y));
  const seen = new Set([m.warps[0].x + "," + m.warps[0].y]), q = [[m.warps[0].x, m.warps[0].y]];
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = q[i][0] + dx, y = q[i][1] + dy, key = x + "," + y;
    if (seen.has(key) || !open(m, x, y) || people.has(key)) continue;
    seen.add(key); q.push([x, y]);
  }
  m.warps.forEach((w, k) => assert(seen.has(w.x + "," + w.y), name + " warp " + k + " (" + w.map + ") can be walked to"));
  for (const a of [...m.people, ...m.signs]) assert([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((a.x + dx) + "," + (a.y + dy))), name + ": " + a.script + " can be walked up to");
  for (const p of m.people) assert(!m.collision[p.y * m.width + p.x], name + ": " + p.script + " stands on open ground");
  assert(q.length > 250, name + " has streets to walk");
  // Nobody else draws a map with this city's new picture.
  for (const other of Object.values(WORLD_MAPS)) assert(other.image !== name, other.name + " still borrows " + name + "'s picture");
  checks += m.warps.length + m.people.length + m.signs.length;
}

// Every stored landing point in the two regions' data that aims at these cities is open ground.
let landings = 0;
const visited = new Set();
(function walk(o) {
  if (!o || typeof o !== "object" || visited.has(o)) return; visited.add(o);
  if (CITIES[o.map] && Number.isInteger(o.x) && Number.isInteger(o.y) && !("warp" in o)) { assert(open(WORLD_MAPS[o.map], o.x, o.y), "landing " + JSON.stringify(o)); landings++; return; }
  for (const k of Object.keys(o)) { if (Array.isArray(o) && o.length > 4000) return; walk(o[k]); }
})({ UNOVA_DATA, KALOS_DATA });
assert(landings >= 15, "found the stored landings");

// Named places kept where the story expects them.
const C = WORLD_MAPS.UnovaCasteliaCity;
assert.deepEqual(UNOVA_DATA.chapter.arrival, { map: "UnovaCasteliaCity", x: 28, y: 49, facing: "up" });
const door = (m, to) => m.warps.find((w) => w.map === to);
assert.equal(door(C, "UnovaRoute4Gate").y, 3, "Route 4 leaves from the north");
assert(door(C, "UnovaCasteliaCity_PokemonCenter_1F").y > 30 && door(C, "UnovaCasteliaCity_PokemonCenter_1F").x > 40, "the Pokémon Center is on the waterfront's east end");
assert.equal(new Set(["UnovaLibertyGarden", "UnovaCasteliaSewers", "UnovaCasteliaFerryCabin", "UnovaRoyalUnovaDock", "UnovaHouseCasteliaCity9"].map((n) => Math.round(door(C, n).x / 10))).size, 5, "five piers, one destination each");
const N = WORLD_MAPS.KalosLumioseNorth, S = WORLD_MAPS.KalosLumioseSouth;
assert.deepEqual([door(S, "KalosLumioseNorth").x, door(N, "KalosLumioseSouth").x], [24, 24], "Vernal Avenue joins the two halves");
assert(door(N, "KalosRoute13").x < 5 && door(N, "KalosRoute16").x > 42 && door(N, "KalosRoute14Entrance").y < 5 && door(S, "KalosRoute5").x < 5 && door(S, "KalosRoute4Entrance").y > 30, "the five route gates sit on the ring");
const tower = door(N, "KalosPrismLobby");
assert(Math.abs(tower.x - 24) <= 1 && tower.y > 20, "Prism Tower stands on Centrico Plaza");

// Alola's Hau'oli and Konikoni were drawn over Santalune's and Laverre's old pictures; they have their own now
// (tools/build-region-layouts.js), and the old pictures are kept.
for (const [alola, classic] of [["AlolaHauoliCity", "KalosSantaluneCityClassic"], ["AlolaKonikoniCity", "KalosLaverreCityClassic"]]) {
  assert(WORLD_MAPS[alola].regionLayout && !WORLD_MAPS[alola].image);
  for (const suffix of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps/" + classic + suffix + ".png")), classic + suffix);
}
// Fishing still works off Cyllage's shore.
assert(WORLD_MAPS.KalosCyllageCity.behavior.includes(0x10) && WORLD_MAPS.KalosCyllageCity.kalosWater === "CyllageCity");

// A save left where a wall now stands is moved to open ground with nothing else lost.
for (const [region, map, x, y] of [[Unova, "UnovaCasteliaCity", 20, 20], [Kalos, "KalosLumioseSouth", 30, 9], [Kalos, "KalosLumioseNorth", 30, 14], [Kalos, "KalosSantaluneCity", 8, 8], [Kalos, "KalosCyllageCity", 16, 8]]) {
  const m = WORLD_MAPS[map];
  assert(m.collision[y * m.width + x], map + " test tile is solid");
  const p = Player.create("RED", 0); p.party = [Party.create("Pikachu", 20)]; p.money = 4321; p.location = { map, x, y, facing: "down" };
  region.recover(p);
  assert.equal(p.location.map, map); assert(open(m, p.location.x, p.location.y), map + " save moved to open ground");
  assert.equal(p.money, 4321); assert.equal(p.party[0].species, "Pikachu");
}
console.log("ok: Castelia, Lumiose and the Kalos cities' street plans (" + checks + " anchors, " + landings + " landings, old saves relocated)");
