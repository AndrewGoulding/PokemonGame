// FireRed's intro, re-created on a 240x160 canvas from its graphics
// (assets/intro/, built by tools/build-intro.js) and its timing in pret's
// src/intro.c, src/title_screen.c and src/oak_speech.c:
//
//   await Intro.movie();                  // copyright, Game Freak, Gengar vs Nidorino (A/Start skips)
//   await Intro.titleScreen();            // -> "start", or "timeout" to replay the movie
//   await Intro.oakSpeech()               // -> { name, look }
//
// Frame counts are the GBA's (60 a second). There's no sound.
// Depends on: window.Screen (text box and menus), window.WORLD_TEXT-style
// text in window.INTRO_TEXT (data/intro-text.js).

(function () {
  "use strict";

  const W = 240, H = 160, SCALE = 2;
  const canvas = document.getElementById("intro");
  const g = canvas.getContext("2d");
  g.scale(SCALE, SCALE);
  g.imageSmoothingEnabled = false;

  // ---------- Images ----------

  const images = {};
  function img(name) {
    if (!images[name]) {
      const i = new Image();
      i.loaded = new Promise((r) => { i.onload = i.onerror = r; });
      i.src = "assets/intro/" + name + ".png";
      images[name] = i;
    }
    return images[name];
  }
  const ready = (i) => i.complete && i.naturalWidth > 0;
  const preload = (names) => Promise.all(names.map((n) => img(n).loaded));

  // Draws part of an image; `sx, sy, w, h` is the source rectangle.
  function blit(name, sx, sy, w, h, dx, dy, opts) {
    const i = typeof name === "string" ? img(name) : name;
    if (i.complete === false || (i.naturalWidth === 0 && !(i instanceof HTMLCanvasElement))) return;
    opts = opts || {};
    g.save();
    if (opts.alpha != null) g.globalAlpha = Math.max(0, Math.min(1, opts.alpha));
    if (opts.flip) { g.translate(dx + w, dy); g.scale(-1, 1); dx = 0; dy = 0; }
    g.drawImage(i, sx, sy, w, h, Math.round(dx), Math.round(dy), w, h);
    g.restore();
  }
  // Frame `f` of a sheet of frames `w` x `h` stacked vertically, centred on (x, y).
  const sprite = (name, f, w, h, x, y, opts) => blit(name, 0, f * h, w, h, x - w / 2, y - h / 2, opts);

  // A GBA background layer with wrap-around: `scrollX/Y` is where the screen's
  // top-left falls in the (mapW x mapH) map.
  function bg(name, scrollX, scrollY, mapW, mapH) {
    const i = img(name);
    if (!ready(i)) return;
    const sx = ((Math.round(scrollX) % mapW) + mapW) % mapW, sy = ((Math.round(scrollY) % mapH) + mapH) % mapH;
    for (let y = -sy; y < H; y += mapH) for (let x = -sx; x < W; x += mapW) g.drawImage(i, x, y);
  }

  // A copy of an image tinted toward a colour (0-1), e.g. Charizard flashing
  // white. Uses only compositing, never reading pixels back, so it works when
  // the game is opened straight from disk.
  const tintCache = new Map();
  function tinted(name, color, amount) {
    const i = img(name);
    if (!ready(i)) return i;
    const key = name + color + Math.round(amount * 64);
    if (tintCache.has(key)) return tintCache.get(key);
    const c = document.createElement("canvas");
    c.width = i.naturalWidth; c.height = i.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(i, 0, 0);
    if (amount > 0) {
      x.globalCompositeOperation = "source-atop";
      x.globalAlpha = amount;
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
    }
    if (tintCache.size > 400) tintCache.clear();
    tintCache.set(key, c);
    return c;
  }

  // ---------- The loop ----------
  //
  // Scenes are async scripts: they set `paint` (what to draw each frame), add
  // per-frame `actors`, and `await wait(n)` frames. Skipping (A/Start in the
  // movie and title intro) makes the pending waits throw SKIP.

  const SKIP = { skip: true };
  let paint = null;
  const actors = new Set();
  let waiters = [];
  let frameNo = 0, running = false, last = 0, acc = 0;
  let skippable = false, skipped = false;
  let fade = { color: "#000", level: 0 };   // 0-16 over everything, like the GBA's palette fades

  function step() {
    frameNo++;
    for (const a of [...actors]) if (a(frameNo) === false) actors.delete(a);
    const due = waiters.filter((w) => w.at <= frameNo);
    waiters = waiters.filter((w) => w.at > frameNo);
    due.forEach((w) => w.resolve());
  }
  function frame(now) {
    if (!running) return;
    acc += Math.min(100, now - (last || now));
    last = now;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    if (paint) paint();
    if (fade.level > 0) {
      g.globalAlpha = Math.min(1, fade.level / 16);
      g.fillStyle = fade.color;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  function start() {
    canvas.classList.remove("hidden");
    if (!running) { running = true; last = 0; acc = 0; requestAnimationFrame(frame); }
  }
  function stop() {
    running = false;
    canvas.classList.add("hidden");
    actors.clear();
    waiters = [];
    paint = null;
  }

  const wait = (n) => new Promise((resolve, reject) => {
    if (skipped) { reject(SKIP); return; }
    waiters.push({ at: frameNo + Math.max(1, Math.round(n)), resolve: () => (skipped ? reject(SKIP) : resolve()) });
  });
  // Runs fn(t) every frame until it returns true.
  const until = (fn) => new Promise((resolve, reject) => {
    let t = 0;
    actors.add(() => {
      if (skipped) { reject(SKIP); return false; }
      if (fn(t++)) { resolve(); return false; }
      return true;
    });
  });
  // FireRed's BeginNormalPaletteFade: 2 levels per step, a step every delay+1 frames.
  function fadeTo(color, from, to, delay) {
    fade.color = color;
    fade.level = from;
    const stepSize = delay < 0 ? 2 - delay : 2, every = delay < 0 ? 1 : delay + 1;
    return until((t) => {
      if (t % every) return false;
      fade.level = from < to ? Math.min(to, fade.level + stepSize) : Math.max(to, fade.level - stepSize);
      return fade.level === to;
    });
  }

  // ---------- Input ----------

  const pressed = { a: false, b: false, start: false };
  document.addEventListener("keydown", (e) => {
    if (!running || e.repeat) return;
    if (["z", "Z", " ", "Enter"].includes(e.key)) pressed.a = true;
    if (["x", "X", "Escape"].includes(e.key)) pressed.b = true;
    if (e.key === "Enter" || e.key === "Start") pressed.start = true;
    if (skippable && (pressed.a || pressed.start)) skipped = true;
  });
  const clearInput = () => { pressed.a = pressed.b = pressed.start = false; };
  // Waits for A.
  function waitForA() {
    clearInput();
    return until(() => pressed.a);
  }

  // A tiny deterministic RNG like the GBA's (x * 1103515245 + 24691).
  function lcg(seed) {
    let x = seed >>> 0;
    return () => { x = (Math.imul(x, 1103515245) + 24691) >>> 0; return x >>> 16; };
  }
  const sin256 = (i) => Math.round(256 * Math.sin((i * 2 * Math.PI) / 256));

  // Clips drawing to the movie's letterbox (y 32-127), or a rectangle.
  function clip(x, y, w, h, fn) {
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    fn();
    g.restore();
  }

  // ---------- Opening movie (src/intro.c) ----------

  const MOVIE_IMAGES = ["movie-copyright", "movie-gamefreak-name", "movie-gf-logo", "movie-gf-presents", "movie-gf-star",
    "movie-gf-sparkles-small", "movie-gf-sparkles-big", "movie-s1-grass", "movie-s1-bg", "movie-s2-bg", "movie-s2-plants",
    "movie-s2-gengar-close", "movie-s2-nidorino-close", "movie-s2-gengar", "movie-s2-nidorino", "movie-s3-bg",
    "movie-s3-gengar-anim", "movie-s3-nidorino", "movie-s3-grass", "movie-s3-swipe", "movie-s3-recoil-dust", "movie-s3-gengar-static"];

  const NAVY = "rgb(24,41,74)";
  // The Game Freak letterbox (WIN1) stays for the whole movie: y 32-127.
  const letterbox = (fn) => clip(0, 32, W, 96, fn);

  async function copyright() {
    paint = () => blit("movie-copyright", 0, 0, W, H, 0, 0);
    await fadeTo("#000", 16, 0, 0);
    await wait(140 - 9);
    await fadeTo("#000", 0, 16, 0);
    await wait(3);
  }

  // Small 8x8 sparkles (four frames in a 16x16 sheet, read in tile order).
  function smallSparkle(f, x, y) {
    blit("movie-gf-sparkles-small", (f % 2) * 8, Math.floor(f / 2) * 8, 8, 8, x - 4, y - 4);
  }

  async function gameFreak() {
    if (window.GameAudio) window.GameAudio.music("mus_game_freak");
    const parts = [];          // sparkles: { x, y, vx, vy, age, life, kind, blink }
    const scene = { open: 0, star: null, nameAlpha: 0, logoAlpha: 0, logoShown: false, allAlpha: 1, big: [] };
    fade.level = 0;   // the backdrop stays black; the letterbox opening reveals the scene
    paint = () => {
      const t = scene.open;
      clip(0, 80 - t, W, t * 2, () => {
        g.fillStyle = NAVY;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = scene.allAlpha;
        if (scene.nameAlpha > 0) blit("movie-gamefreak-name", 0, 0, 144, 16, 48, 72, { alpha: scene.nameAlpha * scene.allAlpha });
        if (scene.logoAlpha > 0) blit("movie-gf-logo", 0, 0, 32, 64, 104, 38, { alpha: scene.logoAlpha * scene.allAlpha });
        if (scene.logoShown) {
          blit("movie-gf-presents", 0, 0, 32, 8, 88, 104, { alpha: scene.allAlpha });
          blit("movie-gf-presents", 32, 0, 32, 8, 120, 104, { alpha: scene.allAlpha });
        }
        g.globalAlpha = 1;
        for (const b of scene.big) sprite("movie-gf-sparkles-big", Math.min(3, Math.floor(b.age / 8)), 32, 32, b.x, b.y);
        for (const p of parts) if (!p.blink || p.age % 2) smallSparkle(Math.floor(p.age / 4) % 4, p.x, p.y);
        if (scene.star) sprite("movie-gf-star", 0, 16, 16, scene.star.x, scene.star.y + scene.star.y2);
      });
    };
    // Sparkles move and age every frame.
    actors.add(() => {
      for (const p of parts) { p.x += p.vx; p.y += p.vy; p.age++; p.blink = p.age > 90; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age > parts[i].life) parts.splice(i, 1);
      for (const b of scene.big) b.age++;
      scene.big = scene.big.filter((b) => b.age < 32);
    });
    // The letterbox opens 8 lines a frame.
    await until(() => (scene.open = Math.min(48, scene.open + 8)) === 48);

    // The shooting star, with a trail of sparkles (IntroCB_GF_Star).
    const rand = lcg(354128453);
    const yMods = [0, 1, 2, 3, -3, -2, -1, 0];
    scene.star = { x: 248, y: 55, y2: 0, t: 0, sinIdx: 0 };
    actors.add(() => {
      const s = scene.star;
      if (!s) return false;
      s.x -= 6; s.y += 1; s.sinIdx += 48;
      s.y2 = sin256((s.sinIdx >> 4) + 64) >> 5;
      if (s.t % 8 && s.x > 0 && s.x < 240) {
        const r = rand(), yMod = yMods[s.t % 8];
        parts.push({ x: s.x + ((r & 7) + 2), y: s.y + s.y2 + yMod, vx: ((r >> 3) % 5 - 2) / 32, vy: yMod / 32, age: 0, life: 120 });
      }
      s.t++;
      if (s.x < -8) { scene.star = null; return false; }
      return true;
    });
    await wait(30);
    // Sparkles twinkling across the name, one every 7 frames, two passes.
    const coords = [[72, 80], [136, 74], [168, 80], [120, 80], [104, 86], [88, 74], [184, 74], [56, 86], [152, 86]];
    for (let i = 0; i < 18; i++) {
      const [x, y] = coords[i % 9];
      parts.push({ x, y, vx: 0, vy: 1 / 16, age: 0, life: i < 9 ? 170 - i * 7 : 120 - i * 7 });
      await wait(7);
    }
    await wait(90 - 18 * 7 + 1);

    // IntroCB_GF_RevealName: big sparkles, then the name fades in.
    for (const k of [0, 4, 8, 3, 7, 2, 6, 1, 5]) {
      const [x, y] = coords[k];
      scene.big.push({ x, y, age: 0 });
      await wait(10);
    }
    await wait(40);
    await until((t) => (scene.nameAlpha = Math.min(1, t / 96)) >= 1);
    await wait(51);
    // IntroCB_GF_RevealLogo: the logo fades in, "PRESENTS" appears, then it all fades out.
    await until((t) => (scene.logoAlpha = Math.min(1, t / 32)) >= 1);
    scene.logoShown = true;
    await wait(91);
    await until((t) => (scene.allAlpha = Math.max(0, 1 - t / 40)) <= 0);
    parts.length = 0;
    await wait(21);
  }

  // Scene 1: rushing through the grass (IntroCB_Scene1).
  async function scene1() {
    if (window.GameAudio) window.GameAudio.music("mus_intro_fight");
    const s = { grass: 0, bg: 0, grassY: 0, scroll: 0 };
    paint = () => letterbox(() => {
      bg("movie-s1-bg", 0, 128 * s.bg, 256, 512);
      bg("movie-s1-grass", 0, 128 * s.grass + s.grassY, 256, 512);
    });
    await fadeTo("#fff", 16, 0, -2);
    let timer = 0;
    await until(() => {
      timer++;
      if (timer % 6 === 0) { s.grass = (s.grass + 1) % 3; s.grassY = 0; }   // a new frame resets the exit scroll
      if (timer >= 20) {
        if ((timer - 20) % 4 === 0) s.bg = Math.min(2, s.bg + 1);
        s.scroll += 0x120 / 256;
        s.grassY -= s.scroll;
      }
      return timer >= 30;
    });
    fade.color = "#fff"; fade.level = 16;
  }

  // Scene 2: Gengar and Nidorino face off, then close-ups.
  async function scene2() {
    const s = { close: false, bgX: 0, plantsX: 0, gengarY: 206, nidorinoY: 40 };
    paint = () => letterbox(() => {
      if (!s.close) {
        bg("movie-s2-bg", s.bgX, 0, 256, 512);
        sprite("movie-s2-gengar", 0, 64, 64, 72, 80);
        sprite("movie-s2-nidorino", 0, 64, 64, 168, 80);
        bg("movie-s2-plants", s.plantsX, 0, 256, 256);
      } else {
        bg("movie-s2-bg", s.bgX, 256, 256, 512);
        bg("movie-s2-gengar-close", 0, s.gengarY, 256, 256);
        bg("movie-s2-nidorino-close", 0, s.nidorinoY, 256, 256);
      }
    });
    const pan = until(() => { s.bgX -= 0xe0 / 256; s.plantsX += 0x110 / 256; return s.close; });
    await fadeTo("#fff", 16, 0, -2);
    await wait(60);
    s.close = true;
    await pan;
    await until((t) => { s.gengarY += 0x20 / 256; s.nidorinoY -= 0x24 / 256; return t >= 60; });
    fade.color = "#fff"; fade.level = 16;
    await wait(3);
  }

  // Scene 3: they enter and fight.
  async function scene3() {
    const s = {
      bgX: 0, bgWhite: 0,
      gX: 24, gY: 0, gFrame: 0, win0: true, bounce: true, gengarSprite: false,
      nid: { x: 0, y: 100, x2: 0, y2: 0, frame: 0 },
      grass: null, swipe: null, dust: [], zoom: 1
    };
    const N = s.nid;
    const drawZoomed = (name, sx, sy, w, h, left, top, ax, ay) => {
      // Scales about the anchor (ax, ay) inside the picture, which stays put.
      g.save();
      g.translate(left + ax, top + ay);
      g.scale(s.zoom, s.zoom);
      blit(name, sx, sy, w, h, -ax, -ay);
      g.restore();
    };
    paint = () => letterbox(() => {
      bg("movie-s3-bg", s.bgX, 0, 256, 256);
      if (s.bgWhite) { g.fillStyle = "rgba(255,255,255," + s.bgWhite + ")"; g.fillRect(0, 32, W, 96); }
      for (const d of s.dust) if ((d.age >> 1) % 2 === d.odd) blit("movie-s3-recoil-dust", 0, 16 * Math.min(3, Math.floor(d.age / 10)), 16, 16, d.x - 8, d.y - 8);
      drawZoomed("movie-s3-nidorino", 0, N.frame * 64, 64, 64, N.x + N.x2 - 32, N.y + N.y2 - 32, 0, 42);
      if (s.gengarSprite) drawZoomed("movie-s3-gengar-static", 0, 0, 96, 128, 17, 40, 64, 64);
      if (s.swipe && s.swipe.t % 2 === 0) {
        const f = s.swipe.t < 8 ? 0 : 1;
        blit("movie-s3-swipe", 0, f * 64, 32, 64, 132 - 16, 78 - 32);
        blit("movie-s3-swipe", 0, 128 + f * 16, 32, 16, 132 - 16, 118 - 8);
      }
      if (!s.gengarSprite) {
        clip(s.win0 ? 120 : 0, 0, W, H, () => bg("movie-s3-gengar-anim", s.gX, 496 + 128 * s.gFrame + s.gY, 256, 512));
      }
      if (s.grass) blit("movie-s3-grass", 0, 0, 64, 32, s.grass.x - 32, s.grass.y - 16);
    });
    fade.level = 0;

    // Gengar's idle bounce: frames 0 and 1, every 30 frames.
    let bounceT = 0;
    actors.add(() => { if (s.bounce && ++bounceT % 30 === 0) s.gFrame = s.gFrame === 0 ? 1 : 0; });
    // Background scroll; slows once the grass passes.
    actors.add(() => { s.bgX -= s.grass && s.grass.slow ? 0x20 / 256 : 4; });

    // Entrances: Gengar slides in (BG0), Nidorino runs in, grass rushes past.
    let gSpeed = 0x400, gMoves = 0;
    const gengarIn = until(() => {
      if (++gMoves > 40) gSpeed = Math.max(16, gSpeed - 16);
      s.gX += gSpeed / 256;
      if (s.gX >= 128) s.win0 = false;
      if (s.gX >= 0xef00 / 256) { s.gX = 0xef00 / 256; return true; }
      return false;
    });
    let nSpeed = 55, nFrames = 0, nPos = 0;
    const nidorinoIn = until(() => {
      if (++nFrames > 40) nSpeed = Math.max(1, nSpeed - 1);
      nPos += nSpeed;
      N.x = Math.min(180, nPos / 16);
      return N.x >= 180;
    });
    const grassBy = (async () => {
      await wait(16);
      s.grass = { x: 296, y: 112, slow: false };
      await until(() => {
        if (!s.grass.slow) { s.grass.x -= 5; if (s.grass.x <= 52) s.grass.slow = true; }
        else s.grass.x -= 1;
        return s.grass.x <= -32;
      });
      s.grass.hidden = true;
    })();
    await Promise.all([gengarIn, nidorinoIn]);

    // a-b. Nidorino crouches and cries.
    await wait(31);
    N.frame = 2; N.y2 = 3;
    await wait(9);
    N.frame = 1; N.y2 = 0;
    await until((t) => { N.y2 = (t >> 1) % 2; return t >= 49; });
    N.frame = 0; N.y2 = 0;

    // c-d. Gengar winds up and swipes (BG0 on a sine arc).
    await wait(31);
    s.bounce = false;
    const base = s.gX;
    let idx = 64, mX = 32, mY = 6;
    const arc = () => {
      const xSub = -((sin256(idx + 64) * mX) >> 8), ySub = mY - ((sin256(idx) * mY) >> 8);
      s.gX = base - xSub;
      s.gY = -ySub;
    };
    s.gFrame = 2; arc();
    await wait(1);
    await until((t) => { idx -= 2; arc(); return t >= 15; });
    let recoil = null;
    await until((t) => { if (t === 14) recoil = nidorinoRecoil(); return t >= 15; });
    await until((t) => {
      idx += 8;
      if (t === 4) { mY = 32; mX = 48; s.gFrame = 3; s.swipe = { t: 0 }; }
      arc();
      return t >= 7;
    });
    actors.add(() => { if (!s.swipe) return false; if (++s.swipe.t >= 12) { s.swipe = null; return false; } return true; });
    await until((t) => { idx -= 8; arc(); return t >= 3; });
    s.gFrame = 0; idx = 64; arc();
    s.bounce = true;
    await recoil;

    // f. Two small hops forward.
    await wait(17);
    await hop(); await hop();

    // g-h. Nidorino gathers itself and leaps; Gengar turns into sprites for the zoom.
    await wait(21);
    N.x += N.x2; N.x2 = 0;
    await until(() => s.gFrame === 0);
    s.bounce = false;
    s.gengarSprite = true;
    let timer = 0;
    actors.add(() => {
      timer++;
      if (timer >= 48 && timer <= 48 + 27) s.bgWhite = Math.min(1, (timer - 48) / 27);
    });
    await until((t) => { if (t < 18 && t % 2) N.x2 = N.x2 === 1 ? -1 : 1; if (t === 18) N.x2 = 0; return t >= 18 + 40; });
    N.frame = 4;
    let tt = 0, v = 36;
    await until(() => {
      tt += v; v = Math.max(12, v - 1);
      N.x2 = -(tt >> 4);
      N.y2 = -((sin256(tt >> 4) * 3) >> 4);
      return (tt >> 4) > 63;
    });
    await until(() => timer >= 121);

    // j-k. Zoom in on both, then cut to black.
    N.x += N.x2; N.y += N.y2; N.x2 = 0; N.y2 = 0;
    await until((t) => { s.zoom = 1 + Math.min(8, t + 1) * 32 / 256; return t >= 7; });
    await wait(9);
    s.bgWhite = 1;
    await fadeTo("#000", 0, 16, -2);
    await wait(61);

    // A small hop forward (StartNidorinoHop(8, 12, 5)): crouch, 7 frames in
    // the air at +1.5 px with an 8 px arc, landing crouched.
    async function hop() {
      N.frame = 2; await wait(5);
      N.frame = 3;
      const start = N.x2;
      await until((k) => { N.x2 = start + ((k + 1) * 24) / 16; N.y2 = -(sin256(((k + 1) * 128) / 8) >> 5); return k >= 6; });
      N.x2 = Math.round(start + 10); N.y2 = 0; N.frame = 2;
    }

    // e. Knocked back by the swipe: hop back, slide with dust, then hop forward again.
    async function nidorinoRecoil() {
      N.frame = 2; await wait(5);
      N.frame = 3;
      let off = 0, vx = 40;
      await until((k) => { off += vx; vx--; N.x2 = off >> 4; N.y2 = -((sin256(8 * (k + 1)) * 3) >> 5); return k >= 15; });
      N.y2 = 0; N.frame = 2;
      let seed = 0x4757;
      const next = () => { seed = (Math.imul(seed, 0x41c64e6d) << 16) >> 16; return Math.abs(seed); };
      await until((k) => {
        off += 28; N.x2 = off >> 4;
        if (k >= 6) {
          for (const odd of [0, 1]) {
            const r = next();
            s.dust.push({ x: N.x + N.x2 - 22, y: N.y + N.y2 + 24, vx: -((r % 13) + 8) / 16, vy: (r % 3) / 16, age: 0, odd });
          }
        }
        return k >= 12;
      });
      actors.add(() => {
        for (const d of s.dust) { d.x += d.vx; d.y += d.vy; d.age++; }
        s.dust = s.dust.filter((d) => d.age < 38);
        return s.dust.length > 0;
      });
      N.frame = 0; await wait(17);
      N.frame = 2; await wait(5);
      N.frame = 3;
      await until((k) => { off -= 55; N.x2 = off >> 4; N.y2 = -(sin256(8 * (k + 1)) >> 4); return k >= 14; });
      N.y2 = 0; N.frame = 2; await wait(5);
      N.frame = 0;
      N.x2 = 3;
    }
  }

  async function movie() {
    await preload(MOVIE_IMAGES);
    start();
    skippable = false; skipped = false;
    fade = { color: "#000", level: 16 };
    try {
      await copyright();
      skippable = true;
      clearInput();
      await gameFreak();
      await scene1();
      await scene2();
      await scene3();
    } catch (e) {
      if (e !== SKIP) throw e;
    }
    skippable = false; skipped = false;
    actors.clear(); waiters = [];
    fade = { color: "#000", level: 16 };
    paint = null;
  }

  // ---------- Title screen (src/title_screen.c) ----------

  const TITLE_IMAGES = ["title-logo", "title-charizard", "title-charizard-gray", "title-overlay", "title-overlay-blank", "title-border", "title-flames", "title-slash"];
  const FLAME_X = [4, 16, 26, 32, 48, 200, 216, 224, 232, 60, 76, 92, 108, 128, 144];

  // The logo's shine: logo pixels under the slash, lightened 13/16 toward white.
  const shine = document.createElement("canvas");
  shine.width = W; shine.height = H;
  const sg = shine.getContext("2d");
  function drawShine(x, y) {
    sg.globalCompositeOperation = "source-over";
    sg.clearRect(0, 0, W, H);
    sg.drawImage(img("title-slash"), Math.round(x - 32), Math.round(y - 32));
    sg.globalCompositeOperation = "source-in";
    sg.drawImage(img("title-logo"), 0, 0);
    sg.globalCompositeOperation = "source-atop";
    sg.globalAlpha = 13 / 16;
    sg.fillStyle = "#fff";
    sg.fillRect(0, 0, W, H);
    sg.globalAlpha = 1;
    g.drawImage(shine, 0, 0);
  }

  async function titleScreen() {
    if (window.GameAudio) window.GameAudio.music("mus_title");
    await preload(TITLE_IMAGES);
    start();
    skipped = false;
    fade = { color: "#000", level: 0 };
    const s = {
      border: false, borderEdge: 0, overlay: false, overlayX: 0, logo: false, logoWhite: 0,
      // Charizard: "dark" (black, with the glow band at line `band`), then gray / color tinted.
      zard: "dark", band: 128, gray: true, zardBlack: 1, zardWhite: 0,
      press: true, flames: [], slash: null
    };
    paint = () => {
      if (s.border) clip(0, 0, s.borderEdge, H, () => blit("title-border", 0, 0, W, H, 0, 0));
      for (const f of s.flames) sprite("title-flames", f.frame, 16, 16, f.x, f.y);
      if (s.overlay) clip(s.overlayX, 0, W - s.overlayX, H, () => blit(s.press ? "title-overlay" : "title-overlay-blank", 0, 0, W, H, s.overlayX, 0));
      if (s.zard === "dark") {
        blit(tinted("title-charizard", "#000", 1), 0, 0, W, H, 0, 0);
        const white = tinted("title-charizard", "#fff", 1);
        for (let i = -15; i <= 15; i++) {
          const y = s.band + i;
          if (y >= 0 && y < H) blit(white, 0, y, W, 1, 0, y, { alpha: (15 - Math.abs(i)) / 16 });
        }
      } else {
        const zard = s.gray ? "title-charizard-gray" : "title-charizard";
        blit(tinted(zard, "#000", s.zardBlack), 0, 0, W, H, 0, 0);
        if (s.zardWhite > 0) blit(tinted(zard, "#fff", s.zardWhite), 0, 0, W, H, 0, 0);
      }
      if (s.logo) {
        blit(s.logoWhite > 0 ? tinted("title-logo", "#fff", s.logoWhite) : "title-logo", 0, 0, W, H, 0, 0);
        if (s.slash && s.slash.state === 1) drawShine(s.slash.x, s.slash.y);
      }
    };

    // Everything as it is once the intro has finished (or been skipped).
    const finished = () => {
      Object.assign(s, { border: true, borderEdge: W, overlay: true, overlayX: 0, logo: true, logoWhite: 0,
        zard: "color", gray: false, zardBlack: 0, zardWhite: 0 });
    };

    // The intro builds up; A, B or Start skips to the end of it.
    let elapsed = 0;
    actors.add(() => { elapsed++; });
    skippable = true;
    clearInput();
    try {
      // FlashSprite: a glow sweeps up Charizard's silhouette.
      await until(() => (s.band -= 4) < 0);
      // FadeIn: a gray Charizard fades in from black.
      s.zard = "gray"; s.gray = true; s.zardBlack = 1;
      await wait(11);
      await until((t) => { if (t % 10 === 0) s.zardBlack = Math.max(0, s.zardBlack - 2 / 16); return s.zardBlack <= 0; });
      await wait(37);
      // The teal band wipes in from the left; the bands and PRESS START slide in from the right.
      const slide = (async () => {
        s.border = true;
        await until(() => (s.borderEdge = Math.min(W, s.borderEdge + 24)) >= W);
        await wait(10);
        s.overlay = true; s.overlayX = 240;
        await until(() => (s.overlayX = Math.max(0, s.overlayX - 24)) <= 0);
      })();
      slide.catch(() => {});   // a skip ends it too; finished() sets the end state
      // Charizard flashes white twice, then turns white.
      const flash = async (coeffs) => { for (const c of coeffs) { s.zardWhite = c / 16; await wait(1); } };
      await flash([1, 6, 11, 16]); await flash([15, 10, 5, 0]);
      await wait(21);
      await flash([1, 6, 11, 16]); await flash([15, 10, 5, 0]);
      await wait(21);
      await flash([0, 4, 8, 12, 16]);
      // The logo appears out of white, and Charizard's colours return.
      s.logo = true; s.logoWhite = 1; s.gray = false;
      await until((t) => {
        if (t % 2 === 0) s.logoWhite = Math.max(0, s.logoWhite - 2 / 16);
        if (t % 2 === 0) s.zardWhite = Math.max(0, s.zardWhite - 1 / 16);
        return s.logoWhite <= 0 && s.zardWhite <= 0;
      });
      await slide;
    } catch (e) {
      if (e !== SKIP) throw e;
    }
    skippable = false; skipped = false;
    actors.clear(); waiters = [];
    actors.add(() => { elapsed++; });
    finished();

    // Run: PRESS START blinks (60 on, 30 off), flames rise, the logo shines every 9 s.
    let blink = 0;
    actors.add(() => { blink = (blink + 1) % 90; s.press = blink < 60; });
    const r = lcg(30840);
    let spawnTimer = 0, spawnDelay = 0, offsetX = 0;
    actors.add(() => {
      if (++spawnTimer >= spawnDelay) {
        spawnTimer = 0; spawnDelay = 18;
        r();
        let xs = (r() % 4) - 2, ys = (r() % 8) - 16;
        const y = (r() % 3) + 116, x = r() % 240;
        const add = (fx) => { if (s.flames.length < 62) s.flames.push({ x: fx, y, px: fx * 16, py: y * 16, xs, ys, age: 0, frame: 0 }); };
        if (r() % 16 >= 8) add(x);
        for (const fx of FLAME_X) { add(offsetX + fx); xs = (r() % 4) - 2; ys = (r() % 8) - 16; }
        offsetX = (offsetX + 1) % 4;
      }
      for (const f of s.flames) {
        f.age++;
        f.frame = f.age < 3 ? 0 : Math.min(9, 1 + Math.floor((f.age - 3) / 6));
        f.px -= f.xs; f.py += f.ys;
        f.x = f.px / 16; f.y = f.py / 16;
      }
      s.flames = s.flames.filter((f) => f.age < 57 && f.x >= -8 && f.y >= 16 && f.y <= 200);
    });
    s.slash = { x: -32, y: 27, timer: 540, state: 0, stopping: false };
    actors.add(() => {
      const sl = s.slash;
      if (sl.state === 0) {
        if (sl.stopping) { sl.state = 2; return; }
        if (--sl.timer <= 0) sl.state = 1;
      } else if (sl.state === 1) {
        sl.x += 9;
        if (sl.x === 67) sl.y -= 7;
        if (sl.x === 148) sl.y += 7;
        if (sl.x > 272) Object.assign(sl, { x: -32, y: 27, timer: 540, state: sl.stopping ? 2 : 0 });
      }
    });

    clearInput();
    window.Screen.say("");   // (PRESS START is on the picture)
    document.getElementById("menu").innerHTML = "";
    let result = null;
    await until(() => {
      if (pressed.a || pressed.start) result = "start";
      else if (elapsed >= 2700) result = "timeout";
      return !!result;
    });
    s.slash.stopping = true;
    if (result === "start") {
      await wait(90);
      await until(() => s.slash.state !== 1);
      await fadeTo("#fff", 0, 16, 0);
    } else {
      await until(() => s.slash.state !== 1);
      await fadeTo("#000", 0, 16, 3);
      await wait(20);
    }
    actors.clear(); waiters = [];
    paint = null;
    return result;
  }

  // ---------- Prof. Oak's speech (src/oak_speech.c) ----------

  const SPEECH_IMAGES = ["oak-speech-bg", "oak-speech-oak", "oak-speech-player-character",
    "oak-speech-platform", "controls-page-2", "controls-page-3", "pikachu-page", "pikachu-body", "pikachu-ears", "pikachu-eyes"];
  const IT = (label) => window.INTRO_TEXT[label];
  const NAMES = (labels) => labels.map((l) => IT("gNameChoice_" + l)[0]);
  const BOY_NAMES = NAMES(["Red", "Fire", "Ash", "Kene", "Geki", "Jak", "Janne", "Jonn", "Kamon", "Karl", "Taylor", "Oscar",
    "Hiro", "Max", "Jon", "Ralph", "Kay", "Tosh", "Roak"]);

  // Text drawn on the picture (the controls guide and Pikachu pages).
  function text(str, x, y, opts) {
    opts = opts || {};
    g.font = (opts.bold ? "bold " : "") + (opts.size || 9) + "px 'Trebuchet MS', Verdana, sans-serif";
    g.fillStyle = opts.color || "#fff";
    g.textBaseline = "top";
    g.textAlign = opts.align || "left";
    String(str).split("\n").forEach((line, i) => g.fillText(line, x, y + i * (opts.lineHeight || 13)));
    g.textAlign = "left";
  }

  // The text box and menu under the picture.
  const say = (pages) => (async () => { for (const p of [].concat(pages)) await window.Screen.read(p); })();
  const show = (page) => window.Screen.say(page);

  // Asks for a name in the menu area, pre-filled with `suggestion`.
  function askName(prompt, suggestion) {
    window.Screen.say(prompt);
    const menu = document.getElementById("menu");
    menu.innerHTML = '<div class="intro-name"><input id="intro-name-input" maxlength="10" autocomplete="off" aria-label="Name"></div>';
    const input = document.getElementById("intro-name-input");
    input.value = suggestion;
    const ok = document.createElement("button");
    ok.type = "button"; ok.className = "action"; ok.textContent = "OK";
    menu.appendChild(ok);
    input.focus(); input.select();
    return new Promise((resolve) => {
      const done = () => { const v = input.value.trim(); if (!v) return; menu.innerHTML = ""; resolve(v.slice(0, 10)); };
      ok.addEventListener("click", done);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") done(); });
    });
  }

  // The guide's pages turn with the buttons, as in FireRed: A forward, B back
  // (not on the first page). Nothing in the text box.
  function turnPage(page) {
    show("");
    window.Screen.clearMenu();
    return window.GbaMenus.keys((k) => {
      const se = () => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se("se_select"); };
      if (k === "a") { se(); return "next"; }
      if (k === "b" && page > 1) { se(); return "back"; }
      return undefined;
    });
  }

  const BAR = "#283a78", GUIDE_BG = "#4a6cc0";

  // 1. The controls guide (three pages, A forward, B back).
  async function controlsGuide() {
    if (window.GameAudio) window.GameAudio.music("mus_new_game_instruct");
    let page = 1;
    const s = { page: 1, dim: 0 };
    paint = () => {
      g.fillStyle = GUIDE_BG; g.fillRect(0, 0, W, H);
      g.fillStyle = BAR; g.fillRect(0, 0, W, 16); g.fillRect(0, 152, W, 8);
      text("CONTROLS", 6, 3, { bold: true });
      text(s.page === 1 ? "Ⓐ NEXT" : "Ⓐ NEXT  Ⓑ BACK", 234, 3, { bold: true, align: "right" });
      if (s.page === 1) text(IT("gControlsGuide_Text_Intro")[0], 8, 62, { size: 9 });
      if (s.page === 2) {
        blit("controls-page-2", 0, 0, 40, 128, 8, 24);
        text(IT("gControlsGuide_Text_DPad")[0], 50, 26);
        text(IT("gControlsGuide_Text_AButton")[0], 50, 82);
        text(IT("gControlsGuide_Text_BButton")[0], 50, 122);
      }
      if (s.page === 3) {
        blit("controls-page-3", 0, 0, 40, 128, 8, 24);
        text(IT("gControlsGuide_Text_StartButton")[0], 50, 26);
        text(IT("gControlsGuide_Text_SelectButton")[0], 50, 66);
        text(IT("gControlsGuide_Text_LRButtons")[0], 50, 106);
      }
      if (s.dim) { g.fillStyle = GUIDE_BG; g.globalAlpha = s.dim; g.fillRect(0, 16, W, 136); g.globalAlpha = 1; }
    };
    await fadeTo("#000", 16, 0, 0);
    for (;;) {
      const v = await turnPage(page);
      const next = v === "next" ? page + 1 : page - 1;
      if (next > 3) break;
      await until((t) => (s.dim = Math.min(1, (t + 1) / 6)) >= 1);
      page = s.page = next;
      await until((t) => (s.dim = Math.max(0, 1 - (t + 1) / 6)) <= 0);
    }
    show("");
    await fadeTo("#000", 0, 16, 2);
    await wait(32);
  }

  // 2. The Pikachu pages about the adventure ahead.
  async function pikachuPages() {
    const s = { page: 1, textAlpha: 1, t: 0 };
    paint = () => {
      g.fillStyle = BAR; g.fillRect(0, 0, W, 16);
      blit("pikachu-page", 0, 0, W, 144, 0, 16);
      text(s.page === 1 ? "Ⓐ NEXT" : "Ⓐ NEXT  Ⓑ BACK", 234, 3, { bold: true, align: "right" });
      g.globalAlpha = s.textAlpha;
      text(IT("gPikachuIntro_Text_Page" + s.page)[0], 11, 37, { color: "#3a3a3a", lineHeight: 14.5 });
      g.globalAlpha = 1;
      // Pikachu in the corner: the body bobs every 30 frames, ears twitch, eyes blink.
      const bob = Math.floor(s.t / 30) % 2, ears = s.t % 120 < 12 ? 1 : 0, eyes = s.t % 90 < 8 ? 1 : 0;
      sprite("pikachu-body", bob, 32, 32, 16, 17);
      sprite("pikachu-ears", ears, 32, 16, 16, 9 + bob);
      sprite("pikachu-eyes", eyes, 16, 8, 24, 13 + bob);
    };
    actors.add(() => { s.t++; });
    await fadeTo("#000", 16, 0, 2);
    let page = 1;
    for (;;) {
      const v = await turnPage(page);
      const next = v === "next" ? page + 1 : page - 1;
      if (next > 3) break;
      await until((t) => (s.textAlpha = Math.max(0, 1 - (t + 1) / 8)) <= 0);
      page = s.page = next;
      await until((t) => (s.textAlpha = Math.min(1, (t + 1) / 8)) >= 1);
    }
    show("");
    await wait(24);
    await fadeTo("#000", 0, 16, 2);
    await wait(80);
  }

  // 3. Prof. Oak.
  async function speech() {
    if (window.GameAudio) window.GameAudio.music("mus_new_game_intro");
    const s = {
      pic: "oak-speech-oak", picAlpha: 1, picX: 0, platform: true, platformX: 0,
      ball: null, mon: null, monAlpha: 1, flash: 0, naming: null,
      bgDark: 0, white: 0, scaleX: 1, scaleY: 1
    };
    const ball = new Image();
    ball.src = "assets/sprites/items/ball/poke.png";
    const nidoran = new Image();
    nidoran.src = window.Screen.spriteUrl("Nidoran-F", "");
    paint = () => {
      if (s.naming) {
        g.fillStyle = "#6a8ad6"; g.fillRect(0, 0, W, H);
        g.fillStyle = "#fff"; g.fillRect(16, 40, 208, 48);
        text(s.naming.title, 120, 52, { color: "#303030", size: 11, bold: true, align: "center" });
        const who = s.naming.sprite;
        if (who) blit(who, 0, 0, 16, 32, 112, 96, {});
        return;
      }
      blit("oak-speech-bg", 0, 0, W, H, 0, 0);
      if (s.platform) blit("oak-speech-platform", 0, 0, 96, 32, 72 + s.platformX, 96, { alpha: s.picAlpha });
      if (s.bgDark) { g.fillStyle = "rgba(0,0,0," + s.bgDark + ")"; g.fillRect(0, 0, W, H); }
      if (s.pic) {
        const picImg = s.white > 0 ? tinted(s.pic, "#fff", s.white) : s.pic;
        g.save();
        g.translate(120, 84);
        g.scale(s.scaleX, s.scaleY);
        g.translate(-120, -84);
        blit(picImg, 0, 0, 64, 96, 88 + s.picX, 16, { alpha: s.picAlpha });
        g.restore();
      }
      if (s.mon && nidoran.complete) {
        g.globalAlpha = s.monAlpha;
        g.drawImage(nidoran, 96 - nidoran.naturalWidth / 2, 96 - nidoran.naturalHeight / 2 + (s.mon.dy || 0));
        g.globalAlpha = 1;
      }
      if (s.ball && ball.complete) g.drawImage(ball, s.ball.x - 16, s.ball.y - 16);
      if (s.flash) { g.fillStyle = "rgba(255,255,255," + s.flash + ")"; g.fillRect(0, 0, W, H); }
    };
    const fadePic = (to, frames) => {
      const from = s.picAlpha;
      return until((t) => { s.picAlpha = from + (to - from) * Math.min(1, (t + 1) / frames); if (to === 0 && s.picAlpha < 0.5) s.platform = false; return t + 1 >= frames; });
    };
    const flash = async () => { for (const a of [0.6, 1, 0.6, 0.3, 0]) { s.flash = a; await wait(2); } };
    const fill = (str, name) => str.replace(/\{PLAYER\}/g, name || "");

    // Oak appears.
    await fadeTo("#000", 16, 0, 5);
    await wait(80);
    await say(IT("gOakSpeech_Text_WelcomeToTheWorld"));
    show(IT("gOakSpeech_Text_ThisWorld")[0]);
    // Nidoran♀ comes out of a Poké Ball.
    s.ball = { x: 100, y: 66 };
    await wait(20);
    await flash();
    s.ball = null; s.mon = { dy: 0 }; s.monAlpha = 1;
    if (window.GameAudio) window.GameAudio.cry("Nidoran-F");
    await wait(32);
    await say(IT("gOakSpeech_Text_IsInhabitedFarAndWide"));
    await say(IT("gOakSpeech_Text_IStudyPokemon"));
    show("");
    // ...and goes back in.
    s.ball = { x: 100, y: 66 };
    await flash();
    await until((t) => { if (t > 40) s.mon.dy -= 1; s.monAlpha = Math.max(0, 1 - t / 64); return t >= 63; });
    s.mon = null; s.ball = null;
    await wait(48);
    await say(IT("gOakSpeech_Text_TellMeALittleAboutYourself"));
    show("");
    await fadePic(0, 48);
    await wait(48);

    // You're always the custom character (Red and Leaf are rivals in this
    // game), so FireRed's "Are you a boy? Or are you a girl?" is skipped.
    const look = Player.PLAYER_LOOK;
    const playerPic = Player.LOOKS[look].speech;
    s.pic = playerPic; s.picX = 0; s.platform = true; s.platformX = 0;
    await fadePic(1, 24);
    await wait(32);

    // The player's name.
    const pickFrom = (list) => list[Math.floor(Math.random() * list.length)];
    const nameScreen = async (title, suggestion, overworld) => {
      await fadeTo("#000", 0, 16, 0);
      s.naming = { title, sprite: overworld ? "../world/sprites/" + overworld : null };
      await fadeTo("#000", 16, 0, 0);
      const v = await askName(title, suggestion);
      await fadeTo("#000", 0, 16, 0);
      s.naming = null;
      return v;
    };
    let name;
    await say(IT("gOakSpeech_Text_YourNameWhatIsIt"));
    for (;;) {
      name = await nameScreen("Your name?", pickFrom(BOY_NAMES), "player_" + look);
      s.picX = 60; s.platformX = 60;
      await fadeTo("#000", 16, 0, 0);
      show(fill(IT("gOakSpeech_Text_SoYourNameIsPlayer")[0], name));
      await wait(25);
      if (await window.Screen.yesNo(fill(IT("gOakSpeech_Text_SoYourNameIsPlayer")[0], name))) break;
    }
    show("");

    // No rival here (FireRed introduces him at this point): you slide back to
    // the middle, and off you go.
    await until((t) => { s.picX = s.platformX = Math.max(0, 60 - (t + 1) * 2); return t >= 29; });
    await wait(20);
    const letsGo = IT("gOakSpeech_Text_LetsGo").map((p) => fill(p, name));
    await say(letsGo.slice(0, -1));
    show(letsGo[letsGo.length - 1]);
    await wait(30);

    // The player turns white and shrinks away as everything goes dark (to
    // FireRed's closing jingle).
    if (window.GameAudio) { window.GameAudio.music(null); window.GameAudio.fanfare("mus_new_game_exit"); }
    const darken = until((t) => (s.bgDark = Math.min(1, (t + 1) / 45)) >= 1).then(() => { s.platform = false; });
    const whiten = (async () => {
      await wait(8);
      for (let c = 0, gap = 7; c <= 14; c++, gap = Math.max(1, gap - 1)) { s.white = c / 16; await wait(gap); }
      s.white = 1;
    })();
    const shrink = (async () => {
      for (const [sx, sy] of [[0.969, 0.813], [0.844, 0.688], [0.719, 0.563], [0.594, 0.438], [0.469, 0.313]]) {
        await wait(20);
        s.scaleX = sx; s.scaleY = sy;
      }
      await wait(36);
    })();
    await Promise.all([darken, whiten, shrink]);
    show("");
    await fadeTo("#000", 0, 16, 2);
    return { name, look };
  }

  async function oakSpeech() {
    await preload(SPEECH_IMAGES);
    start();
    skippable = false; skipped = false;
    fade = { color: "#000", level: 16 };
    await controlsGuide();
    actors.clear();
    await pikachuPages();
    actors.clear();
    const result = await speech();
    stop();
    return result;
  }

  window.Intro = {
    movie: async () => { await movie(); },
    titleScreen: async () => { const r = await titleScreen(); return r; },
    oakSpeech,
    stop
  };
})();
