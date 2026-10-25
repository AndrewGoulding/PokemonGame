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
//     mode,      // (or "dismantle" or "trade": the card shop's, below)
//   })
// Two more ways the card shop opens it (opts.mode): "dismantle" (your cards, A on one to dismantle a spare copy for a
// token of its rarity) and "trade" (every card, A on one to trade tokens of its rarity for it); the right column
// shows your tokens (opts.tokens()), opts.action(card) says what A does ({ ask, run() -> message } or { error }),
// and B leaves. Each card's rarity (window.YUGIOH_RARITY) shows by its stars.
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
  const COMMANDS = ["TO MAIN DECK", "FILTER", "SORT", "CHANGE VIEW", "DECK MODE", "EXIT", "TO SIDE DECK", "INVENTORY"];

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
  const trunkAll = () => (st.opts.mode === "trade" ? st.opts.cards.cards.map((c, n) => n).filter((n) => n > 0 && card(n))
    : Object.keys(st.opts.trunk).map(Number).filter((n) => st.opts.trunk[n] > 0 && card(n)));
  const RARITY_NAME = { c: "Common", r: "Rare", s: "Super Rare", u: "Ultra Rare", x: "Secret Rare" };
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
    s.text(st.opts.title || "Trunk", 3, 0, WHITE, SHADE);
    const fus = st.deck.main.filter(isFusion).length;
    if (!st.opts.mode) { digits(g, st.deck.main.length - fus, 111, 3); digits(g, fus, 135, 3); digits(g, st.deck.side.length, 159, 3); }
    const dn = st.opts.mode ? "Tokens" : st.side ? "Side Deck" : st.opts.deckName || "Deck";
    s.text(dn, 237 - s.textWidth(dn), 0, WHITE, SHADE);
    // The filters' counts, for the column the cursor's in, and the sort's icon.
    counts(st.col).forEach((v, i) => digits(g, v, COUNT_AT[i][0], COUNT_AT[i][1]));
    draw(g, "sort-" + st.sort, 200, 16);
    // The columns.
    // (the card shop's: your tokens down the right, each rarity's)
    if (st.opts.mode) {
      const t = st.opts.tokens();
      ["c", "r", "s", "u", "x"].forEach((k, r) => {
        s.text(RARITY_NAME[k], 123, 33 + 16 * r, WHITE, SHADE);
        const v = String(t[k] || 0); s.text(v, 237 - s.textWidth(v), 33 + 16 * r, YELLOW, SHADE);
      });
    }
    for (const c of st.opts.mode ? [0] : [0, 1]) {
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
      const rar = RARITY_NAME[(window.YUGIOH_RARITY || "")[n]];
      if (rar) s.text(rar, 237 - s.textWidth(rar, "small"), 118, rar === "Common" ? WHITE : YELLOW, SHADE, "small");
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
      draw(g, "cmd-menu", 16, 64);
      // (INVENTORY, this game's own: a second slot below, the menu's own slot and edge copied along, a pack for its icon)
      if (st.opts.inventory) {
        const m = T("cmd-menu"), pk = image("assets/sprites/items/booster/legend-of-blue-eyes-pack.png");
        if (ready(m)) g.drawImage(m, 8, 24, 32, 32, 16 + 32, 64 + 24, 32, 32);
        if (ready(pk)) g.drawImage(pk, 4, 2, 24, 28, 50, 92, 20, 24);
      }
      draw(g, "cmd-icons", 16, 64);
      const i = st.menu.i, [x, y] = i < 6 ? [24 + 24 * i, 68] : [24 + 24 * (i - 6), 92];
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
    if (st.inv && !st.message) {
      const rows = st.inv.rows, h = 24 + 11 * rows.length;
      g.fillStyle = "#c8a020"; g.fillRect(16, 8, 208, h); g.fillStyle = BLUE_BOX; g.fillRect(17, 9, 206, h - 2);
      top.text("Inventory", 24, 10, YELLOW, SHADE);
      rows.forEach((r, k) => {
        const c = k === st.inv.i ? YELLOW : WHITE, y = 26 + 11 * k;
        top.text(r.label, 32, y, c, SHADE, "small");
        const v = String(r.count); top.text(v, 216 - top.textWidth(v, "small"), y, c, SHADE, "small");
        if (k === st.inv.i) top.text("▶", 22, y, c, SHADE, "small");
      });
    }
    if (st.message) {
      const ml = st.message.split("\n"), mh = 12 + 14 * ml.length;
      g.fillStyle = "#c8a020"; g.fillRect(16, 60, 208, mh); g.fillStyle = BLUE_BOX; g.fillRect(17, 61, 206, mh - 2);
      ml.forEach((l, i) => top.text(l, 24, 64 + 14 * i, WHITE, SHADE));
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
        if (dx > 0 && (col === GRID - 1 || m.i === list.length - 1)) { if (st.opts.mode) return false; st.col = 1; return true; }
        if (dx < 0 && col === 0) return false;
        m.i += dx; clamp(); return true;
      }
      if (dy < 0 && m.i < GRID) { st.bar = true; return true; }
      if (m.i + dy * GRID >= 0 && m.i + dy * GRID < list.length) { m.i += dy * GRID; clamp(); return true; }
      return false;
    }
    if (dx) { if (!st.opts.mode && (dx > 0) === (st.col === 0)) { st.col = dx > 0 ? 1 : 0; clamp(); return true; } return false; }
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
    if (i === 7) return inventory();
  }
  // INVENTORY (this game's own): what you have besides cards, your booster packs and your tokens (opts.inventory():
  // [{ label, count, pack }]); A on a pack opens one (opts.openPack(pack), GX's opening over the Trunk).
  async function inventory() {
    let i = 0;
    for (;;) {
      const rows = st.opts.inventory();
      i = Math.max(0, Math.min(i, rows.length - 1));
      st.inv = { rows, i }; paint();
      const k = await window.GbaMenus.keys((key) => {
        if (key === "up" || key === "down") { i = (i + (key === "up" ? rows.length - 1 : 1)) % rows.length; st.inv.i = i; se(); paint(); return undefined; }
        return key === "a" || key === "b" ? key : undefined;
      });
      if (k === "b") { se(); st.inv = null; return; }
      const row = rows[i];
      if (!row.pack || !row.count) { se("se_failure"); continue; }
      se();
      st.message = "Open a " + row.label + " pack?\nA: Yes   B: No"; paint();
      const yes = (await window.GbaMenus.keys((key) => (key === "a" || key === "b" ? key : undefined))) === "a";
      st.message = null; paint();
      if (yes) { await st.opts.openPack(row.pack); clamp(); }
    }
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
          if (st.menu.i >= 6) {
            if ((k === "right" && st.menu.i === 6 || k === "left" && st.menu.i === 7) && st.opts.inventory) { st.menu.i = 13 - st.menu.i; se(); paint(); return undefined; }
            if (k === "up") { st.menu.i -= 6; se(); paint(); return undefined; }
            if (k === "left" || k === "right") return undefined;
          }
          if (k === "left" || k === "right") { st.menu.i = (st.menu.i + (k === "left" ? 5 : 1)) % 6; se(); paint(); return undefined; }
          if (k === "down" && (st.menu.i === 0 || st.menu.i === 1 && st.opts.inventory)) { st.menu.i += 6; se(); paint(); return undefined; }
          if (k === "a") return "command";
          if (k === "b") { st.menu = null; paint(); return undefined; }
          return undefined;
        }
        if (k === "up" || k === "down" || k === "left" || k === "right") {
          if (move(k === "up" ? -1 : k === "down" ? 1 : 0, k === "left" ? -1 : k === "right" ? 1 : 0)) { se(); paint(); }
          return undefined;
        }
        if (st.opts.mode && (k === "a" || k === "b")) return k === "a" ? (current() != null ? "pick" : undefined) : "leave";
        if (st.opts.mode && (k === "l" || k === "r" || k === "select")) return undefined;
        if (k === "b") { st.bar = true; se(); paint(); return undefined; }
        if (k === "a") { st.menu = { i: 0 }; se(); paint(); return undefined; }
        if (k === "start" && current() != null) { st.detail = current(); st.detailTop = 0; se(); paint(); return undefined; }
        return undefined;
      }, { shoulders: true });
      if (key === "close-detail") { st.detail = null; paint(); continue; }
      if (key === "leave") { se(); close(); return opts.deck; }
      if (key === "pick") {
        const a = opts.action(current());
        if (a.error) { se("se_failure"); await say(a.error); continue; }
        se();
        st.message = a.ask + "\nA: Yes   B: No"; paint();
        const yes = (await window.GbaMenus.keys((k) => (k === "a" || k === "b" ? k : undefined))) === "a";
        st.message = null;
        if (yes) { const msg = a.run(); clamp(); se(); if (msg) await say(msg); }
        paint();
        continue;
      }
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
  // (The card itself, for another screen (DuelScreen's START): drawn as here, from line `topLine` of its text; how many lines it has.)
  function detail(g, s, n, cards, topLine) {
    const saved = st;
    st = { opts: { cards }, detailTop: topLine || 0 };
    try { paintDetail(g, s, n); return st.detailLines; } finally { st = saved; }
  }
  window.TrunkScreen = { open, close, detail };
})();

// ---------- The duel screen: Yu-Gi-Oh! GX Duel Academy's ----------
//
// A duel of Duel Monsters (game/table-players.js's DuelMonsters: The Eternal Duelist Soul's rules, its cards'
// effects and its computer duelist), on GX Duel Academy's field, its graphics from that cartridge
// (assets/yugioh/duel/, tools/build-gx-trunk.py): the floor and the zones in perspective with the academy's mat
// between them, your life points at the bottom left and your opponent's at the top, the phases down the left
// with the turn's count, the piles' counts at the right, your hand along the bottom (the card under the cursor
// raised) and the backs of your opponent's along the top, and the card under the cursor along the bottom line
// (its name, attribute, type, level and ATK/DEF). The cards on the field are drawn as the game draws them: a
// card's shape in its zone, in its kind's colours (face up), or its back (face down), lying sideways in Defense
// Position.
//
// The controls are the game's: the hand cursor moves over your hand and both sides of the field; A on a card
// opens its menu (Summon, Set, Activate, Flip Summon, the change of position, its effect, Detail Screen), on a
// Graveyard its cards; START opens the phases' menu (Battle Phase, Main Phase 2, End Turn) and, over a card,
// B or START shows the card itself. In the Battle Phase, A on a monster that can attack, then on its target.
// The questions the cards' effects ask come up as menus, or as the cursor over the zones to pick.
//
//   const result = await DuelScreen.open({
//     cards,   // window.YUGIOH_CARDS
//     deck,    // your deck: [cardNumber, ...] (its main deck and Fusion Deck)
//     foe,     // { name, deck: [cardNumber, ...] }: the computer duelist (DuelMonsters.ai)
//     you,     // your name
//     floor,   // "gym" (the default: the Gym's boards) or "red" (the tutorial's)
//   });        // -> { winner: 0 (you), 1 or -1 (a draw), reason }
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
  const ready = (img) => img && img.complete && img.naturalWidth;
  const P = (n) => image("assets/yugioh/duel/" + n + ".png");
  const TR = (n) => image("assets/yugioh/trunk/" + n + ".png");
  const WHITE = [255, 255, 255], SHADE = [40, 40, 48], NAME_BLUE = [24, 56, 240], NAME_SHADE = [184, 192, 248];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n || "se_select"); };

  // ---------- The field ----------
  // Its zones, where GX Duel Academy's grid has them (each a quad: its top left, top right, bottom right and
  // bottom left corners). Your monsters' row and your Spells' and Traps' along the bottom of the mat, your
  // opponent's along its top (theirs from their side: their first zone at your right); the piles at the corners
  // (your deck at the bottom right, your Fusion Deck at the bottom left, theirs opposite), the Graveyards and the
  // Field Spells' zones beside the monsters' rows.
  const row = (y0, y1, top, bottom) => top.slice(0, 5).map((x, i) => [[x, y0], [top[i + 1], y0], [bottom[i + 1], y1], [bottom[i], y1]]);
  const quad = (x0, x1, y0, x2, x3, y1) => [[x0, y0], [x1, y0], [x3, y1], [x2, y1]];
  const FIELD = [
    { mon: row(65, 84, [54, 78, 105, 134, 161, 185], [48, 75, 104, 135, 164, 191]), st: row(88, 111, [46, 73, 103, 136, 166, 193], [40, 69, 102, 137, 170, 199]),
      field: quad(30, 47, 65, 23, 41, 84), grave: quad(192, 209, 65, 198, 216, 84), banished: quad(214, 229, 65, 221, 238, 84),
      deck: quad(200, 219, 90, 207, 227, 111), fusion: quad(20, 39, 90, 12, 32, 111), pile: { deck: ["pile-right", 200, 88], fusion: ["pile-left", 8, 88] } },
    { mon: row(42, 57, [59, 82, 107, 132, 157, 180], [55, 79, 106, 133, 160, 184]).reverse(), st: row(27, 38, [63, 85, 109, 130, 154, 176], [60, 83, 108, 131, 156, 179]).reverse(),
      field: quad(185, 200, 42, 190, 206, 57), grave: quad(39, 54, 42, 33, 49, 57), banished: quad(20, 33, 42, 12, 27, 57),
      deck: quad(46, 60, 27, 42, 56, 38), fusion: quad(179, 193, 27, 183, 197, 38), pile: { deck: ["pile-opp-left", 40, 24], fusion: ["pile-opp-right", 176, 24] } }
  ];
  // (A point in a quad: u across it, v down it.)
  function at(q, u, v) {
    const tx = q[0][0] + (q[1][0] - q[0][0]) * u, ty = q[0][1] + (q[1][1] - q[0][1]) * u;
    const bx = q[3][0] + (q[2][0] - q[3][0]) * u, by = q[3][1] + (q[2][1] - q[3][1]) * u;
    return [tx + (bx - tx) * v, ty + (by - ty) * v];
  }
  const centre = (q) => at(q, 0.5, 0.5);
  function shape(g, q, u0, u1, v0, v1, fill, dy) {
    const pts = [at(q, u0, v0), at(q, u1, v0), at(q, u1, v1), at(q, u0, v1)];
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, Math.round(x), Math.round(y) + (dy || 0)));
    g.closePath(); g.fillStyle = fill; g.fill();
  }
  // The kinds' colours, the hand's cards' (their palettes' last four: dark to light), and the backs'.
  const COLOURS = { normal: ["#847b18", "#a5a539", "#cece5a", "#f7f77b"], effect: ["#ad5a00", "#de8c10", "#ffa521", "#ffce7b"], fusion: ["#6b009c", "#9431bd", "#bd63de", "#e79cff"],
    ritual: ["#426bd6", "#2984e7", "#109cef", "#00bdff"], spell: ["#007b29", "#00a54a", "#00d66b", "#00ff94"], trap: ["#940073", "#bd318c", "#ef63ad", "#ff9cef"] };
  const BACK = ["#5a2100", "#944a08", "#ce7310", "#ffa500"];
  // A card on the field: upright in Attack Position (and a Spell or Trap), sideways in Defense; its edge below it.
  function fieldCard(g, q, no, faceUp, defense) {
    const [u0, u1, v0, v1] = defense ? [0.08, 0.92, 0.2, 0.8] : [0.24, 0.76, 0.06, 0.94];
    const c = faceUp ? COLOURS[kindOf(no)] : BACK, du = u1 - u0, dv = v1 - v0;
    shape(g, q, u0, u1, v0, v1, "#848484", 1);
    shape(g, q, u0, u1, v0, v1, c[0]);
    shape(g, q, u0 + du * 0.06, u1 - du * 0.06, v0 + dv * 0.06, v1 - dv * 0.06, c[2]);
    if (faceUp) {
      // (its picture's window, dark, edged light)
      const [a0, a1, b0, b1] = defense ? [0.3, 0.7, 0.18, 0.82] : [0.2, 0.8, 0.18, 0.62];
      const iu0 = u0 + du * a0, iu1 = u0 + du * a1, iv0 = v0 + dv * b0, iv1 = v0 + dv * b1;
      shape(g, q, iu0, iu1, iv0, iv1, "#c6c6c6");
      shape(g, q, iu0 + (iu1 - iu0) * 0.12, iu1 - (iu1 - iu0) * 0.12, iv0 + (iv1 - iv0) * 0.12, iv1 - (iv1 - iv0) * 0.12, "#000000");
    } else {
      shape(g, q, u0 + du * 0.25, u1 - du * 0.25, v0 + dv * 0.25, v1 - dv * 0.25, c[0]);
      shape(g, q, u0 + du * 0.38, u1 - du * 0.38, v0 + dv * 0.38, v1 - dv * 0.38, "#000000");
    }
  }
  function outline(g, q, colour) {
    g.beginPath();
    q.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, x + 0.5, y + 0.5));
    g.closePath(); g.strokeStyle = colour; g.lineWidth = 1; g.stroke();
  }

  let st = null, timer = 0;
  const DMon = () => window.DuelMonsters;
  const cardOf = (no) => st.opts.cards.cards[no];
  const kindOf = (no) => (cardOf(no) || [])[2] || "normal";
  const isMonster = (no) => ["normal", "effect", "fusion", "ritual"].includes(kindOf(no));

  // ---------- The cursor's places ----------
  // Its rows, bottom to top: your hand, your Spells and Traps (with your piles), your monsters (with your Field
  // Spell's zone and your Graveyard), your opponent's monsters and their Spells and Traps.
  function places() {
    const d = st.duel, rows = [];
    const hand = d.players[0].hand;
    rows.push(hand.map((c, i) => ({ hand: i, card: c, x: handX(i, hand.length) + 12, y: 132 })));
    for (const [p, list] of [[0, [["fusion"], ["st", 0], ["st", 1], ["st", 2], ["st", 3], ["st", 4], ["deck"]]],
      [0, [["field"], ["mon", 0], ["mon", 1], ["mon", 2], ["mon", 3], ["mon", 4], ["grave"], ["banished"]]],
      [1, [["banished"], ["grave"], ["mon", 4], ["mon", 3], ["mon", 2], ["mon", 1], ["mon", 0], ["field"]]],
      [1, [["deck"], ["st", 4], ["st", 3], ["st", 2], ["st", 1], ["st", 0], ["fusion"]]]]) {
      rows.push(list.map(([k, i]) => {
        const F = FIELD[p], q = k === "mon" ? F.mon[i] : k === "st" ? F.st[i] : F[k], [x, y] = centre(q);
        const zone = k === "mon" ? d.players[p].zones[i] : k === "st" ? d.players[p].zones[5 + i] : k === "field" ? d.players[p].zones[10] : null;
        return { p, k, i: k === "mon" ? i : k === "st" ? 5 + i : k === "field" ? 10 : null, q, zone, x, y };
      }));
    }
    return rows;
  }
  const handX = (i, n) => { const step = n > 1 ? Math.min(20, Math.floor(124 / (n - 1))) : 20; return Math.round(120 - ((n - 1) * step + 24) / 2) + i * step; };
  function here() { const rows = places(), r = rows[st.cur.r] || []; return r[Math.min(st.cur.i, r.length - 1)] || null; }
  function moveCursor(k) {
    const rows = places();
    if (k === "left" || k === "right") {
      const r = rows[st.cur.r]; if (!r.length) return false;
      const i = Math.max(0, Math.min(r.length - 1, Math.min(st.cur.i, r.length - 1) + (k === "left" ? -1 : 1)));
      if (i === st.cur.i) return false;
      st.cur.i = i; return true;
    }
    const h = here(), x = h ? h.x : 120;
    let r = st.cur.r;
    do { r += k === "up" ? 1 : -1; } while (r >= 0 && r < rows.length && !rows[r].length);
    if (r < 0 || r >= rows.length) return false;
    let best = 0;
    rows[r].forEach((e, i) => { if (Math.abs(e.x - x) < Math.abs(rows[r][best].x - x)) best = i; });
    st.cur = { r, i: best };
    return true;
  }
  // (The card a place shows, if you may see it.)
  function seen(e) {
    if (!e) return null;
    const d = st.duel, pl = d.players[e.p == null ? 0 : e.p];
    if (e.hand != null) return e.card;
    if (e.zone) return e.zone.faceUp || e.p === 0 ? e.zone.card : null;
    if (e.k === "grave") return pl.grave[pl.grave.length - 1] || null;
    if (e.k === "banished") return pl.banished[pl.banished.length - 1] || null;
    return null;
  }

  // ---------- Drawing ----------
  function draw(g, name, x, y) { const im = P(name); if (ready(im)) g.drawImage(im, x, y); }
  function drawT(g, name, x, y) { const im = TR(name); if (ready(im)) g.drawImage(im, x, y); }
  function art(g, n, x, y, w, h) {
    const C = st.opts.cards, sheet = image("assets/yugioh/cards/" + String(Math.floor(n / C.perSheet)).padStart(2, "0") + ".png");
    if (!ready(sheet)) return;
    const k = n % C.perSheet;
    g.drawImage(sheet, k % C.across * 80, Math.floor(k / C.across) * 80, 80, 80, x, y, w, h);
  }
  function box(g, s, lines, y) {
    const w = Math.max(...lines.map((l) => s.textWidth(l))) + 16, h = lines.length * 14 + 6, x = Math.round((W - w) / 2);
    g.fillStyle = "#c8a020"; g.fillRect(x, y, w, h); g.fillStyle = "#2830a8"; g.fillRect(x + 1, y + 1, w - 2, h - 2);
    lines.forEach((l, i) => s.text(l, x + 8, y + 3 + 14 * i, WHITE, SHADE));
  }
  const BAR_TEXT = { pink: [255, 156, 239], blue: [0, 189, 255], green: [0, 255, 148], grey: [255, 255, 255] };
  function barColour(label) {
    if (/^(Summon|Special|Flip Summon|Attack|Battle Phase|Yes)/.test(label)) return "pink";
    if (/^(Set|Attack Position|Defense Position|Main Phase 2|End Turn|End Battle)/.test(label)) return "blue";
    if (/^(Activate|Use|Detail|Look)/.test(label)) return "green";
    return "grey";
  }
  // (A menu of the game's bars, its top left at x, y: the chosen one lit in its colour.)
  function bars(g, s, m) {
    const n = m.labels.length, x = Math.max(0, Math.min(W - 96, m.x)), y = Math.max(0, Math.min(144 - 16 * Math.min(n, 7), m.y));
    const top = Math.max(0, Math.min(m.i - 3, n - 7));
    m.labels.slice(top, top + 7).forEach((label, k) => {
      const i = top + k, col = barColour(label), lit = i === m.i;
      draw(g, lit && col !== "grey" ? "bar-" + col : "bar", x, y + 16 * k);
      if (lit && col === "grey") { g.fillStyle = "rgba(248,216,48,0.45)"; g.fillRect(x + 4, y + 16 * k + 3, 88, 10); }
      let t = label;
      while (t && s.textWidth(t, "small") > 84) t = t.slice(0, -1);
      s.text(t, x + 7, y + 16 * k + 2, lit ? WHITE : BAR_TEXT[col], lit ? SHADE : [40, 40, 40], "small");
    });
    if (n > 7) { g.fillStyle = "#f8d830"; if (top > 0) g.fillRect(x + 44, y - 3, 8, 2); if (top + 7 < n) g.fillRect(x + 44, y + 113, 8, 2); }
  }
  function info(g, s, no) {
    draw(g, "info", 0, 145);
    if (!no) return;
    const c = cardOf(no);
    let name = c[0];
    while (name && s.textWidth(name) > 148) name = name.slice(0, -1);
    s.text(name, 2, 145, NAME_BLUE, NAME_SHADE);
    if (c[2] === "spell" || c[2] === "trap") {
      drawT(g, "attr-" + (c[2] === "spell" ? 7 : 8), 152, 144);
      if (c[8]) drawT(g, c[2] + "-" + c[8], 168, 144);
      return;
    }
    if (c[4]) drawT(g, "attr-" + c[4], 152, 144);
    if (c[3]) drawT(g, "type-" + c[3], 168, 144);
    draw(g, "star", 184, 144); draw(g, "stat-" + Math.min(9, c[5]), 184, 152);
    draw(g, "atk", 192, 144); draw(g, "def", 192, 152);
    const z = st.infoZone;
    const atk = z && z.card.no === no && z.faceUp ? st.duel.atkOf(z) : c[6], def = z && z.card.no === no && z.faceUp ? st.duel.defOf(z) : c[7];
    for (const [v, y] of [[atk, 144], [def, 152]]) { const t = String(Math.max(0, v)); for (let i = 0; i < t.length; i++) draw(g, "stat-" + t[i], 240 - 8 * (t.length - i), y); }
  }
  function lpDigits(g, v, y) { const t = String(Math.max(0, Math.round(v))).padStart(5, "0").slice(-5); for (let i = 0; i < 5; i++) draw(g, "lp-" + t[i], 8 + 8 * i, y); }
  function counter(g, v, y) { draw(g, "count-top", 208, y); const t = String(v).padStart(3, "0"); for (let i = 0; i < 3; i++) draw(g, "count-" + t[i], 221 + 5 * i, y + 4); }

  function paint() {
    if (!st) return;
    const s = window.GbaMenus.Surface(), top = window.GbaMenus.Surface();
    const off = paint.c || (paint.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (st.detail != null) {
      st.detailLines = window.TrunkScreen.detail(g, s, st.detail, st.opts.cards, st.detailTop);
      return finish(g, s, top);
    }
    const d = st.duel;
    draw(g, "floor-" + (st.opts.floor || "gym"), 0, 0); draw(g, "grid", 0, 0);
    // The piles, the Graveyards' and the removed cards' tops, and the cards in the zones.
    for (const p of [0, 1]) {
      const F = FIELD[p], pl = d.players[p];
      if (pl.deck.length) draw(g, F.pile.deck[0], F.pile.deck[1], F.pile.deck[2]);
      if (pl.fusion.length) draw(g, F.pile.fusion[0], F.pile.fusion[1], F.pile.fusion[2]);
      for (const k of ["grave", "banished"]) { const c = pl[k][pl[k].length - 1]; if (c) fieldCard(g, F[k], c.no, true, false); }
      for (let i = 0; i < 11; i++) {
        const z = pl.zones[i];
        if (!z) continue;
        const q = i < 5 ? F.mon[i] : i < 10 ? F.st[i - 5] : F.field;
        if (st.flash && st.flash.zone === z && st.blink) continue;
        fieldCard(g, q, z.card.no, z.faceUp, i < 5 && z.defense);
      }
    }
    // (the zones to pick from, blinking; the attack's line)
    if (st.pick) for (const e of st.pick.list) if (st.blink || e.chosen) outline(g, e.q, e.chosen ? "#f86030" : "#f8f848");
    if (st.arrow) {
      g.strokeStyle = "#f83018"; g.lineWidth = 2; g.beginPath(); g.moveTo(st.arrow[0][0], st.arrow[0][1]); g.lineTo(st.arrow[1][0], st.arrow[1][1]); g.stroke();
    }
    draw(g, "hud", 0, 0);
    lpDigits(g, st.lp[1], 0); lpDigits(g, st.lp[0], 128);
    // The phases, this one lit, and the turn's count.
    draw(g, "time-top", 0, 16); draw(g, "time-bottom", 0, 104); draw(g, "phases", 0, 32);
    const ph = { draw: "dp", standby: "sp", main1: "m1", battle: "bp", main2: "m2", end: "ep" }[d.phase];
    if (ph) draw(g, "phase-" + ph + "-lit", 0, 48 + 8 * ["dp", "sp", "m1", "bp", "m2", "ep"].indexOf(ph));
    const turn = String(d.turn + 1);
    for (let i = 0; i < turn.length && i < 3; i++) draw(g, "turn-" + turn[turn.length - 1 - i], 13 - 5 * i, 36);
    counter(g, d.players[1].deck.length, 8); counter(g, d.players[0].deck.length, 112);
    // The hands: theirs, backs along the top; yours along the bottom, the card under the cursor raised.
    const theirs = d.players[1].hand.length, step = theirs > 1 ? Math.min(16, Math.floor(112 / (theirs - 1))) : 16;
    // (shown face up while Respect Play, Ceremonial Bell or your Mind on Air says so)
    const shown = [0, 1].some((q) => d.allZones(q).some((z) => { const e = d.live(z); return e && (e.revealsHands === "both" || (e.revealsHands === "theirs" && q === 0)); }));
    for (let i = 0; i < theirs; i++) draw(g, shown ? "hand-" + kindOf(d.players[1].hand[i].no) : "back", Math.round(120 - ((theirs - 1) * step + 16) / 2) + i * step, 0);
    const h = here(), mine = d.players[0].hand;
    mine.forEach((c, i) => { const up = h && h.hand === i && st.cursorOn; draw(g, "hand-" + kindOf(c.no), handX(i, mine.length), up ? 113 : 122); });
    st.infoZone = h && h.zone || null;
    info(g, s, st.show != null ? st.show : (seen(h) || {}).no);
    // The cursor: down at the hand, or at a zone.
    if (h && st.cursorOn) {
      if (h.hand != null) draw(g, "cursor-down", h.x + 1, 97);
      else draw(g, "cursor", Math.round(h.x) - 6, Math.round(h.y) - 6);
    }
    g.drawImage(s.canvas(), 0, 0);
    // The card being played, big, at the middle.
    if (st.big) {
      const c = cardOf(st.big), col = COLOURS[c[2]] || COLOURS.normal;
      g.fillStyle = "#202020"; g.fillRect(77, 26, 86, 108);
      g.fillStyle = col[1]; g.fillRect(78, 27, 84, 106);
      g.fillStyle = col[3]; g.fillRect(80, 29, 80, 10);
      g.fillStyle = "#202020"; g.fillRect(81, 42, 78, 78);
      art(g, st.big, 82, 43, 76, 76);
      top.text(c[0], 82, 28, [32, 32, 32], col[2], "small");
      if (c[6] >= 0) top.text("ATK/" + c[6] + " DEF/" + c[7], 84, 121, [32, 32, 32], col[2], "small");
    }
    if (st.banner) box(g, top, [st.banner], 66);
    if (st.message) box(g, top, st.message.split("\n"), 40);
    if (st.menu) bars(g, top, st.menu);
    if (st.list) paintList(g, top);
    finish(g, null, top);
  }
  // A list of cards (a Graveyard, a deck to search, a hand to pick from): their names, the one picked lit.
  function paintList(g, s) {
    const L = st.list, n = L.cards.length, rows = 7, topI = Math.max(0, Math.min(L.i - 3, n - rows));
    g.fillStyle = "#c8a020"; g.fillRect(40, 20, 160, 120); g.fillStyle = "#182060"; g.fillRect(41, 21, 158, 118);
    let title = L.title;
    while (title && s.textWidth(title, "small") > 148) title = title.slice(0, -1);
    s.text(title, 46, 22, [248, 216, 48], SHADE, "small");
    L.cards.slice(topI, topI + rows).forEach((c, k) => {
      const i = topI + k, y = 38 + 14 * k;
      if (i === L.i) { g.fillStyle = "#3858d0"; g.fillRect(44, y - 1, 152, 13); }
      g.fillStyle = (COLOURS[kindOf(c.no)] || COLOURS.normal)[2]; g.fillRect(47, y + 2, 6, 8);
      let t = L.hidden ? "?" : cardOf(c.no)[0];
      while (t && s.textWidth(t, "small") > 130) t = t.slice(0, -1);
      s.text(t, 57, y, L.chosen && L.chosen.has(i) ? [248, 152, 72] : WHITE, SHADE, "small");
    });
    if (!n) s.text("(none)", 57, 38, WHITE, SHADE, "small");
  }
  function finish(g, s, top) {
    if (s) g.drawImage(s.canvas(), 0, 0);
    g.drawImage(top.canvas(), 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, W * 2, H * 2);
    out.drawImage(g.canvas, 0, 0, W * 2, H * 2);
  }

  // ---------- Showing what happens ----------
  async function lpTo(p, v) {
    const from = st.lp[p], steps = 16;
    for (let k = 1; k <= steps; k++) { st.lp[p] = from + (v - from) * k / steps; paint(); await sleep(25); }
    st.lp[p] = v; paint();
  }
  async function flash(z, times) {
    st.flash = { zone: z };
    for (let k = 0; k < (times || 3) * 2; k++) { st.blink = !st.blink; paint(); await sleep(70); }
    st.flash = null; st.blink = false; paint();
  }
  async function bigCard(no, ms) { st.big = no; paint(); await sleep(ms || 650); st.big = null; paint(); }
  async function banner(text, ms) { st.banner = text; paint(); await sleep(ms || 600); st.banner = null; paint(); }
  const PHASES = { draw: "Draw Phase", standby: "Standby Phase", main1: "Main Phase 1", battle: "Battle Phase", main2: "Main Phase 2", end: "End Phase" };
  function zoneQuad(z) {
    const l = st.duel.locate(z);
    if (!l) return null;
    const F = FIELD[l.p];
    return l.i < 5 ? F.mon[l.i] : l.i < 10 ? F.st[l.i - 5] : F.field;
  }
  async function onEvent(d, ev) {
    if (!st) return;
    const theirs = ev.p === 1;
    switch (ev.type) {
      case "turn": paint(); await banner(ev.p === 0 ? "Your turn" : st.opts.foe.name + "'s turn", 700); break;
      case "phase": if (ev.phase === "battle" || ev.phase === "main2" || ev.phase === "end" && theirs) await banner(PHASES[ev.phase], 450); else paint(); break;
      case "draw": paint(); await sleep(120); break;
      case "summon": paint(); if (ev.zone && ev.zone.faceUp) await bigCard(ev.card.no, 600); else await sleep(250); break;
      case "set-spell": paint(); await sleep(250); break;
      case "flip": paint(); await bigCard(ev.zone.card.no, 500); break;
      case "activate":
        paint();
        if (theirs) { st.message = st.opts.foe.name + " activates\n" + cardOf(ev.card.no)[0] + "!"; paint(); }
        await bigCard(ev.card.no, theirs ? 900 : 600);
        st.message = null; paint(); break;
      case "attack": {
        const a = zoneQuad(ev.attacker), t = ev.target ? zoneQuad(ev.target) : null;
        if (a) { st.arrow = [centre(a), t ? centre(t) : ev.p === 0 ? [120, 12] : [120, 140]]; paint(); await sleep(450); st.arrow = null; paint(); }
        break;
      }
      case "lp": await lpTo(ev.p, ev.lp); break;
      case "destroy": if (ev.zone) await flash(ev.zone, 3); break;
      case "position": case "control": paint(); await sleep(200); break;
      case "over": paint(); break;
      default: break;
    }
  }

  // ---------- Your choices (the duel's controller for you) ----------
  function keys(fn) { return window.GbaMenus.keys(fn); }
  // A menu of bars; resolves with the label's index, or -1 for B (when it may be cancelled).
  async function menu(labels, x, y, opts) {
    opts = opts || {};
    st.menu = { labels, x, y, i: opts.i || 0 }; se(); paint();
    const r = await keys((k) => {
      const m = st.menu;
      if (k === "up" || k === "down") { m.i = (m.i + (k === "up" ? labels.length - 1 : 1)) % labels.length; se(); paint(); return undefined; }
      if (k === "a") return m.i;
      if (k === "b" && opts.cancel !== false) return -1;
      if (k === "start" && opts.detail) { const no = opts.detail(m.i); if (no) { showDetail(no); } return undefined; }
      return undefined;
    });
    st.menu = null; paint();
    return r;
  }
  async function showDetail(no) {
    st.detail = no; st.detailTop = 0; se(); paint();
    await keys((k) => {
      if (k === "up" || k === "down") { st.detailTop = Math.max(0, Math.min((st.detailLines || 0) - 11, st.detailTop + (k === "up" ? -1 : 1))); paint(); return undefined; }
      return k === "a" || k === "b" || k === "start" ? true : undefined;
    });
    st.detail = null; paint();
  }
  // A question and its answers as bars, under the question's box.
  async function ask(prompt, labels, cancel) {
    st.message = prompt; paint();
    const lines = String(prompt).split("\n").length;
    const r = await menu(labels, 72, 46 + 14 * lines, { cancel });
    st.message = null; paint();
    return r;
  }
  // A list of cards to look through (and pick from: `count` of them, or none).
  async function cardList(title, cards, opts) {
    opts = opts || {};
    st.list = { title, cards, i: 0, hidden: !!opts.hidden, chosen: opts.count ? new Set() : null }; st.cursorOn = false; se(); paint();
    const r = await keys((k) => {
      const L = st.list, n = L.cards.length;
      if ((k === "up" || k === "down") && n) { L.i = (L.i + (k === "up" ? n - 1 : 1)) % n; st.show = L.hidden ? null : L.cards[L.i].no; se(); paint(); return undefined; }
      if (k === "start" && n && !L.hidden) { showDetail(L.cards[L.i].no); return undefined; }
      if (k === "a" && opts.count && n) {
        if (L.chosen.has(L.i)) L.chosen.delete(L.i); else L.chosen.add(L.i);
        se(); paint();
        if (L.chosen.size >= Math.min(opts.count, n)) return [...L.chosen];
        return undefined;
      }
      if (k === "b" || (k === "a" && !opts.count)) return opts.count ? (opts.cancel ? null : undefined) : null;
      return undefined;
    });
    st.list = null; st.show = null; st.cursorOn = true; paint();
    return r;
  }
  // Pick zones: the cursor goes from one to the next of them, A picks (or unpicks).
  async function pickZones(req) {
    const rows = places(), list = req.options.map((o, k) => {
      const e = rows.flat().find((e) => e.zone && e.zone === o.zone) || { q: zoneQuad(o.zone), x: 120, y: 80 };
      return { k, q: e.q, x: e.x, y: e.y, zone: o.zone, chosen: false };
    });
    st.pick = { list }; let i = 0;
    const need = req.max > 1 ? req.max : 1;
    st.message = req.prompt; paint();
    const blink = setInterval(() => { st.blink = !st.blink; paint(); }, 220);
    const place = () => { const rs = places(); for (let r = 0; r < rs.length; r++) { const j = rs[r].findIndex((e) => e.zone === list[i].zone); if (j >= 0) { st.cur = { r, i: j }; return; } } };
    place(); paint();
    const r = await keys((k) => {
      if (k === "left" || k === "up") { i = (i + list.length - 1) % list.length; place(); se(); paint(); return undefined; }
      if (k === "right" || k === "down") { i = (i + 1) % list.length; place(); se(); paint(); return undefined; }
      if (k === "start") { const z = list[i].zone; if (z.faceUp || st.duel.controllerOf(z) === 0) showDetail(z.card.no); return undefined; }
      if (k === "a") {
        list[i].chosen = !list[i].chosen; se(); paint();
        const chosen = list.filter((e) => e.chosen).map((e) => e.k);
        if (chosen.length >= Math.min(need, list.length)) return need > 1 ? chosen : chosen[0];
        return undefined;
      }
      if (k === "b" && req.cancel) return -1;
      return undefined;
    });
    clearInterval(blink);
    st.pick = null; st.blink = false; st.message = null; paint();
    return r;
  }
  // The Main Phase and the Battle Phase: the cursor over the hand and the field, each card's menu, START's phases.
  function actionsFor(req, e) {
    const out = [];
    req.options.forEach((o, k) => {
      if (o.act === "battle" || o.act === "end" || o.end) return;
      if (e.hand != null ? o.card === e.card && !o.zone : (o.zone && o.zone === e.zone) || (e.zone && o.card === e.zone.card && o.from === "field")) out.push(k);
    });
    return out;
  }
  function actionLabel(o) {
    switch (o.act) {
      case "summon": return "Summon"; case "set-monster": case "set-spell": return "Set";
      case "activate": return "Activate"; case "ignition": case "hand-effect": return "Use effect";
      case "special-hand": return "Special Summon"; case "flip-summon": return "Flip Summon";
      case "position": return o.zone.defense ? "Attack Position" : "Defense Position";
      default: return o.zone && o.label && /attacks$/.test(o.label) ? "Attack" : o.label;
    }
  }
  async function fieldTurn(req) {
    st.cursorOn = true;
    // (the cursor starts at your hand in the Main Phase, at your monsters in the Battle Phase)
    if (req.type === "battle") { const rows = places(); const j = rows[2].findIndex((e) => req.options.some((o) => o.zone && o.zone === e.zone)); if (j >= 0) st.cur = { r: 2, i: j }; }
    else if (!places()[st.cur.r].length) st.cur = { r: places()[0].length ? 0 : 2, i: 1 };
    paint();
    for (;;) {
      const k = await keys((key) => {
        if (["up", "down", "left", "right"].includes(key)) { if (moveCursor(key)) { se(); paint(); } return undefined; }
        return key === "a" || key === "start" || key === "b" || key === "select" ? key : undefined;
      });
      const e = here();
      if (k === "b") { const no = seen(e); if (no) await showDetail(no.no); continue; }
      if (k === "start" || k === "select") {
        const opts = req.options.map((o, k2) => ({ o, k: k2 })).filter(({ o }) => o.act === "battle" || o.act === "end" || o.end);
        const labels = opts.map(({ o }) => o.act === "battle" ? "Battle Phase" : o.end ? "Main Phase 2" : "End Turn");
        const r = await menu(labels, 16, 48);
        if (r >= 0) return opts[r].k;
        continue;
      }
      if (!e) continue;
      if (e.k === "grave" || e.k === "banished") {
        const pl = st.duel.players[e.p];
        await cardList((e.p ? st.opts.foe.name + "'s " : "Your ") + (e.k === "grave" ? "Graveyard" : "removed cards"), pl[e.k].slice().reverse());
        continue;
      }
      const acts = actionsFor(req, e), card = seen(e);
      const labels = acts.map((k2) => actionLabel(req.options[k2]));
      if (card) labels.push("Detail Screen");
      if (!labels.length) continue;
      const r = await menu(labels, Math.round(e.x) - 30, (e.hand != null ? 120 : Math.round(e.y) - 8) - 16 * labels.length);
      if (r < 0) continue;
      if (r === acts.length) { await showDetail(card.no); continue; }
      const choice = acts[r];
      if (req.type === "battle") {
        st.attacker = req.options[choice].zone;
        return choice;
      }
      st.cursorOn = false; paint();
      return choice;
    }
  }
  async function attackTarget(req) {
    const direct = req.options.findIndex((o) => o.direct);
    const targets = req.options.map((o, k) => ({ o, k })).filter(({ o }) => !o.direct);
    if (direct >= 0) {
      const r = await ask("Attack which?", targets.map(({ o }) => o.label).concat(["Attack directly"]), true);
      return r < 0 ? -1 : r === targets.length ? direct : targets[r].k;
    }
    const r = await pickZones({ prompt: "Attack which monster?", options: targets.map(({ o }) => o), max: 1, cancel: true });
    return r < 0 || r == null ? -1 : targets[r].k;
  }
  const human = {
    async choose(d, req) {
      if (!st) return req.max > 1 ? [] : 0;
      switch (req.type) {
        case "main": case "battle": { const r = await fieldTurn(req); st.cursorOn = false; paint(); return r; }
        case "attack-target": return attackTarget(req);
        case "zones": return pickZones(req);
        case "cards": {
          const n = req.max > 1 ? req.max : 1;
          if (req.hidden) return req.max > 1 ? req.options.map((_, i) => i).slice(0, n) : Math.floor(Math.random() * req.options.length);
          const r = await cardList(req.prompt, req.options.map((o) => o.card), { count: n, cancel: req.cancel });
          if (r == null) return -1;
          return req.max > 1 ? r : r[0];
        }
        case "yesno": { const r = await ask(req.prompt, ["Yes", "No"], false); return r; }
        case "respond": {
          // (only when your opponent plays a card, summons or attacks: the rest of the duel's moments go by)
          const ev = req.event, pass = req.options.length - 1;
          if (req.link ? req.link.p !== 1 : !(ev && ev.p === 1 && /^(summoned|flip-summoned|special-summoned|attack)$/.test(ev.type))) return pass;
          const labels = req.options.map((o) => (o.pass ? "Don't" : o.label));
          const r = await ask(req.prompt + "\nActivate a card?", labels, false);
          return r < 0 ? req.options.length - 1 : r;
        }
        default: { const r = await ask(req.prompt, req.options.map((o) => o.label), false); return r < 0 ? 0 : r; }
      }
    }
  };

  async function open(opts) {
    const DM = DMon();
    st = { opts, cur: { r: 0, i: 0 }, lp: [8000, 8000], cursorOn: false, blink: false, menu: null, message: null, detail: null, detailTop: 0, list: null, pick: null };
    const duel = DM.create({ decks: [opts.deck, opts.foe.deck], controllers: [human, DM.ai()], names: [opts.you || "You", opts.foe.name], onEvent });
    st.duel = duel;
    canvas.classList.remove("hidden");
    paint();
    clearInterval(timer); timer = setInterval(() => st && paint(), 500);
    let result;
    try { result = await duel.run(); }
    finally { clearInterval(timer); }
    st.message = result.winner === 0 ? "You won the duel!" : result.winner === 1 ? "You lost the duel..." : "The duel is a draw.";
    paint();
    await keys((k) => (k === "a" || k === "b" ? true : undefined));
    close();
    return result;
  }
  function close() {
    st = null;
    clearInterval(timer);
    canvas.classList.add("hidden");
  }
  window.DuelScreen = { open, close };
})();


// ---------- The card shop (Yu-Gi-Oh! GX Duel Academy's) ----------
//
// The Kame Game shop's booster packs, on GX Duel Academy's shop screen (its pieces from the cartridge:
// tools/build-gx-trunk.py, assets/yugioh/shop/): the shop's room with its translucent panels, the text box below
// with its cursor; the packs (window.YUGIOH_SETS) one above another down the left, the one you're on framed in red,
// its name, nine cards to a pack and its price beside it, and how many you'll buy between its arrows; your money by
// the star at the top right (where GX shows its Duel Points), what the basket costs and how many packs are in it.
// Up and down pick a pack, left and right how many, R fills the basket (as many as you can pay for), L empties it,
// START tells you about the pack and SELECT shows the help bar; A buys, after "Is this okay?". Each pack opens as GX
// opens one: the pack at the bottom left, its cards popping out one by one and flying into the machine at the right
// (A speeds it up, B skips it), then the list of what came out (GX's, grey): the set's name and how much of it you
// have ("Comp."), the cards with NEW on those you didn't have, the one under the cursor at the bottom (START shows
// it); A, B or R to the next pack. (The packs' pictures are drawn here: a card from the set in a pack's frame, as
// GX makes its own as it runs.)
//
//   await CardShop.say(lines)                       // the room and the text box
//   const i = await CardShop.choose(question, ["Buy packs.", ...])   // -> index, or -1 (B)
//   await CardShop.picker({ sets, order, money: () => n, price, perPack, buy(key, count) -> { packs: [[{ no, isNew }]] } | { error } })
//   await CardShop.results({ title, cards: [{ no, isNew }], comp })   // a list of cards (a duel's prizes, too)
//   CardShop.close()
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
    if (!images[url]) { const img = new Image(); img.src = url; img.onload = () => st.paint && st.paint(); images[url] = img; }
    return images[url];
  }
  const ready = (img) => img && img.complete && img.naturalWidth;
  const S = (n) => image("assets/yugioh/shop/" + n + ".png");
  const TR = (n) => image("assets/yugioh/trunk/" + n + ".png");
  const WHITE = [255, 255, 255], SHADE = [40, 40, 48], YELLOW = [248, 216, 48], ORANGE = [248, 152, 56], GREY = [72, 72, 80];
  const KIND_COLOUR = { normal: "#e8d040", effect: "#e89830", fusion: "#b048b8", ritual: "#5890e8", spell: "#30c070", trap: "#d83890" };
  // (each set's colours, its pack item's: the pack's panel and its stripes)
  const PACK_COLOUR = { lob: ["#c85028", "#e07848"], mrd: ["#3878d0", "#68a0e8"], srl: ["#b02828", "#d85050"], psv: ["#8040c0", "#a868e0"], lon: ["#289858", "#50c080"] };
  const RARITY = { c: "Common", r: "Rare", s: "Super Rare", u: "Ultra Rare", x: "Secret Rare" };
  let st = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n || "se_select"); };
  const cardsData = () => window.YUGIOH_CARDS;

  function draw(g, name, x, y, alpha) {
    const im = S(name);
    if (!ready(im)) return;
    if (alpha != null) { g.globalAlpha = alpha; g.drawImage(im, x, y); g.globalAlpha = 1; } else g.drawImage(im, x, y);
  }
  // (digits: each glyph 7 apart, right-aligned to x; white, red, blue, or the big red ones 8 apart)
  function digits(g, value, right, y, colour, width) {
    const str = String(value).padStart(width || 1, "0");
    const step = colour === "big" ? 8 : 7;
    for (let i = 0; i < str.length; i++) draw(g, (colour === "big" ? "big-" : "digit-" + (colour || "w") + "-") + str[i], right - step * (str.length - i), y);
  }
  function art(g, n, x, y, w, h, crop) {
    const C = cardsData(), sheet = image("assets/yugioh/cards/" + String(Math.floor(n / C.perSheet)).padStart(2, "0") + ".png");
    if (!ready(sheet)) return;
    const k = n % C.perSheet, sx = (k % C.across) * 80, sy = Math.floor(k / C.across) * 80;
    const c = crop || 0;
    g.drawImage(sheet, sx + c, sy, 80 - 2 * c, 80, x, y, w, h);
  }
  // A pack's picture, as GX frames one: its border (red for the pack you're on), the card's picture in its window,
  // and the set's panel with its name below.
  function pack(g, key, x, y, on, scale) {
    const set = st.sets[key], col = PACK_COLOUR[key] || ["#38a858", "#58c878"];
    const pw = 52, ph = 88;
    const off = pack.c || (pack.c = Object.assign(document.createElement("canvas"), { width: pw, height: ph }));
    const p = off.getContext("2d");
    p.imageSmoothingEnabled = false;
    p.clearRect(0, 0, pw, ph);
    p.fillStyle = on ? "#c81818" : "#181818"; p.fillRect(0, 0, pw, ph);
    p.fillStyle = "#c8c8c8"; p.fillRect(2, 2, pw - 4, ph - 4);
    p.fillStyle = "#888888"; for (let i = 3; i < pw - 3; i += 2) { p.fillRect(i, 3, 1, 2); p.fillRect(i, ph - 5, 1, 2); }
    p.fillStyle = "#101010"; p.fillRect(3, 6, pw - 6, 52);
    const no = window.DuelMonsters ? window.DuelMonsters.numberOf(set.cover) : 0;
    if (no) art(p, no, 4, 7, pw - 8, 50, 6);
    p.fillStyle = col[0]; p.fillRect(3, 58, pw - 6, 22);
    p.fillStyle = col[1]; for (let i = 59; i < 80; i += 3) p.fillRect(3, i, pw - 6, 1);
    p.fillStyle = "#101010"; p.fillRect(3, 80, pw - 6, 3);
    const bars = ["#e83030", "#f0d020", "#3050e8"];
    bars.forEach((b, i) => { p.fillStyle = b; p.fillRect(5 + 5 * i, 80, 3, 3); });
    const s = window.GbaMenus.Surface();
    const label = key.toUpperCase();
    s.text(label, Math.round(pw / 2 - s.textWidth(label) / 2), 62, WHITE, SHADE);
    p.drawImage(s.canvas(), 0, 0, pw, ph, 0, 0, pw, ph);
    const k = scale || 1;
    g.drawImage(off, 0, 0, pw, ph, Math.round(x), Math.round(y), Math.round(pw * k), Math.round(ph * k));
  }
  // A card small, as GX shows one coming out of a pack: its kind's colour and its picture.
  function smallCard(g, no, x, y) {
    const c = cardsData().cards[no];
    g.fillStyle = "#202020"; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 24, 32);
    g.fillStyle = KIND_COLOUR[c[2]] || "#e8d040"; g.fillRect(Math.round(x), Math.round(y), 22, 30);
    g.fillStyle = "#101010"; g.fillRect(Math.round(x) + 2, Math.round(y) + 5, 18, 18);
    art(g, no, Math.round(x) + 3, Math.round(y) + 6, 16, 16);
  }
  function show() {
    canvas.classList.remove("hidden");
  }
  function present(g, top) {
    if (top) g.drawImage(top.canvas(), 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, W * 2, H * 2);
    out.drawImage(g.canvas, 0, 0, W * 2, H * 2);
  }
  function surface() {
    const off = surface.c || (surface.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, W, H);
    return g;
  }

  // ---------- The room and the text box ----------
  // The top right: your money by the star.
  function hud(g, top) {
    draw(g, "star", 154, 0);
    digits(g, Math.min(99999999, st.money ? st.money() : 0), 237, 4, "w");
  }
  function room(g) { draw(g, "room", 0, 0); draw(g, "panels", 0, 0, 0.5); }
  function textbox(g, top, lines, cursor) {
    draw(g, "textbox", 0, 96, 0.75);
    // (a line too long for the box goes on to the next)
    const wrapped = [];
    for (const l of lines) {
      if (typeof l !== "string") { wrapped.push(l); continue; }
      let line = "";
      for (const w of l.split(" ")) { const next = line ? line + " " + w : w; if (line && top.textWidth(next) > 224) { wrapped.push(line); line = w; } else line = next; }
      wrapped.push(line);
    }
    const gap = wrapped.length > 3 ? 14 : 16;
    wrapped.forEach((l, i) => top.text(l.text != null ? l.text : l, l.x != null ? l.x : 8, 99 + gap * i, l.colour || WHITE, SHADE));
    if (cursor != null) draw(g, "cursor", 8, 99 + gap * cursor);
  }
  function paintRoom(lines, cursor) {
    st.paint = () => paintRoom(lines, cursor);
    const g = surface(), top = window.GbaMenus.Surface();
    room(g); hud(g, top); textbox(g, top, lines, cursor);
    present(g, top);
  }
  async function say(lines) {
    show();
    for (const text of [].concat(lines)) {
      paintRoom(String(text).split("\n"));
      await window.GbaMenus.keys((k) => (k === "a" || k === "b" ? k : undefined));
      se();
    }
  }
  // A question and its answers (as many as the box holds below it, the rest a line at a time as you go down).
  async function choose(question, options, opts) {
    show();
    let i = 0;
    const room2 = 3;
    const paint = () => {
      const first = Math.max(0, Math.min(i - 1, options.length - room2));
      const lines = [question].concat(options.slice(first, first + room2).map((o, k) => ({ text: o, x: 24, colour: first + k === i ? YELLOW : WHITE })));
      paintRoom(lines, 1 + i - first);
    };
    paint();
    const r = await window.GbaMenus.keys((k) => {
      if (k === "up" || k === "down") { i = (i + (k === "up" ? options.length - 1 : 1)) % options.length; se(); paint(); return undefined; }
      if (k === "a") return i;
      if (k === "b") return opts && opts.noCancel ? undefined : -1;
      return undefined;
    });
    se();
    return r;
  }

  // ---------- The pack picker ----------
  async function picker(opts) {
    show();
    st.sets = opts.sets; st.money = opts.money;
    const order = opts.order, price = opts.price, per = opts.perPack;
    let i = st.lastPack || 0, n = 0, help = false;
    const paint = (extra) => {
      st.paint = () => paint(extra);
      const g = surface(), top = window.GbaMenus.Surface();
      room(g); hud(g, top);
      // (the basket: what it costs, and how many packs)
      draw(g, "basket-dp", 153, 16); digits(g, n * price, 237, 20, "r");
      draw(g, "basket-cards", 185, 32); digits(g, n, 214, 36, "r", 2); draw(g, "slash", 215, 36); digits(g, 99, 236, 36, "w");
      // (the packs: the one before, the one you're on and the one after, with the arrows)
      const prev = order[(i + order.length - 1) % order.length], next = order[(i + 1) % order.length];
      if (order.length > 1) { pack(g, prev, 15, -54, false); pack(g, next, 15, 128, false); }
      pack(g, order[i], 6, 36, true);
      if (order.length > 1) { draw(g, "arrow-up", 22, 17); draw(g, "arrow-down", 22, 126); }
      // (the pack: its name, its cards and its price; how many)
      const set = st.sets[order[i]];
      top.text(set.name, 74, 63, WHITE, SHADE);
      draw(g, "cards-x", 72, 84); digits(g, per, 102, 84, "w", 2);
      draw(g, "price", 111, 84); digits(g, price, 147, 84, "w");
      draw(g, "basket", 70, 96);
      if (n > 0) draw(g, "left", 84, 100);
      digits(g, n, 112, 96, "big", 2);
      draw(g, "right", 113, 100);
      if (help) draw(g, "help", 96, 128); else draw(g, "select", 216, 128);
      if (extra) extra(g, top);
      present(g, top);
    };
    paint();
    for (;;) {
      const k = await window.GbaMenus.keys((key) => {
        if (key === "up" || key === "down") { i = (i + (key === "up" ? order.length - 1 : 1)) % order.length; st.lastPack = i; se(); paint(); return undefined; }
        if (key === "left" || key === "right") {
          const most = Math.min(99, Math.floor(opts.money() / price));
          const m = Math.max(0, Math.min(key === "left" ? n - 1 : n + 1, most));
          if (m !== n) { n = m; se(); paint(); } else se("se_failure");
          return undefined;
        }
        if (key === "r") { n = Math.min(99, Math.floor(opts.money() / price)); se(); paint(); return undefined; }
        if (key === "l") { n = 0; se(); paint(); return undefined; }
        if (key === "select") { help = !help; se(); paint(); return undefined; }
        return key === "a" || key === "b" || key === "start" ? key : undefined;
      }, { shoulders: true });
      se();
      if (k === "b") return;
      const key = order[i], set = st.sets[key];
      if (k === "start") {
        await describe(set.text, paint);
        continue;
      }
      if (n === 0) { await describe("Pick how many packs you'd like\nwith left and right.", paint); continue; }
      const yes = await confirm(paint, "Is this okay?");
      if (!yes) { paint(); continue; }
      const r = opts.buy(key, n);
      if (r.error) { await describe(r.error, paint); continue; }
      if (r.message) { n = 0; await describe(r.message, paint); continue; }
      n = 0;
      for (let p = 0; p < r.packs.length; p++) {
        const skipAll = await opening(key, r.packs[p]);
        await results({ title: set.name, cards: r.packs[p], comp: opts.comp ? opts.comp(key) : null, packKey: key, more: p < r.packs.length - 1 });
        if (skipAll === "stop") break;
      }
      paint();
    }
  }
  // (a line or two in the text box over the picker, until A or B)
  async function describe(text, under) {
    under((g, top) => textbox(g, top, String(text).split("\n")));
    await window.GbaMenus.keys((k) => (k === "a" || k === "b" || k === "start" ? k : undefined));
    se();
    under();
  }
  async function confirm(under, question) {
    let i = 0;
    const paint = () => under((g, top) => textbox(g, top, [question, { text: "Yes", x: 24, colour: i === 0 ? YELLOW : WHITE }, { text: "No", x: 24, colour: i === 1 ? YELLOW : WHITE }], 1 + i));
    paint();
    const r = await window.GbaMenus.keys((k) => {
      if (k === "up" || k === "down") { i = 1 - i; se(); paint(); return undefined; }
      if (k === "a") return i === 0;
      if (k === "b") return false;
      return undefined;
    });
    se();
    return r;
  }

  // ---------- Opening a pack ----------
  // (its own keys, while it plays: A speeds it up, B skips it)
  function listen(onKey) {
    const KEY = { z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b", s: "r", S: "r", Select: "select" };
    const h = (e) => { const k = KEY[e.key]; if (!k) return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) onKey(k); };
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  }
  // GX Duel Academy's own opening, as it plays (recorded from the game, frame by frame, at 60 a second): the shop
  // fades out and the backdrop in (frames 0-53), the machine slides in from the right (76-136), the pack in from the
  // left and down to the bottom left (144-174); then each card rises out of the pack (RISE, a card every 43 frames
  // from 193), and as the next comes up, the cards move on one place along the arc (SHIFT: from the pack's place to
  // four more, the last at the machine), a card's first move with the dots' flash over its picture (REVEAL); a card at
  // the machine turns over and drops into it (ENTER: its face narrowing, its back widening, then smaller as it
  // goes in). Once the pack's empty the cards move on every 17 frames. GX's cards are in its frames for each kind
  // (assets/yugioh/shop/frame-*.png) with their pictures in them.
  const RISE = [118, 115, 112, 110, 107, 104, 102, 99, 96, 94, 91, 88, 86, 83, 80, 78, 75, 72, 70, 67, 64, 62, 59, 56];
  const SHIFT = [
    [[16, 53], [19, 51], [22, 49], [24, 46], [27, 44], [30, 42], [32, 39], [35, 37], [38, 35], [40, 33], [43, 31], [46, 29], [48, 27], [51, 25], [54, 23], [57, 22]],
    [[59, 20], [62, 19], [65, 17], [67, 16], [70, 14], [73, 13], [75, 12], [78, 11], [81, 10], [83, 10], [86, 9], [89, 8], [91, 8], [94, 8], [97, 8], [100, 8]],
    [[102, 8], [105, 8], [108, 8], [110, 8], [113, 9], [116, 10], [118, 10], [121, 11], [124, 12], [126, 13], [129, 14], [132, 16], [134, 17], [137, 19], [140, 20], [143, 22]],
    [[145, 23], [148, 25], [151, 27], [153, 29], [156, 31], [159, 33], [161, 35], [164, 37], [167, 39], [169, 42], [172, 44], [175, 46], [177, 49], [180, 51], [183, 53], [186, 56]]];
  const SPOTS = [[14, 56], [57, 22], [100, 8], [143, 22], [186, 56]];
  // (the card going into the machine: its centre, its scale across and down, and whether it shows its back)
  const ENTER = [[216, 90, 320, 256, 0], [212, 92, 512, 256, 0], [210, 94, 832, 256, 0], [210, 97, 768, 256, 1], [212, 99, 544, 256, 1], [214, 101, 384, 256, 1],
    [217, 104, 288, 256, 1], [218, 106, 256, 256, 1], [214, 108, 384, 384, 1], [212, 110, 512, 512, 1], [211, 112, 640, 640, 1], [210, 114, 768, 768, 1],
    [210, 116, 896, 896, 1], [209, 118, 1024, 1024, 1], [209, 120, 1152, 1152, 1], [209, 121, 1280, 1280, 1]];
  const REVEAL = [0, 1, 2, 3, 4, 5, "full", 5, 4, 3, 2, 1, 0];   // (every 2 frames, from a card's first move's 6th frame)
  const FRAME_OF = { normal: "normal", effect: "effect", fusion: "fusion", ritual: "ritual", spell: "spell", trap: "trap" };
  function card(g, no, x, y, sx, sy, back) {
    const c = cardsData().cards[no], fw = 40, fh = 56;
    const off = card.c || (card.c = Object.assign(document.createElement("canvas"), { width: fw, height: fh }));
    const p = off.getContext("2d");
    p.imageSmoothingEnabled = false; p.clearRect(0, 0, fw, fh);
    if (back) draw(p, "card-back", 0, 0);
    else { draw(p, "frame-" + (FRAME_OF[c[2]] || "normal"), 0, 0); art(p, no, 4, 12, 32, 32); }
    const w = Math.max(1, Math.round(fw * (sx == null ? 1 : sx))), h = Math.max(1, Math.round(fh * (sy == null ? 1 : sy)));
    g.drawImage(off, 0, 0, fw, fh, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  }
  async function opening(key, cards) {
    show();
    let speed = 1, skip = false, help = false;
    const stop = listen((k) => { if (k === "a") speed = 4; else if (k === "b" || k === "r") skip = true; else if (k === "select") help = !help; });
    const before = document.createElement("canvas"); before.width = W; before.height = H;
    before.getContext("2d").drawImage(canvas, 0, 0, W, H);
    try {
      const n = cards.length, rise = (k) => 193 + 43 * k;
      const shiftAt = (j) => (j < n ? 219 + 43 * j : 219 + 43 * (n - 1) + 17 * (j - n + 1));
      const enterAt = (k) => shiftAt(k + 4);   // (the card at the machine goes in as the others move on)
      const end = shiftAt(n + 3) + 50;
      for (let f = 0; f <= end && !skip; f += speed) {
        const g = surface();
        if (f < 25) { g.drawImage(before, 0, 0); g.fillStyle = "rgba(0,0,0," + (f / 24) + ")"; g.fillRect(0, 0, W, H); present(g); await frame(); continue; }
        draw(g, "open-bg", 0, 0);
        draw(g, "machine", f < 76 ? W : Math.max(176, 236 - (f - 76)), 0);
        if (f >= 144) pack(g, key, Math.min(8, -44 + 4 * (f - 144)), f < 156 ? 36 : Math.min(116, 36 + 4 * (f - 156)), false);
        for (let k = 0; k < n; k++) {
          const t = f - rise(k);
          if (t < 0) continue;
          let x = 14, y, sx = 1, sy = 1, back = 0, place = -1;
          if (t < RISE.length) y = RISE[t];
          else {
            // (where it is along the arc: the moves since it came up)
            let at = 0, moving = null;
            for (let j = k; j < k + 4; j++) {
              const u = f - shiftAt(j);
              if (u >= SHIFT[0].length) at = j - k + 1;
              else if (u >= 0) { moving = SHIFT[j - k][u]; at = j - k; }
            }
            [x, y] = moving || SPOTS[at];
            place = moving ? at : -1;
            const e = f - enterAt(k);
            if (at === 4 && e >= 0) {
              if (e >= ENTER.length) continue;
              const [cx, cy, pa, pd, b] = ENTER[e];
              // (GX turns the whole 64x64 sprite about its middle; the card's own middle is 12 left and 4 up of it)
              card(g, cards[k].no, cx - 12 * 256 / pa, cy - 4 * 256 / pd, 256 / pa, 256 / pd, b);
              continue;
            }
          }
          card(g, cards[k].no, x + 20, y + 28, sx, sy, back);
          // (the dots' flash over its picture, on its first move: GX shows it every other frame)
          const r = Math.floor((f - shiftAt(k) - 6) / 2);
          if (place === 0 && r >= 0 && r < REVEAL.length) {
            g.globalAlpha = 0.5;
            for (let i = 0; i < 4; i++) for (let jj = 0; jj < 4; jj++) draw(g, "dots-" + REVEAL[r], x + 4 + 8 * i, y + 12 + 8 * jj);
            g.globalAlpha = 1;
          }
        }
        draw(g, help ? "open-help" : "select", help ? 96 : 216, 128);
        if (f < 54) { g.fillStyle = "rgba(0,0,0," + (1 - (f - 25) / 28) + ")"; g.fillRect(0, 0, W, H); }
        if (f > end - 20) { g.fillStyle = "rgba(0,0,0," + Math.min(1, (f - end + 20) / 20) + ")"; g.fillRect(0, 0, W, H); }
        present(g);
        await frame();
      }
    } finally { stop(); }
    return null;
  }

  // ---------- The list of what came out ----------
  async function results(opts) {
    show();
    if (opts.sets) st.sets = opts.sets;
    const cards = opts.cards, C = cardsData().cards;
    let cur = 0, topRow = 0, blink = 0, detail = null, detailTop = 0;
    const ROWS = 5;
    const paint = () => {
      st.paint = paint;
      const g = surface(), top = window.GbaMenus.Surface();
      if (detail != null) {
        const s = window.GbaMenus.Surface();
        const lines = window.TrunkScreen.detail(g, s, detail, cardsData(), detailTop);
        st.detailLines = lines;
        g.drawImage(s.canvas(), 0, 0);
        return present(g);
      }
      draw(g, "result-bg", 0, 0);
      top.text(opts.title, 3, 0, WHITE, SHADE);
      if (opts.comp != null) {
        top.text("Comp.", 170, 0, WHITE, SHADE);
        digits(g, opts.comp, 226, 4, "r");
        top.text("%", 227, 0, [248, 88, 72], SHADE);
      }
      if (opts.packKey) pack(g, opts.packKey, 12, 36, false, 0.8); else if (cards[cur]) { g.fillStyle = "#101010"; g.fillRect(13, 39, 42, 42); art(g, cards[cur].no, 14, 40, 40, 40); }
      for (let r = 0; r < ROWS; r++) {
        const c = cards[topRow + r];
        if (!c) break;
        const y = 33 + 16 * r;
        top.text(C[c.no][0], 66, y, topRow + r === cur ? ORANGE : WHITE, SHADE);
        if (c.isNew && blink % 40 < 28) draw(g, "new", 64, y - 1);
      }
      if (cards.length > ROWS) { g.fillStyle = "#f86030"; g.fillRect(232, 33 + Math.round((cur / Math.max(1, cards.length - 1)) * 70), 6, 8); }
      // (the card under the cursor: its picture, its name and its rarity)
      const c = cards[cur];
      if (c) {
        g.fillStyle = "#202020"; g.fillRect(5, 117, 34, 34);
        art(g, c.no, 6, 118, 32, 32);
        top.text(C[c.no][0], 46, 121, WHITE, SHADE);
        const rar = RARITY[(window.YUGIOH_RARITY || "")[c.no]] || "";
        top.text(rar + (c.count > 1 ? "  x" + c.count : ""), 46, 139, rar === "Common" ? WHITE : YELLOW, SHADE);
      }
      present(g, top);
    };
    paint();
    const timer = setInterval(() => { blink++; if (detail == null) paint(); }, 1000 / 30);
    try {
      for (;;) {
        const k = await window.GbaMenus.keys((key) => {
          if (detail != null) {
            if (key === "up" || key === "down") { detailTop = Math.max(0, Math.min((st.detailLines || 0) - 11, detailTop + (key === "up" ? -1 : 1))); paint(); return undefined; }
            if (key === "a" || key === "b" || key === "start") { detail = null; se(); paint(); }
            return undefined;
          }
          if (key === "up" || key === "down") {
            const m = Math.max(0, Math.min(cards.length - 1, cur + (key === "up" ? -1 : 1)));
            if (m !== cur) { cur = m; if (cur < topRow) topRow = cur; if (cur >= topRow + ROWS) topRow = cur - ROWS + 1; se(); paint(); }
            return undefined;
          }
          if (key === "start" && cards[cur]) { detail = cards[cur].no; detailTop = 0; se(); paint(); return undefined; }
          return key === "a" || key === "b" || key === "r" ? key : undefined;
        }, { shoulders: true });
        se();
        return k;
      }
    } finally { clearInterval(timer); }
  }
  function close() {
    st = { money: st.money, sets: st.sets };
    canvas.classList.add("hidden");
  }
  // (where your money comes from, for the top right)
  function setup(opts) { st.money = opts.money; st.sets = opts.sets; }
  window.CardShop = { setup, say, choose, picker, results, opening, close };
})();
