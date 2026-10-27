// Kamurocho, side on, as Streets of Kamurocho draws it (data/kamurocho-street.js; its pictures from the game itself,
// tools/build-kamurocho-sok.py): you walk along the street and up and down its pavement, a beat-'em-up's way, on a
// screen of its own (336x224, Streets of Rage 2's height, 3:2 like the game's), and drawn twice your size to stand as
// tall as its people. The game's overworld (ui/overworld.js) rests meanwhile: ui/game.js's explore loop asks this
// instead while you're in Kamurocho.
//
//   const ev = await Street.explore({ player, look, special, say, visible, onStep });
//     -> { type: "menu" } (START), { type: "talk", person, map } (someone with a script ui/game.js runs),
//        { type: "realm-battle" } (jumped on the street), { type: "spot", script } (a spot: Poppo's door, the Time
//        Machine)
//   player.location.street: { scene, x, y, facing } (KAMUROCHO_STREET.arrive when there's none)
//   Street.backdrop()   the street behind you now, for the Ultimax battles' screen: { url, size, position }
//
// The controls: the D-pad walks (B runs), A talks to whoever's in front of you or uses the spot you're on, START is
// the menu. Walk off the street's end or into a door, and you're in the next scene.
(function () {
  "use strict";
  const W = 336, H = 224, SCALE = 2;
  const D = () => window.KAMUROCHO_STREET;
  const canvas = document.createElement("canvas");
  canvas.id = "street"; canvas.className = "world hidden"; canvas.width = W; canvas.height = H;
  const world = document.getElementById("world");
  world.parentNode.insertBefore(canvas, world.nextSibling);
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  const images = {};
  function image(src) {
    if (!images[src]) { const i = new Image(); i.loaded = new Promise((r) => { i.onload = i.onerror = r; }); i.src = src; images[src] = i; }
    return images[src];
  }
  const ready = (i) => i && i.complete && i.naturalWidth > 0;

  // ---------- Input (as the overworld's) ----------
  const KEY_DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  const held = new Set();
  let active = false, pressedA = false, pressedMenu = false, run = false, ignoreUntil = 0;
  document.addEventListener("keydown", (e) => {
    if (!active) return;
    if (KEY_DIRS[e.key]) { held.add(KEY_DIRS[e.key]); e.preventDefault(); }
    if (e.repeat || performance.now() < ignoreUntil) return;
    if (["z", "Z", " ", "Enter"].includes(e.key)) { pressedA = true; e.preventDefault(); }
    if (["Escape", "m", "M", "Start"].includes(e.key)) { pressedMenu = true; e.preventDefault(); }
    if (["Shift", "x", "X", "b", "B"].includes(e.key)) { run = !run; e.preventDefault(); }
  });
  document.addEventListener("keyup", (e) => { if (KEY_DIRS[e.key]) held.delete(KEY_DIRS[e.key]); });
  window.addEventListener("blur", () => held.clear());

  // ---------- Where you are ----------
  let me = null, cam = { x: 0, y: 0 }, t = 0, stepAcc = 0;
  const turned = {};   // (who's turned to face you, by their script)
  const scene = () => D().scenes[me.scene];
  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const onFloor = (x, y) => inside(scene().floor, x, y);
  function place(loc) {
    const a = loc && D().scenes[loc.scene] ? loc : D().arrive;
    me = { scene: a.scene, x: a.x, y: a.y, facing: a.facing || "down", moving: false };
  }
  function people(opts) {
    const map = (window.WORLD_MAPS || {}).Kamurocho || {};
    return (scene().people || []).filter((p) => !opts.visible || opts.visible(p))
      .map((p) => Object.assign({ text: ((map.people || []).find((q) => q.script === p.script) || {}).text }, p, turned[p.script] ? { face: turned[p.script] } : {}));
  }

  // ---------- Drawing ----------
  function draw(opts) {
    const S = scene(), bg = image(S.image);
    cam.x = Math.max(0, Math.min(S.width - W, Math.round(me.x - W / 2)));
    cam.y = Math.max(0, Math.min(480 - H, Math.round(me.y - H * 0.72)));
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    if (ready(bg)) g.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
    // (everyone and everything, the furthest back first)
    const list = [];
    for (const th of S.things || []) list.push({ y: th.floor ? -Infinity : th.y, draw: () => { const i = image(th.image); if (ready(i)) g.drawImage(i, Math.round(th.x - i.width * th.scale / 2 - cam.x), Math.round(th.y - i.height * th.scale - cam.y), i.width * th.scale, i.height * th.scale); } });
    for (const p of people(opts)) list.push({ y: p.y, draw: () => {
      const i = image("assets/kamurocho/people/" + p.sprite + ".png");
      if (!ready(i)) return;
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y), bob = Math.floor(t / 30 + p.x) % 2;
      shadow(x, y, i.width * 0.4);
      g.save(); g.translate(x, y - bob);
      if (p.face === "left") g.scale(-1, 1);
      g.drawImage(i, -Math.round(i.width / 2), -i.height + bob);
      g.restore();
    } });
    list.push({ y: me.y, draw: () => drawMe(opts) });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
    // (a spot's name, while you stand in it)
    const here = spotAt();
    if (here && here.text) { g.font = "bold 9px 'Trebuchet MS', sans-serif"; g.textAlign = "center"; g.fillStyle = "#000a"; g.fillRect(W / 2 - 46, 4, 92, 14); g.fillStyle = "#ffe890"; g.fillText(here.text + "  Ⓐ", W / 2, 14); g.textAlign = "left"; }
  }
  function shadow(x, y, rx) { g.fillStyle = "#0006"; g.beginPath(); g.ellipse(x, y, rx, rx * 0.25, 0, 0, Math.PI * 2); g.fill(); }
  function drawMe(opts) {
    const sheet = opts.look && opts.look();
    const x = Math.round(me.x - cam.x), y = Math.round(me.y - cam.y);
    shadow(x, y, 14);
    if (!sheet) return;
    // (FireRed's frames: standing down 0, up 1, left 2; stepping down 3 4, up 5 6, left 7 8; and between the steps,
    // ui/overworld.js's lookFrame. Right is left turned.)
    const d = me.facing;
    const f = me.moving ? window.Overworld.lookFrame(d, Math.floor(t / (run ? 5 : 8))) : { down: 0, up: 1, left: 2, right: 2 }[d];
    g.save(); g.translate(x, y + 2);
    if (d === "right") g.scale(-1, 1);
    g.drawImage(sheet, f * 32, 0, 32, 32, -16 * SCALE, -32 * SCALE, 32 * SCALE, 32 * SCALE);
    g.restore();
  }

  // ---------- Spots, people and ways out ----------
  function spotAt() {
    const S = scene();
    for (const s of S.spots || []) if (me.x >= s.x0 && me.x <= s.x1 && me.y >= s.y0 && me.y <= s.y1) return s;
    for (const e of S.exits || []) if (e.spot && me.x >= e.spot[0] && me.x <= e.spot[1] && me.y >= e.spot[2] && me.y <= e.spot[3]) return { text: e.text, exit: e };
    return null;
  }
  function facing(opts) {
    // (whoever's within reach in front of you: an arm's length ahead, a little up or down the pavement)
    const dx = { left: -1, right: 1, up: 0, down: 0 }[me.facing], dy = { up: -1, down: 1, left: 0, right: 0 }[me.facing];
    return people(opts).find((p) => {
      const ax = p.x - me.x, ay = p.y - me.y;
      return dx ? Math.sign(ax) === dx && Math.abs(ax) < 64 && Math.abs(ay) < 18 : Math.sign(ay) === dy && Math.abs(ay) < 30 && Math.abs(ax) < 30;
    }) || null;
  }
  function go(e) {
    for (const k of Object.keys(turned)) delete turned[k];
    me = { scene: e.to, x: e.x, y: e.y, facing: e.facing || me.facing, moving: false };
    held.clear();
  }
  function blocked(x, y, opts) {
    return people(opts).some((p) => Math.abs(p.x - x) < 20 && Math.abs(p.y - y) < 7);
  }

  // ---------- Exploring ----------
  function explore(opts) {
    if (!me || !opts.player.location.street) place(opts.player.location.street);
    active = true; pressedA = false; pressedMenu = false; ignoreUntil = performance.now() + 250;
    show(true);
    window.Screen.say("");
    return new Promise((resolve) => {
      let last = performance.now();
      const finish = (ev) => {
        active = false; me.moving = false;
        opts.player.location.street = { scene: me.scene, x: Math.round(me.x), y: Math.round(me.y), facing: me.facing };
        draw(opts);
        resolve(ev);
      };
      const frame = (now) => {
        if (!active) return;
        const n = Math.min(4, Math.round((now - last) / (1000 / 60))); last = now;
        for (let k = 0; k < n; k++) {
          t++;
          if (pressedMenu) { pressedMenu = false; return finish({ type: "menu" }); }
          if (pressedA) {
            pressedA = false;
            const p = facing(opts);
            if (p) {
              // (turned to face you)
              turned[p.script] = me.x < p.x ? "left" : "right";
              if (opts.special && opts.special(p.script)) return finish({ type: "talk", person: p, map: "Kamurocho" });
              if (p.text) return finish({ type: "say", pages: p.text });
            }
            const s = spotAt();
            if (s && s.exit) { go(s.exit); continue; }
            if (s && s.script) return finish({ type: "spot", script: s.script });
          }
          const dir = ["up", "down", "left", "right"].find((d) => held.has(d));
          me.moving = !!dir;
          if (!dir) continue;
          me.facing = dir;
          const v = run ? 3 : 1.6, dx = { left: -v, right: v }[dir] || 0, dy = ({ up: -v, down: v }[dir] || 0) * 0.6;
          const S = scene(), nx = me.x + dx, ny = me.y + dy;
          // (off the street's end: the next scene)
          const edge = (S.exits || []).find((e) => (e.edge === "left" && nx < 4) || (e.edge === "right" && nx > S.width - 4));
          if (edge) { go(edge); continue; }
          if (onFloor(nx, ny) && !blocked(nx, ny, opts)) { me.x = nx; me.y = ny; }
          else if (onFloor(nx, me.y) && !blocked(nx, me.y, opts)) me.x = nx;
          else if (dx) {
            // (along a slope: up or down it as you go)
            for (const sy of [-1.2, 1.2]) if (onFloor(nx, me.y + sy) && !blocked(nx, me.y + sy, opts)) { me.x = nx; me.y += sy; break; }
          }
          // (a step every 16 pixels walked: the clock, and the street's fights)
          stepAcc += Math.abs(dx) + Math.abs(dy);
          if (stepAcc >= 16) {
            stepAcc -= 16;
            const ev = opts.onStep && opts.onStep(!!S.encounters);
            if (ev) return finish(ev);
          }
        }
        draw(opts);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
  function show(on) {
    canvas.classList.toggle("hidden", !on);
    if (on) world.classList.add("hidden");
  }
  // The street behind you, for a fight's screen (ui/game.js realmDraw): its picture, sized and placed as on the
  // screen now.
  function backdrop() {
    const S = scene();
    return { url: S.image, size: (S.width / W * 100) + "% " + (480 / H * 100) + "%",
      position: (cam.x / Math.max(1, S.width - W) * 100) + "% " + (cam.y / (480 - H) * 100) + "%" };
  }
  const isStreet = (map) => map === "Kamurocho";
  window.Street = { explore, show, backdrop, isStreet, place: (loc) => place(loc), here: () => me && Object.assign({}, me), redraw: (opts) => me && draw(opts) };
})();
