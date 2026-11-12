// Ensure environment effects match actual committed world map IDs, not just
// synthetic fixtures with convenient names.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [, file] of html.matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (file.startsWith("ui/")) continue;
  vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
vm.runInThisContext(fs.readFileSync(path.join(root, "ui/region-ambience.js"), "utf8"), {
  filename: "ui/region-ambience.js"
});
const names = Object.keys(WORLD_MAPS), totals = {};
for (const region of ["orre", "sinnoh", "unova", "kalos"]) {
  const maps = names.filter(name => WORLD_MAPS[name]?.region === region);
  const decorated = maps.filter(name => RegionAmbience.theme(WORLD_MAPS[name]));
  assert(maps.length >= 8, region + " needs loaded source maps");
  assert(decorated.length >= 2, region + " effect patterns don't match real map names");
  totals[region] = { maps: maps.length, withAmbience: decorated.length,
    examples: decorated.slice(0, 8) };
}
console.log("Regional atmosphere coverage: " + JSON.stringify(totals));
