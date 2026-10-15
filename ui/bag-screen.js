// FireRed's Bag screen (src/item_menu.c), drawn the way the game draws it at
// 240x160 (assets/bag/, tools/build-bag.js): the bag on the left under its
// pocket's name, the items in the cream list on the right, and the chosen
// item's icon and description along the bottom. This game's six pockets,
// left / right between them.
//
//   const r = await BagScreen.open({
//     pockets,   // () => [{ name: "Items", items: [{ id, name, qty (null for
//                //   key items and machines), desc, icon }] }]: read again after a toss
//     female,    // the bag's colours
//     frame,     // the Option screen's FRAME (0-9)
//     actions,   // (item) => [{ label: "Use", value: "use" }, ...]: the menu A
//                //   opens (CANCEL is added)
//     toss,      // (id, n): throw n away (TOSS is handled here, as FireRed does)
//     sell,      // { price(id) (each, 0: can't), sell(id, n), money() }: a
//                //   Poké Mart's SELL instead of the menu
//     deposit    // instead of the menu (the PC's DEPOSIT ITEM): A asks "Deposit
//                //   how many?" and calls deposit(id, n), which returns an error
//                //   message or null
//   })
//   // -> null (B, or CANCEL), or { action, id, pocket }
//   BagScreen.close()   // hides it (it stays up after open() for messages)
//
// The ▶ and the list's scroll remember where they were in each pocket.
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

  const images = {};
  function image(url) {
    if (!url) return null;
    if (!images[url]) { const img = new Image(); img.src = url; img.onload = () => st && paint(); images[url] = img; }
    return images[url];
  }
  ["bg-male", "bg-female", "desc-dim", "bag-male", "bag-female", "arrows", "return-arrow"].forEach((n) => image("assets/bag/" + n + ".png"));
  const A = (n) => image("assets/bag/" + n + ".png");
  const ready = (img) => img && img.complete && img.naturalWidth;

  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];
  // The bag's frame for each pocket: its pockets open in turn, left, middle,
  // right, then round again (bag_*.png: 2 the left pocket, 3 the middle, 1 the right).
  const BAG_FRAMES = [2, 3, 1];
  const memory = {};   // pocket name -> { cursor, top }

  // ---------- State ----------

  let st = null, raf = 0, frameNo = 0;

  function pocket() { return st.pockets[st.pocket]; }
  function entries() { return pocket().items.concat([null]); }   // (null: CANCEL)
  function mem() { const n = pocket().name; return memory[n] || (memory[n] = { cursor: 0, top: 0 }); }
  function clampMem() {
    const m = mem(), n = entries().length, shown = Math.min(n, 6);
    m.cursor = Math.max(0, Math.min(m.cursor, n - 1));
    m.top = Math.max(0, Math.min(m.top, n - shown, m.cursor));
    if (m.cursor >= m.top + shown) m.top = m.cursor - shown + 1;
  }

  // Lines of `text` at most `width` wide.
  function wrap(s, text, width) {
    const w = (t) => s.textWidth(t);
    const outl = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (line && w(next) > width) { outl.push(line); line = word; } else line = next;
      }
      outl.push(line);
    }
    return outl;
  }

  // ---------- Drawing ----------

  function paint() {
    if (!st) return;
    const s = window.GbaMenus.Surface(), G = GM();
    const userFrame = "type" + ((st.frame || 0) + 1);
    const items = entries(), m = mem(), shown = Math.min(items.length, 6);
    const menuOpen = !!st.menu;

    // The pocket's name, centred in its banner (white, as FireRed's).
    const name = pocket().name, nw = s.textWidth(name);
    s.text(name, 8 + Math.floor((72 - nw) / 2), 9, WHITE, DARK);

    // The list: names at x 97, ×quantities at 198 (small font), rows 16 apart.
    for (let r = 0; r < shown; r++) {
      const it = items[m.top + r], y = 10 + 16 * r;
      s.text(it ? it.name : "Cancel", 97, y, DARK, LIGHT);
      if (it && it.qty != null) s.text("×" + String(it.qty).padStart(3, " "), 198, y, DARK, LIGHT, "small");
      if (m.top + r === m.cursor) s.text("▶", 89, y, menuOpen ? LIGHT : DARK, menuOpen ? DARK : LIGHT);
    }

    // The description (or the prompts and menus over it).
    const cur = items[m.cursor];
    if (!menuOpen) {
      wrap(s, cur ? cur.desc : "Close bag", 200).slice(0, 3).forEach((l, i) => s.text(l, 40, 115 + 14 * i, WHITE, DARK));
    } else {
      // The prompt (std frame) and the menu or number box (your frame).
      if (st.prompt) {
        // (A prompt beside the icon, or the whole message box: left 2.)
        const pw = st.prompt.width, pl = st.prompt.left || 6;
        s.frame("std", G.palettes.std3, pl, 15, pw, 4);
        s.fill(pl * 8, 120, pw * 8, 32, WHITE);
        st.prompt.text.split("\n").forEach((l, i) => s.text(l, pl * 8, 122 + 14 * i, DARK, LIGHT));
      }
      if (st.menu.kind === "actions") {
        const n = st.menu.items.length, top = 19 - 2 * n;
        s.frame(userFrame, G.frames[userFrame].palette, 22, top, 7, 2 * n);
        s.fill(176, top * 8, 56, n * 16, WHITE);
        st.menu.items.forEach((it, i) => s.text(it.label, 184, top * 8 + 2 + 16 * i, DARK, LIGHT));
        s.text("▶", 176, top * 8 + 2 + 16 * st.menu.cursor, DARK, LIGHT);
      } else if (st.menu.kind === "count" && st.menu.price != null) {
        // Selling: ×NN and what it's worth (sWindowTemplates[1]: 17, 9, 12 x 4).
        s.frame(userFrame, G.frames[userFrame].palette, 17, 9, 12, 4);
        s.fill(136, 72, 96, 32, WHITE);
        s.text("×" + String(st.menu.n).padStart(2, "0"), 140, 82, DARK, LIGHT, "small");
        const p = "¥" + st.menu.n * st.menu.price;
        s.text(p, 228 - s.textWidth(p, "small"), 82, DARK, LIGHT, "small");
      } else if (st.menu.kind === "count") {
        s.frame(userFrame, G.frames[userFrame].palette, 24, 15, 5, 4);
        s.fill(192, 120, 40, 32, WHITE);
        s.text("×" + String(st.menu.n).padStart(3, "0"), 196, 130, DARK, LIGHT, "small");
      }
    }
    if (st.showMoney && st.opts.sell) {
      // Your money (1, 1, 8 x 3), over the pocket's name, once a sale starts.
      s.frame("std", G.palettes.std3, 1, 1, 8, 3);
      s.fill(8, 8, 64, 24, WHITE);
      s.text("Money", 8, 8, DARK, LIGHT);
      const m = "¥" + st.opts.sell.money();
      s.text(m, 72 - s.textWidth(m, "small"), 20, DARK, LIGHT, "small");
    }
    st.layer = s.canvas();
    compose();
  }

  // The bag sprite, arrows and item icon go between the background and the text.
  function compose() {
    const off = compose.c || (compose.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    const bg = A(st.female ? "bg-female" : "bg-male");
    if (ready(bg)) g.drawImage(bg, 0, 0);
    if (st.menu && ready(A("desc-dim"))) g.drawImage(A("desc-dim"), 0, 112);
    // The bag (64x64 at 8, 36): its pocket's frame, after a hop (y2 -5 back to 0)
    // and FireRed's shake when the ▶ moves (sAffineAnim_BagShake).
    const bag = A(st.female ? "bag-female" : "bag-male");
    if (ready(bag)) {
      const f = st.hop > 0 ? 0 : BAG_FRAMES[st.pocket % 3];
      const SHAKE = [-1, -2, -1, 0, 1, 2, 1, 0, -1, -2, -1, 0];
      const angle = st.shake >= 0 && st.shake < 12 ? SHAKE[st.shake] * 2.8125 : 0;
      g.save();
      g.translate(40, 68 - Math.max(0, st.hopY));
      g.rotate(-angle * Math.PI / 180);
      g.drawImage(bag, 0, f * 64, 64, 64, -32, -32, 64, 64);
      g.restore();
    }
    // The item's icon in the box at the bottom left.
    const items = entries(), cur = items[mem().cursor];
    const icon = cur ? image(cur.icon) : A("return-arrow");
    if (ready(icon)) {
      const box = cur && window.ITEM_SPRITE_BOXES && window.ITEM_SPRITE_BOXES[cur.id];
      if (box) {
        const [bx, by, bw, bh] = box;
        const sc = Math.min(1, 24 / Math.max(bw, bh));
        const dw = Math.round(bw * sc), dh = Math.round(bh * sc);
        g.drawImage(icon, bx, by, bw, bh, 20 - Math.floor(dw / 2), 136 - Math.floor(dh / 2), dw, dh);
      } else g.drawImage(icon, 8, 124, 24, 24);
    }
    // Arrows: left / right for the pockets (8, 72 and 72, 72), up / down for a
    // list longer than six (160, 8 and 160, 104), bouncing 2 pixels.
    const arrows = A("arrows");
    if (ready(arrows) && !st.menu) {
      const bounce = Math.trunc(Math.sin(((frameNo * 8) & 255) / 256 * 2 * Math.PI) * 2);
      if (st.pocket > 0) g.drawImage(arrows, 0, 0, 16, 16, 0 - bounce, 64, 16, 16);
      if (st.pocket < st.pockets.length - 1) {
        g.save(); g.translate(64 + 16 + bounce, 64); g.scale(-1, 1); g.drawImage(arrows, 0, 0, 16, 16, 0, 0, 16, 16); g.restore();
      }
      const m = mem(), n = items.length;
      if (m.top > 0) g.drawImage(arrows, 0, 16, 16, 16, 152, 0 - bounce, 16, 16);
      if (m.top + 6 < n) { g.save(); g.translate(152, 96 + 16 + bounce); g.scale(1, -1); g.drawImage(arrows, 0, 16, 16, 16, 0, 0, 16, 16); g.restore(); }
    }
    if (st.layer) g.drawImage(st.layer, 0, 0);
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    out.restore();
  }

  function loop() {
    if (!st) return;
    frameNo++;
    if (st.hop > 0) st.hop--;
    if (st.hopY > 0) st.hopY--;
    if (st.shake >= 0 && st.shake < 12) st.shake++;
    compose();
    raf = requestAnimationFrame(loop);
  }

  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };

  // ---------- Input ----------

  function moveCursor(dir) {
    const m = mem(), n = entries().length, shown = Math.min(n, 6);
    const c = m.cursor + dir;
    if (c < 0 || c >= n) return;
    m.cursor = c;
    // (ListMenu: the ▶ stops at row 3 going down and row 2 going up while it scrolls.)
    if (dir > 0 && m.cursor - m.top > Math.ceil(shown / 2) && m.top + shown < n) m.top++;
    if (dir < 0 && m.cursor - m.top < shown - Math.ceil(shown / 2) - 1 && m.top > 0) m.top--;
    st.shake = 0;
    se("se_bag_cursor");
    paint();
  }
  function switchPocket(dir) {
    const p = st.pocket + dir;
    if (p < 0 || p >= st.pockets.length) return;
    st.pocket = p;
    clampMem();
    st.hop = 5; st.hopY = 5;
    se("se_bag_pocket");
    paint();
  }

  function menuKeys(onA) {
    return window.GbaMenus.keys((k) => {
      const mn = st.menu;
      if (mn.kind === "actions") {
        if (k === "up" && mn.cursor > 0) { mn.cursor--; se("se_select"); paint(); }
        else if (k === "down" && mn.cursor < mn.items.length - 1) { mn.cursor++; se("se_select"); paint(); }
        else if (k === "a") { se("se_select"); return mn.items[mn.cursor].value; }
        else if (k === "b") { se("se_select"); return "cancel"; }
      } else if (mn.kind === "count") {
        const before = mn.n;
        if (k === "up") mn.n = mn.n >= mn.max ? 1 : mn.n + 1;
        else if (k === "down") mn.n = mn.n <= 1 ? mn.max : mn.n - 1;
        else if (k === "right") mn.n = Math.min(mn.max, mn.n + 10);
        else if (k === "left") mn.n = Math.max(1, mn.n - 10);
        else if (k === "a") { se("se_select"); return mn.n; }
        else if (k === "b") { se("se_select"); return 0; }
        if (mn.n !== before) { se("se_select"); paint(); }
      }
      return undefined;
    });
  }
  const waitA = () => window.GbaMenus.keys((k) => (k === "a" || k === "b" ? (se("se_select"), true) : undefined));

  // "… how many?" with the ×001 box: the number, or 0.
  async function howMany(text, it) {
    if (!(it.qty > 1)) return 1;
    st.prompt = { width: 16, text };
    st.menu = { kind: "count", n: 1, max: it.qty };
    paint();
    return menuKeys();
  }
  // A message in the prompt window, until A or B.
  async function note(text) {
    st.prompt = { width: 23, text };
    st.menu = { kind: "none" };
    paint();
    await waitA();
  }

  // SELL: "How many would you like to sell?", "I can pay ¥… Would that be
  // okay?", "Turned over the …". Half the price; nothing for what has none.
  async function sell(it) {
    const wide = (text) => ({ left: 2, width: 26, text });
    st.menu = { kind: "none" };
    const unit = st.opts.sell.price(it.id);
    if (!unit) {
      st.prompt = wide(it.name + "? Oh, no.\nI can't buy that.");
      paint();
      await waitA();
      return;
    }
    st.showMoney = true;
    let n = 1;
    if (it.qty > 1) {
      st.prompt = wide(it.name + "?\nHow many would you like to sell?");
      st.menu = { kind: "count", n: 1, max: Math.min(it.qty, 99), price: unit };
      paint();
      n = await menuKeys();
      st.menu = { kind: "none" };
      if (!n) return;
    }
    st.prompt = wide("I can pay ¥" + unit * n + ".\nWould that be okay?");
    paint();
    if (!(await window.GbaMenus.yesNo(overlayEl, { frame: st.frame, left: 21, top: 9 }))) return;
    st.opts.sell.sell(it.id, n);
    se("se_shop");
    st.prompt = wide("Turned over the " + it.name + "(s)\nworth ¥" + unit * n + ".");
    st.pockets = st.opts.pockets();
    clampMem();
    paint();
    await waitA();
  }

  // TOSS: "Toss out how many …?", "Throw away … of this item?", "Threw away …".
  async function toss(it) {
    const n = await howMany("Toss out how many\n" + it.name + "(s)?", it);
    if (!n) return;
    st.prompt = { width: 15, text: "Throw away " + n + " of\nthis item?" };
    st.menu = { kind: "none" };
    paint();
    const yes = await window.GbaMenus.yesNo(overlayEl, { frame: st.frame, left: 23, top: 15 });
    if (!yes) return;
    st.prompt = { width: 23, text: "Threw away " + n + "\n" + it.name + "(s)." };
    paint();
    await waitA();
    st.opts.toss(it.id, n);
    st.pockets = st.opts.pockets();
    clampMem();
  }

  async function open(opts) {
    st = { opts, pockets: opts.pockets(), pocket: Math.max(0, opts.pocket || 0), female: !!opts.female, frame: opts.frame,
      menu: null, prompt: null, hop: 5, hopY: 5, shake: -1 };
    if (opts.pocketName) { const i = st.pockets.findIndex((p) => p.name === opts.pocketName); if (i >= 0) st.pocket = i; }
    clampMem();
    canvas.classList.remove("hidden");
    paint();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    for (;;) {
      const key = await window.GbaMenus.keys((k) => {
        if (k === "up" || k === "down") moveCursor(k === "up" ? -1 : 1);
        else if (k === "left" || k === "right") switchPocket(k === "left" ? -1 : 1);
        else if (k === "a" || k === "b") return k;
        return undefined;
      });
      const it = entries()[mem().cursor];
      se("se_select");
      if (key === "b" || !it) return null;
      if (opts.sell) {
        // (A Poké Mart's SELL: Task_ItemContext_Sell.)
        await sell(it);
        st.menu = null; st.prompt = null; st.showMoney = false;
        paint();
        continue;
      }
      if (opts.deposit) {
        // (Item storage: "Deposit how many?", then "Deposited …".)
        st.menu = { kind: "none" };
        if (it.qty == null) await note("That can't be stored\nin the PC.");
        else {
          const n = await howMany("Deposit how many\n" + it.name + "(s)?", it);
          if (n) {
            const err = opts.deposit(it.id, n);
            await note(err || "Deposited " + n + "\n" + it.name + "(s).");
            st.pockets = opts.pockets();
            clampMem();
          }
        }
        st.menu = null; st.prompt = null;
        paint();
        continue;
      }
      // A: the menu, with "… is selected." beside it; the description dims.
      const items = (opts.actions(it) || []).concat([{ label: "Cancel", value: "cancel" }]);
      st.prompt = { width: 14, text: it.name + " is\nselected." };
      st.menu = { kind: "actions", items, cursor: 0 };
      paint();
      const v = await menuKeys();
      st.menu = null; st.prompt = null;
      if (v === "toss") {
        st.menu = { kind: "none" };
        await toss(it);
        st.menu = null; st.prompt = null;
        paint();
        continue;
      }
      paint();
      if (v === "cancel") continue;
      return { action: v, id: it.id, pocket: pocket().name };
    }
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.BagScreen = { open, close };
})();
