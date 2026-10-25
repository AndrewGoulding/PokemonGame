// FireRed's Bag screen (src/item_menu.c), drawn the way the game draws it at
// 240x160 (assets/bag/, tools/build-bag.js): the bag on the left under its
// pocket's name, the items in the cream list on the right, and the chosen
// item's icon and description along the bottom. This game's nine pockets,
// left / right between them (in battle, those with something usable there).
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
//     fresh      // the cursors start at the top and aren't remembered
//     select     // an item id: the ▶ starts on it
//     reorder    // (pocketName, [ids]): SELECT moves an item (FireRed's), and
//                //   this gets the pocket's new order
//   })
//   // -> null (B, or CANCEL), or { action, id, pocket }
//   BagScreen.close()   // hides it (it stays up after open() for messages)
//   BagScreen.setRegistered(() => id)   // the item registered to SELECT, shown
//                                       // with FireRed's SELECT button
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
  ["bg-male", "bg-female", "desc-dim", "bag-male", "bag-female", "arrows", "return-arrow", "select-button"].forEach((n) => image("assets/bag/" + n + ".png"));
  const A = (n) => image("assets/bag/" + n + ".png");
  const ready = (img) => img && img.complete && img.naturalWidth;

  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205], RED = [248, 48, 48];
  // The bag's frame for each pocket: FireRed's bag, its pockets opening in
  // turn, left, middle, right, then round again (bag_*.png: 2 the left
  // pocket, 3 the middle, 1 the right).
  const BAG_FRAMES = [2, 3, 1];
  let memory = {};   // pocket name -> { cursor, top }
  let saved = null;   // (yours, while a demo's bag has its own)

  // ---------- State ----------

  let st = null, raf = 0, frameNo = 0;
  let registered = null;   // () => the id of the item registered to SELECT

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
      // (Moving an item: FireRed's red ▶ and the item's name in red where it'd go.)
      if (m.top + r === m.cursor) s.text("▶", 89, y, st.moving ? RED : menuOpen ? LIGHT : DARK, menuOpen ? DARK : LIGHT);
      if (st.moving && it && m.top + r === m.cursor) s.text(it.name, 97, y, RED, LIGHT);
    }

    // The description (or the prompts and menus over it).
    const cur = items[m.cursor];
    if (st.moving) {
      wrap(s, "Where should the " + st.moving.name + "\nbe placed?", 200).slice(0, 3).forEach((l, i) => s.text(l, 40, 115 + 14 * i, WHITE, DARK));
    } else if (!menuOpen) {
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
        s.text("×" + String(st.menu.n).padStart(st.menu.max > 99 ? 3 : 2, "0"), 140, 82, DARK, LIGHT, "small");
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
    // The item registered to SELECT: the SELECT button where a quantity would
    // be (x 0x70 in the list window, at 88), on its row.
    const reg = registered && registered(), sel = A("select-button");
    if (reg && ready(sel)) {
      const m = mem();
      for (let r = 0; r < Math.min(items.length, 6); r++) {
        const it = items[m.top + r];
        if (it && it.qty == null && it.id === reg) g.drawImage(sel, 88 + 0x70, 10 + 16 * r);
      }
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
    // (Moving an item: it can't go past CANCEL, and it goes along with the ▶.)
    if (c < 0 || c >= n - (st.moving ? 1 : 0)) return;
    if (st.moving) { const list = pocket().items; list.splice(c, 0, list.splice(m.cursor, 1)[0]); }
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
      st.menu = { kind: "count", n: 1, max: it.qty, price: unit };
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
      menu: null, prompt: null, moving: null, hop: 5, hopY: 5, shake: -1 };
    // (opts.fresh: a bag of its own, the old man's: every ▶ at the top, and
    // yours as you left them after.)
    if (opts.fresh) { saved = memory; memory = {}; }
    if (opts.pocketName) { const i = st.pockets.findIndex((p) => p.name === opts.pocketName); if (i >= 0) st.pocket = i; }
    // (opts.select: the ▶ on that item, if it's in the pocket: the Berry you planted last.)
    if (opts.select) { const i = entries().findIndex((e) => e && e.id === opts.select); if (i >= 0) { mem().cursor = i; mem().top = Math.max(0, i - 2); } }
    clampMem();
    canvas.classList.remove("hidden");
    paint();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    for (;;) {
      const key = await window.GbaMenus.keys((k) => {
        if (k === "up" || k === "down") moveCursor(k === "up" ? -1 : 1);
        else if (k === "left" || k === "right") { if (!st.moving) switchPocket(k === "left" ? -1 : 1); }
        else if (k === "a" || k === "b" || (k === "select" && opts.reorder)) return k;
        return undefined;
      });
      const it = entries()[mem().cursor];
      se("se_select");
      // SELECT: pick an item up; A or SELECT again puts it down where the ▶
      // is, B puts it back (FireRed's Task_ItemContext_Move... in this game's
      // Bag, whose pockets its own order).
      if (st.moving) {
        const from = st.moving.from;
        if (key === "b") { const list = pocket().items; list.splice(from, 0, list.splice(mem().cursor, 1)[0]); mem().cursor = from; }
        else opts.reorder(pocket().name, pocket().items.map((e) => e.id));
        st.moving = null;
        clampMem();
        paint();
        continue;
      }
      if (key === "select") {
        if (it) { st.moving = { name: it.name, from: mem().cursor }; paint(); }
        continue;
      }
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
    if (saved) { memory = saved; saved = null; }
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.BagScreen = { open, close, setRegistered: (fn) => { registered = fn; } };
})();

// ---------- The Trunk (the Yu-Gi-Oh! realm's) ----------
//
// Yu-Gi-Oh! GX Duel Academy's Trunk, drawn the way that game draws it at 240x160 (assets/yugioh/trunk/,
// tools/build-gx-trunk.py), with its controls: your cards on the left, your deck on the right, the bar of filters
// along the top, and the card under the cursor along the bottom (its number, level, name, how many you have and
// how many are in the deck, its attribute, type and ATK/DEF).
//   - The filters: ALL, LOW LEVEL (1-4), MIDDLE LEVEL (5-6), HIGH LEVEL (7 and up), SPELL, TRAP, NORMAL, EFFECT,
//     FUSION, RITUAL, each with how many of the column's cards it has. Up from the top of a column (or B) goes to
//     the bar; left and right pick a filter, and the column shows only those.
//   - A on a card: its menu. TO MAIN DECK (or, in the deck, TO TRUNK), TO SIDE DECK, FILTER, SORT (by NUMBER, NAME,
//     ATTACK, DEFENSE, CATEGORY, TYPE, ATTRIBUTE, ICON or LEVEL), CHANGE VIEW (names, or the cards as little
//     coloured cards, seven a row), DECK MODE (the deck, or its side deck) and EXIT.
//   - R puts the card in the deck, L takes it out; START shows the card itself, with its text.
// A deck has at most 60 cards (Fusion Monsters go to the Fusion Deck, up to 20), its side deck 15, and three of
// any card in all.
//
//   await TrunkScreen.open({
//     cards,     // window.YUGIOH_CARDS
//     trunk,     // { cardNumber: how many you have }
//     deck,      // { main: [cardNumber, ...], side: [...] }: changed here as you build it
//     deckName,  // shown at the top right
//   })
(function () {
  "use strict";

  const W = 240, H = 160;
  const canvas = document.createElement("canvas");
  canvas.className = "party-menu hidden";
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);
  const out = canvas.getContext("2d");
  out.imageSmoothingEnabled = false;
  const images = {};
  function image(url) {
    if (!images[url]) { const img = new Image(); img.src = url; img.onload = () => st && paint(); images[url] = img; }
    return images[url];
  }
  const T = (n) => image("assets/yugioh/trunk/" + n + ".png");
  const ready = (img) => img && img.complete && img.naturalWidth;
  const WHITE = [255, 255, 255], DARK = [64, 56, 56], SHADE = [40, 40, 48], YELLOW = [248, 216, 48], BLUE_BOX = "#2830a8";

  const MAX = { main: 60, fusion: 20, side: 15, copies: 3 };
  const FILTERS = [
    { name: "ALL", x: 22, w: 21, test: () => true },
    { name: "LOW LEVEL", x: 47, w: 17, test: (c) => c[5] >= 1 && c[5] <= 4 },
    { name: "MIDDLE LEVEL", x: 64, w: 16, test: (c) => c[5] === 5 || c[5] === 6 },
    { name: "HIGH LEVEL", x: 80, w: 17, test: (c) => c[5] >= 7 },
    { name: "SPELL", x: 97, w: 15, test: (c) => c[2] === "spell" },
    { name: "TRAP", x: 113, w: 15, test: (c) => c[2] === "trap" },
    { name: "NORMAL", x: 129, w: 15, test: (c) => c[2] === "normal" },
    { name: "EFFECT", x: 145, w: 15, test: (c) => c[2] === "effect" },
    { name: "FUSION", x: 161, w: 15, test: (c) => c[2] === "fusion" },
    { name: "RITUAL", x: 177, w: 15, test: (c) => c[2] === "ritual" }
  ];
  // (Where each filter's count goes: its right edge, and its line.)
  const COUNT_AT = [[42, 23], [63, 22], [79, 22], [95, 22], [111, 19], [127, 19], [143, 19], [159, 19], [175, 19], [191, 19]];
  const CATEGORY = { normal: 0, effect: 1, fusion: 2, ritual: 3, spell: 4, trap: 5 };
  const KIND_COLOUR = { normal: "#e8d040", effect: "#e89830", fusion: "#b048b8", ritual: "#5890e8", spell: "#30c070", trap: "#d83890" };
  // (The thumbnail's frame is the Normal Monster's yellow: the others' colours by turning its hue.)
  const KIND_HUE = { normal: 0, effect: -22, fusion: 240, ritual: 160, spell: 80, trap: 275 };
  const SORTS = [
    { name: "NUMBER", key: (n) => n },
    { name: "NAME", key: (n, c) => c[0].toLowerCase() },
    { name: "ATTACK", key: (n, c) => -c[6] },
    { name: "DEFENSE", key: (n, c) => -c[7] },
    { name: "CATEGORY", key: (n, c) => CATEGORY[c[2]] },
    { name: "TYPE", key: (n, c) => (c[3] || 99) },
    { name: "ATTRIBUTE", key: (n, c) => (c[4] || (c[2] === "spell" ? 7 : 8)) },
    { name: "ICON", key: (n, c) => (c[2] === "spell" || c[2] === "trap" ? c[8] + (c[2] === "trap" ? 10 : 0) : 99) },
    { name: "LEVEL", key: (n, c) => -c[5] }
  ];
  const COMMANDS = ["TO MAIN DECK", "FILTER", "SORT", "CHANGE VIEW", "DECK MODE", "EXIT", "TO SIDE DECK"];

  let st = null, raf = 0;

  // ---------- The lists ----------
  const card = (n) => st.opts.cards.cards[n];
  const inDeck = (n) => st.deck.main.filter((m) => m === n).length + st.deck.side.filter((m) => m === n).length;
  const isFusion = (n) => card(n)[2] === "fusion";
  function sorted(list) {
    const s = SORTS[st.sort], key = (n) => s.key(n, card(n));
    return list.slice().sort((a, b) => { const ka = key(a), kb = key(b); return ka < kb ? -1 : ka > kb ? 1 : a - b; });
  }
  // (The trunk: each card you have, once; the deck: each copy in it, its main deck's and Fusion Deck's, or its side deck's.)
  const trunkAll = () => Object.keys(st.opts.trunk).map(Number).filter((n) => st.opts.trunk[n] > 0 && card(n));
  const deckAll = () => (st.side ? st.deck.side : st.deck.main).slice();
  function column(c) {
    const all = c === 0 ? trunkAll() : deckAll(), f = FILTERS[st.filter];
    return sorted(all.filter((n) => f.test(card(n))));
  }
  function counts(c) {
    const all = c === 0 ? trunkAll() : deckAll();
    return FILTERS.map((f) => all.filter((n) => f.test(card(n))).length);
  }
  const ROWS = 5, GRID = 7;
  function perPage() { return st.grid && st.col === 0 ? ROWS * GRID : ROWS; }
  function clamp() {
    for (const c of [0, 1]) {
      const n = column(c).length, m = st.cur[c], page = c === 0 && st.grid ? GRID : 1, shown = c === 0 && st.grid ? ROWS * GRID : ROWS;
      m.i = Math.max(0, Math.min(m.i, n - 1));
      m.top = Math.max(0, Math.min(m.top, m.i - (m.i % page)));
      while (m.i >= m.top + shown) m.top += page;
      if (m.top < 0) m.top = 0;
    }
  }
  const current = () => column(st.col)[st.cur[st.col].i];

  // ---------- Deck building ----------
  function add(n, to) {
    const c = card(n), owned = st.opts.trunk[n] || 0;
    if (inDeck(n) >= Math.min(MAX.copies, owned)) return owned > MAX.copies - 1 ? "You can only have three of a card\nin your deck." : "You have no more of this card.";
    if (to === "side") { if (st.deck.side.length >= MAX.side) return "Your side deck is full."; st.deck.side.push(n); return null; }
    const main = st.deck.main, fusions = main.filter(isFusion).length;
    if (c[2] === "fusion" ? fusions >= MAX.fusion : main.length - fusions >= MAX.main) return c[2] === "fusion" ? "Your Fusion Deck is full." : "Your deck is full.";
    main.push(n);
    return null;
  }
  function remove(n) {
    const list = st.side ? st.deck.side : st.deck.main, i = list.lastIndexOf(n);
    if (i >= 0) { list.splice(i, 1); return true; }
    const other = st.side ? st.deck.main : st.deck.side, j = other.lastIndexOf(n);
    if (j >= 0) { other.splice(j, 1); return true; }
    return false;
  }

  // ---------- Drawing ----------
  function draw(g, name, x, y) { const im = T(name); if (ready(im)) g.drawImage(im, x, y); }
  function digits(g, value, right, y, big) {
    const s = String(value), step = big ? 8 : s.length >= 3 ? 4 : 5;
    for (let i = 0; i < s.length; i++) draw(g, (big ? "digit-" : "small-") + s[i], right - (s.length - i) * step - (big ? 0 : 8 - step), y);
  }
  function art(g, n, x, y, w, h) {
    const C = st.opts.cards, sheet = image("assets/yugioh/cards/" + String(Math.floor(n / C.perSheet)).padStart(2, "0") + ".png");
    if (!ready(sheet)) return;
    const k = n % C.perSheet;
    g.drawImage(sheet, k % C.across * 80, Math.floor(k / C.across) * 80, 80, 80, x, y, w, h);
  }
  function box(g, x, y, w, h, colour) {
    g.strokeStyle = colour; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  // (A label in the game's blue box, edged gold, with its point down at x.)
  function tooltip(s, g, label, x, y) {
    const w = s.textWidth(label, "small") + 10, left = Math.max(2, Math.min(W - w - 2, Math.round(x - w / 2)));
    g.fillStyle = "#c8a020"; g.fillRect(left, y, w, 13);
    g.fillStyle = BLUE_BOX; g.fillRect(left + 1, y + 1, w - 2, 11);
    g.fillStyle = "#c8a020"; g.fillRect(x - 2, y + 13, 5, 1); g.fillRect(x - 1, y + 14, 3, 1); g.fillRect(x, y + 15, 1, 1);
    s.text(label, left + 5, y + 1, WHITE, SHADE, "small");
  }
  // (A name cut to fit its row, as the game's are.)
  function fit(s, str, width, font) {
    if (s.textWidth(str, font) <= width) return str;
    while (str && s.textWidth(str, font) > width) str = str.slice(0, -1);
    return str;
  }
  function paint() {
    if (!st) return;
    // (Two layers of text: the screen's, then the menus' and labels' over the pictures drawn over it.)
    const s = window.GbaMenus.Surface(), top = window.GbaMenus.Surface();
    const off = paint.c || (paint.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.filter = "none";
    if (st.detail != null) { paintDetail(g, top, st.detail); return finish(g, null, top); }
    draw(g, "bg", 0, 0); draw(g, "bar", 0, 0);
    // The top: "Trunk", the deck's counts (its main deck, Fusion Deck and side deck) and its name.
    s.text("Trunk", 3, 0, WHITE, SHADE);
    const fus = st.deck.main.filter(isFusion).length;
    digits(g, st.deck.main.length - fus, 111, 3); digits(g, fus, 135, 3); digits(g, st.deck.side.length, 159, 3);
    const dn = st.side ? "Side Deck" : st.opts.deckName || "Deck";
    s.text(dn, 237 - s.textWidth(dn), 0, WHITE, SHADE);
    // The filters' counts, for the column the cursor's in, and the sort's icon.
    counts(st.col).forEach((v, i) => digits(g, v, COUNT_AT[i][0], COUNT_AT[i][1]));
    draw(g, "sort-" + st.sort, 200, 16);
    // The columns.
    for (const c of [0, 1]) {
      const list = column(c), m = st.cur[c], x0 = c === 0 ? 0 : 120;
      if (c === 0 && st.grid) {
        for (let k = 0; k < ROWS * GRID; k++) {
          const n = list[m.top + k];
          if (n == null) break;
          const x = 6 + (k % GRID) * 16, y = 35 + Math.floor(k / GRID) * 16;
          g.fillStyle = "#302820"; g.fillRect(x, y, 10, 11);
          g.fillStyle = KIND_COLOUR[card(n)[2]]; g.fillRect(x + 1, y + 1, 8, 9);
          g.fillStyle = "#302820"; g.fillRect(x + 3, y + 3, 4, 4);
          if (st.col === 0 && m.top + k === m.i && !st.bar) box(g, x - 3, y - 2, 16, 15, "#f8a038");
        }
      } else {
        for (let r = 0; r < ROWS; r++) {
          const n = list[m.top + r];
          if (n == null) break;
          s.text(fit(s, card(n)[0], 110), x0 + 3, 33 + 16 * r, WHITE, SHADE);
          if (st.col === c && m.top + r === m.i && !st.bar) draw(g, "cursor-row", x0, 32 + 16 * r);
        }
      }
      // (Where you are in the column: the orange mark down its edge.)
      const pages = Math.max(1, list.length), at = list.length ? m.i / Math.max(1, list.length - 1) : 0;
      if (c === 0 && pages > (st.grid ? ROWS * GRID : ROWS)) { g.fillStyle = "#f86030"; g.fillRect(113, 33 + Math.round(at * 70), 6, 8); }
    }
    // The card under the cursor.
    const n = current();
    if (n != null) {
      const c = card(n);
      g.filter = "hue-rotate(" + KIND_HUE[c[2]] + "deg)"; draw(g, "frame", 0, 112); g.filter = "none";
      art(g, n, 4, 124, 32, 32);
      const num = String(n).padStart(4, "0");
      for (let i = 0; i < 4; i++) draw(g, "digit-" + num[i], 48 + 8 * i, 120);
      for (let i = 0; i < c[5]; i++) draw(g, "star", 88 + 8 * i, 120);
      s.text(fit(s, c[0], 188), 48, 128, WHITE, SHADE);
      draw(g, "in-trunk", 48, 144); draw(g, "in-deck", 48, 152);
      digits(g, st.opts.trunk[n] || 0, 72, 144, true); digits(g, inDeck(n), 72, 152, true);
      if (c[2] === "spell" || c[2] === "trap") {
        draw(g, "attr-" + (c[2] === "spell" ? 7 : 8), 80, 144);
        if (c[8]) draw(g, c[2] + "-" + c[8], 96, 144);
      } else {
        if (c[4]) draw(g, "attr-" + c[4], 80, 144);
        if (c[3]) draw(g, "type-" + c[3], 96, 144);
        draw(g, "atk", 120, 144); draw(g, "def", 120, 152);
        digits(g, c[6], 160, 144, true); digits(g, c[7], 160, 152, true);
      }
    }
    // (the screen's text, under the menus)
    g.drawImage(s.canvas(), 0, 0);
    // The bar's cursor and its label.
    if (st.bar) {
      const f = FILTERS[st.filter];
      box(g, f.x - 2, 15, f.w + 4, 16, "#f8d830");
      tooltip(top, g, f.name, f.x + f.w / 2, 33);
    }
    // The card's menu, and the sort menu.
    if (st.menu) {
      draw(g, "cmd-menu", 16, 64); draw(g, "cmd-icons", 16, 64);
      const i = st.menu.i, [x, y] = i < 6 ? [24 + 24 * i, 68] : [24, 92];
      box(g, x - 1, y - 1, 26, 26, "#f8d830"); box(g, x, y, 24, 24, "#b07818");
      const label = i === 0 && st.col === 1 ? "TO TRUNK" : COMMANDS[i];
      tooltip(top, g, label, x + 12, 50);
    }
    if (st.sortMenu) {
      draw(g, "sort-menu", 16, 64);
      for (let i = 0; i < 9; i++) draw(g, "sort-" + i, 24 + 16 * i, 72);
      const x = 24 + 16 * st.sortMenu.i;
      box(g, x - 2, 70, 20, 20, "#f8d830");
      tooltip(top, g, SORTS[st.sortMenu.i].name, x + 8, 54);
    }
    if (st.message) {
      g.fillStyle = "#c8a020"; g.fillRect(16, 60, 208, 40); g.fillStyle = BLUE_BOX; g.fillRect(17, 61, 206, 38);
      st.message.split("\n").forEach((l, i) => top.text(l, 24, 64 + 14 * i, WHITE, SHADE));
    }
    finish(g, null, top);
  }
  function finish(g, s, top) {
    const off = g.canvas;
    if (s) g.drawImage(s.canvas(), 0, 0);
    g.drawImage(top.canvas(), 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, W * 2, H * 2);
    out.drawImage(off, 0, 0, W * 2, H * 2);
  }
  // START: the card itself, as the game shows it: its picture in its frame, and its text beside it.
  function paintDetail(g, s, n) {
    const c = card(n), C = st.opts.cards;
    g.fillStyle = "#383838"; g.fillRect(0, 0, W, H);
    g.fillStyle = KIND_COLOUR[c[2]]; g.fillRect(4, 4, 104, 136);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(4, 138, 104, 2); g.fillRect(106, 4, 2, 136);
    g.fillStyle = "#f0e8c8"; g.fillRect(8, 8, 96, 14);
    g.fillStyle = "#202020"; g.fillRect(15, 33, 82, 82);
    art(g, n, 16, 34, 80, 80);
    g.fillStyle = "#f0e8c8"; g.fillRect(8, 118, 96, 18);
    const attr = c[2] === "spell" ? 7 : c[2] === "trap" ? 8 : c[4];
    if (attr) draw(g, "attr-" + attr, 88, 7);
    for (let i = 0; i < c[5]; i++) draw(g, "star", 96 - 8 * (i + 1) + 0, 24);
    g.fillStyle = "#e8e8e8"; g.fillRect(112, 0, 128, 14);
    g.fillStyle = "#f8f040"; g.fillRect(112, 0, 128, 14);
    g.fillStyle = "#909090"; g.fillRect(0, 144, W, 16);
    const kind = c[2] === "spell" || c[2] === "trap" ? (C.icons[c[8]] ? C.icons[c[8]] + " " : "") + (c[2] === "spell" ? "Spell" : "Trap")
      : C.types[c[3]] + (c[2] === "normal" ? "" : "/" + c[2][0].toUpperCase() + c[2].slice(1));
    s.text(kind, 115, 0, [40, 40, 40], [200, 190, 60]);
    // (Its name small enough to fit its band, its stats, and its text wrapped beside it.)
    s.text(c[0], 10, 9, [32, 32, 32], [200, 190, 160], "small");
    if (c[6] >= 0) s.text("ATK/" + c[6] + "  DEF/" + c[7], 12, 121, [32, 32, 32], [200, 190, 160], "small");
    const words = c[1].replace(/@\d/g, "").split(/(\s+)/);
    const lines = [];
    for (const para of c[1].replace(/@\d/g, "").split("\n")) {
      let line = "";
      for (const w of para.split(" ")) {
        const next = line ? line + " " + w : w;
        if (line && s.textWidth(next, "small") > 124) { lines.push(line); line = w; } else line = next;
      }
      lines.push(line);
    }
    void words;
    lines.slice(st.detailTop, st.detailTop + 11).forEach((l, i) => s.text(l, 114, 16 + 11 * i, WHITE, SHADE, "small"));
    const nm = c[0].toUpperCase();
    s.text(nm, Math.max(2, 120 - Math.floor(s.textWidth(nm) / 2)), 145, WHITE, SHADE);
    st.detailLines = lines.length;
  }
  function loop() { if (!st) return; raf = requestAnimationFrame(loop); }

  // ---------- Input ----------
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n || "se_select"); };
  async function say(text) {
    st.message = text; paint();
    await window.GbaMenus.keys((k) => (k === "a" || k === "b" ? k : undefined));
    st.message = null; paint();
  }
  function move(dy, dx) {
    const m = st.cur[st.col], list = column(st.col);
    if (st.col === 0 && st.grid) {
      if (dx) {
        const col = m.i % GRID;
        if (dx > 0 && (col === GRID - 1 || m.i === list.length - 1)) { st.col = 1; return true; }
        if (dx < 0 && col === 0) return false;
        m.i += dx; clamp(); return true;
      }
      if (dy < 0 && m.i < GRID) { st.bar = true; return true; }
      if (m.i + dy * GRID >= 0 && m.i + dy * GRID < list.length) { m.i += dy * GRID; clamp(); return true; }
      return false;
    }
    if (dx) { if ((dx > 0) === (st.col === 0)) { st.col = dx > 0 ? 1 : 0; clamp(); return true; } return false; }
    if (dy < 0 && m.i === 0) { st.bar = true; return true; }
    if (m.i + dy >= 0 && m.i + dy < list.length) { m.i += dy; clamp(); return true; }
    return false;
  }
  async function command(i) {
    const n = current();
    if (i === 0 || i === 6) {
      if (n == null) return;
      if (st.col === 1 && i === 0) { remove(n); se(); clamp(); return; }
      const err = add(n, i === 6 ? "side" : "main");
      if (err) { se("se_failure"); await say(err); } else se();
      return;
    }
    if (i === 1) { st.bar = true; return; }
    if (i === 2) {
      st.sortMenu = { i: st.sort }; paint();
      const k = await window.GbaMenus.keys((key) => {
        if (key === "left" || key === "right") { st.sortMenu.i = (st.sortMenu.i + (key === "left" ? 8 : 1)) % 9; se(); paint(); return undefined; }
        return key === "a" || key === "b" ? key : undefined;
      });
      if (k === "a") { st.sort = st.sortMenu.i; st.cur[0].i = st.cur[1].i = 0; st.cur[0].top = st.cur[1].top = 0; }
      st.sortMenu = null; clamp(); return;
    }
    if (i === 3) { st.grid = !st.grid; clamp(); return; }
    if (i === 4) { st.side = !st.side; st.cur[1] = { i: 0, top: 0 }; clamp(); return; }
    if (i === 5) return "exit";
  }
  async function open(opts) {
    const deck = opts.deck;
    deck.main = deck.main || []; deck.side = deck.side || [];
    st = { opts, deck, col: 0, cur: [{ i: 0, top: 0 }, { i: 0, top: 0 }], filter: 0, sort: 0, bar: false, grid: false, side: false,
      menu: null, sortMenu: null, message: null, detail: null, detailTop: 0 };
    clamp();
    canvas.classList.remove("hidden");
    paint();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    for (;;) {
      const key = await window.GbaMenus.keys((k) => {
        if (st.detail != null) {
          if (k === "up" || k === "down") { st.detailTop = Math.max(0, Math.min((st.detailLines || 0) - 11, st.detailTop + (k === "up" ? -1 : 1))); paint(); return undefined; }
          return k === "a" || k === "b" || k === "start" ? "close-detail" : undefined;
        }
        if (st.bar) {
          if (k === "left" || k === "right") { st.filter = (st.filter + (k === "left" ? FILTERS.length - 1 : 1)) % FILTERS.length; st.cur[0].i = st.cur[1].i = 0; clamp(); se(); paint(); return undefined; }
          if (k === "down" || k === "a" || k === "b") { st.bar = false; se(); paint(); return undefined; }
          return undefined;
        }
        if (st.menu) {
          if (k === "left" || k === "right") { const i = st.menu.i === 6 ? 0 : st.menu.i; st.menu.i = (i + (k === "left" ? 5 : 1)) % 6; se(); paint(); return undefined; }
          if (k === "down" && st.menu.i === 0) { st.menu.i = 6; se(); paint(); return undefined; }
          if (k === "up" && st.menu.i === 6) { st.menu.i = 0; se(); paint(); return undefined; }
          if (k === "a") return "command";
          if (k === "b") { st.menu = null; paint(); return undefined; }
          return undefined;
        }
        if (k === "up" || k === "down" || k === "left" || k === "right") {
          if (move(k === "up" ? -1 : k === "down" ? 1 : 0, k === "left" ? -1 : k === "right" ? 1 : 0)) { se(); paint(); }
          return undefined;
        }
        if (k === "b") { st.bar = true; se(); paint(); return undefined; }
        if (k === "a") { st.menu = { i: 0 }; se(); paint(); return undefined; }
        if (k === "start" && current() != null) { st.detail = current(); st.detailTop = 0; se(); paint(); return undefined; }
        return undefined;
      }, { shoulders: true });
      if (key === "close-detail") { st.detail = null; paint(); continue; }
      if (key === "command") {
        const i = st.menu.i; st.menu = null;
        const r = await command(i);
        if (r === "exit") { close(); return opts.deck; }
        paint();
        continue;
      }
      if (key === "r" || key === "l") {
        const n = current();
        if (n == null) continue;
        if (key === "l") { if (remove(n)) se(); }
        else { const err = add(n, st.side ? "side" : "main"); if (err) { se("se_failure"); await say(err); } else se(); }
        clamp(); paint();
      }
    }
  }
  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }
  window.TrunkScreen = { open, close };
})();
