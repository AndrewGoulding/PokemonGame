// The Seagallop ferry ride (FireRed's DoSeagallopFerryScene, src/seagallop.c):
// the screen fades in on the open sea, a band of it between black bars, the
// water rushing past while the ferry crosses from one side to the other
// leaving its wake; after 140 frames it fades out (and the map's music with
// it), and the game warps you to the harbor.
//
//   await Seagallop.ride(canvas, { eastbound, sfx, fadeMusic })
//     canvas: the 240x160 overlay (any size, drawn scaled); eastbound: the
//     ferry heads right (sTravelDirectionMatrix); sfx(name) plays SE_SHIP;
//     fadeMusic() fades the map's music out (Overworld_FadeOutMapMusic).
// (Which way it heads between two ports: Sevii.eastbound, game/sevii.js.)
//
// The pictures are assets/seagallop/ (tools/build-seagallop.js). The canvas is
// left black and showing; the caller hides it.
(function () {
  "use strict";

  const W = 240, H = 160;
  const RIDE_FRAMES = 140;     // Task_Seagallop_1: then the fade out
  const FADE_FRAMES = 16;
  const SCROLL = 6;            // ChangeBgX(3, 0x600, ...): 6 pixels a frame
  const FERRY_SPEED = 3;       // data[0] = 48, in 1/16 pixels
  const WAKE_EVERY = 5;
  const WAKE_FRAMES = [20, 20, 15];   // sSpriteAnims_Wake: tiles 0, 0x10, 0x20
  const BAND_TOP = 24, BAND_BOTTOM = 136;   // WIN0V 0x1888
  const Y = 92;                // the ferry's and the wake's centre

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
  const ok = (img) => img && img.complete && img.naturalWidth > 0;
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  async function ride(canvas, opts) {
    opts = opts || {};
    const east = opts.eastbound !== false;
    const sea = image("assets/seagallop/sea-" + (east ? "east" : "west") + ".png");
    const ferry = image("assets/seagallop/ferry.png"), wake = image("assets/seagallop/wake.png");
    await Promise.all([sea.loaded, ferry.loaded, wake.loaded]);
    const layer = document.createElement("canvas");
    layer.width = W; layer.height = H;
    const g = layer.getContext("2d");
    g.imageSmoothingEnabled = false;
    const out = canvas.getContext("2d");
    canvas.classList.remove("hidden");

    let scroll = 0, frame = 0;
    const startX = east ? 0 : W, step = east ? FERRY_SPEED : -FERRY_SPEED;
    const wakes = [];   // { x, age }
    const draw = (fade) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      g.save();
      g.beginPath();
      g.rect(0, BAND_TOP, W, BAND_BOTTOM - BAND_TOP);
      g.clip();
      if (ok(sea)) {
        // (The 256-pixel-wide background wraps around.)
        const ox = ((Math.round(scroll) % 256) + 256) % 256;
        for (let x = -ox; x < W; x += 256) g.drawImage(sea, x, 0);
      }
      for (const w of wakes) {
        let k = 0, t = w.age;
        while (k < WAKE_FRAMES.length - 1 && t >= WAKE_FRAMES[k]) t -= WAKE_FRAMES[k++];
        if (!ok(wake)) continue;
        g.save();
        g.translate(Math.round(w.x), 0);
        if (east) g.scale(-1, 1);
        g.drawImage(wake, 0, k * 32, 32, 32, -16, Y - 16, 32, 32);
        g.restore();
      }
      const fx = startX + Math.floor(frame * step);
      if (ok(ferry) && fx > -40 && fx < W + 40) {
        g.save();
        g.translate(fx, 0);
        if (east) g.scale(-1, 1);
        g.drawImage(ferry, -32, Y - 32);
        g.restore();
      }
      g.restore();
      out.save();
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, canvas.width, canvas.height);
      out.drawImage(layer, 0, 0, canvas.width, canvas.height);
      if (fade) { out.fillStyle = "rgba(0, 0, 0, " + Math.min(16, fade) / 16 + ")"; out.fillRect(0, 0, canvas.width, canvas.height); }
      out.restore();
    };
    const advance = () => {
      scroll += east ? SCROLL : -SCROLL;
      if (frame % WAKE_EVERY === 0) wakes.push({ x: startX + Math.floor(frame * step), age: 0 });
      for (const w of wakes) w.age++;
      while (wakes.length && wakes[0].age >= WAKE_FRAMES.reduce((a, b) => a + b, 0)) wakes.shift();
      frame++;
    };
    // Fade in from black, the ferry setting off with SE_SHIP.
    if (opts.sfx) opts.sfx("se_ship");
    for (let f = FADE_FRAMES; f > 0; f--) { advance(); draw(f); await nextFrame(); }
    while (frame < RIDE_FRAMES) { advance(); draw(0); await nextFrame(); }
    // Then out, the music with it.
    if (opts.fadeMusic) opts.fadeMusic();
    for (let f = 1; f <= FADE_FRAMES; f++) { advance(); draw(f); await nextFrame(); }
    draw(16);
  }

  window.Seagallop = { ride, RIDE_FRAMES };
})();
