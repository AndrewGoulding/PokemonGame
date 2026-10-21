// The scene over Sootopolis City (src/rayquaza_scene.c), drawn at 240x160 onto the overlay canvas: Groudon and Kyogre's
// fight under the storm, and Rayquaza's coming: it takes off, descends, charges and, roaring, drives the pair apart.
// (Emerald's is five scenes of tiled backgrounds and sprites; this is a short telling of them with the Pokémon's own
// pictures: the storm, lightning, the legendaries closing, Rayquaza's light and the ring of its roar.)
//
//   await RayquazaScene.play(canvas, 0, env)   // 0: the fight alone (Script_DoRayquazaScene with VAR_0x8004 false)
//   await RayquazaScene.play(canvas, 1, env)   // 1: Rayquaza arrives (and the fight ends)
//   env: { spriteUrl(species) (a front picture), cry(species), sfx(name) }
// The canvas is left black and showing; the caller hides it.
(function () {
  "use strict";

  const W = 240, H = 160;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const images = {};
  function image(src) {
    if (!images[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      images[src] = img;
    }
    return images[src];
  }
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp = (v) => Math.max(0, Math.min(1, v));

  async function play(canvas, mode, env) {
    const g = canvas.getContext("2d");
    const pics = { Groudon: image(env.spriteUrl("Groudon")), Kyogre: image(env.spriteUrl("Kyogre")), Rayquaza: image(env.spriteUrl("Rayquaza")) };
    await Promise.all(Object.values(pics).map((p) => p.loaded));
    canvas.classList.remove("hidden");
    g.imageSmoothingEnabled = false;
    // The storm: rain, cloud banks drifting, a darkening sky.
    const rain = Array.from({ length: 90 }, () => ({ x: Math.random() * (W + 40), y: Math.random() * H, v: 0.8 + Math.random() }));
    const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 40 - 30, y: 4 + (i % 3) * 14, w: 50 + (i * 17) % 30, v: 0.3 + (i % 4) * 0.12 }));
    let flash = 0, shakeAmt = 0, fade = 1, ring = 0;
    const draw = (t, scene) => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      const sx = shakeAmt ? Math.round((Math.random() - 0.5) * shakeAmt) : 0, sy = shakeAmt ? Math.round((Math.random() - 0.5) * shakeAmt) : 0;
      g.translate(sx, sy);
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0b1020"); sky.addColorStop(1, "#33405e");
      g.fillStyle = sky; g.fillRect(-4, -4, W + 8, H + 8);
      g.fillStyle = "rgba(70,80,110,0.8)";
      for (const c of clouds) { c.x += c.v; if (c.x > W + 20) c.x = -c.w; g.beginPath(); g.ellipse(c.x + c.w / 2, c.y + 8, c.w / 2, 9, 0, 0, Math.PI * 2); g.fill(); }
      scene(t);
      g.strokeStyle = "rgba(190,205,235,0.7)"; g.lineWidth = 1; g.beginPath();
      for (const r of rain) { r.x -= 1.8; r.y += 5 * r.v; if (r.y > H || r.x < -6) { r.y = -8; r.x = Math.random() * (W + 40); } g.moveTo(Math.round(r.x), Math.round(r.y)); g.lineTo(Math.round(r.x) - 3, Math.round(r.y) + 7); }
      g.stroke();
      if (flash > 0) { g.fillStyle = "rgba(255,255,255," + Math.min(0.8, flash / 8) + ")"; g.fillRect(-4, -4, W + 8, H + 8); flash--; }
      if (fade > 0) { g.fillStyle = "rgba(0,0,0," + fade + ")"; g.fillRect(-4, -4, W + 8, H + 8); }
    };
    const pic = (p, cx, cy, h, flip, alpha) => {
      const s = h / p.naturalHeight, w = p.naturalWidth * s;
      g.save();
      if (alpha != null) g.globalAlpha = alpha;
      g.translate(Math.round(cx), Math.round(cy));
      if (flip) g.scale(-1, 1);
      g.drawImage(p, -w / 2, -h / 2, w, h);
      g.restore();
    };
    const run = async (frames, scene, hooks) => {
      for (let t = 0; t < frames; t++) { if (hooks) hooks(t); draw(t, (u) => scene(t, u)); await nextFrame(); }
    };
    const fadeTo = async (to, n) => { const from = fade; for (let i = 1; i <= n; i++) { fade = from + (to - from) * i / n; draw(0, () => {}); await nextFrame(); } fade = to; };

    // The two close: Groudon from the left, Kyogre from the right, until they lock and the sky splits with lightning.
    const duo = (T, pull) => (t) => {
      const a = ease(clamp(t / T));
      pic(pics.Groudon, -20 + 76 * a - pull * 60, 84, 96, true, 1);
      pic(pics.Kyogre, 260 - 76 * a + pull * 60, 88, 100, false, 1);
    };
    await fadeTo(0, 24);
    env.sfx("se_thunder");
    await run(150, (t) => duo(150, 0)(t), (t) => { if (t === 40 || t === 90 || t === 128) { flash = 8; env.sfx("se_thunder"); } shakeAmt = t > 110 ? 3 : 0; });
    env.cry("Groudon"); await run(40, (t) => duo(1, 0)(t), (t) => { shakeAmt = 4; if (t === 10) flash = 8; });
    env.cry("Kyogre"); await run(40, (t) => duo(1, 0)(t), (t) => { shakeAmt = 4; if (t === 10) flash = 8; });
    shakeAmt = 0;
    if (mode === 0) { await fadeTo(1, 30); return; }

    // Rayquaza takes off, high over the pair, and its light grows.
    env.sfx("se_thunder");
    await run(120, (t) => {
      duo(1, 0)(t);
      const a = ease(clamp(t / 120));
      g.fillStyle = "rgba(255,255,255," + 0.25 * a + ")"; g.beginPath(); g.ellipse(W / 2, 28, 30 + 40 * a, 14 + 20 * a, 0, 0, Math.PI * 2); g.fill();
      pic(pics.Rayquaza, W / 2, 190 - 150 * a, 90, false, 0.35 + 0.65 * a);
    }, (t) => { if (t === 20) flash = 6; shakeAmt = t > 60 ? 2 : 0; });
    // It descends between them and roars: the ring of its voice pushes them off.
    env.cry("Rayquaza");
    await run(150, (t) => {
      const a = ease(clamp(t / 150)), r = ease(clamp((t - 30) / 120));
      duo(1, r)(t);
      g.strokeStyle = "rgba(190,255,200," + (0.8 - 0.8 * r) + ")"; g.lineWidth = 3;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(W / 2, 80, 20 + (r * 150 + k * 18), 10 + (r * 80 + k * 10), 0, 0, Math.PI * 2); g.stroke(); }
      pic(pics.Rayquaza, W / 2, 50 + 30 * Math.sin(t / 10) + 0 * a, 100, false, 1);
    }, (t) => { shakeAmt = t < 90 ? 3 : 0; if (t === 30 || t === 70) flash = 10; });
    await fadeTo(1, 30);
  }

  window.RayquazaScene = { play };
})();
