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
// Plain signs and people just show their text here.
//
// ctx: { player (the save: location, name), special(script) -> bool,
//        visible(person, mapName) -> bool, rivalName }
//
// Controls: arrows / WASD to move, hold Shift (or B / X) to run, Z / Space / Enter
// to talk or read, Esc / M to open the menu. On touch screens, the D-pad and
// buttons under the text box do the same.

(function () {
  "use strict";

  const TILE = 16, VIEW_W = 240, VIEW_H = 160;
  const PLAYER_X = 112, PLAYER_Y = 64;   // where the player stands on screen (top-left of its tile)
  const WALK_SPEED = 1, RUN_SPEED = 2;   // pixels per frame (60 frames a second)
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

  function preloadMap(name) {
    const m = World.map(name);
    const list = [mapImage(name), mapImage(name, "border")];
    if (m.top) list.push(mapImage(name, "top"));
    for (const c of m.connections) if (c.map) list.push(mapImage(c.map), mapImage(c.map, "top"));
    for (const p of m.people) { list.push(spriteImage(p.sprite)); if (p.alt) list.push(spriteImage(p.alt.sprite)); }
    return Promise.all(list.map((img) => img.loaded));
  }

  // ---------- State ----------

  let ctx = null;
  let resolveExplore = null;
  let paused = true;
  let running = false;

  // The player: tile position, facing, and the step in progress.
  const me = { map: null, x: 0, y: 0, facing: "down", move: null, turnTimer: 0, parity: 0 };
  let people = [];          // people on the current map: { def, x, y, facing, move, timer }
  let fade = 0, fadeDir = 0, afterFade = null;
  let bumpMessageAt = 0;

  // ---------- Input ----------

  const held = new Set();
  let touchDir = null, touchRun = false;
  let pressedA = false, pressedMenu = false;
  let ignoreInputUntil = 0;

  const KEY_DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };

  document.addEventListener("keydown", (e) => {
    if (!running || paused) return;
    if (KEY_DIRS[e.key]) { held.add(KEY_DIRS[e.key]); e.preventDefault(); }
    if (performance.now() < ignoreInputUntil || e.repeat) return;
    if (["z", "Z", " ", "Enter"].includes(e.key)) { pressedA = true; e.preventDefault(); }
    if (["Escape", "m", "M"].includes(e.key)) { pressedMenu = true; e.preventDefault(); }
  });
  document.addEventListener("keyup", (e) => { if (KEY_DIRS[e.key]) held.delete(KEY_DIRS[e.key]); });
  window.addEventListener("blur", () => { held.clear(); touchDir = null; });

  const runHeld = () => touchRun || keyRun;
  let keyRun = false;
  document.addEventListener("keydown", (e) => { if (e.key === "Shift" || e.key === "x" || e.key === "X" || e.key === "b" || e.key === "B") keyRun = true; });
  document.addEventListener("keyup", (e) => { if (e.key === "Shift" || e.key === "x" || e.key === "X" || e.key === "b" || e.key === "B") keyRun = false; });

  function heldDir() {
    if (touchDir) return touchDir;
    const order = ["up", "down", "left", "right"];
    return order.find((d) => held.has(d)) || null;
  }

  // On-screen controls under the text box.
  function showControls() {
    menu.innerHTML = '<div class="pad">' +
      '<button type="button" class="pad-btn up" data-dir="up" aria-label="Up">▲</button>' +
      '<button type="button" class="pad-btn left" data-dir="left" aria-label="Left">◀</button>' +
      '<button type="button" class="pad-btn right" data-dir="right" aria-label="Right">▶</button>' +
      '<button type="button" class="pad-btn down" data-dir="down" aria-label="Down">▼</button>' +
      '</div><div class="pad-actions">' +
      '<button type="button" class="pad-a" aria-label="Talk / read (A)">A</button>' +
      '<button type="button" class="pad-run" aria-label="Run (B)" aria-pressed="false">Run</button>' +
      '<button type="button" class="pad-menu">Menu</button></div>';
    for (const b of menu.querySelectorAll("[data-dir]")) {
      const dir = b.dataset.dir;
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); touchDir = dir; b.setPointerCapture(e.pointerId); });
      const up = () => { if (touchDir === dir) touchDir = null; };
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
    }
    menu.querySelector(".pad-a").addEventListener("click", () => { if (!paused) pressedA = true; });
    menu.querySelector(".pad-menu").addEventListener("click", () => { if (!paused) pressedMenu = true; });
    const run = menu.querySelector(".pad-run");
    run.classList.toggle("on", touchRun);
    run.setAttribute("aria-pressed", String(touchRun));
    run.addEventListener("click", () => {
      touchRun = !touchRun;
      run.classList.toggle("on", touchRun);
      run.setAttribute("aria-pressed", String(touchRun));
    });
  }

  function hint() {
    window.Screen.say(World.map(me.map).title + "\nArrows to walk · Z to talk · Esc for menu");
  }

  // ---------- People ----------

  function loadPeople() {
    const m = World.map(me.map);
    // ctx.visible says whether someone is there, or returns changes to where
    // they stand and how they look (the old man lying in Viridian's road).
    people = m.people.map((p) => {
      const v = ctx.visible ? ctx.visible(p, me.map) : true;
      return v && (v === true ? p : Object.assign({}, p, v));
    }).filter(Boolean).map((def) => ({
      def, x: def.x, y: def.y, ox: def.x, oy: def.y, move: null,
      facing: { face_up: "up", face_left: "left", face_right: "right" }[def.movement] || "down",
      timer: 60 + Math.floor(Math.random() * 120)
    }));
  }

  const personAt = (x, y) => people.find((p) => (p.x === x && p.y === y) || (p.move && p.move.tx === x && p.move.ty === y));
  const occupiedForPlayer = (mapName, x, y) => mapName === me.map && !!personAt(x, y);

  const WANDER_DIRS = {
    wander_around: ["up", "down", "left", "right"], wander_up_and_down: ["up", "down"],
    wander_left_and_right: ["left", "right"]
  };

  function updatePerson(p) {
    if (p.move) {
      p.move.t += p.move.speed || WALK_SPEED;
      if (p.move.t >= TILE) { p.x = p.move.tx; p.y = p.move.ty; p.move = null; }
      return;
    }
    if (scene || --p.timer > 0) return;
    p.timer = 90 + Math.floor(Math.random() * 150);
    if (p.def.movement === "look_around") { p.facing = ["up", "down", "left", "right"][Math.floor(Math.random() * 4)]; return; }
    const dirs = WANDER_DIRS[p.def.movement];
    if (!dirs) return;
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    p.facing = dir;
    const [dx, dy] = World.DIRS[dir];
    const tx = p.x + dx, ty = p.y + dy;
    if (Math.abs(tx - p.ox) > (p.def.rangeX || 1) || Math.abs(ty - p.oy) > (p.def.rangeY || 1)) return;
    if ((tx === me.x && ty === me.y) || (me.move && me.move.tx === tx && me.move.ty === ty) || personAt(tx, ty)) return;
    const r = World.step({ map: me.map, x: p.x, y: p.y }, dir);
    if (!r.ok || r.map !== me.map || r.jump || r.warp || World.warpAt(me.map, tx, ty)) return;
    p.move = { tx, ty, t: 0 };
  }

  // ---------- Player movement ----------

  function startStep(r, dir) {
    const run = !r.jump && runHeld();
    me.move = { tx: r.x, ty: r.y, tmap: r.map, dir, t: 0, jump: !!r.jump, warp: r.warp || null, run,
      dist: r.jump ? TILE * 2 : TILE, speed: run ? RUN_SPEED : WALK_SPEED };
    me.parity ^= 1;
  }

  function finishStep() {
    const mv = me.move;
    me.move = null;
    const changedMap = mv.tmap !== me.map;
    me.map = mv.tmap; me.x = mv.tx; me.y = mv.ty;
    if (changedMap) { loadPeople(); preloadMap(me.map); hint(); }
    savePosition();
    if (mv.warp) { warpTo(mv.warp); return; }
    for (const t of World.triggersAt(me.map, me.x, me.y)) {
      if (ctx.special && ctx.special(t.script)) return finish({ type: "trigger", trigger: t, map: me.map });
    }
    const wild = World.wildEncounter(me.map, me.x, me.y);
    if (wild) finish(Object.assign({ type: "wild" }, wild));
  }

  function savePosition() {
    ctx.player.location = { map: me.map, x: me.x, y: me.y, facing: me.facing };
  }

  function warpTo(target) {
    paused = true;
    fadeDir = 1;
    afterFade = async () => {
      me.map = target.map; me.x = target.x; me.y = target.y;
      if (target.door) me.facing = "down";
      loadPeople();
      await preloadMap(me.map);
      savePosition();
      hint();
      fadeDir = -1;
      afterFade = () => {
        paused = false;
        // Scenes that start as you walk in (the Viridian Mart clerk's parcel).
        if (ctx.special && ctx.special("enter:" + me.map)) return finish({ type: "trigger", trigger: { script: "enter:" + me.map }, map: me.map });
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

  const actor = (who) => (who === "player" ? me : people.find((p) => p.def.localId === who));
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
    if ((m = /^emote_(exclamation|question)_mark$/.exec(cmd))) { a.emote = { mark: m[1] === "question" ? "?" : "!" }; return 40; }
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
    if (!busy) { const done = scene.resolve; scene = null; done(); }
  }

  // Plays movement scripts side by side: act([{ who: "player" | localId, moves: [...] }]).
  function act(list) {
    return new Promise((resolve) => {
      scene = { tracks: list.map((t) => ({ who: t.who, moves: [].concat(t.moves), i: 0, wait: 0 })), resolve };
    });
  }

  // Someone a story flag normally hides, put on the map for a scene.
  function addObject(localId, pos) {
    const def = World.map(me.map).people.find((p) => p.localId === localId);
    if (!def) return;
    people = people.filter((p) => p.def.localId !== localId);
    people.push({ def: Object.assign({}, def, { x: pos.x, y: pos.y }), x: pos.x, y: pos.y, ox: pos.x, oy: pos.y,
      move: null, facing: pos.facing || "down", timer: 60 });
  }
  const removeObject = (localId) => { people = people.filter((p) => p.def.localId !== localId); };

  // Fades to black, moves the player (a scene's warp), and fades back in.
  function fadeOut() { return new Promise((resolve) => { fadeDir = 1; afterFade = resolve; }); }
  async function teleport(loc) {
    if (!fade) await fadeOut();
    me.map = loc.map; me.x = loc.x; me.y = loc.y; me.facing = loc.facing || "down";
    me.move = null; me.hidden = false; me.emote = null;
    loadPeople();
    await preloadMap(me.map);
    savePosition();
    hint();
    await new Promise((resolve) => { fadeDir = -1; afterFade = resolve; });
  }

  // ---------- Talking ----------

  const fillText = (s) => s.replace(/\{PLAYER\}/g, ctx.player.name).replace(/\{RIVAL\}/g, ctx.rivalName || "Blue");

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
      person.facing = World.OPPOSITE[me.facing];
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
  }

  // ---------- Frame loop ----------

  function update() {
    if (fadeDir) {
      fade = Math.max(0, Math.min(FADE_FRAMES, fade + fadeDir));
      if ((fadeDir > 0 && fade === FADE_FRAMES) || (fadeDir < 0 && fade === 0)) {
        fadeDir = 0;
        const next = afterFade;
        afterFade = null;
        if (next) next();
      }
    }
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
    if (pressedA) { pressedA = false; return interact(); }
    const dir = heldDir();
    if (!dir) { me.turnTimer = 0; return; }
    if (dir !== me.facing && !wasMoving) { me.facing = dir; me.turnTimer = TURN_FRAMES; return; }
    me.facing = dir;
    if (me.turnTimer > 0) { me.turnTimer--; return; }
    const r = World.step({ map: me.map, x: me.x, y: me.y }, dir, occupiedForPlayer);
    if (r.warp && !r.ok) { warpTo(r.warp); return; }
    if (r.ok) { startStep(r, dir); return; }
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
      if (me.move.jump) hop = Math.sin((t / me.move.dist) * Math.PI) * 10;
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
    if (me.emote) emotes.push([me.emote, px - camX, py - camY - 16]);
    const look = "player_" + (ctx.player.look || "red");
    let sheet = look, frame;
    if (me.move && me.move.run) {
      // FireRed's running sheet: a leaning pose for 5 frames, then a stride for 3.
      sheet = look + "_run";
      const pose = { down: 0, up: 3, left: 6, right: 6 }[me.facing];
      frame = me.move.t / RUN_SPEED < 5 ? pose : pose + 1 + me.parity;
    } else {
      frame = frameFor(me.facing, !!me.move && (me.move.t % TILE) < TILE / 2, me.parity, 9);
    }
    if (!me.hidden) sprites.push({ y: py, draw: () => drawSprite(sheet, 16, 32, frame, me.facing === "right", px - camX, py - camY - hop) });
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());

    for (const [name, ox, oy] of layers) {
      if (!World.map(name).top) continue;
      const img = mapImage(name, "top");
      if (ready(img)) g.drawImage(img, ox - camX, oy - camY);
    }
    // "!" and "?" bubbles over someone's head.
    for (const [e, x, y] of emotes) {
      g.fillStyle = "#fff"; g.strokeStyle = "#000"; g.lineWidth = 1;
      g.fillRect(x + 3.5, y - 13.5, 10, 12); g.strokeRect(x + 3.5, y - 13.5, 10, 12);
      g.fillStyle = e.mark === "!" ? "#d0302f" : "#2b6fd6";
      g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(e.mark, x + 8.5, y - 7);
    }
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
    const r = resolveExplore;
    resolveExplore = null;
    paused = true;
    held.clear();
    touchDir = null;
    pressedA = pressedMenu = false;
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
    await Promise.all([preloadMap(me.map), spriteImage("player_" + (ctx.player.look || "red") + "_run").loaded]);
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

  // Stops drawing (while a battle or menu has the screen).
  function hide() {
    running = false;
    paused = true;
  }

  window.Overworld = {
    explore, hide, read: (pages) => read(pages), forceStep, refreshPeople: () => loadPeople(),
    act, addObject, removeObject, teleport,
    position: () => ({ map: me.map, x: me.x, y: me.y, facing: me.facing })
  };
})();
