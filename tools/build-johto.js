// Builds the first Johto maps from HeartGold and SoulSilver
// (a pret/pokeheartgold checkout): Cherrygrove City, Route 29, New Bark
// Town; west and north to Violet City, Azalea Town and Goldenrod City
// (Routes 30 to 36 and 46, the Ruins of Alph); and the way to Kanto: Route 27, Tohjo Falls and Route 26, whose gate
// at the top is the Pokémon League's (FireRed's Route22_NorthEntrance, its
// way west into Johto drawn here, and open to the Champion: ui/game.js).
//
//   node tools/build-johto.js <path to pret/pokeheartgold>
//   (or set POKEHEARTGOLD=<path>)
//
// HGSS maps are 3D (each 32x32-tile chunk an NSBMD model, with building
// models placed on it); tools/lib/hgss-map.js draws them as this game's
// 2D maps at 16 px a tile, as FireRed would show them. From the checkout:
// map headers and the overworld matrix, land data (permissions, buildings,
// models), area data and textures (files/a/...), events
// (files/fielddata/eventdata/zone_event), scripts and text (for what people
// and signs say), wild Pokémon (gs_enc_data.json) and people's sprites
// (files/data/mmodel).
//
// Writes:
//   assets/world/maps/<Map>.png, -top.png, -border.png   the pictures
//   assets/world/sprites/hgss_<name>.png   people, in FireRed's frame order
//                                          (32x32 frames: stand down, up, left;
//                                          walk down x2, up x2, left x2)
//   data/johto-maps.js      window.WORLD_MAPS entries for them (merged into
//                           FireRed's): size, collision, behaviour (HGSS's
//                           numbers turned into FireRed's), warps (to maps not
//                           built yet), signs, people, hidden items, wild
//                           Pokémon (daytime), Surf and fishing.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { readPng, writePng } = require("./lib/png");
const { renderMap } = require("./lib/hgss-map");
const HC = require("./lib/hgss-classes");
const Painter = require("./lib/fr-painter");
const { writeAnimSheet } = require("./lib/fr-tiles");
const N = require("./lib/nitro");

const ROOT = process.argv.slice(2).find((a) => !a.startsWith("--")) || process.env.POKEHEARTGOLD;
// (Drawn in FireRed's style, as Kanto is (tools/lib/fr-painter.js); with --hgss, as HGSS draws them.)
const HGSS_LOOK = process.argv.includes("--hgss");
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/fielddata"))) {
  console.error("Usage: node tools/build-johto.js <path to pret/pokeheartgold> [--hgss]");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/items.js"), "utf8"));
const F = (p) => path.join(ROOT, "files", p);

// The maps (their places on HGSS's world matrix join them up).
// (Music: FireRed's nearest, until Johto's own is built.)
// (ground: the map isn't flat, so it's drawn from each tile's ground: tools/lib/hgss-map.js.)
const MAPS = [
  { c: "MAP_CHERRYGROVE", name: "CherrygroveCity", title: "Cherrygrove City", type: "city", zone: "T21", music: "mus_pewter" },
  { c: "MAP_ROUTE_29", name: "Route29", title: "Route 29", type: "route", zone: "R29", music: "mus_route1" },
  { c: "MAP_NEW_BARK", name: "NewBarkTown", title: "New Bark Town", type: "town", zone: "T20", music: "mus_pallet" },
  { c: "MAP_ROUTE_27", name: "Route27", title: "Route 27", type: "route", zone: "R27", music: "mus_route3", ground: true },
  { c: "MAP_TOHJO_FALLS", name: "TohjoFalls", title: "Tohjo Falls", type: "underground", zone: "D45R0101", music: "mus_mt_moon", ground: true },
  { c: "MAP_ROUTE_26", name: "Route26", title: "Route 26", type: "route", zone: "R26", music: "mus_route3", ground: true },
  // West and north of Cherrygrove: to Violet City, Azalea Town and Goldenrod City.
  { c: "MAP_ROUTE_30", name: "Route30", title: "Route 30", type: "route", zone: "R30", music: "mus_route1", ground: true },
  { c: "MAP_ROUTE_31", name: "Route31", title: "Route 31", type: "route", zone: "R31", music: "mus_route1", ground: true },
  { c: "MAP_VIOLET", name: "VioletCity", title: "Violet City", type: "city", zone: "T22", music: "mus_vermillion", ground: true },
  { c: "MAP_ROUTE_32", name: "Route32", title: "Route 32", type: "route", zone: "R32", music: "mus_route3", ground: true },
  { c: "MAP_ROUTE_33", name: "Route33", title: "Route 33", type: "route", zone: "R33", music: "mus_route3", ground: true },
  { c: "MAP_AZALEA", name: "AzaleaTown", title: "Azalea Town", type: "town", zone: "T23", music: "mus_fuchsia", ground: true },
  { c: "MAP_ROUTE_34", name: "Route34", title: "Route 34", type: "route", zone: "R34", music: "mus_route11", ground: true },
  { c: "MAP_GOLDENROD", name: "GoldenrodCity", title: "Goldenrod City", type: "city", zone: "T25", music: "mus_celadon", ground: true },
  { c: "MAP_ROUTE_35", name: "Route35", title: "Route 35", type: "route", zone: "R35", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_36", name: "Route36", title: "Route 36", type: "route", zone: "R36", music: "mus_route11", ground: true },
  { c: "MAP_RUINS_OF_ALPH", name: "RuinsOfAlph", title: "Ruins of Alph", type: "route", zone: "D24R0101", music: "mus_sevii_route", ground: true },
  { c: "MAP_ROUTE_46", name: "Route46", title: "Route 46", type: "route", zone: "R46", music: "mus_route24", ground: true },
  // The gatehouses, caves and forest between them (each on its own matrix).
  { c: "MAP_ROUTE_29_ROUTE_46_GATEHOUSE", name: "Route29_Route46_Gatehouse", title: "Route 29", type: "indoor", zone: "R29R0101", music: "mus_route1", ground: true },
  { c: "MAP_ROUTE_31_VIOLET_GATEHOUSE", name: "Route31_VioletGatehouse", title: "Route 31", type: "indoor", zone: "R31R0101", music: "mus_route1", ground: true },
  { c: "MAP_VIOLET_ROUTE_36_GATEHOUSE", name: "VioletCity_Route36_Gatehouse", title: "Violet City", type: "indoor", zone: "T22R0701", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_32_RUINS_OF_ALPH_GATEHOUSE", name: "Route32_RuinsOfAlph_Gatehouse", title: "Route 32", type: "indoor", zone: "R32R0101", music: "mus_route3", ground: true },
  { c: "MAP_ROUTE_36_RUINS_OF_ALPH_GATEHOUSE", name: "Route36_RuinsOfAlph_Gatehouse", title: "Route 36", type: "indoor", zone: "R36R0101", music: "mus_route11", ground: true },
  { c: "MAP_ROUTE_35_GOLDENROD_GATEHOUSE", name: "Route35_Goldenrod_Gatehouse", title: "Route 35", type: "indoor", zone: "R35R0101", music: "mus_route11", ground: true },
  { c: "MAP_UNION_CAVE_1F", name: "UnionCave_1F", title: "Union Cave", type: "underground", zone: "D25R0101", music: "mus_mt_moon", ground: true },
  { c: "MAP_AZALEA_ILEX_FOREST_GATEHOUSE", name: "AzaleaTown_IlexForest_Gatehouse", title: "Azalea Town", type: "indoor", zone: "T23R0101", music: "mus_route11", ground: true },
  { c: "MAP_ILEX_FOREST", name: "IlexForest", title: "Ilex Forest", type: "route", zone: "D36R0101", music: "mus_viridian_forest", ground: true },
  { c: "MAP_ROUTE_34_ILEX_FOREST_GATEHOUSE", name: "Route34_IlexForest_Gatehouse", title: "Route 34", type: "indoor", zone: "R34R0201", music: "mus_route11", ground: true }
];
// The Pokémon League Reception Gate is FireRed's own (Route22_NorthEntrance):
// Route 26's door into it is its new way west (data/johto-maps.js adds it).
const GATE = { name: "Route22_NorthEntrance", x: 0, y: 6 };
const byConst = Object.fromEntries(MAPS.map((m) => [m.c, m.name]));

// HGSS tile behaviours (include/constants/metatile_behavior.h) as FireRed's
// (game/world.js's MB): most kept Gen 3's numbers.
function frBehavior(b) {
  switch (b) {
    case 0x02: case 0x03: return 0x02;            // tall grass, very tall grass
    case 0x10: return 0x10;                       // river: pond water
    case 0x13: return 0x13;                       // waterfall
    case 0x15: return 0x15;                       // sea
    case 0x16: case 0x1d: return 0x16;            // puddles
    case 0x17: return 0x17;                       // shallow water
    case 0x20: return 0x23;                       // ice
    case 0x21: return 0x21;                       // sand
    case 0x38: case 0x39: case 0x3a: case 0x3b: return b;   // ledges
    case 0x62: case 0x63: case 0x64: case 0x65: return b;   // warps you walk off
    case 0x6c: return 0x62; case 0x6d: return 0x63; case 0x6e: return 0x64; case 0x6f: return 0x65;
    case 0x67: return 0x67;                       // warp pad
    case 0x5e: case 0x5f: return 0x61;            // stairs you walk onto (a cave's floors): a ladder's step-on warp
    case 0x69: return 0x69;                       // door
    case 0x83: case 0x85: case 0x86: return b;    // PC, town map, TV
    default: return 0;                            // (headbutt trees and the like: collision does it)
  }
}

const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const dexByID = {};
for (const k of Object.keys(window.DEX)) if (window.DEX[k].id < 10000) dexByID[toID(k)] = k;
const species = (s) => dexByID[toID(String(s).replace(/^SPECIES_/, ""))] || null;

// ---------- Text: what people and signs say ----------

const msgFiles = fs.readdirSync(F("msgdata/msg"));
const messages = {};
function loadMessages(zone) {
  const file = msgFiles.find((f) => new RegExp("^msg_\\d+_" + zone + "\\.json$").test(f));
  if (!file) return;
  for (const m of JSON.parse(fs.readFileSync(F("msgdata/msg/" + file), "utf8")).messages) messages[m.id] = m.en_US;
}
// HGSS text as this game's pages: \r and \f start a new page, \n a new line;
// the player's name ({STRVAR_1 3, 0, 0}) is {PLAYER}.
function pages(text) {
  if (text == null) return null;
  const s = [].concat(text).join("").replace(/\{STRVAR_1 \d+, 0, \d+\}/g, "{PLAYER}").replace(/\{[^}]*\}/g, (m) => (m === "{PLAYER}" ? m : ""))
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  return s.split(/[\r\f]/).map((p) => p.replace(/\n$/, "")).filter((p) => p.trim());
}
const scriptSrc = {};
function scriptText(zone, ref) {
  const m = /scr_seq_(\w+?)_(\d+)/.exec(String(ref || ""));
  if (!m) return null;
  if (!scriptSrc[zone]) {
    const file = fs.readdirSync(F("fielddata/script/scr_seq")).find((f) => new RegExp("^scr_seq_\\d+_" + zone + "\\.s$").test(f));
    scriptSrc[zone] = file ? fs.readFileSync(F("fielddata/script/scr_seq/" + file), "utf8") : "";
  }
  const src = scriptSrc[zone], label = "scr_seq_" + m[1] + "_" + m[2] + ":";
  const at = src.indexOf("\n" + label);
  if (at < 0) return null;
  // The first message after its label, before the next script's.
  const next = src.indexOf("\nscr_seq_", at + label.length + 1);
  const body = src.slice(at, next < 0 ? undefined : next);
  const msg = /\b(msg_\d+_\w+?_\d+)\b/.exec(body);
  const text = msg ? pages(messages[msg[1]]) : null;
  // (A sign naming your friend's house: Lyra's, as for a boy.)
  return text && /BufferFriendsName 0/.test(body) ? text.map((p) => p.replace(/\{PLAYER\}/g, "Lyra")) : text;
}

// ---------- People's sprites ----------

const spriteTable = {};
for (const m of fs.readFileSync(path.join(ROOT, "asm/overlay_01_sprite_data.s"), "utf8").matchAll(/\.short (SPRITE_\w+), (MMODEL_\w+)/g)) spriteTable[m[1]] = m[2];
const mmodelIndex = {};
for (const m of fs.readFileSync(path.join(ROOT, "include/constants/mmodel.h"), "utf8").matchAll(/#define (MMODEL_\w+)\s+(\d+)/g)) mmodelIndex[m[1]] = +m[2];
// HGSS's frames: up, down, left, right, four each (stand, step, stand, step).
// FireRed's: stand down, up, left; walk down, down, up, up, left, left.
const FR_FRAMES = [4, 0, 8, 5, 7, 1, 3, 9, 11];
const spritesDone = new Map();
function personSprite(sprite) {
  if (spritesDone.has(sprite)) return spritesDone.get(sprite);
  let out = null;
  const i = mmodelIndex[spriteTable[sprite]];
  const file = i != null && F("data/mmodel/mmodel/mmodel_" + String(i).padStart(8, "0") + ".NSBTX");
  if (file && fs.existsSync(file)) {
    const t = N.parseNsb(fs.readFileSync(file)).tex;
    const pal = t && Object.keys(t.palettes)[0];
    const names = t ? Object.keys(t.textures).sort((a, b) => +a.split(".").pop() - +b.split(".").pop()) : [];
    const frames = names.map((k) => N.decodeTexture(t, k, pal));
    if (frames.length >= 12 && frames[0].w === 32 && frames[0].h === 32) {
      const name = "hgss_" + sprite.replace(/^SPRITE_/, "").toLowerCase();
      const W = 32 * FR_FRAMES.length, rgba = new Uint8ClampedArray(W * 32 * 4);
      FR_FRAMES.forEach((f, n) => { for (let y = 0; y < 32; y++) rgba.set(frames[f].rgba.subarray(y * 128, (y + 1) * 128), (y * W + n * 32) * 4); });
      writePng(path.join(root, "assets/world/sprites", name + ".png"), W, 32, rgba);
      // (32 wide, centred on the tile: offsetX.)
      out = { sprite: name, width: 32, height: 32, frames: FR_FRAMES.length, offsetX: -8 };
    }
  }
  spritesDone.set(sprite, out);
  return out;
}
// HGSS movement (0 still, 2 looking around, 3 wandering) and facing (0 up,
// 1 down, 2 left, 3 right) as FireRed's movement types.
const FACING = ["up", "down", "left", "right"];
function movement(p) {
  if (p.movement === 3 && (p.rangeX || p.rangeY)) return "wander_around";
  if (p.movement === 2 || p.movement === 3) return "look_around";
  return "face_" + (FACING[p.facing] || "down");
}

// ---------- The maps ----------

const enc = JSON.parse(fs.readFileSync(F("fielddata/encountdata/gs_enc_data.json"), "utf8")).encounters;
const ver = (v) => (v && typeof v === "object" && !Array.isArray(v) && "HEARTGOLD" in v ? v.HEARTGOLD : v);
const slot = (s) => {
  const lv = ver(s.level);
  const sp = species(ver(s.species && s.species.day !== undefined ? s.species.day : s.species));
  return { species: sp, min: typeof lv === "object" ? lv.min : lv, max: typeof lv === "object" ? lv.max : lv };
};
const table = (t) => (t && t.rate ? { rate: t.rate, slots: t.mons.map(slot) } : undefined);

const out = {}, rendered = {};
const mapsDir = path.join(root, "assets/world/maps");
MAPS.forEach((m, i) => {
  loadMessages(m.zone);
  // (Outdoors, drawn by the painter in FireRed's style: from what each tile is.)
  const painted = !HGSS_LOOK && m.type !== "indoor" && m.type !== "underground";
  const r = renderMap(ROOT, m.c, { ground: m.ground, labels: painted });   // (ground: not flat, as Johto's first maps are)
  const W = r.width * 16, H = r.height * 16;
  // (Where a map that isn't flat was left with a gap, a folded triangle's, its neighbours' colour.)
  if (m.ground) for (let pass = 0, gaps = true; gaps && pass < 32; pass++) {
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
  // (In a room or cave, a tile nothing's drawn on is outside it: solid.)
  const inside = m.type === "indoor" || m.type === "underground";
  const drawnTiles = r.perm.map((v, i) => { const x = (i % r.width) * 16 + 8, y = Math.floor(i / r.width) * 16 + 8; return r.below[(y * W + x) * 4 + 3] > 0; });
  const drawn = (i) => drawnTiles[i];
  // (A cave's or room's nothing-there is dark.)
  if (inside) for (let i = 3; i < r.below.length; i += 4) if (r.below[i] < 255) {
    const a = r.below[i] / 255;
    for (let k = 1; k <= 3; k++) r.below[i - k] = Math.round(r.below[i - k] * a);
    r.below[i] = 255;
  }
  let anim;
  const animFile = path.join(mapsDir, m.name + "-anim.png");
  if (painted) {
    // What each tile is, its buildings (from their doors) and signs; drawn with
    // FireRed's metatiles and Kanto's buildings.
    const classes = HC.classify(r);
    const evw = (r.events || { warps: [] }).warps.map((w) => ({ x: w.x, y: w.y, mapConst: w.map }));
    const signs = ((r.events || { signs: [] }).signs || []).filter((sg) => sg.type !== 2)
      .map((sg) => [sg.x, sg.y, /TRAINER TIPS/i.test((scriptText(m.zone, sg.script) || []).join(" ")) ? "tips" : "sign"]);
    const pic = Painter.compose(classes, r.width, r.height, { buildings: HC.buildingsOf(r, classes, evw), signs });
    writePng(path.join(mapsDir, m.name + ".png"), W, H, pic.below);
    writePng(path.join(mapsDir, m.name + "-top.png"), W, H, pic.above);
    if (pic.anim.pics.length) { writeAnimSheet(animFile, pic.anim.pics); anim = { cells: pic.anim.cells, anims: pic.anims }; }
    else if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // Outside the map: what most of its edge is (trees, sea, ...), painted.
    const edge = {};
    for (let i = 0; i < r.width * r.height; i++) {
      const x = i % r.width, y = Math.floor(i / r.width);
      if (x && y && x < r.width - 1 && y < r.height - 1) continue;
      edge[pic.classes[i]] = (edge[pic.classes[i]] || 0) + 1;
    }
    const outside = ["tree", "water", "rock"].sort((a, b) => (edge[b] || 0) - (edge[a] || 0))[0];
    writePng(path.join(mapsDir, m.name + "-border.png"), 32, 32, Painter.render(Painter.paint(Array(4).fill(outside), 2, 2), 2, 2).below);
  } else {
    writePng(path.join(mapsDir, m.name + ".png"), W, H, r.below);
    writePng(path.join(mapsDir, m.name + "-top.png"), W, H, r.top);
    if (fs.existsSync(animFile)) fs.unlinkSync(animFile);
    // Outside the map: the forest of its top-left corner (2x2 tiles).
    const border = new Uint8ClampedArray(32 * 32 * 4);
    for (let y = 0; y < 32; y++) border.set(r.below.subarray(y * W * 4, y * W * 4 + 128), y * 128);
    writePng(path.join(mapsDir, m.name + "-border.png"), 32, 32, border);
  }

  // (HGSS's waterfalls are solid, and the water at their tops (34) a tile of
  // its own: FireRed's are waterfalls you go up or down with Waterfall, onto water.)
  const collision = r.perm.map((v, i) => (inside && !drawn(i) ? 1 : (v & 0xff) === 0x13 || (v & 0xff) === 0x22 ? 0 : (v >> 15) & 1));
  const behavior = r.perm.map((v) => ((v & 0xff) === 0x22 ? 0x10 : frBehavior(v & 0xff)));
  const ev = r.events || { warps: [], signs: [], people: [], triggers: [] };
  // (Doors are solid, as FireRed's are: walking up into one goes in.)
  rendered[m.name] = r;
  const e = enc.find((x) => x.map === m.zone);
  const people = [];
  for (const p of ev.people) {
    // Only those always there (story people come with their scenes; trainers, with Johto's battles).
    if (p.flag !== "FLAG_NOTHING" || !p.script || /^std_trainer/.test(p.script)) continue;
    const look = personSprite(p.sprite);
    if (!look) continue;
    people.push(Object.assign({ id: people.length, x: p.x, y: p.y, movement: movement(p), rangeX: p.rangeX || 1, rangeY: p.rangeY || 1,
      script: String(p.script).replace(/^_EV_|\s*\+.*$/g, ""), flag: null, text: scriptText(m.zone, p.script) || ["…"] }, look));
  }
  out[m.name] = {
    name: m.name, title: m.title, width: r.width, height: r.height, type: m.type, music: m.music, region: "johto",
    cycling: true, showName: m.type !== "indoor", top: true, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior, encounter: behavior.map((b) => (b === 0x02 ? 1 : 0)),
    connections: [],
    warps: ev.warps.map((w) => (w.map === "MAP_ROUTE_22_POKEMON_LEAGUE_RECEPTION_GATE" ? { x: w.x, y: w.y, map: GATE.name, warp: "johto" }
      : { x: w.x, y: w.y, map: byConst[w.map] || null, mapConst: byConst[w.map] ? undefined : w.map, warp: w.anchor })),
    signs: ev.signs.filter((s) => s.type !== 2).map((s) => ({ x: s.x, y: s.y, script: String(s.script).replace(/^_EV_|\s*\+.*$/g, ""), text: scriptText(m.zone, s.script) })),
    triggers: [],
    // (std_hiddenitem_<map>_<item>: the item is the longest ending that's an item.)
    hidden: ev.signs.filter((s) => s.type === 2 && s.x >= 0 && s.y >= 0 && s.x < r.width && s.y < r.height).map((s) => {
      const parts = String(s.script).replace(/^std_hiddenitem_/, "").split("_");
      let item = null;
      for (let k = 0; k < parts.length && !item; k++) { const id = parts.slice(k).join("-"); if (window.ITEMS[id]) item = id; }
      return item && { x: s.x, y: s.y, item, flag: "JOHTO_HIDDEN_" + m.zone + "_" + s.x + "_" + s.y, quantity: 1 };
    }).filter(Boolean),
    people,
    wild: e && table(e.land),
    water: e && table(e.surf),
    // (Gen 4's rods: five slots each, 40/40/15/4/1.)
    fishing: e && e.fishing && e.fishing.old_rod.rate ? { rods: { "old-rod": table(e.fishing.old_rod), "good-rod": table(e.fishing.good_rod), "super-rod": table(e.fishing.super_rod) } } : undefined,
    // (Its animated water and flowers, as Kanto's: <Map>-anim.png.)
    anim
  };
  console.log(m.name, r.width + "x" + r.height, "people", people.length, "signs", out[m.name].signs.length, "warps", out[m.name].warps.length);
});

// Each pair of outdoor maps side by side on the matrix, joined where they
// touch (FireRed's connections: the other map's offset along the edge, in tiles).
for (const a of MAPS) for (const b of MAPS) {
  const ra = rendered[a.name], rb = rendered[b.name];
  if (a === b || !ra.main || !rb.main) continue;
  const touch = (dx, dz) => ra.cells.some(([x, z]) => rb.cells.some(([u, v]) => u === x + dx && v === z + dz));
  const ox = (rb.origin.cellX - ra.origin.cellX) * 32, oz = (rb.origin.cellZ - ra.origin.cellZ) * 32;
  const dir = touch(1, 0) ? ["right", oz] : touch(-1, 0) ? ["left", oz] : touch(0, 1) ? ["down", ox] : touch(0, -1) ? ["up", ox] : null;
  if (dir) out[a.name].connections.push({ map: b.name, direction: dir[0], offset: dir[1] });
}
// (The mat: a patch over the gate's left wall, its floor with a red mat on it, as at its door.)
{
  const gate = readPng(path.join(mapsDir, GATE.name + ".png")), T = 16, img = new Uint8ClampedArray(T * 3 * T * 4);
  for (let y = 0; y < 3 * T; y++) for (let x = 0; x < T; x++) {
    const i = ((GATE.y - 1) * T + y) * gate.width + GATE.x * T + x;
    img.set(gate.rgba.slice(i * 4, i * 4 + 4), (y * T + x) * 4);
  }
  const px = (x, y, c) => img.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], (y * T + x) * 4);
  for (let y = T - 4; y < 2 * T + 4; y++) for (let x = 0; x < 12; x++) {
    const edge = y === T - 4 || y === 2 * T + 3 || x === 11, rim = y === T - 3 || y === 2 * T + 2 || x === 10 || x === 0;
    px(x, y, edge ? "#5a6a7a" : rim ? "#f0e8e0" : y === T - 2 || y === 2 * T + 1 || x === 9 || x === 1 ? "#c84838" : "#d85848");
  }
  writePng(path.join(mapsDir, GATE.name + "-patch-johto.png"), T, 3 * T, img);
}
// (And its guard, until you're Champion: ui/game.js hides him once you are.)
const guard = { id: 99, x: GATE.x + 1, y: GATE.y, movement: "face_right", rangeX: 1, rangeY: 1, script: "Route22_NorthEntrance_EventScript_JohtoGuard", flag: null,
  text: ["The Johto region lies to the west.", "I'm sorry, but only the Champion of\nthe Pokémon League may go on to Johto."],
  sprite: "policeman", width: 16, height: 32, frames: 9 };
// FireRed's gate: its way west, a mat at the left wall, to Route 26's door.
const r26 = out.Route26.warps.findIndex((w) => w.map === GATE.name);
out.Route26.warps.forEach((w) => { if (w.map === GATE.name) w.warp = "johto"; });
const gateJs = "(function () {\n" +
  "  const gate = window.WORLD_MAPS[" + JSON.stringify(GATE.name) + "];\n" +
  "  if (!gate || gate.warps.some((w) => w.map === \"Route26\")) return;\n" +
  "  gate.warps.push({ x: " + GATE.x + ", y: " + GATE.y + ", map: \"Route26\", warp: " + r26 + " });\n" +
  "  const at = (x, y) => y * gate.width + x;\n" +
  "  gate.behavior[at(" + GATE.x + ", " + GATE.y + ")] = 0x63;   // (a way out west)\n" +
  "  for (const y of [" + (GATE.y - 1) + ", " + (GATE.y + 1) + "]) gate.collision[at(" + GATE.x + ", y)] = 1;\n" +
  "  gate.patches = Object.assign({}, gate.patches, { johto: { x: " + GATE.x + ", y: " + (GATE.y - 1) + ", w: 1, h: 3, top: false, collision: [] } });\n" +
  "  gate.people.push(" + JSON.stringify(guard) + ");\n" +
  "  const w = gate.warps.length - 1;\n" +
  "  for (const m of " + JSON.stringify(MAPS.map((m) => m.name)) + ") for (const x of window.WORLD_MAPS[m].warps) if (x.warp === \"johto\") x.warp = w;\n" +
  "})();\n";
fs.writeFileSync(path.join(root, "data/johto-maps.js"),
  "// Auto-generated by tools/build-johto.js from pret/pokeheartgold. Do not edit by hand.\n" +
  "// Johto's maps, added to FireRed's (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n" + gateJs);
console.log("wrote " + MAPS.length + " Johto maps to data/johto-maps.js and assets/world/");
