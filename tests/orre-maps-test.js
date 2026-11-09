// Topology and save compatibility of the reference-based Orre projections.
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g)) if (!file.startsWith("ui/")) vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
const arrivals = { OutskirtStand: [18, 22], PhenacCity: [19, 34], PyriteTown: [17, 28], AgateVillage: [17, 28], MtBattle: [16, 30], TheUnder: [16, 25], RelicForest: [19, 9], RealgamTower_Exterior: [19, 34], PhenacCity_PreGym: [7, 10] };
let checks = 0;
for (const [name, start] of Object.entries(arrivals)) {
  const m = WORLD_MAPS[name];
  assert(m.colosseumLayout || name === "PhenacCity_PreGym");
  for (const key of ["collision", "elevation", "behavior", "encounter"]) assert.equal(m[key].length, m.width * m.height);
  for (const suffix of ["", "-top", "-border"]) assert(fs.existsSync(path.join(root, "assets/world/maps/" + name + suffix + ".png")));
  assert.equal(m.collision[start[1] * m.width + start[0]], 0, name + " arrival");
  for (const p of m.people) assert.equal(m.collision[p.y * m.width + p.x], 0, name + ": " + p.localId + " is on solid terrain");
  // Check both story encounter and completed-story crowds; hidden actors must
  // not be treated as real obstacles, and visible Trainers must be reachable.
  for (const story of [19, 29, 32, 35, 44]) {
    const flags = { orre: 2, orreStory: story }, people = m.people.filter((p) => Orre.visible(p, flags) !== false);
    const at = new Set(people.map((p) => p.x + "," + p.y)), seen = new Set([start.join(",")]), q = [start];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const dir of ["up", "down", "left", "right"]) {
        const step = World.step({ map: name, x, y }, dir), key = step.x + "," + step.y;
        if (step.ok && step.map === name && !seen.has(key) && !at.has(key)) { seen.add(key); q.push([step.x, step.y]); }
      }
    }
    for (const p of people) assert([[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen.has((p.x + dx) + "," + (p.y + dy))), name + ": cannot approach " + p.localId + " at story " + story);
    for (const w of m.warps) {
      const target = World.warpTarget(w);
      assert(target && WORLD_MAPS[target.map], name + " broken destination");
      assert(seen.has(w.x + "," + w.y) || [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen.has((w.x + dx) + "," + (w.y + dy))), name + " unreachable door to " + w.map);
    }
    checks++;
  }
  // A save stranded by the changed footprint is rescued without losing state.
  const solid = m.collision.findIndex(Boolean), p = { location: { map: name, x: solid % m.width, y: Math.floor(solid / m.width), facing: "up" }, party: [{ species: "Umbreon" }], flags: { orreStory: 29 } };
  if (m.colosseumLayout) {
    assert(Orre.correctLocation(p));
    assert.equal(m.collision[p.location.y * m.width + p.location.x], 0);
    assert.equal(p.flags.orreStory, 29); assert.equal(p.party[0].species, "Umbreon");
    assert(!Orre.correctLocation(p), "repair must be idempotent");
  }
}
const F = WORLD_MAPS.RelicForest;
for (const suffix of ["SKRUB", "AGATE_PEON", "SHRINE_EAGUN"]) {
  assert(F.people.some((p) => p.localId === "LOCALID_ORRE_" + suffix));
  assert(!WORLD_MAPS.AgateVillage.people.some((p) => p.localId === "LOCALID_ORRE_" + suffix));
}
const pre = WORLD_MAPS.PhenacCity.warps.find((w) => w.map === "PhenacCity_PreGym");
assert.equal(World.warpTarget(WORLD_MAPS.PhenacCity_PreGym.warps[0]).map, "PhenacCity");
assert.equal(World.warpTarget(pre).map, "PhenacCity_PreGym");
const realgam = Orre.PLACES.find((p) => p.map === "RealgamTower_1F");
assert.equal(realgam.arrive.map, "RealgamTower_Exterior");
const lobby = WORLD_MAPS.RealgamTower_1F;
assert.equal(World.step({ map: lobby.name, x: 9, y: 11 }, "down").warp.map, realgam.arrive.map);
assert.equal(World.warpTarget(WORLD_MAPS.RealgamTower_Exterior.warps[0]).map, lobby.name);
assert.equal(WORLD_MAPS.RealgamTower_Exterior.orrePlace, realgam.map);
assert.equal(ORRE_MAP_REFERENCES.length, 7);
console.log("ok: Orre reference-map topology, door access and NPC approach across " + checks + " story/map combinations; legacy saves and Realgam/Relic migration");

// Revisiting completed Orre locations must not replay their entrance scenes.
vm.runInThisContext(fs.readFileSync(path.join(root, "ui/story-events.js"), "utf8"), { filename: "ui/story-events.js" });
const env = { player: { flags: { orreStory: 44, orre: 2 } }, deltaDue: () => false };
const events = StoryEvents.create(env);
for (const name of ["AgateVillage_EaguansHouse", "TheUnder_Studio", "RealgamTower_1F"])
  assert.equal(events.special("enter:" + name), false, "completed entrance scene " + name);
env.player.flags.orreStory = 28;
assert.equal(events.special("enter:AgateVillage_EaguansHouse"), true);
env.player.flags.orreStory = 35;
assert.equal(events.special("enter:TheUnder_Studio"), true);
env.player.flags.orreStory = 40;
assert.equal(events.special("enter:RealgamTower_1F"), true);
console.log("ok: Orre entrance scenes run at their story stage and stay completed on revisits");
