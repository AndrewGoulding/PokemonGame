// The overworld: drawing maps and people, walking around, talking.
// Depends on: window.World, window.WORLD_MAPS, ui/screen.js
//
//   const event = await Overworld.explore(ctx);
//
// explore() runs until the game needs to take over, then resolves with:
//   { type: "menu" }                          the player opened the menu
//   { type: "wild", species, level }          a wild Pokémon jumped out of the grass
//   { type: "talk", person, map }             a person with a special script
//   { type: "sign", sign, map }               a sign with a special script
//   { type: "trigger", trigger, map }         stepped on a scripted tile
//   { type: "trainer", person, map, approach, facing }
//                                             a trainer saw you (approach: tiles
//                                             to walk to you; null if you talked)
//   { type: "hidden", hidden, map }           found a hidden item (A on its tile)
//   { type: "water", map }                    A facing water you could Surf on (ctx.canSurf)
//   { type: "waterfall", map }                A facing a waterfall, surfing
//   { type: "whirlpool", map }                A facing a whirlpool, surfing (Johto's)
//   { type: "rockclimb", map }                A facing a rocky wall, the way Rock Climb goes (Johto's)
//   { type: "select" }                        Select (the registered key item)
//   { type: "follower", map }                 A facing the Pokémon walking behind you (ctx.follower)
//   { type: "headbutt", map, x, y }           A facing a tree you could Headbutt (ctx.headbuttTree)
//   ctx.faced(map, x, y, surfing)'s event      A facing a tile the game has a use for (Johto's Safari Zone objects)
// Plain signs and people just show their text here.
// (A person's `frame`, if it has one, is the one picture of its sheet it shows: a
// berry tree at its stage, ui/berry-farm.js.)
//
// ctx: { player (the save: location, name), special(script) -> bool,
//        visible(person, mapName) -> bool, rivalName, onMap(mapName) (each time a map's people load: its music),
//        trainerWaiting(person) -> bool (not beaten yet),
//        hiddenItem(hidden) -> bool (not found yet), canRun() -> bool,
//        onWarp(from, to) when you go through a door, cave or stairs,
//        canSurf() -> bool, strength() -> bool (boulders can be pushed),
//        boulderFell(def) (pushed into a hole), boulderSwitch(map, x, y) (pushed onto a floor switch;
//        may return an event to finish with, once you're standing still), weather(map) (overrides the map's),
//        onAvatar(mode) when you get on or off the Bicycle or the water,
//        darkness(map) -> null or { radius, lights: [{ x, y, r }], rects: [[x, y, w, h]] } (tiles; a map
//        dark but for a circle round you, lights and lit rooms: Ecruteak's Gym),
//        drawMap(g, map, x, y) (more drawn on the map, under people: Violet's Gym's lift),
//        iceBlockStopped(def) (an ice block pushed along the ice has come to rest),
//        follower(map) -> the look of the Pokémon walking behind you, or null (ui/follower.js),
//        headbuttTree(map, x, y) -> bool (a tree there you could Headbutt),
//        faced(map, x, y, surfing) -> an event to finish with, or null (A facing a tile) }
//
// The player is walking, on the Bicycle or surfing (Overworld.setAvatar;
// kept in player.flags.avatar). The Bicycle goes faster and only where the
// map allows cycling; surfing goes over water, and onto land you hop off.
//
// Controls: arrows / WASD to move, Shift (or B / X) toggles running (on the
// Bicycle, holding it hops), Z / Space / Enter
// to talk or read, Esc / M (Start) to open the menu. The on-screen buttons
// (ui/gamepad.js) press the same keys.

(function () {
  "use strict";

  const TILE = 16, VIEW_W = 240, VIEW_H = 160;
  const PLAYER_X = 112, PLAYER_Y = 64;   // where the player stands on screen (top-left of its tile)
  const WALK_SPEED = 1, RUN_SPEED = 2;   // pixels per frame (60 frames a second)
  const SURF_SPEED = 2;   // (PLAYER_SPEED_FAST)
  const SPIN_SPEED = 2;   // (an arrow tile spins you along, MOVEMENT_ACTION_SPIN_*)
  const SLIP_SPEED = 2;   // (slipping on ice: PlayerWalkFast)
  const SPIN_FACINGS = ["down", "left", "up", "right"];
  // The Bicycle goes like Emerald's Mach Bike (sMachBikeSpeedCallbacks): it
  // picks up speed tile by tile going straight, walking pace, then running,
  // then a tile in 4 frames, and starts over when you stop or turn. (Here,
  // half as fast again: 1.5, 3 and 6 pixels a frame.)
  const BIKE_SPEEDS = [1.5, 3, 6];
  const TURN_FRAMES = 6;                 // tapping a direction turns without moving
  const FADE_FRAMES = 12;

  const canvas = document.getElementById("world");
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  const menu = document.getElementById("menu");
  const { escapeHtml } = window.Screen;

  // ---------- Images ----------

  const images = {};
  function image(src) {
    if (!images[src]) {
      const img = new Image();
      // Settles once, loaded or not, however many maps wait on it.
      img.loaded = new Promise((r) => { img.onload = img.onerror = r; });
      img.src = src;
      images[src] = img;
    }
    return images[src];
  }
  const ready = (img) => img.complete && img.naturalWidth > 0;
  // (A map made from another's pictures, the Battle Tower from the Trainer
  // Tower's lobby: WORLD_MAPS[..].image names whose to draw.)
  const mapImage = (name, part) => { const m = World.map(name); return image("assets/world/maps/" + ((m && m.image) || name) + (part ? "-" + part : "") + ".png"); };
  const spriteImage = (name) => image("assets/world/sprites/" + name + ".png");

  // FireRed's tile animations (TilesetAnim_General): a counter of frames
  // (60 a second) going round 640; the sand's water edge takes its next frame
  // every 8, the water every 16 (one frame later), the flowers every 16 (two
  // later). -> each anim's frame now.
  // Emerald's General tileset (its maps: tools/build-emerald-maps.js) has
  // five, each taking its next frame every 16, one frame apart
  // (TilesetAnim_General): flowers, water, sand's edge, waterfalls, land's edge.
  const TILE_ANIMS = { water: { every: 16, at: 1, frames: 8 }, sand: { every: 8, at: 0, frames: 8 }, flower: { every: 16, at: 2, frames: 5 },
    e_flower: { every: 16, at: 0, frames: 4 }, e_water: { every: 16, at: 1, frames: 8 }, e_sand: { every: 16, at: 2, frames: 8 },
    e_waterfall: { every: 16, at: 3, frames: 4 }, e_land: { every: 16, at: 4, frames: 4 },
    // (Pokémon Heart & Soul's Johto tilesets, TilesetAnim_JohtoGeneral: its water and the sand's edge every 8,
    // its flowers and waterfalls every 16: tools/lib/hns-johto.js.)
    h_sand: { every: 8, at: 0, frames: 8 }, h_flower: { every: 16, at: 2, frames: 5 }, h_waterfall: { every: 16, at: 3, frames: 8 },
    // (Emerald's towns' own, src/tileset_anims.c: tools/lib/emerald-tiles.js SECONDARY_ANIMS. Rustboro's windy water
    // and Ever Grande's flowers in eight slots a frame apart, each that many frames behind (shift); Sootopolis Gym's
    // round is 240 frames, not 640 (wrap).)
    e_rustboro_fountain: { every: 8, at: 0, frames: 2 }, e_dewford_flag: { every: 8, at: 0, frames: 4 }, e_slateport_balloons: { every: 16, at: 0, frames: 4 },
    e_lavaridge_steam0: { every: 16, at: 0, frames: 4 }, e_lavaridge_steam1: { every: 16, at: 0, frames: 4, shift: -2 }, e_lavaridge_lava: { every: 16, at: 1, frames: 8 },
    e_pacifidlog_logs: { every: 16, at: 0, frames: 4 }, e_pacifidlog_currents: { every: 16, at: 1, frames: 8 }, e_sootopolis_water: { every: 16, at: 0, frames: 8 },
    e_frontier_flag: { every: 8, at: 0, frames: 4 }, e_seaweed: { every: 16, at: 0, frames: 4 }, e_cave_lava: { every: 16, at: 1, frames: 8 },
    e_soot_gym_side: { every: 8, at: 0, frames: 3, wrap: 240 }, e_soot_gym_front: { every: 8, at: 0, frames: 3, wrap: 240 } };
  for (let k = 0; k < 8; k++) {
    TILE_ANIMS["e_rustboro_water" + k] = { every: 8, at: k, frames: 8, shift: k };
    TILE_ANIMS["e_evergrande_flowers" + k] = { every: 8, at: k, frames: 8, shift: k };
  }
  function animFrame(name) {
    const a = TILE_ANIMS[name];
    if (!a) return 0;
    const wrap = a.wrap || 640, c = Math.floor(performance.now() / (1000 / 60)) % wrap;
    return ((Math.floor(((c - a.at + wrap) % wrap) / a.every) - (a.shift || 0)) % a.frames + a.frames) % a.frames;
  }
  // A map's animated 8x8 cells (tools/build-maps.js animCells) over its picture
  // at (x0, y0) on screen, in their current frames.
  // (Or a patch's: its anim and picture.)
  function drawAnimCells(name, x0, y0, anim, sheet) {
    const m = World.map(name);
    anim = anim || (m && m.anim);
    sheet = sheet || (anim && mapImage(name, "anim"));
    if (!anim || !sheet || !ready(sheet)) return;
    const frames = anim.anims.map(animFrame), counts = anim.anims.map((n) => (TILE_ANIMS[n] || { frames: 1 }).frames);
    const cells = anim.cells;
    for (let i = 0; i < cells.length; i += 4) {
      const x = x0 + cells[i] * 8, y = y0 + cells[i + 1] * 8;
      if (x <= -8 || y <= -8 || x >= VIEW_W || y >= VIEW_H) continue;
      let pic = cells[i + 2], stride = 1;
      for (let a = 0; a < frames.length; a++) if (cells[i + 3] >> a & 1) { pic += frames[a] * stride; stride *= counts[a]; }
      g.drawImage(sheet, (pic % 64) * 8, Math.floor(pic / 64) * 8, 8, 8, x, y, 8, 8);
    }
  }

  // Metatiles the game has swapped in on a map (tools/build-maps.js
  // MAP_PATCHES; ctx.patches(map) names those on), over its picture at (x0, y0).
  function drawPatches(name, x0, y0, part) {
    const m = World.map(name), on = m && m.patches && ctx.patches ? ctx.patches(name) : [];
    for (const p of on) {
      const pt = m.patches[p];
      if (!pt || (part && !pt.top)) continue;
      const img = mapImage(name, "patch-" + p + part);
      if (ready(img)) g.drawImage(img, x0 + pt.x * TILE, y0 + pt.y * TILE);
      if (!part && pt.anim) drawAnimCells(name, x0 + pt.x * TILE, y0 + pt.y * TILE, pt.anim, mapImage(name, "patch-" + p + "-anim"));
    }
  }

  // Metatiles a script has put in (Emerald's setmetatile: ctx.metatiles(map) -> [[x, y, n]]), from the map's
  // sheet of them (-mt: below the people, -mt-top: above), 16 to a row.
  function drawMetatiles(name, x0, y0, top) {
    const list = ctx && ctx.metatiles ? ctx.metatiles(name) : null;
    if (list && list.length) {
      const img = mapImage(name, top ? "mt-top" : "mt");
      if (ready(img)) for (const [x, y, n] of list) g.drawImage(img, (n % 16) * 16, Math.floor(n / 16) * 16, 16, 16, x0 + x * TILE, y0 + y * TILE, 16, 16);
    }
    // (Decorations put out in a secret base: the base's kind's tiles, a sheet each: ctx.decor(map) -> [[x, y, n]].)
    const m = World.map(name), deco = ctx && ctx.decor && m && m.decorSheet ? ctx.decor(name) : null;
    if (deco && deco.length) {
      const img = mapImage("_decor_" + m.decorSheet, top ? "mt-top" : "mt");
      if (ready(img)) for (const [x, y, n] of deco) g.drawImage(img, (n % 16) * 16, Math.floor(n / 16) * 16, 16, 16, x0 + x * TILE, y0 + y * TILE, 16, 16);
    }
  }

  function preloadMap(name) {
    const m = World.map(name);
    const list = [mapImage(name), mapImage(name, "border")];
    if (m.top) list.push(mapImage(name, "top"));
    if (m.anim) list.push(mapImage(name, "anim"));
    if (m.mt) list.push(mapImage(name, "mt"), mapImage(name, "mt-top"));
    if (m.decorSheet) list.push(mapImage("_decor_" + m.decorSheet, "mt"), mapImage("_decor_" + m.decorSheet, "mt-top"));
    for (const p of Object.keys(m.patches || {})) list.push(mapImage(name, "patch-" + p), ...(m.patches[p].anim ? [mapImage(name, "patch-" + p + "-anim")] : []));
    for (const c of m.connections) if (c.map && World.map(c.map)) list.push(mapImage(c.map), ...(World.map(c.map).top ? [mapImage(c.map, "top")] : []));
    for (const p of m.people) { list.push(spriteImage(p.sprite)); if (p.alt) list.push(spriteImage(p.alt.sprite)); }
    return Promise.all(list.map((img) => img.loaded));
  }

  // ---------- State ----------

  let ctx = null;
  let resolveExplore = null;
  let paused = true;
  let running = false;

  // The player: tile position, facing, and the step in progress.
  const me = { map: null, x: 0, y: 0, facing: "down", move: null, turnTimer: 0, parity: 0, avatar: "walk" };
  let people = [];          // people on the current map: { def, x, y, facing, move, timer }
  let fade = 0, fadeDir = 0, afterFade = null;
  let bumpMessageAt = 0;

  // ---------- Input ----------

  const held = new Set();
  let runOn = false;
  // FireRed's encounter state from step to step (World.stepEncounter).
  const wildState = { steps: 0, buff: 0, prev: null };
  let pressedA = false, pressedMenu = false, pressedSelect = false;
  let ignoreInputUntil = 0;

  const KEY_DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };

  document.addEventListener("keydown", (e) => {
    if (!running || paused) return;
    if (KEY_DIRS[e.key]) { held.add(KEY_DIRS[e.key]); e.preventDefault(); }
    if (performance.now() < ignoreInputUntil || e.repeat) return;
    if (["z", "Z", " ", "Enter"].includes(e.key)) { pressedA = true; e.preventDefault(); }
    if (["Escape", "m", "M", "Start"].includes(e.key)) { pressedMenu = true; e.preventDefault(); }
    if (e.key === "Select") { pressedSelect = true; e.preventDefault(); }
  });
  document.addEventListener("keyup", (e) => { if (KEY_DIRS[e.key]) held.delete(KEY_DIRS[e.key]); });
  window.addEventListener("blur", () => held.clear());

  // Running is a toggle: B (X or Shift on a keyboard) turns it on, and again
  // turns it off.
  const runHeld = () => runOn;
  function toggleRun() { runOn = !runOn; }
  // (B held down, as it is: on Cycling Road's slope it keeps you in place.)
  const B_KEYS = ["Shift", "x", "X", "b", "B"];
  let bDown = false;
  document.addEventListener("keydown", (e) => {
    if (B_KEYS.includes(e.key)) bDown = true;
    if (!running || paused || e.repeat || !B_KEYS.includes(e.key)) return;
    // (On the Bicycle, B is for hopping instead.)
    if (me.avatar !== "bike") toggleRun();
    e.preventDefault();
  });
  document.addEventListener("keyup", (e) => { if (B_KEYS.includes(e.key)) bDown = false; });
  window.addEventListener("blur", () => { bDown = false; });

  function heldDir() {
    const order = ["up", "down", "left", "right"];
    return order.find((d) => held.has(d)) || null;
  }

  // The menu area is empty while you walk: the buttons under it are the controls.
  function showControls() { menu.innerHTML = ""; }

  // Walking about, the text box is off the screen (FireRed's is only up
  // while someone's talking).
  function hint() {
    window.Screen.say("");
  }


  // ---------- People ----------

  function loadPeople() {
    // (Arriving on a map, or back from an event: the game picks the music.)
    if (ctx && ctx.onMap) ctx.onMap(me.map);
    const m = World.map(me.map);
    // ctx.visible says whether someone is there, or returns changes to where
    // they stand and how they look (the old man lying in Viridian's road).
    // (ctx.extraPeople: people the game's scenes put on the map, e.g. Leaf
    // waiting outside a Gym.)
    people = m.people.concat(ctx.extraPeople ? ctx.extraPeople(me.map) : []).map((p) => {
      const v = ctx.visible ? ctx.visible(p, me.map) : true;
      return v && (v === true ? p : Object.assign({}, p, v));
    }).filter(Boolean).map((def) => ({
      def, x: def.x, y: def.y, ox: def.x, oy: def.y, move: null,
      facing: (/^face_(up|down|left|right)/.exec(def.movement || "") || [, "down"])[1],
      timer: 60 + Math.floor(Math.random() * 120)
    }));
    // The people on the maps joined to this one, standing where they are (a
    // cut tree at the edge of the next route is there before you cross):
    // { map, def, x, y, ox, oy } with (ox, oy) that map's origin in this one's tiles.
    neighbours = [];
    for (const c of m.connections) {
      if (!c.map || !World.map(c.map)) continue;
      const [ox, oy] = World.connectionOrigin(m, c);
      for (const p of World.map(c.map).people) {
        const v = ctx.visible ? ctx.visible(p, c.map) : true;
        if (!v) continue;
        const def = v === true ? p : Object.assign({}, p, v);
        neighbours.push({ map: c.map, def, x: def.x, y: def.y, ox, oy,
          facing: (/^face_(up|down|left|right)/.exec(def.movement || "") || [, "down"])[1] });
      }
    }
  }
  let neighbours = [];
  let pendingEvent = null;   // (a scene something set off, to start once you're standing still)

  // (The old man lying across Viridian's road and the legendary birds are
  // as wide as two tiles, centred on theirs: they're in the way of the tiles
  // either side too, so you can't walk onto them. Snorlax's picture hardly
  // spills over its tile, so you walk right up to it.)
  const WIDE_BLOCKERS = new Set(["old_man_lying_down", "articuno", "zapdos", "moltres"]);
  // (Emerald's moving trucks, three tiles wide and three high, stand on their bottom row's middle tile: they're in the
  // way of all nine.)
  const TRUCKS = new Set(["em_misc_truck"]);
  const personAt = (x, y) => people.find((p) => (p.x === x && p.y === y) || (p.move && p.move.tx === x && p.move.ty === y) ||
    (!p.move && p.y === y && Math.abs(p.x - x) === 1 && WIDE_BLOCKERS.has(p.def.sprite)) ||
    (!p.move && TRUCKS.has(p.def.sprite) && Math.abs(p.x - x) <= 1 && y <= p.y && y >= p.y - 2));
  // A sprite wider than a tile is centred on its tile, as FireRed's are.
  const spriteDx = (def) => (def.offsetX != null ? def.offsetX : def.width > 16 ? (16 - def.width) / 2 : 0);
  const occupiedForPlayer = (mapName, x, y) => (mapName === me.map ? !!personAt(x, y)
    : neighbours.some((n) => n.map === mapName && n.x === x && n.y === y));

  const WANDER_DIRS = {
    wander_around: ["up", "down", "left", "right"], wander_up_and_down: ["up", "down"],
    wander_left_and_right: ["left", "right"]
  };

  // ---------- Trainers ----------
  //
  // As in FireRed: a trainer you haven't beaten sees you when you're straight
  // ahead of them, within their sight range, with nothing in between. (Emerald's
  // trainers who see all round, and those buried in sand (trainer.all), look
  // every way.)

  function trainerSees(p) {
    const t = p.def.trainer;
    if (!t || !t.sight || p.move || p.hidden || !ctx.trainerWaiting || !ctx.trainerWaiting(p.def)) return null;
    const blocked = (mapName, x, y) => mapName === me.map && !!personAt(x, y);
    for (const facing of t.all ? ["down", "up", "left", "right"] : [p.facing]) {
      const [dx, dy] = World.DIRS[facing];
      for (let d = 1; d <= t.sight; d++) {
        const x = p.x + dx * d, y = p.y + dy * d;
        if (x === me.x && y === me.y) return { type: "trainer", person: p.def, map: me.map, approach: d - 1, facing };
        const r = World.step({ map: me.map, x: x - dx, y: y - dy }, facing, blocked);
        if (!r.ok || r.jump || r.map !== me.map) break;
      }
    }
    return null;
  }
  // (Emerald's buried trainers: out of sight under the sand until they've seen you (unbury); once beaten, they
  // stand there, as Emerald's do.)
  const buried = (p) => !!(p.def.trainer && p.def.trainer.buried && !p.unburied && ctx.trainerWaiting && ctx.trainerWaiting(p.def));
  // (Two at once, from different sides, as Emerald's: the second as `second`, and the game has them both walk up
  // for a double battle against the two of them.)
  function anyTrainerSees() {
    let first = null;
    for (const p of people) {
      const seen = trainerSees(p);
      if (!seen) continue;
      if (!first) first = seen;
      else if (!first.second && seen.facing !== first.facing) first.second = seen;
    }
    return first;
  }

  function updatePerson(p) {
    if (p.move) {
      p.move.t += p.move.speed || WALK_SPEED;
      if (p.move.t >= TILE) {
        p.x = p.move.tx; p.y = p.move.ty; p.move = null;
        // A boulder pushed into a hole drops through to the floor below.
        if (isBoulder(p) && World.blockAt(me.map, p.x, p.y).behavior === World.MB.FALL_WARP) {
          if (window.GameAudio) window.GameAudio.se("se_fall");
          people = people.filter((q) => q !== p);
          if (ctx.boulderFell) ctx.boulderFell(p.def);
          return;
        }
        // An ice block slides on along the ice till something stops it.
        if (p.slide && slideIceBlock(p)) return;
        // One pushed onto a floor switch presses it (HandleBoulderActivateVictoryRoadSwitch).
        // (It can start a scene: the Tanoby Key's switches. That waits till you're still.)
        if (isBoulder(p) && World.blockAt(me.map, p.x, p.y).behavior === World.MB.STRENGTH_BUTTON && ctx.boulderSwitch) {
          const ev = ctx.boulderSwitch(me.map, p.x, p.y);
          if (ev && typeof ev === "object") pendingEvent = ev;
        }
        // A trainer on the move can walk into seeing you.
        if (!scene && !paused && resolveExplore && !me.move) {
          const seen = trainerSees(p);
          if (seen) finish(seen);
        }
      }
      return;
    }
    // Nobody wanders or looks around while you're talking or a scene plays
    // (FireRed's lock), so whoever you talk to keeps facing you.
    if (scene || paused || --p.timer > 0) return;
    // Trees, rocks and item balls never turn (FireRed's inanimate objects;
    // turning would show a cut tree's other frames).
    if (p.def.inanimate) return;
    p.timer = 90 + Math.floor(Math.random() * 150);
    // Standing and turning: all four ways, or two (face_down_and_up, ...).
    const turns = p.def.movement === "look_around" ? ["up", "down", "left", "right"]
      : (/^face_(up|down|left|right)_and_(up|down|left|right)$/.exec(p.def.movement || "") || []).slice(1);
    if (turns.length) {
      p.facing = turns[Math.floor(Math.random() * turns.length)];
      // A trainer turning your way sees you.
      if (!paused && resolveExplore && !me.move) {
        const seen = trainerSees(p);
        if (seen) finish(seen);
      }
      return;
    }
    // FireRed's walk sequences (walk_sequence_left_down_right_up): walk one
    // way until the edge of the range, then turn to the next direction; back at
    // the start after the last one, begin again. With a range of 5 x 3 that's a
    // loop 5 tiles across and 3 down.
    const seq = /^walk_sequence_((?:up|down|left|right)(?:_(?:up|down|left|right))*)$/.exec(p.def.movement || "");
    // (And back and forth, walk_left_and_right and the like: FireRed's
    // MovementType_WalkBackAndForth, walking on without stopping, the first
    // way to the edge of the range, then back to the other edge, and round.)
    const bf = !seq && /^walk_(up|down|left|right)_and_(up|down|left|right)$/.exec(p.def.movement || "");
    if (bf) { walkBackAndForth(p, bf[1]); return; }
    const dirs = seq ? null : WANDER_DIRS[p.def.movement];
    if (!dirs && !seq) return;
    const order = seq && seq[1].split("_");
    if (seq && (p.seq || 0) % order.length === order.length - 1 && p.x === p.ox && p.y === p.oy) p.seq = 0;
    // A leg heading back the way an earlier one went stops level with the
    // start (FireRed's per-sequence rule): left, down, then right only back to
    // the starting column, and up to the start.
    if (seq) {
      const i = (p.seq || 0) % order.length, d = order[i];
      const back = order.slice(0, i).includes(World.OPPOSITE[d]);
      if (i < order.length - 1 && back && ((d === "left" || d === "right") ? p.x === p.ox : p.y === p.oy)) p.seq = (p.seq || 0) + 1;
    }
    const dir = seq ? order[(p.seq || 0) % order.length] : dirs[Math.floor(Math.random() * dirs.length)];
    if (seq) p.timer = 1;   // (a walk sequence walks on without stopping)
    p.facing = dir;
    const [dx, dy] = World.DIRS[dir];
    const tx = p.x + dx, ty = p.y + dy;
    // (Only the edge of the range turns a walk sequence; anything else in the
    // way, they wait.)
    if (Math.abs(tx - p.ox) > (p.def.rangeX || 1) || Math.abs(ty - p.oy) > (p.def.rangeY || 1)) { if (seq) p.seq = (p.seq || 0) + 1; return; }
    if ((tx === me.x && ty === me.y) || (me.move && me.move.tx === tx && me.move.ty === ty) || personAt(tx, ty) || followerAt(tx, ty)) return;
    const r = World.step({ map: me.map, x: p.x, y: p.y }, dir);
    if (!r.ok || r.map !== me.map || r.jump || r.warp || World.warpAt(me.map, tx, ty)) return;
    p.move = { tx, ty, t: 0 };
  }

  function walkBackAndForth(p, first) {
    p.timer = 1;
    const dir = p.bf || first;
    const [dx, dy] = World.DIRS[dir];
    const tx = p.x + dx, ty = p.y + dy;
    const out = Math.abs(tx - p.ox) > (p.def.rangeX || 1) || Math.abs(ty - p.oy) > (p.def.rangeY || 1);
    const r = out ? null : World.step({ map: me.map, x: p.x, y: p.y }, dir);
    // (The edge of the range, or a wall: turn round. You or someone in the way: wait.)
    if (out || !r.ok || r.map !== me.map || r.jump || r.warp || World.warpAt(me.map, tx, ty)) { p.bf = World.OPPOSITE[dir]; p.facing = p.bf; return; }
    p.facing = dir;
    if ((tx === me.x && ty === me.y) || (me.move && me.move.tx === tx && me.move.ty === ty) || personAt(tx, ty) || followerAt(tx, ty)) { p.timer = 16; return; }
    p.bf = dir;
    p.move = { tx, ty, t: 0 };
  }

  // ---------- Player movement ----------

  function startStep(r, dir, spin, speedOverride) {
    // (ctx.canRun can restrict running, e.g. to after FireRed's Running Shoes.)
    const run = !spin && !speedOverride && !r.jump && me.avatar === "walk" && runHeld() && (!ctx.canRun || ctx.canRun());
    if (me.avatar === "bike") { me.bikeRun = dir === me.bikeDir ? (me.bikeRun || 0) + 1 : 0; me.bikeDir = dir; }
    const speed = me.avatar === "bike" ? BIKE_SPEEDS[Math.min(me.bikeRun, BIKE_SPEEDS.length - 1)]
      : me.avatar === "surf" || me.avatar === "dive" ? SURF_SPEED : run ? RUN_SPEED : WALK_SPEED;
    // (Speeds that don't divide a tile: what's left over goes into the next step.)
    const carry = me.carry || 0;
    me.carry = 0;
    me.move = { tx: r.x, ty: r.y, tmap: r.map, dir, t: carry, jump: !!r.jump, warp: r.warp || null, run, spin: !!spin,
      dismount: !!r.dismount, dist: r.jump ? TILE * 2 : TILE, speed: speedOverride || (spin ? SPIN_SPEED : r.dismount ? WALK_SPEED * 2 : speed) };
    me.parity ^= 1;
    followerStep();
  }

  // ---------- Walking, cycling, surfing ----------

  // ---------- Fishing ----------
  //
  // The rod (FireRed's fishing sheet, 32x32: frames 0-3 facing left, 4-7 up,
  // 8-11 down; right is left mirrored): taking it out and putting it away
  // (sAnim_TakeOutRod*, sAnim_PutAwayRod*), and the hooked Pokémon tugging at
  // it (sAnim_HookedPokemon*). [frame offset from the facing's first, frames].
  const ROD_ANIMS = {
    out: [[0, 4], [1, 4], [2, 4], [3, 4]],
    away: [[3, 4], [2, 6], [1, 6], [0, 6]],
    bite: [[2, 6], [3, 6], [2, 6], [3, 6], [3, 30]]
  };
  let rod = null;   // { anim, i, t, loop, resolve, hold }
  // Starts a rod animation ("out", "away", "bite"; null puts the walking
  // sprite back). Resolves when it's done ("bite" goes round until the next).
  function setRod(kind) {
    if (rod && rod.resolve) rod.resolve();
    if (!kind) { rod = null; return Promise.resolve(); }
    return new Promise((resolve) => { rod = { anim: ROD_ANIMS[kind], i: 0, t: 0, loop: kind === "bite", resolve }; });
  }
  function updateRod() {
    if (!rod || rod.hold) return;
    if (++rod.t < rod.anim[rod.i][1]) return;
    rod.t = 0;
    if (rod.i + 1 < rod.anim.length) { rod.i++; return; }
    if (rod.loop) { rod.i = 0; return; }
    rod.hold = true;   // (stays on its last frame)
    const done = rod.resolve;
    rod.resolve = null;
    if (done) done();
  }
  // The frame to draw, and where (AlignFishingAnimationFrames: the cast
  // frames sideways sit 8 pixels toward the rod, up 8 higher, down 8 lower).
  function rodFrame() {
    const off = rod.anim[rod.i][0];
    const base = { left: 0, right: 0, up: 4, down: 8 }[me.facing];
    const frame = base + off;
    let dx = -8, dy = 0;
    if (frame >= 1 && frame <= 3) dx += me.facing === "left" ? -8 : 8;
    if (frame === 5) dy = -8;
    if (frame === 10 || frame === 11) dy = 8;
    return { frame, dx, dy };
  }

  function setAvatar(mode) {
    if (me.avatar === mode) return;
    me.avatar = mode;
    me.hopping = false; me.hopHeld = 0; me.wheelie = null; me.lowering = 0;
    if (ctx && ctx.player) ctx.player.flags.avatar = mode === "walk" ? undefined : mode;
    if (ctx && ctx.onAvatar) ctx.onAvatar(mode);
  }
  // Off the Bicycle where cycling isn't allowed (going indoors), and off the
  // water when you aren't on any (a warp, a scene's teleport).
  function checkAvatar() {
    const m = World.map(me.map);
    if (me.avatar === "bike" && !(m && m.cycling)) setAvatar("walk");
    if (me.avatar === "surf" && !World.isSurfable(World.blockAt(me.map, me.x, me.y).behavior)) setAvatar("walk");
    if (me.avatar === "dive" && !(m && m.type === "underwater")) setAvatar("walk");
  }

  // ---------- Strength: pushing boulders ----------
  //
  // With Strength on, walking into a boulder pushes it a tile ahead if
  // there's room (not water, nobody there) (FireRed's TryPushBoulder).
  const isBoulder = (p) => p && p.def.script === "EventScript_StrengthBoulder";
  function tryPushBoulder(dir) {
    if (!ctx.strength || !ctx.strength()) return false;
    const [dx, dy] = World.DIRS[dir];
    const b = personAt(me.x + dx, me.y + dy);
    if (!isBoulder(b) || b.move) return false;
    const r = World.step({ map: me.map, x: b.x, y: b.y }, dir, (mapName, x, y) => mapName !== me.map || !!personAt(x, y) || (x === me.x && y === me.y));
    // (Into a hole is fine: it falls through, HandleBoulderFallThroughHole.)
    const hole = r.ok && World.blockAt(me.map, r.x, r.y).behavior === World.MB.FALL_WARP;
    if (!r.ok || r.jump || (r.warp && !hole) || r.map !== me.map) return false;
    b.move = { tx: r.x, ty: r.y, t: 0, speed: WALK_SPEED };
    b.facing = dir;
    if (window.GameAudio) window.GameAudio.se("se_m_strength");
    return true;
  }

  // ---------- Mahogany's Gym: ice blocks ----------
  //
  // Walking into an ice block (HGSS's SPRITE_ICE facing down) pushes it, no
  // Strength needed: it slides along the ice while there's ice ahead and
  // nothing in the way. Against a wall or the ice's edge it stops (and can be
  // pushed again); against someone it sets fast, and against another block
  // the two freeze together, both for good (facing up, as HGSS turns them:
  // src/unk_0206D494.c).
  const isIceBlock = (p) => p && p.def.iceBlock;
  function iceAhead(p, dir) {
    const [dx, dy] = World.DIRS[dir], x = p.x + dx, y = p.y + dy;
    const other = personAt(x, y);
    if (other || (x === me.x && y === me.y)) return { hit: other || me };
    const r = World.step({ map: me.map, x: p.x, y: p.y }, dir, null);
    return r.ok && !r.jump && !r.warp && r.map === me.map && World.blockAt(me.map, r.x, r.y).behavior === World.MB.ICE ? { to: r } : {};
  }
  function tryPushIceBlock(dir) {
    const [dx, dy] = World.DIRS[dir];
    const b = personAt(me.x + dx, me.y + dy);
    if (!isIceBlock(b) || b.move || b.facing === "up") return false;   // (facing up: set fast)
    const a = iceAhead(b, dir);
    if (!a.to) return false;
    b.move = { tx: a.to.x, ty: a.to.y, t: 0, speed: SLIP_SPEED };
    b.slide = dir;
    if (window.GameAudio) window.GameAudio.se("se_ice_crack");
    return true;
  }
  // (Its move done: on, or stopped. -> true while it's still going.)
  function slideIceBlock(p) {
    const a = iceAhead(p, p.slide);
    if (a.to) { p.move = { tx: a.to.x, ty: a.to.y, t: 0, speed: SLIP_SPEED }; return true; }
    if (a.hit && a.hit !== me) {
      p.facing = "up";
      if (isIceBlock(a.hit)) a.hit.facing = "up";
      if (window.GameAudio) window.GameAudio.se("se_bang");
    }
    p.slide = null;
    if (ctx.iceBlockStopped) ctx.iceBlockStopped(p.def);
    return false;
  }

  // ---------- Darkness and Flash ----------
  //
  // A cave that needs Flash is dark but for a circle around you (FireRed's
  // sFlashLevelToRadius: 24 pixels at its darkest); Flash opens it to 200.
  const DARK_RADIUS = 24, FLASH_RADIUS = 200;
  let light = null, lightTarget = null, flashOn = false;
  function checkLight() {
    const m = World.map(me.map);
    if (!(m && m.dark)) { light = lightTarget = null; flashOn = false; return; }
    light = lightTarget = flashOn ? FLASH_RADIUS : DARK_RADIUS;
  }
  function flash() {
    flashOn = true;
    if (light != null) lightTarget = FLASH_RADIUS;
  }
  // (Or the map's own darkness, ctx.darkness: a circle round you that fades at
  // its edge, and lights and lit rooms of its own, drawn on a canvas apart.)
  let darkCanvas = null;
  function drawMapDarkness(d, px, py, camX, camY) {
    if (!darkCanvas) { darkCanvas = document.createElement("canvas"); darkCanvas.width = VIEW_W; darkCanvas.height = VIEW_H; }
    const dg = darkCanvas.getContext("2d");
    dg.globalCompositeOperation = "source-over";
    dg.fillStyle = "#000";
    dg.fillRect(0, 0, VIEW_W, VIEW_H);
    dg.globalCompositeOperation = "destination-out";
    const hole = (x, y, r) => {
      const grad = dg.createRadialGradient(x, y, r * 0.55, x, y, r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      dg.fillStyle = grad;
      dg.fillRect(x - r, y - r, r * 2, r * 2);
    };
    hole(px + TILE / 2, py + TILE / 2, d.radius);
    for (const l of d.lights || []) hole(l.x * TILE + TILE / 2 - camX, l.y * TILE + TILE / 2 - camY, l.r);
    dg.fillStyle = "#000";
    for (const [x, y, w, h] of d.rects || []) dg.fillRect(x * TILE - camX, y * TILE - camY, w * TILE, h * TILE);
    g.drawImage(darkCanvas, 0, 0);
  }
  function drawDarkness(px, py, camX, camY) {
    const d = ctx.darkness && ctx.darkness(me.map);
    if (d) { drawMapDarkness(d, px, py, camX, camY); return; }
    if (light == null || light >= FLASH_RADIUS) return;
    g.save();
    g.fillStyle = "#000";
    g.beginPath();
    g.rect(0, 0, VIEW_W, VIEW_H);
    g.arc(px + TILE / 2, py + TILE / 2, light, 0, Math.PI * 2, true);
    g.fill("evenodd");
    g.restore();
  }

  function finishStep() {
    const mv = me.move;
    me.move = null;
    if (mv.inPlace) return finishHopInPlace();
    if (mv.dismount) setAvatar((ctx.landAvatar && ctx.landAvatar()) || "walk");
    const changedMap = mv.tmap !== me.map, from = me.map;
    leaveTracks(from, me.x, me.y, mv);
    me.map = mv.tmap; me.x = mv.tx; me.y = mv.ty;
    if (changedMap) {
      followerCrossed(from);
      checkAvatar(); checkLight();
      loadPeople(); preloadMap(me.map); hint();
      if (!mv.warp && areaOf(from) !== areaOf(me.map)) showAreaName(me.map);
    }
    savePosition();
    if (mv.warp) { me.spinDir = null; warpTo(mv.warp); return; }
    // Walking or surfing over the edge onto another map: its scenes that
    // start on arriving (FireRed's ON_FRAME scripts: Bill on Cinnabar Island).
    if (changedMap && ctx.special && ctx.special("arrive:" + me.map)) return finish({ type: "trigger", trigger: { script: "arrive:" + me.map }, map: me.map });
    // The Rocket Hideout's arrows (FireRed's TryUpdatePlayerSpinDirection): an
    // arrow spins you off its way, and you keep going until a stop tile or
    // something in the way (another arrow turns you).
    const b = World.blockAt(me.map, me.x, me.y).behavior, MB = World.MB;
    const arrow = { [MB.SPIN_RIGHT]: "right", [MB.SPIN_LEFT]: "left", [MB.SPIN_UP]: "up", [MB.SPIN_DOWN]: "down" }[b];
    if (arrow) { if (!me.spinDir && window.GameAudio) window.GameAudio.se("se_m_rock_throw"); me.spinDir = arrow; }
    else if (b === MB.STOP_SPINNING && me.spinDir) { me.facing = me.spinDir; me.spinDir = null; }
    if (me.spinDir) {
      const r = World.step({ map: me.map, x: me.x, y: me.y }, me.spinDir, occupiedForPlayer);
      if (r.ok && !r.jump) { startStep(r, me.spinDir, true); return; }
      me.facing = me.spinDir;
      me.spinDir = null;
    }
    // Icefall Cave's ice (FireRed's ForcedMovement_Slip, MB_ICE): you slip on
    // the way you were going, fast and without a stride (or over a ledge),
    // until something stops you; then you can walk again.
    if (b === MB.ICE && !mv.warp) {
      const r = World.step({ map: me.map, x: me.x, y: me.y }, mv.dir, occupiedForPlayer);
      if (r.ok && r.map === me.map) { me.facing = mv.dir; startStep(r, mv.dir, false, r.jump ? null : SLIP_SPEED); me.move.slip = !r.jump; return; }
    }
    const seen = anyTrainerSees();
    if (seen) return finish(seen);
    for (const t of World.triggersAt(me.map, me.x, me.y)) {
      if (ctx.special && ctx.special(t.script)) return finish({ type: "trigger", trigger: t, map: me.map });
    }
    // Each step (e.g. a Repel counting down) may have something to say.
    const said = ctx.onStep && ctx.onStep();
    if (said) return finish(said);
    const wild = World.stepEncounter(wildState, me.map, me.x, me.y, {
      allow: ctx.allowWild, adjust: ctx.adjustWild, repel: !!(ctx.player && ctx.player.repelSteps > 0), lure: !!(ctx.player && ctx.player.lureSteps > 0),
      surf: me.avatar === "surf", bike: me.avatar === "bike", scale: ctx.encounterScale ? ctx.encounterScale() : 1 });
    if (wild) finish(Object.assign({ type: "wild" }, wild));
  }

  // ---------- Hopping on the Bicycle ----------
  //
  // Emerald's Acro Bike wheelie and bunny hop (src/bike.c,
  // AcroBikeHandleInputWheelieStanding and AcroBikeHandleInputBunnyHop): on
  // the Bicycle, press B standing still and you pop a wheelie (rising for 4
  // frames, then up on the back wheel: the wheelie sheet, tools/build-wheelie.js);
  // while you hold it you can turn, or ride along on the back wheel at the
  // Bicycle's slowest pace. Hold it 40 frames standing still and you start
  // hopping on the back wheel, SE_BIKE_HOP and a low jump (sJumpY_Low) of 16
  // frames each: in place, turning if you press another way, or a tile along
  // (over a ledge too) if you press the way you face. Let go of B and the
  // front wheel comes down (4 frames). As in Emerald, a hop in place can find
  // a wild Pokémon in tall grass, but it isn't a step: a Repel and the
  // Safari Zone's steps don't count it, and the tile's scripts don't run again.
  const HOP_HOLD_FRAMES = 40, WHEELIE_RISE_FRAMES = 4;
  const JUMP_Y_LOW = [0, -2, -3, -4, -5, -6, -6, -6, -5, -5, -4, -3, -2, 0, 0, 0];
  function bikeHop(dir) {
    if (!bDown) {
      if (me.wheelie) { me.wheelie = null; me.hopping = false; me.hopHeld = 0; me.lowering = WHEELIE_RISE_FRAMES; }
      if (me.lowering > 0) { me.lowering--; return true; }
      return false;
    }
    if (!me.wheelie) {
      if (dir) return false;   // (B riding along does nothing)
      me.wheelie = { t: 0 }; me.hopHeld = 0; me.lowering = 0;
      me.bikeDir = null; me.bikeRun = 0; me.carry = 0;
      return true;
    }
    me.wheelie.t++;
    if (!me.hopping) {
      if (dir && dir !== me.facing) { me.facing = dir; return true; }
      if (dir) {
        // Along on the back wheel.
        me.hopHeld = 0;
        const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer);
        if (r.ok && !r.warp && !r.jump) { startStep(r, dir, false, BIKE_SPEEDS[0]); me.move.wheelie = true; }
        return true;
      }
      if (++me.hopHeld < HOP_HOLD_FRAMES) return true;
      me.hopping = true;
    }
    if (window.GameAudio) window.GameAudio.se("se_bike_hop");
    me.bikeDir = null; me.bikeRun = 0; me.carry = 0; me.turnTimer = 0;
    if (dir && dir === me.facing) {
      const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer);
      if (r.ok && !r.warp) {
        startStep(r, dir, false, r.jump ? WALK_SPEED * 2 : WALK_SPEED);
        me.move.bikeHop = !r.jump;
        return true;
      }
    }
    if (dir) me.facing = dir;
    me.move = { tx: me.x, ty: me.y, tmap: me.map, dir: me.facing, t: 0, dist: TILE, speed: WALK_SPEED, inPlace: true, bikeHop: true };
    return true;
  }
  // A hop in place, landed: wild Pokémon may jump out, but it isn't a step.
  function finishHopInPlace() {
    const wild = World.stepEncounter(wildState, me.map, me.x, me.y, {
      allow: ctx.allowWild, adjust: ctx.adjustWild, repel: !!(ctx.player && ctx.player.repelSteps > 0), lure: !!(ctx.player && ctx.player.lureSteps > 0),
      surf: false, bike: true, scale: ctx.encounterScale ? ctx.encounterScale() : 1 });
    if (wild) finish(Object.assign({ type: "wild" }, wild));
  }

  function savePosition() {
    ctx.player.location = { map: me.map, x: me.x, y: me.y, facing: me.facing };
  }

  // A warp pad (FireRed's DoTeleportWarp): you spin away with SE_WARP_IN,
  // and spin in at the other end with SE_WARP_OUT.
  const PAD_SPIN_MS = 500;
  let padSpinUntil = 0;
  function padSpin(se) {
    if (window.GameAudio) window.GameAudio.se(se);
    padSpinUntil = performance.now() + PAD_SPIN_MS;
    return new Promise((resolve) => setTimeout(resolve, PAD_SPIN_MS));
  }
  function warpTo(target) {
    paused = true;
    if (target.pad && !target.spun) {
      padSpin("se_warp_in").then(() => warpTo(Object.assign({}, target, { spun: true })));
      return;
    }
    if (ctx.onWarp) ctx.onWarp({ map: me.map, x: me.x, y: me.y }, target);
    fadeDir = 1;
    afterFade = async () => {
      me.map = target.map; me.x = target.x; me.y = target.y;
      if (target.door) me.facing = "down";
      else if (target.facing) me.facing = target.facing;
      hideAreaName();
      if (World.map(me.map).showName) showAreaName(me.map);
      checkAvatar(); checkLight(); tuckFollower(); followerLook(); pal.hidden = false;
      loadPeople();
      await preloadMap(me.map);
      savePosition();
      hint();
      if (target.pad) padSpin("se_warp_out");
      fadeDir = -1;
      afterFade = async () => {
        if (target.pad) { await new Promise((r) => setTimeout(r, Math.max(0, padSpinUntil - performance.now()))); me.facing = "down"; }
        paused = false;
        // Scenes that start as you walk in (the Viridian Mart clerk's parcel).
        if (ctx.special && ctx.special("enter:" + me.map)) return finish({ type: "trigger", trigger: { script: "enter:" + me.map }, map: me.map });
        const seen = anyTrainerSees();
        if (seen) return finish(seen);
        // Coming out of a door: step out onto the street.
        if (target.door) {
          const r = World.step({ map: me.map, x: me.x, y: me.y }, "down", occupiedForPlayer);
          if (r.ok) { startStep(r, "down"); followerOutOfDoor(r); }
        }
      };
    };
  }

  // A scripted nudge, e.g. Oak sending you back from the tall grass.
  function forceStep(dir) {
    me.facing = dir;
    const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer);
    if (r.ok) { me.map = r.map; me.x = r.x; me.y = r.y; savePosition(); tuckFollower(); }
  }

  // ---------- The follower Pokémon (HGSS's walking Pokémon) ----------
  //
  // Your party's first Pokémon walks behind you, a step behind, on the tile
  // you've just left (ctx.follower(map): its look, { sprite, width, height,
  // frames, offsetX }, or null where it doesn't come along: ui/follower.js).
  // Through a door or a warp it comes out of you, as HGSS's does: it starts
  // on your tile, out of sight behind you, and is left standing there as you
  // step away. It keeps out of sight while you ride the Bicycle or Surf, and
  // in the way of nobody (people walking about go round it; you can walk back
  // through it, and it steps past you). A facing it talks to it
  // ({ type: "follower" }); in a scene it keeps up with your steps.
  const pal = { def: null, x: 0, y: 0, facing: "down", move: null, parity: 0, hop: 0, away: false, hidden: false };
  function followerLook() { pal.def = ctx && ctx.follower ? ctx.follower(me.map) : null; }
  function tuckFollower() { pal.x = me.x; pal.y = me.y; pal.facing = me.facing; pal.move = null; }
  const followerShown = () => !!pal.def && !pal.hidden && !pal.away && me.avatar === "walk" && !me.hidden && !fly && !me.lift &&
    (!!pal.move || pal.x !== me.x || pal.y !== me.y);
  const followerAt = (x, y) => followerShown() && ((pal.x === x && pal.y === y) || (pal.move && pal.move.fx === x && pal.move.fy === y));
  // The player sets off from (me.x, me.y): it steps onto that tile, as fast
  // as you go (two tiles: a hop, after you over a ledge).
  function followerStep() {
    if (!pal.def || me.avatar !== "walk") { pal.away = true; return; }
    if (scene && pal.scripted) return;   // (a scene has it walking on its own)
    const dx = me.x - pal.x, dy = me.y - pal.y, n = Math.abs(dx) + Math.abs(dy);
    if (n === 0) return;
    if (n > 2 || (dx && dy)) { tuckFollower(); return; }
    pal.facing = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
    const mv = me.move || { speed: WALK_SPEED, dist: TILE };
    pal.move = { fx: pal.x, fy: pal.y, t: 0, dist: n * TILE, speed: mv.speed * (n * TILE) / (mv.dist || TILE), hop: n === 2 };
    pal.x = me.x; pal.y = me.y; pal.parity ^= 1;
  }
  // Out of a door with you: it comes out beside you, on your left (or your
  // right, if that's blocked), not in the doorway. (Out of it diagonally, as
  // you step down onto the street.)
  function followerOutOfDoor(r) {
    if (!pal.def || me.avatar !== "walk") return;
    const from = { map: r.map, x: r.x, y: r.y };
    const side = ["left", "right"].map((d) => World.step(from, d, occupiedForPlayer)).find((s) => s.ok && s.map === r.map && !s.jump && !s.warp);
    if (!side) return;
    pal.facing = "down";
    pal.move = { fx: me.x, fy: me.y, t: 0, dist: TILE, speed: me.move ? me.move.speed : WALK_SPEED, hop: false };
    pal.x = side.x; pal.y = side.y; pal.parity ^= 1;
  }
  // (Over the edge onto the next map: where it is, in that map's tiles.)
  function followerCrossed(from) {
    const fm = World.map(from), c = fm && fm.connections.find((k) => k.map === me.map);
    if (!c) { tuckFollower(); return; }
    const [ox, oy] = World.connectionOrigin(fm, c);
    pal.x -= ox; pal.y -= oy;
    if (pal.move) { pal.move.fx -= ox; pal.move.fy -= oy; }
    followerLook();
  }
  function updateFollower() {
    if (pal.hop > 0) pal.hop--;
    if (pal.move && (pal.move.t += pal.move.speed) >= pal.move.dist) pal.move = null;
    // (Back on foot, standing still: it's out again, behind you.)
    if (!me.move && (me.avatar !== "walk" || pal.away)) { tuckFollower(); pal.away = me.avatar !== "walk"; }
  }
  const FOLLOWER_HOP = 16;
  function followerSprite(camX, camY, shade) {
    if (!followerShown()) return null;
    let x = pal.x * TILE, y = pal.y * TILE, lift = pal.hop > 0 ? -JUMP_Y_LOW[FOLLOWER_HOP - pal.hop] : 0;
    if (pal.move) {
      const k = Math.min(1, pal.move.t / pal.move.dist);
      x = (pal.move.fx + (pal.x - pal.move.fx) * k) * TILE;
      y = (pal.move.fy + (pal.y - pal.move.fy) * k) * TILE;
      if (pal.move.hop) lift = Math.sin(k * Math.PI) * 10;
    }
    // (Walking, its two frames each way; standing, it keeps stepping on the spot, as HGSS's do.)
    const walking = pal.move ? (pal.move.t % TILE) < TILE / 2 : Math.floor(performance.now() / 333) % 2 === 1;
    const over = overTop(pal, me.map, pal.x, pal.y, me.map, pal.x, pal.y), d = pal.def;
    // (In a hot spring it's in the water too, as you are.)
    const sunk = !pal.move && !lift ? sunkAt(me.map, pal.x, pal.y) : 0;
    const ff = frameFor(pal.facing, walking, pal.parity, d.frames);
    return { y, over, draw: () => { if (shade) g.filter = SHADE; drawSprite(d.sprite, d.width, d.height, ff,
      pal.facing === "right", x - camX + spriteDx(d), y - camY - lift, sunk); g.filter = "none"; },
      refl: () => !lift && drawReflection(d.sprite, d.width, d.height, ff, pal.facing === "right", x - camX + spriteDx(d), y - camY,
        [[pal.x, pal.y]].concat(pal.move ? [[pal.move.fx, pal.move.fy]] : []), camX, camY) };
  }
  // (A facing it: it turns to you.)
  function followerAhead(dx, dy) {
    if (!followerShown() || pal.move || pal.x !== me.x + dx || pal.y !== me.y + dy) return false;
    pal.facing = World.OPPOSITE[me.facing];
    return true;
  }
  // For the game and HGSS's scripts (WaitFollowingPokemonMovement, GetPersonCoords on it).
  const followerApi = {
    refresh: () => followerLook(),
    shown: () => followerShown(),
    position: () => (followerShown() ? { x: pal.x, y: pal.y, facing: pal.facing } : null),
    hop: () => { pal.hop = FOLLOWER_HOP; },
    hide: (on) => { pal.hidden = !!on; },
    idle: () => (pal.move ? everyFrame(() => !pal.move) : Promise.resolve())
  };

  // ---------- Cutscenes ----------
  //
  // FireRed movement scripts (walk_up, walk_in_place_faster_down, delay_16,
  // emote_exclamation_mark, set_invisible ...) played for the player and people
  // side by side, like applymovement ... waitmovement.

  let scene = null;   // { tracks: [{ who, moves, i, wait }], resolve }

  // "player", a person's local id, or "#<id>" (their place in the map's list).
  // ("obj_partner_poke": your walking Pokémon, HGSS's, as Ilex Forest's Kimono Girl's scene walks it over to her.)
  const actor = (who) => (who === "player" ? me : who === "obj_partner_poke" ? (followerShown() ? pal : null)
    : people.find((p) => p.def.localId === who || "#" + p.def.id === who));
  // (walk_slower_*: the Seagallop pulling in at Cinnabar.)
  const SPEEDS = { "": WALK_SPEED, fast_: 2, faster_: 4, fastest_: 8, slow_: 0.5, slower_: 0.5 };

  // Starts a movement command; returns how many frames to wait on top of any step.
  function startCommand(who, cmd) {
    const a = actor(who);
    if (!a) return 0;
    let m;
    if ((m = /^walk_(fast_|faster_|fastest_|slow_|slower_)?(up|down|left|right)$/.exec(cmd))) {
      const dir = m[2], [dx, dy] = World.DIRS[dir], speed = SPEEDS[m[1] || ""];
      if (!a.lockFacing) a.facing = dir;
      if (a === me) {
        // (A scene walking you out of a door, your Pokémon still at your feet: it comes out beside you, not in the doorway.)
        const outOfDoor = !!pal.def && pal.x === me.x && pal.y === me.y && World.blockAt(me.map, me.x, me.y).behavior === World.MB.WARP_DOOR;
        me.move = { tx: me.x + dx, ty: me.y + dy, tmap: me.map, dir, t: 0, dist: TILE, speed, scripted: true }; me.parity ^= 1;
        if (outOfDoor) followerOutOfDoor({ map: me.map, x: me.x + dx, y: me.y + dy }); else followerStep();
      }
      else if (a === pal) { pal.move = { fx: pal.x, fy: pal.y, t: 0, dist: TILE, speed, hop: false }; pal.x += dx; pal.y += dy; pal.parity ^= 1; pal.scripted = true; }
      else {
        // (Someone walking where your Pokémon stands, Wally into Norman's Gym: it's back at your feet, out of their way,
        // till you walk on.)
        if (followerAt(a.x + dx, a.y + dy)) tuckFollower();
        a.move = { tx: a.x + dx, ty: a.y + dy, t: 0, speed };
      }
      return 0;
    }
    // A hop one tile (FireRed's jump_*: onto the water to Surf).
    if ((m = /^jump_(up|down|left|right)$/.exec(cmd))) {
      const dir = m[1], [dx, dy] = World.DIRS[dir];
      a.facing = dir;
      if (a === me) { me.move = { tx: me.x + dx, ty: me.y + dy, tmap: me.map, dir, t: 0, dist: TILE, speed: WALK_SPEED * 2, hop: true, scripted: true }; followerStep(); }
      else { a.x += dx; a.y += dy; }
      return 0;
    }
    if ((m = /^jump_2_(up|down|left|right)$/.exec(cmd))) {
      const dir = m[1], [dx, dy] = World.DIRS[dir];
      a.facing = dir;
      if (a === me) { me.move = { tx: me.x + dx * 2, ty: me.y + dy * 2, tmap: me.map, dir, t: 0, dist: TILE * 2, speed: WALK_SPEED, jump: true, scripted: true }; followerStep(); }
      else { a.x += dx * 2; a.y += dy * 2; }
      return 0;
    }
    if ((m = /^walk_in_place_(fast_|faster_)?(up|down|left|right)$/.exec(cmd))) {
      a.facing = m[2];
      a.inPlace = { "": 16, fast_: 8, faster_: 4 }[m[1] || ""];
      return a.inPlace;
    }
    if ((m = /^face_(up|down|left|right)$/.exec(cmd))) { a.facing = m[1]; return 0; }
    if (cmd === "face_player" || cmd === "face_away_player") {
      const dx = me.x - a.x, dy = me.y - a.y;
      const toward = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      a.facing = cmd === "face_player" ? toward : World.OPPOSITE[toward];
      return 0;
    }
    if ((m = /^delay_(\d+)$/.exec(cmd))) return +m[1];
    if ((m = /^emote_(exclamation|question|double_excl)_mark$/.exec(cmd))) { a.emote = { mark: { question: "?", exclamation: "!", double_excl: "!!" }[m[1]] }; return 40; }
    if (cmd === "emote_x") { a.emote = { mark: "×" }; return 40; }
    // (FireRed's lock_facing_direction: stepping back while still facing ahead.)
    if (cmd === "lock_facing_direction") { a.lockFacing = true; return 0; }
    if (cmd === "unlock_facing_direction") { a.lockFacing = false; return 0; }
    if (cmd === "set_invisible") { a.hidden = true; return 0; }
    if (cmd === "set_visible") { a.hidden = false; a.shown = true; return 0; }
    return 0;   // anything else (sounds, door animations) is skipped
  }

  function runScene() {
    let busy = false;
    for (const t of scene.tracks) {
      const a = actor(t.who);
      if (a && a.inPlace > 0) a.inPlace--;
      if (t.wait > 0 && --t.wait > 0) { busy = true; continue; }
      if (a && a.emote && t.wait === 0 && t.emoting) { a.emote = null; t.emoting = false; }
      if (a && a.move) { busy = true; continue; }
      if (t.i >= t.moves.length) continue;
      const cmd = t.moves[t.i++];
      t.wait = startCommand(t.who, cmd);
      t.emoting = /^emote_/.test(cmd);
      busy = true;
    }
    if (!busy) { const done = scene.resolve; scene = null; pal.scripted = false; savePosition(); done(); }   // keep any turn in place
  }

  // Plays movement scripts side by side: act([{ who: "player" | localId, moves: [...] }]).
  function act(list) {
    return new Promise((resolve) => {
      scene = { tracks: list.map((t) => ({ who: t.who, moves: [].concat(t.moves), i: 0, wait: 0 })), resolve };
    });
  }

  // Someone a story flag normally hides, put on the map for a scene; or, with
  // `look` (a WORLD_SPRITES entry), someone the map doesn't have at all.
  function addObject(localId, pos, look) {
    // (`look` dresses someone the map has as someone else: Red where FireRed has Gary.)
    const found = World.map(me.map).people.find((p) => p.localId === localId);
    const def = found ? Object.assign({}, found, look || {}) : look && Object.assign({ localId, movement: "face_down", text: null }, look);
    if (!def) return;
    people = people.filter((p) => p.def.localId !== localId);
    people.push({ def: Object.assign({}, def, { x: pos.x, y: pos.y }), x: pos.x, y: pos.y, ox: pos.x, oy: pos.y,
      move: null, facing: pos.facing || "down", timer: 60 });
  }
  const removeObject = (localId) => { people = people.filter((p) => p.def.localId !== localId); };
  // Takes one person (an item ball once picked up) off the map, by its object id.
  const removePerson = (def) => { people = people.filter((p) => !(p.def.id === def.id && p.def.script === def.script)); };

  // Fades to black, moves the player (a scene's warp), and fades back in.
  function fadeOut() { return new Promise((resolve) => { fadeDir = 1; afterFade = resolve; }); }
  function fadeIn() { return fade ? new Promise((resolve) => { fadeDir = -1; afterFade = resolve; }) : Promise.resolve(); }
  async function teleport(loc) {
    if (!fade) await fadeOut();
    me.map = loc.map; me.x = loc.x; me.y = loc.y; me.facing = loc.facing || "down";
    me.move = null; me.hidden = !!loc.hidden; me.emote = null;
    checkAvatar(); checkLight(); tuckFollower(); followerLook();
    loadPeople();
    await preloadMap(me.map);
    savePosition();
    hint();
    await new Promise((resolve) => { fadeDir = -1; afterFade = resolve; });
  }

  // The Escape Rope (FireRed's Task_EscapeRopeWarpOut / Task_EscapeRopeWarpIn).
  // Out: you spin round, faster and faster (SpinObjectEvent), with SE_WARP_IN
  // 20 frames in; after 60 frames you rise up off the screen, 8 pixels a
  // frame, still spinning, and the screen fades out. In: the screen fades in
  // with you up out of sight; SE_WARP_OUT, and you come down 4 pixels a frame
  // (SE_CLICK as you land), spinning from 8 frames in until, 50 frames or
  // more in, you face the way you arrived.
  function spinner() {
    let delay = 0, turns = 0, busy = 0;
    return () => {
      // (Each turn is a face-direction movement: done the frame after.)
      if (busy) { busy--; return; }
      if (delay !== 0 && --delay !== 0) return;
      me.facing = SPIN_FACINGS[(SPIN_FACINGS.indexOf(me.facing) + 1) % 4];
      busy = 1;
      if (turns < 12) turns++;
      delay = 12 >> turns;
    };
  }
  async function escapeRopeOut() {
    const spin = spinner(), se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };
    let gone = false;
    me.lift = 0;
    const spinning = everyFrame((t) => {
      spin();
      if (t === 20) se("se_warp_in");
      if (t >= 60 && me.lift < 88) me.lift += 8;
      if (me.lift >= 88 && !gone) { gone = true; fadeOut().then(() => { gone = "faded"; }); }
      return gone === "faded";
    });
    await spinning;
  }
  async function escapeRopeIn(loc) {
    const facing = loc.facing || "down";
    me.lift = 88;
    me.hidden = true;
    await teleport(Object.assign({}, loc, { hidden: true }));
    me.facing = facing;
    if (window.GameAudio) window.GameAudio.se("se_warp_out");
    me.hidden = false;
    const spin = spinner();
    let spinEnded = false;
    await everyFrame((t) => {
      if (me.lift > 0) {
        me.lift = Math.max(0, me.lift - 4);
        if (me.lift === 0 && window.GameAudio) window.GameAudio.se("se_click");
      }
      if (t >= 8 && !spinEnded) {
        spin();
        if (t >= 50 && me.facing === facing) spinEnded = true;
      }
      return me.lift === 0 && spinEnded;
    });
    me.lift = 0;
  }

  // ---------- Talking ----------

  const fillText = (s) => s.replace(/\{PLAYER\}/g, ctx.player.name).replace(/\{RIVAL\}/g, ctx.rivalName || "Gary").replace(/\{STR_VAR_\d\}/g, "");

  async function read(pages) {
    paused = true;
    menu.innerHTML = "";
    for (const page of pages) await window.Screen.read(fillText(page));
    held.clear();
    ignoreInputUntil = performance.now() + 200;
    paused = false;
    showControls();
    hint();
  }

  function interact() {
    const [dx, dy] = World.DIRS[me.facing];
    if (followerAhead(dx, dy)) return finish({ type: "follower", map: me.map });
    let tx = me.x + dx, ty = me.y + dy;
    // Talk across counters.
    if (World.blockAt(me.map, tx, ty).behavior === World.MB.COUNTER) { tx += dx; ty += dy; }
    const person = personAt(tx, ty);
    if (person && !person.move) {
      if (!person.def.inanimate) person.facing = World.OPPOSITE[me.facing];
      person.timer = 180;
      if (ctx.special && ctx.special(person.def.script)) return finish({ type: "talk", person: person.def, map: me.map });
      if (person.def.text) read(person.def.text);
      return;
    }
    const sign = World.signAt(me.map, tx, ty);
    if (sign) {
      if (ctx.special && ctx.special(sign.script)) return finish({ type: "sign", sign, map: me.map });
      if (sign.text) read(sign.text);
      return;
    }
    // The PC in a Pokémon Center is part of the map, not an event.
    if (World.blockAt(me.map, tx, ty).behavior === World.MB.PC) return finish({ type: "pc", map: me.map });
    // Something hidden on the ground in front of you.
    const hidden = (World.map(me.map).hidden || []).find((h) => h.x === tx && h.y === ty);
    if (hidden && ctx.hiddenItem && ctx.hiddenItem(hidden)) return finish({ type: "hidden", hidden, map: me.map });
    // A tree you could Headbutt (Johto's: ctx.headbuttTree).
    if (ctx.headbuttTree && ctx.headbuttTree(me.map, tx, ty)) return finish({ type: "headbutt", map: me.map, x: tx, y: ty });
    // Water you could Surf on, or (surfing) a waterfall.
    if (me.avatar === "surf") {
      if (World.blockAt(me.map, me.x + dx, me.y + dy).behavior === World.MB.WATERFALL) return finish({ type: "waterfall", map: me.map });
      if (World.blockAt(me.map, me.x + dx, me.y + dy).behavior === World.MB.WHIRLPOOL) return finish({ type: "whirlpool", map: me.map });
    } else if (World.climbable(World.blockAt(me.map, me.x + dx, me.y + dy).behavior, me.facing)) {
      return finish({ type: "rockclimb", map: me.map });
    } else if (World.facingWater({ map: me.map, x: me.x, y: me.y }, me.facing, occupiedForPlayer) && ctx.canSurf && ctx.canSurf()) {
      return finish({ type: "water", map: me.map });
    }
    // (Hoenn's Dive: A on deep water, or, under it, anywhere you can come up: ctx.diveHere.)
    if ((me.avatar === "surf" || me.avatar === "dive") && ctx.diveHere && ctx.diveHere(me.avatar)) return finish({ type: "dive", map: me.map });
    // Anything else the game does with the tile you face (ctx.faced: the Safari Zone's objects).
    const faced = ctx.faced && ctx.faced(me.map, tx, ty, me.avatar === "surf");
    if (faced) return finish(faced);
  }

  // ---------- Frame loop ----------

  // ---------- Into battle ----------
  //
  // Before a battle: the screen flashes white twice, then slices away to black
  // (bands sweeping in from alternate sides).

  const FLASH_FRAMES = 24, SLICE_FRAMES = 40;
  let transition = null;   // { t, resolve }
  let blackedOut = false;  // stays black after the transition until exploring resumes
  function battleTransition() {
    if (!running) return Promise.resolve();
    return new Promise((resolve) => { transition = { t: 0, resolve }; });
  }
  function drawTransition() {
    const t = transition.t;
    if (t < FLASH_FRAMES) {
      g.fillStyle = "rgba(255,255,255," + Math.sin(((t % 12) / 12) * Math.PI).toFixed(3) + ")";
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      return;
    }
    const k = Math.min(1, (t - FLASH_FRAMES) / SLICE_FRAMES), band = 8;
    g.fillStyle = "#000";
    for (let y = 0, i = 0; y < VIEW_H; y += band, i++) {
      const w = Math.ceil(VIEW_W * k);
      g.fillRect(i % 2 ? VIEW_W - w : 0, y, w, band);
    }
  }

  // ---------- Per-frame jobs ----------
  //
  // everyFrame(fn): fn(t) once a frame (t = 0, 1, 2...) until it returns true.
  const frameJobs = [];
  const everyFrame = (fn) => new Promise((resolve) => frameJobs.push({ fn, t: 0, resolve }));
  const waitFrames = (n) => everyFrame((t) => t >= n - 1);
  function runFrameJobs() {
    for (const job of frameJobs.slice()) {
      if (job.fn(job.t++)) { frameJobs.splice(frameJobs.indexOf(job), 1); job.resolve(); }
    }
  }

  // ---------- Fly ----------
  //
  // FireRed's FLDEFF_FLY_OUT and FLDEFF_FLY_IN (src/field_effect.c), frame
  // for frame. Out: you raise a Poké Ball (the field-move pose, frames 0-3
  // of the pose sheet 4 frames each and 4 for 8); your Pokémon is shown
  // (FLDEFF_FIELD_MOVE_SHOW_MON, outdoors: a band of streaks opens from the
  // right and grows to lines 40-120 while they scroll, the Pokémon slides in
  // from x 320 at 20 a frame, cries, waits 30 frames and slides off; the band
  // closes 6 lines a frame); the bird leaves its ball, growing as it arcs up
  // and off to the top left; you face left, 16 frames later it swoops down
  // from the right (SE_M_FLY), you hop on 8 frames into the swoop, and 10
  // later it carries you up and away, growing, and the screen fades. In: the
  // bird swoops in from the right with you on it, shrinking from twice its
  // size, drops you on your spot (you hop down) and flies on; you raise the
  // Ball and it spirals back in, turned a quarter and shrinking. Positions are
  // FireRed's screen positions (sprite centres), 8 lines higher here as our
  // camera has the player 8 lines higher; the bird is drawn without a rider
  // and your own sitting picture (the ride sheet) rides on it, scaled with it.
  let fly = null;   // { player: undefined (as usual) | null (not drawn) | { sheet, w, frame, x, y }, bird, band, mon }
  const turn = (a) => a / 256 * 2 * Math.PI;   // (FireRed's angles: 256 to a turn)
  const gbaSin = (a, amp) => Math.trunc(Math.sin(turn(a)) * amp);
  const gbaCos = (a, amp) => Math.trunc(Math.cos(turn(a)) * amp);
  const PLAYER_CX = 120, PLAYER_CY = 72;   // (FireRed's: the player's sprite centre on screen)
  const JUMP_IN_PLACE = [-4, -6, -8, -10, -11, -12, -12, -12, -11, -10, -9, -8, -6, -4, 0, 0];   // (sJumpY_Normal)
  const JUMP_OFF_BIRD = [-2, -4, -5, -6, -7, -8, -8, -8, -7, -7, -6, -5, -3, -2, 0, 2, 4, 8];

  const look = () => "player_" + (ctx.player.look || "custom");
  // The player as one of its sheets' frames, centred at (x, y).
  const standing = (facing) => ({ sheet: look(), w: 16, frame: frameFor(facing, false, 0, 9), flip: facing === "right", x: PLAYER_CX, y: PLAYER_CY });
  const riding = (x, y) => ({ sheet: look() + "_ride", w: 32, frame: 2, x, y });
  // The field-move pose (sAnim_FieldMove), or standing still for a look without one.
  async function fieldMovePose() {
    const has = ready(spriteImage(look() + "_item"));
    await everyFrame((t) => {
      fly.player = has ? { sheet: look() + "_item", w: 16, frame: t < 16 ? t >> 2 : 4, x: PLAYER_CX, y: PLAYER_CY } : standing(me.facing);
      return t >= 23;
    });
  }

  // FLDEFF_FIELD_MOVE_SHOW_MON (outdoors).
  async function showMon(species, form, shiny) {
    const img = image(window.Screen.spriteUrl(species, form, false, shiny));
    await img.loaded;
    const band = fly.band = { x0: 240, y0: 80, y1: 81, scroll: 0 };
    const scroll = () => { band.scroll -= 16; };
    await everyFrame(() => {
      scroll();
      band.x0 = Math.max(0, band.x0 - 16); band.y0 = Math.max(40, band.y0 - 2); band.y1 = Math.min(120, band.y1 + 2);
      return band.x0 === 0 && band.y0 === 40 && band.y1 === 120;
    });
    const mon = fly.mon = { img, x: 320 };
    let wait = 30;
    await everyFrame(() => {
      scroll();
      if (wait === 30 && mon.x > 120) {
        if ((mon.x -= 20) <= 120) { mon.x = 120; if (window.GameAudio) window.GameAudio.cry(species); }
        return false;
      }
      if (wait > 0) { wait--; return false; }
      if (mon.x < -64) return true;
      mon.x -= 20;
      return false;
    });
    fly.mon = null;
    await everyFrame(() => {
      scroll();
      band.y0 = Math.min(80, band.y0 + 6); band.y1 = Math.max(81, band.y1 - 6);
      return band.y0 === 80 && band.y1 === 81;
    });
    fly.band = null;
  }

  // Off you go (`mon`: { species, form, shiny }, the Pokémon that knows Fly).
  async function flyOut(mon) {
    const loads = [spriteImage(look() + "_item"), spriteImage(look() + "_ride"), spriteImage("fly_bird"), spriteImage("field_move_streaks")];
    await Promise.all(loads.map((i) => i.loaded));
    fly = { player: undefined };
    await fieldMovePose();
    await showMon(mon.species, mon.form, mon.shiny);
    // The bird leaves its Ball (SpriteCB_FlyBirdLeaveBall; sAffineAnim_FlyBirdLeaveBall).
    const bird = fly.bird = { x: 128, y: -48, dx: 0, dy: 0, scale: 8 / 256, rot: -30, rider: false };
    let d1 = 64, d2 = 256;
    await everyFrame((t) => {
      if (t > 0 && t <= 30) bird.scale += 28 / 256;
      d1 += d2 >> 8;
      bird.dx = gbaCos(d1, 120); bird.dy = gbaSin(d1, 120);
      if (d2 < 2048) d2 += 96;
      return d1 > 129;
    });
    bird.scale = 1; bird.rot = 0;
    // You face left; 16 frames later it swoops down (SpriteCB_FlyBirdSwoopDown).
    me.facing = "left";
    fly.player = standing("left");
    await waitFrames(16);
    if (window.GameAudio) window.GameAudio.se("se_m_fly");
    Object.assign(bird, { x: 120, y: 0 });
    let a = 0;
    await everyFrame((t) => {
      bird.dx = gbaCos(a, 140); bird.dy = gbaSin(a, 72);
      a = (a + 4) & 0xff;
      // (Hop on, 8 frames in: the ride picture, a jump in place.)
      if (t >= 8) fly.player = riding(PLAYER_CX, PLAYER_CY + (JUMP_IN_PLACE[t - 8] || 0));
      return t >= 17;
    });
    // Up and away with you (SpriteCB_FlyBirdWithPlayer, sAffineAnim_FlyBirdOutOfMap).
    fly.player = null;
    bird.rider = true;
    await everyFrame(() => {
      bird.dx = gbaCos(a, 180); bird.dy = gbaSin(a, 72);
      a = (a + 2) & 0xff;
      bird.scale += 24 / 256;
      return a >= 128;
    });
    await fadeOut();
    fly = null;
  }

  // Landing, once the map has faded in with you hidden.
  async function flyIn() {
    await Promise.all([spriteImage(look() + "_item"), spriteImage(look() + "_ride"), spriteImage("fly_bird")].map((i) => i.loaded));
    fly = { player: null };
    me.hidden = false;
    const bird = fly.bird = { x: 120, y: 0, dx: 0, dy: 0, scale: 2, rot: 0, rider: true };
    let a = 0;
    // In with you, shrinking to its size (sAffineAnim_FlyBirdIntoMap), until it's over your spot.
    await everyFrame(() => {
      bird.dx = gbaCos(a, 180); bird.dy = gbaSin(a, 72);
      a = (a + 2) & 0xff;
      bird.scale = Math.max(1, bird.scale - 16 / 256);
      return a >= 64;
    });
    bird.rider = false;
    const x = bird.x + bird.dx, y = bird.y + bird.dy - 8;
    // It flies on; you hop down onto your spot.
    await everyFrame((t) => {
      if (a < 128) { bird.dx = gbaCos(a, 140); bird.dy = gbaSin(a, 72); a += 4; }
      if (t < JUMP_OFF_BIRD.length) fly.player = riding(x, y + JUMP_OFF_BIRD[t]);
      return t >= JUMP_OFF_BIRD.length - 1 && a >= 128;
    });
    fly.bird = null;
    me.facing = "down";
    await fieldMovePose();
    // Back into its Ball (SpriteCB_FlyBirdReturnToBall, sAffineAnim_FlyBirdReturnToBall).
    const back = fly.bird = { x: 112, y: -32, dx: 0, dy: 0, scale: 1, rot: 64, rider: false };
    let b1 = 240, b2 = 2048, b3 = 0, b4 = 128;
    await everyFrame((t) => {
      if (t > 0 && t <= 22) back.scale -= 10 / 256;
      b1 += b2 >> 8; b3 += b2 >> 8; b1 &= 0xff;
      back.dx = gbaCos(b1, 32); back.dy = gbaSin(b1, 120);
      if (b2 > 256) b2 -= b4;
      if (b4 < 256) b4 += 24;
      if (b2 < 256) b2 = 256;
      return b3 >= 60;
    });
    fly.bird = null;
    await waitFrames(16);
    fly = null;
  }

  function drawFly() {
    const f = fly, down = 8;   // (FireRed's screen positions are 8 lines lower)
    if (f.player) {
      const p = f.player, img = spriteImage(p.sheet);
      if (ready(img)) {
        const x = Math.round(p.x - p.w / 2), y = Math.round(p.y - 16 - down);
        if (p.flip) { g.save(); g.translate(x + p.w, y); g.scale(-1, 1); g.drawImage(img, p.frame * p.w, 0, p.w, 32, 0, 0, p.w, 32); g.restore(); }
        else g.drawImage(img, p.frame * p.w, 0, p.w, 32, x, y, p.w, 32);
      }
    }
    if (f.bird) {
      const b = f.bird, img = spriteImage("fly_bird"), ride = spriteImage(look() + "_ride");
      g.save();
      g.translate(Math.round(b.x + b.dx), Math.round(b.y + b.dy - down));
      g.rotate(-turn(b.rot));
      g.scale(b.scale, b.scale);
      if (ready(img)) g.drawImage(img, -32, -32);
      if (b.rider && ready(ride)) g.drawImage(ride, 2 * 32, 0, 32, 32, -16, -16 - 8, 32, 32);
      g.restore();
    }
    if (f.band) {
      const b = f.band, img = spriteImage("field_move_streaks");
      if (b.y1 > b.y0 && ready(img)) {
        g.save();
        g.beginPath(); g.rect(b.x0, b.y0, VIEW_W - b.x0, b.y1 - b.y0); g.clip();
        const sx = ((b.scroll % 256) + 256) % 256;
        for (let x = -sx; x < VIEW_W; x += 256) g.drawImage(img, x, 40);
        g.restore();
      }
    }
    if (f.mon && ready(f.mon.img)) {
      const img = f.mon.img, w = img.naturalWidth, h = img.naturalHeight;
      g.drawImage(img, Math.round(f.mon.x - w / 2), Math.round(80 - h / 2));
    }
  }

  // ---------- The Pokémon Center's healing machine ----------
  //
  // FireRed's FLDEFF_POKECENTER_HEAL (src/field_effect.c): a Poké Ball goes
  // into the machine for each Pokémon, 25 frames apart (with SE_BALL); 32 frames
  // later the heal jingle starts, the machine's screen flickers, and the balls
  // flash yellow (colours 2, 3, 5, 6 and 8 of their palette, brightened in
  // turn) three times round and once more; 30 frames after that, and once the
  // jingle is over, it's done. The pictures are at FireRed's screen positions
  // (the balls from (93, 36), the screen at (128, 24)), less the 8 lines
  // FireRed's camera sits lower; the camera is on the player, at the counter.
  const BALL_OFFSETS = [[0, 0], [6, 0], [0, 4], [6, 4], [0, 8], [6, 8]];
  const GLOW = [16, 12, 8, 0];                       // sPokeballGlowReds / Greens (blue stays)
  const MONITOR_ANIM = [[1, 5], [2, 5], [3, 7], [2, 5], [1, 5], [0, 5]];   // played 4 times
  let heal = null;
  const fxCanvas = document.createElement("canvas");
  const fxG = fxCanvas.getContext("2d");

  function pokecenterHeal(count, playJingle) {
    return new Promise((resolve) => {
      // FireRed's camera has the player 8 lines lower on the screen than ours
      // (PLAYER_Y), so its screen positions are 8 lines higher here.
      const camX = me.x * TILE - PLAYER_X, camY = me.y * TILE - PLAYER_Y - 8;
      heal = { state: 0, timer: 0, counter: 0, flashed: 0, left: Math.max(1, Math.min(6, count)), balls: [],
        x: camX + 93, y: camY + 36, monitor: { x: camX + 128 - 16, y: camY + 24 - 8, on: false, step: 0, t: 0, plays: 0 },
        glow: {}, playJingle, jingleDone: false, resolve };
    });
  }

  function updateHeal() {
    const h = heal;
    const glowAll = (phase) => { for (const i of [2, 3, 5, 6, 8]) h.glow[i] = phase; };
    switch (h.state) {
      case 0:   // PlaceBalls
        if (h.timer === 0 || --h.timer === 0) {
          h.timer = 25;
          const [dx, dy] = BALL_OFFSETS[h.counter++];
          h.balls.push([h.x + dx - 4, h.y + dy - 4]);
          h.left--;
          if (window.GameAudio) window.GameAudio.se("se_ball");
        }
        if (h.left === 0) { h.timer = 32; h.state = 1; }
        break;
      case 1:   // TryPlaySe
        if (--h.timer === 0) {
          h.state = 2; h.timer = 8; h.counter = 0; h.flashed = 0;
          Promise.resolve(h.playJingle && h.playJingle()).then(() => { h.jingleDone = true; });
          h.monitor.on = true;
        }
        break;
      case 2:   // FlashFirstThree
        if (--h.timer === 0) {
          h.timer = 8;
          h.counter = (h.counter + 1) & 3;
          if (h.counter === 0) h.flashed++;
        }
        h.glow[8] = (h.counter + 3) & 3; h.glow[6] = (h.counter + 2) & 3; h.glow[2] = (h.counter + 1) & 3;
        h.glow[5] = h.glow[3] = h.counter;
        if (h.flashed >= 3) { h.state = 3; h.timer = 8; h.counter = 0; }
        break;
      case 3:   // FlashLast
        if (--h.timer === 0) {
          h.timer = 8;
          h.counter = (h.counter + 1) & 3;
          if (h.counter === 3) { h.state = 4; h.timer = 30; }
        }
        glowAll(h.counter);
        break;
      case 4:   // WaitAfterFlash (the balls are gone)
        h.balls = [];
        if (--h.timer === 0) h.state = 5;
        break;
      case 5:   // WaitForSound
        if (h.jingleDone && !h.monitor.on) { heal = null; h.resolve(); }
        break;
    }
    // The screen: frames 1, 2, 3, 2, 1, 0, four times, then it's put away.
    const m = h.monitor;
    if (m.on && ++m.t >= MONITOR_ANIM[m.step][1]) {
      m.t = 0;
      if (++m.step === MONITOR_ANIM.length) { m.step = 0; if (++m.plays === 4) m.on = false; }
    }
  }

  function drawHeal(camX, camY) {
    const fx = window.FIELD_EFFECTS;
    if (!fx) return;
    // The palette, with the glowing colours brightened (MultiplyInvertedPaletteRGBComponents).
    const pal = fx.palette.map((c, i) => {
      const k = heal.glow[i] != null ? GLOW[heal.glow[i]] : 0;
      return [0, 1, 2].map((ch) => { const v = c[ch] >> 3, mul = ch === 2 ? 0 : k; return (v + (((31 - v) * mul) >> 4)) << 3; });
    });
    const blit = (pic, frame, x, y) => {
      const w = pic.width, h = pic.height;
      fxCanvas.width = w; fxCanvas.height = h;
      const img = fxG.createImageData(w, h);
      for (let i = 0; i < w * h; i++) {
        const v = parseInt(pic.px[frame * w * h + i], 16);
        if (!v) continue;
        img.data.set(pal[v], i * 4); img.data[i * 4 + 3] = 255;
      }
      fxG.putImageData(img, 0, 0);
      g.drawImage(fxCanvas, Math.round(x - camX), Math.round(y - camY));
    };
    if (heal.monitor.on) blit(fx.monitor, MONITOR_ANIM[heal.monitor.step][0], heal.monitor.x, heal.monitor.y);
    for (const [x, y] of heal.balls) blit(fx.ball, 0, x, y);
  }

  // ---------- Weather (src/field_weather.c, field_weather_effects.c) ----------
  //
  // A map's FireRed weather (WORLD_MAPS[map].weather):
  // - "fog_horizontal" (Pokémon Tower 3F-7F): FireRed's 64x64 fog sprites
  //   (graphics/weather/fog_horizontal.png, data/field-effects.js) tiled over
  //   the map, under people and the map's top layer, moving with the map and
  //   drifting left a pixel every 4 frames (FogHorizontal_Main), blended in
  //   as the GBA does (BLDALPHA: fog x 12/16 + the map x 8/16, in 5-bit
  //   colour), which it fades up to from 0/16 and 16/16 on arriving
  //   (Weather_UpdateBlend: a step every 4 frames, EVA and EVB in turn).
  // - "shade" (Viridian Forest, Pokémon Mansion): the map and people darker
  //   (Shade_InitVars: gamma shift 3, each colour x 13/16).
  // (ctx.weather(map) can change it: the Tanoby Ruins' chambers stay dark until their puzzle's solved.)
  const weatherOf = (mapName) => (ctx && ctx.weather && ctx.weather(mapName)) || (World.map(mapName) || {}).weather;
  const fogState = { on: false, offset: 0, counter: 0, eva: 0, evb: 16, step: 0, steps: 0 };
  // (Drawn with the canvas's own blending, so nothing is read back from it: a
  // canvas with the map's pictures on it can't be read from file://. The map
  // under the fog is multiplied by EVB/16, then the fog x EVA/16 added.)
  let fogBase = null;
  const fogTiles = {};
  function fogTile(kind, ev) {
    const key = kind + ev;
    if (fogTiles[key]) return fogTiles[key];
    const f = (window.FIELD_EFFECTS || {}).fog;
    if (!f) return null;
    if (!fogBase) fogBase = { w: f.width, h: f.height, px: Array.from(f.px, (c) => parseInt(c, 16)), pal: f.palette };
    const c = document.createElement("canvas");
    c.width = fogBase.w; c.height = fogBase.h;
    const cg = c.getContext("2d"), img = cg.createImageData(c.width, c.height);
    fogBase.px.forEach((v, i) => {
      for (let k = 0; k < 3; k++) {
        img.data[i * 4 + k] = kind === "mul" ? (v ? Math.round(255 * ev / 16) : 255)
          : v ? Math.min(31, ((fogBase.pal[v][k] >> 3) * ev) >> 4) << 3 : 0;
      }
      img.data[i * 4 + 3] = kind === "mul" || v ? 255 : 0;
    });
    cg.putImageData(img, 0, 0);
    return (fogTiles[key] = c);
  }
  function updateWeather() {
    if (WX) WX.update(weatherOf(me.map));
    const fog = weatherOf(me.map) === "fog_horizontal";
    if (fog && !fogState.on) Object.assign(fogState, { on: true, eva: 0, evb: 16, step: 0, steps: 0 });
    if (!fog) { fogState.on = false; return; }
    if (++fogState.counter > 3) { fogState.counter = 0; fogState.offset++; }
    if ((fogState.eva !== 12 || fogState.evb !== 8) && ++fogState.step > 3) {
      fogState.step = 0;
      if (++fogState.steps & 1) { if (fogState.eva < 12) fogState.eva++; }
      else if (fogState.evb > 8) fogState.evb--;
    }
  }
  function drawFog(camX, camY) {
    if (!fogState.on) return;
    const mul = fogTile("mul", fogState.evb), add = fogTile("add", fogState.eva);
    if (!mul || !add) return;
    const w = mul.width, h = mul.height;
    const ox = (((-camX - fogState.offset) % w) + w) % w, oy = (((-camY) % h) + h) % h;
    g.save();
    g.translate(ox - w, oy - h);
    for (const [tile, op] of [[mul, "multiply"], [add, "lighter"]]) {
      g.globalCompositeOperation = op;
      g.fillStyle = g.createPattern(tile, "repeat");
      g.fillRect(0, 0, VIEW_W + w, VIEW_H + h);
    }
    g.restore();
  }
  // (Each frame the map and people are dimmed or warmed as the weather has it: ui/weather.js.)
  let SHADE = "brightness(" + 13 / 16 + ")";
  const WX = window.Weather ? window.Weather.create(g, VIEW_W, VIEW_H, { thunder: () => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se("se_thunder"); } }) : null;

  // The screen shaking a pixel up and down (FireRed's Task_ElevatorShake:
  // SetCameraPanning(0, ±1), the other way every 3 frames, `count` times).
  let pan = null, panY = 0, panX = 0;
  // (FireRed's ShakeScreen too: `opts` { x, y (pixels each way), delay (frames) }.)
  function shake(count, opts) {
    opts = opts || {};
    return new Promise((resolve) => { pan = { count, n: 0, t: 0, dy: opts.y != null ? opts.y : 1, dx: opts.x || 0, delay: opts.delay || 3, resolve }; });
  }
  function updatePan() {
    if (++pan.t % pan.delay) return;
    pan.n++;
    pan.dy = -pan.dy;
    pan.dx = -pan.dx;
    panY = pan.dy;
    panX = pan.dx;
    if (pan.n >= pan.count) { const done = pan.resolve; pan = null; panY = 0; panX = 0; done(); }
  }

  function update() {
    updatePopup();
    runFrameJobs();
    if (pan) updatePan();
    updateWeather();
    if (heal) updateHeal();
    updateRod();
    if (transition && ++transition.t > FLASH_FRAMES + SLICE_FRAMES + 4) {
      const done = transition.resolve;
      transition = null;
      blackedOut = true;
      done();
    }
    if (fadeDir) {
      fade = Math.max(0, Math.min(FADE_FRAMES, fade + fadeDir));
      if ((fadeDir > 0 && fade === FADE_FRAMES) || (fadeDir < 0 && fade === 0)) {
        fadeDir = 0;
        const next = afterFade;
        afterFade = null;
        if (next) next();
      }
    }
    if (padSpinUntil > performance.now()) me.facing = SPIN_FACINGS[Math.floor(performance.now() / 67) % 4];
    if (light != null && light < lightTarget) light = Math.min(lightTarget, light + 4);
    for (const p of people) updatePerson(p);
    updateFollower();
    if (scene) runScene();
    if (me.move) {
      me.move.t += me.move.speed;
      // (Spinning round as you go.)
      if (me.move.spin) me.facing = SPIN_FACINGS[Math.floor(performance.now() / 67) % 4];
      if (me.move.t >= me.move.dist) {
        if (me.move.scripted) { me.x = me.move.tx; me.y = me.move.ty; me.move = null; savePosition(); }
        else { me.carry = Math.min(me.move.t - me.move.dist, TILE - 1); finishStep(); me.moving = true; }
      }
      return;
    }
    // Still on the move from last frame: turning doesn't stop you (Gen 3).
    const wasMoving = me.moving;
    me.moving = false;
    if (paused || !resolveExplore) return;
    if (pendingEvent) { const ev = pendingEvent; pendingEvent = null; return finish(ev); }
    if (pressedMenu) { pressedMenu = false; return finish({ type: "menu" }); }
    if (pressedSelect) { pressedSelect = false; return finish({ type: "select" }); }
    if (pressedA) { pressedA = false; return interact(); }
    const dir = heldDir();
    if (me.avatar === "bike" && World.isPullDown(World.blockAt(me.map, me.x, me.y).behavior)) return slope(dir);
    if (me.avatar === "bike" && bikeHop(dir)) return;
    // On a current, it carries you (World.currentStep) wherever you press.
    if (me.avatar === "surf") {
      const c = World.currentStep({ map: me.map, x: me.x, y: me.y }, occupiedForPlayer);
      if (c) { me.facing = c.dir; me.turnTimer = 0; startStep(c, c.dir, false, World.CURRENT_SPEED); return; }
    }
    if (!dir) { me.turnTimer = 0; me.bikeDir = null; me.carry = 0; return; }
    if (dir !== me.facing && !wasMoving) { me.facing = dir; me.turnTimer = TURN_FRAMES; return; }
    me.facing = dir;
    if (me.turnTimer > 0) { me.turnTimer--; return; }
    const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer, { surf: me.avatar === "surf" });
    if (r.warp && !r.ok) { warpTo(r.warp); return; }
    if (r.ok) { startStep(r, dir); return; }
    me.bikeDir = null;   // (a bump stops the Bicycle)
    if (tryPushBoulder(dir) || tryPushIceBlock(dir)) { me.turnTimer = TILE; return; }
    // A door that leads nowhere yet (a locked Gym): its sign says why.
    if (r.door && performance.now() - bumpMessageAt > 3000) {
      const [dx, dy] = World.DIRS[dir];
      const sign = World.signAt(me.map, me.x + dx, me.y + dy);
      if (sign && sign.text) { bumpMessageAt = performance.now(); read(sign.text); return; }
    }
    if (r.unbuilt && performance.now() - bumpMessageAt > 3000) {
      bumpMessageAt = performance.now();
      const place = r.unbuilt.replace(/^MAP_/, "").toLowerCase().replace(/(^|_)(\w)/g, (_, s, c) => (s ? " " : "") + c.toUpperCase());
      read(["The way to " + place + " isn't built yet."]);
    }
  }

  // Cycling Road's slope on the Bicycle (World.slopeMove): downhill unless you
  // press another way or hold B.
  function slope(dir) {
    const s = World.slopeMove(dir, bDown);
    me.turnTimer = 0; me.bikeDir = null;
    if (!s) return;
    const r = World.step({ map: me.map, x: me.x, y: me.y }, s.dir, occupiedForPlayer);
    // (Coasting into something stops you without turning you; pedalling into it turns you.)
    if (!s.downhill || r.ok) me.facing = s.dir;
    if (r.warp && !r.ok && dir) { warpTo(r.warp); return; }
    if (r.ok) startStep(r, s.dir, false, r.jump ? null : s.speed);
  }

  // Frame index in a FireRed overworld sheet: 0-2 standing (down, up, left),
  // 3-4 walking down, 5-6 up, 7-8 left. Right is left mirrored.
  function frameFor(facing, walking, parity, frames) {
    const stand = { down: 0, up: 1, left: 2, right: 2 }[facing];
    if (!walking || frames < 9) return Math.min(stand, frames - 1);
    return { down: 3, up: 5, left: 7, right: 7 }[facing] + parity;
  }

  // Gen 3's sprite priority by elevation (sElevationToPriority): someone
  // standing at elevation 4, 6, 8, 10 or 12 (raised ground: the Safari Zone's
  // ledges), or 13 or 14, is drawn over the map's top layer; anywhere else,
  // under it. Each remembers the last elevation it stood on, from where it is
  // and where it's stepping to (ObjectEventUpdateElevation: 0 changes nothing,
  // and 15, a bridge, leaves it as it was).
  const OVER_TOP = [0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0];
  function overTop(a, map, x, y, tmap, tx, ty) {
    if (a.elev == null) a.elev = 3;
    const prev = World.blockAt(map, x, y).elevation, cur = World.blockAt(tmap, tx, ty).elevation;
    if (cur !== 15 && prev !== 15 && cur !== 0) a.elev = cur;
    return !!OVER_TOP[a.elev];
  }

  // ---------- Tracks in sand (Emerald's GetGroundEffectFlags_Tracks, src/event_object_movement.c) ----------
  //
  // Walking off sand (MB_SAND, 0x21) you leave footprints on it, the way you went, and off the desert's deep sand
  // (MB_DEEP_SAND, 0x06) deeper ones; on the Bicycle, tire tracks, curving where you turned. They stay 40 frames,
  // then flicker 56 more and are gone (FadeFootprintsTireTracks). The pictures: data/field-effects.js's
  // sandFootprints, deepSandFootprints, bikeTireTracks.
  const SAND = 0x21, DEEP_SAND = 0x06, TRACK_STAY_MS = 40 * 1000 / 60, TRACK_GONE_MS = 96 * 1000 / 60;
  let tracks = [];   // { map, x, y, pic, frame, flipX, flipY, at (ms) }
  // (A tire track's shape by the way you were going and the way you go: bikeTireTracks_Transitions; [frame, flipX].)
  const TIRE = { down: { down: [2], up: [2], left: [3, true], right: [3] }, up: { down: [2], up: [2], left: [0, true], right: [0] },
    left: { down: [0], up: [3], left: [1], right: [1] }, right: { down: [0, true], up: [3, true], left: [1], right: [1] } };
  function leaveTracks(map, x, y, mv) {
    if (mv.jump || mv.inPlace || (me.avatar !== "walk" && me.avatar !== "bike")) return;
    const b = World.blockAt(map, x, y).behavior;
    if (b !== SAND && b !== DEEP_SAND) { me.trackDir = mv.dir; return; }
    let t;
    if (me.avatar === "bike") { const [frame, flipX] = TIRE[me.trackDir || mv.dir][mv.dir]; t = { pic: "bikeTireTracks", frame, flipX: !!flipX, flipY: false }; }
    else t = { pic: b === DEEP_SAND ? "deepSandFootprints" : "sandFootprints", frame: mv.dir === "up" || mv.dir === "down" ? 0 : 1, flipX: mv.dir === "right", flipY: mv.dir === "down" };
    me.trackDir = mv.dir;
    tracks.push(Object.assign(t, { map, x, y, at: performance.now() }));
  }
  const fxPics = {};
  function fxPic(name, frame) {
    const fx = window.FIELD_EFFECTS && window.FIELD_EFFECTS[name];
    if (!fx) return null;
    if (!fxPics[name]) {
      fxPics[name] = [];
      for (let f = 0; f < fx.frames; f++) {
        const c = document.createElement("canvas");
        c.width = fx.width; c.height = fx.height;
        const cg = c.getContext("2d"), img = cg.createImageData(fx.width, fx.height), n = fx.width * fx.height;
        for (let i = 0; i < n; i++) {
          const v = parseInt(fx.px[f * n + i], 16);
          if (!v) continue;
          img.data.set(fx.palette[v], i * 4); img.data[i * 4 + 3] = 255;
        }
        cg.putImageData(img, 0, 0);
        fxPics[name].push(c);
      }
    }
    return fxPics[name][frame];
  }
  function drawTracks(name, x0, y0) {
    if (!tracks.length) return;
    const now = performance.now();
    tracks = tracks.filter((t) => now - t.at < TRACK_GONE_MS);
    for (const t of tracks) {
      if (t.map !== name) continue;
      const age = now - t.at;
      if (age > TRACK_STAY_MS && Math.floor(age * 60 / 1000) % 2) continue;   // (flickering out, every other frame)
      const pic = fxPic(t.pic, t.frame);
      if (!pic) continue;
      g.save();
      g.translate(x0 + t.x * TILE + (t.flipX ? TILE : 0), y0 + t.y * TILE + (t.flipY ? TILE : 0));
      g.scale(t.flipX ? -1 : 1, t.flipY ? -1 : 1);
      g.drawImage(pic, 0, 0);
      g.restore();
    }
  }

  // ---------- Long grass (FLDEFF_LONG_GRASS, src/field_effect_helpers.c) ----------
  //
  // Whoever stands in long grass (MB_LONG_GRASS, Faraway Island's: you, your
  // Pokémon, people) is in it, not on it: FireRed's 16x16 long grass sprite
  // (data/field-effects.js) over the tile and their feet. (Ordinary tall
  // grass, where wild Pokémon are, doesn't cover anyone here.) Stepping in, it rustles (frames 1-4, 10
  // frames each, then 0: sAnim_TallGrass); someone already standing there
  // when the map's drawn has it at rest (frame 0). It stays while anyone's on
  // the tile or stepping off it, and until it's done rustling.
  const GRASS_FRAME_MS = 10 * 1000 / 60;
  const grassFx = new Map();   // "map:x:y" -> { x, y, start (ms), map }
  let grassPics = null;
  function grassPic(frame) {
    const fx = window.FIELD_EFFECTS && (window.FIELD_EFFECTS.longGrass || window.FIELD_EFFECTS.tallGrass);
    if (!fx) return null;
    if (!grassPics) {
      grassPics = [];
      for (let f = 0; f < fx.frames; f++) {
        const c = document.createElement("canvas");
        c.width = fx.width; c.height = fx.height;
        const cg = c.getContext("2d"), img = cg.createImageData(fx.width, fx.height), n = fx.width * fx.height;
        for (let i = 0; i < n; i++) {
          const v = parseInt(fx.px[f * n + i], 16);
          if (!v) continue;
          img.data.set(fx.palette[v], i * 4); img.data[i * 4 + 3] = 255;
        }
        cg.putImageData(img, 0, 0);
        grassPics.push(c);
      }
    }
    return grassPics[frame];
  }
  // (Only long grass, Emerald's on Faraway Island, hides whoever's in it;
  // FireRed's ordinary tall grass leaves them in view.)
  const isTallGrass = (map, x, y) => World.blockAt(map, x, y).behavior === World.MB.LONG_GRASS;
  // The tiles someone's on: where they stand, and where they're stepping to
  // or from; and whether they're stepping.
  function grassOccupants() {
    const out = [];
    if (!me.hidden && !fly) {
      out.push([me.x, me.y, !!me.move]);
      if (me.move && (me.move.tmap || me.map) === me.map) out.push([me.move.tx, me.move.ty, true]);
    }
    for (const p of people) {
      if (p.hidden || p.def.inanimate) continue;
      out.push([p.x, p.y, !!p.move]);
      if (p.move) out.push([p.move.tx, p.move.ty, true]);
    }
    if (followerShown()) {
      out.push([pal.x, pal.y, !!pal.move]);
      if (pal.move) out.push([pal.move.fx, pal.move.fy, true]);
    }
    return out;
  }
  function tallGrassSprites(camX, camY, shade) {
    const now = performance.now(), here = new Set();
    for (const [x, y, stepping] of grassOccupants()) {
      if (!isTallGrass(me.map, x, y)) continue;
      const key = me.map + ":" + x + ":" + y;
      here.add(key);
      if (!grassFx.has(key)) grassFx.set(key, { x, y, map: me.map, start: stepping ? now : -Infinity });
    }
    const out = [];
    for (const [key, fx] of grassFx) {
      const t = Math.floor((now - fx.start) / GRASS_FRAME_MS), done = t >= 4;
      if (fx.map !== me.map || (!here.has(key) && done)) { grassFx.delete(key); continue; }
      const fx0 = window.FIELD_EFFECTS && (window.FIELD_EFFECTS.longGrass || window.FIELD_EFFECTS.tallGrass);
      const pic = grassPic(done ? 0 : Math.min(t + 1, (fx0 ? fx0.frames : 5) - 1));
      if (!pic) continue;
      // (Over whoever's on its tile, or stepping onto it from below; under
      // anyone on the row below.)
      out.push({ y: fx.y * TILE + TILE - 0.5, over: false, draw: () => { if (shade) g.filter = SHADE; g.drawImage(pic, fx.x * TILE - camX, fx.y * TILE - camY); g.filter = "none"; } });
    }
    return out;
  }

  // (`sunk`: pixels of its feet under the water of a hot spring, cut off.)
  function drawSprite(name, w, h, frame, flip, px, py, sunk) {
    const img = spriteImage(name);
    if (!ready(img)) return;
    const x = Math.round(px), y = Math.round(py + TILE - h), sh = h - (sunk || 0);
    if (flip) {
      g.save();
      g.translate(x + w, y);
      g.scale(-1, 1);
      g.drawImage(img, frame * w, 0, w, sh, 0, 0, w, sh);
      g.restore();
    } else {
      g.drawImage(img, frame * w, 0, w, sh, x, y, w, sh);
    }
    if (sunk) drawHotSpring(x + w / 2, y + sh);
  }
  // ---------- Reflections (Emerald's: src/field_effect_helpers.c SetUpReflection) ----------
  //
  // Someone standing above still water (a pond, a puddle, Sootopolis's deep water, the water under a bridge) or ice
  // shows upside down below their feet, in the paler reflection palette (npc_1_reflection.pal and the like), on the
  // water only. On a bridge over a pond it falls further, solid dark blue (Route 120's: bridge_reflection.pal).
  // The map's tiles: m.reflect, run-length [start, run, kind] (tools/lib/emerald-tiles.js reflections).
  const reflectCache = {};
  function reflectAt(map, x, y) {
    const m = World.map(map);
    if (!m || !m.reflect || x < 0 || y < 0 || x >= m.width || y >= m.height) return 0;
    let a = reflectCache[map];
    if (!a) {
      a = reflectCache[map] = new Uint8Array(m.width * m.height);
      for (let i = 0; i < m.reflect.length; i += 3) a.fill(m.reflect[i + 2], m.reflect[i], m.reflect[i] + m.reflect[i + 1]);
    }
    return a[y * m.width + x];
  }
  // (The water under a bridge gives someone a reflection (6), but it isn't drawn there: the bridge is over it.)
  const REFLECTS = (k) => k === 1 || k === 2 || k === 6, SHOWS = (k) => k === 1 || k === 2;
  // (ObjectEventGetNearbyReflectionType: the tiles below someone w x h, from either tile they're between.)
  function reflectionType(map, w, h, spots) {
    const W = (w + 8) >> 4, H = (h + 8) >> 4;
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) for (const [x, y] of spots) for (const sx of j ? [x + j, x - j] : [x])
      if (REFLECTS(reflectAt(map, sx, y + 1 + i))) return true;
    return false;
  }
  const BRIDGE_DROP = { 3: 12, 4: 28, 5: 44 };
  const reflCanvas = document.createElement("canvas"), rg = reflCanvas.getContext("2d");
  // (sx, sy: where drawSprite puts the sprite on screen; spots: the tiles they're on, or between.)
  function drawReflection(name, w, h, frame, flip, sx, sy, spots, camX, camY) {
    const m = World.map(me.map);
    if (!m || !m.reflect || !reflectionType(me.map, w, h, spots)) return;
    const img = spriteImage(name);
    if (!ready(img)) return;
    const bridge = spots.map(([x, y]) => reflectAt(me.map, x, y)).find((k) => BRIDGE_DROP[k]);
    reflCanvas.width = w; reflCanvas.height = h;
    rg.save(); rg.translate(flip ? w : 0, h); rg.scale(flip ? -1 : 1, -1); rg.drawImage(img, frame * w, 0, w, h, 0, 0, w, h); rg.restore();
    rg.globalCompositeOperation = "source-atop";
    rg.fillStyle = bridge ? "rgb(74,115,172)" : "rgba(215,235,255,0.5)";
    rg.fillRect(0, 0, w, h);
    rg.globalCompositeOperation = "source-over";
    // (Its middle the sprite's height less 2 below the sprite's: GetReflectionVerticalOffset.)
    const x = Math.round(sx), y = Math.round(sy + TILE - h) + h - 2 + (BRIDGE_DROP[bridge] || 0);
    g.save();
    g.beginPath();
    const tx0 = Math.floor((x + camX) / TILE), ty0 = Math.floor((y + camY) / TILE);
    for (let ty = ty0; ty * TILE - camY < y + h; ty++) for (let tx = tx0; tx * TILE - camX < x + w; tx++)
      if (SHOWS(reflectAt(me.map, tx, ty))) g.rect(tx * TILE - camX, ty * TILE - camY, TILE, TILE);
    g.clip();
    g.drawImage(reflCanvas, x, y);
    g.restore();
  }

  // Standing in a hot spring (FireRed's MB_HOT_SPRINGS: the Ember Spa), you're
  // in it up to the waist (its FLDEFF_HOT_SPRINGS_WATER), the water rippling round you.
  const HOT_SPRINGS = 0x28, SUNK = 6;
  const sunkAt = (map, x, y) => (World.blockAt(map, x, y).behavior === HOT_SPRINGS ? SUNK : 0);
  function drawHotSpring(cx, y) {
    const ripple = Math.floor(performance.now() / 400) % 2;
    g.fillStyle = "rgba(200,232,248,0.85)";
    g.fillRect(Math.round(cx - 7 - ripple), y - 1, 14 + ripple * 2, 2);
    g.fillStyle = "#ffffff";
    g.fillRect(Math.round(cx - 5 + ripple), y - 1, 3, 1);
    g.fillRect(Math.round(cx + 2 - ripple), y, 3, 1);
  }

  // ---------- The area's name (src/map_name_popup.c) ----------
  //
  // Arriving through a door or warp on a map that shows its name, or walking
  // into a different area, its name hangs down from the top left in the std
  // window: 2 pixels a frame down (12 frames), 121 frames there, 2 a frame
  // back up. Another area meanwhile: it goes up and comes back with the new
  // name. Anything that stops you walking (talking, the menu) takes it away.
  let popup = null;   // { canvas, pos 0-24, state "in" | "hold" | "out", t, next }
  function areaName(mapName) {
    const T = window.TOWN_MAP || {}, m = World.map(mapName) || {};
    const sec = (T.mapSections || {})[mapName];
    // (The S.S. Anne: "S.S. Anne Exterior" on the dock, "S.S. Anne" in every room.)
    if (sec === "S_S_ANNE") return mapName === "SSAnne_Exterior" ? "S.S. Anne Exterior" : "S.S. Anne";
    let name = (sec && T.names && T.names[sec]) || String(m.title || mapName).split(" · ")[0];
    if (m.floor) name += " " + (m.floor === 127 ? "Rooftop" : (m.floor < 0 ? "B" + -m.floor : m.floor) + "F");
    return name;
  }
  const areaOf = (mapName) => ((window.TOWN_MAP || {}).mapSections || {})[mapName] || areaName(mapName);
  function popupCanvas(name, mapName) {
    const m = World.map(mapName) || {};
    const W = !m.floor ? 112 : m.floor !== 127 ? 152 : 176;
    const s = window.GbaMenus.Surface(), pal = window.GBA_MENUS.palettes.std3;
    s.frame("std", pal, 1, 1, W / 8, 2);
    s.fill(8, 8, W, 16, [255, 255, 255]);
    const tw = s.textWidth(name);
    s.text(name, 8 + Math.floor((W - tw) / 2), 10, [98, 98, 98], [213, 213, 205]);
    return s.canvas();
  }
  function showAreaName(mapName) {
    mapName = mapName || me.map;
    const name = areaName(mapName);
    if (popup) { popup.next = [name, mapName]; popup.state = "out"; return; }
    popup = { canvas: popupCanvas(name, mapName), pos: 0, state: "in", t: 0, next: null };
  }
  function hideAreaName() { popup = null; }
  function updatePopup() {
    if (!popup) return;
    if (popup.state === "in") { popup.pos += 2; if (popup.pos >= 24) { popup.state = "hold"; popup.t = 0; } }
    else if (popup.state === "hold") { if (++popup.t > 120) popup.state = "out"; }
    else if (popup.state === "out") {
      popup.pos -= 2;
      if (popup.pos <= 0) {
        if (popup.next) popup = { canvas: popupCanvas(...popup.next), pos: 0, state: "in", t: 0, next: null };
        else popup = null;
      }
    }
  }
  function drawPopup() {
    if (popup) g.drawImage(popup.canvas, 0, 0, 240, 32, 0, popup.pos - 32, 240, 32);
  }

  function draw() {
    const m = World.map(me.map);
    // The player's position in pixels, mid-step included.
    let px = me.x * TILE, py = me.y * TILE, hop = 0;
    if (me.move && me.move.inPlace) hop = -JUMP_Y_LOW[Math.min(15, Math.floor(me.move.t))];
    else if (me.move) {
      const [dx, dy] = World.DIRS[me.move.dir];
      const t = Math.min(me.move.t, me.move.dist);
      // Mid-step the player is still in its old map's coordinates.
      const sx = me.move.tmap === me.map ? me.move.tx : me.x + dx * (me.move.jump ? 2 : 1);
      const sy = me.move.tmap === me.map ? me.move.ty : me.y + dy * (me.move.jump ? 2 : 1);
      px = (sx * TILE) - dx * (me.move.dist - t);
      py = (sy * TILE) - dy * (me.move.dist - t);
      if (me.move.bikeHop) hop = -JUMP_Y_LOW[Math.min(15, Math.floor(t))];
      else if (me.move.jump || me.move.dismount || me.move.hop) hop = Math.sin((t / me.move.dist) * Math.PI) * (me.move.jump ? 10 : 6);
    }
    const camX = px - PLAYER_X + panX, camY = py - PLAYER_Y + panY;

    g.fillStyle = "#000";
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // The border pattern fills everything outside the maps.
    const weatherKind = weatherOf(me.map), weatherFilter = WX ? WX.filter(weatherKind) : "";
    const shade = weatherKind === "shade" || !!weatherFilter;
    if (weatherFilter) SHADE = weatherFilter;
    if (shade) g.filter = SHADE;
    const border = mapImage(me.map, "border");
    if (ready(border)) {
      const bw = border.naturalWidth, bh = border.naturalHeight;
      const startX = Math.floor(camX / bw) * bw, startY = Math.floor(camY / bh) * bh;
      for (let y = startY; y < camY + VIEW_H; y += bh) for (let x = startX; x < camX + VIEW_W; x += bw) g.drawImage(border, x - camX, y - camY);
    }
    const layers = [[me.map, 0, 0]];
    for (const c of m.connections) {
      if (!c.map || !World.map(c.map)) continue;
      const [ox, oy] = World.connectionOrigin(m, c);
      layers.push([c.map, ox * TILE, oy * TILE]);
    }
    for (const [name, ox, oy] of layers) {
      const img = mapImage(name);
      if (ready(img)) g.drawImage(img, ox - camX, oy - camY);
      drawAnimCells(name, ox - camX, oy - camY);
      drawPatches(name, ox - camX, oy - camY, "");
      drawMetatiles(name, ox - camX, oy - camY, false);
      drawTracks(name, ox - camX, oy - camY);
      if (ctx.drawMap) ctx.drawMap(g, name, ox - camX, oy - camY);
    }
    g.filter = "none";
    drawFog(camX, camY);

    // People and the player, back to front.
    const emotes = [];
    // (`drawnOnMap`: someone the map's picture already shows, as Johto's Apricorn trees on Heart & Soul's maps.)
    // (Emerald's MOVEMENT_TYPE_INVISIBLE: there to talk to, Mr. Stone across his desk, but not drawn till a script shows them.)
    const sprites = people.filter((p) => !p.hidden && !p.def.drawnOnMap && !buried(p) && !(p.def.movement === "invisible" && !p.shown)).map((p) => {
      let x = p.x * TILE, y = p.y * TILE;
      if (p.move) {
        const [dx, dy] = World.DIRS[p.facing];
        x = p.move.tx * TILE - dx * (TILE - p.move.t);
        y = p.move.ty * TILE - dy * (TILE - p.move.t);
      }
      if (p.emote) emotes.push([p.emote, x - camX, y - camY - p.def.height + TILE]);
      const walking = (!!p.move && p.move.t < TILE / 2) || (p.inPlace > 0 && p.inPlace % 16 >= 8);
      const over = overTop(p, me.map, p.x, p.y, me.map, p.move ? p.move.tx : p.x, p.move ? p.move.ty : p.y);
      const sunk = !p.move && !p.def.inanimate ? sunkAt(me.map, p.x, p.y) : 0;
      // (Something on the floor, as the Ruins of Alph's stone panels: under everyone, offsetY down.)
      const pf = p.def.frame != null ? p.def.frame : frameFor(p.facing, walking, (p.x + p.y) & 1, p.def.frames), pflip = p.facing === "right" && p.def.frame == null;
      return { y: p.def.underfoot ? -Infinity : y, over, draw: () => { if (shade) g.filter = SHADE; drawSprite(p.def.sprite, p.def.width, p.def.height,
        pf, pflip, x - camX + spriteDx(p.def), y - camY + (p.def.offsetY || 0), sunk); g.filter = "none"; },
        refl: () => drawReflection(p.def.sprite, p.def.width, p.def.height, pf, pflip, x - camX + spriteDx(p.def), y - camY + (p.def.offsetY || 0),
          [[p.x, p.y]].concat(p.move ? [[p.move.tx, p.move.ty]] : []), camX, camY) };
    });
    for (const n of neighbours) {
      const x = (n.ox + n.x) * TILE, y = (n.oy + n.y) * TILE;
      if (x - camX < -TILE * 2 || x - camX > VIEW_W + TILE || y - camY < -TILE * 2 || y - camY > VIEW_H + TILE * 2) continue;
      sprites.push({ y, over: !!OVER_TOP[World.blockAt(n.map, n.x, n.y).elevation], draw: () => drawSprite(n.def.sprite, n.def.width, n.def.height,
        n.def.frame != null ? n.def.frame : frameFor(n.facing, false, 0, n.def.frames), n.facing === "right" && n.def.frame == null, x - camX + spriteDx(n.def), y - camY) });
    }
    const fol = followerSprite(camX, camY, shade);
    if (fol) sprites.push(fol);   // (before you: behind you, level with you)
    if (me.emote) emotes.push([me.emote, px - camX, py - camY - 16]);
    const look = "player_" + (ctx.player.look || "custom");
    let sheet = look, frame;
    if (me.move && me.move.run) {
      // FireRed's running sheet: a leaning pose for 5 frames, then a stride for 3.
      sheet = look + "_run";
      const pose = { down: 0, up: 3, left: 6, right: 6 }[me.facing];
      frame = me.move.t / RUN_SPEED < 5 ? pose : pose + 1 + me.parity;
    } else {
      frame = frameFor(me.facing, !!me.move && !me.move.slip && (me.move.t % TILE) < TILE / 2, me.parity, 9);
    }
    let w = 16, dx = 0, bob = 0;
    if (me.avatar === "bike") {
      // The Bicycle's sheet (32 wide): standing, and pedalling while moving.
      sheet = look + "_bike"; w = 32; dx = -8;
      frame = frameFor(me.facing, !!me.move && !me.move.bikeHop && (me.move.t % TILE) < TILE / 2, me.parity, 9);
      // Popping a wheelie, up on the back wheel, or hopping on it (rising
      // then up, each hop).
      const pose = me.lowering > 0 ? 0 : me.move && me.move.bikeHop ? (me.move.t < WHEELIE_RISE_FRAMES ? 0 : 1)
        : me.move && me.move.wheelie ? 1 : me.wheelie && !me.move ? (me.wheelie.t < WHEELIE_RISE_FRAMES ? 0 : 1) : null;
      if (pose != null && ready(spriteImage(look + "_wheelie"))) {
        sheet = look + "_wheelie";
        frame = { down: 0, up: 2, left: 4, right: 4 }[me.facing] + pose;
      }
    } else if (me.avatar === "dive") {
      // Under the water (Emerald's Brendan, diving): down, up or left.
      sheet = "em_brendan_underwater"; w = 32; dx = -8;
      frame = { down: 0, up: 1, left: 2, right: 2 }[me.facing];
      bob = Math.floor(performance.now() / 500) % 2;
    } else if (me.avatar === "surf") {
      // On the water: down, up or left, bobbing up and down a pixel.
      sheet = look + "_surf"; w = 32; dx = -8;
      frame = { down: 0, up: 2, left: 4, right: 4 }[me.facing];
      bob = Math.floor(performance.now() / 500) % 2;
    }
    let dy = 0;
    if (rod && me.avatar !== "surf") {
      // (Fishing on the water, you stay as you are on it.)
      const r = rodFrame();
      sheet = look + "_fish"; w = 32; frame = r.frame; dx = r.dx; dy = r.dy;
    }
    const meOver = overTop(me, me.map, me.x, me.y, me.move ? me.move.tmap || me.map : me.map, me.move ? me.move.tx : me.x, me.move ? me.move.ty : me.y);
    // (Up in the air on an Escape Rope: over everything once a tile up.)
    const lift = me.lift || 0;
    const meSunk = !me.move && me.avatar === "walk" && !lift ? sunkAt(me.map, me.x, me.y) : 0;
    if (!me.hidden && !(fly && fly.player !== undefined)) sprites.push({ y: py, over: meOver || lift >= 16, draw: () => drawSprite(sheet, w, 32, frame, me.facing === "right", px - camX + dx, py - camY - hop + bob + dy - lift, meSunk),
      refl: () => !lift && drawReflection(sheet, w, 32, frame, me.facing === "right", px - camX + dx, py - camY - hop + bob + dy,
        [[me.x, me.y]].concat(me.move && (me.move.tmap || me.map) === me.map ? [[me.move.tx, me.move.ty]] : []), camX, camY) });
    if (heal) drawHeal(camX, camY);   // the healing machine's balls and screen, under people
    for (const s of tallGrassSprites(camX, camY, shade)) sprites.push(s);
    sprites.forEach((s) => s.refl && s.refl());   // (their reflections in the water, under everyone)
    sprites.sort((a, b) => a.y - b.y);
    sprites.filter((s) => !s.over).forEach((s) => s.draw());

    if (shade) g.filter = SHADE;
    for (const [name, ox, oy] of layers) {
      const m = World.map(name);
      if (!m.top) continue;
      const img = mapImage(name, "top");
      if (ready(img)) {
        // (Where a patch with its own top layer is on, the map's own top
        // layer stays out of its way: no chair tops over a patched floor; nor
        // over a tile a script has put in: Desert Ruins' sealed doorway.)
        const on = m.patches && ctx.patches ? ctx.patches(name).map((p) => m.patches[p]).filter((pt) => pt && pt.top) : [];
        const set = (ctx && ctx.metatiles && ctx.metatiles(name)) || [];
        if (on.length || set.length) {
          g.save();
          g.beginPath();
          g.rect(0, 0, canvas.width, canvas.height);
          for (const pt of on) g.rect(ox - camX + pt.x * TILE, oy - camY + pt.y * TILE, pt.w * TILE, pt.h * TILE);
          for (const [x, y] of set) g.rect(ox - camX + x * TILE, oy - camY + y * TILE, TILE, TILE);
          g.clip("evenodd");
          g.drawImage(img, ox - camX, oy - camY);
          g.restore();
        } else g.drawImage(img, ox - camX, oy - camY);
      }
      drawPatches(name, ox - camX, oy - camY, "-top");
      drawMetatiles(name, ox - camX, oy - camY, true);
    }
    g.filter = "none";
    // (Those up on raised ground, over the top layer.)
    sprites.filter((s) => s.over).forEach((s) => s.draw());
    drawDarkness(px - camX, py - camY, camX, camY);
    if (WX) WX.draw(weatherKind);
    if (fly) drawFly();
    // "!", "!!", "?" and "×" bubbles over someone's head.
    for (const [e, x, y] of emotes) {
      g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 1;
      g.fillRect(x + 3.5, y - 13.5, 10, 12); g.strokeRect(x + 3.5, y - 13.5, 10, 12);
      g.fillStyle = e.mark === "!" || e.mark === "!!" ? "#d0302f" : e.mark === "×" ? "#404040" : "#2b6fd6";
      g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(e.mark, x + 8.5, y - 7);
    }
    drawPopup();
    if (transition) drawTransition();
    else if (blackedOut) { g.fillStyle = "#000"; g.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (fade) {
      g.fillStyle = "rgba(0,0,0," + fade / FADE_FRAMES + ")";
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  let last = 0, acc = 0;
  function frame(now) {
    if (!running) return;
    acc += Math.min(100, now - (last || now));
    last = now;
    while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
    draw();
    requestAnimationFrame(frame);
  }

  function finish(event) {
    hideAreaName();
    // (Where you stand and which way you face now: a turn on the spot isn't a
    // step, and explore() would otherwise turn you back the old way after.)
    if (ctx && me.map && !me.move) savePosition();
    const r = resolveExplore;
    resolveExplore = null;
    paused = true;
    held.clear();
    pressedA = pressedMenu = pressedSelect = false;
    if (r) r(event);
  }

  // ---------- API ----------

  // Shows the world and lets the player walk until something needs the game.
  async function explore(context) {
    ctx = context;
    const loc = ctx.player.location;
    const sameMap = me.map === loc.map;
    me.map = loc.map; me.x = loc.x; me.y = loc.y; me.facing = loc.facing || me.facing || "down"; me.move = null;
    me.hidden = false; me.emote = null;
    me.wheelie = null; me.hopping = false; me.hopHeld = 0; me.lowering = 0;
    me.avatar = (ctx.player.flags && ctx.player.flags.avatar) || "walk";
    checkAvatar();
    if (!sameMap) checkLight();
    blackedOut = false;
    if (fade && !fadeDir) fadeDir = -1;
    // Re-check who's visible (a story event may have changed that), keeping
    // people where they were if we never left the map.
    const before = new Map(people.map((p) => [p.def.id, p]));
    loadPeople();
    // (The follower: who it is now, and still where it was if it's beside you.)
    followerLook();
    if (!sameMap || Math.abs(pal.x - me.x) + Math.abs(pal.y - me.y) > 1) tuckFollower();
    if (sameMap) {
      people = people.map((p) => {
        const old = before.get(p.def.id);
        return old && old.ox === p.ox && old.oy === p.oy ? Object.assign(old, { def: p.def }) : p;
      });
    }
    const look = "player_" + (ctx.player.look || "custom");
    await Promise.all([preloadMap(me.map), ...["_run", "_bike", "_wheelie", "_surf", "_fish"].map((k) => spriteImage(look + k).loaded), spriteImage("em_brendan_underwater").loaded]);
    showControls();
    hint();
    ignoreInputUntil = performance.now() + 200;
    paused = false;
    if (!running) {
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    return new Promise((resolve) => { resolveExplore = resolve; });
  }

  // Shows the map again (after a battle in the middle of a scene) without
  // handing control back: the scene carries on, then explore() resumes.
  function resume() {
    blackedOut = false;
    paused = true;
    if (!running) {
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    }
    hint();
    return preloadMap(me.map);
  }

  // Stops drawing (while a battle or menu has the screen).
  function hide() {
    running = false;
    paused = true;
  }

  window.Overworld = {
    explore, hide, read: (pages) => read(pages), showAreaName, forceStep, refreshPeople: () => loadPeople(),
    act, addObject, removeObject, unbury: (def) => { for (const p of people) if (p.def.id === def.id && p.def.script === def.script) p.unburied = true; }, removePerson, teleport, battleTransition, resume, pokecenterHeal, flyOut, flyIn, escapeRopeOut, escapeRopeIn,
    fadeToBlack: fadeOut, fadeFromBlack: fadeIn, shake,
    setAvatar, avatar: () => me.avatar, bikeFastest: () => me.avatar === "bike" && (me.bikeRun || 0) >= BIKE_SPEEDS.length - 1, flash, follower: followerApi, rod: setRod, emote: (mark) => { me.emote = mark ? { mark } : null; }, isDark: () => light != null && !flashOn,
    // What's in front of you: the tile, whoever stands there, and whether
    // it's water you could start surfing on.
    ahead: () => {
      const [dx, dy] = World.DIRS[me.facing], x = me.x + dx, y = me.y + dy, p = personAt(x, y);
      return { map: me.map, x, y, facing: me.facing, person: p ? p.def : null, behavior: World.blockAt(me.map, x, y).behavior,
        water: me.avatar !== "surf" && World.facingWater({ map: me.map, x: me.x, y: me.y }, me.facing, occupiedForPlayer),
        // (Somewhere a rod can be cast: FireRed's CanFish.)
        fishable: World.canFish({ map: me.map, x: me.x, y: me.y }, me.facing, me.avatar === "surf", occupiedForPlayer) };
    },
    position: () => ({ map: me.map, x: me.x, y: me.y, facing: me.facing }),
    // (Walking about, waiting for you: nothing on screen, no step under way. For the browser tests.)
    idle: () => !!resolveExplore && !paused && !me.move && !fade,
    // Everyone on the map now, where they stand (the VS Seeker looks around).
    people: () => people.filter((p) => !p.hidden).map((p) => ({ def: p.def, x: p.x, y: p.y, facing: p.facing })),
    // Stops someone where they stand, facing `facing` (a trainer the VS Seeker
    // found wanting a rematch: FireRed turns their movement into facing one way).
    lockPerson: (id, facing) => {
      const p = people.find((q) => q.def.id === id);
      if (p) { p.def = Object.assign({}, p.def, { movement: "face_" + facing }); p.facing = facing; }
    },
    // Someone (by local id) takes a step `dir` now, whatever's there (Faraway
    // Island's Mew, moving as you do); or just turns, with `turnOnly`.
    stepPerson: (localId, dir, turnOnly) => {
      const p = people.find((q) => q.def.localId === localId);
      if (!p || p.move) return;
      p.facing = dir;
      if (turnOnly) return;
      const [dx, dy] = World.DIRS[dir];
      p.move = { tx: p.x + dx, ty: p.y + dy, t: 0 };
    },
    // Someone (by local id) hidden or shown: still there, still in the way.
    // (A script's new movement type for someone already on the map: Emerald's setobjectmovementtype.)
    setPersonMovement: (localId, movement) => {
      const p = people.find((q) => q.def.localId === localId);
      if (!p || p.def.movement === movement) return;
      p.def = Object.assign({}, p.def, { movement }); p.ox = p.x; p.oy = p.y; p.seq = 0; p.timer = 30;
      const f = /^face_(up|down|left|right)$/.exec(movement);
      if (f) p.facing = f[1];
    },
    setPersonHidden: (localId, hidden) => { const p = people.find((q) => q.def.localId === localId); if (p) p.hidden = !!hidden; },
    // Where someone on the map (by local id) stands, or null.
    personPosition: (localId) => { const p = people.find((q) => q.def.localId === localId); return p ? { x: p.x, y: p.y, facing: p.facing } : null; },
    // The player set down on a tile of this map (a script's setobjectxy on them), with no fading.
    moveTo: (x, y, facing) => { me.x = x; me.y = y; if (facing) me.facing = facing; me.move = null; tuckFollower(); savePosition(); },
    // (For tests: who's on the map and its neighbours.)
    debugPeople: () => ({ people: people.map((p) => [p.def.localId, p.x, p.y, p.def.sprite]), neighbours: neighbours.map((n) => [n.map, n.def.localId, n.x + n.ox, n.y + n.oy, n.def.sprite]) })
  };
})();
