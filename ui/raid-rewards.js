// The rewards from a Tera Raid (this game's own; game/raid-dens.js), on a
// FireRed-style screen: a title window with the raid's stars and the Tera
// Raid Pokémon beaten, and a window listing the money and the items won,
// each with its icon and how many, six to a page. A (or B) turns the page,
// and on the last one closes it.
//
//   await RaidRewardsScreen.show({ stars, type, species, level, money, items: [[id, n], ...], caught, frame })
(function () {
  "use strict";

  const W = 240, H = 160;
  const GM = () => window.GBA_MENUS;
  const canvas = document.createElement("canvas");
  canvas.className = "party-menu hidden";
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);
  const out = canvas.getContext("2d");
  const off = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const g = off.getContext("2d");

  const images = {};
  function image(url) {
    if (!url) return null;
    if (!images[url]) { const img = new Image(); img.src = url; images[url] = img; }
    return images[url];
  }
  const ready = (img) => img && img.complete && img.naturalWidth;
  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205], GOLD = [248, 200, 40], GOLD_EDGE = [168, 112, 16];
  const yen = (n) => "¥" + Math.floor(n).toLocaleString("en-US");
  const keys = (f) => window.GbaMenus.keys(f);
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };
  const PER_PAGE = 6;

  // A 7x7 star, its edge darker.
  const STAR = ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "#.....#"];
  function star(s, x, y) {
    STAR.forEach((row, j) => [...row].forEach((c, i) => {
      if (c !== "#") return;
      const edge = j === 0 || i === 0 || i === 6 || j === 6 || STAR[j - 1][i] !== "#";
      s.fill(x + i, y + j, 1, 1, edge ? GOLD_EDGE : GOLD);
    }));
  }

  function paint(opts, page, pages) {
    const s = window.GbaMenus.Surface(), G = GM(), userFrame = "type" + ((opts.frame || 0) + 1);
    // The title: TERA RAID REWARDS, the stars, and who was beaten.
    s.frame("std", G.palettes.std3, 1, 1, 28, 4);
    s.fill(8, 8, 224, 32, WHITE);
    s.text("TERA RAID REWARDS", 12, 9, DARK, LIGHT);
    for (let i = 0; i < opts.stars; i++) star(s, 224 - 9 * (opts.stars - i), 12);
    s.text("Tera " + opts.type + " " + opts.name + " (Lv. " + opts.level + ")" + (opts.caught ? ": caught!" : ""), 12, 25, DARK, LIGHT, "small");
    if (pages > 1) { const p = page + 1 + "/" + pages; s.text(p, 224 - 9 * opts.stars - 6 - s.textWidth(p, "small"), 11, DARK, LIGHT, "small"); }
    // The list, a line each: the money first, then the items.
    s.frame(userFrame, G.frames[userFrame].palette, 1, 7, 28, 12);
    s.fill(8, 56, 224, 96, WHITE);
    const shown = opts.rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
    shown.forEach(([id, n], k) => {
      const y = 58 + 16 * k;
      if (id === "money") {
        s.text("Money", 12, y, DARK, LIGHT);
        const m = yen(n);
        s.text(m, 228 - s.textWidth(m, "small"), y + 2, DARK, LIGHT, "small");
        return;
      }
      s.text(window.Bag.name(id), 30, y, DARK, LIGHT);
      const c = "×" + n;
      s.text(c, 228 - s.textWidth(c, "small"), y + 2, DARK, LIGHT, "small");
    });
    return { layer: s.canvas(), shown };
  }

  function compose(opts, page, pages) {
    g.imageSmoothingEnabled = false;
    // (Behind the windows: a deep Tera purple, checked.)
    g.fillStyle = "#3c2c5c"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#47356c";
    for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? 16 : 0; x < W; x += 32) g.fillRect(x, y, 16, 16);
    const { layer, shown } = paint(opts, page, pages);
    g.drawImage(layer, 0, 0);
    // Each item's icon, cropped to the item and at most 16 pixels, at the start of its line.
    shown.forEach(([id], k) => {
      if (id === "money") return;
      const icon = image(window.Bag.sprite(id)), x = 10, y = 57 + 16 * k;
      if (!ready(icon)) return;
      const box = window.ITEM_SPRITE_BOXES && window.ITEM_SPRITE_BOXES[id];
      const [bx, by, bw, bh] = box || [0, 0, icon.naturalWidth, icon.naturalHeight];
      const sc = Math.min(1, 15 / Math.max(bw, bh)), dw = Math.round(bw * sc), dh = Math.round(bh * sc);
      g.drawImage(icon, bx, by, bw, bh, x + 9 - Math.floor(dw / 2), y + 8 - Math.floor(dh / 2), dw, dh);
    });
    out.imageSmoothingEnabled = false;
    out.drawImage(off, 0, 0, W * 2, H * 2);
  }

  async function show(opts) {
    const rows = [["money", opts.money]].concat(opts.items || []);
    for (const [id] of rows) if (id !== "money") image(window.Bag.sprite(id));
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    canvas.classList.remove("hidden");
    let page = 0, raf = 0;
    const loop = () => { compose(Object.assign({}, opts, { rows }), page, pages); raf = requestAnimationFrame(loop); };
    loop();
    for (;;) {
      await keys((k) => (k === "a" || k === "b" ? true : undefined));
      se("se_select");
      if (++page >= pages) break;
    }
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.RaidRewardsScreen = { show };
})();
