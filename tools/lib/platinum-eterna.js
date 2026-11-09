// Chapter-two placements on the existing Essentials maps, plus two missing
// interiors. Platinum coordinates are retained for the Windworks actors.
"use strict";
const fs = require("fs"), path = require("path");
const { readPng } = require("./png");
const { canvas, C, text } = require("./orre-art");
module.exports = function ({ root, source, ctx, person, trainer, additions, provenance }) {
  const maps = {}, doors = [];
  const json = (file) => JSON.parse(fs.readFileSync(path.join(source, file), "utf8"));
  function room(name, title, w, h, music = "dp_eterna_city") {
    return maps[name] = { name, title, region: "sinnoh", type: "indoor", music, width: w, height: h, top: false,
      collision: Array(w * h).fill(1), behavior: Array(w * h).fill(0), elevation: Array(w * h).fill(3), encounter: Array(w * h).fill(0),
      people: [], signs: [], triggers: [], hidden: [], connections: [], warps: [], borderWidth: 2, borderHeight: 2 };
  }
  function floor(m, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) m.collision[j * m.width + i] = 0; }
  function link(m, x, y, outside, ox, oy) { m.warps.push({ x, y, map: outside, warp: 0 }); m.behavior[y * m.width + x] = 0x65; m.collision[y * m.width + x] = 0;
    doors.push({ outside, x: ox, y: oy, inside: m.name }); }
  const out = path.join(root, "assets/world/maps");
  function save(m, c) { c.save(path.join(out, m.name + ".png")); const border = canvas(32, 32); border.rect(0, 0, 32, 32, [39, 53, 47]); border.save(path.join(out, m.name + "-border.png")); }
  // A 2D adaptation of Platinum's clock: three wins move its hand to the
  // next Trainer's platform, then north to Gardenia. The hub always reaches
  // the exit, including after a defeat or a saved/reloaded clock state.
  const gym = room("EternaCity_Gym", "Eterna City · Gym", 23, 29, "mus_gym");
  gym.battleScene = "gym";
  for (const [x, y, w, h] of [[9, 12, 5, 7], [10, 18, 3, 10], [13, 21, 3, 3], [19, 16, 3, 3], [1, 6, 3, 3], [10, 2, 3, 3], [8, 25, 7, 3]]) floor(gym, x, y, w, h);
  link(gym, 11, 27, "EternaCity", 22, 51);
  const paths = [[], [], [], []];
  function line(stage, x, y, tx, ty) { for (;;) { paths[stage].push([x, y]); if (x === tx && y === ty) break; if (x !== tx) x += Math.sign(tx - x); else y += Math.sign(ty - y); } }
  line(0, 11, 16, 14, 16); line(0, 14, 16, 14, 22);
  line(1, 11, 16, 20, 16); line(1, 20, 16, 20, 17);
  line(2, 11, 16, 2, 16); line(2, 2, 16, 2, 7);
  line(3, 11, 16, 11, 3);
  const all = new Map(paths.flat().map(([x, y]) => [x + "," + y, [x, y]]));
  gym.patches = {};
  for (let stage = 0; stage < 4; stage++) {
    const open = new Set(paths[stage].map(([x, y]) => x + "," + y));
    const collision = [...all].map(([key, [x, y]]) => [x, y, !gym.collision[y * gym.width + x] || open.has(key) ? 0 : 1]);
    gym.patches["clock" + stage] = { x: 0, y: 0, w: 23, h: 29, top: false, collision };
    const c = canvas(23 * 16, 29 * 16); c.rect(0, 0, c.w, c.h, [32, 61, 47]);
    for (let y = 0; y < 29; y++) for (let x = 0; x < 23; x++) {
      const pass = !gym.collision[y * 23 + x] || open.has(x + "," + y);
      c.box(x * 16, y * 16, 16, 16, pass ? [214, 201, 139] : [47, 91, 55], pass ? [170, 157, 105] : [39, 75, 47]);
      if (!pass && (x + y) % 2 === 0) c.ellipse(x * 16 + 8, y * 16 + 8, 6, 5, [60, 109, 62]);
    }
    c.ellipse(184, 248, 37, 37, [145, 121, 64], 3); c.ellipse(184, 248, 5, 5, C.gold);
    for (const [x, y] of paths[stage]) c.rect(x * 16 + 6, y * 16 + 6, 4, 4, [122, 98, 49]);
    text(c, "ETERNA GYM", 161, 439, [48, 74, 45]);
    c.save(path.join(out, gym.name + "-patch-clock" + stage + ".png"));
    if (!stage) save(gym, c);
  }
  for (const [script, sprite, x, y] of [["gardenia", "gardenia", 11, 3], ["clock-0", "lass", 14, 22], ["clock-1", "pokemon_breeder_f", 20, 17], ["clock-2", "pokemon_breeder_f", 2, 7], ["eterna-guide", "gym_guide", 9, 25]]) person(gym.name, x, y, script, sprite);
  for (const id of ["TRAINER_LEADER_GARDENIA", "TRAINER_LASS_CAROLINE", "TRAINER_AROMA_LADY_JENNA", "TRAINER_AROMA_LADY_ANGELA", "TRAINER_COMMANDER_MARS_VALLEY_WINDWORKS", "TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_1", "TRAINER_GALACTIC_GRUNT_JUBILIFE_CITY_2", "TRAINER_GALACTIC_GRUNT_VALLEY_WINDWORKS_1", "TRAINER_GALACTIC_GRUNT_FLOAROMA_MEADOW_1", "TRAINER_GALACTIC_GRUNT_FLOAROMA_MEADOW_2", "TRAINER_CHERYL_ETERNA_FOREST"]) trainer(id);
  for (const starter of ["TURTWIG", "CHIMCHAR", "PIPLUP"]) trainer("TRAINER_DAWN_JUBILIFE_CITY_" + starter);
  const wind = room("ValleyWindworks_Building", "Valley Windworks", 25, 18, ctx.WORLD_MAPS.ValleyWindworks.music);
  floor(wind, 1, 2, 23, 14); floor(wind, 11, 15, 3, 2);
  for (const [x, y, w, h] of [[4, 5, 6, 5], [15, 10, 8, 3], [1, 2, 9, 2]]) for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) wind.collision[j * 25 + i] = 1;
  link(wind, 12, 16, "ValleyWindworks", 19, 13);
  const c = canvas(400, 288);
  for (let y = 0; y < 18; y++) for (let x = 0; x < 25; x++) c.box(x * 16, y * 16, 16, 16, wind.collision[y * 25 + x] ? [75, 93, 106] : [185, 195, 184], [112, 132, 130]);
  for (const [x, y, w, h] of [[4, 5, 6, 5], [15, 10, 8, 3], [1, 2, 9, 2]]) { c.box(x * 16, y * 16, w * 16, h * 16, [81, 104, 113], [37, 55, 64]); for (let i = 0; i < w; i++) { c.box((x + i) * 16 + 3, y * 16 + 3, 10, 10, [81, 168, 160]); c.rect((x + i) * 16 + 6, (y + h) * 16 - 9, 4, 4, C.gold); } }
  text(c, "VALLEY WINDWORKS", 167, 264, C.dark); save(wind, c);
  person(wind.name, 20, 7, "mars", "mars"); person(wind.name, 21, 3, "wind-father", "scientist_m");
  person(wind.name, 21, 5, "charon", "charon"); person(wind.name, 10, 8, "wind-daughter", "twin");
  person("ValleyWindworks", 19, 14, "wind-guard", "grunt_m");
  person("FloaromaMeadow", 13, 50, "meadow-grunts", "grunt_m"); person("FloaromaMeadow", 14, 50, "meadow-grunts-2", "grunt_m");
  person("FloaromaMeadow", 12, 49, "honey-man", "pokefan_m");
  person("Route205FloaromaSide", 14, 64, "wind-help", "twin");
  person("JubilifeCity", 47, 10, "jubilife-galactic", "grunt_m"); person("JubilifeCity", 48, 10, "jubilife-grunt-2", "grunt_m");
  person("JubilifeCity", 49, 10, "jubilife-rowan", "prof_rowan");
  person("EternaForest_2", 28, 81, "cheryl", "cheryl");
  person("EternaCity", 26, 34, "cynthia-cut", "cynthia");
  const doorPic = readPng(path.join(out, "ValleyWindworks.png")), locked = canvas(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = ((13 * 16 + y) * doorPic.width + 19 * 16 + x) * 4;
    locked.p(x, y, Array.from(doorPic.rgba.slice(i, i + 4)));
  }
  locked.save(path.join(out, "ValleyWindworks-patch-locked.png"));
  const routeDefs = {
    route_204_south: { map: "Route204", at: [[23, 53], [19, 42], [28, 48]] },
    route_204_north: { map: "Route204", at: [[20, 19], [21, 12], [23, 5], [24, 5]] },
    route_205_south: { map: "Route205FloaromaSide", at: [[16, 56], [21, 51], [20, 62], [17, 39], [13, 33], [17, 24], [15, 16], [17, 46]] },
    route_205_north: { map: "Route205EternaSide", at: [[16, 19], [12, 20], [21, 23]] },
    eterna_forest: { map: "EternaForest_2" }, valley_windworks_building: { map: wind.name }
  };
  // Snap only adapted exterior placements to nearby dry, unoccupied floor.
  // Record the actual imported source event for auditability.
  function nearest(map, x, y) {
    const m = maps[map] || ctx.WORLD_MAPS[map], occupied = new Set([...(m.people || []), ...(additions[map] || []), ...m.warps].map(p => p.x + "," + p.y));
    for (let radius = 0; radius < 15; radius++) for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
      const nx = x + dx, ny = y + dy, i = ny * m.width + nx;
      if (nx > 0 && ny > 1 && nx < m.width - 1 && ny < m.height - 1 && !m.collision[i] && !(m.behavior[i] >= 0x10 && m.behavior[i] <= 0x15) && !occupied.has(nx + "," + ny)) return [nx, ny];
    }
    throw new Error("No floor for " + map + " " + x + "," + y);
  }
  for (const [bank, def] of Object.entries(routeDefs)) {
    let i = 0;
    for (const e of json("res/field/maps/" + bank + "/events.json").object_events.filter(e => e.trainer)) {
      const tid = trainer(e.trainer.id), at = nearest(def.map, ...(def.at ? def.at[i++] : [e.x, e.z]));
      person(def.map, ...at, tid, e.graphics_id.replace("OBJ_EVENT_GFX_", "").toLowerCase(), {
        movement: "face_" + ({ DIR_NORTH: "up", DIR_SOUTH: "down", DIR_WEST: "left", DIR_EAST: "right" }[e.initial_dir] || "down"),
        trainer: { id: tid, sight: Math.min(3, e.trainer.sight_range), double: e.trainer.id === "TRAINER_TWINS_LIV_AND_LIZ" },
        platinumEvent: { bank, x: e.x, z: e.z, id: e.id }
      });
    }
  }
  // The same safety check applies to hand-placed story actors.
  for (const [map, people] of Object.entries(additions)) if (map in maps || ["JubilifeCity", "FloaromaMeadow", "Route205FloaromaSide", "ValleyWindworks", "EternaForest_2", "EternaCity"].includes(map)) {
    for (const p of people) {
      const m = maps[map] || ctx.WORLD_MAPS[map];
      if (m.collision[p.y * m.width + p.x]) [p.x, p.y] = nearest(map, p.x, p.y);
    }
  }
  for (const bank of ["jubilife_city", "floaroma_meadow", "valley_windworks_outside", "valley_windworks_building", "eterna_city_gym", "eterna_forest", "eterna_city", ...Object.keys(routeDefs)]) provenance[bank] = { events: "res/field/maps/" + bank + "/events.json", scripts: "res/field/maps/" + bank + "/scripts.s" };
  return { maps, doors };
};
