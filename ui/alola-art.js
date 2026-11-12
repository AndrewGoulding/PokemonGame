// Alola-specific pixel scenery drawn at the exact 16px collision grid.
// It replaces the Kalos placeholder picture without changing any story data.
(function () {
"use strict";
const cache = new Map(), T = 16;
const themes = {
  village: ["#d8ba89", "#ebd4a4", "#a26d53", "#785d4e", "#7caa78"],
  tropical: ["#8bbd78", "#a6d58a", "#4d805c", "#345f50", "#e7d5a0"],
  beach: ["#e6d1a0", "#f4e1b6", "#65aebe", "#347b9e", "#8cbb8b"],
  cave: ["#777b75", "#a1a294", "#5b696a", "#404f55", "#c6b999"],
  interior: ["#c8b6a1", "#e1d0af", "#937e73", "#6a5e58", "#90b5a3"],
  cemetery: ["#8eaa9c", "#b6c1a7", "#6f8584", "#506669", "#c2b5ae"]
};
function style(name) {
  if (/Beach|Coast|Sea|HauoliBeach/.test(name)) return "beach";
  if (/Cavern|Cave|Verdant|Grotto/.test(name)) return "cave";
  if (/Cemetery|Memorial/.test(name)) return "cemetery";
  if (/Home|Center|School|House|Shop|Gym/.test(name)) return "interior";
  if (/City|Town|Village|Iki|HauoliOutskirts/.test(name)) return "village";
  return "tropical";
}
function hash(x, y, seed) {
  let n = (Math.imul(x + 11, 374761393) +
    Math.imul(y + 17, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
function make(name) {
  const m = window.WORLD_MAPS[name], c = document.createElement("canvas");
  c.width = m.width * T; c.height = m.height * T;
  const g = c.getContext("2d", { alpha: false }), kind = style(name), p = themes[kind];
  const seed = [...name].reduce((n, ch) => (Math.imul(n, 31) + ch.charCodeAt(0)) >>> 0, 47);
  for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const i = y * m.width + x, r = hash(x, y, seed), px = x * T, py = y * T;
    const solid = Boolean(m.collision[i]), grass = m.behavior[i] === 2;
    g.fillStyle = solid ? p[2] : grass ? p[4] : (r % 7 ? p[0] : p[1]);
    g.fillRect(px, py, T, T);
    if (solid && (kind === "tropical" || kind === "village" || kind === "beach")) {
      // Dense palm/roof silhouettes only where walking is impossible.
      g.fillStyle = p[3]; g.fillRect(px + 7, py + 8, 3, 8);
      g.fillStyle = p[4]; g.fillRect(px + 2, py + 3, 12, 6);
      g.fillRect(px + 5, py + 1, 6, 11);
      g.fillStyle = p[1]; g.fillRect(px + 5, py + 4, 3, 2);
    } else if (solid) {
      g.fillStyle = p[3]; g.fillRect(px + 2, py + 9, 12, 7);
      g.fillStyle = p[1]; g.fillRect(px + 4, py + 4, 8, 6);
      g.fillStyle = p[2]; g.fillRect(px + 7, py + 6, 2, 4);
    } else if (grass) {
      g.fillStyle = p[2]; g.fillRect(px + 4, py + 9, 2, 4);
      g.fillRect(px + 9, py + 7, 2, 6);
      g.fillStyle = p[1]; g.fillRect(px + 7, py + 10, 2, 2);
    } else if (kind === "interior" || kind === "village") {
      g.fillStyle = p[1]; g.fillRect(px + 1, py + 2, 14, 12);
      g.fillStyle = p[2]; g.fillRect(px, py + 7, T, 1);
      if (r % 9 === 0) { g.fillStyle = p[4]; g.fillRect(px + 3, py + 3, 3, 2); }
    } else if (kind === "beach") {
      if (r % 4 === 0) { g.fillStyle = "#ffffff"; g.fillRect(px + 3, py + 7, 5, 2); }
      if (r % 7 === 0) { g.fillStyle = p[3]; g.fillRect(px + 10, py + 4, 3, 2); }
    } else {
      if (r % 4 === 0) { g.fillStyle = p[1]; g.fillRect(px + 4, py + 11, 5, 2); }
      if (r % 8 === 0) { g.fillStyle = p[4]; g.fillRect(px + 10, py + 4, 3, 3); }
    }
  }
  // Simple but unmistakable entrances; keep marker art inside the warp tile.
  for (const warp of m.warps || []) {
    const x = warp.x * T, y = warp.y * T;
    g.fillStyle = "#4a5556"; g.fillRect(x + 4, y + 5, 8, 10);
    g.fillStyle = "#f1dcad"; g.fillRect(x + 5, y + 6, 6, 8);
    g.fillStyle = "#b07b55"; g.fillRect(x + 7, y + 9, 3, 5);
  }
  return c;
}
function draw(g, name, x, y) {
  if (window.WORLD_MAPS?.[name]?.region !== "alola") return;
  let c = cache.get(name);
  if (!c) { c = make(name); cache.set(name, c); }
  g.drawImage(c, x, y);
}
window.AlolaArt = { draw, style, themes, clear: () => cache.clear() };
})();
