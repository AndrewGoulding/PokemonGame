// The berry tree you shake with the Berry Pouch (game/berry-picking.js has the rules).
//
//   const result = await BerryPickingScreen.run(sceneElement, BerryPicking.create(...), xpBefore);
//
// A shakes the tree (time it to the meter's sweet spot); left and right move
// you and your basket along the bottom. Along the top: your farming level
// with a bar to the next one, the time left, and your score and combo. The
// tree is drawn here (a trunk and a leafy crown that sways when shaken),
// and you're your overworld sprite with a basket over your head. Resolves
// with the game once time's up and the last berries are down.
(function () {
  const B = () => window.BerryPicking;
  const pct = (n, of) => (n / of * 100) + "%";
  const COLOURS = {
    ripe: ["#8a3fb8", "#c58be8", "#3d1656"],
    green: ["#5fae3c", "#a9e07f", "#24501a"],
    gold: ["#f2c230", "#fff3a8", "#7a5a08"]
  };
  const SHAKE_SE = { perfect: "se_m_cut", good: "se_m_cut", bad: "se_m_cut", over: "se_failure" };

  function run(root, game, xpBefore, look) {
    xpBefore = xpBefore | 0;
    const { W, H } = B();
    root.innerHTML = '<div class="dig berry-pick">' +
      '<div class="dig-top">' +
        '<span class="dig-label dig-level"></span><div class="dig-bar xp" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label dig-xp"></span>' +
        '<span class="dig-tool berry-score"></span>' +
        '<span class="dig-label">Time</span><div class="dig-bar energy" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label berry-time"></span>' +
      "</div>" +
      '<canvas class="berry-board" width="' + W + '" height="' + H + '"></canvas>' +
    "</div>";
    const canvas = root.querySelector(".berry-board"), g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    const sprite = new Image();
    sprite.src = "assets/world/sprites/player_" + (look || "custom") + ".png";
    // A few berries left hanging in the crown, for the look of it.
    const hanging = [];
    for (let i = 0; i < 14; i++) hanging.push([B().CANOPY.x0 + 8 + Math.random() * (B().CANOPY.x1 - B().CANOPY.x0 - 16),
      B().CANOPY.y0 + 6 + Math.random() * (B().CANOPY.y1 - B().CANOPY.y0 - 8), Math.random() < 0.6 ? "ripe" : "green"]);
    let flash = null;   // { text, colour, t } over the tree for a moment

    function hud() {
      const p = B().progress(xpBefore);
      root.querySelector(".dig-level").textContent = "Farming Lv. " + p.level;
      root.querySelector(".xp .dig-fill").style.width = p.need ? pct(p.into, p.need) : "100%";
      root.querySelector(".dig-xp").textContent = p.need ? p.into + " / " + p.need + " XP" : "Max";
      const time = root.querySelector(".energy .dig-fill");
      time.style.width = pct(game.left, game.total);
      time.classList.toggle("low", game.left <= game.total / 4);
      root.querySelector(".berry-time").textContent = Math.ceil(game.left / 60) + "s";
      root.querySelector(".berry-score").textContent = "Score " + game.score + (game.combo > 1 ? "  ×" + game.combo : "");
    }

    function berry(x, y, kind, r) {
      const [body, shine, edge] = COLOURS[kind];
      g.fillStyle = edge; g.beginPath(); g.arc(x, y, r + 1, 0, Math.PI * 2); g.fill();
      g.fillStyle = body; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = shine; g.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), 2, 2);
      if (kind === "gold") { g.fillStyle = "#fff"; g.fillRect(Math.round(x + r), Math.round(y - r - 2), 1, 3); g.fillRect(Math.round(x + r - 1), Math.round(y - r - 1), 3, 1); }
      g.fillStyle = "#2e5b1e"; g.fillRect(Math.round(x), Math.round(y - r - 2), 1, 2);
    }

    function draw() {
      const sway = Math.sin(game.t / 3) * game.sway * 3 * game.swayDir;
      // Sky, hills and grass.
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#8fd3ff"); sky.addColorStop(1, "#d9f2ff");
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = "#7cc36a"; g.beginPath(); g.ellipse(40, 132, 90, 30, 0, 0, Math.PI * 2); g.ellipse(210, 136, 80, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#5daa4a"; g.fillRect(0, 130, W, H - 130);
      g.fillStyle = "#4e9a3e"; for (let x = 4; x < W; x += 12) g.fillRect(x, 132 + (x % 5), 2, 3);
      // The trunk, then the crown (swaying), with berries in it.
      g.fillStyle = "#6b4423"; g.fillRect(110, 60, 20, 74);
      g.fillStyle = "#57361b"; g.fillRect(124, 60, 6, 74); g.fillRect(104, 128, 32, 6);
      const blobs = [[120, 34, 40], [86, 46, 28], [154, 46, 28], [100, 26, 24], [140, 26, 24], [120, 56, 30]];
      g.fillStyle = "#2f7a32";
      for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x + sway, y + 2, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#3f9a3d";
      for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x + sway - 2, y - 1, r - 4, 0, Math.PI * 2); g.fill(); }
      for (const [x, y, k] of hanging) berry(x + sway, y, k, 2.5);
      // Falling berries (those still waiting to drop sit in the crown).
      for (const b of game.berries) berry(b.x + (b.wait > 0 ? sway : 0), b.y, b.kind, b.kind === "gold" ? 3.5 : 3);
      // You, with the basket over your head.
      const x = Math.round(game.x);
      if (sprite.complete && sprite.naturalWidth) {
        // (Facing the tree; walking left or right, a stride every 8 frames: the walking sheet's frames.)
        const f = game.facing === "up" ? 1 : Math.floor(game.t / 8) % 2 ? 7 + (Math.floor(game.t / 16) % 2) : 2;
        g.save();
        // (The sprite's head starts 11 rows down: the basket sits on it.)
        const y = B().CATCH_Y - 7;
        if (game.facing === "right") { g.translate(x + 8, 0); g.scale(-1, 1); g.drawImage(sprite, f * 16, 0, 16, 32, 0, y, 16, 32); }
        else g.drawImage(sprite, f * 16, 0, 16, 32, x - 8, y, 16, 32);
        g.restore();
      }
      const top = B().CATCH_Y, half = B().BASKET_HALF;
      g.fillStyle = "#5a3a1a"; g.fillRect(x - half - 1, top - 1, half * 2 + 2, 8);
      g.fillStyle = "#c08a4a"; g.fillRect(x - half, top, half * 2, 6);
      g.fillStyle = "#9c6a33"; for (let i = x - half + 2; i < x + half; i += 4) g.fillRect(i, top + 1, 2, 5);
      // The shake meter: the sweet spot, the zone around it, and the cursor.
      const mx = 40, mw = 160, my = 4, mh = 7;
      g.fillStyle = "#1d150d"; g.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
      g.fillStyle = game.sway > 0.45 ? "#7a4b4b" : "#d65a4a"; g.fillRect(mx, my, mw, mh);
      // (The zones kept inside the bar, so its black edge stays when one's at an end.)
      const zone = (half, colour) => {
        const x0 = Math.max(0, game.sweet - half), x1 = Math.min(1, game.sweet + half);
        g.fillStyle = colour; g.fillRect(mx + x0 * mw, my, (x1 - x0) * mw, mh);
      };
      zone(B().NEAR, "#f2c230");
      zone(B().SWEET, "#6cc24a");
      const cx = mx + B().meterAt(game.t) * mw;
      g.fillStyle = "#fff"; g.fillRect(Math.round(cx) - 1, my - 3, 3, mh + 6);
      g.fillStyle = "#1d150d"; g.fillRect(Math.round(cx), my - 2, 1, mh + 4);
      if (flash && flash.t > 0) {
        g.font = "bold 10px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 3; g.strokeStyle = "#1d150d"; g.strokeText(flash.text, W / 2, 20);
        g.fillStyle = flash.colour; g.fillText(flash.text, W / 2, 20);
      }
    }

    return new Promise((resolve) => {
      const held = new Set();
      let shakePressed = false, last = 0, acc = 0, done = false;
      const LEFT = ["ArrowLeft", "a", "A"], RIGHT = ["ArrowRight", "d", "D"], SHAKE = ["z", "Z", " ", "Enter"];
      function onKey(e) {
        if (LEFT.includes(e.key)) held.add("left");
        else if (RIGHT.includes(e.key)) held.add("right");
        else if (SHAKE.includes(e.key)) { if (!e.repeat) shakePressed = true; }
        else return;
        e.preventDefault();
      }
      function onUp(e) {
        if (LEFT.includes(e.key)) held.delete("left");
        if (RIGHT.includes(e.key)) held.delete("right");
      }
      // Tapping the tree shakes it; tapping either side of the ground moves you.
      function onPoint(e) {
        e.preventDefault();
        const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
        if (y < 110) shakePressed = true;
        else held.add(x < game.x ? "left" : "right");
      }
      const release = () => { held.delete("left"); held.delete("right"); };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onUp);
      canvas.addEventListener("pointerdown", onPoint);
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointerleave", release);
      const se = (id) => { if (window.GameAudio) window.GameAudio.se(id); };

      function frame(now) {
        if (done) return;
        acc += Math.min(100, now - (last || now));
        last = now;
        while (acc >= 1000 / 60 && !game.over) {
          acc -= 1000 / 60;
          B().step(game, { left: held.has("left"), right: held.has("right"), shake: shakePressed });
          shakePressed = false;
          if (flash) flash.t--;
          for (const ev of game.events) {
            if (ev.type === "shake") {
              se(SHAKE_SE[ev.quality]);
              flash = { t: 40, text: { perfect: "Perfect shake!" + (ev.bonus ? " +" + Math.max(1, Math.round(ev.bonus / 60)) + "s" : ""), good: "Good shake!", bad: "Unripe…", over: "Too rough!" }[ev.quality],
                colour: { perfect: "#a8f07a", good: "#f2e27a", bad: "#e8e8e8", over: "#ff8a7a" }[ev.quality] };
            } else if (ev.type === "catch") {
              se(ev.kind === "green" ? "se_failure" : ev.kind === "gold" ? "se_shiny" : "se_bag_cursor");
              if (ev.kind !== "green" && ev.combo >= 3) flash = { t: 30, text: "Combo ×" + ev.combo + "!", colour: "#fff3a8" };
            }
          }
        }
        draw();
        hud();
        if (game.over) {
          done = true;
          document.removeEventListener("keydown", onKey);
          document.removeEventListener("keyup", onUp);
          canvas.removeEventListener("pointerdown", onPoint);
          canvas.removeEventListener("pointerup", release);
          canvas.removeEventListener("pointerleave", release);
          setTimeout(() => resolve(game), 600);
          return;
        }
        requestAnimationFrame(frame);
      }
      draw(); hud();
      requestAnimationFrame(frame);
    });
  }

  window.BerryPickingScreen = { run, message: (t) => window.MiningScreen.message(t), clear: () => window.MiningScreen.clear() };
})();
