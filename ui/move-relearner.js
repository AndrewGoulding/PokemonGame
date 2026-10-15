// FireRed's Move Relearner screen (src/learn_move.c), drawn the way the game
// draws it at 240x160 (data/summary-screen.js, tools/build-summary.js): the
// chosen move's TYPE, POWER, ACCURACY, PP and EFFECT on the striped panel at
// the top left, the moves in a list on the right, and the message box along
// the bottom.
//
//   const learned = await MoveRelearner.open({
//     name,      // the Pokémon's name, for the messages
//     moves,     // the moves it can relearn
//     known,     // the names of the moves it knows
//     frame,     // the Option screen's FRAME (0-9)
//     forget,    // async (move) => the slot (0-3) to forget, or null: FireRed
//                // opens the Summary screen's move list for this
//     teach      // (move, slot): slot null when there was room for it
//   })           // -> the move learned, or null
//
// As in FireRed: up / down move through the list (no wrapping), A picks, B
// gives up; each question has FireRed's YES / NO box.
(function () {
  "use strict";

  const W = 240, H = 160;
  const D = () => window.SUMMARY_SCREEN;
  const GM = () => window.GBA_MENUS;

  const canvas = document.createElement("canvas");
  canvas.className = "party-menu hidden";   // (the party screen's layer: over the map, under the overlay)
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);

  // Sheets: one byte a pixel (base64), decoded once.
  const decoded = {};
  function px(name) {
    if (!decoded[name]) {
      const bin = atob(D().sheets[name].px), a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      decoded[name] = a;
    }
    return decoded[name];
  }
  // Part of a sheet onto the surface (colour 0 clear), colours from `pal` (index & 15).
  function blit(s, name, sx, sy, w, h, x, y, pal) {
    const sh = D().sheets[name], p = px(name);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = p[(sy + j) * sh.width + sx + i] & 15;
      if (v) s.put(x + i, y + j, pal[v]);
    }
  }

  // ---------- Pieces ----------

  // sMenuInfoIcons (src/list_menu.c): each type's 32x12 icon and the 40x12
  // labels, by tile in graphics/interface/menu_info.png. (Fairy, which FireRed
  // doesn't have, is the expansion's, in its "???" slot.)
  const TYPE_TILE = { Normal: 0x20, Fighting: 0x64, Flying: 0x60, Poison: 0x80, Ground: 0x48, Rock: 0x44, Bug: 0x6C,
    Ghost: 0x68, Steel: 0x88, Fire: 0x24, Water: 0x28, Grass: 0x2C, Electric: 0x40, Psychic: 0x84, Ice: 0x4C,
    Dragon: 0xA0, Dark: 0x8C, Fairy: 0xA4 };
  const LABEL = { type: 0xA8, power: 0xC0, accuracy: 0xC8, pp: 0xE0, effect: 0xE8 };
  const menuIcon = (s, tile, w, x, y) => blit(s, "menuInfo", (tile % 16) * 8, Math.floor(tile / 16) * 8, w, 12, x, y, D().pals.types);

  // A description in lines no wider than `width` (FireRed's own are already
  // broken into lines; later ones are re-wrapped to fit).
  function wrap(s, text, width) {
    const lines = String(text || "").split("\n");
    if (lines.every((l) => s.textWidth(l) <= width)) return lines;
    const out = [];
    let line = "";
    for (const word of lines.join(" ").split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && s.textWidth(next) > width) { out.push(line); line = word; } else line = next;
    }
    if (line) out.push(line);
    return out;
  }

  // ---------- The screen ----------

  let st = null;
  const STD = [[255, 255, 255], [255, 255, 255], [98, 98, 98], [213, 213, 205]];   // std_menu.pal 0-3 (palette 15)

  function draw() {
    const S = window.GbaMenus.Surface, s = S(), d = D();
    s.fill(0, 0, W, H, [0, 0, 0]);
    // BG1: the panel (graphics/interface/learn_move.bin, palette 0).
    const lm = d.sheets.learnMove, lp = px("learnMove");
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
      const e = d.maps.learnMove[ty * 32 + tx], t = e & 0x3ff;
      if (!t) continue;
      const sx = (t % (lm.width / 8)) * 8, sy = Math.floor(t / (lm.width / 8)) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = lp[(sy + y) * lm.width + sx + x] & 15;
        if (v) s.put(tx * 8 + x, ty * 8 + y, lm.palette[v]);
      }
    }
    // The labels (LoadMoveInfoUI).
    menuIcon(s, LABEL.type, 40, 1, 4); menuIcon(s, LABEL.power, 40, 80, 4); menuIcon(s, LABEL.accuracy, 40, 80, 19);
    menuIcon(s, LABEL.pp, 40, 1, 19); menuIcon(s, LABEL.effect, 40, 1, 34);
    // The chosen move (PrintMoveInfo); nothing for CANCEL.
    const move = st.items[st.cursor];
    const m = move && window.MOVES[move];
    if (m) {
      menuIcon(s, TYPE_TILE[m.type] != null ? TYPE_TILE[m.type] : 0xA4, 32, 41, 4);
      const right3 = (n) => (n < 2 ? "---" : String(n).padStart(3, " "));
      s.text(m.cat === "Status" || !m.power ? "---" : right3(m.power), 121, 4, STD[2], STD[3]);
      s.text(m.acc === true || !m.acc ? "---" : right3(m.acc), 121, 18, STD[2], STD[3]);
      s.text(String(m.pp), 42, 18, STD[2], STD[3]);
      const text = (d.moveText || {})[move] || m.shortDesc || "";
      wrap(s, text, 120).slice(0, 4).forEach((line, i) => s.text(line, 17, 48 + i * 14, STD[2], STD[3]));
    }
    // The list (W6, in your frame): 7 rows of 14, ▶ beside the chosen one.
    const frame = "type" + ((st.frame || 0) + 1);
    s.frame(frame, GM().frames[frame].palette, 19, 1, 10, 12);
    s.fill(152, 8, 80, 96, STD[1]);
    for (let r = 0; r < 7 && st.top + r < st.items.length; r++) {
      const it = st.items[st.top + r];
      const y = 8 + r * 14;
      if (y + 14 > 104) { s.text(it || "CANCEL", 160, y, STD[2], STD[3]); continue; }
      s.text(it || "CANCEL", 160, y, STD[2], STD[3]);
      if (st.top + r === st.cursor) s.text("▶", 152, y, STD[2], STD[3]);
    }
    // The message box (W7, in your frame).
    s.frame(frame, GM().frames[frame].palette, 2, 15, 26, 4);
    s.fill(16, 120, 208, 32, STD[1]);
    String(st.shown || "").split("\n").slice(0, 2).forEach((line, i) => s.text(line, 16, 122 + i * 15, STD[2], STD[3]));
    // ▼ (the list goes on): FireRed's bobbing arrow at (192, 104), shown with 7 or more entries.
    if (st.items.length >= 7 && !st.asking) {
      const bob = Math.round(Math.sin((st.tick * 10 & 255) / 256 * 2 * Math.PI));
      const sp = D().sheets.scrollArrows.palette;
      blit(s, "scrollArrows", 0, 32, 8, 8, 192, 104 + bob, sp);
      blit(s, "scrollArrows", 0, 40, 8, 8, 200, 104 + bob, sp);
    }
    s.show(canvas);
  }

  let raf = 0;
  function loop() {
    if (!st) return;
    st.tick++;
    if (st.items.length >= 7) draw();
    raf = requestAnimationFrame(loop);
  }

  // Writes `text` into the message box a letter at a time (A finishes it);
  // "\p" pages wait for A. With `wait`, the last page waits for A too.
  async function say(text, wait) {
    const pages = String(text).split("\\p").filter((p, i, a) => p || i < a.length - 1);
    const frames = [8, 4, 1][window.GameOptions ? window.GameOptions.get().textSpeed : 1] || 4;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let skip = false;
      const onKey = (e) => { if (["z", "Z", " ", "Enter", "x", "X"].includes(e.key)) { skip = true; e.preventDefault(); e.stopImmediatePropagation(); } };
      document.addEventListener("keydown", onKey, true);
      for (let n = 1; n <= page.length && !skip; n++) {
        st.shown = page.slice(0, n); draw();
        await new Promise((r) => setTimeout(r, frames * 1000 / 60));
      }
      document.removeEventListener("keydown", onKey, true);
      st.shown = page; draw();
      if (i < pages.length - 1 || wait) await window.GbaMenus.keys((k) => (k === "a" || k === "b" ? (window.GbaMenus.se(), true) : undefined));
    }
  }
  async function yesNo() {
    st.asking = true; draw();
    const r = await window.GbaMenus.yesNo(overlayEl, { frame: st.frame, left: 21, top: 8 });
    st.asking = false; draw();
    return r;
  }

  // Up / down through the list (ListMenu: no wrap; it scrolls once the ▶
  // passes the middle), A picks, B is CANCEL.
  function pickFromList() {
    return window.GbaMenus.keys((k) => {
      const n = st.items.length;
      if (k === "up" || k === "down") {
        const c = st.cursor + (k === "up" ? -1 : 1);
        if (c < 0 || c >= n) return undefined;
        st.cursor = c;
        if (st.cursor - st.top > 4 && st.top + 7 < n) st.top++;
        if (st.cursor - st.top < 2 && st.top > 0) st.top--;
        window.GbaMenus.se(); draw();
      } else if (k === "a") { window.GbaMenus.se(); return st.items[st.cursor]; }
      else if (k === "b") { window.GbaMenus.se(); return null; }
      return undefined;
    });
  }

  async function open(opts) {
    st = { items: opts.moves.concat([null]), cursor: 0, top: 0, frame: opts.frame, shown: "", tick: 0, asking: false };
    const name = opts.name, known = opts.known.slice();
    canvas.classList.remove("hidden");
    draw();
    raf = requestAnimationFrame(loop);
    const fanfare = (n) => (window.GameAudio ? window.GameAudio.fanfare(n) : Promise.resolve());
    // "… learned …" with the level-up fanfare; A once it's done.
    const learned = async (text) => {
      const jingle = fanfare("mus_level_up");
      await say(text);
      await jingle;
      await window.GbaMenus.keys((k) => (k === "a" || k === "b" ? (window.GbaMenus.se(), true) : undefined));
    };
    try {
      for (;;) {
        st.shown = "Teach which move to " + name + "?"; draw();
        const move = await pickFromList();
        if (!move) {
          await say("Give up trying to teach a new\nmove to " + name + "?");
          if (await yesNo()) return null;
          continue;
        }
        await say("Teach " + move + "?");
        if (!(await yesNo())) continue;
        if (known.length < 4) {
          opts.teach(move, null);
          await learned(name + " learned\n" + move + ".");
          return move;
        }
        for (;;) {
          await say(name + " is trying to learn\n" + move + ".\\pBut " + name + " can't learn more\nthan four moves.\\p" +
            "Delete an older move to make\nroom for " + move + "?");
          if (await yesNo()) {
            await say("Which move should be forgotten?", true);
            canvas.classList.add("hidden");
            const slot = await opts.forget(move);
            canvas.classList.remove("hidden");
            draw();
            if (slot != null && slot >= 0 && slot < 4) {
              const old = known[slot];
              opts.teach(move, slot);
              await say("1, 2, and‥ ‥ ‥ Poof!\\p" + name + " forgot " + old + ".\\pAnd‥", true);
              await learned(name + "\nlearned " + move + ".");
              return move;
            }
          }
          await say("Stop learning " + move + "?");
          if (await yesNo()) break;
        }
      }
    } finally {
      cancelAnimationFrame(raf);
      st = null;
      canvas.classList.add("hidden");
    }
  }

  window.MoveRelearner = { open };
})();
