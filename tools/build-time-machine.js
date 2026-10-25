// The Time Machine and the Realm Hub, this game's own: the way out of the
// Pokémon realm to the other realms to come (Yu-Gi-Oh!'s first).
//
// A gap in the trees on Pallet Town's west edge (rows 12 and 13) opens onto a
// small clearing, the Time Machine's: FireRed's trees (tools/lib/fr-painter.js)
// on Pallet's own ground (its General and PalletTown tilesets), the machine
// drawn here. Step into it and it takes you to the Realm Hub, a stone platform
// floating in the void between the realms, drawn here too: the Time Machine
// back to the Pokémon realm at its south end, and the portals to the other
// realms along its north (the Yu-Gi-Oh! realm's, and two still dormant).
// ui/game.js runs them (timeMachine, realmPortal).
//
//   node tools/build-time-machine.js
//   (after tools/build-maps.js: it redraws PalletTown-top.png's west trees)
//
// Writes:
//   assets/world/maps/PalletTown-patch-timegap.png   the gap (always on: ui/game.js mapPatches)
//   assets/world/maps/PalletTown-top.png             the gap's trees' top layer
//   assets/world/maps/PalletTown_TimeMachine.png, -top, -border
//   assets/world/maps/RealmHub.png, -border
//   data/emerald-maps.js (its end, between the markers): both maps, Pallet's
//       gap and its join to the clearing
"use strict";

const fs = require("fs");
const path = require("path");
const { readPng, writePng } = require("./lib/png");
const T = require("./lib/fr-tiles");
const Painter = require("./lib/fr-painter");

const root = path.join(__dirname, "..");
const MAPS = path.join(root, "assets/world/maps");
const TILE = 16;
const primary = T.loadTileset("gTileset_General"), secondary = T.loadTileset("gTileset_PalletTown");

// ---------- FireRed's trees on Pallet's ground ----------
// Pallet Town's ground (its own tileset's), plain and beside a tree to its west.
const GROUND = 662, GROUND_BY_TREE = 686;
const GRASS = new Set([4, 8, 9, 16, 17]);   // (and its flowers, 4: none here)
// A layout of "tree" and "ground" as Pallet would draw it: the painter's trees
// (it draws Pallet's exactly, parity [0, 0]), and where it would put grass,
// Pallet's ground; a tree's tile with grass round it gets Pallet's ground
// round it instead (each pixel the grass would have).
function paintPallet(classes, w, h) {
  const blocks = Painter.paint(classes.map((c) => (c === "tree" ? "tree" : "grass")), w, h, "outdoor", [0, 0]);
  const lawn = Painter.paint(classes.map(() => "grass"), w, h, "outdoor", [0, 0]);
  const ids = blocks.map((b, i) => {
    if (!GRASS.has(b)) return b;
    const x = i % w;
    return x > 0 && classes[i - 1] === "tree" ? GROUND_BY_TREE : GROUND;
  });
  const pic = T.renderBlocks(ids, w, h, primary, secondary, false);
  const grass = T.renderBlocks(lawn, w, h, primary, secondary, false).below;
  const ground = T.renderBlocks(ids.map(() => GROUND), w, h, primary, secondary, false).below;
  const W = w * TILE;
  for (let i = 0; i < ids.length; i++) {
    if (GRASS.has(blocks[i])) continue;
    const x0 = (i % w) * TILE, y0 = Math.floor(i / w) * TILE;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const k = ((y0 + y) * W + x0 + x) * 4;
      if (pic.below[k] === grass[k] && pic.below[k + 1] === grass[k + 1] && pic.below[k + 2] === grass[k + 2]) pic.below.set(ground.subarray(k, k + 4), k);
    }
  }
  return pic;
}

// ---------- Drawing ----------
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

// ---------- Pallet Town's gap ----------
// Its west trees at rows 12 and 13 cut away, painted as Pallet would be: the
// tree above ending in its trunk, the one below starting with its tip.
const GAP = { x: 0, y: 12, w: 2, h: 2 }, PATCH = { x: 0, y: 11, w: 3, h: 4 };
{
  const pallet = window_maps_world().PalletTown;
  const W = pallet.width, H = pallet.height;
  const classes = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) classes.push(pallet.collision[y * W + x] && (x < 2 || x >= W - 2) ? "tree" : "ground");
  for (let y = GAP.y; y < GAP.y + GAP.h; y++) for (let x = GAP.x; x < GAP.x + GAP.w; x++) classes[y * W + x] = "ground";
  // (Only Pallet's west edge matters here: the rest stands in as ground.)
  const w = 6, cls = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) cls.push(x < 2 ? classes[y * W + x] : "ground");
  const pic = paintPallet(cls, w, H);
  const pw = PATCH.w * TILE, ph = PATCH.h * TILE, img = new Uint8ClampedArray(pw * ph * 4);
  for (let y = 0; y < ph; y++) img.set(pic.below.subarray(((PATCH.y * TILE + y) * w * TILE + PATCH.x * TILE) * 4, ((PATCH.y * TILE + y) * w * TILE + (PATCH.x + PATCH.w) * TILE) * 4), y * pw * 4);
  writePng(path.join(MAPS, "PalletTown-patch-timegap.png"), pw, ph, img);
  // (The top layer, whatever tools/build-maps.js drew there: the new trees'.)
  const topFile = path.join(MAPS, "PalletTown-top.png"), top = readPng(topFile);
  for (let y = PATCH.y * TILE; y < (PATCH.y + PATCH.h) * TILE; y++) for (let x = PATCH.x * TILE; x < (PATCH.x + PATCH.w) * TILE; x++) {
    const k = (y * top.width + x) * 4, j = (y * w * TILE + x) * 4;
    top.rgba.set(pic.above.subarray(j, j + 4), k);
  }
  writePng(topFile, top.width, top.height, top.rgba);
}
function window_maps_world() {
  const src = fs.readFileSync(path.join(root, "data/world-maps.js"), "utf8");
  const sandbox = { window: {} };
  require("vm").runInNewContext(src, sandbox);
  return sandbox.window.WORLD_MAPS;
}

// ---------- The Time Machine's clearing ----------
// West of Pallet, as tall as it, joined at its gap: a walk west from the gap,
// then south into a clearing, the Time Machine in its west end.
const LANE = "PalletTown_TimeMachine", LW = 14, LH = 20;
const MACHINE = { x: 2, y: 14 };                         // (its top left tile; its door's at x + 1, y + 2)
const LANE_DOOR = { x: MACHINE.x + 1, y: MACHINE.y + 2 };
const LANE_SCIENTIST = { x: 7, y: 16 };
const LANE_SIGN = { x: 8, y: 14 };
const lane = (() => {
  const classes = new Array(LW * LH).fill("tree");
  const open = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) classes[y * LW + x] = "ground"; };
  open(6, 12, LW - 1, 13);    // (the walk from Pallet's gap)
  open(2, 14, 9, 17);          // (the clearing)
  const pic = paintPallet(classes, LW, LH);
  const below = fromRgba(LW * TILE, LH * TILE, pic.below);
  below.draw(timeMachine(), MACHINE.x * TILE, MACHINE.y * TILE);
  // The sign: Pallet's own (its signs' metatile), on the clearing's ground.
  const signPic = T.renderBlocks([pallet_sign_block()], 1, 1, primary, secondary, true).below;
  below.draw(fromRgba(16, 16, signPic), LANE_SIGN.x * TILE, LANE_SIGN.y * TILE);
  writePng(path.join(MAPS, LANE + ".png"), LW * TILE, LH * TILE, below.rgba);
  writePng(path.join(MAPS, LANE + "-top.png"), LW * TILE, LH * TILE, pic.above);
  fs.copyFileSync(path.join(MAPS, "PalletTown-border.png"), path.join(MAPS, LANE + "-border.png"));
  const collision = classes.map((c) => (c === "tree" ? 1 : 0));
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) collision[(MACHINE.y + y) * LW + MACHINE.x + x] = 1;
  collision[LANE_SIGN.y * LW + LANE_SIGN.x] = 1;
  return {
    name: LANE, title: "Time Machine", width: LW, height: LH, type: "route", music: "mus_pallet",
    townMapSection: "PALLET_TOWN",   // (on Kanto's Town Map in Pallet Town)
    cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior: collision.map(() => 0), encounter: collision.map(() => 0),
    connections: [{ map: "PalletTown", mapConst: "MAP_PALLET_TOWN", direction: "right", offset: 0 }],
    warps: [],
    signs: [0, 1, 2].map((k) => ({ x: MACHINE.x + k, y: LANE_DOOR.y, script: "TimeMachine_EventScript_Machine", text: null }))
      .concat([{ x: LANE_SIGN.x, y: LANE_SIGN.y, script: "TimeMachine_EventScript_Sign", text: null }]),
    triggers: [], hidden: [],
    people: [{ id: 0, x: LANE_SCIENTIST.x, y: LANE_SCIENTIST.y, movement: "face_left", rangeX: 0, rangeY: 0, script: "TimeMachine_EventScript_Scientist",
      flag: null, text: null, sprite: "scientist", width: 16, height: 32, frames: 10, localId: "LOCALID_TIME_MACHINE_SCIENTIST" }],
    wild: null
  };
})();
// (Pallet's signs' metatile: the one under its sign beside Oak's Lab.)
function pallet_sign_block() {
  const pal = readPng(path.join(MAPS, "PalletTown.png"));
  const nSec = secondary.meta.length / 16, ids = [];
  for (let i = 0; i < 640; i++) ids.push(i);
  for (let i = 0; i < nSec; i++) ids.push(640 + i);
  const all = T.renderBlocks(ids, ids.length, 1, primary, secondary, true).below, Wt = ids.length * TILE;
  const tx = 16, ty = 16;   // (PalletTown's lab sign)
  for (let k = 0; k < ids.length; k++) {
    let same = true;
    for (let y = 0; y < TILE && same; y++) for (let x = 0; x < TILE; x++) {
      const i = (y * Wt + k * TILE + x) * 4, j = ((ty * TILE + y) * pal.width + tx * TILE + x) * 4;
      if (all[i] !== pal.rgba[j] || all[i + 1] !== pal.rgba[j + 1] || all[i + 2] !== pal.rgba[j + 2]) { same = false; break; }
    }
    if (same) return ids[k];
  }
  throw new Error("No metatile for Pallet's sign");
}

// ---------- The Realm Hub ----------
// A stone platform in the void between the realms: the Time Machine at its
// south end (where you arrive), the realms' portals along its north.
const HUB = "RealmHub", HW = 22, HH = 18;
const HUB_MACHINE = { x: 10, y: 12 };
const HUB_ARRIVE = { x: HUB_MACHINE.x + 1, y: HUB_MACHINE.y + 3 };
const PORTALS = [{ x: 4, y: 2, kind: "dormant", id: "west" }, { x: 10, y: 2, kind: "yugioh", id: "yugioh" }, { x: 16, y: 2, kind: "dormant", id: "east" }];
const EMBLEM = { x: 11, y: 8.5 };
const hub = (() => {
  // The platform: a rounded slab, and a step out to each portal.
  const floor = new Array(HW * HH).fill(false);
  const at = (x, y) => x >= 0 && y >= 0 && x < HW && y < HH && floor[y * HW + x];
  for (let y = 4; y <= 15; y++) for (let x = 2; x <= 19; x++) {
    const cx = Math.min(x - 2, 19 - x), cy = Math.min(y - 4, 15 - y);
    if (!(cx + cy < 2)) floor[y * HW + x] = true;
  }
  for (const p of PORTALS) for (let y = p.y; y < 4; y++) for (let x = p.x - 1; x <= p.x + 2; x++) floor[y * HW + x] = true;
  const c = canvas(HW * TILE, HH * TILE);
  const voidPic = (cv, w, h, seed) => {
    const r = rng(seed);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = Math.sin(x * 0.045 + Math.sin(y * 0.06) * 2) * Math.cos(y * 0.05 - x * 0.02);
      cv.set(x, y, mix(hex("#0c0c24"), hex("#2c1848"), Math.max(0, n) * 0.8));
    }
    for (let k = 0; k < w * h / 70; k++) {
      const x = Math.floor(r() * w), y = Math.floor(r() * h), b = r();
      cv.set(x, y, b > 0.85 ? "#ffffff" : b > 0.5 ? "#a8c0f8" : "#585890");
      if (b > 0.97) { cv.set(x + 1, y, "#6878b8"); cv.set(x - 1, y, "#6878b8"); cv.set(x, y + 1, "#6878b8"); cv.set(x, y - 1, "#6878b8"); }
    }
  };
  voidPic(c, c.w, c.h, 3);
  // The stone: a slab a tile, bevelled; and under the platform's south edge,
  // its side, crumbling away into the void.
  const r = rng(5);
  for (let ty = 0; ty < HH; ty++) for (let tx = 0; tx < HW; tx++) {
    const x0 = tx * TILE, y0 = ty * TILE;
    if (at(tx, ty)) {
      const shade = r() * 0.25;
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        let col = mix(hex("#6a6890"), hex("#56547a"), shade + (r() < 0.08 ? 0.3 : 0));
        if (y === 0 || x === 0) col = hex("#8a88b0");
        if (y === TILE - 1 || x === TILE - 1) col = hex("#3e3c5c");
        c.set(x0 + x, y0 + y, col);
      }
    } else if (at(tx, ty - 1)) {
      for (let y = 0; y < 10; y++) for (let x = 0; x < TILE; x++) {
        const edge = 6 + Math.floor(Math.sin(tx * 5.1 + x * 0.9) * 2 + r() * 2);
        if (y < edge) c.set(x0 + x, y0 + y, mix(hex("#46446a"), hex("#26243e"), y / 10));
      }
    }
  }
  // The emblem in the middle: a clock's face of light, twelve marks round it.
  const ex = EMBLEM.x * TILE, ey = EMBLEM.y * TILE;
  for (let y = -60; y <= 60; y++) for (let x = -60; x <= 60; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (Math.abs(d - 44) < 1.2 || Math.abs(d - 36) < 0.8) c.set(ex + x, ey + y, Math.abs(d - 44) < 1.2 ? "#68e0f8" : "#3898c8");
  }
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6;
    for (let d = 37; d <= 43; d++) c.set(ex + Math.cos(a) * d, ey + Math.sin(a) * d, k % 3 === 0 ? "#f8f8ff" : "#68e0f8");
  }
  for (let d = 0; d <= 26; d++) c.set(ex, ey - d, "#68e0f8");                       // (its hands)
  for (let d = 0; d <= 18; d++) c.set(ex + d * 0.7071, ey + d * 0.7071, "#68e0f8");
  c.ellipse(ex, ey, 3, 3, "#f8f8ff");
  for (const p of PORTALS) c.draw(portal(p.kind), p.x * TILE, p.y * TILE);
  c.draw(timeMachine(), HUB_MACHINE.x * TILE, HUB_MACHINE.y * TILE);
  writePng(path.join(MAPS, HUB + ".png"), c.w, c.h, c.rgba);
  const border = canvas(32, 32);
  voidPic(border, 32, 32, 9);
  writePng(path.join(MAPS, HUB + "-border.png"), 32, 32, border.rgba);
  const collision = floor.map((f) => (f ? 0 : 1));
  for (const p of PORTALS) for (let y = 0; y < 3; y++) for (let x = 0; x < 2; x++) collision[(p.y + y) * HW + p.x + x] = 1;
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) collision[(HUB_MACHINE.y + y) * HW + HUB_MACHINE.x + x] = 1;
  return {
    name: HUB, title: "Realm Hub", width: HW, height: HH, type: "hub", realm: "hub", music: "dp_spear_pillar",
    townMapSection: "PALLET_TOWN",   // (the Town Map shows where its Time Machine is)
    cycling: false, showName: true, top: false, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior: collision.map(() => 0), encounter: collision.map(() => 0),
    connections: [], warps: [],
    signs: [0, 1, 2].map((k) => ({ x: HUB_MACHINE.x + k, y: HUB_MACHINE.y + 2, script: "RealmHub_EventScript_Machine", text: null }))
      .concat(PORTALS.flatMap((p) => [0, 1].map((k) => ({ x: p.x + k, y: p.y + 2, script: "RealmHub_EventScript_Portal_" + p.id, text: null })))),
    triggers: [], hidden: [], people: [], wild: null
  };
})();

// ---------- The maps' data ----------
const open = [];
for (let y = GAP.y; y < GAP.y + GAP.h; y++) for (let x = GAP.x; x < GAP.x + GAP.w; x++) open.push([x, y, 0, 0]);
const START = "// The Time Machine and the Realm Hub (tools/build-time-machine.js", END = "// (End of the Time Machine and the Realm Hub.)\n";
const js = START + "): Pallet Town's west gap, the Time Machine's clearing, and the Realm Hub.\n" +
  "window.WORLD_MAPS[" + JSON.stringify(LANE) + "] = " + JSON.stringify(lane) + ";\n" +
  "window.WORLD_MAPS[" + JSON.stringify(HUB) + "] = " + JSON.stringify(hub) + ";\n" +
  "window.TIME_MACHINE = " + JSON.stringify({ lane: { map: LANE, x: LANE_DOOR.x, y: LANE_DOOR.y + 1, facing: "down" }, hub: { map: HUB, x: HUB_ARRIVE.x, y: HUB_ARRIVE.y, facing: "down" } }) + ";\n" +
  "(function () {\n" +
  "  const town = window.WORLD_MAPS.PalletTown;\n" +
  "  if (!town) return;\n" +
  "  town.patches = Object.assign({}, town.patches, { timegap: { x: " + PATCH.x + ", y: " + PATCH.y + ", w: " + PATCH.w + ", h: " + PATCH.h + ", top: false, collision: " + JSON.stringify(open) + " } });\n" +
  "  for (const [x, y] of " + JSON.stringify(open) + ") town.collision[y * town.width + x] = 0;\n" +
  "  if (!town.connections.some((c) => c.map === " + JSON.stringify(LANE) + ")) town.connections.push({ map: " + JSON.stringify(LANE) + ", direction: \"left\", offset: 0 });\n" +
  "})();\n" + END;
const file = path.join(root, "data/emerald-maps.js");
let text = fs.readFileSync(file, "utf8");
const a = text.indexOf(START);
if (a >= 0) text = text.slice(0, a) + text.slice(text.indexOf(END, a) + END.length);
fs.writeFileSync(file, text + js);
console.log(LANE, LW + "x" + LH + ";", HUB, HW + "x" + HH);
