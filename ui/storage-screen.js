// FireRed's Pokémon Storage System (src/pokemon_storage_system_*.c), drawn the
// way the game draws it at 240x160 (assets/pc/, tools/build-pc.js): the box's
// wallpaper and its Pokémon on the right under the box's name, the drifting
// backdrop behind, the Pokémon under the hand on the left (PKMN DATA), the
// PARTY POKéMON and CLOSE BOX buttons along the top, and the party panel that
// unrolls over the box. One of Bill's PC's four ways in:
//
//   await StorageScreen.open({
//     mode,        // "withdraw" | "deposit" | "move" | "items"
//     boxes,       // the PC: 14 arrays of 30 (records, or null), changed in place
//     names, wallpapers,   // each box's name and wallpaper (0-15), changed in place
//     party,       // your party's records, changed in place (packed again on the way out)
//     box,         // the box to open on
//     frame,       // the Option screen's FRAME (0-9)
//     view,        // (record) => { name, species, level, gender, item (name), icon, pic, picEmpty }
//     itemIcon, itemName, itemDesc,  // (id) => picture URL / name / description
//     summary,     // (records, index) => Promise: the Summary screen
//     pickItem,    // () => Promise<item id | null>: the Bag, for GIVE (MOVE ITEMS)
//     toBag,       // (id) => bool: put an item in the bag (false: it's full)
//     rename,      // (name) => Promise<new name | null>
//     changed      // () => void: after anything changes (to save)
//   })   // -> the box it closed on
//
// Hand: the D-pad moves it round the box (left / right go round the row, up from
// the top row is the box's name, down from the bottom row the buttons), A opens
// FireRed's menu for what's under it, B asks "Continue box operations?". Left /
// right on the box's name change boxes; A there is JUMP / WALLPAPER / NAME.
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
  const PC = (n) => image("assets/pc/" + n + ".png");
  ["menu", "pkmn-data", "close-box", "party-panel", "party-slot-empty", "party-slot-filled", "scrolling-bg", "scrolling-bg-items", "cursor",
    "cursor-shadow", "box-arrows", "choose-box", "waveform"].forEach(PC);
  const ready = (img) => img && img.complete && img.naturalWidth;

  const BOX_SIZE = 30, BOXES = 14;
  const WALLPAPER_NAMES = ["Forest", "City", "Desert", "Savanna", "Crag", "Volcano", "Snow", "Cave",
    "Beach", "Seafloor", "River", "Sky", "Stars", "Poké Center", "Tiles", "Simple"];
  const THEMES = ["Scenery 1", "Scenery 2", "Scenery 3", "Etcetera"];

  // Text colours: the message box's (standard), and PKMN DATA's (scrolling_bg's
  // palette: white on blue-grey with a black shadow; ♂ blue, ♀ pink).
  const WHITE = [255, 255, 255], DARK = [98, 98, 98], LIGHT = [213, 213, 205];
  const DATA_FG = [255, 255, 255], DATA_SHADOW = [0, 0, 0];
  const MALE = [[123, 189, 255], [0, 123, 255]], FEMALE = [[255, 131, 131], [172, 24, 24]];
  const TITLE_FG = [255, 255, 255], TITLE_SHADOW = [56, 56, 56];
  const POPUP_FG = [205, 123, 0], POPUP_SHADOW = [246, 230, 180];

  // ---------- State ----------

  let st = null, raf = 0;
  const se = (n) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(n); };
  const keys = (f) => window.GbaMenus.keys(f);
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const frames = async (n, each) => { for (let i = 0; i < n; i++) { if (each) each(i); await nextFrame(); } };

  // Where the hand is: { area: "box" | "party" | "title" | "buttons", pos }.
  const slotOf = (c) => (c.area === "box" ? st.opts.boxes[st.box][c.pos] : c.area === "party" && c.pos < 6 ? st.party[c.pos] : null);
  function setSlot(c, r) {
    if (c.area === "box") st.opts.boxes[st.box][c.pos] = r || null;
    else st.party[c.pos] = r || null;
  }
  // GetCursorCoordsByPos: the hand's point.
  function handXY(c) {
    if (c.area === "box") return [(c.pos % 6) * 24 + 100, Math.floor(c.pos / 6) * 24 + 32];
    if (c.area === "party") return c.pos === 0 ? [104, 52] : c.pos === 6 ? [152, 132] : [152, (c.pos - 1) * 24 + 4];
    if (c.area === "title") return [162, 12];
    return [c.pos * 88 + 120, st.held ? 8 : 14];
  }
  const partyIconXY = (i) => (i === 0 ? [104, 64] : [152, 16 + 24 * (i - 1)]);

  // ---------- Drawing ----------

  function drawIcon(r, cx, cy, alpha) {
    if (!r) return;
    const v = st.views.get(r) || st.views.set(r, st.opts.view(r)).get(r);
    const img = image(v.icon);
    if (!ready(img)) return;
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.drawImage(img, 0, 0, 32, 32, Math.round(cx - 16), Math.round(cy - 16), 32, 32);
    g.globalAlpha = 1;
  }
  function drawItemIcon(id, cx, cy) {
    if (!id) return;
    const img = image(st.opts.itemIcon(id));
    if (!ready(img)) return;
    const box = window.ITEM_SPRITE_BOXES && window.ITEM_SPRITE_BOXES[id];
    const [bx, by, bw, bh] = box || [0, 0, img.naturalWidth, img.naturalHeight];
    const sc = Math.min(1, 16 / Math.max(bw, bh)), dw = Math.round(bw * sc), dh = Math.round(bh * sc);
    g.drawImage(img, bx, by, bw, bh, Math.round(cx - dw / 2), Math.round(cy - dh / 2), dw, dh);
  }
  const itemsMode = () => st.mode === "items";
  const iconAlpha = (r) => (itemsMode() && r && !r.item ? 7 / 16 : 1);

  // A box's wallpaper and Pokémon, shifted `dx` (box changes slide them).
  function drawBox(b, dx) {
    const wp = image("assets/pc/wallpaper-" + (st.opts.wallpapers[b] || 0) + ".png");
    g.save();
    g.beginPath(); g.rect(80, 16, 160, 144); g.clip();
    if (ready(wp)) g.drawImage(wp, 80 + dx, 16);
    // The hand's shadow, under the box's Pokémon (subpriority 21 to their 14-19).
    if (b === st.box && !st.scroll && st.cursor.area === "box" && !st.moving && ready(PC("cursor-shadow"))) {
      const [hx, hy] = st.handPos || handXY(st.cursor);
      g.drawImage(PC("cursor-shadow"), hx - 8, hy + 20 - 8);
    }
    st.opts.boxes[b].forEach((r, i) => {
      if (!r || (st.releasing && st.releasing.r === r)) return;
      const cx = 100 + 24 * (i % 6) + dx, cy = 44 + 24 * Math.floor(i / 6);
      drawIcon(r, cx, cy, iconAlpha(r));
      if (itemsMode()) drawItemIcon(r.item, cx + 12, cy + 12);
    });
    // The box's name, white, centred on x 160 (FONT_NORMAL_COPY_1, 64x16 at y 20).
    const t = window.GbaMenus.Surface(), name = st.opts.names[b];
    t.text(name, 160 - Math.floor(t.textWidth(name) / 2), 22, TITLE_FG, TITLE_SHADOW);
    g.drawImage(t.canvas(), dx, 0);
    g.restore();
  }

  function paint() {
    if (!st) return;
    st.tick++;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    // BG3: the backdrop drifts half a pixel right and up every frame.
    const bd = PC(itemsMode() ? "scrolling-bg-items" : "scrolling-bg");
    if (ready(bd)) {
      const ox = Math.floor(st.tick / 2) % 256, oy = (256 - (Math.floor(st.tick / 2) % 256)) % 256;
      for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(bd, x, y);
    }
    // BG2 and the box's sprites (under the interface).
    if (st.scroll) { drawBox(st.scroll.from, st.scroll.dx); drawBox(st.box, st.scroll.dx + st.scroll.dir * 192); }
    else drawBox(st.box, 0);
    // The box arrows (92, 28) and (228, 28), bouncing while the hand is on the name.
    const arrows = PC("box-arrows");
    if (ready(arrows) && !st.scroll) {
      const b = st.cursor.area === "title" ? Math.floor((st.tick / 4) % 6) : 0;
      g.drawImage(arrows, 0, 0, 8, 16, 88 - b, 20, 8, 16);
      g.drawImage(arrows, 0, 16, 8, 16, 224 + b, 20, 8, 16);
    }
    // BG1: the interface, PKMN DATA, the party panel / PARTY POKéMON, CLOSE BOX.
    if (ready(PC("menu"))) g.drawImage(PC("menu"), 0, 0);
    const shown = !!displayRecord();
    if (ready(PC("pkmn-data"))) g.drawImage(PC("pkmn-data"), 0, shown ? 0 : 16, 64, 16, 8, 0, 64, 16);
    const panel = PC("party-panel");
    if (ready(panel)) {
      const k = st.partyRows;   // 0 (hidden: the button) to 20 (shown)
      g.drawImage(panel, 0, (20 - k) * 8, 96, (k + 2) * 8, 80, 0, 96, (k + 2) * 8);
      if (k > 0) {
        // (SetPartySlotTilemaps: each slot blue with a Pokémon in it, grey without.)
        const empty = PC("party-slot-empty"), filled = PC("party-slot-filled"), shift = (k - 20) * 8;
        for (let i = 1; i < 6; i++) {
          const img = st.party[i] ? filled : empty;
          if (ready(img)) g.drawImage(img, 136, 8 + 24 * (i - 1) + shift);
        }
        st.party.forEach((r, i) => {
          if (!r || (st.releasing && st.releasing.r === r)) return;
          const [x, y] = partyIconXY(i);
          drawIcon(r, x, y + shift, iconAlpha(r));
          if (itemsMode()) drawItemIcon(r.item, i === 0 ? 116 : 164, (i === 0 ? 76 : 24 * (i - 1) + 28) + shift);
        });
      }
    }
    const close = PC("close-box");
    if (ready(close)) {
      const lit = st.cursor.area === "buttons" && st.cursor.pos === 1 && Math.floor(st.tick / 31) % 2 === 1;
      g.drawImage(close, 0, lit ? 16 : 0, 72, 16, 168, 0, 72, 16);
    }
    // A Pokémon being released shrinks away (or comes back).
    if (st.releasing) {
      const rl = st.releasing, [x, y] = rl.xy, sc = rl.scale;
      const v = st.opts.view(rl.r), img = image(v.icon);
      if (ready(img) && sc > 0) g.drawImage(img, 0, 0, 32, 32, x - 16 * sc, y - 16 * sc, 32 * sc, 32 * sc);
    }
    drawDisplayMon();
    // The hand (and what it holds), over everything but the windows.
    drawHand();
    // BG0: windows and messages.
    if (st.layer) g.drawImage(st.layer, 0, 0);
    if (st.fade) { g.fillStyle = "rgba(255,255,255," + st.fade + ")"; g.fillRect(80, 16, 160, 144); }
    if (st.screen != null) screenEffect(st.screen);
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    out.restore();
  }

  // The Pokémon (or item) under the hand, or the one held.
  function displayRecord() {
    if (st.held) return st.held.r;
    return slotOf(st.cursor);
  }
  function drawDisplayMon() {
    const r = displayRecord(), t = window.GbaMenus.Surface();
    // (The waveform's two sprites at (8, 9) and (71, 9) blink while a Pokémon shows.)
    const wave = PC("waveform");
    if (ready(wave)) {
      const f = r ? [2, 4, 6][Math.floor(st.tick / 8) % 3] : 0, f2 = r ? [2, 4, 6][Math.floor(st.tick / 8 + 1) % 3] : 0;
      g.drawImage(wave, 0, f * 8, 16, 8, 0, 5, 16, 8);
      g.drawImage(wave, 0, f2 * 8, 16, 8, 63, 5, 16, 8);
    }
    if (!r) return;
    const v = st.opts.view(r);
    // The front picture (CreateDisplayMonSprite at 40, 48), its feet at the
    // screen's bottom, inside the screen (8-72, 16-80).
    const pic = image(v.pic);
    if (ready(pic)) {
      g.save(); g.beginPath(); g.rect(8, 16, 64, 64); g.clip();
      g.drawImage(pic, 40 - 48, 80 - (96 - (v.picEmpty || 0)));
      g.restore();
    }
    // Window 0 (0, 88): name, /species, gender and level, item.
    const lines = itemsMode() ? 15 : 0;
    if (itemsMode()) t.text(v.item || "", 6, 88, DATA_FG, DATA_SHADOW, "small");
    t.text(v.name, 6, 88 + lines, DATA_FG, DATA_SHADOW);
    t.text("/" + v.species, 6, 102 + lines, DATA_FG, DATA_SHADOW);
    let x = 10;
    if (v.gender === "M" || v.gender === "F") {
      const c = v.gender === "M" ? MALE : FEMALE;
      t.text(v.gender === "M" ? "♂" : "♀", x, 116 + lines, c[0], c[1]);
    }
    x += 8;
    t.text("{LV}" + v.level, x, 116 + lines, DATA_FG, DATA_SHADOW);
    if (!itemsMode()) t.text(v.item || "", 6, 132, DATA_FG, DATA_SHADOW, "small");
    g.drawImage(t.canvas(), 0, 0);
  }

  function drawHand() {
    const [x, y] = st.handPos || handXY(st.cursor);
    const cur = PC(st.multi ? "cursor-multi" : "cursor"), flip = st.cursor.area === "buttons";
    // (BOUNCE: frames 0 and 1, 30 each; OPEN 2; FIST 3.)
    const frame = st.handFrame != null ? st.handFrame : st.moving ? 0 : Math.floor(st.tick / 30) % 2;
    const y2 = st.handY2 || 0;
    if (st.held) drawIcon(st.held.r, x, y + y2 + 4);
    if (st.heldItem) drawItemIcon(st.heldItem, x, y + y2 + 16);
    if (!ready(cur)) return;
    g.save();
    g.translate(x, y + y2);
    if (flip) g.scale(1, -1);
    g.drawImage(cur, 0, frame * 32, 32, 32, -16, -16, 32, 32);
    g.restore();
  }

  // The PC turning on or off (pc_screen_effect.c): a white window opening out
  // from the middle, then the screen (t 0 to 1 opens it; null: no effect).
  function screenEffect(t) {
    const hw = Math.min(1, t * 1.6) * 120, hh = Math.max(0, (t - 0.6) / 0.4) * 80;
    const x0 = 120 - hw, x1 = 120 + hw, y0 = 80 - Math.max(0.5, hh), y1 = 80 + Math.max(0.5, hh);
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, y0); g.fillRect(0, y1, W, H - y1); g.fillRect(0, y0, x0, y1 - y0); g.fillRect(x1, y0, W - x1, y1 - y0);
    if (t < 0.6) { g.fillStyle = "#fff"; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }

  // ---------- Windows (BG0) ----------

  // The message box (window 1: 88-232, 136-152, its frame round it), the menu
  // above it, a Yes / No, or the "which box?" popup.
  function windows() {
    const s = window.GbaMenus.Surface(), G = GM(), userFrame = "type" + ((st.frame || 0) + 1);
    if (st.message != null) {
      s.frame("std", G.palettes.std3, 11, 17, 18, 2);
      s.fill(88, 136, 144, 16, WHITE);
      s.text(st.message, 88, 138, DARK, LIGHT);
    }
    if (st.menu) {
      // AddMenu: width = longest + 2, text area ending at tile 28, row 14.
      const items = st.menu.items, w = Math.max(...items.map((it) => it.label.length)) + 2, h = 2 * items.length;
      const left = 29 - w, top = 15 - h;
      s.frame(userFrame, G.frames[userFrame].palette, left, top, w, h);
      s.fill(left * 8, top * 8, w * 8, h * 8, WHITE);
      items.forEach((it, i) => s.text(it.label, left * 8 + 8, top * 8 + 2 + 16 * i, DARK, LIGHT));
      s.text("▶", left * 8, top * 8 + 2 + 16 * st.menu.cursor, DARK, LIGHT);
    }
    if (st.info) {
      // MOVE ITEMS' INFO: the item's description (window 2: 0, 12, 25 x 8).
      s.frame("std", G.palettes.std3, 1, 13, 23, 6);
      s.fill(8, 104, 184, 48, WHITE);
      st.info.forEach((l, i) => s.text(l, 8, 106 + 14 * i, DARK, LIGHT));
    }
    st.layer = s.canvas();
    if (st.popup) {
      const p = st.popup, img = PC("choose-box"), c = st.layer.getContext("2d");
      if (ready(img)) c.drawImage(img, 120, 64);
      const t = window.GbaMenus.Surface(), n = st.opts.boxes[p.box].filter(Boolean).length;
      t.text(st.opts.names[p.box], 128, 72, POPUP_FG, POPUP_SHADOW);
      const num = String(n).padStart(2, " ");
      t.text(num, 168 - t.textWidth(num), 88, POPUP_FG, POPUP_SHADOW);
      t.text("/30", 168, 88, POPUP_FG, POPUP_SHADOW);
      c.drawImage(t.canvas(), 0, 0);
      const arrows = PC("box-arrows"), b = Math.floor((st.tick / 4) % 6);
      if (ready(arrows)) { c.drawImage(arrows, 0, 0, 8, 16, 120 - b, 80, 8, 16); c.drawImage(arrows, 0, 16, 8, 16, 192 + b, 80, 8, 16); }
    }
  }
  const redraw = () => { windows(); };
  function say(text) { st.message = text; redraw(); }

  function loop() {
    if (!st) return;
    if (st.popup) windows();
    paint();
    raf = requestAnimationFrame(loop);
  }

  // A menu in the corner: the chosen value, or null (B).
  async function menu(items, text) {
    if (text != null) st.message = text;
    st.menu = { items, cursor: 0 };
    redraw();
    const v = await keys((k) => {
      const m = st.menu;
      if (k === "up") { m.cursor = (m.cursor + m.items.length - 1) % m.items.length; se("se_select"); redraw(); }
      else if (k === "down") { m.cursor = (m.cursor + 1) % m.items.length; se("se_select"); redraw(); }
      else if (k === "a") { se("se_select"); return m.items[m.cursor].value; }
      else if (k === "b") { se("se_select"); return null; }
      return undefined;
    });
    st.menu = null;
    redraw();
    return v;
  }
  // A message, until a key (the guards: SE_FAILURE first).
  async function note(text, fail) {
    if (fail) se("se_failure");
    say(text);
    await keys((k) => (["a", "b", "up", "down", "left", "right"].includes(k) ? true : undefined));
    say(null);
  }
  // Yes / No (24, 11), the cursor on NO.
  async function yesNo(text) {
    say(text);
    const yes = await window.GbaMenus.yesNo(overlayEl, { frame: st.frame, left: 23, top: 11, cursor: 1 });
    return yes;
  }

  // "… in which box?": left / right through the boxes. -> box, or null.
  async function chooseBox(text, from) {
    say(text);
    st.popup = { box: from };
    const v = await keys((k) => {
      if (k === "left" || k === "right") { st.popup.box = (st.popup.box + (k === "left" ? BOXES - 1 : 1)) % BOXES; se("se_select"); }
      else if (k === "a") { se("se_select"); return st.popup.box; }
      else if (k === "b") { se("se_select"); return null; }
      return undefined;
    });
    st.popup = null;
    redraw();
    return v;
  }

  // ---------- Motion ----------

  async function moveHand(to) {
    const [x0, y0] = handXY(st.cursor);
    st.cursor = to;
    const [x1, y1] = handXY(to);
    st.moving = true;
    await frames(6, (i) => { st.handPos = [x0 + (x1 - x0) * (i + 1) / 6, y0 + (y1 - y0) * (i + 1) / 6]; });
    st.handPos = null; st.moving = false;
  }
  // The hand's grab / place: down 8, open or close, back up.
  async function handDip(mid) {
    st.handFrame = 2;
    await frames(8, (i) => { st.handY2 = i + 1; });
    mid();
    st.handFrame = 3;
    await frames(8, (i) => { st.handY2 = 7 - i; });
    st.handY2 = 0;
  }
  // The party panel unrolling (20 frames, SE_WIN_OPEN) or rolling back up.
  async function showParty(on) {
    if ((st.partyRows === 20) === on) return;
    if (on) se("se_win_open");
    await frames(20, () => { st.partyRows += on ? 1 : -1; });
    if (!on) compactParty();
  }
  function compactParty() {
    const mons = st.party.filter(Boolean);
    for (let i = 0; i < 6; i++) st.party[i] = mons[i] || null;
  }
  // Changing boxes: the new one slides in, 6 pixels a frame for 32 frames.
  async function scrollTo(b) {
    if (b === st.box) return;
    const fwd = (b - st.box + BOXES) % BOXES, dir = fwd < 7 ? 1 : -1;
    se("se_select");
    st.scroll = { from: st.box, dir, dx: 0 };
    st.box = b;
    await frames(32, () => { st.scroll.dx -= 6 * dir; });
    st.scroll = null;
  }

  // ---------- Rules ----------

  const healthy = (r) => r && r.hp > 0;
  // Would the party (with `without` gone and `plus` added) still have a Pokémon that can battle?
  function partyOk(without, plus) {
    return st.party.some((r) => r && r !== without && healthy(r)) || healthy(plus);
  }
  // (The caller's party follows along, packed; nothing is saved while a
  // Pokémon is in the hand, so it's never lost.)
  function changed() {
    st.views.clear();
    if (st.held) return;
    const mons = st.party.filter(Boolean);
    st.opts.party.length = 0;
    mons.forEach((r) => st.opts.party.push(r));
    if (st.opts.changed) st.opts.changed();
  }

  // ---------- Actions ----------

  async function doSummary(r) {
    const list = st.cursor.area === "party" ? st.party.filter(Boolean) : st.opts.boxes[st.box].filter(Boolean);
    const target = st.held && !slotOf(st.cursor) ? st.held.r : r;
    const records = list.includes(target) ? list : [target];
    canvas.classList.add("hidden");
    await st.opts.summary(records, records.indexOf(target));
    canvas.classList.remove("hidden");
    changed();
  }

  async function release(r) {
    if (st.cursor.area === "party" && !partyOk(r)) { await note("That's your last Pokémon!", true); return; }
    if (r.item === "mail") { await note("Please remove the mail.", true); return; }
    if (!(await yesNo("Release this Pokémon?"))) { say(null); return; }
    const name = st.opts.view(r).name;
    const xy = st.cursor.area === "box" ? [100 + 24 * (st.cursor.pos % 6), 44 + 24 * Math.floor(st.cursor.pos / 6)] : partyIconXY(st.cursor.pos);
    st.releasing = { r, xy, scale: 1 };
    say(null);
    await frames(60, (i) => { st.releasing.scale = 1 - (i + 1) / 60; });
    setSlot(st.cursor, null);
    st.releasing = null;
    if (r.item && st.opts.toBag) st.opts.toBag(r.item);
    if (st.cursor.area === "party") compactParty();
    changed();
    await note(name + " was released.");
    await note("Bye-bye, " + name + "!");
  }

  async function store(r) {
    if (!partyOk(r)) { await note("That's your last Pokémon!", true); return; }
    for (;;) {
      const b = await chooseBox("Deposit in which box?", st.depositBox);
      if (b == null) { say(null); return; }
      const slot = st.opts.boxes[b].findIndex((x) => !x);
      if (slot < 0) { await note("The box is full."); continue; }
      st.depositBox = b;
      say(null);
      await handDip(() => { setSlot(st.cursor, null); });
      st.opts.boxes[b][slot] = r;
      compactParty();
      if (b !== st.box) await scrollTo(b);
      changed();
      await note(st.opts.view(r).name + " was deposited.");
      return;
    }
  }

  async function withdraw(r) {
    const free = st.party.findIndex((x) => !x);
    if (free < 0) { await note("Your party's full!", true); return; }
    say(null);
    await handDip(() => { setSlot(st.cursor, null); st.held = { r }; });
    const wasShown = st.partyRows === 20;
    await showParty(true);
    st.party[free] = r;
    st.held = null;
    se("se_select");
    await frames(10);
    if (!wasShown) await showParty(false);
    changed();
  }

  // MOVE POKéMON: pick up, put down, or swap with what's held.
  async function pickUp() {
    const r = slotOf(st.cursor);
    if (st.cursor.area === "party" && !partyOk(r)) { await note("That's your last Pokémon!", true); return; }
    await handDip(() => { setSlot(st.cursor, null); st.held = { r }; });
  }
  async function putDown() {
    const target = slotOf(st.cursor), held = st.held.r;
    if (st.cursor.area === "party" && target && !st.party.some((x) => x && x !== target && healthy(x)) && !healthy(held)) {
      await note("That's your last Pokémon!", true); return;
    }
    await handDip(() => {
      setSlot(st.cursor, held);
      st.held = target ? { r: target } : null;
    });
    if (!target && st.cursor.area === "party") {
      compactParty();
      const i = st.party.indexOf(held);
      if (i >= 0) st.cursor = { area: "party", pos: i };
    }
    changed();
  }

  // MOVE ITEMS.
  async function itemAction(r) {
    const name = (id) => st.opts.itemName(id);
    let items;
    if (!st.heldItem) items = r.item ? [["Take", "take"], ["Bag", "bag"], ["Info", "info"]] : [["Give", "give"]];
    else items = r.item ? [["Switch", "switch"]] : [["Give", "give"]];
    const what = st.heldItem || r.item;
    const v = await menu(items.concat([["Cancel", null]]).map(([label, value]) => ({ label, value })),
      what ? name(what) + " is selected." : "Give to a Pokémon?");
    say(null);
    if (v === "take") { st.heldItem = r.item; r.item = ""; }
    else if (v === "bag") {
      if (st.opts.toBag(r.item)) { r.item = ""; await note("Placed item in the Bag."); }
      else await note("The Bag is full.", true);
    } else if (v === "info") {
      st.info = wrapText(st.opts.itemDesc(r.item), 176);
      redraw();
      await keys((k) => (k === "a" || k === "b" ? true : undefined));
      st.info = null; redraw();
    } else if (v === "give" && st.heldItem) {
      r.item = st.heldItem; st.heldItem = null;
      await note(name(r.item) + " is now held.");
    } else if (v === "give") {
      canvas.classList.add("hidden");
      const id = await st.opts.pickItem();
      canvas.classList.remove("hidden");
      if (id) { r.item = id; await note(name(id) + " is now held."); }
    } else if (v === "switch") {
      const was = r.item;
      r.item = st.heldItem; st.heldItem = was;
      await note("Changed to " + name(was) + ".");
    }
    changed();
  }
  function wrapText(text, width) {
    const s = window.GbaMenus.Surface(), lines = [];
    for (const para of String(text || "").split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? line + " " + word : word;
        if (line && s.textWidth(next) > width) { lines.push(line); line = word; } else line = next;
      }
      lines.push(line);
    }
    return lines.slice(0, 3);
  }

  // A on a Pokémon (or an empty slot): FireRed's menu for the mode.
  async function onMon() {
    const r = slotOf(st.cursor), inParty = st.cursor.area === "party";
    if (itemsMode()) { if (r) await itemAction(r); return; }
    if (!r && !st.held) return;
    const L = (label, value) => ({ label, value });
    let items;
    if (st.mode === "deposit") items = [L("Store", "store"), L("Summary", "summary"), L("Release", "release")];
    else if (st.mode === "withdraw") items = [L("Withdraw", "withdraw"), L("Summary", "summary"), L("Release", "release")];
    else if (!st.held) items = [L("Move", "move"), L("Summary", "summary"), inParty ? L("Store", "store") : L("Withdraw", "withdraw"), L("Release", "release")];
    else if (r) items = [L("Shift", "shift"), L("Summary", "summary")];
    else items = [L("Place", "place"), L("Summary", "summary")];
    const name = st.opts.view(r || st.held.r).name;
    const v = await menu(items.concat([L("Cancel", null)]), name + " is selected.");
    say(null);
    if (v === "summary") await doSummary(r);
    else if (v === "store") await store(r);
    else if (v === "withdraw") await withdraw(r);
    else if (v === "release") await release(r);
    else if (v === "move") await pickUp();
    else if (v === "shift" || v === "place") await putDown();
  }

  // A on the box's name: JUMP / WALLPAPER / NAME.
  async function boxMenu() {
    const L = (label, value) => ({ label, value });
    const v = await menu([L("Jump", "jump"), L("Wallpaper", "wallpaper"), L("Name", "name"), L("Cancel", null)], "What do you want to do?");
    say(null);
    if (v === "jump") {
      const b = await chooseBox("Jump to which box?", st.box);
      say(null);
      if (b != null) await scrollTo(b);
    } else if (v === "wallpaper") {
      for (;;) {
        const theme = await menu(THEMES.map((t, i) => L(t, i)).concat([L("Cancel", null)]), "Please pick a theme.");
        if (theme == null) break;
        const w = await menu(WALLPAPER_NAMES.slice(theme * 4, theme * 4 + 4).map((n, i) => L(n, theme * 4 + i)).concat([L("Cancel", null)]), "Pick the wallpaper.");
        if (w == null) continue;
        say(null);
        await frames(16, (i) => { st.fade = (i + 1) / 16; });
        st.opts.wallpapers[st.box] = w;
        changed();
        await frames(16, (i) => { st.fade = 1 - (i + 1) / 16; });
        st.fade = 0;
        break;
      }
      say(null);
    } else if (v === "name" && st.opts.rename) {
      canvas.classList.add("hidden");
      const n = await st.opts.rename(st.opts.names[st.box]);
      canvas.classList.remove("hidden");
      if (n) { st.opts.names[st.box] = n.slice(0, 8); changed(); }
    }
  }

  // Leaving: CLOSE BOX ("Exit from the box.") or B ("Continue box operations?").
  async function leave(viaClose) {
    if (st.held) { await note("You're holding a Pokémon!", true); return false; }
    if (st.heldItem) {
      if (!(await yesNo("Put this item in the Bag?"))) { say(null); return false; }
      if (!st.opts.toBag(st.heldItem)) { await note("The Bag is full.", true); return false; }
      st.heldItem = null;
      changed();
    }
    const yes = await yesNo(viaClose ? "Exit from the box." : "Continue box operations?");
    say(null);
    return viaClose ? yes : !yes;
  }

  // ---------- Input ----------

  async function step(k) {
    const c = st.cursor, mode = st.mode;
    const go = (to) => { se("se_select"); return moveHand(to); };
    if (k === "b") return (await leave(false)) ? "exit" : null;
    if (c.area === "box") {
      const row = Math.floor(c.pos / 6), col = c.pos % 6;
      if (k === "up") return go(row ? { area: "box", pos: c.pos - 6 } : { area: "title", pos: 0 });
      if (k === "down") return go(row < 4 ? { area: "box", pos: c.pos + 6 } : { area: "buttons", pos: col < 3 ? 0 : 1 });
      if (k === "left") return go({ area: "box", pos: row * 6 + (col + 5) % 6 });
      if (k === "right") return go({ area: "box", pos: row * 6 + (col + 1) % 6 });
      if (k === "start") return go({ area: "title", pos: 0 });
      if (k === "a") return onMon();
    } else if (c.area === "title") {
      if (k === "up") return go({ area: "buttons", pos: 0 });
      if (k === "down") return go({ area: "box", pos: 2 });
      if (k === "left" || k === "right") return scrollTo((st.box + (k === "left" ? BOXES - 1 : 1)) % BOXES);
      if (k === "a") return boxMenu();
    } else if (c.area === "buttons") {
      if (k === "up") return go({ area: "box", pos: c.pos ? 29 : 24 });
      if (k === "down" || k === "start") return go({ area: "title", pos: 0 });
      if (k === "left" || k === "right") return go({ area: "buttons", pos: c.pos ^ 1 });
      if (k === "a" && c.pos === 1) return (await leave(true)) ? "exit" : null;
      if (k === "a" && mode === "withdraw") return note("Which one will you take?");
      if (k === "a") {
        await showParty(true);
        const free = st.party.findIndex((x) => !x);
        return moveHand({ area: "party", pos: st.held ? Math.max(0, Math.min(5, free < 0 ? 5 : free)) : 0 });
      }
    } else if (c.area === "party") {
      if (k === "up") return go({ area: "party", pos: (c.pos + 6) % 7 });
      if (k === "down") return go({ area: "party", pos: (c.pos + 1) % 7 });
      if (k === "left" && c.pos > 0) { st.partyBack = c.pos; return go({ area: "party", pos: 0 }); }
      if (k === "right" && c.pos === 0) return go({ area: "party", pos: st.partyBack || 1 });
      const hide = async () => {
        if (mode === "deposit") return;
        await moveHand({ area: "box", pos: st.boxPos || 0 });
        await showParty(false);
      };
      if (k === "right") return hide();
      if (k === "a" && c.pos === 6) return mode === "deposit" ? ((await leave(true)) ? "exit" : null) : hide();
      if (k === "a") return onMon();
    }
    return null;
  }

  async function open(opts) {
    const party = opts.party.slice(0, 6);
    while (party.length < 6) party.push(null);
    st = {
      opts, mode: opts.mode, box: opts.box || 0, frame: opts.frame, party, views: new Map(),
      cursor: opts.mode === "deposit" ? { area: "party", pos: 0 } : { area: "box", pos: 0 },
      partyRows: opts.mode === "deposit" ? 20 : 0, depositBox: opts.box || 0,
      tick: 0, held: null, heldItem: null, message: null, menu: null, popup: null, layer: null, screen: 0
    };
    canvas.classList.remove("hidden");
    redraw();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    se("se_pc_login");
    await frames(16, (i) => { st.screen = (i + 1) / 16; });
    st.screen = null;
    for (;;) {
      const k = await keys((key) => (["up", "down", "left", "right", "a", "b", "start"].includes(key) ? key : undefined));
      if (st.cursor.area === "box") st.boxPos = st.cursor.pos;
      if ((await step(k)) === "exit") break;
    }
    se("se_pc_off");
    await frames(16, (i) => { st.screen = 1 - (i + 1) / 16; });
    changed();
    const box = st.box;
    close();
    return box;
  }

  function close() {
    st = null;
    cancelAnimationFrame(raf);
    canvas.classList.add("hidden");
  }

  window.StorageScreen = { open, close };
})();
