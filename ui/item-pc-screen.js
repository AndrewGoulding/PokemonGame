// FireRed's item storage screen (src/item_pc.c): WITHDRAW ITEM from your PC,
// drawn at 240x160 (assets/pc/item-pc.png, tools/build-pc.js). The stored items
// in the cream list, CANCEL last; the item's icon and description below.
//
//   const r = await ItemPcScreen.open({
//     items,      // () => [{ id, name, qty, desc, icon }]: read again after a withdrawal
//     frame,      // the Option screen's FRAME (0-9)
//     withdraw    // (id, n) => error message or null
//   })
//   // -> null (B, or CANCEL), or { action: "give", id }
//   ItemPcScreen.close()
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
  const A = (n) => image(n);
  ["assets/pc/item-pc.png", "assets/pc/item-pc-dim.png", "assets/bag/arrows.png", "assets/bag/return-arrow.png"].forEach(image);
  const ready = (img) => img && img.complete && img.naturalWidth;

  // sTextColors: 0 white on dark grey, 1 dark grey on light grey.
  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];

  let st = null, raf = 0, frameNo = 0;
  const memory = { cursor: 0, top: 0 };

  const entries = () => st.items.concat([null]);   // (null: CANCEL)
  function clampMem() {
    const n = entries().length, shown = Math.min(n, 6), m = memory;
    m.cursor = Math.max(0, Math.min(m.cursor, n - 1));
    m.top = Math.max(0, Math.min(m.top, n - shown, m.cursor));
    if (m.cursor >= m.top + shown) m.top = m.cursor - shown + 1;
  }
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
    if (!st) return;
    const s = window.GbaMenus.Surface(), G = GM(), userFrame = "type" + ((st.frame || 0) + 1);
    const items = entries(), m = memory, shown = Math.min(items.length, 6), menuOpen = !!st.menu;
    // "WITHDRAW / ITEM" (window 2, small font).
    s.text("Withdraw", 8, 9, WHITE, DARK, "small");
    s.text("Item", 8, 23, WHITE, DARK, "small");
    // The list (window 0 at 56, 8): names at 65, ×quantities at 166, rows 16 apart.
    for (let r = 0; r < shown; r++) {
      const it = items[m.top + r], y = 10 + 16 * r;
      s.text(it ? it.name : "Cancel", 65, y, DARK, LIGHT);
      if (it) s.text("×" + String(it.qty).padStart(3, " "), 166, y, DARK, LIGHT, "small");
      if (m.top + r === m.cursor) s.text("▶", 57, y, menuOpen ? LIGHT : DARK, menuOpen ? DARK : LIGHT);
    }
    const cur = items[m.cursor];
    if (!menuOpen) {
      wrap(s, cur ? cur.desc : "Return to the PC.", 192).slice(0, 3)
        .forEach((l, i) => s.text(l, 40, 115 + 14 * i, WHITE, DARK));
    } else {
      if (st.prompt) {
        const pw = st.prompt.width;
        s.frame("std", G.palettes.std3, 6, 15, pw, 4);
        s.fill(48, 120, pw * 8, 32, WHITE);
        st.prompt.text.split("\n").forEach((l, i) => s.text(l, 48, 122 + 14 * i, DARK, LIGHT));
      }
      if (st.menu.kind === "actions") {
        // Window 4 (22, 13, 7 wide): WITHDRAW / GIVE / CANCEL.
        const n = st.menu.items.length, top = 19 - 2 * n;
        s.frame(userFrame, G.frames[userFrame].palette, 22, top, 7, 2 * n);
        s.fill(176, top * 8, 56, n * 16, WHITE);
        st.menu.items.forEach((it, i) => s.text(it.label, 184, top * 8 + 2 + 16 * i, DARK, LIGHT));
        s.text("▶", 176, top * 8 + 2 + 16 * st.menu.cursor, DARK, LIGHT);
      } else if (st.menu.kind === "count") {
        s.frame(userFrame, G.frames[userFrame].palette, 24, 15, 5, 4);
        s.fill(192, 120, 40, 32, WHITE);
        s.text("×" + String(st.menu.n).padStart(3, "0"), 200, 130, DARK, LIGHT, "small");
      }
    }
    st.layer = s.canvas();
    compose();
  }

  function compose() {
    const off = compose.c || (compose.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (ready(A("assets/pc/item-pc.png"))) g.drawImage(A("assets/pc/item-pc.png"), 0, 0);
    if (st.menu && ready(A("assets/pc/item-pc-dim.png"))) g.drawImage(A("assets/pc/item-pc-dim.png"), 0, 112);
    // The item's icon, centred on (24, 140).
    const cur = entries()[memory.cursor];
    const icon = cur ? image(cur.icon) : A("assets/bag/return-arrow.png");
    if (ready(icon)) {
      const box = cur && window.ITEM_SPRITE_BOXES && window.ITEM_SPRITE_BOXES[cur.id];
      if (box) {
        const [bx, by, bw, bh] = box, sc = Math.min(1, 24 / Math.max(bw, bh));
        const dw = Math.round(bw * sc), dh = Math.round(bh * sc);
        g.drawImage(icon, bx, by, bw, bh, 24 - Math.floor(dw / 2), 140 - Math.floor(dh / 2), dw, dh);
      } else g.drawImage(icon, 12, 128, 24, 24);
    }
    // The list's scroll arrows (128, 8) and (128, 104), bouncing.
    const arrows = A("assets/bag/arrows.png");
    if (ready(arrows) && !st.menu) {
      const bounce = Math.trunc(Math.sin(((frameNo * 8) & 255) / 256 * 2 * Math.PI) * 2), n = entries().length;
      if (memory.top > 0) g.drawImage(arrows, 0, 16, 16, 16, 120, 0 - bounce, 16, 16);
      if (memory.top + 6 < n) { g.save(); g.translate(120, 96 + 16 + bounce); g.scale(1, -1); g.drawImage(arrows, 0, 16, 16, 16, 0, 0, 16, 16); g.restore(); }
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
    compose();
    raf = requestAnimationFrame(loop);
  }

  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };
  const keys = (f) => window.GbaMenus.keys(f);

  function moveCursor(dir) {
    const m = memory, n = entries().length, shown = Math.min(n, 6), c = m.cursor + dir;
    if (c < 0 || c >= n) return;
    m.cursor = c;
    if (dir > 0 && m.cursor - m.top > Math.ceil(shown / 2) && m.top + shown < n) m.top++;
    if (dir < 0 && m.cursor - m.top < shown - Math.ceil(shown / 2) - 1 && m.top > 0) m.top--;
    se("se_select");
    paint();
  }
  function menuKeys() {
    return keys((k) => {
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
  const waitA = () => keys((k) => (k === "a" || k === "b" ? (se("se_select"), true) : undefined));

  async function open(opts) {
    st = { opts, items: opts.items(), frame: opts.frame, menu: null, prompt: null };
    clampMem();
    canvas.classList.remove("hidden");
    paint();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    for (;;) {
      const key = await keys((k) => {
        if (k === "up" || k === "down") moveCursor(k === "up" ? -1 : 1);
        else if (k === "a" || k === "b") return k;
        return undefined;
      });
      const it = entries()[memory.cursor];
      se("se_select");
      if (key === "b" || !it) return null;
      st.prompt = { width: 14, text: it.name + " is\nselected." };
      st.menu = { kind: "actions", cursor: 0, items: [{ label: "Withdraw", value: "withdraw" }, { label: "Give", value: "give" }, { label: "Cancel", value: "cancel" }] };
      paint();
      const v = await menuKeys();
      if (v === "give") { st.menu = null; st.prompt = null; paint(); return { action: "give", id: it.id }; }
      if (v === "withdraw") {
        let n = 1;
        if (it.qty > 1) {
          st.prompt = { width: 16, text: "Withdraw how many\n" + it.name + "(s)?" };
          st.menu = { kind: "count", n: 1, max: it.qty };
          paint();
          n = await menuKeys();
        }
        if (n) {
          const err = opts.withdraw(it.id, n);
          st.prompt = { width: 23, text: err || "Withdrew " + n + "\n" + it.name + "(s)." };
          st.menu = { kind: "none" };
          paint();
          await waitA();
          st.items = opts.items();
          clampMem();
        }
      }
      st.menu = null; st.prompt = null;
      paint();
      if (!st.items.length) return null;
    }
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.ItemPcScreen = { open, close };
})();
