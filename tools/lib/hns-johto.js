// Johto's maps drawn from Pokémon Heart & Soul's (github.com/PokemonHnS-Development/pokemonHnS, a GBA remake of
// Johto on the Emerald decomp), with HeartGold and SoulSilver's events and scripts moved onto them.
// tools/build-johto.js builds Johto from HGSS as before, then port() redraws each map HnS has
// (tools/data/hns-johto-maps.json says which) and moves its people, signs, hidden items, step triggers and
// warps there; ui/johto-coords.js carries the same fit into the game, for the scripts.
//
//   const HNS = require("./lib/hns-johto")(<pokemonHnS checkout>);
//   HNS.port(out, { mapsDir, writePng, log })   // out: the HGSS-built maps, by name; changed in place
"use strict";
const fs = require("fs");
const path = require("path");
const Coords = require("../../ui/johto-coords.js");

module.exports = function hnsJohto(H) {
  const P = (...p) => path.join(H, ...p);
  const E = require("./emerald-tiles")(H, { primaryTiles: 640, primaryMetatiles: 640, primaryPals: 7 });
  const layouts = Object.fromEntries(JSON.parse(fs.readFileSync(P("data/layouts/layouts.json"), "utf8")).layouts.filter((l) => l.id).map((l) => [l.id, l]));
  const maps = {};
  for (const d of fs.readdirSync(P("data/maps"))) {
    const f = P("data/maps", d, "map.json");
    if (!fs.existsSync(f)) continue;
    const m = JSON.parse(fs.readFileSync(f, "utf8"));
    if (layouts[m.layout]) maps[m.name] = m;
  }
  const byId = Object.fromEntries(Object.values(maps).map((m) => [m.id, m.name]));

  // ---------- Tilesets ----------
  // (Each one's folder, from the decomp's headers.h (its tiles' symbol) and graphics.h (that symbol's file).)
  const headers = fs.readFileSync(P("src/data/tilesets/headers.h"), "utf8"), gfx = fs.readFileSync(P("src/data/tilesets/graphics.h"), "utf8");
  function folder(sym) {
    const i = headers.indexOf("struct Tileset " + sym + " =");
    const m = i >= 0 && headers.slice(i, i + 400).match(/\.tiles = (\w+)/);
    const j = m ? gfx.indexOf(m[1] + "[]") : -1;
    const f = j >= 0 && gfx.slice(j, j + 200).match(/data\/tilesets\/(primary|secondary)\/([^/]+)\//);
    return f ? f[2] : E.tilesetFolder(sym);
  }
  // Heart & Soul's Johto tilesets' animations (src/tileset_anims.c TilesetAnim_JohtoGeneral): the water and the
  // sand's edge every 8 frames, the flowers and the waterfalls every 16, each a frame apart (ui/overworld.js h_*).
  const JOHTO_ANIMS = [
    { name: "h_sand", dir: "sandwatersedge", first: 416, count: 18, order: [0, 1, 2, 3, 4, 5, 6, 7] },
    { name: "h_flower", dir: "flower", first: 508, count: 4, order: [0, 1, 2, 3, 4] },
    { name: "h_waterfall", dir: "water_current_landwatersedge", first: 450, count: 12, from: 34, order: [0, 1, 2, 3, 4, 5, 6, 7] }
  ];
  const tsCache = {};
  function tileset(kind, sym) {
    if (tsCache[sym]) return tsCache[sym];
    const dir = folder(sym), animated = kind === "primary" && fs.existsSync(P("data/tilesets/primary", dir, "anim/sandwatersedge"));
    return (tsCache[sym] = E.loadTileset(kind, dir, animated ? JOHTO_ANIMS : []));
  }

  // Emerald's (and Heart & Soul's) metatile behaviours as this game's (FireRed's numbers, game/world.js's MB), as
  // tools/build-hoenn.js has them; and Heart & Soul's own: its holes you fall through (MB_FALL_WARP).
  function behavior(b) {
    switch (b) {
      case 0x02: case 0x03: return b;
      case 0x10: case 0x12: case 0x13: case 0x15: case 0x16: return b;
      case 0x11: return 0x11;
      case 0x14: case 0x18: case 0x1a: return 0x12;
      case 0x19: case 0x22: case 0x2a: return b;
      case 0x17: return 0x17;
      case 0x20: return 0x23;
      case 0x21: return 0x21;
      case 0x26: case 0x27: return b;
      case 0x38: case 0x39: case 0x3a: case 0x3b: return b;
      case 0x50: case 0x51: case 0x52: case 0x53: return b;
      case 0x60: case 0x61: case 0x62: case 0x63: case 0x64: case 0x65: case 0x69: case 0x6a: case 0x6b: return b;
      case 0x66: case 0x0f: case 0xa2: return 0x66;
      case 0x67: case 0x68: case 0x0e: case 0x29: return 0x67;
      case 0x6c: return 0x69;
      case 0x6d: case 0x6e: return 0x65;
      case 0x80: case 0x83: return b;
      case 0x85: return 0x84;
      case 0x86: return 0x85;
      default: return 0;
    }
  }
  const WILD = new Set([0x02, 0x03, 0x05, 0x06, 0x08, 0x0b, 0x0c, 0x21, 0x22, 0x24, 0x25, 0x2a]);
  const MB_HEADBUTT_TREE = 0xa1;
  let whirl = null;
  const whirlpoolPic = () => whirl || (whirl = require("./png").readPng(P("graphics/object_events/pics/misc/whirlpool.png")));

  function blocksOf(name) {
    const L = layouts[maps[name].layout], bin = fs.readFileSync(P(L.blockdata_filepath));
    return { L, w: L.width, h: L.height, blocks: Array.from({ length: L.width * L.height }, (_, i) => bin.readUInt16LE(i * 2)) };
  }

  // ---------- Rooms: the parts of a map with only black between them ----------
  const roomCache = {};
  function rooms(name) {
    if (roomCache[name]) return roomCache[name];
    const { L, w, h, blocks } = blocksOf(name);
    const r = E.render(blocks, w, h, tileset("primary", L.primary_tileset), tileset("secondary", L.secondary_tileset), true);
    const drawn = new Uint8Array(w * h);
    for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
      let lit = 0;
      for (let y = 0; y < 16; y += 2) for (let x = 0; x < 16; x += 2) {
        const o = ((ty * 16 + y) * w * 16 + tx * 16 + x) * 4;
        if (r.below[o] + r.below[o + 1] + r.below[o + 2] > 40) lit++;
      }
      drawn[ty * w + tx] = lit >= 6 ? 1 : 0;
    }
    const comp = new Int32Array(w * h).fill(-1), list = [];
    for (let i = 0; i < w * h; i++) {
      if (!drawn[i] || comp[i] >= 0) continue;
      const id = list.length, q = [i]; comp[i] = id;
      let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      while (q.length) {
        const k = q.pop(), x = k % w, y = (k / w) | 0; n++;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const u = x + dx, v = y + dy, j = v * w + u;
          if (u < 0 || v < 0 || u >= w || v >= h || !drawn[j] || comp[j] >= 0) continue;
          comp[j] = id; q.push(j);
        }
      }
      list.push({ n, rect: [Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(w, x1 + 2) - Math.max(0, x0 - 1), Math.min(h, y1 + 2) - Math.max(0, y0 - 1)] });
    }
    return (roomCache[name] = list.filter((q) => q.n >= 10));
  }
  const inRect = (r, x, y) => x >= r[0] && y >= r[1] && x < r[0] + r[2] && y < r[1] + r[3];
  const roomAt = (name, x, y) => rooms(name).find((q) => inRect(q.rect, x, y));

  // ---------- The table ----------
  // A symbolic part: the Ruins of Alph's chambers ("chamber:NE:puzzle", ":reward", ":words"): the room the Ruins'
  // door in that corner leads to, the room its way up leads to, and the word room that one opens on.
  function chamber(spec) {
    const [, corner, part] = spec.split(":");
    const out = maps.RuinsOfAlph_Outside, C = "RuinsOfAlph_PuzzleAndRewardChambers", L = layouts[out.layout];
    const doors = out.warp_events.filter((w) => byId[w.dest_map] === C);
    const cx = L.width / 2, cy = L.height / 2;
    const door = doors.find((w) => (corner[0] === "N" ? w.y < cy : w.y >= cy) && (corner[1] === "W" ? w.x < cx : w.x >= cx));
    const cw = maps[C].warp_events[+door.dest_warp_id], puzzle = roomAt(C, cw.x, cw.y);
    if (part === "puzzle") return { hns: C, rect: puzzle.rect };
    const up = maps[C].warp_events.find((w) => byId[w.dest_map] === C && inRect(puzzle.rect, w.x, w.y));
    const tw = maps[C].warp_events[+up.dest_warp_id], reward = roomAt(C, tw.x, tw.y);
    if (part === "reward") return { hns: C, rect: reward.rect };
    const words = maps[C].warp_events.find((w) => /WORDS_ROOM/.test(w.dest_map) && inRect(reward.rect, w.x, w.y));
    return { hns: byId[words.dest_map] };
  }
  // -> null (HGSS's own map), "drop" (gone), or { pieces: [{ hns, rect, at }], merge: [...] }.
  function entryFor(name, table) {
    let e = Object.prototype.hasOwnProperty.call(table, name) ? table[name] : maps[name] ? name : null;
    if (e === null) return null;
    if (typeof e === "string") e = /^chamber:/.test(e) ? chamber(e) : { hns: e };
    if (e.drop) return "drop";
    if (typeof e.rect === "string") e = Object.assign({}, e, chamber(e.rect));
    const pieces = (e.pieces || [{ hns: e.hns, rect: e.rect, at: [0, 0], stamps: e.stamps, open: e.open, scriptTiles: e.scriptTiles }]).map((p) => {
      if (!maps[p.hns]) throw new Error("no Heart & Soul map " + p.hns + " (for " + name + ")");
      const L = layouts[maps[p.hns].layout];
      return { hns: p.hns, rect: p.rect || [0, 0, L.width, L.height], at: p.at || [0, 0], stamps: (p.stamps || []).slice(), open: p.open || [], scriptTiles: !!p.scriptTiles };
    });
    // (A Pokémon Center on FireRed's Center tileset, as Heart & Soul's are: FireRed's stairs up put back on its
    // left wall, gTileset_PokemonCenter's metatiles as FireRed's PokemonCenter_1F has them, to this game's 2F.)
    const doors = (e.doors || []).slice();
    if (/_PokemonCenter_1F$/.test(name) && pieces.length === 1 && layouts[maps[pieces[0].hns].layout].secondary_tileset === "gTileset_Kanto_PokemonCenter") {
      pieces[0].stamps.push({ blocks: [[0, 5, 720], [1, 5, 721], [0, 6, 728 | 0x400], [1, 6, 729], [0, 7, 736], [1, 7, 737]] });
      doors.push({ x: 1, y: 6, to: "_PokemonCenter_2F$" });
    }
    return { pieces, merge: e.merge || [], door: e.door, doors, redirect: e.redirect, link: e.link, place: e.place, sceneMoves: e.sceneMoves };
  }

  // ---------- A map's geometry, from its pieces ----------
  function geometry(name, entry) {
    const W = Math.max(...entry.pieces.map((p) => p.at[0] + p.rect[2])), Ht = Math.max(...entry.pieces.map((p) => p.at[1] + p.rect[3]));
    const below = new Uint8ClampedArray(W * Ht * 256 * 4), above = new Uint8ClampedArray(W * Ht * 256 * 4);
    for (let i = 3; i < below.length; i += 4) below[i] = 255;   // (between pieces: black)
    const n = W * Ht, collision = new Array(n).fill(1), elevation = new Array(n).fill(0), beh = new Array(n).fill(0), encounter = new Array(n).fill(0);
    const raw = new Array(n).fill(-1), headbutt = [], cells = [], pics = [];
    const warps = [], objects = [], bgs = [], coords = [];
    let anyAbove = false, border = null, animNames = null;
    entry.pieces.forEach((p, pi) => {
      const { L, w, blocks } = blocksOf(p.hns), [rx, ry, rw, rh] = p.rect, [ax, ay] = p.at;
      // (Stamps: blocks of another of Heart & Soul's maps (of the same tilesets) copied in: New Bark's Pokémon Center, Cherrygrove's.)
      for (const st of p.stamps) {
        if (st.blocks) { for (const [x, y, b] of st.blocks) blocks[y * w + x] = b; continue; }
        const from = blocksOf(st.from);
        for (let y = 0; y < st.rect[3]; y++) for (let x = 0; x < st.rect[2]; x++) blocks[(st.at[1] + y) * w + st.at[0] + x] = from.blocks[(st.rect[1] + y) * from.w + st.rect[0] + x];
      }
      // (scriptTiles: every tile the map's scripts set (setmetatile), set now: Blackthorn's Gym's bridges over its
      // lava, all laid, as its scripts lay them one by one.)
      if (p.scriptTiles) {
        const f = P("data/maps", p.hns, "scripts.inc");
        for (const m of fs.readFileSync(f, "utf8").matchAll(/setmetatile\s+(\d+),\s*(\d+),\s*(0x[0-9A-Fa-f]+|\d+),\s*(TRUE|FALSE)/g))
          blocks[+m[2] * w + +m[1]] = (parseInt(m[3]) & 0x3ff) | (m[4] === "TRUE" ? 0xc00 : 0);
      }
      // (open: tiles made ones you can walk onto: Azalea's Gym's edges where its carts would carry you, walked.)
      for (const [x, y] of p.open) blocks[y * w + x] &= ~0xc00;
      const primary = tileset("primary", L.primary_tileset), secondary = tileset("secondary", L.secondary_tileset);
      const crop = [];
      for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) crop.push(blocks[(ry + y) * w + rx + x]);
      const r = E.render(crop, rw, rh, primary, secondary, false);
      anyAbove = anyAbove || r.anyAbove;
      for (let y = 0; y < rh * 16; y++) {
        below.set(r.below.subarray(y * rw * 64, (y + 1) * rw * 64), ((ay * 16 + y) * W * 16 + ax * 16) * 4);
        above.set(r.above.subarray(y * rw * 64, (y + 1) * rw * 64), ((ay * 16 + y) * W * 16 + ax * 16) * 4);
      }
      const an = E.animCells(crop, rw, rh, primary, secondary);
      if (an.cells.length) {
        animNames = animNames || primary.anims.map((a) => a.name);
        for (let i = 0; i < an.cells.length; i += 4) cells.push(an.cells[i] + ax * 2, an.cells[i + 1] + ay * 2, an.cells[i + 2] + pics.length, an.cells[i + 3]);
        for (const pic of an.pics) pics.push(pic);
      }
      crop.forEach((b, i) => {
        const x = ax + (i % rw), y = ay + Math.floor(i / rw), k = y * W + x, mt = E.metatile(primary, secondary, b & 0x3ff);
        collision[k] = (b >> 10) & 3 ? 1 : 0; elevation[k] = b >> 12; beh[k] = behavior(mt.behavior);
        encounter[k] = WILD.has(mt.behavior) ? 1 : 0; raw[k] = mt.behavior;
        if (mt.behavior === MB_HEADBUTT_TREE) headbutt.push([x, y]);
      });
      if (!border) {
        const bb = fs.readFileSync(P(L.border_filepath));
        border = E.render([0, 1, 2, 3].map((i) => bb.readUInt16LE(i * 2)), 2, 2, primary, secondary, true).below;
      }
      const m = maps[p.hns], here = (o) => inRect(p.rect, o.x, o.y), to = (o) => ({ x: ax + o.x - rx, y: ay + o.y - ry });
      (m.warp_events || []).forEach((wp, id) => { if (here(wp)) warps.push(Object.assign(to(wp), { hns: p.hns, id, destMap: byId[wp.dest_map] || wp.dest_map, destId: +wp.dest_warp_id, piece: pi })); });
      (m.object_events || []).forEach((o) => { if (here(o)) objects.push(Object.assign({}, o, to(o), { hns: p.hns })); });
      (m.bg_events || []).forEach((o) => { if (here(o)) bgs.push(Object.assign({}, o, to(o), { hns: p.hns })); });
      (m.coord_events || []).forEach((o) => { if (here(o)) coords.push(Object.assign({}, o, to(o), { hns: p.hns })); });
    });
    // Heart & Soul's warps: on plain ground, as Emerald's, only where you arrive or a mat you walk off; in something solid, a
    // door you walk up into (as FireRed's are: game/world.js WARP_DOOR); a door whose warp is on the solid tile
    // above it (as its lifts' are), its warp on the door.
    for (const wp of warps) {
      let k = wp.y * W + wp.x;
      // (On plain floor, a warp's where you arrive, or a mat you walk off of (game/world.js), as in Emerald: not stepped onto.)
      if (!collision[k]) continue;
      const below = k + W;
      if (wp.y + 1 < Ht && collision[below] && beh[below] === 0x69 && beh[k] !== 0x69 && !warps.some((v) => v !== wp && v.x === wp.x && v.y === wp.y + 1)) { wp.y += 1; k = below; }
      if (beh[k] === 0) beh[k] = 0x69;
    }
    // (Heart & Soul's rocky stairs, MB_ROCK_STAIRS, are steps you walk up and down: it has no rocky walls for Rock Climb.)
    // Whirlpools: Heart & Soul's are people (OBJ_EVENT_GFX_WHIRLPOOL); this game's are tiles (WHIRLPOOL), its
    // picture drawn on the water there, the first frame of Heart & Soul's.
    for (const o of objects) if (o.graphics_id === "OBJ_EVENT_GFX_WHIRLPOOL" && o.x >= 0 && o.y >= 0 && o.x < W && o.y < Ht) {
      beh[o.y * W + o.x] = 0xf0; collision[o.y * W + o.x] = 1;
      const pic = whirlpoolPic(), x0 = o.x * 16 - 8, y0 = o.y * 16 - 8;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const c = pic.px[y * pic.width + x];
        if (!c || x0 + x < 0 || y0 + y < 0 || x0 + x >= W * 16 || y0 + y >= Ht * 16) continue;
        const k = ((y0 + y) * W * 16 + x0 + x) * 4, rgb = pic.palette[c];
        below[k] = rgb[0]; below[k + 1] = rgb[1]; below[k + 2] = rgb[2]; below[k + 3] = 255;
      }
    }
    return { name, width: W, height: Ht, below, above, anyAbove, border, anim: cells.length ? { cells, anims: animNames } : undefined, pics,
      collision, elevation, behavior: beh, encounter, raw, headbutt, warps, objects, bgs, coords, pieces: entry.pieces };
  }

  const api = { maps, layouts, byId, tileset, behavior, rooms, entryFor, geometry, JOHTO_ANIMS, E };
  api.port = (out, opts) => require("./hns-johto-port")(api, out, opts);
  return api;
};
