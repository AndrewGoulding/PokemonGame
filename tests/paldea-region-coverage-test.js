// All Paldea campaign and DLC maps must have their own navigable geometry.
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
const D = Paldea.data();
assert.equal(PaldeaLayouts.count, Object.keys(D.maps).length);
let checked = 0, wilderness = 0;
for (const [name, m] of Object.entries(D.maps)) {
  assert(m.paldeaLayout?.independent, name + " still borrows Kalos geometry");
  assert.equal(m.top, false, name + " has a Kalos top-sheet");
  for (const field of ["collision", "behavior", "elevation"])
    assert.equal(m[field].length, m.width * m.height, name + " " + field);
  assert(m.elevation.every(z => z === 0), name + " foreign elevation barrier");
  if (/^(coast|snow|crystal|mountain|forest|savanna|route)$/.test(m.paldeaLayout.style)) wilderness++;
  const anchors = [...m.warps, ...m.people, ...(m.signs || []),
    ...(m.triggers || []), ...(m.hidden || []),
    ...Object.values(Player.CENTERS || {}).filter(a => a.map === name),
    ...Object.values(TOWN_MAP?.paldea?.fly || {}).filter(a => a.map === name),
    ...(D.start?.map === name ? [D.start] : [])];
  const start = Math.floor(m.height / 2) * m.width + Math.floor(m.width / 2);
  const seen = new Set([start]), queue = [start];
  assert(!m.collision[start], name + " plaza is blocked");
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % m.width, y = Math.floor(i / m.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, at = yy * m.width + xx;
      if (xx < 0 || yy < 0 || xx >= m.width || yy >= m.height ||
        m.collision[at] || seen.has(at)) continue;
      seen.add(at); queue.push(at);
    }
  }
  for (const a of anchors) {
    assert(Number.isInteger(a.x) && Number.isInteger(a.y) && a.x >= 0 &&
      a.y >= 0 && a.x < m.width && a.y < m.height, name + " bad event coordinate");
    const i = a.y * m.width + a.x;
    assert(!m.collision[i] && seen.has(i),
      name + " inaccessible event " + a.x + "," + a.y);
    checked++;
  }
}
assert(wilderness > 0, "No independent Paldea wilderness maps");
console.log("Paldea coverage: " + Object.keys(D.maps).length +
  " maps, " + wilderness + " wilderness maps, " + checked + " scripted anchors");
