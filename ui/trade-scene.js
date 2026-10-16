// FireRed's trade sequence (src/trade_scene.c: DoTradeAnim_Cable, as the
// in-game trades play it), drawn on a 240x160 canvas in #scene with the text
// box under it, as the evolution scene is. Pictures: tools/build-trade.js.
//
//   const t = await TradeScene.open(sceneEl, {
//     send:    { url, species, name },   // yours, leaving
//     receive: { url, species, name },   // theirs, arriving
//     partner: "Tradeback Guy",          // who it's sent to (STR_VAR_1)
//     say, cry, music, fanfare, waitA    // the game's text box, sound and A
//   });
//   await t.run();   // the whole trade; ends on "Take good care of …!" and A
//   t.close();
//
// Yours slides in from the left over its shadow ("… will be sent to …", its
// cry), goes back into its Poké Ball ("Bye-bye, …!"), which bounces, turns
// white and squeezes away; the GBA zooms out, its screen flashes, the cable
// plug drops in and a glowing light runs up the cable. The two Pokémon pass
// each other in the cable, then it all plays backwards for theirs: down the
// cable, into the GBA, zoom in, and a Poké Ball drops and bounces in and
// theirs comes out ("… sent over …", its cry, the evolved fanfare, "Take
// good care of …!"). Stepped at 60 frames a second, frame for frame.
(function () {
  "use strict";

  const W = 240, H = 160, FRAME_MS = 1000 / 60;
  const se = (name) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };
  // sTradeBallVerticalVelocityTable.
  const BALL_DY = [0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, -4, -4, -4, -3, -3, -3, -3, -2, -2, -2,
    -2, -1, -1, -1, -1, 0, -1, 0, -1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, -4, -3,
    -3, -2, -2, -1, -1, -1, 0, -1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 2, 2, 3, 3, 4, -4, -3, -2, -1, -1, -1, 0, 0, 0, 0, 1, 0, 1, 1, 2, 3];
  // BeginNormalPaletteFade's length in frames for a delay: 2 steps of 16 a
  // frame, one more a frame for each step below 0, a frame more apart above.
  const fadeFrames = (delay) => (delay < 0 ? Math.ceil(16 / (2 - delay)) : 8 * (delay + 1));

  function load(url) {
    return new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url; });
  }
  const A = (n) => load("assets/trade/" + n + ".png");

  async function open(root, opts) {
    const [monBg, cable, closeup, affine, ball, glow, shadow, shadowWhite, plug, screen, sendPic, recvPic] = await Promise.all([
      A("mon-bg"), A("gba-cable"), A("cable-closeup"), A("gba-affine"), A("pokeball"), A("link-glow"), A("link-shadow"),
      A("link-shadow-white"), A("cable-end"), A("gba-screen"), load(opts.send.url), load(opts.receive.url)]);
    const M = window.SPRITE_METRICS || { front: {} };
    // Where a 96x96 picture's feet are (FireRed: gMonFrontPicCoords' y_offset
    // puts them at the 64x64 box's bottom, y 92 on the trade screen).
    const feet = (species) => { const d = window.DEX && window.DEX[species]; return 96 - ((d && M.front[d.id]) || 0); };
    root.classList.add("evo");
    root.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "world evo-scene";
    canvas.width = W * 2; canvas.height = H * 2;
    root.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;

    const st = {
      bg: "mon", hofs: 180, vofs: 348, mag: 8, backdrop: "#000", fade: 1, fadeColour: "#000",
      mon: null,   // { pic, species, x, y (feet), x2, y2, scale, white, flip }
      sprites: []  // { img, sx, sy, w, h, x, y (centre), sw, sh, alpha, rot, white }
    };
    // A picture tinted all white (`white` 0-1), for the ball and the Pokémon fading.
    const tint = document.createElement("canvas"), tg = tint.getContext("2d");
    function drawTinted(img, sx, sy, w, h, dx, dy, dw, dh, white, flip) {
      if (!white) {
        if (flip) { g.save(); g.translate(dx + dw, dy); g.scale(-1, 1); g.drawImage(img, sx, sy, w, h, 0, 0, dw, dh); g.restore(); }
        else g.drawImage(img, sx, sy, w, h, dx, dy, dw, dh);
        return;
      }
      tint.width = w; tint.height = h;
      tg.clearRect(0, 0, w, h);
      tg.drawImage(img, sx, sy, w, h, 0, 0, w, h);
      tg.globalCompositeOperation = "source-atop";
      tg.globalAlpha = white; tg.fillStyle = "#fff"; tg.fillRect(0, 0, w, h);
      tg.globalAlpha = 1; tg.globalCompositeOperation = "source-over";
      drawTinted(tint, 0, 0, w, h, dx, dy, dw, dh, 0, flip);
    }
    function draw() {
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = st.backdrop;
      g.fillRect(0, 0, W, H);
      // The backgrounds.
      if (st.bg === "mon" && monBg) g.drawImage(monBg, st.hofs, 0, W, H, 0, 0, W, H);
      else if (st.bg === "cable" && cable) g.drawImage(cable, 0, st.vofs, 256, H, 0, 0, 256, H);
      else if (st.bg === "closeup" && closeup) g.drawImage(closeup, 0, 0, 256, H, 0, 0, 256, H);
      else if (st.bg === "affine" && affine) {
        // BG2's affine GBA: texture (64, 92) on the screen's (120, 80), `mag` times.
        g.drawImage(affine, 120 - 64 * st.mag, 80 - 92 * st.mag, 128 * st.mag, 128 * st.mag);
      }
      // The Pokémon.
      const m = st.mon;
      if (m && m.pic && m.scale > 0) {
        const s = m.scale, w = 96 * s, h = 96 * s;
        // (Scaled about the picture's middle, as an affine sprite is.)
        const cx = m.x + m.x2, cy = m.y + m.y2 - feet(m.species) + 48;
        drawTinted(m.pic, 0, 0, 96, 96, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h, m.white, m.flip);
      }
      for (const sp of st.sprites) {
        if (sp.hidden) continue;
        const sw = sp.w * (sp.sw == null ? 1 : sp.sw), sh = sp.h * (sp.sh == null ? 1 : sp.sh);
        g.globalAlpha = sp.alpha == null ? 1 : sp.alpha;
        const dx = Math.round(sp.x - sw / 2), dy = Math.round(sp.y - sh / 2);
        if (sp.rot) {
          g.save(); g.translate(sp.x, sp.y); g.rotate(Math.PI);
          drawTinted(sp.img(), sp.sx, sp.sy, sp.w, sp.h, -sw / 2, -sh / 2, sw, sh, sp.white || 0);
          g.restore();
        } else drawTinted(sp.img(), sp.sx, sp.sy, sp.w, sp.h, dx, dy, sw, sh, sp.white || 0);
        g.globalAlpha = 1;
      }
      if (st.fade) { g.globalAlpha = st.fade; g.fillStyle = st.fadeColour; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }

    // ---------- Running it ----------
    let gen = null, timer = null, last = 0, acc = 0, done = null;
    const tickers = new Set();   // per-frame sprite callbacks
    function loop(now) {
      acc += Math.min(200, now - (last || now));
      last = now;
      while (acc >= FRAME_MS) {
        acc -= FRAME_MS;
        for (const t of [...tickers]) if (t() === false) tickers.delete(t);
        if (gen && gen.next().done) { gen = null; if (done) done(); }
      }
      draw();
      timer = requestAnimationFrame(loop);
    }
    draw();
    timer = requestAnimationFrame(loop);
    // Waiting on a promise from inside the steps.
    function* until(p) { let ok = false; p.then(() => { ok = true; }); while (!ok) yield; }
    function* frames(n) { for (let i = 0; i < n; i++) yield; }
    function* fade(from, to, colour, delay) {
      const n = fadeFrames(delay);
      st.fadeColour = colour;
      for (let i = 1; i <= n; i++) { st.fade = from + (to - from) * i / n; yield; }
    }
    const add = (sp) => { st.sprites.push(sp); return sp; };
    const remove = (sp) => { st.sprites = st.sprites.filter((x) => x !== sp); };

    // The glowing light (sSpriteTemplate_LinkMonGlow: pulsing 10/256 a frame,
    // SE_BALL every 10 frames, blended) and its core (LinkMonShadow: colour 4
    // blinking every 3 frames).
    function linkMon(x, y, small) {
      const core = add({ img: () => (core.blink % 12 < 3 || (core.blink % 12 >= 6 && core.blink % 12 < 9) ? shadow : shadowWhite),
        sx: 0, sy: small ? 32 : 0, w: 16, h: 32, x, y, rot: true, blink: 0, still: false });
      const light = add({ img: () => glow, sx: 0, sy: 0, w: 32, h: 32, x, y, alpha: 0.75, t: 0, sw: 1, sh: 1 });
      tickers.add(() => {
        if (!st.sprites.includes(light)) return false;
        light.t++;
        const k = light.t % 10, sc = (k < 5 ? 256 - 10 * (k + 1) : 206 + 10 * (k - 4)) / 256;
        light.sw = light.sh = sc;
        if (light.t % 10 === 0) se("se_ball");
        if (!core.still) core.blink++;
        core.x = light.x; core.y = light.y;
      });
      return { light, core, set y(v) { light.y = v; core.y = v; }, get y() { return light.y; }, remove() { remove(light); remove(core); } };
    }
    // The GBA screen's flash (sSpriteTemplate_GbaScreenFlash_Long): frames
    // 0 1 2 3 2 1 0, 2 frames each, nine times, flipped; SE_M_MINIMIZE every 15.
    function* gbaFlash() {
      const sp = add({ img: () => screen, sx: 0, sy: 0, w: 64, h: 32, x: 120, y: 80, rot: true });
      const seq = [0, 1, 2, 3, 2, 1, 0];
      for (let i = 0; i < 9 * 14; i++) {
        sp.sy = seq[Math.floor(i / 2) % 7] * 32;
        if ((i + 1) % 15 === 0) se("se_m_minimize");
        yield;
      }
      remove(sp);
    }
    // The cable's plug, 10 frames down (sending) or up (receiving).
    function plugMoves(dir) {
      const sp = add({ img: () => plug, sx: 0, sy: 0, w: 16, h: 32, x: 128, y: 65, n: 0 });
      tickers.add(() => { sp.y += dir; if (++sp.n === 10) { remove(sp); return false; } });
    }

    function* sequence() {
      const sendFeet = 92, recvFeet = 92;
      // In from the left with its shadow (STATE_MON_SLIDE_IN).
      opts.music && opts.music("mus_evolution");
      st.bg = "mon"; st.hofs = 180;
      st.mon = { pic: sendPic, species: opts.send.species, x: 120, y: sendFeet, x2: -180, y2: 0, scale: 1, white: 0 };
      yield* fade(1, 0, "#000", 0);
      while (st.hofs > 0) { st.mon.x2 += 3; st.hofs -= 3; yield; }
      st.mon.x2 = 0; st.hofs = 0;
      opts.say(opts.send.name + " will be\nsent to " + opts.partner + ".");
      opts.cry && opts.cry(opts.send.species);
      yield* frames(80);
      // Back into its ball (CreateTradePokeballSprite at (120, 32): 20 frames,
      // then it shrinks away, rising, SE_BALL_TRADE at 11).
      opts.say("Bye-bye, " + opts.send.name + "!");
      const tradeBall = add({ img: () => ball, sx: 0, sy: 0, w: 16, h: 16, x: 120, y: 32 });
      yield* frames(20);
      for (let i = 1; i <= 16; i++) {
        if (i === 11) se("se_ball_trade");
        st.mon.scale = 1 - i / 16; st.mon.white = Math.min(1, i / 8); st.mon.y2 = -((96 * i) >> 8);
        yield;
      }
      st.mon = null;
      yield* frames(8);
      // The bouncing ball (SpriteCB_BouncingPokeballDepart / DepartEnd).
      let y2 = 0;
      for (let i = 0; i < 44; i++) {
        y2 += BALL_DY[i]; tradeBall.y = 32 + y2;
        if (i === 22) se("se_ball_bounce_1");
        yield;
      }
      se("se_m_mega_kick");
      for (let i = 0, j = 0; ; i++) {
        tradeBall.white = Math.min(1, (i + 1) / fadeFrames(-1));
        if (i >= 20) tradeBall.sw = Math.max(96, 256 - 8 * (i - 19)) / 256;
        if (i > 20) { y2 -= BALL_DY[j]; tradeBall.y = 32 + y2; if (++j === 23) break; }
        yield;
      }
      remove(tradeBall);
      opts.say("");
      // To the GBA, zooming out (STATE_GBA_ZOOM_OUT: bg2Zoom 0x400 down by 0x34).
      yield* fade(0, 1, "#000", 0);
      st.bg = "affine";
      let zoom = 0x400;
      st.mag = zoom / 128;
      yield* fade(1, 0, "#000", -1);
      while (zoom > 0x100) { zoom -= 0x34; st.mag = Math.max(zoom, 0x100) / 128; yield; }
      st.bg = "cable"; st.vofs = 348;
      yield* frames(21);
      yield* gbaFlash();
      // Panning up off the GBA; the plug goes in at 328 (STATE_PAN_AWAY_GBA).
      while (st.vofs > 316) { st.vofs--; if (st.vofs === 328) plugMoves(1); yield; }
      // The light runs up the cable (the view pans to 166, then it goes off the top).
      let link = linkMon(128, 80, true);
      while (st.vofs > 166) { st.vofs -= 2; yield; }
      while (link.y >= -8) { link.y -= 2; yield; }
      yield* fade(0, 1, "#000", -1);
      link.remove();
      // In the cable: the two lights cross, then the two Pokémon (STATE_CROSSING_*).
      st.bg = "closeup";
      const up = linkMon(111, 170, false), down = linkMon(129, -10, false);
      let dy = 0;
      const fadeIn = fade(1, 0, "#000", -1);
      for (let r = fadeIn.next(); !r.done; r = fadeIn.next()) { dy += 3; up.y = 170 - dy; down.y = -10 + dy; yield; }
      se("se_warp_out");
      while (dy < 90) { dy += 3; up.y = 170 - dy; down.y = -10 + dy; yield; }
      up.core.still = down.core.still = true;
      st.backdrop = "#fff"; yield;
      st.backdrop = "#000"; yield;
      st.backdrop = "#fff"; yield;
      const mine = add({ img: () => sendPic, sx: 0, sy: 0, w: 96, h: 96, x: 60, y: 192 });
      const theirs = add({ img: () => recvPic, sx: 0, sy: 0, w: 96, h: 96, x: 180, y: -32 });
      let my2 = 0;
      for (;;) {
        my2 -= 3; mine.y = 192 + my2; theirs.y = -32 - my2;
        if (my2 < -160 && my2 >= -163) se("se_warp_in");
        if (my2 < -222) break;
        yield;
      }
      remove(mine); remove(theirs);
      st.backdrop = "#000";
      up.core.still = down.core.still = false;
      while (dy < 222) { dy += 3; up.y = 170 - dy; down.y = -10 + dy; yield; }
      yield* fade(0, 1, "#000", -1);
      up.remove(); down.remove();
      // Theirs comes down the cable to the GBA.
      st.bg = "cable"; st.vofs = 166;
      link = linkMon(128, -20, true);
      yield* fade(1, 0, "#000", -1);
      while (link.y < 64) { link.y += 3; yield; }
      while (st.vofs < 316) { st.vofs = Math.min(316, st.vofs + 2); yield; }
      link.remove();
      yield* frames(10);
      while (st.vofs < 348) { st.vofs++; if (st.vofs === 328) plugMoves(-1); yield; }
      yield* gbaFlash();
      // Zooming in on the GBA (STATE_GBA_ZOOM_IN: 0x80 up by 0x34), SE_M_SAND_ATTACK.
      st.bg = "affine"; zoom = 0x80; st.mag = 1;
      se("se_m_sand_attack");
      while (zoom < 0x400) { zoom = Math.min(0x400, zoom + 0x34); st.mag = zoom / 128; yield; }
      yield* fade(0, 1, "#000", 0);
      st.bg = "mon"; st.hofs = 0;
      yield* fade(1, 0, "#000", 0);
      // Their Poké Ball drops in and bounces (SpriteCB_BouncingPokeballArrive),
      // spinning twice, unsquashing and fading from white.
      const arrive = add({ img: () => ball, sx: 0, sy: 0, w: 16, h: 16, x: 120, y: -8, white: 1, sw: 96 / 256, t: 0 });
      tickers.add(() => {
        if (!st.sprites.includes(arrive)) return false;
        const t = arrive.t++;
        const spin = t < 108 ? Math.floor(t / 3) % 12 : 0;
        arrive.sy = spin * 16;
        arrive.sw = t < 5 ? 96 / 256 : Math.min(256, 96 + 8 * (t - 4)) / 256;
        arrive.white = Math.max(0, 1 - t / 16);
      });
      while (arrive.y <= 74) { arrive.y += 4; yield; }
      se("se_ball_bounce_1");
      let ay = 0;
      const landed = arrive.y;
      for (let i = 22; i < 108; i++) {
        if (i === 66) se("se_ball_bounce_2");
        if (i === 92) se("se_ball_bounce_3");
        if (i === 107) se("se_ball_bounce_4");
        ay += BALL_DY[i]; arrive.y = landed + ay;
        yield;
      }
      // Out it comes (CreatePokeballSpriteToReleaseMon at (120, 84)).
      st.mon = { pic: recvPic, species: opts.receive.species, x: 120, y: recvFeet, x2: 0, y2: 0, scale: 0, white: 1 };
      se("se_ball_trade");
      for (let i = 1; i <= 16; i++) { st.mon.scale = i / 16; st.mon.white = 1 - i / 16; yield; }
      remove(arrive);
      opts.say(opts.partner + " sent over " + opts.receive.name + ".");
      yield* frames(61);
      opts.cry && opts.cry(opts.receive.species);
      yield* frames(40);
      yield* frames(10);
      const jingle = opts.fanfare ? opts.fanfare("mus_evolved") : null;
      yield* frames(240);
      opts.say("Take good care of " + opts.receive.name + "!");
      if (jingle) yield* until(Promise.resolve(jingle));
      yield* frames(60);
      if (opts.waitA) yield* until(opts.waitA());
      yield* fade(0, 1, "#000", 0);
    }

    return {
      run() { return new Promise((resolve) => { done = resolve; gen = sequence(); }); },
      close() {
        cancelAnimationFrame(timer);
        tickers.clear();
        root.classList.remove("evo");
        root.innerHTML = "";
      }
    };
  }

  window.TradeScene = { open };
})();
