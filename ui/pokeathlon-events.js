// The Pokéathlon's ten events (HGSS's are touch-screen games; here each is
// played with the D-pad, A and B), on a 240x160 canvas in #scene, the
// Pokémon drawn as their party icons, each with its team's colour under it.
// ui/pokeathlon.js runs a course: three of these in a row.
//
//   const r = await PokeathlonEvents.run(sceneEl, "hurdle", teams, { rng, sfx })
//     // teams: four [{ name, you (yours: red), mons: [{ species, name, stats }] x 3 }],
//     //   stats: { speed, power, skill, stamina, jump }, 1-5 stars each
//     // -> { points: [n, n, n, n], counts: { jumps, ... } } (counts: your team's)
//
// Each event (EVENTS[id]): its name, how it's played (help), and init(ctx)
// -> its state; step(s, input) a frame (60 a second) with your input
// ({ up, down, left, right, a, b }, held, and { a, b } just pressed); draw(s, g).
// It ends when its time is up (or, a race, when everyone's in); s.score[t]
// is each team's points so far. The rival teams, and your Pokémon you aren't
// controlling, are the computer's: how well it plays them goes by their stars.
// The stars: Speed is how fast one runs, Power how hard it pushes, smashes and
// throws, Skill how quick it turns and how well the computer aims and times
// with it, Stamina how long it keeps going (and how much a push moves it),
// Jump how high it jumps.
(function () {
  "use strict";

  const W = 240, H = 160, HUD = 18, FPS = 60;
  const TEAM = [   // (body, light, dark) for red, blue, green and yellow, HGSS's team colours
    ["#e8483c", "#ffa898", "#90201a"], ["#3c78e8", "#9cc4ff", "#1c3c90"],
    ["#38a848", "#98e8a0", "#1c6028"], ["#e8c030", "#fff0a0", "#906810"]];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // A star rating (1-5) as 0..1.
  const st = (m, k) => (clamp(m.stats[k] || 1, 1, 5) - 1) / 4;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- Pictures ----------

  const images = {};
  function image(url) {
    if (typeof Image === "undefined") return null;   // (in node, for a test)
    if (!images[url]) { const img = new Image(); img.src = url; images[url] = img; }
    return images[url];
  }
  const iconOf = (species) => image(window.Screen ? window.Screen.iconUrl(species) : "assets/sprites/icons/0.png");
  const ready = (img) => img && img.complete && img.naturalWidth;

  // Text in FireRed's font (ui/gba-menus.js), kept as a little canvas for each string.
  const labels = new Map();
  const PALS = { white: [[255, 255, 255], [80, 80, 88]], dark: [[64, 64, 64], [208, 208, 200]], gold: [[255, 232, 96], [120, 80, 16]],
    red: [[255, 200, 192], [144, 32, 26]], blue: [[200, 220, 255], [28, 60, 144]], green: [[200, 255, 208], [28, 96, 40]], yellow: [[255, 248, 200], [144, 104, 16]] };
  function label(str, pal) {
    const key = pal + "|" + str;
    if (labels.has(key)) return labels.get(key);
    let out = null;
    const GM = window.GbaMenus;
    if (GM && GM.Surface && window.GBA_MENUS) {
      const s = GM.Surface(), [fg, sh] = PALS[pal] || PALS.white;
      const w = Math.min(W, s.text(str, 0, 0, fg, sh) + 1);
      const c = document.createElement("canvas");
      c.width = Math.max(1, w); c.height = 16;
      c.getContext("2d").drawImage(s.canvas(), 0, 0, w, 16, 0, 0, w, 16);
      out = { canvas: c, w };
    }
    if (labels.size > 400) labels.clear();
    labels.set(key, out);
    return out;
  }
  function text(g, str, x, y, pal, align) {
    const l = label(String(str), pal || "white");
    if (!l) return 0;
    const dx = align === "center" ? x - (l.w >> 1) : align === "right" ? x - l.w : x;
    g.drawImage(l.canvas, Math.round(dx), Math.round(y));
    return l.w;
  }
  // A FireRed-style window: white with a dark edge and a lighter inner line.
  function box(g, x, y, w, h) {
    g.fillStyle = "#404048"; g.fillRect(x, y + 1, w, h - 2); g.fillRect(x + 1, y, w - 2, h);
    g.fillStyle = "#f8f8f8"; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = "#d8d8e0"; g.fillRect(x + 2, y + h - 3, w - 4, 1);
  }

  // A Pokémon: its icon (two frames, stepping while it moves) over its
  // team's shadow, `z` pixels above the ground; facing right, turned round.
  function drawMon(g, m, x, y, opts) {
    opts = opts || {};
    const c = TEAM[m.team], z = m.z || 0, t = m.t || 0;
    if (!opts.noShadow && !m.fallen) {
      const r = Math.max(4, 9 - z / 10);
      g.fillStyle = c[2]; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r + 1, (r + 1) / 2.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = c[0]; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), r, r / 2.4, 0, 0, Math.PI * 2); g.fill();
    }
    const img = m.icon;
    const frame = m.moving || opts.anim ? Math.floor(t / 8) % 2 : Math.floor(t / 30) % 2;
    const px = Math.round(x) - 16, py = Math.round(y - z) - 27 + (opts.lift || 0);
    if (m.fallen) { g.globalAlpha = clamp(1 - m.fallen / 40, 0, 1); }
    if (ready(img)) {
      if (m.face > 0) { g.save(); g.translate(px + 32, py); g.scale(-1, 1); g.drawImage(img, 0, frame * 32, 32, 32, 0, 0, 32, 32); g.restore(); }
      else g.drawImage(img, 0, frame * 32, 32, 32, px, py, 32, 32);
    } else { g.fillStyle = c[1]; g.fillRect(px + 10, py + 12, 12, 12); }
    g.globalAlpha = 1;
    // (Dazed: stars round its head. Worn out: a drop of sweat. Yours, the one
    // you're moving: an arrow over it.)
    if (m.stun > 0) for (let i = 0; i < 3; i++) {
      const a = t / 8 + i * 2.1;
      g.fillStyle = "#fff060"; g.fillRect(Math.round(x + Math.cos(a) * 9) - 1, Math.round(py + 6 + Math.sin(a) * 3), 2, 2);
    }
    if (m.tired) { g.fillStyle = "#68b8f8"; g.fillRect(px + 24, py + 6 + (t >> 3) % 3, 2, 3); g.fillRect(px + 25, py + 5 + (t >> 3) % 3, 1, 1); }
    if (opts.cursor) {
      const ay = py + 2 + ((t >> 4) % 2);
      g.fillStyle = "#202020"; g.fillRect(Math.round(x) - 3, ay - 1, 7, 1);
      g.fillStyle = c[0]; g.fillRect(Math.round(x) - 2, ay, 5, 1); g.fillRect(Math.round(x) - 1, ay + 1, 3, 1); g.fillRect(Math.round(x), ay + 2, 1, 1);
    }
  }

  // The bar along the top: each team's points, and the time left.
  function hud(g, s) {
    g.fillStyle = "#283040"; g.fillRect(0, 0, W, HUD);
    g.fillStyle = "#101820"; g.fillRect(0, HUD - 1, W, 1);
    for (let t = 0; t < 4; t++) {
      const x = 2 + t * 47;
      g.fillStyle = TEAM[t][2]; g.fillRect(x, 2, 45, 14);
      g.fillStyle = TEAM[t][0]; g.fillRect(x + 1, 3, 43, 12);
      text(g, String(Math.floor(s.score[t])), x + 42, 2, "white", "right");
      if (s.ctx.teams[t].you) { g.fillStyle = "#fff"; g.fillRect(x + 2, 5, 2, 8); }
    }
    const left = s.race ? Math.floor(s.frame / FPS) : Math.max(0, Math.ceil((s.duration - s.frame) / FPS));
    text(g, (s.race ? "" : "") + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"), 237, 2, left <= 5 && !s.race ? "gold" : "white", "right");
  }

  // ---------- Moving about (the events seen from above) ----------

  // A Pokémon heads for (tx, ty) at `pace` (0..1) of its top speed, turning
  // as quickly as its Skill lets it; worn out, at half speed.
  function steer(m, tx, ty, pace) {
    const top = (0.75 + 0.22 * m.stats.speed) * (m.tired ? 0.5 : 1) * (pace == null ? 1 : pace);
    let dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 1.5) { dx = 0; dy = 0; } else { dx = dx / d * top; dy = dy / d * top; }
    const k = 0.06 + 0.05 * st(m, "skill");
    m.vx += (dx - m.vx) * k; m.vy += (dy - m.vy) * k;
  }
  // Or the way the D-pad points.
  function steerPad(m, input) {
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0), dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (!dx && !dy) { m.vx *= 0.9; m.vy *= 0.9; return; }
    const n = Math.hypot(dx, dy);
    steer(m, m.x + dx / n * 40, m.y + dy / n * 40, 1);
    m.aim = Math.atan2(dy, dx);
  }
  // Stamina: running wears it down, and standing about brings it back; at
  // none, it's worn out until it's back to half.
  function stamina(m, running) {
    const max = m.staminaMax || (m.staminaMax = 240 + 150 * m.stats.stamina);
    if (m.stamina == null) m.stamina = max;
    if (running) m.stamina = Math.max(0, m.stamina - 1); else m.stamina = Math.min(max, m.stamina + 1.6);
    if (m.stamina <= 0) m.tired = true;
    else if (m.tired && m.stamina >= max / 2) m.tired = false;
  }
  function move(m) {
    m.x += m.vx; m.y += m.vy;
    m.moving = Math.abs(m.vx) + Math.abs(m.vy) > 0.25;
    if (Math.abs(m.vx) > 0.1) m.face = m.vx > 0 ? 1 : -1;
  }
  // Pokémon bump each other apart: the stronger (Power) and steadier
  // (Stamina) one gives way less. Returns the pairs that hit hard.
  function bump(mons, radius) {
    const hits = [];
    for (let i = 0; i < mons.length; i++) for (let j = i + 1; j < mons.length; j++) {
      const a = mons[i], b = mons[j];
      if (a.out || b.out) continue;
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= radius * 2 || d === 0) continue;
      dx /= d; dy /= d;
      const ma = 1 + 0.5 * a.stats.power + 0.2 * a.stats.stamina, mb = 1 + 0.5 * b.stats.power + 0.2 * b.stats.stamina;
      const push = radius * 2 - d;
      a.x -= dx * push * mb / (ma + mb); a.y -= dy * push * mb / (ma + mb);
      b.x += dx * push * ma / (ma + mb); b.y += dy * push * ma / (ma + mb);
      // (The push along the line between them, shared by weight, and a bit more.)
      const rel = (a.vx - b.vx) * dx + (a.vy - b.vy) * dy;
      if (rel > 0) {
        const imp = rel * 1.6;
        a.vx -= dx * imp * mb / (ma + mb); a.vy -= dy * imp * mb / (ma + mb);
        b.vx += dx * imp * ma / (ma + mb); b.vy += dy * imp * ma / (ma + mb);
        if (rel > 1.2) hits.push([a, b, rel]);
      }
    }
    return hits;
  }
  // A dash (A): a burst forward, the way it's going (Power: how hard).
  function dash(m, angle) {
    if (m.dashCool > 0 || m.stun > 0 || m.out) return false;
    const v = 2.4 + 0.35 * m.stats.power;
    m.vx = Math.cos(angle) * v; m.vy = Math.sin(angle) * v;
    m.dashT = 14; m.dashCool = 54 - 4 * m.stats.speed;
    return true;
  }
  const heading = (m) => (m.aim != null ? m.aim : Math.atan2(m.vy, m.vx || m.face || 1));
  function tick(m) {
    m.t = (m.t || 0) + 1;
    if (m.stun > 0) m.stun--;
    if (m.dashT > 0) m.dashT--;
    if (m.dashCool > 0) m.dashCool--;
  }
  // Grass seen from above, mown in stripes.
  function lawn(g, x0, y0, w, h) {
    for (let y = y0; y < y0 + h; y += 8) { g.fillStyle = ((y - y0) >> 3) % 2 ? "#70c060" : "#80d070"; g.fillRect(x0, y, w, Math.min(8, y0 + h - y)); }
  }
  function crowd(g, y0, h, t) {
    g.fillStyle = "#6a5a78"; g.fillRect(0, y0, W, h);
    const C = ["#f0d0a0", "#e86050", "#60a0e8", "#f0e060", "#90d070", "#f0f0f0"];
    for (let y = y0 + 2; y < y0 + h - 2; y += 5) for (let x = (y >> 1) % 6; x < W; x += 6) {
      g.fillStyle = C[(x * 7 + y * 3) % 6]; g.fillRect(x, y - ((x + y + (t >> 3)) % 13 === 0 ? 1 : 0), 3, 3);
    }
  }

  // The team's Pokémon you're moving, and B to change to the next.
  function yourMon(s, input) {
    const you = s.ctx.you;
    if (input.pressed.b && s.mons) {
      s.active = (s.active + 1) % 3;
      s.ctx.sfx("se_select");
    }
    return s.mons ? s.mons.find((m) => m.team === you && m.slot === s.active) : null;
  }
  const isYours = (s, m) => m.team === s.ctx.you && m.slot === s.active;
  function newMons(ctx, at) {
    const mons = [];
    ctx.teams.forEach((team, t) => team.mons.forEach((mon, i) => {
      const [x, y] = at(t, i);
      mons.push({ team: t, slot: i, species: mon.species, stats: mon.stats, icon: iconOf(mon.species), x, y, vx: 0, vy: 0, z: 0, face: x < W / 2 ? 1 : -1,
        t: Math.floor(ctx.rng() * 60), stun: 0, dashT: 0, dashCool: 0 });
    }));
    return mons;
  }

  // ---------- The events ----------

  const EVENTS = {};

  // Hurdle Dash (Speed, Jump): a relay race over the hurdles, each of your
  // three running a leg. A jumps; clipping a hurdle trips you up.
  const LEG = 720, HURDLE_EVERY = 80;
  EVENTS.hurdle = {
    name: "Hurdle Dash", help: ["Your Pokémon run on their own.", "A: jump over the hurdles!"],
    init(ctx) {
      const hurdles = [];
      for (let x = 70; x < LEG * 3 - 20; x += HURDLE_EVERY) if (x % LEG > 40 && x % LEG < LEG - 30) hurdles.push(x);
      const lanes = ctx.teams.map((team, t) => ({ leg: 0, x: 0, v: 0, z: 0, vz: 0, stun: 0, down: {}, next: 0, plan: null, done: null }));
      return { ctx, race: true, frame: 0, score: [0, 0, 0, 0], hurdles, lanes, mons: null, jumps: 0, trips: 0,
        runners: ctx.teams.map((team, t) => team.mons.map((mon, i) => ({ team: t, slot: i, stats: mon.stats, icon: iconOf(mon.species), face: 1, t: i * 9 }))) };
    },
    step(s, input) {
      s.frame++;
      s.lanes.forEach((L, t) => {
        if (L.done != null) return;
        const m = s.runners[t][L.leg];
        m.t++;
        const top = 1.35 + 0.22 * m.stats.speed, g = 0.22, vz0 = 2.0 + 0.32 * m.stats.jump;
        if (L.stun > 0) { L.stun--; L.v *= 0.9; } else L.v = Math.min(top, L.v + 0.035);
        // The next hurdle; the computer jumps (Skill: how near the right spot).
        while (L.next < s.hurdles.length && s.hurdles[L.next] < L.x - 4) L.next++;
        const hx = s.hurdles[L.next];
        let jump = false;
        if (s.ctx.teams[t].you) jump = input.pressed.a;
        else if (hx != null) {
          if (L.plan !== L.next) { L.plan = L.next; L.err = (s.ctx.rng() + s.ctx.rng() - 1) * (5 - 4 * st(m, "skill")) * 6 * s.ctx.ai; }
          jump = hx - L.x <= L.v * vz0 / g + L.err && hx - L.x > 0;
        }
        if (jump && L.z === 0 && L.stun === 0) {
          L.vz = vz0; L.z = 0.01;
          if (s.ctx.teams[t].you) { s.jumps++; s.ctx.sfx("se_m_jump_kick"); }
        }
        const before = L.x;
        L.x += L.v;
        if (L.z > 0) { L.z += L.vz; L.vz -= g; if (L.z <= 0) { L.z = 0; L.vz = 0; L.v *= 0.93; } }
        // Clipping a hurdle: it falls, and you stumble.
        if (hx != null && before < hx && L.x >= hx && L.z < 9 && !L.down[hx]) {
          L.down[hx] = true; L.stun = 30 - 4 * m.stats.skill; L.v *= 0.3;
          if (s.ctx.teams[t].you) { s.trips++; s.ctx.sfx("se_bang"); }
        }
        m.moving = true; m.z = L.z;
        // The baton: at the end of a leg, the next one runs on.
        if (L.x >= (L.leg + 1) * LEG) {
          if (L.leg < 2) { L.leg++; L.v *= 0.6; } else { L.done = s.frame; s.score[t] = points(L.done); if (s.ctx.teams[t].you) s.ctx.sfx("se_select"); }
        }
      });
      // (Everyone's in, or a minute and a half has gone.)
      if (s.lanes.every((L) => L.done != null) || s.frame > FPS * 90) {
        s.lanes.forEach((L, t) => { if (L.done == null) s.score[t] = points(s.frame + (3 * LEG - L.x) * 2); });
        s.over = true;
      }
      function points(frames) { return Math.round(clamp(2800 / (frames / FPS), 20, 200)); }
    },
    draw(s, g) {
      const you = s.ctx.you, L0 = s.lanes[you];
      // (The camera follows yours; the start line is 20 pixels in.)
      const cam = clamp(L0.x - 70, 0, LEG * 3 - W + 60) - 20;
      crowd(g, HUD, 18, s.frame);
      g.fillStyle = "#58a848"; g.fillRect(0, HUD + 18, W, H - HUD - 18);
      for (let t = 0; t < 4; t++) {
        const y = 56 + t * 26;
        g.fillStyle = t % 2 ? "#c86c48" : "#d07850"; g.fillRect(0, y - 16, W, 26);
        g.fillStyle = "#f0f0f0"; g.fillRect(0, y + 9, W, 1);
        // Distance marks, the legs' lines and the finish.
        for (let x = Math.floor(cam / 40) * 40; x < cam + W; x += 40) { g.fillStyle = "#e09068"; g.fillRect(x - cam, y - 14, 1, 22); }
        for (let k = 1; k <= 3; k++) { const fx = k * LEG - cam; if (fx > -4 && fx < W + 4) { g.fillStyle = k === 3 ? "#fff" : "#f0e060"; g.fillRect(fx, y - 16, 2, 26); } }
        for (const hx of s.hurdles) {
          const x = Math.round(hx - cam);
          if (x < -8 || x > W + 8) continue;
          if (s.lanes[t].down[hx]) { g.fillStyle = "#f8f8f8"; g.fillRect(x - 4, y + 1, 9, 2); continue; }
          g.fillStyle = "#606060"; g.fillRect(x - 3, y - 9, 1, 10); g.fillRect(x + 3, y - 9, 1, 10);
          g.fillStyle = "#f8f8f8"; g.fillRect(x - 4, y - 10, 9, 3);
          g.fillStyle = TEAM[t][0]; g.fillRect(x - 2, y - 10, 2, 3); g.fillRect(x + 2, y - 10, 1, 3);
        }
      }
      g.fillStyle = "#fff"; if (-cam > -4) g.fillRect(-cam, 40, 2, 104);
      for (let t = 0; t < 4; t++) {
        const y = 56 + t * 26, L = s.lanes[t];
        // (The next ones wait at their legs' lines.)
        for (let k = L.leg + 1; k < 3; k++) { const wx = k * LEG - cam - 6; if (wx > -20 && wx < W + 20) drawMon(g, s.runners[t][k], wx, y + 3, { noShadow: false }); }
        const m = s.runners[t][Math.min(2, L.leg)];
        const x = (L.done != null ? 3 * LEG + 10 : L.x) - cam;
        drawMon(g, Object.assign(m, { stun: L.stun }), x, y + 3, { cursor: t === you, anim: L.done == null });
      }
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(4, H - 15, 98, 13);
      text(g, "Leg " + (Math.min(2, L0.leg) + 1) + "/3", 6, H - 16, "white");
      const p = Math.min(1, L0.x / (3 * LEG));
      g.fillStyle = "#202020"; g.fillRect(52, H - 10, 46, 4); g.fillStyle = TEAM[you][0]; g.fillRect(53, H - 9, Math.round(44 * p), 2);
    },
    counts: (s) => ({ jumps: s.jumps, falls: s.trips })
  };

  // Pennant Capture (Speed, Skill): pennants pop up about the beach; touch
  // one to take it (a gold one is worth three). Running wears a Pokémon out.
  const newPennant = (s) => ({ x: 26 + s.ctx.rng() * (W - 52), y: HUD + 22 + s.ctx.rng() * (H - HUD - 34), gold: s.ctx.rng() < 0.12, wait: 0 });
  EVENTS.pennant = {
    name: "Pennant Capture", help: ["D-pad: run.  B: change Pokémon.", "Grab pennants! Gold ones count x3."],
    init(ctx) {
      const corners = [[30, 140], [30, 40], [210, 40], [210, 140]];
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], active: 0, pennants: [], taken: 0,
        mons: newMons(ctx, (t, i) => [corners[t][0] + (i - 1) * 14 * (t < 2 ? 1 : -1), corners[t][1] + (i - 1) * 6]) };
      for (let i = 0; i < 7; i++) s.pennants.push(newPennant(s));
      return s;
    },
    step(s, input) {
      s.frame++;
      const yours = yourMon(s, input);
      for (const m of s.mons) {
        tick(m);
        if (m === yours) steerPad(m, input);
        else {
          // (The computer: the nearest pennant no teammate's after.)
          if (!m.goal || m.t % 24 === 0 || !s.pennants.includes(m.goal)) {
            const taken = s.mons.filter((o) => o !== m && o.team === m.team).map((o) => o.goal);
            let best = null, bd = 1e9;
            for (const p of s.pennants) if (p.wait <= 0 && !taken.includes(p)) {
              const d = Math.hypot(p.x - m.x, p.y - m.y) / (p.gold ? 2 : 1) + s.ctx.rng() * (1 - st(m, "skill")) * 50;
              if (d < bd) { bd = d; best = p; }
            }
            m.goal = best;
          }
          if (m.goal) steer(m, m.goal.x, m.goal.y, 0.8 + 0.2 * s.ctx.ai); else steer(m, m.x, m.y);
        }
        stamina(m, Math.hypot(m.vx, m.vy) > 0.5);
        move(m);
        m.x = clamp(m.x, 14, W - 14); m.y = clamp(m.y, HUD + 12, H - 6);
      }
      bump(s.mons, 7);
      for (const p of s.pennants) {
        if (p.wait > 0) { p.wait--; continue; }
        const m = s.mons.find((o) => Math.abs(o.x - p.x) < 9 && Math.abs(o.y - 3 - p.y) < 8);
        if (!m) continue;
        s.score[m.team] += p.gold ? 6 : 2;
        if (m.team === s.ctx.you) { s.taken++; s.ctx.sfx(p.gold ? "se_shiny" : "se_bag_cursor"); }
        Object.assign(p, newPennant(s), { wait: 40 });
      }
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#f0dca0"; g.fillRect(0, HUD, W, H - HUD);
      g.fillStyle = "#e4cc8c"; for (let i = 0; i < 60; i++) g.fillRect((i * 53) % W, HUD + (i * 37) % (H - HUD), 2, 1);
      g.fillStyle = "#58a8e8"; g.fillRect(0, HUD, W, 6); g.fillStyle = "#a8d8f8"; g.fillRect(0, HUD + 5, W, 1);
      for (const p of s.pennants) {
        if (p.wait > 0) continue;
        const x = Math.round(p.x), y = Math.round(p.y), wave = (s.frame >> 3) % 2;
        g.fillStyle = "#705030"; g.fillRect(x, y - 10, 1, 11);
        g.fillStyle = p.gold ? "#f8d030" : "#f05048"; g.fillRect(x + 1, y - 10, 6 - wave, 2); g.fillRect(x + 1, y - 8, 4 - wave, 2); g.fillRect(x + 1, y - 6, 2, 1);
        if (p.gold && (s.frame >> 2) % 4 === 0) { g.fillStyle = "#fff"; g.fillRect(x + 4, y - 12, 1, 1); }
      }
      for (const m of s.mons.slice().sort((a, b) => a.y - b.y)) drawMon(g, m, m.x, m.y, { cursor: isYours(s, m) });
    },
    counts: (s) => ({ pennants: s.taken })
  };

  // Relay Run (Speed, Stamina): round the track, one Pokémon at a time. Hold
  // A to run; it tires as it goes, and B hands over to the next.
  const RX = 92, RY = 46, CX = 120, CY = 92;
  const PERIMETER = 2 * Math.PI * Math.sqrt((RX * RX + RY * RY) / 2);
  EVENTS.relay = {
    name: "Relay Run", help: ["Hold A: run round the track.", "B: hand over when it tires!"],
    init(ctx) {
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], laps: [0, 0, 0, 0],
        teamsRun: ctx.teams.map((team, t) => ({ cur: 0, dist: t * 6, v: 0, pass: 0,
          mons: team.mons.map((mon, i) => ({ team: t, slot: i, stats: mon.stats, icon: iconOf(mon.species), face: 1, t: i * 7, stamina: null })) })) };
      return s;
    },
    step(s, input) {
      s.frame++;
      s.teamsRun.forEach((T, t) => {
        const you = s.ctx.teams[t].you;
        T.mons.forEach((m, i) => { m.t++; if (i !== T.cur) { m.staminaMax = m.staminaMax || 240 + 150 * m.stats.stamina; m.stamina = Math.min(m.staminaMax, (m.stamina == null ? m.staminaMax : m.stamina) + 1.4); if (m.stamina > m.staminaMax / 3) m.tired = false; } });
        const m = T.mons[T.cur];
        if (m.stamina == null) m.stamina = m.staminaMax = 240 + 150 * m.stats.stamina;
        if (T.pass > 0) { T.pass--; T.v *= 0.8; return; }
        let run, swap;
        if (you) { run = input.a; swap = input.pressed.b; }
        else {
          run = true;
          // (The computer hands over at a little stamina left: Skill, how near the right moment.)
          const when = m.staminaMax * (0.06 + (1 - st(m, "skill")) * 0.12 * (2 - s.ctx.ai) + s.ctx.rng() * 0.01);
          swap = m.stamina < when || (m.tired && s.ctx.rng() < 0.05);
        }
        if (swap) { T.cur = (T.cur + 1) % 3; T.pass = 20; s.ctx.sfx(you ? "se_select" : null); return; }
        const top = (1.15 + 0.26 * m.stats.speed) * (m.tired ? 0.35 : 1);
        T.v = run ? Math.min(top, T.v + 0.05) : T.v * 0.94;
        if (run && !m.tired) { m.stamina = Math.max(0, m.stamina - 1); if (m.stamina <= 0) m.tired = true; }
        T.dist += T.v;
        m.moving = T.v > 0.3;
        s.laps[t] = T.dist / PERIMETER;
        s.score[t] = Math.floor(s.laps[t] * 10);
      });
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      crowd(g, HUD, 14, s.frame);
      lawn(g, 0, HUD + 14, W, H - HUD - 14);
      g.fillStyle = "#c86c48"; g.beginPath(); g.ellipse(CX, CY, RX + 14, RY + 14, 0, 0, Math.PI * 2); g.fill();
      g.save(); g.beginPath(); g.ellipse(CX, CY, RX - 14, RY - 14, 0, 0, Math.PI * 2); g.clip();
      lawn(g, CX - RX, CY - RY, 2 * RX, 2 * RY);
      g.restore();
      g.strokeStyle = "#f0f0f0"; g.lineWidth = 1;
      for (const k of [-7, 0, 7]) { g.beginPath(); g.ellipse(CX, CY, RX + k, RY + k, 0, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = "#fff"; g.fillRect(CX - 1, CY + RY - 14, 2, 28);
      // Each team's runner, on its own line round the track; the others wait by the start.
      const order = s.teamsRun.map((T, t) => {
        const a = Math.PI / 2 - (T.dist / PERIMETER) * Math.PI * 2, k = 10 - t * 6;
        return { T, t, x: CX + Math.cos(a) * (RX + k), y: CY + Math.sin(a) * (RY + k), face: Math.sin(a) > 0 ? -1 : 1 };
      });
      // (The two waiting, in the infield.)
      s.teamsRun.forEach((T, t) => T.mons.filter((m, i) => i !== T.cur).forEach((m, k) => drawMon(g, m, 62 + t * 39 + k * 15, CY + 6 + (k ? 6 : 0), {})));
      for (const o of order.sort((a, b) => a.y - b.y)) {
        const m = o.T.mons[o.T.cur];
        m.face = o.face;
        drawMon(g, m, o.x, o.y, { cursor: s.ctx.teams[o.t].you });
      }
      // Your runner's stamina.
      const T = s.teamsRun[s.ctx.you], m = T.mons[T.cur];
      g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(150, H - 14, 86, 12);
      text(g, "Lap " + (Math.floor(s.laps[s.ctx.you]) + 1), 152, H - 16, "white");
      g.fillStyle = "#202020"; g.fillRect(186, H - 10, 48, 5);
      g.fillStyle = m.tired ? "#e83828" : m.stamina < m.staminaMax / 4 ? "#f0c030" : "#58d058";
      g.fillRect(187, H - 9, Math.round(46 * (m.stamina || 0) / (m.staminaMax || 1)), 3);
    },
    counts: (s) => ({ laps: Math.floor(s.laps[s.ctx.you]) })
  };

  // Block Smash (Power, Stamina): a tower of blocks each; A smashes (Power:
  // how much a blow does), but every blow tires; B changes Pokémon.
  const BLOCK_HP = 10;
  EVENTS.block = {
    name: "Block Smash", help: ["A: smash! Not too fast, though.", "B: change a worn-out Pokémon."],
    init(ctx) {
      return { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], smashed: 0, bits: [],
        cols: ctx.teams.map((team, t) => ({ cur: 0, hp: BLOCK_HP, cool: 0, swap: 0, hitT: 0, blocks: 0, wait: 0,
          mons: team.mons.map((mon, i) => ({ team: t, slot: i, stats: mon.stats, icon: iconOf(mon.species), face: 1, t: i * 5, z: 0 })) })) };
    },
    step(s, input) {
      s.frame++;
      s.cols.forEach((C, t) => {
        const you = s.ctx.teams[t].you;
        C.mons.forEach((m, i) => {
          m.t++;
          const max = m.staminaMax || (m.staminaMax = 14 + 7 * m.stats.stamina);
          if (m.stamina == null) m.stamina = max;
          if (i !== C.cur || C.cool <= 0) m.stamina = Math.min(max, m.stamina + (i !== C.cur ? 0.06 : 0.02));
          if (m.tired && m.stamina >= max / 3) m.tired = false;
        });
        if (C.cool > 0) C.cool--;
        if (C.hitT > 0) C.hitT--;
        if (C.swap > 0) { C.swap--; return; }
        const m = C.mons[C.cur];
        let hit, swap;
        if (you) { hit = input.pressed.a; swap = input.pressed.b; }
        else {
          if (C.wait > 0) C.wait--;
          hit = C.wait <= 0 && C.cool <= 0;
          if (hit) C.wait = Math.floor(s.ctx.rng() * (3 + (1 - st(m, "skill")) * 10) / s.ctx.ai);
          swap = m.tired || m.stamina < m.staminaMax * (0.12 + s.ctx.rng() * 0.1);
        }
        if (swap) { C.cur = (C.cur + 1) % 3; C.swap = 24; return; }
        if (!hit || m.tired) return;
        // (Too soon after the last blow: it does nothing, and tires all the same.)
        const early = C.cool > 0;
        m.stamina = Math.max(0, m.stamina - 1);
        if (m.stamina <= 0) m.tired = true;
        C.cool = 14; C.hitT = 6;
        if (early) return;
        C.hp -= 1 + m.stats.power;
        if (you) s.ctx.sfx("se_m_cut");
        if (C.hp <= 0) {
          C.blocks++; C.hp += BLOCK_HP;
          s.score[t] += 2;
          if (you) { s.smashed++; s.ctx.sfx("se_m_rock_throw"); }
          for (let k = 0; k < 5; k++) s.bits.push({ x: 30 + t * 60, y: 116, vx: (s.ctx.rng() - 0.5) * 3, vy: -1 - s.ctx.rng() * 2, life: 30 });
        }
      });
      for (const b of s.bits) { b.x += b.vx; b.y += b.vy; b.vy += 0.15; b.life--; }
      s.bits = s.bits.filter((b) => b.life > 0);
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#a8a0b8"; g.fillRect(0, HUD, W, H - HUD);
      s.cols.forEach((C, t) => {
        const x0 = t * 60;
        g.fillStyle = t % 2 ? "#9890a8" : "#a098b0"; g.fillRect(x0, HUD, 60, H - HUD);
        g.fillStyle = TEAM[t][2]; g.fillRect(x0, H - 14, 60, 14);
        g.fillStyle = TEAM[t][0]; g.fillRect(x0 + 1, H - 13, 58, 12);
        // The tower: the block being smashed at the bottom, cracking as it goes.
        for (let k = 0; k < 6; k++) {
          const y = 104 - k * 14 - (C.hitT > 0 && k === 0 ? 0 : 0);
          g.fillStyle = "#5a4a3a"; g.fillRect(x0 + 10, y, 40, 13);
          g.fillStyle = k % 2 ? "#b08860" : "#c09868"; g.fillRect(x0 + 11, y + 1, 38, 11);
          g.fillStyle = "#d8b888"; g.fillRect(x0 + 11, y + 1, 38, 1);
          if (k === 0) {
            const cracks = Math.floor((1 - C.hp / BLOCK_HP) * 4);
            g.fillStyle = "#4a3a2a";
            for (let c = 0; c < cracks; c++) g.fillRect(x0 + 16 + c * 8, y + 2 + (c % 2) * 3, 2, 6);
          }
        }
        const m = C.mons[C.cur];
        drawMon(g, m, x0 + 30 + (C.swap > 0 ? -12 : 0), 142, { cursor: s.ctx.teams[t].you, lift: C.hitT > 0 ? -6 : 0, anim: C.hitT > 0 });
        text(g, String(C.blocks), x0 + 30, H - 15, "white", "center");
        // (Its stamina, down the side.)
        g.fillStyle = "#202020"; g.fillRect(x0 + 53, 60, 4, 50);
        const f = (m.stamina || 0) / (m.staminaMax || 1);
        g.fillStyle = m.tired ? "#e83828" : f < 0.3 ? "#f0c030" : "#58d058"; g.fillRect(x0 + 54, 61 + Math.round(48 * (1 - f)), 2, Math.round(48 * f));
      });
      for (const b of s.bits) { g.fillStyle = "#b08860"; g.fillRect(Math.round(b.x), Math.round(b.y), 3, 3); }
    },
    counts: (s) => ({ blocks: s.smashed })
  };

  // Circle Push (Power, Stamina): stay in the middle ring, and push the
  // others out of it, and off the field. A: tackle; B: change Pokémon.
  const ARENA = { x: 120, y: 92, r: 64, inner: 22 };
  EVENTS.circle = {
    name: "Circle Push", help: ["D-pad: move.  A: tackle.  B: change.", "Stand in the middle ring!"],
    init(ctx) {
      const at = (t, i) => { const a = Math.PI * (0.75 + t * 0.5) + (i - 1) * 0.35; return [ARENA.x + Math.cos(a) * 50, ARENA.y + Math.sin(a) * 50]; };
      return { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], active: 0, pushes: 0, mons: newMons(ctx, at), at };
    },
    step(s, input) {
      s.frame++;
      const yours = yourMon(s, input);
      for (const m of s.mons) {
        tick(m);
        if (m.out) { if (--m.out <= 0) { const [x, y] = s.at(m.team, m.slot); Object.assign(m, { x, y, vx: 0, vy: 0, out: 0, fallen: 0 }); } else m.fallen = Math.min(40, (m.fallen || 0) + 1); continue; }
        if (m.stun > 0) { m.vx *= 0.92; m.vy *= 0.92; }
        else if (m.dashT > 0) { /* (dashing: on it goes) */ }
        else if (m === yours) { steerPad(m, input); if (input.pressed.a && dash(m, heading(m))) { s.tackles = (s.tackles || 0) + 1; s.ctx.sfx("se_m_take_down"); } }
        else ai(s, m);
        stamina(m, m.dashT > 0);
        move(m);
      }
      for (const [a, b] of bump(s.mons.filter((m) => !m.out), 7)) { a.last = b.team; b.last = a.team; if (a.dashT > 0) b.stun = 12; if (b.dashT > 0) a.stun = 12; }
      for (const m of s.mons) {
        if (m.out) continue;
        const d = Math.hypot(m.x - ARENA.x, m.y - ARENA.y);
        if (d < ARENA.inner) s.score[m.team] += 1.5 / FPS;
        if (d > ARENA.r + 3) {
          m.out = 90;
          if (m.last != null && m.last !== m.team) { s.score[m.last] += 4; if (m.last === s.ctx.you) s.pushes++; }
          if (m.team === s.ctx.you || m.last === s.ctx.you) s.ctx.sfx("se_fall");
          m.last = null;
        }
      }
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#504870"; g.fillRect(0, HUD, W, H - HUD);
      crowd(g, HUD, 12, s.frame);
      g.fillStyle = "#383050"; g.beginPath(); g.ellipse(ARENA.x, ARENA.y + 4, ARENA.r + 4, ARENA.r * 0.62 + 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e8d8a8"; g.beginPath(); g.ellipse(ARENA.x, ARENA.y, ARENA.r, ARENA.r * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f8c860"; g.beginPath(); g.ellipse(ARENA.x, ARENA.y, ARENA.inner, ARENA.inner * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#c89838"; g.beginPath(); g.ellipse(ARENA.x, ARENA.y, ARENA.inner, ARENA.inner * 0.62, 0, 0, Math.PI * 2); g.stroke();
      // (Seen at a slant: the field is flattened, the Pokémon stand on it.)
      const flat = (m) => ARENA.y + (m.y - ARENA.y) * 0.62;
      for (const m of s.mons.slice().sort((a, b) => flat(a) - flat(b))) drawMon(g, m, m.x, flat(m) + (m.out ? m.fallen / 2 : 0), { cursor: isYours(s, m) });
    },
    counts: (s) => ({ pushes: s.pushes, tackles: s.tackles | 0 })
  };
  // The computer, seen from above: into the middle ring, tackling whoever's in it.
  function ai(s, m) {
    const c = ARENA, others = s.mons.filter((o) => o.team !== m.team && !o.out);
    const near = others.filter((o) => dist(o, m) < 30 && Math.hypot(o.x - c.x, o.y - c.y) < c.r * 0.8).sort((a, b) => dist(a, m) - dist(b, m))[0];
    if (near && m.dashCool <= 0 && s.ctx.rng() < 0.03 * (1 + st(m, "skill")) * s.ctx.ai) {
      // (Into it, from the middle's side if it can.)
      dash(m, Math.atan2(near.y - m.y, near.x - m.x) + (s.ctx.rng() - 0.5) * (1 - st(m, "skill")));
      return;
    }
    const wob = m.t / 40 + m.slot * 2;
    steer(m, c.x + Math.cos(wob) * 10, c.y + Math.sin(wob) * 10, 0.7 + 0.3 * s.ctx.ai);
  }

  // Goal Roll (Power, Skill): roll the balls into the other teams' goals,
  // one at each side (yours is the red one, on the left). A: tackle.
  const PITCH = { x0: 14, x1: 226, y0: HUD + 10, y1: H - 6, gate: 22 };
  const goalOf = (t) => [[PITCH.x0, (PITCH.y0 + PITCH.y1) / 2], [W / 2, PITCH.y0], [PITCH.x1, (PITCH.y0 + PITCH.y1) / 2], [W / 2, PITCH.y1]][t];
  // (A ball rolls out of the middle; every fifth one is gold, worth three.)
  function newBall(s) {
    const a = s.ctx.rng() * Math.PI * 2;
    return { x: W / 2 + Math.cos(a) * 20, y: (PITCH.y0 + PITCH.y1) / 2 + Math.sin(a) * 14, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, gold: s.spawned % 5 === 4, wait: 0, last: null };
  }
  EVENTS.goal = {
    name: "Goal Roll", help: ["D-pad: move.  A: tackle.  B: change.", "Roll balls into the others' goals!"],
    init(ctx) {
      const at = (t, i) => { const [gx, gy] = goalOf(t); return [gx + (W / 2 - gx) * 0.25 + (t % 2 ? (i - 1) * 16 : 0), gy + ((PITCH.y0 + PITCH.y1) / 2 - gy) * 0.3 + (t % 2 ? 0 : (i - 1) * 16)]; };
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], active: 0, goals: 0, balls: [], spawned: 0, mons: newMons(ctx, at) };
      for (let i = 0; i < 4; i++) { s.balls.push(newBall(s)); s.spawned++; }
      return s;
    },
    step(s, input) {
      s.frame++;
      const yours = yourMon(s, input);
      for (const m of s.mons) {
        tick(m);
        if (m.stun > 0) { m.vx *= 0.9; m.vy *= 0.9; }
        else if (m.dashT > 0) { /* dashing */ }
        else if (m === yours) { steerPad(m, input); if (input.pressed.a && dash(m, heading(m))) { s.tackles = (s.tackles || 0) + 1; s.ctx.sfx("se_m_take_down"); } }
        else {
          // (The computer: get behind the nearest ball and roll it at a rival's goal.)
          const b = s.balls.filter((x) => x.wait <= 0).sort((p, q) => dist(p, m) - dist(q, m))[0];
          if (b) {
            const target = [0, 1, 2, 3].filter((t) => t !== m.team).map(goalOf).sort((p, q) => Math.hypot(p[0] - b.x, p[1] - b.y) - Math.hypot(q[0] - b.x, q[1] - b.y))[0];
            const a = Math.atan2(target[1] - b.y, target[0] - b.x), bx = b.x - Math.cos(a) * 11, by = b.y - Math.sin(a) * 11;
            if (Math.hypot(bx - m.x, by - m.y) < 8 && m.dashCool <= 0 && s.ctx.rng() < 0.3 * s.ctx.ai) dash(m, a + (s.ctx.rng() - 0.5) * 0.6 * (1 - st(m, "skill")));
            else steer(m, bx, by, 0.75 + 0.25 * s.ctx.ai);
          } else steer(m, W / 2, (PITCH.y0 + PITCH.y1) / 2, 0.5);
        }
        stamina(m, m.dashT > 0);
        move(m);
        m.x = clamp(m.x, PITCH.x0 + 6, PITCH.x1 - 6); m.y = clamp(m.y, PITCH.y0 + 6, PITCH.y1 - 2);
      }
      bump(s.mons, 7);
      for (const b of s.balls) {
        if (b.wait > 0) { if (--b.wait === 0) { s.spawned++; Object.assign(b, newBall(s)); } continue; }
        for (const m of s.mons) {
          const dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy);
          if (d >= 11 || d === 0) continue;
          const nx = dx / d, ny = dy / d, kick = 0.6 + 0.25 * m.stats.power + (m.dashT > 0 ? 1.2 : 0);
          b.x = m.x + nx * 11; b.y = m.y + ny * 11;
          b.vx = nx * kick + m.vx * 0.5; b.vy = ny * kick + m.vy * 0.5;
          b.last = m.team;
        }
        b.x += b.vx; b.y += b.vy; b.vx *= 0.985; b.vy *= 0.985;
        const cy = (PITCH.y0 + PITCH.y1) / 2, open = (v, mid) => Math.abs(v - mid) < PITCH.gate;
        let into = null;
        if (b.x < PITCH.x0 + 5) { if (open(b.y, cy)) into = 0; else { b.x = PITCH.x0 + 5; b.vx = Math.abs(b.vx); } }
        if (b.x > PITCH.x1 - 5) { if (open(b.y, cy)) into = 2; else { b.x = PITCH.x1 - 5; b.vx = -Math.abs(b.vx); } }
        if (b.y < PITCH.y0 + 5) { if (open(b.x, W / 2)) into = 1; else { b.y = PITCH.y0 + 5; b.vy = Math.abs(b.vy); } }
        if (b.y > PITCH.y1 - 3) { if (open(b.x, W / 2)) into = 3; else { b.y = PITCH.y1 - 3; b.vy = -Math.abs(b.vy); } }
        if (into != null) {
          // (Into someone's goal: a point for whoever touched it last, if it isn't theirs.)
          if (b.last != null && b.last !== into) { s.score[b.last] += b.gold ? 36 : 12; if (b.last === s.ctx.you) { s.goals++; s.ctx.sfx("se_shiny"); } }
          b.wait = 40; b.vx = b.vy = 0;
        }
      }
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#c0c0d0"; g.fillRect(0, HUD, W, H - HUD);
      lawn(g, PITCH.x0, PITCH.y0, PITCH.x1 - PITCH.x0, PITCH.y1 - PITCH.y0);
      g.strokeStyle = "#f0f8f0"; g.strokeRect(PITCH.x0 + 0.5, PITCH.y0 + 0.5, PITCH.x1 - PITCH.x0 - 1, PITCH.y1 - PITCH.y0 - 1);
      g.beginPath(); g.ellipse(W / 2, (PITCH.y0 + PITCH.y1) / 2, 18, 14, 0, 0, Math.PI * 2); g.stroke();
      const cy = (PITCH.y0 + PITCH.y1) / 2;
      [[PITCH.x0 - 6, cy - PITCH.gate, 6, PITCH.gate * 2], [W / 2 - PITCH.gate, PITCH.y0 - 6, PITCH.gate * 2, 6], [PITCH.x1, cy - PITCH.gate, 6, PITCH.gate * 2], [W / 2 - PITCH.gate, PITCH.y1, PITCH.gate * 2, 6]]
        .forEach(([x, y, w, h], t) => { g.fillStyle = TEAM[t][2]; g.fillRect(x, y, w, h); g.fillStyle = TEAM[t][0]; g.fillRect(x + 1, y + 1, w - 2, h - 2); });
      const things = s.mons.map((m) => ({ y: m.y, m })).concat(s.balls.filter((b) => b.wait <= 0).map((b) => ({ y: b.y, b })));
      for (const o of things.sort((p, q) => p.y - q.y)) {
        if (o.m) { drawMon(g, o.m, o.m.x, o.m.y, { cursor: isYours(s, o.m) }); continue; }
        const b = o.b, x = Math.round(b.x), y = Math.round(b.y);
        g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x - 4, y + 3, 9, 2);
        g.fillStyle = "#303030"; g.beginPath(); g.arc(x, y - 1, 5.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = b.gold ? "#f8d030" : "#f8f8f8"; g.beginPath(); g.arc(x, y - 1, 4.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = b.gold ? "#c89818" : "#d04040"; g.fillRect(x - 1, y - 3, 3, 3);
      }
    },
    counts: (s) => ({ goals: s.goals, tackles: s.tackles | 0 })
  };

  // Snow Throw (Skill, Power): each team in its own corner of the snowfield.
  // A throws a snowball the way you're facing (Power: how fast; Skill: how
  // straight); a hit dazes whoever it hits.
  const QUAD = [[0, 1], [0, 0], [1, 0], [1, 1]];   // (each team's corner: yours is bottom left)
  const quad = (t) => { const [qx, qy] = QUAD[t]; return { x0: 8 + qx * 120, x1: 112 + qx * 120, y0: HUD + 8 + qy * 67, y1: HUD + 67 + qy * 67 }; };
  EVENTS.snow = {
    name: "Snow Throw", help: ["D-pad: move and aim.  A: throw.", "B: change.  Hit the other teams!"],
    init(ctx) {
      const at = (t, i) => { const q = quad(t); return [lerp(q.x0, q.x1, 0.3 + i * 0.2), lerp(q.y0, q.y1, 0.3 + (i % 2) * 0.4)]; };
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], active: 0, hits: 0, balls: [], mons: newMons(ctx, at) };
      for (const m of s.mons) { const q = quad(m.team); m.aim = Math.atan2(H / 2 + 10 - m.y, W / 2 - m.x); m.reload = 30; m.face = m.x < W / 2 ? 1 : -1; }
      return s;
    },
    step(s, input) {
      s.frame++;
      const yours = yourMon(s, input);
      for (const m of s.mons) {
        tick(m);
        if (m.reload > 0) m.reload--;
        const q = quad(m.team);
        let throwAt = null;
        if (m.stun > 0) { m.vx *= 0.8; m.vy *= 0.8; }
        else if (m === yours) { steerPad(m, input); if (input.pressed.a && m.reload <= 0) throwAt = m.aim; }
        else {
          // (The computer: wander its corner, and throw at someone it picks.)
          if (!m.goal || m.t % 70 === 0) m.goal = { x: lerp(q.x0 + 6, q.x1 - 6, s.ctx.rng()), y: lerp(q.y0 + 10, q.y1, s.ctx.rng()) };
          steer(m, m.goal.x, m.goal.y, 0.6);
          if (!m.target || m.target.stun > 0 || m.t % 90 === 0) {
            const foes = s.mons.filter((o) => o.team !== m.team);
            m.target = foes[Math.floor(s.ctx.rng() * foes.length)];
          }
          if (m.reload <= 0 && s.ctx.rng() < 0.05 * s.ctx.ai) {
            // (Aiming where it'll be, roughly: Skill.)
            const v = 2.2 + 0.35 * m.stats.power, d = dist(m, m.target), lead = d / v * (0.4 + 0.6 * st(m, "skill"));
            throwAt = Math.atan2(m.target.y + m.target.vy * lead - m.y, m.target.x + m.target.vx * lead - m.x);
          }
        }
        if (throwAt != null) {
          const spread = (s.ctx.rng() - 0.5) * (0.5 - 0.4 * st(m, "skill")), v = 2.2 + 0.35 * m.stats.power;
          s.balls.push({ x: m.x, y: m.y - 8, vx: Math.cos(throwAt + spread) * v, vy: Math.sin(throwAt + spread) * v, team: m.team, life: 70 + 10 * m.stats.power });
          m.reload = 64 - 7 * m.stats.skill;
          m.face = Math.cos(throwAt) > 0 ? 1 : -1;
          if (m.team === s.ctx.you) s.ctx.sfx("se_ball_throw");
        }
        move(m);
        m.x = clamp(m.x, q.x0 + 6, q.x1 - 6); m.y = clamp(m.y, q.y0 + 10, q.y1);
        if (m === yours && !input.left && !input.right && !input.up && !input.down) { /* (keeps aiming the way it last went) */ }
        if (m.vx || m.vy) { if (m === yours) { /* steerPad set aim */ } else m.aim = Math.atan2(m.vy, m.vx); }
      }
      for (const b of s.balls) {
        b.x += b.vx; b.y += b.vy; b.life--;
        const hit = s.mons.find((o) => o.team !== b.team && o.stun <= 0 && Math.abs(o.x - b.x) < 8 && Math.abs(o.y - 8 - b.y) < 9);
        if (hit) {
          b.life = 0; hit.stun = 70;
          s.score[b.team] += 3;
          if (b.team === s.ctx.you) { s.hits++; s.ctx.sfx("se_m_hail"); }
        }
        if (b.x < 0 || b.x > W || b.y < HUD || b.y > H) b.life = 0;
      }
      s.balls = s.balls.filter((b) => b.life > 0);
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#e8f0f8"; g.fillRect(0, HUD, W, H - HUD);
      for (let t = 0; t < 4; t++) {
        const q = quad(t);
        g.fillStyle = "#f8fcff"; g.fillRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0 + 6);
        g.fillStyle = TEAM[t][1]; g.fillRect(q.x0, q.y0, q.x1 - q.x0, 2); g.fillRect(q.x0, q.y1 + 4, q.x1 - q.x0, 2);
      }
      // (The snow walls between the corners.)
      g.fillStyle = "#c8d8e8"; g.fillRect(116, HUD + 2, 8, H - HUD); g.fillRect(0, HUD + 72, W, 6);
      g.fillStyle = "#ffffff"; g.fillRect(116, HUD + 2, 8, 2); g.fillRect(0, HUD + 72, W, 2);
      for (const m of s.mons.slice().sort((a, b) => a.y - b.y)) drawMon(g, m, m.x, m.y, { cursor: isYours(s, m) });
      // Where yours is aiming.
      const y = s.mons.find((m) => isYours(s, m));
      if (y && y.stun <= 0) { g.fillStyle = TEAM[s.ctx.you][0]; for (let k = 1; k <= 3; k++) g.fillRect(Math.round(y.x + Math.cos(y.aim) * (10 + k * 5)) - 1, Math.round(y.y - 8 + Math.sin(y.aim) * (10 + k * 5)) - 1, 2, 2); }
      for (const b of s.balls) {
        g.fillStyle = "#506080"; g.fillRect(Math.round(b.x) - 2, Math.round(b.y) - 1, 5, 3); g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 2, 3, 5);
        g.fillStyle = "#fff"; g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 3, 3);
      }
    },
    counts: (s) => ({ hits: s.hits })
  };

  // Ring Drop (Stamina, Power): one Pokémon of each team on the ring at a
  // time; tackle (A) the others off it. Every knock wears one down, and a
  // worn one flies further (Stamina: how much it takes).
  const RING = { x0: 64, x1: 176, y0: HUD + 22, y1: H - 18 };
  EVENTS.ring = {
    name: "Ring Drop", help: ["D-pad: move.  A: tackle.", "Knock the others off the ring!"],
    init(ctx) {
      const corner = (t) => [[RING.x0 + 14, RING.y1 - 10], [RING.x0 + 14, RING.y0 + 12], [RING.x1 - 14, RING.y0 + 12], [RING.x1 - 14, RING.y1 - 10]][t];
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], knocks: 0, falls: 0, corner,
        cur: [0, 0, 0, 0], all: newMons(ctx, (t) => corner(t)) };
      s.all.forEach((m) => { m.end = m.endMax = 5 + 3 * m.stats.stamina; });
      s.mons = s.all.filter((m) => m.slot === 0);
      return s;
    },
    step(s, input) {
      s.frame++;
      for (const m of s.mons) {
        tick(m);
        if (m.out) {
          m.fallen = Math.min(40, (m.fallen || 0) + 1);
          if (--m.out <= 0) {
            // (In comes the next one of its team, rested.)
            const next = s.all.find((o) => o.team === m.team && o.slot === (m.slot + 1) % 3);
            const [x, y] = s.corner(m.team);
            Object.assign(next, { x, y, vx: 0, vy: 0, out: 0, fallen: 0, end: next.endMax, stun: 30, last: null });
            Object.assign(m, { out: 0, fallen: 0, end: m.endMax });
            s.mons[s.mons.indexOf(m)] = next;
          }
          continue;
        }
        if (m.stun > 0) { m.vx *= 0.9; m.vy *= 0.9; }
        else if (m.dashT > 0) { /* dashing */ }
        else if (s.ctx.teams[m.team].you) { steerPad(m, input); if (input.pressed.a && dash(m, heading(m))) { s.tackles = (s.tackles || 0) + 1; s.ctx.sfx("se_m_take_down"); } }
        else {
          const foes = s.mons.filter((o) => o !== m && !o.out);
          // (The nearest foe, or the one nearest an edge; and keep off the edges itself.)
          const edge = (o) => Math.min(o.x - RING.x0, RING.x1 - o.x, o.y - RING.y0, RING.y1 - o.y);
          const f = foes.sort((a, b) => dist(a, m) + edge(a) - dist(b, m) - edge(b))[0];
          if (f && dist(f, m) < 26 && m.dashCool <= 0 && s.ctx.rng() < 0.06 * s.ctx.ai) dash(m, Math.atan2(f.y - m.y, f.x - m.x) + (s.ctx.rng() - 0.5) * 0.5 * (1 - st(m, "skill")));
          else if (f) { const cx = (RING.x0 + RING.x1) / 2, cy = (RING.y0 + RING.y1) / 2; steer(m, lerp(f.x, cx, 0.4), lerp(f.y, cy, 0.4), 0.55 + 0.25 * s.ctx.ai); }
        }
        move(m);
        m.vx *= 0.97; m.vy *= 0.97;
      }
      for (const [a, b] of bump(s.mons.filter((m) => !m.out), 7)) {
        // (A tackle: the one hit is worn down, and knocked further the more worn it is.)
        for (const [hitter, hit] of [[a, b], [b, a]]) {
          if (hitter.dashT <= 0) continue;
          hit.end = Math.max(0, hit.end - 1 - hitter.stats.power / 3);
          const k = 1 + 1.6 * (1 - hit.end / hit.endMax);
          hit.vx *= k; hit.vy *= k; hit.stun = 10; hit.last = hitter.team;
          hitter.dashT = 0;
        }
      }
      for (const m of s.mons) {
        if (m.out) continue;
        if (s.frame % FPS === 0) s.score[m.team] += 1;
        if (m.x < RING.x0 - 2 || m.x > RING.x1 + 2 || m.y < RING.y0 - 2 || m.y > RING.y1 + 4) {
          m.out = 60;
          if (m.last != null && m.last !== m.team) { s.score[m.last] += 6; if (m.last === s.ctx.you) s.knocks++; }
          if (m.team === s.ctx.you) s.falls++;
          if (m.team === s.ctx.you || m.last === s.ctx.you) s.ctx.sfx("se_fall");
        }
      }
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      g.fillStyle = "#303048"; g.fillRect(0, HUD, W, H - HUD);
      crowd(g, HUD, 16, s.frame);
      g.fillStyle = "#585070"; g.fillRect(RING.x0 - 4, RING.y1 + 4, RING.x1 - RING.x0 + 8, 10);
      g.fillStyle = "#e0e0f0"; g.fillRect(RING.x0 - 4, RING.y0 - 4, RING.x1 - RING.x0 + 8, RING.y1 - RING.y0 + 8);
      g.fillStyle = "#4878c8"; g.fillRect(RING.x0, RING.y0, RING.x1 - RING.x0, RING.y1 - RING.y0);
      g.fillStyle = "#5888d8"; g.fillRect(RING.x0 + 8, RING.y0 + 8, RING.x1 - RING.x0 - 16, RING.y1 - RING.y0 - 16);
      for (let t = 0; t < 4; t++) { const [x, y] = s.corner(t); g.fillStyle = TEAM[t][0]; g.fillRect(x - 10 + (t > 1 ? 6 : 0), y - 8 + (t % 3 ? 0 : 4), 4, 4); }
      for (const m of s.mons.slice().sort((a, b) => a.y - b.y)) drawMon(g, m, m.x, m.y + (m.out ? m.fallen : 0), { cursor: s.ctx.teams[m.team].you });
      // Each one's wear, by its team's box along the bottom.
      s.mons.forEach((m) => {
        const x = 8 + m.team * 58;
        g.fillStyle = "#202020"; g.fillRect(x, H - 6, 50, 4);
        g.fillStyle = TEAM[m.team][0]; g.fillRect(x + 1, H - 5, Math.round(48 * m.end / m.endMax), 2);
      });
    },
    counts: (s) => ({ knocks: s.knocks, falls: s.falls, tackles: s.tackles | 0 })
  };

  // Lamp Jump (Jump, Skill): bounce on your trampoline and touch the lamps
  // (the higher, the more points). A just as you land bounces you higher;
  // left and right move you; B changes Pokémon.
  const LAMP_LEVELS = [36, 54, 72, 90, 108];   // (heights above the trampoline)
  // (A lamp somewhere over the trampoline: one of the three always low.)
  const newLamp = (s, k) => ({ k, x: 10 + s.ctx.rng() * 40, h: LAMP_LEVELS[Math.floor(s.ctx.rng() * (k === 0 ? 2 : 5))], wait: 0 });
  EVENTS.lamp = {
    name: "Lamp Jump", help: ["A as you land: bounce higher!", "Left, Right: move.  B: change."],
    init(ctx) {
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], lit: 0, bounces: 0,
        cols: ctx.teams.map((team, t) => ({ cur: 0, swap: 0, x: 30, z: 0, vz: 1.5, lastA: -99, lamps: [],
          mons: team.mons.map((mon, i) => ({ team: t, slot: i, stats: mon.stats, icon: iconOf(mon.species), face: 1, t: i * 5 })) })) };
      s.cols.forEach((C) => { for (let k = 0; k < 3; k++) C.lamps.push(newLamp(s, k)); });
      return s;
    },
    step(s, input) {
      s.frame++;
      const G = 0.11;
      s.cols.forEach((C, t) => {
        const you = s.ctx.teams[t].you, m = C.mons[C.cur];
        C.mons.forEach((o) => o.t++);
        if (C.swap > 0) { C.swap--; return; }
        const top = Math.sqrt(2 * G * (54 + 15 * m.stats.jump)), low = Math.sqrt(2 * G * 22);
        if (you) {
          if (input.pressed.a) C.lastA = s.frame;
          const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
          C.x = clamp(C.x + dx * (0.7 + 0.15 * m.stats.skill), 8, 52);
          if (dx) m.face = dx;
          if (input.pressed.b && C.z < 4) { C.cur = (C.cur + 1) % 3; C.swap = 20; C.vz = low; return; }
        } else {
          // (The computer: under the best lamp it can reach; A at the bounce, if its Skill holds.)
          const reach = (C.vz * C.vz) / (2 * G) * 1.15 + 6;
          const l = C.lamps.filter((x) => x.wait <= 0 && x.h <= reach).sort((a, b) => b.h - a.h)[0];
          if (l) { const dx = Math.sign(l.x - C.x); if (Math.abs(l.x - C.x) > 2) { C.x += dx * (0.6 + 0.15 * m.stats.skill); m.face = dx; } }
          if (C.vz < 0 && C.z + C.vz <= 0 && s.ctx.rng() < (0.45 + 0.4 * st(m, "skill")) * s.ctx.ai) C.lastA = s.frame;
        }
        C.z += C.vz; C.vz -= G;
        if (C.z <= 0) {
          // A bounce: A in time (just before or after landing) goes higher, and missing it lower.
          C.z = 0;
          const good = s.frame - C.lastA <= 8;
          C.vz = good ? Math.min(top, Math.abs(C.vz) * 1.12 + 0.25) : Math.max(low, Math.abs(C.vz) * 0.85);
          C.landT = 6;
          if (you) { s.bounces++; if (good) s.ctx.sfx("se_m_jump_kick"); }
          C.lastA = -99;
        }
        if (C.landT > 0) C.landT--;
        m.z = C.z; m.moving = true;
        for (const l of C.lamps) {
          if (l.wait > 0) { if (--l.wait === 0) Object.assign(l, newLamp(s, l.k)); continue; }
          if (Math.abs(l.x - C.x) < 9 && Math.abs(l.h - (C.z + 12)) < 9) {
            s.score[t] += LAMP_LEVELS.indexOf(l.h) + 2;
            if (you) { s.lit++; s.ctx.sfx("se_shiny"); }
            l.wait = 60;
          }
        }
      });
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      const sky = g.createLinearGradient(0, HUD, 0, H);
      sky.addColorStop(0, "#182048"); sky.addColorStop(1, "#4858a0");
      g.fillStyle = sky; g.fillRect(0, HUD, W, H - HUD);
      for (let i = 0; i < 30; i++) { g.fillStyle = "#c8d0f8"; g.fillRect((i * 67) % W, HUD + (i * 29) % 70, 1, 1); }
      const ground = H - 10;
      s.cols.forEach((C, t) => {
        const x0 = t * 60;
        g.fillStyle = "rgba(255,255,255,0.06)"; if (t % 2) g.fillRect(x0, HUD, 60, H - HUD);
        for (const l of C.lamps) {
          const x = x0 + Math.round(l.x), y = ground - l.h;
          g.fillStyle = "#606870"; g.fillRect(x, HUD, 1, y - HUD - 4);
          const on = l.wait > 0;
          g.fillStyle = on ? "#fff8c0" : "#f0a030"; g.fillRect(x - 3, y - 4, 7, 6);
          g.fillStyle = on ? "#ffffff" : "#ffd060"; g.fillRect(x - 2, y - 3, 5, 3);
          if (on) { g.fillStyle = "rgba(255,248,180,0.35)"; g.beginPath(); g.arc(x, y - 1, 9, 0, Math.PI * 2); g.fill(); }
        }
        // The trampoline (giving under a bounce).
        const dip = C.landT > 0 ? 2 : 0;
        g.fillStyle = "#303030"; g.fillRect(x0 + 8, ground + 2, 2, 8); g.fillRect(x0 + 50, ground + 2, 2, 8);
        g.fillStyle = TEAM[t][2]; g.fillRect(x0 + 6, ground + dip, 48, 3);
        g.fillStyle = TEAM[t][0]; g.fillRect(x0 + 7, ground + dip, 46, 2);
        const m = C.mons[C.cur];
        drawMon(g, m, x0 + C.x + (C.swap > 0 ? -12 : 0), ground + dip, { cursor: s.ctx.teams[t].you, noShadow: true });
      });
    },
    counts: (s) => ({ lamps: s.lit, jumps: s.bounces })
  };

  // Disc Catch (Jump, Speed): discs come flying over the field; run (left,
  // right) and jump (A) to catch them: caught higher, worth more. B changes Pokémon.
  const GROUND = H - 12;
  EVENTS.disc = {
    name: "Disc Catch", help: ["Left, Right: run.  A: jump.", "B: change.  High catches score more!"],
    init(ctx) {
      const s = { ctx, frame: 0, duration: FPS * 45, score: [0, 0, 0, 0], caught: 0, jumps: 0, discs: [], next: 30, spawned: 0,
        cur: [0, 0, 0, 0], all: newMons(ctx, (t) => [40 + t * 54, GROUND]) };
      s.mons = s.all.filter((m) => m.slot === 0);
      return s;
    },
    step(s, input) {
      s.frame++;
      if (--s.next <= 0) {
        // A disc, from one side or the other, high or low.
        const left = s.ctx.rng() < 0.5, v = 1.0 + s.ctx.rng() * 1.1;
        s.discs.push({ x: left ? -6 : W + 6, y: HUD + 50 + s.ctx.rng() * 30, vx: left ? v : -v, vy: -0.25 + s.ctx.rng() * 0.35, gold: s.spawned++ % 7 === 6 });
        s.next = 26 + Math.floor(s.ctx.rng() * 16);
      }
      for (const d of s.discs) { d.x += d.vx; d.y += d.vy; d.vy += 0.008; }
      const G = 0.2;
      for (const m of s.mons) {
        tick(m);
        const top = 0.8 + 0.25 * m.stats.speed, vz0 = 2.6 + 0.4 * m.stats.jump;
        let dx = 0, jump = false, swap = false;
        if (s.ctx.teams[m.team].you) { dx = (input.right ? 1 : 0) - (input.left ? 1 : 0); jump = input.pressed.a; swap = input.pressed.b; }
        else {
          // (The computer: where the disc it can get to soonest comes low enough
          // to reach, and up as it comes.)
          const reach = vz0 * vz0 / (2 * G) + 22;
          let best = null, bx = 0, bt = 1e9;
          for (const d of s.discs) {
            let x = d.x, y = d.y, vy = d.vy, f = 0;
            while (GROUND - y > reach && f < 400 && x > -10 && x < W + 10) { x += d.vx; y += vy; vy += 0.008; f++; }
            if (x < 0 || x > W) continue;
            const need = Math.abs(x - m.x) / top * (1.2 - 0.3 * st(m, "skill")) + s.ctx.rng() * 20;
            if (need > f + 40) continue;
            if (f < bt) { bt = f; best = d; bx = x; }
          }
          if (best) {
            if (Math.abs(bx - m.x) > 3) dx = Math.sign(bx - m.x) * (s.ctx.rng() < 0.85 * s.ctx.ai + 0.1 ? 1 : 0);
            const h = GROUND - best.y - 14;
            jump = Math.abs(best.x - m.x) < 16 && h > 6 && h < reach - 10 && s.ctx.rng() < 0.25 + 0.2 * st(m, "skill");
          }
          swap = false;
        }
        if (swap && m.z === 0) {
          const next = s.all.find((o) => o.team === m.team && o.slot === (m.slot + 1) % 3);
          Object.assign(next, { x: m.x, z: 0, vz: 0, vx: 0 });
          s.mons[s.mons.indexOf(m)] = next;
          s.ctx.sfx("se_select");
          continue;
        }
        m.vx = dx * top * (m.tired ? 0.5 : 1);
        stamina(m, dx !== 0);
        if (dx) m.face = dx;
        m.x = clamp(m.x + m.vx, 10, W - 10);
        m.moving = dx !== 0 || m.z > 0;
        if (jump && !m.z) { m.vz = vz0; m.z = 0.01; if (s.ctx.teams[m.team].you) { s.jumps++; s.ctx.sfx("se_m_jump_kick"); } }
        if (m.z > 0) { m.z += m.vz; m.vz -= G; if (m.z <= 0) { m.z = 0; m.vz = 0; } }
        for (const d of s.discs) {
          if (d.done || Math.abs(d.x - m.x) > 12 || Math.abs(d.y - (GROUND - m.z - 14)) > 12) continue;
          d.done = true;
          const h = GROUND - d.y;
          s.score[m.team] += (2 + Math.floor(Math.max(0, h - 14) / 20)) * (d.gold ? 2 : 1);
          if (s.ctx.teams[m.team].you) { s.caught++; s.ctx.sfx(d.gold ? "se_shiny" : "se_bag_cursor"); }
        }
      }
      bump(s.mons.filter((m) => !m.z), 6);
      s.mons.forEach((m) => { m.x = clamp(m.x, 10, W - 10); m.y = GROUND; });
      s.discs = s.discs.filter((d) => !d.done && d.y < GROUND && d.x > -10 && d.x < W + 10);
      if (s.frame >= s.duration) s.over = true;
    },
    draw(s, g) {
      const sky = g.createLinearGradient(0, HUD, 0, GROUND);
      sky.addColorStop(0, "#68b8f0"); sky.addColorStop(1, "#c8e8f8");
      g.fillStyle = sky; g.fillRect(0, HUD, W, GROUND - HUD);
      g.fillStyle = "#f8f8f8"; for (const [x, y] of [[30, 40], [150, 30], [200, 55]]) { g.fillRect(x, y, 22, 5); g.fillRect(x + 4, y - 3, 12, 3); }
      crowd(g, GROUND - 26, 18, s.frame);
      lawn(g, 0, GROUND - 8, W, H - GROUND + 8);
      for (const m of s.mons) drawMon(g, m, m.x, GROUND, { cursor: s.ctx.teams[m.team].you });
      for (const d of s.discs) {
        const x = Math.round(d.x), y = Math.round(d.y);
        g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x - 3, GROUND - 1, 7, 2);
        g.fillStyle = "#303030"; g.fillRect(x - 5, y - 1, 11, 3);
        g.fillStyle = d.gold ? "#f8d030" : (s.frame >> 2) % 2 ? "#f86060" : "#f88080"; g.fillRect(x - 4, y - 1, 9, 2);
      }
    },
    counts: (s) => ({ discs: s.caught, jumps: s.jumps })
  };

  // ---------- Playing one ----------

  const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b" };
  function run(root, id, teams, opts) {
    opts = opts || {};
    const ev = EVENTS[id];
    const ctx = { teams, you: Math.max(0, teams.findIndex((t) => t.you)), rng: opts.rng || Math.random, ai: opts.ai || 1,
      sfx: (name) => { if (name && opts.sfx) opts.sfx(name); } };
    root.classList.add("evo", "athlon");
    root.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "world evo-scene athlon-canvas";
    canvas.width = W * 2; canvas.height = H * 2;
    root.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    const s = ev.init(ctx);
    const held = {}, pressed = {};
    return new Promise((resolve) => {
      const down = (e) => {
        const k = KEY[e.key];
        if (!k) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (!held[k] && !e.repeat) pressed[k] = true;
        held[k] = true;
      };
      const up = (e) => { const k = KEY[e.key]; if (k) { held[k] = false; e.preventDefault(); e.stopImmediatePropagation(); } };
      document.addEventListener("keydown", down, true);
      document.addEventListener("keyup", up, true);
      // phase: "intro" (how to play, until A), "count" (3, 2, 1), "play", "finish".
      let phase = "intro", pf = 0, last = 0, acc = 0;
      window.PokeathlonEvents.playing = id;
      function frame(now) {
        acc += Math.min(100, now - (last || now));
        last = now;
        const steps = Math.max(1, (window.PokeathlonEvents && window.PokeathlonEvents.fast) | 0);
        while (acc >= 1000 / FPS) {
          acc -= 1000 / FPS;
          for (let k = 0; k < (phase === "play" ? steps : 1); k++) {
            pf++;
            if (phase === "intro" && (pressed.a || pf > FPS * 8)) { phase = "count"; pf = 0; ctx.sfx("se_select"); }
            else if (phase === "count" && pf % FPS === 1) ctx.sfx(pf > FPS * 3 ? "se_pin" : "se_ball");
            if (phase === "count" && pf >= FPS * 3 + 30) { phase = "play"; pf = 0; }
            if (phase === "play") {
              const input = Object.assign({}, held, { pressed: Object.assign({}, pressed) });
              ev.step(s, input);
              for (const k2 of Object.keys(pressed)) delete pressed[k2];
              if (s.over) { phase = "finish"; pf = 0; ctx.sfx("se_pin"); }
            } else if (phase === "finish" && pf > FPS * 2) { finish(); return; }
          }
          if (phase !== "play") for (const k2 of Object.keys(pressed)) delete pressed[k2];
        }
        draw();
        requestAnimationFrame(frame);
      }
      function draw() {
        g.setTransform(2, 0, 0, 2, 0, 0);
        ev.draw(s, g);
        hud(g, s);
        if (phase === "intro") {
          box(g, 20, 44, 200, 66);
          text(g, ev.name, W / 2, 48, "gold", "center");
          g.fillStyle = "#606068"; g.fillRect(28, 64, 184, 1);
          ev.help.forEach((line, i) => text(g, line, W / 2, 68 + i * 14, "dark", "center"));
          if ((pf >> 5) % 2) text(g, "A: start", W / 2, 95, "dark", "center");
        } else if (phase === "count") {
          const n = 3 - Math.floor(pf / FPS);
          box(g, W / 2 - 30, 62, 60, 24);
          text(g, n > 0 ? String(n) : "Start!", W / 2, 66, "dark", "center");
        } else if (phase === "finish") {
          box(g, W / 2 - 34, 62, 68, 24);
          text(g, "Finish!", W / 2, 66, "dark", "center");
        }
      }
      function finish() {
        document.removeEventListener("keydown", down, true);
        document.removeEventListener("keyup", up, true);
        root.classList.remove("athlon");
        window.PokeathlonEvents.playing = null;
        resolve({ points: s.score.map((n) => Math.max(0, Math.round(n))), counts: ev.counts ? ev.counts(s) : {} });
      }
      draw();
      requestAnimationFrame(frame);
    });
  }

  // (For a test: an event played straight through with no one at the controls,
  // the computer for every team, in node.)
  function simulate(id, teams, rng, frames) {
    const ev = EVENTS[id], ctx = { teams, you: -1, rng: rng || Math.random, ai: 1, sfx: () => {} };
    const s = ev.init(ctx);
    for (let f = 0; f < (frames || FPS * 120) && !s.over; f++) ev.step(s, { pressed: {} });
    return { points: s.score.map((n) => Math.max(0, Math.round(n))), over: !!s.over, counts: ev.counts ? ev.counts(s) : {} };
  }

  window.PokeathlonEvents = { EVENTS, run, simulate, TEAM, W, H, drawMon, text, box, iconOf, fast: 0 };
})();
