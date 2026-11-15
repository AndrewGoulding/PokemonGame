// Helper for writing town plans (tools/plans/*.js).
//   node tools/plan-preview.js anchors GalarHulbury        the map's fixed points as text
//   node tools/plan-preview.js picture out.png Map1 Map2   the built pictures (ground + walk-behind layer) side by side, half size
//   node tools/plan-preview.js list Galar                  the region's towns and cities
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, ".."), [mode, ...args] = process.argv.slice(2);
function world() {
  const c = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console: { log() {}, warn() {}, error() {} } }; c.window = c; vm.createContext(c);
  for (const [, f] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/<script src="([^"]+)"><\/script>/g))
    if (!f.startsWith("ui/") && f !== "game/region-layouts-late.js" && f !== "data/region-layouts.js") vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c, { filename: f });
  return c;
}
if (mode === "list") {
  const c = world(), done = new Set(c.CITY_LAYOUTS || []);
  for (const m of Object.values(c.WORLD_MAPS)) if (m && m.name.startsWith(args[0]) && ["town", "city"].includes(m.type) && !done.has(m.name) && !/^(UnovaHouse|BW1House)/.test(m.name)) console.log(m.name, m.width + "x" + m.height, '"' + (m.title || "") + '"', "warps:" + m.warps.length);
} else if (mode === "anchors") {
  const c = world();
  for (const name of args) {
    const m = c.WORLD_MAPS[name]; if (!m) { console.log("no map " + name); continue; }
    const W = m.width, H = m.height, water = (b) => b === 0x10 || b === 0x11;
    console.log(name + " " + W + "x" + H + '  "' + (m.title || "") + '"');
    console.log("legend: letters = warps (see list), P = person, s = sign, ~ = existing water (fixed), : = old open ground, # = old wall (free to redesign), digits on the rulers are tens/units");
    console.log("    " + Array.from({ length: W }, (_, x) => (x % 10 === 0 ? (x / 10) % 10 : " ")).join("")); console.log("    " + Array.from({ length: W }, (_, x) => x % 10).join(""));
    const letter = (k) => String.fromCharCode(k < 26 ? 65 + k : 97 + k - 26);
    for (let y = 0; y < H; y++) { let s = String(y).padStart(3) + " "; for (let x = 0; x < W; x++) { const i = y * W + x, k = m.warps.findIndex((w) => w.x === x && w.y === y); s += k >= 0 ? letter(k) : m.people.some((p) => p.x === x && p.y === y) ? "P" : (m.signs || []).some((p) => p.x === x && p.y === y) ? "s" : water(m.behavior[i]) ? "~" : m.collision[i] ? "#" : ":"; } console.log(s); }
    m.warps.forEach((w, k) => console.log("  warp " + k + " (" + letter(k) + ") at " + w.x + "," + w.y + " -> " + w.map + " [" + ((c.WORLD_MAPS[w.map] || {}).type || "?") + "] " + (m.behavior[w.y * W + w.x] === 0x69 ? "door" : "step")));
    for (const p of m.people) console.log("  person at " + p.x + "," + p.y + " " + p.script);
  }
} else if (mode === "picture") {
  const { readPng } = require("./lib/png"), { canvas } = require("./lib/orre-art"), [out, ...names] = args, scale = 2;
  const pics = names.map((n) => { const b = readPng(path.join(root, "assets/world/maps", n + ".png")); let t = null; try { t = readPng(path.join(root, "assets/world/maps", n + "-top.png")); } catch (_) { /* none */ } return { b, t }; });
  let x = 0, h = 0; const pos = pics.map((p) => { const at = x; x += Math.ceil(p.b.width / scale) + 4; h = Math.max(h, Math.ceil(p.b.height / scale)); return at; });
  const c = canvas(x, h); c.rect(0, 0, x, h, [255, 0, 255]);
  pics.forEach((p, i) => { for (let yy = 0; yy < p.b.height; yy += scale) for (let xx = 0; xx < p.b.width; xx += scale) { const q = (yy * p.b.width + xx) * 4; let col = [p.b.rgba[q], p.b.rgba[q + 1], p.b.rgba[q + 2]]; if (p.t && p.t.rgba[q + 3]) col = [p.t.rgba[q], p.t.rgba[q + 1], p.t.rgba[q + 2]]; c.p(pos[i] + xx / scale, yy / scale, col); } });
  c.save(out); console.log("wrote " + out);
} else console.log("usage: anchors <Map...> | picture <out.png> <Map...> | list <RegionPrefix>");
