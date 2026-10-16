// FireRed's Egg hatching scene (src/daycare.c: CB2_EggHatch_1 and the Egg's
// sprite callbacks), drawn on a 240x160 canvas in #scene with the battle text
// box under it, as the evolution scene is.
//
//   const s = await EggHatchScene.open(sceneEl, { mon: url });
//   await s.run();    // fades in, the Egg wobbles and cracks, bursts in a
//                     // white flash, and the Pokémon appears
//   s.close();
//
// From the black, the Egg sits on the backdrop's spotlight; after half a
// second it wobbles (SpriteCB_Egg_0: 20 frames, a pixel each way) and cracks
// with a shard flying; again (Egg_1, two pixels), and a third time, longer
// (Egg_2: 38 frames, two shards); it waits (Egg_3: 50 frames), then the
// screen goes white as shards burst out (Egg_4), and the Pokémon is there
// as the white fades away (Egg_5), rising a few pixels. Stepped at 60 frames
// a second.
(function () {
  "use strict";

  const W = 240, H = 160, FRAME_MS = 1000 / 60;
  const se = (name) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };
  // sEggShardVelocities (Q8.8 pixels a frame: x, y); gravity 100 (data[3]).
  const SHARD_VELOCITIES = [[-1.5, -3.75], [-5, -3], [3.5, -3], [-4, -3.75], [2, -1.5], [-0.5, -6.75], [5, -2.25],
    [-1.5, -3.75], [4.5, -1.5], [-1, -6.75], [4, -2.25], [-3.5, -3.75], [1, -1.5], [-3.515625, -6.75], [4.5, -2.25],
    [-0.5, -7.5], [1, -4.5], [-2.5, -2.25], [2.5, -7.5]].map(([x, y]) => [Math.round(x * 256), Math.round(y * 256)]);
  const sin = (angle, amp) => Math.round(Math.sin((angle / 256) * Math.PI * 2) * amp);

  function load(url) {
    return new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url; });
  }

  async function open(root, opts) {
    const [bg, egg, shard, mon] = await Promise.all([load("assets/sprites/egg-hatch-bg.png"),
      load("assets/sprites/egg-hatch.png"), load("assets/sprites/egg-shard.png"), load(opts.mon)]);
    root.classList.add("evo");
    root.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.className = "world evo-scene";
    canvas.width = W * 2; canvas.height = H * 2;
    root.appendChild(canvas);
    const g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;

    const st = { fade: 1, fadeColour: "#000", egg: { shown: true, frame: 0, x2: 0 }, mon: { shown: false, dy: 0 }, shards: [], next: 0 };
    function draw() {
      g.setTransform(2, 0, 0, 2, 0, 0);
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      if (bg) g.drawImage(bg, 0, 0);
      // (The Pokémon centred on (120, 70); the Egg's 32x32 sprite on (120, 75).)
      if (st.mon.shown && mon) g.drawImage(mon, Math.round(120 - mon.width / 2), Math.round(70 - mon.height / 2 + st.mon.dy));
      if (st.egg.shown && egg) g.drawImage(egg, 0, st.egg.frame * 32, 32, 32, 104 + st.egg.x2, 59, 32, 32);
      if (shard) for (const s of st.shards) g.drawImage(shard, s.frame * 8, 0, 8, 8, 116 + Math.trunc(s.x / 256), 56 + Math.trunc(s.y / 256), 8, 8);
      if (st.fade) { g.globalAlpha = st.fade; g.fillStyle = st.fadeColour; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }
    // CreateRandomEggShardSprite: the next velocity from the table, a random piece.
    function shardOut() {
      const [vx, vy] = SHARD_VELOCITIES[st.next++ % SHARD_VELOCITIES.length];
      st.shards.push({ vx, vy, x: 0, y: 0, frame: Math.floor(Math.random() * 4) });
    }
    function stepShards() {
      st.shards = st.shards.filter((s) => {
        s.x += s.vx; s.y += s.vy; s.vy += 100;
        return !(s.y / 256 > 20 && s.vy > 0);
      });
    }

    let gen = null, timer = null, last = 0, acc = 0, done = null;
    function loop(now) {
      acc += Math.min(200, now - (last || now));
      last = now;
      while (acc >= FRAME_MS) {
        acc -= FRAME_MS;
        stepShards();
        if (gen && gen.next().done) { gen = null; if (done) done(); }
      }
      draw();
      timer = requestAnimationFrame(loop);
    }
    draw();
    timer = requestAnimationFrame(loop);
    function* frames(n) { for (let i = 0; i < n; i++) yield; }
    function* fade(from, to, colour, n) { st.fadeColour = colour; for (let i = 1; i <= n; i++) { st.fade = from + (to - from) * i / n; yield; } }
    function* wobble(n, amp, at) {
      let angle = 0;
      for (let i = 1; i <= n; i++) {
        angle = (angle + 20) & 0xff;
        st.egg.x2 = sin(angle, amp);
        if (at[i]) at[i]();
        yield;
      }
      st.egg.x2 = 0;
    }
    function* hatch() {
      yield* fade(1, 0, "#000", 16);
      yield* frames(30);
      yield* wobble(20, 1, { 15: () => { se("se_ball"); st.egg.frame = 1; shardOut(); } });
      yield* frames(30);
      yield* wobble(20, 2, { 15: () => { se("se_ball"); st.egg.frame = 2; } });
      yield* frames(30);
      yield* wobble(38, 2, { 15: () => { se("se_ball"); st.egg.frame = 3; shardOut(); shardOut(); }, 30: () => se("se_ball") });
      yield* frames(50);
      // Egg_4: to white, shards bursting out; then the Egg's gone.
      st.fadeColour = "#fff";
      for (let i = 1; i <= 16; i++) { st.fade = i / 16; if (i <= 4) for (let k = 0; k < 4; k++) shardOut(); yield; }
      se("se_egg_hatch");
      st.egg.shown = false;
      // Egg_5: the Pokémon, rising as the white fades.
      st.mon.shown = true;
      for (let i = 0; i <= 40; i++) {
        if (i <= 9) st.mon.dy -= 1;
        if (i >= 8 && i < 24) st.fade = 1 - (i - 7) / 16;
        if (i >= 24) st.fade = 0;
        yield;
      }
    }

    return {
      run() { return new Promise((resolve) => { done = resolve; gen = hatch(); }); },
      fadeOut() { return new Promise((resolve) => { done = resolve; gen = fade(0, 1, "#000", 16); }); },
      close() {
        cancelAnimationFrame(timer);
        root.classList.remove("evo");
        root.innerHTML = "";
      }
    };
  }

  window.EggHatchScene = { open };
})();
