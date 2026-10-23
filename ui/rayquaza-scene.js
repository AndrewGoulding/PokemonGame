// The scene over Sootopolis City (pokeemerald's src/rayquaza_scene.c), drawn at 240x160 onto the overlay canvas from
// Emerald's own pictures (assets/rayquaza-scene/, tools/build-rayquaza-scene.js), frame for frame as its tasks time it:
//   1. Groudon and Kyogre facing one another in the storm (the shorter telling before Rayquaza's awakening, and the full one)
//   2. Over Rayquaza's shoulder as it takes flight
//   3. Rayquaza coming down out of the clouds in a ray of light
//   4. A close-up of Rayquaza charging
//   5. Rayquaza floating over the pair, roaring, as they back away
//
//   await RayquazaScene.play(canvas, 0, env)   // 0: the fight alone (RAY_ANIM_DUO_FIGHT_PRE, ended early)
//   await RayquazaScene.play(canvas, 1, env)   // 1: the fight and Rayquaza's coming, all five scenes
//   await RayquazaScene.play(canvas, 2, env)   // 2: Rayquaza's flight alone, taking off and charging (the Delta Episode's, ui/game.js)
//   env: { cry(species), sfx(name), music(name) }
// The canvas is left black and showing; the caller hides it.
(function () {
  "use strict";

  const W = 240, H = 160;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const images = {};
  function image(name) {
    const src = "assets/rayquaza-scene/" + name + ".png";
    if (!images[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      images[src] = img;
    }
    return images[src];
  }
  const ok = (img) => img && img.complete && img.naturalWidth > 0;
  const ALL = ["1-clouds-far", "1-clouds-near", "1-rain", "1-groudon", "1-groudon-shoulder", "1-groudon-claw", "1-kyogre", "1-kyogre-pectoral-fin", "1-kyogre-dorsal-fin",
    "2-bg", "2-rayquaza", "2-smoke", "3-bg", "3-light", "3-rayquaza", "3-rayquaza-tail", "4-bg", "4-orbs", "4-streaks", "4-rayquaza",
    "5-bg", "5-light", "5-ring", "5-groudon", "5-groudon-tail", "5-kyogre", "5-rayquaza", "5-rayquaza-tail", "5-kyogre-splash"];
  const layer = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; return { c, g }; };
  const rgb = (c) => "rgb(" + c.join(",") + ")";
  // (The backdrops, colour 0 of each scene's first palette; white where the light comes down.)
  const BACKDROP = { 1: [64, 64, 80], 2: [16, 16, 24], 3: [255, 255, 255], 4: [0, 0, 0], 5: [0, 0, 0] };

  // A sprite frame of a sheet (frames one under another), drawn with its centre at (x, y), as the GBA places them.
  function sprite(g, img, w, h, frame, x, y, flip) {
    if (!ok(img)) return;
    if (flip) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(img, 0, frame * h, w, h, -w / 2, -h / 2, w, h); g.restore(); }
    else g.drawImage(img, 0, frame * h, w, h, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }
  // An animation: frames [index, hold] and whether it loops; cmd() the step it's on, as animCmdIndex.
  function anim(frames, loop) {
    const a = { frames, loop, t: 0, i: 0, hold: frames[0][1], cmd: () => a.i, frame: () => a.frames[a.i][0], delay: () => a.hold };
    a.step = () => { if (a.hold > 1) { a.hold--; return; } if (a.i + 1 < a.frames.length) a.i++; else if (a.loop) a.i = 0; else return; a.hold = a.frames[a.i][1]; };
    return a;
  }
  // A text background tiled 256x256, scrolled by (hofs, vofs): the GBA's wrap.
  function bgTile(g, img, hofs, vofs, y0, y1) {
    if (!ok(img)) return;
    const ox = ((-hofs % 256) + 256) % 256 - 256, oy = ((-vofs % 256) + 256) % 256 - 256;
    g.save();
    g.beginPath(); g.rect(0, y0 == null ? 0 : y0, W, (y1 == null ? H : y1) - (y0 == null ? 0 : y0)); g.clip();
    for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) g.drawImage(img, x, y);
    g.restore();
  }

  async function play(canvas, mode, env) {
    canvas.classList.remove("hidden");
    await Promise.all(ALL.map((n) => image(n).loaded));
    const out = canvas.getContext("2d"), L = layer(), S = layer(), F = layer();
    const sfx = (n) => { if (env.sfx) env.sfx(n); };
    let fade = 16, flashBg = 0, flashBgStep = 0, flashBgDelay = 0, flashBgTick = 0, darkObj = 0, darkObjStep = 0, darkObjDelay = 0, darkObjTick = 0;
    // (BlendPalettesGradually: the backgrounds toward white and the sprites toward black, from a coefficient to another, a step every delay+1 frames.)
    const lightning = (from, to, delay) => { flashBg = from; flashBgStep = to < from ? -1 : 0; flashBgDelay = delay; flashBgTick = 0; darkObj = from; darkObjStep = flashBgStep; darkObjDelay = delay; darkObjTick = 0; if (to === from) { flashBgStep = 0; darkObjStep = 0; } };
    const stepFlash = () => {
      if (flashBgStep && ++flashBgTick > flashBgDelay) { flashBgTick = 0; flashBg = Math.max(0, flashBg + flashBgStep); }
      if (darkObjStep && ++darkObjTick > darkObjDelay) { darkObjTick = 0; darkObj = Math.max(0, darkObj + darkObjStep); }
    };
    // The frame put together: backdrop, the background layers and sprites in their order, the window's borders, the fade.
    const present = (draw, opts) => {
      const o = opts || {};
      L.g.fillStyle = rgb(o.backdrop || [0, 0, 0]); L.g.fillRect(0, 0, W, H);
      draw(L.g);
      if (o.window) { L.g.fillStyle = "#000"; L.g.fillRect(0, 0, W, 24); L.g.fillRect(0, 136, W, 24); }
      out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false;
      out.drawImage(L.c, 0, 0, canvas.width, canvas.height);
      if (fade > 0) { out.fillStyle = "rgba(0,0,0," + Math.min(16, fade) / 16 + ")"; out.fillRect(0, 0, canvas.width, canvas.height); }
      out.restore();
    };
    // Backgrounds flashed toward white and sprites toward black: drawn on layers of their own and tinted.
    const tinted = (g, lay, drawInto, colour, k) => {
      lay.g.clearRect(0, 0, W, H);
      drawInto(lay.g);
      if (k > 0) { lay.g.save(); lay.g.globalCompositeOperation = "source-atop"; lay.g.fillStyle = colour; lay.g.globalAlpha = Math.min(16, k) / 16; lay.g.fillRect(0, 0, W, H); lay.g.restore(); }
      g.drawImage(lay.c, 0, 0);
    };
    const bgs = (g, draw) => tinted(g, S, draw, "#fff", flashBg);
    const objs = (g, draw) => tinted(g, F, draw, "#000", darkObj);
    const fadeTo = async (to, delay, draw, opts) => {
      const st = to > fade ? 1 : -1;
      while (fade !== to) { for (let d = 0; d <= delay; d++) { draw(); await nextFrame(); } fade += st; }
    };

    // ---------- Scene 1: the pair in the storm (Task_DuoFightAnim and the rest) ----------
    async function duoFight(pre) {
      const near = image("1-clouds-near"), far = image("1-clouds-far"), rain = image("1-rain");
      const gro = image("1-groudon"), sho = image("1-groudon-shoulder"), claw = image("1-groudon-claw"), kyo = image("1-kyogre"), pec = image("1-kyogre-pectoral-fin"), dor = image("1-kyogre-dorsal-fin");
      const speeds = pre ? [448, 384, 320, 256, 192, 128] : [768, 640, 512, 384, 256, 128], bands = [[24, 48], [48, 64], [64, 76], [76, 84], [84, 88], [88, 92]];
      const pos = [0, 0, 0, 0, 0, 0];
      let rainX = 0, rainY = 0, bgY = 0, rainAlpha = 16, timer = 0, frame = 0, panning = false, panT = 0;
      const hold = pre ? 30 : 20, kHold = pre ? 36 : 24;
      const head = anim([[0, hold], [1, hold], [2, hold], [1, hold]], true), body = anim([[3, hold], [4, hold], [5, hold], [4, hold]], true);
      const G = { x: pre ? 88 : 98, y: 72, bx: pre ? 56 : 66, by: 104, sx: pre ? 75 : 85, sy: 101, cx: pre ? 109 : 119, cy: 114, t: 0 };
      const kAnim = (list) => anim(list.map((f) => [f, kHold]), true);
      const fin = kAnim([6, 8, 10, 8]), shoulderL = kAnim([7, 9, 11, 9]), shoulderR = kAnim([12, 13, 14, 13]), pecFin = kAnim([0, 1, 2, 1]);
      const kx = pre ? 136 : 126;
      // (The pieces: [x, y, frame or animation, subpriority]; the right pectoral fin and the dorsal fin apart.)
      const K = { t: 0, x: 0, pieces: [[kx, 96, 0], [kx + 32, 96, 1], [kx, 112, 2], [kx + 32, 112, 3], [kx, 128, 4], [kx + 32, 128, 5], [kx - 32, 128, fin], [kx, 128, shoulderL], [kx + 48, 128, shoulderR]],
        pecX: pre ? 208 : 198, pecY: 132, dorX: pre ? 200 : 190, dorY: 120, y2: 0, dy: 0 };
      sfx("se_m_rain_dance");
      const step = () => {
        frame++;
        stepFlash();
        for (let i = 0; i < 6; i++) pos[i] += speeds[i];
        rainX += 4; rainY -= 8;
        head.step(); body.step(); fin.step(); shoulderL.step(); shoulderR.step(); pecFin.step();
        // Groudon edges left to 72, Kyogre right to 152 (SpriteCB_DuoFight_Groudon / Kyogre).
        G.t++; K.t++;
        if ((pre ? (G.t & 31) === 0 : (G.t & 7) === 0) && G.x !== 72) { G.x--; G.bx--; G.sx--; G.cx--; }
        if ((pre ? (K.t & 31) === 0 : (K.t & 7) === 0) && K.pieces[0][0] !== 152) { K.x++; }
        const c = head.cmd(); G.sdx = c === 0 ? 0 : -1; G.sdy = c === 2 ? 1 : 0; G.cdx = c === 0 ? 0 : c === 2 ? -2 : -1; G.cdy = c === 2 ? 1 : 0;
        const kc = fin.cmd(); K.y2 = kc === 0 ? 0 : kc === 2 ? 2 : 1;
        if (panning) {
          // (DuoFight_PanOffScene: the pair slide down, the clouds too, the rain fading.)
          if (G.y <= H) { G.y += 8; G.by += 8; G.sy += 8; G.cy += 8; }
          if (K.pieces[0][1] <= H) { K.dy += 8; }
          bgY -= 4;
          if (panT !== 16) { panT++; rainAlpha = 16 - panT; }
        }
      };
      const draw = () => present((g) => {
        bgs(g, (b) => {
          // BG1, the clouds, each band of lines at its own pace (the scanline effect), scrolled up at the end.
          for (let i = 0; i < 6; i++) bgTile(b, near, pos[i] >> 8, bgY, bands[i][0], bands[i][1]);
          bgTile(b, near, 0, bgY, 92, 160);
        });
        objs(g, (o) => {
          const kd = K.y2 + K.dy;
          // Kyogre: the two shoulder pieces (subpriority 2) under the rest.
          for (const p of K.pieces) if (p[2] === shoulderL || p[0] === kx - 32) sprite(o, kyo, 32, 16, typeof p[2] === "number" ? p[2] : p[2].frame(), p[0] + K.x, p[1] + kd);
          for (const p of K.pieces) if (!(p[2] === shoulderL || p[0] === kx - 32)) sprite(o, kyo, 32, 16, typeof p[2] === "number" ? p[2] : p[2].frame(), p[0] + K.x, p[1] + kd);
          sprite(o, pec, 16, 8, pecFin.frame(), K.pecX + K.x, K.pecY + kd);
          sprite(o, dor, 32, 32, 0, K.dorX + K.x, K.dorY + kd);
          // Groudon: body behind, head, then the shoulder and the claw over it.
          sprite(o, gro, 64, 64, body.frame(), G.bx, G.by);
          sprite(o, gro, 64, 64, head.frame(), G.x, G.y);
          sprite(o, claw, 64, 32, 0, G.cx + G.cdx, G.cy + G.cdy);
          sprite(o, sho, 32, 32, 0, G.sx + G.sdx, G.sy + G.sdy);
        });
        bgs(g, (b) => { b.save(); b.globalAlpha = rainAlpha / 16; bgTile(b, rain, rainX, rainY); b.restore(); bgTile(b, far, 0, 0); });
      }, { backdrop: BACKDROP[1] });
      fade = 16;
      await fadeTo(0, 0, () => { step(); draw(); });
      for (;;) {
        step();
        if (pre) {
          if (timer === 64) { sfx("se_thunder"); lightning(16, 0, 0); }
          else if (timer === 144) { sfx("se_thunder"); lightning(16, 16, 0); }
          else if (timer === 148) lightning(16, 0, 4);
          else if (timer === 328) break;
        } else {
          if (timer === 32 || timer === 112) { sfx("se_thunder"); lightning(16, 0, 0); }
          else if (timer === 216) { sfx("se_thunder"); lightning(16, 16, 0); }
          else if (timer === 220) lightning(16, 0, 4);
          else if (timer === 380) panning = true;
          else if (timer === 412) break;
        }
        timer++;
        draw(); await nextFrame();
      }
      sfx("se_m_rain_dance");
      await fadeTo(16, pre ? 0 : 2, () => { step(); draw(); });
      flashBg = darkObj = 0;
    }

    // ---------- Scene 2: over Rayquaza's shoulder (Task_HandleRayTakesFlight) ----------
    async function takesFlight() {
      const bg = image("2-bg"), ray = image("2-rayquaza"), smoke = image("2-smoke"), far = image("1-clouds-far");
      const COORDS = [[-1, 5], [-3, -4], [5, -3], [-7, 2], [-9, -1], [1, -5], [3, 4], [-5, 3], [7, -2], [9, 1]];
      let state = 0, timer = 0, scale = 0, scaleSpeed = 30, yCoord = 0, ySpeed = 7, yOff = 12, yDir = -1, made = 0, makeT = 0;
      const smokes = [];
      if (env.music) env.music("mus_rayquaza_appears");
      const step = () => {
        // The smoke (Task_TakesFlight_CreateSmoke, SpriteCB_TakesFlight_Smoke): ten puffs, each drifting out and growing, over and over.
        if (made < 10 && (makeT & 3) === 0) { smokes.push({ id: made, x: 120 + COORDS[made][0] * 4, y: 80 + COORDS[made][1] * 4, x2: 0, y2: 0, t: 0 }); made++; }
        makeT++;
        for (const s of smokes) { if (s.t === 0) { s.x2 = 0; s.y2 = 0; } else { s.x2 += COORDS[s.id][0]; s.y2 += COORDS[s.id][1]; } s.t = (s.t + 1) & 15; }
        switch (state) {
          case 0: if (timer === 8) { fade = 16; state = 1; timer = 0; } else timer++; break;
          case 1:
            if (fade > 0) fade--;
            scale += scaleSpeed; yCoord += ySpeed;
            if (scaleSpeed > 3) scaleSpeed -= 3;
            if (ySpeed) ySpeed--;
            if (scale > 255) { scale = 256; scaleSpeed = 0; yOff = 12; yDir = -1; timer = 0; state = 2; }
            break;
          case 2:
            timer++;
            yOff += yDir;
            if (yOff === 12 || yOff === -12) { yDir *= -1; if (timer > 295) state = 3; }
            break;
          case 3: scale += 16; break;
        }
      };
      const draw = () => present((g) => {
        bgs(g, (b) => {
          bgTile(b, bg, 0, 0);
          // (Rayquaza is an affine background: its texture's (120, 24) at the screen's (120, y + 32), magnified 256/scale.)
          if (ok(ray) && scale > 0) {
            const k = 256 / scale, cy = yCoord + 32 + (state === 2 ? (yOff >> 2) : 0);
            b.save(); b.translate(120, cy); b.scale(k, k); b.drawImage(ray, -120, -24); b.restore();
          }
          b.save(); b.globalAlpha = 0.5;
          for (const s of smokes) { const sc = (192 + Math.min(14, s.t) * 32) / 256; b.save(); b.translate(s.x + s.x2, s.y + s.y2); b.scale(sc, sc); if (ok(smoke)) b.drawImage(smoke, -16, -8); b.restore(); }
          b.restore();
          bgTile(b, far, 0, 0);
        });
      }, { backdrop: BACKDROP[2] });
      fade = 16;
      while (state < 3) { step(); draw(); await nextFrame(); }
      await fadeTo(16, 6, () => { step(); draw(); });
    }

    // ---------- Scene 3: down through the clouds in a ray of light (Task_HandleRayDescends) ----------
    async function descends() {
      const bg = image("3-bg"), light = image("3-light"), ray = image("3-rayquaza"), tail = image("3-rayquaza-tail");
      let state = 0, timer = 0, revealed = -1, R = null;
      const body = anim([[0, 32], [1, 32]], true), tailA = anim([[0, 32], [1, 32]], true);
      const step = () => {
        body.step(); tailA.step();
        if (revealed >= 0 && revealed <= 0x1fff) revealed += revealed <= 39 ? 4 : revealed <= 79 ? 2 : 1;
        if (R) {
          // (SpriteCB_Descends_Rayquaza: it gathers pace as it comes out.)
          const f = R.t;
          if (f === 0) { R.xp = 12; R.yp = 8; } else if (f === 256) { R.xp = 9; R.yp = 7; } else if (f === 268) { R.xp = 8; R.yp = 6; } else if (f === 280) { R.xp = 7; R.yp = 5; }
          else if (f === 292) { R.xp = 6; R.yp = 4; } else if (f === 304) { R.xp = 5; R.yp = 3; } else if (f === 320) { R.xp = 4; R.yp = 2; }
          if (R.t % R.xp === 0) R.x2--;
          if (R.t % R.yp === 0) R.y2++;
          R.t++;
        }
        switch (state) {
          case 0: if (timer === 8) { timer = 0; state = 1; } else timer++; break;
          case 1: if (fade > 0) fade--; else if (timer === 10) { timer = 0; state = 2; revealed = 0; } else timer++; break;
          case 2: if (timer === 80) { timer = 0; state = 3; R = { x: 160, y: 0, x2: 0, y2: 0, t: 0, xp: 12, yp: 8 }; } else timer++; break;
          case 3: if (++timer === 368) { timer = 0; state = 4; } break;
        }
      };
      const draw = () => present((g) => {
        bgs(g, (b) => bgTile(b, bg, 0, 0));
        objs(g, (o) => { if (R) { sprite(o, ray, 64, 64, body.frame(), R.x + R.x2, R.y + R.y2); sprite(o, tail, 16, 32, tailA.frame(), 184 + R.x2, -48 + R.y2); } });
        bgs(g, (b) => {
          bgTile(b, bg, 0, 0, 0, 64);   // (BG1: the top of the clouds, over Rayquaza as it comes out)
          // The light (BG0, blended 8:13), revealed a line at a time from row 24.
          if (revealed >= 0) { b.save(); b.globalAlpha = 8 / 16; bgTile(b, light, 0, 0, 24, Math.min(136, 24 + revealed + 1)); b.restore(); }
        });
      }, { backdrop: BACKDROP[3] });
      fade = 16;
      while (state < 4) { step(); draw(); await nextFrame(); }
      await fadeTo(16, 0, () => { step(); draw(); });
    }

    // ---------- Scene 4: the charge (Task_HandleRayCharges) ----------
    async function charges() {
      const bg = image("4-bg"), orbs = image("4-orbs"), streaks = image("4-streaks"), ray = image("4-rayquaza");
      let state = 0, timer = 0, sound = 0, shakeT = 0, rx = 0, ry = 0, fly = null, oX = 0, oY = 0, sX = 0, sY = 0;
      const step = () => {
        // (RayCharges_AnimateBg: the orbs and the streaks stream up and right.)
        oX -= 8; oY += 8; sX -= 4; sY += 4;
        if ((sound & 7) === 0 && state <= 1 && timer <= 89) sfx("se_m_thunderbolt");
        sound++;
        if (!fly) { if ((shakeT & 3) === 0) { rx = Math.floor(Math.random() * 8) - 4; ry = Math.floor(Math.random() * 8) - 4; } shakeT++; }
        else if (fly.state === 0) { rx = 0; ry = 0; fly.state = 1; fly.off = 10; fly.dir = -1; }
        else { rx -= fly.off; ry += fly.off; fly.off += fly.dir; if (fly.off === -10) fly.dir *= -1; }
        switch (state) {
          case 0: if (timer === 8) { timer = 0; state = 1; } else timer++; break;
          case 1: if (fade > 0) fade--; if (timer === 127) { timer = 0; state = 2; fly = { state: 0 }; } else timer++; break;
          case 2: if (timer === 12) { timer = 0; state = 3; } else timer++; break;
        }
      };
      const draw = () => present((g) => {
        bgs(g, (b) => { bgTile(b, bg, 0, 0); bgTile(b, streaks, sX, sY); bgTile(b, ray, rx, ry); bgTile(b, orbs, oX, oY); });
      }, { backdrop: BACKDROP[4], window: true });
      fade = 16;
      while (state < 3) { step(); draw(); await nextFrame(); }
      await fadeTo(16, 0, () => { step(); draw(); });
    }

    // ---------- Scene 5: the pair driven apart (Task_HandleRayChasesAway) ----------
    async function chasesAway() {
      const bg = image("5-bg"), light = image("5-light"), ring = image("5-ring"), gro = image("5-groudon"), gtail = image("5-groudon-tail");
      const kyo = image("5-kyogre"), ray = image("5-rayquaza"), rtail = image("5-rayquaza-tail"), splash = image("5-kyogre-splash");
      let state = 0, timer = 0, blendT = 0, hi = 0, lo = 0, hiDir = 1, loDir = 1, ringTask = null;
      const Gd = { x: 64, y: 120, tx: 16, ty: 130, ty2: 0, anim: anim([[0, 1]], false), leaving: false, push: null };
      const Ky = { pieces: [{ x: 160, y: 128, f: 0 }, { x: 192, y: 128, f: 1 }, { x: 224, y: 128, f: 2 }], x2: 0, y2: 0, t: 0, t5: 0, t6: 0, leaving: false, splashes: false, push: null };
      const Ry = { x: 120, y: -65, x2: 0, y2: 0, tx: 120, ty: -113, frame: 0, t: 0, yOff: 0, yDir: 0, floatT: 0, delay: 1, peak: 0, floating: false };
      const splashA = anim([[0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8]], true);
      const setAnim = (n, dx, dy) => { Ry.frame = n; Ry.tx = Ry.x + dx; Ry.ty = Ry.y + dy; };
      const float = () => {
        if (!(Ry.floatT & Ry.delay)) {
          Ry.y2 += Ry.yOff; Ry.yOff += Ry.yDir;
          if (Ry.yOff >= Ry.peak || Ry.yOff <= -Ry.peak) { Ry.yOff = Math.max(-Ry.peak, Math.min(Ry.peak, Ry.yOff)); Ry.yDir *= -1; }
        }
        Ry.floatT++;
      };
      const pushBack = () => { Gd.push = { t: 0, decel: 0, speed: 4 }; Ky.push = { t: 0, decel: 0, speed: 4 }; };
      const stepPush = (p, sign) => {
        if (!p) return 0;
        let dx = 0;
        if ((p.t & 7) === 0) { dx = sign * p.speed; p.decel++; p.speed -= p.decel; if (p.decel === 3) { p.done = true; } }
        p.t++;
        return dx;
      };
      const stepRay = () => {
        const f = Ry.t;
        if (Ry.floating) { float(); return; }
        if (f <= 64) {
          Ry.y2 += 2;
          if (f === 64) { setAnim(1, 0, -48); Ry.yOff = 5; Ry.yDir = -1; Ry.delay = 3; Ry.peak = 5; }
        } else if (f <= 111) {
          float();
          if (Ry.yOff === 0) sfx("se_m_thunderbolt");
          if (Ry.yOff === -3) setAnim(2, 48, 16);
        } else if (f === 112) { Ry.delay = 7; Ry.peak = 3; float(); }
        else if (f <= 327) float();
        else if (f === 328) { float(); setAnim(3, 48, 16); Ry.x2 = 1; if (env.cry) env.cry("Rayquaza"); ringTask = { state: 0, scale: 0, rings: 0, scaleT: 0, speed: 16, sound: 0, on: false }; }
        else if (f === 376) { Ry.x2 = 0; float(); setAnim(2, 48, 16); Ry.floating = true; }
        else if (f === 352) pushBack();
        if (Ry.t > 328 && (Ry.t & 1) === 0) Ry.x2 *= -1;
        Ry.t++;
      };
      const stepRing = () => {
        const r = ringTask;
        if (!r) return;
        if (r.state === 0) { r.on = true; r.speed = 16; r.state = 1; }
        else if (r.state === 1) {
          if (r.sound === 8) sfx("se_sliding_door");
          if (r.rings === 2) r.state = 2;
          else {
            r.scale += r.speed; r.sound++;
            if (r.scaleT % 3 === 0 && r.speed !== 4) r.speed -= 2;
            r.scaleT++;
            if (r.scale > 255) { r.scale = 0; r.scaleT = 0; r.sound = 0; r.speed = 16; r.rings++; }
          }
        } else { r.on = false; ringTask = null; }
      };
      const step = () => {
        stepFlash();
        if ((blendT & 15) === 0) { hi -= hiDir; lo += loDir; if (hi === -3 || hi === 0) hiDir *= -1; if (lo === 3 || lo === 0) loDir *= -1; }
        blendT++;
        if (state >= 1) { stepRay(); stepRing(); splashA.step(); }
        const gdx = stepPush(Gd.push, -1); Gd.x += gdx; Gd.tx += gdx; if (Gd.push && Gd.push.done) Gd.push = null;
        const kdx = stepPush(Ky.push, 1); for (const p of Ky.pieces) p.x += kdx; if (Ky.push && Ky.push.done) Ky.push = null;
        if (Gd.leaving) {
          // (SpriteCB_ChasesAway_GroudonLeave: stepping back and away, its tail lifting as it steps.)
          Gd.anim.step();
          const c = Gd.anim.cmd();
          if (c === 0 || c === 2) { if (Gd.anim.delay() % 12 === 0) { Gd.x -= 2; Gd.tx -= 2; } Gd.ty2 = 0; }
          else { Gd.ty2 = -2; if ((Gd.anim.delay() & 15) === 0) { Gd.y++; Gd.ty++; } }
        }
        if (Ky.leaving) {
          // (SpriteCB_ChasesAway_KyogreLeave: shivering, then sinking back into the sea with a splash.)
          if ((Ky.t & 3) === 0) Ky.x2 = Ky.x2 === 1 ? -1 : 1;
          if (Ky.t5 === 128) { Ky.splashes = true; Ky.t5++; }
          if (Ky.t5 > 127) { if (Ky.y2 !== 32) { Ky.t6++; Ky.y2 = Ky.t6 >> 4; } } else Ky.t5++;
          if (Ky.t % 64 === 0) sfx("se_m_whirlpool");
          Ky.t++;
        }
        switch (state) {
          case 0: if (timer === 8) { timer = 0; state = 1; } else timer++; break;
          case 1:
            if (fade > 0) fade--;
            if (Ry.floating) { if (timer === 64) { Ky.leaving = true; Gd.leaving = true; Gd.anim = anim([[0, 48], [1, 32], [0, 48], [2, 32]], true); timer = 0; state = 2; } else timer++; }
            break;
          case 2:
            if (timer === 448) { timer = 0; state = 3; }
            else { timer++; if (timer % 144 === 0) lightning(16, 0, 0); }
            break;
        }
      };
      const draw = () => present((g) => {
        bgs(g, (b) => {
          bgTile(b, bg, 0, 0);
          b.save(); b.globalAlpha = (lo + 9) / 16; bgTile(b, light, 0, 0); b.restore();
        });
        objs(g, (o) => {
          sprite(o, gro, 64, 64, Gd.anim.frame(), Gd.x, Gd.y);
          sprite(o, gtail, 16, 16, 0, Gd.tx, Gd.ty + Gd.ty2);
          for (const p of Ky.pieces) sprite(o, kyo, 32, 32, p.f, p.x + Ky.x2, p.y + Ky.y2);
          if (Ky.splashes) { sprite(o, splash, 32, 8, splashA.frame(), 152, 132); sprite(o, splash, 32, 8, splashA.frame(), 224, 132, true); }
          sprite(o, ray, 64, 64, Ry.frame, Ry.x + Ry.x2, Ry.y + Ry.y2);
          sprite(o, rtail, 32, 32, Ry.frame, Ry.tx + Ry.x2, Ry.ty + Ry.y2);
        });
        // The ring of its roar (an affine background, its centre at (120, 64), magnified as it spreads).
        if (ringTask && ringTask.on && ok(ring)) { const k = 256 / Math.max(1, 256 - ringTask.scale); g.save(); g.translate(120, 64); g.scale(k, k); g.drawImage(ring, -64, -64); g.restore(); }
      }, { backdrop: BACKDROP[5], window: true });
      fade = 16;
      while (state < 3) { step(); draw(); await nextFrame(); }
      await fadeTo(16, 4, () => { step(); draw(); });
      if (env.music) env.music(null);
      for (let t = 0; t < 32; t++) { draw(); await nextFrame(); }
    }

    try {
      if (mode === 0) await duoFight(true);
      else if (mode === 2) { await takesFlight(); await charges(); }
      else { await duoFight(false); await takesFlight(); await descends(); await charges(); await chasesAway(); }
    } catch (e) { console.error(e); }
    out.save(); out.setTransform(1, 0, 0, 1, 0, 0); out.fillStyle = "#000"; out.fillRect(0, 0, canvas.width, canvas.height); out.restore();
  }

  window.RayquazaScene = { play };
})();
