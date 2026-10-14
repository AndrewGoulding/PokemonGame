// The cave wall you dig with the Explorer Kit (game/mining.js has the rules).
//
//   const found = await MiningScreen.run(sceneElement, Mining.create(...), xpBefore);
//
// Tap or click a tile to hit it; the Pickaxe and Hammer buttons switch tools.
// On a keyboard: arrows move the cursor, Z / Space / Enter hit, X / B / Shift
// switch tools. Along the top: your mining level with a bar to the next one
// (it fills as you dig: XP for every hit and every treasure), and your energy.
// Resolves with the ids of the treasures dug out once every treasure is out or
// your energy runs out.
(function () {
  const W = () => window.Mining.WIDTH, H = () => window.Mining.HEIGHT;
  const pct = (n, of) => (n / of * 100) + "%";

  function run(root, dig, xpBefore) {
    xpBefore = xpBefore | 0;
    let tool = "pick", cx = Math.floor(W() / 2), cy = Math.floor(H() / 2);
    const name = (id) => window.Bag.name(id);

    // The ground under the rock: each tile of a treasure shows its part of the
    // treasure's picture; the rest is bare earth.
    const under = [];
    for (let y = 0; y < H(); y++) for (let x = 0; x < W(); x++) {
      const t = dig.treasures.find((tr) => tr.cells.some(([a, b]) => a === x && b === y));
      if (!t) { under.push('<div class="dig-ground"></div>'); continue; }
      const sx = x - t.x, sy = y - t.y;
      under.push('<div class="dig-ground treasure" style="background-image:url(' + window.Bag.sprite(t.item) + ");" +
        "background-size:" + (t.w * 100) + "% " + (t.h * 100) + "%;" +
        "background-position:" + (t.w > 1 ? sx / (t.w - 1) * 100 : 0) + "% " + (t.h > 1 ? sy / (t.h - 1) * 100 : 0) + '%"></div>');
    }
    const rock = [];
    for (let i = 0; i < W() * H(); i++) rock.push('<button type="button" class="dig-rock" data-i="' + i + '" aria-label="Dig"></button>');

    root.innerHTML = '<div class="dig">' +
      '<div class="dig-top">' +
        '<span class="dig-label dig-level"></span><div class="dig-bar xp" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label dig-xp"></span>' +
        '<span class="dig-label">Energy</span><div class="dig-bar energy" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label dig-energy"></span>' +
      "</div>" +
      '<div class="dig-board" style="aspect-ratio:' + W() + "/" + H() + '">' +
        '<div class="dig-layer under" style="grid-template-columns:repeat(' + W() + ',1fr)">' + under.join("") + "</div>" +
        '<div class="dig-layer over" style="grid-template-columns:repeat(' + W() + ',1fr)">' + rock.join("") + "</div>" +
      "</div>" +
      '<div class="dig-tools">' +
        '<button type="button" class="dig-tool" data-tool="pick">⛏ Pickaxe</button>' +
        '<button type="button" class="dig-tool" data-tool="hammer">🔨 Hammer</button>' +
      "</div>" +
      '<p class="dig-status" aria-live="polite">Dig out the buried treasure before you run out of energy!</p>' +
    "</div>";
    const board = root.querySelector(".dig-board");
    const tiles = [...root.querySelectorAll(".dig-rock")];
    const status = root.querySelector(".dig-status");

    function draw() {
      tiles.forEach((el, i) => {
        el.className = "dig-rock" + (dig.bedrock[i] ? " bedrock" : " l" + dig.rock[i]) + (i === cy * W() + cx ? " cursor" : "");
      });
      const p = window.Mining.progress(xpBefore + dig.xp);
      root.querySelector(".dig-level").textContent = "Mining Lv. " + p.level;
      root.querySelector(".xp .dig-fill").style.width = p.need ? pct(p.into, p.need) : "100%";
      root.querySelector(".dig-xp").textContent = p.need ? p.into + " / " + p.need + " XP" : "Max";
      const energy = root.querySelector(".energy .dig-fill");
      energy.style.width = pct(dig.energy, dig.maxEnergy);
      energy.classList.toggle("low", dig.energy <= dig.maxEnergy / 4);
      root.querySelector(".dig-energy").textContent = dig.energy + " / " + dig.maxEnergy;
      for (const b of root.querySelectorAll(".dig-tool")) {
        b.classList.toggle("on", b.dataset.tool === tool);
        b.setAttribute("aria-pressed", String(b.dataset.tool === tool));
      }
    }
    draw();

    return new Promise((resolve) => {
      let finished = false;
      function strike(x, y) {
        if (finished) return;
        cx = x; cy = y;
        const r = window.Mining.hit(dig, x, y, tool);
        draw();
        board.classList.remove("shake", "shake-hard");
        void board.offsetWidth;   // restart the animation
        board.classList.add(tool === "hammer" ? "shake-hard" : "shake");
        if (r.found.length) status.textContent = "You found " + r.found.map((id) => "a " + name(id)).join(" and ") + "!";
        if (dig.over) end();
      }
      function end() {
        finished = true;
        document.removeEventListener("keydown", onKey);
        status.textContent = dig.tired ? "You're out of energy!" : "Everything was dug up!";
        setTimeout(() => resolve(window.Mining.found(dig)), 900);
      }
      function onKey(e) {
        const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
        if (d) {
          cx = Math.max(0, Math.min(W() - 1, cx + d[0]));
          cy = Math.max(0, Math.min(H() - 1, cy + d[1]));
          draw();
        } else if (["z", "Z", " ", "Enter"].includes(e.key)) strike(cx, cy);
        else if (["x", "X", "b", "B", "Shift"].includes(e.key)) { tool = tool === "pick" ? "hammer" : "pick"; draw(); }
        else return;
        e.preventDefault();
      }
      document.addEventListener("keydown", onKey);
      tiles.forEach((el, i) => el.addEventListener("click", () => strike(i % W(), Math.floor(i / W()))));
      for (const b of root.querySelectorAll(".dig-tool")) b.addEventListener("click", () => { tool = b.dataset.tool; draw(); });
    });
  }

  window.MiningScreen = { run };
})();
