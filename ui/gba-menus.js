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
      z: "a", Z: "a", " ": "a", Enter: "a", x: "b", X: "b", Escape: "b" };
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

  window.GbaMenus = {
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
