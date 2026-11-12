// Regression checks for Galar's independent overworld geometry.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), path = require("node:path");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8")
  .matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/"))
    vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
const D = GALAR_DATA;
assert(window.GalarLayouts && D.mapNames.length > 0);
let anchorsChecked = 0;
for (const name of D.mapNames) {
  const m = D.maps[name], size = m.width * m.height;
  assert(m.galarCustomLayout?.independent && m.galarCustomLayout?.clustered, name);
  for (const prop of ["collision", "behavior", "elevation"])
    assert.equal(m[prop].length, size, name + " " + prop);
  assert(m.elevation.every(v => v === 0), name + " has foreign elevation barriers");
  const events = [
    ...m.warps, ...m.people,
    ...Object.values(TOWN_MAP?.galar?.fly || {}).filter(a => a.map === name),
    ...Object.values(Player?.CENTERS || {}).filter(a => a.map === name),
    ...(D.start?.map === name ? [D.start] : [])
  ];
  const seen = new Set(), center = Math.floor(m.height / 2) * m.width + Math.floor(m.width / 2);
  const queue = [center]; seen.add(center);
  assert.equal(m.collision[center], 0, name + " center blocked");
  for (let k = 0; k < queue.length; k++) {
    const index = queue[k], x = index % m.width, y = (index / m.width) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, ni = ny * m.width + nx;
      if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height ||
        m.collision[ni] || seen.has(ni)) continue;
      seen.add(ni); queue.push(ni);
    }
  }
  for (const a of events) {
    assert(a.x >= 0 && a.y >= 0 && a.x < m.width && a.y < m.height,
      name + " out-of-range anchor");
    const i = a.y * m.width + a.x;
    assert.equal(m.collision[i], 0, name + " blocked event " + a.x + "," + a.y);
    assert(seen.has(i), name + " unreachable event " + a.x + "," + a.y);
    anchorsChecked++;
  }
}
console.log("Galar layouts: " + D.mapNames.length + " maps, " + anchorsChecked + " preserved anchors");
