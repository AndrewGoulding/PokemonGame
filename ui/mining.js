// The cave wall you dig with the Explorer Kit (game/mining.js has the rules).
//
//   const found = await MiningScreen.run(sceneElement, Mining.create(...), xpBefore);
//
// The D-pad moves the cursor, A hits, B switches between the Pickaxe and the
// Hammer. Along the top: your mining level with a bar to the next one
// (it fills as you dig: XP for every hit and every treasure), your energy and
// the tool in hand. What you dig up is told in the text box.
// Resolves with the ids of the treasures dug out once every treasure is out or
// your energy runs out.
(function () {
  const W = () => window.Mining.WIDTH, H = () => window.Mining.HEIGHT;
  const pct = (n, of) => (n / of * 100) + "%";

  function run(root, dig, xpBefore) {
    xpBefore = xpBefore | 0;
    let tool = "pick", cx = Math.floor(W() / 2), cy = Math.floor(H() / 2);
    const name = (id) => window.Bag.name(id);

    // The ground under the rock: bare earth, and each treasure's picture in
    // one piece over the tiles it's buried under (its whole shape's box),
    // cropped to the item itself (data/item-sprites.js ITEM_SPRITE_BOXES).
    const under = [];
    for (let i = 0; i < W() * H(); i++) under.push('<div class="dig-ground"></div>');
    const pictures = dig.treasures.map((t) => {
      const [bx, by, bw, bh, iw, ih] = (window.ITEM_SPRITE_BOXES || {})[t.item] || [0, 0, 1, 1, 1, 1];
      const pos = (b, bs, is) => (is - bs > 0 ? b / (is - bs) * 100 : 0);
      return '<div class="dig-treasure" style="left:' + pct(t.x, W()) + ";top:" + pct(t.y, H()) + ";width:" + pct(t.w, W()) +
        ";height:" + pct(t.h, H()) + ";background-image:url(" + window.Bag.sprite(t.item) + ");background-size:" +
        (iw / bw * 100) + "% " + (ih / bh * 100) + "%;background-position:" + pos(bx, bw, iw) + "% " + pos(by, bh, ih) + '%"></div>';
    });
    const rock = [];
    for (let i = 0; i < W() * H(); i++) rock.push('<button type="button" class="dig-rock" data-i="' + i + '" aria-label="Dig"></button>');

    root.innerHTML = '<div class="dig">' +
      '<div class="dig-top">' +
        '<span class="dig-label dig-level"></span><div class="dig-bar xp" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label dig-xp"></span>' +
        '<span class="dig-tool"></span>' +
        '<span class="dig-label">Energy</span><div class="dig-bar energy" aria-hidden="true"><div class="dig-fill"></div></div>' +
        '<span class="dig-label dig-energy"></span>' +
      "</div>" +
      '<div class="dig-board" style="aspect-ratio:' + W() + "/" + H() + '">' +
        '<div class="dig-layer under" style="grid-template-columns:repeat(' + W() + ',1fr)">' + under.join("") + "</div>" +
        pictures.join("") +
        '<div class="dig-layer over" style="grid-template-columns:repeat(' + W() + ',1fr)">' + rock.join("") + "</div>" +
      "</div>" +
    "</div>";
    const board = root.querySelector(".dig-board");
    const tiles = [...root.querySelectorAll(".dig-rock")];
    // Messages go in the text box, which covers the bottom of the board: each
    // goes away again after a moment.
    let clearAt = null;
    const say = (text, ms) => {
      window.Screen.say(text);
      clearTimeout(clearAt);
      if (ms) clearAt = setTimeout(() => window.Screen.say(""), ms);
    };

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
      root.querySelector(".dig-tool").textContent = tool === "pick" ? "⛏ Pickaxe" : "🔨 Hammer";
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
        if (r.found.length) say("You dug up " + r.found.map((id) => "a " + name(id)).join(" and ") + "!", 1600);
        if (dig.over) end();
      }
      function end() {
        finished = true;
        document.removeEventListener("keydown", onKey);
        say(dig.tired ? "You're out of energy!" : "Everything was dug up!");
        setTimeout(() => resolve(window.Mining.found(dig)), 900);
      }
      say("D-pad to aim, A to dig, B to switch tools. The Hammer digs wider but uses twice the energy.", 3000);
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
    });
  }

  window.MiningScreen = { run };
})();
