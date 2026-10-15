// FireRed's evolution scene (src/evolution_scene.c, src/evolution_graphics.c),
// drawn on a 240x160 canvas in #scene with the battle text box under it.
//
//   const s = await EvolutionScene.open(sceneEl, { from: url, into: url });
//   await s.fadeIn();                  // from black, the old Pokémon showing
//   const done = await s.run(opts);    // the swirl: true once it evolved,
//                                      // false if B stopped it (opts.canStop)
//   s.close();
//
// The scene is the battle background (Plain, the half without platforms) until
// the evolving starts: it fades to black and FireRed's swirling background
// (data/evolution-scene.js, tools/build-evolution.js) takes its place,
// its two layers circling and blended half and half while palette 10 runs
// through sBgAnim_PalIndexes; sparkles spiral up and rain down, the old and
// new Pokémon trade places as white shapes, faster and faster, sparkles close
// in, and a flash shows the new Pokémon. Everything is stepped once a GBA
// frame (60 a second), each of FireRed's tasks a generator here.
(function () {
  "use strict";

  const W = 240, H = 160, FIELD_H = 112;   // (the text box is below row 112)
  const FRAME_MS = 1000 / 60;

  // graphics/evolution_scene/transition.pal (black up to light blue).
  const BG_COLOURS = [[0, 0, 0], [16, 16, 16], [24, 32, 32], [41, 49, 49], [49, 65, 74], [65, 82, 90], [74, 98, 115],
    [90, 115, 131], [106, 131, 148], [115, 148, 172], [131, 164, 189], [139, 180, 213], [156, 197, 230], [172, 213, 255]];
  // sBgAnim_PalIndexes: palette 10 at each stage (colour n -> BG_COLOURS[..]).
  const PAL_INDEXES = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 0, 0], [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 0],
    [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0], [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0],
    [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11, 0, 0], [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 0], [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 0, 0],
    [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 11, 0, 0], [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 0, 0],
    [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 0, 0], [0, 6, 7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 0, 0],
    [0, 7, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 0, 0], [0, 8, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 6, 0, 0],
    [0, 9, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 6, 5, 0, 0], [0, 10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 0, 0],
    [0, 11, 12, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 0, 0], [0, 12, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 0, 0],
    [0, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0], [0, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 0, 0],
    [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 0, 0], [0, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 0, 0],
    [0, 9, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 0, 0], [0, 8, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 0, 0],
    [0, 7, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 0, 0], [0, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 0, 0],
    [0, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0], [0, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0],
    [0, 3, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 0], [0, 2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 0], [0, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0],
    [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0], [0, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
    [0, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0], [0, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
  // sBgAnim_PaletteControl: [first stage, last stage, cycles, delay].
  const PAL_CONTROL = [[0, 12, 1, 6], [13, 36, 5, 2], [13, 24, 1, 2], [37, 49, 1, 6]];
  // sEvolutionSparkleMatrixScales (OAM matrices 20-31): a sparkle's size is 256 / this.
  const SPARKLE_SCALES = [0x3C0, 0x380, 0x340, 0x300, 0x2C0, 0x280, 0x240, 0x200, 0x1C0, 0x180, 0x140, 0x100];

  // The GBA's Sin / Cos (gSineTable: 256 steps a turn, amplitude 256).
  const SINE = Array.from({ length: 256 }, (_, i) => Math.round(256 * Math.sin(2 * Math.PI * i / 256)));
  const sin = (i, a) => (SINE[i & 255] * a) >> 8;
  const cos = (i, a) => sin((i & 255) + 64, a);
  const div = (a, b) => Math.trunc(a / b);   // C's integer division

  const se = (name) => { if (window.GameAudio) window.GameAudio.se(name); };
  const load = (src) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  // A picture tinted toward `colour` by 0-16 sixteenths (a GBA palette fade), cached.
  function tinter(img) {
    const cache = {};
    return (amount, colour) => {
      if (!img) return null;
      const n = Math.max(0, Math.min(16, Math.round(amount * 16)));
      if (!n) return img;
      const key = colour + n;
      if (cache[key]) return cache[key];
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.globalAlpha = n / 16;
      g.fillStyle = colour;
      g.fillRect(0, 0, c.width, c.height);
      return (cache[key] = c);
    };
  }

  async function open(root, opts) {
    const [terrain, sparkleImg, from, into] = await Promise.all([
      load("assets/battle/plain.png"), load("assets/evolution/sparkle.png"),
      load(opts.from), load(opts.into)]);
    root.classList.add("evo");
    root.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "world evo-scene";
    canvas.width = W * 2; canvas.height = H * 2;
    root.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;

    // The swirl's two layers as colour numbers (data/evolution-scene.js).
    let layers = null;
    const E = window.EVOLUTION_SCENE;
    if (E) {
      layers = [E.bg1, E.bg2].map((map) => {
        const px = new Uint8Array(256 * 256);
        map.forEach((e, i) => {
          const tile = E.tiles[e & 0x3ff] || "", hf = e & 0x400, vf = e & 0x800;
          const tx = (i % 32) * 8, ty = Math.floor(i / 32) * 8;
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            px[(ty + y) * 256 + tx + x] = parseInt(tile[(vf ? 7 - y : y) * 8 + (hf ? 7 - x : x)] || "0", 16);
          }
        });
        return px;
      });
    }
    const swirl = document.createElement("canvas");
    swirl.width = W; swirl.height = FIELD_H;
    const swirlG = swirl.getContext("2d");
    const swirlPx = swirlG.createImageData(W, FIELD_H);

    const tint = { from: tinter(from), into: tinter(into), sparkle: tinter(sparkleImg) };
    const st = {
      fade: 1, fadeColour: "#000",                // the whole screen (FADE_IN)
      terrain: true, terrainFade: 0, terrainColour: "#000",
      bg: false, bgPal: null, bg1: [0, 0], bg2: [0, 0], bgFade: 0, bgColour: "#fff",
      mons: { from: { shown: true, scale: 1, white: 0 }, into: { shown: false, scale: 1, white: 0 } },
      sparkles: [], sparkleWhite: 0
    };

    function draw() {
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      if (st.terrain && terrain) {
        g.drawImage(terrain, 256, 0, W, FIELD_H, 0, 0, W, FIELD_H);
        if (st.terrainFade) { g.globalAlpha = st.terrainFade; g.fillStyle = st.terrainColour; g.fillRect(0, 0, W, FIELD_H); g.globalAlpha = 1; }
      }
      if (st.bg && layers) {
        // BG1 over BG2, blended half and half (BLDALPHA 8, 8); clear shows black.
        const pal = st.bgPal.map((c) => c.map((v) => v + (255 - v) * st.bgFade));
        const px = swirlPx.data, [l1, l2] = layers;
        for (let y = 0; y < FIELD_H; y++) {
          const r1 = ((y + st.bg1[1]) & 255) * 256, r2 = ((y + st.bg2[1]) & 255) * 256;
          for (let x = 0; x < W; x++) {
            const a = l1[r1 + ((x + st.bg1[0]) & 255)], b = l2[r2 + ((x + st.bg2[0]) & 255)];
            const o = (y * W + x) * 4;
            let c;
            if (a && b) { const p = pal[a], q = pal[b]; c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]; }
            else c = a ? pal[a] : b ? pal[b] : [0, 0, 0];
            px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
          }
        }
        swirlG.putImageData(swirlPx, 0, 0);
        g.drawImage(swirl, 0, 0);
      }
      // The Pokémon, centred on (120, 64) as FireRed's are; scaled about the centre.
      for (const k of ["from", "into"]) {
        const m = st.mons[k], pic = tint[k](m.white, "#fff");
        if (!m.shown || !pic) continue;
        const w = pic.width * m.scale, h = pic.height * m.scale;
        g.drawImage(pic, Math.round(120 - w / 2), Math.round(64 - h / 2), w, h);
      }
      const sp = tint.sparkle(st.sparkleWhite, "#fff");
      if (sp) for (const s of st.sparkles) {
        if (s.hidden) continue;
        const size = 8 * 256 / SPARKLE_SCALES[s.matrix - 20];
        g.drawImage(sp, Math.round(s.x + s.x2 - size / 2), Math.round(s.y + s.y2 - size / 2), size, size);
      }
      if (st.fade) { g.globalAlpha = st.fade; g.fillStyle = st.fadeColour; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }

    // ---------- Tasks: generators stepped once a frame ----------

    let tasks = [], timer = null, last = 0, acc = 0;
    function spawn(gen) { const t = { gen, done: false }; tasks.push(t); return t; }
    function frame() {
      for (const t of tasks.slice()) if (!t.done && t.gen.next().done) t.done = true;
      tasks = tasks.filter((t) => !t.done);
      // The sparkles' sprite callbacks.
      st.sparkles = st.sparkles.filter((s) => s.cb(s) !== false);
    }
    function loop(now) {
      acc += Math.min(200, now - (last || now));
      last = now;
      while (acc >= FRAME_MS) { acc -= FRAME_MS; frame(); }
      draw();
      timer = requestAnimationFrame(loop);
    }
    draw();
    timer = requestAnimationFrame(loop);
    // Resolves once `gen` has run to its end.
    const play = (gen) => new Promise((resolve) => spawn((function* () { yield* gen; resolve(); })()));
    function* frames(n) { for (let i = 0; i < n; i++) yield; }

    // BeginNormalPaletteFade: from `from` to `to` sixteenths, 2 a step, a
    // step every delay + 1 frames.
    function* fade(set, from, to, delay) {
      let y = from;
      set(y / 16);
      while (y !== to) {
        yield* frames(delay + 1);
        y = to > y ? Math.min(to, y + 2) : Math.max(to, y - 2);
        set(y / 16);
      }
    }

    // ---------- The swirl (StartBgAnimation, Task_UpdateBgPalette, Task_AnimateBg) ----------

    const bgTask = { paused: false, done: false };
    function startBg() {
      st.terrain = false;
      st.bg = true;
      st.bgPal = Array(16).fill([0, 0, 0]);   // gray_transition_intro.pal: black
      st.bgFade = 0;
      spawn((function* () {   // Task_UpdateBgPalette
        let start = 0, timer = 0, palStage = 0, control = 0, cycles = 0;
        for (;;) {
          yield;
          if (bgTask.paused) continue;
          if (start++ < 20) continue;
          const [first, lastStage, count, delay] = PAL_CONTROL[control];
          if (timer++ > delay) {
            if (lastStage === palStage) {
              if (++cycles === count) { cycles = 0; control++; }
              palStage = control < PAL_CONTROL.length ? PAL_CONTROL[control][0] : first;
            } else {
              st.bgPal = PAL_INDEXES[palStage].map((i) => BG_COLOURS[i]);
              timer = 0;
              palStage++;
            }
          }
          if (control === PAL_CONTROL.length) { bgTask.done = true; return; }
        }
      })());
      spawn((function* () {   // Task_AnimateBg
        let a = 0;
        while (!bgTask.done && st.bg) {
          a = (a + 5) & 255;
          const b = (a + 128) & 255;
          st.bg1 = [cos(a, 4) + 8, sin(a, 4) + 16];
          st.bg2 = [cos(b, 4) + 8, sin(b, 4) + 16];
          yield;
        }
        st.bg1 = [0, 0]; st.bg2 = [0, 0];
      })());
    }
    function stopBg() {
      bgTask.done = true;
      st.bg = false;
      st.terrain = true;
    }

    // ---------- Sparkles (evolution_graphics.c) ----------

    function sparkle(x, y, init, cb) {
      st.sparkles.push(Object.assign({ x, y, x2: 0, y2: 0, matrix: 31, hidden: false, d3: 0, d5: 0, d6: 0, d7: 0, cb }, init));
    }
    // EvolutionSparkles_SpiralUpward: four at a time spiral up and away.
    function* spiralUp() {
      se("se_m_mega_kick");
      spawn(fade((v) => { st.mons.from.white = st.mons.into.white = v; }, 0, 16, 10));
      for (let n = 0; n < 64; n++) {
        if ((n & 7) === 0) for (let i = 0; i < 4; i++) {
          sparkle(120, 88, { d5: 48, d6: (2 * (n & 0x78) + 64 * i) & 255 }, (s) => {
            if (s.y <= 8) return false;
            s.y = 88 - div(s.d7 * s.d7, 80);
            s.y2 = div(sin(s.d6, s.d5), 4);
            s.x2 = cos(s.d6, s.d5);
            s.d6 = (s.d6 + 4) & 255;
            if (s.d7 & 1) s.d5--;
            s.d7++;
            s.matrix = Math.min(31, div(s.d5, 4) + 20);
          });
        }
        yield;
      }
      yield* frames(97);
    }
    // EvolutionSparkles_ArcDown: nine at a time, for six frames, fall in an arc.
    function* arcDown() {
      se("se_m_bubble_beam2");
      for (let n = 0; n < 96; n++) {
        if (n < 6) for (let i = 0; i < 9; i++) {
          sparkle(120, 8, { d5: 8, d6: 16 * i, matrix: 25 }, (s) => {
            if (s.y >= 88) return false;
            s.y = 8 + div(s.d7 * s.d7, 5);
            s.y2 = div(sin(s.d6, s.d5), 4);
            s.x2 = cos(s.d6, s.d5);
            s.d5 = sin((s.d7 * 4) & 255, 40) + 8;
            s.d7++;
          });
        }
        yield;
      }
    }
    // EvolutionSparkles_CircleInward: two rings close in on the Pokémon.
    function* circleIn() {
      se("se_shiny");
      const ring = (speed) => { for (let i = 0; i < 16; i++) sparkle(120, 56, { d3: speed, d5: 120, d6: i * 16 }, (s) => {
        if (s.d5 <= 8) return false;
        s.y2 = sin(s.d6, s.d5);
        s.x2 = cos(s.d6, s.d5);
        s.d5 -= s.d3;
        s.d6 = (s.d6 + 4) & 255;
      }); };
      for (let n = 0; n < 48; n++) {
        if (n === 0) ring(4);
        if (n === 32) ring(8);
        yield;
      }
    }
    // EvolutionSparkles_SprayAndFlash: a flash of white, sparkles spraying out.
    function* sprayAndFlash() {
      se("se_m_petal_dance");
      bgTask.paused = true;
      st.bgPal = Array(16).fill([0, 0, 0]);
      spawn(fade((v) => { st.bgFade = v; st.sparkleWhite = v; }, 0, 16, 0));
      const spray = () => sparkle(120, 56, { d3: 3 - Math.floor(Math.random() * 7), d5: 48 + (Math.floor(Math.random() * 256) & 63) }, (s) => {
        if ((s.d7 & 3) === 0) s.y++;
        if (s.d6 >= 128) return false;
        s.y2 = -sin(s.d6, s.d5);
        s.x = 120 + div(s.d3 * s.d7, 3);
        s.d6++;
        s.matrix = Math.max(20, 31 - div(s.d6 * 12, 128));
        s.d7++;
      });
      for (let n = 0; n < 128; n++) {
        if (n === 0) for (let i = 0; i < 8; i++) spray();
        else if (n === 32) spawn(fade((v) => { st.bgFade = v; st.sparkleWhite = v; st.mons.into.white = v; }, 16, 0, 0));
        else if (n < 50) spray();
        yield;
      }
    }

    // CycleEvolutionMonSprite: the two white shapes grow and shrink in turn,
    // faster each time, until the new one stays. `stop()` says B is held.
    function* cycle(stop) {
      const from = st.mons.from, into = st.mons.into;
      let pre = 256, post = 16, speed = 8, dir = false;
      from.shown = into.shown = true;
      const set = () => { from.scale = pre / 256; into.scale = post / 256; };
      set();
      yield;
      for (;;) {
        if (stop()) return false;
        if (speed === 128) break;
        speed += 2;
        dir = !dir;
        yield;
        for (;;) {
          if (stop()) return false;
          let ends = 0;
          if (!dir) {
            if (pre < 256 - speed) pre += speed; else { pre = 256; ends = 1; }
            if (post > 16 + speed) post -= speed; else { post = 16; ends++; }
          } else {
            if (post < 256 - speed) post += speed; else { post = 256; ends = 1; }
            if (pre > 16 + speed) pre -= speed; else { pre = 16; ends++; }
          }
          set();
          yield;
          if (ends === 2) break;
        }
      }
      from.shown = false;
      into.scale = 1;
      return true;
    }

    // ---------- What the game calls ----------

    return {
      // EVOSTATE_FADE_IN: the screen from black.
      fadeIn: () => play(fade((v) => { st.fade = v; }, 16, 0, 0)),
      // From EVOSTATE_START_MUSIC to the new Pokémon showing (or B stopping it).
      run(opts) {
        opts = opts || {};
        let held = false;
        const KEYS = { x: 1, X: 1, Escape: 1 };
        const down = (e) => { if (KEYS[e.key]) held = true; };
        const up = (e) => { if (KEYS[e.key]) held = false; };
        document.addEventListener("keydown", down, true);
        document.addEventListener("keyup", up, true);
        const result = new Promise((resolve) => spawn((function* () {
          yield* fade((v) => { st.terrainFade = v; st.terrainColour = "#000"; }, 0, 16, 4);
          startBg();
          yield* spiralUp();
          yield* arcDown();
          const evolved = yield* cycle(() => !!opts.canStop && held);
          if (!evolved) {
            // EVOSTATE_CANCEL: the old Pokémon back, from white.
            st.mons.from.shown = true; st.mons.from.scale = 1;
            st.mons.into.shown = false;
            stopBg();
            if (opts.onStop) opts.onStop();
            yield* fade((v) => { st.terrainFade = v; st.terrainColour = "#fff"; st.mons.from.white = v; }, 16, 0, 0);
            return resolve(false);
          }
          yield* circleIn();
          yield* sprayAndFlash();
          // EVOSTATE_EVO_SOUND / RESTORE_SCREEN: the background back, from black.
          se("se_exp");
          if (opts.onEvolved) opts.onEvolved();
          stopBg();
          st.sparkles = [];
          yield* fade((v) => { st.terrainFade = v; st.terrainColour = "#000"; }, 16, 0, 0);
          resolve(true);
        })()));
        return result.finally(() => {
          document.removeEventListener("keydown", down, true);
          document.removeEventListener("keyup", up, true);
        });
      },
      // Shows another picture (Shedinja appearing) where the Pokémon stands.
      async show(url) {
        const img = await load(url);
        tint.into = tinter(img);
        Object.assign(st.mons.into, { shown: true, scale: 1, white: 0 });
        st.mons.from.shown = false;
      },
      close() {
        cancelAnimationFrame(timer);
        tasks = [];
        root.classList.remove("evo");
      }
    };
  }

  window.EvolutionScene = { open };
})();
