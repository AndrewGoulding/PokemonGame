// The other realms' party screen (Dragon Quest's way: four who fight and four who wait), drawn as FireRed's
// menus are (ui/gba-menus.js's windows, font and frames): the four READY down the left, the four in RESERVE down the
// right, each a box with their picture, name, level, HP bar and MP; a box with no one in it is empty. A picks someone
// and a small window asks what for (the caller's `choices`); "switch" then picks a second box (any of the eight, an
// empty one too) to trade places with. Their summary (`summary`) is a page of its own: their elements, stats,
// skills and what they need for the next level.
//
//   const r = await RealmParty.open(overlay, { slots, cursor, frame, title, choices })
//     // slots: 8 (0-3 ready, 4-7 reserve), each null or { name, lv, hp, maxHp, mp, maxMp, icon, rect }
//     //   icon: an image or canvas, rect: [sx, sy, sw, sh] of it to draw in the box's 32x32 (fitted, feet down)
//     // choices(i) -> [{ key, label, disabled }] for the slot picked
//     // -> { index, action, cursor, with (for "switch": the other box) } or null (B)
//   await RealmParty.summary(overlay, slot, frame)
//     // slot.summary: { lines: [text...], skills: [[name, info]...] }
(function () {
  "use strict";
  const M = () => window.GbaMenus, G = () => window.GBA_MENUS;
  const BG = [64, 104, 136], BOX = [248, 248, 248], SEL = [255, 236, 150], EMPTY = [96, 136, 168], DOWN = [232, 200, 200];
  const TEXT = [72, 72, 72], SHADE = [208, 208, 200], WHITE = [248, 248, 248], DARKSHADE = [40, 64, 88];
  const HPC = [[112, 248, 168], [248, 224, 56], [248, 88, 56]], MPC = [80, 160, 248];
  // (each box: 112x31, two columns, four rows, under the title)
  const BH = 31, at = (i) => [(i < 4 ? 4 : 124), 19 + (i % 4) * 33];

  function fit(g, icon, rect, x, y, w, h) {
    if (!icon || !(icon.width || icon.naturalWidth)) return;
    const [sx, sy, sw, sh] = rect || [0, 0, icon.width || icon.naturalWidth, icon.height || icon.naturalHeight];
    const k = Math.min(w / sw, h / sh, 1);
    const dw = Math.round(sw * k), dh = Math.round(sh * k);
    g.drawImage(icon, sx, sy, sw, sh, x + Math.round((w - dw) / 2), y + h - dh, dw, dh);
  }
  function bar(s, x, y, w, v, max, cols) {
    s.fill(x, y, w, 4, [56, 56, 56]);
    const k = Math.max(0, Math.min(1, max ? v / max : 0)), px = v > 0 ? Math.max(1, Math.round((w - 2) * k)) : 0;
    const c = Array.isArray(cols[0]) ? cols[k > 0.5 ? 0 : k > 0.2 ? 1 : 2] : cols;
    s.fill(x + 1, y + 1, w - 2, 2, [80, 80, 80]);
    s.fill(x + 1, y + 1, px, 2, c);
  }
  function drawList(canvas, o, cursor, swapFrom, menu) {
    const s = M().Surface(), frame = "type" + ((o.frame || 0) + 1), fp = G().frames[frame].palette;
    s.fill(0, 0, 240, 160, BG);
    s.text("READY", 6, 5, [200, 224, 248], DARKSHADE, "small"); s.text("RESERVE", 126, 5, [200, 224, 248], DARKSHADE, "small");
    const title = o.title || "PARTY";
    s.text(title, 236 - s.textWidth(title, "small"), 5, WHITE, DARKSHADE, "small");
    const pics = [];
    for (let i = 0; i < 8; i++) {
      const [x, y] = at(i), m = o.slots[i], on = i === cursor;
      s.fill(x, y, 112, BH, m ? (on ? SEL : m.hp <= 0 ? DOWN : BOX) : on ? [150, 186, 214] : EMPTY);
      // (its edge: the window frame's darkest colour; the box being moved, outlined twice)
      const edge = fp[1] || [40, 40, 40];
      for (let k = 0; k < (i === swapFrom ? 2 : 1); k++) {
        s.fill(x - k, y - k, 112 + 2 * k, 1, edge); s.fill(x - k, y + BH - 1 + k, 112 + 2 * k, 1, edge);
        s.fill(x - k, y - k, 1, BH + 2 * k, edge); s.fill(x + 111 + k, y - k, 1, BH + 2 * k, edge);
      }
      if (!m) { s.text("-", x + 52, y + 9, [200, 220, 236], [64, 96, 120], "small"); continue; }
      // (its name, cut to fit beside its level; HP and MP, each a bar and its number at the right)
      const lv = "Lv" + m.lv, room = 112 - 34 - 6 - s.textWidth(lv, "small");
      let nm = m.name; while (nm.length > 2 && s.textWidth(nm) > room) nm = nm.slice(0, -1);
      s.text(nm, x + 34, y, TEXT, SHADE);
      s.text(lv, x + 112 - 3 - s.textWidth(lv, "small"), y + 2, TEXT, SHADE, "small");
      const right = (t, yy) => s.text(t, x + 112 - 3 - s.textWidth(t, "small"), yy, TEXT, SHADE, "small");
      s.text("HP", x + 34, y + 12, [224, 112, 56], SHADE, "small"); bar(s, x + 46, y + 15, 28, m.hp, m.maxHp, HPC); right(m.hp + "/" + m.maxHp, y + 12);
      s.text("MP", x + 34, y + 21, [56, 120, 200], SHADE, "small"); bar(s, x + 46, y + 24, 28, m.mp, m.maxMp, MPC); right(m.mp + "/" + m.maxMp, y + 21);
      pics.push([m, x + 1, y - 1]);
    }
    // (the help along the bottom, or what you're doing)
    s.fill(0, 152, 240, 8, [40, 64, 88]);
    s.text(swapFrom != null ? "Switch with whom?  {A_BUTTON} OK  {B_BUTTON} Cancel" : "{A_BUTTON} Choose  {B_BUTTON} Back", 4, 151, WHITE, [24, 40, 56], "small", G().palettes.std2);
    if (menu) {
      const w = 9, h = menu.items.length * 2, left = 29 - w, top = 19 - h;
      s.frame(frame, fp, left, top, w, h);
      s.fill(left * 8, top * 8, w * 8, h * 8, WHITE);
      menu.items.forEach((it, k) => s.text((k === menu.at ? "▶" : "") + it.label, left * 8 + (k === menu.at ? 2 : 10), top * 8 + k * 16 + 1, it.disabled ? [176, 176, 176] : TEXT, SHADE));
    }
    s.show(canvas);
    const g = canvas.getContext("2d"), k = canvas.width / 240;
    g.save(); g.imageSmoothingEnabled = false; g.scale(k, k);
    for (const [m, x, y] of pics) fit(g, m.icon, m.rect, x, y, 32, 32);
    g.restore();
  }
  async function open(canvas, o) {
    let cursor = Math.max(0, Math.min(7, o.cursor || 0)), swapFrom = null, menu = null;
    canvas.classList.remove("hidden");
    const redraw = () => drawList(canvas, o, cursor, swapFrom, menu);
    redraw();
    const r = await M().keys((k) => {
      if (menu) {
        if (k === "up" || k === "down") { menu.at = (menu.at + (k === "up" ? menu.items.length - 1 : 1)) % menu.items.length; redraw(); }
        else if (k === "b") { menu = null; redraw(); }
        else if (k === "a") {
          const it = menu.items[menu.at];
          if (it.disabled) return undefined;
          if (it.key === "cancel") { menu = null; redraw(); return undefined; }
          if (it.key === "switch") { swapFrom = cursor; menu = null; redraw(); return undefined; }
          return { index: cursor, action: it.key, cursor };
        }
        return undefined;
      }
      if (k === "left" || k === "right") { cursor = (cursor + 4) % 8; redraw(); }
      else if (k === "up") { cursor = (cursor & 4) | ((cursor + 3) & 3); redraw(); }
      else if (k === "down") { cursor = (cursor & 4) | ((cursor + 1) & 3); redraw(); }
      else if (k === "b") { if (swapFrom != null) { cursor = swapFrom; swapFrom = null; redraw(); return undefined; } return null; }
      else if (k === "a") {
        if (swapFrom != null) { const from = swapFrom; swapFrom = null; return { index: from, action: "switch", with: cursor, cursor }; }
        const items = (o.choices ? o.choices(cursor) : []).concat([{ key: "cancel", label: "Cancel" }]);
        if (items.length === 1 && !o.slots[cursor]) return undefined;
        menu = { items, at: 0 }; redraw();
      }
      return undefined;
    });
    canvas.classList.add("hidden");
    return r;
  }
  // One member's page: their picture, name and level; their lines (elements, HP, MP, stats, EXP...); their skills,
  // a line each, scrolled with up and down. B or A goes back.
  async function summary(canvas, m, frameNo) {
    const S = m.summary || { lines: [], skills: [] };
    let top = 0;
    const draw = () => {
      const s = M().Surface(), frame = "type" + ((frameNo || 0) + 1), fp = G().frames[frame].palette;
      s.fill(0, 0, 240, 160, BG);
      s.frame(frame, fp, 1, 1, 28, 5); s.fill(8, 8, 224, 40, WHITE);
      s.text(m.name + "  Lv" + m.lv, 48, 9, TEXT, SHADE);
      S.lines.slice(0, 2).forEach((t, k) => s.text(t, 48, 25 + k * 11, TEXT, SHADE, "small"));
      s.frame(frame, fp, 1, 8, 13, 10); s.fill(8, 64, 104, 80, WHITE);
      S.lines.slice(2).forEach((t, k) => s.text(t, 10, 66 + k * 11, TEXT, SHADE, "small"));
      s.frame(frame, fp, 16, 8, 13, 10); s.fill(128, 64, 104, 80, WHITE);
      s.text("SKILLS", 130, 65, [56, 120, 200], SHADE, "small");
      S.skills.slice(top, top + 6).forEach(([n, info], k) => {
        let t = n; while (t.length > 3 && s.textWidth(t, "small") > 70) t = t.slice(0, -1);
        if (t !== n) t = t.trimEnd() + ".";
        s.text(t, 130, 76 + k * 11, TEXT, SHADE, "small");
        if (info) s.text(info, 230 - s.textWidth(info, "small"), 76 + k * 11, [120, 120, 120], SHADE, "small");
      });
      if (!S.skills.length) s.text("None yet", 130, 76, [176, 176, 176], SHADE, "small");
      s.fill(0, 152, 240, 8, [40, 64, 88]);
      s.text("{B_BUTTON} Back" + (S.skills.length > 6 ? "  ▲▼ Skills" : ""), 4, 151, WHITE, [24, 40, 56], "small", G().palettes.std2);
      s.show(canvas);
      const g = canvas.getContext("2d"), k = canvas.width / 240;
      g.save(); g.imageSmoothingEnabled = false; g.scale(k, k); fit(g, m.icon, m.rect, 10, 9, 32, 32); g.restore();
    };
    canvas.classList.remove("hidden");
    draw();
    await M().keys((k) => {
      if ((k === "up" || k === "down") && S.skills.length > 6) { top = Math.max(0, Math.min(S.skills.length - 6, top + (k === "up" ? -1 : 1))); draw(); }
      else if (k === "a" || k === "b") return true;
      return undefined;
    });
    canvas.classList.add("hidden");
  }
  window.RealmParty = { open: (c, o) => M().during("realmparty", open(c, o)), summary: (c, m, f) => M().during("realmsummary", summary(c, m, f)) };
})();
