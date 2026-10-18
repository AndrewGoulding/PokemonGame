// Builds Johto's Safari Zone areas from HeartGold and SoulSilver (a
// pret/pokeheartgold checkout): the twelve Areas (Plains, Meadow, Savannah,
// Peak, Rocky Beach, Wetland, Forest, Swamp, Marshland, Wasteland, Mountain,
// Desert), each a 32x32-tile chunk of land data (a/0/6/5, 652 + its number)
// that HGSS puts on the Safari Zone's matrix (PlaceSafariZoneAreas,
// src/map_matrix.c) in the six places of its 3x2 layout; and their wild
// Pokémon (files/arc/safari_enc.json) and HGSS's Safari flee rates
// (personal.json's greatMarshRate).
//
//   node tools/build-johto-safari.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// tools/build-johto.js draws the Safari Zone (SafariZone_EntranceExterior)
// with the matrix's own chunks in the six places; here each Area is drawn
// in one of them, in the Safari Zone round it (Areas 0-5 in one drawing,
// 6-11 in another), as FireRed's style paints it (tools/lib/fr-painter.js).
//
// Writes:
//   assets/world/maps/SafariZone_EntranceExterior-patch-<area>.png, -top.png,
//                     -anim.png   each Area's picture: the map's patches,
//                                 put where the layout has them (ui/johto-safari.js)
//   tools/lib/johto-safari.generated.js   window.JOHTO_SAFARI (each Area's
//                                 collision and behaviours, its Pokémon by
//                                 the time of day, the bonus Pokémon its
//                                 objects bring, HGSS's ten default layouts,
//                                 the flee rates); build-johto.js puts it
//                                 at the end of data/johto-maps.js.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { writePng } = require("./lib/png");
const { renderMap } = require("./lib/hgss-map");
const HC = require("./lib/hgss-classes");
const Painter = require("./lib/fr-painter");
const { writeAnimSheet } = require("./lib/fr-tiles");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/arc/safari_enc.json"))) {
  console.error("Usage: node tools/build-johto-safari.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
const mapsDir = path.join(root, "assets/world/maps");
const MAP = "SafariZone_EntranceExterior", MAPCONST = "MAP_SAFARI_ZONE_ENTRANCE_EXTERIOR";

// The Areas (include/constants/safari.h's SAFARI_ZONE_AREA_*), by number.
const AREAS = ["plains", "meadow", "savannah", "peak", "rockybeach", "wetland", "forest", "swamp", "marshland", "wasteland", "mountain", "desert"];
const AREA_NAMES = ["Plains", "Meadow", "Savannah", "Peak", "Rocky Beach", "Wetland", "Forest", "Swamp", "Marshland", "Wasteland", "Mountain", "Desert"];
// HGSS's ten default layouts (src/safari_zone.c's sSafariZoneDefaultAreaSets;
// a new game takes one at random): top row west to east, then the bottom row.
const C = fs.readFileSync(path.join(ROOT, "src/safari_zone.c"), "utf8");
const DEFAULTS = [...C.split("sSafariZoneDefaultAreaSets")[1].split("};")[0].matchAll(/\{([^{}]+)\}/g)]
  .map((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean).map((s) => AREAS.indexOf(s.replace("SAFARI_ZONE_AREA_", "").replace("_", "").toLowerCase())));
if (DEFAULTS.length !== 10 || DEFAULTS.some((d) => d.length !== 6 || d.includes(-1))) throw new Error("couldn't read the default layouts");
// (The layout's places on the Safari Zone's matrix, 0212_D47R0102: columns 1-3, rows 1-2.)
const PLACE = (i) => ({ cx: 1 + (i % 3), cz: 1 + Math.floor(i / 3) });

// HGSS tile behaviours as FireRed's (as tools/build-johto.js's frBehavior,
// for what the Areas have: grass, water, ledges, sand, puddles).
function frBehavior(b) {
  switch (b) {
    case 0x02: case 0x03: return 0x02;
    case 0x10: return 0x10; case 0x13: return 0x13; case 0x15: return 0x15;
    case 0x16: case 0x1d: return 0x16; case 0x17: return 0x17; case 0x21: return 0x21;
    case 0x38: case 0x39: case 0x3a: case 0x3b: return b;
    case 0x4b: return 0xf1; case 0x4c: return 0xf2;
    default: return 0;
  }
}

// ---------- The Areas' pictures ----------
const out = { areas: [] };
for (const set of [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11]]) {
  const land = (x, z, l) => { for (let i = 0; i < 6; i++) { const p = PLACE(i); if (p.cx === x && p.cz === z) return 652 + set[i]; } return l; };
  const r = renderMap(ROOT, MAPCONST, { ground: true, labels: true, land });
  const W = r.width * 16, H = r.height * 16;
  // (A gap, a folded triangle's, its neighbours' colour: as tools/build-johto.js does.)
  for (let pass = 0, gaps = true; gaps && pass < 32; pass++) {
    gaps = false;
    const src = r.below.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      if (src[o + 3] === 255) continue;
      let n = 0; const sum = [0, 0, 0];
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const u = x + dx, v = y + dy;
        if (u < 0 || v < 0 || u >= W || v >= H) continue;
        const q = (v * W + u) * 4;
        if (src[q + 3] === 255) { n++; for (let k = 0; k < 3; k++) sum[k] += src[q + k]; }
      }
      if (n) { for (let k = 0; k < 3; k++) r.below[o + k] = Math.round(sum[k] / n); r.below[o + 3] = 255; } else gaps = true;
    }
  }
  const classes = HC.classify(r, { cave: false });
  const evw = (r.events || { warps: [] }).warps.map((w) => ({ x: w.x, y: w.y, mapConst: w.map }));
  const signs = ((r.events || { signs: [] }).signs || []).filter((sg) => sg.type !== 2).map((sg) => [sg.x, sg.y, "sign"]);
  const pic = Painter.compose(classes, r.width, r.height, { buildings: HC.buildingsOf(r, classes, evw), signs, style: "outdoor" });
  set.forEach((a, i) => {
    const { cx, cz } = PLACE(i), x0 = cx * 32, y0 = cz * 32, S = 32 * 16;
    for (const [part, src] of [["", pic.below], ["-top", pic.above]]) {
      const img = new Uint8ClampedArray(S * S * 4);
      for (let y = 0; y < S; y++) img.set(src.subarray(((y0 * 16 + y) * W + x0 * 16) * 4, ((y0 * 16 + y) * W + x0 * 16 + S) * 4), y * S * 4);
      writePng(path.join(mapsDir, MAP + "-patch-" + AREAS[a] + part + ".png"), S, S, img);
    }
    // Its animated cells (water, flowers), and their frames, as the patch's own.
    const cells = [], pics = [], A = pic.anim;
    for (let k = 0; k < A.cells.length; k += 4) {
      const [ux, uy, first, mask] = A.cells.slice(k, k + 4);
      if (ux < x0 * 2 || uy < y0 * 2 || ux >= (x0 + 32) * 2 || uy >= (y0 + 32) * 2) continue;
      const n = (k + 4 < A.cells.length ? A.cells[k + 6] : A.pics.length) - first;
      cells.push(ux - x0 * 2, uy - y0 * 2, pics.length, mask);
      for (let p = 0; p < n; p++) pics.push(A.pics[first + p]);
    }
    const animFile = path.join(mapsDir, MAP + "-patch-" + AREAS[a] + "-anim.png");
    if (pics.length) writeAnimSheet(animFile, pics); else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // Its tiles: solid or not, and what they are (FireRed's behaviours), a
    // character each and two hex digits each.
    let solid = "", beh = "";
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = r.perm[(y0 + y) * r.width + x0 + x];
      solid += (v & 0xff) === 0x13 ? "0" : String((v >> 15) & 1);
      beh += frBehavior(v & 0xff).toString(16).padStart(2, "0");
    }
    out.areas[a] = { name: AREA_NAMES[a], key: AREAS[a], solid, behavior: beh, anim: pics.length ? { cells, anims: pic.anims } : undefined };
    const tiles = beh.match(/../g);
    console.log(AREA_NAMES[a], "grass", tiles.filter((h) => h === "02").length, "water", tiles.filter((h) => h === "10" || h === "15").length, "anim cells", cells.length / 4);
  });
}

// ---------- Their Pokémon ----------
const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
const species = (s) => dexByID[toID(String(s).replace(/^SPECIES_/, ""))] || null;
// (Each Area's ten slots, one in ten each, by the time of day: [species, level].)
const ENC = JSON.parse(fs.readFileSync(path.join(ROOT, "files/arc/safari_enc.json"), "utf8")).encounters;
const KINDS = { land: "land", surf: "surf", oldrod: "old-rod", goodrod: "good-rod", superrod: "super-rod" };
const OBJECT_TYPES = { SAFARI_ZONE_OBJECT_TYPE_PLAINS: "plains", SAFARI_ZONE_OBJECT_TYPE_FOREST: "forest", SAFARI_ZONE_OBJECT_TYPE_PEAK: "peak", SAFARI_ZONE_OBJECT_TYPE_WATER: "water" };
const slot = (s) => [species(s.species), s.level];
for (const e of ENC) {
  const a = AREAS.indexOf(e.area.replace("SAFARI_ZONE_AREA_", "").replace("_", "").toLowerCase());
  const mons = {};
  for (const [k, kind] of Object.entries(KINDS)) {
    const t = e[k];
    if (!t) continue;
    // (Morning, day and night; then the bonus slots, each with the objects it
    // needs in the Area: up to two kinds, each at least so many.)
    mons[kind] = { morning: t.mons.morn.map(slot), day: t.mons.day.map(slot), night: t.mons.nite.map(slot),
      bonus: (t.bonus_mons || []).map((b) => ({ needs: b.conditions.map((c) => [OBJECT_TYPES[c.object_type], c.count]),
        morning: slot(b.morn), day: slot(b.day), night: slot(b.nite) })) };
  }
  out.areas[a].mons = mons;
}
// (HGSS's rates for the Safari Zone's grass and water: its map's, ENCDATA_D47R0102.)
const GS = JSON.parse(fs.readFileSync(path.join(ROOT, "files/fielddata/encountdata/gs_enc_data.json"), "utf8")).encounters.find((x) => x.map === "D47R0102");
out.rates = { land: GS.land.rate, surf: GS.surf.rate };
out.defaults = DEFAULTS;
// The Safari Game's announcements and question (msg_0427: std_safari_balls_out,
// std_safari_storage_out, std_safari_exit), as pages.
const MSG = JSON.parse(fs.readFileSync(path.join(ROOT, "files/msgdata/msg/msg_0427.json"), "utf8")).messages
  .map((x) => [].concat(x.en_US || "").join("").replace(/’/g, "'").replace(/\s*\{YESNO \d+\}/, "").split(/[\r\f]/).map((t) => t.trim()).filter(Boolean));
out.text = { ballsOut: MSG[1], storageOut: MSG[2], exitNow: MSG[3] };
// HGSS's Safari flee rates (the Great Marsh's, personal.json): the Pokémon that have one.
out.flee = {};
for (const p of JSON.parse(fs.readFileSync(path.join(ROOT, "files/poketool/personal/personal.json"), "utf8")).baseStats) {
  const sp = species(p.species);
  if (sp && p.greatMarshRate) out.flee[sp] = p.greatMarshRate;
}

const file = path.join(__dirname, "lib/johto-safari.generated.js");
fs.writeFileSync(file, "// Johto's Safari Zone (tools/build-johto-safari.js, from pret/pokeheartgold): its twelve Areas, their Pokémon, HGSS's default layouts and flee rates.\n" +
  "window.JOHTO_SAFARI = " + JSON.stringify(out) + ";\n" +
  // (Each Area a patch over the Safari Zone's picture, where the layout puts it: ui/johto-safari.js.)
  "(function () {\n  const m = window.WORLD_MAPS." + MAP + ";\n  if (!m) return;\n  m.patches = m.patches || {};\n" +
  "  window.JOHTO_SAFARI.areas.forEach((a) => { m.patches[a.key] = { x: 0, y: 0, w: 32, h: 32, top: true, collision: [], anim: a.anim }; });\n})();\n");
console.log("wrote", path.relative(root, file), (fs.statSync(file).size / 1024).toFixed(0) + " KB");
