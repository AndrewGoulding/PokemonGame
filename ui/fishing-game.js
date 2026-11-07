// The reeling game's screen (game/fishing-game.js has the rules): the water seen from the side, your line down into
// it and the hooked Pokémon's dark shape fighting at its end (its own picture, darkened), as high or low as the fish
// is in the reel bar; the reel bar down the right (your green catch zone, the fish, a treasure chest when one
// drifts in), the catch meter beside it, your fishing level along the top, and what's just happened in the middle.
// Hold A (or the screen) to reel; B lets it go.
//
//   const g = await FishingGameScreen.run(sceneElement, FishingGame.create(...), { species, level, xp })
(function () {
  const F = () => window.FishingGame;
  const W = 240, H = 160, BAR = { x: 198, y: 18, w: 16, h: 130 }, METER = { x: 220, y: 18, w: 8, h: 130 };

  function run(root, game, o) {
    o = o || {};
    root.innerHTML = '<div class="dig fish-game"><canvas class="fish-board" width="' + W + '" height="' + H + '"></canvas></div>';
    const canvas = root.querySelector(".fish-board"), g = canvas.getContext("2d");
    canvas.style.width = "100%"; canvas.style.imageRendering = "pixelated";
    g.imageSmoothingEnabled = false;
    // (its shape: its own picture, made dark as a shadow in the water)
    let shadow = null;
    const id = o.species && window.DEX && window.DEX[o.species] && window.DEX[o.species].id;
    if (id) {
      const pic = new Image();
      pic.onload = () => {
        const c = document.createElement("canvas"); c.width = pic.width; c.height = pic.height;
        const x = c.getContext("2d"); x.drawImage(pic, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "rgba(8,20,40,0.85)"; x.fillRect(0, 0, c.width, c.height);
        shadow = c;
      };
      pic.src = "assets/sprites/pokemon/" + id + ".png";
    }
    let flash = null;
    const yOf = (v, box) => box.y + box.h - v * box.h;   // (0 the bar's bottom, 1 its top)

    function draw() {
      // (the sky, the water, its ripples)
      const sky = g.createLinearGradient(0, 0, 0, 30); sky.addColorStop(0, "#1c2a5a"); sky.addColorStop(1, "#3c5a96");
      g.fillStyle = sky; g.fillRect(0, 0, W, 30);
      const sea = g.createLinearGradient(0, 30, 0, H); sea.addColorStop(0, "#2a6eb0"); sea.addColorStop(1, "#0c2448");
      g.fillStyle = sea; g.fillRect(0, 30, W, H - 30);
      g.fillStyle = "rgba(200,230,255,0.35)";
      for (let k = 0; k < 14; k++) { const x = (k * 37 + game.frame * 0.4) % (W + 20) - 20; g.fillRect(x, 30 + (k % 3) * 2, 10, 1); }
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let k = 0; k < 8; k++) g.fillRect(0, 40 + k * 16 + Math.sin((game.frame + k * 20) / 30) * 2, W - 50, 1);
      // (the hooked Pokémon, as deep as the fish is low in the bar, and your line down to it)
      const fx = 92 + Math.sin(game.frame / 17) * 18, fy = 40 + (1 - game.fish.y) * 104;
      g.strokeStyle = "rgba(240,240,240,0.8)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(40, 30, fx, fy); g.stroke();
      if (shadow) { const s = Math.min(1, 56 / shadow.height); g.drawImage(shadow, fx - shadow.width * s / 2, fy - shadow.height * s / 2, shadow.width * s, shadow.height * s); }
      else { g.fillStyle = "rgba(8,20,40,0.85)"; g.beginPath(); g.ellipse(fx, fy, 16, 8, 0, 0, Math.PI * 2); g.fill(); }
      // (the reel bar: its frame, your zone, the treasure, the fish)
      g.fillStyle = "#1d150d"; g.fillRect(BAR.x - 3, BAR.y - 3, BAR.w + 6, BAR.h + 6);
      g.fillStyle = "#e9dcb4"; g.fillRect(BAR.x - 1, BAR.y - 1, BAR.w + 2, BAR.h + 2);
      g.fillStyle = "#3d6a8c"; g.fillRect(BAR.x, BAR.y, BAR.w, BAR.h);
      const hooked = F().inZone(game, game.fish.y);
      const z = game.zone, zt = yOf(z.y + z.size, BAR), zh = z.size * BAR.h;
      g.fillStyle = hooked ? "#8ee05a" : "#5aa83a"; g.fillRect(BAR.x, zt, BAR.w, zh);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(BAR.x, zt, BAR.w, 2);
      const t = game.treasure;
      if (t && t.shown && !t.got && !t.gone) {
        const ty = yOf(t.y, BAR);
        g.fillStyle = "#1d150d"; g.fillRect(BAR.x + 3, ty - 5, 10, 9);
        g.fillStyle = "#c8902e"; g.fillRect(BAR.x + 4, ty - 4, 8, 7); g.fillStyle = "#f2d060"; g.fillRect(BAR.x + 4, ty - 1, 8, 1); g.fillRect(BAR.x + 7, ty - 2, 2, 3);
        g.fillStyle = "#f2d060"; g.fillRect(BAR.x - 6, ty + 5 - Math.round(t.progress * 10), 2, Math.round(t.progress * 10));
      }
      const fy2 = yOf(game.fish.y, BAR) + (game.fish.dart ? Math.round(Math.sin(game.frame) * 1) : 0);
      g.fillStyle = "#1d150d"; g.beginPath(); g.ellipse(BAR.x + 8, fy2, 6, 4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f2a24a"; g.beginPath(); g.ellipse(BAR.x + 8, fy2, 5, 3, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(BAR.x + 12, fy2); g.lineTo(BAR.x + 16, fy2 - 3); g.lineTo(BAR.x + 16, fy2 + 3); g.closePath(); g.fill();
      g.fillStyle = "#1d150d"; g.fillRect(BAR.x + 5, fy2 - 1, 1, 1);
      // (the catch meter: its colour going from red to green as it fills)
      g.fillStyle = "#1d150d"; g.fillRect(METER.x - 2, METER.y - 2, METER.w + 4, METER.h + 4);
      g.fillStyle = "#4a3a2a"; g.fillRect(METER.x, METER.y, METER.w, METER.h);
      const m = game.meter, mh = Math.round(m * METER.h);
      g.fillStyle = m > 0.66 ? "#8ee05a" : m > 0.33 ? "#f2d060" : "#e8584a"; g.fillRect(METER.x, METER.y + METER.h - mh, METER.w, mh);
      // (along the top: your fishing level; the fight it's putting up)
      g.font = "bold 9px sans-serif"; g.textBaseline = "top"; g.textAlign = "left";
      const label = (text, x, y, c) => { g.lineWidth = 3; g.strokeStyle = "#1d150d"; g.strokeText(text, x, y); g.fillStyle = c; g.fillText(text, x, y); };
      label("Fishing Lv." + (o.level || 1), 4, 3, "#fff3a8");
      label("Fight " + "★".repeat(game.fight) + "☆".repeat(5 - game.fight), 4, 14, "#ffd0a0");
      label(game.perfect ? "Perfect!" : "", 132, 3, "#a8f07a");
      label("Hold A to reel", 4, H - 12, "rgba(255,255,255,0.8)");
      if (flash && flash.t > 0) {
        g.font = "bold 12px sans-serif"; g.textAlign = "center"; g.lineWidth = 3; g.strokeStyle = "#1d150d";
        g.strokeText(flash.text, 96, 66); g.fillStyle = flash.colour; g.fillText(flash.text, 96, 66);
      }
    }

    return new Promise((resolve) => {
      let reel = false, quit = false, last = 0, acc = 0, done = false;
      const A = ["z", "Z", " ", "Enter"], B = ["x", "X", "Escape", "Backspace"];
      const onKey = (e) => { if (A.includes(e.key)) reel = true; else if (B.includes(e.key)) quit = true; else return; e.preventDefault(); };
      const onUp = (e) => { if (A.includes(e.key)) reel = false; };
      const down = (e) => { e.preventDefault(); reel = true; }, up = () => { reel = false; };
      document.addEventListener("keydown", onKey); document.addEventListener("keyup", onUp);
      canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointerleave", up);
      const se = (s) => { if (window.GameAudio) window.GameAudio.se(s); };
      let tick = 0;
      function frame(now) {
        if (done) return;
        acc += Math.min(100, now - (last || now)); last = now;
        while (acc >= 1000 / 60 && !game.over) {
          acc -= 1000 / 60;
          F().step(game, { reel, quit });
          if (flash) flash.t--;
          if (reel && ++tick % 8 === 0) se("se_ball_tray_ball");   // (the reel's click)
          for (const ev of game.events) {
            if (ev.type === "treasure") { se("se_pin"); flash = { t: 50, text: "Treasure!", colour: "#f2d060" }; }
            else if (ev.type === "treasure-got") {
              se("se_shiny");
              const name = window.Bag && window.Bag.name ? window.Bag.name(ev.item) : ev.item;
              flash = { t: 70, text: "Got " + (/^[aeiou]/i.test(name) ? "an " : "a ") + name + "!", colour: "#f2d060" };
            }
            else if (ev.type === "treasure-gone") flash = { t: 40, text: "It sank…", colour: "#e8e8e8" };
            else if (ev.type === "landed") { se("se_m_swagger"); flash = { t: 60, text: game.perfect ? "Perfect catch!" : "Landed!", colour: "#a8f07a" }; }
            else if (ev.type === "escaped") { se("se_failure"); flash = { t: 60, text: "It got away…", colour: "#ff8a7a" }; }
          }
        }
        draw();
        if (game.over) {
          done = true;
          document.removeEventListener("keydown", onKey); document.removeEventListener("keyup", onUp);
          canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointerleave", up);
          setTimeout(() => resolve(game), game.over === "quit" ? 0 : 900);
          return;
        }
        requestAnimationFrame(frame);
      }
      draw();
      requestAnimationFrame(frame);
    });
  }
  window.FishingGameScreen = { run, message: (t) => window.MiningScreen.message(t), clear: () => window.MiningScreen.clear() };
})();
