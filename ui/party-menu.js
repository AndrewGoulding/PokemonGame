// FireRed's party screen (the POKéMON menu, src/party_menu.c), drawn the way
// the game draws it at 240x160 (data/party-menu.js, tools/build-party-menu.js):
// the first Pokémon's box on the left, the other five on the right, CANCEL
// in the corner and the message box along the bottom. The chosen box lights
// up and its icon hops; the icons move faster the more HP they have.
//
//   const r = await PartyMenu.open({
//     mons: [{ name, icon, level, gender: "M" | "F" | "", hp, maxhp, status,
//              item (true when holding one), desc ("ABLE" ...: instead of HP) }],
//     cursor,        // the box chosen at first (0-5, or "cancel")
//     frame,         // the Option screen's FRAME (0-9)
//     message,       // "Choose a POKéMON." (the default)
//     actions,       // (slot) => [{ label, value, field, desc }]: the menu A
//                    // opens on a Pokémon (SUMMARY / SWITCH / ITEM / CANCEL);
//                    // without it A picks the Pokémon. Field moves (`field`)
//                    // are in blue, with `desc` in a box while chosen
//     canCancel      // B and CANCEL close it (true unless false)
//   })
//   // -> null (cancelled), or { slot, action, cursor }: action is the chosen
//   //    menu entry's value. A "switch" entry asks "Move to where?" first and
//   //    gives { action: "switch", slot, to }; an "item" entry opens GIVE /
//   //    TAKE and gives action "give" or "take".
//   PartyMenu.close()   // the screen stays up after open() resolves (for
//                       // messages over it) until this
//
// The D-pad moves, A picks, B goes back (Z / X on a keyboard).
(function () {
  "use strict";

  const W = 240, H = 160;
  const D = () => window.PARTY_MENU;
  const GM = () => window.GBA_MENUS;

  // The screen's own canvas: over the map and scenes, under the text box (so
  // messages show over it) and the overlay (YES / NO).
  const canvas = document.createElement("canvas");
  canvas.id = "party-menu";
  canvas.className = "party-menu hidden";
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);

  // ---------- Layout (sSinglePartyMenuWindowTemplate, sPartyBoxInfoRects, sPartyMenuSpriteCoords) ----------

  const BOXES = [{ left: 1, top: 3, w: 10, h: 7, main: true }]
    .concat([1, 4, 7, 10, 13].map((top) => ({ left: 12, top, w: 18, h: 3 })));
  const INFO = {
    main: { nick: [24, 11], level: [32, 20], gender: [64, 20], hp: [38, 36], maxhp: [53, 36], bar: [24, 35, 48], desc: [12, 34] },
    wide: { nick: [22, 3], level: [32, 12], gender: [64, 12], hp: [102, 12], maxhp: [117, 12], bar: [88, 10, 48], desc: [77, 4] }
  };
  // Mon icon, held item, status and Poké Ball centres.
  const SPRITES = [
    [16, 40, 20, 50, 56, 52, 16, 34], [104, 18, 108, 28, 144, 27, 102, 25], [104, 42, 108, 52, 144, 51, 102, 49],
    [104, 66, 108, 76, 144, 75, 102, 73], [104, 90, 108, 100, 144, 99, 102, 97], [104, 114, 108, 124, 144, 123, 102, 121]
  ];
  const CANCEL = 7;   // (SLOT_CANCEL)

  // ---------- Colours (LoadPartyBoxPalette) ----------
  //
  // Every box uses palette 3 of the menu's palette, with colours 4-6 and 1, 7,
  // 8 swapped in from the palette buffer for its state, 9-10 for the HP bar
  // and 11-12 for the gender sign.
  const BOX_PALS = {
    normal: [[52, 53, 54], [49, 55, 56]],
    selected: [[116, 117, 118], [97, 103, 104]],
    fainted: [[84, 85, 86], [81, 87, 88]],
    faintedSelected: [[148, 149, 150], [97, 103, 104]],
    toSwitch: [[100, 101, 102], [161, 167, 168]],
    toSwitchSelected: [[100, 101, 102], [97, 103, 104]]
  };
  const HP_PALS = { green: [57, 58], yellow: [73, 74], red: [89, 90] };
  const GENDER_PALS = { M: [59, 60], F: [75, 76] };
  function boxPalette(state, hpLevel, gender) {
    const all = D().palette, pal = all.slice(48, 64);
    const [a, b] = BOX_PALS[state];
    [4, 5, 6].forEach((o, i) => { pal[o] = all[a[i]]; });
    [1, 7, 8].forEach((o, i) => { pal[o] = all[b[i]]; });
    const hp = HP_PALS[hpLevel === "full" ? "green" : hpLevel] || HP_PALS.red;
    pal[9] = all[hp[0]]; pal[10] = all[hp[1]];
    if (GENDER_PALS[gender]) { pal[11] = all[GENDER_PALS[gender][0]]; pal[12] = all[GENDER_PALS[gender][1]]; }
    return pal;
  }

  // GetScaledHPFraction and GetHPBarLevel: the bar is 48 pixels.
  const hpPixels = (hp, max, scale) => { const r = Math.floor(hp * scale / max); return r === 0 && hp > 0 ? 1 : r; };
  function hpLevel(hp, max) {
    if (hp === max) return "full";
    const p = hpPixels(hp, max, 48);
    return p > 24 ? "green" : p > 9 ? "yellow" : p > 0 ? "red" : "empty";
  }

  // ---------- Drawing ----------

  const tilePx = (t, x, y) => parseInt(D().tiles[(Math.floor(t / 8) * 8 + y) * 64 + (t % 8) * 8 + x], 16);
  function sheetPx(sheet, x, y) { return parseInt(sheet.px[y * sheet.width + x], 16); }
  // A sprite sheet's (sx, sy, w, h) part, top-left at (x, y); colour 0 clear.
  function sprite(s, sheet, sx, sy, w, h, x, y) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = sheetPx(sheet, sx + i, sy + j);
      if (v) s.put(x + i, y + j, sheet.palette[v]);
    }
  }
  const STATUS_FRAME = { psn: 0, tox: 0, par: 1, slp: 2, frz: 3, brn: 4, fnt: 6 };

  // The background (BG1) and the boxes with their text (BG0), and the Poké
  // Balls: everything under the icons.
  function drawLower(st) {
    const s = window.GbaMenus.Surface(), d = D(), all = d.palette;
    s.fill(0, 0, W, H, all[0]);
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
      const e = d.bg[ty * 32 + tx];
      let pal = e >> 12;
      // The CANCEL button lights up in palette 2 when chosen (AnimatePartySlot).
      if (tx >= 23 && ty >= 17 && ty <= 18) pal = st.cursor === CANCEL ? 2 : 1;
      const t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = tilePx(t, hf ? 7 - x : x, vf ? 7 - y : y);
        if (v) s.put(tx * 8 + x, ty * 8 + y, all[pal * 16 + v]);
      }
    }
    BOXES.forEach((box, i) => drawBox(s, st, box, i));
    // CANCEL (sCancelButtonWindowTemplate: tiles 24, 17; small font, centred).
    const base = all.slice(48, 64), cw = s.textWidth("CANCEL", "small");
    s.text("CANCEL", 24 * 8 + 3 + Math.floor((48 - cw) / 2), 17 * 8 + 1, base[3], base[2], "small");
    // Poké Balls: open on the chosen box (and the CANCEL button).
    st.mons.forEach((m, i) => {
      if (!m) return;
      const [, , , , , , bx, by] = SPRITES[i];
      sprite(s, d.pokeball, 0, st.cursor === i ? 32 : 0, 32, 32, bx - 16, by - 16);
    });
    sprite(s, d.pokeball, 0, st.cursor === CANCEL ? 32 : 0, 32, 32, 198 - 16, 148 - 16);
    return s.canvas();
  }

  function boxState(st, i) {
    const m = st.mons[i], sel = st.cursor === i;
    if (st.switchFrom != null && (i === st.switchFrom || sel)) return sel ? "toSwitchSelected" : "toSwitch";
    if (m && m.hp === 0) return sel ? "faintedSelected" : "fainted";
    return sel ? "selected" : "normal";
  }

  function drawBox(s, st, box, i) {
    const d = D(), m = st.mons[i];
    const level = m ? hpLevel(m.hp, m.maxhp) : "full";
    const pal = m ? boxPalette(boxState(st, i), level, m.gender) : D().palette.slice(48, 64);
    const map = box.main ? (m && m.desc ? d.slots.mainNoHp : d.slots.main)
      : !m ? d.slots.wideEmpty : m.desc ? d.slots.wideNoHp : d.slots.wide;
    if (box.main && !m) return;
    const x0 = box.left * 8, y0 = box.top * 8;
    for (let ty = 0; ty < box.h; ty++) for (let tx = 0; tx < box.w; tx++) {
      const t = map[ty * box.w + tx];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = tilePx(t, x, y);
        if (v) s.put(x0 + tx * 8 + x, y0 + ty * 8 + y, pal[v]);
      }
    }
    if (!m) return;
    const r = box.main ? INFO.main : INFO.wide;
    const txt = (str, [x, y], fg, shadow, font) => s.text(str, x0 + x, y0 + y, pal[fg], pal[shadow], font || "small");
    txt(m.name, r.nick, 3, 2);
    if (!statusOf(m)) txt("{LV}" + m.level, r.level, 3, 2);
    if (m.gender === "M" || m.gender === "F") txt(m.gender === "M" ? "♂" : "♀", r.gender, 11, 12);
    if (m.desc) { txt(m.desc, r.desc, 3, 2, "normal"); return; }
    // HP: " 35/" and "/ 40" (the slashes land on each other), right-aligned.
    const right = (n) => { const w = s.textWidth("0", "small"); return { str: String(n), pad: (3 - String(n).length) * w }; };
    const hp = right(m.hp), max = right(m.maxhp);
    s.text(hp.str + "/", x0 + r.hp[0] + hp.pad, y0 + r.hp[1], pal[3], pal[2], "small");
    s.text("/", x0 + r.maxhp[0], y0 + r.maxhp[1], pal[3], pal[2], "small");
    s.text(max.str, x0 + r.maxhp[0] + s.textWidth("/", "small") + max.pad, y0 + r.maxhp[1], pal[3], pal[2], "small");
    // The bar: colour 10 on top and 9 under it, the rest 13 and 2.
    const [bx, by, bw] = r.bar, fill = hpPixels(m.hp, m.maxhp, bw);
    s.fill(x0 + bx, y0 + by, fill, 1, pal[10]);
    s.fill(x0 + bx, y0 + by + 1, fill, 2, pal[9]);
    if (fill < bw) {
      s.fill(x0 + bx + fill, y0 + by, bw - fill, 1, pal[13]);
      s.fill(x0 + bx + fill, y0 + by + 1, bw - fill, 2, pal[2]);
    }
  }
  const statusOf = (m) => (m.hp === 0 ? "fnt" : STATUS_FRAME[m.status] != null ? m.status : "");

  // Held items and status icons: over the icons.
  function drawSprites(st) {
    const s = window.GbaMenus.Surface(), d = D();
    st.mons.forEach((m, i) => {
      if (!m) return;
      const c = SPRITES[i];
      if (m.item) sprite(s, d.hold, 0, m.item === "mail" ? 8 : 0, 8, 8, c[2] - 4, c[3] - 4);
      const status = statusOf(m);
      if (status) sprite(s, d.status, STATUS_FRAME[status] * 32, 0, 32, 8, c[4] - 16, c[5] - 4);
    });
    return s.canvas();
  }

  // The message box and any open menu (BG2, over the sprites).
  function drawUpper(st) {
    const s = window.GbaMenus.Surface(), G = GM();
    const std = G.palettes.std3;
    if (st.message) {
      // sDefaultPartyMsgWindowTemplate (tiles 1, 17; 21 wide) and the shorter
      // ones for "Do what with this {PKMN}?" (16) and "Do what with an item?" (19).
      const w = st.menu ? (st.menu.kind === "item" ? 19 : 16) : 21;
      s.frame("std", std, 1, 17, w, 2);
      s.fill(8, 17 * 8, w * 8, 16, std[1]);
      s.text(st.message, 8, 17 * 8 + 2, std[2], std[3]);
    }
    if (st.menu) {
      // The actions window (tiles 19, 19 - 2n; 10 wide) or GIVE / TAKE (22, 13; 7 x 6),
      // in your frame; text in text window palette 0, field moves in blue
      // (sFontColorTable[4]). More than fit (a Pokémon with many field
      // moves) scroll, with arrows.
      const frame = "type" + ((st.frame || 0) + 1), pal = G.palettes.std0;
      const m = st.menu, rows = Math.min(m.items.length, MAX_ROWS), off = m.offset || 0;
      const [left, top, w, h] = m.kind === "item" ? [22, 13, 7, 6] : [19, 19 - rows * 2, 10, rows * 2];
      s.frame(frame, G.frames[frame].palette, left, top, w, h);
      s.fill(left * 8, top * 8, w * 8, h * 8, pal[1]);
      m.items.slice(off, off + rows).forEach((it, i) =>
        s.text(it.label, left * 8 + 8, top * 8 + i * 16 + 2, it.field ? pal[8] : pal[2], it.field ? pal[9] : pal[3]));
      s.text("▶", left * 8, top * 8 + (m.cursor - off) * 16 + 2, pal[2], pal[3]);
      // (Little triangles, 7 wide, at the window's right edge.)
      const arrow = (x, y, up) => { for (let i = 0; i < 4; i++) s.fill(x + i, y + (up ? 3 - i : i), 7 - 2 * i, 1, pal[2]); };
      if (off > 0) arrow((left + w) * 8 - 10, top * 8 + 2, true);
      if (off + rows < m.items.length) arrow((left + w) * 8 - 10, (top + h) * 8 - 6, false);
      // A field move's line (sFieldMoveDescriptionTable), in the help box at
      // tiles (0, 13), 18 x 3: white on dark grey.
      const it = m.items[m.cursor];
      if (it && it.desc) {
        s.fill(0, 13 * 8, 18 * 8, 3 * 8, [74, 74, 74]);
        s.fill(0, 13 * 8, 18 * 8, 1, [41, 41, 41]);
        s.fill(0, 16 * 8 - 1, 18 * 8, 1, [41, 41, 41]);
        s.text(it.desc, 3, 13 * 8 + 6, [255, 255, 255], [98, 98, 98]);
      }
    }
    return s.canvas();
  }

  // ---------- Icons (src/pokemon_icon.c) ----------
  //
  // Two frames, swapping every 6, 8, 14 or 22 frames by HP (full, green,
  // yellow, red); a fainted one stays still. The chosen one hops: up 3 on its
  // first frame, down 1 on its second (SpriteCB_BouncePartyMonIcon); the
  // others sit 4 pixels up (the first box) or left (the rest).
  const ANIM = { full: 6, green: 8, yellow: 14, red: 22, empty: 29 };
  const images = {};
  function image(url) {
    if (!images[url]) { const img = new Image(); img.src = url; images[url] = img; }
    return images[url];
  }
  function iconState(m) {
    return { delay: 0, cmd: 0, frame: 0, dy: 0, still: m.hp === 0, d: ANIM[hpLevel(m.hp, m.maxhp)] };
  }
  // UpdateMonIconFrame: the anim is [frame 0, frame 1, jump back].
  function stepIcon(ic) {
    if (ic.delay > 0) { ic.delay--; return 0; }
    if (ic.cmd === 2) { ic.cmd = 0; return 0; }
    ic.frame = ic.still ? 0 : ic.cmd;
    ic.delay = ic.d;
    return ++ic.cmd;
  }

  // ---------- The screen ----------

  let st = null, raf = 0, last = 0, layers = null;
  const out = canvas.getContext("2d");

  function redraw() { layers = { lower: drawLower(st), sprites: drawSprites(st), upper: drawUpper(st) }; }

  function frameLoop(now) {
    if (!st) return;
    raf = requestAnimationFrame(frameLoop);
    const steps = last ? Math.min(6, Math.round((now - last) / (1000 / 60))) : 1;
    if (steps < 1) return;
    last = now;
    for (let k = 0; k < steps; k++) st.icons.forEach((ic, i) => {
      if (!ic) return;
      const r = stepIcon(ic);
      if (st.cursor === i && r) ic.dy = r & 1 ? -3 : 1;
    });
    compose();
  }
  function compose() {
    const off = compose.c || (compose.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.clearRect(0, 0, W, H);
    g.drawImage(layers.lower, 0, 0);
    st.mons.forEach((m, i) => {
      if (!m) return;
      const img = image(m.icon), ic = st.icons[i], [cx, cy] = SPRITES[i];
      if (!img.complete || !img.naturalWidth) return;
      const sel = st.cursor === i;
      const dx = sel ? 0 : i === 0 ? 0 : -4, dy = sel ? ic.dy : i === 0 ? -4 : 0;
      g.drawImage(img, 0, ic.frame * 32, 32, 32, cx - 16 + dx, cy - 16 + dy, 32, 32);
    });
    g.drawImage(layers.sprites, 0, 0);
    g.drawImage(layers.upper, 0, 0);
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    out.restore();
  }

  function setCursor(c) {
    if (c === st.cursor) return;
    const before = st.cursor;
    st.cursor = c;
    // AnimateSelectedPartyIcon: a newly chosen icon starts its hop from level.
    if (st.icons[c]) { st.icons[c].dy = 0; st.icons[c].delay = 0; }
    if (st.icons[before]) st.icons[before].dy = 0;
    window.GbaMenus.se();
    redraw(); compose();
  }

  // UpdatePartySelectionSingleLayout.
  function move(dir) {
    const n = st.mons.filter(Boolean).length, c = st.cursor;
    if (dir === "up") setCursor(c === 0 ? CANCEL : c === CANCEL ? n - 1 : c - 1);
    else if (dir === "down") setCursor(c === CANCEL ? 0 : c === n - 1 ? CANCEL : c + 1);
    else if (dir === "right") { if (n > 1 && c === 0) setCursor(st.lastRight || 1); }
    else if (dir === "left") { if (c !== 0 && c !== CANCEL) { st.lastRight = c; setCursor(0); } }
  }

  // A menu window: up / down (round past either end), A picks, B cancels.
  // (The most rows the actions window shows: from tile 1 down.)
  const MAX_ROWS = 9;
  function menu(kind, items, message) {
    const saved = st.message;
    st.menu = { kind, items, cursor: 0, offset: 0 };
    st.message = message;
    redraw(); compose();
    return window.GbaMenus.keys((k) => {
      const m = st.menu, n = m.items.length;
      if (k === "up" || k === "down") {
        m.cursor = (m.cursor + (k === "up" ? n - 1 : 1)) % n;
        m.offset = Math.max(Math.min(m.offset, m.cursor), m.cursor - MAX_ROWS + 1);
        window.GbaMenus.se(); redraw(); compose();
      }
      else if (k === "a" || k === "b") {
        window.GbaMenus.se();
        const v = k === "a" ? m.items[m.cursor].value : null;
        st.menu = null; st.message = saved;
        redraw(); compose();
        return v;
      }
      return undefined;
    });
  }

  function show(opts) {
    const mons = opts.mons.slice(0, 6);
    while (mons.length < 6) mons.push(null);
    let cursor = opts.cursor === "cancel" ? CANCEL : opts.cursor || 0;
    if (cursor !== CANCEL && !mons[cursor]) cursor = 0;
    const keep = st && st.lastRight;
    st = {
      mons, cursor, frame: opts.frame, lastRight: keep || 0, menu: null, switchFrom: null,
      message: opts.message || "Choose a POKéMON.",
      icons: mons.map((m) => (m ? iconState(m) : null))
    };
    mons.forEach((m) => m && image(m.icon));
    canvas.classList.remove("hidden");
    redraw(); compose();
    cancelAnimationFrame(raf); last = 0;
    raf = requestAnimationFrame(frameLoop);
  }

  async function open(opts) {
    show(opts);
    const canCancel = opts.canCancel !== false;
    window.PartyMenu.showing = true;
    for (;;) {
      const key = await window.GbaMenus.keys((k) => {
        if (k === "a" || k === "b") return k;
        if (["up", "down", "left", "right"].includes(k)) move(k);
        return undefined;
      });
      const slot = st.cursor;
      if (key === "b" || slot === CANCEL) {
        if (st.switchFrom != null) {
          // Backing out of "Move to where?".
          window.GbaMenus.se();
          st.switchFrom = null; st.message = opts.message || "Choose a POKéMON.";
          redraw(); compose();
          continue;
        }
        if (!canCancel) continue;
        window.GbaMenus.se();
        return null;
      }
      window.GbaMenus.se();
      if (st.switchFrom != null) {
        const from = st.switchFrom;
        st.switchFrom = null; st.message = opts.message || "Choose a POKéMON.";
        redraw(); compose();
        return { slot: from, to: slot, action: "switch", cursor: slot };
      }
      if (!opts.actions) return { slot, action: "pick", cursor: slot };
      const items = opts.actions(slot);
      let v = await menu("actions", items, "Do what with this {PKMN}?");
      if (v == null || v === "cancel") continue;
      if (v === "item") {
        v = await menu("item", [{ label: "GIVE", value: "give" }, { label: "TAKE", value: "take" }, { label: "CANCEL", value: null }],
          "Do what with an item?");
        if (v == null) continue;
      }
      if (v === "switch") {
        st.switchFrom = slot;
        st.message = "Move to where?";
        redraw(); compose();
        continue;
      }
      return { slot, action: v, cursor: slot };
    }
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
    window.PartyMenu.showing = false;
  }

  window.PartyMenu = {
    open: async (opts) => {
      try { return await open(opts); } finally { if (st) { st.menu = null; redraw(); compose(); } }
    },
    close,
    showing: false
  };
})();
