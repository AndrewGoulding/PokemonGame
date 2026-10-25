// Drawing for the realms' maps, this game's own pictures: a canvas to draw
// on, and the things drawn on more than one map (the Time Machine, the realms'
// portals). Used by tools/build-time-machine.js and tools/build-domino-city.js.
"use strict";

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 255];
function canvas(w, h) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  const c = {
    w, h, rgba,
    set(x, y, col) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= w || y >= h) return; rgba.set(typeof col === "string" ? hex(col) : col, (y * w + x) * 4); },
    get(x, y) { const k = (y * w + x) * 4; return [rgba[k], rgba[k + 1], rgba[k + 2], rgba[k + 3]]; },
    rect(x0, y0, rw, rh, col) { for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) c.set(x, y, col); },
    // (An ellipse's inside, centre (cx, cy), radii rx, ry: f(x, y, dx, dy) its colour, or a colour.)
    ellipse(cx, cy, rx, ry, col) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) c.set(x, y, typeof col === "function" ? col(x, y, dx, dy) : col);
      }
    },
    // (A dark outline round whatever's drawn, where it meets nothing.)
    outline(col, x0, y0, x1, y1) {
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rgba[(y * w + x) * 4 + 3] > 0;
      const add = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) add.push([x, y]);
      for (const [x, y] of add) c.set(x, y, col);
    },
    // (Another canvas over this one at (x0, y0), its see-through pixels not.)
    draw(o, x0, y0) { for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const p = o.get(x, y); if (p[3]) c.set(x0 + x, y0 + y, p); } }
  };
  return c;
}
const fromRgba = (w, h, rgba) => { const c = canvas(w, h); c.rgba.set(rgba); return c; };
// (A steady random, the same each build.)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).concat([255]);

// The Time Machine: 3 tiles wide, 3 tall, its door in the middle of its foot.
// A steel capsule on a plinth, a clock on its dome and a beacon on top,
// copper coils either side, and a glowing door of swirling light.
function timeMachine() {
  const c = canvas(48, 48);
  const steelDark = hex("#4c5464"), steelLight = hex("#e4ecf4");
  const steel = (x) => { const t = 1 - Math.min(1, Math.abs((x - 19) / 20)); return mix(steelDark, steelLight, t * t); };
  // The plinth.
  c.rect(1, 40, 46, 3, "#b8c0cc"); c.rect(1, 43, 46, 4, "#6c7484");
  for (let x = 3; x < 46; x += 6) { c.rect(x, 44, 3, 2, "#f8c838"); c.rect(x + 3, 44, 3, 2, "#383838"); }
  // The body, a steel drum.
  for (let y = 12; y < 40; y++) for (let x = 7; x <= 40; x++) c.set(x, y, steel(x));
  for (const y of [18, 30]) for (let x = 7; x <= 40; x++) c.set(x, y, mix(steel(x), hex("#283040"), 0.45));
  // Its dome.
  c.ellipse(24, 13, 17.5, 11, (x) => steel(x));
  // The clock on the dome.
  c.ellipse(24, 10, 6, 6, "#404858"); c.ellipse(24, 10, 5, 5, "#f8f8e8");
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) c.set(24 + dx - 0.5, 10 + dy - 0.5, "#404858");
  for (let k = 0; k <= 3; k++) c.set(23.5, 10 - k - 0.5, "#c03030");   // (the minute hand, at twelve)
  for (let k = 0; k <= 2; k++) c.set(23.5 + k, 9.5, "#303030");       // (the hour hand, at three)
  // The beacon on top.
  c.rect(22, 0, 4, 3, "#f04838"); c.set(22, 0, "#f8b0a0"); c.rect(21, 3, 6, 1, "#586070");
  // The coils, either side.
  for (const x0 of [1, 41]) {
    c.rect(x0, 16, 6, 23, "#a85820");
    for (let y = 16; y < 39; y += 3) c.rect(x0, y, 6, 1, "#f0a848");
    c.rect(x0 + (x0 === 1 ? 5 : 0), 16, 1, 23, "#783810");
  }
  // The door: a frame and the light in it.
  c.rect(15, 19, 18, 21, "#30384a");
  for (let y = 21; y < 40; y++) for (let x = 17; x <= 30; x++) {
    const sw = Math.sin((x - 24) * 0.7 + (y - 21) * 0.45) * 0.5 + 0.5, t = (y - 21) / 19;
    c.set(x, y, mix(mix(hex("#98f8ff"), hex("#2088d0"), t), hex("#f8f8ff"), sw > 0.86 ? 0.6 : 0));
  }
  c.rect(17, 21, 14, 1, "#e8ffff");
  // Lights on its front, either side of the door.
  for (const [x, y, col] of [[10, 22, "#48e048"], [10, 25, "#f8d030"], [10, 28, "#f04838"], [36, 22, "#48e048"], [36, 25, "#48a8f8"], [36, 28, "#f8d030"]]) c.rect(x, y, 2, 2, col);
  c.outline("#282830", 0, 0, 47, 47);
  return c;
}

// A realm's portal: 2 tiles wide, 3 tall. A stone arch, and in it the realm's
// light (or none, dormant).
function portal(kind) {
  const c = canvas(32, 48);
  const stone = rng(kind === "yugioh" ? 7 : 11);
  // The arch.
  c.ellipse(16, 18, 15.5, 17.5, () => mix(hex("#8a86a8"), hex("#5c587a"), stone() * 0.5));
  for (let y = 18; y < 46; y++) for (let x = 1; x < 31; x++) c.set(x, y, mix(hex("#8a86a8"), hex("#5c587a"), stone() * 0.5));
  // (Its stones' joints.)
  for (let y = 22; y < 46; y += 6) { c.rect(1, y, 6, 1, "#48446a"); c.rect(25, y, 6, 1, "#48446a"); }
  // The opening.
  const inner = (x, y, dx, dy) => {
    const r = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
    if (kind === "yugioh") {
      const swirl = Math.sin(a * 3 + r * 9) * 0.5 + 0.5;
      return mix(mix(hex("#f8e070"), hex("#6828a8"), Math.min(1, r * 1.1)), hex("#c050f0"), swirl * 0.45);
    }
    const swirl = Math.sin(a * 2 + r * 7) * 0.5 + 0.5;
    return mix(mix(hex("#504c68"), hex("#201c34"), Math.min(1, r)), hex("#38344e"), swirl * 0.4);
  };
  c.ellipse(16, 19, 11, 13, inner);
  for (let y = 19; y < 46; y++) for (let x = 5; x <= 26; x++) {
    const dx = (x + 0.5 - 16) / 11, dy = (y + 0.5 - 19) / 26;
    if (Math.abs(dx) <= 1) c.set(x, y, inner(x, y, dx, Math.max(0, dy) * 0.9 + 0.1));
  }
  // Its keystone: the Yu-Gi-Oh! realm's, a golden pyramid.
  c.rect(12, 1, 8, 6, "#a8a4c4");
  if (kind === "yugioh") {
    for (let r = 0; r < 6; r++) for (let x = -r; x <= r; x++) c.set(16 + x - 0.5, 1 + r, r === 5 || Math.abs(x) === r ? "#b07808" : "#f8d038");
    c.rect(15, 3, 2, 2, "#283040");   // (its eye)
  }
  // The step at its foot.
  c.rect(2, 44, 28, 4, "#6c6890");
  c.outline("#1c1a2c", 0, 0, 31, 47);
  return c;
}

// Domino City's clock tower: 3 tiles wide, 5 tall. A tower of warm brick on a
// stone base, a big clock near its top and a copper roof, as on the square
// where Battle City began.
function clockTower() {
  const c = canvas(48, 80);
  const r = rng(21);
  // The roof: a copper spire.
  for (let y = 2; y < 20; y++) {
    const half = Math.round((y - 2) * 0.95) + 1;
    for (let x = 24 - half; x < 24 + half; x++) c.set(x, y, mix(hex("#58a890"), hex("#2c6c5c"), (x - (24 - half)) / (2 * half)));
  }
  c.rect(23, 0, 2, 3, "#c8a040");
  c.rect(6, 20, 36, 2, "#2c5c50");
  // The tower.
  for (let y = 22; y < 66; y++) for (let x = 8; x < 40; x++) {
    const brick = (y % 4 === 0) || ((x + (Math.floor(y / 4) % 2) * 4) % 8 === 0);
    c.set(x, y, brick ? hex("#9c6c48") : mix(hex("#e0b888"), hex("#c89868"), (x - 8) / 32 * 0.8 + r() * 0.15));
  }
  c.rect(8, 22, 2, 44, "#f0d0a0");
  c.rect(38, 22, 2, 44, "#a87850");
  // The clock.
  c.ellipse(24, 34, 12, 12, "#b08828"); c.ellipse(24, 34, 10.5, 10.5, "#f8f4e0");
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.set(24 + Math.cos(a) * 8.5 - 0.5, 34 + Math.sin(a) * 8.5 - 0.5, "#403830"); }
  for (let d = 0; d <= 7; d++) c.set(23.5, 34 - d - 0.5, "#282018");                   // (twelve o'clock)
  for (let d = 0; d <= 5; d++) c.set(23.5 + d * 0.87, 33.5 + d * 0.5, "#282018");     // (and twenty past four)
  c.ellipse(24, 34, 1.5, 1.5, "#282018");
  // Its windows.
  for (const y of [50]) for (const x of [14, 30]) { c.rect(x, y, 4, 7, "#384858"); c.rect(x, y, 4, 1, "#f0d0a0"); c.set(x + 1, y + 2, "#8098b0"); }
  // The stone base and its door.
  c.rect(4, 64, 40, 14, "#a8a8b0");
  for (let y = 64; y < 78; y += 4) c.rect(4, y, 40, 1, "#808088");
  for (let y = 64; y < 78; y++) for (let x = 4 + ((Math.floor((y - 64) / 4) % 2) * 5); x < 44; x += 10) c.set(x, y, "#808088");
  c.rect(4, 64, 40, 1, "#d0d0d8");
  c.ellipse(24, 69, 5, 5, "#403838"); c.rect(19, 69, 10, 9, "#403838"); c.rect(20, 70, 8, 8, "#604840");
  c.rect(2, 77, 44, 3, "#888890");
  c.outline("#282428", 0, 0, 47, 79);
  return c;
}

module.exports = { hex, canvas, fromRgba, rng, mix, timeMachine, portal, clockTower };
