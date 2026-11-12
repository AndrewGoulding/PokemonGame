// Visual-only source region embellishments: map data must remain untouched.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const game = fs.readFileSync(path.join(root, "ui/game.js"), "utf8");
assert(html.includes('src="ui/region-ambience.js"'));
assert(game.includes("RegionAmbience.render(g,map,x,y)"));
global.window = global;
const cases = [
  ["PhenacCity", "orre", "spring"],
  ["PyriteTown", "orre", "embers"],
  ["PlatinumFloaromaTown", "sinnoh", "pollen"],
  ["PlatinumSnowpointCity", "sinnoh", "frost"],
  ["UnovaNimbasaCity", "unova", "neon"],
  ["UnovaHumilauCity", "unova", "glitter"],
  ["KalosLumioseCity", "kalos", "lamps"],
  ["KalosReflectionCave", "kalos", "crystal"],
  ["KalosRoute4", "kalos", "pollen"],
  ["GalarPostwick", "galar", null],
  ["AlolaIkiTown", "alola", null],
  ["PaldeaMesagoza", "paldea", null]
];
const maps = {};
for (const [name, region] of cases) {
  const w = 44, h = 34;
  maps[name] = { name, region, width: w, height: h,
    collision: Array.from({ length: w * h }, (_, i) => (i % 3 === 0) ? 1 : 0),
    behavior: Array.from({ length: w * h }, (_, i) => (i % 7 === 0) ? 0x10 : 0),
    warps: [{ x: 3, y: 3 }], people: [{ x: 5, y: 4 }] };
}
global.WORLD_MAPS = maps;
vm.runInThisContext(fs.readFileSync(path.join(root, "ui/region-ambience.js"), "utf8"), {
  filename: "ui/region-ambience.js"
});
for (const [name, region, expected] of cases) {
  assert.equal(RegionAmbience.theme(maps[name]), expected, name + " effect classification");
  const before = JSON.stringify(maps[name]);
  let draws = 0;
  const g = {
    canvas: { width: 240, height: 192 },
    save() { this._saved = this.globalAlpha; },
    restore() { this.globalAlpha = this._saved; },
    fillRect(x, y, w, h) {
      assert(Number.isFinite(x) && Number.isFinite(y));
      assert(w > 0 && h > 0);
      draws++;
    },
    globalAlpha: 1, fillStyle: ""
  };
  let count = RegionAmbience.render(g, name, -192, -160, 0);
  assert.equal(count > 0, Boolean(expected), name + " activity");
  assert.equal(draws > 0, Boolean(expected), name + " draw calls");
  assert.equal(g.globalAlpha, 1, name + " paint state leaked");
  assert.equal(JSON.stringify(maps[name]), before, name + " mutated data");
  assert.equal(RegionAmbience.render(g, name, 8000, 8000, 0), 0,
    name + " offscreen drawing");
}
console.log("Source region ambience: classification, safety and viewport tests passed");
