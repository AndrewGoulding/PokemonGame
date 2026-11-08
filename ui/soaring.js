// Soaring over Hoenn on Latias or Latios (this game's own, after Omega Ruby and Alpha Sapphire's Soaring, and the
// flying of the Emerald hack Pokémon R.O.W.E.): the Eon Flute calls it, and you fly over Emerald's map of Hoenn, drawn
// four times over as the land far below, clouds drifting under you, your Lati's shadow on the ground. The D-pad (or
// arrow keys) steers, and it keeps flying the way you last steered; over a town or route its name shows, and A lands
// there if Fly could take you (you've been, and it has somewhere to land). B stops, back down where you took off.
//
//   const where = await Soaring.open(canvas, {
//     map,         // the Town Map's region: { image, x0, y0, width, height, map (rows of sections), names }
//     start,       // the cell to start over: [x, y]
//     lati,        // its overworld sheet ("follow/381"): 32x32 frames, FireRed's order
//     landing,     // (section) => true when A can land there
//     music, sfx   // the game's
//   })
//   // -> the section to land at, or null (stopped)
(function () {
  "use strict";

  const W = 240, H = 192, SCALE = 4, SPEED = 1.6;
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
  const ok = (img) => img && img.complete && img.naturalWidth > 0;
  const DIRS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  // (FireRed's sheet order, side by side: standing down, up, left; then the two steps of each. Right is left, flipped.)
  const FRAME = { down: [0, 3, 4], up: [1, 5, 6], left: [2, 7, 8], right: [2, 7, 8] };

  async function open(canvas, opts) {
    const R = opts.map, map = image(R.image), lati = image("assets/world/sprites/" + opts.lati + ".png");
    await Promise.all([map.loaded, lati.loaded]);
    canvas.classList.remove("hidden");
    const g = canvas.getContext("2d");
    // The world: the map picture's pixels times SCALE; you start over the middle of `start`'s cell.
    const worldW = 240 * SCALE, worldH = 160 * SCALE;
    let x = (R.x0 + 8 * opts.start[0] + 4) * SCALE, y = (R.y0 + 8 * opts.start[1] + 4) * SCALE;
    let vx = 0, vy = 0, facing = "down", t = 0;
    const held = new Set();
    let pressed = null;
    const keyOf = (e) => (DIRS[e.key] ? e.key : /^[zZ ]$|^Enter$/.test(e.key) ? "a" : /^[xX]$|^Escape$|^Backspace$/.test(e.key) ? "b" : null);
    const down = (e) => { const k = keyOf(e); if (!k) return; e.preventDefault(); e.stopImmediatePropagation(); if (DIRS[k]) held.add(k); else if (!e.repeat) pressed = k; };
    const up = (e) => { if (DIRS[e.key]) held.delete(e.key); };
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    // Clouds: puffs at their own heights, the higher drifting faster across.
    const clouds = Array.from({ length: 12 }, (_, i) => ({ x: (i * 977) % worldW, y: (i * 613) % worldH, r: 14 + (i * 7) % 20, h: 0.5 + ((i * 37) % 50) / 100 }));
    const cell = () => [Math.floor(x / SCALE - R.x0) >> 3, Math.floor(y / SCALE - R.y0) >> 3];
    const section = () => { const [cx, cy] = cell(); return cx >= 0 && cy >= 0 && cx < R.width && cy < R.height ? R.map[cy][cx] || null : null; };
    if (opts.music) opts.music("em_sailing");
    try {
      for (;;) {
        await nextFrame();
        t++;
        // Steering: the held directions; let go and it keeps on, slowly, the way it was going.
        let ax = 0, ay = 0;
        for (const k of held) { ax += DIRS[k][0]; ay += DIRS[k][1]; }
        if (ax || ay) { const n = Math.hypot(ax, ay); vx += (ax / n * SPEED - vx) * 0.15; vy += (ay / n * SPEED - vy) * 0.15; }
        else { vx *= 0.94; vy *= 0.94; }
        x = Math.max(0, Math.min(worldW, x + vx)); y = Math.max(0, Math.min(worldH, y + vy));
        if (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2) facing = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down");
        const sec = section(), name = sec && R.names[sec], canLand = !!(sec && opts.landing(sec));
        if (pressed === "a") {
          pressed = null;
          if (canLand) { if (opts.sfx) opts.sfx("se_m_fly"); return sec; }
          if (opts.sfx) opts.sfx("se_failure");
        } else if (pressed === "b") {
          pressed = null;
          return null;
        }
        // The view: the land below, the camera on you (held inside the world).
        const camX = Math.max(0, Math.min(worldW - W, x - W / 2)), camY = Math.max(0, Math.min(worldH - H, y - H / 2));
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.imageSmoothingEnabled = false;
        const k = canvas.width / W;
        g.scale(k, canvas.height / H);
        g.fillStyle = "rgb(56,120,200)";
        g.fillRect(0, 0, W, H);
        if (ok(map)) g.drawImage(map, camX / SCALE, camY / SCALE, W / SCALE, H / SCALE, 0, 0, W, H);
        // (The haze of height over it.)
        g.fillStyle = "rgba(200,224,255,0.18)";
        g.fillRect(0, 0, W, H);
        // Your Lati's shadow on the ground, then the clouds below you, then the Lati.
        const sx = x - camX, sy = y - camY, bob = Math.sin(t / 12) * 2;
        g.fillStyle = "rgba(0,0,32,0.35)";
        g.beginPath(); g.ellipse(sx, sy, 16, 6, 0, 0, Math.PI * 2); g.fill();   // (the shadow marks the spot you're over)
        for (const c of clouds) {
          const cx = ((c.x + t * c.h * 0.6 - camX * c.h) % (W + 80) + W + 80) % (W + 80) - 40, cy = ((c.y - camY * c.h) % (H + 80) + H + 80) % (H + 80) - 40;
          g.fillStyle = "rgba(255,255,255," + (0.2 + c.h * 0.25) + ")";
          g.beginPath(); g.ellipse(cx, cy, c.r * 1.6, c.r * 0.7, 0, 0, Math.PI * 2); g.ellipse(cx + c.r * 0.8, cy - c.r * 0.3, c.r, c.r * 0.6, 0, 0, Math.PI * 2); g.fill();
        }
        if (ok(lati)) {
          const f = FRAME[facing][Math.floor(t / 10) % 2 + 1], flip = facing === "right";
          g.save();
          g.translate(Math.round(sx), Math.round(sy - 26 + bob));
          if (flip) g.scale(-1, 1);
          g.drawImage(lati, f * 32, 0, 32, 32, -32, -40, 64, 64);
          g.restore();
        }
        // Where you are: its name, and whether you can land.
        g.fillStyle = "rgba(16,24,48,0.75)";
        g.fillRect(0, 0, W, 18);
        g.fillStyle = "#fff";
        g.font = "10px monospace";
        g.textBaseline = "middle";
        g.fillText(name || "Hoenn", 6, 9);
        g.textAlign = "right";
        g.fillStyle = canLand ? "#ffe070" : "#9aa8c8";
        g.fillText(canLand ? "A: Land   B: Stop" : "B: Stop", W - 6, 9);
        g.textAlign = "left";
        g.restore();
      }
    } finally {
      document.removeEventListener("keydown", down, true);
      document.removeEventListener("keyup", up, true);
    }
  }

  window.Soaring = { open };
})();
