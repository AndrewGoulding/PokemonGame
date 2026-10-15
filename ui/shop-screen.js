// FireRed's Poké Mart buy screen (src/shop.c), drawn the way the game draws
// it at 240x160 (assets/shop/, tools/build-shop.js): the stock on the paper on
// the right with prices, your money at the top left, the map around you (as it
// was) below it, and the item's icon and description in the blue panel.
//
//   await ShopScreen.open({
//     items,    // [{ id, name, price, desc, icon }]
//     money,    // () => your money
//     inBag,    // (id) => how many you have
//     limit,    // (id) => most you may buy at once (TMs: 1), or 0 with a reason: { max, why }
//     buy,      // (id, n) => error message or null (it's bought), then maybe a second message
//     frame,    // the Option screen's FRAME (0-9)
//     map       // the overworld canvas and where the tile you face is on it: { canvas, x, y }
//   })
//   ShopScreen.close()
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
  const mapCopy = Object.assign(document.createElement("canvas"), { width: W, height: H });

  const images = {};
  function image(url) {
    if (!url) return null;
    if (!images[url]) { const img = new Image(); img.src = url; images[url] = img; }
    return images[url];
  }
  ["assets/shop/shop.png", "assets/shop/shop-dim.png", "assets/bag/arrows.png", "assets/bag/return-arrow.png", "assets/text/message-box.png"].forEach(image);
  const ready = (img) => img && img.complete && img.naturalWidth;

  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];
  const yen = (n) => "¥" + n;

  let st = null, raf = 0;
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };
  const keys = (f) => window.GbaMenus.keys(f);
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  const entries = () => st.items.concat([null]);   // (null: Cancel)
  function wrap(s, text, width) {
    const w = (t) => s.textWidth(t), lines = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (line && w(next) > width) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
    }
    return lines;
  }

  function paint() {
    const s = window.GbaMenus.Surface(), G = GM(), userFrame = "type" + ((st.frame || 0) + 1);
    const items = entries(), shown = Math.min(items.length, 6), busy = !!st.message;
    // MONEY (window 0: 1, 1, 8 x 3, the thin frame).
    s.frame("std", G.palettes.std3, 1, 1, 8, 3);
    s.fill(8, 8, 64, 24, WHITE);
    s.text("Money", 8, 8, DARK, LIGHT);
    const m = yen(st.opts.money());
    s.text(m, 72 - s.textWidth(m, "small"), 20, DARK, LIGHT, "small");
    // The list (window 4 at 88, 8): names at 97, prices right-aligned to 221.
    for (let r = 0; r < shown; r++) {
      const it = items[st.top + r], y = 10 + 16 * r;
      s.text(it ? it.name : "Cancel", 97, y, DARK, LIGHT);
      if (it) { const p = yen(it.price); s.text(p, 222 - s.textWidth(p, "small"), y, DARK, LIGHT, "small"); }
      if (st.top + r === st.cursor) s.text("▶", 89, y, busy ? LIGHT : DARK, busy ? DARK : LIGHT);
    }
    const cur = items[st.cursor];
    if (!busy) {
      // The description (window 5: 40, 112), white on the panel.
      wrap(s, cur ? cur.desc : "Quit shopping.", 196).slice(0, 3)
        .forEach((l, i) => s.text(l, 40, 115 + 15 * i, WHITE, DARK));
    }
    if (st.qty) {
      // IN BAG (window 1: 1, 11, 13 x 2) and ×NN with the price (window 3: 17, 9, 12 x 4).
      s.frame("std", G.palettes.std3, 1, 11, 13, 2);
      s.fill(8, 88, 104, 16, WHITE);
      const w = s.text("In bag:", 8, 90, DARK, LIGHT);
      s.text(" " + String(st.qty.have).padStart(3, " "), 8 + w, 92, DARK, LIGHT, "small");
      s.frame(userFrame, G.frames[userFrame].palette, 17, 9, 12, 4);
      s.fill(136, 72, 96, 32, WHITE);
      s.text("×" + String(st.qty.n).padStart(2, "0"), 138, 82, DARK, LIGHT, "small");
      const p = yen(st.qty.n * st.qty.price);
      s.text(p, 228 - s.textWidth(p, "small"), 82, DARK, LIGHT, "small");
    }
    st.layer = s.canvas();
  }

  function compose() {
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    // The map around you, as it was (x 0-79: the facing tile at 32, 64).
    g.drawImage(mapCopy, 0, 0, 80, 112, 0, 0, 80, 112);
    if (ready(image("assets/shop/shop.png"))) g.drawImage(image("assets/shop/shop.png"), 0, 0);
    if (st.message && ready(image("assets/shop/shop-dim.png"))) g.drawImage(image("assets/shop/shop-dim.png"), 0, 112);
    // The item's icon, centred on (24, 140).
    const cur = entries()[st.cursor];
    if (!st.message) {
      const icon = cur ? image(cur.icon) : image("assets/bag/return-arrow.png");
      if (ready(icon)) {
        const box = cur && window.ITEM_SPRITE_BOXES && window.ITEM_SPRITE_BOXES[cur.id];
        if (box) {
          const [bx, by, bw, bh] = box, sc = Math.min(1, 24 / Math.max(bw, bh));
          const dw = Math.round(bw * sc), dh = Math.round(bh * sc);
          g.drawImage(icon, bx, by, bw, bh, 24 - Math.floor(dw / 2), 140 - Math.floor(dh / 2), dw, dh);
        } else g.drawImage(icon, 12, 128, 24, 24);
      }
    }
    // Scroll arrows (160, 8) and (160, 104), bobbing; the quantity's (152, 72 / 104).
    const arrows = image("assets/bag/arrows.png");
    if (ready(arrows)) {
      const bob = Math.trunc(Math.sin(((st.tick * 8) & 255) / 256 * 2 * Math.PI) * 2);
      const up = (x, y) => g.drawImage(arrows, 0, 16, 16, 16, x - 8, y - 8 - bob, 16, 16);
      const down = (x, y) => { g.save(); g.translate(x - 8, y + 8 + bob); g.scale(1, -1); g.drawImage(arrows, 0, 16, 16, 16, 0, 0, 16, 16); g.restore(); };
      if (!st.message) {
        if (st.top > 0) up(160, 8);
        if (st.top + 6 < entries().length) down(160, 104);
      }
      if (st.qty && st.qty.max > 1) { up(152, 72); down(152, 104); }
    }
    if (st.layer) g.drawImage(st.layer, 0, 0);
    // The message box (window 2), the text typed out.
    if (st.message) {
      if (ready(image("assets/text/message-box.png"))) g.drawImage(image("assets/text/message-box.png"), 0, 112);
      const t = window.GbaMenus.Surface();
      st.message.text.slice(0, st.message.shown).split("\n").forEach((l, i) => t.text(l, 16, 121 + 15 * i, DARK, LIGHT));
      g.drawImage(t.canvas(), 0, 0);
    }
    if (st.fade) { g.fillStyle = "rgba(0,0,0," + st.fade + ")"; g.fillRect(0, 0, W, H); }
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    out.restore();
  }
  function loop() {
    if (!st) return;
    st.tick++;
    if (st.message && st.message.shown < st.message.text.length) st.message.shown++;
    compose();
    raf = requestAnimationFrame(loop);
  }

  // Prints `text` and resolves once it's all shown (no waiting for a key).
  async function print(text) {
    st.message = { text, shown: 0 };
    paint();
    while (st.message.shown < text.length) await nextFrame();
  }
  const waitKey = () => keys((k) => (k === "a" || k === "b" ? (se("se_select"), true) : undefined));
  async function message(text) { await print(text); await waitKey(); }
  function endMessage() { st.message = null; st.qty = null; paint(); }

  async function fade(from, to) {
    for (let i = 1; i <= 8; i++) { st.fade = from + (to - from) * i / 8; await nextFrame(); }
    st.fade = to;
  }

  // How many: up / down 1 (round the ends), right / left 10.
  function howMany(it, max) {
    st.qty = { n: 1, max, price: it.price, have: st.opts.inBag(it.id) };
    paint();
    return keys((k) => {
      const q = st.qty, before = q.n;
      if (k === "up") q.n = q.n >= q.max ? 1 : q.n + 1;
      else if (k === "down") q.n = q.n <= 1 ? q.max : q.n - 1;
      else if (k === "right") q.n = Math.min(q.max, q.n + 10);
      else if (k === "left") q.n = Math.max(1, q.n - 10);
      else if (k === "a") { se("se_select"); return q.n; }
      else if (k === "b") { se("se_select"); return 0; }
      if (q.n !== before) { se("se_select"); paint(); }
      return undefined;
    });
  }

  async function buy(it) {
    const money = st.opts.money(), lim = st.opts.limit ? st.opts.limit(it.id) : { max: 99 };
    if (money < it.price) { await message("You don't have enough money."); return; }
    if (!lim.max) { await message(lim.why); return; }
    await print(it.name + "? Certainly.\nHow many would you like?");
    const max = Math.max(1, Math.min(lim.max, 99, Math.floor(money / it.price)));
    const n = max === 1 ? 1 : await howMany(it, max);
    st.qty = null;
    if (!n) return;
    await print(it.name + ", and you want " + n + ".\nThat will be " + yen(n * it.price) + ". Okay?");
    const yes = await window.GbaMenus.yesNo(overlayEl, { frame: st.frame, left: 21, top: 9 });
    if (!yes) return;
    const r = st.opts.buy(it.id, n);
    if (r && r.error) { await message(r.error); return; }
    await print("Here you are!\nThank you!");
    se("se_shop");
    paint();
    await waitKey();
    if (r && r.bonus) await message(r.bonus);
  }

  function move(dir) {
    const n = entries().length, shown = Math.min(n, 6), c = st.cursor + dir;
    if (c < 0 || c >= n) return;
    st.cursor = c;
    if (dir > 0 && st.cursor - st.top > Math.ceil(shown / 2) && st.top + shown < n) st.top++;
    if (dir < 0 && st.cursor - st.top < shown - Math.ceil(shown / 2) - 1 && st.top > 0) st.top--;
    se("se_select");
    paint();
  }

  async function open(opts) {
    st = { opts, items: opts.items, frame: opts.frame, cursor: 0, top: 0, tick: 0, message: null, qty: null, fade: 1, layer: null };
    // The map: the tile you face at (32, 64), as the screen showed it.
    const mg = mapCopy.getContext("2d");
    mg.fillStyle = "#000"; mg.fillRect(0, 0, W, H);
    if (opts.map && opts.map.canvas) mg.drawImage(opts.map.canvas, 32 - opts.map.x, 64 - opts.map.y);
    canvas.classList.remove("hidden");
    paint();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    await fade(1, 0);
    for (;;) {
      const k = await keys((key) => {
        if (key === "up" || key === "down") move(key === "up" ? -1 : 1);
        else if (key === "a" || key === "b") return key;
        return undefined;
      });
      se("se_select");
      const it = entries()[st.cursor];
      if (k === "b" || !it) break;
      paint();
      await buy(it);
      endMessage();
    }
    await fade(0, 1);
    close();
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.ShopScreen = { open, close };
})();
