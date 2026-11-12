// Chromium snapshots for the source-art regions. Ensures their own original
// PNGs stay visible and the animated details don't introduce runtime errors.
"use strict";
const assert = require("node:assert/strict"), path = require("node:path"), T = require("./lib");
T.loadHeadless();
const picks = [
  ["orre", /PhenacCity$/],
  ["sinnoh", /Route216$|SnowpointCity$/],
  ["unova", /NimbasaCity$/],
  ["kalos", /LumioseSouth$|LumioseCity$/]
];
function select(region, preferred) {
  const candidates = Object.values(WORLD_MAPS).filter(m => m.region === region);
  assert(candidates.length, region + " maps were not loaded");
  return candidates.find(m => preferred.test(m.name)) || candidates.find(m => m.warps?.length) || candidates[0];
}
function safe(m) {
  const clear = (x, y) => x >= 2 && y >= 2 && x < m.width - 2 && y < m.height - 2 &&
    !m.collision[y * m.width + x] &&
    ![...(m.warps || []), ...(m.people || [])].some(a =>
      Math.abs(a.x - x) <= 1 && Math.abs(a.y - y) <= 1);
  let best = null;
  for (let y = 3; y < m.height - 3; y++) for (let x = 3; x < m.width - 3; x++) {
    if (!clear(x, y)) continue;
    const d = Math.abs(x - m.width / 2) + Math.abs(y - m.height / 2);
    if (!best || d < best.d) best = { x, y, d };
  }
  assert(best, m.name + " lacks a safe screenshot location");
  return { map: m.name, x: best.x, y: best.y, facing: "down" };
}
(async () => {
  const places = picks.map(([region, preferred]) => [region, safe(select(region, preferred))]);
  const out = path.join(__dirname, "out", "source-regions");
  const s = await T.start(p => {
    p.repelSteps = 999999;
    p.flags.orre = 2;
    p.flags.orreStory = 44;
    p.flags.orreMail = { got: Object.keys(Orre.MAIL), read: Object.keys(Orre.MAIL) };
  }, places[0][1], { out });
  const missing = new Set();
  s.page.on("response", r => {
    if (r.status() >= 400 && /\/assets\/world\/maps\//.test(r.url()))
      missing.add(new URL(r.url()).pathname);
  });
  try {
    await s.boot();
    for (const [region, target] of places) {
      await s.eval(loc => Overworld.teleport(loc), target);
      await s.wait(450);
      const current = await s.eval(() => Game.player.location.map);
      assert.equal(current, target.map, region + " screenshot loaded wrong map");
      const draw = await s.eval(name => ({
        available: !!window.RegionAmbience,
        effect: window.RegionAmbience?.theme(WORLD_MAPS[name]),
        width: document.getElementById("world").width
      }), target.map);
      assert(draw.available && draw.effect, region + " lacks environmental art");
      assert(draw.width > 0);
      await s.shot(region + "-" + target.map);
      console.log("Source region screenshot: " + region + " / " + target.map + " (" + draw.effect + ")");
    }
    assert.deepEqual(s.errors.filter(e => !/^Failed to load resource:/.test(e)), [], "Unexpected page errors");
    assert.deepEqual([...missing], [], "Map image requests failed");
  } finally { await s.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
