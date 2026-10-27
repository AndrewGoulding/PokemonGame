// Kamurocho, side on, as Streets of Kamurocho draws it (data/kamurocho-street.js; its pictures from the game itself,
// tools/build-kamurocho-sok.py): you walk along the street and up and down its pavement, a beat-'em-up's way, on a
// screen of its own (336x224, Streets of Rage 2's height, 3:2 like the game's), and drawn two and a half times your
// size to stand as tall as its people, your party walking behind you. The game's overworld (ui/overworld.js) rests meanwhile: ui/game.js's explore loop asks this
// instead while you're in Kamurocho.
//
//   const ev = await Street.explore({ player, look, special, say, visible, onStep, level });
//     -> { type: "menu" } (START), { type: "talk", person, map } (someone with a script ui/game.js runs),
//        { type: "realm-battle", foes, bark } (a gang's caught you: their foe ids, REALM_FOES', and what they said),
//        { type: "spot", script } (a spot: Poppo's door, the Time Machine)
//   player.location.street: { scene, x, y, facing } (KAMUROCHO_STREET.arrive when there's none)
//   Street.backdrop()   the street behind you now, for the Ultimax battles' screen: { url, size, position }
//
// The controls: the D-pad walks (B runs), A talks to whoever's in front of you or uses the spot you're on, START is
// the menu. Walk off the street's end or into a door, and you're in the next scene.
//
// Its people with a `walk` (a strip of four frames, people/<id>_walk.png, each as wide as their standing <id>.png)
// amble up and down the pavement, within their `range` of where they stand (50 pixels if not said), stopping now
// and then and turning back at its ends, at the floor's edge, or before you; talk to one and they stop and face you,
// and walk on once you've gone.
//
// And on the streets that have fights (a scene's `encounters`), its gangs walk too, as the Yakuza games' do: a group
// from REALM_ENCOUNTERS.Kamurocho (only those your party's level has come to: opts.level(), or your realm party's
// best), a gang for every 1200 pixels of street, pacing up and down it. Come near and in front of them and they've
// seen you ("!"), and come at you; reach you and their leader has his say, and the fight's on (the event above).
// Keep away (outrun them: B) and they give up. A gang beaten is gone; another turns up after a while, and every
// gang's back when you come into the street again. (onStep is told there are no fights to roll for: they're these.)
(function () {
  "use strict";
  // (You're drawn two and a half times your size, to stand as tall as its people.)
  const W = 336, H = 224, SCALE = 2.5;
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
  const walkers = {};  // (where those who walk are now, and which way they're going, by their script)
  let gangs = [], quiet = 0, regang = 0;   // (the gangs on this street; ticks before any can spot you; till another turns up)
  const FRAMES = 4;    // (each walk's frames)
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
    // (put somewhere else in the same scene: its people and gangs where they are)
    const moved = !me || me.scene !== a.scene;
    if (moved) { for (const k of Object.keys(walkers)) delete walkers[k]; newScene = true; }
    me = { scene: a.scene, x: a.x, y: a.y, facing: a.facing || "down", moving: false };
    if (moved) { trail = []; if (D().scenes[a.scene]) announce(); }
  }
  let newScene = true;   // (the gangs to be sent for: you've come into a scene)
  function walker(p) {
    return walkers[p.script] || (walkers[p.script] = { x: p.x, y: p.y, dir: p.face === "left" ? -1 : 1, wait: 30 + Math.floor(Math.random() * 90), moving: false, dist: 0 });
  }
  function people(opts) {
    return (scene().people || []).filter((p) => !opts.visible || opts.visible(p)).map((p) => {
      const w = p.walk && walker(p);
      return Object.assign({}, p, { home: p.x }, w ? { x: w.x, y: w.y, face: w.dir < 0 ? "left" : "right", moving: w.moving, dist: w.dist } : {}, turned[p.script] ? { face: turned[p.script] } : {});
    });
  }
  // (A tick of their walking: half a pixel a tick, a frame of their walk every 6 pixels.)
  function amble() {
    for (const p of scene().people || []) {
      if (!p.walk) continue;
      const w = walker(p);
      w.moving = false;
      // (stopped to talk to you, till you've walked off)
      if (turned[p.script]) { if (Math.abs(me.x - w.x) > 80 || Math.abs(me.y - w.y) > 30) delete turned[p.script]; else continue; }
      if (w.wait > 0) { w.wait--; continue; }
      const nx = w.x + w.dir * 0.5;
      // (the end of their beat, the floor's edge, or you in the way: a pause, and back the other way)
      if (Math.abs(nx - p.x) > (p.range || 50) || !onFloor(nx, w.y) || (Math.abs(nx - me.x) < 24 && Math.abs(w.y - me.y) < 10 && Math.sign(me.x - w.x) === w.dir)) {
        w.dir = -w.dir; w.wait = 40 + Math.floor(Math.random() * 80); continue;
      }
      w.x = nx; w.dist += 0.5; w.moving = true;
      if (Math.random() < 1 / 500) w.wait = 60 + Math.floor(Math.random() * 120);   // (stopping a while, now and then)
    }
  }

  // ---------- Drawing ----------
  function draw(opts) {
    const S = scene(), bg = image(S.image);
    cam.x = Math.max(0, Math.min(S.width - W, Math.round(me.x - W / 2)));
    cam.y = Math.max(0, Math.min((S.height || 480) - H, Math.round(me.y - H * 0.72)));
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    if (ready(bg)) g.drawImage(bg, cam.x, cam.y, W, H, 0, 0, W, H);
    // (everyone and everything, the furthest back first)
    const list = [];
    for (const th of S.things || []) list.push({ y: th.floor ? -Infinity : th.y, draw: () => { const i = image(th.image); if (ready(i)) g.drawImage(i, Math.round(th.x - i.width * th.scale / 2 - cam.x), Math.round(th.y - i.height * th.scale - cam.y), i.width * th.scale, i.height * th.scale); } });
    for (const p of people(opts)) list.push({ y: p.y, draw: () => {
      const i = image("assets/kamurocho/people/" + p.sprite + ".png"), wk = p.walk && image("assets/kamurocho/people/" + p.walk + ".png");
      if (!ready(i)) return;
      // (walking: their walk's frames in turn; standing, their breath)
      const step = p.moving && ready(wk), x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y), bob = step ? 0 : Math.floor(t / 30 + p.home) % 2;
      shadow(x, y, i.width * 0.4);
      g.save(); g.translate(x, y - bob);
      if (p.face === "left") g.scale(-1, 1);
      if (step) g.drawImage(wk, (Math.floor(p.dist / 6) % FRAMES) * i.width, 0, i.width, i.height, -Math.round(i.width / 2), -i.height, i.width, i.height);
      else g.drawImage(i, -Math.round(i.width / 2), -i.height + bob);
      g.restore();
    } });
    for (const gang of gangs) gang.members.forEach((m, k) => list.push({ y: m.y, draw: () => drawFoe(gang, m, k) }));
    for (const f of followers(opts)) list.push({ y: f.y - 0.1, draw: () => drawFollower(f) });
    list.push({ y: me.y, draw: () => drawMe(opts) });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
    drawPopup();
    // (a spot's name, while you stand in it)
    const here = spotAt();
    if (here && here.text) { g.font = "bold 9px 'Trebuchet MS', sans-serif"; g.textAlign = "center"; g.fillStyle = "#000a"; const bw = Math.max(92, Math.ceil(g.measureText(here.text + "  Ⓐ").width) + 14); g.fillRect(W / 2 - bw / 2, 4, bw, 14); g.fillStyle = "#ffe890"; g.fillText(here.text + "  Ⓐ", W / 2, 14); g.textAlign = "left"; }
  }
  // (one of a gang: walking, their foe's walk if it has one (KAMUROCHO_STREET.foeWalks), else squared up; their
  // leader's "!" when they've seen you, and his words when they've caught you)
  function drawFoe(gang, m, k) {
    const f = window.REALM_FOES[m.id] || {}, i = image("assets/kamurocho/people/" + (f.street || m.id) + ".png");
    const wk = (D().foeWalks || []).includes(f.street) && image("assets/kamurocho/people/" + f.street + "_walk.png");
    const x = Math.round(m.x - cam.x), y = Math.round(m.y - cam.y), step = gang.moving && ready(wk);
    shadow(x, y, 16);
    g.save(); g.translate(x, y);
    if (gang.dir < 0) g.scale(-1, 1);
    if (step) { const fw = wk.width / FRAMES; g.drawImage(wk, (Math.floor((gang.dist + k * 9) / 6) % FRAMES) * fw, 0, fw, wk.height, -Math.round(fw / 2), -wk.height, fw, wk.height); }
    else if (ready(i)) g.drawImage(i, -Math.round(i.width / 2), -i.height);
    g.restore();
    if (k) return;
    g.font = "bold 9px 'Trebuchet MS', sans-serif"; g.textAlign = "center";
    if (gang.state === "chase" && gang.t < 50) { g.font = "bold 16px 'Trebuchet MS', sans-serif"; g.fillStyle = "#000"; g.fillText("!", x + 1, y - 89); g.fillStyle = "#ffe040"; g.fillText("!", x, y - 90); g.font = "bold 9px 'Trebuchet MS', sans-serif"; }
    if (gang.state === "bark") {
      const w = Math.ceil(g.measureText(gang.bark).width) + 12, bx = Math.max(2, Math.min(W - w - 2, x - w / 2)), by = Math.max(2, y - 112);
      g.fillStyle = "#fff"; g.fillRect(bx, by, w, 15); g.strokeStyle = "#000"; g.lineWidth = 1; g.strokeRect(bx + 0.5, by + 0.5, w - 1, 14);
      g.fillStyle = "#000"; g.fillText(gang.bark, bx + w / 2, by + 11);
    }
    g.textAlign = "left";
  }
  // ---------- Your party, walking behind you ----------
  // Those fighting beside you (opts.followers(): Kiryu and Majima as Streets of Kamurocho draws them, at ease, a
  // Pokémon as its HGSS follower sheet) walk where you walked, each a way behind the one before, facing the way you
  // went along the street; they stop when you do.
  const GAP = 46;
  let trail = [];
  function remember() {
    const last = trail[trail.length - 1];
    if (last && Math.hypot(last.x - me.x, last.y - me.y) < 1) return;
    trail.push({ x: me.x, y: me.y, dir: me.facing === "left" ? -1 : me.facing === "right" ? 1 : last ? last.dir : 1 });
    if (trail.length > 600) trail.splice(0, trail.length - 600);
  }
  function followers(opts) {
    const who = (opts && opts.followers && opts.followers()) || [];
    const out = [];
    let d = 0;
    who.forEach((f, k) => {
      d += GAP;
      // (the point `d` back along the trail; before the trail's start, behind you on the pavement)
      let at = null, run = 0;
      for (let j = trail.length - 1; j > 0; j--) { run += Math.hypot(trail[j].x - trail[j - 1].x, trail[j].y - trail[j - 1].y); if (run >= d) { at = trail[j - 1]; break; } }
      const back = me.facing === "left" ? 1 : -1;
      if (!at) at = { x: me.x + back * d, y: me.y, dir: -back };
      if (!onFloor(at.x, at.y)) at = { x: me.x, y: me.y, dir: at.dir };
      out.push(Object.assign({}, f, { x: at.x, y: at.y, dir: at.dir, moving: me.moving, k }));
    });
    return out;
  }
  function drawFollower(f) {
    const x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
    if (f.mon) {
      // (an HGSS follower sheet: FireRed's nine frames, facing left 2, its steps 7 and 8; right is left turned)
      const i = image("assets/world/sprites/" + f.mon + ".png");
      if (!ready(i)) return;
      // (twice its size, a big one's sheet as it is: a head shorter than you, as beside you in the Pokémon realm)
      const size = i.height, k = size > 32 ? 1 : 2, fr = f.moving ? 7 + (Math.floor(t / 8) % 2) : 2;
      shadow(x, y, 12);
      g.save(); g.translate(x, y + 2);
      if (f.dir > 0) g.scale(-1, 1);
      g.drawImage(i, fr * size, 0, size, size, -size * k / 2, -size * k, size * k, size * k);
      g.restore();
      return;
    }
    const i = image("assets/kamurocho/people/" + f.stand + ".png"), wk = f.walk && image("assets/kamurocho/people/" + f.walk + ".png");
    if (!ready(i)) return;
    const step = f.moving && ready(wk);
    shadow(x, y, i.width * 0.4);
    g.save(); g.translate(x, y);
    if (f.dir < 0) g.scale(-1, 1);
    if (step) { const fw = wk.width / FRAMES; g.drawImage(wk, (Math.floor((t * (run ? 2.4 : 1.4) + f.k * 9) / 8) % FRAMES) * fw, 0, fw, wk.height, -Math.round(fw / 2), -wk.height, fw, wk.height); }
    else g.drawImage(i, -Math.round(i.width / 2), -i.height + (Math.floor(t / 30 + f.k) % 2));
    g.restore();
  }

  // ---------- The area's name (FireRed's map name popup, ui/overworld.js's) ----------
  // Coming into a street, its name hangs down from the top left on a sign for a while, then goes back up.
  let popup = null;   // { text, t }
  function drawPopup() {
    if (!popup) return;
    popup.t++;
    const T = popup.t, drop = Math.min(1, T / 12, Math.max(0, (150 - T) / 12));
    if (T > 150) { popup = null; return; }
    g.font = "bold 10px 'Trebuchet MS', sans-serif";
    const w = Math.max(96, Math.ceil(g.measureText(popup.text).width) + 20), h = 20, y = Math.round(-h + (h + 4) * drop);
    g.fillStyle = "#3a2c20"; g.fillRect(4, y, w, h);
    g.fillStyle = "#f8ecd0"; g.fillRect(6, y + 2, w - 4, h - 4);
    g.fillStyle = "#d8c49c"; g.fillRect(6, y + h - 5, w - 4, 2);
    g.fillStyle = "#c8b080"; g.fillRect(8, y + 4, 2, 2); g.fillRect(w - 2, y + 4, 2, 2);
    g.fillStyle = "#4a3c2c"; g.textAlign = "center"; g.fillText(popup.text, 4 + w / 2, y + 14); g.textAlign = "left";
  }
  const announce = () => { const S = scene(); popup = S && S.title ? { text: S.title, t: 0 } : null; };

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
  // ---------- The gangs ----------
  function partyLevel(opts) {
    if (opts.level) return opts.level();
    const P = opts.player.flags && opts.player.flags.realmParty && opts.player.flags.realmParty.yakuza;
    return Math.max(1, ...((P && P.party) || []).map((r) => r.lv || 1));
  }
  function newGang(opts, far) {
    const enc = window.REALM_ENCOUNTERS && window.REALM_ENCOUNTERS.Kamurocho, S = scene();
    if (!enc) return null;
    const lv = partyLevel(opts), groups = enc.groups.filter((gr) => (gr[2] || 1) <= lv), total = groups.reduce((n, gr) => n + gr[0], 0);
    if (!groups.length) return null;
    let r = Math.random() * total, foes = groups[0][1];
    for (const gr of groups) if ((r -= gr[0]) < 0) { foes = gr[1]; break; }
    // (somewhere on the floor, out of your sight: off the screen, a way along the street)
    const ys = S.floor.map((q) => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let k = 0; k < 60; k++) {
      const x = 40 + Math.random() * (S.width - 80), y = y0 + 12 + Math.random() * (y1 - y0 - 24);
      if (!onFloor(x, y) || Math.abs(x - me.x) < far) continue;
      const gang = { foes: foes.slice(), x, y, home: x, dir: Math.random() < 0.5 ? -1 : 1, state: "walk", wait: 0, t: 0, dist: 0, moving: false, members: [] };
      place2(gang);
      return gang;
    }
    return null;
  }
  // (the leader where the gang is, the rest a step behind him, up and down the pavement from him)
  function place2(gang) {
    gang.members = gang.foes.map((id, k) => {
      let x = gang.x - gang.dir * 30 * k, y = gang.y + (k ? (k % 2 ? 10 : -10) : 0);
      if (!onFloor(x, y)) y = gang.y;
      if (!onFloor(x, y)) x = gang.x;
      return { id, x, y };
    });
  }
  function spawnGangs(opts) {
    gangs = []; quiet = 120; regang = 1800;
    if (!scene().encounters || !opts) return;
    for (let k = Math.max(1, Math.floor(scene().width / 1200)); k > 0; k--) { const gang = newGang(opts, 260); if (gang) gangs.push(gang); }
  }
  // (A tick of the gangs: pacing, spotting you, coming at you, and catching you: the fight, or null.)
  function prowl(opts) {
    if (!scene().encounters) return null;
    if (quiet > 0) quiet--;
    if (--regang <= 0) { regang = 1800; if (gangs.length < Math.max(1, Math.floor(scene().width / 1200))) { const gang = newGang(opts, W / 2 + 60); if (gang) gangs.push(gang); } }
    for (const gang of gangs) {
      gang.t++; gang.moving = false;
      const ax = me.x - gang.x, ay = me.y - gang.y;
      if (gang.state === "bark") {
        if (gang.t >= 80) { gangs = gangs.filter((o) => o !== gang); quiet = 240; return { type: "realm-battle", foes: gang.foes, bark: gang.bark }; }
        continue;
      }
      if (gang.state === "walk") {
        // (seen: you're near and in front of them, or right by them)
        if (!quiet && ((Math.sign(ax) === gang.dir && Math.abs(ax) < 150 && Math.abs(ay) < 40) || (Math.abs(ax) < 50 && Math.abs(ay) < 24))) { gang.state = "chase"; gang.t = 0; gang.wait = 0; gang.side = 0; continue; }
        if (gang.wait > 0) { gang.wait--; continue; }
        const nx = gang.x + gang.dir * 0.6;
        if (Math.abs(nx - gang.home) > 220 || !onFloor(nx, gang.y)) { gang.dir = -gang.dir; gang.wait = 50 + Math.floor(Math.random() * 80); continue; }
        gang.x = nx; gang.dist += 0.6; gang.moving = true;
        if (Math.random() < 1 / 600) gang.wait = 60 + Math.floor(Math.random() * 100);
      } else {
        // (after you: up to you, side on, an arm's length off; lost, if you get well away)
        if (Math.abs(ax) > 280 || Math.abs(ay) > 90) { gang.state = "walk"; gang.home = gang.x; gang.wait = 60; continue; }
        // (the side they come at you from: kept, so they don't spin round as they close in, or pass under or over
        // you; another only once you're well past them)
        if (!gang.side || (Math.sign(ax) === gang.side && Math.abs(ax) > 60)) gang.side = ax < 0 ? 1 : -1;
        gang.dir = -gang.side;
        const tx = me.x + gang.side * 40, dx = tx - gang.x, dy = me.y - gang.y;
        if ((Math.abs(dx) < 3 || Math.abs(ax) < 46) && Math.abs(dy) < 6) {
          gang.state = "bark"; gang.t = 0; me.facing = gang.dir < 0 ? "right" : "left";
          const B = D().barks || {}; gang.bark = (B[gang.foes[0]] || ["Hey, you! Got a problem?"])[Math.floor(Math.random() * (B[gang.foes[0]] || [0]).length)];
          continue;
        }
        const nx = gang.x + Math.sign(dx) * Math.min(Math.abs(dx), 1.2), ny = gang.y + Math.sign(dy) * Math.min(Math.abs(dy), 0.7);
        if (onFloor(nx, ny)) { gang.x = nx; gang.y = ny; } else if (onFloor(nx, gang.y)) gang.x = nx;
        gang.dist += 1.2; gang.moving = true;
      }
      place2(gang);
    }
    return null;
  }
  const caught = () => gangs.some((gang) => gang.state === "bark");

  function go(e) {
    for (const k of Object.keys(turned)) delete turned[k];
    for (const k of Object.keys(walkers)) delete walkers[k];
    newScene = true;
    me = { scene: e.to, x: e.x, y: e.y, facing: e.facing || me.facing, moving: false };
    trail = [];
    announce();
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
          if (newScene) { newScene = false; spawnGangs(opts); }
          amble();
          const fight = prowl(opts);
          if (fight) return finish(fight);
          // (caught: you stand while their leader has his say)
          if (caught()) { me.moving = false; pressedA = false; continue; }
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
          // (out of a door: walking into it, from the spot before it, the way it's `walk`ed)
          const door = (S.exits || []).find((e) => e.walk === dir && e.spot && me.x >= e.spot[0] && me.x <= e.spot[1] && me.y >= e.spot[2] && me.y <= e.spot[3] && !onFloor(nx, ny));
          if (door) { go(door); continue; }
          remember();
          if (onFloor(nx, ny) && !blocked(nx, ny, opts)) { me.x = nx; me.y = ny; }
          else if (onFloor(nx, me.y) && !blocked(nx, me.y, opts)) me.x = nx;
          else if (dx) {
            // (along a slope: up or down it as you go)
            for (const sy of [-1.2, 1.2]) if (onFloor(nx, me.y + sy) && !blocked(nx, me.y + sy, opts)) { me.x = nx; me.y += sy; break; }
          }
          // (a step every 16 pixels walked: the clock; the street's fights are its gangs, above, not a roll of the dice)
          stepAcc += Math.abs(dx) + Math.abs(dy);
          if (stepAcc >= 16) {
            stepAcc -= 16;
            const ev = opts.onStep && opts.onStep(false);
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
    const SH = S.height || 480;
    return { url: S.image, size: (S.width / W * 100) + "% " + (SH / H * 100) + "%",
      position: (cam.x / Math.max(1, S.width - W) * 100) + "% " + (cam.y / (SH - H) * 100) + "%" };
  }
  const isStreet = (map) => map === "Kamurocho";
  window.Street = { explore, show, backdrop, isStreet, place: (loc) => place(loc), here: () => me && Object.assign({}, me), people: () => me ? people({}) : [],
    gangs: () => gangs.map((gang) => ({ foes: gang.foes, x: Math.round(gang.x), y: Math.round(gang.y), state: gang.state })), redraw: (opts) => me && draw(opts) };
})();
