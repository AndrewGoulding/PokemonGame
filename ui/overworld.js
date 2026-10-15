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
//   { type: "select" }                        Select (the registered key item)
// Plain signs and people just show their text here.
//
// ctx: { player (the save: location, name), special(script) -> bool,
//        visible(person, mapName) -> bool, rivalName, onMap(mapName) (each time a map's people load: its music),
//        trainerWaiting(person) -> bool (not beaten yet),
//        hiddenItem(hidden) -> bool (not found yet), canRun() -> bool,
//        onWarp(from, to) when you go through a door, cave or stairs,
//        canSurf() -> bool, strength() -> bool (boulders can be pushed),
//        onAvatar(mode) when you get on or off the Bicycle or the water }
//
// The player is walking, on the Bicycle or surfing (Overworld.setAvatar;
// kept in player.flags.avatar). The Bicycle goes faster and only where the
// map allows cycling; surfing goes over water, and onto land you hop off.
//
// Controls: arrows / WASD to move, Shift (or B / X) toggles running, Z / Space / Enter
// to talk or read, Esc / M (Start) to open the menu. The on-screen buttons
// (ui/gamepad.js) press the same keys.

(function () {
  "use strict";

  const TILE = 16, VIEW_W = 240, VIEW_H = 160;
  const PLAYER_X = 112, PLAYER_Y = 64;   // where the player stands on screen (top-left of its tile)
  const WALK_SPEED = 1, RUN_SPEED = 2;   // pixels per frame (60 frames a second)
  const SURF_SPEED = 2;   // (PLAYER_SPEED_FAST)
  // The Bicycle goes like Emerald's Mach Bike (sMachBikeSpeedCallbacks): it
  // picks up speed tile by tile going straight, walking pace, then running,
  // then a tile in 4 frames, and starts over when you stop or turn.
  const BIKE_SPEEDS = [1, 2, 4];
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
  const mapImage = (name, part) => image("assets/world/maps/" + name + (part ? "-" + part : "") + ".png");
  const spriteImage = (name) => image("assets/world/sprites/" + name + ".png");

  // FireRed's tile animations (TilesetAnim_General): a counter of frames
  // (60 a second) going round 640; the sand's water edge takes its next frame
  // every 8, the water every 16 (one frame later), the flowers every 16 (two
  // later). -> each anim's frame now.
  const TILE_ANIMS = { water: { every: 16, at: 1, frames: 8 }, sand: { every: 8, at: 0, frames: 8 }, flower: { every: 16, at: 2, frames: 5 } };
  function animFrame(name) {
    const a = TILE_ANIMS[name], c = Math.floor(performance.now() / (1000 / 60)) % 640;
    return a ? Math.floor(((c - a.at + 640) % 640) / a.every) % a.frames : 0;
  }
  // A map's animated 8x8 cells (tools/build-maps.js animCells) over its picture
  // at (x0, y0) on screen, in their current frames.
  function drawAnimCells(name, x0, y0) {
    const m = World.map(name), sheet = m && m.anim && mapImage(name, "anim");
    if (!sheet || !ready(sheet)) return;
    const frames = m.anim.anims.map(animFrame), counts = m.anim.anims.map((n) => (TILE_ANIMS[n] || { frames: 1 }).frames);
    const cells = m.anim.cells;
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
    }
  }

  function preloadMap(name) {
    const m = World.map(name);
    const list = [mapImage(name), mapImage(name, "border")];
    if (m.top) list.push(mapImage(name, "top"));
    if (m.anim) list.push(mapImage(name, "anim"));
    for (const p of Object.keys(m.patches || {})) list.push(mapImage(name, "patch-" + p));
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
  document.addEventListener("keydown", (e) => {
    if (!running || paused || e.repeat || !["Shift", "x", "X", "b", "B"].includes(e.key)) return;
    toggleRun();
    e.preventDefault();
  });

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

  const personAt = (x, y) => people.find((p) => (p.x === x && p.y === y) || (p.move && p.move.tx === x && p.move.ty === y));
  const occupiedForPlayer = (mapName, x, y) => (mapName === me.map ? !!personAt(x, y)
    : neighbours.some((n) => n.map === mapName && n.x === x && n.y === y));

  const WANDER_DIRS = {
    wander_around: ["up", "down", "left", "right"], wander_up_and_down: ["up", "down"],
    wander_left_and_right: ["left", "right"]
  };

  // ---------- Trainers ----------
  //
  // As in FireRed: a trainer you haven't beaten sees you when you're straight
  // ahead of them, within their sight range, with nothing in between.

  function trainerSees(p) {
    const t = p.def.trainer;
    if (!t || !t.sight || p.move || p.hidden || !ctx.trainerWaiting || !ctx.trainerWaiting(p.def)) return null;
    const [dx, dy] = World.DIRS[p.facing];
    const blocked = (mapName, x, y) => mapName === me.map && !!personAt(x, y);
    for (let d = 1; d <= t.sight; d++) {
      const x = p.x + dx * d, y = p.y + dy * d;
      if (x === me.x && y === me.y) return { type: "trainer", person: p.def, map: me.map, approach: d - 1, facing: p.facing };
      const r = World.step({ map: me.map, x: x - dx, y: y - dy }, p.facing, blocked);
      if (!r.ok || r.jump || r.map !== me.map) return null;
    }
    return null;
  }
  function anyTrainerSees() {
    for (const p of people) {
      const seen = trainerSees(p);
      if (seen) return seen;
    }
    return null;
  }

  function updatePerson(p) {
    if (p.move) {
      p.move.t += p.move.speed || WALK_SPEED;
      if (p.move.t >= TILE) {
        p.x = p.move.tx; p.y = p.move.ty; p.move = null;
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
    if ((tx === me.x && ty === me.y) || (me.move && me.move.tx === tx && me.move.ty === ty) || personAt(tx, ty)) return;
    const r = World.step({ map: me.map, x: p.x, y: p.y }, dir);
    if (!r.ok || r.map !== me.map || r.jump || r.warp || World.warpAt(me.map, tx, ty)) return;
    p.move = { tx, ty, t: 0 };
  }

  // ---------- Player movement ----------

  function startStep(r, dir) {
    // (ctx.canRun can restrict running, e.g. to after FireRed's Running Shoes.)
    const run = !r.jump && me.avatar === "walk" && runHeld() && (!ctx.canRun || ctx.canRun());
    if (me.avatar === "bike") { me.bikeRun = dir === me.bikeDir ? (me.bikeRun || 0) + 1 : 0; me.bikeDir = dir; }
    const speed = me.avatar === "bike" ? BIKE_SPEEDS[Math.min(me.bikeRun, BIKE_SPEEDS.length - 1)]
      : me.avatar === "surf" ? SURF_SPEED : run ? RUN_SPEED : WALK_SPEED;
    me.move = { tx: r.x, ty: r.y, tmap: r.map, dir, t: 0, jump: !!r.jump, warp: r.warp || null, run,
      dismount: !!r.dismount, dist: r.jump ? TILE * 2 : TILE, speed: r.dismount ? WALK_SPEED * 2 : speed };
    me.parity ^= 1;
  }

  // ---------- Walking, cycling, surfing ----------

  function setAvatar(mode) {
    if (me.avatar === mode) return;
    me.avatar = mode;
    if (ctx && ctx.player) ctx.player.flags.avatar = mode === "walk" ? undefined : mode;
    if (ctx && ctx.onAvatar) ctx.onAvatar(mode);
  }
  // Off the Bicycle where cycling isn't allowed (going indoors), and off the
  // water when you aren't on any (a warp, a scene's teleport).
  function checkAvatar() {
    const m = World.map(me.map);
    if (me.avatar === "bike" && !(m && m.cycling)) setAvatar("walk");
    if (me.avatar === "surf" && !World.isSurfable(World.blockAt(me.map, me.x, me.y).behavior)) setAvatar("walk");
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
    if (!r.ok || r.jump || r.warp || r.map !== me.map) return false;
    b.move = { tx: r.x, ty: r.y, t: 0, speed: WALK_SPEED };
    b.facing = dir;
    if (window.GameAudio) window.GameAudio.se("se_m_strength");
    return true;
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
  function drawDarkness(px, py) {
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
    if (mv.dismount) setAvatar("walk");
    const changedMap = mv.tmap !== me.map, from = me.map;
    me.map = mv.tmap; me.x = mv.tx; me.y = mv.ty;
    if (changedMap) {
      checkAvatar(); checkLight();
      loadPeople(); preloadMap(me.map); hint();
      if (!mv.warp && areaOf(from) !== areaOf(me.map)) showAreaName(me.map);
    }
    savePosition();
    if (mv.warp) { warpTo(mv.warp); return; }
    const seen = anyTrainerSees();
    if (seen) return finish(seen);
    for (const t of World.triggersAt(me.map, me.x, me.y)) {
      if (ctx.special && ctx.special(t.script)) return finish({ type: "trigger", trigger: t, map: me.map });
    }
    // Each step (e.g. a Repel counting down) may have something to say.
    const said = ctx.onStep && ctx.onStep();
    if (said) return finish(said);
    const wild = World.stepEncounter(wildState, me.map, me.x, me.y, {
      allow: ctx.allowWild, repel: !!(ctx.player && ctx.player.repelSteps > 0),
      surf: me.avatar === "surf", bike: me.avatar === "bike" });
    if (wild) finish(Object.assign({ type: "wild" }, wild));
  }

  function savePosition() {
    ctx.player.location = { map: me.map, x: me.x, y: me.y, facing: me.facing };
  }

  function warpTo(target) {
    paused = true;
    if (ctx.onWarp) ctx.onWarp({ map: me.map, x: me.x, y: me.y }, target);
    fadeDir = 1;
    afterFade = async () => {
      me.map = target.map; me.x = target.x; me.y = target.y;
      if (target.door) me.facing = "down";
      hideAreaName();
      if (World.map(me.map).showName) showAreaName(me.map);
      checkAvatar(); checkLight();
      loadPeople();
      await preloadMap(me.map);
      savePosition();
      hint();
      fadeDir = -1;
      afterFade = () => {
        paused = false;
        // Scenes that start as you walk in (the Viridian Mart clerk's parcel).
        if (ctx.special && ctx.special("enter:" + me.map)) return finish({ type: "trigger", trigger: { script: "enter:" + me.map }, map: me.map });
        const seen = anyTrainerSees();
        if (seen) return finish(seen);
        // Coming out of a door: step out onto the street.
        if (target.door) {
          const r = World.step({ map: me.map, x: me.x, y: me.y }, "down", occupiedForPlayer);
          if (r.ok) startStep(r, "down");
        }
      };
    };
  }

  // A scripted nudge, e.g. Oak sending you back from the tall grass.
  function forceStep(dir) {
    me.facing = dir;
    const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer);
    if (r.ok) { me.map = r.map; me.x = r.x; me.y = r.y; savePosition(); }
  }

  // ---------- Cutscenes ----------
  //
  // FireRed movement scripts (walk_up, walk_in_place_faster_down, delay_16,
  // emote_exclamation_mark, set_invisible ...) played for the player and people
  // side by side, like applymovement ... waitmovement.

  let scene = null;   // { tracks: [{ who, moves, i, wait }], resolve }

  // "player", a person's local id, or "#<id>" (their place in the map's list).
  const actor = (who) => (who === "player" ? me : people.find((p) => p.def.localId === who || "#" + p.def.id === who));
  const SPEEDS = { "": WALK_SPEED, fast_: 2, faster_: 4, fastest_: 8, slow_: 0.5 };

  // Starts a movement command; returns how many frames to wait on top of any step.
  function startCommand(who, cmd) {
    const a = actor(who);
    if (!a) return 0;
    let m;
    if ((m = /^walk_(fast_|faster_|fastest_|slow_)?(up|down|left|right)$/.exec(cmd))) {
      const dir = m[2], [dx, dy] = World.DIRS[dir], speed = SPEEDS[m[1] || ""];
      a.facing = dir;
      if (a === me) { me.move = { tx: me.x + dx, ty: me.y + dy, tmap: me.map, dir, t: 0, dist: TILE, speed, scripted: true }; me.parity ^= 1; }
      else a.move = { tx: a.x + dx, ty: a.y + dy, t: 0, speed };
      return 0;
    }
    // A hop one tile (FireRed's jump_*: onto the water to Surf).
    if ((m = /^jump_(up|down|left|right)$/.exec(cmd))) {
      const dir = m[1], [dx, dy] = World.DIRS[dir];
      a.facing = dir;
      if (a === me) me.move = { tx: me.x + dx, ty: me.y + dy, tmap: me.map, dir, t: 0, dist: TILE, speed: WALK_SPEED * 2, hop: true, scripted: true };
      else { a.x += dx; a.y += dy; }
      return 0;
    }
    if ((m = /^jump_2_(up|down|left|right)$/.exec(cmd))) {
      const dir = m[1], [dx, dy] = World.DIRS[dir];
      a.facing = dir;
      if (a === me) me.move = { tx: me.x + dx * 2, ty: me.y + dy * 2, tmap: me.map, dir, t: 0, dist: TILE * 2, speed: WALK_SPEED, jump: true, scripted: true };
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
    if (cmd === "set_invisible") { a.hidden = true; return 0; }
    if (cmd === "set_visible") { a.hidden = false; return 0; }
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
    if (!busy) { const done = scene.resolve; scene = null; savePosition(); done(); }   // keep any turn in place
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
    me.move = null; me.hidden = false; me.emote = null;
    checkAvatar(); checkLight();
    loadPeople();
    await preloadMap(me.map);
    savePosition();
    hint();
    await new Promise((resolve) => { fadeDir = -1; afterFade = resolve; });
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
    // Water you could Surf on, or (surfing) a waterfall.
    if (me.avatar === "surf") {
      if (World.blockAt(me.map, me.x + dx, me.y + dy).behavior === World.MB.WATERFALL) return finish({ type: "waterfall", map: me.map });
    } else if (World.facingWater({ map: me.map, x: me.x, y: me.y }, me.facing, occupiedForPlayer) && ctx.canSurf && ctx.canSurf()) {
      return finish({ type: "water", map: me.map });
    }
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

  function update() {
    updatePopup();
    if (heal) updateHeal();
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
    if (light != null && light < lightTarget) light = Math.min(lightTarget, light + 4);
    for (const p of people) updatePerson(p);
    if (scene) runScene();
    if (me.move) {
      me.move.t += me.move.speed;
      if (me.move.t >= me.move.dist) {
        if (me.move.scripted) { me.x = me.move.tx; me.y = me.move.ty; me.move = null; savePosition(); }
        else { finishStep(); me.moving = true; }
      }
      return;
    }
    // Still on the move from last frame: turning doesn't stop you (Gen 3).
    const wasMoving = me.moving;
    me.moving = false;
    if (paused || !resolveExplore) return;
    if (pressedMenu) { pressedMenu = false; return finish({ type: "menu" }); }
    if (pressedSelect) { pressedSelect = false; return finish({ type: "select" }); }
    if (pressedA) { pressedA = false; return interact(); }
    const dir = heldDir();
    if (!dir) { me.turnTimer = 0; me.bikeDir = null; return; }
    if (dir !== me.facing && !wasMoving) { me.facing = dir; me.turnTimer = TURN_FRAMES; return; }
    me.facing = dir;
    if (me.turnTimer > 0) { me.turnTimer--; return; }
    const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer, { surf: me.avatar === "surf" });
    if (r.warp && !r.ok) { warpTo(r.warp); return; }
    if (r.ok) { startStep(r, dir); return; }
    me.bikeDir = null;   // (a bump stops the Bicycle)
    if (tryPushBoulder(dir)) { me.turnTimer = TILE; return; }
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

  // Frame index in a FireRed overworld sheet: 0-2 standing (down, up, left),
  // 3-4 walking down, 5-6 up, 7-8 left. Right is left mirrored.
  function frameFor(facing, walking, parity, frames) {
    const stand = { down: 0, up: 1, left: 2, right: 2 }[facing];
    if (!walking || frames < 9) return Math.min(stand, frames - 1);
    return { down: 3, up: 5, left: 7, right: 7 }[facing] + parity;
  }

  function drawSprite(name, w, h, frame, flip, px, py) {
    const img = spriteImage(name);
    if (!ready(img)) return;
    const x = Math.round(px), y = Math.round(py + TILE - h);
    if (flip) {
      g.save();
      g.translate(x + w, y);
      g.scale(-1, 1);
      g.drawImage(img, frame * w, 0, w, h, 0, 0, w, h);
      g.restore();
    } else {
      g.drawImage(img, frame * w, 0, w, h, x, y, w, h);
    }
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
    if (me.move) {
      const [dx, dy] = World.DIRS[me.move.dir];
      const t = Math.min(me.move.t, me.move.dist);
      // Mid-step the player is still in its old map's coordinates.
      const sx = me.move.tmap === me.map ? me.move.tx : me.x + dx * (me.move.jump ? 2 : 1);
      const sy = me.move.tmap === me.map ? me.move.ty : me.y + dy * (me.move.jump ? 2 : 1);
      px = (sx * TILE) - dx * (me.move.dist - t);
      py = (sy * TILE) - dy * (me.move.dist - t);
      if (me.move.jump || me.move.dismount || me.move.hop) hop = Math.sin((t / me.move.dist) * Math.PI) * (me.move.jump ? 10 : 6);
    }
    const camX = px - PLAYER_X, camY = py - PLAYER_Y;

    g.fillStyle = "#000";
    g.fillRect(0, 0, VIEW_W, VIEW_H);
    // The border pattern fills everything outside the maps.
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
    }

    // People and the player, back to front.
    const emotes = [];
    const sprites = people.filter((p) => !p.hidden).map((p) => {
      let x = p.x * TILE, y = p.y * TILE;
      if (p.move) {
        const [dx, dy] = World.DIRS[p.facing];
        x = p.move.tx * TILE - dx * (TILE - p.move.t);
        y = p.move.ty * TILE - dy * (TILE - p.move.t);
      }
      if (p.emote) emotes.push([p.emote, x - camX, y - camY - p.def.height + TILE]);
      const walking = (!!p.move && p.move.t < TILE / 2) || (p.inPlace > 0 && p.inPlace % 16 >= 8);
      return { y, draw: () => drawSprite(p.def.sprite, p.def.width, p.def.height,
        frameFor(p.facing, walking, (p.x + p.y) & 1, p.def.frames), p.facing === "right", x - camX, y - camY) };
    });
    for (const n of neighbours) {
      const x = (n.ox + n.x) * TILE, y = (n.oy + n.y) * TILE;
      if (x - camX < -TILE * 2 || x - camX > VIEW_W + TILE || y - camY < -TILE * 2 || y - camY > VIEW_H + TILE * 2) continue;
      sprites.push({ y, draw: () => drawSprite(n.def.sprite, n.def.width, n.def.height,
        frameFor(n.facing, false, 0, n.def.frames), n.facing === "right", x - camX, y - camY) });
    }
    if (me.emote) emotes.push([me.emote, px - camX, py - camY - 16]);
    const look = "player_" + (ctx.player.look || "custom");
    let sheet = look, frame;
    if (me.move && me.move.run) {
      // FireRed's running sheet: a leaning pose for 5 frames, then a stride for 3.
      sheet = look + "_run";
      const pose = { down: 0, up: 3, left: 6, right: 6 }[me.facing];
      frame = me.move.t / RUN_SPEED < 5 ? pose : pose + 1 + me.parity;
    } else {
      frame = frameFor(me.facing, !!me.move && (me.move.t % TILE) < TILE / 2, me.parity, 9);
    }
    let w = 16, dx = 0, bob = 0;
    if (me.avatar === "bike") {
      // The Bicycle's sheet (32 wide): standing, and pedalling while moving.
      sheet = look + "_bike"; w = 32; dx = -8;
      frame = frameFor(me.facing, !!me.move && (me.move.t % TILE) < TILE / 2, me.parity, 9);
    } else if (me.avatar === "surf") {
      // On the water: down, up or left, bobbing up and down a pixel.
      sheet = look + "_surf"; w = 32; dx = -8;
      frame = { down: 0, up: 2, left: 4, right: 4 }[me.facing];
      bob = Math.floor(performance.now() / 500) % 2;
    }
    if (!me.hidden) sprites.push({ y: py, draw: () => drawSprite(sheet, w, 32, frame, me.facing === "right", px - camX + dx, py - camY - hop + bob) });
    if (heal) drawHeal(camX, camY);   // the healing machine's balls and screen, under people
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());

    for (const [name, ox, oy] of layers) {
      if (!World.map(name).top) continue;
      const img = mapImage(name, "top");
      if (ready(img)) g.drawImage(img, ox - camX, oy - camY);
      drawPatches(name, ox - camX, oy - camY, "-top");
    }
    drawDarkness(px - camX, py - camY);
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
    me.avatar = (ctx.player.flags && ctx.player.flags.avatar) || "walk";
    checkAvatar();
    if (!sameMap) checkLight();
    blackedOut = false;
    if (fade && !fadeDir) fadeDir = -1;
    // Re-check who's visible (a story event may have changed that), keeping
    // people where they were if we never left the map.
    const before = new Map(people.map((p) => [p.def.id, p]));
    loadPeople();
    if (sameMap) {
      people = people.map((p) => {
        const old = before.get(p.def.id);
        return old && old.ox === p.ox && old.oy === p.oy ? Object.assign(old, { def: p.def }) : p;
      });
    }
    const look = "player_" + (ctx.player.look || "custom");
    await Promise.all([preloadMap(me.map), ...["_run", "_bike", "_surf"].map((k) => spriteImage(look + k).loaded)]);
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
    act, addObject, removeObject, removePerson, teleport, battleTransition, resume, pokecenterHeal,
    fadeToBlack: fadeOut, fadeFromBlack: fadeIn,
    setAvatar, avatar: () => me.avatar, flash, isDark: () => light != null && !flashOn,
    // What's in front of you: the tile, whoever stands there, and whether
    // it's water you could start surfing on.
    ahead: () => {
      const [dx, dy] = World.DIRS[me.facing], x = me.x + dx, y = me.y + dy, p = personAt(x, y);
      return { map: me.map, x, y, facing: me.facing, person: p ? p.def : null, behavior: World.blockAt(me.map, x, y).behavior,
        water: me.avatar !== "surf" && World.facingWater({ map: me.map, x: me.x, y: me.y }, me.facing, occupiedForPlayer) };
    },
    position: () => ({ map: me.map, x: me.x, y: me.y, facing: me.facing }),
    // Everyone on the map now, where they stand (the VS Seeker looks around).
    people: () => people.filter((p) => !p.hidden).map((p) => ({ def: p.def, x: p.x, y: p.y, facing: p.facing })),
    // Stops someone where they stand, facing `facing` (a trainer the VS Seeker
    // found wanting a rematch: FireRed turns their movement into facing one way).
    lockPerson: (id, facing) => {
      const p = people.find((q) => q.def.id === id);
      if (p) { p.def = Object.assign({}, p.def, { movement: "face_" + facing }); p.facing = facing; }
    },
    // Where someone on the map (by local id) stands, or null.
    personPosition: (localId) => { const p = people.find((q) => q.def.localId === localId); return p ? { x: p.x, y: p.y, facing: p.facing } : null; }
  };
})();
