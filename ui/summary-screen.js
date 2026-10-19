// FireRed's Pokémon Summary screen (src/pokemon_summary_screen.c), drawn the
// way the game draws it at 240x160 (data/summary-screen.js, tools/build-summary.js):
// POKéMON INFO, POKéMON SKILLS and KNOWN MOVES, and the moves' details.
//
//   await SummaryScreen.open(views, index, { frame, swapMoves })
//     // views: one per Pokémon (see below); up / down go through them.
//     // swapMoves(index, a, b): swap two of its moves (A on a move on the
//     // details page, then A on another); returns the Pokémon's new view.
//     // -> the index it was showing when closed
//   const slot = await SummaryScreen.chooseMove(view, newMove, { frame })
//     // the details page with the new move under the four, for forgetting
//     // one (FireRed's PSS_MODE_SELECT_MOVE): -> 0-3, or null (the new move, or B)
//
// A view: { name, species, dexNo, level, gender ("M" | "F" | ""), types,
//   ot, otId, item (name or ""), memo (the Trainer Memo's text), hp, maxhp,
//   stats: { atk, def, spa, spd, spe }, exp, toNext, expFrac (0-1 through
//   the level), ability, moves: [{ name, pp, maxpp }], status, shiny,
//   pic (front picture URL), picEmpty (blank rows under it, of 96), icon,
//   ball (Poké Ball picture URL) }
//
// As in FireRed: left / right turn the page, up / down change Pokémon, A on
// KNOWN MOVES shows the details, B (or A on the first page) closes.
(function () {
  "use strict";

  const W = 240, H = 160;
  const D = () => window.SUMMARY_SCREEN;
  const GM = () => window.GBA_MENUS;

  const canvas = document.createElement("canvas");
  canvas.className = "party-menu hidden";
  canvas.width = W * 2; canvas.height = H * 2;
  const overlayEl = document.getElementById("overlay");
  overlayEl.parentNode.insertBefore(canvas, overlayEl);
  const out = canvas.getContext("2d");

  const decoded = {};
  function px(name) {
    if (!decoded[name]) {
      const bin = atob(D().sheets[name].px), a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      decoded[name] = a;
    }
    return decoded[name];
  }
  function blit(s, name, sx, sy, w, h, x, y, pal) {
    const sh = D().sheets[name], p = px(name);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const v = p[(sy + j) * sh.width + sx + i] & 15;
      if (v) s.put(x + i, y + j, pal[v]);
    }
  }
  const images = {};
  function image(url) {
    if (!url) return null;
    if (!images[url]) { const img = new Image(); img.src = url; img.onload = () => st && paint(); images[url] = img; }
    return images[url];
  }

  // A BG tilemap (32 wide) of bg.png's tiles in its palettes; colour 0 clear
  // unless `opaque`.
  function layer(s, map, opaque, pal0) {
    const bg = D().sheets.bg, p = px("bg");
    for (let ty = 0; ty < 20; ty++) for (let tx = 0; tx < 30; tx++) {
      const e = map[ty * 32 + tx], t = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, pal = e >> 12;
      const sx = (t % 16) * 8, sy = Math.floor(t / 16) * 8;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const v = p[(sy + (vf ? 7 - y : y)) * bg.width + sx + (hf ? 7 - x : x)] & 15;
        if (!v && !opaque) continue;
        const c = (pal0 && pal < 2 ? pal0[pal] : null) || bg.palette;
        s.put(tx * 8 + x, ty * 8 + y, (pal0 && pal < 2 ? pal0[pal][v] : bg.palette[pal * 16 + v]) || c[v]);
      }
    }
  }

  // sMenuInfoIcons: the types' 32x12 icons in graphics/interface/menu_info.png
  // (Fairy, which FireRed doesn't have, is the expansion's, in its "???" slot.)
  const TYPE_TILE = { Normal: 0x20, Fighting: 0x64, Flying: 0x60, Poison: 0x80, Ground: 0x48, Rock: 0x44, Bug: 0x6C,
    Ghost: 0x68, Steel: 0x88, Fire: 0x24, Water: 0x28, Grass: 0x2C, Electric: 0x40, Psychic: 0x84, Ice: 0x4C,
    Dragon: 0xA0, Dark: 0x8C, Fairy: 0xA4 };
  const typeIcon = (s, type, x, y) => {
    const t = TYPE_TILE[type] != null ? TYPE_TILE[type] : 0xA4;
    blit(s, "menuInfo", (t % 16) * 8, Math.floor(t / 16) * 8, 32, 12, x, y, D().pals.types);
  };

  function wrap(s, text, width) {
    const lines = String(text || "").split("\n");
    if (lines.every((l) => s.textWidth(l) <= width)) return lines;
    const outl = [];
    let line = "";
    for (const word of lines.join(" ").split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && s.textWidth(next) > width) { outl.push(line); line = word; } else line = next;
    }
    if (line) outl.push(line);
    return outl;
  }

  // PP colour (PokeSum_PrintMoveName): 0 full, 1 half or less, 2 a quarter or
  // less, 3 none (sPrintMoveTextColors in text_moves.pal).
  function ppColour(cur, max) {
    if (!max || cur === max) return 0;
    if (cur === 0) return 3;
    if (max === 3) return cur === 2 ? 2 : cur === 1 ? 1 : 0;
    if (max === 2) return cur === 1 ? 1 : 0;
    return cur <= Math.floor(max / 4) ? 2 : cur <= Math.floor(max / 2) ? 1 : 0;
  }
  const MOVE_COLOURS = [[7, 8], [1, 2], [3, 4], [5, 6]];
  const STATUS_FRAME = { psn: 0, tox: 0, par: 1, slp: 2, frz: 3, brn: 4, fnt: 6 };
  // (Page 4, after KNOWN MOVES, is this game's: each stat's EVs, or with A its IVs.)
  const PAGE_NAME = ["POKéMON INFO", "POKéMON SKILLS", "KNOWN MOVES", "KNOWN MOVES", "POKéMON EVs"];
  const pageName = (page) => (page === 4 && st.ivs ? "POKéMON IVs" : PAGE_NAME[page]);

  // The move's category beside EFFECT (this game's; FireRed has none):
  // Diamond and Pearl's icons, 16x16 (data sheet categoryIcons: Physical,
  // Special, Status, top to bottom).
  const CATEGORIES = ["Physical", "Special", "Status"];
  function categoryIcon(s, cat, x, y) {
    const i = CATEGORIES.indexOf(cat), sh = D().sheets.categoryIcons;
    if (i < 0 || !sh) return;
    blit(s, "categoryIcons", 0, i * 16, 16, 16, x, y, sh.palette);
  }

  // ---------- Drawing ----------

  let st = null;

  function controls() {
    if (st.mode === "choose") return "{DPAD_UPDOWN}PICK {A_BUTTON}SELECT";
    if (st.view.egg) return "{A_BUTTON}CANCEL";
    return ["{DPAD_RIGHT}PAGE {A_BUTTON}CANCEL", "{DPAD_LEFTRIGHT}PAGE", "{DPAD_LEFTRIGHT}PAGE {A_BUTTON}DETAIL",
      "{DPAD_UPDOWN}PICK {A_BUTTON}SWITCH", "{DPAD_LEFT}PAGE {A_BUTTON}" + (st.ivs ? "EVs" : "IVs")][st.page];
  }

  // Everything but the pictures (BGs and text; the bars, icons and cursors).
  function drawLayers() {
    const S = window.GbaMenus.Surface, d = D(), v = st.view, page = st.page;
    const base = S(), top = S();
    // BG3 (the backdrop) and the page's own tilemap; a shiny Pokémon's page
    // takes palettes 6 and 5 for 0 and 1 (PokeSum_HandleLoadBgGfx).
    const bgPal = d.sheets.bg.palette;
    const pal0 = v.shiny ? [bgPal.slice(96, 112), bgPal.slice(80, 96)] : null;
    // (BG3 is moves_info_page.bin, with the picture's panel, on the first three
    // pages, and moves_page.bin on the details page, which shows both the
    // moves card and the details card.)
    layer(base, page === 3 ? d.maps.movesPage : d.maps.movesInfoPage, true, pal0);
    if (page === 3) { layer(base, d.maps.pageMoves, false, pal0); layer(base, d.maps.pageMovesInfo, false, pal0); }
    // (The EV / IV page: the SKILLS page's stats, without its lower panel.)
    else if (page === 4) layer(base, d.maps.pageSkills.map((e, i) => (i >= 32 * 13 ? 0 : e)), false, pal0);
    else layer(base, [v.egg ? d.maps.pageEgg : d.maps.pageInfo, d.maps.pageSkills, d.maps.pageMoves][page], false, pal0);
    // The page tabs (PokeSum_DrawPageProgressTiles): tiles 345 + n on rows 0-1,
    // two columns a tab: those before this page's are dots on the bar, this
    // one's is the white dot, those after it are on the lighter part, which
    // ends in a curve. FireRed has three, on columns 13-18; with this game's
    // fourth (EVs and IVs) they're on 11-18. Choosing a move to forget shows
    // only the KNOWN MOVES tab.
    const TABS = [];
    const active = page === 4 ? 3 : Math.min(page, 2);
    for (let i = 0; i < 4; i++) {
      const last = i === 3;
      if (st.mode === "choose") TABS.push(...(last ? [[50, 66], [48, 64]] : [[1, 19], [1, 19]]));
      else if (i < active) TABS.push([49, 65], [1, 19]);
      else if (i === active) TABS.push([page === 3 ? 50 : 17, page === 3 ? 66 : 33], last ? [48, 64] : [16, 32]);
      else TABS.push([18, 34], last ? [21, 37] : [20, 36]);
    }
    const tabMap = new Array(32 * 20).fill(0);
    TABS.forEach(([a, b], i) => { tabMap[11 + i] = 345 + a; tabMap[32 + 11 + i] = 345 + b; });
    layer(base, tabMap, false, pal0);

    const th = d.pals.textHeader, tm = d.pals.textMoves, ty = d.pals.types;
    const T = (str, x, y, pal, fg, sh, font) => top.text(str, x, y, pal[fg], pal[sh], font || "normal", pal);
    const dark = (str, x, y) => T(str, x, y, ty, 14, 10);   // sLevelNickTextColors[0], palette 6
    const right = (str, x, len, y) => dark(str, x + len - String(str).length * 6, y);

    // The header: page name, the buttons, and Lv / name / gender.
    T(pageName(page), 4, 1, th, 1, 2);
    const c = controls(), cw = top.textWidth(c, "small");
    T(c, 152 + 0x54 - cw, 0, th, 1, 2, "small");
    if (page !== 3 && !v.egg) T("{LV}" + v.level, 4, 18, th, 1, 2);
    T(v.name, 40, 18, th, 1, 2);
    if (v.egg) { /* (no gender shown) */ }
    else if (v.gender === "F") T("♀", 105, 18, th, 5, 4);
    else if (v.gender === "M") T("♂", 105, 18, th, 9, 8);

    if (page === 0 && v.egg) {
      // An Egg (FireRed's page_egg): "EGG", the Egg Watch and where it came from.
      dark(v.species, 167, 35);
      v.eggWatch.split("\n").forEach((l, i) => dark(l, 127, 61 + i * 14));
      wrap(top, v.memo, 224).slice(0, 3).forEach((l, i) => dark(l, 8, 115 + i * 14));
    } else if (page === 0) {
      dark(String(v.dexNo).padStart(3, "0"), 167, 21);
      dark(v.species, 167, 35);
      typeIcon(top, v.types[0], 167, 51);
      if (v.types[1] && v.types[1] !== v.types[0]) typeIcon(top, v.types[1], 203, 51);
      dark(v.ot, 167, 65);
      dark(String(v.otId).padStart(5, "0"), 167, 80);
      dark(v.item || "NONE", 167, 95);
      wrap(top, v.memo, 224).slice(0, 3).forEach((l, i) => dark(l, 8, 115 + i * 14));
    } else if (page === 1) {
      const hp = v.hp + "/" + v.maxhp;
      right(hp, 174, 63, 20);
      ["atk", "def", "spa", "spd", "spe"].forEach((k, i) => right(String(v.stats[k]), 210, 27, 38 + i * 13));
      right(String(v.exp), 175, 63, 103);
      right(String(v.toNext), 175, 63, 116);
      dark("EXP. POINTS", 74, 103);
      dark("NEXT LV.", 74, 116);
      dark(v.ability, 74, 129);
      dark(wrap(top, v.abilityText, 220)[0] || "", 10, 143);
    } else if (page === 4) {
      // Each stat's EV (or IV) where the stats are.
      const vals = (st.ivs ? v.ivs : v.evs) || {};
      ["hp", "atk", "def", "spa", "spd", "spe"].forEach((k, i) => right(String(vals[k] || 0), i ? 210 : 174, i ? 27 : 63, i ? 38 + (i - 1) * 13 : 20));
      // And its happiness (friendship, 0-255), below them on both.
      dark("HAPPINESS", 74, 103);
      right((v.happiness || 0) + "/255", 175, 63, 103);
      // (Gen 9: its Tera Type, under them: the type's icon, or STELLAR.)
      if (v.teraType) {
        dark("TERA TYPE", 74, 116);
        if (TYPE_TILE[v.teraType] != null) typeIcon(top, v.teraType, 206, 117);
        else right(v.teraType.toUpperCase(), 175, 63, 116);
      }
    } else {
      const rows = v.moves.slice(0, 4);
      while (rows.length < 4) rows.push(null);
      if (page === 3 && st.mode === "choose") rows.push(st.newMove);
      rows.forEach((m, i) => {
        const y = 21 + 28 * i;
        if (!m) { if (i < 4) { T("-", 163, y, tm, 7, 8); T("{PP}", 196, y + 11, tm, 7, 8); T("--", 206, y + 11, tm, 7, 8); } return; }
        const col = MOVE_COLOURS[i === 4 ? 0 : ppColour(m.pp, m.maxpp)];
        T(m.name, 163, y, tm, 7, 8);
        T("{PP}", 196, y + 11, tm, col[0], col[1]);
        T(String(m.pp), 206 + 12 - String(m.pp).length * 6, y + 11, tm, col[0], col[1]);
        T("/", 218, y + 11, tm, col[0], col[1]);
        T(String(m.maxpp), 224 + 12 - String(m.maxpp).length * 6, y + 11, tm, col[0], col[1]);
        const mv = window.MOVES[m.name];
        if (mv) typeIcon(top, mv.type, 123, y);
      });
      if (page === 3 && st.mode !== "choose") T("CANCEL", 163, 21 + 112, tm, 7, 8);
      if (page === 3) {
        typeIcon(top, v.types[0], 48, 35);
        if (v.types[1] && v.types[1] !== v.types[0]) typeIcon(top, v.types[1], 84, 35);
        const m = rows[st.cursor], mv = m && window.MOVES[m.name];
        if (mv) {
          const pow = mv.cat === "Status" || !mv.power || mv.power <= 1 ? "---" : String(mv.power).padStart(3, " ");
          const acc = mv.acc === true || !mv.acc ? "---" : String(mv.acc).padStart(3, " ");
          dark(pow, 57, 57); dark(acc, 57, 71);
          categoryIcon(top, mv.cat, 48, 79);
          wrap(top, (d.moveText || {})[m.name] || mv.shortDesc || "", 108).slice(0, 4).forEach((l, i) => dark(l, 7, 98 + i * 14));
        }
      }
    }

    // Sprites drawn on the BGs: HP and EXP bars, status, shiny star, cursors.
    if (page === 1) bars(top, v);
    const status = v.hp === 0 ? "fnt" : STATUS_FRAME[v.status] != null ? v.status : "";
    if (status) blit(top, "status", 0, STATUS_FRAME[status] * 8, 32, 8, 0, page === 3 ? 41 : 34, d.sheets.status.palette);
    if (v.shiny) blit(top, "shinyStar", 0, 8, 8, 8, page === 3 ? 4 : 102, page === 3 ? 20 : 36, d.sheets.shinyStar.palette);
    if (page === 3) {
      const cur = (pos, frame) => {
        blit(top, "cursorLeft", 0, frame * 32, 64, 32, 120, pos * 28 + 18, d.pals.cursor);
        blit(top, "cursorRight", 0, frame * 32, 64, 32, 184, pos * 28 + 18, d.pals.cursor);
      };
      if (st.swapFrom != null) cur(st.swapFrom, 1);
      cur(st.cursor, 0);
    }
    return { base: base.canvas(), top: top.canvas() };
  }

  // The HP bar (9 8x8 pieces from x 168, y 32) and EXP bar (11 from x 152,
  // y 128): ends 9, 10 and 11, the middle filled in eighths (UpdateHpBarObjs,
  // UpdateExpBarObjs); the HP bar yellow at half or less, red at a fifth.
  function bars(s, v) {
    const d = D();
    const piece = (sheet, frame, x, y, pal) => blit(s, sheet, frame * 8, 0, 8, 8, x, y, pal);
    // (GetHPBarLevel: of 48 pixels, 10-24 is yellow and 1-9 red.)
    let f = Math.floor((v.hp * 48) / v.maxhp);
    if (!f && v.hp > 0) f = 1;
    const hpPal = v.hp >= v.maxhp ? d.sheets.hpBar.palette : f > 24 || f === 0 ? d.sheets.hpBar.palette
      : f > 9 ? d.pals.hpBarYellow : d.pals.hpBarRed;
    const hp = new Array(9).fill(0);
    if (v.hp >= v.maxhp) for (let i = 2; i < 8; i++) hp[i] = 8;
    else {
      const per = Math.floor((v.maxhp * 4) / 6);
      let pts = v.hp * 4, whole = 0;
      while (pts > per) { pts -= per; whole++; }
      whole += 2;
      for (let i = 2; i < whole; i++) hp[i] = 8;
      if (whole < 8) hp[whole] = Math.floor((pts * 6) / per);
    }
    hp[0] = 9; hp[1] = 10; hp[8] = 11;
    hp.forEach((f, i) => piece("hpBar", f, 168 + 8 * i, 32, hpPal));
    const ex = new Array(11).fill(0);
    if (v.level < 100) {
      const total = 1000, cur = Math.round(v.expFrac * total);
      const per = Math.floor((total * 4) / 8);
      let pts = cur * 4, whole = 0;
      while (pts > per) { pts -= per; whole++; }
      whole += 2;
      for (let i = 2; i < whole && i < 10; i++) ex[i] = 8;
      if (whole < 10) ex[whole] = Math.floor((pts * 8) / per);
      else if (cur < total) ex[9] = 7;
    }
    ex[0] = 9; ex[1] = 10; ex[10] = 11;
    ex.forEach((f, i) => piece("expBar", f, 152 + 8 * i, 128, d.sheets.expBar.palette));
  }

  let layers = null;
  function redraw() { layers = drawLayers(); paint(); }
  function paint() {
    if (!st || !layers) return;
    const off = paint.c || (paint.c = Object.assign(document.createElement("canvas"), { width: W, height: H }));
    const g = off.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    g.drawImage(layers.base, 0, 0);
    const v = st.view;
    if (st.page !== 3) {
      // The front picture (CreateMonPicSprite at 60, 65): its feet on the
      // panel's floor, in the panel; the Poké Ball by it (106, 88).
      // (Flipped to face right, as FireRed's are; inside WIN1, y 32-135.)
      const pic = image(v.pic);
      if (pic && pic.complete && pic.naturalWidth) {
        g.save(); g.beginPath(); g.rect(0, 32, 120, 66); g.clip();
        g.translate(60 + 48, 0); g.scale(-1, 1);
        g.drawImage(pic, 0, 97 - (96 - (v.picEmpty || 0)));
        g.restore();
      }
      const ball = image(v.ball);
      if (ball && ball.complete && ball.naturalWidth) g.drawImage(ball, 98, 80, 16, 16);
    } else {
      const icon = image(v.icon);
      if (icon && icon.complete && icon.naturalWidth) g.drawImage(icon, 0, 0, 32, 32, 8, 16, 32, 32);
    }
    g.drawImage(layers.top, 0, 0);
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = false;
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(off, 0, 0, canvas.width, canvas.height);
    out.restore();
  }

  const se = () => window.GbaMenus.se();

  // Up / down on the details page: through the moves it knows (and the fifth
  // row: CANCEL, or the new move when choosing one to forget), going round.
  function moveCursor(dir) {
    const known = st.view.moves.length, rows = st.mode === "choose" ? 5 : known + 1;
    let c = st.cursor;
    const valid = (i) => i < known || (i === 4 && !(st.swapFrom != null));
    for (let n = 0; n < 6; n++) {
      c = dir < 0 ? (c === 0 ? 4 : c - 1) : (c >= 4 ? 0 : c + 1);
      if (valid(c) && (c < rows || c === 4)) break;
    }
    if (c !== st.cursor) { st.cursor = c; se(); redraw(); }
  }

  async function open(views, index, opts) {
    st = { views: views.slice(), index: index || 0, page: 0, cursor: 0, swapFrom: null, mode: "view", frame: (opts || {}).frame };
    st.view = st.views[st.index];
    canvas.classList.remove("hidden");
    redraw();
    try {
      await window.GbaMenus.keys((k) => {
        if (st.page === 3) {
          if (k === "up" || k === "down") moveCursor(k === "up" ? -1 : 1);
          else if (k === "a") {
            se();
            if (st.cursor === 4 || st.cursor >= st.view.moves.length) { st.page = 2; st.cursor = 0; st.swapFrom = null; redraw(); return undefined; }
            if (st.swapFrom == null) st.swapFrom = st.cursor;
            else {
              if (st.swapFrom !== st.cursor && opts && opts.swapMoves) st.view = st.views[st.index] = opts.swapMoves(st.index, st.swapFrom, st.cursor);
              st.swapFrom = null;
            }
            redraw();
          } else if (k === "b") {
            se();
            if (st.swapFrom != null) st.swapFrom = null;
            else { st.page = 2; st.cursor = 0; }
            redraw();
          }
          return undefined;
        }
        if (k === "right" && st.view.egg) { /* (an Egg has only its one page) */ }
        else if (k === "right" && st.page < 2) { se(); st.page++; redraw(); }
        else if (k === "right" && st.page === 2) { se(); st.page = 4; redraw(); }
        else if (k === "left" && st.page === 4) { se(); st.page = 2; st.ivs = false; redraw(); }
        else if (k === "a" && st.page === 4) { se(); st.ivs = !st.ivs; redraw(); }
        else if (k === "left" && st.page > 0) { se(); st.page--; redraw(); }
        else if ((k === "up" || k === "down") && st.views.length > 1) {
          const i = st.index + (k === "up" ? -1 : 1);
          if (i < 0 || i >= st.views.length) return undefined;
          st.index = i; st.view = st.views[i];
          if (st.view.egg) st.page = 0;
          if (opts && opts.cry && !st.view.egg) opts.cry(st.view.species);
          redraw();
        } else if (k === "a" && st.page === 2) { se(); st.page = 3; st.cursor = 0; redraw(); }
        else if (k === "b" || (k === "a" && st.page === 0)) { se(); return true; }
        return undefined;
      });
      return st.index;
    } finally {
      st = null;
      canvas.classList.add("hidden");
    }
  }

  // Choosing a move to forget for `newMove` (shown fifth).
  async function chooseMove(view, newMove, opts) {
    st = { views: [view], index: 0, view, page: 3, cursor: 0, swapFrom: null, mode: "choose", frame: (opts || {}).frame,
      newMove: { name: newMove, pp: (window.MOVES[newMove] || {}).pp || 0, maxpp: (window.MOVES[newMove] || {}).pp || 0 } };
    canvas.classList.remove("hidden");
    redraw();
    try {
      return await window.GbaMenus.keys((k) => {
        if (k === "up" || k === "down") moveCursor(k === "up" ? -1 : 1);
        else if (k === "a") { se(); return st.cursor < 4 ? st.cursor : null; }
        else if (k === "b") { se(); return null; }
        return undefined;
      });
    } finally {
      st = null;
      canvas.classList.add("hidden");
    }
  }

  window.SummaryScreen = { open, chooseMove };
})();
