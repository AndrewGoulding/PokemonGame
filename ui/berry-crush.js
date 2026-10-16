// FireRed's Berry Crush screen (src/berry_crush.c, with game/berry-crush.js
// playing the game), on a 240x160 canvas in #scene with the text box under
// it. Pictures: tools/build-berry-crush.js.
//
//   const bc = await BerryCrushScreen.open(sceneEl, {
//     players: [{ name, cpu (for the computer's), you (true for yours) }],
//     sfx, frame (the Option screen's FRAME)
//   });
//   await bc.fadeIn();
//   await bc.drop([{ id, icon, box }, ...])  // each one's Berry falls into the crusher, then the lid
//   await bc.countdown();                    // "3 2 1 START"
//   const { game, timeUp } = await bc.play(berryIds)   // until it's crushed (A, Z or Space)
//   await bc.finish(timeUp);
//   await bc.results(res, newRecord, berryName)   // the three pages, A after each
//   bc.reset();  bc.close();
//
// The crusher sits in the middle with the players' names round it, as
// FireRed seats them (sPlayerIdToPosId); the lid drops in and every press
// pushes it down (32 pixels when it's done), with each player's impact on
// the lid (a big one when two or more press on the same frame), powder
// sparkling out underneath and the screen shaking.
(function () {
  "use strict";

  const W = 240, H = 160, FRAME_MS = 1000 / 60;
  const CRUSHER_START_Y = -104;
  // sPlayerCoords: name frame (tiles), impact and Berry offsets.
  const SEATS = [
    { win: [0, 0], frame: [0, 0], impact: [0, -16], berry: [0, 0] },
    { win: [0, 3], frame: [0, 3], impact: [-28, -4], berry: [-24, 16] },
    { win: [0, 6], frame: [0, 6], impact: [-16, 20], berry: [-8, 16] },
    { win: [21, 3], frame: [20, 3], impact: [28, -4], berry: [32, -8] },
    { win: [21, 6], frame: [20, 6], impact: [16, 20], berry: [16, -8] }
  ];
  const SEAT_OF = [[1, 3], [0, 1, 3], [1, 3, 2, 4], [0, 1, 3, 2, 4]];   // sPlayerIdToPosId
  const SPARKLE_COORDS = [[0, 0], [-16, -4], [16, -4], [-8, -2], [8, -2], [-24, -8], [24, -8], [-32, -12], [32, -12], [-40, -16], [40, -16]];
  const sinTable = (i) => Math.round(Math.sin(((i & 255) / 256) * 2 * Math.PI) * 256);
  const Sin = (i, amp) => (sinTable(i) * amp) >> 8;

  function load(url) {
    return new Promise((resolve) => { if (!url) { resolve(null); return; } const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url; });
  }
  const A = (n) => load("assets/berry-crush/" + n + ".png");

  async function open(root, opts) {
    const [bg, container, lid, nameFrames, core, impact, sparkle, digits, count] = await Promise.all(
      ["bg", "container", "lid", "name-frames", "crusher-base", "impact", "sparkle", "timer-digits", "countdown"].map(A));
    const GM = window.GbaMenus, pal = window.GBA_MENUS.palettes.std3;
    const sfx = opts.sfx || (() => {});
    const players = opts.players, n = players.length;
    const seats = players.map((_, i) => SEATS[SEAT_OF[n - 2][i]]);
    root.classList.add("evo", "crush");
    root.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "world evo-scene";
    canvas.width = W * 2; canvas.height = H * 2;
    root.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;

    // The players' names (BG0's windows: yours white, the others light grey
    // with a red shadow, as sBerryCrushTextColorTable has them).
    const names = GM.Surface();
    players.forEach((p, i) => {
      const [l, t] = seats[i].win, w = names.textWidth(p.name);
      if (p.you) names.text(p.name, l * 8 + 36 - (w >> 1), t * 8 + 1, pal[1], pal[2]);
      else names.text(p.name, l * 8 + 36 - (w >> 1), t * 8 + 1, pal[3], pal[4]);
    });
    const namesCanvas = names.canvas();

    const st = {
      depth: CRUSHER_START_Y, vibration: 0, fade: 1, fadeColour: "#000", blend: null,
      timer: null,      // frames, while it shows
      impacts: players.map(() => null), sparkles: SPARKLE_COORDS.map(() => null), berries: [],
      countdown: [], overlay: null
    };
    function draw() {
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      const v = st.vibration, off = st.depth + v;
      // BG3: the room and the name frames (moved down by the shaking).
      if (bg) g.drawImage(bg, 0, v);
      if (nameFrames) players.forEach((_, i) => {
        const seatId = SEAT_OF[n - 2][i], [fx, fy] = seats[i].frame;
        g.drawImage(nameFrames, 0, seatId * 16, 80, 16, fx * 8, fy * 8 + v, 80, 16);
      });
      // Priority 3 sprites: the crusher's core (with the lid), the powder, the Berries.
      if (core) g.drawImage(core, 120 - 32, 88 - 32 + off);
      for (const s of st.sparkles) if (s && sparkle) g.drawImage(sparkle, 0, s.frame * 16, 16, 16, Math.round(s.x + s.x2 - 8), Math.round(s.y + s.y2 - 8), 16, 16);
      for (const b of st.berries) {
        if (!b.img) continue;
        g.save(); g.translate(Math.round(b.x + b.x2), Math.round(b.y + b.y2)); g.rotate(b.rot);
        const [bx, by, bw, bh] = b.box || [0, 0, b.img.width, b.img.height];
        g.drawImage(b.img, bx, by, bw, bh, -bw / 2, -bh / 2, bw, bh);
        g.restore();
      }
      // BG2: the container; BG1: the lid.
      if (container) g.drawImage(container, 0, v);
      if (lid) g.drawImage(lid, 0, off);
      for (let i = 0; i < n; i++) {
        const m = st.impacts[i];
        if (!m || !impact) continue;
        const [ix, iy] = seats[i].impact;
        g.drawImage(impact, 0, m.frame * 32, 32, 32, 120 + ix - 16 + m.dx, 32 + iy - 16 + m.dy + off, 32, 32);
      }
      // BG0: the names; the timer.
      g.drawImage(namesCanvas, 0, v);
      if (st.timer != null && digits) {
        const t = window.BerryCrush.minSec(st.timer);
        const num = (str, x) => [...str].forEach((c, k) => { if (c !== " ") g.drawImage(digits, 0, +c * 16, 8, 16, x + 8 * k, 0, 8, 16); });
        num(String(t.min).padStart(2, " "), 156);
        g.drawImage(digits, 0, 160, 8, 16, 172, 0, 8, 16);
        num(String(t.sec).padStart(2, "0"), 180);
        g.drawImage(digits, 0, 160, 8, 16, 196, 0, 8, 16);
        num(t.frac, 204);
      }
      // "3 2 1 START".
      for (const c of st.countdown) {
        if (c.hidden || !count) continue;
        g.save(); g.translate(c.x, c.y + c.y2 + c.anchor); g.scale(c.sx, c.sy);
        g.drawImage(count, c.src[0], c.src[1], c.src[2], c.src[3], -c.src[2] / 2, -c.src[3] / 2 - c.anchor, c.src[2], c.src[3]);
        g.restore();
      }
      if (st.overlay) g.drawImage(st.overlay, 0, 0);
      if (st.blend) { g.globalAlpha = st.blend.a; g.fillStyle = st.blend.colour; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      if (st.fade) { g.globalAlpha = st.fade; g.fillStyle = st.fadeColour; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }

    // ---------- Frames ----------
    let gen = null, timer = null, last = 0, acc = 0, done = null;
    const tickers = new Set();
    function loop(now) {
      acc += Math.min(200, now - (last || now));
      last = now;
      while (acc >= FRAME_MS) {
        acc -= FRAME_MS;
        for (const t of [...tickers]) if (t() === false) tickers.delete(t);
        if (gen) { const r = gen.next(); if (r.done) { gen = null; const d = done; done = null; if (d) d(r.value); } }
      }
      draw();
      timer = requestAnimationFrame(loop);
    }
    draw();
    timer = requestAnimationFrame(loop);
    const run = (it) => new Promise((resolve) => { done = resolve; gen = it; });
    function* frames(k) { for (let i = 0; i < k; i++) yield; }
    function* fade(from, to, k) { for (let i = 1; i <= k; i++) { st.fade = from + (to - from) * i / k; yield; } }

    // sIntroOutroVibrationData from the strongest down (the lid landing, the end).
    function* introOutro() {
      const D = window.BerryCrush.INTRO_OUTRO;
      for (let idx = 4; idx >= 0; idx--) for (let c = 0; c < D[idx][0]; c++) { st.vibration = D[idx][c]; yield; }
      st.vibration = 0;
    }

    // An impact on the lid: small (frames 0-2, 4 each) or big (3-6, 2 each).
    function startImpact(i, big, offset) {
      const seq = big ? [3, 3, 4, 4, 5, 5, 6, 6] : [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2];
      st.impacts[i] = { seq, k: 0, frame: seq[0], dx: offset[0], dy: offset[1] };
    }
    tickers.add(() => {
      st.impacts.forEach((m, i) => { if (!m) return; if (++m.k >= m.seq.length) st.impacts[i] = null; else m.frame = m.seq[m.k]; });
    });
    // The powder (SpriteCB_Sparkle_Init / SpriteCB_Sparkle): falling from
    // under the crusher, drifting out and wobbling, to y 168.
    let sparkleTick = 0;
    function startSparkles(count, big) {
      let yMod = st.timerFrames % 3;
      const xMod = yMod;
      for (let i = 0; i < count && i < SPARKLE_COORDS.length; i++) {
        if (st.sparkles[i]) continue;
        const [cx, cy] = SPARKLE_COORDS[i];
        const y = cy + 136 - yMod * 4;
        const travel = cx + (xMod ? Math.trunc(cx / (xMod * 4)) : 0);
        const est = (168 - y) / 2.625;
        st.sparkles[i] = { x: cx + 120, y, x2: 0, y2: 0, sx: cx + 120, xSpeed: travel / est, sin: 0, sinSpeed: 127 / (est * 2 / 3),
          amp: Math.trunc(travel / 4), ySpeed: 640, big, t: 0, frame: big ? 6 : 0 };
        yMod = yMod >= 3 ? 0 : yMod + 1;
      }
    }
    tickers.add(() => {
      sparkleTick++;
      st.sparkles.forEach((s, i) => {
        if (!s) return;
        s.ySpeed += 32;
        s.y2 += s.ySpeed >> 8;
        if (s.sinSpeed) {
          s.sx += s.xSpeed; s.sin += s.sinSpeed;
          s.x2 = Sin(Math.trunc(s.sin), s.amp);
          if (s.sin > 126) { s.x2 = 0; s.sinSpeed = 0; }
        }
        s.x = s.sx;
        s.t++;
        s.frame = s.big ? 6 + Math.floor(s.t / 4) % 8 : Math.floor(s.t / 2) % 6;
        if (s.y + s.y2 > 168) st.sparkles[i] = null;
      });
    });
    const effectsDone = () => st.impacts.every((m) => !m) && st.sparkles.every((s) => !s);

    // ---------- The steps ----------

    // CreateBerrySprites / SpriteCB_DropBerryIntoCrusher, one after another,
    // then SE_FALL and the lid drops (Cmd_DropLid: 4 pixels a frame).
    function* dropSteps(berries) {
      for (let i = 0; i < n; i++) {
        const b = berries[i], [x0, xDest] = seats[i].berry;
        const dist = xDest - x0, est = 127 / 2.125;
        const sp = { img: b.img, box: b.box, x: 120 + x0, y: -16, x2: 0, y2: 0, rot: 0, ySpeed: 512, sx: 120 + x0,
          xSpeed: dist / est, sin: 0, sinSpeed: 127 / (est * 2 / 3), amp: Math.trunc(dist / 4), turn: x0 < 0 ? -1 : 1 };
        st.berries.push(sp);
        sfx("se_ball_throw");
        for (;;) {
          sp.ySpeed += 32;
          sp.y2 += sp.ySpeed >> 8;
          if (sp.sinSpeed) {
            sp.sx += sp.xSpeed; sp.sin += sp.sinSpeed;
            sp.x2 = Sin(Math.trunc(sp.sin), sp.amp);
            if (sp.sin > 126) { sp.x2 = 0; sp.sinSpeed = 0; }
          }
          sp.x = sp.sx;
          sp.rot += sp.turn * 2 * Math.PI / 256;
          if (sp.y + sp.y2 >= 112) break;
          yield;
        }
        st.berries = st.berries.filter((x) => x !== sp);
        yield;
      }
      sfx("se_fall");
      while (st.depth < 0) { st.depth = Math.min(0, st.depth + 4); yield; }
      sfx("se_m_strength");
      yield* introOutro();
    }

    // StartMinigameCountdown at (120, 80).
    function* countdownSteps() {
      const digit = { x: 120, y: 80, y2: 0, sx: 1, sy: 1, anchor: 16, src: [0, 0, 32, 32] };
      st.countdown = [digit];
      const affine = function* (dx, dy, k) { for (let i = 0; i < k; i++) { digit.sx += dx / 256; digit.sy += dy / 256; yield; } };
      for (let d = 0; d < 3; d++) {
        digit.src = [0, d * 32, 32, 32];
        sfx("se_ball_bounce_2");
        yield* frames(20);
        digit.sx = digit.sy = 1;
        yield* affine(16, -16, 8);
        yield* frames(4);
        digit.sx = digit.sy = 1;
        // (Stretching tall as it jumps up 32 pixels.)
        for (let i = 0; i < 8; i++) { digit.sx -= 18 / 256; digit.sy += 18 / 256; digit.y2 -= 4; yield; }
        if (d === 2) break;
        digit.src = [0, (d + 1) * 32, 32, 32];
        for (let i = 0; i < 8; i++) { digit.y2 += 4; yield; }
        digit.sx = digit.sy = 1;
        yield* affine(6, -6, 8);
        yield* affine(-4, 4, 8);
        digit.sx = digit.sy = 1;
      }
      // START, in two halves, drops in and bounces (SpriteCB_Start).
      const halves = [0, 1].map((h) => ({ x: 120 - 32 + 64 * h, y: 80, y2: -40, sx: 1, sy: 1, anchor: 0, src: [0, 96 + 32 * h, 64, 32] }));
      st.countdown = halves;
      let speed = 64, pos = -40 * 16;
      for (;;) { pos += speed; speed++; const y2 = pos >> 4; if (y2 >= 0) break; halves.forEach((h) => { h.y2 = y2; }); yield; }
      halves.forEach((h) => { h.y2 = 0; });
      sfx("se_ball_bounce_2");
      for (let a = 12; a < 128; a += 12) { halves.forEach((h) => { h.y2 = -(sinTable(a) >> 4); }); yield; }
      sfx("se_ball_bounce_2");
      for (let a = 16; a < 128; a += 16) { halves.forEach((h) => { h.y2 = -(sinTable(a) >> 5); }); yield; }
      sfx("se_ball_bounce_2");
      halves.forEach((h) => { h.y2 = 0; });
      yield* frames(41);
      st.countdown = [];
    }

    // Cmd_PlayGame_Leader every frame until the crusher's all the way down.
    const keyIsA = (k) => k === "z" || k === "Z" || k === " ";
    function* playSteps(berryIds) {
      const BC = window.BerryCrush;
      const game = BC.create(players.map((p, i) => ({ name: p.name, berry: berryIds[i] })));
      let pressed = false, held = false;
      const down = (e) => { if (!keyIsA(e.key)) return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && !held) pressed = true; held = true; };
      const up = (e) => { if (keyIsA(e.key)) held = false; };
      document.addEventListener("keydown", down, true);
      document.addEventListener("keyup", up, true);
      st.timer = 0;
      try {
        for (;;) {
          const presses = players.map((p, i) => (p.you ? pressed : BC.cpuPress(p.cpu, game.timer + 1)));
          const helds = players.map((p, i) => (p.you ? held : BC.cpuHeld(p.cpu, game.timer + 1)));
          pressed = false;
          const fx = BC.step(game, presses, helds);
          st.timer = game.timer; st.timerFrames = game.timer;
          st.depth = fx.depth; st.vibration = fx.vibration;
          for (const m of fx.impacts) startImpact(m.player, m.big, m.offset);
          if (fx.sparkles) startSparkles(fx.sparkles.count, fx.sparkles.big);
          if (fx.sound) sfx(fx.sound);
          if (fx.done) return { game, timeUp: fx.timeUp };
          yield;
        }
      } finally {
        document.removeEventListener("keydown", down, true);
        document.removeEventListener("keyup", up, true);
      }
    }

    // Cmd_FinishGame (a yellow flash, the lid's last thump) or
    // Cmd_HandleTimeUp (a red one), then the powder settles.
    function* finishSteps(timeUp) {
      if (timeUp) {
        sfx("se_failure");
        st.blend = { colour: "rgb(255,0,0)", a: 0.5 };
        yield* frames(5);
        st.blend = null;
      } else {
        sfx("se_m_strength");
        st.blend = { colour: "rgb(255,255,0)", a: 0.5 };
        yield* frames(3);
        st.blend = null;
        yield* introOutro();
      }
      while (!effectsDone()) yield;
      st.vibration = 0;
    }

    // ---------- The results (OpenResultsWindow) ----------
    const COLOURS = { gray: [pal[2], pal[3]], blue: [pal[8], pal[9]], green: [pal[6], pal[7]], red: [pal[4], pal[5]] };
    const HEIGHTS = [[6, 8, 9, 11], [12, 14, 15, 16]];
    const TITLES = { neatness: "Neatness Rankings", cooperative: "Cooperative Rankings", power: "Pressing-Power Rankings" };
    function resultsPage(res, page, newRecord, berryName) {
      const s = GM.Surface(), BC = window.BerryCrush;
      const crushing = page === 2;
      const l = crushing ? 3 : 4, t = 2, w = crushing ? 24 : 22, h = HEIGHTS[crushing ? 1 : 0][n - 2];
      s.frame("std", pal, l, t, w, h);
      s.fill(l * 8, t * 8, w * 8, h * 8, pal[1]);
      const X = l * 8, Y = t * 8;
      const text = (str, x, y, c) => s.text(str, X + x, Y + y, COLOURS[c][0], COLOURS[c][1]);
      const right = (str, x, y, c) => text(str, x - s.textWidth(str), y, c);
      const centred = (str, mid, c) => text(str, mid * 4 - (s.textWidth(str) >> 1), 0, c);
      const nameRow = (rank, player, y) => {
        text((rank + 1) + ".", 4, y, "gray");
        text(players[player].name, 4 + s.textWidth((rank + 1) + ". "), y, players[player].you ? "blue" : "gray");
      };
      // (Equal scores share a place: "linkIdToPrint".)
      const ranked = (rows, show, x, y0) => {
        let rank = 0;
        rows.forEach((r, i) => {
          if (i && r.stat !== rows[i - 1].stat) rank = i;
          nameRow(rank, r.player, y0 + 14 * i);
          right(show(r.stat), x, y0 + 14 * i, "gray");
        });
      };
      const y0 = 8 * h - n * 14;
      if (page === 0) {
        centred("No. of Presses Rankings", 22, "blue");
        ranked(res.presses, (v) => v + " times", 172, y0);
      } else if (page === 1) {
        centred(TITLES[res.page], 22, "green");
        ranked(res.random, (v) => BC.q4Text(v), 172, y0);
      } else {
        centred("Crushing Results", 24, "blue");
        players.forEach((p, i) => { nameRow(i, i, 16 + 14 * i); right(berryName(res.berries[i]), 188, 16 + 14 * i, "gray"); });
        const y = h * 8 - 42, tm = BC.minSec(res.time);
        text("Time:", 2, y, "gray");
        right(tm.min + " min. " + String(tm.sec).padStart(2, "0") + "." + tm.frac + " sec.", 190, y, "gray");
        text("Pressing Speed:", 2, y + 14, "gray");
        const speed = BC.speedText(res.pressingSpeed);
        right("Times/sec.", 190, y + 14, "gray");
        right(speed, 190 - s.textWidth("Times/sec.") - 4, y + 14, newRecord ? "red" : "gray");
        text("Silkiness:", 2, y + 28, "gray");
        right(res.silkiness + "%", 190, y + 28, "gray");
      }
      return s.canvas();
    }

    return {
      fadeIn: () => run(fade(1, 0, 8)),
      fadeOut: () => run(fade(0, 1, 8)),
      async drop(berries) {
        const imgs = await Promise.all(berries.map((b) => load(b.icon)));
        return run(dropSteps(berries.map((b, i) => Object.assign({}, b, { img: imgs[i] }))));
      },
      countdown: () => run(countdownSteps()),
      play: (berryIds) => run(playSteps(berryIds)),
      finish: (timeUp) => run(finishSteps(timeUp)),
      async results(res, newRecord, berryName) {
        st.timer = null;
        for (let page = 0; page < 3; page++) {
          st.overlay = resultsPage(res, page, newRecord, berryName);
          await run(frames(30));
          await GM.keys((k) => (k === "a" ? true : undefined));
          sfx("se_select");
          st.overlay = null;
        }
      },
      reset() { st.depth = CRUSHER_START_Y; st.vibration = 0; st.timer = null; st.overlay = null; },
      close() {
        cancelAnimationFrame(timer);
        tickers.clear();
        root.classList.remove("evo", "crush");
        root.innerHTML = "";
      }
    };
  }

  window.BerryCrushScreen = { open };
})();
