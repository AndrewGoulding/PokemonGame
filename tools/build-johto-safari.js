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
    // (And where an object can go: 1 on open ground, sand or mud, 2 on water
    // you Surf on, else 0: field_control.c's std_safari_place_object tests.)
    let solid = "", beh = "", place = "";
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = r.perm[(y0 + y) * r.width + x0 + x], b = v & 0xff, fb = frBehavior(b);
      solid += b === 0x13 ? "0" : String((v >> 15) & 1);
      beh += fb.toString(16).padStart(2, "0");
      place += fb === 0x10 || fb === 0x15 ? "2" : !((v >> 15) & 1) && [0x00, 0x21, 0xa4].includes(b) ? "1" : "0";
    }
    out.areas[a] = { name: AREA_NAMES[a], key: AREAS[a], solid, behavior: beh, place, anim: pics.length ? { cells, anims: pic.anims } : undefined };
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

// ---------- Object Arrangement ----------
// HGSS's 24 objects (src/unk_02097268.c's sObjects: the build model, its
// size in tiles, its type), their names and words (msg_0430), the four
// groups of six Baoba's calls unlock (overlay 108's lists, in the order your
// Trainer ID's last digit takes them), the points each object's worth by the
// tens of days its Area's been in the layout (sObjectLevelBoosts), and the
// field's words (msg_0427: placing and removing).
const U = fs.readFileSync(path.join(ROOT, "src/unk_02097268.c"), "utf8");
const OBJ_TYPES = { NONE: null, PLAINS: "plains", FOREST: "forest", PEAK: "peak", WATER: "water" };
const BM = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/buildmodel.h"), "utf8").matchAll(/#define\s+(BUILD_MODEL_\w+)\s+(\d+)/g)) BM[m[1]] = +m[2];
const objDefs = [...U.split("sObjects[")[1].split("};")[0].matchAll(/\[SAFARI_ZONE_OBJECTID_(\w+)\]\s*=\s*\{\s*(\w+),\s*(\w+),\s*(\d+),\s*(\d+),\s*(\w+),\s*SAFARI_ZONE_OBJECT_TYPE_(\w+)\s*\}/g)]
  .map((m) => ({ model: BM[m[2]], w: +m[4], h: +m[5], gendered: m[6] === "TRUE", type: OBJ_TYPES[m[7]] }));
if (objDefs.length !== 24) throw new Error("couldn't read the Safari Zone's objects");
const OM = JSON.parse(fs.readFileSync(path.join(ROOT, "files/msgdata/msg/msg_0430.json"), "utf8")).messages
  .map((x) => [].concat(x.en_US || "").join("").replace(/’/g, "'").split(/\n/).map((t) => t.trim()).filter(Boolean));
const ASM = fs.readFileSync(path.join(ROOT, "asm/overlay_108_021E8850.s"), "utf8").replace(/;.*/g, "");
const asmBytes = (label) => ASM.split(label + ":")[1].split(/\n\s*\n|\.balign|\n\w/)[0].match(/0x[0-9A-F]+/gi).map((h) => parseInt(h, 16));
const asmWords = ASM.split("ov108_021EAD08:")[1].split("\n\n")[0];
const groups = [...asmWords.matchAll(/\.word\s+(\d+),\s*(\w+)/g)].map((m) => asmBytes(m[2]).slice(0, +m[1]));
const order = asmBytes("ov108_021EAD28");
const boosts = [...U.split("sObjectLevelBoosts")[1].split("};")[0].matchAll(/\{([\d,\s]+)\}/g)].map((m) => m[1].split(",").map(Number));
if (groups.length !== 4 || order.length !== 40 || boosts.length !== 4) throw new Error("couldn't read Object Arrangement's tables");

// Each object's picture: its build model (a/0/4/0) drawn as the maps are,
// from above and in front (tools/lib/hgss-map.js's "oblique"), 4x
// supersampled, cropped; all of them in one sheet, with where each stands
// from its tiles' top left corner.
const N = require("./lib/nitro");
const { readNarc } = require("./lib/narc");
const bldModels = readNarc(path.join(ROOT, "files/a/0/4/0"));
function drawModel(id) {
  const nb = N.parseNsb(bldModels[id]), CW = 64, CH = 112, CX = 32, CZ = 88, SS = 4, W = CW * SS, H = CH * SS;
  const col = new Float32Array(W * H * 4), dep = new Float32Array(W * H).fill(-1e9), texc = new Map();
  const tex = (mat) => {
    if (!mat || !mat.texName) return null;
    const k = mat.texName + "/" + mat.palName;
    if (!texc.has(k)) texc.set(k, N.decodeTexture(nb.tex, mat.texName, mat.palName));
    return texc.get(k);
  };
  const wrap = (c, n, rep, mir) => {
    let i = Math.floor(c * n);
    if (!rep) return Math.min(n - 1, Math.max(0, i));
    if (mir) { const per = Math.floor(i / n); i = ((i % n) + n) % n; return per & 1 ? n - 1 - i : i; }
    return ((i % n) + n) % n;
  };
  const tris = [];
  for (const m of nb.models) for (const t of N.buildTriangles(m, N.M.ident())) tris.push(t);
  const proj = (p) => [(p[0] + CX) * SS, (p[2] - p[1] + CZ) * SS, p[1] + p[2]];
  // (Opaque first, with the depth; then the translucent, the shadow and the fountain's spray, over it.)
  for (const pass of [false, true]) for (const t of tris) {
    const mat = t.mat, tx = tex(mat), ma = mat ? mat.alpha : 1;
    if ((ma < 0.99 || !!(tx && (tx.fmt === 1 || tx.fmt === 6))) !== pass) continue;
    const P = t.v.map((v) => proj(v.p));
    const a2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(a2) < 1e-9 || (mat && mat.cullBack && a2 > 0) || (mat && mat.cullFront && a2 < 0)) continue;
    const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / a2;
      const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / a2, w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const d = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2], i = y * W + x, V = t.v;
      if (!pass && d < dep[i] - 0.01) continue;
      let rgba = [200, 200, 200, 255];
      if (tx) {
        const u = w0 * V[0].uv[0] + w1 * V[1].uv[0] + w2 * V[2].uv[0], v = w0 * V[0].uv[1] + w1 * V[1].uv[1] + w2 * V[2].uv[1];
        const tp = (mat.texParam | tx.params) >>> 0, X = wrap(u, tx.w, tp & (1 << 16), tp & (1 << 18)), Y = wrap(v, tx.h, tp & (1 << 17), tp & (1 << 19)), q = (Y * tx.w + X) * 4;
        rgba = [tx.rgba[q], tx.rgba[q + 1], tx.rgba[q + 2], tx.rgba[q + 3]];
      }
      const a = (rgba[3] / 255) * ma;
      if (!pass && a < 0.5) continue;
      const lit = [0, 1, 2].map((j) => Math.min(1, (w0 * V[0].c[j] + w1 * V[1].c[j] + w2 * V[2].c[j]) / 0.81));
      for (let j = 0; j < 3; j++) col[i * 4 + j] = pass ? col[i * 4 + j] * (1 - a) + rgba[j] * lit[j] * a : rgba[j] * lit[j];
      col[i * 4 + 3] = pass ? Math.max(col[i * 4 + 3], a * 255) : 255;
      if (!pass) dep[i] = d;
    }
  }
  const img = new Uint8ClampedArray(CW * CH * 4);
  let bx0 = CW, by0 = CH, bx1 = -1, by1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const i = (y * SS + sy) * W + x * SS + sx, al = col[i * 4 + 3] / 255;
      r += col[i * 4] * al; g += col[i * 4 + 1] * al; b += col[i * 4 + 2] * al; a += al;
    }
    if (a < 0.5) continue;
    const o = (y * CW + x) * 4;
    img[o] = r / a; img[o + 1] = g / a; img[o + 2] = b / a; img[o + 3] = Math.round(255 * a / (SS * SS));
    bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
  }
  return { img, CW, CX, CZ, bx0, by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
}
const pics = [], sprite = (def, model) => {
  const p = drawModel(model), at = pics.reduce((s, q) => s + q.w, 0);
  pics.push(p);
  // [x in the sheet, width, height, x and y from the object's top left tile corner]
  return [at, p.w, p.h, p.bx0 - (p.CX - 8 * def.w), p.by0 - (p.CZ - 8 * def.h)];
};
out.objects = objDefs.map((d, i) => ({ name: OM[14 + i][0], about: OM[38 + i], type: d.type, w: d.w, h: d.h,
  sprite: sprite(d, d.model), spriteF: d.gendered ? sprite(d, d.model + 1) : undefined }));
{
  const SW = pics.reduce((s, q) => s + q.w, 0), SH = Math.max(...pics.map((q) => q.h)), sheet = new Uint8ClampedArray(SW * SH * 4);
  let at = 0;
  for (const p of pics) {
    for (let y = 0; y < p.h; y++) sheet.set(p.img.subarray(((p.by0 + y) * p.CW + p.bx0) * 4, ((p.by0 + y) * p.CW + p.bx0 + p.w) * 4), (y * SW + at) * 4);
    at += p.w;
  }
  writePng(path.join(mapsDir, MAP + "-objects.png"), SW, SH, sheet);
}
out.groups = groups;
out.unlockOrder = order;
out.boosts = boosts;
out.text.place = MSG[4]; out.text.placed = MSG[5]; out.text.remove = MSG[6]; out.text.removed = MSG[7];
out.text.full = MSG[8]; out.text.noObjects = MSG[9]; out.text.noSpace = MSG[10];
console.log("objects", out.objects.length, out.objects.map((o) => o.name + " " + o.w + "x" + o.h).join(", "));

const file = path.join(__dirname, "lib/johto-safari.generated.js");
const START = "// Johto's Safari Zone (tools/build-johto-safari.js", END = "// (End of the Safari Zone.)\n";
const js = START + ", from pret/pokeheartgold): its twelve Areas, their Pokémon, its objects, HGSS's default layouts and flee rates.\n" +
  "window.JOHTO_SAFARI = " + JSON.stringify(out) + ";\n" +
  // (Each Area a patch over the Safari Zone's picture, where the layout puts it: ui/johto-safari.js.)
  "(function () {\n  const m = window.WORLD_MAPS." + MAP + ";\n  if (!m) return;\n  m.patches = m.patches || {};\n" +
  "  window.JOHTO_SAFARI.areas.forEach((a) => { m.patches[a.key] = { x: 0, y: 0, w: 32, h: 32, top: true, collision: [], anim: a.anim }; });\n})();\n" + END;
fs.writeFileSync(file, js);
// And into data/johto-maps.js, in place of what an earlier run (or build-johto.js) put there.
const mapsFile = path.join(root, "data/johto-maps.js");
if (fs.existsSync(mapsFile)) {
  let maps = fs.readFileSync(mapsFile, "utf8");
  const a = maps.indexOf(START);
  if (a >= 0) {
    const e = maps.indexOf(END, a), b = e >= 0 ? e + END.length : maps.indexOf("})();\n", a) + "})();\n".length;
    maps = maps.slice(0, a) + js + maps.slice(b);
  } else maps += js;
  fs.writeFileSync(mapsFile, maps);
}
console.log("wrote", path.relative(root, file), (fs.statSync(file).size / 1024).toFixed(0) + " KB");
