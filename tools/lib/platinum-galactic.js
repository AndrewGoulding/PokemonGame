// Eterna Galactic rescue and the road south. These are 2D room adaptations;
// source actor coordinates, trainer parties and paired stair IDs are retained.
"use strict";
const fs = require("fs"), path = require("path");
const { canvas, C, text } = require("./orre-art");
module.exports = function ({ root, source, ctx, person, trainer, additions, provenance }) {
  const maps = {}, doors = [], out = path.join(root, "assets/world/maps");
  const json = f => JSON.parse(fs.readFileSync(path.join(source, f), "utf8"));
  const names = Object.fromEntries([1, 2, 3, 4].map(n => ["team_galactic_eterna_building_" + n + "f", "EternaGalactic_" + n + "F"]));
  const sourceEvents = Object.fromEntries(Object.keys(names).map(bank => [bank, json("res/field/maps/" + bank + "/events.json")]));
  function room(name, title, w, h, kind) {
    const m = maps[name] = { name, title, region: "sinnoh", type: "indoor", music: kind === "galactic" ? "mus_rocket_hideout" : ctx.WORLD_MAPS.EternaCity.music,
      width: w, height: h, top: false, collision: [], behavior: Array(w * h).fill(0), elevation: Array(w * h).fill(3), encounter: Array(w * h).fill(0),
      people: [], signs: [], triggers: [], hidden: [], connections: [], warps: [], borderWidth: 2, borderHeight: 2 };
    const c = canvas(w * 16, h * 16);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const wall = x === 0 || x === w - 1 || y < 2 || y === h - 1;
      m.collision.push(wall ? 1 : 0);
      c.rect(x * 16, y * 16, 16, 16, wall ? [66, 79, 93] : kind === "galactic" ? [177, 189, 192] : [213, 199, 157]);
      if (!wall) { c.line(x * 16, y * 16, x * 16 + 15, y * 16, [149, 164, 169]); c.p(x * 16 + 15, y * 16 + 15, [122, 144, 149]); }
    }
    function machine(x, y, w, h) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m.collision[j * m.width + i] = 1;
      c.box(x * 16, y * 16, w * 16, h * 16, [83, 105, 119], [37, 53, 66]);
      for (let i = 0; i < w; i++) { c.box((x + i) * 16 + 2, y * 16 + 2, 12, 10, [65, 158, 158], [35, 64, 74]); c.rect((x + i) * 16 + 5, y * 16 + 5, 7, 1, [157, 215, 182]); for (let j = 0; j < 3; j++) c.rect((x + i) * 16 + 3, (y + h) * 16 - 10 + j * 3, 10, 1, [39, 60, 74]); }
    }
    return { m, c, machine };
  }
  function finish(m, c) { c.save(path.join(out, m.name + ".png")); const b = canvas(32, 32); b.rect(0, 0, 32, 32, [66, 79, 93]); b.save(path.join(out, m.name + "-border.png")); }
  const vis = fs.readFileSync(path.join(source, "res/field/scripts/visible_items.s"), "utf8");
  const itemKeys = Object.fromEntries(Object.keys(ctx.ITEMS).map(id => [id.replace(/[^a-z0-9]/g, ""), id]));
  itemKeys.xspecial = "x-sp-atk"; // renamed after Gen 4
  for (const [bank, name] of Object.entries(names)) {
    const n = +bank.match(/(\d)f$/)[1], { m, c, machine } = room(name, "Team Galactic Eterna Building · " + n + "F", 24, 18, "galactic");
    // Keep stairs and actors clear. Desks, terminals and dividing counters
    // make the floors distinct without pretending to decode the DS models.
    machine(2, 13, 6, 2); machine(16, 13, 6, 2);
    if (n === 1) { machine(2, 5, 7, 2); machine(16, 10, 5, 1); }
    if (n === 2) { machine(5, 4, 1, 8); machine(16, 5, 1, 7); }
    if (n === 3) { machine(3, 9, 5, 2); machine(14, 9, 7, 2); }
    if (n === 4) { machine(17, 8, 5, 3); machine(4, 9, 5, 2); }
    const events = sourceEvents[bank];
    for (const w of events.warp_events) {
      if (/ROTOMS_ROOM/.test(w.dest_header_id)) continue; // Secret Key event remains future work.
      if (w.dest_header_id === "MAP_HEADER_ETERNA_CITY") {
        m.warps.push({ x: w.x, y: w.z, map: "EternaCity", warp: 0 }); m.behavior[w.z * 24 + w.x] = 0x65;
        doors.push({ outside: "EternaCity", x: 10, y: 39, inside: name });
        m.collision[(w.z + 1) * 24 + w.x] = 1; // door mat exits toward the wall
      } else {
        const destBank = w.dest_header_id.replace("MAP_HEADER_", "").toLowerCase();
        const destIndex = sourceEvents[destBank].warp_events.findIndex(t => t.id === w.dest_warp_id);
        if (destIndex < 0) throw new Error("Missing Galactic stair: " + w.dest_warp_id);
        m.warps.push({ x: w.x, y: w.z, map: names[destBank], warp: destIndex });
        m.behavior[w.z * 24 + w.x] = 0x61;
        c.box(w.x * 16 - 3, w.z * 16 - 4, 22, 24, [63, 81, 98]);
        for (let j = 0; j < 5; j++) { c.rect(w.x * 16 - 1, w.z * 16 + j * 4 - 2, 18, 3, [194, 202, 191]); }
      }
      m.collision[w.z * 24 + w.x] = 0;
    }
    for (const e of events.object_events) {
      if (e.trainer) {
        const id = trainer(e.trainer.id);
        person(name, e.x, e.z, id, e.graphics_id.replace("OBJ_EVENT_GFX_", "").toLowerCase(), { trainer: { id, sight: Math.min(3, e.trainer.sight_range) },
          movement: "face_" + ({ DIR_EAST: "right", DIR_WEST: "left", DIR_NORTH: "up", DIR_SOUTH: "down" }[e.initial_dir] || "down"), platinumEvent: { bank, id: e.id, x: e.x, z: e.z } });
      }
      if ((e.script || "").startsWith("VisibleItems_")) {
        const block = vis.split(e.script + ":")[1];
        const token = block && block.match(/SetVar VAR_0x8008, ITEM_(\w+)/);
        const item = token && itemKeys[token[1].toLowerCase().replace(/_/g, "")];
        if (!item) throw new Error("Missing item for " + e.script);
        (additions[name] || (additions[name] = [])).push({ id: e.id, localId: e.id, x: e.x, y: e.z, script: e.script, item, flag: "PT_ITEM_" + e.script,
          sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true, movement: "face_down", rangeX: 0, rangeY: 0 });
      }
    }
    for (const p of additions[name] || []) if (m.collision[p.y * 24 + p.x]) throw new Error("Galactic actor on a machine: " + p.script);
    text(c, "GALACTIC " + n + "F", 154, 249, C.dark);
    finish(m, c);
    provenance[bank] = { events: "res/field/maps/" + bank + "/events.json", scripts: "res/field/maps/" + bank + "/scripts.s" };
  }
  trainer("TRAINER_COMMANDER_JUPITER_TEAM_GALACTIC_ETERNA_BUILDING");
  person("EternaGalactic_4F", 14, 6, "jupiter", "jupiter");
  person("EternaGalactic_4F", 13, 5, "galactic-clefairy", "clefairy");
  person("EternaGalactic_4F", 15, 5, "galactic-buneary", "buneary");
  person("EternaGalactic_4F", 14, 9, "rad-rickshaw-captive", "pokefan_m");
  person("EternaGalactic_1F", 14, 15, "galactic-looker", "looker");
  // Use the existing Cycle Shop map ID and door to preserve old saves.
  const { m: shop, c: shopArt, machine: counter } = room("EternaCity_2", "Eterna City · Cycle Shop", 20, 15, "shop");
  shop.warps = [{ x: 8, y: 13, map: "EternaCity", warp: 0 }]; shop.behavior[13 * 20 + 8] = 0x65;
  doors.push({ outside: "EternaCity", x: 23, y: 31, inside: shop.name, existing: 0 });
  counter(3, 3, 7, 2);
  person(shop.name, 7, 5, "rad-rickshaw", "pokefan_m"); person(shop.name, 12, 10, "cycle-customer", "youngster");
  person(shop.name, 2, 10, "cycle-clefairy", "clefairy");
  for (const [x, y] of [[3, 8], [3, 10], [14, 4], [14, 6], [14, 8]]) {
    for (const dx of [0, 22]) { shopArt.ellipse(x * 16 + dx, y * 16, 7, 7, [54, 62, 69], 2); }
    shopArt.line(x * 16, y * 16, x * 16 + 12, y * 16 - 13, [205, 64, 62], 2); shopArt.line(x * 16 + 12, y * 16 - 13, x * 16 + 22, y * 16, [205, 64, 62], 2); shopArt.line(x * 16, y * 16, x * 16 + 22, y * 16, [205, 64, 62], 2);
    for (let dx = 0; dx < 2; dx++) shop.collision[y * 20 + x + dx] = 1;
  }
  text(shopArt, "RAD RICKSHAW", 97, 27, C.cream); finish(shop, shopArt);
  // A real Cut tree guards the new entrance and uses the shared HM system.
  additions.EternaCity.push({ id: "pt-galactic-cut", localId: "PT_GALACTIC_CUT", x: 10, y: 39, script: "EventScript_CutTree", flag: "FLAG_TEMP_PT_GALACTIC_CUT",
    sprite: "cut_tree", width: 16, height: 16, frames: 4, inanimate: true, movement: "face_down", rangeX: 0, rangeY: 0 });
  person("CyclingRoadNorth_Gate", 5, 5, "cycle-gate", "gym_guide");
  person("CyclingRoadNorth_Gate", 12, 7, "sinnoh-exp-share", "scientist_m");
  // Source outdoor coordinates are world-matrix positions, so placements are
  // explicitly adapted to the local bridge and route, not modulo-converted.
  const routes = {
    route_206: { at: [[16, 20], [20, 30], [17, 39], [21, 47], [16, 55], [20, 88], [16, 68], [21, 80], [27, 48]], map: "CyclingRoad" },
    route_207: { at: [[37, 20], [38, 14], [44, 21], [49, 13], [33, 21], [58, 18]], map: "Route207" }
  };
  for (const [bank, def] of Object.entries(routes)) {
    let index = 0;
    for (const e of json("res/field/maps/" + bank + "/events.json").object_events.filter(e => e.trainer)) {
      const id = trainer(e.trainer.id), [x, y] = def.at[index++];
      // Theodore belongs below the bridge on Route 206, not on the cycle deck.
      const map = e.trainer.id === "TRAINER_HIKER_THEODORE" ? "Route206" : def.map, target = ctx.WORLD_MAPS[map];
      let at = null;
      for (let radius = 0; radius < 16 && !at; radius++) for (let dy = -radius; dy <= radius && !at; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
        const nx = x + dx, ny = y + dy, i = ny * target.width + nx;
        if (nx < 1 || ny < 2 || nx >= target.width - 1 || ny >= target.height - 1 || target.collision[i] || target.behavior[i] >= 0x10 && target.behavior[i] <= 0x15) continue;
        if ([...target.people, ...(additions[map] || []), ...target.warps].some(p => p.x === nx && p.y === ny)) continue;
        at = [nx, ny]; break;
      }
      if (!at) throw new Error("No route floor for " + id);
      person(map, ...at, id, e.graphics_id.replace("OBJ_EVENT_GFX_", "").toLowerCase(), { trainer: { id, sight: Math.min(3, e.trainer.sight_range) },
        movement: "face_" + ({ DIR_NORTH: "up", DIR_SOUTH: "down", DIR_WEST: "left", DIR_EAST: "right" }[e.initial_dir] || "down"), platinumEvent: { bank, x: e.x, z: e.z, id: e.id } });
    }
  }
  for (const bank of ["cycle_shop", "route_206", "route_207", "route_206_cycling_road_north_gate"]) provenance[bank] = { events: "res/field/maps/" + bank + "/events.json", scripts: "res/field/maps/" + bank + "/scripts.s" };
  return { maps, doors };
};
