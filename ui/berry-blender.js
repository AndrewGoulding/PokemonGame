// The Berry Blender (Emerald's src/berry_blender.c), drawn on a canvas in the scene: an arrow spins round the
// blender, faster with every good hit; each player has a mark on the rim, and presses A as the arrow passes it. A
// press as it crosses the middle of the mark's window is BEST (the arrow speeds up by 384 / the players' divisor,
// 128 past 1500), elsewhere in the window GOOD (256), outside it a MISS (-256, never under the starting 128): the
// GBA's numbers, the arrow turning speed / 65536 of a round a frame, so the speed in RPM is 60 x 60 x speed / 65536.
// The others press by Emerald's odds (Task_HandleOpponent1..3: more BEST the better they are, a MISS now and then
// once it's fast), the Blend Master every time. The blending's done when the bar fills (a BEST adds speed / 55, a
// GOOD speed / 70, of 1000), and the best speed reached decides the block (ui/hoenn-pokeblock.js blend).
//
//   const r = await BerryBlender.run(sceneElement, { players: [{ name, berry, master }], rng })  -> { maxRPM, scores }
(function () {
  "use strict";

  const W = 240, H = 160, CX = 120, CY = 84, R = 52;
  const MIN_SPEED = 128, MAX_PROGRESS = 1000, DIVISOR = [1, 1, 2, 3, 4];
  // (sArrowHitRangeStart: where each player's window starts, in 256ths of a round; you at the first.)
  const RANGE_START = [32, 224, 96, 160];
  const COLOURS = ["#e04040", "#4060e0", "#30a040", "#d0a020"];
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  function run(root, opts) {
    const rng = opts.rng || Math.random, players = opts.players, n = players.length, div = DIVISOR[n];
    root.innerHTML = '<div class="dig berry-blend"><div class="dig-top"><span class="dig-label blend-rpm">0.00 RPM</span>' +
      '<div class="dig-bar energy" aria-hidden="true"><div class="dig-fill"></div></div><span class="dig-label blend-note"></span></div>' +
      '<canvas class="berry-board" width="' + W + '" height="' + H + '"></canvas></div>';
    const canvas = root.querySelector(".berry-board"), g = canvas.getContext("2d");
    const rpmEl = root.querySelector(".blend-rpm"), bar = root.querySelector(".energy .dig-fill"), note = root.querySelector(".blend-note");
    const st = { pos: 0, speed: MIN_SPEED, progress: 0, maxRPM: 0, done: false, scores: players.map(() => ({ best: 0, good: 0, miss: 0 })), flashes: [] };
    const npc = players.map(() => ({ did: false, missAt: 0 }));
    const rpm = () => Math.floor(60 * 60 * 100 * st.speed / 65536);
    const hit = (i, what) => {
      if (what === "best") { st.speed += st.speed < 1500 ? Math.floor(384 / div) : Math.floor(128 / div); st.progress += Math.floor(st.speed / 55); }
      else if (what === "good") { if (st.speed < 1500) st.speed += Math.floor(256 / div); st.progress += Math.floor(st.speed / 70); }
      else { st.speed = Math.max(MIN_SPEED, st.speed - Math.floor(256 / div)); }
      st.progress = Math.min(MAX_PROGRESS, st.progress);
      st.scores[i][what]++;
      st.flashes.push({ i, what, t: 30 });
      const cur = rpm(); if (cur > st.maxRPM) st.maxRPM = cur;
      if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(what === "miss" ? "se_failure" : "se_select");
    };
    // Where the arrow is against a player's window: 0..255 round, its window RANGE_START + 20 to + 40.
    const at = (i) => { const v = (((st.pos + 0x1800) & 0xffff) >> 8) - RANGE_START[i]; return v; };
    const judge = (i) => { const d = at(i); return d >= 26 && d < 34 ? "best" : d >= 20 && d < 40 ? "good" : "miss"; };
    let pressed = false;
    const onKey = (e) => {
      if (st.done) return;
      if (["z", "Z", " ", "Enter"].includes(e.key)) { e.preventDefault(); if (!e.repeat && !pressed) { pressed = true; hit(0, judge(0)); } }
    };
    const onUp = (e) => { if (["z", "Z", " ", "Enter"].includes(e.key)) pressed = false; };
    const onPoint = (e) => { e.preventDefault(); if (!st.done) hit(0, judge(0)); };
    const draw = () => {
      g.fillStyle = "#283048"; g.fillRect(0, 0, W, H);
      // The blender: its rim, and each player's mark and name.
      g.beginPath(); g.arc(CX, CY, R + 10, 0, Math.PI * 2); g.fillStyle = "#c8c8d0"; g.fill();
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.fillStyle = "#f0e8d8"; g.fill();
      players.forEach((p, i) => {
        const a = ((RANGE_START[i] + 30) / 256) * Math.PI * 2 - Math.PI / 2;
        g.save(); g.translate(CX + Math.cos(a) * (R + 5), CY + Math.sin(a) * (R + 5)); g.rotate(a);
        g.fillStyle = COLOURS[i]; g.beginPath(); g.moveTo(-6, -7); g.lineTo(6, 0); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore();
        g.fillStyle = "#fff"; g.font = "9px monospace"; g.textAlign = "center";
        const nx = CX + Math.cos(a) * (R + 30), ny = CY + Math.sin(a) * (R + 30) + 3;
        g.fillText(p.name, nx, ny);
        const f = st.flashes.find((x) => x.i === i);
        if (f) { g.fillStyle = f.what === "best" ? "#ffd040" : f.what === "good" ? "#60d060" : "#ff6060"; g.fillText(f.what.toUpperCase(), nx, ny + 10); }
      });
      // The arrow.
      const a = (st.pos / 65536) * Math.PI * 2 - Math.PI / 2;
      g.strokeStyle = "#303030"; g.lineWidth = 4; g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(a) * (R - 6), CY + Math.sin(a) * (R - 6)); g.stroke();
      g.fillStyle = "#303030"; g.beginPath(); g.arc(CX, CY, 7, 0, Math.PI * 2); g.fill();
      // What's in: the berries.
      g.fillStyle = "#fff"; g.font = "8px monospace"; g.textAlign = "left";
      g.fillText(players.map((p) => (window.Bag ? window.Bag.name(p.berry) : p.berry)).join("  "), 4, H - 4);
      rpmEl.textContent = (rpm() / 100).toFixed(2) + " RPM";
      bar.style.width = (st.progress / MAX_PROGRESS * 100).toFixed(1) + "%";
    };
    return new Promise((resolve) => {
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onUp);
      canvas.addEventListener("pointerdown", onPoint);
      let countdown = 150;
      const tick = async () => {
        if (countdown > 0) { countdown--; note.textContent = countdown > 100 ? "3" : countdown > 50 ? "2" : "1"; draw(); if (countdown === 0) note.textContent = "GO!"; await nextFrame(); return tick(); }
        st.pos = (st.pos + st.speed) & 0xffff;
        // The others press on their windows, by their odds.
        for (let i = 1; i < n; i++) {
          const d = at(i), inWindow = d > 20 && d < 40;
          if (!inWindow) { npc[i].did = false; continue; }
          if (npc[i].did) continue;
          npc[i].did = true;
          if (players[i].master) { hit(i, "best"); continue; }
          const r = Math.floor(rng() * 100), skill = i === 1 ? [66, 65, 40, 10] : i === 2 ? [66, 65, 40, 10] : [88, 60, 55, 5];
          if (st.speed < 500) hit(i, r > skill[0] ? "best" : "good");
          else if (r > skill[1]) hit(i, "best");
          else if (r > skill[2]) hit(i, "good");
          else if (r < skill[3]) hit(i, "miss");
        }
        st.flashes = st.flashes.filter((f) => --f.t > 0);
        draw();
        if (st.progress >= MAX_PROGRESS) {
          st.done = true;
          note.textContent = "Done!";
          document.removeEventListener("keydown", onKey); document.removeEventListener("keyup", onUp); canvas.removeEventListener("pointerdown", onPoint);
          await new Promise((r) => setTimeout(r, 900));
          resolve({ maxRPM: st.maxRPM, scores: st.scores });
          return;
        }
        await nextFrame();
        return tick();
      };
      tick();
    });
  }

  window.BerryBlender = { run, MIN_SPEED, MAX_PROGRESS };
})();
