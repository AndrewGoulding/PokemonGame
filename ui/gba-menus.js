// FireRed's main menu and Option screen, drawn the way the game draws them
// (src/main_menu.c, src/option_menu.c), at 240x160 onto the intro's canvas:
// FireRed's font, window frames and palettes (data/gba-menus.js).
//
//   const pick = await GbaMenus.mainMenu(canvas, { save, frame })
//     // save: null, or { name, timeMs, dex (null before the Pokédex), badges, female }
//     // -> "continue", "new", "option", or "back" (B: back to the title screen)
//   const action = await GbaMenus.optionMenu(canvas, rows, onChange)
//     // rows: [{ name, values: [...], value }, ..., { name, action }]
//     // onChange(rowIndex, value) as values change; -> null, or the action row picked
//   const n = await GbaMenus.quantity(overlay, { max, unitPrice, inBag, frame })
//     // FireRed's "How many?" window: -> the number chosen, or 0 (B)
//   const a = await GbaMenus.battleAction(overlay, { name, cursor, frame })
//     // FIGHT / BAG / POKéMON / RUN -> { action: "fight" | "bag" | "pokemon" | "run", cursor }
//   const m = await GbaMenus.battleMoves(overlay, { moves, cursor, frame })
//     // moves: [{ name, type, pp, maxpp }] -> { index, cursor } or null (B)
//   const r = await GbaMenus.startMenu(overlay, { items, cursor, frame })
//     // items: [{ key, label, help }]; drawn over the map (the rest of the
//     // canvas clear) -> { key (or "exit"), cursor }
//
// The D-pad moves, A picks and B goes back (Z / X on a keyboard).
(function () {
  "use strict";

  const W = 240, H = 160;
  const G = () => window.GBA_MENUS;

  // ---------- Drawing into a 240x160 picture ----------

  function Surface() {
    const px = new Uint8ClampedArray(W * H * 4);
    const put = (x, y, c) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    };
    const fill = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };

    // Text in FireRed's font ("normal" or "small"): {A_BUTTON}-style names are
    // the button icons, drawn in `iconPal`. Returns the width drawn.
    function text(str, x, y, fg, shadow, fontName, iconPal) {
      const font = G().fonts[fontName || "normal"];
      const start = x;
      for (const part of String(str).split(/(\{[A-Z_]+\})/)) {
        if (!part) continue;
        const icon = /^\{([A-Z_]+)\}$/.exec(part);
        if (icon) {
          const ic = G().icons[icon[1]];
          if (!ic) continue;
          for (let j = 0; j < ic.height; j++) for (let i = 0; i < ic.width; i++) {
            const v = parseInt(ic.px[j * ic.width + i], 16);
            if (v) put(x + i, y + j, iconPal[v]);
          }
          x += ic.width;
          continue;
        }
        for (const ch of part) {
          const code = G().charmap[ch];
          if (code == null) { x += 6; continue; }
          const base = code * font.cellW * font.cellH;
          for (let j = 0; j < font.cellH; j++) for (let i = 0; i < font.cellW; i++) {
            const v = font.glyphs[base + j * font.cellW + i];
            if (v === "1") put(x + i, y + j, fg);
            else if (v === "2") put(x + i, y + j, shadow);
          }
          x += font.widths[code];
        }
      }
      return x - start;
    }
    const textWidth = (str, fontName) => {
      const font = G().fonts[fontName || "normal"];
      let w = 0;
      for (const part of String(str).split(/(\{[A-Z_]+\})/)) {
        if (/^\{[A-Z_]+\}$/.test(part)) { w += 8; continue; }
        for (const ch of part) { const code = G().charmap[ch]; w += code == null ? 6 : font.widths[code]; }
      }
      return w;
    };

    // A window frame round the window at tiles (left, top), `w` x `h` tiles:
    // the frame's 3x3 tiles (corners, edges), as MainMenu_DrawWindow lays them.
    function frame(name, palette, left, top, w, h) {
      const f = G().frames[name];
      const tile = (t, tx, ty) => {
        const sx = (t % 3) * 8, sy = Math.floor(t / 3) * 8;
        for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
          const v = parseInt(f.px[(sy + j) * 24 + sx + i], 16);
          if (v) put(tx * 8 + i, ty * 8 + j, palette[v]);
        }
      };
      tile(0, left - 1, top - 1); tile(2, left + w, top - 1);
      tile(6, left - 1, top + h); tile(8, left + w, top + h);
      for (let i = 0; i < w; i++) { tile(1, left + i, top - 1); tile(7, left + i, top + h); }
      for (let j = 0; j < h; j++) { tile(3, left - 1, top + j); tile(5, left + w, top + j); }
    }

    // FireRed's colour effects outside window 0 (x0..x1, y0..y1): darken
    // (BLDY of 16 toward black) or lighten (toward white), as the GBA does in
    // 5-bit colour. `only` limits it to some pixels (a layer).
    function effect(win, kind, amount, only) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (x >= win[0] && x < win[1] && y >= win[2] && y < win[3]) continue;
        if (only && !only(x, y)) continue;
        const i = (y * W + x) * 4;
        for (let k = 0; k < 3; k++) {
          const c = px[i + k] >> 3;
          px[i + k] = (kind === "darken" ? c - ((c * amount) >> 4) : c + (((31 - c) * amount) >> 4)) << 3;
        }
      }
    }

    // Onto the canvas, with a fade to `fadeColor` (0..16 of the way).
    function show(canvas, fadeColor, fade) {
      const g = canvas.getContext("2d");
      const img = new ImageData(new Uint8ClampedArray(px), W, H);
      if (fade) {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] += ((fadeColor[k] - d[i + k]) * fade) >> 4;
      }
      const off = Surface.canvas || (Surface.canvas = document.createElement("canvas"));
      off.width = W; off.height = H;
      off.getContext("2d").putImageData(img, 0, 0);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);   // (the intro leaves its own scale set)
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.imageSmoothingEnabled = false;
      g.drawImage(off, 0, 0, canvas.width, canvas.height);
      g.restore();
    }
    return { px, put, fill, text, textWidth, frame, effect, show };
  }

  // ---------- Input and fades ----------

  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  async function fade(draw, color, from, to) {
    const step = from < to ? 1 : -1;
    for (let f = from; f !== to + step; f += step) { draw(color, f); await nextFrame(); await nextFrame(); }
  }
  // Calls onKey("up" | "down" | "left" | "right" | "a" | "b") until it returns
  // something other than undefined; resolves with that.
  function keys(onKey) {
    const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b", Start: "start", m: "start", M: "start" };
    return new Promise((resolve) => {
      const handler = (e) => {
        const k = KEY[e.key];
        if (!k) return;
        e.preventDefault(); e.stopImmediatePropagation();
        if (e.repeat && (k === "a" || k === "b")) return;
        const r = onKey(k);
        if (r !== undefined) { document.removeEventListener("keydown", handler, true); resolve(r); }
      };
      document.addEventListener("keydown", handler, true);
    });
  }
  const se = () => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se("se_select"); };

  // ---------- The main menu (src/main_menu.c) ----------

  async function mainMenu(canvas, opts) {
    const pal = G().palettes, box = pal.mainMenuTextbox;
    const userFrame = "type" + ((opts.frame || 0) + 1);
    const framePal = G().frames[userFrame].palette;
    const save = opts.save;
    // Windows: { action, tiles [left, top, width, height] } (sWindowTemplate);
    // OPTION is where FireRed puts MYSTERY GIFT.
    const windows = save
      ? [{ action: "continue", label: "CONTINUE", tiles: [3, 1, 24, 10] }, { action: "new", label: "NEW GAME", tiles: [3, 13, 24, 2] },
        { action: "option", label: "OPTION", tiles: [3, 17, 24, 2] }]
      : [{ action: "new", label: "NEW GAME", tiles: [3, 1, 24, 2] }, { action: "option", label: "OPTION", tiles: [3, 5, 24, 2] }];
    // The stats are in the player's colour (blue for a boy, pink for a girl).
    const genderColor = save && save.female ? [255, 24, 173] : [33, 132, 255];
    const color1 = [box[11], box[12]], color2 = [genderColor, box[12]];
    let cursor = 0;

    const draw = (fadeColor, fadeLevel) => {
      const s = Surface();
      s.fill(0, 0, W, H, pal.mainMenuBg[0]);
      for (const w of windows) {
        const [l, t, ww, hh] = w.tiles;
        s.frame(userFrame, framePal, l, t, ww, hh);
        s.fill(l * 8, t * 8, ww * 8, hh * 8, box[10]);
        s.text(w.label, l * 8 + 2, t * 8 + 2, ...color1);
        if (w.action === "continue") {
          const mins = Math.floor(save.timeMs / 60000);
          const rows = [["PLAYER", save.name], ["TIME", Math.floor(mins / 60) + ":" + String(mins % 60).padStart(2, "0")]];
          if (save.dex != null) rows.push(["POKéDEX", String(save.dex)]);
          rows.push(["BADGES", String(save.badges)]);
          // (Each at its own line, as in FireRed: before the Pokédex, its line is just empty.)
          const at = { PLAYER: 18, TIME: 34, "POKéDEX": 50, BADGES: 66 };
          for (const [k, v] of rows) { s.text(k, l * 8 + 2, t * 8 + at[k], ...color2); s.text(v, l * 8 + 62, t * 8 + at[k], ...color2); }
        }
      }
      // MoveWindowByMenuTypeAndCursorPos: window 0 round the chosen window,
      // everything else darkened (BLDY 7).
      const [, t, , hh] = windows[cursor].tiles;
      s.effect([18, 222, (t - 1) * 8 + 2, (t + hh + 1) * 8 - 2], "darken", 7);
      s.show(canvas, fadeColor, fadeLevel);
    };

    await fade(draw, [255, 255, 255], 16, 0);   // in from white
    const pick = await keys((k) => {
      if (k === "up" && cursor > 0) { cursor--; draw(); }
      else if (k === "down" && cursor < windows.length - 1) { cursor++; draw(); }
      else if (k === "a") { se(); return windows[cursor].action; }
      else if (k === "b") { se(); return "back"; }
      return undefined;
    });
    await fade(draw, [0, 0, 0], 0, 16);          // out to black
    return pick;
  }

  // ---------- The Option screen (src/option_menu.c) ----------

  async function optionMenu(canvas, rows, onChange) {
    const pal = G().palettes, op = pal.optionMenu, help = pal.std2;
    let cursor = 0;
    const frameName = () => {
      const f = rows.find((r) => r.frame);
      return "type" + ((f ? f.value : 0) + 1);
    };
    const LINE = 13;   // a row: the font's tallest letter (14) less one

    const draw = (fadeColor, fadeLevel) => {
      const s = Surface();
      s.fill(0, 0, W, H, [0, 0, 0]);
      // The help bar along the top (window 2: FONT_SMALL, right-aligned at 228).
      s.fill(0, 0, W, 16, help[15]);
      const hint = "{DPAD_UPDOWN}PICK {DPAD_LEFTRIGHT}SWITCH {A_BUTTON}{B_BUTTON}CANCEL";
      s.text(hint, 0xE4 - s.textWidth(hint, "small"), 0, help[1], help[2], "small", help);
      // "OPTION", in the standard frame (tiles 2-27 x 3-4).
      s.frame("std", pal.std3, 2, 3, 26, 2);
      s.fill(16, 24, 208, 16, op[1]);
      s.text("OPTION", 16 + 8, 24 + 1, op[2], op[3]);
      // The options, in your frame (tiles 2-27 x 7-18).
      const fr = frameName();
      s.frame(fr, G().frames[fr].palette, 2, 7, 26, 12);
      s.fill(16, 56, 208, 96, op[1]);
      rows.forEach((r, i) => {
        const y = 56 + i * LINE + 2;
        s.text(r.name, 16 + 8, y, op[2], op[3]);
        if (r.values) s.text(r.values[r.value], 16 + 0x82, y, op[5], op[4]);
      });
      // Window 0 on the chosen row; the options window is lightened (BLDY 2) everywhere else.
      const y = cursor * LINE + 0x3A;
      s.effect([0x10, 0xE0, y, y + 14], "lighten", 2, (x, yy) => x >= 16 && x < 224 && yy >= 56 && yy < 152);
      s.show(canvas, fadeColor, fadeLevel);
    };

    await fade(draw, [0, 0, 0], 16, 0);
    const result = await keys((k) => {
      const r = rows[cursor];
      if (k === "up") { cursor = (cursor + rows.length - 1) % rows.length; draw(); }
      else if (k === "down") { cursor = (cursor + 1) % rows.length; draw(); }
      else if ((k === "left" || k === "right") && r.values) {
        const n = r.values.length;
        r.value = (r.value + (k === "right" ? 1 : n - 1)) % n;
        if (onChange) onChange(cursor, r.value);
        draw();
      } else if (k === "a" || k === "b") return k === "a" && r.action ? r.action : null;
      return undefined;
    });
    await fade(draw, [0, 0, 0], 0, 16);
    return result;
  }

  // ---------- The Start menu (src/start_menu.c) ----------
  //
  // A window at tiles 22-28 from row 1, two rows a choice, in your frame, with
  // the ▶ cursor; along the bottom, the help bar (src/help_message.c) says
  // what the chosen one is for. B or Start closes it, as EXIT does.
  async function startMenu(canvas, opts) {
    const items = opts.items, std = G().palettes.std2, help = G().helpBar;
    const frame = "type" + ((opts.frame || 0) + 1);
    let cursor = Math.min(opts.cursor || 0, items.length - 1);
    const draw = () => {
      const s = Surface();
      const h = items.length * 2 - 1;
      s.frame(frame, G().frames[frame].palette, 22, 1, 7, h);
      s.fill(176, 8, 56, h * 8, std[1]);
      items.forEach((it, i) => s.text(it.label, 176 + 8, 8 + i * 15, std[2], std[3]));
      s.text("▶", 176, 8 + cursor * 15, std[2], std[3]);
      // The help bar: rows 15-19, tile 0 on top, 5 in the middle, 14 at the bottom.
      for (let row = 0; row < 5; row++) {
        const t = row === 0 ? 0 : row === 4 ? 14 : 5, tx = (t % (help.width / 8)) * 8, ty = Math.floor(t / (help.width / 8)) * 8;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const c = help.palette[parseInt(help.px[(ty + y) * help.width + tx + x], 16)];
          for (let col = 0; col < 30; col++) s.put(col * 8 + x, 120 + row * 8 + y, c);
        }
      }
      String(items[cursor].help || "").split("\n").forEach((line, i) => s.text(line, 2, 120 + 5 + i * 14, std[10], std[2]));
      s.show(canvas);
    };
    canvas.classList.remove("hidden");
    draw();
    const key = await keys((k) => {
      if (k === "up") { cursor = (cursor + items.length - 1) % items.length; draw(); }
      else if (k === "down") { cursor = (cursor + 1) % items.length; draw(); }
      else if (k === "a") { se(); return items[cursor].key; }
      else if (k === "b" || k === "start") return "exit";
      return undefined;
    });
    canvas.classList.add("hidden");
    return { key, cursor };
  }

  // ---------- How many (src/shop.c, AdjustQuantityAccordingToDPadInput) ----------
  //
  // Over the screen, above the text box: how many you have (IN BAG) on the
  // left, and ×NN with its price on the right. Up / down add or take one
  // (going round past either end), right / left ten (stopping at the ends).
  async function quantity(canvas, opts) {
    const max = Math.max(1, opts.max), std = G().palettes.std2;
    const frame = "type" + ((opts.frame || 0) + 1), fpal = G().frames[frame].palette;
    const money = (n) => "¥" + n.toLocaleString("en-US");
    let n = 1;
    const draw = () => {
      const s = Surface();
      if (opts.inBag != null) {
        s.frame(frame, fpal, 1, 11, 9, 2);
        s.fill(8, 88, 72, 16, std[1]);
        s.text("IN BAG:", 8 + 2, 88 + 1, std[2], std[3]);
        const num = String(opts.inBag);
        s.text(num, 8 + 70 - s.textWidth(num), 88 + 1, std[2], std[3]);
      }
      s.frame(frame, fpal, 17, 11, 12, 2);
      s.fill(136, 88, 96, 16, std[1]);
      s.text("×" + String(n).padStart(2, "0"), 136 + 2, 88 + 1, std[2], std[3]);
      if (opts.unitPrice != null) {
        const price = money(n * opts.unitPrice);
        s.text(price, 136 + 94 - s.textWidth(price), 88 + 1, std[2], std[3]);
      }
      // Arrows above and below, while there's more than one to choose from.
      if (max > 1) {
        // (rows 7, 5, 3, 1 wide: pointing up, the wide row is at the bottom)
        const arrow = (x, y, up) => { for (let r = 0; r < 4; r++) s.fill(x + r, y + (up ? 3 - r : r), 7 - 2 * r, 1, std[2]); };
        arrow(136 + 12, 80 - 5, true); arrow(136 + 12, 104 + 2, false);
      }
      s.show(canvas);
    };
    canvas.classList.remove("hidden");
    draw();
    const r = await keys((k) => {
      const before = n;
      if (k === "up") n = n === max ? 1 : n + 1;
      else if (k === "down") n = n === 1 ? max : n - 1;
      else if (k === "right") n = Math.min(max, n + 10);
      else if (k === "left") n = Math.max(1, n - 10);
      else if (k === "a") { se(); return n; }
      else if (k === "b") { se(); return 0; }
      if (n !== before) draw();
      return undefined;
    });
    canvas.classList.add("hidden");
    return r;
  }

  // ---------- The battle menus (src/battle_controller_player.c) ----------
  //
  // The bottom panel (48 lines) as FireRed draws it: its tiles and tilemap
  // (graphics/battle_interface/textbox), the boxes on the right in your window
  // frame (LoadBattleMenuWindowGfx: tiles 0x12 and 0x22, palette 1), and the
  // ▶ cursor (tiles 1-2). Text windows and colours from src/battle_bg.c and
  // battle_message.c: palette 5 is dark text (9, 9, 9) on white with a
  // (26, 26, 25) shadow; the PP line takes its colour from how much is left.
  const P5 = { fg: [72, 72, 72], bg: [248, 248, 248], shadow: [208, 208, 200] };
  function battlePanel(s, which, frameName) {
    const B = G().battle, fr = G().frames[frameName];
    const tileAt = (src, w, t, hf, vf, x0, y0, pal) => {
      const sx = (t % (w / 8)) * 8, sy = Math.floor(t / (w / 8)) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = parseInt(src[(sy + (vf ? 7 - y : y)) * w + sx + (hf ? 7 - x : x)], 16);
        if (v) s.put(x0 + x, y0 + y, pal[v]);
      }
    };
    s.fill(0, 112, 240, 48, B.palette[0]);
    B.panels[which].forEach((e, i) => {
      const t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, pal = e >> 12;
      const x0 = (i % 30) * 8, y0 = 112 + Math.floor(i / 30) * 8;
      const frameTile = pal === 1 && ((t >= 0x12 && t <= 0x1a) || (t >= 0x22 && t <= 0x2a));
      if (frameTile) tileAt(fr.px, 24, t - (t >= 0x22 ? 0x22 : 0x12), hf, vf, x0, y0, fr.palette);
      else tileAt(B.tiles, B.tilesWidth, t, hf, vf, x0, y0, B.palette);
    });
  }
  // The ▶ (two tiles, palette 1: your frame's) at tile (tx, ty) of the screen.
  function battleCursor(s, frameName, tx, ty) {
    const B = G().battle, pal = G().frames[frameName].palette;
    [1, 2].forEach((t, k) => {
      const sx = (t % (B.tilesWidth / 8)) * 8, sy = Math.floor(t / (B.tilesWidth / 8)) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = parseInt(B.tiles[(sy + y) * B.tilesWidth + sx + x], 16);
        s.put(tx * 8 + x, (ty + k) * 8 + y, v === 1 ? P5.bg : pal[v]);
      }
    });
  }

  async function battleAction(canvas, opts) {
    const frame = "type" + ((opts.frame || 0) + 1), msg = G().battle.palette;
    let cursor = opts.cursor || 0;
    const LABELS = ["FIGHT", "BAG", "POKéMON", "RUN"];
    const draw = () => {
      const s = Surface();
      battlePanel(s, "action", frame);
      // B_WIN_ACTION_PROMPT (tiles 1, 15): "What will\n… do?", white on the message box.
      s.text("What will", 8 + 2, 120 + 2, msg[1], msg[6]);
      s.text(opts.name + " do?", 8 + 2, 120 + 2 + 16, msg[1], msg[6]);
      // B_WIN_ACTION_MENU (tiles 17, 15): FIGHT BAG / POKéMON RUN, 56 apart.
      LABELS.forEach((l, i) => s.text(l, 136 + (i & 1) * 56, 120 + 2 + (i & 2) * 8, P5.fg, P5.shadow));
      battleCursor(s, frame, 16 + 7 * (cursor & 1), 15 + (cursor & 2));
      s.show(canvas);
    };
    canvas.classList.remove("hidden");
    draw();
    const r = await keys((k) => {
      if (k === "left" || k === "right") { cursor ^= 1; draw(); }
      else if (k === "up" || k === "down") { cursor ^= 2; draw(); }
      else if (k === "a") { se(); return ["fight", "bag", "pokemon", "run"][cursor]; }
      return undefined;
    });
    canvas.classList.add("hidden");
    return { action: r, cursor };
  }

  async function battleMoves(canvas, opts) {
    const frame = "type" + ((opts.frame || 0) + 1), moves = opts.moves, pp = G().battle.pp;
    let cursor = Math.min(opts.cursor || 0, Math.max(0, moves.length - 1));
    // GetCurrentPpToMaxPpState: 3 full / over half, 0 half or less, 1 a quarter or less, 2 none.
    const ppState = (cur, max) => {
      if (max === cur) return 3;
      if (max <= 2) return cur > 1 ? 3 : 2 - cur;
      if (max <= 7) return cur > 2 ? 3 : 2 - cur;
      if (cur === 0) return 2;
      if (cur <= Math.floor(max / 4)) return 1;
      return cur > Math.floor(max / 2) ? 3 : 0;
    };
    const draw = () => {
      const s = Surface();
      battlePanel(s, "move", frame);
      // B_WIN_MOVE_NAME_1-4 (tiles 2 / 11, rows 15 / 17), small font.
      for (let i = 0; i < 4; i++) {
        const x = (i & 1 ? 11 : 2) * 8, y = (i & 2 ? 17 : 15) * 8 + 1;
        s.text(moves[i] ? moves[i].name : "-", x, y, P5.fg, P5.shadow, "small");
      }
      battleCursor(s, frame, 9 * (cursor & 1) + 1, 15 + (cursor & 2));
      const m = moves[cursor];
      if (m) {
        const st = ppState(m.pp, m.maxpp), col = [pp[st * 2], pp[st * 2 + 1]];
        s.text("PP ", 21 * 8, 15 * 8 + 2, col[0], col[1], "small");
        const num = m.pp + "/" + m.maxpp;
        s.text(num, 24 * 8 + 40 - s.textWidth(num, "small") - 2, 15 * 8 + 2, col[0], col[1], "small");
        s.text("TYPE/" + m.type.toUpperCase(), 21 * 8, 17 * 8 + 2, P5.fg, P5.shadow, "small");
      }
      s.show(canvas);
    };
    canvas.classList.remove("hidden");
    draw();
    const r = await keys((k) => {
      const go = (c) => { if (c < moves.length && c !== cursor) { cursor = c; draw(); } };
      if (k === "left" || k === "right") go(cursor ^ 1);
      else if (k === "up" || k === "down") go(cursor ^ 2);
      else if (k === "a") { se(); return { index: cursor, cursor }; }
      else if (k === "b") { se(); return null; }
      return undefined;
    });
    canvas.classList.add("hidden");
    return r;
  }

  window.GbaMenus = {
    battleAction: (canvas, ...a) => during("battle", battleAction(canvas, ...a)),
    battleMoves: (canvas, ...a) => during("moves", battleMoves(canvas, ...a)),
    quantity: (canvas, ...a) => during("quantity", quantity(canvas, ...a)),
    startMenu: (canvas, ...a) => during("start", startMenu(canvas, ...a)),
    mainMenu: (canvas, ...a) => { canvas.classList.remove("hidden"); return during("main", mainMenu(canvas, ...a)); },
    optionMenu: (canvas, ...a) => { canvas.classList.remove("hidden"); return during("option", optionMenu(canvas, ...a)); },
    showing: null   // "main" or "option" while one is up
  };
  // (The canvas is the intro's: show it. The next show() of another screen hides it again.)
  function during(name, promise) {
    window.GbaMenus.showing = name;
    return promise.finally(() => { if (window.GbaMenus.showing === name) window.GbaMenus.showing = null; });
  }
})();
