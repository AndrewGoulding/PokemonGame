// All Ultra Alola maps must have connected, region-specific geometry.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.join(__dirname, "..");
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8")
  .matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!file.startsWith("ui/"))
    vm.runInThisContext(fs.readFileSync(path.join(root, file), "utf8"), { filename: file });
}
const maps = Alola.data().maps;
assert.equal(AlolaLayouts.count, Object.keys(maps).length);
let checked = 0;
for (const [name, m] of Object.entries(maps)) {
  assert(m.alolaCustomLayout?.independent, name + " uses foreign collision");
  assert.equal(m.top, false, name + " still draws an unrelated Kalos top sheet");
  for (const field of ["collision", "behavior", "elevation"])
    assert.equal(m[field].length, m.width * m.height, name + " " + field);
  assert(m.elevation.every(z => z === 0), name + " inherited elevation");
  const anchors = [
    ...m.warps, ...m.people, ...(m.signs || []), ...(m.triggers || []),
    ...(m.hidden || []),
    ...Object.values(Player.CENTERS || {}).filter(a => a.map === name),
    ...Object.values(TOWN_MAP?.alola?.fly || {}).filter(a => a.map === name),
    ...(Alola.data().start.map === name ? [Alola.data().start] : [])
  ];
  const seen = new Set(), cx = Math.floor(m.width / 2), cy = Math.floor(m.height / 2);
  const queue = [cy * m.width + cx]; seen.add(queue[0]);
  assert.equal(m.collision[queue[0]], 0, name + " central path blocked");
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % m.width, y = Math.floor(i / m.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, k = yy * m.width + xx;
      if (xx < 0 || yy < 0 || xx >= m.width || yy >= m.height ||
          m.collision[k] || seen.has(k)) continue;
      seen.add(k); queue.push(k);
    }
  }
  for (const a of anchors) {
    assert(Number.isInteger(a.x) && Number.isInteger(a.y) &&
      a.x >= 0 && a.y >= 0 && a.x < m.width && a.y < m.height, name + " event out of bounds");
    const i = a.y * m.width + a.x;
    assert.equal(m.collision[i], 0, name + " blocked event " + a.x + "," + a.y);
    assert(seen.has(i), name + " disconnected event " + a.x + "," + a.y);
    checked++;
  }
}
console.log("Alola layouts: " + Object.keys(maps).length + " maps, " + checked + " anchors");
