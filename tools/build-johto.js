// Builds the first Johto maps from HeartGold and SoulSilver
// (a pret/pokeheartgold checkout): New Bark Town, Route 29 and Cherrygrove
// City, joined to each other and to nothing in Kanto yet.
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
const { writePng } = require("./lib/png");
const { renderMap } = require("./lib/hgss-map");
const N = require("./lib/nitro");

const ROOT = process.argv[2] || process.env.POKEHEARTGOLD;
if (!ROOT || !fs.existsSync(path.join(ROOT, "files/fielddata"))) {
  console.error("Usage: node tools/build-johto.js <path to pret/pokeheartgold>");
  process.exit(1);
}
const root = path.join(__dirname, "..");
global.window = global;
vm.runInThisContext(fs.readFileSync(path.join(root, "data/dex.js"), "utf8"));
vm.runInThisContext(fs.readFileSync(path.join(root, "data/items.js"), "utf8"));
const F = (p) => path.join(ROOT, "files", p);

// The maps, west to east on the matrix's row: Cherrygrove | Route 29 | New Bark.
// (Music: FireRed's nearest, until Johto's own is built.)
const MAPS = [
  { c: "MAP_CHERRYGROVE", name: "CherrygroveCity", title: "Cherrygrove City", type: "city", zone: "T21", music: "mus_pewter" },
  { c: "MAP_ROUTE_29", name: "Route29", title: "Route 29", type: "route", zone: "R29", music: "mus_route1" },
  { c: "MAP_NEW_BARK", name: "NewBarkTown", title: "New Bark Town", type: "town", zone: "T20", music: "mus_pallet" }
];
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

const out = {};
const mapsDir = path.join(root, "assets/world/maps");
MAPS.forEach((m, i) => {
  loadMessages(m.zone);
  const r = renderMap(ROOT, m.c, {});
  const W = r.width * 16, H = r.height * 16;
  writePng(path.join(mapsDir, m.name + ".png"), W, H, r.below);
  writePng(path.join(mapsDir, m.name + "-top.png"), W, H, r.top);
  // Outside the map: the forest of its top-left corner (2x2 tiles).
  const border = new Uint8ClampedArray(32 * 32 * 4);
  for (let y = 0; y < 32; y++) border.set(r.below.subarray(y * W * 4, y * W * 4 + 128), y * 128);
  writePng(path.join(mapsDir, m.name + "-border.png"), 32, 32, border);

  const collision = r.perm.map((v) => (v >> 15) & 1);
  const behavior = r.perm.map((v) => frBehavior(v & 0xff));
  const ev = r.events || { warps: [], signs: [], people: [], triggers: [] };
  // (Doors are solid, as FireRed's are: walking up into one goes in.)
  const left = MAPS[i - 1], right = MAPS[i + 1];
  const e = enc.find((x) => x.map === m.zone);
  const people = [];
  for (const p of ev.people) {
    // Only those always there (story people come with their scenes).
    if (p.flag !== "FLAG_NOTHING" || !p.script) continue;
    const look = personSprite(p.sprite);
    if (!look) continue;
    people.push(Object.assign({ id: people.length, x: p.x, y: p.y, movement: movement(p), rangeX: p.rangeX || 1, rangeY: p.rangeY || 1,
      script: String(p.script).replace(/^_EV_|\s*\+.*$/g, ""), flag: null, text: scriptText(m.zone, p.script) || ["…"] }, look));
  }
  out[m.name] = {
    name: m.name, title: m.title, width: r.width, height: r.height, type: m.type, music: m.music, region: "johto",
    cycling: true, showName: true, top: true, borderWidth: 2, borderHeight: 2,
    collision, elevation: collision.map(() => 0), behavior, encounter: behavior.map((b) => (b === 0x02 ? 1 : 0)),
    connections: [left && { map: left.name, direction: "left", offset: 0 }, right && { map: right.name, direction: "right", offset: 0 }].filter(Boolean),
    warps: ev.warps.map((w) => ({ x: w.x, y: w.y, map: byConst[w.map] || null, mapConst: byConst[w.map] ? undefined : w.map, warp: w.anchor })),
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
    fishing: e && e.fishing && e.fishing.old_rod.rate ? { rods: { "old-rod": table(e.fishing.old_rod), "good-rod": table(e.fishing.good_rod), "super-rod": table(e.fishing.super_rod) } } : undefined
  };
  console.log(m.name, r.width + "x" + r.height, "people", people.length, "signs", out[m.name].signs.length, "warps", out[m.name].warps.length);
});

fs.writeFileSync(path.join(root, "data/johto-maps.js"),
  "// Auto-generated by tools/build-johto.js from pret/pokeheartgold. Do not edit by hand.\n" +
  "// Johto's maps, added to FireRed's (data/world-maps.js).\n" +
  "Object.assign(window.WORLD_MAPS, " + JSON.stringify(out) + ");\n");
console.log("wrote " + MAPS.length + " Johto maps to data/johto-maps.js and assets/world/");
